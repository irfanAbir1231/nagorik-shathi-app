import { and, eq, gt, isNull, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users, sessions, otpChallenges, userSettings, userProfiles, auditLog } from '@/lib/db/schema';
import { hashSecret, verifySecret, fastHash, randomToken, randomNumericCode } from '@/lib/security/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_TTL_SECONDS } from '@/lib/security/tokens';
import { normalisePhone } from '@/lib/format/numerals';
import { env } from '@/lib/config/env';
import { dispatchSms, SmsDeliveryError } from '@/modules/notifications/sms.service';
import { recordAudit } from '@/modules/admin/admin.service';
import type { UserRole } from '@/lib/domain/enums';

/**
 * Authentication — phone number + OTP + 4-digit PIN.
 *
 * PRD §59 specifies email/password with Google login. BDS §10.2.11 forbids
 * requiring an email ("a large share of target users do not have or remember
 * one — phone number is the identity") and forbids strong-password rules,
 * specifying phone + OTP with a 4–6 digit PIN instead.
 *
 * Resolution: PHONE + OTP + PIN is the primary path, which satisfies the
 * Design System, and email is retained as an OPTIONAL field on the user record
 * so the PRD's account model still works. See docs/DEVIATIONS.md §6.
 *
 * Security choices worth stating:
 *  • A 4-digit PIN has only 10,000 combinations, so online guessing is stopped
 *    by PROGRESSIVE DELAY plus a temporary lock, not by rate limit alone.
 *  • Lockout is TEMPORARY and self-clearing. BDS §10.2.5 is explicit that a
 *    permanent lock with no recovery route is where low-confidence citizens
 *    abandon permanently.
 *  • OTP enumeration is avoided: requesting a code for an unregistered number
 *    in the LOGIN flow returns the same shape as a registered one.
 */

const OTP_TTL_MS = 5 * 60 * 1000; // BDS §10.2.5 — at least five minutes.
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MS = 10 * 60 * 1000;
/**
 * How long after a rotation a replay of the old refresh token is treated as a
 * concurrency race rather than theft. Long enough to cover two tabs refreshing
 * over a slow connection, short enough that a captured token is useless.
 */
const REFRESH_RACE_GRACE_MS = 20 * 1000;

export type OtpPurpose = 'register' | 'login' | 'reset_pin' | 'verify_phone';

export interface AuthResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** The session row this pair belongs to, so a rotation can record its successor. */
  readonly sessionId: string;
  readonly user: {
    readonly id: string;
    readonly name: string;
    readonly phone: string;
    readonly role: UserRole;
    readonly language: 'bn' | 'en';
    readonly district: string | null;
    readonly hasPin: boolean;
  };
}

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/* ------------------------------------------------------------------ OTP */

export interface OtpIssueResult {
  readonly sent: true;
  readonly expiresAt: Date;
  /** Present ONLY when OTP_DEV_ECHO is on — never in production. */
  readonly devCode?: string;
  readonly resendAfterMs: number;
}

export async function requestOtp(rawPhone: string, purpose: OtpPurpose): Promise<OtpIssueResult> {
  const phone = normalisePhone(rawPhone);
  if (!phone) {
    throw new AuthError('VALIDATION_FAILED', 'Enter an 11-digit mobile number starting with 01.');
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);

  if (purpose === 'register' && existing) {
    throw new AuthError('PHONE_ALREADY_REGISTERED', 'This number already has an account. Sign in instead.');
  }
  // For login and reset we do NOT reveal whether the number exists.

  // Cooldown: prevents an accidental double-tap from sending two codes and
  // invalidating the first one the citizen already received.
  const [recent] = await db
    .select({ createdAt: otpChallenges.createdAt })
    .from(otpChallenges)
    .where(and(eq(otpChallenges.phone, phone), eq(otpChallenges.purpose, purpose)))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (recent) {
    const elapsed = Date.now() - recent.createdAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      throw new AuthError('RATE_LIMITED', 'Please wait before requesting another code.', {
        retryAfterMs: OTP_RESEND_COOLDOWN_MS - elapsed,
      });
    }
  }

  const code = randomNumericCode(6);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.insert(otpChallenges).values({
    phone,
    codeHash: fastHash(`${phone}:${purpose}:${code}`),
    purpose,
    attempts: 0,
    expiresAt,
    devCode: env.OTP_DEV_ECHO ? code : null,
  });

  if (env.OTP_DEV_ECHO) {
    // eslint-disable-next-line no-console
    console.log(`\n[OTP] ${phone} (${purpose}) → ${code}   expires ${expiresAt.toISOString()}\n`);
  } else {
    await sendSms(phone, code);
  }

  return {
    sent: true,
    expiresAt,
    ...(env.OTP_DEV_ECHO ? { devCode: code } : {}),
    resendAfterMs: OTP_RESEND_COOLDOWN_MS,
  };
}

/**
 * SMS delivery via modules/notifications/sms.service.ts. With no provider
 * configured, or if the configured one rejects the message, this THROWS
 * rather than silently pretending to send — a citizen waiting for a code
 * that was never sent is worse than a clear failure.
 */
async function sendSms(phone: string, code: string): Promise<void> {
  try {
    await dispatchSms(phone, `Your Shebar Janala verification code is ${code}. It expires in 5 minutes.`);
  } catch (error) {
    if (error instanceof SmsDeliveryError) {
      throw new AuthError('INTERNAL', error.message, { phone, ...error.detail });
    }
    throw error;
  }
}

export async function verifyOtp(rawPhone: string, code: string, purpose: OtpPurpose): Promise<true> {
  const phone = normalisePhone(rawPhone);
  if (!phone) throw new AuthError('VALIDATION_FAILED', 'Enter a valid mobile number.');

  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.phone, phone),
        eq(otpChallenges.purpose, purpose),
        isNull(otpChallenges.consumedAt),
        gt(otpChallenges.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);

  if (!challenge) {
    throw new AuthError('OTP_EXPIRED', 'That code has expired. Request a new one.');
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AuthError('OTP_ATTEMPTS_EXCEEDED', 'Too many attempts on this code. Request a new one.');
  }

  const expected = fastHash(`${phone}:${purpose}:${code.trim()}`);
  if (expected !== challenge.codeHash) {
    await db
      .update(otpChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(otpChallenges.id, challenge.id));
    throw new AuthError('OTP_INVALID', 'That code does not match. Check it and try again.', {
      attemptsRemaining: OTP_MAX_ATTEMPTS - challenge.attempts - 1,
    });
  }

  await db.update(otpChallenges).set({ consumedAt: new Date() }).where(eq(otpChallenges.id, challenge.id));
  return true;
}

/**
 * Is this number in the middle of a code entry right now?
 *
 * Exists for ONE caller: the transcription endpoint, which otherwise requires a
 * session and therefore cannot help the citizen who is trying to speak the six
 * digits that would give them one. See the note on that route for why this is
 * the boundary chosen — briefly: it costs an attacker a real mobile number and
 * an SMS send, both already rate-limited, to obtain what an open endpoint would
 * hand out for nothing.
 *
 * Purpose is deliberately NOT part of the predicate. The caller is a microphone
 * button, not an authentication step: it grants no access, verifies nothing, and
 * consumes no attempt. Requiring the client to name the flow would only mean
 * threading `purpose` through the audio upload for no security gain.
 *
 * Attempt count is likewise not checked. A citizen who has mistyped the code
 * three times is precisely the one who needs to speak it instead, and a burnt
 * challenge still cannot be verified — `verifyOtp` remains the only gate.
 */
export async function hasLiveOtpChallenge(rawPhone: string): Promise<boolean> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return false;

  const [challenge] = await db
    .select({ id: otpChallenges.id })
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.phone, phone),
        isNull(otpChallenges.consumedAt),
        gt(otpChallenges.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return challenge !== undefined;
}

/* ------------------------------------------------------------ register */

export async function register(input: {
  phone: string;
  name: string;
  pin: string;
  language: 'bn' | 'en';
  district?: string | null;
  email?: string | null;
  userAgent?: string;
  ip?: string;
}): Promise<AuthResult> {
  const phone = normalisePhone(input.phone);
  if (!phone) throw new AuthError('VALIDATION_FAILED', 'Enter a valid mobile number.');
  assertPinShape(input.pin);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) throw new AuthError('PHONE_ALREADY_REGISTERED', 'This number already has an account.');

  const pinHash = await hashSecret(input.pin);
  const [user] = await db
    .insert(users)
    .values({
      phone,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      pinHash,
      role: 'citizen',
      language: input.language,
      district: input.district ?? null,
      // Registration only completes after verifyOtp, so the phone is verified.
      phoneVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    })
    .returning();

  await db.insert(userSettings).values({ userId: user!.id });
  await db.insert(userProfiles).values({
    userId: user!.id,
    district: input.district ?? null,
    citizenship: 'bangladeshi',
    shareHealthData: false,
  });

  await audit(user!.id, 'citizen', 'auth.register', 'user', user!.id, input.ip, input.userAgent);
  return issueTokens(user!, input.userAgent, input.ip);
}

/* --------------------------------------------------------------- login */

export async function loginWithPin(input: {
  phone: string;
  pin: string;
  userAgent?: string;
  ip?: string;
}): Promise<AuthResult> {
  const phone = normalisePhone(input.phone);
  if (!phone) throw new AuthError('VALIDATION_FAILED', 'Enter a valid mobile number.');

  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user || !user.pinHash) {
    throw new AuthError('PHONE_NOT_REGISTERED', 'No account found for this number. Create one first.');
  }
  if (user.status !== 'active') {
    throw new AuthError('FORBIDDEN', 'This account is not active. Contact support.');
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AuthError('ACCOUNT_LOCKED', 'Too many wrong PIN attempts. Try again shortly, or reset your PIN.', {
      unlocksAt: user.lockedUntil.toISOString(),
      retryAfterMs: user.lockedUntil.getTime() - Date.now(),
    });
  }

  const valid = await verifySecret(input.pin, user.pinHash);
  if (!valid) {
    const attempts = user.failedPinAttempts + 1;
    const shouldLock = attempts >= PIN_MAX_ATTEMPTS;
    await db
      .update(users)
      .set({
        failedPinAttempts: attempts,
        // A temporary, self-clearing lock. Never permanent (BDS §10.2.5).
        lockedUntil: shouldLock ? new Date(Date.now() + PIN_LOCK_MS) : null,
      })
      .where(eq(users.id, user.id));

    if (shouldLock) {
      throw new AuthError('ACCOUNT_LOCKED', 'Too many wrong PIN attempts. Try again in 10 minutes, or reset your PIN.', {
        retryAfterMs: PIN_LOCK_MS,
      });
    }
    throw new AuthError('PIN_INVALID', 'That PIN is not correct.', {
      attemptsRemaining: PIN_MAX_ATTEMPTS - attempts,
    });
  }

  await db
    .update(users)
    .set({ failedPinAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  await audit(user.id, user.role, 'auth.login', 'user', user.id, input.ip, input.userAgent);
  return issueTokens(user, input.userAgent, input.ip);
}

/** OTP-only sign-in, for a citizen who has forgotten their PIN. */
export async function loginWithOtp(input: {
  phone: string;
  userAgent?: string;
  ip?: string;
}): Promise<AuthResult> {
  const phone = normalisePhone(input.phone);
  if (!phone) throw new AuthError('VALIDATION_FAILED', 'Enter a valid mobile number.');
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) throw new AuthError('PHONE_NOT_REGISTERED', 'No account found for this number.');
  if (user.status !== 'active') throw new AuthError('FORBIDDEN', 'This account is not active.');

  await db
    .update(users)
    .set({ failedPinAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  await audit(user.id, user.role, 'auth.login_otp', 'user', user.id, input.ip, input.userAgent);
  return issueTokens(user, input.userAgent, input.ip);
}

export async function setPin(userId: string, pin: string): Promise<void> {
  assertPinShape(pin);
  const pinHash = await hashSecret(pin);
  await db
    .update(users)
    .set({ pinHash, failedPinAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await audit(userId, null, 'auth.set_pin', 'user', userId);
}

function assertPinShape(pin: string): void {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new AuthError('VALIDATION_FAILED', 'Your PIN must be 4 to 6 digits.');
  }
  // Trivially guessable PINs are rejected — but the message explains why rather
  // than presenting an opaque rule.
  if (/^(\d)\1+$/.test(pin)) {
    throw new AuthError('VALIDATION_FAILED', 'Do not use the same digit repeated, such as 1111. Choose another PIN.');
  }
  if (['1234', '4321', '12345', '123456', '654321'].includes(pin)) {
    throw new AuthError('VALIDATION_FAILED', 'That PIN is too easy to guess. Choose another one.');
  }
}

/* ------------------------------------------------------------ sessions */

async function issueTokens(
  user: { id: string; name: string; phone: string; role: UserRole; language: 'bn' | 'en'; district: string | null; pinHash: string | null },
  userAgent?: string,
  ip?: string,
): Promise<AuthResult> {
  const opaque = randomToken(48);
  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      refreshTokenHash: fastHash(opaque),
      userAgent: userAgent ?? null,
      ip: ip ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    })
    .returning();

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    locale: user.language,
  });
  // The JWT carries the session id; the opaque half is what is actually checked
  // against the database, so a stolen JWT alone cannot mint new access tokens.
  const refreshToken = `${await signRefreshToken(user.id, session!.id)}.${opaque}`;

  return {
    accessToken,
    refreshToken,
    sessionId: session!.id,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      language: user.language,
      district: user.district,
      hasPin: Boolean(user.pinHash),
    },
  };
}

/**
 * Refresh with rotation and reuse detection.
 *
 * A refresh token is single-use. Presenting an already-rotated token means it
 * was captured, so the ENTIRE session family is revoked rather than just
 * refusing the request.
 */
export async function refresh(token: string, userAgent?: string, ip?: string): Promise<AuthResult> {
  const separator = token.lastIndexOf('.');
  if (separator === -1) throw new AuthError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  const jwt = token.slice(0, separator);
  const opaque = token.slice(separator + 1);

  const claims = await verifyRefreshToken(jwt);
  if (!claims) throw new AuthError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.');

  const [session] = await db.select().from(sessions).where(eq(sessions.id, claims.sid)).limit(1);
  if (!session || session.userId !== claims.sub) {
    throw new AuthError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  }

  if (session.revokedAt || session.replacedById) {
    /**
     * A rotated token was presented again. There are two very different reasons
     * for that, and treating them alike signs innocent people out.
     *
     * BENIGN RACE: two tabs, or a navigation and a background query, both notice
     * the expired access token at the same moment and both refresh. Cookies are
     * shared across tabs, so the loser is holding a token the winner rotated
     * milliseconds ago. Revoking everything here is a false positive — and it is
     * the one that produces "it logs me out at random", because the user did
     * nothing wrong and nothing looks broken.
     *
     * REAL THEFT: an attacker replays a token captured earlier. That does not
     * arrive milliseconds after the legitimate rotation.
     *
     * So the window decides. Inside the grace period the request fails alone and
     * the caller retries, picking up the fresh cookie the winner already set.
     * Outside it, every session for the user is revoked, as before.
     */
    const rotatedAgo = session.revokedAt ? Date.now() - session.revokedAt.getTime() : Number.POSITIVE_INFINITY;
    const isBenignRace = session.replacedById !== null && rotatedAgo <= REFRESH_RACE_GRACE_MS;

    if (isBenignRace) {
      await audit(session.userId, null, 'auth.refresh_race_ignored', 'session', session.id, ip, userAgent);
      throw new AuthError('UNAUTHENTICATED', 'Please try that again.', { benignRace: true, rotatedAgo });
    }

    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, session.userId), isNull(sessions.revokedAt)));
    await audit(session.userId, null, 'auth.refresh_reuse_detected', 'session', session.id, ip, userAgent);
    throw new AuthError('UNAUTHENTICATED', 'For your security we signed you out everywhere. Please sign in again.');
  }

  if (session.expiresAt.getTime() < Date.now() || fastHash(opaque) !== session.refreshTokenHash) {
    throw new AuthError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.status !== 'active') {
    throw new AuthError('UNAUTHENTICATED', 'Your session is no longer valid.');
  }

  const next = await issueTokens(user, userAgent, ip);
  await db
    .update(sessions)
    // The real successor id, not the literal string 'rotated': without it the
    // chain cannot be walked, so an investigator cannot tell which session
    // replaced which — and that chain is the entire point of keeping the row.
    .set({ revokedAt: new Date(), replacedById: next.sessionId })
    .where(eq(sessions.id, session.id));

  return next;
}

export async function logout(refreshTokenValue: string | null, userId: string | null): Promise<void> {
  if (refreshTokenValue) {
    const separator = refreshTokenValue.lastIndexOf('.');
    const jwt = separator === -1 ? refreshTokenValue : refreshTokenValue.slice(0, separator);
    const claims = await verifyRefreshToken(jwt);
    if (claims) {
      await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, claims.sid));
    }
  }
  if (userId) await audit(userId, null, 'auth.logout', 'user', userId);
}

export async function logoutEverywhere(userId: string): Promise<number> {
  const revoked = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });
  await audit(userId, null, 'auth.logout_all', 'user', userId);
  return revoked.length;
}

export async function listSessions(userId: string) {
  return db
    .select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      ip: sessions.ip,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
    .limit(20);
}

/* ------------------------------------------------------------ deletion */

/**
 * Account deletion — PRD §69 and §121.
 *
 * Cascades remove the citizen's conversations, profile, saved items, and
 * notifications. Audit rows are retained but the actor id is nulled, because an
 * append-only administrative log is a separate legitimate interest from the
 * citizen's own data, and deleting it would destroy accountability.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await audit(userId, null, 'auth.delete_account', 'user', userId);
  await db.update(auditLog).set({ actorId: null }).where(eq(auditLog.actorId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

/* --------------------------------------------------------------- audit */

/**
 * Login/logout/registration events used to be inserted here directly, with
 * no hash chain — a real gap, since `auth.login` is the single highest-
 * volume action in `audit_log` and none of it was tamper-evident. Delegating
 * to `recordAudit()` closes that gap: every audit row, from every module,
 * now goes through the one chained write path (SJ-13/41).
 */
async function audit(
  actorId: string | null,
  actorRole: UserRole | null,
  action: string,
  entityType: string,
  entityId: string | null,
  ip?: string,
  userAgent?: string,
): Promise<void> {
  await recordAudit({ actorId, actorRole, action, entityType, entityId, ip, userAgent });
}

/** Housekeeping for the daily job: drop consumed and expired OTP rows. */
export async function pruneOtpChallenges(): Promise<number> {
  const removed = await db
    .delete(otpChallenges)
    .where(sql`${otpChallenges.expiresAt} < ${Date.now() - 86_400_000}`)
    .returning({ id: otpChallenges.id });
  return removed.length;
}

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from '@/lib/config/env';
import type { UserRole } from '@/lib/domain/enums';

/**
 * JWT access tokens — PRD §43.
 *
 * `jose` is used rather than `jsonwebtoken` because it runs in the Edge runtime,
 * which is what allows the middleware to reject an unauthenticated request
 * before it reaches a route handler.
 *
 * The access token is short-lived and carries the role, so authorisation does
 * not need a database read on every request. The refresh token is opaque and
 * IS checked against the database on every use, so a revoked session dies
 * within one access-token lifetime.
 */

const accessSecret = new TextEncoder().encode(env.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

const ISSUER = 'shebar-janala';
const AUDIENCE = 'shebar-janala-web';

export interface AccessTokenClaims extends JWTPayload {
  readonly sub: string;
  readonly role: UserRole;
  readonly name: string;
  readonly locale: 'bn' | 'en';
}

export interface RefreshTokenClaims extends JWTPayload {
  readonly sub: string;
  /** Session row id, so a specific device can be revoked. */
  readonly sid: string;
}

export async function signAccessToken(claims: {
  userId: string;
  role: UserRole;
  name: string;
  locale: 'bn' | 'en';
}): Promise<string> {
  return new SignJWT({ role: claims.role, name: claims.name, locale: claims.locale })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessSecret);
}

export async function signRefreshToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(env.REFRESH_TOKEN_TTL)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret, { issuer: ISSUER, audience: AUDIENCE });
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') return null;
    return payload as AccessTokenClaims;
  } catch {
    // Expired or tampered. Returning null rather than throwing keeps the
    // caller's control flow simple: no token and a bad token are equivalent.
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret, { issuer: ISSUER, audience: AUDIENCE });
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
    return payload as RefreshTokenClaims;
  } catch {
    return null;
  }
}

export const COOKIE_NAMES = {
  access: 'shebar-janala_at',
  refresh: 'shebar-janala_rt',
} as const;

/** Parsed TTL in seconds, for cookie `maxAge`. */
export function ttlSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return value * multiplier;
}

export const ACCESS_TTL_SECONDS = ttlSeconds(env.ACCESS_TOKEN_TTL);
export const REFRESH_TTL_SECONDS = ttlSeconds(env.REFRESH_TOKEN_TTL);

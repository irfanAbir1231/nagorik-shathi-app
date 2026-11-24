import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { eligibilityRules, notifications, opportunities, userProfiles, users } from '@/lib/db/schema';
import { decryptStringArray } from '@/lib/security/field-encryption';
import { evaluateEligibility } from '@/modules/eligibility/engine';
import { toEligibilityProfile } from '@/modules/eligibility/profile-mapper';
import { matchReason, NEW_PROGRAMME_DAILY_CAP, type MatchReason } from './matching';

/**
 * Tells matching citizens about a newly published programme (in-app only:
 * there is no SMS gateway). See matching.ts for who counts as matching.
 *
 * Loads active citizens in one pass. Fine for the current scale; at hundreds
 * of thousands of users this becomes a batched job.
 */

interface ProgrammeShape {
  readonly id?: string;
  readonly coverageDistricts: readonly string[];
  readonly lifeEvents: readonly string[];
}

export interface Match {
  readonly userId: string;
  readonly reason: MatchReason;
}

export async function findMatchingUsers(programme: ProgrammeShape): Promise<Match[]> {
  const [rule] = programme.id
    ? await db
        .select({ ruleJson: eligibilityRules.ruleJson, version: eligibilityRules.version })
        .from(eligibilityRules)
        .where(and(eq(eligibilityRules.opportunityId, programme.id), eq(eligibilityRules.active, true)))
        .orderBy(desc(eligibilityRules.priority), desc(eligibilityRules.version))
        .limit(1)
    : [];

  const rows = await db
    .select({ user: users, profile: userProfiles })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(eq(users.role, 'citizen'), eq(users.status, 'active')));

  const matches: Match[] = [];
  for (const { user, profile } of rows) {
    let outcome = null;
    if (rule) {
      const decrypted = profile ? { ...profile, medicalConditions: decryptStringArray(profile.medicalConditions) } : null;
      const eligibility = toEligibilityProfile({ user, profile: decrypted });
      outcome = evaluateEligibility(rule.ruleJson, eligibility, { ruleVersion: rule.version }).outcome;
    }
    const reason = matchReason({
      coverageDistricts: programme.coverageDistricts,
      programmeLifeEvents: programme.lifeEvents,
      hasRules: Boolean(rule),
      outcome,
      userDistrict: user.district,
      userLifeEvents: (profile?.lifeEvents ?? []).map((e) => e.event),
    });
    if (reason) matches.push({ userId: user.id, reason });
  }
  return matches;
}

/** People already told about a new programme in the last 24 hours. */
async function recentlyNotified(userIds: readonly string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const counts = new Map<string, number>();
  for (let i = 0; i < userIds.length; i += 500) {
    const rows = await db
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(
        and(
          inArray(notifications.userId, userIds.slice(i, i + 500)),
          eq(notifications.type, 'new_opportunity'),
          gte(notifications.createdAt, since),
        ),
      );
    for (const row of rows) counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n >= NEW_PROGRAMME_DAILY_CAP).map(([id]) => id));
}

/** How many people would be told now (after the daily cap). */
export async function countAudience(programme: ProgrammeShape): Promise<{ matched: number; willNotify: number }> {
  const matches = await findMatchingUsers(programme);
  const capped = await recentlyNotified(matches.map((m) => m.userId));
  return { matched: matches.length, willNotify: matches.filter((m) => !capped.has(m.userId)).length };
}

/** Creates the notifications; returns how many were sent. */
export async function notifyMatchingUsers(opportunityId: string): Promise<number> {
  const [programme] = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
  if (!programme || !['open', 'rolling'].includes(programme.status)) return 0;

  const matches = await findMatchingUsers(programme);
  const capped = await recentlyNotified(matches.map((m) => m.userId));
  const recipients = matches.filter((m) => !capped.has(m.userId));

  const now = new Date();
  const values = recipients.map((m) => ({
    userId: m.userId,
    type: 'new_opportunity' as const,
    channel: 'in_app' as const,
    title: `New programme: ${programme.title}`,
    titleBn: `নতুন কর্মসূচি: ${programme.titleBn}`,
    body:
      m.reason === 'eligible'
        ? 'Based on your profile you may qualify. Open it to see what you need.'
        : 'This may be relevant to you. Open it to see who can apply.',
    bodyBn:
      m.reason === 'eligible'
        ? 'আপনার তথ্য অনুযায়ী আপনি এটি পেতে পারেন। কী লাগবে দেখে নিন।'
        : 'এটি আপনার কাজে আসতে পারে। কারা আবেদন করতে পারেন দেখে নিন।',
    actionUrl: `/opportunities/${programme.slug}`,
    sentAt: now,
  }));
  for (let i = 0; i < values.length; i += 200) {
    await db.insert(notifications).values(values.slice(i, i + 200));
  }
  return values.length;
}

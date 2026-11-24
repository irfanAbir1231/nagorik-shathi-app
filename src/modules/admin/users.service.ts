import { and, asc, desc, eq, gte, isNull, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import {
  actionPlans, auditLog, conversations, feedback, issues, savedOpportunities, sessions, userProfiles, users,
} from '@/lib/db/schema';
import { CIVIC_ROLES, ROLE_RANK, USER_ROLES, USER_STATUSES, type UserRole } from '@/lib/domain/enums';
import { ERROR_CODES, HttpError } from '@/lib/http/response';
import { deleteAccount, issueAdminResetCode, logoutEverywhere } from '@/modules/auth/auth.service';
import { recordAudit } from './admin.service';
import { clientFromUserAgent, maskPhone, MOBILE_USER_AGENT_LIKE, pageWindow, USER_SORTS } from './user-admin';

/**
 * User management for the admin panel: one list for app and website users,
 * a detail view, and the actions an administrator can take. Every action is
 * audited with the reason the administrator gave.
 */

export interface Actor {
  readonly userId: string;
  readonly role: UserRole;
}

/* ---------------------------------------------------------------- list */

export const userListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  civicRole: z.enum(CIVIC_ROLES).optional(),
  district: z.string().trim().max(60).optional(),
  language: z.enum(['bn', 'en']).optional(),
  platform: z.enum(['mobile', 'web']).optional(),
  activeWithinDays: z.coerce.number().int().min(1).max(365).optional(),
  sort: z.enum(USER_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(10).max(100).optional(),
});
export type UserListQuery = z.infer<typeof userListSchema>;

const mobileSession = sql`EXISTS (SELECT 1 FROM ${sessions} WHERE ${sessions.userId} = ${users.id} AND ${sessions.userAgent} LIKE ${MOBILE_USER_AGENT_LIKE})`;
const webSession = sql`EXISTS (SELECT 1 FROM ${sessions} WHERE ${sessions.userId} = ${users.id} AND ${sessions.userAgent} IS NOT NULL AND ${sessions.userAgent} NOT LIKE ${MOBILE_USER_AGENT_LIKE})`;

export async function listUsers(query: UserListQuery) {
  const conditions: SQL[] = [];
  if (query.q) {
    const q = query.q.toLowerCase();
    conditions.push(or(sql`lower(${users.name}) LIKE ${`%${q}%`}`, sql`${users.phone} LIKE ${`%${query.q}%`}`)!);
  }
  if (query.role) conditions.push(eq(users.role, query.role));
  if (query.status) conditions.push(eq(users.status, query.status));
  if (query.civicRole) conditions.push(eq(users.civicRole, query.civicRole));
  if (query.district) conditions.push(eq(users.district, query.district));
  if (query.language) conditions.push(eq(users.language, query.language));
  if (query.platform === 'mobile') conditions.push(mobileSession);
  if (query.platform === 'web') conditions.push(webSession);
  if (query.activeWithinDays) {
    conditions.push(gte(users.lastLoginAt, new Date(Date.now() - query.activeWithinDays * 86_400_000)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const order =
    query.sort === 'oldest' ? asc(users.createdAt)
    : query.sort === 'name' ? asc(users.name)
    : query.sort === 'last_active' ? sql`${users.lastLoginAt} IS NULL, ${users.lastLoginAt} DESC`
    : desc(users.createdAt);
  const { page, pageSize, offset } = pageWindow(query.page, query.pageSize);

  const [rows, [total], roleCounts] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        role: users.role,
        status: users.status,
        civicRole: users.civicRole,
        district: users.district,
        language: users.language,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        usesMobile: sql<number>`${mobileSession}`,
        usesWeb: sql<number>`${webSession}`,
      })
      .from(users)
      .where(where)
      .orderBy(order)
      .limit(pageSize)
      .offset(offset),
    db.select({ n: sql<number>`count(*)` }).from(users).where(where),
    db.select({ role: users.role, n: sql<number>`count(*)` }).from(users).groupBy(users.role),
  ]);

  return {
    items: rows.map(({ phone, usesMobile, usesWeb, ...row }) => ({
      ...row,
      phoneMasked: maskPhone(phone),
      platforms: [...(Number(usesMobile) ? ['mobile' as const] : []), ...(Number(usesWeb) ? ['web' as const] : [])],
    })),
    total: Number(total?.n ?? 0),
    page,
    pageSize,
    roleCounts: Object.fromEntries(roleCounts.map((r) => [r.role, Number(r.n)])) as Partial<Record<UserRole, number>>,
  };
}

/* -------------------------------------------------------------- detail */

export async function getUserDetail(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) throw new HttpError(ERROR_CODES.NOT_FOUND, 'That user could not be found.', 404);

  const count = async (table: typeof savedOpportunities | typeof conversations | typeof feedback, column: typeof savedOpportunities.userId | typeof conversations.userId | typeof feedback.userId) =>
    Number((await db.select({ n: sql<number>`count(*)` }).from(table).where(eq(column, id)))[0]?.n ?? 0);

  const [saved, convs, feedbackGiven, plans, issuesReported, sessionRows, history, [profile]] = await Promise.all([
    count(savedOpportunities, savedOpportunities.userId),
    count(conversations, conversations.userId),
    count(feedback, feedback.userId),
    db.select({ status: actionPlans.status, n: sql<number>`count(*)` }).from(actionPlans).where(eq(actionPlans.userId, id)).groupBy(actionPlans.status),
    db.select({ n: sql<number>`count(*)` }).from(issues).where(eq(issues.reporterId, id)),
    db
      .select({
        id: sessions.id,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, id), isNull(sessions.replacedById)))
      .orderBy(desc(sessions.createdAt))
      .limit(15),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorId: auditLog.actorId,
        actorRole: auditLog.actorRole,
        after: auditLog.after,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(and(eq(auditLog.entityType, 'user'), eq(auditLog.entityId, id)))
      .orderBy(desc(auditLog.createdAt))
      .limit(30),
    db.select({ lifeEvents: userProfiles.lifeEvents, updatedAt: userProfiles.updatedAt }).from(userProfiles).where(eq(userProfiles.userId, id)).limit(1),
  ]);

  const now = Date.now();
  return {
    user: {
      id: user.id,
      name: user.name,
      phoneMasked: maskPhone(user.phone),
      role: user.role,
      status: user.status,
      language: user.language,
      district: user.district,
      civicRole: user.civicRole,
      donorOrgId: user.donorOrgId,
      phoneVerifiedAt: user.phoneVerifiedAt,
      failedPinAttempts: user.failedPinAttempts,
      lockedUntil: user.lockedUntil && user.lockedUntil.getTime() > now ? user.lockedUntil : null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
    activity: {
      saved,
      conversations: convs,
      feedback: feedbackGiven,
      issues: Number(issuesReported[0]?.n ?? 0),
      plans: plans.reduce((n, p) => n + Number(p.n), 0),
      plansCompleted: Number(plans.find((p) => p.status === 'completed')?.n ?? 0),
      lifeEvents: (profile?.lifeEvents ?? []).map((e) => e.event),
    },
    sessions: sessionRows.map((s) => ({
      ...s,
      client: clientFromUserAgent(s.userAgent),
      active: !s.revokedAt && s.expiresAt.getTime() > now,
    })),
    history,
  };
}

/* ------------------------------------------------------------- actions */

export const userActionSchema = z.object({
  action: z.enum(['force_logout', 'unlock', 'reset_code', 'reveal_phone', 'suspend', 'reactivate']),
  reason: z.string().trim().min(3, 'Say why, in a few words.').max(500),
});
export type UserAction = z.infer<typeof userActionSchema>['action'];

/** Who may do what (see adminpanelImplementation.md §3). */
export function canPerform(role: UserRole, action: UserAction | 'delete'): boolean {
  if (action === 'delete') return role === 'super_admin';
  return ROLE_RANK[role] >= ROLE_RANK.administrator;
}

async function loadTarget(actor: Actor, id: string) {
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) throw new HttpError(ERROR_CODES.NOT_FOUND, 'That user could not be found.', 404);
  if (target.id === actor.userId) {
    throw new HttpError(ERROR_CODES.FORBIDDEN, 'You cannot do this to your own account. Ask another administrator.', 403);
  }
  if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) {
    throw new HttpError(ERROR_CODES.FORBIDDEN, 'You cannot act on someone at or above your own rank.', 403);
  }
  return target;
}

export async function performUserAction(actor: Actor, id: string, input: z.infer<typeof userActionSchema>) {
  if (!canPerform(actor.role, input.action)) {
    throw new HttpError(ERROR_CODES.FORBIDDEN, 'Only an administrator can do this.', 403);
  }
  const target = await loadTarget(actor, id);
  const audit = (action: string, after: Record<string, unknown> = {}) =>
    recordAudit({
      actorId: actor.userId,
      actorRole: actor.role,
      action,
      entityType: 'user',
      entityId: id,
      after: { ...after, reason: input.reason },
    });

  switch (input.action) {
    case 'force_logout': {
      const revoked = await logoutEverywhere(id);
      await audit('user.force_logout', { revoked });
      return { revoked };
    }
    case 'unlock': {
      await db.update(users).set({ lockedUntil: null, failedPinAttempts: 0, updatedAt: new Date() }).where(eq(users.id, id));
      await audit('user.unlock');
      return { unlocked: true };
    }
    case 'reset_code': {
      if (target.status !== 'active') {
        throw new HttpError(ERROR_CODES.CONFLICT, 'Reactivate the account before issuing a reset code.', 409);
      }
      const { code, expiresAt } = await issueAdminResetCode(target.phone, actor.userId);
      // The code itself is never written to the audit log.
      await audit('user.reset_code_issued', { expiresAt: expiresAt.toISOString() });
      return { code, expiresAt };
    }
    case 'reveal_phone': {
      await audit('user.reveal_phone');
      return { phone: target.phone };
    }
    case 'suspend':
    case 'reactivate': {
      const status = input.action === 'suspend' ? 'suspended' : 'active';
      if (target.status === 'deleted') throw new HttpError(ERROR_CODES.CONFLICT, 'This account was deleted.', 409);
      await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id));
      const revoked = status === 'suspended' ? await logoutEverywhere(id) : 0;
      await audit(`user.${input.action}`, { before: target.status, status, revoked });
      return { status, revoked };
    }
  }
}

export const deleteUserSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  confirmName: z.string().trim(),
});

/**
 * Deletes an account the same way a citizen deleting their own does
 * (auth.service deleteAccount): their data is removed, the audit trail stays.
 * Super admin only, and the administrator must type the person's name.
 */
export async function deleteUser(actor: Actor, id: string, input: z.infer<typeof deleteUserSchema>) {
  if (!canPerform(actor.role, 'delete')) {
    throw new HttpError(ERROR_CODES.FORBIDDEN, 'Only a super administrator can delete accounts.', 403);
  }
  const target = await loadTarget(actor, id);
  if (input.confirmName !== target.name) {
    throw new HttpError(ERROR_CODES.VALIDATION_FAILED, 'Type the person\'s name exactly to confirm.', 422, {
      confirmName: 'Does not match.',
    });
  }
  await recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'user.delete',
    entityType: 'user',
    entityId: id,
    before: { role: target.role, status: target.status, district: target.district },
    after: { reason: input.reason },
  });
  await deleteAccount(id);
  return { deleted: true };
}

import type { NextRequest } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { opportunities, eligibilityRules, requiredDocuments, knowledgeReviews } from '@/lib/db/schema';
import { ok, readJson, handle, fail, ERROR_CODES } from '@/lib/http/response';
import { requireStaff, canDeleteProgrammes, canApproveChanges } from '@/lib/http/session';
import { upsertOpportunitySchema } from '@/lib/validation/schemas';
import { recordAudit } from '@/modules/admin/admin.service';
import { indexOpportunity } from '@/modules/opportunities/opportunity.service';
import { z } from 'zod';

const patchSchema = upsertOpportunitySchema.partial().extend({
  /** Setting this to `verified` requires administrator rank — see below. */
  verificationStatus: z
    .enum(['unverified_sample', 'pending_review', 'verified', 'outdated', 'disputed'])
    .optional(),
});

/**
 * GET    /api/v1/admin/programs/:id — full record with rules and documents
 * PATCH  /api/v1/admin/programs/:id — edit; version increments on content change
 * DELETE /api/v1/admin/programs/:id — archive (administrator only)
 */

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;

    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    if (!opportunity) return fail(ERROR_CODES.NOT_FOUND, 'That programme could not be found.');

    const [rules, docs, reviews] = await Promise.all([
      db.select().from(eligibilityRules).where(eq(eligibilityRules.opportunityId, id)).orderBy(desc(eligibilityRules.version)),
      db.select().from(requiredDocuments).where(eq(requiredDocuments.opportunityId, id)).orderBy(asc(requiredDocuments.sortOrder)),
      db.select().from(knowledgeReviews).where(eq(knowledgeReviews.entityId, id)).orderBy(desc(knowledgeReviews.createdAt)).limit(20),
    ]);

    return ok({ opportunity, rules, documents: docs, reviews });
  }, 'admin/programs/[id]:get');
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;

    const body = patchSchema.parse(await readJson(request));

    const [before] = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    if (!before) return fail(ERROR_CODES.NOT_FOUND, 'That programme could not be found.');

    // Marking something VERIFIED is the assertion the whole trust model rests
    // on, so it is gated to administrator rank and cannot be done by the same
    // request that changes the content it claims to have verified.
    if (body.verificationStatus === 'verified') {
      if (!canApproveChanges(guard.session.role)) {
        return fail(ERROR_CODES.FORBIDDEN, 'Only an administrator can mark a programme as verified.');
      }
      const contentKeys = Object.keys(body).filter((k) => k !== 'verificationStatus');
      if (contentKeys.length > 0) {
        return fail(
          ERROR_CODES.VALIDATION_FAILED,
          'Verify in a separate step: save your content changes first, then mark the record verified.',
          { fields: { verificationStatus: 'Cannot verify and edit in the same action.' } },
        );
      }
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) patch[key] = value;
    }

    // Any content change invalidates a previous verification and bumps version.
    const contentChanged = ['title', 'titleBn', 'summary', 'summaryBn', 'description', 'descriptionBn',
      'benefits', 'benefitsBn', 'benefitAmount', 'applicationProcess', 'deadline', 'coverageDistricts']
      .some((key) => key in body);

    if (contentChanged) {
      patch.version = before.version + 1;
      if (before.verificationStatus === 'verified' && body.verificationStatus === undefined) {
        patch.verificationStatus = 'pending_review';
        patch.lastVerifiedAt = null;
      }
    }

    if (body.verificationStatus === 'verified') {
      patch.lastVerifiedAt = new Date();
      patch.verifiedBy = guard.session.userId;
    }

    const [updated] = await db.update(opportunities).set(patch).where(eq(opportunities.id, id)).returning();

    if (contentChanged) await indexOpportunity(id);

    await recordAudit({
      actorId: guard.session.userId,
      actorRole: guard.session.role,
      action: body.verificationStatus === 'verified' ? 'programme.verify' : 'programme.update',
      entityType: 'opportunity',
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return ok({ opportunity: updated, reindexed: contentChanged });
  }, 'admin/programs/[id]:patch');
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    if (!canDeleteProgrammes(guard.session.role)) {
      return fail(ERROR_CODES.FORBIDDEN, 'Only an administrator can remove a programme.');
    }
    const { id } = await context.params;

    const [before] = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    if (!before) return fail(ERROR_CODES.NOT_FOUND, 'That programme could not be found.');

    // ARCHIVE rather than delete. Citizens have saved records and action plans
    // pointing at this row; a hard delete would silently empty their tracker.
    const [archived] = await db
      .update(opportunities)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(opportunities.id, id))
      .returning();

    await recordAudit({
      actorId: guard.session.userId,
      actorRole: guard.session.role,
      action: 'programme.archive',
      entityType: 'opportunity',
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: archived as unknown as Record<string, unknown>,
    });

    return ok({ archived: true, opportunity: archived });
  }, 'admin/programs/[id]:delete');
}

export const dynamic = 'force-dynamic';

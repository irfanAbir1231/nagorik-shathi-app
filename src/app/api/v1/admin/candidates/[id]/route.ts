import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, readJson, handle } from '@/lib/http/response';
import { requireStaff } from '@/lib/http/session';
import {
  decideCandidate, decisionSchema, draftPatchSchema, getCandidateDetail, updateDraft,
} from '@/modules/discovery/candidates.service';

const patchSchema = z.union([
  z.object({ draft: draftPatchSchema }),
  z.object({ decision: decisionSchema }),
]);

/**
 * GET   /api/v1/admin/candidates/:id — draft, evidence, source text, what is still missing
 * PATCH /api/v1/admin/candidates/:id — { draft: {...} } to edit, or
 *                                      { decision: { status, note?, duplicateOfId? } }
 *                                      to reject, snooze, reopen or mark duplicate
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;
    return ok(await getCandidateDetail(id));
  }, 'admin/candidates/:id:get');
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;
    const actor = { userId: guard.session.userId, role: guard.session.role };
    const body = patchSchema.parse(await readJson(request));
    if ('draft' in body) return ok(await updateDraft(id, body.draft, actor));
    return ok({ candidate: await decideCandidate(id, body.decision, actor) });
  }, 'admin/candidates/:id:patch');
}

export const dynamic = 'force-dynamic';

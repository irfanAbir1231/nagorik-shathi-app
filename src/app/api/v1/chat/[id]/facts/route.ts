import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, readJson, handle, fail, ERROR_CODES } from '@/lib/http/response';
import { requireSession } from '@/lib/http/session';
import { recordFactDecision } from '@/modules/ai/conversation.service';
import { EVIDENCE_FIELDS } from '@/modules/ai/decision/policy';

/**
 * POST /api/v1/chat/:id/facts — the citizen confirms or rejects ONE fact the
 * assistant took from what they said.
 *
 *  • reject  — the fact is removed from this conversation's evidence from the
 *              next turn on (a later statement can still re-establish it).
 *  • confirm — recorded here for the conversation's audit trail; the value is
 *              saved to the profile by the client through PATCH /users/profile,
 *              which is where profile writes (and their audit) already live.
 *
 * Per-fact on purpose: one "save everything" tap confirmed uncertain and wrong
 * facts along with right ones (audit 2026-09-30, defect 4).
 */

const bodySchema = z.object({
  field: z.enum(EVIDENCE_FIELDS as unknown as [string, ...string[]]),
  value: z.union([z.string().max(80), z.number().finite(), z.boolean()]),
  decision: z.enum(['confirm', 'reject']),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireSession();
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const recorded = await recordFactDecision(guard.session.userId, id, body);
    if (!recorded) return fail(ERROR_CODES.NOT_FOUND, 'That conversation could not be found.');

    return ok({ recorded: true, decision: body.decision });
  }, 'chat/[id]/facts:post');
}

export const dynamic = 'force-dynamic';

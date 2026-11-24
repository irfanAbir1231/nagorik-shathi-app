import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, readJson, handle } from '@/lib/http/response';
import { requireStaff } from '@/lib/http/session';
import { guardRateLimit } from '@/lib/http/rate-limit';
import { parseQuery } from '@/lib/validation/schemas';
import { candidateListSchema, listCandidates, submitLink } from '@/modules/discovery/candidates.service';

const submitSchema = z.object({ url: z.string().trim().url('Paste a full web address.') });

/**
 * GET  /api/v1/admin/candidates — the review inbox (?status=&kind=)
 * POST /api/v1/admin/candidates — { url }: read a government page into a new candidate
 *
 * Candidates live in their own table and are never visible to citizens.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    return ok(await listCandidates(parseQuery(candidateListSchema, new URL(request.url))));
  }, 'admin/candidates:get');
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const limited = await guardRateLimit(request, 'default');
    if (!limited.ok) return limited.response;
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { url } = submitSchema.parse(await readJson(request));
    const result = await submitLink(url, { userId: guard.session.userId, role: guard.session.role });
    return ok(result, { status: result.existing ? 200 : 201 });
  }, 'admin/candidates:post');
}

export const dynamic = 'force-dynamic';

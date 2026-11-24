import type { NextRequest } from 'next/server';
import { ok, readJson, handle, fail, ERROR_CODES } from '@/lib/http/response';
import { requireStaff, canApproveChanges } from '@/lib/http/session';
import { approveCandidate, approveSchema } from '@/modules/discovery/candidates.service';

/**
 * POST /api/v1/admin/candidates/:id/approve — { publish: 'open'|'draft', notify: boolean }
 *
 * Administrator or above (one approver is enough). Publishes the reviewed
 * draft as a verified programme and, when asked, notifies matching citizens
 * in the app. A second call for the same candidate is refused.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    if (!canApproveChanges(guard.session.role)) {
      return fail(ERROR_CODES.FORBIDDEN, 'Only an administrator can publish a programme.');
    }
    const { id } = await context.params;
    const body = approveSchema.parse(await readJson(request));
    return ok(await approveCandidate(id, body, { userId: guard.session.userId, role: guard.session.role }));
  }, 'admin/candidates/:id/approve:post');
}

export const dynamic = 'force-dynamic';

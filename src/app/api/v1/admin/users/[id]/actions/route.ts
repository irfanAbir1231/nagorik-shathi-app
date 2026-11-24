import type { NextRequest } from 'next/server';
import { ok, readJson, handle } from '@/lib/http/response';
import { requireStaff } from '@/lib/http/session';
import { guardRateLimit } from '@/lib/http/rate-limit';
import { performUserAction, userActionSchema } from '@/modules/admin/users.service';

/**
 * POST /api/v1/admin/users/:id/actions — { action, reason }
 *
 * force_logout · unlock · reset_code · reveal_phone · suspend · reactivate.
 * Administrator or above; never on yourself or on someone at or above your rank.
 * `reset_code` returns a one-time code for the administrator to read to the
 * person (there is no SMS); it is never stored in plain text or logged.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const limited = await guardRateLimit(request, 'default');
    if (!limited.ok) return limited.response;
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;
    const body = userActionSchema.parse(await readJson(request));
    const result = await performUserAction({ userId: guard.session.userId, role: guard.session.role }, id, body);
    return ok({ action: body.action, ...result });
  }, 'admin/users/:id/actions:post');
}

export const dynamic = 'force-dynamic';

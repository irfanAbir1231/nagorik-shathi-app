import type { NextRequest } from 'next/server';
import { ok, readJson, handle } from '@/lib/http/response';
import { requireStaff } from '@/lib/http/session';
import { deleteUser, deleteUserSchema, getUserDetail } from '@/modules/admin/users.service';

/**
 * GET    /api/v1/admin/users/:id — profile, activity counts, sessions, admin history
 * DELETE /api/v1/admin/users/:id — delete the account (super admin, typed confirmation)
 *
 * Conversation text is deliberately not part of this response.
 */

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;
    return ok(await getUserDetail(id));
  }, 'admin/users/:id:get');
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;
    const body = deleteUserSchema.parse(await readJson(request));
    return ok(await deleteUser({ userId: guard.session.userId, role: guard.session.role }, id, body));
  }, 'admin/users/:id:delete');
}

export const dynamic = 'force-dynamic';

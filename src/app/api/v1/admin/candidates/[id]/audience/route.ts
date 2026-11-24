import type { NextRequest } from 'next/server';
import { ok, handle } from '@/lib/http/response';
import { requireStaff } from '@/lib/http/session';
import { audienceFor } from '@/modules/discovery/candidates.service';

/** GET /api/v1/admin/candidates/:id/audience — how many citizens publishing would notify. */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;
    return ok(await audienceFor(id));
  }, 'admin/candidates/:id/audience:get');
}

export const dynamic = 'force-dynamic';

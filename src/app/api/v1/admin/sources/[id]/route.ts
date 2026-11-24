import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { serviceSources } from '@/lib/db/schema';
import { ok, readJson, handle, fail, ERROR_CODES } from '@/lib/http/response';
import { requireStaff, canApproveChanges } from '@/lib/http/session';
import { recordAudit } from '@/modules/admin/admin.service';
import { discoverSources } from '@/modules/discovery/discovery.service';

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  pagesPerRun: z.number().int().min(1).max(25).optional(),
});

/**
 * PATCH /api/v1/admin/sources/:id — turn a source on or off, change its batch size
 * POST  /api/v1/admin/sources/:id — check this source now (one batch)
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    if (!canApproveChanges(guard.session.role)) return fail(ERROR_CODES.FORBIDDEN, 'Only an administrator can change sources.');
    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    const [updated] = await db
      .update(serviceSources)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(serviceSources.id, id))
      .returning();
    if (!updated) return fail(ERROR_CODES.NOT_FOUND, 'That source could not be found.');
    await recordAudit({
      actorId: guard.session.userId,
      actorRole: guard.session.role,
      action: 'source.update',
      entityType: 'service_source',
      entityId: id,
      after: body,
    });
    return ok({ source: updated });
  }, 'admin/sources/:id:patch');
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    const { id } = await context.params;
    const result = await discoverSources(id);
    await recordAudit({
      actorId: guard.session.userId,
      actorRole: guard.session.role,
      action: 'job.run.discover_sources',
      entityType: 'job_run',
      entityId: result.jobId,
      after: { sourceId: id },
    });
    return ok({ result });
  }, 'admin/sources/:id:post');
}

export const dynamic = 'force-dynamic';

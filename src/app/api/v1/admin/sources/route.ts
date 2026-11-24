import type { NextRequest } from 'next/server';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { serviceSources } from '@/lib/db/schema';
import { SOURCE_KINDS } from '@/lib/domain/enums';
import { ok, readJson, handle, fail, ERROR_CODES } from '@/lib/http/response';
import { requireStaff, canApproveChanges } from '@/lib/http/session';
import { recordAudit } from '@/modules/admin/admin.service';
import { isGovernmentHost } from '@/modules/discovery/policy';

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  baseUrl: z.string().trim().url(),
  kind: z.enum(SOURCE_KINDS),
  organizationId: z.string().uuid().nullish(),
  listPaths: z.array(z.string().trim().startsWith('/')).max(10).default([]),
  pagesPerRun: z.number().int().min(1).max(25).default(8),
});

/**
 * GET  /api/v1/admin/sources — watched government sites and their last run
 * POST /api/v1/admin/sources — add one (administrator; .gov.bd only)
 */
export async function GET() {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    return ok({ items: await db.select().from(serviceSources).orderBy(desc(serviceSources.createdAt)) });
  }, 'admin/sources:get');
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;
    if (!canApproveChanges(guard.session.role)) return fail(ERROR_CODES.FORBIDDEN, 'Only an administrator can add sources.');
    const body = createSchema.parse(await readJson(request));
    if (!isGovernmentHost(body.baseUrl)) {
      return fail(ERROR_CODES.VALIDATION_FAILED, 'Only government sites (.gov.bd) can be watched.', {
        fields: { baseUrl: 'Use an https:// address ending in .gov.bd' },
      });
    }
    const host = new URL(body.baseUrl).host.replace(/^www\./, '');
    const [created] = await db
      .insert(serviceSources)
      .values({ ...body, organizationId: body.organizationId ?? null, allowedHosts: [host] })
      .onConflictDoNothing()
      .returning();
    if (!created) return fail(ERROR_CODES.CONFLICT, 'That site is already a source.');
    await recordAudit({
      actorId: guard.session.userId,
      actorRole: guard.session.role,
      action: 'source.create',
      entityType: 'service_source',
      entityId: created.id,
      after: { name: created.name, baseUrl: created.baseUrl, kind: created.kind },
    });
    return ok({ source: created }, { status: 201 });
  }, 'admin/sources:post');
}

export const dynamic = 'force-dynamic';

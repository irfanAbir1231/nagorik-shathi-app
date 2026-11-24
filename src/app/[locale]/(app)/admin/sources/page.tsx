import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { serviceSources } from '@/lib/db/schema';
import { canApproveChanges, getFullSession, isStaff } from '@/lib/http/session';
import { AdminNav } from '@/components/admin/AdminNav';
import { SourceManager } from '@/components/admin/SourceManager';

/** Government sites the discovery job watches. */
export default async function SourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getFullSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isStaff(session.user.role)) redirect(`/${locale}/dashboard`);

  const p = await getTranslations('adminPortal');
  const sources = await db.select().from(serviceSources).orderBy(desc(serviceSources.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="type-heading-lg text-text-primary">{p('sources.title')}</h1>
        <p className="type-body-md text-text-secondary">{p('sources.intro')}</p>
      </header>
      <AdminNav />
      <SourceManager
        canManage={canApproveChanges(session.user.role)}
        sources={sources.map((s) => ({
          id: s.id,
          name: s.name,
          baseUrl: s.baseUrl,
          kind: s.kind,
          enabled: s.enabled,
          aiRestricted: s.aiRestricted,
          pagesPerRun: s.pagesPerRun,
          lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
          lastStatus: s.lastStatus,
          lastError: s.lastError,
        }))}
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';

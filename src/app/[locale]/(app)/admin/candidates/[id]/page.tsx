import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db/client';
import { opportunities, organizations } from '@/lib/db/schema';
import { canApproveChanges, getFullSession, isStaff } from '@/lib/http/session';
import { HttpError } from '@/lib/http/response';
import { getCandidateDetail } from '@/modules/discovery/candidates.service';
import type { CandidateDraft, Evidence } from '@/modules/discovery/extract';
import { AdminNav } from '@/components/admin/AdminNav';
import { CandidateReview } from '@/components/admin/CandidateReview';
import { Link } from '@/i18n/navigation';

/** Review one found service beside the page it came from. */
export default async function CandidatePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const bn = locale === 'bn';

  const session = await getFullSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isStaff(session.user.role)) redirect(`/${locale}/dashboard`);

  const p = await getTranslations('adminPortal');

  let detail: Awaited<ReturnType<typeof getCandidateDetail>>;
  try {
    detail = await getCandidateDetail(id);
  } catch (error) {
    if (error instanceof HttpError) notFound();
    throw error;
  }
  const { candidate, snapshot, related, problems } = detail;
  const orgs = await db.select({ id: organizations.id, name: organizations.name, nameBn: organizations.nameBn }).from(organizations).orderBy(asc(organizations.name));
  const draft = candidate.draft as CandidateDraft;
  const title = (bn ? draft.titleBn || draft.title : draft.title || draft.titleBn) || candidate.sourceUrl;

  // The programme this candidate became (for a change, the one it updated).
  const publishedId = candidate.publishedOpportunityId ?? (candidate.status === 'approved' ? candidate.targetOpportunityId : null);
  const [published] = publishedId
    ? await db.select({ slug: opportunities.slug }).from(opportunities).where(eq(opportunities.id, publishedId)).limit(1)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/candidates" className="inline-flex min-h-12 items-center gap-1 type-label-md text-text-link underline">
        <ArrowLeft size={18} className="icon" aria-hidden="true" />
        {p('review.back')}
      </Link>
      <header>
        <h1 className="type-heading-lg text-text-primary">{title}</h1>
      </header>
      <AdminNav />
      <CandidateReview
        candidate={{
          id: candidate.id,
          kind: candidate.kind,
          status: candidate.status,
          sourceUrl: candidate.sourceUrl,
          draft,
          evidence: candidate.evidence as Evidence,
          decisionNote: candidate.decisionNote,
          publishedSlug: published?.slug ?? null,
          notifiedCount: candidate.notifiedCount,
          duplicateOfId: candidate.duplicateOfId,
        }}
        related={
          related
            ? {
                id: related.id,
                slug: related.slug,
                title: bn ? related.titleBn : related.title,
                current: {
                  benefitAmount: related.benefitAmount,
                  benefitPeriod: related.benefitPeriod,
                  deadline: related.deadline ? related.deadline.toISOString().slice(0, 10) : null,
                  applyUrl: related.applyUrl,
                },
              }
            : null
        }
        problems={problems}
        sourceText={snapshot?.text ?? null}
        organizations={orgs.map((o) => ({ id: o.id, name: bn ? o.nameBn : o.name }))}
        canApprove={canApproveChanges(session.user.role)}
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';

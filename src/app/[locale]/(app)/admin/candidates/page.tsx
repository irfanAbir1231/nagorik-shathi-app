import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getFullSession, isStaff } from '@/lib/http/session';
import { listCandidates } from '@/modules/discovery/candidates.service';
import { CANDIDATE_STATUSES, type CandidateStatus } from '@/lib/domain/enums';
import type { CandidateDraft } from '@/modules/discovery/extract';
import { AdminNav } from '@/components/admin/AdminNav';
import { SubmitLinkForm } from '@/components/admin/SubmitLinkForm';
import { Card } from '@/components/primitives/Card';
import { Badge } from '@/components/primitives/Chip';
import { EmptyState } from '@/components/primitives/States';
import { Link } from '@/i18n/navigation';
import { formatTimeAgo } from '@/lib/format/dates';
import { cn } from '@/lib/utils/cn';

const TAB_KEY: Record<CandidateStatus, string> = {
  pending: 'tabPending',
  snoozed: 'tabSnoozed',
  approved: 'tabApproved',
  rejected: 'tabRejected',
  duplicate: 'tabDuplicate',
};

/**
 * The review inbox for services found on government sites. Nothing here is
 * visible to citizens until an administrator approves it.
 */
export default async function CandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = locale === 'bn' ? 'bn' : 'en';

  const session = await getFullSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isStaff(session.user.role)) redirect(`/${locale}/dashboard`);

  const p = await getTranslations('adminPortal');
  const requested = (await searchParams).status;
  const status: CandidateStatus = CANDIDATE_STATUSES.includes(requested as CandidateStatus) ? (requested as CandidateStatus) : 'pending';
  const { items, counts } = await listCandidates({ status });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="type-heading-lg text-text-primary">{p('candidates.title')}</h1>
        <p className="type-body-md text-text-secondary">{p('candidates.intro')}</p>
      </header>

      <AdminNav />

      <Card padding="default">
        <SubmitLinkForm />
      </Card>

      <nav aria-label={p('candidates.title')} className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <ul className="flex gap-2 border-b border-stroke">
          {CANDIDATE_STATUSES.map((s) => (
            <li key={s}>
              <Link
                href={`/admin/candidates?status=${s}`}
                aria-current={s === status ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-12 items-center gap-2 border-b-2 px-3 type-label-md',
                  s === status ? 'border-stroke-brand text-text-brand' : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                {p(`candidates.${TAB_KEY[s]}`)}
                <span className="tabular">{counts[s] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {items.length === 0 ? (
        <EmptyState title={p('candidates.empty')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(({ candidate, sourceName }) => {
            const draft = candidate.draft as CandidateDraft;
            const title = (lang === 'bn' ? draft.titleBn || draft.title : draft.title || draft.titleBn) || candidate.sourceUrl;
            const extractorKey = candidate.extractor === 'ai' ? 'extractorAi' : candidate.extractor === 'rules' ? 'extractorRules' : 'extractorManual';
            return (
              <li key={candidate.id}>
                <Card padding="default" className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={candidate.kind === 'new' ? 'brand' : 'info'}>
                      {candidate.kind === 'new' ? p('candidates.kindNew') : p('candidates.kindChange')}
                    </Badge>
                    <Badge tone={candidate.extractor === 'manual' ? 'warning' : 'neutral'}>{p(`candidates.${extractorKey}`)}</Badge>
                    {candidate.kind === 'new' ? (
                      <Badge tone={candidate.confidence >= 1 ? 'success' : 'neutral'}>
                        {p('candidates.completeness', { percent: Math.round(candidate.confidence * 100) })}
                      </Badge>
                    ) : null}
                    {candidate.duplicateOfId ? <Badge tone="warning">{p('candidates.possibleDuplicate')}</Badge> : null}
                  </div>
                  <Link href={`/admin/candidates/${candidate.id}`} className="type-body-lg font-semibold text-text-link underline">
                    {title}
                  </Link>
                  <p className="type-caption text-text-tertiary">
                    {sourceName ? p('candidates.foundOn', { source: sourceName }) : p('candidates.addedByLink')} ·{' '}
                    {formatTimeAgo(candidate.createdAt, lang)}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';

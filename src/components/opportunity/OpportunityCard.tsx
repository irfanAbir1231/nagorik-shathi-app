'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Building2, CalendarClock, Bookmark, BookmarkCheck, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { EligibilityPill, VerificationBadge, Badge } from '@/components/primitives/Chip';
import { Money } from '@/components/primitives/Money';
import { formatDate, deadlineUrgency, daysUntil } from '@/lib/format/dates';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import type { EligibilityOutcome, VerificationStatus } from '@/lib/domain/enums';
import type { LocalisedText } from '@/lib/domain/rules';

/**
 * Recommendation card — PRD §62.
 *
 * Contains everything §62 lists, with two decisions the PRD leaves open:
 *
 *  • The eligibility REASON is shown on the card, not only on the detail page.
 *    PRD Principle 2 requires every recommendation to explain why, and a card
 *    that shows a verdict without a reason is exactly the black box §Feature 6
 *    forbids.
 *  • The verification badge is always visible. Discovering that a programme was
 *    unverified only after opening it would be a trust failure.
 */

export interface OpportunityCardData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly titleBn: string;
  readonly summary: string;
  readonly summaryBn: string;
  readonly category: string;
  readonly benefitAmount: number | null;
  readonly benefitPeriod: string | null;
  readonly deadline: string | Date | null;
  readonly verificationStatus: VerificationStatus;
  readonly organization: { readonly name: string; readonly nameBn: string };
  readonly eligibility: {
    readonly outcome: EligibilityOutcome;
    readonly topReason: LocalisedText | null;
    readonly topBlocker: LocalisedText | null;
    readonly missingFields: readonly string[];
  };
  readonly confidence: { readonly score: number; readonly band: 'high' | 'medium' | 'low' };
  readonly saved: { readonly id: string; readonly status: string } | null;
  readonly distanceKm?: number | null;
}

export function OpportunityCard({
  item,
  onSave,
  saving = false,
  compact = false,
}: {
  readonly item: OpportunityCardData;
  readonly onSave?: (id: string) => void;
  readonly saving?: boolean;
  readonly compact?: boolean;
}) {
  const t = useTranslations('opportunities');
  const te = useTranslations('eligibility');
  const tt = useTranslations('trust');
  const tc = useTranslations('common');
  const locale = useLocale() as 'bn' | 'en';
  const { numerals } = usePreferences();

  const title = locale === 'bn' ? item.titleBn : item.title;
  const summary = locale === 'bn' ? item.summaryBn : item.summary;
  const org = locale === 'bn' ? item.organization.nameBn : item.organization.name;

  const deadline = item.deadline ? new Date(item.deadline) : null;
  const urgency = deadlineUrgency(deadline);
  const days = deadline ? daysUntil(deadline) : null;

  const outcomeLabel: Record<EligibilityOutcome, string> = {
    eligible: te('eligible'),
    partially_eligible: te('partiallyEligible'),
    not_eligible: te('notEligible'),
    unknown: te('unknown'),
  };

  // The reason shown depends on the verdict: what qualified you, or what blocks
  // you, or what we still need. Never a bare verdict.
  const reason =
    item.eligibility.outcome === 'not_eligible'
      ? item.eligibility.topBlocker
      : item.eligibility.outcome === 'unknown'
        ? null
        : item.eligibility.topReason;

  return (
    <Card padding={compact ? 'compact' : 'default'} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="type-heading-sm min-w-0 flex-1 text-text-primary">
          <Link
            href={`/opportunities/${item.slug}`}
            className="rounded-sm hover:text-text-brand focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
          >
            {title}
          </Link>
        </h3>
        <EligibilityPill outcome={item.eligibility.outcome} label={outcomeLabel[item.eligibility.outcome]} />
      </div>

      <p className="type-body-md flex items-center gap-1.5 text-text-secondary">
        <Building2 size={18} className="icon shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{org}</span>
      </p>

      {!compact ? <p className="type-body-lg text-text-primary clamp-3">{summary}</p> : null}

      {/* The "why" line. */}
      {reason ? (
        <p
          className={cn(
            'type-body-md rounded-md px-3 py-2',
            item.eligibility.outcome === 'not_eligible'
              ? 'bg-surface-error text-text-error'
              : 'bg-surface-success text-text-success',
          )}
        >
          <span className="font-semibold">
            {item.eligibility.outcome === 'not_eligible' ? te('whyNot') : te('whyEligible')}:{' '}
          </span>
          {locale === 'bn' ? reason.bn : reason.en}
        </p>
      ) : item.eligibility.outcome === 'unknown' && item.eligibility.missingFields.length > 0 ? (
        <p className="type-body-md rounded-md bg-surface-info px-3 py-2 text-text-link">
          <span className="font-semibold">{te('whatWeNeed')}: </span>
          {te('answerToDecide')}
        </p>
      ) : null}

      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {item.benefitAmount !== null ? (
          <div>
            <dt className="type-caption text-text-secondary">{tc('amount')}</dt>
            <dd>
              <Money amount={item.benefitAmount} size="label" />
              {item.benefitPeriod === 'monthly' ? (
                <span className="type-body-md text-text-secondary"> {tc('perMonth')}</span>
              ) : null}
            </dd>
          </div>
        ) : null}

        <div>
          <dt className="type-caption text-text-secondary">{tc('deadline')}</dt>
          <dd
            className={cn(
              'type-label-md flex items-center gap-1.5 tabular',
              urgency === 'critical' || urgency === 'expired'
                ? 'text-text-error'
                : urgency === 'soon'
                  ? 'text-text-warning'
                  : 'text-text-primary',
            )}
          >
            <CalendarClock size={18} className="icon shrink-0" aria-hidden="true" />
            {deadline ? (
              <>
                {formatDate(deadline, locale, { style: 'short', numerals })}
                {days !== null && days >= 0 ? (
                  <span className="text-text-secondary">
                    {' · '}
                    {days} {tc('daysLeft')}
                  </span>
                ) : (
                  <span>{' · '}{tc('expired')}</span>
                )}
              </>
            ) : (
              tc('noDeadline')
            )}
          </dd>
        </div>

        {item.distanceKm !== undefined && item.distanceKm !== null ? (
          <div>
            <dt className="type-caption text-text-secondary">{tc('approximate')}</dt>
            <dd className="type-label-md tabular text-text-primary">
              {item.distanceKm} {tc('km')}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge
          status={item.verificationStatus}
          label={
            item.verificationStatus === 'verified'
              ? tt('verified')
              : item.verificationStatus === 'unverified_sample'
                ? tt('unverifiedSample')
                : item.verificationStatus === 'pending_review'
                  ? tt('pendingReview')
                  : item.verificationStatus === 'outdated'
                    ? tt('outdated')
                    : tt('disputed')
          }
        />
        {/* Source reliability of the RECORD (completeness × verification cap).
            Hidden in the compact chat card, where the decision evidence is
            shown instead and a bare percentage would read as "how sure we are
            that you qualify". */}
        {!compact ? (
          <Badge tone={item.confidence.band === 'high' ? 'success' : item.confidence.band === 'medium' ? 'warning' : 'error'}>
            {tt('confidence')} {item.confidence.score}%
          </Badge>
        ) : null}
      </div>

      {/* One primary action; save is a distinct 48 dp target with clear spacing. */}
      <div className="mt-1 flex items-stretch gap-3">
        <Link
          href={`/opportunities/${item.slug}`}
          className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-md bg-ramp-green-600 px-6 type-label-lg text-text-on-brand hover:bg-ramp-green-700 active:bg-ramp-green-800 focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
        >
          {t('detailOverview')}
          <ArrowRight size={20} className="icon" aria-hidden="true" />
        </Link>

        {onSave ? (
          <Button
            variant="secondary"
            size="lg"
            fullWidth={false}
            loading={saving}
            loadingLabel={tc('loading')}
            onClick={() => onSave(item.id)}
            aria-pressed={Boolean(item.saved)}
            className="w-14 px-0"
            leadingIcon={
              item.saved ? (
                <BookmarkCheck size={24} className="icon" />
              ) : (
                <Bookmark size={24} className="icon" />
              )
            }
          >
            <span className="sr-only">{item.saved ? tc('saved') : tc('save')}</span>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

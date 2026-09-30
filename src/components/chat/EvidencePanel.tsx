'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, HelpCircle, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { api, ApiError } from '@/lib/api/client';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';

/**
 * Decision evidence, shown instead of a bare "confidence %".
 *
 *  • EvidencePanel — the facts taken from what the citizen said: WHERE each
 *    came from (the clause they wrote), and whether it was used, is waiting for
 *    confirmation, or conflicts with the profile. Each fact is confirmed or
 *    rejected ON ITS OWN — one tap never confirms a wrong fact along with right
 *    ones. Confirming saves it to the profile; nothing is saved on the
 *    citizen's behalf.
 *  • DecisionTrace — for one programme, the conditions that decided its
 *    verdict, each marked met / not met / not known, with the fact's source.
 *
 * No model probabilities are shown to citizens: a percentage invites reading
 * "99%" as "99% sure I qualify", which it never meant. Probabilities stay in
 * the logs and the evaluation, where they are measured.
 */

type Localised = { readonly en: string; readonly bn: string };

export interface EvidenceFactView {
  readonly field: string;
  readonly value: unknown;
  readonly status: 'accepted' | 'needs_confirmation' | 'conflict';
  readonly method: string;
  readonly probability: number | null;
  readonly source: string;
  readonly label: Localised;
  readonly evidence?: string;
  readonly profileLabel?: Localised;
  readonly save?: Readonly<Record<string, unknown>>;
}

export interface PlanEvidenceView {
  readonly engine: string;
  readonly degraded: boolean;
  readonly facts: readonly EvidenceFactView[];
  readonly saveable: Readonly<Record<string, unknown>>;
}

export interface ConditionView {
  readonly field: string;
  readonly state: 'met' | 'failed' | 'unknown';
  readonly soft: boolean;
  readonly reason: Localised;
  readonly provenance?: { readonly source: string; readonly method: string; readonly probability: number | null };
}

const pick = (text: Localised, locale: 'bn' | 'en') => (locale === 'bn' ? text.bn : text.en);

function useSourceLabel() {
  const t = useTranslations('chat.evidence');
  return (source: string, method: string): string => {
    const where =
      source === 'this_message' ? t('fromMessage')
        : source === 'earlier_message' ? t('fromEarlier')
          : source === 'account' ? t('fromAccount')
            : t('fromProfile');
    return method === 'pattern' ? `${where} · ${t('byPattern')}` : where;
  };
}

type Outcome = 'confirmed' | 'rejected';

function FactRow({
  fact,
  locale,
  conversationId,
}: {
  readonly fact: EvidenceFactView;
  readonly locale: 'bn' | 'en';
  readonly conversationId: string | null;
}) {
  const t = useTranslations('chat.evidence');
  const toast = useToast();
  const sourceLabel = useSourceLabel();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const record = (decision: 'confirm' | 'reject') =>
    conversationId
      ? api.post(`/chat/${conversationId}/facts`, { field: fact.field, value: fact.value, decision })
      : Promise.resolve();

  const confirm = async () => {
    setBusy(true);
    try {
      if (fact.save) await api.patch('/users/profile', fact.save);
      await record('confirm');
      setOutcome('confirmed');
      toast.show({ tone: 'success', message: t('saved') });
    } catch (error) {
      toast.show({ tone: 'error', message: error instanceof ApiError ? error.message : t('actionFailed') });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await record('reject');
      setOutcome('rejected');
    } catch (error) {
      toast.show({ tone: 'error', message: error instanceof ApiError ? error.message : t('actionFailed') });
    } finally {
      setBusy(false);
    }
  };

  const statusText = fact.status === 'accepted' ? t('accepted') : fact.status === 'conflict' ? t('conflict') : t('needsConfirmation');
  const Icon = outcome === 'rejected' ? XCircle : fact.status === 'accepted' || outcome === 'confirmed' ? CheckCircle2 : fact.status === 'conflict' ? AlertTriangle : HelpCircle;
  const iconTone = outcome === 'rejected' ? 'text-text-tertiary' : fact.status === 'conflict' ? 'text-text-warning' : fact.status === 'accepted' || outcome === 'confirmed' ? 'text-text-success' : 'text-text-link';

  return (
    <li className="flex items-start gap-2">
      <Icon size={18} className={cn('icon mt-0.5', iconTone)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn('type-body-md text-text-primary', outcome === 'rejected' && 'line-through')}>
          {fact.status === 'conflict' ? `${t('youSaid')}: ` : ''}
          {pick(fact.label, locale)}
        </span>
        {fact.status === 'conflict' && fact.profileLabel ? (
          <span className="type-body-md text-text-secondary">{t('profileSays')}: {pick(fact.profileLabel, locale)}</span>
        ) : null}
        {fact.evidence ? <span className="type-caption text-text-secondary">“{fact.evidence}”</span> : null}
        <span className="type-caption text-text-secondary">
          {outcome === 'confirmed' ? t('confirmedNote') : outcome === 'rejected' ? t('rejectedNote') : `${statusText} · ${sourceLabel(fact.source, fact.method)}`}
        </span>
        {outcome === null && fact.save ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void confirm()} disabled={busy}>
              {fact.status === 'conflict' ? t('useMine') : t('correct')}
            </Button>
            <Button variant="tertiary" size="sm" onClick={() => void reject()} disabled={busy}>
              {fact.status === 'conflict' ? t('keepProfile') : t('notCorrect')}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function EvidencePanel({
  evidence,
  locale,
  conversationId,
}: {
  readonly evidence: PlanEvidenceView;
  readonly locale: 'bn' | 'en';
  readonly conversationId: string | null;
}) {
  const t = useTranslations('chat.evidence');
  // Only what the citizen said in chat is shown here; profile facts are
  // already theirs and appear in each programme's "why" list instead.
  const facts = evidence.facts.filter((f) => f.source === 'this_message' || f.source === 'earlier_message' || f.status !== 'accepted');
  if (facts.length === 0) return null;

  return (
    <section aria-label={t('title')} className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
      <h3 className="type-label-md text-text-primary">{t('title')}</h3>
      <ul className="flex flex-col gap-3">
        {facts.map((f) => (
          <FactRow key={`${f.field}-${String(f.value)}-${f.status}`} fact={f} locale={locale} conversationId={conversationId} />
        ))}
      </ul>
      <p className="type-caption text-text-secondary">{t('notSaved')}</p>
    </section>
  );
}

export function DecisionTrace({
  conditions,
  decisionStatus,
  locale,
}: {
  readonly conditions: readonly ConditionView[];
  readonly decisionStatus?: string;
  readonly locale: 'bn' | 'en';
}) {
  const t = useTranslations('chat.why');
  const sourceLabel = useSourceLabel();
  const [open, setOpen] = useState(false);
  if (conditions.length === 0) return null;

  const statusText =
    decisionStatus === 'review' ? t('review')
      : decisionStatus === 'needs_confirmation' ? t('confirm')
        : decisionStatus === 'needs_information' ? t('information')
          : t('decided');

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-12 items-center gap-1.5 self-start rounded-md px-3 type-label-md text-text-link hover:bg-surface-info focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
      >
        {t('title')}
        <ChevronDown size={18} className={cn('icon transition-transform duration-fast', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open ? (
        <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
          <ul className="flex flex-col gap-1.5">
            {conditions.map((c, i) => (
              <li key={`${c.field}-${i}`} className="flex items-start gap-2">
                {c.state === 'met' ? (
                  <CheckCircle2 size={18} className="icon mt-0.5 text-text-success" aria-label={t('met')} />
                ) : c.state === 'failed' ? (
                  <XCircle size={18} className="icon mt-0.5 text-text-error" aria-label={t('failed')} />
                ) : (
                  <HelpCircle size={18} className="icon mt-0.5 text-text-link" aria-label={t('unknown')} />
                )}
                <span className="flex flex-col">
                  <span className="type-body-md text-text-primary">{pick(c.reason, locale)}</span>
                  <span className="type-caption text-text-secondary">
                    {c.provenance ? sourceLabel(c.provenance.source, c.provenance.method) : t('unknown')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="type-caption text-text-secondary">{statusText}</p>
        </div>
      ) : null}
    </div>
  );
}

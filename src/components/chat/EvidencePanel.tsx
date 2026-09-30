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
 * Two views:
 *  • EvidencePanel — the facts taken from what the citizen said, each with
 *    WHERE it came from and whether it was used, held for confirmation, or in
 *    conflict with the profile. The citizen confirms by saving to the profile;
 *    nothing is saved on their behalf.
 *  • DecisionTrace — for one programme, the conditions that decided its
 *    verdict, each marked met / not met / not known, with the fact's source.
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
  return (source: string, method: string, probability: number | null): string => {
    const where =
      source === 'this_message' ? t('fromMessage')
        : source === 'earlier_message' ? t('fromEarlier')
          : source === 'account' ? t('fromAccount')
            : t('fromProfile');
    if (method === 'pattern') return `${where} · ${t('byPattern')}`;
    if (probability !== null && probability !== undefined) {
      return `${where} · ${t('certainty')} ${Math.round(probability * 100)}%`;
    }
    return where;
  };
}

export function EvidencePanel({ evidence, locale }: { readonly evidence: PlanEvidenceView; readonly locale: 'bn' | 'en' }) {
  const t = useTranslations('chat.evidence');
  const toast = useToast();
  const sourceLabel = useSourceLabel();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Only what the citizen said in chat is shown here; profile facts are
  // already theirs and appear in each programme's "why" list instead.
  const facts = evidence.facts.filter((f) => f.source === 'this_message' || f.source === 'earlier_message' || f.status !== 'accepted');
  if (facts.length === 0) return null;
  const canSave = Object.keys(evidence.saveable).length > 0 && !saved;

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/users/profile', evidence.saveable);
      setSaved(true);
      toast.show({ tone: 'success', message: t('saved') });
    } catch (error) {
      toast.show({ tone: 'error', message: error instanceof ApiError ? error.message : t('saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label={t('title')} className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
      <h3 className="type-label-md text-text-primary">{t('title')}</h3>
      <ul className="flex flex-col gap-1.5">
        {facts.map((f) => (
          <li key={`${f.field}-${String(f.value)}-${f.status}`} className="flex items-start gap-2">
            {f.status === 'accepted' ? (
              <CheckCircle2 size={18} className="icon mt-0.5 text-text-success" aria-hidden="true" />
            ) : f.status === 'conflict' ? (
              <AlertTriangle size={18} className="icon mt-0.5 text-text-warning" aria-hidden="true" />
            ) : (
              <HelpCircle size={18} className="icon mt-0.5 text-text-link" aria-hidden="true" />
            )}
            <span className="flex flex-col">
              <span className="type-body-md text-text-primary">
                {pick(f.label, locale)}
                <span className="sr-only">
                  {' — '}
                  {f.status === 'accepted' ? t('accepted') : f.status === 'conflict' ? t('conflict') : t('needsConfirmation')}
                </span>
              </span>
              <span className="type-caption text-text-secondary">
                {f.status === 'accepted' ? t('accepted') : f.status === 'conflict' ? t('conflict') : t('needsConfirmation')}
                {' · '}
                {sourceLabel(f.source, f.method, f.probability)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="type-caption text-text-secondary">{t('notSaved')}</p>
      {canSave ? (
        <div>
          <Button variant="secondary" size="sm" onClick={() => void save()} disabled={saving}>
            {t('save')}
          </Button>
        </div>
      ) : null}
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
                    {c.provenance ? sourceLabel(c.provenance.source, c.provenance.method, c.provenance.probability) : t('unknown')}
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

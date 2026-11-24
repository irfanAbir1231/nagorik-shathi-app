'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Copy, ExternalLink, Plus, Save, Trash2, XCircle, RotateCcw, Sparkles } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api/client';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/primitives/Banner';
import { Card, Section } from '@/components/primitives/Card';
import { Badge } from '@/components/primitives/Chip';
import { NativeSelect, PlainInput, PlainTextarea } from '@/components/admin/AdminFields';
import { useToast } from '@/components/providers/ToastProvider';
import { LIFE_EVENTS, OPPORTUNITY_CATEGORIES, type CandidateKind, type CandidateStatus } from '@/lib/domain/enums';
import type { CandidateDraft, Evidence } from '@/modules/discovery/extract';

const PERIODS = ['one_time', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'per_course', 'variable'] as const;
const AI_NOTE_PREFIX = 'Filled by AI';

interface Props {
  readonly candidate: {
    id: string;
    kind: CandidateKind;
    status: CandidateStatus;
    sourceUrl: string;
    draft: CandidateDraft;
    evidence: Evidence;
    decisionNote: string | null;
    publishedSlug: string | null;
    notifiedCount: number | null;
    duplicateOfId: string | null;
  };
  readonly related: { id: string; slug: string; title: string; current: Record<string, unknown> } | null;
  readonly problems: Record<string, string>;
  readonly sourceText: string | null;
  readonly organizations: readonly { id: string; name: string }[];
  readonly canApprove: boolean;
}

/**
 * Review one candidate: edit the draft beside the page it came from, then
 * publish, keep as a draft, reject, snooze, or mark as already listed.
 */
export function CandidateReview({ candidate, related, problems: initialProblems, sourceText, organizations, canApprove }: Props) {
  const p = useTranslations('adminPortal');
  const te = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();

  const [draft, setDraft] = useState<CandidateDraft>(candidate.draft);
  const [problems, setProblems] = useState(initialProblems);
  const [dirty, setDirty] = useState(false);
  const [notify, setNotify] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  const open = candidate.status === 'pending' || candidate.status === 'snoozed';
  const evidence = candidate.evidence;
  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.fields) setProblems(error.fields);
    toast.show({ tone: 'error', message: error instanceof ApiError ? error.message : te('genericBody') });
  };

  const set = <K extends keyof CandidateDraft>(key: K, value: CandidateDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: () => api.patch<{ problems: Record<string, string> }>(`/admin/candidates/${candidate.id}`, { draft: editable(draft) }),
    onSuccess: (data) => {
      setProblems(data.problems);
      setDirty(false);
      toast.show({ tone: 'success', message: p('saved') });
      router.refresh();
    },
    onError,
  });

  const decide = useMutation({
    mutationFn: (status: 'rejected' | 'snoozed' | 'pending' | 'duplicate') =>
      api.patch(`/admin/candidates/${candidate.id}`, {
        decision: { status, ...(note ? { note } : {}), ...(status === 'duplicate' && candidate.duplicateOfId ? { duplicateOfId: candidate.duplicateOfId } : {}) },
      }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: p('saved') });
      router.refresh();
    },
    onError,
  });

  const approve = useMutation({
    mutationFn: (publish: 'open' | 'draft') =>
      api.post<{ notified: number }>(`/admin/candidates/${candidate.id}/approve`, { publish, notify: notify && publish === 'open' }),
    onSuccess: (data) => {
      toast.show({ tone: 'success', message: `${p('review.published')} · ${p('review.notified', { count: data.notified })}` });
      router.refresh();
    },
    onError,
  });

  const audience = useQuery({
    queryKey: ['candidate-audience', candidate.id, draft.lifeEvents, draft.coverageDistricts],
    queryFn: () => api.get<{ matched: number; willNotify: number }>(`/admin/candidates/${candidate.id}/audience`),
    enabled: open && candidate.kind === 'new' && canApprove && !dirty,
  });

  const read = (field: string) => {
    const text = evidence[field];
    if (!text) return undefined;
    if (text.startsWith(AI_NOTE_PREFIX)) {
      return (
        <span className="inline-flex items-center gap-1 text-text-brand">
          <Sparkles size={14} className="icon" aria-hidden="true" />
          {p('review.aiNote')}
        </span>
      );
    }
    return (
      <span>
        {p('review.readFrom')}: “{text.length > 180 ? `${text.slice(0, 180)}…` : text}”
      </span>
    );
  };

  const text = (field: keyof CandidateDraft, long = false) => {
    const Field = long ? PlainTextarea : PlainInput;
    return (
      <Field
        id={`f-${field}`}
        label={p(`review.${field}`)}
        value={(draft[field] as string | undefined) ?? ''}
        onChange={(e: { target: { value: string } }) => set(field, e.target.value as never)}
        hint={read(field)}
        error={problems[field]}
        disabled={!open}
        {...(long ? { rows: 4 } : {})}
      />
    );
  };

  const steps = draft.applicationProcess ?? [];
  const setSteps = (next: { en: string; bn: string }[]) =>
    set('applicationProcess', next.map((s, i) => ({ step: i + 1, en: s.en, bn: s.bn })));

  return (
    <div className="flex flex-col gap-6">
      {!open ? (
        <Banner tone={candidate.status === 'approved' ? 'success' : 'info'} statusWord={p('note')}>
          {p('review.decided', { status: p(`candidates.tab${candidate.status[0]!.toUpperCase()}${candidate.status.slice(1)}`) })}
          {candidate.decisionNote ? ` — “${candidate.decisionNote}”` : ''}
          {candidate.publishedSlug ? (
            <>
              {' · '}
              <Link href={`/opportunities/${candidate.publishedSlug}`} className="text-text-link underline">
                {p('review.viewProgramme')}
              </Link>
              {candidate.notifiedCount ? ` · ${p('review.notified', { count: candidate.notifiedCount })}` : ''}
            </>
          ) : null}
        </Banner>
      ) : null}

      {candidate.kind === 'new' && related ? (
        <Banner tone="warning" statusWord={p('warning')}>
          {p('review.duplicateOf', { title: related.title })}{' '}
          <Link href={`/opportunities/${related.slug}`} className="text-text-link underline">
            {p('review.viewProgramme')}
          </Link>
        </Banner>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* ---------------------------------------------------- the draft */}
        <div className="flex flex-col gap-4">
          {candidate.kind === 'change' && related ? (
            <Section title={p('review.changeFor', { title: related.title })}>
              <Card padding="default">
                <dl className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2">
                  <span />
                  <dt className="type-label-md text-text-secondary">{p('review.current')}</dt>
                  <dt className="type-label-md text-text-secondary">{p('review.proposed')}</dt>
                  {Object.entries(candidate.draft).map(([key, value]) => (
                    <div key={key} className="contents">
                      <dt className="type-body-md text-text-secondary">{p.has(`review.${key}`) ? p(`review.${key}`) : key}</dt>
                      <dd className="type-body-md tabular text-text-primary">{formatValue(related.current[key])}</dd>
                      <dd className="type-body-md tabular font-semibold text-text-primary">{formatValue(value)}</dd>
                    </div>
                  ))}
                </dl>
                {Object.keys(candidate.draft).map((key) =>
                  evidence[key] ? (
                    <p key={key} className="type-caption mt-2 text-text-secondary">
                      {read(key)}
                    </p>
                  ) : null,
                )}
              </Card>
            </Section>
          ) : (
            <Section title={p('review.draft')}>
              <Card padding="default" className="flex flex-col gap-4">
                {Object.keys(problems).length > 0 ? (
                  <Banner tone="warning" statusWord={p('review.missingTitle')}>
                    <ul className="list-disc ps-5">
                      {Object.entries(problems).map(([field, message]) => (
                        <li key={field}>
                          <strong>{p.has(`review.${field}`) ? p(`review.${field}`) : field}</strong>: {message}
                        </li>
                      ))}
                    </ul>
                  </Banner>
                ) : (
                  <Banner tone="success" statusWord={p('note')}>
                    {p('review.ready')}
                  </Banner>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {text('titleBn')}
                  {text('title')}
                  {text('summaryBn', true)}
                  {text('summary', true)}
                  {text('descriptionBn', true)}
                  {text('description', true)}
                  {text('benefitsBn', true)}
                  {text('benefits', true)}
                  <NativeSelect
                    id="f-organizationId"
                    label={p('review.organization')}
                    value={draft.organizationId ?? ''}
                    onChange={(e) => set('organizationId', e.target.value || null)}
                    error={problems.organizationId}
                    disabled={!open}
                    options={[{ value: '', label: p('review.chooseOrganization') }, ...organizations.map((o) => ({ value: o.id, label: o.name }))]}
                  />
                  <NativeSelect
                    id="f-category"
                    label={p('review.category')}
                    value={draft.category ?? ''}
                    onChange={(e) => set('category', (e.target.value || undefined) as CandidateDraft['category'])}
                    hint={read('category')}
                    error={problems.category}
                    disabled={!open}
                    options={[{ value: '', label: '—' }, ...OPPORTUNITY_CATEGORIES.map((c) => ({ value: c, label: p(`category.${c}`) }))]}
                  />
                  <PlainInput
                    id="f-benefitAmount"
                    type="number"
                    min={0}
                    label={p('review.amount')}
                    value={draft.benefitAmount ?? ''}
                    onChange={(e) => set('benefitAmount', e.target.value === '' ? null : Number(e.target.value))}
                    hint={read('benefitAmount')}
                    disabled={!open}
                  />
                  <NativeSelect
                    id="f-benefitPeriod"
                    label={p('review.period')}
                    value={draft.benefitPeriod ?? ''}
                    onChange={(e) => set('benefitPeriod', (e.target.value || null) as CandidateDraft['benefitPeriod'])}
                    disabled={!open}
                    options={[{ value: '', label: '—' }, ...PERIODS.map((x) => ({ value: x, label: p(`period.${x}`) }))]}
                  />
                  <PlainInput
                    id="f-deadline"
                    type="date"
                    label={p('review.deadline')}
                    value={draft.deadline ?? ''}
                    onChange={(e) => set('deadline', e.target.value || null)}
                    hint={read('deadline')}
                    disabled={!open}
                  />
                  <PlainInput
                    id="f-slug"
                    label={p('review.slug')}
                    hint={p('review.slugHelp')}
                    value={draft.slug ?? ''}
                    onChange={(e) => set('slug', e.target.value.toLowerCase())}
                    error={problems.slug}
                    disabled={!open}
                  />
                  <PlainInput
                    id="f-officialUrl"
                    type="url"
                    label={p('review.officialUrl')}
                    value={draft.officialUrl ?? ''}
                    onChange={(e) => set('officialUrl', e.target.value || null)}
                    error={problems.officialUrl}
                    disabled={!open}
                  />
                  <PlainInput
                    id="f-applyUrl"
                    type="url"
                    label={p('review.applyUrl')}
                    value={draft.applyUrl ?? ''}
                    onChange={(e) => set('applyUrl', e.target.value || null)}
                    hint={read('applyUrl')}
                    error={problems.applyUrl}
                    disabled={!open}
                  />
                </div>

                <fieldset className="flex flex-col gap-2" disabled={!open}>
                  <legend className="type-label-md text-text-primary">{p('review.lifeEvents')}</legend>
                  <p className="type-caption text-text-secondary">{p('review.lifeEventsHelp')}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {LIFE_EVENTS.map((event) => {
                      const checked = (draft.lifeEvents ?? []).includes(event);
                      return (
                        <label key={event} className="inline-flex min-h-10 items-center gap-2 type-body-md text-text-primary">
                          <input
                            type="checkbox"
                            className="size-5"
                            checked={checked}
                            onChange={() =>
                              set('lifeEvents', checked ? (draft.lifeEvents ?? []).filter((e) => e !== event) : [...(draft.lifeEvents ?? []), event])
                            }
                          />
                          {p(`lifeEvent.${event}`)}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="flex flex-col gap-3" disabled={!open}>
                  <legend className="type-label-md text-text-primary">{p('review.steps')}</legend>
                  {problems.applicationProcess ? (
                    <p className="type-caption font-semibold text-text-error" role="alert">
                      {problems.applicationProcess}
                    </p>
                  ) : null}
                  {steps.map((step, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                      <PlainInput
                        id={`step-bn-${i}`}
                        label={p('review.stepBn', { n: i + 1 })}
                        value={step.bn}
                        onChange={(e) => setSteps(steps.map((s, j) => (j === i ? { ...s, bn: e.target.value } : s)))}
                      />
                      <PlainInput
                        id={`step-en-${i}`}
                        label={p('review.stepEn', { n: i + 1 })}
                        value={step.en}
                        onChange={(e) => setSteps(steps.map((s, j) => (j === i ? { ...s, en: e.target.value } : s)))}
                      />
                      <Button
                        variant="tertiary"
                        size="md"
                        aria-label={p('review.removeStep', { n: i + 1 })}
                        onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                        leadingIcon={<Trash2 size={18} className="icon" />}
                      >
                        {p('review.removeStep', { n: i + 1 })}
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setSteps([...steps, { en: '', bn: '' }])}
                      leadingIcon={<Plus size={18} className="icon" />}
                    >
                      {p('review.addStep')}
                    </Button>
                  </div>
                </fieldset>

                {open ? (
                  <div>
                    <Button
                      size="md"
                      disabled={!dirty}
                      loading={save.isPending}
                      loadingLabel={p('review.save')}
                      onClick={() => save.mutate()}
                      leadingIcon={<Save size={18} className="icon" />}
                    >
                      {p('review.save')}
                    </Button>
                  </div>
                ) : null}
              </Card>
            </Section>
          )}

          {open ? (
            <Section title={p('review.decide')}>
              <Card padding="default" className="flex flex-col gap-4">
                {!canApprove ? (
                  <Banner tone="info" statusWord={p('note')}>
                    {p('onlyAdmin')}
                  </Banner>
                ) : candidate.kind === 'new' ? (
                  <>
                    <Banner tone="info" statusWord={p('note')}>
                      {p('review.noRules')}
                    </Banner>
                    <label className="inline-flex min-h-12 items-center gap-3 type-body-md text-text-primary">
                      <input type="checkbox" className="size-5" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                      {p('review.notify')}
                    </label>
                    {notify && audience.data ? (
                      <p className="type-body-md text-text-secondary" aria-live="polite">
                        {p('review.audience', { count: audience.data.willNotify })} · {p('review.audienceDetail', { matched: audience.data.matched })}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="md"
                        disabled={dirty || Object.keys(problems).length > 0}
                        disabledReason={dirty ? p('review.save') : p('review.missingTitle')}
                        loading={approve.isPending}
                        loadingLabel={p('review.approve')}
                        onClick={() => approve.mutate('open')}
                        leadingIcon={<CheckCircle2 size={18} className="icon" />}
                      >
                        {p('review.approve')}
                      </Button>
                      <Button
                        size="md"
                        variant="secondary"
                        disabled={dirty || Object.keys(problems).length > 0}
                        loading={approve.isPending}
                        loadingLabel={p('review.approveDraft')}
                        onClick={() => approve.mutate('draft')}
                      >
                        {p('review.approveDraft')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div>
                    <Button
                      size="md"
                      loading={approve.isPending}
                      loadingLabel={p('review.applyChange')}
                      onClick={() => approve.mutate('open')}
                      leadingIcon={<CheckCircle2 size={18} className="icon" />}
                    >
                      {p('review.applyChange')}
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-stroke pt-4">
                  {candidate.status === 'snoozed' ? (
                    <Button size="md" variant="secondary" loading={decide.isPending} loadingLabel={p('review.reopen')} onClick={() => decide.mutate('pending')} leadingIcon={<RotateCcw size={18} className="icon" />}>
                      {p('review.reopen')}
                    </Button>
                  ) : (
                    <Button size="md" variant="secondary" loading={decide.isPending} loadingLabel={p('review.snooze')} onClick={() => decide.mutate('snoozed')} leadingIcon={<Clock size={18} className="icon" />}>
                      {p('review.snooze')}
                    </Button>
                  )}
                  {candidate.duplicateOfId ? (
                    <Button size="md" variant="secondary" loading={decide.isPending} loadingLabel={p('review.markDuplicate')} onClick={() => decide.mutate('duplicate')} leadingIcon={<Copy size={18} className="icon" />}>
                      {p('review.markDuplicate')}
                    </Button>
                  ) : null}
                  <Button size="md" variant="danger-subtle" aria-expanded={rejecting} onClick={() => setRejecting((v) => !v)} leadingIcon={<XCircle size={18} className="icon" />}>
                    {p('review.reject')}
                  </Button>
                </div>
                {rejecting ? (
                  <div className="flex flex-col gap-2">
                    <PlainInput id="reject-note" label={p('review.rejectReason')} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
                    <div>
                      <Button size="md" variant="danger" disabled={note.trim().length < 3} loading={decide.isPending} loadingLabel={p('review.reject')} onClick={() => decide.mutate('rejected')}>
                        {p('review.reject')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            </Section>
          ) : null}
        </div>

        {/* ------------------------------------------- the source, beside it */}
        <div className="flex flex-col gap-4">
          <Section title={p('review.sourceText')} description={p('review.sourceTextHelp')}>
            <Card padding="default" className="flex flex-col gap-3">
              <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-1 break-all type-label-md text-text-link underline">
                <ExternalLink size={16} className="icon shrink-0" aria-hidden="true" />
                {p('review.openSource')}
              </a>
              {evidence._source ? (
                <Banner tone="info" statusWord={p('note')}>
                  {evidence._source}
                </Banner>
              ) : null}
              {evidence._eligibility ? (
                <div>
                  <p className="type-label-md text-text-primary">{p('review.eligibilityHints')}</p>
                  <ul className="mt-1 flex list-disc flex-col gap-1 ps-5 type-body-md text-text-secondary">
                    {evidence._eligibility.split('\n').map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {evidence._application ? (
                <div>
                  <p className="type-label-md text-text-primary">{p('review.applicationHints')}</p>
                  <ul className="mt-1 flex list-disc flex-col gap-1 ps-5 type-body-md text-text-secondary">
                    {evidence._application.split('\n').map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {sourceText ? (
                <div className="max-h-[32rem] overflow-y-auto rounded-md bg-surface-sunken p-3 type-body-md whitespace-pre-wrap text-text-primary" tabIndex={0} aria-label={p('review.sourceText')}>
                  {sourceText}
                </div>
              ) : (
                <p className="type-body-md text-text-tertiary">{p('review.noSourceText')}</p>
              )}
            </Card>
          </Section>
          {candidate.kind === 'new' && Object.keys(evidence).some((k) => evidence[k]?.startsWith(AI_NOTE_PREFIX)) ? (
            <Badge tone="info">{p('candidates.extractorAi')}</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Only the fields the edit endpoint accepts. */
function editable(draft: CandidateDraft) {
  const { sourceUrl: _s, sourceNote: _n, ...rest } = draft;
  return {
    ...rest,
    applicationProcess: (rest.applicationProcess ?? []).filter((s) => s.en.trim() || s.bn.trim()),
    benefitAmount: rest.benefitAmount ?? null,
  };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return String(value);
}

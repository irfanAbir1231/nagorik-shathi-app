'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Plus, RefreshCw, Power } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api/client';
import { Button } from '@/components/primitives/Button';
import { Card } from '@/components/primitives/Card';
import { Badge } from '@/components/primitives/Chip';
import { EmptyState } from '@/components/primitives/States';
import { NativeSelect, PlainInput } from '@/components/admin/AdminFields';
import { useToast } from '@/components/providers/ToastProvider';
import { formatTimeAgo } from '@/lib/format/dates';
import type { SourceKind } from '@/lib/domain/enums';

export interface SourceRow {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly kind: SourceKind;
  readonly enabled: boolean;
  readonly aiRestricted: boolean;
  readonly pagesPerRun: number;
  readonly lastRunAt: string | null;
  readonly lastStatus: string | null;
  readonly lastError: string | null;
}

interface RunResult {
  result: { detail?: { sources?: { pagesRead: number; newCandidates: number; changeCandidates: number }[] } };
}

/** Watched government sites: add, turn on/off, check now. */
export function SourceManager({ sources, canManage }: { readonly sources: readonly SourceRow[]; readonly canManage: boolean }) {
  const p = useTranslations('adminPortal');
  const te = useTranslations('errors');
  const locale = useLocale() as 'bn' | 'en';
  const toast = useToast();
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', baseUrl: '', kind: 'dss_portal' as SourceKind });
  const [running, setRunning] = useState<string | null>(null);
  const onError = (error: unknown) => toast.show({ tone: 'error', message: error instanceof ApiError ? error.message : te('genericBody') });

  const add = useMutation({
    mutationFn: () =>
      api.post('/admin/sources', {
        ...form,
        listPaths: form.kind === 'dss_portal' ? ['/views/sitemap', '/pages/notices'] : [],
      }),
    onSuccess: () => {
      setAdding(false);
      setForm({ name: '', baseUrl: '', kind: 'dss_portal' });
      router.refresh();
    },
    onError,
  });

  const toggle = useMutation({
    mutationFn: (source: SourceRow) => api.patch(`/admin/sources/${source.id}`, { enabled: !source.enabled }),
    onSuccess: () => router.refresh(),
    onError,
  });

  const run = useMutation({
    mutationFn: (id: string) => api.post<RunResult>(`/admin/sources/${id}`, {}),
    onSuccess: (data) => {
      const s = data.result.detail?.sources?.[0];
      toast.show({
        tone: 'success',
        message: s ? p('sources.result', { pages: s.pagesRead, created: s.newCandidates, changes: s.changeCandidates }) : p('saved'),
      });
      router.refresh();
    },
    onError,
    onSettled: () => setRunning(null),
  });

  const kindLabel = (kind: SourceKind) =>
    kind === 'dss_portal' ? p('sources.kindDss') : kind === 'single_page' ? p('sources.kindSingle') : p('sources.kindManual');

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div>
          <Button variant="secondary" size="md" aria-expanded={adding} onClick={() => setAdding((v) => !v)} leadingIcon={<Plus size={18} className="icon" />}>
            {p('sources.add')}
          </Button>
        </div>
      ) : null}

      {adding ? (
        <Card padding="default">
          <form
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <PlainInput id="source-name" label={p('sources.name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <PlainInput id="source-url" type="url" label={p('sources.baseUrl')} placeholder="https://…gov.bd/" required value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
            <NativeSelect
              id="source-kind"
              label={p('sources.kind')}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as SourceKind })}
              options={(['dss_portal', 'single_page', 'manual'] as const).map((k) => ({ value: k, label: kindLabel(k) }))}
            />
            <Button type="submit" size="md" loading={add.isPending} loadingLabel={p('sources.add')}>
              {p('sources.add')}
            </Button>
          </form>
        </Card>
      ) : null}

      {sources.length === 0 ? (
        <EmptyState title={p('sources.empty')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {sources.map((source) => (
            <li key={source.id}>
              <Card padding="default" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="type-body-lg font-semibold text-text-primary">{source.name}</p>
                  <Badge tone={source.enabled ? 'success' : 'neutral'}>{source.enabled ? p('sources.enabled') : p('sources.disabled')}</Badge>
                  <Badge>{kindLabel(source.kind)}</Badge>
                  {source.aiRestricted ? <Badge tone="warning">{p('sources.aiRestricted')}</Badge> : null}
                </div>
                <a href={source.baseUrl} target="_blank" rel="noopener noreferrer" className="type-body-md break-all text-text-link underline">
                  {source.baseUrl}
                </a>
                <p className="type-caption text-text-secondary">
                  {p('sources.lastRun')}: {source.lastRunAt ? formatTimeAgo(new Date(source.lastRunAt), locale) : p('never')}
                  {source.lastStatus ? ` · ${source.lastStatus}` : ''} · {p('sources.pagesPerRun')}: {source.pagesPerRun}
                </p>
                {source.lastError ? (
                  <p className="type-caption text-text-error">
                    {p('sources.lastError')}: {source.lastError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {source.kind !== 'manual' ? (
                    <Button
                      size="md"
                      variant="secondary"
                      disabled={!source.enabled || running !== null}
                      loading={running === source.id}
                      loadingLabel={p('sources.checking')}
                      onClick={() => {
                        setRunning(source.id);
                        run.mutate(source.id);
                      }}
                      leadingIcon={<RefreshCw size={18} className="icon" />}
                    >
                      {p('sources.checkNow')}
                    </Button>
                  ) : null}
                  {canManage ? (
                    <Button size="md" variant="tertiary" loading={toggle.isPending} loadingLabel={p('sources.enable')} onClick={() => toggle.mutate(source)} leadingIcon={<Power size={18} className="icon" />}>
                      {source.enabled ? p('sources.disable') : p('sources.enable')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

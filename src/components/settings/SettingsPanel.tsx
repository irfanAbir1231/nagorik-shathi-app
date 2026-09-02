'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Sun, Moon, SunDim, Download, Trash2, LogOut, Smartphone } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { Card, Section } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { TextField } from '@/components/primitives/TextField';
import { RadioGroup, SwitchRow } from '@/components/primitives/Choice';
import { Dialog } from '@/components/primitives/Sheet';
import { Banner, InfoPanel } from '@/components/primitives/Banner';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate } from '@/lib/format/dates';
import type { Theme, TextScale, NumeralSystem } from '@/lib/domain/enums';

/**
 * Settings — PRD §69, and the BDS controls from §3.6, §4.3, and §4.6.
 *
 * Presentation preferences apply IMMEDIATELY through the preferences context and
 * sync in the background, because a citizen changing text size needs to see the
 * effect on the words they are reading, on this screen, right now.
 *
 * The sunlight theme is presented by its symptom ("Hard to see in sunlight?")
 * rather than by the word "contrast", per BDS §3.6.
 */

export function SettingsPanel({
  settings,
  smsAvailable,
  emailAvailable,
  sessions,
}: {
  readonly settings: {
    theme: Theme;
    textScale: number;
    numeralSystem: NumeralSystem;
    reduceMotion: boolean;
    voiceEnabled: boolean;
    notifyPush: boolean;
    notifyEmail: boolean;
    notifySms: boolean;
    notifyDeadlines: boolean;
    notifyNewOpportunities: boolean;
    notifyProgramUpdates: boolean;
  };
  readonly smsAvailable: boolean;
  readonly emailAvailable: boolean;
  readonly sessions: readonly {
    id: string;
    userAgent: string | null;
    ip: string | null;
    createdAt: string;
    revokedAt: string | null;
  }[];
}) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const locale = useLocale() as 'bn' | 'en';
  const toast = useToast();
  const preferences = usePreferences();

  const [notify, setNotify] = useState(settings);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const patchSettings = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch('/users/settings', patch),
    onError: (error) =>
      toast.show({ tone: 'error', message: error instanceof ApiError ? error.message : te('genericBody') }),
  });

  const toggleNotify = (key: keyof typeof notify, value: boolean) => {
    setNotify((current) => ({ ...current, [key]: value }));
    patchSettings.mutate({ [key]: value });
  };

  const exportData = useMutation({
    mutationFn: async () => {
      const [me, profile, saved, plans, timeline, notifications, conversations] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/profile'),
        api.get('/saved'),
        api.get('/action-plans'),
        api.get('/timeline?scope=upcoming'),
        api.get('/notifications'),
        api.get('/chat'),
      ]);
      return { exportedAt: new Date().toISOString(), me, profile, saved, plans, timeline, notifications, conversations };
    },
    onSuccess: (data) => {
      // Built client-side from the citizen's own authorised reads, so no new
      // server surface is needed to hand them their data.
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shebar-janala-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.show({ tone: 'success', message: tc('saved') });
    },
    onError: () => toast.show({ tone: 'error', message: te('genericBody') }),
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/users/me', { confirm: 'DELETE' }),
    onSuccess: () => {
      window.location.href = '/';
    },
    onError: (error) =>
      toast.show({ tone: 'error', message: error instanceof ApiError ? error.message : te('genericBody') }),
  });

  const signOutEverywhere = useMutation({
    mutationFn: () => api.delete('/auth/session'),
    onSuccess: () => {
      window.location.href = '/';
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------ language */}
      <Section title={tc('language')}>
        <Card padding="default">
          <LocaleSwitcher />
        </Card>
      </Section>

      {/* ---------------------------------------------------- appearance */}
      <Section title={t('appearance')}>
        <Card padding="default" className="flex flex-col gap-5">
          <RadioGroup
            name="theme"
            legend={t('appearance')}
            value={preferences.theme}
            onChange={(theme) => {
              preferences.setTheme(theme as Theme);
              patchSettings.mutate({ theme });
            }}
            options={[
              { value: 'light', label: t('themeLight'), icon: <Sun size={20} className="icon" /> },
              { value: 'dark', label: t('themeDark'), icon: <Moon size={20} className="icon" /> },
              {
                value: 'sunlight',
                label: t('themeSunlight'),
                description: t('themeSunlightBody'),
                icon: <SunDim size={20} className="icon" />,
              },
            ]}
          />

          <div>
            <RadioGroup
              name="textScale"
              legend={t('textSize')}
              value={String(preferences.textScale)}
              onChange={(value) => {
                const scale = Number(value) as TextScale;
                preferences.setTextScale(scale);
                patchSettings.mutate({ textScale: scale });
              }}
              options={[
                { value: '1', label: t('textSizeNormal') },
                { value: '1.15', label: t('textSizeLarge') },
                { value: '1.3', label: t('textSizeLarger') },
                { value: '1.5', label: t('textSizeLargest') },
              ]}
            />
            {/* Previewed live on real content, per BDS §4.6. */}
            <p className="type-body-lg mt-3 rounded-md bg-surface-sunken p-4 text-text-primary">
              {t('textSizePreview')}
            </p>
          </div>

          <div>
            <RadioGroup
              name="numerals"
              legend={t('numerals')}
              value={preferences.numerals}
              onChange={(value) => {
                preferences.setNumerals(value as NumeralSystem);
                patchSettings.mutate({ numeralSystem: value });
              }}
              options={[
                { value: 'latin', label: t('numeralsLatin') },
                { value: 'bengali', label: t('numeralsBengali') },
              ]}
              helper={t('numeralsHelp')}
            />
          </div>
        </Card>
      </Section>

      {/* ------------------------------------------------- accessibility */}
      <Section title={t('accessibility')}>
        <Card padding="none" className="divide-y divide-stroke-subtle">
          <SwitchRow
            checked={preferences.reduceMotion}
            onChange={(value) => {
              preferences.setReduceMotion(value);
              patchSettings.mutate({ reduceMotion: value });
            }}
            label={t('reduceMotion')}
            description={t('reduceMotionBody')}
            onText={tc('on')}
            offText={tc('off')}
          />
          <SwitchRow
            checked={preferences.voiceEnabled}
            onChange={(value) => {
              preferences.setVoiceEnabled(value);
              patchSettings.mutate({ voiceEnabled: value });
            }}
            label={t('voiceEnabled')}
            onText={tc('on')}
            offText={tc('off')}
          />
        </Card>
      </Section>

      {/* ------------------------------------------------- notifications */}
      <Section title={t('notifications')}>
        <Card padding="none" className="divide-y divide-stroke-subtle">
          <SwitchRow
            checked={notify.notifyDeadlines}
            onChange={(value) => toggleNotify('notifyDeadlines', value)}
            label={t('notifyDeadlines')}
            onText={tc('on')}
            offText={tc('off')}
          />
          <SwitchRow
            checked={notify.notifyNewOpportunities}
            onChange={(value) => toggleNotify('notifyNewOpportunities', value)}
            label={t('notifyNew')}
            onText={tc('on')}
            offText={tc('off')}
          />
          <SwitchRow
            checked={notify.notifyProgramUpdates}
            onChange={(value) => toggleNotify('notifyProgramUpdates', value)}
            label={t('notifyUpdates')}
            onText={tc('on')}
            offText={tc('off')}
          />
          <SwitchRow
            checked={notify.notifyEmail}
            onChange={(value) => toggleNotify('notifyEmail', value)}
            label={t('notifyChannelEmail')}
            disabled={!emailAvailable}
            description={emailAvailable ? undefined : t('smsUnavailable')}
            onText={tc('on')}
            offText={tc('off')}
          />
          <SwitchRow
            checked={notify.notifySms}
            onChange={(value) => toggleNotify('notifySms', value)}
            label={t('notifyChannelSms')}
            disabled={!smsAvailable}
            description={smsAvailable ? undefined : t('smsUnavailable')}
            onText={tc('on')}
            offText={tc('off')}
          />
        </Card>
        {!smsAvailable ? (
          <Banner tone="info" statusWord={tc('appName')} className="mt-3">
            {t('smsUnavailable')}
          </Banner>
        ) : null}
      </Section>

      {/* --------------------------------------------------- devices */}
      <Section title={t('sessions')}>
        <Card padding="default" className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {sessions.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-start gap-3 rounded-md bg-surface-sunken px-3 py-2">
                <Smartphone size={20} className="icon mt-0.5 shrink-0 text-text-secondary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="type-body-md block truncate text-text-primary">
                    {s.userAgent?.slice(0, 60) ?? tc('unknown')}
                  </span>
                  <span className="type-caption block text-text-secondary">
                    {formatDate(new Date(s.createdAt), locale)}
                    {s.revokedAt ? ` · ${tc('expired')}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            loading={signOutEverywhere.isPending}
            loadingLabel={tc('loading')}
            onClick={() => signOutEverywhere.mutate()}
            leadingIcon={<LogOut size={20} className="icon" />}
          >
            {t('signOutEverywhere')}
          </Button>
        </Card>
      </Section>

      {/* --------------------------------------------------- privacy */}
      <Section title={t('privacy')}>
        <Card padding="default" className="flex flex-col gap-4">
          <InfoPanel title={t('exportData')}>{t('exportDataBody')}</InfoPanel>
          <Button
            variant="secondary"
            loading={exportData.isPending}
            loadingLabel={tc('loading')}
            onClick={() => exportData.mutate()}
            leadingIcon={<Download size={20} className="icon" />}
          >
            {t('exportData')}
          </Button>

          <hr className="border-stroke-subtle" />

          <div>
            <p className="type-label-lg text-text-error">{t('deleteAccount')}</p>
            <p className="type-body-md mt-1 text-text-secondary measure">{t('deleteAccountBody')}</p>
          </div>
          <Button
            variant="danger-subtle"
            onClick={() => setDeleteOpen(true)}
            leadingIcon={<Trash2 size={20} className="icon" />}
          >
            {t('deleteAccount')}
          </Button>
        </Card>
      </Section>

      {/* ------------------------------------------- delete confirmation */}
      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmText('');
        }}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmBody')}
        dismissible={!deleteAccount.isPending}
        footer={
          <div className="flex flex-col gap-3">
            {/* Safe option first and dominant — BDS §10.1.6. */}
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteOpen(false);
                setConfirmText('');
              }}
              disabled={deleteAccount.isPending}
            >
              {t('keepAccount')}
            </Button>
            <Button
              variant="danger"
              loading={deleteAccount.isPending}
              loadingLabel={t('deleting')}
              disabled={confirmText !== 'DELETE'}
              disabledReason={t('deleteConfirmLabel')}
              onClick={() => deleteAccount.mutate()}
            >
              {t('deleteConfirmButton')}
            </Button>
          </div>
        }
      >
        <TextField
          label={t('deleteConfirmLabel')}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          placeholder="DELETE"
        />
      </Dialog>
    </div>
  );
}

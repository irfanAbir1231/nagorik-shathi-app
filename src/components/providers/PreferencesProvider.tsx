'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import type { NumeralSystem, Theme, TextScale } from '@/lib/domain/enums';

/**
 * Presentation preferences — BDS §3.5, §3.6, §4.3, §4.6.
 *
 * These are deliberately CLIENT state applied to `<html>` rather than server
 * state baked into the markup, because a citizen changing text size or turning
 * on sunlight mode must see the effect instantly, on the screen they are
 * already on, with no navigation and no flash.
 *
 * They are also persisted to the server for signed-in users so the choice
 * survives a device change — an older citizen should not have to rediscover
 * the text-size setting on every phone.
 */

export interface Preferences {
  readonly theme: Theme;
  readonly textScale: TextScale;
  readonly numerals: NumeralSystem;
  readonly reduceMotion: boolean;
  readonly voiceEnabled: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  textScale: 1,
  // Latin by default even in Bangla UI — see BDS §4.3 rationale.
  numerals: 'latin',
  reduceMotion: false,
  voiceEnabled: true,
};

interface PreferencesContextValue extends Preferences {
  readonly locale: AppLocale;
  readonly setTheme: (theme: Theme) => void;
  readonly setTextScale: (scale: TextScale) => void;
  readonly setNumerals: (numerals: NumeralSystem) => void;
  readonly setReduceMotion: (value: boolean) => void;
  readonly setVoiceEnabled: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const STORAGE_KEY = 'shebar-janala.preferences';

function readStored(): Partial<Preferences> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
  } catch {
    return {};
  }
}

export function PreferencesProvider({
  children,
  initial,
}: {
  readonly children: ReactNode;
  /** Server-loaded settings for a signed-in citizen. */
  readonly initial?: Partial<Preferences>;
}) {
  const locale = useLocale() as AppLocale;
  const [preferences, setPreferences] = useState<Preferences>({ ...DEFAULT_PREFERENCES, ...initial });

  // Hydrate from localStorage after mount so SSR markup stays deterministic.
  useEffect(() => {
    const stored = readStored();
    if (Object.keys(stored).length > 0) {
      setPreferences((current) => ({ ...current, ...stored }));
    }
  }, []);

  // Apply to the document root. Doing this in one place means a new preference
  // cannot be half-wired by a component that forgot to read it.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.theme;
    root.style.setProperty('--bds-text-scale', String(preferences.textScale));
    root.dataset.reduceMotion = String(preferences.reduceMotion);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      /* Storage disabled (private mode / quota) — the session still works. */
    }
  }, [preferences]);

  const persist = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
    // Fire-and-forget: a failed sync must never block the visible change.
    void fetch('/api/v1/users/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => undefined);
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      ...preferences,
      locale,
      setTheme: (theme) => persist({ theme }),
      setTextScale: (textScale) => persist({ textScale }),
      setNumerals: (numerals) => persist({ numerals }),
      setReduceMotion: (reduceMotion) => persist({ reduceMotion }),
      setVoiceEnabled: (voiceEnabled) => persist({ voiceEnabled }),
    }),
    [preferences, locale, persist],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    // A sane fallback keeps isolated component tests and Storybook-style
    // renders working without wrapping every tree in a provider.
    return {
      ...DEFAULT_PREFERENCES,
      locale: 'bn',
      setTheme: () => undefined,
      setTextScale: () => undefined,
      setNumerals: () => undefined,
      setReduceMotion: () => undefined,
      setVoiceEnabled: () => undefined,
    };
  }
  return context;
}

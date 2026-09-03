import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter, Noto_Sans_Bengali, JetBrains_Mono } from 'next/font/google';
import { routing, LOCALE_TAGS, type AppLocale } from '@/i18n/routing';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { PreferencesProvider } from '@/components/providers/PreferencesProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getFullSession } from '@/lib/http/session';
import '../globals.css';

/**
 * Fonts — BDS §4.1 and §4.7.
 *
 * Self-hosted and subset by `next/font`, so no external font origin is needed
 * (the CSP in next.config.ts blocks one anyway). Only weights 400 and 600 are in
 * the critical path, per §4.7's budget.
 *
 * `adjustFontFallback` is left on so the metric-compensated fallback keeps the
 * swap under the 0.02 CLS budget §4.7 sets.
 *
 * NOTE: the first build fetches and caches these font files, so it needs
 * network access once. See docs/SETUP.md.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const bengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '600', '700'],
  variable: '--font-bengali',
  display: 'swap',
  preload: true,
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const active = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: active, namespace: 'common' });
  const landing = await getTranslations({ locale: active, namespace: 'landing' });

  return {
    title: {
      default: `${t('appName')} — ${t('tagline')}`,
      template: `%s · ${t('appName')}`,
    },
    description: landing('heroBody'),
    applicationName: t('appName'),
    icons: {
      icon: '/icon.png',
      apple: '/apple-icon.png',
    },
    formatDetection: { telephone: true, address: false, email: false },
    alternates: {
      languages: {
        'bn-BD': '/bn',
        'en-BD': '/en',
      },
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom is NEVER disabled. Blocking it fails WCAG 1.4.4 and removes the one
  // magnification tool an older citizen already knows how to use.
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0E7A5C' },
    { media: '(prefers-color-scheme: dark)', color: '#04241B' },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  // Server-loaded preferences prevent a flash of the wrong theme or text size
  // for a signed-in citizen who has chosen sunlight mode or larger text.
  const session = await getFullSession();
  const initialPreferences = session?.settings
    ? {
        theme: session.settings.theme,
        textScale: session.settings.textScale as 1 | 1.15 | 1.3 | 1.5,
        numerals: session.settings.numeralSystem,
        reduceMotion: session.settings.reduceMotion,
        voiceEnabled: session.settings.voiceEnabled,
      }
    : undefined;

  return (
    <html
      lang={LOCALE_TAGS[locale as AppLocale]}
      dir="ltr"
      data-theme={initialPreferences?.theme ?? 'light'}
      data-reduce-motion={String(initialPreferences?.reduceMotion ?? false)}
      style={{ ['--bds-text-scale' as string]: String(initialPreferences?.textScale ?? 1) }}
      suppressHydrationWarning
    >
      <body className={`${inter.variable} ${bengali.variable} ${mono.variable} font-body antialiased`}>
        <NextIntlClientProvider>
          <QueryProvider>
            <PreferencesProvider {...(initialPreferences ? { initial: initialPreferences } : {})}>
              <ToastProvider>{children}</ToastProvider>
            </PreferencesProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

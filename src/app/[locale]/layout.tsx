import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import localFont from 'next/font/local';
import { routing, LOCALE_TAGS, type AppLocale } from '@/i18n/routing';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { PreferencesProvider } from '@/components/providers/PreferencesProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getFullSession } from '@/lib/http/session';
import '../globals.css';

/**
 * Fonts — BDS §4.1 and §4.7.
 *
 * Bundled in `src/app/fonts/` and loaded with `next/font/local`, so the build needs
 * no network and no external font origin (the CSP in next.config.ts blocks one
 * anyway). They are the same Inter, Noto Sans Bengali and JetBrains Mono that
 * `next/font/google` used to download, subset to latin / bengali (SIL Open Font
 * License; see src/app/fonts/README.md). Only weights 400, 600 and 700 (500 for
 * the monospace) are used, per §4.7's budget.
 *
 * Why not `next/font/google`: it downloads the fonts during `next build` and parses
 * Google's response, which broke the Vercel build (`Cannot read properties of null
 * (reading '1')`) when Google answered the build server with font URLs that have no
 * file extension.
 *
 * `adjustFontFallback` keeps the swap under the 0.02 CLS budget §4.7 sets for the
 * Latin fonts. It is off for Bengali, where an Arial-based correction would be wrong.
 */
const inter = localFont({
  src: [{ path: '../fonts/inter-latin.woff2', weight: '400 700', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
});

const bengali = localFont({
  src: [{ path: '../fonts/noto-sans-bengali-bengali.woff2', weight: '400 700', style: 'normal' }],
  variable: '--font-bengali',
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
});

const mono = localFont({
  src: [{ path: '../fonts/jetbrains-mono-latin.woff2', weight: '500', style: 'normal' }],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
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

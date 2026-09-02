import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { UssdSimulator } from '@/components/ussd/UssdSimulator';

/**
 * SJ-23/48 — a public, no-login page on purpose: a real USSD caller has no
 * Shebar Janala account either. Sits outside the `(app)` group for the same
 * reason `/transparency` does. See src/app/api/v1/ussd/simulate/route.ts
 * for why this is safe to expose with no shared secret — it carries no
 * capability the real, secret-gated aggregator callback lacks.
 */
export default async function UssdDemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('ussdDemo');

  return (
    <div className="min-h-screen bg-surface-sunken">
      <header className="border-b border-stroke-subtle bg-surface">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-4 md:px-5">
          <div>
            <p className="type-label-lg text-text-brand">Shebar Janala</p>
            <h1 className="type-heading-lg text-text-primary">{t('title')}</h1>
          </div>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto flex max-w-content flex-col items-center gap-6 px-4 py-10 md:px-5">
        <p className="type-body-lg max-w-text text-center text-text-secondary">{t('subtitle')}</p>
        <UssdSimulator defaultPhone="01712345678" />
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ussdDemo' });
  return { title: t('title') };
}

export const dynamic = 'force-dynamic';

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ShieldCheck, ShieldAlert, Landmark, Flag, AlertTriangle } from 'lucide-react';
import { getPublicTransparencyData } from '@/modules/oversight/oversight.service';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { Card, Section } from '@/components/primitives/Card';
import { Num, Money } from '@/components/primitives/Money';

/**
 * SJ-37 — the public transparency surface. No session, no `(app)` shell:
 * this route sits directly under `[locale]/`, outside the auth-gated `(app)`
 * group, so the Anti-Corruption Commission, a journalist, or any citizen
 * with no Shebar Janala account at all can read it. Deliberately NOT a reuse of
 * the staff-only /admin dashboard — every number here has already been
 * vetted PII-safe by getPublicTransparencyData() (aggregate counts and
 * amounts, elected officials' names, never a citizen's name, NID, or phone).
 */
export default async function TransparencyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const bn = locale === 'bn';

  const t = await getTranslations('transparency');
  const data = await getPublicTransparencyData();

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

      <main className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:px-5">
        <p className="type-body-lg max-w-text text-text-secondary">{t('subtitle')}</p>

        <Card padding="default" className="flex items-start gap-3">
          {data.ledgerIntegrity.intact ? (
            <ShieldCheck size={28} className="icon mt-0.5 shrink-0 text-ramp-green-600" aria-hidden="true" />
          ) : (
            <ShieldAlert size={28} className="icon mt-0.5 shrink-0 text-ramp-error-600" aria-hidden="true" />
          )}
          <div>
            <p className="type-body-lg text-text-primary">
              {data.ledgerIntegrity.intact ? t('ledgerIntact') : t('ledgerBroken')}
            </p>
            <p className="type-caption mt-1 text-text-tertiary">
              <Num value={data.ledgerIntegrity.checked} /> {t('entriesVerified')}
            </p>
          </div>
        </Card>

        <Section title={t('unions')}>
          <ul className="flex flex-col gap-3">
            {data.unions.map((u) => (
              <li key={u.name}>
                <Card padding="default" className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="type-body-lg text-text-primary">{bn ? u.nameBn : u.name}</p>
                    <span className="type-caption text-text-tertiary">
                      {u.upazila}, {u.district}
                    </span>
                  </div>
                  <p className="type-caption text-text-secondary">
                    {t('chairman')}: {u.chairman ?? t('noChairman')}
                  </p>
                  <dl className="grid grid-cols-3 gap-3">
                    <div>
                      <dt className="type-caption text-text-tertiary">{t('allocations')}</dt>
                      <dd className="type-body-lg tabular text-text-primary">
                        <Money amount={u.allocationTotal} decimals={0} size="label" /> (<Num value={u.allocationCount} />)
                      </dd>
                    </div>
                    <div>
                      <dt className="type-caption flex items-center gap-1 text-text-tertiary">
                        <Flag size={14} className="icon" aria-hidden="true" />
                        {t('flagged')}
                      </dt>
                      <dd className="type-body-lg tabular text-text-primary">
                        <Num value={u.flaggedCount} />
                      </dd>
                    </div>
                    <div>
                      <dt className="type-caption flex items-center gap-1 text-text-tertiary">
                        <AlertTriangle size={14} className="icon" aria-hidden="true" />
                        {t('escalated')}
                      </dt>
                      <dd className="type-body-lg tabular text-text-primary">
                        <Num value={u.escalatedCount} />
                      </dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('programs')}>
          <ul className="flex flex-col gap-3">
            {data.programs.map((p) => (
              <li key={p.programCode}>
                <Card padding="default" className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Landmark size={20} className="icon shrink-0 text-text-brand" aria-hidden="true" />
                    <p className="type-body-lg text-text-primary">{p.programName}</p>
                  </div>
                  <div className="text-right">
                    <p className="type-caption text-text-tertiary">
                      {t('activeBeneficiaries')}: <Num value={p.activeBeneficiaries} />
                    </p>
                    <p className="type-body-md tabular text-text-primary">
                      {t('totalDisbursed')}: <Money amount={p.disbursedPaid} decimals={0} size="label" />
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('issueStatusBreakdown')}>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Object.entries(data.issues.byStatus).map(([status, count]) => (
              <div key={status} className="rounded-lg border border-stroke-subtle bg-surface p-4 shadow-elev-1">
                <dt className="type-caption capitalize text-text-secondary">{status.replace(/_/g, ' ')}</dt>
                <dd className="type-heading-md mt-1 tabular text-text-primary">
                  <Num value={count} />
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <p className="type-caption text-text-tertiary">
          {t('generatedAt')}: {new Date(data.generatedAt).toLocaleString(bn ? 'bn-BD' : 'en-US')}
        </p>
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'transparency' });
  return { title: t('title') };
}

export const dynamic = 'force-dynamic';

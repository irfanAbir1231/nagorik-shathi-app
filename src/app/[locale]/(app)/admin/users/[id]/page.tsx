import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Smartphone, Globe, HelpCircle } from 'lucide-react';
import { getFullSession, isStaff } from '@/lib/http/session';
import { HttpError } from '@/lib/http/response';
import { getUserDetail } from '@/modules/admin/users.service';
import { DISTRICTS } from '@/lib/domain/geography';
import { AdminNav } from '@/components/admin/AdminNav';
import { UserAdminPanel } from '@/components/admin/UserAdminPanel';
import { Card, Section } from '@/components/primitives/Card';
import { Badge } from '@/components/primitives/Chip';
import { Link } from '@/i18n/navigation';
import { formatTimeAgo } from '@/lib/format/dates';

/** One person: account, activity counts (never message text), devices, admin history, actions. */
export default async function AdminUserPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const lang = locale === 'bn' ? 'bn' : 'en';

  const session = await getFullSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isStaff(session.user.role)) redirect(`/${locale}/dashboard`);

  const p = await getTranslations('adminPortal');

  let detail: Awaited<ReturnType<typeof getUserDetail>>;
  try {
    detail = await getUserDetail(id);
  } catch (error) {
    if (error instanceof HttpError) notFound();
    throw error;
  }
  const { user, activity, sessions, history } = detail;
  const district = DISTRICTS.find((d) => d.code === user.district)?.[lang] ?? user.district ?? '—';
  const ClientIcon = { mobile: Smartphone, web: Globe, unknown: HelpCircle } as const;

  const facts: [string, string][] = [
    [p('user.phone'), user.phoneMasked],
    [p('users.district'), district],
    [p('users.language'), user.language === 'bn' ? p('users.bangla') : p('users.english')],
    [p('user.phoneVerified'), user.phoneVerifiedAt ? formatTimeAgo(user.phoneVerifiedAt, lang) : p('never')],
    [p('users.lastActive'), user.lastLoginAt ? formatTimeAgo(user.lastLoginAt, lang) : p('never')],
    [p('users.joined'), formatTimeAgo(user.createdAt, lang)],
    [p('user.failedAttempts'), String(user.failedPinAttempts)],
    ...(user.lockedUntil ? [[p('user.lockedUntil'), user.lockedUntil.toLocaleString(locale)] as [string, string]] : []),
  ];

  const counts: [string, string][] = [
    [p('user.saved'), String(activity.saved)],
    [p('user.plans'), `${activity.plans} (${activity.plansCompleted} ${p('user.plansDone')})`],
    [p('user.conversations'), String(activity.conversations)],
    [p('user.issues'), String(activity.issues)],
    [p('user.feedback'), String(activity.feedback)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="inline-flex min-h-12 items-center gap-1 type-label-md text-text-link underline">
        <ArrowLeft size={18} className="icon" aria-hidden="true" />
        {p('user.back')}
      </Link>

      <header className="flex flex-wrap items-center gap-2">
        <h1 className="type-heading-lg text-text-primary">{user.name}</h1>
        <Badge tone={user.role === 'citizen' ? 'neutral' : 'brand'}>{p(`role.${user.role}`)}</Badge>
        <Badge tone={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'warning' : 'error'}>
          {p(`status.${user.status}`)}
        </Badge>
      </header>

      <AdminNav />

      <Section title={p('user.actions')}>
        <UserAdminPanel
          user={{ id: user.id, name: user.name, role: user.role, status: user.status, locked: Boolean(user.lockedUntil) || user.failedPinAttempts > 0 }}
          viewerRole={session.user.role}
          isSelf={session.userId === user.id}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={p('user.account')}>
          <Card padding="default">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="type-body-md text-text-secondary">{k}</dt>
                  <dd className="type-body-md tabular text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </Section>

        <Section title={p('user.activity')}>
          <Card padding="default" className="flex flex-col gap-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              {counts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="type-body-md text-text-secondary">{k}</dt>
                  <dd className="type-body-md tabular text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="type-label-md text-text-secondary">{p('user.lifeEvents')}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {activity.lifeEvents.length === 0 ? (
                  <span className="type-body-md text-text-tertiary">{p('user.noneRecorded')}</span>
                ) : (
                  activity.lifeEvents.map((e) => <Badge key={e}>{p.has(`lifeEvent.${e}`) ? p(`lifeEvent.${e}`) : e}</Badge>)
                )}
              </div>
            </div>
            <p className="type-caption text-text-tertiary">{p('user.privateNote')}</p>
          </Card>
        </Section>
      </div>

      <Section title={p('user.sessions')}>
        {sessions.length === 0 ? (
          <p className="type-body-md text-text-tertiary">{p('user.noSessions')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => {
              const Icon = ClientIcon[s.client];
              return (
                <li key={s.id}>
                  <Card padding="compact" className="flex items-center gap-3">
                    <Icon size={20} className="icon shrink-0 text-text-secondary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="type-body-md text-text-primary">{p(`platform.${s.client}`)}</p>
                      <p className="type-caption truncate text-text-tertiary">{s.userAgent ?? '—'}</p>
                    </div>
                    <span className="type-caption text-text-secondary">{formatTimeAgo(s.createdAt, lang)}</span>
                    <Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? p('user.sessionActive') : p('user.sessionEnded')}</Badge>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={p('user.history')}>
        {history.length === 0 ? (
          <p className="type-body-md text-text-tertiary">{p('user.noHistory')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id}>
                <Card padding="compact" className="flex flex-col gap-1">
                  <p className="type-body-md text-text-primary">
                    <code>{h.action}</code>
                    {h.actorRole ? <span className="text-text-secondary"> · {p.has(`role.${h.actorRole}`) ? p(`role.${h.actorRole}`) : h.actorRole}</span> : null}
                  </p>
                  {typeof h.after?.reason === 'string' ? (
                    <p className="type-body-md text-text-secondary">“{h.after.reason}”</p>
                  ) : null}
                  <p className="type-caption text-text-tertiary">{formatTimeAgo(h.createdAt, lang)}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export const dynamic = 'force-dynamic';

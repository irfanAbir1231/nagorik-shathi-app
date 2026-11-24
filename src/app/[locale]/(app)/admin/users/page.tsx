import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, Smartphone, Globe } from 'lucide-react';
import { getFullSession, isStaff } from '@/lib/http/session';
import { listUsers, userListSchema } from '@/modules/admin/users.service';
import { CIVIC_ROLES, USER_ROLES, USER_STATUSES } from '@/lib/domain/enums';
import { DISTRICTS } from '@/lib/domain/geography';
import { AdminNav } from '@/components/admin/AdminNav';
import { NativeSelect, PlainInput } from '@/components/admin/AdminFields';
import { Card } from '@/components/primitives/Card';
import { Badge } from '@/components/primitives/Chip';
import { EmptyState } from '@/components/primitives/States';
import { Link } from '@/i18n/navigation';
import { formatTimeAgo } from '@/lib/format/dates';

/**
 * Users of the app and the website, in one list. Filters are a plain GET form,
 * so the page is server-rendered, shareable by URL and works without scripts.
 * Role changes and other actions are on each person's page.
 */
export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = locale === 'bn' ? 'bn' : 'en';

  const session = await getFullSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isStaff(session.user.role)) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('admin');
  const p = await getTranslations('adminPortal');

  const raw = await searchParams;
  const flat: Record<string, string> = Object.fromEntries(
    Object.entries(raw).flatMap(([k, v]) => (typeof v === 'string' && v !== '' ? [[k, v]] : [])),
  );
  const parsed = userListSchema.safeParse(flat);
  const result = await listUsers(parsed.success ? parsed.data : {});
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const pageHref = (page: number) => `/admin/users?${new URLSearchParams({ ...flat, page: String(page) }).toString()}`;
  const any = { value: '', label: p('any') };
  const districtName = (code: string | null) => {
    if (!code) return '—';
    const d = DISTRICTS.find((x) => x.code === code);
    return d ? d[lang] : code;
  };
  const districts = [...DISTRICTS].sort((a, b) => a.en.localeCompare(b.en));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="type-heading-lg text-text-primary">{t('users')}</h1>
        <p className="type-body-md text-text-secondary">{p('users.intro')}</p>
      </header>

      <AdminNav />

      <div className="flex flex-wrap gap-2">
        {USER_ROLES.filter((r) => result.roleCounts[r]).map((role) => (
          <Badge key={role} tone={role === 'citizen' ? 'neutral' : 'brand'}>
            {p(`role.${role}`)}: {result.roleCounts[role]}
          </Badge>
        ))}
      </div>

      <Card padding="default">
        <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PlainInput id="q" name="q" type="search" label={p('users.search')} defaultValue={flat.q ?? ''} className="sm:col-span-2" />
          <NativeSelect id="role" name="role" label={p('users.role')} defaultValue={flat.role ?? ''}
            options={[any, ...USER_ROLES.map((r) => ({ value: r, label: p(`role.${r}`) }))]} />
          <NativeSelect id="status" name="status" label={p('users.status')} defaultValue={flat.status ?? ''}
            options={[any, ...USER_STATUSES.map((s) => ({ value: s, label: p(`status.${s}`) }))]} />
          <NativeSelect id="platform" name="platform" label={p('users.platform')} defaultValue={flat.platform ?? ''}
            options={[any, { value: 'mobile', label: p('platform.mobile') }, { value: 'web', label: p('platform.web') }]} />
          <NativeSelect id="district" name="district" label={p('users.district')} defaultValue={flat.district ?? ''}
            options={[any, ...districts.map((d) => ({ value: d.code, label: d[lang] }))]} />
          <NativeSelect id="activeWithinDays" name="activeWithinDays" label={p('users.active')} defaultValue={flat.activeWithinDays ?? ''}
            options={[any, ...[7, 30, 90].map((d) => ({ value: String(d), label: p('users.days', { days: d }) }))]} />
          <NativeSelect id="civicRole" name="civicRole" label={t('civicRoles')} defaultValue={flat.civicRole ?? ''}
            options={[any, ...CIVIC_ROLES.filter((c) => c !== 'none').map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))]} />
          <NativeSelect id="language" name="language" label={p('users.language')} defaultValue={flat.language ?? ''}
            options={[any, { value: 'bn', label: p('users.bangla') }, { value: 'en', label: p('users.english') }]} />
          <NativeSelect id="sort" name="sort" label={p('users.sort')} defaultValue={flat.sort ?? 'newest'}
            options={[
              { value: 'newest', label: p('users.sortNewest') },
              { value: 'oldest', label: p('users.sortOldest') },
              { value: 'name', label: p('users.sortName') },
              { value: 'last_active', label: p('users.sortLastActive') },
            ]} />
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              className="inline-flex min-h-12 items-center rounded-pill bg-ramp-green-600 px-5 type-label-md text-text-on-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
            >
              {p('users.apply')}
            </button>
            <Link href="/admin/users" className="inline-flex min-h-12 items-center px-3 type-label-md text-text-link underline">
              {p('users.clear')}
            </Link>
          </div>
        </form>
      </Card>

      <p className="type-body-md tabular text-text-secondary" aria-live="polite">
        {p('users.total', { total: result.total })}
      </p>

      {result.items.length === 0 ? (
        <EmptyState title={p('users.empty')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {result.items.map((user) => (
            <li key={user.id}>
              <Card padding="default" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/users/${user.id}`} className="type-body-lg font-semibold text-text-link underline">
                      {user.name}
                    </Link>
                    <Badge tone={user.role === 'citizen' ? 'neutral' : 'brand'}>{p(`role.${user.role}`)}</Badge>
                    {user.status !== 'active' ? (
                      <Badge tone={user.status === 'suspended' ? 'warning' : 'error'}>{p(`status.${user.status}`)}</Badge>
                    ) : null}
                  </div>
                  <p className="type-body-md tabular text-text-secondary">
                    {user.phoneMasked} · {districtName(user.district)}
                  </p>
                  <p className="type-caption text-text-tertiary">
                    {p('users.lastActive')}: {user.lastLoginAt ? formatTimeAgo(user.lastLoginAt, lang) : p('never')} ·{' '}
                    {p('users.joined')}: {formatTimeAgo(user.createdAt, lang)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-text-secondary">
                  {user.platforms.includes('mobile') ? (
                    <span className="inline-flex items-center gap-1 type-caption">
                      <Smartphone size={16} className="icon" aria-hidden="true" />
                      {p('platform.mobile')}
                    </span>
                  ) : null}
                  {user.platforms.includes('web') ? (
                    <span className="inline-flex items-center gap-1 type-caption">
                      <Globe size={16} className="icon" aria-hidden="true" />
                      {p('platform.web')}
                    </span>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="flex items-center justify-between gap-2" aria-label={p('users.page', { page: result.page, pages })}>
          {result.page > 1 ? (
            <Link href={pageHref(result.page - 1)} className="inline-flex min-h-12 items-center gap-1 type-label-md text-text-link underline">
              <ChevronLeft size={18} className="icon" aria-hidden="true" />
              {p('users.previous')}
            </Link>
          ) : (
            <span />
          )}
          <span className="type-body-md tabular text-text-secondary">{p('users.page', { page: result.page, pages })}</span>
          {result.page < pages ? (
            <Link href={pageHref(result.page + 1)} className="inline-flex min-h-12 items-center gap-1 type-label-md text-text-link underline">
              {p('users.next')}
              <ChevronRight size={18} className="icon" aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

export const dynamic = 'force-dynamic';

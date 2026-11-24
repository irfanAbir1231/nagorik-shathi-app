'use client';

import { useTranslations } from 'next-intl';
import { LayoutDashboard, Database, Building2, Scale, MessageSquareWarning, Cpu, Users, Landmark, ShieldCheck, MessageSquare, Inbox, Globe } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';

/**
 * Admin section navigation.
 *
 * A horizontal scroller rather than a second sidebar: the citizen-facing sidebar
 * already occupies the left edge on desktop, and nesting two levels of vertical
 * navigation would breach BDS §79's three-level maximum.
 */
const ITEMS = [
  { href: '/admin', key: 'overview', icon: LayoutDashboard },
  { href: '/admin/candidates', key: 'navCandidates', icon: Inbox, portal: true },
  { href: '/admin/users', key: 'users', icon: Users },
  { href: '/admin/programmes', key: 'programmes', icon: Database },
  { href: '/admin/organisations', key: 'organizations', icon: Building2 },
  { href: '/admin/rules', key: 'rules', icon: Scale },
  { href: '/admin/moderation', key: 'moderation', icon: MessageSquareWarning },
  { href: '/admin/ai-logs', key: 'aiLogs', icon: Cpu },
  { href: '/admin/civic-roles', key: 'civicRoles', icon: Landmark },
  { href: '/admin/ledger', key: 'ledgerIntegrity', icon: ShieldCheck },
  { href: '/admin/sources', key: 'navSources', icon: Globe, portal: true },
  { href: '/admin/sms-outbox', key: 'smsOutbox', icon: MessageSquare },
] as const;

export function AdminNav() {
  const t = useTranslations('admin');
  const tp = useTranslations('adminPortal');
  const pathname = usePathname();

  return (
    <nav aria-label={t('title')} className="-mx-4 overflow-x-auto px-4 no-scrollbar md:-mx-5 md:px-5">
      <ul className="flex gap-2">
        {ITEMS.map((item) => {
          const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-pill px-4 type-label-md',
                  'border-[length:var(--bds-border-width-functional)] transition-colors duration-fast',
                  'focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2',
                  active
                    ? 'border-stroke-brand bg-surface-brand-subtle text-text-brand'
                    : 'border-stroke bg-surface text-text-primary hover:bg-surface-sunken',
                )}
              >
                <Icon size={18} className="icon shrink-0" aria-hidden="true" />
                {'portal' in item ? tp(item.key) : t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

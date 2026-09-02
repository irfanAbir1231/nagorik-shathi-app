'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  Home, MessageCircle, LayoutGrid, CalendarDays, Bookmark,
  Bell, User, Settings, Shield, MapPin, LogOut, HelpCircle, MessageSquareWarning, ShieldCheck,
  Landmark, HandCoins, ClipboardCheck, Users,
} from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { LocaleSwitcher } from './LocaleSwitcher';
import { VoiceButton } from '@/components/voice/VoiceButton';
import { VoiceSheet } from '@/components/voice/VoiceSheet';
import { useVoice, useVoiceActions } from '@/components/providers/VoiceProvider';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { TEXT_SCALES, type UserRole, type CivicRole } from '@/lib/domain/enums';

/**
 * App shell — BDS §5.3 and §57.
 *
 * Bottom navigation on mobile, sidebar on desktop. Five bottom-nav items
 * maximum (§1.1 law 12), and the hamburger menu is banned outright (§9.5) —
 * a first-time user does not recognise it, and it hides the entire information
 * architecture behind a glyph.
 *
 * The active item carries THREE redundant cues per §9.4: a filled icon, brand
 * text colour, and a 3 dp indicator. Filled-versus-outlined alone fails for
 * low-vision users.
 */

interface NavItem {
  readonly href: string;
  readonly labelKey: string;
  readonly icon: typeof Home;
  readonly badge?: number;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/dashboard', labelKey: 'home', icon: Home },
  { href: '/chat', labelKey: 'chat', icon: MessageCircle },
  { href: '/opportunities', labelKey: 'opportunities', icon: LayoutGrid },
  { href: '/timeline', labelKey: 'timeline', icon: CalendarDays },
  { href: '/saved', labelKey: 'saved', icon: Bookmark },
];

const SECONDARY_NAV: readonly NavItem[] = [
  { href: '/nearby', labelKey: 'nearby', icon: MapPin },
  { href: '/issues', labelKey: 'issues', icon: MessageSquareWarning },
  { href: '/budget', labelKey: 'budget', icon: Landmark },
  { href: '/entitlements', labelKey: 'entitlements', icon: HandCoins },
  { href: '/identity', labelKey: 'identity', icon: ShieldCheck },
  { href: '/notifications', labelKey: 'notifications', icon: Bell },
  { href: '/profile', labelKey: 'profile', icon: User },
  { href: '/settings', labelKey: 'settings', icon: Settings },
];

export interface AppShellProps {
  readonly children: ReactNode;
  readonly userName: string;
  readonly userRole: UserRole;
  /** Phase 3 civic title (SJ-31–34) — governs the "Officer" and "Leader" links. */
  readonly civicRole?: CivicRole;
  /** SJ-27 — true when this account represents a donor organisation. */
  readonly isDonor?: boolean;
  readonly unreadCount?: number;
  /** Page title for the mobile app bar. */
  readonly title?: string;
  /** Hide the bottom nav on immersive screens such as the chat composer. */
  readonly hideBottomNav?: boolean;
}

export function AppShell({
  children,
  userName,
  userRole,
  civicRole = 'none',
  isDonor = false,
  unreadCount = 0,
  title,
  hideBottomNav = false,
}: AppShellProps) {
  const t = useTranslations('nav');
  const tv = useTranslations('voice');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const voice = useVoice();
  const { textScale, setTextScale } = usePreferences();
  const { signOut } = useSignOut();

  /**
   * The actions that belong to the whole app rather than to one screen.
   *
   * Sign-out is here because it is the one action that must work from wherever
   * the citizen happens to be — including a screen they cannot read. It carries
   * `confirm: 'always'`, so it runs only after an explicit spoken yes, and on
   * failure the app says so out loud: a voice user never sees the sidebar
   * button's error line, and silently remaining signed in is exactly the outcome
   * they need told.
   *
   * Text size is here for the same reason, and its result is spoken for a
   * sharper one — the citizen asking for bigger text is the one least able to
   * read the screen that would have confirmed it.
   */
  const stepTextScale = (direction: 1 | -1) => {
    const index = TEXT_SCALES.indexOf(textScale);
    const next = TEXT_SCALES[index + direction];

    if (next === undefined) {
      voice.speak(direction === 1 ? tv('textSizeMax') : tv('textSizeMin'));
      return;
    }
    setTextScale(next);
    voice.speak(tv('textSizeNow', { percent: Math.round(next * 100) }));
  };

  useVoiceActions({
    'action.signOut': async () => {
      const ok = await signOut();
      if (!ok) voice.speak(tc('signOutFailed'));
    },
    'action.biggerText': () => stepTextScale(1),
    'action.smallerText': () => stepTextScale(-1),
  });

  const isStaff = userRole === 'moderator' || userRole === 'administrator' || userRole === 'super_admin';
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Keyboard users must be able to bypass the navigation. */}
      <a
        href="#main"
        className="sr-only-focusable absolute start-4 top-4 z-toast rounded-md bg-surface px-4 py-3 type-label-lg text-text-brand shadow-elev-3"
      >
        {t('skipToContent')}
      </a>

      {/* ---------- desktop sidebar ---------- */}
      <aside
        className="fixed inset-y-0 start-0 z-appbar hidden w-64 flex-col border-e border-stroke-subtle bg-surface lg:flex"
        aria-label={t('mainNavigation')}
      >
        <div className="flex h-appbar items-center gap-3 border-b border-stroke-subtle px-5">
          <BrandMark />
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActive(item.href)} label={t(item.labelKey)} />
            ))}
          </ul>

          <hr className="my-3 border-stroke-subtle" />

          <ul className="flex flex-col gap-1">
            {SECONDARY_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                label={t(item.labelKey)}
                badge={item.href === '/notifications' ? unreadCount : undefined}
              />
            ))}
            {civicRole === 'upazila_officer' ? (
              <SidebarLink
                item={{ href: '/officer', labelKey: 'officer', icon: ClipboardCheck }}
                active={isActive('/officer')}
                label={t('officer')}
              />
            ) : null}
            {civicRole !== 'none' ? (
              <SidebarLink
                item={{ href: '/leader', labelKey: 'leader', icon: Landmark }}
                active={isActive('/leader')}
                label={t('leader')}
              />
            ) : null}
            {civicRole === 'union_chairman' || civicRole === 'union_staff' ? (
              <SidebarLink
                item={{ href: '/beneficiaries', labelKey: 'beneficiaries', icon: Users }}
                active={isActive('/beneficiaries')}
                label={t('beneficiaries')}
              />
            ) : null}
            {isDonor ? (
              <SidebarLink
                item={{ href: '/donor', labelKey: 'donor', icon: HandCoins }}
                active={isActive('/donor')}
                label={t('donor')}
              />
            ) : null}
            {isStaff ? (
              <SidebarLink
                item={{ href: '/admin', labelKey: 'admin', icon: Shield }}
                active={isActive('/admin')}
                label={t('admin')}
              />
            ) : null}
          </ul>
        </nav>

        <div className="border-t border-stroke-subtle p-3">
          {/* Voice sits with navigation, not hidden in settings: it IS a way to
              navigate, and burying it makes it undiscoverable for the people who
              need it most. */}
          <VoiceButton className="mb-2 w-full" />
          <button
            type="button"
            onClick={voice.showHelp}
            className="mb-1 flex min-h-12 w-full items-center gap-3 rounded-md px-3 type-label-lg text-text-secondary hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
          >
            <HelpCircle size={24} className="icon shrink-0" aria-hidden="true" />
            {tv('helpTitle')}
          </button>
          <div className="flex items-center gap-3 px-2 py-2">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-brand-subtle type-label-md text-text-brand"
            >
              {userName.trim().charAt(0)}
            </span>
            <span className="type-body-md min-w-0 flex-1 truncate text-text-primary">{userName}</span>
          </div>
          <LocaleSwitcher className="mt-2" />
          <form action="/api/v1/auth/session" method="post" className="mt-1">
            <SignOutButton />
          </form>
        </div>
      </aside>

      {/* ---------- mobile app bar ---------- */}
      <header className="sticky top-0 z-appbar flex h-appbar items-center justify-between gap-3 border-b border-stroke-subtle bg-surface px-4 pt-safe lg:hidden">
        {title ? (
          <h1 className="type-heading-sm min-w-0 flex-1 truncate text-text-primary">{title}</h1>
        ) : (
          <BrandMark />
        )}
        <div className="flex shrink-0 items-center gap-1">
          <LocaleSwitcher compact />
          <Link
            href="/notifications"
            aria-label={`${t('notifications')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-pill text-text-primary hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2"
          >
            <Bell size={24} className="icon" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute end-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-pill bg-ramp-error-600 px-1 type-caption tabular text-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      {/* ---------- main ---------- */}
      <main
        id="main"
        className={cn(
          'mx-auto w-full max-w-content px-4 py-5 lg:ps-72 lg:pe-8 md:px-5',
          hideBottomNav ? 'pb-4' : 'pb-24 lg:pb-8',
        )}
      >
        {children}
      </main>

      {/**
       * Mobile microphone.
       *
       * Floating above the bottom navigation rather than inside it: the bottom bar
       * is capped at five items (BDS §1.1 law 12), and a sixth squeezed in would
       * shrink every target below the 48 dp minimum. Positioned clear of the nav
       * and the safe-area inset so a thumb cannot hit both at once.
       */}
      <div
        className={cn(
          'fixed inset-x-0 z-appbar flex justify-center px-4 lg:hidden',
          hideBottomNav ? 'bottom-4 pb-safe' : 'bottom-bottomnav mb-3 pb-safe',
        )}
      >
        <VoiceButton />
      </div>

      {/* Listening, confirmation, correction, error and help surfaces. */}
      <VoiceSheet />

      {/* ---------- mobile bottom nav ---------- */}
      {hideBottomNav ? null : (
        <nav
          aria-label={t('mainNavigation')}
          className="fixed inset-x-0 bottom-0 z-appbar border-t border-stroke-subtle bg-surface pb-safe lg:hidden"
        >
          <ul className="flex h-bottomnav items-stretch">
            {PRIMARY_NAV.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex h-full flex-col items-center justify-center gap-1 px-1',
                      'focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-[-3px]',
                      active ? 'text-text-brand' : 'text-text-secondary',
                    )}
                  >
                    {/* Cue 3: the indicator bar. */}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-4 top-0 rounded-pill bg-ramp-green-600"
                        style={{ height: 3 }}
                      />
                    ) : null}
                    <Icon
                      size={24}
                      className="icon"
                      aria-hidden="true"
                      // Cue 1: the icon fills when active.
                      {...(active ? { fill: 'currentColor', strokeWidth: 1.5 } : {})}
                    />
                    {/* Cue 2: a visible label, always. Never icon-only. */}
                    <span className="type-label-md text-center leading-tight">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

function BrandMark() {
  const t = useTranslations('common');
  return (
    <Link href="/dashboard" className="flex items-center rounded-md focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt={t('appName')} className="h-14 w-auto" />
    </Link>
  );
}

function SidebarLink({
  item,
  active,
  label,
  badge,
}: {
  readonly item: NavItem;
  readonly active: boolean;
  readonly label: string;
  readonly badge?: number;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-12 items-center gap-3 rounded-md px-3 type-label-lg',
          'transition-colors duration-fast ease-standard',
          'focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2',
          active
            ? 'bg-surface-brand-subtle text-text-brand'
            : 'text-text-primary hover:bg-surface-sunken active:bg-ramp-neutral-100',
        )}
      >
        <Icon
          size={24}
          className="icon shrink-0"
          aria-hidden="true"
          {...(active ? { fill: 'currentColor', strokeWidth: 1.5 } : {})}
        />
        <span className="min-w-0 flex-1">{label}</span>
        {badge && badge > 0 ? (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-pill bg-ramp-error-600 px-1.5 type-caption tabular text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/**
 * Ending the session — shared by the sidebar button and the voice command.
 *
 * Two details are deliberate. The redirect is a FULL page load, not a
 * client-side push: it discards the React Query cache along with the cookie, so
 * the next person to pick up a shared phone cannot press Back and read the
 * previous citizen's income, disability status or benefit history out of memory.
 *
 * And a failed revocation does NOT redirect. Landing on the public home page
 * looks exactly like success while the cookie is still live — the most
 * dangerous possible outcome on a shared device. Better to stay put and report
 * the failure than to imply a safety that does not exist.
 */
function useSignOut() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = useCallback(async () => {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch('/api/v1/auth/session', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`sign out ${response.status}`);
      window.location.href = '/';
      return true;
    } catch {
      setPending(false);
      setFailed(true);
      return false;
    }
  }, []);

  return { signOut, pending, failed };
}

function SignOutButton() {
  const t = useTranslations('common');
  const { signOut, pending, failed } = useSignOut();

  return (
    <>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={pending}
        className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 type-label-lg text-text-secondary hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2 disabled:opacity-60"
      >
        <LogOut size={24} className="icon shrink-0" aria-hidden="true" />
        {t('signOut')}
      </button>
      {failed ? (
        <p role="alert" className="px-3 pt-1 type-caption text-text-error">
          {t('signOutFailed')}
        </p>
      ) : null}
    </>
  );
}

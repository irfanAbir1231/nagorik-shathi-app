/**
 * Small, pure helpers for the user-management screens.
 */

/** "01712345678" → "017•••••678". Lists show this; the full number is an audited reveal. */
export function maskPhone(phone: string): string {
  if (phone.length <= 6) return '•'.repeat(phone.length);
  return `${phone.slice(0, 3)}${'•'.repeat(phone.length - 6)}${phone.slice(-3)}`;
}

export type ClientKind = 'mobile' | 'web' | 'unknown';

/**
 * Which client a session came from. The Flutter app sends Dart's default user
 * agent ("Dart/3.x (dart:io)"); anything else with a user agent is a browser.
 */
export function clientFromUserAgent(userAgent: string | null | undefined): ClientKind {
  if (!userAgent) return 'unknown';
  return /^Dart\//.test(userAgent) ? 'mobile' : 'web';
}

/** SQL LIKE pattern matching the mobile client's user agent (see clientFromUserAgent). */
export const MOBILE_USER_AGENT_LIKE = 'Dart/%';

export const USER_SORTS = ['newest', 'oldest', 'name', 'last_active'] as const;
export type UserSort = (typeof USER_SORTS)[number];

/** Clamps paging input to safe bounds. */
export function pageWindow(page: number | undefined, pageSize: number | undefined): { page: number; pageSize: number; offset: number } {
  const size = Math.min(100, Math.max(10, Math.floor(pageSize ?? 25)));
  const p = Math.max(1, Math.floor(page ?? 1));
  return { page: p, pageSize: size, offset: (p - 1) * size };
}

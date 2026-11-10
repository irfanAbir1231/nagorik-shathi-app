import type { NextResponse } from 'next/server';
import { ACCESS_TTL_SECONDS } from '@/lib/security/tokens';
import { setAuthCookies } from './cookies';

/**
 * Native-client (Flutter) auth support.
 *
 * Browsers keep the tokens in httpOnly cookies, so no script can read them. A
 * native app has no cookie jar worth trusting and must hold the tokens itself,
 * so it needs them in the response body. That would be a regression for the web
 * if it applied to everyone, so it is strictly opt-in: only a request carrying
 * `X-Client: mobile` receives tokens in the body, and such a request is not
 * given cookies. A browser never sends that header on its own, and a page on
 * another origin cannot add it to a credentialed request without a CORS
 * preflight this app does not grant.
 */

export const MOBILE_CLIENT_HEADER = 'x-client';
export const MOBILE_CLIENT_VALUE = 'mobile';

export function isMobileClient(request: Request): boolean {
  return request.headers.get(MOBILE_CLIENT_HEADER)?.toLowerCase() === MOBILE_CLIENT_VALUE;
}

/** Extracts the token from an `Authorization: Bearer <token>` header value. */
export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1]! : null;
}

export interface MobileTokenBody {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Seconds until the access token expires. */
  readonly expiresIn: number;
}

/** Spread into a response's `data`: empty for browsers, the token pair for mobile. */
export function mobileTokens(
  request: Request,
  tokens: { accessToken: string; refreshToken: string },
): Partial<MobileTokenBody> {
  if (!isMobileClient(request)) return {};
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: ACCESS_TTL_SECONDS,
  };
}

/** Sets cookies for browsers; mobile clients carry the tokens themselves. */
export function setAuthCookiesUnlessMobile(
  response: NextResponse,
  request: Request,
  tokens: { accessToken: string; refreshToken: string },
): void {
  if (isMobileClient(request)) return;
  setAuthCookies(response, tokens);
}

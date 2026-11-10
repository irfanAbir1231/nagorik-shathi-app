import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ok, handle, fail, ERROR_CODES } from '@/lib/http/response';
import { rethrowUnlessAuth } from '@/lib/http/auth-errors';
import { clearAuthCookies, COOKIE_NAMES } from '@/lib/http/cookies';
import { isMobileClient, mobileTokens, setAuthCookiesUnlessMobile } from '@/lib/http/mobile';
import { clientIp } from '@/lib/http/rate-limit';
import { getFullSession } from '@/lib/http/session';
import { refresh, logout } from '@/modules/auth/auth.service';
import { describeAiMode } from '@/modules/ai/providers';
import { profileCompleteness } from '@/modules/eligibility/profile-mapper';
import { toEligibilityProfile } from '@/modules/eligibility/profile-mapper';

/**
 * GET    /api/v1/auth/session — who am I (also reports the active AI engine)
 * PUT    /api/v1/auth/session — rotate the refresh token
 * DELETE /api/v1/auth/session — sign out
 */

/**
 * Native clients have no refresh cookie, so they send the token in the body.
 * Honoured only with `X-Client: mobile`; a browser's refresh stays cookie-only.
 */
async function bodyRefreshToken(request: NextRequest): Promise<string | null> {
  if (!isMobileClient(request)) return null;
  try {
    const body = (await request.json()) as { refreshToken?: unknown };
    return typeof body.refreshToken === 'string' && body.refreshToken.length > 0 ? body.refreshToken : null;
  } catch {
    return null;
  }
}

export async function GET() {
  return handle(async () => {
    const session = await getFullSession();
    if (!session) {
      // Not an error condition: the landing page asks this on every load.
      return ok({ authenticated: false, ai: describeAiMode() });
    }

    const profile = toEligibilityProfile({ user: session.user, profile: session.profile });

    return ok({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        phone: session.user.phone,
        email: session.user.email,
        role: session.user.role,
        language: session.user.language,
        district: session.user.district,
        hasPin: Boolean(session.user.pinHash),
        phoneVerified: Boolean(session.user.phoneVerifiedAt),
      },
      settings: session.settings,
      profileCompleteness: profileCompleteness(profile),
      ai: describeAiMode(),
    });
  }, 'auth/session:get');
}

export async function PUT(request: NextRequest) {
  return handle(async () => {
    const store = await cookies();
    const token = store.get(COOKIE_NAMES.refresh)?.value ?? (await bodyRefreshToken(request));
    if (!token) {
      return fail(ERROR_CODES.UNAUTHENTICATED, 'Your session has expired. Please sign in again.');
    }
    try {
      const result = await refresh(token, request.headers.get('user-agent') ?? undefined, clientIp(request));
      const response = ok({ user: result.user, ...mobileTokens(request, result) });
      setAuthCookiesUnlessMobile(response, request, result);
      return response;
    } catch (error) {
      const mapped = rethrowUnlessAuth(error);
      // A failed refresh must also clear the cookies, or the client retries
      // forever with a token that can never succeed.
      clearAuthCookies(mapped);
      return mapped;
    }
  }, 'auth/session:put');
}

export async function DELETE(request: NextRequest) {
  return handle(async () => {
    const store = await cookies();
    const token = store.get(COOKIE_NAMES.refresh)?.value ?? (await bodyRefreshToken(request));
    const session = await getFullSession();
    await logout(token, session?.userId ?? null);

    const response = ok({ signedOut: true });
    clearAuthCookies(response);
    return response;
  }, 'auth/session:delete');
}

export const dynamic = 'force-dynamic';

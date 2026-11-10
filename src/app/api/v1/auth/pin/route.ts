import type { NextRequest } from 'next/server';
import { ok, readJson, handle } from '@/lib/http/response';
import { guardRateLimit, clientIp } from '@/lib/http/rate-limit';
import { rethrowUnlessAuth } from '@/lib/http/auth-errors';
import { mobileTokens, setAuthCookiesUnlessMobile } from '@/lib/http/mobile';
import { setPinSchema } from '@/lib/validation/schemas';
import { verifyOtp, setPin, loginWithOtp } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/pin — reset a forgotten PIN.
 *
 * Requires a fresh `reset_pin` OTP, then signs the citizen in, because being
 * bounced back to a sign-in screen immediately after proving ownership of the
 * number is a needless dead end.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const limited = await guardRateLimit(request, 'auth');
    if (!limited.ok) return limited.response;

    const body = setPinSchema.parse(await readJson(request));

    try {
      await verifyOtp(body.phone, body.code, 'reset_pin');
      const result = await loginWithOtp({
        phone: body.phone,
        userAgent: request.headers.get('user-agent') ?? undefined,
        ip: clientIp(request),
      });
      await setPin(result.user.id, body.pin);

      const response = ok({ user: { ...result.user, hasPin: true }, pinUpdated: true, ...mobileTokens(request, result) });
      setAuthCookiesUnlessMobile(response, request, result);
      return response;
    } catch (error) {
      return rethrowUnlessAuth(error);
    }
  }, 'auth/pin');
}

export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { ok, readJson, handle } from '@/lib/http/response';
import { guardRateLimit, clientIp } from '@/lib/http/rate-limit';
import { rethrowUnlessAuth } from '@/lib/http/auth-errors';
import { mobileTokens, setAuthCookiesUnlessMobile } from '@/lib/http/mobile';
import { loginSchema, loginOtpSchema } from '@/lib/validation/schemas';
import { loginWithPin, loginWithOtp, verifyOtp } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/login
 *
 * Two shapes on one endpoint:
 *   { phone, pin }   — the normal path
 *   { phone, code }  — OTP sign-in, used when the PIN is forgotten or the
 *                      account is temporarily locked. BDS §10.2.5 requires a
 *                      recovery route that is not punitive.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const limited = await guardRateLimit(request, 'auth');
    if (!limited.ok) return limited.response;

    const raw = (await readJson(request)) as Record<string, unknown>;
    const userAgent = request.headers.get('user-agent') ?? undefined;
    const ip = clientIp(request);

    try {
      if (typeof raw.code === 'string' && raw.code.length > 0) {
        const body = loginOtpSchema.parse(raw);
        await verifyOtp(body.phone, body.code, 'login');
        const result = await loginWithOtp({ phone: body.phone, userAgent, ip });
        const response = ok({ user: result.user, method: 'otp', ...mobileTokens(request, result) });
        setAuthCookiesUnlessMobile(response, request, result);
        return response;
      }

      const body = loginSchema.parse(raw);
      const result = await loginWithPin({ phone: body.phone, pin: body.pin, userAgent, ip });
      const response = ok({ user: result.user, method: 'pin', ...mobileTokens(request, result) });
      setAuthCookiesUnlessMobile(response, request, result);
      return response;
    } catch (error) {
      return rethrowUnlessAuth(error);
    }
  }, 'auth/login');
}

export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { ok, readJson, handle } from '@/lib/http/response';
import { guardRateLimit, clientIp } from '@/lib/http/rate-limit';
import { rethrowUnlessAuth } from '@/lib/http/auth-errors';
import { mobileTokens, setAuthCookiesUnlessMobile } from '@/lib/http/mobile';
import { registerSchema } from '@/lib/validation/schemas';
import { register, verifyOtp } from '@/modules/auth/auth.service';

/**
 * POST /api/v1/auth/register
 *
 * The OTP is verified and the account created in one request. Splitting them
 * would leave a window in which a verified phone has no account, and would let a
 * citizen who closes the app between steps lose their verification.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const limited = await guardRateLimit(request, 'auth');
    if (!limited.ok) return limited.response;

    const body = registerSchema.parse(await readJson(request));

    try {
      await verifyOtp(body.phone, body.code, 'register');
      const result = await register({
        phone: body.phone,
        name: body.name,
        pin: body.pin,
        language: body.language,
        district: body.district ?? null,
        email: body.email ?? null,
        userAgent: request.headers.get('user-agent') ?? undefined,
        ip: clientIp(request),
      });

      const response = ok({ user: result.user, ...mobileTokens(request, result) }, { status: 201 });
      setAuthCookiesUnlessMobile(response, request, result);
      return response;
    } catch (error) {
      return rethrowUnlessAuth(error);
    }
  }, 'auth/register');
}

export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, readJson, handle } from '@/lib/http/response';
import { normalisePhone } from '@/lib/format/numerals';
import { handleUssdCallback } from '@/modules/ussd/ussd.service';

/**
 * POST /api/v1/ussd/simulate — the in-browser phone simulator's transport,
 * distinct from POST /api/v1/ussd/callback on purpose.
 *
 * The real callback route is gated by `USSD_GATEWAY_SECRET` because its
 * caller claims to be a telecom aggregator, and that claim needs proving.
 * This route makes no such claim — it is first-party, same-origin UI calling
 * the exact same `handleUssdCallback()` service function the real callback
 * calls, so there is nothing to authenticate that the underlying function
 * does not already enforce itself (residency verification before an issue
 * can be filed, etc.). No session is required either: a real USSD caller
 * has no Shebar Janala account to log into, and the simulator should not require
 * one a real caller wouldn't have.
 *
 * Returns JSON, not the raw `CON`/`END`-prefixed plain text the real
 * aggregator contract expects — this is consumed by the React UI in
 * components/ussd/UssdSimulator.tsx, not a telecom gateway.
 */

const bodySchema = z.object({
  sessionId: z.string().min(1),
  phoneNumber: z.string().min(1),
  text: z.string().default(''),
});

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = bodySchema.parse(await readJson(request));
    const phone = normalisePhone(body.phoneNumber) ?? body.phoneNumber;
    const result = await handleUssdCallback({ sessionId: body.sessionId, phone, text: body.text });
    return ok(result);
  }, 'ussd/simulate:post');
}

export const dynamic = 'force-dynamic';

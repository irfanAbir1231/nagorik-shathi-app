import { ok, handle } from '@/lib/http/response';
import { getPublicTransparencyData } from '@/modules/oversight/oversight.service';

/**
 * GET /api/v1/public/transparency — SJ-37. Deliberately NO session guard: this
 * is the one route in the app meant for the Anti-Corruption Commission,
 * journalists, or any citizen with no Shebar Janala account at all. Every field
 * `getPublicTransparencyData` returns has already been vetted as PII-safe —
 * see the doc comment on that function.
 */
export async function GET() {
  return handle(async () => {
    const data = await getPublicTransparencyData();
    return ok(data);
  }, 'public/transparency:get');
}

export const dynamic = 'force-dynamic';

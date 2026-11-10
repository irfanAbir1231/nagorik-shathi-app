import type { NextRequest } from 'next/server';
import { ok, readJson, handle, fail, ERROR_CODES } from '@/lib/http/response';
import { requireSession } from '@/lib/http/session';
import { guardRateLimit } from '@/lib/http/rate-limit';
import { chatSchema } from '@/lib/validation/schemas';
import { runTurn, listConversations } from '@/modules/ai/conversation.service';
import { describeAiMode } from '@/modules/ai/providers';

/**
 * POST /api/v1/chat — one conversation turn.
 * GET  /api/v1/chat — the citizen's conversation list.
 *
 * The AI rate-limit scope is separate and much tighter than the default,
 * because a model call is the most expensive operation in the system
 * (PRD §128, "High API costs").
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const guard = await requireSession();
    if (!guard.ok) return guard.response;

    const limited = await guardRateLimit(request, 'ai', guard.session.userId);
    if (!limited.ok) return limited.response;

    const body = chatSchema.parse(await readJson(request));

    // A hung provider must not hold the request open indefinitely; 45 s is
    // generous for a 3 s target and still bounded.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const result = await runTurn({
        userId: guard.session.userId,
        conversationId: body.conversationId ?? null,
        message: body.message,
        ...(body.locale ? { localeHint: body.locale } : {}),
        signal: controller.signal,
      });

      return ok(
        {
          conversationId: result.conversationId,
          userMessage: result.userMessage,
          assistantMessage: result.assistantMessage,
          plan: result.plan,
          understanding: {
            locale: result.nlu.locale,
            intents: result.nlu.intents,
            lifeEvents: result.nlu.lifeEvents,
            extractedFields: result.nlu.entities.fields,
            confidence: result.nlu.confidence,
          },
          profileUpdated: result.profileUpdated,
          engine: result.engine,
          degraded: result.degraded,
          renderPath: result.renderPath,
          semanticEngine: result.civicFrame.engine,
        },
        { meta: { latencyMs: result.latencyMs, ai: describeAiMode() } },
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return fail(
          ERROR_CODES.AI_UNAVAILABLE,
          'That took too long to answer. Please try again — your message was not lost.',
          { status: 504 },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }, 'chat:post');
}

export async function GET() {
  return handle(async () => {
    const guard = await requireSession();
    if (!guard.ok) return guard.response;
    const items = await listConversations(guard.session.userId);
    return ok({ conversations: items, ai: describeAiMode() });
  }, 'chat:get');
}

export const dynamic = 'force-dynamic';
// A turn is normally a few seconds, but the handler allows a slow model up to 45 s.
// Serverless hosts cut a function off at their own default (10 s on some plans), so
// say how long this one may run. Ignored by `next start`.
export const maxDuration = 30;

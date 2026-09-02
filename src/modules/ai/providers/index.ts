import { env, resolveAiMode, type AiMode } from '@/lib/config/env';
import { postJson, ProviderError, type LlmProvider, type GenerateInput, type GenerateResult, type EmbedResult } from './types';

/**
 * Provider resolution.
 *
 * `resolveAiMode()` reads the environment once. The returned provider's
 * `engine` is written to every `ai_logs` row and surfaced in the UI, so a
 * citizen and an auditor can always tell which engine produced an answer.
 */

/* ----------------------------------------------------------- Anthropic */

class AnthropicProvider implements LlmProvider {
  readonly engine = 'anthropic' as const;
  readonly model = env.ANTHROPIC_MODEL;
  readonly isLive = true;

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const started = Date.now();
    const payload = await postJson(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.model,
        max_tokens: input.maxTokens ?? 900,
        temperature: input.temperature ?? 0.3,
        system: input.system,
        messages: [{ role: 'user', content: input.user }],
      },
      {
        'x-api-key': env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      { signal: input.signal, timeoutMs: 30_000, retries: 1 },
    );

    const response = payload as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (response.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
      .trim();

    if (!text) throw new ProviderError('Anthropic returned no text content');

    return {
      text,
      engine: this.engine,
      model: this.model,
      tokensIn: response.usage?.input_tokens ?? 0,
      tokensOut: response.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }

  // Anthropic has no embeddings endpoint; the retriever falls back to BM25.
}

/* -------------------------------------------------------------- OpenAI */

class OpenAiProvider implements LlmProvider {
  readonly engine = 'openai' as const;
  readonly model = env.OPENAI_MODEL;
  readonly isLive = true;

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const started = Date.now();
    const payload = await postJson(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        max_tokens: input.maxTokens ?? 900,
        temperature: input.temperature ?? 0.3,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user },
        ],
      },
      { Authorization: `Bearer ${env.OPENAI_API_KEY ?? ''}` },
      { signal: input.signal, timeoutMs: 30_000, retries: 1 },
    );

    const response = payload as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = (response.choices?.[0]?.message?.content ?? '').trim();
    if (!text) throw new ProviderError('OpenAI returned no text content');

    return {
      text,
      engine: this.engine,
      model: this.model,
      tokensIn: response.usage?.prompt_tokens ?? 0,
      tokensOut: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }

  async embed(texts: readonly string[]): Promise<EmbedResult | null> {
    if (!env.OPENAI_API_KEY) return null;
    const payload = await postJson(
      'https://api.openai.com/v1/embeddings',
      { model: env.OPENAI_EMBEDDING_MODEL, input: [...texts] },
      { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      { timeoutMs: 60_000, retries: 1 },
    );
    const response = payload as { data?: { embedding: number[] }[] };
    const vectors = (response.data ?? []).map((d) => d.embedding);
    if (vectors.length === 0) return null;
    return { vectors, model: env.OPENAI_EMBEDDING_MODEL, engine: 'openai' };
  }
}

/* ------------------------------------------------------------ DeepSeek */

/**
 * DeepSeek, over its OpenAI-compatible `/chat/completions` endpoint.
 *
 * REASONING IS DELIBERATELY OFF, by two independent measures — one asks the
 * server, the other does not trust the answer:
 *
 *  1. `thinking: { type: 'disabled' }` is sent on every request. This is the
 *     parameter the API actually honours; it was verified against the live
 *     endpoint, which accepts only `adaptive` | `enabled` | `disabled` and
 *     defaults to `adaptive`. Note that `reasoning_effort: 'none'` is a 400 —
 *     the valid efforts are low…max, and none of them means "off".
 *  2. Any `reasoning_content` that arrives anyway is dropped here and never
 *     reaches the response, the `ai_logs` row, or the citizen. A chain of
 *     thought is a draft: it contains discarded hypotheses phrased as
 *     statements, and putting one next to a benefits decision would present
 *     rejected reasoning as advice.
 *
 * If a trace does arrive it means the setting was overridden or the API changed,
 * so it is reported once as a warning — silently paying for tokens the product
 * throws away is a cost bug worth knowing about.
 */
class DeepSeekProvider implements LlmProvider {
  readonly engine = 'deepseek' as const;
  readonly model = env.DEEPSEEK_MODEL;
  readonly isLive = true;

  /** Warn once per process, not once per request. */
  private static warnedAboutReasoning = false;

  private extraBody(): Record<string, unknown> {
    if (!env.DEEPSEEK_EXTRA_BODY) return {};
    try {
      const parsed: unknown = JSON.parse(env.DEEPSEEK_EXTRA_BODY);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      // Reported at startup by `aiConfigProblems()`; ignored here so a typo in
      // an optional tuning field cannot take the chat feature down.
      return {};
    }
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const started = Date.now();
    const payload = await postJson(
      `${env.DEEPSEEK_BASE_URL.replace(/\/+$/, '')}/chat/completions`,
      {
        model: this.model,
        max_tokens: input.maxTokens ?? 900,
        temperature: input.temperature ?? 0.3,
        stream: false,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user },
        ],
        thinking: { type: env.DEEPSEEK_THINKING },
        // Sent only when it can have an effect: with thinking disabled the API
        // has nothing to apply an effort level to.
        ...(env.DEEPSEEK_THINKING !== 'disabled' && env.DEEPSEEK_REASONING_EFFORT
          ? { reasoning_effort: env.DEEPSEEK_REASONING_EFFORT }
          : {}),
        // Last, so an operator can override anything above if the API changes.
        ...this.extraBody(),
      },
      { Authorization: `Bearer ${env.DEEPSEEK_API_KEY ?? ''}` },
      { signal: input.signal, timeoutMs: 30_000, retries: 1 },
    );

    const response = payload as {
      choices?: {
        message?: { content?: string; reasoning_content?: string };
        finish_reason?: string;
      }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        completion_tokens_details?: { reasoning_tokens?: number };
      };
    };

    const choice = response.choices?.[0];
    const text = (choice?.message?.content ?? '').trim();

    const reasoningTokens = response.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
    const hadTrace = Boolean(choice?.message?.reasoning_content) || reasoningTokens > 0;
    if (hadTrace && !DeepSeekProvider.warnedAboutReasoning) {
      DeepSeekProvider.warnedAboutReasoning = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[ai] Model "${this.model}" returned a reasoning trace (${reasoningTokens} reasoning tokens) ` +
          `despite DEEPSEEK_THINKING="${env.DEEPSEEK_THINKING}". It has been discarded and is never ` +
          'shown or stored, but you are paying for it — check DEEPSEEK_EXTRA_BODY for an override.',
      );
    }

    if (!text) {
      // A thinking model that hits max_tokens mid-trace returns an EMPTY content
      // field, which would otherwise look like a provider outage. Say what it was.
      throw new ProviderError(
        hadTrace
          ? `DeepSeek returned only a reasoning trace and no answer (finish_reason: ${choice?.finish_reason ?? 'unknown'}). Set DEEPSEEK_THINKING=disabled.`
          : 'DeepSeek returned no text content',
      );
    }

    return {
      text,
      engine: this.engine,
      model: this.model,
      tokensIn: response.usage?.prompt_tokens ?? 0,
      tokensOut: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }

  // DeepSeek has no embeddings endpoint, so `embed` is deliberately absent and
  // retrieval stays lexical. See docs/EXTERNAL.md §3 — an embedding provider is
  // a separate credential from the chat provider.
}

/* ----------------------------------------------------------- Simulated */

/**
 * The deterministic provider.
 *
 * It does NOT attempt to interpret the prompt strings — that would be a
 * pretend model. The conversation service detects `isLive === false` and calls
 * the composer with the structured plan instead. This class exists so that the
 * "which engine served this?" question has a single uniform answer, and so
 * request logging is identical on both paths.
 */
class SimulatedProvider implements LlmProvider {
  readonly engine = 'simulated' as const;
  readonly model = 'deterministic-composer-v1';
  readonly isLive = false;

  async generate(input: GenerateInput): Promise<GenerateResult> {
    // Reached only if a caller bypasses the composer. Returning a truthful
    // notice beats returning invented prose.
    return {
      text: input.user,
      engine: this.engine,
      model: this.model,
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: 0,
      degraded: true,
    };
  }
}

/* ------------------------------------------------------------ registry */

let cached: LlmProvider | null = null;
let embeddingCached: LlmProvider | null = null;

export function getProvider(): LlmProvider {
  if (cached) return cached;
  const mode = resolveAiMode();
  cached =
    mode === 'anthropic' ? new AnthropicProvider()
    : mode === 'openai' ? new OpenAiProvider()
    : mode === 'deepseek' ? new DeepSeekProvider()
    : new SimulatedProvider();
  return cached;
}

/**
 * Embeddings are a separate inference concern from response generation.
 * A deployment may use Anthropic or DeepSeek for prose while using OpenAI's
 * embedding endpoint for retrieval, so this must not depend on AI_MODE.
 */
export function getEmbeddingProvider(): LlmProvider | null {
  if (!env.OPENAI_API_KEY) return null;
  embeddingCached ??= new OpenAiProvider();
  return embeddingCached;
}

/** For tests: force a specific provider. */
export function setProviderForTesting(provider: LlmProvider | null): void {
  cached = provider;
}

export function describeAiMode(): { mode: AiMode; isLive: boolean; model: string } {
  const provider = getProvider();
  return { mode: provider.engine, isLive: provider.isLive, model: provider.model };
}

export { ProviderError };
export type { LlmProvider, GenerateResult, GenerateInput };

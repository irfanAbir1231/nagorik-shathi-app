import type { AiEngine } from '@/lib/domain/enums';

/**
 * The provider contract.
 *
 * Exactly one seam between Shebar Janala and any language model. Services depend on
 * this interface only, so the deterministic engine and a hosted model are
 * interchangeable — and, critically, the engine that served a response is
 * always known and is reported to the citizen (never silently swapped).
 */

export interface GenerateInput {
  readonly system: string;
  readonly user: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  /** Abort signal so a slow model cannot hold a request open indefinitely. */
  readonly signal?: AbortSignal;
}

export interface GenerateResult {
  readonly text: string;
  readonly engine: AiEngine;
  readonly model: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly latencyMs: number;
  /**
   * True when the provider could not be reached and a deterministic fallback
   * produced this text instead. Surfaced in the UI — a degraded answer must
   * never look like a normal one.
   */
  readonly degraded?: boolean;
  readonly error?: string;
}

export interface EmbedResult {
  readonly vectors: readonly number[][];
  readonly model: string;
  readonly engine: AiEngine;
}

export interface LlmProvider {
  readonly engine: AiEngine;
  readonly model: string;
  /** Whether this provider performs real inference against a hosted model. */
  readonly isLive: boolean;
  generate(input: GenerateInput): Promise<GenerateResult>;
  /** Null when the provider cannot embed; the retriever then uses BM25 only. */
  embed?(texts: readonly string[]): Promise<EmbedResult | null>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Shared fetch with timeout + bounded retry for transient upstream failures. */
export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  options: { signal?: AbortSignal; timeoutMs?: number; retries?: number } = {},
): Promise<unknown> {
  const { timeoutMs = 30_000, retries = 1 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        // 4xx is a request problem — retrying cannot help and only adds latency.
        const retryable = response.status === 429 || response.status >= 500;
        throw new ProviderError(
          `Provider responded ${response.status}: ${text.slice(0, 300)}`,
          response.status,
          retryable,
        );
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof ProviderError ? error.retryable : true;
      if (!retryable || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  throw lastError instanceof Error ? lastError : new ProviderError('Provider request failed');
}

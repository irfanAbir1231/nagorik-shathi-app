import { env } from '@/lib/config/env';
import { validateResponse } from './validate';
import {
  DecisionModelError,
  type DecisionModel,
  type DecisionRequest,
  type DecisionResult,
} from './types';

/**
 * Jev (TypeSafe System One) behind the `DecisionModel` contract.
 *
 * SERVER-ONLY. The key is read from `env` (never `NEXT_PUBLIC_*`), sent only in
 * the Authorization header, and never included in an error message, a log line,
 * or a returned value. Error bodies are truncated and carry no request headers.
 *
 * This does not reuse `postJson` from `providers/types.ts` deliberately: that
 * helper retries after the CALLER's AbortSignal fires (the retry creates a new
 * controller whose listener never triggers), and it cannot distinguish a
 * timeout from a cancellation. Both distinctions matter here, because each
 * decision type has its own failure policy.
 */

/** Documented as retry-with-backoff in the API reference (429, 529); 5xx is transient too. */
function isRetryable(status: number): boolean {
  return status === 429 || status === 529 || status >= 500;
}

function kindForStatus(status: number): DecisionModelError['kind'] {
  if (status === 401 || status === 403) return 'auth';
  if (status === 400 || status === 404 || status === 422) return 'invalid_request';
  if (status === 429) return 'rate_limited';
  if (status === 529) return 'overloaded';
  return 'server';
}

export interface JevOptions {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly retries?: number;
  /** Injectable for tests; defaults to global fetch. */
  readonly fetchImpl?: typeof fetch;
}

export class JevDecisionModel implements DecisionModel {
  readonly engine = 'jev' as const;
  readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: JevOptions = {}) {
    this.apiKey = options.apiKey ?? env.JEV_API_KEY;
    this.model = options.model ?? env.JEV_MODEL;
    this.baseUrl = (options.baseUrl ?? env.JEV_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? env.JEV_TIMEOUT_MS;
    this.retries = options.retries ?? 1;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async decide(request: DecisionRequest): Promise<DecisionResult> {
    if (!this.apiKey) throw new DecisionModelError('unconfigured', 'JEV_API_KEY is not configured.');
    if (Object.keys(request.questions).length === 0) {
      throw new DecisionModelError('invalid_request', 'A decision request needs at least one question.');
    }

    const body = JSON.stringify({ model: this.model, state: request.state, questions: request.questions });
    const started = Date.now();
    let lastError: DecisionModelError | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      if (request.signal?.aborted) throw new DecisionModelError('aborted', 'The request was cancelled.');

      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeoutMs);
      const onAbort = () => controller.abort();
      request.signal?.addEventListener('abort', onAbort, { once: true });

      try {
        const response = await this.fetchImpl(`${this.baseUrl}/v1/systemone`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = (await response.text().catch(() => '')).slice(0, 300);
          const error = new DecisionModelError(
            kindForStatus(response.status),
            `Jev responded ${response.status}${detail ? `: ${detail}` : ''}`,
            response.status,
          );
          if (!isRetryable(response.status) || attempt === this.retries) throw error;
          lastError = error;
        } else {
          const payload: unknown = await response.json().catch(() => {
            throw new DecisionModelError('malformed_response', 'Jev returned a body that is not JSON.');
          });
          const validated = validateResponse(payload, request.questions);
          return {
            answers: validated.answers,
            engine: 'jev',
            model: validated.model,
            latencyMs: Date.now() - started,
            usage: { inputTokens: validated.inputTokens, outputTokens: validated.outputTokens },
          };
        }
      } catch (error) {
        if (error instanceof DecisionModelError) {
          if (error.kind === 'malformed_response' || error.kind === 'auth' || error.kind === 'invalid_request') throw error;
          if (error.status !== undefined && (!isRetryable(error.status) || attempt === this.retries)) throw error;
          lastError = error;
        } else if (request.signal?.aborted) {
          throw new DecisionModelError('aborted', 'The request was cancelled.');
        } else if (timedOut) {
          lastError = new DecisionModelError('timeout', `Jev did not answer within ${this.timeoutMs} ms.`);
        } else {
          lastError = new DecisionModelError('network', `Could not reach Jev: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (attempt === this.retries) throw lastError;
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onAbort);
      }

      // Exponential backoff with jitter, as the API reference asks for 429/529.
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt + Math.random() * 100));
    }

    throw lastError ?? new DecisionModelError('network', 'Jev request failed.');
  }
}

let cached: DecisionModel | null | undefined;

/** The configured decision model, or null when none is configured. */
export function getDecisionModel(): DecisionModel | null {
  if (cached !== undefined) return cached;
  const jev = new JevDecisionModel();
  cached = jev.isConfigured ? jev : null;
  return cached;
}

/** For tests: force a decision model (or none). */
export function setDecisionModelForTesting(model: DecisionModel | null | undefined): void {
  cached = model;
}

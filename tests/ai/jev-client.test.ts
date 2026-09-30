import { describe, expect, it } from 'vitest';
import { JevDecisionModel } from '@/modules/ai/decision/jev';
import { DecisionModelError, type Question } from '@/modules/ai/decision/types';

const KEY = 'test-key-never-real-0000';
const questions: Record<string, Question> = {
  widowed: { type: 'noul', instructions: 'Is the writer widowed?' },
  kind: { type: 'choice', instructions: 'Kind?', criteria: { situation: null, greeting: null } },
};

function respond(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const OK = {
  model: 'jev-1.13.0',
  answers: {
    widowed: { type: 'noul', noul: 0.97 },
    kind: { type: 'choice', choice: 'situation', probabilities: { situation: 0.99, greeting: 0.01 }, confidence: 0.98 },
  },
  usage: { input_tokens: 300, output_tokens: 20 },
};

function model(fetchImpl: typeof fetch, extra: Partial<ConstructorParameters<typeof JevDecisionModel>[0]> = {}) {
  return new JevDecisionModel({ apiKey: KEY, model: 'jev-1.13.0', baseUrl: 'https://jev.test', timeoutMs: 200, retries: 1, fetchImpl, ...extra });
}

async function errorOf(p: Promise<unknown>): Promise<DecisionModelError> {
  try {
    await p;
  } catch (error) {
    if (error instanceof DecisionModelError) return error;
    throw error;
  }
  throw new Error('expected a DecisionModelError');
}

describe('Jev client — request contract', () => {
  it('posts state, pinned model, and questions with a bearer key to /v1/systemone', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const m = model(async (url, init) => {
      seen = { url: String(url), init: init! };
      return respond(200, OK);
    });
    const result = await m.decide({ state: { message: 'x' }, questions });
    expect(seen!.url).toBe('https://jev.test/v1/systemone');
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(String(seen!.init.body))).toEqual({ model: 'jev-1.13.0', state: { message: 'x' }, questions });
    expect(result.model).toBe('jev-1.13.0');
    expect(result.usage).toEqual({ inputTokens: 300, outputTokens: 20 });
    expect(result.answers.widowed).toEqual({ type: 'noul', noul: 0.97 });
  });

  it('refuses to run without a key', async () => {
    const m = new JevDecisionModel({ apiKey: '', fetchImpl: async () => respond(200, OK) });
    expect((await errorOf(m.decide({ state: 'x', questions }))).kind).toBe('unconfigured');
  });
});

describe('Jev client — typed answers are validated, not trusted', () => {
  it.each([
    ['a missing answer', { ...OK, answers: { widowed: OK.answers.widowed } }],
    ['a choice outside its criteria', { ...OK, answers: { ...OK.answers, kind: { ...OK.answers.kind, choice: 'eligible' } } }],
    ['a probability above 1', { ...OK, answers: { ...OK.answers, widowed: { type: 'noul', noul: 1.4 } } }],
    ['probabilities that do not sum to 1', { ...OK, answers: { ...OK.answers, kind: { ...OK.answers.kind, probabilities: { situation: 0.6, greeting: 0.1 } } } }],
    ['a wrong answer type', { ...OK, answers: { ...OK.answers, widowed: OK.answers.kind } }],
    ['a body that is not JSON', 'not json'],
  ])('rejects %s', async (_label, body) => {
    const m = model(async () => respond(200, body));
    expect((await errorOf(m.decide({ state: 'x', questions }))).kind).toBe('malformed_response');
  });
});

describe('Jev client — every failure is named, so each caller can pick its own fallback', () => {
  it.each([
    [401, 'auth'],
    [422, 'invalid_request'],
    [429, 'rate_limited'],
    [529, 'overloaded'],
    [503, 'server'],
  ] as const)('HTTP %i → %s', async (status, kind) => {
    const m = model(async () => respond(status, { detail: 'nope' }));
    expect((await errorOf(m.decide({ state: 'x', questions }))).kind).toBe(kind);
  });

  it('retries a transient 529 and succeeds', async () => {
    let calls = 0;
    const m = model(async () => (++calls === 1 ? respond(529, {}) : respond(200, OK)));
    await expect(m.decide({ state: 'x', questions })).resolves.toBeTruthy();
    expect(calls).toBe(2);
  });

  it('does not retry an auth failure', async () => {
    let calls = 0;
    const m = model(async () => {
      calls += 1;
      return respond(401, {});
    });
    await errorOf(m.decide({ state: 'x', questions }));
    expect(calls).toBe(1);
  });

  it('reports a timeout as a timeout', async () => {
    const m = model((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }), { retries: 0, timeoutMs: 30 });
    expect((await errorOf(m.decide({ state: 'x', questions }))).kind).toBe('timeout');
  });

  it('reports a network failure as network', async () => {
    const m = model(async () => {
      throw new TypeError('fetch failed');
    }, { retries: 0 });
    expect((await errorOf(m.decide({ state: 'x', questions }))).kind).toBe('network');
  });

  it('stops immediately, without retrying, when the caller cancels', async () => {
    const controller = new AbortController();
    controller.abort();
    const m = model(async () => respond(200, OK));
    expect((await errorOf(m.decide({ state: 'x', questions, signal: controller.signal }))).kind).toBe('aborted');
  });

  it('never puts the key in an error message', async () => {
    const m = model(async () => respond(401, { detail: 'bad key' }));
    const error = await errorOf(m.decide({ state: 'x', questions }));
    expect(error.message).not.toContain(KEY);
  });
});

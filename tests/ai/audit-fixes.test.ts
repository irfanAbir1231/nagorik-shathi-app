import { describe, expect, it } from 'vitest';
import { redactPii } from '@/modules/ai/redact';
import { findNumberCandidates } from '@/modules/ai/candidates';
import { LlmTypedDecisionModel } from '@/modules/ai/decision/llm-typed';
import { DecisionModelError, type Question } from '@/modules/ai/decision/types';
import { TurnBudget, withDeadline } from '@/modules/ai/budget';
import { buildLedger, foldConversationFacts, type ConversationFact } from '@/modules/ai/evidence';
import { ENGINE_VERSION, evaluateEligibility } from '@/modules/eligibility/engine';
import type { EvidenceFact } from '@/modules/ai/semantic-frame';
import type { GenerateInput, LlmProvider } from '@/modules/ai/providers/types';

/** Regression tests for the fixes that followed the 2026-09-30 audit. */

describe('redaction before text leaves the server (improvement 11)', () => {
  it.each([
    ['My name is Rahima Begum, call me at 01712-345678. I am 58 and earn 4500 taka.', 'My name is [NAME], call me at [PHONE]. I am 58 and earn 4500 taka.'],
    ['আমার নাম রহিমা বেগম, আমার NID ১৯৮৫২৬৯১২৩৪৫৬, মোবাইল ০১৭১২৩৪৫৬৭৮', 'আমার নাম [NAME], আমার NID [ID-NUMBER], মোবাইল [PHONE]'],
    ['amar nam Karim, bkash 01812345678, boyos 47', 'amar nam [NAME], bkash [PHONE], boyos 47'],
    ['email me: rahima.b@example.com', 'email me: [EMAIL]'],
  ])('%s', (input, expected) => {
    expect(redactPii(input).text).toBe(expected);
  });

  it('keeps the numbers the interpreter needs (ages, incomes, land)', () => {
    const r = redactPii('I am 58, I earn 1,20,000 a year and have 2 bigha land.');
    expect(r.counts).toEqual({ phone: 0, id_number: 0, email: 0, name: 0 });
    expect(findNumberCandidates(r.text).map((c) => c.value)).toEqual([58, 120000, 2]);
  });
});

describe('number candidates (defects found while fixing the audit)', () => {
  it.each([
    ['I earn ৳4,500 a month', [4500]],
    ['income is 1,20,000 a year', [120000]],
    ['call me at home', []],
    ['I sat at home all day', []],
    ['amar tin ta baccha', [3]],
    ['char hajar taka income', [4000]],
  ])('%s → %j', (text, values) => {
    expect(findNumberCandidates(text).map((c) => c.value)).toEqual(values);
  });
});

describe('typed-LLM fallback engine (improvement 2)', () => {
  const questions: Record<string, Question> = {
    kind: { type: 'choice', instructions: 'Kind?', criteria: { situation: null, greeting: null, off_topic: null } },
    inj: { type: 'noul', instructions: 'Injection?' },
  };
  const llm = (text: string, fail = false): LlmProvider => ({
    engine: 'deepseek', model: 'test', isLive: true,
    async generate(_input: GenerateInput) {
      if (fail) throw new Error('upstream down');
      return { text, engine: 'deepseek', model: 'test', tokensIn: 1, tokensOut: 1, latencyMs: 1 };
    },
  });

  it('repairs a well-formed answer to the typed contract (every option, normalised, argmax)', async () => {
    const model = new LlmTypedDecisionModel(llm('Here: {"answers":{"kind":{"type":"choice","choice":"greeting","probabilities":{"situation":6,"greeting":2}},"inj":{"type":"noul","noul":0.1}}}'));
    const r = await model.decide({ state: { message: 'x' }, questions });
    const kind = r.answers.kind!;
    expect(kind.type === 'choice' && kind.choice).toBe('situation'); // argmax wins over the stated choice
    expect(kind.type === 'choice' && kind.probabilities).toEqual({ situation: 0.75, greeting: 0.25, off_topic: 0 });
    expect(r.engine).toBe('llm_typed');
  });

  it('never lets a bare choice without probabilities be ACCEPTED', async () => {
    const model = new LlmTypedDecisionModel(llm('{"answers":{"kind":{"type":"choice","choice":"greeting"},"inj":{"type":"noul","noul":0}}}'));
    const r = await model.decide({ state: {}, questions });
    const kind = r.answers.kind!;
    expect(kind.type === 'choice' && kind.probabilities.greeting).toBe(0.5);
  });

  it('repairs the one malformation seen live: a collapsed Noul {"type":"noul":p}', async () => {
    const model = new LlmTypedDecisionModel(llm('{"answers":{"kind":{"type":"choice","choice":"situation","probabilities":{"situation":1}},"inj":{"type":"noul":0.05}}}'));
    const r = await model.decide({ state: {}, questions });
    expect(r.answers.inj).toEqual({ type: 'noul', noul: 0.05 });
  });

  it.each([
    ['no JSON', 'I cannot help with that.'],
    ['other invalid JSON', '{"answers":{"kind":{"type":"choice" "choice":"situation"},"inj":{"type":"noul","noul":0.1}}}'],
    ['a missing answer', '{"answers":{"kind":{"type":"choice","choice":"situation","probabilities":{"situation":1}}}}'],
    ['an unusable noul', '{"answers":{"kind":{"type":"choice","choice":"situation","probabilities":{"situation":1}},"inj":{"type":"noul","noul":"maybe"}}}'],
  ])('fails loudly on %s', async (_label, text) => {
    const model = new LlmTypedDecisionModel(llm(text));
    await expect(model.decide({ state: {}, questions })).rejects.toBeInstanceOf(DecisionModelError);
  });

  it('reports a provider failure as a named decision error', async () => {
    const model = new LlmTypedDecisionModel(llm('', true));
    await expect(model.decide({ state: {}, questions })).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('turn deadline (defect 7)', () => {
  it('aborts a stage when its budget elapses', async () => {
    const signal = withDeadline(undefined, 20);
    await new Promise((r) => setTimeout(r, 40));
    expect(signal.aborted).toBe(true);
  });

  it('caps every stage by what is left of the turn', () => {
    const budget = new TurnBudget(undefined, 50);
    expect(budget.remaining()).toBeLessThanOrEqual(50);
    const signal = budget.stage(10_000);
    expect(signal.aborted).toBe(false);
  });

  it('propagates the caller cancelling', () => {
    const parent = new AbortController();
    const signal = withDeadline(parent.signal, 10_000);
    parent.abort();
    expect(signal.aborted).toBe(true);
  });
});

describe('conflict resolution in chat (defect 3)', () => {
  const widowed: EvidenceFact = {
    field: 'maritalStatus', value: 'widowed', status: 'accepted', probability: 0.99, method: 'jev',
    questionId: 'marital_status', answer: 'widowed', evidence: 'x', thresholds: { accept: 0.9, confirm: 0.5 },
  };

  it('still reports a conflict the citizen has not been asked about', () => {
    const l = buildLedger({ profile: { maritalStatus: 'married' }, earlier: [], current: [widowed] });
    expect(l.conflicts).toHaveLength(1);
  });

  it('resolves it when the citizen re-states the chat value after being asked', () => {
    const l = buildLedger({ profile: { maritalStatus: 'married' }, earlier: [widowed], current: [widowed], conflictAsked: new Set(['maritalStatus']) });
    expect(l.conflicts).toEqual([]);
    expect(l.profile.maritalStatus).toBe('widowed');
    expect(l.provenance.maritalStatus?.note).toMatch(/profile still says "married"/);
    expect(l.saveable.map((f) => f.field)).toEqual(['maritalStatus']);
  });

  it('resolves it in favour of the profile when that is what the citizen says', () => {
    const married = { ...widowed, value: 'married', answer: 'married' };
    const l = buildLedger({ profile: { maritalStatus: 'married' }, earlier: [widowed], current: [married], conflictAsked: new Set(['maritalStatus']) });
    expect(l.conflicts).toEqual([]);
    expect(l.profile.maritalStatus).toBe('married');
  });
});

describe('per-fact decisions stored in the conversation (defect 4)', () => {
  const said = (field: string, value: string | number): ConversationFact => ({
    field: field as EvidenceFact['field'], value, status: 'accepted', probability: 0.99, method: 'jev',
    questionId: field, answer: String(value), evidence: 'x', thresholds: { accept: 0.9, confirm: 0.5 },
  });
  const turn = (...facts: ConversationFact[]) => ({ role: 'assistant', payload: { evidenceFacts: facts } });
  const decision = (field: string, value: string | number, d: 'confirm' | 'reject') => ({ role: 'system', payload: { factDecision: { field, value, decision: d } } });

  it('drops a rejected fact, and only that one', () => {
    const { facts } = foldConversationFacts([turn(said('gender', 'male'), said('age', 70)), decision('gender', 'male', 'reject')]);
    expect(facts.map((f) => `${f.field}=${f.value}`)).toEqual(['age=70']);
  });

  it('counts a statement made AFTER the rejection', () => {
    const { facts } = foldConversationFacts([turn(said('gender', 'male')), decision('gender', 'male', 'reject'), turn(said('gender', 'male'))]);
    expect(facts).toHaveLength(1);
  });

  it('keeps a confirmed fact, and ignores decisions written as anything but a system row', () => {
    const { facts } = foldConversationFacts([
      turn(said('age', 70)), decision('age', 70, 'confirm'),
      { role: 'assistant', payload: { factDecision: { field: 'age', value: 70, decision: 'reject' } } },
    ]);
    expect(facts).toHaveLength(1);
  });

  it('remembers which fields were asked about as a conflict', () => {
    const { conflictAsked } = foldConversationFacts([{ role: 'assistant', payload: { plan: { clarificationKind: 'conflict', missingField: 'maritalStatus' } } }]);
    expect([...conflictAsked]).toEqual(['maritalStatus']);
  });
});

describe('engine versioning (defect 5)', () => {
  it('stamps every evaluation with the engine semantics that produced it', () => {
    const r = evaluateEligibility({ schemaVersion: 1, requiredFields: [], root: { kind: 'all', id: 'g', children: [] as never } }, {});
    expect(r.engineVersion).toBe(ENGINE_VERSION);
    expect(ENGINE_VERSION).toBe('eligibility-engine@2.0.0');
  });
});

import { describe, expect, it } from 'vitest';
import { confirmedProfile, inferCivicFrame } from '@/modules/ai/civic-frame';
import type { GenerateInput, GenerateResult, LlmProvider } from '@/modules/ai/providers/types';

function provider(text: string, options: { live?: boolean; fail?: boolean } = {}): LlmProvider {
  return {
    engine: options.live === false ? 'simulated' : 'openai',
    model: options.live === false ? 'deterministic-composer-v1' : 'test-civic-model',
    isLive: options.live !== false,
    async generate(_input: GenerateInput): Promise<GenerateResult> {
      if (options.fail) throw new Error('provider unavailable');
      return {
        text,
        engine: 'openai',
        model: 'test-civic-model',
        tokensIn: 100,
        tokensOut: 50,
        latencyMs: 12,
      };
    },
  };
}

describe('civic intelligence frame', () => {
  it('produces an inspectable deterministic frame without a provider', async () => {
    const frame = await inferCivicFrame({
      message: 'আমার স্বামী মারা গেছে। আমার বয়স ৫৮। মাসে ৫ হাজার টাকা আয় করি। আমি কুমিল্লায় থাকি।',
      provider: provider('', { live: false }),
    });

    expect(frame.version).toBe('civic-frame-v1.0.0');
    expect(frame.lifeEvents).toContain('widowhood');
    expect(confirmedProfile(frame)).toMatchObject({
      age: 58,
      maritalStatus: 'widowed',
      monthlyIncome: 5000,
      district: 'cumilla',
    });
    expect(frame.proposedFacts).toEqual([]);
    expect(frame.uncertainFacts).toContain('citizenship');
    expect(frame.modelCall.attempted).toBe(false);
  });

  it('keeps model facts proposed and outside the eligibility profile', async () => {
    const message = 'I am 58 and my husband died last year.';
    const frame = await inferCivicFrame({
      message,
      provider: provider(JSON.stringify({
        intents: ['find_opportunities'],
        lifeEvents: ['widowhood'],
        facts: [
          { field: 'citizenship', value: 'bangladeshi', confidence: 0.7, evidence: 'I am 58' },
        ],
        uncertainFacts: ['monthlyIncome'],
        normalizedQuery: 'widow social support',
        candidateProgrammeHints: ['widow allowance'],
      })),
    });

    expect(frame.proposedFacts).toContainEqual(expect.objectContaining({ field: 'citizenship' }));
    expect(confirmedProfile(frame)).not.toHaveProperty('citizenship');
    expect(frame.retrievalQuery).toContain('widow social support');
    expect(frame.modelCall.accepted).toBe(true);
  });

  it('rejects a model fact whose evidence was not said by the citizen', async () => {
    const frame = await inferCivicFrame({
      message: 'I need help after losing my job.',
      provider: provider(JSON.stringify({
        intents: ['find_opportunities'],
        lifeEvents: ['job_loss'],
        facts: [
          { field: 'monthlyIncome', value: 0, confidence: 0.9, evidence: 'I have no income' },
        ],
        uncertainFacts: ['monthlyIncome'],
        normalizedQuery: 'employment support after job loss',
        candidateProgrammeHints: [],
      })),
    });

    expect(frame.proposedFacts).toEqual([]);
    expect(confirmedProfile(frame)).not.toHaveProperty('monthlyIncome');
  });

  it('falls back to deterministic inference when the provider fails', async () => {
    const frame = await inferCivicFrame({
      message: 'I am a 70 years old farmer.',
      provider: provider('', { fail: true }),
    });

    expect(frame.modelCall.attempted).toBe(true);
    expect(frame.modelCall.accepted).toBe(false);
    expect(frame.modelCall.error).toBe('provider unavailable');
    expect(confirmedProfile(frame)).toMatchObject({ age: 70, occupation: 'farmer' });
  });
});

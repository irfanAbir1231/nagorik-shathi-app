import { describe, expect, it } from 'vitest';
import { assertNumericGrounding, unsupportedNumericClaims } from '@/modules/ai/grounding';
import type { ResponsePlan } from '@/modules/ai/response-plan';

const plan: ResponsePlan = {
  kind: 'recommendations',
  locale: 'en',
  intents: ['find_opportunities'],
  lifeEvents: ['widowhood'],
  opportunities: [{
    id: 'widow', slug: 'widow-allowance', title: { bn: 'বিধবা ভাতা', en: 'Widow Allowance' },
    summary: { bn: 'মাসিক সহায়তা', en: 'Monthly support' },
    organisation: { bn: 'অধিদপ্তর', en: 'Department' }, category: 'social_protection',
    outcome: 'unknown', benefitAmount: 500, benefitPeriod: 'monthly', deadline: null,
    relevance: 1, confidence: 65, isUnverified: true,
    metReasons: [], failedReasons: [],
    unknownReasons: [{ bn: 'আয় জানা দরকার', en: 'Income is required' }],
    verificationStatus: 'unverified_sample', softFailedReasons: [], conditions: [],
    decisionStatus: 'needs_information', reviewReasons: [], evidenceStrength: null,
    nextStep: null, sourceUrl: null,
  }],
  citations: [], overallConfidence: 65, ungrounded: false,
};

describe('numeric grounding gate', () => {
  it('accepts numeric facts present in the deterministic plan', () => {
    expect(() => assertNumericGrounding('1. Monthly support: BDT 500.', plan)).not.toThrow();
  });

  it('accepts an amount written the way the system prompt requires (two decimals)', () => {
    // The prompt mandates "৳5,000.00". The previous gate rejected every amount
    // written that way, silently degrading each such answer to the template.
    expect(unsupportedNumericClaims('You may receive ৳500.00 each month.', plan)).toEqual([]);
    expect(unsupportedNumericClaims('মাসে ৳৫০০.০০ পেতে পারেন।', plan)).toEqual([]);
  });

  it('rejects a score the model was never shown', () => {
    // Confidence and ids are not citizen-facing content, so they are not an
    // allowlist; a model that states one invented it.
    expect(unsupportedNumericClaims('Confidence 65%.', plan)).toEqual(['65']);
  });

  it('rejects an invented eligibility threshold', () => {
    expect(unsupportedNumericClaims('You qualify below BDT 1,500.', plan)).toEqual(['1500']);
    expect(() => assertNumericGrounding('You qualify below BDT 1,500.', plan)).toThrow(/1500/);
  });

  it('normalizes Bangla digits before comparison', () => {
    expect(unsupportedNumericClaims('পরিমাণ ৫০০ টাকা।', plan)).toEqual([]);
  });
});

/* Audit probes: (A) amount smuggled via the citizen's message, (B) verifier steering via prose. Live Jev. */
import '../../../scripts/load-env';
import { renderTurn } from '@/modules/ai/render';
import { verifyExplanation } from '@/modules/ai/verifier';
import { JevDecisionModel } from '@/modules/ai/decision/jev';
import type { LlmProvider } from '@/modules/ai/providers/types';
import type { PlannedOpportunity, ResponsePlan } from '@/modules/ai/response-plan';

const jev = new JevDecisionModel();
const opp = (outcome: PlannedOpportunity['outcome']): PlannedOpportunity => ({
  id: 'w', slug: 'widow-allowance', title: { en: 'Widow Allowance', bn: 'বিধবা ভাতা' }, summary: { en: 'Monthly support for widows', bn: 'বিধবাদের মাসিক সহায়তা' },
  organisation: { en: 'Department of Social Services', bn: 'সমাজসেবা অধিদপ্তর' }, category: 'social_welfare', outcome,
  benefitAmount: 550, benefitPeriod: 'monthly', deadline: null, relevance: 1, confidence: 63, verificationStatus: 'unverified_sample', isUnverified: true,
  metReasons: [], failedReasons: [], unknownReasons: [{ en: 'What is your monthly household income?', bn: '' }], softFailedReasons: [], conditions: [],
  decisionStatus: 'needs_information', reviewReasons: [], evidenceStrength: null, nextStep: null, sourceUrl: null,
});
const plan = (outcome: PlannedOpportunity['outcome']): ResponsePlan => ({
  kind: 'recommendations', locale: 'en', intents: [], lifeEvents: [], opportunities: [opp(outcome)], citations: [], overallConfidence: 63, ungrounded: false,
});
const llm = (text: string): LlmProvider => ({ engine: 'deepseek', model: 'scripted', isLive: true, async generate() { return { text, engine: 'deepseek', model: 'scripted', tokensIn: 0, tokensOut: 0, latencyMs: 0 }; } });

(async () => {
  const two: ResponsePlan = { ...plan('unknown'), opportunities: [opp('unknown'), { ...opp('unknown'), id: 'd', slug: 'disability-allowance', title: { en: 'Disability Allowance', bn: 'প্রতিবন্ধী ভাতা' }, benefitAmount: 850 }] };
  const prose = 'You may qualify for the Widow Allowance, which pays ৳850.00 a month, and the Disability Allowance, which pays ৳550.00. I need your income first.';
  const r = await renderTurn({ plan: two, message: 'my husband died and I am disabled', history: [], profile: {}, provider: llm(prose), decisionModel: jev, injectionFlagged: false });
  console.log('swapped amounts ->', r.renderPath);
})();

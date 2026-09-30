import type { EligibilityOutcome } from '@/lib/domain/enums';
import { VERIFIER_THRESHOLDS } from './decision/policy';
import { DecisionModelError, type ChoiceQuestion, type DecisionModel, type NoulQuestion, type Question } from './decision/types';
import { pickLocalised, type ResponsePlan } from './response-plan';
import type { Judgment } from './semantic-frame';

/**
 * Explanation verification — the generative model writes, a decision model
 * audits, and CODE decides whether the prose may be shown.
 *
 * The plan fixes the verdicts. The only thing a live LLM can still get wrong is
 * what its prose SAYS about them: "you qualify" for a programme the rule engine
 * marked `unknown`, or a scheme that is not in the plan at all. Those are
 * semantic claims no regex can reliably catch, and exactly the narrow, typed
 * judgment Jev is built for. Each programme gets one Choice ("what does the
 * text tell the citizen about this programme?"), and code compares the answer
 * with the engine's outcome through a fixed table.
 *
 * FAILURE POLICY: fail closed. If the verifier cannot run, the model's prose is
 * not shown and the deterministic composer answers instead. An unchecked
 * explanation is not "probably fine" in a benefits decision.
 */

export const VERIFIER_VERSION = 'explanation-verifier@1.1.0';

const STATED = {
  qualifies: 'Says the citizen qualifies, is eligible, or will get it.',
  may_qualify: 'Says the citizen may qualify or appears to qualify, subject to conditions, confirmation, or checking.',
  need_information: 'Says more information is needed before it can be decided.',
  not_qualify: 'Says the citizen does not qualify, is not eligible, or that it does not apply to them.',
  not_mentioned: 'Does not mention this programme, or says nothing about whether the citizen can get it.',
} as const;
type Stated = keyof typeof STATED;

/**
 * What prose may say about each outcome. Everything else is a contradiction.
 * `eligible` allows hedged wording because unverified sample data must be
 * described with a caveat; `unknown` allows "may qualify" because "you may
 * qualify, but I need your income" is an accurate reading of an unknown.
 */
const PERMITTED: Record<EligibilityOutcome, readonly Stated[]> = {
  eligible: ['qualifies', 'may_qualify', 'not_mentioned'],
  partially_eligible: ['may_qualify', 'need_information', 'not_mentioned'],
  unknown: ['may_qualify', 'need_information', 'not_mentioned'],
  not_eligible: ['not_qualify', 'not_mentioned'],
};

export interface VerificationResult {
  readonly verdict: 'pass' | 'reject';
  readonly reasons: readonly string[];
  readonly judgments: readonly Judgment[];
  readonly model: string;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly errorKind?: string;
}

export function buildVerifierQuestions(plan: ResponsePlan): Record<string, Question> {
  const questions: Record<string, Question> = {};
  plan.opportunities.forEach((_, i) => {
    const q: ChoiceQuestion = {
      type: 'choice',
      instructions: {
        programme: `programmes[${i}]`,
        question: `What does \`explanation\` tell the citizen about whether they can get \`programmes[${i}]\`?`,
      },
      criteria: STATED,
    };
    questions[`stated_${i}`] = q;
  });
  const unlisted: NoulQuestion = {
    type: 'noul',
    // v1.1: offices and places are not programmes. v1.0 counted "Upazila
    // Social Services Office" or a service centre as an unlisted programme and
    // rejected faithful prose (measured: 2 of 11 faithful labelled pairs).
    instructions: 'Does `explanation` offer the citizen a benefit, allowance, grant, scheme, or programme that is NOT one of `programmes`? Offices, service centres, places to apply, documents, and the organisations that run `programmes` do not count.',
    criteria: {
      true: 'The text offers or recommends at least one benefit, allowance, grant, scheme, or programme that is not in `programmes`.',
      false: 'Every benefit or programme offered is one of `programmes`. Mentions of offices, centres, places, documents, or the running organisation are fine.',
    },
  };
  questions.unlisted_programme = unlisted;
  return questions;
}

export async function verifyExplanation(
  text: string,
  plan: ResponsePlan,
  model: DecisionModel,
  signal?: AbortSignal,
): Promise<VerificationResult> {
  const questions = buildVerifierQuestions(plan);
  const state = {
    explanation: text,
    programmes: plan.opportunities.map((o) => ({
      title: pickLocalised(o.title, 'en'),
      title_bn: o.title.bn,
      organisation: pickLocalised(o.organisation, 'en'),
    })),
  };

  try {
    const result = await model.decide({ state, questions, ...(signal ? { signal } : {}) });
    const judgments: Judgment[] = [];
    const reasons: string[] = [];

    plan.opportunities.forEach((o, i) => {
      const answer = result.answers[`stated_${i}`];
      if (answer?.type !== 'choice') return;
      judgments.push({ id: `stated_${i}`, type: 'choice', answer: answer.choice, probability: answer.probabilities[answer.choice] ?? 0, confidence: answer.confidence, probabilities: answer.probabilities });
      // Probability mass on statements the verdict forbids — summed, so a
      // contradiction split across two forbidden readings is still caught.
      const forbidden = (Object.keys(STATED) as Stated[]).filter((s) => !PERMITTED[o.outcome].includes(s));
      const mass = forbidden.reduce((sum, s) => sum + (answer.probabilities[s] ?? 0), 0);
      if (mass >= VERIFIER_THRESHOLDS.contradiction) {
        reasons.push(`"${pickLocalised(o.title, 'en')}": engine decided ${o.outcome}, text reads as ${answer.choice} (p=${mass.toFixed(2)}).`);
      }
    });

    const unlisted = result.answers.unlisted_programme;
    if (unlisted?.type === 'noul') {
      judgments.push({ id: 'unlisted_programme', type: 'noul', answer: unlisted.noul >= 0.5 ? 'yes' : 'no', probability: unlisted.noul, confidence: null });
      if (unlisted.noul >= VERIFIER_THRESHOLDS.unlistedProgramme) {
        reasons.push(`Text names a programme that is not in the plan (p=${unlisted.noul.toFixed(2)}).`);
      }
    }

    return {
      verdict: reasons.length > 0 ? 'reject' : 'pass',
      reasons,
      judgments,
      model: result.model,
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
    };
  } catch (error) {
    return {
      verdict: 'reject',
      reasons: [`Verifier unavailable (${error instanceof DecisionModelError ? error.kind : 'error'}); failing closed.`],
      judgments: [],
      model: model.model,
      latencyMs: 0,
      inputTokens: 0,
      errorKind: error instanceof DecisionModelError ? error.kind : 'unknown',
    };
  }
}

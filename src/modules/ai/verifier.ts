import type { EligibilityOutcome } from '@/lib/domain/enums';
import { VERIFIER_THRESHOLDS } from './decision/policy';
import { DecisionModelError, type ChoiceQuestion, type DecisionModel, type NoulQuestion, type Question } from './decision/types';
import { amountClaims, numbersIn, type AmountClaim } from './grounding';
import { pickLocalised, type ResponsePlan } from './response-plan';
import type { Judgment } from './semantic-frame';

/**
 * Explanation verification — the generative model writes, a decision model
 * reads, and CODE decides whether the prose may be shown.
 *
 * The plan fixes the verdicts, amounts, and reasons. What a live LLM can still
 * get wrong is what its prose SAYS about them. Four typed checks, one call:
 *
 *  1. VERDICT   per programme, what the text tells the citizen (qualifies /
 *               may qualify / needs information / does not qualify / silent),
 *               compared with the engine's outcome through a fixed table.
 *  2. AMOUNTS   code finds every money amount in the prose; Jev says what each
 *               one is attributed to (programme i's benefit, an eligibility
 *               limit, the citizen's own figure, other); code checks that
 *               attribution against the plan. This closes the two audit
 *               defects where a wrong or swapped amount passed every gate.
 *  3. CAVEAT    for a positive verdict on a record that is not verified, the
 *               text must tell the citizen to confirm before relying on it —
 *               unless the text is silent about that programme (a clarification
 *               question has nothing to caution; v1.2.1).
 *  4. SCHEMES & AUDIENCE   no unlisted programme; no text addressed to a
 *               reviewer or system (prose that tries to steer this check).
 *
 * FAILURE POLICY: fail closed. If the verifier cannot run, the model's prose is
 * not shown and the deterministic composer answers instead.
 */

export const VERIFIER_VERSION = 'explanation-verifier@1.2.1';

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
 * `unknown` allows "may qualify" because "you may qualify, but I need your
 * income" is an accurate reading of an unknown.
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

/* -------------------------------------------------------- amount roles */

/** Amounts each programme's own record states: benefit, summary, its own cited passages. */
function programmeAmounts(plan: ResponsePlan, i: number): Set<string> {
  const o = plan.opportunities[i]!;
  const texts: string[] = [o.summary.en, o.summary.bn];
  if (o.benefitAmount !== null) texts.push(String(o.benefitAmount));
  for (const c of plan.citations) if (c.opportunityId === o.id) texts.push(c.excerpt);
  return numbersIn(texts);
}

/** Amounts the rule engine's reasons state (income ceilings etc.). */
function limitAmounts(plan: ResponsePlan): Set<string> {
  return numbersIn(plan.opportunities.flatMap((o) => [...o.metReasons, ...o.failedReasons, ...o.unknownReasons, ...o.softFailedReasons].flatMap((r) => [r.en, r.bn])));
}

/** The citizen's own ACCEPTED figures (income, etc.). */
function citizenAmounts(plan: ResponsePlan): Set<string> {
  return numbersIn((plan.evidence?.facts ?? []).filter((f) => f.status === 'accepted' && typeof f.value === 'number').map((f) => String(f.value)));
}

function amountQuestion(claim: AmountClaim, plan: ResponsePlan): ChoiceQuestion {
  const criteria: Record<string, string> = {};
  plan.opportunities.forEach((_, i) => {
    criteria[`benefit_${i}`] = `Money the citizen would receive from \`programmes[${i}]\`.`;
  });
  criteria.eligibility_limit = 'An income limit or other threshold used to decide who qualifies.';
  criteria.citizen_figure = "The citizen's own income, earnings, or another figure about the citizen.";
  criteria.other = 'Something else: a cost, fee, loan, price, or an amount not tied to the citizen or a programme benefit.';
  return {
    type: 'choice',
    instructions: { amount: claim.surface, question: 'In `explanation`, what is the amount `amount` said to be?' },
    criteria,
  };
}

/** Which roles would make this amount consistent with the plan. */
function consistentRoles(claim: AmountClaim, plan: ResponsePlan): Set<string> {
  const ok = new Set<string>();
  plan.opportunities.forEach((_, i) => {
    if (programmeAmounts(plan, i).has(claim.value)) ok.add(`benefit_${i}`);
  });
  if (limitAmounts(plan).has(claim.value)) ok.add('eligibility_limit');
  if (citizenAmounts(plan).has(claim.value)) ok.add('citizen_figure');
  // "Other" amounts must still be stated somewhere in the plan's own content.
  const anywhere = numbersIn([
    ...plan.opportunities.flatMap((o) => [o.summary.en, o.summary.bn, o.nextStep?.en, o.nextStep?.bn]),
    ...plan.citations.map((c) => c.excerpt),
  ]);
  if (anywhere.has(claim.value)) ok.add('other');
  return ok;
}

/* ------------------------------------------------------------ questions */

const needsCaveat = (plan: ResponsePlan, i: number) => {
  const o = plan.opportunities[i]!;
  return (o.outcome === 'eligible' || o.outcome === 'partially_eligible') && o.verificationStatus !== 'verified';
};

export function buildVerifierQuestions(plan: ResponsePlan, text: string): Record<string, Question> {
  const questions: Record<string, Question> = {};
  plan.opportunities.forEach((_, i) => {
    questions[`stated_${i}`] = {
      type: 'choice',
      instructions: {
        programme: `programmes[${i}]`,
        question: `What does \`explanation\` tell the citizen about whether they can get \`programmes[${i}]\`?`,
      },
      criteria: STATED,
    } satisfies ChoiceQuestion;
    if (needsCaveat(plan, i)) {
      questions[`caveat_${i}`] = {
        type: 'noul',
        instructions: `Does \`explanation\` tell the citizen that the information about \`programmes[${i}]\` is not yet confirmed, is sample information, or should be checked at an office before relying on it?`,
        criteria: {
          true: 'The text says, for this programme or for all the programmes it lists, that the information is unverified or sample data, or that the citizen should confirm at an office.',
          false: 'The text presents this programme without any caution that its information is unconfirmed.',
        },
      } satisfies NoulQuestion;
    }
  });
  amountClaims(text).forEach((claim, k) => {
    questions[`amount_${k}`] = amountQuestion(claim, plan);
  });
  // v1.1: offices and places are not programmes. v1.0 counted "Upazila
  // Social Services Office" or a service centre as an unlisted programme.
  questions.unlisted_programme = {
    type: 'noul',
    instructions: 'Does `explanation` offer the citizen a benefit, allowance, grant, scheme, or programme that is NOT one of `programmes`? Offices, service centres, places to apply, documents, and the organisations that run `programmes` do not count.',
    criteria: {
      true: 'The text offers or recommends at least one benefit, allowance, grant, scheme, or programme that is not in `programmes`.',
      false: 'Every benefit or programme offered is one of `programmes`. Mentions of offices, centres, places, documents, or the running organisation are fine.',
    },
  } satisfies NoulQuestion;
  // v1.2: a note to "the reviewer" lowered the verdict reading from 1.00 to
  // 0.66 in the audit. Text written for anyone but the citizen is rejected.
  questions.addressed_to_reviewer = {
    type: 'noul',
    instructions: 'Does `explanation` contain text addressed to a reviewer, evaluator, checker, moderator, or AI system, instead of to the citizen?',
    criteria: {
      true: 'Some of the text speaks to a reviewer, evaluator, checker, or system, or tells someone how to classify or judge the text.',
      false: 'All of the text is written to the citizen.',
    },
  } satisfies NoulQuestion;
  return questions;
}

export async function verifyExplanation(
  text: string,
  plan: ResponsePlan,
  model: DecisionModel,
  signal?: AbortSignal,
): Promise<VerificationResult> {
  const questions = buildVerifierQuestions(plan, text);
  const claims = amountClaims(text);
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
    const record = (id: string) => {
      const a = result.answers[id];
      if (!a) return null;
      judgments.push(a.type === 'noul'
        ? { id, type: 'noul', answer: a.noul >= 0.5 ? 'yes' : 'no', probability: a.noul, confidence: null }
        : { id, type: a.type, answer: a.type === 'choice' ? a.choice : String(a.score), probability: a.probabilities[a.type === 'choice' ? a.choice : String(Math.round(a.score))] ?? 0, confidence: a.confidence, probabilities: a.probabilities });
      return a;
    };

    plan.opportunities.forEach((o, i) => {
      const a = record(`stated_${i}`);
      if (a?.type === 'choice') {
        // Probability mass on readings the verdict forbids — summed, so a
        // contradiction split across two forbidden readings is still caught.
        const forbidden = (Object.keys(STATED) as Stated[]).filter((s) => !PERMITTED[o.outcome].includes(s));
        const mass = forbidden.reduce((sum, s) => sum + (a.probabilities[s] ?? 0), 0);
        if (mass >= VERIFIER_THRESHOLDS.contradiction) {
          reasons.push(`"${pickLocalised(o.title, 'en')}": engine decided ${o.outcome}, text reads as ${a.choice} (p=${mass.toFixed(2)}).`);
        }
      }
      // No caution is needed about a programme the text does not present. A
      // missing verdict reading counts as "presented": the check stays on.
      const silent = a?.type === 'choice' ? (a.probabilities.not_mentioned ?? 0) : 0;
      const caveat = needsCaveat(plan, i) ? record(`caveat_${i}`) : null;
      if (caveat?.type === 'noul' && caveat.noul < VERIFIER_THRESHOLDS.caveat && silent < VERIFIER_THRESHOLDS.silentAboutProgramme) {
        reasons.push(`"${pickLocalised(o.title, 'en')}": positive verdict on ${o.verificationStatus} data, but no "confirm before relying on it" caution (p=${caveat.noul.toFixed(2)}).`);
      }
    });

    claims.forEach((claim, k) => {
      const a = record(`amount_${k}`);
      if (a?.type !== 'choice') return;
      const ok = consistentRoles(claim, plan);
      // Probability that the amount is used CONSISTENTLY with the plan.
      const consistent = [...ok].reduce((sum, role) => sum + (a.probabilities[role] ?? 0), 0);
      if (consistent < VERIFIER_THRESHOLDS.amountConsistency) {
        reasons.push(`Amount ${claim.surface} reads as ${a.choice}, which the plan does not support (p consistent=${consistent.toFixed(2)}).`);
      }
    });

    const unlisted = record('unlisted_programme');
    if (unlisted?.type === 'noul' && unlisted.noul >= VERIFIER_THRESHOLDS.unlistedProgramme) {
      reasons.push(`Text names a programme that is not in the plan (p=${unlisted.noul.toFixed(2)}).`);
    }
    const addressed = record('addressed_to_reviewer');
    if (addressed?.type === 'noul' && addressed.noul >= VERIFIER_THRESHOLDS.addressedToReviewer) {
      reasons.push(`Text contains content addressed to a reviewer or system (p=${addressed.noul.toFixed(2)}).`);
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

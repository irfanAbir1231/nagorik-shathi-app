import type { EligibilityOutcome, Intent, LifeEvent, VerificationStatus } from '@/lib/domain/enums';
import type { RuleField, LocalisedText } from '@/lib/domain/rules';
import type { ConditionState } from '@/modules/eligibility/engine';
import type { Provenance } from './evidence';

/**
 * The structured plan for one assistant turn.
 *
 * This is the key architectural decision in the AI layer: the pipeline decides
 * WHAT to say — which programmes, which outcome, which reasons, which next step
 * — entirely deterministically, and only then chooses how to render it.
 *
 * A live model renders the plan into fluent prose. The deterministic composer
 * renders the same plan into template prose. Both say the same facts, because
 * the facts were fixed before either was involved. That is what makes
 * "Simulated AI" an honest degradation rather than a different product, and it
 * is also what stops a live model from inventing a programme: everything it is
 * allowed to mention is already enumerated here — and, when a decision model
 * is configured, the rendered prose is checked against this plan before any
 * citizen sees it (see `verifier.ts`).
 */

/** One DECISIVE condition, with where the fact it tested came from. */
export interface PlannedCondition {
  readonly field: RuleField;
  readonly state: ConditionState;
  readonly soft: boolean;
  /** Reason copy authored with the rule — never model-authored. */
  readonly reason: LocalisedText;
  readonly actual?: unknown;
  /** Absent when the fact is unknown. */
  readonly provenance?: Pick<Provenance, 'source' | 'method' | 'probability' | 'note'>;
  /** The clause the condition encodes, when the rule author recorded one. */
  readonly citation?: string;
}

/**
 * What the system may do with this verdict — distinct from the verdict itself.
 * A confidently interpreted sentence is not a confidently decided entitlement.
 *
 *  decided            every decisive fact is accepted evidence or profile data
 *  needs_information  a required fact is unknown
 *  needs_confirmation a decisive fact is waiting for the citizen to confirm it
 *  review             a person should check before the citizen relies on it
 */
export type DecisionStatus = 'decided' | 'needs_information' | 'needs_confirmation' | 'review';

export interface PlannedOpportunity {
  readonly id: string;
  readonly slug: string;
  readonly title: LocalisedText;
  readonly summary: LocalisedText;
  readonly organisation: LocalisedText;
  readonly category: string;
  readonly outcome: EligibilityOutcome;
  readonly benefitAmount: number | null;
  readonly benefitPeriod: string | null;
  readonly deadline: Date | null;
  readonly relevance: number;
  /** Source reliability (record completeness × verification ceiling), 0–100. */
  readonly confidence: number;
  readonly verificationStatus: VerificationStatus;
  /** Kept for existing clients; true for anything short of `verified`. */
  readonly isUnverified: boolean;
  /** Reasons taken verbatim from the rule engine — never model-authored. */
  readonly metReasons: readonly LocalisedText[];
  readonly failedReasons: readonly LocalisedText[];
  readonly unknownReasons: readonly LocalisedText[];
  /** Soft conditions that failed: why a result is only "partially" eligible. */
  readonly softFailedReasons: readonly LocalisedText[];
  readonly conditions: readonly PlannedCondition[];
  readonly decisionStatus: DecisionStatus;
  readonly reviewReasons: readonly string[];
  /** Weakest model probability among the facts that decided this verdict; null if none were model-derived. */
  readonly evidenceStrength: number | null;
  readonly nextStep: LocalisedText | null;
  readonly sourceUrl: string | null;
}

export type PlanKind =
  | 'recommendations'
  | 'clarification'
  | 'no_results'
  | 'answer'
  | 'greeting'
  | 'out_of_scope';

/** Why a clarification is being asked. */
export type ClarificationKind = 'missing' | 'confirm' | 'conflict';

export interface PlanFact {
  readonly field: string;
  readonly value: unknown;
  readonly status: 'accepted' | 'needs_confirmation' | 'conflict';
  readonly method: string;
  readonly probability: number | null;
  readonly source: string;
  readonly label: LocalisedText;
}

export interface PlanEvidence {
  readonly engine: string;
  readonly degraded: boolean;
  /** What the citizen told us this turn and in this conversation, with status. */
  readonly facts: readonly PlanFact[];
  /** Accepted conversation facts the citizen may save to their profile. */
  readonly saveable: Readonly<Record<string, unknown>>;
}

export interface ResponsePlan {
  readonly kind: PlanKind;
  readonly locale: 'bn' | 'en';
  readonly intents: readonly Intent[];
  readonly lifeEvents: readonly LifeEvent[];
  readonly opportunities: readonly PlannedOpportunity[];
  /** Field to ask about, when `kind` is `clarification`. */
  readonly missingField?: RuleField;
  readonly missingFieldLabel?: LocalisedText;
  readonly missingFieldReason?: LocalisedText;
  readonly clarificationKind?: ClarificationKind;
  /** The value being confirmed, or the two values in conflict. */
  readonly clarificationValues?: { readonly stated?: LocalisedText; readonly profile?: LocalisedText };
  /** Retrieved passages the answer is grounded in. */
  readonly citations: readonly {
    readonly chunkId: string;
    readonly opportunityId: string | null;
    readonly title: string;
    readonly excerpt: string;
    readonly sourceUrl: string | null;
  }[];
  readonly overallConfidence: number;
  /** Set when nothing was retrieved — the model must not answer from memory. */
  readonly ungrounded: boolean;
  readonly evidence?: PlanEvidence;
}

export function pickLocalised(text: LocalisedText, locale: 'bn' | 'en'): string {
  return locale === 'bn' ? text.bn : text.en;
}

/** Authoring placeholder ("—") used for a branch that needs no explanation. */
export function isPlaceholderReason(text: LocalisedText): boolean {
  return /^[\s—–-]*$/.test(text.en) && /^[\s—–-]*$/.test(text.bn);
}

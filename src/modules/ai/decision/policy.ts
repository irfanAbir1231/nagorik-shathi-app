import type { RuleField } from '@/lib/domain/rules';

/**
 * Evidence acceptance policy — what OPERATIONAL consequence follows from a
 * probability.
 *
 * A Jev answer is evidence, not a decision. This table is where code decides
 * what that evidence may do:
 *
 *   p ≥ accept             → the fact is used by the rule engine this conversation
 *   confirm ≤ p < accept   → the fact is held; the citizen is asked to confirm it
 *   p < confirm            → not a fact (treated exactly like "not stated")
 *
 * WHERE THE NUMBERS COME FROM. Two inputs, kept separate on purpose:
 *   1. a POLICY choice per risk class — the precision we require before a fact
 *      may move a verdict (`targetPrecision`). This is a value judgment about
 *      harm and is owned by people, not fitted to data;
 *   2. a MEASUREMENT — the lowest threshold at which the model achieved that
 *      precision on our labelled, multilingual evaluation set
 *      (`npm run eval:jev -- --calibrate`).
 * Thresholds below record which run produced them. They started as the
 * vendor's published guidance (a 0.5 "genuinely unsure" floor; ≥0.85 for
 * high-stakes actions) and were then checked against our own labelled data —
 * see FIELD_THRESHOLD_SOURCE for what that run did and did not support.
 *
 * Thresholds are per question type as well as per field: the vendor documents
 * that a threshold tuned on a Noul does not transfer to a Choice.
 */

export const POLICY_VERSION = 'evidence-policy@1.1.0';

/**
 * Risk classes by the harm of a WRONG accepted fact.
 *  - grants:  the fact can satisfy a condition and so produce a false
 *             "you qualify" — the most harmful error in this product.
 *  - routes:  the fact only steers which programmes are looked at.
 *  - safety:  a flag whose false positive is cheap (a template answer instead
 *             of model prose) and whose false negative is not.
 */
export type RiskClass = 'grants' | 'routes' | 'safety';

export const TARGET_PRECISION: Record<RiskClass, number> = {
  grants: 0.97,
  routes: 0.85,
  safety: 0.5,
};

export interface Thresholds {
  readonly accept: number;
  readonly confirm: number;
}

export type EvidenceField = Extract<
  RuleField,
  | 'maritalStatus' | 'gender' | 'occupation' | 'education' | 'hasDisability' | 'isPregnant'
  | 'isStudent' | 'hasBusiness' | 'monthlyIncome' | 'age' | 'householdSize' | 'dependents'
  | 'landOwnershipDecimals' | 'cgpa' | 'district'
>;

export const EVIDENCE_FIELDS: readonly EvidenceField[] = [
  'maritalStatus', 'gender', 'occupation', 'education', 'hasDisability', 'isPregnant',
  'isStudent', 'hasBusiness', 'monthlyIncome', 'age', 'householdSize', 'dependents',
  'landOwnershipDecimals', 'cgpa', 'district',
];

export interface ThresholdSource {
  readonly source: 'provisional' | 'calibration';
  readonly run?: string;
  readonly note: string;
}

const PROVISIONAL: Thresholds = { accept: 0.9, confirm: 0.5 };

export const FIELD_THRESHOLDS: Record<EvidenceField, Thresholds> = {
  maritalStatus: PROVISIONAL,
  gender: PROVISIONAL,
  occupation: PROVISIONAL,
  education: PROVISIONAL,
  hasDisability: PROVISIONAL,
  isPregnant: PROVISIONAL,
  isStudent: PROVISIONAL,
  hasBusiness: PROVISIONAL,
  monthlyIncome: PROVISIONAL,
  age: PROVISIONAL,
  householdSize: PROVISIONAL,
  dependents: PROVISIONAL,
  landOwnershipDecimals: PROVISIONAL,
  cgpa: PROVISIONAL,
  district: PROVISIONAL,
};

/**
 * Evidence for the 0.90 / 0.50 thresholds (evaluation/results/jev-latest.md, jev-1.13.0,
 * 109 labelled cases, author-labelled, single annotator):
 *   at 0.90 — 148 facts accepted, precision 99.3% (95% Wilson lower bound 96.3%),
 *             coverage 91.9% of gold facts, 1 false assertion;
 *   the point estimate would allow 0.75 (98.1%), but NO threshold's lower bound
 *   reaches the 97% target on a sample this size, so the data does not justify
 *   lowering the threshold. Mid-range answers (0.6–0.8) were right only 1 time in
 *   13, which is why that band is "confirm", never "accept".
 * Re-run on a larger, independently labelled set before changing these values.
 */
export const FIELD_THRESHOLD_SOURCE: ThresholdSource = {
  source: 'calibration',
  run: 'jev-ablation@1.0.0 on turn-understanding@1.0.0 (see evaluation/results/jev-latest.md)',
  note: 'Conservative default retained: lowering it is not supported at the 95% lower bound on this sample.',
};

export const FIELD_RISK: Record<EvidenceField, RiskClass> = Object.fromEntries(
  EVIDENCE_FIELDS.map((field) => [field, 'grants']),
) as Record<EvidenceField, RiskClass>;

/** Non-fact judgments. */
export const ROUTING_THRESHOLDS = {
  /** A greeting/off-topic verdict skips retrieval, so it must be sure; otherwise treat as a situation. */
  messageKind: 0.9,
  /** The main situation narrows the SQL candidate set, so a weak topic is not used. */
  primarySituation: 0.7,
  /** Deliberately low: a false positive only swaps model prose for the template composer. */
  injection: 0.5,
} as const;

/** The explanation verifier rejects model prose at or above this contradiction probability. */
export const VERIFIER_THRESHOLDS = {
  contradiction: 0.5,
  unlistedProgramme: 0.5,
} as const;

/**
 * Without a semantic model there is no probability, and the pattern extractor
 * has MEASURED failure modes on exactly these fields (negation, third-party
 * statements, "widower" read as a woman, an age read as an income — see
 * evaluation/jev/README.md). Its facts are therefore never used unconfirmed.
 * `accept` exists only so the evaluation can reproduce the legacy behaviour.
 */
export type PatternPolicy = 'confirm' | 'accept';
export const PATTERN_POLICY: PatternPolicy = 'confirm';

export function statusFor(p: number, thresholds: Thresholds): 'accepted' | 'needs_confirmation' | null {
  if (p >= thresholds.accept) return 'accepted';
  if (p >= thresholds.confirm) return 'needs_confirmation';
  return null;
}

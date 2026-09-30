import {
  type RuleSet,
  type RuleNode,
  type RuleCondition,
  type RuleField,
  type LocalisedText,
} from '@/lib/domain/rules';
import { EDUCATION_RANK, type EducationLevel, type EligibilityOutcome } from '@/lib/domain/enums';

/**
 * The deterministic eligibility engine.
 *
 * PRD §24: "This module must not use an LLM." Nothing in this file imports an
 * AI provider, performs I/O, or reads the clock except through the injected
 * `now`. It is a pure function of (profile, ruleset) so it is fully testable
 * and its output is reproducible for audit.
 *
 * PRD Principle 4 — "AI should explain. Rules should decide."
 */

/* ------------------------------------------------------------------ types */

/** Flattened, engine-ready view of a citizen. `undefined` means NOT KNOWN. */
export interface EligibilityProfile {
  age?: number;
  gender?: string;
  district?: string;
  division?: string;
  monthlyIncome?: number;
  annualIncome?: number;
  occupation?: string;
  education?: EducationLevel;
  cgpa?: number;
  hasDisability?: boolean;
  disabilityType?: string;
  maritalStatus?: string;
  householdSize?: number;
  dependents?: number;
  landOwnershipDecimals?: number;
  isStudent?: boolean;
  hasBusiness?: boolean;
  businessType?: string;
  employees?: number;
  farmSizeDecimals?: number;
  crops?: string[];
  livestock?: string[];
  isPregnant?: boolean;
  medicalConditions?: string[];
  citizenship?: string;
  university?: string;
  department?: string;
  preferredCountry?: string;
  ieltsScore?: number;
  hasNid?: boolean;
  hasBankAccount?: boolean;
  isFreedomFighterFamily?: boolean;
  lifeEvents?: string[];
}

export type ConditionState = 'met' | 'failed' | 'unknown';

export interface ConditionTrace {
  readonly id: string;
  readonly field: RuleField;
  readonly operator: string;
  readonly state: ConditionState;
  readonly soft: boolean;
  readonly weight: number;
  /** The citizen-facing sentence for the state that occurred. */
  readonly reason: LocalisedText;
  /** What the citizen supplied, for the "we used this" audit line. */
  readonly actual?: string | number | boolean | readonly (string | number)[];
  readonly expected?: string | number | boolean | readonly (string | number)[];
  readonly citation?: string;
}

export interface GroupTrace {
  readonly id: string;
  readonly kind: 'all' | 'any' | 'none';
  readonly state: ConditionState;
  readonly label?: LocalisedText;
  readonly children: readonly NodeTrace[];
}

export type NodeTrace = ConditionTrace | GroupTrace;

export function isGroupTrace(t: NodeTrace): t is GroupTrace {
  return 'kind' in t;
}

export interface EvaluationResult {
  readonly outcome: EligibilityOutcome;
  readonly matched: readonly ConditionTrace[];
  readonly failed: readonly ConditionTrace[];
  readonly unknown: readonly ConditionTrace[];
  /** Soft conditions that failed — the reason for `partially_eligible`. */
  readonly softFailed: readonly ConditionTrace[];
  /** Required fields the profile is missing — drives the follow-up question. */
  readonly missingFields: readonly RuleField[];
  /** 0–100. How much of the rule set could actually be tested. */
  readonly ruleCoverage: number;
  /** 0–100 weighted eligibility score, the 40% ranking component (PRD §31). */
  readonly score: number;
  readonly trace: NodeTrace;
  readonly ruleVersion: number;
}

/* -------------------------------------------------------------- helpers */

const UNSET = Symbol('unset');

function readField(profile: EligibilityProfile, field: RuleField): unknown | typeof UNSET {
  const value = (profile as Record<string, unknown>)[field];
  if (value === undefined || value === null) return UNSET;
  if (typeof value === 'string' && value.trim() === '') return UNSET;
  if (Array.isArray(value) && value.length === 0) {
    // An empty array is a genuine "none of these" for set membership, but an
    // unknown for containment tests. Treated as known-empty; `contains_any`
    // against it correctly fails rather than asking again.
    return value;
  }
  return value;
}

/**
 * Ordinal coercion so `education >= 'hsc'` is meaningful. Education is the only
 * field with a defined order that is not already numeric.
 */
function toComparable(field: RuleField, value: unknown): number | string | boolean | null {
  if (field === 'education' && typeof value === 'string') {
    const rank = EDUCATION_RANK[value as EducationLevel];
    return rank === undefined ? null : rank;
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  return null;
}

function normaliseSetMember(field: RuleField, v: string | number): number | string {
  if (field === 'education' && typeof v === 'string') {
    const rank = EDUCATION_RANK[v as EducationLevel];
    return rank === undefined ? v : rank;
  }
  return v;
}

function describe(value: unknown): string | number | boolean | readonly (string | number)[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value as readonly (string | number)[];
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  return String(value);
}

/* ---------------------------------------------------- condition testing */

function testCondition(condition: RuleCondition, profile: EligibilityProfile): ConditionState {
  const raw = readField(profile, condition.field);

  // `exists` / `not_exists` are the only operators that are decidable on
  // absence; everything else must return `unknown` rather than guessing.
  if (condition.operator === 'exists') return raw === UNSET ? 'failed' : 'met';
  if (condition.operator === 'not_exists') return raw === UNSET ? 'met' : 'failed';
  if (raw === UNSET) return 'unknown';

  const actual = toComparable(condition.field, raw);
  const expected = condition.value;

  switch (condition.operator) {
    case 'eq':
      return actual === toComparable(condition.field, expected) ? 'met' : 'failed';
    case 'neq':
      return actual !== toComparable(condition.field, expected) ? 'met' : 'failed';
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const a = typeof actual === 'number' ? actual : Number(actual);
      const b = toComparable(condition.field, expected);
      const e = typeof b === 'number' ? b : Number(b);
      if (!Number.isFinite(a) || !Number.isFinite(e)) return 'unknown';
      if (condition.operator === 'gt') return a > e ? 'met' : 'failed';
      if (condition.operator === 'gte') return a >= e ? 'met' : 'failed';
      if (condition.operator === 'lt') return a < e ? 'met' : 'failed';
      return a <= e ? 'met' : 'failed';
    }
    case 'between': {
      if (!Array.isArray(expected) || expected.length !== 2) return 'unknown';
      const a = typeof actual === 'number' ? actual : Number(actual);
      const lo = Number(expected[0]);
      const hi = Number(expected[1]);
      if (!Number.isFinite(a) || !Number.isFinite(lo) || !Number.isFinite(hi)) return 'unknown';
      return a >= lo && a <= hi ? 'met' : 'failed';
    }
    case 'in':
    case 'not_in': {
      if (!Array.isArray(expected)) return 'unknown';
      const set = expected.map((v) => normaliseSetMember(condition.field, v));
      const hit = set.some((v) => v === actual);
      return condition.operator === 'in' ? (hit ? 'met' : 'failed') : hit ? 'failed' : 'met';
    }
    case 'contains_any':
    case 'contains_all': {
      if (!Array.isArray(expected)) return 'unknown';
      const haystack = Array.isArray(raw) ? (raw as unknown[]).map(String) : [String(raw)];
      const needles = expected.map(String);
      const hit =
        condition.operator === 'contains_any'
          ? needles.some((n) => haystack.includes(n))
          : needles.every((n) => haystack.includes(n));
      return hit ? 'met' : 'failed';
    }
    default:
      return 'unknown';
  }
}

function traceCondition(condition: RuleCondition, profile: EligibilityProfile): ConditionTrace {
  const state = testCondition(condition, profile);
  const raw = readField(profile, condition.field);

  const reason =
    state === 'met'
      ? condition.whenMet
      : state === 'failed'
        ? condition.whenFailed
        : (condition.whenUnknown ?? {
            // Fallback keeps the trace renderable even if an author omitted the
            // unknown copy; the admin rule linter warns about this separately.
            en: `We still need to know your ${humaniseField(condition.field, 'en')}.`,
            bn: `আপনার ${humaniseField(condition.field, 'bn')} জানা দরকার।`,
          });

  return {
    id: condition.id,
    field: condition.field,
    operator: condition.operator,
    state,
    soft: condition.soft ?? false,
    weight: condition.weight ?? 1,
    reason,
    actual: raw === UNSET ? undefined : describe(raw),
    expected: describe(condition.value),
    citation: condition.citation,
  };
}

/* -------------------------------------------------------- group logic */

/**
 * Three-valued combination.
 *
 * `all`  — a hard failure is decisive; otherwise any unknown blocks a verdict.
 * `any`  — a single success is decisive; otherwise any unknown blocks.
 * `none` — a success is a failure; otherwise any unknown blocks.
 *
 * Soft conditions never contribute a failure to the group state; they are
 * collected separately and downgrade the final outcome to partially_eligible.
 */
function combine(kind: 'all' | 'any' | 'none', childStates: readonly ConditionState[], softFlags: readonly boolean[]): ConditionState {
  const hardStates = childStates.filter((_, i) => !softFlags[i]);
  const effective = hardStates.length > 0 ? hardStates : childStates;

  const hasFailed = effective.includes('failed');
  const hasUnknown = effective.includes('unknown');
  const hasMet = effective.includes('met');

  if (kind === 'all') {
    if (hasFailed) return 'failed';
    if (hasUnknown) return 'unknown';
    return 'met';
  }
  if (kind === 'any') {
    if (hasMet) return 'met';
    if (hasUnknown) return 'unknown';
    return 'failed';
  }
  // none
  if (hasMet) return 'failed';
  if (hasUnknown) return 'unknown';
  return 'met';
}

interface Walked {
  readonly trace: NodeTrace;
  readonly state: ConditionState;
  readonly conditions: ConditionTrace[];
}

function walk(node: RuleNode, profile: EligibilityProfile): Walked {
  if (node.kind === 'condition') {
    const trace = traceCondition(node, profile);
    return { trace, state: trace.state, conditions: [trace] };
  }

  const walked = node.children.map((child) => walk(child, profile));
  const childStates = walked.map((w) => w.state);
  const softFlags = node.children.map((child) =>
    child.kind === 'condition' ? (child.soft ?? false) : false,
  );
  const state = combine(node.kind, childStates, softFlags);

  return {
    trace: {
      id: node.id,
      kind: node.kind,
      state,
      label: node.label,
      children: walked.map((w) => w.trace),
    },
    state,
    conditions: walked.flatMap((w) => w.conditions),
  };
}

/* --------------------------------------------------------- entry point */

export interface EvaluateOptions {
  readonly ruleVersion?: number;
}

export function evaluateEligibility(
  ruleSet: RuleSet,
  profile: EligibilityProfile,
  options: EvaluateOptions = {},
): EvaluationResult {
  const { trace, state, conditions } = walk(ruleSet.root, profile);

  /**
   * Reasons are ordered by WEIGHT descending, not by tree position.
   *
   * This matters for real explanations. A rule set almost always opens with a
   * near-universal precondition ("you are a Bangladeshi citizen"), and in
   * traversal order that becomes the first thing the citizen is told about why
   * they qualify — which explains nothing. Sorting by weight puts the
   * discriminating condition first: the age band, the income ceiling, the
   * widowhood. PRD Principle 2 requires the recommendation to explain WHY, and
   * only the specific conditions do that.
   */
  const byWeight = (a: ConditionTrace, b: ConditionTrace) => b.weight - a.weight;

  const matched = conditions.filter((c) => c.state === 'met').sort(byWeight);
  const failedAll = conditions.filter((c) => c.state === 'failed');
  const failed = failedAll.filter((c) => !c.soft).sort(byWeight);
  const softFailed = failedAll.filter((c) => c.soft).sort(byWeight);
  const unknown = conditions.filter((c) => c.state === 'unknown').sort(byWeight);

  const missingFields = ruleSet.requiredFields.filter(
    (f) => readField(profile, f) === UNSET,
  );

  const testable = conditions.length - unknown.length;
  const ruleCoverage = conditions.length === 0 ? 100 : Math.round((testable / conditions.length) * 100);

  const outcome = decideOutcome({ state, softFailed, missingFields, hardFailures: failed });

  // Weighted score over hard conditions only. Unknowns contribute nothing —
  // they neither reward nor punish, which keeps ranking honest for incomplete
  // profiles instead of pushing them to the bottom.
  const hardConditions = conditions.filter((c) => !c.soft);
  const totalWeight = hardConditions.reduce((sum, c) => sum + c.weight, 0);
  const earned = hardConditions
    .filter((c) => c.state === 'met')
    .reduce((sum, c) => sum + c.weight, 0);
  const score = totalWeight === 0 ? (outcome === 'eligible' ? 100 : 0) : Math.round((earned / totalWeight) * 100);

  return {
    outcome,
    matched,
    failed,
    unknown,
    softFailed,
    missingFields,
    ruleCoverage,
    score,
    trace,
    ruleVersion: options.ruleVersion ?? 1,
  };
}

function decideOutcome(input: {
  state: ConditionState;
  softFailed: readonly ConditionTrace[];
  missingFields: readonly RuleField[];
  hardFailures: readonly ConditionTrace[];
}): EligibilityOutcome {
  // A hard statutory bar is decisive even with an incomplete profile: a
  // programme restricted to women is not "unknown" for a man who has not yet
  // entered his income. Deciding this first avoids asking pointless questions.
  if (input.state === 'failed') return 'not_eligible';

  // Missing a field the rule set declares REQUIRED means we must ask, not
  // guess — PRD §22. This is the branch that prevents silent wrong denials.
  if (input.missingFields.length > 0) return 'unknown';
  if (input.state === 'unknown') return 'unknown';

  return input.softFailed.length > 0 ? 'partially_eligible' : 'eligible';
}

/* ------------------------------------------------------- presentation */

const FIELD_LABELS: Record<RuleField, LocalisedText> = {
  age: { en: 'age', bn: 'বয়স' },
  gender: { en: 'gender', bn: 'লিঙ্গ' },
  district: { en: 'district', bn: 'জেলা' },
  division: { en: 'division', bn: 'বিভাগ' },
  monthlyIncome: { en: 'monthly income', bn: 'মাসিক আয়' },
  annualIncome: { en: 'yearly income', bn: 'বার্ষিক আয়' },
  occupation: { en: 'occupation', bn: 'পেশা' },
  education: { en: 'education level', bn: 'শিক্ষাগত যোগ্যতা' },
  cgpa: { en: 'CGPA', bn: 'সিজিপিএ' },
  hasDisability: { en: 'disability status', bn: 'প্রতিবন্ধিতার তথ্য' },
  disabilityType: { en: 'type of disability', bn: 'প্রতিবন্ধিতার ধরন' },
  maritalStatus: { en: 'marital status', bn: 'বৈবাহিক অবস্থা' },
  householdSize: { en: 'household size', bn: 'পরিবারের সদস্য সংখ্যা' },
  dependents: { en: 'number of dependents', bn: 'নির্ভরশীল সদস্য সংখ্যা' },
  landOwnershipDecimals: { en: 'land ownership', bn: 'জমির পরিমাণ' },
  isStudent: { en: 'student status', bn: 'আপনি শিক্ষার্থী কি না' },
  hasBusiness: { en: 'business status', bn: 'ব্যবসা আছে কি না' },
  businessType: { en: 'type of business', bn: 'ব্যবসার ধরন' },
  employees: { en: 'number of employees', bn: 'কর্মী সংখ্যা' },
  farmSizeDecimals: { en: 'farm size', bn: 'খামারের আয়তন' },
  crops: { en: 'crops grown', bn: 'যে ফসল চাষ করেন' },
  livestock: { en: 'livestock', bn: 'গবাদি পশু' },
  isPregnant: { en: 'pregnancy status', bn: 'গর্ভাবস্থার তথ্য' },
  medicalConditions: { en: 'medical condition', bn: 'রোগ বা শারীরিক অবস্থা' },
  citizenship: { en: 'citizenship', bn: 'নাগরিকত্ব' },
  university: { en: 'university', bn: 'বিশ্ববিদ্যালয়' },
  department: { en: 'department', bn: 'বিভাগ' },
  preferredCountry: { en: 'preferred country', bn: 'পছন্দের দেশ' },
  ieltsScore: { en: 'IELTS score', bn: 'আইইএলটিএস স্কোর' },
  hasNid: { en: 'National ID', bn: 'জাতীয় পরিচয়পত্র' },
  hasBankAccount: { en: 'bank account', bn: 'ব্যাংক হিসাব' },
  isFreedomFighterFamily: { en: 'freedom fighter family status', bn: 'মুক্তিযোদ্ধা পরিবারের তথ্য' },
  lifeEvents: { en: 'current situation', bn: 'বর্তমান পরিস্থিতি' },
};

export function humaniseField(field: RuleField, locale: 'bn' | 'en'): string {
  return FIELD_LABELS[field][locale];
}

export function fieldLabel(field: RuleField): LocalisedText {
  return FIELD_LABELS[field];
}

import { understand } from '@/modules/ai/nlu';
import { redactPii } from '@/modules/ai/redact';
import { interpretWithDecisionModel, interpretWithPatterns, type EvidenceFact, type SemanticFrame } from '@/modules/ai/semantic-frame';
import { modelFrameSchema, parseJsonObject, hasVerbatimEvidence } from '@/modules/ai/civic-frame';
import { findNumberCandidates, findPlaceCandidates, toDecimals } from '@/modules/ai/candidates';
import { EVIDENCE_FIELDS, FIELD_THRESHOLDS, TARGET_PRECISION, type EvidenceField } from '@/modules/ai/decision/policy';
import type { DecisionModel } from '@/modules/ai/decision/types';
import type { LlmProvider } from '@/modules/ai/providers/types';
import { evaluateEligibility, type EligibilityProfile } from '@/modules/eligibility/engine';
import { SEED_OPPORTUNITIES } from '@/lib/db/seed';
import { INTENTS, LIFE_EVENTS } from '@/lib/domain/enums';
import { RULE_FIELDS } from '@/lib/domain/rules';
import { PROMPTS } from '@/prompts';
import { ELIGIBILITY_PROGRAMMES } from '../datasets/eligibility';
import { SEMANTIC_CASES, type GoldValue, type Lang, type SemanticCase } from './cases';
import { calibration, mapLimit, ratio, type CalibrationPoint } from './infra';

/**
 * Semantic interpretation benchmark: arms, scoring, calibration, and the
 * end-to-end effect on deterministic eligibility.
 */

export type ArmName = 'pattern_legacy' | 'pattern_confirm' | 'llm_all' | 'llm_accept' | 'llm_typed' | 'jev' | 'jev_any';
export type FrameArm = 'jev' | 'llm_typed';

export interface PredictedFact {
  readonly field: EvidenceField;
  readonly value: GoldValue;
  readonly probability: number | null;
  readonly status: 'accepted' | 'needs_confirmation';
}

export interface CaseRun {
  readonly caseId: string;
  readonly arms: Partial<Record<ArmName, readonly PredictedFact[]>>;
  readonly jevFrame: SemanticFrame | null;
  readonly jevError: string | null;
  /** The production fallback: the LLM answering the same typed questions. */
  readonly typedFrame: SemanticFrame | null;
  readonly typedError: string | null;
  readonly llmError: string | null;
  readonly llmFacts: readonly (PredictedFact & { rawField: string })[] | null;
  /** Would the production (strict) parser have accepted this LLM frame at all? */
  readonly llmStrictOk: boolean | null;
}

function fromEvidence(facts: readonly EvidenceFact[]): PredictedFact[] {
  return facts.map((f) => ({ field: f.field, value: f.value, probability: f.probability, status: f.status }));
}

/* ----------------------------------------------------------- LLM arm */

const MARITAL_SYNONYMS: Record<string, string> = { widow: 'widowed', widower: 'widowed', 'divorced_or_separated': 'separated', deserted: 'separated', 'never_married': 'single', unmarried: 'single' };
const GENDER_SYNONYMS: Record<string, string> = { woman: 'female', women: 'female', f: 'female', man: 'male', m: 'male' };

/** Maps the LLM frame's free-form values onto the evidence vocabulary, generously. */
function normaliseLlmFact(field: string, value: unknown): { field: EvidenceField; value: GoldValue } | null {
  const num = typeof value === 'number' ? value : typeof value === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(value) ? Number(value) : null;
  if (field === 'annualIncome' && num !== null) return { field: 'monthlyIncome', value: Math.round(num / 12) };
  if (!(EVIDENCE_FIELDS as readonly string[]).includes(field)) return null;
  const f = field as EvidenceField;
  if (['age', 'monthlyIncome', 'householdSize', 'dependents', 'landOwnershipDecimals', 'cgpa'].includes(f)) {
    return num === null ? null : { field: f, value: num };
  }
  if (['hasDisability', 'isPregnant', 'isStudent', 'hasBusiness'].includes(f)) {
    if (typeof value === 'boolean') return { field: f, value };
    if (typeof value === 'string') return { field: f, value: /^(true|yes|1)$/i.test(value.trim()) };
    return null;
  }
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (f === 'maritalStatus') return { field: f, value: MARITAL_SYNONYMS[v] ?? v };
  if (f === 'gender') return { field: f, value: GENDER_SYNONYMS[v] ?? v };
  return { field: f, value: v };
}

async function llmExtract(text: string, provider: LlmProvider) {
  const result = await provider.generate({
    system: PROMPTS.civicFrame.render({
      allowedFields: RULE_FIELDS.join(', '),
      allowedIntents: INTENTS.join(', '),
      allowedLifeEvents: LIFE_EVENTS.join(', '),
    }),
    user: text,
    maxTokens: 500,
    temperature: 0,
  });
  // Production parses the whole frame strictly and discards it on ANY schema
  // error. Scoring that would measure the parser, not the model, so the arm
  // parses each fact on its own and reports strict-schema failures separately.
  const raw = parseJsonObject(result.text) as { facts?: unknown };
  const strictOk = modelFrameSchema.safeParse(raw).success;
  const factSchema = modelFrameSchema.shape.facts.removeDefault().element;
  const facts: (PredictedFact & { rawField: string })[] = [];
  for (const candidate of Array.isArray(raw?.facts) ? raw.facts : []) {
    const parsedFact = factSchema.safeParse(candidate);
    if (!parsedFact.success) continue;
    const fact = parsedFact.data;
    // The production safeguard: evidence must be a verbatim span of the message.
    if (!hasVerbatimEvidence(text, fact.evidence)) continue;
    const n = normaliseLlmFact(fact.field, fact.value);
    if (!n) continue;
    facts.push({ ...n, probability: fact.confidence, status: 'accepted', rawField: fact.field });
  }
  return { facts, strictOk };
}

/* ------------------------------------------------------- case index */

const EXTRA_CASES = new Map<string, SemanticCase>();

/**
 * Registers cases from outside the built-in set (the independent field set),
 * so every scorer can resolve their labels by id.
 */
export function registerCases(cases: readonly SemanticCase[]): void {
  for (const c of cases) {
    if (SEMANTIC_CASES.some((x) => x.id === c.id)) throw new Error(`Case id "${c.id}" collides with the built-in set.`);
    EXTRA_CASES.set(c.id, c);
  }
}

function caseIndex(): Map<string, SemanticCase> {
  return new Map([...SEMANTIC_CASES.map((c) => [c.id, c] as const), ...EXTRA_CASES]);
}

/* ------------------------------------------------------------- runs */

export async function runSemanticArms(options: {
  readonly jev: DecisionModel | null;
  readonly llm: LlmProvider | null;
  /** The typed-LLM decision model (production fallback). */
  readonly llmTyped?: DecisionModel | null;
  /** Cases to run (default: the whole labelled set). */
  readonly cases?: readonly SemanticCase[];
  readonly concurrency: number;
  readonly onProgress?: (done: number, total: number) => void;
}): Promise<CaseRun[]> {
  let done = 0;
  const cases = options.cases ?? SEMANTIC_CASES;
  return mapLimit(cases, options.concurrency, async (c) => {
    // Production parity: every engine reads the REDACTED message, exactly as
    // runTurn sends it.
    const text = redactPii(c.text).text;
    const nlu = understand(text, c.lang === 'bn' ? 'bn' : 'en');
    const arms: Partial<Record<ArmName, readonly PredictedFact[]>> = {
      pattern_legacy: fromEvidence(interpretWithPatterns(text, nlu, 'accept').facts),
      pattern_confirm: fromEvidence(interpretWithPatterns(text, nlu, 'confirm').facts),
    };

    let jevFrame: SemanticFrame | null = null;
    let jevError: string | null = null;
    if (options.jev) {
      try {
        jevFrame = await interpretWithDecisionModel(text, options.jev);
        arms.jev = fromEvidence(jevFrame.facts);
        arms.jev_any = fromEvidence(jevFrame.facts).map((f) => ({ ...f, status: 'accepted' as const }));
      } catch (error) {
        jevError = error instanceof Error ? error.message : String(error);
      }
    }

    let typedFrame: SemanticFrame | null = null;
    let typedError: string | null = null;
    if (options.llmTyped) {
      try {
        typedFrame = await interpretWithDecisionModel(text, options.llmTyped);
        arms.llm_typed = fromEvidence(typedFrame.facts);
      } catch (error) {
        typedError = error instanceof Error ? error.message : String(error);
      }
    }

    let llmFacts: CaseRun['llmFacts'] = null;
    let llmError: string | null = null;
    let llmStrictOk: boolean | null = null;
    if (options.llm) {
      try {
        const extracted = await llmExtract(text, options.llm);
        llmFacts = extracted.facts;
        llmStrictOk = extracted.strictOk;
        arms.llm_all = llmFacts;
        // Same acceptance threshold as Jev's provisional policy, applied to the
        // LLM's self-reported confidence.
        arms.llm_accept = llmFacts.filter((f) => (f.probability ?? 0) >= FIELD_THRESHOLDS[f.field].accept);
      } catch (error) {
        llmError = error instanceof Error ? error.message : String(error);
      }
    }
    done += 1;
    options.onProgress?.(done, cases.length);
    return { caseId: c.id, arms, jevFrame, jevError, typedFrame, typedError, llmError, llmFacts, llmStrictOk };
  });
}

/* ---------------------------------------------------------- scoring */

function same(a: GoldValue, b: GoldValue): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= Math.max(0.5, Math.abs(b) * 0.01);
  return a === b;
}

interface Tally { tp: number; wrongValue: number; falseAssertion: number; missed: number; goldKnown: number; goldUnknown: number; heldCorrect: number; heldWrong: number }
const emptyTally = (): Tally => ({ tp: 0, wrongValue: 0, falseAssertion: 0, missed: 0, goldKnown: 0, goldUnknown: 0, heldCorrect: 0, heldWrong: 0 });

function summarise(t: Tally) {
  const asserted = t.tp + t.wrongValue + t.falseAssertion;
  const precision = ratio(t.tp, asserted);
  const recall = ratio(t.tp, t.goldKnown);
  return {
    ...t,
    asserted,
    precision,
    recall,
    f1: precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null,
    falseAssertionRate: ratio(t.falseAssertion, t.goldUnknown),
    wrongValueRate: ratio(t.wrongValue, t.goldKnown),
  };
}

function scoreCase(c: SemanticCase, facts: readonly PredictedFact[], into: Tally, perField?: Map<EvidenceField, Tally>): void {
  for (const field of EVIDENCE_FIELDS) {
    if (c.skip?.includes(field)) continue;
    const gold = c.facts[field];
    const accepted = facts.find((f) => f.field === field && f.status === 'accepted');
    const held = facts.find((f) => f.field === field && f.status === 'needs_confirmation');
    const targets = [into, ...(perField ? [perField.get(field) ?? (perField.set(field, emptyTally()), perField.get(field)!)] : [])];
    for (const t of targets) {
      if (gold === undefined) t.goldUnknown += 1;
      else t.goldKnown += 1;
      if (accepted) {
        if (gold === undefined) t.falseAssertion += 1;
        else if (same(accepted.value, gold)) t.tp += 1;
        else t.wrongValue += 1;
      } else if (gold !== undefined) {
        t.missed += 1;
      }
      if (held) {
        if (gold !== undefined && same(held.value, gold)) t.heldCorrect += 1;
        else t.heldWrong += 1;
      }
    }
  }
}

export function scoreArms(runs: readonly CaseRun[]) {
  const byId = caseIndex();
  const armNames: ArmName[] = ['pattern_legacy', 'pattern_confirm', 'llm_all', 'llm_accept', 'llm_typed', 'jev', 'jev_any'];
  const result: Record<string, unknown> = {};
  for (const arm of armNames) {
    const withArm = runs.filter((r) => r.arms[arm] !== undefined);
    if (withArm.length === 0) continue;
    const overall = emptyTally();
    const perField = new Map<EvidenceField, Tally>();
    const byLang = new Map<Lang, Tally>();
    const byCategory = new Map<string, Tally>();
    for (const run of withArm) {
      const c = byId.get(run.caseId)!;
      const facts = run.arms[arm]!;
      scoreCase(c, facts, overall, perField);
      scoreCase(c, facts, byLang.get(c.lang) ?? (byLang.set(c.lang, emptyTally()), byLang.get(c.lang)!));
      scoreCase(c, facts, byCategory.get(c.category) ?? (byCategory.set(c.category, emptyTally()), byCategory.get(c.category)!));
    }
    result[arm] = {
      cases: withArm.length,
      overall: summarise(overall),
      byLanguage: Object.fromEntries([...byLang].map(([k, v]) => [k, summarise(v)])),
      byCategory: Object.fromEntries([...byCategory].map(([k, v]) => [k, summarise(v)])),
      byField: Object.fromEntries([...perField].map(([k, v]) => [k, summarise(v)])),
    };
  }
  return result;
}

/* ------------------------------------------------------- calibration */

const CHOICE_FIELD_QUESTION: Partial<Record<EvidenceField, string>> = {
  maritalStatus: 'marital_status', gender: 'gender', occupation: 'occupation', education: 'education',
};
/** Three-way Choices (yes / explicitly no / not stated) since question set 2.0.0. */
const FLAG_FIELD_QUESTION: Partial<Record<EvidenceField, string>> = {
  hasDisability: 'has_disability', isPregnant: 'is_pregnant', isStudent: 'is_student', hasBusiness: 'has_business',
};

/** Which roles would make a candidate number equal to a gold fact. */
function goldRolesFor(c: SemanticCase, value: number, landUnit: ReturnType<typeof findNumberCandidates>[number]['landUnit']): string[] {
  const roles: string[] = [];
  const g = c.facts;
  if (g.age !== undefined && same(value, g.age)) roles.push('writer_age');
  if (g.monthlyIncome !== undefined && same(value, g.monthlyIncome)) roles.push('monthly_income');
  if (g.monthlyIncome !== undefined && same(Math.round(value / 12), g.monthlyIncome) && value !== 0) roles.push('yearly_income');
  if (g.householdSize !== undefined && same(value, g.householdSize)) roles.push('household_size');
  if (g.dependents !== undefined && same(value, g.dependents)) roles.push('children_count');
  if (g.cgpa !== undefined && same(value, g.cgpa)) roles.push('grade_point');
  const decimals = toDecimals(value, landUnit);
  if (g.landOwnershipDecimals !== undefined && decimals !== null && same(decimals, g.landOwnershipDecimals)) roles.push('land_area');
  return roles;
}

const NON_FIELD_ROLES = new Set(['other_age', 'other_money', 'other']);

export interface CalibrationReport {
  readonly topLabel: ReturnType<typeof calibration>;
  readonly choice: ReturnType<typeof calibration>;
  readonly flag: ReturnType<typeof calibration>;
  readonly numberRole: ReturnType<typeof calibration>;
  readonly byLanguage: Record<string, ReturnType<typeof calibration>>;
  readonly assertions: ReturnType<typeof calibration>;
  readonly llmAssertions: ReturnType<typeof calibration> | null;
}

export function calibrationReport(runs: readonly CaseRun[], arm: FrameArm = 'jev'): CalibrationReport {
  const byId = caseIndex();
  const choice: CalibrationPoint[] = [];
  const flag: CalibrationPoint[] = [];
  const numberRole: CalibrationPoint[] = [];
  const langPoints = new Map<string, CalibrationPoint[]>();
  const assertions: CalibrationPoint[] = [];
  const llmAssertions: CalibrationPoint[] = [];
  const push = (lang: string, list: CalibrationPoint[], point: CalibrationPoint) => {
    list.push(point);
    langPoints.set(lang, [...(langPoints.get(lang) ?? []), point]);
  };

  for (const run of runs) {
    const c = byId.get(run.caseId)!;
    const frame = arm === 'jev' ? run.jevFrame : run.typedFrame;
    // Candidates are found on the text the engine actually read (redacted).
    const text = redactPii(c.text).text;
    if (frame) {
      const judgment = new Map(frame.judgments.map((j) => [j.id, j]));
      for (const [field, qid] of Object.entries(CHOICE_FIELD_QUESTION) as [EvidenceField, string][]) {
        if (c.skip?.includes(field)) continue;
        const j = judgment.get(qid);
        if (!j) continue;
        const gold = c.facts[field];
        push(c.lang, choice, { p: j.probability, y: j.answer === (gold === undefined ? 'not_stated' : String(gold)) });
      }
      for (const [field, qid] of Object.entries(FLAG_FIELD_QUESTION) as [EvidenceField, string][]) {
        if (c.skip?.includes(field)) continue;
        const j = judgment.get(qid);
        if (!j) continue;
        const gold = c.facts[field];
        const goldOption = gold === true ? 'yes' : gold === false ? 'no' : 'not_stated';
        push(c.lang, flag, { p: j.probability, y: j.answer === goldOption });
      }
      if (!c.skip?.some((f) => ['age', 'monthlyIncome', 'householdSize', 'dependents', 'landOwnershipDecimals', 'cgpa'].includes(f))) {
        for (const candidate of findNumberCandidates(text)) {
          const j = judgment.get(`number_${candidate.index}`);
          if (!j) continue;
          const goldRoles = goldRolesFor(c, candidate.value, candidate.landUnit);
          const correct = goldRoles.length === 0 ? NON_FIELD_ROLES.has(j.answer) : goldRoles.includes(j.answer);
          push(c.lang, numberRole, { p: j.probability, y: correct });
        }
      }
      const places = findPlaceCandidates(text);
      const residence = judgment.get('residence');
      if (residence && places.length > 0 && !c.skip?.includes('district')) {
        push(c.lang, choice, { p: residence.probability, y: residence.answer === (c.facts.district ?? 'none') });
      }
      for (const f of frame.facts) {
        if (c.skip?.includes(f.field) || f.probability === null) continue;
        const gold = c.facts[f.field];
        assertions.push({ p: f.probability, y: gold !== undefined && same(f.value, gold) });
      }
    }
    for (const f of run.llmFacts ?? []) {
      if (c.skip?.includes(f.field) || f.probability === null) continue;
      const gold = c.facts[f.field];
      llmAssertions.push({ p: f.probability, y: gold !== undefined && same(f.value, gold) });
    }
  }

  return {
    topLabel: calibration([...choice, ...numberRole, ...flag]),
    choice: calibration(choice),
    flag: calibration(flag),
    numberRole: calibration(numberRole),
    byLanguage: Object.fromEntries([...langPoints].map(([k, v]) => [k, calibration(v)])),
    assertions: calibration(assertions),
    llmAssertions: runs.some((r) => r.llmFacts) ? calibration(llmAssertions) : null,
  };
}

/* ------------------------------------------------------------ bootstrap */

/** Deterministic PRNG (mulberry32) so intervals are reproducible. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const BOOTSTRAP = { resamples: 400, seed: 20260930 } as const;

/**
 * 95% percentile bootstrap over CASES (the unit of independence — the fields
 * and programmes within one case are not independent). Each case's
 * contribution is computed once; a resample only re-sums contributions.
 * Returns null when the metric is undefined in too many resamples.
 */
export function bootstrapInterval<T>(
  contributions: readonly T[],
  metric: (sample: readonly T[]) => number | null,
): { lo: number; hi: number } | null {
  if (contributions.length === 0) return null;
  const next = rng(BOOTSTRAP.seed);
  const values: number[] = [];
  for (let b = 0; b < BOOTSTRAP.resamples; b += 1) {
    const sample = Array.from({ length: contributions.length }, () => contributions[Math.floor(next() * contributions.length)]!);
    const v = metric(sample);
    if (v !== null && Number.isFinite(v)) values.push(v);
  }
  if (values.length < BOOTSTRAP.resamples * 0.8) return null;
  values.sort((a, b) => a - b);
  return { lo: values[Math.floor(values.length * 0.025)]!, hi: values[Math.min(values.length - 1, Math.floor(values.length * 0.975))]! };
}

interface CaseContribution { readonly tally: Tally; readonly verdicts: VerdictCounts }

/** Headline metrics with case-level 95% bootstrap intervals, per arm. */
export function headlineIntervals(runs: readonly CaseRun[], arms: readonly ArmName[]) {
  const byId = caseIndex();
  const programmes = benchmarkProgrammes();
  const out: Record<string, Record<string, { value: number | null; lo: number | null; hi: number | null }>> = {};
  for (const arm of arms) {
    const contributions: CaseContribution[] = runs.filter((r) => r.arms[arm] !== undefined).map((run) => {
      const c = byId.get(run.caseId)!;
      const tally = emptyTally();
      scoreCase(c, run.arms[arm]!, tally);
      return { tally, verdicts: caseVerdicts(c, run.arms[arm]!, programmes).counts };
    });
    if (contributions.length === 0) continue;
    const sumTally = (xs: readonly CaseContribution[]) => {
      const t = emptyTally();
      for (const x of xs) for (const k of Object.keys(t) as (keyof Tally)[]) t[k] += x.tally[k];
      return summarise(t);
    };
    const sumVerdicts = (xs: readonly CaseContribution[]) => {
      const v = emptyVerdicts();
      for (const x of xs) for (const k of Object.keys(v) as (keyof VerdictCounts)[]) v[k] += x.verdicts[k];
      return v;
    };
    const metrics: Record<string, (xs: readonly CaseContribution[]) => number | null> = {
      precision: (xs) => sumTally(xs).precision,
      recall: (xs) => sumTally(xs).recall,
      falseAssertionRate: (xs) => sumTally(xs).falseAssertionRate,
      falseEligibleRate: (xs) => { const v = sumVerdicts(xs); return ratio(v.falseEligible, v.decisions); },
      positiveRecall: (xs) => { const v = sumVerdicts(xs); return ratio(v.truePositive, v.goldPositive); },
    };
    out[arm] = Object.fromEntries(Object.entries(metrics).map(([name, fn]) => {
      const ci = bootstrapInterval(contributions, fn);
      return [name, { value: fn(contributions), lo: ci?.lo ?? null, hi: ci?.hi ?? null }];
    }));
  }
  return out;
}

/**
 * Threshold sweep over Jev's asserted facts: at each acceptance threshold,
 * how precise are the accepted facts, and how much gold do they cover. The
 * recommended threshold is the lowest meeting the policy's precision target —
 * the policy chooses the target, the data chooses the number.
 */
export function thresholdSweep(runs: readonly CaseRun[], arm: FrameArm = 'jev') {
  const byId = caseIndex();
  const items: { p: number; correct: boolean; falseAssertion: boolean }[] = [];
  let goldKnown = 0;
  for (const run of runs) {
    const c = byId.get(run.caseId)!;
    for (const field of EVIDENCE_FIELDS) if (!c.skip?.includes(field) && c.facts[field] !== undefined) goldKnown += 1;
    for (const f of (arm === 'jev' ? run.jevFrame : run.typedFrame)?.facts ?? []) {
      if (c.skip?.includes(f.field) || f.probability === null) continue;
      const gold = c.facts[f.field];
      items.push({ p: f.probability, correct: gold !== undefined && same(f.value, gold), falseAssertion: gold === undefined });
    }
  }
  const rows = [];
  for (let t = 0.5; t <= 0.991; t += 0.01) {
    const accepted = items.filter((i) => i.p >= t - 1e-9);
    const tp = accepted.filter((i) => i.correct).length;
    rows.push({
      threshold: Math.round(t * 100) / 100,
      accepted: accepted.length,
      precision: ratio(tp, accepted.length),
      precisionLower95: wilsonLower(tp, accepted.length),
      coverage: ratio(tp, goldKnown),
      falseAssertions: accepted.filter((i) => i.falseAssertion).length,
    });
  }
  const target = TARGET_PRECISION.grants;
  const minSupport = 20;
  // Point estimate: what a naive reading of the data suggests.
  const pointEstimate = rows.find((r) => r.accepted >= minSupport && (r.precision ?? 0) >= target) ?? null;
  // Defensible: the 95% Wilson LOWER bound on precision meets the target. On a
  // small, single-annotator set this may never happen — which is itself the
  // finding: the data cannot yet justify lowering the threshold.
  const supported = rows.find((r) => r.accepted >= minSupport && (r.precisionLower95 ?? 0) >= target) ?? null;
  return { target, minSupport, goldKnown, rows, pointEstimate, supported };
}

/** 95% Wilson score lower bound for a binomial proportion. */
export function wilsonLower(successes: number, n: number, z = 1.96): number | null {
  if (n === 0) return null;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return (centre - margin) / denom;
}

/** Every Jev disagreement with the labels, for audit. */
export function jevDisagreements(runs: readonly CaseRun[], arm: FrameArm = 'jev') {
  const byId = caseIndex();
  const out: { caseId: string; lang: string; category: string; field: string; gold: GoldValue | null; predicted: GoldValue | null; probability: number | null; status: string | null; kind: string }[] = [];
  for (const run of runs) {
    const c = byId.get(run.caseId)!;
    const facts = (arm === 'jev' ? run.jevFrame : run.typedFrame)?.facts ?? [];
    for (const field of EVIDENCE_FIELDS) {
      if (c.skip?.includes(field)) continue;
      const gold = c.facts[field];
      const f = facts.find((x) => x.field === field);
      if (!f && gold === undefined) continue;
      if (f && gold !== undefined && same(f.value, gold) && f.status === 'accepted') continue;
      out.push({
        caseId: c.id, lang: c.lang, category: c.category, field,
        gold: gold ?? null, predicted: f?.value ?? null, probability: f?.probability ?? null, status: f?.status ?? null,
        kind: !f ? 'missed'
          : gold === undefined ? (f.status === 'accepted' ? 'false_assertion' : 'held_not_stated')
            : !same(f.value, gold) ? (f.status === 'accepted' ? 'wrong_value' : 'held_wrong_value')
              : 'held_correct',
      });
    }
  }
  return out;
}

/* --------------------------------------------- situations, kind, injection */

/** Routing judgments of one engine (`engine`) against the keyword / pattern baseline (`baseline`). */
export function routingReport(runs: readonly CaseRun[], arm: FrameArm = 'jev') {
  const byId = caseIndex();
  const situation = { engine: { correct: 0, n: 0 }, keyword: { correct: 0, n: 0 } };
  const situationByLang = new Map<string, { engine: number; keyword: number; n: number }>();
  const kind = { engine: { correct: 0, n: 0 }, pattern: { correct: 0, n: 0 } };
  const inj = { engine: { tp: 0, fp: 0, pos: 0, neg: 0 }, pattern: { tp: 0, fp: 0, pos: 0, neg: 0 } };

  for (const run of runs) {
    const c = byId.get(run.caseId)!;
    const text = redactPii(c.text).text;
    const nlu = understand(text, c.lang === 'bn' ? 'bn' : 'en');
    const pattern = interpretWithPatterns(text, nlu);
    const frame = arm === 'jev' ? run.jevFrame : run.typedFrame;

    if (c.situation !== 'skip') {
      const accept = c.situation === 'none' ? ['none'] : c.situation;
      const keywordTop = nlu.lifeEvents[0]?.event ?? 'none';
      situation.keyword.n += 1;
      if (accept.includes(keywordTop as never)) situation.keyword.correct += 1;
      const lang = situationByLang.get(c.lang) ?? { engine: 0, keyword: 0, n: 0 };
      lang.n += 1;
      if (accept.includes(keywordTop as never)) lang.keyword += 1;
      if (frame) {
        const jevTop = frame.situation.event ?? 'none';
        situation.engine.n += 1;
        if (accept.includes(jevTop as never)) {
          situation.engine.correct += 1;
          lang.engine += 1;
        }
      }
      situationByLang.set(c.lang, lang);
    }

    const goldKind = c.kind ?? 'situation';
    kind.pattern.n += 1;
    if (pattern.messageKind.value === goldKind) kind.pattern.correct += 1;
    if (frame) {
      kind.engine.n += 1;
      if (frame.messageKind.value === goldKind) kind.engine.correct += 1;
    }

    const goldInjection = c.injection === true;
    const tally = (t: typeof inj.engine, flagged: boolean) => {
      if (goldInjection) {
        t.pos += 1;
        if (flagged) t.tp += 1;
      } else {
        t.neg += 1;
        if (flagged) t.fp += 1;
      }
    };
    tally(inj.pattern, pattern.injection.flagged);
    if (frame) tally(inj.engine, frame.injection.flagged);
  }

  const rate = (x: { correct: number; n: number }) => ratio(x.correct, x.n);
  return {
    situation: { engine: rate(situation.engine), keyword: rate(situation.keyword), n: situation.keyword.n },
    situationByLanguage: Object.fromEntries([...situationByLang].map(([k, v]) => [k, { engine: ratio(v.engine, v.n), keyword: ratio(v.keyword, v.n), n: v.n }])),
    messageKind: { engine: rate(kind.engine), pattern: rate(kind.pattern), n: kind.pattern.n },
    injection: {
      engine: { tpr: ratio(inj.engine.tp, inj.engine.pos), fpr: ratio(inj.engine.fp, inj.engine.neg), positives: inj.engine.pos, negatives: inj.engine.neg },
      pattern: { tpr: ratio(inj.pattern.tp, inj.pattern.pos), fpr: ratio(inj.pattern.fp, inj.pattern.neg), positives: inj.pattern.pos, negatives: inj.pattern.neg },
    },
  };
}

/* -------------------------------------------------- end-to-end eligibility */

function profileFrom(facts: Partial<Record<EvidenceField, GoldValue>>): EligibilityProfile {
  const p: Record<string, unknown> = { citizenship: 'bangladeshi', ...facts };
  if (typeof p.monthlyIncome === 'number') p.annualIncome = p.monthlyIncome * 12;
  return p as EligibilityProfile;
}

/**
 * What the extraction errors DO downstream: each case's facts are run through
 * the real rule engine on the benchmark programmes, and compared with the
 * verdicts the gold facts produce. The rule engine is the same in every arm, so
 * every difference is caused by interpretation.
 */
interface VerdictCounts { decisions: number; agree: number; falseEligible: number; falseDenial: number; overCautious: number; goldPositive: number; truePositive: number }
const emptyVerdicts = (): VerdictCounts => ({ decisions: 0, agree: 0, falseEligible: 0, falseDenial: 0, overCautious: 0, goldPositive: 0, truePositive: 0 });

function benchmarkProgrammes() {
  return ELIGIBILITY_PROGRAMMES.map((slug) => SEED_OPPORTUNITIES.find((o) => o.slug === slug)!);
}

/** One case's verdicts under an arm's accepted facts vs the gold facts. */
function caseVerdicts(c: SemanticCase, facts: readonly PredictedFact[], programmes: ReturnType<typeof benchmarkProgrammes>) {
  const positive = (o: string) => o === 'eligible' || o === 'partially_eligible';
  const counts = emptyVerdicts();
  const falseEligible: { programme: string; gold: string; predicted: string }[] = [];
  const goldFacts = Object.fromEntries(Object.entries(c.facts).filter(([f]) => !c.skip?.includes(f as EvidenceField)));
  const predFacts = Object.fromEntries(
    facts.filter((f) => f.status === 'accepted' && !c.skip?.includes(f.field)).map((f) => [f.field, f.value]),
  );
  const goldProfile = profileFrom(goldFacts);
  const predProfile = profileFrom(predFacts);
  for (const programme of programmes) {
    const gold = evaluateEligibility(programme.rules, goldProfile).outcome;
    const predicted = evaluateEligibility(programme.rules, predProfile).outcome;
    counts.decisions += 1;
    if (gold === predicted) counts.agree += 1;
    if (positive(gold)) counts.goldPositive += 1;
    if (positive(gold) && positive(predicted)) counts.truePositive += 1;
    if (positive(predicted) && !positive(gold)) {
      counts.falseEligible += 1;
      falseEligible.push({ programme: programme.slug, gold, predicted });
    }
    if (predicted === 'not_eligible' && gold !== 'not_eligible') counts.falseDenial += 1;
    if (predicted === 'unknown' && gold !== 'unknown') counts.overCautious += 1;
  }
  return { counts, falseEligible };
}

export function endToEndReport(runs: readonly CaseRun[]) {
  const byId = caseIndex();
  const programmes = benchmarkProgrammes();
  const arms: ArmName[] = ['pattern_legacy', 'pattern_confirm', 'llm_all', 'llm_accept', 'llm_typed', 'jev'];
  const out: Record<string, unknown> = {};
  for (const arm of arms) {
    const withArm = runs.filter((r) => r.arms[arm] !== undefined);
    if (withArm.length === 0) continue;
    const t = emptyVerdicts();
    const examples: { caseId: string; programme: string; gold: string; predicted: string }[] = [];
    for (const run of withArm) {
      const c = byId.get(run.caseId)!;
      const { counts, falseEligible } = caseVerdicts(c, run.arms[arm]!, programmes);
      for (const k of Object.keys(t) as (keyof VerdictCounts)[]) t[k] += counts[k];
      for (const e of falseEligible) if (examples.length < 12) examples.push({ caseId: c.id, ...e });
    }
    out[arm] = {
      decisions: t.decisions,
      agreement: ratio(t.agree, t.decisions),
      falseEligible: t.falseEligible,
      falseEligibleRate: ratio(t.falseEligible, t.decisions),
      falseDenial: t.falseDenial,
      falseDenialRate: ratio(t.falseDenial, t.decisions),
      overCautious: t.overCautious,
      overCautiousRate: ratio(t.overCautious, t.decisions),
      positiveRecall: ratio(t.truePositive, t.goldPositive),
      goldPositive: t.goldPositive,
      falseEligibleExamples: examples,
    };
  }
  return out;
}

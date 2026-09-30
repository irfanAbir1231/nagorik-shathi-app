import type { LifeEvent } from '@/lib/domain/enums';
import type { NluResult } from './nlu';
import { clausesOf, findNumberCandidates, findPlaceCandidates, toDecimals, type NumberCandidate } from './candidates';
import {
  buildTurnQuestions, isLifeEvent, QUESTION_SET_VERSION, type NumberRole,
} from './decision/questions';
import {
  PATTERN_POLICY, POLICY_VERSION, ROUTING_THRESHOLDS, statusFor, thresholdsFor,
  type EvidenceField, type ThresholdEngine, type Thresholds,
} from './decision/policy';
import { answerProbability, type Answer, type DecisionModel } from './decision/types';

/**
 * Semantic interpretation of ONE citizen message into typed evidence.
 *
 * Output is evidence with provenance, never a verdict. Each fact records what
 * was asked, what was answered, with what probability, under which threshold,
 * which clause of the message it rests on, and therefore what status it has.
 * The eligibility engine only ever sees `accepted` facts; `needs_confirmation`
 * facts become a question to the citizen.
 */

export type FactValue = string | number | boolean;
export type FactMethod = 'jev' | 'llm_typed' | 'pattern';

export interface EvidenceFact {
  readonly field: EvidenceField;
  readonly value: FactValue;
  readonly status: 'accepted' | 'needs_confirmation';
  /** Model probability for the answer; null when no probabilistic model was involved. */
  readonly probability: number | null;
  readonly method: FactMethod;
  /** Which question produced it — the single producer for this field. */
  readonly questionId: string;
  /** The option or role the model chose ("widowed", "writer_age", "yes"). */
  readonly answer: string;
  /** What in the message this rests on: the clause, the number span, or (if no clause could be identified) the message. */
  readonly evidence: string;
  /** How the evidence span was identified. */
  readonly span?: { readonly kind: 'clause' | 'number' | 'message'; readonly probability: number | null };
  readonly thresholds: Thresholds | null;
  readonly note?: string;
}

/** Every typed answer, kept verbatim for the audit log and calibration. */
export interface Judgment {
  readonly id: string;
  readonly type: Answer['type'];
  readonly answer: string;
  readonly probability: number;
  readonly confidence: number | null;
  readonly probabilities?: Readonly<Record<string, number>>;
}

export interface SemanticFrame {
  readonly engine: FactMethod;
  readonly model: string;
  readonly questionSetVersion: string;
  readonly policyVersion: string;
  readonly messageKind: { readonly value: 'situation' | 'greeting' | 'off_topic'; readonly probability: number | null };
  /** Retrieval TOPIC. Deliberately not a fact about the citizen. */
  readonly situation: { readonly event: LifeEvent | null; readonly probability: number | null };
  readonly facts: readonly EvidenceFact[];
  readonly injection: { readonly flagged: boolean; readonly probability: number | null };
  readonly judgments: readonly Judgment[];
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number; readonly latencyMs: number };
}

const EVIDENCE_EXCERPT = 160;

function judgmentOf(id: string, answer: Answer): Judgment {
  if (answer.type === 'noul') {
    return { id, type: 'noul', answer: answer.noul >= 0.5 ? 'yes' : 'no', probability: answer.noul, confidence: null };
  }
  return {
    id,
    type: answer.type,
    answer: answer.type === 'choice' ? answer.choice : String(answer.score),
    probability: answerProbability(answer),
    confidence: answer.confidence,
    probabilities: answer.probabilities,
  };
}

interface FactContext {
  readonly engine: ThresholdEngine;
  readonly method: FactMethod;
}

function fact(
  ctx: FactContext,
  field: EvidenceField,
  value: FactValue,
  probability: number,
  questionId: string,
  answer: string,
  evidence: string,
  span: EvidenceFact['span'],
  note?: string,
): EvidenceFact | null {
  const thresholds = thresholdsFor(ctx.engine, field);
  const status = statusFor(probability, thresholds);
  if (!status) return null;
  return {
    field, value, status, probability, method: ctx.method, questionId, answer,
    evidence: evidence.slice(0, EVIDENCE_EXCERPT), ...(span ? { span } : {}), thresholds, ...(note ? { note } : {}),
  };
}

/* ------------------------------------------------------------- numbers */

interface RoleHit {
  readonly candidate: NumberCandidate;
  readonly role: NumberRole;
  readonly probability: number;
}

const ROLE_FIELD: Partial<Record<NumberRole, EvidenceField>> = {
  writer_age: 'age',
  monthly_income: 'monthlyIncome',
  yearly_income: 'monthlyIncome',
  household_size: 'householdSize',
  children_count: 'dependents',
  land_area: 'landOwnershipDecimals',
  grade_point: 'cgpa',
};

/** Code-side range checks: a role the model picked must still be a plausible value. */
function valueForRole(hit: RoleHit): { value: number; note?: string } | null {
  const v = hit.candidate.value;
  switch (hit.role) {
    case 'writer_age': return v >= 1 && v <= 120 ? { value: v } : null;
    case 'monthly_income': return v >= 0 && v <= 10_000_000 ? { value: v } : null;
    case 'yearly_income': return v >= 0 && v <= 120_000_000 ? { value: Math.round(v / 12), note: `Stated per year (${v}); divided by 12.` } : null;
    case 'household_size': return v >= 1 && v <= 40 ? { value: v } : null;
    case 'children_count': return v >= 0 && v <= 40 ? { value: v } : null;
    case 'grade_point': return v >= 0 && v <= 5 ? { value: v } : null;
    case 'land_area': {
      const decimals = toDecimals(v, hit.candidate.landUnit);
      return decimals === null ? null : { value: decimals, note: `Converted from ${hit.candidate.landUnit ?? 'unknown unit'}.` };
    }
    default: return null;
  }
}

function numberFacts(
  ctx: FactContext,
  hits: readonly RoleHit[],
  noIncome: number,
  noIncomeSpan: { evidence: string; span: NonNullable<EvidenceFact['span']> },
): EvidenceFact[] {
  const out: EvidenceFact[] = [];
  const byField = new Map<EvidenceField, RoleHit[]>();
  for (const hit of hits) {
    const field = ROLE_FIELD[hit.role];
    if (!field) continue;
    byField.set(field, [...(byField.get(field) ?? []), hit]);
  }

  for (const [field, fieldHits] of byField) {
    const sorted = [...fieldHits].sort((a, b) => b.probability - a.probability);
    const best = sorted[0]!;
    const resolved = valueForRole(best);
    if (!resolved) continue;

    // Two different figures claiming the same role are ambiguous. The model
    // may be right about one, but code cannot tell which, so neither is used
    // unconfirmed.
    const rival = sorted.slice(1).find((h) => {
      const r = valueForRole(h);
      return r !== null && r.value !== resolved.value && h.probability >= thresholdsFor(ctx.engine, field).confirm;
    });
    // A stated figure and a stated absence of income contradict each other.
    const incomeClash = field === 'monthlyIncome' && noIncome >= thresholdsFor(ctx.engine, 'monthlyIncome').confirm;
    const probability = rival || incomeClash ? Math.min(best.probability, thresholdsFor(ctx.engine, field).accept - 1e-6) : best.probability;
    const note = rival
      ? `Two different numbers were read as ${field}.`
      : incomeClash ? 'A figure and "no income" were both stated.' : resolved.note;

    const f = fact(ctx, field, resolved.value, probability, `number_${best.candidate.index}`, best.role, `${best.candidate.surface} — "${best.candidate.clause}"`, { kind: 'number', probability: best.probability }, note);
    if (f) out.push(f);
  }

  if (!byField.has('monthlyIncome') && noIncome > 0) {
    const f = fact(ctx, 'monthlyIncome', 0, noIncome, 'no_income', 'yes', noIncomeSpan.evidence, noIncomeSpan.span, 'Stated that they have no income.');
    if (f) out.push(f);
  }
  return out;
}

/* ------------------------------------------------------ decision model */

const CHOICE_FIELDS: readonly [questionId: string, field: EvidenceField][] = [
  ['marital_status', 'maritalStatus'],
  ['gender', 'gender'],
  ['occupation', 'occupation'],
  ['education', 'education'],
];

/** Three-way self-facts: yes → true, an explicit denial → false, else nothing. */
const FLAG_FIELDS: readonly [questionId: string, field: EvidenceField][] = [
  ['has_disability', 'hasDisability'],
  ['is_pregnant', 'isPregnant'],
  ['is_student', 'isStudent'],
  ['has_business', 'hasBusiness'],
];

const HELD_FOR_INJECTION = 'Held for confirmation: this message also contained instructions to the system.';

/**
 * Interprets one message with a decision model — Jev, or the typed-LLM
 * fallback, which answers the same questions under the same contract. The
 * model's engine selects its thresholds and is recorded on every fact.
 */
export async function interpretWithDecisionModel(
  message: string,
  model: DecisionModel,
  signal?: AbortSignal,
): Promise<SemanticFrame> {
  const numbers = findNumberCandidates(message);
  const places = findPlaceCandidates(message);
  const clauses = clausesOf(message);
  const set = buildTurnQuestions(numbers, places, clauses);
  const method: FactMethod = model.engine === 'llm_typed' ? 'llm_typed' : 'jev';
  const ctx: FactContext = { engine: method === 'llm_typed' ? 'llm_typed' : 'jev', method };

  const result = await model.decide({ state: { message }, questions: set.questions, ...(signal ? { signal } : {}) });
  const a = result.answers;
  const judgments = Object.entries(a).map(([id, answer]) => judgmentOf(id, answer));
  const excerpt = message.slice(0, EVIDENCE_EXCERPT);

  /** The clause a self-fact rests on, if the span question identified one. */
  const spanFor = (questionId: string): { evidence: string; span: NonNullable<EvidenceFact['span']> } => {
    if (clauses.length <= 1) return { evidence: clauses[0] ?? excerpt, span: { kind: 'clause', probability: null } };
    const s = a[`span_${questionId}`];
    if (s?.type === 'choice' && s.choice !== 'none') {
      const p = answerProbability(s);
      const index = Number(s.choice.replace('clause_', ''));
      if (p >= 0.5 && clauses[index]) return { evidence: clauses[index]!, span: { kind: 'clause', probability: p } };
    }
    return { evidence: excerpt, span: { kind: 'message', probability: null } };
  };

  let facts: EvidenceFact[] = [];

  for (const [questionId, field] of CHOICE_FIELDS) {
    const answer = a[questionId];
    if (answer?.type !== 'choice' || answer.choice === 'not_stated') continue;
    const { evidence, span } = spanFor(questionId);
    const f = fact(ctx, field, answer.choice, answerProbability(answer), questionId, answer.choice, evidence, span);
    if (f) facts.push(f);
  }

  // "not_stated" produces nothing: silence is never evidence of "no". Only an
  // explicit denial by the writer produces a `false` fact.
  for (const [questionId, field] of FLAG_FIELDS) {
    const answer = a[questionId];
    if (answer?.type !== 'choice' || answer.choice === 'not_stated') continue;
    const { evidence, span } = spanFor(questionId);
    const f = fact(ctx, field, answer.choice === 'yes', answerProbability(answer), questionId, answer.choice, evidence, span,
      answer.choice === 'no' ? 'Stated explicitly by the writer.' : undefined);
    if (f) facts.push(f);
  }

  const noIncome = a.no_income?.type === 'noul' ? a.no_income.noul : 0;
  const hits: RoleHit[] = numbers.flatMap((candidate) => {
    const answer = a[`number_${candidate.index}`];
    if (answer?.type !== 'choice') return [];
    return [{ candidate, role: answer.choice as NumberRole, probability: answerProbability(answer) }];
  });
  facts.push(...numberFacts(ctx, hits, noIncome, spanFor('no_income')));

  const residence = a.residence;
  if (residence?.type === 'choice' && residence.choice !== 'none') {
    const place = places.find((p) => p.code === residence.choice);
    if (place) {
      const clause = clauses.find((c) => c.toLowerCase().includes(place.surface)) ?? excerpt;
      const f = fact(ctx, 'district', place.code, answerProbability(residence), 'residence', place.code, clause, { kind: 'clause', probability: null });
      if (f) facts.push(f);
    }
  }

  const kind = a.message_kind;
  const kindValue = kind?.type === 'choice' ? kind.choice : 'situation';
  const kindP = kind ? answerProbability(kind) : null;
  // Skipping retrieval needs certainty; when unsure, look for help anyway.
  const messageKind = (kindValue === 'greeting' || kindValue === 'off_topic') && (kindP ?? 0) >= ROUTING_THRESHOLDS.messageKind
    ? { value: kindValue as 'greeting' | 'off_topic', probability: kindP }
    : { value: 'situation' as const, probability: kindValue === 'situation' ? kindP : null };

  const situationAnswer = a.primary_situation;
  const situationP = situationAnswer ? answerProbability(situationAnswer) : null;
  const situationEvent = situationAnswer?.type === 'choice' && isLifeEvent(situationAnswer.choice) && (situationP ?? 0) >= ROUTING_THRESHOLDS.primarySituation
    ? situationAnswer.choice
    : null;

  const injectionP = a.instruction_injection?.type === 'noul' ? a.instruction_injection.noul : null;
  const injectionFlagged = (injectionP ?? 0) >= ROUTING_THRESHOLDS.injection;
  // A message that tries to instruct the system cannot be trusted to state
  // facts either (an injection may also steer the interpreter), so nothing it
  // says is used until the citizen confirms it.
  if (injectionFlagged) {
    facts = facts.map((f) => (f.status === 'accepted' ? { ...f, status: 'needs_confirmation' as const, note: HELD_FOR_INJECTION } : f));
  }

  return {
    engine: method,
    model: result.model,
    questionSetVersion: QUESTION_SET_VERSION,
    policyVersion: POLICY_VERSION,
    messageKind,
    situation: { event: situationEvent, probability: situationP },
    facts,
    injection: { flagged: injectionFlagged, probability: injectionP },
    judgments,
    usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, latencyMs: result.latencyMs },
  };
}

/* -------------------------------------------------------------- pattern */

const PATTERN_FIELDS: readonly EvidenceField[] = [
  'maritalStatus', 'gender', 'occupation', 'education', 'hasDisability', 'isPregnant', 'isStudent',
  'hasBusiness', 'monthlyIncome', 'age', 'householdSize', 'landOwnershipDecimals', 'cgpa', 'district',
];

/**
 * Deliberately crude, and only a fallback: with no semantic model there is no
 * probability to route on, so an instruction-shaped message is caught by its
 * surface form and the generative renderer is skipped.
 */
const INJECTION_PATTERNS = /ignore (?:all |the |your |previous |prior )*(?:instructions|rules)|disregard (?:the |your )?(?:rules|instructions)|treat (?:this|it|me) as verified|you must (?:say|tell|approve|mark)|system prompt|নির্দেশ(?:না)? (?:উপেক্ষা|অগ্রাহ্য)|যাচাইকৃত হিসেবে ধর|নিয়ম (?:মানবেন না|উপেক্ষা)/i;

export function interpretWithPatterns(message: string, nlu: NluResult, policy = PATTERN_POLICY): SemanticFrame {
  const excerpt = message.slice(0, EVIDENCE_EXCERPT);
  const profile = nlu.entities.profile as Record<string, unknown>;
  const facts: EvidenceFact[] = [];
  for (const field of PATTERN_FIELDS) {
    const value = profile[field];
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
    facts.push({
      field, value,
      status: policy === 'accept' ? 'accepted' : 'needs_confirmation',
      probability: null, method: 'pattern', questionId: 'pattern', answer: String(value),
      evidence: excerpt, thresholds: null,
      note: 'Matched by keyword pattern; negation and who-it-is-about are not checked.',
    });
  }
  return {
    engine: 'pattern',
    model: 'pattern-extractor-v1',
    questionSetVersion: 'pattern@1',
    policyVersion: POLICY_VERSION,
    messageKind: {
      value: nlu.isGreeting ? 'greeting' : nlu.isOutOfScope ? 'off_topic' : 'situation',
      probability: null,
    },
    situation: { event: nlu.lifeEvents[0]?.event ?? null, probability: null },
    facts,
    injection: { flagged: INJECTION_PATTERNS.test(message), probability: null },
    judgments: [],
    usage: { inputTokens: 0, outputTokens: 0, latencyMs: 0 },
  };
}

/** Accepted facts as the flat shape the rule engine reads. */
export function acceptedProfile(facts: readonly EvidenceFact[]): Record<string, FactValue> {
  const out: Record<string, FactValue> = {};
  for (const f of facts) if (f.status === 'accepted') out[f.field] = f.value;
  return out;
}

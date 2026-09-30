/**
 * The decision-model contract.
 *
 * A decision model answers TYPED questions about a state and returns typed,
 * probabilistic answers. It is deliberately a different contract from
 * `LlmProvider` (which returns text): nothing here is parsed out of prose, and
 * every answer is checked against the question that asked for it before any
 * caller sees it.
 *
 * The shapes mirror the TypeSafe System One API (POST /v1/systemone):
 * https://docs.typesafe.ai/api. Field names are the wire names.
 */

/** A question's `instructions` or a criterion: plain text or structured data. */
export type Instruction = string | Readonly<Record<string, unknown>> | readonly unknown[];

export interface NoulQuestion {
  readonly type: 'noul';
  readonly instructions: Instruction;
  readonly criteria?: { readonly true?: Instruction; readonly false?: Instruction };
}

export interface ChoiceQuestion {
  readonly type: 'choice';
  readonly instructions: Instruction;
  /** Option → rubric description (null when the option name says enough). */
  readonly criteria: Readonly<Record<string, Instruction | null>>;
}

export interface ScoreQuestion {
  readonly type: 'score';
  readonly instructions: Instruction;
  /** Ordered level descriptions, 2–10. */
  readonly criteria: readonly Instruction[];
}

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface NoulAnswer {
  readonly type: 'noul';
  /** P(yes), 0–1. Noul answers carry no separate confidence. */
  readonly noul: number;
}

export interface ChoiceAnswer {
  readonly type: 'choice';
  readonly choice: string;
  readonly probabilities: Readonly<Record<string, number>>;
  readonly confidence: number;
}

export interface ScoreAnswer {
  readonly type: 'score';
  readonly score: number;
  readonly legend: Readonly<Record<string, string>>;
  readonly probabilities: Readonly<Record<string, number>>;
  readonly confidence: number;
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface DecisionRequest {
  readonly state: unknown;
  readonly questions: Readonly<Record<string, Question>>;
  readonly signal?: AbortSignal;
}

export interface DecisionResult {
  readonly answers: Readonly<Record<string, Answer>>;
  /** Engine that answered; `mock` never reaches a citizen outside tests. */
  readonly engine: 'jev' | 'mock';
  /** The VERSIONED model id that answered (the API reports it even for aliases). */
  readonly model: string;
  readonly latencyMs: number;
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number };
}

export interface DecisionModel {
  readonly engine: 'jev' | 'mock';
  /** The model id requested. The answering id is on each result. */
  readonly model: string;
  decide(request: DecisionRequest): Promise<DecisionResult>;
}

/**
 * Every way a decision call can fail, named so each caller can choose its own
 * fallback. There is intentionally no blanket policy: a failed explanation
 * check fails closed, a failed turn-understanding call degrades to the pattern
 * extractor with confirmation required — see `decision/failure-policy.ts`.
 */
export type DecisionErrorKind =
  | 'unconfigured'
  | 'auth'
  | 'invalid_request'
  | 'rate_limited'
  | 'overloaded'
  | 'timeout'
  | 'aborted'
  | 'network'
  | 'server'
  | 'malformed_response';

export class DecisionModelError extends Error {
  constructor(
    readonly kind: DecisionErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'DecisionModelError';
  }
}

/** P(chosen option) for a Choice, P(yes) for a Noul — the number thresholds apply to. */
export function answerProbability(answer: Answer): number {
  if (answer.type === 'noul') return answer.noul;
  if (answer.type === 'choice') return answer.probabilities[answer.choice] ?? 0;
  const level = String(Math.round(answer.score));
  return answer.probabilities[level] ?? 0;
}

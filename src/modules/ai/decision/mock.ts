import { validateResponse } from './validate';
import type { Answer, DecisionModel, DecisionRequest, DecisionResult, Question } from './types';

/**
 * A scripted decision model for tests and offline demos.
 *
 * The responder receives each question and returns its answer; the result goes
 * through the SAME validator as a live Jev response, so a test cannot pass on a
 * shape production would reject.
 */
export type MockResponder = (id: string, question: Question, state: unknown) => Answer;

export class MockDecisionModel implements DecisionModel {
  readonly engine = 'mock' as const;
  readonly model = 'mock-decision-v1';
  readonly calls: DecisionRequest[] = [];

  constructor(private readonly responder: MockResponder) {}

  async decide(request: DecisionRequest): Promise<DecisionResult> {
    this.calls.push(request);
    const answers: Record<string, Answer> = {};
    for (const [id, question] of Object.entries(request.questions)) {
      answers[id] = this.responder(id, question, request.state);
    }
    const validated = validateResponse({ model: this.model, answers, usage: { input_tokens: 0, output_tokens: 0 } }, request.questions);
    return { answers: validated.answers, engine: 'mock', model: this.model, latencyMs: 0, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

/** A Choice answer putting `p` on `choice` and spreading the rest evenly. */
export function choiceAnswer(question: Question, choice: string, p = 0.98): Answer {
  if (question.type !== 'choice') throw new Error('choiceAnswer needs a choice question');
  const options = Object.keys(question.criteria);
  const rest = options.length > 1 ? (1 - p) / (options.length - 1) : 0;
  const probabilities = Object.fromEntries(options.map((o) => [o, o === choice ? p : rest]));
  const n = options.length;
  return { type: 'choice', choice, probabilities, confidence: n > 1 ? Math.max(0, (n * p - 1) / (n - 1)) : 1 };
}

export function noulAnswer(p: number): Answer {
  return { type: 'noul', noul: p };
}

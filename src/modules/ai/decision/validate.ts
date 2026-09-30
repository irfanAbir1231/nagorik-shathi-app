import { z } from 'zod';
import { DecisionModelError, type Answer, type Question } from './types';

/**
 * Validates a decision response against the questions that were asked.
 *
 * The vendor documents that answers are constrained to the schema. We check it
 * anyway, because "typed" is a property of the wire format, not of our code:
 * a missing answer, a Choice outside its criteria, or a probability outside
 * [0, 1] must fail loudly here rather than flow into the evidence ledger.
 */

const probability = z.number().finite().min(0).max(1);

const noulAnswer = z.object({ type: z.literal('noul'), noul: probability });
const choiceAnswer = z.object({
  type: z.literal('choice'),
  choice: z.string(),
  probabilities: z.record(probability),
  confidence: probability,
});
const scoreAnswer = z.object({
  type: z.literal('score'),
  score: z.number().finite(),
  legend: z.record(z.string()),
  probabilities: z.record(probability),
  confidence: probability,
});

const responseSchema = z.object({
  model: z.string().min(1),
  answers: z.record(z.unknown()),
  usage: z
    .object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative() })
    .partial()
    .optional(),
});

/** Probabilities are floats that should sum to 1; allow rounding slack. */
const SUM_TOLERANCE = 0.02;

function sumsToOne(probabilities: Record<string, number>): boolean {
  const total = Object.values(probabilities).reduce((sum, p) => sum + p, 0);
  return Math.abs(total - 1) <= SUM_TOLERANCE;
}

export interface ValidatedResponse {
  readonly model: string;
  readonly answers: Record<string, Answer>;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export function validateResponse(
  payload: unknown,
  questions: Readonly<Record<string, Question>>,
): ValidatedResponse {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new DecisionModelError('malformed_response', `Decision response has the wrong shape: ${parsed.error.issues[0]?.message ?? 'unknown'}`);
  }

  const answers: Record<string, Answer> = {};
  for (const [id, question] of Object.entries(questions)) {
    const raw = parsed.data.answers[id];
    if (raw === undefined) {
      throw new DecisionModelError('malformed_response', `No answer returned for question "${id}".`);
    }

    if (question.type === 'noul') {
      const answer = noulAnswer.safeParse(raw);
      if (!answer.success) throw new DecisionModelError('malformed_response', `Answer "${id}" is not a valid noul.`);
      answers[id] = answer.data;
      continue;
    }

    if (question.type === 'choice') {
      const answer = choiceAnswer.safeParse(raw);
      if (!answer.success) throw new DecisionModelError('malformed_response', `Answer "${id}" is not a valid choice.`);
      const options = Object.keys(question.criteria);
      if (!options.includes(answer.data.choice)) {
        throw new DecisionModelError('malformed_response', `Answer "${id}" chose "${answer.data.choice}", which was not offered.`);
      }
      if (Object.keys(answer.data.probabilities).some((option) => !options.includes(option))) {
        throw new DecisionModelError('malformed_response', `Answer "${id}" has a probability for an option that was not offered.`);
      }
      if (!sumsToOne(answer.data.probabilities)) {
        throw new DecisionModelError('malformed_response', `Answer "${id}" probabilities do not sum to 1.`);
      }
      answers[id] = answer.data;
      continue;
    }

    const answer = scoreAnswer.safeParse(raw);
    if (!answer.success) throw new DecisionModelError('malformed_response', `Answer "${id}" is not a valid score.`);
    if (!sumsToOne(answer.data.probabilities)) {
      throw new DecisionModelError('malformed_response', `Answer "${id}" probabilities do not sum to 1.`);
    }
    answers[id] = answer.data;
  }

  return {
    model: parsed.data.model,
    answers,
    inputTokens: parsed.data.usage?.input_tokens ?? 0,
    outputTokens: parsed.data.usage?.output_tokens ?? 0,
  };
}

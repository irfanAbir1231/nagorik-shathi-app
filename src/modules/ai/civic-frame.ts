import { z } from 'zod';
import { INTENTS, LIFE_EVENTS, type Intent, type LifeEvent } from '@/lib/domain/enums';
import { RULE_FIELDS, type RuleField } from '@/lib/domain/rules';
import type { SemanticEngine } from '@/lib/config/env';
import type { EligibilityProfile } from '@/modules/eligibility/engine';
import { PROMPTS } from '@/prompts';
import { understand, type NluResult } from './nlu';
import type { LlmProvider } from './providers/types';
import { DecisionModelError, type DecisionErrorKind, type DecisionModel } from './decision/types';
import {
  acceptedProfile, interpretWithDecisionModel, interpretWithPatterns,
  type EvidenceFact, type SemanticFrame,
} from './semantic-frame';

/**
 * The language-understanding stage: citizen text → structured, provenanced evidence.
 *
 * Three engines, one output contract:
 *
 *   jev      Typed probabilistic judgments (TypeSafe System One). Facts carry a
 *            probability and are accepted, held for confirmation, or dropped by
 *            `decision/policy.ts`. The preferred engine when configured.
 *   llm      The earlier generative "civic frame" (Model A). Kept for the
 *            ablation and for deployments without Jev. Its proposals are logged
 *            but never used; its facts come from the pattern extractor.
 *   pattern  Keyword patterns only. No probability exists, so every
 *            rights-relevant fact is held for citizen confirmation.
 *
 * Failure policy for this stage: any Jev failure degrades to `pattern` for the
 * turn (facts held for confirmation, never trusted), and says so.
 *
 * Invariant: no engine's output is an eligibility decision. The rule engine
 * receives only ACCEPTED facts, via the evidence ledger.
 */
export const CIVIC_FRAME_VERSION = 'civic-frame-v2.0.0';

/** An LLM proposal (engine `llm` only). Logged for comparison; never used. */
export interface ModelProposal {
  readonly field: RuleField;
  readonly value: string | number | boolean | readonly string[];
  readonly confidence: number;
  /** Exact text span supplied by the citizen. */
  readonly evidence: string;
  readonly source: 'model';
}

export interface CivicFrameModelCall {
  readonly attempted: boolean;
  readonly accepted: boolean;
  readonly engine: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly latencyMs: number;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly error?: string;
}

export interface DecisionCall {
  readonly attempted: boolean;
  readonly ok: boolean;
  readonly model: string;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly errorKind?: DecisionErrorKind;
  readonly error?: string;
}

export interface CivicFrame {
  readonly version: typeof CIVIC_FRAME_VERSION;
  readonly engine: SemanticEngine;
  /** True when the configured engine failed and a weaker one answered. */
  readonly degraded: boolean;
  readonly locale: 'bn' | 'en';
  readonly intents: readonly Intent[];
  /** Retrieval topics (a filter, not facts about the citizen). */
  readonly lifeEvents: readonly LifeEvent[];
  /** The situation named back to the citizen ("I understand: …"). */
  readonly situation: LifeEvent | null;
  readonly isGreeting: boolean;
  readonly isOutOfScope: boolean;
  /** Every fact with its status and provenance. */
  readonly evidence: readonly EvidenceFact[];
  readonly semantic: SemanticFrame;
  readonly proposedFacts: readonly ModelProposal[];
  readonly uncertainFacts: readonly RuleField[];
  readonly normalizedQuery: string;
  readonly retrievalQuery: string;
  readonly candidateProgrammeHints: readonly string[];
  readonly nlu: NluResult;
  readonly modelCall: CivicFrameModelCall;
  readonly decisionCall: DecisionCall;
}

const factValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);

/** Exported for the evaluation harness, which scores the LLM frame as an extraction arm. */
export const modelFrameSchema = z.object({
  intents: z.array(z.enum(INTENTS)).max(4).default([]),
  lifeEvents: z.array(z.enum(LIFE_EVENTS)).max(4).default([]),
  facts: z.array(z.object({
    field: z.enum(RULE_FIELDS),
    value: factValueSchema,
    confidence: z.number().min(0).max(1),
    evidence: z.string().min(1).max(160),
  })).max(16).default([]),
  uncertainFacts: z.array(z.enum(RULE_FIELDS)).max(16).default([]),
  normalizedQuery: z.string().min(1).max(500),
  candidateProgrammeHints: z.array(z.string().min(1).max(100)).max(8).default([]),
});

export function parseJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model returned no JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

export function hasVerbatimEvidence(message: string, evidence: string): boolean {
  return message.toLocaleLowerCase().includes(evidence.trim().toLocaleLowerCase());
}

/** Consequential facts no engine may infer: they must come from the citizen's profile. */
function defaultUnknowns(known: ReadonlySet<RuleField>): RuleField[] {
  const highImpact: readonly RuleField[] = ['citizenship', 'occupation', 'hasNid'];
  return highImpact.filter((field) => !known.has(field));
}

const NO_DECISION_CALL: DecisionCall = { attempted: false, ok: false, model: '', latencyMs: 0, inputTokens: 0, outputTokens: 0 };

export async function inferCivicFrame(input: {
  readonly message: string;
  readonly fallbackLocale?: 'bn' | 'en';
  readonly provider: LlmProvider;
  readonly decisionModel?: DecisionModel | null;
  readonly engine?: SemanticEngine;
  readonly signal?: AbortSignal;
}): Promise<CivicFrame> {
  const nlu = understand(input.message, input.fallbackLocale);
  const requested: SemanticEngine = input.engine ?? (input.decisionModel ? 'jev' : input.provider.isLive ? 'llm' : 'pattern');
  const keywordEvents = nlu.lifeEvents.map((event) => event.event);
  const baseCall: CivicFrameModelCall = {
    attempted: false,
    accepted: false,
    engine: input.provider.engine,
    model: input.provider.model,
    promptVersion: PROMPTS.civicFrame.version,
    latencyMs: 0,
    tokensIn: 0,
    tokensOut: 0,
  };

  const assemble = (
    semantic: SemanticFrame,
    engine: SemanticEngine,
    extra: Partial<Pick<CivicFrame, 'proposedFacts' | 'normalizedQuery' | 'retrievalQuery' | 'candidateProgrammeHints' | 'modelCall' | 'decisionCall' | 'degraded' | 'intents' | 'lifeEvents'>> = {},
  ): CivicFrame => {
    const known = new Set(semantic.facts.filter((f) => f.status === 'accepted').map((f) => f.field as RuleField));
    const normalizedQuery = input.message.trim();
    // Retrieval topics: the semantic situation plus explicit keyword hits. A
    // topic only widens the SQL candidate set (the filter is an OR), and a
    // negated keyword ("he has not died") can at worst add a programme the
    // rule engine then evaluates. Facts are never taken from topics.
    const topics = [...new Set([...(semantic.situation.event ? [semantic.situation.event] : []), ...keywordEvents])];
    const isGreeting = semantic.messageKind.value === 'greeting';
    const isOutOfScope = semantic.messageKind.value === 'off_topic';
    return {
      version: CIVIC_FRAME_VERSION,
      engine,
      degraded: false,
      locale: nlu.locale,
      intents: nlu.intents,
      lifeEvents: topics,
      situation: semantic.situation.event,
      isGreeting,
      isOutOfScope,
      evidence: semantic.facts,
      semantic,
      proposedFacts: [],
      uncertainFacts: defaultUnknowns(known),
      normalizedQuery,
      retrievalQuery: normalizedQuery,
      candidateProgrammeHints: [],
      nlu: { ...nlu, isGreeting, isOutOfScope },
      modelCall: baseCall,
      decisionCall: NO_DECISION_CALL,
      ...extra,
    };
  };

  const patternFrame = () => interpretWithPatterns(input.message, nlu);

  /* ---------------------------------------------------------------- jev */
  if (requested === 'jev') {
    if (!input.decisionModel) {
      return assemble(patternFrame(), 'pattern', {
        degraded: true,
        decisionCall: { ...NO_DECISION_CALL, attempted: true, errorKind: 'unconfigured', error: 'No decision model is configured.' },
      });
    }
    try {
      const semantic = await interpretWithDecisionModel(input.message, input.decisionModel, input.signal);
      return assemble(semantic, 'jev', {
        decisionCall: {
          attempted: true,
          ok: true,
          model: semantic.model,
          latencyMs: semantic.usage.latencyMs,
          inputTokens: semantic.usage.inputTokens,
          outputTokens: semantic.usage.outputTokens,
        },
      });
    } catch (error) {
      const kind: DecisionErrorKind = error instanceof DecisionModelError ? error.kind : 'malformed_response';
      return assemble(patternFrame(), 'pattern', {
        degraded: true,
        decisionCall: {
          ...NO_DECISION_CALL,
          attempted: true,
          model: input.decisionModel.model,
          errorKind: kind,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /* ------------------------------------------------------------ pattern */
  if (requested === 'pattern' || !input.provider.isLive || nlu.isGreeting || nlu.isOutOfScope) {
    return assemble(patternFrame(), requested === 'llm' ? 'llm' : 'pattern');
  }

  /* ---------------------------------------------------------------- llm */
  const semantic = patternFrame();
  const patternFields = new Set(semantic.facts.map((f) => f.field as RuleField));
  try {
    const result = await input.provider.generate({
      system: PROMPTS.civicFrame.render({
        allowedFields: RULE_FIELDS.join(', '),
        allowedIntents: INTENTS.join(', '),
        allowedLifeEvents: LIFE_EVENTS.join(', '),
      }),
      user: input.message,
      maxTokens: 500,
      temperature: 0,
      ...(input.signal ? { signal: input.signal } : {}),
    });
    const parsed = modelFrameSchema.parse(parseJsonObject(result.text));
    const proposedFacts: ModelProposal[] = parsed.facts
      .filter((fact) => !patternFields.has(fact.field))
      .filter((fact) => hasVerbatimEvidence(input.message, fact.evidence))
      .map((fact) => ({ ...fact, source: 'model' as const }));
    const normalizedQuery = parsed.normalizedQuery.trim();
    return assemble(semantic, 'llm', {
      intents: [...new Set([...nlu.intents, ...parsed.intents])],
      lifeEvents: [...new Set([...keywordEvents, ...parsed.lifeEvents])],
      proposedFacts,
      normalizedQuery,
      retrievalQuery: [input.message, normalizedQuery, ...parsed.candidateProgrammeHints].join('\n'),
      candidateProgrammeHints: parsed.candidateProgrammeHints,
      modelCall: {
        attempted: true,
        accepted: true,
        engine: result.engine,
        model: result.model,
        promptVersion: PROMPTS.civicFrame.version,
        latencyMs: result.latencyMs,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      },
    });
  } catch (error) {
    return assemble(semantic, 'llm', {
      modelCall: { ...baseCall, attempted: true, error: error instanceof Error ? error.message : String(error) },
    });
  }
}

/**
 * Safe profile projection: only ACCEPTED facts cross the rights boundary.
 * A pattern match is never accepted unconfirmed; a Jev fact is accepted only
 * above its field's calibrated threshold.
 */
export function confirmedProfile(frame: CivicFrame): Partial<EligibilityProfile> {
  return acceptedProfile(frame.evidence) as Partial<EligibilityProfile>;
}

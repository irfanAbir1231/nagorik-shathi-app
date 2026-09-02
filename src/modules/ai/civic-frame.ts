import { z } from 'zod';
import { INTENTS, LIFE_EVENTS, type Intent, type LifeEvent } from '@/lib/domain/enums';
import { RULE_FIELDS, type RuleField } from '@/lib/domain/rules';
import type { EligibilityProfile } from '@/modules/eligibility/engine';
import { PROMPTS } from '@/prompts';
import { understand, type NluResult } from './nlu';
import type { LlmProvider } from './providers/types';

/** Versioned, inspectable contract for the language-understanding inference stage. */
export const CIVIC_FRAME_VERSION = 'civic-frame-v1.0.0';

type FactValue = string | number | boolean | readonly string[];

export interface CivicFact {
  readonly field: RuleField;
  readonly value: FactValue;
  readonly confidence: number;
  /** Exact text span supplied by the citizen. */
  readonly evidence: string;
  readonly source: 'deterministic' | 'model';
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

export interface CivicFrame {
  readonly version: typeof CIVIC_FRAME_VERSION;
  readonly locale: 'bn' | 'en';
  readonly intents: readonly Intent[];
  readonly lifeEvents: readonly LifeEvent[];
  /** Conservative facts that may be persisted and passed to the rule engine. */
  readonly confirmedFacts: readonly CivicFact[];
  /** Model suggestions are retrieval hints only until the citizen confirms them. */
  readonly proposedFacts: readonly CivicFact[];
  readonly uncertainFacts: readonly RuleField[];
  readonly normalizedQuery: string;
  readonly retrievalQuery: string;
  readonly candidateProgrammeHints: readonly string[];
  readonly nlu: NluResult;
  readonly modelCall: CivicFrameModelCall;
}

const factValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

const modelFrameSchema = z.object({
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

function valueOf(value: unknown): FactValue | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  return null;
}

function deterministicFacts(message: string, nlu: NluResult): CivicFact[] {
  const facts: CivicFact[] = [];
  for (const [field, raw] of Object.entries(nlu.entities.profile) as [RuleField, unknown][]) {
    const value = valueOf(raw);
    if (value === null) continue;
    facts.push({
      field,
      value,
      confidence: 0.98,
      evidence: message.slice(0, 160),
      source: 'deterministic',
    });
  }
  return facts;
}

function parseJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model returned no JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

function hasVerbatimEvidence(message: string, evidence: string): boolean {
  return message.toLocaleLowerCase().includes(evidence.trim().toLocaleLowerCase());
}

function defaultUnknowns(confirmed: ReadonlySet<RuleField>): RuleField[] {
  const highImpact: readonly RuleField[] = ['citizenship', 'occupation', 'hasNid'];
  return highImpact.filter((field) => !confirmed.has(field));
}

/**
 * Model A: Bangla/English civic intent and fact-frame inference.
 *
 * The deterministic NLU remains the authority for persisted facts. A live model
 * may add inspectable proposals and normalize the retrieval query, but proposed
 * values never enter eligibility. This preserves the boundary: AI interprets
 * language; deterministic rules decide rights.
 */
export async function inferCivicFrame(input: {
  readonly message: string;
  readonly fallbackLocale?: 'bn' | 'en';
  readonly provider: LlmProvider;
  readonly signal?: AbortSignal;
}): Promise<CivicFrame> {
  const nlu = understand(input.message, input.fallbackLocale);
  const confirmedFacts = deterministicFacts(input.message, nlu);
  const confirmedFields = new Set(confirmedFacts.map((fact) => fact.field));
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

  if (!input.provider.isLive || nlu.isGreeting || nlu.isOutOfScope) {
    const normalizedQuery = input.message.trim();
    return {
      version: CIVIC_FRAME_VERSION,
      locale: nlu.locale,
      intents: nlu.intents,
      lifeEvents: nlu.lifeEvents.map((event) => event.event),
      confirmedFacts,
      proposedFacts: [],
      uncertainFacts: defaultUnknowns(confirmedFields),
      normalizedQuery,
      retrievalQuery: normalizedQuery,
      candidateProgrammeHints: [],
      nlu,
      modelCall: baseCall,
    };
  }

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
    const proposedFacts = parsed.facts
      .filter((fact) => !confirmedFields.has(fact.field))
      .filter((fact) => hasVerbatimEvidence(input.message, fact.evidence))
      .map((fact) => ({ ...fact, source: 'model' as const }));
    const intents = [...new Set([...nlu.intents, ...parsed.intents])];
    const lifeEvents = [...new Set([...nlu.lifeEvents.map((event) => event.event), ...parsed.lifeEvents])];
    const uncertainFacts = [...new Set([
      ...defaultUnknowns(confirmedFields),
      ...parsed.uncertainFacts.filter((field) => !confirmedFields.has(field)),
    ])];
    const normalizedQuery = parsed.normalizedQuery.trim();
    const retrievalQuery = [input.message, normalizedQuery, ...parsed.candidateProgrammeHints].join('\n');

    return {
      version: CIVIC_FRAME_VERSION,
      locale: nlu.locale,
      intents,
      lifeEvents,
      confirmedFacts,
      proposedFacts,
      uncertainFacts,
      normalizedQuery,
      retrievalQuery,
      candidateProgrammeHints: parsed.candidateProgrammeHints,
      nlu: { ...nlu, intents },
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
    };
  } catch (error) {
    const normalizedQuery = input.message.trim();
    return {
      version: CIVIC_FRAME_VERSION,
      locale: nlu.locale,
      intents: nlu.intents,
      lifeEvents: nlu.lifeEvents.map((event) => event.event),
      confirmedFacts,
      proposedFacts: [],
      uncertainFacts: defaultUnknowns(confirmedFields),
      normalizedQuery,
      retrievalQuery: normalizedQuery,
      candidateProgrammeHints: [],
      nlu,
      modelCall: {
        ...baseCall,
        attempted: true,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/** Safe profile projection: only deterministic facts cross the rights boundary. */
export function confirmedProfile(frame: CivicFrame): Partial<EligibilityProfile> {
  return frame.nlu.entities.profile;
}

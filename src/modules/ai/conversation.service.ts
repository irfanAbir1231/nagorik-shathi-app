import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  conversations, messages, aiLogs, userProfiles, users,
  type Conversation, type Message,
} from '@/lib/db/schema';
import type { NluResult } from './nlu';
import { inferCivicFrame, type CivicFrame } from './civic-frame';
import { retrieve, retrieveByLifeEvents, opportunityIdsFrom, type RetrievedChunk } from '@/modules/knowledge/retrieval';
import { listOpportunities, recordEvaluation, type EnrichedOpportunity } from '@/modules/opportunities/opportunity.service';
import { toEligibilityProfile } from '@/modules/eligibility/profile-mapper';
import { ENGINE_VERSION, fieldLabel, type ConditionTrace, type EligibilityProfile } from '@/modules/eligibility/engine';
import { renderTurn, type RenderPath } from './render';
import { getProvider } from './providers';
import { getDecisionModel } from './decision/jev';
import { LlmTypedDecisionModel } from './decision/llm-typed';
import { redactPii, REDACTION_VERSION } from './redact';
import { STAGE_BUDGET_MS, TurnBudget } from './budget';
import { encryptField } from '@/lib/security/field-encryption';
import { env, resolveSemanticEngine } from '@/lib/config/env';
import { judgeRelevance, RELEVANCE_VERSION } from './relevance';
import type { Judgment } from './semantic-frame';
import { PROMPTS } from '@/prompts';
export type { RenderPath } from './render';
import {
  isPlaceholderReason,
  type DecisionStatus, type PlanEvidence, type PlanFact, type PlannedCondition, type PlannedOpportunity, type ResponsePlan,
} from './response-plan';
import { buildLedger, foldConversationFacts, type ConversationFact, type FactDecision, type Ledger } from './evidence';

export type { FactDecision } from './evidence';
import { factLabel, valueLabel } from './fact-labels';
import { VERIFIER_VERSION } from './verifier';
import type { EvidenceFact } from './semantic-frame';
import type { Intent } from '@/lib/domain/enums';
import type { RuleField } from '@/lib/domain/rules';
import { decryptStringArray } from '@/lib/security/field-encryption';

/**
 * Conversation pipeline.
 *
 *   message ─► semantic interpretation (Jev | LLM frame | patterns)   evidence, not decisions
 *           ─► evidence ledger (profile ⊕ this conversation)          what may be used, and why
 *           ─► retrieval (SQL metadata filter → BM25)                  candidate programmes
 *           ─► deterministic rule engine                               the ONLY eligibility authority
 *           ─► plan (verdicts, decisive reasons, provenance, status)
 *           ─► render (LLM prose, gated: injection → numbers → Jev verifier) or template
 *           ─► persist (message, evidence, evaluation snapshots, ai_log)
 *
 * The ordering is the point. Nothing after the rule engine can change a
 * verdict: the model's prose is only `text`, and it is shown only if it passes
 * the gates. Nothing before the rule engine can make a verdict: interpretation
 * produces facts with probabilities, and only ACCEPTED facts reach the engine.
 *
 * Conversation facts are conversation-scoped. This service never writes the
 * citizen's profile — a fact becomes a profile fact only when the citizen
 * confirms it through the profile API (the "save to my profile" action).
 */

const MAX_HISTORY_MESSAGES = 8;
const MAX_RECOMMENDATIONS = 5;

export interface TurnInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly message: string;
  readonly localeHint?: 'bn' | 'en';
  readonly signal?: AbortSignal;
}

export interface TurnResult {
  readonly conversationId: string;
  readonly userMessage: Message;
  readonly assistantMessage: Message;
  readonly plan: ResponsePlan;
  readonly nlu: NluResult;
  readonly civicFrame: CivicFrame;
  /** Always empty now: chat never writes the profile. Kept for API compatibility. */
  readonly profileUpdated: readonly string[];
  readonly engine: string;
  readonly degraded: boolean;
  readonly renderPath: RenderPath;
  readonly latencyMs: number;
}

/* --------------------------------------------------------- persistence */

async function ensureConversation(
  userId: string,
  conversationId: string | null | undefined,
  locale: 'bn' | 'en',
): Promise<Conversation> {
  if (conversationId) {
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);
    if (existing) return existing;
  }
  const [created] = await db.insert(conversations).values({ userId, language: locale }).returning();
  return created!;
}

async function loadHistory(conversationId: string): Promise<Message[]> {
  // System rows record the citizen's fact confirmations/rejections; they are
  // not part of the dialogue the model sees.
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), sql`${messages.role} != 'system'`))
    .orderBy(desc(messages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);
  return rows.reverse();
}


/**
 * Every fact stated earlier in THIS conversation, oldest first, read back from
 * the assistant messages that recorded them — minus the facts the citizen has
 * since REJECTED — plus the fields whose conflict the citizen was asked about.
 * Reading all turns (not the last eight) means a fact does not silently expire
 * mid-conversation.
 */
async function loadConversationFacts(conversationId: string): Promise<{ facts: ConversationFact[]; conflictAsked: Set<string> }> {
  const rows = await db
    .select({ role: messages.role, payload: messages.payload })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), sql`${messages.role} != 'user'`))
    .orderBy(asc(messages.createdAt));
  return foldConversationFacts(rows);
}

/**
 * Records the citizen's confirmation or rejection of ONE fact (per-fact
 * confirmation; the old single "save everything" button confirmed uncertain
 * and wrong facts in one tap — audit 2026-09-30, defect 4). A confirmation is
 * saved to the profile by the client through the profile API; this row is the
 * conversation's record of either decision. Ownership is checked here.
 */
export async function recordFactDecision(userId: string, conversationId: string, decision: FactDecision): Promise<boolean> {
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  if (!conversation) return false;
  await db.insert(messages).values({
    conversationId,
    role: 'system',
    kind: 'system',
    content: `fact ${decision.decision}: ${decision.field}`,
    payload: { factDecision: decision },
  });
  return true;
}

/* ------------------------------------------------------------- planning */

function conditionOf(trace: ConditionTrace, ledger: Ledger): PlannedCondition {
  const p = ledger.provenance[trace.field];
  return {
    field: trace.field,
    state: trace.state,
    soft: trace.soft,
    reason: trace.reason,
    ...(trace.actual !== undefined ? { actual: trace.actual } : {}),
    ...(p && trace.state !== 'unknown'
      ? { provenance: { source: p.source, method: p.method, probability: p.probability, ...(p.note ? { note: p.note } : {}) } }
      : {}),
    ...(trace.citation ? { citation: trace.citation } : {}),
  };
}

/**
 * What may be done with a verdict — separate from the verdict. Every rule
 * below is a policy statement; none is learned.
 */
function decisionStatusOf(
  item: EnrichedOpportunity,
  ledger: Ledger,
  injectionFlagged: boolean,
): { status: DecisionStatus; reasons: string[] } {
  const outcome = item.evaluation.outcome;
  const pendingFields = new Set<string>(ledger.pending.map((f) => f.field));
  const conflictFields = new Set<string>(ledger.conflicts.map((c) => c.field));
  const reasons: string[] = [];

  if (outcome === 'unknown') {
    const unknownFields = [...item.evaluation.unknown.map((c) => c.field), ...item.evaluation.missingFields];
    if (unknownFields.some((f) => conflictFields.has(f))) return { status: 'review', reasons: ['conflicting_facts'] };
    if (unknownFields.some((f) => pendingFields.has(f))) return { status: 'needs_confirmation', reasons: ['fact_awaiting_confirmation'] };
    return { status: 'needs_information', reasons: [] };
  }

  const positive = outcome === 'eligible' || outcome === 'partially_eligible';
  if (positive && item.opportunity.verificationStatus !== 'verified') reasons.push(`source_${item.opportunity.verificationStatus}`);
  if (positive && injectionFlagged) reasons.push('instruction_injection_suspected');
  return reasons.length > 0 ? { status: 'review', reasons } : { status: 'decided', reasons: [] };
}

function evidenceStrengthOf(conditions: readonly PlannedCondition[]): number | null {
  const probabilities = conditions
    .filter((c) => c.state !== 'unknown' && c.provenance?.method === 'jev' && c.provenance.probability !== null)
    .map((c) => c.provenance!.probability as number);
  return probabilities.length > 0 ? Math.min(...probabilities) : null;
}

function toPlannedOpportunity(item: EnrichedOpportunity, ledger: Ledger, injectionFlagged: boolean): PlannedOpportunity {
  const firstStep = item.opportunity.applicationProcess[0];
  const e = item.evaluation;
  const conditions = [...e.matched, ...e.failed, ...e.softFailed, ...e.unknown]
    .filter((c) => !isPlaceholderReason(c.reason))
    .map((c) => conditionOf(c, ledger));
  const reasonsOf = (list: readonly ConditionTrace[]) => list.map((c) => c.reason).filter((r) => !isPlaceholderReason(r));
  const decision = decisionStatusOf(item, ledger, injectionFlagged);
  return {
    id: item.opportunity.id,
    slug: item.opportunity.slug,
    title: { en: item.opportunity.title, bn: item.opportunity.titleBn },
    summary: { en: item.opportunity.summary, bn: item.opportunity.summaryBn },
    organisation: { en: item.organization.name, bn: item.organization.nameBn },
    category: item.opportunity.category,
    outcome: e.outcome,
    benefitAmount: item.opportunity.benefitAmount,
    benefitPeriod: item.opportunity.benefitPeriod,
    deadline: item.opportunity.deadline,
    relevance: item.ranking?.total ?? 0,
    confidence: item.confidence.score,
    verificationStatus: item.opportunity.verificationStatus,
    // Anything short of `verified` is unverified. The previous check matched
    // only `unverified_sample`, so `outdated` and `disputed` records were shown
    // as verified in chat.
    isUnverified: item.opportunity.verificationStatus !== 'verified',
    metReasons: reasonsOf(e.matched),
    failedReasons: reasonsOf(e.failed),
    unknownReasons: reasonsOf(e.unknown),
    softFailedReasons: reasonsOf(e.softFailed),
    conditions,
    decisionStatus: decision.status,
    reviewReasons: decision.reasons,
    evidenceStrength: evidenceStrengthOf(conditions),
    nextStep: firstStep ? { en: firstStep.en, bn: firstStep.bn } : null,
    sourceUrl: item.opportunity.sourceUrl,
  };
}

/**
 * Missing-information detector — PRD §22.
 *
 * Picks the single field that would unlock the most currently-undecidable
 * programmes. Asking the highest-leverage question first is what keeps the
 * conversation short: one answer can resolve five programmes at once.
 */
function chooseMissingField(items: readonly EnrichedOpportunity[]): RuleField | null {
  const counts = new Map<RuleField, number>();
  for (const item of items) {
    if (item.evaluation.outcome !== 'unknown') continue;
    for (const field of item.evaluation.missingFields) {
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
    for (const condition of item.evaluation.unknown) {
      counts.set(condition.field, (counts.get(condition.field) ?? 0) + 0.5);
    }
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

function reasonForField(field: RuleField): { en: string; bn: string } {
  const label = fieldLabel(field);
  return {
    en: `Several programmes decide by ${label.en}, so knowing it lets me tell you which ones you can actually get.`,
    bn: `কয়েকটি কর্মসূচি ${label.bn} দেখে সিদ্ধান্ত নেয়, তাই এটি জানলে আমি বলতে পারব আপনি কোনগুলো সত্যিই পাবেন।`,
  };
}

/**
 * What to ask first. A contradiction is resolved before anything else (a
 * verdict built on it would be arbitrary), then a fact the citizen said but we
 * are not sure we understood, then the highest-leverage missing field.
 */
function chooseClarification(items: readonly EnrichedOpportunity[], ledger: Ledger): Pick<
  ResponsePlan, 'missingField' | 'missingFieldLabel' | 'missingFieldReason' | 'clarificationKind' | 'clarificationValues'
> | null {
  const undecidedFields = new Set(
    items
      .filter((i) => i.evaluation.outcome === 'unknown')
      .flatMap((i) => [...i.evaluation.unknown.map((c) => c.field), ...i.evaluation.missingFields]),
  );
  const conflict = ledger.conflicts.find((c) => undecidedFields.has(c.field as RuleField));
  if (conflict) {
    const field = conflict.field as RuleField;
    const stated = valueLabel(field, conflict.conversationValue);
    const stored = valueLabel(field, conflict.profileValue);
    return {
      missingField: field,
      missingFieldLabel: fieldLabel(field),
      clarificationKind: 'conflict',
      clarificationValues: { stated, profile: stored },
      missingFieldReason: {
        en: `Your profile says "${stored.en}", but you told me "${stated.en}". I will not guess which is right.`,
        bn: `আপনার প্রোফাইলে আছে "${stored.bn}", কিন্তু আপনি বললেন "${stated.bn}"। কোনটি ঠিক, তা আমি অনুমান করব না।`,
      },
    };
  }
  const pending = ledger.pending.find((f) => undecidedFields.has(f.field as RuleField));
  if (pending) {
    const field = pending.field as RuleField;
    const label = factLabel(field, pending.value);
    return {
      missingField: field,
      missingFieldLabel: fieldLabel(field),
      clarificationKind: 'confirm',
      clarificationValues: { stated: valueLabel(field, pending.value) },
      missingFieldReason: {
        en: `I understood "${label.en}", but I am not certain, so I have not used it yet.`,
        bn: `আমি বুঝেছি "${label.bn}", কিন্তু নিশ্চিত নই, তাই এখনো এটি ব্যবহার করিনি।`,
      },
    };
  }
  const missing = chooseMissingField(items);
  if (!missing) return null;
  return { missingField: missing, missingFieldLabel: fieldLabel(missing), missingFieldReason: reasonForField(missing), clarificationKind: 'missing' };
}

/** Maps a fact to the profile API's field name, for "save to my profile". */
const PROFILE_FIELD: Partial<Record<string, string>> = { age: 'statedAge' };
const SAVEABLE_FIELDS = new Set([
  'maritalStatus', 'gender', 'occupation', 'education', 'hasDisability', 'isPregnant', 'isStudent',
  'hasBusiness', 'monthlyIncome', 'age', 'householdSize', 'dependents', 'landOwnershipDecimals', 'cgpa', 'district',
]);

/** The profile-API patch that saves one fact, or undefined if it is not saveable. */
function saveFor(field: string, value: unknown): Record<string, unknown> | undefined {
  return SAVEABLE_FIELDS.has(field) ? { [PROFILE_FIELD[field] ?? field]: value } : undefined;
}

function planEvidence(frame: CivicFrame, ledger: Ledger): PlanEvidence {
  const facts: PlanFact[] = [];
  for (const [field, p] of Object.entries(ledger.provenance)) {
    if (field === 'annualIncome' || field === 'division' || field === 'lifeEvents' || field === 'medicalConditions') continue;
    const fromChat = p.source === 'this_message' || p.source === 'earlier_message';
    const save = fromChat ? saveFor(field, p.value) : undefined;
    facts.push({ field, value: p.value, status: 'accepted', method: p.method, probability: p.probability, source: p.source, label: factLabel(field, p.value), ...(p.evidence && fromChat ? { evidence: p.evidence } : {}), ...(save ? { save } : {}) });
  }
  for (const f of ledger.pending) {
    const save = saveFor(f.field, f.value);
    facts.push({ field: f.field, value: f.value, status: 'needs_confirmation', method: f.method, probability: f.probability, source: 'this_message', label: factLabel(f.field, f.value), evidence: f.evidence, ...(save ? { save } : {}) });
  }
  // Conflicting facts ARE saveable: saving the chat value is how the citizen
  // resolves the conflict in favour of what they said (defect 3).
  for (const c of ledger.conflicts) {
    const save = saveFor(c.field, c.conversationValue);
    facts.push({ field: c.field, value: c.conversationValue, status: 'conflict', method: 'conversation', probability: null, source: c.conversationSource, label: factLabel(c.field, c.conversationValue), profileLabel: factLabel(c.field, c.profileValue), ...(save ? { save } : {}) });
  }
  const saveable: Record<string, unknown> = {};
  for (const f of ledger.saveable) {
    if (SAVEABLE_FIELDS.has(f.field)) saveable[PROFILE_FIELD[f.field] ?? f.field] = f.value;
  }
  // A pending fact is saveable too: saving IS the citizen's confirmation.
  for (const f of ledger.pending) {
    if (SAVEABLE_FIELDS.has(f.field)) saveable[PROFILE_FIELD[f.field] ?? f.field] = f.value;
  }
  return { engine: frame.engine, degraded: frame.degraded, facts, saveable };
}

/* --------------------------------------------------------------- turn */

export async function runTurn(input: TurnInput): Promise<TurnResult> {
  const startedAt = Date.now();

  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user) throw new Error('User not found');

  const provider = getProvider();
  const decisionModel = getDecisionModel();
  // The same typed questions, answered by the generative provider: the
  // fallback when Jev fails, and the primary engine when Jev is not configured.
  const fallbackModel = provider.isLive ? new LlmTypedDecisionModel(provider) : null;
  const budget = new TurnBudget(input.signal);
  // Identifiers are removed before ANY text leaves the server. The citizen's
  // own conversation record keeps the original message.
  const redacted = redactPii(input.message);
  const civicFrame = await inferCivicFrame({
    message: redacted.text,
    fallbackLocale: input.localeHint ?? (user.language as 'bn' | 'en'),
    provider,
    decisionModel,
    fallbackModel,
    engine: resolveSemanticEngine(),
    budget,
    ...(input.signal ? { signal: input.signal } : {}),
  });
  const nlu = civicFrame.nlu;
  const locale = civicFrame.locale;

  const conversation = await ensureConversation(input.userId, input.conversationId, locale);
  const history = await loadHistory(conversation.id);
  const { facts: earlierFacts, conflictAsked } = await loadConversationFacts(conversation.id);

  const [userMessage] = await db
    .insert(messages)
    .values({ conversationId: conversation.id, role: 'user', kind: 'text', content: input.message })
    .returning();

  const [profileRow] = await db.select().from(userProfiles).where(eq(userProfiles.userId, input.userId)).limit(1);
  const decryptedProfileRow = profileRow
    ? { ...profileRow, medicalConditions: decryptStringArray(profileRow.medicalConditions) }
    : null;
  const storedProfile = toEligibilityProfile({ user, profile: decryptedProfileRow });

  const currentFacts: EvidenceFact[] = [...civicFrame.evidence];
  const ledger = buildLedger({ profile: storedProfile, earlier: earlierFacts, current: currentFacts, currentMessageId: userMessage!.id, conflictAsked });
  const profile: EligibilityProfile = ledger.profile;
  const injectionFlagged = civicFrame.semantic.injection.flagged;

  /* ---- build the plan ---- */
  let plan: ResponsePlan;
  let relevanceJudgments: Judgment[] = [];
  let relevanceError: string | null = null;
  const situationEvents = civicFrame.situation ? [civicFrame.situation] : [];

  if (civicFrame.isGreeting) {
    plan = emptyPlan('greeting', locale, nlu, situationEvents);
  } else if (civicFrame.isOutOfScope) {
    plan = emptyPlan('out_of_scope', locale, nlu, situationEvents);
  } else {
    const topics = civicFrame.lifeEvents;
    // Retrieval is scoped by the citizen's district and the detected topics, so
    // an irrelevant or geographically unavailable programme cannot surface.
    const retrieved = await retrieve(civicFrame.retrievalQuery, {
      district: profile.district ?? null,
      lifeEvents: topics.length > 0 ? topics : undefined,
      limit: 14,
    });

    // The wording matched nothing lexically but the situation is understood:
    // fall back to metadata-only retrieval by topic.
    const effective = retrieved.length > 0
      ? retrieved
      : topics.length > 0
        ? await retrieveByLifeEvents(topics, { district: profile.district ?? null, limit: 8 })
        : [];

    const retrievedIds = opportunityIdsFrom(effective);
    const retrievalScores = new Map<string, number>();
    for (const chunk of effective) {
      if (chunk.opportunityId) {
        retrievalScores.set(chunk.opportunityId, Math.max(retrievalScores.get(chunk.opportunityId) ?? 0, chunk.score));
      }
    }

    // Optional: Jev re-orders what BM25 found. Fails open (BM25 order stands).
    if (env.JEV_RERANK && decisionModel && effective.length > 0) {
      const relevance = await judgeRelevance(redacted.text, effective, decisionModel, budget.stage(STAGE_BUDGET_MS.relevance));
      relevanceJudgments = relevance.judgments;
      relevanceError = relevance.error;
      for (const [id, score] of relevance.scores) retrievalScores.set(id, score);
    }

    const { items } = retrievedIds.length > 0
      ? await listOpportunities({
          profile,
          userId: input.userId,
          filters: { ids: retrievedIds, limit: MAX_RECOMMENDATIONS * 2 },
          retrievalScores,
          detectedLifeEvents: topics,
          interests: profileRow?.interests ?? [],
        })
      : { items: [] as EnrichedOpportunity[] };

    if (items.length === 0) {
      plan = { ...emptyPlan('no_results', locale, nlu, situationEvents), ungrounded: effective.length === 0 };
    } else {
      const shortlist = items.slice(0, MAX_RECOMMENDATIONS);
      const clarification = chooseClarification(shortlist, ledger);
      const planned = shortlist.map((i) => toPlannedOpportunity(i, ledger, injectionFlagged));
      const common = {
        locale,
        intents: nlu.intents as Intent[],
        lifeEvents: situationEvents,
        opportunities: planned,
        citations: effective.slice(0, 6).map(citationOf),
        overallConfidence: Math.round(
          shortlist.reduce((sum, i) => sum + i.confidence.score, 0) / Math.max(1, shortlist.length),
        ),
        ungrounded: false,
      };

      // Ask BEFORE recommending when the answer would change the verdicts —
      // PRD §22: "instead of guessing".
      // A contradiction on a decisive fact is always put to the citizen, even
      // when other programmes were decided: staying silent about it would let
      // the citizen act on verdicts built around a field we know is disputed.
      const decidedCount = shortlist.filter((i) => i.evaluation.outcome !== 'unknown').length;
      plan = clarification && (decidedCount === 0 || clarification.clarificationKind === 'conflict')
        ? { kind: 'clarification', ...common, ...clarification }
        : { kind: 'recommendations', ...common };

      // Persist each decision with its profile snapshot for later audit.
      await Promise.all(
        shortlist.map((item) =>
          recordEvaluation(input.userId, item.opportunity.id, item.evaluation, profile, item.confidence.score),
        ),
      );
    }
  }

  plan = { ...plan, evidence: planEvidence(civicFrame, ledger) };

  /* ---- render ---- */
  const rendered = await renderTurn({
    plan,
    message: redacted.text,
    history,
    profile,
    provider,
    // Jev verifies when configured (and a Jev failure fails CLOSED); without
    // Jev, the typed-LLM engine verifies rather than no one.
    decisionModel: decisionModel ?? fallbackModel,
    injectionFlagged,
    budget,
    ...(input.signal ? { signal: input.signal } : {}),
  });
  const { text, renderPath, verification } = rendered;
  const degraded = civicFrame.degraded || rendered.providerFailed;
  const tokensIn = civicFrame.modelCall.tokensIn + rendered.tokensIn;
  const tokensOut = civicFrame.modelCall.tokensOut + rendered.tokensOut;
  const engineError: string | null = rendered.error ?? civicFrame.modelCall.error ?? civicFrame.decisionCall.error ?? null;

  const latencyMs = Date.now() - startedAt;
  const modelWrote = renderPath === 'model_verified' || renderPath === 'model_unverified';
  const servedBy = modelWrote ? provider.engine : 'simulated';
  const evidenceFacts: ConversationFact[] = currentFacts.map((f) => ({ ...f, messageId: userMessage!.id }));

  const [assistantMessage] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      role: 'assistant',
      kind: plan.kind === 'clarification' ? 'clarification' : plan.kind === 'recommendations' ? 'recommendation' : 'text',
      content: text,
      payload: {
        plan: {
          kind: plan.kind,
          opportunities: plan.opportunities,
          citations: plan.citations,
          missingField: plan.missingField ?? null,
          clarificationKind: plan.clarificationKind ?? null,
          lifeEvents: plan.lifeEvents,
          ungrounded: plan.ungrounded,
          evidence: plan.evidence,
          renderPath,
          civicFrame: {
            version: civicFrame.version,
            engine: civicFrame.engine,
            degraded: civicFrame.degraded,
            proposedFacts: civicFrame.proposedFacts,
            uncertainFacts: civicFrame.uncertainFacts,
            modelCall: civicFrame.modelCall,
            decisionCall: civicFrame.decisionCall,
          },
        },
        // Read back by `loadConversationFacts` on later turns.
        evidenceFacts,
      },
      tokens: tokensOut,
      latencyMs,
      aiEngine: servedBy,
      confidence: plan.overallConfidence,
    })
    .returning();

  await db.insert(aiLogs).values({
    userId: input.userId,
    conversationId: conversation.id,
    messageId: assistantMessage!.id,
    requestType: 'conversation',
    engine: servedBy,
    model: modelWrote ? provider.model : 'deterministic-composer-v1',
    promptTemplate: PROMPTS.system.name,
    promptVersion: PROMPTS.system.version,
    // Redacted: identifiers never reach the log.
    inputSummary: redacted.text.slice(0, 500),
    outputSummary: text.slice(0, 500),
    intents: [...plan.intents],
    entities: {
      frameVersion: civicFrame.version,
      semanticEngine: civicFrame.engine,
      semanticDegraded: civicFrame.degraded,
      decisionModel: civicFrame.semantic.model,
      questionSetVersion: civicFrame.semantic.questionSetVersion,
      policyVersion: civicFrame.semantic.policyVersion,
      decisionCall: civicFrame.decisionCall,
      fallbackTrail: civicFrame.fallbackTrail,
      redaction: { version: REDACTION_VERSION, counts: redacted.counts },
      // Structure in the clear (what was asked, with what certainty, and what
      // happened) so the log can be monitored without reading anyone's facts.
      factSummary: currentFacts.map((f) => ({ field: f.field, status: f.status, method: f.method, probability: f.probability })),
      injection: { flagged: civicFrame.semantic.injection.flagged, probability: civicFrame.semantic.injection.probability },
      // VALUES are sensitive (marital status, income, disability…): encrypted
      // with the field-encryption key, readable only by an administrator with
      // the key — never in plain text in ai_logs (audit improvement 11).
      sealed: encryptField(JSON.stringify({
        facts: currentFacts,
        judgments: civicFrame.semantic.judgments,
        situation: civicFrame.semantic.situation,
        ledger: { conflicts: ledger.conflicts, pending: ledger.pending, superseded: ledger.superseded },
        proposed: civicFrame.proposedFacts,
        verificationJudgments: verification?.judgments ?? [],
      })),
      engineVersion: ENGINE_VERSION,
      decisions: plan.opportunities.map((o) => ({ id: o.id, outcome: o.outcome, status: o.decisionStatus, reviewReasons: o.reviewReasons, evidenceStrength: o.evidenceStrength })),
      renderPath,
      relevance: env.JEV_RERANK ? { version: RELEVANCE_VERSION, judgments: relevanceJudgments, error: relevanceError } : null,
      verification: verification ? { version: VERIFIER_VERSION, verdict: verification.verdict, reasonCount: verification.reasons.length, model: verification.model, latencyMs: verification.latencyMs, errorKind: verification.errorKind ?? null } : null,
      uncertain: civicFrame.uncertainFacts,
    },
    retrievedChunkIds: plan.citations.map((c) => c.chunkId),
    citedOpportunityIds: plan.opportunities.map((o) => o.id),
    confidence: plan.overallConfidence,
    latencyMs,
    tokensIn,
    tokensOut,
    // A recommendation with no citation is a grounding failure by definition.
    groundingFailure: plan.kind === 'recommendations' && plan.citations.length === 0,
    error: engineError,
  });

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      messageCount: sql`${conversations.messageCount} + 2`,
      title: conversation.title ?? input.message.slice(0, 70),
      language: locale,
    })
    .where(eq(conversations.id, conversation.id));

  return {
    conversationId: conversation.id,
    userMessage: userMessage!,
    assistantMessage: assistantMessage!,
    plan,
    nlu,
    civicFrame,
    profileUpdated: [],
    engine: servedBy,
    degraded,
    renderPath,
    latencyMs,
  };
}

function citationOf(chunk: RetrievedChunk) {
  return {
    chunkId: chunk.chunkId,
    opportunityId: chunk.opportunityId,
    title: chunk.title,
    excerpt: chunk.content.slice(0, 320),
    sourceUrl: chunk.sourceUrl,
  };
}

function emptyPlan(
  kind: ResponsePlan['kind'],
  locale: 'bn' | 'en',
  nlu: NluResult,
  lifeEvents: ResponsePlan['lifeEvents'],
): ResponsePlan {
  return {
    kind,
    locale,
    intents: nlu.intents as Intent[],
    lifeEvents,
    opportunities: [],
    citations: [],
    overallConfidence: kind === 'greeting' ? 100 : 0,
    ungrounded: kind === 'no_results',
  };
}

/* ------------------------------------------------------- conversations */

export async function listConversations(userId: string, limit = 30) {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.startedAt))
    .limit(limit);
}

export async function getConversation(userId: string, conversationId: string) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  if (!conversation) return null;

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return { conversation, messages: rows };
}

export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  const result = await db
    .delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });
  return result.length > 0;
}

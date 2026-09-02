import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  conversations, messages, aiLogs, userProfiles, users,
  type Conversation, type Message,
} from '@/lib/db/schema';
import type { NluResult } from './nlu';
import { confirmedProfile, inferCivicFrame, type CivicFrame } from './civic-frame';
import { retrieve, opportunityIdsFrom, type RetrievedChunk } from '@/modules/knowledge/retrieval';
import { listOpportunities, recordEvaluation, type EnrichedOpportunity } from '@/modules/opportunities/opportunity.service';
import { toEligibilityProfile } from '@/modules/eligibility/profile-mapper';
import { fieldLabel, type EligibilityProfile } from '@/modules/eligibility/engine';
import { composeResponse } from './composer';
import { assertNumericGrounding } from './grounding';
import { getProvider } from './providers';
import { PROMPTS } from '@/prompts';
import { pickLocalised, type PlannedOpportunity, type ResponsePlan } from './response-plan';
import type { Intent, LifeEvent } from '@/lib/domain/enums';
import type { RuleField } from '@/lib/domain/rules';
import { formatDate } from '@/lib/format/dates';
import { encryptStringArray, decryptStringArray } from '@/lib/security/field-encryption';

/**
 * Conversation pipeline — PRD §19 and §14.
 *
 * Input → NLU → profile update → missing-information check → retrieval →
 * eligibility → ranking → plan → render → persist.
 *
 * The ordering is the point. Eligibility and retrieval happen BEFORE any model
 * is involved, so the model can only voice conclusions the deterministic layer
 * already reached (PRD Principle 4). If retrieval finds nothing, the plan says
 * so and the model is not called at all — there is no path by which an
 * unsupported answer can be produced.
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
  readonly profileUpdated: readonly string[];
  readonly engine: string;
  readonly degraded: boolean;
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
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);
  return rows.reverse();
}

/**
 * Merges newly extracted entities into the stored profile.
 *
 * Only writes fields the citizen has actually stated, and never overwrites an
 * existing value with a weaker one — a passing mention should not clobber a
 * value the citizen entered deliberately on the profile form.
 */
async function applyExtractedEntities(
  userId: string,
  extracted: Partial<EligibilityProfile>,
  detectedEvents: readonly LifeEvent[],
): Promise<string[]> {
  const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const applied: string[] = [];
  const patch: Record<string, unknown> = {};

  const setIfAbsent = (column: string, value: unknown, currentValue: unknown) => {
    if (value === undefined || value === null) return;
    if (currentValue !== null && currentValue !== undefined) return;
    patch[column] = value;
    applied.push(column);
  };

  if (existing) {
    setIfAbsent('statedAge', extracted.age, existing.dateOfBirth ?? existing.statedAge);
    setIfAbsent('gender', extracted.gender, existing.gender);
    setIfAbsent('maritalStatus', extracted.maritalStatus, existing.maritalStatus);
    setIfAbsent('occupation', extracted.occupation, existing.occupation);
    setIfAbsent('monthlyIncome', extracted.monthlyIncome, existing.monthlyIncome);
    setIfAbsent('education', extracted.education, existing.education);
    setIfAbsent('cgpa', extracted.cgpa, existing.cgpa);
    setIfAbsent('district', extracted.district, existing.district);
    setIfAbsent('division', extracted.division, existing.division);
    setIfAbsent('hasDisability', extracted.hasDisability, existing.hasDisability);
    setIfAbsent('isPregnant', extracted.isPregnant, existing.isPregnant);
    setIfAbsent('householdSize', extracted.householdSize, existing.householdSize);
    setIfAbsent('landOwnershipDecimals', extracted.landOwnershipDecimals, existing.landOwnershipDecimals);
    setIfAbsent('isStudent', extracted.isStudent, existing.isStudent);
    setIfAbsent('hasBusiness', extracted.hasBusiness, existing.hasBusiness);

    // Medical conditions are only stored with explicit consent (PRD §68), and
    // encrypted at rest (SJ-44) — `existing.medicalConditions` is ciphertext,
    // decrypted here before merging; `patch.medicalConditions` is encrypted
    // again before the write below.
    if (extracted.medicalConditions && existing.shareHealthData) {
      const currentConditions = decryptStringArray(existing.medicalConditions) ?? [];
      const merged = [...new Set([...currentConditions, ...extracted.medicalConditions])];
      patch.medicalConditions = encryptStringArray(merged);
      applied.push('medicalConditions');
    }

    if (detectedEvents.length > 0) {
      const known = new Set((existing.lifeEvents ?? []).map((e) => e.event));
      const additions = detectedEvents
        .filter((e) => !known.has(e))
        .map((e) => ({ event: e, detectedAt: Date.now(), source: 'conversation' as const }));
      if (additions.length > 0) {
        patch.lifeEvents = [...(existing.lifeEvents ?? []), ...additions];
        applied.push('lifeEvents');
      }
    }

    if (Object.keys(patch).length > 0) {
      await db
        .update(userProfiles)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId));
    }
    return applied;
  }

  // No profile row yet — create one from whatever was stated.
  const insert: Record<string, unknown> = { userId, shareHealthData: false };
  const fields: [string, unknown][] = [
    ['statedAge', extracted.age], ['gender', extracted.gender], ['maritalStatus', extracted.maritalStatus],
    ['occupation', extracted.occupation], ['monthlyIncome', extracted.monthlyIncome],
    ['education', extracted.education], ['cgpa', extracted.cgpa], ['district', extracted.district],
    ['division', extracted.division], ['hasDisability', extracted.hasDisability],
    ['isPregnant', extracted.isPregnant], ['householdSize', extracted.householdSize],
    ['landOwnershipDecimals', extracted.landOwnershipDecimals], ['isStudent', extracted.isStudent],
    ['hasBusiness', extracted.hasBusiness],
  ];
  for (const [key, value] of fields) {
    if (value !== undefined && value !== null) {
      insert[key] = value;
      applied.push(key);
    }
  }
  if (detectedEvents.length > 0) {
    insert.lifeEvents = detectedEvents.map((e) => ({ event: e, detectedAt: Date.now(), source: 'conversation' as const }));
    applied.push('lifeEvents');
  }
  await db.insert(userProfiles).values(insert as never);
  return applied;
}

/* ------------------------------------------------------------- planning */

function toPlannedOpportunity(item: EnrichedOpportunity, locale: 'bn' | 'en'): PlannedOpportunity {
  const firstStep = item.opportunity.applicationProcess[0];
  return {
    id: item.opportunity.id,
    slug: item.opportunity.slug,
    title: { en: item.opportunity.title, bn: item.opportunity.titleBn },
    summary: { en: item.opportunity.summary, bn: item.opportunity.summaryBn },
    organisation: { en: item.organization.name, bn: item.organization.nameBn },
    category: item.opportunity.category,
    outcome: item.evaluation.outcome,
    benefitAmount: item.opportunity.benefitAmount,
    benefitPeriod: item.opportunity.benefitPeriod,
    deadline: item.opportunity.deadline,
    relevance: item.ranking?.total ?? 0,
    confidence: item.confidence.score,
    isUnverified: item.opportunity.verificationStatus === 'unverified_sample',
    metReasons: item.evaluation.matched.map((c) => c.reason),
    failedReasons: item.evaluation.failed.map((c) => c.reason),
    unknownReasons: item.evaluation.unknown.map((c) => c.reason),
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

function reasonForField(field: RuleField, locale: 'bn' | 'en'): { en: string; bn: string } {
  const label = fieldLabel(field);
  return {
    en: `Several programmes decide by ${label.en}, so knowing it lets me tell you which ones you can actually get.`,
    bn: `কয়েকটি কর্মসূচি ${label.bn} দেখে সিদ্ধান্ত নেয়, তাই এটি জানলে আমি বলতে পারব আপনি কোনগুলো সত্যিই পাবেন।`,
  };
}

/* --------------------------------------------------------------- turn */

export async function runTurn(input: TurnInput): Promise<TurnResult> {
  const startedAt = Date.now();

  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user) throw new Error('User not found');

  const provider = getProvider();
  const civicFrame = await inferCivicFrame({
    message: input.message,
    fallbackLocale: input.localeHint ?? (user.language as 'bn' | 'en'),
    provider,
    ...(input.signal ? { signal: input.signal } : {}),
  });
  const nlu = civicFrame.nlu;
  const locale = nlu.locale;

  const conversation = await ensureConversation(input.userId, input.conversationId, locale);
  const history = await loadHistory(conversation.id);

  const [userMessage] = await db
    .insert(messages)
    .values({ conversationId: conversation.id, role: 'user', kind: 'text', content: input.message })
    .returning();

  const detectedEvents = civicFrame.lifeEvents;
  const confirmedEvents = nlu.lifeEvents.map((event) => event.event);
  const profileUpdated = await applyExtractedEntities(input.userId, confirmedProfile(civicFrame), confirmedEvents);

  const [profileRow] = await db.select().from(userProfiles).where(eq(userProfiles.userId, input.userId)).limit(1);
  const decryptedProfileRow = profileRow
    ? { ...profileRow, medicalConditions: decryptStringArray(profileRow.medicalConditions) }
    : null;
  const profile = toEligibilityProfile({ user, profile: decryptedProfileRow });

  /* ---- build the plan ---- */
  let plan: ResponsePlan;

  if (nlu.isGreeting) {
    plan = emptyPlan('greeting', locale, nlu);
  } else if (nlu.isOutOfScope) {
    plan = emptyPlan('out_of_scope', locale, nlu);
  } else {
    // Retrieval is scoped by the citizen's district and detected life events, so
    // an irrelevant or geographically unavailable programme cannot surface.
    const retrieved = await retrieve(civicFrame.retrievalQuery, {
      district: profile.district ?? null,
      lifeEvents: detectedEvents.length > 0 ? detectedEvents : undefined,
      limit: 14,
    });

    // Fall back to a life-event-only search when the wording matched nothing
    // lexically — a citizen may describe a situation in words absent from the
    // corpus while the situation itself is clearly mapped.
    const effective = retrieved.length > 0
      ? retrieved
      : detectedEvents.length > 0
        ? await retrieve(detectedEvents.join(' '), { district: profile.district ?? null, lifeEvents: detectedEvents, limit: 14 })
        : [];

    const retrievedIds = opportunityIdsFrom(effective);
    const retrievalScores = new Map<string, number>();
    for (const chunk of effective) {
      if (chunk.opportunityId) {
        retrievalScores.set(chunk.opportunityId, Math.max(retrievalScores.get(chunk.opportunityId) ?? 0, chunk.score));
      }
    }

    const { items } = retrievedIds.length > 0
      ? await listOpportunities({
          profile,
          userId: input.userId,
          filters: { ids: retrievedIds, limit: MAX_RECOMMENDATIONS * 2 },
          retrievalScores,
          detectedLifeEvents: detectedEvents,
          interests: profileRow?.interests ?? [],
        })
      : { items: [] as EnrichedOpportunity[] };

    if (items.length === 0) {
      plan = { ...emptyPlan('no_results', locale, nlu), ungrounded: effective.length === 0 };
    } else {
      const missingField = chooseMissingField(items);
      const shortlist = items.slice(0, MAX_RECOMMENDATIONS);

      // Ask BEFORE recommending when the answer would change the verdicts —
      // PRD §22: "instead of guessing".
      const decidedCount = shortlist.filter((i) => i.evaluation.outcome !== 'unknown').length;
      if (missingField && decidedCount === 0) {
        plan = {
          kind: 'clarification',
          locale,
          intents: nlu.intents as Intent[],
          lifeEvents: detectedEvents,
          opportunities: shortlist.map((i) => toPlannedOpportunity(i, locale)),
          missingField,
          missingFieldLabel: fieldLabel(missingField),
          missingFieldReason: reasonForField(missingField, locale),
          citations: effective.slice(0, 6).map(citationOf),
          overallConfidence: Math.round(
            shortlist.reduce((sum, i) => sum + i.confidence.score, 0) / Math.max(1, shortlist.length),
          ),
          ungrounded: false,
        };
      } else {
        plan = {
          kind: 'recommendations',
          locale,
          intents: nlu.intents as Intent[],
          lifeEvents: detectedEvents,
          opportunities: shortlist.map((i) => toPlannedOpportunity(i, locale)),
          citations: effective.slice(0, 6).map(citationOf),
          overallConfidence: Math.round(
            shortlist.reduce((sum, i) => sum + i.confidence.score, 0) / Math.max(1, shortlist.length),
          ),
          ungrounded: false,
        };
      }

      // Persist each decision with its profile snapshot for later audit.
      await Promise.all(
        shortlist.map((item) =>
          recordEvaluation(input.userId, item.opportunity.id, item.evaluation, profile, item.confidence.score),
        ),
      );
    }
  }

  /* ---- render ---- */
  let text: string;
  let degraded = false;
  let tokensIn = civicFrame.modelCall.tokensIn;
  let tokensOut = civicFrame.modelCall.tokensOut;
  let engineError: string | null = civicFrame.modelCall.error ?? null;

  if (provider.isLive && plan.kind !== 'greeting' && plan.kind !== 'out_of_scope') {
    try {
      const rendered = await renderWithModel(plan, input.message, history, profile, input.signal);
      assertNumericGrounding(rendered.text, plan);
      text = rendered.text;
      tokensIn += rendered.tokensIn;
      tokensOut += rendered.tokensOut;
    } catch (error) {
      // A provider failure degrades to the deterministic composer rather than
      // failing the citizen's request. The UI shows the degraded badge.
      degraded = true;
      engineError = error instanceof Error ? error.message : String(error);
      text = composeResponse(plan);
    }
  } else {
    text = composeResponse(plan);
  }

  const latencyMs = Date.now() - startedAt;

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
          lifeEvents: plan.lifeEvents,
          ungrounded: plan.ungrounded,
          civicFrame: {
            version: civicFrame.version,
            confirmedFacts: civicFrame.confirmedFacts,
            proposedFacts: civicFrame.proposedFacts,
            uncertainFacts: civicFrame.uncertainFacts,
            modelCall: civicFrame.modelCall,
          },
        },
      },
      tokens: tokensOut,
      latencyMs,
      aiEngine: degraded ? 'simulated' : provider.engine,
      confidence: plan.overallConfidence,
    })
    .returning();

  await db.insert(aiLogs).values({
    userId: input.userId,
    conversationId: conversation.id,
    messageId: assistantMessage!.id,
    requestType: 'conversation',
    engine: degraded ? 'simulated' : provider.engine,
    model: degraded ? 'deterministic-composer-v1' : provider.model,
    promptTemplate: PROMPTS.system.name,
    promptVersion: PROMPTS.system.version,
    inputSummary: input.message.slice(0, 500),
    outputSummary: text.slice(0, 500),
    intents: [...plan.intents],
    entities: {
      confirmed: nlu.entities.profile,
      proposed: civicFrame.proposedFacts,
      uncertain: civicFrame.uncertainFacts,
      frameVersion: civicFrame.version,
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
    profileUpdated,
    engine: degraded ? 'simulated' : provider.engine,
    degraded,
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

function emptyPlan(kind: ResponsePlan['kind'], locale: 'bn' | 'en', nlu: NluResult): ResponsePlan {
  return {
    kind,
    locale,
    intents: nlu.intents as Intent[],
    lifeEvents: nlu.lifeEvents.map((e) => e.event),
    opportunities: [],
    citations: [],
    overallConfidence: kind === 'greeting' ? 100 : 0,
    ungrounded: kind === 'no_results',
  };
}

/**
 * Renders the plan with a live model. The model receives ONLY the plan's
 * contents as context, so it cannot introduce a programme, amount, or rule that
 * the deterministic layer did not put there.
 */
async function renderWithModel(
  plan: ResponsePlan,
  message: string,
  history: readonly Message[],
  profile: EligibilityProfile,
  signal?: AbortSignal,
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const locale = plan.locale;

  const profileSummary = [
    profile.age !== undefined ? `Age: ${profile.age}` : null,
    profile.gender ? `Gender: ${profile.gender}` : null,
    profile.district ? `District: ${profile.district}` : null,
    profile.occupation ? `Occupation: ${profile.occupation}` : null,
    profile.monthlyIncome !== undefined ? `Monthly income: BDT ${profile.monthlyIncome}` : null,
    profile.maritalStatus ? `Marital status: ${profile.maritalStatus}` : null,
    profile.education ? `Education: ${profile.education}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'No profile details recorded yet.';

  const situation = plan.lifeEvents.length > 0
    ? `Detected life events: ${plan.lifeEvents.join(', ')}`
    : 'No specific life event detected.';

  const eligibilityBlock = plan.opportunities
    .map((o) => {
      const met = o.metReasons.map((r) => `    + ${pickLocalised(r, locale)}`).join('\n');
      const failed = o.failedReasons.map((r) => `    - ${pickLocalised(r, locale)}`).join('\n');
      const unknown = o.unknownReasons.map((r) => `    ? ${pickLocalised(r, locale)}`).join('\n');
      return [
        `  ${pickLocalised(o.title, locale)} — DECISION: ${o.outcome}${o.isUnverified ? ' (UNVERIFIED SAMPLE DATA)' : ''}`,
        met, failed, unknown,
      ].filter(Boolean).join('\n');
    })
    .join('\n');

  const contextBlock = plan.opportunities
    .map((o) => {
      const lines = [
        `### ${pickLocalised(o.title, locale)}`,
        `Organisation: ${pickLocalised(o.organisation, locale)}`,
        pickLocalised(o.summary, locale),
        o.benefitAmount !== null ? `Amount: BDT ${o.benefitAmount.toFixed(2)} ${o.benefitPeriod ?? ''}` : null,
        o.deadline ? `Deadline: ${formatDate(o.deadline, 'en')}` : 'Deadline: rolling, open all year',
        o.nextStep ? `First step: ${pickLocalised(o.nextStep, locale)}` : null,
        o.sourceUrl ? `Source: ${o.sourceUrl}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n\n');

  const citationBlock = plan.citations.map((c) => `[${c.title}] ${c.excerpt}`).join('\n\n');

  const system = PROMPTS.system.render({
    profile: profileSummary,
    situation,
    eligibility: eligibilityBlock || 'No eligibility decisions available.',
    context: [contextBlock, citationBlock].filter(Boolean).join('\n\n---\n\n') || 'NO CONTEXT AVAILABLE.',
  });

  const historyBlock = history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Citizen' : 'Shebar Janala'}: ${m.content.slice(0, 400)}`)
    .join('\n');

  const userPrompt =
    plan.kind === 'clarification'
      ? PROMPTS.clarification.render({
          message,
          missing: plan.missingFieldLabel ? pickLocalised(plan.missingFieldLabel, locale) : 'more information',
        })
      : PROMPTS.conversation.render({
          message,
          history: historyBlock ? `Earlier in this conversation:\n${historyBlock}` : '',
        });

  const result = await getProvider().generate({
    system,
    user: userPrompt,
    maxTokens: 900,
    temperature: 0.3,
    ...(signal ? { signal } : {}),
  });

  return { text: result.text, tokensIn: result.tokensIn, tokensOut: result.tokensOut };
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

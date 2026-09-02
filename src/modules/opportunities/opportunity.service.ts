import { and, eq, inArray, or, sql, desc, asc, like } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  opportunities, organizations, eligibilityRules, requiredDocuments,
  eligibilityEvaluations, knowledgeGraphEdges, savedOpportunities,
  // Aliased: `documents` is used as a local name for REQUIRED documents in this
  // module, and the two are different things — one is what the citizen must
  // bring, the other is the indexed source text.
  documents as sourceDocuments, documentChunks,
  type Opportunity, type Organization, type RequiredDocument,
} from '@/lib/db/schema';
import { evaluateEligibility, type EligibilityProfile, type EvaluationResult } from '@/modules/eligibility/engine';
import { rank, type RankingInput, type RankedResult } from '@/modules/recommendation/ranker';
import { scoreConfidence, type ConfidenceBreakdown } from '@/modules/ai/confidence';
import { chunkText, termFrequencies, estimateTokens } from '@/modules/knowledge/tokenizer';
import type { OpportunityCategory, EligibilityOutcome } from '@/lib/domain/enums';
import type { RuleSet } from '@/lib/domain/rules';
import type { RetrievedChunk } from '@/modules/knowledge/retrieval';

/**
 * Opportunity domain service.
 *
 * Framework-free: no Request, no Response, no Next.js import. Route handlers
 * are thin adapters over this (PRD §51 — "Keep business logic inside services,
 * not controllers"), which is also what makes lifting it into a NestJS provider
 * a mechanical change.
 */

export interface EnrichedOpportunity {
  readonly opportunity: Opportunity;
  readonly organization: Organization;
  readonly evaluation: EvaluationResult;
  readonly ranking: RankedResult | null;
  readonly confidence: ConfidenceBreakdown;
  readonly documents: readonly RequiredDocument[];
  readonly saved: { readonly id: string; readonly status: string } | null;
}

export interface ListFilters {
  readonly categories?: readonly OpportunityCategory[];
  readonly outcomes?: readonly EligibilityOutcome[];
  readonly district?: string | null;
  readonly search?: string;
  readonly onlyOpen?: boolean;
  readonly lifeEvents?: readonly string[];
  readonly organizationId?: string;
  readonly ids?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
  readonly sort?: 'relevance' | 'deadline' | 'newest' | 'amount';
}

interface RuleRow {
  opportunityId: string;
  ruleJson: RuleSet;
  version: number;
}

/** Active rule set per opportunity, highest priority wins. */
async function loadRules(opportunityIds: readonly string[]): Promise<Map<string, RuleRow>> {
  if (opportunityIds.length === 0) return new Map();
  const rows = await db
    .select({
      opportunityId: eligibilityRules.opportunityId,
      ruleJson: eligibilityRules.ruleJson,
      version: eligibilityRules.version,
      priority: eligibilityRules.priority,
    })
    .from(eligibilityRules)
    .where(and(inArray(eligibilityRules.opportunityId, [...opportunityIds]), eq(eligibilityRules.active, true)))
    .orderBy(desc(eligibilityRules.priority), desc(eligibilityRules.version));

  const map = new Map<string, RuleRow>();
  for (const row of rows) {
    if (!map.has(row.opportunityId)) {
      map.set(row.opportunityId, {
        opportunityId: row.opportunityId,
        ruleJson: row.ruleJson,
        version: row.version,
      });
    }
  }
  return map;
}

async function loadDocuments(opportunityIds: readonly string[]): Promise<Map<string, RequiredDocument[]>> {
  if (opportunityIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(requiredDocuments)
    .where(inArray(requiredDocuments.opportunityId, [...opportunityIds]))
    .orderBy(asc(requiredDocuments.sortOrder));

  const map = new Map<string, RequiredDocument[]>();
  for (const row of rows) {
    const list = map.get(row.opportunityId) ?? [];
    list.push(row);
    map.set(row.opportunityId, list);
  }
  return map;
}

/**
 * How many indexed source documents back each programme.
 *
 * Feeds `directRecord` in the confidence scorer: a list card is scored from the
 * programme's own record rather than from a retrieval hit, and the scorer needs
 * to be told that so it does not report "no supporting document was found".
 */
async function loadIndexedCounts(opportunityIds: readonly string[]): Promise<Map<string, number>> {
  if (opportunityIds.length === 0) return new Map();
  const rows = await db
    .select({ opportunityId: sourceDocuments.opportunityId, n: sql<number>`count(*)` })
    .from(sourceDocuments)
    .where(inArray(sourceDocuments.opportunityId, [...opportunityIds]))
    .groupBy(sourceDocuments.opportunityId);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.opportunityId) map.set(row.opportunityId, Number(row.n));
  }
  return map;
}

async function loadSaved(userId: string | null, opportunityIds: readonly string[]) {
  if (!userId || opportunityIds.length === 0) return new Map<string, { id: string; status: string }>();
  const rows = await db
    .select({ id: savedOpportunities.id, opportunityId: savedOpportunities.opportunityId, status: savedOpportunities.status })
    .from(savedOpportunities)
    .where(and(eq(savedOpportunities.userId, userId), inArray(savedOpportunities.opportunityId, [...opportunityIds])));
  return new Map(rows.map((r) => [r.opportunityId, { id: r.id, status: r.status }]));
}

/**
 * The central read path: list programmes, evaluate each against the citizen's
 * profile, rank, and score confidence.
 */
export async function listOpportunities(options: {
  readonly profile: EligibilityProfile;
  readonly userId?: string | null;
  readonly filters?: ListFilters;
  readonly retrievalScores?: Map<string, number>;
  readonly detectedLifeEvents?: readonly string[];
  readonly interests?: readonly string[];
  readonly now?: Date;
}): Promise<{ items: EnrichedOpportunity[]; total: number }> {
  const { profile, userId = null, filters = {}, retrievalScores, detectedLifeEvents = [], interests = [] } = options;
  const now = options.now ?? new Date();

  const conditions = [];
  if (filters.ids && filters.ids.length > 0) conditions.push(inArray(opportunities.id, [...filters.ids]));
  if (filters.categories && filters.categories.length > 0) {
    conditions.push(inArray(opportunities.category, [...filters.categories]));
  }
  if (filters.organizationId) conditions.push(eq(opportunities.organizationId, filters.organizationId));
  if (filters.onlyOpen !== false) {
    conditions.push(inArray(opportunities.status, ['open', 'rolling']));
  }
  if (filters.search) {
    const needle = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${opportunities.title})`, needle),
        like(opportunities.titleBn, `%${filters.search}%`),
        like(sql`lower(${opportunities.summary})`, needle),
        like(opportunities.summaryBn, `%${filters.search}%`),
      )!,
    );
  }
  if (filters.district) {
    conditions.push(
      or(
        sql`json_array_length(${opportunities.coverageDistricts}) = 0`,
        sql`EXISTS (SELECT 1 FROM json_each(${opportunities.coverageDistricts}) WHERE json_each.value = ${filters.district})`,
      )!,
    );
  }
  if (filters.lifeEvents && filters.lifeEvents.length > 0) {
    const clauses = filters.lifeEvents.map(
      (event) => sql`EXISTS (SELECT 1 FROM json_each(${opportunities.lifeEvents}) WHERE json_each.value = ${event})`,
    );
    conditions.push(clauses.reduce((acc, clause) => (acc ? or(acc, clause)! : clause)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({ opportunity: opportunities, organization: organizations })
    .from(opportunities)
    .innerJoin(organizations, eq(opportunities.organizationId, organizations.id))
    .where(where);

  const ids = rows.map((r) => r.opportunity.id);
  const [rules, documents, saved, indexedCounts] = await Promise.all([
    loadRules(ids),
    loadDocuments(ids),
    loadSaved(userId, ids),
    loadIndexedCounts(ids),
  ]);

  const maxSaveCount = Math.max(1, ...rows.map((r) => r.opportunity.saveCount));

  // Evaluate every programme against the profile. Deterministic and cheap —
  // a few dozen rule trees — so it happens on every list rather than being
  // cached and going stale the moment a profile field changes.
  const evaluated = rows.map(({ opportunity, organization }) => {
    const rule = rules.get(opportunity.id);
    const evaluation: EvaluationResult = rule
      ? evaluateEligibility(rule.ruleJson, profile, { ruleVersion: rule.version })
      : {
          // No rule authored yet: honestly "unknown", never a silent pass.
          outcome: 'unknown',
          matched: [], failed: [], unknown: [], softFailed: [],
          missingFields: [], ruleCoverage: 0, score: 0,
          trace: { kind: 'all', id: 'no-rules', state: 'unknown', children: [] },
          ruleVersion: 0,
        };
    return { opportunity, organization, evaluation, documents: documents.get(opportunity.id) ?? [] };
  });

  const rankingInputs: RankingInput[] = evaluated.map(({ opportunity, evaluation }) => ({
    opportunityId: opportunity.id,
    category: opportunity.category,
    tags: opportunity.tags,
    lifeEvents: opportunity.lifeEvents,
    coverageDistricts: opportunity.coverageDistricts,
    deadline: opportunity.deadline,
    viewCount: opportunity.viewCount,
    saveCount: opportunity.saveCount,
    applicationCount: opportunity.applicationCount,
    verificationStatus: opportunity.verificationStatus,
    outcome: evaluation.outcome,
    eligibilityScore: evaluation.score,
    ...(retrievalScores?.has(opportunity.id) ? { retrievalScore: retrievalScores.get(opportunity.id) } : {}),
  }));

  const ranked = rank(rankingInputs, { profile, interests, detectedLifeEvents, now, maxSaveCount });
  const rankingById = new Map(ranked.map((r) => [r.opportunityId, r]));

  let items: EnrichedOpportunity[] = evaluated.map((entry) => ({
    opportunity: entry.opportunity,
    organization: entry.organization,
    evaluation: entry.evaluation,
    ranking: rankingById.get(entry.opportunity.id) ?? null,
    confidence: scoreConfidence({
      retrieved: [],
      // A list card's confidence comes from the record, not from a search hit.
      directRecord: { indexedDocuments: indexedCounts.get(entry.opportunity.id) ?? 0 },
      evaluation: entry.evaluation,
      verificationStatus: entry.opportunity.verificationStatus,
      lastVerifiedAt: entry.opportunity.lastVerifiedAt,
      hasSourceUrl: Boolean(entry.opportunity.sourceUrl),
      hasRequiredDocuments: entry.documents.length > 0,
      hasApplicationSteps: entry.opportunity.applicationProcess.length > 0,
      now,
    }),
    documents: entry.documents,
    saved: saved.get(entry.opportunity.id) ?? null,
  }));

  if (filters.outcomes && filters.outcomes.length > 0) {
    items = items.filter((i) => filters.outcomes!.includes(i.evaluation.outcome));
  }

  // Sorting. `relevance` uses the ranker's order; the others are explicit
  // citizen choices that must override it.
  const sort = filters.sort ?? 'relevance';
  if (sort === 'relevance') {
    items.sort((a, b) => (b.ranking?.total ?? 0) - (a.ranking?.total ?? 0));
  } else if (sort === 'deadline') {
    items.sort((a, b) => {
      const aTime = a.opportunity.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.opportunity.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  } else if (sort === 'newest') {
    items.sort((a, b) => b.opportunity.createdAt.getTime() - a.opportunity.createdAt.getTime());
  } else if (sort === 'amount') {
    items.sort((a, b) => (b.opportunity.benefitAmount ?? -1) - (a.opportunity.benefitAmount ?? -1));
  }

  const total = items.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? total;
  return { items: items.slice(offset, offset + limit), total };
}

export async function getOpportunityBySlug(
  slug: string,
  profile: EligibilityProfile,
  userId: string | null,
  retrieved: readonly RetrievedChunk[] = [],
): Promise<EnrichedOpportunity | null> {
  const [row] = await db
    .select({ opportunity: opportunities, organization: organizations })
    .from(opportunities)
    .innerJoin(organizations, eq(opportunities.organizationId, organizations.id))
    .where(eq(opportunities.slug, slug))
    .limit(1);

  if (!row) return null;

  const [rules, documents, saved] = await Promise.all([
    loadRules([row.opportunity.id]),
    loadDocuments([row.opportunity.id]),
    loadSaved(userId, [row.opportunity.id]),
  ]);

  const rule = rules.get(row.opportunity.id);
  const evaluation: EvaluationResult = rule
    ? evaluateEligibility(rule.ruleJson, profile, { ruleVersion: rule.version })
    : {
        outcome: 'unknown',
        matched: [], failed: [], unknown: [], softFailed: [],
        missingFields: [], ruleCoverage: 0, score: 0,
        trace: { kind: 'all', id: 'no-rules', state: 'unknown', children: [] },
        ruleVersion: 0,
      };

  const docs = documents.get(row.opportunity.id) ?? [];

  return {
    opportunity: row.opportunity,
    organization: row.organization,
    evaluation,
    ranking: null,
    confidence: scoreConfidence({
      retrieved,
      evaluation,
      verificationStatus: row.opportunity.verificationStatus,
      lastVerifiedAt: row.opportunity.lastVerifiedAt,
      hasSourceUrl: Boolean(row.opportunity.sourceUrl),
      hasRequiredDocuments: docs.length > 0,
      hasApplicationSteps: row.opportunity.applicationProcess.length > 0,
    }),
    documents: docs,
    saved: saved.get(row.opportunity.id) ?? null,
  };
}

/** Records the view count without blocking the response. */
export async function recordView(opportunityId: string): Promise<void> {
  await db
    .update(opportunities)
    .set({ viewCount: sql`${opportunities.viewCount} + 1` })
    .where(eq(opportunities.id, opportunityId));
}

/**
 * Persists an eligibility decision with the profile snapshot and rule version
 * that produced it, so "why did it say this?" is answerable later (PRD §122).
 */
export async function recordEvaluation(
  userId: string | null,
  opportunityId: string,
  evaluation: EvaluationResult,
  profile: EligibilityProfile,
  confidence: number,
): Promise<void> {
  await db.insert(eligibilityEvaluations).values({
    userId,
    opportunityId,
    outcome: evaluation.outcome,
    matchedCount: evaluation.matched.length,
    failedCount: evaluation.failed.length,
    unknownCount: evaluation.unknown.length,
    confidence,
    detail: {
      trace: evaluation.trace,
      missingFields: evaluation.missingFields,
      ruleCoverage: evaluation.ruleCoverage,
      score: evaluation.score,
    },
    profileSnapshot: profile as unknown as Record<string, unknown>,
    ruleVersion: evaluation.ruleVersion,
  });
}

/**
 * The Opportunity Graph — PRD Feature 5.
 *
 * Returns the programmes connected to a given one, so a citizen sees an
 * ecosystem rather than isolated results. Traverses `complements` edges plus
 * shared life events, which is what turns "widow allowance" into the full set
 * of things a widow can access.
 */
export async function getRelated(opportunityId: string, limit = 6): Promise<Opportunity[]> {
  const edges = await db
    .select({ toId: knowledgeGraphEdges.toId, weight: knowledgeGraphEdges.weight })
    .from(knowledgeGraphEdges)
    .where(
      and(
        eq(knowledgeGraphEdges.fromType, 'opportunity'),
        eq(knowledgeGraphEdges.fromId, opportunityId),
        eq(knowledgeGraphEdges.relation, 'complements'),
      ),
    )
    .orderBy(desc(knowledgeGraphEdges.weight))
    .limit(limit * 2);

  // Edges were written in one direction only; look both ways.
  const reverse = await db
    .select({ toId: knowledgeGraphEdges.fromId, weight: knowledgeGraphEdges.weight })
    .from(knowledgeGraphEdges)
    .where(
      and(
        eq(knowledgeGraphEdges.toType, 'opportunity'),
        eq(knowledgeGraphEdges.toId, opportunityId),
        eq(knowledgeGraphEdges.relation, 'complements'),
      ),
    )
    .orderBy(desc(knowledgeGraphEdges.weight))
    .limit(limit * 2);

  const ids = [...new Set([...edges, ...reverse].map((e) => e.toId))].slice(0, limit);
  if (ids.length === 0) return [];

  return db
    .select()
    .from(opportunities)
    .where(and(inArray(opportunities.id, ids), inArray(opportunities.status, ['open', 'rolling'])))
    .limit(limit);
}

/** Life-event → programmes, for the graph view and the landing page. */
export async function getByLifeEvent(event: string, limit = 12): Promise<Opportunity[]> {
  return db
    .select()
    .from(opportunities)
    .where(
      and(
        sql`EXISTS (SELECT 1 FROM json_each(${opportunities.lifeEvents}) WHERE json_each.value = ${event})`,
        inArray(opportunities.status, ['open', 'rolling']),
      ),
    )
    .orderBy(desc(opportunities.saveCount))
    .limit(limit);
}

export async function countByCategory(): Promise<Record<string, number>> {
  const rows = await db
    .select({ category: opportunities.category, n: sql<number>`count(*)` })
    .from(opportunities)
    .where(inArray(opportunities.status, ['open', 'rolling']))
    .groupBy(opportunities.category);
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.n)]));
}

/**
 * Regenerates the retrieval document and chunks for a programme.
 *
 * Called on create and on update, because a programme whose text has changed but
 * whose index has not will be retrieved for the old wording and cited with the
 * new — a subtle way to produce an answer that does not match its own source.
 *
 * Lives here rather than in the admin/programs route handlers because a
 * Next.js route.ts file may only export HTTP method handlers and a fixed
 * set of config constants — any other export fails the production build.
 */
export async function indexOpportunity(opportunityId: string): Promise<number> {
  const [row] = await db
    .select({ opportunity: opportunities, organizationName: organizations.name })
    .from(opportunities)
    .innerJoin(organizations, eq(opportunities.organizationId, organizations.id))
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!row) return 0;

  const o = row.opportunity;

  const existing = await db
    .select({ id: sourceDocuments.id })
    .from(sourceDocuments)
    .where(eq(sourceDocuments.opportunityId, opportunityId));
  if (existing.length > 0) {
    await db.delete(documentChunks).where(inArray(documentChunks.documentId, existing.map((d) => d.id)));
    await db.delete(sourceDocuments).where(eq(sourceDocuments.opportunityId, opportunityId));
  }

  const bodyEn = [
    `# ${o.title}`,
    o.summary,
    o.description,
    `## Benefits\n${o.benefits}`,
    `## How to apply\n${o.applicationProcess.map((s) => `${s.step}. ${s.en}`).join('\n')}`,
  ].join('\n\n');
  const bodyBn = [
    `# ${o.titleBn}`,
    o.summaryBn,
    o.descriptionBn,
    `## সুবিধা\n${o.benefitsBn}`,
    `## আবেদনের ধাপ\n${o.applicationProcess.map((s) => `${s.step}. ${s.bn}`).join('\n')}`,
  ].join('\n\n');

  const [document] = await db
    .insert(sourceDocuments)
    .values({
      opportunityId,
      organizationId: o.organizationId,
      title: o.title,
      titleBn: o.titleBn,
      sourceType: 'manual_entry',
      sourceUrl: o.sourceUrl,
      publisher: row.organizationName,
      retrievedAt: new Date(),
      textContent: `${bodyEn}\n\n---\n\n${bodyBn}`,
      embeddingStatus: 'pending',
      verificationStatus: o.verificationStatus,
      licenseNote: 'Authored summary maintained in the AccessAI admin portal.',
    })
    .returning();

  const chunks = [...chunkText(bodyEn), ...chunkText(bodyBn)];
  if (chunks.length > 0) {
    await db.insert(documentChunks).values(
      chunks.map((content, index) => ({
        documentId: document!.id,
        opportunityId,
        chunkIndex: index,
        content,
        tokenCount: estimateTokens(content),
        termFrequencies: termFrequencies(content),
        metadata: { slug: o.slug, category: o.category, title: o.title, titleBn: o.titleBn },
      })),
    );
  }
  return chunks.length;
}

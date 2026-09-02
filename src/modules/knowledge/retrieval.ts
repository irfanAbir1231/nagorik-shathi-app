import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { documentChunks, opportunities, documents } from '@/lib/db/schema';
import { tokenize } from './tokenizer';
import { hasEmbeddingProvider } from '@/lib/config/env';
import { getEmbeddingProvider } from '@/modules/ai/providers';
import { bm25Scores, cosineSimilarity, reciprocalRankFusion } from './ranking';

/**
 * Hybrid retrieval — PRD §26.
 *
 * "The platform should never rely solely on vector search. Use hybrid
 * retrieval: semantic + keyword + metadata filtering + structured queries."
 *
 * Implemented as:
 *   • LEXICAL   — BM25 over pre-computed per-chunk term frequencies.
 *   • SEMANTIC  — cosine similarity over stored embeddings, when an embedding
 *                 provider is configured. Absent one, this contributes nothing
 *                 rather than being faked.
 *   • METADATA  — category, district coverage, status and deadline filters
 *                 applied in SQL BEFORE scoring, so an expired or
 *                 geographically irrelevant programme can never be retrieved.
 *
 * Scores from the two channels are combined with Reciprocal Rank Fusion rather
 * than a weighted sum of raw scores, because BM25 and cosine are on
 * incomparable scales and any fixed weighting between them is arbitrary.
 *
 * PRD §37 specifies pgvector. Here vectors live in a JSON column and cosine is
 * computed in process — correct for a corpus of this size (hundreds of chunks),
 * and interface-compatible with a pgvector swap. See docs/DEVIATIONS.md §3.
 */

export interface RetrievalFilters {
  readonly categories?: readonly string[];
  readonly district?: string | null;
  readonly opportunityIds?: readonly string[];
  readonly includeExpired?: boolean;
  readonly lifeEvents?: readonly string[];
}

export interface RetrievedChunk {
  readonly chunkId: string;
  readonly opportunityId: string | null;
  readonly documentId: string;
  readonly content: string;
  readonly title: string;
  readonly slug: string | null;
  readonly sourceUrl: string | null;
  readonly lexicalScore: number;
  readonly semanticScore: number;
  readonly score: number;
}

interface CandidateRow {
  chunkId: string;
  opportunityId: string | null;
  documentId: string;
  content: string;
  tokenCount: number;
  termFrequencies: Record<string, number> | null;
  embedding: number[] | null;
  title: string | null;
  slug: string | null;
  sourceUrl: string | null;
}

/**
 * Metadata pre-filter. Coverage is stored as a JSON array of district codes
 * where empty means nationwide, so the district test is "no coverage list OR
 * the citizen's district is in it".
 */
async function loadCandidates(filters: RetrievalFilters): Promise<CandidateRow[]> {
  const conditions = [];

  if (filters.opportunityIds && filters.opportunityIds.length > 0) {
    conditions.push(inArray(documentChunks.opportunityId, [...filters.opportunityIds]));
  }
  if (filters.categories && filters.categories.length > 0) {
    conditions.push(inArray(opportunities.category, [...filters.categories] as never));
  }
  if (!filters.includeExpired) {
    conditions.push(
      or(
        sql`${opportunities.deadline} IS NULL`,
        sql`${opportunities.deadline} >= ${Date.now()}`,
      )!,
    );
    conditions.push(inArray(opportunities.status, ['open', 'rolling']));
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
      (event) =>
        sql`EXISTS (SELECT 1 FROM json_each(${opportunities.lifeEvents}) WHERE json_each.value = ${event})`,
    );
    const combined = clauses.reduce((acc, clause) => (acc ? or(acc, clause)! : clause));
    conditions.push(combined);
  }

  const rows = await db
    .select({
      chunkId: documentChunks.id,
      opportunityId: documentChunks.opportunityId,
      documentId: documentChunks.documentId,
      content: documentChunks.content,
      tokenCount: documentChunks.tokenCount,
      termFrequencies: documentChunks.termFrequencies,
      embedding: documentChunks.embedding,
      title: opportunities.title,
      slug: opportunities.slug,
      sourceUrl: opportunities.sourceUrl,
    })
    .from(documentChunks)
    .leftJoin(opportunities, eq(documentChunks.opportunityId, opportunities.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(4000);

  return rows as CandidateRow[];
}

async function semanticScores(
  query: string,
  candidates: readonly CandidateRow[],
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  const embeddable = candidates.filter((c) => Array.isArray(c.embedding) && c.embedding.length > 0);
  if (!hasEmbeddingProvider || embeddable.length === 0) return scores;

  const provider = getEmbeddingProvider();
  if (!provider?.embed) return scores;

  try {
    const result = await provider.embed([query]);
    const queryVector = result?.vectors[0];
    if (!queryVector) return scores;
    for (const candidate of embeddable) {
      scores.set(candidate.chunkId, cosineSimilarity(queryVector, candidate.embedding!));
    }
  } catch {
    // A failed embedding call degrades to lexical-only retrieval rather than
    // failing the citizen's request.
    return scores;
  }
  return scores;
}

/**
 * Reciprocal Rank Fusion. Rank-based, so the two channels' incomparable score
 * scales do not need an arbitrary normalisation constant.
 */
export interface RetrieveOptions extends RetrievalFilters {
  readonly limit?: number;
  /** Max chunks per programme, so one verbose record cannot crowd out others. */
  readonly perOpportunityLimit?: number;
}

export async function retrieve(query: string, options: RetrieveOptions = {}): Promise<RetrievedChunk[]> {
  const { limit = 12, perOpportunityLimit = 2, ...filters } = options;
  const queryTokens = tokenize(query);

  const candidates = await loadCandidates(filters);
  if (candidates.length === 0) return [];

  const lexical = bm25Scores(
    queryTokens,
    candidates.map((candidate) => ({ id: candidate.chunkId, ...candidate })),
  );
  const semantic = await semanticScores(query, candidates);

  // With no lexical or semantic signal at all, returning the highest-ranked
  // arbitrary chunks would be pretending to have found something. Return
  // nothing so the caller reports "no verified information".
  if (lexical.size === 0 && semantic.size === 0) return [];

  const fused = reciprocalRankFusion(lexical, semantic);
  const byId = new Map(candidates.map((c) => [c.chunkId, c]));

  const ranked = [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([chunkId, score]) => {
      const candidate = byId.get(chunkId)!;
      return {
        chunkId,
        opportunityId: candidate.opportunityId,
        documentId: candidate.documentId,
        content: candidate.content,
        title: candidate.title ?? 'Untitled',
        slug: candidate.slug,
        sourceUrl: candidate.sourceUrl,
        lexicalScore: lexical.get(chunkId) ?? 0,
        semanticScore: semantic.get(chunkId) ?? 0,
        score,
      } satisfies RetrievedChunk;
    });

  // Diversity pass: cap chunks per programme so the context window shows many
  // relevant programmes rather than one in exhaustive detail.
  const perOpportunity = new Map<string, number>();
  const diverse: RetrievedChunk[] = [];
  for (const chunk of ranked) {
    const key = chunk.opportunityId ?? chunk.documentId;
    const used = perOpportunity.get(key) ?? 0;
    if (used >= perOpportunityLimit) continue;
    perOpportunity.set(key, used + 1);
    diverse.push(chunk);
    if (diverse.length >= limit) break;
  }

  return diverse;
}

/** Distinct programme ids from a retrieval result, in relevance order. */
export function opportunityIdsFrom(chunks: readonly RetrievedChunk[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of chunks) {
    if (chunk.opportunityId && !seen.has(chunk.opportunityId)) {
      seen.add(chunk.opportunityId);
      out.push(chunk.opportunityId);
    }
  }
  return out;
}

/**
 * Regenerates embeddings for chunks that lack them. Invoked by the admin
 * "rebuild embeddings" action and the daily job (PRD §45, §64).
 */
export async function backfillEmbeddings(batchSize = 64): Promise<{ processed: number; skipped: boolean }> {
  const provider = getEmbeddingProvider();
  if (!provider?.embed || !hasEmbeddingProvider) return { processed: 0, skipped: true };

  const pending = await db
    .select({
      id: documentChunks.id,
      content: documentChunks.content,
      documentId: documentChunks.documentId,
    })
    .from(documentChunks)
    .where(sql`${documentChunks.embedding} IS NULL`)
    .limit(batchSize);

  if (pending.length === 0) return { processed: 0, skipped: false };

  const result = await provider.embed(pending.map((p) => p.content));
  if (!result) return { processed: 0, skipped: true };

  let processed = 0;
  const touchedDocuments = new Set<string>();
  for (const [index, row] of pending.entries()) {
    const vector = result.vectors[index];
    if (!vector) continue;
    await db
      .update(documentChunks)
      .set({ embedding: vector, embeddingModel: result.model })
      .where(eq(documentChunks.id, row.id));
    touchedDocuments.add(row.documentId);
    processed += 1;
  }

  if (touchedDocuments.size > 0) {
    await db
      .update(documents)
      .set({ embeddingStatus: 'ready', updatedAt: new Date() })
      .where(inArray(documents.id, [...touchedDocuments]));
  }

  return { processed, skipped: false };
}

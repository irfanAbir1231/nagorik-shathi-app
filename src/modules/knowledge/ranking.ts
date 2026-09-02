/** Pure, dependency-free ranking primitives shared by production and evaluation. */

export const BM25_PARAMETERS = { k1: 1.5, b: 0.75 } as const;
export const RRF_PARAMETERS = { k: 60, lexicalWeight: 1, semanticWeight: 1 } as const;

export interface RankableCandidate {
  readonly id: string;
  readonly tokenCount: number;
  readonly termFrequencies: Readonly<Record<string, number>> | null;
  readonly embedding?: readonly number[] | null;
}

export function keywordScores(
  queryTokens: readonly string[],
  candidates: readonly RankableCandidate[],
): Map<string, number> {
  const unique = new Set(queryTokens);
  const scores = new Map<string, number>();
  for (const candidate of candidates) {
    let score = 0;
    for (const token of unique) score += candidate.termFrequencies?.[token] ?? 0;
    if (score > 0) scores.set(candidate.id, score);
  }
  return scores;
}

export function bm25Scores(
  queryTokens: readonly string[],
  candidates: readonly RankableCandidate[],
  parameters = BM25_PARAMETERS,
): Map<string, number> {
  const scores = new Map<string, number>();
  if (queryTokens.length === 0 || candidates.length === 0) return scores;

  const documentCount = candidates.length;
  const averageLength = candidates.reduce((sum, c) => sum + Math.max(1, c.tokenCount), 0) / documentCount;
  const documentFrequency = new Map<string, number>();

  for (const token of new Set(queryTokens)) {
    documentFrequency.set(
      token,
      candidates.filter((candidate) => (candidate.termFrequencies?.[token] ?? 0) > 0).length,
    );
  }

  for (const candidate of candidates) {
    const length = Math.max(1, candidate.tokenCount);
    let score = 0;
    for (const token of queryTokens) {
      const tf = candidate.termFrequencies?.[token] ?? 0;
      if (tf === 0) continue;
      const df = documentFrequency.get(token) ?? 0;
      const idf = Math.log(1 + (documentCount - df + 0.5) / (df + 0.5));
      const numerator = tf * (parameters.k1 + 1);
      const denominator = tf + parameters.k1 * (1 - parameters.b + parameters.b * (length / averageLength));
      score += idf * (numerator / denominator);
    }
    if (score > 0) scores.set(candidate.id, score);
  }
  return scores;
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function semanticScores(
  queryVector: readonly number[],
  candidates: readonly RankableCandidate[],
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const candidate of candidates) {
    if (!candidate.embedding?.length) continue;
    scores.set(candidate.id, cosineSimilarity(queryVector, candidate.embedding));
  }
  return scores;
}

export function reciprocalRankFusion(
  lexical: ReadonlyMap<string, number>,
  semantic: ReadonlyMap<string, number>,
  parameters = RRF_PARAMETERS,
): Map<string, number> {
  const fused = new Map<string, number>();
  const add = (scores: ReadonlyMap<string, number>, weight: number) => {
    [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .forEach(([id], index) => fused.set(id, (fused.get(id) ?? 0) + weight / (parameters.k + index + 1)));
  };
  add(lexical, parameters.lexicalWeight);
  add(semantic, parameters.semanticWeight);
  return fused;
}

export function rankedIds(scores: ReadonlyMap<string, number>): string[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id);
}

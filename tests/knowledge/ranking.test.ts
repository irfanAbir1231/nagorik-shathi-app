import { describe, expect, it } from 'vitest';
import { bm25Scores, cosineSimilarity, rankedIds, reciprocalRankFusion, type RankableCandidate } from '@/modules/knowledge/ranking';

const candidates: RankableCandidate[] = [
  { id: 'widow', tokenCount: 3, termFrequencies: { widow: 2, allowance: 1 } },
  { id: 'elderly', tokenCount: 3, termFrequencies: { elderly: 2, allowance: 1 } },
];

describe('shared retrieval ranking primitives', () => {
  it('ranks the matching BM25 document first', () => {
    expect(rankedIds(bm25Scores(['widow', 'support'], candidates))[0]).toBe('widow');
  });

  it('computes cosine similarity without NaN on zero vectors', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });

  it('uses deterministic ID tie-breaking in RRF', () => {
    const fused = reciprocalRankFusion(new Map([['b', 1], ['a', 1]]), new Map());
    expect(rankedIds(fused)).toEqual(['a', 'b']);
  });
});

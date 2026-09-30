import type { RetrievedChunk } from '@/modules/knowledge/retrieval';
import type { DecisionModel, NoulQuestion } from './decision/types';
import type { Judgment } from './semantic-frame';

/**
 * Optional Jev re-ranking of retrieved programmes (`JEV_RERANK=true`).
 *
 * BM25 remains the retriever; this only re-orders the programmes BM25 already
 * found, with one absolute relevance Noul per programme. In the retrieval
 * ablation (evaluation/jev) it raised R@1 substantially on the 500-query set,
 * but that set scores programmes, while production ranks inside eligibility
 * outcome bands — so it ships OFF until its effect is measured end to end.
 *
 * Risk class: routes (it steers what is looked at, never what is decided).
 * Failure policy: fail OPEN — on any error, BM25 order stands.
 */

export const RELEVANCE_VERSION = 'programme-relevance@1.0.0';
const DEPTH = 10;

/** Maps P(relevant) onto the ranker's retrieval component (it saturates at 0.05). */
const TO_RANKER_SCALE = 0.05;

function question(i: number): NoulQuestion {
  return {
    type: 'noul',
    instructions: `Would \`programmes[${i}]\` help with the situation described in \`message\`?`,
    criteria: {
      true: 'The programme is designed for the situation or need the message describes.',
      false: 'The programme is for a different situation or need.',
    },
  };
}

export async function judgeRelevance(
  message: string,
  chunks: readonly RetrievedChunk[],
  model: DecisionModel,
  signal?: AbortSignal,
): Promise<{ scores: Map<string, number>; judgments: Judgment[]; error: string | null }> {
  const seen = new Set<string>();
  const programmes: { id: string; title: string; excerpt: string }[] = [];
  for (const c of chunks) {
    if (!c.opportunityId || seen.has(c.opportunityId)) continue;
    seen.add(c.opportunityId);
    programmes.push({ id: c.opportunityId, title: c.title, excerpt: c.content.slice(0, 300) });
    if (programmes.length >= DEPTH) break;
  }
  if (programmes.length === 0) return { scores: new Map(), judgments: [], error: null };

  try {
    const result = await model.decide({
      state: { message, programmes: programmes.map((p) => ({ title: p.title, description: p.excerpt })) },
      questions: Object.fromEntries(programmes.map((_, i) => [`relevant_${i}`, question(i)])),
      ...(signal ? { signal } : {}),
    });
    const scores = new Map<string, number>();
    const judgments: Judgment[] = [];
    programmes.forEach((p, i) => {
      const a = result.answers[`relevant_${i}`];
      if (a?.type !== 'noul') return;
      scores.set(p.id, a.noul * TO_RANKER_SCALE);
      judgments.push({ id: `relevant_${i}:${p.id}`, type: 'noul', answer: a.noul >= 0.5 ? 'yes' : 'no', probability: a.noul, confidence: null });
    });
    return { scores, judgments, error: null };
  } catch (error) {
    return { scores: new Map(), judgments: [], error: error instanceof Error ? error.message : String(error) };
  }
}

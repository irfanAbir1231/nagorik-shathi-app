import { SEED_OPPORTUNITIES } from '@/lib/db/seed';
import { understand } from '@/modules/ai/nlu';
import { termFrequencies, tokenize } from '@/modules/knowledge/tokenizer';
import { bm25Scores, rankedIds, type RankableCandidate } from '@/modules/knowledge/ranking';
import { PRIMARY_SITUATION, isLifeEvent } from '@/modules/ai/decision/questions';
import { ROUTING_THRESHOLDS } from '@/modules/ai/decision/policy';
import { answerProbability, type DecisionModel, type NoulQuestion } from '@/modules/ai/decision/types';
import { RETRIEVAL_CASES } from '../datasets/retrieval';
import { mapLimit, ratio } from './infra';

/**
 * Retrieval ablation — does Jev earn a place AROUND BM25?
 *
 * Arms (same programme-level corpus as the existing `npm run eval`):
 *   bm25              lexical only
 *   keyword_filter    keyword life-event filter → BM25 (the current pipeline)
 *   jev_filter        Jev main-situation filter → BM25
 *   union_filter      keyword ∪ Jev filter → BM25 (what production now does)
 *   jev_rerank        BM25 top-10 re-ordered by a Jev relevance Noul per programme
 *   union_rerank      union filter → BM25 top-10 → Jev re-rank
 *
 * BM25 stays the retriever in every arm; Jev only filters or re-orders what
 * BM25 already found. The re-rank arms are an EXPERIMENT: production does not
 * re-rank unless these numbers justify its cost.
 */

interface Candidate extends RankableCandidate {
  readonly slug: string;
  readonly lifeEvents: readonly string[];
  readonly title: string;
  readonly summary: string;
}

function buildCorpus(): Candidate[] {
  return SEED_OPPORTUNITIES.map((item) => {
    const text = [
      item.title[0], item.title[1], item.summary[0], item.summary[1],
      item.description[0], item.description[1], item.benefits[0], item.benefits[1],
      item.tags.join(' '), item.lifeEvents.join(' '),
    ].join('\n');
    return {
      id: item.slug, slug: item.slug, lifeEvents: item.lifeEvents, title: item.title[0], summary: item.summary[0],
      tokenCount: tokenize(text).length, termFrequencies: termFrequencies(text), embedding: null,
    };
  });
}

const RERANK_DEPTH = 10;

function relevanceQuestion(i: number): NoulQuestion {
  return {
    type: 'noul',
    instructions: `Would \`programmes[${i}]\` help with the situation described in \`message\`?`,
    criteria: {
      true: 'The programme is designed for the situation or need the message describes.',
      false: 'The programme is for a different situation or need.',
    },
  };
}

function score(rankings: readonly string[][]) {
  let r1 = 0, r3 = 0, r5 = 0, mrr = 0;
  const lang = { bn: { r3: 0, n: 0 }, en: { r3: 0, n: 0 } };
  rankings.forEach((ranked, i) => {
    const item = RETRIEVAL_CASES[i]!;
    const rank = ranked.findIndex((slug) => item.acceptable.includes(slug));
    lang[item.language].n += 1;
    if (rank < 0) return;
    mrr += 1 / (rank + 1);
    if (rank < 1) r1 += 1;
    if (rank < 3) {
      r3 += 1;
      lang[item.language].r3 += 1;
    }
    if (rank < 5) r5 += 1;
  });
  const n = rankings.length;
  return {
    recallAt1: ratio(r1, n), recallAt3: ratio(r3, n), recallAt5: ratio(r5, n), mrr: ratio(mrr, n),
    banglaRecallAt3: ratio(lang.bn.r3, lang.bn.n), englishRecallAt3: ratio(lang.en.r3, lang.en.n),
  };
}

export async function runRetrievalAblation(options: { readonly jev: DecisionModel | null; readonly concurrency: number; readonly onProgress?: (d: number, t: number) => void }) {
  const corpus = buildCorpus();
  const bySlug = new Map(corpus.map((c) => [c.slug, c]));
  const rankings: Record<string, string[][]> = {
    bm25: [], keyword_filter: [], jev_filter: [], union_filter: [], jev_rerank: [], union_rerank: [],
  };
  const failures: string[] = [];
  let done = 0;

  const bm25Within = (tokens: string[], events: readonly string[]) => {
    const filtered = events.length > 0 ? corpus.filter((c) => c.lifeEvents.some((e) => events.includes(e))) : corpus;
    return rankedIds(bm25Scores(tokens, filtered.length > 0 ? filtered : corpus));
  };

  const perQuery = await mapLimit(RETRIEVAL_CASES, options.concurrency, async (item) => {
    const tokens = tokenize(item.query);
    const keywordEvents = understand(item.query, item.language).lifeEvents.map((e) => e.event);
    const out: Record<string, string[]> = {
      bm25: rankedIds(bm25Scores(tokens, corpus)),
      keyword_filter: bm25Within(tokens, keywordEvents),
    };
    if (options.jev) {
      try {
        const situation = await options.jev.decide({ state: { message: item.query }, questions: { primary_situation: PRIMARY_SITUATION } });
        const answer = situation.answers.primary_situation!;
        const event = answer.type === 'choice' && isLifeEvent(answer.choice) && answerProbability(answer) >= ROUTING_THRESHOLDS.primarySituation
          ? [answer.choice]
          : [];
        out.jev_filter = bm25Within(tokens, event);
        out.union_filter = bm25Within(tokens, [...new Set([...keywordEvents, ...event])]);

        const rerank = async (base: string[]) => {
          const top = base.slice(0, RERANK_DEPTH);
          if (top.length === 0) return base;
          const programmes = top.map((slug) => ({ title: bySlug.get(slug)!.title, summary: bySlug.get(slug)!.summary }));
          const questions = Object.fromEntries(top.map((_, i) => [`relevant_${i}`, relevanceQuestion(i)]));
          const result = await options.jev!.decide({ state: { message: item.query, programmes }, questions });
          const p = top.map((slug, i) => ({ slug, i, p: (result.answers[`relevant_${i}`] as { noul: number }).noul }));
          // Stable: ties keep BM25 order.
          p.sort((a, b) => b.p - a.p || a.i - b.i);
          return [...p.map((x) => x.slug), ...base.slice(RERANK_DEPTH)];
        };
        out.jev_rerank = await rerank(out.bm25!);
        out.union_rerank = await rerank(out.union_filter!);
      } catch (error) {
        failures.push(`${item.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    done += 1;
    options.onProgress?.(done, RETRIEVAL_CASES.length);
    return out;
  });

  for (const q of perQuery) {
    for (const arm of Object.keys(rankings)) {
      if (q[arm]) rankings[arm]!.push(q[arm]!);
    }
  }
  const complete = Object.fromEntries(
    Object.entries(rankings)
      .filter(([, list]) => list.length === RETRIEVAL_CASES.length)
      .map(([arm, list]) => [arm, score(list)]),
  );
  return { queries: RETRIEVAL_CASES.length, rerankDepth: RERANK_DEPTH, arms: complete, failures: failures.slice(0, 20), failureCount: failures.length };
}

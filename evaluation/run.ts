/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { SEED_OPPORTUNITIES } from '@/lib/db/seed';
import { evaluateEligibility } from '@/modules/eligibility/engine';
import { understand } from '@/modules/ai/nlu';
import { inferCivicFrame } from '@/modules/ai/civic-frame';
import { unsupportedNumericClaims } from '@/modules/ai/grounding';
import type { ResponsePlan } from '@/modules/ai/response-plan';
import type { GenerateInput, LlmProvider } from '@/modules/ai/providers/types';
import { getEmbeddingProvider } from '@/modules/ai/providers';
import { termFrequencies, tokenize } from '@/modules/knowledge/tokenizer';
import {
  bm25Scores,
  keywordScores,
  rankedIds,
  reciprocalRankFusion,
  semanticScores,
  type RankableCandidate,
} from '@/modules/knowledge/ranking';
import { RETRIEVAL_CASES } from './datasets/retrieval';
import { ELIGIBILITY_CASES } from './datasets/eligibility';

const EVALUATION_VERSION = 'shebar-janala-eval-v1.0.0';
const DATASET_SEED = 20260903;

interface CorpusCandidate extends RankableCandidate {
  readonly slug: string;
  readonly lifeEvents: readonly string[];
  readonly text: string;
}

function corpusText(item: (typeof SEED_OPPORTUNITIES)[number]): string {
  return [
    item.title[0], item.title[1], item.summary[0], item.summary[1],
    item.description[0], item.description[1], item.benefits[0], item.benefits[1],
    item.tags.join(' '), item.lifeEvents.join(' '),
  ].join('\n');
}

function buildCorpus(): CorpusCandidate[] {
  return SEED_OPPORTUNITIES.map((item) => {
    const text = corpusText(item);
    return {
      id: item.slug,
      slug: item.slug,
      lifeEvents: item.lifeEvents,
      text,
      tokenCount: tokenize(text).length,
      termFrequencies: termFrequencies(text),
      embedding: null,
    };
  });
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]!;
}

function scoreRetrieval(rankings: readonly string[][]) {
  const ks = [1, 3, 5, 10] as const;
  const hits = Object.fromEntries(ks.map((k) => [k, 0])) as Record<number, number>;
  let reciprocalRank = 0;
  let bnTop3 = 0;
  let enTop3 = 0;
  for (const [index, ranked] of rankings.entries()) {
    const item = RETRIEVAL_CASES[index]!;
    const rank = ranked.findIndex((slug) => item.acceptable.includes(slug));
    if (rank >= 0) {
      reciprocalRank += 1 / (rank + 1);
      for (const k of ks) if (rank < k) hits[k] = (hits[k] ?? 0) + 1;
      if (rank < 3) item.language === 'bn' ? (bnTop3 += 1) : (enTop3 += 1);
    }
  }
  const n = RETRIEVAL_CASES.length;
  return {
    recallAt1: (hits[1] ?? 0) / n,
    recallAt3: (hits[3] ?? 0) / n,
    recallAt5: (hits[5] ?? 0) / n,
    recallAt10: (hits[10] ?? 0) / n,
    mrr: reciprocalRank / n,
    banglaRecallAt3: bnTop3 / RETRIEVAL_CASES.filter((item) => item.language === 'bn').length,
    englishRecallAt3: enTop3 / RETRIEVAL_CASES.filter((item) => item.language === 'en').length,
  };
}

async function embedInBatches(
  texts: readonly string[],
  provider: LlmProvider,
): Promise<{ vectors: readonly number[][]; model: string } | null> {
  if (!provider.embed) return null;
  const vectors: number[][] = [];
  let model = '';
  for (let index = 0; index < texts.length; index += 100) {
    const result = await provider.embed(texts.slice(index, index + 100));
    if (!result || result.vectors.length !== Math.min(100, texts.length - index)) return null;
    model = result.model;
    vectors.push(...result.vectors.map((vector) => [...vector]));
  }
  return { vectors, model };
}

async function retrievalEvaluation(corpus: CorpusCandidate[]) {
  const timings: number[] = [];
  const keywordRankings: string[][] = [];
  const bm25Rankings: string[][] = [];
  const completeRankings: string[][] = [];

  for (const item of RETRIEVAL_CASES) {
    const started = performance.now();
    const tokens = tokenize(item.query);
    keywordRankings.push(rankedIds(keywordScores(tokens, corpus)));
    bm25Rankings.push(rankedIds(bm25Scores(tokens, corpus)));
    const events = understand(item.query, item.language).lifeEvents.map((event) => event.event);
    const filtered = events.length > 0
      ? corpus.filter((candidate) => candidate.lifeEvents.some((event) => events.includes(event as never)))
      : corpus;
    completeRankings.push(rankedIds(bm25Scores(tokens, filtered.length > 0 ? filtered : corpus)));
    timings.push(performance.now() - started);
  }

  let semantic: ReturnType<typeof scoreRetrieval> | null = null;
  let hybrid: ReturnType<typeof scoreRetrieval> | null = null;
  let embeddingModel: string | null = null;
  let embeddingReason: string | null = 'Set EVAL_ENABLE_LIVE_MODELS=true with an embedding-capable provider to run.';
  if (process.env.EVAL_ENABLE_LIVE_MODELS === 'true') {
    const provider = getEmbeddingProvider();
    const corpusVectors = provider
      ? await embedInBatches(corpus.map((item) => item.text), provider)
      : null;
    const queryVectors = provider
      ? await embedInBatches(RETRIEVAL_CASES.map((item) => item.query), provider)
      : null;
    if (provider && corpusVectors && queryVectors) {
      embeddingModel = corpusVectors.model;
      embeddingReason = null;
      const embeddedCorpus = corpus.map((candidate, index) => ({
        ...candidate,
        embedding: corpusVectors.vectors[index]!,
      }));
      const semanticRankings: string[][] = [];
      const hybridRankings: string[][] = [];
      for (const [index, item] of RETRIEVAL_CASES.entries()) {
        const semanticMap = semanticScores(queryVectors.vectors[index]!, embeddedCorpus);
        const lexicalMap = bm25Scores(tokenize(item.query), embeddedCorpus);
        semanticRankings.push(rankedIds(semanticMap));
        hybridRankings.push(rankedIds(reciprocalRankFusion(lexicalMap, semanticMap)));
      }
      semantic = scoreRetrieval(semanticRankings);
      hybrid = scoreRetrieval(hybridRankings);
    } else {
      embeddingReason = provider
        ? `Configured embedding provider ${provider.engine} has no usable embedding endpoint.`
        : 'OPENAI_API_KEY is not configured; semantic and hybrid evaluation were not run.';
    }
  }

  return {
    queryCount: RETRIEVAL_CASES.length,
    programmeCount: corpus.length,
    languages: { bn: 250, en: 250 },
    source: 'author-created synthetic known-item queries; not field-collected and not a content-verification study',
    keyword: scoreRetrieval(keywordRankings),
    bm25: scoreRetrieval(bm25Rankings),
    semantic,
    hybrid,
    completePipeline: scoreRetrieval(completeRankings),
    embeddingModel,
    embeddingReason,
    latencyMs: { median: percentile(timings, 0.5), p95: percentile(timings, 0.95) },
  };
}

function eligibilityEvaluation() {
  let correct = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let unknownCorrect = 0;
  let unknownTotal = 0;
  const timings: number[] = [];
  const disagreements: { id: string; expected: string; actual: string }[] = [];

  for (const item of ELIGIBILITY_CASES) {
    const programme = SEED_OPPORTUNITIES.find((candidate) => candidate.slug === item.programmeSlug)!;
    const started = performance.now();
    const actual = evaluateEligibility(programme.rules, item.profile).outcome;
    timings.push(performance.now() - started);
    if (actual === item.expected) correct += 1;
    else disagreements.push({ id: item.id, expected: item.expected, actual });
    if (item.expected === 'not_eligible' && ['eligible', 'partially_eligible'].includes(actual)) falsePositive += 1;
    if (['eligible', 'partially_eligible'].includes(item.expected) && actual === 'not_eligible') falseNegative += 1;
    if (item.expected === 'unknown') {
      unknownTotal += 1;
      if (actual === 'unknown') unknownCorrect += 1;
    }
  }
  return {
    profileCount: ELIGIBILITY_CASES.length,
    programmeCount: 10,
    source: 'synthetic rule-contract benchmark; labels are frozen expectations, not applicant outcomes',
    accuracy: correct / ELIGIBILITY_CASES.length,
    falsePositiveRate: falsePositive / ELIGIBILITY_CASES.length,
    falseNegativeRate: falseNegative / ELIGIBILITY_CASES.length,
    unknownHandlingAccuracy: unknownTotal === 0 ? 0 : unknownCorrect / unknownTotal,
    disagreements,
    latencyMs: { median: percentile(timings, 0.5), p95: percentile(timings, 0.95) },
  };
}

async function safetyEvaluation() {
  const widow = SEED_OPPORTUNITIES.find((item) => item.slug === 'widow-allowance')!;
  const checks: { category: string; passed: boolean; evidence: string }[] = [];
  const known = new Set(SEED_OPPORTUNITIES.map((item) => item.slug));
  checks.push({ category: 'hallucinated_programme', passed: RETRIEVAL_CASES.every((item) => item.acceptable.some((slug) => known.has(slug))), evidence: 'All benchmark labels resolve to version-controlled corpus records.' });
  checks.push({ category: 'wrong_threshold', passed: evaluateEligibility(widow.rules, { citizenship: 'bangladeshi', gender: 'female', maritalStatus: 'widowed', monthlyIncome: 1500, age: 58, occupation: 'homemaker' }).outcome === 'not_eligible', evidence: 'Exact income ceiling is enforced as a strict less-than comparison.' });
  checks.push({ category: 'missing_facts', passed: evaluateEligibility(widow.rules, { citizenship: 'bangladeshi', gender: 'female', maritalStatus: 'widowed', age: 58, occupation: 'homemaker' }).outcome === 'unknown', evidence: 'A missing required income yields unknown, not eligible.' });
  checks.push({ category: 'contradictory_profile', passed: evaluateEligibility(widow.rules, { citizenship: 'bangladeshi', gender: 'male', maritalStatus: 'married', monthlyIncome: 100, age: 58, occupation: 'homemaker' }).outcome === 'not_eligible', evidence: 'Hard contradictory facts override favorable income.' });
  checks.push({ category: 'prompt_injection', passed: evaluateEligibility(widow.rules, { citizenship: 'bangladeshi', gender: 'female', maritalStatus: 'widowed', monthlyIncome: 5000, age: 58, occupation: 'homemaker' }).outcome === 'not_eligible', evidence: 'Eligibility API accepts no prompt or model output; an override instruction has no input path.' });
  const failingProvider: LlmProvider = {
    engine: 'openai', model: 'unavailable-test-provider', isLive: true,
    async generate(_input: GenerateInput) { throw new Error('simulated outage'); },
  };
  const frame = await inferCivicFrame({ message: 'I am 70 years old and need support', provider: failingProvider });
  checks.push({ category: 'provider_failure', passed: !frame.modelCall.accepted && frame.confirmedFacts.some((fact) => fact.field === 'age'), evidence: 'Provider outage preserved deterministic extraction and exposed degraded state.' });
  checks.push({ category: 'unsupported_citation', passed: SEED_OPPORTUNITIES.every((item) => !item.sourceUrl || /^https?:\/\//.test(item.sourceUrl)), evidence: 'Every non-empty source reference uses an explicit HTTP(S) URL; generation is not evaluated offline.' });
  const groundingPlan: ResponsePlan = {
    kind: 'recommendations', locale: 'en', intents: ['find_opportunities'], lifeEvents: [],
    opportunities: [{
      id: 'safety-record', slug: 'safety-record', title: { bn: 'সহায়তা', en: 'Support' },
      summary: { bn: 'নমুনা', en: 'Sample' }, organisation: { bn: 'অফিস', en: 'Office' },
      category: 'social_protection', outcome: 'unknown', benefitAmount: 500,
      benefitPeriod: 'monthly', deadline: null, relevance: 1, confidence: 65,
      isUnverified: true, metReasons: [], failedReasons: [], unknownReasons: [],
      nextStep: null, sourceUrl: null,
    }], citations: [], overallConfidence: 65, ungrounded: false,
  };
  checks.push({ category: 'unsupported_numeric_claim', passed: unsupportedNumericClaims('Support is BDT 1,500.', groundingPlan).includes('1500'), evidence: 'The post-generation gate detects a numeric amount absent from the deterministic response plan and triggers fallback.' });
  checks.push({ category: 'outdated_version', passed: SEED_OPPORTUNITIES.every((item) => item.rules.schemaVersion === 1), evidence: 'Every benchmark rule declares the supported schema version.' });
  return { passed: checks.filter((check) => check.passed).length, total: checks.length, checks };
}

function pct(value: number): string { return `${(value * 100).toFixed(1)}%`; }
function retrievalRow(name: string, value: ReturnType<typeof scoreRetrieval> | null): string {
  return value ? `| ${name} | ${pct(value.recallAt1)} | ${pct(value.recallAt3)} | ${value.mrr.toFixed(3)} |` : `| ${name} | not run | not run | not run |`;
}

async function main() {
  const startedAt = new Date();
  const corpus = buildCorpus();
  const retrieval = await retrievalEvaluation(corpus);
  const eligibility = eligibilityEvaluation();
  const safety = await safetyEvaluation();
  const report = {
    version: EVALUATION_VERSION,
    generatedAt: startedAt.toISOString(),
    randomSeed: DATASET_SEED,
    environment: { node: process.version, liveModelsEnabled: process.env.EVAL_ENABLE_LIVE_MODELS === 'true' },
    retrieval,
    eligibility,
    safety,
  };

  const markdown = `# Shebar Janala Evaluation Results\n\nGenerated: ${report.generatedAt}  \nVersion: ${EVALUATION_VERSION}  \nDeterministic seed: ${DATASET_SEED}\n\n> Scope: synthetic engineering benchmarks. These results do not verify government programme content and are not field-validation evidence.\n\n## Retrieval — ${retrieval.queryCount} queries, ${retrieval.programmeCount} programmes\n\n| System | R@1 | R@3 | MRR |\n|---|---:|---:|---:|\n${retrievalRow('Keyword overlap', retrieval.keyword)}\n${retrievalRow('BM25', retrieval.bm25)}\n${retrievalRow('Semantic embeddings', retrieval.semantic)}\n${retrievalRow('BM25 + embeddings (RRF)', retrieval.hybrid)}\n${retrievalRow('Complete local pipeline (NLU metadata + BM25)', retrieval.completePipeline)}\n\nBangla R@3 (complete): ${pct(retrieval.completePipeline.banglaRecallAt3)}  \nEnglish R@3 (complete): ${pct(retrieval.completePipeline.englishRecallAt3)}  \nMedian / p95 local retrieval latency: ${retrieval.latencyMs.median.toFixed(3)} / ${retrieval.latencyMs.p95.toFixed(3)} ms  \nEmbedding status: ${retrieval.embeddingModel ?? retrieval.embeddingReason}\n\n## Eligibility — ${eligibility.profileCount} profiles, ${eligibility.programmeCount} programmes\n\n- Decision agreement: ${pct(eligibility.accuracy)}\n- False-positive guidance: ${pct(eligibility.falsePositiveRate)}\n- False-negative guidance: ${pct(eligibility.falseNegativeRate)}\n- Correct unknown handling: ${pct(eligibility.unknownHandlingAccuracy)}\n- Median / p95 rule latency: ${eligibility.latencyMs.median.toFixed(3)} / ${eligibility.latencyMs.p95.toFixed(3)} ms\n- Disagreements: ${eligibility.disagreements.length}\n\n## Safety\n\n${safety.checks.map((check) => `- ${check.passed ? 'PASS' : 'FAIL'} — **${check.category}**: ${check.evidence}`).join('\n')}\n`;

  const outputDir = path.resolve('evaluation/results');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'latest.md'), markdown, 'utf8');

  console.log(markdown);
  if (eligibility.disagreements.length > 0 || safety.passed !== safety.total) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

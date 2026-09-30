/* eslint-disable no-console */
import '../../scripts/load-env';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/lib/config/env';
import { JevDecisionModel } from '@/modules/ai/decision/jev';
import { getProvider } from '@/modules/ai/providers';
import { QUESTION_SET_VERSION } from '@/modules/ai/decision/questions';
import { POLICY_VERSION, FIELD_THRESHOLD_SOURCE, FIELD_THRESHOLDS, ROUTING_THRESHOLDS, TARGET_PRECISION } from '@/modules/ai/decision/policy';
import { VERIFIER_VERSION } from '@/modules/ai/verifier';
import { PROMPTS } from '@/prompts';
import { SEED_OPPORTUNITIES } from '@/lib/db/seed';
import type { DecisionResult } from '@/modules/ai/decision/types';
import type { GenerateResult } from '@/modules/ai/providers/types';
import { SEMANTIC_CASES } from './cases';
import { VERIFIER_CASES } from './verifier-cases';
import {
  CachedDecisionModel, CachedLlmProvider, JsonCache, fmtNum, fmtPct, latencySummary, runMetadata, sha256,
} from './infra';
import { calibrationReport, endToEndReport, jevDisagreements, routingReport, runSemanticArms, scoreArms, thresholdSweep } from './semantic';
import { runRetrievalAblation } from './retrieval';
import { evaluateLiveRendering, evaluateVerifier } from './explanation';

/**
 * Jev ablation and calibration study — `npm run eval:jev`.
 *
 *   --live        allow network calls for cache misses (needs JEV_API_KEY, and an
 *                 LLM key for the LLM arms). Without it the run is fully offline
 *                 and reproduces the committed cache exactly.
 *   --only=a,b    semantic | retrieval | verifier | render
 *   --no-llm      skip every arm that needs the generative LLM
 *
 * Writes evaluation/results/jev-latest.{json,md} and a timestamped JSON copy.
 */

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const noLlm = args.has('--no-llm');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null;
const want = (section: string) => !only || only.has(section);
const CONCURRENCY = 6;

/** Vendor list price, docs.typesafe.ai/models (retrieved 2026-09-30): $0.042 per million input tokens, output free. */
const JEV_USD_PER_MTOK_INPUT = 0.042;

function progress(label: string) {
  let last = 0;
  return (done: number, total: number) => {
    const pct = Math.floor((done / total) * 10);
    if (pct !== last || done === total) {
      last = pct;
      process.stdout.write(`  ${label}: ${done}/${total}\r`);
      if (done === total) process.stdout.write('\n');
    }
  };
}

async function main() {
  const meta = runMetadata();
  const jevCache = new JsonCache<Omit<DecisionResult, 'latencyMs'>>('jev');
  const llmCache = new JsonCache<Omit<GenerateResult, 'latencyMs'>>('llm');
  const jevLive = env.JEV_API_KEY ? new JevDecisionModel() : null;
  const jevFor = () => new CachedDecisionModel(jevLive, env.JEV_MODEL, jevCache, live);
  const provider = getProvider();
  const llmFor = () => (noLlm ? null : new CachedLlmProvider(provider, llmCache, live && provider.isLive));
  const hasJev = live ? Boolean(jevLive) : true;

  console.log(`Jev ablation — ${live ? 'LIVE (cache misses are fetched)' : 'OFFLINE (cache only)'}; model ${env.JEV_MODEL}; LLM ${noLlm ? 'disabled' : `${provider.engine}/${provider.model}`}`);

  const report: Record<string, unknown> = {
    version: 'jev-ablation@1.0.0',
    meta,
    configuration: {
      jevModelRequested: env.JEV_MODEL,
      llm: noLlm ? null : { engine: provider.engine, model: provider.model },
      questionSetVersion: QUESTION_SET_VERSION,
      policyVersion: POLICY_VERSION,
      verifierVersion: VERIFIER_VERSION,
      civicFramePromptVersion: PROMPTS.civicFrame.version,
      systemPromptVersion: PROMPTS.system.version,
      thresholds: { fields: FIELD_THRESHOLDS, source: FIELD_THRESHOLD_SOURCE, routing: ROUTING_THRESHOLDS, targetPrecision: TARGET_PRECISION },
      knowledgeBaseHash: sha256(SEED_OPPORTUNITIES.map((o) => ({ slug: o.slug, rules: o.rules, lifeEvents: o.lifeEvents }))).slice(0, 16),
      datasets: {
        semantic: { cases: SEMANTIC_CASES.length, hash: sha256(SEMANTIC_CASES).slice(0, 16) },
        verifier: { cases: VERIFIER_CASES.length, hash: sha256(VERIFIER_CASES).slice(0, 16) },
      },
    },
  };

  const latency: Record<string, unknown> = {};
  const tokens: Record<string, unknown> = {};

  /* ------------------------------------------------------------ semantic */
  if (want('semantic')) {
    const jev = hasJev ? jevFor() : null;
    const llm = llmFor();
    const runs = await runSemanticArms({ jev, llm, concurrency: CONCURRENCY, onProgress: progress('semantic') });
    report.semantic = {
      extraction: scoreArms(runs),
      calibration: calibrationReport(runs),
      thresholdSweep: thresholdSweep(runs),
      routing: routingReport(runs),
      endToEnd: endToEndReport(runs),
      jevDisagreements: jevDisagreements(runs),
      llmStrictSchemaFailureRate: (() => {
        const attempted = runs.filter((r) => r.llmStrictOk !== null);
        return attempted.length ? attempted.filter((r) => r.llmStrictOk === false).length / attempted.length : null;
      })(),
      jevErrors: runs.filter((r) => r.jevError).map((r) => ({ id: r.caseId, error: r.jevError })),
      llmErrors: runs.filter((r) => r.llmError).map((r) => ({ id: r.caseId, error: r.llmError })),
      answeredBy: [...new Set(runs.map((r) => r.jevFrame?.model).filter(Boolean))],
    };
    if (jev) {
      latency.jevUnderstanding = latencySummary(jev.latencies);
      tokens.jevUnderstanding = { meanInput: jev.inputTokens.reduce((s, x) => s + x, 0) / Math.max(1, jev.inputTokens.length) };
    }
    if (llm) {
      latency.llmCivicFrame = latencySummary(llm.latencies);
      tokens.llmCivicFrame = {
        meanInput: llm.tokensIn.reduce((s, x) => s + x, 0) / Math.max(1, llm.tokensIn.length),
        meanOutput: llm.tokensOut.reduce((s, x) => s + x, 0) / Math.max(1, llm.tokensOut.length),
      };
    }
  }

  /* ----------------------------------------------------------- retrieval */
  if (want('retrieval')) {
    const jev = hasJev ? jevFor() : null;
    report.retrieval = await runRetrievalAblation({ jev, concurrency: CONCURRENCY, onProgress: progress('retrieval') });
    if (jev) latency.jevRetrieval = latencySummary(jev.latencies);
  }

  /* ------------------------------------------------------------ verifier */
  if (want('verifier') && hasJev) {
    const jev = jevFor();
    report.verifier = await evaluateVerifier(jev, CONCURRENCY);
    latency.jevVerifier = latencySummary(jev.latencies);
  }

  /* -------------------------------------------------------------- render */
  const llm = llmFor();
  if (want('render') && hasJev && llm) {
    const jev = jevFor();
    try {
      report.render = await evaluateLiveRendering(llm, jev, 3);
      latency.llmRender = latencySummary(llm.latencies);
      latency.jevVerifierLive = latencySummary(jev.latencies);
    } catch (error) {
      report.render = { error: error instanceof Error ? error.message : String(error) };
    }
  }

  const understandingTokens = (tokens.jevUnderstanding as { meanInput: number } | undefined)?.meanInput ?? null;
  report.latencyMs = latency;
  report.cost = {
    jev: {
      priceSource: 'docs.typesafe.ai/models — vendor list price, retrieved 2026-09-30; output tokens free',
      usdPerMillionInputTokens: JEV_USD_PER_MTOK_INPUT,
      meanInputTokensPerTurnUnderstanding: understandingTokens,
      usdPerTurnUnderstanding: understandingTokens === null ? null : (understandingTokens * JEV_USD_PER_MTOK_INPUT) / 1e6,
    },
    llm: { note: 'Token counts only: no price source for the configured LLM is recorded in this repository.', tokens: tokens.llmCivicFrame ?? null },
  };
  report.cache = { jev: { hits: jevCache.hits, misses: jevCache.misses }, llm: { hits: llmCache.hits, misses: llmCache.misses } };

  jevCache.save();
  llmCache.save();

  const dir = path.resolve('evaluation/results');
  fs.mkdirSync(dir, { recursive: true });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(path.join(dir, 'jev-latest.json'), json, 'utf8');
  fs.writeFileSync(path.join(dir, `jev-${meta.generatedAt.replace(/[:.]/g, '-')}.json`), json, 'utf8');
  const md = renderMarkdown(report);
  fs.writeFileSync(path.join(dir, 'jev-latest.md'), md, 'utf8');
  console.log(md);
}

/* ------------------------------------------------------------ markdown */

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function renderMarkdown(r: Any): string {
  const out: string[] = [];
  const c = r.configuration;
  out.push('# Jev ablation and calibration study', '');
  out.push(`Generated ${r.meta.generatedAt} · commit \`${r.meta.gitCommit?.slice(0, 10) ?? '?'}\`${r.meta.gitDirty ? ' (uncommitted changes)' : ''} · branch \`${r.meta.gitBranch}\``);
  out.push(`Jev requested \`${c.jevModelRequested}\`, answered by ${(r.semantic?.answeredBy ?? []).map((m: string) => `\`${m}\``).join(', ') || '—'} · LLM ${c.llm ? `\`${c.llm.engine}/${c.llm.model}\`` : 'not run'}`);
  out.push(`Question set \`${c.questionSetVersion}\` · policy \`${c.policyVersion}\` (thresholds: ${c.thresholds.source.source}) · verifier \`${c.verifierVersion}\` · KB \`${c.knowledgeBaseHash}\``);
  out.push(`Cache: Jev ${r.cache.jev.hits} hits / ${r.cache.jev.misses} misses · LLM ${r.cache.llm.hits} / ${r.cache.llm.misses}`, '');
  out.push('> Synthetic, author-labelled, single-annotator benchmarks built from this repository\'s programmes. They measure implementation behaviour on known-difficulty probes; they are not a population sample and do not validate government programme content.', '');

  const s = r.semantic;
  if (s) {
    out.push(`## 1. Semantic extraction — ${c.datasets.semantic.cases} cases`, '');
    out.push('Field-level scoring. **False assertion** = a fact accepted that the writer never stated about themselves — the error that can produce a wrong "you qualify".', '');
    out.push('| Arm | Precision | Recall | F1 | False-assertion rate | Wrong-value rate | Held for confirmation |');
    out.push('|---|---:|---:|---:|---:|---:|---:|');
    const armLabel: Record<string, string> = {
      pattern_legacy: 'A. Pattern, accepted (previous behaviour)',
      pattern_confirm: 'A′. Pattern, held for confirmation (fallback)',
      llm_all: 'L. LLM frame, all facts',
      llm_accept: 'L′. LLM frame, confidence ≥ threshold',
      jev: 'B. Jev, policy thresholds',
      jev_any: 'B′. Jev, any fact ≥ 0.5',
    };
    for (const [arm, v] of Object.entries<Any>(s.extraction)) {
      const o = v.overall;
      out.push(`| ${armLabel[arm] ?? arm} | ${fmtPct(o.precision)} | ${fmtPct(o.recall)} | ${fmtNum(o.f1, 2)} | ${fmtPct(o.falseAssertionRate, 2)} (${o.falseAssertion}) | ${fmtPct(o.wrongValueRate)} (${o.wrongValue}) | ${o.heldCorrect + o.heldWrong} |`);
    }
    out.push('');
    for (const dim of ['byLanguage', 'byCategory'] as const) {
      out.push(`### ${dim === 'byLanguage' ? 'By language' : 'By category'} — precision / recall / false assertions`, '');
      const arms = Object.keys(s.extraction);
      const keys = [...new Set(arms.flatMap((a) => Object.keys(s.extraction[a][dim])))].sort();
      out.push(`| ${dim === 'byLanguage' ? 'Language' : 'Category'} | ${arms.map((a) => a).join(' | ')} |`);
      out.push(`|---|${arms.map(() => '---:').join('|')}|`);
      for (const k of keys) {
        out.push(`| ${k} | ${arms.map((a) => {
          const x = s.extraction[a][dim][k];
          return x ? `${fmtPct(x.precision, 0)} / ${fmtPct(x.recall, 0)} / ${x.falseAssertion}` : '—';
        }).join(' | ')} |`);
      }
      out.push('');
    }

    const cal = s.calibration;
    out.push('## 2. Calibration', '');
    out.push('| Predictions | n | Accuracy | Mean confidence | Brier | ECE (10 bins) |');
    out.push('|---|---:|---:|---:|---:|---:|');
    const calRow = (label: string, x: Any | null) => x && x.n ? out.push(`| ${label} | ${x.n} | ${fmtPct(x.accuracy)} | ${fmtPct(x.meanConfidence)} | ${fmtNum(x.brier)} | ${fmtNum(x.ece)} |`) : out.push(`| ${label} | 0 | — | — | — | — |`);
    calRow('Jev all typed answers, top label', cal.topLabel);
    calRow('Jev Choice (self-facts, residence), top label', cal.choice);
    calRow('Jev number roles, top label', cal.numberRole);
    calRow('Jev Noul, top label (yes iff P ≥ 0.5)', cal.noul);
    calRow('Jev asserted facts (p ≥ 0.5)', cal.assertions);
    calRow('LLM asserted facts (self-reported confidence)', cal.llmAssertions);
    for (const [lang, x] of Object.entries<Any>(cal.byLanguage)) calRow(`Jev all typed answers — ${lang}`, x);
    out.push('', '**Reliability — Jev asserted facts**', '', '| Bin | n | Mean p | Accuracy |', '|---|---:|---:|---:|');
    for (const b of cal.assertions.bins ?? []) out.push(`| ${b.lo.toFixed(1)}–${b.hi.toFixed(1)} | ${b.n} | ${fmtPct(b.meanP)} | ${fmtPct(b.accuracy)} |`);
    if (cal.llmAssertions?.bins?.length) {
      out.push('', '**Reliability — LLM asserted facts**', '', '| Bin | n | Mean confidence | Accuracy |', '|---|---:|---:|---:|');
      for (const b of cal.llmAssertions.bins) out.push(`| ${b.lo.toFixed(1)}–${b.hi.toFixed(1)} | ${b.n} | ${fmtPct(b.meanP)} | ${fmtPct(b.accuracy)} |`);
    }
    const sweep = s.thresholdSweep;
    out.push('', `### Acceptance-threshold sweep (target precision ${fmtPct(sweep.target, 0)}, min support ${sweep.minSupport})`, '');
    out.push('| Threshold | Accepted | Precision | 95% lower bound | Coverage of gold facts | False assertions |', '|---:|---:|---:|---:|---:|---:|');
    for (const row of sweep.rows.filter((x: Any) => [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.99].includes(x.threshold))) {
      out.push(`| ${row.threshold.toFixed(2)} | ${row.accepted} | ${fmtPct(row.precision)} | ${fmtPct(row.precisionLower95)} | ${fmtPct(row.coverage)} | ${row.falseAssertions} |`);
    }
    out.push('');
    out.push(sweep.pointEstimate
      ? `Point estimate: the lowest threshold whose observed precision meets the target is ${sweep.pointEstimate.threshold.toFixed(2)}.`
      : 'No threshold meets the target even on the point estimate.');
    out.push(sweep.supported
      ? `Supported: the lowest threshold whose 95% lower bound meets the target is **${sweep.supported.threshold.toFixed(2)}**.`
      : '**Not supported:** no threshold reaches the target at its 95% lower bound on this sample, so the data does not justify LOWERING the acceptance threshold below the conservative default.');
    out.push('');

    const rt = s.routing;
    out.push('## 3. Routing judgments', '');
    out.push('| Judgment | Jev | Pattern / keyword | n |', '|---|---:|---:|---:|');
    out.push(`| Main situation (accuracy) | ${fmtPct(rt.situation.jev)} | ${fmtPct(rt.situation.keyword)} | ${rt.situation.n} |`);
    for (const [lang, x] of Object.entries<Any>(rt.situationByLanguage)) out.push(`| Main situation — ${lang} | ${fmtPct(x.jev)} | ${fmtPct(x.keyword)} | ${x.n} |`);
    out.push(`| Message kind (greeting / off-topic / situation) | ${fmtPct(rt.messageKind.jev)} | ${fmtPct(rt.messageKind.pattern)} | ${rt.messageKind.n} |`);
    out.push(`| Instruction injection — detection rate | ${fmtPct(rt.injection.jev.tpr)} | ${fmtPct(rt.injection.pattern.tpr)} | ${rt.injection.jev.positives} |`);
    out.push(`| Instruction injection — false-flag rate | ${fmtPct(rt.injection.jev.fpr)} | ${fmtPct(rt.injection.pattern.fpr)} | ${rt.injection.jev.negatives} |`, '');

    out.push('## 4. End-to-end effect on deterministic eligibility', '');
    out.push('Every arm feeds the SAME rule engine on the 10 benchmark programmes; gold = the verdicts the labelled facts produce. Differences are caused by interpretation alone.', '');
    out.push('| Arm | Verdicts | Agreement | False "eligible" | False "not eligible" | Needless "unknown" | Positive recall |', '|---|---:|---:|---:|---:|---:|---:|');
    for (const [arm, v] of Object.entries<Any>(s.endToEnd)) {
      out.push(`| ${arm} | ${v.decisions} | ${fmtPct(v.agreement)} | ${v.falseEligible} (${fmtPct(v.falseEligibleRate, 2)}) | ${v.falseDenial} (${fmtPct(v.falseDenialRate, 2)}) | ${v.overCautious} (${fmtPct(v.overCautiousRate)}) | ${fmtPct(v.positiveRecall)} (of ${v.goldPositive}) |`);
    }
    out.push('');
    for (const [arm, v] of Object.entries<Any>(s.endToEnd)) {
      if (v.falseEligibleExamples.length) out.push(`- ${arm} false "eligible": ${v.falseEligibleExamples.map((e: Any) => `\`${e.caseId}\`→${e.programme}`).join(', ')}`);
    }
    out.push('', `LLM civic frame: ${fmtPct(s.llmStrictSchemaFailureRate)} of frames would be rejected outright by the production (strict) parser. The LLM arms above parse each fact individually, so they measure the model rather than the parser.`);
    if (s.jevErrors.length) out.push(`Jev call errors: ${s.jevErrors.length}.`);
    if (s.llmErrors.length) out.push(`LLM call errors: ${s.llmErrors.length} (${s.llmErrors.slice(0, 2).map((e: Any) => String(e.error).slice(0, 120)).join('; ')}).`);
    const dis = s.jevDisagreements as Any[];
    out.push('', `### Every Jev result that was not a correct accepted fact (${dis.length})`, '', '| Case | Lang | Field | Gold | Jev | p | Status | Kind |', '|---|---|---|---|---|---:|---|---|');
    for (const d of dis) out.push(`| ${d.caseId} | ${d.lang} | ${d.field} | ${d.gold ?? '—'} | ${d.predicted ?? '—'} | ${d.probability === null ? '—' : d.probability.toFixed(2)} | ${d.status ?? '—'} | ${d.kind} |`);
    out.push('');
  }

  const rv = r.retrieval;
  if (rv) {
    out.push(`## 5. Retrieval ablation — ${rv.queries} queries (Jev re-rank depth ${rv.rerankDepth})`, '');
    out.push('| Arm | R@1 | R@3 | R@5 | MRR | Bangla R@3 | English R@3 |', '|---|---:|---:|---:|---:|---:|---:|');
    for (const [arm, v] of Object.entries<Any>(rv.arms)) out.push(`| ${arm} | ${fmtPct(v.recallAt1)} | ${fmtPct(v.recallAt3)} | ${fmtPct(v.recallAt5)} | ${fmtNum(v.mrr)} | ${fmtPct(v.banglaRecallAt3)} | ${fmtPct(v.englishRecallAt3)} |`);
    if (rv.failureCount) out.push('', `Jev failures: ${rv.failureCount}`);
    out.push('');
  }

  const vf = r.verifier;
  if (vf) {
    out.push(`## 6. Explanation verifier — ${vf.cases} labelled prose/verdict pairs`, '');
    out.push('| Slice | Contradictions caught | Faithful prose wrongly rejected |', '|---|---:|---:|');
    out.push(`| All | ${fmtPct(vf.truePositiveRate)} | ${fmtPct(vf.falsePositiveRate)} |`);
    for (const [lang, x] of Object.entries<Any>(vf.byLanguage)) out.push(`| ${lang} (n=${x.n}) | ${fmtPct(x.tpr)} | ${fmtPct(x.fpr)} |`);
    for (const [split, x] of Object.entries<Any>(vf.bySplit)) out.push(`| ${split === 'dev' ? 'dev (seen while revising wording)' : '**held-out (never tuned on)**'} (n=${x.n}) | ${fmtPct(x.tpr)} | ${fmtPct(x.fpr)} |`);
    if (vf.misses.length) out.push('', `Misclassified: ${vf.misses.map((m: Any) => `\`${m.id}\` (${m.split}, ${m.kind}, ${m.expectedReject ? 'missed' : 'false reject'})`).join(', ')}`);
    out.push('');
  }

  const rd = r.render;
  if (rd && !rd.error) {
    out.push('## 7. Live rendering through the gates', '');
    out.push('| Condition | Turns | Model prose shown (verified) | Paths |', '|---|---:|---:|---|');
    for (const [label, x] of [['Clean knowledge', rd.clean], ['Poisoned knowledge passage', rd.poisoned]] as const) {
      out.push(`| ${label} | ${x.n} | ${fmtPct(x.modelShownRate)} | ${Object.entries(x.paths).map(([k, v]) => `${k}: ${v}`).join(', ')} |`);
    }
    out.push('', 'Raw model texts for every turn are in `jev-latest.json` → `render.rows` for human audit.', '');
  } else if (rd?.error) {
    out.push('## 7. Live rendering', '', `Not completed: ${rd.error}`, '');
  }

  out.push('## 8. Latency and cost (measured in this application)', '');
  out.push('| Stage | Calls | p50 ms | p95 ms | p99 ms | max ms |', '|---|---:|---:|---:|---:|---:|');
  for (const [stage, x] of Object.entries<Any>(r.latencyMs)) {
    out.push(`| ${stage} | ${x.n} | ${x.p50 ?? '—'} | ${x.p95 ?? '—'} | ${x.p99 ?? 'n<100'} | ${x.max ?? '—'} |`);
  }
  const cost = r.cost.jev;
  out.push('', `Jev turn understanding: mean ${cost.meanInputTokensPerTurnUnderstanding === null ? '—' : Math.round(cost.meanInputTokensPerTurnUnderstanding)} input tokens → ${cost.usdPerTurnUnderstanding === null ? '—' : `$${cost.usdPerTurnUnderstanding.toFixed(6)}`} per turn at the vendor list price (${cost.priceSource}).`);
  if (r.cost.llm.tokens) out.push(`LLM civic frame: mean ${Math.round(r.cost.llm.tokens.meanInput)} input / ${Math.round(r.cost.llm.tokens.meanOutput)} output tokens per turn; ${r.cost.llm.note}`);
  out.push('', 'Latencies of cached answers are the latencies measured when they were first fetched.', '');
  return out.join('\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

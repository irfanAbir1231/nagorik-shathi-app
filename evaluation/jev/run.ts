/* eslint-disable no-console */
import '../../scripts/load-env';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/lib/config/env';
import { JevDecisionModel } from '@/modules/ai/decision/jev';
import { LlmTypedDecisionModel } from '@/modules/ai/decision/llm-typed';
import { ENGINE_VERSION } from '@/modules/eligibility/engine';
import { REDACTION_VERSION } from '@/modules/ai/redact';
import { STAGE_BUDGET_MS, TURN_BUDGET_MS } from '@/modules/ai/budget';
import { getProvider } from '@/modules/ai/providers';
import { QUESTION_SET_VERSION } from '@/modules/ai/decision/questions';
import { POLICY_VERSION, ENGINE_THRESHOLD_SOURCE, FIELD_THRESHOLDS, ROUTING_THRESHOLDS, TARGET_PRECISION, VERIFIER_THRESHOLDS } from '@/modules/ai/decision/policy';
import { VERIFIER_VERSION } from '@/modules/ai/verifier';
import { PROMPTS } from '@/prompts';
import { SEED_OPPORTUNITIES } from '@/lib/db/seed';
import type { DecisionResult } from '@/modules/ai/decision/types';
import type { GenerateResult, LlmProvider } from '@/modules/ai/providers/types';
import { DESIGN_OVERLAP_IDS, SEMANTIC_CASES, SEMANTIC_DATASET_VERSION, type SemanticCase } from './cases';
import { VERIFIER_CASES } from './verifier-cases';
import {
  CachedDecisionModel, CachedLlmProvider, JsonCache, fmtNum, fmtPct, latencySummary, runMetadata, sha256,
} from './infra';
import {
  BOOTSTRAP, calibrationReport, endToEndReport, headlineIntervals, jevDisagreements, registerCases, routingReport, runSemanticArms, scoreArms, thresholdSweep,
  type ArmName, type CaseRun, type FrameArm,
} from './semantic';
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
 * Splits: `all` (the built-in, author-labelled set), `clean` (all minus the
 * cases whose failures shaped the question design — DESIGN_OVERLAP_IDS) and,
 * when evaluation/jev/annotation/field-set.json exists, `independent` (real,
 * anonymised, doubly-annotated messages; see annotation/PROTOCOL.md).
 *
 * Writes evaluation/results/jev-latest.{json,md} and a timestamped JSON copy.
 */

const FIELD_SET = path.resolve('evaluation/jev/annotation/field-set.json');

/**
 * Offline replay without an LLM key. The LLM cache is keyed by the model that
 * answered, and with no key `getProvider()` is the simulated provider, so
 * every lookup would miss. Replay under the identity the committed run
 * recorded instead: this provider can only be answered from the cache.
 */
function replayProvider(): LlmProvider | null {
  const file = path.resolve('evaluation/results/jev-latest.json');
  if (!fs.existsSync(file)) return null;
  const llm = (JSON.parse(fs.readFileSync(file, 'utf8')) as { configuration?: { llm?: { engine: LlmProvider['engine']; model: string } | null } }).configuration?.llm;
  if (!llm?.model) return null;
  return {
    engine: llm.engine, model: llm.model, isLive: false,
    async generate() { throw new Error('Replay-only provider: not in the cache.'); },
  };
}

/** The independent split, if someone has collected and labelled one. Never committed. */
function loadFieldSet(): { cases: SemanticCase[]; hash: string; annotators: number } | null {
  if (!fs.existsSync(FIELD_SET)) return null;
  const parsed = JSON.parse(fs.readFileSync(FIELD_SET, 'utf8')) as { cases?: SemanticCase[]; annotators?: unknown[] };
  const cases = (parsed.cases ?? []).filter((c) => typeof c?.id === 'string' && typeof c?.text === 'string' && c.facts && typeof c.facts === 'object');
  if (cases.length === 0) return null;
  registerCases(cases);
  return { cases, hash: sha256(cases).slice(0, 16), annotators: parsed.annotators?.length ?? 0 };
}

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const noLlm = args.has('--no-llm');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null;
const want = (section: string) => !only || only.has(section);
const CONCURRENCY = 6;
const HEADLINE_ARMS: ArmName[] = ['pattern_legacy', 'pattern_confirm', 'llm_accept', 'llm_typed', 'jev'];

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
  const configured = getProvider();
  const provider = live || configured.isLive ? configured : (replayProvider() ?? configured);
  const llmFor = () => (noLlm ? null : new CachedLlmProvider(provider, llmCache, live && provider.isLive));
  const hasJev = live ? Boolean(jevLive) : true;
  const fieldSet = loadFieldSet();

  console.log(`Jev ablation — ${live ? 'LIVE (cache misses are fetched)' : 'OFFLINE (cache only)'}; model ${env.JEV_MODEL}; LLM ${noLlm ? 'disabled' : `${provider.engine}/${provider.model}`}`);

  const report: Record<string, unknown> = {
    version: 'jev-ablation@1.1.0',
    meta,
    configuration: {
      jevModelRequested: env.JEV_MODEL,
      llm: noLlm ? null : { engine: provider.engine, model: provider.model },
      questionSetVersion: QUESTION_SET_VERSION,
      policyVersion: POLICY_VERSION,
      verifierVersion: VERIFIER_VERSION,
      engineVersion: ENGINE_VERSION,
      redactionVersion: REDACTION_VERSION,
      turnBudgetMs: { total: TURN_BUDGET_MS, stages: STAGE_BUDGET_MS },
      civicFramePromptVersion: PROMPTS.civicFrame.version,
      systemPromptVersion: PROMPTS.system.version,
      thresholds: { fields: FIELD_THRESHOLDS, source: ENGINE_THRESHOLD_SOURCE, routing: ROUTING_THRESHOLDS, verifier: VERIFIER_THRESHOLDS, targetPrecision: TARGET_PRECISION },
      bootstrap: { ...BOOTSTRAP, unit: 'case', interval: '95% percentile' },
      knowledgeBaseHash: sha256(SEED_OPPORTUNITIES.map((o) => ({ slug: o.slug, rules: o.rules, lifeEvents: o.lifeEvents }))).slice(0, 16),
      datasets: {
        semantic: { version: SEMANTIC_DATASET_VERSION, cases: SEMANTIC_CASES.length, hash: sha256(SEMANTIC_CASES).slice(0, 16), designOverlap: DESIGN_OVERLAP_IDS.size },
        independent: fieldSet ? { cases: fieldSet.cases.length, hash: fieldSet.hash, annotators: fieldSet.annotators } : null,
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
    // The production fallback: the SAME typed questions, answered by the LLM.
    const typedProvider = llmFor();
    const llmTyped = typedProvider ? new LlmTypedDecisionModel(typedProvider) : null;
    const runs = await runSemanticArms({ jev, llm, llmTyped, concurrency: CONCURRENCY, onProgress: progress('semantic') });
    const independentRuns = fieldSet
      ? await runSemanticArms({ jev, llm, llmTyped, cases: fieldSet.cases, concurrency: CONCURRENCY, onProgress: progress('independent') })
      : [];
    const clean = runs.filter((r) => !DESIGN_OVERLAP_IDS.has(r.caseId));
    const splits: Record<string, readonly CaseRun[]> = { all: runs, clean, ...(independentRuns.length ? { independent: independentRuns } : {}) };
    const engines: FrameArm[] = ['jev', 'llm_typed'];
    const perEngine = <T>(fn: (arm: FrameArm) => T) => Object.fromEntries(engines.map((e) => [e, fn(e)])) as Record<FrameArm, T>;
    report.semantic = {
      splits: Object.fromEntries(Object.entries(splits).map(([name, rs]) => [name, {
        cases: rs.length,
        extraction: scoreArms(rs),
        endToEnd: endToEndReport(rs),
        intervals: headlineIntervals(rs, HEADLINE_ARMS),
      }])),
      calibration: perEngine((e) => calibrationReport(runs, e)),
      thresholdSweep: perEngine((e) => thresholdSweep(runs, e)),
      thresholdSweepClean: perEngine((e) => thresholdSweep(clean, e)),
      routing: perEngine((e) => routingReport(runs, e)),
      disagreements: perEngine((e) => jevDisagreements(runs, e)),
      llmStrictSchemaFailureRate: (() => {
        const attempted = runs.filter((r) => r.llmStrictOk !== null);
        return attempted.length ? attempted.filter((r) => r.llmStrictOk === false).length / attempted.length : null;
      })(),
      jevErrors: runs.filter((r) => r.jevError).map((r) => ({ id: r.caseId, error: r.jevError })),
      typedErrors: runs.filter((r) => r.typedError).map((r) => ({ id: r.caseId, error: r.typedError })),
      llmErrors: runs.filter((r) => r.llmError).map((r) => ({ id: r.caseId, error: r.llmError })),
      answeredBy: [...new Set(runs.map((r) => r.jevFrame?.model).filter(Boolean))],
      typedAnsweredBy: [...new Set(runs.map((r) => r.typedFrame?.model).filter(Boolean))],
    };
    if (jev) {
      latency.jevUnderstanding = latencySummary(jev.latencies);
      tokens.jevUnderstanding = { meanInput: jev.inputTokens.reduce((s, x) => s + x, 0) / Math.max(1, jev.inputTokens.length) };
    }
    if (typedProvider) {
      latency.llmTypedUnderstanding = latencySummary(typedProvider.latencies);
      tokens.llmTypedUnderstanding = {
        meanInput: typedProvider.tokensIn.reduce((s, x) => s + x, 0) / Math.max(1, typedProvider.tokensIn.length),
        meanOutput: typedProvider.tokensOut.reduce((s, x) => s + x, 0) / Math.max(1, typedProvider.tokensOut.length),
      };
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
    llm: { note: 'Token counts only: no price source for the configured LLM is recorded in this repository.', tokens: tokens.llmCivicFrame ?? null, typedTokens: tokens.llmTypedUnderstanding ?? null },
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
  out.push(`Jev requested \`${c.jevModelRequested}\`, answered by ${(r.semantic?.answeredBy ?? []).map((m: string) => `\`${m}\``).join(', ') || '—'} · LLM ${c.llm ? `\`${c.llm.engine}/${c.llm.model}\`` : 'not run'} · typed fallback ${(r.semantic?.typedAnsweredBy ?? []).map((m: string) => `\`${m}\``).join(', ') || '—'}`);
  out.push(`Question set \`${c.questionSetVersion}\` · policy \`${c.policyVersion}\` · verifier \`${c.verifierVersion}\` · rule engine \`${c.engineVersion}\` · redaction \`${c.redactionVersion}\` · KB \`${c.knowledgeBaseHash}\``);
  out.push(`Cache: Jev ${r.cache.jev.hits} hits / ${r.cache.jev.misses} misses · LLM ${r.cache.llm.hits} / ${r.cache.llm.misses}`, '');
  out.push('> Synthetic, author-labelled, single-annotator benchmarks (until a second annotator and an independent split exist — see `evaluation/jev/annotation/`) built from this repository\'s programmes. They measure implementation behaviour on known-difficulty probes; they are not a population sample and do not validate government programme content.', '');

  const s = r.semantic;
  const armLabel: Record<string, string> = {
    pattern_legacy: 'A. Pattern, accepted (previous behaviour)',
    pattern_confirm: 'A′. Pattern, held for confirmation (last fallback)',
    llm_all: 'L. LLM civic frame, all facts',
    llm_accept: 'L′. LLM civic frame, confidence ≥ threshold',
    llm_typed: 'T. LLM on the typed questions (first fallback)',
    jev: 'B. Jev, policy thresholds',
    jev_any: 'B′. Jev, any fact ≥ 0.5',
  };
  const engineLabel: Record<string, string> = { jev: 'Jev', llm_typed: 'Typed LLM' };
  const ci = (x: Any | undefined, digits = 1) => (x && x.value !== null
    ? `${fmtPct(x.value, digits)}${x.lo !== null ? ` [${fmtPct(x.lo, digits)}–${fmtPct(x.hi, digits)}]` : ''}`
    : '—');
  if (s) {
    const all = s.splits.all;
    out.push(`## 1. Semantic extraction — ${c.datasets.semantic.cases} cases (\`${c.datasets.semantic.version}\`)`, '');
    out.push(`Splits: **all**; **clean** = all minus the ${c.datasets.semantic.designOverlap} cases whose failures shaped the question design${s.splits.independent ? '; **independent** = real, anonymised, doubly-annotated messages' : '; no independent split yet (see `evaluation/jev/annotation/PROTOCOL.md`)'}.`, '');
    out.push(`### Headline, with case-level 95% bootstrap intervals (${c.bootstrap.resamples} resamples, seed ${c.bootstrap.seed})`, '');
    out.push('| Split | Arm | Precision | Recall | False-assertion rate | False "eligible" rate | Positive recall |');
    out.push('|---|---|---:|---:|---:|---:|---:|');
    for (const [split, v] of Object.entries<Any>(s.splits)) {
      for (const [arm, x] of Object.entries<Any>(v.intervals)) {
        out.push(`| ${split} (${v.cases}) | ${armLabel[arm] ?? arm} | ${ci(x.precision)} | ${ci(x.recall)} | ${ci(x.falseAssertionRate, 2)} | ${ci(x.falseEligibleRate, 2)} | ${ci(x.positiveRecall)} |`);
      }
    }
    out.push('', 'Intervals resample whole cases (the fields and programmes within one message are not independent). Overlapping intervals mean the sample cannot tell the arms apart.', '');
    out.push('### All arms, all cases', '');
    out.push('**False assertion** = a fact accepted that the writer never stated about themselves — the error that can produce a wrong "you qualify".', '');
    out.push('| Arm | Precision | Recall | F1 | False-assertion rate | Wrong-value rate | Held for confirmation |');
    out.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const [arm, v] of Object.entries<Any>(all.extraction)) {
      const o = v.overall;
      out.push(`| ${armLabel[arm] ?? arm} | ${fmtPct(o.precision)} | ${fmtPct(o.recall)} | ${fmtNum(o.f1, 2)} | ${fmtPct(o.falseAssertionRate, 2)} (${o.falseAssertion}) | ${fmtPct(o.wrongValueRate)} (${o.wrongValue}) | ${o.heldCorrect + o.heldWrong} |`);
    }
    out.push('');
    for (const dim of ['byLanguage', 'byCategory'] as const) {
      out.push(`### ${dim === 'byLanguage' ? 'By language' : 'By category'} — precision / recall / false assertions`, '');
      const arms = Object.keys(all.extraction);
      const keys = [...new Set(arms.flatMap((a) => Object.keys(all.extraction[a][dim])))].sort();
      out.push(`| ${dim === 'byLanguage' ? 'Language' : 'Category'} | ${arms.join(' | ')} |`);
      out.push(`|---|${arms.map(() => '---:').join('|')}|`);
      for (const k of keys) {
        out.push(`| ${k} | ${arms.map((a) => {
          const x = all.extraction[a][dim][k];
          return x ? `${fmtPct(x.precision, 0)} / ${fmtPct(x.recall, 0)} / ${x.falseAssertion}` : '—';
        }).join(' | ')} |`);
      }
      out.push('');
    }

    out.push('## 2. Calibration', '');
    out.push('| Engine | Predictions | n | Accuracy | Mean confidence | Brier | ECE (10 bins) |');
    out.push('|---|---|---:|---:|---:|---:|---:|');
    const calRow = (engine: string, label: string, x: Any | null) => (x && x.n
      ? out.push(`| ${engine} | ${label} | ${x.n} | ${fmtPct(x.accuracy)} | ${fmtPct(x.meanConfidence)} | ${fmtNum(x.brier)} | ${fmtNum(x.ece)} |`)
      : out.push(`| ${engine} | ${label} | 0 | — | — | — | — |`));
    for (const [engine, cal] of Object.entries<Any>(s.calibration)) {
      const e = engineLabel[engine] ?? engine;
      calRow(e, 'all typed answers, top label', cal.topLabel);
      calRow(e, 'Choice (self-facts, residence)', cal.choice);
      calRow(e, 'flags (yes / explicitly no / not stated)', cal.flag);
      calRow(e, 'number roles', cal.numberRole);
      calRow(e, 'asserted facts (p ≥ 0.5)', cal.assertions);
      for (const [lang, x] of Object.entries<Any>(cal.byLanguage)) calRow(e, `all typed answers — ${lang}`, x);
    }
    calRow('LLM civic frame', 'asserted facts (self-reported confidence)', s.calibration.jev.llmAssertions);
    for (const [engine, cal] of Object.entries<Any>(s.calibration)) {
      out.push('', `**Reliability — ${engineLabel[engine] ?? engine} asserted facts**`, '', '| Bin | n | Mean p | Accuracy |', '|---|---:|---:|---:|');
      for (const b of cal.assertions.bins ?? []) out.push(`| ${b.lo.toFixed(1)}–${b.hi.toFixed(1)} | ${b.n} | ${fmtPct(b.meanP)} | ${fmtPct(b.accuracy)} |`);
    }
    for (const [label, sweeps] of [['all cases', s.thresholdSweep], ['clean split', s.thresholdSweepClean]] as const) {
      for (const [engine, sweep] of Object.entries<Any>(sweeps)) {
        out.push('', `### Acceptance-threshold sweep — ${engineLabel[engine] ?? engine}, ${label} (target precision ${fmtPct(sweep.target, 0)}, min support ${sweep.minSupport})`, '');
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
      }
    }
    out.push('');

    out.push('## 3. Routing judgments', '');
    const rj = s.routing.jev;
    const rl = s.routing.llm_typed;
    out.push('| Judgment | Jev | Typed LLM | Pattern / keyword | n |', '|---|---:|---:|---:|---:|');
    out.push(`| Main situation (accuracy) | ${fmtPct(rj.situation.engine)} | ${fmtPct(rl.situation.engine)} | ${fmtPct(rj.situation.keyword)} | ${rj.situation.n} |`);
    for (const [lang, x] of Object.entries<Any>(rj.situationByLanguage)) out.push(`| Main situation — ${lang} | ${fmtPct(x.engine)} | ${fmtPct(rl.situationByLanguage[lang]?.engine)} | ${fmtPct(x.keyword)} | ${x.n} |`);
    out.push(`| Message kind (greeting / off-topic / situation) | ${fmtPct(rj.messageKind.engine)} | ${fmtPct(rl.messageKind.engine)} | ${fmtPct(rj.messageKind.pattern)} | ${rj.messageKind.n} |`);
    out.push(`| Instruction injection — detection rate | ${fmtPct(rj.injection.engine.tpr)} | ${fmtPct(rl.injection.engine.tpr)} | ${fmtPct(rj.injection.pattern.tpr)} | ${rj.injection.pattern.positives} |`);
    out.push(`| Instruction injection — false-flag rate | ${fmtPct(rj.injection.engine.fpr)} | ${fmtPct(rl.injection.engine.fpr)} | ${fmtPct(rj.injection.pattern.fpr)} | ${rj.injection.pattern.negatives} |`, '');

    out.push('## 4. End-to-end effect on deterministic eligibility', '');
    out.push('Every arm feeds the SAME rule engine on the 10 benchmark programmes; gold = the verdicts the labelled facts produce. Differences are caused by interpretation alone.', '');
    for (const [split, v] of Object.entries<Any>(s.splits)) {
      out.push(`**${split}** (${v.cases} cases)`, '');
      out.push('| Arm | Verdicts | Agreement | False "eligible" | False "not eligible" | Needless "unknown" | Positive recall |', '|---|---:|---:|---:|---:|---:|---:|');
      for (const [arm, x] of Object.entries<Any>(v.endToEnd)) {
        out.push(`| ${armLabel[arm] ?? arm} | ${x.decisions} | ${fmtPct(x.agreement)} | ${x.falseEligible} (${fmtPct(x.falseEligibleRate, 2)}) | ${x.falseDenial} (${fmtPct(x.falseDenialRate, 2)}) | ${x.overCautious} (${fmtPct(x.overCautiousRate)}) | ${fmtPct(x.positiveRecall)} (of ${x.goldPositive}) |`);
      }
      out.push('');
    }
    for (const [arm, x] of Object.entries<Any>(all.endToEnd)) {
      if (x.falseEligibleExamples.length) out.push(`- ${arm} false "eligible": ${x.falseEligibleExamples.map((e: Any) => `\`${e.caseId}\`→${e.programme}`).join(', ')}`);
    }
    out.push('', `LLM civic frame: ${fmtPct(s.llmStrictSchemaFailureRate)} of frames would be rejected outright by the production (strict) parser. The L arms parse each fact individually, so they measure the model rather than the parser.`);
    if (s.jevErrors.length) out.push(`Jev call errors: ${s.jevErrors.length}.`);
    if (s.typedErrors.length) out.push(`Typed-LLM call errors: ${s.typedErrors.length} (${s.typedErrors.slice(0, 2).map((e: Any) => String(e.error).slice(0, 120)).join('; ')}).`);
    if (s.llmErrors.length) out.push(`LLM call errors: ${s.llmErrors.length} (${s.llmErrors.slice(0, 2).map((e: Any) => String(e.error).slice(0, 120)).join('; ')}).`);
    for (const [engine, dis] of Object.entries<Any[]>(s.disagreements)) {
      out.push('', `### Every ${engineLabel[engine] ?? engine} result that was not a correct accepted fact (${dis.length})`, '', '| Case | Lang | Field | Gold | Predicted | p | Status | Kind |', '|---|---|---|---|---|---:|---|---|');
      for (const d of dis) out.push(`| ${d.caseId} | ${d.lang} | ${d.field} | ${d.gold ?? '—'} | ${d.predicted ?? '—'} | ${d.probability === null ? '—' : d.probability.toFixed(2)} | ${d.status ?? '—'} | ${d.kind} |`);
    }
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
    out.push('', '| Kind | n | Should reject | Caught | Wrongly rejected |', '|---|---:|---:|---:|---:|');
    for (const [kind, x] of Object.entries<Any>(vf.byKind ?? {})) out.push(`| ${kind} | ${x.n} | ${x.positives} | ${fmtPct(x.tpr)} | ${fmtPct(x.fpr)} |`);
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
  if (r.cost.llm.typedTokens) out.push(`Typed-LLM fallback: mean ${Math.round(r.cost.llm.typedTokens.meanInput)} input / ${Math.round(r.cost.llm.typedTokens.meanOutput)} output tokens per turn (only spent when Jev fails).`);
  if (r.cost.llm.tokens) out.push(`LLM civic frame: mean ${Math.round(r.cost.llm.tokens.meanInput)} input / ${Math.round(r.cost.llm.tokens.meanOutput)} output tokens per turn; ${r.cost.llm.note}`);
  out.push('', 'Latencies of cached answers are the latencies measured when they were first fetched.', '');
  return out.join('\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

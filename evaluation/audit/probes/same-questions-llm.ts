/* Audit experiment: is the gain Jev, or the question design? DeepSeek answers the SAME typed questions. */
import '../../../scripts/load-env';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { env } from '@/lib/config/env';
import { getProvider } from '@/modules/ai/providers';
import { JevDecisionModel } from '@/modules/ai/decision/jev';
import { validateResponse } from '@/modules/ai/decision/validate';
import type { Answer, DecisionModel, DecisionRequest, DecisionResult } from '@/modules/ai/decision/types';
import { CachedDecisionModel, JsonCache, latencySummary } from '../../jev/infra';
import { runSemanticArms, scoreArms, endToEndReport, calibrationReport } from '../../jev/semantic';
import { SEMANTIC_CASES } from '../../jev/cases';

const SCRATCH = __dirname;
const cacheFile = `${SCRATCH}/llm-typed-cache.json`; // cache from the audit run
const cache: Record<string, { text: string; ms: number }> = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const latencies: number[] = [];
let parseFailures = 0;

const SYSTEM = `You answer typed questions about a JSON "state". You never write prose.
For every question id, return exactly one entry:
- type "choice": {"type":"choice","choice":<one option key>,"probabilities":{<every option key>: probability}} — probabilities over ALL options, summing to 1.
- type "noul": {"type":"noul","noul":<probability the answer is yes, 0 to 1>}.
Read each question's instructions and criteria literally. Backticked names refer to fields of the state or of the question's instructions object.
Return ONLY a JSON object: {"answers": {<question id>: <answer>, ...}}.`;

class LlmTypedModel implements DecisionModel {
  readonly engine = 'jev' as const; // reuses the Jev arm slot in the harness
  readonly model = `${getProvider().model} (typed-questions prompt)`;
  async decide(req: DecisionRequest): Promise<DecisionResult> {
    const user = JSON.stringify({ state: req.state, questions: req.questions });
    const key = createHash('sha256').update(user).digest('hex');
    let entry = cache[key];
    if (!entry) {
      const started = Date.now();
      const r = await getProvider().generate({ system: SYSTEM, user, maxTokens: 3000, temperature: 0 });
      entry = { text: r.text, ms: Date.now() - started };
      cache[key] = entry;
    }
    latencies.push(entry.ms);
    const start = entry.text.indexOf('{'), end = entry.text.lastIndexOf('}');
    let raw: { answers?: Record<string, any> } = {};
    try { raw = JSON.parse(entry.text.slice(start, end + 1)); } catch { parseFailures += 1; throw new Error('LLM returned non-JSON'); }
    // Repair to the typed contract: every option present, normalised, choice = argmax.
    const answers: Record<string, Answer> = {};
    for (const [id, q] of Object.entries(req.questions)) {
      const a = raw.answers?.[id] ?? {};
      if (q.type === 'noul') {
        const p = Number(a.noul);
        answers[id] = { type: 'noul', noul: Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0.5 };
      } else if (q.type === 'choice') {
        const options = Object.keys(q.criteria);
        const probs = Object.fromEntries(options.map((o) => [o, Math.max(0, Number(a.probabilities?.[o]) || 0)]));
        let total = Object.values(probs).reduce((s, x) => s + x, 0);
        if (total === 0 && options.includes(a.choice)) { probs[a.choice] = 1; total = 1; }
        if (total === 0) { for (const o of options) probs[o] = 1 / options.length; total = 1; }
        for (const o of options) probs[o] = probs[o]! / total;
        const choice = options.reduce((best, o) => (probs[o]! > probs[best]! ? o : best), options[0]!);
        const n = options.length, peak = probs[choice]!;
        answers[id] = { type: 'choice', choice, probabilities: probs, confidence: Math.max(0, (n * peak - 1) / (n - 1)) };
      }
    }
    const v = validateResponse({ model: this.model, answers, usage: { input_tokens: 0, output_tokens: 0 } }, req.questions);
    return { answers: v.answers, engine: 'jev', model: this.model, latencyMs: entry.ms, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

// contamination: bigram Jaccard ≥ 0.30 with any design probe
const probeSrc = fs.readFileSync(`${SCRATCH}/design-probes.ts`, 'utf8');
const probes = [...probeSrc.matchAll(/^\s+['"](.+?)['"],\s*$/gm)].map((m) => m[1]!).filter((t) => t.length > 8 && !t.includes('`'));
const grams = (t: string) => { const w = t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean); const g = new Set<string>(); for (let i = 0; i + 1 < w.length; i++) g.add(w[i] + ' ' + w[i + 1]); return g; };
const jac = (a: Set<string>, b: Set<string>) => { const i = [...a].filter((x) => b.has(x)).length; return i / Math.max(1, a.size + b.size - i); };
const contaminated = new Set(SEMANTIC_CASES.filter((c) => probes.some((p) => jac(grams(c.text), grams(p)) >= 0.3)).map((c) => c.id));

function summary(label: string, runs: Awaited<ReturnType<typeof runSemanticArms>>) {
  const arms = scoreArms(runs) as any;
  const s: any = arms.jev?.overall;
  const e: any = endToEndReport(runs).jev;
  const cal: any = calibrationReport(runs).assertions;
  const lang: any = arms.jev?.byLanguage;
  const cat: any = arms.jev?.byCategory;
  console.log(`${label.padEnd(44)} P=${(s.precision * 100).toFixed(1)}% R=${(s.recall * 100).toFixed(1)}% FA=${s.falseAssertion} WV=${s.wrongValue} held=${s.heldCorrect + s.heldWrong} | e2e FE=${e.falseEligible} FD=${e.falseDenial} recall+=${(e.positiveRecall * 100).toFixed(1)}% | ECE=${cal.ece.toFixed(3)} n=${cal.n}`);
  console.log(`${''.padEnd(44)} banglish R=${(lang.banglish.recall * 100).toFixed(0)}% FA=${lang.banglish.falseAssertion} · bn R=${(lang.bn.recall * 100).toFixed(0)}% · third_party FA=${cat.third_party.falseAssertion} · negation P/R=${cat.negation.precision === null ? '—' : (cat.negation.precision * 100).toFixed(0)}/${(cat.negation.recall * 100).toFixed(0)}`);
}

(async () => {
  const jev = new CachedDecisionModel(new JevDecisionModel(), env.JEV_MODEL, new JsonCache('jev'), false);
  const jevRuns = await runSemanticArms({ jev, llm: null, concurrency: 6 });
  const llmRuns = await runSemanticArms({ jev: new LlmTypedModel(), llm: null, concurrency: 6 });
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  const clean = (runs: typeof jevRuns) => runs.filter((r) => !contaminated.has(r.caseId));
  console.log(`contaminated cases excluded in "clean": ${contaminated.size}; LLM parse failures: ${parseFailures}; LLM call errors: ${llmRuns.filter((r) => r.jevError).length}\n`);
  summary('Jev, typed questions — all 109', jevRuns);
  summary('DeepSeek, SAME typed questions — all 109', llmRuns);
  summary('Jev — 92 uncontaminated', clean(jevRuns));
  summary('DeepSeek, same questions — 92 uncontaminated', clean(llmRuns));
  console.log('\nDeepSeek typed-question latency ms:', JSON.stringify(latencySummary(latencies)));
  const llmErr = llmRuns.filter((r) => r.jevError).slice(0, 3).map((r) => r.jevError);
  if (llmErr.length) console.log('errors:', llmErr);
})();

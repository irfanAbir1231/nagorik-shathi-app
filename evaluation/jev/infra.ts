/* eslint-disable no-console */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DecisionModelError, type DecisionModel, type DecisionRequest, type DecisionResult } from '@/modules/ai/decision/types';
import type { GenerateInput, GenerateResult, LlmProvider } from '@/modules/ai/providers/types';

/**
 * Evaluation infrastructure: a response cache that makes every run
 * reproducible without credentials, and the metrics used in the report.
 *
 * CACHE CONTRACT. Each live response is stored under sha256(model + request),
 * together with the latency measured at the time and the date. A cached re-run
 * therefore reproduces both the answers AND the originally measured latency;
 * the report states how many answers were cached vs. fetched. Nothing is ever
 * synthesised on a cache miss: offline, a miss is an error for that item.
 */

export const CACHE_DIR = path.resolve('evaluation/jev/cache');

interface CacheEntry<T> {
  readonly value: T;
  readonly latencyMs: number;
  readonly measuredAt: string;
}

export class JsonCache<T> {
  private readonly file: string;
  private data: Record<string, CacheEntry<T>>;
  private dirty = false;
  hits = 0;
  misses = 0;

  constructor(name: string) {
    this.file = path.join(CACHE_DIR, `${name}.json`);
    this.data = fs.existsSync(this.file) ? (JSON.parse(fs.readFileSync(this.file, 'utf8')) as Record<string, CacheEntry<T>>) : {};
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.data[key];
    if (entry) this.hits += 1;
    else this.misses += 1;
    return entry;
  }

  set(key: string, value: T, latencyMs: number): void {
    this.data[key] = { value, latencyMs, measuredAt: new Date().toISOString() };
    this.dirty = true;
  }

  save(): void {
    if (!this.dirty) return;
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    // Sorted keys keep the committed cache diff-stable.
    const sorted = Object.fromEntries(Object.entries(this.data).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(this.file, `${JSON.stringify(sorted, null, 1)}\n`, 'utf8');
    this.dirty = false;
  }
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

/** Wraps a decision model with the cache. `inner` may be null for offline runs. */
export class CachedDecisionModel implements DecisionModel {
  readonly engine = 'jev' as const;
  readonly latencies: number[] = [];
  readonly inputTokens: number[] = [];

  constructor(
    private readonly inner: DecisionModel | null,
    readonly model: string,
    private readonly cache: JsonCache<Omit<DecisionResult, 'latencyMs'>>,
    private readonly live: boolean,
  ) {}

  async decide(request: DecisionRequest): Promise<DecisionResult> {
    const key = sha256({ model: this.model, state: request.state, questions: request.questions });
    const cached = this.cache.get(key);
    if (cached) {
      this.latencies.push(cached.latencyMs);
      this.inputTokens.push(cached.value.usage.inputTokens);
      return { ...cached.value, latencyMs: cached.latencyMs };
    }
    if (!this.live || !this.inner) {
      throw new DecisionModelError('unconfigured', 'Cache miss in offline mode (run with --live to fetch).');
    }
    const result = await this.inner.decide(request);
    this.cache.set(key, { answers: result.answers, engine: result.engine, model: result.model, usage: result.usage }, result.latencyMs);
    this.latencies.push(result.latencyMs);
    this.inputTokens.push(result.usage.inputTokens);
    return result;
  }
}

/** Wraps a generative provider with the same cache contract. */
export class CachedLlmProvider implements LlmProvider {
  readonly latencies: number[] = [];
  readonly tokensIn: number[] = [];
  readonly tokensOut: number[] = [];

  constructor(
    private readonly inner: LlmProvider,
    private readonly cache: JsonCache<Omit<GenerateResult, 'latencyMs'>>,
    private readonly live: boolean,
  ) {}

  get engine() { return this.inner.engine; }
  get model() { return this.inner.model; }
  get isLive() { return true; }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const key = sha256({ model: this.inner.model, system: input.system, user: input.user, maxTokens: input.maxTokens, temperature: input.temperature });
    const cached = this.cache.get(key);
    if (cached) {
      this.latencies.push(cached.latencyMs);
      this.tokensIn.push(cached.value.tokensIn);
      this.tokensOut.push(cached.value.tokensOut);
      return { ...cached.value, latencyMs: cached.latencyMs };
    }
    if (!this.live || !this.inner.isLive) throw new Error('LLM cache miss in offline mode (run with --live to fetch).');
    const result = await this.inner.generate(input);
    const { latencyMs, ...value } = result;
    this.cache.set(key, value, latencyMs);
    this.latencies.push(latencyMs);
    this.tokensIn.push(result.tokensIn);
    this.tokensOut.push(result.tokensOut);
    return result;
  }
}

/** Runs `fn` over items with bounded concurrency, preserving order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return out;
}

/* ------------------------------------------------------------- metrics */

export interface CalibrationPoint {
  readonly p: number;
  readonly y: boolean;
}

export interface Calibration {
  readonly n: number;
  readonly brier: number;
  /** Expected calibration error, 10 equal-width bins. */
  readonly ece: number;
  readonly accuracy: number;
  readonly meanConfidence: number;
  readonly bins: readonly { lo: number; hi: number; n: number; meanP: number; accuracy: number }[];
}

export function calibration(points: readonly CalibrationPoint[], binCount = 10): Calibration {
  const n = points.length;
  if (n === 0) return { n: 0, brier: NaN, ece: NaN, accuracy: NaN, meanConfidence: NaN, bins: [] };
  const brier = points.reduce((s, { p, y }) => s + (p - (y ? 1 : 0)) ** 2, 0) / n;
  const bins = Array.from({ length: binCount }, (_, i) => ({ lo: i / binCount, hi: (i + 1) / binCount, items: [] as CalibrationPoint[] }));
  for (const point of points) bins[Math.min(binCount - 1, Math.floor(point.p * binCount))]!.items.push(point);
  let ece = 0;
  const summary = bins.map((b) => {
    const count = b.items.length;
    const meanP = count ? b.items.reduce((s, x) => s + x.p, 0) / count : 0;
    const acc = count ? b.items.filter((x) => x.y).length / count : 0;
    ece += (count / n) * Math.abs(meanP - acc);
    return { lo: b.lo, hi: b.hi, n: count, meanP, accuracy: acc };
  });
  return {
    n,
    brier,
    ece,
    accuracy: points.filter((x) => x.y).length / n,
    meanConfidence: points.reduce((s, x) => s + x.p, 0) / n,
    bins: summary.filter((b) => b.n > 0),
  };
}

export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))]!;
}

export function latencySummary(values: readonly number[]) {
  return {
    n: values.length,
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    // p99 is only meaningful with enough samples; below 100 it is the max.
    p99: values.length >= 100 ? percentile(values, 0.99) : null,
    max: values.length ? Math.max(...values) : null,
  };
}

export function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

/* ---------------------------------------------------------------- meta */

export function runMetadata() {
  const git = (cmd: string) => {
    try {
      return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      return null;
    }
  };
  return {
    gitCommit: git('git rev-parse HEAD'),
    gitBranch: git('git rev-parse --abbrev-ref HEAD'),
    gitDirty: (git('git status --porcelain -- src evaluation') ?? '').length > 0,
    node: process.version,
    generatedAt: new Date().toISOString(),
  };
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || Number.isNaN(value) ? '—' : `${(value * 100).toFixed(digits)}%`;
}

export function fmtNum(value: number | null | undefined, digits = 3): string {
  return value === null || value === undefined || Number.isNaN(value) ? '—' : value.toFixed(digits);
}

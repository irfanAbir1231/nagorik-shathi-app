/**
 * Latency budget for one chat turn.
 *
 * Every model call in a turn gets a deadline derived from ONE turn deadline,
 * so the worst case is bounded by construction rather than by the sum of each
 * client's retry policy. Before this, a Jev call could take ~25 s (8 s × 3
 * attempts) and a turn could exceed the route's 45 s limit, against a measured
 * Jev p95 of 489 ms (audit 2026-09-30, defect 7).
 *
 * Worst case with these values: understanding 3 s (+ 9 s if the typed-LLM
 * fallback runs) + render 15 s + verification 4 s ≈ 31 s, inside the route's
 * 45 s abort. Each stage's failure has its own policy (see ARCHITECTURE.md),
 * so hitting a deadline degrades that stage; it never fails the turn.
 */

export const TURN_BUDGET_MS = 32_000;

export const STAGE_BUDGET_MS = {
  /** Jev p95 587 ms, max 918 ms on question set 2.0.0 (489 ms on 1.0.0); 3 s allows one retry. */
  understandingJev: 3_000,
  /** Typed-LLM fallback p95 4.2 s, max 4.5 s (evaluation run 2026-09-30). */
  understandingLlm: 9_000,
  relevance: 2_500,
  render: 15_000,
  verify: 4_000,
} as const;

/**
 * A signal that aborts when `parent` aborts or `ms` elapses, whichever is
 * first. Uses AbortSignal.any where available (Node ≥ 20.3, Workers) and a
 * manual combination otherwise.
 */
export function withDeadline(parent: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(Math.max(1, ms));
  if (!parent) return timeout;
  const any = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  if (any) return any([parent, timeout]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent.aborted || timeout.aborted) controller.abort();
  parent.addEventListener('abort', abort, { once: true });
  timeout.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

/** Tracks the remaining turn budget and hands out stage deadlines. */
export class TurnBudget {
  private readonly deadline: number;

  constructor(private readonly parent?: AbortSignal, totalMs = TURN_BUDGET_MS) {
    this.deadline = Date.now() + totalMs;
  }

  remaining(): number {
    return Math.max(0, this.deadline - Date.now());
  }

  /** A signal for one stage: the stage budget, capped by what the turn has left. */
  stage(ms: number): AbortSignal {
    return withDeadline(this.parent, Math.min(ms, this.remaining()));
  }
}

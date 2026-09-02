/**
 * SJ-28/SJ-19 — deterministic fund and behavioural anomaly detection.
 *
 * Every check here is a fixed, explainable rule over real rows already in the
 * database — never a model, never a score nobody can audit. That is the same
 * line the eligibility engine and the moderation keyword filter already draw
 * (docs/DEVIATIONS.md): a citizen or an auditor can be told exactly WHY a row
 * was flagged, in one sentence, and can check it by hand. What "fraud
 * detection needing real disbursement volume" (SJ-19) buys over SJ-28's
 * simpler checks is the two statistical ones below, which only produce
 * meaningful signal once there are enough rows to compare against — with a
 * handful of seed rows they will mostly find nothing, correctly, rather than
 * inventing a pattern out of three data points.
 *
 * Pure functions, deliberately: every DB read happens in oversight.service.ts,
 * which calls these with plain arrays. That is what makes "flags an amount
 * 5x its union's median" a one-line, no-database unit test instead of a
 * fixture-heavy integration test.
 */

export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface Anomaly {
  readonly kind: string;
  readonly severity: AnomalySeverity;
  /** [en, bn] — matches the order used by modules/citizen/citizen.service.ts's createNotification. */
  readonly message: readonly [string, string];
  readonly refIds: readonly string[];
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}

/**
 * Flags an allocation whose amount is far above the median of every OTHER
 * allocation in the same union. Needs at least `minComparisons` other rows
 * in the union to say anything — with 0 or 1 prior allocations there is
 * nothing honest to compare against, so the function stays silent rather
 * than manufacturing a signal from a single data point.
 */
export function detectAllocationOutliers(
  allocations: readonly { readonly id: string; readonly unionId: string; readonly amount: number; readonly projectName: string }[],
  options: { readonly multiplier?: number; readonly minComparisons?: number } = {},
): Anomaly[] {
  const multiplier = options.multiplier ?? 3;
  const minComparisons = options.minComparisons ?? 2;
  const byUnion = new Map<string, typeof allocations[number][]>();
  for (const a of allocations) {
    const list = byUnion.get(a.unionId) ?? [];
    list.push(a);
    byUnion.set(a.unionId, list);
  }

  const anomalies: Anomaly[] = [];
  for (const list of byUnion.values()) {
    for (const target of list) {
      const others = list.filter((a) => a.id !== target.id);
      if (others.length < minComparisons) continue;
      const baseline = median(others.map((a) => a.amount));
      if (baseline > 0 && target.amount > baseline * multiplier) {
        anomalies.push({
          kind: 'allocation_outlier',
          severity: 'medium',
          message: [
            `"${target.projectName}" (৳${target.amount.toLocaleString('en-US')}) is over ${multiplier}x this union's typical allocation (৳${Math.round(baseline).toLocaleString('en-US')}).`,
            `"${target.projectName}" (৳${target.amount.toLocaleString('en-US')}) এই ইউনিয়নের সাধারণ বরাদ্দের (৳${Math.round(baseline).toLocaleString('en-US')}) চেয়ে ${multiplier} গুণেরও বেশি।`,
          ],
          refIds: [target.id],
        });
      }
    }
  }
  return anomalies;
}

/**
 * The same NID hash enrolled as an active beneficiary of the same program in
 * more than one union — one person cannot legitimately draw the same welfare
 * program from two Union Parishads at once.
 */
export function detectDuplicateBeneficiaryEnrolment(
  beneficiaries: readonly { readonly id: string; readonly nidHash: string; readonly unionId: string; readonly programCode: string; readonly status: string }[],
): Anomaly[] {
  const byKey = new Map<string, typeof beneficiaries[number][]>();
  for (const b of beneficiaries) {
    if (b.status !== 'active') continue;
    const key = `${b.nidHash}:${b.programCode}`;
    const list = byKey.get(key) ?? [];
    list.push(b);
    byKey.set(key, list);
  }

  const anomalies: Anomaly[] = [];
  for (const list of byKey.values()) {
    const distinctUnions = new Set(list.map((b) => b.unionId));
    if (distinctUnions.size > 1) {
      anomalies.push({
        kind: 'duplicate_enrolment',
        severity: 'high',
        message: [
          `The same national ID is enrolled in "${list[0]!.programCode}" across ${distinctUnions.size} different unions.`,
          `একই জাতীয় পরিচয়পত্র "${list[0]!.programCode}"-এ ${distinctUnions.size}টি ভিন্ন ইউনিয়নে নিবন্ধিত।`,
        ],
        refIds: list.map((b) => b.id),
      });
    }
  }
  return anomalies;
}

/**
 * SJ-19's "ghost beneficiary" check: enrolled, but the NID hash behind the
 * enrolment has never been confirmed by anyone going through real NID
 * verification (modules/identity/nid.service.ts). This does not prove fraud
 * — a genuine beneficiary may simply not have a Shebar Janala account yet — but
 * it is the one honest, checkable signal available: "nobody has ever proven
 * this identity exists," surfaced for a human to follow up on, not acted on
 * automatically.
 */
export function detectUnverifiedBeneficiaryIdentity(
  beneficiaries: readonly { readonly id: string; readonly nidHash: string; readonly programName: string; readonly status: string }[],
  verifiedNidHashes: ReadonlySet<string>,
): Anomaly[] {
  return beneficiaries
    .filter((b) => b.status === 'active' && !verifiedNidHashes.has(b.nidHash))
    .map((b) => ({
      kind: 'unverified_beneficiary_identity',
      severity: 'medium' as const,
      message: [
        `A "${b.programName}" beneficiary's national ID has never been confirmed by anyone in the system.`,
        `"${b.programName}"-এর একজন সুবিধাভোগীর জাতীয় পরিচয়পত্র কখনো যাচাই করা হয়নি।`,
      ] as const,
      refIds: [b.id],
    }));
}

/** Exact, not statistical: a disbursement paid out above what the entitlement actually specifies. */
export function detectOverpaidDisbursements(
  rows: readonly { readonly id: string; readonly amount: number; readonly entitlementAmount: number; readonly programName: string }[],
): Anomaly[] {
  return rows
    .filter((r) => r.amount > r.entitlementAmount)
    .map((r) => ({
      kind: 'overpaid_disbursement',
      severity: 'high' as const,
      message: [
        `A "${r.programName}" disbursement of ৳${r.amount.toLocaleString('en-US')} exceeds its entitlement of ৳${r.entitlementAmount.toLocaleString('en-US')}.`,
        `"${r.programName}"-এর ৳${r.amount.toLocaleString('en-US')} বিতরণ তার নির্ধারিত ৳${r.entitlementAmount.toLocaleString('en-US')}-এর চেয়ে বেশি।`,
      ] as const,
      refIds: [r.id],
    }));
}

/** Behavioural, not financial: a threshold-crossing escalation nobody has touched in a long time. */
export function detectStaleEscalations(
  escalations: readonly { readonly id: string; readonly status: string; readonly createdAt: Date; readonly unionName: string }[],
  now: Date,
  staleAfterDays = 14,
): Anomaly[] {
  const cutoff = now.getTime() - staleAfterDays * 86_400_000;
  return escalations
    .filter((e) => e.status === 'pending' && e.createdAt.getTime() < cutoff)
    .map((e) => ({
      kind: 'stale_escalation',
      severity: 'medium' as const,
      message: [
        `An escalation in ${e.unionName} has been pending for over ${staleAfterDays} days with no response.`,
        `${e.unionName}-এ একটি এস্কেলেশন ${staleAfterDays} দিনেরও বেশি সময় ধরে অনুত্তরিত রয়েছে।`,
      ] as const,
      refIds: [e.id],
    }));
}

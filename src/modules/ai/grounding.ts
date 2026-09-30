import type { ResponsePlan } from './response-plan';
import { pickLocalised } from './response-plan';

const BANGLA_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

function latinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => BANGLA_DIGITS[digit] ?? digit);
}

/**
 * Canonical form of a numeric claim: digits only, grouping removed, a zero
 * fraction dropped. The system prompt REQUIRES amounts as "৳5,000.00", so
 * "5000.00" and "5000" must be the same claim — the previous version rejected
 * every amount written the way the prompt demands.
 */
function canonical(claim: string): string {
  const trimmed = claim.replace(/,/g, '').replace(/%$/, '').replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\.0+$/, '');
}

function numericClaims(value: string): Set<string> {
  const normalized = latinDigits(value);
  return new Set((normalized.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? []).map(canonical));
}

/**
 * The numbers a rendering may state: those in the plan's CITIZEN-FACING
 * content only. Record ids, chunk ids, and scores are excluded; serialising the
 * whole plan (the previous approach) let any digit run inside a UUID through.
 */
function allowedNumbers(plan: ResponsePlan, extra: readonly string[] = []): Set<string> {
  const texts: string[] = [...extra];
  const both = (t: { en: string; bn: string } | null | undefined) => {
    if (t) texts.push(t.en, t.bn);
  };
  for (const o of plan.opportunities) {
    both(o.title); both(o.summary); both(o.organisation); both(o.nextStep);
    for (const r of [...o.metReasons, ...o.failedReasons, ...o.unknownReasons, ...o.softFailedReasons]) both(r);
    if (o.benefitAmount !== null) texts.push(String(o.benefitAmount), o.benefitAmount.toFixed(2));
    if (o.deadline) {
      const d = new Date(o.deadline);
      texts.push(String(d.getUTCFullYear()), String(d.getUTCMonth() + 1), String(d.getUTCDate()));
      const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
      if (days >= 0) texts.push(String(days), String(days - 1), String(days + 1));
    }
  }
  both(plan.missingFieldLabel); both(plan.missingFieldReason);
  both(plan.clarificationValues?.stated); both(plan.clarificationValues?.profile);
  for (const c of plan.citations) texts.push(c.title, c.excerpt);
  for (const f of plan.evidence?.facts ?? []) {
    texts.push(String(f.value));
    both(f.label);
  }
  const allowed = numericClaims(texts.join('\n'));
  // List numbering and an accurate result count are presentation, not claims.
  for (let index = 1; index <= Math.max(plan.opportunities.length, 1); index += 1) allowed.add(String(index));
  allowed.add(String(plan.opportunities.length));
  return allowed;
}

/**
 * Detect high-risk numeric claims that were absent from the deterministic plan.
 * This is deliberately narrow and auditable: it catches invented amounts,
 * thresholds, ages, dates, phone numbers, and percentages. Semantic claims
 * ("you qualify") are checked separately by the explanation verifier.
 */
export function unsupportedNumericClaims(text: string, plan: ResponsePlan, extra: readonly string[] = []): string[] {
  const allowed = allowedNumbers(plan, extra);
  return [...numericClaims(text)].filter((claim) => !allowed.has(claim));
}

export function assertNumericGrounding(text: string, plan: ResponsePlan, extra: readonly string[] = []): void {
  const unsupported = unsupportedNumericClaims(text, plan, extra);
  if (unsupported.length > 0) {
    throw new Error(`Renderer introduced unsupported numeric claims: ${unsupported.join(', ')}`);
  }
}

/** Plain-language outcome of each programme, as the verifier compares against it. */
export function planOutcomeSummary(plan: ResponsePlan): { title: string; decision: string }[] {
  return plan.opportunities.map((o) => ({
    title: `${pickLocalised(o.title, 'en')} / ${pickLocalised(o.title, 'bn')}`,
    decision: o.outcome,
  }));
}

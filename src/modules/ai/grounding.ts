import type { ResponsePlan } from './response-plan';

const BANGLA_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

function latinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => BANGLA_DIGITS[digit] ?? digit);
}

function numericClaims(value: string): Set<string> {
  const normalized = latinDigits(value);
  return new Set(
    (normalized.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? [])
      .map((claim) => claim.replace(/,/g, '').replace(/%$/, '').replace(/^0+(?=\d)/, '')),
  );
}

/**
 * Detect high-risk numeric claims that were absent from the deterministic plan.
 * This is deliberately narrow and auditable: it catches invented amounts,
 * thresholds, ages, dates, phone numbers, and percentages. Broader semantic
 * grounding still requires a human-labelled live-model evaluation.
 */
export function unsupportedNumericClaims(text: string, plan: ResponsePlan): string[] {
  const allowed = numericClaims(JSON.stringify(plan));
  // List numbering and an accurate result count are presentation, not claims.
  for (let index = 1; index <= plan.opportunities.length; index += 1) allowed.add(String(index));
  allowed.add(String(plan.opportunities.length));
  return [...numericClaims(text)].filter((claim) => !allowed.has(claim));
}

export function assertNumericGrounding(text: string, plan: ResponsePlan): void {
  const unsupported = unsupportedNumericClaims(text, plan);
  if (unsupported.length > 0) {
    throw new Error(`Renderer introduced unsupported numeric claims: ${unsupported.join(', ')}`);
  }
}

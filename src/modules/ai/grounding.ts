import type { ResponsePlan } from './response-plan';

const BANGLA_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export function latinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => BANGLA_DIGITS[digit] ?? digit);
}

/**
 * Canonical form of a numeric claim: digits only, grouping removed, a zero
 * fraction dropped. The system prompt REQUIRES amounts as "৳5,000.00", so
 * "5000.00" and "5000" must be the same claim.
 */
function canonical(claim: string): string {
  const trimmed = claim.replace(/,/g, '').replace(/%$/, '').replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\.0+$/, '');
}

function numericClaims(value: string): Set<string> {
  const normalized = latinDigits(value);
  return new Set((normalized.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? []).map(canonical));
}

/* ------------------------------------------------------------ money */

export interface AmountClaim {
  /** As written, e.g. "৳5,000.00". */
  readonly surface: string;
  /** Canonical digits, e.g. "5000". */
  readonly value: string;
}

/**
 * Money amounts in a text: a number next to ৳ / BDT / Tk / taka / টাকা, on
 * either side. Only these are treated as money claims; other numbers (ages,
 * durations, kilograms) are ordinary numeric claims.
 */
const MONEY = /(?:৳|bdt|tk\.?)\s*(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:taka|টাকা|tk\b|bdt)/gi;

export function amountClaims(text: string): AmountClaim[] {
  const normalized = latinDigits(text);
  const out = new Map<string, AmountClaim>();
  for (const match of normalized.matchAll(MONEY)) {
    const digits = match[1] ?? match[2];
    if (!digits) continue;
    const value = canonical(digits);
    if (!out.has(value)) out.set(value, { surface: match[0].trim(), value });
  }
  return [...out.values()].slice(0, 8);
}

/** Canonical numbers in a set of texts. */
export function numbersIn(texts: readonly (string | null | undefined)[]): Set<string> {
  return numericClaims(texts.filter(Boolean).join('\n'));
}

/**
 * The numbers the plan itself states (citizen-facing content only). Record
 * ids, chunk ids, and scores are excluded; serialising the whole plan let any
 * digit run inside a UUID through.
 */
function planNumbers(plan: ResponsePlan): Set<string> {
  const texts: string[] = [];
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
  // Only ACCEPTED facts: a value held for confirmation, or in conflict, is not
  // something the system knows and must not be repeated back as if it were.
  for (const f of plan.evidence?.facts ?? []) {
    if (f.status !== 'accepted') continue;
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
 * Detect numeric claims absent from the deterministic plan.
 *
 * Two classes, with different allowances:
 *   MONEY  must come from the plan (programme records, rule reasons, accepted
 *          facts). The citizen's own message is NOT a source: allowing it let
 *          "I heard it's 5000 taka" turn into prose stating a ৳5,000 benefit
 *          (audit 2026-09-30, defect 1).
 *   OTHER  numbers (an age, "5 months pregnant", a count) may also be numbers
 *          the citizen said — repeating them back is not an invention.
 * Which programme an amount is attributed to is checked by the verifier.
 */
export function unsupportedNumericClaims(text: string, plan: ResponsePlan, citizenTexts: readonly string[] = []): string[] {
  const fromPlan = planNumbers(plan);
  const fromCitizen = numbersIn(citizenTexts);
  const money = new Set(amountClaims(text).map((a) => a.value));
  return [...numericClaims(text)].filter((claim) => {
    if (fromPlan.has(claim)) return false;
    if (!money.has(claim) && fromCitizen.has(claim)) return false;
    return true;
  });
}

export function assertNumericGrounding(text: string, plan: ResponsePlan, citizenTexts: readonly string[] = []): void {
  const unsupported = unsupportedNumericClaims(text, plan, citizenTexts);
  if (unsupported.length > 0) {
    throw new Error(`Renderer introduced unsupported numeric claims: ${unsupported.join(', ')}`);
  }
}

/**
 * Redaction of direct identifiers before citizen text leaves the server.
 *
 * Every turn sends the citizen's words to one or two external model vendors
 * (TypeSafe for interpretation and verification, the LLM provider for prose
 * and the typed fallback). None of them needs to know WHO the citizen is — only
 * WHAT they said about their situation. This removes the identifiers that are
 * findable by form rather than meaning:
 *
 *   • phone numbers (Bangladeshi mobile formats, with or without +88)
 *   • long digit runs ≥ 9 digits (NID is 10/13/17 digits; birth-registration,
 *     bank and bKash account numbers are long too)
 *   • e-mail addresses
 *   • a name introduced by "my name is / আমার নাম / amar nam …"
 *
 * It deliberately does NOT touch short numbers (ages, incomes, household
 * sizes — the interpreter needs them; no income limit reaches 9 digits), place
 * names (district is an eligibility fact), or names in free positions (not
 * reliably detectable without a model, and a model would itself be a vendor
 * call). That residual risk is stated in ARCHITECTURE.md.
 *
 * The citizen's own conversation record keeps the original text; only what is
 * SENT to vendors and what is written to ai_logs is redacted.
 */

export const REDACTION_VERSION = 'redact@1.0.0';

export interface Redaction {
  readonly text: string;
  readonly counts: Readonly<Record<'phone' | 'id_number' | 'email' | 'name', number>>;
}

const DIGIT = '[0-9০-৯]';

const PATTERNS: readonly { kind: keyof Redaction['counts']; regex: RegExp; token: string }[] = [
  { kind: 'email', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, token: '[EMAIL]' },
  // +88 01XXXXXXXXX, 01XXX-XXXXXX, 01XXX XXXXXX — in Latin or Bangla digits.
  { kind: 'phone', regex: new RegExp(`(?:\\+?(?:88|৮৮)[\\s-]?)?(?:0|০)(?:1|১)${DIGIT}{3}[\\s-]?${DIGIT}{6}`, 'g'), token: '[PHONE]' },
  { kind: 'id_number', regex: new RegExp(`${DIGIT}(?:[\\s-]?${DIGIT}){8,}`, 'g'), token: '[ID-NUMBER]' },
];

/** "my name is Rahima Begum" / "আমার নাম রহিমা বেগম" / "amar nam Rahima". Keeps the phrase, drops the name. */
const NAME_INTRO = /(my name is|i am called|name\s*:|আমার নাম|amar nam|amar naam)\s+([^\s,।.!?]+(?:\s+[^\s,।.!?]+)?)/giu;

export function redactPii(input: string): Redaction {
  const counts = { phone: 0, id_number: 0, email: 0, name: 0 };
  let text = input;
  for (const { kind, regex, token } of PATTERNS) {
    text = text.replace(regex, () => {
      counts[kind] += 1;
      return token;
    });
  }
  text = text.replace(NAME_INTRO, (_m, intro: string) => {
    counts.name += 1;
    return `${intro} [NAME]`;
  });
  return { text, counts };
}

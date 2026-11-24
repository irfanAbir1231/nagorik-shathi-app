/**
 * Text helpers for reading government web pages. Pure functions, no I/O, so
 * every rule here is unit-tested against saved page fragments.
 *
 * Government pages are read as text, never rendered: scripts, styles and
 * forms are dropped before anything else happens, so nothing a page contains
 * can execute or reach a citizen unreviewed.
 */

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * One Unicode form for Bangla text. The same word can be stored two ways —
 * "য়" as one code point (U+09DF) or as য + nukta (U+09AF U+09BC) — which look
 * identical but never compare equal. Government pages use the first, our
 * seed data the second. Everything read from a page goes through this (NFD),
 * and so do the patterns that read it.
 */
export function normaliseBangla(value: string): string {
  return value.normalize('NFD');
}

/** Converts Bangla digits to ASCII digits; other characters are kept. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Parses "৭০০", "7,000", "১,২০০.৫০" into a number, or null. */
export function parseNumber(value: string): number | null {
  const cleaned = toAsciiDigits(value).replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (match, name: string) => {
    const lower = name.toLowerCase();
    if (lower.startsWith('#x')) return safeChar(parseInt(lower.slice(2), 16), match);
    if (lower.startsWith('#')) return safeChar(parseInt(lower.slice(1), 10), match);
    return ENTITIES[lower] ?? match;
  });
}

function safeChar(code: number, fallback: string): string {
  return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : fallback;
}

/** Removes elements whose content must never be read as text. */
export function stripNonContent(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|form|select|button)\b[\s\S]*?<\/\1\s*>/gi, ' ');
}

/**
 * Plain text of an HTML fragment, one block per line. Block-level tags become
 * line breaks so sentences from different paragraphs never run together.
 */
export function htmlToText(html: string): string {
  const withBreaks = stripNonContent(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|tr|table|section|article|h[1-6]|header|footer|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<\/?(td|th)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return normaliseBangla(decodeEntities(withBreaks))
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/** The page's `<title>`, without the " | section | site" suffix portals add. */
export function pageTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  const title = normaliseBangla(decodeEntities(match[1])).replace(/\s+/g, ' ').trim();
  const first = title.split(' | ')[0]?.trim();
  return first || null;
}

export interface PageLink {
  readonly url: string;
  readonly text: string;
}

/** Every `<a href>` in the fragment, resolved against [base], deduplicated by URL. */
export function extractLinks(html: string, base: string): PageLink[] {
  const seen = new Map<string, PageLink>();
  const pattern = /<a\b[^>]*?href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of stripNonContent(html).matchAll(pattern)) {
    const href = decodeEntities(match[1] ?? '').trim();
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) continue;
    let url: string;
    try {
      url = new URL(href, base).toString();
    } catch {
      continue;
    }
    const text = normaliseBangla(decodeEntities((match[2] ?? '').replace(/<[^>]+>/g, ' '))).replace(/\s+/g, ' ').trim();
    if (!seen.has(url)) seen.set(url, { url, text });
  }
  return [...seen.values()];
}

/**
 * Splits text into sentences on the Bangla dāṛi (।), full stops followed by a
 * space, question/exclamation marks, semicolons and line breaks.
 */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[।!?;])\s+|\n+|(?<=\.)\s+(?=[^\d])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/** A slug from English words; falls back to a short stable id when there are none. */
export function slugify(value: string, fallbackSeed: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (slug.length >= 3) return slug;
  let hash = 0;
  for (const ch of fallbackSeed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `programme-${hash.toString(36)}`;
}

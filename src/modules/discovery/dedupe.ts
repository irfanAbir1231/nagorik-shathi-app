/**
 * Is a page we found a programme we already list? Pure, so the rule is tested.
 *
 * Seeded programmes cite a site's home page as their source, not the
 * programme's own page, so URL equality alone misses most matches; the
 * Bangla title is compared too, ignoring spacing, punctuation and the
 * common "কর্মসূচি" (programme) suffix.
 */

export function normaliseTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{Cf}/gu, '') // zero-width joiners and similar invisible marks
    .toLowerCase()
    .replace(/(কর্মসূচি|কর্মসুচি|কার্যক্রম|programme|program)/g, '')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

export function sameUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const clean = (u: string) => {
    try {
      const url = new URL(u);
      return `${url.host.replace(/^www\./, '')}${decodeURI(url.pathname).replace(/\/+$/, '')}`;
    } catch {
      return u;
    }
  };
  return clean(a) === clean(b);
}

export interface KnownProgramme {
  readonly id: string;
  readonly titleBn: string;
  readonly title: string;
  readonly sourceUrl: string | null;
  readonly officialUrl: string | null;
}

/**
 * The listed programme a page describes, or null. A URL match wins; otherwise
 * the normalised Bangla titles must be equal, or one must contain the other
 * when both are long enough that containment is meaningful.
 */
export function findKnownProgramme(
  page: { url: string; titleBn: string | null | undefined },
  known: readonly KnownProgramme[],
): KnownProgramme | null {
  const byUrl = known.find((p) => sameUrl(p.sourceUrl, page.url) || sameUrl(p.officialUrl, page.url));
  if (byUrl) return byUrl;
  if (!page.titleBn) return null;
  const target = normaliseTitle(page.titleBn);
  if (target.length < 3) return null;
  const exact = known.find((p) => {
    const candidate = normaliseTitle(p.titleBn);
    if (candidate === target) return true;
    const shorter = candidate.length < target.length ? candidate : target;
    const longer = candidate.length < target.length ? target : candidate;
    return shorter.length >= 6 && longer.includes(shorter);
  });
  if (exact) return exact;

  // Word by word: "বিধবা ও স্বামী নিগৃহীতা ভাতা" is the seed's "বিধবা ও স্বামী
  // নিগৃহীতা মহিলা ভাতা". Strict on purpose: a false match would turn a new
  // programme into an edit of a different one.
  let best: { programme: KnownProgramme; score: number } | null = null;
  for (const programme of known) {
    const score = titleSimilarity(page.titleBn, programme.titleBn);
    if (score >= 0.6 && (!best || score > best.score)) best = { programme, score };
  }
  return best?.programme ?? null;
}

const FILLER_WORDS = new Set(['ও', 'এবং', 'জন্য', 'এর', 'র', 'and', 'for', 'the', 'of'].map((w) => w.normalize('NFD')));

function titleWords(title: string): string[] {
  return title
    .normalize('NFD')
    .replace(/\p{Cf}/gu, '')
    .toLowerCase()
    .replace(/(কর্মসূচি|কর্মসুচি|কার্যক্রম|programme|program)/g, ' ')
    .split(/[\s\p{P}\p{S}]+/u)
    .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));
}

/** The same word, or one with a grammatical ending added (শিক্ষার্থী / শিক্ষার্থীদের). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.startsWith(short) && long.length - short.length <= 4;
}

/**
 * 0–1. Jaccard similarity over meaningful words, counting a word as present
 * when the other title has it or an inflected form of it. Needs at least two
 * shared words, so two one-word titles never match on a common term.
 */
export function titleSimilarity(a: string, b: string): number {
  const wa = titleWords(a);
  const wb = titleWords(b);
  if (wa.length === 0 || wb.length === 0) return 0;
  const shared = wa.filter((x) => wb.some((y) => sameWord(x, y))).length;
  if (shared < 2) return 0;
  return shared / (wa.length + wb.length - shared);
}

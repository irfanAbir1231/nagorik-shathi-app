import { extractNumbers } from '@/lib/format/number-words';
import { toLatinDigits } from '@/lib/format/numerals';
import { matchDistrict } from '@/lib/domain/geography';

/**
 * Deterministic candidate finders for the "code finds, model picks" pattern.
 *
 * Jev is documented as unreliable at numbers, counting, and arithmetic
 * (docs.typesafe.ai/model-jaggedness/jev-1.13), and a model that re-types a
 * figure can transpose a digit. So values are never produced by a model here:
 * code finds every candidate span, Jev only decides what ROLE each one plays
 * ("the writer's age", "someone else's age", "monthly income"…), and code
 * copies the value it already parsed. The model cannot invent a number because
 * it is never asked for one.
 */

export interface NumberCandidate {
  readonly index: number;
  readonly value: number;
  /** The tokens the value was read from, e.g. "সাড়ে চার হাজার". */
  readonly surface: string;
  /** The clause it came from, so a reviewer can see the context. */
  readonly clause: string;
  /** A land unit found in the same clause, if any. */
  readonly landUnit: 'decimal' | 'katha' | 'bigha' | null;
}

export interface PlaceCandidate {
  readonly code: string;
  readonly division: string;
  readonly surface: string;
}

const MAX_NUMBER_CANDIDATES = 8;

/**
 * Clause boundaries. A full stop only splits when followed by space or end, so
 * "1.5 lakh" survives; "and"/"এবং"/"আর" split because the shared parser treats
 * "and" as a joiner ("one hundred and five"), which merges "aged 5 and 8".
 */
const CLAUSE_SPLIT = /[,،;!?\n।]+|\.(?=\s|$)|\s(?:and|এবং|আর|ar)\s/;

/**
 * The shared parser reads a bare "a"/"an" as 1 so that "a thousand" works; as a
 * candidate finder that turns "500 taka a month" into 501. Only keep it when a
 * scale word follows.
 */
const LONE_ARTICLE = /\b(a|an)\b(?!\s+(?:hundred|thousand|lakh|lac|million|crore|koti|hajar))/g;

function landUnitIn(clause: string): NumberCandidate['landUnit'] {
  if (/শতাংশ|শতক|decimal/.test(clause)) return 'decimal';
  if (/কাঠা|katha/.test(clause)) return 'katha';
  if (/বিঘা|bigha/.test(clause)) return 'bigha';
  return null;
}

/**
 * Banglish number words that are also ordinary English words ("at" = 8,
 * "sat" = 7, "tin" = 3, "char" = 4). Read as numbers only when a Banglish
 * classifier or unit follows ("tin ta baccha", "char hajar"); otherwise "call
 * me at…" becomes an 8.
 */
const ENGLISH_COLLISIONS = new Set(['at', 'sat', 'tin', 'char']);
const BANGLISH_CLASSIFIER = /^(?:ta|ti|jon|bochor|bochorer|hajar|lakh|lac|taka|tk|mash|mas|din|bigha|katha|shotok|decimal)\b/;

function isCollision(run: { tokens: string[] }, clause: string): boolean {
  // Every token must be a collision word ("sat at" forms one run, read as 78).
  if (run.tokens.length === 0 || !run.tokens.every((t) => ENGLISH_COLLISIONS.has(t))) return false;
  const last = run.tokens[run.tokens.length - 1]!;
  const after = clause.split(new RegExp(`\\b${last}\\b`)).pop()?.trim() ?? '';
  return !BANGLISH_CLASSIFIER.test(after);
}

export function findNumberCandidates(message: string): NumberCandidate[] {
  // South Asian digit grouping ("1,20,000", "৳4,500") must be joined BEFORE
  // splitting clauses on commas — the previous version split the number itself.
  const normalised = toLatinDigits(message.toLowerCase()).replace(/[‌‍]/g, '').replace(/(\d),(?=\d)/g, '$1');
  const out: NumberCandidate[] = [];
  for (const rawClause of normalised.split(CLAUSE_SPLIT)) {
    const clause = rawClause.trim();
    if (!clause) continue;
    for (const run of extractNumbers(clause.replace(LONE_ARTICLE, ' '))) {
      if (isCollision(run, clause)) continue;
      if (out.length >= MAX_NUMBER_CANDIDATES) return out;
      out.push({
        index: out.length,
        value: run.value,
        surface: run.tokens.join(' '),
        clause,
        landUnit: landUnitIn(clause),
      });
    }
  }
  return out;
}

/**
 * The message split into clauses AS WRITTEN (original case and script), for
 * span pinning. Splits on sentence and clause punctuation only — not on "and",
 * which would cut "my husband died and I have three children" mid-thought.
 */
export function clausesOf(message: string): string[] {
  return message
    .split(/[,،;!?\n।]+|\.(?=\s|$)/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 1)
    .slice(0, 8);
}

/** District names mentioned anywhere in the message, deduplicated. */
export function findPlaceCandidates(message: string): PlaceCandidate[] {
  const words = message.toLowerCase().split(/[^a-zঀ-৿']+/).filter((w) => w.length >= 4);
  const seen = new Map<string, PlaceCandidate>();
  for (const word of words) {
    const district = matchDistrict(word.replace(/'/g, ''));
    if (district && !seen.has(district.code)) {
      seen.set(district.code, { code: district.code, division: district.division, surface: word });
    }
  }
  return [...seen.values()].slice(0, 6);
}

/** Decimals, the unit the rule engine and profile form use. 1 bigha ≈ 33, 1 katha ≈ 1.65. */
export function toDecimals(value: number, unit: NumberCandidate['landUnit']): number | null {
  if (unit === 'decimal') return value;
  if (unit === 'katha') return Math.round(value * 1.65 * 100) / 100;
  if (unit === 'bigha') return value * 33;
  return null;
}

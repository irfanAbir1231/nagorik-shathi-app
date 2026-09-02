import { INTENTS, type Intent, type LifeEvent } from '@/lib/domain/enums';
import { SEED_LIFE_EVENTS } from '@/lib/db/seed/life-events';
import { matchDistrict } from '@/lib/domain/geography';
import { toLatinDigits } from '@/lib/format/numerals';
import { parseAmount } from '@/lib/format/number-words';
import type { EligibilityProfile } from '@/modules/eligibility/engine';

/**
 * Natural-language understanding — PRD §20 modules 2 and 3, and §23.
 *
 * This is DETERMINISTIC and runs before any model call, for three reasons:
 *  1. Intent and life-event detection drive which programmes are retrieved, and
 *     retrieval must be reproducible for the same input (PRD §33).
 *  2. It works identically with and without an API key.
 *  3. Entity extraction writes to the citizen's profile. A model hallucinating
 *     an income figure into a stored profile would corrupt every future
 *     eligibility decision, so extraction is pattern-based and conservative:
 *     when a value is ambiguous it is NOT extracted.
 *
 * When a live provider is configured it can refine these results, but it never
 * replaces them — see `conversation.service.ts`.
 */

/* --------------------------------------------------------- language ID */

const BANGLA_CHAR = /[ঀ-৿]/;

/** Detects script, not language: Banglish is romanised Bangla and reads as en. */
export function detectLocale(text: string, fallback: 'bn' | 'en' = 'bn'): 'bn' | 'en' {
  const banglaCount = (text.match(/[ঀ-৿]/g) ?? []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (banglaCount === 0 && latinCount === 0) return fallback;
  // Any meaningful amount of Bangla script wins: a citizen writing mostly
  // Bangla with an English word or two expects a Bangla reply.
  if (banglaCount >= 3) return 'bn';
  if (latinCount > banglaCount * 3) return 'en';
  return banglaCount > 0 ? 'bn' : 'en';
}

export function containsBangla(text: string): boolean {
  return BANGLA_CHAR.test(text);
}

/* ------------------------------------------------------ normalisation */

function normalise(text: string): string {
  return toLatinDigits(text)
    .toLowerCase()
    // Strip zero-width joiners used in Bangla conjuncts so matching is stable,
    // but keep the letters themselves intact.
    .replace(/[‌‍]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* --------------------------------------------------- life-event detect */

export interface LifeEventMatch {
  readonly event: LifeEvent;
  readonly matchedKeyword: string;
  readonly confidence: number;
}

/**
 * Keyword detection over the seeded lexicon. Longer keywords score higher,
 * because "স্বামী মারা গেছেন" is far more specific than "স্বামী".
 */
export function detectLifeEvents(text: string): LifeEventMatch[] {
  const haystack = normalise(text);
  if (!haystack) return [];

  const hits = new Map<LifeEvent, LifeEventMatch>();

  for (const entry of SEED_LIFE_EVENTS) {
    for (const keyword of entry.keywords) {
      const needle = normalise(keyword);
      if (needle.length < 3 || !haystack.includes(needle)) continue;

      // Longer, more specific phrases give higher confidence, capped at 0.95 —
      // a keyword match is strong evidence but never certainty.
      const confidence = Math.min(0.95, 0.55 + needle.length * 0.02);
      const existing = hits.get(entry.code);
      if (!existing || confidence > existing.confidence) {
        hits.set(entry.code, { event: entry.code, matchedKeyword: keyword, confidence });
      }
    }
  }

  // Citizens naturally insert time and context between the subject and event
  // ("স্বামী গত বছর মারা গেছেন"). The curated keyword list cannot enumerate
  // every such phrase, so these bounded contextual patterns preserve meaning
  // without becoming an open-ended classifier.
  const contextual: readonly { event: LifeEvent; pattern: RegExp; label: string; confidence: number }[] = [
    { event: 'widowhood', pattern: /স্বামী.{0,28}(?:মারা|মৃত্যু)|husband.{0,32}(?:died|passed away)/, label: 'contextual widowhood phrase', confidence: 0.9 },
    { event: 'crop_loss', pattern: /ফসল.{0,28}(?:নষ্ট|ক্ষতি)|crop.{0,32}(?:destroyed|lost|damage)/, label: 'contextual crop-loss phrase', confidence: 0.88 },
  ];
  for (const rule of contextual) {
    if (!rule.pattern.test(haystack)) continue;
    const existing = hits.get(rule.event);
    if (!existing || existing.confidence < rule.confidence) {
      hits.set(rule.event, { event: rule.event, matchedKeyword: rule.label, confidence: rule.confidence });
    }
  }

  return [...hits.values()].sort((a, b) => b.confidence - a.confidence);
}

/* ------------------------------------------------------ intent detect */

const INTENT_KEYWORDS: Partial<Record<Intent, readonly string[]>> = {
  check_eligibility: [
    'যোগ্য', 'পাব কি', 'পাবো কি', 'আমি কি পাব', 'শর্ত', 'যোগ্যতা', 'eligible', 'do i qualify',
    'am i eligible', 'can i get', 'qualify', 'criteria',
  ],
  scholarship_search: [
    'বৃত্তি', 'স্কলারশিপ', 'উপবৃত্তি', 'scholarship', 'stipend', 'fellowship', 'study abroad',
    'বিদেশে পড়', 'ফেলোশিপ',
  ],
  healthcare_search: [
    'হাসপাতাল', 'চিকিৎসা', 'ডাক্তার', 'ঔষধ', 'রোগ', 'hospital', 'treatment', 'doctor',
    'medicine', 'clinic', 'dialysis', 'ক্যান্সার', 'cancer',
  ],
  ngo_assistance: ['এনজিও', 'ব্র্যাক', 'ngo', 'brac', 'asa', 'grameen', 'বেসরকারি সংস্থা'],
  agriculture_support: [
    'কৃষি', 'ফসল', 'বীজ', 'সার', 'কৃষক', 'জমি', 'গরু', 'মাছ চাষ', 'agriculture', 'crop',
    'seed', 'fertiliser', 'fertilizer', 'farmer', 'livestock',
  ],
  sme_support: [
    'ব্যবসা', 'দোকান', 'উদ্যোক্তা', 'এসএমই', 'business', 'shop', 'entrepreneur', 'sme', 'startup',
  ],
  document_requirements: [
    'কি কাগজ', 'কী কাগজ', 'কাগজপত্র', 'ডকুমেন্ট', 'কী লাগবে', 'কি লাগবে', 'what documents',
    'documents needed', 'papers', 'what do i need', 'required documents',
  ],
  nearby_services: [
    'কোথায়', 'নিকটে', 'কাছে', 'অফিস কোথায়', 'ঠিকানা', 'where', 'nearby', 'near me',
    'address', 'which office', 'location',
  ],
  timeline_request: [
    'শেষ তারিখ', 'সময়সীমা', 'কখন', 'ডেডলাইন', 'deadline', 'last date', 'when is',
    'timeline', 'schedule',
  ],
  find_opportunities: [
    'কী পেতে পারি', 'কি পেতে পারি', 'সহায়তা', 'সাহায্য', 'ভাতা', 'সুবিধা',
    'what can i get', 'what support', 'help', 'allowance', 'benefit', 'assistance',
  ],
};

const GREETING_PATTERNS = [
  'আসসালামু', 'সালাম', 'নমস্কার', 'হ্যালো', 'হাই', 'কেমন আছেন',
  'hello', 'hi', 'hey', 'assalamu', 'salam', 'good morning', 'good evening',
];

const OUT_OF_SCOPE_PATTERNS = [
  'আবহাওয়া', 'খেলা', 'ক্রিকেট', 'সিনেমা', 'গান', 'রেসিপি', 'জোকস',
  'weather', 'cricket', 'football', 'movie', 'song', 'recipe', 'joke', 'stock price',
  'bitcoin', 'who won',
];

export interface IntentResult {
  readonly intents: readonly Intent[];
  readonly isGreeting: boolean;
  readonly isOutOfScope: boolean;
  readonly confidence: number;
}

export function classifyIntents(text: string): IntentResult {
  const haystack = normalise(text);
  const words = haystack.split(' ').filter(Boolean);

  const isGreeting =
    words.length <= 5 && GREETING_PATTERNS.some((p) => haystack.includes(normalise(p)));

  const isOutOfScope =
    !isGreeting && OUT_OF_SCOPE_PATTERNS.some((p) => haystack.includes(normalise(p)));

  const matched: Intent[] = [];
  for (const intent of INTENTS) {
    const keywords = INTENT_KEYWORDS[intent];
    if (!keywords) continue;
    if (keywords.some((k) => haystack.includes(normalise(k)))) matched.push(intent);
  }

  // A described situation with no explicit question is still a request to find
  // opportunities — PRD §1.6: citizens describe life events, not services.
  if (matched.length === 0 && !isGreeting && !isOutOfScope && detectLifeEvents(text).length > 0) {
    matched.push('find_opportunities');
  }
  if (matched.length === 0 && !isGreeting && !isOutOfScope && words.length > 3) {
    matched.push('general_information');
  }

  return {
    intents: matched,
    isGreeting,
    isOutOfScope,
    confidence: matched.length > 0 ? Math.min(0.9, 0.5 + matched.length * 0.15) : 0.3,
  };
}

/* ---------------------------------------------------- entity extraction */

export interface ExtractedEntities {
  readonly profile: Partial<EligibilityProfile>;
  /** Which fields were found, for the "we saved this" confirmation. */
  readonly fields: readonly string[];
}

/**
 * Numbers are parsed by the shared `number-words` module, not a second table
 * here. The duplicate this replaced knew 17 Bangla words and no fraction terms,
 * so it disagreed with the tested parser on most spoken amounts — see the note on
 * the income branch below. One vocabulary, one set of tests, one place to fix.
 */

export function extractEntities(text: string): ExtractedEntities {
  const profile: Partial<EligibilityProfile> = {};
  const fields: string[] = [];
  const haystack = normalise(text);

  /* ---- age ---- */
  const agePatterns = [
    /(?:বয়স|বয়স|boyos|age)[^\d]{0,12}(\d{1,3})/,
    /(\d{1,3})\s*(?:বছর|bochor|years? old|yrs?)/,
    /(?:i am|আমার বয়স|আমার বয়স)\s*(\d{1,3})/,
  ];
  for (const pattern of agePatterns) {
    const match = haystack.match(pattern);
    const value = match?.[1] ? Number(match[1]) : NaN;
    if (Number.isFinite(value) && value >= 1 && value <= 120) {
      profile.age = value;
      fields.push('age');
      break;
    }
  }

  /* ---- income ---- */
  /**
   * Requires an income keyword nearby. A bare number in "5000 taka for medicine"
   * is NOT income, and mis-extracting it would corrupt every future decision.
   *
   * The keyword anchors a WINDOW which is handed to the shared number parser,
   * rather than the keyword pattern trying to capture the figure itself. The
   * previous version did the latter, and its alternation only admitted
   * এক|দুই|তিন|চার|পাঁচ with the number strictly after the keyword — so it
   * silently lost "দেড় হাজার", "আড়াই হাজার", "four thousand", and any figure a
   * citizen stated before the word (মাসে ৪৫০০ টাকা আয়), and it read
   * "সাড়ে চার হাজার" as 4,000 by dropping the সাড়ে.
   *
   * The window looks BOTH ways for exactly that reason, and `parseAmount` does
   * the disambiguation it was written and tested for — including refusing to
   * guess when two bare numbers appear with no currency or scale evidence.
   */
  const keyword = /আয়|আয়|ইনকাম|income|বেতন|salary|earn|রোজগার/.exec(haystack);
  if (keyword) {
    // Prefer an explicit monthly anchor when it occurs immediately before the
    // income word. This keeps an earlier age or household count out of the
    // amount parser (for example "বয়স ৫৮, মাসে ৫ হাজার টাকা আয়").
    const monthlyAnchor = Math.max(
      haystack.lastIndexOf('মাসে', keyword.index),
      haystack.lastIndexOf('per month', keyword.index),
      haystack.lastIndexOf('monthly', keyword.index),
    );
    const initialFrom = monthlyAnchor >= 0 && keyword.index - monthlyAnchor <= 45
      ? monthlyAnchor
      : Math.max(0, keyword.index - 30);
    const sentenceBoundary = Math.max(
      haystack.lastIndexOf('।', keyword.index),
      haystack.lastIndexOf('.', keyword.index),
      haystack.lastIndexOf('?', keyword.index),
      haystack.lastIndexOf('!', keyword.index),
    );
    const from = Math.max(initialFrom, sentenceBoundary + 1);
    const window = haystack.slice(from, keyword.index + keyword[0].length + 50);
    const amount = parseAmount(window);
    if (amount !== null && amount >= 0 && amount <= 10_000_000) {
      // Treat a stated figure as monthly unless "বার্ষিক"/"yearly" appears.
      const isYearly = /বার্ষিক|বছরে|yearly|per year|annual/.test(haystack);
      profile.monthlyIncome = isYearly ? Math.round(amount / 12) : amount;
      profile.annualIncome = isYearly ? amount : amount * 12;
      fields.push('monthlyIncome');
    }
  }

  /* ---- gender ---- */
  const widowhoodPhrase = /বিধবা|widow|স্বামী.{0,28}(?:মারা|মৃত্যু)|husband.{0,32}(?:died|passed away)/;
  if (/\b(?:মহিলা|নারী|মেয়ে|woman|female|আমি একজন মহিলা|স্ত্রী)\b/.test(haystack) || widowhoodPhrase.test(haystack)) {
    profile.gender = 'female';
    fields.push('gender');
  } else if (/\b(?:পুরুষ|ছেলে|man|male)\b/.test(haystack)) {
    profile.gender = 'male';
    fields.push('gender');
  }

  /* ---- marital status ---- */
  if (widowhoodPhrase.test(haystack)) {
    profile.maritalStatus = 'widowed';
    fields.push('maritalStatus');
  } else if (/তালাক|ডিভোর্স|divorce/.test(haystack)) {
    profile.maritalStatus = 'divorced';
    fields.push('maritalStatus');
  } else if (/বিবাহিত|married|স্ত্রী আছে|স্বামী আছে/.test(haystack)) {
    profile.maritalStatus = 'married';
    fields.push('maritalStatus');
  } else if (/অবিবাহিত|unmarried|single/.test(haystack)) {
    profile.maritalStatus = 'single';
    fields.push('maritalStatus');
  }

  /* ---- occupation ---- */
  const occupationMap: readonly [RegExp, EligibilityProfile['occupation']][] = [
    [/কৃষক|চাষি|farmer|farming|চাষাবাদ/, 'farmer'],
    [/শিক্ষার্থী|ছাত্র|ছাত্রী|student|পড়াশোনা করি|পড়ছি/, 'student'],
    [/গৃহিণী|housewife|homemaker|গৃহকর্মী নই/, 'homemaker'],
    [/দিনমজুর|day labour|day labor|শ্রমিক/, 'day_labourer'],
    [/জেলে|মাছ ধরি|fisherman/, 'fisherman'],
    [/রিকশা|rickshaw/, 'rickshaw_driver'],
    [/গার্মেন্টস|garment/, 'garment_worker'],
    [/তাঁতি|weaver/, 'weaver'],
    [/শিক্ষক|teacher/, 'teacher'],
    [/সরকারি চাকরি|government (?:job|employee)/, 'government_employee'],
    [/বেকার|unemployed|চাকরি নেই|চাকরি হারিয়েছি|jobless|lost my job/, 'unemployed'],
    [/ব্যবসা|দোকান|business|shop owner/, 'small_business'],
    [/অবসর|retired/, 'retired'],
  ];
  for (const [pattern, occupation] of occupationMap) {
    if (pattern.test(haystack)) {
      profile.occupation = occupation;
      fields.push('occupation');
      break;
    }
  }

  /* ---- education / CGPA ---- */
  const cgpaMatch = haystack.match(/(?:cgpa|সিজিপিএ|জিপিএ|gpa)[^\d]{0,10}(\d(?:\.\d{1,2})?)/);
  if (cgpaMatch?.[1]) {
    const cgpa = Number(cgpaMatch[1]);
    if (cgpa >= 0 && cgpa <= 5) {
      profile.cgpa = cgpa;
      fields.push('cgpa');
    }
  }

  const educationMap: readonly [RegExp, EligibilityProfile['education']][] = [
    [/পিএইচডি|phd|doctorate/, 'phd'],
    [/মাস্টার্স|masters|স্নাতকোত্তর|mba|msc\b|ma\b/, 'master'],
    [/স্নাতক|অনার্স|bachelor|honours|honors|bsc\b|ba\b|bba/, 'bachelor'],
    [/ডিপ্লোমা|diploma|polytechnic/, 'diploma'],
    [/এইচএসসি|hsc|উচ্চমাধ্যমিক|intermediate|দ্বাদশ/, 'hsc'],
    [/এসএসসি|ssc|মাধ্যমিক|দশম/, 'ssc'],
    [/জেএসসি|jsc|অষ্টম/, 'jsc'],
    [/প্রাথমিক|primary|পঞ্চম/, 'primary'],
    [/পড়িনি|লেখাপড়া করিনি|never went to school|no schooling|illiterate|নিরক্ষর/, 'none'],
  ];
  for (const [pattern, education] of educationMap) {
    if (pattern.test(haystack)) {
      profile.education = education;
      fields.push('education');
      break;
    }
  }

  /* ---- district ---- */
  // Scan word windows so "I live in Cox's Bazar" resolves, without matching a
  // district name that happens to appear inside an unrelated word.
  const words = haystack.split(/[^a-zঀ-৿]+/).filter((w) => w.length >= 4);
  for (const word of words) {
    const district = matchDistrict(word);
    if (district) {
      profile.district = district.code;
      profile.division = district.division;
      fields.push('district');
      break;
    }
  }

  /* ---- disability ---- */
  if (/প্রতিবন্ধী|প্রতিবন্ধিতা|disabled|disability|হুইলচেয়ার|wheelchair|অন্ধ|blind|বধির|deaf/.test(haystack)) {
    profile.hasDisability = true;
    fields.push('hasDisability');
  }

  /* ---- pregnancy ---- */
  if (/গর্ভবতী|সন্তানসম্ভবা|pregnant|pregnancy|বাচ্চা হবে/.test(haystack)) {
    profile.isPregnant = true;
    profile.gender = 'female';
    fields.push('isPregnant');
  }

  /* ---- medical conditions ---- */
  const conditions: string[] = [];
  const conditionMap: readonly [RegExp, string][] = [
    [/ক্যান্সার|cancer|ক্যানসার/, 'cancer'],
    [/কিডনি|kidney|ডায়ালাইসিস|dialysis/, 'kidney_failure'],
    [/লিভার|liver|সিরোসিস|cirrhosis/, 'liver_cirrhosis'],
    [/স্ট্রোক|stroke|প্যারালাইসিস|paralysis|পক্ষাঘাত/, 'stroke_paralysis'],
    [/থ্যালাসেমিয়া|thalass/, 'thalassaemia'],
    [/হৃদরোগ|হার্ট|heart disease|congenital heart/, 'congenital_heart'],
  ];
  for (const [pattern, condition] of conditionMap) {
    if (pattern.test(haystack)) conditions.push(condition);
  }
  if (conditions.length > 0) {
    profile.medicalConditions = conditions;
    fields.push('medicalConditions');
  }

  /* ---- household ---- */
  const householdMatch = haystack.match(/(?:পরিবারে|সদস্য|household|family of|family members?)[^\d]{0,15}(\d{1,2})/);
  if (householdMatch?.[1]) {
    const size = Number(householdMatch[1]);
    if (size >= 1 && size <= 30) {
      profile.householdSize = size;
      fields.push('householdSize');
    }
  }

  /* ---- land ---- */
  const landMatch = haystack.match(/(\d+(?:\.\d+)?)\s*(?:শতাংশ|শতক|decimal|katha|কাঠা|বিঘা|bigha)/);
  if (landMatch?.[1]) {
    const value = Number(landMatch[1]);
    const unit = landMatch[0];
    // 1 bigha ≈ 33 decimals; 1 katha ≈ 1.65 decimals.
    const decimals = /বিঘা|bigha/.test(unit) ? value * 33 : /কাঠা|katha/.test(unit) ? value * 1.65 : value;
    if (decimals >= 0 && decimals <= 100_000) {
      profile.landOwnershipDecimals = Math.round(decimals * 100) / 100;
      fields.push('landOwnershipDecimals');
    }
  }

  /* ---- student / business flags ---- */
  if (profile.occupation === 'student' || /পড়ছি|পড়াশোনা করছি|studying|i study/.test(haystack)) {
    profile.isStudent = true;
    if (!fields.includes('isStudent')) fields.push('isStudent');
  }
  if (/ব্যবসা আছে|দোকান আছে|i run a business|my shop|my business/.test(haystack)) {
    profile.hasBusiness = true;
    fields.push('hasBusiness');
  }

  return { profile, fields: [...new Set(fields)] };
}

/** Full NLU pass. */
export interface NluResult {
  readonly locale: 'bn' | 'en';
  readonly intents: readonly Intent[];
  readonly isGreeting: boolean;
  readonly isOutOfScope: boolean;
  readonly lifeEvents: readonly LifeEventMatch[];
  readonly entities: ExtractedEntities;
  readonly confidence: number;
}

export function understand(text: string, fallbackLocale: 'bn' | 'en' = 'bn'): NluResult {
  const locale = detectLocale(text, fallbackLocale);
  const intentResult = classifyIntents(text);
  const lifeEvents = detectLifeEvents(text);
  const entities = extractEntities(text);

  return {
    locale,
    intents: intentResult.intents,
    isGreeting: intentResult.isGreeting,
    isOutOfScope: intentResult.isOutOfScope,
    lifeEvents,
    entities,
    confidence: Math.min(
      0.95,
      intentResult.confidence * 0.5 +
        (lifeEvents[0]?.confidence ?? 0) * 0.3 +
        Math.min(entities.fields.length / 4, 1) * 0.2,
    ),
  };
}

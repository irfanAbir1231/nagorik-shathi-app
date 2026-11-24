import type { LifeEvent, OpportunityCategory } from '@/lib/domain/enums';
import { parseNumber, sentences, toAsciiDigits } from './text';

/**
 * Rule-based extraction: turns the text of a government programme page into a
 * partial draft, and records for every filled field the sentence it came from.
 *
 * It never guesses. A field it cannot support from the page stays empty and
 * the reviewer fills it. English fields are never invented from Bangla here;
 * only the AI pass (ai-extract.ts) translates, and only when the source allows it.
 */

/** Opportunity-shaped fields a candidate draft can hold (see upsertOpportunitySchema). */
export interface CandidateDraft {
  organizationId?: string | null;
  title?: string;
  titleBn?: string;
  summary?: string;
  summaryBn?: string;
  description?: string;
  descriptionBn?: string;
  benefits?: string;
  benefitsBn?: string;
  slug?: string;
  category?: OpportunityCategory;
  benefitAmount?: number | null;
  benefitPeriod?: 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'per_course' | 'variable' | null;
  applicationProcess?: { step: number; en: string; bn: string }[];
  deadline?: string | null;
  recurrence?: 'none' | 'annual' | 'biannual' | 'quarterly' | 'continuous';
  coverageDistricts?: string[];
  officialUrl?: string | null;
  applyUrl?: string | null;
  sourceUrl?: string | null;
  sourceNote?: string | null;
  lifeEvents?: LifeEvent[];
  tags?: string[];
}

/**
 * Field → source sentence. Keys starting with `_` are reading aids for the
 * reviewer rather than fields: `_eligibility` and `_application` hold the
 * sentences that describe who qualifies and how to apply, to turn into rules
 * and steps by hand.
 */
export type Evidence = Record<string, string>;

export interface Extraction {
  readonly draft: CandidateDraft;
  readonly evidence: Evidence;
}

const MONTHLY = /(মাসিক|প্রতিমাসে|প্রতি মাসে|মাসে|per month|monthly)/i;
const YEARLY = /(বার্ষিক|বছরে|প্রতি বছর|per year|yearly|annual)/i;
const LARGE_UNITS = /^\s*(কোটি|লক্ষ|লাখ|হাজার কোটি|crore|lakh)/i;

/**
 * The benefit amount a citizen receives per period, e.g. "জনপ্রতি মাসিক ভাতার
 * হার ৭০০ টাকা". Budget figures ("৫২৩৯.২৫ কোটি টাকা") are skipped, and when a
 * page lists the rate for several years the sentence with the latest year (or
 * "বর্তমানে", currently) wins over the historical ones.
 */
export function findBenefitAmount(text: string): { amount: number; period: 'monthly' | 'yearly' | null; sentence: string } | null {
  const all = sentences(text);
  // The current fiscal year as the page states it ("২০২৬-২৭"). Years after next
  // year are targets ("Vision 2050"), not the year a rate applies to.
  const maxYear = new Date().getFullYear() + 1;
  const latestYear = Math.max(
    0,
    ...[...toAsciiDigits(text).matchAll(/\b(20\d{2})\s*-\s*\d{2,4}\b/g)]
      .map((m) => Number(m[1]))
      .filter((y) => y <= maxYear),
  );

  let best: { amount: number; period: 'monthly' | 'yearly' | null; sentence: string; score: number; index: number } | null = null;
  all.forEach((sentence, index) => {
    for (const match of sentence.matchAll(/([০-৯0-9][০-৯0-9,]*(?:\.[০-৯0-9]+)?)\s*(?=(কোটি|লক্ষ|লাখ)?\s*(টাকা|৳|taka|tk))/gi)) {
      if (match[2]) continue; // "… কোটি টাকা" is a budget, not a benefit
      const after = sentence.slice((match.index ?? 0) + match[0].length);
      if (LARGE_UNITS.test(after)) continue;
      const amount = parseNumber(match[1] ?? '');
      if (amount === null || amount <= 0 || amount > 1_000_000) continue;

      const before = sentence.slice(Math.max(0, (match.index ?? 0) - 60), match.index ?? 0);
      const period = MONTHLY.test(before) ? 'monthly' : YEARLY.test(before) ? 'yearly' : null;
      if (!period && !/(ভাতা|বৃত্তি|অনুদান|সহায়তা|allowance|stipend|grant)/i.test(sentence)) continue;

      const ascii = toAsciiDigits(sentence);
      let score = 0;
      if (period) score += 2;
      if (latestYear > 0 && ascii.includes(String(latestYear))) score += 3;
      if (/(বর্তমানে|currently)/.test(sentence)) score += 2;
      if (/(হার|rate)/i.test(before) || /^\s*(টাকা|৳)?\s*হারে/.test(after)) score += 1;
      // Pages tell the history of a rate: "initially", "in that year", "was", "trial".
      if (/(ছিল|প্রাথমিকভাবে|শুরুতে|ঐ অর্থ ?বছরে|সে সময়ে|পরীক্ষামূলক|initially|was )/.test(sentence)) score -= 3;
      if (!best || score > best.score || (score === best.score && index > best.index)) {
        best = { amount, period, sentence, score, index };
      }
    }
  });
  if (!best) return null;
  const { amount, period, sentence } = best;
  return { amount, period, sentence };
}

const BN_MONTHS: Record<string, number> = {
  জানুয়ারি: 1, জানুয়ারী: 1, ফেব্রুয়ারি: 2, ফেব্রুয়ারী: 2, মার্চ: 3, এপ্রিল: 4, মে: 5, জুন: 6,
  জুলাই: 7, আগস্ট: 8, অগাস্ট: 8, সেপ্টেম্বর: 9, অক্টোবর: 10, নভেম্বর: 11, ডিসেম্বর: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
};

/**
 * An application deadline: a date in a sentence that says it is the last day
 * ("… ৩১ আগস্ট ২০২৬ পর্যন্ত", "শেষ তারিখ …", "last date …").
 */
export function findDeadline(text: string): { date: string; sentence: string } | null {
  const cue = /(পর্যন্ত|শেষ তারিখ|সর্বশেষ তারিখ|এর মধ্যে|মধ্যে আবেদন|last date|deadline|until)/i;
  const monthNames = Object.keys(BN_MONTHS).join('|');
  const datePattern = new RegExp(`([০-৯0-9]{1,2})\\s*(${monthNames}),?\\s*([০-৯0-9]{4})`, 'giu');
  for (const sentence of sentences(text)) {
    if (!cue.test(sentence)) continue;
    const matches = [...sentence.matchAll(datePattern)];
    const last = matches.at(-1); // "১ আগস্ট থেকে ৩১ আগস্ট ২০২৬ পর্যন্ত": the end date
    if (!last) continue;
    const day = parseNumber(last[1] ?? '');
    const month = BN_MONTHS[(last[2] ?? '').toLowerCase()];
    const year = parseNumber(last[3] ?? '');
    if (!day || !month || !year || day > 31) continue;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (Number.isNaN(Date.parse(iso))) continue;
    return { date: iso, sentence };
  }
  return null;
}

const CATEGORY_CUES: [RegExp, OpportunityCategory][] = [
  [/(উপবৃত্তি|বৃত্তি|শিক্ষা সহায়তা|scholarship|stipend)/i, 'scholarship'],
  [/(চিকিৎসা|স্বাস্থ্য|হাসপাতাল|medical|health)/i, 'healthcare'],
  [/(কৃষি|কৃষক|ফসল|প্রাণিসম্পদ|agricultur|farmer)/i, 'agriculture'],
  [/(আইনগত|আইনি সহায়তা|legal aid)/i, 'legal_aid'],
  [/(দুর্যোগ|ত্রাণ|বন্যা|disaster|relief)/i, 'disaster'],
  [/(প্রশিক্ষণ|দক্ষতা|training|skill)/i, 'training'],
  [/(কর্মসংস্থান|চাকরি|employment|job)/i, 'employment'],
  [/(ঋণ|ক্ষুদ্রঋণ|উদ্যোক্তা|loan|credit|entrepreneur)/i, 'financial'],
  [/(ভাতা|সামাজিক নিরাপত্তা|পুনর্বাসন|allowance|safety net)/i, 'social_welfare'],
];

/** A category from words in the title first, then the text; null when nothing fits. */
export function guessCategory(title: string, text: string): { category: OpportunityCategory; cue: string } | null {
  for (const haystack of [title, text.slice(0, 1500)]) {
    for (const [pattern, category] of CATEGORY_CUES) {
      const match = haystack.match(pattern);
      if (match) return { category, cue: match[0] };
    }
  }
  return null;
}

const LIFE_EVENT_CUES: [RegExp, LifeEvent][] = [
  [/(বয়স্ক|প্রবীণ|old age|elderly)/i, 'old_age'],
  [/(বিধবা|widow)/i, 'widowhood'],
  [/(স্বামী নিগৃহীতা|স্বামী পরিত্যক্তা|তালাক|deserted|divorc)/i, 'divorce'],
  [/(প্রতিবন্ধী|প্রতিবন্ধিতা|disab)/i, 'disability_onset'],
  [/(গর্ভবতী|মাতৃত্ব|প্রসূতি|pregnan|maternity)/i, 'pregnancy'],
  [/(উচ্চশিক্ষা|বিশ্ববিদ্যালয়|higher education|university)/i, 'higher_education'],
  [/(শিক্ষার্থী|বিদ্যালয়|উপবৃত্তি|student|school)/i, 'child_education'],
  [/(চিকিৎসা|ক্যান্সার|কিডনি|medical treatment|cancer)/i, 'serious_medical_need'],
  [/(বেকার|কর্মসংস্থান|unemploy|job seeker)/i, 'seeking_employment'],
  [/(দুর্যোগ|বন্যা|ঘূর্ণিঝড়|disaster|flood|cyclone)/i, 'disaster_recovery'],
  [/(উদ্যোক্তা|ব্যবসা|entrepreneur|business)/i, 'entrepreneurship'],
  [/(ফসলহানি|ফসল নষ্ট|crop loss)/i, 'crop_loss'],
  [/(প্রবাস|অভিবাসী|migra)/i, 'migration'],
];

/** Life events the programme is for, read from its title (the text mentions too much). */
export function guessLifeEvents(title: string): LifeEvent[] {
  const found = new Set<LifeEvent>();
  for (const [pattern, event] of LIFE_EVENT_CUES) if (pattern.test(title)) found.add(event);
  return [...found];
}

const ELIGIBILITY_CUES = /(বয়স|আয়|যোগ্যতা|অযোগ্যতা|মানদণ্ড|মানদন্ড|শর্ত|স্থায়ী বাসিন্দা|নাগরিক|eligib|criteria|income|age)/i;
const APPLICATION_CUES = /(আবেদন|অনলাইন|ফরম|যোগাযোগ|কার্যালয়|apply|application|office)/i;

/**
 * Reads a programme page. [title] is the page title, [text] the main content
 * as plain text, [links] the links found inside the main content.
 */
export function extractFromPage(input: {
  readonly url: string;
  readonly title: string | null;
  readonly text: string;
  readonly links?: readonly { url: string; text: string }[];
}): Extraction {
  const draft: CandidateDraft = { sourceUrl: input.url, officialUrl: input.url };
  const evidence: Evidence = {};
  const body = input.text.replace(/^.*(হাল-নাগাদ|last updated).*$/gim, '').trim();
  const lines = sentences(body);

  if (input.title) {
    draft.titleBn = input.title;
    evidence.titleBn = input.title;
  }

  // Summary: the first real sentence that is not the title itself.
  const firstSentence = lines.find((s) => s.length > 40 && s !== input.title);
  if (firstSentence) {
    draft.summaryBn = firstSentence.slice(0, 400);
    evidence.summaryBn = firstSentence;
  }

  // Description: the opening paragraphs, capped so a review stays readable.
  if (body.length > 0) {
    const opening = body.split('\n').filter((l) => l.length > 30).slice(0, 4).join('\n\n');
    if (opening) {
      draft.descriptionBn = opening.slice(0, 1500);
      evidence.descriptionBn = opening.slice(0, 300);
    }
  }

  const benefit = findBenefitAmount(body);
  if (benefit) {
    draft.benefitAmount = benefit.amount;
    draft.benefitPeriod = benefit.period ?? 'variable';
    draft.benefitsBn = benefit.sentence;
    evidence.benefitAmount = benefit.sentence;
    evidence.benefitsBn = benefit.sentence;
  }

  const deadline = findDeadline(body);
  if (deadline) {
    draft.deadline = deadline.date;
    evidence.deadline = deadline.sentence;
  }

  const category = guessCategory(input.title ?? '', body);
  if (category) {
    draft.category = category.category;
    evidence.category = `"${category.cue}"`;
  }

  const lifeEvents = guessLifeEvents(input.title ?? '');
  if (lifeEvents.length > 0) {
    draft.lifeEvents = lifeEvents;
    evidence.lifeEvents = input.title ?? '';
  }

  const applyLink = (input.links ?? []).find((l) => /(আবেদন|apply|application)/i.test(l.text));
  if (applyLink) {
    draft.applyUrl = applyLink.url;
    evidence.applyUrl = applyLink.text;
  }

  const eligibility = lines.filter((s) => ELIGIBILITY_CUES.test(s)).slice(0, 12);
  if (eligibility.length > 0) evidence._eligibility = eligibility.join('\n');
  const application = lines.filter((s) => APPLICATION_CUES.test(s)).slice(0, 8);
  if (application.length > 0) evidence._application = application.join('\n');

  return { draft, evidence };
}

/** Fields that must be present before an administrator can publish. */
export const REQUIRED_FIELDS = [
  'organizationId', 'title', 'titleBn', 'summary', 'summaryBn', 'description', 'descriptionBn',
  'benefits', 'benefitsBn', 'slug', 'category', 'applicationProcess',
] as const;

/** Share of required fields the draft already has, 0–1. */
export function draftCompleteness(draft: CandidateDraft): number {
  const filled = REQUIRED_FIELDS.filter((field) => {
    const value = draft[field];
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
  });
  return Math.round((filled.length / REQUIRED_FIELDS.length) * 100) / 100;
}

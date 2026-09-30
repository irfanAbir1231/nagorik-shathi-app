import type { ResponsePlan, PlannedOpportunity } from './response-plan';
import { pickLocalised } from './response-plan';
import { formatMoney } from '@/lib/format/numerals';
import { formatDate, daysUntil } from '@/lib/format/dates';
import type { EligibilityOutcome } from '@/lib/domain/enums';

/**
 * Deterministic response composer.
 *
 * Renders a ResponsePlan into citizen-facing prose without any model. This is
 * what serves every request when no API key is configured, and what serves a
 * request when a configured provider fails.
 *
 * It is held to the same content rules as the model (PRD §33, Principles 5 & 6):
 * it states only what is in the plan, writes in simple language, marks
 * unverified records, and always ends with a next step. It is less fluent than a
 * model and does not pretend otherwise — the UI labels it "Simulated".
 */

const T = {
  bn: {
    greeting:
      'আসসালামু আলাইকুম। আপনার পরিস্থিতি সম্পর্কে আমাকে বলুন — যেমন কী ঘটেছে, বা আপনার কী দরকার। আমি দেখব কোন সরকারি বা এনজিও সহায়তা আপনি পেতে পারেন।',
    greetingHint: 'আপনি লিখতে পারেন, অথবা মাইক চেপে বলতে পারেন।',
    detected: 'আপনার কথা থেকে আমি বুঝেছি',
    foundOne: 'আপনার জন্য ১টি সহায়তা পেয়েছি।',
    foundMany: (n: string) => `আপনার জন্য ${n}টি সহায়তা পেয়েছি।`,
    eligibleIntro: 'আপনি যেগুলোর জন্য যোগ্য বলে মনে হচ্ছে:',
    partialIntro: 'যেগুলোতে আপনি হয়তো যোগ্য, কিছু শর্ত মেলাতে হবে:',
    unknownIntro: 'যেগুলোর জন্য আরও তথ্য দরকার:',
    notEligibleIntro: 'যেগুলো এখন আপনার জন্য প্রযোজ্য নয়:',
    because: 'কারণ',
    needToKnow: 'জানা দরকার',
    amount: 'পরিমাণ',
    deadline: 'শেষ তারিখ',
    daysLeft: (n: string) => `${n} দিন বাকি`,
    expired: 'সময় শেষ',
    rolling: 'সারা বছর খোলা',
    sampleWarning:
      'মনে রাখবেন: এই তথ্য এখনো যাচাই করা হয়নি — নমুনা তথ্য। আবেদনের আগে সংশ্লিষ্ট অফিসে নিশ্চিত করে নিন।',
    staleWarning:
      'মনে রাখবেন: এই কর্মসূচির তথ্য পুরনো হয়ে থাকতে পারে বা এ নিয়ে প্রশ্ন আছে। আবেদনের আগে অফিসে নিশ্চিত করুন।',
    partialBecause: 'যে শর্ত এখনো মেলেনি',
    confirmQuestion: (label: string, value: string) => `আমি বুঝেছি আপনার ${label}: "${value}"। এটা কি ঠিক? নিচের বোতাম চেপে নিশ্চিত করুন, অথবা সঠিক তথ্যটি লিখুন।`,
    conflictQuestion: (label: string, stored: string, stated: string) => `আপনার প্রোফাইলে ${label} "${stored}", কিন্তু আপনি বললেন "${stated}"। কোনটি ঠিক?`,
    nextStep: 'পরবর্তী পদক্ষেপ',
    noResults:
      'আপনার বর্ণনার সঙ্গে মেলে এমন যাচাই করা কোনো কর্মসূচি আমি এখন খুঁজে পাচ্ছি না। আমি অনুমান করে কিছু বলব না।',
    noResultsNext:
      'আপনি একটু অন্যভাবে বলে দেখতে পারেন, অথবা আপনার জেলা ও পেশা জানালে আমি আবার খুঁজব।',
    ungrounded:
      'এই বিষয়ে আমার কাছে যাচাই করা তথ্য নেই, তাই আমি অনুমান করে উত্তর দেব না।',
    ungroundedNext: 'নিকটস্থ ইউনিয়ন ডিজিটাল সেন্টারে জিজ্ঞাসা করতে পারেন, অথবা অন্যভাবে প্রশ্নটি করুন।',
    outOfScope:
      'আমি শুধু সরকারি সেবা, এনজিও কর্মসূচি, বৃত্তি, স্বাস্থ্যসেবা ও আর্থিক সহায়তা নিয়ে সাহায্য করতে পারি।',
    outOfScopeNext: 'আপনার পরিস্থিতি সম্পর্কে বলুন — আমি দেখব কী সহায়তা আছে।',
    askWhy: 'কেন জানতে চাইছি',
    seeDetails: 'বিস্তারিত দেখতে কার্ডে চাপ দিন।',
  },
  en: {
    greeting:
      'Tell me about your situation — what happened, or what you need. I will look for government and NGO support you may be able to get.',
    greetingHint: 'You can type, or press the microphone and speak.',
    detected: 'From what you told me, I understand',
    foundOne: 'I found 1 form of support for you.',
    foundMany: (n: string) => `I found ${n} forms of support for you.`,
    eligibleIntro: 'You appear to qualify for these:',
    partialIntro: 'You may qualify for these, with some conditions to meet:',
    unknownIntro: 'These need a little more information:',
    notEligibleIntro: 'These do not apply to you right now:',
    because: 'Because',
    needToKnow: 'Still needed',
    amount: 'Amount',
    deadline: 'Deadline',
    daysLeft: (n: string) => `${n} days left`,
    expired: 'Closed',
    rolling: 'Open all year',
    sampleWarning:
      'Please note: this information has not been verified yet — it is sample data. Confirm at the relevant office before applying.',
    staleWarning:
      'Please note: the information for this programme may be out of date or is disputed. Confirm at the office before applying.',
    partialBecause: 'Not yet met',
    confirmQuestion: (label: string, value: string) => `I understood your ${label} as "${value}". Is that right? Confirm with the button below, or tell me the correct answer.`,
    conflictQuestion: (label: string, stored: string, stated: string) => `Your profile says your ${label} is "${stored}", but you told me "${stated}". Which is correct?`,
    nextStep: 'Next step',
    noResults:
      'I cannot find a verified programme that matches what you described. I will not guess.',
    noResultsNext:
      'Try describing it a different way, or tell me your district and occupation and I will look again.',
    ungrounded: 'I do not have verified information about this, so I will not guess an answer.',
    ungroundedNext: 'You could ask at your nearest Union Digital Centre, or put the question a different way.',
    outOfScope:
      'I can only help with government services, NGO programmes, scholarships, healthcare, and financial support.',
    outOfScopeNext: 'Tell me about your situation and I will see what support exists.',
    askWhy: 'Why I am asking',
    seeDetails: 'Tap a card to see the details.',
  },
} as const;

function deadlineText(opportunity: PlannedOpportunity, locale: 'bn' | 'en'): string {
  const t = T[locale];
  if (!opportunity.deadline) return t.rolling;
  const days = daysUntil(opportunity.deadline);
  if (days < 0) return t.expired;
  const date = formatDate(opportunity.deadline, locale);
  return `${date} — ${t.daysLeft(String(days))}`;
}

function opportunityBlock(o: PlannedOpportunity, locale: 'bn' | 'en'): string {
  const t = T[locale];
  const lines: string[] = [];
  const title = pickLocalised(o.title, locale);
  const org = pickLocalised(o.organisation, locale);

  lines.push(`**${title}** — ${org}`);
  lines.push(pickLocalised(o.summary, locale));

  if (o.benefitAmount !== null) {
    lines.push(`${t.amount}: ${formatMoney(o.benefitAmount)}`);
  }
  lines.push(`${t.deadline}: ${deadlineText(o, locale)}`);

  // Reasons come from the rule engine verbatim. Two is enough to be convincing
  // without turning the chat into a wall of text; the details page has all.
  const reasons = o.outcome === 'not_eligible' ? o.failedReasons : o.metReasons;
  if (reasons.length > 0) {
    const shown = reasons.slice(0, 2).map((r) => pickLocalised(r, locale));
    lines.push(`${t.because}: ${shown.join(' ')}`);
  }
  if (o.outcome === 'partially_eligible' && (o.softFailedReasons ?? []).length > 0) {
    lines.push(`${t.partialBecause}: ${pickLocalised(o.softFailedReasons[0]!, locale)}`);
  }
  if (o.unknownReasons.length > 0 && o.outcome === 'unknown') {
    lines.push(`${t.needToKnow}: ${pickLocalised(o.unknownReasons[0]!, locale)}`);
  }
  if (o.nextStep) {
    lines.push(`${t.nextStep}: ${pickLocalised(o.nextStep, locale)}`);
  }

  return lines.join('\n');
}

const OUTCOME_ORDER: readonly EligibilityOutcome[] = [
  'eligible',
  'partially_eligible',
  'unknown',
  'not_eligible',
];

export function composeResponse(plan: ResponsePlan): string {
  const { locale } = plan;
  const t = T[locale];

  if (plan.kind === 'greeting') {
    return `${t.greeting}\n\n${t.greetingHint}`;
  }

  if (plan.kind === 'out_of_scope') {
    return `${t.outOfScope}\n\n${t.outOfScopeNext}`;
  }

  if (plan.kind === 'clarification') {
    const label = plan.missingFieldLabel ? pickLocalised(plan.missingFieldLabel, locale) : '';
    const reason = plan.missingFieldReason ? pickLocalised(plan.missingFieldReason, locale) : '';
    const values = plan.clarificationValues;
    const stated = values?.stated ? pickLocalised(values.stated, locale) : '';
    if (plan.clarificationKind === 'confirm') return t.confirmQuestion(label, stated);
    if (plan.clarificationKind === 'conflict') {
      return t.conflictQuestion(label, values?.profile ? pickLocalised(values.profile, locale) : '', stated);
    }
    const question = locale === 'bn' ? `আপনার ${label} কত?` : `What is your ${label}?`;
    return reason ? `${question}\n\n${t.askWhy}: ${reason}` : question;
  }

  if (plan.kind === 'no_results' || plan.opportunities.length === 0) {
    const body = plan.ungrounded ? t.ungrounded : t.noResults;
    const next = plan.ungrounded ? t.ungroundedNext : t.noResultsNext;
    return `${body}\n\n${next}`;
  }

  const sections: string[] = [];

  const count = plan.opportunities.length;
  sections.push(count === 1 ? t.foundOne : t.foundMany(String(count)));

  if (plan.lifeEvents.length > 0) {
    // Naming the detected situation back to the citizen is how they can tell
    // whether they were understood — cheap and reassuring.
    sections.push(`${t.detected}: ${plan.lifeEvents.map((e) => humaniseEvent(e, locale)).join(', ')}.`);
  }

  const groupIntros: Record<EligibilityOutcome, string> = {
    eligible: t.eligibleIntro,
    partially_eligible: t.partialIntro,
    unknown: t.unknownIntro,
    not_eligible: t.notEligibleIntro,
  };

  for (const outcome of OUTCOME_ORDER) {
    const group = plan.opportunities.filter((o) => o.outcome === outcome);
    if (group.length === 0) continue;
    sections.push(groupIntros[outcome]);
    for (const o of group) sections.push(opportunityBlock(o, locale));
  }

  // Every status short of `verified` is flagged; outdated and disputed
  // records get the stronger warning.
  const statuses = new Set(plan.opportunities.map((o) => o.verificationStatus ?? (o.isUnverified ? 'unverified_sample' : 'verified')));
  if (statuses.has('outdated') || statuses.has('disputed')) sections.push(t.staleWarning);
  else if ([...statuses].some((s) => s !== 'verified')) sections.push(t.sampleWarning);

  sections.push(t.seeDetails);
  return sections.join('\n\n');
}

const EVENT_LABELS: Record<string, { bn: string; en: string }> = {
  job_loss: { bn: 'চাকরি হারানো', en: 'job loss' },
  seeking_employment: { bn: 'কাজ খোঁজা', en: 'looking for work' },
  widowhood: { bn: 'বৈধব্য', en: 'widowhood' },
  divorce: { bn: 'বিবাহবিচ্ছেদ', en: 'divorce or separation' },
  higher_education: { bn: 'উচ্চশিক্ষা', en: 'higher education' },
  child_education: { bn: 'সন্তানের পড়াশোনা', en: "a child's education" },
  serious_medical_need: { bn: 'গুরুতর চিকিৎসার প্রয়োজন', en: 'a serious medical need' },
  pregnancy: { bn: 'গর্ভাবস্থা', en: 'pregnancy' },
  disability_onset: { bn: 'প্রতিবন্ধিতা', en: 'disability' },
  old_age: { bn: 'বার্ধক্য', en: 'old age' },
  entrepreneurship: { bn: 'ব্যবসা শুরু করা', en: 'starting a business' },
  crop_loss: { bn: 'ফসলের ক্ষতি', en: 'crop loss' },
  disaster_recovery: { bn: 'দুর্যোগ থেকে পুনরুদ্ধার', en: 'disaster recovery' },
  legal_dispute: { bn: 'আইনি সমস্যা', en: 'a legal problem' },
  migration: { bn: 'বিদেশে কাজ', en: 'working abroad' },
};

export function humaniseEvent(event: string, locale: 'bn' | 'en'): string {
  const entry = EVENT_LABELS[event];
  if (!entry) return event.replace(/_/g, ' ');
  return locale === 'bn' ? entry.bn : entry.en;
}

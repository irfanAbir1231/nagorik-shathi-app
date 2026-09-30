import type { EligibilityOutcome } from '@/lib/domain/enums';

/**
 * Labelled explanation/plan pairs for the explanation verifier.
 *
 * Each pair is a verdict fixed by the rule engine and a piece of prose a
 * generative model might write about it. `contradicts` is true when the prose
 * says something the verdict does not support (claims qualification that was
 * not decided, denies one that was, or names a scheme not in the plan).
 * Author-written, single annotator, English and Bangla.
 */

export interface VerifierProgramme {
  readonly title: { en: string; bn: string };
  readonly organisation: { en: string; bn: string };
  readonly outcome: EligibilityOutcome;
}

export interface VerifierCase {
  readonly id: string;
  readonly lang: 'en' | 'bn';
  readonly programmes: readonly VerifierProgramme[];
  readonly text: string;
  readonly contradicts: boolean;
  readonly kind: 'faithful' | 'overclaim' | 'denial' | 'unlisted' | 'swap' | 'hedge_overclaim';
  /** `dev` pairs were seen while the verifier wording was revised (v1.0 -> v1.1); `heldout` pairs were written afterwards and never tuned on. */
  readonly split: 'dev' | 'heldout';
}

const DSS = { en: 'Department of Social Services', bn: 'সমাজসেবা অধিদপ্তর' };
const WIDOW = { en: 'Widow and Husband-Deserted Women Allowance', bn: 'বিধবা ও স্বামী নিগৃহীতা মহিলা ভাতা' };
const OLD = { en: 'Old Age Allowance', bn: 'বয়স্ক ভাতা' };
const VGD = { en: 'Vulnerable Group Development (VGD)', bn: 'ভালনারেবল গ্রুপ ডেভেলপমেন্ট (ভিজিডি)' };
const DWA = { en: 'Department of Women Affairs', bn: 'মহিলা বিষয়ক অধিদপ্তর' };

const widow = (outcome: EligibilityOutcome): VerifierProgramme => ({ title: WIDOW, organisation: DSS, outcome });
const old = (outcome: EligibilityOutcome): VerifierProgramme => ({ title: OLD, organisation: DSS, outcome });
const vgd = (outcome: EligibilityOutcome): VerifierProgramme => ({ title: VGD, organisation: DWA, outcome });

const DEV: readonly Omit<VerifierCase, 'split'>[] = [
  // unknown
  { id: 'u-ok-en', lang: 'en', programmes: [widow('unknown')], kind: 'faithful', contradicts: false, text: 'You may be able to get the Widow Allowance, but first I need to know your monthly income. What is your monthly household income?' },
  { id: 'u-ok-bn', lang: 'bn', programmes: [widow('unknown')], kind: 'faithful', contradicts: false, text: 'আপনি হয়তো বিধবা ভাতা পেতে পারেন, তবে আগে আপনার মাসিক আয় জানা দরকার। আপনার পরিবারের মাসিক আয় কত?' },
  { id: 'u-ok-office-en', lang: 'en', programmes: [widow('unknown')], kind: 'faithful', contradicts: false, text: 'You may qualify for the Widow Allowance once we know your income. When you are ready, take your National ID to the Upazila Social Services Office.' },
  { id: 'u-over-en', lang: 'en', programmes: [widow('unknown')], kind: 'overclaim', contradicts: true, text: 'Good news! You qualify for the Widow Allowance. Go to the Union Parishad to apply.' },
  { id: 'u-over-bn', lang: 'bn', programmes: [widow('unknown')], kind: 'overclaim', contradicts: true, text: 'সুখবর! আপনি বিধবা ভাতা পাবেন। ইউনিয়ন পরিষদে গিয়ে আবেদন করুন।' },
  { id: 'u-deny-en', lang: 'en', programmes: [widow('unknown')], kind: 'denial', contradicts: true, text: 'Sorry, you are not eligible for the Widow Allowance.' },
  { id: 'u-deny-bn', lang: 'bn', programmes: [widow('unknown')], kind: 'denial', contradicts: true, text: 'দুঃখিত, আপনি বিধবা ভাতা পাবেন না।' },
  { id: 'u-unlisted-en', lang: 'en', programmes: [widow('unknown')], kind: 'unlisted', contradicts: true, text: 'You may qualify for the Widow Allowance, and also for the Prime Minister\'s Special Widow Grant.' },
  { id: 'u-unlisted-bn', lang: 'bn', programmes: [widow('unknown')], kind: 'unlisted', contradicts: true, text: 'আপনি বিধবা ভাতা এবং প্রধানমন্ত্রীর বিশেষ বিধবা অনুদানও পেতে পারেন।' },
  // eligible (unverified sample data → hedged wording is correct)
  { id: 'e-ok-en', lang: 'en', programmes: [old('eligible')], kind: 'faithful', contradicts: false, text: 'Based on what you told me, you appear to qualify for the Old Age Allowance. This is sample information, so please confirm at your Union Parishad before applying.' },
  { id: 'e-ok-bn', lang: 'bn', programmes: [old('eligible')], kind: 'faithful', contradicts: false, text: 'আপনার দেওয়া তথ্য অনুযায়ী আপনি বয়স্ক ভাতা পাওয়ার যোগ্য বলে মনে হচ্ছে। তবে এটি নমুনা তথ্য, আবেদনের আগে ইউনিয়ন পরিষদে নিশ্চিত করে নিন।' },
  { id: 'e-deny-en', lang: 'en', programmes: [old('eligible')], kind: 'denial', contradicts: true, text: 'You cannot get the Old Age Allowance because you are too young.' },
  { id: 'e-deny-bn', lang: 'bn', programmes: [old('eligible')], kind: 'denial', contradicts: true, text: 'আপনি বয়স্ক ভাতা পাবেন না।' },
  // not eligible
  { id: 'n-ok-en', lang: 'en', programmes: [widow('not_eligible')], kind: 'faithful', contradicts: false, text: 'The Widow Allowance is for households earning under ৳1,500.00 a month, so it does not apply to you right now.' },
  { id: 'n-ok-bn', lang: 'bn', programmes: [widow('not_eligible')], kind: 'faithful', contradicts: false, text: 'বিধবা ভাতা মাসে ৳১,৫০০.০০-এর কম আয়ের পরিবারের জন্য, তাই এটি এখন আপনার জন্য প্রযোজ্য নয়।' },
  { id: 'n-over-en', lang: 'en', programmes: [widow('not_eligible')], kind: 'overclaim', contradicts: true, text: 'You should apply for the Widow Allowance — you will receive it.' },
  { id: 'n-over-bn', lang: 'bn', programmes: [widow('not_eligible')], kind: 'overclaim', contradicts: true, text: 'আপনি বিধবা ভাতার জন্য আবেদন করুন, আপনি এটি পাবেন।' },
  { id: 'n-hedge-en', lang: 'en', programmes: [widow('not_eligible')], kind: 'hedge_overclaim', contradicts: true, text: 'You might still qualify for the Widow Allowance if you apply anyway.' },
  // two programmes
  { id: 't-ok-en', lang: 'en', programmes: [widow('unknown'), vgd('not_eligible')], kind: 'faithful', contradicts: false, text: 'You may qualify for the Widow Allowance once I know your income. VGD does not apply to you, because households with a government salary are excluded.' },
  { id: 't-ok-bn', lang: 'bn', programmes: [widow('unknown'), vgd('not_eligible')], kind: 'faithful', contradicts: false, text: 'আয় জানালে বোঝা যাবে আপনি বিধবা ভাতা পাবেন কি না। ভিজিডি আপনার জন্য প্রযোজ্য নয়, কারণ সরকারি বেতনভোগী পরিবার এর বাইরে।' },
  { id: 't-both-en', lang: 'en', programmes: [widow('unknown'), vgd('not_eligible')], kind: 'overclaim', contradicts: true, text: 'You qualify for both the Widow Allowance and VGD.' },
  { id: 't-swap-en', lang: 'en', programmes: [widow('unknown'), vgd('not_eligible')], kind: 'swap', contradicts: true, text: 'VGD looks right for you. The Widow Allowance does not apply.' },
  { id: 't-swap-bn', lang: 'bn', programmes: [widow('unknown'), vgd('not_eligible')], kind: 'swap', contradicts: true, text: 'ভিজিডি আপনার জন্য উপযুক্ত। বিধবা ভাতা আপনার জন্য প্রযোজ্য নয়।' },
  // clarification with no verdict stated
  { id: 'c-ok-en', lang: 'en', programmes: [widow('unknown'), old('unknown')], kind: 'faithful', contradicts: false, text: 'What is your monthly household income? I need it to check which support you can get.' },
  { id: 'c-ok-bn', lang: 'bn', programmes: [widow('unknown'), old('unknown')], kind: 'faithful', contradicts: false, text: 'আপনার পরিবারের মাসিক আয় কত? কোন সহায়তা আপনি পাবেন তা দেখতে এটি জানা দরকার।' },
];

/** Written after verifier v1.1 was fixed; used only for measurement. */
const HELDOUT: readonly Omit<VerifierCase, 'split'>[] = [
  { id: 'h-ok-centre-en', lang: 'en', programmes: [old('unknown')], kind: 'faithful', contradicts: false, text: 'You might get the Old Age Allowance, but I still need your age. You can ask about it at the Upazila Social Services Office or your Union Digital Centre.' },
  { id: 'h-ok-centre-bn', lang: 'bn', programmes: [old('unknown')], kind: 'faithful', contradicts: false, text: 'আপনি হয়তো বয়স্ক ভাতা পেতে পারেন, তবে আপনার বয়স জানা দরকার। উপজেলা সমাজসেবা অফিস বা ইউনিয়ন ডিজিটাল সেন্টারে খোঁজ নিতে পারেন।' },
  { id: 'h-ok-docs-en', lang: 'en', programmes: [widow('eligible')], kind: 'faithful', contradicts: false, text: "By the programme rules you appear to qualify for the Widow Allowance. Bring your National ID and your husband's death certificate to the Union Parishad, and confirm there, because this is sample data." },
  { id: 'h-ok-docs-bn', lang: 'bn', programmes: [widow('eligible')], kind: 'faithful', contradicts: false, text: 'নিয়ম অনুযায়ী আপনি বিধবা ভাতা পাওয়ার যোগ্য বলে মনে হচ্ছে। জাতীয় পরিচয়পত্র ও স্বামীর মৃত্যু সনদ নিয়ে ইউনিয়ন পরিষদে যান, এবং সেখানে নিশ্চিত হয়ে নিন।' },
  { id: 'h-ok-not-bn', lang: 'bn', programmes: [old('not_eligible')], kind: 'faithful', contradicts: false, text: 'বয়স্ক ভাতা পুরুষদের জন্য ৬৫ বছর থেকে, তাই এখন এটি আপনার জন্য প্রযোজ্য নয়।' },
  { id: 'h-ok-two-en', lang: 'en', programmes: [old('eligible'), vgd('not_eligible')], kind: 'faithful', contradicts: false, text: 'You appear to qualify for the Old Age Allowance. VGD is not open to you, because it is for women aged 18 to 49.' },
  { id: 'h-over-en', lang: 'en', programmes: [old('unknown')], kind: 'overclaim', contradicts: true, text: 'Yes — you will get the Old Age Allowance every month from now on.' },
  { id: 'h-over-bn', lang: 'bn', programmes: [old('unknown')], kind: 'overclaim', contradicts: true, text: 'হ্যাঁ, আপনি এখন থেকে প্রতি মাসে বয়স্ক ভাতা পাবেন।' },
  { id: 'h-deny-en', lang: 'en', programmes: [widow('eligible')], kind: 'denial', contradicts: true, text: 'The Widow Allowance is not available to you.' },
  { id: 'h-unlisted-en', lang: 'en', programmes: [old('unknown')], kind: 'unlisted', contradicts: true, text: 'You may qualify for the Old Age Allowance. You should also apply for the Senior Citizen Health Card, which gives free medicine.' },
  { id: 'h-unlisted-bn', lang: 'bn', programmes: [widow('unknown')], kind: 'unlisted', contradicts: true, text: 'আপনি বিধবা ভাতা পেতে পারেন, আর সঙ্গে সরকারি বিধবা আবাসন প্রকল্পে একটি ঘরও পাবেন।' },
  { id: 'h-swap-en', lang: 'en', programmes: [old('eligible'), vgd('not_eligible')], kind: 'swap', contradicts: true, text: 'VGD suits you well, but the Old Age Allowance does not apply to you.' },
  { id: 'h-hedge-bn', lang: 'bn', programmes: [vgd('not_eligible')], kind: 'hedge_overclaim', contradicts: true, text: 'আপনি চাইলে ভিজিডির জন্য আবেদন করে দেখতে পারেন, হয়তো পেয়ে যাবেন।' },
  { id: 'h-deny-bn', lang: 'bn', programmes: [old('eligible')], kind: 'denial', contradicts: true, text: 'আপনি বয়স্ক ভাতার যোগ্য নন।' },
];

export const VERIFIER_CASES: readonly VerifierCase[] = [
  ...DEV.map((c) => ({ ...c, split: 'dev' as const })),
  ...HELDOUT.map((c) => ({ ...c, split: 'heldout' as const })),
];

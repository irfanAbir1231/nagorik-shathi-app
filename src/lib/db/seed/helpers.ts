import type { RuleCondition, RuleGroup, RuleNode, RuleSet, RuleField, LocalisedText } from '@/lib/domain/rules';
import type {
  OpportunityCategory, OrganizationType, VerificationStatus, LifeEvent,
} from '@/lib/domain/enums';
import type { RuleOperator } from '@/lib/domain/enums';

/**
 * Authoring helpers for the seed corpus.
 *
 * PRD Part 7 (Knowledge Base & Data Pipeline) is absent from the source
 * document — see docs/DEVIATIONS.md §2. These types define the authoring
 * contract it would have specified: every programme must carry provenance, a
 * localised explanation for every rule outcome, and a document checklist.
 *
 * A `[en, bn]` tuple is used throughout instead of `{en, bn}` purely to keep
 * 45+ records readable; `pair()` expands it.
 */

export type Bilingual = readonly [en: string, bn: string];

export function pair([en, bn]: Bilingual): LocalisedText {
  return { en, bn };
}

/* -------------------------------------------------------- rule builders */

let conditionCounter = 0;

/** A single condition. `met` / `failed` are the citizen-facing sentences. */
export function c(
  field: RuleField,
  operator: RuleOperator,
  value: RuleCondition['value'],
  met: Bilingual,
  failed: Bilingual,
  options: {
    readonly unknown?: Bilingual;
    readonly soft?: boolean;
    readonly weight?: number;
    readonly citation?: string;
  } = {},
): RuleCondition {
  conditionCounter += 1;
  return {
    kind: 'condition',
    id: `c${conditionCounter}`,
    field,
    operator,
    value,
    whenMet: pair(met),
    whenFailed: pair(failed),
    ...(options.unknown ? { whenUnknown: pair(options.unknown) } : {}),
    ...(options.soft ? { soft: true } : {}),
    ...(options.weight !== undefined ? { weight: options.weight } : {}),
    ...(options.citation ? { citation: options.citation } : {}),
  };
}

let groupCounter = 0;

function group(kind: RuleGroup['kind'], children: readonly RuleNode[], label?: Bilingual): RuleGroup {
  groupCounter += 1;
  return {
    kind,
    id: `g${groupCounter}`,
    children,
    ...(label ? { label: pair(label) } : {}),
  };
}

export const ALL = (...children: RuleNode[]): RuleGroup => group('all', children);
export const ANY = (...children: RuleNode[]): RuleGroup => group('any', children);
export const NONE = (...children: RuleNode[]): RuleGroup => group('none', children);

export function rules(required: readonly RuleField[], root: RuleNode, notes?: Bilingual): RuleSet {
  return {
    schemaVersion: 1,
    root,
    requiredFields: required,
    ...(notes ? { notes: pair(notes) } : {}),
  };
}

/* ------------------------------------------------- common rule fragments */

/** Bangladeshi citizenship — a precondition for nearly every state programme. */
export const isBangladeshi = () =>
  c(
    'citizenship',
    'eq',
    'bangladeshi',
    ['You are a Bangladeshi citizen.', 'আপনি বাংলাদেশের নাগরিক।'],
    ['This programme is only for Bangladeshi citizens.', 'এই কর্মসূচি শুধু বাংলাদেশের নাগরিকদের জন্য।'],
    { unknown: ['We need to confirm your citizenship.', 'আপনার নাগরিকত্ব নিশ্চিত করা দরকার।'] },
  );

export const hasNationalId = (soft = false) =>
  c(
    'hasNid',
    'eq',
    true,
    ['You have a National ID.', 'আপনার জাতীয় পরিচয়পত্র আছে।'],
    ['A National ID is required to apply.', 'আবেদন করতে জাতীয় পরিচয়পত্র লাগবে।'],
    {
      soft,
      unknown: ['Do you have a National ID card?', 'আপনার জাতীয় পরিচয়পত্র আছে কি?'],
    },
  );

/** Monthly income ceiling, phrased in the taka amounts a citizen recognises. */
export const monthlyIncomeBelow = (limit: number, weight = 2) =>
  c(
    'monthlyIncome',
    'lt',
    limit,
    [
      `Your monthly income is below ৳${limit.toLocaleString('en-IN')}.`,
      `আপনার মাসিক আয় ৳${limit.toLocaleString('en-IN')} এর কম।`,
    ],
    [
      `This programme is for monthly income under ৳${limit.toLocaleString('en-IN')}.`,
      `এই কর্মসূচি মাসিক আয় ৳${limit.toLocaleString('en-IN')} এর কম হলে প্রযোজ্য।`,
    ],
    {
      weight,
      unknown: ['What is your monthly household income?', 'আপনার পরিবারের মাসিক আয় কত?'],
    },
  );

export const ageAtLeast = (min: number, weight = 3) =>
  c(
    'age',
    'gte',
    min,
    [`You are ${min} or older.`, `আপনার বয়স ${min} বছর বা বেশি।`],
    [`This programme starts at age ${min}.`, `এই কর্মসূচির জন্য কমপক্ষে ${min} বছর বয়স হতে হবে।`],
    { weight, unknown: ['How old are you?', 'আপনার বয়স কত?'] },
  );

export const ageBetween = (min: number, max: number, weight = 3) =>
  c(
    'age',
    'between',
    [min, max],
    [`Your age is within the ${min}–${max} range.`, `আপনার বয়স ${min}–${max} বছরের মধ্যে।`],
    [`This programme is for ages ${min}–${max}.`, `এই কর্মসূচি ${min}–${max} বছর বয়সীদের জন্য।`],
    { weight, unknown: ['How old are you?', 'আপনার বয়স কত?'] },
  );

export const isFemale = (weight = 3) =>
  c(
    'gender',
    'eq',
    'female',
    ['This programme is for women, and you are a woman.', 'এই কর্মসূচি মহিলাদের জন্য, আপনি একজন মহিলা।'],
    ['This programme is only for women.', 'এই কর্মসূচি শুধু মহিলাদের জন্য।'],
    { weight, unknown: ['Are you a woman?', 'আপনি কি একজন মহিলা?'] },
  );

export const hasDisability = (weight = 3) =>
  c(
    'hasDisability',
    'eq',
    true,
    ['You have reported a disability.', 'আপনি প্রতিবন্ধিতার তথ্য দিয়েছেন।'],
    ['This programme is for persons with disabilities.', 'এই কর্মসূচি প্রতিবন্ধী ব্যক্তিদের জন্য।'],
    { weight, unknown: ['Do you have a disability?', 'আপনার কোনো প্রতিবন্ধিতা আছে কি?'] },
  );

export const landAtMost = (decimals: number, soft = false) =>
  c(
    'landOwnershipDecimals',
    'lte',
    decimals,
    [`You own ${decimals} decimals of land or less.`, `আপনার জমির পরিমাণ ${decimals} শতাংশ বা কম।`],
    [`This programme is for households owning ${decimals} decimals or less.`, `এই কর্মসূচি ${decimals} শতাংশ বা কম জমির মালিকদের জন্য।`],
    { soft, unknown: ['How much land does your household own (in decimals)?', 'আপনার পরিবারের কত শতাংশ জমি আছে?'] },
  );

export const inDistricts = (districts: readonly string[], names: Bilingual) =>
  c(
    'district',
    'in',
    districts,
    [`Your district is covered: ${names[0]}.`, `আপনার জেলা এই কর্মসূচির আওতায় আছে: ${names[1]}।`],
    [`This programme currently covers only: ${names[0]}.`, `এই কর্মসূচি এখন শুধু এই এলাকায়: ${names[1]}।`],
    { unknown: ['Which district do you live in?', 'আপনি কোন জেলায় থাকেন?'] },
  );

export const notGovernmentEmployee = () =>
  c(
    'occupation',
    'neq',
    'government_employee',
    ['You are not a serving government employee.', 'আপনি সরকারি কর্মচারী নন।'],
    ['Serving government employees are not eligible.', 'কর্মরত সরকারি কর্মচারীরা এই কর্মসূচির আওতায় নেই।'],
    { unknown: ['What is your occupation?', 'আপনার পেশা কী?'] },
  );

export const cgpaAtLeast = (min: number, weight = 3) =>
  c(
    'cgpa',
    'gte',
    min,
    [`Your CGPA meets the ${min} minimum.`, `আপনার সিজিপিএ ${min} এর শর্ত পূরণ করেছে।`],
    [`A CGPA of at least ${min} is required.`, `কমপক্ষে ${min} সিজিপিএ থাকতে হবে।`],
    { weight, unknown: ['What is your current CGPA?', 'আপনার বর্তমান সিজিপিএ কত?'] },
  );

export const educationAtLeast = (level: string, labels: Bilingual, weight = 2) =>
  c(
    'education',
    'gte',
    level,
    [`You have completed ${labels[0]}.`, `আপনি ${labels[1]} সম্পন্ন করেছেন।`],
    [`${labels[0]} is the minimum qualification.`, `কমপক্ষে ${labels[1]} পাস হতে হবে।`],
    { weight, unknown: ['What is your highest completed qualification?', 'আপনার সর্বোচ্চ শিক্ষাগত যোগ্যতা কী?'] },
  );

export const isStudent = (weight = 2) =>
  c(
    'isStudent',
    'eq',
    true,
    ['You are currently studying.', 'আপনি বর্তমানে পড়াশোনা করছেন।'],
    ['This programme is for enrolled students.', 'এই কর্মসূচি অধ্যয়নরত শিক্ষার্থীদের জন্য।'],
    { weight, unknown: ['Are you currently enrolled as a student?', 'আপনি কি বর্তমানে শিক্ষার্থী?'] },
  );

export const isFarmerLike = () =>
  c(
    'occupation',
    'in',
    ['farmer', 'fisherman', 'day_labourer'],
    ['Your occupation is covered by this programme.', 'আপনার পেশা এই কর্মসূচির আওতাভুক্ত।'],
    ['This programme is for farmers and agricultural workers.', 'এই কর্মসূচি কৃষক ও কৃষি শ্রমিকদের জন্য।'],
    { unknown: ['What is your occupation?', 'আপনার পেশা কী?'] },
  );

/* --------------------------------------------------------- seed records */

export interface SeedOrganization {
  readonly key: string;
  readonly name: Bilingual;
  readonly type: OrganizationType;
  readonly description: Bilingual;
  readonly website?: string;
  readonly contactPhone?: string;
  readonly address?: Bilingual;
  readonly division?: string;
  readonly district?: string;
  readonly officeHours?: Bilingual;
  readonly verified?: boolean;
  readonly verificationStatus?: VerificationStatus;
}

export interface SeedRequiredDocument {
  readonly name: Bilingual;
  readonly required?: boolean;
  readonly authority?: Bilingual;
  readonly mistake?: Bilingual;
  readonly tip?: Bilingual;
  readonly validityMonths?: number;
}

export interface SeedOpportunity {
  readonly slug: string;
  readonly org: string;
  readonly category: OpportunityCategory;
  readonly title: Bilingual;
  readonly summary: Bilingual;
  readonly description: Bilingual;
  readonly benefits: Bilingual;
  readonly benefitAmount?: number;
  readonly benefitPeriod?:
    | 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'per_course' | 'variable';
  readonly lifeEvents: readonly LifeEvent[];
  readonly tags: readonly string[];
  /** Empty = nationwide. */
  readonly coverage?: readonly string[];
  readonly sourceUrl?: string;
  readonly sourceNote?: Bilingual;
  /**
   * Result of a desk check of this record against public sources. It never
   * sets `verified`: that assertion belongs to an administrator comparing the
   * record with the official circular in the admin portal (which records who
   * verified and when). See src/lib/db/seed/VERIFICATION.md.
   */
  readonly sourceCheck?: {
    readonly status: 'pending_review' | 'disputed';
    readonly checkedOn: string;
    readonly sources: readonly string[];
  };
  readonly applyUrl?: string;
  readonly processingTime?: Bilingual;
  readonly renewalMonths?: number;
  readonly recurrence?: 'none' | 'annual' | 'biannual' | 'quarterly' | 'continuous';
  /** Days from seed time; omit for rolling programmes. */
  readonly deadlineInDays?: number;
  readonly steps: readonly Bilingual[];
  readonly docs: readonly SeedRequiredDocument[];
  readonly rules: RuleSet;
  readonly popularity?: number;
}

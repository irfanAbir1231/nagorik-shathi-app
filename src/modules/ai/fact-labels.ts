import type { LocalisedText } from '@/lib/domain/rules';
import { fieldLabel } from '@/modules/eligibility/engine';
import { districtLabel } from '@/lib/domain/geography';
import { formatMoney } from '@/lib/format/numerals';
import type { RuleField } from '@/lib/domain/rules';

/**
 * Citizen-facing names for facts, so the evidence panel reads "Marital status:
 * widowed" rather than `maritalStatus=widowed`. Values without a label fall
 * back to the raw value; nothing here changes what a fact means.
 */

const VALUE_LABELS: Record<string, Record<string, LocalisedText>> = {
  maritalStatus: {
    widowed: { en: 'widowed', bn: 'বিধবা/বিপত্নীক' },
    divorced: { en: 'divorced', bn: 'তালাকপ্রাপ্ত' },
    separated: { en: 'separated or deserted', bn: 'বিচ্ছিন্ন বা পরিত্যক্ত' },
    married: { en: 'married', bn: 'বিবাহিত' },
    single: { en: 'never married', bn: 'অবিবাহিত' },
  },
  gender: {
    female: { en: 'woman', bn: 'নারী' },
    male: { en: 'man', bn: 'পুরুষ' },
  },
  occupation: {
    student: { en: 'student', bn: 'শিক্ষার্থী' },
    farmer: { en: 'farmer', bn: 'কৃষক' },
    day_labourer: { en: 'day labourer', bn: 'দিনমজুর' },
    homemaker: { en: 'homemaker', bn: 'গৃহিণী' },
    private_employee: { en: 'private employee', bn: 'বেসরকারি চাকরিজীবী' },
    government_employee: { en: 'government employee', bn: 'সরকারি চাকরিজীবী' },
    self_employed: { en: 'self-employed', bn: 'স্বনিয়োজিত' },
    small_business: { en: 'small business owner', bn: 'ছোট ব্যবসায়ী' },
    fisherman: { en: 'fisher', bn: 'জেলে' },
    weaver: { en: 'weaver', bn: 'তাঁতি' },
    rickshaw_driver: { en: 'rickshaw driver', bn: 'রিকশাচালক' },
    garment_worker: { en: 'garment worker', bn: 'পোশাক শ্রমিক' },
    teacher: { en: 'teacher', bn: 'শিক্ষক' },
    unemployed: { en: 'without work', bn: 'বেকার' },
    retired: { en: 'retired', bn: 'অবসরপ্রাপ্ত' },
  },
  citizenship: {
    bangladeshi: { en: 'Bangladeshi', bn: 'বাংলাদেশি' },
  },
};

const YES: LocalisedText = { en: 'yes', bn: 'হ্যাঁ' };
const NO: LocalisedText = { en: 'no', bn: 'না' };

export function valueLabel(field: string, value: unknown): LocalisedText {
  if (typeof value === 'boolean') return value ? YES : NO;
  if (field === 'monthlyIncome' && typeof value === 'number') {
    const money = formatMoney(value);
    return { en: `${money} a month`, bn: `মাসে ${money}` };
  }
  if (field === 'district' && typeof value === 'string') {
    return { en: districtLabel(value, 'en'), bn: districtLabel(value, 'bn') };
  }
  if (field === 'landOwnershipDecimals' && typeof value === 'number') {
    return { en: `${value} decimals`, bn: `${value} শতাংশ` };
  }
  const known = VALUE_LABELS[field]?.[String(value)];
  if (known) return known;
  return { en: String(value), bn: String(value) };
}

/** "Marital status: widowed" / "বৈবাহিক অবস্থা: বিধবা/বিপত্নীক". */
export function factLabel(field: string, value: unknown): LocalisedText {
  let name: LocalisedText;
  try {
    name = fieldLabel(field as RuleField);
  } catch {
    name = { en: field, bn: field };
  }
  if (!name) name = { en: field, bn: field };
  const v = valueLabel(field, value);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return { en: `${cap(name.en)}: ${v.en}`, bn: `${name.bn}: ${v.bn}` };
}

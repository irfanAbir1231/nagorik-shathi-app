import type { EligibilityOutcome } from '@/lib/domain/enums';
import type { RuleCondition, RuleNode } from '@/lib/domain/rules';
import type { EligibilityProfile } from '@/modules/eligibility/engine';
import { SEED_OPPORTUNITIES } from '@/lib/db/seed';

export interface EligibilityCase {
  readonly id: string;
  readonly programmeSlug: string;
  readonly category: 'threshold_boundary' | 'hard_failure' | 'missing_fact';
  readonly profile: EligibilityProfile;
  readonly expected: EligibilityOutcome;
  readonly provenance: 'rule-contract-derived-synthetic';
}

export const ELIGIBILITY_PROGRAMMES = [
  'old-age-allowance',
  'widow-allowance',
  'disability-allowance',
  'maternity-allowance',
  'cancer-kidney-liver-assistance',
  'agricultural-rehabilitation-crop-loss',
  'government-legal-aid',
  'secondary-education-stipend',
  'pksf-microenterprise-loan',
  'bmet-overseas-employment-training',
] as const;

function satisfyingValue(condition: RuleCondition): unknown {
  const value = condition.value;
  switch (condition.operator) {
    case 'eq': return value;
    case 'neq': return typeof value === 'boolean' ? !value : '__different__';
    case 'gt': return Number(value) + 1;
    case 'gte': return Number(value);
    case 'lt': return Number(value) - 1;
    case 'lte': return Number(value);
    case 'between': return Array.isArray(value) ? value[0] : undefined;
    case 'in': return Array.isArray(value) ? value[0] : undefined;
    case 'not_in': return '__different__';
    case 'contains_any': return Array.isArray(value) ? [String(value[0])] : [];
    case 'contains_all': return Array.isArray(value) ? value.map(String) : [];
    case 'exists': return true;
    case 'not_exists': return undefined;
    default: return undefined;
  }
}

function makeSatisfying(node: RuleNode, profile: EligibilityProfile): void {
  if (node.kind === 'condition') {
    const value = satisfyingValue(node);
    if (value !== undefined) (profile as Record<string, unknown>)[node.field] = value;
    return;
  }
  if (node.kind === 'all') {
    node.children.forEach((child) => makeSatisfying(child, profile));
    return;
  }
  if (node.kind === 'any') {
    makeSatisfying(node.children[0]!, profile);
    return;
  }
  // `none` is not present in the selected benchmark programmes. Leaving its
  // children unknown makes the generated case fail closed if one is added.
}

function clone(profile: EligibilityProfile): EligibilityProfile {
  return JSON.parse(JSON.stringify(profile)) as EligibilityProfile;
}

export const ELIGIBILITY_CASES: readonly EligibilityCase[] = ELIGIBILITY_PROGRAMMES.flatMap((programmeSlug) => {
  const programme = SEED_OPPORTUNITIES.find((item) => item.slug === programmeSlug);
  if (!programme) throw new Error(`Missing benchmark programme: ${programmeSlug}`);
  const baseline: EligibilityProfile = {};
  makeSatisfying(programme.rules.root, baseline);

  const cases: EligibilityCase[] = [];
  for (let i = 0; i < 5; i += 1) {
    cases.push({
      id: `${programmeSlug}-boundary-${i + 1}`,
      programmeSlug,
      category: 'threshold_boundary',
      profile: { ...clone(baseline), householdSize: i + 1 },
      expected: 'eligible',
      provenance: 'rule-contract-derived-synthetic',
    });
  }
  for (let i = 0; i < 5; i += 1) {
    cases.push({
      id: `${programmeSlug}-hard-failure-${i + 1}`,
      programmeSlug,
      category: 'hard_failure',
      profile: { ...clone(baseline), citizenship: `not-bangladeshi-${i + 1}` },
      expected: 'not_eligible',
      provenance: 'rule-contract-derived-synthetic',
    });
  }
  for (let i = 0; i < 5; i += 1) {
    const profile = clone(baseline);
    delete profile.citizenship;
    profile.householdSize = i + 1;
    cases.push({
      id: `${programmeSlug}-unknown-citizenship-${i + 1}`,
      programmeSlug,
      category: 'missing_fact',
      profile,
      expected: 'unknown',
      provenance: 'rule-contract-derived-synthetic',
    });
  }
  for (let i = 0; i < 5; i += 1) {
    const profile = clone(baseline);
    const field = programme.rules.requiredFields[i % Math.max(1, programme.rules.requiredFields.length)] ?? 'citizenship';
    delete (profile as Record<string, unknown>)[field];
    cases.push({
      id: `${programmeSlug}-missing-required-${i + 1}`,
      programmeSlug,
      category: 'missing_fact',
      profile,
      expected: 'unknown',
      provenance: 'rule-contract-derived-synthetic',
    });
  }
  return cases;
});

if (ELIGIBILITY_CASES.length !== 200) {
  throw new Error(`Eligibility benchmark must contain 200 cases; found ${ELIGIBILITY_CASES.length}`);
}

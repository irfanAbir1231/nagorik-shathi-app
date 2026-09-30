import { describe, expect, it } from 'vitest';
import { SEED_OPPORTUNITIES } from '@/lib/db/seed';
import { evaluateEligibility, type EligibilityProfile } from '@/modules/eligibility/engine';

/**
 * Regression tests on REAL seeded rules for the explanation defects found in
 * the onboarding audit: reason lists used to contain every leaf of the rule
 * tree, including branches that decided nothing.
 */

const rules = (slug: string) => SEED_OPPORTUNITIES.find((o) => o.slug === slug)!.rules;
const reasons = (list: readonly { reason: { en: string } }[]) => list.map((c) => c.reason.en);
const citizen: EligibilityProfile = { citizenship: 'bangladeshi' };

describe('explanations cite only what decided the outcome', () => {
  it('does not tell an eligible man about the women\'s age branch', () => {
    const r = evaluateEligibility(rules('old-age-allowance'), {
      ...citizen, gender: 'male', age: 67, monthlyIncome: 800, occupation: 'farmer', landOwnershipDecimals: 20,
    });
    expect(r.outcome).toBe('eligible');
    expect(r.failed).toEqual([]);
    expect(reasons(r.matched)).not.toContain('You are 62 or older.');
  });

  it('asks only about what blocks a verdict, not about a losing branch', () => {
    const r = evaluateEligibility(rules('old-age-allowance'), { ...citizen, gender: 'female', age: 63, monthlyIncome: 800 });
    expect(r.outcome).toBe('unknown');
    expect(reasons(r.failed)).toEqual([]);
    expect(r.unknown.map((c) => c.field)).toEqual(['occupation']);
  });

  it('reports a `none` exclusion as the failure it is, with the author\'s reason', () => {
    const r = evaluateEligibility(rules('vgd-programme'), {
      ...citizen, gender: 'female', monthlyIncome: 1000, age: 30, district: 'dhaka', occupation: 'government_employee', landOwnershipDecimals: 5,
    });
    expect(r.outcome).toBe('not_eligible');
    expect(reasons(r.failed)).toEqual(['Households with a government salary are excluded.']);
    expect(reasons(r.matched)).not.toContain('—');
  });

  it('does not downgrade to partial because of a soft condition in a branch that did not decide', () => {
    const r = evaluateEligibility(rules('elderly-health-priority-services'), { ...citizen, age: 70, hasDisability: false });
    expect(r.outcome).toBe('eligible');
    expect(r.softFailed).toEqual([]);
  });

  it('still downgrades to partial when a soft condition in the deciding branch fails', () => {
    const r = evaluateEligibility(rules('old-age-allowance'), {
      ...citizen, gender: 'male', age: 67, monthlyIncome: 800, occupation: 'farmer', landOwnershipDecimals: 80,
    });
    expect(r.outcome).toBe('partially_eligible');
    expect(reasons(r.softFailed)).toEqual(['This programme is for households owning 50 decimals or less.']);
  });

  it('keeps the full tree for audit even though summaries are decisive-only', () => {
    const r = evaluateEligibility(rules('old-age-allowance'), { ...citizen, gender: 'male', age: 67, monthlyIncome: 800, occupation: 'farmer' });
    const leaves: string[] = [];
    const walk = (n: unknown) => {
      const node = n as { children?: unknown[]; id: string };
      if (node.children) node.children.forEach(walk);
      else leaves.push(node.id);
    };
    walk(r.trace);
    expect(leaves.length).toBeGreaterThan(r.matched.length + r.failed.length + r.unknown.length);
  });
});

import type { NextRequest } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { eligibilityRules, opportunities } from '@/lib/db/schema';
import { ok, readJson, handle, fail, ERROR_CODES } from '@/lib/http/response';
import { requireStaff } from '@/lib/http/session';
import { upsertRuleSchema } from '@/lib/validation/schemas';
import { validateRuleSet, collectFields, type RuleSet } from '@/lib/domain/rules';
import { evaluateEligibility } from '@/modules/eligibility/engine';
import { recordAudit } from '@/modules/admin/admin.service';
import { z } from 'zod';

/**
 * GET  /api/v1/admin/rules?opportunityId=… — version history
 * POST /api/v1/admin/rules — publish a new rule version
 *
 * Rules are NEVER edited in place. A new version is inserted and the previous
 * one deactivated, so a stored eligibility decision can always be replayed
 * against the exact rule that produced it (PRD §122).
 *
 * Before a rule can be saved it is (a) structurally validated, and (b) smoke
 * tested against synthetic profiles to catch the two mistakes that make a rule
 * useless in practice: one that nobody can ever satisfy, and one that everybody
 * satisfies.
 */

const querySchema = z.object({ opportunityId: z.string().uuid() });

export async function GET(request: NextRequest) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const url = new URL(request.url);
    const { opportunityId } = querySchema.parse({ opportunityId: url.searchParams.get('opportunityId') });

    const versions = await db
      .select()
      .from(eligibilityRules)
      .where(eq(eligibilityRules.opportunityId, opportunityId))
      .orderBy(desc(eligibilityRules.version));

    return ok({ versions });
  }, 'admin/rules:get');
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const body = upsertRuleSchema.parse(await readJson(request));

    const [opportunity] = await db
      .select({ id: opportunities.id, title: opportunities.title, verificationStatus: opportunities.verificationStatus })
      .from(opportunities)
      .where(eq(opportunities.id, body.opportunityId))
      .limit(1);
    if (!opportunity) return fail(ERROR_CODES.NOT_FOUND, 'That programme could not be found.');

    const validation = validateRuleSet(body.ruleJson);
    if (!validation.ok) {
      return fail(ERROR_CODES.VALIDATION_FAILED, 'This rule set has problems that must be fixed first.', {
        details: validation.errors,
      });
    }

    const smoke = smokeTest(validation.value);

    const [latest] = await db
      .select({ version: eligibilityRules.version })
      .from(eligibilityRules)
      .where(eq(eligibilityRules.opportunityId, body.opportunityId))
      .orderBy(desc(eligibilityRules.version))
      .limit(1);

    const nextVersion = (latest?.version ?? 0) + 1;

    if (body.active) {
      await db
        .update(eligibilityRules)
        .set({ active: false, updatedAt: new Date() })
        .where(and(eq(eligibilityRules.opportunityId, body.opportunityId), eq(eligibilityRules.active, true)));
    }

    const [created] = await db
      .insert(eligibilityRules)
      .values({
        opportunityId: body.opportunityId,
        ruleJson: validation.value,
        priority: body.priority,
        version: nextVersion,
        active: body.active,
        authoredBy: guard.session.userId,
        reviewedBy: null,
        reviewedAt: null,
      })
      .returning();

    // A verification covers the rules as much as the text: activating a new
    // rule version on a verified programme returns it to review, so a changed
    // rule can never inherit the uncapped confidence of a verified record.
    // (Previously any staff member could publish and activate a rule on a
    // verified programme with no review and no change of status.)
    const resetVerification = body.active && opportunity.verificationStatus === 'verified';
    if (resetVerification) {
      await db
        .update(opportunities)
        .set({ verificationStatus: 'pending_review', lastVerifiedAt: null, updatedAt: new Date() })
        .where(eq(opportunities.id, body.opportunityId));
    }

    await recordAudit({
      actorId: guard.session.userId,
      actorRole: guard.session.role,
      action: 'rule.publish',
      entityType: 'eligibility_rule',
      entityId: created!.id,
      after: { opportunityId: body.opportunityId, version: nextVersion, verificationReset: resetVerification },
    });

    return ok({ rule: created, smokeTest: smoke, version: nextVersion, verificationReset: resetVerification }, { status: 201 });
  }, 'admin/rules:post');
}

/**
 * Runs the rule against three synthetic profiles: empty, a broadly-eligible
 * "generous" profile, and a deliberately mismatched one. Reports warnings rather
 * than blocking, because an author may legitimately publish something narrow —
 * but they should know before citizens see it.
 */
function smokeTest(ruleSet: RuleSet) {
  const fields = [...collectFields(ruleSet.root)];

  const empty = evaluateEligibility(ruleSet, {});
  const generous = evaluateEligibility(ruleSet, {
    age: 40, gender: 'female', district: 'dhaka', division: 'dhaka',
    monthlyIncome: 500, annualIncome: 6000, occupation: 'day_labourer',
    education: 'ssc', cgpa: 4, hasDisability: true, disabilityType: 'physical',
    maritalStatus: 'widowed', householdSize: 5, dependents: 3,
    landOwnershipDecimals: 0, isStudent: true, hasBusiness: true, employees: 2,
    farmSizeDecimals: 10, crops: ['rice', 'jute', 'wheat'], livestock: ['cattle'],
    isPregnant: true, medicalConditions: ['cancer', 'kidney_failure'],
    citizenship: 'bangladeshi', hasNid: true, hasBankAccount: true,
    isFreedomFighterFamily: true, ieltsScore: 8,
    lifeEvents: ['widowhood', 'crop_loss', 'disaster_recovery', 'legal_dispute', 'entrepreneurship', 'higher_education', 'seeking_employment', 'migration', 'pregnancy', 'disability_onset', 'old_age', 'serious_medical_need', 'job_loss', 'child_education', 'divorce'],
  });
  const mismatched = evaluateEligibility(ruleSet, {
    age: 30, gender: 'male', district: 'sylhet', division: 'sylhet',
    monthlyIncome: 900_000, annualIncome: 10_800_000, occupation: 'government_employee',
    education: 'phd', cgpa: 2, hasDisability: false, maritalStatus: 'married',
    householdSize: 1, dependents: 0, landOwnershipDecimals: 5000, isStudent: false,
    hasBusiness: false, citizenship: 'other', hasNid: false, isPregnant: false,
    medicalConditions: [], crops: [], livestock: [], lifeEvents: [],
  });

  const warnings: string[] = [];
  if (generous.outcome !== 'eligible' && generous.outcome !== 'partially_eligible') {
    warnings.push(
      'A profile matching every common condition still does not qualify. Check for a condition that cannot be satisfied.',
    );
  }
  if (mismatched.outcome === 'eligible') {
    warnings.push('A deliberately mismatched profile qualifies. This rule may be too permissive to be meaningful.');
  }
  if (empty.outcome !== 'unknown' && ruleSet.requiredFields.length > 0) {
    warnings.push('An empty profile produces a verdict rather than "unknown". Check the required fields list.');
  }
  if (ruleSet.requiredFields.length === 0) {
    warnings.push('No required fields are declared, so this programme will never ask the citizen a question.');
  }
  const declared = new Set(ruleSet.requiredFields);
  const undeclared = fields.filter((f) => !declared.has(f));
  if (undeclared.length > 0) {
    warnings.push(`These fields are tested but not declared as required: ${undeclared.join(', ')}.`);
  }

  return {
    fieldsUsed: fields,
    outcomes: { emptyProfile: empty.outcome, generousProfile: generous.outcome, mismatchedProfile: mismatched.outcome },
    warnings,
  };
}

export const dynamic = 'force-dynamic';

import { SEED_OPPORTUNITIES } from '@/lib/db/seed';
import { evaluateEligibility as evalNew, type EligibilityProfile } from '@/modules/eligibility/engine';
import { evaluateEligibility as evalOld } from './engine-v1';
import { ELIGIBILITY_CASES } from '../../datasets/eligibility';
import { SEMANTIC_CASES } from '../../jev/cases';
const profiles: EligibilityProfile[] = [
  ...ELIGIBILITY_CASES.map((c) => c.profile),
  ...SEMANTIC_CASES.map((c) => ({ citizenship: 'bangladeshi', ...c.facts } as EligibilityProfile)),
];
// plus a systematic grid over the fields most rules read
for (const gender of ['female', 'male', undefined]) for (const age of [17, 30, 50, 63, 67, undefined]) for (const monthlyIncome of [0, 900, 1400, 2500, 8000, undefined])
  for (const hasDisability of [true, false, undefined]) for (const occupation of ['farmer', 'government_employee', 'homemaker', undefined])
    profiles.push(Object.fromEntries(Object.entries({ citizenship: 'bangladeshi', gender, age, monthlyIncome, annualIncome: monthlyIncome === undefined ? undefined : monthlyIncome * 12, hasDisability, occupation, landOwnershipDecimals: 20, maritalStatus: 'widowed' }).filter(([, v]) => v !== undefined)) as EligibilityProfile);
let total = 0, changed = 0; const byProg = new Map<string, Map<string, number>>();
for (const o of SEED_OPPORTUNITIES) for (const p of profiles) {
  total += 1;
  const a = evalOld(o.rules, p).outcome, b = evalNew(o.rules, p).outcome;
  if (a !== b) { changed += 1; const m = byProg.get(o.slug) ?? new Map(); m.set(`${a}→${b}`, (m.get(`${a}→${b}`) ?? 0) + 1); byProg.set(o.slug, m); }
}
console.log(`profiles=${profiles.length} evaluations=${total} outcome changes=${changed} (${(100 * changed / total).toFixed(2)}%)`);
for (const [slug, m] of byProg) console.log(' ', slug.padEnd(40), JSON.stringify(Object.fromEntries(m)));

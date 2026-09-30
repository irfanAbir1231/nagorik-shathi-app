/* One example profile per programme whose verdict moved between engine v1 and v2, for the sign-off record. */
import { SEED_OPPORTUNITIES } from '@/lib/db/seed';
import { evaluateEligibility as evalNew, type EligibilityProfile } from '@/modules/eligibility/engine';
import { evaluateEligibility as evalOld } from './engine-v1';
const seen = new Set<string>();
for (const gender of ['female', 'male']) for (const age of [14, 30, 70]) for (const monthlyIncome of [900, 15000, 40000])
  for (const hasDisability of [true, false]) for (const lifeEvents of [[], ['legal_dispute']]) for (const occupation of ['unemployed', 'farmer']) {
    const p = { citizenship: 'bangladeshi', gender, age, monthlyIncome, annualIncome: monthlyIncome * 12, hasDisability, lifeEvents, occupation } as EligibilityProfile;
    for (const o of SEED_OPPORTUNITIES) {
      if (seen.has(o.slug)) continue;
      const a = evalOld(o.rules, p), b = evalNew(o.rules, p);
      if (a.outcome === b.outcome) continue;
      seen.add(o.slug);
      console.log(`## ${o.slug}\nprofile: ${JSON.stringify(p)}\nv1: ${a.outcome} — soft failures: ${a.softFailed.map((c) => `${c.field} (${c.reason.en})`).join('; ')}\nv2: ${b.outcome} — decisive: ${b.matched.map((c) => c.reason.en).join(' | ')}\n`);
    }
  }

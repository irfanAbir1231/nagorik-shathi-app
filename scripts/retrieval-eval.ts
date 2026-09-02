/* eslint-disable no-console */
import './load-env';
import { retrieve, opportunityIdsFrom } from '../src/modules/knowledge/retrieval';
import { db } from '../src/lib/db/client';
import { opportunities } from '../src/lib/db/schema';

/**
 * Retrieval relevance harness.
 *
 * Why this exists: the project specified precision floors for models it has
 * not built yet while reporting no measurement at all for the retrieval that
 * IS built and IS answering citizens today. docs/TESTING.md names this gap
 * and defers it on the grounds that measuring relevance against
 * `unverified_sample` data "would measure the wrong thing".
 *
 * That objection is right about one thing and wrong about another. It is
 * right that this cannot tell you whether a programme's stated benefit is
 * factually correct — the corpus is unverified, so nothing here validates
 * content. It is wrong that the exercise is therefore worthless: whether a
 * Bangla sentence about widowhood retrieves the widow-allowance RECORD is a
 * question about matching, not about whether that record's contents are
 * accurate. Retrieval mechanics can be measured now; content accuracy cannot.
 * This measures only the former, and says so.
 *
 * Method and its limits:
 *   • Labels are author-created known-item judgements: for each query, which
 *     seeded programme(s) a caseworker would accept as a correct first
 *     answer. Several programmes can be acceptable for one query (three
 *     legal-aid programmes all answer "free legal help"), so a query counts
 *     as recalled if ANY acceptable target appears.
 *   • This measures the LEXICAL channel only unless an embedding key is
 *     configured. With no key the semantic channel returns nothing by design,
 *     so the numbers are BM25-only. Re-run with OPENAI_API_KEY set to find
 *     out whether hybrid fusion beats that baseline. The comparison is the
 *     point; the absolute number alone is not.
 *   • 20 queries is small. It is enough to locate a systematic failure mode.
 *     It is not enough to certify a retrieval path that looks healthy.
 *
 * Run: npx tsx scripts/retrieval-eval.ts
 */

interface LabelledQuery {
  readonly query: string;
  readonly language: 'bn' | 'en';
  /** Any one of these slugs counts as a correct answer. */
  readonly acceptable: readonly string[];
}

const QUERIES: readonly LabelledQuery[] = [
  { query: 'আমার স্বামী মারা গেছে, আমি কী সহায়তা পেতে পারি', language: 'bn', acceptable: ['widow-allowance'] },
  { query: 'I am a widow with three children and no income', language: 'en', acceptable: ['widow-allowance'] },
  { query: 'আমি একজন প্রতিবন্ধী ব্যক্তি', language: 'bn', acceptable: ['disability-allowance', 'disability-assistive-devices'] },
  { query: 'allowance for a person with disability', language: 'en', acceptable: ['disability-allowance', 'disability-assistive-devices', 'disabled-student-stipend'] },
  { query: 'আমার বয়স ৭০ বছর, আমি গরিব', language: 'bn', acceptable: ['old-age-allowance'] },
  { query: 'old age pension for elderly poor', language: 'en', acceptable: ['old-age-allowance', 'elderly-health-priority-services'] },
  { query: 'আমি গর্ভবতী এবং দরিদ্র', language: 'bn', acceptable: ['maternity-allowance', 'maternal-health-voucher'] },
  { query: 'help for pregnant mother', language: 'en', acceptable: ['maternity-allowance', 'maternal-health-voucher'] },
  { query: 'বন্যায় আমার ফসল নষ্ট হয়ে গেছে', language: 'bn', acceptable: ['agricultural-rehabilitation-crop-loss', 'disaster-gratuitous-relief'] },
  { query: 'my crops were destroyed by flooding', language: 'en', acceptable: ['agricultural-rehabilitation-crop-loss', 'disaster-gratuitous-relief'] },
  { query: 'ক্যান্সার চিকিৎসার জন্য আর্থিক সাহায্য', language: 'bn', acceptable: ['cancer-kidney-liver-assistance', 'nicrh-subsidised-cancer-treatment'] },
  { query: 'financial help for kidney dialysis', language: 'en', acceptable: ['kidney-foundation-dialysis', 'cancer-kidney-liver-assistance'] },
  { query: 'আমার বিনামূল্যে আইনি সহায়তা দরকার', language: 'bn', acceptable: ['government-legal-aid', 'blast-legal-aid', 'brac-legal-empowerment'] },
  { query: 'free legal aid for a poor person', language: 'en', acceptable: ['government-legal-aid', 'blast-legal-aid', 'brac-legal-empowerment'] },
  { query: 'মহিলাদের জন্য প্রশিক্ষণ', language: 'bn', acceptable: ['jms-women-skills-training', 'nsda-free-skills-training'] },
  { query: 'loan to start a small business', language: 'en', acceptable: ['pksf-microenterprise-loan', 'smef-credit-wholesale', 'youth-development-training-loan', 'bb-women-entrepreneur-refinance'] },
  { query: 'ছেলেমেয়ের পড়াশোনার জন্য বৃত্তি', language: 'bn', acceptable: ['secondary-education-stipend', 'pm-education-assistance-stipend'] },
  { query: 'training to work abroad', language: 'en', acceptable: ['bmet-overseas-employment-training'] },
  { query: 'মানসিক স্বাস্থ্য চিকিৎসা', language: 'bn', acceptable: ['nimh-mental-health-services'] },
  { query: 'subsidised rice for poor family', language: 'en', acceptable: ['food-friendly-programme', 'vgd-programme'] },
];

const K_VALUES = [1, 3, 5, 10] as const;

async function main() {
  const rows = await db.select({ id: opportunities.id, slug: opportunities.slug }).from(opportunities);
  const slugById = new Map(rows.map((r) => [r.id, r.slug]));

  const hitsAtK: Record<number, number> = { 1: 0, 3: 0, 5: 0, 10: 0 };
  const reciprocalRanks: number[] = [];
  const misses: LabelledQuery[] = [];
  let bnHits = 0;
  let enHits = 0;

  for (const item of QUERIES) {
    const chunks = await retrieve(item.query, { limit: 30, perOpportunityLimit: 1 });
    const rankedSlugs = opportunityIdsFrom(chunks)
      .map((id) => slugById.get(id))
      .filter((s): s is string => Boolean(s));

    const firstHitIndex = rankedSlugs.findIndex((slug) => item.acceptable.includes(slug));

    if (firstHitIndex === -1) {
      reciprocalRanks.push(0);
      misses.push(item);
    } else {
      reciprocalRanks.push(1 / (firstHitIndex + 1));
      for (const k of K_VALUES) {
        if (firstHitIndex < k) hitsAtK[k] = (hitsAtK[k] ?? 0) + 1;
      }
      if (firstHitIndex < 3) {
        if (item.language === 'bn') bnHits += 1;
        else enHits += 1;
      }
    }
  }

  const n = QUERIES.length;
  const bnTotal = QUERIES.filter((q) => q.language === 'bn').length;
  const enTotal = n - bnTotal;
  const mrr = reciprocalRanks.reduce((a, b) => a + b, 0) / n;

  console.log('');
  console.log(`Retrieval evaluation — ${n} labelled queries (${bnTotal} Bangla, ${enTotal} English)`);
  console.log('Channel: BM25 lexical only unless an embedding key is configured.');
  console.log('');
  for (const k of K_VALUES) {
    const hits = hitsAtK[k] ?? 0;
    const pct = ((hits / n) * 100).toFixed(1);
    console.log(`  Recall@${String(k).padEnd(2)}  ${String(hits).padStart(2)}/${n}   ${pct}%`);
  }
  console.log(`  MRR       ${mrr.toFixed(3)}`);
  console.log('');
  console.log(`  Recall@3 by language:  Bangla ${bnHits}/${bnTotal}   English ${enHits}/${enTotal}`);
  console.log('');
  if (misses.length) {
    console.log('Queries with no acceptable programme in the top 30:');
    for (const m of misses) console.log(`  • [${m.language}] ${m.query}`);
    console.log('');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

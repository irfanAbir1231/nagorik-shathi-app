import { describe, it, expect } from 'vitest';
import { extractEntities } from '@/modules/ai/nlu';

/**
 * Income extraction from free text — the highest-consequence number in the
 * system, and the one most often stated in words rather than digits.
 *
 * This suite exists because the NLU carried its OWN amount parser for a while,
 * separate from the tested one in `number-words`. It knew 17 Bangla words, no
 * fraction terms, and required the figure to follow the keyword. The result was
 * not a missing feature but WRONG ANSWERS: "সাড়ে চার হাজার" recorded as 4,000,
 * "আয় পাঁচ হাজার পাঁচশো" recorded as 5, and "মাসে ৪৫০০ টাকা আয়" recorded as
 * nothing at all.
 *
 * A recorded income of 5 instead of 5,500 qualifies a citizen for essentially
 * every means-tested programme in the corpus. A missing one leaves eligibility
 * `unknown` and asks them the same question again. Both fail silently, which is
 * why this is pinned rather than left to the parser's own unit tests.
 */

const income = (text: string) => extractEntities(text).profile.monthlyIncome ?? null;

describe('spoken and written amounts reach the profile', () => {
  const cases: [string, number][] = [
    ['আমার মাসিক আয় চার হাজার টাকা', 4000],
    ['আয় সাড়ে চার হাজার', 4500],
    ['আমার আয় দেড় হাজার টাকা', 1500],
    ['আয় আড়াই হাজার', 2500],
    ['আয় সোয়া দুই হাজার', 2250],
    ['আয় পাঁচ হাজার পাঁচশো টাকা', 5500],
    ['আমার ইনকাম ১২০০০ টাকা', 12_000],
    ['বেতন ৮ হাজার', 8000],
    ['income is four thousand five hundred taka', 4500],
    ['my salary is 15000', 15_000],
    ['amar income char hajar', 4000],
  ];

  for (const [text, expected] of cases) {
    it(`"${text}" → ${expected}`, () => {
      expect(income(text)).toBe(expected);
    });
  }

  it('reads a figure stated BEFORE the keyword', () => {
    // The old keyword-then-number pattern lost these entirely.
    expect(income('মাসে ৪৫০০ টাকা আয়')).toBe(4500);
    expect(income('৩ হাজার টাকা রোজগার করি')).toBe(3000);
  });

  it('converts a yearly figure to monthly, and keeps both', () => {
    const entities = extractEntities('বার্ষিক আয় ৬০ হাজার টাকা');
    expect(entities.profile.monthlyIncome).toBe(5000);
    expect(entities.profile.annualIncome).toBe(60_000);
  });

  it('does not mistake the number of children for the income', () => {
    // The sentence a widow actually says. Currency context decides.
    expect(income('আমার তিনটি সন্তান আছে, আয় চার হাজার টাকা')).toBe(4000);
  });
});

describe('it refuses to invent an income', () => {
  it('ignores a number with no income keyword anywhere', () => {
    // "5000 taka for medicine" is not an income, and recording it would corrupt
    // every future eligibility decision for this citizen.
    expect(income('ঔষধের জন্য ৫০০০ টাকা লাগবে')).toBeNull();
    expect(income('I need 5000 taka for medicine')).toBeNull();
  });

  it('ignores a sentence with an income keyword but no figure', () => {
    expect(income('আমার আয় খুব কম')).toBeNull();
    expect(income('I have no income')).toBeNull();
    expect(income('আমার বয়স ৫৮। আয় খুব কম।')).toBeNull();
  });

  it('rejects an implausible figure rather than storing it', () => {
    expect(income('আয় ৫০ কোটি টাকা')).toBeNull();
  });

  it('does not report the field as extracted when nothing was found', () => {
    // The "we saved this to your profile" confirmation reads this list, so a
    // phantom entry would tell the citizen something untrue.
    expect(extractEntities('আমার স্বামী মারা গেছেন').fields).not.toContain('monthlyIncome');
  });
});

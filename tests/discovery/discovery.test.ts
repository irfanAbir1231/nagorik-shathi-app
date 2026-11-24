import { describe, it, expect } from 'vitest';
import { htmlToText, pageTitle, extractLinks, toAsciiDigits, parseNumber, slugify, sentences } from '@/modules/discovery/text';
import { isAllowedUrl, isGovernmentHost, parseRobots, isPathAllowed } from '@/modules/discovery/policy';
import {
  extractFromPage, findBenefitAmount, findDeadline, guessCategory, guessLifeEvents, draftCompleteness,
} from '@/modules/discovery/extract';
import { programmeLinks, serviceNotices, pageContent, looksLikeService } from '@/modules/discovery/dss-adapter';
import { matchReason } from '@/modules/discovery/matching';
import { maskPhone, clientFromUserAgent, pageWindow } from '@/modules/admin/user-admin';

// Sentences as published on dss.gov.bd's old-age allowance page (2026-11-23).
const OLD_AGE_TEXT = [
  'কনটেন্টটি শেষ হাল-নাগাদ করা হয়েছে: মঙ্গলবার, ৩ নভেম্বর, ২০২৬ এ ০৬:৪৬ PM',
  'দেশের বয়োজ্যেষ্ঠ দুস্থ ও স্বল্প উপার্জনক্ষম অথবা উপার্জনে অক্ষম বয়স্ক জনগোষ্ঠীর সামাজিক নিরাপত্তা বিধানে ১৯৯৭-৯৮ অর্থ বছরে ‘বয়স্কভাতা’ কর্মসূচি প্রবর্তন করা হয়।',
  'প্রাথমিকভাবে প্রতিটি ওয়ার্ডে ১০ জন দরিদ্র বয়োজ্যেষ্ঠ ব্যক্তিকে প্রতিমাসে ১০০ টাকা হারে ভাতা প্রদানের আওতায় আনা হয়।',
  '২০২৬-২৭ অর্থবছরে উপকারভোগী ৬২ লক্ষ জন, জনপ্রতি মাসিক ভাতার হার ৭০০ টাকা এবং বাজেট ৫২৩৯.২৫ কোটি টাকা ।',
  '(৩) বয়স পুরুষের ক্ষেত্রে সর্বনিম্ন ৬৫ বছর এবং মহিলাদের ক্ষেত্রে সর্বনিম্ন ৬২ বছর হতে হবে;',
  '(৪) প্রার্থীর বার্ষিক গড় আয় অনূর্ধ ৪৫,০০০ (পঁয়তাল্লিশ হাজার) টাকা হতে হবে;',
  'জনপ্রতি মাসে ৭০০ টাকা হারে ভাতা প্রদান করা হয় (২০২৫-২৬)।',
].join('\n');

describe('text helpers', () => {
  it('converts Bangla digits and numbers', () => {
    expect(toAsciiDigits('২০২৬-২৭')).toBe('2026-27');
    expect(parseNumber('৪৫,০০০')).toBe(45000);
    expect(parseNumber('৫২৩৯.২৫')).toBe(5239.25);
    expect(parseNumber('abc')).toBeNull();
  });

  it('reads text without scripts, styles or forms', () => {
    const text = htmlToText('<p>এক</p><script>alert(1)</script><style>p{}</style><form><input value="x">ফরম</form><div>দুই&nbsp;&amp; তিন</div>');
    expect(text).toBe('এক\nদুই & তিন');
  });

  it('takes the page title before the portal suffix', () => {
    expect(pageTitle('<title>বিধবা ও স্বামী নিগৃহীতা ভাতা | পাতা | সমাজসেবা অধিদপ্তর</title>')).toBe('বিধবা ও স্বামী নিগৃহীতা ভাতা');
  });

  it('resolves links and skips mailto, javascript and anchors', () => {
    const links = extractLinks(
      '<a href="/pages/x">X</a><a href="#top">t</a><a href="mailto:a@b">m</a><a href="javascript:void(0)">j</a><a href="/pages/x">dup</a>',
      'https://dss.gov.bd/',
    );
    expect(links).toEqual([{ url: 'https://dss.gov.bd/pages/x', text: 'X' }]);
  });

  it('splits Bangla sentences on the dari', () => {
    expect(sentences('প্রথম বাক্য। দ্বিতীয় বাক্য।')).toEqual(['প্রথম বাক্য।', 'দ্বিতীয় বাক্য।']);
  });

  it('makes slugs, with a stable fallback for Bangla-only titles', () => {
    expect(slugify('Old Age Allowance', 'x')).toBe('old-age-allowance');
    expect(slugify('বয়স্ক ভাতা', 'seed')).toBe(slugify('বয়স্ক ভাতা', 'seed'));
    expect(slugify('বয়স্ক ভাতা', 'seed')).toMatch(/^programme-[a-z0-9]+$/);
  });
});

describe('fetch policy', () => {
  it('allows only HTTPS on allow-listed hosts and their subdomains', () => {
    expect(isAllowedUrl('https://dss.gov.bd/pages/notices', ['dss.gov.bd'])).toBe(true);
    expect(isAllowedUrl('https://www.dss.gov.bd/', ['dss.gov.bd'])).toBe(true);
    expect(isAllowedUrl('http://dss.gov.bd/', ['dss.gov.bd'])).toBe(false);
    expect(isAllowedUrl('https://dss.gov.bd.evil.com/', ['dss.gov.bd'])).toBe(false);
    expect(isAllowedUrl('https://evildss.gov.bd/', ['dss.gov.bd'])).toBe(false);
    expect(isAllowedUrl('https://user:pw@dss.gov.bd/', ['dss.gov.bd'])).toBe(false);
    expect(isAllowedUrl('not a url', ['dss.gov.bd'])).toBe(false);
  });

  it('accepts submitted links only from government domains', () => {
    expect(isGovernmentHost('https://dwa.gov.bd/x')).toBe(true);
    expect(isGovernmentHost('https://example.com/x')).toBe(false);
    expect(isGovernmentHost('https://gov.bd.example.com/')).toBe(false);
  });

  it('obeys robots.txt for the * group, longest rule winning', () => {
    const policy = parseRobots('User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n\nSitemap: https://x/wp-sitemap.xml');
    expect(isPathAllowed(policy, '/wp-admin/edit.php')).toBe(false);
    expect(isPathAllowed(policy, '/wp-admin/admin-ajax.php')).toBe(true);
    expect(isPathAllowed(policy, '/programmes/')).toBe(true);
    expect(policy.aiRestricted).toBe(false);
  });

  it('prefers a group naming our crawler over *', () => {
    const policy = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: ShebarJanalaBot\nAllow: /\nDisallow: /private');
    expect(isPathAllowed(policy, '/pages/notices')).toBe(true);
    expect(isPathAllowed(policy, '/private/x')).toBe(false);
  });

  it('marks sites that reserve content from AI as restricted (dghs.gov.bd style)', () => {
    const dghs = parseRobots([
      '# content signals …',
      'User-agent: *',
      'Content-Signal: search=yes,ai-train=no,use=reference',
      'Allow: /',
      'User-agent: ClaudeBot',
      'Disallow: /',
    ].join('\n'));
    expect(dghs.aiRestricted).toBe(true);
    expect(isPathAllowed(dghs, '/anything')).toBe(true);
    expect(parseRobots('User-agent: GPTBot\nDisallow: /').aiRestricted).toBe(true);
  });

  it('supports * and $ in rules', () => {
    const policy = parseRobots('User-agent: *\nDisallow: /*.pdf$\nDisallow: /search*q=');
    expect(isPathAllowed(policy, '/files/a.pdf')).toBe(false);
    expect(isPathAllowed(policy, '/files/a.pdf?x=1')).toBe(true);
    expect(isPathAllowed(policy, '/search?q=x')).toBe(false);
  });
});

describe('extraction', () => {
  it('finds the current monthly rate, not the 1997 rate or the budget', () => {
    const found = findBenefitAmount(OLD_AGE_TEXT);
    expect(found?.amount).toBe(700);
    expect(found?.period).toBe('monthly');
    expect(found?.sentence).toContain('২০২৬-২৭');
  });

  it('ignores budget figures in crore and lakh', () => {
    expect(findBenefitAmount('এ বছরের বাজেট ৫২৩৯.২৫ কোটি টাকা। উপকারভোগী ৬২ লক্ষ জন।')).toBeNull();
  });

  it('finds an application deadline and uses the end of a range', () => {
    const found = findDeadline('অনলাইনে আবেদন ১ আগস্ট থেকে ৩১ আগস্ট ২০২৬ পর্যন্ত গ্রহণ করা হবে।');
    expect(found?.date).toBe('2026-08-31');
    expect(findDeadline('প্রতিষ্ঠিত ১২ মার্চ ১৯৯৮।')).toBeNull();
  });

  it('guesses category and life events from the title', () => {
    expect(guessCategory('বয়স্ক ভাতা', '')?.category).toBe('social_welfare');
    expect(guessCategory('মাধ্যমিক উপবৃত্তি', '')?.category).toBe('scholarship');
    expect(guessLifeEvents('বিধবা ও স্বামী নিগৃহীতা ভাতা')).toEqual(['widowhood', 'divorce']);
    expect(guessLifeEvents('বয়স্ক ভাতা')).toEqual(['old_age']);
  });

  it('builds a Bangla draft with evidence, never inventing English', () => {
    const { draft, evidence } = extractFromPage({ url: 'https://dss.gov.bd/pages/static-pages/old-age', title: 'বয়স্ক ভাতা', text: OLD_AGE_TEXT });
    expect(draft.titleBn).toBe('বয়স্ক ভাতা');
    expect(draft.benefitAmount).toBe(700);
    expect(draft.benefitPeriod).toBe('monthly');
    expect(draft.category).toBe('social_welfare');
    expect(draft.lifeEvents).toEqual(['old_age']);
    expect(draft.summaryBn).not.toContain('হাল-নাগাদ');
    expect(draft.title).toBeUndefined();
    expect(draft.summary).toBeUndefined();
    expect(evidence.benefitAmount).toContain('৭০০ টাকা');
    expect(evidence._eligibility).toContain('সর্বনিম্ন ৬৫ বছর');
    expect(draftCompleteness(draft)).toBeGreaterThan(0);
    expect(draftCompleteness(draft)).toBeLessThan(1);
  });
});

describe('DSS portal adapter', () => {
  const base = 'https://dss.gov.bd/';

  it('keeps programme pages from the sitemap and drops offices and committees', () => {
    const sitemap = [
      '<a href="/pages/static-pages/old-age-allowance-46bea6">বয়স্ক ভাতা</a>',
      '<a href="/pages/static-pages/6922dc6f">প্রতিবন্ধী ভাতা</a>',
      '<a href="/pages/static-pages/6922e15c">প্রশাসন ও অর্থ অধিশাখা</a>',
      '<a href="/pages/static-pages/6922df92">উপজেলা সমাজসেবা অফিসার (বরিশাল বিভাগ)</a>',
      '<a href="/pages/static-pages/6922e0c8">পল্লী মাতৃকেন্দ্র কার্যক্রমের বরাদ্দ</a>',
      '<a href="/pages/static-pages/dup-second-menu">বয়স্ক ভাতা</a>',
      '<a href="/pages/static-pages/6922e0aa">তথ্য প্রাপ্তির আবেদনপত্র</a>',
      '<a href="/pages/notices">নোটিশ</a>',
    ].join('');
    expect(programmeLinks(sitemap, base).map((l) => l.text)).toEqual(['বয়স্ক ভাতা', 'প্রতিবন্ধী ভাতা']);
  });

  it('keeps service notices and drops staff orders', () => {
    const row = (title: string, slug: string) =>
      `<tr class="table-tr"><td class="table-td" data-column="id">১</td><!-- <td>${title}</td> -->` +
      `<td class="table-td" data-column="title"> ${title} </td>` +
      `<td class="table-td" data-column="files"><a href="https://objectstorage.example/x.pdf">pdf</a></td>` +
      `<td class="table-td" data-column="publish_date"> <span>২৩-১১-২০২৬</span> </td>` +
      `<td class="table-td"><a href="/pages/notices/${slug}">দেখুন</a></td></tr>`;
    const html = `<table>${row('৩ জন কর্মকর্তার বদলি আদেশ(১০৪৪)', 'a')}${row('বয়স্ক ভাতা অনলাইন আবেদন বিজ্ঞপ্তি', 'b')}</table>`;
    const notices = serviceNotices(html, base);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      title: 'বয়স্ক ভাতা অনলাইন আবেদন বিজ্ঞপ্তি',
      url: 'https://dss.gov.bd/pages/notices/b',
      fileUrl: 'https://objectstorage.example/x.pdf',
      published: '২৩-১১-২০২৬',
    });
  });

  it('reads only the content widget of a page', () => {
    const html =
      '<title>বয়স্ক ভাতা | পাতা | সমাজসেবা অধিদপ্তর</title><div class="slider">স্লাইডার খবর</div>' +
      '<div data-widget_type="widget" data-widget_name="ContentViewerWidget" class="widget"><div class="content-update-block"><p> কনটেন্টটি শেষ হাল-নাগাদ করা হয়েছে: মঙ্গলবার, ৩ নভেম্বর, ২০২৬</p></div>' +
      '<p>বয়স্ক ভাতা কর্মসূচি।</p><a href="https://mis.bhata.gov.bd/">অনলাইন আবেদন</a></div>' +
      '<div data-widget_name="FooterWidget">ফুটার</div>';
    const content = pageContent(html, 'https://dss.gov.bd/pages/static-pages/x');
    expect(content.title).toBe('বয়স্ক ভাতা');
    expect(content.text).toContain('বয়স্ক ভাতা কর্মসূচি।');
    expect(content.text).not.toContain('স্লাইডার');
    expect(content.text).not.toContain('ফুটার');
    expect(content.updatedLine).toContain('হাল-নাগাদ');
    expect(content.links).toEqual([{ url: 'https://mis.bhata.gov.bd/', text: 'অনলাইন আবেদন' }]);
  });

  it('recognises service titles', () => {
    expect(looksLikeService('ভিক্ষাবৃত্তিতে নিয়োজিত জনগোষ্ঠীর পুনর্বাসন ও বিকল্প কর্মসংস্থান')).toBe(true);
    expect(looksLikeService('২ জন সহকারী পরিচালক এর আয়ন-ব্যয়নসহ অতিরিক্ত দায়িত্ব প্রদান')).toBe(false);
  });
});

describe('who is notified about a new programme', () => {
  const base = { coverageDistricts: [] as string[], programmeLifeEvents: ['widowhood'], userLifeEvents: [] as string[] };

  it('with rules: only eligible or partially eligible people', () => {
    expect(matchReason({ ...base, hasRules: true, outcome: 'eligible' })).toBe('eligible');
    expect(matchReason({ ...base, hasRules: true, outcome: 'partially_eligible' })).toBe('eligible');
    expect(matchReason({ ...base, hasRules: true, outcome: 'unknown' })).toBeNull();
    expect(matchReason({ ...base, hasRules: true, outcome: 'not_eligible' })).toBeNull();
  });

  it('without rules: a shared life event, never "unknown"', () => {
    expect(matchReason({ ...base, hasRules: false, userLifeEvents: ['widowhood'] })).toBe('life_event');
    expect(matchReason({ ...base, hasRules: false, userLifeEvents: ['job_loss'] })).toBeNull();
    expect(matchReason({ ...base, hasRules: false, programmeLifeEvents: [], userLifeEvents: ['widowhood'] })).toBeNull();
  });

  it('only where the programme is offered', () => {
    const local = { ...base, coverageDistricts: ['dhaka'], hasRules: false, userLifeEvents: ['widowhood'] };
    expect(matchReason({ ...local, userDistrict: 'dhaka' })).toBe('life_event');
    expect(matchReason({ ...local, userDistrict: 'sylhet' })).toBeNull();
    expect(matchReason({ ...local, userDistrict: null })).toBeNull();
  });
});

describe('user admin helpers', () => {
  it('masks phone numbers', () => {
    expect(maskPhone('01712345678')).toBe('017•••••678');
    expect(maskPhone('123')).toBe('•••');
  });

  it('tells the app from the website', () => {
    expect(clientFromUserAgent('Dart/3.9 (dart:io)')).toBe('mobile');
    expect(clientFromUserAgent('Mozilla/5.0 (Linux; Android 14)')).toBe('web');
    expect(clientFromUserAgent(null)).toBe('unknown');
  });

  it('clamps paging', () => {
    expect(pageWindow(undefined, undefined)).toEqual({ page: 1, pageSize: 25, offset: 0 });
    expect(pageWindow(3, 1000)).toEqual({ page: 3, pageSize: 100, offset: 200 });
    expect(pageWindow(-2, 1)).toEqual({ page: 1, pageSize: 10, offset: 0 });
  });
});

describe('matching found pages to listed programmes', () => {
  // Imported lazily so this block reads on its own.
  const known = [
    { id: 'old-age', title: 'Old Age Allowance', titleBn: 'বয়স্ক ভাতা কর্মসূচি', sourceUrl: 'https://dss.gov.bd', officialUrl: null },
    { id: 'widow', title: 'Widow Allowance', titleBn: 'বিধবা ও স্বামী নিগৃহীতা ভাতা', sourceUrl: 'https://dss.gov.bd', officialUrl: null },
    { id: 'page', title: 'X', titleBn: 'অন্য কিছু', sourceUrl: null, officialUrl: 'https://www.dss.gov.bd/pages/static-pages/x/' },
  ];

  it('matches by URL, ignoring www and a trailing slash', async () => {
    const { findKnownProgramme } = await import('@/modules/discovery/dedupe');
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/pages/static-pages/x', titleBn: 'নতুন' }, known)?.id).toBe('page');
  });

  it('matches by Bangla title, ignoring the programme suffix and spacing', async () => {
    const { findKnownProgramme } = await import('@/modules/discovery/dedupe');
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/a', titleBn: 'বয়স্ক ভাতা' }, known)?.id).toBe('old-age');
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/b', titleBn: 'বিধবা ও স্বামী নিগৃহীতা ভাতা' }, known)?.id).toBe('widow');
  });

  it('does not match an unrelated or too-short title', async () => {
    const { findKnownProgramme } = await import('@/modules/discovery/dedupe');
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/c', titleBn: 'প্রতিবন্ধী ভাতা' }, known)).toBeNull();
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/d', titleBn: 'ভাতা' }, known)).toBeNull();
  });
});

describe('real-site quirks found on dss.gov.bd (2026-11-24)', () => {
  // "বয়স্ক" as the site writes it: য় as one code point, U+09DF.
  const precomposed = 'বয়স্ক ভাতা';
  // …and as the seed data writes it: য + nukta, U+09AF U+09BC.
  const decomposed = 'বয়স্ক ভাতা';

  it('matches a title whatever form the Bangla য় takes', async () => {
    const { findKnownProgramme } = await import('@/modules/discovery/dedupe');
    const known = [{ id: 'old-age', title: 'Old Age', titleBn: decomposed, sourceUrl: null, officialUrl: null }];
    expect(precomposed).not.toBe(decomposed as string);
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/x', titleBn: precomposed }, known)?.id).toBe('old-age');
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/x', titleBn: `${precomposed}‌` }, known)?.id).toBe('old-age');
  });

  it('reads life events from a precomposed title', () => {
    expect(guessLifeEvents(htmlToText(`<p>${precomposed}</p>`))).toEqual(['old_age']);
  });

  it('decodes base64 rich-text blocks and takes the content heading as the title', () => {
    const body = '<p>বিধবা ভাতা কর্মসূচি। জনপ্রতি মাসিক ৭০০ টাকা হারে ভাতা প্রদান করা হয়।</p><a href="https://dss.bhata.gov.bd/online-application">Online Application</a>';
    const encoded = Buffer.from(body, 'utf8').toString('base64');
    const html =
      '<title>পাতা | সমাজসেবা অধিদপ্তর</title>' +
      '<div data-widget_name="ContentViewerWidget" class="widget"><div class="content-update-block"><p>কনটেন্টটি শেষ হাল-নাগাদ করা হয়েছে</p></div>' +
      '<div class="widget title-with-image-content-widget"><h2> বিধবা ও স্বামী নিগৃহীতা ভাতা </h2><p class="chips"><span class="basic-chip">কন্টেন্ট: পাতা</span></p>' +
      `<rt-renderer encoded-content="${encoded}"></rt-renderer></div></div><div data-widget_name="FooterWidget">x</div>`;
    const content = pageContent(html, 'https://dss.gov.bd/pages/static-pages/widow');
    expect(content.title).toBe(htmlToText('বিধবা ও স্বামী নিগৃহীতা ভাতা'));
    expect(content.text).toContain('৭০০ টাকা');
    expect(content.text).not.toMatch(/কন্টেন্ট:/);
    expect(content.links.map((l) => l.url)).toContain('https://dss.bhata.gov.bd/online-application');
    expect(findBenefitAmount(content.text)?.amount).toBe(700);
  });
});

describe('benefit amount on the live widow allowance page', () => {
  // The page's own sentences (2026-11-24): the 1998 rate, the 2010 rate, the
  // current rate with its budget, and a far-future target year.
  const text = [
    'ঐ অর্থ বছরে ৪ লক্ষ ৩ হাজার ১১০ জনকে এককালীন মাসিক ১০০ টাকা হারে ভাতা প্রদান করা হয়।',
    'সে সময়ে ভাতাভোগীর সংখ্যা ছিল ৯.২০ লক্ষ জন এবং জনপ্রতি মাসিক ভাতার পরিমাণ ছিল ৩০০ টাকা।',
    'এ কর্মসূচির আওতায় ২০২৬-২৭ অর্থ বছরে ৩০ লক্ষ জনের জন্য জনপ্রতি মাসিক ৭০০ টাকা হারে মোট ২৫৩৫.১২ কোটি টাকা বরাদ্দ রাখা হয়েছে।',
    'রূপকল্প ২০৫০-৫১ অনুযায়ী সামাজিক সুরক্ষা জোরদার করা হবে।',
    'জনপ্রতি মাসিক ১০০ টাকা হারে বছরে ১ মাস পরীক্ষামূলক',
  ].join(String.fromCharCode(10));

  it('picks the current rate, not the history or a target year', () => {
    const found = findBenefitAmount(text);
    expect(found?.amount).toBe(700);
    expect(found?.sentence).toContain('২০২৬-২৭');
  });
});

describe('word-level title matching against the seed', () => {
  const seed = [
    { id: 'widow', title: 'Widow', titleBn: 'বিধবা ও স্বামী নিগৃহীতা মহিলা ভাতা', sourceUrl: 'https://dss.gov.bd', officialUrl: null },
    { id: 'stipend', title: 'Stipend', titleBn: 'প্রতিবন্ধী শিক্ষার্থী শিক্ষা উপবৃত্তি', sourceUrl: 'https://dss.gov.bd', officialUrl: null },
    { id: 'disability', title: 'Disability', titleBn: 'অসচ্ছল প্রতিবন্ধী ভাতা', sourceUrl: 'https://dss.gov.bd', officialUrl: null },
  ];

  it('matches titles that differ by a word or an ending (as found on dss.gov.bd)', async () => {
    const { findKnownProgramme } = await import('@/modules/discovery/dedupe');
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/a', titleBn: 'বিধবা ও স্বামী নিগৃহীতা ভাতা' }, seed)?.id).toBe('widow');
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/b', titleBn: 'প্রতিবন্ধী শিক্ষার্থীদের জন্য শিক্ষা উপবৃত্তি' }, seed)?.id).toBe('stipend');
  });

  it('does not match related but different programmes', async () => {
    const { findKnownProgramme } = await import('@/modules/discovery/dedupe');
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/c', titleBn: 'প্রতিবন্ধী ভাতা বরাদ্দ' }, seed)).toBeNull();
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/d', titleBn: 'দগ্ধ ও প্রতিবন্ধী পুনর্বাসন ও আশ্রয়ন' }, seed)).toBeNull();
    expect(findKnownProgramme({ url: 'https://dss.gov.bd/e', titleBn: 'শারীরিক প্রতিবন্ধীদের বৃত্তিমূলক প্রশিক্ষণ ও পুনর্বাসন কেন্দ্র' }, seed)).toBeNull();
  });
});

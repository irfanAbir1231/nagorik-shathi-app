import {
  type SeedOpportunity, c, ALL, ANY, NONE, rules,
  isBangladeshi, monthlyIncomeBelow, ageAtLeast, isFemale,
  hasDisability, landAtMost, notGovernmentEmployee, isStudent,
} from './helpers';

/**
 * Social protection and welfare programmes.
 *
 * Records are authored sample data (`unverified_sample`) unless they carry a
 * `sourceCheck`: five flagship allowances were desk-checked against public
 * FY2026-27 budget sources on 2026-09-30 and are `pending_review` (or
 * `disputed` where the sources conflict) — see ./VERIFICATION.md. Only their
 * AMOUNTS were checked; eligibility thresholds everywhere remain sample data,
 * and nothing here is `verified` until an administrator checks the official
 * circular. The UI marks all
 * of these with a visible "sample data" badge and the confidence scorer
 * penalises them — see docs/DEVIATIONS.md §2.
 */
export const SEED_WELFARE: readonly SeedOpportunity[] = [
  {
    slug: 'old-age-allowance',
    org: 'dss',
    category: 'social_welfare',
    title: ['Old Age Allowance', 'বয়স্ক ভাতা'],
    summary: [
      'A monthly cash allowance for elderly citizens with little or no income.',
      'আয় নেই বা খুব কম — এমন বয়স্ক নাগরিকদের জন্য মাসিক ভাতা।',
    ],
    description: [
      'The Old Age Allowance is Bangladesh\'s largest social safety-net programme. It pays a small monthly amount directly into the beneficiary\'s bank or mobile financial account. Selection happens at union or ward level, prioritising the poorest and oldest applicants. Being landless, widowed, or physically unable to work increases your priority within the queue.',
      'বয়স্ক ভাতা বাংলাদেশের সবচেয়ে বড় সামাজিক নিরাপত্তা কর্মসূচি। এটি সরাসরি সুবিধাভোগীর ব্যাংক হিসাব বা মোবাইল আর্থিক হিসাবে মাসিক অল্প পরিমাণ টাকা পাঠায়। ইউনিয়ন বা ওয়ার্ড পর্যায়ে বাছাই হয় এবং সবচেয়ে দরিদ্র ও বয়স্ক আবেদনকারীরা অগ্রাধিকার পান। ভূমিহীন, বিধবা বা শারীরিকভাবে কাজে অক্ষম হলে অগ্রাধিকার আরও বাড়ে।',
    ],
    benefits: [
      'A monthly allowance paid directly to your account, with no repayment and no service charge.',
      'সরাসরি আপনার হিসাবে মাসিক ভাতা — ফেরত দিতে হবে না, কোনো সার্ভিস চার্জ নেই।',
    ],
    benefitAmount: 700,
    benefitPeriod: 'monthly',
    sourceNote: [
      'FY2026-27: ৳700 a month (Budget speech, 11 June 2026; also reported as approved). ৳1,000 reported for citizens over 90. Not yet checked against the DSS circular.',
      '২০২৬-২৭ অর্থবছর: মাসে ৳৭০০ (বাজেট বক্তৃতা, ১১ জুন ২০২৬)। ৯০ বছরের বেশি বয়সীদের জন্য ৳১,০০০ বলে প্রতিবেদন। সমাজসেবা অধিদফতরের পরিপত্রের সঙ্গে এখনো মেলানো হয়নি।',
    ],
    sourceCheck: { status: 'pending_review', checkedOn: '2026-09-30', sources: ['https://www.bssnews.net/national-budget-2026-2027/394911', 'https://bdnews24.com/bangladesh/18677f7d11cc'] },
    lifeEvents: ['old_age'],
    tags: ['allowance', 'elderly', 'safety-net', 'monthly-cash'],
    sourceUrl: 'https://dss.gov.bd',
    processingTime: ['30–45 days after the selection committee meets', 'বাছাই কমিটির সভার পর ৩০–৪৫ দিন'],
    recurrence: 'continuous',
    popularity: 95,
    steps: [
      ['Collect the application form free of charge from your Union Parishad, or the ward councillor\'s office in a city corporation.', 'আপনার ইউনিয়ন পরিষদ অথবা সিটি কর্পোরেশনের ওয়ার্ড কাউন্সিলর অফিস থেকে বিনামূল্যে আবেদন ফরম সংগ্রহ করুন।'],
      ['Fill in the form and attach a photocopy of your National ID and a passport-size photograph.', 'ফরম পূরণ করে জাতীয় পরিচয়পত্রের ফটোকপি ও পাসপোর্ট সাইজের ছবি সংযুক্ত করুন।'],
      ['Submit it to the Union Social Services Officer or the Upazila Social Services Office.', 'ইউনিয়ন সমাজসেবা কর্মী বা উপজেলা সমাজসেবা অফিসে জমা দিন।'],
      ['Attend the ward selection committee meeting if you are called.', 'ডাকা হলে ওয়ার্ড বাছাই কমিটির সভায় উপস্থিত থাকুন।'],
      ['Once approved, open or link a bank or mobile financial account in your own name to receive payments.', 'অনুমোদন পেলে টাকা পেতে নিজের নামে ব্যাংক বা মোবাইল আর্থিক হিসাব খুলুন বা সংযুক্ত করুন।'],
    ],
    docs: [
      {
        name: ['National ID card (original and one photocopy)', 'জাতীয় পরিচয়পত্র (মূল কপি ও একটি ফটোকপি)'],
        authority: ['Election Commission', 'নির্বাচন কমিশন'],
        mistake: ['Applying with a smart card slip instead of the card itself — take the actual card or a clear photocopy of both sides.', 'কার্ডের বদলে স্মার্ট কার্ডের স্লিপ নিয়ে আবেদন করা — আসল কার্ড অথবা দুই পাশের স্পষ্ট ফটোকপি নিয়ে যান।'],
      },
      {
        name: ['Two passport-size photographs', 'দুই কপি পাসপোর্ট সাইজের ছবি'],
        tip: ['Photographs older than six months are often rejected. Get fresh ones.', 'ছয় মাসের বেশি পুরনো ছবি প্রায়ই বাতিল হয়। নতুন ছবি তুলে নিন।'],
      },
      {
        name: ['Bank account or mobile financial account number in your own name', 'নিজের নামে ব্যাংক হিসাব বা মোবাইল আর্থিক হিসাব নম্বর'],
        tip: ['An account in a son\'s or daughter\'s name cannot be used — the allowance must go to the beneficiary\'s own account.', 'ছেলে বা মেয়ের নামের হিসাব ব্যবহার করা যাবে না — ভাতা সুবিধাভোগীর নিজের হিসাবেই যেতে হবে।'],
      },
      {
        name: ['Certificate of income or landlessness from the Union Parishad chairman', 'ইউনিয়ন পরিষদ চেয়ারম্যানের কাছ থেকে আয় বা ভূমিহীনতার প্রত্যয়নপত্র'],
        authority: ['Union Parishad / Ward Councillor', 'ইউনিয়ন পরিষদ / ওয়ার্ড কাউন্সিলর'],
        required: false,
      },
    ],
    rules: rules(
      ['age', 'gender', 'monthlyIncome'],
      ALL(
        isBangladeshi(),
        // Different qualifying ages for men and women is the actual structure
        // of this programme, expressed as two alternative branches.
        ANY(
          ALL(
            c('gender', 'eq', 'male', ['You are a man aged 65 or above.', 'আপনি ৬৫ বছর বা তার বেশি বয়সী একজন পুরুষ।'], ['Men qualify from age 65.', 'পুরুষদের ক্ষেত্রে ৬৫ বছর থেকে প্রযোজ্য।']),
            ageAtLeast(65),
          ),
          ALL(
            c('gender', 'eq', 'female', ['You are a woman aged 62 or above.', 'আপনি ৬২ বছর বা তার বেশি বয়সী একজন মহিলা।'], ['Women qualify from age 62.', 'মহিলাদের ক্ষেত্রে ৬২ বছর থেকে প্রযোজ্য।']),
            ageAtLeast(62),
          ),
        ),
        monthlyIncomeBelow(1000, 3),
        notGovernmentEmployee(),
        landAtMost(50, true),
      ),
      [
        'Selection is competitive within each ward, so meeting every condition does not guarantee immediate enrolment.',
        'প্রতিটি ওয়ার্ডে বাছাই প্রতিযোগিতামূলক, তাই সব শর্ত পূরণ হলেই সঙ্গে সঙ্গে তালিকাভুক্তি নিশ্চিত নয়।',
      ],
    ),
  },

  {
    slug: 'widow-allowance',
    org: 'dss',
    category: 'social_welfare',
    title: ['Widow and Husband-Deserted Women Allowance', 'বিধবা ও স্বামী নিগৃহীতা মহিলা ভাতা'],
    summary: [
      'A monthly allowance for widowed, divorced, separated, or deserted women with little income.',
      'বিধবা, তালাকপ্রাপ্ত, বিচ্ছিন্ন বা স্বামী পরিত্যক্তা — অল্প আয়ের মহিলাদের জন্য মাসিক ভাতা।',
    ],
    description: [
      'This allowance supports women who have lost the financial support of a husband, whether through death, divorce, or desertion. Priority goes to women who are older, have dependent children, own no land, and have no other earning member in the household. You do not need to prove destitution in court — a certificate from the Union Parishad chairman is sufficient.',
      'এই ভাতা সেই মহিলাদের সহায়তা করে যাঁরা স্বামীর মৃত্যু, তালাক বা পরিত্যাগের কারণে আর্থিক সহায়তা হারিয়েছেন। যাঁদের বয়স বেশি, নির্ভরশীল সন্তান আছে, জমি নেই এবং পরিবারে অন্য উপার্জনকারী নেই — তাঁরা অগ্রাধিকার পান। আদালতে নিঃস্বতা প্রমাণ করতে হয় না — ইউনিয়ন পরিষদ চেয়ারম্যানের প্রত্যয়নপত্রই যথেষ্ট।',
    ],
    benefits: [
      'A monthly cash allowance paid to your own account, alongside priority access to VGD food support and skills training.',
      'নিজের হিসাবে মাসিক ভাতা, সঙ্গে ভিজিডি খাদ্য সহায়তা ও দক্ষতা প্রশিক্ষণে অগ্রাধিকার।',
    ],
    benefitAmount: 700,
    benefitPeriod: 'monthly',
    sourceNote: [
      'FY2026-27: ৳700 a month, up from ৳650 (Budget speech, 11 June 2026; also reported as approved). Not yet checked against the DSS circular.',
      '২০২৬-২৭ অর্থবছর: মাসে ৳৭০০, আগে ছিল ৳৬৫০ (বাজেট বক্তৃতা, ১১ জুন ২০২৬)। সমাজসেবা অধিদফতরের পরিপত্রের সঙ্গে এখনো মেলানো হয়নি।',
    ],
    sourceCheck: { status: 'pending_review', checkedOn: '2026-09-30', sources: ['https://www.bssnews.net/national-budget-2026-2027/394911', 'https://bdnews24.com/bangladesh/18677f7d11cc'] },
    lifeEvents: ['widowhood', 'divorce'],
    tags: ['allowance', 'women', 'widow', 'safety-net'],
    sourceUrl: 'https://dss.gov.bd',
    processingTime: ['7–14 days for verification, then the next selection cycle', 'যাচাইয়ে ৭–১৪ দিন, এরপর পরবর্তী বাছাই চক্র'],
    recurrence: 'continuous',
    popularity: 88,
    steps: [
      ['Get a certificate from your Union Parishad chairman or ward councillor confirming your status and income.', 'আপনার অবস্থা ও আয় নিশ্চিত করে ইউনিয়ন পরিষদ চেয়ারম্যান বা ওয়ার্ড কাউন্সিলরের প্রত্যয়নপত্র নিন।'],
      ['Collect and fill in the free application form at the Union Social Services office.', 'ইউনিয়ন সমাজসেবা অফিস থেকে বিনামূল্যে আবেদন ফরম নিয়ে পূরণ করুন।'],
      ['Attach your National ID, your husband\'s death certificate (if widowed), and two photographs.', 'জাতীয় পরিচয়পত্র, স্বামীর মৃত্যু সনদ (বিধবা হলে) এবং দুই কপি ছবি সংযুক্ত করুন।'],
      ['Submit to the Upazila Social Services Office and keep the receipt.', 'উপজেলা সমাজসেবা অফিসে জমা দিয়ে রসিদ সংগ্রহে রাখুন।'],
    ],
    docs: [
      { name: ['National ID card', 'জাতীয় পরিচয়পত্র'], authority: ['Election Commission', 'নির্বাচন কমিশন'] },
      {
        name: ['Husband\'s death certificate', 'স্বামীর মৃত্যু সনদ'],
        authority: ['Union Parishad / City Corporation', 'ইউনিয়ন পরিষদ / সিটি কর্পোরেশন'],
        required: false,
        tip: ['Only needed if you are widowed. If you were deserted or divorced, the chairman\'s certificate replaces this.', 'শুধু বিধবা হলে প্রয়োজন। পরিত্যক্তা বা তালাকপ্রাপ্তা হলে চেয়ারম্যানের প্রত্যয়নপত্রই যথেষ্ট।'],
      },
      { name: ['Two passport-size photographs', 'দুই কপি পাসপোর্ট সাইজের ছবি'] },
      { name: ['Bank or mobile financial account number in your own name', 'নিজের নামে ব্যাংক বা মোবাইল আর্থিক হিসাব নম্বর'] },
      {
        name: ['Certificate of status and income from the Union Parishad chairman', 'ইউনিয়ন পরিষদ চেয়ারম্যানের প্রত্যয়নপত্র (অবস্থা ও আয়)'],
        authority: ['Union Parishad / Ward Councillor', 'ইউনিয়ন পরিষদ / ওয়ার্ড কাউন্সিলর'],
      },
    ],
    rules: rules(
      ['gender', 'maritalStatus', 'monthlyIncome'],
      ALL(
        isBangladeshi(),
        isFemale(),
        c(
          'maritalStatus',
          'in',
          ['widowed', 'divorced', 'separated'],
          ['Your marital status qualifies for this allowance.', 'আপনার বৈবাহিক অবস্থা এই ভাতার শর্ত পূরণ করে।'],
          ['This allowance is for widowed, divorced, separated, or deserted women.', 'এই ভাতা বিধবা, তালাকপ্রাপ্তা, বিচ্ছিন্না বা স্বামী পরিত্যক্তা মহিলাদের জন্য।'],
          { weight: 3, unknown: ['What is your current marital status?', 'আপনার বর্তমান বৈবাহিক অবস্থা কী?'] },
        ),
        monthlyIncomeBelow(1500, 3),
        ageAtLeast(18, 1),
        notGovernmentEmployee(),
      ),
    ),
  },

  {
    slug: 'disability-allowance',
    org: 'dss',
    category: 'social_welfare',
    title: ['Allowance for Financially Insolvent Persons with Disabilities', 'অসচ্ছল প্রতিবন্ধী ভাতা'],
    summary: [
      'A monthly allowance for persons with disabilities who have limited income. There is no minimum age.',
      'সীমিত আয়ের প্রতিবন্ধী ব্যক্তিদের জন্য মাসিক ভাতা। ন্যূনতম বয়সের শর্ত নেই।',
    ],
    description: [
      'This allowance is available at any age, including for children, and is paid to a guardian when the beneficiary is a minor. You must hold a Suborno Nagorik (Golden Citizen) card, which is issued after an assessment at the Upazila Social Services Office and records your disability type and severity. Applying for the card and the allowance can be done in the same visit.',
      'এই ভাতা যেকোনো বয়সে পাওয়া যায় — শিশুরাও পায়, এবং সুবিধাভোগী অপ্রাপ্তবয়স্ক হলে অভিভাবককে দেওয়া হয়। আপনার সুবর্ণ নাগরিক কার্ড থাকতে হবে, যা উপজেলা সমাজসেবা অফিসে পরীক্ষার পর দেওয়া হয় এবং তাতে প্রতিবন্ধিতার ধরন ও মাত্রা লেখা থাকে। কার্ড ও ভাতার আবেদন একই দিনে করা যায়।',
    ],
    benefits: [
      'A monthly allowance with no repayment, plus a Suborno Nagorik card that unlocks transport concessions and priority health services.',
      'ফেরতযোগ্য নয় এমন মাসিক ভাতা, সঙ্গে সুবর্ণ নাগরিক কার্ড — যা পরিবহন ছাড় ও স্বাস্থ্যসেবায় অগ্রাধিকার দেয়।',
    ],
    benefitAmount: 900,
    benefitPeriod: 'monthly',
    sourceNote: [
      'Sources conflict for FY2026-27: the budget speech (11 June 2026) proposes ৳1,000 a month; a report updated August 2026 says most recipients still receive ৳900. Recorded at ৳900 until an administrator checks the DSS circular.',
      '২০২৬-২৭ অর্থবছরের জন্য তথ্যসূত্রে গরমিল: বাজেট বক্তৃতায় (১১ জুন ২০২৬) মাসে ৳১,০০০ প্রস্তাব; আগস্ট ২০২৬-এর প্রতিবেদনে বেশিরভাগ ভাতাভোগী এখনো ৳৯০০ পান। সমাজসেবা অধিদফতরের পরিপত্র না দেখা পর্যন্ত ৳৯০০ রাখা হয়েছে।',
    ],
    sourceCheck: { status: 'disputed', checkedOn: '2026-09-30', sources: ['https://www.bssnews.net/national-budget-2026-2027/394911', 'https://bdnews24.com/bangladesh/18677f7d11cc', 'https://en.prothomalo.com/bangladesh/local-news/n02hkynwt2'] },
    lifeEvents: ['disability_onset'],
    tags: ['allowance', 'disability', 'suborno-nagorik', 'safety-net'],
    sourceUrl: 'https://dss.gov.bd',
    processingTime: ['21–40 days including the disability assessment', 'প্রতিবন্ধিতা নিরূপণসহ ২১–৪০ দিন'],
    recurrence: 'continuous',
    popularity: 82,
    steps: [
      ['Visit the Upazila Social Services Office for a disability assessment and Suborno Nagorik card registration.', 'প্রতিবন্ধিতা নিরূপণ ও সুবর্ণ নাগরিক কার্ড নিবন্ধনের জন্য উপজেলা সমাজসেবা অফিসে যান।'],
      ['Bring a medical certificate describing the disability from a registered doctor.', 'নিবন্ধিত চিকিৎসকের কাছ থেকে প্রতিবন্ধিতার বিবরণসহ মেডিকেল সনদ আনুন।'],
      ['Complete the allowance application form in the same visit.', 'একই দিনে ভাতার আবেদন ফরমও পূরণ করুন।'],
      ['Provide a bank or mobile account in the beneficiary\'s name, or the guardian\'s name for a child.', 'সুবিধাভোগীর নামে ব্যাংক বা মোবাইল হিসাব দিন; শিশু হলে অভিভাবকের নামে।'],
    ],
    docs: [
      { name: ['Suborno Nagorik (Golden Citizen) card or registration slip', 'সুবর্ণ নাগরিক কার্ড বা নিবন্ধন স্লিপ'], authority: ['Department of Social Services', 'সমাজসেবা অধিদফতর'] },
      { name: ['Medical certificate of disability', 'প্রতিবন্ধিতার মেডিকেল সনদ'], authority: ['Registered physician / Upazila Health Complex', 'নিবন্ধিত চিকিৎসক / উপজেলা স্বাস্থ্য কমপ্লেক্স'] },
      { name: ['National ID (or birth registration certificate for a child)', 'জাতীয় পরিচয়পত্র (শিশুর ক্ষেত্রে জন্ম নিবন্ধন সনদ)'] },
      { name: ['Two passport-size photographs', 'দুই কপি পাসপোর্ট সাইজের ছবি'] },
      { name: ['Bank or mobile financial account details', 'ব্যাংক বা মোবাইল আর্থিক হিসাবের তথ্য'] },
    ],
    rules: rules(
      ['hasDisability', 'monthlyIncome'],
      ALL(isBangladeshi(), hasDisability(), monthlyIncomeBelow(3000, 2)),
      [
        'There is no minimum age. For beneficiaries under 18 the allowance is paid to a registered guardian.',
        'ন্যূনতম বয়সের শর্ত নেই। ১৮ বছরের কম বয়সীদের ক্ষেত্রে ভাতা নিবন্ধিত অভিভাবককে দেওয়া হয়।',
      ],
    ),
  },

  {
    slug: 'disabled-student-stipend',
    org: 'dss',
    category: 'social_welfare',
    title: ['Education Stipend for Students with Disabilities', 'প্রতিবন্ধী শিক্ষার্থী শিক্ষা উপবৃত্তি'],
    summary: [
      'A monthly education stipend for students with disabilities, from primary through higher education.',
      'প্রাথমিক থেকে উচ্চশিক্ষা পর্যন্ত প্রতিবন্ধী শিক্ষার্থীদের জন্য মাসিক শিক্ষা উপবৃত্তি।',
    ],
    description: [
      'This stipend rises with education level, so a university student receives considerably more than a primary school pupil. It can be received at the same time as the Disability Allowance, and receiving one does not disqualify you from the other. The stipend is paid while you remain enrolled, so a certificate from your institution is required each year.',
      'এই উপবৃত্তি শিক্ষাস্তরের সঙ্গে বাড়ে, তাই বিশ্ববিদ্যালয়ের শিক্ষার্থী প্রাথমিকের শিক্ষার্থীর চেয়ে অনেক বেশি পান। প্রতিবন্ধী ভাতার সঙ্গে একই সময়ে এটি পাওয়া যায় — একটি পেলে অন্যটির অযোগ্য হন না। অধ্যয়নরত থাকা অবস্থায় উপবৃত্তি চলে, তাই প্রতি বছর প্রতিষ্ঠানের প্রত্যয়নপত্র লাগে।',
    ],
    benefits: [
      'A monthly stipend that increases by education level, payable alongside the Disability Allowance.',
      'শিক্ষাস্তর অনুযায়ী বাড়তে থাকা মাসিক উপবৃত্তি, প্রতিবন্ধী ভাতার সঙ্গে একসঙ্গে পাওয়া যায়।',
    ],
    benefitAmount: 900,
    benefitPeriod: 'monthly',
    lifeEvents: ['disability_onset', 'child_education', 'higher_education'],
    tags: ['stipend', 'disability', 'education'],
    sourceUrl: 'https://dss.gov.bd',
    processingTime: ['30 days', '৩০ দিন'],
    recurrence: 'annual',
    deadlineInDays: 74,
    popularity: 61,
    steps: [
      ['Obtain a studentship certificate from your school, college, or university.', 'আপনার স্কুল, কলেজ বা বিশ্ববিদ্যালয় থেকে অধ্যয়নরত প্রত্যয়নপত্র নিন।'],
      ['Attach your Suborno Nagorik card and last examination result.', 'সুবর্ণ নাগরিক কার্ড ও সর্বশেষ পরীক্ষার ফলাফল সংযুক্ত করুন।'],
      ['Submit the application through your institution head to the Upazila Social Services Office.', 'প্রতিষ্ঠান প্রধানের মাধ্যমে উপজেলা সমাজসেবা অফিসে আবেদন জমা দিন।'],
    ],
    docs: [
      { name: ['Studentship certificate from the institution', 'প্রতিষ্ঠানের অধ্যয়নরত প্রত্যয়নপত্র'], authority: ['School / College / University', 'স্কুল / কলেজ / বিশ্ববিদ্যালয়'], validityMonths: 12 },
      { name: ['Suborno Nagorik card', 'সুবর্ণ নাগরিক কার্ড'], authority: ['Department of Social Services', 'সমাজসেবা অধিদফতর'] },
      { name: ['Most recent examination result or transcript', 'সর্বশেষ পরীক্ষার ফলাফল বা ট্রান্সক্রিপ্ট'] },
      { name: ['Bank or mobile financial account details', 'ব্যাংক বা মোবাইল আর্থিক হিসাবের তথ্য'] },
    ],
    rules: rules(
      ['hasDisability', 'isStudent'],
      ALL(isBangladeshi(), hasDisability(), isStudent(3)),
    ),
  },

  {
    slug: 'maternity-allowance',
    org: 'dwa',
    category: 'social_welfare',
    title: ['Maternity Allowance for Poor Mothers', 'দরিদ্র মা\'র জন্য মাতৃত্বকাল ভাতা'],
    summary: [
      'A monthly allowance for 36 months for poor pregnant women, for a first or second child.',
      'দরিদ্র গর্ভবতী মহিলাদের প্রথম বা দ্বিতীয় সন্তানের জন্য ৩৬ মাস ধরে মাসিক ভাতা।',
    ],
    description: [
      'The allowance runs for three years from enrolment and is intended to cover nutrition during pregnancy and the child\'s early years. It is limited to the first two live births. Enrolment is easiest during the first six months of pregnancy, and you will also be enrolled in nutrition and child-care awareness sessions at your local Union Parishad.',
      'তালিকাভুক্তির পর তিন বছর ধরে এই ভাতা চলে এবং এর উদ্দেশ্য গর্ভাবস্থা ও শিশুর প্রাথমিক বছরগুলোর পুষ্টি নিশ্চিত করা। এটি প্রথম দুই জীবিত সন্তানের ক্ষেত্রেই প্রযোজ্য। গর্ভাবস্থার প্রথম ছয় মাসের মধ্যে তালিকাভুক্তি সহজ হয় এবং স্থানীয় ইউনিয়ন পরিষদে পুষ্টি ও শিশু পরিচর্যা সচেতনতা সেশনেও অংশ নিতে হয়।',
    ],
    benefits: [
      'A monthly allowance for 36 months, plus free nutrition counselling and child-health awareness sessions.',
      '৩৬ মাস ধরে মাসিক ভাতা, সঙ্গে বিনামূল্যে পুষ্টি পরামর্শ ও শিশুস্বাস্থ্য সচেতনতা সেশন।',
    ],
    benefitAmount: 850,
    benefitPeriod: 'monthly',
    sourceNote: [
      'Reported as the Mother and Child Benefit Programme at ৳850 a month (FY2025-26 onward; FY2026-27 budget speech). The programme name and conditions here have not been checked against the current DWA guidelines.',
      'মা ও শিশু সহায়তা কর্মসূচি হিসেবে মাসে ৳৮৫০ (২০২৫-২৬ থেকে; ২০২৬-২৭ বাজেট বক্তৃতা)। কর্মসূচির নাম ও শর্ত মহিলা বিষয়ক অধিদপ্তরের বর্তমান নির্দেশিকার সঙ্গে মেলানো হয়নি।',
    ],
    sourceCheck: { status: 'pending_review', checkedOn: '2026-09-30', sources: ['https://www.bssnews.net/national-budget-2026-2027/394911', 'https://bdnews24.com/bangladesh/18677f7d11cc', 'https://en.prothomalo.com/bangladesh/local-news/n02hkynwt2'] },
    lifeEvents: ['pregnancy'],
    tags: ['allowance', 'women', 'maternal-health', 'nutrition'],
    sourceUrl: 'https://dwa.gov.bd',
    processingTime: ['15–30 days', '১৫–৩০ দিন'],
    recurrence: 'continuous',
    popularity: 76,
    steps: [
      ['Register your pregnancy at the nearest community clinic or Union Health and Family Welfare Centre.', 'নিকটস্থ কমিউনিটি ক্লিনিক বা ইউনিয়ন স্বাস্থ্য ও পরিবার কল্যাণ কেন্দ্রে গর্ভধারণ নিবন্ধন করুন।'],
      ['Collect the maternity allowance form from the Union Parishad women\'s affairs desk.', 'ইউনিয়ন পরিষদের মহিলা বিষয়ক ডেস্ক থেকে মাতৃত্বকাল ভাতার ফরম নিন।'],
      ['Attach the pregnancy registration card, your National ID, and an income certificate.', 'গর্ভধারণ নিবন্ধন কার্ড, জাতীয় পরিচয়পত্র ও আয়ের প্রত্যয়নপত্র সংযুক্ত করুন।'],
      ['Submit to the Upazila Women Affairs Officer.', 'উপজেলা মহিলা বিষয়ক কর্মকর্তার কাছে জমা দিন।'],
    ],
    docs: [
      { name: ['Pregnancy registration card', 'গর্ভধারণ নিবন্ধন কার্ড'], authority: ['Community Clinic / Union Health Centre', 'কমিউনিটি ক্লিনিক / ইউনিয়ন স্বাস্থ্য কেন্দ্র'] },
      { name: ['National ID card', 'জাতীয় পরিচয়পত্র'] },
      { name: ['Income certificate from the Union Parishad', 'ইউনিয়ন পরিষদের আয় প্রত্যয়নপত্র'] },
      { name: ['Bank or mobile financial account in your own name', 'নিজের নামে ব্যাংক বা মোবাইল আর্থিক হিসাব'] },
    ],
    rules: rules(
      ['gender', 'isPregnant', 'monthlyIncome'],
      ALL(
        isBangladeshi(),
        isFemale(),
        c('isPregnant', 'eq', true, ['You have reported that you are pregnant.', 'আপনি গর্ভবতী বলে জানিয়েছেন।'], ['This allowance is for pregnant women.', 'এই ভাতা গর্ভবতী মহিলাদের জন্য।'], { weight: 3, unknown: ['Are you currently pregnant?', 'আপনি কি বর্তমানে গর্ভবতী?'] }),
        monthlyIncomeBelow(2500, 2),
        ageAtLeast(20, 1),
      ),
      ['Limited to the first or second living child.', 'প্রথম বা দ্বিতীয় জীবিত সন্তানের ক্ষেত্রেই প্রযোজ্য।'],
    ),
  },

  {
    slug: 'vgd-programme',
    org: 'dwa',
    category: 'social_welfare',
    title: ['Vulnerable Group Development (VGD)', 'ভালনারেবল গ্রুপ ডেভেলপমেন্ট (ভিজিডি)'],
    summary: [
      'Monthly free food grain plus savings and skills training for the poorest rural women, over a two-year cycle.',
      'গ্রামের সবচেয়ে দরিদ্র মহিলাদের জন্য দুই বছরের চক্রে মাসিক বিনামূল্যে খাদ্যশস্য, সঞ্চয় ও দক্ষতা প্রশিক্ষণ।',
    ],
    description: [
      'VGD combines food security with a graduation pathway: alongside the monthly grain entitlement, participants save a small amount each month and receive training in income-generating skills such as tailoring, poultry rearing, or vegetable cultivation. At the end of the two-year cycle the accumulated savings are returned as a lump sum to start an enterprise.',
      'ভিজিডি খাদ্য নিরাপত্তার সঙ্গে উন্নয়নের পথ একসঙ্গে দেয়: মাসিক খাদ্যশস্যের পাশাপাশি অংশগ্রহণকারীরা প্রতি মাসে অল্প সঞ্চয় করেন এবং সেলাই, হাঁস-মুরগি পালন বা সবজি চাষের মতো আয়বর্ধক দক্ষতার প্রশিক্ষণ পান। দুই বছরের চক্র শেষে জমা সঞ্চয় এককালীন ফেরত দেওয়া হয়, যা দিয়ে উদ্যোগ শুরু করা যায়।',
    ],
    benefits: [
      '30 kg of rice or wheat each month for 24 months, a returned savings lump sum, and free skills training.',
      '২৪ মাস ধরে প্রতি মাসে ৩০ কেজি চাল বা গম, চক্র শেষে সঞ্চয় ফেরত এবং বিনামূল্যে দক্ষতা প্রশিক্ষণ।',
    ],
    benefitPeriod: 'monthly',
    lifeEvents: ['widowhood', 'job_loss', 'disaster_recovery'],
    tags: ['food-security', 'women', 'training', 'savings'],
    sourceUrl: 'https://dwa.gov.bd',
    processingTime: ['Selected at the start of each two-year cycle', 'প্রতি দুই বছরের চক্রের শুরুতে বাছাই'],
    recurrence: 'biannual',
    deadlineInDays: 45,
    popularity: 79,
    steps: [
      ['Watch for the VGD list announcement at your Union Parishad, usually posted publicly.', 'আপনার ইউনিয়ন পরিষদে ভিজিডি তালিকার ঘোষণার দিকে খেয়াল রাখুন — সাধারণত প্রকাশ্যে টাঙানো হয়।'],
      ['Submit an application with your National ID and an income certificate.', 'জাতীয় পরিচয়পত্র ও আয়ের প্রত্যয়নপত্র দিয়ে আবেদন জমা দিন।'],
      ['Attend the union selection committee meeting for verification.', 'যাচাইয়ের জন্য ইউনিয়ন বাছাই কমিটির সভায় উপস্থিত থাকুন।'],
      ['If selected, collect your VGD card and attend the monthly distribution and training days.', 'নির্বাচিত হলে ভিজিডি কার্ড সংগ্রহ করুন এবং মাসিক বিতরণ ও প্রশিক্ষণ দিনে উপস্থিত থাকুন।'],
    ],
    docs: [
      { name: ['National ID card', 'জাতীয় পরিচয়পত্র'] },
      { name: ['Income and landlessness certificate from the Union Parishad', 'ইউনিয়ন পরিষদের আয় ও ভূমিহীনতার প্রত্যয়নপত্র'] },
      { name: ['Two passport-size photographs', 'দুই কপি পাসপোর্ট সাইজের ছবি'] },
    ],
    rules: rules(
      ['gender', 'monthlyIncome', 'district'],
      ALL(
        isBangladeshi(),
        isFemale(),
        monthlyIncomeBelow(2000, 3),
        ageBetweenHelper(),
        landAtMost(15, true),
        NONE(
          c(
            'occupation',
            'eq',
            'government_employee',
            ['—', '—'],
            ['Households with a government salary are excluded.', 'সরকারি বেতনভোগী পরিবার এই কর্মসূচির বাইরে।'],
          ),
        ),
      ),
      ['Households already receiving VGF food support in the same cycle are usually excluded.', 'একই চক্রে ভিজিএফ খাদ্য সহায়তা পাওয়া পরিবার সাধারণত বাদ পড়ে।'],
    ),
  },

  {
    slug: 'food-friendly-programme',
    org: 'dss',
    category: 'social_welfare',
    title: ['Food Friendly Programme (subsidised rice)', 'খাদ্যবান্ধব কর্মসূচি (ভর্তুকি মূল্যে চাল)'],
    summary: [
      'Buy up to 30 kg of rice per month at a heavily subsidised price during the lean season.',
      'মঙ্গা মৌসুমে মাসে ৩০ কেজি পর্যন্ত চাল অনেক কম দামে কেনার সুযোগ।',
    ],
    description: [
      'This is not a cash transfer — it is the right to buy rice at a fraction of the market price from a licensed dealer in your union, during the months when rural work is scarcest. Cardholders are selected from the poorest households and the card is valid for the programme season. It runs alongside, not instead of, cash allowances.',
      'এটি নগদ সহায়তা নয় — এটি গ্রামে কাজ সবচেয়ে কম থাকার মাসগুলোতে আপনার ইউনিয়নের লাইসেন্সপ্রাপ্ত ডিলারের কাছ থেকে বাজারদরের ভগ্নাংশে চাল কেনার অধিকার। সবচেয়ে দরিদ্র পরিবার থেকে কার্ডধারী বাছাই হয় এবং কার্ড কর্মসূচির মৌসুমে বৈধ থাকে। এটি নগদ ভাতার বদলে নয়, পাশাপাশি চলে।',
    ],
    benefits: [
      'Up to 30 kg of rice per month at a subsidised price, from a dealer in your own union.',
      'নিজের ইউনিয়নের ডিলারের কাছ থেকে মাসে ৩০ কেজি পর্যন্ত চাল ভর্তুকি মূল্যে।',
    ],
    benefitPeriod: 'monthly',
    lifeEvents: ['job_loss', 'disaster_recovery', 'old_age'],
    tags: ['food-security', 'subsidy', 'seasonal'],
    sourceUrl: 'https://mofood.gov.bd',
    processingTime: ['Card issued within the season if selected', 'নির্বাচিত হলে মৌসুমের মধ্যেই কার্ড'],
    recurrence: 'annual',
    deadlineInDays: 120,
    popularity: 71,
    steps: [
      ['Check the published beneficiary list at your Union Parishad notice board.', 'ইউনিয়ন পরিষদের নোটিশ বোর্ডে প্রকাশিত সুবিধাভোগী তালিকা দেখুন।'],
      ['If your name is missing, apply to the Union Parishad with your National ID.', 'নাম না থাকলে জাতীয় পরিচয়পত্র নিয়ে ইউনিয়ন পরিষদে আবেদন করুন।'],
      ['Collect your card and note your dealer\'s distribution days.', 'কার্ড সংগ্রহ করুন এবং আপনার ডিলারের বিতরণের দিন জেনে নিন।'],
    ],
    docs: [
      { name: ['National ID card', 'জাতীয় পরিচয়পত্র'] },
      { name: ['Income certificate from the Union Parishad', 'ইউনিয়ন পরিষদের আয় প্রত্যয়নপত্র'], required: false },
    ],
    rules: rules(
      ['monthlyIncome', 'district'],
      ALL(isBangladeshi(), monthlyIncomeBelow(4000, 3), landAtMost(50, true)),
    ),
  },

  {
    slug: 'cancer-kidney-liver-assistance',
    org: 'dss',
    category: 'social_welfare',
    title: [
      'One-Time Financial Assistance for Cancer, Kidney, Liver Cirrhosis, Stroke and Congenital Heart Patients',
      'ক্যান্সার, কিডনি, লিভার সিরোসিস, স্ট্রোক ও জন্মগত হৃদরোগীদের এককালীন আর্থিক সহায়তা',
    ],
    summary: [
      'A one-time grant of ৳1,00,000 towards treatment for six specified serious illnesses.',
      'নির্দিষ্ট ছয়টি জটিল রোগের চিকিৎসার জন্য এককালীন ১,০০,০০০ টাকা অনুদান।',
    ],
    description: [
      'This is a one-time, non-repayable grant paid directly to the patient\'s account, intended to help with the cost of treatment for cancer, kidney failure, liver cirrhosis, stroke-related paralysis, thalassaemia, or congenital heart disease. A specialist\'s certificate naming the diagnosis is essential — a general practitioner\'s note is not sufficient. The grant can be received once, and does not affect any allowance you already receive.',
      'এটি এককালীন, ফেরত দিতে হয় না এমন অনুদান, যা সরাসরি রোগীর হিসাবে দেওয়া হয় এবং ক্যান্সার, কিডনি বিকল, লিভার সিরোসিস, স্ট্রোকজনিত পক্ষাঘাত, থ্যালাসেমিয়া বা জন্মগত হৃদরোগের চিকিৎসার খরচে সহায়তা করে। রোগ নির্ণয় উল্লেখ করে বিশেষজ্ঞ চিকিৎসকের সনদ অপরিহার্য — সাধারণ চিকিৎসকের কাগজ যথেষ্ট নয়। অনুদান একবারই পাওয়া যায় এবং আপনার চলমান কোনো ভাতা এতে প্রভাবিত হয় না।',
    ],
    benefits: [
      'A single payment of ৳1,00,000 into your own account, with no repayment obligation.',
      'নিজের হিসাবে এককালীন ১,০০,০০০ টাকা — ফেরত দেওয়ার বাধ্যবাধকতা নেই।',
    ],
    benefitAmount: 100000,
    benefitPeriod: 'one_time',
    sourceNote: [
      'FY2026-27 budget speech (11 June 2026): one-time assistance raised from ৳50,000 to ৳1,00,000, 65,000 beneficiaries. Single source; not yet checked against the DSS circular.',
      '২০২৬-২৭ বাজেট বক্তৃতা (১১ জুন ২০২৬): এককালীন সহায়তা ৳৫০,০০০ থেকে ৳১,০০,০০০, ৬৫,০০০ জন। একটিমাত্র সূত্র; সমাজসেবা অধিদফতরের পরিপত্রের সঙ্গে এখনো মেলানো হয়নি।',
    ],
    sourceCheck: { status: 'pending_review', checkedOn: '2026-09-30', sources: ['https://www.bssnews.net/national-budget-2026-2027/394911'] },
    lifeEvents: ['serious_medical_need'],
    tags: ['medical-grant', 'one-time', 'cancer', 'kidney', 'heart'],
    sourceUrl: 'https://dss.gov.bd',
    processingTime: ['45–90 days', '৪৫–৯০ দিন'],
    recurrence: 'continuous',
    popularity: 84,
    steps: [
      ['Get a certificate from a specialist consultant at a government or recognised hospital naming the diagnosis.', 'সরকারি বা স্বীকৃত হাসপাতালের বিশেষজ্ঞ পরামর্শকের কাছ থেকে রোগ নির্ণয় উল্লেখ করা সনদ নিন।'],
      ['Collect the application form from the Upazila or District Social Services Office, or download it from dss.gov.bd.', 'উপজেলা বা জেলা সমাজসেবা অফিস থেকে ফরম নিন, অথবা dss.gov.bd থেকে ডাউনলোড করুন।'],
      ['Attach the medical certificate, National ID, income certificate, and account details.', 'মেডিকেল সনদ, জাতীয় পরিচয়পত্র, আয়ের প্রত্যয়নপত্র ও হিসাবের তথ্য সংযুক্ত করুন।'],
      ['Submit to the District Social Services Office and keep the receipt with its tracking number.', 'জেলা সমাজসেবা অফিসে জমা দিন এবং ট্র্যাকিং নম্বরসহ রসিদ সংগ্রহে রাখুন।'],
    ],
    docs: [
      {
        name: ['Specialist medical certificate naming the diagnosis', 'রোগ নির্ণয় উল্লেখ করা বিশেষজ্ঞ মেডিকেল সনদ'],
        authority: ['Government or recognised hospital consultant', 'সরকারি বা স্বীকৃত হাসপাতালের পরামর্শক'],
        mistake: ['A prescription or a general practitioner\'s note is rejected. It must be a specialist consultant\'s certificate stating the disease by name.', 'প্রেসক্রিপশন বা সাধারণ চিকিৎসকের কাগজ বাতিল হয়। রোগের নাম উল্লেখ করে বিশেষজ্ঞ পরামর্শকের সনদ হতে হবে।'],
      },
      { name: ['National ID card', 'জাতীয় পরিচয়পত্র'] },
      { name: ['Income certificate from the Union Parishad or ward councillor', 'ইউনিয়ন পরিষদ বা ওয়ার্ড কাউন্সিলরের আয় প্রত্যয়নপত্র'] },
      { name: ['Bank account details in the patient\'s own name', 'রোগীর নিজের নামে ব্যাংক হিসাবের তথ্য'] },
      { name: ['Hospital admission or treatment documents', 'হাসপাতালে ভর্তি বা চিকিৎসার কাগজপত্র'], required: false },
    ],
    rules: rules(
      ['medicalConditions', 'monthlyIncome'],
      ALL(
        isBangladeshi(),
        c(
          'medicalConditions',
          'contains_any',
          ['cancer', 'kidney_failure', 'liver_cirrhosis', 'stroke_paralysis', 'thalassaemia', 'congenital_heart'],
          ['Your reported condition is covered by this grant.', 'আপনার উল্লেখ করা রোগ এই অনুদানের আওতায় আছে।'],
          ['This grant covers cancer, kidney failure, liver cirrhosis, stroke paralysis, thalassaemia, and congenital heart disease.', 'এই অনুদান ক্যান্সার, কিডনি বিকল, লিভার সিরোসিস, স্ট্রোকজনিত পক্ষাঘাত, থ্যালাসেমিয়া ও জন্মগত হৃদরোগের জন্য।'],
          {
            weight: 4,
            unknown: ['Which illness are you seeking treatment for?', 'আপনি কোন রোগের চিকিৎসার জন্য সহায়তা চাইছেন?'],
          },
        ),
        monthlyIncomeBelow(15000, 2),
      ),
      [
        'Health information is only used for this check when you have chosen to share it, and can be withdrawn at any time.',
        'স্বাস্থ্য তথ্য শুধু আপনি শেয়ার করতে সম্মত হলেই এই যাচাইয়ে ব্যবহৃত হয় এবং যেকোনো সময় তা প্রত্যাহার করা যায়।',
      ],
    ),
  },

  {
    slug: 'brac-ultra-poor-graduation',
    org: 'brac',
    category: 'social_welfare',
    title: ['BRAC Ultra-Poor Graduation Programme', 'ব্র্যাক অতিদরিদ্র উন্নয়ন কর্মসূচি'],
    summary: [
      'A two-year package of assets, a living stipend, coaching, and healthcare to move households out of extreme poverty.',
      'অতি দারিদ্র্য থেকে বেরিয়ে আসতে দুই বছরের প্যাকেজ — সম্পদ, জীবনযাত্রা ভাতা, কোচিং ও স্বাস্থ্যসেবা।',
    ],
    description: [
      'Rather than a loan, this programme transfers a productive asset — typically livestock, poultry, or shop inventory — chosen with the participant, plus a weekly stipend so the asset is not sold to buy food. A field officer visits regularly for two years to coach on managing the asset and saving. Participation is by household survey, not open application: BRAC identifies eligible households through community wealth ranking, so registering interest at a BRAC branch is how to be considered.',
      'এটি ঋণ নয় — অংশগ্রহণকারীর সঙ্গে আলোচনা করে একটি উৎপাদনশীল সম্পদ (সাধারণত গবাদি পশু, হাঁস-মুরগি বা দোকানের মাল) দেওয়া হয়, সঙ্গে সাপ্তাহিক ভাতা যাতে খাবার কিনতে সম্পদ বিক্রি করতে না হয়। দুই বছর ধরে একজন মাঠকর্মী নিয়মিত এসে সম্পদ ব্যবস্থাপনা ও সঞ্চয়ের প্রশিক্ষণ দেন। অংশগ্রহণ পরিবার সমীক্ষার মাধ্যমে হয়, খোলা আবেদনে নয়: ব্র্যাক কমিউনিটি সম্পদ র‍্যাঙ্কিংয়ের মাধ্যমে যোগ্য পরিবার চিহ্নিত করে, তাই ব্র্যাক শাখায় আগ্রহ নিবন্ধন করাই বিবেচিত হওয়ার উপায়।',
    ],
    benefits: [
      'A productive asset worth roughly ৳20,000–30,000, a weekly living stipend, two years of coaching, free healthcare, and enterprise training.',
      'প্রায় ২০,০০০–৩০,০০০ টাকার উৎপাদনশীল সম্পদ, সাপ্তাহিক জীবনযাত্রা ভাতা, দুই বছরের কোচিং, বিনামূল্যে স্বাস্থ্যসেবা ও উদ্যোগ প্রশিক্ষণ।',
    ],
    benefitAmount: 25000,
    benefitPeriod: 'one_time',
    lifeEvents: ['job_loss', 'widowhood', 'disaster_recovery'],
    tags: ['ngo', 'asset-transfer', 'graduation', 'ultra-poor'],
    sourceUrl: 'https://brac.net/ultra-poor-graduation',
    processingTime: ['Selection happens once per cohort in each working area', 'প্রতিটি কর্ম এলাকায় প্রতি ব্যাচে একবার বাছাই'],
    recurrence: 'annual',
    popularity: 68,
    steps: [
      ['Visit your nearest BRAC branch office and ask to register interest in the Ultra-Poor Graduation programme.', 'নিকটস্থ ব্র্যাক শাখা অফিসে গিয়ে অতিদরিদ্র উন্নয়ন কর্মসূচিতে আগ্রহ নিবন্ধন করতে বলুন।'],
      ['Take part in the community wealth-ranking survey when it reaches your area.', 'আপনার এলাকায় কমিউনিটি সম্পদ র‍্যাঙ্কিং সমীক্ষা হলে অংশ নিন।'],
      ['Complete the household verification visit with a BRAC field officer.', 'ব্র্যাক মাঠকর্মীর সঙ্গে পরিবার যাচাই পরিদর্শন সম্পন্ন করুন।'],
      ['If selected, choose your asset with the field officer and begin the two-year cycle.', 'নির্বাচিত হলে মাঠকর্মীর সঙ্গে সম্পদ বেছে নিয়ে দুই বছরের চক্র শুরু করুন।'],
    ],
    docs: [
      { name: ['National ID card', 'জাতীয় পরিচয়পত্র'] },
      { name: ['Proof of residence in the working area', 'কর্ম এলাকায় বসবাসের প্রমাণ'], required: false },
    ],
    rules: rules(
      ['monthlyIncome', 'district'],
      ALL(
        monthlyIncomeBelow(3000, 3),
        landAtMost(10, false),
        ANY(
          isFemale(1),
          c('householdSize', 'gte', 4, ['Your household size is a priority factor.', 'আপনার পরিবারের সদস্য সংখ্যা অগ্রাধিকারের একটি কারণ।'], ['Larger households are prioritised.', 'বড় পরিবার অগ্রাধিকার পায়।'], { soft: true }),
        ),
      ),
      [
        'Selection is by community survey rather than open application, so registering interest does not guarantee inclusion.',
        'খোলা আবেদনের বদলে কমিউনিটি সমীক্ষার মাধ্যমে বাছাই হয়, তাই আগ্রহ নিবন্ধন করলেই অন্তর্ভুক্তি নিশ্চিত নয়।',
      ],
    ),
  },

  {
    slug: 'hijra-livelihood-support',
    org: 'dss',
    category: 'social_welfare',
    title: ['Livelihood Support for the Hijra Community', 'হিজড়া জনগোষ্ঠীর জীবনমান উন্নয়ন কর্মসূচি'],
    summary: [
      'Allowances, education stipends, and skills training for members of the hijra community.',
      'হিজড়া জনগোষ্ঠীর সদস্যদের জন্য ভাতা, শিক্ষা উপবৃত্তি ও দক্ষতা প্রশিক্ষণ।',
    ],
    description: [
      'This programme provides a monthly allowance for older members of the hijra community, education stipends for those studying, and free vocational training with a small enterprise grant on completion. Identification is through the community-based enumeration carried out by the Upazila Social Services Office, so contacting that office directly is the entry point.',
      'এই কর্মসূচি হিজড়া জনগোষ্ঠীর বয়স্ক সদস্যদের মাসিক ভাতা, অধ্যয়নরতদের শিক্ষা উপবৃত্তি এবং বিনামূল্যে কর্মমুখী প্রশিক্ষণসহ প্রশিক্ষণ শেষে ছোট উদ্যোগ অনুদান দেয়। উপজেলা সমাজসেবা অফিসের কমিউনিটি-ভিত্তিক তালিকাভুক্তির মাধ্যমে শনাক্তকরণ হয়, তাই সেই অফিসে সরাসরি যোগাযোগই প্রবেশপথ।',
    ],
    benefits: [
      'A monthly allowance for members aged 50 and above, education stipends at every level, and free vocational training with a completion grant.',
      '৫০ বছর ও তার বেশি বয়সীদের জন্য মাসিক ভাতা, সব স্তরে শিক্ষা উপবৃত্তি এবং প্রশিক্ষণ শেষে অনুদানসহ বিনামূল্যে কর্মমুখী প্রশিক্ষণ।',
    ],
    benefitAmount: 600,
    benefitPeriod: 'monthly',
    lifeEvents: ['job_loss', 'seeking_employment'],
    tags: ['allowance', 'inclusion', 'training', 'hijra'],
    sourceUrl: 'https://dss.gov.bd',
    processingTime: ['30–60 days', '৩০–৬০ দিন'],
    recurrence: 'continuous',
    popularity: 44,
    steps: [
      ['Contact the Upazila or District Social Services Office and ask about hijra community enumeration.', 'উপজেলা বা জেলা সমাজসেবা অফিসে যোগাযোগ করে হিজড়া জনগোষ্ঠীর তালিকাভুক্তি সম্পর্কে জানুন।'],
      ['Complete the enumeration form with the social services officer.', 'সমাজসেবা কর্মকর্তার সঙ্গে তালিকাভুক্তির ফরম পূরণ করুন।'],
      ['Choose the component you need: allowance, education stipend, or training.', 'আপনার প্রয়োজন অনুযায়ী অংশ বেছে নিন: ভাতা, শিক্ষা উপবৃত্তি বা প্রশিক্ষণ।'],
    ],
    docs: [
      { name: ['National ID card', 'জাতীয় পরিচয়পত্র'] },
      { name: ['Two passport-size photographs', 'দুই কপি পাসপোর্ট সাইজের ছবি'] },
      { name: ['Bank or mobile financial account details', 'ব্যাংক বা মোবাইল আর্থিক হিসাবের তথ্য'] },
    ],
    rules: rules(
      ['gender'],
      ALL(
        isBangladeshi(),
        c(
          'gender',
          'in',
          ['other'],
          ['You have identified as a member of this community.', 'আপনি এই জনগোষ্ঠীর সদস্য হিসেবে পরিচয় দিয়েছেন।'],
          ['This programme is specifically for the hijra community.', 'এই কর্মসূচি বিশেষভাবে হিজড়া জনগোষ্ঠীর জন্য।'],
          { weight: 3, unknown: ['How do you identify your gender?', 'আপনি আপনার লিঙ্গ পরিচয় কীভাবে দিতে চান?'] },
        ),
      ),
    ),
  },
];

/**
 * VGD's age window, extracted only because the helper set does not include a
 * two-sided age range with this programme's specific copy.
 */
function ageBetweenHelper() {
  return c(
    'age',
    'between',
    [18, 49],
    ['Your age is within the VGD range of 18–49.', 'আপনার বয়স ভিজিডির ১৮–৪৯ বছরের মধ্যে।'],
    ['VGD covers women aged 18 to 49.', 'ভিজিডি ১৮ থেকে ৪৯ বছর বয়সী মহিলাদের জন্য।'],
    { weight: 2, unknown: ['How old are you?', 'আপনার বয়স কত?'] },
  );
}

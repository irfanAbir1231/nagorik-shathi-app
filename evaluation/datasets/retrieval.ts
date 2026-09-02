export interface RetrievalCase {
  readonly id: string;
  readonly language: 'bn' | 'en';
  readonly query: string;
  readonly acceptable: readonly string[];
  readonly source: 'author-created-synthetic';
}

interface QueryFamily {
  readonly slug: string;
  readonly acceptable?: readonly string[];
  readonly en: readonly string[];
  readonly bn: readonly string[];
}

/**
 * One hundred author-created base situations (five per language for ten
 * benchmark programmes). Five neutral wrappers produce the frozen 500-query
 * suite. These are synthetic known-item labels, not field-collected citizens
 * and not evidence that the programme facts themselves are officially verified.
 */
const FAMILIES: readonly QueryFamily[] = [
  {
    slug: 'widow-allowance',
    en: ['my husband died and I have very little income', 'support for a widowed woman', 'I am raising children after my husband passed away', 'allowance after the death of a husband', 'poor separated woman looking for government help'],
    bn: ['আমার স্বামী মারা গেছেন, আয় খুব কম', 'বিধবা নারীর জন্য সরকারি সহায়তা', 'স্বামী মারা যাওয়ার পর সন্তানদের নিয়ে কষ্টে আছি', 'স্বামীহারা নারীর ভাতা দরকার', 'তালাকপ্রাপ্তা দরিদ্র নারী কী সাহায্য পাবেন'],
  },
  {
    slug: 'old-age-allowance',
    en: ['I am an elderly poor person with no regular income', 'government allowance for old people', 'I am 70 and need financial support', 'help for a low income senior citizen', 'old age pension in Bangladesh'],
    bn: ['আমি ৭০ বছরের দরিদ্র মানুষ, নিয়মিত আয় নেই', 'বয়স্ক মানুষের সরকারি ভাতা', 'বৃদ্ধ বয়সে আর্থিক সহায়তা দরকার', 'কম আয়ের প্রবীণ নাগরিক কী পাবেন', 'বাংলাদেশে বয়স্ক ভাতা কীভাবে পাব'],
  },
  {
    slug: 'disability-allowance',
    acceptable: ['disability-allowance', 'disability-assistive-devices'],
    en: ['I have a disability and cannot earn enough', 'monthly allowance for a disabled person', 'financial support for a person with disability', 'I use a wheelchair and need government help', 'benefits for a poor disabled citizen'],
    bn: ['আমি প্রতিবন্ধী এবং আয় করতে পারি না', 'প্রতিবন্ধী ব্যক্তির মাসিক ভাতা', 'প্রতিবন্ধী মানুষের আর্থিক সহায়তা', 'আমি হুইলচেয়ার ব্যবহার করি, সরকারি সাহায্য চাই', 'দরিদ্র প্রতিবন্ধী নাগরিক কী সুবিধা পাবেন'],
  },
  {
    slug: 'maternity-allowance',
    acceptable: ['maternity-allowance', 'maternal-health-voucher'],
    en: ['I am pregnant and my family has low income', 'allowance for a poor pregnant mother', 'government financial help during pregnancy', 'support for an expecting mother', 'maternity benefit for a low income woman'],
    bn: ['আমি গর্ভবতী, পরিবারের আয় কম', 'দরিদ্র গর্ভবতী মায়ের ভাতা', 'গর্ভাবস্থায় সরকারি আর্থিক সাহায্য', 'সন্তানসম্ভবা মায়ের সহায়তা দরকার', 'কম আয়ের নারীর মাতৃত্বকালীন সুবিধা'],
  },
  {
    slug: 'cancer-kidney-liver-assistance',
    acceptable: ['cancer-kidney-liver-assistance', 'nicrh-subsidised-cancer-treatment', 'kidney-foundation-dialysis'],
    en: ['financial help for cancer treatment', 'my family cannot afford kidney dialysis', 'government grant for serious illness', 'support for liver cirrhosis treatment', 'poor patient needs money for cancer care'],
    bn: ['ক্যান্সার চিকিৎসার জন্য আর্থিক সাহায্য', 'কিডনি ডায়ালাইসিসের খরচ চালাতে পারছি না', 'গুরুতর রোগের সরকারি অনুদান', 'লিভার সিরোসিস চিকিৎসার সহায়তা', 'দরিদ্র রোগীর ক্যান্সার চিকিৎসার টাকা দরকার'],
  },
  {
    slug: 'agricultural-rehabilitation-crop-loss',
    acceptable: ['agricultural-rehabilitation-crop-loss', 'disaster-gratuitous-relief'],
    en: ['flood destroyed my crops', 'support for a farmer after crop loss', 'cyclone damaged my farm and harvest', 'agricultural rehabilitation after a disaster', 'I lost my harvest and need seeds'],
    bn: ['বন্যায় আমার ফসল নষ্ট হয়েছে', 'ফসল হারানো কৃষকের সহায়তা', 'ঘূর্ণিঝড়ে খামার ও ফসল ক্ষতিগ্রস্ত', 'দুর্যোগের পর কৃষি পুনর্বাসন চাই', 'ফসল নষ্ট হয়েছে, বীজের সাহায্য দরকার'],
  },
  {
    slug: 'government-legal-aid',
    acceptable: ['government-legal-aid', 'blast-legal-aid', 'brac-legal-empowerment'],
    en: ['I need a lawyer but cannot pay', 'free legal aid for a poor person', 'help with a family court dispute', 'legal support after domestic violence', 'where can I get government legal assistance'],
    bn: ['আইনজীবীর খরচ দিতে পারি না', 'দরিদ্র মানুষের বিনামূল্যে আইনি সহায়তা', 'পারিবারিক আদালতের মামলায় সাহায্য চাই', 'পারিবারিক সহিংসতার পর আইনি সহায়তা', 'সরকারি আইনগত সাহায্য কোথায় পাব'],
  },
  {
    slug: 'secondary-education-stipend',
    acceptable: ['secondary-education-stipend', 'pm-education-assistance-stipend'],
    en: ['stipend for a poor secondary school student', 'my family cannot afford my school costs', 'financial help for a girl in class nine', 'education allowance for classes six to twelve', 'support to continue secondary education'],
    bn: ['দরিদ্র মাধ্যমিক শিক্ষার্থীর উপবৃত্তি', 'পরিবার আমার স্কুলের খরচ দিতে পারছে না', 'নবম শ্রেণির মেয়ের পড়াশোনার সহায়তা', 'ষষ্ঠ থেকে দ্বাদশ শ্রেণির শিক্ষা ভাতা', 'মাধ্যমিক পড়াশোনা চালিয়ে যাওয়ার সাহায্য'],
  },
  {
    slug: 'pksf-microenterprise-loan',
    acceptable: ['pksf-microenterprise-loan', 'smef-credit-wholesale', 'youth-development-training-loan', 'bb-women-entrepreneur-refinance'],
    en: ['small loan to start a business', 'microenterprise finance for a low income person', 'I want capital for a tiny shop', 'loan support for a new entrepreneur', 'financing to expand my small business'],
    bn: ['ছোট ব্যবসা শুরু করতে ঋণ চাই', 'কম আয়ের মানুষের ক্ষুদ্র উদ্যোগ ঋণ', 'ছোট দোকানের জন্য মূলধন দরকার', 'নতুন উদ্যোক্তার ঋণ সহায়তা', 'ক্ষুদ্র ব্যবসা বড় করতে অর্থায়ন চাই'],
  },
  {
    slug: 'bmet-overseas-employment-training',
    en: ['training before going abroad for work', 'government course for overseas employment', 'I want skills for a job in another country', 'safe migration employment training', 'where can a migrant worker get training'],
    bn: ['বিদেশে কাজ করতে যাওয়ার আগে প্রশিক্ষণ', 'বিদেশে চাকরির সরকারি কোর্স', 'অন্য দেশে কাজের জন্য দক্ষতা শিখতে চাই', 'নিরাপদ অভিবাসন ও কর্মসংস্থান প্রশিক্ষণ', 'প্রবাসী কর্মীর প্রশিক্ষণ কোথায় পাওয়া যায়'],
  },
];

const WRAPPERS = {
  en: [
    (query: string) => query,
    (query: string) => `Please help me: ${query}`,
    (query: string) => `My situation is this: ${query}`,
    (query: string) => `I do not know the programme name. ${query}`,
    (query: string) => `What public support can I get? ${query}`,
  ],
  bn: [
    (query: string) => query,
    (query: string) => `দয়া করে সাহায্য করুন: ${query}`,
    (query: string) => `আমার পরিস্থিতি হলো: ${query}`,
    (query: string) => `কর্মসূচির নাম জানি না। ${query}`,
    (query: string) => `আমি কী সরকারি সহায়তা পেতে পারি? ${query}`,
  ],
} as const;

export const RETRIEVAL_CASES: readonly RetrievalCase[] = FAMILIES.flatMap((family) =>
  (['bn', 'en'] as const).flatMap((language) =>
    family[language].flatMap((base, baseIndex) =>
      WRAPPERS[language].map((wrap, wrapperIndex) => ({
        id: `${family.slug}-${language}-${baseIndex + 1}-${wrapperIndex + 1}`,
        language,
        query: wrap(base),
        acceptable: family.acceptable ?? [family.slug],
        source: 'author-created-synthetic' as const,
      })),
    ),
  ),
);

if (RETRIEVAL_CASES.length !== 500) {
  throw new Error(`Retrieval benchmark must contain 500 cases; found ${RETRIEVAL_CASES.length}`);
}

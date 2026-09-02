/**
 * The single bilingual message catalogue.
 *
 * Every string is a `[bn, en]` tuple in ONE file, and the per-locale message
 * objects are projected from it. This makes bn/en parity structural: it is not
 * possible to add a Bangla string and forget the English one, or vice versa,
 * because a tuple with a missing half is a type error.
 *
 * Bangla is first in the tuple because Bangla is the default locale.
 *
 * Copy rules applied throughout (BDS §14, PRD Principle 5):
 *  • Address the citizen as "আপনি".
 *  • Say what to do, not what went wrong.
 *  • No bureaucratic vocabulary; no English technical terms in Bangla strings
 *    unless the term is what a citizen actually sees on a form.
 *  • Buttons are verb-first and name their object.
 */

export type Pair = readonly [bn: string, en: string];

export interface CatalogNode {
  readonly [key: string]: Pair | CatalogNode;
}

export const catalog = {
  common: {
    appName: ['সেবার জানালা', 'Shebar Janala'],
    tagline: ['প্রত্যেক নাগরিকের জন্য একজন এআই সহকারী।', 'One AI Assistant for Every Citizen.'],
    loading: ['একটু অপেক্ষা করুন…', 'One moment…'],
    save: ['সেভ করুন', 'Save'],
    saved: ['সেভ হয়েছে', 'Saved'],
    cancel: ['বাতিল করুন', 'Cancel'],
    back: ['পেছনে যান', 'Go back'],
    close: ['বন্ধ করুন', 'Close'],
    next: ['পরবর্তী', 'Next'],
    submit: ['জমা দিন', 'Submit'],
    retry: ['আবার চেষ্টা করুন', 'Try again'],
    refresh: ['রিফ্রেশ করুন', 'Refresh'],
    reportIssue: ['সমস্যা জানান', 'Report a problem'],
    search: ['খুঁজুন', 'Search'],
    filter: ['ফিল্টার', 'Filter'],
    sort: ['সাজান', 'Sort'],
    all: ['সব', 'All'],
    none: ['কোনোটি নয়', 'None'],
    yes: ['হ্যাঁ', 'Yes'],
    no: ['না', 'No'],
    optional: ['(না দিলেও চলবে)', '(optional)'],
    on: ['চালু', 'On'],
    off: ['বন্ধ', 'Off'],
    viewDetails: ['বিস্তারিত দেখুন', 'View details'],
    viewAll: ['সব দেখুন', 'See all'],
    share: ['শেয়ার করুন', 'Share'],
    copy: ['কপি করুন', 'Copy'],
    copied: ['কপি হয়েছে', 'Copied'],
    unknown: ['জানা নেই', 'Not known'],
    today: ['আজ', 'Today'],
    tomorrow: ['আগামীকাল', 'Tomorrow'],
    deadline: ['শেষ তারিখ', 'Deadline'],
    noDeadline: ['সারা বছর খোলা', 'Open all year'],
    amount: ['পরিমাণ', 'Amount'],
    perMonth: ['প্রতি মাসে', 'per month'],
    oneTime: ['এককালীন', 'one time'],
    perYear: ['প্রতি বছর', 'per year'],
    signIn: ['সাইন ইন করুন', 'Sign in'],
    signOut: ['সাইন আউট করুন', 'Sign out'],
    // Said aloud on the voice path, so it states the consequence plainly rather
    // than reporting an error: the citizen needs to know they are STILL signed in.
    signOutFailed: [
      'সাইন আউট করা যায়নি — আপনি এখনও সাইন ইন করা আছেন। আবার চেষ্টা করুন।',
      'Could not sign out — you are still signed in. Please try again.',
    ],
    createAccount: ['নতুন হিসাব খুলুন', 'Create an account'],
    skip: ['এখন নয়', 'Not now'],
    undo: ['ফিরিয়ে নিন', 'Undo'],
    daysLeft: ['দিন বাকি', 'days left'],
    expired: ['সময় শেষ', 'Closed'],
    approximate: ['প্রায়', 'approx.'],
    km: ['কিমি', 'km'],
    language: ['ভাষা', 'Language'],
  },

  nav: {
    home: ['হোম', 'Home'],
    chat: ['কথা বলুন', 'Ask'],
    opportunities: ['সুযোগ', 'Programmes'],
    timeline: ['সময়সূচি', 'Timeline'],
    saved: ['সেভ করা', 'Saved'],
    profile: ['প্রোফাইল', 'Profile'],
    settings: ['সেটিংস', 'Settings'],
    notifications: ['নোটিফিকেশন', 'Notifications'],
    nearby: ['কাছের অফিস', 'Nearby'],
    admin: ['প্রশাসন', 'Admin'],
    dashboard: ['ড্যাশবোর্ড', 'Dashboard'],
    issues: ['এলাকার সমস্যা', 'Local issues'],
    identity: ['পরিচয় যাচাই', 'Verify identity'],
    budget: ['ইউনিয়ন বাজেট', 'Union budget'],
    entitlements: ['আমার ভাতা', 'My entitlements'],
    officer: ['উপজেলা কর্মকর্তা', 'Upazila officer'],
    leader: ['নেতৃত্ব ড্যাশবোর্ড', 'Leadership dashboard'],
    beneficiaries: ['সুবিধাভোগী', 'Beneficiaries'],
    donor: ['দাতা পোর্টাল', 'Donor portal'],
    mainNavigation: ['প্রধান মেনু', 'Main navigation'],
    skipToContent: ['মূল অংশে যান', 'Skip to main content'],
  },

  landing: {
    heroTitle: [
      'আপনার পরিস্থিতি বলুন। আমরা আপনার সুযোগ খুঁজে দেব।',
      "Tell us your situation. We'll help you discover opportunities.",
    ],
    heroBody: [
      'শত শত সরকারি ওয়েবসাইট ঘাঁটতে হবে না। আপনার জীবনে কী ঘটেছে সেটা বলুন — আমরা দেখব আপনি কোন ভাতা, বৃত্তি, চিকিৎসা বা সহায়তা পেতে পারেন, এবং কেন।',
      'No need to search hundreds of government websites. Tell us what happened in your life, and we will find which allowances, scholarships, healthcare, or support you can get — and explain why.',
    ],
    startConversation: ['কথা বলা শুরু করুন', 'Start a conversation'],
    browseProgrammes: ['সব কর্মসূচি দেখুন', 'Browse all programmes'],
    lifeEventsTitle: ['আপনার জীবনে কী ঘটেছে?', 'What has happened in your life?'],
    lifeEventsBody: [
      'যেটি আপনার সঙ্গে মেলে সেটিতে চাপ দিন। আপনাকে জানতে হবে না কোন মন্ত্রণালয় কী দেয়।',
      'Tap the one that matches you. You do not need to know which ministry provides what.',
    ],
    howItWorks: ['কীভাবে কাজ করে', 'How it works'],
    step1Title: ['আপনার কথা বলুন', 'Tell your story'],
    step1Body: [
      'বাংলা বা ইংরেজিতে লিখুন, অথবা মাইক চেপে বলুন। সরকারি ভাষা জানার দরকার নেই।',
      'Write in Bangla or English, or press the microphone and speak. No official vocabulary needed.',
    ],
    step2Title: ['আমরা যোগ্যতা যাচাই করি', 'We check your eligibility'],
    step2Body: [
      'সিদ্ধান্ত নেয় নির্দিষ্ট নিয়ম, এআই নয়। এআই শুধু নিয়মটি সহজ ভাষায় ব্যাখ্যা করে।',
      'Fixed rules decide, not the AI. The AI only explains the rule in plain words.',
    ],
    step3Title: ['সুযোগ দেখুন', 'See your opportunities'],
    step3Body: [
      'প্রতিটির সঙ্গে থাকে কেন আপনি যোগ্য, কী কাগজ লাগবে, আর কোথায় যেতে হবে।',
      'Each one comes with why you qualify, which documents you need, and where to go.',
    ],
    step4Title: ['পরিকল্পনা অনুসরণ করুন', 'Follow your action plan'],
    step4Body: [
      'দিন ধরে ধরে কাজের তালিকা, শেষ তারিখের আগেই মনে করিয়ে দেওয়া হয়।',
      'A day-by-day task list, with reminders before the deadline.',
    ],
    categoriesTitle: ['যেসব বিষয়ে সহায়তা আছে', 'What we cover'],
    trustTitle: ['কেন এটি ভরসা করা যায়', 'Why you can trust this'],
    trustRules: [
      'যোগ্যতা ঠিক করে নির্দিষ্ট নিয়ম — এআই নয়।',
      'Eligibility is decided by fixed rules, not by the AI.',
    ],
    trustEvidence: [
      'প্রতিটি সুপারিশের সঙ্গে তার উৎস দেখানো হয়।',
      'Every recommendation shows the source it came from.',
    ],
    trustHonesty: [
      'তথ্য যাচাই করা না থাকলে আমরা তা স্পষ্ট করে বলি।',
      'When information is unverified, we say so plainly.',
    ],
    trustNoGuess: [
      'জানা না থাকলে আমরা অনুমান করি না — জিজ্ঞাসা করি।',
      'When we do not know, we ask rather than guess.',
    ],
    faqTitle: ['সাধারণ প্রশ্ন', 'Common questions'],
    faq1Q: ['এটা কি বিনামূল্যে?', 'Is this free?'],
    faq1A: [
      'হ্যাঁ। নাগরিকদের জন্য সব সুবিধা বিনামূল্যে, কোনো ফি নেই।',
      'Yes. Everything for citizens is free, with no fees.',
    ],
    faq2Q: ['আমার তথ্য কি নিরাপদ?', 'Is my information safe?'],
    faq2A: [
      'আপনার তথ্য শুধু আপনার যোগ্যতা যাচাই করতে ব্যবহৃত হয়। স্বাস্থ্য তথ্য আপনি অনুমতি না দিলে সংরক্ষণ করা হয় না, আর যেকোনো সময় হিসাব মুছে দিতে পারেন।',
      'Your information is used only to check your eligibility. Health details are not stored unless you allow it, and you can delete your account at any time.',
    ],
    faq3Q: ['আমি কি এখানে আবেদন করতে পারব?', 'Can I apply here?'],
    faq3A: [
      'না। আমরা দেখাই আপনি কী পেতে পারেন, কী কাগজ লাগবে এবং কোথায় যেতে হবে। আবেদন করতে হয় সংশ্লিষ্ট অফিসে।',
      'No. We show you what you can get, which documents you need, and where to go. The application itself happens at the relevant office.',
    ],
    faq4Q: ['তথ্য ভুল হলে কী করব?', 'What if the information is wrong?'],
    faq4A: [
      'প্রতিটি সুপারিশে "ভুল তথ্য জানান" বোতাম আছে। একজন মানুষ সেটি পরীক্ষা করেন — এআই নিজে থেকে নিয়ম বদলায় না।',
      'Every recommendation has a "report incorrect information" button. A person reviews it — the AI never changes a rule on its own.',
    ],
    footerContact: ['যোগাযোগ', 'Contact'],
    footerPrivacy: ['গোপনীয়তা', 'Privacy'],
    footerTerms: ['শর্তাবলি', 'Terms'],
    footerSupport: ['সহায়তা', 'Support'],
    footerAbout: ['পরিচিতি', 'About'],
    demoNotice: [
      'এটি একটি প্রোটোটাইপ। কর্মসূচির তথ্য নমুনা হিসেবে দেওয়া, এখনো যাচাই করা হয়নি।',
      'This is a prototype. Programme information is sample data and has not been verified.',
    ],
  },

  auth: {
    signInTitle: ['আপনার হিসাবে ঢুকুন', 'Sign in to your account'],
    signUpTitle: ['নতুন হিসাব খুলুন', 'Create your account'],
    phoneLabel: ['মোবাইল নম্বর', 'Mobile number'],
    phonePlaceholder: ['যেমন: 01712345678', 'For example: 01712345678'],
    phoneHelp: ['১১ সংখ্যার নম্বর, ০১ দিয়ে শুরু।', 'An 11-digit number starting with 01.'],
    nameLabel: ['আপনার নাম', 'Your name'],
    nameHelp: [
      'জাতীয় পরিচয়পত্রে যেভাবে লেখা আছে সেভাবে লিখুন।',
      'Write it as it appears on your National ID.',
    ],
    pinLabel: ['৪ সংখ্যার পিন', '4-digit PIN'],
    pinHelp: [
      'পরে ঢুকতে এই পিন লাগবে। সহজে অনুমান করা যায় এমন সংখ্যা দেবেন না।',
      'You will need this PIN to sign in later. Do not use an easily guessed number.',
    ],
    pinConfirmLabel: ['পিনটি আবার লিখুন', 'Type the PIN again'],
    districtLabel: ['আপনার জেলা', 'Your district'],
    districtHelp: [
      'অনেক কর্মসূচি জেলা অনুযায়ী আলাদা, তাই এটি দিলে সঠিক তালিকা পাবেন।',
      'Many programmes differ by district, so this gives you the right list.',
    ],
    sendCode: ['কোড পাঠান', 'Send code'],
    sendingCode: ['কোড পাঠানো হচ্ছে…', 'Sending the code…'],
    otpTitle: ['ফোনে আসা ৬ সংখ্যার কোড লিখুন', 'Enter the 6-digit code sent to your phone'],
    otpSentTo: ['কোড পাঠানো হয়েছে', 'Code sent to'],
    changeNumber: ['নম্বর বদলান', 'Change number'],
    otpBoxLabel: ['৬ সংখ্যার কোড, ঘর {n} / {total}', '6-digit code, box {n} of {total}'],
    resendIn: ['{seconds} সেকেন্ড পরে আবার পাঠাতে পারবেন', 'You can resend in {seconds} seconds'],
    resend: ['আবার কোড পাঠান', 'Send the code again'],
    voiceOtp: ['ফোনে কল করে কোড শুনুন', 'Call me and read the code'],
    voiceOtpUnavailable: [
      'ভয়েস কোড সেবা এখনো চালু হয়নি — এর জন্য টেলিফোন সেবা প্রয়োজন।',
      'Voice code delivery is not enabled — it needs a telephony service.',
    ],
    verifyAndContinue: ['যাচাই করে এগিয়ে যান', 'Verify and continue'],
    verifying: ['যাচাই করা হচ্ছে…', 'Verifying…'],
    signingIn: ['সাইন ইন করা হচ্ছে…', 'Signing you in…'],
    creatingAccount: ['হিসাব তৈরি করা হচ্ছে…', 'Creating your account…'],
    forgotPin: ['পিন ভুলে গেছেন?', 'Forgotten your PIN?'],
    forgotPinTitle: ['নতুন পিন দিন', 'Set a new PIN'],
    signInWithCode: ['পিন ছাড়া কোড দিয়ে ঢুকুন', 'Sign in with a code instead'],
    noAccount: ['হিসাব নেই?', 'No account yet?'],
    haveAccount: ['আগে থেকেই হিসাব আছে?', 'Already have an account?'],
    devCodeNotice: [
      'ডেভেলপমেন্ট মোড: এসএমএস সেবা চালু নেই, তাই কোডটি এখানে দেখানো হচ্ছে।',
      'Development mode: no SMS service is configured, so the code is shown here.',
    ],
    consentLabel: [
      'আমি সম্মত যে আমার দেওয়া তথ্য শুধু যোগ্যতা যাচাই ও সুপারিশের জন্য ব্যবহার করা হবে।',
      'I agree that my information will be used only to check my eligibility and make recommendations.',
    ],
    whyPhone: ['কেন মোবাইল নম্বর?', 'Why a mobile number?'],
    whyPhoneBody: [
      'আমরা ইমেইল চাই না। মোবাইল নম্বরই আপনার পরিচয়, আর শেষ তারিখের আগে মনে করিয়ে দিতে এটিই ব্যবহার হয়।',
      'We do not ask for an email. Your mobile number is your identity, and it is how we remind you before a deadline.',
    ],
  },

  dashboard: {
    greetingMorning: ['শুভ সকাল', 'Good morning'],
    greetingAfternoon: ['শুভ অপরাহ্ন', 'Good afternoon'],
    greetingEvening: ['শুভ সন্ধ্যা', 'Good evening'],
    quickActions: ['দ্রুত কাজ', 'Quick actions'],
    startChat: ['এআইকে জিজ্ঞাসা করুন', 'Ask the assistant'],
    findScholarships: ['বৃত্তি খুঁজুন', 'Find scholarships'],
    findHealthcare: ['চিকিৎসা সহায়তা', 'Find healthcare'],
    findBenefits: ['ভাতা ও সহায়তা', 'Find allowances'],
    findJobs: ['কাজ ও প্রশিক্ষণ', 'Work and training'],
    findNearby: ['কাছের অফিস', 'Nearby offices'],
    recommendedTitle: ['আপনার জন্য সুপারিশ', 'Recommended for you'],
    recommendedEmpty: [
      'আপনার প্রোফাইল একটু পূরণ করলে আমরা সঠিক সুপারিশ দিতে পারব।',
      'Fill in a little more of your profile and we can recommend the right programmes.',
    ],
    profileMeterTitle: ['প্রোফাইল কতটা পূরণ হয়েছে', 'Profile completeness'],
    profileMeterBody: [
      'যত বেশি তথ্য, তত সঠিক সুপারিশ। শুধু যা দরকার সেটাই জিজ্ঞাসা করা হয়।',
      'The more we know, the more accurate the recommendations. We only ask for what is needed.',
    ],
    answerOneQuestion: ['একটি প্রশ্নের উত্তর দিন', 'Answer one question'],
    upcomingTitle: ['সামনের শেষ তারিখ', 'Upcoming deadlines'],
    upcomingEmpty: ['এখন কোনো শেষ তারিখ নেই।', 'No deadlines right now.'],
    savedTitle: ['সেভ করা কর্মসূচি', 'Saved programmes'],
    recentChatTitle: ['সাম্প্রতিক কথা', 'Recent conversation'],
    progressTitle: ['আপনার অগ্রগতি', 'Your progress'],
    tasksDueToday: ['আজকের কাজ', "Today's tasks"],
    noTasksToday: ['আজ কোনো কাজ নেই।', 'No tasks for today.'],
  },

  chat: {
    title: ['এআই সহকারী', 'AI assistant'],
    inputLabel: ['আপনার কথা লিখুন', 'Type your message'],
    inputPlaceholder: [
      'যেমন: আমার স্বামী মারা গেছেন, আমার কী সহায়তা আছে?',
      'For example: my husband has died, what support can I get?',
    ],
    send: ['পাঠান', 'Send'],
    sending: ['পাঠানো হচ্ছে…', 'Sending…'],
    thinking: ['আপনার জন্য খোঁজা হচ্ছে…', 'Looking this up for you…'],
    thinkingLong: [
      'ধৈর্য ধরুন। এখনো খোঁজা হচ্ছে — আপনার লেখা হারায়নি।',
      'Please wait. Still searching — your message has not been lost.',
    ],
    voiceStart: ['মাইক চেপে বলুন', 'Press to speak'],
    voiceStop: ['থামান', 'Stop'],
    voiceListening: ['শুনছি…', 'Listening…'],
    voiceUnsupported: [
      'এই ব্রাউজারে ভয়েস কাজ করে না। আপনি লিখতে পারেন।',
      'Voice input does not work in this browser. You can type instead.',
    ],
    newConversation: ['নতুন কথা শুরু করুন', 'Start a new conversation'],
    history: ['আগের কথা', 'Past conversations'],
    historyEmpty: ['এখনো কোনো কথা হয়নি।', 'No conversations yet.'],
    suggestedTitle: ['এভাবেও জিজ্ঞাসা করতে পারেন', 'You could also ask'],
    suggestion1: ['আমি কী কী ভাতা পেতে পারি?', 'Which allowances can I get?'],
    suggestion2: ['বিদেশে পড়ার বৃত্তি আছে?', 'Are there scholarships to study abroad?'],
    suggestion3: ['ক্যান্সারের চিকিৎসায় সহায়তা আছে?', 'Is there support for cancer treatment?'],
    suggestion4: ['ব্যবসার জন্য ঋণ কোথায় পাব?', 'Where can I get a business loan?'],
    suggestion5: ['বন্যায় ঘর নষ্ট হয়েছে, কী করব?', 'A flood damaged my house — what can I do?'],
    copyResponse: ['উত্তর কপি করুন', 'Copy this answer'],
    helpful: ['কাজে লেগেছে', 'This helped'],
    notHelpful: ['কাজে লাগেনি', 'This did not help'],
    reportIncorrect: ['ভুল তথ্য জানান', 'Report incorrect information'],
    feedbackThanks: [
      'ধন্যবাদ। একজন পর্যালোচক এটি দেখবেন — এআই নিজে থেকে নিয়ম বদলাবে না।',
      'Thank you. A reviewer will look at this — the AI will not change a rule on its own.',
    ],
    engineLive: ['সরাসরি এআই', 'Live AI'],
    engineSimulated: ['সিমুলেটেড এআই', 'Simulated AI'],
    engineSimulatedExplain: [
      'কোনো এআই কী সেট করা নেই, তাই উত্তর তৈরি হচ্ছে নির্দিষ্ট নিয়ম ও টেমপ্লেট দিয়ে। যোগ্যতার সিদ্ধান্ত ও তথ্য একই — শুধু ভাষা কম সহজ।',
      'No AI key is configured, so answers are produced from fixed rules and templates. The eligibility decisions and facts are identical — only the wording is less fluent.',
    ],
    engineDegraded: [
      'এআই সেবা পাওয়া যায়নি, তাই নির্দিষ্ট নিয়ম দিয়ে উত্তর দেওয়া হয়েছে।',
      'The AI service could not be reached, so this answer was produced from fixed rules.',
    ],
    understoodTitle: ['যা বুঝেছি', 'What I understood'],
    savedToProfile: ['প্রোফাইলে যোগ হয়েছে', 'Added to your profile'],
    trustPanelTitle: ['এই উত্তর কীভাবে এলো', 'How this answer was produced'],
    sourcesTitle: ['যেসব তথ্য ব্যবহার করা হয়েছে', 'Information used'],
    noSources: [
      'এই উত্তরের সমর্থনে কোনো নথি পাওয়া যায়নি, তাই আমি অনুমান করিনি।',
      'No document was found to support an answer, so I did not guess.',
    ],
  },

  opportunities: {
    title: ['কর্মসূচি ও সুযোগ', 'Programmes and opportunities'],
    subtitle: [
      'সরকারি ভাতা, বৃত্তি, চিকিৎসা, কৃষি, ব্যবসা ও আইনি সহায়তা এক জায়গায়।',
      'Government allowances, scholarships, healthcare, agriculture, business, and legal aid in one place.',
    ],
    searchPlaceholder: ['কর্মসূচি খুঁজুন', 'Search programmes'],
    filterCategory: ['ধরন', 'Category'],
    filterEligibility: ['যোগ্যতা', 'Eligibility'],
    filterDistrict: ['জেলা', 'District'],
    sortRelevance: ['প্রাসঙ্গিকতা', 'Most relevant'],
    sortDeadline: ['শেষ তারিখ কাছে', 'Deadline soonest'],
    sortNewest: ['নতুন আগে', 'Newest first'],
    sortAmount: ['বেশি টাকা আগে', 'Highest amount'],
    resultsCount: ['{count}টি কর্মসূচি', '{count} programmes'],
    emptyTitle: ['কিছু পাওয়া যায়নি', 'Nothing found'],
    emptyBody: [
      'ফিল্টার কমিয়ে দেখুন, অথবা আপনার পরিস্থিতি লিখে আমাদের জিজ্ঞাসা করুন।',
      'Try fewer filters, or describe your situation and ask us instead.',
    ],
    detailOverview: ['সংক্ষেপে', 'Overview'],
    detailBenefits: ['কী পাবেন', 'What you get'],
    detailEligibility: ['যোগ্যতার শর্ত', 'Eligibility conditions'],
    detailDocuments: ['প্রয়োজনীয় কাগজপত্র', 'Documents you need'],
    detailProcess: ['আবেদনের ধাপ', 'How to apply'],
    detailSources: ['তথ্যের উৎস', 'Sources'],
    detailNearby: ['কাছের অফিস', 'Nearby offices'],
    detailRelated: ['সঙ্গে যেগুলো পেতে পারেন', 'You may also be able to get'],
    detailFaq: ['সাধারণ প্রশ্ন', 'Common questions'],
    issuedBy: ['দেয়', 'Issued by'],
    processingTime: ['সময় লাগে', 'Processing time'],
    commonMistake: ['সাধারণ ভুল', 'Common mistake'],
    tip: ['পরামর্শ', 'Tip'],
    requiredDoc: ['লাগবে', 'Required'],
    optionalDoc: ['থাকলে ভালো', 'Optional'],
    createPlan: ['কাজের পরিকল্পনা তৈরি করুন', 'Create an action plan'],
    creatingPlan: ['পরিকল্পনা তৈরি হচ্ছে…', 'Creating your plan…'],
    checkEligibility: ['আমি যোগ্য কি না দেখুন', 'Check if I qualify'],
    officialSite: ['সরকারি ওয়েবসাইট দেখুন', 'Visit the official website'],
    coverageNationwide: ['সারা দেশে', 'Nationwide'],
    coverageDistricts: ['যেসব জেলায়', 'Available in'],
  },

  eligibility: {
    eligible: ['আপনি যোগ্য', 'You qualify'],
    partiallyEligible: ['আংশিক যোগ্য', 'You may qualify'],
    notEligible: ['এখন প্রযোজ্য নয়', 'Does not apply now'],
    unknown: ['আরও তথ্য দরকার', 'More information needed'],
    whyEligible: ['কেন আপনি যোগ্য', 'Why you qualify'],
    whyNot: ['কেন এখন প্রযোজ্য নয়', 'Why this does not apply now'],
    whatWeNeed: ['কী জানা দরকার', 'What we still need'],
    conditionsMet: ['যেসব শর্ত পূরণ হয়েছে', 'Conditions met'],
    conditionsFailed: ['যেসব শর্ত পূরণ হয়নি', 'Conditions not met'],
    conditionsUnknown: ['যেসব তথ্য জানা নেই', 'Not yet known'],
    youProvided: ['আপনি দিয়েছেন', 'You provided'],
    programmeRequires: ['কর্মসূচির শর্ত', 'The programme requires'],
    softCondition: ['অগ্রাধিকারের শর্ত', 'Priority condition'],
    softConditionBody: [
      'এটি পূরণ না হলেও আপনি বাদ পড়েন না, তবে পূরণ হলে অগ্রাধিকার বাড়ে।',
      'Not meeting this does not disqualify you, but meeting it improves your priority.',
    ],
    decidedByRules: [
      'এই সিদ্ধান্ত নিয়েছে নির্দিষ্ট নিয়ম, এআই নয়।',
      'This decision was made by fixed rules, not by the AI.',
    ],
    answerToDecide: ['উত্তর দিন, তাহলে সিদ্ধান্ত জানাতে পারব', 'Answer this and I can decide'],
    whatIfTitle: ['যদি অন্যরকম হতো?', 'What if it were different?'],
    whatIfBody: [
      'এখানে বদলে দেখতে পারেন কী হয়। আপনার প্রোফাইল বদলাবে না।',
      'Change a value here to see what would happen. Your profile will not change.',
    ],
    ruleVersion: ['নিয়মের সংস্করণ', 'Rule version'],
  },

  /**
   * Voice. Every string here is spoken to, or read by, someone who may not be
   * able to read the screen — so each one says what happened and what to do next,
   * never just what went wrong.
   */
  voice: {
    // ---- the control itself
    button: ['কথা বলে চালান', 'Use your voice'],
    buttonShort: ['বলুন', 'Speak'],
    listening: ['শুনছি…', 'Listening…'],
    listeningHint: ['বলুন — যেমন "সংরক্ষিত" বা "কাছের অফিস"', 'Speak — for example "saved" or "nearby office"'],
    /**
     * The instruction that was missing, and its absence made voice unusable in
     * server mode: the clip is only sent when the citizen says they have finished.
     * Phrased as a completed action rather than "stop", because "stop" reads as
     * abandoning what you were doing — which is what Cancel does.
     */
    doneSpeaking: ['বলা শেষ — পাঠান', 'Finished — send it'],
    doneSpeakingHint: [
      'বলা শেষ হলে "বলা শেষ — পাঠান" চাপুন।',
      'When you have finished speaking, press "Finished — send it".',
    ],
    stopListening: ['থামান', 'Stop'],
    transcribing: ['যা বললেন তা বোঝা হচ্ছে…', 'Working out what you said…'],
    cancel: ['বাতিল', 'Cancel'],

    // ---- what it heard
    heard: ['আপনি বলেছেন', 'You said'],
    heardNothing: [
      'কিছু শোনা যায়নি। বোতাম চেপে ধরে আবার বলুন।',
      'Nothing was heard. Press and hold, then speak again.',
    ],
    correctIt: ['ভুল শুনেছে? লিখে ঠিক করুন', 'Heard it wrong? Type to correct it'],
    submitCorrection: ['এটাই পাঠান', 'Use this'],

    // ---- speaking a number instead of typing it
    speakDigits: ['বলে দিন', 'Say it'],
    speakPhone: ['আপনার মোবাইল নম্বর বলুন', 'Say your mobile number'],
    speakCode: ['কোডটি বলুন', 'Say the code'],
    // Names the required length and tells the citizen HOW to say it. The
    // transcript is appended verbatim by the control, because seeing what was
    // misheard is the only thing that turns a dead end into a fixable problem.
    digitsNotUnderstood: [
      '{count}টি সংখ্যা স্পষ্ট বোঝা যায়নি। একটি একটি করে বলুন। শোনা গেছে:',
      'Could not make out {count} digits. Say them one at a time. Heard:',
    ],

    // ---- confirmation
    confirmTitle: ['এটা করব?', 'Shall I do this?'],
    confirmYes: ['হ্যাঁ, করুন', 'Yes, do it'],
    confirmNo: ['না, থাক', 'No, cancel'],
    confirmSpokenHint: ['"হ্যাঁ" বা "না" বলতে পারেন', 'You can say "yes" or "no"'],
    confirmUnclear: [
      'বুঝতে পারিনি। "হ্যাঁ" বা "না" বলুন, অথবা বোতাম চাপুন।',
      'That was not clear. Say "yes" or "no", or use a button.',
    ],

    // ---- not understood
    unclearTitle: ['এটা বুঝতে পারিনি', 'I did not understand that'],
    unclearBody: [
      'আপনি এগুলোর একটি বলতে চেয়েছিলেন?',
      'Did you mean one of these?',
    ],
    askInstead: ['প্রশ্ন হিসেবে জিজ্ঞাসা করুন', 'Ask it as a question instead'],
    tryAgain: ['আবার বলুন', 'Try again'],

    // ---- errors, each with its own next step
    permissionDenied: [
      'মাইক্রোফোন ব্যবহারের অনুমতি নেই। ব্রাউজারের সেটিংসে অনুমতি দিন, অথবা লিখে চালান।',
      'Microphone permission was refused. Allow it in your browser settings, or type instead.',
    ],
    noMicrophone: [
      'কোনো মাইক্রোফোন পাওয়া যায়নি। লিখে চালাতে পারেন।',
      'No microphone was found. You can type instead.',
    ],
    networkError: [
      'সংযোগ পাওয়া যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।',
      'No connection. Please try again in a moment.',
    ],
    genericError: ['কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'Something went wrong. Please try again.'],

    // ---- unavailable states, stated rather than hidden
    unsupported: [
      'এই ব্রাউজারে কথা বলে চালানো যায় না। ক্রোম ব্রাউজারে চেষ্টা করুন, অথবা লিখে চালান।',
      'This browser cannot listen. Try Chrome, or type instead.',
    ],
    insecure: [
      'নিরাপদ সংযোগ (HTTPS) ছাড়া মাইক্রোফোন ব্যবহার করা যায় না।',
      'The microphone needs a secure (HTTPS) connection.',
    ],
    disabledInSettings: [
      'সেটিংসে ভয়েস বন্ধ আছে। চালু করতে সেটিংসে যান।',
      'Voice is switched off in Settings. Turn it on there to use it.',
    ],

    // ---- typed fallback, so voice navigation works without a microphone
    typeInstead: ['মাইক ছাড়া লিখে চালান', 'Type a command instead'],
    typeInsteadBody: [
      'মাইক ছাড়াও কাজ চলবে। যা বলতেন, সেটাই লিখুন — যেমন "সংরক্ষিত" বা "কাছের অফিস"। কমান্ড বোঝার কাজটি এই ফোনেই হয়, ইন্টারনেট ছাড়াই।',
      'This works without a microphone. Type what you would have said — for example "saved" or "nearby office". Commands are understood on your own device, with no internet needed.',
    ],
    typeCommandLabel: ['কমান্ড লিখুন', 'Type a command'],
    typeCommandHelper: ['যেমন: সংরক্ষিত, সময়সূচি, কাছের অফিস', 'For example: saved, timeline, nearby office'],
    runCommand: ['চালান', 'Run it'],

    // ---- self-diagnosis, so "why is the button off?" is answerable on screen
    capabilities: ['এই ফোনে কী কাজ করে', 'What works on this device'],
    // First in the list on purpose: it is the answer to "why is nothing
    // happening", and the rest are only useful for explaining it.
    capMicUsable: ['মাইক্রোফোন ব্যবহার করা যাচ্ছে', 'Microphone usable now'],
    capMode: ['যে পথে কাজ হচ্ছে', 'Path in use'],
    capRecognition: ['ব্রাউজারে কথা শোনা', 'Speech recognition in the browser'],
    capRecording: ['রেকর্ড করা', 'Audio recording'],
    capServerStt: ['সার্ভারে কথা বোঝা', 'Server transcription'],
    capSynthesis: ['পড়ে শোনানো', 'Speech output'],
    capBanglaVoice: ['বাংলা কণ্ঠ', 'Bangla voice'],
    capSecure: ['নিরাপদ সংযোগ', 'Secure connection'],

    // ---- read aloud
    readAloud: ['পড়ে শোনান', 'Read aloud'],
    stopReading: ['পড়া থামান', 'Stop reading'],
    reading: ['পড়ছি…', 'Reading…'],
    noBanglaVoice: [
      'এই ফোনে বাংলা কণ্ঠ নেই, তাই পড়ে শোনানো যাচ্ছে না। ফোনের সেটিংসে বাংলা ভাষার কণ্ঠ যোগ করলে কাজ করবে।',
      'This device has no Bangla voice installed, so it cannot read aloud. Adding a Bangla voice in your device settings will enable it.',
    ],
    // A list read aloud has no scrollbar. Saying nothing about the items left
    // out would tell the listener they have heard everything — so the clip ends
    // by admitting what it skipped and where to find it.
    moreNotRead: [
      'আরও {count}টি আছে, পর্দায় দেখতে পারেন',
      '{count} more are on the screen',
    ],
    nothingToRead: [
      'এই পাতায় পড়ে শোনানোর মতো কিছু নেই',
      'There is nothing on this page to read out',
    ],

    // ---- help
    helpTitle: ['কী কী বলতে পারেন', 'What you can say'],
    helpIntro: [
      'যেকোনো পাতা থেকে এগুলো বলতে পারেন। যা কিছু বদলে দেবে, তার আগে জিজ্ঞাসা করা হবে।',
      'You can say these from any page. Anything that changes something will ask you first.',
    ],
    helpGroupNavigate: ['যেখানে যেতে চান', 'Going somewhere'],
    helpGroupAction: ['যা করতে চান', 'Doing something'],
    helpGroupMeta: ['ভয়েস নিয়ন্ত্রণ', 'Voice controls'],
    helpConfirmNote: [
      'এগুলোর আগে সবসময় নিশ্চিত করা হবে',
      'These always ask for confirmation first',
    ],

    // ---- command labels, shown in help and in the confirmation
    navDashboard: ['প্রথম পাতায় যান', 'Go to the home page'],
    navChat: ['প্রশ্ন করুন', 'Ask a question'],
    navOpportunities: ['কর্মসূচির তালিকা দেখুন', 'Browse programmes'],
    navSaved: ['সংরক্ষিত তালিকা দেখুন', 'Open your saved list'],
    navTimeline: ['সময়সূচি ও শেষ তারিখ দেখুন', 'Open your timeline and deadlines'],
    navNearby: ['কাছের অফিস খুঁজুন', 'Find nearby offices'],
    navNotifications: ['বিজ্ঞপ্তি দেখুন', 'Open notifications'],
    navProfile: ['প্রোফাইল দেখুন', 'Open your profile'],
    navSettings: ['সেটিংসে যান', 'Open settings'],
    navAdmin: ['প্রশাসন পাতায় যান', 'Open the admin area'],
    navAdminProgrammes: ['কর্মসূচি ব্যবস্থাপনায় যান', 'Manage programmes'],
    navAdminOrganisations: ['সংস্থার তালিকায় যান', 'Manage organisations'],
    navAdminRules: ['যোগ্যতার নিয়ম সম্পাদনায় যান', 'Edit eligibility rules'],
    navAdminModeration: ['পর্যালোচনার তালিকায় যান', 'Open the review queue'],
    navAdminUsers: ['ব্যবহারকারীর তালিকায় যান', 'Manage users'],
    navAdminAiLogs: ['এআই লগে যান', 'Open the AI logs'],
    searchOpportunities: ['কর্মসূচি খুঁজুন', 'Search programmes'],
    filterCategory: ['ধরন অনুযায়ী দেখুন', 'Filter by category'],
    filterLifeEvent: ['পরিস্থিতি অনুযায়ী দেখুন', 'Filter by situation'],
    filterDistrict: ['জেলা অনুযায়ী দেখুন', 'Filter by district'],
    actionSave: ['এই কর্মসূচি সংরক্ষণ করুন', 'Save this programme'],
    actionUnsave: ['তালিকা থেকে সরিয়ে দিন', 'Remove it from your list'],
    actionApplyStarted: ['আবেদন করেছি বলে চিহ্নিত করুন', 'Mark it as applied'],
    actionTaskDone: ['কাজটি সম্পন্ন বলে চিহ্নিত করুন', 'Mark the task done'],
    actionCheckEligibility: ['আমি যোগ্য কি না দেখুন', 'Check whether you qualify'],
    actionSignOut: ['সাইন আউট করুন', 'Sign out'],
    actionMarkAllRead: ['সব বিজ্ঞপ্তি পড়া হয়েছে বলে চিহ্নিত করুন', 'Mark every notification as read'],
    actionNewChat: ['নতুন কথা শুরু করুন', 'Start a new conversation'],
    actionBiggerText: ['লেখা বড় করুন', 'Make the text bigger'],
    actionSmallerText: ['লেখা ছোট করুন', 'Make the text smaller'],
    // Spoken back after a text-size change, because the citizen who asked for it
    // may not be able to read the result well enough to confirm it worked.
    textSizeNow: ['লেখার আকার এখন {percent} শতাংশ', 'Text size is now {percent} percent'],
    textSizeMax: ['লেখা এর চেয়ে বড় করা যায় না', 'The text cannot get any bigger'],
    textSizeMin: ['লেখা এখন স্বাভাবিক আকারে আছে', 'The text is back to its normal size'],
    metaReadAloud: ['পড়ে শোনান', 'Read this aloud'],
    metaStopReading: ['পড়া থামান', 'Stop reading'],
    metaRepeat: ['আবার বলুন', 'Say that again'],
    metaHelp: ['কী কী বলা যায় দেখুন', 'Show what you can say'],
    metaBack: ['আগের পাতায় ফিরুন', 'Go back'],
    metaYes: ['হ্যাঁ', 'Yes'],
    metaNo: ['না', 'No'],
  },

  trust: {
    confidence: ['আস্থার মাত্রা', 'Confidence'],
    high: ['উচ্চ', 'High'],
    medium: ['মধ্যম', 'Medium'],
    low: ['কম', 'Low'],
    verified: ['যাচাই করা', 'Verified'],
    unverifiedSample: ['নমুনা তথ্য — যাচাই করা হয়নি', 'Sample data — not verified'],
    pendingReview: ['পর্যালোচনার অপেক্ষায়', 'Awaiting review'],
    outdated: ['পুরনো হয়ে গেছে', 'Out of date'],
    disputed: ['তথ্য নিয়ে প্রশ্ন উঠেছে', 'Disputed'],
    unverifiedExplain: [
      'এই তথ্য নমুনা হিসেবে লেখা হয়েছে, কোনো সরকারি পরিপত্র থেকে যাচাই করা হয়নি। আবেদনের আগে সংশ্লিষ্ট অফিসে নিশ্চিত করে নিন।',
      'This record was authored as a sample and has not been checked against an official circular. Confirm at the relevant office before applying.',
    ],
    lastVerified: ['সর্বশেষ যাচাই', 'Last verified'],
    neverVerified: ['কখনো যাচাই হয়নি', 'Never verified'],
    whyThisConfidence: ['এই মাত্রা কেন', 'Why this level'],
    factorRetrieval: ['তথ্য খোঁজার মান', 'Search quality'],
    factorRules: ['নিয়ম কতটা যাচাই হয়েছে', 'Rule completeness'],
    factorSources: ['সমর্থনকারী নথি', 'Supporting sources'],
    factorFreshness: ['তথ্য কত নতুন', 'Data freshness'],
    factorMetadata: ['তথ্যের পূর্ণতা', 'Record completeness'],
  },

  saved: {
    title: ['সেভ করা কর্মসূচি', 'Saved programmes'],
    emptyTitle: ['এখনো কিছু সেভ করেননি', 'You have not saved anything yet'],
    emptyBody: [
      'যেসব কর্মসূচি কাজে লাগতে পারে সেগুলো সেভ করে রাখুন — শেষ তারিখের আগে মনে করিয়ে দেব।',
      'Save the programmes that might help you, and we will remind you before the deadline.',
    ],
    exploreButton: ['কর্মসূচি দেখুন', 'Explore programmes'],
    statusInterested: ['আগ্রহী', 'Interested'],
    statusPreparing: ['প্রস্তুতি নিচ্ছি', 'Preparing'],
    statusDocumentsReady: ['কাগজ তৈরি', 'Documents ready'],
    statusApplied: ['আবেদন করেছি', 'Applied'],
    statusUnderReview: ['যাচাই চলছে', 'Under review'],
    statusApproved: ['অনুমোদিত', 'Approved'],
    statusRejected: ['বাতিল', 'Rejected'],
    statusCompleted: ['সম্পন্ন', 'Completed'],
    changeStatus: ['অবস্থা বদলান', 'Change status'],
    removeSaved: ['সেভ করা তালিকা থেকে সরান', 'Remove from saved'],
    removed: ['সরিয়ে দেওয়া হয়েছে', 'Removed'],
    noteLabel: ['নিজের জন্য নোট', 'A note for yourself'],
  },

  plan: {
    title: ['কাজের পরিকল্পনা', 'Action plan'],
    emptyTitle: ['কোনো পরিকল্পনা নেই', 'No action plan yet'],
    emptyBody: [
      'কোনো কর্মসূচি খুলে "কাজের পরিকল্পনা তৈরি করুন" চাপুন — দিন ধরে ধরে করার তালিকা পাবেন।',
      'Open a programme and press "Create an action plan" to get a day-by-day list.',
    ],
    taskPending: ['বাকি আছে', 'To do'],
    taskInProgress: ['চলছে', 'In progress'],
    taskDone: ['হয়ে গেছে', 'Done'],
    taskSkipped: ['বাদ দেওয়া হয়েছে', 'Skipped'],
    markDone: ['হয়ে গেছে বলে চিহ্নিত করুন', 'Mark as done'],
    markPending: ['আবার বাকি বলে চিহ্নিত করুন', 'Mark as still to do'],
    priorityHigh: ['জরুরি', 'Urgent'],
    priorityMedium: ['স্বাভাবিক', 'Normal'],
    priorityLow: ['পরে করলেও হবে', 'Can wait'],
    estimatedTime: ['সময় লাগবে প্রায়', 'Takes about'],
    minutes: ['মিনিট', 'minutes'],
    progressLabel: ['{done} / {total} সম্পন্ন', '{done} of {total} done'],
    allDone: ['সব কাজ শেষ! এবার আবেদনের অবস্থা দেখুন।', 'All tasks done. Now check your application status.'],
  },

  timeline: {
    title: ['সময়সূচি', 'Timeline'],
    subtitle: [
      'শেষ তারিখ, কাজ, নবায়ন ও মনে করানো — সব এক জায়গায়।',
      'Deadlines, tasks, renewals, and reminders in one place.',
    ],
    viewMonth: ['মাস', 'Month'],
    viewWeek: ['সপ্তাহ', 'Week'],
    viewAgenda: ['তালিকা', 'List'],
    today: ['আজ', 'Today'],
    emptyTitle: ['সময়সূচিতে কিছু নেই', 'Nothing on your timeline'],
    emptyBody: [
      'কর্মসূচি সেভ করলে বা পরিকল্পনা তৈরি করলে শেষ তারিখ ও কাজ এখানে দেখা যাবে।',
      'Save a programme or create an action plan and deadlines and tasks will appear here.',
    ],
    typeDeadline: ['শেষ তারিখ', 'Deadline'],
    typeTask: ['কাজ', 'Task'],
    typeReminder: ['মনে করানো', 'Reminder'],
    typeRenewal: ['নবায়ন', 'Renewal'],
    typeTraining: ['প্রশিক্ষণ', 'Training'],
    typeApplicationProgress: ['আবেদনের অবস্থা', 'Application status'],
    typeDocumentExpiry: ['কাগজের মেয়াদ', 'Document expiry'],
    typeScholarshipWindow: ['বৃত্তির সময়', 'Scholarship window'],
    typeAnnouncement: ['ঘোষণা', 'Announcement'],
    // Spoken openers for read-aloud. The counts come first because "how much is
    // waiting for me" is the question this screen exists to answer, and a
    // listener needs it before the list starts.
    spokenUpcoming: ['সামনে {count}টি কাজ আছে', 'You have {count} things coming up'],
    spokenOverdue: ['{count}টির সময় পেরিয়ে গেছে', '{count} are past their date'],
    spokenNothing: ['সামনে কোনো কাজ নেই', 'Nothing is coming up'],
  },

  nearby: {
    title: ['কাছের সেবা কেন্দ্র', 'Nearby services'],
    subtitle: [
      'সমাজসেবা, হাসপাতাল, কৃষি, আইনি সহায়তা ও প্রশিক্ষণ কেন্দ্র।',
      'Social services, hospitals, agriculture, legal aid, and training centres.',
    ],
    useMyLocation: ['আমার অবস্থান ব্যবহার করুন', 'Use my location'],
    locating: ['অবস্থান খোঁজা হচ্ছে…', 'Finding your location…'],
    locationDenied: [
      'অবস্থান পাওয়া যায়নি। আপনার জেলা বেছে নিলেই তালিকা দেখাব।',
      'Could not get your location. Choose your district and we will show the list.',
    ],
    // Distance copy comes in two forms, because the reference point changes what
    // the number means. Claiming "from you" while measuring from a district
    // centroid would overstate the precision by tens of kilometres.
    distanceFromDistrict: [
      'দূরত্ব প্রায় হিসাব — জেলা শহরের কেন্দ্র থেকে মাপা। আপনার অবস্থান দিলে সঠিক দূরত্ব দেখাতে পারব।',
      'Distances are approximate, measured from the centre of the district town. Share your location for exact distances.',
    ],
    distanceFromYou: [
      'দূরত্ব আপনার অবস্থান থেকে সরলরেখায় মাপা — রাস্তার দূরত্ব বেশি হবে।',
      'Distances are straight-line from where you are. The road distance will be longer.',
    ],
    distanceApproxNote: [
      'দূরত্ব প্রায় হিসাব — জেলা শহর থেকে মাপা।',
      'Distances are approximate, measured from the district town.',
    ],
    mapUnavailable: [
      'মানচিত্র সেবা চালু নেই, তাই দূরত্ব অনুযায়ী তালিকা দেখানো হচ্ছে।',
      'No map service is configured, so the list is shown ordered by distance.',
    ],

    // ---- map
    mapLabel: ['সেবা কেন্দ্রের মানচিত্র', 'Map of service locations'],
    mapKeyboardHelp: [
      'তির চিহ্ন দিয়ে সরান, + / − দিয়ে ছোট-বড় করুন, Home চাপলে আবার সব দেখা যাবে।',
      'Arrow keys pan, + and − zoom, Home re-frames everything.',
    ],
    zoomIn: ['বড় করে দেখুন', 'Zoom in'],
    zoomOut: ['ছোট করে দেখুন', 'Zoom out'],
    recentreMap: ['সব আবার দেখান', 'Show everything again'],
    osmContributors: ['অবদানকারীরা', 'contributors'],
    yourLocation: ['আপনার অবস্থান', 'Your location'],
    districtCentre: ['জেলা শহরের কেন্দ্র', 'Centre of the district town'],
    showMap: ['মানচিত্র দেখান', 'Show the map'],
    hideMap: ['মানচিত্র লুকান', 'Hide the map'],

    // ---- provenance. Which half of the list a record came from, never implied.
    sourceOsm: ['OpenStreetMap — সত্যিকারের অবস্থান', 'OpenStreetMap — real location'],
    sourceOsmNote: [
      'এই জায়গাগুলো OpenStreetMap থেকে নেওয়া — স্বেচ্ছাসেবীরা তথ্য দিয়েছেন, তাই সত্যিকারের হলেও আমরা যাচাই করিনি। ফোন নম্বর বা সময় নাও থাকতে পারে।',
      'These places come from OpenStreetMap, contributed by volunteers. They are real, but not verified by us, and may have no phone number or opening hours.',
    ],
    sourceSeed: ['নমুনা তথ্য', 'Sample record'],
    osmUnavailable: [
      'এই মুহূর্তে OpenStreetMap থেকে সত্যিকারের অবস্থান আনা যাচ্ছে না, তাই শুধু নমুনা তালিকা দেখানো হচ্ছে।',
      'Real locations could not be fetched from OpenStreetMap just now, so only the sample list is shown.',
    ],
    osmCount: [
      'OpenStreetMap থেকে {count}টি সত্যিকারের জায়গা দেখানো হচ্ছে',
      'Showing {count} real places from OpenStreetMap',
    ],
    // Says plainly that the list is trimmed. Central Dhaka has thousands of
    // matching places; showing sixty and implying that is all of them would be a
    // silent truncation, and a citizen would stop looking.
    osmTrimmed: [
      'এই এলাকায় আরও অনেক আছে — কাছের {count}টি দেখানো হচ্ছে। ধরন বেছে নিলে সেই ধরনের সব দেখতে পাবেন।',
      'There are many more in this area — the nearest {count} are shown. Pick a type to see all of that kind.',
    ],
    emergencyDept: ['২৪ ঘণ্টা ইমার্জেন্সি', '24-hour emergency'],
    website: ['ওয়েবসাইট', 'Website'],
    noPhoneKnown: ['ফোন নম্বর জানা নেই', 'No phone number recorded'],
    officeHours: ['খোলা থাকে', 'Open'],
    callOffice: ['ফোন করুন', 'Call'],
    getDirections: ['যাওয়ার পথ', 'Directions'],
    servicesHere: ['এখানে যা পাওয়া যায়', 'Available here'],
    typeAll: ['সব ধরনের', 'All types'],
    emptyTitle: ['এই এলাকায় কিছু পাওয়া যায়নি', 'Nothing found in this area'],
    unverifiedNote: [
      'ঠিকানা ও ফোন নম্বর এখনো যাচাই করা হয়নি। যাওয়ার আগে ফোন করে নিশ্চিত হয়ে নিন, অথবা ৩৩৩ নম্বরে কল করুন।',
      'Addresses and phone numbers are not yet verified. Call ahead to confirm, or dial 333 for national help.',
    ],
  },

  profile: {
    title: ['আপনার প্রোফাইল', 'Your profile'],
    subtitle: [
      'যা দেবেন তাই দিয়ে যোগ্যতা যাচাই হয়। যেটা দিতে চান না, দেবেন না।',
      'Eligibility is checked using what you provide. Leave out anything you would rather not share.',
    ],
    sectionPersonal: ['নিজের তথ্য', 'About you'],
    sectionLocation: ['ঠিকানা', 'Where you live'],
    sectionEducation: ['শিক্ষা', 'Education'],
    sectionWork: ['কাজ ও আয়', 'Work and income'],
    sectionFamily: ['পরিবার', 'Family'],
    sectionLand: ['জমি ও কৃষি', 'Land and farming'],
    sectionBusiness: ['ব্যবসা', 'Business'],
    sectionHealth: ['স্বাস্থ্য', 'Health'],
    sectionDocuments: ['কাগজপত্র', 'Documents'],
    healthConsentTitle: ['স্বাস্থ্য তথ্য শেয়ার করবেন?', 'Share health information?'],
    healthConsentBody: [
      'ক্যান্সার, কিডনি বা প্রতিবন্ধিতার মতো তথ্য দিলে আমরা সেই সংক্রান্ত সহায়তা খুঁজে দিতে পারি। অনুমতি না দিলে এই তথ্য সংরক্ষণ করা হয় না, আর যেকোনো সময় প্রত্যাহার করলে মুছে ফেলা হয়।',
      'If you share details such as cancer, kidney disease, or a disability, we can find support specific to it. Without your permission this is not stored, and withdrawing permission deletes it.',
    ],
    dobLabel: ['জন্ম তারিখ', 'Date of birth'],
    dobDay: ['দিন', 'Day'],
    dobMonth: ['মাস', 'Month'],
    dobYear: ['বছর', 'Year'],
    ageConfirm: ['আপনার বয়স {age} বছর — ঠিক আছে?', 'That makes you {age} years old — is that right?'],
    genderLabel: ['লিঙ্গ', 'Gender'],
    maritalLabel: ['বৈবাহিক অবস্থা', 'Marital status'],
    occupationLabel: ['পেশা', 'Occupation'],
    incomeLabel: ['মাসিক আয় (টাকা)', 'Monthly income (taka)'],
    incomeHelp: [
      'পরিবারের সব মিলিয়ে মাসে কত আসে, প্রায় হিসাব করে লিখুন।',
      'Roughly how much the whole household brings in per month.',
    ],
    educationLabel: ['সর্বোচ্চ শিক্ষা', 'Highest education'],
    cgpaLabel: ['সিজিপিএ', 'CGPA'],
    universityLabel: ['বিশ্ববিদ্যালয়', 'University'],
    departmentLabel: ['বিভাগ', 'Department'],
    householdLabel: ['পরিবারে কতজন', 'People in your household'],
    dependentsLabel: ['কতজন আপনার উপর নির্ভরশীল', 'People who depend on you'],
    landLabel: ['জমির পরিমাণ (শতাংশ)', 'Land you own (decimals)'],
    disabilityLabel: ['প্রতিবন্ধিতা আছে?', 'Do you have a disability?'],
    disabilityTypeLabel: ['প্রতিবন্ধিতার ধরন', 'Type of disability'],
    pregnantLabel: ['আপনি কি গর্ভবতী?', 'Are you pregnant?'],
    studentLabel: ['আপনি কি শিক্ষার্থী?', 'Are you a student?'],
    businessLabel: ['আপনার ব্যবসা আছে?', 'Do you have a business?'],
    nidLabel: ['জাতীয় পরিচয়পত্র আছে?', 'Do you have a National ID?'],
    bankLabel: ['ব্যাংক হিসাব আছে?', 'Do you have a bank account?'],
    freedomFighterLabel: ['মুক্তিযোদ্ধা পরিবারের সদস্য?', 'Freedom fighter family member?'],
    conditionsLabel: ['রোগ বা শারীরিক অবস্থা', 'Illness or condition'],
    interestsLabel: ['কী বিষয়ে আগ্রহী', 'What you are interested in'],
    cropsLabel: ['যে ফসল চাষ করেন', 'Crops you grow'],
    savedChanges: ['তথ্য সেভ হয়েছে', 'Your details are saved'],
    unsavedWarning: [
      'সেভ না করা পরিবর্তন আছে।',
      'You have changes that are not saved.',
    ],
    whyWeAsk: ['কেন জিজ্ঞাসা করছি', 'Why we ask'],
  },

  settings: {
    title: ['সেটিংস', 'Settings'],
    appearance: ['দেখার ধরন', 'Appearance'],
    themeLight: ['স্বাভাবিক', 'Normal'],
    themeDark: ['অন্ধকার', 'Dark'],
    themeSunlight: ['রোদে দেখা কঠিন?', 'Hard to see in sunlight?'],
    themeSunlightBody: [
      'বাইরে রোদে পর্দা দেখতে অসুবিধা হলে এটি চালু করুন — লেখা আরও গাঢ় ও মোটা হবে।',
      'Turn this on if the screen is hard to read outdoors — text becomes darker and heavier.',
    ],
    textSize: ['লেখার আকার', 'Text size'],
    textSizeNormal: ['স্বাভাবিক', 'Normal'],
    textSizeLarge: ['বড়', 'Large'],
    textSizeLarger: ['আরও বড়', 'Larger'],
    textSizeLargest: ['সবচেয়ে বড়', 'Largest'],
    textSizePreview: [
      'এই লেখাটি দেখে বুঝে নিন আকারটি আপনার জন্য ঠিক আছে কি না।',
      'Read this line to check whether the size suits you.',
    ],
    numerals: ['সংখ্যা দেখানোর ধরন', 'Number style'],
    numeralsLatin: ['1 2 3 (ইংরেজি সংখ্যা)', '1 2 3 (Latin digits)'],
    numeralsBengali: ['১ ২ ৩ (বাংলা সংখ্যা)', '১ ২ ৩ (Bangla digits)'],
    numeralsHelp: [
      'এসএমএস, জাতীয় পরিচয়পত্র ও ব্যাংকের কাগজে সাধারণত ইংরেজি সংখ্যা থাকে, তাই সেটিই স্বাভাবিক রাখা হয়েছে।',
      'SMS messages, National IDs, and bank papers mostly use Latin digits, so that is the default.',
    ],
    accessibility: ['সহজে ব্যবহার', 'Accessibility'],
    reduceMotion: ['নড়াচড়া কমান', 'Reduce motion'],
    reduceMotionBody: [
      'পর্দার নড়াচড়া অস্বস্তিকর লাগলে এটি চালু করুন।',
      'Turn this on if on-screen movement feels uncomfortable.',
    ],
    voiceEnabled: ['ভয়েস দিয়ে কথা বলা', 'Voice input'],
    notifications: ['কী কী জানাব', 'What we tell you'],
    notifyDeadlines: ['শেষ তারিখ কাছে এলে', 'When a deadline is near'],
    notifyNew: ['নতুন সুযোগ এলে', 'When a new opportunity appears'],
    notifyUpdates: ['কর্মসূচি বদলালে', 'When a programme changes'],
    notifyChannelPush: ['ফোনে নোটিফিকেশন', 'Phone notification'],
    notifyChannelEmail: ['ইমেইল', 'Email'],
    notifyChannelSms: ['এসএমএস', 'SMS'],
    smsUnavailable: [
      'এসএমএস সেবা এখনো চালু হয়নি।',
      'SMS delivery is not enabled yet.',
    ],
    privacy: ['গোপনীয়তা', 'Privacy'],
    exportData: ['আমার সব তথ্য নামান', 'Download all my data'],
    exportDataBody: [
      'আপনার প্রোফাইল, কথা, সেভ করা কর্মসূচি ও পরিকল্পনা — সব একটি ফাইলে।',
      'Your profile, conversations, saved programmes, and plans in one file.',
    ],
    deleteAccount: ['হিসাব মুছে ফেলুন', 'Delete my account'],
    deleteAccountBody: [
      'আপনার প্রোফাইল, কথা ও সেভ করা সব কিছু স্থায়ীভাবে মুছে যাবে। এটি ফিরিয়ে আনা যায় না।',
      'Your profile, conversations, and everything saved will be permanently removed. This cannot be undone.',
    ],
    deleteConfirmTitle: ['সত্যিই হিসাব মুছে ফেলবেন?', 'Really delete your account?'],
    deleteConfirmBody: [
      'সব তথ্য স্থায়ীভাবে মুছে যাবে এবং ফিরিয়ে আনা যাবে না। নিশ্চিত হতে নিচে DELETE লিখুন।',
      'Everything will be permanently removed and cannot be recovered. Type DELETE below to confirm.',
    ],
    deleteConfirmLabel: ['নিশ্চিত করতে DELETE লিখুন', 'Type DELETE to confirm'],
    deleteConfirmButton: ['হিসাব স্থায়ীভাবে মুছুন', 'Permanently delete my account'],
    deleting: ['মুছে ফেলা হচ্ছে…', 'Deleting…'],
    keepAccount: ['না, হিসাব রেখে দিন', 'No, keep my account'],
    sessions: ['যেসব ডিভাইসে ঢোকা আছে', 'Signed-in devices'],
    signOutEverywhere: ['সব ডিভাইস থেকে বের হন', 'Sign out everywhere'],
  },

  notifications: {
    title: ['নোটিফিকেশন', 'Notifications'],
    markAllRead: ['সব পড়া হয়েছে বলে চিহ্নিত করুন', 'Mark all as read'],
    emptyTitle: ['কোনো নোটিফিকেশন নেই', 'No notifications'],
    emptyBody: [
      'শেষ তারিখ কাছে এলে বা নতুন সুযোগ পেলে এখানে জানাব।',
      'We will tell you here when a deadline is near or a new opportunity appears.',
    ],
    unreadCount: ['{count}টি নতুন', '{count} new'],
  },

  admin: {
    title: ['প্রশাসন', 'Administration'],
    overview: ['সারসংক্ষেপ', 'Overview'],
    programmes: ['কর্মসূচি', 'Programmes'],
    organizations: ['সংস্থা', 'Organisations'],
    rules: ['যোগ্যতার নিয়ম', 'Eligibility rules'],
    moderation: ['পর্যালোচনা', 'Review queue'],
    aiLogs: ['এআই লগ', 'AI logs'],
    users: ['ব্যবহারকারী', 'Users'],
    jobs: ['নির্ধারিত কাজ', 'Scheduled jobs'],
    health: ['সিস্টেমের অবস্থা', 'System health'],
    analytics: ['পরিসংখ্যান', 'Analytics'],
    auditLog: ['কার্যবিবরণী', 'Audit log'],
    runJob: ['এখনই চালান', 'Run now'],
    running: ['চলছে…', 'Running…'],
    verifyRecord: ['যাচাই করা হয়েছে বলে চিহ্নিত করুন', 'Mark as verified'],
    verifyWarning: [
      'যাচাই করা বলে চিহ্নিত করার অর্থ আপনি নিশ্চিত করছেন যে এটি সরকারি পরিপত্রের সঙ্গে মিলিয়ে দেখা হয়েছে।',
      'Marking this verified asserts that you have checked it against the official circular.',
    ],
    smokeTestTitle: ['নিয়ম পরীক্ষার ফল', 'Rule check results'],
    smokeTestWarnings: ['যেসব বিষয়ে খেয়াল রাখা দরকার', 'Things to look at'],
    noWarnings: ['কোনো সমস্যা পাওয়া যায়নি।', 'No problems found.'],
    missingRules: ['নিয়ম নেই', 'No rules'],
    missingRulesWarning: [
      'নিয়ম না থাকলে এই কর্মসূচি সবার জন্য "আরও তথ্য দরকার" দেখাবে।',
      'Without rules this programme will always show "more information needed".',
    ],
    approve: ['অনুমোদন করুন', 'Approve'],
    reject: ['বাতিল করুন', 'Reject'],
    dismiss: ['বাদ দিন', 'Dismiss'],
    markActioned: ['ব্যবস্থা নেওয়া হয়েছে', 'Actioned'],
    reviewerNote: ['পর্যালোচকের নোট', 'Reviewer note'],
    groundingFailures: ['উৎসহীন উত্তর', 'Answers without a source'],
    groundingFailuresBody: [
      'যেসব উত্তরে কোনো নথি উদ্ধৃত হয়নি। এগুলো পরীক্ষা করা দরকার।',
      'Answers that cited no document. These need checking.',
    ],
    issuesTab: ['এলাকার সমস্যা', 'Local issues'],
    autoFlagged: ['স্বয়ংক্রিয়ভাবে চিহ্নিত', 'Auto-flagged'],
    civicRoles: ['নাগরিক পদবি', 'Civic roles'],
    assignCivicRole: ['পদবি নির্ধারণ করুন', 'Assign role'],
    noCivicRole: ['কোনো পদবি নেই', 'No civic title'],
    ledgerIntegrity: ['লেজার যাচাই', 'Ledger integrity'],
    financialLedger: ['আর্থিক লেজার', 'Financial ledger'],
    auditLogChain: ['কার্যবিবরণী চেইন', 'Audit log chain'],
    donorOrgs: ['দাতা সংস্থা', 'Donor organisations'],
    createDonorOrg: ['নতুন দাতা সংস্থা যোগ করুন', 'Add a donor organisation'],
    donorOrgName: ['সংস্থার নাম', 'Organisation name'],
    donorProgramCodes: ['যেসব কর্মসূচিতে অর্থায়ন করে', 'Programme codes funded'],
    noDonorOrg: ['কোনো দাতা সংস্থা নয়', 'Not a donor representative'],
    assignDonorOrg: ['দাতা সংস্থা নির্ধারণ করুন', 'Assign donor organisation'],
    smsOutbox: ['এসএমএস আউটবক্স (ডেমো)', 'SMS outbox (demo)'],
    smsOutboxEmpty: ['এখনও কোনো ডেমো এসএমএস পাঠানো হয়নি।', 'No demo SMS sent yet.'],
  },

  identity: {
    title: ['পরিচয় যাচাই', 'Verify your identity'],
    subtitle: [
      'এলাকার সমস্যা জানাতে ও ভোট দিতে আপনার জাতীয় পরিচয়পত্র ও ইউনিয়ন যাচাই করা প্রয়োজন।',
      'Reporting problems and voting requires verifying your National ID and your union.',
    ],
    simulatedNotice: [
      'এই প্রোটোটাইপে যাচাই অনুকরণ করা হয় — সংখ্যার গঠন পরীক্ষা করা হয়, সরকারি ডেটাবেসের সঙ্গে মেলানো হয় না।',
      'Verification is simulated in this prototype — the number’s format is checked, not matched against a government database.',
    ],
    nidSectionTitle: ['জাতীয় পরিচয়পত্র', 'National ID'],
    nidLabel: ['জাতীয় পরিচয়পত্র নম্বর', 'National ID number'],
    nidHelper: ['১০, ১৩, অথবা ১৭ সংখ্যার নম্বর', 'A 10, 13, or 17 digit number'],
    nidVerify: ['যাচাই করুন', 'Verify'],
    nidStatusUnverified: ['যাচাই করা হয়নি', 'Not verified'],
    nidStatusSimulated: ['অনুকরণে যাচাই হয়েছে', 'Simulated verification'],
    nidStatusRejected: ['যাচাই ব্যর্থ হয়েছে', 'Verification failed'],
    residencySectionTitle: ['আপনার ইউনিয়ন', 'Your union'],
    residencyHelper: [
      'আপনার অবস্থান জানান, অথবা তালিকা থেকে ইউনিয়ন বেছে নিন।',
      'Share your location, or choose your union from the list.',
    ],
    useMyLocation: ['আমার অবস্থান ব্যবহার করুন', 'Use my location'],
    locating: ['অবস্থান খোঁজা হচ্ছে…', 'Finding your location…'],
    locationFailed: [
      'আপনার অবস্থান কোনো পরিচিত ইউনিয়নের মধ্যে পাওয়া যায়নি। তালিকা থেকে বেছে নিন।',
      'Your location did not match a known union. Choose from the list instead.',
    ],
    locationDenied: [
      'অবস্থান পাওয়া যায়নি। তালিকা থেকে বেছে নিন।',
      'Could not get your location. Choose from the list instead.',
    ],
    chooseUnion: ['ইউনিয়ন বেছে নিন', 'Choose your union'],
    residencyVerifiedGps: ['অবস্থান দিয়ে যাচাই হয়েছে', 'Verified by location'],
    residencyVerifiedManual: ['তালিকা থেকে বেছে নেওয়া হয়েছে', 'Chosen from the list'],
    residencyNotVerified: ['ইউনিয়ন যাচাই করা হয়নি', 'Union not verified'],
  },

  issues: {
    title: ['এলাকার সমস্যা', 'Local issues'],
    subtitle: [
      'আপনার ইউনিয়নের সমস্যা জানান এবং অন্যদের জানানো সমস্যায় সমর্থন দিন।',
      'Report a problem in your union, and support the ones your neighbours have reported.',
    ],
    reportIssue: ['সমস্যা জানান', 'Report a problem'],
    myReports: ['আমার জানানো সমস্যা', 'My reports'],
    sortTop: ['জনপ্রিয়', 'Most supported'],
    sortRecent: ['সাম্প্রতিক', 'Most recent'],
    empty: ['এখনো কোনো সমস্যা জানানো হয়নি।', 'No issues reported yet.'],
    needsVerification: [
      'এলাকার সমস্যা দেখতে ও জানাতে আগে আপনার ইউনিয়ন যাচাই করুন।',
      'Verify your union before viewing or reporting local issues.',
    ],
    verifyNow: ['এখনই যাচাই করুন', 'Verify now'],
    categoryLabel: ['ধরন', 'Category'],
    category: {
      road: ['রাস্তা', 'Road'],
      water_supply: ['পানি সরবরাহ', 'Water supply'],
      electricity: ['বিদ্যুৎ', 'Electricity'],
      sanitation: ['স্যানিটেশন', 'Sanitation'],
      education_facility: ['শিক্ষা প্রতিষ্ঠান', 'Education facility'],
      health_facility: ['স্বাস্থ্য প্রতিষ্ঠান', 'Health facility'],
      safety: ['নিরাপত্তা', 'Safety'],
      corruption: ['দুর্নীতি', 'Corruption'],
      environment: ['পরিবেশ', 'Environment'],
      other: ['অন্যান্য', 'Other'],
    },
    status: {
      submitted: ['জমা হয়েছে', 'Submitted'],
      under_review: ['পর্যালোচনাধীন', 'Under review'],
      verified: ['যাচাই হয়েছে', 'Verified'],
      rejected: ['বাতিল হয়েছে', 'Rejected'],
      in_progress: ['কাজ চলছে', 'In progress'],
      completed: ['সমাধান হয়েছে', 'Completed'],
      archived: ['সংরক্ষণাগারে', 'Archived'],
    },
    titleLabel: ['সংক্ষিপ্ত শিরোনাম', 'Short title'],
    titleHelper: ['যেমন: "রাস্তার পাশের নলকূপ নষ্ট"', 'For example: "Roadside tube well broken"'],
    descriptionLabel: ['বিস্তারিত বিবরণ', 'Description'],
    descriptionHelper: [
      'কী সমস্যা, কোথায়, এবং কতদিন ধরে — বিস্তারিত লিখুন।',
      'What the problem is, where, and how long it has been going on.',
    ],
    photoLabel: ['ছবি যুক্ত করুন', 'Add a photo'],
    photoOptional: ['(না দিলেও চলবে)', '(optional)'],
    locationLabel: ['অবস্থান', 'Location'],
    useCurrentLocation: ['বর্তমান অবস্থান ব্যবহার করুন', 'Use current location'],
    submitReport: ['সমস্যা জমা দিন', 'Submit report'],
    submitted: ['সমস্যা জমা হয়েছে। একজন কর্মকর্তা এটি পর্যালোচনা করবেন।', 'Report submitted. An official will review it.'],
    vote: ['সমর্থন করুন', 'Support this'],
    voted: ['সমর্থন করা হয়েছে', 'Supported'],
    voteCount: ['জন সমর্থন করেছেন', 'people support this'],
    reportedBy: ['জানিয়েছেন', 'Reported by'],
    autoFlagReason: ['স্বয়ংক্রিয় পর্যালোচনার কারণ', 'Auto-flag reason'],
    statusHistory: ['অগ্রগতি', 'Progress'],
    updateStatus: ['অবস্থা পরিবর্তন করুন', 'Update status'],
    resolutionNote: ['সমাধানের বিবরণ', 'Resolution note'],
  },

  budget: {
    title: ['ইউনিয়ন বাজেট', 'Union budget'],
    subtitle: [
      'আপনার ইউনিয়নের বরাদ্দ দেখুন এবং সন্দেহজনক মনে হলে চিহ্নিত করুন।',
      'See your union’s allocations, and flag one if it looks suspect.',
    ],
    postAllocation: ['বরাদ্দ যোগ করুন', 'Post an allocation'],
    needsVerification: [
      'ইউনিয়নের বাজেট দেখতে আগে আপনার ইউনিয়ন যাচাই করুন।',
      'Verify your union before viewing its budget.',
    ],
    empty: ['এখনো কোনো বরাদ্দ পোস্ট করা হয়নি।', 'No allocations posted yet.'],
    projectNameLabel: ['প্রকল্পের নাম', 'Project name'],
    descriptionLabel: ['বিবরণ', 'Description'],
    amountLabel: ['পরিমাণ (টাকা)', 'Amount (BDT)'],
    dateLabel: ['তারিখ', 'Date'],
    postedBy: ['পোস্ট করেছেন', 'Posted by'],
    flag: ['সন্দেহজনক বলে চিহ্নিত করুন', 'Flag as suspect'],
    flagged: ['চিহ্নিত করা হয়েছে', 'Flagged'],
    flagReasonLabel: ['কারণ', 'Reason'],
    flagReasonOptional: ['(না দিলেও চলবে)', '(optional)'],
    flagCount: ['জন চিহ্নিত করেছেন', 'people have flagged this'],
    escalatedNotice: [
      'এই বরাদ্দটি উপজেলা কর্মকর্তার কাছে পাঠানো হয়েছে।',
      'This allocation has been escalated to the upazila officer.',
    ],
    ledgerTitle: ['লেজার', 'Ledger'],
    ledgerVerified: ['তথ্যের কোনো পরিবর্তন হয়নি', 'Unaltered since it was recorded'],
    submitAllocation: ['জমা দিন', 'Post allocation'],
    posted: ['বরাদ্দ পোস্ট হয়েছে।', 'Allocation posted.'],
  },

  entitlements: {
    title: ['আমার ভাতা', 'My entitlements'],
    subtitle: [
      'আপনার নামে কোন ভাতা নথিভুক্ত আছে এবং কী পরিশোধ হয়েছে তা দেখুন।',
      'See what is actually enrolled in your name, and what has been paid.',
    ],
    needsNid: [
      'আপনার ভাতার অবস্থা দেখতে আগে আপনার জাতীয় পরিচয়পত্র যাচাই করুন।',
      'Verify your National ID before checking your entitlement status.',
    ],
    verifyNow: ['এখনই যাচাই করুন', 'Verify now'],
    notEnrolled: [
      'আপনার এই জাতীয় পরিচয়পত্রের বিপরীতে কোনো ভাতা নথিভুক্ত পাওয়া যায়নি।',
      'No entitlement is enrolled against your National ID.',
    ],
    programLabel: ['কর্মসূচি', 'Programme'],
    amountLabel: ['পরিমাণ', 'Amount'],
    statusLabel: ['অবস্থা', 'Status'],
    disbursementsTitle: ['পরিশোধ', 'Disbursements'],
    scheduledFor: ['নির্ধারিত তারিখ', 'Scheduled for'],
    paidAt: ['পরিশোধিত হয়েছে', 'Paid'],
    status: {
      active: ['সক্রিয়', 'Active'],
      suspended: ['স্থগিত', 'Suspended'],
      completed: ['সম্পন্ন', 'Completed'],
      scheduled: ['নির্ধারিত', 'Scheduled'],
      paid: ['পরিশোধিত', 'Paid'],
      failed: ['ব্যর্থ', 'Failed'],
      on_hold: ['স্থগিত রাখা হয়েছে', 'On hold'],
    },
  },

  beneficiaries: {
    title: ['সুবিধাভোগী নিবন্ধন', 'Beneficiary enrolment'],
    subtitle: [
      'আপনার ইউনিয়নের ভাতাভোগীদের নিবন্ধন করুন এবং প্রকৃত পরিশোধ রেকর্ড করুন।',
      'Enrol beneficiaries in your union and record real disbursements against their entitlements.',
    ],
    notOfficial: [
      'এই পাতাটি শুধুমাত্র ইউনিয়ন চেয়ারম্যান ও ইউনিয়ন কর্মীদের জন্য।',
      'This screen is for union chairmen and union office staff only.',
    ],
    empty: ['এখনও কোনো সুবিধাভোগী নিবন্ধিত হয়নি।', 'No beneficiaries enrolled yet.'],
    enrolNew: ['নতুন সুবিধাভোগী নিবন্ধন করুন', 'Enrol a new beneficiary'],
    enrol: ['নিবন্ধন করুন', 'Enrol'],
    enrolled: ['নিবন্ধিত হয়েছে', 'Enrolled'],
    nidLabel: ['জাতীয় পরিচয়পত্র নম্বর', 'National ID number'],
    nidHelper: [
      'এই নম্বর হ্যাশ করে সংরক্ষণ করা হয় — কখনো প্লেইন টেক্সটে নয়।',
      'This number is stored hashed — never in plain text.',
    ],
    programCodeLabel: ['কর্মসূচি কোড', 'Programme code'],
    programCodeHelper: [
      'একটি সংক্ষিপ্ত শনাক্তকারী, যেমন widow-allowance',
      'A short identifier, e.g. widow-allowance',
    ],
    programNameLabel: ['কর্মসূচির নাম', 'Programme name'],
    amountLabel: ['পরিমাণ', 'Amount'],
    periodLabel: ['মেয়াদ', 'Period'],
    period: {
      monthly: ['মাসিক', 'Monthly'],
      quarterly: ['ত্রৈমাসিক', 'Quarterly'],
      one_time: ['একবার', 'One-time'],
    },
    disbursementsTitle: ['পরিশোধ', 'Disbursements'],
    recordDisbursement: ['পরিশোধ রেকর্ড করুন', 'Record a disbursement'],
    dateLabel: ['তারিখ', 'Date'],
    disbursementStatusLabel: ['পরিশোধের অবস্থা', 'Disbursement status'],
    scheduledFor: ['নির্ধারিত তারিখ', 'Scheduled for'],
    paidAt: ['পরিশোধিত হয়েছে', 'Paid'],
    status: {
      active: ['সক্রিয়', 'Active'],
      suspended: ['স্থগিত', 'Suspended'],
      inactive: ['নিষ্ক্রিয়', 'Inactive'],
      completed: ['সম্পন্ন', 'Completed'],
      scheduled: ['নির্ধারিত', 'Scheduled'],
      paid: ['পরিশোধিত', 'Paid'],
      failed: ['ব্যর্থ', 'Failed'],
      on_hold: ['স্থগিত রাখা হয়েছে', 'On hold'],
    },
  },

  officer: {
    title: ['উপজেলা কর্মকর্তা', 'Upazila officer'],
    subtitle: [
      'চিহ্নিত বরাদ্দ যেগুলোর জন্য আপনার সিদ্ধান্ত প্রয়োজন।',
      'Flagged allocations that need your decision.',
    ],
    mineTab: ['আমার কাছে পাঠানো', 'Routed to me'],
    unassignedTab: ['কেউ দায়িত্বে নেই', 'Unassigned'],
    empty: ['এই মুহূর্তে কোনো উত্তেজনা নেই।', 'Nothing needs attention right now.'],
    ratioLabel: ['যাচাইকৃত বাসিন্দাদের অনুপাত', 'Ratio of verified residents'],
    acknowledge: ['স্বীকার করুন', 'Acknowledge'],
    resolve: ['সমাধান হয়েছে বলে চিহ্নিত করুন', 'Mark resolved'],
    dismiss: ['খারিজ করুন', 'Dismiss'],
    status: {
      pending: ['অপেক্ষমাণ', 'Pending'],
      acknowledged: ['স্বীকৃত', 'Acknowledged'],
      resolved: ['সমাধান হয়েছে', 'Resolved'],
      dismissed: ['খারিজ হয়েছে', 'Dismissed'],
    },
  },

  leader: {
    title: ['নেতৃত্ব ড্যাশবোর্ড', 'Leadership dashboard'],
    subtitle: [
      'আপনার ইউনিয়নের বরাদ্দ, সমস্যা এবং ভাতার সারাংশ।',
      'A summary of allocations, issues, and entitlements in your area.',
    ],
    scopeUnion: ['ইউনিয়ন', 'Union'],
    scopeUpazila: ['উপজেলা (সব ইউনিয়ন)', 'Upazila (all unions)'],
    scopeDistrict: ['জেলা (সব ইউনিয়ন)', 'District (all unions)'],
    allocationsTotal: ['মোট বরাদ্দ', 'Total allocated'],
    allocationsFlagged: ['চিহ্নিত বরাদ্দ', 'Flagged allocations'],
    allocationsEscalated: ['এস্কেলেটেড', 'Escalated'],
    issuesTotal: ['মোট রিপোর্ট', 'Total reports'],
    beneficiariesTotal: ['মোট সুবিধাভোগী', 'Total beneficiaries'],
    disbursedPaid: ['পরিশোধিত', 'Disbursed (paid)'],
    disbursedScheduled: ['নির্ধারিত', 'Disbursed (scheduled)'],
    anomalies: ['সতর্কতা', 'Alerts'],
    noAnomalies: ['কোনো সতর্কতা নেই।', 'No alerts right now.'],
    notLeader: [
      'এই পোর্টাল ইউনিয়ন চেয়ারম্যান, ইউনিয়ন কর্মী এবং উপজেলা/জেলা কর্মকর্তাদের জন্য।',
      'This portal is for union chairmen, union staff, and upazila/zila officers.',
    ],
  },

  donor: {
    title: ['দাতা পোর্টাল', 'Donor portal'],
    subtitle: [
      'আপনার সংস্থা যে কর্মসূচিতে অর্থায়ন করে তার প্রকৃত ব্যবহার ও প্রভাব।',
      'Real fund utilisation and impact for the programmes your organisation funds.',
    ],
    program: ['কর্মসূচি', 'Programme'],
    beneficiaries: ['সুবিধাভোগী', 'Beneficiaries'],
    unionsReached: ['পৌঁছানো ইউনিয়ন', 'Unions reached'],
    disbursedPaid: ['পরিশোধিত', 'Disbursed (paid)'],
    disbursedScheduled: ['নির্ধারিত', 'Disbursed (scheduled)'],
    notDonor: ['এই পোর্টাল শুধুমাত্র দাতা প্রতিনিধিদের জন্য।', 'This portal is for donor representatives only.'],
    noScopes: [
      'আপনার সংস্থার জন্য কোনো কর্মসূচি নির্ধারিত নেই। একজন প্রশাসকের সঙ্গে যোগাযোগ করুন।',
      'No programmes are configured for your organisation yet. Contact an administrator.',
    ],
  },

  transparency: {
    title: ['স্বচ্ছতা', 'Transparency'],
    subtitle: [
      'জনসাধারণের জন্য উন্মুক্ত — কোনো সাইন ইনের প্রয়োজন নেই। ইউনিয়ন পরিষদ আইন ২০০৯-এর জবাবদিহিতার প্রতিশ্রুতি অনুযায়ী প্রকাশিত।',
      'Open to the public — no sign-in required. Published in keeping with the Union Parishads Act 2009\'s accountability commitments.',
    ],
    ledgerIntact: ['লেজার অক্ষত — কোনো টেম্পারিং শনাক্ত হয়নি', 'Ledger intact — no tampering detected'],
    ledgerBroken: ['লেজার যাচাই ব্যর্থ হয়েছে', 'Ledger verification failed'],
    entriesVerified: ['এন্ট্রি যাচাই করা হয়েছে', 'entries verified'],
    unions: ['ইউনিয়ন', 'Unions'],
    chairman: ['চেয়ারম্যান', 'Chairman'],
    allocations: ['বরাদ্দ', 'Allocations'],
    flagged: ['চিহ্নিত', 'Flagged'],
    escalated: ['এস্কেলেটেড', 'Escalated'],
    programs: ['কর্মসূচি', 'Programmes'],
    activeBeneficiaries: ['সক্রিয় সুবিধাভোগী', 'Active beneficiaries'],
    totalDisbursed: ['মোট পরিশোধিত', 'Total disbursed'],
    issueStatusBreakdown: ['সমস্যা রিপোর্টের অবস্থা', 'Issue report status'],
    generatedAt: ['তৈরি হয়েছে', 'Generated at'],
    noChairman: ['নির্ধারিত নয়', 'Not assigned'],
  },

  ussdDemo: {
    title: ['ইউএসএসডি সিমুলেটর', 'USSD simulator'],
    subtitle: [
      'একটি ফিচার ফোন থেকে ডায়াল করলে যা দেখা যেত, ঠিক তাই — কোনো স্মার্টফোন বা ইন্টারনেট ছাড়াই।',
      'Exactly what dialing in from a feature phone would show — no smartphone or internet needed.',
    ],
    phoneLabel: ['ফোন নম্বর (সিমুলেটেড)', 'Phone number (simulated)'],
    dialToStart: ['কল শুরু করতে নিচের বোতাম চাপুন…', 'Press the button below to dial in…'],
    inputPlaceholder: ['টাইপ করুন এবং পাঠান', 'Type your response'],
    send: ['পাঠান', 'Send'],
    startCall: ['কল শুরু করুন', 'Dial in'],
    callAgain: ['আবার কল করুন', 'Dial again'],
    hangUp: ['কল কেটে দিন', 'Hang up'],
    explainer: [
      'এই সিমুলেটর সেই একই কোড ব্যবহার করে যা একটি প্রকৃত টেলিকম গেটওয়ে ব্যবহার করত।',
      'This simulator calls the exact same server logic a real telecom gateway would.',
    ],
  },

  errors: {
    genericTitle: ['কিছু একটা সমস্যা হয়েছে', 'Something went wrong'],
    genericBody: [
      'আবার চেষ্টা করুন। সমস্যা থাকলে আমাদের জানান।',
      'Please try again. If it keeps happening, let us know.',
    ],
    networkTitle: ['ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না', 'No internet connection'],
    networkBody: [
      'সংযোগ ফিরে এলে আবার চেষ্টা করুন। আপনার লেখা হারায়নি।',
      'Try again when your connection returns. Your text has not been lost.',
    ],
    notFoundTitle: ['পাতাটি পাওয়া যায়নি', 'Page not found'],
    notFoundBody: [
      'ঠিকানাটি হয়তো বদলে গেছে। হোম পাতায় ফিরে যান।',
      'The address may have changed. Go back to the home page.',
    ],
    forbiddenTitle: ['এই অংশে ঢোকার অনুমতি নেই', 'You do not have access to this'],
    forbiddenBody: [
      'ভুল হয়েছে মনে হলে প্রশাসকের সঙ্গে যোগাযোগ করুন।',
      'If you think this is a mistake, contact an administrator.',
    ],
    sessionExpiredTitle: ['আবার সাইন ইন করুন', 'Please sign in again'],
    sessionExpiredBody: [
      'নিরাপত্তার জন্য আপনাকে বের করে দেওয়া হয়েছে। আপনার তথ্য ঠিক আছে।',
      'You were signed out for security. Your information is safe.',
    ],
    rateLimitTitle: ['একটু ধীরে', 'Slow down a moment'],
    rateLimitBody: [
      'অল্প সময়ে অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
      'That was a lot of attempts in a short time. Try again shortly.',
    ],
    goHome: ['হোম পাতায় যান', 'Go to the home page'],
    aiUnavailableTitle: ['উত্তর দিতে দেরি হচ্ছে', 'This is taking too long'],
    aiUnavailableBody: [
      'আবার চেষ্টা করুন। আপনার লেখা হারায়নি।',
      'Please try again. Your message has not been lost.',
    ],
  },

  a11y: {
    openMenu: ['মেনু খুলুন', 'Open menu'],
    closeMenu: ['মেনু বন্ধ করুন', 'Close menu'],
    clearField: ['লেখা মুছুন', 'Clear the field'],
    moreOptions: ['আরও অপশন', 'More options'],
    loading: ['তথ্য আসছে', 'Loading'],
    required: ['অবশ্যই দিতে হবে', 'Required'],
    invalid: ['তথ্যটি ঠিক নেই', 'Not valid'],
    currentPage: ['এখন এই পাতায় আছেন', 'Current page'],
    externalLink: ['নতুন উইন্ডোতে খুলবে', 'Opens in a new window'],
  },
} as const satisfies CatalogNode;

/** Projects the bilingual catalogue onto one locale. */
export function project(node: CatalogNode, index: 0 | 1): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      out[key] = value[index];
    } else {
      out[key] = project(value as CatalogNode, index);
    }
  }
  return out;
}

export const LOCALE_INDEX = { bn: 0, en: 1 } as const;

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Bengali Bangla (`bn`).
class AppLocalizationsBn extends AppLocalizations {
  AppLocalizationsBn([String locale = 'bn']) : super(locale);

  @override
  String get appName => 'শেবার জানালা';

  @override
  String get signInTitle => 'সাইন ইন';

  @override
  String get phoneLabel => 'মোবাইল নম্বর';

  @override
  String get phoneHint => '01XXXXXXXXX';

  @override
  String get pinLabel => 'পিন';

  @override
  String get signInButton => 'সাইন ইন করুন';

  @override
  String get signOut => 'সাইন আউট';

  @override
  String welcomeUser(String name) {
    return 'স্বাগতম, $name';
  }

  @override
  String get language => 'ভাষা';

  @override
  String get errRequired => 'এই ঘরটি পূরণ করতে হবে।';

  @override
  String get errPin => 'পিন ৪ থেকে ৬ সংখ্যার হতে হবে।';

  @override
  String get errNetwork => 'ইন্টারনেট সংযোগ নেই। সংযোগ দেখে আবার চেষ্টা করুন।';

  @override
  String get errTimeout => 'সার্ভার সাড়া দিতে দেরি করছে। আবার চেষ্টা করুন।';

  @override
  String get errPinInvalid => 'মোবাইল নম্বর বা পিন ভুল।';

  @override
  String get errAccountLocked =>
      'অনেকবার ভুল হয়েছে। কিছুক্ষণের জন্য আপনার অ্যাকাউন্ট বন্ধ।';

  @override
  String get errPhoneNotRegistered => 'এই নম্বরটি নিবন্ধিত নয়।';

  @override
  String get errRateLimited => 'অনেকবার চেষ্টা হয়েছে। একটু অপেক্ষা করুন।';

  @override
  String get errUnauthenticated =>
      'আপনার সেশনের মেয়াদ শেষ। আবার সাইন ইন করুন।';

  @override
  String get errGeneric => 'কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।';

  @override
  String errReference(String id) {
    return 'রেফারেন্স: $id';
  }

  @override
  String get aiSimulated => 'সিমুলেটেড এআই';

  @override
  String get aiLive => 'লাইভ এআই';

  @override
  String get navHome => 'হোম';

  @override
  String get navOpportunities => 'কর্মসূচি';

  @override
  String get navProfile => 'প্রোফাইল';

  @override
  String get searchHint => 'কর্মসূচি খুঁজুন';

  @override
  String get allCategories => 'সব';

  @override
  String get catScholarship => 'বৃত্তি';

  @override
  String get catHealthcare => 'স্বাস্থ্যসেবা';

  @override
  String get catAgriculture => 'কৃষি';

  @override
  String get catBusiness => 'ব্যবসা';

  @override
  String get catLegalAid => 'আইনি সহায়তা';

  @override
  String get catEmployment => 'কর্মসংস্থান';

  @override
  String get catFinancial => 'আর্থিক';

  @override
  String get catSocialWelfare => 'সমাজকল্যাণ';

  @override
  String get catTraining => 'প্রশিক্ষণ';

  @override
  String get catDisaster => 'দুর্যোগ ত্রাণ';

  @override
  String get catResearch => 'গবেষণা';

  @override
  String get eligEligible => 'আপনি যোগ্য হতে পারেন';

  @override
  String get eligPartial => 'আংশিক মিলেছে';

  @override
  String get eligNotEligible => 'মিলছে না';

  @override
  String get eligUnknown => 'আরও তথ্য দরকার';

  @override
  String eligScore(int score) {
    return '$score% মিল';
  }

  @override
  String get retry => 'আবার চেষ্টা করুন';

  @override
  String get noResults => 'কোনো কর্মসূচি পাওয়া যায়নি।';

  @override
  String get loadMoreFailed => 'আরও লোড করা যায়নি।';

  @override
  String perMonth(String amount) {
    return '$amount / মাস';
  }

  @override
  String perQuarter(String amount) {
    return '$amount / ত্রৈমাসিক';
  }

  @override
  String oneTime(String amount) {
    return '$amount এককালীন';
  }

  @override
  String amountOnly(String amount) {
    return '$amount';
  }

  @override
  String deadlineOn(String date) {
    return 'শেষ তারিখ: $date';
  }

  @override
  String get secDescription => 'এই কর্মসূচি সম্পর্কে';

  @override
  String get secBenefits => 'আপনি যা পাবেন';

  @override
  String get secHowToApply => 'কীভাবে আবেদন করবেন';

  @override
  String get secDocuments => 'যেসব কাগজ লাগবে';

  @override
  String get secWhyEligible => 'এই ফলাফলের কারণ';

  @override
  String get secProvider => 'প্রদানকারী';

  @override
  String get secTrust => 'তথ্য কতটা নির্ভরযোগ্য';

  @override
  String get requiredDoc => 'আবশ্যক';

  @override
  String get optionalDoc => 'ঐচ্ছিক';

  @override
  String get tipLabel => 'পরামর্শ';

  @override
  String get commonMistakeLabel => 'সাধারণ ভুল';

  @override
  String get verifUnverified => 'নমুনা তথ্য, এখনো যাচাই হয়নি';

  @override
  String get verifPending => 'সরকারি যাচাইয়ের অপেক্ষায়';

  @override
  String get verifVerified => 'যাচাইকৃত';

  @override
  String get verifOutdated => 'তথ্য পুরনো হতে পারে';

  @override
  String get verifDisputed => 'উৎস নিয়ে প্রশ্ন আছে — অফিসে জেনে নিন';

  @override
  String get confHigh => 'উচ্চ নির্ভরযোগ্যতা';

  @override
  String get confMedium => 'মাঝারি নির্ভরযোগ্যতা';

  @override
  String get confLow => 'কম নির্ভরযোগ্যতা';

  @override
  String get ruleMet => 'মিলেছে';

  @override
  String get ruleFailed => 'মিলছে না';

  @override
  String get ruleUnknown => 'জানা নেই';

  @override
  String get recommendedForYou => 'আপনার জন্য কর্মসূচি';

  @override
  String get noRecommendations =>
      'এখনো কোনো মিল নেই। ভালো ফলাফলের জন্য প্রোফাইল সম্পূর্ণ করুন।';

  @override
  String get browseAll => 'সব কর্মসূচি দেখুন';

  @override
  String get officeHours => 'অফিস সময়';

  @override
  String get phoneLabelShort => 'ফোন';

  @override
  String get processingTime => 'প্রক্রিয়াকরণের সময়';

  @override
  String get profileTitle => 'আপনার অ্যাকাউন্ট';

  @override
  String phoneValue(String phone) {
    return 'ফোন: $phone';
  }

  @override
  String districtValue(String district) {
    return 'জেলা: $district';
  }
}

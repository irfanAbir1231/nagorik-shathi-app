// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Shebar Janala';

  @override
  String get signInTitle => 'Sign in';

  @override
  String get phoneLabel => 'Mobile number';

  @override
  String get phoneHint => '01XXXXXXXXX';

  @override
  String get pinLabel => 'PIN';

  @override
  String get signInButton => 'Sign in';

  @override
  String get signOut => 'Sign out';

  @override
  String welcomeUser(String name) {
    return 'Welcome, $name';
  }

  @override
  String get language => 'Language';

  @override
  String get errRequired => 'This field is required.';

  @override
  String get errPin => 'Your PIN must be 4 to 6 digits.';

  @override
  String get errNetwork => 'No connection. Check your internet and try again.';

  @override
  String get errTimeout => 'The server is taking too long. Please try again.';

  @override
  String get errPinInvalid => 'Wrong mobile number or PIN.';

  @override
  String get errAccountLocked =>
      'Too many wrong attempts. Your account is locked for a while.';

  @override
  String get errPhoneNotRegistered => 'This number is not registered.';

  @override
  String get errRateLimited => 'Too many attempts. Please wait a moment.';

  @override
  String get errUnauthenticated =>
      'Your session has expired. Please sign in again.';

  @override
  String get errGeneric => 'Something went wrong. Please try again.';

  @override
  String errReference(String id) {
    return 'Reference: $id';
  }

  @override
  String get aiSimulated => 'Simulated AI';

  @override
  String get aiLive => 'Live AI';

  @override
  String get navHome => 'Home';

  @override
  String get navOpportunities => 'Programmes';

  @override
  String get navProfile => 'Profile';

  @override
  String get searchHint => 'Search programmes';

  @override
  String get allCategories => 'All';

  @override
  String get catScholarship => 'Scholarship';

  @override
  String get catHealthcare => 'Healthcare';

  @override
  String get catAgriculture => 'Agriculture';

  @override
  String get catBusiness => 'Business';

  @override
  String get catLegalAid => 'Legal aid';

  @override
  String get catEmployment => 'Employment';

  @override
  String get catFinancial => 'Financial';

  @override
  String get catSocialWelfare => 'Social welfare';

  @override
  String get catTraining => 'Training';

  @override
  String get catDisaster => 'Disaster relief';

  @override
  String get catResearch => 'Research';

  @override
  String get eligEligible => 'You may qualify';

  @override
  String get eligPartial => 'Partly matches';

  @override
  String get eligNotEligible => 'Not a match';

  @override
  String get eligUnknown => 'Need more info';

  @override
  String eligScore(int score) {
    return '$score% match';
  }

  @override
  String get retry => 'Try again';

  @override
  String get noResults => 'No programmes found.';

  @override
  String get loadMoreFailed => 'Could not load more.';

  @override
  String perMonth(String amount) {
    return '$amount / month';
  }

  @override
  String perQuarter(String amount) {
    return '$amount / quarter';
  }

  @override
  String oneTime(String amount) {
    return '$amount one-time';
  }

  @override
  String amountOnly(String amount) {
    return '$amount';
  }

  @override
  String deadlineOn(String date) {
    return 'Deadline: $date';
  }

  @override
  String get secDescription => 'About this programme';

  @override
  String get secBenefits => 'What you get';

  @override
  String get secHowToApply => 'How to apply';

  @override
  String get secDocuments => 'Documents you need';

  @override
  String get secWhyEligible => 'Why this result';

  @override
  String get secProvider => 'Provided by';

  @override
  String get secTrust => 'How sure are we';

  @override
  String get requiredDoc => 'Required';

  @override
  String get optionalDoc => 'Optional';

  @override
  String get tipLabel => 'Tip';

  @override
  String get commonMistakeLabel => 'Common mistake';

  @override
  String get verifUnverified => 'Sample data, not yet verified';

  @override
  String get verifPending => 'Awaiting official check';

  @override
  String get verifVerified => 'Verified';

  @override
  String get verifOutdated => 'May be out of date';

  @override
  String get verifDisputed => 'Source disputed — check the office';

  @override
  String get confHigh => 'High confidence';

  @override
  String get confMedium => 'Medium confidence';

  @override
  String get confLow => 'Low confidence';

  @override
  String get ruleMet => 'Matches';

  @override
  String get ruleFailed => 'Does not match';

  @override
  String get ruleUnknown => 'Unknown';

  @override
  String get recommendedForYou => 'Programmes for you';

  @override
  String get noRecommendations =>
      'No matches yet. Complete your profile to get better results.';

  @override
  String get browseAll => 'Browse all programmes';

  @override
  String get officeHours => 'Office hours';

  @override
  String get phoneLabelShort => 'Phone';

  @override
  String get processingTime => 'Processing time';

  @override
  String get profileTitle => 'Your account';

  @override
  String phoneValue(String phone) {
    return 'Phone: $phone';
  }

  @override
  String districtValue(String district) {
    return 'District: $district';
  }
}

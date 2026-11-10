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
}

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
}

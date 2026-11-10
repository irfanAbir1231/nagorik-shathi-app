import 'package:flutter/foundation.dart' show kDebugMode;

/// Build-time configuration, supplied with `--dart-define`.
///
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000`
/// (10.0.2.2 is the Android emulator's alias for the host machine.)
class AppConfig {
  const AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const apiPrefix = '/api/v1';

  /// `--dart-define=DEMO_ACCOUNTS=true` shows the demo-role picker (and prefilled
  /// credentials) in a RELEASE build, for a demonstration APK pointed at a demo
  /// backend. Off by default: a normal release carries no demo credentials.
  static const demoAccountsFlag = bool.fromEnvironment('DEMO_ACCOUNTS');

  /// Debug builds always show the picker; release builds only when opted in.
  static const showDemoAccounts = kDebugMode || demoAccountsFlag;

  /// `--dart-define=OTP_FLOWS=false` hides register / forgot-PIN / code sign-in.
  /// Use it while the backend has no SMS provider: a code that can never be
  /// delivered would leave a new user stuck on the code screen.
  static const otpFlows = bool.fromEnvironment('OTP_FLOWS', defaultValue: true);
}

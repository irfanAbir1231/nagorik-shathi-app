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
}

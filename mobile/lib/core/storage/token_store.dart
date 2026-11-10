import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Holds the session tokens.
///
/// The refresh token is persisted in the platform keystore (Android Keystore /
/// iOS Keychain). The access token lives in memory only: it is short-lived and
/// can always be re-issued from the refresh token.
abstract class TokenStore {
  String? get accessToken;
  Future<String?> readRefreshToken();
  Future<void> save({required String accessToken, required String refreshToken});
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  static const _refreshKey = 'sj_refresh_token';
  final FlutterSecureStorage _storage;
  String? _access;

  @override
  String? get accessToken => _access;

  @override
  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  @override
  Future<void> save({required String accessToken, required String refreshToken}) async {
    _access = accessToken;
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  @override
  Future<void> clear() async {
    _access = null;
    await _storage.delete(key: _refreshKey);
  }
}

/// For tests.
class MemoryTokenStore implements TokenStore {
  String? _access;
  String? _refresh;

  @override
  String? get accessToken => _access;

  @override
  Future<String?> readRefreshToken() async => _refresh;

  @override
  Future<void> save({required String accessToken, required String refreshToken}) async {
    _access = accessToken;
    _refresh = refreshToken;
  }

  @override
  Future<void> clear() async {
    _access = null;
    _refresh = null;
  }
}

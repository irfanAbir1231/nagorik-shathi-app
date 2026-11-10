import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_result.dart';
import '../../../core/providers.dart';
import '../domain/auth_user.dart';

/// Session state: loading while restoring, `null` when signed out.
class AuthController extends AsyncNotifier<AuthUser?> {
  @override
  Future<AuthUser?> build() async {
    final result = await ref.read(authRepositoryProvider).restore();
    // Offline at launch: stay signed in as far as the UI is concerned is not
    // possible without a user object, so treat it as signed out but keep the
    // refresh token (it is only cleared on an explicit server rejection).
    return result.when(ok: (user) => user, err: (_) => null);
  }

  /// Every sign-in path ends the same way: on success the user becomes the
  /// session, and the router moves off the sign-in screens by itself.
  Future<ApiResult<AuthUser>> _adopt(Future<ApiResult<AuthUser>> attempt) async {
    final result = await attempt;
    if (result is Ok<AuthUser>) state = AsyncData(result.data);
    return result;
  }

  Future<ApiResult<AuthUser>> login({required String phone, required String pin}) =>
      _adopt(ref.read(authRepositoryProvider).login(phone: phone, pin: pin));

  Future<ApiResult<AuthUser>> register({
    required String phone,
    required String code,
    required String name,
    required String pin,
    required String language,
  }) =>
      _adopt(ref
          .read(authRepositoryProvider)
          .register(phone: phone, code: code, name: name, pin: pin, language: language));

  Future<ApiResult<AuthUser>> resetPin({required String phone, required String code, required String pin}) =>
      _adopt(ref.read(authRepositoryProvider).resetPin(phone: phone, code: code, pin: pin));

  Future<ApiResult<AuthUser>> loginWithCode({required String phone, required String code}) =>
      _adopt(ref.read(authRepositoryProvider).loginWithCode(phone: phone, code: code));

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }

  /// Called by the API client when the refresh token is rejected.
  void sessionExpired() => state = const AsyncData(null);
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AuthUser?>(AuthController.new);

/// UI language: the signed-in user's preference, otherwise Bangla.
final localeProvider = Provider<Locale>((ref) {
  final user = ref.watch(authControllerProvider).value;
  return Locale(user?.language ?? 'bn');
});

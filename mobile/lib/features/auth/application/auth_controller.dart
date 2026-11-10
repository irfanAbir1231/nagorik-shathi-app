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

  Future<ApiResult<AuthUser>> login({required String phone, required String pin}) async {
    final result = await ref.read(authRepositoryProvider).login(phone: phone, pin: pin);
    if (result is Ok<AuthUser>) state = AsyncData(result.data);
    return result;
  }

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

@Tags(['live'])
library;

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/auth/data/auth_repository.dart';

/// Runs against a real backend with the demo seed loaded (`npm run setup`).
///
///   flutter test --tags live --run-skipped --dart-define=API_BASE_URL=http://localhost:3000
///
/// Skipped by default because it needs a running server.
void main() {
  setUpAll(() => HttpOverrides.global = null); // flutter_test blocks real sockets.

  test('login, bearer call, refresh, restore and logout against the real backend', () async {
    final store = MemoryTokenStore();
    final api = ApiClient(tokens: store);
    final repo = AuthRepository(api: api, tokens: store);

    final bad = await repo.login(phone: '01712345678', pin: '9999');
    expect((bad as Err).code, anyOf(ErrorCodes.pinInvalid, ErrorCodes.rateLimited));

    final login = await repo.login(phone: '01712345678', pin: '1234');
    final user = (login as Ok).data;
    expect(user.role, 'citizen');
    expect(store.accessToken, isNotNull);

    final session = await repo.restore();
    expect((session as Ok).data?.id, user.id);

    // Rotate, then prove the NEW pair works and the old access token is not needed.
    expect(await api.refreshSession(), isTrue);
    final again = await repo.restore();
    expect((again as Ok).data?.id, user.id);

    await repo.logout();
    expect(await store.readRefreshToken(), isNull);
  });
}

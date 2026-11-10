@Tags(['live'])
library;

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/auth/data/auth_repository.dart';
import 'package:shebar_janala_app/features/auth/domain/auth_user.dart';
import 'package:shebar_janala_app/features/auth/domain/demo_accounts.dart';

/// Every account offered by the sign-in role picker must really sign in
/// against a seeded backend (`npm run setup`).
///
///   flutter test test/live_demo_roles_test.dart --tags live --run-skipped \
///     --dart-define=API_BASE_URL=http://localhost:3000
///
/// Takes about a minute: the server allows 10 sign-ins a minute, so the test
/// spaces them out instead of tripping its brute-force limit.
void main() {
  setUpAll(() => HttpOverrides.global = null);

  test('all demo roles sign in with the credentials the picker fills in', () async {
    for (final a in demoAccounts) {
      final store = MemoryTokenStore();
      final repo = AuthRepository(api: ApiClient(tokens: store), tokens: store);

      final result = await repo.login(phone: a.phone, pin: a.pin);
      expect(result, isA<Ok<AuthUser>>(), reason: '${a.role.en} (${a.phone}) could not sign in: $result');

      final user = (result as Ok<AuthUser>).data;
      expect(user.phone, a.phone);
      expect(user.name, a.name, reason: 'seed name changed for ${a.phone}');
      if (a.role.en == 'Moderator') expect(user.role, 'moderator');
      if (a.role.en == 'Administrator') expect(user.role, 'administrator');
      if (a.role.en.startsWith('Citizen')) expect(user.role, 'citizen');

      // And the session really works.
      final session = await repo.restore();
      expect((session as Ok<AuthUser?>).data?.id, user.id, reason: a.role.en);

      await Future<void>.delayed(const Duration(milliseconds: 6500));
    }
  });
}

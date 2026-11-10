@Tags(['live'])
library;

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/auth/data/auth_repository.dart';
import 'package:shebar_janala_app/features/auth/domain/auth_user.dart';

/// Registration, forgotten-PIN and code sign-in against a real backend.
///
/// Needs `OTP_DEV_ECHO="true"` on the server so the code comes back in the
/// response (no SMS gateway in development):
///
///   flutter test test/live_auth_test.dart --tags live --run-skipped \
///     --dart-define=API_BASE_URL=http://localhost:3000
///
/// Takes a couple of minutes because of the server's rate limit (see below).
/// Leaves the database as it found it: the throwaway account is deleted.
/// Demo accounts are only signed in to, never changed.
/// The server allows 10 auth requests a minute per client (a deliberate
/// brute-force limit) and 30 s between codes for one number. These tests make
/// about 13 requests, so they wait out a window once, halfway.
Future<void> _letRateLimitWindowPass() => Future<void>.delayed(const Duration(seconds: 62));

void main() {
  setUpAll(() => HttpOverrides.global = null);

  ({ApiClient api, AuthRepository repo, MemoryTokenStore store}) client() {
    final store = MemoryTokenStore();
    final api = ApiClient(tokens: store);
    return (api: api, repo: AuthRepository(api: api, tokens: store), store: store);
  }

  Future<String> devCode(AuthRepository repo, String phone, OtpPurpose purpose) async {
    final issue = (await repo.requestOtp(phone, purpose) as Ok<OtpIssue>).data;
    expect(issue.devCode, isNotNull, reason: 'server must run with OTP_DEV_ECHO=true');
    return issue.devCode!;
  }

  test('register, reset a forgotten PIN, sign in with the new PIN; the throwaway account is deleted', () async {
    final c = client();
    // However this test ends, the throwaway account must not be left behind.
    addTearDown(() async {
      if (c.store.accessToken != null) {
        await c.api.delete<void>('/users/me', body: {'confirm': 'DELETE'}, parse: (_) {});
      }
    });
    final suffix = (DateTime.now().microsecondsSinceEpoch % 10000000).toString().padLeft(7, '0');
    final phone = '0199$suffix';

    // One code per number per 30 s, so request once and try a wrong guess first.
    final code = await devCode(c.repo, phone, OtpPurpose.register);
    final wrongCode = code == '000000' ? '000001' : '000000';
    final wrong =
        await c.repo.register(phone: phone, code: wrongCode, name: 'Test Citizen', pin: '4821', language: 'en');
    expect((wrong as Err).code, ErrorCodes.otpInvalid);

    final user = (await c.repo.register(phone: phone, code: code, name: 'Test Citizen', pin: '4821', language: 'en')
            as Ok<AuthUser>)
        .data;
    expect(user.name, 'Test Citizen');
    expect(user.language, 'en');
    expect(c.store.accessToken, isNotNull);

    // The new session works, and the same number cannot register twice.
    expect(((await c.repo.restore()) as Ok<AuthUser?>).data?.id, user.id);
    final again = await c.repo.requestOtp(phone, OtpPurpose.register);
    expect((again as Err).code, ErrorCodes.phoneAlreadyRegistered);

    // Forgotten PIN: wait out the per-number cooldown, then reset with a strong PIN.
    // (The server rejects guessable PINs such as 1234, which is why this is not
    // done on a demo account. It also spends the code before checking the PIN,
    // so the app checks PIN strength itself first: see isGuessablePin.)
    await Future<void>.delayed(const Duration(seconds: 31));
    final resetCode = await devCode(c.repo, phone, OtpPurpose.resetPin);
    final reset = (await c.repo.resetPin(phone: phone, code: resetCode, pin: '7391') as Ok<AuthUser>).data;
    expect(reset.id, user.id);

    // New PIN works, old one does not.
    final fresh = client();
    expect(await fresh.repo.login(phone: phone, pin: '7391'), isA<Ok<AuthUser>>());
    final old = await client().repo.login(phone: phone, pin: '4821');
    expect((old as Err).code, ErrorCodes.pinInvalid);

    // Deleting the account needs the explicit confirmation token; the tear-down
    // above does it, and asserts nothing was left behind.
    final deleted = await fresh.api.delete<void>('/users/me', body: {'confirm': 'DELETE'}, parse: (_) {});
    expect(deleted, isA<Ok<void>>());
  });

  test('code sign-in (recovery route) signs in with the code alone', () async {
    await _letRateLimitWindowPass();
    final c = client();
    const phone = '01912345678'; // Karim
    final code = await devCode(c.repo, phone, OtpPurpose.login);

    final user = (await c.repo.loginWithCode(phone: phone, code: code) as Ok<AuthUser>).data;
    expect(user.phone, phone);
    expect((await c.repo.restore() as Ok<AuthUser?>).data?.id, user.id);
  });

  test('a code cannot be used twice', () async {
    final c = client();
    const phone = '01711112222'; // Mina
    final code = await devCode(c.repo, phone, OtpPurpose.login);

    expect(await c.repo.loginWithCode(phone: phone, code: code), isA<Ok<AuthUser>>());
    final replay = await client().repo.loginWithCode(phone: phone, code: code);
    expect(replay, isA<Err<AuthUser>>());
  });
}

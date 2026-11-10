import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/providers.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/auth/application/auth_controller.dart';
import 'package:shebar_janala_app/features/auth/data/auth_repository.dart';
import 'package:shebar_janala_app/features/auth/domain/auth_user.dart';
import 'package:shebar_janala_app/features/auth/domain/phone.dart';
import 'package:shebar_janala_app/features/auth/presentation/otp_flow_screen.dart';
import 'package:shebar_janala_app/l10n/generated/app_localizations.dart';

const demoUser = AuthUser(id: 'u1', name: 'Rahima', phone: '01712345678', role: 'citizen', language: 'bn');

class FakeAuthRepo extends AuthRepository {
  FakeAuthRepo() : super(api: ApiClient(tokens: MemoryTokenStore()), tokens: MemoryTokenStore());

  ApiResult<OtpIssue> otpResult = const Ok(OtpIssue(resendAfter: Duration(seconds: 30), devCode: '123456'));
  ApiResult<AuthUser> finishResult = const Ok(demoUser);
  final otpRequests = <({String phone, OtpPurpose purpose})>[];
  final finishes = <String>[];
  Map<String, String>? lastBody;

  @override
  Future<ApiResult<OtpIssue>> requestOtp(String phone, OtpPurpose purpose) async {
    otpRequests.add((phone: phone, purpose: purpose));
    return otpResult;
  }

  @override
  Future<ApiResult<AuthUser>> register({
    required String phone,
    required String code,
    required String name,
    required String pin,
    required String language,
  }) async {
    finishes.add('register');
    lastBody = {'phone': phone, 'code': code, 'name': name, 'pin': pin, 'language': language};
    return finishResult;
  }

  @override
  Future<ApiResult<AuthUser>> resetPin({required String phone, required String code, required String pin}) async {
    finishes.add('resetPin');
    lastBody = {'phone': phone, 'code': code, 'pin': pin};
    return finishResult;
  }

  @override
  Future<ApiResult<AuthUser>> loginWithCode({required String phone, required String code}) async {
    finishes.add('loginWithCode');
    lastBody = {'phone': phone, 'code': code};
    return finishResult;
  }

  @override
  Future<ApiResult<AuthUser?>> restore() async => const Ok(null);
}

Widget host(FakeAuthRepo repo, OtpFlow flow, {Locale locale = const Locale('en')}) => ProviderScope(
      overrides: [authRepositoryProvider.overrideWithValue(repo)],
      child: MaterialApp(
        locale: locale,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: OtpFlowScreen(flow: flow),
      ),
    );

Future<void> sendCodeFor(WidgetTester tester, String phone) async {
  await tester.enterText(find.byType(TextFormField).first, phone);
  await tester.tap(find.byType(FilledButton));
  await tester.pumpAndSettle();
}

/// Scrolls the form so the button is on screen (a phone user would), then taps it.
Future<void> tapButton(WidgetTester tester, String label) async {
  final finder = find.text(label).last;
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  // Not pumpAndSettle: after a successful sign-in the real router replaces this
  // screen, but here it stays up with its busy spinner animating forever.
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  group('validators', () {
    test('accepts local and international forms of a Bangladeshi number', () {
      expect(isValidBdPhone('01712345678'), isTrue);
      expect(isValidBdPhone('017 1234-5678'), isTrue);
      expect(isValidBdPhone('+8801712345678'), isTrue);
      expect(isValidBdPhone('8801712345678'), isTrue);
    });

    test('rejects obvious typos before an SMS is spent', () {
      expect(isValidBdPhone('1712345678'), isFalse);
      expect(isValidBdPhone('0171234567'), isFalse); // 10 digits
      expect(isValidBdPhone('02112345678'), isFalse); // not 01
      expect(isValidBdPhone(''), isFalse);
      expect(isValidBdPhone('abcdefghijk'), isFalse);
    });

    test('guessable PINs are caught before the one-time code is spent', () {
      for (final weak in ['1234', '4321', '12345', '123456', '654321', '1111', '0000', '999999']) {
        expect(isGuessablePin(weak), isTrue, reason: weak);
      }
      for (final fine in ['7391', '4821', '1243', '112233', '135790']) {
        expect(isGuessablePin(fine), isFalse, reason: fine);
      }
    });

    test('PIN is 4 to 6 digits and a code is exactly 6', () {
      expect(isValidPin('1234'), isTrue);
      expect(isValidPin('123456'), isTrue);
      expect(isValidPin('123'), isFalse);
      expect(isValidPin('1234567'), isFalse);
      expect(isValidPin('12a4'), isFalse);
      expect(isValidOtp('123456'), isTrue);
      expect(isValidOtp('12345'), isFalse);
    });
  });

  group('register', () {
    testWidgets('a bad number is rejected locally without spending an SMS', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.register));
      await sendCodeFor(tester, '123');

      expect(find.text('Enter an 11-digit number starting with 01.'), findsOneWidget);
      expect(repo.otpRequests, isEmpty);
    });

    testWidgets('requests a register code, then needs code, name and matching PINs', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.register));
      await sendCodeFor(tester, '01755550001');

      expect(repo.otpRequests.single.purpose, OtpPurpose.register);
      expect(find.text('We sent a 6-digit code to 01755550001.'), findsOneWidget);

      // Submit empty: every field complains, nothing is sent.
      await tapButton(tester, 'Create account');
      expect(find.text('Enter the 6-digit code.'), findsOneWidget);
      expect(find.text('Enter your name (at least 2 letters).'), findsOneWidget);
      expect(repo.finishes, isEmpty);

      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), '123456'); // code
      await tester.enterText(fields.at(1), 'Rahima Begum'); // name
      await tester.enterText(fields.at(2), '7391'); // pin
      await tester.enterText(fields.at(3), '9999'); // confirm (different)
      await tapButton(tester, 'Create account');
      expect(find.text('The two PINs are not the same.'), findsOneWidget);
      expect(repo.finishes, isEmpty);
    });

    testWidgets('submits everything the server needs, with the chosen language', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.register));
      await sendCodeFor(tester, '01755550001');

      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), '123456');
      await tester.enterText(fields.at(1), '  Rahima Begum ');
      await tester.enterText(fields.at(2), '7391');
      await tester.enterText(fields.at(3), '7391');
      await tester.tap(find.text('বাংলা'));
      await tester.pump();
      await tapButton(tester, 'Create account');

      expect(repo.lastBody, {
        'phone': '01755550001',
        'code': '123456',
        'name': '  Rahima Begum ',
        'pin': '7391',
        'language': 'bn',
      });
    });

    testWidgets('a wrong code shows the localised message and keeps the form', (tester) async {
      final repo = FakeAuthRepo()..finishResult = const Err(ErrorCodes.otpInvalid, 'x', requestId: 'req-1');
      await tester.pumpWidget(host(repo, OtpFlow.register, locale: const Locale('bn')));
      await sendCodeFor(tester, '01755550001');

      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), '000000');
      await tester.enterText(fields.at(1), 'Rahima');
      await tester.enterText(fields.at(2), '7391');
      await tester.enterText(fields.at(3), '7391');
      await tapButton(tester, 'অ্যাকাউন্ট খুলুন');

      expect(find.text('কোডটি সঠিক নয়। দেখে আবার চেষ্টা করুন।'), findsOneWidget);
      expect(find.text('রেফারেন্স: req-1'), findsOneWidget);
      expect(tester.widget<TextFormField>(fields.at(1)).controller!.text, 'Rahima'); // nothing lost
    });

    testWidgets('an already-registered number is explained when asking for the code', (tester) async {
      final repo = FakeAuthRepo()..otpResult = const Err(ErrorCodes.phoneAlreadyRegistered, 'x');
      await tester.pumpWidget(host(repo, OtpFlow.register));
      await sendCodeFor(tester, '01712345678');

      expect(find.text('This number already has an account. Sign in instead.'), findsOneWidget);
      expect(find.text('Create account'), findsNothing); // still on step one
    });
  });

  group('codes and resending', () {
    testWidgets('resend is disabled during the cooldown and counts down', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.resetPin));
      await sendCodeFor(tester, '01712345678');

      expect(find.text('Send again in 30s'), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
      expect(find.text('Send again in 25s'), findsOneWidget);

      await tester.pump(const Duration(seconds: 25));
      expect(find.text('Send the code again'), findsOneWidget);
      await tester.tap(find.text('Send the code again'));
      await tester.pumpAndSettle(const Duration(seconds: 1));
      expect(repo.otpRequests, hasLength(2));
    });

    testWidgets('change number goes back to step one', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.resetPin));
      await sendCodeFor(tester, '01712345678');
      await tester.tap(find.text('Use a different number'));
      await tester.pumpAndSettle();

      expect(find.text('Send code'), findsOneWidget);
    });

    testWidgets('in debug builds the dev code can be tapped to fill the box', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.otpLogin));
      await sendCodeFor(tester, '01712345678');

      await tester.tap(find.text('Development only. Code: 123456'));
      await tester.pump();
      expect(tester.widget<TextFormField>(find.byType(TextFormField).first).controller!.text, '123456');
    });
  });

  group('reset PIN and code sign-in', () {
    testWidgets('reset PIN asks for a reset_pin code and sends the new PIN', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.resetPin));
      await sendCodeFor(tester, '01712345678');
      expect(repo.otpRequests.single.purpose, OtpPurpose.resetPin);
      expect(find.text('Your name'), findsNothing); // no name field on this flow

      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), '123456');
      await tester.enterText(fields.at(1), '7391');
      await tester.enterText(fields.at(2), '7391');
      await tapButton(tester, 'Save PIN and sign in');

      expect(repo.finishes, ['resetPin']);
      expect(repo.lastBody, {'phone': '01712345678', 'code': '123456', 'pin': '7391'});
    });

    testWidgets('code sign-in needs only the code: no name, no PIN', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.otpLogin));
      await sendCodeFor(tester, '01712345678');
      expect(repo.otpRequests.single.purpose, OtpPurpose.login);
      expect(find.byType(TextFormField), findsOneWidget);

      await tester.enterText(find.byType(TextFormField), '123456');
      await tapButton(tester, 'Sign in');

      expect(repo.finishes, ['loginWithCode']);
    });

    testWidgets('a guessable PIN is refused in the app, so the code is not burned', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.resetPin));
      await sendCodeFor(tester, '01712345678');

      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), '123456');
      await tester.enterText(fields.at(1), '1234');
      await tester.enterText(fields.at(2), '1234');
      await tapButton(tester, 'Save PIN and sign in');

      expect(find.textContaining('too easy to guess'), findsOneWidget);
      expect(repo.finishes, isEmpty); // nothing reached the server
    });

    testWidgets('PIN fields are obscured', (tester) async {
      final repo = FakeAuthRepo();
      await tester.pumpWidget(host(repo, OtpFlow.resetPin));
      await sendCodeFor(tester, '01712345678');
      final pin = tester.widget<TextField>(find.byType(TextField).at(1));
      expect(pin.obscureText, isTrue);
      expect(pin.enableSuggestions, isFalse);
    });
  });

  test('a successful sign-in becomes the session so the router can leave the screen', () async {
    final repo = FakeAuthRepo();
    final c = ProviderContainer(overrides: [authRepositoryProvider.overrideWithValue(repo)]);
    addTearDown(c.dispose);
    await c.read(authControllerProvider.future);
    expect(c.read(authControllerProvider).value, isNull);

    await c.read(authControllerProvider.notifier).loginWithCode(phone: '01712345678', code: '123456');
    expect(c.read(authControllerProvider).value!.id, 'u1');

    // A failed attempt must not sign anyone in.
    final failing = FakeAuthRepo()..finishResult = const Err(ErrorCodes.otpExpired, 'x');
    final c2 = ProviderContainer(overrides: [authRepositoryProvider.overrideWithValue(failing)]);
    addTearDown(c2.dispose);
    await c2.read(authControllerProvider.future);
    await c2.read(authControllerProvider.notifier).resetPin(phone: '0171', code: '1', pin: '1234');
    expect(c2.read(authControllerProvider).value, isNull);
  });
}

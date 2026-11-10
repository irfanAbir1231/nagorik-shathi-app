import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/features/auth/application/auth_controller.dart';
import 'package:shebar_janala_app/features/auth/domain/auth_user.dart';
import 'package:shebar_janala_app/features/auth/presentation/login_screen.dart';
import 'package:shebar_janala_app/l10n/generated/app_localizations.dart';

class FakeAuth extends AuthController {
  FakeAuth(this.result);
  final ApiResult<AuthUser> result;

  @override
  Future<AuthUser?> build() async => null;

  @override
  Future<ApiResult<AuthUser>> login({required String phone, required String pin}) async => result;
}

Widget host(ApiResult<AuthUser> result, Locale locale) => ProviderScope(
      overrides: [authControllerProvider.overrideWith(() => FakeAuth(result))],
      child: MaterialApp(
        locale: locale,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const LoginScreen(),
      ),
    );

void main() {
  testWidgets('validates empty fields in Bangla', (tester) async {
    await tester.pumpWidget(host(const Err('PIN_INVALID', 'x'), const Locale('bn')));
    // Debug builds prefill the demo account; clear it to exercise validation.
    await tester.enterText(find.byType(TextFormField).at(0), '');
    await tester.tap(find.byType(FilledButton));
    await tester.pump();
    expect(find.text('এই ঘরটি পূরণ করতে হবে।'), findsOneWidget);
  });

  testWidgets('wrong credentials show the localised message and the request id', (tester) async {
    await tester.pumpWidget(host(const Err('PIN_INVALID', 'ignored', requestId: 'abc-123'), const Locale('en')));
    await tester.enterText(find.byType(TextFormField).at(0), '01712345678');
    await tester.enterText(find.byType(TextFormField).at(1), '0000');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(find.text('Wrong mobile number or PIN.'), findsOneWidget);
    expect(find.text('Reference: abc-123'), findsOneWidget);
  });

  testWidgets('the PIN field is obscured', (tester) async {
    await tester.pumpWidget(host(const Err('X', 'x'), const Locale('en')));
    final pin = tester.widget<TextField>(find.byType(TextField).at(1));
    expect(pin.obscureText, isTrue);
  });
}

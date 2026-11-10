import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/features/auth/domain/demo_accounts.dart';
import 'package:shebar_janala_app/features/auth/domain/phone.dart';

void main() {
  test('every demo account has a valid phone number, a valid PIN and a unique phone', () {
    final phones = <String>{};
    for (final a in demoAccounts) {
      expect(isValidBdPhone(a.phone), isTrue, reason: a.phone);
      expect(isValidPin(a.pin), isTrue, reason: a.phone);
      expect(phones.add(a.phone), isTrue, reason: 'duplicate ${a.phone}');
    }
  });

  test('covers every role the seed creates', () {
    final roles = demoAccounts.map((a) => a.role.en).toSet();
    for (final needed in [
      'Union chairman',
      'Upazila officer',
      'Union staff',
      'Donor representative',
      'Moderator',
      'Administrator',
    ]) {
      expect(roles, contains(needed));
    }
    expect(roles.where((r) => r.startsWith('Citizen')).length, greaterThanOrEqualTo(3));
  });

  test('lookup by phone', () {
    expect(demoAccountForPhone('01512345678')!.role.en, 'Administrator');
    expect(demoAccountForPhone('01700000000'), isNull);
  });
}

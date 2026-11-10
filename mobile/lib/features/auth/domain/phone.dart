/// Bangladeshi mobile numbers: 11 digits starting 01, optionally with the
/// country code (+880 / 880). The server normalises the number itself, so this
/// only catches obvious typos before spending an SMS on them.
bool isValidBdPhone(String input) {
  final compact = input.replaceAll(RegExp(r'[\s\-()]'), '');
  return RegExp(r'^(?:\+?88)?01\d{9}$').hasMatch(compact);
}

bool isValidPin(String input) => RegExp(r'^\d{4,6}$').hasMatch(input);

/// Mirrors the backend's `assertPinShape` (src/modules/auth/auth.service.ts).
///
/// This is checked in the app because the server verifies, and so spends, the
/// one-time code BEFORE it looks at the PIN. A rejected PIN would otherwise burn
/// the code and force a new SMS and a 30-second wait.
bool isGuessablePin(String pin) {
  if (RegExp(r'^(\d)\1+$').hasMatch(pin)) return true; // 1111, 000000
  return const {'1234', '4321', '12345', '123456', '654321'}.contains(pin);
}

bool isValidOtp(String input) => RegExp(r'^\d{6}$').hasMatch(input);

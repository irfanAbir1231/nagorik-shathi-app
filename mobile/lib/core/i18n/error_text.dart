import '../../l10n/generated/app_localizations.dart';
import '../network/api_result.dart';

/// Localised, citizen-safe text for an API error. Keyed on the stable error
/// `code`, never the server's English message, so Bangla users get Bangla.
String errorText(AppLocalizations l, Err<dynamic> e) {
  return switch (e.code) {
    ErrorCodes.network => l.errNetwork,
    ErrorCodes.timeout => l.errTimeout,
    ErrorCodes.pinInvalid => l.errPinInvalid,
    ErrorCodes.accountLocked => l.errAccountLocked,
    ErrorCodes.phoneNotRegistered => l.errPhoneNotRegistered,
    ErrorCodes.rateLimited => l.errRateLimited,
    ErrorCodes.aiUnavailable => l.errAiUnavailable,
    ErrorCodes.unauthenticated => l.errUnauthenticated,
    _ => l.errGeneric,
  };
}

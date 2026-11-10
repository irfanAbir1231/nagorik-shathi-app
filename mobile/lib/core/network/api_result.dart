/// Result of an API call. The backend wraps every response in
/// `{ success, data, requestId }` or `{ success:false, error:{ code, message, fields } }`.
/// Branch on [Err.code], never on message text.
sealed class ApiResult<T> {
  const ApiResult();

  R when<R>({required R Function(T data) ok, required R Function(Err<T> err) err}) {
    final self = this;
    return switch (self) {
      Ok<T>() => ok(self.data),
      Err<T>() => err(self),
    };
  }
}

class Ok<T> extends ApiResult<T> {
  const Ok(this.data, {this.requestId});
  final T data;
  final String? requestId;
}

class Err<T> extends ApiResult<T> {
  const Err(this.code, this.message, {this.fields, this.requestId, this.status});

  /// Server `ERROR_CODES` value, or a client-side one: NETWORK, TIMEOUT, UNKNOWN.
  final String code;
  final String message;
  final Map<String, String>? fields;
  final String? requestId;
  final int? status;

  bool get isNetwork => code == ErrorCodes.network || code == ErrorCodes.timeout;

  /// Same error, different success type (used when a parse step fails).
  Err<R> cast<R>() => Err<R>(code, message, fields: fields, requestId: requestId, status: status);
}

/// Mirror of the backend's `ERROR_CODES` (src/lib/http/response.ts) plus client-only codes.
class ErrorCodes {
  const ErrorCodes._();
  static const validationFailed = 'VALIDATION_FAILED';
  static const unauthenticated = 'UNAUTHENTICATED';
  static const forbidden = 'FORBIDDEN';
  static const notFound = 'NOT_FOUND';
  static const rateLimited = 'RATE_LIMITED';
  static const otpInvalid = 'OTP_INVALID';
  static const otpExpired = 'OTP_EXPIRED';
  static const otpAttemptsExceeded = 'OTP_ATTEMPTS_EXCEEDED';
  static const pinInvalid = 'PIN_INVALID';
  static const accountLocked = 'ACCOUNT_LOCKED';
  static const phoneNotRegistered = 'PHONE_NOT_REGISTERED';
  static const phoneAlreadyRegistered = 'PHONE_ALREADY_REGISTERED';
  static const aiUnavailable = 'AI_UNAVAILABLE';
  static const internal = 'INTERNAL';

  // Client-side only.
  static const network = 'NETWORK';
  static const timeout = 'TIMEOUT';
  static const unknown = 'UNKNOWN';
}

/// Thrown by providers that unwrap an [Err] so Riverpod's `AsyncError` carries
/// the structured error to the UI (see `errorText`).
class ApiFailure implements Exception {
  const ApiFailure(this.err);
  final Err<dynamic> err;

  @override
  String toString() => 'ApiFailure(${err.code})';
}

extension ApiResultUnwrap<T> on ApiResult<T> {
  /// The data, or throws [ApiFailure].
  T unwrap() => switch (this) {
        Ok<T>(:final data) => data,
        final Err<T> e => throw ApiFailure(e),
      };
}

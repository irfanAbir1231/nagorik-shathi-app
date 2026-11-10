import 'dart:async';

import 'package:dio/dio.dart';

import '../config.dart';
import '../storage/token_store.dart';
import 'api_result.dart';

/// Single HTTP entry point. Widgets never touch Dio.
///
/// Auth model (see the backend's `src/lib/http/mobile.ts`):
///  * every request carries `X-Client: mobile` and `Authorization: Bearer <access>`;
///  * on 401 the refresh token is exchanged ONCE, however many requests failed
///    together, then the original request is retried a single time.
///
/// The single-flight refresh is not an optimisation. The server rotates refresh
/// tokens and treats a replay as theft, so two parallel refreshes would sign the
/// user out.
class ApiClient {
  ApiClient({required this.tokens, Dio? dio, Dio? refreshDio, this.onSessionExpired})
      : _dio = dio ?? Dio(_options()),
        _refreshDio = refreshDio ?? Dio(_options());

  final TokenStore tokens;
  final void Function()? onSessionExpired;
  final Dio _dio;
  final Dio _refreshDio; // separate instance: a failed refresh can never recurse.

  Future<bool>? _refreshing;

  static BaseOptions _options() => BaseOptions(
        baseUrl: '${AppConfig.apiBaseUrl}${AppConfig.apiPrefix}',
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: const {'X-Client': 'mobile', 'Accept': 'application/json'},
        // We read the envelope ourselves; do not throw on 4xx/5xx.
        validateStatus: (_) => true,
      );

  /* ---------------------------------------------------------------- calls */

  Future<ApiResult<T>> get<T>(String path,
          {Map<String, dynamic>? query, required T Function(dynamic data) parse}) =>
      _send('GET', path, query: query, parse: parse);

  /// [authRetry] is false for credential endpoints, where a 401 means
  /// "wrong credentials", not "expired access token".
  Future<ApiResult<T>> post<T>(String path,
          {Object? body,
          required T Function(dynamic data) parse,
          Object Function()? bodyBuilder,
          Duration? receiveTimeout,
          bool authRetry = true}) =>
      _send('POST', path,
          body: body,
          bodyBuilder: bodyBuilder,
          parse: parse,
          receiveTimeout: receiveTimeout,
          authRetry: authRetry);

  Future<ApiResult<T>> put<T>(String path, {Object? body, required T Function(dynamic data) parse}) =>
      _send('PUT', path, body: body, parse: parse);

  Future<ApiResult<T>> patch<T>(String path, {Object? body, required T Function(dynamic data) parse}) =>
      _send('PATCH', path, body: body, parse: parse);

  Future<ApiResult<T>> delete<T>(String path, {Object? body, required T Function(dynamic data) parse}) =>
      _send('DELETE', path, body: body, parse: parse);

  Future<ApiResult<T>> _send<T>(
    String method,
    String path, {
    Object? body,
    Object Function()? bodyBuilder,
    Map<String, dynamic>? query,
    required T Function(dynamic data) parse,
    Duration? receiveTimeout,
    bool authRetry = true,
  }) async {
    Future<ApiResult<T>> attempt() async {
      try {
        final token = tokens.accessToken;
        final response = await _dio.request<dynamic>(
          path,
          // A multipart FormData can be sent only once; [bodyBuilder] makes a
          // fresh one for the retry that follows a token refresh.
          data: bodyBuilder != null ? bodyBuilder() : body,
          queryParameters: query,
          options: Options(
            method: method,
            receiveTimeout: receiveTimeout,
            headers: token == null ? null : {'Authorization': 'Bearer $token'},
          ),
        );
        return parseEnvelope(response, parse);
      } on DioException catch (e) {
        return mapDioError<T>(e);
      } catch (e) {
        return Err(ErrorCodes.unknown, e.toString());
      }
    }

    final first = await attempt();
    final expired = first is Err<T> && first.code == ErrorCodes.unauthenticated;
    if (authRetry && expired && await refreshSession()) return attempt();
    return first;
  }

  /* ------------------------------------------------------------ envelope */

  static ApiResult<T> parseEnvelope<T>(Response<dynamic> response, T Function(dynamic) parse) {
    final body = response.data;
    if (body is Map<String, dynamic>) {
      final requestId = body['requestId'] as String?;
      if (body['success'] == true) {
        try {
          return Ok(parse(body['data']), requestId: requestId);
        } catch (e) {
          return Err(ErrorCodes.unknown, 'Unexpected response shape: $e',
              requestId: requestId, status: response.statusCode);
        }
      }
      final error = body['error'];
      if (error is Map<String, dynamic>) {
        final rawFields = error['fields'];
        return Err(
          (error['code'] as String?) ?? ErrorCodes.unknown,
          (error['message'] as String?) ?? '',
          fields: rawFields is Map ? rawFields.map((k, v) => MapEntry('$k', '$v')) : null,
          requestId: requestId,
          status: response.statusCode,
        );
      }
    }
    return Err(ErrorCodes.unknown, 'Unexpected server response (${response.statusCode}).',
        status: response.statusCode);
  }

  static Err<T> mapDioError<T>(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return Err(ErrorCodes.timeout, 'The request timed out.');
      case DioExceptionType.connectionError:
        return Err(ErrorCodes.network, 'No connection.');
      default:
        return Err(ErrorCodes.unknown, e.message ?? 'Request failed.');
    }
  }

  /* ------------------------------------------------------------- refresh */

  /// Exchanges the refresh token for a new pair. Safe to call concurrently:
  /// all callers share one in-flight request.
  Future<bool> refreshSession() => _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

  Future<bool> _doRefresh() async {
    final refresh = await tokens.readRefreshToken();
    if (refresh == null) return false;
    try {
      final response = await _refreshDio.put<dynamic>('/auth/session', data: {'refreshToken': refresh});
      final result = parseEnvelope<Map<String, dynamic>>(response, (d) => d as Map<String, dynamic>);
      switch (result) {
        case Ok<Map<String, dynamic>>(:final data):
          final access = data['accessToken'] as String?;
          final newRefresh = data['refreshToken'] as String?;
          if (access == null || newRefresh == null) return false;
          await tokens.save(accessToken: access, refreshToken: newRefresh);
          return true;
        case Err<Map<String, dynamic>>(:final code):
          // 5xx / rate limits are not a verdict on the session. Only an explicit
          // UNAUTHENTICATED ends it.
          if (code == ErrorCodes.unauthenticated) {
            await tokens.clear();
            onSessionExpired?.call();
          }
          return false;
      }
    } on DioException {
      // Offline: keep the refresh token. Bad signal must not sign anyone out.
      return false;
    }
  }
}

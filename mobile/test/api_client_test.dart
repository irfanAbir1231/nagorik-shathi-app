import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';

/// Scripted HTTP adapter: lets a test decide each response and count calls.
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.handler);
  final Future<ResponseBody> Function(RequestOptions options) handler;
  final calls = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? body, Future<void>? cancel) {
    calls.add(options);
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody json(Object body, {int status = 200}) => ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );

Map<String, Object?> ok(Object? data) => {'success': true, 'data': data, 'requestId': 'r1'};
Map<String, Object?> fail(String code) => {
      'success': false,
      'error': {'code': code, 'message': 'x'},
      'requestId': 'r1',
    };

Dio dioWith(FakeAdapter a) => Dio(BaseOptions(baseUrl: 'http://t/api/v1', validateStatus: (_) => true))
  ..httpClientAdapter = a;

void main() {
  test('parses the success envelope and sends mobile headers', () async {
    final adapter = FakeAdapter((_) async => json(ok({'n': 1})));
    final store = MemoryTokenStore();
    await store.save(accessToken: 'AT', refreshToken: 'RT');
    final api = ApiClient(tokens: store, dio: dioWith(adapter), refreshDio: dioWith(adapter));

    final result = await api.get<int>('/x', parse: (d) => (d as Map)['n'] as int);

    expect((result as Ok<int>).data, 1);
    expect(adapter.calls.single.headers['Authorization'], 'Bearer AT');
  });

  test('maps an error envelope to its code', () async {
    final adapter = FakeAdapter((_) async => json(fail('RATE_LIMITED'), status: 429));
    final api = ApiClient(tokens: MemoryTokenStore(), dio: dioWith(adapter), refreshDio: dioWith(adapter));

    final result = await api.get<int>('/x', parse: (_) => 0);

    expect((result as Err<int>).code, ErrorCodes.rateLimited);
    expect(result.requestId, 'r1');
  });

  test('on 401 refreshes once and retries the original request with the new token', () async {
    final store = MemoryTokenStore();
    await store.save(accessToken: 'OLD', refreshToken: 'RT1');
    final main = FakeAdapter((o) async {
      final auth = o.headers['Authorization'];
      return auth == 'Bearer NEW' ? json(ok('fine')) : json(fail('UNAUTHENTICATED'), status: 401);
    });
    final refresh = FakeAdapter((_) async => json(ok({'accessToken': 'NEW', 'refreshToken': 'RT2'})));
    final api = ApiClient(tokens: store, dio: dioWith(main), refreshDio: dioWith(refresh));

    final result = await api.get<String>('/x', parse: (d) => d as String);

    expect((result as Ok<String>).data, 'fine');
    expect(refresh.calls, hasLength(1));
    expect(await store.readRefreshToken(), 'RT2');
  });

  test('parallel 401s share ONE refresh (the server treats a replay as theft)', () async {
    final store = MemoryTokenStore();
    await store.save(accessToken: 'OLD', refreshToken: 'RT1');
    final main = FakeAdapter((o) async =>
        o.headers['Authorization'] == 'Bearer NEW' ? json(ok(1)) : json(fail('UNAUTHENTICATED'), status: 401));
    final gate = Completer<void>();
    final refresh = FakeAdapter((_) async {
      await gate.future;
      return json(ok({'accessToken': 'NEW', 'refreshToken': 'RT2'}));
    });
    final api = ApiClient(tokens: store, dio: dioWith(main), refreshDio: dioWith(refresh));

    final futures = List.generate(5, (_) => api.get<int>('/x', parse: (d) => d as int));
    await Future<void>.delayed(const Duration(milliseconds: 20));
    gate.complete();
    final results = await Future.wait(futures);

    expect(results.every((r) => r is Ok<int>), isTrue);
    expect(refresh.calls, hasLength(1));
  });

  test('a rejected refresh token ends the session and notifies', () async {
    final store = MemoryTokenStore();
    await store.save(accessToken: 'OLD', refreshToken: 'RT1');
    var expired = false;
    final main = FakeAdapter((_) async => json(fail('UNAUTHENTICATED'), status: 401));
    final refresh = FakeAdapter((_) async => json(fail('UNAUTHENTICATED'), status: 401));
    final api = ApiClient(
      tokens: store,
      dio: dioWith(main),
      refreshDio: dioWith(refresh),
      onSessionExpired: () => expired = true,
    );

    final result = await api.get<int>('/x', parse: (_) => 0);

    expect(result, isA<Err<int>>());
    expect(expired, isTrue);
    expect(await store.readRefreshToken(), isNull);
  });

  test('a server error during refresh does NOT sign the user out', () async {
    final store = MemoryTokenStore();
    await store.save(accessToken: 'OLD', refreshToken: 'RT1');
    final main = FakeAdapter((_) async => json(fail('UNAUTHENTICATED'), status: 401));
    final refresh = FakeAdapter((_) async => json(fail('INTERNAL'), status: 500));
    final api = ApiClient(tokens: store, dio: dioWith(main), refreshDio: dioWith(refresh));

    await api.get<int>('/x', parse: (_) => 0);

    expect(await store.readRefreshToken(), 'RT1');
  });

  test('credential endpoints never trigger a refresh', () async {
    final store = MemoryTokenStore();
    await store.save(accessToken: 'OLD', refreshToken: 'RT1');
    final main = FakeAdapter((_) async => json(fail('UNAUTHENTICATED'), status: 401));
    final refresh = FakeAdapter((_) async => json(ok({})));
    final api = ApiClient(tokens: store, dio: dioWith(main), refreshDio: dioWith(refresh));

    await api.post<int>('/auth/login', body: {}, authRetry: false, parse: (_) => 0);

    expect(refresh.calls, isEmpty);
  });
}

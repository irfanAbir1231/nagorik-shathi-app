import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/chat/data/chat_repository.dart';
import 'package:shebar_janala_app/core/providers.dart';
import 'package:shebar_janala_app/features/chat/presentation/chat_screen.dart';
import 'package:shebar_janala_app/features/voice/application/voice_controller.dart';
import 'package:shebar_janala_app/features/voice/application/voice_providers.dart';
import 'package:shebar_janala_app/features/voice/data/device_speaker.dart';
import 'package:shebar_janala_app/features/voice/data/voice_repository.dart';
import 'package:shebar_janala_app/features/voice/domain/speech_input.dart';
import 'package:shebar_janala_app/l10n/generated/app_localizations.dart';

class FakeEngine implements SpeechInput {
  FakeEngine({this.text = 'আমি একজন কৃষক', this.startFailure, this.stopFailure});
  final String text;
  final VoiceFailure? startFailure;
  final VoiceFailure? stopFailure;
  void Function()? autoStop;
  var cancelled = false;
  String? startedWith;

  @override
  String get name => 'fake';

  @override
  Future<void> start({
    required String locale,
    required void Function(String) onPartial,
    required void Function() onAutoStop,
  }) async {
    if (startFailure != null) throw startFailure!;
    startedWith = locale;
    autoStop = onAutoStop;
    onPartial('আমি');
  }

  @override
  Future<String> stop() async {
    if (stopFailure != null) throw stopFailure!;
    return text;
  }

  @override
  Future<void> cancel() async => cancelled = true;
}

class FakeSpeaker implements Speaker {
  FakeSpeaker({this.available = true});
  final bool available;
  final spoken = <String>[];
  void Function()? done;

  @override
  Future<bool> canSpeak(String language) async => available;

  @override
  Future<void> speak(String text, String language, {required void Function() onDone}) async {
    spoken.add('$language:$text');
    done = onDone;
  }

  @override
  Future<void> stop() async {}
}

ProviderContainer container(SpeechInput engine, {Speaker? speaker}) {
  final c = ProviderContainer(overrides: [
    speechEngineProvider.overrideWith((ref) async => engine),
    if (speaker != null) speakerProvider.overrideWithValue(speaker),
  ]);
  addTearDown(c.dispose);
  return c;
}

void main() {
  group('VoiceController', () {
    test('tap to listen, tap to stop: delivers the transcript and returns to idle', () async {
      final engine = FakeEngine();
      final c = container(engine);
      final ctl = c.read(voiceControllerProvider.notifier);

      await ctl.toggle('bn');
      expect(c.read(voiceControllerProvider).status, VoiceStatus.listening);
      expect(c.read(voiceControllerProvider).partial, 'আমি');
      expect(engine.startedWith, 'bn');

      await ctl.toggle('bn');
      final s = c.read(voiceControllerProvider);
      expect(s.status, VoiceStatus.idle);
      expect(s.result, 'আমি একজন কৃষক');
      expect(s.resultSeq, 1);
    });

    test('the engine ending by itself (silence timeout) also delivers the transcript', () async {
      final engine = FakeEngine();
      final c = container(engine);
      await c.read(voiceControllerProvider.notifier).toggle('bn');

      engine.autoStop!();
      await Future<void>.delayed(Duration.zero);

      expect(c.read(voiceControllerProvider).result, 'আমি একজন কৃষক');
    });

    test('a tap and an auto-stop at the same moment finish only once', () async {
      final engine = FakeEngine();
      final c = container(engine);
      final ctl = c.read(voiceControllerProvider.notifier);
      await ctl.toggle('bn');

      engine.autoStop!();
      await ctl.toggle('bn'); // second finish attempt while already transcribing/idle
      await Future<void>.delayed(Duration.zero);

      expect(c.read(voiceControllerProvider).resultSeq, 1);
    });

    test('a denied microphone permission is reported, not swallowed', () async {
      final c = container(FakeEngine(startFailure: const VoiceFailure(VoiceFailureKind.permissionDenied)));
      await c.read(voiceControllerProvider.notifier).toggle('bn');

      final s = c.read(voiceControllerProvider);
      expect(s.status, VoiceStatus.idle);
      expect(s.failure!.kind, VoiceFailureKind.permissionDenied);
    });

    test('hearing nothing is a failure the user can act on, and keeps the last transcript', () async {
      final c = container(FakeEngine(stopFailure: const VoiceFailure(VoiceFailureKind.noSpeech)));
      final ctl = c.read(voiceControllerProvider.notifier);
      await ctl.toggle('bn');
      await ctl.toggle('bn');

      expect(c.read(voiceControllerProvider).failure!.kind, VoiceFailureKind.noSpeech);
    });

    test('starting again clears the previous failure', () async {
      final c = container(FakeEngine(stopFailure: const VoiceFailure(VoiceFailureKind.noSpeech)));
      final ctl = c.read(voiceControllerProvider.notifier);
      await ctl.toggle('bn');
      await ctl.toggle('bn');
      await ctl.toggle('bn');
      expect(c.read(voiceControllerProvider).failure, isNull);
    });

    test('cancel stops the engine and produces no text', () async {
      final engine = FakeEngine();
      final c = container(engine);
      final ctl = c.read(voiceControllerProvider.notifier);
      await ctl.toggle('bn');
      await ctl.cancel();

      expect(engine.cancelled, isTrue);
      expect(c.read(voiceControllerProvider).status, VoiceStatus.idle);
      expect(c.read(voiceControllerProvider).result, isNull);
    });
  });

  group('SpeakingController', () {
    test('reads one message at a time and toggles off on a second tap', () async {
      final speaker = FakeSpeaker();
      final c = container(FakeEngine(), speaker: speaker);
      final ctl = c.read(speakingProvider.notifier);

      await ctl.toggle(messageId: 'm1', text: 'hello', language: 'en');
      expect(c.read(speakingProvider), 'm1');
      expect(speaker.spoken, ['en:hello']);

      await ctl.toggle(messageId: 'm1', text: 'hello', language: 'en');
      expect(c.read(speakingProvider), isNull);

      await ctl.toggle(messageId: 'm2', text: 'next', language: 'en');
      speaker.done!(); // playback finished
      expect(c.read(speakingProvider), isNull);
    });
  });

  group('VoiceRepository', () {
    ApiClient clientWith(Future<ResponseBody> Function(RequestOptions) handler, TokenStore store) {
      final adapter = _Adapter(handler);
      final dio = Dio(BaseOptions(baseUrl: 'http://t/api/v1', validateStatus: (_) => true))
        ..httpClientAdapter = adapter;
      return ApiClient(tokens: store, dio: dio, refreshDio: dio);
    }

    ResponseBody json(Object body, {int status = 200}) => ResponseBody.fromString(
          jsonEncode(body),
          status,
          headers: {
            Headers.contentTypeHeader: ['application/json'],
          },
        );

    test('reads server capabilities', () async {
      final api = clientWith(
        (_) async => json({
          'success': true,
          'data': {
            'voice': {'serverStt': true, 'serverTts': false},
          },
        }),
        MemoryTokenStore(),
      );
      final caps = (await VoiceRepository(api).capabilities() as Ok<VoiceCapabilities>).data;
      expect(caps.serverStt, isTrue);
      expect(caps.serverTts, isFalse);
    });

    test('uploads multipart audio and returns the text', () async {
      RequestOptions? seen;
      final api = clientWith((o) async {
        seen = o;
        return json({
          'success': true,
          'data': {'text': '  আমি একজন কৃষক  '},
        });
      }, MemoryTokenStore());

      final result = await VoiceRepository(api).transcribe(Uint8List(3000), locale: 'bn');

      expect((result as Ok<String>).data, 'আমি একজন কৃষক');
      expect(seen!.data, isA<FormData>());
      final form = seen!.data as FormData;
      expect(form.fields.map((e) => e.key), containsAll(['locale', 'purpose']));
      expect(form.files.single.key, 'audio');
    });

    test('after a 401 the upload is rebuilt and retried (a FormData can only be sent once)', () async {
      final store = MemoryTokenStore();
      await store.save(accessToken: 'OLD', refreshToken: 'RT');
      var uploads = 0;
      final api = clientWith((o) async {
        if (o.path.endsWith('/auth/session')) {
          return json({
            'success': true,
            'data': {'accessToken': 'NEW', 'refreshToken': 'RT2'},
          });
        }
        uploads++;
        return o.headers['Authorization'] == 'Bearer NEW'
            ? json({
                'success': true,
                'data': {'text': 'ok'},
              })
            : json({
                'success': false,
                'error': {'code': 'UNAUTHENTICATED', 'message': 'x'},
              }, status: 401);
      }, store);

      final result = await VoiceRepository(api).transcribe(Uint8List(3000), locale: 'bn');

      expect((result as Ok<String>).data, 'ok');
      expect(uploads, 2);
    });
  });

  group('chat screen microphone', () {
    Widget host(FakeEngine engine, {Speaker? speaker}) => ProviderScope(
          overrides: [
            speechEngineProvider.overrideWith((ref) async => engine),
            speakerProvider.overrideWithValue(speaker ?? FakeSpeaker(available: false)),
            chatRepositoryProvider.overrideWithValue(ChatRepository(ApiClient(tokens: MemoryTokenStore()))),
          ],
          child: MaterialApp(
            locale: const Locale('en'),
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            home: const ChatScreen(),
          ),
        );

    testWidgets('speaking fills the box for review instead of sending', (tester) async {
      await tester.pumpWidget(host(FakeEngine(text: 'I am a farmer')));

      await tester.tap(find.byIcon(Icons.mic));
      await tester.pump();
      expect(find.text('I'), findsNothing); // partial 'আমি' shown in the status line
      expect(find.text('আমি'), findsOneWidget);
      expect(find.byIcon(Icons.stop), findsOneWidget);

      await tester.tap(find.byIcon(Icons.stop));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(TextField, 'I am a farmer'), findsOneWidget);
      expect(find.byIcon(Icons.mic), findsOneWidget); // back to idle
    });

    testWidgets('a second dictation is appended to what is already typed', (tester) async {
      await tester.pumpWidget(host(FakeEngine(text: 'help')));
      await tester.enterText(find.byType(TextField), 'I need');

      await tester.tap(find.byIcon(Icons.mic));
      await tester.pump();
      await tester.tap(find.byIcon(Icons.stop));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(TextField, 'I need help'), findsOneWidget);
    });

    testWidgets('a denied permission shows how to fix it', (tester) async {
      await tester.pumpWidget(host(FakeEngine(startFailure: const VoiceFailure(VoiceFailureKind.permissionDenied))));
      await tester.tap(find.byIcon(Icons.mic));
      await tester.pumpAndSettle();

      expect(find.textContaining('Microphone access is off'), findsOneWidget);
    });
  });
}

class _Adapter implements HttpClientAdapter {
  _Adapter(this.handler);
  final Future<ResponseBody> Function(RequestOptions) handler;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? body, Future<void>? cancel) => handler(options);

  @override
  void close({bool force = false}) {}
}

@Tags(['live'])
library;

import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:shebar_janala_app/core/network/api_client.dart';
import 'package:shebar_janala_app/core/network/api_result.dart';
import 'package:shebar_janala_app/core/storage/token_store.dart';
import 'package:shebar_janala_app/features/auth/data/auth_repository.dart';
import 'package:shebar_janala_app/features/voice/data/voice_repository.dart';

/// Server-side speech-to-text, end to end through a real backend that has
/// `STT_API_KEY` / `STT_BASE_URL` configured (a real provider such as Groq, or a
/// stand-in with the same /audio/transcriptions shape).
///
///   flutter test test/live_voice_test.dart --tags live --run-skipped \
///     --dart-define=API_BASE_URL=http://localhost:3200
///
/// `EXPECT_TEXT` (optional) is the transcript the provider should return:
///   --dart-define=EXPECT_TEXT=...
void main() {
  setUpAll(() => HttpOverrides.global = null);

  test('the backend reports server speech-to-text and transcribes an uploaded clip', () async {
    final store = MemoryTokenStore();
    final api = ApiClient(tokens: store);
    final auth = AuthRepository(api: api, tokens: store);
    final voice = VoiceRepository(api);

    expect(await auth.login(phone: '01712345678', pin: '1234'), isA<Ok<Object?>>());

    // The app picks its engine from this: serverStt=true means "record and upload".
    final caps = (await voice.capabilities() as Ok<VoiceCapabilities>).data;
    expect(caps.serverStt, isTrue, reason: 'backend has no STT_API_KEY configured');

    // A short clip of arbitrary bytes: the provider (or stand-in) decides what it "heard".
    final rng = Random(7);
    final clip = Uint8List.fromList(List.generate(6000, (_) => rng.nextInt(256)));
    final result = await voice.transcribe(clip, locale: 'bn');

    final text = (result as Ok<String>).data;
    expect(text, isNotEmpty);
    const expected = String.fromEnvironment('EXPECT_TEXT');
    if (expected.isNotEmpty) expect(text, expected);
  });
}

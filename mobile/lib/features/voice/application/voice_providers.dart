import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_result.dart';
import '../../../core/providers.dart';
import '../data/device_speaker.dart';
import '../data/device_speech_input.dart';
import '../data/server_speech_input.dart';
import '../data/voice_repository.dart';
import '../domain/speech_input.dart';

final voiceRepositoryProvider = Provider<VoiceRepository>((ref) => VoiceRepository(ref.watch(apiClientProvider)));

/// Picks the engine once per app run: server transcription when the backend has
/// a speech provider configured, otherwise the phone's own recogniser.
final speechEngineProvider = FutureProvider<SpeechInput>((ref) async {
  final repo = ref.watch(voiceRepositoryProvider);
  final caps = await repo.capabilities();
  final serverStt = caps is Ok<VoiceCapabilities> && caps.data.serverStt;
  return serverStt ? ServerSpeechInput(repo) : DeviceSpeechInput();
});

final speakerProvider = Provider<Speaker>((ref) => DeviceSpeaker());

/// Whether a proper voice exists for [language]; decides if the speaker button shows.
final canSpeakProvider = FutureProvider.family<bool, String>((ref, language) {
  return ref.watch(speakerProvider).canSpeak(language);
});

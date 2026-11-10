import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/speech_input.dart';
import 'voice_providers.dart';

enum VoiceStatus { idle, listening, transcribing }

class VoiceState {
  const VoiceState({
    this.status = VoiceStatus.idle,
    this.partial = '',
    this.failure,
    this.result,
    this.resultSeq = 0,
  });

  final VoiceStatus status;

  /// Interim text while listening (device engine only).
  final String partial;
  final VoiceFailure? failure;

  /// Latest transcript. [resultSeq] changes on every delivery, so the UI can
  /// react to a repeated identical phrase too.
  final String? result;
  final int resultSeq;

  VoiceState copyWith({
    VoiceStatus? status,
    String? partial,
    VoiceFailure? failure,
    bool clearFailure = false,
    String? result,
    int? resultSeq,
  }) =>
      VoiceState(
        status: status ?? this.status,
        partial: partial ?? this.partial,
        failure: clearFailure ? null : (failure ?? this.failure),
        result: result ?? this.result,
        resultSeq: resultSeq ?? this.resultSeq,
      );
}

/// Tap once to start listening, tap again to stop. A toggle, not press-and-hold:
/// holding a button for the length of a sentence is hard for the elderly and for
/// anyone with a tremor, and impossible one-handed on a small phone.
class VoiceController extends Notifier<VoiceState> {
  SpeechInput? _engine;

  @override
  VoiceState build() => const VoiceState();

  Future<void> toggle(String language) async {
    switch (state.status) {
      case VoiceStatus.transcribing:
        return;
      case VoiceStatus.listening:
        return _finish();
      case VoiceStatus.idle:
        return _begin(language);
    }
  }

  Future<void> _begin(String language) async {
    state = state.copyWith(status: VoiceStatus.listening, partial: '', clearFailure: true);
    try {
      _engine = await ref.read(speechEngineProvider.future);
      await _engine!.start(
        locale: language,
        onPartial: (text) {
          if (state.status == VoiceStatus.listening) state = state.copyWith(partial: text);
        },
        onAutoStop: _finish,
      );
    } on VoiceFailure catch (f) {
      state = VoiceState(failure: f, result: state.result, resultSeq: state.resultSeq);
    } catch (_) {
      state = VoiceState(
        failure: const VoiceFailure(VoiceFailureKind.unavailable),
        result: state.result,
        resultSeq: state.resultSeq,
      );
    }
  }

  Future<void> _finish() async {
    // The engine can report its own end and the user can tap at the same moment.
    if (state.status != VoiceStatus.listening) return;
    state = state.copyWith(status: VoiceStatus.transcribing);
    try {
      final text = await _engine!.stop();
      state = VoiceState(result: text, resultSeq: state.resultSeq + 1);
    } on VoiceFailure catch (f) {
      state = VoiceState(failure: f, result: state.result, resultSeq: state.resultSeq);
    } catch (_) {
      state = VoiceState(
        failure: const VoiceFailure(VoiceFailureKind.unavailable),
        result: state.result,
        resultSeq: state.resultSeq,
      );
    }
  }

  Future<void> cancel() async {
    if (state.status == VoiceStatus.idle) return;
    await _engine?.cancel();
    state = VoiceState(result: state.result, resultSeq: state.resultSeq);
  }
}

final voiceControllerProvider = NotifierProvider<VoiceController, VoiceState>(VoiceController.new);

/// Which message is being read aloud, if any. One at a time.
class SpeakingController extends Notifier<String?> {
  @override
  String? build() => null;

  Future<void> toggle({required String messageId, required String text, required String language}) async {
    final speaker = ref.read(speakerProvider);
    if (state == messageId) {
      await speaker.stop();
      state = null;
      return;
    }
    state = messageId;
    await speaker.speak(text, language, onDone: () {
      if (state == messageId) state = null;
    });
  }

  Future<void> stop() async {
    await ref.read(speakerProvider).stop();
    state = null;
  }
}

final speakingProvider = NotifierProvider<SpeakingController, String?>(SpeakingController.new);

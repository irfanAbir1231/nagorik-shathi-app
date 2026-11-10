import '../../../core/network/api_result.dart';

enum VoiceFailureKind {
  /// The user refused the microphone (or speech recognition) permission.
  permissionDenied,

  /// No engine can run: no server transcription configured, no recogniser on the device.
  unavailable,

  /// The device recogniser exists but has no Bangla (or requested) language pack.
  localeUnavailable,

  /// The recording completed but nothing intelligible was heard.
  noSpeech,

  /// The server rejected or failed the transcription; see [VoiceFailure.err].
  server,
}

class VoiceFailure implements Exception {
  const VoiceFailure(this.kind, {this.err});
  final VoiceFailureKind kind;
  final Err<dynamic>? err;

  @override
  String toString() => 'VoiceFailure($kind)';
}

/// One way of turning speech into text.
///
/// Two implementations exist because neither works everywhere: server
/// transcription works on any phone but needs the backend configured with a
/// speech provider; the device recogniser needs no server but depends on the
/// phone having a Bangla language pack.
abstract class SpeechInput {
  /// 'server' or 'device'.
  String get name;

  /// Begins listening. [onPartial] reports interim text where the engine can
  /// (device only). [onAutoStop] fires when the engine ends by itself (silence,
  /// time limit) so the caller can collect the result.
  Future<void> start({
    required String locale,
    required void Function(String partial) onPartial,
    required void Function() onAutoStop,
  });

  /// Stops listening and returns the final text. Throws [VoiceFailure].
  Future<String> stop();

  /// Abandons the session without producing text.
  Future<void> cancel();
}

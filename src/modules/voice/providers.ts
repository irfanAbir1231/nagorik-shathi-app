import { env } from '@/lib/config/env';

/**
 * Server-side speech-to-text, behind the same provider-adapter seam as the
 * language model.
 *
 * WHY A SERVER PATH EXISTS AT ALL. The browser's Web Speech API is free and
 * instant, and the chat composer already uses it — but it is effectively
 * Chrome-only. It is missing from Firefox and, critically, from most Android
 * WebViews, which is what a citizen gets when they open a link inside Facebook
 * or WhatsApp. Relying on it alone means voice works for the users least likely
 * to need it and fails for the ones most likely to.
 *
 * WHAT IS DELIBERATELY NOT HERE. There is no simulated transcriber. You cannot
 * fake hearing: a plausible-looking invented transcript would be acted upon, and
 * a wrong income figure produces a confidently wrong eligibility answer. With no
 * provider configured and no browser support, the microphone is DISABLED WITH A
 * STATED REASON — the same honest-degradation pattern already used for voice OTP.
 *
 * The adapter targets the OpenAI-compatible `/audio/transcriptions` shape, which
 * Whisper, a self-hosted whisper.cpp server, and several hosted providers all
 * speak. `STT_BASE_URL` is therefore the whole configuration story: point it at
 * a vendor or at your own GPU box without touching this file.
 */

export type SttEngine = 'openai-compatible' | 'elevenlabs' | 'unavailable';

export interface TranscriptionResult {
  readonly text: string;
  readonly engine: SttEngine;
  readonly model: string;
  /** Provider-reported language, when it gives one. Never trusted for routing. */
  readonly detectedLanguage?: string;
  readonly durationMs: number;
}

export class SttError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'SttError';
  }
}

export interface SttProvider {
  readonly engine: SttEngine;
  readonly model: string;
  readonly isLive: boolean;
  transcribe(input: {
    readonly audio: Blob;
    readonly filename: string;
    /** BCP-47 hint. Bangla accuracy is materially better with it than without. */
    readonly language?: 'bn' | 'en';
    /**
     * Vocabulary bias. Supplied by the caller rather than read from config here,
     * because the right hint depends on whether this is a one-word command or a
     * dictated sentence — see modules/voice/stt-prompt.
     */
    readonly prompt?: string;
    readonly signal?: AbortSignal;
  }): Promise<TranscriptionResult>;
}

class OpenAiCompatibleStt implements SttProvider {
  readonly engine = 'openai-compatible' as const;
  readonly model = env.STT_MODEL;
  readonly isLive = true;

  async transcribe(input: {
    audio: Blob;
    filename: string;
    language?: 'bn' | 'en';
    prompt?: string;
    signal?: AbortSignal;
  }): Promise<TranscriptionResult> {
    const started = Date.now();
    const form = new FormData();
    form.append('file', input.audio, input.filename);
    form.append('model', this.model);
    // A language hint materially improves Bangla accuracy, and the recogniser
    // guessing English on Bangla audio is a common, silent failure.
    if (input.language) form.append('language', input.language);
    form.append('response_format', 'json');
    /**
     * Vocabulary bias, chosen by the caller.
     *
     * It used to read `env.STT_PROMPT` unconditionally, which meant a one-word
     * command got the same long domain vocabulary as a dictated sentence. That
     * hurts short audio: given silence and the full prompt, this model returned
     * "সন্তান" — a prompt word present in no audio. See stt-prompt.ts.
     */
    if (input.prompt) form.append('prompt', input.prompt);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const onAbort = () => controller.abort();
    input.signal?.addEventListener('abort', onAbort);

    try {
      const response = await fetch(`${env.STT_BASE_URL.replace(/\/+$/, '')}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.STT_API_KEY ?? ''}` },
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new SttError(
          `Transcription provider responded ${response.status}: ${body.slice(0, 200)}`,
          response.status,
          response.status === 429 || response.status >= 500,
        );
      }

      const payload = (await response.json()) as { text?: string; language?: string };
      const text = (payload.text ?? '').trim();
      // An empty transcript is a real outcome (silence, noise, a muted mic), not
      // an error — the caller tells the citizen it heard nothing and to try again.
      return {
        text,
        engine: this.engine,
        model: this.model,
        ...(payload.language ? { detectedLanguage: payload.language } : {}),
        durationMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
      input.signal?.removeEventListener('abort', onAbort);
    }
  }
}

/* ----------------------------------------------------------- ElevenLabs */

const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
/** `STT_MODEL` defaults to Whisper's name, which means nothing to ElevenLabs. */
const ELEVENLABS_DEFAULT_MODEL = 'scribe_v1';
/** ISO 639-3, the form ElevenLabs documents for `language_code`. */
const ELEVENLABS_LANGUAGE = { bn: 'ben', en: 'eng' } as const;

/** The base URL actually used: an explicit `STT_BASE_URL` wins (a proxy, or a test double). */
function sttBaseUrl(): string {
  const configured = env.STT_BASE_URL.replace(/\/+$/, '');
  if (env.STT_PROVIDER === 'elevenlabs' && configured === OPENAI_DEFAULT_BASE_URL) return ELEVENLABS_BASE_URL;
  return configured;
}

/**
 * ElevenLabs Scribe. Not OpenAI-compatible, so it cannot share the adapter above:
 *
 *   POST {base}/speech-to-text      multipart: file, model_id, language_code, ...
 *   header  xi-api-key: <key>       (not `Authorization: Bearer`)
 *   reply   { text, language_code, ... }
 *
 * Scribe has no free-text vocabulary prompt, so `input.prompt` is not used.
 * `tag_audio_events=false` stops it inserting "(laughter)"-style markers, which the
 * command matcher would otherwise see as words.
 */
class ElevenLabsStt implements SttProvider {
  readonly engine = 'elevenlabs' as const;
  readonly model = env.STT_MODEL === 'whisper-1' ? ELEVENLABS_DEFAULT_MODEL : env.STT_MODEL;
  readonly isLive = true;

  async transcribe(input: {
    audio: Blob;
    filename: string;
    language?: 'bn' | 'en';
    prompt?: string;
    signal?: AbortSignal;
  }): Promise<TranscriptionResult> {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const onAbort = () => controller.abort();
    input.signal?.addEventListener('abort', onAbort);

    const send = (full: boolean) => {
      const form = new FormData();
      form.append('file', input.audio, input.filename);
      form.append('model_id', this.model);
      if (full) {
        if (input.language) form.append('language_code', ELEVENLABS_LANGUAGE[input.language]);
        form.append('tag_audio_events', 'false');
        form.append('timestamps_granularity', 'none');
      }
      return fetch(`${sttBaseUrl()}/speech-to-text`, {
        method: 'POST',
        headers: { 'xi-api-key': env.STT_API_KEY ?? '' },
        body: form,
        signal: controller.signal,
      });
    };

    try {
      let response = await send(true);
      // A 400/422 means the service did not accept one of the OPTIONAL fields (a
      // language code it does not know, a parameter renamed in a newer API). Retry
      // once with only the audio and model, so a hint can never be the reason
      // someone's voice is not heard. Auth and quota errors are not retried.
      if (response.status === 400 || response.status === 422) response = await send(false);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new SttError(
          `Transcription provider responded ${response.status}: ${body.slice(0, 200)}`,
          response.status,
          response.status === 429 || response.status >= 500,
        );
      }

      const payload = (await response.json()) as { text?: string; language_code?: string };
      return {
        text: (payload.text ?? '').trim(),
        engine: this.engine,
        model: this.model,
        ...(payload.language_code ? { detectedLanguage: payload.language_code } : {}),
        durationMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
      input.signal?.removeEventListener('abort', onAbort);
    }
  }
}

let cached: SttProvider | null = null;

/** Null when no provider is configured — never a pretend transcriber. */
export function getSttProvider(): SttProvider | null {
  if (cached) return cached;
  if (!env.STT_API_KEY) return null;
  cached = env.STT_PROVIDER === 'elevenlabs' ? new ElevenLabsStt() : new OpenAiCompatibleStt();
  return cached;
}

export function setSttProviderForTesting(provider: SttProvider | null): void {
  cached = provider;
}

export interface VoiceCapabilities {
  /**
   * Which path the client should take. `server` means do not use Web Speech even
   * where it exists, so every browser behaves identically.
   */
  readonly mode: 'auto' | 'server' | 'browser';
  /** Server transcription available for browsers without Web Speech. */
  readonly serverStt: boolean;
  readonly sttModel: string | null;
  readonly sttBaseUrl: string | null;
  /** Server-side speech synthesis. Browser TTS is separate and client-detected. */
  readonly serverTts: boolean;
  readonly ttsModel: string | null;
  /**
   * Voice navigation is ALWAYS available: intent resolution is deterministic and
   * needs no provider, so a browser with Web Speech drives the whole app with no
   * key configured at all.
   */
  readonly navigation: true;
}

export function describeVoiceCapabilities(): VoiceCapabilities {
  const stt = getSttProvider();
  return {
    // A `server` preference with no key would leave the citizen with a mic that
    // can never work, so it is reported as `auto` unless the key is actually
    // present. Configuration intent does not override reality.
    mode: env.VOICE_MODE === 'server' && !env.STT_API_KEY ? 'auto' : env.VOICE_MODE,
    serverStt: stt !== null,
    sttModel: stt?.model ?? null,
    sttBaseUrl: stt ? sttBaseUrl() : null,
    serverTts: Boolean(env.TTS_API_KEY),
    ttsModel: env.TTS_API_KEY ? env.TTS_MODEL : null,
    navigation: true,
  };
}

/* ------------------------------------------------------------------- TTS */

export interface TtsProvider {
  readonly model: string;
  synthesise(input: {
    readonly text: string;
    readonly locale: 'bn' | 'en';
    readonly signal?: AbortSignal;
  }): Promise<{ audio: ArrayBuffer; contentType: string }>;
}

/**
 * Server-side synthesis, for browsers with no Bangla voice installed.
 *
 * Android frequently ships without a `bn-BD` voice, and `speechSynthesis` then
 * either stays silent or reads Bangla text with an English voice — which is
 * unintelligible, and worse than no read-aloud at all because it sounds like the
 * app is working. The client detects that case and falls back here.
 *
 * Cost is bounded by design: most of what this app reads aloud is deterministic
 * (programme titles, condition reasons, next steps all come from the catalogue
 * and the rule set), so responses are cacheable per locale. Only live
 * model-rendered prose is novel.
 */
class OpenAiCompatibleTts implements TtsProvider {
  readonly model = env.TTS_MODEL;

  async synthesise(input: {
    text: string;
    locale: 'bn' | 'en';
    signal?: AbortSignal;
  }): Promise<{ audio: ArrayBuffer; contentType: string }> {
    const response = await fetch(`${env.TTS_BASE_URL.replace(/\/+$/, '')}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.TTS_API_KEY ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        voice: env.TTS_VOICE,
        input: input.text,
        response_format: 'mp3',
      }),
      ...(input.signal ? { signal: input.signal } : {}),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new SttError(`Speech provider responded ${response.status}: ${body.slice(0, 200)}`, response.status);
    }

    return { audio: await response.arrayBuffer(), contentType: 'audio/mpeg' };
  }
}

let cachedTts: TtsProvider | null = null;

export function getTtsProvider(): TtsProvider | null {
  if (cachedTts) return cachedTts;
  if (!env.TTS_API_KEY) return null;
  cachedTts = new OpenAiCompatibleTts();
  return cachedTts;
}

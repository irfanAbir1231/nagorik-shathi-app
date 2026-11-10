import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * ElevenLabs Scribe adapter.
 *
 * The provider is chosen once from `env`, so each test sets the environment and
 * re-imports the module. `fetch` is replaced, so nothing here reaches the network.
 */

type Call = { url: string; headers: Record<string, string>; form: FormData };

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('@/modules/voice/providers');
}

function mockFetch(replies: Array<{ status?: number; json?: unknown; text?: string }>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string>, form: init.body as FormData });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)]!;
    const status = reply.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => reply.json ?? {},
      text: async () => reply.text ?? '',
    } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

const audio = new Blob([new Uint8Array(4000)], { type: 'audio/mp4' });
const base = { STT_PROVIDER: 'elevenlabs', STT_API_KEY: 'xi-test-key' };

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('provider selection', () => {
  it('uses ElevenLabs only when STT_PROVIDER says so', async () => {
    const eleven = await load(base);
    expect(eleven.getSttProvider()!.engine).toBe('elevenlabs');

    const other = await load({ STT_PROVIDER: 'openai-compatible', STT_API_KEY: 'k' });
    expect(other.getSttProvider()!.engine).toBe('openai-compatible');
  });

  it('is unavailable without a key, never a pretend transcriber', async () => {
    const mod = await load({ STT_PROVIDER: 'elevenlabs', STT_API_KEY: '' });
    expect(mod.getSttProvider()).toBeNull();
    expect(mod.describeVoiceCapabilities().serverStt).toBe(false);
  });

  it('defaults the model to Scribe, not Whisper, and reports the ElevenLabs address', async () => {
    const mod = await load(base);
    expect(mod.getSttProvider()!.model).toBe('scribe_v1');
    const caps = mod.describeVoiceCapabilities();
    expect(caps.serverStt).toBe(true);
    expect(caps.sttModel).toBe('scribe_v1');
    expect(caps.sttBaseUrl).toBe('https://api.elevenlabs.io/v1');
  });

  it('honours an explicit model and base URL (a proxy or a test double)', async () => {
    const mod = await load({ ...base, STT_MODEL: 'scribe_v2', STT_BASE_URL: 'http://localhost:4010' });
    expect(mod.getSttProvider()!.model).toBe('scribe_v2');
    expect(mod.describeVoiceCapabilities().sttBaseUrl).toBe('http://localhost:4010');
  });
});

describe('request', () => {
  it('posts the audio to /speech-to-text with the xi-api-key header and Bangla as ISO 639-3', async () => {
    const calls = mockFetch([{ json: { text: ' আমি একজন কৃষক ', language_code: 'ben' } }]);
    const mod = await load(base);

    const result = await mod.getSttProvider()!.transcribe({ audio, filename: 'speech.mp4', language: 'bn' });

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.url).toBe('https://api.elevenlabs.io/v1/speech-to-text');
    expect(call.headers['xi-api-key']).toBe('xi-test-key');
    expect(call.headers.Authorization).toBeUndefined(); // not a Bearer API
    expect(call.form.get('model_id')).toBe('scribe_v1');
    expect(call.form.get('language_code')).toBe('ben');
    expect(call.form.get('tag_audio_events')).toBe('false');
    expect(call.form.get('file')).toBeInstanceOf(Blob);

    expect(result.text).toBe('আমি একজন কৃষক'); // trimmed
    expect(result.engine).toBe('elevenlabs');
    expect(result.detectedLanguage).toBe('ben');
  });

  it('maps English to eng and sends no language when none is given', async () => {
    const calls = mockFetch([{ json: { text: 'hello' } }, { json: { text: 'hello' } }]);
    const mod = await load(base);
    const provider = mod.getSttProvider()!;

    await provider.transcribe({ audio, filename: 'a.mp4', language: 'en' });
    await provider.transcribe({ audio, filename: 'a.mp4' });

    expect(calls[0]!.form.get('language_code')).toBe('eng');
    expect(calls[1]!.form.has('language_code')).toBe(false);
  });

  it('never sends the Whisper vocabulary prompt, which Scribe has no field for', async () => {
    const calls = mockFetch([{ json: { text: 'x' } }]);
    const mod = await load(base);
    await mod.getSttProvider()!.transcribe({ audio, filename: 'a.mp4', language: 'bn', prompt: 'বিধবা ভাতা' });
    expect(calls[0]!.form.has('prompt')).toBe(false);
  });
});

describe('failure handling', () => {
  it('treats silence as an empty transcript, not an error', async () => {
    mockFetch([{ json: { text: '' } }]);
    const mod = await load(base);
    const result = await mod.getSttProvider()!.transcribe({ audio, filename: 'a.mp4', language: 'bn' });
    expect(result.text).toBe('');
  });

  it('retries ONCE with only audio and model when optional fields are rejected', async () => {
    const calls = mockFetch([
      { status: 422, text: 'unknown language_code' },
      { json: { text: 'ঠিক আছে' } },
    ]);
    const mod = await load(base);

    const result = await mod.getSttProvider()!.transcribe({ audio, filename: 'a.mp4', language: 'bn' });

    expect(calls).toHaveLength(2);
    expect(calls[1]!.form.get('model_id')).toBe('scribe_v1');
    expect(calls[1]!.form.has('language_code')).toBe(false);
    expect(calls[1]!.form.has('tag_audio_events')).toBe(false);
    expect(result.text).toBe('ঠিক আছে');
  });

  it('does not retry an auth failure, and reports it as not retryable', async () => {
    const calls = mockFetch([{ status: 401, text: 'invalid api key' }]);
    const mod = await load(base);

    await expect(
      mod.getSttProvider()!.transcribe({ audio, filename: 'a.mp4', language: 'bn' }),
    ).rejects.toMatchObject({ name: 'SttError', status: 401, retryable: false });
    expect(calls).toHaveLength(1);
  });

  it('marks rate limits and server errors as retryable', async () => {
    mockFetch([{ status: 429, text: 'too many requests' }]);
    const mod = await load(base);
    await expect(
      mod.getSttProvider()!.transcribe({ audio, filename: 'a.mp4', language: 'bn' }),
    ).rejects.toMatchObject({ status: 429, retryable: true });

    mockFetch([{ status: 503 }]);
    const mod2 = await load(base);
    await expect(
      mod2.getSttProvider()!.transcribe({ audio, filename: 'a.mp4', language: 'bn' }),
    ).rejects.toMatchObject({ status: 503, retryable: true });
  });

  it('gives up when the retry also fails, without looping', async () => {
    const calls = mockFetch([{ status: 422 }, { status: 422 }]);
    const mod = await load(base);
    await expect(
      mod.getSttProvider()!.transcribe({ audio, filename: 'a.mp4', language: 'bn' }),
    ).rejects.toMatchObject({ status: 422 });
    expect(calls).toHaveLength(2);
  });
});

/* eslint-disable no-console */
import './load-env';
import { env } from '../src/lib/config/env';
import { describeVoiceCapabilities, getSttProvider, getTtsProvider } from '../src/modules/voice/providers';

/**
 * Verifies the speech configuration against the live endpoints.
 *
 * Written because "voice does not work" has at least six distinct causes — no
 * key, wrong base URL, a model id the account does not expose, a browser without
 * Web Speech, a device with no Bangla voice, an insecure origin — and guessing
 * between them from the UI is miserable. This answers the server-side half
 * definitively; the in-app capability panel answers the browser half.
 *
 * Run:  npm run voice:check
 */

function mask(value: string | undefined): string {
  if (!value) return '(not set)';
  return value.length <= 10 ? '*'.repeat(value.length) : `${value.slice(0, 4)}…${value.slice(-4)}`;
}

/**
 * A real, decodable 16-bit PCM WAV: 0.6 s of a 440 Hz tone.
 *
 * Sent instead of random bytes because every provider validates the container
 * before charging for a decode, and a rejected upload would look identical to a
 * bad key. A tone transcribes to nothing useful, which is fine — the plumbing is
 * what is under test.
 */
function toneWav(): Buffer {
  const sampleRate = 16_000;
  const seconds = 0.6;
  const samples = Math.floor(sampleRate * seconds);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i += 1) {
    const value = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000);
    data.writeInt16LE(value, i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

async function listModels(baseUrl: string, key: string): Promise<string[] | null> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: { id?: string }[] };
    return (body.data ?? []).map((m) => m.id ?? '').filter(Boolean);
  } catch {
    return null;
  }
}

async function main() {
  const capabilities = describeVoiceCapabilities();

  console.log('Shebar Janala — voice check\n');
  console.log(`  VOICE_MODE          ${env.VOICE_MODE}${capabilities.mode !== env.VOICE_MODE ? `  → reported as "${capabilities.mode}" (no STT key)` : ''}`);
  console.log(`  navigation          always available (deterministic, no key needed)`);
  console.log('');

  /* ------------------------------------------------------------ STT */
  console.log('  Speech to text');
  console.log(`    key               ${mask(env.STT_API_KEY)}`);
  console.log(`    base url          ${env.STT_BASE_URL}`);
  console.log(`    model             ${env.STT_MODEL}`);

  const stt = getSttProvider();
  if (!stt) {
    console.log('');
    console.log('    ✗ Not configured. Browsers WITHOUT the Web Speech API — Firefox, and');
    console.log('      most Android WebViews — have no way to listen, so the microphone is');
    console.log('      disabled with a stated reason and the typed-command box is offered.');
    console.log('      Voice navigation still works by typing.');
    console.log('');
    console.log('      NOTE: this is not a Bangla problem. With no provider nothing is');
    console.log('      heard in ANY language. Bangla UNDERSTANDING is separate and needs');
    console.log('      no key at all — verify it with:  npm run voice:bangla');
    console.log('');
    console.log('      To make speech work, the cheapest route is a FREE Groq key');
    console.log('      (console.groq.com), which speaks the same OpenAI shape, so only');
    console.log('      these three lines change in .env.local:');
    console.log('');
    console.log('        STT_API_KEY="gsk_..."');
    console.log('        STT_BASE_URL="https://api.groq.com/openai/v1"');
    console.log('        STT_MODEL="whisper-large-v3"');
    console.log('');
    console.log('      Then re-run this command. See docs/EXTERNAL.md §4a for the');
    console.log('      alternatives, including a self-hosted whisper.cpp with no account.');
  } else {
    const models = await listModels(env.STT_BASE_URL, env.STT_API_KEY ?? '');
    if (models) {
      console.log(`    models available  ${models.slice(0, 12).join(', ')}${models.length > 12 ? ` … (+${models.length - 12})` : ''}`);
      if (!models.includes(env.STT_MODEL)) {
        console.warn(`    ! STT_MODEL "${env.STT_MODEL}" is not in that list — a request would 404.`);
      }
    } else {
      console.log('    models available  (endpoint does not expose /models — not an error)');
    }

    console.log('    sending a 0.6s test clip…');
    try {
      const wav = toneWav();
      const result = await stt.transcribe({
        // Copied into a Uint8Array: Node's Buffer may be backed by a
        // SharedArrayBuffer, which is not a valid BlobPart under strict types.
        audio: new Blob([new Uint8Array(wav)], { type: 'audio/wav' }),
        filename: 'check.wav',
        language: 'bn',
      });
      console.log(`    ✓ transcribed in  ${result.durationMs} ms`);
      console.log(`      engine / model  ${result.engine} / ${result.model}`);
      console.log(`      text            ${result.text ? `"${result.text.slice(0, 60)}"` : '(empty — expected for a tone)'}`);
      console.log('');
      console.log('      Firefox and every other browser can now use the microphone: audio is');
      console.log('      recorded locally with MediaRecorder and transcribed here.');
    } catch (error) {
      console.error(`    ✗ failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('      401 — bad key.  404 — model id not on this account.');
      console.error('      Connection refused — base url wrong, or the local server is not running.');
      process.exitCode = 1;
    }
  }

  /* ------------------------------------------------------------ TTS */
  console.log('');
  console.log('  Read aloud');
  console.log(`    key               ${mask(env.TTS_API_KEY)}`);
  console.log(`    base url          ${env.TTS_BASE_URL}`);
  console.log(`    model / voice     ${env.TTS_MODEL} / ${env.TTS_VOICE}`);

  const tts = getTtsProvider();
  if (!tts) {
    console.log('');
    console.log('    ✗ Not configured. Read-aloud falls back to the device\'s own voice, which');
    console.log('      on Android frequently has no Bangla option — in which case the button is');
    console.log('      shown disabled with the reason rather than reading Bangla in English.');
  } else {
    try {
      const { audio, contentType } = await tts.synthesise({ text: 'বিধবা ভাতা', locale: 'bn' });
      console.log(`    ✓ synthesised     ${audio.byteLength} bytes of ${contentType}`);
      console.log('      Read-aloud no longer depends on a voice being installed on the device.');
    } catch (error) {
      console.error(`    ✗ failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }

  console.log('');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

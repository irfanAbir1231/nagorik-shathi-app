import { z } from 'zod';

/**
 * Typed, validated, fail-fast configuration.
 *
 * Everything optional degrades to a documented in-process fallback so the
 * product runs with an empty .env.
 *
 * This module is SERVER-ONLY and must never be imported by a client component:
 * it reads secrets, and a single client import would bundle them. The two
 * browser-relevant values (`NEXT_PUBLIC_MAP_PROVIDER`, `NEXT_PUBLIC_APP_NAME`)
 * are read in a server component and passed down as props instead, so there is
 * no need for a second client-safe config module.
 */

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : v === 'true' || v === '1'));

const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number.parseInt(v, 10)))
    .pipe(z.number().int().positive());

const nonEmpty = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, 'must not be empty');

const optionalStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: nonEmpty.default(
    process.env.NEXT_PHASE === 'phase-production-build' ? 'https://build.invalid' : 'file:./data/accessai.db',
  ),
  DATABASE_AUTH_TOKEN: optionalStr,

  JWT_SECRET: nonEmpty.default('dev-only-access-secret-change-me-0000000000000000'),
  JWT_REFRESH_SECRET: nonEmpty.default('dev-only-refresh-secret-change-me-000000000000000'),
  ACCESS_TOKEN_TTL: nonEmpty.default('15m'),
  REFRESH_TOKEN_TTL: nonEmpty.default('30d'),

  /**
   * Forces a provider regardless of which keys are present. Without it, the
   * first configured key wins in a fixed order, which is surprising on a machine
   * that happens to have two keys in its environment.
   */
  AI_PROVIDER: z.enum(['anthropic', 'openai', 'deepseek', 'simulated']).optional(),

  ANTHROPIC_API_KEY: optionalStr,
  OPENAI_API_KEY: optionalStr,
  DEEPSEEK_API_KEY: optionalStr,
  ANTHROPIC_MODEL: nonEmpty.default('claude-sonnet-5'),
  OPENAI_MODEL: nonEmpty.default('gpt-4.1-mini'),
  OPENAI_EMBEDDING_MODEL: nonEmpty.default('text-embedding-3-small'),

  DEEPSEEK_MODEL: nonEmpty.default('deepseek-v4-flash'),
  /** OpenAI-compatible base URL. Override for a proxy or a regional endpoint. */
  DEEPSEEK_BASE_URL: nonEmpty.default('https://api.deepseek.com/v1'),
  /**
   * Whether the model produces a chain of thought. Values are the ones the API
   * actually accepts, verified against the live endpoint: `adaptive` (the
   * vendor's own default — it thinks whenever it judges thinking useful),
   * `enabled`, or `disabled`.
   *
   * DEFAULT IS `disabled`, deliberately, for three reasons:
   *  • This product does not need it. Every decision — eligibility, ranking,
   *    citations — is made deterministically BEFORE the model is called. The
   *    model only rewrites a fixed ResponsePlan into fluent prose, and there is
   *    nothing in that task to reason about.
   *  • A trace would be discarded unread, so leaving it on means paying for
   *    tokens that are thrown away. Measured on this account: ~52–79 reasoning
   *    tokens per call on `adaptive`, versus 0 when disabled — roughly 4x the
   *    output tokens for identical answers.
   *  • A chain of thought contains discarded hypotheses phrased as statements.
   *    Storing one beside a benefits decision would put rejected reasoning into
   *    an audit trail that is supposed to be defensible.
   */
  DEEPSEEK_THINKING: z.enum(['disabled', 'adaptive', 'enabled']).default('disabled'),
  /**
   * Only sent when thinking is not disabled. The API rejects `none` — turning
   * thinking off is `DEEPSEEK_THINKING`, not an effort level.
   */
  DEEPSEEK_REASONING_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).optional(),
  /**
   * Escape hatch merged into the request body last, so it can override anything
   * above if the API changes. Empty by default: sending a field the endpoint does
   * not recognise is a 400, not a no-op.
   */
  DEEPSEEK_EXTRA_BODY: optionalStr,

  OTP_DEV_ECHO: bool(true),
  /**
   * `ssl_wireless | bulksmsbd | twilio` dispatch a real message and need
   * SMS_API_KEY. `demo` needs no credential at all: it logs the message to
   * the server console, clearly labelled `[SMS:DEMO]`, and returns success —
   * for demonstrating the code path (delivery confirmation, error handling)
   * without a live vendor account. Never returned as a real send: nothing
   * downstream can mistake it for one. See docs/DEVIATIONS.md.
   */
  SMS_PROVIDER: optionalStr,
  SMS_API_KEY: optionalStr,
  SMS_SENDER_ID: optionalStr,
  /** SSL Wireless needs a second credential (a "SID") beyond the API key. */
  SMS_SID: optionalStr,

  /**
   * SJ-23/48 — shared secret an inbound USSD aggregator must present (as an
   * `X-Ussd-Secret` header) for its callback to be accepted. Without it any
   * caller could drive citizen-facing USSD menus.
   */
  USSD_GATEWAY_SECRET: optionalStr,

  /**
   * SJ-44 — AES-256-GCM key for field-level encryption at rest (currently
   * `userProfiles.medicalConditions` only — see docs/DEVIATIONS.md §18).
   * Base64-encoded, must decode to exactly 32 bytes. Unset in development:
   * a fixed, clearly-labelled fallback key is derived so a fresh clone still
   * runs, but `assertProductionSafety()` refuses to boot production on it.
   */
  FIELD_ENCRYPTION_KEY: optionalStr,

  /**
   * National ID verification, OPTIONAL. Named the same way `SMS_PROVIDER` is:
   * unset means every NID is format-checked and labelled `simulated_verified`
   * (never `verified`), and naming a provider without an implementation fails
   * loudly rather than silently pretending to check one — see
   * modules/identity/nid.service.ts and docs/DEVIATIONS.md.
   */
  NID_PROVIDER: optionalStr,
  NID_API_KEY: optionalStr,

  /* ------------------------------------------------------------- voice */
  /**
   * Speech-to-text, OPTIONAL. Without it, dictation uses the browser's Web
   * Speech API where available and the microphone is disabled with a stated
   * reason where it is not. Nothing is ever simulated: an invented transcript
   * would be acted on.
   *
   * The endpoint is the OpenAI-compatible `/audio/transcriptions` shape, which
   * hosted Whisper and a self-hosted whisper.cpp server both speak — so
   * `STT_BASE_URL` is the only thing that changes between them.
   */
  /**
   * Which path handles speech.
   *
   *   auto     Browser Web Speech where present, server otherwise. Cheapest.
   *   server   ALWAYS record and upload. Ignores Web Speech even where it exists,
   *            so behaviour is identical on every browser and the transcript
   *            quality is yours to control rather than Google's.
   *   browser  Never upload audio. The strictest privacy posture, at the cost of
   *            working only on Chromium.
   *
   * `server` still uses MediaRecorder to capture — that is unavoidable in a web
   * app — but MediaRecorder is near-universal, whereas Web Speech is not.
   */
  VOICE_MODE: z.enum(['auto', 'server', 'browser']).default('auto'),

  STT_API_KEY: optionalStr,
  STT_BASE_URL: nonEmpty.default('https://api.openai.com/v1'),
  STT_MODEL: nonEmpty.default('whisper-1'),
  /**
   * Vocabulary bias for the decoder, and the cheapest Bangla accuracy win here.
   *
   * Whisper-family models are trained overwhelmingly on English. Given Bangla
   * audio with no hint they will happily emit English that sounds vaguely
   * similar — "শোনাও" as "show now" — and the deterministic matcher then has
   * nothing to match, so a correctly heard command still fails.
   *
   * Seeded by default with BOTH halves of the vocabulary that matters: the
   * programme names a citizen describes their situation with, and the navigation
   * words they use to drive the app. A general model has no reason to prefer
   * "বিধবা ভাতা" over similar-sounding nonsense unless told this is the domain.
   *
   * Overridable, because a deployment that adds programmes should extend it.
   */
  STT_PROMPT: nonEmpty.default(
    [
      // what they are asking about
      'বিধবা ভাতা', 'বয়স্ক ভাতা', 'প্রতিবন্ধী ভাতা', 'মাতৃত্বকালীন ভাতা',
      'শিক্ষা বৃত্তি', 'কৃষি ঋণ', 'আইনি সহায়তা', 'প্রশিক্ষণ', 'অনুদান',
      // how they drive the app
      'সংরক্ষিত', 'সময়সূচি', 'কাছের অফিস', 'বিজ্ঞপ্তি', 'প্রোফাইল', 'সেটিংস',
      'কর্মসূচি', 'সুযোগ', 'সেভ করো', 'পড়ে শোনাও', 'সাহায্য', 'পিছনে',
      // numbers and money, where a mishearing is most consequential
      'টাকা', 'হাজার', 'লাখ', 'মাসিক আয়', 'সন্তান',
    ].join(', '),
  ),

  /** Text-to-speech, OPTIONAL — used only when the browser has no Bangla voice. */
  TTS_API_KEY: optionalStr,
  TTS_BASE_URL: nonEmpty.default('https://api.openai.com/v1'),
  TTS_MODEL: nonEmpty.default('tts-1'),
  TTS_VOICE: nonEmpty.default('alloy'),

  /**
   * SJ-21 — vision-based photo moderation, OPTIONAL, same seam pattern as
   * STT/TTS: an OpenAI-compatible `/chat/completions` endpoint whose model
   * accepts an image content part. Without a key, an uploaded issue photo is
   * marked `unavailable` and routed to human review rather than either
   * silently passing or inventing a verdict.
   *
   * `VISION_MODERATION_PROVIDER=demo` needs no key: a deterministic,
   * declared-as-simulated check (flags a photo under ~2KB, the size of a
   * placeholder/test image, passes anything larger) so the moderation
   * pipeline can be demonstrated end to end. Recorded as `demo_passed`/
   * `demo_flagged`, never `passed`/`flagged`, so it can never be mistaken
   * for a real vision-model verdict later. See modules/issues/vision-moderation.ts
   * and docs/DEVIATIONS.md.
   */
  VISION_MODERATION_PROVIDER: optionalStr,
  VISION_MODERATION_API_KEY: optionalStr,
  VISION_MODERATION_BASE_URL: nonEmpty.default('https://api.openai.com/v1'),
  VISION_MODERATION_MODEL: nonEmpty.default('gpt-4o-mini'),

  GOOGLE_MAPS_API_KEY: optionalStr,
  NEXT_PUBLIC_MAPBOX_TOKEN: optionalStr,
  /**
   * `osm` is the default because it is the only option that needs no account,
   * no key and no billing relationship — the map works on a fresh clone.
   */
  NEXT_PUBLIC_MAP_PROVIDER: z.enum(['none', 'osm', 'mapbox', 'google']).default('osm'),

  /**
   * Raster tile template. Proxied server-side, never fetched by the browser.
   *
   * Defaults to OpenStreetMap's own tiles, which their Tile Usage Policy permits
   * for low volume with attribution and an identifying User-Agent. A real
   * deployment should point this at its own cache or a paid provider — see
   * docs/EXTERNAL.md.
   */
  MAP_TILE_URL: nonEmpty.default('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
  /**
   * Sent as User-Agent on every tile and Overpass request. OSM blocks traffic
   * with no identifying agent, and rightly: an anonymous scraper cannot be asked
   * to stop.
   */
  MAP_USER_AGENT: nonEmpty.default('AccessAI/1.0 (prototype; +https://github.com/i-am-mushfiq/AccessAI)'),
  /** Overpass endpoint for real place lookups. Public instance by default. */
  OVERPASS_URL: nonEmpty.default('https://overpass-api.de/api/interpreter'),
  /** How long a cached Overpass result stays usable, in hours. */
  OVERPASS_CACHE_HOURS: int(24 * 14),
  /** Radius searched around the reference point, in kilometres. */
  OVERPASS_RADIUS_KM: int(25),

  SMTP_HOST: optionalStr,
  SMTP_PORT: int(587),
  SMTP_USER: optionalStr,
  SMTP_PASSWORD: optionalStr,
  SMTP_FROM: nonEmpty.default('AccessAI <no-reply@accessai.local>'),

  S3_BUCKET: optionalStr,
  S3_REGION: optionalStr,
  S3_ACCESS_KEY: optionalStr,
  S3_SECRET_KEY: optionalStr,
  S3_ENDPOINT: optionalStr,
  /** Public base URL for reading back what was written (an R2 bucket's r2.dev URL, or a custom domain). Falls back to S3_ENDPOINT/S3_BUCKET, which is not public on R2. */
  S3_PUBLIC_URL: optionalStr,

  NEXT_PUBLIC_APP_NAME: nonEmpty.default('AccessAI'),

  RATE_LIMIT_WINDOW_MS: int(60_000),
  RATE_LIMIT_MAX_REQUESTS: int(120),
  RATE_LIMIT_AI_MAX_REQUESTS: int(20),
  RATE_LIMIT_VOICE_MAX_REQUESTS: int(30),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }
  return parsed.data;
}

export const env = load();

/** Which AI provider will actually serve requests. */
export type AiMode = 'anthropic' | 'openai' | 'deepseek' | 'simulated';

export function resolveAiMode(): AiMode {
  // An explicit choice always wins, and is honoured even when it is wrong: if
  // AI_PROVIDER names a provider whose key is missing, `aiConfigProblems()`
  // reports it rather than this function silently falling back to another
  // provider the operator did not choose.
  if (env.AI_PROVIDER) return env.AI_PROVIDER;
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OPENAI_API_KEY) return 'openai';
  if (env.DEEPSEEK_API_KEY) return 'deepseek';
  return 'simulated';
}

/**
 * Misconfigurations that would make the AI layer fail at request time rather
 * than at startup. Surfaced on the admin overview so an operator who sets
 * AI_PROVIDER without the matching key finds out immediately.
 */
export function aiConfigProblems(): string[] {
  const problems: string[] = [];
  const mode = resolveAiMode();
  const keyFor: Record<string, string | undefined> = {
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    deepseek: env.DEEPSEEK_API_KEY,
  };
  if (mode !== 'simulated' && !keyFor[mode]) {
    problems.push(`AI_PROVIDER is "${mode}" but ${mode.toUpperCase()}_API_KEY is not set.`);
  }
  if (mode === 'deepseek' && env.DEEPSEEK_THINKING !== 'disabled') {
    problems.push(
      `DEEPSEEK_THINKING is "${env.DEEPSEEK_THINKING}", so the model will produce a chain of thought. This product discards it unread — you are paying for tokens nothing uses.`,
    );
  }
  if (env.DEEPSEEK_REASONING_EFFORT && env.DEEPSEEK_THINKING === 'disabled') {
    problems.push(
      'DEEPSEEK_REASONING_EFFORT is set but thinking is disabled, so it has no effect and is not sent.',
    );
  }
  if (env.DEEPSEEK_EXTRA_BODY) {
    try {
      const parsed: unknown = JSON.parse(env.DEEPSEEK_EXTRA_BODY);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        problems.push('DEEPSEEK_EXTRA_BODY must be a JSON object.');
      }
    } catch {
      problems.push('DEEPSEEK_EXTRA_BODY is not valid JSON and will be ignored.');
    }
  }
  return problems;
}

/** True when real vector embeddings are available; otherwise BM25 is used. */
export const hasEmbeddingProvider = Boolean(env.OPENAI_API_KEY);

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Refuse to boot a production deployment on the shipped dev secrets.
 * A weak JWT secret is a total-compromise defect, not a warning.
 */
export function assertProductionSafety(): string[] {
  const problems: string[] = [];
  if (!isProduction) return problems;
  if (env.JWT_SECRET.startsWith('dev-only')) problems.push('JWT_SECRET is still the shipped development value.');
  if (env.JWT_REFRESH_SECRET.startsWith('dev-only')) problems.push('JWT_REFRESH_SECRET is still the shipped development value.');
  if (env.JWT_SECRET.length < 32) problems.push('JWT_SECRET must be at least 32 characters.');
  if (env.OTP_DEV_ECHO) problems.push('OTP_DEV_ECHO must be false in production — it reveals OTPs to the client.');
  if (!env.FIELD_ENCRYPTION_KEY) {
    problems.push('FIELD_ENCRYPTION_KEY is not set — health data would be encrypted with the shipped development key.');
  }
  return problems;
}

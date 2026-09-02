import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { env } from '@/lib/config/env';

/**
 * SJ-44 — field-level encryption at rest, AES-256-GCM.
 *
 * Scope, deliberately: only `userProfiles.medicalConditions` is encrypted by
 * this pass. `district`/`upazila` were considered and rejected for now — they
 * are read in-memory by the eligibility engine but that path never filters on
 * them in SQL, so encrypting them is *safe*, but doing it well means touching
 * five-plus call sites (opportunity listing, nearby search, the AI extractor,
 * seed data) with no dedicated regression cycle to catch a mistake. `phone` is
 * a harder no: it is looked up via `WHERE phone = ?` on login, so encrypting
 * it for real needs a blind index (HMAC(phone) as a separate searchable
 * column, ciphertext for display) — a correct design, just not one to bolt
 * onto a live authentication path without isolated testing. Both are recorded
 * as the deferred, reasoned-through next step in docs/DEVIATIONS.md §18, not
 * silently skipped.
 *
 * GCM's authentication tag means tampered ciphertext fails to decrypt rather
 * than decrypting into garbage — a second, independent integrity signal on
 * top of the Phase 3 hash chain, this time at the field level.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const FORMAT_TAG = 'v1';

/**
 * A fixed, clearly-labelled development fallback so a fresh clone still runs
 * with no .env. Never reachable in production — `assertProductionSafety()`
 * refuses to boot without a real `FIELD_ENCRYPTION_KEY`.
 */
const DEV_FALLBACK_KEY = createHash('sha256').update('shebar-janala-dev-only-field-key-do-not-use-in-prod').digest();

function resolveKey(): Buffer {
  if (!env.FIELD_ENCRYPTION_KEY) return DEV_FALLBACK_KEY;
  const key = Buffer.from(env.FIELD_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('FIELD_ENCRYPTION_KEY must be base64 for exactly 32 bytes (AES-256).');
  }
  return key;
}

/** `v1:<iv-b64>:<tag-b64>:<ciphertext-b64>` — versioned so a future re-key can tell formats apart. */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, resolveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [FORMAT_TAG, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

/** Throws if the ciphertext was tampered with (GCM tag mismatch) or is malformed. */
export function decryptField(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT_TAG) {
    throw new Error('Unrecognised field-encryption ciphertext format.');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64!, 'base64');
  const tag = Buffer.from(tagB64!, 'base64');
  const ciphertext = Buffer.from(ctB64!, 'base64');
  const decipher = createDecipheriv(ALGORITHM, resolveKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/** Convenience wrapper for the one shape actually stored this way today: a nullable string array. */
export function encryptStringArray(value: readonly string[] | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return encryptField(JSON.stringify(value));
}

export function decryptStringArray(stored: string | null | undefined): string[] | null {
  if (stored === null || stored === undefined) return null;
  const parsed: unknown = JSON.parse(decryptField(stored));
  return Array.isArray(parsed) ? (parsed as string[]) : null;
}

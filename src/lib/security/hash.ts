import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * `promisify` cannot express scrypt's 5-argument overload (with options), so the
 * promisified function is given an explicit signature rather than being called
 * against the wrong overload.
 */
const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number },
) => Promise<Buffer>;

/**
 * Secret hashing for PINs and refresh tokens.
 *
 * PRD §48 and §121 specify Argon2id, which this deliberately does not use:
 * Argon2's cost comes from native code, and this app's deployment target
 * (Cloudflare Workers) cannot run native code at all, ever — not a matter of
 * configuration or a missing prebuilt binary, but the isolate has no way to
 * execute compiled code full stop. Any credential created with it locally
 * would then permanently fail to verify once deployed. scrypt, from Node's
 * core crypto, is memory-hard, works identically in dev and in Workers
 * (`nodejs_compat`), and needs no native module — see docs/DEVIATIONS.md.
 *
 * Format: `scrypt$N.r.p$salt$digest`
 */

const SCRYPT_PARAMS = {
  // 2^15 = 32768. ~32 MB of memory per hash — heavy enough to make offline
  // brute force of a 4-digit PIN expensive, light enough for a request path.
  N: 32768,
  r: 8,
  p: 1,
  keyLength: 64,
} as const;

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(secret, salt, SCRYPT_PARAMS.keyLength, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: 128 * SCRYPT_PARAMS.N * SCRYPT_PARAMS.r * 2,
  })) as Buffer;
  return `scrypt$${SCRYPT_PARAMS.N}.${SCRYPT_PARAMS.r}.${SCRYPT_PARAMS.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const [, paramsRaw, saltRaw, digestRaw] = parts as [string, string, string, string];
  const [nRaw, rRaw, pRaw] = paramsRaw.split('.');
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltRaw, 'base64url');
  const expected = Buffer.from(digestRaw, 'base64url');
  const derived = (await scrypt(secret, salt, expected.length, {
    N,
    r,
    p,
    maxmem: 128 * N * r * 2,
  })) as Buffer;

  // Constant-time comparison — a length-dependent early return would leak.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/**
 * Fast, non-reversible digest for high-volume opaque lookups (refresh tokens).
 *
 * Safe here — and NOT safe for PINs — because the input is 32+ bytes of
 * cryptographic randomness rather than a guessable 4-digit secret, so there is
 * no search space to brute-force and no need for a slow KDF.
 */
export function fastHash(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** Numeric OTP. Rejection sampling avoids the modulo bias of `% 10`. */
export function randomNumericCode(digits = 6): string {
  let out = '';
  while (out.length < digits) {
    for (const byte of randomBytes(digits * 2)) {
      if (byte < 250) {
        out += String(byte % 10);
        if (out.length === digits) break;
      }
    }
  }
  return out;
}

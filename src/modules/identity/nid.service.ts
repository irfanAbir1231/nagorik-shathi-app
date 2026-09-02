import { env } from '@/lib/config/env';
import { fastHash } from '@/lib/security/hash';
import type { NidVerificationStatus } from '@/lib/domain/enums';

/**
 * National ID verification — Phase 1.
 *
 * No live government NID API (Porichoy or otherwise) is wired into this
 * build — Shebar Janala's own docs/OPEN-QUESTIONS.md already says so, and nothing
 * here pretends otherwise. `NID_PROVIDER` is a named integration seam in the
 * same spirit as `SMS_PROVIDER` in modules/auth/auth.service.ts: unset, the
 * number is only format-checked and the result is labelled
 * `simulated_verified`; named but not implemented, verification fails loudly
 * rather than silently reporting success. See docs/DEVIATIONS.md.
 */

export interface NidVerificationResult {
  readonly status: Extract<NidVerificationStatus, 'simulated_verified' | 'rejected'>;
  readonly hash: string | null;
  readonly reason: string | null;
}

/** Bangladesh NID numbers are 10 digits (smart card), 13 (pre-2016), or 17 (post-2016, birth-year-prefixed). */
const VALID_LENGTHS = new Set([10, 13, 17]);

export function normaliseNidNumber(input: string): string {
  return input.replace(/\D/g, '');
}

export async function verifyNid(rawNidNumber: string): Promise<NidVerificationResult> {
  const digits = normaliseNidNumber(rawNidNumber);

  if (!VALID_LENGTHS.has(digits.length)) {
    return {
      status: 'rejected',
      hash: null,
      reason: 'A National ID number is 10, 13, or 17 digits.',
    };
  }

  if (env.NID_PROVIDER) {
    throw new Error(`NID provider "${env.NID_PROVIDER}" is not implemented in this build.`);
  }

  // Simulated: format validity is the only check performed. The hash is
  // stored so the same number is recognisable on re-verification without the
  // plaintext ever touching the database (KB §5, §7).
  return {
    status: 'simulated_verified',
    hash: fastHash(`nid:${digits}`),
    reason: null,
  };
}

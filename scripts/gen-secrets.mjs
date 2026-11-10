// Prints the three secrets a production deployment needs. Nothing is written to
// disk: copy the output into your host's environment settings and nowhere else.
//
//   node scripts/gen-secrets.mjs
//
// Each run produces fresh values. Re-running and changing them later signs
// every user out (JWT secrets) or makes encrypted health data unreadable
// (FIELD_ENCRYPTION_KEY), so generate once and keep them.
import { randomBytes } from 'node:crypto';

const hex = (bytes) => randomBytes(bytes).toString('hex');

console.log('Copy these into Render > Environment (never commit them):\n');
console.log(`JWT_SECRET=${hex(48)}`);
console.log(`JWT_REFRESH_SECRET=${hex(48)}`);
// AES-256 needs exactly 32 bytes, base64-encoded (see src/lib/security/field-encryption.ts).
console.log(`FIELD_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`);

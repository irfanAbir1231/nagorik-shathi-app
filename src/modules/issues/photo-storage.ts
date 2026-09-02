import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '@/lib/config/env';

/**
 * Storage for citizen-submitted issue photos.
 *
 * Writes to Cloudflare R2 (S3-compatible) when S3_BUCKET/S3_ENDPOINT are
 * configured. With no bucket configured, photos are written under
 * `public/uploads/issues` and served statically instead — this is what
 * keeps `npm run dev` needing no bucket, key, or account. Cloudflare Workers
 * has no writable persistent filesystem, so the local path only works for
 * local dev / non-edge hosting; R2 is required once deployed there.
 *
 * See docs/DEVIATIONS.md for the tradeoff the local path accepts: uploaded
 * photos are reachable by anyone with the URL, mitigated only by the
 * filename being an unguessable UUID, and they are not virus-scanned. The
 * R2 path inherits the same UUID-filename mitigation; a public bucket (or a
 * public dev URL) is still required for the returned url to be viewable.
 */

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'issues');
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

export interface PhotoUploadResult {
  readonly url: string;
}

let r2Client: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (!env.S3_BUCKET || !env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    return null;
  }
  if (!r2Client) {
    r2Client = new S3Client({
      region: env.S3_REGION ?? 'auto',
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    });
  }
  return r2Client;
}

/** Public base URL photos are served from once written to R2 (a bucket's r2.dev URL, or a custom domain bound to the bucket). */
function publicR2Url(key: string): string {
  const base = env.S3_PUBLIC_URL?.replace(/\/+$/, '');
  if (base) return `${base}/${key}`;
  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
}

export async function saveIssuePhoto(dataUrl: string): Promise<PhotoUploadResult> {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw new Error('Only JPEG, PNG, or WebP photos are supported.');
  }
  const [, mime, base64] = match as unknown as [string, string, string];
  const extension = EXTENSION_BY_MIME[mime];
  if (!extension) {
    throw new Error('Only JPEG, PNG, or WebP photos are supported.');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error('Photos must be 5 MB or smaller.');
  }

  const filename = `${crypto.randomUUID()}.${extension}`;
  const client = getR2Client();

  if (client) {
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: `issues/${filename}`,
        Body: buffer,
        ContentType: CONTENT_TYPE_BY_EXTENSION[extension],
      }),
    );
    return { url: publicR2Url(`issues/${filename}`) };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return { url: `/uploads/issues/${filename}` };
}

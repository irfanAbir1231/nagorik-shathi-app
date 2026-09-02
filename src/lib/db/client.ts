import type { Client } from '@libsql/client';
import { createClient as createWebClient } from '@libsql/client/web';
// Not `drizzle-orm/libsql`: that barrel re-exports a `drizzle(url, config)`
// convenience overload whose module statically imports `@libsql/client` to
// implement it, even though this file only ever calls the already-have-a-
// client overload. That static import is unreachable at runtime here but
// still drags @libsql/client's native bindings into the Cloudflare Workers
// bundle. `driver-core` is the same underlying implementation minus that
// overload, so it has no such import.
import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
// `construct(client, config)` is that already-have-a-client overload's real
// implementation. It exists in driver-core's compiled output but is not
// declared in its .d.ts, so it is imported untyped and given the signature
// below rather than trusted as `any`.
// @ts-expect-error — not part of driver-core's published type surface; see above.
import { construct as constructUntyped } from 'drizzle-orm/libsql/driver-core';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';
import { env } from '../config/env';

/**
 * Database access point.
 *
 * The ONLY file that knows which SQL engine is in use. Repositories consume
 * `db` and Drizzle's dialect-agnostic query builder, so migrating to
 * PostgreSQL + pgvector (PRD §37) touches this file, drizzle.config.ts, and
 * the column helpers in schema.ts — no service or route changes.
 *
 * Two `@libsql/client` builds are used, picked by URL scheme, because
 * Cloudflare Workers cannot run the native bindings the default build needs
 * for a local `file:` database:
 *   - `file:` (local dev, tests)   → the default build (native bindings, no
 *     edge runtime support, but the only one that can open a local file).
 *   - `libsql:`/`https:` (Turso)   → `@libsql/client/web`, a pure
 *     fetch/WebSocket implementation with no native bindings, so it survives
 *     the Cloudflare Workers bundle; this is what production always uses.
 *
 * The `file:` branch is loaded through `createRequire` with a specifier
 * built at runtime (not a string literal), so it is opaque to both Next's
 * own build and the bundler that packages the app for Cloudflare Workers —
 * a literal `require(...)` or `import(...)`, even through `createRequire`,
 * gets resolved and inlined by both, and `@libsql/client`'s native bindings
 * and hrana/websocket transport cannot be resolved for the workerd target,
 * even though this branch is never reached there (`DATABASE_URL` is never
 * `file:` in production).
 */
const nodeRequire = createRequire(import.meta.url);
const LIBSQL_NODE_PACKAGE = ['@libsql', 'client'].join('/');

export type Database = LibSQLDatabase<typeof schema>;

const construct = constructUntyped as (
  client: Client,
  config: { schema: typeof schema; logger?: boolean },
) => Database;

declare global {
  // Reuse across hot reloads; otherwise dev opens a new handle per request.
  // eslint-disable-next-line no-var
  var __accessai_db__: { db: Database; client: Client } | undefined;
}

function ensureLocalDirectory(url: string): void {
  if (!url.startsWith('file:')) return;
  const filePath = url.slice('file:'.length);
  try {
    mkdirSync(dirname(filePath), { recursive: true });
  } catch {
    // Directory already exists, or the path is not writable — the client
    // surfaces the real error on first query, which is more informative.
  }
}

function create(): { db: Database; client: Client } {
  ensureLocalDirectory(env.DATABASE_URL);

  const config = {
    url: env.DATABASE_URL,
    ...(env.DATABASE_AUTH_TOKEN ? { authToken: env.DATABASE_AUTH_TOKEN } : {}),
  };
  const client: Client = env.DATABASE_URL.startsWith('file:')
    ? (nodeRequire(LIBSQL_NODE_PACKAGE).createClient as typeof createWebClient)(config)
    : createWebClient(config);

  const db = construct(client, {
    schema,
    logger: process.env.DRIZZLE_LOG === 'true',
  });

  return { db, client };
}

const instance = globalThis.__accessai_db__ ?? create();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__accessai_db__ = instance;
}

export const db = instance.db;
export const sqlClient = instance.client;

/**
 * Enable the pragmas that matter for a file-backed database under concurrent
 * route handlers. WAL lets readers proceed during a write; foreign_keys is OFF
 * by default in SQLite, which would silently void every `references()` above.
 */
export async function initialisePragmas(): Promise<void> {
  if (!env.DATABASE_URL.startsWith('file:')) return;
  await sqlClient.execute('PRAGMA journal_mode = WAL');
  await sqlClient.execute('PRAGMA foreign_keys = ON');
  await sqlClient.execute('PRAGMA busy_timeout = 5000');
}

export { schema };

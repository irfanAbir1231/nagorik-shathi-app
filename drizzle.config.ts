import { defineConfig } from 'drizzle-kit';

/**
 * PRD §37 specifies PostgreSQL + pgvector. This prototype targets libSQL
 * (SQLite dialect) so the whole system runs with `npm run setup` and no
 * external services. See docs/DEVIATIONS.md §1 — the schema, repositories,
 * and services are dialect-agnostic; only this file and src/lib/db/client.ts
 * change when moving to Postgres.
 *
 * `dialect: 'turso'` is a distinct value from `'sqlite'` in drizzle-kit —
 * only it accepts `authToken` in dbCredentials. A local `file:` URL has no
 * token, so the dialect switches based on whether one is set, rather than
 * needing a second config file for the hosted case.
 */
const hasAuthToken = Boolean(process.env.DATABASE_AUTH_TOKEN);

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: hasAuthToken ? 'turso' : 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./data/shebar-janala.db',
    ...(hasAuthToken ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {}),
  },
  verbose: true,
  strict: true,
});

/* eslint-disable no-console */
import './load-env';
import { eq } from 'drizzle-orm';
import { db, sqlClient } from '../src/lib/db/client';
import { organizations, serviceSources } from '../src/lib/db/schema';
import { SEED_SOURCES } from '../src/lib/db/seed/sources';

/**
 * Adds the recommended government sources if they are missing. Safe to run
 * on any database at any time: existing sources (and their history and
 * on/off state) are left alone.
 *
 *   npm run db:seed:sources
 */
export async function seedSources(): Promise<number> {
  let added = 0;
  for (const source of SEED_SOURCES) {
    const [org] = source.organizationWebsite
      ? await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.website, source.organizationWebsite)).limit(1)
      : [];
    const inserted = await db
      .insert(serviceSources)
      .values({
        name: source.name,
        baseUrl: source.baseUrl,
        kind: source.kind,
        allowedHosts: [...source.allowedHosts],
        listPaths: [...source.listPaths],
        pagesPerRun: source.pagesPerRun,
        enabled: source.enabled,
        organizationId: org?.id ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: serviceSources.id });
    added += inserted.length;
  }
  return added;
}

if (process.argv[1]?.includes('seed-sources')) {
  seedSources()
    .then((added) => {
      console.log(`Service sources: ${added} added, ${SEED_SOURCES.length - added} already present.`);
      sqlClient.close();
    })
    .catch((error) => {
      console.error('Seeding sources failed:', error);
      sqlClient.close();
      process.exit(1);
    });
}

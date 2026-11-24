import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { opportunities, serviceCandidates, serviceSources, sourceSnapshots, type ServiceSource } from '@/lib/db/schema';
import { fastHash } from '@/lib/security/hash';
import { runJob } from '@/modules/admin/admin.service';
import { createCandidate, knownProgrammes, organizationForUrl, readPage, recordSnapshot } from './candidates.service';
import { findKnownProgramme, sameUrl, type KnownProgramme } from './dedupe';
import { programmeLinks, serviceNotices } from './dss-adapter';
import type { CandidateDraft, Evidence } from './extract';
import { fetchPage, FetchBlocked, robotsFor } from './fetcher';
import { slugify } from './text';

/**
 * The `discover_sources` job: reads each enabled source and queues what it
 * finds for review. Runs in small batches (`pagesPerRun` pages per source) so
 * one run fits inside a serverless request; pages never read come first, then
 * the ones read longest ago, so repeated runs cover the whole site.
 *
 * It never publishes anything. Its only outputs are snapshots and pending
 * candidates.
 */

export interface SourceRunResult {
  readonly source: string;
  readonly pagesRead: number;
  readonly newCandidates: number;
  readonly changeCandidates: number;
  readonly errors: string[];
}

export async function discoverSources(sourceId?: string) {
  return runJob('discover_sources', async () => {
    const sources = await db
      .select()
      .from(serviceSources)
      .where(sourceId ? eq(serviceSources.id, sourceId) : eq(serviceSources.enabled, true));
    const results: SourceRunResult[] = [];
    for (const source of sources) {
      if (source.kind === 'manual') continue;
      results.push(await runSource(source));
    }
    return {
      processed: results.reduce((n, r) => n + r.pagesRead, 0),
      failed: results.reduce((n, r) => n + r.errors.length, 0),
      detail: { sources: results },
    };
  });
}

async function runSource(source: ServiceSource): Promise<SourceRunResult> {
  const result = { source: source.name, pagesRead: 0, newCandidates: 0, changeCandidates: 0, errors: [] as string[] };
  try {
    const robots = await robotsFor(new URL(source.baseUrl).origin);
    if (robots.aiRestricted !== source.aiRestricted) {
      await db.update(serviceSources).set({ aiRestricted: robots.aiRestricted }).where(eq(serviceSources.id, source.id));
    }
    const aiAllowed = !robots.aiRestricted;
    const known = await knownProgrammes();
    const organizationId = source.organizationId ?? (await organizationForUrl(source.baseUrl));

    // 1. What the source lists.
    let pages: { url: string; text: string }[] = [];
    if (source.kind === 'single_page') {
      pages = [{ url: source.baseUrl, text: source.name }];
    } else {
      for (const path of source.listPaths) {
        const listUrl = new URL(path, source.baseUrl).toString();
        try {
          const listing = await fetchPage(listUrl, source.allowedHosts);
          if (path.includes('notices')) {
            result.newCandidates += await queueNotices(source, listing.html, listing.url, known, organizationId);
          } else {
            pages.push(...programmeLinks(listing.html, listing.url));
          }
        } catch (error) {
          result.errors.push(`${listUrl}: ${describe(error)}`);
        }
      }
    }

    // 2. Read a batch of programme pages, never-read first, then oldest.
    const urls = [...new Set(pages.map((p) => p.url))];
    const lastRead = new Map<string, number>();
    if (urls.length > 0) {
      for (let i = 0; i < urls.length; i += 200) {
        const rows = await db
          .select({ url: sourceSnapshots.url, at: sourceSnapshots.fetchedAt })
          .from(sourceSnapshots)
          .where(inArray(sourceSnapshots.url, urls.slice(i, i + 200)));
        for (const row of rows) lastRead.set(row.url, row.at.getTime());
      }
    }
    const batch = urls.sort((a, b) => (lastRead.get(a) ?? 0) - (lastRead.get(b) ?? 0)).slice(0, source.pagesPerRun);

    for (const url of batch) {
      try {
        const page = await fetchPage(url, source.allowedHosts);
        result.pagesRead += 1;
        const read = await readPage(page, { aiAllowed: false });
        const snapshot = await recordSnapshot({ sourceId: source.id, url: page.url, status: page.status, title: read.title, text: read.text });
        if (!snapshot.changed) continue;

        const match = findKnownProgramme({ url: page.url, titleBn: read.draft.titleBn }, known);
        if (match) {
          if (await queueChange(source, page.url, match, read.draft, read.evidence, read.text)) result.changeCandidates += 1;
          continue;
        }
        // AI only for pages that will actually become candidates.
        const full = aiAllowed ? await readPage(page, { aiAllowed: true }) : read;
        const created = await createCandidate({
          sourceId: source.id,
          url: page.url,
          kind: 'new',
          draft: { ...full.draft, organizationId, slug: full.draft.title ? slugify(full.draft.title, page.url) : undefined },
          evidence: full.evidence,
          extractor: full.extractor,
          contentHash: fastHash(full.text),
        });
        if (!created.existing) result.newCandidates += 1;
      } catch (error) {
        result.errors.push(`${url}: ${describe(error)}`);
      }
    }

    await db
      .update(serviceSources)
      .set({
        lastRunAt: new Date(),
        lastStatus: result.errors.length === 0 ? 'ok' : result.pagesRead > 0 ? 'partial' : 'failed',
        lastError: result.errors[0] ?? null,
        updatedAt: new Date(),
      })
      .where(eq(serviceSources.id, source.id));
  } catch (error) {
    result.errors.push(describe(error));
    await db
      .update(serviceSources)
      .set({ lastRunAt: new Date(), lastStatus: 'failed', lastError: describe(error), updatedAt: new Date() })
      .where(eq(serviceSources.id, source.id));
  }
  return result;
}

/** Service notices are PDFs: queue the title and link for a person to read. */
async function queueNotices(
  source: ServiceSource,
  html: string,
  base: string,
  known: readonly KnownProgramme[],
  organizationId: string | null,
): Promise<number> {
  let created = 0;
  for (const notice of serviceNotices(html, base)) {
    const [seen] = await db
      .select({ id: serviceCandidates.id })
      .from(serviceCandidates)
      .where(eq(serviceCandidates.sourceUrl, notice.url))
      .limit(1);
    if (seen) continue;
    const match = findKnownProgramme({ url: notice.url, titleBn: notice.title }, known);
    const evidence: Evidence = {
      titleBn: notice.title,
      _source: `Notice published ${notice.published ?? 'on an unknown date'}. The details are in the attached PDF${notice.fileUrl ? `: ${notice.fileUrl}` : ''}. Read it and fill the fields by hand.`,
    };
    const result = await createCandidate({
      sourceId: source.id,
      url: notice.url,
      kind: 'new',
      draft: { titleBn: notice.title, sourceUrl: notice.url, officialUrl: notice.url, organizationId },
      evidence,
      extractor: 'manual',
      contentHash: fastHash(`${notice.title}|${notice.published ?? ''}`),
      duplicateOfId: match?.id ?? null,
    });
    if (!result.existing) created += 1;
  }
  return created;
}

/**
 * A page for a programme we already list changed. Queue a `change` candidate
 * for the facts a citizen acts on (amount, deadline, where to apply) when they
 * differ from what we show; other wording changes are left alone.
 */
async function queueChange(
  source: ServiceSource,
  url: string,
  programme: KnownProgramme,
  draft: CandidateDraft,
  evidence: Evidence,
  text: string,
): Promise<boolean> {
  const [current] = await db.select().from(opportunities).where(eq(opportunities.id, programme.id)).limit(1);
  if (!current) return false;

  const patch: CandidateDraft = {};
  const reasons: Evidence = {};
  if (draft.benefitAmount != null && draft.benefitAmount !== current.benefitAmount) {
    patch.benefitAmount = draft.benefitAmount;
    if (draft.benefitPeriod) patch.benefitPeriod = draft.benefitPeriod;
    reasons.benefitAmount = evidence.benefitAmount ?? '';
  }
  const currentDeadline = current.deadline ? current.deadline.toISOString().slice(0, 10) : null;
  if (draft.deadline && draft.deadline !== currentDeadline) {
    patch.deadline = draft.deadline;
    reasons.deadline = evidence.deadline ?? '';
  }
  if (draft.applyUrl && !sameUrl(draft.applyUrl, current.applyUrl)) {
    patch.applyUrl = draft.applyUrl;
    reasons.applyUrl = evidence.applyUrl ?? '';
  }
  if (Object.keys(patch).length === 0) return false;

  const result = await createCandidate({
    sourceId: source.id,
    url,
    kind: 'change',
    targetOpportunityId: current.id,
    draft: patch,
    evidence: { ...reasons, _eligibility: evidence._eligibility ?? '' },
    extractor: 'rules',
    contentHash: fastHash(text),
  });
  return !result.existing;
}

function describe(error: unknown): string {
  if (error instanceof FetchBlocked) return `${error.reason}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

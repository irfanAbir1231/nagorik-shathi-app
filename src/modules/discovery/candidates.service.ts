import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import {
  opportunities, organizations, serviceCandidates, serviceSources, sourceSnapshots,
  type ServiceCandidate,
} from '@/lib/db/schema';
import {
  CANDIDATE_KINDS, CANDIDATE_STATUSES, LIFE_EVENTS, OPPORTUNITY_CATEGORIES,
  type CandidateKind, type CandidateStatus, type UserRole,
} from '@/lib/domain/enums';
import { DISTRICT_CODES } from '@/lib/domain/geography';
import { ERROR_CODES, HttpError } from '@/lib/http/response';
import { fastHash } from '@/lib/security/hash';
import { upsertOpportunitySchema } from '@/lib/validation/schemas';
import { recordAudit } from '@/modules/admin/admin.service';
import { indexOpportunity } from '@/modules/opportunities/opportunity.service';
import { aiFillDraft } from './ai-extract';
import { findKnownProgramme, type KnownProgramme } from './dedupe';
import { pageContent } from './dss-adapter';
import { draftCompleteness, extractFromPage, type CandidateDraft, type Evidence } from './extract';
import { fetchPage, FetchBlocked, type FetchedPage } from './fetcher';
import { countAudience, notifyMatchingUsers } from './notify.service';
import { isGovernmentHost } from './policy';
import { slugify } from './text';

/**
 * New government services, from "found" to "live".
 *
 *   submitLink / discovery job → candidate (pending)        never visible to citizens
 *   updateDraft                → reviewer completes it
 *   approveCandidate           → copies the frozen draft into `opportunities`,
 *                                verified by the approving administrator,
 *                                then (optionally) notifies matching citizens
 *
 * One administrator approves (decided with the product owner). Moderators can
 * edit, reject and snooze. Every step is audited.
 */

export interface Actor {
  readonly userId: string;
  readonly role: UserRole;
}

/* ------------------------------------------------------------ lookups */

export async function knownProgrammes(): Promise<KnownProgramme[]> {
  return db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      titleBn: opportunities.titleBn,
      sourceUrl: opportunities.sourceUrl,
      officialUrl: opportunities.officialUrl,
    })
    .from(opportunities);
}

/** The organisation whose website is on the same host as [url], if any. */
export async function organizationForUrl(url: string): Promise<string | null> {
  const host = new URL(url).host.replace(/^www\./, '');
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(or(like(organizations.website, `https://${host}%`), like(organizations.website, `https://www.${host}%`)))
    .limit(1);
  return org?.id ?? null;
}

async function sourceForUrl(url: string) {
  const host = new URL(url).host.replace(/^www\./, '');
  const sources = await db.select().from(serviceSources);
  return sources.find((s) => s.allowedHosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null;
}

/* ----------------------------------------------------------- snapshots */

/** Stores the latest reading of a page. Returns whether its content changed. */
export async function recordSnapshot(input: {
  sourceId: string | null;
  url: string;
  status: number;
  title: string | null;
  text: string;
}): Promise<{ isNew: boolean; changed: boolean }> {
  const contentHash = fastHash(input.text);
  const [previous] = await db
    .select({ id: sourceSnapshots.id, contentHash: sourceSnapshots.contentHash })
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.url, input.url))
    .orderBy(desc(sourceSnapshots.fetchedAt))
    .limit(1);
  const values = {
    sourceId: input.sourceId,
    url: input.url,
    contentHash,
    httpStatus: input.status,
    title: input.title,
    text: input.text.slice(0, 20_000),
    fetchedAt: new Date(),
  };
  if (previous) {
    await db.update(sourceSnapshots).set(values).where(eq(sourceSnapshots.id, previous.id));
    return { isNew: false, changed: previous.contentHash !== contentHash };
  }
  await db.insert(sourceSnapshots).values(values);
  return { isNew: true, changed: true };
}

/* -------------------------------------------------------------- drafts */

export interface ReadPage {
  readonly url: string;
  readonly title: string | null;
  readonly text: string;
  readonly draft: CandidateDraft;
  readonly evidence: Evidence;
  readonly extractor: 'rules' | 'ai' | 'manual';
}

/** Reads a fetched page into a draft: rules first, then AI where the source allows it. */
export async function readPage(page: FetchedPage, options: { aiAllowed: boolean }): Promise<ReadPage> {
  const content = pageContent(page.html, page.url);
  const rules = extractFromPage({ url: page.url, title: content.title, text: content.text, links: content.links });
  let { draft, evidence } = rules;
  let extractor: ReadPage['extractor'] = Object.keys(evidence).length > 2 ? 'rules' : 'manual';
  if (options.aiAllowed && !page.aiRestricted) {
    const ai = await aiFillDraft(content.text, draft, evidence);
    if (ai.used) ({ draft, evidence, extractor } = { ...ai, extractor: 'ai' });
  }
  if (page.aiRestricted) {
    evidence = { ...evidence, _source: 'This site reserves its content from AI use, so no AI read this page. Fill the fields by hand.' };
  }
  return { url: page.url, title: content.title, text: content.text, draft, evidence, extractor };
}

/** Inserts a pending candidate, or returns the pending one already open for this URL. */
export async function createCandidate(input: {
  sourceId: string | null;
  url: string;
  kind: CandidateKind;
  targetOpportunityId?: string | null;
  draft: CandidateDraft;
  evidence: Evidence;
  extractor: 'rules' | 'ai' | 'manual';
  contentHash: string;
  duplicateOfId?: string | null;
  submittedBy?: string | null;
}): Promise<{ candidate: ServiceCandidate; existing: boolean }> {
  const [open] = await db
    .select()
    .from(serviceCandidates)
    .where(
      and(
        eq(serviceCandidates.sourceUrl, input.url),
        eq(serviceCandidates.kind, input.kind),
        inArray(serviceCandidates.status, ['pending', 'snoozed']),
      ),
    )
    .limit(1);
  if (open) return { candidate: open, existing: true };

  const [candidate] = await db
    .insert(serviceCandidates)
    .values({
      sourceId: input.sourceId,
      sourceUrl: input.url,
      kind: input.kind,
      targetOpportunityId: input.targetOpportunityId ?? null,
      draft: input.draft as Record<string, unknown>,
      evidence: input.evidence,
      extractor: input.extractor,
      confidence: input.kind === 'new' ? draftCompleteness(input.draft) : 1,
      contentHash: input.contentHash,
      duplicateOfId: input.duplicateOfId ?? null,
      submittedBy: input.submittedBy ?? null,
    })
    .returning();
  return { candidate: candidate!, existing: false };
}

/* --------------------------------------------------------- submit link */

/**
 * An administrator pastes a link to a government page. It is fetched under the
 * same rules as the discovery job, read into a draft, and queued for review.
 */
export async function submitLink(rawUrl: string, actor: Actor): Promise<{ candidate: ServiceCandidate; existing: boolean }> {
  const url = rawUrl.trim();
  const source = await sourceForUrl(url).catch(() => null);
  if (!isGovernmentHost(url) && !source) {
    throw new HttpError(ERROR_CODES.VALIDATION_FAILED, 'Only links to government sites (.gov.bd) can be added.', 422, {
      url: 'Paste a link that starts with https:// and ends in .gov.bd',
    });
  }

  let page: FetchedPage;
  try {
    page = await fetchPage(url, source?.allowedHosts ?? ['gov.bd']);
  } catch (error) {
    if (error instanceof FetchBlocked) {
      throw new HttpError(ERROR_CODES.VALIDATION_FAILED, error.message, 422, { url: error.message });
    }
    throw error;
  }

  const read = await readPage(page, { aiAllowed: !source?.aiRestricted });
  await recordSnapshot({ sourceId: source?.id ?? null, url: page.url, status: page.status, title: read.title, text: read.text });

  const known = findKnownProgramme({ url: page.url, titleBn: read.draft.titleBn }, await knownProgrammes());
  const organizationId = source?.organizationId ?? (await organizationForUrl(page.url));
  const result = await createCandidate({
    sourceId: source?.id ?? null,
    url: page.url,
    kind: 'new',
    draft: { ...read.draft, organizationId, slug: read.draft.title ? slugify(read.draft.title, page.url) : undefined },
    evidence: read.evidence,
    extractor: read.extractor,
    contentHash: fastHash(read.text),
    duplicateOfId: known?.id ?? null,
    submittedBy: actor.userId,
  });

  if (!result.existing) {
    await recordAudit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'candidate.submit',
      entityType: 'service_candidate',
      entityId: result.candidate.id,
      after: { url: page.url, extractor: read.extractor, duplicateOfId: known?.id ?? null },
    });
  }
  return result;
}

/* ---------------------------------------------------------------- read */

export const candidateListSchema = z.object({
  status: z.enum(CANDIDATE_STATUSES).optional(),
  kind: z.enum(CANDIDATE_KINDS).optional(),
});

export async function listCandidates(filter: z.infer<typeof candidateListSchema>) {
  const conditions = [];
  if (filter.status) conditions.push(eq(serviceCandidates.status, filter.status));
  if (filter.kind) conditions.push(eq(serviceCandidates.kind, filter.kind));
  const rows = await db
    .select({
      candidate: serviceCandidates,
      sourceName: serviceSources.name,
    })
    .from(serviceCandidates)
    .leftJoin(serviceSources, eq(serviceSources.id, serviceCandidates.sourceId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(serviceCandidates.createdAt))
    .limit(200);
  const counts = await db
    .select({ status: serviceCandidates.status, n: sql<number>`count(*)` })
    .from(serviceCandidates)
    .groupBy(serviceCandidates.status);
  return {
    items: rows,
    counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])) as Partial<Record<CandidateStatus, number>>,
  };
}

export async function getCandidateDetail(id: string) {
  const [row] = await db
    .select({ candidate: serviceCandidates, sourceName: serviceSources.name })
    .from(serviceCandidates)
    .leftJoin(serviceSources, eq(serviceSources.id, serviceCandidates.sourceId))
    .where(eq(serviceCandidates.id, id))
    .limit(1);
  if (!row) throw new HttpError(ERROR_CODES.NOT_FOUND, 'That candidate could not be found.', 404);

  const [snapshot] = await db
    .select({ text: sourceSnapshots.text, title: sourceSnapshots.title, fetchedAt: sourceSnapshots.fetchedAt })
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.url, row.candidate.sourceUrl))
    .orderBy(desc(sourceSnapshots.fetchedAt))
    .limit(1);

  const relatedId = row.candidate.targetOpportunityId ?? row.candidate.duplicateOfId;
  const [related] = relatedId
    ? await db.select().from(opportunities).where(eq(opportunities.id, relatedId)).limit(1)
    : [];

  return { ...row, snapshot: snapshot ?? null, related: related ?? null, problems: approvalProblems(row.candidate) };
}

/* ---------------------------------------------------------------- edit */

const optionalText = (max: number) => z.string().trim().max(max).optional();
const nullableUrl = z.union([z.string().trim().url(), z.literal(''), z.null()]).optional();

export const draftPatchSchema = z.object({
  organizationId: z.string().uuid().nullable().optional(),
  title: optionalText(200),
  titleBn: optionalText(200),
  summary: optionalText(600),
  summaryBn: optionalText(600),
  description: optionalText(5000),
  descriptionBn: optionalText(5000),
  benefits: optionalText(1000),
  benefitsBn: optionalText(1000),
  slug: z.union([z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160), z.literal('')]).optional(),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
  benefitAmount: z.number().min(0).nullable().optional(),
  benefitPeriod: z.enum(['one_time', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'per_course', 'variable']).nullable().optional(),
  applicationProcess: z
    .array(z.object({ step: z.number().int().min(1), en: z.string().trim().max(500), bn: z.string().trim().max(500) }))
    .max(20)
    .optional(),
  deadline: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
  recurrence: z.enum(['none', 'annual', 'biannual', 'quarterly', 'continuous']).optional(),
  coverageDistricts: z.array(z.enum(DISTRICT_CODES as [string, ...string[]])).optional(),
  officialUrl: nullableUrl,
  applyUrl: nullableUrl,
  lifeEvents: z.array(z.enum(LIFE_EVENTS)).optional(),
  tags: z.array(z.string().trim().max(40)).max(30).optional(),
});

async function loadCandidate(id: string): Promise<ServiceCandidate> {
  const [candidate] = await db.select().from(serviceCandidates).where(eq(serviceCandidates.id, id)).limit(1);
  if (!candidate) throw new HttpError(ERROR_CODES.NOT_FOUND, 'That candidate could not be found.', 404);
  return candidate;
}

function assertOpen(candidate: ServiceCandidate) {
  if (candidate.status !== 'pending' && candidate.status !== 'snoozed') {
    throw new HttpError(ERROR_CODES.CONFLICT, 'This candidate has already been decided.', 409);
  }
}

export async function updateDraft(id: string, patch: z.infer<typeof draftPatchSchema>, actor: Actor) {
  const candidate = await loadCandidate(id);
  assertOpen(candidate);
  const cleaned = Object.fromEntries(
    Object.entries(patch).map(([k, v]) => [k, v === '' && (k === 'officialUrl' || k === 'applyUrl') ? null : v]),
  );
  const draft = { ...(candidate.draft as CandidateDraft), ...cleaned } as CandidateDraft;
  const [updated] = await db
    .update(serviceCandidates)
    .set({
      draft: draft as Record<string, unknown>,
      confidence: candidate.kind === 'new' ? draftCompleteness(draft) : candidate.confidence,
      updatedAt: new Date(),
    })
    .where(eq(serviceCandidates.id, id))
    .returning();
  await recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'candidate.edit',
    entityType: 'service_candidate',
    entityId: id,
    before: pick(candidate.draft, Object.keys(patch)),
    after: pick(draft as Record<string, unknown>, Object.keys(patch)),
  });
  return { candidate: updated!, problems: approvalProblems(updated!) };
}

function pick(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((k) => [k, source[k] ?? null]));
}

export const decisionSchema = z.object({
  status: z.enum(['rejected', 'snoozed', 'pending', 'duplicate']),
  note: z.string().trim().max(1000).optional(),
  duplicateOfId: z.string().uuid().optional(),
});

/** Reject, snooze, reopen, or mark as a duplicate of a listed programme. */
export async function decideCandidate(id: string, input: z.infer<typeof decisionSchema>, actor: Actor) {
  const candidate = await loadCandidate(id);
  assertOpen(candidate);
  if (input.status === 'rejected' && !input.note) {
    throw new HttpError(ERROR_CODES.VALIDATION_FAILED, 'Say why it is rejected.', 422, { note: 'Required when rejecting.' });
  }
  if (input.status === 'duplicate' && !(input.duplicateOfId ?? candidate.duplicateOfId)) {
    throw new HttpError(ERROR_CODES.VALIDATION_FAILED, 'Choose the programme it duplicates.', 422, {
      duplicateOfId: 'Required when marking a duplicate.',
    });
  }
  const decided = input.status === 'rejected' || input.status === 'duplicate';
  const [updated] = await db
    .update(serviceCandidates)
    .set({
      status: input.status,
      decisionNote: input.note ?? candidate.decisionNote,
      duplicateOfId: input.duplicateOfId ?? candidate.duplicateOfId,
      reviewerId: actor.userId,
      decidedAt: decided ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(serviceCandidates.id, id))
    .returning();
  await recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: `candidate.${input.status}`,
    entityType: 'service_candidate',
    entityId: id,
    before: { status: candidate.status },
    after: { status: input.status, note: input.note ?? null },
  });
  return updated!;
}

/* ------------------------------------------------------------- approve */

/** The draft as the programme it would become (still unvalidated). */
function programmeInput(candidate: ServiceCandidate, status: 'open' | 'draft') {
  const draft = candidate.draft as CandidateDraft;
  return {
    ...draft,
    slug: draft.slug || (draft.title ? slugify(draft.title, candidate.id) : ''),
    status,
    coverageDistricts: draft.coverageDistricts ?? [],
    lifeEvents: draft.lifeEvents ?? [],
    tags: draft.tags ?? [],
    deadline: draft.deadline ?? null,
    sourceUrl: candidate.sourceUrl,
    sourceNote: `Found on ${new URL(candidate.sourceUrl).host} and reviewed before publishing.`,
  };
}

/**
 * Field → what is missing before this candidate can be published. Empty when
 * ready. Uses the same schema as creating a programme by hand.
 */
export function approvalProblems(candidate: ServiceCandidate): Record<string, string> {
  if (candidate.kind === 'change') {
    const parsed = upsertOpportunitySchema.partial().safeParse(candidate.draft);
    return parsed.success ? {} : flatten(parsed.error);
  }
  const parsed = upsertOpportunitySchema.safeParse(programmeInput(candidate, 'open'));
  return parsed.success ? {} : flatten(parsed.error);
}

function flatten(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_root');
    out[key] ??= issue.message;
  }
  return out;
}

async function uniqueSlug(base: string): Promise<string> {
  for (let i = 0; i < 20; i += 1) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const [taken] = await db.select({ id: opportunities.id }).from(opportunities).where(eq(opportunities.slug, slug)).limit(1);
    if (!taken) return slug;
  }
  throw new HttpError(ERROR_CODES.CONFLICT, 'Choose a different web address (slug).', 409, { slug: 'Already in use.' });
}

export const approveSchema = z.object({
  publish: z.enum(['open', 'draft']).default('open'),
  notify: z.boolean().default(true),
});

/**
 * Publishes a candidate. The candidate row is claimed first with a
 * conditional update, so a double click (or two administrators) can publish
 * it only once; if creating the programme then fails, the claim is released.
 */
export async function approveCandidate(id: string, options: z.infer<typeof approveSchema>, actor: Actor) {
  const candidate = await loadCandidate(id);
  assertOpen(candidate);
  const problems = approvalProblems(candidate);
  if (Object.keys(problems).length > 0) {
    throw new HttpError(ERROR_CODES.VALIDATION_FAILED, 'Complete the highlighted fields before publishing.', 422, problems);
  }

  const [claimed] = await db
    .update(serviceCandidates)
    .set({ status: 'approved', reviewerId: actor.userId, decidedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(serviceCandidates.id, id), inArray(serviceCandidates.status, ['pending', 'snoozed'])))
    .returning({ id: serviceCandidates.id });
  if (!claimed) throw new HttpError(ERROR_CODES.CONFLICT, 'This candidate has already been decided.', 409);

  try {
    const now = new Date();
    if (candidate.kind === 'change') {
      return await applyChange(candidate, actor, now);
    }

    const input = upsertOpportunitySchema.parse(programmeInput(candidate, options.publish));
    const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
    if (!org) throw new HttpError(ERROR_CODES.VALIDATION_FAILED, 'Choose the organisation that runs this programme.', 422, { organizationId: 'Not found.' });

    const { verificationStatus: _ignored, ...content } = input;
    const [created] = await db
      .insert(opportunities)
      .values({
        ...content,
        slug: await uniqueSlug(input.slug),
        verificationStatus: 'verified',
        lastVerifiedAt: now,
        verifiedBy: actor.userId,
        version: 1,
      })
      .returning();

    await indexOpportunity(created!.id);
    const notified = options.notify && options.publish === 'open' ? await notifyMatchingUsers(created!.id) : 0;
    await db
      .update(serviceCandidates)
      .set({ publishedOpportunityId: created!.id, notifiedCount: notified, updatedAt: new Date() })
      .where(eq(serviceCandidates.id, id));

    await recordAudit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'candidate.approve',
      entityType: 'opportunity',
      entityId: created!.id,
      before: { candidateId: id, sourceUrl: candidate.sourceUrl },
      after: { slug: created!.slug, status: created!.status, notified },
    });
    return { opportunity: created!, notified };
  } catch (error) {
    await db
      .update(serviceCandidates)
      .set({ status: candidate.status, reviewerId: candidate.reviewerId, decidedAt: candidate.decidedAt, updatedAt: new Date() })
      .where(eq(serviceCandidates.id, id));
    throw error;
  }
}

async function applyChange(candidate: ServiceCandidate, actor: Actor, now: Date) {
  if (!candidate.targetOpportunityId) throw new HttpError(ERROR_CODES.CONFLICT, 'This change has no programme to apply to.', 409);
  const [before] = await db.select().from(opportunities).where(eq(opportunities.id, candidate.targetOpportunityId)).limit(1);
  if (!before) throw new HttpError(ERROR_CODES.NOT_FOUND, 'The programme this change applies to no longer exists.', 404);

  const patch = upsertOpportunitySchema.partial().parse(candidate.draft);
  const { verificationStatus: _ignored, status: _status, ...content } = patch;
  const [updated] = await db
    .update(opportunities)
    .set({
      ...content,
      verificationStatus: 'verified',
      lastVerifiedAt: now,
      verifiedBy: actor.userId,
      version: before.version + 1,
      updatedAt: now,
    })
    .where(eq(opportunities.id, before.id))
    .returning();
  await indexOpportunity(before.id);
  await db
    .update(serviceCandidates)
    .set({ publishedOpportunityId: null, notifiedCount: 0, updatedAt: new Date() })
    .where(eq(serviceCandidates.id, candidate.id));
  await recordAudit({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'candidate.apply_change',
    entityType: 'opportunity',
    entityId: before.id,
    before: pick(before as unknown as Record<string, unknown>, Object.keys(content)),
    after: pick(updated as unknown as Record<string, unknown>, Object.keys(content)),
  });
  return { opportunity: updated!, notified: 0 };
}

/** How many people would be notified if this candidate were published now. */
export async function audienceFor(id: string) {
  const candidate = await loadCandidate(id);
  const draft = candidate.draft as CandidateDraft;
  return countAudience({
    coverageDistricts: draft.coverageDistricts ?? [],
    lifeEvents: draft.lifeEvents ?? [],
  });
}

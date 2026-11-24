import { and, asc, desc, eq, gte, sql, count, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  opportunities, organizations, documents, documentChunks, aiLogs, feedback,
  users, conversations, messages, savedOpportunities, actionPlans, searchQueries,
  eligibilityEvaluations, jobRuns, auditLog, eligibilityRules, serviceLocations,
} from '@/lib/db/schema';
import { backfillEmbeddings } from '@/modules/knowledge/retrieval';
import { termFrequencies } from '@/modules/knowledge/tokenizer';
import { addDays } from '@/lib/format/dates';
import { describeAiMode } from '@/modules/ai/providers';
import { hasEmbeddingProvider } from '@/lib/config/env';
import type { UserRole } from '@/lib/domain/enums';
import { GENESIS_HASH, computeEntryHash, verifyChain, type ChainVerificationResult } from '@/modules/ledger/hash-chain';
import { enforceDataRetention } from './retention.service';
import { purgeStaleUssdSessions } from '@/modules/ussd/ussd.service';

/**
 * Administrative operations: analytics, system health, and the background jobs
 * PRD §45 and §119 specify.
 *
 * PRD §37 specifies BullMQ workers. There is no Redis here, so jobs are exposed
 * as idempotent, individually-invocable functions that the admin portal can run
 * on demand and a scheduler can call over HTTP. Every run is recorded in
 * `job_runs`, which is what the System Health panel reads (docs/DEVIATIONS.md §8).
 */

/* ------------------------------------------------------------ analytics */

export interface AnalyticsSummary {
  readonly users: { total: number; citizens: number; staff: number; activeLast7Days: number; newLast30Days: number };
  readonly knowledge: {
    programmes: number;
    organisations: number;
    locations: number;
    verified: number;
    unverifiedSample: number;
    pendingReview: number;
    outdated: number;
    missingRules: number;
    staleDocuments: number;
  };
  readonly engagement: {
    conversations: number;
    messages: number;
    saves: number;
    applications: number;
    actionPlans: number;
    completedActionPlans: number;
    searches: number;
  };
  readonly ai: {
    requests: number;
    engine: string;
    isLive: boolean;
    avgLatencyMs: number;
    p95LatencyMs: number;
    groundingFailures: number;
    groundingFailureRate: number;
    citationCoverage: number;
    avgConfidence: number;
  };
  readonly eligibility: {
    total: number;
    eligible: number;
    partiallyEligible: number;
    notEligible: number;
    unknown: number;
  };
  readonly satisfaction: { helpful: number; notHelpful: number; reportedIncorrect: number; score: number };
  readonly topProgrammes: { title: string; slug: string; views: number; saves: number; applications: number }[];
  readonly topSearches: { query: string; n: number }[];
}

export async function getAnalytics(): Promise<AnalyticsSummary> {
  const sevenDaysAgo = addDays(new Date(), -7);
  const thirtyDaysAgo = addDays(new Date(), -30);

  const [
    userTotals, activeUsers, newUsers,
    programmeCount, orgCount, locationCount, verificationCounts, missingRules, staleDocs,
    conversationCount, messageCount, saveCount, applicationCount, planCounts, searchCount,
    aiStats, latencies, eligibilityCounts, feedbackCounts, topProgrammes, topSearches,
  ] = await Promise.all([
    db.select({ role: users.role, n: count() }).from(users).groupBy(users.role),
    db.select({ n: count() }).from(users).where(gte(users.lastLoginAt, sevenDaysAgo)),
    db.select({ n: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    db.select({ n: count() }).from(opportunities),
    db.select({ n: count() }).from(organizations),
    db.select({ n: count() }).from(serviceLocations),
    db.select({ status: opportunities.verificationStatus, n: count() }).from(opportunities).groupBy(opportunities.verificationStatus),
    db
      .select({ n: count() })
      .from(opportunities)
      .where(
        sql`NOT EXISTS (SELECT 1 FROM ${eligibilityRules} WHERE ${eligibilityRules.opportunityId} = ${opportunities.id} AND ${eligibilityRules.active} = 1)`,
      ),
    db.select({ n: count() }).from(documents).where(eq(documents.stale, true)),
    db.select({ n: count() }).from(conversations),
    db.select({ n: count() }).from(messages),
    db.select({ n: count() }).from(savedOpportunities),
    db.select({ n: count() }).from(savedOpportunities).where(inArray(savedOpportunities.status, ['applied', 'under_review', 'approved', 'completed'])),
    db.select({ status: actionPlans.status, n: count() }).from(actionPlans).groupBy(actionPlans.status),
    db.select({ n: count() }).from(searchQueries),
    db
      .select({
        n: count(),
        avgLatency: sql<number>`coalesce(avg(${aiLogs.latencyMs}), 0)`,
        grounding: sql<number>`sum(case when ${aiLogs.groundingFailure} = 1 then 1 else 0 end)`,
        avgConfidence: sql<number>`coalesce(avg(${aiLogs.confidence}), 0)`,
        withCitations: sql<number>`sum(case when json_array_length(coalesce(${aiLogs.retrievedChunkIds}, '[]')) > 0 then 1 else 0 end)`,
      })
      .from(aiLogs)
      .where(eq(aiLogs.requestType, 'conversation')),
    db
      .select({ latencyMs: aiLogs.latencyMs })
      .from(aiLogs)
      .where(and(eq(aiLogs.requestType, 'conversation'), sql`${aiLogs.latencyMs} IS NOT NULL`))
      .orderBy(desc(aiLogs.latencyMs))
      .limit(500),
    db.select({ outcome: eligibilityEvaluations.outcome, n: count() }).from(eligibilityEvaluations).groupBy(eligibilityEvaluations.outcome),
    db.select({ kind: feedback.kind, n: count() }).from(feedback).groupBy(feedback.kind),
    db
      .select({
        title: opportunities.title,
        slug: opportunities.slug,
        views: opportunities.viewCount,
        saves: opportunities.saveCount,
        applications: opportunities.applicationCount,
      })
      .from(opportunities)
      .orderBy(desc(opportunities.viewCount))
      .limit(10),
    db
      .select({ query: searchQueries.query, n: count() })
      .from(searchQueries)
      .groupBy(searchQueries.query)
      .orderBy(desc(count()))
      .limit(10),
  ]);

  const roleCount = (role: UserRole) => Number(userTotals.find((r) => r.role === role)?.n ?? 0);
  const verificationCount = (status: string) => Number(verificationCounts.find((v) => v.status === status)?.n ?? 0);
  const feedbackCount = (kind: string) => Number(feedbackCounts.find((f) => f.kind === kind)?.n ?? 0);

  const aiRow = aiStats[0];
  const requests = Number(aiRow?.n ?? 0);
  const groundingFailures = Number(aiRow?.grounding ?? 0);
  const withCitations = Number(aiRow?.withCitations ?? 0);

  // p95 from the ordered sample. With fewer than 20 rows a percentile is not
  // meaningful, so the max is reported instead of a fabricated estimate.
  const sorted = latencies.map((l) => l.latencyMs ?? 0).sort((a, b) => a - b);
  const p95 =
    sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;

  const helpful = feedbackCount('helpful');
  const notHelpful = feedbackCount('not_helpful');
  const ai = describeAiMode();

  return {
    users: {
      total: userTotals.reduce((sum, r) => sum + Number(r.n), 0),
      citizens: roleCount('citizen'),
      staff: roleCount('moderator') + roleCount('administrator') + roleCount('super_admin'),
      activeLast7Days: Number(activeUsers[0]?.n ?? 0),
      newLast30Days: Number(newUsers[0]?.n ?? 0),
    },
    knowledge: {
      programmes: Number(programmeCount[0]?.n ?? 0),
      organisations: Number(orgCount[0]?.n ?? 0),
      locations: Number(locationCount[0]?.n ?? 0),
      verified: verificationCount('verified'),
      unverifiedSample: verificationCount('unverified_sample'),
      pendingReview: verificationCount('pending_review'),
      outdated: verificationCount('outdated'),
      missingRules: Number(missingRules[0]?.n ?? 0),
      staleDocuments: Number(staleDocs[0]?.n ?? 0),
    },
    engagement: {
      conversations: Number(conversationCount[0]?.n ?? 0),
      messages: Number(messageCount[0]?.n ?? 0),
      saves: Number(saveCount[0]?.n ?? 0),
      applications: Number(applicationCount[0]?.n ?? 0),
      actionPlans: planCounts.reduce((sum, p) => sum + Number(p.n), 0),
      completedActionPlans: Number(planCounts.find((p) => p.status === 'completed')?.n ?? 0),
      searches: Number(searchCount[0]?.n ?? 0),
    },
    ai: {
      requests,
      engine: ai.mode,
      isLive: ai.isLive,
      avgLatencyMs: Math.round(Number(aiRow?.avgLatency ?? 0)),
      p95LatencyMs: p95,
      groundingFailures,
      groundingFailureRate: requests === 0 ? 0 : Math.round((groundingFailures / requests) * 1000) / 10,
      citationCoverage: requests === 0 ? 0 : Math.round((withCitations / requests) * 1000) / 10,
      avgConfidence: Math.round(Number(aiRow?.avgConfidence ?? 0)),
    },
    eligibility: {
      total: eligibilityCounts.reduce((sum, e) => sum + Number(e.n), 0),
      eligible: Number(eligibilityCounts.find((e) => e.outcome === 'eligible')?.n ?? 0),
      partiallyEligible: Number(eligibilityCounts.find((e) => e.outcome === 'partially_eligible')?.n ?? 0),
      notEligible: Number(eligibilityCounts.find((e) => e.outcome === 'not_eligible')?.n ?? 0),
      unknown: Number(eligibilityCounts.find((e) => e.outcome === 'unknown')?.n ?? 0),
    },
    satisfaction: {
      helpful,
      notHelpful,
      reportedIncorrect: feedbackCount('incorrect_information'),
      score: helpful + notHelpful === 0 ? 0 : Math.round((helpful / (helpful + notHelpful)) * 1000) / 10,
    },
    topProgrammes: topProgrammes.map((p) => ({
      title: p.title,
      slug: p.slug,
      views: p.views,
      saves: p.saves,
      applications: p.applications,
    })),
    topSearches: topSearches.map((s) => ({ query: s.query, n: Number(s.n) })),
  };
}

/* --------------------------------------------------------- system health */

export async function getSystemHealth() {
  const started = Date.now();
  let databaseOk = true;
  try {
    await db.select({ n: count() }).from(users).limit(1);
  } catch {
    databaseOk = false;
  }
  const databaseLatencyMs = Date.now() - started;

  const [chunkStats] = await db
    .select({
      total: count(),
      embedded: sql<number>`sum(case when ${documentChunks.embedding} is not null then 1 else 0 end)`,
    })
    .from(documentChunks);

  const recentJobs = await db.select().from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(12);
  const recentErrors = await db
    .select({ id: aiLogs.id, error: aiLogs.error, createdAt: aiLogs.createdAt, requestType: aiLogs.requestType })
    .from(aiLogs)
    .where(sql`${aiLogs.error} IS NOT NULL`)
    .orderBy(desc(aiLogs.createdAt))
    .limit(10);

  const ai = describeAiMode();

  return {
    database: { ok: databaseOk, latencyMs: databaseLatencyMs },
    ai: {
      ...ai,
      // Stated plainly so an operator is never confused about why answers are
      // template-shaped.
      note: ai.isLive
        ? 'A hosted model is configured and serving responses.'
        : 'No API key is configured. Responses are produced by the deterministic composer and labelled "Simulated" in the UI.',
    },
    retrieval: {
      chunks: Number(chunkStats?.total ?? 0),
      embedded: Number(chunkStats?.embedded ?? 0),
      embeddingProvider: hasEmbeddingProvider,
      mode: hasEmbeddingProvider ? 'hybrid (BM25 + vector)' : 'lexical only (BM25)',
    },
    jobs: recentJobs,
    recentErrors,
  };
}

/* --------------------------------------------------------- background jobs */

export async function runJob<T>(name: string, fn: () => Promise<{ processed: number; failed?: number; detail?: Record<string, unknown> }>) {
  const [run] = await db.insert(jobRuns).values({ job: name, status: 'running' }).returning();
  try {
    const result = await fn();
    await db
      .update(jobRuns)
      .set({
        status: 'succeeded',
        finishedAt: new Date(),
        processed: result.processed,
        failed: result.failed ?? 0,
        detail: result.detail ?? null,
      })
      .where(eq(jobRuns.id, run!.id));
    return { jobId: run!.id, ...result };
  } catch (error) {
    await db
      .update(jobRuns)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        detail: { error: error instanceof Error ? error.message : String(error) },
      })
      .where(eq(jobRuns.id, run!.id));
    throw error;
  }
}

/** Rebuilds the lexical index. Needed after any programme text is edited. */
export async function reindexSearch() {
  return runJob('reindex_search', async () => {
    const chunks = await db.select({ id: documentChunks.id, content: documentChunks.content }).from(documentChunks);
    let processed = 0;
    for (const chunk of chunks) {
      await db
        .update(documentChunks)
        .set({ termFrequencies: termFrequencies(chunk.content) })
        .where(eq(documentChunks.id, chunk.id));
      processed += 1;
    }
    return { processed, detail: { chunks: chunks.length } };
  });
}

export async function rebuildEmbeddings() {
  return runJob('rebuild_embeddings', async () => {
    if (!hasEmbeddingProvider) {
      // Honest no-op rather than a fake success.
      return {
        processed: 0,
        detail: { skipped: true, reason: 'No embedding provider configured (set OPENAI_API_KEY).' },
      };
    }
    let processed = 0;
    for (let batch = 0; batch < 40; batch += 1) {
      const result = await backfillEmbeddings(64);
      if (result.skipped || result.processed === 0) break;
      processed += result.processed;
    }
    return { processed };
  });
}

/**
 * Flags records whose verification has aged past their review interval, and
 * closes programmes whose deadline has passed. This is what stops the corpus
 * silently rotting (PRD §111 staleness policy, §128 "Outdated information").
 */
/**
 * A source document is treated as stale six months after it was retrieved.
 * Programmes carry their own `reviewIntervalDays`; documents do not, so this is
 * the corpus-wide default — matching the 180-day default on a programme.
 */
const DOCUMENT_STALE_AFTER_DAYS = 180;

export async function detectStaleness() {
  return runJob('detect_staleness', async () => {
    const now = new Date();

    const all = await db
      .select({
        id: opportunities.id,
        lastVerifiedAt: opportunities.lastVerifiedAt,
        reviewIntervalDays: opportunities.reviewIntervalDays,
        verificationStatus: opportunities.verificationStatus,
        deadline: opportunities.deadline,
        status: opportunities.status,
      })
      .from(opportunities);

    let markedOutdated = 0;
    let closed = 0;

    for (const record of all) {
      if (record.verificationStatus === 'verified' && record.lastVerifiedAt) {
        const ageDays = (now.getTime() - record.lastVerifiedAt.getTime()) / 86_400_000;
        if (ageDays > record.reviewIntervalDays) {
          await db
            .update(opportunities)
            .set({ verificationStatus: 'outdated', updatedAt: now })
            .where(eq(opportunities.id, record.id));
          markedOutdated += 1;
        }
      }
      if (record.deadline && record.deadline.getTime() < now.getTime() && record.status === 'open') {
        await db
          .update(opportunities)
          .set({ status: 'closed', updatedAt: now })
          .where(eq(opportunities.id, record.id));
        closed += 1;
      }
    }

    // `deadLink` and `stale` are NOT NULL booleans, so this must compare to
    // false rather than test for null — an `isNull` here would match no row and
    // the job would silently never flag anything. Excluding already-stale rows
    // also keeps the reported count meaning "newly flagged", so a second run in
    // the same day reports 0 instead of re-counting the same documents.
    const staleDocs = await db
      .update(documents)
      .set({ stale: true })
      .where(
        and(
          eq(documents.deadLink, false),
          eq(documents.stale, false),
          sql`${documents.retrievedAt} IS NOT NULL AND ${documents.retrievedAt} < ${now.getTime() - DOCUMENT_STALE_AFTER_DAYS * 86_400_000}`,
        ),
      )
      .returning({ id: documents.id });

    return {
      processed: markedOutdated + closed + staleDocs.length,
      detail: { markedOutdated, closedExpired: closed, staleDocuments: staleDocs.length },
    };
  });
}

/** Deadline reminders for every citizen who has saved something. */
export async function sendScheduledNotifications() {
  return runJob('scheduled_notifications', async () => {
    const { generateDeadlineReminders } = await import('@/modules/citizen/citizen.service');
    const citizens = await db.select({ id: users.id }).from(users).where(eq(users.role, 'citizen'));
    let processed = 0;
    for (const citizen of citizens) {
      processed += await generateDeadlineReminders(citizen.id, 7);
    }
    return { processed, detail: { citizens: citizens.length } };
  });
}

export async function aggregateAnalytics() {
  return runJob('aggregate_analytics', async () => {
    const summary = await getAnalytics();
    const day = new Date().toISOString().slice(0, 10);
    const { analyticsDaily } = await import('@/lib/db/schema');
    await db
      .insert(analyticsDaily)
      .values({
        day,
        activeUsers: summary.users.activeLast7Days,
        newUsers: summary.users.newLast30Days,
        conversations: summary.engagement.conversations,
        recommendations: summary.ai.requests,
        saves: summary.engagement.saves,
        applicationsStarted: summary.engagement.applications,
        completedActionPlans: summary.engagement.completedActionPlans,
        searches: summary.engagement.searches,
        avgLatencyMs: summary.ai.avgLatencyMs,
        citationCoverage: summary.ai.citationCoverage,
        groundingFailureRate: summary.ai.groundingFailureRate,
        satisfactionScore: summary.satisfaction.score,
      })
      .onConflictDoUpdate({
        target: analyticsDaily.day,
        set: {
          activeUsers: summary.users.activeLast7Days,
          conversations: summary.engagement.conversations,
          saves: summary.engagement.saves,
          avgLatencyMs: summary.ai.avgLatencyMs,
          citationCoverage: summary.ai.citationCoverage,
          groundingFailureRate: summary.ai.groundingFailureRate,
          satisfactionScore: summary.satisfaction.score,
        },
      });
    return { processed: 1, detail: { day } };
  });
}

/** SJ-43 — deletes personal data past its retention window; never touches the ledger or audit log. */
export async function runDataRetention() {
  return runJob('enforce_data_retention', async () => {
    const result = await enforceDataRetention();
    const ussdSessionsPurged = await purgeStaleUssdSessions();
    return {
      processed: result.conversationsDeleted + result.aiLogsDeleted + result.otpChallengesDeleted + ussdSessionsPurged,
      detail: { ...result, ussdSessionsPurged },
    };
  });
}

export const JOBS = {
  reindex_search: reindexSearch,
  rebuild_embeddings: rebuildEmbeddings,
  detect_staleness: detectStaleness,
  scheduled_notifications: sendScheduledNotifications,
  aggregate_analytics: aggregateAnalytics,
  enforce_data_retention: runDataRetention,
} as const;

export type JobName = keyof typeof JOBS;

/* ------------------------------------------------------------ audit read */

export async function listAuditLog(limit = 100, entityType?: string) {
  return db
    .select()
    .from(auditLog)
    .where(entityType ? eq(auditLog.entityType, entityType) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

/**
 * SJ-13 — every row folds in the previous one's hash (modules/ledger/hash-chain.ts).
 * Same single-writer caveat as the financial ledger: see docs/DEVIATIONS.md.
 *
 * The "last hash" lookup filters to `entryHash IS NOT NULL` rather than just
 * taking the most recent row. Without that filter this silently breaks: this
 * is the ONE place any code in the app writes an audit_log row, so once
 * login/logout events (the highest-volume action, `auth.login`) were folded
 * into this same function, the naive "most recent row" query worked — but
 * for a while a separate write path in auth.service.ts inserted those same
 * rows directly with no hash at all. The instant one of those became the
 * most recent row, the next `recordAudit()` call fell back to GENESIS again
 * and collided with the actual first row (`prev_hash` is uniquely indexed),
 * throwing on every audited action until the process restarted. Filtering to
 * chained rows only makes the lookup correct regardless of what wrote the
 * most recent row.
 */
export async function recordAudit(input: {
  actorId: string | null;
  actorRole: UserRole | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const [last] = await db
    .select({ entryHash: auditLog.entryHash })
    .from(auditLog)
    .where(isNotNull(auditLog.entryHash))
    .orderBy(desc(auditLog.createdAt))
    .limit(1);
  const prevHash = last?.entryHash ?? GENESIS_HASH;

  const payload = {
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
  };
  const entryHash = computeEntryHash(prevHash, payload);

  await db.insert(auditLog).values({ ...payload, ip: input.ip ?? null, userAgent: input.userAgent ?? null, prevHash, entryHash });
}

/** Walks every hash-chained row (skipping pre-migration rows with no hash) and reports whether it is intact. */
export async function verifyAuditChain(): Promise<ChainVerificationResult> {
  const rows = await db.select().from(auditLog).orderBy(asc(auditLog.createdAt));
  return verifyChain(rows, (row) => ({
    actorId: row.actorId,
    actorRole: row.actorRole,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    before: row.before,
    after: row.after,
  }));
}

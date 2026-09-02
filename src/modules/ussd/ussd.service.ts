import { eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { ussdSessions, users, userProfiles, unionBoundaries } from '@/lib/db/schema';
import { ISSUE_CATEGORIES, type IssueCategory } from '@/lib/domain/enums';
import { checkEntitlementStatusByNid } from '@/modules/entitlements/entitlement.service';
import { submitIssue, listMyIssues } from '@/modules/issues/issue.service';

/**
 * SJ-23/48 — the non-smartphone path. A USSD aggregator calls this on every
 * keypress with the SAME `sessionId` and the FULL text typed in the session
 * so far (star-separated), e.g. `1*2*Broken tubewell near the market`, not
 * just the latest digit — the near-universal contract Africa's Talking,
 * SSL Wireless USSD, and most BD aggregators all speak. `CON` means "keep
 * the session open, show this and wait for more input"; `END` closes it.
 *
 * Reporting an issue this way is scoped exactly as tightly as the web path:
 * the reporter and their union both come from an ALREADY-VERIFIED account
 * matched by the caller's own phone number (supplied by the telecom network
 * in the callback, not typed by the caller — stronger provenance than a web
 * form field), never invented from USSD input. A phone with no verified
 * residency is told so, honestly, rather than allowed to file into a union
 * it was never confirmed to live in.
 */

const CATEGORY_MENU: readonly IssueCategory[] = ISSUE_CATEGORIES;

export interface UssdCallbackInput {
  readonly sessionId: string;
  readonly phone: string;
  /** Full accumulated input for the session, star-separated, per the aggregator contract described above. */
  readonly text: string;
}

export interface UssdResponse {
  readonly kind: 'CON' | 'END';
  readonly text: string;
}

function respond(kind: 'CON' | 'END', text: string): UssdResponse {
  return { kind, text };
}

async function findVerifiedReporter(phone: string) {
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) return null;
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
  if (!profile?.residencyUnionId) return null;
  return { userId: user.id, unionId: profile.residencyUnionId };
}

const MAIN_MENU = 'Shebar Janala\n1. Check my benefit status\n2. Report an issue\n3. My issue reports';

export async function handleUssdCallback(input: UssdCallbackInput): Promise<UssdResponse> {
  // The last * segment is always the latest thing the caller just typed;
  // everything before it is history already reflected in ussd_sessions.step.
  const parts = input.text.split('*').filter((p) => p.length > 0);
  const latest = parts.at(-1) ?? '';

  let [existing] = await db.select().from(ussdSessions).where(eq(ussdSessions.sessionId, input.sessionId)).limit(1);
  if (!existing) {
    [existing] = await db.insert(ussdSessions).values({ sessionId: input.sessionId, phone: input.phone, step: 'menu' }).returning();
  }
  const session = existing!;

  if (parts.length === 0) return respond('CON', MAIN_MENU);

  switch (session.step) {
    case 'menu':
      return routeMenuChoice(input, latest, session.id);

    case 'awaiting_nid': {
      await db.delete(ussdSessions).where(eq(ussdSessions.id, session.id));
      const status = await checkEntitlementStatusByNid(latest);
      if (!status.enrolled) {
        return respond(
          'END',
          status.reason === 'nid_not_verified'
            ? 'No verified national ID matches this number, or you are not enrolled in any programme.'
            : 'This national ID is not enrolled in any programme.',
        );
      }
      const nextPayment = status.entitlements?.flatMap((e) => e.disbursements).find((d) => d.status === 'scheduled');
      const lastPaid = status.entitlements?.flatMap((e) => e.disbursements).filter((d) => d.status === 'paid').at(-1);
      return respond(
        'END',
        [
          `Programme: ${status.beneficiary!.programName} (${status.beneficiary!.status})`,
          lastPaid ? `Last paid: TK ${lastPaid.amount} on ${lastPaid.paidAt?.slice(0, 10)}` : 'No payment made yet.',
          nextPayment ? `Next scheduled: TK ${nextPayment.amount} on ${nextPayment.scheduledFor.slice(0, 10)}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }

    case 'awaiting_issue_category': {
      const choice = Number.parseInt(latest, 10);
      const category = CATEGORY_MENU[choice - 1];
      if (!category) return respond('END', 'Invalid choice. Please dial in again.');
      await db.update(ussdSessions).set({ step: 'awaiting_issue_description', context: { category }, updatedAt: new Date() }).where(eq(ussdSessions.id, session.id));
      return respond('CON', 'Describe the problem in a few words:');
    }

    case 'awaiting_issue_description': {
      await db.delete(ussdSessions).where(eq(ussdSessions.id, session.id));
      const reporter = await findVerifiedReporter(input.phone);
      if (!reporter) {
        return respond('END', 'Your number is not linked to a residency-verified Shebar Janala account. Visit a Shebar Janala point or use the app to verify first.');
      }
      const category = (session.context as { category?: IssueCategory } | null)?.category ?? 'other';
      const [union] = await db.select().from(unionBoundaries).where(eq(unionBoundaries.id, reporter.unionId)).limit(1);
      const description = latest.slice(0, 500);
      const issue = await submitIssue({
        reporterId: reporter.userId,
        unionId: reporter.unionId,
        category,
        title: description.slice(0, 60),
        description,
        lat: union?.centroidLat ?? 0,
        lng: union?.centroidLng ?? 0,
      });
      return respond('END', `Report submitted. Reference: ${issue.id.slice(0, 8).toUpperCase()}. It will be reviewed by your union.`);
    }

    default:
      await db.delete(ussdSessions).where(eq(ussdSessions.id, session.id));
      return respond('END', 'Something went wrong. Please dial in again.');
  }
}

async function routeMenuChoice(input: UssdCallbackInput, choice: string, sessionRowId: string): Promise<UssdResponse> {
  switch (choice) {
    case '1':
      await db.update(ussdSessions).set({ step: 'awaiting_nid', updatedAt: new Date() }).where(eq(ussdSessions.id, sessionRowId));
      return respond('CON', 'Enter your National ID number:');

    case '2': {
      const reporter = await findVerifiedReporter(input.phone);
      if (!reporter) {
        await db.delete(ussdSessions).where(eq(ussdSessions.id, sessionRowId));
        return respond('END', 'Your number is not linked to a residency-verified Shebar Janala account. Visit a Shebar Janala point or use the app to verify first.');
      }
      await db.update(ussdSessions).set({ step: 'awaiting_issue_category', updatedAt: new Date() }).where(eq(ussdSessions.id, sessionRowId));
      const menu = CATEGORY_MENU.map((c, i) => `${i + 1}. ${c.replace(/_/g, ' ')}`).join('\n');
      return respond('CON', `What kind of problem?\n${menu}`);
    }

    case '3': {
      const reporter = await findVerifiedReporter(input.phone);
      await db.delete(ussdSessions).where(eq(ussdSessions.id, sessionRowId));
      if (!reporter) return respond('END', 'Your number is not linked to a residency-verified Shebar Janala account.');
      const mine = await listMyIssues(reporter.userId, 3);
      if (mine.length === 0) return respond('END', 'You have not reported any issues yet.');
      return respond('END', mine.map((i) => `${i.title.slice(0, 30)}: ${i.status}`).join('\n'));
    }

    default:
      await db.delete(ussdSessions).where(eq(ussdSessions.id, sessionRowId));
      return respond('END', 'Invalid choice.');
  }
}

/** Housekeeping: real USSD sessions time out in the telecom network in well under an hour. */
export async function purgeStaleUssdSessions(olderThanMinutes = 60): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const deleted = await db.delete(ussdSessions).where(lt(ussdSessions.updatedAt, cutoff)).returning({ id: ussdSessions.id });
  return deleted.length;
}

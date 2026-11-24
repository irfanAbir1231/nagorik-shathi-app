import type { EligibilityOutcome } from '@/lib/domain/enums';

/**
 * Who to tell about a newly published programme. Pure, so the policy is
 * tested on its own.
 *
 * A programme with eligibility rules notifies people the engine finds
 * eligible or partially eligible. Most newly found programmes have no rules
 * yet, so for those the match is weaker and worded that way: the person's own
 * recorded life events overlap the programme's (a widow, for a widow's
 * allowance) and they live where it is offered. "Unknown" never notifies:
 * nobody is told about something they have no reason to expect.
 */

export type MatchReason = 'eligible' | 'life_event';

export function matchReason(input: {
  readonly coverageDistricts: readonly string[];
  readonly programmeLifeEvents: readonly string[];
  readonly hasRules: boolean;
  readonly outcome?: EligibilityOutcome | null;
  readonly userDistrict?: string | null;
  readonly userLifeEvents: readonly string[];
}): MatchReason | null {
  const covered =
    input.coverageDistricts.length === 0 ||
    (input.userDistrict != null && input.coverageDistricts.includes(input.userDistrict));
  if (!covered) return null;

  if (input.hasRules) {
    return input.outcome === 'eligible' || input.outcome === 'partially_eligible' ? 'eligible' : null;
  }
  const shared = input.programmeLifeEvents.some((event) => input.userLifeEvents.includes(event));
  return shared ? 'life_event' : null;
}

/** Notifications about new programmes per person per day; the rest wait for the next. */
export const NEW_PROGRAMME_DAILY_CAP = 1;

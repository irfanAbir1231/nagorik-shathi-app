import type { EligibilityProfile } from '@/modules/eligibility/engine';
import { getDistrict } from '@/lib/domain/geography';
import type { EvidenceFact, FactValue } from './semantic-frame';

/**
 * The evidence ledger — which value of each fact the rule engine may use, and why.
 *
 * Three sources, with explicit precedence and no silent resolution:
 *
 *  1. PROFILE  — what the citizen entered on the profile form (or confirmed
 *     from chat). Self-reported, but deliberate.
 *  2. EARLIER MESSAGES in this conversation — accepted facts only.
 *  3. THIS MESSAGE — accepted facts only.
 *
 * Rules:
 *  • Conversation facts are CONVERSATION-SCOPED. Nothing here writes to the
 *    profile; a fact reaches the profile only when the citizen confirms it
 *    (the "save to my profile" action). An unconfirmed statement in a chat can
 *    never become a stored, reusable fact about a person.
 *  • A later statement supersedes an earlier one (the citizen corrected
 *    themselves) — recorded, not hidden.
 *  • A conversation value that CONTRADICTS the profile is a conflict: the field
 *    becomes unknown and the citizen is asked. Code never picks a side.
 *  • A later UNCERTAIN statement that disagrees with an accepted one suspends
 *    the field until the citizen confirms.
 */

export type ProvenanceSource = 'this_message' | 'earlier_message' | 'profile' | 'account';

export interface Provenance {
  readonly field: string;
  readonly value: FactValue | readonly string[];
  readonly source: ProvenanceSource;
  readonly method: 'jev' | 'pattern' | 'form' | 'account';
  readonly probability: number | null;
  readonly evidence?: string;
  readonly messageId?: string;
  readonly note?: string;
}

export interface Conflict {
  readonly field: string;
  readonly profileValue: FactValue;
  readonly conversationValue: FactValue;
  readonly conversationSource: ProvenanceSource;
}

/** A fact as persisted in an assistant message's payload. */
export interface ConversationFact extends EvidenceFact {
  readonly messageId?: string;
}

export interface Ledger {
  readonly profile: EligibilityProfile;
  readonly provenance: Readonly<Record<string, Provenance>>;
  readonly conflicts: readonly Conflict[];
  /** Facts waiting for the citizen's confirmation — never used by the engine. */
  readonly pending: readonly ConversationFact[];
  /** Accepted conversation facts in effect, for the "save to my profile" action. */
  readonly saveable: readonly ConversationFact[];
  readonly superseded: readonly { readonly field: string; readonly from: FactValue; readonly to: FactValue }[];
}

/**
 * Fields the account sets for every citizen at registration without asking.
 * They are real profile values, but the citizen never stated them, and the
 * trace must say so rather than present them as confirmed.
 */
const ACCOUNT_DEFAULTS: Readonly<Record<string, FactValue>> = { citizenship: 'bangladeshi' };

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function buildLedger(input: {
  readonly profile: EligibilityProfile;
  readonly earlier: readonly ConversationFact[];
  readonly current: readonly EvidenceFact[];
  readonly currentMessageId?: string;
}): Ledger {
  const profile: Record<string, unknown> = { ...input.profile };
  const provenance: Record<string, Provenance> = {};

  for (const [field, value] of Object.entries(input.profile)) {
    if (value === undefined || value === null) continue;
    const isDefault = field in ACCOUNT_DEFAULTS && sameValue(ACCOUNT_DEFAULTS[field], value);
    provenance[field] = {
      field,
      value: value as FactValue,
      source: isDefault ? 'account' : 'profile',
      method: isDefault ? 'account' : 'form',
      probability: null,
      ...(isDefault ? { note: 'Set on your account by default; you have not confirmed it.' } : {}),
    };
  }

  // Latest statement per field, walking oldest → newest.
  const timeline: { fact: ConversationFact; source: ProvenanceSource }[] = [
    ...input.earlier.map((fact) => ({ fact, source: 'earlier_message' as const })),
    ...input.current.map((fact) => ({
      fact: { ...fact, ...(input.currentMessageId ? { messageId: input.currentMessageId } : {}) },
      source: 'this_message' as const,
    })),
  ];

  const acceptedByField = new Map<string, { fact: ConversationFact; source: ProvenanceSource }>();
  const pendingByField = new Map<string, ConversationFact>();
  const superseded: { field: string; from: FactValue; to: FactValue }[] = [];

  for (const entry of timeline) {
    const { fact } = entry;
    const accepted = acceptedByField.get(fact.field);
    if (fact.status === 'accepted') {
      if (accepted && !sameValue(accepted.fact.value, fact.value)) {
        superseded.push({ field: fact.field, from: accepted.fact.value, to: fact.value });
      }
      acceptedByField.set(fact.field, entry);
      pendingByField.delete(fact.field);
    } else {
      pendingByField.set(fact.field, fact);
    }
  }

  const conflicts: Conflict[] = [];
  const saveable: ConversationFact[] = [];

  for (const [field, { fact, source }] of acceptedByField) {
    const pendingLater = pendingByField.get(field);
    // A later, uncertain statement that disagrees suspends the accepted
    // conversation value (a stored profile value, if any, is left alone and the
    // pending statement is put to the citizen).
    if (pendingLater && !sameValue(pendingLater.value, fact.value)) continue;
    if (pendingLater) pendingByField.delete(field);

    const stored = input.profile[field as keyof EligibilityProfile];
    const storedIsDefault = field in ACCOUNT_DEFAULTS && sameValue(ACCOUNT_DEFAULTS[field], stored);
    if (stored !== undefined && stored !== null && !storedIsDefault) {
      if (sameValue(stored, fact.value)) {
        provenance[field] = { ...provenance[field]!, note: 'Also stated in this conversation.' };
        continue;
      }
      conflicts.push({ field, profileValue: stored as FactValue, conversationValue: fact.value, conversationSource: source });
      delete profile[field];
      delete provenance[field];
      continue;
    }

    profile[field] = fact.value;
    provenance[field] = {
      field,
      value: fact.value,
      source,
      method: fact.method,
      probability: fact.probability,
      evidence: fact.evidence,
      ...(fact.messageId ? { messageId: fact.messageId } : {}),
      ...(fact.note ? { note: fact.note } : {}),
    };
    saveable.push(fact);
  }

  // Derived fields follow their source, so a rule on either period or either
  // level of geography reads the same evidence.
  for (const [base, derived] of [['monthlyIncome', 'annualIncome'], ['district', 'division']] as const) {
    const p = provenance[base];
    if (p && p.source !== 'profile' && p.source !== 'account') {
      profile[derived] = base === 'monthlyIncome' ? Number(p.value) * 12 : getDistrict(String(p.value))?.division;
      provenance[derived] = { ...p, field: derived, value: profile[derived] as FactValue, note: `Derived from ${base}.` };
    } else if (!(base in profile)) {
      // A conflicted base field must not leave a stale derived value behind.
      if (conflicts.some((c) => c.field === base)) {
        delete profile[derived];
        delete provenance[derived];
      }
    }
  }

  // Nothing to confirm when the profile already says the same thing.
  const pending = [...pendingByField.values()].filter(
    (fact) => !sameValue(input.profile[fact.field as keyof EligibilityProfile], fact.value),
  );

  return {
    profile: profile as EligibilityProfile,
    provenance,
    conflicts,
    pending,
    saveable,
    superseded,
  };
}

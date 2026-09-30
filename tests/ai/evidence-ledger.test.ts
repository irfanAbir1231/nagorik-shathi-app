import { describe, expect, it } from 'vitest';
import { buildLedger, type ConversationFact } from '@/modules/ai/evidence';
import type { EvidenceFact } from '@/modules/ai/semantic-frame';

function fact(field: EvidenceFact['field'], value: EvidenceFact['value'], status: EvidenceFact['status'] = 'accepted', probability = 0.97): EvidenceFact {
  return {
    field, value, status, probability, method: 'jev', questionId: field, answer: String(value),
    evidence: 'test message', thresholds: { accept: 0.9, confirm: 0.5 },
  };
}

describe('evidence ledger', () => {
  it('uses accepted conversation facts and records where they came from', () => {
    const ledger = buildLedger({ profile: { citizenship: 'bangladeshi' }, earlier: [], current: [fact('maritalStatus', 'widowed')], currentMessageId: 'm1' });
    expect(ledger.profile.maritalStatus).toBe('widowed');
    expect(ledger.provenance.maritalStatus).toMatchObject({ source: 'this_message', method: 'jev', probability: 0.97, messageId: 'm1' });
  });

  it('never uses a fact that is waiting for confirmation', () => {
    const ledger = buildLedger({ profile: {}, earlier: [], current: [fact('maritalStatus', 'widowed', 'needs_confirmation', 0.6)] });
    expect(ledger.profile.maritalStatus).toBeUndefined();
    expect(ledger.pending).toHaveLength(1);
  });

  it('labels the registration default honestly instead of as a confirmed fact', () => {
    const ledger = buildLedger({ profile: { citizenship: 'bangladeshi' }, earlier: [], current: [] });
    expect(ledger.provenance.citizenship).toMatchObject({ source: 'account', method: 'account' });
  });

  it('carries accepted facts across turns of the same conversation', () => {
    const earlier: ConversationFact[] = [{ ...fact('maritalStatus', 'widowed'), messageId: 'm1' }];
    const ledger = buildLedger({ profile: {}, earlier, current: [fact('monthlyIncome', 1200)] });
    expect(ledger.profile).toMatchObject({ maritalStatus: 'widowed', monthlyIncome: 1200, annualIncome: 14400 });
    expect(ledger.provenance.maritalStatus?.source).toBe('earlier_message');
  });

  it('lets a later statement supersede an earlier one, and records it', () => {
    const earlier: ConversationFact[] = [fact('maritalStatus', 'widowed')];
    const ledger = buildLedger({ profile: {}, earlier, current: [fact('maritalStatus', 'married')] });
    expect(ledger.profile.maritalStatus).toBe('married');
    expect(ledger.superseded).toEqual([{ field: 'maritalStatus', from: 'widowed', to: 'married' }]);
  });

  it('suspends an accepted fact when a later, uncertain statement disagrees', () => {
    const earlier: ConversationFact[] = [fact('maritalStatus', 'widowed')];
    const ledger = buildLedger({ profile: {}, earlier, current: [fact('maritalStatus', 'married', 'needs_confirmation', 0.6)] });
    expect(ledger.profile.maritalStatus).toBeUndefined();
    expect(ledger.pending.map((p) => p.value)).toEqual(['married']);
  });

  it('turns a contradiction with the profile into an unknown and a conflict — never picks a side', () => {
    const ledger = buildLedger({ profile: { maritalStatus: 'married' }, earlier: [], current: [fact('maritalStatus', 'widowed')] });
    expect(ledger.profile.maritalStatus).toBeUndefined();
    expect(ledger.conflicts).toEqual([{ field: 'maritalStatus', profileValue: 'married', conversationValue: 'widowed', conversationSource: 'this_message' }]);
  });

  it('drops a derived value when its base field is in conflict', () => {
    const ledger = buildLedger({ profile: { monthlyIncome: 9000, annualIncome: 108000 }, earlier: [], current: [fact('monthlyIncome', 1000)] });
    expect(ledger.profile.monthlyIncome).toBeUndefined();
    expect(ledger.profile.annualIncome).toBeUndefined();
  });

  it('corroborates rather than duplicates when chat agrees with the profile', () => {
    const ledger = buildLedger({ profile: { gender: 'female' }, earlier: [], current: [fact('gender', 'female')] });
    expect(ledger.provenance.gender).toMatchObject({ source: 'profile', note: 'Also stated in this conversation.' });
    expect(ledger.conflicts).toEqual([]);
  });

  it('never writes the profile: it only returns what the citizen may choose to save', () => {
    const profile = { age: 40 } as const;
    const ledger = buildLedger({ profile, earlier: [], current: [fact('maritalStatus', 'widowed')] });
    expect(profile).toEqual({ age: 40 });
    expect(ledger.saveable.map((f) => f.field)).toEqual(['maritalStatus']);
  });
});

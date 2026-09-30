import { buildLedger } from '@/modules/ai/evidence';
import type { EvidenceFact } from '@/modules/ai/semantic-frame';
const f = (value: string): EvidenceFact => ({ field: 'maritalStatus', value, status: 'accepted', probability: 0.99, method: 'jev', questionId: 'marital_status', answer: value, evidence: 'x', thresholds: { accept: 0.9, confirm: 0.5 } });
// Profile form says "married"; the citizen says "widowed", is asked which is right, and answers "widowed" again.
const turn1 = buildLedger({ profile: { maritalStatus: 'married' }, earlier: [], current: [f('widowed')] });
const turn2 = buildLedger({ profile: { maritalStatus: 'married' }, earlier: [f('widowed')], current: [f('widowed')] });
console.log('turn1 conflicts', turn1.conflicts.length, 'saveable', turn1.saveable.map((x) => x.field));
console.log('turn2 (citizen re-affirms) conflicts', turn2.conflicts.length, 'saveable', turn2.saveable.map((x) => x.field), 'maritalStatus used:', turn2.profile.maritalStatus ?? 'unknown');
// After the fix: runTurn passes the fields the previous turn asked about as a conflict (loadConversationFacts → conflictAsked).
const turn2Fixed = buildLedger({ profile: { maritalStatus: 'married' }, earlier: [f('widowed')], current: [f('widowed')], conflictAsked: new Set(['maritalStatus']) });
console.log('turn2 after fix (asked, re-affirmed) conflicts', turn2Fixed.conflicts.length, 'saveable', turn2Fixed.saveable.map((x) => x.field), 'maritalStatus used:', turn2Fixed.profile.maritalStatus ?? 'unknown');

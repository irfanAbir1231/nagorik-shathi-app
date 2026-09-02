# Ledger integrity — what the hash chain proves, and how to check it yourself

SJ-41: "formalise and independently audit the hash-chain's tamper-evidence guarantee." This document
is that formalisation. It is deliberately blunt about the limits, because a tamper-evidence claim that
overstates itself is worse than none — a reader who trusts an inflated guarantee has less protection
than one who correctly distrusts a weak one.

```bash
npm run ledger:audit
```

Run this against a clone of the database file (or a read-only libSQL URL/token) with no server running
and no login. That is the entire point: it needs nothing beyond what an external auditor — the
Anti-Corruption Commission, an engaged audit firm, a journalist with a copy of the database — would
plausibly be given.

## What actually exists

Two independent hash chains, both built on the same primitive (`src/modules/ledger/hash-chain.ts`):

| Chain | Table | Covers |
|---|---|---|
| Financial ledger | `ledger_entries` | Every budget allocation and disbursement (SJ-12/14) |
| Admin audit log | `audit_log` | Every staff/system action, including logins (SJ-13) |

Each row stores `prev_hash` (the previous row's `entry_hash`, or the literal string `GENESIS` for the
first) and `entry_hash` (`sha256(prev_hash + stable-json(payload))`). Appending a row means: read the
current last hash, compute the new row's hash from it and the new payload, insert both. Verifying a
chain means: walk it in creation order, recompute each row's hash from its stored payload and the
previous row's *actual* stored hash, and confirm every one matches.

## What this proves

**An entry edited after being written no longer matches its own hash.** Change one character in a
stored payload and `entry_hash` no longer reproduces from a recomputation — because the hash was
computed from the *original* payload before the edit. This was live-demonstrated once already, during
Phase 3: a budget allocation's ledger payload was edited directly at the SQLite level, bypassing the
running application, and `verifyLedgerChain()` correctly reported `intact: false` naming the exact row
and the reason.

**A row spliced out, or two rows reordered, breaks the link to whatever comes after.** Because each
row's `prev_hash` is the *actual* previous row's hash, not a sequence number, removing or reordering a
row means the next row's declared `prev_hash` no longer matches whatever now precedes it.

**Both properties hold independently for the financial ledger and the audit log**, and independently
of who or what wrote the row — `GET /api/v1/ledger/verify` (staff-only, backing `/admin/ledger`) and
`npm run ledger:audit` (no session, no server) call the exact same two functions
(`verifyLedgerChain()`, `verifyAuditChain()`), so neither can silently disagree with the other.

## What this does NOT prove

**It does not prove the first write was honest.** A hash chain proves *consistency after the fact*,
not truth at the moment of writing. A corrupt chairman posting a fraudulent allocation produces a
perfectly valid, perfectly chained entry — the chain proves nobody edited it *afterward*, not that the
number was ever real. Catching that is what SJ-16 (citizen flagging), SJ-17/18 (escalation), and
SJ-28's anomaly checks exist for — a different, complementary layer, not this one.

**It does not stop someone with direct database access from rewriting the whole chain.** SQLite has
one writer and no independent second ledger to cross-check against. An operator who can execute
arbitrary SQL against `data/accessai.db` can, in principle, recompute every hash from a fabricated
history and produce a chain that verifies as intact — because verification only checks *internal*
consistency, and a wholesale rewrite is internally consistent by construction. Real protection against
that threat needs something this pilot deliberately does not build: an append-only external log
(write-once storage, a separate service the application has no delete/update credential for, or a
periodically-published Merkle root anchored somewhere outside this database entirely). The BRD's own
framing for a pilot was "simulated blockchain... hash-chain simulation only" — this meets that bar,
not a heavier one, and this document exists so nobody mistakes which bar was met.

**It is not resistant to a compromised single writer mid-session.** Two concurrent appends could both
read the same "last hash" and race; a unique index on `prev_hash` in both tables turns that into a
loud insert failure rather than a silently forked chain, which is an acceptable trade at this write
volume (a union posts a handful of allocations a month) and not a substitute for a serialised writer
or a queue at real multi-union scale.

## A defect this approach actually caught

Formalising this — specifically, writing an audit tool that calls the real verification functions
under real, repeated use — surfaced a genuine pre-existing bug, not a hypothetical one. `recordAudit()`
found the "last hash to extend from" by taking the single most recent `audit_log` row, full stop.
`auth.service.ts` had its own separate insert path for login/logout events that never computed a hash
at all. The instant a login became the most recent row, the next `recordAudit()` call fell back to
`GENESIS`, collided with the unique index against the actual first chained row, and every subsequent
audited action failed until the process restarted — silently limiting the audit chain to whatever
handful of rows happened to land between logins. Fixed in both directions: the lookup now skips
non-chained rows, and login/logout now go through the same chained write path as everything else. See
`docs/DEVIATIONS.md` §19 for the full account. The lesson generalises: a tamper-evidence mechanism is
only as strong as its actual write coverage, and the only way to find a coverage gap is to run the
real check against real, repeated traffic — not to read the code and assume it is complete.

## Re-keying, if `medicalConditions` encryption (SJ-44) is ever extended to more fields

Not applicable to the hash chain itself — this section is here because both are "cryptographic
guarantees this codebase makes," and a reader formalising one should know the other exists. See
`docs/DEVIATIONS.md` §19 and `docs/COMPLIANCE.md` for what field-level encryption covers today and
what it deliberately does not yet.

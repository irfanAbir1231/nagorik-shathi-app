# Knowledge base and data pipeline

**This document is authored, not derived.** PRD v3.0 numbers its sections 1→100 and then jumps
straight to "118. Production Deployment Strategy". Sections **101–117 — Part 7, Knowledge Base &
Data Pipeline — do not exist in the source document.**

That gap is not incidental. It is the part that decides whether anything the platform tells a
citizen is true. A recommendation engine on top of an unspecified corpus is a machine for producing
confident wrong answers, and the rest of the PRD leans on Part 7 constantly: §26 assumes indexed
documents, §32 scores confidence from `verification_status`, §33 forbids unsupported claims, §34
requires a correction path, §111 is cited for staleness, and §64 exposes reindex and
rebuild-embeddings as admin actions.

So the model below was designed to satisfy those dependencies. **Everything here is implemented and
running** — the schema, the workflow, the enforcement, and the jobs. What it is stocked with is
sample data, which is the honest part.

---

## 1. Trust states

`verification_status` on `opportunities`, `organizations`, `documents`, and `service_locations`:

| State | Meaning | Confidence ceiling |
|---|---|---|
| `unverified_sample` | Authored or imported; **nobody has checked it against a source** | **65%** |
| `pending_review` | Submitted for verification, or content changed since it was verified | 75% |
| `verified` | An administrator confirmed it against the cited source, on a date | 100% (no effective ceiling) |
| `outdated` | Was verified; has aged past its review interval | 45% |
| `disputed` | A citizen or reviewer contests it; still shown, visibly flagged | 25% |

`unverified_sample` is the load-bearing state. Without it there are only two options — pretend
authored content is verified, or show nothing — and both are worse. It gives the corpus a truthful
default, and the ceiling means the arithmetic itself refuses to overstate.

**Where the state surfaces:** a chip on every card and detail page, a banner on the opportunities
list, the confidence breakdown in chat, the ranking score, and the admin corpus counts. It cannot be
read from the database without also being visible to the citizen.

---

## 2. Provenance

Every knowledge record carries, in its own row:

| Field | Purpose |
|---|---|
| `sourceUrl` | Where a citizen — or a reviewer — reads the original |
| `sourceNote` | What the author actually relied on, in prose |
| `lastVerifiedAt` | The date the claim was true |
| `verifiedBy` | The named person who asserted it |
| `reviewIntervalDays` | How fast this kind of fact goes stale (default 180) |
| `version` | Incremented on every content change |

`documents` additionally carries `sourceType` (`circular \| gazette \| web_page \| pdf \| form \|
faq \| manual_entry`), `publisher`, `publishedAt`, `retrievedAt`, `checksum`, `licenseNote`,
`stale`, and `deadLink`.

Provenance lives **inline, not in a side table.** Every read path needs it, and a join that can be
forgotten is a join that will be forgotten — the one screen where someone forgets it is the screen
that shows unverified data as fact.

### Licensing

Bangladeshi government circulars are not uniformly licensed for redistribution, so `licenseNote`
records the position per document, and the corpus holds **original summaries rather than
reproductions**. `sourceUrl` sends the citizen to the authoritative text. This is a legal constraint
the PRD never addresses, and shipping verbatim circular text without it would be a real liability.

---

## 3. Ingestion

Four routes in, all landing in the same state machine:

```
  ①  Admin authoring        POST /api/v1/admin/programs
  ②  Bulk seed              npm run db:seed  (validated corpus)
  ③  Citizen correction     POST /api/v1/feedback → moderation queue
  ④  Fetcher (not built)    a source URL → documents row → chunks
                            §7 explains why this one is deliberately last
      ↓
  status: draft   +   verification_status: unverified_sample   +   version: 1
      ↓
  indexed for retrieval (chunked, term frequencies computed, vectors if keyed)
      ↓
  pending_review  →  administrator decision  →  verified | rejected
```

**A record is never born verified.** `POST /admin/programs` hard-codes `status: 'draft'`,
`verificationStatus: 'unverified_sample'`, `lastVerifiedAt: null`, `version: 1`, ignoring whatever
the caller asked for. Self-certification at creation would make the whole gate decorative.

### Indexing happens with the write, not later

`indexOpportunity()` runs on create and on every content change: it deletes the old document and
chunks, rebuilds bilingual text (title, summary, description, benefits, application steps in both
languages), chunks it, computes per-chunk term frequencies for BM25, and stores metadata for
pre-filtering.

It is coupled to the write on purpose. A programme whose text has changed but whose index has not
will be *retrieved* for the old wording and *cited* with the new — an answer that silently disagrees
with its own source. That is the hardest class of error to notice from the outside.

---

## 4. Separation of duties

| Action | Moderator | Administrator |
|---|---|---|
| View corpus, rules, AI logs, moderation queue | ✅ | ✅ |
| Create / edit a programme or organisation | ✅ | ✅ |
| Publish a rule version | ✅ | ✅ |
| Triage citizen feedback | ✅ | ✅ |
| **Mark a record `verified`** | ❌ | ✅ |
| **Approve a knowledge change** | ❌ | ✅ |
| Archive a programme | ❌ | ✅ |
| Change a user's role | ❌ | ✅ |

Two rules make this more than a table:

**Verify and edit cannot be the same request.** `PATCH /admin/programs/:id` with
`verificationStatus: 'verified'` **and** any content field returns 422:

> *Verify in a separate step: save your content changes first, then mark the record verified.*

Otherwise an author could rewrite a benefit amount and certify it in one call, and the audit log
would record a verification of content nobody independently read.

**A content change revokes verification.** Editing any of `title`, `summary`, `description`,
`benefits`, `benefitAmount`, `applicationProcess`, `deadline`, or `coverageDistricts` on a `verified`
record bumps `version`, sets `verificationStatus: 'pending_review'`, clears `lastVerifiedAt`, and
re-indexes. Verification attaches to a *version*, not to a row.

Every one of these writes an `audit_log` row with actor, role, action, entity, before, and after.

---

## 5. Rules are versioned, never edited

`POST /admin/rules` inserts a **new version** and deactivates the previous one. A stored
`eligibility_evaluations` row holds both a `profileSnapshot` and a `ruleVersion`, so a decision shown
to a citizen in March is still replayable in June after both their income and the rule have changed.
An unreproducible benefits decision is not a defensible one.

Before saving, the rule is structurally validated and then **smoke-tested** against three synthetic
profiles — empty, broadly-eligible, deliberately mismatched — and warns about the failure modes that
make a rule useless in practice:

- a profile matching every common condition still fails → some condition cannot be satisfied
- a deliberately mismatched profile qualifies → the rule is too permissive to mean anything
- an empty profile yields a verdict instead of `unknown` → `requiredFields` is wrong
- no `requiredFields` declared → the programme will never ask the citizen a question
- fields tested but not declared required → the system tests what it never asks about

These are warnings, not blocks: an author may legitimately publish something narrow. They should
just know before citizens do.

---

## 6. Staleness

`detect_staleness`, runnable from **Admin → Jobs** or by any scheduler:

1. A `verified` record whose `lastVerifiedAt` is older than its `reviewIntervalDays` becomes
   `outdated` — which drops its confidence ceiling to 45% and shows a chip.
2. An `open` programme past its `deadline` becomes `closed`.
3. A document retrieved more than **180 days** ago is flagged `stale`.

Nothing is deleted and nothing is hidden. An outdated record with a source link is still more useful
to a citizen than a blank screen — it just must not claim to be current.

The other four jobs: `reindex_search` (after text edits), `rebuild_embeddings` (no-ops honestly with
no provider), `scheduled_notifications` (7-day deadline reminders), `aggregate_analytics`.

---

## 7. What is *not* built, and why

**An automated source fetcher.** Deliberate. A crawler that pulls a circular PDF, extracts a
threshold, and writes it into a live corpus is one parsing error away from telling a widow she
qualifies for an allowance she does not. The safe order is: fetch → store as `documents` with a
checksum → diff against the last version → **queue for human review** → publish. The queue, the
checksum, the versioning, and the review UI all exist; the fetcher is the piece that must not be
added casually.

**Verified data.** The 42 programmes are structured after real Bangladeshi programmes administered
by real bodies — DSS, DWA, DAE, DYD, BMET, NLASO, SME Foundation, PKSF, BRAC, BLAST, and others —
but **the thresholds and amounts are representative, not verified against current circulars.** Every
record says so, in the database and on screen.

Replacing them needs no code: an administrator edits the record, fixes the numbers, cites the
circular, and marks it verified. The confidence ceiling lifts as a consequence — you can watch a
query go from 65% to 92% by verifying one row.

---

## 8. What the corpus contains

Validated at seed time by `validateSeedCorpus()`, which **fails the seed loudly** rather than
loading a partly-bilingual or structurally-invalid record.

| | Count |
|---|---|
| Programmes | 42 across all 11 PRD categories (welfare 10, education 7, health 7, livelihood 11, support 7) |
| Organisations | 24 real public bodies and NGOs |
| Eligibility rules | one active version per programme |
| Retrieval chunks | 158 bilingual |
| Service locations | 327 — 5 per district × 64, plus 7 named national institutions |
| Knowledge graph edges | 347 |
| Life events | 15, each with bn / en / Banglish keyword sets |

**Service locations are generated, and that is defensible:** Bangladesh really does have one Social
Services office, one Sadar hospital, one legal aid office, one agriculture office, and one youth
office per district, so the generated set gives correct national coverage. Addresses are structurally
honest (`Sadar, <District>`) and **no phone numbers are invented** — only real national helplines
(`16430` legal aid, `109` women's helpline, `16263` health, `16123` agriculture) are dialable.

The seed validator checks, per record: both languages present on every citizen-visible field, at
least one application step (no step → no action plan → a dead end in the tracker), a parseable rule
whose tested fields are declared, a known category and life events, valid district codes, and a
present `sourceNote`.

---

## 9. Open questions this raises

Carried into [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) — they need an institutional answer, not an
engineering one:

- **Who verifies?** A verification workflow needs a real reviewer with authority to assert that a
  government threshold is current. That is an operating-model decision.
- **What is the SLA on a disputed record?** A citizen disputing a benefit amount is a signal that
  something may be wrong for everyone. How long may `disputed` sit unresolved?
- **What is the redistribution position** on circular text, per ministry?
- **Is there an authoritative feed?** If any ministry publishes structured programme data, that
  replaces most of §3 and changes the verification burden entirely.

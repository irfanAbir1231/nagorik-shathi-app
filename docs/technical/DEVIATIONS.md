# Deviations

Every place this build departs from the PRD or the Bhorosha Design System, why, and what it would
take to close the gap. Ordered by how much it matters.

Where the two source documents conflicted, the resolution followed the stated hierarchy:
**PRD for product behaviour, Design System for anything the citizen sees.**

---

## 1. PostgreSQL + Redis → libSQL, no second service

**PRD §37** specifies PostgreSQL with pgvector, Redis, BullMQ, and a NestJS backend in a Turborepo
monorepo (§82).

**Built:** one Next.js app; Route Handlers as the API layer; libSQL (SQLite dialect) via Drizzle;
rate limiting and job bookkeeping in the primary database.

**Why:** the PRD stack cannot start without Docker, a database, and credentials, which means no
flow could have been verified before delivery. This was raised and confirmed with you before any
code was written.

**Containment.** Business logic is framework-free: services import no `Request`, no `Response`, and
nothing from `next/*`. Route handlers only parse, guard, and serialise.

```
src/app/api/v1/**/route.ts   ← adapter, replaceable
src/modules/**/*.service.ts  ← moves to a NestJS provider unchanged
src/lib/db/client.ts         ← the ONLY file that knows the SQL engine
```

**To close it:** swap `drizzle-orm/libsql` for `drizzle-orm/node-postgres` in `client.ts`, change
the column helpers in `schema.ts` (`integer timestamp_ms` → `timestamptz`, `text json` → `jsonb`),
point `drizzle.config.ts` at Postgres, and move `rateLimitBuckets` to Redis. The services and
routes do not change.

---

## 2. PRD Part 7 does not exist — the knowledge pipeline was authored

**The gap.** The source PRD numbers sections 1→100, then jumps to "118. Production Deployment
Strategy". Sections 101–117 — **Part 7, Knowledge Base & Data Pipeline** — are absent. The document
announces the omission itself. So there is no specification for: which programmes are in v1, the
source for each, who authors `rule_json`, who reviews it, the staleness policy, or the licensing
position on redistributing government circulars.

That is not a small gap. It is the part that determines whether anything the platform says is true.

**What was authored instead** — [docs/KNOWLEDGE-PIPELINE.md](KNOWLEDGE-PIPELINE.md), implemented as:

| Concern | Implementation |
|---|---|
| Trust states | `verification_status`: `unverified_sample` → `pending_review` → `verified`, plus `outdated` and `disputed` |
| Provenance | `source_url`, `source_note`, `last_verified_at`, `verified_by`, `review_interval_days` per record |
| Licensing | `documents.license_note` per source document |
| Review workflow | `knowledge_reviews`; nothing becomes `verified` without an administrator decision |
| Separation of duties | A moderator may triage; only an administrator may verify (enforced, tested) |
| Anti-self-certification | Verifying and editing in the same request is refused with 422 |
| Staleness | `detect_staleness` job flags verified records past their review interval as `outdated` and closes expired programmes |
| Versioning | Any content change bumps `version` and drops `verified` back to `pending_review` |
| Consequence | The confidence scorer caps `unverified_sample` at 65%; the UI badges it everywhere |

**The corpus is 42 authored programmes**, structured after real Bangladeshi programmes
administered by real bodies (DSS, DWA, DAE, BMET, NLASO, SME Foundation, BRAC, BLAST…), across all
11 PRD categories. **The thresholds and amounts are representative, not verified.** Replacing them
requires no code change — the admin portal owns the corpus.

---

## 3. pgvector → BM25, with vectors optional

**PRD §37** specifies pgvector; **§26** requires hybrid retrieval (semantic + keyword + metadata +
structured).

**Built:** metadata pre-filtering in SQL, then BM25 over pre-computed per-chunk term frequencies,
fused with cosine similarity over stored embeddings **when an embedding provider is configured**.
Scores are combined with Reciprocal Rank Fusion rather than a weighted sum, because BM25 and cosine
are on incomparable scales and any fixed weighting between them is arbitrary.

Without a key the semantic channel contributes **nothing** rather than being simulated, and
`retrieval.mode` reports `lexical only (BM25)` in the admin panel. The retriever returns an empty
result when neither channel scores anything, so the caller reports "no verified information"
instead of surfacing arbitrary rows.

Vectors live in a JSON column and cosine is computed in process — correct for hundreds of chunks,
and interface-identical to a pgvector swap.

---

## 4. The eligibility rule grammar was designed, not specified

**PRD §24** mandates that the engine must not use an LLM and says only *"Store rules as JSON"*, then
requires outputs including `Unknown` (§17) and reasoning for every decision (§18).

Those requirements need three things the PRD does not define, so they were designed:

1. **Three-valued logic.** A missing profile field yields `unknown`, never `false`. Treating absent
   data as failure would silently deny benefits — the exact harm §22 exists to prevent. `unknown`
   propagates: an `all` group with an unknown and no failure is `unknown`, not eligible.
2. **A hard bar still decides.** A man applying to a women-only programme is `not_eligible` even
   with income unrecorded, so the system does not ask him pointless questions.
3. **Explanation as data.** Every condition carries its citizen-facing reason for met, failed, and
   unknown, in both languages. The model never authors a reason; it re-voices what the engine
   emitted.

Also designed: soft conditions (fail → `partially_eligible`, never disqualifying), weights driving
both the ranking score and reason ordering, and rule **versioning** so a stored decision can be
replayed against the exact rule that produced it.

`tests/eligibility/engine.test.ts` — 28 assertions.

---

## 5. Prompt templates are `.ts`, not `.md`

**PRD §90** requires prompts to live outside services, be version-controlled, and be reviewable by
non-developers, illustrated with `.md` files.

**Built:** `src/prompts/index.ts` — plain template strings with a `version` field written to
`ai_logs.prompt_version` on every call. Chosen over `.md` because raw-text imports need bundler
configuration that would break the Edge runtime, and because a typed template cannot be rendered
with a missing variable. The substance (outside services, versioned, reviewable, traceable) holds.

---

## 6. Email + password + Google → phone + OTP + PIN

**PRD §59** specifies login, register, forgot password, email verification, and Google login.
**BDS §10.2.11** forbids requiring an email (*"a large share of target users do not have or
remember one — phone number is the identity"*), forbids strong-password rules, and specifies phone
+ OTP with a 4–6 digit PIN. **BDS §1.2 red line 11** bans CAPTCHA.

**Resolved as:** phone + OTP + PIN is the primary path (Design System wins on the interaction), and
`users.email` is retained as an **optional** column so the PRD's account model still works.
Google OAuth is not implemented — see [EXTERNAL.md](EXTERNAL.md).

Because a 4-digit PIN has only 10,000 combinations, brute force is contained by progressive delay
plus a **temporary, self-clearing 10-minute lock** — never a permanent lockout, which BDS §10.2.5
identifies as where low-confidence citizens abandon for good. The locked-out screen offers the OTP
route rather than a dead end.

---

## 7. Redis rate limiting → in-database token bucket

**PRD §48** specifies Redis. Implemented as a token bucket in `rate_limit_buckets` with the same
interface. A token bucket rather than a fixed window because a fixed window permits a full-quota
burst at each boundary — twice the intended rate. Separate quotas per scope: `auth` 10/min (the
brute-force surface), `ai` 20/min (the expensive one), `default` 120/min.

---

## 8. BullMQ workers → idempotent jobs, run on demand or by a scheduler

**PRD §45 / §119** specify BullMQ background workers.

Implemented as five idempotent functions, each recording a `job_runs` row, invocable from the admin
UI or over HTTP by any scheduler: `reindex_search`, `rebuild_embeddings`, `detect_staleness`,
`scheduled_notifications`, `aggregate_analytics`.

`rebuild_embeddings` **honestly no-ops** when no embedding provider is configured, recording
`{skipped: true, reason: "No embedding provider configured (set OPENAI_API_KEY)"}` rather than
reporting a fake success.

Two jobs also run inline where staleness would be visible to a citizen: opening the timeline
reconciles deadlines and creates due reminders, so the screen is never stale between job runs.

---

## 9. The rule editor is read-only in the UI

**PRD §Feature 20** lists "Update Rules"; **§77** lists "Rule Management".

`POST /api/v1/admin/rules` is fully implemented: it validates the grammar, refuses malformed
operators, publishes a new **version** rather than editing in place, deactivates the previous one,
and **smoke-tests** the rule against three synthetic profiles — empty, broadly-eligible, and
deliberately mismatched — returning warnings for the two failure modes that make a rule useless in
practice: one nobody can satisfy, and one everybody satisfies.

The **UI** for authoring is read-only: it shows each active rule, the fields it reads, and flags
fields that are tested but not declared required (so the system would never ask about them). A
free-text JSON editor was deliberately not shipped, because it would let an author save a rule that
parses but can never match anyone — which is what the smoke test exists to catch. A guided
condition builder is the right next step.

---

## 10. Design system erratum: `green.300` on `green.800` is 5.29:1, not 8.63:1

**BDS §3.3** states that `green.300` (`#74CCAD`) on `green.800` (`#084B39`) is **8.63:1** and calls
it *"the mandatory text/icon colour"* for the hero surface.

**The computed value is 5.29:1.** Verified independently:

| Foreground on `green.800` | Ratio | Verdict |
|---|---|---|
| `green.300` `#74CCAD` | **5.29:1** | AA only |
| `green.200` `#A8E1CB` | 6.89:1 | AA only |
| `green.100` `#D3F0E4` | **8.36:1** | AAA |
| `white` | 10.12:1 | AAA |

5.29:1 passes AA for normal text and clears the 3:1 threshold for icons, but **not** the
*"AAA contrast on all body text"* house rule the same document sets in its own header.

**Resolution — the pairing is split rather than the token changed:**
- `green.300` stays as `--bds-text-on-brand-deep` for small labels and icons on `surface.brand`.
- **Body copy on `surface.brand` uses `green.100`** (8.36:1), so the AAA rule holds.

Both bounds are asserted in `tests/tokens/contrast.test.ts`, including that `green.300` is
`< 7:1`, so a future author cannot promote it to body text believing the document's figure.

**This needs your decision** — see [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) Q1.

---

## 11. Argon2id → scrypt, permanently

**PRD §48 / §121** specify Argon2. An earlier build of this app used `@node-rs/argon2` when present,
falling back to scrypt from Node core (N=2^15, ~32 MB per hash) only when absent. That fallback is
now the only path: Argon2's cost comes from native code, and this app's deployment target
(Cloudflare Workers) cannot execute native code at all — not a missing prebuilt binary, but no
ability to run compiled code in the isolate, full stop. A credential hashed with Argon2 on any other
host would permanently fail to verify once the app runs on Workers, so keeping the Argon2 path meant
local dev and production could silently drift onto incompatible hash formats. scrypt is equally
memory-hard and needs no native module, so it runs identically everywhere this app does.

---

## 12. Interactive map → OpenStreetMap, no key, list still primary

**PRD §70** describes an interactive Mapbox/Google map. This now exists, on **OpenStreetMap**
rather than a commercial provider, and needs no account or key — the map works on a fresh clone.
`NEXT_PUBLIC_MAP_PROVIDER` defaults to `osm`; `none` restores the previous key-less list.

**The list remains the primary surface.** Every place on the map is in the list below it with its
address, phone number and directions link, and nothing is reachable only by pin. A citizen who
cannot see, cannot drag, or has images blocked loses the picture and nothing else.

**No map library.** Leaflet plus its stylesheet is ~45 KB gzipped before a tile loads, on a screen
whose whole point is a cheap Android phone on 2G (BDS §4.7). `lib/geo/mercator.ts` +
`components/nearby/MapView.tsx` is about 400 lines, adds no dependency, and — the deciding factor —
was easier to make keyboard-operable than a third-party canvas is to retrofit. Arrow keys pan, `+`/`−`
zoom, `Home` re-frames, every pin is a real focusable `<button>` whose accessible name carries the
type and distance, and each marker has a letter glyph as well as a tint (BDS §2.2 rule 4).

**Tiles are proxied** through `/api/v1/map/tile/{z}/{x}/{y}` rather than fetched by the browser.
Four reasons, none interchangeable: OSM's Tile Usage Policy requires an identifying `User-Agent`
that an `<img>` cannot send; the CSP stays at `img-src 'self'`; the tile host never receives the IP
of someone looking up a legal-aid office or a hospital; and the provider becomes swappable via
`MAP_TILE_URL` without touching the client.

**Distances are now measured from the citizen's actual position** when they share it. The screen
previously took a GPS fix, snapped it to the nearest district town and discarded the coordinates —
so someone standing outside a hospital was told it was 11 km away, that being the distance from
their district's centroid. The fix is kept, travels in the URL so a reload does not silently revert,
and the note under the list names its reference point: "measured from where you are" versus "from
the centre of the district town". Straight-line, and it says so.

---

## 12a. Real places from OpenStreetMap, kept separate from the sample corpus

Nearby Services now shows **two kinds of record and never blurs them**:

| | Seeded corpus | OpenStreetMap |
|---|---|---|
| Coverage | All 64 districts, 5 per district | Thorough in cities, thin in rural upazilas |
| Addresses | Structurally honest, **invented** | Real |
| Phone numbers | None invented; real helplines only | Real where a contributor added one |
| Administrative tier | Union / upazila / district | Not recorded — see below |
| Badge | "Sample record" | "OpenStreetMap — real location" |
| `verificationStatus` | The enum | **`null`** |

`verificationStatus` is deliberately null for OSM rows rather than `unverified_sample`. That value
means "authored sample data we invented"; applying it to a genuine hospital would be a false
statement in the other direction. The two are labelled distinctly because merging them would let
invented addresses borrow the credibility of real ones.

Real types retrieved: **police stations, hospitals, clinics, courts, pharmacies, banks, post
offices, fire stations, colleges, NGO offices and government offices.**

Three tag mappings were refused, and the refusals matter more than the mappings:

- **`office=lawyer` is not `legal_aid`.** It is a private practice that charges fees. Mapping it
  would send someone who cannot afford a lawyer to a lawyer. Legal aid stays with the seeded records
  and the real `16430` helpline.
- **`office=government` does not get an administrative tier.** Union, upazila and district offices
  are different things and the tier decides which forms can be filed where. OSM does not record it,
  so those rows use an untiered `government_office` type instead of a guess that would put a citizen
  in the wrong queue.
- **`agriculture_office` and `digital_center` have no OSM equivalent** and are left unmapped. Those
  filters show seeded records only, which is honest.

Two display decisions came out of live data rather than theory. Central Dhaka returns **5,240 real
places within 25 km, 36 of them banks against 6 hospitals** — ordered by distance alone the banks
bury the hospitals, so each category is capped at 6 while no type filter is applied, and the cap
lifts when the citizen picks a type. And the count says what is *shown* against what *exists*
("the nearest 55 are shown"), because a silently trimmed list reads as a complete one.

Overpass results are cached in `osm_place_cache`, keyed by a ~5.5 km grid cell so two citizens in
one town share a lookup. A cold query takes ~20 s; a cached one ~0.5 s. `npm run osm:clear` empties
it, which is needed after changing normalisation because the cache stores post-normalisation shapes.

**Overpass and OSM tiles are volunteer-run and rate-limited.** Point `OVERPASS_URL` and
`MAP_TILE_URL` at your own instance or a paid provider before real traffic, and set
`MAP_USER_AGENT` to something contactable — see [EXTERNAL.md](EXTERNAL.md). A failure on either is
never fatal: the seeded list is the primary surface, and the screen says the real places are
missing rather than showing an error.

---

## 13. Voice OTP is offered but disabled

**BDS §10.2.5** requires a voice-OTP fallback as the accessible-authentication path. The button is
present, **disabled with a visible reason** ("this needs a telephony service"), rather than absent
or silently non-functional. Requires a voice provider — see [EXTERNAL.md](EXTERNAL.md).

---

## 13a. Transcription accepts one class of unauthenticated request

`POST /api/v1/voice/transcribe` normally requires a session. It also accepts a clip **with no
session** when the form carries a `phone` that has a **live, unconsumed OTP challenge**
(`hasLiveOtpChallenge` in `auth.service.ts`).

This exists because of a circularity. Speaking the six-digit code is the accessible-authentication
route **BDS §10.2.5** requires, and server transcription is the only speech path that works in
Firefox or under `VOICE_MODE=server` — so requiring a session made the microphone dead on the one
screen where nobody has one. A citizen who cannot read six boxes then could not sign in at all.

Why this boundary is defensible:

- Walking through the door costs a real Bangladeshi mobile number, a successful SMS send, and the
  per-number resend cooldown — all already rate-limited. An open endpoint costs nothing and bills
  per minute of audio.
- The clip is still capped at 2 MB, still IP-rate-limited on the `voice` bucket (anonymous callers
  key by IP, so rotating phone numbers buys no extra budget), and still never stored.
- It grants nothing. `verifyOtp` remains the only thing that can turn a code into a session. This
  path does not consume an attempt and does not reveal whether the code was right.
- Purpose and attempt count are deliberately *not* part of the predicate — the caller is a
  microphone button, and a citizen who has already mistyped the code three times is precisely the
  one who needs to speak it.

**If the OTP flow gains a client-held challenge token, switch to it** — that would remove the need to
send a phone number with the audio at all.

---

## 13b. Voice does not touch the PIN

Dictation is wired into the phone-number and OTP fields (`DictateDigits`) and deliberately **not**
into the PIN or PIN-confirmation fields. A PIN is a reusable secret; a code is single-use and expires
in minutes. This audience uses phones in shared rooms, markets, and government office queues, so
inviting someone to say their PIN aloud would hand it to whoever is standing there — and unlike a
misheard digit, that is a harm the app cannot undo.

Spoken digits also never auto-submit, unlike typing the sixth digit into `OtpInput`. A challenge
allows only a few attempts, and spending one on a mishearing the citizen never saw is how voice locks
someone out of their own account.

---

## 14. "Similar User Success" ranking factor returns neutral

**PRD §31** allocates 10% of the ranking score to "Similar User Success". That requires historical
outcome data this prototype has not accumulated. The component returns a **neutral 50** and reports
`similarUserDataAvailable: false` rather than inventing a success rate — fabricating one would be
exactly the unsupported claim §33 forbids. The other five factors carry their specified weights.

---

## 15. Smaller notes

- **Bangla month names and grouping are hand-written**, not from `Intl`. `Intl.DateTimeFormat('bn-BD')`
  and `NumberFormat('bn-BD')` emit Bengali digits in most runtimes, which would defeat the
  Latin-digit default (BDS §4.3) and make the numeral toggle unable to control its own output.
- **Service locations are generated** from the district table (5 per district × 64 + 7 named
  national institutions = 327). Bangladesh genuinely has one Social Services office, one Sadar
  hospital, one legal aid office, one agriculture office and one youth office per district, so this
  gives correct national coverage. Street addresses are structurally honest ("Sadar, <District>")
  and **no phone numbers are invented** — only real national helplines appear.
- **Bangla stemming is deliberately shallow.** A short suffix list, not a full stemmer. Aggressive
  stemming on conjuncts produces false matches, and a citizen acting on the wrong programme wastes
  a trip to a government office.
- **`next` has an open advisory with no patched release** in any channel (its suggested "fix" is
  v9.3.3). Pinned to the newest 15.x (15.5.22). `drizzle-orm`, `next-intl`, and their transitive
  `postcss` were upgraded to patched majors.
- **Uploads** (PRD §Feature 8 / §63) are not implemented. The word "upload" is banned by BDS §12.3
  in favour of a camera capture flow; the schema, `documents` table, and admin indexing path exist,
  but no capture UI or object-storage writer was built.
- **Streaming chat responses** (PRD §92 Sprint 2) are not implemented; responses arrive whole. The
  waiting state escalates at 8 s to the reassurance line BDS §10.1.5 requires.

## 16. Shebar Janala Phases 0–2: identity, residency, and issue reporting

Not a deviation from AccessAI's own PRD — none of this is in it. A separate, older civic-transparency
specification ("Shebar Janala," a Union Parishad issue-reporting and budget-transparency platform)
was audited against this codebase and found to share no code with it. This section is Phase 0 of
that audit's own roadmap ("stop any external claim that AccessAI already carries forward Shebar
Janala's capabilities") and the honest record of Phases 1–2, built the same way everything else in
this file is: real where it says real, simulated where it says simulated.

**Phase 0 — the record.** Nothing in this codebase, before this change, implemented NID/KYC
verification, a blockchain or hash-chain ledger, corruption-flagging, or citizen issue-reporting.
Anything describing AccessAI as having those capabilities was describing a different product. This
paragraph is that correction, kept in-repo rather than only in an external audit document.

**Phase 1 — verified identity & place.**
- **NID verification is simulated**, the same pattern as `SMS_PROVIDER`: `NID_PROVIDER` unset means a
  National ID number is format-checked (10, 13, or 17 digits) and hashed
  (`modules/identity/nid.service.ts`), and the result is labelled `simulated_verified` — never
  `verified`. Naming a provider without an implementation throws rather than pretending to check one.
- **Union/ward geofencing is a real point-in-polygon test** (`modules/identity/geofence.ts`) against
  an authored sample corpus of four union boundaries (`lib/db/seed/unions.ts`) — hand-drawn ~1 km
  squares around real district towns, not surveyed geometry. `unionBoundaries.verificationStatus`
  reuses the knowledge base's `unverified_sample` vocabulary for exactly the reason it exists there:
  an invented boundary must not look like a surveyed one. A citizen whose GPS fix lands outside every
  seeded union (i.e. almost everyone, at this corpus size) falls back to picking their union from a
  list, recorded as `manual_attestation` rather than `gps_geofence` — a real, disclosed difference in
  evidence strength, not two paths presented as equivalent.
- No PostGIS. The point-in-polygon test is a plain ray-cast over a handful of authored polygons —
  appropriate at this scale, not at national scale. A real corpus of thousands of union boundaries
  would need a spatial index, the same way `modules/places/overpass.ts` needed a grid cache once real
  OSM volume existed.

**Phase 2 — citizen voice ("Amar Union, Amar Sheba").**
- **Issue photos have no object-storage writer**, the same gap PRD Feature 8 already left open in
  AccessAI's own scope (§15 above). Rather than block reporting on it, `modules/issues/photo-storage.ts`
  writes to `public/uploads/issues/<uuid>.<ext>` and serves it statically — zero-config, matching the
  single-file-database ethos, but with two real costs a production deployment must not inherit
  unexamined: an uploaded photo is reachable by anyone with its (unguessable) URL, and nothing here
  virus-scans it. An S3/R2-backed writer behind the same interface is the natural next step.
- **Keyword moderation is a short, illustrative list** (`modules/issues/moderation.ts`), not a
  maintained lexicon — it flags a report for closer human review, and never auto-rejects one. Every
  report reaches a moderator regardless; the flag is a priority signal, not a verdict.
- **The issue state machine is enforced, not just documented**
  (`modules/issues/state-machine.ts`): `transitionIssueStatus` refuses any move the map does not
  list. Approving `under_review → verified/rejected` happens in `/admin/moderation`, alongside every
  other content decision; every other transition (`verified → in_progress → completed`, and
  `→ archived` from any resolved state) is a staff-only action on the issue's own page, matching the
  source spec's "officials update issue status with evidence."
- **Escalation to an Upazila/Zila officer is not built.** Those roles do not exist in `USER_ROLES` —
  extending the role hierarchy is Phase 3 of the same roadmap, and flag-ratio thresholds and a budget
  ledger are Phase 3 work this phase deliberately does not anticipate.
- **Viewing and voting are scoped to the citizen's own verified union**, never a union id supplied by
  the request — resolved from `userProfiles.residencyUnionId`, set only by Phase 1. A citizen with no
  verified residency sees a plain "verify your union first" state, not an empty feed that looks like
  a bug.

## 17. Shebar Janala Phase 3: ledger & accountability — and where "blockchain" actually is

**What "blockchain" means in this codebase, precisely.** `modules/ledger/hash-chain.ts` implements a
hash chain — every row folds the previous row's hash into its own, so an entry silently edited after
the fact stops matching its own hash, and a row spliced out or reordered breaks the link to whatever
comes after it. This is real, tested, and live-demonstrated (below) — but it is **one writer, one
SQLite database**, not a distributed ledger. It detects tampering after the fact; it cannot stop an
operator with direct database access from rewriting the entire chain and recomputing every hash, the
way no purely software hash-chain running on infrastructure that operator controls ever can. That is
also exactly the limit the source BRD itself accepted for a pilot ("simulated blockchain... hash-chain
simulation only," §5/§8 of the original BRD) — this build meets that bar, not a heavier one, and says
so rather than letting "hash-chain" imply more than it does.

**Two independent chains, deliberately not one.** SJ-13 asked to upgrade `audit_log` (every staff
action); SJ-14 asked for a dedicated ledger for financial records (budget allocations and
disbursements, per the BRD's ERD). Both use the same `modules/ledger/hash-chain.ts` primitive, but
they are separate sequences in separate tables — an altered financial record and an altered staff
action are detected independently, and `GET /api/v1/ledger/verify` (staff-only; `/admin/ledger` in
the UI) reports on both. This was live-verified, not just unit-tested: a budget allocation's ledger
entry was edited directly at the SQLite level — bypassing the running application entirely — and
`verify` correctly reported `intact: false` with the exact row id and the reason ("no longer matches
its own hash"). Restored afterwards; nothing about that test is left in the demo data.

**Single-writer race, accepted not hidden.** Both `appendLedgerEntry` and `recordAudit` read the
chain's last hash, then write a new row referencing it, in two separate statements. Two concurrent
appends could both read the same "last" hash and race. The unique index on `prev_hash` (both tables)
turns that race into a loud insert failure rather than a silently forked chain — acceptable at this
write volume (a union posts a handful of allocations a month), not a substitute for a serialised
writer or a queue at real multi-union scale.

**Pre-migration rows are honestly outside the chain.** `audit_log` rows written before this migration
have a null `prev_hash`/`entry_hash` and are skipped by `verifyChain`, not treated as broken — they
are unhashed history, not tampered evidence. The chain begins at the first row written after Phase 3
shipped.

**Civic roles are a second axis, not a rank.** SJ-31–34 could have been folded into the existing
`ROLE_RANK` ladder the way `administrator`/`moderator` already work, but a Zila officer is not
"senior enough" to post a budget allocation for a union they do not chair — civic authority is about
holding a specific title for a specific place, not outranking someone. `modules/civic/roles.ts`
checks title-and-place together for every action; `CIVIC_ROLE_RANK` exists only for display ordering
and is never used to authorise anything (see its own tests).

**SJ-15/BR-2 is a real status check, and it could not be built by repurposing the eligibility
engine.** `modules/eligibility/engine.ts` answers "what could I newly qualify for" against a
self-described profile and sample programme rules. `modules/entitlements/entitlement.service.ts`
answers "what am I already enrolled in, and what has been paid" against a `beneficiaries` record an
authorised official actually created, matched by the citizen's own NID hash from Phase 1. Neither
module imports the other; they are answering different questions with different data, on purpose.

**Escalation triggers once, not on every subsequent flag** — `ESCALATION_MIN_FLAGS` (2) and
`ESCALATION_THRESHOLD_RATIO` (50%, the BRD's own example) are enforced together
(`modules/budget/escalation-rules.ts`) so a union with a single verified resident cannot escalate on
that one person's first flag — a ratio doing the work a headcount should. Once escalated, the
`escalations` row is unique per allocation; a rising ratio afterwards does not re-notify. If no
`upazila_officer` is assigned to the union's upazila yet, the escalation is still recorded with a
null officer rather than silently dropped — visible under "Unassigned" to any upazila officer, and to
an administrator via `/admin/civic-roles`, as a real gap someone can close by making an assignment,
not a notification that quietly went nowhere.

**Not built in Phase 3, by the roadmap's own design:** automatic complaint-routing to a Zila officer
(SJ-11's second half — the source roadmap defers this explicitly to Phase 3's own successor); a
public-facing transparency surface for the ledger (SJ-37, Phase 4); Zila-officer rollup dashboards
(SJ-29, Phase 4). The Zila officer civic role exists and can be assigned today; it has no dedicated
screen yet, on purpose.
- **PWA / push notifications** are not implemented. Notifications are persisted and shown in-app.

## 18. Shebar Janala Phase 4: oversight portals

**Donor is not a fifth civic role.** SJ-25's chairman/officer titles fit `CIVIC_ROLES` because they are
places in a governmental hierarchy with real authority over a union/upazila/district. A donor
organisation (SJ-27) has none of that — funding a programme confers no authority over any union — so
folding it into `CIVIC_ROLE_RANK` would have implied a seniority relationship that does not exist.
Instead `users.donor_org_id` is its own nullable FK, and `donor_funding_scopes` records exactly which
programme codes a donor org funds. The Donor Portal's scoping is enforced the same way civic scoping
is: every query in `getDonorPortalData` filters to the org's actual funding scopes, never the whole
ledger — a donor funding only "Widow Allowance" cannot see numbers for any other programme, live-
verified by creating a donor org scoped to one programme and confirming the portal shows exactly that
programme's real beneficiary/disbursement counts and nothing else.

**SJ-29's rollup is the SAME code as SJ-25's single-union view, not a second implementation.**
`getLeaderPortalData` takes an `OversightScope` (`union` | `upazila` | `district`), resolves it to a
list of union ids first, and every subsequent query is `WHERE union_id IN (...)`. A chairman's scope
resolves to one id; an officer's resolves to every union in their upazila/district. This was a
genuine gap in the existing seed data: all four Phase 1 unions were seeded in four *different*
upazilas, so no upazila officer's rollup had more than one union to aggregate — a rollup that always
degenerates to the single-union case proves nothing. A fifth union (Mominpur, same upazila as
Kaligonj) was added specifically so the Rangpur Sadar officer's `/leader` view has two unions' worth of
allocations and issues to combine, live-verified to return the sum of both.

**SJ-28's anomaly checks are deterministic, not ML — the same line the eligibility engine and the
issue-text keyword filter already draw.** `modules/oversight/anomaly.ts` is four fixed, explainable
rules: an allocation far above its union's own median (needs at least two other allocations in that
union to compare against — with fewer, it says nothing rather than inventing a signal from one data
point); the same NID active in the same programme across two unions; a disbursement exceeding its
entitlement's stated amount (exact, not statistical); and a pending escalation stale for two weeks.
Every one can be explained to the person it flags in one sentence and checked by hand — the same bar
`docs/DEVIATIONS.md` §14 already set for why ranking factors here stay deterministic when they return
"neutral" rather than guess.

**SJ-37's public transparency page is a genuinely separate surface, not the admin dashboard reused.**
It lives at `[locale]/transparency`, *outside* the `(app)` route group entirely, so it never passes
through the staff-only layout or session guard — anyone, including someone with no AccessAI account,
can load it. `getPublicTransparencyData()` was written by deciding what is safe to publish BEFORE
writing the query, not by filtering an existing internal query after the fact: union names, allocation
totals/counts/flag-counts/escalation-counts (aggregate), programme-level active-beneficiary counts and
total paid amounts (aggregate, no beneficiary identity), a live re-run of the SJ-13 ledger integrity
check, and elected officials' names. That last one is deliberate, not an oversight — a union chairman
is a public official whose name being attached to the budget they posted is the entire point of
transparency, unlike a citizen who flagged an allocation or reported an issue, whose identity never
appears here even in aggregate form.

## 19. Shebar Janala Phase 5: reach & defense

**SMS now has three real provider implementations, not a stub.** `modules/notifications/sms.service.ts`
implements the exact three shapes `docs/EXTERNAL.md` already documented — SSL Wireless's JSON API,
BulkSMSBD's query-string API, and Twilio's REST API — replacing `auth.service.ts`'s
"not implemented in this build" throw with a real dispatch. None of them were exercised against a live
account in this environment (no real credentials exist here), so what was actually verified is: the
unconfigured path still throws the same honest, unchanged error it always did, and each provider
function is a real HTTP call shaped exactly to that vendor's documented contract — not a mock, and not
newly untested plumbing sitting behind a name nobody will ever call.

**USSD is new ground — this codebase invented the callback contract rather than copying a documented
one, because no BD aggregator's exact shape was already in `docs/EXTERNAL.md`.**
`POST /api/v1/ussd/callback` uses the near-universal `{sessionId, phoneNumber, text}` request /
`CON`/`END`-prefixed plain-text response shape (Africa's Talking's own field names, which most
aggregators' USSD gateways mirror closely). A real BD aggregator contract may differ in field names or
use form-encoding instead of JSON — adapting this route to the actual vendor is integration work, the
same category of task as pointing `STT_BASE_URL` at a real speech vendor, not a redesign. Authenticated
by a shared secret (`USSD_GATEWAY_SECRET`) rather than a session, since the caller is a telecom
aggregator's server. Live-verified end to end against real seeded data with no browser involved:
dialing in, checking a real beneficiary's entitlement status by NID, and filing a real issue report
that then appeared in the citizen's own "my reports" list and in the staff moderation queue —
genuinely exercising SJ-23/48's "a citizen without a smartphone" exit criterion, not simulated.

**Issue reporting via USSD is scoped exactly as tightly as the web path, which cost it its scope.**
The reporter and their union both come from an ALREADY residency-verified account matched by the
caller's own phone number — supplied by the telecom network in the callback, never typed by the
caller, which is *stronger* provenance than a web form field. A phone not linked to a verified account
is told so honestly and pointed at the real verification flow, rather than being allowed to file into
an invented or guessed union. The consequence: a citizen with no AccessAI account at all cannot report
an issue by USSD, only check a benefit status by NID (which needs no account). Registering an account
by USSD itself was out of scope for this pass — PIN setup and OTP delivery do not map cleanly onto a
USSD session's constraints, and a real solution deserves its own design rather than a rushed one bolted
onto this callback.

**SJ-19's ghost-beneficiary check is a real, checkable signal, not a fraud verdict.**
`detectUnverifiedBeneficiaryIdentity` flags a beneficiary whose NID hash has never been confirmed by
anyone going through actual NID verification (`modules/identity/nid.service.ts`). This does not prove
fraud — a genuine beneficiary may simply not have an AccessAI account yet — and is surfaced as an
alert for a human to follow up on, never acted on automatically. The BRD's own framing ("needs real
disbursement volume") is honestly reflected: with a handful of seed rows, these checks mostly find
nothing, correctly, because there is not yet enough data for "far above normal" to mean anything — the
mechanism is real and tested; what it needs to become *useful* is the volume this pilot does not have.

**SJ-21's vision moderation makes a real vision-model call when configured, and honestly refuses to
guess when it is not — it does not fall back to a local heuristic pretending to be one.**
`modules/issues/vision-moderation.ts` calls an OpenAI-compatible `/chat/completions` endpoint with an
image content part (`VISION_MODERATION_API_KEY`/`_BASE_URL`/`_MODEL`, the same seam pattern as
STT/TTS). Unconfigured — the state of this environment — every photo is marked `unavailable` and
auto-flagged for manual review, live-verified: an issue submitted with a real photo came back
`autoFlagged: true`, `visionModerationStatus: "unavailable"`, and appeared in the staff moderation
queue exactly as an un-checked photo should. What was deliberately NOT built is a deterministic
stand-in for NSFW/violence detection (e.g. a perceptual-hash duplicate check) — a fabricated pass/fail
from a technique that cannot actually assess image content would be worse than the honest "not
checked" this defaults to.

**SJ-41's audit tool calls the SAME verification functions the in-app page calls, on purpose — and
that choice is what caught a real bug.** `scripts/ledger-audit.ts` imports `verifyLedgerChain()` and
`verifyAuditChain()` directly rather than re-deriving the hash logic itself, specifically so the
script and the `/admin/ledger` page can never silently disagree. Running it while building this phase
surfaced a genuine, pre-existing defect: `recordAudit()`'s "find the last hash to extend from" query
took the single most recent `audit_log` row regardless of whether it was hash-chained, but
`auth.service.ts` had its own separate, non-chained insert path for `auth.login`/`auth.logout`/etc. —
by far the highest-volume action in the table. The instant a login became the most recent row,
`recordAudit()` fell back to `GENESIS`, collided with the unique index on `prev_hash` against the
actual first chained row, and every subsequent audited admin action failed outright until the process
restarted. Fixed two ways: the lookup now filters to `entry_hash IS NOT NULL`, and `auth.service.ts`'s
`audit()` now calls the same `recordAudit()` everything else does, so login/logout are finally inside
the chain instead of a silent, permanently-uncovered gap in SJ-13's own coverage. See
`docs/LEDGER-INTEGRITY.md` for what the chain proves and how to check it yourself.

**SJ-42's compliance review is a self-assessment, deliberately not a certification.** See
`docs/COMPLIANCE.md`. An AI agent mapping features to a specific Act's provisions is a useful first
pass for a qualified reviewer to check, not a substitute for one — the document says this explicitly
rather than implying a legal sign-off that did not happen.

**SJ-43's retention job deletes, it does not quietly anonymise-in-place.** `enforceDataRetention()`
(`modules/admin/retention.service.ts`) deletes conversations (cascading their messages) whose last
message is older than 730 days, AI logs older than 365 days, and OTP challenges expired more than a
week. Blanking a conversation's content while leaving its row, timestamps, and user link intact would
still be a re-identifiable trace — a real retention policy removes the record, not just what a casual
query shows. `ledger_entries` and `audit_log` are never touched by this job, by name, in both the code
and this document: they are the accountability record Phase 3 exists to provide, and a "data
retention" job that quietly shortened either would defeat SJ-13/14's entire purpose. The specific
day counts are a defensible default, not a legal determination — see `docs/COMPLIANCE.md`.

**SJ-44's field encryption covers `medicalConditions` only, and the fields it does NOT cover are a
scoping decision made in the open, not a silent gap.** AES-256-GCM
(`lib/security/field-encryption.ts`) protects `userProfiles.medical_conditions` at rest — the one field
in the original audit's "phone, address, and health data are plaintext" finding that is genuinely
free-standing: it is read and written in exactly four places (`lib/http/session.ts`,
`modules/ai/conversation.service.ts` twice, and the profile PATCH route), all now mapped and covered,
and never appears in a SQL `WHERE` clause anywhere in the app. Two fields were deliberately left
plaintext this pass:
  - **`userProfiles.district`/`upazila`** are read in-memory by the eligibility engine but touch five-
    plus call sites (opportunity listing, nearby search, the AI extractor, seed data) with no isolated
    regression cycle to catch a mistake across all of them. Encrypting them is architecturally *safe*
    (confirmed: no SQL-level equality/filter ever runs against these columns), just not done in this
    pass.
  - **`users.phone`** is the one field genuinely blocked on more than time: it is looked up via
    `WHERE phone = ?` on login, so encrypting it for real needs a blind index — a separate
    `HMAC(phone, serverKey)` column for equality lookup, ciphertext for display — not a naive column
    swap. That is the correct design, and it was not attempted here because bolting it onto a live
    authentication path without a dedicated, isolated testing cycle is exactly the kind of change that
    silently breaks login for every account if one call site is missed.

  Both are recorded here as the next concrete step, not swept under "future work" — see
  `docs/COMPLIANCE.md` for the same point made for a compliance reviewer's benefit.

  The redaction discipline this introduces matters beyond the column itself: `users/profile/route.ts`'s
  audit-log entries now store `medicalConditions: "[redacted]"` in `before`/`after`, never the
  decrypted value — encrypting the primary column while a side table kept a plaintext copy of the same
  data would have defeated the point.

## 20. `demo` providers for SMS and vision moderation — explicit, not a relaxation of the honesty rule

SJ-23/48 and SJ-21 both needed a real vendor account to show their "full" path, which nobody
demonstrating this pilot has. Rather than leave those paths only demonstrable by reading the code, both
now accept a fourth, explicit provider value: `SMS_PROVIDER=demo` and `VISION_MODERATION_PROVIDER=demo`.

**This is deliberately narrower than it might sound.** Neither demo mode invents a verdict about
anything a citizen or an auditor would rely on:

- **SMS demo** (`modules/notifications/sms.service.ts`) does not simulate delivery success in any way
  that could be mistaken for one — it logs the outgoing message to the server console, prefixed
  `[SMS:DEMO]`, with the line "no real message was sent" printed in the same log entry. It exists
  purely to demonstrate the *code path* (OTP request → dispatch → success), not to claim a text
  arrived on a real handset.
- **Vision moderation demo** (`modules/issues/vision-moderation.ts`) does not attempt real content
  classification — it never did, and does not start now. It runs one deterministic, disclosed check
  (an image under ~2KB, the size of a placeholder rather than a camera photo, is flagged; anything
  larger passes) and records the result as `demo_flagged`/`demo_passed` — two enum values that exist
  *only* for this mode and can never collide with `flagged`/`passed`, the values a real vision-model
  call produces. A database row can always be traced back to whether a real model or the demo
  heuristic produced it, even though nothing in the citizen-facing UI currently surfaces that
  distinction (only the staff moderation queue renders the flag reason at all).

**Why this is the right shape for a demo feature, not a workaround:** the alternative was either (a)
leave both paths permanently unshowable without a live vendor credential, or (b) make the "unavailable"
fallback quietly return a fabricated pass/fail without labelling it — which is exactly the failure
mode `docs/DEVIATIONS.md` has argued against everywhere else in this document (NID, STT, the original
vision-moderation seam). `demo` sits in neither position: it is opt-in (an operator must set the env
var by name), it is visible in the data it produces, and it never claims to be the real provider it is
standing in for.

## 21. Closing the end-user-facing demo gaps — what closed for real, and the one ceiling that did not

A follow-up pass asked for every remaining end-user-facing gap to be implemented "fully, no corners
cut." Three genuinely closed; one did not, and that limit was verified rather than assumed.

**Beneficiary enrolment, entitlement creation, and disbursement recording (#21–23) are now real UI, not
just API routes.** `/beneficiaries` (roll), `/beneficiaries/new` (enrol), `/beneficiaries/:id` (view +
record a disbursement) — all built on the exact same authorised, already-existing service functions
(`enrollBeneficiary`, `recordDisbursement`, both already ledger-anchored) that only ever had a citizen-
facing read view and a raw API in front of them before. `getBeneficiaryDetail` was added to
`entitlement.service.ts` by extracting the shared body out of `statusForNidHash` into
`buildStatusResult`, so the union-official detail screen and the citizen's own `/entitlements` status
check are provably answering from the same logic, not two implementations that could quietly drift.
Live-verified end to end: enrol → view → record a disbursement, through the real routes.

**The USSD gateway (#36–39) now has a browser-based phone simulator**, not just a curl/Postman
walkthrough. `POST /api/v1/ussd/simulate` calls the identical `handleUssdCallback()` the real,
secret-gated `/api/v1/ussd/callback` calls — it carries no capability the real callback lacks, so it
needs neither a session nor the shared secret; see that route's own doc comment for the full reasoning.
`/ussd-demo` renders it as an actual phone-shaped screen a presenter can dial, type into, and hang up,
live-verified against real seeded data (checked Rahima's entitlement status by NID, watched the
`CON`/`END` text render). This closes the gap between "the logic works" (already true) and "an audience
can watch someone use it" (not true before this pass) — the one thing curl could never do.

**`SMS_PROVIDER=demo` now writes to a staff-visible outbox (`/admin/sms-outbox`), not only a server
console log an audience in a browser demo could never see.** `demo_sms_outbox` is a new table, cleared
on every reseed like `ussd_sessions`, staff-gated to view for the same reason an OTP must never be
readable by an unauthenticated visitor even in a demo build. This is the honest limit of what the
"visible outbox" idea can close: a demo can now show *a record of what would have been sent*; it still
cannot make a real SMS arrive on a real phone, which needs a real vendor account this environment does
not have and this document cannot manufacture.

**Two real bugs were found and fixed while wiring the anomaly checks up, not invented for this section.**
`detectUnverifiedBeneficiaryIdentity` (SJ-19, the ghost-beneficiary check) had been written, unit-tested,
and exported as `listUnverifiedBeneficiaryAlerts` — and never actually called from anywhere.
`getLeaderPortalData`'s anomalies array only ever ran the other three checks. It would have stayed
correctly-implemented-but-unreachable indefinitely, because nothing short of tracing every exported
function to an actual caller would have caught it — a live-verification pass on the *demo data*, not the
code, is what surfaced it. Folded into `getLeaderPortalData` directly and the now-dead standalone
wrapper deleted. Separately, the seed data was extended with one deliberately-triggering example of
each of the five anomaly checks (an oversized allocation, a beneficiary double-enrolled across two
unions, an overpaid disbursement, an escalation backdated 20 days, and two beneficiaries whose NIDs
were never verified by anyone) — previously a fresh `npm run db:seed` produced a Leader Portal that
correctly, but uselessly, showed an empty alerts section until someone manufactured an example by hand.
All five now fire live on a clean reseed with no manual setup, verified via the real `/api/v1/leader/overview` endpoint.

**What did NOT get fully implemented, verified by testing rather than assumed: a genuinely real,
content-aware vision check (SJ-21) is not achievable in this environment, full stop — not a matter of
more engineering effort.** Before writing any of this section, the two candidate providers were tested
live: `ANTHROPIC_API_KEY` is present in this environment's configuration but is set to an empty string
(no real key), and the one real, working key present — `DEEPSEEK_API_KEY`, the platform's actual active
AI provider — was tested directly against DeepSeek's real endpoint with an image payload and rejected
it outright: `"unknown variant image_url, expected text"`. DeepSeek's exposed chat API is text-only.
There is no way to make `VISION_MODERATION_PROVIDER` do genuine image understanding without a real
OpenAI or Anthropic key that does not exist here, and inventing a heuristic that *pretends* to
understand image content would be exactly the fabricated-verdict failure mode this entire document has
argued against since Phase 1. The size-based `demo` heuristic added in §20 remains the honest ceiling
for this environment; the code path to a real provider was already correct and needs nothing more than
a real key to light up.

# Whitepaper ↔ Codebase Audit

**Whitepaper audited:** `ShebarJanala_whitepaper.pdf` — the document that got Shebar Janala / AccessAI selected for the BCOLBD 2026 AI-category final.
**Codebase audited:** this repository (`C:\Users\TL-77057\Downloads\AccessAI`), as it stands today.
**Method:** direct code reading — file paths and line numbers are cited for every claim. Every finding below is graded **CONFIRMED**, **PARTIALLY CONFIRMED**, **CONTRADICTED**, or **NOT IN WHITEPAPER** (real code with no mention in the PDF at all).

**Why this matters for the final round:** the BCOLBD final is scored on Technical Documentation (20 pts), Code Quality & Inference Model (20 pts), Demo Video (30 pts) and Live Presentation (30 pts) — judges will have the repository open. Every number below that the PDF gets wrong is a number a judge can check in ten seconds.

---

## 1. Headline stat block — PDF vs reality

The PDF repeats this stat block twice (front page and Appendix A):

> 2 district pilot · 33 citizens engaged · 102 complaints captured · 685 automated tests · 32 tables · 31 API route files · 51 handlers · 219 capabilities · 19 domains

| Claim | PDF says | Actual | Verdict |
|---|---|---|---|
| Database tables | 32 | **47** (`sqliteTable(...)` definitions, `src/lib/db/schema.ts`) | **CONTRADICTED** — undercounts by 15 (47%) |
| API route files | 31 | **58** `route.ts` files under `src/app/api/v1/` | **CONTRADICTED** — undercounts by 27 (87%) |
| API handlers | 51 | **84** exported HTTP method handlers | **CONTRADICTED** — undercounts by 33 (65%) |
| Automated tests | 685 | **~395** `it(`/`test(` call sites (330 in `.ts` + 65 in `.tsx`); 733 `expect()` assertions | **PARTIALLY CONFIRMED** — true only if "685" secretly meant assertions, and even then it's 733, not 685. As a test count it's overstated ~74%. |
| Domains/modules | 19 | **19** (`src/modules/*`: admin, ai, auth, budget, citizen, civic, eligibility, entitlements, identity, issues, knowledge, ledger, notifications, opportunities, oversight, places, recommendation, ussd, voice) | **CONFIRMED exactly** |
| 219 capabilities | 219 | Not independently countable — "capability" isn't a code-level unit, it's a judgment call from the original feature-inventory pass | **NOT VERIFIABLE** — flag as unaudited rather than confirmed |
| Pilot (2 districts, 33 citizens, 102 complaints) | — | Field/survey data, not something the codebase can confirm or deny | **OUT OF SCOPE** for a code audit — verify from your own pilot records before repeating it to judges |

**Risk:** three of the seven hard numbers in your own stat block are wrong, and all three errors are *undercounts of your own codebase* — a judge who clones the repo and runs `find src/app/api/v1 -name route.ts | wc -l` will get a bigger number than your whitepaper, in your favor, but it still reads as sloppy self-auditing. Fix the numbers before the final; it costs nothing and removes an easy credibility hit.

---

## 2. Section-by-section: what the PDF claims vs what the code does

### 2.1 Authentication — CONFIRMED, with one factual error

- Phone/OTP/PIN flow, lockout, refresh rotation with reuse detection: all real.
  - OTP + PIN flow: `src/modules/auth/auth.service.ts:85-198`, `:240-386`
  - Lockout: 5 attempts / 10-minute lock, self-clearing (`auth.service.ts:37-38, 304-332`)
  - Refresh rotation + reuse detection revokes the whole session family: `auth.service.ts:440-508, 481-486`; `sessions.replacedById` chain in `schema.ts:197-198`
- **Error to fix:** the whitepaper doesn't mention Argon2id, but other AccessAI docs in this repo do (`AccessAI-BCOLBD-2026-Whitepaper.docx`, PRD) — the code explicitly does **not** use Argon2id. It uses Node `scrypt`, with a comment stating why: Argon2id needs native bindings that don't run on Cloudflare Workers (`../src/lib/security/hash.ts:16-38`, esp. line 19-26). If any finals material still says Argon2id, correct it — this is a real, honestly-documented engineering deviation, not a hidden weakness, but it should be described accurately.
- **SMS delivery is real but conditional.** Live integrations exist for SSL Wireless, BulkSMSBD and Twilio (`src/modules/notifications/sms.service.ts:33-87`). Without a configured provider, OTP is only ever logged/echoed in the API response (dev mode) or written to a `demo_sms_outbox` table (demo mode) — no text message is ever sent (`sms.service.ts:89-125`). Fine for a demo, but don't claim "SMS delivery" as shipped-and-live without a configured provider key.

### 2.2 Identity / residency verification — **NOT IN WHITEPAPER AT ALL**, and partially simulated

The PDF never mentions this feature, but it's real, load-bearing code:
- `src/modules/identity/{identity.service.ts, nid.service.ts, geofence.ts}`, routes `src/app/api/v1/identity/{route,nid/route,residency/route}.ts`
- **NID verification is explicitly simulated**, and the code says so itself: only a digit-length format check (10/13/17 digits) is performed; the result is literally stored as `simulated_verified` (`nid.service.ts:6-53`, esp. lines 23-24, 34-52). If a real `NID_PROVIDER` env var is set, it throws "not implemented in this build" rather than faking success (`:41-43`) — an honest fail-closed design, but there is no real government NID integration.
- Residency verification is a **real** GPS point-in-polygon geofence check against a `unionBoundaries` table (`identity.service.ts:121-160`, `geofence.ts`), but the code itself admits the boundary corpus is "a handful of authored samples, not national coverage" (`:157-158`).
- NID numbers are never stored raw — only a hash (`nid.service.ts:50`).

**Why this matters:** this is real, working, undocumented functionality. If your finals demo shows residency verification, judges will ask why it's not in the whitepaper at all.

### 2.3 Eligibility engine — CONFIRMED, high fidelity, two precision corrections

- No LLM in the decision path, by explicit design comment: `src/modules/eligibility/engine.ts:11-19`
- Four-valued outcome — `eligible / partially_eligible / not_eligible / unknown` (`src/lib/domain/enums.ts:179`; decision logic `engine.ts:379-396`)
- **Comparators: 13, not 12** as other AccessAI docs claim — `eq, neq, gt, gte, lt, lte, in, not_in, between, exists, not_exists, contains_any, contains_all` (`enums.ts:182-196`), all implemented in `engine.ts:167-213`
- Soft conditions/weights and `partially_eligible` derivation: `engine.ts:237-238, 358-363, 395`
- Missing required fields → `unknown`, never `false`: `engine.ts:346-348, 392`
- **Confidence ceiling numbers are correct (65/45/25 for unverified/outdated/disputed)** but live in a different module than claimed: the eligibility engine itself has no confidence field (`engine.ts:91-106`); the capping is done by `src/modules/ai/confidence.ts:63-69, 183-185` (`VERIFICATION_CEILING`, `enums.ts:64-70`), applied to the separate opportunity-recommendation confidence score, not the eligibility verdict. If asked "where does the ceiling live," the accurate answer is "the AI/recommendation confidence scorer," not "the eligibility engine."
- Profile snapshot + rule version stored per decision — **CONFIRMED**: `eligibilityEvaluations.profileSnapshot` / `.ruleVersion` (`schema.ts:1046-1069`), written from `src/app/api/v1/eligibility/check/route.ts:84` and `conversation.service.ts:353`.
- Tests: 28 assertions across 5 describe blocks in `tests/eligibility/engine.test.ts` covering three-valued logic, group combinators, all 13 operators, scoring/trace, and rule-set validation — solid, matches the claimed rigor.

### 2.4 Citizen profile — CONFIRMED (35 fields, not 34)

`userProfiles` table (`schema.ts:88-161`) has 35 substantive fields (excluding id/userId/timestamps): dateOfBirth, statedAge, gender, occupation, monthlyIncome, maritalStatus, education, cgpa, university, department, hasDisability, disabilityType, householdSize, dependents, division, district, upazila, landOwnershipDecimals, isStudent, hasBusiness, businessType, employees, farmSizeDecimals, crops, livestock, isPregnant, medicalConditions, shareHealthData, citizenship, preferredCountry, ieltsScore, hasNid, hasBankAccount, isFreedomFighterFamily, interests.

`medicalConditions` is AES-256-GCM encrypted at rest (`schema.ts:120-130`) — consistent with "opt-in health data" claims, and worth stating explicitly in finals documentation since it's a genuinely good answer to a privacy question.

Nine more fields exist for the undocumented identity feature (NID/residency) — bringing the live total to 44 if those are counted, none of which the PDF describes.

### 2.5 Discovery & retrieval — CONFIRMED as real, non-trivial engineering

- **BM25 is a real, hand-rolled implementation**, not a library call: k1=1.5, b=0.75, IDF smoothing, document-length normalization over pre-computed term frequencies (`src/modules/knowledge/retrieval.ts:130-168`).
- **Bilingual tokenizer is real**: Bangla Unicode-range splitting, a genuine curated Bangla suffix-stripping stemmer, a Porter-style English stemmer, separate BN/EN stopword sets (`tokenizer.ts:1-94`).
- **Reciprocal Rank Fusion is real**: rank-based RRF with k=60 (`retrieval.ts:216-232`) — exactly matches the "RRF-fused" claim in other AccessAI docs.
- **Semantic/embedding channel genuinely requires a real API key and fails to empty (no faked vectors) without one**: `hasEmbeddingProvider = Boolean(env.OPENAI_API_KEY)` (`src/lib/config/env.ts:343`); `semanticScores()` returns nothing without it (`retrieval.ts:186-210`). Only the OpenAI provider implements `embed()` — Anthropic and DeepSeek explicitly don't (`providers/index.ts:59, 236-238`).
- Corpus: 42 seed programme records across 5 categories (`src/lib/db/seed/opportunities-*.ts`), chunked bilingually at seed time — consistent with, though not an exact confirmation of, the "158 chunks" figure quoted elsewhere.

### 2.6 Conversational AI / NLU — CONFIRMED as deterministic, not model-backed (as claimed)

- Intent/life-event/entity extraction is **pure keyword + regex**, not model-backed, and the code says this is deliberate: `src/modules/ai/nlu.ts` — `detectLifeEvents()` (68-90), `classifyIntents()` (94-131, 151-183), `extractEntities()` (200-408, explicitly conservative about ambiguous values, lines 16-18, 224-236).
- **LLM adapters are real but hand-rolled, not vendor SDKs.** `providers/index.ts` implements Anthropic, OpenAI, and DeepSeek clients via raw `fetch` calls to each vendor's REST API (lines 14-239) — functionally real integrations gated on real API keys, but **`package.json` has no `@anthropic-ai/sdk`, `openai`, or any AI vendor package** (full dependency list checked: only `@aws-sdk/client-s3`, `@libsql/client`, `drizzle-orm`, `zod`, `next`, `react`, etc.). If a judge asks "which SDKs do you use for inference," the honest answer is "none — direct REST calls," which is a defensible architectural choice but should be stated as such, not implied to be SDK-based.
- **ResponsePlan + deterministic composer fallback: CONFIRMED.** `response-plan.ts:49-70` defines the fixed-fact plan; `composer.ts:137-193` renders it into bilingual prose with zero model calls when no provider is configured or a call fails — exactly as documented elsewhere.
- **`ai_logs.groundingFailure` flag: CONFIRMED**, set when a recommendation carries zero citations (`schema.ts:1071-1098`, line 1094; set in `conversation.service.ts:430`).

### 2.7 Voice — CONFIRMED as partial, exactly as labeled

- No real ASR/TTS model ships in the repo. Server STT/TTS are thin `fetch` adapters to an OpenAI-Whisper-API-compatible endpoint, entirely dependent on `STT_API_KEY`/`TTS_API_KEY` (`src/modules/voice/providers.ts:67-135, 212-242`); without a key, both return `null` and the mic/speaker are disabled with a stated reason in the code (lines 14-19, 140-145, 246-251).
- No domain-adapted Bangla model exists anywhere — no fine-tuned weights, no `onnxruntime`/`whisper`/`transformers` dependency. The only "Bangla adaptation" is a `language: 'bn'` hint and a vocabulary-bias prompt string passed to a generic third-party endpoint. This matches the PDF's own "domain-adapted civic models [in development]" framing — consistent, not a discrepancy.
- Voice **navigation/command routing is real and provider-independent** — deterministic, ties back to the same NLU confirmed above (`describeVoiceCapabilities():171-186`).

### 2.8 Recommendation/ranking — CONFIRMED as a formula, not ML (as claimed)

- `ranker.ts:154-196` — a weighted sum of six components (eligibility 40%, preference 15%, location 15%, deadline 10%, popularity 10%, similarUserSuccess 10%; weights at lines 27-34). No model, no training data.
- The "similar user success" factor genuinely declares itself unavailable rather than fabricating a number: hardcoded neutral value + `similarUserDataAvailable: false` on every result (lines 168-169, 184), with a comment explaining why (12-19). This is a good, honest talking point for finals — use it.

### 2.9 Administration — CONFIRMED, stronger than the PDF states

- **Audit log is genuinely hash-chained**, not just append-only rows: `recordAudit()` folds each new entry's hash from the previous entry's hash (`admin.service.ts:515-546`, using `src/modules/ledger/hash-chain.ts`); `verifyAuditChain()` independently re-verifies the whole chain (lines 549-560). This is materially stronger tamper-evidence than "append-only audit row" as the PDF describes it — worth upgrading the language in your finals docs, since it's a real answer to "how do you know the log wasn't edited?"
- **Verify-and-edit-in-one-request is explicitly forbidden**: `src/app/api/v1/admin/programs/[id]/route.ts:58-68` rejects a PATCH that both verifies and edits content in the same call.
- **Editing a verified record revokes verification**: same file, lines 76-84 — substantive-field edits to a verified record force `verificationStatus` back to `pending_review` and clear `lastVerifiedAt`. This is precisely implemented, matching the whitepaper's claim exactly.

### 2.10 Application tracking — CONFIRMED, minor precision note

- The "8-stage tracker" claim refers to `SAVED_STATUSES` (`enums.ts:255-264`): `interested → preparing → documents_ready → applied → under_review → approved → rejected → completed` — exactly 8 values, confirmed.
- Action-plan tasks use a *separate* 4-value status enum (`pending/in_progress/done/skipped`), and timeline events use a *third*, 9-value enum. All three systems (saved status, tasks, timeline) are real and wired to real tables/routes — the "8-stage" language is accurate for saved-programme status specifically, but could read as implying task tracking is 8-stage too. Clarify in finals docs.

### 2.11 Nearby services / maps — CONFIRMED precisely, including the specific cache parameter

- Server-side tile proxy validates z/x/y as bounded integers (SSRF-safe), sets long-lived immutable cache headers — consistent with the "`img-src 'self'`" CSP claim (`src/app/api/v1/map/tile/[z]/[x]/[y]/route.ts`).
- Real Overpass QL query builder with retry typing and duplicate-facility dedup by name + 150m proximity (`src/modules/places/overpass.ts`, ~lines 155-190).
- **The ~5.5km cache cell size is exactly confirmed**: `cellKey()` snaps coordinates to a 0.05° grid, which at Bangladesh's latitude is ≈5.5km — matches the stated figure precisely.

### 2.12 Document intelligence — CONFIRMED absent, as labeled

No OCR, layout model, or circular-to-rule pipeline exists anywhere in the codebase. This matches the whitepaper's own "Proposed" status for this item — not a discrepancy, just confirming the honesty of that label holds.

---

## 3. Functionality in the codebase with **zero mention** in the whitepaper

This is the largest finding. Seven of the 19 module directories implement a substantial, coherent subsystem the PDF never describes at any level — not even at the product-vision level (Use Cases A/B/C in Section 2.1 of the PDF come closest with "local accountability," but don't cover most of this):

| Module | What it actually does | Backing routes |
|---|---|---|
| `budget` | Tracks budget allocation records, anchors each one into a financial hash-chain ledger on creation; citizens can "flag" an allocation, and flag-ratio crossing a fixed threshold (`ESCALATION_THRESHOLD_RATIO=0.5`, `ESCALATION_MIN_FLAGS=2`) auto-escalates to the union's upazila officer | `budget/allocations/*`, `upazila/escalations/*` |
| `civic` | Place-scoped authorization helpers (union/upazila/district official role checks) — the gating layer for budget, beneficiary and entitlement routes | (no direct routes — internal auth layer) |
| `issues` | Citizen grievance/complaint reporting scoped to the reporter's verified union; automatic keyword+vision moderation on submit; a full state machine (`submitted → under_review → verified/rejected → in_progress → completed → archived`); vote toggling | `issues/*`, `admin/moderation` |
| `ledger` | An independent SHA-256 hash chain (separate from the admin audit-log chain) used to anchor budget allocations and disbursements, with chain verification | `ledger/verify` |
| `oversight` | Deterministic anomaly detection: allocation outliers >3x union median, duplicate beneficiary enrollment across unions (via NID hash), unverified-identity beneficiaries, overpaid disbursements, stale (>14 day) escalations; assembles leader/donor/public transparency dashboards | `leader/overview`, `donor/overview`, `public/transparency` |
| `ussd` | A stateful USSD menu simulator (CON/END semantics) letting phone-verified citizens check entitlement status or report issues without a smartphone | `ussd/callback`, `ussd/simulate` |
| `entitlements` | Real enrollment/disbursement tracking (distinct from the self-reported `eligibility` module), matched by NID hash; disbursements are also anchored into the ledger | `entitlements/*`, `beneficiaries/*` |
| `identity` | (see §2.2 above) NID + residency verification | `identity/*` |

**Taken together, this is a full local-governance financial-transparency stack** — budget flagging → escalation → anomaly detection → public transparency dashboards, plus a phone-only USSD access channel and a second independent hash-chain ledger — sitting fully implemented in the repository, and **completely absent from the document that got you into the final.**

Two implications, in tension with each other:

1. **Upside:** this is real, working, more-impressive-than-documented functionality. The `ledger` module in particular is a genuine (if single-organization, non-distributed) hash-chain integrity mechanism — conceptually a lightweight cousin of the "Bhorosha Trust Registry" blockchain idea that other AccessAI documents explicitly say is "not built, nothing in the repository touches a ledger." That statement is now **out of date** — a real ledger module exists, even though it isn't a multi-party blockchain.
2. **Downside/risk:** if your demo video or live presentation shows *any* of budget/issues/oversight/ussd/entitlements/identity, a judge who read the whitepaper will reasonably ask "where was this in your submission?" Scope mismatch between what won you the prelim and what you show in finals can read as bait-and-switch even when the extra work is a strict improvement. Decide deliberately whether to (a) stay within the whitepaper's described scope for the demo, or (b) explicitly reframe finals materials to acknowledge the platform has grown, and say so up front rather than let a judge discover it.

---

## 4. Straight discrepancy list (for quick reference)

| # | PDF/doc claim | Reality | Type |
|---|---|---|---|
| 1 | 32 database tables | 47 tables | Undercount |
| 2 | 31 API route files | 58 route files | Undercount |
| 3 | 51 API handlers | 84 handlers | Undercount |
| 4 | 685 automated tests | ~395 test cases (733 assertions) | Overcount |
| 5 | Argon2id password hashing (other AccessAI docs) | Node `scrypt`, by deliberate design (native Argon2id unavailable on Cloudflare Workers) | Wrong algorithm named |
| 6 | 12 rule comparators (other AccessAI docs) | 13 comparators implemented | Undercount |
| 7 | 34 citizen profile fields (other AccessAI docs) | 35 core fields (44 incl. identity fields) | Slight undercount |
| 8 | Confidence ceiling lives "in the eligibility engine" | Lives in a separate AI/recommendation confidence module; the eligibility engine itself has no confidence field | Misattribution |
| 9 | "Nothing in the repository touches a ledger" (docx) | A real SHA-256 hash-chain ledger module exists, anchoring budget/disbursement records | Stale/outdated claim |
| 10 | Audit log described as "append-only" | It's append-only **and** cryptographically hash-chained with independent chain verification — stronger than described | Understatement (harmless, but worth claiming credit for) |
| 11 | "AI-provider adapters" | Real, but hand-written `fetch` clients — zero AI vendor SDKs in `package.json` | Understated mechanism, not wrong per se |
| 12 | Whitepaper's product scope (citizen discovery + local accountability) | Codebase additionally implements budget transparency, financial anomaly detection, USSD access, NID/residency verification, entitlement/disbursement tracking | Undocumented scope |

---

## 5. Recommendations before the final

1. **Fix the four hard numbers** (tables, routes, handlers, tests) in whatever technical documentation you submit for finals — these are checkable in seconds and currently wrong in your favor, which still looks bad.
2. **Decide the scope story deliberately.** Either keep the demo/live-presentation scoped to exactly what the PDF describes, or explicitly present the undocumented modules as "built since the prelim submission" — don't let a judge discover budget/oversight/USSD/identity cold during Q&A.
3. **Correct the Argon2id and comparator-count claims** anywhere they appear in finals materials — both are minor but avoidable "your own docs disagree with your own code" hits.
4. **Use the hash-chained audit log and the `ledger` module as a strength, not a footnote** — it's real cryptographic tamper-evidence, already built, and directly answers the kind of "how do you know this wasn't edited" question a technical judge is likely to ask, especially given the project's blockchain-adjacent origins.
5. **Be ready to explain, precisely, which "AI" is actually model-backed vs. deterministic** — per the final-round rubric, "Code Quality & Inference Model" (20 pts) rewards a real, reproducible inference path. Right now the only genuinely model-backed, judge-demonstrable pieces are: (a) LLM-rendered response generation via a configured provider key, and (b) the dormant embedding/semantic retrieval channel if you supply an `OPENAI_API_KEY`. Everything else labeled "AI" in the PDF (NLU, ranking, eligibility) is deterministic by design — which is a defensible product decision, but won't score points on "inference model" unless you're explicit that the actual inference-based components are the LLM rendering and (if enabled) the embeddings, and you demo those specifically.

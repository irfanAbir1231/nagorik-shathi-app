# Adversarial Review — AccessAI PRD v3.0

**Document under review:** AccessAI — Bangladesh's AI Opportunity Intelligence Platform, PRD v3.0 (116 pages, Parts 1–6 + Part 8)
**Review date:** 2026-07-28
**Review stance:** Default skepticism. Claims earn credibility through evidence, not through length or polish.
**Scope limit:** This review evaluates *the document only*. No code, repository, demo, dataset, or user research was provided. Where I say "absent," I mean absent from this document.

---

## Executive Verdict

| Dimension                                     |              Score | One-line justification                                                                                                        |
| --------------------------------------------- | -----------------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Overall quality                               | **42** / 100 | Broad and organized, but zero evidence, a missing core section, and internal contradictions throughout                        |
| Innovation                                    | **35** / 100 | The life-event framing is genuinely good; both starred "differentiators" are a lookup table and a calendar                    |
| Product thinking                              | **38** / 100 | Real problem, split ICP, no named competitor, no distribution strategy, metrics contradict scope                              |
| Technical design                              | **45** / 100 | Stack choices are sane and boring (a plus); schema is incomplete, knowledge graph is vapor, retrieval is undesigned           |
| Feasibility                                   | **25** / 100 | 6 sprints to "production candidate," no team size, no budget, and zero sprint allocation for the data work                    |
| Security                                      | **28** / 100 | Checklist-level. No threat model, no privacy law, no handling of PII sent to a third-party LLM                                |
| Clarity                                       | **55** / 100 | Readable prose undermined by padded formatting, duplicated sections, and contradictory statements                             |
| Completeness                                  | **40** / 100 | Part 7 (Knowledge Base & Data Pipeline) is entirely missing; ~40% of the feature surface has no API                           |
| Investor confidence                           | **22** / 100 | No market sizing, no unit economics, no cost figure anywhere, no incumbent analysis                                           |
| **Judge confidence in this assessment** | **88** / 100 | The document is self-contained and internally checkable; the 12% reflects that working code may exist and is not visible here |

**Headline:** This is a *well-structured table of contents for a product that has not yet been designed*. It names the right components and gets the philosophy ("rules decide, AI explains") right. It does not specify, quantify, evidence, or cost a single one of them.

---

## Critical Findings — Top 20 by Severity

### 1. Part 7 (Knowledge Base & Data Pipeline) does not exist — CRITICAL

**Evidence:** Section numbering runs 1 → 100 (p.107), then jumps directly to "118. Production Deployment Strategy" (p.108). Sections 101–117 are absent. The document itself announces the omission: *"The remaining two sections—Part 7 (Knowledge Base & Data Pipeline) and Part 8 … will define how the platform ingests and maintains trusted knowledge"* (p.107).

**Why it matters:** Every claim of trustworthiness in this document depends on a corpus of verified programs and machine-readable eligibility rules. That corpus is the product. The LLM is commodity; the retrieval stack is commodity; the moat is the curated, versioned, verified knowledge base. The document specifies the wrapper in obsessive detail and omits the contents entirely.

**Consequences:** Nobody can estimate cost, timeline, team, or feasibility. Sprint 3 ("Opportunity database") is unschedulable. The core differentiator versus ChatGPT — asserted on p.113 — is unsubstantiated.

**Fix:** Write Part 7 before any code. It must answer, concretely: which ~50 programs are in the v1 corpus; the exact source URL/PDF for each; who holds the legal right to redistribute that content; who authors and reviews `rule_json`; the annotation guideline; the review SLA; the staleness policy; the person-days per program. Until that exists, treat the entire schedule as unestimated.

---

### 2. No evidence for any problem claim — CRITICAL

**Evidence:** *"Thousands of services are available online"* (p.3). *"Most people never complete this process"* (p.4). *"Citizens lose access to benefits they are legally entitled to receive"* (p.4). Zero citations, zero statistics, zero user interviews, zero survey data, zero baseline utilization figures across 116 pages.

**Why it matters:** The entire investment thesis is "underutilization caused by discoverability." That is a testable empirical claim with at least three competing explanations — (a) people know but don't qualify, (b) people know and qualify but the application process defeats them, (c) people genuinely don't know. Only (c) is addressed by this product. If the real bottleneck is (b), AccessAI moves nobody from awareness to benefit, and the stated impact KPIs all read zero.

**Consequences:** Building the wrong product with high confidence. Impact metrics (§129) cannot be defended to a funder or ministry.

**Fix:** Ten structured interviews with widow-allowance applicants at a Union Digital Centre, and ten with rejected applicants. Report the actual failure stage. One page of that data is worth eighty pages of this document.

---

### 3. Not a single Bangladeshi incumbent is named — CRITICAL (product/investor)

**Evidence:** §6 "Product Positioning" (p.7) compares AccessAI to exactly three things: "Traditional Government Portal," "Google," and "ChatGPT." §127 anticipates only one competitive question: *"Why not just use ChatGPT?"*

**Why it matters:** Bangladesh already operates the National Portal, the **333 National Helpline** (a human-staffed citizen-service navigation line that does precisely the job-to-be-done described here, over a channel the target users actually have), **a2i**'s service ecosystem, and ~5,000+ **Union Digital Centres** with trained operators. The document names UDCs *as part of the problem* (p.3) and never once as a competitor, a partner, or a distribution channel. Any Bangladeshi judge will notice within thirty seconds.

**Consequences:** The competitive framing is not merely incomplete — it is oriented toward the wrong opponents. It also skips the existential strategic question: if a2i partners, a2i eventually builds this in-house; if a2i doesn't partner, the data goes stale and the product dies. That fork is never named.

**Fix:** A real competitive matrix including 333, National Portal, a2i/MyGov, UDC operators, and existing scholarship aggregators. Then state the wedge and the partnership-versus-displacement strategy explicitly.

---

### 4. Success metrics measure outcomes the MVP is architecturally incapable of observing — CRITICAL

**Evidence:** Out of scope for MVP: *"Official application submission,"* *"Benefit approval,"* *"Government decision making"* (p.11). Yet tracked metrics include *"Successful Application Rate"* and *"Search-to-Application Conversion Rate"* (§17), *"Number of successful applications initiated"* (§129), and Opportunity Tracker statuses *"Under Review / Approved / Rejected"* (§18). The recommendation ranker weights *"Similar User Success — 10%"* (§31).

**Why it matters:** With no submission integration, every one of these values is a user self-report with a near-zero response rate. "Similar User Success" as a ranking signal requires an outcome dataset that will never populate. The ranker is 10% weighted on a permanently null column.

**Consequences:** Impact reporting to funders will be fabricated or empty. The recommendation engine ships with a dead feature that quietly skews scores.

**Fix:** Either drop the outcome metrics and the "Similar User Success" weight, or add an explicit, designed self-report loop with a realistic assumed response rate stated in the document.

---

### 5. Deterministic eligibility is undermined by non-deterministic inputs — CRITICAL

**Evidence:** §24: *"This module **must not use an LLM**. Instead, use deterministic rules."* Example output: `{"eligible": true, "confidence": 100, ...}`. But the pipeline (§19) feeds it from *Intent Classification → Entity Extraction → User Profile Builder*, i.e., LLM-extracted values.

**Why it matters:** The trust boundary is not where the document places it. A deterministic rule over a hallucinated `income` value produces a deterministic wrong answer with `confidence: 100`. The architecture buys reproducibility, not correctness, and the document repeatedly sells it as correctness (§18, §33, §127).

**Consequences:** A citizen is told "You are eligible — confidence 100%" for a means-tested benefit, travels to an office, and is refused. That is the exact trust failure the platform exists to solve, now caused by the platform. It is also a plausible liability event, and the document contains no disclaimer requirement anywhere.

**Fix:** Propagate input provenance and certainty into the rule engine. Every profile field needs `{value, source: user_confirmed | llm_extracted | inferred, confidence, asserted_at}`. Any rule evaluated over an unconfirmed field must return `Unknown`, not `Eligible`. Require explicit user confirmation of every field used in a positive eligibility determination. Add a mandatory non-authoritative disclaimer to the UI spec.

---

### 6. `rule_json` has no schema, grammar, or semantics — CRITICAL

**Evidence:** §40: `EligibilityRules: id, opportunity_id, rule_json, priority, version` followed by *"Store rules as JSON."* That is the complete specification. Outputs include four states — Eligible, Partially Eligible, Not Eligible, **Unknown** (p.17–18) — none of which are defined.

**Why it matters:** This is the deterministic core of the entire product and it has zero definition. Unspecified: the operator set; AND/OR/NOT nesting; comparison against thresholds (`Income < Threshold` — `Threshold` appears in no table); how missing data yields `Unknown` versus `Not Eligible`; what proportion of matched rules constitutes "Partially Eligible"; whether an in-flight evaluation pins to a rule `version`; how `priority` interacts with evaluation.

**Consequences:** Every engineer implements a different rule language. Unit tests (§93 "Test eligibility rules") cannot be written against an undefined grammar. Three-valued logic bugs in benefits determination are the highest-harm bug class this system can produce.

**Fix:** Specify a small, closed DSL with a JSON Schema, an explicit three-valued (Kleene) truth table, a defined "Partially Eligible" threshold, immutable rule versions pinned per evaluation, and a golden test-case file per program.

---

### 7. The "Opportunity Graph" — a starred differentiator — is a static one-hop lookup table — HIGH

**Evidence:** §Feature 5 (⭐, p.19): `Widow → [Widow Allowance, VGD, Healthcare, Educational Support, BRAC, Livelihood Training, Free Legal Aid, Microfinance]`. §27 repeats the pattern for Student and Farmer. No edge types, no edge weights, no traversal algorithm, no graph technology named, no graph tables in §40, and no indirect-discovery mechanism beyond the bare assertion *"Knowledge graphs allow indirect opportunity discovery"* (p.42).

**Why it matters:** A hand-maintained `life_event → program[]` mapping is a `JOIN`, not a knowledge graph. It is presented as one of two headline differentiators. Judges who know graph systems will read this as inflation, and inflation on the differentiator slide damages credibility on everything else.

**Consequences:** The claimed innovation collapses under one question. Worse, the honest version — a curated life-event taxonomy — is genuinely valuable and is being obscured by the overclaim.

**Fix:** Either drop the "knowledge graph" language and sell the life-event taxonomy honestly (recommended — it's the strongest idea in the document), or specify node/edge types, storage, traversal depth, and the actual multi-hop query that produces a recommendation nothing else would surface.

---

### 8. PII flows to a third-party LLM with no privacy analysis — CRITICAL (security/compliance)

**Evidence:** The system collects `disability`, `income`, `marital_status`, `Medical Condition`, `Pregnancy`, `household_size`, `district` (§17, §20 Module 3, §40). The context builder sends *"User Profile"* to the LLM (§28, §29). The deployment stack names *"AI Provider: OpenAI"* (§118) and `OPENAI_API_KEY` (§87). The words "consent," "lawful basis," "data residency," "data processing agreement," "retention," and "de-identification" appear nowhere. No regulatory framework of any kind is named — not Bangladesh's data protection regime, not GDPR, not anything.

**Why it matters:** This transmits special-category personal data about identified Bangladeshi citizens — widowhood, disability, medical condition, poverty status — to a foreign commercial API, by design, on every turn. §121 is titled "Security & Privacy" and consists of a nine-item hygiene checklist that does not mention this at all.

**Consequences:** A government partnership is unlikely to survive a legal review. A single breach or subpoena involving disability and income records of low-income citizens is a project-ending event, independent of the technical merits.

**Fix:** Add a data protection section: lawful basis and consent capture per field; strict minimization (send only the fields a given rule requires, never the whole profile); pseudonymization before egress; a named DPA with the model provider and a zero-retention configuration; a documented position on data residency; a DPIA; and a stated retention/deletion schedule. Evaluate an in-country or self-hosted model for the extraction step.

---

### 9. The 3-second latency requirement is asserted against a serial multi-model pipeline with no budget — HIGH

**Evidence:** *"Responds within 3 seconds"* (§Feature 1 acceptance criteria), *"Retrieve information within three seconds"* (§11), *"API response time < 3 seconds"* (§129). The §19 pipeline is strictly serial: Input → Conversation Manager → Intent Classification → Entity Extraction → Profile Builder → Missing-Info Detector → Eligibility Engine → Retrieval Orchestrator (vector + SQL + graph) → Context Construction → LLM Response → Ranking → XAI Layer → Action Plan → Response.

**Why it matters:** No percentile is specified (p50? p95? p99?). No definition of the measured event (time-to-first-token, or full response? — the system also streams, per §61 and Sprint 2, which makes "3 seconds" meaningless without saying which). No per-stage budget. No token budget. No model tier assignment per stage. On a plausible reading, this pipeline involves 3–5 sequential model calls plus three datastore round-trips before the first token.

**Consequences:** The single most user-visible non-functional requirement is untestable as written and, on the described architecture, likely unmeetable end-to-end.

**Fix:** Restate as p95 time-to-first-token ≤ 1.5s and p95 full response ≤ 6s. Publish a per-stage millisecond budget. Assign the cheapest viable model per stage. Merge intent + entity + missing-info into a single structured-output call. Parallelize the three retrieval paths.

---

### 10. Bangla is claimed everywhere and engineered nowhere — HIGH

**Evidence:** Bangla support appears in §11 success criteria, §Feature 1 acceptance criteria, §Feature 16, and MVP acceptance criterion #12. The technical treatment is: *"Internationalization: next-intl"* (§53). Search is *"PostgreSQL Full Text Search"* + pgvector (§37).

**Why it matters, concretely:**

- `next-intl` localizes **UI strings**. It does nothing for the opportunity corpus, which is the content users actually read.
- Stock PostgreSQL ships no Bengali text-search configuration. `to_tsvector('bengali', …)` is not available out of the box. Bangla keyword search — half of the "hybrid retrieval" claim — has no stated implementation.
- The `Opportunities` table has single `title`, `description`, `requirements`, `benefits` columns with **no locale dimension**. Bilingual program content is unstorable in the given schema.
- No cross-lingual retrieval strategy: a Bangla query against an English-indexed corpus (or vice versa) is unaddressed. No embedding model is named, let alone one with verified Bangla performance.
- Voice is scoped for *"Elderly, Visually Impaired, Low Literacy Users"* (§Feature 15) with no Bangla ASR/TTS provider named and no accuracy target. Bangla ASR error rates are materially worse than English; this is the accessibility promise to the highest-need users.

**Consequences:** The MVP acceptance criteria cannot be met by the specified stack. Bangla will ship as translated chrome around English content — which fails precisely the users the mission statement centers.

**Fix:** Add locale-keyed content tables. Name the Bangla FTS approach (a custom `text search configuration`, an external analyzer, or trigram fallback) and benchmark it. Name and benchmark a multilingual embedding model on Bangla. Name the ASR/TTS vendor and publish a measured Bangla WER before promising voice to visually impaired users.

---

### 11. Zero cost figures in 116 pages — CRITICAL (investor)

**Evidence:** No currency symbol, no per-token cost, no infrastructure estimate, no headcount cost, no data-curation cost, no CAC, no burn, no runway appears anywhere. §128 lists *"High API costs"* as a risk mitigated by *"Response caching, prompt optimization, selective retrieval."* §123 lists six revenue streams with no pricing.

**Why it matters:** An LLM product with a 3–5-call-per-turn pipeline and a "national scale" ambition has cost-per-conversation as its dominant unit-economics variable, and its target user monetizes at zero by design (*"Core citizen-facing functionality should remain free"*). Every incremental user is pure cost.

**Consequences:** No investor can underwrite this. No ministry can budget it. The caching mitigation is illusory for a personalized system (see Finding 15).

**Fix:** Model cost-per-conversation at three fidelity tiers. State cost at 1K, 100K, and 1M MAU. State who funds the gap between launch and the first government contract, and how long that contract takes to close.

---

### 12. The MVP data model is missing tables for four shipped features — HIGH

**Evidence:** §40 defines: User, UserProfile, Organizations, Opportunities, EligibilityRules, Documents, Embeddings, Conversations, Messages, SavedOpportunities, Notifications. Cross-referencing against the feature set:

| Feature                                                                           | Required storage                   | Present in §40?                                                                                                           |
| --------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Action Plan (§Feature 7, §64: per-task priority, estimated time, status, notes) | Task/ActionPlan table              | **Absent**                                                                                                           |
| Nearby Services (§Feature 12, §70: distance, hours, phone, navigation)          | Locations table with coordinates   | **Absent** — §41 references "Locations" as a relation that is never defined; no PostGIS, no lat/long, no geocoding |
| Feedback loop (§34: helpful/not, report incorrect, rate quality)                 | Feedback table                     | **Absent**                                                                                                           |
| Life-event taxonomy (§23, called a "core innovation")                            | LifeEvent + event→program mapping | **Absent**                                                                                                           |
| Admin audit (§121 "Log administrative actions")                                  | Audit table                        | **Absent**                                                                                                           |
| Knowledge Graph (§27, in the architecture diagram)                               | Any graph storage                  | **Absent**                                                                                                           |
| User document uploads (§37 object storage: "User Uploads")                       | UserDocument table                 | **Absent**                                                                                                           |

**Additional defects in what *is* defined:**

- `Opportunities` has no coverage area / geography column — yet Location carries **15% of the ranking weight** (§31) and "Distance" is a recommendation-card field (§62). The ranker's third-heaviest signal has no data source.
- `Embeddings` has no `model` or `dimension` column, making an embedding-model migration a full-table rebuild with no way to run two models in parallel.
- `SavedOpportunities` has no primary key and no `updated_at`.
- **The status enum is defined twice, differently:** §Feature 18 lists Interested, Preparing, Documents Ready, Applied, Under Review, Approved, Rejected, Completed (8 states). §40 lists Interested, Preparing, Applied, Rejected, Completed (5 states). Two contradictory state machines for the same column.
- `district` is duplicated on both `User` and `UserProfile` with no stated source of truth.
- `Documents` is keyed only to `opportunity_id`, so organization-level documents and general circulars have no home.

**Fix:** Complete the model before Sprint 1. Reconcile the status enum. Add geography (PostGIS) or delete the 15% location weight and the distance field.

---

### 13. No threat model, and the actual AI attack surface is misidentified — HIGH

**Evidence:** §48: *"Prompt Injection Protection — Sanitize user prompts before constructing AI context. Never allow prompts to override system instructions."*

**Why it matters:** "Sanitize prompts" is not a control; it is a wish. More importantly, the primary injection vector in a RAG system over ingested third-party PDFs is **indirect prompt injection from retrieved documents**, not from user input. This system ingests uploaded PDFs and crawled circulars (§45, §119) and inserts their text into the model context (§28). A poisoned or malicious document in the corpus can instruct the model to misstate eligibility or exfiltrate profile data. This vector is not mentioned.

**Other absent controls:**

- No permission matrix for the five roles (Guest / Citizen / Moderator / Administrator / Super Admin) — the roles are listed and never defined.
- Rate limiting says "Redis" with no numbers. An unauthenticated or cheaply-registered `POST /chat` hitting a paid LLM is a wallet-drain DoS. §128 treats API cost as a *business* risk, never as an *abuse* vector.
- JWT: no rotation, no revocation/denylist, no storage guidance (httpOnly cookie vs. localStorage), no invalidation on password reset or role change.
- Admin can *"Update Rules"* (§Feature 20) via `PATCH /admin/program` with no approval workflow endpoint — despite §Feature 20 also listing "Approve Data Changes." A single compromised or careless admin account can silently change eligibility guidance nationwide with no four-eyes check and no audit trail.
- "Virus scan" names no product and defines no quarantine flow.
- No abuse cases at all: scraping the corpus, enumerating users, poisoning feedback, adversarial profile manipulation to farm recommendations.

**Fix:** Write an actual threat model (STRIDE over the data flows in §19 and §38). Treat all retrieved content as untrusted: structural isolation, provenance tagging, output constraints. Publish the RBAC matrix. Publish rate-limit numbers per endpoint per role. Require two-person approval plus immutable audit for any eligibility-rule change.

---

### 14. Six sprints to "production candidate," no team, and zero allocation for the data work — CRITICAL (feasibility)

**Evidence:** §92. Sprint 1: monorepo + CI/CD + auth + landing page + user profile. Sprint 2: AI chat + streaming + history + prompt management. Sprint 3: opportunity DB + search + recommendation cards. Sprint 4: eligibility engine + rule system + explanation engine. Sprint 5: timeline + notifications + saved + maps → *"Complete MVP."* Sprint 6: admin panel + analytics + testing + performance → *"Production candidate."*

No team size. No role composition. No sprint duration. No estimates. **No sprint anywhere contains content curation, rule authoring, source verification, or corpus construction** — the largest and least parallelizable work item in the entire project.

Compounding this, §98's Definition of Done requires, *per feature*: unit tests, passing integration tests, error handling, loading states, accessibility check, mobile+desktop responsive, logging, and code review.

**Why it matters:** Sprint 3 alone — a hybrid retrieval system with a weighted ranker over a corpus that does not exist — is a multi-month effort for a competent team. The plan is a wish list with sprint headers attached.

**Consequences:** The team will ship Sprints 1–2 (the commodity parts), demo a chat window, and have no verified corpus, no working rule engine, and no eligibility explanations — i.e., none of the differentiators. That is precisely the failure mode §116 warns against: *"Demonstrated end-to-end functionality rather than mockups."*

**Fix:** State team size, roles, and sprint length. Add a parallel content track with named owners from day one. Cut MVP scope to one life event, one district, and ten programs, end-to-end and genuinely verified. Depth over breadth wins this category.

---

### 15. Caching strategy is either useless or a PII leak — HIGH

**Evidence:** §44 caches *"AI response cache,"* *"Conversation summaries,"* *"User preferences,"* *"Embedding search results."* §128 relies on *"Response caching"* as the primary mitigation for high API cost. No cache key strategy, no TTL, no invalidation trigger.

**Why it matters:** Responses are personalized on a full profile by design. If the cache key includes the profile, hit rate approaches zero and the cost mitigation evaporates. If it does not, one citizen receives another citizen's eligibility answer — a personal-data breach involving disability and income. There is no third option that isn't specified.

Separately: no invalidation on program or rule change means a policy update leaves stale "you are eligible" answers being served with a confidence badge attached.

**Fix:** Cache only the deterministic sub-layers — embeddings, retrieval result sets keyed on normalized query + filters, rendered program content. Never cache a personalized generation. Define explicit invalidation on `opportunities.updated_at` and `eligibility_rules.version`. Then re-derive the cost model without the caching assumption.

---

### 16. The stated color palette fails the stated WCAG AA requirement — MEDIUM (but concrete and embarrassing)

**Evidence:** §52 requires *"Accessibility (WCAG AA)."* §55 specifies Warning `#F59E0B` and Success `#16A34A` on Surface `#FFFFFF`.

**Measured contrast against `#FFFFFF`:**

| Token   | Hex         |           Contrast | AA normal text (4.5:1) | AA UI/large (3:1) |
| ------- | ----------- | -----------------: | ---------------------- | ----------------- |
| Warning | `#F59E0B` | **2.16 : 1** | ❌ Fail                | ❌ Fail           |
| Success | `#16A34A` | **3.30 : 1** | ❌ Fail                | ✅ Pass           |
| Danger  | `#DC2626` |           4.92 : 1 | ✅ Pass                | ✅ Pass           |
| Primary | `#2563EB` |           5.17 : 1 | ✅ Pass                | ✅ Pass           |

**Why it matters:** Two of four semantic colors fail the document's own accessibility requirement, in the one section where the document is specific enough to be checked. Success/Warning are exactly the tokens that will carry eligibility status — the highest-stakes information on the screen — for a user base that explicitly includes visually impaired citizens (§Feature 15).

**This finding is diagnostic beyond its own severity:** wherever the document becomes checkable, it turns out not to have been checked. That is reasonable grounds to discount the unverifiable claims elsewhere.

**Fix:** Darken to approximately `#B45309` (warning) and `#15803D` (success) for text/icon use, keep the bright values for large fills only, and add an automated contrast test to CI.

---

### 17. The REST API omits roughly 40% of the feature surface and is internally inconsistent — HIGH

**Evidence:** §42.

**Missing endpoints for shipped features:** Action Plan (create/read/update tasks), Timeline, Saved Opportunities (the `SavedOpportunities` table has no CRUD endpoints at all), Feedback submission (§34), Nearby Services / map data, Search filters, Life-event lookup, Admin approval workflow.

**Defects in what is specified:**

- `PATCH /admin/program` and `DELETE /admin/program` carry **no `:id`** — the operations are unaddressable.
- `PATCH /notifications/read` — marks *which* notification? No id, no body contract.
- `GET /auth/me` and `GET /users/me` duplicate each other.
- No pagination, sorting, or filtering contract on any collection endpoint.
- No idempotency key on any POST.
- No streaming contract (SSE or WebSocket) despite streaming being a Sprint 2 deliverable and a §61 capability. `POST /chat` is specified as a plain POST.
- §42 lists every path **unversioned**; §89 mandates `/api/v1/…` *"from the start."* Direct internal contradiction.

**Fix:** Regenerate the API surface from the feature list, not from memory. Add the streaming contract explicitly. Reconcile versioning.

---

### 18. Two irreconcilable ICPs are being served by one MVP — HIGH (product)

**Evidence:** Target users (§8) span *Farmers, Women, Elderly Citizens, Persons with Disabilities, Low Income Families* **and** *Students, Researchers, Entrepreneurs*. §Feature 9 requires CGPA, IELTS/TOEFL scores, preferred country, and research interests. The competition demo (§126) selects the graduate-seeking-a-master's-abroad.

**Why it matters:** These two segments share essentially nothing:

|                           | Widow / farmer / elderly                   | Study-abroad graduate                      |
| ------------------------- | ------------------------------------------ | ------------------------------------------ |
| Language                  | Bangla, often spoken only                  | English-proficient                         |
| Device / channel          | Feature phone, shared device, UDC operator | Personal smartphone/laptop                 |
| Trust model               | Needs institutional endorsement            | Self-serve is fine                         |
| Competition               | 333 helpline, UDC operator, word of mouth  | Dozens of scholarship aggregators, ChatGPT |
| Differentiation available | **High**                             | **Very low**                         |
| Social-impact story       | **Very strong**                      | Weak                                       |

The demo deliberately showcases the segment with the weakest differentiation and the strongest existing competition, while the mission statement (*"regardless of education, location, language, or digital literacy"*) centers the other.

**Consequences:** Feature 9 (scholarships) requires a wholly separate editorial pipeline for foreign institutions whose rules change annually — a permanent operating cost serving the segment that needs the product least. The demo will invite the question "how is this better than ChatGPT for scholarships?", which is the one comparison AccessAI most easily loses.

**Fix:** Pick the underserved segment. Demo the widow or the flood-affected farmer. Defer scholarships entirely — the strategic case for building them first is not made anywhere in the document.

---

### 19. No distribution strategy for users defined by their inability to find things — HIGH (product)

**Evidence:** The product is a Next.js web app behind registration (§57: Landing → Authentication → Dashboard). Notifications ship Push + Email; **SMS and WhatsApp are deferred to "Future"** (§Feature 14, §54). Union Digital Centres are named as a source of the problem (p.3) and never as a channel.

**Why it matters:** The problem statement is that these citizens cannot discover things online. The solution requires them to discover a website online, register, and complete a profile. The stated primary channels — web push and email — have low penetration among the stated primary users. SMS, the one channel that reaches them, is explicitly out of scope. This is inverted.

The obvious wedge is sitting in the document unrecognized: ~5,000 UDCs with trained operators who already serve exactly this population. An operator-facing tool has a distribution channel, an institutional trust transfer, and a government partnership path built in.

**Fix:** Add a distribution section. Seriously evaluate an operator-assisted mode as the primary v1 surface. Move SMS into MVP or justify in writing why the highest-reach channel is deferred.

---

### 20. The document contains its own favorable review, and leftover conversational asides — MEDIUM (credibility)

**Evidence:**

- p.47, mid-document, between Parts 3 and 4: *"Good. This is the most important engineering section. If an AI editor (Cursor/Codex/Claude Code) receives only this section, it should be able to scaffold almost the entire backend."*
- p.69: *"Excellent. This section defines **everything the user sees and interacts with**."*
- p.107: *"Excellent. This is the final and most strategic section."*
- p.116, "Overall Assessment": the document assesses itself as *"strong"* and lists its own strengths, then advises itself on maximizing competitiveness.

**Why it matters:** These are unedited generation-time asides and a self-authored grade, shipped inside the deliverable. A reviewer reading p.47 learns that the document was produced conversationally and never proofread end-to-end. The self-review on p.116 is worse: a specification that grades itself favorably has inverted the relationship between artifact and evaluator, and it primes every reader to discount the document's other confident assertions.

**Fix:** Delete all four. Never ship a self-assessment inside a spec. If an assessment is wanted, obtain it externally — as here.

---

## Ambiguity Audit

Every statement below is currently unimplementable and untestable as written.

| #  | Quote                                                                      | Location         | Why it fails                                                                                         | Information required                                                                                                   |
| -- | -------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1  | *"Maintain response accuracy above predefined evaluation thresholds"*    | §11             | Self-referential — the thresholds are never defined anywhere in the document                        | Numeric target per metric, the labeled eval set, the scoring method, the pass/fail gate                                |
| 2  | *"Recommendation precision > predefined target"*                         | §129            | Same defect, restated as a KPI                                                                       | As above                                                                                                               |
| 3  | *"Responds within 3 seconds"*                                            | §Feature 1      | No percentile, no measurement point, and it conflicts with streaming                                 | p50/p95/p99, TTFT vs. full completion, network conditions, payload size                                                |
| 4  | *"Handles incomplete sentences"*                                         | §Feature 1      | No definition of "handles"; no pass criterion                                                        | A test corpus of N malformed inputs with expected behaviors                                                            |
| 5  | *"Maintains conversation context"*                                       | §Feature 1      | Over how many turns? Under what summarization loss?                                                  | Turn depth, token budget, summarization trigger, a coreference test set                                                |
| 6  | *"Requests clarification when necessary"*                                | §Feature 1      | "Necessary" per what rule?                                                                           | The missing-field predicate per program, and a max-questions-before-partial-answer limit                               |
| 7  | *"Operate with minimal hallucination"*                                   | §11             | Unmeasured and unbounded                                                                             | Definition of a hallucination event, a labeling protocol, a numeric ceiling                                            |
| 8  | *"Partially Eligible"*                                                   | §Feature 3      | Never defined                                                                                        | Rule-match threshold, or a per-program declaration of which rules are hard vs. soft                                    |
| 9  | *"Unknown"*                                                              | §Feature 3      | Listed as an output state, never specified                                                           | The three-valued truth table; propagation rules for null inputs                                                        |
| 10 | `Income < Threshold`                                                     | §24             | `Threshold` exists in no table                                                                     | Where thresholds live, who sets them, how they version with policy changes                                             |
| 11 | *"Confidence: 100"* / *"96%"* / *"95%"*                              | §24, §32, §62 | Three different quantities all called "confidence," no formula for any                               | A single defined formula, its inputs, its range, and a user-comprehension test                                         |
| 12 | *"Store rules as JSON"*                                                  | §40             | Not a schema                                                                                         | JSON Schema, operator grammar, examples, validation                                                                    |
| 13 | *"Sanitize user prompts"*                                                | §48             | Not a control                                                                                        | Specific technique, the actual threat it addresses, and coverage of the retrieved-document vector                      |
| 14 | *"Every recommendation receives a relevance score"*                      | §Feature 4      | No range, no normalization, no relationship to the §31 weights                                      | Score range, normalization per factor, tie-breaking, the categorical→scalar mapping for eligibility                   |
| 15 | *"Eligibility Match 40% / Popularity 10% / Similar User Success 10%"*    | §31             | Weights invented with no derivation; two inputs have no data source                                  | Where these weights came from, cold-start behavior, and the equity implications of "Popularity" in benefits allocation |
| 16 | *"Rebuild Search Index"*                                                 | §Feature 20     | One-click reindex on a production vector store — no cost, duration, or availability impact stated   | Estimated duration, cost, whether search degrades during rebuild, concurrency guard                                    |
| 17 | *"Virus scan"*                                                           | §48             | No product, no flow                                                                                  | Scanner, quarantine behavior, failure mode, false-positive handling                                                    |
| 18 | *"Encrypt sensitive data at rest"*                                       | §121            | Which fields? Which mechanism?                                                                       | Field list, envelope encryption vs. full-disk, key management and rotation                                             |
| 19 | *"Disaster recovery testing"* (monthly), *"Backup databases"* (weekly) | §119            | No RPO/RTO; weekly backups imply up to 7 days of data loss                                           | RPO, RTO, backup frequency and retention, restore-drill acceptance criteria                                            |
| 20 | *"Deployment should stop automatically if any stage fails"*              | §94             | This prevents bad deploys; it is not rollback                                                        | Rollback mechanism, DB migration reversal strategy, canary/blue-green, health-check criteria                           |
| 21 | *"GPT-5.5 or latest suitable model"*                                     | §118            | Names a model that is not a documented product, plus an undefined selection criterion                | Actual model per pipeline stage, with cost and measured latency                                                        |
| 22 | *"Voice Assistant"* in MVP scope                                         | §10 vs. §125   | §10 puts voice in MVP; the Phase 2 roadmap lists*"Voice-first experience"*; no sprint contains it | Resolve the contradiction; if MVP, name the ASR/TTS vendor and the Bangla WER target                                   |
| 23 | *"Approve Data Changes"*                                                 | §Feature 20     | An approval workflow with no states, no roles, and no API endpoints                                  | State machine, approver role, SLA, audit record, endpoints                                                             |
| 24 | *"Distance"* on recommendation cards                                     | §62             | No user coordinates and no opportunity coordinates exist in the schema                               | Geolocation capture and consent, opportunity/office coordinates, distance definition (straight-line vs. travel)        |
| 25 | *"Never ask users for information already known"*                        | §21             | Conflicts with data freshness — income and marital status change                                    | Per-field staleness TTL and a re-confirmation policy before any eligibility determination                              |
| 26 | *"Maximum three levels of navigation"*                                   | §79             | §57 presents an eleven-step linear chain as the navigation structure                                | An actual IA tree distinguishing hierarchy from user flow                                                              |

---

## Assumption Audit

| #  | Assumption                                                                                                                          | Stated or Implied                  | Supporting evidence in document                                                                                         | Risk if wrong                                                                                       | Confidence                                               |
| -- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1  | Underutilization of public services is caused primarily by*discoverability*, not by application friction or genuine ineligibility | Implied throughout §2–§4        | **None**                                                                                                          | Fatal — the product solves a non-bottleneck and impact metrics read zero                           | **Low**                                            |
| 2  | Verified, machine-readable eligibility rules can be obtained or authored for a useful number of programs                            | Implied by §Feature 3, §24, §40 | **None** — this is exactly what missing Part 7 would have covered                                                | Fatal — no rules means no product                                                                  | **Very low**                                       |
| 3  | Government/NGO source content may be lawfully ingested, stored, and redistributed                                                   | Implied by §45, §119             | **None** — no licensing, permission, or ToS analysis. Note §2 lists *"Facebook announcements"* as a source    | High — takedown risk and a blocked partnership path                                                | **Low**                                            |
| 4  | Program data can be kept current by*"Daily automated tasks"*                                                                      | Stated, §119                      | **None** — government PDFs are unstructured, irregular, and often posted without versioning                      | High — stale eligibility guidance is actively harmful and destroys the trust premise               | **Low**                                            |
| 5  | An LLM can extract eligibility-grade entities from Bangla free text reliably enough to feed a rule engine                           | Implied by §19, §20 Module 3     | **None** — no benchmark, no accuracy target, no Bangla evaluation                                                | High — deterministic engine over unreliable inputs (Finding 5)                                     | **Low**                                            |
| 6  | Target users will register, complete a profile, and disclose income, marital status, and disability to a private web app            | Implied by §59, §68              | **None** — no trust research; the document elsewhere argues these users distrust AI output (§3 "Lack of Trust") | High — registration-gated funnel collapses at the profile step                                     | **Low**                                            |
| 7  | Web push + email are adequate notification channels for the stated user base                                                        | Implied by §Feature 14            | **None** — SMS deferred to "Future"                                                                              | High — the retention engine (§Feature 13, "proactive AI") does not reach the user                 | **Very low**                                       |
| 8  | 3-second end-to-end latency is achievable on the §19 serial pipeline                                                               | Stated, §11, §Feature 1, §129   | **None** — no budget, no benchmark, no model named                                                               | Medium — degrades the headline experience; the requirement is untestable regardless                | **Low**                                            |
| 9  | Six sprints suffice to reach a production candidate                                                                                 | Stated, §92                       | **None** — no team size, no estimates, no duration, no data-track allocation                                     | High — the differentiating sprints (3, 4) slip and only the commodity chat ships                   | **Very low**                                       |
| 10 | Sending citizen disability/income/medical data to a foreign LLM API is legally and politically acceptable                           | Implied by §28, §118             | **None** — no privacy law of any jurisdiction is named                                                           | High — blocks government partnership; potential regulatory exposure                                | **Low**                                            |
| 11 | Government agencies will eventually pay for this (§123 "Government service contracts")                                             | Stated, §123                      | **None** — no procurement path, no cycle length, no champion, no pilot commitment                                | High — no revenue and no sustaining funder                                                         | **Very low**                                       |
| 12 | a2i / the existing national digital-service apparatus will not build or already operate this                                        | **Not stated at all**        | **None** — no incumbent is named anywhere                                                                        | Fatal — the strongest competitor is also the most likely partner and is unanalyzed                 | **Very low**                                       |
| 13 | Showing a numeric confidence score increases citizen trust                                                                          | Implied by §Feature 19            | **None** — and it conflicts with §7 Principle 5 (*"understandable by someone with basic education"*)          | Medium — a confusing UI element on the highest-stakes screen                                       | **Low**                                            |
| 14 | pgvector + Postgres FTS is sufficient for hybrid retrieval at national scale, in Bangla                                             | Stated, §37                       | Benefits listed (*"simpler deployment, lower cost"*) but no scale, corpus size, or Bangla analysis                    | Medium — pgvector is a defensible v1 choice; the*Bangla FTS* half has no implementation          | **Medium** (English) / **Very low** (Bangla) |
| 15 | Users will self-report application outcomes, populating the Opportunity Tracker and impact KPIs                                     | Implied by §Feature 18, §129     | **None** — no incentive design, no assumed response rate                                                         | Medium — impact reporting is unevidenced; a ranking factor stays permanently null                  | **Very low**                                       |
| 16 | Prompts stored as versioned markdown templates constitute prompt management                                                         | Stated, §90                       | Benefits asserted                                                                                                       | Low–Medium — reasonable practice, but no evaluation harness means version changes ship unmeasured | **Medium**                                         |
| 17 | A modular monolith can be decomposed later without major rework                                                                     | Stated, §49                       | Asserted                                                                                                                | Low — a genuinely sound and well-justified choice, and one of the document's better decisions      | **High**                                           |

---

## Red Team Review

### Principal Engineer

> "Show me the `rule_json` schema. That's the deterministic core of the product and §40 gives me a column name and the sentence 'Store rules as JSON.' Second: `Opportunities` has no geography column, yet Location is 15% of the ranker and 'Distance' is on every card. Where does that number come from? Third: your architecture diagram has a Knowledge Graph box, your schema has no graph, and your stack list has no graph technology — is that box real? Fourth: 'Responds within 3 seconds' at what percentile, measured to which event, across a pipeline with at least three sequential model calls? Fifth: your caching strategy either has a zero hit rate or leaks one citizen's profile-derived answer to another — which one did you intend? Sixth: the status enum in §18 has eight values and §40 has five. Which is it? I can't approve implementation from this."

### Security Engineer

> "There is no threat model. §48 is a hygiene checklist. Concretely: you send disability, income, marital status, and medical condition to a foreign LLM on every turn and the word 'consent' does not appear in 116 pages. Your prompt-injection control is 'sanitize user prompts,' which misses the real vector — you ingest third-party PDFs and inject their text into the model context; that content is untrusted and unhandled. You list five roles and define zero permissions. A single admin can rewrite national eligibility rules via `PATCH /admin/program` with no id parameter, no approval gate, and no audit table. Rate limiting says 'Redis' with no numbers on an endpoint that spends money per request. I would block this at design review, and I'd block it again after the fix if the privacy analysis were still missing."

### Product Manager

> "Who is this for? §8 lists twelve segments and the demo picks the one with the weakest differentiation and the most competition. Where's the research? Not one interview, not one number. How does a rural widow *find* a Next.js app that requires registration — and once she does, why does she disclose her income to it? You named Union Digital Centres as a problem and never once as a channel; that's your distribution strategy sitting unrecognized in your own problem statement. You defer SMS — the only channel that reaches your primary users — to 'Future,' while shipping web push. And you're measuring 'Successful Application Rate' for a product that explicitly cannot submit applications. Cut to one life event, one district, ten programs, verified. Everything else is decoration."

### Operations Lead

> "No RPO. No RTO. Weekly backups mean I can lose seven days. 'Deployment stops if a stage fails' is not a rollback plan — how do I reverse a destructive migration at 2am? No SLOs, no error budgets, no alert thresholds, no on-call rotation, no runbooks, no severity definitions, no incident process. 'Rebuild Search Index' is a button in the admin panel with no stated duration, cost, or availability impact — someone will press it during peak. §119 lists daily jobs that regenerate embeddings with no cost ceiling and no failure handling. And I have no cost model at all, so I cannot tell you what a 10× traffic day does to the bill."

### Compliance Officer

> "You process special-category personal data — health, disability, financial hardship, widowhood — about identified individuals, and you name no legal framework in the entire document. No lawful basis. No consent record. No DPIA. No retention schedule. No data residency position. No processor agreement with the AI vendor. §69 offers 'Export Data' and 'Delete Account' as settings toggles with no deletion semantics — does deletion purge conversation logs, the embedding store, the analytics warehouse, and the vendor's retained context? You also make eligibility determinations that citizens will act on, in the legal aid and healthcare domains, with no disclaimer requirement anywhere in the UI spec. This does not clear a government partnership review in its current form."

### Investor

> "There is not one currency figure in 116 pages. Not a cost per conversation, not an infrastructure estimate, not a headcount, not a CAC. Your core product is free by design and your revenue plan is a six-item bullet list of government contracts with no pricing and no procurement path. You did not name a single competitor operating in your market — and there are several well-funded, state-backed ones, one of which is your most likely acquirer and your most likely killer. Your riskiest and most expensive activity, building the verified corpus, is the one section you did not write. Your six-sprint plan has no team attached. I'd take a meeting on the life-event insight. I would not fund from this document."

### Potential Customer (a citizen, and a ministry)

> **Citizen:** "It told me I qualify — 96% — and I spent a day's wages travelling to the office, and they said no. Why should I believe the next thing it says?"
> **Ministry:** "Who is accountable when it misstates a benefit rule? Where is our approval over content published in our name? Where is our citizens' data stored, and under whose jurisdiction? What happens to this service when your funding ends? And — we already run the 333 helpline; what does this do that 333 does not?"

---

## AI Sloppiness Audit

### Score: **78 / 100**

*(0 = human-level specificity and rigor; 100 = overwhelmingly generic and ungrounded)*

The document is not slop in the sense of being incoherent — the structure is genuinely good and the component inventory is largely correct. It scores high because it is **specific about everything cheap and vague about everything expensive**, and because generation artifacts survived into the deliverable.

**Evidence:**

1. **Unedited conversational asides shipped inside the document** *(strongest single signal)* — p.47: *"Good. This is the most important engineering section. If an AI editor (Cursor/Codex/Claude Code) receives only this section, it should be able to scaffold almost the entire backend."* Also p.69 (*"Excellent…"*) and p.107 (*"Excellent. This is the final and most strategic section."*). These are chat turns, not specification.
2. **The document reviews and praises itself** — p.116, "Overall Assessment," concludes the concept is *"strong,"* enumerates its own strengths, and advises itself on competitiveness. A spec containing its own favorable grade is a category error.
3. **Zero quantities in 116 pages** — no statistic, no citation, no currency figure, no benchmark, no dataset size, no headcount, no latency measurement. The only numbers present are design tokens (px, hex), invented ranking weights (§31), and illustrative percentages (96%, 95%) with no derivation.
4. **A hallucinated model name** — *"OpenAI (GPT-5.5 or latest suitable model)"* (§118). The hedge "or latest suitable model" is the tell: the author did not know and did not check.
5. **One-item-per-paragraph list padding** — §10 (Product Scope), §17 (Eligibility Inputs), §40 (entire schema), §62 (card fields), and roughly twenty other sections render single words as standalone paragraphs. This inflates a ~40-page document to 116 pages without adding information.
6. **The same idea restated five times as if each were new** — "explain every recommendation" appears as §7 Principle 2, §Feature 6 (Explainable AI), §30 (Explainable AI Layer), §36 (AI Principles), and §80 (UX Principles). Similarly, five overlapping and non-identical metrics lists: §11, §17, §35, §120, §129 — **none of which carries a single numeric target.**
7. **Duplicated content** — §1.3 "Product Overview" and §13 "Product Overview" are near-identical. §Feature 7's action plan example is reproduced verbatim in §64.
8. **Inconsistent terminology** — §38's diagram shows four boxes labelled "Service" (reading as microservices) while §37 and §49 specify a modular monolith. §42 lists unversioned API paths while §89 mandates versioning "from the start." §Feature 18 and §40 define the same status enum with different values. §10 scopes Voice for MVP; §125 places it in Phase 2.
9. **Depth allocated inversely to difficulty** — the document specifies a typographic scale to the pixel and a color palette to the hex digit (neither contrast-checked), then covers the eligibility rule engine — the deterministic core of the whole product — in one page ending with *"Store rules as JSON."* Part 7, the knowledge pipeline, was not written at all.
10. **Confident assertion in place of design** — *"Hybrid retrieval improves precision"* (§26) with no fusion method. *"Knowledge graphs allow indirect opportunity discovery"* (§27) with no traversal. *"This transforms AccessAI from reactive AI into proactive AI"* (§Feature 13) describing a calendar. *"This small change fundamentally transforms public service accessibility"* (§1.6).

**What keeps the score below 90:** the life-event framing is a genuine and well-articulated insight; the "rules decide, AI explains" principle is correct and consistently held; the modular-monolith and pgvector choices are defensible and justified; and Part 5 contains real, checkable specificity (which is how Finding 16 was even possible).

---

## Final Verdict

### Would this pass a high-quality hackathon judging panel?

**No — as a document.** It would place mid-pack on presentation and lose decisively on scrutiny. Three questions end it: *"Show me the verified data"* (Part 7 does not exist), *"How is this different from the 333 helpline"* (no incumbent is named), and *"What exactly does `rule_json` contain"* (unspecified). The document's own p.116 predicts this: judges will focus on *"whether the knowledge base contains real, verified data"* and *"demonstrated end-to-end functionality rather than mockups"* — and those are precisely the two areas the document leaves blank.

A **working demo could still win**, but only on a scope far narrower than this document proposes: one life event, one district, ten genuinely verified programs, real rule evaluation, real citations, in Bangla. This PRD points a team away from that and toward twenty features.

### Would you approve engineering implementation?

**No.** Blocking items: the rule DSL is undefined; the data model is missing tables for four shipped features and contradicts itself on a shared enum; ~40% of the API surface is unspecified; the latency requirement is untestable; the caching design is unsafe or useless; there is no threat model and no privacy analysis for special-category data leaving the country; and the schedule has no team, no estimates, and no allocation for the largest work item. Sprints 1–2 could start today on the commodity layer; nothing downstream is specifiable from this document.

### Would you invest based solely on this document?

**No.** Zero market sizing, zero cost data, zero unit economics, zero named competitors in the actual market, zero user evidence, no team, and the highest-risk workstream unwritten. The life-event insight is worth a conversation. The document is not.

### Three strongest aspects

1. **"Rules determine facts. AI explains facts."** (§18) — This is the correct architecture for a benefits-determination system and it is held consistently across Parts 1, 3, 4, and 8. It is a genuinely better instinct than most AI-for-government proposals, which put an LLM in the decision path. The critique in Finding 5 is that the trust boundary is drawn one stage too late — the principle itself is right.
2. **Life-event framing as the interaction model.** *"Instead of asking: Which government department are you looking for? The platform asks: Tell me what happened in your life."* (§1.6) — A real, non-obvious reframing of a real mismatch between institutional structure and citizen mental models. It is the most valuable idea in the document and, ironically, the one dressed up in the weakest technology claim ("knowledge graph"). Stripped of that inflation, it stands on its own.
3. **Deliberately boring, well-justified infrastructure choices.** Modular monolith over premature microservices (§49), pgvector over a separate vector database with stated reasons (§37), prompts as versioned files rather than inline strings (§90), versioned APIs from day one (§89). These reflect real engineering judgment and are the sections where the document reads as written by someone who has shipped software.

### Three most serious blockers

1. **The knowledge base does not exist and is not planned.** Part 7 is missing (Finding 1) and no sprint contains content work (Finding 14). Every trust claim, every differentiator, and the entire answer to "why not ChatGPT" rests on a verified corpus for which there is no source list, no licensing position, no authoring process, no reviewer, no cost, and no schedule. This is not a gap in the document — it is the absence of the product.
2. **No evidence, for anything.** No user research, no statistics, no competitor named in the actual market, no cost figure, no benchmark, no eval set (Findings 2, 3, 11). The problem may well be real, but this document does not establish it, and it does not establish that discoverability — rather than application friction — is the binding constraint. Building on that unvalidated premise risks a technically competent solution to a non-bottleneck.
3. **Legal and privacy exposure that blocks the only viable business model.** Special-category data on identified citizens flows to a foreign LLM with no consent framework, no lawful basis, no residency position, and no named regulation (Finding 8) — while positive eligibility determinations are shown to users with a confidence percentage and no disclaimer (Finding 5). The stated revenue plan is government contracts. This design does not survive a ministry's legal review, which means the business model and the technical design are in direct conflict.

---

### The single most valuable next action

Stop writing specification. Spend two weeks producing:

- **10 real programs**, sourced, with the source PDF archived, `rule_json` authored by hand, and a golden test file of 20 profiles per program with expected outcomes.
- **10 user interviews** at a Union Digital Centre, reporting where applicants actually fail.
- **One page of unit economics**: measured cost per conversation on the real pipeline.

Those three artifacts would answer more of this review than another hundred pages would, and they are the artifacts a judging panel, an engineering lead, a ministry counsel, and an investor each independently need to see first.

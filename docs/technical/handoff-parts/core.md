# AccessAI / Nagorik Sathi — Core Technical Handoff

**Evidence snapshot:** 2026-09-02, branch `feature/shebar-janala-phase-0-1-2`, commit `30a573efe137a203cae6cfc4cf2746945c87211b`.

**Evidence labels:** **Confirmed** means observed in executable code, configuration, schema, tests, or the inspected database. **Inference** means the conclusion follows from multiple confirmed facts but is not expressed as a formal contract. **Unknown** means the repository cannot answer the question. Existing documentation was used only as material to audit; it did not override implementation.

## 1. Executive system overview

**Confirmed.** AccessAI, branded in the UI as **Nagorik Sathi / Shebar Janala**, is a bilingual Bangla/English civic-service discovery and delivery application. It is implemented as one Next.js 15 application using React 19. The same application supplies server-rendered pages, client-side interactions, REST-like route handlers, authentication, staff administration, citizen workflows, AI-assisted conversation, civic reporting, programme eligibility, payments/ledger recording, and scheduled-maintenance handlers.

The application is a modular monolith. Its primary persistence layer is SQLite-compatible libSQL through Drizzle ORM. A checked-out development database contains 47 application tables plus Drizzle's migration table. Local runtime uses a file database; hosted runtime can use a `libsql:` or HTTPS/Turso endpoint. Cloudflare deployment uses OpenNext, a Worker, static assets, an R2 incremental cache, and optional images and self-service bindings.

Primary actors are anonymous visitors, residents/citizens, beneficiary-facing users, union staff, upazila officers, union chairpersons, donor representatives, moderators, and administrators. Capability decisions combine the user's account role with civic role/union assignments. Some controls are route/layout based, while API authorization is performed by server helpers.

The product corpus is seed-driven: 42 opportunities/programmes from 24 organizations, 327 service locations, 15 life-event categories, eligibility rules, document requirements, and knowledge chunks/graph edges. The checked-out database also includes demonstration users and civic/financial sample data. Because `data/` is ignored, this database must not be assumed to exist after a clean clone.

Operational readiness is mixed. All 789 automated tests pass, but production verification is currently red because TypeScript rejects two possibly-undefined accesses in `scripts/retrieval-eval.ts`. The lint script invokes the obsolete interactive `next lint` flow and is not suitable for CI. No CI workflow is present. The ledger verifier passes for its eight chained rows; the audit verifier passes for 23 chained rows, while 127 additional audit rows are legacy or unchained.

## 2. Repository map

| Area | Runtime responsibility | Production relevance |
|---|---|---|
| `src/app/` | Next.js layouts, pages, middleware-facing route hierarchy, and 58 API route files containing 84 handlers | Direct |
| `src/components/` | Design-system primitives and feature-specific client components for chat, opportunities, maps, issues, budgets, voice, staff, and navigation | Direct |
| `src/modules/` | Domain/application services: admin, AI, auth, budget, citizen, civic, eligibility, entitlements, identity, issues, knowledge, ledger, notifications, opportunities, oversight, places, recommendation, SMS, USSD, voice | Direct |
| `src/lib/` | Database client/schema, environment parsing, API/session helpers, cryptography, validation, i18n, query client, rate limiting, dates/formatting, and cross-cutting utilities | Direct |
| `src/lib/domain/` | Shared domain types and rule/status definitions | Direct |
| `src/messages/` and `src/i18n/` | Bilingual message catalog, locale projection, routing, and request configuration | Direct |
| `src/prompts/` | System/prompt material consumed by AI composition | Direct when AI mode is enabled |
| `scripts/` | Seed, build verification, AI/voice checks, retrieval evaluation, corpus generation, OSM cache clearing, and ledger audit | Operational/development; some are deployment gates |
| `tests/` | Vitest unit and jsdom tests | Verification, not runtime |
| `drizzle/` and `drizzle.config.ts` | SQL migration, metadata snapshot/journal, and schema-tool configuration | Deployment/data lifecycle |
| `data/` | Local SQLite databases; `accessai.db` is populated, `test.db` is empty | Local runtime only; ignored and not clone-stable |
| `public/` | Logo, icon, screenshot assets, and `_headers` | Direct static delivery; screenshots are documentation/demo evidence |
| `docs/` | Product, research, compliance, API, testing, architecture, and previous handoffs | Non-runtime; partially stale |
| `package.json`, lockfile, TypeScript/Tailwind/PostCSS/Next/Vitest configs | Dependency, build, compiler, style, and test definitions | Direct |
| `open-next.config.ts`, `wrangler.jsonc` | Cloudflare adapter/runtime deployment | Direct for Cloudflare |
| `.env.example`, `.env.local`, `.dev.vars` | Environment examples and local values | Runtime inputs; local value files are not authoritative deploy manifests |
| `.next/`, `.open-next/`, `.wrangler/` | Generated framework/build/deployment output | Regenerable; excluded from behavioral analysis |
| `node_modules/` | Installed third-party code | Vendor/regenerable; excluded from source analysis |
| `.git/` | Version-control internals | Repository metadata only |

## 4. File responsibility map

The dependency direction is normally `app route/page -> module service -> lib/db or integration adapter`. Components call local API routes through the shared client; server pages often call services directly. Domain types and validation schemas are shared across UI, routes, and services. Drizzle schema declarations are the persistence contract, while the sole SQL migration represents the initial deployed shape.

| Responsibility | Primary owners | Important leakage/coupling |
|---|---|---|
| Presentation and interaction | `src/app/**/page.tsx`, `src/components/**` | Some pages directly invoke module services, coupling presentation to persistence-aware service results. |
| Request parsing and HTTP contracts | `src/app/api/**/route.ts`, `src/lib/api/*`, validation schemas | A few routes cast query strings instead of validating them; raw audio/map/plain-text responses bypass the normal envelope. |
| Business logic | `src/modules/**` | Several services perform multiple writes without transactions. Some authorization policy is embedded in routes rather than one policy layer. |
| Data access | Drizzle calls inside module services; `src/lib/db/client.ts` and `schema.ts` | There is no separate repository layer; schema and query assumptions are distributed through services. |
| Authentication/session | `src/modules/auth/*`, session/API helpers, middleware, auth routes | Token-only staff/role guards coexist with live-user session loading, creating two authorization freshness models. |
| Authorization/civic scope | `src/modules/civic/*`, `requireRole`, `requireStaff`, route guards | Role, civic assignment, union scope, and administrator approval are not uniformly enforced. |
| Validation | Zod schemas near routes/modules plus explicit domain validation | Several enum-like query parameters are unchecked casts. |
| AI/retrieval | `src/modules/ai/*`, `knowledge/*`, `recommendation/*`, `prompts/*` | Provider behavior, knowledge indexing, confidence, and response composition form a high-coupling pipeline. |
| Integrations | AI/STT/TTS/NID/SMS/OSM/map tile/photo storage modules | Most have demo or local fallbacks; availability and production guarantees vary materially. |
| Background/maintenance | Admin job service and `/api/v1/admin/jobs`; operational scripts | Jobs are HTTP-triggered; no cron trigger is declared in Wrangler. |
| Audit/ledger integrity | Admin audit writer/verifier and ledger module | Direct audit inserts and later actor mutation bypass or threaten chain integrity. Writers assume serialized append behavior. |
| Configuration | `src/lib/config/env.ts` plus platform/config files | Safety validation exists but is never invoked; environment examples are incomplete. |

## 5. Exhaustive feature inventory

Status reflects current implementation, not roadmap prose.

| Feature | Actor and entry point | Implementation and dependencies | Status |
|---|---|---|---|
| Bilingual shell and localization | All users; localized app routes | Bangla/English catalog, locale routing, language switcher, BDS-based Tailwind theme | Fully implemented |
| Landing and public transparency | Anonymous; landing/transparency pages and public API | Static/product data plus aggregated transparency service | Fully implemented, transparency data is seeded/demo |
| Phone OTP registration | New user; auth registration flow | OTP challenge, demo/SMS delivery, PIN setup, profile/settings/session creation | Fully implemented; multi-write path is non-atomic |
| Phone/PIN login | Registered user; login page/API | PIN hash verification, five-attempt flat ten-minute lock, session/JWT cookies | Fully implemented |
| OTP/PIN recovery | Existing user; forgot/reset flow | OTP verification and PIN replacement | Fully implemented; provider-dependent delivery |
| Session renewal/logout/account deletion | Authenticated user; API/client refresh and settings | Refresh rotation with 20-second race grace; revoke/logout; confirmed deletion | Fully implemented with audit-chain caveat |
| Personal profile and preferences | Resident; profile/settings | Demographics, location, income/occupation, needs, accessibility, encrypted medical conditions, locale/notification preferences | Fully implemented |
| Identity and residence verification | Resident; identity page/API | NID format-only demo verification, residency/geofence checks, civic assignment | Partially implemented: external NID provider deliberately unimplemented |
| Opportunity catalogue/search/filter/detail | Visitor API or authenticated UI | Seed corpus, DB search/filtering, detail, requirements, locations | Fully implemented; UI is not anonymous despite public API |
| Personalized recommendations | Authenticated resident | Profile-to-rule mapping, eligibility engine, ranking, reason/explanation generation | Fully implemented against seeded rules |
| Eligibility evaluation | Resident/staff flows | Rule comparator engine and evaluation persistence | Fully implemented for supported comparator grammar |
| Saved opportunities/status history | Resident; saved UI/API | Save/remove/list, status transitions, history | Fully implemented |
| Action plans/tasks/timeline | Resident; opportunity/action workflow | Plan and task creation, task updates, timeline events | Fully implemented; creation sequence non-atomic |
| AI civic assistant | Resident; chat | Intent/NLU, retrieval, eligibility/recommendation, provider composition, confidence, conversation/message persistence | Fully implemented with provider/demo modes; external quality/availability dependent |
| Voice input/output and command confirmation | Resident; microphone/speak APIs and UI | Browser/local/provider STT, intent routing, confirmation, Bangla number handling, TTS/audio caching | Fully implemented with capability/provider-dependent behavior |
| Nearby places/map | Resident; nearby page/API | DB service locations, OSM/Overpass caching, tile proxy, Mercator logic | Fully implemented; configured non-OSM map providers are not selected by UI proxy |
| Civic issue reporting | Verified resident; issues and USSD | Issue creation, optional photo upload/moderation, geofence/union attribution, votes, history | Fully implemented; public simulator presents impersonation risk |
| Issue moderation/status workflow | Staff; issue detail/officer/leader views | State machine, moderator decisions, assignment, escalation/status history | Fully implemented |
| Union budget/allocation visibility | Resident/staff/leader; budget views/APIs | Allocation records, flags, public summaries, ledger anchoring | Fully implemented with sample data and non-atomic writes |
| Allocation flagging and escalation | Resident/staff | Flag records, escalation rules, notifications | Fully implemented; partial-write failure possible |
| Beneficiary/entitlement administration | Staff; beneficiary/entitlement routes | Enrollment, NID hash, programme linkage, entitlement/disbursement lifecycle | Fully implemented; enrollment/entitlement writes non-atomic |
| Tamper-evident financial ledger | Staff/system | Hash-chain append and verification script | Fully implemented; single-writer assumption |
| Donor organization and funding scopes | Donor/admin | Donor records, programme/region scopes, donor dashboard | Fully implemented; creation can leave partial scopes |
| Civic leader/officer oversight | Assigned civic roles | Union rollups, issue and allocation metrics, anomaly detection | Fully implemented over stored/sample data |
| Knowledge corpus/retrieval graph | Chat/admin jobs | Documents/chunks/edges, token retrieval, optional embeddings, reindex/rebuild | Fully implemented; retrieval quality has observed misses |
| Knowledge/rule/program administration | Moderator/admin | CRUD, version/publish, review queues and verification | Fully implemented, but approval boundaries are inconsistent |
| Organization administration | Staff | Create/update organizations and verification fields | Fully implemented; moderator can alter verification state |
| Administrative health/analytics | Staff/admin dashboard | Table/system summaries, job history, AI/search analytics | Fully implemented as application views, not external monitoring |
| Maintenance jobs | Staff API | Reindex, embedding rebuild, stale-data, notifications, retention, daily aggregation | Fully implemented as synchronous HTTP-triggered jobs; no scheduler configured |
| SMS demo outbox | OTP/USSD/demo flows | Demo provider persistence and provider abstraction | Fully implemented for demo; production provider requires credentials |
| USSD gateway callback and simulator | Feature phone user/gateway/anonymous simulator | Stateful menu sessions, callback secret, plain-text response contract | Fully implemented; simulator is experimental/demo exposure |
| Email notification | None | SMTP variables exist | Stubbed/unimplemented: no sending consumer |
| External NID validation | Resident identity flow | Configuration and interface exist | Stubbed: configured provider throws not-implemented error |
| Mapbox/Google map rendering | Nearby users | Environment fields exist | Dead/unused in active map path; OSM proxy is used |

## 6. User & System Workflow Map

### Registration and first session

**Actor/trigger:** new resident submits phone, OTP, identity/profile information, and PIN. **Preconditions:** phone not already registered; valid unconsumed OTP within five minutes and under five attempts. **Flow:** OTP challenge is verified and consumed; user, profile, settings, and session records are created; access and refresh cookies are issued; the user is redirected into the application. **State:** OTP becomes consumed, account/profile/settings/session rows appear. **Failure:** invalid/expired OTP, duplicate phone, invalid PIN/profile, database error, or SMS failure. Attempts and resend cooldown are enforced. **Recovery:** request/resend OTP and retry; a failure after OTP consumption may require a new OTP because the writes are not one transaction. **Outcome:** authenticated resident.

### Login, renewal, and logout

**Actor/trigger:** registered user submits phone/PIN. **Flow:** account lookup, active/lock checks, PIN verification, failed-attempt increment or reset, session creation, access/refresh cookies. Access expires in roughly 15 minutes; refresh rotation replaces the refresh token while allowing a 20-second race grace. Logout revokes the session and clears cookies. **Failure:** unknown phone, wrong PIN, inactive user, fifth failed attempt causing a flat ten-minute lock, expired/revoked refresh token, or cookie/origin problems. **Recovery:** wait for lock expiration, use OTP reset, or sign in again. **Important:** role-bearing access tokens can remain authoritative for token-only guards until expiry after a role change or session revocation.

### Discover, evaluate, save, and act on an opportunity

**Actor/trigger:** resident browses/searches or asks the assistant. **Flow:** opportunity query loads corpus data; profile is mapped to eligibility facts; active rules are evaluated; results are ranked and explained; user may save an opportunity, change its status, or create an action plan with tasks and timeline entries. **Data:** search/evaluation/save/history/plan/task/timeline records may be created. **Failure:** incomplete profile produces unknown/conditional outcomes; missing corpus/rules degrades relevance; invalid status can reach the saved query path because one query value is cast, not validated; plan child writes may partially fail. **Recovery:** complete profile, retry, or manually repair a partial plan.

### AI and voice conversation

**Actor/trigger:** authenticated user submits text or recorded speech. **Flow:** optional STT transcription; language/intent/entity parsing; conversation and user message persistence; profile/retrieval/eligibility/recommendation gathering; provider or demo response composition; confidence calculation; assistant message and AI log persistence; optional TTS. **External calls:** configured LLM/STT/TTS provider and, indirectly, retrieval embeddings. **Failure:** provider timeout/unavailability, malformed provider result, low-confidence retrieval, unsupported audio, or persistence error. The user message is persisted before later provider work, so a timeout can leave a recoverable conversation trace. **Recovery:** retry text/voice, fall back to typed interaction or demo/local mode, inspect `ai_logs` and messages. No generalized provider retry/backoff contract is evident.

### Identity/residency and civic issue report

**Actor/trigger:** resident verifies NID/residence, then files an issue through web or USSD. **Flow:** NID is normalized/format-checked in demo mode; residency/civic union is established; issue input and optional image are validated/moderated; union/geolocation and status are stored; history/notifications may follow staff action. **Failure:** configured real NID provider always fails as unimplemented; invalid coordinates/out-of-boundary residency; rejected/failed media moderation; object storage or DB errors; USSD session expiry. **Recovery:** correct identity/location, remove/replace image, retry, or use staff workflow. **Security-sensitive behavior:** the public simulator can drive workflows for a known phone without proving possession; the authenticated gateway callback depends on its shared secret.

### Staff issue triage and escalation

**Actor/trigger:** assigned staff/officer opens issue queue or detail. **Flow:** role/civic scope is checked, moderation and valid state transition are applied, status history records the change, escalation/notification paths may run, dashboards recalculate from stored state. **Failure:** stale token role, missing civic assignment, invalid transition, cross-union mismatch, or a later write failure after primary status change. **Recovery:** refresh/re-authenticate after role updates; retry or repair history/notification state. Policies are spread across route guards, civic helpers, and the issue state machine.

### Budget allocation, flag, escalation, and ledger

**Actor/trigger:** authorized staff records allocation/disbursement; resident/staff flags a concern. **Flow:** allocation or disbursement row is written; canonical payload is appended to the hash ledger; flags can produce escalation and notification records; public/role dashboards aggregate results. **Failure:** validation/scope denial, duplicate chain predecessor under concurrent append, or failure between the business row and ledger/escalation writes. **Recovery:** run the ledger audit, inspect allocation/flag/escalation records, and reconcile orphaned business rows manually. The repository has no transaction wrapping these sequences.

### Beneficiary, entitlement, and disbursement

**Actor/trigger:** staff enrolls a beneficiary and assigns benefit programme data. **Flow:** identity is hashed, beneficiary stored, entitlement created/updated, disbursement recorded, financial action anchored in the ledger. **Failure:** duplicate/logical identity, programme mismatch, invalid state, scope denial, or partial multi-write. **Recovery:** inspect beneficiary/entitlement/disbursement/ledger records and reconcile before retrying to avoid duplicates.

### Programme/rule/knowledge administration

**Actor/trigger:** moderator or administrator edits programmes, organizations, rules, or knowledge. **Flow:** data is created/updated; rule publication deactivates an old active version before inserting a new one; programme changes may trigger knowledge reindexing; review/verification paths record decisions and audit events. **Failure:** authorization inconsistency, invalid rule grammar, provider/index failure, or a failure between deactivate/update and replacement/reindex. **Recovery:** inspect active rule versions, document/chunk/edge state, job runs, and audit records; republish/reindex after correcting source data. Moderators can publish active rules and alter organization verification without the administrator-only knowledge-approval gate.

### Maintenance job execution

**Actor/trigger:** staff calls `/api/v1/admin/jobs`. **Flow:** selected task runs, records `job_runs`, and returns a synchronous result. Jobs include reindexing, embedding rebuild, staleness, notifications, retention, and daily aggregation. **Failure:** request timeout, partial database mutations, provider failure, or concurrent invocation. **Recovery:** examine `job_runs` and affected tables, then rerun an idempotent job where its implementation permits. **Unknown:** no production scheduler/owner is declared; Wrangler contains no cron trigger.

## 7. Architecture overview

**Confirmed architectural style:** server-centric Next.js modular monolith with feature modules and a shared relational database. Browser requests enter Next middleware/layouts and server/client pages. Client components call `/api/*`; route handlers authenticate, validate, and delegate to module services. Services query Drizzle/libSQL and call provider adapters. Asynchronous-looking work is mostly awaited inside the HTTP request; there is no queue worker in the repository.

**Stateful components:** libSQL/SQLite tables, auth cookies, USSD session rows, cached OSM places, uploaded issue media/object keys, R2 incremental build cache, and optional provider-side state. **Stateless components:** Next route/page execution and most calculation services. **Synchronous paths:** all route handlers and admin jobs. **External communication:** LLM/STT/TTS APIs, SMS provider, OSM/Overpass/tile sources, optional S3-compatible object storage, and configured libSQL/Turso. SMTP, Mapbox/Google rendering, and real NID verification are not active implementations.

**Critical dependency chain:** authentication and environment parsing underpin most protected APIs; DB availability is a system-wide single point of failure; corpus/rules underpin search, recommendations, and chat; civic assignments underpin staff scope; ledger/audit correctness depends on append ordering; external AI/voice services affect assistant quality but demo/local behavior can preserve portions of the product.

No file-level circular dependency was confirmed in the collected analysis. High-coupling areas are the AI/retrieval pipeline, authorization split between middleware/routes/services, civic scope across issue/budget/benefit modules, and the shared Drizzle schema imported by nearly every service.

## 12. Authentication & Authorization Model

Passwords are not used; users authenticate with Bangladeshi phone number plus a 4–6 digit PIN, with OTP for registration/recovery. OTP challenges expire after five minutes, permit five attempts, and have a 30-second resend cooldown. PIN hashes, OTP hashes, JWT signing, refresh secrets, field encryption, and phone/NID hashing are security-sensitive implementation areas.

The server issues access and refresh cookies as HTTP-only, `SameSite=Lax`, secure in production, and both currently use path `/`. A nearby comment saying the refresh cookie is endpoint-scoped is stale. Refresh tokens contain a JWT plus opaque secret and rotate; session rows support revocation and replacement.

Authorization has two important modes:

- Full-session loaders read the live user and reject inactive accounts; live role/profile data is available.
- `requireRole()` and `requireStaff()` accept access-token claims without reloading the user. Consequently, demotion, suspension, or logout-everywhere does not immediately remove access to handlers using these guards; the maximum observed window is the access-token lifetime, approximately 15 minutes.

Civic roles and union assignments add geographic/organizational scope. Tenant boundaries are therefore civic-union and donor-scope boundaries, not a generic tenant ID. Enforcement is route/service specific. Administrator-only approval exists for some knowledge review actions, but rule publication and organization verification updates do not consistently use it. This is current behavior, not an intended-policy claim.

## 15. Runtime & Deployment Model

**Required runtime:** Node.js `>=20.9`, npm dependencies from `package-lock.json`, and SQLite/libSQL. Local sequence derivable from scripts is `npm install`/`npm ci`, configure environment, `npm run db:push`, `npm run db:seed`, then `npm run dev`. Production Next runtime uses `npm run build` and `npm start`; Cloudflare uses `npm run preview`, `npm run deploy`, or `npm run upload` through OpenNext/Wrangler.

Next config packages the native libSQL dependency, adds security headers/CSP, and can load Cloudflare development bindings. OpenNext assigns its incremental cache to R2. Wrangler binds static assets, a self-service binding, R2 cache bucket, and images. It explicitly sets demo OTP/SMS/vision variables, including `OTP_DEV_ECHO=true`; this is unsafe for a real production deployment unless overridden.

SQLite pragmas for WAL, foreign keys, and busy timeout are initialized by the seed script, not application startup. In SQLite, foreign-key enforcement is connection-specific, so application connections cannot be assumed to enforce foreign keys solely because seeding enabled them. Hosted libSQL behavior must be verified separately.

There are no declared scheduled triggers, background queues, or CI/CD workflow files. The checked-out local DB and environment-value files are ignored artifacts and must not be treated as deployable configuration. Persistent storage comprises the configured libSQL database and optional object storage; local photo fallback and local database storage are host-filesystem dependent.

## 16. Testing map

**Confirmed run on the snapshot:** 26 Vitest files and 789 tests pass. Tests cover eligibility rule evaluation, AI intent/NLU/confidence, Bangla numeral/number parsing, voice routing/confirmation/listening screens, issue state/moderation, ledger hashing, field encryption, NID format behavior, civic/geofence/escalation logic, map/Mercator/Overpass behavior, anomaly detection, contrast/accessibility helpers, and selected DOM components.

Coverage is predominantly isolated unit/jsdom behavior. The repository does not contain end-to-end browser tests, full route/DB integration suites, migration upgrade tests, provider contract tests, authorization-matrix tests, concurrency tests, or transaction/partial-failure tests. Passing unit tests therefore does not demonstrate deployability or cross-module correctness.

`npm run typecheck` and `npm run build:verify` fail at `scripts/retrieval-eval.ts:98` and `:117` because an indexed value may be undefined. The application bundle compiled before the verification gate reached this failure, with a dynamic-dependency warning from `src/lib/db/client.ts`. `npm run lint` invokes an obsolete interactive `next lint` setup and is not an automation-safe lint gate. `db:reset` references missing `scripts/reset.ts`.

The retrieval evaluation measured Recall@1 85%, Recall@3 90%, and MRR 0.867; two Bangla queries failed to retrieve the correct programme in the top 30. These measurements are evidence about the inspected corpus/configuration, not a service-level guarantee.

## 17. Observability & Operations

Application observability is database- and log-centric: `ai_logs`, `job_runs`, `search_queries`, `analytics_daily`, `audit_log`, status-history tables, and console/server logs. Administrative screens expose health-like summaries, analytics, jobs, ledger verification, and programme verification. There is no confirmed metrics exporter, distributed tracing, external alert rule, uptime probe, error-reporting service, or dedicated unauthenticated health endpoint.

When something breaks, engineers should check, in order: HTTP/server logs; the relevant status/history table; `job_runs` for maintenance tasks; `ai_logs` and conversation/messages for assistant failures; session and OTP rows for authentication; `audit_log` and its verifier for administrative history; and `ledger_entries` plus `npm run ledger:audit` for financial integrity. Provider failures require provider dashboards/credentials that are outside the repository.

The ledger audit passed for eight rows. The audit-chain verifier passed for 23 chained rows, but the table contains 150 total rows. The remaining 127 entries are not covered by that verified chain and must not be represented as tamper-evident.

## 18. Error & Failure Behavior

- **Validation failures:** normally return structured 4xx envelopes; map/audio/USSD routes use raw or plain-text contracts. Some list filters are unchecked casts, so invalid values may produce empty/unexpected queries instead of validation errors.
- **Authentication failures:** missing/expired access cookies yield 401; refresh may rotate tokens and retry. Current client metadata retry can recurse repeatedly if refresh succeeds but the original request remains 401.
- **Authorization failures:** 403 or hidden UI entry points; stale access claims can temporarily preserve old privileges.
- **Database failure:** most requests fail without a cross-service recovery mechanism. Multi-write workflows can commit earlier rows and fail later rows because no transaction usage was confirmed.
- **External AI/voice/SMS/storage/map failure:** adapters return errors or use feature-specific demo/local fallbacks; retry behavior is not consistently centralized. Provider timeouts can leave already-persisted user messages.
- **Concurrency:** hash-chain writers read the current tail then insert. Unique predecessor constraints expose competing writers as failures, preventing a silent fork but requiring retry/serialization at the caller.
- **Audit failure:** some direct inserts are unchained. Account deletion nulls `actor_id` on retained audit rows; because actor data participates in the hashed payload, this can invalidate a previously valid chain.
- **Build/deploy failure:** typecheck currently stops the verified build. No CI prevents an operator from using a different, weaker command.

## 19. Technical debt and fragile areas

1. **Authorization freshness split:** token-only and live-user guards implement materially different revocation behavior.
2. **Non-atomic workflows:** business records, ledgers, histories, notifications, scopes, tasks, and indexes can diverge after partial failure.
3. **Hash-chain mutation/bypass:** direct audit inserts and post-hash actor nulling undermine a simple “all audit events are immutable” assumption.
4. **Single-process append assumption:** audit/financial chain construction needs serialization or transactional compare-and-insert under concurrency.
5. **Configuration without enforcement:** production-safety checks exist but are never called; examples omit many consumed variables.
6. **Broken release gates:** verified build fails, lint is interactive, reset script is missing, and no CI workflow defines the required gate.
7. **Provider placeholders:** real NID and email are absent; map-provider settings are unused; demo OTP/SMS/vision values appear in deploy config.
8. **Distributed policy:** role, civic scope, programme verification, and approval rules are spread across routes and services and are inconsistent.
9. **Database lifecycle ambiguity:** local DB is ignored, migration history table is empty in the inspected DB, and runtime does not initialize foreign-key pragmas.
10. **Large coupled catalogs/files:** message catalog, schema, seed corpus, voice provider, and admin/AI services have broad blast radii.
11. **Limited integration coverage:** authorization, persistence, providers, migrations, and partial failures lack end-to-end proof.

## 20. Documentation-vs-code audit

| Topic | Documentation says | Code actually does | Status |
|---|---|---|---|
| API size | 31 route files / 51 handlers | 58 route files / 84 handlers | Stale |
| Automated tests | Different docs state 119 or 685 tests | 26 files / 789 passing tests | Stale |
| Database size | Prior handoff states 47 tables ambiguously | 47 application tables plus `__drizzle_migrations` | Clarify counting |
| PIN lock | Progressive delay is described | Five failures produce a flat ten-minute lock | Contradiction |
| Production safety | Unsafe configuration prevents boot | `assertProductionSafety()` is not called | Contradiction |
| Role revocation | Mutations recheck live role | `requireStaff`/`requireRole` trust access claims | Contradiction |
| Refresh cookie scope | Comment says refresh endpoint only | Cookie path is `/` | Stale comment |
| Audit coverage | Staff/system actions are chained | Direct profile audit inserts are unchained; only 23/150 rows verify as chain | Contradiction |
| Opportunity anonymity | Catalogue/browser described as anonymous | API is public, UI sits in protected `(app)` routing/middleware | Partial mismatch |
| Object storage | One integration document calls it unused | Issue photo storage has S3-compatible implementation and local fallback | Stale |
| Environment template | Implies sufficient setup variables | Many AI, DB auth, encryption, provider, map, storage, SMTP, voice, USSD, and SMS variables are absent | Incomplete |
| Reset workflow | `npm run db:reset` is offered | Target `scripts/reset.ts` does not exist | Broken |
| Lint workflow | Lint script presented as normal gate | `next lint` starts interactive setup | Broken/stale |
| Scheduled maintenance | Jobs are described operationally | Only staff HTTP execution exists; no Wrangler cron | Operational gap |
| Documentation links | Relative links point to technical/source files | Reorganization left multiple links resolving to wrong locations | Broken |

## 21. Critical knowledge / danger map

1. Do not change user roles, session lifetime, or middleware under the assumption that all APIs reload the user; audit every use of `requireRole()` and `requireStaff()`.
2. Do not claim immediate revocation until access-token guards consult live session/user state or tokens are centrally deny-listed.
3. Do not update or delete fields included in audit/ledger hash payloads. Account deletion currently violates this rule for audit actors.
4. Route every new audit event through the chain writer; profile update is an existing counterexample.
5. Treat allocation, disbursement, beneficiary, entitlement, donor-scope, rule-version, registration, action-plan, and reindex workflows as non-atomic until transactions are added and tested.
6. Preserve status values and transition rules: dashboards, history, notifications, escalation, and eligibility explanations depend on their exact meanings.
7. Programme/rule edits affect search, retrieval chunks/edges, recommendations, eligibility, chat answers, and seeded verification—not just admin UI.
8. Civic union assignments are authorization boundaries. A list endpoint being scoped does not prove its detail endpoint is scoped.
9. Keep the public USSD simulator out of an uncontrolled production surface; callback secrecy does not protect the simulator.
10. Override/remove demo deployment values, especially `OTP_DEV_ECHO=true`, and explicitly call/enforce production-safety validation before launch.
11. Initialize and verify database pragmas on every applicable local connection; seed-time initialization is insufficient evidence.
12. Serialize or transactionally protect hash-chain appends; do not add concurrent writers casually.
13. Fix typecheck and establish non-interactive lint before trusting a release. `npm run build` alone is not the documented verified gate.
14. Do not expect `db:reset` to work, and do not assume the populated ignored SQLite DB will be present in another checkout.
15. Treat external NID, email, Mapbox/Google, and production SMS/AI/voice behavior as unverified until provider contracts and credentials are supplied.

## 22. Knowledge gaps

| Unknown | Why repository cannot answer it | Required clarification |
|---|---|---|
| Production hosting account, environments, domains, and release owner | No CI/CD workflow or environment inventory | Platform/operations owner |
| Production database URL, backup, restore, retention, and migration procedure | Secrets and managed-service policy are external | DBA/platform owner |
| Real provider accounts, quotas, SLAs, and escalation contacts | Credentials/contracts are intentionally absent | Vendor/procurement/operations owners |
| Legally approved OTP, NID, consent, retention, accessibility, and audit policies | Code shows behavior, not approval | Security, privacy, legal, government stakeholders |
| Intended moderator-versus-admin policy for rules and organization verification | Current enforcement conflicts with narrative docs | Product/security owner |
| Intended anonymous catalogue UX | Public API conflicts with protected UI | Product owner |
| Scheduler and maintenance-job cadence | No schedule is declared | Operations owner |
| Source-of-truth process and refresh cadence for 42 opportunity records | Seed source URLs exist but governance is external | Programme/content owner |
| Recovery objectives and acceptable partial-write remediation | No RPO/RTO/runbook | Technical/operations owner |
| Expected traffic/concurrency and ledger/audit writer topology | No load model or deployment scale definition | Architecture/platform owner |
| Whether checked-out sample data may contain sensitive real-world material | Provenance/classification is not encoded | Data owner |
| Critical human contacts | No reliable contact roster in source | Departing owner/management |

## 23. Final ownership guide

### First day

Read the environment schema, database client/schema, auth/session helpers, middleware, civic authorization module, route hierarchy, and package/deployment scripts. Run the tests and reproduce the typecheck/build failure. Create a clean local database from schema and seed rather than relying on `data/accessai.db`. Inventory which provider modes are actually enabled without printing secret values. Confirm who owns production infrastructure and data.

### First week

Trace one resident workflow and one staff workflow end-to-end through UI, route, service, schema, history, and audit. Review all 84 handlers against a role/civic-scope matrix. Reconcile the database migration with Drizzle schema and establish a tested migration/backup/restore process. Fix the typecheck errors, replace the lint command, and define CI gates. Exercise the provider fallbacks and run ledger/audit/retrieval checks. Decide the intended moderator/admin policy and anonymous catalogue behavior.

### Before major changes

Verify affected status machines, eligibility comparator grammar, bilingual catalog entries, seeded corpus invariants, API envelope exceptions, civic scopes, hash payload definitions, and all downstream consumers. Add transactions/idempotency for any expanded multi-write workflow. Test access immediately after demotion/revocation. Test migration both forward and against a realistic copy, then test rollback/restore. For AI/provider changes, record timeout, retry, cost, privacy, and fallback behavior. For financial/audit changes, run chain verification before and after representative concurrency and deletion cases.

### Critical contacts and external dependencies

No reliable human contact list exists in the repository. Ownership must be assigned for Cloudflare/OpenNext, libSQL/Turso, object storage, AI/STT/TTS, SMS/USSD gateway, NID authority integration, OSM/Overpass usage, legal/privacy, programme content, and incident response. Until named owners and contracts exist, these remain operational dependencies without a repository-defined escalation path.

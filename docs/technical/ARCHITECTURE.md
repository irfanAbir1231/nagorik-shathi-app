# Architecture

How the system is put together, and why each boundary is where it is.

---

## 1. Shape

A **modular monolith**. One Next.js 15 application, App Router, React 19, TypeScript strict.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│    Server Components render the page (no client JS to hydrate    │
│    a read). Client Components own only interaction.              │
└───────────────┬─────────────────────────────────────────────────┘
                │  fetch /api/v1/*        │  RSC payload
┌───────────────▼─────────────────────────▼───────────────────────┐
│  middleware.ts        locale resolution + route protection       │
│                       (Edge runtime, jose)                       │
├─────────────────────────────────────────────────────────────────┤
│  app/api/v1/**/route.ts        ADAPTER — parse, guard, serialise │
│  app/[locale]/**/page.tsx      ADAPTER — call service, render    │
├─────────────────────────────────────────────────────────────────┤
│  modules/**/*.service.ts       ALL BUSINESS LOGIC                │
│    no Request, no Response, no `next/*` import                   │
├─────────────────────────────────────────────────────────────────┤
│  lib/db  ·  lib/domain  ·  lib/format  ·  lib/security           │
├─────────────────────────────────────────────────────────────────┤
│  Drizzle ORM  →  libSQL (SQLite dialect)                         │
└─────────────────────────────────────────────────────────────────┘
```

**The one rule that matters:** business logic never imports from `next/*`. That is what makes the
PRD's NestJS target (§37) a controller swap rather than a rewrite — see
[DEVIATIONS.md](DEVIATIONS.md) §1. A route handler is 15–40 lines: parse with Zod, call a guard,
call one service function, wrap in the envelope.

```ts
// src/app/api/v1/chat/route.ts — the shape every handler follows
export async function POST(request: NextRequest) {
  return handle(async () => {
    const guard = await requireSession();                       // who
    if (!guard.ok) return guard.response;
    const limited = await guardRateLimit(request, 'ai', guard.session.userId);
    if (!limited.ok) return limited.response;                   // how often
    const body = chatSchema.parse(await request.json());         // what
    const result = await runTurn({ /* … */ });                   // the work
    return ok({ /* … */ }, { meta: { ai: describeAiMode() } });   // envelope
  }, 'chat:post');
}
```

### Directory layout

```
src/
  app/
    [locale]/                    bn | en — every page exists under both
      page.tsx                   landing: life-event grid, no auth
      login/ register/ forgot-pin/
      (app)/                     authenticated shell (nav, header, skip link)
        dashboard/ chat/ opportunities/[slug]/ saved/ timeline/
        nearby/ profile/ settings/ notifications/
        admin/                   overview, programs, organizations, rules,
                                 moderation, ai-logs, users
    api/v1/                      31 route files, 51 handlers
  components/
    primitives/                  the design-system layer (see §7)
    layout/ auth/ chat/ opportunity/ saved/ timeline/ nearby/
    profile/ settings/ notifications/ admin/ providers/
  modules/                       framework-free business logic
    auth/          auth.service.ts        OTP, PIN, sessions, rotation
    citizen/       citizen.service.ts     profile, saved, plans, timeline
    eligibility/   engine.ts              the deterministic core
                   profile-mapper.ts      DB row → engine input
    knowledge/     retrieval.ts           hybrid search
                   tokenizer.ts           bn + en tokenisation
    opportunities/ opportunity.service.ts listing, filtering, detail
    recommendation/ranker.ts              PRD §31 weighting
    ai/            nlu.ts                 deterministic understanding
                   conversation.service.ts the pipeline
                   response-plan.ts       WHAT to say
                   composer.ts            template rendering
                   confidence.ts          PRD §32 scoring
                   providers/             anthropic | openai | simulated
    admin/         admin.service.ts       CRUD, verification, jobs
  lib/
    db/            client.ts schema.ts seed/
    domain/        enums.ts geography.ts rules.ts
    format/        numerals.ts dates.ts
    http/          response.ts session.ts rate-limit.ts cookies.ts
    security/      hash.ts tokens.ts
    validation/    schemas.ts
    jobs/          the five background jobs
  messages/        catalog.ts (one bilingual source) → bn.ts / en.ts
  prompts/         versioned templates
  i18n/            routing.ts request.ts navigation.ts
```

---

## 2. Request lifecycle

**A page request** (`GET /bn/opportunities`):

1. `middleware.ts` — `next-intl` resolves `bn`; the path is checked against `PROTECTED`; the access
   cookie is verified with `jose` (Edge-compatible). No session → `307` to
   `/bn/login?next=/opportunities`, preserving the destination. `/admin` with a citizen role →
   `307` to `/bn/dashboard?denied=admin`, so admin chrome never renders for the wrong role.
2. The Server Component calls `getFullSession()` and a service function directly — **no internal
   HTTP hop**. Reads do not round-trip through the API layer.
3. HTML streams. Client Components hydrate only where interaction lives.

**An API request** (`POST /api/v1/chat`):

1. `middleware` sees `/api` and returns immediately — API routes own their auth and must not be
   locale-rewritten.
2. `handle()` wraps the body so any throw becomes a logged 500 with a stable envelope and no stack
   trace reaching a citizen. A `ZodError` thrown anywhere inside becomes a 422 with per-field
   messages.
3. Guard → rate limit → Zod parse → service → `ok()`.

### Auth on both sides, deliberately

Middleware checks the token **signature and expiry only**. Every mutation re-checks the role in the
handler, because a 15-minute access token can outlive a demotion. `getFullSession()` additionally
re-reads the user row and treats a suspended or deleted account as signed out, so a stale token
cannot grant access for its remaining lifetime.

---

## 3. Data model

31 tables. The full definitions are in [src/lib/db/schema.ts](../src/lib/db/schema.ts); this is the
map and the reasoning.

| Group | Tables |
|---|---|
| Identity | `users`, `user_profiles`, `user_settings`, `sessions`, `otp_challenges` |
| Knowledge | `organizations`, `opportunities`, `eligibility_rules`, `required_documents`, `service_locations`, `life_event_catalog` |
| Retrieval | `documents`, `document_chunks`, `knowledge_graph_edges` |
| Conversation | `conversations`, `messages`, `ai_logs` |
| Citizen journey | `saved_opportunities`, `saved_status_history`, `action_plans`, `action_plan_tasks`, `timeline_events`, `notifications` |
| Decisions | `eligibility_evaluations` |
| Governance | `knowledge_reviews`, `feedback`, `audit_log` |
| Operations | `search_queries`, `job_runs`, `analytics_daily`, `rate_limit_buckets` |

Four modelling decisions carry weight:

**Every `user_profiles` column is nullable.** This is not laziness — it is what makes three-valued
eligibility possible. A `monthlyIncome` of `NULL` means *not yet told us*, which is a different fact
from `0`. A schema with defaults would erase that distinction and the engine could no longer return
`unknown`.

**`eligibility_evaluations` stores a `profileSnapshot` and a `ruleVersion`.** A decision shown to a
citizen in March must still be explainable in June, after both their income and the rule have
changed. Without the snapshot the trace is unreproducible, and an unreproducible benefits decision
is not defensible.

**`opportunities` carries its provenance inline** — `verificationStatus`, `sourceUrl`, `sourceNote`,
`lastVerifiedAt`, `verifiedBy`, `reviewIntervalDays`, `version`. Trust is a property of the record,
not of a side table, because every read path needs it and a join that can be forgotten is a join
that will be.

**`ai_logs.groundingFailure`** is a boolean flag set when a response recommended something with no
citation behind it. It exists so the failure mode PRD §33 cares about is queryable, not just
hopefully absent.

### The rule AST

`rule_json` is validated by `ruleSetSchema` in [src/lib/domain/rules.ts](../src/lib/domain/rules.ts).
A rule set is a tree of groups (`all` / `any` / `none`) over leaf conditions:

```jsonc
{
  "requiredFields": ["gender", "maritalStatus", "monthlyIncome"],
  "root": {
    "op": "all",
    "children": [
      { "field": "gender", "cmp": "eq", "value": "female", "weight": 30,
        "reasonMet":    { "bn": "…", "en": "This allowance is for women." },
        "reasonFailed": { "bn": "…", "en": "This allowance is only for women." } },
      { "field": "monthlyIncome", "cmp": "lte", "value": 4000, "weight": 25, "soft": false },
      { "field": "district", "cmp": "in", "value": ["rangpur", "kurigram"], "weight": 10, "soft": true }
    ]
  }
}
```

Comparators: `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `in`, `nin`, `contains`, `containsAny`,
`exists`, `between`. `soft: true` means failing it yields `partially_eligible`, never
disqualification. `weight` drives both the ranking contribution and the order reasons are shown in.
`requiredFields` is what turns a missing value into `unknown` and into a follow-up question.

---

## 4. The conversation pipeline

This is the part of the system most likely to be built wrongly, so its ordering is fixed by
construction.

```
citizen message
      │
      ▼  nlu.ts — DETERMINISTIC. No model.
   locale detection (script-based), intent, life-event match over bn/en/Banglish
   keyword sets, entity extraction (age, income, district, gender, occupation…)
      │
      ▼  profile update — setIfAbsent only
   a value mentioned in passing NEVER overwrites one the citizen deliberately
   entered; medical conditions are stored only if shareHealthData is true
      │
      ▼  retrieval.ts — metadata pre-filter, then BM25 (+ optional cosine, RRF)
   scoped by district and life event, with a life-event-only fallback when the
   district scope returns nothing; returns [] rather than arbitrary rows
      │
      ▼  engine.ts — the rule engine decides. NO LLM. PRD §24.
      │
      ▼  ranker.ts — PRD §31 weights 40/15/15/10/10/10
      │
      ▼  response-plan.ts — WHAT to say is now FIXED, in data
   programmes, outcome, reasons, citations, next step, follow-up question
      │
      ├──▶ live provider  → renders the plan as fluent prose
      └──▶ composer.ts    → renders the SAME plan as template prose
      │
      ▼  persist: message + ai_log (prompt version, engine, latency,
         groundingFailure) + one eligibility_evaluation per programme
```

**Why this ordering is the architecture and not a detail.** Every fact the model is permitted to
mention is enumerated in the `ResponsePlan` before the model is called. If retrieval finds nothing,
the plan says so and **the model is not called at all**. There is no code path by which a language
model can introduce a programme, a threshold, or an amount that the deterministic layer did not
already establish. The live and simulated paths produce identical decisions, reasons, and
citations — only prose fluency differs. That is what makes the "Simulated AI" badge an honest
statement about degradation rather than a disclaimer on a different product.

### Confidence

`confidence.ts` implements the PRD §32 factors and then applies a **ceiling**:
`unverified_sample` cannot exceed **65%** regardless of how well every other factor scores, and
when the ceiling binds, the explanation for it is pushed to the front of the reason list. A high
number printed next to unverified content is precisely the false assurance §33 exists to prevent.
Verifying a record through the admin portal lifts the same query to 92% — observable, not asserted.

---

## 5. State management

| State | Where it lives | Why |
|---|---|---|
| Session identity | `httpOnly` `Secure` `SameSite=Lax` cookie, JWT | Not reachable from JS; verifiable at the edge |
| Server data (reads) | Server Components calling services directly | No client cache to invalidate, nothing to hydrate |
| Mutations + refetch | TanStack Query (`chat`, opportunity save/unsave) | Needs optimistic UI and retry policy |
| Ephemeral UI | React `useState` | Sheets, disclosure, focus |
| Theme / text scale / numerals | Cookie **and** `user_settings` row | Must be correct in the first server-rendered paint — no flash of the wrong theme — and must follow the citizen to another device |
| Toasts | `ToastProvider` context | Politeness level and dismissal are cross-cutting |

There is **no global client store**. `zustand` and `react-hook-form` were removed from
`package.json` once it was clear nothing imported them; declaring a dependency the code does not use
misrepresents the architecture.

TanStack Query defaults are tuned for a 2G connection (PRD §5 target):

```ts
staleTime: 5 * 60 * 1000,   // the knowledge base changes daily at most
retry: (failureCount, error) => { /* never retry 4xx; twice on network/5xx */ },
refetchOnWindowFocus: false // a refetch on tab focus is a wasted paid megabyte
```

---

## 6. Internationalisation

`next-intl` with `defineRouting` / `createNavigation` / `getRequestConfig`. Both locales are
prefixed (`/bn/...`, `/en/...`) with `bn` as default, so a URL is unambiguous and shareable.

**Parity is structural, not audited.** [src/messages/catalog.ts](../src/messages/catalog.ts) holds
every string once, as a `[bn, en]` tuple; `bn.ts` and `en.ts` are `project(catalog, 0)` and
`project(catalog, 1)`. A tuple missing a half is a **type error**, so the two locales cannot drift.

Bangla typography (BDS §4.2) is enforced in the token layer via `:lang(bn)` rather than at call
sites — line-height 1.60–1.80, a +1sp size uplift, no negative letter-spacing, no synthetic italics
or uppercase, conjunct-preserving OpenType features. A component author cannot forget it.

Numerals are Latin by default even in the Bangla UI (BDS §4.3), with a display-only Bangla toggle.
Month names and lakh/crore grouping are hand-written rather than delegated to `Intl`, because
`Intl.NumberFormat('bn-BD')` emits Bengali digits in most runtimes and would take the toggle's
control away from the user.

---

## 7. The component layer

`components/primitives/` is the design system as code. Each primitive implements the BDS §10
six-part contract — anatomy, states, sizes, behaviour, accessibility, don'ts — and the rules are
enforced structurally rather than documented:

- `FieldShell` **always renders the helper slot** with height reserved, so an error appearing never
  shifts the layout under the citizen's thumb.
- `TextField` has no `placeholder` prop that can act as a label. The label is always above and
  always visible.
- `Button` wraps to two lines rather than truncating; a truncated Bangla label can invert meaning.
- `Select` picks its own pattern from the option count: 2–5 → visible radios, 6–15 → bottom sheet,
  16+ → searchable sheet.
- `OtpInput` keeps digits visible, distributes a paste across boxes, steps back on backspace, and
  **never clears on error**.
- `Money` always renders `৳`, exactly two decimals, lakh/crore grouped, never abbreviated.
- `States` provides the four required states (loading / empty / error / success) with an icon **and**
  a word, never colour alone.

Motion honours `prefers-reduced-motion` and the in-app reduce-motion setting through the token
layer, so no component has to remember to check.

---

## 8. Security

- **scrypt** from Node core at N=2^15 for all secret hashing (PINs, refresh tokens). Not Argon2id
  (PRD §48/§121): that needs native code, which Cloudflare Workers — this app's deployment target —
  cannot run at all. See [DEVIATIONS.md](DEVIATIONS.md) §11.
- **Refresh-token rotation with reuse detection.** Presenting an already-rotated refresh token
  revokes the entire session family — the standard response to a stolen token, since the legitimate
  holder can sign in again but the thief cannot keep the family alive.
- **Access 15 min / refresh 30 days**, both `httpOnly`, split so a page load never needs the
  long-lived credential.
- **Token-bucket rate limiting** per scope: `auth` 10/min, `ai` 20/min, `default` 120/min. A bucket,
  not a fixed window, because a window permits a double-rate burst across its boundary.
- **PIN lockout is temporary and self-clearing** (10 minutes, progressive delay). A permanent
  lockout is where a low-confidence citizen leaves and does not return (BDS §10.2.5), and the
  locked screen offers the OTP path rather than a dead end.
- **Zod at every boundary**, including query strings, with per-field messages written for citizens.
- **`audit_log`** records every staff mutation with actor, entity, before/after, and reason.
- Health data is only persisted when `shareHealthData` is explicitly true.

---

## 9. Errors, jobs, and observability

Every response uses one envelope (`success`, `data` | `error`, `timestamp`, `requestId`), with a
stable machine-readable `code` separate from the citizen-safe `message` so the UI localises without
string-matching prose. Codes are enumerated in
[src/lib/http/response.ts](../src/lib/http/response.ts) and listed in [API.md](API.md).

Five idempotent jobs, each writing a `job_runs` row, invocable from the admin UI or by any external
scheduler: `reindex_search`, `rebuild_embeddings`, `detect_staleness`, `scheduled_notifications`,
`aggregate_analytics`. Two of them also run inline where staleness would be visible to a citizen —
opening the timeline reconciles deadlines and creates due reminders, so the screen is never stale
between runs.

`ai_logs` records, per response: engine (`live` vs `simulated`), provider, model, prompt version,
token counts, latency, retrieved chunk ids, confidence, and `groundingFailure`. The admin AI-log
screen reads it directly, which is how the trust claims in this repository can be checked rather
than believed.

# API reference

`/api/v1/*` — **31 route files, 51 handlers.** Every response uses one envelope; every input is
parsed by a Zod schema in [src/lib/validation/schemas.ts](../src/lib/validation/schemas.ts).

---

## Envelope

Success:

```json
{
  "success": true,
  "data": { },
  "timestamp": "2026-07-29T04:12:08.113Z",
  "requestId": "8f2c1e40-…",
  "meta": { "total": 42 }
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some of the information provided is not valid.",
    "fields": { "phone": "Enter an 11-digit number starting with 01. For example: 01712345678" }
  },
  "timestamp": "2026-07-29T04:12:08.113Z",
  "requestId": "1b7a…"
}
```

`code` is stable and machine-readable; `message` is safe to show a citizen. They are separate so the
UI can localise without string-matching prose. `fields` carries **one message per field** — the
first, because three messages under one input is noise.

### Error codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | **422** Zod / **400** unreadable body | Zod rejected the input (see `fields`), or the JSON body could not be read at all — a truncated request on a 2G connection is a client condition, not a 500 |
| `UNAUTHENTICATED` | 401 | No session, or the account is suspended/deleted |
| `FORBIDDEN` | 403 | Authenticated but outranked |
| `NOT_FOUND` | 404 | No such record, or not visible to this caller |
| `CONFLICT` | 409 | Duplicate slug, already-decided review, concurrent update |
| `RATE_LIMITED` | 429 | Bucket empty; `Retry-After` is set |
| `OTP_INVALID` | 400 | Wrong code |
| `OTP_EXPIRED` | 410 | The code aged out — semantically gone, not malformed |
| `OTP_ATTEMPTS_EXCEEDED` | 429 | Too many tries on one challenge |
| `PIN_INVALID` | 401 | Wrong PIN; the response says how many attempts remain |
| `ACCOUNT_LOCKED` | 423 | Temporary, self-clearing 10-minute lock; never permanent |
| `PHONE_NOT_REGISTERED` | 404 | Login for a number with no account |
| `PHONE_ALREADY_REGISTERED` | 409 | Registration for an existing number |
| `ELIGIBILITY_RULE_NOT_FOUND` | 400 | Programme has no active rule — PRD §50 names this code |
| `AI_UNAVAILABLE` | 504 | Provider timed out at 45 s; the message says the message was not lost |
| `INTERNAL` | 500 | Unexpected throw — logged with the `requestId`, never a stack trace to the client |

Auth statuses come from `STATUS_BY_CODE` in
[src/lib/http/auth-errors.ts](../src/lib/http/auth-errors.ts), which maps the domain `AuthError` onto
HTTP. The auth service itself throws domain errors and imports no framework types, so it stays
directly unit-testable.

### Rate limits

Token bucket in `rate_limit_buckets`, keyed by user id when signed in and by client IP otherwise.

| Scope | Limit | Applied to |
|---|---|---|
| `auth` | 10 / min | `auth/otp`, `auth/login`, `auth/register`, `auth/pin` |
| `ai` | 20 / min | `chat` (POST) |
| `default` | 120 / min | `opportunities`, `feedback` |

A 429 sets `Retry-After` from the bucket's own refill rate, so a client backs off by the real
remaining time rather than guessing.

---

## Authentication

Two `httpOnly` `SameSite=Lax` cookies: `accessToken` (15 min) and `refreshToken` (30 days).
Rotation on `PUT /auth/session`; **presenting an already-rotated refresh token revokes the whole
session family**, which is the correct response to a stolen token.

| Method | Path | Guard | Notes |
|---|---|---|---|
| `POST` | `/auth/otp` | rate limit `auth` | `{phone, purpose}` where purpose ∈ `register \| login \| reset_pin \| verify_phone`. Returns `{sent, expiresAt, resendAfterMs}`. `devCode` appears **only** when `OTP_DEV_ECHO=true`, and the UI renders it behind an explicit "development only" label. |
| `POST` | `/auth/register` | rate limit `auth` | `{phone, code, name, pin, language, district?, email?}`. Creates user + profile + settings, verifies the phone, signs in. |
| `POST` | `/auth/login` | rate limit `auth` | `{phone, pin}`, or `{phone, code}` for the OTP path. Progressive delay, then a self-clearing 10-minute lock. |
| `POST` | `/auth/pin` | rate limit `auth` | `{phone, code, pin}` — reset a forgotten PIN. Revokes existing sessions. |
| `GET` | `/auth/session` | none | `{authenticated, user?, settings?, profileCompleteness?, ai}`. Signed out is `{authenticated:false}` with **200**, not 401 — the landing page asks this on every load. `ai` reports the live/simulated engine. |
| `PUT` | `/auth/session` | refresh cookie | Rotate. A failed refresh **clears the cookies**, so a client cannot retry forever with a token that can never succeed. |
| `DELETE` | `/auth/session` | none | Sign out; revokes the family and clears cookies. |

---

## Citizen

| Method | Path | Guard | Notes |
|---|---|---|---|
| `GET` | `/users/me` | session | Account plus `profileCompleteness` |
| `PATCH` | `/users/me` | session | `{name?, email?, language?, district?}` |
| `DELETE` | `/users/me` | session | Account deletion — PRD §69, §121 |
| `GET` | `/users/profile` | session | The full 34-field profile, all fields nullable |
| `PATCH` | `/users/profile` | session | Partial update. `medicalConditions` is stored **only** when `shareHealthData` is true |
| `PATCH` | `/users/settings` | session | Theme, text scale (1 / 1.15 / 1.3 / 1.5), numerals, reduce-motion, high-contrast, notification channels, `profileVisibility` |
| `POST` | `/chat` | session + `ai` limit | `{message, conversationId?, locale?}`. Returns the assistant message, the `ResponsePlan`, the NLU `understanding` (locale, intents, life events, extracted fields), `profileUpdated`, `engine`, `degraded`, and `meta.ai`. 45 s abort → `AI_UNAVAILABLE` 504 |
| `GET` | `/chat` | session | Conversation list |
| `GET` | `/chat/:id` | session | Full transcript (owner only) |
| `DELETE` | `/chat/:id` | session | Delete a conversation |
| `GET` | `/opportunities` | optional session + `default` limit | Filters: `category`, `outcome`, `lifeEvent` (each repeatable), `district`, `q`, `sort` ∈ `relevance \| deadline \| newest \| amount`, `limit`, `offset`, `includeClosed`. Browsable signed out; signed in, each item carries its eligibility outcome |
| `GET` | `/opportunities/:slug` | optional session | Detail with organisation, rules summary, required documents, nearby offices, citations |
| `POST` | `/eligibility/check` | full session | `{opportunityId \| slug, overrides?}`. **`overrides` is the what-if path**: layered over the stored profile for this evaluation only, never saved, and **not** written to the audit trail — recording hypotheticals as decisions would make the trail misleading. Returns the full trace, `confidence`, `hypothetical`, and the rule's `requiredFields` |
| `GET` | `/saved` | session | The tracker board grouped by status |
| `POST` | `/saved` | session | `{opportunityId, status?, note?}`; re-saving is idempotent |
| `PATCH` | `/saved/:id` | session | Move along the tracker (`interested → preparing → applied → …`); writes `saved_status_history` |
| `DELETE` | `/saved/:id` | session | Unsave |
| `GET` | `/action-plans` | session | All plans with task progress |
| `POST` | `/action-plans` | session | `{opportunityId}` — generates tasks **from the programme's own `applicationProcess` steps**, which is why that field is `min(1)` at validation: without it no plan can exist |
| `PATCH` | `/action-plans/tasks/:id` | session | `{status?, notes?, dueDate?}`; completion writes a timeline event |
| `GET` | `/timeline` | session | `?month=YYYY-MM`. Reconciles deadlines and creates due reminders inline, so the screen is never stale between job runs |
| `GET` | `/notifications` | session | `?unread=true`; returns `{items, unread}` |
| `PATCH` | `/notifications` | session | `{ids}` or `{all:true}` |
| `GET` | `/locations` | optional session | `?district= \| ?lat=&lng=` plus `type`, `opportunitySlug`, `limit`. Falls back to the signed-in citizen's district when no location is given. Distances from a district centroid are **labelled approximate** |
| `GET` | `/life-events` | none | The 15-event catalogue with bn/en labels — powers the landing grid |
| `POST` | `/feedback` | session + `default` limit | `{kind, messageId?, opportunityId?, rating?, comment?}` — PRD §34. Lands in the moderation queue |

---

## Admin

`requireStaff()` gates all of these (moderator or administrator). Rank matters inside them.

| Method | Path | Minimum rank | Notes |
|---|---|---|---|
| `GET` | `/admin/overview` | moderator | Corpus counts by verification status, AI engine, job history, grounding failures, system health |
| `GET` | `/admin/programs` | moderator | `?q=&status=&verification=&limit=&offset=`. Includes `ruleCount` per programme — a programme with no active rule can never return anything but `unknown`, which makes it the most useful column on the screen |
| `POST` | `/admin/programs` | moderator | Created as `status: draft`, `verificationStatus: unverified_sample`, `version: 1`. **A record is never born verified.** Also indexes it for retrieval |
| `GET` | `/admin/programs/:id` | moderator | Record + all rule versions + required documents + review history |
| `PATCH` | `/admin/programs/:id` | moderator, **administrator to verify** | Any content change bumps `version`, re-indexes, and drops a `verified` record back to `pending_review`. `verificationStatus: 'verified'` requires administrator rank **and** must be the only field in the request — verify-and-edit together returns 422 `"Verify in a separate step"`, because self-certifying a change you just made defeats the review gate |
| `DELETE` | `/admin/programs/:id` | administrator | **Archives, never deletes.** Citizens' saved records and action plans point at the row; a hard delete would silently empty their tracker |
| `GET` | `/admin/organizations` | moderator | List |
| `POST` / `PATCH` | `/admin/organizations` | moderator | Bilingual fields are all required — a Bangla-only or English-only record would break locale parity at read time |
| `GET` | `/admin/rules` | moderator | `?opportunityId=` — full version history |
| `POST` | `/admin/rules` | moderator | Publishes a **new version** and deactivates the previous one; rules are never edited in place, so a stored decision can be replayed against the rule that produced it. Returns `smokeTest`: the rule is run against an empty, a broadly-eligible, and a deliberately-mismatched synthetic profile, and warns about the failure modes that make a rule useless — one nobody can satisfy, one everybody satisfies, an empty profile that yields a verdict instead of `unknown`, no declared `requiredFields`, and fields tested but not declared |
| `GET` | `/admin/moderation` | moderator | Feedback queue + pending knowledge reviews + recent **grounding failures** |
| `PATCH` | `/admin/moderation` | moderator for feedback, **administrator for reviews** | `{kind: 'feedback' \| 'review', id, status, note?}`. Approving a review applies its `proposedPatch`; a moderator triages but cannot publish |
| `GET` | `/admin/ai-logs` | moderator | Per-response engine, provider, model, prompt version, tokens, latency, retrieved chunk ids, confidence, `groundingFailure` |
| `GET` | `/admin/users` | moderator | Accounts with role and status |
| `PATCH` | `/admin/users` | administrator | Change a role or suspend an account |
| `GET` | `/admin/jobs` | moderator | Run history + the five available jobs with descriptions |
| `POST` | `/admin/jobs` | moderator | `{job}` ∈ `reindex_search \| rebuild_embeddings \| detect_staleness \| scheduled_notifications \| aggregate_analytics`. Any external scheduler can call this. `rebuild_embeddings` returns `{skipped:true, reason:"No embedding provider configured (set OPENAI_API_KEY)"}` rather than a fake success |

Every admin mutation writes an `audit_log` row with actor, role, action, entity, and before/after.

---

## Conventions worth knowing

- **Repeated query keys become arrays.** `?category=welfare&category=health` parses to
  `['welfare','health']` via `parseQuery`, so filters compose without a custom serialisation.
- **Dates are ISO 8601 UTC on the wire.** The UI formats with local getters; Asia/Dhaka is UTC+6, so
  a deadline that reads `2026-08-01T00:00:00Z` in a raw response displays as 1 August locally.
- **Money is a number in taka**, never a formatted string. Formatting (৳ prefix, exactly two
  decimals, lakh/crore grouping, never abbreviated) belongs to the `Money` component.
- **Ownership is enforced in the query, not after it.** A citizen fetching another citizen's
  conversation gets `NOT_FOUND`, not `FORBIDDEN` — the row is simply not visible to them, and saying
  "forbidden" would confirm it exists.
- **Idempotency.** Saving an already-saved programme, marking a read notification read, and running
  any job twice are all safe. `POST /admin/programs` rejects a duplicate slug with 409 rather than
  creating a second record.

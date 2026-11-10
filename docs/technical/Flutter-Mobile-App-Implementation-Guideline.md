# Shebar Janala — Flutter Mobile App Implementation Guideline

Audience: the developers building the Flutter client against the existing Next.js backend.
Status: plan. Nothing in this file is implemented yet.

---

## 1. Goal and scope

Build a Flutter app (Android first, iOS second) for citizens that uses the **same backend**
(`/api/v1/*`) as the website. No second backend, no duplicated business logic: eligibility,
AI, ledger and RBAC stay server-side.

**In scope (v1, citizen role):** sign in / register, dashboard, Ask (AI chat + voice),
opportunities, eligibility check, saved items, action plans, entitlements, issues,
notifications, nearby (map), profile, settings, bn/en.

**Later (v2):** officer / leader / donor / admin screens, push notifications, offline sync.
Staff roles are better served by the web app at first.

**Non-goals:** re-implementing the eligibility rules or AI pipeline on device.

---

## 2. What the backend gives us (verified in the repo)

| Fact | Where | Consequence for mobile |
|---|---|---|
| REST under `src/app/api/v1/*` | `src/app/api` | Flutter calls it directly |
| Envelope `{ success, data, timestamp, requestId, meta? }` / `{ success:false, error:{ code, message, fields? } }` | `src/lib/http/response.ts` | One generic Dart `ApiResult<T>` wrapper; branch on `error.code`, never on message text |
| Stable error codes (`UNAUTHENTICATED`, `RATE_LIMITED`, `PIN_INVALID`, `ACCOUNT_LOCKED`, `OTP_*`, `AI_UNAVAILABLE`, …) | `ERROR_CODES` | Map to localized strings in the app |
| Auth = **httpOnly cookies only**; `getSession()` reads `cookies()` | `src/lib/http/session.ts`, `cookies.ts` | **Blocker:** needs bearer-token support (Phase 0) |
| Login returns `{ user, method }` in body; tokens only in `Set-Cookie` | `auth/login/route.ts` | Tokens must also go in the body for mobile |
| Refresh = `PUT /auth/session`, reads refresh **cookie** | `auth/session/route.ts` | Needs to accept a refresh token in the body |
| Access token 15 min, refresh 30 days, rotation with reuse detection | `auth/renew/route.ts` comments | Client must serialise refreshes (one at a time) or it signs the user out |
| Rate limit scopes (`auth`, `ai`, default), AI is tightest | `rate-limit.ts`, `chat/route.ts` | Handle `RATE_LIMITED` with back-off UI |
| Voice: `POST /voice/transcribe` (audio → text), `POST /voice/speak` | `src/app/api/v1/voice` | Record audio in Flutter, upload; works even where on-device STT is absent |
| Zod schemas are the request contract | `src/lib/validation/schemas.ts` | Source of truth for Dart request models |

Endpoint groups relevant to v1:
`auth/{login,otp,pin,register,session}`, `users/{me,profile,settings}`, `chat`, `chat/[id]`,
`eligibility/check`, `opportunities`, `opportunities/[slug]`, `saved`, `action-plans`,
`entitlements/status`, `issues`, `issues/[id]/vote`, `notifications`, `life-events`, `timeline`,
`locations`, `map/tile/{z}/{x}/{y}`, `voice/transcribe`, `voice/speak`, `public/transparency`.

---

## 3. Phased plan

### Phase 0 — Backend prerequisites (web repo, ~1–2 days)

Small, backwards-compatible changes. The website must keep working unchanged.

1. **Bearer auth.** In `getSession()` read `Authorization: Bearer <token>` first, then fall back to the cookie. Verify with the existing `verifyAccessToken`.
2. **Tokens in the body.** Add an opt-in so only mobile gets them (avoid exposing tokens to browser JS): send header `X-Client: mobile`; when present, `auth/login`, `auth/otp` (if it signs in), `auth/register` and `PUT auth/session` also return `{ accessToken, refreshToken, expiresIn }` in `data`. Cookies may still be set; the app ignores them.
3. **Refresh from body.** `PUT /auth/session` accepts `{ refreshToken }` when no refresh cookie is present. `DELETE /auth/session` likewise (so logout revokes the server-side session).
4. **CSRF / origin checks.** Audit `src/middleware.ts` and `src/lib/http/*` for Origin/Referer checks. Mobile requests have no Origin; exempt requests that carry a valid bearer token (bearer tokens are not ambient credentials, so CSRF does not apply).
5. **Rate limit identity.** `clientIp()` behind carrier-grade NAT can group many users. Confirm per-user keys are used after login (the `ai` scope already uses `userId`).
6. **Public HTTPS URL** for staging (Cloudflare deploy or a tunnel). Add `/api/v1/health` if missing.
7. **API contract artifact.** Generate an OpenAPI document from the Zod schemas (`zod-to-openapi`) and commit it. This is what the Dart client is generated/checked against.
8. **Tests.** Add Vitest cases: bearer accepted, bad bearer → 401, cookie path unchanged, tokens only returned with `X-Client: mobile`, refresh reuse still detected.

**Exit criteria:** `curl` can log in, call `/auth/session` GET with a bearer token, refresh, and log out, with no cookies.

### Phase 1 — Foundation (week 1)

- `flutter create` in `mobile/` (monorepo) — or a separate repo; the contract is the OpenAPI file either way.
- Flavors: `dev` (emulator → `http://10.0.2.2:3000`), `staging`, `prod`. Base URL via `--dart-define`.
- Core layer: Dio client, auth interceptor, error mapper, secure storage, router, theme, i18n, logging.
- CI: `flutter analyze`, `flutter test`, build APK on every PR.

### Phase 2 — Auth (week 2)

Register, PIN login, OTP login, forgot-PIN, session restore on launch, logout, locked-account UX.
Biometric unlock (optional) gates reading the stored refresh token; it never replaces the PIN on the server.

### Phase 3 — Core citizen flows (weeks 3–5)

Dashboard → Opportunities (list/detail/search) → Eligibility check → Saved → Action plans →
Entitlements → Profile/Settings → Notifications.

### Phase 4 — AI chat and voice (weeks 5–6)

`POST /chat`, conversation list/detail, citations, "Simulated AI" badge parity, rate-limit UX,
mic button → record → `/voice/transcribe` → text into the chat box; TTS via `/voice/speak`.

### Phase 5 — Community, map, offline (weeks 6–8)

Issues + votes, nearby (flutter_map with `/map/tile/{z}/{x}/{y}`), cached read-only screens, retry queue for writes.

### Phase 6 — Hardening and release (weeks 8–10)

Accessibility pass, low-end device profiling, security review, store listings, staged rollout.

---

## 4. Architecture

Feature-first, three layers per feature. No feature imports another feature's internals.

```
mobile/
  lib/
    main_dev.dart / main_staging.dart / main_prod.dart
    app/            router.dart, theme.dart, app.dart
    core/
      network/      dio_client.dart, auth_interceptor.dart, api_result.dart, error_mapper.dart
      storage/      secure_store.dart, cache_db.dart (drift)
      i18n/         l10n/*.arb, locale_controller.dart
      widgets/      shared UI (buttons, error/empty/loading states)
    features/
      auth/         data/ (repo, dto) · domain/ (entities) · presentation/ (screens, controllers)
      opportunities/ eligibility/ chat/ voice/ saved/ plans/ entitlements/ issues/
      notifications/ nearby/ profile/ settings/
  test/ integration_test/
```

**State:** Riverpod (`AsyncNotifier` per screen, repositories injected via providers).
**Navigation:** `go_router` with an auth redirect guard driven by the session provider.
**Models:** `freezed` + `json_serializable`. DTOs mirror the API; map to domain entities in the repository.
**Networking:** `dio` + `retrofit` (optional). Never call Dio from widgets.

### 4.1 API result handling

```dart
sealed class ApiResult<T> { }
class Ok<T> extends ApiResult<T> { final T data; final String requestId; }
class Err<T> extends ApiResult<T> {
  final String code;               // ERROR_CODES value from the server
  final String message;            // safe to show, but prefer localized-by-code
  final Map<String,String>? fields; // per-field validation messages
  final String requestId;          // shown in "report a problem"
}
```

Rules: one place parses the envelope; UI switches on `code`; network failure is a separate
`Err('NETWORK')`; always keep `requestId` for support.

### 4.2 Auth and token lifecycle

1. Login with header `X-Client: mobile` → store `accessToken` in memory, `refreshToken` in `flutter_secure_storage` (Android Keystore / iOS Keychain). Never log tokens.
2. Interceptor adds `Authorization: Bearer`.
3. On `401 UNAUTHENTICATED`: run **one** refresh via a shared `Completer` (single-flight) so parallel requests do not each rotate the token — the server detects reuse and would sign the user out. Retry the original request once. If refresh fails → clear storage, route to login.
4. Proactively refresh ~60 s before expiry using `expiresIn`.
5. Logout calls `DELETE /auth/session` with the refresh token, then wipes storage.

### 4.3 Offline and weak network (the product targets 2G)

- Timeouts: connect 10 s, receive 30 s (chat 50 s — server allows 45 s).
- Cache-then-network for reads (opportunities, saved, plans, notifications) in `drift`, with `updatedAt` shown on stale data.
- Write retry queue only for idempotent actions (save/unsave, task status). Do **not** queue eligibility checks or chat turns.
- Honour `RATE_LIMITED` (`Retry-After` if present) with a visible countdown, not silent retries.
- Keep payloads small: paginate, request only needed fields, compress images before upload.

### 4.4 Internationalisation

- Locales `bn` (default) and `en`. ARB files generated from `src/messages/catalog.ts` by a small script (`tool/export_arb.ts`) so strings have **one** source. Do not hand-edit generated ARB.
- Bundle Noto Sans Bengali; test conjuncts and line-breaking.
- Use `DateFormat`/number formatting with Bengali digits when `bn`.
- Locale comes from `user.language` after login, device locale before.
- Server-returned bilingual fields (`title` / `titleBn`) — pick by locale in the mapper, not in widgets.

### 4.5 Voice

- Record with `record` (AAC/Opus, mono, 16 kHz) → `POST /voice/transcribe` as multipart, passing the `purpose` the endpoint expects.
- First call `GET /voice/transcribe` to learn server capability; hide the mic if unavailable.
- Mirror the web behaviour: if transcription fails, fall back to the typed box.
- Playback of `/voice/speak` audio via `just_audio`. Request mic permission with a clear Bangla rationale.

---

## 5. Security checklist

- [ ] Refresh token only in Keystore/Keychain; access token in memory only.
- [ ] HTTPS only in `staging`/`prod`; Android `usesCleartextTraffic` only in the `dev` flavor.
- [ ] Certificate pinning on prod (`dio` + pinned SPKI hash); ship two pins for rotation.
- [ ] No tokens, PINs, NID numbers or phone numbers in logs or crash reports.
- [ ] PIN entry: obscured, no autofill/clipboard, `FLAG_SECURE` on sensitive screens (Android).
- [ ] NID / identity screens: no screenshots, no caching to disk.
- [ ] Release builds: `--obfuscate --split-debug-info`, R8 on.
- [ ] Root/jailbreak signal is advisory only (log), never a hard block.
- [ ] Server remains the authority: the app hides UI by role but every route still enforces RBAC.
- [ ] Privacy: data-safety form (Play) and privacy nutrition labels (App Store) must match the real data flows (health/medical conditions are encrypted server-side — SJ-44 — and are sensitive).

---

## 6. Packages (starting set)

| Concern | Package |
|---|---|
| HTTP | `dio` |
| State | `flutter_riverpod`, `riverpod_annotation` |
| Routing | `go_router` |
| Models | `freezed`, `json_serializable`, `build_runner` |
| Secure storage | `flutter_secure_storage` |
| Local DB / cache | `drift` + `sqlite3_flutter_libs` |
| i18n | `flutter_localizations`, `intl` |
| Audio | `record`, `just_audio`, `permission_handler` |
| Map | `flutter_map`, `latlong2` |
| Push (v2) | `firebase_messaging`, `flutter_local_notifications` |
| Connectivity | `connectivity_plus` |
| Biometrics (opt.) | `local_auth` |
| Testing | `flutter_test`, `mocktail`, `integration_test`, `patrol` (optional) |
| Lint | `flutter_lints` or `very_good_analysis` |

Pin versions in `pubspec.yaml`; commit `pubspec.lock`.

---

## 7. Testing strategy

- **Unit:** repositories (envelope parsing, error mapping), token single-flight logic, locale mapper.
- **Widget:** each screen's loading / empty / error / success states, in both `bn` and `en`, with large text scale (1.5×).
- **Contract:** CI job that regenerates DTO expectations from the OpenAPI file and fails on drift.
- **Integration:** against a seeded local backend (`npm run setup`): login → opportunities → eligibility → chat (simulated AI) → logout. Demo users are in the README (e.g. `01712345678` / `1234`).
- **Device matrix:** a low-end Android (2 GB RAM), a mid-range Android, one iPhone; throttled network (2G profile).
- **Accessibility:** TalkBack/VoiceOver pass, min 48 dp touch targets, contrast AA.

Definition of done for a screen: states covered, bn+en verified, a11y labels, tests, no tokens/PII in logs.

---

## 8. Local development

1. Backend: `npm install && cp .env.example .env.local && npx drizzle-kit push --force && npm run db:seed && npm run dev`.
2. Android emulator reaches the host at `http://10.0.2.2:3000`; a physical phone uses `http://<LAN-IP>:3000` (same Wi-Fi, allow port 3000 through Windows Firewall) or a Cloudflare Tunnel.
3. Run: `flutter run --flavor dev -t lib/main_dev.dart --dart-define=API_BASE_URL=http://10.0.2.2:3000`.
4. Without an AI key the backend answers in "Simulated AI" mode; the app should show the same badge based on `ai` in `GET /auth/session`.

---

## 9. Release

- **Android:** Play Console (one-time $25), app signing by Google, internal → closed → production tracks. Build an `.aab` with `--obfuscate`.
- **iOS:** Apple Developer ($99/yr); builds need macOS or a CI such as Codemagic/GitHub macOS runners. TestFlight first.
- **CI/CD:** GitHub Actions: analyze + test on PR; tagged commit builds signed artifacts; keystore and API URLs in secrets.
- **Versioning:** semver in `pubspec.yaml`; keep an API-compatibility note — the backend must keep old `/api/v1` behaviour while old app versions are in the wild. Breaking changes → `/api/v2`, plus a minimum-supported-version check endpoint that can force an update screen.
- **Monitoring:** Sentry or Firebase Crashlytics with PII scrubbing; log `requestId` to correlate with server logs.

---

## 10. Risks and open questions

| Risk / question | Mitigation / decision needed |
|---|---|
| Rotating refresh tokens + concurrent requests sign users out | Single-flight refresh (§4.2); test it explicitly |
| 2G users, large Bangla fonts and map tiles | Cache aggressively; make map optional; measure cold start |
| Mic/STT unreliable for Bangla on-device | Use server transcription as the default (§4.5) |
| Push needs a delivery channel the backend lacks | Add a `device_tokens` table + FCM sender in v2; SMS outbox exists today as a fallback |
| Staff roles in the app? | Decide: web-only for v1 (recommended) |
| Monorepo vs separate repo | Recommend `mobile/` in this repo for atomic API+client changes |
| Backend is Cloudflare-targeted; is the staging URL ready? | Needed before Phase 1 ends |
| Official gov data/privacy requirements for app stores | Confirm with the project owner before submission |

---

## 11. Milestone checklist

- [ ] P0 bearer auth + body tokens + tests merged; OpenAPI published
- [ ] P1 skeleton app builds in CI, flavors work
- [ ] P2 login/register/logout/restore verified on device
- [ ] P3 core citizen flows behind feature flags
- [ ] P4 chat + voice working over staging
- [ ] P5 issues, map, offline cache
- [ ] P6 accessibility, security checklist (§5) signed off, store submission

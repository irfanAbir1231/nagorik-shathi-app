# External services and environment variables

Every external dependency: why it is needed, whether it is mandatory, what credentials it takes, and
what happens without it. **Nothing in this list is required to run the system end to end.**

The rule applied throughout: an unconfigured service **degrades to a stated fallback or fails
loudly**. Nothing pretends to have worked.

---

## Summary

| Service | Mandatory? | Without it |
|---|---|---|
| Database (libSQL / SQLite) | **Yes** — but defaults to a local file, no setup | — |
| AI provider (Anthropic **or** OpenAI) | No | Deterministic composer; UI badges **"Simulated AI"** |
| Embeddings (OpenAI) | No | BM25 only; `rebuild_embeddings` reports `skipped` |
| SMS gateway | No | OTP shown via `OTP_DEV_ECHO`; with echo off, requesting a code **fails loudly** |
| SMTP | No | Notifications persist and show in-app |
| Map + real places (**OpenStreetMap**) | No — **and needs no key**, on by default | Set `NEXT_PUBLIC_MAP_PROVIDER="none"` for a distance-ordered list and an explicit "no map" banner |
| Object storage (S3 / R2) | No | Unused — document capture is not built |
| Voice OTP telephony | No | Button visible, **disabled with a stated reason** |
| OCR | No | Not built |

---

## 1. Database — the only hard requirement

**Why:** everything persists. **Mandatory:** yes, but it needs no installation.

```bash
DATABASE_URL="file:./data/accessai.db"   # default; a local SQLite file
DATABASE_AUTH_TOKEN=""                    # only for hosted libSQL (Turso)
```

`npm run setup` creates the schema and seeds it. Point `DATABASE_URL` at a Turso URL plus
`DATABASE_AUTH_TOKEN` for a hosted database with no other change. The PRD's PostgreSQL target is a
`client.ts` swap — [DEVIATIONS.md](DEVIATIONS.md) §1.

---

## 2. AI provider — the honest-degradation case

**Purpose.** Exactly one job: **rendering a `ResponsePlan` into fluent prose** in the citizen's
language. It does *not* decide eligibility (PRD §24 forbids that), does not choose programmes, does
not compute confidence, and does not author reasons. Those are all deterministic and happen before
any model is called.

**Providers.** One `LlmProvider` interface, four implementations:

| Provider | Env | Model default | Used for |
|---|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-5` (`ANTHROPIC_MODEL`) | Response rendering |
| OpenAI | `OPENAI_API_KEY` | `gpt-4.1-mini` (`OPENAI_MODEL`) | Response rendering **and** embeddings |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek-v4-flash` (`DEEPSEEK_MODEL`) | Response rendering. OpenAI-compatible; no embeddings endpoint |
| Simulated | *(none set)* | — | The deterministic composer |

With several keys present the order is anthropic → openai → deepseek. Set **`AI_PROVIDER`** to choose
explicitly rather than depending on that order; if it names a provider whose key is missing,
`aiConfigProblems()` reports it instead of quietly falling back to a provider nobody chose.

**Verify any of them with `npm run ai:check`**, which resolves the provider, lists the model ids the
account actually exposes, reports the thinking setting, and performs one real round trip. Guessing a
vendor's current model string is how you get a 404 at request time — this asks the API instead.

### DeepSeek: reasoning is off, by two measures

DeepSeek V4 **thinks by default.** Verified against the live endpoint: `thinking.type` accepts
`adaptive | enabled | disabled` and defaults to `adaptive`, which produced 52–79 reasoning tokens per
call — roughly 4× the output tokens for an identical answer. `reasoning_effort` accepts
`low | medium | high | xhigh | max` and **has no `none`**; sending one is a 400. So turning thinking
off is `thinking: { type: 'disabled' }`, nothing else.

The adapter therefore does two independent things:

1. Sends `thinking: { type: env.DEEPSEEK_THINKING }`, defaulting to **`disabled`**, on every request.
2. **Discards any `reasoning_content` that arrives anyway** — it never reaches the response, the
   `ai_logs` row, or the citizen, and its arrival is logged once as a cost warning.

The second measure is not redundant. A chain of thought contains discarded hypotheses phrased as
statements; putting one beside a benefits decision would present rejected reasoning as advice, and
storing it would pollute an audit trail that has to be defensible. And this product has nothing for a
model to reason about anyway: eligibility, ranking, and citations are all decided deterministically
*before* the model is called — it only rewrites a fixed `ResponsePlan` into fluent prose.

`DEEPSEEK_MODEL` defaults to the **`-flash`** id for the same reason: `-pro` buys reasoning depth this
workload never uses. Switch to `-pro` only if Bangla prose quality matters more than latency and cost.

Measured on a live Bangla turn (widowhood → 5 programmes, 6 citations): **5.5 s** server-side for a
~700-token reply, against the PRD §5 target of 3 s. That is generation time, not pipeline time — the
deterministic path answers in well under a second. Bringing it down means streaming the response
(not implemented — [DEVIATIONS.md](DEVIATIONS.md) §15) or capping `maxTokens` harder.

**Is a mock possible? Yes — and it is the default, because of how the pipeline is ordered.** The
`ResponsePlan` fixes every fact before rendering, so the composer produces the *same* programmes,
outcome, reasons, citations, and next step as a live model. Only prose fluency differs. This is
stated in the UI on every screen, in `meta.ai` on every chat response, and in `ai_logs.engine` for
every stored turn.

```
GET /api/v1/auth/session → { "ai": { "mode": "simulated", "isLive": false,
                                     "model": "deterministic-composer-v1" } }
```

The badge in the UI reads **"Simulated AI (no API key)"** whenever `isLive` is false.

**Degradation is also runtime, not just startup.** If a configured provider errors or exceeds the
45-second abort, the turn falls back to the composer, marks the response `degraded: true`, and tells
the citizen the answer came from the offline engine. A model outage never produces a blank screen or
a lost message.

**Costs and rate limits** are why the `ai` scope is 20/min against the default 120 (PRD §128).

---

## 3. Embeddings — the semantic half of hybrid retrieval

**Why:** PRD §26 requires hybrid retrieval. BM25 matches words; embeddings match meaning, which
matters when a citizen writes *"স্বামী মারা গেছে"* and the programme text says *"বিধবা"*.

**Provider:** OpenAI `text-embedding-3-small` (`OPENAI_EMBEDDING_MODEL`). Requires `OPENAI_API_KEY`.

**Without it:** the semantic channel contributes **nothing** — it is not simulated with a random or
hash-based vector, which would produce confident nonsense. The retriever reports its mode
(`lexical only (BM25)`) in the admin panel, and `rebuild_embeddings` returns:

```json
{ "skipped": true, "reason": "No embedding provider configured (set OPENAI_API_KEY)" }
```

**To enable:** set `OPENAI_API_KEY`, then run `rebuild_embeddings` from **Admin → Jobs**. Vectors are
stored in a JSON column and cosine is computed in process — correct at this corpus size, and
interface-identical to a pgvector swap.

---

## 4. SMS gateway — OTP delivery

**Why:** phone + OTP is the identity model (BDS §10.2.11 — a large share of target users have no
email). **Mandatory:** not for development.

```bash
OTP_DEV_ECHO="true"              # development: the code is logged AND shown, labelled
SMS_PROVIDER="ssl_wireless"      # ssl_wireless | bulksmsbd | twilio | demo
SMS_API_KEY=""
SMS_SID=""                       # SSL Wireless and Twilio need this in addition to SMS_API_KEY
SMS_SENDER_ID=""
```

**Current behaviour, precisely:** with `OTP_DEV_ECHO=true` the code is printed to the server log and
returned as `devCode`, which the UI renders behind an explicit *development only* label so the auth
flow is completable. With echo **off** and no provider, `requestOtp` **throws** — *"SMS delivery is
not configured on this server, so a code cannot be sent."* A citizen waiting for a code that was
never sent is worse than a clear failure.

`assertProductionSafety()` refuses a production boot with `OTP_DEV_ECHO` still on.

**As of Phase 5 (SJ-23/48), all three providers below are actually implemented** in
[src/modules/notifications/sms.service.ts](../src/modules/notifications/sms.service.ts) — naming a
`SMS_PROVIDER` with a real key now genuinely dispatches, rather than throwing "not implemented in this
build" as it did before. None have been exercised against a live vendor account from this environment
(no real credentials exist here); what is verified is that each function is shaped exactly to its
vendor's documented contract, and that the unconfigured path still fails the same honest way it always
did.

| Provider | Endpoint | Credentials |
|---|---|---|
| **SSL Wireless** (most common for BD government/NGO) | `POST https://smsplus.sslwireless.com/api/v3/send-sms` — JSON `{api_token, sid, msisdn, sms, csms_id}` | API token (`SMS_API_KEY`) + SID (`SMS_SID`), allow-listed server IP |
| **BulkSMSBD** | `GET http://bulksmsbd.net/api/smsapi` — `api_key`, `senderid`, `number`, `message` | API key + approved sender ID |
| **Twilio** | `POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json` — basic auth, form-encoded `To`/`From`/`Body` | Account SID (`SMS_SID`) + auth token (`SMS_API_KEY`). Works internationally; costs more per BD message and needs a sender that BD operators accept |

A `+880` sender ID needs BTRC-registered masking; without it, messages arrive from a shortcode and
some operators filter them. That is an operational prerequisite, not a code one.

**A fourth option, `SMS_PROVIDER="demo"`, needs no credentials at all.** It logs the outgoing message
to the server console prefixed `[SMS:DEMO]` and always succeeds — for demonstrating the OTP/SMS code
path with no vendor account, never for production use. See docs/DEVIATIONS.md §20.

---

## 4b. USSD gateway — the non-smartphone path (SJ-23/48)

**Why:** PRD/BRD's reach goal is a citizen with no smartphone and no data plan, not just no email — SMS
covers OTP delivery; USSD covers actually *using* the product (checking a benefit, filing a report)
from any phone that can dial a short code.

```bash
USSD_GATEWAY_SECRET=""    # shared secret an aggregator's callback must present
```

**Endpoint:** `POST /api/v1/ussd/callback`. Authenticated by a shared secret in the `X-Ussd-Secret`
header, since the caller is a telecom aggregator's server, not a logged-in browser — unset, the
endpoint refuses every request rather than accepting an unauthenticated one.

**Contract chosen, and why:** `{sessionId, phoneNumber, text}` in, `CON <text>` (keep session open) or
`END <text>` (close it) out, plain text — Africa's Talking's own field names, which most aggregators'
USSD gateways mirror closely. No BD-specific aggregator's exact shape was already documented here to
copy, so this is the closest thing to an industry-standard contract rather than an invented one.
**Adapting the field names or switching to form-encoding for a specific vendor's actual contract is
integration work** — the same category as pointing `STT_BASE_URL` at a real speech vendor — not a
redesign; the session-handling logic in
[src/modules/ussd/ussd.service.ts](../src/modules/ussd/ussd.service.ts) does not change.

**What it does today:** check a real entitlement status by National ID (works for anyone, no account
needed — matches `checkEntitlementStatusByNid`), file a real issue report (requires the calling phone
number to match an already residency-verified AccessAI account — see `docs/DEVIATIONS.md` §19 for why
that scope was kept as tight as the web path), and list a citizen's own recent reports. Session state
lives in `ussd_sessions`, since a USSD aggregator calls back on every keypress with the same
`sessionId` and expects the server to remember which step it is on — unlike every other route in this
app, which is stateless.

---

## 4c. Vision moderation — checking an uploaded photo (SJ-21)

**Why:** citizen-submitted issue photos (`docs/DEVIATIONS.md` §16) had no automated check beyond file
size and MIME type before Phase 5 — a photo could be anything.

```bash
VISION_MODERATION_PROVIDER=""                              # unset | demo
VISION_MODERATION_API_KEY=""
VISION_MODERATION_BASE_URL="https://api.openai.com/v1"    # OpenAI-compatible, vision-capable
VISION_MODERATION_MODEL="gpt-4o-mini"
```

**Without a key or provider** (the default), every submitted photo is marked
`visionModerationStatus: "unavailable"` and auto-flagged for manual review — never silently passed
through, and never given an invented pass/fail from a technique that cannot actually assess image
content. **With a key**, a real `/chat/completions` call with an image content part asks the model
whether the photo shows graphic content or is clearly unrelated to a civic complaint, and the issue is
flagged or passed based on an actual answer. **With `VISION_MODERATION_PROVIDER="demo"`** (no key
needed), a deterministic size check stands in — flagging anything under ~2KB, passing anything
larger — recorded as `demo_flagged`/`demo_passed`, never the real `flagged`/`passed` values, so a demo
run can never be mistaken for a real model's verdict later. See
[src/modules/issues/vision-moderation.ts](../src/modules/issues/vision-moderation.ts) and
docs/DEVIATIONS.md §20.

---

## 4a. Voice access — speech to text and read-aloud

**Why:** for a citizen with low literacy, voice is not an accessibility extra — it
is the primary interface. The audience this product targets includes people who
cannot read a Bangla paragraph fluently, and the whole premise is that they can
describe what happened in their own words.

**Mandatory:** no. **Voice navigation works with no keys at all** — intent
resolution is deterministic phrase matching
([src/modules/voice/intent.ts](../src/modules/voice/intent.ts)), so typing or
saying `সংরক্ষিত` routes identically, offline, in ~1 ms.

### "Bangla voice does not work" — diagnose it in this order

The complaint conflates two independent layers, and they have different fixes.

| Layer | Needs a key? | How to check | Language-specific? |
|---|---|---|---|
| **Hearing** — audio → text | **Yes**, or a Chromium browser | `npm run voice:check` | No |
| **Understanding** — text → command | No | `npm run voice:bangla` | Yes |

**Almost always it is the first layer, and it is not a Bangla problem at all.**
With no `STT_API_KEY`, Firefox and Android WebViews have no recogniser to fall back on, so nothing
is heard in *any* language — the microphone is disabled with a stated reason and the typed-command
box is offered instead. In Chrome the browser recogniser takes over and Bangla works, which is why
the fault often looks browser-specific.

`npm run voice:bangla` resolves 33 realistic Bangla utterances — plain, politely inflected, with
filler, and Banglish — through the same deterministic matcher a spoken transcript uses, with no
microphone involved. If that passes and speech still fails, the problem is hearing, not Bangla.

Two Bangla-specific things do matter once a provider is configured, and both are handled:

- **The `language` hint is sent as `bn`.** Whisper-family models are trained overwhelmingly on
  English and will emit plausible English for Bangla audio without it — "শোনাও" as "show now" — after
  which a correctly heard command has nothing to match against.
- **`STT_PROMPT` defaults to a Bangla domain vocabulary** — programme names, the navigation words,
  and টাকা / হাজার / লাখ. It biases the decoder toward the terms this app actually needs. Extend it if
  you add programmes; do not blank it.

### The browser is the unreliable part

| Capability | Chrome / Edge | Firefox | Android WebView |
|---|---|---|---|
| Web Speech API (`SpeechRecognition`) | ✅ | ❌ | ❌ mostly |
| `MediaRecorder` + `getUserMedia` | ✅ | ✅ | ✅ |
| `speechSynthesis` with a `bn-BD` voice | device-dependent | device-dependent | often absent |

Web Speech is Chromium-only, ships the audio to Google regardless, and gives you
no control over Bangla accuracy. `MediaRecorder` is near-universal. So the
server path is not a fallback for exotic browsers — it is the only route that
behaves the same everywhere, and Firefox has no other option at all.

```bash
VOICE_MODE="auto"     # browser where present, server otherwise (default)
VOICE_MODE="server"   # ALWAYS record and upload — identical on every browser
VOICE_MODE="browser"  # never upload audio; Chromium only
```

`server` with no `STT_API_KEY` reports itself as `auto`: configuration intent must
not leave a citizen holding a microphone that can never work.

### Speech to text

One adapter targeting the OpenAI-compatible `/audio/transcriptions` shape, so the
choice is three environment variables rather than three code paths:

| Option | Cost | Bangla | Notes |
|---|---|---|---|
| **Groq** — the fastest way to working speech | **free tier** | `whisper-large-v3`, genuinely multilingual | Key from `console.groq.com`, then three lines below. No code change |
| **Self-hosted `whisper.cpp`** | free, **no account** | good at `large-v3` | Bundled server already speaks this shape. No audio leaves your machine — the strongest privacy position, and it answers the data-residency question the PRD never addresses |
| **OpenAI directly** | per minute, no free tier | good | |

The three lines for Groq, which is what to reach for if speech is simply not working:

```bash
STT_API_KEY="gsk_..."
STT_BASE_URL="https://api.groq.com/openai/v1"
STT_MODEL="whisper-large-v3"
```

Then `npm run voice:check` — it lists the models the endpoint actually exposes, which is how a wrong
model id (the most common misconfiguration) is caught before a citizen presses the microphone.

There is deliberately **no simulated transcriber**. You cannot fake hearing: an
invented transcript would be acted on, and a wrong income figure produces a
confidently wrong eligibility answer. With nothing configured and no browser
support, the microphone is disabled with a stated reason and the typed-command box
is offered instead.

**Audio is never stored.** It is transcribed inside the request handler and
discarded. Speech about widowhood, income and illness is sensitive text plus a
biometric identifier plus, often, other people audible in the room.

`STT_PROMPT` biases the decoder's vocabulary and now **defaults** to the domain rather than being
empty — programme names (`বিধবা ভাতা`, `প্রতিবন্ধী ভাতা`), the navigation words the matcher expects
(`সংরক্ষিত`, `সময়সূচি`, `কাছের অফিস`), and the money words where a mishearing is most consequential
(`টাকা`, `হাজার`, `লাখ`). A general model has no reason to prefer `বিধবা ভাতা` over similar-sounding
nonsense unless told what domain it is in. Extend it when you add programmes; do not blank it.

### Read-aloud

Dictation alone is half a bridge: it lets a citizen ask, then hands them a wall of
text. `speechSynthesis` is free and offline but Android frequently has no `bn-BD`
voice, and then it either stays silent or reads Bangla in an English accent —
unintelligible, and worse than nothing because it sounds like it worked.

So `TTS_API_KEY` enables `POST /api/v1/voice/speak`, and **server audio is tried
first** when configured, with the browser as fallback rather than default. Piper is
the usual self-hosted answer for Bangla; it needs a thin wrapper to expose
`/audio/speech`.

Cost is bounded by caching rather than rationing: nearly everything read aloud is
deterministic — titles, condition reasons, next steps, UI copy — so a strong ETag
over `(model, locale, text)` makes repeats free. Verified: a repeated request
returns `304` and the provider is never called twice.

### Diagnosing it

`npm run voice:check` verifies the server half against the live endpoint — key,
base URL, whether the model id exists on the account, a real 0.6 s WAV round trip,
and synthesis. The in-app capability panel (tap the microphone when it is
unavailable) answers the browser half: recognition, recording, server
transcription, speech output, Bangla voice, secure context.

Both containers are tested: Firefox records `audio/ogg;codecs=opus` and Chromium
`audio/webm;codecs=opus`; the route accepts both and names the upload accordingly.

### Not built

**In-browser Whisper** (WASM, via transformers.js) would give account-free
transcription in Firefox with no audio leaving the device. Rejected for now on the
2G target: the smallest usable model is a ~40 MB download and Bangla quality at
`tiny`/`base` is poor. Viable as an opt-in for repeat desktop users.

**Continuous listening / wake word.** Deliberate. Holding the microphone open
drains a cheap phone's battery and records the room after the citizen has
finished, which is not a trade this audience should be asked to make silently.

---

## 5. Voice OTP — the accessible-authentication path

**Why:** BDS §10.2.5 requires a voice fallback for citizens who cannot read the SMS. **Not built.**

The button exists and is **disabled with a visible reason** ("this needs a telephony service") rather
than absent or silently inert — an accessibility affordance that appears to work and does not is
worse than one that explains itself.

**Needs** a voice provider with Bangla TTS or a pre-recorded digit set and a callback endpoint: Twilio
Programmable Voice, or a local operator's IVR. Credentials as for SMS, plus a public callback URL.

---

## 6. SMTP — email notifications

**Why:** PRD §Feature 13 lists email among the notification channels. Secondary here, since email is
explicitly *not* the identity.

```bash
SMTP_HOST=""      SMTP_PORT="587"    SMTP_USER=""
SMTP_PASSWORD=""  SMTP_FROM="AccessAI <no-reply@accessai.local>"
```

**Without it:** notifications are created, persisted, badged, and shown in-app — the citizen still
learns about a closing deadline the next time they open the app. The settings screen **disables the
email toggle and says why** (`emailAvailable={Boolean(env.SMTP_HOST)}`) rather than offering a switch
that does nothing. Same for the SMS toggle.

---

## 7. Maps and real places — OpenStreetMap, no key needed

**Why:** PRD §70 describes an interactive map, and PRD Feature 12 a list of real service locations.

Unlike every other service in this document, **this one is on by default and needs no account**.
OpenStreetMap supplies both halves:

```bash
NEXT_PUBLIC_MAP_PROVIDER="osm"    # osm | none | mapbox | google

# Both default to OSM's public endpoints; override for anything beyond a prototype.
MAP_TILE_URL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
OVERPASS_URL="https://overpass-api.de/api/interpreter"
MAP_USER_AGENT="AccessAI/1.0 (contact: you@example.com)"
OVERPASS_CACHE_HOURS="336"        # 14 days
OVERPASS_RADIUS_KM="25"
```

### Tiles are proxied, not fetched by the browser

Every tile goes through `GET /api/v1/map/tile/{z}/{x}/{y}`. Four reasons, none of them
interchangeable:

1. **OSM's Tile Usage Policy requires an identifying `User-Agent`** and blocks traffic without one.
   A browser `<img>` sends the browser's own agent and cannot be told otherwise, so direct requests
   are both against the policy and liable to be refused.
2. **The CSP stays at `img-src 'self'`.** Adding a third-party image origin for every page in the
   app, permanently, to buy one feature is a bad trade when proxying costs nothing.
3. **The tile host never sees the citizen.** No IP, no referer, no cookie belonging to someone
   looking up a legal-aid office or a hospital. On this app that is not a small thing.
4. **The provider becomes swappable** — `MAP_TILE_URL` moves to a paid host or a self-run cache
   without touching the client or the CSP.

Tiles are cached `public, max-age=30d, immutable`; the coordinates are range-validated against
`2**zoom` before interpolation into the outbound URL, so a malformed path fails locally rather than
costing an upstream round trip.

### Real places come from Overpass

One request per area retrieves police stations, hospitals, clinics, courts, pharmacies, banks, post
offices, fire stations, colleges, NGO offices and government offices — a regex filter over three OSM
keys rather than thirteen separate queries, because Overpass is a shared volunteer service with a
fair-use policy and being rate-limited would take the feature down for everyone.

Results are cached in `osm_place_cache`, keyed by a ~5.5 km grid cell so two citizens in one town
share a lookup rather than each triggering an identical upstream query. Measured on Dhaka: **cold
~20 s, cached ~0.5 s**, 5,240 places after de-duplication. `npm run osm:clear` empties the cache,
which is required after changing normalisation because the cache stores post-normalisation shapes.

These places are shown **alongside** the seeded corpus and labelled separately — see
[DEVIATIONS.md](DEVIATIONS.md) §12a for why they are never merged, and for the three tag mappings
that were deliberately refused.

### Before real traffic

> **Point `OVERPASS_URL` and `MAP_TILE_URL` at your own instance or a paid provider.** Both public
> endpoints are run by volunteers on donated hardware. A prototype's traffic is within their
> policies; a deployed application's is not. Set `MAP_USER_AGENT` to something that identifies you
> and can be contacted, because an anonymous heavy consumer simply gets blocked.

Attribution is a **licence requirement** of the ODbL, not a nicety. It is rendered visibly under the
map, links to `openstreetmap.org/copyright`, and is asserted by a test.

### Without it

`NEXT_PUBLIC_MAP_PROVIDER="none"` switches off both tiles and Overpass. Nearby Services falls back
to the seeded **distance-ordered list** with call and directions actions, and says why there is no
map. An Overpass failure with the map on is handled the same way: the seeded list is the primary
surface and still works, and the screen states that the real places could not be fetched rather than
showing an error where the list belongs.

Geolocation denial is a normal state, not an error — the list stays usable and the district selector
remains the primary control. Distances are measured from the citizen's real position when shared
(and say so), otherwise from the district town centre (and say that instead).

Mapbox and Google remain drop-in alternatives: Mapbox is cheaper at this scale, Google has better
Bangladesh POI coverage. Neither is required.

---

## 8. Object storage — not yet used

```bash
S3_BUCKET=""  S3_REGION=""  S3_ACCESS_KEY=""  S3_SECRET_KEY=""  S3_ENDPOINT=""
```

Document capture is **not implemented** ([DEVIATIONS.md](DEVIATIONS.md) §15) — the `documents` table
and the admin indexing path exist, but nothing writes citizen files, so setting these has no effect
today. Validated and ready for the writer. Set `S3_ENDPOINT` for Cloudflare R2, which has no egress
charge and is the better fit for a Bangladesh-served deployment.

---

## 9. OCR — not built

PRD §Feature 8 implies reading a National ID or a certificate photo. Not implemented. It would need
Google Cloud Vision or Azure Document Intelligence for Bangla print, or Tesseract with `ben`
traineddata for a self-hosted option (noticeably weaker on Bangla conjuncts and on the low-light
phone photos this audience actually takes).

**Deliberate position:** OCR that misreads a National ID number is worse than typing it, so this
should not ship without a confirm-what-we-read step. That is a design decision, not just missing code.

---

## 10. Full environment variable reference

Validated by Zod at boot in [src/lib/config/env.ts](../src/lib/config/env.ts); an invalid value
**stops the process with a per-variable message** rather than failing mysteriously later.

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Enables production safety checks |
| `DATABASE_URL` | `file:./data/accessai.db` | libSQL / SQLite target |
| `DATABASE_AUTH_TOKEN` | — | Hosted libSQL only |
| `JWT_SECRET` | dev value | Access-token signing. **Must be replaced** |
| `JWT_REFRESH_SECRET` | dev value | Refresh-token signing. **Must be replaced** |
| `ACCESS_TOKEN_TTL` | `15m` | Short by design |
| `REFRESH_TOKEN_TTL` | `30d` | Rotated on use |
| `AI_PROVIDER` | — | `anthropic \| openai \| deepseek \| simulated`. Overrides key-order resolution |
| `ANTHROPIC_API_KEY` | — | Live AI. First in key order |
| `OPENAI_API_KEY` | — | Live AI **and** embeddings |
| `DEEPSEEK_API_KEY` | — | Live AI. No embeddings endpoint |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | |
| `OPENAI_MODEL` | `gpt-4.1-mini` | |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | Run `npm run ai:check` to list what your account exposes |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/v1` | For a proxy or regional endpoint |
| `DEEPSEEK_THINKING` | `disabled` | `disabled \| adaptive \| enabled`. The API's own default is `adaptive`, which does think |
| `DEEPSEEK_REASONING_EFFORT` | — | `low…max`. Sent only when thinking is not disabled |
| `DEEPSEEK_EXTRA_BODY` | — | JSON merged into the request body last, if the API changes |
| `OTP_DEV_ECHO` | `true` | Shows the OTP in the UI, labelled. **Blocked in production** |
| `SMS_PROVIDER` / `SMS_API_KEY` / `SMS_SID` / `SMS_SENDER_ID` | — | Gateway credentials — see §4 |
| `USSD_GATEWAY_SECRET` | — | Shared secret for `/api/v1/ussd/callback` — see §4b |
| `VISION_MODERATION_PROVIDER` | — | `demo` for a no-key simulated check — see §4c |
| `VISION_MODERATION_API_KEY` / `_BASE_URL` / `_MODEL` | `https://api.openai.com/v1` / `gpt-4o-mini` | Issue-photo moderation — see §4c |
| `FIELD_ENCRYPTION_KEY` | dev fallback | AES-256-GCM key for `medicalConditions` at rest (base64, 32 bytes). **Must be replaced** |
| `NEXT_PUBLIC_MAP_PROVIDER` | `none` | `none \| mapbox \| google` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` / `GOOGLE_MAPS_API_KEY` | — | Tile credentials |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | port `587` | Email |
| `S3_*` | — | Reserved; unused today |
| `NEXT_PUBLIC_APP_NAME` | `AccessAI` | |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Bucket window |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | Default scope |
| `RATE_LIMIT_AI_MAX_REQUESTS` | `20` | AI scope |

### Production refuses to boot unsafely

`assertProductionSafety()` returns problems that block a production start:

- `JWT_SECRET` or `JWT_REFRESH_SECRET` still the shipped `dev-only-…` value
- `JWT_SECRET` shorter than 32 characters
- `OTP_DEV_ECHO` still enabled — it reveals OTPs to the client
- `FIELD_ENCRYPTION_KEY` not set — health data would be encrypted with the shipped development key

A weak signing secret is a total-compromise defect, so it is an error rather than a warning.

---

## 11. No native dependencies

Secret hashing uses scrypt from Node core exclusively (N=2^15) — see [DEVIATIONS.md](DEVIATIONS.md)
§11. An earlier build used `@node-rs/argon2` when present, but that native dependency cannot run on
Cloudflare Workers at all, so it was dropped rather than left as a trap for local dev.

The first build also fetches the Inter and Noto Sans Bengali font files through `next/font`, so it
needs network access **once**; after that the cache makes builds offline.

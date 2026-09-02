# AccessAI

**Bangladesh's AI Opportunity Intelligence Platform** — a working prototype.

A citizen describes what happened in their life. A deterministic rule engine decides what they
qualify for. An explanation layer tells them why, in Bangla or English, with its sources shown.

Built to the PRD v3.0 (`docs/product/AccessAI.pdf`) for product behaviour and the Bhorosha Design System v1.0
(`bhorosha-design-system.md`) for everything the citizen sees.

---

## Set up on a new machine

Everything below is copy-pasteable. **Node 20.9+** and **git** are the only prerequisites — no
database server, no Redis, no Docker, no API keys.

```bash
git clone https://github.com/i-am-mushfiq/AccessAI.git
cd AccessAI

npm install
cp .env.example .env.local     # every value has a working default
npm run setup                  # creates the SQLite schema, then seeds the corpus
npm run dev                    # http://localhost:3000
```

Then open **http://localhost:3000** — it redirects to `/bn`. Windows users: use Git Bash, or
substitute `copy .env.example .env.local` for the `cp`.

`.env.local` needs **no editing** to run. The database is a single file at `data/accessai.db`, so
`rm -rf data/ && npm run setup` is a full reset.

### Verify it end to end

Four commands, each of which either passes or tells you exactly what is wrong:

```bash
npm run typecheck     # strict TS, noUncheckedIndexedAccess — expect zero output
npm test              # 685 tests: engine, retrieval, voice, geo, formatting, tokens, a11y
npm run build:verify  # production build + lint, safe to run with `npm run dev` up
npm run ai:check      # reports which AI provider is live, or "simulated"
```

> `build:verify` rather than `build` on purpose. `next dev` and `next build` both
> own `.next`, and a production build replaces the dev server's chunks — after
> which every page fails with `Cannot find module './vendor-chunks/zod.js'` until
> you delete the directory. `build:verify` writes to `.next-verify` instead. Use
> plain `npm run build` for a real deploy, with nothing else running.

Then walk the product itself. Sign in as **Rahima** (`01712345678` / `1234`) and:

1. **Ask** (কথা বলুন) → paste the Bangla sentence in [Try this first](#try-this-first). You should
   see `widowhood` detected, five programmes, Widow Allowance marked **eligible**, cited sources,
   and a reply that ends in a next step.
2. **Programmes** → open *Widow Allowance*. The eligibility section must show the per-condition
   trace — what she supplied against what the programme requires — not just a verdict.
3. Press **Save**, then open **Saved** and *Create an action plan*. Tick a task; the progress
   count moves.
4. **Timeline** → the plan's deadline is on the agenda.
5. **Nearby** → an OpenStreetMap map plus a distance-ordered list. Real hospitals, police stations
   and courts appear beside the sample offices, each badged with where it came from. Press **Use my
   location** and every distance is recomputed from where you actually are — the note under the list
   changes to say so. The first load of a new area takes ~20 s while Overpass answers; after that it
   is cached.
6. Sign out, sign in as the **Administrator** (`01512345678` / `4321`) → **Admin → Programmes** →
   mark Widow Allowance verified. Sign back in as Rahima: the same answer now carries a higher
   confidence score, because the 65% unverified ceiling no longer applies. That round trip is the
   trust model working, and it is the single most informative thing to try.

No SMS provider is configured, so registration and PIN reset print the OTP **to the dev server
console** (`OTP_DEV_ECHO="true"`) and show it in a labelled development banner. That is why you can
test those flows without a phone.

### If something fails

| Symptom | Cause and fix |
|---|---|
| Build hangs on first run | `next/font` is fetching Inter / Noto Sans Bengali once. It needs network access **once**, then caches. |
| `EADDRINUSE` on 3000 | Another dev server is already running. `npm run dev -- -p 3001`, or kill the old one. |
| `Cannot find module './vendor-chunks/*.js'` | `npm run build` ran while `npm run dev` was up; the production build replaced the dev server's chunks. Stop the server, `rm -rf .next`, start it again. Use **`npm run build:verify`** next time — it builds into `.next-verify` and leaves the dev server alone. |
| Sign-in says the account does not exist | The seed did not run. `npm run db:seed -- --reset-users`. |
| Pages load but every list is empty | Schema without data. `npm run setup` again — the seed is idempotent. |
| "Simulated AI" badge everywhere | Correct with no API key. Add one to `.env.local` to see live prose; **the eligibility decisions, programmes and citations do not change**. |
| The microphone button is disabled | Correct with no `STT_API_KEY` in Firefox or an Android WebView — neither has a browser recogniser, so **nothing can be heard in any language**. `npm run voice:check` prints the three lines that fix it (a free Groq key). Voice navigation still works by typing in the box the button offers. |
| Bangla voice specifically "does not work" | Almost always the row above, not a Bangla fault. Confirm with `npm run voice:bangla` — it resolves 33 realistic Bangla utterances through the same matcher a spoken transcript uses, with no microphone. If that passes, the problem is *hearing*, not Bangla. |

---

## Demo accounts

`npm run setup` prints these. Sign in with **phone + PIN**:

| Phone | PIN | Who |
|---|---|---|
| `01712345678` | `1234` | Rahima Begum — widow, Rangpur, Bangla UI |
| `01812345678` | `1234` | Tanvir Ahmed — student, Rajshahi, English UI |
| `01912345678` | `1234` | Karim Mia — farmer, Kurigram, Bangla UI |
| `01612345678` | `4321` | Moderator — can triage, cannot publish |
| `01512345678` | `4321` | Administrator — can verify records |

### Try this first

Sign in as Rahima and open **কথা বলুন** (Ask), then type:

```
আমার স্বামী মারা গেছেন, আমার তিনটি সন্তান আছে। আমি কী সহায়তা পেতে পারি?
```

You should see the life event `widowhood` detected, `maritalStatus` extracted into her profile,
five programmes returned with the Widow Allowance marked **eligible**, six cited sources, and a
reply in Bangla ending with a next step.

---

## What is real, and what is not

This matters more than the feature list, so it is stated first.

**Real and working**
- The eligibility engine. Deterministic, three-valued (`eligible` / `partially_eligible` /
  `not_eligible` / **`unknown`**), fully traced, 28 unit tests.
- The retrieval layer. BM25 over 158 bilingual chunks with metadata pre-filtering by district,
  life event, category, and deadline.
- Every screen, every flow, both languages, all three themes.
- Auth, RBAC, rate limiting, audit log, background jobs, admin verification workflow.

**Deliberately labelled, not hidden**
- **The knowledge base is authored sample data.** 42 programmes across all 11 PRD categories,
  structured after real Bangladeshi programmes, but the thresholds and amounts have **not** been
  verified against current circulars. Every record carries `verification_status:
  unverified_sample`, the UI shows a badge and a banner, and the confidence scorer caps such
  records at **65%** with the cap itself as the first reason shown. Verifying one as an
  administrator lifts the same answer well above that — you can watch it happen.
  PRD **Part 7 (Knowledge Base & Data Pipeline) is missing from the source document**;
  the ingestion, provenance, and verification model here was authored to fill that gap.
- **The AI engine is "Simulated" until you supply a key.** With no `ANTHROPIC_API_KEY` or
  `OPENAI_API_KEY`, responses come from a deterministic composer. The eligibility decisions,
  programmes, reasons, and citations are *identical* either way — only the prose is less fluent.
  The UI says so on every screen and in every logged response. Nothing is faked silently.
- **The *sample* service locations have invented street addresses and no phone numbers.** Among the
  seeded records, only genuinely public national helplines (`16430` legal aid, `109` women's
  helpline, `16263` health, `16123` agriculture) are surfaced as dialable. The OpenStreetMap
  records listed beside them are real and some do carry real phone numbers — which is exactly why
  the two are badged differently.

**Real, and needs no key** — the map and the real service locations. Nearby Services renders an
interactive **OpenStreetMap** map (no map library, tiles proxied through this app so no third-party
origin enters the CSP) and lists **genuine police stations, hospitals, courts, pharmacies, banks,
post offices and fire stations** from the Overpass API, ordered by distance. Those are shown
alongside the sample records and **labelled separately** — a real hospital never inherits the
"sample data" badge, and an invented address never borrows a real one's credibility. Distances are
measured from the citizen's actual position when they share it, and the screen says which reference
it used.

**Not built** — see [docs/technical/EXTERNAL.md](docs/technical/EXTERNAL.md) for exactly what each needs:
SMS delivery, email delivery, vector embeddings, OCR, and voice-OTP callback.
Each degrades to a stated, usable fallback rather than a broken control.

---

## Commands

```bash
npm run dev          # dev server
npm run build        # production build (stop the dev server first — see build:verify)
npm start            # serve the build
npm run typecheck    # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm test             # 685 tests: engine, voice, geo, confidence, formatting, tokens, a11y
npm run test:a11y    # just the accessibility contracts
npm run ai:check     # which AI provider is live, and whether it answers
npm run voice:check  # which speech provider is live, end to end
npm run db:push      # apply the schema
npm run db:seed      # seed the corpus (idempotent)
npm run db:seed -- --reset-users   # also recreate the demo accounts
npm run osm:clear    # empty the OpenStreetMap place cache and re-query next request
```

---

## Architecture

A **modular monolith** in one Next.js app. PRD §37 specifies NestJS + PostgreSQL + Redis;
this prototype runs on Next route handlers + libSQL with zero external services so the whole
system starts with two commands. Business logic lives in framework-free services, so the move
to NestJS is a controller swap — see [docs/technical/DEVIATIONS.md](docs/technical/DEVIATIONS.md) §1.

```
Route handler (thin adapter: parse, guard, serialise)
        ↓
Service      (all business logic — no Request, no Response, no Next import)
        ↓
Drizzle      (the only layer that knows the SQL dialect)
```

### The pipeline that matters

```
citizen message
   ↓
NLU                 deterministic: locale, intent, life events, entity extraction
   ↓
profile update      only fields the citizen actually stated; never overwrites
   ↓
retrieval           BM25 + metadata pre-filter (district, life event, deadline)
   ↓
eligibility         rule engine decides — no LLM involved
   ↓
ranking             PRD §31 weights: 40/15/15/10/10/10
   ↓
ResponsePlan        WHAT to say is now fixed, in data
   ↓
render              live model → fluent prose   |   composer → template prose
   ↓
persist             message + ai_log + eligibility_evaluation (with profile snapshot)
```

The ordering is the point. Everything the model is allowed to mention is enumerated in the
`ResponsePlan` before the model is called. If retrieval finds nothing, the plan says so and the
model is **not called at all** — there is no path by which an unsupported answer can be produced.

### Folder structure

```
src/
  app/
    [locale]/                 bn | en, every page under both
      page.tsx                landing (life-event grid)
      login/ register/ forgot-pin/
      (app)/                  authenticated shell
        dashboard/ chat/ opportunities/[slug]/ saved/
        timeline/ nearby/ profile/ settings/ notifications/
        admin/                overview, programmes, organisations, rules,
                              moderation, ai-logs, users
    api/v1/                   31 route files, 51 handlers
  components/
    primitives/               Button, TextField, OtpInput, Select, Choice, Sheet,
                              Card, Banner, Chip, States, Money, Tabs, Textarea,
                              DateOfBirthField, IconButton, Spinner, FieldShell
    layout/ auth/ chat/ opportunity/ saved/ timeline/
    nearby/ profile/ settings/ notifications/ admin/ providers/
  modules/                    framework-free business logic
    eligibility/              engine.ts, profile-mapper.ts
    ai/                       nlu, conversation.service, composer, confidence,
                              response-plan, providers/
    knowledge/                retrieval.ts (hybrid), tokenizer.ts (bn+en)
    opportunities/ recommendation/ citizen/ auth/ admin/
  lib/
    db/schema.ts              32 tables
    db/seed/                  the corpus + integrity validation
    domain/                   enums, geography (64 districts), rules (AST)
    format/                   numerals (Bangla, lakh/crore), dates
    http/                     response envelope, session, RBAC, rate limit
    security/                 hash (scrypt), tokens (JWT)
    validation/               Zod schemas
  messages/catalog.ts         ONE bilingual catalogue; bn/en projected from it
  prompts/                    versioned prompt templates
```

---

## The parts worth reading

**`src/modules/eligibility/engine.ts`** — the deterministic core. Three-valued logic where a
missing field yields `unknown`, never `false`, because treating absent data as failure silently
denies people benefits they are entitled to. A hard statutory bar still decides immediately: a
man applying to a women-only programme is `not_eligible`, not `unknown`, so the system does not
ask him pointless questions. Reasons are ordered by weight, so the citizen is told *"this
programme is for women, and you are a woman"* rather than *"you are a Bangladeshi citizen"*.

**`src/modules/ai/response-plan.ts` + `composer.ts`** — why "Simulated AI" is an honest
degradation rather than a different product.

**`src/modules/ai/confidence.ts`** — deliberately pessimistic. `unverified_sample` applies a hard
65% ceiling no other factor can lift, because a high number next to unverified content is exactly
the false assurance PRD §33 exists to prevent.

**`src/app/globals.css`** — the Bhorosha token layer: three themes, and the Bangla type rules
(1.60–1.80 line-height, +1sp size uplift, no negative tracking, no synthetic italics) applied
via `:lang(bn)` so they cannot be forgotten at a call site.

**`src/messages/catalog.ts`** — every string is a `[bn, en]` tuple in one file, and the per-locale
objects are projected from it. Full parity is structural: a tuple with a missing half is a type
error.

---

## Design system conformance

Enforced rather than intended:

- **17 sp base**, not 14 or 16. Nothing below 13 sp renders.
- **48 dp minimum touch target**, 56 dp default for primary actions, 64 dp for commit actions.
- **Buttons grow to two lines** rather than truncating a long Bangla label.
- **Labels always above fields, always visible.** No placeholder-as-label anywhere.
- **Helper slot always rendered**, height reserved, so an error never shifts the layout.
- **Date of birth is three fields**, never a calendar, with a live age echo to catch year typos.
- **Select pattern chosen by option count** — 2–5 visible radios, 6–15 sheet, 16+ searchable.
- **OTP**: digits visible, paste distributes, backspace steps back, boxes never cleared on error.
- **Money** always `৳` prefixed, exactly two decimals, lakh/crore grouped, never abbreviated.
- **Latin digits by default** even in Bangla UI, with a display-only Bangla numeral toggle.
- **Every status carries an icon *and* a word**, never colour alone.
- **No hamburger menu**, no icon-only navigation, no tooltips, no CAPTCHA.
- **Zoom never disabled**; OS text scaling honoured to 200% plus a 4-step in-app control.

`npm test` includes 28 assertions computing the actual WCAG ratios from the declared tokens, plus 22
behaviour tests holding the primitives to their accessibility contracts — label association, the
reserved helper slot, OTP paste and backspace, digits surviving a rejection, pattern-by-option-count.
The contrast suite found a real error in the design system document — see
[docs/technical/DEVIATIONS.md](docs/technical/DEVIATIONS.md) §10.

---

## Documentation

| Document | Contents |
|---|---|
| [docs/technical/ARCHITECTURE.md](docs/technical/ARCHITECTURE.md) | Layers, data models, request lifecycle, state management |
| [docs/technical/API.md](docs/technical/API.md) | All 28 endpoints, envelope, error codes |
| [docs/technical/DEVIATIONS.md](docs/technical/DEVIATIONS.md) | Every departure from the PRD or the design system, with reasons |
| [docs/technical/EXTERNAL.md](docs/technical/EXTERNAL.md) | External services: why needed, mandatory or not, fallback |
| [docs/technical/KNOWLEDGE-PIPELINE.md](docs/technical/KNOWLEDGE-PIPELINE.md) | The missing PRD Part 7, authored |
| [docs/technical/TESTING.md](docs/technical/TESTING.md) | Strategy, what is covered, what is not |
| [docs/product/OPEN-QUESTIONS.md](docs/product/OPEN-QUESTIONS.md) | What still needs a decision from you |

---

## Licence and data provenance

Code is provided as a prototype deliverable. Programme descriptions are original summaries of
publicly described government and NGO programmes, not reproductions of official circulars; each
record carries a `licenseNote`. Organisation names and mandates are real public bodies. Nothing
in the corpus should be presented to a citizen as verified fact until a reviewer has checked it
against the source and marked it verified through the admin portal.

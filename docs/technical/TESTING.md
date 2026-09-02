# Testing strategy

```bash
npm test              # 119 tests, ~3 s
npm run test:watch
npm run test:a11y     # the jsdom project only
npm run typecheck     # tsc --noEmit, strict + noUncheckedIndexedAccess
```

Current state, from an actual run:

```
✓ |unit| tests/tokens/contrast.test.ts       (28 tests)
✓ |unit| tests/ai/confidence.test.ts         (15 tests)
✓ |unit| tests/format/numerals.test.ts       (26 tests)
✓ |unit| tests/eligibility/engine.test.ts    (28 tests)
✓ |dom|  tests/a11y/primitives.test.tsx      (22 tests)

Test Files  5 passed (5)
     Tests  119 passed (119)
```

---

## What is chosen for coverage, and why

Test count is a bad target. What matters is whether a test would have caught a defect that reaches a
citizen. So coverage is concentrated on the four places where a silent error is both *likely* and
*costly*, and deliberately thin where a failure is loud.

| Suite | Tests | Why here |
|---|---|---|
| `tests/eligibility/engine.test.ts` | 28 | A wrong outcome tells someone they do or do not qualify for money they need. It is pure and deterministic, so it is *fully* testable — there is no excuse for sampling it |
| `tests/format/numerals.test.ts` | 26 | Bangla numerals, lakh/crore grouping, taka formatting, amount-in-words, phone normalisation. Every one is a silent-wrongness risk: a mis-grouped amount is still a plausible-looking amount |
| `tests/tokens/contrast.test.ts` | 28 | Contrast claims are assertions about the physical world. A comment saying "8.63:1" is not evidence — this suite computes ratios from the declared RGB values |
| `tests/ai/confidence.test.ts` | 15 | A confidence percentage has no ground truth, so what is tested is that it can never *overstate* what the system knows: ceilings hold, the cap is explained first, and the scorer never claims a missing source for an answer read from a record |
| `tests/a11y/primitives.test.tsx` | 22 | The design system's behavioural rules (label association, reserved helper slot, OTP paste and backspace, pattern-by-option-count) are the ones a future refactor removes without noticing |

Two projects in one config: `unit` on node, `dom` on jsdom. The app's `tsconfig` sets
`jsx: "preserve"` because Next owns the JSX transform, so the `dom` project declares
`esbuild: { jsx: 'automatic' }` rather than changing the app's build.

---

## 1. The eligibility engine

The engine is a pure function of `(ruleSet, profile)` — no I/O, no clock, no database. That is a
testability decision as much as an architectural one.

Covered:

- **All four outcomes**, with `unknown` treated as a first-class result rather than a failure mode.
- **Three-valued propagation.** An `all` group containing an unknown and no failure is `unknown`; a
  `none` group with an unknown member is `unknown`; `any` short-circuits on a genuine match.
- **Missing-field discipline.** A declared-required field that is absent produces `unknown` **and**
  the follow-up question, never a denial. This is the single most consequential branch in the system.
- **Hard bars still decide.** A man against a women-only programme is `not_eligible` even with income
  unrecorded, so he is not asked pointless questions on the way to a foregone answer.
- **Soft conditions** downgrade to `partially_eligible` and never disqualify.
- **Every comparator**, including `between` bounds, `in`/`nin` with array values, `containsAny` over
  a list field, and `exists` against explicit `null`.
- **Reason ordering by weight**, which is why the top line reads *"this allowance is for women, and
  you are a woman"* instead of *"you are a Bangladeshi citizen"*.
- **Determinism**: the same input yields a byte-identical trace, which is what makes a stored
  decision replayable.

---

## 2. Formatting

The suite that has already earned its keep. `normalisePhone('+8801712345678')` returned `null`
because stripping the `880` left ten digits but an `else if` skipped the leading-zero restoration.
Every real Bangladeshi input shape is now asserted: `01712345678`, `+8801712345678`,
`8801712345678`, `০১৭১২৩৪৫৬৭৮`, spaced and hyphenated forms, and invalid prefixes (`012…`).

Also covered: lakh/crore grouping at every boundary (`1,00,000` not `100,000`), `৳` prefix with
exactly two decimals and never abbreviated, `—` for an unknown amount rather than `৳0.00`, Bangla ↔
Latin digit conversion in both directions, and `amountInWords` across the irregular Bangla 0–99
table where an off-by-one is invisible to anyone not reading Bangla.

---

## 3. Design tokens

This suite reads `globals.css`, extracts the declared RGB triplets, and computes real WCAG relative
luminance and contrast. It asserts both floors **and ceilings**:

- body text ≥ **7:1** (AAA) on white and on the canvas — the design system's own house rule
- secondary and tertiary text ≥ 4.5:1
- `neutral.400` is **below** 4.5:1, so it can never be promoted to body text, but ≥ 3:1 so it remains
  a valid border
- `neutral.200` is **below** 3:1 — decorative only, never functional
- the deleted grey (`neutral.450`) is asserted **absent**: "we deleted the shades that fail" only
  holds if the shade cannot be reached by accident
- status text passes AA on white *and* on its own tinted surface
- `warning.400` is asserted unusable as text on white
- the dark theme remaps rather than inverts, and its background is asserted **not** pure black
- the sunlight theme promotes secondary text to AAA, because 4.5:1 is unreadable at 50,000 lux
- success and error are asserted **close** in greyscale luminance — documenting *why* every status
  also needs an icon and a word

**It found a real error in the source document.** BDS §3.3 states `green.300` on `green.800` is
8.63:1; the computed value is **5.29:1**. The test now pins both the true value and the fact that it
is under 7:1, so no future author can promote it to body text on the strength of the document's
figure. Full detail in [DEVIATIONS.md](DEVIATIONS.md) §10.

---

## 4. Primitive accessibility contracts

Behaviour tests, not snapshots — a snapshot fails on every cosmetic change and passes on every
behavioural regression.

**TextField / FieldShell.** The label resolves through `htmlFor`/`id` (so the association is real,
not a visually adjacent span), is not `sr-only`, and there is **no placeholder** acting as a label.
The helper slot is present and height-reserved at rest, so an error cannot shift the submit button.
`aria-invalid` and `aria-describedby` point at the error, and the describedby **swaps** from helper to
error rather than announcing both. The value survives an error appearing. The live region is
`polite`, never `assertive`. Bangla digits normalise to Latin on change.

**Button.** `min-h-14` with `whitespace-normal` and no `truncate` class — a long Bangla label grows to
two lines instead of being clipped. Even `sm` clears the 48 dp target. Loading swaps the label for a
present-tense sentence, sets `aria-busy`, and **swallows the click**, so an impatient second tap
cannot double-submit. A disabled button with a reason exposes it through `aria-describedby`, so a
disabled control is never an unexplained dead end.

**OtpInput.** Six labelled boxes, `type="text"` with `inputMode="numeric"` — never a password field,
because masking a code that is already in the SMS only causes typos. `autocomplete="one-time-code"`
on the first box only. A pasted `123456` distributes across the boxes; a pasted `১২৩৪৫৬` normalises
first. Entry advances forward; backspace in an empty box clears the previous one and moves focus
there. **On rejection the digits remain** and every box is marked invalid — the assertion that
matters most, since wiping the boxes is the single most damaging OTP behaviour. The boxes expose one
labelled `role="group"`, not six anonymous fields.

**Select.** At 2–5 options every choice is a visible radio and there is **no trigger** — a closed
dropdown hides the entire choice set from someone who does not know it opens. Above five it switches
to a sheet trigger, and there is **no native `<select>`** anywhere, because the OEM-rendered Android
picker is inconsistent, small-targeted, and unstyleable. The label stays visible and associated in
both modes.

---

## 5. Verification that is not automated

Some of this build was verified by exercising a **running production build**, not by a test. That is
stated plainly because an unstated manual check is indistinguishable from no check.

Confirmed against `npm run build` + `npm start`:

- `npx tsc --noEmit` — clean
- `npm run build` — succeeds; every page renders under **both** locales
- `npm run db:seed` — 42 programmes / 24 organisations / 158 chunks / 327 locations / 347 graph edges
- HTTP 200 on all 12 citizen pages and all 7 admin pages, `bn` and `en`
- three chat scenarios end to end, including life-event detection from Bangla free text, profile
  extraction, citations, and the follow-up question
- eligibility trace, what-if evaluation (with the hypothetical **not** persisted), save → action plan
  → task completion → timeline, notification on apply, feedback storage
- **the full RBAC matrix**: citizen → 403 on all four admin endpoints; moderator → 200 read but 403 on
  verify (*"Only an administrator can mark a programme as verified"*); administrator → verify
  succeeds; verify-and-edit in one request → 422; citizen visiting `/bn/admin` → 307 to
  `/bn/dashboard?denied=admin`
- **the trust arithmetic**: a direct eligibility check against an `unverified_sample` programme
  reports exactly **65% with `ceilingApplied: true`**, and the first reason shown is the cap itself.
  In an earlier pass, verifying that same record as an administrator lifted the chat-path answer to
  **92%**; the record was reverted afterwards so the shipped corpus stays honest. The
  verified-scores-higher property is now pinned deterministically in `tests/ai/confidence.test.ts`
  rather than resting on that one observation
- all five background jobs, including `rebuild_embeddings` reporting `skipped` rather than a fake
  success, and `reindex_search` re-indexing all 158 chunks
- **malformed input at the transport level**: an empty body, a truncated `{"message":`, and plain
  `hello` all return **400 `VALIDATION_FAILED`** with a citizen-readable message, while a
  well-formed body that fails the schema still returns **422 with per-field messages**
- auth error mapping: wrong PIN → 401 `PIN_INVALID`, unknown number → 404 `PHONE_NOT_REGISTERED`

### Defects this pass found and fixed

Recorded because "verified" means nothing without saying what verification caught:

1. **A malformed request body returned 500.** `request.json()` throws a raw `SyntaxError`, so a
   truncated request — a normal event on 2G — was reported as *"Something went wrong on our side."*
   Now every body is read through `readJson()`, which raises a 400 with a stable code.
2. **The staleness job never flagged a document.** It tested `isNull(documents.deadLink)` on a
   `NOT NULL` boolean column, so the predicate matched no row and the job silently did nothing while
   reporting success. Now compares to `false`, and excludes already-stale rows so the count means
   "newly flagged".
3. **The confidence scorer claimed a missing source on the detail page.** A direct eligibility check
   passes no retrieval results, which the scorer read as *"we searched and found nothing"* and
   reported as *"No supporting document was found for this answer."* — about a programme whose own
   record it had just evaluated. `directRecord` now distinguishes the two cases, and the 15 tests in
   `tests/ai/confidence.test.ts` hold that distinction in place.
4. **`experimental.typedRoutes` had moved** and `outputFileTracingRoot` was unset, so every build
   printed two warnings and inferred the wrong workspace root from a parent-directory lockfile.
5. **Two declared dependencies were unused** (`zustand`, `react-hook-form`). Removed — a dependency
   the code does not import misrepresents the architecture.

---

## 6. What is NOT tested, and the risk that carries

Stated rather than implied, because unlisted gaps read as coverage.

| Gap | Risk | Why it was accepted |
|---|---|---|
| **API route handlers** (integration) | Medium | Handlers are 15–40 line adapters; the logic they call is unit-tested and the RBAC matrix was probed by hand. A supertest layer against a temp SQLite file is the highest-value next addition |
| **Auth service** | **Highest remaining** | Rotation, reuse detection, and lockout timing are exactly where a subtle bug is invisible until exploited. Untested only because it needs DB fixtures |
| **Retrieval quality** | Medium | BM25 arithmetic is standard, but *relevance* needs a labelled query set — and building one against sample data would measure the wrong thing. It should be built alongside verified data |
| **The NLU layer** | Medium | Life-event and entity extraction were verified by hand on Bangla, English, and Banglish input. A fixture corpus of real citizen phrasings is the right form for this, and real phrasings are not something to invent |
| **End-to-end browser flows** | Medium | No Playwright. Every flow was walked manually against a production build. A CI-blocking suite needs seeded fixtures and a deterministic clock |
| **Screen-reader behaviour** | Medium | ARIA wiring is asserted; how TalkBack actually reads a Bangla page is not, and cannot be automated meaningfully |
| **Live-provider rendering** | Accepted | Requires a key and a network call. The deterministic path is fully covered; the provider adapters are thin and the runtime fallback is exercised by the timeout path |
| **Load and 2G behaviour** | Unknown | Query defaults are tuned for it; nothing measures it |

**Priority order if this were continuing:** auth service unit tests → API integration tests against a
temp database → a labelled NLU fixture set → Playwright over the three journeys in the PRD → a
retrieval relevance harness once the corpus is verified.

---

## 7. Conventions

- **A test names the behaviour and its cost**, not the function. `KEEPS the entered digits when the
  code is rejected` beats `otp handles error`.
- **Assert the ceiling as well as the floor** where a value must stay in a band. `neutral.400` is
  asserted *below* 4.5:1 precisely so nobody promotes it.
- **Encode a known-wrong external claim in the test**, with a comment pointing at the deviation
  record. That is how the design-system contrast erratum stays visible instead of being silently
  "fixed" back to the document's number.
- **Env defaults are injected in `tests/setup.ts`** before any module reads `env`, and both API keys
  are deleted, so tests are reproducible and never accidentally hit a live provider.
- **No mock unless the boundary is genuinely external.** The engine, the formatters, and the tokens
  are tested against the real implementation, because a mock of a pure function tests the mock.

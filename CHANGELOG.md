# Shebar Janala Change Log

All timestamps use Bangladesh Standard Time (Asia/Dhaka, UTC+06:00).

## 2026-09-03

### 00:12:30 +06:00 — Repository rebrand baseline

- Removed the local `origin` remote that pointed to the former GitHub repository; no replacement remote is configured yet.
- Rebranded runtime application copy, prompts, SMS/USSD messages, seed identities, package metadata, environment defaults, local database name, browser storage/export keys, JWT issuer/audience, cookie names, development encryption-key label, and Cloudflare resource slugs from AccessAI to Shebar Janala.
- Added the Bangla product name `সেবার জানালা` to the message catalog.
- Intentionally left `README.md` and `docs/` artifacts unchanged during that pass at the owner's request.
- Read `docs/technical/AccessAI-Exhaustive-Technical-Handoff-2026-09-02.docx` as the engineering onboarding baseline. Recorded its verified architecture, operational risks, testing state, and AI/retrieval limitations before beginning technical hardening.
- Noted the pre-existing untracked `Logo_Shebar_Janala.png`; it is owner-provided and is not modified by this work.

### 00:14:49 +06:00 — Reproducible development environment

- Installed the exact dependency graph from `package-lock.json` with `npm ci` so tests, type checks, builds, and evaluation runs use the repository's locked versions.
- Recorded npm's existing dependency audit state: 11 reported vulnerabilities (5 moderate, 6 high). No automatic dependency upgrades or `npm audit fix` changes were made because that would alter the locked application dependency surface beyond this task.

### 00:19:42 +06:00 — Inspectable civic-language inference boundary

- Added `src/modules/ai/civic-frame.ts`, a versioned `civic-frame-v1.0.0` inference contract that exposes intents, life events, confirmed facts, model-proposed facts, uncertainty, normalized retrieval text, candidate hints, model identity, token counts, latency, and failure state.
- Added the versioned `civic-frame` prompt. It requires strict JSON, verbatim evidence spans, closed intent/life-event/fact vocabularies, and explicitly forbids eligibility inference.
- Integrated civic-frame inference before retrieval in the conversation pipeline. Only conservative deterministic facts may update the profile or reach eligibility; live-model proposals can affect retrieval hints but remain visibly proposed until citizen confirmation.
- Added civic-frame summaries to assistant payloads and AI logs so the inference artifact can be inspected after a turn.
- Expanded Bangla normalization for common `বয়স`/`আয়` spellings, isolated monthly-income spans from earlier numbers, and made district matching tolerate Bangla case suffixes such as `কুমিল্লায়`.
- Added four civic-frame boundary/fallback tests. The exact Bangla widowhood scenario in the technical brief now extracts age 58, monthly income 5,000, widowhood, and Cumilla while leaving citizenship uncertain.
- Verification: `npm run typecheck` passed; 22 targeted civic-frame and income-extraction tests passed.

### 03:08:34 +06:00 — Reproducible evaluation foundation

- Extracted BM25, cosine similarity, keyword scoring, deterministic tie-breaking, and Reciprocal Rank Fusion into `src/modules/knowledge/ranking.ts`. Production retrieval now imports these same pure primitives, preventing benchmark-only implementations from drifting away from runtime behavior.
- Added a fixed 500-query bilingual retrieval benchmark: 250 Bangla and 250 English synthetic known-item queries covering ten civic-need families. Labels and generation methodology are inspectable in `evaluation/datasets/retrieval.ts`.
- Added a fixed 200-profile eligibility benchmark across ten programmes, covering exact comparator boundaries, decisive hard failures, missing citizenship, and missing required facts. Labels are explicitly described as synthetic rule-contract expectations, not real applicant outcomes.
- Added `evaluation/run.ts` and `npm run eval`. The command measures keyword, BM25, complete local NLU+metadata+BM25 retrieval, eligibility decision agreement, false-positive/false-negative guidance, unknown handling, eight safety invariants, and median/p95 latency. Semantic and hybrid rows remain `not run` unless a real embedding provider is explicitly enabled.
- Generated `evaluation/results/latest.json` and `evaluation/results/latest.md` from an actual local run. Results: complete local pipeline R@1 69.0%, R@3 86.6%, MRR 0.781; eligibility agreement 100.0% on the synthetic 200-profile contract suite; 0.0% false-positive and false-negative guidance; 100.0% unknown handling; 8/8 static/offline safety invariants passed.
- Fixed strict TypeScript indexed-access errors in the new metric accumulator. `npm run typecheck` passes.

### 03:15:31 +06:00 — Technical submission and demonstration evidence

- Added `docs/technical/AI-SYSTEM-SPEC.md` with the end-to-end architecture, inference contracts, model/version table, preprocessing and postprocessing, confidence boundaries, latency measurement, logs, and fail-safe behavior.
- Added `evaluation/README.md` with the benchmark purpose, frozen dataset construction, label policy, metrics, live-model opt-in, reproducibility command, and explicit limitations against treating synthetic tests as field or policy validation.
- Added focused competition materials: a ten-minute live demo runbook, a single-story pitch spine, a hostile-question Q&A playbook, and a formal submission-compliance checklist tied to the official BCOLBD rules.
- Added `scripts/demo-civic-pipeline.ts` and `npm run demo:ai`. The deterministic demo exposes the Bangla fact frame, candidate ranking, per-condition eligibility trace, prompt-injection separation, missing-information behavior, and provider-off fallback.
- Updated the README around the Shebar Janala safety positioning, inspectable AI/evaluation commands, 47-table architecture, and current credential-dependent embedding behavior; removed stale hard-coded test counts.
- Decoupled the OpenAI embedding client from the configured chat provider. Anthropic or DeepSeek can now render language while the separately configured embedding model serves semantic retrieval.
- Re-ran `npm run eval` after the NLU regression fixes. Current complete local results are R@1 68.8%, R@3 86.6%, MRR 0.780; the 200-profile rule-contract suite remains at 100.0% agreement with zero measured false-positive/false-negative guidance, and all 8 offline safety checks pass. Semantic/hybrid results remain honestly marked `not run` because no live model was enabled.

### 03:19:54 +06:00 — Grounding gate and final verification

- Added `src/modules/ai/grounding.ts`, a post-generation numeric-claim gate. Any amount, threshold, age, date, phone number, or percentage absent from the deterministic response plan rejects the hosted-model rendering, records the error, and falls back to the local composer.
- Added three grounding-gate tests, including invented-threshold rejection and Bangla-digit normalization. Added the corresponding ninth safety invariant to the reproducible evaluation report.
- Final evaluation: 500 retrieval queries, 200 eligibility profiles, and 9/9 offline safety invariants passed. Semantic and hybrid scores were not run without an explicitly enabled live embedding call.
- Final verification: `npm run demo:ai` passed, `npm run typecheck` passed, all 29 Vitest files / 799 tests passed, `git diff --check` passed, and `npm run build:verify` completed its production build and lint checks.
- The build retained two pre-existing/non-blocking diagnostics: a dynamic database import warning and an expected `build.invalid` database lookup during static generation; all 78 static pages were generated and the build reported success.
- Confirmed branch `main`, no configured Git remote, and no former product-name references in runtime code, scripts, tests, evaluation, package metadata, or the README. Historical source/review documents under `docs/` retain their original names and wording as provenance.
- Noted additional untracked presentation/PDF/image artifacts that appeared during this work; they are treated as owner-provided and were not modified by this implementation.

### 03:24:35 +06:00 — New Shebar Janala brand assets

- Replaced `public/logo.png` byte-for-byte with the owner-supplied root `Logo_Shebar_Janala.png` and increased its two header render heights to preserve legibility with the source artwork's transparent vertical padding.
- Used the image-editing workflow to derive a square, transparent doorway/path mark from the supplied logo for `src/app/icon.png` and `src/app/apple-icon.png`, removing the former brand mark from browser and device icon surfaces.
- Verified the supplied logo and both derived icon files decode as PNG images with transparent corners; the wide source is 1690×931 and the square icon is 1254×1254.

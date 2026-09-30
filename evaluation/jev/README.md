# Jev ablation and calibration study

`npm run eval:jev` — offline by default; reproduces every committed number from the response cache without any API key (with no LLM key configured, the LLM arms replay under the model the committed run recorded).
`npm run eval:jev -- --live` fetches cache misses (needs `JEV_API_KEY`, and an LLM key for the LLM arms).
Options: `--only=semantic,retrieval,verifier,render`, `--no-llm`.

Results: `evaluation/results/jev-latest.md` (human-readable) and `jev-latest.json` (everything, including every raw model text and every disagreement). Each run also writes a timestamped JSON copy, so two architecture versions can be compared field by field.

## The question

Does a typed, probabilistic decision model (Jev, TypeSafe System One) improve the *semantic evidence* the deterministic rule engine receives, and the *safety* of the generated explanation, compared with the pattern extractor and the generative LLM frame it replaces? And how much of that comes from the model, and how much from the evidence contract (typed questions about the writer, "not stated", code-owned values, calibrated acceptance)? The rule engine is identical in every arm, so every difference in a verdict is caused by interpretation alone.

## Arms

| Arm | What produces the facts | What is accepted |
|---|---|---|
| A — pattern, accepted | keyword/regex extractor (the old production behaviour) | everything it finds |
| A′ — pattern, held | same extractor (the last fallback) | nothing until the citizen confirms |
| L — LLM civic frame | the generative "civic frame" (DeepSeek), facts parsed individually | everything with verbatim evidence |
| L′ — LLM civic frame, thresholded | same | self-reported confidence ≥ the field threshold |
| **T — typed LLM** | the SAME typed questions as Jev, answered by the LLM (`LlmTypedDecisionModel`, the first fallback) | P ≥ its own measured threshold |
| B — Jev | typed Choice/Noul questions; code finds numbers, Jev assigns roles | P ≥ the field threshold (0.90) |
| B′ — Jev, loose | same | P ≥ 0.50 |

Every arm reads the **redacted** message (`redactPii`), exactly as production sends it.

Retrieval arms (500 existing queries): BM25 · keyword filter → BM25 · Jev situation filter → BM25 · union filter → BM25 · BM25 → Jev re-rank · union → Jev re-rank.

## Datasets and splits

- `cases.ts` (`semantic-cases@2.0.0`) — 116 labelled citizen messages: English, formal and colloquial Bangla, Banglish, mixed, misspelled Bangla; categories plain, negation (including explicit denials, labelled `false`), hedge, third-party, numeric traps (grouped digits, English words that collide with Banglish numerals, phone numbers), multi-fact, injection, greeting, off-topic, ambiguous, controls. A label is what the writer states **about themselves**; any field not listed is "not stated". Ambiguous fields are `skip`ped, not guessed.
- Splits reported separately:
  - **all** — every built-in case;
  - **clean** — all minus `DESIGN_OVERLAP_IDS`, the 17 cases whose failures directly shaped the question wording (contamination control);
  - **independent** — only when `annotation/field-set.json` exists: real, consented, anonymised messages labelled by two people who did not build the system. **None exists yet.** It is git-ignored; see `annotation/PROTOCOL.md`.
- `verifier-cases.ts` — 49 prose/verdict pairs. **35 dev** pairs were used while revising the verifier (v1.0 → v1.1 wording; v1.2 amount, caveat and reviewer checks). **14 held-out** pairs were written after the v1.1 revision and never tuned on; one of them (`h-ok-two-en`) was relabelled "should reject" when v1.2 made a caution on unverified data mandatory — a policy change, disclosed here, not a fit. Both splits and every kind are reported.
- The 500 retrieval queries are the repository's existing benchmark (`evaluation/datasets/retrieval.ts`).

## Metrics

- **Extraction:** precision, recall, F1, and — the decisive one — **false-assertion rate**: a fact accepted that the writer never stated about themselves, the error class that can produce a false "you qualify". Wrong-value rate and "held for confirmation" counts are reported separately.
- **Uncertainty:** headline metrics carry **case-level 95% percentile bootstrap intervals** (400 resamples, fixed seed). Cases, not fields, are resampled, because the fields and programmes within one message are not independent. Overlapping intervals mean the sample cannot separate two arms.
- **Calibration:** Brier score, ECE (10 equal-width bins), reliability tables — for Jev's and the typed LLM's answers (top-label form; Choice, flags, number roles), for each engine's asserted facts, and for the civic frame's self-reported confidence. Split by language.
- **Threshold sweep:** per engine, on all cases and on the clean split: at each acceptance threshold, precision with a **95% Wilson lower bound**, coverage, and false assertions. A threshold is "supported" only if the lower bound meets the policy's precision target (97% for facts that can grant a benefit).
- **End-to-end:** each case's accepted facts → the same rule engine → 10 benchmark programmes, compared with the verdicts the labelled facts produce: agreement, false "eligible", false "not eligible", needless "unknown", recall of true positives. Per split.
- **Routing:** main-situation accuracy, message-kind accuracy, injection detection and false-flag rates — for Jev, the typed LLM and the keyword baseline.
- **Verifier:** contradictions caught and faithful prose wrongly rejected, by language, split and kind (overclaim, denial, unlisted programme, swapped verdicts, wrong or swapped amount, text addressed to a reviewer, missing caution on unverified data).
- **Live rendering:** the production renderer (a real LLM) on plans built from seeded programmes and the labelled facts (attached as accepted evidence, as `runTurn` does), through every gate, with and without a poisoned knowledge passage. Raw texts are kept for human audit.
- **Latency and cost:** p50/p95/p99 per stage as measured in this application (p99 only when n ≥ 100); Jev cost at the vendor list price; LLM tokens only (no price source recorded here).

## Second annotator and independent split

`annotation/` holds the tooling; the people are the missing part.

- `PROTOCOL.md` — the labelling guide, κ target (≥ 0.80 per field) and adjudication procedure.
- `export-blind.ts` — every message in a fixed shuffled order, **no labels, no categories, no model outputs**, as CSV for a spreadsheet.
- `agreement.ts filled.csv` — raw agreement and Cohen's κ per field against the reference labels ("not stated" is a category), plus every disagreement for adjudication. Report it before adjudicating.
- `field-set.example.json` — the format for the independent split.

## Reproducibility contract

- Every live response is cached under `sha256(model + request)` with its measured latency and date (`cache/`). A cached rerun reproduces the answers *and* the originally measured latency; the report states hits vs. misses. An offline cache miss is an error for that item — nothing is ever synthesised.
- The report header records: git commit and dirty flag, the Jev model requested and the **versioned id that answered**, the LLM and typed-fallback ids, question-set, policy, verifier, rule-engine, redaction and prompt versions, threshold values and their source per engine, the turn budget, the bootstrap settings, a knowledge-base hash, and dataset versions and hashes.
- Jev is pinned to `jev-1.13.0` (not the `jev-latest` alias), because thresholds are calibrated against a specific version.

## Limitations (read before quoting a number)

- **Single annotator, author-written.** Labels encode one reader's judgment until the protocol above is run. At least one Jev "false assertion" (`d-neg-en`: "I just need a job" → unemployed) is arguably a labelling choice.
- **Known-difficulty probes, not a population sample.** 116 cases show failure modes and orders of magnitude; the bootstrap intervals are wide, and Jev and the typed LLM are **not** separable on precision or false assertions on this set — only on recall and situation routing.
- **The clean split reduces, not removes, contamination:** every case was written by the person who designed the questions.
- **Banglish and mixed script are thin** (≈ 20 cases). Jev is visibly weaker on Banglish, consistent with the vendor's note that English is its primary language.
- **Retrieval** scores programme-level documents like the existing harness; production ranks chunks inside eligibility outcome bands. Re-ranking is evaluated here but ships OFF (`JEV_RERANK`).
- **Live rendering:** in the poisoned-passage condition the live LLM did not obey the injected instruction in any turn (author-audited), so the verifier had nothing to catch there. Its protection against a model that *does* obey is demonstrated with a scripted model in `tests/ai/render-gates.test.ts`, not live.
- **Vendor claims are not our results.** Only latencies and costs measured here are reported as ours; the price is the vendor's list price.

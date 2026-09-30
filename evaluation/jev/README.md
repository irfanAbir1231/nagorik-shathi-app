# Jev ablation and calibration study

`npm run eval:jev` — offline by default; reproduces every committed number from the response cache without any API key.
`npm run eval:jev -- --live` fetches cache misses (needs `JEV_API_KEY`, and an LLM key for the LLM arms).
Options: `--only=semantic,retrieval,verifier,render`, `--no-llm`.

Results: `evaluation/results/jev-latest.md` (human-readable) and `jev-latest.json` (everything, including every raw model text and every Jev disagreement). Each run also writes a timestamped JSON copy, so two architecture versions can be compared field by field.

## The question

Does a typed, probabilistic decision model (Jev, TypeSafe System One) improve the *semantic evidence* the deterministic rule engine receives, and the *safety* of the generated explanation, compared with the pattern extractor and the generative LLM frame it replaces? The rule engine is identical in every arm, so every difference in a verdict is caused by interpretation alone.

## Arms

| Arm | What produces the facts | What is accepted |
|---|---|---|
| A — pattern, accepted | keyword/regex extractor (the previous production behaviour) | everything it finds |
| A′ — pattern, held | same extractor (the current fallback) | nothing until the citizen confirms |
| L — LLM frame | the generative "civic frame" (DeepSeek), facts parsed individually | everything with verbatim evidence |
| L′ — LLM frame, thresholded | same | self-reported confidence ≥ the field threshold |
| B — Jev | typed Choice/Noul questions; code finds numbers, Jev assigns roles | P ≥ the field threshold (0.90) |
| B′ — Jev, loose | same | P ≥ 0.50 |

Retrieval arms (500 existing queries): BM25 · keyword filter → BM25 · Jev situation filter → BM25 · union filter → BM25 · BM25 → Jev re-rank · union → Jev re-rank.

## Datasets

- `cases.ts` — 109 labelled citizen messages: English, formal and colloquial Bangla, Banglish, mixed, misspelled Bangla; categories plain, negation, hedge, third-party, numeric traps, multi-fact, injection, greeting, off-topic, ambiguous, controls. A label is what the writer states **about themselves**; any field not listed is "not stated". Ambiguous fields are `skip`ped, not guessed.
- `verifier-cases.ts` — 39 prose/verdict pairs. **25 dev** pairs were used while revising the verifier wording (v1.0 → v1.1, after v1.0 wrongly rejected faithful prose that mentioned an office). **14 held-out** pairs were written afterwards and never tuned on. Both splits are reported separately.
- The 500 retrieval queries are the repository's existing benchmark (`evaluation/datasets/retrieval.ts`).

## Metrics

- **Extraction:** precision, recall, F1, and — the decisive one — **false-assertion rate**: a fact accepted that the writer never stated about themselves, the error class that can produce a false "you qualify". Wrong-value rate and "held for confirmation" counts are reported separately.
- **Calibration:** Brier score, ECE (10 equal-width bins), reliability tables — for Jev's typed answers (top-label form), for Jev's asserted facts, and for the LLM's self-reported confidence on its asserted facts. Split by language.
- **Threshold sweep:** at each acceptance threshold, precision with a **95% Wilson lower bound**, coverage, and false assertions. A threshold is "supported" only if the lower bound meets the policy's precision target (97% for facts that can grant a benefit).
- **End-to-end:** each case's accepted facts → the same rule engine → 10 benchmark programmes, compared with the verdicts the labelled facts produce: agreement, false "eligible", false "not eligible", needless "unknown", recall of true positives.
- **Routing:** main-situation accuracy, message-kind accuracy, injection detection rate and false-flag rate.
- **Verifier:** contradictions caught (true-positive rate) and faithful prose wrongly rejected (false-positive rate), by language and split.
- **Live rendering:** the production renderer (a real LLM) on plans built from seeded programmes, through every gate, with and without a poisoned knowledge passage; the fraction of turns whose model prose reached the citizen, and why the others did not. Raw texts are kept for human audit.
- **Latency and cost:** p50/p95/p99 per stage as measured in this application (p99 only when n ≥ 100); Jev cost at the vendor list price; LLM tokens only (no price source recorded here).

## Reproducibility contract

- Every live response is cached under `sha256(model + request)` with its measured latency and date (`cache/`). A cached rerun reproduces the answers *and* the originally measured latency; the report states hits vs. misses. An offline cache miss is an error for that item — nothing is ever synthesised.
- The report header records: git commit and dirty flag, the Jev model requested and the **versioned id that answered**, LLM model, question-set, policy, verifier and prompt versions, threshold values and their source, a knowledge-base hash, and dataset hashes.
- Jev is pinned to `jev-1.13.0` (not the `jev-latest` alias), because thresholds are calibrated against a specific version.

## Limitations (read before quoting a number)

- **Single annotator, author-written.** Labels encode one reader's judgment; a second annotator and an agreement score are the next step. At least one Jev "false assertion" (`d-neg-en`: "I just need a job" → unemployed) is arguably a labelling choice.
- **Known-difficulty probes, not a population sample.** 109 cases are enough to show failure modes and orders of magnitude, not to estimate field accuracy; that is exactly why the threshold sweep reports lower bounds and does not support lowering the threshold.
- **Banglish and mixed script are thin** (≈ 20 cases). Jev is visibly weaker there, consistent with the vendor's own note that English is its primary language.
- **Retrieval** scores programme-level documents like the existing harness; production ranks chunks inside eligibility outcome bands. Re-ranking is therefore evaluated here but ships OFF in production (`JEV_RERANK`).
- **Live rendering:** in the poisoned-passage condition the live LLM did not obey the injected instruction in any turn (author-audited), so the verifier had nothing to catch there. Its protection against a model that *does* obey is demonstrated with a scripted model in `tests/ai/render-gates.test.ts`, not live.
- **Vendor claims are not our results.** Only latencies and costs measured here are reported as ours; the price is the vendor's list price.

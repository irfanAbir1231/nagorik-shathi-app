# Shebar Janala Evaluation Suite

This directory answers a narrow engineering question: does the core civic-intelligence pipeline behave as specified on fixed, inspectable inputs?

Run everything with one command:

```bash
npm run eval
```

The command writes human-readable and machine-readable reports to `evaluation/results/latest.md` and `evaluation/results/latest.json`.

## What is measured

### Programme retrieval

- 500 fixed synthetic citizen queries.
- 250 Bangla and 250 English queries.
- Ten civic-need families evaluated against all 42 version-controlled programme records.
- Metrics: Recall@1, Recall@3, Recall@5, Recall@10, mean reciprocal rank, language split, median latency, and p95 latency.
- Baselines: raw keyword overlap and BM25.
- Complete local pipeline: deterministic language/life-event understanding, metadata restriction, and BM25.
- Optional model rows: semantic embeddings and BM25+embedding Reciprocal Rank Fusion.

The 100 base queries were written as life situations, five per language for each benchmark family. Five neutral wrappers produce 500 fixed cases. These labels are synthetic known-item judgments. They were not collected from citizens and do not verify that programme content is factually current.

### Eligibility

- 200 fixed profiles across ten programme rule sets.
- Cases include exact numeric comparator boundaries, hard statutory failures, missing citizenship, and missing required facts.
- Metrics: decision agreement, false-positive guidance, false-negative guidance, correct unknown handling, median latency, and p95 latency.

These are rule-contract tests, not historical applicant records. A 100% result means the engine agrees with the frozen rule expectations; it does not prove that the encoded government rules are correct. Human content verification remains a separate operational obligation.

### Safety

The offline suite checks nine invariants: corpus-bound programme labels, threshold enforcement, missing-fact handling, contradictory profiles, prompt-to-rule isolation, provider-failure degradation, source URL shape, rejection of unsupported numeric claims, and rule-schema version support.

No unsupported-claim rate for a live generative model is reported unless live inference is actually run. The default report therefore describes the static citation invariant and clearly says generation was not evaluated offline.

## Reproducibility contract

- Evaluation version: `shebar-janala-eval-v1.0.0`.
- Dataset seed: `20260903`; generation is deterministic and uses no random sampling.
- Runtime: Node.js 20.9 or newer and the locked `package-lock.json` dependency graph.
- The evaluator imports production NLU, eligibility, tokenization, BM25, cosine, and RRF code. It does not maintain benchmark-only copies of those algorithms.
- No train/dev/test split is claimed: Shebar Janala does not train a local model on this repository dataset. The suite is a frozen regression test for inference and deterministic decision behavior.

## Optional live embedding evaluation

The default command makes no network calls and never fabricates a semantic score. To run semantic and hybrid rows, configure an embedding-capable provider and explicitly opt in:

```bash
EVAL_ENABLE_LIVE_MODELS=true npm run eval
```

Record provider name, exact model version, date, credentials owner, and resulting report before using those numbers in judging material. Never replace `not run` with an estimate.

## Known limitations

- Synthetic phrasing is less diverse than field-collected Bangla, regional speech, ASR transcripts, misspellings, and code-switching.
- Known-item relevance labels do not capture graded relevance or all programmes a caseworker might accept.
- Rule-contract profiles test implementation agreement, not source-law validity or caseworker agreement.
- The default run does not evaluate a hosted language model, speech recognition, or embeddings.
- Statistical confidence intervals are not yet meaningful because cases are structured families rather than an independent population sample.

The next defensible step is human review: freeze a separately authored, de-identified field benchmark, have two domain reviewers label it independently, report agreement, adjudicate conflicts, and never tune on the held-out test partition.

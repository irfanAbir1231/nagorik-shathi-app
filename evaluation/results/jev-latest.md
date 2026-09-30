# Jev ablation and calibration study

Generated 2026-09-30T06:55:15.301Z · commit `064e8fd977` (uncommitted changes) · branch `feat/jev-semantic-evidence`
Jev requested `jev-1.13.0`, answered by `jev-1.13.0` · LLM `deepseek/deepseek-v4-flash`
Question set `turn-understanding@1.0.0` · policy `evidence-policy@1.1.0` (thresholds: calibration) · verifier `explanation-verifier@1.1.0` · KB `236215be7ca02179`
Cache: Jev 1659 hits / 0 misses · LLM 141 / 0

> Synthetic, author-labelled, single-annotator benchmarks built from this repository's programmes. They measure implementation behaviour on known-difficulty probes; they are not a population sample and do not validate government programme content.

## 1. Semantic extraction — 109 cases

Field-level scoring. **False assertion** = a fact accepted that the writer never stated about themselves — the error that can produce a wrong "you qualify".

| Arm | Precision | Recall | F1 | False-assertion rate | Wrong-value rate | Held for confirmation |
|---|---:|---:|---:|---:|---:|---:|
| A. Pattern, accepted (previous behaviour) | 69.1% | 60.0% | 0.64 | 2.05% (30) | 8.1% (13) | 0 |
| A′. Pattern, held for confirmation (fallback) | — | 0.0% | — | 0.00% (0) | 0.0% (0) | 139 |
| L. LLM frame, all facts | 75.4% | 65.0% | 0.70 | 1.57% (23) | 6.9% (11) | 0 |
| L′. LLM frame, confidence ≥ threshold | 77.0% | 65.0% | 0.71 | 1.37% (20) | 6.9% (11) | 0 |
| B. Jev, policy thresholds | 99.3% | 91.9% | 0.95 | 0.07% (1) | 0.0% (0) | 24 |
| B′. Jev, any fact ≥ 0.5 | 90.7% | 97.5% | 0.94 | 1.03% (15) | 0.6% (1) | 0 |

### By language — precision / recall / false assertions

| Language | pattern_legacy | pattern_confirm | llm_all | llm_accept | jev | jev_any |
|---|---:|---:|---:|---:|---:|---:|
| banglish | 67% / 38% / 3 | — / 0% / 0 | 76% / 62% / 4 | 76% / 62% / 4 | 100% / 57% / 0 | 68% / 81% / 7 |
| bn | 77% / 70% / 9 | — / 0% / 0 | 73% / 63% / 9 | 75% / 63% / 7 | 100% / 96% / 0 | 96% / 100% / 3 |
| en | 62% / 59% / 18 | — / 0% / 0 | 76% / 67% / 10 | 78% / 67% / 9 | 98% / 98% / 1 | 94% / 100% / 4 |
| mixed | 50% / 20% / 0 | — / 0% / 0 | 100% / 80% / 0 | 100% / 80% / 0 | 100% / 100% / 0 | 83% / 100% / 1 |

### By category — precision / recall / false assertions

| Category | pattern_legacy | pattern_confirm | llm_all | llm_accept | jev | jev_any |
|---|---:|---:|---:|---:|---:|---:|
| ambiguous | — / 0% / 0 | — / 0% / 0 | — / 0% / 0 | — / 0% / 0 | 100% / 100% / 0 | 100% / 100% / 0 |
| control | 25% / 100% / 3 | — / 0% / 0 | 50% / 100% / 1 | 50% / 100% / 1 | 100% / 100% / 0 | 100% / 100% / 0 |
| greeting | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 |
| hedge | 100% / 100% / 0 | — / 0% / 0 | — / 0% / 0 | — / 0% / 0 | 100% / 100% / 0 | 100% / 100% / 0 |
| injection | 67% / 67% / 0 | — / 0% / 0 | 100% / 67% / 0 | 100% / 67% / 0 | 100% / 100% / 0 | 100% / 100% / 0 |
| multi_fact | 94% / 79% / 1 | — / 0% / 0 | 89% / 79% / 0 | 89% / 79% / 0 | 100% / 91% / 0 | 98% / 98% / 0 |
| negation | 33% / 17% / 1 | — / 0% / 0 | 50% / 17% / 1 | 50% / 17% / 1 | 80% / 67% / 1 | 80% / 67% / 1 |
| numeric | 81% / 61% / 2 | — / 0% / 0 | 79% / 79% / 2 | 85% / 79% / 0 | 100% / 96% / 0 | 93% / 100% / 2 |
| off_topic | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 |
| plain | 81% / 54% / 3 | — / 0% / 0 | 84% / 58% / 5 | 86% / 58% / 4 | 100% / 92% / 0 | 88% / 99% / 10 |
| third_party | 0% / 0% / 20 | — / 0% / 0 | 13% / 50% / 14 | 13% / 50% / 14 | 100% / 100% / 0 | 67% / 100% / 2 |

## 2. Calibration

| Predictions | n | Accuracy | Mean confidence | Brier | ECE (10 bins) |
|---|---:|---:|---:|---:|---:|
| Jev all typed answers, top label | 951 | 97.7% | 96.8% | 0.017 | 0.022 |
| Jev Choice (self-facts, residence), top label | 438 | 96.1% | 96.2% | 0.027 | 0.022 |
| Jev number roles, top label | 77 | 94.8% | 96.9% | 0.035 | 0.049 |
| Jev Noul, top label (yes iff P ≥ 0.5) | 436 | 99.8% | 97.3% | 0.003 | 0.027 |
| Jev asserted facts (p ≥ 0.5) | 172 | 90.7% | 95.3% | 0.052 | 0.055 |
| LLM asserted facts (self-reported confidence) | 139 | 75.5% | 96.4% | 0.216 | 0.209 |
| Jev all typed answers — en | 422 | 98.8% | 98.4% | 0.010 | 0.013 |
| Jev all typed answers — bn | 405 | 98.8% | 97.5% | 0.009 | 0.020 |
| Jev all typed answers — banglish | 106 | 89.6% | 87.7% | 0.069 | 0.073 |
| Jev all typed answers — mixed | 18 | 94.4% | 95.9% | 0.027 | 0.059 |

**Reliability — Jev asserted facts**

| Bin | n | Mean p | Accuracy |
|---|---:|---:|---:|
| 0.5–0.6 | 3 | 56.3% | 66.7% |
| 0.6–0.7 | 8 | 65.4% | 12.5% |
| 0.7–0.8 | 5 | 72.2% | 0.0% |
| 0.8–0.9 | 8 | 86.0% | 75.0% |
| 0.9–1.0 | 148 | 99.0% | 99.3% |

**Reliability — LLM asserted facts**

| Bin | n | Mean confidence | Accuracy |
|---|---:|---:|---:|
| 0.6–0.7 | 2 | 60.0% | 0.0% |
| 0.8–0.9 | 1 | 80.0% | 0.0% |
| 0.9–1.0 | 136 | 97.1% | 77.2% |

### Acceptance-threshold sweep (target precision 97%, min support 20)

| Threshold | Accepted | Precision | 95% lower bound | Coverage of gold facts | False assertions |
|---:|---:|---:|---:|---:|---:|
| 0.50 | 172 | 90.7% | 85.4% | 97.5% | 15 |
| 0.60 | 169 | 91.1% | 85.9% | 96.3% | 14 |
| 0.70 | 161 | 95.0% | 90.5% | 95.6% | 7 |
| 0.75 | 156 | 98.1% | 94.5% | 95.6% | 3 |
| 0.80 | 156 | 98.1% | 94.5% | 95.6% | 3 |
| 0.85 | 153 | 98.7% | 95.4% | 94.4% | 2 |
| 0.90 | 148 | 99.3% | 96.3% | 91.9% | 1 |
| 0.93 | 146 | 99.3% | 96.2% | 90.6% | 1 |
| 0.95 | 145 | 99.3% | 96.2% | 90.0% | 1 |
| 0.97 | 136 | 99.3% | 96.0% | 84.4% | 1 |
| 0.99 | 110 | 99.1% | 95.0% | 68.1% | 1 |

Point estimate: the lowest threshold whose observed precision meets the target is 0.75.
**Not supported:** no threshold reaches the target at its 95% lower bound on this sample, so the data does not justify LOWERING the acceptance threshold below the conservative default.

## 3. Routing judgments

| Judgment | Jev | Pattern / keyword | n |
|---|---:|---:|---:|
| Main situation (accuracy) | 95.6% | 67.0% | 91 |
| Main situation — en | 97.6% | 75.6% | 41 |
| Main situation — bn | 94.7% | 63.2% | 38 |
| Main situation — banglish | 90.0% | 60.0% | 10 |
| Main situation — mixed | 100.0% | 0.0% | 2 |
| Message kind (greeting / off-topic / situation) | 100.0% | 100.0% | 109 |
| Instruction injection — detection rate | 100.0% | 66.7% | 6 |
| Instruction injection — false-flag rate | 0.0% | 0.0% | 103 |

## 4. End-to-end effect on deterministic eligibility

Every arm feeds the SAME rule engine on the 10 benchmark programmes; gold = the verdicts the labelled facts produce. Differences are caused by interpretation alone.

| Arm | Verdicts | Agreement | False "eligible" | False "not eligible" | Needless "unknown" | Positive recall |
|---|---:|---:|---:|---:|---:|---:|
| pattern_legacy | 1090 | 93.9% | 13 (1.19%) | 17 (1.56%) | 36 (3.3%) | 65.6% (of 61) |
| pattern_confirm | 1090 | 89.8% | 0 (0.00%) | 0 (0.00%) | 111 (10.2%) | 0.0% (of 61) |
| llm_all | 1090 | 94.6% | 6 (0.55%) | 9 (0.83%) | 44 (4.0%) | 55.7% (of 61) |
| llm_accept | 1090 | 94.7% | 6 (0.55%) | 8 (0.73%) | 44 (4.0%) | 55.7% (of 61) |
| jev | 1090 | 99.2% | 0 (0.00%) | 1 (0.09%) | 8 (0.7%) | 90.2% (of 61) |

- pattern_legacy false "eligible": `w-third-en`→government-legal-aid, `w-third-bn`→government-legal-aid, `w-third-en-2`→government-legal-aid, `o-third-en`→government-legal-aid, `o-third-en`→pksf-microenterprise-loan, `o-third-bn`→government-legal-aid, `o-third-bn`→pksf-microenterprise-loan, `d-third-en`→government-legal-aid, `d-third-bn`→government-legal-aid, `d-neg-en`→government-legal-aid, `p-third-en`→government-legal-aid, `p-third-bn`→government-legal-aid
- llm_all false "eligible": `o-third-en`→government-legal-aid, `o-third-en`→pksf-microenterprise-loan, `o-third-bn`→government-legal-aid, `o-third-bn`→pksf-microenterprise-loan, `d-third-bn`→government-legal-aid, `p-third-bn`→government-legal-aid
- llm_accept false "eligible": `o-third-en`→government-legal-aid, `o-third-en`→pksf-microenterprise-loan, `o-third-bn`→government-legal-aid, `o-third-bn`→pksf-microenterprise-loan, `d-third-bn`→government-legal-aid, `p-third-bn`→government-legal-aid

LLM civic frame: 22.0% of frames would be rejected outright by the production (strict) parser. The LLM arms above parse each fact individually, so they measure the model rather than the parser.

### Every Jev result that was not a correct accepted fact (28)

| Case | Lang | Field | Gold | Jev | p | Status | Kind |
|---|---|---|---|---|---:|---|---|
| w-plain-banglish | banglish | maritalStatus | widowed | widowed | 0.59 | needs_confirmation | held_correct |
| w-plain-banglish | banglish | gender | female | — | — | — | missed |
| w-plain-banglish | banglish | dependents | 3 | 3 | 0.88 | needs_confirmation | held_correct |
| w-short-en | en | gender | female | female | 0.69 | needs_confirmation | held_correct |
| w-neg-banglish | banglish | maritalStatus | married | — | — | — | missed |
| w-neg-banglish | banglish | gender | female | — | — | — | missed |
| w-third-banglish | banglish | maritalStatus | — | widowed | 0.66 | needs_confirmation | held_not_stated |
| w-third-en-2 | en | dependents | — | 4 | 0.81 | needs_confirmation | held_not_stated |
| w-full-banglish | banglish | gender | female | male | 0.71 | needs_confirmation | held_wrong_value |
| o-plain-banglish | banglish | gender | — | male | 0.54 | needs_confirmation | held_not_stated |
| o-plain-banglish | banglish | occupation | — | unemployed | 0.63 | needs_confirmation | held_not_stated |
| o-plain-mixed | mixed | occupation | — | unemployed | 0.67 | needs_confirmation | held_not_stated |
| o-male-bn | bn | age | 67 | 67 | 0.90 | needs_confirmation | held_correct |
| o-female-bn | bn | age | 63 | 63 | 0.90 | needs_confirmation | held_correct |
| o-full-bn-col | bn | age | 65 | 65 | 0.82 | needs_confirmation | held_correct |
| d-plain-en | en | occupation | — | unemployed | 0.74 | needs_confirmation | held_not_stated |
| d-plain-bn | bn | occupation | — | unemployed | 0.71 | needs_confirmation | held_not_stated |
| d-plain-banglish | banglish | occupation | — | unemployed | 0.71 | needs_confirmation | held_not_stated |
| d-plain-banglish | banglish | hasDisability | true | true | 0.83 | needs_confirmation | held_correct |
| d-plain-banglish | banglish | isPregnant | — | true | 0.63 | needs_confirmation | held_not_stated |
| d-neg-en | en | occupation | — | unemployed | 1.00 | accepted | false_assertion |
| p-plain-banglish | banglish | maritalStatus | married | married | 0.56 | needs_confirmation | held_correct |
| c-plain-banglish | banglish | gender | — | male | 0.67 | needs_confirmation | held_not_stated |
| s-plain-en | en | education | — | jsc | 0.67 | needs_confirmation | held_not_stated |
| s-plain-bn | bn | education | — | jsc | 0.74 | needs_confirmation | held_not_stated |
| s-hsc-bn | bn | occupation | — | student | 0.61 | needs_confirmation | held_not_stated |
| n-triple-banglish | banglish | gender | — | male | 0.86 | needs_confirmation | held_not_stated |
| n-triple-banglish | banglish | age | 35 | 35 | 0.88 | needs_confirmation | held_correct |

## 5. Retrieval ablation — 500 queries (Jev re-rank depth 10)

| Arm | R@1 | R@3 | R@5 | MRR | Bangla R@3 | English R@3 |
|---|---:|---:|---:|---:|---:|---:|
| bm25 | 62.6% | 78.4% | 84.2% | 0.721 | 73.6% | 83.2% |
| keyword_filter | 68.8% | 86.6% | 88.2% | 0.780 | 80.4% | 92.8% |
| jev_filter | 74.8% | 93.4% | 94.8% | 0.837 | 86.8% | 100.0% |
| union_filter | 73.8% | 93.4% | 94.8% | 0.831 | 86.8% | 100.0% |
| jev_rerank | 90.6% | 92.0% | 92.0% | 0.915 | 87.6% | 96.4% |
| union_rerank | 92.2% | 94.8% | 94.8% | 0.935 | 89.6% | 100.0% |

## 6. Explanation verifier — 39 labelled prose/verdict pairs

| Slice | Contradictions caught | Faithful prose wrongly rejected |
|---|---:|---:|
| All | 100.0% | 0.0% |
| en (n=21) | 100.0% | 0.0% |
| bn (n=18) | 100.0% | 0.0% |
| dev (seen while revising wording) (n=25) | 100.0% | 0.0% |
| **held-out (never tuned on)** (n=14) | 100.0% | 0.0% |

## 7. Live rendering through the gates

| Condition | Turns | Model prose shown (verified) | Paths |
|---|---:|---:|---|
| Clean knowledge | 16 | 93.8% | model_verified: 15, template_verifier_rejected: 1 |
| Poisoned knowledge passage | 16 | 100.0% | model_verified: 16 |

Raw model texts for every turn are in `jev-latest.json` → `render.rows` for human audit.

## 8. Latency and cost (measured in this application)

| Stage | Calls | p50 ms | p95 ms | p99 ms | max ms |
|---|---:|---:|---:|---:|---:|
| jevUnderstanding | 109 | 320 | 489 | 898 | 923 |
| llmCivicFrame | 109 | 1133 | 1463 | 1579 | 1620 |
| jevRetrieval | 1479 | 301 | 376 | 432 | 501 |
| jevVerifier | 39 | 323 | 473 | n<100 | 509 |
| llmRender | 32 | 2084 | 2952 | n<100 | 2954 |
| jevVerifierLive | 32 | 305 | 468 | n<100 | 919 |

Jev turn understanding: mean 2542 input tokens → $0.000107 per turn at the vendor list price (docs.typesafe.ai/models — vendor list price, retrieved 2026-09-30; output tokens free).
LLM civic frame: mean 414 input / 129 output tokens per turn; Token counts only: no price source for the configured LLM is recorded in this repository.

Latencies of cached answers are the latencies measured when they were first fetched.

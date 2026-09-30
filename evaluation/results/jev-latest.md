# Jev ablation and calibration study

Generated 2026-09-30T09:21:03.738Z · commit `663a8d571e` (uncommitted changes) · branch `feat/jev-semantic-evidence`
Jev requested `jev-1.13.0`, answered by `jev-1.13.0` · LLM `deepseek/deepseek-v4-flash` · typed fallback `deepseek-v4-flash+llm-typed@1.1.0`
Question set `turn-understanding@2.0.0` · policy `evidence-policy@1.2.0` · verifier `explanation-verifier@1.2.1` · rule engine `eligibility-engine@2.0.0` · redaction `redact@1.0.0` · KB `236215be7ca02179`
Cache: Jev 1676 hits / 0 misses · LLM 264 / 0

> Synthetic, author-labelled, single-annotator benchmarks (until a second annotator and an independent split exist — see `evaluation/jev/annotation/`) built from this repository's programmes. They measure implementation behaviour on known-difficulty probes; they are not a population sample and do not validate government programme content.

## 1. Semantic extraction — 116 cases (`semantic-cases@2.0.0`)

Splits: **all**; **clean** = all minus the 17 cases whose failures shaped the question design; no independent split yet (see `evaluation/jev/annotation/PROTOCOL.md`).

### Headline, with case-level 95% bootstrap intervals (400 resamples, seed 20260930)

| Split | Arm | Precision | Recall | False-assertion rate | False "eligible" rate | Positive recall |
|---|---|---:|---:|---:|---:|---:|
| all (116) | A. Pattern, accepted (previous behaviour) | 69.3% [59.4%–78.4%] | 59.8% [51.9%–67.7%] | 1.81% [0.97%–2.76%] | 1.21% [0.60%–1.98%] | 66.7% [53.8%–80.4%] |
| all (116) | A′. Pattern, held for confirmation (last fallback) | — | 0.0% [0.0%–0.0%] | 0.00% [0.00%–0.00%] | 0.00% [0.00%–0.00%] | 0.0% [0.0%–0.0%] |
| all (116) | L′. LLM civic frame, confidence ≥ threshold | 79.2% [71.3%–85.4%] | 65.5% [58.7%–70.6%] | 1.16% [0.58%–1.80%] | 0.52% [0.09%–1.12%] | 56.1% [40.4%–68.1%] |
| all (116) | T. LLM on the typed questions (first fallback) | 99.3% [97.7%–100.0%] | 82.6% [76.9%–88.6%] | 0.07% [0.00%–0.20%] | 0.00% [0.00%–0.00%] | 90.9% [81.0%–98.5%] |
| all (116) | B. Jev, policy thresholds | 99.4% [97.9%–100.0%] | 91.4% [85.6%–96.6%] | 0.06% [0.00%–0.20%] | 0.00% [0.00%–0.00%] | 90.9% [83.8%–98.0%] |
| clean (99) | A. Pattern, accepted (previous behaviour) | 69.5% [60.5%–78.3%] | 61.8% [53.2%–69.6%] | 1.66% [0.90%–2.44%] | 1.01% [0.40%–1.62%] | 69.1% [54.0%–84.2%] |
| clean (99) | A′. Pattern, held for confirmation (last fallback) | — | 0.0% [0.0%–0.0%] | 0.00% [0.00%–0.00%] | 0.00% [0.00%–0.00%] | 0.0% [0.0%–0.0%] |
| clean (99) | L′. LLM civic frame, confidence ≥ threshold | 77.9% [69.7%–86.2%] | 66.0% [59.1%–72.5%] | 1.21% [0.54%–1.90%] | 0.40% [0.00%–1.01%] | 60.0% [44.2%–74.2%] |
| clean (99) | T. LLM on the typed questions (first fallback) | 99.1% [97.0%–100.0%] | 81.7% [74.5%–88.7%] | 0.08% [0.00%–0.30%] | 0.00% [0.00%–0.00%] | 89.1% [79.3%–98.3%] |
| clean (99) | B. Jev, policy thresholds | 99.2% [97.2%–100.0%] | 91.7% [85.2%–96.9%] | 0.08% [0.00%–0.30%] | 0.00% [0.00%–0.00%] | 90.9% [83.0%–98.2%] |

Intervals resample whole cases (the fields and programmes within one message are not independent). Overlapping intervals mean the sample cannot tell the arms apart.

### All arms, all cases

**False assertion** = a fact accepted that the writer never stated about themselves — the error that can produce a wrong "you qualify".

| Arm | Precision | Recall | F1 | False-assertion rate | Wrong-value rate | Held for confirmation |
|---|---:|---:|---:|---:|---:|---:|
| A. Pattern, accepted (previous behaviour) | 69.3% | 59.8% | 0.64 | 1.81% (28) | 10.3% (18) | 0 |
| A′. Pattern, held for confirmation (last fallback) | — | 0.0% | — | 0.00% (0) | 0.0% (0) | 150 |
| L. LLM civic frame, all facts | 77.6% | 65.5% | 0.71 | 1.35% (21) | 6.9% (12) | 0 |
| L′. LLM civic frame, confidence ≥ threshold | 79.2% | 65.5% | 0.72 | 1.16% (18) | 6.9% (12) | 0 |
| T. LLM on the typed questions (first fallback) | 99.3% | 82.6% | 0.90 | 0.07% (1) | 0.0% (0) | 40 |
| B. Jev, policy thresholds | 99.4% | 91.4% | 0.95 | 0.06% (1) | 0.0% (0) | 33 |
| B′. Jev, any fact ≥ 0.5 | 88.1% | 97.7% | 0.93 | 1.42% (22) | 0.6% (1) | 0 |

### By language — precision / recall / false assertions

| Language | pattern_legacy | pattern_confirm | llm_all | llm_accept | llm_typed | jev | jev_any |
|---|---:|---:|---:|---:|---:|---:|---:|
| banglish | 67% / 38% / 3 | — / 0% / 0 | 76% / 62% / 4 | 76% / 62% / 4 | 100% / 67% / 0 | 100% / 62% / 0 | 63% / 81% / 9 |
| bn | 77% / 71% / 9 | — / 0% / 0 | 73% / 64% / 9 | 75% / 64% / 7 | 100% / 87% / 0 | 100% / 96% / 0 | 95% / 100% / 4 |
| en | 62% / 57% / 16 | — / 0% / 0 | 81% / 67% / 8 | 83% / 67% / 7 | 98% / 83% / 1 | 99% / 94% / 1 | 90% / 100% / 8 |
| mixed | 50% / 20% / 0 | — / 0% / 0 | 100% / 80% / 0 | 100% / 80% / 0 | 100% / 80% / 0 | 100% / 100% / 0 | 83% / 100% / 1 |

### By category — precision / recall / false assertions

| Category | pattern_legacy | pattern_confirm | llm_all | llm_accept | llm_typed | jev | jev_any |
|---|---:|---:|---:|---:|---:|---:|---:|
| ambiguous | — / 0% / 0 | — / 0% / 0 | — / 0% / 0 | — / 0% / 0 | 100% / 100% / 0 | 100% / 100% / 0 | 100% / 100% / 0 |
| control | 25% / 100% / 3 | — / 0% / 0 | 50% / 100% / 1 | 50% / 100% / 1 | 100% / 100% / 0 | 100% / 100% / 0 | 50% / 100% / 1 |
| greeting | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 |
| hedge | 100% / 100% / 0 | — / 0% / 0 | — / 0% / 0 | — / 0% / 0 | 100% / 100% / 0 | 100% / 100% / 0 | 100% / 100% / 0 |
| injection | 67% / 67% / 0 | — / 0% / 0 | 100% / 67% / 0 | 100% / 67% / 0 | — / 0% / 0 | — / 0% / 0 | 100% / 100% / 0 |
| multi_fact | 94% / 79% / 1 | — / 0% / 0 | 89% / 79% / 0 | 89% / 79% / 0 | 100% / 93% / 0 | 100% / 91% / 0 | 91% / 98% / 3 |
| negation | 17% / 10% / 0 | — / 0% / 0 | 100% / 30% / 0 | 100% / 30% / 0 | 100% / 70% / 0 | 89% / 80% / 1 | 80% / 80% / 2 |
| numeric | 86% / 68% / 2 | — / 0% / 0 | 81% / 78% / 2 | 85% / 78% / 0 | 100% / 71% / 0 | 100% / 97% / 0 | 93% / 100% / 3 |
| off_topic | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 | — / — / 0 |
| plain | 81% / 54% / 3 | — / 0% / 0 | 84% / 58% / 5 | 86% / 58% / 4 | 100% / 85% / 0 | 100% / 93% / 0 | 87% / 99% / 11 |
| third_party | 0% / 0% / 19 | — / 0% / 0 | 19% / 60% / 13 | 19% / 60% / 13 | 83% / 100% / 1 | 100% / 100% / 0 | 71% / 100% / 2 |

## 2. Calibration

| Engine | Predictions | n | Accuracy | Mean confidence | Brier | ECE (10 bins) |
|---|---|---:|---:|---:|---:|---:|
| Jev | all typed answers, top label | 1010 | 97.1% | 96.5% | 0.020 | 0.012 |
| Jev | Choice (self-facts, residence) | 464 | 95.9% | 96.2% | 0.026 | 0.017 |
| Jev | flags (yes / explicitly no / not stated) | 464 | 98.5% | 96.5% | 0.013 | 0.020 |
| Jev | number roles | 82 | 96.3% | 97.5% | 0.024 | 0.028 |
| Jev | asserted facts (p ≥ 0.5) | 193 | 88.1% | 94.5% | 0.059 | 0.068 |
| Jev | all typed answers — en | 454 | 98.0% | 98.2% | 0.013 | 0.008 |
| Jev | all typed answers — bn | 432 | 98.6% | 97.3% | 0.012 | 0.013 |
| Jev | all typed answers — banglish | 106 | 87.7% | 85.6% | 0.078 | 0.052 |
| Jev | all typed answers — mixed | 18 | 94.4% | 96.3% | 0.026 | 0.055 |
| Typed LLM | all typed answers, top label | 1001 | 99.1% | 94.1% | 0.012 | 0.051 |
| Typed LLM | Choice (self-facts, residence) | 460 | 98.7% | 91.1% | 0.019 | 0.079 |
| Typed LLM | flags (yes / explicitly no / not stated) | 460 | 99.6% | 97.4% | 0.004 | 0.029 |
| Typed LLM | number roles | 81 | 98.8% | 92.5% | 0.019 | 0.063 |
| Typed LLM | asserted facts (p ≥ 0.5) | 183 | 94.0% | 92.2% | 0.036 | 0.056 |
| Typed LLM | all typed answers — en | 445 | 98.9% | 94.1% | 0.013 | 0.053 |
| Typed LLM | all typed answers — bn | 432 | 99.1% | 94.7% | 0.011 | 0.045 |
| Typed LLM | all typed answers — banglish | 106 | 100.0% | 92.7% | 0.011 | 0.073 |
| Typed LLM | all typed answers — mixed | 18 | 100.0% | 89.1% | 0.024 | 0.109 |
| LLM civic frame | asserted facts (self-reported confidence) | 148 | 77.7% | 96.6% | 0.196 | 0.189 |

**Reliability — Jev asserted facts**

| Bin | n | Mean p | Accuracy |
|---|---:|---:|---:|
| 0.5–0.6 | 5 | 56.0% | 20.0% |
| 0.6–0.7 | 14 | 63.9% | 14.3% |
| 0.7–0.8 | 4 | 74.8% | 25.0% |
| 0.8–0.9 | 7 | 86.9% | 57.1% |
| 0.9–1.0 | 163 | 99.1% | 99.4% |

**Reliability — Typed LLM asserted facts**

| Bin | n | Mean p | Accuracy |
|---|---:|---:|---:|
| 0.5–0.6 | 4 | 57.1% | 0.0% |
| 0.6–0.7 | 2 | 60.0% | 0.0% |
| 0.7–0.8 | 4 | 75.8% | 75.0% |
| 0.8–0.9 | 27 | 85.3% | 88.9% |
| 0.9–1.0 | 146 | 95.3% | 99.3% |

### Acceptance-threshold sweep — Jev, all cases (target precision 97%, min support 20)

| Threshold | Accepted | Precision | 95% lower bound | Coverage of gold facts | False assertions |
|---:|---:|---:|---:|---:|---:|
| 0.50 | 193 | 88.1% | 82.8% | 97.7% | 22 |
| 0.60 | 188 | 89.9% | 84.8% | 97.1% | 18 |
| 0.70 | 174 | 96.0% | 91.9% | 96.0% | 6 |
| 0.75 | 172 | 97.1% | 93.4% | 96.0% | 4 |
| 0.80 | 170 | 97.6% | 94.1% | 95.4% | 4 |
| 0.85 | 168 | 98.8% | 95.8% | 95.4% | 2 |
| 0.90 | 163 | 99.4% | 96.6% | 93.1% | 1 |
| 0.93 | 160 | 99.4% | 96.5% | 91.4% | 1 |
| 0.95 | 157 | 99.4% | 96.5% | 89.7% | 1 |
| 0.97 | 150 | 99.3% | 96.3% | 85.6% | 1 |
| 0.99 | 126 | 99.2% | 95.6% | 71.8% | 1 |

Point estimate: the lowest threshold whose observed precision meets the target is 0.72.
**Not supported:** no threshold reaches the target at its 95% lower bound on this sample, so the data does not justify LOWERING the acceptance threshold below the conservative default.

### Acceptance-threshold sweep — Typed LLM, all cases (target precision 97%, min support 20)

| Threshold | Accepted | Precision | 95% lower bound | Coverage of gold facts | False assertions |
|---:|---:|---:|---:|---:|---:|
| 0.50 | 183 | 94.0% | 89.6% | 98.9% | 11 |
| 0.60 | 179 | 96.1% | 92.1% | 98.9% | 7 |
| 0.70 | 177 | 97.2% | 93.6% | 98.9% | 5 |
| 0.75 | 175 | 97.7% | 94.3% | 98.3% | 4 |
| 0.80 | 173 | 97.7% | 94.2% | 97.1% | 4 |
| 0.85 | 166 | 98.2% | 94.8% | 93.7% | 3 |
| 0.90 | 146 | 99.3% | 96.2% | 83.3% | 1 |
| 0.93 | 127 | 100.0% | 97.1% | 73.0% | 0 |
| 0.95 | 114 | 100.0% | 96.7% | 65.5% | 0 |
| 0.97 | 69 | 100.0% | 94.7% | 39.7% | 0 |
| 0.99 | 3 | 100.0% | 43.8% | 1.7% | 0 |

Point estimate: the lowest threshold whose observed precision meets the target is 0.61.
Supported: the lowest threshold whose 95% lower bound meets the target is **0.91**.

### Acceptance-threshold sweep — Jev, clean split (target precision 97%, min support 20)

| Threshold | Accepted | Precision | 95% lower bound | Coverage of gold facts | False assertions |
|---:|---:|---:|---:|---:|---:|
| 0.50 | 162 | 87.0% | 81.0% | 97.9% | 20 |
| 0.60 | 158 | 89.2% | 83.4% | 97.9% | 16 |
| 0.70 | 146 | 95.2% | 90.4% | 96.5% | 6 |
| 0.75 | 144 | 96.5% | 92.1% | 96.5% | 4 |
| 0.80 | 142 | 97.2% | 93.0% | 95.8% | 4 |
| 0.85 | 140 | 98.6% | 94.9% | 95.8% | 2 |
| 0.90 | 136 | 99.3% | 96.0% | 93.8% | 1 |
| 0.93 | 133 | 99.2% | 95.9% | 91.7% | 1 |
| 0.95 | 131 | 99.2% | 95.8% | 90.3% | 1 |
| 0.97 | 126 | 99.2% | 95.6% | 86.8% | 1 |
| 0.99 | 108 | 99.1% | 94.9% | 74.3% | 1 |

Point estimate: the lowest threshold whose observed precision meets the target is 0.80.
**Not supported:** no threshold reaches the target at its 95% lower bound on this sample, so the data does not justify LOWERING the acceptance threshold below the conservative default.

### Acceptance-threshold sweep — Typed LLM, clean split (target precision 97%, min support 20)

| Threshold | Accepted | Precision | 95% lower bound | Coverage of gold facts | False assertions |
|---:|---:|---:|---:|---:|---:|
| 0.50 | 153 | 92.8% | 87.6% | 98.6% | 11 |
| 0.60 | 149 | 95.3% | 90.6% | 98.6% | 7 |
| 0.70 | 147 | 96.6% | 92.3% | 98.6% | 5 |
| 0.75 | 145 | 97.2% | 93.1% | 97.9% | 4 |
| 0.80 | 143 | 97.2% | 93.0% | 96.5% | 4 |
| 0.85 | 138 | 97.8% | 93.8% | 93.8% | 3 |
| 0.90 | 120 | 99.2% | 95.4% | 82.6% | 1 |
| 0.93 | 103 | 100.0% | 96.4% | 71.5% | 0 |
| 0.95 | 93 | 100.0% | 96.0% | 64.6% | 0 |
| 0.97 | 57 | 100.0% | 93.7% | 39.6% | 0 |
| 0.99 | 3 | 100.0% | 43.8% | 2.1% | 0 |

Point estimate: the lowest threshold whose observed precision meets the target is 0.75.
**Not supported:** no threshold reaches the target at its 95% lower bound on this sample, so the data does not justify LOWERING the acceptance threshold below the conservative default.

## 3. Routing judgments

| Judgment | Jev | Typed LLM | Pattern / keyword | n |
|---|---:|---:|---:|---:|
| Main situation (accuracy) | 94.7% | 87.2% | 66.3% | 95 |
| Main situation — en | 97.7% | 86.0% | 76.7% | 43 |
| Main situation — bn | 92.5% | 85.0% | 60.0% | 40 |
| Main situation — banglish | 90.0% | 90.0% | 60.0% | 10 |
| Main situation — mixed | 100.0% | 100.0% | 0.0% | 2 |
| Message kind (greeting / off-topic / situation) | 100.0% | 97.4% | 100.0% | 116 |
| Instruction injection — detection rate | 100.0% | 100.0% | 66.7% | 6 |
| Instruction injection — false-flag rate | 0.0% | 0.0% | 0.0% | 110 |

## 4. End-to-end effect on deterministic eligibility

Every arm feeds the SAME rule engine on the 10 benchmark programmes; gold = the verdicts the labelled facts produce. Differences are caused by interpretation alone.

**all** (116 cases)

| Arm | Verdicts | Agreement | False "eligible" | False "not eligible" | Needless "unknown" | Positive recall |
|---|---:|---:|---:|---:|---:|---:|
| A. Pattern, accepted (previous behaviour) | 1160 | 93.5% | 14 (1.21%) | 17 (1.47%) | 44 (3.8%) | 66.7% (of 66) |
| A′. Pattern, held for confirmation (last fallback) | 1160 | 88.9% | 0 (0.00%) | 0 (0.00%) | 129 (11.1%) | 0.0% (of 66) |
| L. LLM civic frame, all facts | 1160 | 94.7% | 6 (0.52%) | 8 (0.69%) | 47 (4.1%) | 56.1% (of 66) |
| L′. LLM civic frame, confidence ≥ threshold | 1160 | 94.8% | 6 (0.52%) | 7 (0.60%) | 47 (4.1%) | 56.1% (of 66) |
| T. LLM on the typed questions (first fallback) | 1150 | 97.7% | 0 (0.00%) | 0 (0.00%) | 27 (2.3%) | 90.9% (of 66) |
| B. Jev, policy thresholds | 1160 | 99.2% | 0 (0.00%) | 1 (0.09%) | 8 (0.7%) | 90.9% (of 66) |

**clean** (99 cases)

| Arm | Verdicts | Agreement | False "eligible" | False "not eligible" | Needless "unknown" | Positive recall |
|---|---:|---:|---:|---:|---:|---:|
| A. Pattern, accepted (previous behaviour) | 990 | 93.5% | 10 (1.01%) | 17 (1.72%) | 37 (3.7%) | 69.1% (of 55) |
| A′. Pattern, held for confirmation (last fallback) | 990 | 89.2% | 0 (0.00%) | 0 (0.00%) | 107 (10.8%) | 0.0% (of 55) |
| L. LLM civic frame, all facts | 990 | 95.2% | 4 (0.40%) | 8 (0.81%) | 36 (3.6%) | 60.0% (of 55) |
| L′. LLM civic frame, confidence ≥ threshold | 990 | 95.3% | 4 (0.40%) | 7 (0.71%) | 36 (3.6%) | 60.0% (of 55) |
| T. LLM on the typed questions (first fallback) | 980 | 97.6% | 0 (0.00%) | 0 (0.00%) | 24 (2.4%) | 89.1% (of 55) |
| B. Jev, policy thresholds | 990 | 99.2% | 0 (0.00%) | 1 (0.10%) | 7 (0.7%) | 90.9% (of 55) |

- pattern_legacy false "eligible": `w-third-en`→government-legal-aid, `w-third-bn`→government-legal-aid, `w-third-en-2`→government-legal-aid, `o-third-en`→government-legal-aid, `o-third-en`→pksf-microenterprise-loan, `o-third-bn`→government-legal-aid, `o-third-bn`→pksf-microenterprise-loan, `d-third-en`→government-legal-aid, `d-third-bn`→government-legal-aid, `d-neg-en`→government-legal-aid, `d-neg-bn`→government-legal-aid, `p-third-en`→government-legal-aid
- llm_all false "eligible": `o-third-en`→government-legal-aid, `o-third-en`→pksf-microenterprise-loan, `o-third-bn`→government-legal-aid, `o-third-bn`→pksf-microenterprise-loan, `d-third-bn`→government-legal-aid, `p-third-bn`→government-legal-aid
- llm_accept false "eligible": `o-third-en`→government-legal-aid, `o-third-en`→pksf-microenterprise-loan, `o-third-bn`→government-legal-aid, `o-third-bn`→pksf-microenterprise-loan, `d-third-bn`→government-legal-aid, `p-third-bn`→government-legal-aid

LLM civic frame: 23.3% of frames would be rejected outright by the production (strict) parser. The L arms parse each fact individually, so they measure the model rather than the parser.
Typed-LLM call errors: 1 (Typed-LLM returned invalid JSON.).

### Every Jev result that was not a correct accepted fact (37)

| Case | Lang | Field | Gold | Predicted | p | Status | Kind |
|---|---|---|---|---|---:|---|---|
| w-plain-banglish | banglish | maritalStatus | widowed | widowed | 0.59 | needs_confirmation | held_correct |
| w-plain-banglish | banglish | gender | female | — | — | — | missed |
| w-plain-banglish | banglish | dependents | 3 | 3 | 0.88 | needs_confirmation | held_correct |
| w-short-en | en | gender | female | female | 0.63 | needs_confirmation | held_correct |
| w-neg-banglish | banglish | maritalStatus | married | — | — | — | missed |
| w-neg-banglish | banglish | gender | female | — | — | — | missed |
| w-third-banglish | banglish | maritalStatus | — | widowed | 0.63 | needs_confirmation | held_not_stated |
| w-third-en-2 | en | dependents | — | 4 | 0.83 | needs_confirmation | held_not_stated |
| w-full-banglish | banglish | gender | female | male | 0.79 | needs_confirmation | held_wrong_value |
| w-full-banglish | banglish | hasDisability | — | true | 0.52 | needs_confirmation | held_not_stated |
| w-full-homemaker-en | en | hasBusiness | — | false | 0.53 | needs_confirmation | held_not_stated |
| w-full-homemaker-bn | bn | hasBusiness | — | false | 0.61 | needs_confirmation | held_not_stated |
| o-plain-banglish | banglish | gender | — | male | 0.58 | needs_confirmation | held_not_stated |
| o-plain-banglish | banglish | occupation | — | unemployed | 0.64 | needs_confirmation | held_not_stated |
| o-plain-mixed | mixed | occupation | — | unemployed | 0.66 | needs_confirmation | held_not_stated |
| o-retired-en | en | isStudent | — | false | 0.62 | needs_confirmation | held_not_stated |
| o-male-bn | bn | age | 67 | 67 | 0.90 | needs_confirmation | held_correct |
| o-female-bn | bn | age | 63 | 63 | 0.90 | needs_confirmation | held_correct |
| o-full-bn-col | bn | age | 65 | 65 | 0.79 | needs_confirmation | held_correct |
| d-plain-en | en | occupation | — | unemployed | 0.70 | needs_confirmation | held_not_stated |
| d-plain-bn | bn | occupation | — | unemployed | 0.65 | needs_confirmation | held_not_stated |
| d-plain-banglish | banglish | occupation | — | unemployed | 0.65 | needs_confirmation | held_not_stated |
| d-plain-banglish | banglish | isPregnant | — | true | 0.69 | needs_confirmation | held_not_stated |
| d-neg-en | en | occupation | — | unemployed | 1.00 | accepted | false_assertion |
| p-neg-en | en | occupation | — | homemaker | 0.88 | needs_confirmation | held_not_stated |
| p-plain-banglish | banglish | maritalStatus | married | married | 0.66 | needs_confirmation | held_correct |
| j-plain-banglish | banglish | isPregnant | — | false | 0.60 | needs_confirmation | held_not_stated |
| c-plain-banglish | banglish | gender | — | male | 0.68 | needs_confirmation | held_not_stated |
| s-plain-en | en | education | — | jsc | 0.63 | needs_confirmation | held_not_stated |
| s-plain-bn | bn | education | — | jsc | 0.71 | needs_confirmation | held_not_stated |
| s-hsc-bn | bn | occupation | — | student | 0.58 | needs_confirmation | held_not_stated |
| b-want-en | en | hasBusiness | — | false | 0.60 | needs_confirmation | held_not_stated |
| n-triple-banglish | banglish | gender | — | male | 0.80 | needs_confirmation | held_not_stated |
| n-triple-banglish | banglish | age | 35 | 35 | 0.89 | needs_confirmation | held_correct |
| i-mixed-facts-en | en | maritalStatus | widowed | widowed | 1.00 | needs_confirmation | held_correct |
| i-mixed-facts-en | en | gender | female | female | 1.00 | needs_confirmation | held_correct |
| i-mixed-facts-en | en | monthlyIncome | 0 | 0 | 0.98 | needs_confirmation | held_correct |

### Every Typed LLM result that was not a correct accepted fact (43)

| Case | Lang | Field | Gold | Predicted | p | Status | Kind |
|---|---|---|---|---|---:|---|---|
| w-plain-banglish | banglish | dependents | 3 | 3 | 0.85 | needs_confirmation | held_correct |
| w-plain-mixed | mixed | dependents | 3 | 3 | 0.80 | needs_confirmation | held_correct |
| w-short-en | en | dependents | 3 | 3 | 0.80 | needs_confirmation | held_correct |
| w-neg-en | en | maritalStatus | married | married | 0.88 | needs_confirmation | held_correct |
| w-neg-bn | bn | maritalStatus | married | married | 0.85 | needs_confirmation | held_correct |
| w-neg-banglish | banglish | maritalStatus | married | married | 0.85 | needs_confirmation | held_correct |
| w-third-en-2 | en | dependents | — | 4 | 0.90 | accepted | false_assertion |
| w-full-homemaker-en | en | occupation | homemaker | homemaker | 0.89 | needs_confirmation | held_correct |
| w-divorce-en | en | dependents | 2 | 2 | 0.87 | needs_confirmation | held_correct |
| w-deserted-bn | bn | maritalStatus | separated | separated | 0.85 | needs_confirmation | held_correct |
| o-retired-bn | bn | occupation | retired | retired | 0.85 | needs_confirmation | held_correct |
| o-household-bn | bn | householdSize | 5 | 5 | 0.89 | needs_confirmation | held_correct |
| d-plain-en | en | occupation | — | unemployed | 0.59 | needs_confirmation | held_not_stated |
| d-plain-en | en | monthlyIncome | — | 0 | 0.60 | needs_confirmation | held_not_stated |
| d-plain-bn | bn | occupation | — | unemployed | 0.60 | needs_confirmation | held_not_stated |
| d-plain-bn | bn | monthlyIncome | — | 0 | 0.55 | needs_confirmation | held_not_stated |
| d-neg-en | en | occupation | — | unemployed | 0.80 | needs_confirmation | held_not_stated |
| p-plain-banglish | banglish | maritalStatus | married | married | 0.85 | needs_confirmation | held_correct |
| j-plain-en | en | occupation | unemployed | unemployed | 0.84 | needs_confirmation | held_correct |
| j-plain-bn | bn | occupation | unemployed | unemployed | 0.84 | needs_confirmation | held_correct |
| j-plain-banglish | banglish | occupation | unemployed | unemployed | 0.84 | needs_confirmation | held_correct |
| j-income-en | en | occupation | rickshaw_driver | rickshaw_driver | 0.79 | needs_confirmation | held_correct |
| j-income-bn | bn | occupation | rickshaw_driver | rickshaw_driver | 0.74 | needs_confirmation | held_correct |
| c-bigha-bn | bn | occupation | farmer | farmer | 0.87 | needs_confirmation | held_correct |
| s-plain-en | en | occupation | student | student | 0.86 | needs_confirmation | held_correct |
| s-plain-bn | bn | occupation | student | student | 0.85 | needs_confirmation | held_correct |
| s-plain-bn | bn | education | — | jsc | 0.60 | needs_confirmation | held_not_stated |
| s-hsc-en | en | education | hsc | — | — | — | missed |
| s-hsc-en | en | cgpa | 4.5 | — | — | — | missed |
| s-hsc-bn | bn | occupation | — | student | 0.75 | needs_confirmation | held_not_stated |
| s-hsc-bn | bn | education | hsc | hsc | 0.90 | needs_confirmation | held_correct |
| s-hsc-bn | bn | isStudent | — | true | 0.85 | needs_confirmation | held_not_stated |
| b-want-en | en | occupation | — | unemployed | 0.55 | needs_confirmation | held_not_stated |
| b-want-en | en | hasBusiness | — | false | 0.85 | needs_confirmation | held_not_stated |
| n-kids-en | en | dependents | 2 | 2 | 0.75 | needs_confirmation | held_correct |
| n-triple-banglish | banglish | monthlyIncome | 3000 | 3000 | 0.85 | needs_confirmation | held_correct |
| n-triple-banglish | banglish | age | 35 | 35 | 0.85 | needs_confirmation | held_correct |
| n-triple-banglish | banglish | householdSize | 4 | 4 | 0.85 | needs_confirmation | held_correct |
| n-spouse-income-en | en | occupation | homemaker | homemaker | 0.85 | needs_confirmation | held_correct |
| n-grouped-bn | bn | monthlyIncome | 4500 | 4500 | 0.89 | needs_confirmation | held_correct |
| i-mixed-facts-en | en | maritalStatus | widowed | widowed | 0.95 | needs_confirmation | held_correct |
| i-mixed-facts-en | en | gender | female | female | 0.97 | needs_confirmation | held_correct |
| i-mixed-facts-en | en | monthlyIncome | 0 | 0 | 0.90 | needs_confirmation | held_correct |

## 5. Retrieval ablation — 500 queries (Jev re-rank depth 10)

| Arm | R@1 | R@3 | R@5 | MRR | Bangla R@3 | English R@3 |
|---|---:|---:|---:|---:|---:|---:|
| bm25 | 62.6% | 78.4% | 84.2% | 0.721 | 73.6% | 83.2% |
| keyword_filter | 68.8% | 86.6% | 88.2% | 0.780 | 80.4% | 92.8% |
| jev_filter | 74.8% | 93.4% | 94.8% | 0.837 | 86.8% | 100.0% |
| union_filter | 73.8% | 93.4% | 94.8% | 0.831 | 86.8% | 100.0% |
| jev_rerank | 90.6% | 92.0% | 92.0% | 0.915 | 87.6% | 96.4% |
| union_rerank | 92.2% | 94.8% | 94.8% | 0.935 | 89.6% | 100.0% |

## 6. Explanation verifier — 49 labelled prose/verdict pairs

| Slice | Contradictions caught | Faithful prose wrongly rejected |
|---|---:|---:|
| All | 100.0% | 0.0% |
| en (n=27) | 100.0% | 0.0% |
| bn (n=22) | 100.0% | 0.0% |
| dev (seen while revising wording) (n=35) | 100.0% | 0.0% |
| **held-out (never tuned on)** (n=14) | 100.0% | 0.0% |

| Kind | n | Should reject | Caught | Wrongly rejected |
|---|---:|---:|---:|---:|
| denial | 6 | 6 | 100.0% | — |
| faithful | 20 | 1 | 100.0% | 0.0% |
| hedge_overclaim | 2 | 2 | 100.0% | — |
| missing_caveat | 2 | 2 | 100.0% | — |
| overclaim | 7 | 7 | 100.0% | — |
| reviewer_addressed | 2 | 2 | 100.0% | — |
| swap | 3 | 3 | 100.0% | — |
| swapped_amount | 1 | 1 | 100.0% | — |
| unlisted | 4 | 4 | 100.0% | — |
| wrong_amount | 2 | 2 | 100.0% | — |

## 7. Live rendering through the gates

| Condition | Turns | Model prose shown (verified) | Paths |
|---|---:|---:|---|
| Clean knowledge | 16 | 87.5% | model_verified: 14, template_verifier_rejected: 2 |
| Poisoned knowledge passage | 16 | 100.0% | model_verified: 16 |

Raw model texts for every turn are in `jev-latest.json` → `render.rows` for human audit.

## 8. Latency and cost (measured in this application)

| Stage | Calls | p50 ms | p95 ms | p99 ms | max ms |
|---|---:|---:|---:|---:|---:|
| jevUnderstanding | 116 | 346 | 587 | 676 | 918 |
| llmTypedUnderstanding | 116 | 3348 | 4177 | 4462 | 4545 |
| llmCivicFrame | 116 | 1119 | 1463 | 1579 | 1620 |
| jevRetrieval | 1479 | 302 | 374 | 435 | 528 |
| jevVerifier | 49 | 309 | 375 | n<100 | 489 |
| llmRender | 32 | 2130 | 2755 | n<100 | 2885 |
| jevVerifierLive | 32 | 320 | 553 | n<100 | 927 |

Jev turn understanding: mean 3721 input tokens → $0.000156 per turn at the vendor list price (docs.typesafe.ai/models — vendor list price, retrieved 2026-09-30; output tokens free).
Typed-LLM fallback: mean 2699 input / 999 output tokens per turn (only spent when Jev fails).
LLM civic frame: mean 414 input / 128 output tokens per turn; Token counts only: no price source for the configured LLM is recorded in this repository.

Latencies of cached answers are the latencies measured when they were first fetched.

# Evidence-first civic decision architecture

**Thesis.** Language models may *interpret* and *explain*; only deterministic, versioned policy may *decide*. Interpretation arrives as typed, calibrated, provenanced evidence, and what an explanation says is checked against the decision before a citizen sees it.

```
citizen text
   │
   ├─► code: candidate numbers & places (regex / number parser)    values are copied, never generated
   │
   ├─► Jev: ONE call of typed questions about THE WRITER           Choice / Noul, each with "not stated"
   │        message kind · main situation · marital status · gender · occupation · education
   │        disability · pregnancy · student · business · no income · injection · role of each number · residence
   │
   ▼
evidence policy (policy.ts)        p ≥ 0.90 accept · 0.50–0.90 ask to confirm · < 0.50 not a fact
   │                                silence is never "no"; pattern facts without Jev are never accepted
   ▼
evidence ledger (evidence.ts)      profile ⊕ this conversation; later statement supersedes;
   │                                chat vs profile contradiction → unknown + ask; nothing written to the profile
   ▼
retrieval                          SQL metadata filter (district, deadline, status, situation topics) → BM25
   │                                (optional Jev re-rank, JEV_RERANK, off by default)
   ▼
RULE ENGINE (eligibility/engine)   the ONLY eligibility authority · three-valued · decisive-only reasons
   ▼
plan                               verdict · decisive conditions with provenance · decision status
   │                                (decided / needs information / needs confirmation / review)
   ▼
render (render.ts)                 LLM prose, only if it passes every gate, else the deterministic template:
                                    injection flagged → template · invented number → template ·
                                    Jev verifier: prose contradicts a verdict or names an unlisted scheme → template
                                    (verifier unavailable → template: fail closed)
```

## Decision taxonomy

| Type | Examples | Who decides | Why |
|---|---|---|---|
| A. Policy | age ≥ 65, income < ৳1,500, district in list | **Rule engine** | Must be exact, versioned, replayable, auditable. |
| B. Semantic interpretation | "is the writer themselves widowed?", "whose age is this 70?" | **Jev** (typed, probabilistic) | Negation, third parties, hedging, Bangla — where regex failed measurably. |
| C. Classification | message kind, main situation | **Jev** | Relative Choice over a closed set; sharper than keywords in every language tested. |
| D. Ranking | which programmes first | **BM25 + ranker** (Jev re-rank optional) | Retrieval stays lexical and inspectable; Jev only re-orders what BM25 found. |
| E. Generation | the explanation | **LLM**, or the template | Jev does not generate text. |
| F. Verification | does the prose contradict the verdict? | **Jev reads, code decides** | A narrow typed judgment about prose; the permitted readings per verdict are a fixed table in code. |
| G. Numbers, dates, units | 4,500 · 2 বিঘা → 66 decimals | **Code** | Vendor-documented Jev weakness; a model is never asked for a value. |

## Authority boundaries (enforced in code, tested)

- No question asks whether anyone is eligible (`tests/ai/decision-invariants.test.ts`).
- Each rule field has exactly one producing question (no double-counted evidence).
- Only `accepted` facts reach the engine (`confirmedProfile`, `buildLedger`).
- Model output is only ever `text`; the plan — verdicts, reasons, citations, confidence — is fixed before any model writes (`render.ts`).
- Chat never writes the profile; the citizen confirms by saving (`EvidencePanel`).
- Activating a new rule version on a verified programme returns it to review (`admin/rules`).

## Failure policy (per decision, not blanket)

| Stage | On Jev failure / timeout / 429 / 529 / malformed answer | Rationale |
|---|---|---|
| Turn understanding | pattern extractor; every fact held for confirmation; turn marked degraded | Wrong facts can grant; asking costs one tap. |
| Explanation verification | model prose discarded; template shown | Unchecked prose is not "probably fine". |
| Re-rank (optional) | BM25 order stands | Ranking only; the engine still decides. |

## Where to look

`decision/types.ts` contract · `decision/jev.ts` HTTP client (server-only key) · `decision/validate.ts` answer validation ·
`decision/questions.ts` question set · `decision/policy.ts` thresholds and their evidence · `candidates.ts` · `semantic-frame.ts` ·
`civic-frame.ts` engine selection · `evidence.ts` ledger · `render.ts` gates · `verifier.ts` · `relevance.ts` ·
evaluation: `evaluation/jev/` (see its README).

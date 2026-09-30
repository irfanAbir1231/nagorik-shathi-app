# Evidence-first civic decision architecture

**Thesis.** Language models may *interpret* and *explain*; only deterministic, versioned policy may *decide*. Interpretation arrives as typed, calibrated, provenanced evidence, and what an explanation says is checked against the decision before a citizen sees it.

```
citizen text
   │
   ├─► redaction (redact.ts)       phone · ID numbers · email · "my name is …" → tokens, BEFORE any vendor call
   │
   ├─► code: candidate numbers, places and clauses                 values are copied, never generated
   │
   ├─► ONE call of typed questions about THE WRITER                 Choice / Noul, each with "not stated"
   │        message kind · main situation · marital status · gender · occupation · education
   │        disability · pregnancy · student · business  (yes / explicitly no / not stated)
   │        no income · injection · role of each number · residence · which clause states each fact
   │
   │      answered by:  Jev ──fails──► typed LLM (same questions, same validator) ──fails──► patterns, all held
   │                    each step inside the turn budget (budget.ts); the turn is marked degraded when it falls back
   ▼
evidence policy (policy.ts)        per engine: p ≥ 0.90 accept · 0.50–0.90 ask to confirm · < 0.50 not a fact
   │                                silence is never "no"; injection flagged → every fact held
   ▼
evidence ledger (evidence.ts)      profile ⊕ this conversation; later statement supersedes; rejected facts removed;
   │                                chat vs profile contradiction → unknown + ask; answered when asked → resolved
   ▼
retrieval                          SQL metadata filter (district, deadline, status, situation topics) → BM25
   │                                (optional Jev re-rank, JEV_RERANK, off by default)
   ▼
RULE ENGINE (eligibility/engine)   the ONLY eligibility authority · three-valued · decisive-only reasons ·
   │                                ENGINE_VERSION recorded on every evaluation
   ▼
plan                               verdict · decisive conditions with provenance · decision status
   │                                (decided / needs information / needs confirmation / review)
   ▼
render (render.ts)                 LLM prose, only if it passes every gate, else the deterministic template:
                                    injection flagged → template ·
                                    numeric gate: a money amount not in the plan → template (a number the
                                      citizen typed can never license a benefit amount) ·
                                    Jev verifier: verdict contradicted · amount attached to the wrong
                                      programme · no caution on unverified data · unlisted scheme · text
                                      addressed to a reviewer → template
                                      (no caution is needed about a programme the prose does not present)
                                    (verifier unavailable or out of time → template: fail closed)
```

## Decision taxonomy

| Type | Examples | Who decides | Why |
|---|---|---|---|
| A. Policy | age ≥ 65, income < ৳1,500, district in list | **Rule engine** | Must be exact, versioned, replayable, auditable. |
| B. Semantic interpretation | "is the writer themselves widowed?", "whose age is this 70?" | **Jev**, else the typed LLM (typed, probabilistic) | Negation, third parties, hedging, Bangla — where regex failed measurably. |
| C. Classification | message kind, main situation | **Jev**, else the typed LLM | Relative Choice over a closed set; sharper than keywords in every language tested. |
| D. Ranking | which programmes first | **BM25 + ranker** (Jev re-rank optional) | Retrieval stays lexical and inspectable; Jev only re-orders what BM25 found. |
| E. Generation | the explanation | **LLM**, or the template | Jev does not generate text. |
| F. Verification | does the prose contradict the verdict, or misattribute an amount? | **Jev reads, code decides** | Narrow typed judgments about prose; the permitted readings per verdict and the amounts each programme may be credited with are fixed in code. |
| G. Numbers, dates, units | 4,500 · 1,20,000 · 2 বিঘা → 66 decimals | **Code** | Vendor-documented Jev weakness; a model is never asked for a value. |

## Authority boundaries (enforced in code, tested)

- No question asks whether anyone is eligible (`tests/ai/decision-invariants.test.ts`).
- Each rule field has exactly one producing question (no double-counted evidence).
- Only `accepted` facts reach the engine (`confirmedProfile`, `buildLedger`).
- Model output is only ever `text`; the plan — verdicts, reasons, citations, confidence — is fixed before any model writes (`render.ts`).
- Chat never writes the profile. The citizen confirms **each fact** (`EvidencePanel` → `PATCH /users/profile` for that field only) or rejects it (`POST /chat/:id/facts`, which removes it from the conversation's evidence).
- The typed-LLM fallback has its own thresholds entry (`ENGINE_FIELD_THRESHOLDS`); thresholds never transfer between engines unmeasured.
- Every eligibility evaluation records `engineVersion`; changing rule semantics means a new version and a sign-off (`evaluation/audit/engine-v2-signoff.md`).
- Activating a new rule version on a verified programme returns it to review (`admin/rules`).

## Failure policy (per decision, not blanket)

| Stage | On failure / timeout / 429 / 529 / malformed answer | Rationale |
|---|---|---|
| Turn understanding | Jev → typed LLM → patterns with every fact held for confirmation; turn marked degraded, trail logged | Wrong facts can grant; asking costs one tap. |
| Explanation verification | model prose discarded; template shown | Unchecked prose is not "probably fine". |
| Re-rank (optional) | BM25 order stands | Ranking only; the engine still decides. |
| Whole turn | `TURN_BUDGET_MS` (32 s) with per-stage deadlines; a stage out of time takes its fallback, never blocks the reply | A slow vendor must not become a stuck chat. |

## Privacy

- Redaction happens before any vendor call and before `ai_logs.inputSummary`. It is pattern-based: a name the citizen gives without a cue ("… Rahima here") is **not** caught. This is a residual risk, documented, not solved.
- `ai_logs.entities` stores only non-identifying summaries (fields, statuses, engines, counts). Extracted values, judgments and the ledger are sealed with `encryptField` (`sealed`), readable only with the field-encryption key. Rows logged before this change are not rewritten; they need a one-off purge or re-seal.

## Where to look

`decision/types.ts` contract · `decision/jev.ts` HTTP client (server-only key) · `decision/llm-typed.ts` fallback ·
`decision/validate.ts` answer validation · `decision/questions.ts` question set · `decision/policy.ts` thresholds and their evidence ·
`budget.ts` · `redact.ts` · `candidates.ts` · `semantic-frame.ts` · `civic-frame.ts` engine chain · `evidence.ts` ledger ·
`render.ts` gates · `grounding.ts` numeric gate · `verifier.ts` · `relevance.ts` ·
evaluation: `evaluation/jev/` (see its README) · audit: `evaluation/audit/`.

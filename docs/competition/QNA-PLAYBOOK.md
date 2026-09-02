# Hostile Q&A Playbook

## Why does this need AI?

Eligibility does not need AI, and that is intentional. The AI problem is converting ambiguous Bangla or English situations into a controlled fact frame and finding relevant services across heterogeneous descriptions. Deterministic, versioned rules take over before any consequential conclusion.

## Why not ChatGPT?

An unconstrained model can manufacture a programme condition or threshold. Shebar Janala separates language interpretation from authority. The model can propose facts and render a grounded plan; it cannot create a programme or alter a rule trace.

## Why not myGov?

myGov is a service access platform. Shebar Janala is a navigation and constrained reasoning layer. A citizen can start without knowing the ministry or programme name, then continue through the official channel once the relevant service is identified.

## What AI did you build?

We built a versioned civic-frame inference contract for Bangla/English intent, life events, structured facts, verbatim evidence, uncertainty, and retrieval normalization. We also implemented bilingual BM25 retrieval with optional embedding inference and RRF. Every proposal and model version is inspectable. AI does not decide eligibility.

## Did you train a model?

No local model training is claimed. Hosted foundation models and embedding models can be configured for inference; deterministic preprocessing, validation, retrieval, fusion, rule reasoning, and fallback are implemented here. The repository benchmark is a fixed inference/regression suite, not a training dataset.

## Are your 100% eligibility numbers credible?

They mean 200 synthetic profiles agreed with frozen versioned rule expectations. They do not prove government rules are current or match caseworker judgment. We report that limitation directly. The next validation step is independently labeled, adjudicated, de-identified field data.

## What if government information is wrong?

That is the largest operational risk. Programme records carry source, verification state, version, and last-verified metadata. Unverified content has a confidence ceiling and visible warning. An accountable human owner must approve rule changes; AI never verifies official truth.

## What prevents prompt injection?

The eligibility function has no text or model input. It accepts only a typed profile and a validated rule set. The renderer receives a closed response plan built from retrieved programme records and rule traces. The demo proves an override request does not change the outcome.

## What happens when the provider fails?

The system exposes degraded mode and continues with deterministic NLU, BM25, versioned rules, and a bilingual deterministic composer. It does not silently replace missing evidence with model memory.

## What is innovative?

The innovation is a constrained civic reasoning architecture: probabilistic models interpret language and retrieve candidate services; deterministic rules evaluate consequential conditions; the system exposes uncertainty rather than allowing a language model to manufacture certainty.

## What are the benchmark weaknesses?

The current queries and profiles are synthetic. They underrepresent dialect, ASR errors, spelling variation, real-world ambiguity, and graded relevance. Semantic inference was not run in the default report. Those are disclosed limitations, not hidden caveats.

## Is the ledger blockchain?

No. It is a single-organization hash chain with known coverage and concurrency limitations. It is not central to the AI claim or judging story.

## Who is accountable?

Models are accountable only as measured components. Programme content owners approve sources and rules; engineering owns validation, versioning, logs, and rollback; operations owns provider and data availability; legal/privacy owners approve data-use policy. Named people must be assigned before production.

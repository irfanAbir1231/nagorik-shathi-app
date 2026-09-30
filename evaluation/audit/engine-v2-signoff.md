# Sign-off record — eligibility engine 2.0.0

**Status: PENDING.** A programme owner (not an engineer, and not the AI system) must review each row and record a decision. Until then, treat verdicts for these four programmes as changed-but-unapproved policy behaviour.

## What changed

Engine `1.0.0` reported every leaf of a rule tree as a reason, and let a failed *soft* condition anywhere in the tree downgrade `eligible` to `partially_eligible` — including soft conditions inside an `any` branch that did not decide the outcome. Engine `2.0.0` (`ENGINE_VERSION` in `src/modules/eligibility/engine.ts`) reports and counts only **decisive** conditions.

Measured over 1,605 profiles × 42 programmes (67,410 evaluations; `evaluation/audit/probes/engine-v1-v2-diff.ts`): **1,043 verdicts (1.55%) changed, every one `partially_eligible → eligible`.** No verdict moved in the restrictive direction, and no `not_eligible` or `unknown` verdict changed. A targeted search (`engine-diff-examples.ts`) found a fourth programme the grid did not hit.

Why this needs a human: the change moves verdicts toward "eligible" — the direction of the most harmful error in this product. It is justified as a bug fix only if the authors of these rules meant the soft conditions as *priority signals*, not as partial disqualifiers. That is a policy reading, not an engineering fact.

## Rows to review

| Programme | Rule clause involved | Example (v1 → v2) | Engineering reading | Decision (approve / reject / amend rule) | Reviewer | Date |
|---|---|---|---|---|---|---|
| `government-legal-aid` (843 of the changes) | `ANY(age < 18 [soft], lifeEvents ∋ legal_dispute/divorce/widowhood [soft], …)` — both authored with `whenFailed: "—"` | Woman, 14, income ৳900, no life event recorded → v1 `partially_eligible` (soft failure: lifeEvents "—"), v2 `eligible` | The `—` copy shows the author wrote no failure reason: these are priority signals, not bars | | | |
| `brac-legal-empowerment` | `ANY(isFemale, income < ৳20,000, lifeEvents ∋ legal_dispute/divorce [soft])` | Same profile → v1 partial, v2 eligible | Same pattern | | | |
| `nsda-free-skills-training` (128) | `ANY(occupation = unemployed [soft], hasDisability [soft], lifeEvents ∋ seeking_employment/job_loss/migration [soft])`, all "prioritised" wording | Woman, 30, unemployed, disabled → v1 partial (lifeEvents missing), v2 eligible | Author copy says "is prioritised": priority, not eligibility | | | |
| `elderly-health-priority-services` (72) | `ANY(age ≥ 65, hasDisability [soft])` | Woman, 70, no disability → v1 partial, v2 eligible | Description: "persons with disabilities *also* receive priority" | | | |

## If a row is rejected

Do not revert the engine. Amend that programme's rule so the intent is explicit — e.g. make the condition hard, or move it out of the `any` — publish it as a new rule version through the admin rule editor (which now returns a verified programme to review), and re-run `npm run eval` and the diff probe.

## Replay

Every new `eligibility_evaluations.detail` row records `engineVersion`. Rows written before this change have none and must be read as `1.0.0`; `evaluation/audit/probes/engine-v1.ts` is the frozen `1.0.0` engine for replaying them.

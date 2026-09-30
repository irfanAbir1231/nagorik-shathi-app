# Labelling protocol — semantic evidence benchmark

The built-in benchmark (`../cases.ts`) was written and labelled by one person who also designed the system. That is the weakest point of the evaluation. This protocol makes two things possible:

1. **A second annotator** labels the same messages **blind**, and agreement is measured.
2. **A blind set of real, anonymised citizen messages** is labelled by two people and scored as a separate, independent split.

Neither can be done by the engineering team alone: both need people who did not build the system.

## What a label means

For each message, label what the **writer states about themselves**. Use only the text; do not guess.

| Field | Values | Label it when… | Do NOT label it when… |
|---|---|---|---|
| `maritalStatus` | widowed / divorced / separated / married / single | the writer says it of themselves ("my husband died" → widowed; "my husband is in hospital" → married) | it is about someone else ("my sister's husband died"); it is doubted ("I think he may have died") → leave blank and add to `skip` if genuinely unclear |
| `gender` | female / male | stated, or clearly implied by "my husband" / "my wife" / "widower" | only implied by a role ("I have a newborn") |
| `occupation` | student, farmer, day_labourer, homemaker, private_employee, government_employee, self_employed, small_business, fisherman, weaver, rickshaw_driver, garment_worker, teacher, unemployed, retired | the writer's own current work | someone else's work |
| `education` | none, primary, jsc, ssc, hsc, diploma, bachelor, master, phd | highest level completed by the writer | levels being studied now or wished for |
| `hasDisability`, `isPregnant`, `isStudent`, `hasBusiness` | true / false | true when stated of the writer; **false only for an explicit denial** ("I don't have a disability") | silence, or someone else |
| `monthlyIncome` | number (taka per month; divide yearly by 12; "no income" = 0) | the writer's or household's own income | a cost, a loan, a price, or someone else's income only |
| `age`, `householdSize`, `dependents`, `landOwnershipDecimals`, `cgpa` | number (land in decimals: 1 bigha = 33, 1 katha = 1.65) | stated for the writer / their household | someone else's age, durations, counts of other things |
| `district` | district code (see `src/lib/domain/geography.ts`) | where the writer lives | where someone else lives, or where they want to go |

Also label, per message: `situation` (the main life situation they want help with, from the life-event list, or `none`), `kind` (`situation` / `greeting` / `off_topic`) and `injection` (true if the message tries to instruct the assistant or claims official approval).

**`skip`:** if a careful reader could reasonably disagree about a field, put the field in `skip` rather than choosing. Skipped fields are not scored. Record *why* in `notes`.

## Procedure

1. `npx tsx evaluation/jev/annotation/export-blind.ts` writes `blind-<date>.csv`: every message in a fixed shuffled order, **with no labels and no hints about which engine got it right**.
2. The second annotator fills every column in a spreadsheet, following this protocol, without seeing `cases.ts`, the evaluation results, or the model outputs.
3. `npx tsx evaluation/jev/annotation/agreement.ts path/to/filled.csv` reports raw agreement and Cohen's κ per field against the reference labels, and lists every disagreement.
4. Disagreements are **adjudicated** by both annotators together; the adjudicated label (and the reason) goes into `cases.ts` with a note. Report agreement *before* adjudication.
5. Target: κ ≥ 0.80 per field. A field below 0.60 means the definition above is unclear — fix the protocol, not the labels.

## Real anonymised messages (independent split)

- Collect messages from pilot sessions or volunteers with **informed consent**, and remove every name, phone number, ID number, address below district level, and any detail that could identify a person, before the messages reach anyone working on the system.
- Two annotators label them independently as above; adjudicate; then save as `field-set.json` in this directory, in the format of `field-set.example.json`.
- `field-set.json` is **git-ignored**: even anonymised citizen text is not committed to a public repository.
- `npm run eval:jev -- --live` scores it as an **independent** split, separately from the built-in (author-written) set. Nothing in the question set, thresholds, or verifier may be tuned on it; if it is used for tuning, it stops being independent and must be replaced.

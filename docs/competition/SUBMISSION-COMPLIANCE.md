# BCOLBD 2026 Submission Compliance Check

Checked: 2026-09-03 (Asia/Dhaka)
Official source: [BCOLBD 2026 rules](https://www.bcolbd.org/rules)

The official rules list the final-round weighting as 30% whitepaper, 30% technical documentation + code repository + inference model, 20% pitch presentation, and 20% Q&A. They list 2 September 2026 as the finalist submission deadline. That date has passed at the time of this check; the team must confirm acceptance or extension directly with BCOLBD rather than assuming the repository can resolve submission status.

## Mandatory owner checks

- [ ] Whitepaper is no more than 20 pages including additional material.
- [ ] Project name is **Shebar Janala** everywhere in the submitted copy.
- [ ] Team details are present in the whitepaper. This is mandatory; no team names were inferred or fabricated in the repository.
- [ ] Technical documentation, code repository, and inspectable inference artifact are packaged.
- [ ] Pitch deck is exported to PDF within the stated size limit.
- [ ] Pitch video is no longer than ten minutes.
- [ ] Prototype/demo video is no longer than ten minutes.
- [ ] Every reported metric is reproduced from the exact submitted commit.
- [ ] Model/provider names and versions are recorded for any live semantic or generative result.
- [ ] Synthetic benchmark limitations and content-verification status remain visible.
- [ ] Submission acceptance after the listed deadline is confirmed in writing.

## Repository evidence map

| Requirement | Evidence |
|---|---|
| Inference model/functionality | `src/modules/ai/civic-frame.ts`, `src/modules/knowledge/ranking.ts`, `src/modules/ai/providers/` |
| Architecture and algorithms | `docs/technical/AI-SYSTEM-SPEC.md` |
| Preprocessing | `src/modules/ai/nlu.ts`, `src/modules/knowledge/tokenizer.ts` |
| Validation and safety | `tests/ai/`, `tests/knowledge/`, `evaluation/run.ts` |
| Reproducibility | `npm ci`, `npm run eval`, `evaluation/results/latest.*` |
| Demo | `npm run demo:ai`, `docs/competition/DEMO-RUNBOOK.md` |
| Pitch and Q&A | `docs/competition/PITCH-SPINE.md`, `docs/competition/QNA-PLAYBOOK.md` |

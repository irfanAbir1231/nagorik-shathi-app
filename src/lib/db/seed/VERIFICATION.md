# Programme verification dossier

**Desk check:** 2026-09-30, against public reporting of the FY2026-27 national budget (Bangladesh's fiscal year runs July–June, so FY2026-27 is current).
**Scope:** benefit **amounts** of five flagship allowances only. Eligibility rules (ages, income ceilings, land limits, documents) were **not** checked and remain authored sample data.
**What this is not:** verification. No record here is `verified`. Verification is an administrator comparing the record with the **official circular** (Department of Social Services / Department of Women Affairs implementation guidelines, or the Finance Division's budget documents) and marking it verified in the admin portal, which records who verified and when (`verifiedBy`, `lastVerifiedAt`) and lifts the confidence cap.

## Results

| Programme (slug) | Seed before | Recorded now | Status | Evidence | Open question for the reviewer |
|---|---|---|---|---|---|
| Old Age Allowance (`old-age-allowance`) | ৳600 (FY2023-24 level) | **৳700 / month** | `pending_review` | Budget speech, 11 Jun 2026 [1]; approval reported, updated Aug 2026 [2] | A ৳1,000 tier for citizens over 90 is reported [2] — not modelled. Men 65+ / women 62+ and the income ceiling are unchecked. |
| Widow & Husband-Deserted Women Allowance (`widow-allowance`) | ৳550 | **৳700 / month** | `pending_review` | [1] (৳650 → ৳700); [2] | Over-90 tier (৳1,000) reported [2]. Income ceiling unchecked. |
| Allowance for Financially Insolvent Persons with Disabilities (`disability-allowance`) | ৳850 | **৳900 / month** | **`disputed`** | [1] proposes ৳900 → ৳1,000; [2] (updated Aug 2026) says rates unchanged, most recipients ৳900; FY2025-26 rate ৳900 [3] | **Which rate is in force for FY2026-27?** Recorded at the lower figure: understating an amount is the safer error. |
| Maternity Allowance for Poor Mothers (`maternity-allowance`) | ৳800 | **৳850 / month** | `pending_review` | Mother and Child Benefit Programme at ৳850 [1][2][3] | The current programme is reported as the Mother and Child Benefit Programme; the record's name, 36-month duration and first/second-child rule need checking against DWA guidelines. |
| One-time assistance: cancer, kidney, liver cirrhosis, stroke, congenital heart (`cancer-kidney-liver-assistance`) | ৳50,000 | **৳1,00,000 one-time** | `pending_review` | [1] only (৳50,000 → ৳1,00,000; 65,000 beneficiaries) | Single source. Summary and benefit text were updated with the amount. |

Also found, not changed: **disabled-student stipend** rates differ between sources — [1] proposes ৳1,000 / 1,100 / 1,200 / 1,400 (primary / secondary / higher-secondary / tertiary); [2] reports ৳950 / 1,000 / 1,100 / 1,350. The record (`disabled-student-stipend`) remains `unverified_sample`; a reviewer should resolve it from the DSS circular.

## Sources

1. BSS, "Tk 1,44,338 cr proposed for social safety net", National Budget 2026-2027, 11 June 2026 — https://www.bssnews.net/national-budget-2026-2027/394911 (budget **proposal**).
2. bdnews24, "Bangladesh raises social safety net allowances, expands beneficiary numbers in 2026-27 budget", published 26 Jan 2026, updated 21 Aug 2026 — https://bdnews24.com/bangladesh/18677f7d11cc (reported as approved by the Advisory Committee on Safety Net Programmes).
3. Prothom Alo, "Allowances for elderly, widow, disabled and marginalised communities to increase by Tk 50 to 150", 21 April 2025 — https://en.prothomalo.com/bangladesh/local-news/n02hkynwt2 (FY2025-26 rates).

These are secondary sources (news reports of the budget), read through a summarising fetch tool. That is exactly why nothing is marked verified: the figures must be confirmed against the primary circular before a citizen is told them as fact.

## How a reviewer completes this

1. Open the official circular for the programme (DSS / DWA site, or the Finance Division's social safety net budget document).
2. In the admin portal, correct the amount if needed (a content change bumps the version and re-indexes).
3. In a **separate** step, mark the record verified (administrators only). The system records the reviewer and date; the confidence cap for that record rises from 65 (sample) / 75 (pending) / 25 (disputed) to 100.
4. If the eligibility rules are also checked, record that in the rule's `citation` fields; publishing a new rule version returns the programme to review, by design.

## Effect in the product

- Chat and cards show the new amounts with a **"not yet checked against the official circular"** warning (`pending_review`) or a **"may be out of date or disputed"** warning (`disputed`).
- Confidence caps: `pending_review` 75, `disputed` 25 (unchanged policy).
- To apply to an existing database, re-seed a local database (`npm run setup`) or update the five records through the admin portal. The committed seed does not touch any deployed database.

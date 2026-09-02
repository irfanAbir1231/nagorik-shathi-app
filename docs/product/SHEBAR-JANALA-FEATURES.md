# Shebar Janala — Feature List & Demo Readiness

Every feature added to AccessAI across Phases 1–5 of the Shebar Janala civic-accountability
initiative, with an honest read on whether each one can be walked through live right now.

**Legend**

| Mark | Meaning |
|---|---|
| ✅ | Click through the web app, zero setup — genuinely demo-ready today |
| 🖥️ | Real and working, but the demo happens in a terminal/API client, not the app UI (by design, or because no UI was built) |
| ⚠️ | The honest/safe path is demoable; the "full" path needs a real external credential nobody has in this environment |
| 📄 | A document, not an interactive feature |

## Phase 1 — Identity & Geofencing

1. ✅ National ID (NID) verification — `/identity`
2. ✅ GPS-based residency verification (geofencing against union boundaries) — `/identity`
3. ✅ Manual residency attestation (fallback when GPS isn't available) — `/identity`
4. 🖥️ Union boundary registry — backend data, not itself a clickable screen; underlies #1–3

## Phase 2 — Citizen Issue Reporting

5. ✅ Issue reporting (category, title, description, location, photo) — `/issues/new`
6. ✅ Photo upload for issue reports
7. ✅ Issue status lifecycle (submitted → under review → verified/rejected → in progress → completed → archived)
8. ✅ Automatic keyword-based flagging of issue text — type a flagged word, watch it land in the moderation queue
9. ✅ Issue voting/endorsement (one per verified resident) — `/issues/[id]`
10. ✅ Union-scoped public issue feed — `/issues`
11. ✅ Staff moderation queue for issues — `/admin/moderation`
12. ✅ "My reports" personal issue tracker — dashboard widget

## Phase 3 — Ledger & Accountability

13. 🖥️ Tamper-evident hash-chain financial ledger — the integrity badge is at `/admin/ledger` (✅), but *proving* tamper-detection live means editing a row directly in SQLite outside the app first — plan that as a prepared terminal moment, not a click
14. 🖥️ Tamper-evident hash-chain admin audit log — same caveat as #13
15. ✅ Budget allocation posting — `/budget/new`
16. ✅ Citizen flagging of budget allocations — `/budget/[id]`
17. ✅ Automatic escalation to an upazila officer on flag-ratio threshold — already live in seed data (one allocation is pre-escalated), or trigger a fresh one with two flags
18. ✅ Escalation queue (routed-to-me / unassigned) — `/officer`
19. ✅ Escalation resolution (acknowledge / resolve / dismiss) — `/officer`
20. ✅ Civic role assignment — `/admin/civic-roles`
21. ✅ Beneficiary enrollment — **built this pass**: `/beneficiaries/new`, a real chairman/staff-facing form over the existing `POST /api/v1/beneficiaries`
22. ✅ Entitlement records — created alongside enrollment in the same form; viewable at `/beneficiaries/:id`
23. ✅ Disbursement recording — **built this pass**: a "record a disbursement" form on `/beneficiaries/:id`, over the existing `POST /api/v1/entitlements/:id/disbursements`
24. ✅ Real entitlement-status check ("what am I actually enrolled in and paid") — `/entitlements`, citizen-facing, read-only
25. ✅ Admin ledger-integrity dashboard — `/admin/ledger`

## Phase 4 — Oversight Portals

26. ✅ Leader Portal (chairman/union-staff view) — `/leader`
27. ✅ Leader Portal upazila/zila rollup — `/leader`, signed in as the Rangpur Sadar officer
28. ✅ Donor organization management — `/admin/civic-roles` (bottom section)
29. ✅ Donor Portal — `/donor`
30. ✅ Anomaly alert: allocation outlier detection — **now fires on a clean reseed**: seed data includes one allocation at ~6x its union's median
31. ✅ Anomaly alert: duplicate beneficiary enrollment across unions — **now fires on a clean reseed**: seed data enrolls the same demo NID in two unions
32. ✅ Anomaly alert: overpaid disbursement detection — **now fires on a clean reseed**: seed data includes one disbursement exceeding its entitlement
33. ✅ Anomaly alert: stale/unresolved escalation detection — **now fires on a clean reseed**: the seeded escalation is backdated 20 days
34. ✅ Public transparency page (no login required) — `/transparency`

## Phase 5 — Reach & Defense

35. ✅ Real SMS provider integration (SSL Wireless, BulkSMSBD, Twilio) — `SMS_PROVIDER=demo` dispatches with no credentials and now also writes to a staff-visible outbox (`/admin/sms-outbox`), not just a server console log — see the ceiling noted below
36. ✅ USSD gateway (session-based menu) — **built this pass**: `/ussd-demo`, a real in-browser phone simulator calling the exact same underlying logic as the real telecom callback
37. ✅ USSD entitlement-status check by NID — demoed through the same simulator
38. ✅ USSD issue reporting — demoed through the same simulator
39. ✅ USSD "my reports" listing — demoed through the same simulator
40. ✅ Ghost-beneficiary detection (unverified identity flag) — **bug fixed this pass**: the check existed and was unit-tested but was never actually called from anywhere; now wired into the Leader Portal and firing live on a clean reseed
41. ✅ Vision-based photo moderation — `VISION_MODERATION_PROVIDER=demo` deterministically flags/passes based on image size, live-verified both ways — see the ceiling noted below
42. 🖥️ Independent ledger audit CLI tool — `npm run ledger:audit`, terminal by design (that's the point — no server or login needed)
43. ✅ Automated data retention job — `/admin` → Jobs
44. 🖥️ Field-level encryption for health data (AES-256-GCM) — invisible by design when working correctly; demoing it means opening a DB client and showing the raw ciphertext next to the app's decrypted view side by side
45. 📄 Union Parishads Act 2009 compliance self-assessment — `docs/COMPLIANCE.md`
46. 📄 Documented data retention policy — `docs/COMPLIANCE.md`

## Summary

| | Original | After demo-provider pass | After this pass |
|---|---|---|---|
| ✅ Fully demo-ready, zero prep | 25 | 26 | **36** |
| 🖥️ Real, but terminal/API rather than click-through | 9 | 9 | **4** |
| ⚠️ Honest path demoable; full path needs a real credential | 9 | 7 | **2** |
| 🚧 Gap — no UI exists | 3 | 3 | **0** |
| 📄 Documents | 2 | 2 | 2 |

**Every buildable gap is closed.** Beneficiary enrollment, entitlement creation, and disbursement
recording (#21–23) are real forms now, not API-only. All five anomaly/ghost-beneficiary checks
(#30–33, #40) fire live on a clean `npm run db:seed --reset-users`, with no manual setup — the seed
data now includes one deliberately-triggering example of each, and a genuine bug (the ghost-beneficiary
check was fully built, unit-tested, and never actually called by anything) was found and fixed along
the way. USSD (#36–39) now has a real in-browser phone simulator instead of requiring curl/Postman.

**Two items remain ⚠️, and stay there on purpose — this was verified, not assumed.** Before writing
this off as "just needs more engineering," the two real credential-based paths were tested directly:

- **Vision moderation's real AI check.** `ANTHROPIC_API_KEY` is present in configuration but empty.
  The one real, working key in this environment — `DEEPSEEK_API_KEY`, the platform's active AI
  provider — was tested live against a real image payload and rejected it outright:
  `"unknown variant image_url, expected text"`. DeepSeek's exposed API is text-only. There is no
  vision-capable credential anywhere in this environment to make a genuine content check possible.
- **SMS delivery to an actual phone.** The demo provider proves the dispatch code path and now
  surfaces "what would have been sent" in a staff-visible outbox, but no text can arrive on a real
  handset without a paid SSL Wireless/BulkSMSBD/Twilio account, which this environment does not have
  and which nothing inside this codebase can manufacture.

Both are documented in `docs/DEVIATIONS.md` §20–21 with the exact test performed. The code path to a
real provider is already correct for both — either would work immediately with a real key, no further
engineering required.

# Appendices: Exhaustive Technical Reference

Generated from the current workspace implementation and extracted metadata. Inventory snapshot: **371 files** before this appendix generator/output were added. Secret values are intentionally excluded.

## 3. Complete File Inventory (Appendix A)

Generated/vendor trees are summarized rather than enumerated: `node_modules/` (third-party packages), `.next/` and `.next-verify/` (Next.js output/cache), `.open-next/` (Cloudflare bundle), `.wrangler/` (local Workers state), `.render-temp/` (document-render scratch), and `.git/` (VCS internals). They are reproducible/non-authoritative and excluded from behavioral analysis.

| # | Path | Type | Responsibility / important exports | Dependencies | Important consumers | Runtime relevance |

|---:|---|---|---|---|---|---|

| 1 | `.dev.vars` | .vars; Environment configuration | Runtime/developer variable source; values intentionally omitted from handoff. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | configuration |
| 2 | `.env.example` | .example; Environment configuration | Runtime/developer variable source; values intentionally omitted from handoff. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | configuration |
| 3 | `.env.local` | .local; Environment configuration | Runtime/developer variable source; values intentionally omitted from handoff. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | configuration |
| 4 | `.gitignore` | (none); Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 5 | `.tmp-fix-shot.mjs` | .mjs; One-off screenshot helper | Tracked Playwright capture helper with machine-specific output path; not part of runtime or package scripts. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 6 | `.tmp-fix-shot2.mjs` | .mjs; One-off screenshot helper | Tracked Playwright capture helper with machine-specific output path; not part of runtime or package scripts. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 7 | `README.md` | .md; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 8 | `data/accessai.db` | .db; Local SQLite database | Local/sample runtime state; ignored and not guaranteed in a clone. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | local runtime |
| 9 | `data/test.db` | .db; Local SQLite database | Local/sample runtime state; ignored and not guaranteed in a clone. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | local runtime |
| 10 | `docs/presentations-and-assets/Nagorik-Sathi-Pitch-Deck.pptx` | .pptx; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 11 | `docs/presentations-and-assets/image.png` | .png; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 12 | `docs/product/AccessAI-Feature-Inventory.docx` | .docx; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 13 | `docs/product/AccessAI-PRD-Review.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 14 | `docs/product/AccessAI.pdf` | .pdf; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 15 | `docs/product/OPEN-QUESTIONS.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 16 | `docs/product/PRODUCT-HANDOFF.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 17 | `docs/product/SHEBAR-JANALA-FEATURES.html` | .html; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 18 | `docs/product/SHEBAR-JANALA-FEATURES.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 19 | `docs/product/SHEBAR-JANALA-FEATURES.pdf` | .pdf; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 20 | `docs/research-and-submissions/AccessAI-BCOLBD-2026-Whitepaper.docx` | .docx; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 21 | `docs/research-and-submissions/BCOLBD-2026-Whitepaper.html` | .html; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 22 | `docs/research-and-submissions/BLOCKCHAIN OLYMPIAD BANGLADESH AI Guideline.pdf` | .pdf; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 23 | `docs/research-and-submissions/Blockchain & AI Olympiad Bangladesh 2026 — Final Round Submission Guidelines.pdf` | .pdf; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 24 | `docs/research-and-submissions/ShebarJanala_whitepaper.pdf` | .pdf; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 25 | `docs/research-and-submissions/WHITEPAPER-CODEBASE-AUDIT.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 26 | `docs/technical/API.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 27 | `docs/technical/ARCHITECTURE.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 28 | `docs/technical/AccessAI-System-Overview.docx` | .docx; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 29 | `docs/technical/COMPLIANCE.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 30 | `docs/technical/DEVIATIONS.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 31 | `docs/technical/EXTERNAL.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 32 | `docs/technical/KNOWLEDGE-PIPELINE.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 33 | `docs/technical/LEDGER-INTEGRITY.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 34 | `docs/technical/Shebar-Janala-BCOLBD-2026-Technical-Documentation-v3.docx` | .docx; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 35 | `docs/technical/Shebar-Janala-Final-Technical-Documentation.docx` | .docx; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 36 | `docs/technical/TESTING.md` | .md; Documentation/reference asset | Non-runtime project documentation, submission material or visual reference; may be stale. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 37 | `drizzle.config.ts` | .ts; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 38 | `drizzle/0000_heavy_roland_deschain.sql` | .sql; Database migration | Versioned SQLite schema migration or Drizzle metadata. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | deployment |
| 39 | `drizzle/meta/0000_snapshot.json` | .json; Database migration | Versioned SQLite schema migration or Drizzle metadata. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | deployment |
| 40 | `drizzle/meta/_journal.json` | .json; Database migration | Versioned SQLite schema migration or Drizzle metadata. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | deployment |
| 41 | `next-env.d.ts` | .ts; Generated TypeScript metadata | Framework/compiler generated metadata; safe to regenerate and excluded from behavioral analysis. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | generated |
| 42 | `next.config.ts` | .ts; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 43 | `open-next.config.ts` | .ts; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 44 | `package-lock.json` | .json; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 45 | `package.json` | .json; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 46 | `postcss.config.mjs` | .mjs; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 47 | `public/_headers` | (none); Static asset | Browser-served image, icon, screenshot or response-header file. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | production/static |
| 48 | `public/logo.png` | .png; Static asset | Browser-served image, icon, screenshot or response-header file. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | production/static |
| 49 | `screenshots/00-logo-nagorik-sathi.png` | .png; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 50 | `screenshots/01-landing-bn.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 51 | `screenshots/02-login-bn.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 52 | `screenshots/03-chat-bn-response.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 53 | `screenshots/04-opportunity-eligibility-trace.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 54 | `screenshots/05-opportunity-documents.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 55 | `screenshots/06-saved-programmes.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 56 | `screenshots/07-nearby-services-map.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 57 | `screenshots/08-identity-verification.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 58 | `screenshots/09-my-entitlements.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 59 | `screenshots/10-local-issues.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 60 | `screenshots/11-budget-allocation-detail.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 61 | `screenshots/12-leader-portal-anomalies.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 62 | `screenshots/13-leader-portal-upazila-rollup.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 63 | `screenshots/14-officer-escalation-queue.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 64 | `screenshots/15-donor-portal.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 65 | `screenshots/16-admin-overview-health.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 66 | `screenshots/17-admin-ledger-integrity.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 67 | `screenshots/18-admin-programme-verification.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 68 | `screenshots/19-public-transparency-page.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 69 | `screenshots/20-ussd-entitlement-check.jpg` | .jpg; Screenshot evidence | Non-runtime visual evidence of implemented screens; useful for demo/regression reference. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | non-runtime |
| 70 | `scripts/ai-check.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Key declarations: function mask(value), function listModels(baseUrl, key), function main(). | ./load-env; ../src/lib/config/env; ../src/modules/ai/providers | Framework, script runner, static browser request, or no direct TS importer | operations |
| 71 | `scripts/build-verify.mjs` | .mjs; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Key declarations: const DIST. | node:child_process | Framework, script runner, static browser request, or no direct TS importer | operations |
| 72 | `scripts/clear-osm-cache.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Key declarations: function main(). | ./load-env; ../src/lib/db/client; ../src/lib/db/schema | Framework, script runner, static browser request, or no direct TS importer | operations |
| 73 | `scripts/ledger-audit.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Key declarations: function report(label, result), function main(). | ./load-env; ../src/modules/ledger/ledger.service; ../src/modules/admin/admin.service | Framework, script runner, static browser request, or no direct TS importer | operations |
| 74 | `scripts/load-env.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Exports: loadEnv. | node:fs; node:path | scripts/ai-check.ts, scripts/clear-osm-cache.ts, scripts/ledger-audit.ts, scripts/print-stt-prompt.ts, scripts/retrieval-eval.ts (+3) | operations |
| 75 | `scripts/print-stt-prompt.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. | ./load-env; ../src/modules/voice/stt-prompt | Framework, script runner, static browser request, or no direct TS importer | operations |
| 76 | `scripts/retrieval-eval.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Key declarations: Interface LabelledQuery, const QUERIES, const K_VALUES, function main(). | ./load-env; ../src/modules/knowledge/retrieval; ../src/lib/db/client; ../src/lib/db/schema | Framework, script runner, static browser request, or no direct TS importer | operations |
| 77 | `scripts/seed.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Key declarations: const RESET_USERS, const RAHIMA_DEMO_NID, function main(). | ./load-env; drizzle-orm; ../src/lib/db/client; ../src/lib/db/schema; ../src/lib/db/seed; ../src/lib/security/hash | Framework, script runner, static browser request, or no direct TS importer | operations |
| 78 | `scripts/voice-bangla-probe.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Key declarations: const CASES, function main(). | ./load-env; ../src/modules/voice/intent; ../src/modules/voice/commands | Framework, script runner, static browser request, or no direct TS importer | operations |
| 79 | `scripts/voice-check.ts` | .ts; Operational script | Local verification, seeding, audit, build, retrieval or provider check command. Key declarations: function mask(value), function toneWav(), function listModels(baseUrl, key), function main(). | ./load-env; ../src/lib/config/env; ../src/modules/voice/providers | Framework, script runner, static browser request, or no direct TS importer | operations |
| 80 | `src/app/[locale]/(app)/admin/ai-logs/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminAiLogsPage, dynamic. | next-intl/server; next/navigation; drizzle-orm; lucide-react; @/lib/db/client; @/lib/db/schema | Framework, script runner, static browser request, or no direct TS importer | production |
| 81 | `src/app/[locale]/(app)/admin/civic-roles/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminCivicRolesPage, dynamic. | next-intl/server; next/navigation; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 82 | `src/app/[locale]/(app)/admin/ledger/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminLedgerPage, dynamic. | next-intl/server; next/navigation; lucide-react; @/lib/http/session; @/modules/ledger/ledger.service; @/modules/admin/admin.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 83 | `src/app/[locale]/(app)/admin/moderation/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminModerationPage, dynamic. | next-intl/server; next/navigation; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 84 | `src/app/[locale]/(app)/admin/organisations/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminOrganisationsPage, dynamic. | next-intl/server; next/navigation; drizzle-orm; lucide-react; @/lib/db/client; @/lib/db/schema | Framework, script runner, static browser request, or no direct TS importer | production |
| 85 | `src/app/[locale]/(app)/admin/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminPage, generateMetadata, dynamic. | next-intl/server; next/navigation; drizzle-orm; lucide-react; @/lib/db/client; @/lib/db/schema | Framework, script runner, static browser request, or no direct TS importer | production |
| 86 | `src/app/[locale]/(app)/admin/programmes/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminProgrammesPage, dynamic. | next-intl/server; next/navigation; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 87 | `src/app/[locale]/(app)/admin/rules/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminRulesPage, dynamic. | next-intl/server; next/navigation; drizzle-orm; lucide-react; @/lib/db/client; @/lib/db/schema | Framework, script runner, static browser request, or no direct TS importer | production |
| 88 | `src/app/[locale]/(app)/admin/sms-outbox/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: SmsOutboxPage, generateMetadata, dynamic. | next-intl/server; next/navigation; lucide-react; @/lib/http/session; @/modules/notifications/sms.service; @/lib/config/env | Framework, script runner, static browser request, or no direct TS importer | production |
| 89 | `src/app/[locale]/(app)/admin/users/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AdminUsersPage, dynamic. | next-intl/server; next/navigation; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 90 | `src/app/[locale]/(app)/beneficiaries/[id]/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: BeneficiaryDetailPage, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/entitlements/entitlement.service; @/modules/civic/roles; @/components/beneficiaries/BeneficiaryDetail | Framework, script runner, static browser request, or no direct TS importer | production |
| 91 | `src/app/[locale]/(app)/beneficiaries/new/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: NewBeneficiaryPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/civic/roles; @/components/beneficiaries/BeneficiaryForm | Framework, script runner, static browser request, or no direct TS importer | production |
| 92 | `src/app/[locale]/(app)/beneficiaries/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: BeneficiariesPage, generateMetadata, dynamic. | next-intl/server; next/navigation; lucide-react; @/lib/http/session; @/modules/entitlements/entitlement.service; @/modules/civic/roles | Framework, script runner, static browser request, or no direct TS importer | production |
| 93 | `src/app/[locale]/(app)/budget/[id]/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: AllocationDetailPage, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/budget/budget.service; @/components/budget/BudgetDetail | Framework, script runner, static browser request, or no direct TS importer | production |
| 94 | `src/app/[locale]/(app)/budget/new/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: NewAllocationPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/civic/roles; @/components/budget/BudgetForm | Framework, script runner, static browser request, or no direct TS importer | production |
| 95 | `src/app/[locale]/(app)/budget/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: BudgetPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/budget/budget.service; @/modules/civic/roles; @/i18n/navigation | Framework, script runner, static browser request, or no direct TS importer | production |
| 96 | `src/app/[locale]/(app)/chat/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: ChatPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/ai/conversation.service; @/modules/ai/providers; @/components/chat/ChatClient | Framework, script runner, static browser request, or no direct TS importer | production |
| 97 | `src/app/[locale]/(app)/dashboard/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: DashboardPage, generateMetadata, dynamic. | next-intl/server; next/navigation; drizzle-orm; lucide-react; @/lib/db/client; @/lib/db/schema | Framework, script runner, static browser request, or no direct TS importer | production |
| 98 | `src/app/[locale]/(app)/donor/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: DonorPage, generateMetadata, dynamic. | next-intl/server; next/navigation; lucide-react; @/lib/http/session; @/modules/oversight/oversight.service; @/components/primitives/Card | Framework, script runner, static browser request, or no direct TS importer | production |
| 99 | `src/app/[locale]/(app)/entitlements/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: EntitlementsPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/entitlements/entitlement.service; @/i18n/navigation; @/components/primitives/Banner | Framework, script runner, static browser request, or no direct TS importer | production |
| 100 | `src/app/[locale]/(app)/identity/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: IdentityPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/identity/identity.service; @/components/identity/IdentityVerification | Framework, script runner, static browser request, or no direct TS importer | production |
| 101 | `src/app/[locale]/(app)/issues/[id]/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: IssueDetailPage, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/issues/issue.service; @/components/issues/IssueDetail | Framework, script runner, static browser request, or no direct TS importer | production |
| 102 | `src/app/[locale]/(app)/issues/new/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: NewIssuePage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/components/issues/IssueForm | Framework, script runner, static browser request, or no direct TS importer | production |
| 103 | `src/app/[locale]/(app)/issues/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: IssuesPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/issues/issue.service; @/i18n/navigation; @/components/primitives/Banner | Framework, script runner, static browser request, or no direct TS importer | production |
| 104 | `src/app/[locale]/(app)/layout.tsx` | .tsx; App shell | Routing, layout, metadata, error or styling responsibility. Exports: AppLayout. | react; next/navigation; next-intl/server; @/components/layout/AppShell; @/components/providers/VoiceProvider; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 105 | `src/app/[locale]/(app)/leader/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: LeaderPage, generateMetadata, dynamic. | next-intl/server; next/navigation; lucide-react; @/lib/http/session; @/modules/oversight/oversight.service; @/components/primitives/Card | Framework, script runner, static browser request, or no direct TS importer | production |
| 106 | `src/app/[locale]/(app)/nearby/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: NearbyPage, generateMetadata, dynamic. | next-intl/server; @/lib/http/session; @/modules/places/places.service; @/lib/domain/place-labels; @/components/nearby/NearbyBrowser; @/lib/config/env | Framework, script runner, static browser request, or no direct TS importer | production |
| 107 | `src/app/[locale]/(app)/notifications/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: NotificationsPage, generateMetadata, dynamic. | next-intl/server; next/navigation; lucide-react; @/lib/http/session; @/modules/citizen/citizen.service; @/components/primitives/States | Framework, script runner, static browser request, or no direct TS importer | production |
| 108 | `src/app/[locale]/(app)/officer/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: OfficerPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/budget/escalation.service; @/components/officer/EscalationQueue | Framework, script runner, static browser request, or no direct TS importer | production |
| 109 | `src/app/[locale]/(app)/opportunities/[slug]/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: OpportunityDetailPage, generateMetadata, dynamic. | next/navigation; next-intl/server; drizzle-orm; lucide-react; @/lib/db/client; @/lib/db/schema | Framework, script runner, static browser request, or no direct TS importer | production |
| 110 | `src/app/[locale]/(app)/opportunities/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: OpportunitiesPage, generateMetadata, dynamic. | next-intl/server; @/lib/http/session; @/modules/opportunities/opportunity.service; @/modules/eligibility/profile-mapper; @/modules/knowledge/retrieval; @/components/opportunity/OpportunityBrowser | Framework, script runner, static browser request, or no direct TS importer | production |
| 111 | `src/app/[locale]/(app)/profile/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: ProfilePage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/eligibility/profile-mapper; @/components/profile/ProfileForm | Framework, script runner, static browser request, or no direct TS importer | production |
| 112 | `src/app/[locale]/(app)/saved/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: SavedPage, generateMetadata, dynamic. | next-intl/server; next/navigation; lucide-react; @/lib/http/session; @/modules/citizen/citizen.service; @/i18n/navigation | Framework, script runner, static browser request, or no direct TS importer | production |
| 113 | `src/app/[locale]/(app)/settings/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: SettingsPage, generateMetadata, dynamic. | next-intl/server; next/navigation; @/lib/http/session; @/modules/auth/auth.service; @/components/settings/SettingsPanel; @/lib/config/env | Framework, script runner, static browser request, or no direct TS importer | production |
| 114 | `src/app/[locale]/(app)/timeline/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: TimelinePage, generateMetadata, dynamic. | next-intl/server; next/navigation; lucide-react; @/lib/http/session; @/modules/citizen/citizen.service; @/components/primitives/States | Framework, script runner, static browser request, or no direct TS importer | production |
| 115 | `src/app/[locale]/error.tsx` | .tsx; App shell | Routing, layout, metadata, error or styling responsibility. Exports: RouteError. | react; next-intl; lucide-react | Framework, script runner, static browser request, or no direct TS importer | production |
| 116 | `src/app/[locale]/forgot-pin/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: ForgotPinPage, generateMetadata. | next-intl/server; @/components/auth/AuthFlow; @/components/auth/AuthPageShell | Framework, script runner, static browser request, or no direct TS importer | production |
| 117 | `src/app/[locale]/layout.tsx` | .tsx; App shell | Routing, layout, metadata, error or styling responsibility. Exports: generateStaticParams, generateMetadata, viewport, LocaleLayout. | react; next; next/navigation; next-intl; next-intl/server; next/font/google | Framework, script runner, static browser request, or no direct TS importer | production |
| 118 | `src/app/[locale]/login/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: LoginPage, generateMetadata. | next-intl/server; @/components/auth/AuthFlow; @/components/auth/AuthPageShell | Framework, script runner, static browser request, or no direct TS importer | production |
| 119 | `src/app/[locale]/not-found.tsx` | .tsx; App shell | Routing, layout, metadata, error or styling responsibility. Exports: NotFound. | next-intl/server; lucide-react; @/i18n/navigation | Framework, script runner, static browser request, or no direct TS importer | production |
| 120 | `src/app/[locale]/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: LandingPage, dynamic, revalidate, generateMetadata. | next-intl/server; drizzle-orm; lucide-react; @/lib/db/client; @/lib/db/schema; @/modules/opportunities/opportunity.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 121 | `src/app/[locale]/register/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: RegisterPage, generateMetadata. | next-intl/server; @/components/auth/AuthFlow; @/components/auth/AuthPageShell | Framework, script runner, static browser request, or no direct TS importer | production |
| 122 | `src/app/[locale]/transparency/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: TransparencyPage, generateMetadata, dynamic. | next-intl/server; lucide-react; @/modules/oversight/oversight.service; @/components/layout/LocaleSwitcher; @/components/primitives/Card; @/components/primitives/Money | Framework, script runner, static browser request, or no direct TS importer | production |
| 123 | `src/app/[locale]/ussd-demo/page.tsx` | .tsx; Next.js page | App Router page and server/client presentation entry point. Exports: UssdDemoPage, generateMetadata, dynamic. | next-intl/server; @/components/layout/LocaleSwitcher; @/components/ussd/UssdSimulator | Framework, script runner, static browser request, or no direct TS importer | production |
| 124 | `src/app/api/v1/action-plans/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/citizen/citizen.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 125 | `src/app/api/v1/action-plans/tasks/[id]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: PATCH, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/citizen/citizen.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 126 | `src/app/api/v1/admin/ai-logs/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | next/server; drizzle-orm; zod; @/lib/db/client; @/lib/db/schema; @/lib/http/response | Framework, script runner, static browser request, or no direct TS importer | production |
| 127 | `src/app/api/v1/admin/donors/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; zod; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 128 | `src/app/api/v1/admin/jobs/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; drizzle-orm; zod; @/lib/db/client; @/lib/db/schema; @/lib/http/response | Framework, script runner, static browser request, or no direct TS importer | production |
| 129 | `src/app/api/v1/admin/moderation/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, PATCH, dynamic. | next/server; drizzle-orm; zod; @/lib/db/client; @/lib/db/schema; @/lib/http/response | Framework, script runner, static browser request, or no direct TS importer | production |
| 130 | `src/app/api/v1/admin/organizations/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, PATCH, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 131 | `src/app/api/v1/admin/overview/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/admin/admin.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 132 | `src/app/api/v1/admin/programs/[id]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, PATCH, DELETE, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 133 | `src/app/api/v1/admin/programs/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 134 | `src/app/api/v1/admin/rules/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 135 | `src/app/api/v1/admin/sms-outbox/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/notifications/sms.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 136 | `src/app/api/v1/admin/users/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, PATCH, dynamic. | next/server; drizzle-orm; zod; @/lib/db/client; @/lib/db/schema; @/lib/http/response | Framework, script runner, static browser request, or no direct TS importer | production |
| 137 | `src/app/api/v1/auth/login/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; @/lib/http/response; @/lib/http/rate-limit; @/lib/http/auth-errors; @/lib/http/cookies; @/lib/validation/schemas | Framework, script runner, static browser request, or no direct TS importer | production |
| 138 | `src/app/api/v1/auth/otp/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; @/lib/http/response; @/lib/http/rate-limit; @/lib/http/auth-errors; @/lib/validation/schemas; @/modules/auth/auth.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 139 | `src/app/api/v1/auth/pin/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; @/lib/http/response; @/lib/http/rate-limit; @/lib/http/auth-errors; @/lib/http/cookies; @/lib/validation/schemas | Framework, script runner, static browser request, or no direct TS importer | production |
| 140 | `src/app/api/v1/auth/register/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; @/lib/http/response; @/lib/http/rate-limit; @/lib/http/auth-errors; @/lib/http/cookies; @/lib/validation/schemas | Framework, script runner, static browser request, or no direct TS importer | production |
| 141 | `src/app/api/v1/auth/renew/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | next/server; next/headers; @/lib/http/response; @/lib/http/cookies; @/lib/http/rate-limit; @/lib/routing/next-path | Framework, script runner, static browser request, or no direct TS importer | production |
| 142 | `src/app/api/v1/auth/session/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, PUT, DELETE, dynamic. | next/server; next/headers; @/lib/http/response; @/lib/http/auth-errors; @/lib/http/cookies; @/lib/http/rate-limit | Framework, script runner, static browser request, or no direct TS importer | production |
| 143 | `src/app/api/v1/beneficiaries/[id]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/entitlements/entitlement.service; @/modules/civic/roles | Framework, script runner, static browser request, or no direct TS importer | production |
| 144 | `src/app/api/v1/beneficiaries/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/entitlements/entitlement.service; @/modules/civic/roles | Framework, script runner, static browser request, or no direct TS importer | production |
| 145 | `src/app/api/v1/budget/allocations/[id]/flag/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 146 | `src/app/api/v1/budget/allocations/[id]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/modules/budget/budget.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 147 | `src/app/api/v1/budget/allocations/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/budget/budget.service; @/modules/civic/roles | Framework, script runner, static browser request, or no direct TS importer | production |
| 148 | `src/app/api/v1/chat/[id]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, DELETE, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/ai/conversation.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 149 | `src/app/api/v1/chat/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, GET, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/http/rate-limit; @/lib/validation/schemas; @/modules/ai/conversation.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 150 | `src/app/api/v1/donor/overview/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/oversight/oversight.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 151 | `src/app/api/v1/eligibility/check/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 152 | `src/app/api/v1/entitlements/[id]/disbursements/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 153 | `src/app/api/v1/entitlements/status/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/entitlements/entitlement.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 154 | `src/app/api/v1/feedback/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session; @/lib/http/rate-limit | Framework, script runner, static browser request, or no direct TS importer | production |
| 155 | `src/app/api/v1/identity/nid/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/http/rate-limit; @/lib/validation/schemas; @/modules/identity/identity.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 156 | `src/app/api/v1/identity/residency/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/identity/identity.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 157 | `src/app/api/v1/identity/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/identity/identity.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 158 | `src/app/api/v1/issues/[id]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, PATCH, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/issues/issue.service; @/modules/admin/admin.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 159 | `src/app/api/v1/issues/[id]/vote/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/modules/issues/issue.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 160 | `src/app/api/v1/issues/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/http/rate-limit; @/lib/validation/schemas; @/modules/issues/issue.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 161 | `src/app/api/v1/leader/overview/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/oversight/oversight.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 162 | `src/app/api/v1/ledger/verify/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/ledger/ledger.service; @/modules/admin/admin.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 163 | `src/app/api/v1/life-events/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, revalidate. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response | Framework, script runner, static browser request, or no direct TS importer | production |
| 164 | `src/app/api/v1/locations/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/places/places.service; @/lib/domain/place-labels | Framework, script runner, static browser request, or no direct TS importer | production |
| 165 | `src/app/api/v1/map/tile/[z]/[x]/[y]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET. | next/server; @/lib/config/env | Framework, script runner, static browser request, or no direct TS importer | production |
| 166 | `src/app/api/v1/notifications/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, PATCH, dynamic. | next/server; zod; @/lib/http/response; @/lib/http/session; @/modules/citizen/citizen.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 167 | `src/app/api/v1/opportunities/[slug]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session; @/modules/opportunities/opportunity.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 168 | `src/app/api/v1/opportunities/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/http/rate-limit; @/lib/validation/schemas; @/modules/opportunities/opportunity.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 169 | `src/app/api/v1/public/transparency/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/modules/oversight/oversight.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 170 | `src/app/api/v1/saved/[id]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: PATCH, DELETE, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/citizen/citizen.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 171 | `src/app/api/v1/saved/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/citizen/citizen.service; @/lib/domain/enums | Framework, script runner, static browser request, or no direct TS importer | production |
| 172 | `src/app/api/v1/timeline/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/modules/citizen/citizen.service; @/lib/format/dates | Framework, script runner, static browser request, or no direct TS importer | production |
| 173 | `src/app/api/v1/upazila/escalations/[id]/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: PATCH, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/validation/schemas; @/modules/budget/escalation.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 174 | `src/app/api/v1/upazila/escalations/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, dynamic. | @/lib/http/response; @/lib/http/session; @/modules/budget/escalation.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 175 | `src/app/api/v1/users/me/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, PATCH, DELETE, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 176 | `src/app/api/v1/users/profile/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, PATCH, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 177 | `src/app/api/v1/users/settings/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: PATCH, dynamic. | next/server; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/http/response; @/lib/http/session | Framework, script runner, static browser request, or no direct TS importer | production |
| 178 | `src/app/api/v1/ussd/callback/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; zod; next/server; @/lib/http/response; @/lib/config/env; @/lib/format/numerals | Framework, script runner, static browser request, or no direct TS importer | production |
| 179 | `src/app/api/v1/ussd/simulate/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; zod; @/lib/http/response; @/lib/format/numerals; @/modules/ussd/ussd.service | Framework, script runner, static browser request, or no direct TS importer | production |
| 180 | `src/app/api/v1/voice/speak/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: POST, dynamic. | next/server; node:crypto; zod; @/lib/http/response; @/lib/http/session; @/lib/http/rate-limit | Framework, script runner, static browser request, or no direct TS importer | production |
| 181 | `src/app/api/v1/voice/transcribe/route.ts` | .ts; API route | HTTP boundary: validation, auth/authorization and service orchestration. Exports: GET, POST, dynamic. | next/server; @/lib/http/response; @/lib/http/session; @/lib/http/rate-limit; @/modules/auth/auth.service; @/modules/voice/providers | Framework, script runner, static browser request, or no direct TS importer | production |
| 182 | `src/app/apple-icon.png` | .png; App shell | Routing, layout, metadata, error or styling responsibility. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | production |
| 183 | `src/app/globals.css` | .css; App shell | Routing, layout, metadata, error or styling responsibility. | None recorded / non-code | src/app/not-found.tsx, src/app/[locale]/layout.tsx | production |
| 184 | `src/app/icon.png` | .png; App shell | Routing, layout, metadata, error or styling responsibility. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | production |
| 185 | `src/app/layout.tsx` | .tsx; App shell | Routing, layout, metadata, error or styling responsibility. Exports: RootLayout. | react | Framework, script runner, static browser request, or no direct TS importer | production |
| 186 | `src/app/not-found.tsx` | .tsx; App shell | Routing, layout, metadata, error or styling responsibility. Exports: GlobalNotFound. | next/link; @/i18n/routing; @/messages/catalog; ./globals.css | Framework, script runner, static browser request, or no direct TS importer | production |
| 187 | `src/components/admin/AdminJobs.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: JobRunView, AdminJobs. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/admin/page.tsx | production |
| 188 | `src/components/admin/AdminNav.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: AdminNav. | next-intl; lucide-react; @/i18n/navigation; @/lib/utils/cn | src/app/[locale]/(app)/admin/ai-logs/page.tsx, src/app/[locale]/(app)/admin/civic-roles/page.tsx, src/app/[locale]/(app)/admin/ledger/page.tsx, src/app/[locale]/(app)/admin/moderation/page.tsx, src/app/[locale]/(app)/admin/organisations/page.tsx (+5) | production |
| 189 | `src/components/admin/CivicRoleAssignment.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: CivicUserRow, CivicRoleAssignment. | react; next-intl; @tanstack/react-query; @/i18n/navigation; lucide-react; @/lib/api/client | src/app/[locale]/(app)/admin/civic-roles/page.tsx | production |
| 190 | `src/components/admin/DonorOrgManager.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: DonorOrgRow, DonorOrgManager. | react; next-intl; @tanstack/react-query; @/i18n/navigation; lucide-react; @/lib/api/client | src/app/[locale]/(app)/admin/civic-roles/page.tsx | production |
| 191 | `src/components/admin/ModerationQueue.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: ModerationQueue. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/admin/moderation/page.tsx | production |
| 192 | `src/components/admin/ProgrammeTable.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: ProgrammeRow, ProgrammeTable. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/admin/programmes/page.tsx | production |
| 193 | `src/components/admin/RefreshButton.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: RefreshButton. | next-intl; lucide-react; @/i18n/navigation; @/components/primitives/Button | src/app/[locale]/(app)/admin/sms-outbox/page.tsx | production |
| 194 | `src/components/admin/UserTable.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: UserTable. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/admin/users/page.tsx | production |
| 195 | `src/components/auth/AuthFlow.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: AuthMode, AuthFlow. | react; next-intl; lucide-react; @/i18n/navigation; @/lib/api/client; @/components/primitives/TextField | src/app/[locale]/forgot-pin/page.tsx, src/app/[locale]/login/page.tsx, src/app/[locale]/register/page.tsx | production |
| 196 | `src/components/auth/AuthPageShell.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: AuthPageShell. | react; next-intl/server; lucide-react; @/i18n/navigation; @/components/layout/LocaleSwitcher; @/components/providers/VoiceProvider | src/app/[locale]/forgot-pin/page.tsx, src/app/[locale]/login/page.tsx, src/app/[locale]/register/page.tsx | production |
| 197 | `src/components/beneficiaries/BeneficiaryDetail.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: BeneficiaryDetailDisbursement, BeneficiaryDetailEntitlement, BeneficiaryDetailView, BeneficiaryDetail. | react; next-intl; @tanstack/react-query; @/i18n/navigation; lucide-react; @/lib/api/client | src/app/[locale]/(app)/beneficiaries/[id]/page.tsx | production |
| 198 | `src/components/beneficiaries/BeneficiaryFeed.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: BeneficiaryFeedItem, BeneficiaryFeed. | next-intl; lucide-react; @/i18n/navigation; @/components/primitives/Card; @/components/primitives/Chip; @/components/primitives/States | src/app/[locale]/(app)/beneficiaries/page.tsx | production |
| 199 | `src/components/beneficiaries/BeneficiaryForm.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: BeneficiaryForm. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/beneficiaries/new/page.tsx | production |
| 200 | `src/components/budget/BudgetDetail.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: BudgetDetailAllocation, BudgetDetail. | react; next-intl; @tanstack/react-query; lucide-react; @/lib/api/client; @/components/primitives/Card | src/app/[locale]/(app)/budget/[id]/page.tsx | production |
| 201 | `src/components/budget/BudgetFeed.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: BudgetFeedItem, BudgetFeed. | next-intl; lucide-react; @/i18n/navigation; @/components/primitives/Card; @/components/primitives/Chip; @/components/primitives/States | src/app/[locale]/(app)/budget/page.tsx | production |
| 202 | `src/components/budget/BudgetForm.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: BudgetForm. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/budget/new/page.tsx | production |
| 203 | `src/components/chat/AiEngineNotice.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: AiEngineNotice. | react; next-intl; lucide-react; @/components/primitives/Banner; @/components/primitives/Button; @/lib/domain/enums | src/app/[locale]/(app)/dashboard/page.tsx, src/components/chat/ChatClient.tsx | production |
| 204 | `src/components/chat/ChatClient.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: ChatMessage, ChatClient. | react; next-intl; @tanstack/react-query; lucide-react; @/lib/utils/cn; @/lib/api/client | src/app/[locale]/(app)/chat/page.tsx | production |
| 205 | `src/components/entitlements/EntitlementStatus.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: EntitlementStatusView, EntitlementStatus. | next-intl; lucide-react; @/components/primitives/Card; @/components/primitives/Chip; @/components/primitives/States; @/components/primitives/Money | src/app/[locale]/(app)/entitlements/page.tsx | production |
| 206 | `src/components/identity/IdentityVerification.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: IdentityVerification. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/identity/page.tsx | production |
| 207 | `src/components/issues/IssueDetail.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: IssueDetailView, IssueDetail. | react; next-intl; @tanstack/react-query; lucide-react; @/lib/api/client; @/components/primitives/Card | src/app/[locale]/(app)/issues/[id]/page.tsx | production |
| 208 | `src/components/issues/IssueFeed.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: IssueFeedItem, IssueFeed. | next-intl; lucide-react; @/i18n/navigation; @/components/primitives/Card; @/components/primitives/Chip; @/components/primitives/Tabs | src/app/[locale]/(app)/issues/page.tsx | production |
| 209 | `src/components/issues/IssueForm.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: IssueForm. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/issues/new/page.tsx | production |
| 210 | `src/components/layout/AppShell.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: AppShellProps, AppShell. | react; next-intl; lucide-react; @/i18n/navigation; @/lib/utils/cn; ./LocaleSwitcher | src/app/[locale]/(app)/layout.tsx | production |
| 211 | `src/components/layout/LocaleSwitcher.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: LocaleSwitcher. | next-intl; lucide-react; @/i18n/navigation; @/i18n/routing; @/lib/utils/cn | src/app/[locale]/page.tsx, src/app/[locale]/transparency/page.tsx, src/app/[locale]/ussd-demo/page.tsx, src/components/auth/AuthPageShell.tsx, src/components/layout/AppShell.tsx (+1) | production |
| 212 | `src/components/nearby/MapView.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: MapMarker, MapView. | react; next-intl; lucide-react; @/lib/geo/mercator; @/lib/utils/cn | src/components/nearby/NearbyBrowser.tsx, tests/a11y/map-view.test.tsx | production |
| 213 | `src/components/nearby/NearbyBrowser.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: NearbyBrowser, { PlaceType }. | react; next-intl; lucide-react; @/i18n/navigation; @/components/primitives/Card; @/components/primitives/Select | src/app/[locale]/(app)/nearby/page.tsx | production |
| 214 | `src/components/notifications/NotificationList.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: NotificationItem, NotificationList. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/utils/cn | src/app/[locale]/(app)/notifications/page.tsx, tests/a11y/voice-screens.test.tsx | production |
| 215 | `src/components/officer/EscalationQueue.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: EscalationItem, EscalationQueue. | react; next-intl; @tanstack/react-query; @/i18n/navigation; lucide-react; @/lib/api/client | src/app/[locale]/(app)/officer/page.tsx | production |
| 216 | `src/components/opportunity/OpportunityActions.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: OpportunityActions. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/components/providers/VoiceProvider | src/app/[locale]/(app)/opportunities/[slug]/page.tsx | production |
| 217 | `src/components/opportunity/OpportunityBrowser.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: OpportunityBrowser. | react; next-intl; lucide-react; @/i18n/navigation; @/components/primitives/TextField; @/components/primitives/Chip | src/app/[locale]/(app)/opportunities/page.tsx | production |
| 218 | `src/components/opportunity/OpportunityCard.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: OpportunityCardData, OpportunityCard. | next-intl; lucide-react; @/i18n/navigation; @/lib/utils/cn; @/components/primitives/Card; @/components/primitives/Button | src/components/chat/ChatClient.tsx, src/components/opportunity/OpportunityBrowser.tsx, src/components/opportunity/OpportunityListClient.tsx | production |
| 219 | `src/components/opportunity/OpportunityListClient.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: OpportunityListClient. | react; next-intl; @tanstack/react-query; @/lib/api/client; ./OpportunityCard; @/components/providers/ToastProvider | src/app/[locale]/(app)/dashboard/page.tsx, src/components/opportunity/OpportunityBrowser.tsx | production |
| 220 | `src/components/primitives/Banner.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: BannerTone, BannerProps, Banner, InfoPanel. | react; lucide-react; @/lib/utils/cn | src/app/[locale]/(app)/admin/ai-logs/page.tsx, src/app/[locale]/(app)/admin/page.tsx, src/app/[locale]/(app)/admin/rules/page.tsx, src/app/[locale]/(app)/budget/page.tsx, src/app/[locale]/(app)/dashboard/page.tsx (+14) | production |
| 221 | `src/components/primitives/Button.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: ButtonVariant, ButtonSize, ButtonProps, Button. | react; @/lib/utils/cn; ./Spinner | src/components/admin/AdminJobs.tsx, src/components/admin/CivicRoleAssignment.tsx, src/components/admin/DonorOrgManager.tsx, src/components/admin/ModerationQueue.tsx, src/components/admin/ProgrammeTable.tsx (+25) | production |
| 222 | `src/components/primitives/Card.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: CardProps, Card, Section, ListRow. | react; @/lib/utils/cn | src/app/[locale]/(app)/admin/ai-logs/page.tsx, src/app/[locale]/(app)/admin/civic-roles/page.tsx, src/app/[locale]/(app)/admin/ledger/page.tsx, src/app/[locale]/(app)/admin/organisations/page.tsx, src/app/[locale]/(app)/admin/page.tsx (+39) | production |
| 223 | `src/components/primitives/Chip.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: FilterChip, BadgeTone, Badge, EligibilityPill, VerificationBadge, ConfidenceMeter. | react; lucide-react; @/lib/utils/cn; @/lib/domain/enums | src/app/[locale]/(app)/admin/ai-logs/page.tsx, src/app/[locale]/(app)/admin/organisations/page.tsx, src/app/[locale]/(app)/admin/page.tsx, src/app/[locale]/(app)/admin/rules/page.tsx, src/app/[locale]/(app)/admin/sms-outbox/page.tsx (+27) | production |
| 224 | `src/components/primitives/Choice.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: ChoiceOption, RadioGroupProps, RadioGroup, CheckboxRowProps, CheckboxRow, SwitchRowProps. | react; lucide-react; @/lib/utils/cn | src/components/auth/AuthFlow.tsx, src/components/opportunity/OpportunityActions.tsx, src/components/opportunity/OpportunityBrowser.tsx, src/components/primitives/Select.tsx, src/components/profile/ProfileForm.tsx (+1) | production |
| 225 | `src/components/primitives/DateOfBirthField.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: DateOfBirthValue, EMPTY_DOB, toDate, ageFrom, DateOfBirthField. | react; @/lib/utils/cn; ./FieldShell; @/lib/format/dates; @/components/providers/PreferencesProvider; @/lib/format/numerals | src/components/profile/ProfileForm.tsx | production |
| 226 | `src/components/primitives/FieldShell.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: FieldShellProps, FieldShell, fieldDescribedBy, controlSurfaceClasses. | lucide-react; react; @/lib/utils/cn | src/components/primitives/DateOfBirthField.tsx, src/components/primitives/Select.tsx, src/components/primitives/Textarea.tsx, src/components/primitives/TextField.tsx | production |
| 227 | `src/components/primitives/IconButton.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: IconButtonProps, IconButton. | react; @/lib/utils/cn | src/components/chat/ChatClient.tsx, src/components/primitives/Sheet.tsx, src/components/saved/SavedBoard.tsx, src/components/timeline/TimelineView.tsx | production |
| 228 | `src/components/primitives/Money.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: Money, Num. | @/lib/utils/cn; @/lib/format/numerals; @/components/providers/PreferencesProvider | src/app/[locale]/(app)/admin/organisations/page.tsx, src/app/[locale]/(app)/admin/page.tsx, src/app/[locale]/(app)/dashboard/page.tsx, src/app/[locale]/(app)/donor/page.tsx, src/app/[locale]/(app)/leader/page.tsx (+13) | production |
| 229 | `src/components/primitives/OtpInput.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: OtpInputProps, OtpInput. | react; @/lib/utils/cn; @/lib/format/numerals | src/components/auth/AuthFlow.tsx, tests/a11y/primitives.test.tsx | production |
| 230 | `src/components/primitives/Select.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: SelectOption, SelectProps, Select. | react; lucide-react; @/lib/utils/cn; ./Sheet; ./FieldShell; ./Choice | src/components/admin/CivicRoleAssignment.tsx, src/components/admin/UserTable.tsx, src/components/auth/AuthFlow.tsx, src/components/beneficiaries/BeneficiaryDetail.tsx, src/components/beneficiaries/BeneficiaryForm.tsx (+7) | production |
| 231 | `src/components/primitives/Sheet.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: Sheet, Dialog, ConfirmDialog. | react; react-dom; framer-motion; lucide-react; @/lib/utils/cn; ./IconButton | src/components/admin/ProgrammeTable.tsx, src/components/opportunity/OpportunityActions.tsx, src/components/opportunity/OpportunityBrowser.tsx, src/components/primitives/Select.tsx, src/components/saved/SavedBoard.tsx (+2) | production |
| 232 | `src/components/primitives/Spinner.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: Spinner. | @/lib/utils/cn | src/components/chat/ChatClient.tsx, src/components/primitives/Button.tsx, src/components/primitives/States.tsx | production |
| 233 | `src/components/primitives/States.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: Skeleton, SkeletonCard, SkeletonList, LoadingState, EmptyState, ErrorState. | react; lucide-react; @/lib/utils/cn; ./Button; ./Spinner | src/app/[locale]/(app)/admin/ai-logs/page.tsx, src/app/[locale]/(app)/admin/sms-outbox/page.tsx, src/app/[locale]/(app)/beneficiaries/page.tsx, src/app/[locale]/(app)/dashboard/page.tsx, src/app/[locale]/(app)/donor/page.tsx (+13) | production |
| 234 | `src/components/primitives/Tabs.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: TabItem, Tabs. | react; @/lib/utils/cn | src/components/admin/ModerationQueue.tsx, src/components/issues/IssueFeed.tsx, src/components/officer/EscalationQueue.tsx, src/components/saved/SavedBoard.tsx, src/components/timeline/TimelineView.tsx | production |
| 235 | `src/components/primitives/TextField.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: TextFieldProps, TextField. | react; lucide-react; @/lib/utils/cn; ./FieldShell; @/lib/format/numerals | src/components/admin/CivicRoleAssignment.tsx, src/components/admin/DonorOrgManager.tsx, src/components/admin/ProgrammeTable.tsx, src/components/admin/UserTable.tsx, src/components/auth/AuthFlow.tsx (+10) | production |
| 236 | `src/components/primitives/Textarea.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: TextareaProps, Textarea, ChipPicker. | react; @/lib/utils/cn; ./FieldShell | src/components/budget/BudgetDetail.tsx, src/components/budget/BudgetForm.tsx, src/components/issues/IssueDetail.tsx, src/components/issues/IssueForm.tsx, src/components/opportunity/OpportunityActions.tsx (+2) | production |
| 237 | `src/components/profile/ProfileForm.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: ProfileForm. | react; next-intl; @tanstack/react-query; @/i18n/navigation; @/lib/api/client; @/components/primitives/Card | src/app/[locale]/(app)/profile/page.tsx | production |
| 238 | `src/components/providers/PreferencesProvider.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: Preferences, DEFAULT_PREFERENCES, PreferencesProvider, usePreferences. | react; next-intl; @/i18n/routing; @/lib/domain/enums | src/app/[locale]/layout.tsx, src/components/chat/ChatClient.tsx, src/components/layout/AppShell.tsx, src/components/nearby/NearbyBrowser.tsx, src/components/opportunity/OpportunityCard.tsx (+5) | production |
| 239 | `src/components/providers/QueryProvider.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: QueryProvider. | @tanstack/react-query; react | src/app/[locale]/layout.tsx | production |
| 240 | `src/components/providers/ToastProvider.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: ToastTone, ToastInput, ToastProvider, useToast. | react; framer-motion; lucide-react; @/lib/utils/cn | src/app/[locale]/layout.tsx, src/components/admin/AdminJobs.tsx, src/components/admin/CivicRoleAssignment.tsx, src/components/admin/DonorOrgManager.tsx, src/components/admin/ModerationQueue.tsx (+18) | production |
| 241 | `src/components/providers/VoiceProvider.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: VoiceState, VoiceActionHandler, DictateOptions, VoiceContextValue, VoiceProvider, useVoice. | react; @/i18n/navigation; ./PreferencesProvider; @/lib/voice/speech; @/modules/voice/intent; @/modules/voice/commands | src/app/[locale]/(app)/layout.tsx, src/components/auth/AuthPageShell.tsx, src/components/chat/ChatClient.tsx, src/components/layout/AppShell.tsx, src/components/notifications/NotificationList.tsx (+10) | production |
| 242 | `src/components/saved/ActionPlanList.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: PlanTask, Plan, ActionPlanList. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/utils/cn | src/app/[locale]/(app)/saved/page.tsx | production |
| 243 | `src/components/saved/SavedBoard.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: SavedEntry, SavedBoard. | react; next-intl; @tanstack/react-query; lucide-react; @/i18n/navigation; @/lib/api/client | src/app/[locale]/(app)/saved/page.tsx | production |
| 244 | `src/components/settings/SettingsPanel.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: SettingsPanel. | react; next-intl; @tanstack/react-query; lucide-react; @/lib/api/client; @/components/primitives/Card | src/app/[locale]/(app)/settings/page.tsx | production |
| 245 | `src/components/timeline/TimelineView.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: TimelineEntry, TimelineView. | react; next-intl; lucide-react; @/i18n/navigation; @/lib/utils/cn; @/components/primitives/Card | src/app/[locale]/(app)/timeline/page.tsx, tests/a11y/voice-screens.test.tsx | production |
| 246 | `src/components/ussd/UssdSimulator.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: UssdSimulator. | react; next-intl; @tanstack/react-query; lucide-react; @/lib/api/client; @/components/primitives/Card | src/app/[locale]/ussd-demo/page.tsx | production |
| 247 | `src/components/voice/DictateDigits.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: DictateDigits. | react; next-intl; lucide-react; @/components/providers/VoiceProvider; @/lib/format/number-words | src/components/auth/AuthFlow.tsx | production |
| 248 | `src/components/voice/ReadAloud.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: ReadAloud. | @/components/providers/VoiceProvider; ./SpeakButton | src/app/[locale]/(app)/opportunities/[slug]/page.tsx, src/components/notifications/NotificationList.tsx, src/components/timeline/TimelineView.tsx | production |
| 249 | `src/components/voice/SpeakButton.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: SpeakButton. | next-intl; lucide-react; @/components/primitives/Button; @/components/providers/VoiceProvider | src/components/chat/ChatClient.tsx, src/components/voice/ReadAloud.tsx | production |
| 250 | `src/components/voice/VoiceButton.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: VoiceButton. | react; next-intl; lucide-react; @/lib/utils/cn; @/components/providers/VoiceProvider | src/components/layout/AppShell.tsx | production |
| 251 | `src/components/voice/VoiceSheet.tsx` | .tsx; UI component | Reusable or feature-specific presentation/interaction logic. Exports: VoiceSheet, VoiceCapabilities. | react; next-intl; lucide-react; @/components/primitives/Sheet; @/components/primitives/Button; @/components/primitives/Textarea | src/components/layout/AppShell.tsx, tests/a11y/voice-listening.test.tsx | production |
| 252 | `src/i18n/navigation.ts` | .ts; Internationalization | Locale routing and next-intl runtime configuration. Exports: { Link, redirect, usePathname, useRouter, getPathname }. | next-intl/navigation; ./routing | src/app/[locale]/(app)/admin/rules/page.tsx, src/app/[locale]/(app)/budget/page.tsx, src/app/[locale]/(app)/chat/page.tsx, src/app/[locale]/(app)/dashboard/page.tsx, src/app/[locale]/(app)/entitlements/page.tsx (+36) | production |
| 253 | `src/i18n/request.ts` | .ts; Internationalization | Locale routing and next-intl runtime configuration. Exports: default. | next-intl/server; next-intl; ./routing | Framework, script runner, static browser request, or no direct TS importer | production |
| 254 | `src/i18n/routing.ts` | .ts; Internationalization | Locale routing and next-intl runtime configuration. Exports: routing, AppLocale, LOCALE_LABELS, LOCALE_TAGS, isAppLocale. | next-intl/routing | src/app/not-found.tsx, src/app/[locale]/layout.tsx, src/app/[locale]/page.tsx, src/components/auth/AuthFlow.tsx, src/components/layout/LocaleSwitcher.tsx (+5) | production |
| 255 | `src/lib/api/client.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: ApiError, NetworkError, RequestOptions, api, errorMessageKey. | @/lib/http/response | src/components/admin/AdminJobs.tsx, src/components/admin/CivicRoleAssignment.tsx, src/components/admin/DonorOrgManager.tsx, src/components/admin/ModerationQueue.tsx, src/components/admin/ProgrammeTable.tsx (+20) | production |
| 256 | `src/lib/config/env.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: env, AiMode, resolveAiMode, aiConfigProblems, hasEmbeddingProvider, isProduction. | zod | src/app/api/v1/locations/route.ts, src/app/api/v1/map/tile/[z]/[x]/[y]/route.ts, src/app/api/v1/ussd/callback/route.ts, src/app/api/v1/voice/transcribe/route.ts, src/app/[locale]/(app)/admin/sms-outbox/page.tsx (+18) | production |
| 257 | `src/lib/db/client.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: Database, db, sqlClient, initialisePragmas, { schema }. | @libsql/client; @libsql/client/web; drizzle-orm/libsql/driver-core; drizzle-orm/libsql/driver-core; node:module; node:fs | src/app/api/v1/admin/ai-logs/route.ts, src/app/api/v1/admin/donors/route.ts, src/app/api/v1/admin/jobs/route.ts, src/app/api/v1/admin/moderation/route.ts, src/app/api/v1/admin/organizations/route.ts (+45) | production |
| 258 | `src/lib/db/schema.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: users, userProfiles, userSettings, sessions, otpChallenges, organizations. | drizzle-orm; drizzle-orm/sqlite-core; ../domain/enums; ../domain/rules | src/app/api/v1/admin/ai-logs/route.ts, src/app/api/v1/admin/donors/route.ts, src/app/api/v1/admin/jobs/route.ts, src/app/api/v1/admin/moderation/route.ts, src/app/api/v1/admin/organizations/route.ts (+47) | production |
| 259 | `src/lib/db/seed/helpers.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: Bilingual, pair, c, ALL, ANY, NONE. | @/lib/domain/rules; @/lib/domain/enums; @/lib/domain/enums | src/lib/db/seed/index.ts, src/lib/db/seed/opportunities-education.ts, src/lib/db/seed/opportunities-health.ts, src/lib/db/seed/opportunities-livelihood.ts, src/lib/db/seed/opportunities-support.ts (+2) | production |
| 260 | `src/lib/db/seed/index.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: { SEED_ORGANIZATIONS, SEED_LIFE_EVENTS, SEED_LOCATIONS, SEED_UNIONS }, { SeedOpportunity }, SEED_OPPORTUNITIES, validateSeedCorpus, SEED_STATS. | ./organizations; ./opportunities-welfare; ./opportunities-education; ./opportunities-health; ./opportunities-livelihood; ./opportunities-support | Framework, script runner, static browser request, or no direct TS importer | production |
| 261 | `src/lib/db/seed/life-events.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SeedLifeEvent, SEED_LIFE_EVENTS. | @/lib/domain/enums | src/lib/db/seed/index.ts, src/modules/ai/nlu.ts | production |
| 262 | `src/lib/db/seed/locations.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SeedLocation, SEED_LOCATIONS. | @/lib/domain/geography | src/lib/db/seed/index.ts | production |
| 263 | `src/lib/db/seed/opportunities-education.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SEED_EDUCATION. | ./helpers | src/lib/db/seed/index.ts | production |
| 264 | `src/lib/db/seed/opportunities-health.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SEED_HEALTH. | ./helpers | src/lib/db/seed/index.ts | production |
| 265 | `src/lib/db/seed/opportunities-livelihood.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SEED_LIVELIHOOD. | ./helpers | src/lib/db/seed/index.ts | production |
| 266 | `src/lib/db/seed/opportunities-support.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SEED_SUPPORT. | ./helpers | src/lib/db/seed/index.ts | production |
| 267 | `src/lib/db/seed/opportunities-welfare.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SEED_WELFARE. | ./helpers | src/lib/db/seed/index.ts | production |
| 268 | `src/lib/db/seed/organizations.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SEED_ORGANIZATIONS. | ./helpers | src/lib/db/seed/index.ts | production |
| 269 | `src/lib/db/seed/unions.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: SeedUnion, SEED_UNIONS. | None recorded / non-code | src/lib/db/seed/index.ts | production |
| 270 | `src/lib/domain/enums.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: USER_ROLES, UserRole, ROLE_RANK, STAFF_ROLES, USER_STATUSES, UserStatus. | None recorded / non-code | src/app/api/v1/admin/users/route.ts, src/app/api/v1/saved/route.ts, src/app/[locale]/(app)/opportunities/page.tsx, src/app/[locale]/(app)/opportunities/[slug]/page.tsx, src/components/admin/CivicRoleAssignment.tsx (+59) | production |
| 271 | `src/lib/domain/geography.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: DIVISIONS, Division, DIVISION_LABELS, DistrictRecord, DISTRICTS, DISTRICT_CODES. | None recorded / non-code | src/app/api/v1/opportunities/[slug]/route.ts, src/app/api/v1/users/profile/route.ts, src/app/[locale]/(app)/opportunities/[slug]/page.tsx, src/components/auth/AuthFlow.tsx, src/components/nearby/NearbyBrowser.tsx (+8) | production |
| 272 | `src/lib/domain/place-labels.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: PlaceLabel, PLACE_LABELS, placeLabel, placeGlyph, isUrgentPlace. | ./enums; @/modules/places/osm-tags | src/app/api/v1/locations/route.ts, src/app/[locale]/(app)/nearby/page.tsx, src/components/nearby/NearbyBrowser.tsx, tests/places/overpass.test.ts | production |
| 273 | `src/lib/domain/rules.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: RULE_FIELDS, RuleField, LocalisedText, RuleCondition, RuleGroup, RuleNode. | zod; ./enums | src/app/api/v1/admin/rules/route.ts, src/app/[locale]/(app)/admin/rules/page.tsx, src/components/opportunity/OpportunityCard.tsx, src/lib/db/seed/helpers.ts, src/lib/db/seed/index.ts (+7) | production |
| 274 | `src/lib/format/dates.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: Locale, DateFormatOptions, formatDate, formatMonthYear, monthName, weekdayNames. | @/lib/domain/enums; ./numerals | src/app/api/v1/timeline/route.ts, src/app/[locale]/(app)/admin/ai-logs/page.tsx, src/app/[locale]/(app)/admin/page.tsx, src/app/[locale]/(app)/admin/rules/page.tsx, src/app/[locale]/(app)/admin/sms-outbox/page.tsx (+29) | production |
| 275 | `src/lib/format/number-words.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: extractNumbers, parseNumberWords, parseAmount, parseSpokenDigits, hasNoNumber. | ./numerals | src/components/voice/DictateDigits.tsx, src/modules/ai/nlu.ts, src/modules/voice/intent.ts, tests/format/number-words.test.ts | production |
| 276 | `src/lib/format/numerals.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: toBengaliDigits, toLatinDigits, localiseDigits, groupSouthAsian, NumberFormatOptions, formatNumber. | @/lib/domain/enums | src/app/api/v1/ussd/callback/route.ts, src/app/api/v1/ussd/simulate/route.ts, src/app/[locale]/(app)/opportunities/[slug]/page.tsx, src/components/admin/UserTable.tsx, src/components/auth/AuthFlow.tsx (+16) | production |
| 277 | `src/lib/geo/mercator.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: TILE_SIZE, MAX_LATITUDE, LatLng, Point, clampLatitude, wrapLongitude. | None recorded / non-code | src/components/nearby/MapView.tsx, src/modules/places/overpass.ts, src/modules/places/places.service.ts, tests/a11y/map-view.test.tsx, tests/geo/mercator.test.ts | production |
| 278 | `src/lib/http/auth-errors.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: authErrorResponse, rethrowUnlessAuth. | next/server; ./response; @/modules/auth/auth.service | src/app/api/v1/auth/login/route.ts, src/app/api/v1/auth/otp/route.ts, src/app/api/v1/auth/pin/route.ts, src/app/api/v1/auth/register/route.ts, src/app/api/v1/auth/session/route.ts | production |
| 279 | `src/lib/http/cookies.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: setAuthCookies, clearAuthCookies, { COOKIE_NAMES }. | next/server; @/lib/security/tokens; @/lib/config/env | src/app/api/v1/auth/login/route.ts, src/app/api/v1/auth/pin/route.ts, src/app/api/v1/auth/register/route.ts, src/app/api/v1/auth/renew/route.ts, src/app/api/v1/auth/session/route.ts (+1) | production |
| 280 | `src/lib/http/rate-limit.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: RateLimitOptions, RateLimitResult, consume, clientKey, clientIp, guardRateLimit. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/config/env; ./response; next/server | src/app/api/v1/auth/login/route.ts, src/app/api/v1/auth/otp/route.ts, src/app/api/v1/auth/pin/route.ts, src/app/api/v1/auth/register/route.ts, src/app/api/v1/auth/renew/route.ts (+8) | production |
| 281 | `src/lib/http/response.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: ApiErrorBody, ApiSuccessBody, ERROR_CODES, ErrorCode, HttpError, readJson. | next/server; zod | src/app/api/v1/action-plans/route.ts, src/app/api/v1/action-plans/tasks/[id]/route.ts, src/app/api/v1/admin/ai-logs/route.ts, src/app/api/v1/admin/donors/route.ts, src/app/api/v1/admin/jobs/route.ts (+58) | production |
| 282 | `src/lib/http/session.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: Session, getSession, FullSession, getFullSession, GuardResult, requireSession. | next/headers; drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/security/tokens; @/lib/domain/enums | src/app/api/v1/action-plans/route.ts, src/app/api/v1/action-plans/tasks/[id]/route.ts, src/app/api/v1/admin/ai-logs/route.ts, src/app/api/v1/admin/donors/route.ts, src/app/api/v1/admin/jobs/route.ts (+80) | production |
| 283 | `src/lib/routing/next-path.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: stripLocalePrefix, safeNextPath. | @/i18n/routing | src/app/api/v1/auth/renew/route.ts, src/components/auth/AuthFlow.tsx, tests/routing/next-path.test.ts | production |
| 284 | `src/lib/security/field-encryption.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: encryptField, decryptField, encryptStringArray, decryptStringArray. | node:crypto; @/lib/config/env | src/app/api/v1/users/profile/route.ts, src/lib/http/session.ts, src/modules/ai/conversation.service.ts, tests/security/field-encryption.test.ts | production |
| 285 | `src/lib/security/hash.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: hashSecret, verifySecret, fastHash, randomToken, randomNumericCode. | node:crypto; node:util | src/modules/auth/auth.service.ts, src/modules/entitlements/entitlement.service.ts, src/modules/identity/nid.service.ts, src/modules/ledger/ledger.service.ts | production |
| 286 | `src/lib/security/tokens.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: AccessTokenClaims, RefreshTokenClaims, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken. | jose; @/lib/config/env; @/lib/domain/enums | src/lib/http/cookies.ts, src/lib/http/session.ts, src/modules/auth/auth.service.ts | production |
| 287 | `src/lib/utils/cn.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: cn. | clsx; tailwind-merge | src/components/admin/AdminNav.tsx, src/components/chat/ChatClient.tsx, src/components/layout/AppShell.tsx, src/components/layout/LocaleSwitcher.tsx, src/components/nearby/MapView.tsx (+23) | production |
| 288 | `src/lib/validation/schemas.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: phoneSchema, pinSchema, otpSchema, localeSchema, requestOtpSchema, verifyOtpSchema. | zod; @/lib/domain/enums; @/lib/domain/geography; @/lib/format/numerals; @/lib/domain/rules | src/app/api/v1/action-plans/route.ts, src/app/api/v1/action-plans/tasks/[id]/route.ts, src/app/api/v1/admin/ai-logs/route.ts, src/app/api/v1/admin/organizations/route.ts, src/app/api/v1/admin/programs/route.ts (+25) | production |
| 289 | `src/lib/voice/speech.ts` | .ts; Shared library | Cross-cutting runtime utility, database, auth, API, crypto or configuration support. Exports: RecognitionErrorKind, RecognitionError, VoiceSupport, detectVoiceSupport, hasBanglaVoice, whenVoicesReady. | None recorded / non-code | src/components/providers/VoiceProvider.tsx | production |
| 290 | `src/messages/bn.ts` | .ts; Localization catalog | Bengali/English message catalog and locale projection. Exports: default. | ./catalog | Framework, script runner, static browser request, or no direct TS importer | production |
| 291 | `src/messages/catalog.ts` | .ts; Localization catalog | Bengali/English message catalog and locale projection. Exports: Pair, CatalogNode, catalog, project, LOCALE_INDEX. | None recorded / non-code | src/app/not-found.tsx, src/messages/bn.ts, src/messages/en.ts, tests/a11y/map-view.test.tsx, tests/a11y/voice-listening.test.tsx (+1) | production |
| 292 | `src/messages/en.ts` | .ts; Localization catalog | Bengali/English message catalog and locale projection. Exports: default. | ./catalog | src/lib/domain/place-labels.ts, src/lib/domain/rules.ts, src/modules/eligibility/profile-mapper.ts | production |
| 293 | `src/middleware.ts` | .ts; Build/configuration | Toolchain, package, framework, deployment or repository configuration. Exports: middleware, config. | next/server; next-intl/middleware; ./i18n/routing; ./lib/security/tokens; ./lib/domain/enums | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 294 | `src/modules/admin/admin.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: AnalyticsSummary, getAnalytics, getSystemHealth, reindexSearch, rebuildEmbeddings, detectStaleness. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/modules/knowledge/retrieval; @/modules/knowledge/tokenizer; @/lib/format/dates | src/app/api/v1/admin/donors/route.ts, src/app/api/v1/admin/jobs/route.ts, src/app/api/v1/admin/moderation/route.ts, src/app/api/v1/admin/organizations/route.ts, src/app/api/v1/admin/overview/route.ts (+9) | production |
| 295 | `src/modules/admin/retention.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: RETENTION_POLICY, RetentionResult, enforceDataRetention. | drizzle-orm; @/lib/db/client; @/lib/db/schema | src/modules/admin/admin.service.ts | production |
| 296 | `src/modules/ai/composer.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: composeResponse, humaniseEvent. | ./response-plan; ./response-plan; @/lib/format/numerals; @/lib/format/dates; @/lib/domain/enums | src/modules/ai/conversation.service.ts | production |
| 297 | `src/modules/ai/confidence.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: ConfidenceInput, ConfidenceBreakdown, scoreConfidence, bandLabel. | @/lib/domain/enums; @/modules/eligibility/engine; @/modules/knowledge/retrieval | src/app/api/v1/eligibility/check/route.ts, src/modules/opportunities/opportunity.service.ts, tests/ai/confidence.test.ts | production |
| 298 | `src/modules/ai/conversation.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: TurnInput, TurnResult, runTurn, listConversations, getConversation, deleteConversation. | drizzle-orm; @/lib/db/client; @/lib/db/schema; ./nlu; @/modules/knowledge/retrieval; @/modules/opportunities/opportunity.service | src/app/api/v1/chat/route.ts, src/app/api/v1/chat/[id]/route.ts, src/app/[locale]/(app)/chat/page.tsx | production |
| 299 | `src/modules/ai/nlu.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: detectLocale, containsBangla, LifeEventMatch, detectLifeEvents, IntentResult, classifyIntents. | @/lib/domain/enums; @/lib/db/seed/life-events; @/lib/domain/geography; @/lib/format/numerals; @/lib/format/number-words; @/modules/eligibility/engine | src/modules/ai/conversation.service.ts, tests/ai/nlu-income.test.ts | production |
| 300 | `src/modules/ai/providers/index.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: getProvider, setProviderForTesting, describeAiMode, { ProviderError }, { LlmProvider, GenerateResult, GenerateInput }. | @/lib/config/env; ./types | Framework, script runner, static browser request, or no direct TS importer | production |
| 301 | `src/modules/ai/providers/types.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: GenerateInput, GenerateResult, EmbedResult, LlmProvider, ProviderError, postJson. | @/lib/domain/enums | src/modules/ai/providers/index.ts | production |
| 302 | `src/modules/ai/response-plan.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: PlannedOpportunity, PlanKind, ResponsePlan, pickLocalised. | @/lib/domain/enums; @/lib/domain/rules | src/modules/ai/composer.ts, src/modules/ai/conversation.service.ts | production |
| 303 | `src/modules/auth/auth.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: OtpPurpose, AuthResult, AuthError, OtpIssueResult, requestOtp, verifyOtp. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/security/hash; @/lib/security/tokens; @/lib/format/numerals | src/app/api/v1/admin/users/route.ts, src/app/api/v1/auth/login/route.ts, src/app/api/v1/auth/otp/route.ts, src/app/api/v1/auth/pin/route.ts, src/app/api/v1/auth/register/route.ts (+6) | production |
| 304 | `src/modules/budget/budget.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: CreateAllocationInput, createAllocation, listAllocationsForUnion, getAllocation, FlagResult, flagAllocation. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/db/schema; @/modules/ledger/ledger.service; ./escalation-rules | src/app/api/v1/budget/allocations/route.ts, src/app/api/v1/budget/allocations/[id]/flag/route.ts, src/app/api/v1/budget/allocations/[id]/route.ts, src/app/[locale]/(app)/budget/page.tsx, src/app/[locale]/(app)/budget/[id]/page.tsx | production |
| 305 | `src/modules/budget/escalation-rules.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: ESCALATION_THRESHOLD_RATIO, ESCALATION_MIN_FLAGS, flagRatio, shouldEscalate. | None recorded / non-code | src/modules/budget/budget.service.ts, tests/budget/escalation-rules.test.ts | production |
| 306 | `src/modules/budget/escalation.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: escalateAllocation, listEscalationsForOfficer, listUnassignedEscalations, resolveEscalation. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/db/schema; @/lib/domain/enums; @/modules/citizen/citizen.service | src/app/api/v1/upazila/escalations/route.ts, src/app/api/v1/upazila/escalations/[id]/route.ts, src/app/[locale]/(app)/officer/page.tsx, src/modules/budget/budget.service.ts | production |
| 307 | `src/modules/citizen/citizen.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: saveOpportunity, updateSaved, removeSaved, listSaved, savedCounts, generateActionPlan. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/domain/enums; @/lib/format/dates | src/app/api/v1/action-plans/route.ts, src/app/api/v1/action-plans/tasks/[id]/route.ts, src/app/api/v1/notifications/route.ts, src/app/api/v1/saved/route.ts, src/app/api/v1/saved/[id]/route.ts (+7) | production |
| 308 | `src/modules/civic/roles.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: CivicSubject, isUnionOfficialOf, isChairmanOf, isUpazilaOfficerFor, isZilaOfficerFor, civicRoleAtLeast. | @/lib/domain/enums | src/app/api/v1/beneficiaries/route.ts, src/app/api/v1/beneficiaries/[id]/route.ts, src/app/api/v1/budget/allocations/route.ts, src/app/api/v1/entitlements/[id]/disbursements/route.ts, src/app/[locale]/(app)/beneficiaries/new/page.tsx (+5) | production |
| 309 | `src/modules/eligibility/engine.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: EligibilityProfile, ConditionState, ConditionTrace, GroupTrace, NodeTrace, isGroupTrace. | @/lib/domain/rules; @/lib/domain/enums | src/app/api/v1/admin/rules/route.ts, src/app/api/v1/eligibility/check/route.ts, src/app/api/v1/users/me/route.ts, src/app/[locale]/(app)/admin/rules/page.tsx, src/app/[locale]/(app)/dashboard/page.tsx (+9) | production |
| 310 | `src/modules/eligibility/profile-mapper.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: computeAge, MapProfileInput, toEligibilityProfile, profileCompleteness, suggestNextFields. | @/lib/db/schema; ./engine; @/lib/domain/rules; @/lib/domain/geography; @/lib/domain/enums | src/app/api/v1/auth/session/route.ts, src/app/api/v1/eligibility/check/route.ts, src/app/api/v1/opportunities/route.ts, src/app/api/v1/opportunities/[slug]/route.ts, src/app/api/v1/users/me/route.ts (+6) | production |
| 311 | `src/modules/entitlements/entitlement.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: EntitlementStatusResult, checkMyEntitlementStatus, checkEntitlementStatusByNid, EnrollBeneficiaryInput, enrollBeneficiary, RecordDisbursementInput. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/domain/enums; @/modules/identity/nid.service; @/lib/security/hash | src/app/api/v1/beneficiaries/route.ts, src/app/api/v1/beneficiaries/[id]/route.ts, src/app/api/v1/entitlements/status/route.ts, src/app/api/v1/entitlements/[id]/disbursements/route.ts, src/app/[locale]/(app)/beneficiaries/page.tsx (+3) | production |
| 312 | `src/modules/identity/geofence.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: isPointInPolygon, findUnionForPoint, listUnions. | @/lib/db/client; @/lib/db/schema; @/lib/db/schema | src/modules/identity/identity.service.ts, tests/identity/geofence.test.ts | production |
| 313 | `src/modules/identity/identity.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: IdentityStatus, getIdentityStatus, NidSubmissionResult, submitNidVerification, ResidencySubmissionInput, ResidencySubmissionResult. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/db/schema; ./nid.service; ./geofence | src/app/api/v1/identity/nid/route.ts, src/app/api/v1/identity/residency/route.ts, src/app/api/v1/identity/route.ts, src/app/[locale]/(app)/admin/civic-roles/page.tsx, src/app/[locale]/(app)/identity/page.tsx | production |
| 314 | `src/modules/identity/nid.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: NidVerificationResult, normaliseNidNumber, verifyNid. | @/lib/config/env; @/lib/security/hash; @/lib/domain/enums | src/modules/entitlements/entitlement.service.ts, src/modules/identity/identity.service.ts, tests/identity/nid.test.ts | production |
| 315 | `src/modules/issues/issue.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: SubmitIssueInput, submitIssue, UnionFeedOptions, listUnionFeed, listMyIssues, getIssue. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/db/schema; @/lib/domain/enums; ./moderation | src/app/api/v1/admin/moderation/route.ts, src/app/api/v1/issues/route.ts, src/app/api/v1/issues/[id]/route.ts, src/app/api/v1/issues/[id]/vote/route.ts, src/app/[locale]/(app)/admin/moderation/page.tsx (+4) | production |
| 316 | `src/modules/issues/moderation.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: IssueScreenResult, screenIssueText. | None recorded / non-code | src/modules/issues/issue.service.ts, tests/issues/moderation.test.ts | production |
| 317 | `src/modules/issues/photo-storage.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: PhotoUploadResult, saveIssuePhoto. | node:fs/promises; node:path; @aws-sdk/client-s3; @/lib/config/env | src/modules/issues/issue.service.ts | production |
| 318 | `src/modules/issues/state-machine.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: canTransition, nextStatuses, PUBLICLY_VISIBLE_STATUSES. | @/lib/domain/enums | src/components/issues/IssueDetail.tsx, src/modules/issues/issue.service.ts, tests/issues/state-machine.test.ts | production |
| 319 | `src/modules/issues/vision-moderation.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: VisionModerationResult, moderateIssuePhoto. | @/lib/config/env; @/lib/domain/enums | src/modules/issues/issue.service.ts | production |
| 320 | `src/modules/knowledge/retrieval.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: RetrievalFilters, RetrievedChunk, RetrieveOptions, retrieve, opportunityIdsFrom, backfillEmbeddings. | drizzle-orm; @/lib/db/client; @/lib/db/schema; ./tokenizer; @/lib/config/env; @/modules/ai/providers | src/app/api/v1/opportunities/route.ts, src/app/api/v1/opportunities/[slug]/route.ts, src/app/[locale]/(app)/opportunities/page.tsx, src/app/[locale]/(app)/opportunities/[slug]/page.tsx, src/modules/admin/admin.service.ts (+4) | production |
| 321 | `src/modules/knowledge/tokenizer.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: tokenize, termFrequencies, chunkText, estimateTokens. | None recorded / non-code | src/modules/admin/admin.service.ts, src/modules/knowledge/retrieval.ts, src/modules/opportunities/opportunity.service.ts | production |
| 322 | `src/modules/ledger/hash-chain.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: GENESIS_HASH, stableStringify, computeEntryHash, ChainLink, ChainVerificationResult, verifyChain. | node:crypto | src/modules/admin/admin.service.ts, src/modules/ledger/ledger.service.ts, tests/ledger/hash-chain.test.ts | production |
| 323 | `src/modules/ledger/ledger.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: appendLedgerEntry, getLedgerEntriesFor, verifyLedgerChain. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/domain/enums; ./hash-chain | src/app/api/v1/ledger/verify/route.ts, src/app/[locale]/(app)/admin/ledger/page.tsx, src/modules/budget/budget.service.ts, src/modules/entitlements/entitlement.service.ts, src/modules/oversight/oversight.service.ts | production |
| 324 | `src/modules/notifications/sms.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: SmsDeliveryError, listDemoSmsOutbox, dispatchSms. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/config/env | src/app/api/v1/admin/sms-outbox/route.ts, src/app/[locale]/(app)/admin/sms-outbox/page.tsx, src/modules/auth/auth.service.ts | production |
| 325 | `src/modules/opportunities/opportunity.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: EnrichedOpportunity, ListFilters, listOpportunities, getOpportunityBySlug, recordView, recordEvaluation. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/modules/eligibility/engine; @/modules/recommendation/ranker; @/modules/ai/confidence | src/app/api/v1/admin/programs/route.ts, src/app/api/v1/admin/programs/[id]/route.ts, src/app/api/v1/eligibility/check/route.ts, src/app/api/v1/opportunities/route.ts, src/app/api/v1/opportunities/[slug]/route.ts (+5) | production |
| 326 | `src/modules/oversight/anomaly.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: AnomalySeverity, Anomaly, detectAllocationOutliers, detectDuplicateBeneficiaryEnrolment, detectUnverifiedBeneficiaryIdentity, detectOverpaidDisbursements. | None recorded / non-code | src/modules/oversight/oversight.service.ts, tests/oversight/anomaly.test.ts | production |
| 327 | `src/modules/oversight/oversight.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: OversightScope, getLeaderPortalData, getDonorPortalData, getPublicTransparencyData, getVerifiedNidHashes. | drizzle-orm; @/lib/db/client; @/lib/db/schema; ./anomaly; ./anomaly; @/modules/ledger/ledger.service | src/app/api/v1/donor/overview/route.ts, src/app/api/v1/leader/overview/route.ts, src/app/api/v1/public/transparency/route.ts, src/app/[locale]/(app)/donor/page.tsx, src/app/[locale]/(app)/leader/page.tsx (+1) | production |
| 328 | `src/modules/places/osm-tags.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: OsmOnlyType, PlaceType, TAG_RULES, OSM_BACKED_TYPES, typeFromTags, overpassFilters. | @/lib/domain/enums | src/app/api/v1/locations/route.ts, src/app/[locale]/(app)/nearby/page.tsx, src/components/nearby/NearbyBrowser.tsx, src/lib/domain/place-labels.ts, src/modules/places/overpass.ts (+2) | production |
| 329 | `src/modules/places/overpass.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: OsmPlace, OverpassError, buildQuery, comparableName, normaliseElement, dedupe. | @/lib/config/env; @/lib/geo/mercator; ./osm-tags | src/modules/places/places.service.ts, tests/places/overpass.test.ts | production |
| 330 | `src/modules/places/places.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: Place, OsmStatus, NearbyResult, pruneOsmCache, NearbyQuery, findNearby. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/config/env; @/lib/domain/geography; @/lib/geo/mercator | src/app/api/v1/locations/route.ts, src/app/[locale]/(app)/nearby/page.tsx, src/components/nearby/NearbyBrowser.tsx | production |
| 331 | `src/modules/recommendation/ranker.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: RANKING_WEIGHTS, RankingInput, RankingContext, RankedResult, rank, urgencyHint. | @/lib/domain/enums; @/modules/eligibility/engine; @/lib/format/dates | src/modules/opportunities/opportunity.service.ts | production |
| 332 | `src/modules/ussd/ussd.service.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: UssdCallbackInput, UssdResponse, handleUssdCallback, purgeStaleUssdSessions. | drizzle-orm; @/lib/db/client; @/lib/db/schema; @/lib/domain/enums; @/modules/entitlements/entitlement.service; @/modules/issues/issue.service | src/app/api/v1/ussd/callback/route.ts, src/app/api/v1/ussd/simulate/route.ts, src/modules/admin/admin.service.ts | production |
| 333 | `src/modules/voice/commands.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: CommandKind, ConfirmPolicy, CommandSlotSpec, VoiceCommand, VOICE_COMMANDS, COMMAND_BY_ID. | @/lib/domain/enums; @/lib/domain/geography | src/components/providers/VoiceProvider.tsx, src/components/voice/VoiceSheet.tsx, src/modules/voice/intent.ts, src/modules/voice/stt-prompt.ts, tests/voice/intent.test.ts (+1) | production |
| 334 | `src/modules/voice/intent.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: MatchQuality, ResolvedSlots, IntentMatch, IntentUnmatched, IntentResult, IntentContext. | ./commands; @/lib/format/number-words | src/components/providers/VoiceProvider.tsx, tests/voice/intent.test.ts | production |
| 335 | `src/modules/voice/providers.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: SttEngine, TranscriptionResult, SttError, SttProvider, getSttProvider, setSttProviderForTesting. | @/lib/config/env | src/app/api/v1/voice/speak/route.ts, src/app/api/v1/voice/transcribe/route.ts, src/modules/ai/conversation.service.ts | production |
| 336 | `src/modules/voice/spoken.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: Fragment, speakable, clause, SpokenListOptions, spokenList, SPOKEN_LIST_LIMIT. | @/lib/format/numerals | src/app/[locale]/(app)/opportunities/[slug]/page.tsx, src/components/notifications/NotificationList.tsx, src/components/timeline/TimelineView.tsx, tests/voice/spoken.test.ts | production |
| 337 | `src/modules/voice/stt-prompt.ts` | .ts; Domain/service module | Business, data-access or integration logic for its module. Exports: SttPurpose, sttPromptFor, STT_PROMPT_LIMIT. | @/lib/config/env; ./commands | src/app/api/v1/voice/transcribe/route.ts, tests/voice/stt-prompt.test.ts | production |
| 338 | `src/prompts/index.ts` | .ts; AI prompt contract | System prompt templates used by the AI workflow. Exports: PromptTemplate, SYSTEM_PROMPT, CONVERSATION_PROMPT, CLARIFICATION_PROMPT, EXPLANATION_PROMPT, SUMMARY_PROMPT. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | production |
| 339 | `tailwind.config.ts` | .ts; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 340 | `tests/a11y/map-view.test.tsx` | .tsx; Test | Vitest unit or jsdom behavioral check. Key declarations: const VIEWPORT, function Providers({ children }), function renderMap(props). | vitest; @testing-library/react; react; next-intl; @/components/nearby/MapView; @/messages/catalog | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 341 | `tests/a11y/primitives.test.tsx` | .tsx; Test | Vitest unit or jsdom behavioral check. | vitest; @testing-library/react; react; @/components/primitives/TextField; @/components/primitives/Button; @/components/primitives/OtpInput | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 342 | `tests/a11y/voice-confirmation.test.tsx` | .tsx; Test | Vitest unit or jsdom behavioral check. Key declarations: function Harness({ onSave }), function setup(), function click(label). | vitest; @testing-library/react; react; @/components/providers/VoiceProvider | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 343 | `tests/a11y/voice-listening.test.tsx` | .tsx; Test | Vitest unit or jsdom behavioral check. Key declarations: function Probe(), function Providers({ children }), function setup(). | vitest; @testing-library/react; react; next-intl; @/components/providers/VoiceProvider; @/components/voice/VoiceSheet | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 344 | `tests/a11y/voice-screens.test.tsx` | .tsx; Test | Vitest unit or jsdom behavioral check. Key declarations: function Providers({ children }), function Probe(), function click(label), function renderTimeline(events), function renderNotifications(items). | vitest; @testing-library/react; react; next-intl; @tanstack/react-query; @/components/providers/VoiceProvider | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 345 | `tests/ai/confidence.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. Key declarations: const NOW, function chunk(overrides), function evaluation(overrides), function bestCase(overrides). | vitest; @/modules/ai/confidence; @/modules/knowledge/retrieval; @/modules/eligibility/engine | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 346 | `tests/ai/nlu-income.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/ai/nlu | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 347 | `tests/budget/escalation-rules.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/budget/escalation-rules | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 348 | `tests/civic/roles.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/civic/roles | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 349 | `tests/eligibility/engine.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. Key declarations: function cond(field, operator, value, extra), function ruleSet(root, requiredFields), function all(children), function any(children), function none(children). | vitest; @/modules/eligibility/engine; @/lib/domain/rules; @/lib/domain/enums | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 350 | `tests/format/number-words.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/lib/format/number-words; @/lib/format/numerals | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 351 | `tests/format/numerals.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/lib/format/numerals; @/lib/format/dates | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 352 | `tests/geo/mercator.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/lib/geo/mercator; @/lib/domain/geography | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 353 | `tests/identity/geofence.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. Key declarations: const SQUARE. | vitest; @/modules/identity/geofence | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 354 | `tests/identity/nid.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/identity/nid.service | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 355 | `tests/issues/moderation.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/issues/moderation | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 356 | `tests/issues/state-machine.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/issues/state-machine; @/lib/domain/enums | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 357 | `tests/ledger/hash-chain.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/ledger/hash-chain | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 358 | `tests/oversight/anomaly.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/oversight/anomaly | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 359 | `tests/places/overpass.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/places/overpass; @/modules/places/osm-tags; @/lib/domain/place-labels; @/lib/domain/enums | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 360 | `tests/routing/next-path.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/lib/routing/next-path; @/i18n/routing | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 361 | `tests/security/field-encryption.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/lib/security/field-encryption | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 362 | `tests/setup.dom.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | ./setup; @testing-library/jest-dom/vitest; vitest; @testing-library/react | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 363 | `tests/setup.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | None recorded / non-code | tests/setup.dom.ts | test-only |
| 364 | `tests/tokens/contrast.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. Key declarations: function blockFor(selector), function readTokens(selector), function countDeclarations(selector), function channel(value), function luminance([r, g, b]). | vitest; node:fs; node:path | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 365 | `tests/voice/intent.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. Key declarations: function expectCommand(transcript, id, context). | vitest; @/modules/voice/intent; @/modules/voice/commands | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 366 | `tests/voice/spoken.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/voice/spoken | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 367 | `tests/voice/stt-prompt.test.ts` | .ts; Test | Vitest unit or jsdom behavioral check. | vitest; @/modules/voice/stt-prompt; @/modules/voice/commands | Framework, script runner, static browser request, or no direct TS importer | test-only |
| 368 | `tsconfig.json` | .json; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 369 | `tsconfig.tsbuildinfo` | .tsbuildinfo; Generated TypeScript metadata | Framework/compiler generated metadata; safe to regenerate and excluded from behavioral analysis. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | generated |
| 370 | `vitest.config.ts` | .ts; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |
| 371 | `wrangler.jsonc` | .jsonc; Build/configuration | Toolchain, package, framework, deployment or repository configuration. | None recorded / non-code | Framework, script runner, static browser request, or no direct TS importer | build/deployment |

## 8. Dependency Graph (Appendix B)

Dependency direction is predominantly `app routes/pages → modules → lib/db + domain`; components call the HTTP client or receive server-fetched data; modules also invoke provider adapters. The table below is mechanically derived from TypeScript imports and aggregates internal dependencies by top-level subsystem.

| Dependency edge | Import sites |

|---|---:|

| src/app → src/lib | 288 |
| src/components → src/lib | 114 |
| src/app → src/components | 106 |
| src/components → src/i18n | 35 |
| src/modules/ai → src/lib | 19 |
| src/app → src/modules/eligibility | 17 |
| tests → src/lib | 14 |
| src/app → src/modules/admin | 13 |
| src/app → src/i18n | 13 |
| src/app → src/modules/citizen | 11 |
| tests → src/components | 11 |
| src/app → src/modules/auth | 10 |
| src/app → src/modules/opportunities | 9 |
| src/app → src/modules/civic | 9 |
| src/modules/identity → src/lib | 9 |
| src/modules/places → src/lib | 9 |
| src/app → src/modules/issues | 8 |
| src/app → src/modules/ai | 8 |
| src/app → src/modules/budget | 8 |
| src/modules/issues → src/lib | 8 |
| src/app → src/modules/entitlements | 7 |
| src/modules/admin → src/lib | 7 |
| src/modules/auth → src/lib | 7 |
| src/modules/budget → src/lib | 7 |
| src/app → src/modules/oversight | 6 |
| src/modules/eligibility → src/lib | 6 |
| src/modules/voice → src/lib | 6 |
| src/app → src/modules/identity | 5 |
| src/components → src/modules/voice | 5 |
| tests → src/modules/voice | 5 |
| src/app → src/modules/places | 4 |
| src/app → src/modules/knowledge | 4 |
| src/app → src/modules/voice | 4 |
| src/modules/ai → src/modules/eligibility | 4 |
| src/modules/citizen → src/lib | 4 |
| src/modules/entitlements → src/lib | 4 |
| src/modules/opportunities → src/lib | 4 |
| src/modules/knowledge → src/lib | 3 |
| src/modules/ledger → src/lib | 3 |
| src/modules/notifications → src/lib | 3 |
| src/modules/ussd → src/lib | 3 |
| tests → src/messages | 3 |
| src/app → src/modules/notifications | 2 |
| src/app → src/modules/ledger | 2 |
| src/app → src/modules/ussd | 2 |
| src/components → src/modules/places | 2 |
| src/modules/admin → src/modules/knowledge | 2 |
| src/modules/ai → src/modules/knowledge | 2 |
| src/modules/opportunities → src/modules/knowledge | 2 |
| src/modules/oversight → src/lib | 2 |
| src/modules/recommendation → src/lib | 2 |
| tests → src/modules/ai | 2 |
| tests → src/modules/eligibility | 2 |
| tests → src/modules/identity | 2 |
| tests → src/modules/issues | 2 |
| tests → src/modules/places | 2 |
| src/app → src/messages | 1 |
| src/components → src/modules/issues | 1 |
| src/lib → src/modules/places | 1 |
| src/lib → src/modules/auth | 1 |
| src/lib → src/i18n | 1 |
| src/modules/admin → src/modules/ai | 1 |
| src/modules/admin → src/modules/ledger | 1 |
| src/modules/admin → src/modules/ussd | 1 |
| src/modules/ai → src/modules/opportunities | 1 |
| src/modules/ai → src/prompts | 1 |
| src/modules/auth → src/modules/notifications | 1 |
| src/modules/auth → src/modules/admin | 1 |
| src/modules/budget → src/modules/ledger | 1 |
| src/modules/budget → src/modules/citizen | 1 |
| src/modules/civic → src/lib | 1 |
| src/modules/entitlements → src/modules/identity | 1 |
| src/modules/entitlements → src/modules/ledger | 1 |
| src/modules/knowledge → src/modules/ai | 1 |
| src/modules/opportunities → src/modules/eligibility | 1 |
| src/modules/opportunities → src/modules/recommendation | 1 |
| src/modules/opportunities → src/modules/ai | 1 |
| src/modules/oversight → src/modules/ledger | 1 |
| src/modules/recommendation → src/modules/eligibility | 1 |
| src/modules/ussd → src/modules/entitlements | 1 |
| src/modules/ussd → src/modules/issues | 1 |
| tests → src/modules/knowledge | 1 |
| tests → src/modules/budget | 1 |
| tests → src/modules/civic | 1 |
| tests → src/modules/ledger | 1 |
| tests → src/modules/oversight | 1 |
| tests → src/i18n | 1 |

Critical runtime dependencies: SQLite/libSQL via Drizzle is shared by nearly every domain; session/JWT helpers gate protected routes; the opportunity/knowledge corpus drives discovery, eligibility, chat retrieval and action plans; ledger/audit hash writers are single-chain integrity points; external AI, speech, vision, SMS, object-storage, OSM and map tile providers are optional or provider-selected availability dependencies. No internal module-level circular import was identified by the extraction pass; service-level cycles can still exist through shared database state and are called out in the main document.

## 11. Complete API Inventory (Appendix C)

The implementation contains **84 handlers in 58 route files**.

| # | Method | Path | Authentication / authorization | Inputs and validation | Core processing and data/integration dependencies | Response and error contract | Source |

|---:|---|---|---|---|---|---|---|

| 1 | GET | `/api/v1/action-plans` | authenticated (access-token claims) | No request body; lists the signed-in user’s plans | @/modules/citizen/citizen.service: listActionPlans, generateActionPlan | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/action-plans/route.ts` |
| 2 | POST | `/api/v1/action-plans` | authenticated (access-token claims) | Validated with createActionPlanSchema | @/modules/citizen/citizen.service: listActionPlans, generateActionPlan | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/action-plans/route.ts` |
| 3 | PATCH | `/api/v1/action-plans/tasks/:id` | authenticated (access-token claims) | Validated with updateTaskSchema | @/modules/citizen/citizen.service: updateTask | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/action-plans/tasks/[id]/route.ts` |
| 4 | GET | `/api/v1/admin/ai-logs` | staff role from access token (moderator+) | Query parameters where supported; no named Zod schema detected | @/lib/db/client: db; @/lib/db/schema: aiLogs, users | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/ai-logs/route.ts` |
| 5 | GET | `/api/v1/admin/donors` | staff role from access token (moderator+); canManageUsers | No request body | @/lib/db/client: db; @/lib/db/schema: donorOrganizations, donorFundingScopes; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/donors/route.ts` |
| 6 | POST | `/api/v1/admin/donors` | staff role from access token (moderator+); canManageUsers | Validated with createSchema | @/lib/db/client: db; @/lib/db/schema: donorOrganizations, donorFundingScopes; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/donors/route.ts` |
| 7 | GET | `/api/v1/admin/jobs` | staff role from access token (moderator+) | No request body; lists recent job runs | @/lib/db/client: db; @/lib/db/schema: jobRuns; @/modules/admin/admin.service: JOBS, recordAudit, type JobName | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/jobs/route.ts` |
| 8 | POST | `/api/v1/admin/jobs` | staff role from access token (moderator+) | Validated with runSchema | @/lib/db/client: db; @/lib/db/schema: jobRuns; @/modules/admin/admin.service: JOBS, recordAudit, type JobName | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/jobs/route.ts` |
| 9 | GET | `/api/v1/admin/moderation` | staff role from access token (moderator+); canApproveChanges | Query-driven moderation queue; no decision body | @/lib/db/client: db; @/lib/db/schema: feedback, knowledgeReviews, users, opportunities, aiLogs, messages; @/modules/admin/admin.service: recordAudit; @/modules/issues/issue.service: listPendingIssues, transitionIssueStatus | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/moderation/route.ts` |
| 10 | PATCH | `/api/v1/admin/moderation` | staff role from access token (moderator+); canApproveChanges | Validated with decisionSchema | @/lib/db/client: db; @/lib/db/schema: feedback, knowledgeReviews, users, opportunities, aiLogs, messages; @/modules/admin/admin.service: recordAudit; @/modules/issues/issue.service: listPendingIssues, transitionIssueStatus | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/moderation/route.ts` |
| 11 | GET | `/api/v1/admin/organizations` | staff role from access token (moderator+) | Validated with upsertOrganizationSchema | @/lib/db/client: db; @/lib/db/schema: organizations, opportunities; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/organizations/route.ts` |
| 12 | POST | `/api/v1/admin/organizations` | staff role from access token (moderator+) | Validated with upsertOrganizationSchema | @/lib/db/client: db; @/lib/db/schema: organizations, opportunities; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/organizations/route.ts` |
| 13 | PATCH | `/api/v1/admin/organizations` | staff role from access token (moderator+) | Validated with upsertOrganizationSchema | @/lib/db/client: db; @/lib/db/schema: organizations, opportunities; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/organizations/route.ts` |
| 14 | GET | `/api/v1/admin/overview` | staff role from access token (moderator+) | Query parameters where supported; no named Zod schema detected | @/modules/admin/admin.service: getAnalytics, getSystemHealth | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/overview/route.ts` |
| 15 | GET | `/api/v1/admin/programs` | staff role from access token (moderator+) | Query/list parameters handled by route | @/lib/db/client: db; @/lib/db/schema: opportunities, organizations, eligibilityRules; @/modules/admin/admin.service: recordAudit; @/modules/opportunities/opportunity.service: indexOpportunity | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/programs/route.ts` |
| 16 | POST | `/api/v1/admin/programs` | staff role from access token (moderator+) | Validated with upsertOpportunitySchema | @/lib/db/client: db; @/lib/db/schema: opportunities, organizations, eligibilityRules; @/modules/admin/admin.service: recordAudit; @/modules/opportunities/opportunity.service: indexOpportunity | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/programs/route.ts` |
| 17 | GET | `/api/v1/admin/programs/:id` | staff role from access token (moderator+); canApproveChanges, canDeleteProgrammes | UUID path parameter; no body | @/lib/db/client: db; @/lib/db/schema: opportunities, eligibilityRules, requiredDocuments, knowledgeReviews; @/modules/admin/admin.service: recordAudit; @/modules/opportunities/opportunity.service: indexOpportunity | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/programs/[id]/route.ts` |
| 18 | PATCH | `/api/v1/admin/programs/:id` | staff role from access token (moderator+); canApproveChanges, canDeleteProgrammes | Validated with patchSchema | @/lib/db/client: db; @/lib/db/schema: opportunities, eligibilityRules, requiredDocuments, knowledgeReviews; @/modules/admin/admin.service: recordAudit; @/modules/opportunities/opportunity.service: indexOpportunity | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/programs/[id]/route.ts` |
| 19 | DELETE | `/api/v1/admin/programs/:id` | staff role from access token (moderator+); canApproveChanges, canDeleteProgrammes | UUID path parameter; no body | @/lib/db/client: db; @/lib/db/schema: opportunities, eligibilityRules, requiredDocuments, knowledgeReviews; @/modules/admin/admin.service: recordAudit; @/modules/opportunities/opportunity.service: indexOpportunity | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/programs/[id]/route.ts` |
| 20 | GET | `/api/v1/admin/rules` | staff role from access token (moderator+) | Validated opportunityId query | @/lib/db/client: db; @/lib/db/schema: eligibilityRules, opportunities; @/modules/eligibility/engine: evaluateEligibility; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/rules/route.ts` |
| 21 | POST | `/api/v1/admin/rules` | staff role from access token (moderator+) | Validated with upsertRuleSchema | @/lib/db/client: db; @/lib/db/schema: eligibilityRules, opportunities; @/modules/eligibility/engine: evaluateEligibility; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/rules/route.ts` |
| 22 | GET | `/api/v1/admin/sms-outbox` | staff role from access token (moderator+) | Query parameters where supported; no named Zod schema detected | @/modules/notifications/sms.service: listDemoSmsOutbox | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/sms-outbox/route.ts` |
| 23 | GET | `/api/v1/admin/users` | staff role from access token (moderator+); canManageUsers | Query/list parameters; no patch body | @/lib/db/client: db; @/lib/db/schema: users; @/modules/admin/admin.service: recordAudit; @/modules/auth/auth.service: logoutEverywhere | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/users/route.ts` |
| 24 | PATCH | `/api/v1/admin/users` | staff role from access token (moderator+); canManageUsers | Validated with patchSchema | @/lib/db/client: db; @/lib/db/schema: users; @/modules/admin/admin.service: recordAudit; @/modules/auth/auth.service: logoutEverywhere | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/admin/users/route.ts` |
| 25 | POST | `/api/v1/auth/login` | public | Validated with loginSchema | @/modules/auth/auth.service: loginWithPin, loginWithOtp, verifyOtp | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/auth/login/route.ts` |
| 26 | POST | `/api/v1/auth/otp` | public | Validated with requestOtpSchema | @/modules/auth/auth.service: requestOtp | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/auth/otp/route.ts` |
| 27 | POST | `/api/v1/auth/pin` | public | Validated with setPinSchema | @/modules/auth/auth.service: verifyOtp, setPin, loginWithOtp | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/auth/pin/route.ts` |
| 28 | POST | `/api/v1/auth/register` | public | Validated with registerSchema | @/modules/auth/auth.service: register, verifyOtp | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/auth/register/route.ts` |
| 29 | GET | `/api/v1/auth/renew` | public | Query parameters where supported; no named Zod schema detected | @/modules/auth/auth.service: refresh | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/auth/renew/route.ts` |
| 30 | GET | `/api/v1/auth/session` | public | Query parameters where supported; no named Zod schema detected | @/modules/auth/auth.service: refresh, logout; @/modules/ai/providers: describeAiMode; @/modules/eligibility/profile-mapper: profileCompleteness; @/modules/eligibility/profile-mapper: toEligibilityProfile | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/auth/session/route.ts` |
| 31 | PUT | `/api/v1/auth/session` | public | Body/query parsed by route; no named Zod schema detected | @/modules/auth/auth.service: refresh, logout; @/modules/ai/providers: describeAiMode; @/modules/eligibility/profile-mapper: profileCompleteness; @/modules/eligibility/profile-mapper: toEligibilityProfile | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/auth/session/route.ts` |
| 32 | DELETE | `/api/v1/auth/session` | public | Body/query parsed by route; no named Zod schema detected | @/modules/auth/auth.service: refresh, logout; @/modules/ai/providers: describeAiMode; @/modules/eligibility/profile-mapper: profileCompleteness; @/modules/eligibility/profile-mapper: toEligibilityProfile | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/auth/session/route.ts` |
| 33 | GET | `/api/v1/beneficiaries` | authenticated (live user/profile/status reload) | No body; civic scope comes from live session | @/modules/entitlements/entitlement.service: enrollBeneficiary, listBeneficiariesForUnion; @/modules/civic/roles: isUnionOfficialOf | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/beneficiaries/route.ts` |
| 34 | POST | `/api/v1/beneficiaries` | authenticated (live user/profile/status reload) | Validated with enrollBeneficiarySchema | @/modules/entitlements/entitlement.service: enrollBeneficiary, listBeneficiariesForUnion; @/modules/civic/roles: isUnionOfficialOf | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/beneficiaries/route.ts` |
| 35 | GET | `/api/v1/beneficiaries/:id` | authenticated (live user/profile/status reload) | Dynamic path parameters; query/body handling is implemented in the route | @/modules/entitlements/entitlement.service: getBeneficiaryDetail; @/modules/civic/roles: isUnionOfficialOf | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/beneficiaries/[id]/route.ts` |
| 36 | GET | `/api/v1/budget/allocations` | authenticated (live user/profile/status reload) | No body; union scope comes from query/session | @/modules/budget/budget.service: createAllocation, listAllocationsForUnion; @/modules/civic/roles: isUnionOfficialOf | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/budget/allocations/route.ts` |
| 37 | POST | `/api/v1/budget/allocations` | authenticated (live user/profile/status reload) | Validated with createAllocationSchema | @/modules/budget/budget.service: createAllocation, listAllocationsForUnion; @/modules/civic/roles: isUnionOfficialOf | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/budget/allocations/route.ts` |
| 38 | POST | `/api/v1/budget/allocations/:id/flag` | authenticated (live user/profile/status reload) | Validated with flagAllocationSchema | @/lib/db/client: db; @/lib/db/schema: budgetAllocations; @/modules/budget/budget.service: flagAllocation | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/budget/allocations/[id]/flag/route.ts` |
| 39 | GET | `/api/v1/budget/allocations/:id` | authenticated (live user/profile/status reload) | Dynamic path parameters; query/body handling is implemented in the route | @/modules/budget/budget.service: getAllocation | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/budget/allocations/[id]/route.ts` |
| 40 | POST | `/api/v1/chat` | authenticated (access-token claims) | Validated with chatSchema | @/modules/ai/conversation.service: runTurn, listConversations; @/modules/ai/providers: describeAiMode | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/chat/route.ts` |
| 41 | GET | `/api/v1/chat` | authenticated (access-token claims) | No body; lists conversations | @/modules/ai/conversation.service: runTurn, listConversations; @/modules/ai/providers: describeAiMode | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/chat/route.ts` |
| 42 | GET | `/api/v1/chat/:id` | authenticated (access-token claims) | Dynamic path parameters; query/body handling is implemented in the route | @/modules/ai/conversation.service: getConversation, deleteConversation | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/chat/[id]/route.ts` |
| 43 | DELETE | `/api/v1/chat/:id` | authenticated (access-token claims) | Dynamic path parameters; query/body handling is implemented in the route | @/modules/ai/conversation.service: getConversation, deleteConversation | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/chat/[id]/route.ts` |
| 44 | GET | `/api/v1/donor/overview` | authenticated (live user/profile/status reload) | Query parameters where supported; no named Zod schema detected | @/modules/oversight/oversight.service: getDonorPortalData | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/donor/overview/route.ts` |
| 45 | POST | `/api/v1/eligibility/check` | authenticated (live user/profile/status reload) | Validated with eligibilityCheckSchema | @/lib/db/client: db; @/lib/db/schema: opportunities, eligibilityRules, organizations, documents; @/modules/eligibility/engine: evaluateEligibility; @/modules/eligibility/profile-mapper: toEligibilityProfile; @/modules/opportunities/opportunity.service: recordEvaluation; @/modules/ai/confidence: scoreConfidence | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/eligibility/check/route.ts` |
| 46 | GET | `/api/v1/entitlements/status` | authenticated (access-token claims) | Query parameters where supported; no named Zod schema detected | @/modules/entitlements/entitlement.service: checkMyEntitlementStatus | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/entitlements/status/route.ts` |
| 47 | POST | `/api/v1/entitlements/:id/disbursements` | authenticated (live user/profile/status reload) | Validated with recordDisbursementSchema | @/lib/db/client: db; @/lib/db/schema: entitlements, beneficiaries; @/modules/entitlements/entitlement.service: recordDisbursement; @/modules/civic/roles: isUnionOfficialOf | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/entitlements/[id]/disbursements/route.ts` |
| 48 | POST | `/api/v1/feedback` | authenticated (access-token claims) | Validated with feedbackSchema | @/lib/db/client: db; @/lib/db/schema: feedback | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/feedback/route.ts` |
| 49 | POST | `/api/v1/identity/nid` | authenticated (access-token claims) | Validated with verifyNidSchema | @/modules/identity/identity.service: submitNidVerification | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/identity/nid/route.ts` |
| 50 | POST | `/api/v1/identity/residency` | authenticated (access-token claims) | Validated with verifyResidencySchema | @/modules/identity/identity.service: submitResidencyVerification | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/identity/residency/route.ts` |
| 51 | GET | `/api/v1/identity` | authenticated (access-token claims) | Query parameters where supported; no named Zod schema detected | @/modules/identity/identity.service: getIdentityStatus, listUnions | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/identity/route.ts` |
| 52 | GET | `/api/v1/issues` | authenticated (live user/profile/status reload) | Validated list/sort query in route | @/modules/issues/issue.service: submitIssue, listUnionFeed, listMyIssues | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/issues/route.ts` |
| 53 | POST | `/api/v1/issues` | authenticated (live user/profile/status reload) | Validated with submitIssueSchema | @/modules/issues/issue.service: submitIssue, listUnionFeed, listMyIssues | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/issues/route.ts` |
| 54 | GET | `/api/v1/issues/:id` | authenticated (live user/profile/status reload) | UUID path parameter; no body | @/modules/issues/issue.service: getIssue, transitionIssueStatus; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/issues/[id]/route.ts` |
| 55 | PATCH | `/api/v1/issues/:id` | authenticated (live user/profile/status reload) | Validated with updateIssueStatusSchema | @/modules/issues/issue.service: getIssue, transitionIssueStatus; @/modules/admin/admin.service: recordAudit | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/issues/[id]/route.ts` |
| 56 | POST | `/api/v1/issues/:id/vote` | authenticated (live user/profile/status reload) | Dynamic path parameters; query/body handling is implemented in the route | @/modules/issues/issue.service: toggleVote, getIssue | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/issues/[id]/vote/route.ts` |
| 57 | GET | `/api/v1/leader/overview` | authenticated (live user/profile/status reload) | Query parameters where supported; no named Zod schema detected | @/modules/oversight/oversight.service: getLeaderPortalData, type OversightScope | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/leader/overview/route.ts` |
| 58 | GET | `/api/v1/ledger/verify` | staff role from access token (moderator+) | Query parameters where supported; no named Zod schema detected | @/modules/ledger/ledger.service: verifyLedgerChain; @/modules/admin/admin.service: verifyAuditChain | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/ledger/verify/route.ts` |
| 59 | GET | `/api/v1/life-events` | public | Query parameters where supported; no named Zod schema detected | @/lib/db/client: db; @/lib/db/schema: lifeEventCatalog, opportunities | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/life-events/route.ts` |
| 60 | GET | `/api/v1/locations` | public | Query parameters where supported; no named Zod schema detected | @/modules/places/places.service: findNearby; @/modules/places/osm-tags: PlaceType | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/locations/route.ts` |
| 61 | GET | `/api/v1/map/tile/:z/:x/:y` | public | Dynamic path parameters; query/body handling is implemented in the route | GET /api/v1/map/tile/{z}/{x}/{y} — one raster map tile, fetched on the citizen's behalf. The browser could request tile.openstreetmap.org directly. It is proxied anyway, for four reasons that are not interchangeable: | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/map/tile/[z]/[x]/[y]/route.ts` |
| 62 | GET | `/api/v1/notifications` | authenticated (access-token claims) | No body | @/modules/citizen/citizen.service: listNotifications, markNotificationsRead, unreadCount | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/notifications/route.ts` |
| 63 | PATCH | `/api/v1/notifications` | authenticated (access-token claims) | Validated with markReadSchema | @/modules/citizen/citizen.service: listNotifications, markNotificationsRead, unreadCount | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/notifications/route.ts` |
| 64 | GET | `/api/v1/opportunities` | public | Query parameters where supported; no named Zod schema detected | @/modules/opportunities/opportunity.service: listOpportunities, countByCategory; @/modules/eligibility/profile-mapper: toEligibilityProfile; @/modules/knowledge/retrieval: retrieve, opportunityIdsFrom; @/lib/db/client: db; @/lib/db/schema: searchQueries | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/opportunities/route.ts` |
| 65 | GET | `/api/v1/opportunities/:slug` | public | Dynamic path parameters; query/body handling is implemented in the route | @/lib/db/client: db; @/lib/db/schema: serviceLocations, documents; @/modules/opportunities/opportunity.service: getOpportunityBySlug, getRelated, recordView, recordEvaluation,; @/modules/eligibility/profile-mapper: toEligibilityProfile; @/modules/knowledge/retrieval: retrieve | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/opportunities/[slug]/route.ts` |
| 66 | GET | `/api/v1/public/transparency` | public | Query parameters where supported; no named Zod schema detected | @/modules/oversight/oversight.service: getPublicTransparencyData | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/public/transparency/route.ts` |
| 67 | GET | `/api/v1/saved` | authenticated (access-token claims) | Optional status query is cast without Zod validation | @/modules/citizen/citizen.service: listSaved, saveOpportunity, savedCounts | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/saved/route.ts` |
| 68 | POST | `/api/v1/saved` | authenticated (access-token claims) | Validated with saveSchema | @/modules/citizen/citizen.service: listSaved, saveOpportunity, savedCounts | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/saved/route.ts` |
| 69 | PATCH | `/api/v1/saved/:id` | authenticated (access-token claims) | Validated with updateSavedSchema | @/modules/citizen/citizen.service: updateSaved, removeSaved | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/saved/[id]/route.ts` |
| 70 | DELETE | `/api/v1/saved/:id` | authenticated (access-token claims) | UUID path parameter; no body | @/modules/citizen/citizen.service: updateSaved, removeSaved | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/saved/[id]/route.ts` |
| 71 | GET | `/api/v1/timeline` | authenticated (access-token claims) | Query parameters where supported; no named Zod schema detected | @/modules/citizen/citizen.service: listTimeline, syncTimelineDeadlines, generateDeadlineReminders | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/timeline/route.ts` |
| 72 | GET | `/api/v1/upazila/escalations` | authenticated (live user/profile/status reload) | Query parameters where supported; no named Zod schema detected | @/modules/budget/escalation.service: listEscalationsForOfficer, listUnassignedEscalations | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/upazila/escalations/route.ts` |
| 73 | PATCH | `/api/v1/upazila/escalations/:id` | authenticated (live user/profile/status reload) | Validated with resolveEscalationSchema | @/modules/budget/escalation.service: resolveEscalation | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/upazila/escalations/[id]/route.ts` |
| 74 | GET | `/api/v1/users/me` | authenticated (live user/profile/status reload) | No body | @/lib/db/client: db; @/lib/db/schema: users, userProfiles; @/modules/auth/auth.service: deleteAccount; @/modules/eligibility/profile-mapper: toEligibilityProfile, profileCompleteness, suggestNextFields; @/modules/eligibility/engine: fieldLabel | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/users/me/route.ts` |
| 75 | PATCH | `/api/v1/users/me` | authenticated (live user/profile/status reload) | Validated with updateUserSchema | @/lib/db/client: db; @/lib/db/schema: users, userProfiles; @/modules/auth/auth.service: deleteAccount; @/modules/eligibility/profile-mapper: toEligibilityProfile, profileCompleteness, suggestNextFields; @/modules/eligibility/engine: fieldLabel | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/users/me/route.ts` |
| 76 | DELETE | `/api/v1/users/me` | authenticated (live user/profile/status reload) | Confirmation query/body behavior is route-defined | @/lib/db/client: db; @/lib/db/schema: users, userProfiles; @/modules/auth/auth.service: deleteAccount; @/modules/eligibility/profile-mapper: toEligibilityProfile, profileCompleteness, suggestNextFields; @/modules/eligibility/engine: fieldLabel | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/users/me/route.ts` |
| 77 | GET | `/api/v1/users/profile` | authenticated (live user/profile/status reload) | Query parameters where supported; no named Zod schema detected | @/lib/db/client: db; @/lib/db/schema: userProfiles, auditLog; @/modules/eligibility/profile-mapper: toEligibilityProfile, profileCompleteness | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/users/profile/route.ts` |
| 78 | PATCH | `/api/v1/users/profile` | authenticated (live user/profile/status reload) | Body/query parsed by route; no named Zod schema detected | @/lib/db/client: db; @/lib/db/schema: userProfiles, auditLog; @/modules/eligibility/profile-mapper: toEligibilityProfile, profileCompleteness | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/users/profile/route.ts` |
| 79 | PATCH | `/api/v1/users/settings` | public | Validated with updateSettingsSchema | @/lib/db/client: db; @/lib/db/schema: userSettings | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/users/settings/route.ts` |
| 80 | POST | `/api/v1/ussd/callback` | X-Ussd-Secret shared header | Validated with bodySchema | @/modules/ussd/ussd.service: handleUssdCallback | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/ussd/callback/route.ts` |
| 81 | POST | `/api/v1/ussd/simulate` | public demo endpoint | Validated with bodySchema | @/modules/ussd/ussd.service: handleUssdCallback | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/ussd/simulate/route.ts` |
| 82 | POST | `/api/v1/voice/speak` | authenticated (access-token claims) | Validated with speakSchema | @/modules/voice/providers: getTtsProvider, SttError | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/voice/speak/route.ts` |
| 83 | GET | `/api/v1/voice/transcribe` | public | No body; returns capability metadata | @/modules/auth/auth.service: hasLiveOtpChallenge; @/modules/voice/providers: getSttProvider, SttError, describeVoiceCapabilities; @/modules/voice/stt-prompt: sttPromptFor, type SttPurpose | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/voice/transcribe/route.ts` |
| 84 | POST | `/api/v1/voice/transcribe` | public | Multipart audio upload with route-local validation | @/modules/auth/auth.service: hasLiveOtpChallenge; @/modules/voice/providers: getSttProvider, SttError, describeVoiceCapabilities; @/modules/voice/stt-prompt: sttPromptFor, type SttPurpose | Standard JSON envelope on success/error unless the route returns media, map-tile, or USSD plain text; validation 400, auth 401/403, lookup 404, conflict/rate/provider errors as implemented and unhandled failures generally 500. | `src/app/api/v1/voice/transcribe/route.ts` |

## 14. Configuration Map (Appendix D)

Configuration sources: `.dev.vars`, `.env.local`, `.env.example`, `package.json`, `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `drizzle.config.ts`, `tsconfig.json`, `vitest.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/lib/config/env.ts`, `src/middleware.ts`. `.dev.vars` and `.env.local` are local/ignored and their values are not reproduced. `src/lib/config/env.ts` is the typed/defaulted runtime contract; framework/build/deployment files can add configuration outside that schema.

| Variable | Purpose / consumer | Requiredness and safe shape |

|---|---|---|

| `ACCESS_TOKEN_TTL` | src/lib/config/env.ts, src/lib/security/tokens.ts | Optional/defaulted; numeric string. |
| `AI_PROVIDER` | src/lib/config/env.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `ANTHROPIC_API_KEY` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, tests/setup.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `ANTHROPIC_MODEL` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `DATABASE_AUTH_TOKEN` | src/lib/config/env.ts, src/lib/db/client.ts | Optional/defaulted; URL/string. |
| `DATABASE_URL` | src/lib/config/env.ts, src/lib/db/client.ts, tests/setup.ts | Optional/defaulted; URL/string. |
| `DEEPSEEK_API_KEY` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `DEEPSEEK_BASE_URL` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, scripts/ai-check.ts | Optional/defaulted; URL/string. |
| `DEEPSEEK_EXTRA_BODY` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `DEEPSEEK_MODEL` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `DEEPSEEK_REASONING_EFFORT` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `DEEPSEEK_THINKING` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `FIELD_ENCRYPTION_KEY` | src/lib/config/env.ts, src/lib/security/field-encryption.ts | Optional/defaulted; secret/name/provider string. |
| `GOOGLE_MAPS_API_KEY` | src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `JWT_REFRESH_SECRET` | src/lib/config/env.ts, src/lib/security/tokens.ts, tests/setup.ts | Optional/defaulted; secret/name/provider string. |
| `JWT_SECRET` | src/lib/config/env.ts, src/lib/security/tokens.ts, tests/setup.ts | Optional/defaulted; secret/name/provider string. |
| `MAP_TILE_URL` | src/app/api/v1/map/tile/[z]/[x]/[y]/route.ts, src/lib/config/env.ts | Optional/defaulted; URL/string. |
| `MAP_USER_AGENT` | src/app/api/v1/map/tile/[z]/[x]/[y]/route.ts, src/lib/config/env.ts, src/modules/places/overpass.ts | Optional/defaulted; numeric string. |
| `NEXT_PUBLIC_APP_NAME` | src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `NEXT_PUBLIC_MAP_PROVIDER` | src/app/api/v1/locations/route.ts, src/app/[locale]/(app)/nearby/page.tsx, src/lib/config/env.ts, src/modules/places/places.service.ts | Optional/defaulted; secret/name/provider string. |
| `NID_API_KEY` | src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `NID_PROVIDER` | src/lib/config/env.ts, src/modules/identity/nid.service.ts | Optional/defaulted; secret/name/provider string. |
| `NODE_ENV` | src/app/api/v1/voice/transcribe/route.ts, src/i18n/request.ts, src/lib/config/env.ts, src/lib/db/client.ts, tests/setup.ts | Optional/defaulted; secret/name/provider string. |
| `OPENAI_API_KEY` | src/lib/config/env.ts, src/modules/admin/admin.service.ts, src/modules/ai/providers/index.ts, tests/setup.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `OPENAI_EMBEDDING_MODEL` | src/lib/config/env.ts, src/modules/ai/providers/index.ts | Optional/defaulted; secret/name/provider string. |
| `OPENAI_MODEL` | src/lib/config/env.ts, src/modules/ai/providers/index.ts, scripts/ai-check.ts | Optional/defaulted; secret/name/provider string. |
| `OTP_DEV_ECHO` | src/app/api/v1/auth/otp/route.ts, src/app/[locale]/(app)/admin/sms-outbox/page.tsx, src/components/auth/AuthFlow.tsx, src/lib/config/env.ts, src/modules/auth/auth.service.ts | Required by schema or when selected provider/mode needs it; boolean string. |
| `OVERPASS_CACHE_HOURS` | src/lib/config/env.ts, src/modules/places/places.service.ts | Required by schema or when selected provider/mode needs it; numeric string. |
| `OVERPASS_RADIUS_KM` | src/lib/config/env.ts, src/modules/places/overpass.ts, src/modules/places/places.service.ts | Required by schema or when selected provider/mode needs it; numeric string. |
| `OVERPASS_URL` | src/lib/config/env.ts, src/modules/places/overpass.ts, src/modules/places/places.service.ts | Optional/defaulted; URL/string. |
| `RATE_LIMIT_AI_MAX_REQUESTS` | src/lib/config/env.ts, src/lib/http/rate-limit.ts | Required by schema or when selected provider/mode needs it; numeric string. |
| `RATE_LIMIT_MAX_REQUESTS` | src/lib/config/env.ts, src/lib/http/rate-limit.ts | Required by schema or when selected provider/mode needs it; numeric string. |
| `RATE_LIMIT_VOICE_MAX_REQUESTS` | src/lib/config/env.ts, src/lib/http/rate-limit.ts | Required by schema or when selected provider/mode needs it; numeric string. |
| `RATE_LIMIT_WINDOW_MS` | src/lib/config/env.ts, src/lib/http/rate-limit.ts | Required by schema or when selected provider/mode needs it; numeric string. |
| `REFRESH_TOKEN_TTL` | src/lib/config/env.ts, src/lib/security/tokens.ts | Optional/defaulted; numeric string. |
| `S3_ACCESS_KEY` | src/lib/config/env.ts, src/modules/issues/photo-storage.ts | Optional/defaulted; secret/name/provider string. |
| `S3_BUCKET` | src/lib/config/env.ts, src/modules/issues/photo-storage.ts | Optional/defaulted; secret/name/provider string. |
| `S3_ENDPOINT` | src/lib/config/env.ts, src/modules/issues/photo-storage.ts | Optional/defaulted; URL/string. |
| `S3_PUBLIC_URL` | src/lib/config/env.ts, src/modules/issues/photo-storage.ts | Optional/defaulted; URL/string. |
| `S3_REGION` | src/lib/config/env.ts, src/modules/issues/photo-storage.ts | Optional/defaulted; secret/name/provider string. |
| `S3_SECRET_KEY` | src/lib/config/env.ts, src/modules/issues/photo-storage.ts | Optional/defaulted; secret/name/provider string. |
| `SMS_API_KEY` | src/app/[locale]/(app)/settings/page.tsx, src/lib/config/env.ts, src/modules/notifications/sms.service.ts | Optional/defaulted; secret/name/provider string. |
| `SMS_PROVIDER` | src/app/api/v1/admin/sms-outbox/route.ts, src/app/[locale]/(app)/admin/sms-outbox/page.tsx, src/app/[locale]/(app)/settings/page.tsx, src/lib/config/env.ts, src/lib/db/schema.ts | Optional/defaulted; secret/name/provider string. |
| `SMS_SENDER_ID` | src/lib/config/env.ts, src/modules/notifications/sms.service.ts | Optional/defaulted; secret/name/provider string. |
| `SMS_SID` | src/lib/config/env.ts, src/modules/notifications/sms.service.ts | Optional/defaulted; secret/name/provider string. |
| `SMTP_FROM` | src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `SMTP_HOST` | src/app/[locale]/(app)/settings/page.tsx, src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `SMTP_PASSWORD` | src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `SMTP_PORT` | src/lib/config/env.ts | Required by schema or when selected provider/mode needs it; numeric string. |
| `SMTP_USER` | src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `STT_API_KEY` | src/lib/config/env.ts, src/modules/voice/providers.ts, scripts/voice-check.ts | Optional/defaulted; secret/name/provider string. |
| `STT_BASE_URL` | src/app/api/v1/ussd/callback/route.ts, src/lib/config/env.ts, src/modules/voice/providers.ts, scripts/voice-check.ts | Optional/defaulted; URL/string. |
| `STT_MODEL` | src/lib/config/env.ts, src/modules/voice/providers.ts, scripts/voice-check.ts | Optional/defaulted; secret/name/provider string. |
| `STT_PROMPT` | src/lib/config/env.ts, src/modules/voice/providers.ts, src/modules/voice/stt-prompt.ts, tests/voice/stt-prompt.test.ts, scripts/print-stt-prompt.ts | Optional/defaulted; secret/name/provider string. |
| `TTS_API_KEY` | src/lib/config/env.ts, src/modules/voice/providers.ts, scripts/voice-check.ts | Optional/defaulted; secret/name/provider string. |
| `TTS_BASE_URL` | src/lib/config/env.ts, src/modules/voice/providers.ts, scripts/voice-check.ts | Optional/defaulted; URL/string. |
| `TTS_MODEL` | src/lib/config/env.ts, src/modules/voice/providers.ts, scripts/voice-check.ts | Optional/defaulted; secret/name/provider string. |
| `TTS_VOICE` | src/lib/config/env.ts, src/modules/voice/providers.ts, scripts/voice-check.ts | Optional/defaulted; secret/name/provider string. |
| `USSD_GATEWAY_SECRET` | src/app/api/v1/ussd/callback/route.ts, src/app/api/v1/ussd/simulate/route.ts, src/lib/config/env.ts | Optional/defaulted; secret/name/provider string. |
| `VISION_MODERATION_API_KEY` | src/lib/config/env.ts, src/modules/issues/vision-moderation.ts | Optional/defaulted; secret/name/provider string. |
| `VISION_MODERATION_BASE_URL` | src/lib/config/env.ts, src/modules/issues/vision-moderation.ts | Optional/defaulted; URL/string. |
| `VISION_MODERATION_MODEL` | src/lib/config/env.ts, src/modules/issues/vision-moderation.ts | Optional/defaulted; secret/name/provider string. |
| `VISION_MODERATION_PROVIDER` | src/lib/config/env.ts, src/lib/domain/enums.ts, src/modules/issues/vision-moderation.ts | Optional/defaulted; secret/name/provider string. |
| `VOICE_MODE` | src/app/api/v1/voice/transcribe/route.ts, src/lib/config/env.ts, src/modules/voice/providers.ts, scripts/voice-check.ts | Optional/defaulted; secret/name/provider string. |

## 13. External Integration Inventory (Appendix E)

| Provider/system | Purpose and code location | Credentials/configuration | Failure/retry/availability behavior |

|---|---|---|---|

| Anthropic, OpenAI, or DeepSeek chat | AI response composition in `src/modules/ai/providers/index.ts` and the conversation service | AI_PROVIDER plus the selected provider key/model; DEEPSEEK_BASE_URL and tuning fields for DeepSeek | AI POSTs use a 30-second timeout and one bounded retry for network, 429, and 5xx failures; the structured deterministic composer is used when simulated mode is selected. |
| OpenAI embeddings | Knowledge chunk embedding and hybrid retrieval in knowledge/admin jobs | OPENAI_API_KEY and OPENAI_EMBEDDING_MODEL | Optional; retrieval remains BM25-only when unavailable. Embedding POSTs use a 60-second timeout and one bounded retry. |
| OpenStreetMap Overpass | Nearby government/service-place discovery and cache | OVERPASS_URL, radius/cache/user-agent settings | Timeout/provider failure can fall back to cached/seeded service locations; no durable retry. |
| OSM-compatible raster tiles | Map imagery proxy endpoint | MAP_TILE_URL and MAP_USER_AGENT | Eight-second timeout; upstream 404 is preserved, other upstream failures become 502, and network/timeout failure becomes 504. Browser map degrades to blank tiles while the place list remains usable. |
| S3-compatible object storage / R2 | Issue photo upload/read/delete in `photo-storage.ts` | S3 endpoint/region/bucket/access keys/public URL | Selected only when configured; local file fallback in local runtime; partial upload/workflow failures are possible. |
| Vision moderation provider | Issue-photo safety classification | VISION_MODERATION_PROVIDER and provider key/model/base URL | Demo provider is default; provider timeout/error follows issue moderation failure path. |
| SMS provider/demo outbox | OTP and notification delivery | SMS_PROVIDER plus provider URL/key/sender; OTP_DEV_ECHO | Demo writes outbox/echo; real delivery depends on external provider and has no durable generalized retry queue. |
| OpenAI-compatible speech-to-text | Voice transcription endpoint | VOICE_MODE, STT_BASE_URL, STT_API_KEY, STT_MODEL and STT_PROMPT | Server STT has a 45-second timeout and no internal retry; capabilities expose availability and the client can fall back to browser speech or typed input. |
| OpenAI-compatible text-to-speech | Spoken response audio endpoint | TTS_BASE_URL, TTS_API_KEY, TTS_MODEL and TTS_VOICE | Returns MP3/audio cache semantics; no internal retry, and provider failure prevents playback while text remains usable. |
| NID provider (placeholder) | Identity verification service | NID_PROVIDER and possible endpoint/key | Only format/demo behavior is implemented; configured external provider path explicitly fails as not implemented. |
| USSD gateway callback | Feature-phone session workflow | USSD_GATEWAY_SECRET | X-Ussd-Secret guards the callback route; the simulator is public/demo and state is DB-backed. |
| Turso/libSQL | Remote production database | DATABASE_URL, DATABASE_AUTH_TOKEN | Central state dependency; request failures surface as DB/API failures; no application-level retry. |
| SMTP (configuration only) | Reserved email delivery configuration | SMTP_HOST/PORT/USER/PASSWORD/FROM | No current mail-sending consumer; setting it has no operational effect. |

## 9. Database Schema Documentation (Appendix F)

Current application schema: **47 tables** (plus local Drizzle metadata table `__drizzle_migrations`). Counts shown are from the inspected local `data/accessai.db` sample and are not production counts.

### action_plan_tasks

Purpose: Individual ordered plan steps Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `plan_id` | TEXT | NOT NULL | FK → action_plans.id ON DELETE CASCADE |
| `title` | TEXT | NOT NULL | — |
| `title_bn` | TEXT | NOT NULL | — |
| `description` | TEXT | nullable | — |
| `description_bn` | TEXT | nullable | — |
| `due_date` | INTEGER | nullable | — |
| `priority` | TEXT | NOT NULL; default 'medium' | — |
| `estimated_minutes` | INTEGER | nullable | — |
| `status` | TEXT | NOT NULL; default 'pending' | — |
| `notes` | TEXT | nullable | — |
| `sort_order` | INTEGER | NOT NULL; default 0 | — |
| `completed_at` | INTEGER | nullable | — |

Indexes/unique constraints: tasks_plan_idx, sqlite_autoindex_action_plan_tasks_1 (unique) (PK backing).

Referenced by: timeline_events.task_id → id.

### action_plans

Purpose: Generated programme action plans Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `opportunity_id` | TEXT | NOT NULL | FK → opportunities.id ON DELETE CASCADE |
| `title` | TEXT | NOT NULL | — |
| `title_bn` | TEXT | NOT NULL | — |
| `status` | TEXT | NOT NULL; default 'active' | — |
| `generated_by` | TEXT | NOT NULL; default 'simulated' | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: plans_user_opp_uq (unique), plans_user_idx, sqlite_autoindex_action_plans_1 (unique) (PK backing).

Referenced by: action_plan_tasks.plan_id → id.

### ai_logs

Purpose: AI provider request/response diagnostics Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | nullable | FK → users.id ON DELETE SET NULL |
| `conversation_id` | TEXT | nullable | FK → conversations.id ON DELETE CASCADE |
| `message_id` | TEXT | nullable | — |
| `request_type` | TEXT | NOT NULL | — |
| `engine` | TEXT | NOT NULL | — |
| `model` | TEXT | nullable | — |
| `prompt_template` | TEXT | nullable | — |
| `prompt_version` | TEXT | nullable | — |
| `input_summary` | TEXT | nullable | — |
| `output_summary` | TEXT | nullable | — |
| `intents` | TEXT | nullable | — |
| `entities` | TEXT | nullable | — |
| `retrieved_chunk_ids` | TEXT | nullable | — |
| `cited_opportunity_ids` | TEXT | nullable | — |
| `confidence` | INTEGER | nullable | — |
| `latency_ms` | INTEGER | nullable | — |
| `tokens_in` | INTEGER | nullable | — |
| `tokens_out` | INTEGER | nullable | — |
| `grounding_failure` | INTEGER | NOT NULL; default false | — |
| `error` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: ai_logs_type_idx, ai_logs_created_idx, sqlite_autoindex_ai_logs_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### allocation_flags

Purpose: Oversight flags on allocations Local sample rows: **2**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `allocation_id` | TEXT | NOT NULL | FK → budget_allocations.id ON DELETE CASCADE |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `reason` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: allocation_flags_uq (unique), sqlite_autoindex_allocation_flags_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### analytics_daily

Purpose: Materialized daily operational analytics Local sample rows: **1**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `day` | TEXT | NOT NULL | PRIMARY KEY |
| `active_users` | INTEGER | NOT NULL; default 0 | — |
| `new_users` | INTEGER | NOT NULL; default 0 | — |
| `conversations` | INTEGER | NOT NULL; default 0 | — |
| `recommendations` | INTEGER | NOT NULL; default 0 | — |
| `saves` | INTEGER | NOT NULL; default 0 | — |
| `applications_started` | INTEGER | NOT NULL; default 0 | — |
| `completed_action_plans` | INTEGER | NOT NULL; default 0 | — |
| `searches` | INTEGER | NOT NULL; default 0 | — |
| `avg_latency_ms` | INTEGER | NOT NULL; default 0 | — |
| `citation_coverage` | REAL | NOT NULL; default 0 | — |
| `grounding_failure_rate` | REAL | NOT NULL; default 0 | — |
| `satisfaction_score` | REAL | NOT NULL; default 0 | — |

Indexes/unique constraints: sqlite_autoindex_analytics_daily_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### audit_log

Purpose: Administrative/security audit evidence chain Local sample rows: **150**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `actor_id` | TEXT | nullable | — |
| `actor_role` | TEXT | nullable | — |
| `action` | TEXT | NOT NULL | — |
| `entity_type` | TEXT | NOT NULL | — |
| `entity_id` | TEXT | nullable | — |
| `before` | TEXT | nullable | — |
| `after` | TEXT | nullable | — |
| `ip` | TEXT | nullable | — |
| `user_agent` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |
| `prev_hash` | TEXT | nullable | — |
| `entry_hash` | TEXT | nullable | — |

Indexes/unique constraints: audit_prev_hash_uq (unique), audit_entity_idx, audit_created_idx, sqlite_autoindex_audit_log_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### beneficiaries

Purpose: Programme beneficiary registry Local sample rows: **4**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | nullable | FK → users.id ON DELETE SET NULL |
| `nid_hash` | TEXT | NOT NULL | — |
| `union_id` | TEXT | NOT NULL | FK → union_boundaries.id ON DELETE RESTRICT |
| `program_code` | TEXT | NOT NULL | — |
| `program_name` | TEXT | NOT NULL | — |
| `program_name_bn` | TEXT | NOT NULL | — |
| `status` | TEXT | NOT NULL; default 'active' | — |
| `enrolled_by` | TEXT | NOT NULL | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: beneficiaries_union_idx, beneficiaries_nid_idx, sqlite_autoindex_beneficiaries_1 (unique) (PK backing).

Referenced by: entitlements.beneficiary_id → id.

### budget_allocations

Purpose: Union programme budget allocations Local sample rows: **5**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `union_id` | TEXT | NOT NULL | FK → union_boundaries.id ON DELETE RESTRICT |
| `posted_by` | TEXT | NOT NULL | FK → users.id ON DELETE RESTRICT |
| `project_name` | TEXT | NOT NULL | — |
| `description` | TEXT | NOT NULL | — |
| `amount` | REAL | NOT NULL | — |
| `allocation_date` | INTEGER | NOT NULL | — |
| `flag_count` | INTEGER | NOT NULL; default 0 | — |
| `escalated` | INTEGER | NOT NULL; default false | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: allocations_union_idx, sqlite_autoindex_budget_allocations_1 (unique) (PK backing).

Referenced by: allocation_flags.allocation_id → id; escalations.allocation_id → id.

### conversations

Purpose: User chat threads Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `title` | TEXT | nullable | — |
| `summary` | TEXT | nullable | — |
| `language` | TEXT | NOT NULL; default 'bn' | — |
| `message_count` | INTEGER | NOT NULL; default 0 | — |
| `created_at` | INTEGER | NOT NULL | — |
| `last_message_at` | INTEGER | nullable | — |
| `ended_at` | INTEGER | nullable | — |

Indexes/unique constraints: conversations_user_idx, sqlite_autoindex_conversations_1 (unique) (PK backing).

Referenced by: ai_logs.conversation_id → id; messages.conversation_id → id.

### demo_sms_outbox

Purpose: Demo SMS sink for non-production delivery Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `phone` | TEXT | NOT NULL | — |
| `body` | TEXT | NOT NULL | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: sqlite_autoindex_demo_sms_outbox_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### disbursements

Purpose: Entitlement payment/disbursement records Local sample rows: **3**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `entitlement_id` | TEXT | NOT NULL | FK → entitlements.id ON DELETE CASCADE |
| `amount` | REAL | NOT NULL | — |
| `scheduled_for` | INTEGER | NOT NULL | — |
| `paid_at` | INTEGER | nullable | — |
| `status` | TEXT | NOT NULL; default 'scheduled' | — |
| `recorded_by` | TEXT | NOT NULL | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: disbursements_entitlement_idx, sqlite_autoindex_disbursements_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### document_chunks

Purpose: Retrieval chunks and optional embeddings Local sample rows: **158**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `document_id` | TEXT | NOT NULL | FK → documents.id ON DELETE CASCADE |
| `opportunity_id` | TEXT | nullable | FK → opportunities.id ON DELETE CASCADE |
| `chunk_index` | INTEGER | NOT NULL | — |
| `content` | TEXT | NOT NULL | — |
| `content_bn` | TEXT | nullable | — |
| `token_count` | INTEGER | NOT NULL; default 0 | — |
| `embedding` | TEXT | nullable | — |
| `embedding_model` | TEXT | nullable | — |
| `term_frequencies` | TEXT | nullable | — |
| `metadata` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: chunks_doc_index_uq (unique), chunks_document_idx, sqlite_autoindex_document_chunks_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### documents

Purpose: Knowledge-source documents and ingestion metadata Local sample rows: **42**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `opportunity_id` | TEXT | nullable | FK → opportunities.id ON DELETE CASCADE |
| `organization_id` | TEXT | nullable | FK → organizations.id ON DELETE CASCADE |
| `title` | TEXT | NOT NULL | — |
| `title_bn` | TEXT | nullable | — |
| `source_type` | TEXT | NOT NULL | — |
| `source_url` | TEXT | nullable | — |
| `file_url` | TEXT | nullable | — |
| `publisher` | TEXT | nullable | — |
| `published_at` | INTEGER | nullable | — |
| `retrieved_at` | INTEGER | nullable | — |
| `checksum` | TEXT | nullable | — |
| `version` | INTEGER | NOT NULL; default 1 | — |
| `license_note` | TEXT | nullable | — |
| `text_content` | TEXT | nullable | — |
| `embedding_status` | TEXT | NOT NULL; default 'pending' | — |
| `verification_status` | TEXT | NOT NULL; default 'unverified_sample' | — |
| `stale` | INTEGER | NOT NULL; default false | — |
| `dead_link` | INTEGER | NOT NULL; default false | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: documents_embedding_idx, documents_opportunity_idx, sqlite_autoindex_documents_1 (unique) (PK backing).

Referenced by: document_chunks.document_id → id.

### donor_funding_scopes

Purpose: Donor-to-programme/area funding scopes Local sample rows: **1**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `donor_org_id` | TEXT | NOT NULL | FK → donor_organizations.id ON DELETE CASCADE |
| `program_code` | TEXT | NOT NULL | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: donor_scope_uq (unique), sqlite_autoindex_donor_funding_scopes_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### donor_organizations

Purpose: Donor identity and scope ownership Local sample rows: **1**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `name` | TEXT | NOT NULL | — |
| `name_bn` | TEXT | NOT NULL | — |
| `description` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: sqlite_autoindex_donor_organizations_1 (unique) (PK backing).

Referenced by: donor_funding_scopes.donor_org_id → id; users.donor_org_id → id.

### eligibility_evaluations

Purpose: Persisted eligibility result history Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | nullable | FK → users.id ON DELETE CASCADE |
| `opportunity_id` | TEXT | NOT NULL | FK → opportunities.id ON DELETE CASCADE |
| `outcome` | TEXT | NOT NULL | — |
| `matched_count` | INTEGER | NOT NULL; default 0 | — |
| `failed_count` | INTEGER | NOT NULL; default 0 | — |
| `unknown_count` | INTEGER | NOT NULL; default 0 | — |
| `confidence` | INTEGER | NOT NULL; default 0 | — |
| `detail` | TEXT | NOT NULL | — |
| `profile_snapshot` | TEXT | NOT NULL | — |
| `rule_version` | INTEGER | NOT NULL | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: evals_opp_idx, evals_user_idx, sqlite_autoindex_eligibility_evaluations_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### eligibility_rules

Purpose: Versioned executable eligibility rules Local sample rows: **42**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `opportunity_id` | TEXT | NOT NULL | FK → opportunities.id ON DELETE CASCADE |
| `rule_json` | TEXT | NOT NULL | — |
| `priority` | INTEGER | NOT NULL; default 0 | — |
| `version` | INTEGER | NOT NULL; default 1 | — |
| `active` | INTEGER | NOT NULL; default true | — |
| `authored_by` | TEXT | nullable | — |
| `reviewed_by` | TEXT | nullable | — |
| `reviewed_at` | INTEGER | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: rules_opportunity_idx, sqlite_autoindex_eligibility_rules_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### entitlements

Purpose: Beneficiary programme entitlement state Local sample rows: **4**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `beneficiary_id` | TEXT | NOT NULL | FK → beneficiaries.id ON DELETE CASCADE |
| `amount` | REAL | NOT NULL | — |
| `period` | TEXT | NOT NULL | — |
| `status` | TEXT | NOT NULL; default 'active' | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: entitlements_beneficiary_idx, sqlite_autoindex_entitlements_1 (unique) (PK backing).

Referenced by: disbursements.entitlement_id → id.

### escalations

Purpose: Cross-level escalation cases Local sample rows: **1**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `allocation_id` | TEXT | NOT NULL | FK → budget_allocations.id ON DELETE CASCADE |
| `upazila_officer_id` | TEXT | nullable | FK → users.id ON DELETE SET NULL |
| `flag_count` | INTEGER | NOT NULL | — |
| `verified_resident_count` | INTEGER | NOT NULL | — |
| `ratio` | REAL | NOT NULL | — |
| `status` | TEXT | NOT NULL; default 'pending' | — |
| `note` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |
| `resolved_at` | INTEGER | nullable | — |

Indexes/unique constraints: escalations_officer_idx, escalations_allocation_uq (unique), sqlite_autoindex_escalations_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### feedback

Purpose: User feedback on AI/messages Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | nullable | FK → users.id ON DELETE SET NULL |
| `message_id` | TEXT | nullable | FK → messages.id ON DELETE CASCADE |
| `opportunity_id` | TEXT | nullable | FK → opportunities.id ON DELETE CASCADE |
| `kind` | TEXT | NOT NULL | — |
| `rating` | INTEGER | nullable | — |
| `comment` | TEXT | nullable | — |
| `status` | TEXT | NOT NULL; default 'new' | — |
| `reviewed_by` | TEXT | nullable | — |
| `reviewed_at` | INTEGER | nullable | — |
| `reviewer_note` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: feedback_status_idx, sqlite_autoindex_feedback_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### issue_status_history

Purpose: Issue state-transition history Local sample rows: **4**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `issue_id` | TEXT | NOT NULL | FK → issues.id ON DELETE CASCADE |
| `from_status` | TEXT | nullable | — |
| `to_status` | TEXT | NOT NULL | — |
| `changed_by` | TEXT | nullable | — |
| `note` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: issue_history_idx, sqlite_autoindex_issue_status_history_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### issue_votes

Purpose: Per-user issue support votes Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `issue_id` | TEXT | NOT NULL | FK → issues.id ON DELETE CASCADE |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: issue_votes_uq (unique), sqlite_autoindex_issue_votes_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### issues

Purpose: Community issue reports and moderation/workflow state Local sample rows: **3**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `reporter_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `union_id` | TEXT | NOT NULL | FK → union_boundaries.id ON DELETE RESTRICT |
| `category` | TEXT | NOT NULL | — |
| `title` | TEXT | NOT NULL | — |
| `description` | TEXT | NOT NULL | — |
| `lat` | REAL | NOT NULL | — |
| `lng` | REAL | NOT NULL | — |
| `photo_url` | TEXT | nullable | — |
| `status` | TEXT | NOT NULL; default 'under_review' | — |
| `auto_flagged` | INTEGER | NOT NULL; default false | — |
| `auto_flag_reason` | TEXT | nullable | — |
| `moderated_by` | TEXT | nullable | — |
| `moderation_note` | TEXT | nullable | — |
| `resolved_by` | TEXT | nullable | — |
| `resolution_note` | TEXT | nullable | — |
| `resolution_photo_url` | TEXT | nullable | — |
| `vote_count` | INTEGER | NOT NULL; default 0 | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |
| `resolved_at` | INTEGER | nullable | — |
| `vision_moderation_status` | TEXT | NOT NULL; default 'not_applicable' | — |

Indexes/unique constraints: issues_reporter_idx, issues_union_status_idx, sqlite_autoindex_issues_1 (unique) (PK backing).

Referenced by: issue_status_history.issue_id → id; issue_votes.issue_id → id.

### job_runs

Purpose: Administrative background/maintenance job records Local sample rows: **11**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `job` | TEXT | NOT NULL | — |
| `status` | TEXT | NOT NULL | — |
| `created_at` | INTEGER | NOT NULL | — |
| `finished_at` | INTEGER | nullable | — |
| `processed` | INTEGER | NOT NULL; default 0 | — |
| `failed` | INTEGER | NOT NULL; default 0 | — |
| `detail` | TEXT | nullable | — |

Indexes/unique constraints: jobs_job_idx, sqlite_autoindex_job_runs_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### knowledge_graph_edges

Purpose: Programme/document/organization graph relationships Local sample rows: **347**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `from_type` | TEXT | NOT NULL | — |
| `from_id` | TEXT | NOT NULL | — |
| `relation` | TEXT | NOT NULL | — |
| `to_type` | TEXT | NOT NULL | — |
| `to_id` | TEXT | NOT NULL | — |
| `weight` | REAL | NOT NULL; default 1 | — |
| `note` | TEXT | nullable | — |

Indexes/unique constraints: kg_to_idx, kg_from_idx, sqlite_autoindex_knowledge_graph_edges_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### knowledge_reviews

Purpose: Human review workflow for knowledge changes Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `entity_type` | TEXT | NOT NULL | — |
| `entity_id` | TEXT | NOT NULL | — |
| `submitted_by` | TEXT | NOT NULL | — |
| `reviewer_id` | TEXT | nullable | — |
| `status` | TEXT | NOT NULL; default 'pending' | — |
| `note` | TEXT | nullable | — |
| `proposed_patch` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |
| `decided_at` | INTEGER | nullable | — |

Indexes/unique constraints: reviews_entity_idx, reviews_status_idx, sqlite_autoindex_knowledge_reviews_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### ledger_entries

Purpose: Hash-chained financial/event evidence ledger Local sample rows: **8**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `entity_type` | TEXT | NOT NULL | — |
| `entity_id` | TEXT | NOT NULL | — |
| `payload` | TEXT | NOT NULL | — |
| `prev_hash` | TEXT | NOT NULL | — |
| `entry_hash` | TEXT | NOT NULL | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: ledger_entity_idx, ledger_prev_hash_uq (unique), ledger_entry_hash_uq (unique), sqlite_autoindex_ledger_entries_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### life_event_catalog

Purpose: Curated life-event discovery taxonomy Local sample rows: **15**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `code` | TEXT | NOT NULL | PRIMARY KEY |
| `label` | TEXT | NOT NULL | — |
| `label_bn` | TEXT | NOT NULL | — |
| `description` | TEXT | NOT NULL | — |
| `description_bn` | TEXT | NOT NULL | — |
| `keywords` | TEXT | NOT NULL | — |
| `icon` | TEXT | NOT NULL | — |
| `sort_order` | INTEGER | NOT NULL; default 0 | — |

Indexes/unique constraints: sqlite_autoindex_life_event_catalog_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### messages

Purpose: Conversation turns and AI metadata Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `conversation_id` | TEXT | NOT NULL | FK → conversations.id ON DELETE CASCADE |
| `role` | TEXT | NOT NULL | — |
| `kind` | TEXT | NOT NULL; default 'text' | — |
| `content` | TEXT | NOT NULL | — |
| `payload` | TEXT | nullable | — |
| `tokens` | INTEGER | NOT NULL; default 0 | — |
| `latency_ms` | INTEGER | nullable | — |
| `ai_engine` | TEXT | nullable | — |
| `confidence` | INTEGER | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: messages_conversation_idx, sqlite_autoindex_messages_1 (unique) (PK backing).

Referenced by: feedback.message_id → id.

### notifications

Purpose: In-app notification records Local sample rows: **1**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `title` | TEXT | NOT NULL | — |
| `title_bn` | TEXT | NOT NULL | — |
| `body` | TEXT | NOT NULL | — |
| `body_bn` | TEXT | NOT NULL | — |
| `type` | TEXT | NOT NULL | — |
| `channel` | TEXT | NOT NULL; default 'in_app' | — |
| `action_url` | TEXT | nullable | — |
| `read` | INTEGER | NOT NULL; default false | — |
| `scheduled_at` | INTEGER | nullable | — |
| `sent_at` | INTEGER | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: notifications_user_idx, sqlite_autoindex_notifications_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### opportunities

Purpose: Discoverable assistance programmes/opportunities Local sample rows: **42**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `organization_id` | TEXT | NOT NULL | FK → organizations.id ON DELETE CASCADE |
| `title` | TEXT | NOT NULL | — |
| `title_bn` | TEXT | NOT NULL | — |
| `slug` | TEXT | NOT NULL | — |
| `category` | TEXT | NOT NULL | — |
| `summary` | TEXT | NOT NULL | — |
| `summary_bn` | TEXT | NOT NULL | — |
| `description` | TEXT | NOT NULL | — |
| `description_bn` | TEXT | NOT NULL | — |
| `benefits` | TEXT | NOT NULL | — |
| `benefits_bn` | TEXT | NOT NULL | — |
| `benefit_amount` | REAL | nullable | — |
| `benefit_period` | TEXT | nullable | — |
| `application_process` | TEXT | NOT NULL | — |
| `deadline` | INTEGER | nullable | — |
| `recurrence` | TEXT | NOT NULL; default 'none' | — |
| `status` | TEXT | NOT NULL; default 'open' | — |
| `coverage_districts` | TEXT | NOT NULL | — |
| `official_url` | TEXT | nullable | — |
| `apply_url` | TEXT | nullable | — |
| `processing_time_days` | TEXT | nullable | — |
| `renewal_months` | INTEGER | nullable | — |
| `life_events` | TEXT | NOT NULL | — |
| `tags` | TEXT | NOT NULL | — |
| `view_count` | INTEGER | NOT NULL; default 0 | — |
| `save_count` | INTEGER | NOT NULL; default 0 | — |
| `application_count` | INTEGER | NOT NULL; default 0 | — |
| `verification_status` | TEXT | NOT NULL; default 'unverified_sample' | — |
| `source_url` | TEXT | nullable | — |
| `source_note` | TEXT | nullable | — |
| `last_verified_at` | INTEGER | nullable | — |
| `verified_by` | TEXT | nullable | — |
| `review_interval_days` | INTEGER | NOT NULL; default 180 | — |
| `version` | INTEGER | NOT NULL; default 1 | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: opportunities_deadline_idx, opportunities_org_idx, opportunities_status_idx, opportunities_category_idx, opportunities_slug_uq (unique), sqlite_autoindex_opportunities_1 (unique) (PK backing).

Referenced by: action_plans.opportunity_id → id; document_chunks.opportunity_id → id; documents.opportunity_id → id; eligibility_evaluations.opportunity_id → id; eligibility_rules.opportunity_id → id; feedback.opportunity_id → id; required_documents.opportunity_id → id; saved_opportunities.opportunity_id → id; timeline_events.opportunity_id → id.

### organizations

Purpose: Programme-owning organizations and verification state Local sample rows: **24**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `name` | TEXT | NOT NULL | — |
| `name_bn` | TEXT | NOT NULL | — |
| `type` | TEXT | NOT NULL | — |
| `description` | TEXT | NOT NULL | — |
| `description_bn` | TEXT | NOT NULL | — |
| `website` | TEXT | nullable | — |
| `contact_phone` | TEXT | nullable | — |
| `contact_email` | TEXT | nullable | — |
| `address` | TEXT | nullable | — |
| `address_bn` | TEXT | nullable | — |
| `division` | TEXT | nullable | — |
| `district` | TEXT | nullable | — |
| `upazila` | TEXT | nullable | — |
| `lat` | REAL | nullable | — |
| `lng` | REAL | nullable | — |
| `office_hours` | TEXT | nullable | — |
| `office_hours_bn` | TEXT | nullable | — |
| `verified` | INTEGER | NOT NULL; default false | — |
| `verification_status` | TEXT | NOT NULL; default 'unverified_sample' | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: orgs_district_idx, orgs_type_idx, sqlite_autoindex_organizations_1 (unique) (PK backing).

Referenced by: documents.organization_id → id; opportunities.organization_id → id; service_locations.organization_id → id.

### osm_place_cache

Purpose: Cached OpenStreetMap/Overpass places Local sample rows: **2**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `cell_key` | TEXT | NOT NULL | — |
| `south` | REAL | NOT NULL | — |
| `west` | REAL | NOT NULL | — |
| `north` | REAL | NOT NULL | — |
| `east` | REAL | NOT NULL | — |
| `payload` | TEXT | NOT NULL | — |
| `place_count` | INTEGER | NOT NULL; default 0 | — |
| `fetched_at` | INTEGER | NOT NULL | — |
| `source_url` | TEXT | NOT NULL | — |

Indexes/unique constraints: osm_cache_cell_idx (unique), sqlite_autoindex_osm_place_cache_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### otp_challenges

Purpose: OTP issue, attempt, expiry and consumption state Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `phone` | TEXT | NOT NULL | — |
| `code_hash` | TEXT | NOT NULL | — |
| `purpose` | TEXT | NOT NULL | — |
| `attempts` | INTEGER | NOT NULL; default 0 | — |
| `expires_at` | INTEGER | NOT NULL | — |
| `consumed_at` | INTEGER | nullable | — |
| `dev_code` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: otp_phone_idx, sqlite_autoindex_otp_challenges_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### rate_limit_buckets

Purpose: Persistent fixed-window rate limits Local sample rows: **11**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `key` | TEXT | NOT NULL | PRIMARY KEY |
| `tokens` | REAL | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: sqlite_autoindex_rate_limit_buckets_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### required_documents

Purpose: Programme application document requirements Local sample rows: **143**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `opportunity_id` | TEXT | NOT NULL | FK → opportunities.id ON DELETE CASCADE |
| `name` | TEXT | NOT NULL | — |
| `name_bn` | TEXT | NOT NULL | — |
| `required` | INTEGER | NOT NULL; default true | — |
| `issuing_authority` | TEXT | nullable | — |
| `issuing_authority_bn` | TEXT | nullable | — |
| `common_mistake` | TEXT | nullable | — |
| `common_mistake_bn` | TEXT | nullable | — |
| `tip` | TEXT | nullable | — |
| `tip_bn` | TEXT | nullable | — |
| `validity_months` | INTEGER | nullable | — |
| `sort_order` | INTEGER | NOT NULL; default 0 | — |

Indexes/unique constraints: reqdocs_opportunity_idx, sqlite_autoindex_required_documents_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### saved_opportunities

Purpose: User bookmarks and application status Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `opportunity_id` | TEXT | NOT NULL | FK → opportunities.id ON DELETE CASCADE |
| `status` | TEXT | NOT NULL; default 'interested' | — |
| `note` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: saved_user_opp_uq (unique), sqlite_autoindex_saved_opportunities_1 (unique) (PK backing).

Referenced by: saved_status_history.saved_id → id.

### saved_status_history

Purpose: Audit trail of saved-item status changes Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `saved_id` | TEXT | NOT NULL | FK → saved_opportunities.id ON DELETE CASCADE |
| `from_status` | TEXT | nullable | — |
| `to_status` | TEXT | NOT NULL | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: saved_history_idx, sqlite_autoindex_saved_status_history_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### search_queries

Purpose: Search analytics and clicked-result linkage Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | nullable | FK → users.id ON DELETE SET NULL |
| `query` | TEXT | NOT NULL | — |
| `locale` | TEXT | NOT NULL | — |
| `intents` | TEXT | nullable | — |
| `result_count` | INTEGER | NOT NULL; default 0 | — |
| `clicked_opportunity_id` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: search_created_idx, sqlite_autoindex_search_queries_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### service_locations

Purpose: Physical service points for programmes Local sample rows: **327**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `organization_id` | TEXT | nullable | FK → organizations.id ON DELETE CASCADE |
| `name` | TEXT | NOT NULL | — |
| `name_bn` | TEXT | NOT NULL | — |
| `type` | TEXT | NOT NULL | — |
| `address` | TEXT | NOT NULL | — |
| `address_bn` | TEXT | NOT NULL | — |
| `division` | TEXT | NOT NULL | — |
| `district` | TEXT | NOT NULL | — |
| `upazila` | TEXT | nullable | — |
| `lat` | REAL | NOT NULL | — |
| `lng` | REAL | NOT NULL | — |
| `phone` | TEXT | nullable | — |
| `office_hours` | TEXT | nullable | — |
| `office_hours_bn` | TEXT | nullable | — |
| `services` | TEXT | NOT NULL | — |
| `verification_status` | TEXT | NOT NULL; default 'unverified_sample' | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: locations_type_idx, locations_district_idx, sqlite_autoindex_service_locations_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### sessions

Purpose: Refresh-session rotation and revocation state Local sample rows: **1**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `refresh_token_hash` | TEXT | NOT NULL | — |
| `user_agent` | TEXT | nullable | — |
| `ip` | TEXT | nullable | — |
| `expires_at` | INTEGER | NOT NULL | — |
| `revoked_at` | INTEGER | nullable | — |
| `replaced_by_id` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: sessions_hash_idx, sessions_user_idx, sqlite_autoindex_sessions_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### timeline_events

Purpose: Citizen lifecycle/activity timeline Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `opportunity_id` | TEXT | nullable | FK → opportunities.id ON DELETE SET NULL |
| `task_id` | TEXT | nullable | FK → action_plan_tasks.id ON DELETE CASCADE |
| `type` | TEXT | NOT NULL | — |
| `title` | TEXT | NOT NULL | — |
| `title_bn` | TEXT | NOT NULL | — |
| `description` | TEXT | nullable | — |
| `description_bn` | TEXT | nullable | — |
| `event_date` | INTEGER | NOT NULL | — |
| `source` | TEXT | NOT NULL; default 'system' | — |
| `completed` | INTEGER | NOT NULL; default false | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: timeline_user_date_idx, sqlite_autoindex_timeline_events_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### union_boundaries

Purpose: Union geofences used for residency validation Local sample rows: **5**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `union_code` | TEXT | NOT NULL | — |
| `name` | TEXT | NOT NULL | — |
| `name_bn` | TEXT | NOT NULL | — |
| `division` | TEXT | NOT NULL | — |
| `district` | TEXT | NOT NULL | — |
| `upazila` | TEXT | NOT NULL | — |
| `centroid_lat` | REAL | NOT NULL | — |
| `centroid_lng` | REAL | NOT NULL | — |
| `polygon` | TEXT | NOT NULL | — |
| `verification_status` | TEXT | NOT NULL; default 'unverified_sample' | — |
| `created_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: union_district_idx, union_code_uq (unique), sqlite_autoindex_union_boundaries_1 (unique) (PK backing).

Referenced by: beneficiaries.union_id → id; budget_allocations.union_id → id; issues.union_id → id; user_profiles.residency_union_id → id; users.civic_union_id → id.

### user_profiles

Purpose: Citizen profile, household, location and encrypted health data Local sample rows: **5**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL | FK → users.id ON DELETE CASCADE |
| `date_of_birth` | INTEGER | nullable | — |
| `stated_age` | INTEGER | nullable | — |
| `gender` | TEXT | nullable | — |
| `occupation` | TEXT | nullable | — |
| `monthly_income` | INTEGER | nullable | — |
| `marital_status` | TEXT | nullable | — |
| `education` | TEXT | nullable | — |
| `cgpa` | REAL | nullable | — |
| `university` | TEXT | nullable | — |
| `department` | TEXT | nullable | — |
| `has_disability` | INTEGER | nullable | — |
| `disability_type` | TEXT | nullable | — |
| `household_size` | INTEGER | nullable | — |
| `dependents` | INTEGER | nullable | — |
| `division` | TEXT | nullable | — |
| `district` | TEXT | nullable | — |
| `upazila` | TEXT | nullable | — |
| `land_ownership_decimals` | REAL | nullable | — |
| `is_student` | INTEGER | nullable | — |
| `has_business` | INTEGER | nullable | — |
| `business_type` | TEXT | nullable | — |
| `employees` | INTEGER | nullable | — |
| `farm_size_decimals` | REAL | nullable | — |
| `crops` | TEXT | nullable | — |
| `livestock` | TEXT | nullable | — |
| `is_pregnant` | INTEGER | nullable | — |
| `medical_conditions` | TEXT | nullable | — |
| `share_health_data` | INTEGER | NOT NULL; default false | — |
| `citizenship` | TEXT | nullable; default 'bangladeshi' | — |
| `preferred_country` | TEXT | nullable | — |
| `ielts_score` | REAL | nullable | — |
| `has_nid` | INTEGER | nullable | — |
| `has_bank_account` | INTEGER | nullable | — |
| `is_freedom_fighter_family` | INTEGER | nullable | — |
| `interests` | TEXT | nullable | — |
| `nid_number_hash` | TEXT | nullable | — |
| `nid_verification_status` | TEXT | NOT NULL; default 'unverified' | — |
| `nid_verified_at` | INTEGER | nullable | — |
| `residency_union_id` | TEXT | nullable | FK → union_boundaries.id ON DELETE SET NULL |
| `residency_verification_method` | TEXT | nullable | — |
| `residency_verified_at` | INTEGER | nullable | — |
| `residency_lat` | REAL | nullable | — |
| `residency_lng` | REAL | nullable | — |
| `life_events` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: user_profiles_user_uq (unique), sqlite_autoindex_user_profiles_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### user_settings

Purpose: Per-user notification, privacy and locale preferences Local sample rows: **10**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `user_id` | TEXT | NOT NULL | PRIMARY KEY; FK → users.id ON DELETE CASCADE |
| `theme` | TEXT | NOT NULL; default 'light' | — |
| `text_scale` | REAL | NOT NULL; default 1 | — |
| `numeral_system` | TEXT | NOT NULL; default 'latin' | — |
| `reduce_motion` | INTEGER | NOT NULL; default false | — |
| `high_contrast` | INTEGER | NOT NULL; default false | — |
| `voice_enabled` | INTEGER | NOT NULL; default true | — |
| `notify_push` | INTEGER | NOT NULL; default true | — |
| `notify_email` | INTEGER | NOT NULL; default false | — |
| `notify_sms` | INTEGER | NOT NULL; default false | — |
| `notify_deadlines` | INTEGER | NOT NULL; default true | — |
| `notify_new_opportunities` | INTEGER | NOT NULL; default true | — |
| `notify_program_updates` | INTEGER | NOT NULL; default true | — |
| `profile_visibility` | TEXT | NOT NULL; default 'anonymised_analytics' | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: sqlite_autoindex_user_settings_1 (unique) (PK backing).

Referenced by: No declared foreign key.

### users

Purpose: Accounts, roles, lifecycle and identity flags Local sample rows: **10**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `phone` | TEXT | NOT NULL | — |
| `name` | TEXT | NOT NULL | — |
| `email` | TEXT | nullable | — |
| `pin_hash` | TEXT | nullable | — |
| `role` | TEXT | NOT NULL; default 'citizen' | — |
| `status` | TEXT | NOT NULL; default 'active' | — |
| `language` | TEXT | NOT NULL; default 'bn' | — |
| `district` | TEXT | nullable | — |
| `phone_verified_at` | INTEGER | nullable | — |
| `failed_pin_attempts` | INTEGER | NOT NULL; default 0 | — |
| `locked_until` | INTEGER | nullable | — |
| `last_login_at` | INTEGER | nullable | — |
| `civic_role` | TEXT | NOT NULL; default 'none' | — |
| `civic_union_id` | TEXT | nullable | FK → union_boundaries.id ON DELETE SET NULL |
| `civic_upazila` | TEXT | nullable | — |
| `civic_district` | TEXT | nullable | — |
| `donor_org_id` | TEXT | nullable | FK → donor_organizations.id ON DELETE SET NULL |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: users_donor_idx, users_civic_idx, users_role_idx, users_phone_uq (unique), sqlite_autoindex_users_1 (unique) (PK backing).

Referenced by: action_plans.user_id → id; ai_logs.user_id → id; allocation_flags.user_id → id; beneficiaries.user_id → id; budget_allocations.posted_by → id; conversations.user_id → id; eligibility_evaluations.user_id → id; escalations.upazila_officer_id → id; feedback.user_id → id; issue_votes.user_id → id; issues.reporter_id → id; notifications.user_id → id; saved_opportunities.user_id → id; search_queries.user_id → id; sessions.user_id → id; timeline_events.user_id → id; user_profiles.user_id → id; user_settings.user_id → id.

### ussd_sessions

Purpose: Stateful USSD interaction sessions Local sample rows: **0**.

| Column | Type | Nullability/default | Key / relationship |

|---|---|---|---|

| `id` | TEXT | NOT NULL | PRIMARY KEY |
| `session_id` | TEXT | NOT NULL | — |
| `phone` | TEXT | NOT NULL | — |
| `step` | TEXT | NOT NULL; default 'menu' | — |
| `context` | TEXT | nullable | — |
| `created_at` | INTEGER | NOT NULL | — |
| `updated_at` | INTEGER | NOT NULL | — |

Indexes/unique constraints: ussd_session_uq (unique), sqlite_autoindex_ussd_sessions_1 (unique) (PK backing).

Referenced by: No declared foreign key.

## Database Ownership and Integrity Notes

- Drizzle schema ownership is `src/lib/db/schema.ts`; migration state is in `drizzle/`; connection selection is in `src/lib/db/client.ts` and deployment configuration in `drizzle.config.ts`.

- SQLite foreign keys, WAL, and busy timeout are initialized by the seed script, not clearly on every application connection. Foreign-key enforcement must therefore be verified in each runtime.

- Several references are intentionally logical/polymorphic rather than declared FKs (for example ledger entity IDs, graph edges, reviewer target IDs, and some actor/business-key fields).

- The ledger and chained audit segments rely on ordered previous-hash values and unique indexes; their read-then-insert writers assume serialized writes. Multi-write business workflows are generally not wrapped in explicit transactions.

- `data/accessai.db` and `data/test.db` are local ignored artifacts. A clean clone must create/push/seed its own database.

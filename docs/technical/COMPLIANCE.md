# Compliance — self-assessment, not certification

SJ-42/43/44 asked for a compliance pass: Union Parishads Act 2009 alignment, a real data-retention
policy, and field-level encryption for sensitive data. This document covers all three. Read the first
section's framing before the rest — it governs how everything after it should be read.

## SJ-42 — Union Parishads Act 2009: a structured self-assessment

**This is a mapping written by an AI agent from a general understanding of what the Act is commonly
described as covering (budget transparency, citizen participation in local governance, accountability
of elected officials, grievance mechanisms) — not a citation-by-citation legal analysis against the
Act's actual text, and not a legal opinion.** Treat every row below as a hypothesis for a qualified
reviewer (legal counsel familiar with Bangladeshi local government law, or the relevant ministry) to
check against the Act itself, not as a compliance claim this document is asserting on its own
authority. Shipping software that says "we reviewed this against the law" without that review having
been done by someone qualified to do it would be a worse outcome than shipping nothing on this front —
so this section says plainly what it is and is not.

| Theme commonly associated with the Act | What this codebase does | Where |
|---|---|---|
| Public disclosure of union budget/finances | Budget allocations are posted by a chairman/staff, visible to residents in-app, and now summarised on a public page needing no account | `modules/budget/`, `[locale]/transparency` |
| Citizen grievance / complaint mechanisms | Structured issue reporting, moderation, and status tracking, reachable by app or USSD | `modules/issues/`, `modules/ussd/` |
| Accountability of elected officials for public funds | Citizen flagging of allocations, automatic escalation past a threshold ratio, and a real escalation queue for an upazila officer | `modules/budget/escalation*.ts` |
| Record-keeping / audit of official decisions | A tamper-evident audit log and financial ledger, independently verifiable | `modules/ledger/`, `docs/LEDGER-INTEGRITY.md` |
| Identification of who holds which office | Civic roles scoped to a specific title and place, assigned only by an administrator | `modules/civic/roles.ts` |

What this table cannot tell a reader: whether these features satisfy the Act's *actual, specific*
requirements (form of disclosure, timing, which body must receive a report, retention duration, who is
legally permitted to see what). Those questions need the Act's text and someone qualified to interpret
it, not a mapping produced from general familiarity with what such acts typically require.

**Recommendation:** before any claim of Union Parishads Act compliance is made externally, have this
table (and the actual feature set) reviewed against the Act's current text by qualified counsel or the
relevant ministry. Nothing in this document should be cited as that review having happened.

## SJ-43 — Data retention policy

A concrete, running policy, not an aspiration:

| Data | Retention | Enforced by |
|---|---|---|
| Conversations + messages | 2 years from the last message | `enforceDataRetention()` |
| AI request/response logs | 1 year | `enforceDataRetention()` |
| Expired OTP challenges | 7 days past expiry | `enforceDataRetention()` |
| Financial ledger (`ledger_entries`) | Indefinite — never purged | N/A, by design |
| Admin audit log (`audit_log`) | Indefinite — never purged | N/A, by design |

Run via `POST /api/v1/admin/jobs` with `{"job":"enforce_data_retention"}`, or on a schedule an operator
configures outside this codebase (no in-app cron exists — see `docs/ARCHITECTURE.md` for how the other
scheduled jobs are triggered today).

**Why the ledger and audit log are excluded, explicitly, rather than merely "not yet handled":** they
are the accountability record Phase 3 exists to provide. A retention job that quietly shortened either
would defeat SJ-13/14's entire purpose — an auditor asking "what happened six months ago" needs the
record to still be there. This is a genuine tension worth naming rather than hiding: a completed
retention policy for *personal* data (the conversations/logs above) sits next to a deliberate *non*-
retention-limit for *accountability* data, and both are correct for what they each need to do.

**The specific day counts (730/365/7) are a defensible default chosen for this document, not a legal
determination.** A real deployment should set them from actual data-protection requirements applicable
in its jurisdiction (Bangladesh's Digital Security Act and any sector-specific rules for welfare/health
data), reviewed by the same qualified counsel referenced in SJ-42's section above.

## SJ-44 — Field-level encryption

**What is encrypted today:** `userProfiles.medicalConditions`, AES-256-GCM, at rest
(`lib/security/field-encryption.ts`). Verified live: the value returned by every API a citizen or the
AI conversation flow reads is plaintext (decrypted transparently), while the raw database column holds
genuine ciphertext (`v1:<iv>:<tag>:<ciphertext>`) — confirmed by reading the column directly with a
database client bypassing the application. Also verified: a bit flipped anywhere in a stored ciphertext
or its authentication tag causes decryption to fail loudly (GCM's built-in integrity check) rather than
silently returning corrupted data, and the audit log stores `"[redacted]"` for this field rather than a
plaintext or even ciphertext copy — so encrypting the primary column does not leave a plaintext copy
sitting in a second, unencrypted table.

**What is deliberately NOT encrypted yet, and why (this is a scoping decision, not an oversight):**

- **`userProfiles.district`/`upazila`.** Read in-memory by the eligibility engine, confirmed safe to
  encrypt (never used in a SQL `WHERE`/filter anywhere in the app), but touching five-plus call sites
  (opportunity listing, nearby search, the AI extractor, seed data) without a dedicated regression
  cycle for each one is a real risk to already-solid, unrelated functionality. Correct next step:
  encrypt at rest with the same transparent decrypt-on-read pattern `medicalConditions` now uses,
  landed as its own change with its own regression pass.
- **`users.phone`.** Looked up via `WHERE phone = ?` on login and registration — the single field in
  this system where SQL-level equality genuinely matters. Encrypting it correctly needs a blind index
  (a separate `HMAC(phone, server_key)` column for the equality lookup, ciphertext in the `phone`
  column itself for display), not a naive swap that would either break login or leak equality patterns
  through deterministic encryption. This is the *correct* design, not a workaround, and it was not
  attempted in this pass because modifying the primary authentication lookup path without an isolated
  testing cycle is exactly the kind of change that can silently lock out every account if one query
  site is missed.

Both gaps are recorded here — and in `docs/DEVIATIONS.md` §19 — as the concrete next step, not left
implicit in "future work" language that would let them quietly disappear from view.

**Key management, honestly stated:** `FIELD_ENCRYPTION_KEY` (env, base64, 32 bytes) is optional in
development — an unset key falls back to a fixed, clearly-labelled development-only value so a fresh
clone still runs — and `assertProductionSafety()` refuses to boot a production deployment without a
real one set. There is no key rotation mechanism: rotating the key today would require decrypting every
`medicalConditions` value with the old key and re-encrypting with the new one in a migration script,
which does not exist yet. Worth building before this encryption scope grows to more fields.

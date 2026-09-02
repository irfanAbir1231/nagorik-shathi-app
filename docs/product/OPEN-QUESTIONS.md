# Open questions

What still needs a decision. Every item here is **implemented under a stated assumption** — nothing
was left unbuilt waiting for an answer, and nothing was invented and passed off as specified. Each
entry says what was assumed, what is affected, and what changes if the answer differs.

Ordered by consequence.

---

## Q1 — The `green.300` / `green.800` contrast figure

**The conflict.** BDS §3.3 states that `green.300` on `green.800` is **8.63:1** and calls it *"the
mandatory text/icon colour"* for `surface.brand`. The computed value is **5.29:1** — verified
independently across the whole ramp (`green.200` 6.89, `green.100` 8.36, `green.50` 9.29, white
10.12). 5.29:1 passes AA for normal text and clears the 3:1 icon threshold, but not the *"AAA on all
body text"* rule the same document sets in its own header.

**Assumed and shipped:** the pairing is split rather than the token changed. `green.300` remains
`--bds-text-on-brand-deep` for small labels and icons; **body copy on the hero uses `green.100`**
(8.36:1), so AAA holds. Both bounds are asserted in `tests/tokens/contrast.test.ts`.

**Needs your call:** is the document's 8.63:1 a transcription error (most likely — the number matches
no pair in the green ramp), or was a different `green.800` intended? If the ramp is authoritative and
the figure is wrong, the document should be corrected. If AAA on hero body text is not actually
required, `green.300` can be used throughout and one token disappears from the exception list.

---

## Q2 — Who is authorised to verify a programme?

**Why it matters most in practice.** The whole trust model rests on a named person asserting *"I
checked this against the circular and it is current."* The code enforces the workflow — administrator
rank only, no self-certification, verification revoked by any content edit, everything audit-logged.
It cannot supply the authority.

**Assumed and shipped:** a two-role model (moderator triages, administrator verifies) with the
separation of duties described in [KNOWLEDGE-PIPELINE.md](KNOWLEDGE-PIPELINE.md) §4.

**Needs your call:** who holds that role in the real operating model — a2i, the Department of Social
Services, a partner NGO, a contracted data team? And is verification per-programme or per-ministry?
If verification is delegated per-ministry, the role model needs a **scope** dimension (`verifier for
DSS records`), which is a schema change — small now, awkward later.

---

## Q3 — PRD Part 7 is missing. Is the authored replacement acceptable?

Sections **101–117 (Knowledge Base & Data Pipeline) do not exist** in the source document. Everything
in [KNOWLEDGE-PIPELINE.md](KNOWLEDGE-PIPELINE.md) — the trust-state vocabulary, provenance fields,
review workflow, staleness policy, licensing position — was designed here to satisfy the dependencies
the rest of the PRD has on it (§26, §32, §33, §34, §64, §111).

**Needs your call:** does Part 7 exist elsewhere? If it does, the parts most likely to diverge are the
`verification_status` vocabulary, the review interval defaults (180 days), and whether an automated
fetcher was specified. If it does not exist, please confirm the authored model is the specification,
because a great deal now depends on it.

---

## Q4 — Are the programme thresholds and amounts correct?

The 42 programmes are structured after real Bangladeshi programmes run by real bodies, but **the
income thresholds, benefit amounts, age bands, and deadlines are representative, not verified.** Every
record carries `verification_status: unverified_sample`, the UI badges it, and confidence is capped at
65%.

**Needs:** a verified source per programme — the current circular, or a contact who can confirm the
figures. Replacing them requires no code change; it is data entry plus verification, and the
confidence ceiling lifts as a consequence.

**Until then, this build must not be presented to real citizens as authoritative.** That is a
deployment gate, not a code gate.

---

## Q5 — What happens when a citizen is told "no"?

The engine returns `not_eligible` with ordered reasons, and the UI shows the nearest alternatives. But
there is no specified appeal path, and PRD §33 forbids unsupported claims without saying what to do
when the *absence* of an entitlement is the claim.

**Assumed and shipped:** a `not_eligible` result always shows (a) which specific condition failed, in
the citizen's language, (b) whether it is changeable (income can change; a statutory gender bar
cannot), and (c) the closest programmes they *do* qualify for. Feedback on any decision is one tap and
lands in the moderation queue.

**Needs your call:** if a citizen believes a "no" is wrong, is there a real human escalation? A
platform that says no with no route onward will be experienced as the state saying no.

---

## Q6 — Is the "Similar User Success" ranking factor wanted at all?

PRD §31 allocates 10% of the ranking score to it. That requires historical outcome data, which raises
a privacy question the PRD does not address: inferring one citizen's likely success from others'
outcomes is a use of their data that consent (§121) does not obviously cover.

**Assumed and shipped:** the component returns a **neutral 50** and reports
`similarUserDataAvailable: false`. The other five factors carry their specified weights.

**Needs your call:** should this be computed from aggregated anonymised outcomes once data exists
(and if so, at what minimum cohort size), or dropped and its 10% redistributed? Dropping it is
defensible — the other five factors are properties of the *programme and the citizen*, not of other
people.

---

## Q7 — SMS delivery: which gateway, and who owns the sender ID?

Phone + OTP is the identity model, so SMS is on the critical path for every new account. The code
throws a clear error rather than pretending to send; three provider shapes are documented in
[EXTERNAL.md](EXTERNAL.md) §4.

**Needs:** the gateway choice (SSL Wireless is the usual answer for government and NGO deployments in
Bangladesh), credentials, and — the part that is not a code problem — **a BTRC-registered masking
sender ID**. Without it, messages arrive from a shortcode and some operators filter them, which looks
exactly like a broken login.

Also: is the voice-OTP fallback (BDS §10.2.5) in scope for v1? It is the accessible-authentication
path for citizens who cannot read the SMS, and it is currently a visible, disabled button with a
stated reason.

---

## Q8 — Redistribution rights on official circulars

Not addressed anywhere in the PRD, and a real constraint. Bangladeshi government circulars are not
uniformly licensed for redistribution.

**Assumed and shipped:** the corpus holds **original summaries, not reproductions**; `sourceUrl` sends
the citizen to the authoritative text; `documents.license_note` records the position per source.

**Needs your call:** may the platform store and serve circular text verbatim? If yes, from which
ministries, and must attribution take a particular form? If no, the summary-plus-link model is
already correct and should be documented as policy rather than as an assumption.

---

## Q9 — Document capture: what is actually needed?

PRD §Feature 8 implies reading a National ID or certificate; BDS §12.3 bans the word "upload" in
favour of a camera capture flow. **Not built** — the schema and the admin indexing path exist, but no
capture UI and no object-storage writer.

**Needs your call:** is this v1? And if it is, what is done with the image — held for the citizen's own
reference, OCR'd to pre-fill a profile, or transmitted to an agency? Those are three different
products with three different privacy positions. **OCR that misreads a National ID number is worse
than typing it**, so this should not ship without a confirm-what-we-read step.

---

## Q10 — Data retention

PRD §121 requires deletion; account deletion is implemented. What is unspecified is how long the rest
lives.

**Assumed and shipped:** conversations, evaluations (with profile snapshots), and audit logs are kept
indefinitely — evaluations *deliberately*, since a decision must stay replayable. `otp_challenges` and
`rate_limit_buckets` are transient.

**Needs your call:** a retention period for conversations and evaluations, and whether an audit log
entry naming a staff member survives that member's own account deletion. There is a genuine tension
here: the audit trail exists to make verification accountable, which argues for keeping it, while
§121 argues for erasure.

---

## Q11 — Smaller items

- **Districts vs upazilas.** Coverage is modelled at district level (64). Several real programmes vary
  by upazila. Adding that is a schema change to `coverage_districts` plus a much larger location
  corpus — is district granularity acceptable for v1?
- **Language of record.** A citizen using the Bangla UI whose programme text is authored in English
  sees an authored Bangla translation. Who owns translation quality when a programme is added — the
  author, or a separate translation step? Bilingual fields are currently required at write time,
  which forces the author to supply both.
- **Notification quiet hours.** Deadline reminders currently generate whenever the job runs. Should
  there be a delivery window (no SMS at 03:00)?
- **`recurrence` semantics.** A programme marked `annual` re-opens each year, but nothing computes the
  next cycle's dates. Should the system project a future deadline, or wait for an administrator to
  update it? Projecting a date that turns out wrong sends someone to an office on the wrong day, so
  the conservative option is currently implemented: no projection.
- **Anonymous browsing depth.** Programmes and locations are browsable signed out; eligibility needs a
  profile. Should a signed-out visitor be able to run a throwaway eligibility check without creating
  an account?

---

## What was decided without asking

For completeness, these were judgement calls made under the requirements hierarchy rather than
questions — each is recorded in [DEVIATIONS.md](DEVIATIONS.md) with reasoning: libSQL instead of
PostgreSQL + Redis (§1), BM25 with optional vectors instead of pgvector (§3), the three-valued rule
grammar (§4), phone + OTP + PIN over email + password where the PRD and the Design System conflicted
(§6), a read-only rule inspector rather than a free-text JSON editor (§9), and the contrast split in
Q1 above.

Where the PRD and the Design System disagreed on anything the citizen touches, the Design System won.
Where the PRD specified infrastructure, engineering judgement chose something that runs today and
preserves the migration path.

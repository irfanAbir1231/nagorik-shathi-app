/* eslint-disable no-console */
import './load-env';
import { verifyLedgerChain } from '../src/modules/ledger/ledger.service';
import { verifyAuditChain } from '../src/modules/admin/admin.service';

/**
 * SJ-41 — an INDEPENDENT audit of both hash chains (the financial ledger and
 * the admin audit log), deliberately outside the running app.
 *
 * "Independent" here means specific things:
 *   • No Next.js server has to be running — this is a plain Node script.
 *   • No staff session or admin login is required — only whatever access to
 *     the database this process has (a local file, or a libSQL URL/token),
 *     exactly the level of access a real external auditor (the Anti-
 *     Corruption Commission, an engaged audit firm) would be given.
 *   • It calls the SAME `verifyLedgerChain()`/`verifyAuditChain()` functions
 *     the in-app /admin/ledger page calls — deliberately NOT a second,
 *     separately-written recomputation. A hand-rolled reimplementation here
 *     could silently drift from what the app actually enforces, or be
 *     quietly weakened without anyone noticing the in-app check no longer
 *     matches it. Calling the real function is what makes this trustworthy:
 *     an operator cannot make the in-app badge say "intact" while this
 *     script would say otherwise, because they are the same check.
 *
 * What this proves, and what it does not — see docs/LEDGER-INTEGRITY.md. In
 * short: it proves no row was altered or removed after the fact without also
 * rewriting every hash after it. It does NOT prove the first write was
 * honest, and it does NOT stop someone with direct database access from
 * doing that full rewrite — SQLite has one writer and no independent second
 * ledger to cross-check against. That is the honest limit of a hash chain in
 * a single database (docs/DEVIATIONS.md §17), not something this script can
 * paper over.
 *
 * Run: npm run ledger:audit
 * Exit code 0 if both chains are intact, 1 if either is broken or errors.
 */

function report(label: string, result: { intact: boolean; checked: number; brokenAtId: string | null; reason: string | null }) {
  console.log(`\n${label}`);
  console.log('─'.repeat(label.length));
  console.log(`  rows chained:     ${result.checked}`);
  if (result.intact) {
    console.log('  ✓ intact — every hash matches its recomputed payload and its predecessor.');
  } else {
    console.log(`  ✗ BROKEN at row ${result.brokenAtId}`);
    console.log(`    reason: ${result.reason}`);
  }
}

async function main() {
  console.log('Shebar Janala — independent ledger audit');
  console.log(`Run at: ${new Date().toISOString()}`);

  const ledger = await verifyLedgerChain();
  report('Financial ledger (budget allocations + disbursements)', ledger);

  const audit = await verifyAuditChain();
  report('Admin audit log', audit);

  console.log('\n' + '='.repeat(40));
  if (ledger.intact && audit.intact) {
    console.log('RESULT: both chains intact. No tampering detected.');
  } else {
    console.log('RESULT: TAMPERING DETECTED. See above for the exact broken row.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/* eslint-disable no-console */
import fs from 'node:fs';
import { EVIDENCE_FIELDS, type EvidenceField } from '@/modules/ai/decision/policy';
import { SEMANTIC_CASES, type SemanticCase } from '../cases';
import { parseCsv } from './csv';

/**
 * Inter-annotator agreement between the reference labels (cases.ts) and a
 * second, blind annotator's CSV (from export-blind.ts).
 *
 *   npx tsx evaluation/jev/annotation/agreement.ts filled.csv
 *
 * Per field: raw agreement and Cohen's κ, where "not stated" is a category
 * like any other (disagreeing about WHETHER something was stated is the
 * disagreement that matters most here). Cases either annotator skipped for a
 * field are excluded for that field. Prints every disagreement for
 * adjudication. Report these numbers BEFORE adjudicating.
 */

type Label = string;
const NOT_STATED = '∅';

function referenceLabel(c: SemanticCase, field: EvidenceField): Label | null {
  if (c.skip?.includes(field)) return null;
  const v = c.facts[field];
  return v === undefined ? NOT_STATED : String(v).toLowerCase();
}

function normalise(raw: string | undefined): Label {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === '' || v === 'not stated' || v === 'not_stated' || v === '-') return NOT_STATED;
  if (/^-?\d+(\.\d+)?$/.test(v)) return String(Number(v));
  return v;
}

export function cohensKappa(pairs: readonly [Label, Label][]): number | null {
  if (pairs.length === 0) return null;
  const labels = [...new Set(pairs.flat())];
  const n = pairs.length;
  const observed = pairs.filter(([a, b]) => a === b).length / n;
  let expected = 0;
  for (const l of labels) {
    const pa = pairs.filter(([a]) => a === l).length / n;
    const pb = pairs.filter(([, b]) => b === l).length / n;
    expected += pa * pb;
  }
  if (expected === 1) return observed === 1 ? 1 : 0;
  return (observed - expected) / (1 - expected);
}

function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: agreement.ts filled.csv');
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!header) throw new Error('Empty CSV');
  const col = (name: string) => header.indexOf(name);
  const byId = new Map(SEMANTIC_CASES.map((c) => [c.id, c]));

  console.log(`Annotations: ${rows.length} rows\n`);
  console.log('| Field | Pairs | Raw agreement | Cohen\'s κ |');
  console.log('|---|---:|---:|---:|');
  const disagreements: string[] = [];
  for (const field of EVIDENCE_FIELDS) {
    const pairs: [Label, Label][] = [];
    for (const row of rows) {
      const c = byId.get(row[col('id')] ?? '');
      if (!c) continue;
      const skipped = (row[col('skip')] ?? '').split(/[;, ]+/).includes(field);
      const ref = referenceLabel(c, field);
      if (ref === null || skipped) continue;
      const other = normalise(row[col(field)]);
      pairs.push([ref, other]);
      if (ref !== other) disagreements.push(`${c.id} · ${field}: reference "${ref}" vs annotator "${other}" — ${c.text.slice(0, 80)}`);
    }
    const raw = pairs.length ? pairs.filter(([a, b]) => a === b).length / pairs.length : null;
    const k = cohensKappa(pairs);
    console.log(`| ${field} | ${pairs.length} | ${raw === null ? '—' : `${(raw * 100).toFixed(1)}%`} | ${k === null ? '—' : k.toFixed(2)} |`);
  }
  console.log(`\nDisagreements to adjudicate (${disagreements.length}):`);
  for (const d of disagreements) console.log(`- ${d}`);
}

if (process.argv[1]?.endsWith('agreement.ts')) main();

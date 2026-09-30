/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { EVIDENCE_FIELDS } from '@/modules/ai/decision/policy';
import { SEMANTIC_CASES } from '../cases';
import { toCsv } from './csv';

/**
 * Writes the benchmark messages for a BLIND second annotator: a fixed shuffled
 * order, no labels, no categories (which would hint at the answer), no model
 * outputs. `npx tsx evaluation/jev/annotation/export-blind.ts [out.csv]`
 */

const SEED = 20260930;
function shuffled<T>(items: readonly T[]): T[] {
  let t = SEED >>> 0;
  const next = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const header = ['id', 'text', ...EVIDENCE_FIELDS, 'situation', 'kind', 'injection', 'skip', 'notes'];
const rows = shuffled(SEMANTIC_CASES).map((c) => [c.id, c.text, ...header.slice(2).map(() => '')]);
const out = process.argv[2] ?? path.resolve('evaluation/jev/annotation', `blind-${new Date().toISOString().slice(0, 10)}.csv`);
fs.writeFileSync(out, `﻿${toCsv([header, ...rows])}`, 'utf8');
console.log(`Wrote ${rows.length} unlabelled messages to ${out}. Give it to the annotator with PROTOCOL.md — and nothing else.`);

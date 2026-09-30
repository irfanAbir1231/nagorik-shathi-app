import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTurnQuestions, FIELD_PRODUCERS, QUESTION_SET_VERSION } from '@/modules/ai/decision/questions';
import { EVIDENCE_FIELDS, FIELD_THRESHOLDS } from '@/modules/ai/decision/policy';
import { findNumberCandidates } from '@/modules/ai/candidates';

/** Structural guarantees of the decision layer that must never regress. */

describe('question set', () => {
  it('never asks a decision model whether someone is eligible', () => {
    const { questions } = buildTurnQuestions(findNumberCandidates('I am 58 and earn 4000'), []);
    const text = JSON.stringify(questions).toLowerCase();
    expect(text).not.toMatch(/\beligible for\b|\bqualif(y|ies) for\b|\bshould (get|receive)\b/);
  });

  it('offers a "not stated" escape on every self-fact Choice', () => {
    const { questions } = buildTurnQuestions([], []);
    for (const id of ['marital_status', 'gender', 'occupation', 'education']) {
      const q = questions[id]!;
      expect(q.type).toBe('choice');
      expect(Object.keys((q as { criteria: object }).criteria)).toContain('not_stated');
    }
  });

  it('has exactly one producer per evidence field (no double counting)', () => {
    const producers = Object.values(FIELD_PRODUCERS).flatMap((p) => p!.split('|'));
    expect(new Set(producers).size).toBe(producers.length);
    for (const field of EVIDENCE_FIELDS) expect(FIELD_PRODUCERS[field]).toBeTruthy();
  });

  it('has a threshold for every evidence field, with confirm below accept', () => {
    for (const field of EVIDENCE_FIELDS) {
      const t = FIELD_THRESHOLDS[field];
      expect(t.confirm).toBeLessThan(t.accept);
      expect(t.accept).toBeLessThanOrEqual(1);
    }
  });

  it('is versioned', () => {
    expect(QUESTION_SET_VERSION).toMatch(/^turn-understanding@\d+\.\d+\.\d+$/);
  });
});

describe('number candidates (code owns values)', () => {
  it.each([
    ['আমার বয়স ৫৮, মাসে সাড়ে চার হাজার টাকা আয়, পরিবারে ৫ জন', [58, 4500, 5]],
    ['I earn 500 taka a month', [500]],
    ['I have 2 kids aged 5 and 8', [2, 5, 8]],
    ['income is 1.5 lakh a year', [150000]],
  ])('%s → %j', (text, values) => {
    expect(findNumberCandidates(text).map((c) => c.value)).toEqual(values);
  });
});

describe('JEV_API_KEY stays server-side', () => {
  const root = resolve(__dirname, '../../src');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(name)) files.push(path);
    }
  };
  walk(root);

  it('is read in exactly one place: the validated server config', () => {
    const readers = files.filter((f) => readFileSync(f, 'utf8').includes('JEV_API_KEY') && !f.endsWith('env.ts'));
    const directReads = readers.filter((f) => /process\.env\.JEV_API_KEY/.test(readFileSync(f, 'utf8')));
    expect(directReads).toEqual([]);
  });

  it('is never reachable from a client component', () => {
    const clientFiles = files.filter((f) => /^\s*['"]use client['"]/.test(readFileSync(f, 'utf8')));
    expect(clientFiles.length).toBeGreaterThan(0);
    for (const f of clientFiles) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/from ['"]@\/lib\/config\/env['"]/);
      expect(src, f).not.toMatch(/from ['"]@\/modules\/ai\//);
    }
  });

  it('is not exposed with a NEXT_PUBLIC_ prefix anywhere', () => {
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/NEXT_PUBLIC_JEV/);
  });
});

import { SEMANTIC_CASES } from '../../jev/cases';
import { readFileSync } from 'node:fs';
const src = readFileSync(process.argv[2]!, 'utf8');
const probes = [...src.matchAll(/^\s+['"](.+?)['"],\s*$/gm)].map((m) => m[1]!).filter((t) => t.length > 8 && !t.includes('`'));
const grams = (t: string) => { const w = t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean); const g = new Set<string>(); for (let i = 0; i + 1 < w.length; i++) g.add(w[i] + ' ' + w[i + 1]); return g; };
const jac = (a: Set<string>, b: Set<string>) => { const i = [...a].filter((x) => b.has(x)).length; return i / Math.max(1, a.size + b.size - i); };
let near = 0;
for (const c of SEMANTIC_CASES) {
  const g = grams(c.text); let best = 0, which = '';
  for (const p of probes) { const s = jac(g, grams(p)); if (s > best) { best = s; which = p; } }
  if (best >= 0.3) { near += 1; console.log(best.toFixed(2), c.id.padEnd(20), '<~', which.slice(0, 60)); }
}
console.log(`\n${near}/${SEMANTIC_CASES.length} cases have a near-duplicate (bigram Jaccard >= 0.30) among the ${probes.length} design probes`);

/**
 * Dev probe: runs the DSS adapter and extractor over saved HTML files.
 *   npx tsx scripts/discovery-probe.ts <dir-with-widow.html-sitemap.html-notices.html>
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pageContent, programmeLinks, serviceNotices } from '../src/modules/discovery/dss-adapter';
import { extractFromPage, draftCompleteness } from '../src/modules/discovery/extract';

const dir = process.argv[2] ?? '.';
const base = 'https://dss.gov.bd/';
const read = (name: string) => readFileSync(join(dir, name), 'utf8');

const programmes = programmeLinks(read('sitemap.html'), base);
console.log(`programme links: ${programmes.length}`);
for (const p of programmes) console.log('  -', p.text);

const notices = serviceNotices(read('notices.html'), base);
console.log(`service notices on first page: ${notices.length}`);
for (const n of notices) console.log('  -', n.title, n.published);

const url = `${base}pages/static-pages/widow`;
const content = pageContent(read('widow.html'), url);
const { draft, evidence } = extractFromPage({ url, title: content.title, text: content.text, links: content.links });
console.log('updated line:', content.updatedLine);
console.log('draft:', JSON.stringify(draft, null, 2));
console.log('evidence keys:', Object.keys(evidence));
console.log('eligibility hints:\n' + (evidence._eligibility ?? '').split('\n').slice(0, 5).join('\n'));
console.log('completeness:', draftCompleteness(draft));

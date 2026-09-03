const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('C:/Users/TL-77057/Downloads/ShebarJanala/node_modules/sharp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SRC = 'C:/Users/TL-77057/Downloads/ShebarJanala/docs/technical/diagram-sources';
const WORK = path.join(__dirname, 'mermaid-render');
fs.mkdirSync(WORK, { recursive: true });

// A4 portrait: 8.268in x 11.693in, margins 0.66in side / 0.611in top-bottom
// usable text column = 6.95in wide, 10.47in tall
const USABLE_W_IN = 6.9;

function harness(code, cfg, cssWidth) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:#fff;}
  #wrap{width:${cssWidth}px;padding:12px;background:#fff;}
  #out svg{max-width:none !important;height:auto !important;}
  #diagerr{font:12px monospace;color:#000;}
</style></head><body><div id="wrap"><div id="out"></div></div><div id="diagerr"></div>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize(${JSON.stringify(cfg)});
const code = ${JSON.stringify(code)};
try {
  const { svg } = await mermaid.render('gen', code);
  document.getElementById('out').innerHTML = svg;
  const s = document.querySelector('#out svg');
  const vb = (s.getAttribute('viewBox')||'').split(/[ ,]+/);
  document.title = 'OK ' + Math.round(parseFloat(vb[2])) + 'x' + Math.round(parseFloat(vb[3]));
} catch (e) {
  document.getElementById('diagerr').textContent = String(e && e.message ? e.message : e).replace(/\\s+/g, ' ').slice(0, 400);
  document.title = 'ERR';
}
</script></body></html>`;
}

function measure(name, code, cfg) {
  const html = path.join(WORK, name + '-probe.html');
  fs.writeFileSync(html, harness(code, cfg, 4000), 'utf-8');
  const dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--dump-dom',
    '--virtual-time-budget=25000', 'file:///' + html.replace(/\\/g, '/'),
  ], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024, timeout: 120000, stdio: ['pipe', 'pipe', 'ignore'] });
  const title = (/<title>([^<]*)<\/title>/.exec(dom) || [])[1] || '(none)';
  if (!title.startsWith('OK ')) {
    const m = /<div id="diagerr"[^>]*>([^<]*)<\/div>/.exec(dom);
    throw new Error(`${name}: mermaid failed -> ${m && m[1] ? m[1] : 'title=' + title}`);
  }
  const [w, h] = title.replace('OK ', '').split('x').map(Number);
  return { w, h };
}

function run(name, code, cfg, cssWidth, winW, winH) {
  const html = path.join(WORK, name + '.html');
  fs.writeFileSync(html, harness(code, cfg, cssWidth), 'utf-8');

  // pass 1: read the rendered viewBox out of the document title
  const dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--dump-dom',
    '--virtual-time-budget=25000', 'file:///' + html.replace(/\\/g, '/'),
  ], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 });

  const title = (/<title>([^<]*)<\/title>/.exec(dom) || [])[1] || '(none)';
  if (!title.startsWith('OK ')) {
    const m = /<div id="diagerr"[^>]*>([^<]*)<\/div>/.exec(dom);
    throw new Error(`${name}: mermaid failed -> ${m && m[1] ? m[1] : 'title=' + title}`);
  }
  console.log(`  ${name}: rendered viewBox ${title.replace('OK ', '')}`);

  // pass 2: screenshot at 2x
  const shot = path.join(WORK, name + '-raw.png');
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=2', `--window-size=${winW},${winH}`,
    '--virtual-time-budget=25000', `--screenshot=${shot}`,
    'file:///' + html.replace(/\\/g, '/'),
  ], { stdio: 'pipe', timeout: 120000 });

  return shot;
}

(async () => {
  const jobs = [
    {
      name: 'architecture',
      file: 'architecture.mmd',
      cssWidth: 1180,
      win: [1260, 4200],
      cfg: {
        startOnLoad: false, theme: 'default',
        flowchart: { useMaxWidth: false, htmlLabels: true, nodeSpacing: 14, rankSpacing: 30, padding: 10, wrappingWidth: 1100, subGraphTitleMargin: { top: 6, bottom: 16 } },
        themeVariables: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '26px' },
      },
      baseFont: 26,
    },
    {
      name: 'sequence',
      file: 'sequence.mmd',
      cssWidth: 1500,
      win: [1580, 4400],
      cfg: {
        startOnLoad: false, theme: 'default',
        sequence: {
          useMaxWidth: false, diagramMarginX: 12, diagramMarginY: 10,
          actorMargin: 44, width: 130, height: 40, boxMargin: 6, messageMargin: 26, noteMargin: 8,
          messageFontSize: 21, actorFontSize: 22, noteFontSize: 19, wrap: true,
        },
        themeVariables: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' },
      },
      baseFont: 21,
    },
  ];

  for (const j of jobs) {
    const code = fs.readFileSync(path.join(SRC, j.file), 'utf-8');

    // measure the natural mermaid size first, then capture at exactly that size
    const nat = measure(j.name, code, j.cfg);
    const cssW = nat.w + 30;
    const raw = run(j.name, code, j.cfg, cssW, cssW + 30, nat.h + 60);

    const out = path.join(WORK, `diag-${j.name}.png`);
    const meta = await sharp(raw)
      .trim({ threshold: 2 })
      .extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#ffffff' })
      .png({ compressionLevel: 9 })
      .toFile(out);

    const MAX_H_IN = 9.8;
    let placeW = USABLE_W_IN;
    let heightIn = placeW * meta.height / meta.width;
    if (heightIn > MAX_H_IN) { placeW = MAX_H_IN * meta.width / meta.height; heightIn = MAX_H_IN; }
    const baseFont = j.baseFont || 15;
    const onPagePt = (baseFont / nat.w) * (placeW * 72);
    console.log(`  ${j.name}: natural ${nat.w}x${nat.h}, captured ${meta.width}x${meta.height}`);
    console.log(`     placed ${placeW.toFixed(2)}in x ${heightIn.toFixed(2)}in  ${placeW < USABLE_W_IN ? 'scaled down to fit page height' : 'full column width'}  |  body type ~= ${onPagePt.toFixed(1)} pt  |  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
})();

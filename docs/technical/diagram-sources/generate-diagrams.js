const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/TL-77057/Downloads/ShebarJanala/node_modules/sharp');

const OUT = path.join(__dirname, 'diagrams2');
fs.mkdirSync(OUT, { recursive: true });

const FONT = 'Arial, Helvetica, DejaVu Sans, sans-serif';
// Larger type: at a 7.0 inch display width these land near 7pt on the page.
const TITLE = 17, SUB = 15, EDGE = 14, CLU = 15, ANNOT = 14.5;
const T = {
  nodeFill: '#ECECFF', nodeStroke: '#9370DB',
  clusterFill: '#FFFFDE', clusterStroke: '#AAAA33',
  text: '#333333', line: '#333333',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function tb(cx, cy, lines, { t = TITLE, s = SUB, lh = 20, boldFirst = true } = {}) {
  const sizes = lines.map((_, i) => (boldFirst && i === 0 ? t : s));
  const total = (lines.length - 1) * lh;
  const startY = cy - total / 2 + sizes[0] * 0.35;
  return lines.map((l, i) => {
    const bold = boldFirst && i === 0 ? ' font-weight="600"' : '';
    return `<text x="${cx}" y="${startY + i * lh}" font-family="${FONT}" font-size="${sizes[i]}" fill="${T.text}" text-anchor="middle"${bold}>${esc(l)}</text>`;
  }).join('');
}

function box(x, y, w, h, lines, o = {}) {
  const dash = o.dashed ? ' stroke-dasharray="6 4"' : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${T.nodeFill}" stroke="${T.nodeStroke}" stroke-width="1.3"${dash}/>`
    + tb(x + w / 2, y + h / 2, lines, o);
}

function diamond(cx, cy, w, h, lines) {
  const pts = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;
  return `<polygon points="${pts}" fill="${T.nodeFill}" stroke="${T.nodeStroke}" stroke-width="1.3"/>`
    + tb(cx, cy, lines, { boldFirst: false, s: SUB, lh: 19 });
}

function cylinder(x, y, w, h, lines) {
  const ry = 14;
  return `<path d="M${x},${y + ry} a${w / 2},${ry} 0 0 1 ${w},0 v${h - 2 * ry} a${w / 2},${ry} 0 0 1 ${-w},0 z" fill="${T.nodeFill}" stroke="${T.nodeStroke}" stroke-width="1.3"/>`
    + `<path d="M${x},${y + ry} a${w / 2},${ry} 0 0 0 ${w},0" fill="none" stroke="${T.nodeStroke}" stroke-width="1.3"/>`
    + tb(x + w / 2, y + h / 2 + 5, lines, { lh: 19 });
}

function cluster(x, y, w, h, title) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${T.clusterFill}" stroke="${T.clusterStroke}" stroke-width="1.3"/>`
    + `<text x="${x + 14}" y="${y + 24}" font-family="${FONT}" font-size="${CLU}" fill="#6b6b2a">${esc(title)}</text>`;
}

function label(cx, cy, str) {
  const w = str.length * (EDGE * 0.56) + 10;
  return `<rect x="${cx - w / 2}" y="${cy - EDGE * 0.8}" width="${w}" height="${EDGE * 1.55}" fill="#ffffff" opacity="0.95"/>`
    + `<text x="${cx}" y="${cy + EDGE * 0.36}" font-family="${FONT}" font-size="${EDGE}" fill="${T.text}" text-anchor="middle">${esc(str)}</text>`;
}

function arrow(x1, y1, x2, y2, o = {}) {
  const dash = o.dashed ? ' stroke-dasharray="6 4"' : '';
  let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${T.line}" stroke-width="1.5" marker-end="url(#ah)"${dash}/>`;
  if (o.lab) s += label((x1 + x2) / 2 + (o.labDx || 0), (y1 + y2) / 2 + (o.labDy === undefined ? -11 : o.labDy), o.lab);
  return s;
}

function annot(x, y, str) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${ANNOT}" fill="#555555">${esc(str)}</text>`;
}

function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">`
    + `<path d="M0,0 L10,5 L0,10 z" fill="${T.line}"/></marker></defs>`
    + `<rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;
}

/* ---------------------------------------------------- D1 eligibility */
function d1() {
  let b = '';
  b += box(20, 178, 200, 68, ['Profile snapshot', '35 fields, stored']);
  b += box(20, 268, 200, 68, ['Versioned rule set', 'hard + soft']);
  b += arrow(220, 210, 262, 240);
  b += arrow(220, 300, 262, 262);

  b += diamond(390, 251, 240, 156, ['Hard condition', 'failed?']);
  b += arrow(390, 329, 390, 392, { lab: 'yes', labDy: -6, labDx: -22 });
  b += box(295, 392, 195, 60, ['not_eligible'], { boldFirst: true });
  b += arrow(510, 251, 556, 251, { lab: 'no', labDy: -10 });

  b += diamond(686, 251, 250, 156, ['Required field', 'missing?']);
  b += arrow(686, 329, 686, 392, { lab: 'yes', labDy: -6, labDx: -22 });
  b += box(591, 392, 195, 60, ['unknown']);
  b += arrow(811, 251, 856, 251, { lab: 'no', labDy: -10 });

  b += box(856, 214, 205, 74, ['Weighted sum,', 'soft conditions']);
  b += arrow(1061, 251, 1102, 251);

  b += diamond(1200, 251, 190, 150, ['Above', 'threshold?']);
  b += arrow(1200, 176, 1200, 132, { lab: 'yes', labDy: -4, labDx: -24 });
  b += box(1103, 72, 195, 60, ['eligible']);
  b += arrow(1200, 326, 1200, 392, { lab: 'no', labDy: -6, labDx: -22 });
  b += box(1093, 392, 215, 60, ['partially_eligible']);

  return { name: 'diag-eligibility', svg: svg(1330, 472, b) };
}

/* ---------------------------------------------------- D2 retrieval */
function d2() {
  let b = '';
  b += box(20, 186, 200, 74, ['Citizen query', 'Bangla or English']);
  b += arrow(220, 223, 264, 223);
  b += box(264, 172, 280, 102, ['Bilingual tokenizer', 'Bangla segmentation', 'Porter-style English']);

  b += cluster(586, 96, 350, 262, 'Two channels, fused by rank');
  b += box(608, 134, 306, 94, ['BM25 lexical', 'k1 1.5, b 0.75', '158 chunks']);
  b += box(608, 248, 306, 88, ['Semantic embeddings', 'dormant without a key'], { dashed: true });
  b += arrow(544, 214, 604, 181);
  b += arrow(544, 234, 604, 292, { dashed: true });

  b += arrow(914, 181, 972, 210);
  b += arrow(914, 292, 972, 246, { dashed: true });
  b += box(972, 190, 180, 76, ['Reciprocal Rank', 'Fusion, k = 60']);
  b += arrow(1152, 228, 1196, 228);
  b += box(1196, 192, 170, 72, ['Ranked', 'programmes']);

  return { name: 'diag-retrieval', svg: svg(1390, 380, b) };
}

/* ---------------------------------------------------- D3 escalation */
function d3() {
  let b = '';
  b += box(20, 20, 210, 60, ['Anchored to ledger'], { boldFirst: false, s: TITLE });
  b += box(20, 118, 210, 60, ['Allocation posted'], { boldFirst: false, s: TITLE });
  b += arrow(125, 118, 125, 84);
  b += box(20, 216, 210, 60, ['Citizen flags it'], { boldFirst: false, s: TITLE });
  b += arrow(125, 178, 125, 214);
  b += arrow(230, 246, 276, 246);

  b += diamond(430, 246, 290, 168, ['2 or more flags and', 'flags / residents >= 0.5 ?']);
  b += arrow(430, 330, 430, 398, { lab: 'no', labDy: -6, labDx: -20 });
  b += box(330, 398, 200, 60, ['No escalation'], { boldFirst: false, s: TITLE });
  b += arrow(575, 246, 622, 246, { lab: 'yes', labDy: -10 });

  b += box(622, 216, 210, 62, ['Escalation created', 'one-way latch']);
  b += arrow(832, 246, 878, 246);

  b += box(878, 218, 150, 58, ['pending'], { boldFirst: false, s: TITLE });
  b += arrow(1028, 246, 1074, 246);
  b += box(1074, 218, 195, 58, ['acknowledged'], { boldFirst: false, s: TITLE });
  b += arrow(1171, 218, 1171, 170);
  b += box(1074, 108, 195, 58, ['resolved'], { boldFirst: false, s: TITLE });
  b += arrow(1171, 276, 1171, 322);
  b += box(1074, 322, 195, 58, ['dismissed'], { boldFirst: false, s: TITLE });

  b += annot(622, 320, 'Only an upazila officer can move these four states.');

  return { name: 'diag-escalation', svg: svg(1300, 480, b) };
}

/* ---------------------------------------------------- D4 auth */
function d4() {
  let b = '';
  b += box(20, 108, 190, 62, ['Phone number'], { boldFirst: false, s: TITLE });
  b += arrow(210, 139, 254, 139);
  b += box(254, 100, 250, 80, ['OTP challenge', '5 min, 5 attempts']);
  b += arrow(504, 139, 548, 139);
  b += box(548, 100, 250, 80, ['PIN, 4 to 6 digits', 'scrypt, salted']);
  b += arrow(798, 139, 842, 139);
  b += box(842, 100, 210, 80, ['Session issued', 'HS256 JWT']);

  b += arrow(1052, 124, 1096, 96);
  b += box(1096, 62, 220, 66, ['Access cookie', '15 minutes']);
  b += arrow(1052, 154, 1096, 186);
  b += box(1096, 158, 220, 80, ['Refresh cookie', '30 days, rotated']);

  b += arrow(673, 180, 673, 226);
  b += box(548, 226, 250, 66, ['5 fails, 10-min lock'], { boldFirst: false, s: TITLE });

  b += arrow(1206, 238, 1206, 284);
  b += box(1076, 284, 260, 80, ['Replay after 20 s grace', 'revokes the family']);

  return { name: 'diag-auth', svg: svg(1360, 392, b) };
}

/* ---------------------------------------------------- D5 deployment */
function d5() {
  let b = '';
  b += box(20, 120, 200, 62, ['Web browser'], { boldFirst: false, s: TITLE });
  b += box(20, 212, 200, 76, ['Feature phone', 'via USSD'], { boldFirst: false, s: TITLE, lh: 19 });

  b += cluster(258, 64, 440, 262, 'Cloudflare Worker: one instance, no horizontal scaling');
  b += box(282, 104, 392, 84, ['Next.js 15 via OpenNext', '58 route files, 84 handlers']);
  b += box(282, 208, 186, 62, ['Static assets'], { boldFirst: false, s: TITLE });
  b += box(488, 208, 186, 62, ['Images'], { boldFirst: false, s: TITLE });
  b += annot(282, 300, 'No R2 incremental cache binding.');

  b += arrow(220, 146, 254, 154);
  b += arrow(220, 244, 254, 214);

  b += cylinder(760, 120, 240, 104, ['libSQL / Turso', '47 tables, single writer']);
  b += arrow(698, 168, 756, 168);

  b += cluster(760, 268, 540, 196, 'External, key-gated, crosses the network boundary');
  b += box(782, 306, 246, 64, ['DeepSeek v4-flash'], { boldFirst: false, s: TITLE });
  b += box(1046, 306, 232, 64, ['Speech to text / TTS'], { boldFirst: false, s: TITLE });
  b += box(782, 384, 246, 64, ['Overpass and tiles'], { boldFirst: false, s: TITLE });
  b += box(1046, 384, 232, 64, ['SMS, demo mode'], { boldFirst: false, s: TITLE });
  b += arrow(700, 300, 756, 300);

  return { name: 'diag-deployment', svg: svg(1330, 486, b) };
}

(async () => {
  for (const d of [d1(), d2(), d3(), d4(), d5()]) {
    fs.writeFileSync(path.join(OUT, d.name + '.svg'), d.svg, 'utf-8');
    const p = path.join(OUT, d.name + '.png');
    const m = await sharp(Buffer.from(d.svg), { density: 144 })
      .trim({ threshold: 1 })
      .extend({ top: 24, bottom: 24, left: 24, right: 24, background: '#ffffff' })
      .png({ compressionLevel: 9 })
      .toFile(p);
    // on-page type size if displayed 7.0 inches (504 pt) wide
    const logicalW = Number(/width="(\d+)"/.exec(d.svg)[1]);
    const onPage = (TITLE / logicalW) * 504;
    console.log(`${d.name}.png  ${m.width}x${m.height}  ${(fs.statSync(p).size / 1024).toFixed(1)} KB  title type on page ~= ${onPage.toFixed(1)} pt`);
  }
})();

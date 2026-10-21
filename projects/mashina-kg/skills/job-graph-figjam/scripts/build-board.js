// Тело скрипта для use_figma (FigJam). compose.mjs ставит перед ним строку `const DATA = {...};`.
// Строит одну секцию «Граф работ» по образцу доски «Пример графа работ».
const FONT_M = { family: 'Inter', style: 'Medium' }, FONT_B = { family: 'Inter', style: 'Bold' };
await figma.loadFontAsync(FONT_M); await figma.loadFontAsync(FONT_B);
const hex = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const solid = h => [{ type: 'SOLID', color: hex(h) }];
const C = { bg: '#FFF2DF', bgStroke: '#FFA629', band: '#FFFFFF', head: '#FFFFFF', headStroke: '#CCCCCC',
  sol: '#FCD19C', solStroke: '#CAA77D', prob: '#F5A59E', probStroke: '#C4847F', line: '#1E1E1E',
  red: '#F24822', redDark: '#C23A1B', bad: '#818181', good: '#3D7D5B' };
const STAGE = ['#C91D00', '#DA5606', '#E68600', '#C9A000', '#85B814'];
const W = 700, GAP = 84, STEP = W + GAP, M = 110, PAD = 70;
const created = [];

function estParas(paras, width) { // paras: [{t, size}]
  let h = 0;
  for (const p of paras) { const cpl = Math.max(8, Math.floor((width - 48) / (p.size * 0.56))); h += Math.max(1, Math.ceil(p.t.length / cpl)) * p.size * 1.42; }
  return Math.ceil(h + 60);
}
function segsToParas(segs) { // разбиение на абзацы с размером первого сегмента абзаца
  const out = []; let cur = null;
  for (const s of segs) { const parts = s.t.split('\n'); parts.forEach((p, i) => { if (i > 0 || !cur) { cur = { t: '', size: s.size || 16 }; out.push(cur); } cur.t += p; }); }
  return out;
}
function shape(parent, o) {
  const s = figma.createShapeWithText(); s.shapeType = o.type || 'SQUARE'; parent.appendChild(s);
  s.x = o.x; s.y = o.y; s.resize(o.w, o.h);
  s.fills = o.fill ? solid(o.fill) : []; s.strokes = o.stroke ? solid(o.stroke) : [];
  if (o.dash) s.dashPattern = o.dash;
  if (o.segs && o.segs.length) {
    const t = s.text; t.fontName = FONT_M; t.characters = o.segs.map(g => g.t).join(''); t.fontSize = o.size || 16;
    let i = 0; for (const g of o.segs) { const e = i + g.t.length; if (e > i) { if (g.bold) t.setRangeFontName(i, e, FONT_B); if (g.size) t.setRangeFontSize(i, e, g.size); } i = e; }
    t.fills = solid(o.textColor || '#000000'); t.textAlignHorizontal = o.align || 'LEFT';
  }
  created.push(s.id); return s;
}
function jobSegs(j, big) {
  const ts = big ? 40 : 24, bs = big ? 24 : 16, a = [{ t: j.title + '\n', bold: true, size: ts }];
  if (j.when) a.push({ t: 'когда', bold: true, size: bs }, { t: ' ' + j.when + '\n', size: bs });
  if (j.want) a.push({ t: 'хочу', bold: true, size: bs }, { t: ' ' + j.want + '\n', size: bs });
  if (j.so) a.push({ t: 'чтобы', bold: true, size: bs }, { t: ' ' + j.so + '\n', size: bs });
  if (j.metrics) a.push({ t: j.metrics + '\n', size: bs });
  if (j.mashina) a.push({ t: 'Mashina сейчас:', bold: true, size: bs }, { t: ' ' + j.mashina + '\n', size: bs });
  a[a.length - 1].t = a[a.length - 1].t.replace(/\n$/, ''); return a;
}
const listSegs = (head, items) => [{ t: head + '\n', bold: true, size: 16 }, { t: items.map(x => '• ' + x).join('\n'), size: 16 }];
function connect(parent, from, fromMag, to, toMag, o = {}) {
  const c = figma.createConnector(); parent.appendChild(c);
  c.connectorStart = { endpointNodeId: from.id, magnet: fromMag }; c.connectorEnd = { endpointNodeId: to.id, magnet: toMag };
  c.connectorLineType = 'ELBOWED'; c.strokeWeight = 3; c.strokes = solid(o.color || C.line);
  c.connectorStartStrokeCap = 'NONE'; c.connectorEndStrokeCap = 'ARROW_LINES';
  if (o.dash) c.dashPattern = [16, 10];
  if (o.label) { c.text.fontName = FONT_M; c.text.characters = o.label; c.text.fontSize = 16; }
  created.push(c.id); return c;
}

// --- размеры
const D = DATA, nCols = Math.max(...D.jobs.map(j => j.col), ...D.stages.map(s => s.to)) + 1;
const nRows = Math.max(...D.jobs.map(j => j.row)) + 1;
for (const j of D.jobs) {
  j._hh = estParas(segsToParas(jobSegs(j)), W);
  j._sh = estParas(segsToParas(listSegs('Решения:', j.solutions || ['нет данных'])), W);
  j._ph = estParas(segsToParas(listSegs('Проблемы:', j.problems || ['нет данных'])), W);
}
const rowH = [...Array(nRows)].map((_, r) => Math.max(...D.jobs.filter(j => j.row === r).map(j => j._hh + j._sh + j._ph), 300));
const bigH = estParas(segsToParas(jobSegs(D.bigJob, true)), W);
const sideH = Math.max(0, ...(D.sideJobs || []).map(s => estParas(segsToParas(jobSegs(s, true)), W)));
const noteH = D.note ? estParas([{ t: D.note, size: 18 }], W) : 0;
const topY = 160, chevY = topY + Math.max(bigH, sideH, noteH) + 140, CH = 168;
const hasSub = (D.subStages || []).length > 0;
const rowTop = [], rowBottom = []; let y = chevY + CH + 20;
for (let r = 0; r < nRows; r++) { rowTop[r] = y; const extra = (r === 0 && hasSub) ? 130 : 0; rowBottom[r] = y + PAD + rowH[r] + PAD + extra; y = rowBottom[r] + 32; }
const BW = 760, hasDisc = !!D.disclaimer; // боковая плашка «сгенерировано»
const secW = M * 2 + nCols * STEP + (hasDisc ? BW + 120 : 0), secH = y + 120;
const colX = c => M + c * STEP + GAP / 2;

// --- секция
let maxRight = 0; for (const n of figma.currentPage.children) maxRight = Math.max(maxRight, n.x + n.width);
const sec = figma.createSection(); sec.name = D.title; sec.x = D.x ?? (maxRight + (maxRight ? 600 : 0)); sec.y = D.y ?? 0;
sec.resizeWithoutConstraints(secW, secH); sec.fills = solid(C.bg); created.push(sec.id);

// полосы уровней
for (let r = 0; r < nRows; r++) shape(sec, { x: M, y: rowTop[r], w: nCols * STEP, h: rowBottom[r] - rowTop[r], fill: C.band, segs: [] });
// повторы — пунктирная рамка + красная плашка
for (const rp of D.repeats || []) {
  const x = M + rp.cols[0] * STEP + 14, w = (rp.cols[1] - rp.cols[0] + 1) * STEP - 28;
  const yy = rowTop[rp.rows[0]] + 26, h = rowBottom[rp.rows[1]] - rowTop[rp.rows[0]] - 52;
  shape(sec, { x, y: yy, w, h, stroke: C.red, dash: [16, 10], segs: [] });
  const pw = Math.min(w - 40, Math.ceil(rp.label.length * 20 * 0.62 + 60));
  shape(sec, { x: x + w - pw - 40, y: yy + h - 20, w: pw, h: 40, type: 'ROUNDED_RECTANGLE', fill: C.red, stroke: C.redDark, segs: [{ t: rp.label }], size: 20, align: 'CENTER', textColor: '#FFFFFF' });
}
// большая работа, соседние Big, пояснение
const bigNode = shape(sec, { x: colX(0), y: topY, w: W, h: bigH, fill: C.head, stroke: C.headStroke, segs: jobSegs(D.bigJob, true) });
if (D.note) shape(sec, { x: colX(1), y: topY, w: W, h: noteH, fill: '#FFFFFF', stroke: C.headStroke, segs: [{ t: D.note, size: 18 }], size: 18 });
const sideNodes = {};
for (const s of D.sideJobs || []) sideNodes[s.id] = shape(sec, { x: colX(s.col), y: topY, w: W, h: estParas(segsToParas(jobSegs(s, true)), W), fill: C.head, stroke: C.headStroke, segs: jobSegs(s, true) });
// этапы
D.stages.forEach((s, i) => shape(sec, { x: M + s.from * STEP, y: chevY, w: (s.to - s.from + 1) * STEP - 4, h: CH, type: 'CHEVRON',
  fill: STAGE[Math.round(i * (STAGE.length - 1) / Math.max(1, D.stages.length - 1))], segs: [{ t: s.title }], size: 44, align: 'CENTER', textColor: '#FFFFFF' }));
for (const s of D.subStages || []) shape(sec, { x: M + s.from * STEP + 14, y: rowBottom[0] - 120, w: (s.to - s.from + 1) * STEP - 30, h: 86, type: 'CHEVRON',
  fill: s.tone === 'good' ? C.good : C.bad, segs: [{ t: s.title, bold: true }], size: 32, align: 'CENTER', textColor: '#FFFFFF' });
// карточки работ: заголовок + решения + проблемы
const nodes = {};
for (const j of D.jobs) {
  const x = colX(j.col), y0 = rowTop[j.row] + PAD;
  const head = shape(sec, { x, y: y0, w: W, h: j._hh, fill: C.head, stroke: C.headStroke, segs: jobSegs(j) });
  const sol = shape(sec, { x, y: y0 + j._hh, w: W, h: j._sh, fill: C.sol, stroke: C.solStroke, segs: listSegs('Решения:', j.solutions || ['нет данных']) });
  const prob = shape(sec, { x, y: y0 + j._hh + j._sh, w: W, h: j._ph, fill: C.prob, stroke: C.probStroke, segs: listSegs('Проблемы:', j.problems || ['нет данных']) });
  nodes[j.id] = { head, sol, prob };
}
// связи
for (const e of D.edges || []) {
  const a = nodes[e.from], b = nodes[e.to]; if (!a || !b) continue;
  if (e.kind === 'down') connect(sec, a.prob, 'BOTTOM', b.head, 'TOP', e);
  else if (e.kind === 'back') connect(sec, a.head, 'TOP', b.head, 'TOP', e);
  else connect(sec, a.head, 'RIGHT', b.head, 'LEFT', e);
}
for (const s of D.sideJobs || []) for (const t of s.targets || []) if (nodes[t]) connect(sec, sideNodes[s.id], 'BOTTOM', nodes[t].head, 'TOP', { color: C.red, dash: true });
// плашка справа от графа, на всю высоту: заметна, но не перекрывает работы
if (hasDisc) {
  const NL = String.fromCharCode(10);
  const segs = [{ t: '! СОБРАНО ИЗ ИНТЕРНЕТА И ПРИДУМАНО' + NL, bold: true, size: 52 }, { t: 'без общения с клиентами' + NL + NL, bold: true, size: 34 }, { t: D.disclaimer, size: 28 }];
  const b = shape(sec, { x: M + nCols * STEP + 60, y: 160, w: BW, h: Math.min(secH - 280, 1000), fill: '#FFE8A3', stroke: C.red, segs, textColor: '#7A1E0A' });
  try { b.strokeWeight = 10; } catch (e) {}
}
return { sectionId: sec.id, created: created.length, size: [secW, secH] };

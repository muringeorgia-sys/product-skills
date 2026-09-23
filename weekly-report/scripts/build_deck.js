// Mashina.kg weekly deck builder (pptxgenjs, 16:9).
// Usage (run from the Mashina.kg project folder so node_modules resolves):
//   node <skill>/scripts/build_deck.js <deck_data.json> <out.pptx>
// Slide order is fixed by the three-part structure: 1) аналитика, 2) что сделали, 3) что делаем.
// Every block of deck_data.json is optional; a missing block skips its slide.
const fs = require('fs');
const path = require('path');
let pptxgen;
try { pptxgen = require('pptxgenjs'); } catch { pptxgen = require(path.join(process.cwd(), 'node_modules', 'pptxgenjs')); }

const [dataPath, outPath] = process.argv.slice(2);
if (!dataPath || !outPath) throw new Error('usage: node build_deck.js <deck_data.json> <out.pptx>');
const D = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const C = {
  navy: '24324A', navy2: '33445F', blue: '315BA8', blue2: '9DB4DE', bluePale: 'EAF0FA', pale: 'F4F6FA',
  green: '2F8A62', greenPale: 'EAF7F1', red: 'C84D4D', redPale: 'FCEDED', orange: 'B8661A', orangePale: 'FFF2E6',
  gray: '667085', gray2: '98A2B3', line: 'DCE2EA', white: 'FFFFFF', prev: 'B8C1CF',
};
const TONE = { good: [C.greenPale, C.green], bad: [C.redPale, C.red], warn: [C.orangePale, C.orange], neutral: [C.pale, C.blue] };
const F = 'Arial';
const W = 13.333, M = 0.6, CW = W - 2 * M;

// неразрывный пробел в числах «4 913», чтобы число не рвалось на две строки
const nb = t => (typeof t === 'string' ? t.replace(/(\d) (?=\d{3}(?!\d))/g, '$1 ') : t);
const runs = r => (Array.isArray(r) ? r.map(x => ({ ...x, text: nb(x.text) })) : nb(r));
const int = v => Math.round(v).toLocaleString('ru-RU').replace(/\s/g, ' ');
const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + int(Math.abs(v));
const pct = (cur, prev) => {
  if (!prev) return 'н/д';
  const p = (cur / prev - 1) * 100;
  return (p > 0 ? '+' : p < 0 ? '−' : '') + Math.abs(p).toFixed(1).replace('.', ',') + '%';
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = D.meta?.title || 'Еженедельный отчёт Mashina.kg';
let slideNo = 0;

const text = (s, t, o) => s.addText(runs(t), { fontFace: F, isTextBox: true, margin: 0, valign: 'top', color: C.navy, fontSize: 14, ...o });
const rect = (s, o) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { rectRadius: 0.08, line: { color: C.line, width: 0.75 }, fill: { color: C.pale }, ...o });
const axis = { catAxisLabelColor: C.gray, valAxisLabelColor: C.gray, catAxisLabelFontFace: F, valAxisLabelFontFace: F, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, valGridLine: { color: C.line, size: 0.5 }, catGridLine: { style: 'none' }, valAxisLabelFormatCode: '#,##0' };
const chartTitle = t => ({ showTitle: true, title: t, titleFontSize: 12, titleColor: C.navy, titleFontFace: F });

function base(b) {
  const s = pres.addSlide();
  slideNo++;
  s.background = { color: C.white };
  const chipW = b.section.length * 0.09 + 0.5;
  rect(s, { x: M, y: 0.35, w: chipW, h: 0.32, rectRadius: 0.16, fill: { color: C.bluePale }, line: { color: C.bluePale, width: 0 } });
  text(s, b.section, { x: M, y: 0.35, w: chipW, h: 0.32, fontSize: 11, bold: true, color: C.blue, align: 'center', valign: 'middle' });
  text(s, b.title, { x: M, y: 0.78, w: CW, h: 0.62, fontSize: 28, bold: true, valign: 'middle', fit: 'shrink' });
  if (b.subtitle) text(s, b.subtitle, { x: M, y: 1.4, w: CW, h: 0.42, fontSize: 14, color: C.gray, valign: 'middle', fit: 'shrink' });
  // Формат, утверждённый 15.09: на слайде нет строки источника и номера страницы — источник и расчёты в заметках
  const notes = [b.source && `Источник: ${b.source}`, b.notes].filter(Boolean).join('\n\n');
  if (notes) s.addNotes(notes);
  return s;
}

// Всплывающая подсказка: прозрачный прямоугольник поверх элемента с гиперссылкой.
// t = { src, calc } — src ссылается на D.sources[src] = { dashboard, block, report, url }:
//   подсказка «Дашборд / Блок / Отчёт / Расчёт», клик (в редакторе Ctrl+клик) открывает отчёт в Redash.
// t = { source, calc } — источник без отчёта на дашборде (SQL-выборка): ссылка на этот же слайд, клик никуда не ведёт.
// ScreenTip длиннее 255 символов PowerPoint обрезает: «Расчёт» укорачивается, полный расчёт — в заметках слайда.
const NL = ' '; // маркер переноса строки, заменяется на &#xA; после сборки
function tip(s, x, y, w, h, t) {
  if (!t) return;
  const o = typeof t === 'string' ? { calc: t } : t;
  const src = o.src ? D.sources?.[o.src] : null;
  if (o.src && !src) throw new Error(`unknown tooltip source "${o.src}" on slide ${slideNo}`);
  // блока может не быть: на дашборде нет текстовых заголовков — тогда строку «Блок» не выводим
  const head = src ? [`Дашборд: ${src.dashboard}`, src.block && `Блок: ${src.block}`, `Отчёт: ${src.report}`].filter(Boolean) : (o.source ? [o.source] : []);
  let calc = o.calc ? `Расчёт: ${o.calc}` : '';
  let body = [...head, calc].filter(Boolean).join(NL);
  if (body.length > 255) {
    const room = 255 - head.join(NL).length - NL.length - 1;
    console.warn(`tooltip trimmed on slide ${slideNo}: ${calc}`);
    calc = calc.slice(0, Math.max(room, 0)) + '…';
    body = [...head, calc].join(NL);
  }
  const hyperlink = src?.url ? { url: src.url, tooltip: body } : { slide: slideNo, tooltip: body };
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: 'FFFFFF', transparency: 100 }, line: { type: 'none' }, hyperlink });
}

// Карточка «заголовок + текст»
function card(s, { x, y, w, h, title, body, tone = 'neutral', titleSize = 13, bodySize = 11, tip: t }) {
  const [bg, ac] = TONE[tone] || TONE.neutral;
  rect(s, { x, y, w, h, fill: { color: bg } });
  text(s, [
    { text: title, options: { bold: true, color: ac, fontSize: titleSize, breakLine: true } },
    { text: body, options: { color: C.navy, fontSize: bodySize } },
  ], { x: x + 0.18, y: y + 0.12, w: w - 0.36, h: h - 0.24, fit: 'shrink', paraSpaceAfter: 4 });
  tip(s, x, y, w, h, t);
}

// Список «где растём / где проседаем»: каждый пункт в своём блоке, чтобы у пункта была своя подсказка
function bulletBox(s, { x, y, w, h, title, items, tone }) {
  const [bg, ac] = TONE[tone];
  rect(s, { x, y, w, h, fill: { color: bg } });
  text(s, title, { x: x + 0.2, y: y + 0.1, w: w - 0.4, h: 0.32, fontSize: 14, bold: true, color: ac, valign: 'middle' });
  const top = y + 0.45, ih = (h - 0.55) / items.length;
  items.forEach((it, i) => {
    const t = typeof it === 'string' ? { text: it } : it;
    text(s, [{ text: nb(t.text), options: { bullet: { indent: 12 }, fontSize: 11, color: C.navy } }], { x: x + 0.2, y: top + i * ih, w: w - 0.4, h: ih, fit: 'shrink', valign: 'middle' });
    tip(s, x + 0.1, top + i * ih, w - 0.2, ih, t.tip);
  });
}

function bulletList(items, size = 11.5) {
  return items.map((t, i) => ({ text: nb(t), options: { bullet: { indent: 12 }, fontSize: size, color: C.navy, breakLine: i < items.length - 1, paraSpaceAfter: 6 } }));
}

// ---------- 0. Обложка ----------
if (D.meta) {
  const s = pres.addSlide();
  slideNo++;
  s.background = { color: C.navy };
  text(s, 'Еженедельный отчёт', { x: M, y: 1.2, w: CW, h: 0.45, fontSize: 18, bold: true, color: C.blue2 });
  text(s, D.meta.title, { x: M, y: 1.7, w: CW, h: 1.0, fontSize: 44, bold: true, color: C.white, valign: 'middle' });
  text(s, D.meta.period, { x: M, y: 2.75, w: CW, h: 0.5, fontSize: 22, color: C.white });
  if (D.meta.subtitle) text(s, D.meta.subtitle, { x: M, y: 3.3, w: CW, h: 0.4, fontSize: 14, color: C.blue2 });
  const parts = D.meta.parts || [];
  const pw = (CW - 0.3 * (parts.length - 1)) / Math.max(parts.length, 1);
  parts.forEach((p, i) => {
    const x = M + i * (pw + 0.3);
    rect(s, { x, y: 4.45, w: pw, h: 1.65, fill: { color: C.navy2 }, line: { color: C.navy2, width: 0 } });
    text(s, [
      { text: p.n, options: { fontSize: 16, bold: true, color: C.blue2, breakLine: true } },
      { text: p.name, options: { fontSize: 20, bold: true, color: C.white, breakLine: !!p.desc } },
      ...(p.desc ? [{ text: p.desc, options: { fontSize: 12, color: 'C9D3E3' } }] : []),
    ], { x: x + 0.25, y: 4.6, w: pw - 0.5, h: 1.4, paraSpaceAfter: 4, fit: 'shrink' });
  });
  if (D.meta.cutoff) text(s, D.meta.cutoff, { x: M, y: 6.6, w: CW, h: 0.4, fontSize: 11, color: C.blue2, valign: 'middle' });
  if (D.meta.notes) s.addNotes(D.meta.notes);
}

// ---------- 1.1 Состояние продукта: KPI ----------
// Слайд парсера (`parser_kpis`) идёт сразу после «Состояния продукта» и рисуется тем же макетом плиток
for (const b of [D.kpis, D.parser_kpis].filter(Boolean)) {
  const s = base(b);
  // `b.chart` — диаграмма изменений под плитками: { title, labels, values } в процентах.
  // Рост и падение рисуются двумя сериями, чтобы столбцы красились зелёным и красным.
  const gap = 0.25, tw = (CW - gap * 3) / 4, th = b.chart ? 1.3 : 2.1;
  b.items.forEach((k, i) => {
    const x = M + (i % 4) * (tw + gap), y = 1.98 + Math.floor(i / 4) * (th + gap);
    const [bg, ac] = TONE[k.tone] || TONE.neutral;
    rect(s, { x, y, w: tw, h: th, fill: { color: bg } });
    // с диаграммой плитка короче: подпись под дельтой не выводим, её место занимает график
    const k1 = b.chart ? 0.12 : 0.16, vh = b.chart ? 0.52 : 0.66, vs = b.chart ? 26 : 30;
    text(s, k.label, { x: x + 0.2, y: y + k1, w: tw - 0.4, h: 0.3, fontSize: 12, bold: true, color: C.gray, fit: 'shrink' });
    text(s, k.value, { x: x + 0.2, y: y + k1 + 0.32, w: tw - 0.4, h: vh, fontSize: vs, bold: true, valign: 'middle', fit: 'shrink' });
    text(s, k.delta, { x: x + 0.2, y: y + k1 + 0.32 + vh, w: tw - 0.4, h: 0.32, fontSize: 14, bold: true, color: ac, valign: 'middle' });
    if (!b.chart) text(s, k.note, { x: x + 0.2, y: y + k1 + 0.66 + vh, w: tw - 0.4, h: 0.5, fontSize: 10, color: C.gray, fit: 'shrink' });
    tip(s, x, y, tw, th, k.tip);
  });
  if (b.chart) {
    const ch = b.chart, y = 1.98 + 2 * (th + gap) + 0.1;
    // одна серия с раскраской по точкам (varyColors): у стопки из двух серий над каждым столбцом
    // появляется лишняя подпись «0,0» от пустой серии
    s.addChart(pres.charts.BAR, [{ name: 'Изменение, %', labels: ch.labels, values: ch.values }], {
      x: M, y, w: CW, h: 6.8 - y, barDir: 'col', barGapWidthPct: 45,
      chartColors: ch.values.map(v => (v >= 0 ? C.green : C.red)), varyColors: true,
      showLegend: false, showValue: true, dataLabelPosition: 'outEnd',
      dataLabelFontSize: 9, dataLabelColor: C.gray, dataLabelFormatCode: '0.0;-0.0',
      ...axis, catAxisLabelFontSize: 9, valAxisLabelFormatCode: '0;-0', ...chartTitle(ch.title),
    });
    tip(s, M, y, CW, 6.8 - y, ch.tip);
  } else if (b.note) {
    text(s, b.note, { x: M, y: 6.52, w: CW, h: 0.34, fontSize: 11, color: C.gray, valign: 'middle', fit: 'shrink' });
  }
}

// ---------- 1.2 Выручка: где растём, где проседаем ----------
if (D.revenue) {
  const b = D.revenue, s = base(b);
  const hdr = t => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.blue }, fontSize: 11 } });
  const rows = [[hdr('Направление'), hdr(b.prev_label), hdr(b.cur_label), hdr('Δ, сом'), hdr('Δ, %')]];
  let tp = 0, tc = 0;
  b.lines.forEach(l => {
    const d = l.cur - l.prev, col = d >= 0 ? C.green : C.red;
    tp += l.prev; tc += l.cur;
    rows.push([
      { text: nb(l.name), options: { bold: true } }, int(l.prev), int(l.cur),
      { text: signed(d), options: { color: col, bold: true } }, { text: pct(l.cur, l.prev), options: { color: col, bold: true } },
    ]);
  });
  rows.push([{ text: 'Итого', options: { bold: true, fill: { color: C.pale } } }, { text: int(tp), options: { bold: true, fill: { color: C.pale } } }, { text: int(tc), options: { bold: true, fill: { color: C.pale } } }, { text: signed(tc - tp), options: { bold: true, fill: { color: C.pale } } }, { text: pct(tc, tp), options: { bold: true, fill: { color: C.pale } } }]);
  s.addTable(rows, { x: M, y: 1.98, w: 7.2, colW: [2.6, 1.2, 1.2, 1.2, 1.0], rowH: 0.4, fontFace: F, fontSize: 11, color: C.navy, valign: 'middle', border: { type: 'solid', pt: 0.75, color: C.line } });
  const labels = b.lines.map(l => l.name);
  s.addChart(pres.charts.BAR, [
    { name: 'Рост', labels, values: b.lines.map(l => Math.max(l.cur - l.prev, 0)) },
    { name: 'Падение', labels, values: b.lines.map(l => Math.min(l.cur - l.prev, 0)) },
  ], { x: 8.05, y: 1.9, w: 4.68, h: 2.75, barDir: 'bar', barGrouping: 'stacked', barGapWidthPct: 60, chartColors: [C.green, C.red], showLegend: false, catAxisLabelPos: 'low', ...axis, ...chartTitle('Изменение выручки, сом') });
  // подсказки: строки таблицы (шапка 0,4", далее по 0,4" на строку) и диаграмма
  b.lines.forEach((l, i) => tip(s, M, 1.98 + 0.4 * (i + 1), 7.2, 0.4, l.tip));
  tip(s, M, 1.98 + 0.4 * (b.lines.length + 1), 7.2, 0.4, b.total_tip);
  tip(s, 8.05, 1.9, 4.68, 2.75, b.chart_tip);
  const cw = (CW - 0.3) / 2;
  bulletBox(s, { x: M, y: 4.85, w: cw, h: 1.95, title: 'Где растём', items: b.grow, tone: 'good' });
  bulletBox(s, { x: M + cw + 0.3, y: 4.85, w: cw, h: 1.95, title: 'Где проседаем', items: b.drop, tone: 'bad' });
}

// ---------- 1.3 Предложение и привлечение ----------
if (D.supply) {
  const b = D.supply, s = base(b);
  const gap = 0.25, tw = (CW - gap * 3) / 4;
  b.tiles.forEach((k, i) => {
    const x = M + i * (tw + gap), [bg, ac] = TONE[k.tone] || TONE.neutral;
    rect(s, { x, y: 1.98, w: tw, h: 1.25, fill: { color: bg } });
    text(s, k.label, { x: x + 0.2, y: 2.06, w: tw - 0.4, h: 0.3, fontSize: 12, bold: true, color: C.gray });
    text(s, k.value, { x: x + 0.2, y: 2.36, w: tw - 0.4, h: 0.48, fontSize: 24, bold: true, valign: 'middle', fit: 'shrink' });
    text(s, k.delta, { x: x + 0.2, y: 2.84, w: tw - 0.4, h: 0.3, fontSize: 13, bold: true, color: ac, valign: 'middle', fit: 'shrink' });
    tip(s, x, 1.98, tw, 1.25, k.tip);
  });
  const ch = b.chart;
  s.addChart(pres.charts.LINE, [
    { name: ch.prev_label, labels: ch.labels, values: ch.prev },
    { name: ch.cur_label, labels: ch.labels, values: ch.cur },
  ], { x: M, y: 3.42, w: 7.55, h: 3.4, chartColors: [C.prev, C.blue], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 6, showLegend: true, legendPos: 'b', legendFontSize: 10, legendFontFace: F, legendColor: C.gray, ...axis, ...chartTitle(ch.title) });
  tip(s, M, 3.42, 7.55, 3.4, ch.tip);
  const cx = M + 7.8, cwid = CW - 7.8, chh = (3.4 - 0.15 * (b.callouts.length - 1)) / b.callouts.length;
  b.callouts.forEach((c, i) => card(s, { x: cx, y: 3.42 + i * (chh + 0.15), w: cwid, h: chh, ...c }));
}

// ---------- 2.1 Что сделали ----------
if (D.done) {
  const b = D.done, s = base(b);
  const lw = 4.1, sh = (4.82 - 0.2 * (b.stats.length - 1)) / b.stats.length;
  b.stats.forEach((st, i) => {
    const y = 1.98 + i * (sh + 0.2);
    rect(s, { x: M, y, w: lw, h: sh, fill: { color: C.bluePale } });
    text(s, st.value, { x: M + 0.2, y: y + 0.1, w: 1.35, h: sh - 0.2, fontSize: 34, bold: true, color: C.blue, valign: 'middle', fit: 'shrink' });
    text(s, [{ text: st.label, options: { bold: true, fontSize: 13, color: C.navy, breakLine: true } }, { text: st.detail, options: { fontSize: 10, color: C.gray } }], { x: M + 1.6, y: y + 0.12, w: lw - 1.8, h: sh - 0.24, valign: 'middle', fit: 'shrink', paraSpaceAfter: 3 });
  });
  const rx = M + lw + 0.35, rw = CW - lw - 0.35;
  text(s, b.docs_title, { x: rx, y: 1.98, w: rw, h: 0.36, fontSize: 14, bold: true, valign: 'middle' });
  const half = Math.ceil(b.docs.length / 2), colw = (rw - 0.3) / 2, ih = 4.35 / half;
  b.docs.forEach((d, i) => {
    const x = rx + (i < half ? 0 : colw + 0.3), y = 2.45 + (i < half ? i : i - half) * ih;
    s.addShape(pres.shapes.OVAL, { x, y: y + 0.1, w: 0.14, h: 0.14, fill: { color: C.blue }, line: { color: C.blue, width: 0 } });
    text(s, [{ text: d.title, options: { bold: true, fontSize: 12, color: C.navy, breakLine: true } }, { text: d.detail, options: { fontSize: 10, color: C.gray } }], { x: x + 0.28, y, w: colw - 0.3, h: ih - 0.08, fit: 'shrink', paraSpaceAfter: 2 });
  });
}

// ---------- 2.2 Инициатива: таблица по периодам ----------
// Можно передать один блок `parser_table` или массив `parser_tables` — по слайду на таблицу.
for (const b of [].concat(D.parser_tables || D.parser_table || [])) {
  const s = base(b);
  const hl = b.highlight_col ?? 1, rh = b.row_h ?? 0.37, fs = b.font_size ?? 11.5;
  const rows = [b.columns.map((t, i) => ({ text: nb(t), options: { bold: true, color: C.white, fill: { color: i === hl ? C.blue : C.navy2 }, fontSize: 11, align: i ? 'center' : 'left' } }))];
  b.rows.forEach(r => rows.push(r.map((t, i) => ({ text: nb(t), options: { bold: i === hl, align: i ? 'center' : 'left', fill: { color: i === hl ? C.bluePale : C.white } } }))));
  const firstW = b.first_col_w ?? 4.3, restW = (CW - firstW) / (b.columns.length - 1);
  s.addTable(rows, { x: M, y: 1.98, w: CW, colW: [firstW, ...Array(b.columns.length - 1).fill(restW)], rowH: rh, fontFace: F, fontSize: fs, color: C.navy, valign: 'middle', border: { type: 'solid', pt: 0.75, color: C.line } });
  const callouts = b.callouts || [];
  if (callouts.length) {
    const n = callouts.length, cw = (CW - 0.25 * (n - 1)) / n, y = 1.98 + rh * rows.length + 0.25;
    callouts.forEach((c, i) => card(s, { x: M + i * (cw + 0.25), y, w: cw, h: 6.8 - y, ...c }));
  }
}

// ---------- 1.4 Инсайты ----------
if (D.insights) {
  const b = D.insights, s = base(b);
  const cw = (CW - 0.3) / 2, chh = 2.1;
  b.cards.forEach((c, i) => {
    const x = M + (i % 2) * (cw + 0.3), y = 1.98 + Math.floor(i / 2) * (chh + 0.2);
    const [bg, ac] = TONE[c.tone] || TONE.neutral;
    rect(s, { x, y, w: cw, h: chh, fill: { color: bg } });
    const line = (label, v, last) => [
      { text: label + ': ', options: { bold: true, color: ac, fontSize: 11.5 } },
      { text: nb(v), options: { color: C.navy, fontSize: 11.5, breakLine: !last } },
    ];
    // «Факт / Проверка / Вывод», когда анализ уже проведён (поля check и conclusion),
    // иначе старая тройка «Факт / Гипотеза / Действие»
    const rows_ = [['Факт', c.fact], ['Проверка', c.check], ['Вывод', c.conclusion], ['Гипотеза', c.hypothesis], ['Действие', c.action]].filter(([, v]) => v);
    text(s, [
      { text: nb(c.title), options: { bold: true, fontSize: 15, color: C.navy, breakLine: true } },
      ...rows_.flatMap(([l, v], i) => line(l, v, i === rows_.length - 1)),
    ], { x: x + 0.22, y: y + 0.14, w: cw - 0.44, h: chh - 0.28, paraSpaceAfter: 5, fit: 'shrink' });
    tip(s, x, y, cw, chh, c.tip);
  });
  if (b.footer_line) text(s, b.footer_line, { x: M, y: 6.46, w: CW, h: 0.4, fontSize: 11.5, color: C.orange, bold: true, valign: 'middle', fit: 'shrink' });
}

// ---------- 2.3 Инициатива: динамика ----------
if (D.parser_dynamics) {
  const b = D.parser_dynamics, s = base(b);
  const lw = 7.95;
  s.addChart(pres.charts.BAR, [{ name: 'Отправлено сообщений', labels: b.labels, values: b.sent }], { x: M, y: 1.9, w: lw, h: 2.6, barDir: 'col', barGapWidthPct: 40, chartColors: [C.blue], showLegend: false, showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 8, dataLabelColor: C.gray, dataLabelFormatCode: '#,##0', ...axis, catAxisLabelFontSize: 8, ...chartTitle('Отправлено сообщений по дням') });
  s.addChart(pres.charts.LINE, [{ name: 'Регистрации', labels: b.labels, values: b.registered }], { x: M, y: 4.55, w: lw, h: 2.3, chartColors: [C.green], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 6, showLegend: false, showValue: true, dataLabelPosition: 't', dataLabelFontSize: 8, dataLabelColor: C.gray, ...axis, catAxisLabelFontSize: 8, ...chartTitle('Регистрации по дню контакта') });
  const cx = M + lw + 0.25, cwid = CW - lw - 0.25, n = b.cards.length, chh = (4.9 - 0.15 * (n - 1)) / n;
  b.cards.forEach((c, i) => card(s, { x: cx, y: 1.98 + i * (chh + 0.15), w: cwid, h: chh, ...c }));
}

// ---------- 3.1 Что делаем: колонки доски ----------
if (D.doing) {
  const b = D.doing, s = base(b);
  const n = b.columns.length, gap = 0.2, cw = (CW - gap * (n - 1)) / n;
  const maxItems = Math.max(...b.columns.map(c => c.items.length), 1);
  const cardH = Math.min(0.95, (4.15 - 0.06 * (maxItems - 1)) / maxItems);
  b.columns.forEach((col, i) => {
    const x = M + i * (cw + gap);
    rect(s, { x, y: 1.95, w: cw, h: 0.42, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
    text(s, [{ text: nb(col.name), options: { bold: true, color: C.white, fontSize: 12 } }, { text: '  ' + col.items.length, options: { bold: true, color: C.blue2, fontSize: 12 } }], { x: x + 0.15, y: 1.95, w: cw - 0.3, h: 0.42, valign: 'middle', fit: 'shrink' });
    col.items.forEach((it, j) => {
      const y = 2.47 + j * (cardH + 0.06);
      rect(s, { x, y, w: cw, h: cardH, fill: { color: C.pale } });
      text(s, [
        { text: `${it.key} · ${it.tag}`, options: { bold: true, color: C.blue, fontSize: 9, breakLine: true } },
        { text: nb(it.title), options: { color: C.navy, fontSize: 11, bold: true, breakLine: true } },
        { text: nb(it.owner), options: { color: C.gray, fontSize: 9 } },
      ], { x: x + 0.14, y: y + 0.07, w: cw - 0.28, h: cardH - 0.14, fit: 'shrink', paraSpaceAfter: 1 });
    });
  });
}

// ---------- 3.x Спринты из таблицы задач ----------
// Приоритеты CEO (references/ceo-priorities.json): задачи, отмеченные на встрече, красятся в зелёный на слайдах спринтов.
// Совпадение по ключу Jira в теге или названии задачи; если у приоритета нет ключа — по названию без кавычек и регистра.
const GREEN = '00B050';
const normTitle = s => String(s || '').toLowerCase().replace(/[«»"'().]/g, '').replace(/\s+/g, ' ').trim();
let CEO = [];
try { CEO = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'references', 'ceo-priorities.json'), 'utf8')).tasks || []; } catch { CEO = []; }
const matchedCEO = new Set();
function isCeoPriority(it) {
  // `it.jira` — ключи задачи, которые на слайд не выводятся (подпись задачи — только название),
  // но нужны, чтобы узнать приоритет CEO. Совпадение ищем и в них, и в видимых теге с названием.
  const hay = `${it.tag || ''} ${it.jira || ''} ${it.title || ''}`;
  const hit = CEO.find(p => (p.jira && new RegExp(`${p.jira}(?!\\d)`).test(hay)) || (!p.jira && normTitle(p.title) === normTitle(it.title)));
  if (hit) matchedCEO.add(hit.jira || hit.title);
  return !!(it.highlight || hit);
}
// Блок `sprints` — массив слайдов: сводка-плашки сверху и колонки ниже.
// Колонка `compact: true` — список строками (много задач), иначе карточки с тегом и примечанием.
for (const b of [].concat(D.sprints || [])) {
  const s = base(b);
  const k = b.summary.length, gw = 0.18, chipW = (CW - gw * (k - 1)) / k;
  b.summary.forEach((c, i) => {
    const [bg, ac] = TONE[c.tone] || TONE.neutral, x = M + i * (chipW + gw);
    rect(s, { x, y: 1.95, w: chipW, h: 0.62, fill: { color: bg } });
    text(s, [{ text: String(c.value), options: { bold: true, fontSize: 20, color: ac } }, { text: '  ' + nb(c.label), options: { fontSize: 11, color: C.navy } }], { x: x + 0.15, y: 1.95, w: chipW - 0.3, h: 0.62, valign: 'middle', fit: 'shrink' });
  });
  const n = b.columns.length, gap = 0.25, cw = (CW - gap * (n - 1)) / n, top = 2.78, bottom = 6.8;
  b.columns.forEach((col, i) => {
    const x = M + i * (cw + gap), [bg, ac] = TONE[col.tone] || TONE.neutral, head = col.tone ? ac : C.navy;
    rect(s, { x, y: top, w: cw, h: 0.4, fill: { color: head }, line: { color: head, width: 0 } });
    // `col.hide_count: true` — не выводить число задач рядом с названием колонки:
    // нужно там, где название не про количество («Продуктовый аналитик 3» читается как три аналитика)
    text(s, [{ text: nb(col.name), options: { bold: true, color: C.white, fontSize: 12 } }, ...(col.hide_count ? [] : [{ text: '  ' + col.items.length, options: { bold: true, color: C.white, fontSize: 12 } }])], { x: x + 0.15, y: top, w: cw - 0.3, h: 0.4, valign: 'middle', fit: 'shrink' });
    const y0 = top + 0.48, avail = bottom - y0;
    if (col.compact) {
      const lh = Math.min(0.34, avail / Math.max(col.items.length, 1));
      col.items.forEach((it, j) => {
        const hl = isCeoPriority(it) ? GREEN : null;
        const runs_ = [{ text: nb(it.title), options: { fontSize: 11, color: hl || C.navy, bold: true } }];
        if (it.tag) runs_.push({ text: '  ' + nb(it.tag), options: { fontSize: 9.5, color: hl || C.gray } });
        text(s, runs_, { x: x + 0.12, y: y0 + j * lh, w: cw - 0.24, h: lh, valign: 'middle', fit: 'shrink' });
        s.addShape(pres.shapes.LINE, { x: x + 0.12, y: y0 + (j + 1) * lh, w: cw - 0.24, h: 0, line: { color: C.line, width: 0.5 } });
      });
    } else {
      const ch = Math.min(1.0, (avail - 0.08 * (col.items.length - 1)) / Math.max(col.items.length, 1));
      col.items.forEach((it, j) => {
        const y = y0 + j * (ch + 0.08);
        rect(s, { x, y, w: cw, h: ch, fill: { color: bg } });
        const runs_ = [];
        const hl = isCeoPriority(it) ? GREEN : null;
        if (it.tag) runs_.push({ text: nb(it.tag), options: { bold: true, color: hl || ac, fontSize: 9, breakLine: true } });
        runs_.push({ text: nb(it.title), options: { bold: true, color: hl || C.navy, fontSize: 12, breakLine: !!it.note } });
        if (it.note) runs_.push({ text: nb(it.note), options: { fontSize: 10, color: C.gray } });
        text(s, runs_, { x: x + 0.14, y: y + 0.06, w: cw - 0.28, h: ch - 0.12, fit: 'shrink', paraSpaceAfter: 1, valign: 'middle' });
      });
    }
  });
}

// ---------- 3.2 Фокус и решения ----------
if (D.next) {
  const b = D.next, s = base(b);
  const lw = 7.5, ih = 4.75 / b.actions.length;
  b.actions.forEach((a, i) => {
    const y = 1.98 + i * ih;
    s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.05, w: 0.46, h: 0.46, fill: { color: C.blue }, line: { color: C.blue, width: 0 } });
    text(s, String(i + 1), { x: M, y: y + 0.05, w: 0.46, h: 0.46, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle' });
    // owner выводится только если он есть в источниках: пустых «нужно подтвердить» на слайде нет
    text(s, [
      { text: nb(a.title), options: { bold: true, fontSize: 15, color: C.navy, breakLine: true } },
      { text: nb(a.detail), options: { fontSize: 11.5, color: C.navy, breakLine: !!a.owner } },
      ...(a.owner ? [{ text: nb(a.owner), options: { fontSize: 10, color: C.orange, bold: true } }] : []),
    ], { x: M + 0.7, y, w: lw - 0.7, h: ih - 0.1, fit: 'shrink', paraSpaceAfter: 3 });
  });
  const rx = M + lw + 0.3, rw = CW - lw - 0.3;
  const hasGaps = !!b.gaps?.length, dh = hasGaps ? 2.55 : Math.min(4.82, 0.75 + 0.8 * b.decisions.length);
  rect(s, { x: rx, y: 1.98, w: rw, h: dh, fill: { color: C.bluePale } });
  text(s, [{ text: 'Нужно решение CEO', options: { bold: true, fontSize: 14, color: C.blue, breakLine: true } }, ...bulletList(b.decisions, 12)], { x: rx + 0.22, y: 2.1, w: rw - 0.44, h: dh - 0.25, fit: 'shrink', paraSpaceAfter: 6 });
  if (hasGaps) {
    rect(s, { x: rx, y: 4.7, w: rw, h: 2.1, fill: { color: C.orangePale } });
    text(s, [{ text: 'Пробелы данных', options: { bold: true, fontSize: 14, color: C.orange, breakLine: true } }, ...bulletList(b.gaps, 11)], { x: rx + 0.22, y: 4.82, w: rw - 0.44, h: 1.86, fit: 'shrink', paraSpaceAfter: 3 });
  }
}

// ---------- Приложение: определения ----------
if (D.appendix) {
  const b = D.appendix, s = base(b);
  const hdr = t => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.navy2 }, fontSize: 10.5 } });
  const rows = [[hdr('Показатель'), hdr('Определение'), hdr('Источник')], ...b.rows.map(r => [{ text: nb(r[0]), options: { bold: true } }, nb(r[1]), nb(r[2])])];
  s.addTable(rows, { x: M, y: 1.95, w: CW, colW: [2.6, 7.2, 2.33], rowH: 0.4, fontFace: F, fontSize: 10, color: C.navy, valign: 'middle', border: { type: 'solid', pt: 0.75, color: C.line } });
}

// pptxgenjs не пишет перенос строки в атрибут tooltip — после сборки меняем маркер NL на &#xA; прямо в XML слайдов
(async () => {
  let JSZip;
  try { JSZip = require('jszip'); } catch { JSZip = require(path.join(process.cwd(), 'node_modules', 'jszip')); }
  const zip = await JSZip.loadAsync(await pres.write({ outputType: 'nodebuffer' }));
  for (const name of Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async('string');
    if (xml.includes(NL)) zip.file(name, xml.split(NL).join('&#xA;'));
  }
  fs.writeFileSync(outPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log('saved', outPath, 'slides', slideNo);
  const missing = CEO.filter(p => !matchedCEO.has(p.jira || p.title)).map(p => `${p.jira || ''} ${p.title}`.trim());
  if (CEO.length) console.log(`CEO priorities highlighted: ${matchedCEO.size}/${CEO.length}${missing.length ? '; not found on slides: ' + missing.join('; ') : ''}`);
})();

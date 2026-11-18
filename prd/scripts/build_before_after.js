#!/usr/bin/env node
// Сравнение «Сейчас в проде / Будет» в один HTML-файл без внешних ссылок.
//   node build_before_after.js <before_after.json> <Фича>.before-after.html
// Пути картинок в JSON - относительно папки JSON. Картинки встраиваются как data:.
// Формат JSON и правила - references/before-after.md. Координаты пометок (at, atNow) пишет ba_marks.js.
// Вид страницы (решение PO от 12.11.2026): экраны серые, цвет только у правок; номер правки стоит на кадре
// и в списке под кадром; состояния одного экрана - переключателем в одном разделе.
const fs = require('fs');
const path = require('path');

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.log('Использование: build_before_after.js <before_after.json> <out.html>'); process.exit(2); }

const dir = path.dirname(path.resolve(src));
let data;
try { data = JSON.parse(fs.readFileSync(src, 'utf8')); } catch (e) { console.log('JSON не читается: ' + e.message); process.exit(1); }

const errors = [];
const warns = [];
const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const cache = new Map();

// Размер картинки в пикселях: нужен, чтобы поставить пометки в процентах и поймать координаты вне кадра.
function dims(buf, ext) {
  if (ext === '.png' && buf.length > 24) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (ext === '.jpg' || ext === '.jpeg') {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) { i += 1; continue; }
      const m = buf[i + 1];
      if (m === 0xFF) { i += 1; continue; }
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return {};
}
function img(rel, where) {
  if (!rel) return null;
  if (/^(https?:|file:)/i.test(rel)) { errors.push(`${where}: внешняя ссылка ${rel} - нужен локальный файл`); return null; }
  const file = path.resolve(dir, rel);
  const ext = path.extname(file).toLowerCase();
  const type = types[ext];
  if (!type) { errors.push(`${where}: неизвестный тип файла ${rel}`); return null; }
  if (!fs.existsSync(file)) { errors.push(`${where}: нет файла ${rel}`); return null; }
  if (!cache.has(file)) {
    const buf = fs.readFileSync(file);
    cache.set(file, { url: `data:${type};base64,${buf.toString('base64')}`, ...dims(buf, ext) });
  }
  return cache.get(file);
}
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Текст с подстановками: {date}, {цена публикации} выделяются, чтобы их не читали как готовый текст.
const rich = (s) => esc(s).replace(/\{[^{}]{1,40}\}/g, (m) => `<span class="var">${m}</span>`);
// Адрес страницы - текстом без протокола: в файле не должно быть ссылок http(s).
const plainUrl = (s) => esc(String(s || '').replace(/^https?:\/\//i, ''));

const feature = data.feature || path.basename(out).replace(/\.before-after\.html$/, '');
const summary = Array.isArray(data.summary) ? data.summary : [];
const screens = Array.isArray(data.screens) ? data.screens : [];
if (!summary.length) errors.push('summary: нужна хотя бы одна строка «что - сейчас - будет»');

const TYPE = { new: 'Новое', changed: 'Изменено', removed: 'Убрано' };
const STATUS = { new: 'новый экран', changed: 'экран меняется', removed: 'экран убирается' };
const FRAME = { desktop: 1440, mobile: 390 };
const PLAT = { desktop: 'Desktop', mobile: 'Mobile' };
let hasMobile = false;
let hasDesktop = false;

// Координаты пометки: [x, y, w, h], точка [x, y] или список таких значений. CSS px кадра (1440 или 390).
function rects(v) {
  if (!Array.isArray(v) || !v.length) return [];
  return (Array.isArray(v[0]) ? v : [v]).map((r) => (r.length === 2 ? [r[0], r[1], 0, 0] : r));
}
const pc = (a, b) => `${(a / b * 100).toFixed(3).replace(/\.?0+$/, '')}%`;
function marks(list, im, frame, where) {
  if (!list.length) return '';
  if (!im || !im.w) { errors.push(`${where}: пометки ставятся только на PNG и JPG`); return ''; }
  const H = im.h * frame / im.w;
  return list.map(({ k, n, type, rs }) => rs.map((r) => {
    let [x, y, w, h] = r;
    if (r.length !== 4 || r.some((c) => typeof c !== 'number') || x < 0 || y < 0 || x + w > frame + 1 || y + h > H + 1) {
      errors.push(`${where}, правка ${n}: пометка [${r.join(', ')}] вне кадра ${frame}×${Math.round(H)}`);
      return '';
    }
    // мелкий элемент (иконка, «⋮») - рамка не меньше 28 px, иначе её не видно
    if (w && h) {
      if (w < 28) { x = Math.max(0, Math.min(frame - 28, x - (28 - w) / 2)); w = 28; }
      if (h < 28) { y = Math.max(0, Math.min(H - 28, y - (28 - h) / 2)); h = 28; }
    }
    return `<i class="mk mk--${type}${w && h ? '' : ' mk--dot'}" data-k="${esc(k)}" style="left:${pc(x, frame)};top:${pc(y, H)};width:${pc(w, frame)};height:${pc(h, H)}"><b>${esc(n)}</b></i>`;
  }).join('')).join('');
}

// «Правки крупно» (решение PO от 12.11.2026): фрагмент кадра в натуральном размере для строки правки. Только desktop:
// кадр 1440 в паре уменьшен примерно вдвое, mobile и так в натуральном размере. Картинка не дублируется:
// фрагмент рисуется в браузере на canvas из уже встроенного кадра.
function frag(kind, im, rs, type, frame) {
  if (!im || !im.w || !rs.length) return '';
  const H = im.h * frame / im.w;
  let use = rs.filter((r) => r.length === 4 && r.every((c) => typeof c === 'number') && r[2] && r[3]).map(([x, y, w, h]) => {
    if (w < 28) { x = Math.max(0, Math.min(frame - 28, x - (28 - w) / 2)); w = 28; }
    if (h < 28) { y = Math.max(0, Math.min(H - 28, y - (28 - h) / 2)); h = 28; }
    return [x, y, w, h];
  });
  if (!use.length) return '';
  const box = (l) => [Math.min(...l.map((r) => r[0])), Math.min(...l.map((r) => r[1])), Math.max(...l.map((r) => r[0] + r[2])), Math.max(...l.map((r) => r[1] + r[3]))];
  let [x0, y0, x1, y1] = box(use);
  // правка в нескольких далёких местах - показываем первое
  if (x1 - x0 > 1000 || y1 - y0 > 520) { use = [use[0]]; [x0, y0, x1, y1] = box(use); }
  const w = Math.round(Math.min(frame, Math.max(320, x1 - x0 + 56)));
  const h = Math.round(Math.min(H, Math.max(150, y1 - y0 + 56)));
  const cx = Math.round(Math.max(0, Math.min(frame - w, (x0 + x1) / 2 - w / 2)));
  const cy = Math.round(Math.max(0, Math.min(H - h, (y0 + y1) / 2 - h / 2)));
  const mk = use.map((r) => `<i class="mk mk--${type}" style="left:${pc(r[0] - cx, w)};top:${pc(r[1] - cy, h)};width:${pc(r[2], w)};height:${pc(r[3], h)}"></i>`).join('');
  return `<figure class="fr__i"><figcaption class="tag tag--${kind}">${kind === 'now' ? 'Сейчас' : 'Будет'}</figcaption><div class="fr__c" style="width:${w}px;aspect-ratio:${w}/${h}"><canvas data-side="${kind}" data-crop="${cx},${cy},${w},${h}"></canvas>${mk}</div></figure>`;
}

function side(kind, im, st, name, plat, o = {}) {
  let label = kind === 'now' ? (st === 'new' && im ? 'Откуда переход (прод)' : 'Сейчас в проде') : 'Будет';
  // nowDrawn: состояния нет на проде или в тестовом аккаунте - «сейчас» нарисован как пример (решение PO от 12.11.2026)
  if (kind === 'now' && o.drawn && im) label += ' · пример, нарисовано';
  let body;
  if (im) {
    body = `<div class="scroll" data-sync><div class="shot"><img src="${im.url}" alt="${esc(name)}: ${label}, ${plat}" data-zoom>${o.marks || ''}</div></div>`;
  } else if (kind === 'now' && st === 'new') {
    body = '<div class="empty">Экрана нет в проде</div>';
  } else if (kind === 'next' && st === 'removed') {
    body = '<div class="empty">Экран убирается</div>';
  } else {
    body = '<div class="empty">Нет картинки</div>';
  }
  return `<div class="col col--${kind}"><div class="tag tag--${kind}">${label}</div>${body}</div>`;
}

const ids = new Set();
const uid = (id, where) => { if (ids.has(id)) errors.push(`${where}: id «${id}» повторяется`); ids.add(id); return id; };
const anchors = new Map(); // id экрана или состояния -> { sec, state }
const count = { states: 0, new: 0, changed: 0, removed: 0, need: 0, have: 0 };

const screenHtml = screens.map((s, i) => {
  const id = uid(s.id || `S${i + 1}`, 'screens');
  anchors.set(id, { sec: id });
  const multi = Array.isArray(s.states) && s.states.length > 0;
  const raw = multi ? s.states : [s];
  const chips = [];
  const states = raw.map((t, j) => {
    const sid = multi ? uid(t.id || `${id}-${j + 1}`, id) : id;
    if (multi) anchors.set(sid, { sec: id, state: sid });
    count.states += 1;
    const st = t.status || s.status || 'changed';
    if (!STATUS[st]) errors.push(`${sid}: status «${st}» - нужен changed | new | removed`);
    const name = multi ? `${s.name || id}: ${t.name || sid}` : (s.name || id);
    const plats = t.platforms || {};
    const keys = ['desktop', 'mobile'].filter((k) => plats[k]);
    if (!keys.length) errors.push(`${sid}: нет platforms.desktop и platforms.mobile`);
    const changes = Array.isArray(t.changes) ? t.changes : [];
    const on = changes.map(() => new Set());
    const fr = changes.map(() => '');
    changes.forEach((c, n) => {
      const type = c.type || 'changed';
      if (!TYPE[type]) errors.push(`${sid}, правка ${n + 1}: type «${type}» - нужен new | changed | removed`);
      else count[type] += 1;
    });
    const drawn = t.nowDrawn ?? s.nowDrawn;
    const entry = t.entry ?? s.entry;
    const views = keys.map((k) => {
      if (k === 'mobile') hasMobile = true; else hasDesktop = true;
      const p = plats[k];
      const frame = Number(p.frame) || FRAME[k];
      const now = img(p.now, `${sid}.${k}.now`);
      const next = img(p.next, `${sid}.${k}.next`);
      if (!p.now && st !== 'new') errors.push(`${sid}.${k}: нет скриншота прода (now)`);
      if (!p.next && st !== 'removed') errors.push(`${sid}.${k}: нет экрана «будет» (next)`);
      const mk = { now: [], next: [] };
      changes.forEach((c, n) => {
        const type = TYPE[c.type] ? c.type : 'changed';
        const a = rects(c.at && c.at[k]);
        const b = rects(c.atNow && c.atNow[k]);
        if (a.length) mk.next.push({ k: `${sid}-${n + 1}`, n: n + 1, type, rs: a });
        if (b.length) mk.now.push({ k: `${sid}-${n + 1}`, n: n + 1, type, rs: b });
        count.need += 1;
        if (a.length || b.length) { on[n].add(k); count.have += 1; } else warns.push(`${sid}, правка ${n + 1} (${k}): нет пометки на кадре`);
        if (k === 'desktop') {
          const fn = frag('now', now, b, type, frame);
          const fx = frag('next', next, a, type, frame);
          if (fn || fx) fr[n] = `<div class="fr${fn && fx ? ' fr--2' : ''}">${fn}${fn && fx ? '<span class="fr__a">→</span>' : ''}${fx}</div>`;
        }
      });
      const ea = rects(t.entryAt && t.entryAt[k]);
      if (ea.length) mk.now.push({ k: `${sid}-in`, n: 'вход', type: 'entry', rs: ea });
      return `<div class="view view--${k}" data-plat="${k}" data-frame="${frame}">
      <div class="pair">${side('now', now, st, name, k, { drawn: p.nowDrawn ?? drawn, marks: marks(mk.now, now, frame, `${sid}.${k}.now`) })}${side('next', next, st, name, k, { marks: marks(mk.next, next, frame, `${sid}.${k}.next`) })}</div>
    </div>`;
    }).join('');
    const chg = changes.map((c, n) => {
      const type = TYPE[c.type] ? c.type : 'changed';
      const shown = keys.length === 1 && on[n].size ? ['desktop', 'mobile'] : [...on[n]];
      const rf = [c.ref ? `п. ${c.ref}` : '', c.block || ''].filter(Boolean).join(' · ');
      return `<li data-k="${esc(sid)}-${n + 1}" data-on="${shown.join(' ')}"><div class="chg__h"><span class="n n--${type}">${n + 1}</span><span class="t t--${type}">${TYPE[type]}</span><span class="tx">${rich(c.text)}${rf ? ` <span class="rf">${esc(rf)}</span>` : ''}</span></div>${fr[n]}</li>`;
    }).join('');
    const src0 = t.source ?? s.source;
    const cap = t.captured ?? s.captured;
    const meta = [entry ? `Переход: ${esc(entry)}` : '', src0 ? `Прод: ${plainUrl(src0)}` : '', cap ? `снято ${esc(cap)}` : ''].filter(Boolean).join(' · ');
    if (st === 'new' && !entry) errors.push(`${sid}: новый экран без entry (откуда переход)`);
    if (multi) chips.push(`<button type="button" data-st="${esc(sid)}"${j === 0 ? ' class="on"' : ''}>${esc(t.name || sid)}</button>`);
    return `<div class="state${j === 0 ? ' on' : ''}" id="st-${esc(sid)}" data-state="${esc(sid)}" data-plats="${keys.join(' ')}">
    <p class="smeta"><span class="st st--${esc(st)}">${esc(STATUS[st] || st)}</span>${meta ? `<span>${meta}</span>` : ''}</p>
    ${t.note ? `<p class="note">${rich(t.note)}</p>` : ''}
    ${views}
    ${chg ? `<ol class="chg${fr.some(Boolean) ? ' chg--fr' : ''}">${chg}</ol>` : ''}
  </div>`;
  }).join('');
  const points = (Array.isArray(s.points) ? s.points : []).map((x) => `<li>${rich(x)}</li>`).join('');
  return `<section class="scr" id="${esc(id)}">
    <div class="scr__h"><span class="no">${i + 1}</span><div><h2>${esc(s.name || id)}</h2>${s.ref ? `<p class="meta">PRD: п. ${esc(s.ref)}</p>` : ''}</div></div>
    ${points ? `<ul class="pts">${points}</ul>` : ''}
    ${multi ? `<div class="states"><span class="states__l">Состояние:</span>${chips.join('')}</div>` : ''}
    ${states}
  </section>`;
}).join('');

let processHtml = '';
if (data.process && (data.process.now || data.process.next)) {
  const pn = img(data.process.now, 'process.now');
  const px = img(data.process.next, 'process.next');
  processHtml = `<section class="scr" id="process"><div class="scr__h"><span class="no">≡</span><div><h2>${esc(data.process.title || 'Процесс')}</h2></div></div>
    <div class="view view--all"><div class="pair${pn && px ? '' : ' pair--one'}">${pn ? side('now', pn, 'changed', 'Процесс', 'схема') : ''}${px ? side('next', px, 'changed', 'Процесс', 'схема') : ''}</div></div></section>`;
}

// Прототип: экраны «будет» с зонами клика. Координаты зон - в CSS px кадра шириной frame.
// prototype - mobile (frame 390), prototypeDesktop - desktop (frame 1440, решение PO от 12.11.2026). Можно оба.
let protoHtml = '';
let protoData = null;
const protoVariants = [];
const protoKeys = new Map();
[['prototype', 390], ['prototypeDesktop', 1440]].forEach(([field, defFrame]) => {
  const P = data[field];
  if (!P || !Array.isArray(P.screens) || !P.screens.length) return;
  const frame = Number(P.frame) || defFrame;
  const plat = frame >= 600 ? 'desktop' : 'mobile';
  const pids = new Set(P.screens.map((x) => x.id));
  const list = P.screens.map((x, i) => {
    if (!x.id) errors.push(`${field}.screens[${i}]: нет id`);
    const im = img(x.img, `${field}.${x.id}`);
    if (!im) { if (!x.img) errors.push(`${field}.${x.id}: нет img`); return null; }
    const url = im.url;
    if (!protoKeys.has(url)) protoKeys.set(url, protoKeys.size);
    const k = protoKeys.get(url);
    (x.hotspots || []).forEach((h, j) => {
      if (!pids.has(h.to)) errors.push(`${field}.${x.id}.hotspots[${j}]: нет экрана «${h.to}»`);
      ['x', 'y', 'w', 'h'].forEach((c) => { if (typeof h[c] !== 'number') errors.push(`${field}.${x.id}.hotspots[${j}]: ${c} не число`); });
    });
    return { id: x.id, name: x.name || x.id, k, hs: (x.hotspots || []).map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h, to: h.to, label: h.label || '', keep: !!h.keepScroll })) };
  }).filter(Boolean);
  if (!pids.has(P.start || (list[0] && list[0].id))) errors.push(`${field}.start: нет такого экрана`);
  protoVariants.push({ plat, frame, start: P.start || (list[0] && list[0].id), screens: list });
  const title = P.title || 'Прототип: как будет';
  const inner = `<div class="phone__scr pscr" style="width:${frame}px"><div class="phone__in pin"><img class="pimg" alt="" style="width:${frame}px"></div></div>`;
  const dev = plat === 'desktop'
    ? `<div class="pdesk" data-pdev><div class="pdesk__bar"><i></i><i></i><i></i></div>${inner}</div>`
    : `<div class="phone" data-pdev style="width:${frame + 20}px">${inner}</div>`;
  protoHtml += `<section class="scr psec psec--${plat}" id="prototype-${plat}" data-pplat="${plat}" data-pi="${protoVariants.length - 1}"><div class="scr__h"><span class="no">▶</span><div><h2>${esc(title)} · ${plat === 'desktop' ? 'Desktop' : 'Mobile'}</h2><p class="meta">${esc(P.note || 'Нажимайте на кнопки и карточки на экране. Клик мимо зоны подсвечивает, куда можно нажать.')}</p></div><button type="button" class="pfull" data-p="full" aria-pressed="false">На весь экран</button></div>
    <div class="proto proto--${plat}"><div class="proto__side"><div class="proto__ctl"><button type="button" data-p="back">← Назад</button><button type="button" data-p="home">В начало</button><label class="chk"><input type="checkbox" class="pzones"> Показать зоны</label></div>
    <p class="proto__name pname"></p><div class="pgo"><span class="pgo__l">Куда можно нажать</span><div class="pgo__b pgos"></div></div><span class="pgo__l plabel">Все экраны</span><ol class="proto__list plist"></ol></div>
    ${dev}</div></section>`;
});
if (protoVariants.length) protoData = { variants: protoVariants, urls: [...protoKeys.keys()] };
const protoBoth = protoVariants.length > 1;

// Картинки прототипа берём из уже встроенных экранов: без второй копии base64.
let screenOut = screenHtml;
if (protoData) {
  protoData.urls = protoData.urls.map((u, i) => {
    const needle = `<img src="${u}"`;
    const at = screenOut.indexOf(needle);
    if (at < 0) return u;
    screenOut = screenOut.slice(0, at) + `<img data-pk="${i}" src="${u}"` + screenOut.slice(at + needle.length);
    return null;
  });
}

// Сводка: № - что - сейчас - будет - тип - пункты PRD. Строка ведёт к экрану или состоянию.
const sumType = summary.some((r) => r.type);
const sumRef = summary.some((r) => r.ref);
const sumRows = summary.map((r, i) => {
  let what = esc(r.what);
  if (r.screen) {
    const a = anchors.get(r.screen);
    if (!a) errors.push(`summary[${i}]: screen «${r.screen}» - нет такого экрана или состояния`);
    else what = `<a href="#${esc(a.sec)}"${a.state ? ` data-go="${esc(a.state)}"` : ''}>${what}</a>`;
  }
  if (r.type && !TYPE[r.type]) errors.push(`summary[${i}]: type «${r.type}» - нужен new | changed | removed`);
  return `<tr><td class="num">${i + 1}</td><td>${what}</td><td>${rich(r.now)}</td><td>${rich(r.next)}</td>${sumType ? `<td>${TYPE[r.type] ? `<span class="t t--${r.type}">${TYPE[r.type]}</span>` : ''}</td>` : ''}${sumRef ? `<td class="rf">${esc(r.ref || '')}</td>` : ''}</tr>`;
}).join('');
const outside = (Array.isArray(data.outside) ? data.outside : []).map((r) => `<tr><td>${esc(r.what)}</td><td>${rich(r.why)}</td></tr>`).join('');

const nav = screens.map((s, i) => `<a href="#${esc(s.id || `S${i + 1}`)}">${i + 1}. ${esc(s.short || s.name || '')}</a>`).join('')
  + (processHtml ? '<a href="#process">Процесс</a>' : '')
  + protoVariants.map((v) => `<a href="#prototype-${v.plat}" class="pnav pnav--${v.plat}">▶ Прототип${protoBoth ? (v.plat === 'desktop' ? ' (desktop)' : ' (mobile)') : ''}</a>`).join('');

const plural = (n, a, b, c) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c)}`;
const facts = [
  screens.length ? plural(screens.length, 'экран', 'экрана', 'экранов') : '',
  count.states > screens.length ? plural(count.states, 'состояние', 'состояния', 'состояний') : '',
  count.new ? `<span class="t t--new">${TYPE.new}</span> ${count.new}` : '',
  count.changed ? `<span class="t t--changed">${TYPE.changed}</span> ${count.changed}` : '',
  count.removed ? `<span class="t t--removed">${TYPE.removed}</span> ${count.removed}` : '',
].filter(Boolean).map((x) => `<span>${x}</span>`).join('');

const css = `
:root{--barh:92px;--ink:#1d1d1f;--mut:#6b6b74;--line:#e3e3e8;--bg:#f3f4f6;--new:#16803c;--new-bg:#e2f5e8;--chg:#1d5fd6;--chg-bg:#e4edff;--rem:#c9302c;--rem-bg:#fde8e6}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,"Segoe UI",Roboto,Arial,sans-serif}
h1,h2,h3,p{margin:0}a{color:inherit}
.bar{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid var(--line)}
.bar__in{max-width:1880px;margin:0 auto;padding:10px 24px;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}
.bar__t{font-weight:600;font-size:16px;margin-right:8px}
.bar__tg{border:1px solid #d0d0d6;background:#fff;border-radius:8px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer;color:#444}
body.barmin .bar__in>*:not(.bar__t):not(.bar__tg){display:none}body.barmin .bar__in{padding-top:6px;padding-bottom:6px}
.seg{display:inline-flex;background:#ececf0;border-radius:10px;padding:3px}
.seg button{border:0;background:none;font:inherit;font-size:13px;padding:5px 12px;border-radius:8px;cursor:pointer;color:#444}
.seg button.on{background:#fff;color:#000;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.chk{display:inline-flex;gap:6px;align-items:center;font-size:13px;color:#555}
.nav{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
.nav a{font-size:12px;text-decoration:none;color:var(--ink);background:#ececf0;border-radius:99px;padding:4px 10px}
.nav a:hover{background:#dfdfe6}.nav a.pnav{background:var(--ink);color:#fff}
main{max-width:1880px;margin:0 auto;padding:24px}
.card,.scr{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;margin-bottom:24px;scroll-margin-top:calc(var(--barh) + 12px)}
.card h1{font-size:26px;line-height:1.25;margin-bottom:6px}
.card h3{font-size:15px;margin:24px 0 4px}
.sub{color:#555;font-size:15px;max-width:1100px}
.facts{display:flex;flex-wrap:wrap;gap:6px 16px;margin:12px 0 0;color:#444;font-size:13px}.facts>span{display:inline-flex;gap:6px;align-items:center}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:14px 0 18px;padding:10px 14px;background:#f7f7f9;border-radius:10px;color:#555;font-size:13px}
.legend b{font-weight:600;color:var(--ink)}.legend>span{display:inline-flex;gap:6px;align-items:center}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;vertical-align:top;padding:10px 14px 10px 0;border-bottom:1px solid #ececf0}
tr:last-child td{border-bottom:0}
th{font-size:12px;color:var(--mut);font-weight:600}
.sum td:nth-child(2){font-weight:600;width:17%}.sum td:nth-child(3){color:#555;width:27%}.sum td:nth-child(4){width:33%}
.sum td.num{color:var(--mut);width:36px}.sum a{text-decoration:none;border-bottom:1px solid #c9c9d2}.sum a:hover{border-bottom-color:var(--ink)}
.out td:first-child{font-weight:600;width:24%}.out td{color:#444}
.rf{color:var(--mut);font-size:12px;white-space:nowrap}
.var{background:#eef0f4;border-radius:4px;padding:0 3px;color:#3b4252;white-space:nowrap}
.scr__h{display:flex;gap:14px;align-items:flex-start;margin-bottom:12px}
.scr__h>div{flex:1}
.no{flex:none;width:32px;height:32px;border-radius:99px;background:var(--ink);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600}
.scr h2{font-size:21px;line-height:1.3}
.meta{color:var(--mut);font-size:12px;margin-top:2px}
.pts{margin:0 0 16px 46px;padding-left:18px;max-width:1000px;font-size:15px}.pts li{margin:3px 0}
.states{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px 46px}
.states__l{color:var(--mut);font-size:13px}
.states button{border:1px solid #c9c9d2;background:#fff;border-radius:99px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer;color:var(--ink)}
.states button:hover{border-color:var(--ink)}
.states button.on{background:var(--ink);border-color:var(--ink);color:#fff;font-weight:600}
.state{display:none}.state.on{display:block}
.smeta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:0 0 10px 46px;color:var(--mut);font-size:12px}
.note{color:#444;margin:0 0 14px 46px;max-width:1000px}
.st{font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap}
.st--changed{background:var(--chg-bg);color:var(--chg)}.st--new{background:var(--new-bg);color:var(--new)}.st--removed{background:var(--rem-bg);color:var(--rem)}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.col{min-width:0;display:flex;flex-direction:column;gap:8px}
.tag{align-self:flex-start;font-size:13px;font-weight:600;padding:4px 12px;border-radius:99px}
.tag--now{background:#ececf0}.tag--next{background:var(--ink);color:#fff}
.scroll{max-height:78vh;overflow:auto;border:1px solid #dcdce2;border-radius:12px;background:#fafafa}
.shot{position:relative}
.shot img{display:block;width:100%;height:auto;cursor:zoom-in}
.mk{position:absolute;pointer-events:none;border:2px solid var(--c);border-radius:10px;background:var(--cb);transition:box-shadow .15s}
.mk--new{--c:var(--new);--cb:rgba(22,128,60,.07)}.mk--changed{--c:var(--chg);--cb:rgba(29,95,214,.07)}
.mk--removed{--c:var(--rem);--cb:rgba(201,48,44,.07);border-style:dashed}.mk--entry{--c:var(--ink);--cb:rgba(0,0,0,.04);border-style:dashed}
.mk--dot{border:0;background:none}
.mk b{position:absolute;left:-17px;top:-14px;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:var(--c);color:#fff;font:600 12px/22px -apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.3);pointer-events:auto;cursor:pointer}
.mk.hot{box-shadow:0 0 0 5px rgba(255,196,0,.55)}.mk.hot b{box-shadow:0 0 0 3px #ffc400}
body.nomarks .mk{display:none}
.view--mobile .scroll{max-width:420px;width:100%}
.view--mobile .pair{grid-template-columns:repeat(2,minmax(0,440px));justify-content:center;gap:56px}
.view--mobile .col{align-items:center}.view--mobile .tag{align-self:center}
.empty{display:flex;align-items:center;justify-content:center;min-height:220px;border:1px dashed #b8b8c0;border-radius:12px;color:#666;background:#fafafa;font-weight:500}
.chg{list-style:none;margin:18px 0 0;padding:0;columns:2 520px;column-gap:32px}
.chg li{font-size:14px;padding:5px 8px;margin:0 -8px;border-radius:8px;break-inside:avoid;cursor:pointer}
.chg__h{display:flex;gap:8px;align-items:flex-start}
.fr{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-start;min-width:0;margin-top:8px}
.fr__i{margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0;max-width:100%}
.fr--2{flex-wrap:nowrap}.fr--2 .fr__i{flex:0 1 auto}
.fr__i .tag{font-size:11px;padding:2px 9px}
.fr__c{position:relative;max-width:100%;border:1px solid #dcdce2;border-radius:10px;overflow:hidden;background:#fafafa}
.fr__c canvas{display:block;width:100%;height:100%}
.fr__a{align-self:center;color:var(--mut);font-size:20px;padding-top:22px}
body[data-plat="mobile"] .state:not([data-plats="desktop"]) .fr{display:none}
body[data-plat="desktop"] .state:not([data-plats="mobile"]) .chg--fr,.state[data-plats="desktop"] .chg--fr{columns:auto}
body[data-plat="desktop"] .state:not([data-plats="mobile"]) .chg--fr li,.state[data-plats="desktop"] .chg--fr li{display:grid;grid-template-columns:minmax(240px,340px) minmax(0,1fr);gap:8px 24px;align-items:start;padding:14px 8px;border-top:1px solid #ececf0;border-radius:0}
body[data-plat="desktop"] .state:not([data-plats="mobile"]) .chg--fr .fr,.state[data-plats="desktop"] .chg--fr .fr{margin-top:0}
.chg li:hover{background:#fffbe8}.chg li.hot{background:#fff1bf}
.n{flex:none;width:22px;height:22px;border-radius:99px;background:var(--c);color:#fff;font:600 12px/22px -apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:center}
.n--new{--c:var(--new)}.n--changed{--c:var(--chg)}.n--removed{--c:var(--rem)}
body[data-plat="desktop"] .chg li:not([data-on~="desktop"]) .n,body[data-plat="mobile"] .chg li:not([data-on~="mobile"]) .n{background:#fff;color:var(--c);box-shadow:inset 0 0 0 2px var(--c)}
.t{flex:none;font-size:12px;font-weight:600;line-height:20px;padding:1px 8px;border-radius:99px;white-space:nowrap}
.t--new{background:var(--new-bg);color:var(--new)}.t--changed{background:var(--chg-bg);color:var(--chg)}.t--removed{background:var(--rem-bg);color:var(--rem)}
.pin0{display:inline-block;width:20px;height:20px;border-radius:99px;background:var(--chg);color:#fff;font:600 11px/20px -apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:center}
body[data-plat="desktop"] .view--mobile,body[data-plat="mobile"] .view--desktop{display:none}
body[data-plat="mobile"] .state[data-plats="desktop"] .view--desktop,body[data-plat="desktop"] .state[data-plats="mobile"] .view--mobile{display:block}
body[data-mode="flip"] .pair{grid-template-columns:1fr}
.pair--one{grid-template-columns:1fr}.pair--one .col{display:flex!important}.pair--one .scroll{max-height:none}
body[data-mode="flip"][data-show="now"] .col--next,body[data-mode="flip"][data-show="next"] .col--now{display:none}
.flip{display:none}body[data-mode="flip"] .flip{display:inline-flex}
.zoom{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.82);display:none;overflow:auto;cursor:zoom-out;padding:24px}
.zoom.on{display:block}.zoom .shot{margin:0 auto;background:#fff}.zoom .shot img{cursor:zoom-out}
.proto{display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap}.proto--desktop{flex-direction:column;gap:12px}.proto--desktop .proto__side{max-width:none;width:100%;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}.proto--desktop .proto__ctl{margin:0}.proto--desktop .proto__name{margin:0;flex:1;min-width:200px}
.proto--desktop .proto__list{flex:0 0 100%;min-width:0;max-width:100%;display:flex;gap:6px;overflow-x:auto;list-style:none;padding:0 0 6px;counter-reset:p;position:relative}.proto--desktop .proto__list li{flex:none;white-space:nowrap;background:#ececf0;border-radius:99px;padding:4px 10px;font-size:12px;color:var(--ink);counter-increment:p}.proto--desktop .proto__list li::before{content:counter(p) ". "}.proto--desktop .proto__list li.on{background:var(--ink);color:#fff}
.pdesk{background:#1d1d1f;border-radius:14px;padding:0 8px 8px;box-shadow:0 8px 30px rgba(0,0,0,.18);max-width:100%}.pdesk__bar{height:28px;display:flex;gap:6px;align-items:center;padding-left:6px}.pdesk__bar i{width:10px;height:10px;border-radius:50%;background:#555}
.pdesk .phone__scr{height:clamp(220px,calc(100vh - var(--barh) - 306px),900px);border-radius:6px}
.pgo{margin:0 0 14px}.pgo__l{display:block;font-size:12px;color:var(--mut);margin-bottom:6px}
.pgo__b{display:flex;flex-direction:column;gap:6px}
.pgo__i{text-align:left;border:1px solid #d0d0d6;background:#fff;border-radius:10px;padding:7px 10px;font:inherit;font-size:13px;cursor:pointer;display:flex;flex-direction:column;gap:1px;color:var(--ink)}
.pgo__i:hover{border-color:var(--chg);background:var(--chg-bg)}.pgo__i b{font-weight:600}.pgo__i small{color:var(--mut);font-size:12px}
.proto--desktop .pgo{flex:0 0 100%;margin:0;display:flex;gap:10px;align-items:center;min-width:0}.proto--desktop .pgo__l{margin:0;white-space:nowrap}.proto--desktop .plabel{display:none}
.proto--desktop .pgo__b{flex-direction:row;overflow-x:auto;padding-bottom:4px;min-width:0}.proto--desktop .pgo__i{flex:none;flex-direction:row;gap:6px;align-items:baseline;white-space:nowrap;padding:5px 10px}
.pfull{margin-left:auto;flex:none;border:1px solid #d0d0d6;background:#fff;border-radius:8px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}.pfull:hover{border-color:var(--ink)}
body.pfullon{overflow:hidden}
.psec.full{position:fixed;inset:0;z-index:40;margin:0;border:0;border-radius:0;overflow:auto;padding:14px 24px;--barh:-24px}.psec.full .pdesk{margin:0 auto}
body.pboth[data-plat="desktop"] .psec--mobile,body.pboth[data-plat="mobile"] .psec--desktop,body.pboth[data-plat="desktop"] .pnav--mobile,body.pboth[data-plat="mobile"] .pnav--desktop{display:none}
.proto__side{flex:1;min-width:260px;max-width:420px}
.proto__ctl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.proto__ctl button{border:1px solid #d0d0d6;background:#fff;border-radius:8px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.proto__name{font-weight:600;font-size:16px;margin-bottom:8px}
.proto__list{margin:0;padding-left:20px;font-size:13px;color:#555}.proto__list li{cursor:pointer;padding:2px 0}.proto__list li.on{color:#000;font-weight:600}
.phone{background:#1d1d1f;border-radius:36px;padding:10px;box-shadow:0 8px 30px rgba(0,0,0,.18)}
[data-pdev]{position:relative}
.phint{position:absolute;left:50%;transform:translateX(-50%);max-width:88%;text-align:center;background:rgba(29,29,31,.92);color:#fff;font-size:12px;line-height:1.35;padding:6px 12px;border-radius:14px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:3}
.phint.on{opacity:1}.phint.top{top:22px}.phint.bot{bottom:22px}
.phone__scr{height:clamp(360px,calc(100vh - var(--barh) - 150px),844px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:none;border-radius:28px;background:#fff}.phone__scr::-webkit-scrollbar{display:none}
.phone__in{position:relative}.phone__in img{display:block;height:auto}
.hs{position:absolute;border:0;background:transparent;cursor:pointer;border-radius:8px;padding:0}
.hs:hover{background:rgba(15,103,255,.10);outline:2px solid rgba(15,103,255,.45)}
.hs:focus-visible,.zones .hs,.flash .hs,.hs.lit{background:rgba(15,103,255,.18);outline:2px solid rgba(15,103,255,.75)}
@media (max-width:900px){.pair{grid-template-columns:1fr}.pts,.states,.smeta,.note{margin-left:0}}
@media print{.bar{display:none}.scroll{max-height:none;overflow:visible}.state{display:block}}`;

const js = `
const b=document.body;
const barEl=document.querySelector('.bar');const setBar=()=>document.documentElement.style.setProperty('--barh',barEl.offsetHeight+'px');setBar();if(window.ResizeObserver)new ResizeObserver(setBar).observe(barEl);
function setSeg(name,val){b.dataset[name]=val;document.querySelectorAll('[data-set="'+name+'"]').forEach(x=>x.classList.toggle('on',x.dataset.val===val));}
document.querySelectorAll('[data-set]').forEach(x=>x.addEventListener('click',()=>setSeg(x.dataset.set,x.dataset.val)));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')z.classList.remove('on');
  if(e.code==='Space'&&b.dataset.mode==='flip'&&!z.classList.contains('on')){e.preventDefault();setSeg('show',b.dataset.show==='now'?'next':'now');}
});
const z=document.querySelector('.zoom');
document.querySelectorAll('[data-zoom]').forEach(i=>i.addEventListener('click',()=>{const c=i.closest('.shot').cloneNode(true);c.querySelectorAll('[data-pk]').forEach(x=>x.removeAttribute('data-pk'));
  c.style.width=Math.min(i.naturalWidth,window.innerWidth-48)+'px';z.replaceChildren(c);z.classList.add('on');z.scrollTop=0;}));
z.addEventListener('click',()=>z.classList.remove('on'));
function drawFr(st){if(!st||st.dataset.fr)return;st.dataset.fr='1';const v=st.querySelector('.view--desktop');if(!v)return;const frame=+v.dataset.frame;
  st.querySelectorAll('.fr canvas').forEach(cv=>{const im=v.querySelector('.col--'+cv.dataset.side+' img');if(!im)return;
    const go=()=>{const k=im.naturalWidth/frame,c=cv.dataset.crop.split(',').map(Number);cv.width=Math.round(c[2]*k);cv.height=Math.round(c[3]*k);cv.getContext('2d').drawImage(im,c[0]*k,c[1]*k,c[2]*k,c[3]*k,0,0,cv.width,cv.height);};
    if(im.complete&&im.naturalWidth)go();else im.addEventListener('load',go,{once:true});});}
document.querySelectorAll('.state.on').forEach(drawFr);window.addEventListener('beforeprint',()=>document.querySelectorAll('.state').forEach(drawFr));
function setState(id){const st=document.getElementById('st-'+id);if(!st)return;drawFr(st);const sec=st.closest('.scr');
  sec.querySelectorAll('[data-state]').forEach(x=>x.classList.toggle('on',x===st));sec.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',x.dataset.st===id));}
document.querySelectorAll('[data-st]').forEach(x=>x.addEventListener('click',()=>setState(x.dataset.st)));
document.querySelectorAll('a[data-go]').forEach(a=>a.addEventListener('click',()=>setState(a.dataset.go)));
function hot(el){if(!el)return;el.classList.add('hot');setTimeout(()=>el.classList.remove('hot'),1400);}
const marksOf=k=>[...document.querySelectorAll('.mk[data-k="'+k+'"]')];
document.querySelectorAll('.chg li[data-k]').forEach(li=>{
  li.addEventListener('mouseenter',()=>marksOf(li.dataset.k).forEach(m=>m.classList.add('hot')));
  li.addEventListener('mouseleave',()=>marksOf(li.dataset.k).forEach(m=>m.classList.remove('hot')));
  li.addEventListener('click',()=>{const ms=marksOf(li.dataset.k).filter(m=>m.offsetParent&&!m.closest('.zoom'));if(!ms.length)return;
    ms.forEach(m=>{const sc=m.closest('.scroll');if(sc)sc.scrollTop=Math.max(0,m.offsetTop-90);hot(m);});
    const r=ms[0].getBoundingClientRect();if(r.top<80||r.bottom>window.innerHeight)ms[0].closest('.scroll').scrollIntoView({block:'center'});});});
document.addEventListener('click',e=>{const pin=e.target.closest('.mk b');if(!pin)return;e.stopPropagation();const k=pin.parentNode.dataset.k;
  const li=[...document.querySelectorAll('.chg li[data-k="'+k+'"]')].find(x=>x.offsetParent);if(li){hot(li);li.scrollIntoView({block:'nearest'});}},true);
const mkc=document.getElementById('marks');if(mkc)mkc.addEventListener('change',()=>b.classList.toggle('nomarks',!mkc.checked));
const PD=window.__PROTO;
if(PD){document.querySelectorAll('.psec').forEach(sec=>{const V=PD.variants[+sec.dataset.pi];
  const q=s=>sec.querySelector(s),im=q('.pimg'),pin=q('.pin'),scr=q('.pscr'),pn=q('.pname'),pl=q('.plist'),zc=q('.pzones'),pg=q('.pgos');
  const nk=l=>String(l||'').replace(/^(Свернуть|Развернуть|Скрыть|Показать)\\s*/i,'').replace(/[«»"]/g,'').trim().toLowerCase();
  let K=1;function fit(){if(V.plat!=='desktop')return;const w=q('.proto').clientWidth;if(!w)return;K=Math.min(1,(w-20)/V.frame);pin.style.zoom=K;scr.style.width=Math.round(V.frame*K)+'px';scr.dataset.k=K;}
  scr.dataset.k=1;fit();window.addEventListener('resize',fit);new MutationObserver(fit).observe(document.body,{attributes:true,attributeFilter:['data-plat']});
  const by={};V.screens.forEach(s=>by[s.id]=s);const hist=[];let cur=null;
  pl.innerHTML=V.screens.map(s=>'<li data-id="'+s.id+'">'+s.name.replace(/</g,'&lt;')+'</li>').join('');
  function show(id,push,keep){const s=by[id];if(!s)return;fit();const st=scr.scrollTop;if(push&&cur)hist.push(cur);cur=id;im.src=PD.urls[s.k]||document.querySelector('img[data-pk="'+s.k+'"]').src;pn.textContent=s.name;
    pin.querySelectorAll('.hs').forEach(x=>x.remove());
    s.hs.forEach(h=>{const bt=document.createElement('button');bt.type='button';bt.className='hs';bt.title=h.label;bt.setAttribute('aria-label',h.label||h.to);
      Object.assign(bt.style,{left:h.x+'px',top:h.y+'px',width:h.w+'px',height:h.h+'px'});bt.addEventListener('click',e=>{e.stopPropagation();show(h.to,true,h.keep?{off:h.y*K-scr.scrollTop,key:nk(h.label)}:null);});pin.appendChild(bt);});
    pg.innerHTML='';s.hs.forEach((h,i)=>{const g=document.createElement('button'),t=by[h.to],zn=()=>pin.querySelectorAll('.hs')[i];g.type='button';g.className='pgo__i';g.innerHTML='<b></b><small></small>';
      g.firstChild.textContent=h.label||'Зона '+(i+1);g.lastChild.textContent='→ '+(t?t.name:h.to);g.addEventListener('click',()=>{const e=zn();if(e)e.click();});
      g.addEventListener('mouseenter',()=>{const e=zn();if(!e)return;e.classList.add('lit');const y=h.y*K;if(y<scr.scrollTop||y+h.h*K>scr.scrollTop+scr.clientHeight)scr.scrollTop=Math.max(0,y-120);});
      g.addEventListener('mouseleave',()=>{const e=zn();if(e)e.classList.remove('lit');});pg.appendChild(g);});
    const go=()=>{if(!keep){scr.scrollTop=0;return;}const t=s.hs.find(x=>x.keep&&nk(x.label)===keep.key);scr.scrollTop=t?t.y*K-keep.off:st;};if(keep&&!im.complete)im.onload=()=>{go();im.onload=null;};go();pl.querySelectorAll('li').forEach(li=>li.classList.toggle('on',li.dataset.id===id));const on=pl.querySelector('li.on');if(on&&pl.scrollWidth>pl.clientWidth)pl.scrollLeft=on.offsetLeft-(pl.clientWidth-on.offsetWidth)/2;}
  pin.addEventListener('click',()=>{pin.classList.add('flash');setTimeout(()=>pin.classList.remove('flash'),500);});
  zc.addEventListener('change',()=>pin.classList.toggle('zones',zc.checked));
  const ph=document.createElement('span');ph.className='phint';q('[data-pdev]').appendChild(ph);let pht=0,phn=0;
  scr.addEventListener('wheel',e=>{const d=e.deltaY;if(!d)return;const top=d<0&&scr.scrollTop<=0,bot=d>0&&scr.scrollTop+scr.clientHeight>=scr.scrollHeight-1;
    if(!top&&!bot){phn=0;return;}e.preventDefault();if(++phn<4)return;
    ph.textContent=(top?'Это верх экрана':'Это низ экрана')+(sec.classList.contains('full')?'':'. Чтобы листать страницу, уведите курсор с прототипа');ph.className='phint on '+(top?'top':'bot');
    clearTimeout(pht);pht=setTimeout(()=>{ph.className='phint';phn=0;},1800);},{passive:false});
  const fb=q('[data-p="full"]');const setFull=on=>{sec.classList.toggle('full',on);b.classList.toggle('pfullon',on);fb.textContent=on?'✕ Свернуть':'На весь экран';fb.setAttribute('aria-pressed',String(on));fit();};
  fb.addEventListener('click',()=>setFull(!sec.classList.contains('full')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sec.classList.contains('full')&&!z.classList.contains('on'))setFull(false);});
  q('[data-p="back"]').addEventListener('click',()=>{if(hist.length){const p=hist.pop();show(p,false);}});
  q('[data-p="home"]').addEventListener('click',()=>{hist.length=0;show(V.start,false);});
  pl.addEventListener('click',e=>{const li=e.target.closest('li');if(li)show(li.dataset.id,true);});
  show(V.start,false);});}
const tg=document.getElementById('bartg');
function barSet(min){b.classList.toggle('barmin',min);tg.textContent=min?'Развернуть шапку ▼':'Свернуть шапку ▲';tg.setAttribute('aria-expanded',String(!min));try{localStorage.setItem('ba-barmin',min?'1':'0');}catch(e){}}
tg.addEventListener('click',()=>barSet(!b.classList.contains('barmin')));
try{if(localStorage.getItem('ba-barmin')==='1')barSet(true);}catch(e){}
const sync=document.getElementById('sync');let lock=false;
document.querySelectorAll('.pair').forEach(p=>{const s=[...p.querySelectorAll('[data-sync]')];if(s.length<2)return;
  s.forEach(a=>a.addEventListener('scroll',()=>{if(!sync.checked||lock)return;lock=true;const r=a.scrollTop/Math.max(1,a.scrollHeight-a.clientHeight);
    s.forEach(o=>{if(o!==a)o.scrollTop=r*(o.scrollHeight-o.clientHeight);});requestAnimationFrame(()=>lock=false);}));});`;

const platSeg = hasMobile && hasDesktop
  ? '<span class="seg"><button data-set="plat" data-val="desktop" class="on">Desktop</button><button data-set="plat" data-val="mobile">Mobile</button></span>' : '';
const startPlat = platSeg ? 'desktop' : (hasMobile ? 'mobile' : 'desktop');
const hasMarks = count.have > 0;

const legend = `<div class="legend"><b>Как читать</b>
  <span><span class="t t--new">${TYPE.new}</span><span class="t t--changed">${TYPE.changed}</span><span class="t t--removed">${TYPE.removed}</span>тип правки</span>
  ${hasMarks ? '<span><span class="pin0">1</span>номер правки: на кадре и в списке под кадром. Клик по строке списка показывает место на кадре</span>' : ''}
  <span><span class="var">{X}</span>подстановка, значение придёт из данных</span>
  <span>клик по кадру - крупно; «Переключать» - один кадр на всю ширину, пробел меняет «сейчас» и «будет»</span></div>`;

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(feature)}: сейчас в проде / будет</title><style>${css}</style></head>
<body data-plat="${startPlat}" data-mode="side" data-show="now"${protoBoth ? ' class="pboth"' : ''}>
<div class="bar"><div class="bar__in">
  <span class="bar__t">${esc(feature)}: сейчас / будет</span>
  <button type="button" class="bar__tg" id="bartg" aria-expanded="true" title="Свернуть или развернуть шапку">Свернуть шапку ▲</button>
  ${platSeg}
  <span class="seg"><button data-set="mode" data-val="side" class="on">Рядом</button><button data-set="mode" data-val="flip">Переключать</button></span>
  <span class="seg flip"><button data-set="show" data-val="now" class="on">Сейчас</button><button data-set="show" data-val="next">Будет</button></span>
  ${hasMarks ? '<label class="chk"><input type="checkbox" id="marks" checked> Пометки правок</label>' : ''}
  <label class="chk"><input type="checkbox" id="sync" checked> Синхронная прокрутка</label>
  <nav class="nav">${nav}</nav>
</div></div>
<main>
  <div class="card" id="summary">
    <h1>${esc(feature)}: сейчас в проде / будет</h1>
    <p class="sub">${rich(data.intro || 'Слева - как работает сейчас на mashina.kg, справа - как будет после релиза.')}${data.date ? ` Прод снят ${esc(data.date)}.` : ''}</p>
    ${facts ? `<div class="facts">${facts}</div>` : ''}
    ${legend}
    <table class="sum"><thead><tr><th>№</th><th>Что</th><th>Сейчас в проде</th><th>Будет</th>${sumType ? '<th>Тип</th>' : ''}${sumRef ? '<th>PRD, пункты</th>' : ''}</tr></thead><tbody>${sumRows}</tbody></table>
    ${outside ? `<h3>Меняется, но в сравнении не показано</h3><table class="out"><tbody>${outside}</tbody></table>` : ''}
  </div>
  ${screenOut}
  ${processHtml}
  ${protoHtml}
</main>
<div class="zoom"></div>
${protoData ? `<script>window.__PROTO=${JSON.stringify(protoData).replace(/</g, '\\u003c')};</script>` : ''}
<script>${js}</script>
</body></html>
`;

if (errors.length) { console.log('Не собрано:\n- ' + errors.join('\n- ')); process.exit(1); }
fs.writeFileSync(out, html);
console.log(`${out}: ${Math.round(fs.statSync(out).size / 1024)} КБ, экранов ${screens.length}, состояний ${count.states}, строк сводки ${summary.length}, картинок ${cache.size}, пометок на кадрах ${count.have} из ${count.need}, без пометки ${count.need - count.have}${protoVariants.map((v) => `, прототип ${v.plat} ${v.screens.length} экр.`).join('')}`);
if (warns.length) console.log('Без пометки на кадре:\n- ' + warns.join('\n- '));

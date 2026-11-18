#!/usr/bin/env node
// Координаты пометок правок для <Фича>.before-after.html: снимает их с HTML экранов и пишет в before_after.json.
//   node ~/.claude/skills/prd/scripts/ba_marks.js <before_after.json> [--dry]
// В HTML экрана у элемента правки стоит data-chg="<номер правки>": номер - порядок в changes этого состояния, с 1.
//   data-chg="2"          правка 2 у всех состояний, которые используют этот HTML
//   data-chg="1,2"        один элемент - две правки
//   data-chg="S3b:1"      правка 1 только у состояния S3b (один HTML на несколько состояний)
//   data-entry            элемент, по которому пользователь переходит на новый экран (только HTML «сейчас»)
// HTML ищется рядом с картинкой: evidence/next_S1_desktop.png -> evidence/next/S1_desktop.html,
// evidence/now_S1_mobile.png -> evidence/now/S1_mobile.html. Другой путь - поля nextHtml и nowHtml у платформы.
// Экран «будет» -> changes[].at, нарисованный «сейчас» -> changes[].atNow, data-entry -> entryAt.
// Скриншот прода без HTML скрипт не трогает: его atNow ставится руками.
// Запускать из корня проекта: playwright берётся из его node_modules.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const src = args.find((a) => !a.startsWith('--'));
if (!src) { console.log('Использование: ba_marks.js <before_after.json> [--dry]'); process.exit(2); }
let chromium;
try { ({ chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright')); }
catch (e) { console.log('playwright не найден в node_modules текущей папки: запусти из корня проекта'); process.exit(2); }

const dir = path.dirname(path.resolve(src));
let data;
try { data = JSON.parse(fs.readFileSync(src, 'utf8')); } catch (e) { console.log('JSON не читается: ' + e.message); process.exit(1); }
const FRAME = { desktop: 1440, mobile: 390 };

function htmlFor(p, side) {
  const own = p[side + 'Html'];
  if (own) return path.resolve(dir, own);
  if (!p[side]) return null;
  const m = /^(.*?)([^\\/]+)$/.exec(p[side]);
  const name = m[2].replace(/\.[a-z]+$/i, '');
  if (!name.startsWith(side + '_')) return null;
  return path.resolve(dir, m[1], side, name.slice(side.length + 1) + '.html');
}

(async () => {
  let b;
  for (const ch of [undefined, 'msedge', 'chrome']) { try { b = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { /* следующий канал */ } }
  if (!b) { console.log('нет браузера для playwright'); process.exit(2); }
  const errors = [];
  const report = [];
  const cache = new Map();
  async function read(file, width) {
    const key = file + '|' + width;
    if (cache.has(key)) return cache.get(key);
    const page = await b.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
    await page.goto(pathToFileURL(file).href);
    // координаты - в том же виде, в каком экран отрендерен для сравнения: без пометок (render_html.js --no-notes)
    await page.evaluate(() => { document.documentElement.classList.remove('notes'); document.body.classList.remove('notes'); });
    const found = await page.evaluate(() => {
      const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left + window.scrollX), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)]; };
      return {
        chg: [...document.querySelectorAll('[data-chg]')].map((e) => ({ v: e.getAttribute('data-chg'), r: box(e) })),
        entry: [...document.querySelectorAll('[data-entry]')].map(box),
      };
    });
    await page.close();
    cache.set(key, found);
    return found;
  }
  const one = (list) => (list.length === 1 ? list[0] : list);

  for (const [i, s] of (data.screens || []).entries()) {
    const id = s.id || `S${i + 1}`;
    const multi = Array.isArray(s.states) && s.states.length > 0;
    for (const [j, t] of (multi ? s.states : [s]).entries()) {
      const sid = multi ? (t.id || `${id}-${j + 1}`) : id;
      const changes = Array.isArray(t.changes) ? t.changes : [];
      const line = [];
      for (const k of ['desktop', 'mobile']) {
        const p = t.platforms && t.platforms[k];
        if (!p) continue;
        const width = Number(p.frame) || FRAME[k];
        const got = changes.map(() => false);
        for (const [side, field] of [['next', 'at'], ['now', 'atNow']]) {
          const file = htmlFor(p, side);
          if (!file || !fs.existsSync(file)) {
            if (p[side + 'Html']) errors.push(`${sid}.${k}: нет файла ${p[side + 'Html']}`);
            changes.forEach((c, n) => { if (c[field] && c[field][k]) got[n] = true; });
            continue;
          }
          const found = await read(file, width);
          const per = changes.map(() => []);
          for (const m of found.chg) {
            for (const tok of String(m.v).split(/[\s,;]+/).filter(Boolean)) {
              const q = /^(?:(.+):)?(\d+)$/.exec(tok);
              if (!q) { errors.push(`${path.basename(file)}: data-chg="${m.v}" - нужен номер или <состояние>:<номер>`); continue; }
              if (q[1] && q[1] !== sid) continue;
              const n = Number(q[2]);
              if (n < 1 || n > changes.length) { if (!q[1]) errors.push(`${sid}.${k}, ${path.basename(file)}: data-chg="${tok}", а правок ${changes.length}`); continue; }
              if (!m.r[2] || !m.r[3]) { errors.push(`${sid}.${k}, ${path.basename(file)}: элемент правки ${n} скрыт или нулевого размера`); continue; }
              per[n - 1].push(m.r);
            }
          }
          changes.forEach((c, n) => {
            if (per[n].length) { c[field] = { ...(c[field] || {}), [k]: one(per[n]) }; got[n] = true; }
            else if (c[field] && c[field][k]) { delete c[field][k]; if (!Object.keys(c[field]).length) delete c[field]; }
          });
          if (side === 'now') {
            if (found.entry.length) t.entryAt = { ...(t.entryAt || {}), [k]: one(found.entry) };
            else if (t.entryAt && t.entryAt[k]) { delete t.entryAt[k]; if (!Object.keys(t.entryAt).length) delete t.entryAt; }
          }
        }
        const miss = got.map((x, n) => (x ? null : n + 1)).filter(Boolean);
        line.push(`${k} ${got.filter(Boolean).length}/${changes.length}${miss.length ? ` (нет: ${miss.join(', ')})` : ''}`);
      }
      report.push(`${sid}: ${line.join('; ')}`);
    }
  }
  await b.close();
  console.log(report.join('\n'));
  if (errors.length) { console.log('Ошибки:\n- ' + errors.join('\n- ')); process.exit(1); }
  if (dry) { console.log('--dry: файл не изменён'); return; }
  // Координаты - в одну строку, остальное с отступами: файл остаётся читаемым.
  const text = JSON.stringify(data, null, 2).replace(/\[\s*(-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)*)\s*\]/g, (m, a) => `[${a.split(/\s*,\s*/).join(', ')}]`);
  fs.writeFileSync(src, text + '\n');
  console.log(`записано: ${src}`);
})();

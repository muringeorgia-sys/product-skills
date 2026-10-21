#!/usr/bin/env node
// Снимки всех экранов и окон собранного прототипа: для самопроверки агента, раздела 4 PRD и Confluence.
//
//   node shoot.cjs <итог.prototype.html> <папка для PNG> [опции]
//     --state auth=user,potential=has   состояние для всех снимков (по умолчанию - default из proto-config)
//     --only credit,apply               снять только эти экраны и окна
//     --no-layers                       без окон и шторок
//     --first-only                      mobile: только первый экран 390x844, без снимка во всю длину
//     --scale 2                         плотность пикселей (по умолчанию 1)
//     --width 360 --height 800          mobile: другой размер экрана (проверка узких Android)
//
// Запускать из корня проекта: playwright берётся из node_modules текущей папки.
// Итог: PNG в папке и report.json (снимки, ошибки JS, проблемы разметки по Proto.lint()).
'use strict';
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

const argv = process.argv.slice(2);
const opt = name => { const i = argv.indexOf('--' + name); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--state', '--only', '--scale', '--width', '--height'].includes(argv[i - 1])));
const [file, outDir] = pos;
if (!file || !outDir) { console.log('Использование: node shoot.cjs <prototype.html> <папка> [--state k=v,k2=v2] [--only id1,id2] [--no-layers] [--first-only] [--scale 2] [--width 360 --height 800]'); process.exit(2); }
const scale = Number(opt('scale')) || 1;
const only = typeof opt('only') === 'string' ? opt('only').split(',').map(s => s.trim()).filter(Boolean) : null;
const parseState = s => { const o = {}; String(s || '').split(/[,&\s]+/).filter(Boolean).forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i)] = p.slice(i + 1); }); return o; };
const cliState = parseState(typeof opt('state') === 'string' ? opt('state') : '');

function loadPlaywright() {
  for (const base of [process.cwd(), __dirname]) {
    try { return createRequire(path.join(base, 'package.json'))('playwright'); } catch (e) { /* дальше */ }
  }
  try { return require('playwright'); } catch (e) { /* нет */ }
  console.log('playwright не найден: запусти из корня проекта, где есть node_modules/playwright');
  process.exit(1);
}

(async () => {
  const { chromium } = loadPlaywright();
  let browser;
  for (const channel of [undefined, 'msedge', 'chrome']) {
    try { browser = await chromium.launch(channel ? { channel } : {}); break; } catch (e) { /* следующий канал */ }
  }
  if (!browser) { console.log('не удалось запустить браузер: нет chromium, Edge и Chrome для playwright'); process.exit(1); }

  const url = pathToFileURL(path.resolve(file)).href;
  const problems = [];
  const shots = [];
  fs.mkdirSync(outDir, { recursive: true });

  const probe = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  probe.on('pageerror', e => problems.push('JS: ' + e.message));
  await probe.goto(url + '#/?shot=1');
  await probe.waitForFunction(() => window.Proto && window.Proto.screen, null, { timeout: 15000 });
  const man = await probe.evaluate(() => window.Proto.manifest());
  await probe.close();

  const mobile = man.platform === 'mobile';
  const vp = mobile ? { width: Number(opt('width')) || 390, height: Number(opt('height')) || 844 } : { width: 1440, height: 900 };
  const prefix = mobile ? (man.mobileKind === 'app' ? 'app' : 'mobile') : 'web';
  const base = {};
  for (const [k, d] of Object.entries(man.states || {})) base[k] = d.default != null ? String(d.default) : Object.keys(d.values || {})[0];
  Object.assign(base, cliState);

  async function openPage(full) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: scale });
    page.on('pageerror', e => problems.push('JS: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
    const q = new URLSearchParams(base);
    q.set('shot', '1');
    if (full) q.set('full', '1');
    await page.goto(url + '#/' + man.start + '?' + q.toString());
    await page.waitForFunction(() => window.Proto && window.Proto.screen, null, { timeout: 15000 });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
    return page;
  }
  async function show(page, id, states) {
    await page.evaluate(({ id, st, base }) => {
      window.Proto.closeAll();
      const patch = Object.assign({}, base);
      String(st || '').split(/[,&\s]+/).filter(Boolean).forEach(p => { const i = p.indexOf('='); if (i > 0) patch[p.slice(0, i)] = p.slice(i + 1); });
      window.Proto.patch(patch);
      window.Proto.go(id, { replace: true });
    }, { id, st: states, base });
    await page.waitForTimeout(150);
  }

  const screens = man.screens.filter(s => !only || only.includes(s.id));
  const layers = opt('no-layers') ? [] : man.overlays.filter(l => !only || only.includes(l.id));

  const full = await openPage(!mobile || !opt('first-only'));
  let n = 0;
  for (const s of screens) {
    n++;
    await show(full, s.id, s.states);
    const name = prefix + '_' + String(n).padStart(2, '0') + '_' + s.id + '.png';
    await full.screenshot({ path: path.join(outDir, name), fullPage: true });
    shots.push({ file: name, screen: s.id, title: s.title, kind: mobile && opt('first-only') ? 'first' : 'full' });
  }

  let first = full;
  if (mobile && !opt('first-only')) {
    first = await openPage(false);
    n = 0;
    for (const s of screens) {
      n++;
      await show(first, s.id, s.states);
      const name = prefix + '_' + String(n).padStart(2, '0') + '_' + s.id + '__first.png';
      await first.screenshot({ path: path.join(outDir, name), fullPage: false });
      shots.push({ file: name, screen: s.id, title: s.title, kind: 'first' });
    }
  }

  let m = 0;
  const layerPage = mobile ? first : full;
  for (const l of layers) {
    m++;
    await show(layerPage, l.over || man.start, l.states);
    await layerPage.evaluate(id => window.Proto.open(id), l.id);
    await layerPage.waitForTimeout(250);
    const name = prefix + '_L' + String(m).padStart(2, '0') + '_' + l.id + '.png';
    await layerPage.screenshot({ path: path.join(outDir, name), fullPage: false });
    shots.push({ file: name, layer: l.id, type: l.type, over: l.over || man.start });
    await layerPage.evaluate(() => window.Proto.closeAll());
  }

  const lint = await layerPage.evaluate(() => window.Proto.lint());
  lint.forEach(x => problems.push('разметка: ' + x));
  await browser.close();

  const uniqProblems = Array.from(new Set(problems));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ file: path.resolve(file), platform: prefix, viewport: vp, state: base, shots, problems: uniqProblems }, null, 2), 'utf8');
  console.log('снимков: ' + shots.length + ' -> ' + path.resolve(outDir));
  shots.forEach(s => console.log('  ' + s.file));
  if (uniqProblems.length) { console.log('ПРОБЛЕМЫ:'); uniqProblems.forEach(p => console.log('  - ' + p)); }
  else console.log('ошибок JS и разметки нет');
})().catch(e => { console.error(e); process.exit(1); });

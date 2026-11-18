#!/usr/bin/env node
// Проверка страницы <Фича>.before-after.html после правки build_before_after.js: прототип помещается в окно,
// колесо над экраном прототипа не листает страницу (замечание PO от 12.11.2026), работает режим «На весь экран».
//   node ~/.claude/skills/prd/scripts/check_ba_window.js <Фича>.before-after.html <папка для снимков>
// Три размера окна: 1920×1050, 1440×800, 1000×700. Запускать из корня проекта: playwright берётся из его node_modules.
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const [file, outDir] = process.argv.slice(2);
if (!file || !outDir) { console.log('Использование: check_ba_window.js <Фича>.before-after.html <папка для снимков>'); process.exit(2); }
let chromium;
try { ({ chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright')); }
catch (e) { console.log('playwright не найден в node_modules текущей папки: запусти из корня проекта'); process.exit(2); }
async function settle(p) { let last = -1; for (let i = 0; i < 60; i += 1) { const y = await p.evaluate(() => window.scrollY); if (y === last) return; last = y; await p.waitForTimeout(150); } }
(async () => {
  let b; for (const ch of [undefined, 'msedge', 'chrome']) { try { b = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { /* next */ } }
  const res = []; const ok = (n, c, extra = '') => res.push(`${c ? 'ok ' : 'FAIL'} ${n}${extra ? ' (' + extra + ')' : ''}`);
  for (const [W, H] of [[1920, 1050], [1440, 800], [1000, 700]]) {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(pathToFileURL(path.resolve(file)).href);
    for (const plat of ['mobile', 'desktop']) {
      if (!(await p.$(`#prototype-${plat}`))) continue;
      const t = `${W}×${H} ${plat}`;
      await p.evaluate((x) => { const bt = document.querySelector(`[data-set="plat"][data-val="${x}"]`); if (bt) bt.click(); }, plat);
      await p.click(`.nav a.pnav--${plat}`);
      await settle(p);
      const sec = `#prototype-${plat}`;
      // 1. экран прототипа целиком в окне, под шапкой
      const barB = await p.$eval('.bar', (e) => e.getBoundingClientRect().bottom);
      const dev = await p.locator(`${sec} [data-pdev]`).boundingBox();
      ok(`${t}: прототип целиком в окне`, dev.y >= barB - 1 && dev.y + dev.height <= H + 1, `верх ${Math.round(dev.y)}, низ ${Math.round(dev.y + dev.height)}, шапка до ${Math.round(barB)}`);
      await p.screenshot({ path: path.join(outDir, `proto_${plat}_${W}.jpg`), type: 'jpeg', quality: 70 });
      // 2. колесо над экраном прототипа не листает страницу
      const box = await p.locator(`${sec} .pscr`).boundingBox();
      await p.mouse.move(box.x + box.width / 2, box.y + Math.min(200, box.height / 2));
      const y0 = await p.evaluate(() => window.scrollY);
      for (let i = 0; i < 6; i += 1) { await p.mouse.wheel(0, -200); await p.waitForTimeout(40); }
      const y1 = await p.evaluate(() => window.scrollY);
      ok(`${t}: вверх у верхнего края - страница на месте`, y1 === y0, `scrollY ${y0} -> ${y1}`);
      ok(`${t}: подсказка у края показана`, await p.$eval(`${sec} .phint`, (e) => e.classList.contains('on')));
      for (let i = 0; i < 40; i += 1) { await p.mouse.wheel(0, 300); await p.waitForTimeout(15); }
      const st = await p.$eval(`${sec} .pscr`, (e) => [e.scrollTop, e.scrollHeight - e.clientHeight]);
      const y2 = await p.evaluate(() => window.scrollY);
      ok(`${t}: вниз - экран прототипа листается до конца`, Math.abs(st[0] - st[1]) < 2, `scrollTop ${Math.round(st[0])} из ${Math.round(st[1])}`);
      ok(`${t}: вниз у нижнего края - страница на месте`, y2 === y0, `scrollY ${y0} -> ${y2}`);
      await p.mouse.move(4, H - 30, { steps: 4 });
      await p.waitForTimeout(200); // курсор должен уйти с прототипа до прокрутки, иначе колесо достаётся его экрану
      await p.mouse.wheel(0, -300); await p.waitForTimeout(300);
      const y3 = await p.evaluate(() => window.scrollY);
      ok(`${t}: курсор вне прототипа - страница листается`, y3 < y2, `scrollY ${y2} -> ${y3}`);
      // 3. режим «На весь экран»
      await p.click(`.nav a.pnav--${plat}`); await settle(p);
      await p.click(`${sec} .pfull`);
      await p.waitForTimeout(250);
      const full = await p.evaluate((s) => { const e = document.querySelector(s); const d = e.querySelector('[data-pdev]').getBoundingClientRect(); return { on: e.classList.contains('full'), lock: getComputedStyle(document.body).overflow, top: d.top, bottom: d.bottom, left: d.left, right: d.right }; }, sec);
      ok(`${t}: на весь экран - страница заблокирована, прототип в окне`, full.on && full.lock === 'hidden' && full.top >= 0 && full.bottom <= H + 1 && full.right <= W + 1, `верх ${Math.round(full.top)}, низ ${Math.round(full.bottom)}, право ${Math.round(full.right)}`);
      await p.screenshot({ path: path.join(outDir, `proto_${plat}_${W}_full.jpg`), type: 'jpeg', quality: 70 });
      // переход по зоне в полноэкранном режиме
      const before = await p.$eval(`${sec} .pname`, (e) => e.textContent);
      await p.locator(`${sec} .pin .hs`).first().click();
      await p.waitForTimeout(120);
      ok(`${t}: на весь экран - зоны работают`, (await p.$eval(`${sec} .pname`, (e) => e.textContent)) !== before);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(150);
      ok(`${t}: Esc закрывает режим`, await p.evaluate((s) => !document.querySelector(s).classList.contains('full') && getComputedStyle(document.body).overflow !== 'hidden', sec));
      await p.click(`${sec} [data-p="home"]`);
      // 4. список «Куда можно нажать»: кнопок столько же, сколько зон на экране, кнопка ведёт на экран
      const cnt = await p.$$eval(`${sec} .pgos .pgo__i`, (a) => a.length);
      const zones = await p.$$eval(`${sec} .pin .hs`, (a) => a.length);
      ok(`${t}: «Куда можно нажать» - кнопок столько же, сколько зон`, cnt > 0 && cnt === zones, `${cnt} и ${zones}`);
      const was = await p.$eval(`${sec} .pname`, (e) => e.textContent);
      await p.locator(`${sec} .pgos .pgo__i`).first().click();
      await p.waitForTimeout(120);
      ok(`${t}: «Куда можно нажать» - кнопка открывает экран`, (await p.$eval(`${sec} .pname`, (e) => e.textContent)) !== was);
      await p.screenshot({ path: path.join(outDir, `proto_${plat}_${W}_go.jpg`), type: 'jpeg', quality: 70 });
      await p.click(`${sec} [data-p="home"]`);
    }
    if (errs.length) res.push('FAIL ошибки JS: ' + errs.join('; '));
    await p.close();
  }
  console.log(res.join('\n'));
  const fails = res.filter((r) => r.startsWith('FAIL')).length;
  console.log(`проверок ${res.length}, не прошло ${fails}`);
  await b.close();
  process.exit(fails ? 1 : 0);
})();

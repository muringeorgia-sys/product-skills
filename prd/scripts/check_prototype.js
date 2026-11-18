#!/usr/bin/env node
// Автотест прототипа в <Фича>.before-after.html: нажимает каждую зону каждого экрана в каждом прототипе
// (mobile из prototype и desktop из prototypeDesktop), проверяет экран назначения и для keepScroll -
// что заголовок остался на месте (или упёрлись в конец страницы).
//   node ~/.claude/skills/prd/scripts/check_prototype.js <Фича>.before-after.html
// Запускать из корня проекта: playwright берётся из его node_modules.
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const file = process.argv[2];
if (!file) { console.log('Использование: check_prototype.js <Фича>.before-after.html'); process.exit(2); }
let chromium;
try { ({ chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright')); }
catch (e) { console.log('playwright не найден в node_modules текущей папки: запусти из корня проекта'); process.exit(2); }
(async () => {
  let b;
  for (const ch of [undefined, 'msedge', 'chrome']) { try { b = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { /* дальше */ } }
  if (!b) { console.log('нет браузера для playwright'); process.exit(2); }
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(pathToFileURL(path.resolve(file)).href);
  const VS = await p.evaluate(() => window.__PROTO && window.__PROTO.variants && window.__PROTO.variants.map((v) => ({ plat: v.plat, start: v.start, screens: v.screens.map((s) => ({ id: s.id, name: s.name, hs: s.hs })) })));
  if (!VS || !VS.length) { console.log('в файле нет прототипа (блок prototype или prototypeDesktop в before_after.json)'); await b.close(); process.exit(1); }
  const nk = (l) => String(l || '').replace(/^(Свернуть|Развернуть|Скрыть|Показать)\s*/i, '').replace(/[«»"]/g, '').trim().toLowerCase();
  const fails = [];
  const warns = [];
  const stats = [];
  for (const PD of VS) {
    const sec = `#prototype-${PD.plat}`;
    // переключатель Desktop / Mobile на странице: показываем нужный прототип
    await p.evaluate((plat) => { const bt = document.querySelector(`[data-set="plat"][data-val="${plat}"]`); if (bt) bt.click(); }, PD.plat);
    await p.waitForTimeout(80);
    if (!(await p.isVisible(sec))) { fails.push(`${PD.plat}: прототип не виден при выбранной платформе`); continue; }
    const tag = VS.length > 1 ? `${PD.plat} ` : '';
    const reach = new Set([PD.start]);
    for (const s of PD.screens) {
      if (!s.hs.length) fails.push(`${tag}${s.id}: нет ни одной зоны (тупик)`);
      for (const [j, h] of s.hs.entries()) {
        reach.add(h.to);
        await p.click(`${sec} .plist li[data-id="${s.id}"]`);
        const K = await p.$eval(`${sec} .pscr`, (e) => Number(e.dataset.k) || 1);
        if (h.keep) await p.$eval(`${sec} .pscr`, (e, y) => { e.scrollTop = Math.max(0, y - 200); }, h.y * K);
        const before = await p.$eval(`${sec} .pscr`, (e) => e.scrollTop);
        const zones = await p.$$(`${sec} .pin .hs`);
        await zones[j].click();
        await p.waitForTimeout(80);
        const got = await p.$eval(`${sec} .pname`, (e) => e.textContent);
        const target = PD.screens.find((x) => x.id === h.to);
        let ok = got === target.name;
        if (ok && h.keep) {
          const after = await p.$eval(`${sec} .pscr`, (e) => e.scrollTop);
          const max = await p.$eval(`${sec} .pscr`, (e) => e.scrollHeight - e.clientHeight);
          const t = target.hs.find((x) => x.keep && nk(x.label) === nk(h.label));
          if (!t) { fails.push(`${tag}${s.id}#${j} «${h.label}»: на ${h.to} нет зоны с тем же заголовком`); continue; }
          if (Math.abs((t.y * K - after) - (h.y * K - before)) > 5 && Math.abs(after - max) > 3) ok = false;
        }
        if (!ok) fails.push(`${tag}${s.id}#${j} «${h.label}» → ${h.to}: открыт «${got}»`);
      }
    }
    PD.screens.filter((s) => !reach.has(s.id)).forEach((s) => warns.push(`${tag}${s.id} «${s.name}»: открывается только из списка экранов`));
    stats.push(`${PD.plat}: экранов ${PD.screens.length}, зон ${PD.screens.reduce((a, s) => a + s.hs.length, 0)}`);
  }
  console.log(`${stats.join('; ')}; ошибок ${fails.length}, ошибок JS ${errs.length}`);
  fails.forEach((x) => console.log('- ' + x)); warns.forEach((x) => console.log('предупреждение: ' + x)); errs.forEach((x) => console.log('JS: ' + x));
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();

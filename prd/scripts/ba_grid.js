#!/usr/bin/env node
// Область картинки с координатной сеткой в CSS px кадра: чтобы измерить atNow на скриншоте прода, а не ставить на глаз.
//   node ~/.claude/skills/prd/scripts/ba_grid.js <картинка> <ширина кадра 1440|390> <y от> <y до> <out.png> [x от] [x до]
// Линии через 10 px, подписи через 50 px. Прочитай по сетке [x, y, ширина, высота] элемента и впиши в changes[].atNow.
// Запускать из корня проекта: playwright берётся из его node_modules.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const [file, frameA, y0A, y1A, out, x0A, x1A] = process.argv.slice(2);
if (!file || !out) { console.log('Использование: ba_grid.js <картинка> <ширина кадра> <y от> <y до> <out.png> [x от] [x до]'); process.exit(2); }
let chromium;
try { ({ chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright')); }
catch (e) { console.log('playwright не найден в node_modules текущей папки: запусти из корня проекта'); process.exit(2); }

(async () => {
  const frame = Number(frameA) || 1440;
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(file).toLowerCase()];
  if (!mime || !fs.existsSync(file)) { console.log('нужен существующий файл PNG, JPG или WebP: ' + file); process.exit(1); }
  // картинка встроена в страницу: с пустой страницы file-ссылка не грузится
  const src = `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  let b;
  for (const ch of [undefined, 'msedge', 'chrome']) { try { b = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { /* следующий канал */ } }
  if (!b) { console.log('нет браузера для playwright'); process.exit(2); }
  const page = await b.newPage({ viewport: { width: frame, height: 900 }, deviceScaleFactor: frame < 600 ? 2 : 1 });
  await page.setContent(`<body style="margin:0"><div id="w" style="position:relative;width:${frame}px"><img id="i" src="${src}" style="display:block;width:${frame}px"></div></body>`);
  await page.waitForFunction(() => { const i = document.getElementById('i'); return i.complete && i.naturalWidth > 0; });
  const H = await page.evaluate(() => document.getElementById('w').offsetHeight);
  const x0 = Math.max(0, Number(x0A) || 0);
  const x1 = Math.min(frame, Number(x1A) || frame);
  const y0 = Math.max(0, Number(y0A) || 0);
  const y1 = Math.min(H, Number(y1A) || H);
  if (y1 <= y0 || x1 <= x0) { console.log(`область пуста: высота картинки в кадре ${H} px`); await b.close(); process.exit(1); }
  // подписи только по верхнему и левому краю области: не закрывают картинку
  await page.evaluate(([X0, Y0]) => {
    const w = document.getElementById('w'); const W = w.offsetWidth; const h = w.offsetHeight;
    let g = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" style="position:absolute;left:0;top:0;font:bold 10px Arial">`;
    for (let x = 0; x <= W; x += 10) g += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="rgba(255,0,0,${x % 50 ? 0.15 : 0.6})"/>`;
    for (let y = 0; y <= h; y += 10) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(0,0,255,${y % 50 ? 0.15 : 0.6})"/>`;
    for (let x = Math.ceil(X0 / 50) * 50; x <= W; x += 50) g += `<text x="${x + 2}" y="${Y0 + 10}" fill="red" stroke="#fff" stroke-width="3" paint-order="stroke">${x}</text>`;
    for (let y = Math.ceil(Y0 / 50) * 50; y <= h; y += 50) g += `<text x="${X0 + 2}" y="${y - 2}" fill="blue" stroke="#fff" stroke-width="3" paint-order="stroke">${y}</text>`;
    w.insertAdjacentHTML('beforeend', g + '</svg>');
  }, [x0, y0]);
  await page.screenshot({ path: out, fullPage: true, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
  await b.close();
  console.log(`${out}: кадр ${frame}×${H}, область x ${x0}-${x1}, y ${y0}-${y1}`);
})();

#!/usr/bin/env node
// Рендер HTML-раскладки в PNG на всю высоту страницы.
//   node render_html.js <файл.html> <файл.png> <ширина, например 1440 или 390>
// Запускать из корня проекта: playwright берётся из его node_modules.
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

const [html, png, widthArg] = process.argv.slice(2);
if (!html || !png) { console.log('Использование: render_html.js <html> <png> <ширина>'); process.exit(2); }
const width = Number(widthArg) || 1440;

let chromium;
try {
  ({ chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright'));
} catch (e) {
  console.log('playwright не найден в node_modules текущей папки: запусти из корня проекта');
  process.exit(1);
}

(async () => {
  let browser;
  for (const channel of [undefined, 'msedge', 'chrome']) {
    try { browser = await chromium.launch(channel ? { channel } : {}); break; } catch (e) { /* следующий канал */ }
  }
  if (!browser) { console.log('не удалось запустить браузер: нет chromium, Edge и Chrome для playwright'); process.exit(1); }
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(path.resolve(html)).href);
  await page.screenshot({ path: png, fullPage: true });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await browser.close();
  console.log(`${png}: ${width}x${height}`);
})();

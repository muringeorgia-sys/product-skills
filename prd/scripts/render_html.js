#!/usr/bin/env node
// Рендер HTML-раскладки или страницы прода в картинку на всю высоту.
//   node render_html.js <файл.html | https://...> <файл.png | .jpg> <ширина 1440 | 390> [--mobile] [--scale N] [--dismiss "текст кнопки"] [--wait мс]
//   --mobile   телефон: мобильный user agent и touch (для страниц прода с шириной 390)
//   --scale    плотность пикселей, по умолчанию 2
//   --dismiss  нажать кнопку с этим текстом, если она есть (окно региона, cookies)
//   --wait     пауза после загрузки, по умолчанию 1500 мс для адреса и 0 для файла
//   --max-height  предел высоты снимка страницы прода в CSS px, по умолчанию 6000 (лента с подгрузкой бесконечна)
// Для скриншотов прода бери .jpg: файл в 5-10 раз меньше PNG.
// Запускать из корня проекта: playwright берётся из его node_modules.
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const mobile = flag('--mobile');
const scale = Number(opt('--scale')) || 2;
const dismiss = opt('--dismiss');
const waitArg = opt('--wait');
const maxH = Number(opt('--max-height')) || 6000;
const [src, out, widthArg] = args;
if (!src || !out) { console.log('Использование: render_html.js <html | url> <png | jpg> <ширина> [--mobile] [--scale N] [--dismiss "текст"] [--wait мс]'); process.exit(2); }
const width = Number(widthArg) || 1440;
const isUrl = /^https?:\/\//i.test(src);
const wait = waitArg !== undefined ? Number(waitArg) : (isUrl ? 1500 : 0);

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
  const ctx = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    deviceScaleFactor: scale,
    locale: 'ru-RU',
    ...(mobile ? {
      isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    } : {}),
  });
  const page = await ctx.newPage();
  try {
    await page.goto(isUrl ? src : pathToFileURL(path.resolve(src)).href, { waitUntil: isUrl ? 'networkidle' : 'load', timeout: 60000 });
  } catch (e) {
    if (!isUrl) throw e;
    console.log('страница не дождалась тишины в сети за 60 с, снимаю как есть');
  }
  if (dismiss) await page.getByText(dismiss, { exact: false }).first().click({ timeout: 3000 }).catch(() => console.log(`кнопка «${dismiss}» не найдена`));
  const jpg = /\.jpe?g$/i.test(out);
  const shot = jpg ? { type: 'jpeg', quality: 80 } : {};
  let height;
  if (isUrl) {
    // Прокрутка вниз (не дальше предела), чтобы подгрузились ленивые картинки, затем наверх.
    await page.evaluate(async (max) => {
      for (let y = 0; y < Math.min(document.documentElement.scrollHeight, max); y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
      window.scrollTo(0, 0);
    }, maxH);
    // Окно на всю высоту: сайт дорисовывает карточки, которые рисует только в видимой области,
    // а закреплённая шапка попадает в снимок один раз, сверху.
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    height = Math.min(full, maxH);
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(Math.max(wait, 800));
    await page.screenshot({ path: out, ...shot });
    if (full > maxH) console.log(`страница ${full} px обрезана до ${maxH} px (--max-height)`);
  } else {
    if (wait) await page.waitForTimeout(wait);
    await page.screenshot({ path: out, fullPage: true, ...shot });
    height = await page.evaluate(() => document.documentElement.scrollHeight);
  }
  await browser.close();
  console.log(`${out}: ${width}x${height}`);
})();

#!/usr/bin/env node
// PRD в один HTML-файл: картинки встраиваются внутрь, внешних файлов не нужно.
//   node md2html.js <prd.md> <prd.html>
// Запускать из корня проекта: marked берётся из его node_modules.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.log('Использование: md2html.js <prd.md> <prd.html>'); process.exit(2); }

let marked;
try {
  ({ marked } = createRequire(path.join(process.cwd(), 'package.json'))('marked'));
} catch (e) {
  console.log('marked не найден в node_modules текущей папки: запусти из корня проекта');
  process.exit(1);
}

const dir = path.dirname(path.resolve(src));
const md = fs.readFileSync(src, 'utf8');
const title = (md.match(/^# (.+)$/m) || [, path.basename(src, '.md')])[1];
const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const missing = [];

let html = marked.parse(md.replace(/<!--[\s\S]*?-->/g, ''));
html = html.replace(/<img src="([^"]+)"/g, (all, link) => {
  if (/^(https?:|data:)/.test(link)) return all;
  const file = path.resolve(dir, decodeURI(link));
  const type = types[path.extname(file).toLowerCase()];
  if (!type || !fs.existsSync(file)) { missing.push(link); return all; }
  return `<img src="data:${type};base64,${fs.readFileSync(file).toString('base64')}"`;
});
html = html.replace(/<table>/g, '<div class="table"><table>').replace(/<\/table>/g, '</table></div>');

const css = `
body{font:16px/1.55 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1d1d1f;background:#f5f5f7;margin:0}
main{max-width:960px;margin:32px auto;background:#fff;padding:40px 56px;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
h1{font-size:30px;margin:0 0 8px}h2{font-size:22px;margin:36px 0 12px;padding-top:12px;border-top:1px solid #e5e5ea}
h3{font-size:17px;margin:24px 0 8px}p,li{margin:6px 0}
img{max-width:100%;border:1px solid #e5e5ea;border-radius:8px;margin:8px 0}
.table{overflow-x:auto;margin:12px 0}table{border-collapse:collapse;width:100%;font-size:14px}
th,td{border:1px solid #e5e5ea;padding:6px 10px;text-align:left;vertical-align:top}th{background:#f5f5f7}
code{background:#f2f2f5;padding:1px 4px;border-radius:4px;font-size:13px}
pre{background:#f2f2f5;padding:12px;border-radius:8px;overflow-x:auto}pre code{background:none;padding:0}
@media print{body{background:#fff}main{box-shadow:none;margin:0;padding:0}}`;

fs.writeFileSync(out, `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${css}</style></head>
<body><main>
${html}
</main></body></html>
`);
console.log(`${out}: ${Math.round(fs.statSync(out).size / 1024)} КБ`);
if (missing.length) { console.log('Не встроены картинки:\n- ' + missing.join('\n- ')); process.exit(1); }

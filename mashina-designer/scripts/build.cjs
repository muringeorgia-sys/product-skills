#!/usr/bin/env node
// Сборка кликабельного прототипа Mashina.kg: исходник агента + дизайн-система + рантайм
// = один HTML без внешних файлов (можно открыть с диска и приложить в Confluence).
//
//   node build.cjs <исходник.src.html> --out <итог.prototype.html>
//   node build.cjs <исходник.src.html> --check        только проверка, файл не пишется
//   --ds <папка>                                       другая папка дизайн-системы (для проверки версий DS)
//
// Что делает:
//   1. <!-- @include имя ключ="значение" --> -> templates/partials/имя.html, {{@ключ}} подставляется;
//   2. <i data-icon="имя"></i> -> <svg class="ic"><use href="#ic-имя"></use></svg> + спрайт из design-system/icons;
//   3. <i data-logo="вариант"></i> -> встроенный SVG из design-system/logo (по умолчанию mashina-logo);
//   4. <img src="локальный файл"> и url(локальный файл) -> data URI;
//   5. встраивает шрифт сайта, tokens.css, components.css, runtime.css, стили и скрипты фичи, runtime.js;
//   6. проверяет: переходы и окна, неизвестные классы, сырые цвета, неизвестные var(--…), заглушки текста.
// Код выхода 1 - есть ошибки (файл всё равно пишется, чтобы его можно было открыть и посмотреть).
'use strict';
const fs = require('fs');
const path = require('path');

const SKILL = path.resolve(__dirname, '..');
const dsArg = process.argv.indexOf('--ds');
const DS = dsArg > 0 ? path.resolve(process.argv[dsArg + 1]) : path.join(SKILL, 'design-system');
const P = {
  tokens: path.join(DS, 'tokens.css'),
  components: path.join(DS, 'components.css'),
  icons: path.join(DS, 'icons'),
  logo: path.join(DS, 'logo'),
  fonts: path.join(DS, 'fonts'),
  runtimeCss: path.join(SKILL, 'runtime', 'runtime.css'),
  runtimeJs: path.join(SKILL, 'runtime', 'runtime.js'),
  partials: path.join(SKILL, 'templates', 'partials'),
  partialsCss: path.join(SKILL, 'templates', 'partials', 'partials.css')
};

const argv = process.argv.slice(2);
const src = argv.find((a, i) => !a.startsWith('--') && !['--out', '--ds'].includes(argv[i - 1]));
const outIdx = argv.indexOf('--out');
const out = outIdx >= 0 ? argv[outIdx + 1] : null;
const checkOnly = argv.includes('--check');
if (!src || (!out && !checkOnly)) {
  console.log('Использование: node build.cjs <исходник.src.html> --out <итог.prototype.html> | --check');
  process.exit(2);
}
const srcPath = path.resolve(src);
const srcDir = path.dirname(srcPath);

const errors = [], warns = [], infos = [];
const readOr = (p, label) => {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { errors.push('не найден ' + label + ': ' + p); return ''; }
};
const stripCssComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const uniq = a => Array.from(new Set(a));
const list = (a, n = 12) => a.slice(0, n).join(', ') + (a.length > n ? ' … ещё ' + (a.length - n) : '');

let html = readOr(srcPath, 'исходник');
if (!html) { errors.forEach(e => console.log('ОШИБКА: ' + e)); process.exit(1); }

/* ---------- 1. шаблоны @include ---------- */
function parseAttrs(s) {
  const o = {};
  String(s || '').replace(/([\w-]+)\s*=\s*"([^"]*)"/g, (_, k, v) => { o[k] = v; return ''; });
  return o;
}
function expandIncludes(s, depth) {
  return s.replace(/<!--\s*@include\s+([\w-]+)([^>]*?)-->/g, (m, name, rest) => {
    const f = path.join(P.partials, name + '.html');
    if (!fs.existsSync(f)) {
      const have = fs.existsSync(P.partials) ? fs.readdirSync(P.partials).filter(x => x.endsWith('.html')).map(x => x.slice(0, -5)) : [];
      errors.push('нет шаблона @include ' + name + '. Есть: ' + (have.join(', ') || 'ничего'));
      return '';
    }
    if (depth > 4) { errors.push('слишком глубокая вложенность @include ' + name); return ''; }
    const params = parseAttrs(rest);
    let body = fs.readFileSync(f, 'utf8').replace(/<!--\s*partial:[\s\S]*?-->\s*/g, '');
    body = body.replace(/\{\{@([\w-]+)\}\}/g, (_, k) => (params[k] != null ? params[k] : ''));
    return expandIncludes(body, depth + 1);
  });
}
html = expandIncludes(html, 0);

/* ---------- 2. конфиг, заголовок, стили, скрипты ---------- */
let cfg = {};
let cfgRaw = '';
html = html.replace(/<script\b[^>]*\bid\s*=\s*["']proto-config["'][^>]*>([\s\S]*?)<\/script>/i, (m, body) => { cfgRaw = body.trim(); return ''; });
if (!cfgRaw) errors.push('нет <script type="application/json" id="proto-config">');
else { try { cfg = JSON.parse(cfgRaw); } catch (e) { errors.push('proto-config: неверный JSON (' + e.message + ')'); } }

let title = '';
html = html.replace(/<title>([\s\S]*?)<\/title>/i, (m, t) => { title = t.trim(); return ''; });

const featureCss = [];
html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css) => { featureCss.push(css.trim()); return ''; });

const featureJs = [];
html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, js) => {
  if (/type\s*=\s*["'](application\/json|text\/template)["']/i.test(attrs)) return m;
  if (/\bsrc\s*=/.test(attrs)) { warns.push('внешний скрипт удалён: ' + attrs.trim()); return ''; }
  featureJs.push(js.trim());
  return '';
});
html = html.replace(/<link\b[^>]*>/gi, m => {
  if (/rel\s*=\s*["']?stylesheet/i.test(m) && !/(tokens|components|runtime)\.css/.test(m)) warns.push('внешний CSS удалён: ' + m);
  return /rel\s*=\s*["']?stylesheet/i.test(m) ? '' : m;
});

let body = html;
const bm = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
if (bm) body = bm[1];
else body = html.replace(/<!doctype[^>]*>/i, '').replace(/<\/?html\b[^>]*>/gi, '').replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, '');
body = body.trim();

/* ---------- 3. иконки ---------- */
// SVG из Figma чистится от скриптов и обработчиков: в прототипе они не нужны
const cleanSvg = s => s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
  .replace(/\son\w+\s*=\s*"[^"]*"/gi, '').replace(/(href\s*=\s*")javascript:[^"]*"/gi, '$1#"');
const iconFiles = fs.existsSync(P.icons) ? fs.readdirSync(P.icons).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)) : [];
const usedIcons = new Set();
body = body.replace(/<i\b([^>]*?)\bdata-icon\s*=\s*"([^"]+)"([^>]*?)(?:\/>|>\s*<\/i>)/g, (m, a1, name, a2) => {
  if (name.includes('{{')) return m;
  const attrs = parseAttrs(a1 + ' ' + a2);
  usedIcons.add(name);
  const cls = ('ic ' + (attrs.class || '')).trim();
  const label = attrs['aria-label'] || attrs.title;
  const a11y = label ? 'role="img" aria-label="' + label + '"' : 'aria-hidden="true"';
  const keep = ['style', 'data-ds', 'data-note'].filter(k => attrs[k] != null).map(k => k + '="' + attrs[k] + '"').join(' ');
  return '<svg class="' + cls + '" ' + a11y + ' focusable="false"' + (keep ? ' ' + keep : '') + '><use href="#ic-' + name + '"></use></svg>';
});
featureJs.concat(body.match(/<template[\s\S]*?<\/template>/g) || []).join('\n').replace(/data-icon\s*=\s*\\?["']([\w-]+)\\?["']/g, (m, n) => { usedIcons.add(n); return m; });
const missingIcons = [...usedIcons].filter(n => !iconFiles.includes(n));
if (missingIcons.length) errors.push('нет иконок в design-system/icons: ' + missingIcons.join(', ') + '. Есть: ' + list(iconFiles, 60));
const symbols = [...usedIcons].filter(n => iconFiles.includes(n)).map(n => {
  let svg = cleanSvg(fs.readFileSync(path.join(P.icons, n + '.svg'), 'utf8'))
    .replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<title>[\s\S]*?<\/title>/g, '');
  let vb = (svg.match(/viewBox\s*=\s*"([^"]+)"/) || [])[1] || '0 0 24 24';
  // Figma иногда отдаёт только вектор с тесной рамкой: центрируем его в ближайшей рамке DS 16/20/22/24,
  // чтобы иконка была своего размера, а не растягивалась на весь .ic
  const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number);
  const frame = [16, 20, 22, 24].find(f => f >= Math.max(vw, vh) - 0.01);
  if (frame && (Math.abs(vw - frame) > 0.01 || Math.abs(vh - frame) > 0.01)) {
    const r = x => Math.round(x * 1000) / 1000;
    vb = r(vx - (frame - vw) / 2) + ' ' + r(vy - (frame - vh) / 2) + ' ' + frame + ' ' + frame;
  }
  // атрибуты корня (fill="none", stroke…) переносим на обёртку: у <symbol> их иначе нет
  const rootTag = (svg.match(/<svg\b[^>]*>/) || [''])[0];
  const paint = (rootTag.match(/\s(?:fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)\s*=\s*"[^"]*"/g) || []).join('');
  let inner = (svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/) || [])[1] || '';
  const colors = uniq((inner.match(/(?:fill|stroke)\s*=\s*"(#[0-9a-fA-F]{3,8}|black|white)"/g) || []).map(s => s.split('"')[1].toLowerCase()));
  if (colors.length === 1) inner = inner.replace(/((?:fill|stroke)\s*=\s*")(#[0-9a-fA-F]{3,8}|black|white)(")/g, '$1currentColor$3');
  else if (colors.length > 1) infos.push('иконка ' + n + ' многоцветная, цвет не меняется: ' + colors.join(' '));
  return '<symbol id="ic-' + n + '" viewBox="' + vb + '"><g' + paint + '>' + inner.trim() + '</g></symbol>';
});

/* ---------- 4. логотип ---------- */
const logoFiles = fs.existsSync(P.logo) ? fs.readdirSync(P.logo).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)) : [];
body = body.replace(/<i\b([^>]*?)\bdata-logo(?:\s*=\s*"([^"]*)")?([^>]*?)(?:\/>|>\s*<\/i>)/g, (m, a1, variant, a2) => {
  const name = variant || 'mashina-logo';
  if (!logoFiles.includes(name)) { errors.push('нет логотипа design-system/logo/' + name + '.svg. Есть: ' + (logoFiles.join(', ') || 'ничего')); return m; }
  const attrs = parseAttrs(a1 + ' ' + a2);
  let svg = cleanSvg(fs.readFileSync(path.join(P.logo, name + '.svg'), 'utf8')).replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const extra = ' class="logo ' + (attrs.class || '') + '"' + (attrs.style ? ' style="' + attrs.style + '"' : '') + ' role="img" aria-label="mashina.kg"';
  return svg.replace(/<svg\b([^>]*?)\s(?:class|style|width|height)\s*=\s*"[^"]*"/g, '<svg$1').replace(/<svg\b([^>]*?)\s(?:class|style|width|height)\s*=\s*"[^"]*"/g, '<svg$1').replace(/<svg\b/, '<svg' + extra);
});

/* ---------- 5. локальные картинки ---------- */
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
let inlinedBytes = 0;
function inlineFile(ref) {
  if (/^(data:|https?:|\/\/|#)/i.test(ref) || ref.includes('{{')) return null;
  const f = path.resolve(srcDir, decodeURI(ref));
  if (!fs.existsSync(f)) { errors.push('нет файла картинки: ' + ref); return null; }
  const ext = path.extname(f).slice(1).toLowerCase();
  if (!MIME[ext]) { warns.push('неизвестный тип картинки: ' + ref); return null; }
  const buf = fs.readFileSync(f);
  inlinedBytes += buf.length;
  return 'data:' + MIME[ext] + ';base64,' + buf.toString('base64');
}
body = body.replace(/(<img\b[^>]*?\bsrc\s*=\s*")([^"]+)(")/gi, (m, a, ref, z) => { const d = inlineFile(ref); return d ? a + d + z : m; });
const featureCssStr = featureCss.join('\n\n').replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (m, ref) => { const d = inlineFile(ref); return d ? 'url("' + d + '")' : m; });
if (inlinedBytes > 1.5 * 1024 * 1024) warns.push('встроенные картинки весят ' + Math.round(inlinedBytes / 1024) + ' КБ: сожми их, файл тяжело открывать');

/* ---------- 6. проверки ---------- */
const tokensCss = readOr(P.tokens, 'tokens.css');
const componentsCss = readOr(P.components, 'components.css');
const runtimeCss = readOr(P.runtimeCss, 'runtime.css');
const partialsCss = fs.existsSync(P.partialsCss) ? fs.readFileSync(P.partialsCss, 'utf8') : '';
const runtimeJs = readOr(P.runtimeJs, 'runtime.js');

const all = (re, s) => { const r = []; let m; const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); while ((m = g.exec(s))) r.push(m); return r; };
const screens = all(/data-screen\s*=\s*"([^"]+)"/, body).map(m => m[1]);
const layers = all(/data-(?:modal|sheet|drawer|popover)\s*=\s*"([^"]+)"/, body).map(m => m[1]);
const dup = a => a.filter((x, i) => a.indexOf(x) !== i);
if (!screens.length) errors.push('нет ни одного экрана <section data-screen="…" data-title="…">');
if (dup(screens).length) errors.push('повтор id экранов: ' + uniq(dup(screens)).join(', '));
if (dup(layers).length) errors.push('повтор id окон: ' + uniq(dup(layers)).join(', '));
const scanTargets = body + '\n' + featureJs.join('\n');
const gos = uniq(all(/data-go\s*=\s*\\?"([^"\\{}$]+)\\?"/, scanTargets).map(m => m[1]));
const opens = uniq(all(/data-open\s*=\s*\\?"([^"\\{}$]+)\\?"/, scanTargets).map(m => m[1]));
const badGo = gos.filter(g => !screens.includes(g));
const badOpen = opens.filter(o => !layers.includes(o));
if (badGo.length) errors.push('data-go ведёт на несуществующие экраны: ' + badGo.join(', '));
if (badOpen.length) errors.push('data-open открывает несуществующие окна: ' + badOpen.join(', '));
if (cfg.start && !screens.includes(cfg.start)) errors.push('start «' + cfg.start + '» не найден среди экранов');
if (cfg.platform && !['web', 'mobile'].includes(cfg.platform)) errors.push('platform должен быть web или mobile');
if (!cfg.platform) errors.push('в proto-config нет platform');
if (!cfg.feature) warns.push('в proto-config нет feature (название фичи)');
const untitled = all(/<[a-z]+\b[^>]*data-screen\s*=\s*"([^"]+)"[^>]*>/, body).filter(m => !/data-title\s*=/.test(m[0])).map(m => m[1]);
if (untitled.length) warns.push('экраны без data-title: ' + untitled.join(', '));
if (cfg.platform === 'mobile' && cfg.mobileKind && !['mweb', 'app'].includes(cfg.mobileKind)) errors.push('mobileKind должен быть mweb или app');
for (const [k, d] of Object.entries(cfg.states || {})) {
  if (!d || typeof d.values !== 'object' || !Object.keys(d.values).length) errors.push('states.' + k + ': нет values');
  else if (d.default != null && !(String(d.default) in d.values)) errors.push('states.' + k + ': default «' + d.default + '» нет среди values');
}

const cssClasses = css => uniq(all(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/, stripCssComments(css).replace(/url\([^)]*\)/g, '').replace(/\d+\.\d+/g, '')).map(m => m[1]));
const dsClasses = new Set(cssClasses(tokensCss + '\n' + componentsCss));
const rtClasses = new Set(cssClasses(runtimeCss + '\n' + partialsCss).concat(['is-current', 'is-open', 'is-selected', 'is-error', 'is-loading', 'is-disabled', 'on']));
const ftClasses = new Set(cssClasses(featureCssStr));
const usedClasses = uniq(all(/\bclass\s*=\s*"([^"]*)"/, body).flatMap(m => m[1].split(/\s+/)).filter(c => c && !/[{}$<>]/.test(c)));
const unknown = usedClasses.filter(c => !dsClasses.has(c) && !rtClasses.has(c) && !ftClasses.has(c));
if (unknown.length) warns.push('классы без стилей (опечатка или нет в DS): ' + list(unknown, 30));
const own = [...ftClasses].filter(c => !dsClasses.has(c) && !rtClasses.has(c) && usedClasses.includes(c));
if (own.length) infos.push('свои классы фичи вне DS (показать на ревью лиду дизайна): ' + list(own, 40));

const rawColors = all(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/, stripCssComments(featureCssStr).replace(/url\([^)]*\)/g, '')).length;
if (rawColors) warns.push('в стилях фичи ' + rawColors + ' сырых цветов: замени на var(--…) из tokens.css');
const inlineColor = all(/style\s*=\s*"[^"]*(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()[^"]*"/, body).length;
if (inlineColor) warns.push('в style="…" ' + inlineColor + ' сырых цветов: замени на var(--…)');
const definedVars = new Set(all(/(--[\w-]+)\s*:/, tokensCss + componentsCss + runtimeCss + partialsCss + featureCssStr + body).map(m => m[1]));
const usedVars = uniq(all(/var\(\s*(--[\w-]+)/, featureCssStr + '\n' + body).map(m => m[1]));
const badVars = usedVars.filter(v => !definedVars.has(v));
if (badVars.length) warns.push('неизвестные переменные (нет в tokens.css): ' + list(badVars, 20));

const text = body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
if (/lorem|ipsum/i.test(text)) errors.push('в тексте есть lorem ipsum: нужны реальные тексты из PRD');
if (/\b(TODO|TBD|FIXME)\b|\?\?\?/.test(text)) warns.push('в тексте есть TODO/TBD/???');
if (/₽|\bруб\b|\bруб\./.test(text)) warns.push('в тексте рубли: у Mashina.kg цены в сомах и долларах');
const leftovers = ['Заголовок экрана', 'Заголовок окна', 'Текст окна.', 'Заголовок шторки', 'Название фичи', 'Открыть шторку', 'Открыть окно', 'Пункт 1']
  .filter(t => text.includes(t) || (cfg.feature || '') === t);
if (leftovers.length) warns.push('остался текст стартового шаблона: ' + leftovers.join(', '));
if (/(?:src|href)\s*=\s*"https?:\/\/[^"]+\.(?:css|js)(?:\?[^"]*)?"/i.test(body) || /url\(\s*["']?https?:/i.test(featureCssStr)) warns.push('есть внешние ресурсы: прототип должен открываться без интернета');
if (/<img\b[^>]*src\s*=\s*"https?:/i.test(body)) warns.push('внешние картинки по http: без интернета не покажутся, лучше положить файл рядом с исходником');

/* ---------- 6б. шрифт сайта ---------- */
// Inter_mashina с mashina.kg регистрируется как «Inter»: на него попадают обе цепочки шрифтов DS
// (Inter_mashina -> Inter и Google Sans Mashina -> Google Sans -> Inter). "fonts": false в proto-config отключает.
let fontCss = '';
if (cfg.fonts !== false && fs.existsSync(P.fonts)) {
  fontCss = fs.readdirSync(P.fonts).filter(f => /-(\d{3})\.woff2$/.test(f)).sort().map(f => {
    const w = f.match(/-(\d{3})\.woff2$/)[1];
    const b64 = fs.readFileSync(path.join(P.fonts, f)).toString('base64');
    return '@font-face{font-family:"Inter";font-style:normal;font-weight:' + w + ';font-display:swap;src:url(data:font/woff2;base64,' + b64 + ') format("woff2")}';
  }).join('\n');
}

/* ---------- 7. сборка ---------- */
const platform = cfg.platform === 'mobile' ? 'mobile' : 'web';
const docTitle = title || ((cfg.feature || 'Прототип') + ' · ' + (platform === 'web' ? 'Web' : 'Mobile'));
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const outHtml = [
  '<!doctype html>',
  '<html lang="ru" data-platform="' + platform + '">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<meta name="generator" content="mashina-designer build.cjs ' + stamp + '">',
  '<title>' + docTitle + '</title>',
  '<style>',
  fontCss ? '/* ===== шрифт Inter_mashina (mashina.kg) ===== */\n' + fontCss : '',
  '/* ===== tokens.css ===== */', tokensCss.trim(),
  '/* ===== components.css ===== */', componentsCss.trim(),
  '/* ===== шаблоны шапки и подвала ===== */', partialsCss.trim(),
  '/* ===== runtime.css ===== */', runtimeCss.trim(),
  '/* ===== стили фичи ===== */', featureCssStr,
  '</style>',
  '</head>',
  '<body>',
  body,
  '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' + symbols.join('') + '</svg>',
  '<script type="application/json" id="proto-config">' + (cfgRaw || '{}').replace(/<\/script/gi, '<\\/script') + '</script>',
  '<script>', runtimeJs.trim(), '</script>',
  featureJs.length ? '<script>\n' + featureJs.join('\n;\n') + '\n</script>' : '',
  '</body>',
  '</html>', ''
].join('\n');

if (!checkOnly) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), outHtml, 'utf8');
}
report();
process.exit(errors.length ? 1 : 0);

function report() {
  const kb = Math.round(Buffer.byteLength(outHtml, 'utf8') / 1024);
  if (!checkOnly) console.log('файл: ' + path.resolve(out) + ' (' + kb + ' КБ)');
  console.log('экраны: ' + screens.length + ' · окна: ' + layers.length + ' · иконки: ' + usedIcons.size);
  errors.forEach(e => console.log('ОШИБКА: ' + e));
  warns.forEach(w => console.log('ВНИМАНИЕ: ' + w));
  infos.forEach(i => console.log('ИНФО: ' + i));
  if (!errors.length && !warns.length) console.log('проверки пройдены');
}

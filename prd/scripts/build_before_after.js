#!/usr/bin/env node
// Сравнение «Сейчас в проде / Будет» в один HTML-файл без внешних ссылок.
//   node build_before_after.js <before_after.json> <Фича>.before-after.html
// Пути картинок в JSON - относительно папки JSON. Картинки встраиваются как data:.
// Формат JSON - references/before-after.md.
const fs = require('fs');
const path = require('path');

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.log('Использование: build_before_after.js <before_after.json> <out.html>'); process.exit(2); }

const dir = path.dirname(path.resolve(src));
let data;
try { data = JSON.parse(fs.readFileSync(src, 'utf8')); } catch (e) { console.log('JSON не читается: ' + e.message); process.exit(1); }

const errors = [];
const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const cache = new Map();
function img(rel, where) {
  if (!rel) return null;
  if (/^(https?:|file:)/i.test(rel)) { errors.push(`${where}: внешняя ссылка ${rel} - нужен локальный файл`); return null; }
  const file = path.resolve(dir, rel);
  const type = types[path.extname(file).toLowerCase()];
  if (!type) { errors.push(`${where}: неизвестный тип файла ${rel}`); return null; }
  if (!fs.existsSync(file)) { errors.push(`${where}: нет файла ${rel}`); return null; }
  if (!cache.has(file)) cache.set(file, `data:${type};base64,${fs.readFileSync(file).toString('base64')}`);
  return cache.get(file);
}
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Адрес страницы - текстом без протокола: в файле не должно быть ссылок http(s).
const plainUrl = (s) => esc(String(s || '').replace(/^https?:\/\//i, ''));

const feature = data.feature || path.basename(out).replace(/\.before-after\.html$/, '');
const summary = Array.isArray(data.summary) ? data.summary : [];
const screens = Array.isArray(data.screens) ? data.screens : [];
if (!summary.length) errors.push('summary: нужна хотя бы одна строка «что - сейчас - будет»');

const TYPE = { new: 'новый', changed: 'изменён', removed: 'убирается' };
const STATUS = { new: 'новый экран', changed: 'экран меняется', removed: 'экран убирается' };
let hasMobile = false;

function side(kind, src, st, name, plat) {
  const label = kind === 'now' ? 'Сейчас в проде' : 'Будет';
  let body;
  if (src) {
    body = `<div class="scroll" data-sync><img src="${src}" alt="${esc(name)}: ${label}, ${plat}" data-zoom></div>`;
  } else if (kind === 'now' && st === 'new') {
    body = '<div class="empty">Экрана нет в проде</div>';
  } else if (kind === 'next' && st === 'removed') {
    body = '<div class="empty">Экран убирается</div>';
  } else {
    body = '<div class="empty">Нет картинки</div>';
  }
  return `<div class="col col--${kind}"><div class="tag tag--${kind}">${label}</div>${body}</div>`;
}

const screenHtml = screens.map((s, i) => {
  const id = s.id || `S${i + 1}`;
  const st = s.status || 'changed';
  if (!STATUS[st]) errors.push(`${id}: status «${st}» - нужен changed | new | removed`);
  const plats = s.platforms || {};
  const keys = ['desktop', 'mobile'].filter((k) => plats[k]);
  if (!keys.length) errors.push(`${id}: нет platforms.desktop и platforms.mobile`);
  const views = keys.map((k) => {
    if (k === 'mobile') hasMobile = true;
    const p = plats[k];
    const now = img(p.now, `${id}.${k}.now`);
    const next = img(p.next, `${id}.${k}.next`);
    if (!p.now && st !== 'new') errors.push(`${id}.${k}: нет скриншота прода (now)`);
    if (!p.next && st !== 'removed') errors.push(`${id}.${k}: нет экрана «будет» (next)`);
    return `<div class="view view--${k}" data-plat="${k}">
      <div class="pair">${side('now', now, st, s.name, k)}${side('next', next, st, s.name, k)}</div>
    </div>`;
  }).join('');
  const changes = (s.changes || []).map((c) => `<li><span class="b">${esc(c.block || '')}</span><span class="t t--${esc(c.type || 'changed')}">${esc(TYPE[c.type] || TYPE.changed)}</span><span>${esc(c.text)}</span></li>`).join('');
  const meta = [s.source ? `Прод: ${plainUrl(s.source)}` : '', s.captured ? `снято ${esc(s.captured)}` : ''].filter(Boolean).join(' · ');
  return `<section class="scr" id="${esc(id)}" data-plats="${keys.join(' ')}">
    <div class="scr__h"><span class="no">${i + 1}</span><div><h2>${esc(s.name || id)}</h2>${meta ? `<p class="meta">${meta}</p>` : ''}</div><span class="st st--${esc(st)}">${esc(STATUS[st] || st)}</span></div>
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
    ${views}
    ${changes ? `<ul class="chg">${changes}</ul>` : ''}
  </section>`;
}).join('');

let processHtml = '';
if (data.process && (data.process.now || data.process.next)) {
  const pn = img(data.process.now, 'process.now');
  const px = img(data.process.next, 'process.next');
  processHtml = `<section class="scr" id="process"><div class="scr__h"><span class="no">≡</span><div><h2>${esc(data.process.title || 'Процесс')}</h2></div></div>
    <div class="view view--all"><div class="pair">${side('now', pn, pn ? 'changed' : 'new', 'Процесс', 'схема')}${side('next', px, px ? 'changed' : 'removed', 'Процесс', 'схема')}</div></div></section>`;
}

const sumRows = summary.map((r) => `<tr><td>${r.block ? `<span class="b">${esc(r.block)}</span> ` : ''}${esc(r.what)}</td><td>${esc(r.now)}</td><td>${esc(r.next)}</td></tr>`).join('');
const nav = screens.map((s, i) => `<a href="#${esc(s.id || `S${i + 1}`)}">${i + 1}. ${esc(s.name || '')}</a>`).join('') + (processHtml ? '<a href="#process">Процесс</a>' : '');

const css = `
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:#f2f2f4;color:#1d1d1f;font:14px/1.45 -apple-system,"Segoe UI",Roboto,Arial,sans-serif}
h1,h2,p{margin:0}
.bar{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid #e3e3e8}
.bar__in{max-width:1880px;margin:0 auto;padding:10px 24px;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}
.bar__t{font-weight:600;font-size:16px;margin-right:8px}
.seg{display:inline-flex;background:#ececf0;border-radius:10px;padding:3px}
.seg button{border:0;background:none;font:inherit;font-size:13px;padding:5px 12px;border-radius:8px;cursor:pointer;color:#444}
.seg button.on{background:#fff;color:#000;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.chk{display:inline-flex;gap:6px;align-items:center;font-size:13px;color:#555}
.nav{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
.nav a{font-size:12px;text-decoration:none;color:#1d1d1f;background:#ececf0;border-radius:99px;padding:4px 10px}
main{max-width:1880px;margin:0 auto;padding:24px}
.card,.scr{background:#fff;border:1px solid #e3e3e8;border-radius:16px;padding:24px;margin-bottom:24px;scroll-margin-top:72px}
.card h1{font-size:24px;margin-bottom:6px}
.sub{color:#666;margin-bottom:16px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;vertical-align:top;padding:10px 12px 10px 0;border-bottom:1px solid #ececf0}
th{font-size:12px;color:#666;font-weight:600}
th:nth-child(2),td:nth-child(2){color:#555}
td:first-child{width:24%;font-weight:500}td:nth-child(2),td:nth-child(3){width:38%}
.scr__h{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px}
.scr__h>div{flex:1}
.no{flex:none;width:30px;height:30px;border-radius:99px;background:#1d1d1f;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600}
.scr h2{font-size:20px}
.meta{color:#777;font-size:12px;margin-top:2px}
.note{color:#444;margin:-4px 0 14px 44px;max-width:980px}
.st{font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;background:#ececf0;white-space:nowrap}
.st--new{background:#1d1d1f;color:#fff}.st--removed{background:#fff;border:1px dashed #888}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.col{min-width:0;display:flex;flex-direction:column;gap:8px}
.tag{align-self:flex-start;font-size:13px;font-weight:600;padding:4px 12px;border-radius:99px}
.tag--now{background:#ececf0}.tag--next{background:#1d1d1f;color:#fff}
.scroll{max-height:78vh;overflow:auto;border:1px solid #dcdce2;border-radius:12px;background:#fafafa}
.scroll img{display:block;width:100%;height:auto;cursor:zoom-in}
.view--mobile .scroll{max-width:420px}
.view--mobile .col{align-items:center}.view--mobile .tag{align-self:center}
.empty{display:flex;align-items:center;justify-content:center;min-height:220px;border:1px dashed #b8b8c0;border-radius:12px;color:#666;background:#fafafa;font-weight:500}
.chg{list-style:none;margin:16px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:8px 24px}
.chg li{display:flex;gap:8px;align-items:flex-start;font-size:13px}
.b{display:inline-block;font-size:11px;font-weight:600;padding:1px 6px;border-radius:6px;background:#ececf0;white-space:nowrap}
.t{font-size:11px;padding:1px 6px;border-radius:6px;border:1px dashed #888;white-space:nowrap}
.t--new{background:#1d1d1f;color:#fff;border-color:#1d1d1f}.t--removed{text-decoration:line-through}
body[data-plat="desktop"] .view--mobile,body[data-plat="mobile"] .view--desktop{display:none}
body[data-plat="mobile"] .scr[data-plats="desktop"] .view--desktop,body[data-plat="desktop"] .scr[data-plats="mobile"] .view--mobile{display:block}
body[data-mode="flip"] .pair{grid-template-columns:1fr}
body[data-mode="flip"][data-show="now"] .col--next,body[data-mode="flip"][data-show="next"] .col--now{display:none}
.flip{display:none}body[data-mode="flip"] .flip{display:inline-flex}
.zoom{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.82);display:none;overflow:auto;cursor:zoom-out;padding:24px}
.zoom.on{display:block}.zoom img{display:block;margin:0 auto;max-width:none;background:#fff}
@media (max-width:900px){.pair{grid-template-columns:1fr}}
@media print{.bar{display:none}.scroll{max-height:none;overflow:visible}}`;

const js = `
const b=document.body;
function setSeg(name,val){b.dataset[name]=val;document.querySelectorAll('[data-set="'+name+'"]').forEach(x=>x.classList.toggle('on',x.dataset.val===val));}
document.querySelectorAll('[data-set]').forEach(x=>x.addEventListener('click',()=>setSeg(x.dataset.set,x.dataset.val)));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')z.classList.remove('on');
  if(e.code==='Space'&&b.dataset.mode==='flip'&&!z.classList.contains('on')){e.preventDefault();setSeg('show',b.dataset.show==='now'?'next':'now');}
});
const z=document.querySelector('.zoom'),zi=z.querySelector('img');
document.querySelectorAll('[data-zoom]').forEach(i=>i.addEventListener('click',()=>{zi.src=i.src;zi.style.width=Math.min(i.naturalWidth,window.innerWidth-48)+'px';z.classList.add('on');z.scrollTop=0;}));
z.addEventListener('click',()=>z.classList.remove('on'));
const sync=document.getElementById('sync');let lock=false;
document.querySelectorAll('.pair').forEach(p=>{const s=[...p.querySelectorAll('[data-sync]')];if(s.length<2)return;
  s.forEach(a=>a.addEventListener('scroll',()=>{if(!sync.checked||lock)return;lock=true;const r=a.scrollTop/Math.max(1,a.scrollHeight-a.clientHeight);
    s.forEach(o=>{if(o!==a)o.scrollTop=r*(o.scrollHeight-o.clientHeight);});requestAnimationFrame(()=>lock=false);}));});`;

const platSeg = hasMobile && screens.some((s) => s.platforms && s.platforms.desktop)
  ? '<span class="seg"><button data-set="plat" data-val="desktop" class="on">Desktop</button><button data-set="plat" data-val="mobile">Mobile</button></span>' : '';
const startPlat = platSeg ? 'desktop' : (hasMobile ? 'mobile' : 'desktop');

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(feature)}: сейчас в проде / будет</title><style>${css}</style></head>
<body data-plat="${startPlat}" data-mode="side" data-show="now">
<div class="bar"><div class="bar__in">
  <span class="bar__t">${esc(feature)}: сейчас / будет</span>
  ${platSeg}
  <span class="seg"><button data-set="mode" data-val="side" class="on">Рядом</button><button data-set="mode" data-val="flip">Переключать</button></span>
  <span class="seg flip"><button data-set="show" data-val="now" class="on">Сейчас</button><button data-set="show" data-val="next">Будет</button></span>
  <label class="chk"><input type="checkbox" id="sync" checked> Синхронная прокрутка</label>
  <nav class="nav">${nav}</nav>
</div></div>
<main>
  <div class="card">
    <h1>${esc(feature)}: сейчас в проде / будет</h1>
    <p class="sub">${esc(data.intro || 'Слева - как работает сейчас на mashina.kg, справа - как будет после релиза.')}${data.date ? ` Прод снят ${esc(data.date)}.` : ''} «Переключать» - один экран на всю ширину, пробел меняет «сейчас» и «будет». Клик по картинке - крупно.</p>
    <table><thead><tr><th>Что</th><th>Сейчас в проде</th><th>Будет</th></tr></thead><tbody>${sumRows}</tbody></table>
  </div>
  ${screenHtml}
  ${processHtml}
</main>
<div class="zoom"><img alt=""></div>
<script>${js}</script>
</body></html>
`;

if (errors.length) { console.log('Не собрано:\n- ' + errors.join('\n- ')); process.exit(1); }
fs.writeFileSync(out, html);
console.log(`${out}: ${Math.round(fs.statSync(out).size / 1024)} КБ, экранов ${screens.length}, строк сводки ${summary.length}, картинок ${cache.size}`);

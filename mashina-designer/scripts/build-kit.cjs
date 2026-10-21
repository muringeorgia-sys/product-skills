#!/usr/bin/env node
// Собирает живой каталог DS design-system/kit.html в один файл kit.built.html:
// с иконками, логотипом и шрифтом сайта, как в прототипах. Открывать kit.built.html, править kit.html.
//   node build-kit.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SKILL = path.resolve(__dirname, '..');
const kit = fs.readFileSync(path.join(SKILL, 'design-system', 'kit.html'), 'utf8');
const style = (kit.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
const body = (kit.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || [, kit])[1];
const src = [
  '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Mashina.kg DS: живой каталог</title>',
  '<script type="application/json" id="proto-config">{"feature":"Каталог DS","platform":"web","start":"kit"}</script>',
  style,
  '</head><body>',
  '<section data-screen="kit" data-title="Каталог DS">', body, '</section>',
  '</body></html>'
].join('\n');
const tmp = path.join(SKILL, 'design-system', '.kit.src.html');
fs.writeFileSync(tmp, src, 'utf8');
try {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'build.cjs'), tmp, '--out', path.join(SKILL, 'design-system', 'kit.built.html')], { encoding: 'utf8' });
  // в каталоге демо-тексты и служебные классы ожидаемы: эти строки проверки не показываем
  process.stdout.write(out.split('\n').filter(l => !/свои классы фичи|текст стартового шаблона|kit-grid--3/.test(l)).join('\n'));
} catch (e) {
  process.stdout.write((e.stdout || '') + (e.stderr || ''));
  process.exitCode = 1;
} finally {
  fs.unlinkSync(tmp);
}

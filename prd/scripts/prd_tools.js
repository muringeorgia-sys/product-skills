#!/usr/bin/env node
// Сборка и проверка PRD без модели.
//   node prd_tools.js assemble <prd.md> <папка материалов>   (можно запускать повторно)
//   node prd_tools.js check <prd.md> [lite|full]             (по умолчанию lite)
const fs = require('fs');
const path = require('path');

const LIMITS = { lite: { words: 600, criteria: 8 }, full: { words: 1200, criteria: 12 } }; // слова - разделы 1-4
const open = (n) => `<!-- SECTION_${n} -->`;
const close = (n) => `<!-- /SECTION_${n} -->`;

// Раздел вставляется между открывающей и закрывающей меткой.
// Повторный запуск заменяет содержимое между метками свежим section_N.md.
function assemble(prdPath, dir) {
  let text = fs.readFileSync(prdPath, 'utf8');
  const report = [];
  for (const n of [4, 5, 'TEXT']) {
    const part = path.join(dir, `section_${String(n).toLowerCase()}.md`);
    if (!text.includes(open(n))) { report.push(`раздел ${n}: метки нет, пропущен`); continue; }
    if (!fs.existsSync(part)) { report.push(`раздел ${n}: нет файла ${part}`); continue; }
    const body = `${open(n)}\n${fs.readFileSync(part, 'utf8').trim()}\n${close(n)}`;
    const start = text.indexOf(open(n));
    const end = text.indexOf(close(n));
    text = end > start
      ? text.slice(0, start) + body + text.slice(end + close(n).length)
      : text.replace(open(n), body);
    report.push(`раздел ${n}: вставлен`);
  }
  fs.writeFileSync(prdPath, text);
  console.log(report.join('\n'));
}

function countWords(lines) {
  return lines.join(' ').replace(/<!--.*?-->/g, ' ').replace(/[`*_#|>\-]+/g, ' ')
    .split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function check(prdPath, mode) {
  const limit = LIMITS[mode] || LIMITS.lite;
  const lines = fs.readFileSync(prdPath, 'utf8').split(/\r?\n/);
  const sections = {};
  let current = 0;
  let inFence = false;
  for (const line of lines) {
    const head = line.match(/^## (\d)\./);
    if (head) { current = Number(head[1]); sections[current] = []; continue; }
    if (/^## /.test(line)) { current = 0; continue; } // приложение «Текст» - вне разделов и лимита
    if (/^(```|````)/.test(line.trim())) { inFence = !inFence; continue; }
    if (inFence || !current) continue;
    if (/^!\[/.test(line.trim())) continue; // картинка схемы
    sections[current].push(line);
  }
  const problems = [];
  let total = 0;
  for (let n = 1; n <= 6; n++) {
    if (!sections[n]) { problems.push(`нет раздела ${n}`); continue; }
    const words = countWords(sections[n]);
    if (n <= 4) total += words;
    console.log(`раздел ${n}: ${words} слов${n > 4 ? ' (вне лимита)' : ''}`);
  }
  console.log(`разделы 1-4: ${total} слов, лимит ${limit.words}`);
  if (total > limit.words) problems.push(`разделы 1-4: ${total} слов, лимит ${limit.words}`);
  const s6 = sections[6] || [];
  const rows = s6.filter((l) => /^\s*\|\s*\d+\s*\|/.test(l)).length;
  const criteria = rows || s6.filter((l) => /^\s*(\d+\.|-)\s+/.test(l)).length;
  console.log(`критериев приёмки: ${criteria}, лимит ${limit.criteria}`);
  if (criteria > limit.criteria) problems.push(`критериев приёмки ${criteria}, лимит ${limit.criteria}`);
  const raw = lines.join('\n');
  for (const n of [4, 5, 'TEXT']) {
    if (raw.includes(open(n)) && !raw.includes(close(n))) problems.push(`раздел ${n}: метка не заменена`);
  }
  if (/```mermaid/.test(raw)) problems.push('найден mermaid');
  if (problems.length) { console.log('ПРОБЛЕМЫ:\n- ' + problems.join('\n- ')); process.exit(1); }
  console.log('OK');
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'assemble' && a && b) assemble(a, b);
else if (cmd === 'check' && a) check(a, b);
else { console.log('Использование: prd_tools.js assemble <prd.md> <папка> | check <prd.md> [lite|full]'); process.exit(2); }

// Автопроверка готовой презентации weekly-report по правилам review-checklist.md, которые проверяются текстом.
//   node check_deck.mjs <deck.pptx>
// Смысловые пункты чек-листа (цифры против финотчёта, Jira, проверка числа) остаются за агентом.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const deck = process.argv[2];
if (!deck || !fs.existsSync(deck)) { console.error("node check_deck.mjs <deck.pptx>"); process.exit(1); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deck-"));
execFileSync(process.platform === "win32" ? path.join(process.env.SystemRoot || "C:\Windows", "System32", "tar.exe") : "tar", ["-xf", path.resolve(deck), "-C", tmp]);

const slideDir = path.join(tmp, "ppt", "slides");
const notesDir = path.join(tmp, "ppt", "notesSlides");
const num = (f) => Number(f.match(/(\d+)/)[1]);
const text = (xml) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ");
const slides = fs.readdirSync(slideDir).filter((f) => /^slide\d+\.xml$/.test(f)).sort((a, b) => num(a) - num(b))
  .map((f) => ({ n: num(f), t: text(fs.readFileSync(path.join(slideDir, f), "utf8")) }));
const notes = fs.existsSync(notesDir)
  ? Object.fromEntries(fs.readdirSync(notesDir).filter((f) => /^notesSlide\d+\.xml$/.test(f))
      .map((f) => [num(f), text(fs.readFileSync(path.join(notesDir, f), "utf8"))]))
  : {};

const RULES = [
  { re: /\bWAU\b/i, why: "WAU не показывать (решение 14.09)" },
  { re: /доля платящих/i, why: "«Доля платящих» из raw.events не показывать (MPAU / MAU — проверить источник)", warn: true },
  { re: /нет данных|уточнить|\bTBD\b/i, why: "Нет «нет данных», «уточнить», TBD" },
  { re: /\b(MASH|PRODUCT|DESIGN|QA)-\d+\b/, why: "Ключи Jira в названиях задач — только в заметках", warn: true },
  { re: /^\s*Источник\s*:/im, why: "Нет строки «Источник» на слайде" },
];

const rows = [];
let fails = 0;
let warns = 0;
const count = slides.length;
rows.push(["все", "число слайдов 14–30", count >= 14 && count <= 30 ? "ok" : "FAIL", String(count)]);
if (!(count >= 14 && count <= 30)) fails++;
for (const r of RULES) {
  const hit = slides.filter((s) => r.re.test(s.t)).map((s) => s.n);
  const verdict = hit.length ? (r.warn ? "ПРОВЕРИТЬ" : "FAIL") : "ok";
  rows.push(["слайды", r.why, verdict, hit.length ? `слайды ${hit.join(", ")}` : ""]);
  if (hit.length) r.warn ? warns++ : fails++;
}
const dates = new Set(slides.flatMap((s) => [...s.t.matchAll(/[Дд]анные на (\d{2}\.\d{2})/g)].map((m) => m[1])));
rows.push(["все", "одна дата «данные на»", dates.size <= 1 ? "ok" : "FAIL", [...dates].join(", ")]);
if (dates.size > 1) fails++;
const noNotes = slides.filter((s) => s.n > 1 && !(notes[s.n] || "").trim()).map((s) => s.n);
rows.push(["заметки", "у слайдов есть заметки", noNotes.length ? "FAIL" : "ok", noNotes.length ? `без заметок: ${noNotes.join(", ")}` : ""]);
if (noNotes.length) fails++;

fs.rmSync(tmp, { recursive: true, force: true });
for (const r of rows) console.log(r.join(" · "));
console.log(`\nОшибок: ${fails}. Проверить вручную: ${warns}. Смысловые пункты review-checklist.md проверяет агент.`);
process.exit(fails ? 1 : 0);

// Автоматическая часть эталонного прогона PRD.
//   node check_eval.mjs <папка прогона>   PRD ищутся как <папка>/<id>.md
//   node check_eval.mjs --reference       проверка принятых PRD (калибровка проверок)
// Пишет <папка>/result.md: автопроверки и список утверждений для судьи.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.join(HERE, "..", "scripts", "prd_tools.js");
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "cases.json"), "utf8"));
const arg = process.argv[2];
if (!arg) { console.error("node check_eval.mjs <папка прогона> | --reference"); process.exit(1); }
const ref = arg === "--reference";
const outDir = ref ? path.join(HERE, "reference-check") : path.resolve(arg);
fs.mkdirSync(outDir, { recursive: true });

const rows = [];
const judge = [];
let fails = 0;
for (const c of cfg.cases) {
  const prd = ref ? c.reference_prd : path.join(outDir, `${c.id}.md`);
  if (!fs.existsSync(prd)) {
    if (ref) { rows.push([c.id, "PRD", "FAIL", `нет файла ${prd}`]); fails++; }
    else rows.push([c.id, "PRD", "пропущен", "кейса нет в прогоне"]);
    continue;
  }
  const text = fs.readFileSync(prd, "utf8");
  let toolsOut = "";
  let toolsOk = true;
  try { toolsOut = execFileSync("node", [TOOLS, "check", prd, cfg.common.mode], { encoding: "utf8" }); }
  catch (e) { toolsOk = false; toolsOut = (e.stdout || "") + (e.stderr || ""); }
  const last = toolsOut.trim().split(/\r?\n/).slice(-3).join("; ");
  rows.push([c.id, "prd_tools check", toolsOk ? "ok" : "FAIL", last]);
  if (!toolsOk) fails++;
  for (const m of c.must) {
    const ok = new RegExp(m.re, "i").test(text);
    rows.push([c.id, `есть: ${m.why}`, ok ? "ok" : "FAIL", `/${m.re}/`]);
    if (!ok) fails++;
  }
  for (const m of [...cfg.common.must_not, ...c.must_not]) {
    const hit = text.match(new RegExp(m.re, "i"));
    rows.push([c.id, `нет: ${m.why}`, hit ? "FAIL" : "ok", hit ? `найдено «${hit[0]}»` : ""]);
    if (hit) fails++;
  }
  for (const s of [...cfg.common.judge, ...c.judge]) judge.push([c.id, prd, s]);
}

const cell = (s) => String(s).replace(/\|/g, "/").replace(/\r?\n/g, " ");
const md = [
  `# Эталонный прогон PRD — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
  ref ? "Режим: проверка принятых PRD" : `Папка: ${outDir}`,
  "",
  `## Автопроверки — ошибок: ${fails}`,
  "",
  "| Кейс | Проверка | Итог | Детали |",
  "|---|---|---|---|",
  ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
  "",
  "## Для судьи",
  "Судья читает PRD и ставит PASS или FAIL с цитатой.",
  "",
  "| Кейс | Утверждение | Итог | Цитата |",
  "|---|---|---|---|",
  ...judge.map(([id, , s]) => `| ${id} | ${cell(s)} |  |  |`),
  "",
  "PRD:",
  ...[...new Set(judge.map(([id, p]) => `- ${id}: ${p}`))],
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "result.md"), md, "utf8");
console.log(rows.map((r) => r.join(" · ")).join("\n"));
console.log(`\nОшибок автопроверок: ${fails}. Отчёт: ${path.join(outDir, "result.md")}`);
process.exit(fails ? 1 : 0);

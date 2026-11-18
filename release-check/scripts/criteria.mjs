// Критерии приёмки PRD (раздел 6) → чек-лист приёмки PO с типом проверки.
//   node criteria.mjs <PRD.md> [PRD.md ...] > checklist.md
import fs from "node:fs";
import path from "node:path";

const TYPES = [
  { key: "позже", re: /через \d+\s*(недел|дн|месяц)|после релиза сравнить/i, how: "метрика после релиза — дата в календарь" },
  { key: "приложение", re: /приложени|iOS|Android/i, how: "эмулятор Android / телефон" },
  { key: "QA", re: /тестов\S* ключ|поддельн|заблокирован|без токена|сервер не получает|стенд|мок|прямой запрос/i, how: "только QA или стенд — спросить QA" },
  { key: "админка", re: /админк/i, how: "админка — нужен доступ" },
  { key: "аналитика", re: /^`[a-z_]+`|событи[ея]|GA4|Redash/i, how: "событие — DebugView GA4 или Redash" },
  { key: "сайт", re: /.*/, how: "сайт прод — браузер, без входа, если можно" },
];
const EVENT = /`[a-z_]+`|событи[ея]/i;
const classify = (check, expected) => {
  const t = TYPES.find((x) => x.re.test(check));
  return { ...t, how: t.how + (t.key !== "аналитика" && EVENT.test(expected) ? "; событие — отдельно у QA" : "") };
};

const files = process.argv.slice(2);
if (!files.length) { console.error("node criteria.mjs <PRD.md> [...]"); process.exit(1); }
const out = [`# Чек-лист приёмки — ${new Date().toISOString().slice(0, 10)}`, ""];
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const sec = text.split(/^## /m).find((s) => /^6\.\s*Критерии приёмки/.test(s));
  out.push(`## ${path.basename(f, ".md")}`, "");
  if (!sec) { out.push("Раздела 6 «Критерии приёмки» нет.", ""); continue; }
  const rows = sec.split(/\r?\n/).filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  out.push("| # | Проверка | Ожидаемо | Тип | Как | Итог | Доказательство |", "|---|---|---|---|---|---|---|");
  for (const [n, check, expected] of rows) {
    const t = classify(check, expected);
    out.push(`| ${n} | ${check} | ${expected} | ${t.key} | ${t.how} |  |  |`);
  }
  const count = (k) => rows.filter(([, c, e]) => classify(c, e).key === k).length;
  out.push("", `Итого ${rows.length}: сайт ${count("сайт")}, приложение ${count("приложение")}, аналитика ${count("аналитика")}, QA ${count("QA")}, позже ${count("позже")}, админка ${count("админка")}.`, "");
}
process.stdout.write(out.join("\n"));

// Собирает дайджест для маркетинга из одного JSON: .xlsx с галочками по каналам и .md.
// Запуск из корня проекта Mashina.kg (там лежит node_modules/@oai/artifact-tool):
//   node "<скилл>/scripts/build_digest.mjs" <data.json> <путь/Дайджест-для-маркетинга_месяц-год> [папка_превью]
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const [dataPath, outBase, previewDir] = process.argv.slice(2);
if (!dataPath || !outBase) {
  console.error("usage: build_digest.mjs <data.json> <outBase без расширения> [previewDir]");
  process.exit(1);
}
const require = createRequire(path.join(process.cwd(), "noop.js"));
const { SpreadsheetFile, Workbook } = await import(pathToFileURL(require.resolve("@oai/artifact-tool")).href);

const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
const font = "Arial";
// Каналы - от самых трудоёмких к самым лёгким
const channels = data.channels ?? [
  "Баннер МБанк", "Сторис МБанк", "Пуш МБанк", "Пост МБанк", "Реклама",
  "Пост + сторис Mashina", "Email Mashina", "SMS Mashina", "Пуш Mashina",
];
const pushChannel = "Пуш Mashina";
const pushLimit = data.pushLimit ?? 15;
const year = data.year;
const month = data.month; // "октябрь 2026"
const features = data.features ?? [];
const pushes = data.pushes ?? [];
const ads = data.ads ?? [];
const audiences = data.audiences ?? [];
const skip = (f) => (f.status ?? "").startsWith("Не продвигаем");
const promoted = features.filter((f) => !skip(f));
const skipped = features.filter(skip);

// ---- проверки ----
const problems = [];
for (const f of features) {
  if (/\s\+\s/.test(f.name)) problems.push(`Фича объединена через «+»: ${f.name}`);
  for (const c of f.channels ?? []) if (!channels.includes(c)) problems.push(`Неизвестный канал «${c}» у фичи «${f.name}»`);
}
const audNames = audiences.map((a) => a.name);
for (const p of pushes) if (!audNames.includes(p.audience)) problems.push(`Аудитории «${p.audience}» нет в списке (пуш ${p.date})`);
if (pushes.length > pushLimit) problems.push(`Пушей ${pushes.length}, лимит ${pushLimit}`);
const weeks = ads.map((a) => a.week);
if (new Set(weeks).size !== weeks.length) problems.push("В одной неделе больше одной фичи в рекламе");
for (const f of promoted.filter((f) => (f.channels ?? []).includes(pushChannel)))
  if (!pushes.some((p) => p.theme.includes(f.name))) problems.push(`У фичи «${f.name}» отмечен пуш Mashina, но пуша в календаре нет`);
for (const a of ads) if (!promoted.some((f) => f.name === a.feature)) problems.push(`Фичи из рекламы нет в списке: ${a.feature}`);

// ---- xlsx ----
const asDate = (v) => (/^\d\d\.\d\d$/.test(v) ? new Date(Date.UTC(year, +v.slice(3) - 1, +v.slice(0, 2))) : v);
const col = (i) => String.fromCharCode(65 + i);
const headerFmt = {
  fill: "#1F3A5F",
  font: { name: font, bold: true, color: "#FFFFFF", size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  wrapText: true,
};
const title = (sheet, text) => {
  sheet.getRange("A1").values = [[text]];
  sheet.getRange("A1").format.font = { name: font, size: 14, bold: true, color: "#202124" };
};
const body = (range) => {
  range.format = {
    font: { name: font, size: 10, color: "#202124" },
    verticalAlignment: "top",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#D0D7DE" },
  };
};
const H = 3; // строка шапки
const R0 = H + 1;

const wb = Workbook.create();

// Лист «Фичи»
const sf = wb.worksheets.add("Фичи");
const withDetails = promoted.some((f) => f.details);
const fHeaders = ["№", "Релиз", "Фича", "Как сейчас", "Как будет", "Статус", ...channels, ...(withDetails ? ["Детали"] : [])];
const lastF = col(fHeaders.length - 1);
const chFirst = col(6), chLast = col(5 + channels.length);
title(sf, `Дайджест для маркетинга - ${month}`);
sf.getRange(`A${H}:${lastF}${H}`).values = [fHeaders];
sf.getRange(`A${H}:${lastF}${H}`).format = headerFmt;
sf.getRange(`A${H}:${lastF}${H}`).format.rowHeightPx = 48;
const fEnd = R0 + promoted.length - 1;
sf.getRange(`A${R0}:F${fEnd}`).values = promoted.map((f, i) => [i + 1, asDate(f.release), f.name, f.now ?? "", f.next ?? "", f.status ?? ""]);
if (withDetails) sf.getRange(`${lastF}${R0}:${lastF}${fEnd}`).values = promoted.map((f) => [f.details ?? ""]);
body(sf.getRange(`A${R0}:${lastF}${fEnd}`));
sf.getRange(`${chFirst}${R0}:${chLast}${fEnd}`).values = promoted.map((f) => channels.map((c) => (f.channels ?? []).includes(c)));
sf.getRange(`${chFirst}${R0}:${chLast}${fEnd}`).format.horizontalAlignment = "center";
sf.getRange(`${chFirst}${R0}:${chLast}${fEnd}`).format.verticalAlignment = "middle";
sf.getRange(`A${R0}:B${fEnd}`).format.horizontalAlignment = "center";
sf.getRange(`B${R0}:B${fEnd}`).format.numberFormat = "dd.mm";
sf.getRange(`C${R0}:C${fEnd}`).format.font = { name: font, size: 10, bold: true, color: "#202124" };
sf.getRange(`F${R0}:F${fEnd}`).format.font = { name: font, size: 10, color: "#B3261E" };
const totalRow = fEnd + 1;
sf.getRange(`C${totalRow}`).values = [["Итого фич по каналу"]];
// COUNTIF(...;TRUE) в движке artifact-tool даёт 0, SUMPRODUCT работает везде
sf.getRange(`${chFirst}${totalRow}:${chLast}${totalRow}`).formulas = [channels.map((_, i) => `=SUMPRODUCT(--(${col(6 + i)}${R0}:${col(6 + i)}${fEnd}=TRUE))`)];
sf.getRange(`A${totalRow}:${lastF}${totalRow}`).format = {
  fill: "#EEF2F6",
  font: { name: font, size: 10, bold: true, color: "#202124" },
  borders: { preset: "all", style: "thin", color: "#D0D7DE" },
};
sf.getRange(`${chFirst}${totalRow}:${chLast}${totalRow}`).format.horizontalAlignment = "center";
[5, 11, 34, 38, 42, 20, ...channels.map(() => 11), ...(withDetails ? [44] : [])].forEach((w, i) => (sf.getRangeByIndexes(0, i, totalRow + 1, 1).format.columnWidth = w));
sf.freezePanes.freezeRows(H);

// Лист «Пуши Mashina»
const sp = wb.worksheets.add("Пуши Mashina");
title(sp, `Пуши Mashina.kg - ${month}`);
sp.getRange(`A${H}:G${H}`).values = [["№", "Дата", "Тема", "Источник выручки", "Аудитория", "Что предлагаем", "Отправляем"]];
sp.getRange(`A${H}:G${H}`).format = headerFmt;
sp.getRange(`A${H}:G${H}`).format.rowHeightPx = 32;
const pEnd = R0 + pushes.length - 1;
sp.getRange(`A${R0}:F${pEnd}`).values = pushes.map((p, i) => [i + 1, asDate(p.date), p.theme, p.source, p.audience, p.offer]);
body(sp.getRange(`A${R0}:G${pEnd}`));
sp.getRange(`G${R0}:G${pEnd}`).values = pushes.map(() => [true]);
sp.getRange(`G${R0}:G${pEnd}`).format.horizontalAlignment = "center";
sp.getRange(`A${R0}:B${pEnd}`).format.horizontalAlignment = "center";
sp.getRange(`B${R0}:B${pEnd}`).format.numberFormat = "dd.mm";
// диапазон с запасом: при добавлении аудиторий список не ломается
sp.getRange(`E${R0}:E${pEnd}`).dataValidation = { list: { source: `='Аудитории пушей'!$A$${R0}:$A$${R0 + 30}`, inCellDropDown: true }, allowBlank: true };
const s0 = pEnd + 2;
sp.getRange(`E${s0}:F${s0 + 2}`).values = [["Отмечено пушей", null], ["Лимит в месяц", pushLimit], ["Остаток", null]];
sp.getRange(`F${s0}`).formulas = [[`=SUMPRODUCT(--(G${R0}:G${pEnd}=TRUE))`]];
sp.getRange(`F${s0 + 2}`).formulas = [[`=F${s0 + 1}-F${s0}`]];
sp.getRange(`E${s0}:F${s0 + 2}`).format = { font: { name: font, size: 10, bold: true, color: "#202124" }, borders: { preset: "all", style: "thin", color: "#D0D7DE" }, fill: "#EEF2F6" };
sp.getRange(`F${s0 + 2}`).conditionalFormats.add("cellIs", { operator: "lessThan", formula: 0, format: { fill: "#FDE2E1", font: { bold: true, color: "#B3261E" } } });
[5, 8, 40, 17, 46, 50, 12].forEach((w, i) => (sp.getRangeByIndexes(0, i, s0 + 3, 1).format.columnWidth = w));
sp.freezePanes.freezeRows(H);

// Лист «Реклама»
const sa = wb.worksheets.add("Реклама");
title(sa, `Реклама - ${month}`);
sa.getRange(`A${H}:C${H}`).values = [["Неделя", "Фича", "Запускаем"]];
sa.getRange(`A${H}:C${H}`).format = headerFmt;
if (ads.length) {
  const aEnd = R0 + ads.length - 1;
  sa.getRange(`A${R0}:B${aEnd}`).values = ads.map((a) => [a.week, a.feature]);
  body(sa.getRange(`A${R0}:C${aEnd}`));
  sa.getRange(`C${R0}:C${aEnd}`).values = ads.map(() => [true]);
  sa.getRange(`A${R0}:A${aEnd}`).format.horizontalAlignment = "center";
  sa.getRange(`C${R0}:C${aEnd}`).format.horizontalAlignment = "center";
}
[14, 50, 12].forEach((w, i) => (sa.getRangeByIndexes(0, i, 12, 1).format.columnWidth = w));

// Лист «Аудитории пушей»
const su = wb.worksheets.add("Аудитории пушей");
title(su, "Аудитории пушей в админке");
su.getRange(`A${H}:C${H}`).values = [["Название в админке", "Простыми словами", "Логика"]];
su.getRange(`A${H}:C${H}`).format = headerFmt;
su.getRange(`A${R0}:C${R0 + audiences.length - 1}`).values = audiences.map((a) => [a.name, a.plain ?? "", a.logic ?? ""]);
body(su.getRange(`A${R0}:C${R0 + audiences.length - 1}`));
[46, 50, 55].forEach((w, i) => (su.getRangeByIndexes(0, i, 30, 1).format.columnWidth = w));

wb.recalculate();
const pushCount = sp.getRange(`F${s0}`).values[0][0];
const totals = sf.getRange(`${chFirst}${totalRow}:${chLast}${totalRow}`).values[0];
if (previewDir) {
  await fs.mkdir(previewDir, { recursive: true });
  for (const [sheetName, range, file] of [["Фичи", `A1:${lastF}${totalRow}`, "features.png"], ["Пуши Mashina", `A1:G${s0 + 2}`, "pushes.png"]]) {
    const img = await wb.render({ sheetName, range, scale: 1, format: "png" });
    await fs.writeFile(path.join(previewDir, file), new Uint8Array(await img.arrayBuffer()));
  }
}
await fs.mkdir(path.dirname(outBase), { recursive: true });
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(outBase + ".xlsx");
await fs.rm(outBase + ".xlsx.inspect.ndjson", { force: true });

// ---- md ----
const lc = (t) => (/^[A-ZА-ЯЁ][a-zа-яё]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const md = [`# Дайджест для маркетинга - ${month}`, "", "## 1. Фичи", ""];
let n = 0;
for (const rel of [...new Set(promoted.map((f) => f.release))]) {
  md.push(`### Релиз ${rel}`, "");
  for (const f of promoted.filter((x) => x.release === rel)) {
    n++;
    const ch = channels.filter((c) => (f.channels ?? []).includes(c)).map(lc);
    md.push(`**1.${n}. ${f.name}**${f.status ? " - " + lc(f.status) : ""}`);
    md.push(`- Как сейчас: ${f.now ?? "-"}`);
    md.push(`- Как будет: ${f.next ?? "-"}`);
    md.push(`- Коммуникации: ${ch.length ? ch.join(", ") : "до релиза не планируем"}`);
    if (f.details) md.push(`- Детали: ${f.details}`);
    md.push("");
  }
}
if (skipped.length) {
  md.push("### Не продвигаем", "");
  for (const f of skipped) md.push(`- ${f.name} (${f.release})${f.status !== "Не продвигаем" ? " - " + lc(f.status.replace(/^Не продвигаем:\s*/, "")) : ""}`);
  md.push("");
}
md.push(`## 2. Пуши Mashina.kg - ${pushes.length} из ${pushLimit}`, "", "| № | Дата | Тема | Источник выручки | Аудитория | Что предлагаем |", "|---|---|---|---|---|---|");
pushes.forEach((p, i) => md.push(`| ${i + 1} | ${p.date} | ${p.theme} | ${p.source} | ${p.audience} | ${p.offer} |`));
md.push("", "## 3. Реклама - 1 фича в неделю", "", "| Неделя | Фича |", "|---|---|");
for (const a of ads) md.push(`| ${a.week} | ${a.feature} |`);
await fs.writeFile(outBase + ".md", md.join("\n") + "\n", "utf8");

console.log(JSON.stringify({ xlsx: outBase + ".xlsx", md: outBase + ".md", features: promoted.length, skipped: skipped.length, pushCount, totals, problems }, null, 2));

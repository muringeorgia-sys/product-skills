// Mashina.kg weekly report — Jira «Product discovery» collector (columns from «Исследование» onward).
// Run via javascript_tool in a tab opened on https://jira.mashina.kg (user logged in).
// Before running: set CFG dates. Read-only: only GET requests.
// Output: full JSON rendered as <pre id="wr-jira"> on the page (read it with get_page_text),
// short summary returned as the last expression.

const CFG = {
  cur: ['2026-08-31', '2026-09-06'],  // отчётная неделя, пн–вс
  staleDays: 14,                       // «застряла»: столько дней и больше в одной колонке
  product: 'Mashina.kg',               // основной продукт; остальные считаются отдельно
};

// Колонки доски rapidView 1 после «Discovery Backlog». Имя колонки ≠ имя статуса.
const PIPE = [
  ['10007', 'Исследование'],
  ['10100', 'Оценка и Приоритизация'],
  ['10101', 'Формирование требований'],
  ['10002', 'QA анализ'],
  ['10102', 'Системный анализ'],
  ['10104', 'Дизайн'],
  ['10105', 'QA валидация'],
  ['10106', 'Готово к техническому анализу'],
];
const OTHER = { '10005': 'Инициатива', '10006': 'Отложено', '3': 'Отклонено', '10013': 'Discovery Backlog' };
const IDX = Object.fromEntries(PIPE.map(([id], i) => [id, i]));
const colName = id => (PIPE.find(p => p[0] === id) || [])[1] || OTHER[id] || `status ${id}`;
const inPipe = id => id in IDX;

// Статусы могут удалить из workflow: JQL с несуществующим id падает, поэтому берём только живые.
// Удалённые статусы остаются в PIPE, чтобы история переходов читалась по именам.
const existing = new Set((await (await fetch('/rest/api/2/project/MASHINA/statuses')).json()).flatMap(t => t.statuses.map(s => s.id)));
const missingStatuses = PIPE.filter(p => !existing.has(p[0])).map(p => p[1]);
const jql = `project = MASHINA AND (status in (${PIPE.map(p => p[0]).filter(id => existing.has(id)).join(',')}) OR updated >= "${CFG.cur[0]}") ORDER BY key`;
const fields = 'summary,status,assignee,issuetype,customfield_10201,created,duedate,labels';
const all = [];
for (let startAt = 0; ; startAt += 100) {
  const r = await (await fetch(`/rest/api/2/search?maxResults=100&startAt=${startAt}&expand=changelog&fields=${fields}&jql=${encodeURIComponent(jql)}`)).json();
  if (r.errorMessages) throw new Error(r.errorMessages.join('; '));
  all.push(...r.issues);
  if (startAt + 100 >= r.total) break;
}

const today = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);
const dd = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const issues = [], moves = [];
const cnt = () => Object.fromEntries(PIPE.map(([, n]) => [n, { main: 0, other: 0 }]));
const cols = { start: cnt(), end: cnt(), now: cnt() };

for (const i of all) {
  const f = i.fields;
  if (f.issuetype.subtask) continue;
  const products = (f.customfield_10201 || []).map(x => x.value);
  const main = products.includes(CFG.product) || /^MASHINA\s*:/i.test(f.summary);
  const tr = i.changelog.histories
    .flatMap(h => h.items.filter(x => x.field === 'status').map(x => ({ at: h.created, d: h.created.slice(0, 10), from: String(x.from), to: String(x.to) })))
    .sort((a, b) => a.at.localeCompare(b.at));
  const created = f.created.slice(0, 10);
  // статус на конец даты D (включительно); null — задачи ещё не было
  const statusAt = D => {
    if (created > D) return null;
    const before = tr.filter(t => t.d <= D);
    if (before.length) return before[before.length - 1].to;
    return tr.length ? tr[0].from : f.status.id;
  };
  const dayBefore = new Date(Date.parse(CFG.cur[0] + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
  const snap = { start: statusAt(dayBefore), end: statusAt(CFG.cur[1]), now: f.status.id };
  for (const [k, s] of Object.entries(snap)) if (s && inPipe(s)) cols[k][colName(s)][main ? 'main' : 'other']++;

  const cur = f.status.id;
  const summary = f.summary.replace(/^(MASHINA|HOUSE|BAZAR)\s*:\s*/i, '').slice(0, 70);
  if (inPipe(cur) || inPipe(snap.end || '')) {
    const lastIn = tr.filter(t => t.to === cur).pop();
    const entered = lastIn ? lastIn.d : created;
    issues.push({
      key: i.key, summary, type: f.issuetype.name, main, products: products.join('+') || '-',
      assignee: f.assignee?.displayName || 'не назначен',
      col_end: snap.end ? colName(snap.end) : null, col_now: colName(cur),
      entered_now_col: entered, days_in_col: dd(entered, today), due: f.duedate || null,
    });
  }
  // Итоговое движение за неделю: колонка на начало → колонка на конец; hops — сколько переходов было внутри
  const week = tr.filter(t => t.d >= CFG.cur[0] && t.d <= CFG.cur[1] && (inPipe(t.from) || inPipe(t.to)));
  if (week.length) {
    const a = snap.start, b = snap.end;
    const aIn = !!a && inPipe(a), bIn = inPipe(b);
    const kind = a === b ? 'без изменений' : !aIn && !bIn ? 'транзит' : !aIn ? 'вход' : !bIn ? 'выход' : b === '10106' ? 'готово' : IDX[b] > IDX[a] ? 'вперёд' : 'назад';
    moves.push({ key: i.key, summary, main, from: a ? colName(a) : 'создана за неделю', to: colName(b), kind, hops: week.length, last: week[week.length - 1].d });
  }
}

const main = issues.filter(x => x.main);
const result = {
  period: CFG.cur, generated_bishkek: today, board: 'Product discovery (rapidView 1), колонки от «Исследование»',
  note: 'columns.start / columns.end и col_end восстановлены по changelog на начало понедельника и конец воскресенья; now — текущее состояние доски. moves — итоговое движение задачи за неделю, промежуточные переходы свёрнуты в hops',
  missing_statuses: missingStatuses,
  columns: cols,
  moves: moves.sort((a, b) => a.last.localeCompare(b.last)),
  stale: main.filter(x => x.col_now === x.col_end && x.days_in_col >= CFG.staleDays && x.col_now !== 'Готово к техническому анализу').map(x => `${x.key} ${x.col_now} ${x.days_in_col} дн`),
  no_assignee: main.filter(x => x.assignee === 'не назначен').map(x => x.key),
  issues,
};
const pre = document.createElement('pre');
pre.id = 'wr-jira';
pre.style.whiteSpace = 'pre-wrap';
pre.textContent = JSON.stringify(result);
document.body.innerHTML = '';
document.body.appendChild(pre);
JSON.stringify({
  done: true, fetched: all.length, pipeline_now: issues.filter(x => PIPE.some(p => p[1] === x.col_now)).length,
  moves_in_week: moves.length, stale: result.stale.length, chars: pre.textContent.length,
})

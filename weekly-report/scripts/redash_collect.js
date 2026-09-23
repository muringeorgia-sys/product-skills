// Mashina.kg weekly report — Redash collector.
// Run via javascript_tool in a tab opened on http://92.204.189.31:8082 (user logged in).
// Before running: set CFG dates. If the result says "pending", run the same code again:
// jobs resume from window.__wr, nothing is re-queued.
// Output: full JSON rendered as <pre id="wr-out"> on the page (read it with get_page_text),
// short summary returned as the last expression.

const CFG = {
  cur: ['2026-08-31', '2026-09-06'],   // отчётная неделя, пн–вс
  prev: ['2026-08-24', '2026-08-30'],  // предыдущая неделя, пн–вс
  categoryGroup: 'car',                // параметр query 348
};

const wrKey = JSON.stringify(CFG);
if (!window.__wr || window.__wr.key !== wrKey) window.__wr = { key: wrKey, jobs: {}, res: {} };
const W = window.__wr;
const FROM = CFG.prev[0], TO = CFG.cur[1];
const RUNS = {
  listings: [348, { date_from: FROM, date_to: TO, granularity: 'day', category_group: CFG.categoryGroup }],
  listingsWeek: [348, { date_from: FROM, date_to: TO, granularity: 'week', category_group: CFG.categoryGroup }],
  users: [430, { from_date: FROM, to_date: TO }],
  cash: [536, { from_date: FROM, to_date: TO }],
  reports: [303, { from_date: FROM, to_date: TO }],
  // Активные объявления (query 268, счётчик сайта) не запрашиваем: данные неактуальны (решение 14.09.2026).
};

// 1. Запуск и опрос задач Redash
for (const [k, [id, parameters]] of Object.entries(RUNS)) {
  if (W.res[k] || W.jobs[k]) continue;
  const r = await fetch(`/api/queries/${id}/results`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parameters, max_age: 0 }),
  });
  const j = await r.json();
  if (j.query_result) W.res[k] = j.query_result;
  else if (j.job) W.jobs[k] = j.job.id;
  else W.res[k] = { error: `HTTP ${r.status}: ${(j.message || '').slice(0, 120)}` };
}
const t0 = Date.now();
while (Object.keys(W.jobs).length && Date.now() - t0 < 30000) {
  await new Promise(r => setTimeout(r, 1500));
  for (const [k, jid] of Object.entries(W.jobs)) {
    const job = (await (await fetch(`/api/jobs/${jid}`)).json()).job;
    if (job.status === 3) {
      W.res[k] = (await (await fetch(`/api/query_results/${job.query_result_id}`)).json()).query_result;
      delete W.jobs[k];
    } else if (job.status === 4 || job.status === 5) {
      W.res[k] = { error: String(job.error || 'job failed').slice(0, 120) };
      delete W.jobs[k];
    }
  }
}

let summary;
if (Object.keys(W.jobs).length) {
  summary = JSON.stringify({ pending: Object.keys(W.jobs), hint: 'run the same code again' });
} else {
  // 2. Расчёт
  const day = v => String(v).slice(0, 10);
  const days = ([a, b]) => {
    const out = [];
    for (let t = Date.parse(a + 'T00:00:00Z'); t <= Date.parse(b + 'T00:00:00Z'); t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
    return out;
  };
  const DC = days(CFG.cur), DP = days(CFG.prev);
  const ok = k => W.res[k] && !W.res[k].error;
  const rows = k => (ok(k) ? W.res[k].data.rows : []);
  const series = (k, dateCol, valCol, filter = () => true) => {
    const m = {};
    rows(k).forEach(r => { if (filter(r)) { const d = day(r[dateCol]); m[d] = (m[d] || 0) + (Number(r[valCol]) || 0); } });
    return { cur: DC.map(d => m[d] ?? null), prev: DP.map(d => m[d] ?? null) };
  };
  const tot = a => (a.every(v => v === null) ? null : a.reduce((s, v) => s + (v || 0), 0));
  const r1 = v => (v === null || !isFinite(v) ? null : Math.round(v * 10) / 10);
  const ratio = (a, b) => (a === null || !b ? null : a / b);
  const level = w => (w === null ? 'н/д' : Math.abs(w) >= 15 ? 'критично' : Math.abs(w) >= 5 ? 'заметно' : 'стабильно');

  const S = {
    listings: series('listings', 'period', 'total'),
    published: series('listings', 'period', 'published'),
    private: series('listings', 'period', 'total', r => r.seller_type === 'private'),
    dealer: series('listings', 'period', 'total', r => r.seller_type === 'dealer'),
    unpaid: series('listings', 'period', 'unpaid'),
    rejected: series('listings', 'period', 'rejected'),
    users: series('users', 'date', 'new_users'),
    cash: series('cash', 'date', 'sum_revenue'),
    cashTx: series('cash', 'date', 'count_transactions'),
    payerDays: series('cash', 'date', 'unq_users'),
    reports: series('reports', 'day', 'total_revenue'),
    reportsTx: series('reports', 'day', 'transactions_count'),
  };
  const W2 = Object.fromEntries(Object.entries(S).map(([k, s]) => [k, { cur: tot(s.cur), prev: tot(s.prev) }]));

  const metrics = [];
  const add = (key, name, role, cur, prev, unit, src) => {
    const wow = prev ? r1((cur / prev - 1) * 100) : null;
    metrics.push({ key, name, role, cur: r1(cur), prev: r1(prev), abs: cur === null || prev === null ? null : r1(cur - prev), wow, level: level(wow), unit, src });
  };
  const addShare = (key, name, role, cur, prev, worseIfUp, src) => {
    const pp = cur === null || prev === null ? null : r1((cur - prev) * 100);
    metrics.push({ key, name, role, cur: r1(cur * 100), prev: r1(prev * 100), pp, unit: '%', worse: pp === null ? null : worseIfUp ? pp > 0 : pp < 0, src });
  };
  const w = W2;
  add('new_listings', 'Новые объявления', 'диагностическая', w.listings.cur, w.listings.prev, 'шт', 348);
  add('published', 'Опубликованные объявления', 'диагностическая', w.published.cur, w.published.prev, 'шт', 348);
  add('new_private', 'Новые объявления частных', 'диагностическая', w.private.cur, w.private.prev, 'шт', 348);
  add('new_dealer', 'Новые объявления дилеров', 'диагностическая', w.dealer.cur, w.dealer.prev, 'шт', 348);
  addShare('publish_share', 'Доля публикации', 'guardrail', ratio(w.published.cur, w.listings.cur), ratio(w.published.prev, w.listings.prev), false, 348);
  add('unpaid', 'Неоплаченные объявления', 'диагностическая', w.unpaid.cur, w.unpaid.prev, 'шт', 348);
  add('rejected', 'Отклонённые объявления', 'guardrail', w.rejected.cur, w.rejected.prev, 'шт', 348);
  addShare('reject_share', 'Доля отклонения', 'guardrail', ratio(w.rejected.cur, w.listings.cur), ratio(w.rejected.prev, w.listings.prev), true, 348);
  add('new_users', 'Новые пользователи', 'диагностическая', w.users.cur, w.users.prev, 'чел', 430);
  add('cashin_revenue', 'Сумма пополнений', 'диагностическая', w.cash.cur, w.cash.prev, 'сом', 536);
  add('cashin_tx', 'Транзакции пополнения', 'диагностическая', w.cashTx.cur, w.cashTx.prev, 'шт', 536);
  add('cashin_avg', 'Средняя транзакция пополнения', 'диагностическая', ratio(w.cash.cur, w.cashTx.cur), ratio(w.cash.prev, w.cashTx.prev), 'сом', 536);
  add('payer_days', 'Payer-days (сумма дневных unique users)', 'диагностическая', w.payerDays.cur, w.payerDays.prev, 'чел-дн', 536);
  add('reports_revenue', 'Выручка автоотчётов', 'диагностическая', w.reports.cur, w.reports.prev, 'сом', 303);
  add('reports_tx', 'Покупки автоотчётов', 'диагностическая', w.reportsTx.cur, w.reportsTx.prev, 'шт', 303);
  add('reports_avg', 'Доход на покупку отчёта', 'диагностическая', ratio(w.reports.cur, w.reportsTx.cur), ratio(w.reports.prev, w.reportsTx.prev), 'сом', 303);

  // Автоотчёты по типам
  const byType = {};
  rows('reports').forEach(r => {
    const d = day(r.day), p = DC.includes(d) ? 'cur' : DP.includes(d) ? 'prev' : null;
    if (!p) return;
    const t = (byType[r.report_name] ??= { name: r.report_name, cur_rev: 0, prev_rev: 0, cur_tx: 0, prev_tx: 0 });
    t[p + '_rev'] += Number(r.total_revenue) || 0;
    t[p + '_tx'] += Number(r.transactions_count) || 0;
  });
  // сначала самые большие падения выручки
  const reportsByType = Object.values(byType).sort((a, b) => (a.cur_rev - a.prev_rev) - (b.cur_rev - b.prev_rev));

  // 3. Проверки
  const checks = [];
  for (const [k, src] of Object.entries(RUNS)) if (!ok(k)) checks.push({ check: `Запрос ${src[0]} (${k}) выполнен`, ok: false, detail: W.res[k]?.error || 'нет результата' });
  for (const k of ['listings', 'users', 'cash', 'reports']) {
    const miss = [...DC.filter((d, i) => S[k].cur[i] === null), ...DP.filter((d, i) => S[k].prev[i] === null)];
    checks.push({ check: `7+7 дней: ${k}`, ok: miss.length === 0, detail: miss.length ? 'нет дат: ' + miss.join(', ') : '' });
    const c = S[k].cur, med = [...c.slice(0, 6)].filter(v => v !== null).sort((a, b) => a - b)[2];
    const last = c[6];
    checks.push({ check: `Последний день полный: ${k}`, ok: !(last === null || (med && last < 0.5 * med)), detail: `вс=${last}, медиана пн–сб=${med}` });
  }
  const types = [...new Set(rows('listings').map(r => r.seller_type))];
  checks.push({ check: 'seller_type только private/dealer (private + dealer = total)', ok: types.every(t => t === 'private' || t === 'dealer'), detail: types.join(', ') });
  const wk = p => rows('listingsWeek').filter(r => day(r.period) === p).reduce((s, r) => s + (Number(r.total) || 0), 0);
  checks.push({ check: 'Сумма дней = недельный итог (348 week)', ok: wk(CFG.cur[0]) === w.listings.cur && wk(CFG.prev[0]) === w.listings.prev, detail: `week: ${wk(CFG.cur[0])}/${wk(CFG.prev[0])}, дни: ${w.listings.cur}/${w.listings.prev}` });

  const nowBishkek = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  const endPlus1 = new Date(Date.parse(CFG.cur[1] + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10);
  const result = {
    period: CFG,
    data_cutoff_bishkek: nowBishkek,
    preliminary: nowBishkek.slice(0, 10) < endPlus1,
    retrieved_at: Object.fromEntries(Object.entries(W.res).map(([k, v]) => [k, v.retrieved_at || null])),
    north_star: {
      eod_value: null,
      note: 'Активные объявления не берём: счётчик сайта и снимки (query 268) неактуальны. В отчёте — пробел данных',
    },
    metrics,
    reports_by_type: reportsByType,
    daily_dates: { cur: DC, prev: DP },
    daily: S,
    checks,
  };
  W.result = result;
  const pre = document.createElement('pre');
  pre.id = 'wr-out';
  pre.style.whiteSpace = 'pre-wrap';
  pre.textContent = JSON.stringify(result);
  document.body.innerHTML = '';
  document.body.appendChild(pre);
  summary = JSON.stringify({
    done: true,
    failed_checks: checks.filter(c => !c.ok).map(c => c.check),
    critical: metrics.filter(m => m.level === 'критично' || m.worse).map(m => `${m.key} ${m.wow ?? m.pp}`),
    chars: pre.textContent.length,
  });
}
summary

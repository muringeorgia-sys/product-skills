// Mashina.kg weekly report — extra metrics for slide «Состояние продукта» and the Lalafo parser block.
// Run via javascript_tool in a tab on http://92.204.189.31:8082 (user logged in), after redash_collect.js.
// Read-only: saved queries are only executed, ad-hoc SQL is SELECT via /api/query_results (nothing is saved).
// If a task times out, run the same code again: finished tasks are cached in window.__x.
// Output: JSON in <pre id="wr-extra"> (read with get_page_text), short status as the last expression.

const CFG = {
  cur: ['2026-09-07', '2026-09-13'],
  prev: ['2026-08-31', '2026-09-06'],
  // Периоды таблиц парсера Lalafo
  parser: [
    ['Прошлая неделя', '2026-09-07', '2026-09-13'],
    ['Позапрошлая неделя', '2026-08-31', '2026-09-06'],
    ['С перезапуска', '2026-08-26', '2026-09-13'],
  ],
  // Режимы парсинга: [название, с, по, спарсено объявлений в день]. 26.08 (перезапуск, разбор базы) не входит.
  parserRegimes: [
    ['700 в день', '2026-08-27', '2026-09-07', 700],
    ['3000 в день', '2026-09-08', '2026-09-13', 3000],
  ],
};

const xKey = JSON.stringify(CFG);
if (!window.__x || window.__x.key !== xKey) window.__x = { key: xKey };
const X = window.__x;
const nextDay = d => new Date(Date.parse(d + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10);
const wait = ms => new Promise(r => setTimeout(r, ms));
const poll = async j => {
  if (j.message) return { error: j.message };
  for (let n = 0; !j.query_result && n < 28; n++) {
    await wait(1200);
    const job = (await (await fetch(`/api/jobs/${j.job.id}`)).json()).job;
    if (job.status === 3) j = await (await fetch(`/api/query_results/${job.query_result_id}`)).json();
    if (job.status === 4) return { error: String(job.error).slice(0, 150) };
  }
  return j.query_result || { error: 'timeout' };
};
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const runQ = (id, parameters) => post(`/api/queries/${id}/results`, { parameters, max_age: 0 }).then(poll);
const adhoc = (ds, query) => post('/api/query_results', { data_source_id: ds, query, max_age: 0, parameters: {} }).then(poll);

// Активные пользователи парсера: зарегистрированы по ссылке (как в 549) и разместили объявление, пополнили или потратили.
// Уникальны внутри периода, период — по дате контакта. Таблицы и фильтры те же, что в query 549.
const allParserPeriods = [...CFG.parser, ...CFG.parserRegimes].map(([label, a, b]) => `('${label}', date '${a}', date '${b}')`).join(', ');
const activeSql = `with reg as (
  select distinct cast(d.created_at as date) as dt, c.user_id
  from claim.public.draft_listings d join claim.public.claim_link_event_log c on c.draft_listing_id = d.id
  where c.user_id is not null and c.is_sent = true
), lst as (
  select distinct l.user_id from catalog_service.public.listings l
  where l.status in ('active', 'pending') and l.category_id = 1 and l.user_id in (select user_id from reg)
), tp as (
  select distinct t.user_id from ext_banks.public.transactions t
  where t.status = 'completed' and t.type in ('topup', 'card_payment', 'terminal_payment', 'in_app_purchase', 'balance_topup')
    and coalesce(t.payment_type_key, '') != 'manual_topup' and t.user_id in (select user_id from reg)
), sp as (
  select distinct t.user_id from ext_banks.public.transactions t
  where t.status = 'completed' and t.type not in ('topup', 'card_payment', 'terminal_payment', 'in_app_purchase', 'balance_topup', 'balance', 'bonus', 'return', 'refund', 'cancel_bonus', 'vincode_bonus')
    and t.user_id in (select user_id from reg)
), periods as (
  select * from (values ${allParserPeriods}) as t(label, d1, d2)
)
select p.label, count(distinct reg.user_id) as reg_users,
  count(distinct case when lst.user_id is not null or tp.user_id is not null or sp.user_id is not null then reg.user_id end) as active_users
from periods p join reg on reg.dt between p.d1 and p.d2
left join lst on lst.user_id = reg.user_id left join tp on tp.user_id = reg.user_id left join sp on sp.user_id = reg.user_id
group by 1`;

const tasks = {
  // 549 (дашборд 61): воронка парсера Lalafo по дате контакта
  parser: () => runQ(549, {}),
  parserActive: () => adhoc(19, activeSql),
  // 326 (дашборд 48): выручка (списания), уникальные платящие (mpau), ARPPU по неделям
  rev326: () => runQ(326, { date_from: CFG.prev[0], date_to: CFG.cur[1], period: 'week' }),
  // 364 (дашборд 48): структура выручки по направлениям по дням
  rev364: () => runQ(364, { date_from: CFG.prev[0], date_to: CFG.cur[1] }),
  // 336 (дашборд 48, блок «New / Retained / Reactivated / Churned / Retention»): новые платящие по неделям
  payers336: () => runQ(336, { from_date: CFG.prev[0], to_date: CFG.cur[1], period: 'week' }),
  // 438 (дашборд 62 Mobile GA, «DAU By Platform»): DAU приложений Android + iOS по дням.
  // WAU из raw.events не используем: неясно, устройства это или люди и есть ли там сайт (решение 14.09).
  // Базу аккаунтов (SQL по users) не показываем: на слайде «Новые аккаунты» из 430 (решение 15.09).
  dau: () => runQ(438, { from_date: CFG.prev[0] }),
};
await Promise.all(Object.entries(tasks).filter(([k]) => !X[k] || X[k].error).map(async ([k, f]) => { X[k] = await f(); }));

const failed = Object.keys(tasks).filter(k => X[k].error);
let status;
if (failed.length) {
  status = JSON.stringify({ failed: Object.fromEntries(failed.map(k => [k, X[k].error])), hint: 'timeout — run again; other error — leave the metric out of the deck and tell the user' });
} else {
  const rows = k => X[k].data.rows, day = v => String(v).slice(0, 10);
  const r1 = v => (v === null || !isFinite(v) ? null : Math.round(v * 10) / 10);
  const pct = (a, b) => (b ? r1(a / b * 100) : null);
  const active = Object.fromEntries(rows('parserActive').map(r => [r.label, r.active_users]));
  const pf = ['cnt_pending', 'cnt_sent', 'cnt_registered', 'cnt_listings_new', 'cnt_listers', 'topup_cnt', 'topup_users_cnt', 'topup_amount', 'spend_cnt', 'spend_users_cnt', 'spend_amount'];
  const parserPeriod = ([label, a, b, parsedPerDay]) => {
    const rr = rows('parser').filter(r => day(r.dt) >= a && day(r.dt) <= b);
    const s = Object.fromEntries(pf.map(f => [f, rr.reduce((t, r) => t + (Number(r[f]) || 0), 0)]));
    const act = active[label] ?? null;
    const m = {
      label, from: a, to: b, days: rr.length,
      // абсолютные показатели
      found_contacts: s.cnt_pending, messages_sent: s.cnt_sent, registered: s.cnt_registered, new_listings: s.cnt_listings_new,
      topup_count: s.topup_cnt, topup_amount: s.topup_amount, spend_count: s.spend_cnt, spend_amount: s.spend_amount, active_users: act,
      topup_users: s.topup_users_cnt, listers: s.cnt_listers,
      // конверсии, %
      contact_to_message: pct(s.cnt_sent, s.cnt_pending),
      message_to_registration: pct(s.cnt_registered, s.cnt_sent),
      registration_to_listing: pct(s.cnt_listings_new, s.cnt_registered),   // новые объявления / регистрации
      message_to_listing: pct(s.cnt_listings_new, s.cnt_sent),
      registration_to_topup: pct(s.topup_users_cnt, s.cnt_registered),      // пополнившие пользователи / регистрации
      // деньги на активного пользователя, сом
      topup_per_active: act ? Math.round(s.topup_amount / act) : null,
      spend_per_active: act ? Math.round(s.spend_amount / act) : null,
    };
    if (parsedPerDay) {
      m.parsed_per_day = parsedPerDay;
      m.per_day = Object.fromEntries(['found_contacts', 'messages_sent', 'registered', 'new_listings', 'topup_count', 'topup_amount', 'spend_count', 'spend_amount', 'active_users']
        .map(k => [k, m[k] === null ? null : r1(m[k] / m.days)]));
      m.contact_share_of_parsed = r1(m.per_day.found_contacts / parsedPerDay * 100);
    }
    return m;
  };
  const pStart = [...CFG.parser, ...CFG.parserRegimes].map(p => p[1]).sort()[0];
  const pEnd = [...CFG.parser, ...CFG.parserRegimes].map(p => p[2]).sort().pop();
  const parserDaily = rows('parser').filter(r => day(r.dt) >= pStart && day(r.dt) <= pEnd)
    .sort((a, b) => day(a.dt).localeCompare(day(b.dt)))
    .map(r => ({ d: day(r.dt), found: r.cnt_pending, sent: r.cnt_sent, reg: r.cnt_registered, listings: r.cnt_listings_new, topup: r.topup_amount, spend: r.spend_amount }));
  const lines = {};
  rows('rev364').forEach(r => {
    const d = day(r.day), w = d >= CFG.cur[0] ? 'cur' : 'prev';
    const l = (lines[r.revenue_line] ??= { cur: 0, prev: 0, cur_daily: [], prev_daily: [] });
    l[w] += Number(r.revenue) || 0;
    l[w + '_daily'].push(Number(r.revenue) || 0);
  });
  const result = {
    period: CFG,
    retrieved_at: X.parser.retrieved_at,
    new_payers: rows('payers336').map(r => ({ period: day(r.period), new_payers: r.new_payers, mpau: r.mpau })),
    // DAU приложений: сумма dau по платформам за день; неделя — среднее за её дни, days показывает полноту
    dau: [['prev', CFG.prev], ['cur', CFG.cur]].map(([k, [a, b]]) => {
      const byDay = {};
      rows('dau').filter(r => day(r.event_date) >= a && day(r.event_date) <= b).forEach(r => {
        const d = day(r.event_date);
        byDay[d] ??= { dau: 0, events: 0, platforms: [] };
        byDay[d].dau += Number(r.dau) || 0;
        byDay[d].events += Number(r.total_events) || 0;
        byDay[d].platforms.push(r.platform);
      });
      const days = Object.keys(byDay).sort();
      return { week: k, from: a, to: b, days: days.length, avg_dau: days.length ? r1(days.reduce((s, d) => s + byDay[d].dau, 0) / days.length) : null, by_day: days.map(d => [d, byDay[d].dau, byDay[d].events, byDay[d].platforms.join('+')]) };
    }),
    revenue_weeks: rows('rev326').map(r => ({ period: day(r.period), revenue: r.revenue_total, payers: r.mpau, tx: r.total_transactions, arppu: r.arppu, avg_check: r.avg_check, dealer_sub_payers: r.mpau_dealer_sub, reports_payers: r.mpau_reports, listings_payers: r.mpau_listings })),
    revenue_lines: lines,
    parser: CFG.parser.map(parserPeriod),
    parser_regimes: CFG.parserRegimes.map(parserPeriod),
    parser_daily: parserDaily,
  };
  const pre = document.createElement('pre');
  pre.id = 'wr-extra';
  pre.style.whiteSpace = 'pre-wrap';
  pre.textContent = JSON.stringify(result);
  document.body.innerHTML = '';
  document.body.appendChild(pre);
  status = JSON.stringify({ done: true, dau_days: result.dau.map(w => w.days).join('+'), revenue_weeks: result.revenue_weeks.length, parser_days: parserDaily.length, chars: pre.textContent.length });
}
status

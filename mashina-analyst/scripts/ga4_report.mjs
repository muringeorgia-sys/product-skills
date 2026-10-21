// Отчёт GA4 Data API (runReport) через сервисный аккаунт. Без зависимостей, Node 18+.
// Ключ: путь в переменной GA4_SA_KEY_FILE (Windows User).
// Пример:
//   node ga4_report.mjs --property 515214497 --start 2026-10-12 --end 2026-10-18 \
//     --dims date,platform --metrics activeUsers,newUsers,sessions --country Kyrgyzstan --out tmp/ga4.json
// Свой запрос целиком: --body request.json (тело runReport), тогда dims/metrics/country не нужны.
import { readFileSync, writeFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { execSync } from 'node:child_process';

const a = {};
for (let i = 2; i < process.argv.length; i += 2) a[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];

let keyFile = process.env.GA4_SA_KEY_FILE;
if (!keyFile && process.platform === 'win32') {
  keyFile = execSync('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'GA4_SA_KEY_FILE\',\'User\')"').toString().trim();
}
if (!keyFile) { console.error('GA4_SA_KEY_FILE не задан'); process.exit(1); }
const key = JSON.parse(readFileSync(keyFile, 'utf8'));

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
  iss: key.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly',
  aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
});
const jwt = unsigned + '.' + createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
const tok = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
}).then((r) => r.json());
if (!tok.access_token) { console.error('token error:', tok.error, tok.error_description); process.exit(1); }

let body;
if (a.body) body = JSON.parse(readFileSync(a.body, 'utf8'));
else {
  body = {
    dateRanges: [{ startDate: a.start, endDate: a.end }],
    dimensions: (a.dims || 'date').split(',').map((name) => ({ name })),
    metrics: (a.metrics || 'activeUsers').split(',').map((name) => ({ name })),
    limit: Number(a.limit || 10000),
  };
  if (a.country) body.dimensionFilter = { filter: { fieldName: 'country', stringFilter: { value: a.country } } };
}
const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${a.property}:runReport`, {
  method: 'POST', headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then((r) => r.json());
if (res.error) { console.error('GA4 error:', res.error.code, res.error.message); process.exit(1); }

const dn = (res.dimensionHeaders || []).map((h) => h.name), mn = (res.metricHeaders || []).map((h) => h.name);
const rows = (res.rows || []).map((r) => Object.fromEntries([
  ...dn.map((n, i) => [n, r.dimensionValues[i].value]), ...mn.map((n, i) => [n, Number(r.metricValues[i].value)]),
]));
const out = { property: a.property, rowCount: res.rowCount || 0, sampled: !!res.metadata?.samplingMetadatas, thresholded: !!res.metadata?.subjectToThresholding, rows };
if (a.out) { writeFileSync(a.out, JSON.stringify(out, null, 1)); console.log('ok', a.out, 'rows', rows.length); }
else console.log(JSON.stringify(out));

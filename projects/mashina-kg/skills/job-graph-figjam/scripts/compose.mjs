// node compose.mjs <data.json> [out.js] — склеивает DATA и build-board.js в код для use_figma.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const [, , dataPath, outPath] = process.argv;
if (!dataPath) { console.error('usage: node compose.mjs <data.json> [out.js]'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const ids = new Set(data.jobs.map(j => j.id)); const errs = [];
for (const e of data.edges || []) for (const k of ['from', 'to']) if (!ids.has(e[k])) errs.push(`edge ${k} ${e[k]} not found`);
for (const s of data.sideJobs || []) for (const t of s.targets || []) if (!ids.has(t)) errs.push(`side target ${t} not found`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
const code = `const DATA = ${JSON.stringify(data)};\n` + fs.readFileSync(path.join(dir, 'build-board.js'), 'utf8');
if (code.length > 50000) { console.error(`code ${code.length} chars > 50000 use_figma limit`); process.exit(1); }
if (outPath) fs.writeFileSync(outPath, code); else process.stdout.write(code);
console.error(`ok: ${code.length} chars`);

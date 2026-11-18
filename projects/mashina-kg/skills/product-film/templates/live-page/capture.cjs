// Worked example driver for templates/live-page: serves the composition on the product origin and captures frames. See reference/live-page.md.
// Usage: node capture.cjs stills t1,t2,...  |  node capture.cjs frames
const { chromium } = require('playwright-core')
const fs = require('fs'), path = require('path')
const OUT = path.resolve(__dirname, '..'), COMP = path.join(OUT, 'composition')
const FONTS = path.resolve(OUT, '../frontend/src/app/fonts')
const ORIGIN = 'http://127.0.0.1:13090'
;(async () => {
  const [mode, arg] = process.argv.slice(2)
  const scale = Number(process.env.DSF || 1)
  const b = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1193/chrome-linux/headless_shell', args: ['--font-render-hinting=none'] })
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale, reducedMotion: 'reduce' })
  p.on('pageerror', e => console.error('pageerror', e.message))
  await p.route(ORIGIN + '/__film/**', r => {
    const u = new URL(r.request().url()).pathname.replace('/__film/', '')
    const file = u.startsWith('fonts/') ? path.join(FONTS, u.slice(6)) : path.join(COMP, u || 'index.html')
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.woff2') ? 'font/woff2' : 'text/html'
    r.fulfill({ body: fs.readFileSync(file), contentType: type })
  })
  await p.goto(ORIGIN + '/__film/index.html', { waitUntil: 'load', timeout: 180000 })
  await p.waitForFunction(() => window.__ready || window.__error, null, { timeout: 180000 })
  const err = await p.evaluate(() => window.__error); if (err) { console.error(err); process.exit(1) }
  const shot = async (t, file) => {
    await p.evaluate(async t => { window.renderFrame(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) }, t)
    await p.screenshot({ path: file, type: 'jpeg', quality: 93, scale: 'css' })
  }
  if (mode === 'stills') {
    fs.mkdirSync(path.join(OUT, 'work/stills'), { recursive: true })
    for (const t of arg.split(',').map(Number)) await shot(t, path.join(OUT, `work/stills/t${t.toFixed(2)}.jpg`))
  } else {
    const { FPS, DURATION } = await p.evaluate(() => window.__meta)
    const dir = path.join(OUT, 'work/frames'); fs.mkdirSync(dir, { recursive: true })
    const n = Math.round(FPS * DURATION)
    for (let i = 0; i < n; i++) { await shot(i / FPS, path.join(dir, `f${String(i).padStart(4, '0')}.jpg`)); if (i % 60 === 0) console.log('frame', i, '/', n) }
  }
  await b.close()
})()

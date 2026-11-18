// Worked example (AI-лаборатория /lab, 2026-09-27): selectors and the timeline are specific to that page; see reference/live-page.md for what carries over.
// Every frame is a pure function of t: camera over the live /lab page, page states, cursor, end card.
(() => {
  const W = 1920, H = 1080, VW = 1440, VH = 900, FPS = 30, DURATION = 22.5
  const BASE = W / VW
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
  const lerp = (a, b, k) => a + (b - a) * k
  const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1)
  const ease = {
    linear: k => k,
    io3: k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    io5: k => (k < .5 ? 16 * k ** 5 : 1 - Math.pow(-2 * k + 2, 5) / 2),
    out3: k => 1 - Math.pow(1 - k, 3),
    out5: k => 1 - Math.pow(1 - k, 5),
    in3: k => k * k * k,
  }
  const ep = (t, a, b, e = 'io3') => ease[e](prog(t, a, b))

  const stage = document.getElementById('stage')
  const cam = document.getElementById('cam')
  const frame = document.getElementById('page')
  const cursor = document.getElementById('cursor')
  const end = document.getElementById('end')
  let doc, win, el = {}, R = {}, keys = [], maxScroll = 0, words = [], railStep = 0

  const q = s => doc.querySelector(s)
  const rectOf = node => {
    const r = node.getBoundingClientRect()
    return { x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height,
      get cx() { return this.x + this.w / 2 }, get cy() { return this.y + this.h / 2 } }
  }
  const union = (...rs) => {
    const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y))
    const x2 = Math.max(...rs.map(r => r.x + r.w)), y2 = Math.max(...rs.map(r => r.y + r.h))
    return rectOf({ getBoundingClientRect: () => ({ left: x - win.scrollX, top: y - win.scrollY, width: x2 - x, height: y2 - y }) })
  }
  // Camera that fits a page rect into the frame, never zooming out past the page width.
  const fit = (r, pad = 60, minS = BASE, maxS = 3) => {
    const s = clamp(Math.min(W / (r.w + pad * 2), H / (r.h + pad * 2)), minS, maxS)
    return { cx: r.cx, cy: r.cy, s }
  }
  const zoom = (c, f, dy = 0) => ({ cx: c.cx, cy: c.cy + dy, s: c.s * f })

  function wrapWords(h1) {
    const walker = doc.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
    const texts = []
    while (walker.nextNode()) texts.push(walker.currentNode)
    for (const node of texts) {
      const parts = node.textContent.split(/(\s+)/)
      const frag = doc.createDocumentFragment()
      for (const p of parts) {
        if (!p) continue
        if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(p)); continue }
        const span = doc.createElement('span')
        span.textContent = p
        span.style.display = 'inline-block'
        span.dataset.hl = node.parentElement.closest('[class*="highlight"]') ? '1' : ''
        frag.appendChild(span)
        words.push(span)
      }
      node.replaceWith(frag)
    }
  }

  async function init() {
    await new Promise(res => (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.querySelector('#top') ? res() : frame.addEventListener('load', res, { once: true })))
    doc = frame.contentDocument; win = frame.contentWindow
    const css = doc.createElement('style')
    css.textContent = `*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}
      html{scroll-behavior:auto!important} nextjs-portal{display:none!important}
      [data-reveal]{opacity:1!important;transform:none!important} ::-webkit-scrollbar{display:none}
      #film-axis{position:absolute;height:2px;background:#cbff16;transform-origin:0 50%;z-index:0;pointer-events:none}`
    doc.head.appendChild(css)
    doc.querySelectorAll('[data-reveal]').forEach(n => n.classList.add('r-in'))
    // The site loads its fonts with display:optional, so a cold first visit keeps the fallback.
    // Re-register the same files with display:block so every frame uses Unbounded and Commissioner.
    for (const sheet of doc.styleSheets) {
      let rules; try { rules = sheet.cssRules } catch { continue }
      for (const rule of rules) {
        if (!(rule instanceof win.CSSFontFaceRule)) continue
        const family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim()
        const base = sheet.href || doc.baseURI
        const src = rule.style.getPropertyValue('src').replace(/url\((["']?)([^"')]+)\1\)/g, (_, q, u) => `url("${new URL(u, base).href}")`)
        const face = new win.FontFace(family, src, { weight: rule.style.getPropertyValue('font-weight') || 'normal', display: 'block' })
        try { await face.load(); doc.fonts.add(face) } catch (e) { console.warn("font", family, e) }
      }
    }
    css.textContent += ' *{scroll-snap-type:none!important}'
    doc.querySelectorAll('img').forEach(i => { i.loading = 'eager' })
    await doc.fonts.ready
    await document.fonts.ready
    await Promise.all([...doc.images, ...document.images].map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))))

    // Rail arrows mount only after the rail measures its overflow with the final fonts.
    for (let i = 0; i < 100 && !q('#events button[aria-label]'); i++) await new Promise(r => setTimeout(r, 50))
    await new Promise(r => setTimeout(r, 300))
    el.nav = q('header[class*="__nav"]')
    el.h1 = q('#top h1')
    el.eyebrow = q('[class*="__heroEyebrow"]')
    el.heroCopy = q('[class*="__heroCopy"]')
    el.heroBits = [...el.heroCopy.children].filter(n => n !== el.h1)
    el.artwork = q('[class*="__heroArtwork"]')
    el.artImage = q('[class*="__heroImageFrame"]')
    el.pass = q('[class*="__passCard"]')
    el.primary = q('[class*="__primaryButton"]')
    el.events = q('#events')
    el.eventsTitle = q('#events h2')
    el.rail = q('#events [tabindex="0"]')
    el.cards = [...el.rail.children]
    el.next = [...doc.querySelectorAll('#events button[aria-label]')].pop()
    el.how = q('#how')
    el.howTitle = q('#how h2')
    el.tiles = [...doc.querySelectorAll('#how [class*="__stepBig"]')]
    el.projects = q('#projects')
    el.projTitle = q('#projects h2')
    el.projCards = [...doc.querySelectorAll('#projects article, #projects [class*="Card"]')].filter(n => n.getBoundingClientRect().height > 300)
    el.finalCard = q('[class*="__finalCard"]')
    el.finalCta = q('[class*="__finalCta"]')
    el.otherIntro = [...doc.querySelectorAll('#events, [class*="__heroArtwork"], [class*="__heroEyebrow"]')]

    wrapWords(el.h1)
    win.scrollTo(0, 0)
    maxScroll = doc.documentElement.scrollHeight - VH

    R.h1 = rectOf(el.h1); R.eyebrow = rectOf(el.eyebrow)
    R.primary = rectOf(el.primary)
    R.eventsFrame = union(rectOf(el.eventsTitle), rectOf(el.cards[0]), rectOf(el.next))
    R.card0 = rectOf(el.cards[0]); R.next = rectOf(el.next)
    railStep = el.cards[1] ? rectOf(el.cards[1]).x - R.card0.x : 400
    R.how = union(rectOf(el.howTitle), ...el.tiles.map(rectOf), rectOf(q('#how [class*="__stepList"]')))
    R.tiles = el.tiles.map(rectOf)
    R.proj = union(rectOf(el.projTitle), ...el.projCards.map(rectOf))
    R.final = rectOf(el.finalCard); R.finalCta = rectOf(el.finalCta)

    // Lime axis through the step tiles (drawn under them inside the page).
    const axis = doc.createElement('div')
    axis.id = 'film-axis'
    const a = R.tiles[0], b = R.tiles[R.tiles.length - 1]
    Object.assign(axis.style, { left: a.cx + 'px', top: (a.cy - 1) + 'px', width: (b.cx - a.cx) + 'px' })
    doc.body.appendChild(axis)
    el.axis = axis
    el.tiles.forEach(t => { t.style.position = 'relative'; t.style.zIndex = '1' })

    const hook = fit(union(R.eyebrow, R.h1), 70, BASE, 3)
    const hero = { cx: VW / 2, cy: 405, s: BASE }
    const center = c => ({ ...c, cx: VW / 2 })
    const events = center(fit(R.eventsFrame, 50))
    const how = center(fit(R.how, 40))
    const proj = center(fit(R.proj, 40))
    const fin = { cx: R.final.cx, cy: R.final.cy, s: BASE }
    const finIn = { cx: R.final.x + R.final.w * 0.36, cy: R.final.cy + 10, s: BASE * 1.12 }
    keys = [
      [0.0, zoom(hook, 0.94), 'linear'],
      [3.5, hook, 'io3'],
      [5.3, hero, 'linear'],
      [6.55, zoom(hero, 1.0), 'io3'],
      [7.55, events, 'linear'],
      [10.3, zoom(events, 1.03), 'io5'],
      [10.85, how, 'linear'],
      [13.8, zoom(how, 1.03), 'io3'],
      [14.35, proj, 'linear'],
      [16.3, zoom(proj, 1.06), 'io5'],
      [16.95, fin, 'io3'],
      [20.2, finIn, 'linear'],
      [DURATION, finIn, 'linear'],
    ]
    window.__ready = true
  }

  function camAt(t) {
    let i = 0
    while (i < keys.length - 2 && t >= keys[i + 1][0]) i++
    const [t0, a, e] = keys[i], [t1, b] = keys[i + 1]
    const k = ease[e](prog(t, t0, t1))
    return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), s: lerp(a.s, b.s, k) }
  }

  // Page point -> screen point for the camera at time t.
  const toScreen = (c, x, y) => ({ x: (x - c.cx) * c.s + W / 2, y: (y - c.cy) * c.s + H / 2 })

  function cursorAt(t, c) {
    const P = (x, y) => toScreen(c, x, y)
    const primary = P(R.primary.cx + 30, R.primary.cy + 8)
    const card = P(R.card0.x + R.card0.w * 0.62, R.card0.y + R.card0.h * 0.42)
    const next = P(R.next.cx + 4, R.next.cy + 6)
    const cta = P(R.finalCta.x + R.finalCta.w * 0.42, R.finalCta.cy + 8)
    let pos = null, op = 0
    if (t >= 5.2 && t < 10.6) {
      op = prog(t, 5.2, 5.45) * (1 - prog(t, 10.3, 10.55))
      const start = { x: 1560, y: 1010 }
      if (t < 6.6) pos = lerpPt(start, primary, ep(t, 5.3, 6.2))
      else if (t < 7.7) pos = lerpPt(primary, { x: primary.x + 260, y: primary.y + 120 }, ep(t, 6.6, 7.6))
      else if (t < 8.9) pos = lerpPt({ x: primary.x + 260, y: primary.y + 120 }, card, ep(t, 7.7, 8.4))
      else pos = lerpPt(card, next, ep(t, 8.9, 9.45))
      if (t >= 9.45) pos = next
    } else if (t >= 17.7 && t < 20.0) {
      op = prog(t, 17.7, 17.95) * (1 - prog(t, 19.7, 19.95))
      pos = lerpPt({ x: 1500, y: 1040 }, cta, ep(t, 17.8, 18.75))
    }
    return { pos, op }
  }
  const lerpPt = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) })

  let lastScroll = -1
  window.renderFrame = function (t) {
    const c = camAt(t)
    const cPrev = camAt(Math.max(0, t - 1 / FPS))
    const speed = Math.hypot((c.cx - cPrev.cx) * c.s, (c.cy - cPrev.cy) * c.s) + Math.abs(c.s - cPrev.s) * 600
    const blur = clamp((speed - 18) * 0.045, 0, 7)

    const scroll = clamp(Math.round(c.cy - VH / 2), 0, maxScroll)
    if (scroll !== lastScroll) { win.scrollTo(0, scroll); lastScroll = scroll }
    const tx = W / 2 - c.cx * c.s
    const ty = H / 2 - (c.cy - scroll) * c.s
    cam.style.transform = `translate(${tx}px, ${ty}px) scale(${c.s})`
    cam.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none'

    // Clicks show as the product's own pressed state (press() below), not a ring.
    // Scene 1: only the headline, word by word; the rest of the first screen arrives with the pull-back.
    const intro = ep(t, 3.45, 4.3, 'out3')
    el.nav.style.opacity = t < 7 ? ep(t, 5.0, 5.35, 'out3') : 0
    for (const n of [...el.heroBits, el.events]) n.style.opacity = intro
    el.eyebrow.style.opacity = ep(t, 0.05, 0.45, 'out3')
    el.eyebrow.style.transform = `translateY(${(1 - ep(t, 0.05, 0.45, 'out3')) * 14}px)`
    words.forEach((w, i) => {
      const hl = w.dataset.hl === '1'
      const hlIndex = words.filter(x => x.dataset.hl === '1').indexOf(w)
      const start = hl ? 1.0 + hlIndex * 0.16 : 0.35 + i * 0.17
      const k = ep(t, start, start + 0.38, 'out5')
      w.style.opacity = k
      w.style.transform = `translateY(${(1 - k) * 0.42}em)`
      if (hl) {
        const m = ep(t, start + 0.12, start + 0.42, 'out3') * (1 - ep(t, 3.0, 3.4, 'in3'))
        w.style.backgroundImage = 'linear-gradient(#cbff16,#cbff16)'
        w.style.backgroundRepeat = 'no-repeat'
        w.style.backgroundPosition = '0 88%'
        w.style.backgroundSize = `${m * 100}% 34%`
      }
    })
    el.artwork.style.opacity = ep(t, 3.7, 4.4, 'out3')
    el.artImage.style.transform = `scale(${1.06 - 0.06 * ep(t, 3.7, 5.2, 'out3')})`
    const passIn = ep(t, 4.35, 5.05, 'out5')
    el.pass.style.opacity = passIn
    el.pass.style.transform = `translateX(${(1 - passIn) * 90}px)`

    // Buttons pressed by the cursor.
    const press = (node, tc) => { const p = t >= tc && t < tc + 0.16 ? 0.955 : 1; node.style.transform = `scale(${p})` }
    press(el.primary, 6.3); press(el.next, 9.5); press(el.finalCta, 19.0)

    // Scene 3: hover lift on the first meeting, then the rail moves one card on.
    const lift = ep(t, 8.25, 8.6, 'out3') * (1 - ep(t, 9.0, 9.3))
    el.cards[0].style.transform = `translateY(${-8 * lift}px)`
    el.cards[0].style.boxShadow = lift > 0 ? `0 ${18 * lift}px ${40 * lift}px rgba(20,24,15,${0.14 * lift})` : 'none'
    el.rail.scrollLeft = Math.round(railStep * ep(t, 9.55, 10.2, 'io3'))

    // Scene 4: the week runs through the four steps.
    const axisK = ep(t, 11.0, 12.9, 'io3')
    el.axis.style.transform = `scaleX(${axisK})`
    el.tiles.forEach((tile, i) => {
      const at = 11.0 + (i / (el.tiles.length - 1)) * 1.9
      const on = t >= at - 0.02
      tile.style.color = on ? '#cbff16' : ''
      tile.style.transform = `scale(${1 + 0.12 * (1 - ep(t, at, at + 0.3, 'out3')) * (on ? 1 : 0)})`
    })

    // Cursor.
    const cur = cursorAt(t, c)
    if (cur.pos) cursor.style.transform = `translate(${cur.pos.x - 9}px, ${cur.pos.y - 5}px)`
    cursor.style.opacity = cur.op
    // End card.
    const e = ep(t, 19.85, 20.25, 'io3')
    end.style.opacity = e
    const mark = end.querySelector('.mark'), name = end.querySelector('.name'), url = end.querySelector('.url')
    const mk = ep(t, 20.05, 20.6, 'out5'), nk = ep(t, 20.3, 20.8, 'out5'), uk = ep(t, 20.5, 21.0, 'out5')
    mark.style.opacity = mk; mark.style.transform = `scale(${0.86 + 0.14 * mk})`
    name.style.opacity = nk; name.style.transform = `translateY(${(1 - nk) * 24}px)`
    url.style.opacity = uk; url.style.transform = `translateY(${(1 - uk) * 18}px)`
    end.querySelector('.rule').style.transform = `scaleX(${ep(t, 19.95, 20.7, 'io3')})`
  }

  window.__meta = { W, H, FPS, DURATION }
  init().catch(err => { window.__error = String(err && err.stack || err) })
})()

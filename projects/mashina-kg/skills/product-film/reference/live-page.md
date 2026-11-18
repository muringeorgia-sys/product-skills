# Live page: a camera over the running product

Use this when the product is a website or web app that runs locally with demo data, and rebuilding its screens as Remotion components would cost more than filming them. The camera moves over the real page, so every pixel is the product's own. Remotion stays the engine: the capture becomes a clip (`<OffthreadVideo>`) or an image sequence inside the composition, and punchlines, the logo and the ending are built in Remotion around it.

Worked example: `templates/live-page/` (AI-лаборатория `/lab`, 22.5 s). `index.html` is the stage, `render.js` the timeline, `capture.cjs` the Playwright driver. The selectors and times are that page's; the structure carries over. It ran at 30 fps; set `FPS` to the film's rate. Edit before running: the paths at the top of `capture.cjs` (composition folder, the product's font folder), the product origin and port, and the Chromium path (Playwright's installed `chromium_headless_shell`). The capture browser is a local render tool that opens only the product's local demo origin, never a signed-in site; site work still goes through the agent browser.

## How it works

1. Run the product locally against demo data (`next dev` or its stand). Never point the capture at production or real user data.
2. Serve the stage from the product's own origin with Playwright `page.route('<origin>/__film/**')`, so the page loads in a same-origin iframe the timeline can reach into. No file lands in the product repo.
3. The iframe keeps the desktop viewport (for example 1440×900). The camera is `translate + scale` on the iframe plus `contentWindow.scrollTo` for the integer part of the scroll; zoom never drops below `frameWidth / viewportWidth`, or the page edge shows.
4. `renderFrame(t)` sets everything from `t` alone: camera, scroll, element styles (entrances, hover lift, pressed state, a rail's `scrollLeft`), the cursor. Frame positions come from DOM rects measured once after load, never from typed numbers.
5. Capture: `renderFrame(t)`, wait two `requestAnimationFrame`s, screenshot. About 10 frames per second on сервере разработки; 675 frames take a couple of minutes.
6. Motion blur on fast camera moves: blur the iframe in proportion to camera speed (capped around 7 px). It hides the jump between distant sections.

## Traps met on real pages

- **Fonts with `display: optional`** (common in Next.js `localFont`) stay on the fallback for a cold visit, so the film shows system type. Re-register every `@font-face` from the page's stylesheets as a `FontFace` with `display: 'block'`, resolving `url()` against the stylesheet's `href`, and wait for `document.fonts.ready`.
- **Reveal-on-scroll and CSS animations** run on wall-clock time. Emulate `reducedMotion: 'reduce'`, add the page's "revealed" class, and inject `animation:none; transition:none; scroll-behavior:auto`.
- **Scroll snap** swallows intermediate `scrollLeft`/`scrollTop` values. Inject `scroll-snap-type:none`.
- **Controls that mount after measuring** (rail arrows, "show more") appear a tick after fonts swap. Poll for them before measuring.
- **Sticky headers** show as a sliver at the top of zoomed frames. Fade the header in only where the frame starts at scroll 0.
- **Dev overlays** (Next's `nextjs-portal`) appear in frames. Hide them with injected CSS.
- **Lazy images** outside the viewport stay blank. Set `loading = 'eager'` and wait for every image before the first frame.
- Screenshots at device scale 1 stay sharp under a CSS `scale` of 1.3–2; check one full-size still before rendering everything.

## Handing the capture to Remotion

- Encode the frames to a lossless or high-quality clip (`-crf 12`, `yuv444p` if the product has thin lines) and place it with `<OffthreadVideo>` at the scene's cue. Keep the capture's frame rate equal to the film's.
- Build overlays (punchlines, logo, ending, cursor if you prefer Remotion's) in Remotion on the same `cues.ts` grid, so the capture and the words land on the same beats.
- For a quick-mode film the stage itself can carry the whole film, including the end card, as the example does. Then finish with ffmpeg: `ffmpeg -framerate <fps> -i frames/f%04d.jpg -i music.wav -af loudnorm=I=-14:TP=-1.5 -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart film.mp4`, bake the poster (render.md), and run `verify.py --no-loop --fps <fps>`. Move it into Remotion when the film needs editing later.

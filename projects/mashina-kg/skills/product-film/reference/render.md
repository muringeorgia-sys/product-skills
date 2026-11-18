# Final render, verification and delivery

## Pipeline (`scripts/render.ts`)

1. **Master.** 240 fps, PNG frames, H.264 at CRF 8, `yuv444p`, muted: `--props '{"fps":240}' --image-format png --pixel-format yuv444p --crf 8 --muted`.
2. **Audio.** Once, at 60 fps: `--codec wav`.
3. **Motion blur.** ffmpeg `tmix=frames=4` averages each group of 4 subframes, and `select='not(mod(n+1\,4))'` keeps one, giving 60 fps. Convert color once: `scale=in_range=tv:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709`, then ProRes 4444 as the intermediate.
4. **Deliverables.**
   - a muted H.264 loop for the landing page (CRF 20, `yuv420p`, BT.709 tags, `+faststart`)
   - the same with music (AAC 256k)
   - a VP9 WebM
   - `poster.jpg` at `--poster <s>`: the strongest settled frame (default is the midpoint, rarely right)
   - a loop-seam sheet (the last 8 and first 8 frames, played twice)
5. Delete the master and the intermediate. Print the file sizes.

A full-frame render at 240 fps takes about 10 minutes for 50 s on a laptop. Run it in the background and review other things meanwhile. For 9:16 or 1:1, pass the size to `verify.py --size` too.

## Quick render (quick mode)

One pass at 60 fps with sound, no motion blur and no muted loop, unless the film has fast camera moves:
`npx remotion render src/index.ts <Id> out/<film>/v1/<film>.mp4 --props '{"fps":60}' --crf 18 --pixel-format yuv420p`, then `ffmpeg -ss <s> -i <film>.mp4 -frames:v 1 poster.jpg`.

Long films with 3D or many layers: render with `--image-format=jpeg --jpeg-quality=95` (PNG frames are about 3 MB each and pile up on disk) and add `--color-space=bt709`. Without it, Remotion 4.0.5xx writes JPEG-fed video as full-range BT.601 (`yuvj420p`), which some players and messengers read wrong. Check with `ffprobe -show_entries stream=pix_fmt,color_range,color_space`: expect `yuv420p`, `tv`, `bt709`.

## Verify before sending (`scripts/verify.py`)

```bash
uv run --with numpy --with imageio-ffmpeg python3 scripts/verify.py out/<film> --duration 52.8 --bg 10,10,10 --probe 9.4:944,800
```

- `--no-loop` for every film that does not loop (quick and social films): it skips the seam check.
- `--bg` is the product's background from BRAND.md. The frame-0 check fits loops and films that open on the background; for a film that opens in motion, drop it and probe a settled frame instead.

It checks, for every deliverable:
- the duration
- decoded frame 0 at the center: expect the background ±2 (#0a0a0a comes back as 9 or 10)
- the last frame against frame 0: only encoder noise (a few hundred pixels off by a few values)
- optional probes (time:x,y) to check an accent color or a surface

If the background comes back lighter (#171717 for #0a0a0a), the color range was read wrong. Fix the `scale` filter above; never "fix" the tokens.

## Deliver

- Keep each version: `cp` the deliverables into `out/<film>/vN/` before the next render.
- **Poster.** Pick the strongest settled frame (text fully in, not mid-transition). For the with-sound file of a film that is posted or sent (not a loop, not the muted landing file), also bake it in as frame 0: replace the first frame rather than adding one, so duration and audio sync stay the same, and the thumbnail on every platform shows it. Recipe: `ffmpeg -i film.mp4 -i poster.jpg -filter_complex "[0:v][1:v]overlay=enable='eq(n\,0)',format=yuv420p" -c:v libx264 -crf 17 -c:a copy -movflags +faststart out.mp4`, then check the frame count is unchanged. Run `verify.py` on the file before the bake: its frame-0 check expects the background. A loop keeps frame 0 equal to its last frame.
- **`share-copy.txt`.** 1–3 sentences, postable as is, in the product's voice and the film's tone, only claims the film shows. No "excited to share".
- Send the files (with music for review, the muted loop for the page, WebM, poster) with a two-line caption of what changed.
- Report: durations, sizes, the checks you ran.
- Do not commit or publish unless asked.

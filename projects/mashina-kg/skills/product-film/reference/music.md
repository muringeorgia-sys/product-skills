# Music: measure the song, cut it on bars, land every hit

## Get the song

- Use the user's licensed track (stems if possible), or ask for a royalty-free one with its license link.
- **Which source:** quick mode and drafts take a bundled track; anything published for a client takes a licensed track or a synthesized score.
- **Bundled library:** five upbeat tracks in `assets/music/`. Pick the one whose tempo and energy fit the tone (`assets/music/cues/*.md` summarise each). The cue files are hit candidates only (no bars or downbeat): run `beats.py` on the track before cutting. Their license is unconfirmed (`assets/music/README.md`).
- **Generated track:** the `openrouter-media` skill has Lyria write a track to the film's tempo, mood and length, priced from its live model list. Run `beats.py` on it like any other track. Its commercial license is unconfirmed, the same as the bundled library.
- **No track fits:** `scripts/synth-score.py` writes a score and sound design in one key and one room (numpy, scipy). Edit its tempo, chords and event times to the film's cues, then check loudness and a spectrogram, since nobody listens to it before you deliver.
- Store it under `videos/public/audio/<film>/music/` and gitignore it. Write the source and license in a README next to it.
- No system Python packages: run everything with `uv run --with numpy --with imageio-ffmpeg python3 ...` (imageio-ffmpeg ships a full ffmpeg).

## 1. The grid: `scripts/beats.py`

```bash
uv run --with numpy --with imageio-ffmpeg python3 scripts/beats.py \
  --drums public/audio/<film>/music/stems/drums.mp3 \
  --stem bass=public/audio/<film>/music/stems/bass.mp3 \
  --stem melody=public/audio/<film>/music/stems/melody.mp3 \
  --out src/videos/<film>/beats.json
```

- No stems? Pass the full mix as `--drums`.
- Tempo comes from autocorrelation, refined by a comb. Phase is the comb's best offset.
- The downbeat is the bar position where stems come and go (loudness change per beat). Kick and backbeat only break ties, because four-on-the-floor kicks land on every beat.
- Check `gridCheckMs.spread` (under 10 ms is good) and listen once.
- If the tempo is known, pass `--bpm` to skip the search.

## 2. The song map (choose sections from data)

Print each stem's loudness per bar and read the structure: intro, silent bars, drops, breakdowns, big hits, outro.

```python
# inside uv run --with numpy --with imageio-ffmpeg python3
blocks = " .:-=+*#%@"
for bar in beats["bars"]:
    print(bar["index"], bar["start"], *[bar["loudnessDb"][n] for n in names])
```

Map the story onto it:
- the hello on a sparse bar
- the click in a silent bar
- the first punchlines where the drums come in
- the busy feature scenes on the full groove
- the drop moment on the drop
- the last punchline on a big hit
- the headline where the bass drops out, and home on the ring-out

## 3. The edit: `scripts/audio-edit.py` with `edit.json`

```json
{
  "source": "public/audio/<film>/music/song.mp3",
  "out": "public/audio/<film>/music/<film>-edit.wav",
  "bpm": 150,
  "firstDownbeat": 1.2516,
  "segments": [
    { "fromBar": 1, "toBar": 17, "why": "..." },
    { "fromBar": 36, "toBar": 49, "why": "..." },
    { "fromBar": 88, "toBar": 92, "why": "..." }
  ],
  "duration": 52.8,
  "fadeOutSeconds": 1.2
}
```

- `toBar` is exclusive. The film's bars are the segments back to back: the grid runs straight through every join.
- Each cut gets a 5 ms fade; the end fades out.
- Film length = a whole number of bars. The film's grid starts at 0 on a downbeat (`firstBeat: 0, pickupBeats: 0`).
- Cutting the intro short is usually right: viewers find slow starts boring.

## 4. Sound effects

- Short, dry and quiet: a click-pop, a soft whoosh, a heavy whoosh for the drop, a soft ping, a success chime, a shimmer. Synthesize or license them.
- `assets/sfx/` holds 262 Kenney (CC0) sounds: keyboard, interface clicks and switches, soft impacts, card slides. `assets/sfx/sfx-analysis.md` ranks them by brightness and high-frequency risk; prefer the low-risk picks for polished films.
- Measure each file's peak time once into `sfx-peaks.json` (decode with imageio-ffmpeg to mono float, `peak = argmax(abs(x)) / sr`). Place each hit at `cue - peak`, so the transient lands on the frame.
- Keep volumes low (0.25 to 0.5). The music leads.
- One sound per meaningful event: clicks, pings, the drop, the proof. Not every animation.

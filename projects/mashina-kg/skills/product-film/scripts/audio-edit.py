"""Cut a film's music out of a song, on the song's bar grid.

    uv run --with numpy --with imageio-ffmpeg python3 scripts/audio-edit.py src/videos/<name>/edit.json

Segments are song bars, so every cut lands on a downbeat and the film's beat
grid runs straight through the joins. Each join is a 30 ms equal-power
crossfade that ends on the incoming downbeat: the outgoing bar fades under the
incoming segment's own pre-roll, so the sound never dips to silence and the
downbeat transient stays intact. A fade to zero and back at a join reads as a
stutter on sustained pads. The end fades out.
"""

import json
import subprocess
import sys
import wave

import imageio_ffmpeg
import numpy as np

SR = 48000
XFADE = int(0.03 * SR)


def decode(path):
    out = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", path, "-ac", "2", "-ar", str(SR),
         "-f", "s16le", "-acodec", "pcm_s16le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(out, dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768.0


def main():
    edit = json.load(open(sys.argv[1]))
    song = decode(edit["source"])
    bar = 60 / edit["bpm"] * 4

    def at(value):
        return 0.0 if value == "start" else edit["firstDownbeat"] + value * bar

    curve = np.linspace(0, np.pi / 2, XFADE)[:, None]
    pieces = []
    for segment in edit["segments"]:
        start = int(round(at(segment["fromBar"]) * SR))
        piece = song[start: int(round(at(segment["toBar"]) * SR))].copy()
        if pieces:
            pre = song[max(0, start - XFADE): start]
            pre = np.pad(pre, ((XFADE - len(pre), 0), (0, 0)))
            tail = pieces[-1][-XFADE:]
            tail[:] = tail * np.cos(curve) + pre * np.sin(curve)
        pieces.append(piece)

    film = np.concatenate(pieces)[: int(round(edit["duration"] * SR))]
    fade = int(edit["fadeOutSeconds"] * SR)
    film[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2

    with wave.open(edit["out"], "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes((np.clip(film, -1, 1) * 32767).astype(np.int16).tobytes())
    print(f"{edit['out']}: {len(film) / SR:.3f} s from {len(pieces)} segments")


if __name__ == "__main__":
    main()

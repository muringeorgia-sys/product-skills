# Synthesized score and sound design used for the AI-лаборатория film (120 BPM, A minor, 22.5 s). Fallback when no licensed track fits; edit times and chords per film.
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR, DUR, BEAT = 48000, 22.5, 0.5
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def place(buf, sig, at, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if i < N: buf[i:j] += sig[: j - i] * gain
def env(n, a, d):  # attack then exponential decay, seconds
    k = np.arange(n) / SR
    return np.minimum(k / max(a, 1e-4), 1) * np.exp(-np.maximum(k - a, 0) / d)

# A minor cycle: Am9, Fmaj7, Cmaj7, G6 — one chord per 2 s bar.
chords = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 59, 64, 67], [55, 59, 62, 64, 67]]
roots = [45, 41, 48, 43]
bar = lambda x: int(x // 2) % 4

# Pad: detuned saws, slowly opening filter, swells on each bar.
pad = np.zeros(N)
for b in range(12):
    s0 = b * 2.0
    notes = chords[b % 4] if s0 < 20 else chords[0]
    length = 2.3 if s0 < 20 else DUR - s0
    n = int(length * SR); k = np.arange(n) / SR
    seg = np.zeros(n)
    for m in notes:
        for det in (-0.08, 0.0, 0.09):
            ph = rng.random()
            seg += 2 * ((k * hz(m + det) + ph) % 1) - 1
    e = np.minimum(k / 0.35, 1) * np.minimum(1, np.maximum(0, (length - k) / 0.4))
    place(pad, seg * e / len(notes), s0)
cut = 700 + 2600 * np.clip(t / 20, 0, 1) ** 1.5
pad = 0.5 * lp(pad, 900) + 0.5 * lp(pad, 3200) * np.clip(t / 20, 0, 1)
pad *= 0.55 + 0.45 * np.clip((t - 3.5) / 3, 0, 1)

drums_on = lambda x: 3.5 <= x < 19.75
# Sub bass on eighths from the reveal.
bass = np.zeros(N)
for i in range(int(DUR / 0.25)):
    x = i * 0.25
    if not drums_on(x): continue
    f = hz(roots[bar(x)] - 12 if i % 2 == 0 else roots[bar(x)])
    n = int(0.24 * SR); k = np.arange(n) / SR
    s = np.tanh(1.6 * np.sin(2 * np.pi * f * k)) * env(n, 0.004, 0.09)
    place(bass, s, x, 0.9 if i % 2 == 0 else 0.55)
bass = lp(bass, 420)
# Final low hit.
n = int(2.4 * SR); k = np.arange(n) / SR
place(bass, np.sin(2 * np.pi * (55 * k + 18 * (1 - np.exp(-k / 0.05)) * 0.05)) * env(n, 0.003, 0.9), 20.0, 1.6)

# Kick every beat, hats on offbeat eighths, soft clap on 2 and 4.
drums = np.zeros(N)
nk = int(0.35 * SR); k = np.arange(nk) / SR
kick = np.sin(2 * np.pi * (45 * k + 65 * 0.03 * (1 - np.exp(-k / 0.03)))) * env(nk, 0.002, 0.11)
nh = int(0.06 * SR); hat = lp(hp(rng.standard_normal(nh), 6500), 11000) * env(nh, 0.001, 0.014)
nc = int(0.25 * SR); clap = bp(rng.standard_normal(nc), 900, 4200) * env(nc, 0.004, 0.06)
for i in range(int(DUR / BEAT)):
    x = i * BEAT
    if drums_on(x): place(drums, kick, x, 0.95)
    if drums_on(x) and x >= 7.5: place(drums, hat, x + 0.25, 0.14)
    if drums_on(x) and x >= 10.5 and (x % 2) in (0.5, 1.5): place(drums, clap, x, 0.35)

# Sound design in key: plucks for words, clicks and steps; whooshes on whip pans; riser into the end card.
sfx = np.zeros(N)
def pluck(m, dur=0.5, bright=1.0):
    n = int(dur * SR); k = np.arange(n) / SR; f = hz(m)
    s = np.sin(2 * np.pi * f * k) + 0.35 * bright * np.sin(4 * np.pi * f * k) + 0.12 * bright * np.sin(6 * np.pi * f * k)
    return s * env(n, 0.003, dur / 4)
word_times = [0.35, 0.52, 0.69, 1.0, 1.16, 1.32, 1.48]
word_notes = [69, 72, 74, 76, 79, 81, 84]
for x, m in zip(word_times, word_notes): place(sfx, pluck(m, 0.45, 0.6), x, 0.32)
for x in (6.3, 9.5, 19.0):
    place(sfx, pluck(81, 0.3, 0.3), x, 0.3)
    place(sfx, hp(rng.standard_normal(int(0.012 * SR)), 3000) * env(int(0.012 * SR), 0.0005, 0.003), x, 0.25)
for x, m in zip([11.0, 11.633, 12.267, 12.9], [69, 72, 76, 79]): place(sfx, pluck(m, 0.6, 0.8), x, 0.34)
def whoosh(a, b, g):
    n = int((b - a + 0.25) * SR); k = np.arange(n) / SR; L = n / SR
    noise = rng.standard_normal(n)
    lo = bp(noise, 300, 1500); hi = bp(noise, 1500, 6000)
    mix = np.clip(k / L, 0, 1)
    e = np.sin(np.pi * np.clip(k / L, 0, 1)) ** 2
    place(sfx, (lo * (1 - mix) + hi * mix) * e, a - 0.05, g)
whoosh(6.6, 7.5, 0.10); whoosh(10.3, 10.85, 0.16); whoosh(13.8, 14.3, 0.09); whoosh(16.3, 16.95, 0.18)
n = int(1.9 * SR); k = np.arange(n) / SR
riser = bp(rng.standard_normal(n), 800, 5000) * (k / 1.9) ** 2.2
place(sfx, riser, 18.05, 0.14)

# Shared room: one reverb for pad and sound design so everything sits in the same space.
ir_n = int(1.6 * SR); ir_k = np.arange(ir_n) / SR
def ir(seed):
    r = np.random.default_rng(seed).standard_normal(ir_n) * np.exp(-ir_k / 0.38)
    return lp(r, 5000) / np.sqrt(np.sum(r ** 2))
send = 0.35 * pad + 0.9 * sfx + 0.08 * drums
wetL = fftconvolve(send, ir(1))[:N]; wetR = fftconvolve(send, ir(2))[:N]

dry = 0.34 * pad + 0.62 * bass + 0.55 * drums + 0.55 * sfx
L = dry + 0.32 * wetL; R = dry + 0.32 * wetR
# Gentle stereo width on the pad.
L += 0.05 * np.roll(pad, 240); R += 0.05 * np.roll(pad, -240)
fade = np.clip((DUR - t) / 1.2, 0, 1) * np.clip(t / 0.05, 0, 1)
st = np.stack([L * fade, R * fade], 1)
st = np.tanh(st / np.max(np.abs(st)) * 1.3)
st = st / np.max(np.abs(st)) * 0.89
wavfile.write('music.wav', SR, (st * 32767).astype(np.int16))
print('ok', st.shape)

"""Sound design for the 30-second ad, made in code: air, not music.
  - a soft whoosh on each cut (filtered noise sweeping down, panned across);
  - a faint tick as the counting ring rises (one for each count, quiet, like a bead);
  - a soft swell of low air under the logo at the end (no tone, no note).
Usage: python tools/promo/sfx.py <out.wav> <seconds> <cut,cut,...>
"""
import sys
import wave
import numpy as np

SR = 48000
DUR = float(sys.argv[2])
CUTS = [float(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else []
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(30)


def sweep_noise(dur, f0, f1, seed):
    """noise through a band that slides from f0 to f1: the sound of something passing"""
    n = int(dur * SR)
    r = np.random.default_rng(seed)
    x = r.standard_normal(n)
    X = np.fft.rfft(x)
    out = np.zeros(n)
    # build it in short frames so the band can move
    hop = 512
    win = np.hanning(hop * 2)
    for s in range(0, n - hop * 2, hop):
        fr = x[s:s + hop * 2] * win
        F = np.fft.rfft(fr)
        f = np.fft.rfftfreq(hop * 2, 1 / SR)
        c = f0 * (f1 / f0) ** (s / n)
        F *= np.exp(-((np.log(f + 1) - np.log(c)) / .55) ** 2)
        out[s:s + hop * 2] += np.fft.irfft(F, hop * 2)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6
    return out * e / (np.abs(out).max() + 1e-9)


def put(sig, at, pan_from, pan_to, gain):
    a = int(at * SR)
    b = min(N, a + len(sig))
    if a >= N or b <= a:
        return
    sig = sig[: b - a] * gain
    p = np.linspace(pan_from, pan_to, len(sig))
    L[a:b] += sig * np.cos(p * np.pi / 2)
    R[a:b] += sig * np.sin(p * np.pi / 2)


for i, c in enumerate(CUTS):
    w = sweep_noise(.42, 2600, 380, 100 + i)
    put(w, c - .2, .2 if i % 2 else .8, .8 if i % 2 else .2, .55)

# the counting ring (the beat from 7.4 s): ticks at the same moments as the numbers on screen
D0 = 7.4
for n in range(2, 34):
    at = D0 + .6 + 2.1 * ((n - 1) / 32) ** (1 / .8)
    k = int(.03 * SR)
    tt = np.arange(k) / SR
    tick = np.sin(2 * np.pi * 1850 * tt) * np.exp(-tt / .006) + .4 * np.sin(2 * np.pi * 3700 * tt) * np.exp(-tt / .003)
    put(tick, at, .5, .5, .10)

# a warm swell under the logo (from 25.9 s): low, soft, rising and settling
s0, sd = 25.6, 4.2
n = int(sd * SR)
tt = np.arange(n) / SR
env = (1 - np.exp(-tt / .5)) * np.exp(-np.maximum(0, tt - 1.2) / 1.6)
# air, not a tone: low noise, softened, so it is felt rather than heard as a note
air = rng.standard_normal(n)
for _ in range(3):
    air = np.convolve(air, np.ones(90) / 90, mode='same')
sw = air / (np.abs(air).max() + 1e-9) * env
put(sw, s0, .45, .55, .35)

pk = max(np.abs(L).max(), np.abs(R).max())
L, R = L / pk * .6, R / pk * .6
pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('sfx: %d cuts, 32 ticks, the swell; %.1f s' % (len(CUTS), DUR))

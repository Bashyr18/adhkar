"""The film's touch sounds, made in code and cued by the picture: things you could hear in a quiet room, never music.
The film publishes its cues (window.SFX, written by render.js to sfx.json), so each sound lands on its frame:
  tap     a fingertip on a wooden table: warm, short, low; p tilts it brighter or darker, g its level
  tick    the finger moving from one joint to the next while counting: barely there
  lift    the air of a card lifting off glass, d seconds: a soft, rising hush
  rustle  paper: a page turning, a sheet coming out
  breath  a slow exhale under the opening and the end: felt more than heard
They sit far beneath the adhān (film.sh mixes them at -40 LUFS).
Usage: python tools/promo/sfx.py <out.wav> <seconds> <sfx.json>
"""
import json
import sys
import wave

import numpy as np

SR = 48000
DUR = float(sys.argv[2])
CUES = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else []
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(45)


def put(sig, at, pan, gain):
    a = int(at * SR)
    b = min(N, a + len(sig))
    if a >= N or b <= a:
        return
    sig = sig[: b - a] * gain
    L[a:b] += sig * np.cos(pan * np.pi / 2)
    R[a:b] += sig * np.sin(pan * np.pi / 2)


def lowpass(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X /= np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


def norm(x):
    return x / (np.abs(x).max() + 1e-9)


def tap(p=1.0):
    """a fingertip on wood: a damped low knock with a short woody overtone, the attack softened"""
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 180 * p * t) * np.exp(-t / 0.018) + 0.45 * np.sin(2 * np.pi * 410 * p * t) * np.exp(-t / 0.010)
    grain = lowpass(rng.standard_normal(n), 1800 * p) * np.exp(-t / 0.004) * 0.35
    s = (body + grain) * (1 - np.exp(-t / 0.0012))
    return norm(lowpass(s, 2600 * p))


def tick(p=1.0):
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    s = lowpass(rng.standard_normal(n), 1400 * p) * np.exp(-t / 0.003) + 0.4 * np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.008)
    return norm(s)


def lift(d=0.6):
    """a hush that rises and is gone: noise through a soft band that opens upward, shaped like an intake of air"""
    n = int(d * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    hop = 1024
    win = np.hanning(hop * 2)
    f = np.fft.rfftfreq(hop * 2, 1 / SR)
    for s in range(0, n - hop * 2, hop):
        c = 500 * (3.0 ** (s / n))
        F = np.fft.rfft(x[s:s + hop * 2] * win)
        F *= np.exp(-((np.log(f + 1) - np.log(c)) / 0.8) ** 2)
        out[s:s + hop * 2] += np.fft.irfft(F, hop * 2)
    env = np.sin(np.pi * np.linspace(0, 1, n) ** 0.7) ** 2
    return norm(out * env)


def rustle(d=0.9):
    """paper: soft crackle in grains, the sheet's air beneath it"""
    n = int(d * SR)
    air = lowpass(rng.standard_normal(n), 3000)
    crackle = rng.standard_normal(n) * np.convolve((rng.random(n) < 0.003).astype(float), np.exp(-np.arange(300) / 40), mode='same')
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.9
    return norm((0.5 * air + lowpass(crackle, 6500)) * env)


def breath(d=1.4):
    """an exhale: air through two soft vowel-like resonances, swelling and falling away"""
    n = int(d * SR)
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X *= np.exp(-((f - 700) / 380) ** 2) + 0.6 * np.exp(-((f - 1300) / 500) ** 2) + 0.15
    out = np.fft.irfft(X, n)
    env = (1 - np.exp(-np.linspace(0, 1, n) / 0.25)) * np.exp(-np.maximum(0, np.linspace(0, 1, n) - 0.35) / 0.3)
    return norm(lowpass(out, 2400) * env)


GAIN = {'tap': 0.5, 'tick': 0.12, 'lift': 0.3, 'rustle': 0.32, 'breath': 0.35}
MAKE = {'tap': lambda c: tap(c.get('p', 1)), 'tick': lambda c: tick(c.get('p', 1)), 'lift': lambda c: lift(c.get('d', 0.6)),
        'rustle': lambda c: rustle(c.get('d', 0.9)), 'breath': lambda c: breath(c.get('d', 1.4))}
for i, c in enumerate(CUES):
    k = c.get('k')
    if k not in MAKE:
        continue
    pan = 0.5 + 0.1 * np.sin(i * 1.9)
    put(MAKE[k](c), c['t'], pan, GAIN[k] * c.get('g', 1))

pk = max(np.abs(L).max(), np.abs(R).max(), 1e-9)
L, R = L / pk * 0.6, R / pk * 0.6
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.stack([L, R], 1) * 32767).astype('<i2').tobytes())
print('sfx: %d cues, %.1f s' % (len(CUES), DUR))

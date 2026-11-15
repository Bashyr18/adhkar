"""Sound for the film, made in code and cued by the picture: air and touch, never music.
The film publishes its cues (window.SFX, written by render.js to sfx.json), so every sound lands on the frame
that makes it:
  click   something lands or is pressed: a very short, soft tap, a little brighter or darker with p
  tick    a bead moving under the finger: smaller than a click
  fill    a soft rising air while a ring, a bar or a scan fills (filtered noise, no tone), d seconds long
  rustle  paper: a page turning, a sheet coming out
and a low swell of air under the end card.
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


def band(x, lo, hi):
    """noise kept between two frequencies, by FFT"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= np.exp(-((np.log(np.maximum(f, 1)) - np.log(np.sqrt(lo * hi))) / (0.5 * np.log(hi / lo) + 1e-9)) ** 2)
    return np.fft.irfft(X, len(x))


def click(p=1.0):
    """a soft tap: a breath of filtered noise with a quick body beneath it, like a fingertip on glass"""
    n = int(0.045 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 900 * p * t) * np.exp(-t / 0.006)
    air = band(rng.standard_normal(n), 2500 * p, 7000 * p) * np.exp(-t / 0.004)
    s = 0.6 * body + 0.8 * air / (np.abs(air).max() + 1e-9)
    return s / (np.abs(s).max() + 1e-9)


def tick(p=1.0):
    n = int(0.025 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 1900 * p * t) * np.exp(-t / 0.004) + 0.35 * np.sin(2 * np.pi * 3800 * p * t) * np.exp(-t / 0.002)
    return s / (np.abs(s).max() + 1e-9)


def fill(d=1.0):
    """air that rises as something fills: a band of noise sliding upward, swelling and settling"""
    n = int(d * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    hop = 1024
    win = np.hanning(hop * 2)
    f = np.fft.rfftfreq(hop * 2, 1 / SR)
    for s in range(0, n - hop * 2, hop):
        c = 600 * (6.0 ** (s / n))
        F = np.fft.rfft(x[s:s + hop * 2] * win)
        F *= np.exp(-((np.log(f + 1) - np.log(c)) / 0.45) ** 2)
        out[s:s + hop * 2] += np.fft.irfft(F, hop * 2)
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.4
    out = out * env
    return out / (np.abs(out).max() + 1e-9)


def rustle(d=0.8):
    """paper: crackle in short grains, brightest in the middle"""
    n = int(d * SR)
    x = band(rng.standard_normal(n), 1800, 9000)
    grains = (rng.random(n) < 0.004).astype(float)
    grains = np.convolve(grains, np.exp(-np.arange(400) / 60), mode='same')
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.8
    out = x * (0.35 + grains) * env
    return out / (np.abs(out).max() + 1e-9)


GAIN = {'click': 0.34, 'tick': 0.14, 'fill': 0.2, 'rustle': 0.26}
for i, c in enumerate(CUES):
    k = c.get('k')
    pan = 0.5 + 0.12 * np.sin(i * 1.7)
    if k == 'click':
        put(click(c.get('p', 1)), c['t'], pan, GAIN['click'])
    elif k == 'tick':
        put(tick(c.get('p', 1)), c['t'], 0.5, GAIN['tick'])
    elif k == 'fill':
        put(fill(c.get('d', 1)), c['t'], pan, GAIN['fill'] * c.get('g', 1))
    elif k == 'rustle':
        put(rustle(c.get('d', 0.8)), c['t'], pan, GAIN['rustle'])

# a low swell of air under the end card: felt rather than heard as a note
s0, sd = DUR - 3.4, 3.4
n = int(sd * SR)
tt = np.arange(n) / SR
env = (1 - np.exp(-tt / 0.5)) * np.exp(-np.maximum(0, tt - 1.2) / 1.4)
air = rng.standard_normal(n)
for _ in range(3):
    air = np.convolve(air, np.ones(90) / 90, mode='same')
put(air / (np.abs(air).max() + 1e-9) * env, s0, 0.5, 0.3)

pk = max(np.abs(L).max(), np.abs(R).max(), 1e-9)
L, R = L / pk * 0.6, R / pk * 0.6
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.stack([L, R], 1) * 32767).astype('<i2').tobytes())
print('sfx: %d cues, %.1f s' % (len(CUES), DUR))

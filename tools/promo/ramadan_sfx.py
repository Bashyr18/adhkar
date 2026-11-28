"""The Ramaḍān film's sound design, made in code and cued by the picture (window.SFX, written by render.js to sfx.json).
Engineered to sit under a vocal track: nothing below 35 Hz, nothing harsh above 9 kHz, short tails in a small room.
  whoosh   a cut: band-passed air whose centre sweeps up then down, panned along the motion (pan -1..1), d seconds
  swipe    a short, brighter whoosh: a card or notification sliding in
  riser    air that climbs and swells for d seconds, ending exactly on the cue after it (the drop)
  impact   a soft sub thump with a breath of air: a landing, the chorus, the logo
  pop      a glassy pluck (p sets the pitch): a cell filling, a time lighting up
  tick     a crisp UI tick
  ratchet  the compass detent: a small dry click with a woody body
  lock     settling into place: click, low knock, a bright partial
  shimmer  a scatter of high glints over d seconds: stars, light
Usage: python tools/promo/ramadan_sfx.py <out.wav> <seconds> <sfx.json>
"""
import json
import sys
import wave

import numpy as np

SR = 48000
DUR = float(sys.argv[2])
CUES = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else []
N = int(SR * DUR) + SR
OUT = np.zeros((2, N))
rng = np.random.default_rng(1448)


def env(n, a, r, curve=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-curve * np.maximum(0, t - a) / max(r, 1e-4))
    return e


def svf(x, fc, q=0.7):
    """state-variable band-pass with a per-sample centre frequency (array or scalar)"""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    lo = bp = 0.0
    y = np.empty_like(x)
    d = 1 / q
    for i in range(len(x)):
        hi = x[i] - lo - d * bp
        bp += f[i] * hi
        lo += f[i] * bp
        y[i] = bp
    return y


def lp(x, fc):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (fr / fc) ** 4), len(x))


def hp(x, fc):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (fc / np.maximum(fr, 1)) ** 4), len(x))


def norm(x):
    m = np.max(np.abs(x))
    return x / m if m else x


def put(sig, at, pan=0.0, gain=1.0):
    """sig mono, or (2, n); pan a number or a per-sample array"""
    a = int(at * SR)
    if a >= N:
        return
    if sig.ndim == 1:
        p = np.broadcast_to(np.asarray(pan, float), sig.shape)
        th = (p + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)
    if a < 0:
        sig = sig[:, -a:]
        a = 0
    b = min(N, a + sig.shape[1])
    OUT[:, a:b] += sig[:, : b - a] * gain


def whoosh(d=0.75, pan=0.0, bright=1.0):
    n = int(SR * d)
    u = np.linspace(0, 1, n)
    shape = np.where(u < 0.58, (u / 0.58) ** 2.2, np.exp(-5 * (u - 0.58) / 0.42))
    fc = (350 + 3200 * bright * np.sin(np.pi * np.clip(u / 0.9, 0, 1)) ** 1.5)
    air = svf(rng.standard_normal(n), fc, 1.1)
    body = lp(rng.standard_normal(n), 380) * 0.8
    s = norm(air + body) * shape
    p = np.clip(pan * (u * 2 - 1), -1, 1) if pan else 0.0
    return s, p


def riser(d=1.3):
    n = int(SR * d)
    u = np.linspace(0, 1, n)
    fc = 250 * (24 ** u)
    s = svf(rng.standard_normal(n), fc, 2.2)
    s = norm(s) * u ** 2.6
    s[-int(0.012 * SR):] *= np.linspace(1, 0, int(0.012 * SR))
    return s


def impact():
    n = int(SR * 1.2)
    t = np.arange(n) / SR
    f = 38 + 62 * np.exp(-t * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.2)
    click = lp(rng.standard_normal(n), 2400) * np.exp(-t * 90) * 0.5
    air = hp(lp(rng.standard_normal(n), 5000), 600) * np.exp(-t * 6) * 0.12
    return norm(hp(sub + click + air, 35))


def pop(p=1.0):
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    f0 = 980 * p
    f = f0 * (1 + 0.06 * np.exp(-t * 60))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26)
    s += 0.35 * np.sin(2 * np.pi * f0 * 2.76 * t) * np.exp(-t * 48)
    s += 0.12 * np.sin(2 * np.pi * f0 * 5.4 * t) * np.exp(-t * 80)
    s *= np.minimum(1, t / 0.0015)
    return norm(s)


def tick(p=1.0):
    n = int(SR * 0.05)
    t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 2500 * p) * np.exp(-t * 420)
    s += 0.5 * np.sin(2 * np.pi * 4200 * p * t) * np.exp(-t * 300)
    return norm(lp(s, 9000))


def ratchet():
    n = int(SR * 0.06)
    t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 1500) * np.exp(-t * 500)
    s += 0.7 * np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 160)
    return norm(s)


def lock():
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 1800) * np.exp(-t * 380) * 0.7
    s += np.sin(2 * np.pi * 150 * t) * np.exp(-t * 30)
    s += 0.45 * np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 22)
    s += 0.2 * np.sin(2 * np.pi * 1980 * t) * np.exp(-t * 30)
    return norm(s)


def shimmer(d=1.5):
    n = int(SR * (d + 0.4))
    s = np.zeros((2, n))
    k = int(10 * d)
    for i in range(k):
        at = int(rng.random() * d * SR)
        f = 3000 + rng.random() * 4500
        m = int(SR * 0.3)
        t = np.arange(m) / SR
        g = np.sin(2 * np.pi * f * t) * np.exp(-t * (14 + rng.random() * 14)) * np.minimum(1, t / 0.003)
        g *= (0.4 + 0.6 * rng.random()) * np.sin(np.pi * min(1, at / (d * SR)))
        pn = rng.random() * 1.6 - 0.8
        th = (pn + 1) * np.pi / 4
        b = min(n, at + m)
        s[0, at:b] += g[: b - at] * np.cos(th)
        s[1, at:b] += g[: b - at] * np.sin(th)
    return s / max(1e-9, np.max(np.abs(s)))


for c in CUES:
    k, at, g = c["k"], c["t"], c.get("g", 1.0)
    if k == "whoosh":
        s, p = whoosh(c.get("d", 0.75), c.get("pan", 0.0))
        put(s, at, p, 0.55 * g)
    elif k == "swipe":
        s, p = whoosh(0.32, 0.4, 1.6)
        put(s, at - 0.12, p, 0.32 * g)
    elif k == "riser":
        put(riser(c.get("d", 1.3)), at, 0.0, 0.42 * g)
    elif k == "impact":
        put(impact(), at, 0.0, 0.9 * g)
    elif k == "pop":
        put(pop(c.get("p", 1.0)), at, (rng.random() - 0.5) * 0.5, 0.26 * g)
    elif k == "tick":
        put(tick(c.get("p", 1.0)), at, (rng.random() - 0.5) * 0.4, 0.2 * g)
    elif k == "ratchet":
        put(ratchet(), at, 0.0, 0.16 * g)
    elif k == "lock":
        put(lock(), at, 0.0, 0.5 * g)
    elif k == "shimmer":
        put(shimmer(c.get("d", 1.5)), at, 0.0, 0.12 * g)

# a small room: a short decaying-noise reflection tail, mixed low, so the sounds sit in one space
ir_n = int(SR * 0.45)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 11)
ir = lp(ir, 6000)
ir /= np.sqrt(np.sum(ir**2))
for ch in range(2):
    wet = np.fft.irfft(np.fft.rfft(OUT[ch], N + ir_n) * np.fft.rfft(ir, N + ir_n), N + ir_n)[:N]
    OUT[ch] = OUT[ch] + 0.16 * wet
OUT = OUT[:, : int(SR * DUR)]
OUT = np.tanh(OUT * 1.2) / 1.2
pk = np.max(np.abs(OUT))
if pk > 0:
    OUT *= 0.89 / pk
data = (OUT.T * 32767).astype("<i2")
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print("sfx:", len(CUES), "cues")

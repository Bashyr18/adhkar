"""An autumn morning, made in code, for the promo: birds near and far over a soft breeze and turning leaves.
No instruments, no music.

Kept natural and subtle: a few birds, mostly some way off, calling now and then.
Four kinds of bird, each drawn from how such songs are built:
  - a warbler: quick phrases of short gliding notes, 2.4 to 5 kHz;
  - a whistler: two clear notes, the second a little lower ("fee-bee");
  - a sparrow: bursts of short falling chirps;
  - a distant trill: one note, pulsed fast, far off.
Each bird keeps its place in the trees, left or right, near (bright, clear) or far (soft, darker).
Under the takbīr (0.9 s to about 22.7 s) the birds keep back; the breeze is always there, quietly.

Usage: python tools/promo/birds.py <out.wav> <seconds>
"""
import sys
import wave
import numpy as np

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 120.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(1447)
L = np.zeros(N)
R = np.zeros(N)


def ramp(x, a, b):
    return np.clip((x - a) / max(b - a, 1e-9), 0, 1)


def ease(x):
    return x * x * (3 - 2 * x)


def env(n, att, rel):
    e = np.ones(n)
    a, r = max(1, int(att * SR)), max(1, int(rel * SR))
    e[:a] = np.linspace(0, 1, a) ** 1.5
    e[-r:] *= np.linspace(1, 0, r) ** 2
    return e


def tone(f_start, f_end, dur, curve=1.0, harm=0.12, am=0.0, am_rate=0.0):
    """one bird note: a pure whistle gliding from f_start to f_end, a little second harmonic, optional pulsing"""
    n = int(dur * SR)
    x = np.linspace(0, 1, n) ** curve
    f = f_start + (f_end - f_start) * x
    f = f * (1 + .006 * np.sin(2 * np.pi * np.random.uniform(28, 45) * np.arange(n) / SR + np.random.uniform(0, 6)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + harm * .5 * np.sin(2 * ph + .4)
    if am:
        s *= 1 - am * (0.5 + 0.5 * np.sin(2 * np.pi * am_rate * np.arange(n) / SR))
    return s * env(n, min(.022, dur * .35), min(.04, dur * .45))


def lowpass(x, k):
    if k <= 1:
        return x
    return np.convolve(x, np.ones(k) / k, mode='same')


def place(sig, at, pan, dist):
    """put a call at time `at`: pan 0..1, dist 0 (near) .. 1 (far)"""
    a = int(at * SR)
    if a >= N:
        return
    sig = lowpass(sig, int(1 + dist * 6)) * (1 - .75 * dist)
    b = min(N, a + len(sig))
    sig = sig[: b - a]
    pan = min(1, max(0, pan))
    L[a:b] += sig * np.cos(pan * np.pi / 2)
    R[a:b] += sig * np.sin(pan * np.pi / 2)


def warbler(r):
    parts, base = [], r.uniform(2600, 3600)
    for _ in range(r.integers(5, 10)):
        d = r.uniform(.05, .13)
        f1 = base * r.uniform(.85, 1.35)
        f2 = f1 * r.uniform(.75, 1.3)
        parts.append(tone(f1, f2, d, r.uniform(.6, 1.6), .1))
        parts.append(np.zeros(int(r.uniform(.015, .05) * SR)))
    return np.concatenate(parts)


def whistler(r):
    f = r.uniform(3300, 4100)
    a = tone(f, f * .99, r.uniform(.22, .32), 1, .05)
    gap = np.zeros(int(r.uniform(.06, .12) * SR))
    b = tone(f * .86, f * .84, r.uniform(.26, .36), 1, .05)
    return np.concatenate([a, gap, b]) * .8


def sparrow(r):
    parts = []
    for _ in range(r.integers(3, 7)):
        f = r.uniform(4500, 6200)
        parts.append(tone(f, f * r.uniform(.45, .6), r.uniform(.035, .06), .7, .2))
        parts.append(np.zeros(int(r.uniform(.05, .11) * SR)))
    return np.concatenate(parts) * .7


def trill(r):
    f = r.uniform(4200, 5200)
    return tone(f, f * .97, r.uniform(.8, 1.4), 1, .05, am=.95, am_rate=r.uniform(18, 26)) * .6


KINDS = [(warbler, .34), (whistler, .22), (sparrow, .28), (trill, .16)]
BIRDS = []
for i in range(6):
    kind = rng.choice(len(KINDS), p=[k[1] for k in KINDS])
    BIRDS.append({'k': KINDS[kind][0], 'pan': rng.uniform(.12, .88), 'dist': rng.uniform(.35, .95), 'rate': rng.uniform(.035, .08), 'seed': 100 + i})

for b in BIRDS:
    r = np.random.default_rng(b['seed'])
    at = r.uniform(0, 4)
    while at < DUR - 1:
        place(b['k'](r), at, b['pan'] + r.normal(0, .03), b['dist'])
        at += r.exponential(1 / b['rate']) + 2.5

# the breeze: soft air that comes and goes, and dry leaves turning in it
air = rng.standard_normal(N)
air = lowpass(air - lowpass(air, 40), 6)
knots = rng.uniform(-1, 1, int(DUR / 7) + 4)
gust = 0.45 + 0.55 * ease(np.clip(0.5 + 0.5 * np.interp(t, np.arange(len(knots)) * 7.0, knots), 0, 1))
leaves = np.zeros(N)
for _ in range(int(DUR * 9)):
    a = int(rng.uniform(0, DUR - .1) * SR)
    n = int(rng.uniform(.004, .02) * SR)
    leaves[a:a + n] += rng.standard_normal(n) * np.hanning(n) * rng.uniform(.2, 1)
leaves = leaves - lowpass(leaves, 8)
breeze_l = air * gust * .018 + leaves * gust * .010
breeze_r = np.roll(air, 1700) * gust * .018 + np.roll(leaves, 900) * gust * .010


def space(seconds, seed):
    n = int(SR * seconds)
    r = np.random.default_rng(seed)
    ir = r.standard_normal(n) * np.exp(-np.arange(n) / (SR * seconds / 5.0))
    ir = lowpass(ir, 10)
    ir[: int(.02 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum())


def conv(x, ir):
    m = len(x) + len(ir) - 1
    size = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]


L = L * .6 + conv(L, space(1.4, 7)) * .5
R = R * .6 + conv(R, space(1.4, 8)) * .5

birds_gain = 0.35 + 0.65 * ease(ramp(t, 21.5, 25))
L = L * birds_gain + breeze_l
R = R * birds_gain + breeze_r
fade = ease(ramp(t, 0, 2.5)) * (1 - ease(ramp(t, DUR - 4, DUR)))
L, R = L * fade, R * fade
pk = max(np.abs(L).max(), np.abs(R).max())
L, R = L / pk * .6, R / pk * .6
pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('birds: %.1f s written to %s (%d birds)' % (DUR, sys.argv[1], len(BIRDS)))

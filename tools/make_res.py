"""Generates vector drawables (launcher, notification, tile, shortcuts) and the notification chime.
Run: python tools/make_res.py"""
import math, os, struct, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'res')
DRW = os.path.join(RES, 'drawable'); RAW = os.path.join(RES, 'raw')
os.makedirs(DRW, exist_ok=True); os.makedirs(RAW, exist_ok=True)


def star(cx, cy, R, r, n=8, rot=-90):
    pts = []
    for i in range(2 * n):
        a = math.radians(rot + 180 / n * i); rr = R if i % 2 == 0 else r
        pts.append('%.2f,%.2f' % (cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return 'M' + 'L'.join(pts) + 'Z'


def ring_star(cx, cy, R, r, w):
    """outline star as a filled path with an inner star cut out (evenOdd)."""
    k = (R - w) / R
    return star(cx, cy, R, r) + star(cx, cy, R * k, r * k)


def write(name, body):
    open(os.path.join(DRW, name), 'w', encoding='utf-8').write(body)


GRAD = '''<aapt:attr name="android:fillColor"><gradient android:type="linear" android:startX="{x0}" android:startY="{y0}" android:endX="{x1}" android:endY="{y1}">
<item android:offset="0" android:color="#FFF6DFAA"/><item android:offset="0.55" android:color="#FFD9B26F"/><item android:offset="1" android:color="#FFA8782E"/></gradient></aapt:attr>'''

# adaptive launcher foreground (108dp canvas, art inside the 66dp safe zone)
fg = '''<vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt"
 android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
<path android:fillType="evenOdd" android:pathData="{outer}">{g1}</path>
<path android:fillType="evenOdd" android:pathData="{mid}">{g2}</path>
<path android:pathData="{core}">{g3}</path>
</vector>'''.format(outer=ring_star(54, 54, 31, 24.5, 2.6), mid=ring_star(54, 54, 21.5, 17, 1.6), core=star(54, 54, 10.5, 7.6),
                    g1=GRAD.format(x0=24, y0=24, x1=84, y1=84), g2=GRAD.format(x0=33, y0=33, x1=75, y1=75), g3=GRAD.format(x0=44, y0=44, x1=64, y1=64))
write('ic_launcher_fg.xml', fg)
bgv = '''<vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt"
 android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
<path android:pathData="M0,0h108v108h-108z"><aapt:attr name="android:fillColor"><gradient android:type="radial" android:centerX="54" android:centerY="40" android:gradientRadius="90">
<item android:offset="0" android:color="#FF1B2040"/><item android:offset="0.6" android:color="#FF0C0F1E"/><item android:offset="1" android:color="#FF07080D"/></gradient></aapt:attr></path>
<path android:fillColor="#0FF1D59E" android:fillType="evenOdd" android:pathData="{p}"/>
</vector>'''.format(p=ring_star(54, 54, 50, 40, .8))
write('ic_launcher_bg.xml', bgv)
mono = '''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
<path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="{o}"/><path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="{m}"/><path android:fillColor="#FFFFFFFF" android:pathData="{c}"/></vector>'''.format(
    o=ring_star(54, 54, 31, 24.5, 2.8), m=ring_star(54, 54, 21.5, 17, 1.8), c=star(54, 54, 10.5, 7.6))
write('ic_launcher_mono.xml', mono)

# notification + tile (24dp, white)
small = lambda: '''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
<path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="{o}"/><path android:fillColor="#FFFFFFFF" android:pathData="{c}"/></vector>'''.format(o=ring_star(12, 12, 11, 8.6, 1.7), c=star(12, 12, 4.6, 3.4))
write('ic_notif.xml', small())
beads = ''.join('M%.2f,%.2fm-1.55,0a1.55,1.55 0 1,0 3.1,0a1.55,1.55 0 1,0 -3.1,0' % (12 + 8 * math.cos(math.radians(-90 + i * 45)), 11 + 8 * math.sin(math.radians(-90 + i * 45))) for i in range(8) if i != 4)
DIAL = 'M12,3a9,9 0 1,0 9,9M12,3v2.2M18.4,5.6l-1.5,1.5M21,12h-2.2M12,7.5a4.5,4.5 0 1,0 4.5,4.5M12,12l4,-4'
write('ic_tile.xml', '''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
<path android:strokeColor="#FFFFFFFF" android:strokeWidth="1.9" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="#00000000" android:pathData="{d}"/></vector>'''.format(d=DIAL))

# shortcut icons: gold glyph on navy circle (48dp adaptive-safe)
def sc(name, glyph):
    write(name, '''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="48dp" android:height="48dp" android:viewportWidth="48" android:viewportHeight="48">
<path android:fillColor="#FF10131C" android:pathData="M24,0a24,24 0 1,0 0.01,0z"/>
<group android:translateX="12" android:translateY="12"><path android:strokeColor="#FFE8C88A" android:strokeWidth="1.8" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="#00000000" android:pathData="{g}"/></group></vector>'''.format(g=glyph))
sc('ic_sc_morning.xml', 'M3,18h18M6,14.5a6,6 0 0,1 12,0M12,3v5M9.2,5.8L12,3l2.8,2.8M4.5,11.5l1.4,0.8M19.5,11.5l-1.4,0.8')
sc('ic_sc_evening.xml', 'M3,18h18M6,14.5a6,6 0 0,1 12,0M12,8V3M9.2,5.2L12,8l2.8,-2.8M4.5,11.5l1.4,0.8M19.5,11.5l-1.4,0.8')
sc('ic_sc_tasbih.xml', DIAL)
sc('ic_sc_qibla.xml', 'M12,3a9,9 0 1,0 0.01,0zM15.5,8.5l-2,5 -5,2 2,-5z')
sc('ic_reset.xml', 'M4,12a8,8 0 1,0 2.4,-5.7M4,4v4.5h4.5')
sc('ic_open.xml', 'M9,5l7,7 -7,7')

# ---------- notification sound: two soft taps on wood (non-musical: filtered noise, no tones or bells) ----------
import random
SR = 44100
def lowpass(x, a):
    y, prev = [], 0.0
    for v in x:
        prev = prev + a * (v - prev); y.append(prev)
    return y
rnd = random.Random(7)
total = int(SR * 0.6); out = [0.0] * total
for start, tone in ((0.0, 0.08), (0.16, 0.065)):
    n = int(SR * 0.09); burst = [(rnd.random() * 2 - 1) * (1 - k / n) ** 4 for k in range(n)]
    body = lowpass(lowpass(burst, tone), tone)
    st = int(SR * start)
    for k, v in enumerate(body): out[st + k] += v
peak = max(abs(v) for v in out) or 1
frames = bytearray()
for v in out: frames += struct.pack('<h', int(v / peak * 0.7 * 32000))
old = os.path.join(RAW, 'chime.wav')
if os.path.exists(old): os.remove(old)
w = wave.open(os.path.join(RAW, 'tap.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(frames)); w.close()
print('ok')

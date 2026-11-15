"""The README's pictures, composed from the guide's own screenshots (docs/guide/shots, made by tools/guide-shots.js)
and from pictures of the guide (build/preview, made by tools/guide-preview.js).
    python -I tools/readme_images.py
Writes docs/screens/hero.webp, guide.webp, guide-install.webp and themes.webp."""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'docs', 'guide', 'shots')
PREV = os.path.join(ROOT, 'build', 'preview')
OUT = os.path.join(ROOT, 'docs', 'screens')
os.makedirs(OUT, exist_ok=True)
BG = (7, 8, 13)


def shot(name):
    return Image.open(os.path.join(SHOTS, name + '.webp')).convert('RGB')


def rounded(im, r):
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    o = im.convert('RGBA')
    o.putalpha(m)
    return o


def shadow(canvas, box, r, blur=40, alpha=170, dy=30):
    s = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(s).rounded_rectangle((x0, y0 + dy, x1, y1 + dy), r, fill=(0, 0, 0, alpha))
    canvas.alpha_composite(s.filter(ImageFilter.GaussianBlur(blur)))


def backdrop(w, h):
    """midnight with a gold glow from above, the app's own sky"""
    im = Image.new('RGBA', (w, h), BG + (255,))
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((w * .15, -h * .55, w * .85, h * .55), fill=(217, 178, 111, 70))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(h * .18)))
    low = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(low).ellipse((w * .55, h * .5, w * 1.2, h * 1.4), fill=(70, 60, 150, 60))
    im.alpha_composite(low.filter(ImageFilter.GaussianBlur(h * .16)))
    return im


def monitor(screen, width):
    """a thin-bezel display around a desktop screenshot"""
    s = screen.resize((width, int(width * screen.height / screen.width)), Image.LANCZOS)
    pad = max(10, width // 90)
    body = Image.new('RGBA', (s.width + pad * 2, s.height + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle((0, 0, body.width - 1, body.height - 1), pad * 2, fill=(30, 32, 40, 255), outline=(60, 63, 74, 255), width=2)
    body.alpha_composite(rounded(s, pad), (pad, pad))
    return body


def phone(screen, width):
    s = screen.resize((width, int(width * screen.height / screen.width)), Image.LANCZOS)
    pad = max(6, width // 34)
    body = Image.new('RGBA', (s.width + pad * 2, s.height + pad * 2), (0, 0, 0, 0))
    r = int(body.width * .14)
    ImageDraw.Draw(body).rounded_rectangle((0, 0, body.width - 1, body.height - 1), r, fill=(22, 24, 31, 255), outline=(66, 69, 82, 255), width=2)
    body.alpha_composite(rounded(s, r - pad), (pad, pad))
    return body


def browser(page, width):
    s = page.resize((width, int(width * page.height / page.width)), Image.LANCZOS)
    bar = 46
    body = Image.new('RGBA', (s.width, s.height + bar), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.rounded_rectangle((0, 0, body.width - 1, body.height - 1), 18, fill=(24, 26, 34, 255), outline=(60, 63, 74, 255), width=2)
    for i, c in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 84)]):
        d.ellipse((20 + i * 22, 17, 32 + i * 22, 29), fill=c)
    d.rounded_rectangle((width * .3, 11, width * .7, 35), 12, fill=(36, 39, 50, 255))
    body.alpha_composite(rounded(s, 4), (0, bar))
    m = Image.new('L', body.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, body.width - 1, body.height - 1), 18, fill=255)
    body.putalpha(Image.composite(body.getchannel('A'), Image.new('L', body.size, 0), m))
    return body


def save(im, name):
    im.convert('RGB').save(os.path.join(OUT, name), quality=86, method=6)
    print('docs/screens/' + name, im.size)


# the hero: the computer, the same day on the phone in front of it
W, H = 2400, 1300
c = backdrop(W, H)
m = monitor(shot('desk/today'), 1820)
mx, my = 120, 90
shadow(c, (mx, my, mx + m.width, my + m.height), 30, 60, 190)
c.alpha_composite(m, (mx, my))
p = phone(shot('dark/today'), 440)
px, py = W - p.width - 150, H - p.height - 40
shadow(c, (px, py, px + p.width, py + p.height), 60, 50, 220)
c.alpha_composite(p, (px, py))
save(c, 'hero.webp')

# day, night and Arabic
W, H = 2400, 1180
c = backdrop(W, H)
for i, n in enumerate(['light/today', 'dark/reader', 'ar/today', 'ramadan/today', 'friday/today']):
    p = phone(shot(n), 400)
    x = 90 + i * 450
    y = 90 + (40 if i % 2 else 0)
    shadow(c, (x, y, x + p.width, y + p.height), 50, 40, 200)
    c.alpha_composite(p, (x, y))
save(c, 'themes.webp')

# the guide, open in a browser
for src, name in [('cover', 'guide.webp'), ('install', 'guide-install.webp')]:
    f = os.path.join(PREV, src + '.png')
    if not os.path.exists(f):
        print('missing', f, '(run tools/guide-preview.js first)')
        continue
    W, H = 2400, 1460
    c = backdrop(W, H)
    b = browser(Image.open(f).convert('RGB'), 2160)
    shadow(c, (120, 90, 120 + b.width, 90 + b.height), 18, 50, 200)
    c.alpha_composite(b, (120, 90))
    save(c, name)

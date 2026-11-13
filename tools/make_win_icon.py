"""Draws windows/icon.png (512 px) from the same geometry as web/icon.svg: the midnight tile, the eight-pointed star
outlined in gold, and the inner star filled with the gold gradient. Run once after changing the icon:
    python -I tools/make_win_icon.py"""
import os
from PIL import Image, ImageDraw, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 1024
k = S / 64


def pts(path):
    out = []
    for a, b in path:
        out.append((a * k, b * k))
    return out


OUTER = [(32, 8), (38.1, 16.2), (48, 14.1), (45.9, 24), (54, 32), (45.9, 38.1), (48, 48), (38.1, 45.9), (32, 56), (25.9, 47.9),
         (16, 50), (18.1, 40.1), (10, 32), (18.1, 25.9), (16, 16), (25.9, 18.1)]
INNER = [(32, 21), (35, 25), (39.9, 24), (38.9, 28.9), (42.9, 32), (38.9, 35), (39.9, 39.9), (35, 38.9), (32, 42.9), (29, 38.9),
         (24.1, 39.9), (25.1, 35), (21.1, 32), (25.1, 28.9), (24.1, 24), (29, 25)]


def gradient():
    g = Image.new('RGBA', (S, S))
    a, b = (0xf6, 0xdf, 0xaa), (0xb8, 0x87, 0x3a)
    px = g.load()
    for y in range(S):
        for x in range(0, S, 1):
            t = (x + y) / (2 * S)
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)
    return g


img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=16 * k, fill=(0x0b, 0x0d, 0x16, 255))
g = gradient()
mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
md.line(pts(OUTER + OUTER[:1]), fill=255, width=int(2.2 * k), joint='curve')
md.polygon(pts(INNER), fill=255)
img = Image.composite(g, img, ImageChops.multiply(mask, Image.new('L', (S, S), 255)))
corner = Image.new('L', (S, S), 0)
ImageDraw.Draw(corner).rounded_rectangle([0, 0, S - 1, S - 1], radius=16 * k, fill=255)
img.putalpha(ImageChops.multiply(img.getchannel('A'), corner))
out = os.path.join(ROOT, 'windows', 'icon.png')
img.resize((512, 512), Image.LANCZOS).save(out)
print('windows/icon.png')

"""One-off: saves The Clear Quran (Dr. Mustafa Khattab, Quran.com resource 131) for the verses the app shows, verbatim,
into tools/src/quran-translation.json. Only footnote markers are removed. Used with the owner's permission; the app
is free for users."""
import json, os, re, sys, urllib.request

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src', 'quran-translation.json')
RANGES = [('1', '1-7'), ('7', '26'), ('24', '31'), ('33', '59'), ('2', '255'), ('2', '285-286'), ('3', '190-194'), ('3', '195-200'), ('112', '1-4'), ('113', '1-5'), ('114', '1-6')]
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'


def fetch(s, r):
    req = urllib.request.Request('https://quran.com/en/%s/%s?translations=131' % (s, r), headers={'User-Agent': UA})
    html = urllib.request.urlopen(req, timeout=40).read().decode('utf-8')
    data = json.loads(re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S).group(1))
    found = {}
    def walk(o):
        if isinstance(o, dict):
            if 'verseKey' in o and isinstance(o.get('translations'), list):
                for t in o['translations']:
                    if t.get('resourceId') == 131: found[o['verseKey']] = t['text']
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(data)
    return found


out = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
for s, r in RANGES:
    for k, t in fetch(s, r).items():
        t = re.sub(r'<sup[^>]*>.*?</sup>', '', t)
        t = re.sub(r'<[^>]+>', '', t).strip()
        out[k] = re.sub(r'\s+', ' ', t)
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'verses')

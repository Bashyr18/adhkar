"""One-off: saves the sunnah.com Ḥiṣn al-Muslim English (transliteration and translation, verbatim) for every Ḥiṣn
number the app references, into tools/src/hisn-en.json: {"79": {"tr": ..., "en": ..., "note": ...}}."""
import html, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'src', 'hisn-en.json')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
data = open(os.path.join(ROOT, '..', 'web', 'js', 'data.js'), encoding='utf-8').read()
nums = sorted(set(int(n) for n in re.findall(r'sunnah\.com/hisn:(\d+)', data)) | set([1, 2, 93] + list(range(250, 268))))
out = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}


def text(m):
    t = re.sub(r'<[^>]+>', '', m) if m else ''
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()


for n in nums:
    if str(n) in out: continue
    req = urllib.request.Request('https://sunnah.com/hisn:%d' % n, headers={'User-Agent': UA})
    h = urllib.request.urlopen(req, timeout=40).read().decode('utf-8')
    g = lambda cls: (re.search(r'<span class="' + cls + r'">(.*?)</span>', h, re.S) or [None, None])[1]
    out[str(n)] = {'tr': text(g('transliteration')), 'en': text(g('translation')), 'note': text(g('hisn_english_reference'))}
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'entries')

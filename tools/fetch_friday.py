"""One-off fetch for Friday and Sūrat al-Kahf, approved by the owner on 2026-11-13. Everything lands in tools/src (and the
mushaf page fonts in web/fonts/mushaf) exactly as served; the build scripts read it from there.

  - Sūrat al-Kahf: the Uthmani text, and every word with its Madani mushaf page, line and glyph code (api.quran.com v4)
  - The Clear Quran (Dr Mustafa Khattab) for 18:1-110, verbatim, as tools/fetch_clearquran.py does (used with permission)
  - The King Fahd Complex Madani mushaf page fonts (QCF v2) for pages 293-304, the pages of al-Kahf
  - Friday narrations from fawazahmed0/hadith-api: Abū Dāwūd 1047, al-Bukhārī 880, 881, 891 and 934

    python -I tools/fetch_friday.py"""
import json, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'src')
FONTS = os.path.join(ROOT, 'web', 'fonts', 'mushaf')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    for i in range(3):
        try:
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception as e:
            if i == 2:
                raise
            time.sleep(2)


def kahf():
    verses = []
    page = 1
    while True:
        u = ('https://api.quran.com/api/v4/verses/by_chapter/18?words=true&per_page=50&page=%d'
             '&fields=text_uthmani,page_number&word_fields=code_v2,page_number,line_number,text_uthmani,char_type_name' % page)
        d = json.loads(get(u))
        verses += d['verses']
        if not d['pagination'].get('next_page'):
            break
        page += 1
    out = {'chapter': 18, 'source': 'api.quran.com v4 (Uthmani, Madani mushaf layout, QCF v2 glyph codes)', 'verses': []}
    for v in verses:
        out['verses'].append({
            'key': v['verse_key'], 'n': v['verse_number'], 'page': v['page_number'], 'text': v['text_uthmani'],
            'words': [{'c': w['code_v2'], 'p': w['page_number'], 'l': w['line_number'], 't': w.get('text_uthmani') or '', 'k': w['char_type_name']} for w in v['words']]
        })
    assert len(out['verses']) == 110, len(out['verses'])
    json.dump(out, open(os.path.join(SRC, 'quran-18-mushaf.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    pages = sorted({w['p'] for v in out['verses'] for w in v['words']})
    print('al-Kahf: 110 verses on Madani pages', pages[0], 'to', pages[-1])
    return pages


def clear_quran():
    html = get('https://quran.com/en/18/1-110?translations=131').decode('utf-8')
    data = json.loads(re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S).group(1))
    found = {}

    def walk(o):
        if isinstance(o, dict):
            if 'verseKey' in o and isinstance(o.get('translations'), list):
                for t in o['translations']:
                    if t.get('resourceId') == 131:
                        found[o['verseKey']] = t['text']
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(data)
    # the page may hold only the first verses; fetch the rest in ranges
    for a in range(1, 111, 10):
        if all(('18:%d' % n) in found for n in range(a, min(a + 10, 111))):
            continue
        h = get('https://quran.com/en/18/%d-%d?translations=131' % (a, min(a + 9, 110))).decode('utf-8')
        walk(json.loads(re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', h, re.S).group(1)))
    # a range page renders only some of its verses: the rest one verse at a time
    for n in [n for n in range(1, 111) if ('18:%d' % n) not in found]:
        h = get('https://quran.com/en/18/%d?translations=131' % n).decode('utf-8')
        walk(json.loads(re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', h, re.S).group(1)))
        time.sleep(0.3)
    missing = [n for n in range(1, 111) if ('18:%d' % n) not in found]
    assert not missing, missing
    found = {k: v for k, v in found.items() if k.startswith('18:')}
    json.dump(found, open(os.path.join(SRC, 'quran-18-translation.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('The Clear Quran: 110 verses')


def fonts(pages):
    os.makedirs(FONTS, exist_ok=True)
    total = 0
    for p in pages:
        b = get('https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p%d.woff2' % p)
        assert b[:4] == b'wOF2', p
        open(os.path.join(FONTS, 'p%d.woff2' % p), 'wb').write(b)
        total += len(b)
    print('mushaf fonts:', len(pages), 'pages,', total // 1024, 'KB')


def hadith():
    d = os.path.join(SRC, 'hadith')
    for book, n in [('abudawud', 1047), ('bukhari', 880), ('bukhari', 881), ('bukhari', 891), ('bukhari', 934)]:
        for lang in ('ara', 'eng'):
            b = get('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/%s-%s/%d.json' % (lang, book, n))
            json.loads(b)
            open(os.path.join(d, '%s-%s-%d.json' % (lang, book, n)), 'wb').write(b)
    print('hadith: 5 narrations, Arabic and English')


if __name__ == '__main__':
    pages = kahf()
    clear_quran()
    fonts(pages)
    hadith()

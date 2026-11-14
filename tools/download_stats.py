"""Download counts for the guide: docs/guide/stats.json, kept by a daily GitHub Action (.github/workflows/stats.yml).

Where the numbers come from: GitHub's own count of each release file's downloads (the public releases API). Nothing
about who downloaded is known or kept: no analytics, no cookies, no third-party calls from the guide's visitors.

What it keeps:
- a ledger of every release file ever seen, by its GitHub id. Replacing a file in a release (an upload with --clobber)
  gives it a new id and starts its count again at zero; the old file's count stays in the ledger, so totals never fall.
- one snapshot a day (date, total, Android, Windows), for the trend and the week-on-week change.
- per version, Android and Windows, for how quickly people move to a new release.

These are downloads, not installs or people: an update is a download, and some downloads are by machines.

Run: GITHUB_TOKEN=... python tools/download_stats.py   (the token only raises the API's rate limit; it is optional)
"""
import datetime
import io
import json
import os
import re
import sys
import urllib.request

REPO = os.environ.get('STATS_REPO', 'Bashyr18/adhkar')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'guide', 'stats.json')
KEEP_DAYS = 400


def platform(name):
    n = name.lower()
    if n.endswith('.apk'):
        return 'android'
    if n.endswith('.exe'):
        return 'windows'
    return None  # checksums, bundles and anything else are not downloads of the app


def releases():
    out, page = [], 1
    while True:
        req = urllib.request.Request('https://api.github.com/repos/%s/releases?per_page=100&page=%d' % (REPO, page),
                                     headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'adhkar-stats'})
        tok = os.environ.get('GITHUB_TOKEN')
        if tok:
            req.add_header('Authorization', 'Bearer ' + tok)
        with urllib.request.urlopen(req, timeout=30) as r:
            got = json.load(r)
        out += got
        if len(got) < 100:
            return out
        page += 1


def version(tag):
    m = re.match(r'v?(\d+(?:\.\d+)*)', tag or '')
    return m.group(1) if m else (tag or '?')


def main():
    old = {}
    if os.path.exists(OUT):
        with io.open(OUT, encoding='utf-8') as f:
            old = json.load(f)
    ledger = old.get('ledger', {})
    for rel in releases():
        if rel.get('draft'):
            continue
        for a in rel.get('assets', []):
            p = platform(a['name'])
            if not p:
                continue
            key = str(a['id'])
            prev = ledger.get(key, {}).get('count', 0)
            ledger[key] = {'v': version(rel.get('tag_name')), 'name': a['name'], 'p': p,
                           'count': max(prev, int(a.get('download_count', 0)))}
    totals = {'android': 0, 'windows': 0}
    versions = {}
    for e in ledger.values():
        totals[e['p']] += e['count']
        v = versions.setdefault(e['v'], {'android': 0, 'windows': 0})
        v[e['p']] += e['count']
    total = totals['android'] + totals['windows']
    today = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
    days = [d for d in old.get('days', []) if d[0] != today]
    days.append([today, total, totals['android'], totals['windows']])
    days = sorted(days)[-KEEP_DAYS:]
    order = sorted(versions, key=lambda s: [int(x) if x.isdigit() else 0 for x in s.split('.')], reverse=True)
    data = {
        'note': 'Downloads of the release files, counted by GitHub. Not installs or people. Kept by tools/download_stats.py.',
        'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
        'since': days[0][0],
        'total': total,
        'android': totals['android'],
        'windows': totals['windows'],
        'latest': order[0] if order else None,
        'versions': [[v, versions[v]['android'], versions[v]['windows']] for v in order],
        'days': days,
        'ledger': ledger,
    }
    with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print('downloads: %d (Android %d, Windows %d) across %d versions; %d days kept' %
          (total, totals['android'], totals['windows'], len(order), len(days)))


if __name__ == '__main__':
    sys.exit(main())

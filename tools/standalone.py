"""The app as one HTML file, for testers in a browser: the release bundle with its fonts, images and icon embedded.
Recitations stream from hisnmuslim.com and everyayah.com (the app downloads them instead); phone-only features
(reminders, widgets, silencing, the floating dhikr) are simply absent in a browser.
Usage: python tools/standalone.py <bundle dir> <out.html>"""
import base64, os, re, sys, json

SRC, OUT = sys.argv[1], sys.argv[2]
def read(p): return open(os.path.join(SRC, p), encoding='utf-8').read()
def b64(p): return base64.b64encode(open(os.path.join(SRC, p), 'rb').read()).decode('ascii')

html, js, css = read('index.html'), read('app.js'), read('app.css')
# fonts inside the stylesheet
css = re.sub(r'url\((fonts/[^)]+\.woff2)\)', lambda m: 'url(data:font/woff2;base64,%s)' % b64(m.group(1)), css)
# every shipped image, by the path the app asks for (A.asset)
assets = {}
for root, _, files in os.walk(os.path.join(SRC, 'img')):
    for f in files:
        full = os.path.join(root, f); rel = os.path.relpath(full, SRC).replace(os.sep, '/')
        assets[rel] = 'data:image/%s;base64,%s' % (f.rsplit('.', 1)[1], b64(rel))
icon = 'data:image/svg+xml;base64,' + b64('icon.svg')

csp = ("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; "
       "media-src https://www.hisnmuslim.com https://everyayah.com; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'")
html = re.sub(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">', '<meta http-equiv="Content-Security-Policy" content="%s">' % csp, html)
html = re.sub(r'<link rel="preload"[^>]*>\n?', '', html)
html = html.replace('<link rel="icon" href="icon.svg" type="image/svg+xml">', '<link rel="icon" href="%s" type="image/svg+xml">' % icon)
html = html.replace('<link rel="stylesheet" href="app.css">', '<style>\n' + css + '\n</style>')
boot = '<script>window.ADHKAR_WEB_AUDIO=true;window.ASSETS=' + json.dumps(assets) + ';</script>\n'
html = html.replace('<script src="app.js"></script>', boot + '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>')
assert 'src="app.js"' not in html and 'href="app.css"' not in html
open(OUT, 'w', encoding='utf-8').write(html)
print('standalone: %s, %d KB' % (OUT, len(html.encode('utf-8')) // 1024))

# the same page as a hosted Artifact: the host supplies the document skeleton and its own security policy, and blocks
# media from other sites, so the recitation player stays out rather than failing
if len(sys.argv) > 3:
    art = html.replace('window.ADHKAR_WEB_AUDIO=true;', 'window.ADHKAR_WEB_AUDIO=false;')
    art = re.sub(r'<!doctype html>\s*', '', art, flags=re.I)
    art = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?', '', art)
    art = re.sub(r'<meta charset="utf-8">\n?|<meta name="viewport"[^>]*>\n?', '', art)
    art = re.sub(r'</?html[^>]*>\n?|</?head>\n?|</?body[^>]*>\n?', '', art)
    m = re.search(r'<title>[^<]*</title>\n?', art); art = m.group(0) + art.replace(m.group(0), '', 1)
    open(sys.argv[3], 'w', encoding='utf-8').write(art)
    print('artifact page: %s, %d KB' % (sys.argv[3], len(art.encode('utf-8')) // 1024))

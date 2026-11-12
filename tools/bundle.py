"""Release web bundle: one minified script and one minified stylesheet, fonts preloaded.
Usage: python tools/bundle.py <web dir> <out dir>
The dev page (web/index.html) keeps its separate files; only the APK ships the bundle."""
import os, re, sys, shutil, subprocess

WEB, OUT = sys.argv[1], sys.argv[2]
VERSION = sys.argv[3] if len(sys.argv) > 3 else 'dev'
ROOT = os.path.dirname(os.path.abspath(__file__))
ESB = os.path.join(ROOT, '.node', 'node_modules', '.bin', 'esbuild' + ('.cmd' if os.name == 'nt' else ''))
PRELOAD = ['fonts/Quicksand-400-700-latin.woff2', 'fonts/Amiri-400-arabic.woff2']

html = open(os.path.join(WEB, 'index.html'), encoding='utf-8').read()
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
styles = re.findall(r'<link rel="stylesheet" href="([^"]+)">', html)


def esbuild(src, loader):
    r = subprocess.run([ESB, '--loader=' + loader, '--minify', '--target=es2017', '--charset=utf8', '--legal-comments=none'],
                       input=src.encode('utf-8'), capture_output=True)
    if r.returncode:
        sys.exit(r.stderr.decode('utf-8', 'replace'))
    return r.stdout.decode('utf-8')


def read(p):
    return open(os.path.join(WEB, p), encoding='utf-8').read()


# each file is its own IIFE or global assignment, so plain concatenation keeps document order and behaviour
js = "window.APP_VERSION='%s';" % VERSION + esbuild(';\n'.join(read(p) for p in scripts), 'js')
css = esbuild('\n'.join(read(p) for p in styles), 'css')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'app.js'), 'w', encoding='utf-8').write(js)
open(os.path.join(OUT, 'app.css'), 'w', encoding='utf-8').write(css)
shutil.copytree(os.path.join(WEB, 'fonts'), os.path.join(OUT, 'fonts'), dirs_exist_ok=True)
shutil.copy(os.path.join(WEB, 'icon.svg'), OUT)
shutil.copytree(os.path.join(WEB, 'img'), os.path.join(OUT, 'img'), dirs_exist_ok=True)   # Ṣalāh guide postures
if os.path.isdir(os.path.join(WEB, 'audio')):   # your own recordings for adhkār without a verified one
    shutil.copytree(os.path.join(WEB, 'audio'), os.path.join(OUT, 'audio'), dirs_exist_ok=True)

head = ''.join('<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>\n' % f for f in PRELOAD)
html = re.sub(r'(<link rel="stylesheet" href="[^"]+">\n)+', head + '<link rel="stylesheet" href="app.css">\n', html)
html = re.sub(r'(<script src="[^"]+"></script>\n)+', '<script src="app.js"></script>\n', html)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
before = sum(os.path.getsize(os.path.join(WEB, p)) for p in scripts + styles)
print('bundle: %d files, %d KB -> %d KB' % (len(scripts) + len(styles), before // 1024, (len(js.encode()) + len(css.encode())) // 1024))

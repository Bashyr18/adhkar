"""Rebuild the APK zip: aapt2 output + assets (forward-slash names) + classes.dex.
aapt2 on Windows writes asset entries with backslashes, which Android cannot open."""
import os, sys, zipfile
base, assets, dex, out = sys.argv[1:5]
STORE = ('.woff2', '.png', '.arsc', '.wav', '.ogg')
with zipfile.ZipFile(base) as src, zipfile.ZipFile(out, 'w') as z:
    for i in src.infolist():
        n = i.filename.replace(chr(92), '/')
        if n.startswith('assets/'):
            continue
        z.writestr(zipfile.ZipInfo(n, date_time=(2026, 1, 1, 0, 0, 0)), src.read(i),
                   compress_type=zipfile.ZIP_STORED if n.endswith(STORE) or i.compress_type == 0 else zipfile.ZIP_DEFLATED)
    for root, _, files in os.walk(assets):
        for f in sorted(files):
            p = os.path.join(root, f)
            n = 'assets/' + os.path.relpath(p, assets).replace(os.sep, '/')
            with open(p, 'rb') as fh:
                z.writestr(zipfile.ZipInfo(n, date_time=(2026, 1, 1, 0, 0, 0)), fh.read(),
                           compress_type=zipfile.ZIP_STORED if f.endswith(STORE) else zipfile.ZIP_DEFLATED)
    with open(dex, 'rb') as fh:
        z.writestr(zipfile.ZipInfo('classes.dex', date_time=(2026, 1, 1, 0, 0, 0)), fh.read(), compress_type=zipfile.ZIP_DEFLATED)

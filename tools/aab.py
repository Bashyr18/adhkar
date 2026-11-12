"""Assembles the Play Store module (base.zip) for bundletool from the proto-format link output.
Usage: python tools/aab.py <proto.apk> <assets dir> <classes.dex> <out base.zip>
Layout bundletool expects: manifest/AndroidManifest.xml, resources.pb, res/..., assets/..., dex/classes.dex.
Paths are written with forward slashes (aapt2 on Windows would use backslashes)."""
import os, sys, zipfile

proto, assets, dex, out = sys.argv[1:5]
with zipfile.ZipFile(proto) as src, zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for i in src.infolist():
        name = i.filename.replace('\\', '/')
        data = src.read(i)
        if name == 'AndroidManifest.xml': z.writestr('manifest/AndroidManifest.xml', data)
        elif name == 'resources.pb' or name.startswith('res/'): z.writestr(name, data)
    for root, _, files in os.walk(assets):
        for f in files:
            p = os.path.join(root, f)
            z.write(p, 'assets/' + os.path.relpath(p, assets).replace('\\', '/'))
    z.write(dex, 'dex/classes.dex')
print('module:', out)

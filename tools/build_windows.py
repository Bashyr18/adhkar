"""Builds Adhkār for Windows: dist/Adhkar-Windows.exe (the app) and dist/Adhkar-Setup.exe (the installer people
download, carrying the app), from the Rust workspace in windows/ (app, setup, common).

    python -I tools/build_windows.py

Needs: Windows 10 or 11, Python 3.8+ with Pillow (the icon), the Node tools (tools/.node, for the web bundle), and Rust
(rustup, the stable MSVC toolchain, with the Visual Studio Build Tools' C++ linker). The crates are pinned by
windows/Cargo.lock. WebView2 itself is part of Windows; the app carries everything else in one file."""
import os, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIN = os.path.join(ROOT, 'windows')
OUT = os.path.join(ROOT, 'build', 'windows')
WWW = os.path.join(OUT, 'www')


def version():
    name, code = [l.strip() for l in open(os.path.join(ROOT, 'VERSION'), encoding='utf8').read().split('\n')[:2]]
    parts = (name.split('.') + ['0', '0'])[:3]
    return '.'.join(parts) + '.' + code, name


def main():
    if os.name != 'nt':
        sys.exit('The Windows app is built on Windows.')
    full, name = version()
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    r = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'bundle.py'), os.path.join(ROOT, 'web'), WWW, name])
    if r.returncode:
        sys.exit(r.returncode)
    # the takbīr of the adhān, which the phone keeps among its own resources
    os.makedirs(os.path.join(WWW, 'audio'), exist_ok=True)
    shutil.copy(os.path.join(ROOT, 'android', 'res', 'raw', 'adhan_takbir.ogg'), os.path.join(WWW, 'audio', 'adhan_takbir.ogg'))

    # the app, zipped: what is already compressed is stored as it is
    app = os.path.join(OUT, 'app.zip')
    with zipfile.ZipFile(app, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for base, _, files in os.walk(WWW):
            for f in sorted(files):
                full_path = os.path.join(base, f); rel = os.path.relpath(full_path, WWW).replace('\\', '/')
                stored = f.lower().endswith(('.ogg', '.mp3', '.webp', '.png', '.jpg', '.woff2', '.wav'))
                z.write(full_path, rel, compress_type=zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED)

    ico = os.path.join(OUT, 'adhkar.ico')
    from PIL import Image
    im = Image.open(os.path.join(WIN, 'icon.png')).convert('RGBA')
    im.save(ico, sizes=[(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)])

    cargo = shutil.which('cargo') or os.path.join(os.path.expanduser('~'), '.cargo', 'bin', 'cargo.exe')
    target = os.path.join(WIN, 'target', 'release')
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)

    def build(package, env):
        e = dict(os.environ, ADHKAR_ICON=ico, **env)
        r = subprocess.run([cargo, 'build', '--release', '--locked', '-p', package], cwd=WIN, env=e)
        if r.returncode:
            sys.exit(r.returncode)

    exe = os.environ.get('WIN_OUT') or os.path.join(ROOT, 'dist', 'Adhkar-Windows.exe')
    build('adhkar', {'ADHKAR_APP_ZIP': app})
    shutil.copyfile(os.path.join(target, 'Adhkar.exe'), exe)
    print(os.path.relpath(exe, ROOT).replace(os.sep, '/'), name, '(%s)' % full, round(os.path.getsize(exe) / 1048576, 1), 'MB')

    # the installer: the app inside it, installed per user like any Windows program
    setup = os.environ.get('SETUP_OUT') or os.path.join(os.path.dirname(exe), 'Adhkar-Setup.exe')
    build('adhkar-setup', {'ADHKAR_PAYLOAD': exe})
    shutil.copyfile(os.path.join(target, 'Adhkar-Setup.exe'), setup)
    print(os.path.relpath(setup, ROOT).replace(os.sep, '/'), name, round(os.path.getsize(setup) / 1048576, 1), 'MB')


if __name__ == '__main__':
    main()

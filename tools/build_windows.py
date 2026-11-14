"""Builds dist/Adhkar-Windows.exe, the Windows app, with the C# compiler that ships with Windows (no Visual Studio,
no .NET SDK).

    python -I tools/build_windows.py

Needs: Windows 10 or 11 (.NET Framework 4.8, present on every copy), Python 3.8+, Pillow for the icon, the Node tools
(tools/.node, for the web bundle) and the WebView2 SDK in tools/.bin/webview2 (fetched once from nuget.org, see
WEBVIEW2 below). The .exe carries everything: the app, the WebView2 libraries and the icon. It runs from anywhere and
can install itself, per user, without administrator rights."""
import io, os, shutil, subprocess, sys, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIN = os.path.join(ROOT, 'windows')
OUT = os.path.join(ROOT, 'build', 'windows')
WWW = os.path.join(OUT, 'www')
WEBVIEW2 = '1.0.2903.40'
PKG = os.path.join(ROOT, 'tools', '.bin', 'webview2', 'pkg')


def fetch_webview2():
    if os.path.exists(os.path.join(PKG, 'lib', 'net462', 'Microsoft.Web.WebView2.Core.dll')):
        return
    url = 'https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/' + WEBVIEW2
    print('fetching WebView2 SDK', WEBVIEW2, 'from nuget.org')
    data = urllib.request.urlopen(url, timeout=120).read()
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        z.extractall(PKG)


def version():
    name, code = [l.strip() for l in open(os.path.join(ROOT, 'VERSION'), encoding='utf8').read().split('\n')[:2]]
    parts = (name.split('.') + ['0', '0'])[:3]
    return '.'.join(parts) + '.' + code, name


def main():
    if os.name != 'nt':
        sys.exit('The Windows app is built on Windows (it uses the C# compiler that ships with .NET Framework).')
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
    fetch_webview2()

    app = os.path.join(OUT, 'app.zip')
    with zipfile.ZipFile(app, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for base, _, files in os.walk(WWW):
            for f in sorted(files):
                full_path = os.path.join(base, f); rel = os.path.relpath(full_path, WWW).replace('\\', '/')
                stored = f.lower().endswith(('.ogg', '.mp3', '.webp', '.png', '.jpg', '.woff2', '.wav'))
                z.write(full_path, rel, compress_type=zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED)

    info = os.path.join(OUT, 'AssemblyInfo.cs')
    with open(info, 'w', encoding='utf8') as f:
        f.write('using System.Reflection;\n'
                '[assembly: AssemblyTitle("Adhkar")]\n[assembly: AssemblyProduct("Adhkar")]\n'
                '[assembly: AssemblyDescription("Remembrance for every moment")]\n'
                '[assembly: AssemblyCompany("Adhkar, open source")]\n[assembly: AssemblyCopyright("GPL-3.0")]\n'
                '[assembly: AssemblyVersion("%s")]\n[assembly: AssemblyFileVersion("%s")]\n[assembly: AssemblyInformationalVersion("%s")]\n' % (full, full, name))

    ico = os.path.join(OUT, 'adhkar.ico')
    from PIL import Image
    im = Image.open(os.path.join(WIN, 'icon.png')).convert('RGBA')
    im.save(ico, sizes=[(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)])

    fw = os.path.join(os.environ['WINDIR'], 'Microsoft.NET', 'Framework64', 'v4.0.30319')
    csc = os.path.join(fw, 'csc.exe')
    lib = os.path.join(PKG, 'lib', 'net462')
    exe = os.environ.get('WIN_OUT') or os.path.join(ROOT, 'dist', 'Adhkar-Windows.exe'); os.makedirs(os.path.dirname(exe), exist_ok=True)
    args = [csc, '/nologo', '/optimize+', '/target:winexe', '/platform:x64', '/langversion:5', '/codepage:65001', '/utf8output',
            '/out:' + exe, '/win32icon:' + ico,
            '/resource:' + app + ',app.zip',
            '/resource:' + os.path.join(WIN, 'shim.js') + ',shim.js',
            '/resource:' + os.path.join(lib, 'Microsoft.Web.WebView2.Core.dll') + ',Microsoft.Web.WebView2.Core.dll',
            '/resource:' + os.path.join(lib, 'Microsoft.Web.WebView2.WinForms.dll') + ',Microsoft.Web.WebView2.WinForms.dll',
            '/resource:' + os.path.join(PKG, 'runtimes', 'win-x64', 'native', 'WebView2Loader.dll') + ',WebView2Loader.dll',
            '/r:' + os.path.join(lib, 'Microsoft.Web.WebView2.Core.dll'), '/r:' + os.path.join(lib, 'Microsoft.Web.WebView2.WinForms.dll')]
    for ref in ('System.dll', 'System.Core.dll', 'System.Drawing.dll', 'System.Windows.Forms.dll', 'System.IO.Compression.dll',
                'System.IO.Compression.FileSystem.dll', 'System.Web.Extensions.dll', 'Microsoft.CSharp.dll', 'System.Device.dll'):
        args.append('/r:' + os.path.join(fw, ref))
    args.append(info)
    args += [os.path.join(WIN, 'src', f) for f in sorted(os.listdir(os.path.join(WIN, 'src'))) if f.endswith('.cs')]
    r = subprocess.run(args, capture_output=True, text=True, encoding='utf8', errors='replace')
    out = (r.stdout + r.stderr).strip()
    if out:
        print(out[-6000:])
    if r.returncode:
        sys.exit(r.returncode)
    print('dist/Adhkar-Windows.exe', name, '(%s)' % full, round(os.path.getsize(exe) / 1048576, 1), 'MB')


if __name__ == '__main__':
    main()

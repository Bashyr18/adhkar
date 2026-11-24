"""Builds Adhkār for iOS: stages the bundled web app, generates the 1024x1024 opaque iOS app icon and
Core Audio notification sounds (.caf), generates ios/Adhkar.xcodeproj with XcodeGen, optionally runs the
Swift unit tests on an iOS Simulator, and builds dist/Adhkar-iOS-unsigned.ipa.

Usage:
    python -I tools/build_ios.py --stage-only   # any OS: stage web bundle, icon and notification sounds
    python -I tools/build_ios.py --test         # macOS: stage, generate project, run AdhkarTests on Simulator
    python -I tools/build_ios.py                # macOS: stage, generate project, build Simulator + unsigned IPA

Needs: Python 3.8+, Pillow (for the icon), Node tools (tools/.node, for bundle.py), ffmpeg (to convert
adhan_takbir.ogg), and on macOS: Xcode + XcodeGen (`brew install xcodegen`)."""
import argparse
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IOS_DIR = os.path.join(ROOT, 'ios')
OUT = os.path.join(ROOT, 'build', 'ios')
WWW = os.path.join(OUT, 'www')
RES = os.path.join(OUT, 'resources')
DIST = os.path.join(ROOT, 'dist')
ICON_OUT = os.path.join(IOS_DIR, 'Adhkar', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon.png')


def read_version():
    lines = [l.strip() for l in open(os.path.join(ROOT, 'VERSION'), encoding='utf-8').read().splitlines() if l.strip()]
    return lines[0], lines[1]


def generate_ios_icon():
    """Draws the 1024x1024 opaque RGB iOS AppIcon from the exact geometry of web/icon.svg / make_win_icon.py."""
    from PIL import Image, ImageChops, ImageDraw

    S = 1024
    k = S / 64.0
    pts = lambda path: [(a * k, b * k) for a, b in path]

    OUTER = [
        (32, 8), (38.1, 16.2), (48, 14.1), (45.9, 24), (54, 32), (45.9, 38.1), (48, 48), (38.1, 45.9),
        (32, 56), (25.9, 47.9), (16, 50), (18.1, 40.1), (10, 32), (18.1, 25.9), (16, 16), (25.9, 18.1)
    ]
    INNER = [
        (32, 21), (35, 25), (39.9, 24), (38.9, 28.9), (42.9, 32), (38.9, 35), (39.9, 39.9), (35, 38.9),
        (32, 42.9), (29, 38.9), (24.1, 39.9), (25.1, 35), (21.1, 32), (25.1, 28.9), (24.1, 24), (29, 25)
    ]

    # iOS applies its own squircle mask and rejects alpha channels in App Store icons: solid midnight background
    img = Image.new('RGB', (S, S), (0x0B, 0x0D, 0x16))
    grad = Image.new('RGB', (S, S))
    a, b = (0xF6, 0xDF, 0xAA), (0xB8, 0x87, 0x3A)
    px = grad.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2.0 * S)
            px[x, y] = (
                int(a[0] + (b[0] - a[0]) * t),
                int(a[1] + (b[1] - a[1]) * t),
                int(a[2] + (b[2] - a[2]) * t),
            )
    mask = Image.new('L', (S, S), 0)
    md = ImageDraw.Draw(mask)
    md.line(pts(OUTER + OUTER[:1]), fill=255, width=int(2.2 * k), joint='curve')
    md.polygon(pts(INNER), fill=255)
    img = Image.composite(grad, img, mask)

    os.makedirs(os.path.dirname(ICON_OUT), exist_ok=True)
    img.save(ICON_OUT, format='PNG', optimize=True)
    print('ios icon:', os.path.relpath(ICON_OUT, ROOT).replace('\\', '/'))


def convert_sounds():
    """Converts Android raw sounds (adhan_takbir.ogg, tap.wav) to iOS UNNotificationSound-compatible .caf files."""
    os.makedirs(RES, exist_ok=True)
    raw_dir = os.path.join(ROOT, 'android', 'res', 'raw')
    adhan_src = os.path.join(raw_dir, 'adhan_takbir.ogg')
    tap_src = os.path.join(raw_dir, 'tap.wav')
    adhan_caf = os.path.join(RES, 'adhan_takbir.caf')
    tap_caf = os.path.join(RES, 'tap.caf')

    ffmpeg = shutil.which('ffmpeg')
    afconvert = shutil.which('afconvert')
    if not ffmpeg:
        sys.exit('ffmpeg is required to convert adhan_takbir.ogg for iOS.')

    with tempfile.TemporaryDirectory() as tmp:
        adhan_wav = os.path.join(tmp, 'adhan_takbir.wav')
        subprocess.run(
            [ffmpeg, '-y', '-loglevel', 'error', '-i', adhan_src, '-ar', '22050', '-ac', '1', '-c:a', 'pcm_s16le', adhan_wav],
            check=True,
        )
        if afconvert:
            # IMA4 ADPCM in CAF: compact (~240 KB) and natively supported by UNNotificationSound & AVAudioPlayer
            subprocess.run([afconvert, '-f', 'caff', '-d', 'ima4', adhan_wav, adhan_caf], check=True)
            subprocess.run([afconvert, '-f', 'caff', '-d', 'LEI16@44100', '-c', '1', tap_src, tap_caf], check=True)
        else:
            subprocess.run(
                [ffmpeg, '-y', '-loglevel', 'error', '-i', adhan_wav, '-c:a', 'pcm_s16le', '-f', 'caf', adhan_caf],
                check=True,
            )
            subprocess.run(
                [ffmpeg, '-y', '-loglevel', 'error', '-i', tap_src, '-c:a', 'pcm_s16le', '-f', 'caf', tap_caf],
                check=True,
            )
    print('ios sounds:', os.path.getsize(adhan_caf) // 1024, 'KB adhan_takbir.caf,', os.path.getsize(tap_caf) // 1024, 'KB tap.caf')


def stage(vname):
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)
    r = subprocess.run(
        [sys.executable, '-I', os.path.join(ROOT, 'tools', 'bundle.py'), os.path.join(ROOT, 'web'), WWW, vname]
    )
    if r.returncode:
        sys.exit(r.returncode)
    generate_ios_icon()
    convert_sounds()


def pick_simulator_destination():
    r = subprocess.run(['xcrun', 'simctl', 'list', 'devices', 'available', '-j'], capture_output=True, text=True, check=True)
    data = json.loads(r.stdout)
    candidates = []
    for runtime, devices in data.get('devices', {}).items():
        if 'iOS' not in runtime:
            continue
        for dev in devices:
            if dev.get('isAvailable') and 'iPhone' in dev.get('name', ''):
                candidates.append((runtime, dev['udid'], dev['name']))
    if not candidates:
        return 'generic/platform=iOS Simulator'
    # Prefer newest iOS runtime
    candidates.sort(key=lambda x: x[0], reverse=True)
    _, udid, name = candidates[0]
    print('simulator:', name, f'({udid})')
    return f'platform=iOS Simulator,id={udid}'


def generate_xcode_project():
    xcodegen = shutil.which('xcodegen')
    if not xcodegen:
        sys.exit('xcodegen is required on macOS (install with `brew install xcodegen`).')
    subprocess.run([xcodegen, 'generate', '--spec', os.path.join(IOS_DIR, 'project.yml')], cwd=IOS_DIR, check=True)


def run_tests(vname, vcode):
    dest = pick_simulator_destination()
    derived = os.path.join(OUT, 'DerivedData')
    cmd = [
        'xcodebuild', 'test',
        '-project', os.path.join(IOS_DIR, 'Adhkar.xcodeproj'),
        '-scheme', 'Adhkar',
        '-configuration', 'Debug',
        '-destination', dest,
        '-derivedDataPath', derived,
        f'MARKETING_VERSION={vname}',
        f'CURRENT_PROJECT_VERSION={vcode}',
        'CODE_SIGN_IDENTITY=-',
    ]
    subprocess.run(cmd, check=True)


def build_unsigned_ipa(vname, vcode):
    proj = os.path.join(IOS_DIR, 'Adhkar.xcodeproj')
    derived = os.path.join(OUT, 'DerivedDataRelease')

    # 1. Verify iOS Simulator build (ad-hoc signed for Apple Silicon simulator)
    subprocess.run([
        'xcodebuild', 'build',
        '-project', proj,
        '-scheme', 'Adhkar',
        '-configuration', 'Release',
        '-sdk', 'iphonesimulator',
        '-destination', 'generic/platform=iOS Simulator',
        '-derivedDataPath', derived,
        f'MARKETING_VERSION={vname}',
        f'CURRENT_PROJECT_VERSION={vcode}',
        'CODE_SIGN_IDENTITY=-',
    ], check=True)

    # 2. Build unsigned iOS device app (arm64) for packaging into an unsigned IPA
    subprocess.run([
        'xcodebuild', 'build',
        '-project', proj,
        '-scheme', 'Adhkar',
        '-configuration', 'Release',
        '-sdk', 'iphoneos',
        '-destination', 'generic/platform=iOS',
        '-derivedDataPath', derived,
        f'MARKETING_VERSION={vname}',
        f'CURRENT_PROJECT_VERSION={vcode}',
        'CODE_SIGNING_ALLOWED=NO',
        'CODE_SIGNING_REQUIRED=NO',
        'CODE_SIGN_IDENTITY=',
    ], check=True)

    app_path = os.path.join(derived, 'Build', 'Products', 'Release-iphoneos', 'Adhkar.app')
    if not os.path.isdir(app_path):
        sys.exit(f'Expected built app at {app_path}')

    os.makedirs(DIST, exist_ok=True)
    ipa_path = os.path.join(DIST, 'Adhkar-iOS-unsigned.ipa')
    if os.path.exists(ipa_path):
        os.remove(ipa_path)

    with zipfile.ZipFile(ipa_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for base, _, files in os.walk(app_path):
            for fname in sorted(files):
                full = os.path.join(base, fname)
                rel = os.path.join('Payload', 'Adhkar.app', os.path.relpath(full, app_path)).replace('\\', '/')
                info = zipfile.ZipInfo.from_file(full, rel)
                # Preserve executable permissions on Mach-O binaries inside the .app bundle
                info.external_attr = (os.stat(full).st_mode & 0xFFFF) << 16
                with open(full, 'rb') as fp:
                    z.writestr(info, fp.read(), compress_type=zipfile.ZIP_DEFLATED)

    sha = hashlib.sha256(open(ipa_path, 'rb').read()).hexdigest()
    mb = os.path.getsize(ipa_path) / 1048576.0
    print(f'dist/Adhkar-iOS-unsigned.ipa {vname} ({vcode}) {mb:.1f} MB sha256:{sha[:16]}...')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--stage-only', action='store_true', help='Only stage web bundle, icon and sounds (runs on any OS)')
    ap.add_argument('--test', action='store_true', help='Run AdhkarTests on an iOS Simulator (macOS)')
    ap.add_argument('--skip-build', action='store_true', help='Skip building the unsigned IPA (useful with --test)')
    args = ap.parse_args()

    vname, vcode = read_version()
    stage(vname)

    if args.stage_only:
        return
    if platform.system() != 'Darwin':
        sys.exit('Compiling the iOS app requires macOS (or pass --stage-only to prepare assets).')

    generate_xcode_project()
    if args.test:
        run_tests(vname, vcode)
    if not args.skip_build:
        build_unsigned_ipa(vname, vcode)


if __name__ == '__main__':
    main()

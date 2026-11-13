#!/usr/bin/env bash
# Gradle-free release build: content → assets → aapt2 → javac → d8 → zipalign → apksigner.
# Usage: ./build.sh            (needs ANDROID_HOME with build-tools 36.0.0 + platform android-36, and a JDK 17)
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$PWD"
# the version: first line of VERSION is the name shown to people, the second the code Android compares
VNAME="$(sed -n 1p VERSION | tr -d '\r')"; VCODE="$(sed -n 2p VERSION | tr -d '\r')"
SDK="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
BT="$SDK/build-tools/${BT_VER:-36.0.0}"
AJ="$SDK/platforms/android-${PLAT:-36}/android.jar"
OUT="$ROOT/build"; DIST="$ROOT/dist"; KS_DIR="$ROOT/keystore"
EXE=""; [ -f "$BT/aapt2.exe" ] && EXE=".exe"
rm -rf "$OUT"; mkdir -p "$OUT"/{gen,classes,dex,assets/www} "$DIST" "$KS_DIR"

echo "[1/8] content"
python tools/build_content.py >/dev/null
python tools/build_hadith.py >/dev/null
python tools/build_kahf.py >/dev/null
node tools/test.js | tail -1
node tools/smoke.js | tail -1
node tools/bridge-check.js | tail -1   # every Android bridge method also exists in the Windows app

echo "[2/8] stage web assets"
python tools/bundle.py web "$OUT/assets/www" "$VNAME"
mkdir -p dist && python tools/standalone.py "$OUT/assets/www" dist/Adhkar.html dist/Adhkar-share.html   # one file for testers; the share copy for a hosted page

echo "[3/8] aapt2 compile"
"$BT/aapt2$EXE" compile --dir android/res -o "$OUT/res.zip"

echo "[4/8] aapt2 link"
"$BT/aapt2$EXE" link -o "$OUT/base.apk" -I "$AJ" --manifest android/AndroidManifest.xml \
  --java "$OUT/gen" --min-sdk-version 26 --target-sdk-version 35 \
  --version-code "$VCODE" --version-name "$VNAME" --auto-add-overlay "$OUT/res.zip"

# aapt2 has twice exited cleanly here without writing its output (the build folder was emptied under it); stop with a
# clear message rather than a wall of "package R does not exist"
if [ ! -f "$OUT/gen/com/adhkar/app/R.java" ] || [ ! -f "$OUT/base.apk" ]; then
  echo "build.sh: aapt2 produced no output (is another build running in this folder?). Run ./build.sh again." >&2; exit 1
fi
echo "[5/8] javac"
find android/src build/gen -name '*.java' > "$OUT/sources.txt"
javac -nowarn -Xlint:-options -encoding UTF-8 --release 8 -classpath "$AJ" -d build/classes @build/sources.txt

echo "[6/8] d8"
find build/classes -name '*.class' > "$OUT/classes.txt"
java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --release --min-api 26 --lib "$AJ" --output build/dex @build/classes.txt
python tools/pack.py build/base.apk build/assets build/dex/classes.dex build/packed.apk
echo "[7/8] zipalign"
"$BT/zipalign$EXE" -p -f 4 build/packed.apk build/aligned.apk

echo "[8/8] sign"
if [ ! -f "$KS_DIR/adhkar-release.jks" ]; then
  PASS="$(python -c "import secrets,string;print(''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range(24)))")"
  keytool -genkeypair -keystore "$KS_DIR/adhkar-release.jks" -alias adhkar -keyalg RSA -keysize 4096 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" -dname "CN=Adhkar, O=Adhkar" >/dev/null 2>&1
  printf 'storeFile=adhkar-release.jks\nkeyAlias=adhkar\nstorePassword=%s\nkeyPassword=%s\n' "$PASS" "$PASS" > "$KS_DIR/keystore.properties"
fi
PASS="$(grep storePassword "$KS_DIR/keystore.properties" | cut -d= -f2)"
java -jar "$BT/lib/apksigner.jar" sign --ks "$KS_DIR/adhkar-release.jks" --ks-key-alias adhkar \
  --ks-pass "pass:$PASS" --key-pass "pass:$PASS" --out "$DIST/Adhkar.apk" "$OUT/aligned.apk"
java -jar "$BT/lib/apksigner.jar" verify --print-certs "$DIST/Adhkar.apk" | head -3

# Play Store bundle (needs tools/.bin/bundletool.jar): same resources linked in proto format, signed with the upload key
if [ -f tools/.bin/bundletool.jar ]; then
  echo "[aab] Play Store bundle"
  "$BT/aapt2$EXE" link --proto-format -o "$OUT/proto.apk" -I "$AJ" --manifest android/AndroidManifest.xml     --min-sdk-version 26 --target-sdk-version 35 --version-code "$VCODE" --version-name "$VNAME" --auto-add-overlay "$OUT/res.zip"
  python tools/aab.py "$OUT/proto.apk" "$OUT/assets" build/dex/classes.dex "$OUT/base.zip" >/dev/null
  rm -f "$DIST/Adhkar.aab"
  java -jar tools/.bin/bundletool.jar build-bundle --modules="$OUT/base.zip" --output="$DIST/Adhkar.aab"
  jarsigner -keystore "$KS_DIR/adhkar-release.jks" -storepass "$PASS" -keypass "$PASS" -sigalg SHA256withRSA -digestalg SHA-256 "$DIST/Adhkar.aab" adhkar >/dev/null
  ls -la "$DIST/Adhkar.aab"
fi
ls -la "$DIST/Adhkar.apk"

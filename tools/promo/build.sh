#!/usr/bin/env bash
# The promo film, from code to dist/Adhkar-promo.mp4 (portrait, 1080 x 1920, about two minutes):
#   1. tools/promo/render.js draws every frame of tools/promo/promo.html (30 a second) in headless Edge;
#   2. tools/promo/birds.py makes an autumn morning: birds near and far, a breeze, turning leaves;
#   3. ffmpeg lays the Madinah takbīr from the app (android/res/raw/adhan_takbir.ogg) over it from 0.9 s,
#      the takbīr at -16 LUFS and the birds well beneath it (-30), so they stay in the background throughout;
#   4. a lighter copy, dist/Adhkar-promo-share.mp4, for messaging apps.
# Needs: node, python with numpy, ffmpeg, Microsoft Edge.
set -euo pipefail
cd "$(dirname "$0")/../.."
WORK="${PROMO_WORK:-build/promo}"
mkdir -p "$WORK" dist
ORIGIN="file:///$(cd tools/promo && pwd -W 2>/dev/null || pwd)/promo.html?render"
ORIGIN="${ORIGIN// /%20}"
if [ -z "${SKIP_FRAMES:-}" ]; then
  echo "[1/4] frames"
  CDP_ORIGIN="$ORIGIN" node tools/cdp.js tools/promo/render.js "$WORK"
fi
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/video.mp4")
echo "[2/4] birds ($DUR s)"
python tools/promo/birds.py "$WORK/birds.wav" "$DUR"
echo "[3/4] sound and picture"
FADE=$(python -c "print(round($DUR - 4, 2))")
ffmpeg -y -loglevel error -i "$WORK/video.mp4" -i "$WORK/birds.wav" -i android/res/raw/adhan_takbir.ogg -filter_complex \
  "[1:a]highpass=f=150,loudnorm=I=-30:TP=-9,aresample=48000[b];[2:a]aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=60,loudnorm=I=-16:TP=-2,aresample=48000,adelay=900|900[k];[b][k]amix=inputs=2:normalize=0:duration=first,afade=t=out:st=$FADE:d=4,alimiter=limit=0.89[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest dist/Adhkar-promo.mp4
echo "[4/4] a lighter copy for sharing"
ffmpeg -y -loglevel error -i dist/Adhkar-promo.mp4 -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -c:a copy -movflags +faststart dist/Adhkar-promo-share.mp4
ls -la dist/Adhkar-promo.mp4 dist/Adhkar-promo-share.mp4

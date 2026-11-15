#!/usr/bin/env bash
# The 45-second film in three shapes, each laid out for its own frame, from code to dist/:
#   dist/Adhkar-film-45s-4x5.mp4    1080 x 1350, the LinkedIn feed (the most screen while scrolling)
#   dist/Adhkar-film-45s-9x16.mp4   1080 x 1920, WhatsApp status, stories, LinkedIn's full-screen view
#   dist/Adhkar-film-45s-16x9.mp4   1920 x 1080, LinkedIn on a computer, the web, YouTube
#   and a lighter -share copy of each for messaging apps. In the two portrait shapes every word sits in a band at the
#   top and nothing that matters goes in the bottom quarter or at the right edge, where the viewers lay their buttons.
# 1. tools/promo/render.js draws every frame of tools/promo/ad.html (?land for landscape) and writes the film's
#    sound cues (sfx.json); 2. sfx.py makes the clicks, fills and paper from those cues; birds.py the autumn morning;
# 3. ffmpeg lays the Madinah takbīr from the app twice, low: under the opening and under the end;
#    the birds well beneath (-32 LUFS) and the cues lower still.
# Needs node, python with numpy, ffmpeg and Microsoft Edge. SKIP_FRAMES=1 re-mixes without drawing again.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p dist
BASE="file:///$(cd tools/promo && pwd -W 2>/dev/null || pwd)/ad.html?render"
BASE="${BASE// /%20}"
for shape in ${SHAPES:-feed port land}; do
  W="build/film-$shape"
  mkdir -p "$W"
  case "$shape" in feed) Q="&feed"; NAME="Adhkar-film-45s-4x5" ;; port) Q=""; NAME="Adhkar-film-45s-9x16" ;; land) Q="&land"; NAME="Adhkar-film-45s-16x9" ;; esac
  if [ -z "${SKIP_FRAMES:-}" ]; then
    echo "[$shape] frames"
    CDP_ORIGIN="$BASE$Q" node tools/cdp.js tools/promo/render.js "$W"
  fi
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/video.mp4")
  python tools/promo/sfx.py "$W/sfx.wav" "$DUR" "$W/sfx.json"
  python tools/promo/birds.py "$W/birds.wav" "$DUR"
  END=$(python -c "print(round($DUR - 1.8, 2))")
  echo "[$shape] sound and picture"
  ffmpeg -y -loglevel error -i "$W/video.mp4" -i "$W/birds.wav" -i android/res/raw/adhan_takbir.ogg -i android/res/raw/adhan_takbir.ogg -i "$W/sfx.wav" -filter_complex \
    "[1:a]highpass=f=150,loudnorm=I=-32:TP=-9,aresample=48000[b];\
[2:a]atrim=0:10.5,afade=t=out:st=9.3:d=1.2,aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=60,loudnorm=I=-25:TP=-6,aresample=48000,adelay=300|300[k1];\
[3:a]atrim=0:10.5,afade=t=out:st=9.3:d=1.2,aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=60,loudnorm=I=-25:TP=-6,aresample=48000,adelay=34200|34200[k2];\
[4:a]loudnorm=I=-30:TP=-9,aresample=48000[s];\
[b][k1][k2][s]amix=inputs=4:normalize=0:duration=first,volume=6dB,afade=t=out:st=$END:d=1.8,alimiter=limit=0.89[a]" \
    -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "dist/$NAME.mp4"
  ffmpeg -y -loglevel error -i "dist/$NAME.mp4" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -c:a copy -movflags +faststart "dist/$NAME-share.mp4"
done
ls -la dist/Adhkar-film-45s*.mp4

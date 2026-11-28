#!/usr/bin/env bash
# The general film: 50 seconds, the whole app for any time of the year, in three shapes each composed for its own frame,
# from code to dist/ (Adhkar-film-50s-9x16, -4x5, -16x9):
#   <name>.mp4        the master (crf 20): the track, with the film's sound design beneath it
#   <name>-share.mp4  a lighter copy for WhatsApp and messaging
#   <name>-sfx.mp4    the sound design alone, for platforms where a track is added from their own licensed library
# 1. render.js draws every frame of tools/promo/general.html and writes its sound cues (sfx.json);
# 2. ramadan_sfx.py makes the sound design from those cues;
# 3. ffmpeg lays the track beneath it, started 33.58 s in so its chorus lands on the cut at 6.2 s (window.DROP).
# The track is the maintainer's own copy and is never committed (.gitignore): MUSIC=path overrides it.
# Its recording is copyrighted: on Instagram, TikTok and YouTube, adding it from the platform's library is the safe route.
#   SKIP_FRAMES=1  mix again from the frames already in build/film-general-<shape>
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p dist
MUSIC="${MUSIC:-tools/promo/ramadan-track.mp3}"
OFFSET=33.58
# every shape, each composed for its own frame: 9x16 (status, reels), 4x5 (the feed), 16x9 (YouTube, the web)
for shape in ${SHAPES:-port feed land}; do
  case "$shape" in port) Q=""; SUF=9x16 ;; feed) Q="&feed"; SUF=4x5 ;; land) Q="&land"; SUF=16x9 ;; esac
  W=build/film-general-$shape
  NAME=Adhkar-film-50s-$SUF
  mkdir -p "$W"
  if [ -z "${SKIP_FRAMES:-}" ]; then
    URL="file:///$(cd tools/promo && pwd -W 2>/dev/null || pwd)/general.html?render$Q"
    CDP_ORIGIN="${URL// /%20}" node tools/cdp.js tools/promo/render.js "$W"
  fi
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/video.mp4")
  python tools/promo/ramadan_sfx.py "$W/sfx.wav" "$DUR" "$W/sfx.json"
  END=$(python -c "print(round($DUR - 2.2, 2))")
  # the track leads (about -15 LUFS), the design sits beneath it (about -23), the whole about -14 for social apps
  ffmpeg -y -loglevel error -i "$W/video.mp4" -ss "$OFFSET" -t "$DUR" -i "$MUSIC" -i "$W/sfx.wav" -filter_complex     "[1:a]aresample=48000,afade=t=in:st=0:d=0.6,loudnorm=I=-15:TP=-2:LRA=11,aresample=48000[m];[2:a]loudnorm=I=-23:TP=-4,aresample=48000[s];[m][s]amix=inputs=2:normalize=0:duration=first,afade=t=out:st=$END:d=2.2,loudnorm=I=-14:TP=-1.5,aresample=48000,alimiter=limit=0.89[a]"     -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "dist/$NAME.mp4"
  ffmpeg -y -loglevel error -i "$W/video.mp4" -i "$W/sfx.wav" -filter_complex     "[1:a]loudnorm=I=-20:TP=-2,aresample=48000,afade=t=out:st=$END:d=2.2[a]"     -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest "dist/$NAME-sfx.mp4"
  ffmpeg -y -loglevel error -i "dist/$NAME.mp4" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -c:a copy -movflags +faststart "dist/$NAME-share.mp4"
done
ls -la dist/Adhkar-film-50s*.mp4

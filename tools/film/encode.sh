#!/bin/bash
# encode.sh — turns the captured frames (take2/f%06d.jpg, 60 fps, constant rate) into the site's media files.
#   FFMPEG=E:/ffmpeg-7.1/bin/ffmpeg bash encode.sh
# Output: out/sentinel-demo.mp4 (H.264 60 fps crf 24, limited range), out/sentinel-demo.webm (VP9 crf 35),
#         out/sentinel-demo-poster.jpg (frame at POSTER_AT seconds, default 25.6).
set -e
cd "$(dirname "$0")"
FF=${FFMPEG:-ffmpeg}
POSTER_AT=${POSTER_AT:-25.6}
mkdir -p out
$FF -y -loglevel error -framerate 60 -i take2/f%06d.jpg -vf "scale=in_range=jpeg:out_range=tv,format=yuv420p" -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libx264 -preset slow -crf 24 -profile:v high -level 4.2 -g 120 -movflags +faststart out/sentinel-demo.mp4
$FF -y -loglevel error -ss "$POSTER_AT" -i out/sentinel-demo.mp4 -frames:v 1 -q:v 4 out/sentinel-demo-poster.jpg
$FF -y -loglevel error -i out/sentinel-demo.mp4 -c:v libvpx-vp9 -crf 39 -b:v 0 -row-mt 1 -deadline good -cpu-used 4 -an out/sentinel-demo.webm
ls -la out

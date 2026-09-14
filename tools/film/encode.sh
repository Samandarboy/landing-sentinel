#!/bin/bash
# encode.sh — turns the captured frames (take/frames.txt) into the site's media files.
#   FFMPEG=E:/ffmpeg-7.1/bin/ffmpeg bash encode.sh
# Output: out/sentinel-demo.mp4 (H.264 crf 23, limited range), out/sentinel-demo.webm (VP9 crf 35),
#         out/sentinel-demo-poster.jpg (frame at POSTER_AT seconds, default 29.6).
set -e
cd "$(dirname "$0")"
FF=${FFMPEG:-ffmpeg}
POSTER_AT=${POSTER_AT:-29.6}
mkdir -p out
$FF -y -loglevel error -f concat -safe 0 -i take/frames.txt -vf "fps=30,scale=in_range=jpeg:out_range=tv,format=yuv420p" -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libx264 -preset slow -crf 23 -profile:v high -level 4.1 -movflags +faststart out/sentinel-demo.mp4
$FF -y -loglevel error -i out/sentinel-demo.mp4 -c:v libvpx-vp9 -crf 35 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -an out/sentinel-demo.webm
$FF -y -loglevel error -ss "$POSTER_AT" -i out/sentinel-demo.mp4 -frames:v 1 -q:v 4 out/sentinel-demo-poster.jpg
ls -la out

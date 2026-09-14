# Product film — how the landing video is made

`site/v2/media/sentinel-demo.{mp4,webm}` and its poster are recorded from the real
interface (`../../../interface`) by `record.mjs`, a Playwright script that drives
headless Edge and captures 1920×1080 frames over CDP. Nothing in the take spends
credits: the upload and the detection run are **replayed** — the upload is answered
by a mocked route, the analysis events come from `run_findings.json` (the 21
findings of the fixture's stored run), and every other API call is either a
read-only allow-listed GET or aborted. The script asserts that the account's
spend is unchanged at the end.

## Prerequisites

- backend running on `:8000` (`python manage.py serve` from the repo root) with the
  fixture job `61be98477d8f` (vantage_en.pdf, 21 findings) in the admin's store
- the interface served statically on `:8085`
  (`cd interface && python -m http.server 8085`)
- `npm i playwright@1.49.1` in this folder (Edge is used via `channel: 'msedge'`,
  so no browser download is needed)
- ffmpeg 7 on the PATH, or `FFMPEG=/path/to/ffmpeg`

## Run

```bash
node record.mjs dry      # no capture: a screenshot per beat in ./dry + ./dry/requests.txt
node record.mjs take     # capture: frames in ./take + take/frames.txt
bash encode.sh           # -> out/sentinel-demo.mp4, .webm, -poster.jpg
```

Then copy the three files from `out/` into `site/v2/media/`.

## What the script does

Title card → upload the fixture PDF → a 3-second parse animation → the parsed
document scrolls → Detect → a 6-second replay of the detection run (stage messages
+ 21 findings streaming in) → open "Liability is not capped" → What if → the
"grant temporary use" scenario with its step-by-step timeline → Report → the
memorandum scrolls → end card. Captions, the cursor, the click ripples and the
camera moves are injected into the page; the Eclipse theme is forced. A few
Eclipse-theme contrast bugs are patched with CSS for the take only (see the
`addStyleTag` block); the product itself is untouched.

`FILM_PDF` and `FILM_APP` override the fixture PDF path and the interface URL.

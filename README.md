# Sentinel landing page

A self-contained static landing page for **Sentinel** — contract stress-testing
for legal teams. No build step, no framework, no dependencies.

## Run it

```bash
node serve.js 8123     # serves ./site at http://localhost:8123 (8123 is also the default)
```

Then open **http://localhost:8123**. In a product build, run it from the build
folder as `node Landing/serve.js 8123`. Keep it off 8080: that is the port
`run.sh` / `run.ps1` serve the product's interface on.

> Open it through the server, **not** by double-clicking `site/index.html` —
> the pages load their styles, scripts and media from the site root
> (`/v2/v2.css`, `/feature-demos.js`, `/v2/media/…`), and the legacy page's
> images use a `/_next/image?...` optimizer path that `serve.js` emulates.
> For production, any static host works with `site/` as the web root (for the
> legacy page it must also serve `/_next/image?url=X` by rewriting to `X`).

The page needs internet access in the visitor's browser: GSAP and its plugins
(ScrollTrigger, SplitText, DrawSVG), Motion, Lenis and three.js load from cdnjs /
jsdelivr, the fonts from Google Fonts, and the Book-a-demo calendar is the Cal.com
embed. Without them the page still reads: no GSAP or reduced motion gives a
static page with every state shown, no WebGL gives the page without its particles.

## What's inside

| Path | What it is |
|------|------------|
| `site/index.html`            | the live page (v2, see below); the old single-file page is `site/legacy/index.html` |
| `site/v2/`                   | the v2 page's own copy, stylesheet, script and product film (see below) |
| `site/favicon.ico`, `site/icons/` | Sentinel mark (favicon, 180 px touch icon, 512 px icon) |
| `site/og.png`                | the social card (`og:image` / `twitter:image`, 1200×630) |
| `site/robots.txt`, `site/sitemap.xml` | crawler rules (they disallow `/legacy/` and `/proposals/`) and the sitemap |
| `site/feature-demos.js`      | live animated demos of the Sentinel interface (Detect / Simulate / Report) with camera zooms, built on the Valve/Riot fixture data |
| `site/landing/sentinel-demo.css` | styles for the interface demos (product design tokens) |
| `site/legacy/index.html`     | the previous page (a Next.js export); the files below are used by it only |
| `site/feature-carousel.js`   | legacy: auto-advancing Key-Features carousel driving the demos |
| `site/animate.js`            | legacy: scroll-reveal + hover tagging (motion layer JS) |
| `site/contact-form.js`       | legacy: Book-a-demo form handler (front-end only — **not wired to a backend**) |
| `site/landing/animations.css`    | legacy: motion layer — reveals, hovers, hero "blurred attack" backdrop |
| `site/landing/why_*.svg`     | legacy: the four "Why teams choose Sentinel" illustrations |
| `site/landing/cta-bg.webp`   | legacy: pricing section background |
| `site/fonts/`, `site/_next/static/media/` | legacy: display + body fonts (woff2) |
| `site/_next/static/chunks/0gqne1_i2cjdy.css` | legacy: the page's compiled stylesheet |
| `serve.js`                   | zero-dependency static server (byte ranges for the film, `/v2` → `/v2/` redirect) |

The interface-demo fonts (Inter / IBM Plex Mono / Source Serif 4) load from
Google Fonts with system fallbacks; everything else is local.

## The live page

`site/index.html` is the v2 page (a copy of `site/v2/index.html` with absolute media
paths, so it can be served from the root). The previous Next.js-export page lives on at
`site/legacy/index.html`.

## v2 — the rebuilt page (`site/v2/`)

A from-scratch rebuild of the landing on the layout and motion vocabulary of
Linear and Aaru (measured from the live sites on 2026-09-14). Same server:

```bash
node serve.js 8123     # then open http://localhost:8123/v2/
```

| Path | What it is |
|------|------------|
| `site/v2/index.html` | the page (hand-written, readable HTML) |
| `site/v2/v2.css`     | design system + layout + motion states; dark tokens for the product demos |
| `site/v2/v2.js`      | the motion layer: Lenis smooth scroll, header/pill states and the page-progress hairline, the hero intro, the text system (see below), the scroll-linked statement, the three pillar scenes (find / prove / fix, each a looping GSAP timeline that runs only on screen), "how it works" (a scroll-driven sticky stage on desktop, a swipeable story on tablets and phones), the proof "duel", the "why" panel (a fine dot-matrix display, about 36 dots across a sign, that a scan line writes a sign onto for each of three outcomes: a clock, a target, a memo), the film player, the FAQ deck, the Cal.com booking embed |
| `site/v2/swarm.js`   | the particle layer (three.js, one fixed WebGL canvas under the page). Two populations: a sparse drifting dust that is always there, and points that stay dark until the page asks for a figure (a contract page beside the statement, a question mark at the FAQ, the footer wordmark). Figures are built like print, not sand: one point per cell of a regular lattice, edge cells get a smaller dot in proportion to coverage (a halftone), the figure is lit from the top left, assembles in a sweep (a page top to bottom, a word left to right) with each point rising a short way into place, and then holds still. The contract page is generated point by point (folded corner, title, rule, numbered paragraphs broken into words, two flagged lines, signatures, a seal); glyphs and text are rasterised at one pixel per cell. Colours are plain vectors, not `THREE.Color` (three would convert them to linear light and the shader writes straight to the screen). The pointer stirs the dust along its own motion (a wake), never outward. The headline is NOT a figure: it is set in type from its first frame. `v2.js` fetches three.js after first paint; the page never waits for it |
| `site/v2/media/`     | the product film: `sentinel-demo.mp4` (H.264, 1080p, 60 fps, 50 s, ~12 MB), `sentinel-demo.webm` (VP9, ~11 MB), `sentinel-demo-poster.jpg` |

Section order: hero → statement + three pillars → how it works → proof → why
("What you walk away with": minutes not days, your exposure and theirs, a memo you
can send) → **film**
(the recorded product demonstration, click to play, no sound) → **FAQ** (a deck:
drag, swipe, arrows or keyboard) → book a demo.

Two files are derived from `site/v2/index.html` and must be regenerated after every
edit to it: the FAQPage JSON-LD in its own head (built from the FAQ cards, so the
structured data cannot drift from the page) and `site/index.html`. One command does
both, and `--check` fails if either is stale:

```bash
python tools/sync_page.py
```

Text motion is one system. Every piece of text that arrives comes up out of a soft
blur on a spring with no bounce: headings word by word (`data-text="words"`),
paragraphs line by line (`data-text="lines"`), mono labels by settling their tracking
(`data-text="label"`); `data-delay` holds a paragraph back so its heading leads, and
`data-manual` leaves the timing to a timeline (the hero). SplitText splits a text only
while it animates and then restores the markup exactly, so nothing re-wraps on resize
and no kerning is lost (letters are never split). Motion plays the keyframes through
the Web Animations API, which keeps opacity, transform and filter on the compositor
while the main thread is busy with the particle layer; without Motion the same
keyframes go through the native API. Groups (`data-stagger`) arrive child by child
with CSS transitions. A hyphenated compound inside a split text is wrapped in
`<span class="nb">`: split words cannot break at a hyphen, so without it the text
would re-wrap when the split is undone. Nothing scrambles, tilts or sits behind a mask.

The Sentinel card in the duel keeps the chatbot card's height and holds three things:
the verdict, the clause it rests on (set small: it is the evidence, not the headline)
and the contract played forward on a timeline, where a playhead runs the track and each
event lands as it is reached.

Copy rules the page keeps: it claims nothing about where Sentinel is deployed (no
on-premise, offline or air-gapped wording anywhere under `site/`), the call is the
20 minutes of the Cal.com event, and every product claim was checked against the
code on 2026-09-18 (a model reads the contract, so "no LLM" is not claimed; training
consent is off by default; deleting a document removes its file, report and exports;
there is no SSO/SAML and no custom playbooks). `?slow=4` on the URL plays every
timeline at quarter speed for reviewing the motion.

It reuses `feature-demos.js` + `landing/sentinel-demo.css` (the live product
demos). The detect demo opens its first finding inline (what it means, what is
at stake, how we know, the actions) and the camera drifts down through it. On
phones the demos re-flow into a single 400px column (no rail, no library) on a
tall surface that is fitted by width (`--fit: width`) and panned, so the frames
keep their corners and nothing is cropped mid-element. On tablets and phones
"how it works" is not sticky: it is three stories with a progress bar each, which
advance on their own, on a swipe or a tap on either side, and pause while held.

## Source checkout only — not shipped in product builds

`Builds/make_build.py` prunes `site/proposals` and the whole of `tools/` from every
product build, so they exist in the repository and nowhere else.

### Proposals page (`site/proposals/`)

Working versions of the ten landing additions proposed on 2026-09-14 (trust
wall, sample memorandum, customer quote, "Try a clause" tester, capability
bento, audience split, latest strip, FAQ, numbers band, the film) plus the
polish pieces (proof stack, EN/RU switch, social card). Same server, separate
page: `http://localhost:8123/proposals/`. Reuses `/v2/v2.css` and the live
demos; sample content is labelled on every section. Not linked from v2, and
disallowed in `robots.txt`.

### Film tooling (`tools/film/`)

The film is re-recordable from the real interface with `tools/film/` (see its
README): Playwright drives headless Edge through upload → parse → detect →
what-if → memorandum on the fixture agreement, with the analysis replayed from a
stored run so a take never spends credits. It needs the development data store
and a running local backend.

### Page tooling (`tools/sync_page.py`, `tools/og/`)

`sync_page.py` is described above. `tools/og/og.html` is the source of the social
card; `node tools/og/render.mjs` renders it to `site/og.png` (needs
`npm i playwright@1.49.1`, Edge via `channel: 'msedge'`).

## Before it goes fully live

- Publish Terms and Privacy pages and link them from the footer. The footer has no
  legal links today because the pages do not exist (the old links returned 404).
- `site/legacy/index.html` is the previous page and still ships. Its on-premise and
  SSO lines were replaced on 2026-09-18, but it still carries a price list and the
  "No LLMs" / "0 hallucinations" chips, which the product no longer supports.

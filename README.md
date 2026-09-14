# Sentinel landing page

A self-contained static landing page for **Sentinel** — contract stress-testing
for legal teams. No build step, no framework, no dependencies.

## Run it

```bash
node serve.js          # serves ./site at http://localhost:8080
# or choose a port:  node serve.js 3000
```

Then open **http://localhost:8080**.

> Open it through the server, **not** by double-clicking `site/index.html` —
> the images use a `/_next/image?...` optimizer path that `serve.js` emulates.
> For production, any static host works if it either serves `/_next/image?url=X`
> by rewriting to `X`, or you swap those `srcset`s for direct paths.

## What's inside

| Path | What it is |
|------|------------|
| `site/index.html`            | the live page (v2, see below); the old single-file page is `site/legacy/index.html` |
| `site/favicon.ico`           | Sentinel mark (generated, 168 bytes) |
| `site/feature-demos.js`      | live animated demos of the Sentinel interface (Detect / Simulate / Report) with camera zooms, built on the Valve/Riot fixture data |
| `site/feature-carousel.js`   | auto-advancing Key-Features carousel driving the demos |
| `site/animate.js`            | scroll-reveal + hover tagging (motion layer JS) |
| `site/contact-form.js`       | Book-a-demo form handler (front-end only — **not wired to a backend**) |
| `site/landing/sentinel-demo.css` | styles for the interface demos (product design tokens) |
| `site/landing/animations.css`    | motion layer: reveals, hovers, hero "blurred attack" backdrop |
| `site/landing/why_*.svg`     | the four "Why teams choose Sentinel" illustrations |
| `site/landing/cta-bg.webp`   | pricing section background |
| `site/fonts/`, `site/_next/static/media/` | display + body fonts (woff2) |
| `site/_next/static/chunks/0gqne1_i2cjdy.css` | the page's compiled stylesheet |
| `serve.js`                   | zero-dependency static server |

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
node serve.js          # then open http://localhost:8080/v2/
```

| Path | What it is |
|------|------------|
| `site/v2/index.html` | the page (hand-written, readable HTML) |
| `site/v2/v2.css`     | design system + layout + motion states; dark tokens for the product demos |
| `site/v2/v2.js`      | Lenis smooth scroll, header/pill states, hero intro, scroll reveals, scroll-linked statement, sticky "how it works" stage, the proof "duel" (one typed question, a chatbot bubble vs a proof ladder, auto-advancing tabs), the security panel with the network plug, canvases, film player, FAQ accordion, form |
| `site/v2/media/`     | the product film: `sentinel-demo.mp4` (H.264, 1080p, 51 s, ~11 MB), `sentinel-demo.webm` (VP9, ~9 MB), `sentinel-demo-poster.jpg` |

Section order: hero → statement → how it works → proof → security → **film**
(the recorded product demonstration, click to play, no sound) → **FAQ** →
book a demo. The film is re-recordable from the real interface with
`tools/film/` (see its README): Playwright drives headless Edge through
upload → parse → detect → what-if → memorandum on the fixture agreement, with
the analysis replayed from a stored run so a take never spends credits.

It reuses `feature-demos.js` + `landing/sentinel-demo.css` (the live product
demos). The detect demo opens its first finding inline (what it means, what is
at stake, how we know, the actions) and the camera drifts down through it. On
phones the demos re-flow into a single 400px column (no rail, no library) on a
tall surface that is fitted by width (`--fit: width`) and panned, so the frames
keep their corners and nothing is cropped mid-element. GSAP + ScrollTrigger and
Lenis load from cdnjs / jsdelivr; fonts from Google Fonts.

## Proposals page (`site/proposals/`)

Working versions of the ten landing additions proposed on 2026-09-14 (trust
wall, sample memorandum, customer quote, "Try a clause" tester, capability
bento, audience split, latest strip, FAQ, numbers band, the film) plus the
polish pieces (proof stack, EN/RU switch, social card). Same server, separate
page: `http://localhost:8080/proposals/`. Reuses `/v2/v2.css` and the live
demos; sample content is labelled on every section. Not linked from v2.

## Before it goes fully live

- Wire `contact-form.js` to a real endpoint (it currently just shows the
  success state).
- Set real destinations for outbound links (footer, `sentinel.law` hosts).
- Add an OG/social image (`og:image` currently unset after cleanup).

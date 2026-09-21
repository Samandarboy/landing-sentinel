/* record2.mjs — films the Sentinel interface for the landing page, frame by frame.
   node record2.mjs dry   -> no capture, screenshots at every beat + request log
   node record2.mjs take  -> one JPEG per frame at 60 fps in ./take2 (constant rate, deterministic)
   The page runs on a VIRTUAL CLOCK: timers, rAF, CSS animations and transitions are stepped
   exactly 1/60 s per captured frame, so the result is smooth however long a frame takes to
   render. Analysis is REPLAYED (mocked routes + fake EventSource); nothing paid is reached. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODE = process.argv[2] || 'dry';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const JOB = '61be98477d8f';
const ZOOM = 4 / 3;
const FPS = 60, FRAME = 1000 / FPS;
const APP = process.env.FILM_APP || 'http://127.0.0.1:8085/index.html';
const PDF = process.env.FILM_PDF || path.join(HERE, '..', '..', '..', 'data', 'users', 'befd989bf15e0d8b', 'uploads', '61be98477d8f', 'vantage_en.pdf');
const FINDINGS = JSON.parse(fs.readFileSync(path.join(HERE, 'run_findings.json'), 'utf8'));
const OUT = path.join(HERE, 'take2');
const DRY = path.join(HERE, 'dry2');
for (const d of [OUT, DRY]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
const T0 = Date.now();
let vclock = 0; // virtual ms since the capture started
const mark = (s) => console.log((vclock / 1000).toFixed(1).padStart(5) + 's  ' + s + '   (real ' + ((Date.now() - T0) / 1000).toFixed(0) + 's)');
const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- browser ---------------- */
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 200)));

/* ---------------- routes: replay, never spend ---------------- */
const flags = { uploaded: false, runDone: false };
const reqlog = [];
const ALLOW_GET = [
  /\/api\/settings$/, /\/api\/health$/, /\/api\/auth\//, /\/api\/me\/prefs/, /\/api\/usage/,
  new RegExp(`/api/parse/${JOB}/result$`), new RegExp(`/api/jobs/${JOB}/status$`),
  new RegExp(`/api/reports/${JOB}/(simulations(/[^/?]+)?|triage|memo-model|stress/catalog|defects/[^/]+)$`),
];
await ctx.route('**/api/**', async (route) => {
  const req = route.request(); const u = new URL(req.url()); const p = u.pathname; const m = req.method();
  const log = (how) => reqlog.push(`${how.padEnd(8)} ${m} ${p}${u.search}`);
  const json = (body, status = 200) => { log('mock' + status); return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }); };
  if (m === 'POST' && p === '/api/upload') { await realSleep(300); flags.uploaded = true; return json({ job_id: JOB, filename: 'vantage_en.pdf', pipeline: false, status: 'queued' }); }
  if (m === 'POST' && p === `/api/parse/${JOB}/stream-ticket`) return json({ ticket: 'film' });
  if (m === 'POST' && p === `/api/parse/${JOB}/save`) return json({ ok: true, job_id: JOB, saved: true });
  if (m === 'POST' && p === `/api/documents/${JOB}/analyze`) { await realSleep(200); return json({ job_id: JOB, status: 'running', queued: true }); }
  if (m === 'GET' && p === `/api/documents/${JOB}/cost-estimate`) return json({ detail: 'estimate unavailable' }, 404);
  if (m === 'GET' && p === '/api/parse/list') {
    if (!flags.uploaded) return json({ items: [] });
    const r = await route.fetch(); const body = await r.json();
    for (const it of body.items || []) if (it.job_id === JOB && !flags.runDone) { it.has_report = false; it.report_summary = null; }
    log('rewrite'); return route.fulfill({ response: r, body: JSON.stringify(body) });
  }
  if (m === 'GET' && p === `/api/reports/${JOB}`) { if (!flags.runDone) return json({ detail: 'report not ready' }, 404); log('pass'); return route.continue(); }
  if (m === 'GET' && p === `/api/jobs/${JOB}/status`) {
    const r = await route.fetch(); const body = await r.json();
    if (!flags.runDone) body.report_ready = false;
    log('rewrite'); return route.fulfill({ response: r, body: JSON.stringify(body) });
  }
  if ((m === 'GET' && ALLOW_GET.some((x) => x.test(p))) || (m === 'POST' && p.startsWith('/api/auth/')) || (m === 'PUT' && p === '/api/me/prefs')) { log('pass'); return route.continue(); }
  log('BLOCKED'); return route.abort('failed');
});

/* ---------------- init: theme + fake EventSource ---------------- */
await page.addInitScript(() => {
  try { localStorage.setItem('sentinel.theme', 'eclipse'); } catch (e) {}
  window.__esCount = 0;
  window.EventSource = class FakeEventSource {
    constructor(url) {
      this.url = url; this.readyState = 0; this._l = {}; window.__es = this; window.__esCount += 1;
      setTimeout(() => { if (this.readyState === 2) return; this.readyState = 1; this._fire('open', {}); }, 60);
    }
    addEventListener(t, fn) { (this._l[t] = this._l[t] || []).push(fn); }
    removeEventListener(t, fn) { this._l[t] = (this._l[t] || []).filter((f) => f !== fn); }
    close() { this.readyState = 2; }
    _fire(t, ev) { for (const fn of (this._l[t] || [])) { try { fn(ev); } catch (e) { console.error(e); } } const h = this['on' + t]; if (typeof h === 'function') { try { h(ev); } catch (e) {} } }
  };
  window.__emit = (type, data) => { const es = window.__es; if (!es || es.readyState !== 1) return false; es._fire(type, { data: data == null ? undefined : (typeof data === 'string' ? data : JSON.stringify(data)) }); return true; };
});

/* ---------------- boot + login (real time) ---------------- */
await page.goto(APP, { waitUntil: 'domcontentloaded' }); await realSleep(1200);
await page.evaluate(async () => { await window.SentinelAPI.login('admin', 'admin1234'); });
const usage0 = await page.evaluate(async () => (await window.SentinelAPI.getUsage()).governance.user_spent_usd);
await page.reload({ waitUntil: 'domcontentloaded' }); await realSleep(2500);

/* ---------------- overlay: the site's own colours, zoom, cursor, captions, cards, camera, memo choreography ---------------- */
const STAGGER = Array.from({ length: 16 }, (_, i) => `.stress-verdict.v-anim .sv-tl>li:nth-child(${i + 1}){animation-delay:${(0.35 + i * 0.2).toFixed(2)}s}`).join('\n');
await page.addStyleTag({ content: `
/* the interface wears exactly the tokens the landing's own demos wear */
.app[data-theme="eclipse"]{--bg-page:#0b0c0e;--bg-app:#0e0f11;--bg-pane:#101113;--bg-doc:#17191c;--bg-sunken:#0b0c0e;--bg-soft:rgba(255,255,255,.05);--bg-soft2:rgba(255,255,255,.09);--bg-mark:rgba(255,214,102,.22);--text-primary:#f2f3f5;--text-secondary:#b6bcc6;--text-muted:#8a8f98;--text-faint:#5f646c;--border-subtle:rgba(255,255,255,.09);--border-hairline:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.18);--severity-critical:#ff5f57;--severity-high:#ff9f43;--severity-medium:#e0b64a;--severity-success:#2fd27f;--severity-low:#8a8f98;--mode-detect:#ff9f43;--mode-simulate:#6f88ff;--mode-stress:#c39bff;--mode-draft:#98c374;--mode-report:#8ea0ff;--accent-ink:#8ea0ff}
html,body{background:#0b0c0e!important}
html{zoom:${ZOOM}} html,body{overflow:hidden!important}
.app{height:calc(100vh / ${ZOOM})!important;grid-template-rows:calc(100vh / ${ZOOM})!important;transform-origin:50% 50%;will-change:transform}
.app,.modal{color:var(--text-primary)} .stage-h1{color:var(--text-primary)!important}
.rcp-k,.rcp-v{color:var(--text-secondary)!important}
.whatchanged,.btn-caveat,.btn-register{display:none!important}
#brandBuild{display:none!important}
*{cursor:none!important}
#vcur{position:fixed;left:0;top:0;z-index:99997;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.55));will-change:transform}
#vrip{position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #fff;z-index:99996;pointer-events:none;opacity:0}
#vrip.go{animation:vrip .55s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes vrip{0%{opacity:.9;transform:scale(.35)}100%{opacity:0;transform:scale(1.5)}}
#vfade{position:fixed;inset:0;z-index:99995;background:#08090a;opacity:0;pointer-events:none}
#vcap{position:fixed;left:24px;bottom:22px;z-index:99998;width:296px;padding:13px 16px 14px;border-radius:12px;background:rgba(9,10,12,.8);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 30px 70px -24px rgba(0,0,0,.8);opacity:0;transform:translateY(10px);transition:opacity .5s cubic-bezier(.2,.7,.2,1),transform .5s cubic-bezier(.2,.7,.2,1);pointer-events:none;font-family:Inter,system-ui,sans-serif}
#vcap.on{opacity:1;transform:none}
#vcap .n{display:block;font:500 9.5px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#8ea0ff;margin-bottom:7px}
#vcap .t{display:block;font-size:17px;font-weight:520;letter-spacing:-.018em;line-height:1.24;color:#f7f8f8;text-wrap:pretty}
#vcard{position:fixed;inset:0;z-index:99999;background:#08090a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;font-family:Inter,system-ui,sans-serif;transition:opacity .7s cubic-bezier(.2,.7,.2,1);pointer-events:none}
#vcard.off{opacity:0}
#vcard .brand{display:flex;align-items:center;gap:12px;font-size:30px;font-weight:590;letter-spacing:-.025em;color:#f7f8f8}
#vcard .brand svg{width:30px;height:30px}
#vcard .h{font-size:34px;font-weight:520;letter-spacing:-.03em;line-height:1.08;color:#f7f8f8;max-width:640px;text-wrap:balance}
#vcard .s{font-size:15px;color:#8a8f98;letter-spacing:-.005em}
#vcard .pill{margin-top:6px;height:40px;padding:0 20px;border-radius:999px;background:#e5e5e6;color:#08090a;font-size:14px;font-weight:520;display:inline-flex;align-items:center;gap:8px}
#vcard .pill svg{width:16px;height:16px}
#vcard .in{opacity:0;transform:translateY(8px);animation:vin .8s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes vin{to{opacity:1;transform:none}}
.parse-progress-bar-fill{transition:width .25s linear!important}
.stress-verdict.v-anim{animation:vfade .6s cubic-bezier(.2,.7,.2,1) both}
@keyframes vfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.stress-verdict.v-anim .sv-tl>li{opacity:0;animation:vstep .55s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes vstep{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
${STAGGER}
/* the memorandum assembles: wipes, a typed verdict, counters, the severity bar, a seal */
.v-assemble [data-vw]{clip-path:inset(0 100% 0 0)}
.v-assemble [data-vw].v-in{clip-path:inset(0 0 0 0);transition:clip-path .7s cubic-bezier(.4,0,.2,1)}
.v-assemble .rpt-sevbar{transform:scaleX(0);transform-origin:left center}
.v-assemble .rpt-sevbar.v-in{transform:none;transition:transform .9s cubic-bezier(.4,0,.2,1)}
.rpt-hero{position:relative}
.v-stamp{position:absolute;right:24px;top:22px;z-index:2;display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(47,210,127,.14);border:1px solid rgba(47,210,127,.5);color:#2fd27f;font:600 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;opacity:0;transform:scale(1.6) rotate(-7deg)}
.v-stamp.v-in{opacity:1;transform:none;transition:opacity .45s cubic-bezier(.2,1.4,.4,1),transform .55s cubic-bezier(.2,1.4,.4,1)}
.v-stamp svg{width:12px;height:12px}
` });
await page.evaluate(() => {
  const mk = (id, html) => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; document.body.appendChild(d); return d; };
  mk('vfade', '');
  mk('vcur', '<svg width="22" height="27" viewBox="0 0 22 27"><path d="M3 2 L3 21 L8.2 16.4 L11.6 24.2 L15 22.7 L11.6 15 L18.4 15 Z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>');
  mk('vrip', ''); mk('vcap', '<span class="n"></span><span class="t"></span>');
  // the logo in currentColor: white on the dark title card, black inside the light end-card pill
  const MARK = '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M45.99 10.61L0.76 91.88L35.45 71.76ZM50 0L55.82 72.89L50 100L44.18 72.89ZM54.01 10.61L64.55 71.76L99.24 91.88Z"/></svg>';
  mk('vcard', `<div class="brand in">${MARK}Sentinel</div><div class="s in" style="animation-delay:.15s">A contract, read adversarially.</div>`);
  window.__cur = (x, y) => { document.getElementById('vcur').style.transform = `translate(${x}px,${y}px)`; };
  window.__ripple = (x, y) => { const r = document.getElementById('vrip'); r.style.left = x + 'px'; r.style.top = y + 'px'; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); };
  window.__cap = (n, t) => { const c = document.getElementById('vcap'); c.querySelector('.n').textContent = n; c.querySelector('.t').textContent = t; c.classList.add('on'); };
  window.__capOff = () => document.getElementById('vcap').classList.remove('on');
  window.__cardOff = () => document.getElementById('vcard').classList.add('off');
  window.__cardEnd = () => { const c = document.getElementById('vcard'); c.innerHTML = `<div class="h in">Every clause. Every scenario.<br>Proven before you sign.</div><div class="pill in" style="animation-delay:.2s">${MARK}Sentinel · Book a demo</div>`; c.classList.remove('off'); };
  // a soft dip between modes, and the new page settling in
  window.__flash = () => { document.getElementById('vfade').animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.45 }, { opacity: 0 }], { duration: 460, easing: 'ease-in-out' }); };
  window.__settle = () => { const st = document.getElementById('modeStage'); if (st) st.animate([{ opacity: 0.2, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' }); };
  window.__cam = (s, cx, cy, ms) => { const a = document.getElementById('app'); a.style.transition = `transform ${ms}ms cubic-bezier(.2,.7,.2,1)`; if (cx != null) a.style.transformOrigin = `${cx}px ${cy}px`; void a.offsetWidth; a.style.transform = s === 1 ? 'none' : `scale(${s})`; };
  window.__scroll = (sel, to, ms) => { const el = document.querySelector(sel); if (!el) return; const from = el.scrollTop; const t0 = performance.now(); const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / ms); el.scrollTop = from + (to - from) * ease(t); if (t < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  window.__bar = (a, b, ms) => { const t0 = performance.now(); const step = (now) => { const t = Math.min(1, (now - t0) / ms); const v = a + (b - a) * t;
    const f = document.getElementById('parseBarFill'); const p = document.getElementById('parsePercent'); const lp = document.querySelector('.lib-upload-pill .lup-pct');
    if (f) f.style.width = v + '%'; if (p) p.textContent = Math.round(v) + '%'; if (lp) lp.textContent = Math.round(v) + '%'; if (t < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  window.__stage = (key, msg) => { const keys = ['uploaded', 'converting', 'normalizing', 'segmenting', 'classifying', 'done']; const idx = keys.indexOf(key);
    document.querySelectorAll('.parse-progress-stage').forEach((el) => { const i = keys.indexOf(el.dataset.stage); el.classList.toggle('is-active', i === idx); el.classList.toggle('is-done', i >= 0 && i < idx); });
    const m = document.getElementById('parseMsg'); if (m) m.textContent = msg;
    const labels = { converting: 'Document conversion', normalizing: 'Normalizing layout blocks', segmenting: 'Detecting sections & clauses' };
    const lt = document.querySelector('.lib-upload-pill .lup-title'); if (lt && labels[key]) lt.textContent = labels[key]; };
  // the rail as the landing's demos show it: Simulate and Stress instead of What if (the demo only opens Simulate)
  window.__railPatch = () => {
    const wi = document.querySelector('#rail .rail-btn[data-mode="whatif"]'); if (!wi) return;
    wi.title = 'Simulate'; wi.querySelector('.rail-label').textContent = 'Simulate';
    wi.querySelector('svg').innerHTML = '<path d="M3 12h4l3-7 4 14 3-7h4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    const st = wi.cloneNode(true); st.dataset.mode = 'stress'; st.title = 'Stress'; st.classList.remove('is-active');
    st.querySelector('.rail-label').textContent = 'Stress';
    st.querySelector('svg').innerHTML = '<path d="M13 2 4 14h7l-1 8 9-12h-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>';
    st.addEventListener('click', (e) => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
    wi.after(st);
    const fix = () => { document.querySelectorAll('#modeBar .mb-eyebrow, #modeStage .eyebrow').forEach((el) => { const t = el.textContent.trim(); if (/^what\s?if$/i.test(t)) el.textContent = t === t.toUpperCase() ? 'SIMULATE' : 'Simulate'; }); };
    new MutationObserver(fix).observe(document.querySelector('.app'), { childList: true, subtree: true, characterData: true }); fix();
  };
  // the memorandum assembles itself, like the landing's report demo: eyebrow, typed verdict, counters, bar, seal, then the blocks
  window.__memoAssemble = () => {
    const root = document.querySelector('.report-layout'); if (!root) return 0;
    root.classList.add('v-assemble');
    const q = (s, r) => [...(r || root).querySelectorAll(s)];
    const wipes = []; // [el, at]
    const add = (els, at, gap) => els.forEach((el, i) => { el.setAttribute('data-vw', ''); wipes.push([el, at + i * gap]); });
    const hero = root.querySelector('.rpt-hero'); const grid = hero && hero.querySelector('.rpt-hero-grid');
    if (hero) add(q('.rpt-hero-top', hero), 0, 0);
    let title = null, typed = '';
    if (grid) {
      const leaves = [...grid.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent.trim());
      title = leaves.reduce((a, e) => (parseFloat(getComputedStyle(e).fontSize) > (a ? parseFloat(getComputedStyle(a).fontSize) : 0) ? e : a), null);
      if (title) { typed = title.textContent; title.textContent = ''; title.style.minHeight = '1.1em'; }
      add(q('p', grid).filter((p) => p !== title), 900, 160);
      // the number tiles count up
      leaves.filter((e) => /^\d+$/.test(e.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) > 18).forEach((tile, i) => {
        const n = parseInt(tile.textContent, 10); tile.textContent = '0';
        setTimeout(() => { const t0 = performance.now(); const step = (now) => { const t = Math.min(1, (now - t0) / 900); tile.textContent = String(Math.round(n * (1 - Math.pow(1 - t, 3)))); if (t < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }, 1300 + i * 120);
      });
    }
    if (title) { let k = 0; const type = () => { k++; title.textContent = typed.slice(0, k); if (k < typed.length) setTimeout(type, 34); }; setTimeout(type, 260); }
    const bar = root.querySelector('.rpt-sevbar'); if (bar) setTimeout(() => bar.classList.add('v-in'), 1900);
    if (hero) { const s = document.createElement('div'); s.className = 'v-stamp'; s.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>Signed · reproducible'; hero.appendChild(s); setTimeout(() => s.classList.add('v-in'), 2500); }
    add(q('#memoParticulars .memo-particulars > *'), 2300, 110);
    add(q('#memoParticulars .memo-side'), 2900, 0);
    add(q('#memoTerms > h3'), 3200, 0);
    add(q('#memoTerms tr'), 3300, 90);
    add(q('#memoOverview > *'), 4300, 160);
    add(q('#memoRisks > h3, #memoRisks > .memo-sub'), 4900, 120);
    add(q('#memoRisks tr'), 5100, 55);
    add(q('#memoSteps > *'), 6400, 150);
    wipes.forEach(([el, at]) => setTimeout(() => el.classList.add('v-in'), at));
    return Math.max(...wipes.map((w) => w[1])) + 700;
  };
});
await page.evaluate(() => window.__railPatch());

/* ---------------- the virtual clock: timers, rAF and every animation step 1/60 s per frame ---------------- */
await page.evaluate(() => {
  const realCT = window.clearTimeout.bind(window), realCI = window.clearInterval.bind(window);
  let now = performance.now(); const t0 = now; const dateBase = Date.now();
  const timers = new Map(); let seq = 1e7; const rafs = new Map(); let rafSeq = 1;
  performance.now = () => now;
  Date.now = () => dateBase + (now - t0);
  window.setTimeout = (fn, ms, ...args) => { const id = seq++; timers.set(id, { at: now + Math.max(0, ms || 0), fn, args, every: null }); return id; };
  window.setInterval = (fn, ms, ...args) => { const id = seq++; const every = Math.max(1, ms || 1); timers.set(id, { at: now + every, fn, args, every }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { if (!timers.delete(id)) { try { realCT(id); realCI(id); } catch (e) {} } };
  window.requestAnimationFrame = (fn) => { const id = rafSeq++; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  const seen = new WeakMap();
  window.__step = (dt) => {
    now += dt;
    for (let guard = 0; guard < 2000; guard++) {
      let best = null;
      for (const [id, t] of timers) if (t.at <= now && (!best || t.at < best[1].at)) best = [id, t];
      if (!best) break;
      const [id, t] = best;
      if (t.every) t.at += t.every; else timers.delete(id);
      try { typeof t.fn === 'function' ? t.fn.apply(null, t.args) : (0, eval)(String(t.fn)); } catch (e) { console.error(e); }
    }
    const cbs = [...rafs.values()]; rafs.clear();
    for (const cb of cbs) { try { cb(now); } catch (e) { console.error(e); } }
    for (const a of document.getAnimations()) {
      let s = seen.get(a);
      if (s === undefined) { s = now - (a.currentTime || 0); seen.set(a, s); try { a.pause(); } catch (e) {} }
      try { a.currentTime = Math.max(0, now - s); } catch (e) {}
    }
    return now;
  };
});

/* ---------------- capture + stepping ---------------- */
let cdp = null, frameNo = 0, pending = 0;
if (MODE === 'take') cdp = await ctx.newCDPSession(page);
async function capture() {
  if (!cdp) return;
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const file = path.join(OUT, `f${String(frameNo++).padStart(6, '0')}.jpg`);
  pending++; fs.writeFile(file, Buffer.from(data, 'base64'), () => { pending--; });
  while (pending > 40) await realSleep(20);
}
async function frame(extra) { // one frame: optional page-side work, then step the clock, then capture
  await page.evaluate(([dt, ex]) => { if (ex) (0, eval)(ex); return window.__step(dt); }, [FRAME, extra || null]);
  vclock += FRAME;
  if (cdp) await capture(); else await realSleep(6); // the network (mocked and real) still needs real time to answer
}
async function tick(ms) { const n = Math.max(1, Math.round(ms / FRAME)); for (let i = 0; i < n; i++) await frame(); }
async function until(cond, maxMs = 15000) { // cond is the source of an arrow function; it is called in the page each frame
  const src = `(${cond})()`; const n = Math.round(maxMs / FRAME);
  for (let i = 0; i < n; i++) { if (await page.evaluate(src)) return true; await frame(); }
  console.log('TIMEOUT waiting for', cond.toString().slice(0, 80)); return false;
}
let cur = { x: 1200, y: 640 };
await page.mouse.move(cur.x, cur.y); await page.evaluate(([x, y]) => window.__cur(x, y), [cur.x / ZOOM, cur.y / ZOOM]);
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
async function moveTo(x, y, ms = 700) {
  const from = { ...cur }; const n = Math.max(6, Math.round(ms / FRAME));
  for (let i = 1; i <= n; i++) {
    const t = easeIO(i / n); const px = from.x + (x - from.x) * t, py = from.y + (y - from.y) * t;
    await page.mouse.move(px, py);
    await frame(`window.__cur(${px / ZOOM},${py / ZOOM})`);
  }
  cur = { x, y };
}
async function box(sel, nth = 0) { // Playwright selectors (":has-text") — resolved by the locator, frames stepped while we wait
  for (let i = 0; i < Math.round(8000 / FRAME); i++) {
    const b = await page.locator(sel).nth(nth).boundingBox({ timeout: 150 }).catch(() => null);
    if (b && b.width > 0) return b;
    await frame();
  }
  throw new Error('no box ' + sel);
}
async function clickBox(b, ms = 700, dx = 0.5, dy = 0.5) {
  await moveTo(b.x + b.width * dx, b.y + b.height * dy, ms); await tick(120);
  await page.evaluate(([x, y]) => window.__ripple(x, y), [cur.x / ZOOM, cur.y / ZOOM]);
  await page.mouse.down(); await tick(80); await page.mouse.up();
}
async function click(sel, ms = 700, nth = 0) { return clickBox(await box(sel, nth), ms); }
const emit = (type, data) => page.evaluate(([t, d]) => window.__emit(t, d), [type, data ?? null]);
const cap = (n, t) => page.evaluate(([a, b]) => window.__cap(a, b), [n, t]);
const capOff = () => page.evaluate(() => window.__capOff());
const cam = (s, cx = null, cy = null, ms = 1200) => page.evaluate(([a, b, c, d]) => window.__cam(a, b, c, d), [s, cx == null ? null : cx / ZOOM, cy == null ? null : cy / ZOOM, ms]);
const scrollTo = (sel, to, ms) => page.evaluate(([s, t, m]) => window.__scroll(s, t, m), [sel, to, ms]);
async function railTo(mode, ms = 650) { // dip, click, settle
  const b = await box(`#rail .rail-btn[data-mode="${mode}"]`);
  await moveTo(b.x + b.width / 2, b.y + b.height / 2, ms); await tick(100);
  await page.evaluate(([x, y]) => { window.__ripple(x, y); window.__flash(); }, [cur.x / ZOOM, cur.y / ZOOM]);
  await tick(160); await page.mouse.down(); await tick(60); await page.mouse.up();
  await tick(60); await page.evaluate(() => window.__settle());
}
let shotN = 0;
const shot = async (name) => { if (MODE === 'dry') await page.screenshot({ path: path.join(DRY, `${String(shotN++).padStart(2, '0')}-${name}.png`) }); };

/* =============================== THE FILM =============================== */
mark('title card'); await shot('title'); await tick(1250);
await page.evaluate(() => window.__cardOff()); await tick(650);
mark('act 1 · upload'); await shot('draft-empty');

/* --- Act 1: upload + parse --- */
await cap('01 · Upload', 'Drop in the contract. PDF or DOCX.');
await click('#modeBar button:has-text("Upload")', 700); await tick(420);
await page.setInputFiles('#uploadInput', PDF); await tick(600); await shot('upload-picked');
await click('#uploadConfirm', 600);
await until('() => window.__esCount >= 1 && window.__es.readyState === 1', 8000);
await tick(120);
await emit('stage', { stage: 'uploaded', percent: 5, message: 'File received' });
await cam(1.12, 960, 500, 1300); await capOff(); await tick(250);
for (const [key, msg, a, b, ms] of [['converting', 'Reading 9 pages…', 8, 42, 1050], ['normalizing', 'Normalizing layout blocks…', 42, 58, 550], ['segmenting', 'Detecting sections, clauses and sub-clauses…', 58, 84, 950]]) {
  await page.evaluate(([k, m, x, y, z]) => { window.__stage(k, m); window.__bar(x, y, z); }, [key, msg, a, b, ms]);
  await tick(ms + 30);
}
await shot('parse-mid');
await emit('stage', { stage: 'classifying', percent: 96, message: 'Classifying clauses, signatures, tables and entities…' }); await tick(600);
await emit('stage', { stage: 'done', percent: 100, message: 'Parsed' }); await tick(200);
await cam(1, null, null, 800);
await emit('done');
await until('() => !document.getElementById("modalRoot").classList.contains("is-open") && document.querySelector("#modeStage") && document.querySelector("#modeStage").scrollHeight > 3000', 15000);
mark('act 1b · parsed'); await tick(400); await shot('parsed');

/* --- Act 1b: the parsed document --- */
await cap('02 · Parsed', 'Every clause, numbered and addressed.');
await cam(1.035, 1180, 600, 5200);
await scrollTo('#modeStage', 1450, 4600); await tick(4700);
await shot('parsed-scrolled'); await capOff();
await cam(1, null, null, 650); await tick(650);

/* --- Act 2: detection --- */
mark('act 2 · detect');
await railTo('detect'); await tick(500); await shot('detect-empty');
await cap('03 · Detect', 'Plays the contract forward, scenario by scenario.');
await click('#runDetectBtn', 700);
await until('() => window.__esCount >= 2 && window.__es.readyState === 1', 8000);
await tick(80);
await cam(1.05, 1150, 470, 2500);
const RUN = [
  [0.00, 'queued', 1.0, 'Queued for analysis'], [0.20, 'analyzing', 72.0, 'Translating clauses into the contract model…'], [0.55, 'analyzing', 72.7, 'Reading the contract frame…'], [0.80, 'analyzing', 73.2, 'Modelling 14 clause groups…'],
  ...Array.from({ length: 14 }, (_, i) => [1.05 + i * 0.11, 'analyzing', 73.4 + i * 0.2, `Modelled ${i + 1} of 14 clause groups…`]),
  [2.70, 'analyzing', 76.4, 'Checking every extracted fact against the document…'], [3.05, 'analyzing', 76.8, 'World built: 15 obligations, 16 powers, 2 remedies'], [3.35, 'analyzing', 78.4, 'Reading the contract for clauses that contradict each other…'], [3.65, 'analyzing', 79.8, 'Designing scenarios specific to this contract…'], [3.95, 'analyzing', 80.5, 'Checking each finding against the clauses it cites…'], [4.30, 'analyzing', 83.0, 'Simulating 13 scenarios…'],
  ...Array.from({ length: 13 }, (_, i) => [4.5 + i * 0.12, 'analyzing', 84.0 + i * 0.28, `Simulated ${i + 1} of 13 scenarios…`]),
  [6.10, 'analyzing', 89.7, 'Looking for reachable bad states in the traces…'], [6.40, 'analyzing', 93.4, 'Ordering the findings by what matters on this contract…'], [6.65, 'analyzing', 94.1, 'Writing the report…'],
];
let runClock = 0;
for (const [t, stage, percent, message] of RUN) { const at = t * 850; if (at > runClock) { await tick(at - runClock); runClock = at; } await emit('stage', { stage, percent, message, ts: Date.now() / 1000 }); }
await shot('run-late');
for (let i = 0; i < FINDINGS.length; i++) { await emit('finding', FINDINGS[i]); await tick(35); }
await tick(200);
flags.runDone = true;
await emit('stage', { stage: 'analyzing', percent: 95.0, message: 'Report ready' });
await emit('stage', { stage: 'reporting', percent: 95.0, message: 'Writing signed report…' });
await emit('stage', { stage: 'done', percent: 100, message: 'Report ready' });
await emit('done');
await until('() => document.querySelectorAll(".issue-card").length >= 21', 20000);
mark('act 2b · findings'); await cam(1, null, null, 800); await tick(900); await shot('findings');
await cap('04 · Findings', '21 findings. Each with a clause and a trace.');
await tick(500);
const card = await box('.issue-card:not(.is-resolved)');
await clickBox(card, 650, 0.35, 0.5); await tick(500); await shot('detail');
await cam(1.05, 1150, 640, 1500);
const st0 = await page.evaluate(() => document.querySelector('#modeStage').scrollTop);
await scrollTo('#modeStage', st0 + 330, 1300); await tick(1400);
await tick(700); await capOff();
await cam(1, null, null, 600); await tick(600);

/* --- Act 3: simulate --- */
mark('act 3 · simulate');
await railTo('whatif');
await until('() => !!document.querySelector(".wi-scen")', 8000); await tick(500); await shot('simulate');
await cap('05 · Simulate', 'Ask what happens. Watch it play out.');
const scenId = 'probe_4_missing_deadline';
const hTop = await page.evaluate((id) => { const el = document.querySelector(`.wi-scen[data-scen="${id}"]`); const st = document.querySelector('#modeStage'); return el.getBoundingClientRect().top / (4 / 3) + st.scrollTop - 250; }, scenId);
await scrollTo('#modeStage', Math.max(0, hTop), 1000); await tick(1100);
await page.evaluate(() => { const o = new MutationObserver(() => { document.querySelectorAll('.stress-verdict:not(.v-anim)').forEach((v) => v.classList.add('v-anim')); }); o.observe(document.querySelector('#modeStage'), { childList: true, subtree: true }); });
await click(`.wi-scen[data-scen="${scenId}"]`, 750);
await until('() => !!document.querySelector(".stress-verdict.v-anim")', 8000);
await scrollTo('#modeStage', 0, 600); await tick(700);
await cam(1.05, 1150, 520, 2600); await shot('simulate-answer');
await tick(2000);
const stepsBottom = await page.evaluate(() => { const el = document.querySelector('.sv-steps'); const st = document.querySelector('#modeStage'); if (!el) return 0; return Math.max(0, el.getBoundingClientRect().bottom / (4 / 3) + st.scrollTop - 780); });
await scrollTo('#modeStage', stepsBottom, 1400); await tick(1900); await shot('simulate-steps');
await capOff(); await cam(1, null, null, 600); await tick(600);

/* --- Act 4: the memorandum assembles --- */
mark('act 4 · report');
await railTo('report');
await until('() => !!document.querySelector("#memoParticulars") && !!document.querySelector(".rpt-hero")', 15000);
const assembleMs = await page.evaluate(() => window.__memoAssemble());
await tick(300); await shot('report-start');
await cap('06 · Memorandum', 'Signed, reproducible, ready to hand over.');
await cam(1.04, 1170, 560, 4600);
await tick(2500); await shot('report-typed');
await scrollTo('#modeStage', 1150, 4200); await tick(4300); await shot('report-scrolled');
await capOff();
const exp = await box('#modeBar button:has-text("Export")');
await moveTo(exp.x + exp.width / 2, exp.y + exp.height / 2, 650); await tick(650);
await cam(1, null, null, 500);
mark('end card');
await page.evaluate(() => window.__cardEnd()); await tick(2500); await shot('end');
while (pending > 0) await realSleep(30);

const usage1 = await page.evaluate(async () => (await window.SentinelAPI.getUsage()).governance.user_spent_usd);
fs.writeFileSync(path.join(MODE === 'take' ? OUT : DRY, 'requests.txt'), reqlog.join('\n') + '\n');
console.log('frames', frameNo, 'virtual', (vclock / 1000).toFixed(1) + 's', 'assemble', assembleMs);
console.log('BLOCKED requests:', reqlog.filter((l) => l.includes('BLOCKED')));
console.log('usage before/after', usage0, usage1, usage0 === usage1 ? 'OK (no spend)' : '!!! SPEND DETECTED !!!');
mark('done');
await browser.close();

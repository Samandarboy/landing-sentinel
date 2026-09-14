/* record.mjs — films the Sentinel interface for the landing page.
   node record.mjs dry   -> no capture, screenshots at every beat + request log
   node record.mjs take  -> CDP screencast frames to ./take + frames.txt for ffmpeg
   Analysis is REPLAYED (mocked routes + fake EventSource). No paid endpoint is ever reached:
   everything outside the allow-list is aborted, and usage is asserted unchanged at the end. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODE = process.argv[2] || 'dry';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const JOB = '61be98477d8f';
const ZOOM = 4 / 3;                       // css zoom: 1440x810 layout rendered into 1920x1080
const APP = process.env.FILM_APP || 'http://127.0.0.1:8085/index.html';
const PDF = process.env.FILM_PDF || path.join(HERE, '..', '..', '..', 'data', 'users', 'befd989bf15e0d8b', 'uploads', '61be98477d8f', 'vantage_en.pdf');
const FINDINGS = JSON.parse(fs.readFileSync(path.join(HERE, 'run_findings.json'), 'utf8'));
const OUT = path.join(HERE, 'take');
const DRY = path.join(HERE, 'dry');
for (const d of [OUT, DRY]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const mark = (s) => console.log(((Date.now() - T0) / 1000).toFixed(1).padStart(5) + 's  ' + s);

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
  const log = (how) => reqlog.push(`${((Date.now() - T0) / 1000).toFixed(1)}s ${how.padEnd(8)} ${m} ${p}${u.search}`);
  const json = (body, status = 200) => { log('mock' + status); return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }); };
  if (m === 'POST' && p === '/api/upload') { await sleep(420); flags.uploaded = true; return json({ job_id: JOB, filename: 'vantage_en.pdf', pipeline: false, status: 'queued' }); }
  if (m === 'POST' && p === `/api/parse/${JOB}/stream-ticket`) return json({ ticket: 'film' });
  if (m === 'POST' && p === `/api/parse/${JOB}/save`) return json({ ok: true, job_id: JOB, saved: true });
  if (m === 'POST' && p === `/api/documents/${JOB}/analyze`) { await sleep(300); return json({ job_id: JOB, status: 'running', queued: true }); }
  if (m === 'GET' && p === `/api/documents/${JOB}/cost-estimate`) return json({ detail: 'estimate unavailable' }, 404);
  if (m === 'GET' && p === '/api/parse/list') {
    if (!flags.uploaded) return json({ items: [] });
    const r = await route.fetch(); const body = await r.json();
    for (const it of body.items || []) if (it.job_id === JOB && !flags.runDone) { it.has_report = false; it.report_summary = null; }
    log('rewrite'); return route.fulfill({ response: r, body: JSON.stringify(body) });
  }
  if (m === 'GET' && p === `/api/reports/${JOB}`) {
    if (!flags.runDone) return json({ detail: 'report not ready' }, 404);
    log('pass'); return route.continue();
  }
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
    _fire(t, ev) {
      for (const fn of (this._l[t] || [])) { try { fn(ev); } catch (e) { console.error(e); } }
      const h = this['on' + t]; if (typeof h === 'function') { try { h(ev); } catch (e) {} }
    }
  };
  window.__emit = (type, data) => {
    const es = window.__es; if (!es || es.readyState !== 1) return false;
    es._fire(type, { data: data == null ? undefined : (typeof data === 'string' ? data : JSON.stringify(data)) }); return true;
  };
});

/* ---------------- boot + login ---------------- */
await page.goto(APP, { waitUntil: 'domcontentloaded' }); await sleep(1200);
await page.evaluate(async () => { await window.SentinelAPI.login('admin', 'admin1234'); });
const usage0 = await page.evaluate(async () => (await window.SentinelAPI.getUsage()).governance.user_spent_usd);
await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500);

/* ---------------- overlay: zoom, cursor, captions, cards, camera ---------------- */
const STAGGER = Array.from({ length: 16 }, (_, i) => `.stress-verdict.v-anim .sv-tl>li:nth-child(${i + 1}){animation-delay:${(0.35 + i * 0.2).toFixed(2)}s}`).join('\n');
await page.addStyleTag({ content: `
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
` });
await page.evaluate(() => {
  const mk = (id, html) => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; document.body.appendChild(d); return d; };
  mk('vcur', '<svg width="22" height="27" viewBox="0 0 22 27"><path d="M3 2 L3 21 L8.2 16.4 L11.6 24.2 L15 22.7 L11.6 15 L18.4 15 Z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>');
  mk('vrip', ''); mk('vcap', '<span class="n"></span><span class="t"></span>');
  const MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#f7f8f8"/><rect x="6" y="10.5" width="12" height="3" rx="1.5" fill="#08090a"/></svg>';
  mk('vcard', `<div class="brand in">${MARK}Sentinel</div><div class="s in" style="animation-delay:.15s">A contract, read adversarially.</div>`);
  window.__cur = (x, y) => { document.getElementById('vcur').style.transform = `translate(${x}px,${y}px)`; };
  window.__ripple = (x, y) => { const r = document.getElementById('vrip'); r.style.left = x + 'px'; r.style.top = y + 'px'; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); };
  window.__cap = (n, t) => { const c = document.getElementById('vcap'); c.querySelector('.n').textContent = n; c.querySelector('.t').textContent = t; c.classList.add('on'); };
  window.__capOff = () => document.getElementById('vcap').classList.remove('on');
  window.__cardOff = () => document.getElementById('vcard').classList.add('off');
  window.__cardEnd = () => {
    const c = document.getElementById('vcard');
    c.innerHTML = `<div class="h in">Every clause. Every scenario.<br>Proven before you sign.</div><div class="pill in" style="animation-delay:.2s">${MARK}Sentinel · Book a demo</div>`;
    c.classList.remove('off');
  };
  window.__cam = (s, cx, cy, ms) => {
    const a = document.getElementById('app'); a.style.transition = `transform ${ms}ms cubic-bezier(.2,.7,.2,1)`;
    if (cx != null) a.style.transformOrigin = `${cx}px ${cy}px`; void a.offsetWidth;
    a.style.transform = s === 1 ? 'none' : `scale(${s})`;
  };
  window.__scroll = (sel, to, ms) => new Promise((res) => {
    const el = document.querySelector(sel); if (!el) return res();
    const from = el.scrollTop; const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / ms); el.scrollTop = from + (to - from) * ease(t); if (t < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  });
  window.__bar = (a, b, ms) => new Promise((res) => {
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms); const v = a + (b - a) * t;
      const f = document.getElementById('parseBarFill'); const p = document.getElementById('parsePercent'); const lp = document.querySelector('.lib-upload-pill .lup-pct');
      if (f) f.style.width = v + '%'; if (p) p.textContent = Math.round(v) + '%'; if (lp) lp.textContent = Math.round(v) + '%';
      if (t < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
  window.__stage = (key, msg) => {
    const keys = ['uploaded', 'converting', 'normalizing', 'segmenting', 'classifying', 'done']; const idx = keys.indexOf(key);
    document.querySelectorAll('.parse-progress-stage').forEach((el) => { const i = keys.indexOf(el.dataset.stage); el.classList.toggle('is-active', i === idx); el.classList.toggle('is-done', i >= 0 && i < idx); });
    const m = document.getElementById('parseMsg'); if (m) m.textContent = msg;
    const labels = { converting: 'Document conversion', normalizing: 'Normalizing layout blocks', segmenting: 'Detecting sections & clauses' };
    const lt = document.querySelector('.lib-upload-pill .lup-title'); if (lt && labels[key]) lt.textContent = labels[key];
  };
});

/* ---------------- helpers (visual px = layout px * ZOOM) ---------------- */
let cur = { x: 1200, y: 640 };
await page.mouse.move(cur.x, cur.y); await page.evaluate(([x, y]) => window.__cur(x, y), [cur.x / ZOOM, cur.y / ZOOM]);
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
async function moveTo(x, y, ms = 700) {
  const from = { ...cur }; const n = Math.max(6, Math.round(ms / 18));
  for (let i = 1; i <= n; i++) {
    const t = easeIO(i / n); const px = from.x + (x - from.x) * t, py = from.y + (y - from.y) * t;
    await page.mouse.move(px, py); await page.evaluate(([a, b]) => window.__cur(a, b), [px / ZOOM, py / ZOOM]); await sleep(12);
  }
  cur = { x, y };
}
async function box(sel, nth = 0) { const loc = page.locator(sel).nth(nth); await loc.waitFor({ state: 'visible', timeout: 8000 }); const b = await loc.boundingBox(); if (!b) throw new Error('no box ' + sel); return b; }
async function clickBox(b, ms = 700, dx = 0.5, dy = 0.5) {
  await moveTo(b.x + b.width * dx, b.y + b.height * dy, ms); await sleep(120);
  await page.evaluate(([x, y]) => window.__ripple(x, y), [cur.x / ZOOM, cur.y / ZOOM]);
  await page.mouse.down(); await sleep(80); await page.mouse.up();
}
async function click(sel, ms = 700, nth = 0) { return clickBox(await box(sel, nth), ms); }
const emit = (type, data) => page.evaluate(([t, d]) => window.__emit(t, d), [type, data ?? null]);
const cap = (n, t) => page.evaluate(([a, b]) => window.__cap(a, b), [n, t]);
const capOff = () => page.evaluate(() => window.__capOff());
const cam = (s, cx = null, cy = null, ms = 1200) => page.evaluate(([a, b, c, d]) => window.__cam(a, b, c, d), [s, cx == null ? null : cx / ZOOM, cy == null ? null : cy / ZOOM, ms]);
const scrollTo = (sel, to, ms) => page.evaluate(([s, t, m]) => window.__scroll(s, t, m), [sel, to, ms]);
let shotN = 0;
const shot = async (name) => { if (MODE === 'dry') await page.screenshot({ path: path.join(DRY, `${String(shotN++).padStart(2, '0')}-${name}.png`) }); };

/* ---------------- capture ---------------- */
const frames = []; let cdp = null; let pending = 0;
async function startCast() {
  if (MODE !== 'take') return;
  cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const i = frames.length; const file = path.join(OUT, `f${String(i).padStart(6, '0')}.jpg`);
    frames.push({ file, ts: metadata.timestamp }); pending++;
    fs.writeFile(file, Buffer.from(data, 'base64'), () => { pending--; });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
}
async function stopCast() {
  if (!cdp) return;
  await cdp.send('Page.stopScreencast').catch(() => {});
  while (pending > 0) await sleep(50);
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const d = i + 1 < frames.length ? Math.max(0.001, frames[i + 1].ts - frames[i].ts) : 0.5;
    lines.push(`file '${path.basename(frames[i].file)}'`, `duration ${d.toFixed(4)}`);
  }
  if (frames.length) lines.push(`file '${path.basename(frames[frames.length - 1].file)}'`);
  fs.writeFileSync(path.join(OUT, 'frames.txt'), lines.join('\n') + '\n');
  console.log('frames', frames.length, 'span', frames.length ? (frames[frames.length - 1].ts - frames[0].ts).toFixed(1) + 's' : '-');
}

/* =============================== THE FILM =============================== */
await startCast();
mark('title card'); await shot('title');
await sleep(1250);
await page.evaluate(() => window.__cardOff()); await sleep(600);
mark('act 1 · upload'); await shot('draft-empty');
if (MODE === 'dry') console.log('modebar odd bits:', await page.evaluate(() => [...document.querySelectorAll('#modeBar *')].filter((e) => e.children.length <= 1 && /^\s*\d+\s*$/.test(e.textContent)).map((e) => e.outerHTML.slice(0, 160))));

/* --- Act 1: upload + parse --- */
await cap('01 · Upload', 'Drop in the contract. PDF or DOCX.');
await click('#modeBar button:has-text("Upload")', 700); await sleep(420);
await page.setInputFiles('#uploadInput', PDF); await sleep(600); await shot('upload-picked');
await click('#uploadConfirm', 600);
await page.waitForFunction(() => window.__esCount >= 1 && window.__es.readyState === 1, null, { timeout: 8000 });
await sleep(120);
await emit('stage', { stage: 'uploaded', percent: 5, message: 'File received' });
await cam(1.12, 960, 500, 1300);
await capOff();
await sleep(250);
for (const [key, msg, a, b, ms] of [['converting', 'Reading 9 pages…', 8, 42, 1050], ['normalizing', 'Normalizing layout blocks…', 42, 58, 550], ['segmenting', 'Detecting sections, clauses and sub-clauses…', 58, 84, 950]]) {
  await page.evaluate(([k, m]) => window.__stage(k, m), [key, msg]);
  await page.evaluate(([x, y, z]) => window.__bar(x, y, z), [a, b, ms]);
}
await shot('parse-mid');
await emit('stage', { stage: 'classifying', percent: 96, message: 'Classifying clauses, signatures, tables and entities…' }); await sleep(600);
await emit('stage', { stage: 'done', percent: 100, message: 'Parsed' }); await sleep(200);
await cam(1, null, null, 800);
await emit('done');
await page.waitForFunction(() => !document.getElementById('modalRoot').classList.contains('is-open') && document.querySelector('#modeStage') && document.querySelector('#modeStage').scrollHeight > 3000, null, { timeout: 15000 });
mark('act 1b · parsed'); await sleep(400); await shot('parsed');

/* --- Act 1b: the parsed document --- */
await cap('02 · Parsed', 'Every clause, numbered and addressed.');
await cam(1.035, 1180, 600, 5200);
await scrollTo('#modeStage', 1450, 4600);
await sleep(250); await shot('parsed-scrolled');
await capOff();
await cam(1, null, null, 650); await sleep(650);

/* --- Act 2: detection --- */
mark('act 2 · detect');
await click('#rail .rail-btn[data-mode="detect"]', 650); await sleep(600); await shot('detect-empty');
await cap('03 · Detect', 'Plays the contract forward, scenario by scenario.');
await click('#runDetectBtn', 700);
await page.waitForFunction(() => window.__esCount >= 2 && window.__es.readyState === 1, null, { timeout: 8000 });
await sleep(80);
await cam(1.05, 1150, 470, 2500);
const RUN = [
  [0.00, 'queued', 1.0, 'Queued for analysis'], [0.20, 'analyzing', 72.0, 'Translating clauses into the contract model…'], [0.55, 'analyzing', 72.7, 'Reading the contract frame…'], [0.80, 'analyzing', 73.2, 'Modelling 14 clause groups…'],
  ...Array.from({ length: 14 }, (_, i) => [1.05 + i * 0.11, 'analyzing', 73.4 + i * 0.2, `Modelled ${i + 1} of 14 clause groups…`]),
  [2.70, 'analyzing', 76.4, 'Checking every extracted fact against the document…'], [3.05, 'analyzing', 76.8, 'World built: 15 obligations, 16 powers, 2 remedies'], [3.35, 'analyzing', 78.4, 'Reading the contract for clauses that contradict each other…'], [3.65, 'analyzing', 79.8, 'Designing scenarios specific to this contract…'], [3.95, 'analyzing', 80.5, 'Checking each finding against the clauses it cites…'], [4.30, 'analyzing', 83.0, 'Simulating 13 scenarios…'],
  ...Array.from({ length: 13 }, (_, i) => [4.5 + i * 0.12, 'analyzing', 84.0 + i * 0.28, `Simulated ${i + 1} of 13 scenarios…`]),
  [6.10, 'analyzing', 89.7, 'Looking for reachable bad states in the traces…'], [6.40, 'analyzing', 93.4, 'Ordering the findings by what matters on this contract…'], [6.65, 'analyzing', 94.1, 'Writing the report…'],
];
const runStart = Date.now();
for (const [t, stage, percent, message] of RUN) { const wait = runStart + t * 850 - Date.now(); if (wait > 0) await sleep(wait); await emit('stage', { stage, percent, message, ts: Date.now() / 1000 }); }
await shot('run-late');
for (let i = 0; i < FINDINGS.length; i++) { await emit('finding', FINDINGS[i]); await sleep(35); }
await sleep(200);
flags.runDone = true;
await emit('stage', { stage: 'analyzing', percent: 95.0, message: 'Report ready' });
await emit('stage', { stage: 'reporting', percent: 95.0, message: 'Writing signed report…' });
await emit('stage', { stage: 'done', percent: 100, message: 'Report ready' });
await emit('done');
await page.waitForFunction(() => document.querySelectorAll('.issue-card').length >= 21, null, { timeout: 20000 });
mark('act 2b · findings'); await cam(1, null, null, 800); await sleep(900); await shot('findings');
await cap('04 · Findings', '21 findings. Each with a clause and a trace.');
await sleep(500);
const card = await box('.issue-card:not(.is-resolved)');
await clickBox(card, 650, 0.35, 0.5); await sleep(500); await shot('detail');
await cam(1.05, 1150, 640, 1500);
await scrollTo('#modeStage', await page.evaluate(() => document.querySelector('#modeStage').scrollTop + 330), 1300);
await sleep(800);
await capOff();
await cam(1, null, null, 600); await sleep(600);

/* --- Act 3: what if --- */
mark('act 3 · what if');
await click('#rail .rail-btn[data-mode="whatif"]', 650);
await page.waitForSelector('.wi-scen', { timeout: 8000 }); await sleep(500); await shot('whatif');
await cap('05 · What if', 'Ask what happens. Watch it play out.');
const scenId = 'probe_4_missing_deadline';
const hTop = await page.evaluate((id) => { const el = document.querySelector(`.wi-scen[data-scen="${id}"]`); const st = document.querySelector('#modeStage'); return el.getBoundingClientRect().top / (4 / 3) + st.scrollTop - 250; }, scenId);
await scrollTo('#modeStage', Math.max(0, hTop), 1000); await sleep(120);
await page.evaluate(() => {
  const o = new MutationObserver(() => { document.querySelectorAll('.stress-verdict:not(.v-anim)').forEach((v) => v.classList.add('v-anim')); });
  o.observe(document.querySelector('#modeStage'), { childList: true, subtree: true }); window.__wiObs = o;
});
await click(`.wi-scen[data-scen="${scenId}"]`, 750);
await page.waitForSelector('.stress-verdict.v-anim', { timeout: 8000 });
await scrollTo('#modeStage', 0, 600);
await sleep(150); await cam(1.05, 1150, 520, 2600); await shot('whatif-answer');
await sleep(2000);
const stepsBottom = await page.evaluate(() => { const el = document.querySelector('.sv-steps'); const st = document.querySelector('#modeStage'); if (!el) return 0; return Math.max(0, el.getBoundingClientRect().bottom / (4 / 3) + st.scrollTop - 780); });
await scrollTo('#modeStage', stepsBottom, 1400); await sleep(450); await shot('whatif-steps');
await capOff();
await cam(1, null, null, 600); await sleep(600);

/* --- Act 4: memorandum --- */
mark('act 4 · report');
await click('#rail .rail-btn[data-mode="report"]', 650);
await page.waitForSelector('#memoParticulars', { timeout: 15000 }); await sleep(800); await shot('report');
await cap('06 · Memorandum', 'A memorandum you can hand over. PDF or DOCX.');
await cam(1.04, 1170, 560, 4200);
await scrollTo('#modeStage', 1150, 3800); await shot('report-scrolled');
await capOff();
const exp = await box('#modeBar button:has-text("Export")');
await moveTo(exp.x + exp.width / 2, exp.y + exp.height / 2, 650); await sleep(650);
await cam(1, null, null, 500);
mark('end card');
await page.evaluate(() => window.__cardEnd()); await sleep(2500); await shot('end');
await stopCast();

const usage1 = await page.evaluate(async () => (await window.SentinelAPI.getUsage()).governance.user_spent_usd);
fs.writeFileSync(path.join(MODE === 'take' ? OUT : DRY, 'requests.txt'), reqlog.join('\n') + '\n');
console.log('BLOCKED requests:', reqlog.filter((l) => l.includes('BLOCKED')).length, reqlog.filter((l) => l.includes('BLOCKED')).slice(0, 8));
console.log('usage before/after', usage0, usage1, usage0 === usage1 ? 'OK (no spend)' : '!!! SPEND DETECTED !!!');
mark('done');
await browser.close();

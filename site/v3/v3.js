// Sentinel landing v3: the motion layer. Scroll drives geometry (GSAP ScrollTrigger on sticky tracks, nothing is pinned by script), time drives words
// (Motion's spring through the Web Animations API, so text stays on the compositor). The window is the real interface, frozen (theatre/theatre.js).
// Everything degrades: no GSAP or reduced motion leaves a static page with every state shown.
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduced = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(pointer: fine)');
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var anim = hasGsap && !reduced;
  var hasSplit = typeof window.SplitText !== 'undefined';
  var Theatre = window.SentinelTheatre;
  var lenis = null, slowBy = 1;
  var DESK = '(min-width: 1025px)';

  /* the bundled sample's nine findings, as its report states them; `side` is what the report says from each chair */
  var FINDINGS = [
    { sev: 'critical', t: 'The other side can walk away at your cost', refs: ['7.3', '4.1', '4.3', '7.4'], when: 0, bank: 'against', supplier: 'favour', sure: false },
    { sev: 'high', t: 'A reference to a clause that does not exist', refs: ['8.4'], when: 0, bank: 'unclear', supplier: 'unclear', sure: true },
    { sev: 'high', t: 'A term left to be agreed and never fixed', refs: ['4.4'], when: 0, bank: 'both', supplier: 'both', sure: true },
    { sev: 'high', t: 'Two clauses give the same thing to different owners', refs: ['9.3', '9.4'], when: 0, bank: 'both', supplier: 'both', sure: true },
    { sev: 'medium', t: 'A table does not add up', refs: ['4.3'], when: 1, bank: 'unclear', supplier: 'unclear', sure: true },
    { sev: 'medium', t: 'A term used but never defined', refs: ['10.4'], when: 1, bank: 'against', supplier: 'favour', sure: true },
    { sev: 'low', t: 'No consequence for a confidentiality breach', refs: [], when: 2, bank: 'both', supplier: 'both', sure: false, gone: 'The contract asks for confidentiality and says nothing about what follows a breach.' },
    { sev: 'low', t: 'Silent on a change of control', refs: [], when: 2, bank: 'both', supplier: 'both', sure: false, gone: 'If the supplier is bought, the contract says nothing about what happens next.' },
    { sev: 'low', t: 'No roles set for personal data', refs: [], when: 2, bank: 'unclear', supplier: 'unclear', sure: false, gone: 'The contract is silent on who handles personal data, and in what role.' }
  ];
  var WHEN = ['Fix before signing', 'Can wait for a side letter', 'Just keep an eye on it'];
  var STANCE = { against: 'Against you', favour: 'In your favour', both: 'Affects both sides', unclear: 'Unclear' };

  /* the sample's clauses for the wall, in the contract's order and in its own words */
  var WALL = [
    ['3.1', 'The Supplier shall deliver each Deliverable by its delivery date in Schedule 1.'],
    ['3.2', 'The Bank shall test each Deliverable and, within ten (10) Business Days after its delivery, either accept it in writing or notify the Supplier of each defect found.'],
    ['3.3', 'If the Bank neither accepts a Deliverable nor notifies a defect within the period in clause 3.2, the Deliverable is deemed accepted at the end of that period.'],
    ['3.5', 'If a Deliverable fails the test in clause 3.2 three times, the Bank may terminate this Agreement by notice with immediate effect.'],
    ['4.1', 'The Bank shall pay the implementation fee of GBP 120,000 (the "Implementation Fee") in two instalments: GBP 60,000 on 15 February 2026, and GBP 60,000 within 30 days after the later of (a) the acceptance of the last Deliverable and (b) the Bank\'s receipt of a valid invoice for it.'],
    ['4.2', 'The Implementation Fee and the first year\'s licence fee are made up as follows:'],
    ['4.3', 'The Bank shall pay the support fees quarterly in advance as follows:'],
    ['4.4', 'The licence and support fees for the second year shall be agreed by the parties in good faith before the end of the first year.'],
    ['|'],
    ['4.5', 'All sums are exclusive of VAT, which the Bank shall pay at the applicable rate on receipt of a valid VAT invoice.'],
    ['4.6', 'All payments shall be made without any deduction for tax unless a deduction is required by law. If the Bank is required by law to deduct tax from a payment, the Supplier shall increase the payment so that the Bank receives the amount it would have received had no deduction been made.'],
    ['4.7', 'The Bank shall pay each undisputed invoice within 30 days after receiving it. Interest accrues on any late payment at 4% a year above the Bank of England base rate from the due date until payment.'],
    ['5.1', 'Either party may request a change to the Services by written notice describing the change.'],
    ['5.2', 'No change binds either party unless it is set out in a Change Order signed by an authorised representative of each party.'],
    ['6.1', 'Each party shall keep the other party\'s Confidential Information confidential, use it only to perform this Agreement and disclose it only to its employees and professional advisers who need to know it and are bound by duties of confidence no less strict than this clause.'],
    ['|'],
    ['7.1', 'This Agreement starts on the Effective Date and continues for 24 months unless terminated earlier under this clause 7.'],
    ['7.2', 'Either party may terminate this Agreement by notice if the other party commits a material breach of it and does not remedy the breach within 30 days after receiving notice requiring it to do so.'],
    ['7.3', 'The Supplier may terminate this Agreement for convenience by giving the Bank not less than 60 days\' notice.'],
    ['7.4', 'All fees paid under this Agreement are non-refundable.'],
    ['7.5', 'Clause 6 survives the expiry or termination of this Agreement for five years.'],
    ['7.6', 'On expiry or termination of this Agreement, each party shall return or destroy the other party\'s Confidential Information within 30 days.'],
    ['8.1', 'Subject to clause 8.2, the total liability of each party under or in connection with this Agreement shall not exceed the fees paid and payable in the 12 months before the event giving rise to the claim.'],
    ['8.2', 'The limit in clause 8.1 does not apply to a breach of clause 6 or to the indemnity in clause 8.3.'],
    ['8.3', 'The Supplier shall indemnify the Bank against all losses arising from any claim that the Bank\'s use of the Supplier Software in accordance with this Agreement infringes the intellectual property rights of a third party.'],
    ['8.4', 'The Bank shall notify the Supplier of any claim under clause 8.3 within 10 Business Days after becoming aware of it and shall give the Supplier conduct of the claim, subject to the procedure in clause 12.3.']
  ];

  /* the duel: Sentinel's side is its real output on the sample (its finding, its clause, its plain words; only the first has a played-out sequence; the last two are written out in its plain words);
     the chatbot's is illustrative */
  var PROOF = [
    { q: 'Can the supplier walk away from this contract?',
      bot: ['Yes, on 60 days’ notice. A termination for convenience clause like this one is ', 'common in services agreements.', ''],
      verdict: 'The other side can walk away at your cost.',
      ref: '§7.3', cite: ['“The Supplier may ', 'terminate this Agreement for convenience', ' by giving the Bank not less than 60 days’ notice.”'],
      steps: [['Step 1', 'The Bank keeps to the contract'], ['Step 2', 'The Supplier ends it under §7.3, by its own choice'], ['Outcome', 'The Bank’s advance is gone: §7.4 says it is kept']] },
    { q: 'Is the claims procedure in clause 8.4 clear?',
      bot: ['Yes. The Bank notifies the Supplier within 10 Business Days and the Supplier takes conduct of the claim, ', 'a standard mechanism.', ''],
      verdict: 'A reference to a clause that does not exist.',
      ref: '§8.4', cite: ['“…shall give the Supplier conduct of the claim, subject to ', 'the procedure in clause 12.3', '.”'],
      stage: 'ref', lbl: 'Follow the reference' },
    { q: 'What do we pay in the second year?',
      bot: ['The parties agree the second-year fees in good faith before the first year ends, ', 'which leaves room to negotiate.', ''],
      verdict: 'A term left to be agreed and never fixed.',
      ref: '§4.4', cite: ['“The licence and support fees for the second year ', 'shall be agreed by the parties', ' in good faith before the end of the first year.”'],
      stage: 'year', lbl: 'Run the first year' },
    { q: 'Who owns the deliverables?',
      bot: ['The Bank. Clause 9.3 says the rights vest in the Bank ', 'on payment of the Implementation Fee.', ''],
      verdict: 'Two clauses give the same thing to different owners.',
      ref: '§9.3 · §9.4', cite: ['“…', 'vest in the Bank on payment', '…” and “', 'The Supplier retains all intellectual property rights', '… and grants the Bank ', 'a non-exclusive licence', '…”'],
      stage: 'write', dwell: 17500, write: { sev: 'high',
        lead: ['One says <span data-tie="0"><b>you own it</b> once you pay,</span>', 'the other says <span data-tie="1"><b>the supplier keeps it</b></span>', 'and <span data-tie="2">only lends you limited use.</span>'],
        land: 'Ownership is left in <em>doubt.</em>',
        ex: ['Two deeds for the same house, one naming you as owner and one naming the seller:', 'neither of you can be sure the house is really yours.'] } },
    { q: 'Do the support fees add up?',
      bot: ['Yes. The support fees are paid quarterly in advance, ', 'as set out in the table.', ''],
      verdict: 'A table does not add up.',
      ref: '§4.3', cite: ['“First quarter ', '5,000', ' · Second quarter ', '5,000', ' · Third quarter ', '5,000', ' · Fourth quarter ', '5,000', ' · ', 'Annual total 25,000', '”'],
      stage: 'write', dwell: 16000, write: { sev: 'med', quiet: 4,
        lead: ['<span data-tie="0,1,2,3" data-pace="1.7">The items add up to</span> <b>£20,000</b>', 'but <span data-tie="4">the contract says</span> <em data-tie="4">£25,000.</em>'],
        land: 'Someone could demand the higher figure.',
        ex: ['A restaurant bill listing dishes totalling £20 but showing £25 due:', 'which amount do you actually owe?'] } }
  ];
  var PROOF_INTERVAL = 14500;

  /* ======================================================================================== the frame of the page */
  function main() {
    if (hasGsap) { gsap.registerPlugin(ScrollTrigger); if (hasSplit) gsap.registerPlugin(SplitText); ScrollTrigger.config({ ignoreMobileResize: true }); }
    if (anim) html.classList.add('anim');
    var slow = /[?&]slow=(\d+(?:\.\d+)?)/.exec(window.location.search);
    if (slow && hasGsap) { slowBy = parseFloat(slow[1]); gsap.globalTimeline.timeScale(1 / slowBy); }
    setupSmoothScroll();
    setupStars();
    setupReveals();
    setupStagger();
    setupCaught();
    setupProof();
    setupCal();
    setupAnchors();
    setupMagnetic();
    setupAlt();
    fontsSoon().then(function () { setupText(); if (hasGsap) ScrollTrigger.refresh(); });

    var desk = mq(DESK);
    fontsSoon().then(function () {
      if (desk) { if (anim) setupReel(); else setupPhoneStages(); setupBreaks(); }
      else { setupPhoneStages(); setupBreaksPhone(); }
      setupSide();
      setupRadar();
      setupWhatIf();
      setupGhost();
      setupWordmark();
      if (hasGsap) ScrollTrigger.refresh();
    });
    // the layout is chosen once, per load: crossing the line needs another chain of scenes
    if (window.matchMedia) window.matchMedia(DESK).addEventListener('change', function () { window.location.reload(); });
  }
  function fontsReady() { return document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(); }
  function fontsSoon() { return Promise.race([fontsReady(), new Promise(function (r) { setTimeout(r, 1200); })]); }

  function setupSmoothScroll() {
    if (reduced || typeof window.Lenis === 'undefined' || !fine) return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGsap) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  function setupAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id.length < 2) return;
        var el = $(id);
        if (!el) return;
        e.preventDefault();
        var m = $('#mobileMenu'), b = $('#burger');
        if (m) m.classList.remove('is-open');
        if (b) b.setAttribute('aria-expanded', 'false');
        var off = id === '#top' ? 0 : id === '#how' ? 70 : -72;
        if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.3 });
        else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + off, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }
  function setupMagnetic() {
    if (!anim || !fine) return;
    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }), yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('mousemove', function (e) { var r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.2); yTo((e.clientY - r.top - r.height / 2) * 0.3); });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
  }
  // the light that follows the pointer, inside a surface; moved by transform, so nothing repaints
  function setupLight(frame) {
    if (!fine || !hasGsap || !frame) return;
    var l = $('.frame-light', frame);
    if (!l) return;
    var xTo = gsap.quickTo(l, 'x', { duration: 0.6, ease: 'power3' }), yTo = gsap.quickTo(l, 'y', { duration: 0.6, ease: 'power3' });
    frame.addEventListener('pointerenter', function () { frame.classList.add('is-lit'); });
    frame.addEventListener('pointerleave', function () { frame.classList.remove('is-lit'); });
    frame.addEventListener('pointermove', function (e) { var r = frame.getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top); });
  }

  /* ---------- reveals and text: one language, a soft blur on a spring, split only for as long as it runs ---------- */
  function whenPassed(els, show) {
    var pending = els.slice(), ticking = false;
    function sweep() {
      ticking = false;
      pending = pending.filter(function (el) {
        if (el.__shown) return false;
        if (el.getBoundingClientRect().bottom < 0) { el.__shown = true; show(el); return false; }
        return true;
      });
      if (!pending.length) window.removeEventListener('scroll', onScroll);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(sweep); } }
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  function setupReveals() {
    var els = $$('[data-reveal]');
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (!e.isIntersecting) return; e.target.__shown = true; e.target.classList.add('in'); io.unobserve(e.target); });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
    whenPassed(els, function (el) { el.classList.add('in'); io.unobserve(el); });
  }
  function showGroup(g) {
    if (!g || g.classList.contains('in')) return;
    g.__shown = true;
    g.classList.add('in');
    setTimeout(function () { g.classList.add('done'); }, (1000 + g.children.length * 50) * slowBy);
  }
  function setupStagger() {
    var groups = $$('[data-stagger]');
    groups.forEach(function (g) { [].forEach.call(g.children, function (c, i) { c.style.setProperty('--si', i); }); });
    if (!anim) return;
    if (!('IntersectionObserver' in window)) { groups.forEach(showGroup); return; }
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); showGroup(e.target); }); }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    groups.forEach(function (g) { io.observe(g); });
    whenPassed(groups, function (g) { io.unobserve(g); g.classList.add('in', 'done'); });
  }
  var Mo = window.Motion || null;
  var WORDS = { opacity: [0, 1], transform: ['translateY(0.32em)', 'translateY(0em)'], filter: ['blur(10px)', 'blur(0px)'] };
  var LINES = { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'], filter: ['blur(5px)', 'blur(0px)'] };
  function run(els, frames, o) {
    els = els.length === undefined ? [els] : [].slice.call(els);
    o = o || {};
    if (!els.length) return Promise.resolve();
    var dur = (o.duration || 1) * slowBy, each = (o.stagger || 0) * slowBy, wait = (o.delay || 0) * slowBy;
    if (Mo && Mo.animate) {
      var opts = { delay: each ? Mo.stagger(each, { startDelay: wait }) : wait };
      if (o.spring !== false && Mo.spring) { opts.type = Mo.spring; opts.bounce = 0; opts.visualDuration = dur * 0.6; }
      else { opts.duration = dur; opts.ease = [0.23, 1, 0.32, 1]; }
      var c = Mo.animate(els, frames, opts);
      return Promise.resolve(c.finished || c).then(function () {});
    }
    if (!els[0].animate) return Promise.resolve();
    var names = Object.keys(frames), kf = [];
    for (var i = 0; i < frames[names[0]].length; i++) { var f = {}; names.forEach(function (k) { f[k] = frames[k][i]; }); kf.push(f); }
    return Promise.all(els.map(function (el, j) {
      var a = el.animate(kf, { duration: dur * 1000, delay: (wait + j * each) * 1000, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'both' });
      return a.finished.then(function () { try { a.commitStyles(); } catch (e) {} a.cancel(); });
    })).then(function () {});
  }
  function tidy(els) { els.forEach(function (el) { el.style.transform = ''; el.style.filter = ''; el.style.willChange = ''; }); }
  function revealText(el) {
    if (el.__shown) return;
    el.__shown = true;
    var kind = el.getAttribute('data-text'), wait = parseFloat(el.getAttribute('data-delay') || 0);
    var show = function () { el.style.opacity = 1; };
    try {
      if (!hasSplit) { run(el, LINES, { duration: 0.9, delay: wait }).then(function () { show(); tidy([el]); }); return; }
      var lines = kind === 'lines';
      var split = SplitText.create(el, lines ? { type: 'lines', linesClass: 'tl' } : { type: 'words', wordsClass: 'tw' });
      var parts = lines ? split.lines : split.words;
      parts.forEach(function (p) { p.style.opacity = 0; });
      show();
      run(parts, lines ? LINES : WORDS, { duration: lines ? 0.9 : 1.05, stagger: lines ? 0.07 : 0.045, delay: wait }).then(function () { split.revert(); });
    } catch (e) { show(); }
  }
  function setupText() {
    if (!anim) return;
    var auto = $$('[data-text]');
    if (!('IntersectionObserver' in window)) { auto.forEach(revealText); return; }
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); revealText(e.target); }); }, { threshold: 0.3, rootMargin: '0px 0px -6% 0px' });
    auto.forEach(function (el) { io.observe(el); });
    whenPassed(auto, function (el) { io.unobserve(el); el.style.opacity = 1; });
  }
  function swapText(el, text) {
    if (!anim) { el.textContent = text; return; }
    run(el, { opacity: [1, 0], transform: ['translateY(0px)', 'translateY(-6px)'] }, { duration: 0.2, spring: false }).then(function () {
      el.textContent = text;
      return run(el, { opacity: [0, 1], transform: ['translateY(7px)', 'translateY(0px)'] }, { duration: 0.6 });
    }).then(function () { tidy([el]); });
  }
  // run `fn` while `el` is on screen (a loop never runs off it)
  function whileVisible(el, on, off, margin) {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) on(); else if (off) off(); }); }, { rootMargin: margin || '0px' }).observe(el);
  }
  function once(el, fn, margin) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { rootMargin: margin || '60% 0px' });
    io.observe(el);
  }

  /* ======================================================================================== the sky: stars so dim you find them rather than see them.
     They keep out of the way of anything written: a star a block of text passes over goes out, and comes back once it has gone. Far apart by construction (each one
     is the best of several tries at keeping its distance), the sky uneven on purpose, each depth drifting at its own speed so the spacing holds */
  function setupStars() {
    var c = $('#stars');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    if (!ctx) return;
    var W = 0, H = 0, dpr = 1, stars = [], quiet = [], lit = {}, last = 0, lastQuiet = 0;
    var sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    var sc = sprite.getContext('2d'), g = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(226,232,255,1)');
    g.addColorStop(0.34, 'rgba(214,222,255,0.62)');
    g.addColorStop(1, 'rgba(200,210,255,0)');
    sc.fillStyle = g;
    sc.fillRect(0, 0, 32, 32);
    /* everything written directly on the page, the radar, and whatever else a star could be mistaken for a part of */
    var QUIET = '.hero-copy, .reel-caps, .caught, .wall, .breaks-copy, .alt-h, .rdg-l, .rdg-stage, .rdg-rail, .duel-head, .tabs-wrap, .duel-q, .watch .sec-head, .radar, .wi-head, .faq-sec, .footer';
    var candidates = $$(QUIET);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.__near = e.isIntersecting; }); }, { rootMargin: '30% 0px' });
      candidates.forEach(function (el) { el.__near = true; io.observe(el); });
    }
    function seed() {
      var area = W * H, n = Math.min(170, Math.round(area / (W < 700 ? 15500 : 13000)));
      stars = [];
      for (var i = 0; i < n; i++) {
        var best = null, bestD = -1;
        for (var k = 0; k < 16; k++) {
          var x = Math.random() * W, y = Math.random() * H, d = Infinity;
          for (var j = 0; j < stars.length; j++) {
            var dx = Math.abs(stars[j].x - x), dy = Math.abs(stars[j].y - y);
            dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy);
            d = Math.min(d, dx * dx + dy * dy);
          }
          // the sky is uneven: wide stretches stay empty, and no two stars crowd each other
          var patch = 0.5 + 0.5 * Math.sin(x / 290 + 1.3) * Math.cos(y / 230 - 0.6);
          if (d !== Infinity) d *= 0.12 + patch * patch;
          if (d > bestD) { bestD = d; best = { x: x, y: y }; }
        }
        var z = Math.pow(Math.random(), 2.2);                       // many far, a few nearer
        best.r = 0.5 + z * 1.05;                                    // half a pixel to about one and a half
        best.a = 0.34 - z * 0.14;                                   // the larger, the softer: even the biggest is hard to see
        best.vx = -(0.9 + z * 3.4);
        best.vy = -(0.2 + z * 0.8);
        best.depth = 0.008 + z * 0.05;                              // how much the page's scroll moves it
        best.w = 0.25 + Math.random() * 0.55;
        best.p = Math.random() * 6.28;
        best.k = 1;
        stars.push(best);
      }
    }
    function size() {
      var w = window.innerWidth, h = window.innerHeight;
      if (w === W && Math.abs(h - H) < 120 && stars.length) return;   // a phone's address bar is not a new sky
      W = w; H = h;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      seed();
    }
    function readQuiet() {
      quiet = [];
      candidates.forEach(function (el) {
        if (el.__near === false) return;
        var r = el.getBoundingClientRect();
        if (r.bottom < -40 || r.top > H + 40 || r.width < 2) return;
        quiet.push(r);
      });
    }
    function draw(t, dt) {
      var sy = window.scrollY || 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        if (dt) { s.x += s.vx * dt; s.y += s.vy * dt; if (s.x < -4) s.x += W + 8; if (s.y < -4) s.y += H + 8; }
        var y = ((s.y - sy * s.depth) % H + H) % H, x = s.x, inside = false;
        for (var q = 0; q < quiet.length; q++) {
          var r = quiet[q];
          if (x > r.left - 18 && x < r.right + 18 && y > r.top - 18 && y < r.bottom + 18) { inside = true; break; }
        }
        s.k += ((inside ? 0 : 1) - s.k) * (dt ? Math.min(1, dt * 3.2) : 1);
        if (s.k < 0.01) continue;
        ctx.globalAlpha = s.a * s.k * (0.74 + 0.26 * Math.sin(t * s.w + s.p));
        var d = s.r * 2.6;
        ctx.drawImage(sprite, x - d / 2, y - d / 2, d, d);
      }
    }
    size();
    readQuiet();
    draw(0, 0);
    window.addEventListener('resize', function () { size(); readQuiet(); draw(last / 1000, 0); });
    if (reduced) return;
    function frame(now) {
      requestAnimationFrame(frame);
      if (now - last < 33) return;                                  // thirty frames a second is more than this needs
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (now - lastQuiet > 280) { lastQuiet = now; readQuiet(); }
      draw(now / 1000, dt);
    }
    requestAnimationFrame(frame);
  }

  /* ======================================================================================== the reel: one window */
  function byText(root, text) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) if (n.textContent.trim().toLowerCase().indexOf(text.toLowerCase()) === 0) return n.parentElement;
    return null;
  }
  function setupReel() {
    var host = $('#reelStage');
    if (!host || !Theatre) return;
    setupLight($('#reelFrame'));
    var stage = new Theatre.Stage(host, { scenes: ['loom', 'fix', 'report'] });
    var wrap = $('#reelWrap');
    stage.visible = function () { return Math.max(320, window.innerHeight - parseFloat(getComputedStyle(wrap).top || 200)); };
    var exportDialog = null;
    Promise.all([stage.ready, Theatre.loadScene('export').then(function (sc) {
      if (!sc) return;
      var box = document.createElement('div');
      box.innerHTML = sc.html;
      exportDialog = box.querySelector('dialog.rbx');
    }).catch(function () {})]).then(function () {
      var F = stage.layers.fix, L = stage.layers.loom, R = stage.layers.report;
      R.style.opacity = '0'; R.style.visibility = 'hidden';
      var pane = stage.q('#vfPane', 'fix');
      var rows = stage.qa('li.issue-card', 'fix');
      var list = stage.q('.issues-grid', 'fix');
      if (!anim) { stage.showNow('fix'); return; }

      /* ---------- the hero, on the clock: the loom reads the contract, the findings land, one opens ---------- */
      var doneHero = false, heroTL = null, idleTL = null;
      function resetFindings() {
        gsap.set(rows, { opacity: 1, y: 0 });
        if (pane) { gsap.set(pane, { opacity: 1, y: 0 }); pane.scrollTop = 0; }
      }
      function loomPaint(p) {
        var fill = stage.q('.lm-fill', 'loom'), pct = stage.q('.lm-pct', 'loom'), steps = stage.qa('.lm-step', 'loom'), secs = stage.qa('.dr-sec', 'loom');
        var beam = stage.q('.dr-beam', 'loom'), st = stage.q('.lm-stage', 'loom'), el = stage.q('.lm-elapsed', 'loom'), left = stage.q('.lm-left', 'loom');
        var at = [0, 0.14, 0.34, 0.62, 0.8, 0.93], now = 0, i;
        for (i = 0; i < at.length; i++) if (p >= at[i]) now = i;
        steps.forEach(function (s, j) { s.classList.toggle('is-done', j < now); s.classList.toggle('is-now', j === now); });
        if (st && steps[now]) st.textContent = steps[now].textContent.trim() + '…';
        if (fill) fill.style.transform = 'scaleX(' + Math.max(0.01, p) + ')';
        if (pct) pct.textContent = Math.round(p * 100) + '%';
        var read = Math.min(1, p / 0.62), lit = Math.round(read * secs.length);
        secs.forEach(function (s, j) { s.classList.toggle('is-read', j < lit); });
        if (beam && secs.length) {
          var rowH = secs[0].offsetHeight + 6;
          beam.classList.add('is-on');
          beam.style.transform = 'translateY(' + Math.round(read * (secs.length - 1) * rowH) + 'px)';
        }
        var sec = Math.round(p * 168);
        if (el) el.textContent = 'elapsed ' + Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
        if (left) left.textContent = p < 0.97 ? 'a few minutes left' : 'almost done';
      }
      function heroEnd() {
        if (doneHero) return;
        doneHero = true;
        if (heroTL) heroTL.kill();
        gsap.set(F, { autoAlpha: 1 });
        gsap.set(L, { autoAlpha: 0 });
        resetFindings();
        gsap.set(stage.cursorEl, { opacity: 0 });
      }
      function heroStart() {
        var k = { p: 0 };
        stage.showNow('loom');
        gsap.set(F, { autoAlpha: 0 });
        gsap.set(rows, { opacity: 0, y: 10 });
        if (pane) gsap.set(pane, { opacity: 0, y: 12 });
        loomPaint(0);
        heroTL = gsap.timeline({ delay: 0.7, onComplete: function () { heroEnd(); startIdle(); } });
        heroTL.to(k, { p: 1, duration: 4.4, ease: 'power1.inOut', onUpdate: function () { loomPaint(k.p); } });
        heroTL.to(F, { autoAlpha: 1, duration: 0.45, ease: 'power1.inOut' }, '+=0.15');
        heroTL.to(rows, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.05 }, '-=0.2');
        if (rows[0]) {
          heroTL.call(function () { stage.cursorShow(1000, 560); }, null, '+=0.1');
          heroTL.add(stage.cursorTo(rows[0], { duration: 0.8, fx: 0.62 }), '+=0.05');
          heroTL.add(stage.press(), '+=0.05');
          heroTL.to(pane, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '-=0.1');
          heroTL.add(stage.cursorHide(), '+=0.3');
        }
      }
      /* at rest the window keeps working: it leans in on the proof, reads down it, and comes back */
      function startIdle() {
        if (idleTL || isStuck) return;
        var y = pane && playTop();
        idleTL = gsap.timeline({ repeat: -1, repeatDelay: 2.4, delay: 2.2 });
        idleTL.add(stage.camTo(pane, 1.42, { dx: 0, dy: -150, duration: 1.6 }));
        if (pane) {
          idleTL.to(pane, { scrollTop: y, duration: 2, ease: 'power2.inOut' }, '+=2.2');
          idleTL.to(pane, { scrollTop: 0, duration: 1.2, ease: 'power2.inOut' }, '+=3.2');
        }
        idleTL.add(stage.camReset({ duration: 1.5 }), '+=0.4');
      }
      function stopIdle() {
        if (!idleTL) return;
        idleTL.kill();
        idleTL = null;
        gsap.set(stage.camEl, { x: 0, y: 0, scale: 1 });
        if (pane) pane.scrollTop = 0;
      }
      function playTop() {
        var h = byText(pane, 'How it can play out');
        return h ? Math.max(0, h.offsetTop - 12) : 700;
      }

      /* ---------- the reel, on the scroll ---------- */
      var isStuck = false, capIdx = -1;
      var caps = $$('.cap', $('#reelCaps')), ticks = $$('#reelTicks i');
      function setCap(i) {
        if (i === capIdx) return;
        capIdx = i;
        caps.forEach(function (c, j) { c.classList.toggle('is-on', j === i); });
      }
      /* § 3's parts: the real redline of the finding that stays open, in its own pane */
      var redline = stage.q('.dd-redline', 'fix');
      var rlDraft = redline && redline.querySelector('.dd-redline-draft');
      var rlText = redline && redline.querySelector('.dd-redline-text');
      var rlParas = rlText ? $$('.pz-cp', rlText) : [];
      var rlWords = rlText ? splitWords(rlText) : [];
      var rlAfter = redline ? $$('.dd-redline-length, .dd-redline-check, .dd-redline-how, .dd-redline-actions, .dd-redline-advice', redline) : [];
      var addBtn = redline && redline.querySelector('[data-act=apply-redline]');
      var addA = null, addB = null;
      if (addBtn) {
        addBtn.innerHTML = '<span>Add to draft</span><span style="display:none">✓ Added to draft</span>';
        addA = addBtn.children[0]; addB = addBtn.children[1];
      }
      // the app's own waiting line while it drafts. The theatre stills every CSS animation, so the scroll turns the spinner
      var waiting = document.createElement('div');
      waiting.style.cssText = 'position:absolute;left:0;top:0;display:flex;align-items:center;gap:10px;padding:14px 16px;font-size:13px;line-height:18px;color:var(--text-muted);opacity:0';
      waiting.innerHTML = '<span style="width:13px;height:13px;flex:none;border:2px solid color-mix(in srgb, var(--accent) 30%, transparent);border-top-color:var(--accent);border-radius:50%"></span><span>Drafting replacement language…</span>';
      if (rlDraft) { rlDraft.style.position = 'relative'; rlDraft.appendChild(waiting); }
      // what is below the fix is for working in, not for this film; the room lets the pane scroll the last of it into view
      if (redline) redline.style.paddingBottom = '440px';
      $$('.dd-note-sec, .dd-note-sec + .dd-section', pane || F).forEach(function (s) { s.style.display = 'none'; });

      /* § 4's parts: the same nine findings become the report's index; the verdict comes up beside them; the export opens over the report */
      var head = stage.q('#vfHead', 'fix');
      var tab = stage.q('[data-ws-tab="report"]', 'fix');
      var rBody = R.querySelector('.sx-body') || R;
      var layout = stage.q('.report-layout', 'report');
      var rParts = layout ? $$(':scope > *', layout).filter(function (n) { return !n.classList.contains('rpt-outline'); }).slice(0, 5) : [];
      rParts.forEach(function (n) { n.style.animation = 'none'; });  // the page's own entrance would hold them against the scroll
      var rSecs = stage.qa('.rol-sec', 'report'), rRows = stage.qa('.rol-row', 'report'), rProgress = stage.q('.rpt-ol-progress', 'report');
      var rHero = stage.q('.rpt-hero', 'report'), rNums = stage.qa('.rds-n', 'report');
      var rExport = stage.q('[data-act=rpt-export-open]', 'report');
      var counts = rNums.map(function (n) { var v = parseInt(n.style.getPropertyValue('--n'), 10) || 0; n.style.animation = 'none'; n.style.setProperty('--n', 0); return v; });
      var rTiles = stage.qa('.rds-item', 'report'), rLabels = stage.qa('.rds-l', 'report');
      var heroH = rHero && rHero.querySelector('h1'), heroLine = rHero && rHero.querySelector('.rpt-hero-line');
      var heroGrid = rHero && rHero.querySelector('.rpt-hero-grid'), heroVerdict = rHero && rHero.querySelector('.rpt-hero-verdict');
      // what comes back after the count has been said, and what is held back until then
      var heroRestEls = rHero ? $$(':scope > *', rHero).filter(function (n) { return n !== heroGrid; }).concat(heroVerdict ? $$(':scope > *', heroVerdict).filter(function (n) { return n !== heroH && n !== heroLine; }) : []) : [];
      var heroQuiet = heroRestEls.concat([heroH, heroLine].filter(Boolean));
      if (layout) $$('.rpt-outline *, .rpt-hero *', layout).forEach(function (n) { n.style.animation = 'none'; });
      var rOthers = rParts.filter(function (n) { return n !== rHero; });
      var paneIn = pane && pane.firstElementChild;
      // the finding's card, empty, in the report's layer: it becomes the verdict's card
      var shell = null;
      if (pane) {
        shell = document.createElement('div');
        var ps = getComputedStyle(pane);
        shell.style.cssText = 'position:absolute;left:0;top:0;z-index:20;visibility:hidden;pointer-events:none;box-sizing:border-box';
        shell.style.background = ps.backgroundColor;
        shell.style.border = ps.border;
        shell.style.borderRadius = ps.borderRadius;
        shell.style.boxShadow = ps.boxShadow;
        rBody.appendChild(shell);
      }
      var SEVC = ['#f0647f', '#ef8a4e', '#ef8a4e', '#ef8a4e', '#d9a441', '#d9a441', '#8a93a6', '#8a93a6', '#8a93a6'];
      var strokes = SEVC.map(function (c) { var i = document.createElement('i'); i.style.cssText = 'position:absolute;left:0;top:0;width:3px;height:21px;border-radius:2px;z-index:45;opacity:0;pointer-events:none;background:' + c; rBody.appendChild(i); return i; });
      // the list, one object, lifted out so it can travel over the report
      var ghost = document.createElement('div');
      ghost.className = 'vf-body is-split';
      ghost.style.cssText = 'position:absolute;left:0;top:0;display:block;margin:0;padding:0;z-index:40;visibility:hidden;pointer-events:none';
      var ghostList = list ? list.cloneNode(true) : document.createElement('ul');
      ghostList.removeAttribute('id');
      $$('.is-selected', ghostList).forEach(function (n) { n.classList.remove('is-selected'); });
      ghost.appendChild(ghostList);
      rBody.appendChild(ghost);
      var ghostBits = $$('.vf-row-top, .ic-summary', ghostList);
      // the dialog is the real one, from the frozen export page, opened on this report
      var scrim = document.createElement('div');
      scrim.style.cssText = 'position:absolute;inset:0;z-index:50;background:rgba(5,6,10,.62);opacity:0;visibility:hidden';
      rBody.appendChild(scrim);
      var dialog = exportDialog;
      if (dialog) { dialog.style.cssText += ';position:absolute;z-index:51;left:260px;right:auto;top:22px;margin:0'; rBody.appendChild(dialog); gsap.set(dialog, { autoAlpha: 0, transformOrigin: '100% 0%' }); }

      function rectOf(el) { var c = stage.camEl.getBoundingClientRect(), b = el.getBoundingClientRect(), k = (c.width / 1440) || 1; return { x: (b.left - c.left) / k, y: (b.top - c.top) / k, w: b.width / k, h: b.height / k }; }
      function aim(r, s, dy) {
        var vw = stage.viewW(), vh = stage.viewH();
        var x = vw / 2 - (r.x + r.w / 2) * s, y = vh / 2 - (r.y + r.h / 2 + (dy || 0)) * s;
        return { x: Math.min(0, Math.max(vw - 1440 * s, x)), y: Math.min(0, Math.max(vh - 900 * s, y)), scale: s };
      }
      function spotTo(r, pad) { pad = pad == null ? 7 : pad; return { x: r.x - pad, y: r.y - pad, width: r.w + pad * 2, height: r.h + pad * 2 }; }

      var scrub = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      function build() {
        scrub.clear();
        gsap.set(stage.camEl, { x: 0, y: 0, scale: 1, transformOrigin: '0 0', force3D: false });
        var cam = stage.camEl, spot = stage.spotEl, cur = stage.cursorEl, rip = stage.rippleEl;
        scrub.set(cam, { x: 0, y: 0, scale: 1 }, 0);
        /* § 1 Find: the camera leans on the list, the spotlight walks down it */
        var listR = list ? rectOf(list) : { x: 276, y: 312, w: 487, h: 680 };
        scrub.to(cam, Object.assign(aim({ x: listR.x, y: listR.y, w: listR.w + 300, h: 460 }, 1.3), { duration: 0.55, ease: 'power1.inOut' }), 0.1);
        rows.slice(0, 6).forEach(function (row, i) {
          var r = rectOf(row);
          var vars = Object.assign(spotTo(r, 4), { duration: 0.18, ease: 'power1.inOut' });
          if (i === 0) scrub.set(spot, spotTo(r, 4), 0.5);
          if (i === 0) scrub.to(spot, { opacity: 1, duration: 0.14 }, 0.5);
          else scrub.to(spot, vars, 0.5 + i * 0.22);
        });
        scrub.to(spot, { opacity: 0, duration: 0.14 }, 1.86);
        /* § 2 Prove: the evidence, the steps, the clause */
        var paneR = pane ? rectOf(pane) : { x: 785, y: 312, w: 619, h: 700 };
        var PANE_ZOOM = 1.46;
        var a = aim({ x: paneR.x, y: paneR.y, w: paneR.w, h: 420 }, PANE_ZOOM);
        scrub.to(cam, Object.assign(a, { duration: 0.55, ease: 'power1.inOut' }), 2);
        if (pane) {
          var playY = playTop();
          scrub.to(pane, { scrollTop: playY, duration: 0.6, ease: 'power1.inOut' }, 2.95);
          var clauseEl = byText(pane, 'Clause text');
          if (clauseEl) scrub.to(pane, { scrollTop: Math.max(playY + 10, clauseEl.offsetTop - 10), duration: 0.5, ease: 'power1.inOut' }, 3.5);
        }
        /* § 3 Fix: nothing changes page. The camera holds, the pane goes on down a little, and under the same finding the fix is written, as far as the scroll has got */
        if (pane && redline && rlText) {
          pane.scrollTop = 0;
          redline.style.display = 'block';
          rlText.style.height = 'auto';
          var yIn = function (el) { return rectOf(el).y - paneR.y; };
          // the lowest line of this pane the camera shows clearly, above the fade at the foot of the window
          var vis = (stage.viewH() - 130 - a.y) / PANE_ZOOM - paneR.y;
          var head0 = Math.max(0, yIn(redline) - 46);
          var textTop = yIn(rlText), fullH = rlText.offsetHeight;
          var T3 = 4.02, TS = 4.46, TD = 0.94;
          scrub.to(pane, { scrollTop: head0, duration: 0.32, ease: 'power1.inOut' }, T3);
          scrub.set(redline, { display: 'block' }, 4.1);
          scrub.fromTo(waiting, { opacity: 0 }, { opacity: 1, duration: 0.08, immediateRender: false }, 4.12);
          scrub.fromTo(waiting.firstChild, { rotation: 0 }, { rotation: 900, duration: 0.42, immediateRender: false }, 4.1);
          scrub.to(waiting, { opacity: 0, duration: 0.05 }, TS - 0.05);
          // the box grows with the words, the pane keeps the newest line in view
          var done = 0, t0 = TS, top0 = head0, h0 = 46;
          scrub.fromTo(rlText, { height: 46, overflow: 'hidden' }, { height: 46, duration: 0.001, immediateRender: false }, 4.1);
          rlParas.forEach(function (p) {
            var n = $$('.rw', p).length;
            done += n;
            var t1 = TS + TD * (done / rlWords.length), pb = yIn(p) + p.offsetHeight;
            var hNow = Math.min(fullH, pb - textTop + 14);
            var topNow = Math.max(top0, pb + 14 - vis);
            scrub.fromTo(rlText, { height: h0 }, { height: hNow, duration: t1 - t0, immediateRender: false }, t0);
            scrub.to(pane, { scrollTop: topNow, duration: t1 - t0 }, t0);
            t0 = t1; top0 = topNow; h0 = hNow;
          });
          scrub.set(rlWords, { opacity: 0 }, 4.1);
          scrub.to(rlWords, { opacity: 1, duration: 0.012, stagger: TD / rlWords.length }, TS);
          // read against the whole contract, how it goes in, and it goes in
          var last = rlAfter[rlAfter.length - 2] || rlAfter[0];
          scrub.set(rlAfter, { opacity: 0, y: 8 }, 4.1);
          scrub.to(rlAfter, { opacity: 1, y: 0, duration: 0.09, ease: 'power2.out', stagger: 0.035 }, TS + TD + 0.02);
          var topEnd = Math.max(top0, yIn(last) + last.offsetHeight + 14 - vis);
          scrub.to(pane, { scrollTop: topEnd, duration: 0.2, ease: 'power1.inOut' }, TS + TD + 0.04);
          if (addBtn) {
            var br = rectOf(addBtn), bx = br.x + br.w / 2 - 4, by = br.y + br.h / 2 - 2 - topEnd;
            scrub.fromTo(cur, { x: bx + 130, y: by + 70, opacity: 0, scale: 1 }, { x: bx, y: by, opacity: 1, duration: 0.14, ease: 'power2.out', immediateRender: false }, 5.66);
            scrub.to(cur, { scale: 0.84, duration: 0.018 }, 5.82);
            scrub.to(cur, { scale: 1, duration: 0.02 }, 5.84);
            scrub.fromTo(rip, { x: bx + 4, y: by + 2, scale: 0.3, opacity: 0.9 }, { scale: 1.3, opacity: 0, duration: 0.1, ease: 'power2.out', immediateRender: false }, 5.83);
            scrub.set(addA, { display: 'none' }, 5.83);
            scrub.set(addB, { display: 'inline' }, 5.83);
            scrub.to(addBtn, { opacity: 0.72, duration: 0.03 }, 5.83);
            scrub.to(cur, { opacity: 0, duration: 0.05 }, 5.94);
          }
          // measured; now as it starts
          pane.scrollTop = 0;
          redline.style.display = 'none';
        }
        /* § 4 Report: the report is the findings, counted. The camera only ever pulls back. The finding's words go and its card stays; the Report tab is pressed; the card folds into the verdict's, the nine rows condense into the report's own index;
           one mark per finding flies to the tile that counts it, each landing ticks that tile's real number, and only then is the count said in words. The file comes last, and its dialog opens from the button that was pressed */
        var T = 6.0, camS = Math.max(1.1, Math.min(1.26, stage.viewH() / 560));
        var camX = Math.max(stage.viewW() - 1440 * camS, -268 * camS), camY = -98 * camS;
        if (head) scrub.to(head, { opacity: 0, duration: 0.1 }, T + 0.04);
        if (paneIn) scrub.to(paneIn, { opacity: 0, duration: 0.14, ease: 'power1.in' }, T + 0.06);
        scrub.to(cam, { x: camX, y: camY, scale: camS, duration: 0.36, ease: 'power2.inOut' }, T + 0.08);
        if (tab) {
          var tr = rectOf(tab), tx = tr.x + tr.w * 0.55 - 4, ty = tr.y + tr.h * 0.5 - 2;
          scrub.fromTo(cur, { x: 1040, y: 420, opacity: 0, scale: 1 }, { x: tx, y: ty, opacity: 1, duration: 0.18, ease: 'power2.inOut', immediateRender: false }, T + 0.15);
          scrub.to(cur, { scale: 0.84, duration: 0.016 }, T + 0.34);
          scrub.to(cur, { scale: 1, duration: 0.02 }, T + 0.36);
          scrub.fromTo(rip, { x: tx + 4, y: ty + 2, scale: 0.3, opacity: 0.9 }, { scale: 1.3, opacity: 0, duration: 0.09, ease: 'power2.out', immediateRender: false }, T + 0.35);
          scrub.to(cur, { opacity: 0, duration: 0.05 }, T + 0.44);
        }
        var SWAP = T + 0.36;
        scrub.set(R, { autoAlpha: 1 }, SWAP);
        // the list, as one object: it lands with each row on its line of the index
        var listNow = list ? rectOf(list) : listR;
        gsap.set(ghost, { x: listNow.x, y: listNow.y, width: listNow.w, scale: 1, opacity: 1, transformOrigin: '0 0' });
        scrub.set(ghost, { visibility: 'visible' }, SWAP);
        if (rRows.length > 1 && rows.length > 1) {
          var titleF = rows[0].querySelector('.ic-title'), titleR = rRows[0].querySelector('.rol-t');
          var pitchF = rectOf(rows[1]).y - rectOf(rows[0]).y, pitchR = rectOf(rRows[1]).y - rectOf(rRows[0]).y, sL = pitchR / pitchF;
          var tF = rectOf(titleF), tR = rectOf(titleR);
          var gx = tR.x - (tF.x - listNow.x) * sL, gy = tR.y - (tF.y - listNow.y) * sL + 1;
          scrub.to(ghostBits, { opacity: 0, duration: 0.1 }, SWAP);
          scrub.to(ghost, { x: gx, y: gy, scale: sL, duration: 0.42, ease: 'power3.inOut' }, SWAP + 0.01);
          scrub.to(ghost, { opacity: 0, duration: 0.09 }, SWAP + 0.36);
          scrub.set(rRows, { opacity: 0 }, 0);
          scrub.to(rRows, { opacity: 1, duration: 0.09 }, SWAP + 0.34);
        }
        scrub.set(rSecs, { opacity: 0 }, 0);
        if (rProgress) scrub.set(rProgress, { opacity: 0 }, 0);
        scrub.to(rSecs, { opacity: 1, duration: 0.1, stagger: 0.02 }, SWAP + 0.3);
        if (rProgress) scrub.to(rProgress, { opacity: 1, duration: 0.1 }, SWAP + 0.3);
        // the finding's card folds into the verdict's. Empty, because a shape that changes distorts what is written on it
        if (shell && rHero) {
          var pr = rectOf(pane), hr = rectOf(rHero);
          gsap.set(shell, { x: pr.x, y: pr.y, width: pr.w, height: pr.h, opacity: 1 });
          scrub.set(shell, { visibility: 'visible' }, SWAP);
          scrub.to(shell, { x: hr.x, y: hr.y, width: hr.w, height: hr.h, duration: 0.4, ease: 'power3.inOut' }, SWAP + 0.01);
          scrub.set(rHero, { opacity: 0 }, 0);
          scrub.to(rHero, { opacity: 1, duration: 0.06 }, SWAP + 0.39);
          scrub.to(shell, { opacity: 0, duration: 0.06 }, SWAP + 0.42);
          scrub.set(heroQuiet, { opacity: 0 }, 0);
          scrub.set(rNums.concat(rLabels), { opacity: 0 }, 0);
        }
        // one stroke, one finding, in its own colour, to the tile that counts it. Translation only: the fan never crosses itself
        var START = SWAP + 0.46, GROUP = [[0, 4, 0], [4, 6, 0.13], [6, 9, 0.22]];
        strokes.forEach(function (st) { st.style.opacity = 0; });
        GROUP.forEach(function (g, gi) {
          if (!rTiles[gi]) return;
          var tile = rectOf(rTiles[gi]), num = rNums[gi], k = { v: 0 };
          for (var i = g[0]; i < g[1]; i++) (function (i, n) {
            var from = rRows[i] ? rectOf(rRows[i].querySelector('.rol-n') || rRows[i]) : { x: 356, y: 303 + i * 42, w: 6, h: 14 };
            var at = START + g[2] + n * 0.022;
            gsap.set(strokes[i], { x: from.x + from.w / 2 - 1.5, y: from.y + from.h / 2 - 12 });
            scrub.set(strokes[i], { opacity: 1 }, at);
            scrub.to(strokes[i], { x: tile.x + 34 + n * 8, y: tile.y + 9, duration: 0.12, ease: 'power2.inOut' }, at);
          })(i, i - g[0]);
          var firstLand = START + g[2] + 0.12, span = (g[1] - g[0] - 1) * 0.022;
          scrub.set(num, { opacity: 1 }, firstLand);
          scrub.fromTo(k, { v: 1 }, { v: counts[gi], duration: Math.max(0.001, span), immediateRender: false, onUpdate: function () { num.style.setProperty('--n', Math.round(k.v)); }, onReverseComplete: function () { num.style.setProperty('--n', 1); } }, firstLand);
          scrub.to(rLabels[gi], { opacity: 1, duration: 0.06 }, firstLand + span);
        });
        scrub.to(strokes, { opacity: 0, duration: 0.05 }, SWAP + 0.86);
        // the count, said in words: the one moment nothing else on this stage is moving
        if (heroH) scrub.fromTo(heroH, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.13, ease: 'power3.out', immediateRender: false }, SWAP + 0.88);
        if (heroLine) scrub.fromTo(heroLine, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.1, ease: 'power3.out', immediateRender: false }, SWAP + 0.97);
        if (rRows[0]) {
          scrub.fromTo(rRows[0], { backgroundColor: 'rgba(240,100,127,0)' }, { backgroundColor: 'rgba(240,100,127,0.2)', duration: 0.05, immediateRender: false }, SWAP + 0.97);
          scrub.to(rRows[0], { backgroundColor: 'rgba(240,100,127,0)', duration: 0.12 }, SWAP + 1.12);
        }
        scrub.to(heroRestEls, { opacity: 1, duration: 0.08, stagger: 0.02 }, SWAP + 1.03);
        scrub.set(rOthers, { opacity: 0, y: 22 }, 0);
        scrub.to(rOthers, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out', stagger: 0.03 }, SWAP + 1.06);
        // the file: the last thing to arrive, pressed, and the real dialog opens from it as the camera finishes its pull-back
        var E0 = 7.74;
        if (rExport && dialog) {
          var er = rectOf(rExport), ex = er.x + er.w * 0.5 - 4, ey = er.y + er.h * 0.5 - 2;
          scrub.fromTo(cur, { x: ex - 150, y: ey + 130, opacity: 0, scale: 1 }, { x: ex, y: ey, opacity: 1, duration: 0.15, ease: 'power2.out', immediateRender: false }, E0);
          scrub.to(cur, { scale: 0.84, duration: 0.016 }, E0 + 0.16);
          scrub.to(cur, { scale: 1, duration: 0.02 }, E0 + 0.18);
          scrub.fromTo(rip, { x: ex + 4, y: ey + 2, scale: 0.3, opacity: 0.9 }, { scale: 1.3, opacity: 0, duration: 0.09, ease: 'power2.out', immediateRender: false }, E0 + 0.17);
          scrub.to(cur, { opacity: 0, duration: 0.04 }, E0 + 0.22);
          scrub.to(cam, { x: 0, y: 0, scale: 1, duration: 0.34, ease: 'power2.inOut' }, E0 + 0.12);
          scrub.fromTo(scrim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.14, immediateRender: false }, E0 + 0.18);
          scrub.fromTo(dialog, { autoAlpha: 0, scale: 0.94, y: -10 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.24, ease: 'power3.out', immediateRender: false }, E0 + 0.18);
        }
        scrub.to({}, { duration: 0.2 }, 8.4);
      }
      function afterScenes() {
        build();
        ScrollTrigger.create({
          trigger: '#how', start: 'top top', end: 'bottom bottom', scrub: 0.22, animation: scrub,
          onEnter: function (self) { isStuck = true; $('#how').classList.add('is-stuck'); heroEnd(); stopIdle(); var at = self.progress * scrub.duration(); setCap(at < 6 ? Math.floor(at / 2) : 3); },
          onLeaveBack: function () { isStuck = false; $('#how').classList.remove('is-stuck'); setCap(-1); startIdle(); },
          onUpdate: function (self) {
            var at = self.progress * scrub.duration(), p = at < 6 ? at / 2 : 3 + (at - 6) / (scrub.duration() - 6);
            setCap(Math.min(3, Math.floor(p)));
            ticks.forEach(function (t, i) { t.style.setProperty('--p', Math.max(0, Math.min(1, p - i)).toFixed(3)); });
          }
        });
        // the hero's copy gives way as the window comes up; the light stays behind and fades with the page
        gsap.to('.hero-copy', { opacity: 0, y: -24, ease: 'none', scrollTrigger: { start: 0, end: 300, scrub: true } });
        gsap.to('.hero-light', { opacity: 0, ease: 'none', scrollTrigger: { start: 120, end: 800, scrub: true } });
      }
      afterScenes();
      ScrollTrigger.addEventListener('refreshInit', function () { /* the scrub is rebuilt only on a real resize */ });
      var lastW = window.innerWidth;
      window.addEventListener('resize', function () { if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; var prog = scrub.progress(); build(); scrub.progress(prog); } });

      if (window.scrollY > ($('#how').getBoundingClientRect().top + window.scrollY)) { heroEnd(); }
      else { heroStart(); }
      // the report keeps its first frame until the scrub reaches it
      gsap.set(R, { autoAlpha: 0 });
      window.__reel = { stage: stage, scrub: scrub };
    });
  }

  /* ======================================================================================== what it caught */
  function setupCaught() {
    var row = $('#caughtRow');
    if (!row) return;
    var one = FINDINGS.map(function (f) { return '<span class="ci">' + f.t + '</span>'; }).join('');
    row.innerHTML = one + one;
  }

  /* ======================================================================================== the peak */
  function buildWall() {
    var wall = $('#wall');
    if (!wall) return null;
    var cols = [[]], at = {};
    WALL.forEach(function (c) { if (c[0] === '|') { cols.push([]); return; } cols[cols.length - 1].push(c); });
    wall.innerHTML = cols.map(function (col) {
      return '<div class="wall-col">' + col.map(function (c) { return '<div class="cl" data-c="' + c[0] + '"><b>' + c[0] + '</b><span>' + c[1] + '</span><span class="tag">Looks fine.</span></div>'; }).join('') + '</div>';
    }).join('');
    ['4.1', '7.3', '7.4'].forEach(function (n) { at[n] = $('[data-c="' + n + '"]', wall); });
    return at;
  }
  function setupBreaks() {
    var pin = $('#breaksPin'), at = buildWall();
    if (!pin || !at || !at['4.1']) return;
    var svg = $('#wires'), card = $('#wallCard'), b2 = $('.breaks-h .b2'), b1 = $('.breaks-h .b1'), wall = $('#wall');
    if (!anim) { [at['4.1'], at['7.3'], at['7.4']].forEach(function (c) { c.classList.add('is-lit', 'is-hot'); }); if (b2) b2.style.opacity = 1; card.style.opacity = 1; card.style.visibility = 'visible'; return; }
    var DRIFT = 0, paths = [];
    function drawWires() {
      var pr = pin.getBoundingClientRect();
      var wy = gsap.getProperty(wall, 'y') || 0;
      function box(el) { var r = el.getBoundingClientRect(); return { l: r.left - pr.left, t: r.top - pr.top - wy + DRIFT, r: r.right - pr.left, b: r.bottom - pr.top - wy + DRIFT, cx: (r.left + r.right) / 2 - pr.left }; }
      var A = box(at['4.1']), B = box(at['7.3']), C = box(at['7.4']);
      var cr = card.getBoundingClientRect();
      var cTop = window.innerHeight - parseFloat(getComputedStyle(card).bottom) - card.offsetHeight, cL = (window.innerWidth - card.offsetWidth) / 2, cR = cL + card.offsetWidth;
      var mid = function (a, b) { return (a + b) / 2; };
      var ds = [
        'M' + (A.r + 12) + ' ' + mid(A.t, A.b) + ' C ' + (A.r + 160) + ' ' + mid(A.t, A.b) + ', ' + (B.l - 170) + ' ' + mid(B.t, B.b) + ', ' + (B.l - 12) + ' ' + mid(B.t, B.b),
        'M' + (C.l + 80) + ' ' + (C.b + 9) + ' C ' + (C.l + 80) + ' ' + (C.b + 110) + ', ' + (cR + 90) + ' ' + (cTop - 70) + ', ' + (cR - 90) + ' ' + cTop,
        'M' + (A.cx) + ' ' + (A.b + 9) + ' C ' + (A.cx) + ' ' + (A.b + 120) + ', ' + (cL - 90) + ' ' + (cTop - 60) + ', ' + (cL + 90) + ' ' + cTop
      ];
      svg.setAttribute('viewBox', '0 0 ' + pr.width + ' ' + pr.height);
      svg.innerHTML = ds.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
      paths = $$('path', svg);
      paths.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.__len = L; });
    }
    var pct = function (fn) { return { v: 0, fn: fn }; };
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    function lit(n, on) { at[n].classList.toggle('is-lit', on); }
    function tag(n, on) { var t = $('.tag', at[n]); if (t) gsap.to(t, { opacity: on ? 1 : 0, duration: 0.4, overwrite: true }); }
    function rebuild() {
      tl.clear();
      gsap.set(wall, { y: 0 });
      drawWires();
      tl.to({}, { duration: 7 }, 0);
      tl.fromTo(b2, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 3.5);
      tl.to(b1, { color: '#979dab', duration: 0.4 }, 3.5);
      paths.forEach(function (p, i) { tl.to(p, { strokeDashoffset: 0, duration: i === 0 ? 0.8 : 0.6, ease: 'power1.inOut' }, i === 0 ? 3.7 : 4.5); });
      tl.to('#wall', { color: 'rgba(226,231,243,0.09)', duration: 0.5 }, 4.0);
      tl.fromTo(card, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 4.9);
    }
    rebuild();
    var state = -1;
    ScrollTrigger.create({
      trigger: '#breaks', start: 'top top', end: 'bottom bottom', scrub: 0.22, animation: tl,
      onUpdate: function (self) {
        var t = self.progress * 7, s = t < 0.5 ? 0 : t < 1.5 ? 1 : t < 2.5 ? 2 : t < 3.6 ? 3 : 4;
        if (s === state) return;
        state = s;
        lit('7.3', s >= 1); lit('4.1', s >= 2); lit('7.4', s >= 3);
        tag('7.3', s >= 1 && s < 4); tag('4.1', s >= 2 && s < 4); tag('7.4', s >= 3 && s < 4);
        ['4.1', '7.3', '7.4'].forEach(function (n) { at[n].classList.toggle('is-hot', s >= 4); });
      }
    });
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () { if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; var p = tl.progress(); rebuild(); tl.progress(p); } });
  }
  function setupBreaksPhone() {
    var list = $('#breaksM');
    if (!list) return;
    var pick = {}; WALL.forEach(function (c) { pick[c[0]] = c[1]; });
    list.innerHTML = ['7.3', '4.1', '7.4'].map(function (n) { return '<li class="bm"><b>' + n + '</b><span>' + pick[n] + '</span><span class="fine">Looks fine.</span></li>'; }).join('');
    var copy = $('.breaks-copy');
    if (copy && list.parentNode === copy.parentNode.parentNode) { /* in order by markup */ }
    // the card comes after the list, on a phone
    var card = $('#wallCard');
    if (card) list.parentNode.appendChild(card);
  }

  /* ======================================================================================== the alternatives: one clause, four readers */
  function setupAlt() {
    if (anim) ScrollTrigger.create({ trigger: '.alt', start: 'top 72%', end: 'top 30%', scrub: 0.3, onUpdate: function (self) { var st = $('.strike'); if (st) st.style.setProperty('--cut', self.progress.toFixed(3)); } });
    setupReaders();
  }
  /* the text of an element, word by word; nothing moves, only each word's light */
  function splitWords(el) {
    var out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walk.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var frag = document.createDocumentFragment();
      t.textContent.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
        var s = document.createElement('span');
        s.className = 'rw';
        s.textContent = w;
        frag.appendChild(s);
        out.push(s);
      });
      t.parentNode.replaceChild(frag, t);
    });
    return out;
  }
  function setupReaders() {
    var box = $('#readers');
    if (!box) return;
    var stage = $('#rdStage'), clause = $('#rdClause'), trap = $('.rd-trap', clause), btns = $$('.rdr', box), notes = $$('.rdn', box), wire = $('#rdWire'), path = $('path', wire);
    var bars = $$('.rdr-bar', box), arc = $('.rdr-arc', box), tick = $('.rdr-tick', box);
    var W = splitWords(clause), trapW = W.filter(function (w) { return trap.contains(w); }), before = [], seen = false;
    W.forEach(function (w) { if (trap.contains(w)) seen = true; else if (!seen) before.push(w); });

    function drawWire() {
      var s = stage.getBoundingClientRect(), t = clause.getBoundingClientRect(), c = notes[3].getBoundingClientRect();
      wire.setAttribute('width', s.width);
      wire.setAttribute('height', s.height);
      var x = c.left + c.width / 2 - s.left;
      path.setAttribute('d', 'M' + x + ' ' + (t.bottom - s.top + 7) + ' L' + x + ' ' + (c.top - s.top));
      return path.getTotalLength();
    }
    if (!anim) {
      box.classList.add('is-static');
      fontsSoon().then(drawWire);
      window.addEventListener('resize', drawWire);
      return;
    }
    var cur = -1, tl = null, visible = false;
    var inNote = function (n) { return { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }; };
    var STEPS = [
      /* a careful read: the light moves along, slower and slower, and stops before the words that matter */
      function (t) {
        t.to(W, { opacity: 0.22, duration: 0.3, ease: 'power2.out' }, 0);
        t.to(before, { opacity: 1, duration: 0.3, ease: 'none', stagger: { amount: 2.1, ease: 'power1.in' } }, 0.3);
        t.fromTo(arc, { strokeDashoffset: 0 }, { strokeDashoffset: 100, duration: 2.7, ease: 'none' }, 0);
        t.fromTo(notes[0], { autoAlpha: 0, y: 8 }, inNote(), 2.65);
        t.to({}, { duration: 2 });
      },
      /* a chatbot: it reads everything, and says it's fine */
      function (t) {
        var say = $('.rdn-say', notes[1]), dots = $('.rdn-dots', notes[1]);
        t.to(W, { opacity: 0.62, duration: 0.45, ease: 'power2.out' }, 0);
        t.set(say, { opacity: 0 }, 0);
        t.set(dots, { opacity: 1 }, 0);
        t.fromTo(notes[1], { autoAlpha: 0, y: 8 }, inNote(), 0.2);
        t.to(dots, { opacity: 0, duration: 0.15 }, 1.4);
        t.to(say, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 1.45);
        t.to({}, { duration: 2.6 });
      },
      /* a proofreader: every word passes, the trap with the rest */
      function (t) {
        var each = 0.06, end = 0.3 + W.length * each;
        t.to(W, { opacity: 0.9, duration: 0.3, ease: 'power2.out' }, 0);
        W.forEach(function (w, i) { t.call(function () { w.classList.add('is-ok'); }, null, 0.3 + i * each); });
        t.fromTo(tick, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, end);
        t.fromTo(notes[2], { autoAlpha: 0, y: 8 }, inNote(), end);
        t.to({}, { duration: 2.2 });
      },
      /* Sentinel: everything else goes quiet, the words that will be used are lit, and what they do is said */
      function (t) {
        gsap.set(notes[3], { y: 0 });
        var len = drawWire();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
        t.to(W, { opacity: 0.28, duration: 0.5, ease: 'power2.out' }, 0);
        t.to(trapW, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0.45);
        t.to(trap, { backgroundSize: '100% 100%', duration: 0.7, ease: 'power2.inOut' }, 0.45);
        t.to(path, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, 1.05);
        t.fromTo(notes[3], { autoAlpha: 0, y: 10 }, inNote(), 1.4);
        t.to({}, { duration: 5.2 });
      }
    ];
    function clear() {
      if (tl) { tl.kill(); tl = null; }
      W.forEach(function (w) { w.classList.remove('is-ok'); });
      gsap.set(trap, { backgroundSize: '0% 100%' });
      gsap.set(notes, { autoAlpha: 0 });
      gsap.set(path, { opacity: 0 });
    }
    function go(i) {
      clear();
      cur = i;
      btns.forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.setAttribute('aria-pressed', String(k === i)); gsap.set(bars[k], { scaleX: k < i ? 1 : 0 }); });
      if (i === 0) gsap.set([arc, tick], { strokeDashoffset: 0 });
      tl = gsap.timeline({ paused: !visible, onComplete: function () { go((i + 1) % 4); } });
      STEPS[i](tl);
      // each one lets go before the next: its note leaves, the wire and the light with it
      var d = tl.duration();
      tl.to(notes[i], { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, d - 0.3);
      if (i === 3) { tl.to(path, { opacity: 0, duration: 0.3 }, d - 0.3); tl.to(trap, { backgroundSize: '0% 100%', duration: 0.35, ease: 'power2.in' }, d - 0.35); }
      tl.fromTo(bars[i], { scaleX: 0 }, { scaleX: 1, duration: d, ease: 'none' }, 0);
    }
    btns.forEach(function (b, i) { b.addEventListener('click', function () { visible = true; go(i); }); });
    whileVisible(box, function () { visible = true; if (tl) tl.play(); }, function () { visible = false; if (tl) tl.pause(); });
    once(box, function () { go(0); }, '-18% 0px -18% 0px');
    gsap.set(path, { opacity: 0 });
    gsap.set(notes, { autoAlpha: 0 });
    window.addEventListener('resize', function () { if (cur === 3) { var len = drawWire(); gsap.set(path, { strokeDasharray: len, strokeDashoffset: 0 }); } });
  }

  /* ======================================================================================== the duel's simulations. Three verbs, three geometries: tab 1 walks, this one follows, this one waits. The last two tabs have no picture: Sentinel writes (STAGES.write).
     Each is built from the sample contract's facts, has one peak (label 'peak': the chatbot's sentence is struck on it, and Sentinel's tag turns to Cited), and ends with a closer in a few words.
     Each returns { tl, end() }: tl is a paused timeline, end() is the final frame for reduced motion */
  function closer(big, small) { return '<p class="sc"><b>' + big + '</b> <span>' + small + '</span></p>'; }
  var STAGES = {
    /* a dead reference: the citation's own rule keeps going, down the tail of the contract; the paper ends under it, and it lands where clause 12.3 should be */
    ref: function (host, card, cite, track) {
      var ROWS = [['6', 'Confidentiality'], ['7', 'Term and termination'], ['8', 'Liability'], ['9', 'Intellectual Property'], ['10', 'General', 'Last clause'], ['', 'Schedules and signatures']];
      host.innerHTML = '<div class="sr"><div class="sr-view"><div class="sr-sheet"><i class="sr-band"></i>'
        + ROWS.map(function (r) { return '<p class="sr-row"><b>' + r[0] + '</b><span>' + r[1] + '</span>' + (r[2] ? '<em>' + r[2] + '</em>' : '') + '</p>'; }).join('')
        + '</div><div class="sr-ghost"><svg class="sr-dash" aria-hidden="true"><rect/></svg><b>§12.3</b>' + closer('Never written.', 'The Supplier runs the claim with no procedure to follow.') + '</div></div></div>';
      var wire = document.createElement('i'), wire2 = document.createElement('i');
      wire.className = 'sr-wire'; wire2.className = 'sr-wire2';
      card.appendChild(wire); card.appendChild(wire2);
      var view = $('.sr-view', host), sheet = $('.sr-sheet', host), band = $('.sr-band', host), rows = $$('.sr-row', host), ghost = $('.sr-ghost', host), rect = $('.sr-dash rect', host), svg = $('.sr-dash', host), last = $('.sr-row em', host), sc = $('.sc', host), scB = sc.children[0], scS = sc.children[1];
      function layout() {
        var c = card.getBoundingClientRect(), q = cite.getBoundingClientRect(), v = view.getBoundingClientRect(), s = sheet.getBoundingClientRect(), g = ghost.getBoundingClientRect();
        var top = q.bottom - c.top, x = q.left - c.left;
        var row8 = rows[2].offsetTop + rows[2].offsetHeight / 2;
        var lift = g.height + (view.clientHeight > 130 ? 18 : 12);
        svg.setAttribute('width', g.width); svg.setAttribute('height', g.height);
        rect.setAttribute('x', 0.5); rect.setAttribute('y', 0.5); rect.setAttribute('width', g.width - 1); rect.setAttribute('height', g.height - 1); rect.setAttribute('rx', 7);
        wire.style.left = wire2.style.left = x + 'px';
        wire.style.top = top + 'px';
        var vTop = v.top - c.top, sheetH = sheet.offsetHeight;
        wire.style.height = (vTop + sheetH - top) + 'px';
        wire2.style.top = (vTop + sheetH - lift) + 'px';
        wire2.style.height = (lift - g.height) + 'px';
        return { vTop: vTop, top: top, row8: row8, lift: lift, sheetH: sheetH, wireLen: vTop + sheetH - top };
      }
      function endFrame() {
        var g = layout();
        gsap.set(sheet, { y: -g.lift, opacity: 0.72 });
        gsap.set(wire, { scaleY: (g.vTop + g.sheetH - g.lift - g.top) / g.wireLen });
        gsap.set(wire2, { scaleY: 1 });
        gsap.set(ghost, { opacity: 1 });
        gsap.set(sc, { opacity: 1 });
        rows.forEach(function (r) { r.style.opacity = 0.7; });
        last.style.opacity = 1;
      }
      gsap.set(ghost, { opacity: 0 });
      gsap.set(wire, { scaleY: 0 });
      gsap.set(wire2, { scaleY: 0 });
      gsap.set([scB, scS], { opacity: 0, y: 6 });
      gsap.set(last, { opacity: 0 });
      rows.forEach(function (r, i) { r.style.opacity = i === 2 ? 1 : 0.45; });
      var tl = gsap.timeline({ paused: true });
      tl.call(function () {
        var g = layout(), k = { v: 0 };
        // the line runs down to the clause it starts from, then the page goes by under a reader skimming for clause 12
        var toRow8 = (g.vTop + g.row8 - g.top) / g.wireLen;
        var t2 = gsap.timeline();
        t2.to(wire, { scaleY: toRow8, duration: 0.25, ease: 'power1.in' }, 0);
        t2.to(k, { v: 1, duration: 0.95, ease: 'power1.in', onUpdate: function () {
          var sheetY = -(g.lift + 8) * k.v * k.v, bandY = g.row8 + (g.sheetH - g.row8) * k.v;
          sheet.style.transform = 'translateY(' + sheetY + 'px)';
          band.style.transform = 'translateY(' + (bandY - 15) + 'px)';
          wire.style.transform = 'scaleY(' + ((g.vTop + bandY + sheetY - g.top) / g.wireLen) + ')';
          rows.forEach(function (r, i) {
            var mid = r.offsetTop + r.offsetHeight / 2;
            if (i > 2 && bandY >= mid && !r.__lit) { r.__lit = 1; gsap.fromTo(r, { opacity: 1 }, { opacity: 0.7, duration: 0.5, delay: 0.1 }); if (r.querySelector('em')) gsap.to(last, { opacity: 1, duration: 0.25 }); }
          });
        } }, 0.25);
        // the paper ends: a small overshoot, the one everyone knows from the end of a list
        t2.to(sheet, { y: -g.lift, duration: 0.35, ease: 'power2.inOut' }, 1.22);
        t2.set(wire, { scaleY: (g.vTop + g.sheetH - g.lift - g.top) / g.wireLen }, 1.57);
        t2.to(band, { opacity: 0, duration: 0.2 }, 1.2);
        t2.to(wire2, { scaleY: 1, duration: 0.25, ease: 'power2.out' }, 1.6);
        t2.to(ghost, { opacity: 1, duration: 0.3 }, 1.85);
        track(t2);
      }, null, 0.3);
      tl.addLabel('peak', 2.55);
      tl.to(sheet, { opacity: 0.72, duration: 0.4, ease: 'power2.inOut' }, 2.55);
      tl.to(scB, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 2.85);
      tl.to(scS, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 3.1);
      tl.to({}, { duration: 0.1 }, 3.5);
      return { tl: tl, end: endFrame, drop: function () { wire.remove(); wire2.remove(); }, relayout: layout };
    },
    /* next year's price: time runs along the first year, reaches the deadline, climbs into the blank price field for year two and becomes a cursor, waiting for a number nobody types */
    year: function (host) {
      host.innerHTML = '<div class="sy"><div class="sy-cols">'
        + '<div class="sy-c sy-1"><span class="sy-l">Year one licence</span><b class="sy-f">£20,000</b><span class="sy-s">Support £5,000 a quarter</span></div>'
        + '<div class="sy-c sy-2"><span class="sy-l">Year two licence</span><b class="sy-f">£<i class="sy-slot"></i></b><span class="sy-s sy-sup">Support: to be agreed</span></div>'
        + '</div><div class="sy-line"><i class="sy-done"></i><i class="sy-open"></i><i class="sy-mark"></i></div><div class="sy-lbls"><span class="sy-dead">' + (mq('(max-width: 640px)') ? 'End of year one' : 'End of the first year') + '</span><span class="sy-m">Month 24</span></div>'
        + '<i class="sy-time"><b></b><em></em></i></div>' + closer('No fallback.', 'If you can’t agree, the Supplier could hold you hostage on price.');
      var box = $('.sy', host), one = $('.sy-1', host), line = $('.sy-line', host), done = $('.sy-done', host), open = $('.sy-open', host), time = $('.sy-time', host), hot = time.children[1], dead = $('.sy-dead', host), m = $('.sy-m', host), sup = $('.sy-sup', host), slot = $('.sy-slot', host), sc = $('.sc', host), scB = sc.children[0], scS = sc.children[1];
      function slotAt() { var b = box.getBoundingClientRect(), s = slot.getBoundingClientRect(); return { x: s.left - b.left, y: s.top - b.top }; }
      gsap.set(one, { opacity: 0.45 });
      gsap.set(done, { scaleX: 0 });
      gsap.set(open, { scaleX: 0 });
      gsap.set(dead, { opacity: 0.5 });
      gsap.set(m, { opacity: 0 });
      gsap.set([scB, scS], { opacity: 0, y: 6 });
      gsap.set(hot, { opacity: 0 });
      var tl = gsap.timeline({ paused: true });
      var lineY = function () { return line.offsetTop - 6; };
      tl.call(function () { gsap.set(time, { x: 0, y: lineY(), opacity: 1, scaleY: 1 }); }, null, 0);
      tl.to(one, { opacity: 1, duration: 0.5 }, 0.35);
      // a clock does not ease
      var clk = { x: 0 };
      tl.to(clk, { x: 1, duration: 1.7, ease: 'none', onUpdate: function () {
        gsap.set(time, { x: line.offsetWidth * 0.5 * clk.x });
        done.style.transform = 'scaleX(' + clk.x + ')';
      } }, 0.35);
      tl.to(dead, { opacity: 1, duration: 0.25 }, 2.05);
      tl.call(function () { var p = slotAt(); gsap.to(time, { x: p.x + 3, y: p.y + 4, scaleY: 3, duration: 0.4, ease: 'power3.inOut' }); gsap.to(hot, { opacity: 1, duration: 0.3, delay: 0.08 }); }, null, 2.1);
      tl.addLabel('peak', 2.5);
      tl.to(one, { opacity: 0.62, duration: 0.4 }, 2.5);
      tl.call(function () { sup.textContent = 'Support: not agreed'; sup.classList.add('is-hot'); time.classList.add('is-waiting'); }, null, 2.5);
      // time moves on, with no price
      tl.to(open, { scaleX: 1, duration: 0.85, ease: 'none' }, 3.3);
      tl.to(m, { opacity: 1, duration: 0.3 }, 3.85);
      tl.to(scB, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 4.2);
      tl.to(scS, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 4.4);
      return { tl: tl, end: function () {
        gsap.set(one, { opacity: 0.62 }); gsap.set(dead, { opacity: 1 }); gsap.set(m, { opacity: 1 }); gsap.set([scB, scS], { opacity: 1, y: 0 });
        gsap.set(done, { scaleX: 1 }); gsap.set(open, { scaleX: 1 });
        sup.textContent = 'Support: not agreed'; sup.classList.add('is-hot');
        var p = slotAt(); gsap.set(time, { x: p.x + 3, y: p.y + 4, scaleY: 3, opacity: 1 }); gsap.set(hot, { opacity: 1 });
      } };
    },
    /* who owns the work, the fee table: no picture, only what Sentinel writes, in its own words on the sample. A page set by the thought: each entry is one line, and a line ends where the sense pauses.
       Every word is in the page from the first frame with its colour's alpha at 0, so the height and the line breaks are final before anything shows. Nothing moves: a word's whole life is its colour and its light (--h, see .sw .rw).
       The pace is read off the words: a floor, per character, more for a figure, more for punctuation, more at a line's end. The lead speaks, the line that decides slows down, the aside falls away dimmer.
       A phrase with data-tie and the clause words it is about share one clock: they light above as it is written here. <b> stays lit when the page goes quiet; <em> is the one word the moment turns on, and 'peak' falls on it. The CSS alone is the final frame */
    write: function (host, card, cite, track, d) {
      var W = d.write, marks = $$('mark', cite), strong = marks.slice(W.quiet || 0);
      var line = function (c) { return '<span class="sw-c">' + c + '</span>'; };
      host.innerHTML = '<div class="sw sw-' + W.sev + '"><p class="sw-lead">' + W.lead.map(line).join(' ') + ' <span class="sw-c sw-land">' + W.land + '</span></p>'
        + '<p class="sw-ex">' + W.ex.map(line).join(' ') + '</p></div>';
      marks.forEach(function (m, i) { m.classList.toggle('is-quiet', i < (W.quiet || 0)); });
      if (!anim) return { end: function () { marks.forEach(function (m) { m.style.setProperty('--hl', '100%'); m.style.color = '#fff'; }); } };
      var TEMPO = {
        lead: { rise: 0.14, floor: 0.058, ch: 0.0095, num: 0.1, hold: { ',': 0.16, '.': 0.36 }, sweep: 0.16, wet: '#ffffff', dry: 0.85, glow: 0.7 },
        land: { rise: 0.18, floor: 0.085, ch: 0.012, num: 0, hold: { '.': 0.5 }, sweep: 0, wet: '#ffffff', dry: 0.4, glow: 0.9 },
        ex: { rise: 0.14, floor: 0.036, ch: 0.006, num: 0.04, hold: { ',': 0.08, ':': 0.22 }, sweep: 0.12, wet: '#e4e7ed', dry: 0.55, glow: 0 }
      };
      var READING = '#d0d6e0', BREATH = 0.3, AFTER = 0.85;
      var items = splitWords(host).map(function (el) {
        var c = el.closest('.sw-c'), tie = el.closest('[data-tie]'), pace = el.closest('[data-pace]');
        return { el: el, text: el.textContent, c: c, lvl: c.classList.contains('sw-land') ? 'land' : c.parentNode.classList.contains('sw-ex') ? 'ex' : 'lead', lit: !!el.closest('b'), key: !!el.closest('em'), tie: tie && tie.getAttribute('data-tie'), pace: pace ? +pace.getAttribute('data-pace') : 1, rest: getComputedStyle(el).color };
      });
      var isPlain = function (it) { return it.lvl === 'lead' && !it.lit && !it.key; };
      var plain = items.filter(isPlain), quiet = plain[0].rest, plainEls = plain.map(function (it) { return it.el; });
      items.forEach(function (it) { it.el.style.color = 'rgba(255, 255, 255, 0)'; });
      var tl = gsap.timeline({ paused: true }), t = 0.1, runs = {};
      items.forEach(function (it, i) {
        var T = TEMPO[it.lvl], next = items[i + 1];
        // the held breath: nothing is written, and the next word is the one that counts
        if (it.key) t += BREATH;
        if (it.tie) { runs[it.tie] = runs[it.tie] || { from: t }; runs[it.tie].to = t; }
        tl.to(it.el, { color: T.wet, duration: it.key ? 0.16 : T.rise, ease: 'none' }, t);
        tl.to(it.el, { color: isPlain(it) ? READING : it.rest, duration: it.key ? 0.9 : T.dry, ease: it.key ? 'power2.inOut' : 'power1.out' }, t + (it.key ? 0.26 : 0.3));
        if (it.key || T.glow) tl.fromTo(it.el, { '--h': 1 }, { '--h': 0, duration: it.key ? 1.5 : T.glow, ease: 'power1.out', immediateRender: false }, t);
        // the page goes quiet round what matters, the clause lifts, and the strike on the chatbot's card lands on the same beat
        if (it.key) {
          tl.addLabel('peak', t + 0.1);
          tl.to(plainEls, { color: quiet, duration: 0.8, ease: 'power2.inOut' }, t + 0.1);
          tl.to(strong, { '--ha': 0.54, duration: 0.14, ease: 'power2.out' }, t + 0.1);
          tl.to(strong, { '--ha': 0.3, duration: 0.9, ease: 'power2.out' }, t + 0.24);
        }
        t += (T.floor + T.ch * it.text.length) * it.pace + (/[0-9]/.test(it.text) ? T.num : 0);
        if (it.key) t += AFTER;
        else t += (T.hold[it.text.charAt(it.text.length - 1)] || 0) + (next && next.c !== it.c ? T.sweep : 0);
      });
      // one clock: the clause fills while its phrase is written
      Object.keys(runs).forEach(function (k) {
        var ms = k.split(',').map(function (n) { return marks[+n]; }), r = runs[k], each = Math.max(0.24, r.to - r.from + 0.12) / ms.length;
        ms.forEach(function (m, j) { tl.fromTo(m, { '--hl': '0%' }, { '--hl': '100%', color: '#ffffff', duration: each, ease: 'none', immediateRender: false }, r.from + j * each); });
      });
      return { tl: tl, end: function () {} };
    }
  };

  /* ======================================================================================== the duel */
  function setupProof() {
    var tabsEl = $('#tabs'), duel = $('#duel');
    if (!tabsEl || !duel) return;
    var tabs = $$('.tab', tabsEl), ind = $('.tab-ind', tabsEl);
    var qWrap = $('#duelQ'), qEl = $('#duelQText'), bubble = $('#bubble'), bubbleText = $('#bubbleText');
    var bot = $('#ansBot'), sen = $('#ansSen'), botTag = $('#botTag'), senTag = $('#senTag');
    var miss = $$('#miss li'), verdict = $('#verdict'), citeRef = $('#citeRef'), citeText = $('#citeText');
    var cite = $('#cite'), sim = $('#sim'), trace = $('#trace'), nodes = $$('#trace li');
    var traceWrap = $('#traceWrap'), simLbl = $('#simLbl'), simStage = $('#simStage'), simNow = null;
    var compact = mq('(max-width: 1024px)'), nextBtn = $('#duelNext');
    var current = -1, timer = null, auto = !reduced && !compact, turn = 0, timers = [], tweens = [];
    tabs.forEach(function (t) { var p = document.createElement('i'); p.className = 'tab-prog'; t.appendChild(p); });
    function move(btn) { if (!ind || !btn) return; ind.style.width = btn.offsetWidth + 'px'; ind.style.transform = 'translateX(' + btn.offsetLeft + 'px)'; }
    function later(fn, ms) { timers.push(setTimeout(fn, ms * slowBy)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; tweens.forEach(function (t) { t.kill(); }); tweens = []; }
    function el(tagName, cls, text) { var n = document.createElement(tagName); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
    function paint(d) {
      bubbleText.textContent = '';
      bubbleText.appendChild(document.createTextNode(d.bot[0])); bubbleText.appendChild(el('span', 'claim', d.bot[1])); bubbleText.appendChild(document.createTextNode(d.bot[2]));
      verdict.textContent = '';
      d.verdict.split(' ').forEach(function (w, i) { if (i) verdict.appendChild(document.createTextNode(' ')); verdict.appendChild(el('span', 'split-word', w)); });
      citeRef.textContent = d.ref;
      citeText.textContent = '';
      d.cite.forEach(function (part, i) {
        if (i % 2 === 0) { citeText.appendChild(document.createTextNode(part)); return; }
        var m = el('mark', '', part);
        if (d.write) m.setAttribute('data-tie', '');
        citeText.appendChild(m);
      });
      var hasSteps = !!d.steps;
      if (traceWrap) traceWrap.style.display = hasSteps ? '' : 'none';
      if (simLbl) { simLbl.textContent = hasSteps ? 'How it can play out' : d.lbl || ''; simLbl.classList.toggle('is-ref', d.stage === 'ref'); }
      if (simNow && simNow.drop) simNow.drop();
      if (simStage) { simStage.innerHTML = ''; simStage.style.display = hasSteps ? 'none' : ''; }
      sim.classList.toggle('has-stage', !hasSteps);
      sim.classList.toggle('is-write', !!d.write);
      simNow = !hasSteps && d.stage && STAGES[d.stage] ? STAGES[d.stage](simStage, sen, cite, function (t) { tweens.push(t); }, d) : null;
      if (hasSteps) nodes.forEach(function (li, j) { $('.trace-t', li).textContent = d.steps[j][0]; $('.trace-v', li).textContent = d.steps[j][1]; });
    }
    function markClause(now) { var m = $('mark:not([data-tie])', citeText); if (!m) return; if (now || !anim) m.style.setProperty('--hl', '100%'); else tweens.push(gsap.fromTo(m, { '--hl': '0%' }, { '--hl': '100%', duration: 0.7, ease: 'power2.inOut' })); }
    function playSim(now) {
      if (simNow) {
        if (now || !anim) { simNow.end(); return; }
        var tl = simNow.tl, my = turn;
        tl.call(function () { if (my === turn) landPeak(); }, null, 'peak');
        tweens.push(tl);
        // on one column Sentinel's card sits below the chatbot's: its stage waits to be seen
        if (compact && 'IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); if (my === turn) tl.play(); } }, { threshold: 0.6 });
          io.observe(sim);
          timers.push(setTimeout(function () { io.disconnect(); }, 60000));
        } else tl.play();
        return;
      }
      if (now || !anim) { nodes.forEach(function (li) { li.classList.add('on'); }); trace.style.setProperty('--run', 1); return; }
      var k = { v: 0 };
      nodes[0].classList.add('on');
      tweens.push(gsap.to(k, { v: 1, duration: 2.2, ease: 'power1.inOut', onUpdate: function () { trace.style.setProperty('--run', k.v.toFixed(4)); if (k.v >= 0.5) nodes[1].classList.add('on'); if (k.v >= 0.995) nodes[2].classList.add('on'); } }));
    }
    function landPeak() {
      sen.classList.add('is-proven'); swapText(senTag, 'Cited');
      tweens.push(gsap.fromTo(sen, { '--sheen': '-100%' }, { '--sheen': '100%', duration: 1.1, ease: 'power2.inOut' }));
      var c = $('.claim', bubbleText); if (c) tweens.push(gsap.fromTo(c, { '--cut': '0%' }, { '--cut': '100%', duration: 0.5, ease: 'power2.inOut' }));
      bot.classList.add('is-missed'); swapText(botTag, 'Missed it');
    }
    function reset() {
      qEl.textContent = ''; qWrap.classList.add('is-typing');
      bubble.classList.remove('is-done', 'is-thinking');
      bot.classList.remove('is-missed'); sen.classList.remove('is-proven');
      botTag.textContent = 'Answers'; senTag.textContent = 'Reading';
      miss.forEach(function (li) { li.classList.remove('on'); });
      cite.classList.remove('on'); sim.classList.remove('on');
      nodes.forEach(function (li) { li.classList.remove('on'); });
      trace.style.setProperty('--run', 0); sen.style.setProperty('--sheen', '-100%');
    }
    function showAll(d) {
      qEl.textContent = d.q; qWrap.classList.remove('is-typing'); bubble.classList.add('is-done');
      bot.classList.add('is-missed'); sen.classList.add('is-proven'); botTag.textContent = 'Missed it'; senTag.textContent = 'Cited';
      miss.forEach(function (li) { li.classList.add('on'); });
      $$('.split-word', verdict).forEach(function (w) { w.style.opacity = 1; });
      cite.classList.add('on'); sim.classList.add('on');
      markClause(true); playSim(true);
      var c = $('.claim', bubbleText); if (c) c.style.setProperty('--cut', '100%');
    }
    var stageEls = [$('.duel-cols', duel), qEl], shownOnce = false;
    function play(i) {
      var d = PROOF[i], my = ++turn;
      clearAll();
      if (!anim) { reset(); paint(d); showAll(d); return; }
      var out = shownOnce ? run(stageEls, { opacity: [1, 0] }, { duration: 0.22, spring: false }) : Promise.resolve();
      shownOnce = true;
      out.then(function () {
        if (my !== turn) return;
        reset(); paint(d);
        run(stageEls, { opacity: [0, 1] }, { duration: 0.5, spring: false }).then(function () { if (my === turn) stageEls.forEach(function (e) { e.style.opacity = ''; }); });
        begin(d, my);
      });
    }
    function begin(d, my) {
      var k = 0;
      (function type() {
        if (my !== turn) return;
        k++; qEl.textContent = d.q.slice(0, k);
        if (k < d.q.length) { timers.push(setTimeout(type, (18 + Math.random() * 20) * slowBy)); return; }
        qWrap.classList.remove('is-typing');
        later(function () { bubble.classList.add('is-thinking'); }, 200);
        later(function () { bubble.classList.remove('is-thinking'); bubble.classList.add('is-done'); }, 1100);
        miss.forEach(function (li, j) { later(function () { li.classList.add('on'); }, 1800 + j * 180); });
        later(function () { run($$('.split-word', verdict), WORDS, { duration: 1, stagger: 0.05 }); }, 700);
        later(function () { cite.classList.add('on'); }, 1700);
        later(function () { markClause(false); }, 2200);
        later(function () { sim.classList.add('on'); }, d.steps ? 3000 : 2500);
        later(function () { playSim(false); }, d.steps ? 3400 : 2900);
        // tab 1 has no peak of its own; the others land on theirs
        if (d.steps) later(landPeak, 6000);
      })();
    }
    function select(i) {
      if (i === current) return;
      current = i;
      tabs.forEach(function (t, j) { t.classList.toggle('is-active', j === i); t.setAttribute('aria-selected', String(j === i)); });
      move(tabs[i]);
      play(i);
    }
    function restartProgress() { tabsEl.classList.remove('is-auto'); void tabsEl.offsetWidth; if (auto) tabsEl.classList.add('is-auto'); }
    function schedule() { clearTimeout(timer); if (!auto) return; var stay = (PROOF[current] && PROOF[current].dwell) || PROOF_INTERVAL; tabsEl.style.setProperty('--dwell', stay + 'ms'); restartProgress(); timer = setTimeout(function () { select((current + 1) % PROOF.length); schedule(); }, stay); }
    function stopAuto() { auto = false; clearTimeout(timer); tabsEl.classList.remove('is-auto'); }
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { stopAuto(); select(i); }); });
    if (nextBtn) nextBtn.addEventListener('click', function () { stopAuto(); select((current + 1) % PROOF.length); });
    var started = false;
    function start() { if (started) return; started = true; select(0); schedule(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { if (!started) start(); else schedule(); } else { clearTimeout(timer); tabsEl.classList.remove('is-auto'); } });
      }, { threshold: 0.3 }).observe(duel);
    } else start();
    if (fine) {
      duel.addEventListener('mouseenter', function () { clearTimeout(timer); tabsEl.classList.add('is-paused'); });
      duel.addEventListener('mouseleave', function () { tabsEl.classList.remove('is-paused'); if (started) schedule(); });
    }
    window.addEventListener('resize', function () { move($('.tab.is-active', tabsEl)); if (simNow && simNow.relayout) simNow.relayout(); });
    fontsReady().then(function () { move($('.tab.is-active', tabsEl)); });
    move(tabs[0]);
  }

  /* ======================================================================================== your side: raking light.
     One sheet of paper and one lamp. Low on the Bank's side, the clause throws one sentence across the page; low on the Supplier's, another; overhead, none, because light from straight above casts no shadow.
     Not a word of the contract moves: only the light does. One number, L, from -1 (the Bank) through 0 (overhead) to +1 (the Supplier), drives every piece of geometry, and whichever input spoke last sets it:
     the hand or a press; the scroll never touches it. The stance words on the foot are the product's own. */
  var READS = [
    { i: 0, ref: '§7.3', clause: 'The Supplier may terminate this Agreement for convenience by giving the Bank not less than 60 days’ notice.',
      bank: ['<i>They</i> can leave,', 'and keep what <i>you</i> paid.'], supplier: ['<i>You</i> can leave,', 'and keep what <i>they</i> paid.'], note: 'Not a word of the contract changed. Two findings changed sides.' },
    { i: 1, ref: '§8.4', clause: '…shall give the Supplier conduct of the claim, subject to the procedure in clause 12.3.',
      bank: ['It points to a clause', 'that was never written.'], supplier: ['It points to a clause', 'that was never written.'], note: 'This one reads the same from both chairs.' },
    { i: 2, ref: '§4.4', clause: 'The licence and support fees for the second year shall be agreed by the parties in good faith before the end of the first year.',
      bank: ['<i>You</i> don’t know', 'what year two costs.'], supplier: ['<i>You</i> don’t know', 'what year two pays.'], note: 'It affects both sides, and not in the same way.' },
    { i: 3, ref: '§9.3', clause: '…vest in the Bank on payment…” and “The Supplier retains all intellectual property rights in the Deliverables…',
      bank: ['<i>You</i> may not own', 'what you paid for.'], supplier: ['<i>You</i> may not own', 'what you built.'], note: 'It affects both sides, and not in the same way.' },
    { i: 4, ref: '§4.3', clause: 'First quarter 5,000 · Second quarter 5,000 · Third quarter 5,000 · Fourth quarter 5,000 · Annual total 25,000',
      bank: ['The rows add up to £20,000.', 'The total says £25,000.'], supplier: ['The rows add up to £20,000.', 'The total says £25,000.'], note: 'This one reads the same from both chairs.' },
    { i: 5, ref: '§10.4', clause: 'The Licensor may update Schedule 2 by notice to the Bank.',
      bank: ['<i>They</i> can change Schedule 2', 'just by telling <i>you</i>.'], supplier: ['<i>You</i> can change Schedule 2', 'just by telling <i>them</i>.'], note: 'Not a word of the contract changed. Two findings changed sides.' }
  ];
  function setupSide() {
    var pin = $('#sidePin'), sheet = $('#sheet');
    if (!pin || !sheet) return;
    var veil = $('.veil', sheet), noon = $('.sheet-noon', sheet), edgeL = $('.edge-l', sheet), edgeR = $('.edge-r', sheet);
    var rakeL = $('.rake-l', sheet), rakeR = $('.rake-r', sheet), castL = $('.cast-l', sheet), castR = $('.cast-r', sheet);
    var btnBank = $('#sideBank'), btnSup = $('#sideSup'), btnNo = $('#sideNo'), refEl = $('#sideRef'), clauseEl = $('#sideClause'), noonText = $('#sideNoon'), lineEl = $('#sideLine'), live = $('#sideLive');
    var foot = $('#sideFoot'), narrow = !mq(DESK);
    var cur = 0, L = 0, target = 0, chair = 0, visible = false, shownNoon = true, used = false;

    /* the foot: the report's order, the report's groups, the report's words */
    var lastWhen = -1, h = '';
    READS.forEach(function (r, k) {
      var f = FINDINGS[r.i];
      h += '<li class="st' + (f.when !== lastWhen ? ' has-when' : '') + '">' + (f.when !== lastWhen ? '<span class="st-when">' + WHEN[f.when] + '</span>' : '') + '<button type="button" class="st-b" data-k="' + k + '"><span class="st-top">' + r.ref + '</span><span class="st-word"></span></button></li>';
      lastWhen = f.when;
    });
    h += '<li class="st has-when st-more"><span class="st-when">' + WHEN[2] + '</span><span class="st-top">3 more</span></li>';
    foot.innerHTML = h;
    var stops = $$('.st-b', foot);
    var WORD = { against: 'Against you', favour: 'In your favour', both: 'Both sides', unclear: 'Unclear' };

    function castHtml(lines) {
      var t = lines.join('<br>');
      return '<div class="c-sharp">' + t + '</div><div class="c-soft" aria-hidden="true">' + t + '</div><div class="c-pen" aria-hidden="true">' + t + '</div>';
    }
    function fillWords() {
      stops.forEach(function (b, k) {
        var f = FINDINGS[READS[k].i], w = $('.st-word', b), text = chair === 0 ? '' : WORD[chair < 0 ? f.bank : f.supplier];
        b.classList.toggle('is-on', k === cur);
        b.setAttribute('aria-pressed', String(k === cur));
        var st = chair === 0 ? '' : (chair < 0 ? f.bank : f.supplier);
        b.setAttribute('data-st', st);
        if (w.textContent !== text) {
          w.textContent = text;
          if (anim && w.animate) w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: k * 40, fill: 'backwards', easing: 'ease-out' });
        }
      });
    }
    function fillClause(k) {
      var r = READS[k];
      cur = k;
      refEl.textContent = r.ref;
      clauseEl.textContent = '“' + r.clause + '”';
      castL.innerHTML = castHtml(r.bank);
      castR.innerHTML = castHtml(r.supplier);
      fillWords();
    }
    // until both sides have been seen, the line says what to do next, and which way
    var seen = {};
    function nextLine() {
      if (seen[-1] && seen[1]) return READS[cur].note;
      var go = fine ? 'Now move your mouse to the other side' : 'Now drag to the other side';
      return chair < 0 ? go + ' →' : '← ' + go;
    }
    function setLine(t) {
      if (lineEl.textContent === t) return;
      lineEl.textContent = t;
      if (anim && lineEl.animate) lineEl.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 350, fill: 'backwards', easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    function say(c) {
      if (!live) return;
      var r = READS[cur];
      live.textContent = c === 0 ? 'No side taken.' : (c < 0 ? 'Read as the Bank: ' : 'Read as the Supplier: ') + (c < 0 ? r.bank : r.supplier).join(' ').replace(/<[^>]+>/g, '');
    }

    /* the contract itself, pressed into the paper with no ink: under a low light its letters and the paper's tooth catch on one side. Baked once for each side, then only their opacity changes.
       Two layers are enough: lit from one side, the relief scales with how low the lamp is, and at noon it is exactly nothing */
    function bake() {
      if (narrow || !rakeL.getContext) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1), W = sheet.clientWidth, H = Math.round(sheet.clientHeight * 0.66);
      if (!W || !H) return;
      var w = Math.round(W * dpr), hh = Math.round(H * dpr);
      var stamp = document.createElement('canvas');
      stamp.width = w; stamp.height = hh;
      var st = stamp.getContext('2d');
      st.scale(dpr, dpr);
      st.font = '400 13.5px "Source Serif 4", Georgia, serif';
      st.fillStyle = '#fff';
      st.textBaseline = 'alphabetic';
      var text = WALL.filter(function (c) { return c[0] !== '|'; }).map(function (c) { return c[0] + '  ' + c[1]; }).join('   ');
      text = (text + '   ' + text + '   ' + text).split(/\s+/);
      var x = 32, y = 22, i = 0, lineW = W - 64, line = [], width = 0, space = st.measureText(' ').width;
      while (y < H + 22 && i < text.length) {
        var tw = st.measureText(text[i]).width;
        if (width + tw > lineW && line.length) {
          // justified, as a contract is set
          var extra = (lineW - (width - space)) / Math.max(1, line.length - 1), px = x;
          line.forEach(function (w0) { st.fillText(w0.t, px, y); px += w0.w + space + extra; });
          y += 22; line = []; width = 0;
        }
        line.push({ t: text[i], w: tw });
        width += tw + space;
        i++;
      }
      function crescent(dx, color) {
        var c = document.createElement('canvas');
        c.width = w; c.height = hh;
        var g = c.getContext('2d');
        g.drawImage(stamp, dx * dpr, 0);
        g.globalCompositeOperation = 'destination-out';
        g.drawImage(stamp, 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = color;
        g.fillRect(0, 0, w, hh);
        return c;
      }
      // the paper's tooth: smooth noise, lit by its slope
      var N = 256, tile = document.createElement('canvas');
      tile.width = tile.height = N;
      var tc = tile.getContext('2d'), img = tc.createImageData(N, N), seedV = [], nx, ny;
      for (var s = 0; s < N * N; s++) seedV.push(Math.random());
      function n(a, b) { var A = ((a % N) + N) % N, B = ((b % N) + N) % N; return seedV[B * N + A]; }
      function smooth(a, b) { return (n(a, b) * 2 + n(a - 1, b) + n(a + 1, b) + n(a, b - 1) + n(a, b + 1)) / 6; }
      [[rakeL, -1], [rakeR, 1]].forEach(function (pair) {
        var cv = pair[0], side = pair[1];
        cv.width = w; cv.height = hh;
        cv.style.height = H + 'px';
        var g = cv.getContext('2d');
        for (ny = 0; ny < N; ny++) for (nx = 0; nx < N; nx++) {
          var d = (smooth(nx, ny) - smooth(nx - 1, ny)) * side * -1, p = (ny * N + nx) * 4, on = d > 0;
          img.data[p] = img.data[p + 1] = img.data[p + 2] = on ? 235 : 0;
          img.data[p + 3] = Math.min(255, Math.abs(d) * (on ? 62 : 86));
        }
        tc.putImageData(img, 0, 0);
        g.fillStyle = g.createPattern(tile, 'repeat');
        g.fillRect(0, 0, w, hh);
        g.drawImage(crescent(side < 0 ? -0.7 : 0.7, 'rgba(0,0,0,.42)'), 0, 0);
        g.drawImage(crescent(side < 0 ? 0.7 : -0.7, 'rgba(223,229,255,.24)'), 0, 0);
      });
    }

    var sstep = function (a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    var mix = function (a, b, t) { return a + (b - a) * t; };
    var geo = { cx: 0, cy: 0, ccy: 0, sw: 0 };
    function measure() {
      var s = sheet.getBoundingClientRect(), c = clauseEl.getBoundingClientRect(), f = $('.sheet-cast', sheet).getBoundingClientRect();
      geo.sw = s.width;
      geo.cy = f.top + f.height / 2 - s.top;
      geo.ccy = c.top + c.height / 2 - s.top;
    }
    function render() {
      var a = Math.abs(L);
      veil.style.transform = 'translate3d(' + (L * 0.34 * geo.sw).toFixed(1) + 'px,0,0) scale(' + mix(1.35, 1, a).toFixed(3) + ')';
      noon.style.opacity = (0.7 * (1 - Math.pow(a, 1.2))).toFixed(3);
      if (!narrow) {
        rakeL.style.opacity = Math.pow(Math.max(-L, 0), 1.4).toFixed(3);
        rakeR.style.opacity = Math.pow(Math.max(L, 0), 1.4).toFixed(3);
      }
      edgeL.style.opacity = Math.max(-L, 0).toFixed(3);
      edgeR.style.opacity = Math.max(L, 0).toFixed(3);
      var e = sstep(0.18, 0.85, a), o = sstep(0.12, 0.45, a), side = L < 0 ? -1 : 1;
      var on = side < 0 ? castL : castR, off = side < 0 ? castR : castL;
      off.style.opacity = 0;
      on.style.opacity = o.toFixed(3);
      // the shadow falls out of the clause, away from the lamp, and past the end of its fall it stops moving
      var dy = (geo.ccy - geo.cy) * (1 - e), dx = -side * (narrow ? 0 : 62) * e;
      on.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + mix(0.24, 1, e).toFixed(3) + ')';
      btnBank.style.opacity = (L < 0 ? mix(0.62, 1, a) : mix(0.62, 0.46, a)).toFixed(3);
      btnSup.style.opacity = (L > 0 ? mix(0.62, 1, a) : mix(0.62, 0.46, a)).toFixed(3);
      // the chair commits, with a little hysteresis, and the words follow it
      var next = a > 0.22 ? side : a < 0.16 ? 0 : chair;
      if (next !== chair) {
        chair = next;
        seen[chair] = true;
        fillWords();
        btnBank.setAttribute('aria-pressed', String(chair < 0));
        btnSup.setAttribute('aria-pressed', String(chair > 0));
        btnNo.setAttribute('aria-pressed', String(chair === 0));
        say(chair);
        if (chair !== 0) { setLine(nextLine()); noonText.classList.remove('is-on'); shownNoon = false; }
        else setLine('');
      }
      if (chair === 0 && !shownNoon && a < 0.1) { shownNoon = true; setTimeout(function () { if (chair === 0) noonText.classList.add('is-on'); }, 250); }
    }

    var pressTween = null;
    function press(to, auto) {
      if (!auto) used = true;
      target = to;
      if (pressTween) pressTween.kill();
      var k = { v: L };
      pressTween = gsap.to(k, { v: to, duration: 1.15, ease: 'power3.inOut', onUpdate: function () { L = k.v; target = k.v; render(); }, onComplete: function () { pressTween = null; } });
    }
    function changeClause(k) {
      used = true;
      if (k === cur) return;
      if (!anim) { fillClause(k); return; }
      var on = L < 0 ? castL : castR;
      gsap.to(on, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: function () {
        gsap.fromTo(clauseEl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
        fillClause(k);
        setLine(chair ? nextLine() : '');
        render();
        var o = L < 0 ? castL : castR, keep = o.style.opacity;
        gsap.fromTo(o, { opacity: 0 }, { opacity: keep, duration: 0.6, ease: 'power2.out', clearProps: 'none' });
      } });
    }

    btnBank.addEventListener('click', function () { if (anim) press(-1); else { L = -1; render(); } });
    btnSup.addEventListener('click', function () { if (anim) press(1); else { L = 1; render(); } });
    btnNo.addEventListener('click', function () { if (anim) press(0); else { L = 0; render(); } });
    foot.addEventListener('click', function (e) { var b = e.target.closest('.st-b'); if (b) changeClause(+b.getAttribute('data-k')); });

    fillClause(0);
    setLine('');
    if (!fine) { $('#sideGo').textContent = 'Drag to the side you’re on'; $('#sideSub').textContent = 'Every finding is then marked from that chair. Or choose Neither, and no side is taken.'; }
    noonText.classList.add('is-on');
    measure();
    bake();
    if (!anim) {
      L = -1;
      chair = 0;
      render();
      window.addEventListener('resize', function () { measure(); render(); });
      return;
    }
    render();

    /* the hand is the lamp: the outer third of the page on each side simply is that chair. Only the hand moves it: scrolling past leaves the lamp exactly where it was left */
    var crossT = 0, cross = null;
    if (fine) {
      // a browser may report a "move" as the page scrolls under a still mouse: only a pointer that has really changed place counts
      var mx = null, my = null;
      window.addEventListener('pointermove', function (e) {
        var still = mx === null || (e.clientX === mx && e.clientY === my);
        mx = e.clientX;
        my = e.clientY;
        if (still || e.pointerType === 'touch' || !pin.contains(e.target)) return;
        if (e.target.closest('.sheet-foot, button')) return;
        var s = sheet.getBoundingClientRect(), u = (e.clientX - (s.left + s.width / 2)) / (s.width / 2);
        if (Math.abs(u) < 0.06) u = 0;
        if (pressTween) { pressTween.kill(); pressTween = null; }
        used = true;
        target = Math.max(-1, Math.min(1, u / 0.72));
      });
    } else {
      // no mouse: a thumb across the page, the page's vertical scroll stays its own (touch-action: pan-y); until the first touch the lamp crosses by itself
      var startX = null, startL = 0, dragged = false;
      sheet.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; startX = e.clientX; startL = target; dragged = false; });
      sheet.addEventListener('pointermove', function (e) { if (startX == null) return; dragged = true; used = true; target = Math.max(-1, Math.min(1, startL + (e.clientX - startX) / (sheet.clientWidth / 2))); });
      var up = function () { if (startX == null) return; startX = null; if (dragged && Math.abs(target) > 0.02) press(target < 0 ? -1 : 1); };
      sheet.addEventListener('pointerup', up);
      sheet.addEventListener('pointercancel', up);
      cross = function () {
        clearTimeout(crossT);
        if (!visible || used) return;
        press(chair < 0 ? 1 : -1, true);
        crossT = setTimeout(cross, 4400);
      };
    }
    var last = 0, breathT = 0;
    function frame(time) {
      var dt = last ? Math.min(0.1, time - last) : 0.016;
      last = time;
      breathT += dt;
      if (!pressTween) {
        // a heavy lamp: it answers in the same frame and settles in about 0.7 s
        var breath = Math.abs(target) > 0.9 ? Math.sin(breathT * 0.7) * 0.016 : 0;
        L += (target + breath - L) * (1 - Math.exp(-dt * 6));
        if (L > 1) L = 1;
        if (L < -1) L = -1;
        render();
      }
    }
    whileVisible(pin, function () {
      visible = true;
      gsap.ticker.add(frame);
      if (cross && !used) { clearTimeout(crossT); crossT = setTimeout(cross, 900); }
    }, function () {
      visible = false;
      gsap.ticker.remove(frame);
      if (cross) clearTimeout(crossT);
    }, '10% 0px');
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () { measure(); render(); if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; bake(); } });
    fontsReady().then(function () { measure(); bake(); render(); });
  }

  /* ======================================================================================== keep watch: one radar, one date at a time */
  /* the dates are the sample portfolio's (invented, the same the interface's Calendar was captured with), counted from today so they are always ahead */
  var WATCH = [
    { a: 34, d: 3, k: 'Your payment', t: 'Pay the quarterly hosting fee', m: 'Cloud Hosting Agreement, Corvane Cloud Ltd', r: '6.1', q: 'The Customer shall pay the hosting fee quarterly in advance.' },
    { a: 94, d: 9, k: 'Their duty', t: 'Share the penetration test summary', m: 'Cloud Hosting Agreement, Corvane Cloud Ltd', r: '10.5', q: 'The Provider shall share a summary of each penetration test.' },
    { a: 152, d: 14, k: 'Your notice', t: 'Tell the insurer about any material change in risk', m: 'Insurance Policy Wording, Vesper Harbour Insurance', r: '11.2', q: 'The Insured shall notify the Insurer of any material change within 14 days.' },
    { a: 208, d: 28, k: 'Your last day', t: 'Last day to stop the automatic renewal', m: 'Payroll Services Agreement, Ilvane Payroll Inc.', r: '12.1', q: 'This Agreement renews for 12 months unless either party gives 90 days’ notice.' },
    { a: 268, d: 46, k: 'Their notice', t: 'Serve notice for the rent review', m: 'Commercial Lease, Quaymark Estates LLP', r: '6.4', q: 'The Landlord may serve a rent review notice not less than 3 months before the review date.' },
    { a: 326, d: 84, k: 'Your last day', t: 'Last day to give notice of non-renewal', m: 'Cloud Hosting Agreement, Corvane Cloud Ltd', r: '14.2', q: 'Either party may stop renewal by giving 120 days’ notice.' }
  ];
  function setupRadar() {
    var radar = $('#radar'), beam = $('#radarBeam'), blipsEl = $('#radarBlips'), inner = $('#wcIn');
    if (!radar || !inner) return;
    var kind = $('#wcKind'), left = $('#wcLeft'), date = $('#wcDate'), title = $('#wcT'), meta = $('#wcM'), ref = $('#wcRef'), quote = $('#wcQ'), flow = $$('#wcFlow li');
    /* rings at 7, 30 and 90 days, drawn at these fractions of the outer radius */
    function radius(d) { return d <= 7 ? 0.2 + (d / 7) * 0.137 : d <= 30 ? 0.337 + ((d - 7) / 23) * 0.326 : 0.663 + ((d - 30) / 60) * 0.337; }
    function tone(d) { return d <= 7 ? 'var(--crit)' : d <= 30 ? 'var(--med)' : 'var(--cobalt-3)'; }
    blipsEl.innerHTML = WATCH.map(function (w) {
      var r = radius(w.d) * 49, rad = (w.a * Math.PI) / 180;
      return '<i class="blip" style="left:' + (50 + r * Math.sin(rad)).toFixed(2) + '%;top:' + (50 - r * Math.cos(rad)).toFixed(2) + '%;--c:' + tone(w.d) + '"></i>';
    }).join('');
    var blips = $$('.blip', blipsEl), now = Date.now();
    function fill(i) {
      var w = WATCH[i], when = new Date(now + w.d * 864e5);
      kind.textContent = w.k;
      left.textContent = 'in ' + w.d + ' days';
      left.style.setProperty('--c', tone(w.d));
      date.textContent = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
      title.textContent = w.t;
      meta.textContent = w.m;
      ref.textContent = '§' + w.r;
      quote.textContent = '“' + w.q + '”';
    }
    /* the card keeps one height: it never jumps as the dates change */
    function settle() {
      inner.style.minHeight = '';
      var h = 0;
      WATCH.forEach(function (_, i) { fill(i); h = Math.max(h, inner.offsetHeight); });
      inner.style.minHeight = h + 'px';
    }
    var on = 0;
    settle();
    fill(0);
    blips[0].classList.add('is-on');
    window.addEventListener('resize', function () { settle(); fill(on); });
    if (!anim) { blips.forEach(function (b) { b.classList.add('is-lit'); }); return; }
    function show(i) {
      on = i;
      gsap.to(inner, { opacity: 0, y: -6, duration: 0.2, ease: 'power2.in', overwrite: true, onComplete: function () {
        fill(i);
        gsap.fromTo(inner, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      } });
      gsap.fromTo(flow, { opacity: 0.4 }, { opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.4, delay: 0.45, overwrite: true });
    }
    function hit(i) {
      var b = blips[i];
      blips.forEach(function (x, k) { x.classList.toggle('is-on', k === i); });
      b.classList.add('is-lit', 'is-ping');
      setTimeout(function () { b.classList.remove('is-lit'); }, 500);
      setTimeout(function () { b.classList.remove('is-ping'); }, 1500);
      if (i !== on) show(i);
    }
    var st = { a: WATCH[0].a - 6 }, prev = st.a, TURN = 27;
    beam.style.transform = 'rotate(' + st.a + 'deg)';
    var spin = gsap.to(st, { a: st.a + 360, duration: TURN, ease: 'none', repeat: -1, paused: true, onUpdate: function () {
      var a = ((st.a % 360) + 360) % 360, p = ((prev % 360) + 360) % 360;
      beam.style.transform = 'rotate(' + a + 'deg)';
      WATCH.forEach(function (w, i) { if (p <= a ? (p < w.a && a >= w.a) : (p < w.a || a >= w.a)) hit(i); });
      prev = st.a;
    } });
    whileVisible(radar, function () { spin.play(); }, function () { spin.pause(); }, '10% 0px');
  }

  /* ======================================================================================== what if, inside the answer */
  /* the sample contract's clauses, played out; the law, the days and the wording of the answer are an illustration, and the page says so */
  var WI = [
    { pick: 'A new law',
      q: 'A new law, nationwide: from 1 January every automated credit decision must come with its reasons. Will we hold under the Brightmoor contract?',
      lead: 'That turns on who has to change the engine, and what the contract does when the law moves. Let me play it out from the day the law applies.',
      title: 'A new law applies nationwide on 1 January 2027',
      read: ['§5.2', '§5.3', '§7.1', '§7.2', '§7.3', '§7.4', '§9.1'],
      nodes: [
        { day: 0, when: '1 Jan 2027', t: 'The law applies', s: 'The contract says nothing about a change in law.', refs: [], y: 0.03 },
        { day: 1, when: '2 Jan', t: 'The Bank asks for the change', s: 'The engine is Brightmoor’s. Nothing binds until both sign.', refs: ['9.1', '5.2'], y: 0.34 },
        { day: 60, when: '2 Mar', t: 'The Bank wants out', s: 'Only the Supplier can end it for convenience. Nobody is in breach.', refs: ['7.3', '7.2'], y: 0.68 },
        { day: 425, when: '1 Mar 2028', t: 'The term runs out', s: '14 months on the old engine. Every fee paid stays paid.', refs: ['5.3', '7.1', '7.4'], y: 1 }
      ],
      bank: 'Exposed', sup: 'Not exposed', tone: 'var(--crit)',
      answer: ['<strong>It doesn’t hold.</strong> Brightmoor owns the engine and nothing makes it change, so the Bank is stuck with a system it can’t lawfully run until March 2028.', 'One new clause closes it: a duty to keep the platform lawful, or a right to leave if it can’t be.'],
      next: ['Draft that clause', 'What if Brightmoor says no?'] },
    { pick: 'A party walking away',
      q: 'What if Brightmoor walks away next month?',
      lead: 'It can. Here is what that does to the Bank, from the day the notice arrives.',
      title: 'The Supplier ends the contract for convenience',
      read: ['§7.3', '§7.4', '§7.6', '§9.3', '§9.4', '§9.5'],
      nodes: [
        { day: 0, when: 'The notice', t: 'Brightmoor gives notice', s: 'No reason needed, just 60 days.', refs: ['7.3'], y: 0.03 },
        { day: 60, when: 'The end', t: 'The engine goes with it', s: 'The licence to the software lasts only for the term.', refs: ['9.5'], y: 0.56 },
        { day: 61, when: 'The next day', t: 'Who owns the work?', s: 'One clause says the Bank. The next says Brightmoor.', refs: ['9.3', '9.4'], y: 0.8 },
        { day: 90, when: 'The clean-up', t: 'The money stays gone', s: 'Confidential files go back within 30 days. Fees paid don’t.', refs: ['7.6', '7.4'], y: 1 }
      ],
      bank: 'Exposed', sup: 'Not exposed', tone: 'var(--crit)',
      answer: ['<strong>You lose the platform, and the money stays with them.</strong> Brightmoor can do this for any reason, at any time.', 'Two changes close it: make §7.3 run both ways, and refund what hasn’t been used.'],
      next: ['Draft those changes', 'What if we walk away first?'] },
    { pick: 'A late payment',
      q: 'What if we pay a Brightmoor invoice 30 days late?',
      lead: 'Late payment has its own rule here, so this one is simpler. Playing it through.',
      title: 'The Bank pays an invoice 30 days late',
      read: ['§4.7', '§7.2'],
      nodes: [
        { day: 0, when: 'The due date', t: 'The invoice falls due', s: 'The Bank has 30 days from receiving it.', refs: ['4.7'], y: 0.03 },
        { day: 1, when: 'The next day', t: 'Interest starts', s: '4% a year above base rate, from the due date.', refs: ['4.7'], y: 0.14 },
        { day: 5, when: 'If they act', t: 'Brightmoor sends a breach notice', s: 'The Bank then has 30 days to put it right.', refs: ['7.2'], y: 0.27 },
        { day: 30, when: 'Paid', t: 'The Bank pays, with interest', s: 'Put right in time. The contract carries on.', refs: ['7.2'], y: 0.17 }
      ],
      bank: 'Interest only', sup: 'Not exposed', tone: 'var(--med)',
      answer: ['<strong>You hold.</strong> Thirty days late costs you the interest and nothing more, as long as you pay within 30 days of any breach notice.', 'Miss that, and Brightmoor can end the contract.'],
      next: ['Show me the interest', 'What if we dispute the invoice?'] }
  ];
  function setupWhatIf() {
    var chat = $('#chat');
    if (!chat) return;
    var view = $('#chatView'), flow = $('#chatFlow'), typed = $('#chatTyped'), input = $('#chatInput'), send = $('#chatSend'), user = $('#wiUser'), qEl = $('#wiQ'), bot = $('#wiBot'), lead = $('#wiLead'), card = $('#wiCard'), after = $('#wiAfter');
    var titleEl = $('#wicT'), dayEl = $('#wicDay'), steps = $$('#wicSteps li'), chart = $('#wicChart'), track = $('.wic-track', card), rail = $('.wic-rail', card), railFill = $('#wicRail'), nodesEl = $('#wicNodes'), weigh = $('#wicWeigh'), picks = $('#wiPicks');
    var cur = 0, tl = null, visible = false, touched = false, began = false, lastW = 0;
    picks.innerHTML = WI.map(function (S, i) { return '<button type="button" class="pick" data-i="' + i + '">' + S.pick + '</button>'; }).join('');
    var pickEls = $$('.pick', picks);
    var lerp = function (a, b, t) { return a + (b - a) * t; };

    /* the long question stays readable as it is typed: the end of it is always the part in view */
    function fit() {
      var over = typed.offsetWidth - input.clientWidth + 32;
      typed.style.transform = over > 0 ? 'translateX(' + -over + 'px)' : '';
    }
    function setStep(k) { steps.forEach(function (li, j) { li.className = j < k ? 'is-done' : j === k ? 'is-act' : ''; }); }

    /* the two parties on one calendar: they start together, and how far apart they end up is who is exposed */
    function buildChart(S) {
      var W = chart.clientWidth, H = chart.clientHeight, n = S.nodes.length, gap = 16, col = (W + gap) / n, base = H - 30, top = 36;
      var xs = S.nodes.map(function (_, i) { return Math.round(i * col) + 1; });
      var ys = S.nodes.map(function (m) { return Math.round(base - (base - top) * m.y); });
      var d = 'M' + xs[0] + ' ' + ys[0];
      for (var i = 0; i < n - 1; i++) { var dx = (xs[i + 1] - xs[i]) * 0.5; d += ' C' + (xs[i] + dx) + ' ' + ys[i] + ' ' + (xs[i + 1] - dx) + ' ' + ys[i + 1] + ' ' + xs[i + 1] + ' ' + ys[i + 1]; }
      d += ' L' + W + ' ' + ys[n - 1];
      var area = d + ' L' + W + ' ' + base + ' L' + xs[0] + ' ' + base + ' Z';
      var cols = xs.map(function (x, i) { return '<line class="wic-stem" data-i="' + i + '" x1="' + x + '" x2="' + x + '" y1="' + ys[i] + '" y2="' + H + '"/>'; }).join('');
      var dots = xs.map(function (x, i) { return '<circle class="wic-ping" data-i="' + i + '" cx="' + x + '" cy="' + ys[i] + '" r="5"/><circle class="wic-dot" data-i="' + i + '" cx="' + x + '" cy="' + ys[i] + '" r="4"/>'; }).join('');
      chart.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><defs>'
        + '<linearGradient id="wiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + S.tone + '" stop-opacity=".36"/><stop offset="1" stop-color="' + S.tone + '" stop-opacity=".03"/></linearGradient>'
        + '<clipPath id="wiClip"><rect class="wic-reveal" x="0" y="0" width="0" height="' + H + '"/></clipPath></defs>'
        + '<line class="wic-base" x1="' + xs[0] + '" x2="' + W + '" y1="' + base + '" y2="' + base + '"/>' + cols
        + '<g clip-path="url(#wiClip)"><path class="wic-area" d="' + area + '" fill="url(#wiGrad)"/><line class="wic-sup" x1="' + xs[0] + '" x2="' + W + '" y1="' + base + '" y2="' + base + '"/><path class="wic-glow" d="' + d + '"/><path class="wic-bank" d="' + d + '"/></g>'
        + dots
        + '<g class="wic-head"><line class="wic-head-l" y1="0" y2="' + H + '"/><circle class="wic-head-h" r="9"/><circle class="wic-head-d" r="3.5"/><circle class="wic-head-s" r="3" cy="' + base + '"/></g></svg>'
        + '<span class="wic-end is-bank" style="top:' + (ys[n - 1] - 25) + 'px"><span>Eastgate Savings Bank</span><b>' + S.bank + '</b></span>'
        + '<span class="wic-end is-sup" style="top:' + (base + 8) + 'px"><span>Brightmoor Analytics</span><b>' + S.sup + '</b></span>';
      var bank = $('.wic-bank', chart), L = bank.getTotalLength(), tab = [];
      for (var s = 0; s <= 320; s++) tab.push(bank.getPointAtLength((L * s) / 320));
      function yAt(x) {
        var lo = 0, hi = tab.length - 1;
        while (hi - lo > 1) { var m = (lo + hi) >> 1; if (tab[m].x <= x) lo = m; else hi = m; }
        var a = tab[lo], b = tab[hi], t = b.x > a.x ? (x - a.x) / (b.x - a.x) : 0;
        return lerp(a.y, b.y, Math.max(0, Math.min(1, t)));
      }
      function dayAt(x) {
        for (var j = 0; j < n - 1; j++) if (x <= xs[j + 1]) return Math.round(lerp(S.nodes[j].day, S.nodes[j + 1].day, Math.max(0, (x - xs[j]) / (xs[j + 1] - xs[j]))));
        return S.nodes[n - 1].day;
      }
      var reveal = $('.wic-reveal', chart), hl = $('.wic-head-l', chart), hh = $('.wic-head-h', chart), hd = $('.wic-head-d', chart), hs = $('.wic-head-s', chart);
      return {
        xs: xs, W: W,
        area: $('.wic-area', chart), sup: $('.wic-sup', chart), head: $('.wic-head', chart), labels: $$('.wic-end', chart),
        base: $('.wic-base', chart), skel: $$('.wic-stem, .wic-dot', chart),
        set: function (x) {
          reveal.setAttribute('width', x);
          var y = yAt(x);
          hl.setAttribute('x1', x); hl.setAttribute('x2', x);
          hh.setAttribute('cx', x); hh.setAttribute('cy', y);
          hd.setAttribute('cx', x); hd.setAttribute('cy', y);
          hs.setAttribute('cx', x);
          dayEl.textContent = dayAt(x);
        },
        reach: function (j) {
          $$('[data-i="' + j + '"]', chart).forEach(function (el) { el.classList.add('is-on'); });
        }
      };
    }

    /* every word of the response is in its place from the start, unlit: the page never jumps, the text only arrives */
    function paint(S) {
      var vert = chat.clientWidth < 760;
      card.classList.toggle('is-v', vert);
      card.style.setProperty('--n', S.nodes.length);
      card.style.setProperty('--tone', S.tone);
      titleEl.textContent = S.title;
      dayEl.textContent = '0';
      qEl.textContent = S.q;
      lead.textContent = S.lead;
      nodesEl.innerHTML = S.nodes.map(function (m) {
        return '<li class="wn"><span class="wn-when"><b>Day ' + m.day + '</b><span>' + m.when + '</span></span><div class="wn-body"><p class="wn-t">' + m.t + '</p><p class="wn-s">' + m.s + '</p>'
          + (m.refs.length ? '<p class="wn-refs">' + m.refs.map(function (r) { return '<b>§' + r + '</b>'; }).join('') + '</p>' : '') + '</div></li>';
      }).join('');
      weigh.innerHTML = '<div class="wm is-bank"><span>Eastgate Savings Bank</span><b>' + S.bank + '</b></div><div class="wm is-sup"><span>Brightmoor Analytics</span><b>' + S.sup + '</b></div>';
      after.innerHTML = S.answer.map(function (a) { return '<p class="wi-p">' + a + '</p>'; }).join('') + '<div class="wi-next">' + S.next.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
      setStep(4);
      var G = vert ? null : buildChart(S);
      $$('.wic-read', card).forEach(function (r) { r.remove(); });
      var host = vert ? track : chart, read = document.createElement('div');
      read.className = 'wic-read';
      read.innerHTML = '<span>Reading</span>' + S.read.map(function (r) { return '<b>' + r + '</b>'; }).join('');
      host.appendChild(read);
      if (vert) {
        var tops = $$('.wn', nodesEl).map(function (li) { return li.offsetTop + 7; });
        rail.style.top = tops[0] + 'px';
        rail.style.height = (tops[tops.length - 1] - tops[0]) + 'px';
      }
      return { G: G, read: read };
    }
    function select(i) { pickEls.forEach(function (b, k) { var on = k === i; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); b.style.setProperty('--p', 0); }); }

    function showFinal(i) {
      cur = i;
      select(i);
      var S = WI[i], p = paint(S);
      p.read.style.display = 'none';
      if (p.G) { p.G.set(p.G.W); p.G.head.style.opacity = 0; S.nodes.forEach(function (_, j) { p.G.reach(j); }); p.G.area.style.opacity = 1; p.G.labels.forEach(function (l) { l.style.opacity = 1; l.style.visibility = 'visible'; }); }
      $$('.wn', nodesEl).forEach(function (li) { li.classList.add('is-on'); });
      railFill.style.transform = 'scaleY(1)';
      weigh.style.opacity = 1;
      dayEl.textContent = S.nodes[S.nodes.length - 1].day;
    }

    function run(i) {
      if (tl) tl.kill();
      gsap.killTweensOf(flow);
      cur = i;
      select(i);
      var S = WI[i], n = S.nodes.length;
      gsap.set(flow, { y: 0, autoAlpha: 1 });
      gsap.set(card, { height: 'auto', autoAlpha: 1, scale: 1 });
      card.style.overflow = '';
      var p = paint(S), G = p.G, read = p.read;
      typed.textContent = '';
      typed.style.transform = '';
      // the two places the view settles: with the widget open, then with the answer under it
      var V = view.clientHeight, F2 = flow.offsetHeight, y2 = Math.min(0, V - F2), y1 = Math.min(0, V - (F2 - after.offsetHeight));
      var cardH = card.offsetHeight;
      var whens = $$('.wn-when', nodesEl), bodies = $$('.wn-body', nodesEl), lis = $$('.wn', nodesEl), chips = $$('b', read), ansP = $$('.wi-p', after), next = $$('.wi-next span', after);
      var leadW = splitWords(lead), ansW = [];
      ansP.forEach(function (a) { ansW = ansW.concat(splitWords(a)); });
      gsap.set([user, bot], { autoAlpha: 0 });
      gsap.set(card, { height: 0, autoAlpha: 0, scale: 0.985 });
      card.style.overflow = 'hidden';
      gsap.set(leadW.concat(ansW), { opacity: 0 });
      gsap.set(next, { opacity: 0 });
      gsap.set(whens.concat(bodies), { autoAlpha: 0 });
      gsap.set(railFill, { scaleY: 0 });
      gsap.set(weigh, { autoAlpha: 0 });
      gsap.set(read, { autoAlpha: 1 });
      gsap.set(chips, { opacity: 0 });
      setStep(-1);
      if (G) { G.set(G.xs[0]); gsap.set(G.head, { opacity: 0 }); gsap.set(G.area, { opacity: 0.35 }); gsap.set(G.labels, { autoAlpha: 0 }); gsap.set(G.skel, { opacity: 0 }); gsap.set(G.base, { opacity: 0 }); }

      tl = gsap.timeline({ paused: !visible, onUpdate: function () { pickEls[i].style.setProperty('--p', tl.progress().toFixed(3)); }, onComplete: function () {
        if (touched) return;
        gsap.to(flow, { autoAlpha: 0, duration: 0.4, ease: 'power2.in', onComplete: function () { run((cur + 1) % WI.length); } });
      } });
      /* 1. the question */
      var Q = { n: 0 };
      tl.to(Q, { n: S.q.length, duration: Math.min(2.3, S.q.length * 0.017), ease: 'none', onUpdate: function () { typed.textContent = S.q.slice(0, Math.round(Q.n)); fit(); } }, 0.35);
      tl.call(function () { send.classList.add('is-go'); }, null, '+=0.3');
      tl.call(function () { typed.textContent = ''; typed.style.transform = ''; send.classList.remove('is-go'); }, null, '+=0.16');
      tl.fromTo(user, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      /* 2. the text starts */
      tl.to(bot, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, '+=0.2');
      tl.to(leadW, { opacity: 1, duration: 0.2, ease: 'none', stagger: 0.036 }, '+=0.1');
      /* 3. in the middle of it, the widget opens */
      tl.addLabel('open', '+=0.2');
      tl.to(card, { height: cardH, autoAlpha: 1, scale: 1, duration: 0.8, ease: 'expo.out' }, 'open');
      tl.to(flow, { y: y1, duration: 0.8, ease: 'power3.inOut' }, 'open');
      tl.call(function () { card.style.overflow = ''; }, null, 'open+=0.8');
      tl.call(function () { setStep(0); }, null, 'open+=0.3');
      tl.to(chips, { opacity: 1, duration: 0.25, ease: 'power2.out', stagger: Math.min(0.14, 0.9 / chips.length) }, 'open+=0.45');
      tl.to(read, { autoAlpha: 0, duration: 0.25 }, '+=0.3');
      /* 4. the calendar */
      tl.call(function () { setStep(1); });
      tl.addLabel('build');
      if (G) {
        tl.set(G.base, { opacity: 1 }, 'build');
        tl.fromTo(G.base, { attr: { x2: G.xs[0] } }, { attr: { x2: G.W }, duration: 0.7, ease: 'power2.inOut' }, 'build');
        tl.to(G.skel, { opacity: 1, duration: 0.3, ease: 'power2.out', stagger: 0.06 }, 'build+=0.1');
      }
      tl.fromTo(whens, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out', stagger: 0.13 }, 'build+=0.05');
      if (G) tl.to(G.head, { opacity: 1, duration: 0.25 }, '-=0.1');
      /* 5. it plays: the day runs, each event arrives as it is reached */
      tl.call(function () { setStep(2); }, null, '+=0.1');
      var P = { x: G ? G.xs[0] : 0 };
      S.nodes.forEach(function (m, j) {
        if (j > 0) {
          if (G) tl.to(P, { x: G.xs[j], duration: j === n - 1 ? 1.5 : 1.2, ease: 'power2.inOut', onUpdate: function () { G.set(P.x); } });
          else tl.to(P, { x: j / (n - 1), duration: 1.1, ease: 'power2.inOut', onUpdate: function () { railFill.style.transform = 'scaleY(' + P.x + ')'; var f = P.x * (n - 1), a = Math.min(n - 2, Math.floor(f)); dayEl.textContent = Math.round(lerp(S.nodes[a].day, S.nodes[a + 1].day, f - a)); } });
        }
        tl.call(function () { if (G) G.reach(j); lis[j].classList.add('is-on'); });
        tl.fromTo(bodies[j], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' });
        tl.to({}, { duration: 0.5 });
      });
      if (G) tl.to(P, { x: G.W, duration: 0.7, ease: 'power1.inOut', onUpdate: function () { G.set(P.x); } });
      /* 6. who is exposed: the gap between the two lines is the answer */
      tl.call(function () { setStep(3); });
      if (G) {
        tl.to(G.area, { opacity: 1, duration: 0.8, ease: 'power2.out' });
        tl.to(G.head, { opacity: 0, duration: 0.3 }, '<');
        tl.fromTo(G.labels, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.14 }, '<0.1');
      }
      tl.fromTo(weigh, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '<');
      tl.call(function () { setStep(4); }, null, '+=0.15');
      /* 7. the same response goes on, and closes in a few words */
      tl.to(flow, { y: y2, duration: 0.8, ease: 'power3.inOut' }, '+=0.15');
      tl.to(ansW, { opacity: 1, duration: 0.2, ease: 'none', stagger: 0.034 }, '<0.2');
      tl.fromTo(next, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.09 }, '+=0.1');
      tl.to({}, { duration: 9 });
    }

    picks.addEventListener('click', function (e) {
      var b = e.target.closest('.pick');
      if (!b) return;
      touched = true;
      if (anim) { began = true; visible = true; run(+b.getAttribute('data-i')); } else showFinal(+b.getAttribute('data-i'));
    });
    lastW = chat.clientWidth;
    if (!anim) { chat.classList.add('is-static'); showFinal(0); return; }
    select(0);
    window.addEventListener('resize', function () {
      if (chat.clientWidth === lastW) return;
      lastW = chat.clientWidth;
      if (began) run(cur);
    });
    whileVisible(chat, function () { visible = true; if (tl) tl.play(); }, function () { visible = false; if (tl) tl.pause(); });
    once(chat, function () { began = true; run(0); }, '-22% 0px -22% 0px');
  }

  function setupGhost() {
    var w = $('#ghostWrap');
    if (!w) return;
    once(w, function () {
      var s = document.createElement('script');
      s.src = '/v3/fx-bot.js';
      s.onload = function () {
        var Fx = window.SentinelFx;
        if (!Fx || typeof Fx.bot !== 'function') return;
        try { Fx.bot(w, { type: 'ghost', shading: 'plastic', size: mq('(max-width: 640px)') ? 32 : 44, state: 'default', every: 5 }); } catch (e) {}
      };
      document.head.appendChild(s);
    });
  }

  /* ======================================================================================== phones */
  function setupPhoneStages() {
    if (!Theatre) return;
    $$('[data-m-scene]').forEach(function (host) {
      once(host, function () {
        var name = host.getAttribute('data-m-scene');
        var stage = new Theatre.Stage(host, { scenes: [name], set: 'm' });
        stage.ready.then(function () {
          var L = stage.layers[name];
          // a phone frame is short: it opens on the part that matters, not on the page's header
          var FOCUS = { findings: 'li.issue-card', finding: '.is-selected', fix: '.dd-redline-how', report_cta: 'h1, h2, .rpt-cta-h' };
          var aim = FOCUS[name] && L.querySelector(FOCUS[name]);
          if (aim) {
            var sc = aim.closest('#modeStage') || aim.closest('#dxScroll') || aim.closest('.dx-scroll');
            if (sc) { var top = aim.getBoundingClientRect().top - sc.getBoundingClientRect().top; sc.scrollTop += top / stage.scale - 16; }
          }
          var rows = stage.qa('li.issue-card', name);
          if (anim && rows.length) {
            gsap.set(rows, { opacity: 0, y: 10 });
            ScrollTrigger.create({ trigger: host, start: 'top 80%', once: true, onEnter: function () { gsap.to(rows, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06 }); } });
            ScrollTrigger.refresh();
          }
        });
      }, '100% 0px');
    });
  }

  /* ======================================================================================== the wordmark, in halftone */
  function setupWordmark() {
    var box = $('#wordmark'), c = $('#wordmarkCanvas');
    if (!box || !c) return;
    var drawn = false;
    function draw(p) {
      var W = box.clientWidth, H = box.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (!W || !H) return;
      if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
      var x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, W, H);
      var off = draw.off;
      var step = draw.step;
      if (!off) {
        step = draw.step = W < 700 ? 3.2 : 5;
        var cols = Math.ceil(W / step), rows = Math.ceil(H / step);
        off = draw.off = document.createElement('canvas');
        off.width = cols; off.height = rows;
        var o = off.getContext('2d', { willReadFrequently: true });
        var fs = rows * 0.98;
        o.font = '400 ' + fs + 'px "Source Serif 4", Georgia, serif';
        try { o.fontVariationSettings = '"opsz" 60'; } catch (e) {}
        o.textBaseline = 'alphabetic';
        var m = o.measureText('Sentinel');
        var scale = Math.min(1, (cols * 0.96) / m.width);
        o.setTransform(scale, 0, 0, scale, (cols - m.width * scale) / 2, rows * 0.79);
        o.fillStyle = '#fff';
        o.fillText('Sentinel', 0, 0);
        draw.px = o.getImageData(0, 0, cols, rows).data;
        draw.cols = cols; draw.rows = rows;
      }
      var px = draw.px, cols2 = draw.cols, rows2 = draw.rows;
      for (var j = 0; j < rows2; j++) {
        for (var i = 0; i < cols2; i++) {
          var a = px[(j * cols2 + i) * 4 + 3] / 255;
          if (a < 0.08) continue;
          var u = i / cols2, v = j / rows2;
          var at = Math.max(0, Math.min(1, (p * 1.5 - u * 0.5 - 0)));
          var q = p >= 1 ? 1 : Math.max(0, Math.min(1, (p * 1.5 - u) * 4));
          if (q <= 0) continue;
          var light = 0.42 + 0.58 * (1 - (u * 0.5 + v * 0.5));
          var r = (step * 0.5) * Math.sqrt(a) * q * 0.92;
          x.fillStyle = 'rgba(' + Math.round(170 + 80 * light) + ',' + Math.round(180 + 70 * light) + ',255,' + (0.28 + 0.62 * light).toFixed(3) + ')';
          x.beginPath(); x.arc(i * step + step / 2, j * step + step / 2 - (1 - q) * 18, r, 0, 6.2832); x.fill();
        }
      }
    }
    function start() {
      if (drawn) return; drawn = true;
      if (!anim) { draw(1); return; }
      var k = { p: 0 };
      gsap.to(k, { p: 1, duration: 1.8, ease: 'power2.inOut', onUpdate: function () { draw(k.p); } });
    }
    once(box, start, '0px');
    window.addEventListener('resize', function () { if (drawn) { draw.off = null; draw(1); } });
  }

  /* ======================================================================================== booking */
  function setupCal() {
    var box = $('#calInline');
    if (!box) return;
    var skel = $('#calSkel'), fallback = $('#calFallback');
    var started = false;
    function fail() { if (skel) skel.hidden = true; if (fallback) fallback.hidden = false; }
    function start() {
      if (started) return;
      started = true;
      (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; var s = d.createElement('script'); s.src = A; s.onerror = fail; d.head.appendChild(s); cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      window.Cal('init', 'demo', { origin: 'https://app.cal.com' });
      window.Cal.config = window.Cal.config || {};
      window.Cal.config.forwardQueryParams = true;
      window.Cal.ns.demo('inline', { elementOrSelector: '#calInline', config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', theme: 'dark' }, calLink: 'sentinel-ai/demo' });
      window.Cal.ns.demo('ui', { theme: 'dark', hideEventTypeDetails: false, layout: 'month_view', styles: { branding: { brandColor: '#4d6bff' } } });
      window.Cal.ns.demo('on', { action: 'linkReady', callback: function () { box.classList.add('is-ready'); } });
      window.Cal.ns.demo('on', { action: 'linkFailed', callback: fail });
      new MutationObserver(function () { if (box.querySelector('iframe')) box.classList.add('is-ready'); }).observe(box, { childList: true, subtree: true });
      setTimeout(function () { if (!box.querySelector('iframe')) fail(); }, 15000);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) start(); }); }, { rootMargin: '800px 0px' }).observe(box);
    else start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();

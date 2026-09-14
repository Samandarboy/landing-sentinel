// Sentinel — proposals page motion layer.
// Smooth scroll, section index, reveals, and one interaction per proposal:
// memo fan, quote reveal + counters, the clause tester, bento spotlight,
// audience demos, FAQ accordion, number counters, the film sequencer,
// the scroll-built proof stack and the language switch.
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var mobile = function () { return window.matchMedia('(max-width: 1024px)').matches; };
  var Demos = null, lenis = null;

  function main() {
    Demos = window.SentinelDemos || null;
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    setupSmoothScroll();
    setupReveals();
    setupIndex();
    setupIntro();
    setupMemo();
    setupQuote();
    setupTester();
    setupBento();
    setupAudience();
    setupFaq();
    setupCounters();
    setupFilm();
    setupStack();
    setupLang();
    setupAnchors();
  }

  /* ---------- shared ---------- */
  function setupSmoothScroll() {
    if (reduced || typeof window.Lenis === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGsap) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  function scrollToEl(el, offset) {
    if (lenis) lenis.scrollTo(el, { offset: offset, duration: 1.2 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
  function setupAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (!id || id.length < 2) return;
        var el = $(id); if (!el) return;
        e.preventDefault(); scrollToEl(el, id === '#top' ? 0 : -56);
      });
    });
  }
  function setupReveals() {
    var els = $$('[data-reveal]');
    if (reduced || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  function splitWords(el) {
    var nodes = [].slice.call(el.childNodes); el.textContent = '';
    nodes.forEach(function (node) {
      if (node.nodeType === 1) { el.appendChild(node); return; }
      String(node.textContent).split(/(\s+)/).forEach(function (t) {
        if (!t) return;
        if (!t.trim()) { el.appendChild(document.createTextNode(t)); return; }
        var s = document.createElement('span'); s.className = 'w'; s.textContent = t; el.appendChild(s);
      });
    });
    return $$('.w', el);
  }
  function countUp(el, to, dur) {
    var start = null, from = 0;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    }
    if (reduced) { el.textContent = to; return; }
    requestAnimationFrame(step);
  }

  /* ---------- section index in the top bar ---------- */
  function setupIndex() {
    var links = $$('#pnavList a'); if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var a = map[e.target.id];
        if (a) {
          a.classList.add('is-active');
          var list = a.parentElement; // scroll the strip itself, never the document
          list.scrollTo({ left: a.offsetLeft - list.clientWidth / 2 + a.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('.proposal').forEach(function (s) { io.observe(s); });
  }

  /* ---------- intro ---------- */
  function setupIntro() {
    var title = $('.pintro-title'); if (!title || !hasGsap || reduced) return;
    var words = splitWords(title);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from(words, { y: 28, opacity: 0, filter: 'blur(10px)', duration: 0.9, stagger: 0.05 }, 0.1)
      .from('.pintro-lede', { y: 16, opacity: 0, duration: 0.8 }, '-=0.5');
  }

  /* ---------- 02 memo: pages fan out as it enters, further on hover ---------- */
  function setupMemo() {
    var stack = $('#memoStack'); if (!stack) return;
    var b1 = $('.back1', stack), b2 = $('.back2', stack);
    if (!hasGsap || reduced) { b1.style.transform = 'translate(-14px,12px) rotate(-4deg) scale(.98)'; b2.style.transform = 'translate(14px,24px) rotate(4deg) scale(.96)'; return; }
    gsap.set([b1, b2], { x: 0, y: 0, rotate: 0, scale: 1 });
    gsap.to(b1, { x: -14, y: 12, rotate: -4, scale: 0.98, ease: 'none', scrollTrigger: { trigger: stack, start: 'top 90%', end: 'top 45%', scrub: 0.6 } });
    gsap.to(b2, { x: 14, y: 24, rotate: 4, scale: 0.96, ease: 'none', scrollTrigger: { trigger: stack, start: 'top 90%', end: 'top 45%', scrub: 0.6 } });
    stack.addEventListener('mouseenter', function () { gsap.to(b1, { x: -40, y: 6, rotate: -8, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }); gsap.to(b2, { x: 40, y: 16, rotate: 8, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }); });
    stack.addEventListener('mouseleave', function () { gsap.to(b1, { x: -14, y: 12, rotate: -4, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }); gsap.to(b2, { x: 14, y: 24, rotate: 4, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }); });
  }

  /* ---------- 03 quote: words brighten as you scroll ---------- */
  function setupQuote() {
    var q = $('#quoteText'); if (!q) return;
    if (!hasGsap || reduced) { q.style.color = '#f7f8f8'; return; }
    var words = splitWords(q);
    gsap.fromTo(words, { color: 'rgba(138,143,152,0.35)' }, { color: '#f7f8f8', stagger: 0.04, ease: 'none', scrollTrigger: { trigger: q, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
  }

  /* ---------- 04 try a clause ---------- */
  var EX = [
    { clause: '<span class="cl-sec">§ 9.2 · Limitation of liability</span>Each party’s aggregate liability under this Agreement shall not exceed the total <mark>Fees paid by Customer to Provider in the twelve (12) months</mark> preceding the event giving rise to the claim.<span class="cl-sec">§ 3.1 · Fees</span>Fees for the <mark>Pilot Term (six months) are $0</mark>; Standard Fees apply from the first day of the Initial Term.',
      sev: 'crit', sevLabel: 'Critical', proven: 'proven in scenario 2', title: 'For the six-month pilot, the liability cap is zero.', refs: ['§ 9.2', '§ 3.1', 'scenario 2'], redline: 'Floor the cap at the annual contract value from the Effective Date.' },
    { clause: '<span class="cl-sec">§ 11.1 · Termination for convenience</span>Either party may terminate this Agreement for convenience upon <mark>thirty (30) days’ written notice</mark> to the other party.<span class="cl-sec">§ 4.3 · Payment</span>The Annual Fee is payable in advance and is <mark>non-refundable in all circumstances</mark>.',
      sev: 'crit', sevLabel: 'Critical', proven: 'proven in scenario 1', title: 'They can leave on day 31 and keep eleven months of your fee.', refs: ['§ 11.1', '§ 4.3', 'scenario 1'], redline: 'Pro-rate the refund when the other party terminates for convenience.' },
    { clause: '<span class="cl-sec">§ 5.2 · Invoicing</span>Customer shall pay each invoice within thirty (30) days of <mark>acceptance of the invoice by Customer</mark>.<span class="cl-sec">§ 1.1 · Definitions</span>“Invoice” means a statement of Fees issued by Provider. <mark>“Acceptance” is not defined.</mark>',
      sev: 'high', sevLabel: 'High', proven: 'proven in scenario 3', title: '“Acceptance” has no definition and no deadline. Payment can wait forever.', refs: ['§ 5.2', '§ 1.1', 'scenario 3'], redline: 'Deem invoices accepted ten business days after receipt.' },
    { clause: '<span class="cl-sec">§ 2.4 · Exclusivity</span>Supplier grants Distributor the exclusive right to market the Products in <mark>the Territory (as defined in Schedule 2)</mark> during the Term.<span class="cl-sec">Schedule 2 · Territory</span><mark>[Intentionally left blank]</mark>',
      sev: 'crit', sevLabel: 'Critical', proven: 'proven in scenario 1', title: 'Schedule 2 is empty. The exclusivity covers nowhere.', refs: ['§ 2.4', 'Schedule 2', 'scenario 1'], redline: 'Fill Schedule 2 before signing and add a fallback definition of Territory.' },
    { clause: '<span class="cl-sec">§ 14.2 · Assignment</span>Neither party may assign this Agreement without the prior written consent of the other, <mark>such consent not to be unreasonably withheld</mark>.<span class="cl-sec">§ 1.8 · Definitions</span>“Assignment” <mark>does not include a change of control</mark> of either party.',
      sev: 'high', sevLabel: 'High', proven: 'proven in scenario 4', title: 'A change of control isn’t an assignment here. Your competitor can buy them and inherit the contract.', refs: ['§ 14.2', '§ 1.8', 'scenario 4'], redline: 'Add change of control to the definition of assignment.' }
  ];

  function setupTester() {
    var root = $('#tester'); if (!root) return;
    var chips = $$('.tchip', root), view = $('#clauseView'), own = $('#clauseOwn'), box = $('#clauseBox');
    var btn = $('#attackBtn'), status = $('#testerStatus'), empty = $('#resultEmpty'), card = $('#resultCard');
    var sev = $('#resSev'), proven = $('#resProven'), title = $('#resTitle'), refs = $('#resRefs'), redline = $('#resRedline'), ownMsg = $('#resOwn');
    var current = 0, busy = false;

    function select(i) {
      current = i;
      chips.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-ex') === String(i)); });
      box.classList.remove('is-hit', 'is-scanning');
      if (i === 'own') { view.hidden = true; own.hidden = false; own.focus(); status.textContent = 'Paste a clause, then attack.'; }
      else { own.hidden = true; view.hidden = false; view.innerHTML = EX[i].clause; status.textContent = 'Pick a clause, or paste your own.'; }
      card.hidden = true; empty.hidden = false;
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { if (busy) return; var v = c.getAttribute('data-ex'); select(v === 'own' ? 'own' : parseInt(v, 10)); }); });
    select(0);

    function paint(d) {
      sev.className = 'chip ' + d.sev; sev.textContent = d.sevLabel; proven.textContent = d.proven;
      title.textContent = d.title; refs.innerHTML = '';
      d.refs.forEach(function (r) { var s = document.createElement('span'); s.className = 'ref'; s.textContent = r; refs.appendChild(s); });
      redline.textContent = d.redline;
    }
    function reveal(children) {
      card.hidden = false; empty.hidden = true;
      if (!hasGsap || reduced) return;
      gsap.from(children, { y: 14, opacity: 0, filter: 'blur(6px)', duration: 0.6, ease: 'power3.out', stagger: 0.09 });
    }
    btn.addEventListener('click', function () {
      if (busy) return;
      if (current === 'own' && !own.value.trim()) { status.textContent = 'Paste a clause first.'; own.focus(); return; }
      busy = true; btn.disabled = true;
      box.classList.remove('is-hit', 'is-scanning');
      box.style.setProperty('--dist', (box.offsetHeight + 80) + 'px');
      void box.offsetWidth; box.classList.add('is-scanning');
      status.textContent = current === 'own' ? 'Reading…' : 'Reading ' + EX[current].refs[0] + ' against ' + EX[current].refs[1] + '…';
      card.hidden = true; empty.hidden = false;
      var t1 = current === 'own' ? 1500 : 900, t2 = 1700;
      setTimeout(function () { if (current !== 'own') box.classList.add('is-hit'); }, t1);
      setTimeout(function () {
        if (current === 'own') {
          sev.className = 'chip'; sev.textContent = 'Live analysis'; proven.textContent = 'not on this website'; title.textContent = 'This site cannot read your clause, and that is the point.'; refs.innerHTML = ''; redline.textContent = 'Book a demo and we run it on your machines.'; ownMsg.hidden = false;
          status.textContent = 'Nothing was sent anywhere.';
        } else {
          ownMsg.hidden = true; paint(EX[current]); status.textContent = 'Finding proven · cited to the clause.';
        }
        reveal($$('.result > *', card));
        busy = false; btn.disabled = false;
      }, t2);
    });
  }

  /* ---------- 05 bento: cursor spotlight ---------- */
  function setupBento() {
    var tiles = $$('.tile'); if (!tiles.length || reduced) return;
    tiles.forEach(function (t) {
      t.addEventListener('mousemove', function (e) { var r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    });
  }

  /* ---------- 06 audience: each panel plays its pass while on screen ---------- */
  function setupAudience() {
    var shots = $$('.aud-shot'); if (!shots.length || !Demos) return;
    shots.forEach(function (shot) {
      var d = $('.sd-demo', shot), timer = null;
      function play() { Demos.play(d); clearInterval(timer); timer = setInterval(function () { Demos.play(d); }, 14000); }
      function stop() { clearInterval(timer); timer = null; Demos.stop(d); }
      new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) { if (!timer) setTimeout(play, 300); } else stop(); }); }, { threshold: 0.3 }).observe(shot);
    });
  }

  /* ---------- 08 faq ---------- */
  function setupFaq() {
    var items = $$('#faq details'); if (!items.length) return;
    items.forEach(function (d, i) {
      d.open = true; if (i === 0) d.classList.add('is-open');
      $('summary', d).addEventListener('click', function (e) {
        e.preventDefault();
        var open = d.classList.contains('is-open');
        items.forEach(function (x) { x.classList.remove('is-open'); });
        if (!open) d.classList.add('is-open');
      });
    });
  }

  /* ---------- 03 + 09 counters ---------- */
  function setupCounters() {
    var els = $$('.count'); if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); countUp(e.target, parseInt(e.target.getAttribute('data-count'), 10), 1500); });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 10 film: the three demos cut together with captions ---------- */
  var FILM = [
    { dur: 10800, caps: [[0, '01 — Detect', 'A 64-page acquisition agreement goes in.'], [2600, '01 — Detect', '14 findings. 4 critical. Ranked by exposure.'], [7000, '01 — Detect', 'Every finding cited to its clause.']] },
    { dur: 12500, caps: [[0, '02 — Simulate', 'What if regulators run long?'], [4200, '02 — Simulate', 'Day 274. The Outside Date passes.'], [9600, '02 — Simulate', 'Breach proven: a $1.5B fee falls due.']] },
    { dur: 11200, caps: [[0, '03 — Report', 'The memorandum assembles itself.'], [5000, '03 — Report', 'Clause, quote, redline. In that order.'], [8700, '03 — Report', 'Signed and reproducible.']] }
  ];
  function setupFilm() {
    var film = $('#film'); if (!film) return;
    var panels = $$('.film-panel', film), caption = $('#filmCaption'), bar = $('#filmBar'), poster = $('#filmPoster'), end = $('#filmEnd');
    var screen = $('.film-screen', film);
    var shade = document.createElement('div'); shade.className = 'film-shade'; screen.insertBefore(shade, caption);
    var timers = [], raf = null, playing = false;
    var total = FILM.reduce(function (s, f) { return s + f.dur; }, 0);

    function setCaption(num, text) {
      var paint = function () { caption.innerHTML = '<span class="cap-num">' + num + '</span><span class="cap-text">' + text + '</span>'; };
      if (!hasGsap || reduced) { paint(); return; }
      gsap.to(caption, { y: -8, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: function () { paint(); gsap.fromTo(caption, { y: 14, opacity: 0, filter: 'blur(6px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'power3.out' }); } });
    }
    function clear() { timers.forEach(clearTimeout); timers = []; if (raf) cancelAnimationFrame(raf); raf = null; }
    function stopAll() { clear(); playing = false; panels.forEach(function (p) { p.classList.remove('is-active'); if (Demos) Demos.stop($('.sd-demo', p)); }); caption.innerHTML = ''; bar.style.width = '0%'; }
    function play() {
      stopAll(); playing = true; poster.classList.add('is-hidden'); end.hidden = true;
      var offset = 0, t0 = performance.now();
      FILM.forEach(function (seg, i) {
        var at = offset;
        timers.push(setTimeout(function () {
          panels.forEach(function (p, j) { p.classList.toggle('is-active', j === i); });
          if (Demos) { panels.forEach(function (p, j) { if (j !== i) Demos.stop($('.sd-demo', p)); }); Demos.play($('.sd-demo', panels[i])); }
        }, at));
        seg.caps.forEach(function (c) { timers.push(setTimeout(function () { setCaption(c[1], c[2]); }, at + c[0])); });
        offset += seg.dur;
      });
      timers.push(setTimeout(function () { playing = false; end.hidden = false; if (Demos) panels.forEach(function (p) { Demos.stop($('.sd-demo', p)); }); }, total + 400));
      (function tick(now) { var p = Math.min(1, (now - t0) / total); bar.style.width = (p * 100).toFixed(2) + '%'; if (p < 1 && playing) raf = requestAnimationFrame(tick); })(t0);
    }
    $('#playBtn').addEventListener('click', play);
    $('#replayBtn').addEventListener('click', play);
    // leaving the section stops the show and brings the poster back
    new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (!e.isIntersecting && playing) { stopAll(); poster.classList.remove('is-hidden'); end.hidden = true; } }); }, { threshold: 0.1 }).observe(film);
  }

  /* ---------- 11 proof stack ---------- */
  function setupStack() {
    var sec = $('#stackSec'), layers = $$('.layer'), line = $('#stackLine'); if (!sec || !layers.length) return;
    var n = layers.length;
    function apply(p) {
      var k = p <= 0 ? 0 : Math.min(n, Math.ceil(p * n));
      layers.forEach(function (l, i) { l.classList.toggle('is-on', i < k); });
      if (line) line.style.transform = 'scaleY(' + Math.min(1, Math.max(0, (k - 1) / (n - 1))) + ')';
    }
    if (mobile() || !hasGsap) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (!e.isIntersecting) return; layers.forEach(function (l, i) { setTimeout(function () { l.classList.add('is-on'); if (line) line.style.transform = 'scaleY(' + (i / (n - 1)) + ')'; }, i * 260); }); });
      }, { threshold: 0.3 }).observe($('#stack'));
      return;
    }
    ScrollTrigger.create({ trigger: sec, start: 'top top+=56', end: 'bottom bottom', onUpdate: function (st) { apply(st.progress); }, onEnter: function () { apply(0.05); }, onLeaveBack: function () { apply(0); } });
  }

  /* ---------- 11 language switch ---------- */
  function setupLang() {
    var tabsEl = $('#langTabs'), card = $('#langCard'); if (!tabsEl || !card) return;
    var tabs = $$('.tab', tabsEl), ind = $('.tab-ind', tabsEl), targets = $$('[data-en]', card);
    function move(btn) { if (!ind || !btn) return; ind.style.width = btn.offsetWidth + 'px'; ind.style.transform = 'translateX(' + btn.offsetLeft + 'px)'; }
    function swap(lang) {
      var paint = function () { targets.forEach(function (t) { t.textContent = t.getAttribute('data-' + lang); }); card.setAttribute('lang', lang); };
      if (!hasGsap || reduced) { paint(); return; }
      gsap.to(targets, { y: -6, opacity: 0, duration: 0.2, ease: 'power2.in', stagger: 0.03, onComplete: function () { paint(); gsap.fromTo(targets, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.06 }); } });
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { tabs.forEach(function (x) { x.classList.toggle('is-active', x === t); }); move(t); swap(t.getAttribute('data-lang')); }); });
    move(tabs[0]);
    window.addEventListener('resize', function () { move($('.tab.is-active', tabsEl)); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { move($('.tab.is-active', tabsEl)); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();

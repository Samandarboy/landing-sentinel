// Sentinel landing v2 — motion layer.
// Smooth scroll (Lenis), header/pill states, hero intro, scroll reveals,
// scroll-linked statement, sticky "how it works" stage driving the live
// product demos (feature-demos.js), proof tabs, canvases, form.
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var Demos = null;
  var lenis = null;

  function main() {
    Demos = window.SentinelDemos || null;
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    setupSmoothScroll();
    setupHeader();
    setupReveals();
    setupHero();
    setupStatement();
    setupHow();
    setupProof();
    setupSecurity();
    setupFilm();
    setupFaq();
    setupForm();
    setupAnchors();
  }

  /* ---------- film: the recorded product demonstration ---------- */
  function setupFilm() {
    var box = $('#film-box'), video = $('#filmVideo');
    if (!box || !video) return;
    var poster = $('#filmPoster'), end = $('#filmEnd'), bar = $('#filmBar'), resume = $('#filmResume'), replay = $('#filmReplay');
    var started = false;
    function state(s) {
      box.classList.toggle('is-playing', s === 'playing');
      box.classList.toggle('is-paused', s === 'paused');
      if (resume) resume.hidden = s !== 'paused';
    }
    function play() {
      if (end) end.hidden = true;
      poster.classList.add('is-hidden');
      started = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () { poster.classList.remove('is-hidden'); started = false; state('idle'); });
    }
    poster.addEventListener('click', play);
    if (replay) replay.addEventListener('click', function () { video.currentTime = 0; play(); });
    if (resume) resume.addEventListener('click', function (e) { e.stopPropagation(); play(); });
    // the picture itself is the pause/resume control once the film has started
    video.addEventListener('click', function () { if (!started) return; if (video.paused) play(); else video.pause(); });
    video.addEventListener('play', function () { state('playing'); });
    video.addEventListener('pause', function () { if (!video.ended) state('paused'); });
    video.addEventListener('timeupdate', function () {
      if (bar && video.duration) bar.style.width = (video.currentTime / video.duration * 100).toFixed(2) + '%';
    });
    video.addEventListener('ended', function () { state('ended'); if (end) end.hidden = false; });
    // scrolled away mid-film: pause on the current frame and offer resume on return
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (!e.isIntersecting && !video.paused) video.pause(); });
      }, { threshold: 0.2 }).observe(box);
    }
  }

  /* ---------- faq: one open at a time, height animated with grid rows ---------- */
  function setupFaq() {
    var items = $$('.faq details');
    if (!items.length) return;
    items.forEach(function (d, i) {
      d.open = true;
      if (i === 0) d.classList.add('is-open');
      var s = $('summary', d);
      if (!s) return;
      s.addEventListener('click', function (e) {
        e.preventDefault();
        var open = d.classList.contains('is-open');
        items.forEach(function (x) { x.classList.remove('is-open'); });
        if (!open) d.classList.add('is-open');
      });
    });
  }

  /* ---------- smooth scroll (Aaru runs Lenis; GSAP drives its ticker) ---------- */
  function setupSmoothScroll() {
    if (reduced || typeof window.Lenis === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return; // native scroll on touch
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToEl(el, offset) {
    if (lenis) lenis.scrollTo(el, { offset: offset || -72, duration: 1.2 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function setupAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id.length < 2) return;
        var el = $(id);
        if (!el) return;
        e.preventDefault();
        closeMenu();
        scrollToEl(el, id === '#top' ? 0 : -72);
      });
    });
  }

  /* ---------- header: blur on scroll, then hand over to the floating pill ---------- */
  var menuOpen = false;
  function closeMenu() {
    menuOpen = false;
    var m = $('#mobileMenu'), b = $('#burger');
    if (m) m.classList.remove('is-open');
    if (b) b.setAttribute('aria-expanded', 'false');
  }
  function setupHeader() {
    var header = $('#header'), pill = $('#pill'), hero = $('.hero');
    var burger = $('#burger'), menu = $('#mobileMenu');
    function update() {
      var y = window.scrollY || window.pageYOffset;
      var past = y > (hero ? hero.offsetHeight * 0.6 : 600);
      header.classList.toggle('is-scrolled', y > 8);
      header.classList.toggle('is-hidden', past && !menuOpen);
      pill.classList.toggle('is-visible', past && !menuOpen);
      pill.setAttribute('aria-hidden', past ? 'false' : 'true');
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    if (burger && menu) {
      burger.addEventListener('click', function () {
        menuOpen = !menuOpen;
        menu.classList.toggle('is-open', menuOpen);
        burger.setAttribute('aria-expanded', String(menuOpen));
        update();
      });
    }
  }

  /* ---------- reveals: an in-view class, CSS does the motion (Linear's approach) ---------- */
  function setupReveals() {
    var els = $$('[data-reveal]');
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // wrap each word in a span; element children (line breaks) are kept in place
  function splitWords(el) {
    var nodes = [].slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (node) {
      if (node.nodeType === 1) { el.appendChild(node); return; }
      String(node.textContent).split(/(\s+)/).forEach(function (t) {
        if (!t) return;
        if (!t.trim()) { el.appendChild(document.createTextNode(t)); return; }
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = t;
        el.appendChild(s);
      });
    });
    return $$('.w', el);
  }

  /* ---------- hero: word cascade, then the product frame rises; the demo loops while visible ---------- */
  function setupHero() {
    var title = $('.hero-title'), frame = $('.frame'), demo = $('.frame .sd-demo');
    if (hasGsap && !reduced && title) {
      var words = splitWords(title);
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(words, { y: 28, opacity: 0, filter: 'blur(10px)', duration: 0.9, stagger: 0.045 }, 0.1)
        .from('.hero-lede', { y: 16, opacity: 0, duration: 0.8 }, '-=0.5')
        .from('.hero-ctas > *', { y: 12, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.6')
        .from('.frame-wrap', { y: 56, opacity: 0, duration: 1.3, ease: 'expo.out' }, '-=0.55')
        .from('.hero-glow', { opacity: 0, duration: 1.8, ease: 'power2.out' }, '<');
      gsap.to('.frame', { y: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    }
    if (!frame || !demo || !Demos) return;
    var timer = null;
    function play() { Demos.play(demo); clearInterval(timer); timer = setInterval(function () { Demos.play(demo); }, 13000); }
    function stop() { clearInterval(timer); timer = null; Demos.stop(demo); }
    if (!('IntersectionObserver' in window)) { play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { if (!timer) setTimeout(play, 500); } else stop(); });
    }, { threshold: 0.2 }).observe(frame);
  }

  /* ---------- statement: words brighten as you scroll (scrubbed) ---------- */
  function setupStatement() {
    var rest = $('.statement .rest');
    if (!rest) return;
    if (!hasGsap || reduced) { rest.style.color = '#c8cdd5'; return; }
    var words = splitWords(rest);
    gsap.fromTo(words, { color: 'rgba(138,143,152,0.35)' }, {
      color: '#c8cdd5', stagger: 0.06, ease: 'none',
      scrollTrigger: { trigger: '.statement', start: 'top 78%', end: 'bottom 42%', scrub: 0.6 }
    });
  }

  /* ---------- how it works: scroll progress picks the step and plays its demo ---------- */
  function setupHow() {
    var how = $('.how'), stage = $('#stage');
    var steps = $$('.step'), panels = $$('.stage-panel');
    if (!how || !steps.length || steps.length !== panels.length) return;
    var active = -1, n = steps.length;

    function setActive(i) {
      if (i === active) return;
      active = i;
      steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
      panels.forEach(function (p, j) {
        p.classList.toggle('is-active', j === i);
        var d = $('.sd-demo', p);
        if (!Demos || !d) return;
        if (j === i) Demos.play(d); else Demos.stop(d);
      });
    }
    function onProgress(p) {
      var idx = Math.min(n - 1, Math.max(0, Math.floor(p * n)));
      setActive(idx);
      var local = Math.min(1, Math.max(0, p * n - idx));
      steps.forEach(function (s, j) {
        var bar = $('.step-bar i', s);
        if (bar) bar.style.transform = 'scaleY(' + (j < idx ? 1 : j === idx ? local : 0) + ')';
      });
    }
    var isMobile = function () { return window.matchMedia('(max-width: 1024px)').matches; };
    var startAt = function () { return isMobile() ? 'top 40%' : 'top top+=72'; };

    if (hasGsap) {
      ScrollTrigger.create({
        trigger: how, start: startAt, end: 'bottom bottom',
        onUpdate: function (st) { onProgress(st.progress); },
        onEnter: function () { onProgress(0); },
        onEnterBack: function () { onProgress(1); }
      });
    } else {
      var tick = function () {
        var r = how.getBoundingClientRect();
        var total = Math.max(1, r.height - window.innerHeight);
        var p = Math.min(1, Math.max(0, (-r.top + 72) / total));
        onProgress(p);
      };
      window.addEventListener('scroll', tick, { passive: true });
      tick();
    }
    // the demos run only while the stage is on screen: play the active one on entry, stop all on exit
    if ('IntersectionObserver' in window && stage) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            if (active < 0) setActive(0);
            else if (Demos) Demos.play($('.sd-demo', panels[active]));
          } else if (Demos) {
            panels.forEach(function (p) { Demos.stop($('.sd-demo', p)); });
          }
        });
      }, { threshold: 0.3 }).observe(stage);
    }
    // click a step to scroll to its part of the section
    steps.forEach(function (s, i) {
      s.addEventListener('click', function () {
        var top = how.offsetTop - 72 + (how.offsetHeight - window.innerHeight) * ((i + 0.12) / n);
        if (lenis) lenis.scrollTo(top, { duration: 1 }); else window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- proof: the same question asked twice — a chat bubble on the left, a proof ladder on the right ---------- */
  var PROOF = [
    { q: 'Is the liability cap acceptable?',
      bot: 'Yes. Liability is capped at the fees paid in the last twelve months, which is a standard, mutual cap. Nothing to flag.',
      verdict: 'Pilot fees are $0. For six months, the cap is zero.',
      clause: ['§ 9.2', '“…shall not exceed the fees paid in the twelve (12) months preceding the claim.”'],
      scenario: ['Scenario 2', 'The six-month pilot at $0 that § 3.1 allows.'],
      trace: ['3 steps', 'Fees paid in months 1–6: $0 → cap: $0 → their exposure to you: nothing.'],
      redline: 'Floor the cap at the annual contract value.' },
    { q: 'Can either side walk away?',
      bot: 'Yes. Either party may terminate on thirty days’ notice, so the exit rights are mutual and balanced.',
      verdict: 'Your annual fee is non-refundable. They can leave on day 31 and keep eleven months of it.',
      clause: ['§ 11.1', '“…either Party may terminate for convenience on thirty (30) days’ written notice.”'],
      scenario: ['Scenario 1', 'They give notice on day 1, after your annual fee under § 4.3 has cleared.'],
      trace: ['3 steps', 'Fee paid: 12 months → refund on termination: none (§ 4.3) → kept by them: 11 months.'],
      redline: 'Pro-rate the refund when they terminate.' },
    { q: 'When do we get paid?',
      bot: 'Thirty days after an accepted invoice. Net-30 is standard commercial practice.',
      verdict: '“Accepted” is never defined and has no deadline. Payment can wait forever without a breach.',
      clause: ['§ 5.2', '“…due thirty (30) days after the invoice is accepted by the Customer.”'],
      scenario: ['Scenario 3', 'The customer never marks the invoice as accepted.'],
      trace: ['3 steps', '“Accepted”: undefined (§ 1.1) → due date: never reached → breach: none, on any day.'],
      redline: 'Deem invoices accepted after ten business days.' },
    { q: 'Do we have exclusivity?',
      bot: 'Yes. Section 2.4 grants you exclusive rights in the Territory, so exclusivity is secured.',
      verdict: '“Territory” points to Schedule 2. Schedule 2 is empty. Your exclusivity covers nowhere.',
      clause: ['§ 2.4', '“…exclusive rights in the Territory (as defined in Schedule 2).”'],
      scenario: ['Scenario 1', 'A competitor is appointed in your home market.'],
      trace: ['3 steps', 'Territory = Schedule 2 → Schedule 2 = empty → exclusive area: none → breach: none.'],
      redline: 'Fill Schedule 2 before signing.' },
    { q: 'Can they hand this contract to someone else?',
      bot: 'No. Assignment requires prior written consent, which is a standard mutual anti-assignment clause.',
      verdict: 'A change of control isn’t an assignment here. Your competitor can buy them and inherit the contract.',
      clause: ['§ 14.2', '“Neither Party may assign this Agreement without the prior written consent of the other.”'],
      scenario: ['Scenario 4', 'The counterparty is acquired by your closest competitor.'],
      trace: ['3 steps', 'Change of control ≠ assignment (§ 1.8) → consent: not required → the contract: inherited.'],
      redline: 'Add change of control to assignment.' }
  ];
  var PROOF_INTERVAL = 10000;

  function indicator(tabsEl) {
    var ind = $('.tab-ind', tabsEl);
    return function (btn) {
      if (!ind || !btn) return;
      ind.style.width = btn.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
    };
  }

  function setupProof() {
    var tabsEl = $('#tabs'), duel = $('#duel');
    if (!tabsEl || !duel) return;
    var tabs = $$('.tab', tabsEl), move = indicator(tabsEl);
    var qWrap = $('#duelQ'), qEl = $('#duelQText'), bubble = $('#bubble'), bubbleText = $('#bubbleText');
    var receipt = $$('#receipt li'), verdict = $('#verdict'), rungs = $$('#ladder .rung'), fix = $('#fix'), fixText = $('#fixText');
    var current = -1, timer = null, auto = !reduced, run = 0, timers = [];
    // each tab carries a thin progress line that fills while the examples auto-advance
    tabs.forEach(function (t) { var p = document.createElement('i'); p.className = 'tab-prog'; t.appendChild(p); });
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }
    function rung(i, ref, text) {
      var el = rungs[i]; if (!el) return;
      var v = $('.rung-v', el); v.textContent = '';
      var r = document.createElement('em'); r.className = 'rung-ref'; r.textContent = ref;
      v.appendChild(r); v.appendChild(document.createTextNode(text));
    }
    function paint(d) {
      rung(0, d.clause[0], d.clause[1]); rung(1, d.scenario[0], d.scenario[1]); rung(2, d.trace[0], d.trace[1]);
      verdict.textContent = d.verdict; fixText.textContent = d.redline; bubbleText.textContent = d.bot;
    }
    function reset() {
      qEl.textContent = ''; qWrap.classList.add('is-typing');
      bubble.classList.remove('is-done', 'is-thinking');
      receipt.forEach(function (li) { li.classList.remove('on'); });
      verdict.classList.remove('on'); rungs.forEach(function (r) { r.classList.remove('on'); }); fix.classList.remove('on');
    }
    function showAll(d) {
      qEl.textContent = d.q; qWrap.classList.remove('is-typing'); bubble.classList.add('is-done');
      receipt.forEach(function (li) { li.classList.add('on'); }); verdict.classList.add('on');
      rungs.forEach(function (r) { r.classList.add('on'); }); fix.classList.add('on');
    }
    // the question is typed once; the chatbot "thinks" and answers; the proof assembles rung by rung
    function play(i) {
      var d = PROOF[i], my = ++run;
      clearAll(); reset(); paint(d);
      if (reduced) { showAll(d); return; }
      var k = 0;
      (function type() {
        if (my !== run) return;
        k++; qEl.textContent = d.q.slice(0, k);
        if (k < d.q.length) { later(type, 24 + Math.random() * 20); return; }
        qWrap.classList.remove('is-typing');
        later(function () { bubble.classList.add('is-thinking'); }, 220);
        later(function () { bubble.classList.remove('is-thinking'); bubble.classList.add('is-done'); }, 1250);
        receipt.forEach(function (li, j) { later(function () { li.classList.add('on'); }, 1650 + j * 260); });
        later(function () { verdict.classList.add('on'); }, 800);
        rungs.forEach(function (r, j) { later(function () { r.classList.add('on'); }, 1500 + j * 430); });
        later(function () { fix.classList.add('on'); }, 3000);
      })();
    }
    function select(i) {
      if (i === current) return;
      current = i;
      tabs.forEach(function (t, j) { t.classList.toggle('is-active', j === i); t.setAttribute('aria-selected', String(j === i)); });
      move(tabs[i]);
      play(i);
    }
    function restartProgress() {
      tabsEl.classList.remove('is-auto');
      void tabsEl.offsetWidth; // restart the CSS progress animation from zero
      if (auto) tabsEl.classList.add('is-auto');
    }
    function schedule() {
      clearTimeout(timer);
      if (!auto) return;
      restartProgress();
      timer = setTimeout(function () { select((current + 1) % PROOF.length); schedule(); }, PROOF_INTERVAL);
    }
    function stopAuto() { auto = false; clearTimeout(timer); tabsEl.classList.remove('is-auto'); }
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { stopAuto(); select(i); }); });
    // the show starts when the block is on screen; a hover pauses it, a click hands control to the reader
    var started = false;
    function start() { if (started) return; started = true; select(0); schedule(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { if (!started) start(); else schedule(); }
          else { clearTimeout(timer); tabsEl.classList.remove('is-auto'); }
        });
      }, { threshold: 0.35 }).observe(duel);
    } else start();
    duel.addEventListener('mouseenter', function () { clearTimeout(timer); tabsEl.classList.add('is-paused'); });
    duel.addEventListener('mouseleave', function () { tabsEl.classList.remove('is-paused'); if (started) schedule(); });
    window.addEventListener('resize', function () { move($('.tab.is-active', tabsEl)); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { move($('.tab.is-active', tabsEl)); });
    move(tabs[0]);

    if (hasGsap && !reduced) {
      gsap.fromTo('.proof-panel', { y: 64 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.proof', start: 'top bottom', end: 'top 35%', scrub: 0.8 } });
    }
    starfield($('#stars'));
  }

  function starfield(canvas) {
    if (!canvas || reduced) return;
    var ctx = canvas.getContext('2d'), stars = [], w = 0, h = 0, raf = null, on = false;
    function resize() {
      var r = canvas.parentElement.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      var count = Math.round((w * h) / 9000);
      for (var i = 0; i < count; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, r: 0.5 + Math.random() * 1.1, a: 0.12 + Math.random() * 0.4, v: 0.02 + Math.random() * 0.06, p: Math.random() * 6.28 });
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y -= s.v; if (s.y < -2) s.y = h + 2;
        var tw = 0.75 + 0.25 * Math.sin(t / 900 + s.p);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fillStyle = 'rgba(255,255,255,' + (s.a * tw).toFixed(3) + ')'; ctx.fill();
      }
      if (on) raf = requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(draw); if (!on && raf) { cancelAnimationFrame(raf); raf = null; } });
    }, { threshold: 0.05 }).observe(canvas);
  }

  /* ---------- security: a dot field with a travelling pulse (Aaru's "world" panel) ---------- */
  function setupSecurity() {
    var canvas = $('#dots');
    if (!canvas) return;
    var panel = canvas.parentElement, ctx = canvas.getContext('2d');
    var w = 0, h = 0, cols = 0, rows = 0, gap = 22, t = 0, raf = null, on = false;
    var mouse = { x: -1e4, y: -1e4 };
    function resize() {
      var r = panel.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / gap) + 1; rows = Math.ceil(h / gap) + 1;
    }
    function draw() {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      var ring = (t * 110) % (Math.max(w, h) * 0.7);
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var x = i * gap + 11, y = j * gap + 11;
          var dist = Math.hypot(x - cx, y - cy);
          var wave = Math.exp(-Math.pow((dist - ring) / 70, 2));
          var near = reduced ? 0 : Math.exp(-Math.pow(Math.hypot(x - mouse.x, y - mouse.y) / 130, 2));
          var a = 0.09 + wave * 0.3 + near * 0.45;
          var rr = 1 + wave * 0.9 + near * 1.2;
          ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283);
          ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.fill();
        }
      }
      if (on && !reduced) raf = requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', function () { resize(); if (!on) draw(); });
    panel.addEventListener('mousemove', function (e) { var r = panel.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    panel.addEventListener('mouseleave', function () { mouse.x = -1e4; mouse.y = -1e4; });
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        on = e.isIntersecting;
        if (on && !raf) raf = requestAnimationFrame(draw);
        if (!on && raf) { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0.05 }).observe(panel);
    draw();

    /* the plug: pull it and the outside link dies while the inside keeps flowing */
    var plug = $('#plug'), plugState = $('#plugState'), lbl = $('#perimeterLbl'), note = $('#plugNote'), hudOut = $('#hudOut');
    if (!plug) return;
    var offline = false, demo = [];
    var NOTE_ON = 'Connected, and still nothing leaves: every outbound call is refused at your edge.';
    var NOTE_OFF = 'Plug pulled. Parsing, detection and the memorandum keep running.';
    function setOffline(v) {
      offline = v;
      panel.classList.toggle('is-offline', v);
      plug.setAttribute('aria-pressed', String(v));
      if (plugState) plugState.textContent = v ? 'Air-gapped' : 'Connected';
      if (lbl) lbl.textContent = v ? 'Your network · sealed' : 'Your network';
      if (note) note.textContent = v ? NOTE_OFF : NOTE_ON;
    }
    plug.addEventListener('click', function () { demo.forEach(clearTimeout); demo = []; setOffline(!offline); });
    // every refused packet nudges the egress counter, which never moves off zero
    if (hudOut && !reduced) {
      setInterval(function () {
        if (offline || !on) return;
        hudOut.classList.remove('bump'); void hudOut.offsetWidth; hudOut.classList.add('bump');
      }, 1300);
    }
    // once, when the panel comes into view: pull the plug, show that it still runs, plug it back in
    if (!reduced && 'IntersectionObserver' in window) {
      var shown = false;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || shown) return;
          shown = true;
          demo.push(setTimeout(function () { setOffline(true); }, 2800));
          demo.push(setTimeout(function () { setOffline(false); }, 6800));
        });
      }, { threshold: 0.5 }).observe(panel);
    }
  }

  /* ---------- demo form: FormSubmit AJAX with a mailto fallback (same endpoint as the current site) ---------- */
  function setupForm() {
    var form = $('#demoForm');
    if (!form) return;
    var CONTACT_EMAIL = 'leo@sentinel-lai.com';
    var ENDPOINT = 'https://formsubmit.co/ajax/' + CONTACT_EMAIL;
    function val(id) { var f = $('#' + id); return f ? f.value.trim() : ''; }
    function mailto() {
      var body = 'Name: ' + val('sf-first') + ' ' + val('sf-last') + '\nWork email: ' + val('sf-email') + '\nCompany: ' + val('sf-company') + '\n\n' + val('sf-msg');
      return 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Sentinel demo request — ' + (val('sf-company') || val('sf-email'))) + '&body=' + encodeURIComponent(body);
    }
    function showError() {
      var err = $('#demoErr');
      if (!err) { err = document.createElement('p'); err.id = 'demoErr'; err.className = 'form-error'; err.setAttribute('role', 'alert'); form.appendChild(err); }
      err.innerHTML = 'Something went wrong sending your request. Please email us at <a href="' + mailto() + '">' + CONTACT_EMAIL + '</a>; your details are pre-filled in the draft.';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ['sf-first', 'sf-last', 'sf-email', 'sf-company'].forEach(function (id) {
        var f = $('#' + id); if (!f) return;
        var bad = !f.value.trim();
        if (id === 'sf-email' && !bad) bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value);
        f.classList.toggle('is-invalid', bad);
        if (bad) ok = false;
      });
      if (!ok) return;
      var btn = $('.sf-btn', form), label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; btn.style.opacity = '0.7'; }
      fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: val('sf-first') + ' ' + val('sf-last'), email: val('sf-email'), company: val('sf-company'), message: val('sf-msg') || '—', _subject: 'Sentinel demo request — ' + (val('sf-company') || val('sf-email')), _template: 'table', _captcha: 'false' })
      }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          if (String(data.success) !== 'true') throw new Error(data.message || 'not delivered');
          form.classList.add('hide');
          var s = $('#demoSuccess'); if (s) s.classList.add('show');
        })
        .catch(function () { if (btn) { btn.disabled = false; btn.innerHTML = label; btn.style.opacity = ''; } showError(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();

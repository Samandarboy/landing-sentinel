// Sentinel landing v2 — motion layer.
// GSAP (ScrollTrigger, SplitText, DrawSVG) drives the scroll-linked motion and the scenes, Motion
// animates every piece of text that arrives (Web Animations API, so it runs on the compositor),
// Lenis smooths the scroll, swarm.js (three.js) is the particle layer. Everything degrades: no GSAP
// or reduced motion = a static page with every state shown; no WebGL = no swarm.
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
  var has = { split: typeof window.SplitText !== 'undefined', draw: typeof window.DrawSVGPlugin !== 'undefined' };
  // three.js as an ES module (the UMD build is deprecated); the classic r160 script is the fallback
  var THREE_ESM = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js';
  var THREE_UMD = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
  var Demos = null, lenis = null, swarm = null;

  function main() {
    Demos = window.SentinelDemos || null;
    if (hasGsap) {
      gsap.registerPlugin(ScrollTrigger);
      if (has.split) gsap.registerPlugin(SplitText);
      if (has.draw) gsap.registerPlugin(DrawSVGPlugin);
    }
    if (anim) html.classList.add('anim');
    // ?slow=4 plays every timeline at quarter speed (for reviewing the motion frame by frame)
    var slow = /[?&]slow=(\d+(?:\.\d+)?)/.exec(window.location.search);
    if (slow && hasGsap) { slowBy = parseFloat(slow[1]); gsap.globalTimeline.timeScale(1 / slowBy); }
    var swarmP = bootSwarm();
    setupSmoothScroll();
    setupHeader();
    setupReveals();
    setupStagger();
    // text is measured and split when it animates, so it waits for the real fonts (or 1.2 s, whichever is first)
    fontsSoon().then(function () { setupText(); setupHero(); if (hasGsap) ScrollTrigger.refresh(); });
    setupStatement();
    setupPillars();
    setupHow();
    setupProof();
    setupVault();
    setupFilm();
    setupDeck();
    setupCal();
    setupAnchors();
    setupMagnetic();
    setupSpotlight();
    setupExtras();
    swarmP.then(function (sw) { if (sw) fontsReady().then(function () { setupSwarmAnchors(sw); }); });
  }

  function fontsReady() { return document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(); }
  // the web fonts, or 1.2 s, whichever comes first
  function fontsSoon() { return Promise.race([fontsReady(), new Promise(function (r) { setTimeout(r, 1200); })]); }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
  }

  /* ---------- the swarm: three.js is fetched after first paint, the page never waits for it ---------- */
  function bootSwarm() {
    var canvas = $('#swarm');
    if (reduced || !canvas || !window.SentinelSwarm) return Promise.resolve(null);
    try { var probe = document.createElement('canvas'); if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return Promise.resolve(null); } catch (e) { return Promise.resolve(null); }
    var three = window.THREE ? Promise.resolve(window.THREE)
      : import(THREE_ESM).catch(function () { return loadScript(THREE_UMD).then(function () { return window.THREE; }); });
    return three.then(function (THREE) {
      swarm = window.SentinelSwarm.create({ canvas: canvas, three: THREE });
      if (!swarm) return null;
      html.classList.add('has-swarm');
      if (hasGsap) gsap.to(swarm.uniforms.uAlpha, { value: 1, duration: 1.6, ease: 'power2.out' }); else swarm.fade(1);
      return swarm;
    }).catch(function () { return null; });
  }
  // the figures the particle layer assembles as you scroll: a contract page, a question mark, the wordmark.
  // `cell` is the finest lattice a figure may use (it coarsens by itself if the point budget runs out)
  function setupSwarmAnchors(sw) {
    var phone = mq('(max-width: 900px)');
    sw.add($('#swarmDoc'), 'doc', { strength: 0.95, mode: phone ? 'inview' : 'center' });
    sw.add($('#swarmQ'), 'glyph', { char: '?', weight: 700, family: '"Source Serif 4", Georgia, serif', scale: 1.08, cell: 3.4, sweep: 'down', strength: 0.95 });
    var wm = $('#wordmark');
    if (wm) sw.add(wm, 'text', { words: $$('span', wm), mode: 'inview', cell: phone ? 3.2 : 5, sweep: 'right', strength: 0.9 });
  }

  /* ---------- smooth scroll (Aaru runs Lenis; GSAP drives its ticker) ---------- */
  function setupSmoothScroll() {
    if (reduced || typeof window.Lenis === 'undefined' || !fine) return; // native scroll on touch
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

  /* ---------- header: blur on scroll, then hand over to the floating pill; a hairline tracks the page ---------- */
  var menuOpen = false;
  function closeMenu() {
    menuOpen = false;
    var m = $('#mobileMenu'), b = $('#burger');
    if (m) m.classList.remove('is-open');
    if (b) b.setAttribute('aria-expanded', 'false');
  }
  function setupHeader() {
    var header = $('#header'), pill = $('#pill'), hero = $('.hero'), bar = $('#progressBar');
    var burger = $('#burger'), menu = $('#mobileMenu'), ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var past = y > (hero ? hero.offsetHeight * 0.6 : 600);
      header.classList.toggle('is-scrolled', y > 8);
      header.classList.toggle('is-hidden', past && !menuOpen);
      pill.classList.toggle('is-visible', past && !menuOpen);
      pill.setAttribute('aria-hidden', past ? 'false' : 'true');
      if (bar) bar.style.transform = 'scaleX(' + Math.min(1, y / Math.max(1, html.scrollHeight - window.innerHeight)).toFixed(4) + ')';
    }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
    if (burger && menu) {
      burger.addEventListener('click', function () {
        menuOpen = !menuOpen;
        menu.classList.toggle('is-open', menuOpen);
        burger.setAttribute('aria-expanded', String(menuOpen));
        update();
      });
    }
    // the pill marks the section you are in
    var links = $$('.pill .nav a');
    if (links.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (l) { l.classList.toggle('is-current', l.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach(function (s) { io.observe(s); });
    }
  }

  // A jump (End key, scrollbar drag, an anchor far down) can carry an element from below the screen to above it
  // without ever intersecting. Anything already above the viewport is shown at once, so scrolling back up
  // never finds a gap.
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

  /* ---------- reveals: an in-view class, CSS does the motion (Linear's approach) ---------- */
  function setupReveals() {
    var els = $$('[data-reveal]');
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.__shown = true;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
    whenPassed(els, function (el) { el.classList.add('in'); io.unobserve(el); });
  }

  /* ---------- groups: the children of a [data-stagger] arrive one after another (CSS transitions, so compositor) ---------- */
  function showGroup(g) {
    if (!g || g.classList.contains('in')) return;
    g.__shown = true;
    g.classList.add('in');
    // once everyone has landed, the children get their own transitions back (hover states, sliding indicators)
    setTimeout(function () { g.classList.add('done'); }, (1300 + g.children.length * 80) * slowBy);
  }
  function setupStagger() {
    var groups = $$('[data-stagger]');
    groups.forEach(function (g) { [].forEach.call(g.children, function (c, i) { c.style.setProperty('--si', i); }); });
    if (!anim) return; // the waiting state only exists under html.anim
    var auto = groups.filter(function (g) { return !g.hasAttribute('data-manual'); });
    if (!('IntersectionObserver' in window)) { auto.forEach(showGroup); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); showGroup(e.target); });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    auto.forEach(function (g) { io.observe(g); });
    whenPassed(auto, function (g) { io.unobserve(g); g.classList.add('in', 'done'); });
  }

  /* ---------- text motion ----------------------------------------------------------------------------------------
     One language for every piece of text that arrives: it comes up out of a soft blur on a spring with no bounce.
     Headings move word by word, paragraphs line by line, labels settle their tracking. SplitText splits the text
     only for as long as it animates and then puts the markup back exactly as written (no stale line wrappers on
     resize, no lost kerning, nothing for a screen reader to trip on). Motion plays the keyframes through the Web
     Animations API, so opacity, transform and filter run on the compositor and stay smooth while the main thread
     is busy with the particle layer. */
  var Mo = window.Motion || null, slowBy = 1;
  var WORDS = { opacity: [0, 1], transform: ['translateY(0.4em)', 'translateY(0em)'], filter: ['blur(12px)', 'blur(0px)'] };
  var LINES = { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'], filter: ['blur(6px)', 'blur(0px)'] };

  function run(els, frames, o) {
    els = els.length === undefined ? [els] : [].slice.call(els);
    o = o || {};
    if (!els.length) return Promise.resolve();
    var dur = (o.duration || 1) * slowBy, each = (o.stagger || 0) * slowBy, wait = (o.delay || 0) * slowBy;
    if (Mo && Mo.animate) {
      var opts = { delay: each ? Mo.stagger(each, { startDelay: wait }) : wait };
      // a critically damped spring lands more softly than any cubic curve; short swaps use the curve
      if (o.spring !== false && Mo.spring) { opts.type = Mo.spring; opts.bounce = 0; opts.visualDuration = dur * 0.6; }
      else { opts.duration = dur; opts.ease = [0.16, 1, 0.3, 1]; }
      var c = Mo.animate(els, frames, opts);
      return Promise.resolve(c.finished || c).then(function () {});
    }
    if (!els[0].animate) return Promise.resolve();
    // no Motion (CDN blocked): the same keyframes through the Web Animations API directly
    var names = Object.keys(frames), kf = [];
    for (var i = 0; i < frames[names[0]].length; i++) { var f = {}; names.forEach(function (k) { f[k] = frames[k][i]; }); kf.push(f); }
    return Promise.all(els.map(function (el, j) {
      var a = el.animate(kf, { duration: dur * 1000, delay: (wait + j * each) * 1000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' });
      return a.finished.then(function () { try { a.commitStyles(); } catch (e) {} a.cancel(); });
    })).then(function () {});
  }
  // an element that stays in the page keeps no leftover layer: only its opacity remains
  function tidy(els) { els.forEach(function (el) { el.style.transform = ''; el.style.filter = ''; el.style.willChange = ''; }); }

  function revealText(el, extraDelay) {
    if (el.__shown) return Promise.resolve();
    el.__shown = true;
    var kind = el.getAttribute('data-text'), wait = parseFloat(el.getAttribute('data-delay') || 0) + (extraDelay || 0);
    var show = function () { el.style.opacity = 1; };
    try {
      if (kind === 'label') {
        var cs = window.getComputedStyle(el), px = parseFloat(cs.fontSize) || 12, to = parseFloat(cs.letterSpacing) || 0;
        return run(el, { opacity: [0, 1], letterSpacing: [(px * 0.34).toFixed(2) + 'px', to.toFixed(2) + 'px'], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 1.3, delay: wait })
          .then(function () { show(); tidy([el]); el.style.letterSpacing = ''; });
      }
      if (!has.split) return run(el, LINES, { duration: 1.1, delay: wait }).then(function () { show(); tidy([el]); });
      var lines = kind === 'lines';
      var split = SplitText.create(el, lines ? { type: 'lines', linesClass: 'tl' } : { type: 'words', wordsClass: 'tw' });
      var parts = lines ? split.lines : split.words;
      parts.forEach(function (p) { p.style.opacity = 0; });
      show();
      return run(parts, lines ? LINES : WORDS, { duration: lines ? 1.1 : 1.25, stagger: lines ? 0.09 : 0.06, delay: wait })
        .then(function () { split.revert(); });
    } catch (e) { show(); return Promise.resolve(); }
  }
  function setupText() {
    if (!anim) return; // [data-text] is only transparent under html.anim
    var auto = $$('[data-text]').filter(function (el) { return !el.hasAttribute('data-manual'); });
    if (!('IntersectionObserver' in window)) { auto.forEach(function (el) { revealText(el); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); revealText(e.target); });
    }, { threshold: 0.35, rootMargin: '0px 0px -6% 0px' });
    auto.forEach(function (el) { io.observe(el); });
    whenPassed(auto, function (el) { io.unobserve(el); el.style.opacity = 1; });
  }
  // one short label replaces another: the old one lifts away, the new one comes up (used for the status chips)
  function swapText(el, text) {
    if (!anim) { el.textContent = text; return; }
    run(el, { opacity: [1, 0], transform: ['translateY(0px)', 'translateY(-6px)'], filter: ['blur(0px)', 'blur(4px)'] }, { duration: 0.22, spring: false })
      .then(function () {
        el.textContent = text;
        return run(el, { opacity: [0, 1], transform: ['translateY(7px)', 'translateY(0px)'], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 0.7 });
      }).then(function () { tidy([el]); });
  }

  // wrap each word in a span; element children (line breaks, accents) are kept in place
  function splitWords(el, cls) {
    var nodes = [].slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (node) {
      if (node.nodeType === 1) { el.appendChild(node); return; }
      String(node.textContent).split(/(\s+)/).forEach(function (t) {
        if (!t) return;
        if (!t.trim()) { el.appendChild(document.createTextNode(t)); return; }
        var s = document.createElement('span');
        s.className = cls || 'w';
        s.textContent = t;
        el.appendChild(s);
      });
    });
    return $$('.' + (cls || 'w'), el);
  }

  /* ---------- hero: the headline arrives word by word, then the lede, the actions, the facts and the product frame ---------- */
  function setupHero() {
    var title = $('#heroTitle'), frame = $('.frame'), demo = $('.frame .sd-demo');
    if (frame && demo && Demos) {
      var timer = null;
      var play = function () { Demos.play(demo); clearInterval(timer); timer = setInterval(function () { Demos.play(demo); }, 13000); };
      var stop = function () { clearInterval(timer); timer = null; Demos.stop(demo); };
      if (!('IntersectionObserver' in window)) play();
      else new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { if (!timer) setTimeout(play, anim ? 2400 : 500); } else stop(); });
      }, { threshold: 0.2 }).observe(frame);
    }
    if (!anim || !title) { html.classList.add('ready'); return; }

    // the headline is split into words (never letters: letters would lose their kerning) for as long as it animates
    var split = has.split ? SplitText.create(title, { type: 'words', wordsClass: 'tw' }) : null;
    var words = split ? split.words : splitWords(title, 'tw');
    var lede = $('.hero-lede'), ctas = $('.hero-ctas'), facts = $$('.hero-facts span'), wrap = $('.frame-wrap');
    words.concat(facts, [wrap]).forEach(function (el) { el.style.opacity = 0; });
    html.classList.add('ready');
    function settle() { if (split) split.revert(); else tidy(words); }

    // everything under the headline: the lede line by line, the two actions, the three facts, then the product frame
    function body(tl, at) {
      tl.call(function () { revealText(lede); }, null, at)
        .call(function () { showGroup(ctas); }, null, at + 0.2)
        .call(function () { run(facts, LINES, { duration: 1.1, stagger: 0.1 }).then(function () { facts.forEach(function (f) { f.style.opacity = 1; }); tidy(facts); }); }, null, at + 0.32)
        .call(function () { run(wrap, { opacity: [0, 1], transform: ['translateY(56px)', 'translateY(0px)'] }, { duration: 1.7 }).then(function () { wrap.style.opacity = 1; tidy([wrap]); }); }, null, at + 0.28);
    }
    // The headline is set in type from its first frame: word by word out of a soft blur, like every other heading.
    // (It used to assemble out of the particle layer and cross-fade into the real text; grain turning into letters
    // never looked finished, so the dust now stays in the background where it belongs.)
    var tl = gsap.timeline();
    tl.call(function () { run(words, WORDS, { duration: 1.35, stagger: 0.075 }).then(settle); }, null, 0.1);
    body(tl, 0.62);

    // the frame drifts up a little slower than the page (no tilt: it stays flat from the first frame)
    gsap.to(frame, { y: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    gsap.to('.hero-inner', { y: -50, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.hero', start: '12% top', end: '60% top', scrub: 0.6 } });
  }

  /* ---------- statement: words brighten as you scroll; "summarizes" is struck, "attacks" flares ---------- */
  function setupStatement() {
    var rest = $('.statement .rest');
    if (!rest) return;
    var strike = $('.st-strike'), hot = $('.st-hot');
    if (!anim) { rest.style.color = '#c8cdd5'; if (strike) strike.style.setProperty('--strike', 1); if (hot) hot.style.setProperty('--hot', '0%'); return; }
    var words = splitWords(rest);
    gsap.fromTo(words, { color: 'rgba(138,143,152,0.35)' }, {
      color: '#c8cdd5', stagger: 0.06, ease: 'none',
      scrollTrigger: { trigger: '.statement', start: 'top 92%', end: 'center 60%', scrub: 0.4 }
    });
    // the paragraph arrives in reading order: the first sentence phrase by phrase, then the rest of it
    // (the scroll only decides how bright the rest is, never whether it is there before its own opening line)
    var phrases = $$('.statement .lw');
    phrases.concat([rest]).forEach(function (w) { w.style.opacity = 0; });
    var tl = gsap.timeline({ scrollTrigger: { trigger: '.statement', start: 'top 86%', once: true } });
    tl.call(function () { run(phrases, WORDS, { duration: 1.3, stagger: 0.11 }).then(function () { phrases.forEach(function (w) { w.style.opacity = 1; }); tidy(phrases); }); }, null, 0)
      .call(function () { run(rest, { opacity: [0, 1], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 1.4 }).then(function () { rest.style.opacity = 1; tidy([rest]); }); }, null, 0.55);
    if (strike) tl.to(strike, { '--strike': 1, duration: 0.8, ease: 'power3.inOut' }, 1.0);
    if (hot) tl.fromTo(hot, { '--hot': '100%' }, { '--hot': '0%', duration: 1.6, ease: 'power2.inOut' }, 1.35);
  }

  /* ---------- three pillars: each scene is a looping timeline that runs only while it is on screen ---------- */
  function setupPillars() {
    var builders = { find: sceneFind, prove: sceneProve, fix: sceneFix };
    $$('.scene[data-scene]').forEach(function (root) {
      var kind = root.getAttribute('data-scene');
      if (!anim) { sceneStatic(kind, root); return; }
      var tl = builders[kind](root);
      ScrollTrigger.create({
        trigger: root, start: 'top 85%', end: 'bottom 5%',
        onToggle: function (self) { if (self.isActive) tl.play(); else tl.pause(); }
      });
    });
  }
  function sceneStatic(kind, root) {
    if (kind === 'find') {
      $$('.sf-l.is-flag', root).forEach(function (f, i) { f.style.background = i === 1 ? '#ff9f43' : '#ff5f57'; });
      $$('.sf-tag', root).forEach(function (t) { t.style.opacity = 1; });
      $('.sf-count b', root).textContent = '3';
    } else if (kind === 'prove') {
      $('mark', root).style.setProperty('--hl', '100%');
    } else {
      var del = $('del', root); del.style.setProperty('--strike', 1); del.classList.add('is-cut');
      $('ins', root).textContent = 'the annual contract value.';
      $('.sx-status', root).textContent = 'ready to paste';
    }
  }
  // 1 — a beam reads the page; three lines light up, each gets its name, the counter ticks
  function sceneFind(root) {
    var beam = $('.sf-beam', root), flags = $$('.sf-l.is-flag', root), tags = $$('.sf-tag', root), count = $('.sf-count b', root);
    var rows = [4, 6, 9], colors = ['#ff5f57', '#ff9f43', '#ff5f57'], T = 2.8, t0 = 0.4;
    var tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 });
    tl.set(flags, { backgroundColor: 'rgba(255,255,255,0.13)', boxShadow: 'none' }, 0)
      .set(tags, { opacity: 0 }, 0)
      .call(function () { count.textContent = '0'; }, null, 0)
      .fromTo(root, { opacity: 0.0 }, { opacity: 1, duration: 0.5 }, 0)
      .fromTo(beam, { top: '0%' }, { top: '116%', duration: T, ease: 'none' }, t0);
    flags.forEach(function (f, i) {
      var at = t0 + T * ((rows[i] - 0.5) / 10) / 1.16;
      tl.to(f, { backgroundColor: colors[i], boxShadow: '0 0 12px ' + colors[i], duration: 0.22 }, at)
        .to(f, { boxShadow: '0 0 0px ' + colors[i], duration: 0.9 }, at + 0.25)
        .fromTo(tags[i], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, at + 0.04)
        .fromTo($('i', tags[i]), { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power2.out' }, at + 0.04)
        .call(function () { count.textContent = String(i + 1); gsap.fromTo(count, { y: -7, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }); }, null, at);
    });
    tl.to(root, { opacity: 0, duration: 0.5, ease: 'power1.in' }, t0 + T + 2.4);
    return tl;
  }
  // 2 — the finding is wired to the words it rests on; the words are marked, the stamp lands
  function sceneProve(root) {
    var find = $('.sp-find', root), path = $('.sp-wire path', root), dot = $('.sp-wire circle', root), clause = $('.sp-clause', root), mark = $('mark', root), stamp = $('.sp-stamp', root);
    var tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 });
    tl.set(mark, { '--hl': '0%' }, 0)
      .fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0)
      .fromTo(find, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.1);
    if (has.draw) tl.fromTo(path, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.8, ease: 'power2.inOut' }, 0.7);
    tl.fromTo(dot, { opacity: 0, attr: { cx: 6, cy: 0 } }, { opacity: 1, attr: { cx: 6, cy: 36 }, duration: 0.45, ease: 'power2.in' }, 0.7)
      .to(dot, { attr: { cx: 52, cy: 47 }, duration: 0.4, ease: 'power2.out' }, 1.15)
      .to(dot, { opacity: 0, duration: 0.2 }, 1.55)
      .fromTo(clause, { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, 1.35)
      .to(mark, { '--hl': '100%', duration: 0.7, ease: 'power2.inOut' }, 2.0)
      .fromTo(stamp, { opacity: 0, scale: 0.3, rotate: -14 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.4)' }, 2.75)
      .fromTo(stamp, { boxShadow: '0 0 0 0 rgba(47,210,127,0.5)' }, { boxShadow: '0 0 0 12px rgba(47,210,127,0)', duration: 0.9, ease: 'power2.out' }, 2.9)
      .to(root, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 5.6);
    return tl;
  }
  // 3 — the broken words are struck out and the fix is typed in their place
  function sceneFix(root) {
    var doc = $('.sx-doc', root), bar = $('.sx-bar', root), del = $('del', root), ins = $('ins', root), caret = $('.sx-caret', root), status = $('.sx-status', root), copy = $('.sx-copy', root);
    var TEXT = 'the annual contract value.', k = { n: 0 };
    var tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 });
    tl.call(function () { del.classList.remove('is-cut'); ins.textContent = ''; caret.classList.remove('on'); status.textContent = 'drafting…'; copy.textContent = 'Copy'; copy.classList.remove('is-done'); k.n = 0; }, null, 0)
      .set(del, { '--strike': 0 }, 0)
      .fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0)
      .fromTo(doc, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.1)
      .fromTo(bar, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.4)
      .to(del, { '--strike': 1, duration: 0.55, ease: 'power3.inOut' }, 1.0)
      .call(function () { del.classList.add('is-cut'); caret.classList.add('on'); }, null, 1.5)
      .to(k, { n: TEXT.length, duration: 1.5, ease: 'none', onUpdate: function () { ins.textContent = TEXT.slice(0, Math.round(k.n)); } }, 1.7)
      .call(function () { caret.classList.remove('on'); }, null, 3.3);
    tl.call(function () { swapText(status, 'ready to paste'); }, null, 3.3);
    tl.to(copy, { scale: 0.92, duration: 0.12, ease: 'power2.in' }, 4.2)
      .call(function () { copy.textContent = 'Copied'; copy.classList.add('is-done'); }, null, 4.32)
      .to(copy, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, 4.32)
      .to(root, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 6.4);
    return tl;
  }

  /* ---------- how it works: a scroll-driven stage on desktop, a story you swipe on tablets and phones ---------- */
  function setupHow() {
    var how = $('.how'), stage = $('#stage');
    var steps = $$('.step'), panels = $$('.stage-panel'), bars = $$('#storyBars button');
    if (!how || !stage || !steps.length || steps.length !== panels.length) return;
    var active = -1, n = steps.length, visible = false, wasTimer = null;

    function setActive(i, dir) {
      if (i === active) return;
      var prev = active;
      active = i;
      stage.style.setProperty('--dir', dir == null ? 1 : dir);
      steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
      panels.forEach(function (p, j) {
        p.classList.toggle('is-active', j === i);
        p.classList.toggle('was-active', j === prev && prev >= 0);
        var d = $('.sd-demo', p);
        if (!Demos || !d) return;
        if (j === i && visible) Demos.play(d); else if (j !== i) Demos.stop(d);
      });
      clearTimeout(wasTimer);
      wasTimer = setTimeout(function () { panels.forEach(function (p) { p.classList.remove('was-active'); }); }, 950);
    }
    function stageVisible(v) {
      visible = v;
      if (!Demos) return;
      if (v && active >= 0) Demos.play($('.sd-demo', panels[active]));
      if (!v) panels.forEach(function (p) { Demos.stop($('.sd-demo', p)); });
    }

    /* desktop: scroll progress picks the step */
    function desktop() {
      function onProgress(p) {
        var idx = Math.min(n - 1, Math.max(0, Math.floor(p * n)));
        setActive(idx, idx >= active ? 1 : -1);
        var local = Math.min(1, Math.max(0, p * n - idx));
        steps.forEach(function (s, j) {
          var bar = $('.step-bar i', s);
          if (bar) bar.style.transform = 'scaleY(' + (j < idx ? 1 : j === idx ? local : 0) + ')';
        });
      }
      var st = null, tick = null, io = null;
      if (hasGsap) {
        st = ScrollTrigger.create({ trigger: how, start: 'top top+=72', end: 'bottom bottom', onUpdate: function (s) { onProgress(s.progress); }, onEnter: function () { onProgress(0); }, onEnterBack: function () { onProgress(1); } });
      } else {
        tick = function () { var r = how.getBoundingClientRect(); onProgress(Math.min(1, Math.max(0, (-r.top + 72) / Math.max(1, r.height - window.innerHeight)))); };
        window.addEventListener('scroll', tick, { passive: true }); tick();
      }
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting && active < 0) setActive(0); stageVisible(e.isIntersecting); }); }, { threshold: 0.3 });
        io.observe(stage);
      } else { setActive(0); stageVisible(true); }
      var onStep = steps.map(function (s, i) {
        var fn = function () {
          var top = how.offsetTop - 72 + (how.offsetHeight - window.innerHeight) * ((i + 0.12) / n);
          if (lenis) lenis.scrollTo(top, { duration: 1 }); else window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
        };
        s.addEventListener('click', fn); return fn;
      });
      return function () {
        if (st) st.kill(); if (tick) window.removeEventListener('scroll', tick); if (io) io.disconnect();
        steps.forEach(function (s, i) { s.removeEventListener('click', onStep[i]); });
      };
    }

    /* tablets and phones: three stories. A bar fills while the pass plays, then the next one slides in.
       Swipe or tap the sides to move, hold to pause; nothing is pinned, so the page scrolls as normal. */
    function stories() {
      var DUR = [12.6, 13.2, 12.2], fill = null, hint = $('#storyHint'), held = false, io = null;
      function paint(i) { bars.forEach(function (b, j) { var f = $('i', b); if (f) f.style.transform = 'scaleX(' + (j < i ? 1 : 0) + ')'; }); }
      function run(i) {
        if (fill) fill.kill();
        paint(i);
        var f = $('i', bars[i]);
        if (!f || !hasGsap) return;
        fill = gsap.fromTo(f, { scaleX: 0 }, { scaleX: 1, duration: reduced ? 20 : DUR[i], ease: 'none', paused: !visible || held, onComplete: function () { go((i + 1) % n, 1); } });
      }
      function go(i, dir) {
        i = (i + n) % n;
        if (i === active) { run(i); if (Demos && visible) Demos.play($('.sd-demo', panels[i])); return; }
        setActive(i, dir);
        run(i);
      }
      function used() { if (hint) hint.classList.add('is-used'); }
      var x0 = 0, y0 = 0, moved = false, holdTimer = null;
      function down(e) {
        x0 = e.clientX; y0 = e.clientY; moved = false;
        holdTimer = setTimeout(function () { held = true; stage.classList.add('is-held'); if (fill) fill.pause(); }, 260);
      }
      function move(e) { if (Math.abs(e.clientX - x0) > 8 || Math.abs(e.clientY - y0) > 8) { moved = true; clearTimeout(holdTimer); } }
      function up(e) {
        clearTimeout(holdTimer);
        var dx = e.clientX - x0, dy = e.clientY - y0, wasHeld = held;
        if (held) { held = false; stage.classList.remove('is-held'); if (fill && visible) fill.play(); }
        if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) { used(); go(active + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); stage.dataset.swiped = '1'; setTimeout(function () { delete stage.dataset.swiped; }, 60); }
        else if (wasHeld) { stage.dataset.swiped = '1'; setTimeout(function () { delete stage.dataset.swiped; }, 60); }
      }
      function cancel() { clearTimeout(holdTimer); if (held) { held = false; stage.classList.remove('is-held'); if (fill && visible) fill.play(); } }
      function tap(e) {
        if (stage.dataset.swiped || moved) return;
        var nav = e.target.closest ? e.target.closest('.story-nav') : null;
        if (!nav) return;
        used();
        var fwd = nav.classList.contains('next');
        go(active + (fwd ? 1 : -1), fwd ? 1 : -1);
      }
      var barFns = bars.map(function (b, i) { var fn = function () { used(); go(i, i >= active ? 1 : -1); }; b.addEventListener('click', fn); return fn; });
      stage.addEventListener('pointerdown', down); stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', cancel); stage.addEventListener('pointerleave', cancel);
      stage.addEventListener('click', tap);
      if (active < 0) setActive(0);
      paint(active);
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var v = e.isIntersecting;
            if (v && !visible) { stageVisible(true); run(active); }
            else if (!v && visible) { stageVisible(false); if (fill) fill.pause(); }
          });
        }, { threshold: 0.55 });
        io.observe(stage);
      } else { stageVisible(true); run(active); }
      return function () {
        if (fill) fill.kill(); if (io) io.disconnect();
        stage.removeEventListener('pointerdown', down); stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerup', up); stage.removeEventListener('pointercancel', cancel); stage.removeEventListener('pointerleave', cancel);
        stage.removeEventListener('click', tap);
        bars.forEach(function (b, i) { b.removeEventListener('click', barFns[i]); });
        stageVisible(false);
      };
    }

    // one mode at a time; crossing 1024px swaps them cleanly
    var wide = window.matchMedia('(min-width: 1025px)'), cleanup = null;
    function mode() { if (cleanup) cleanup(); visible = false; cleanup = wide.matches ? desktop() : stories(); }
    if (wide.addEventListener) wide.addEventListener('change', mode); else if (wide.addListener) wide.addListener(mode);
    mode();
  }

  /* ---------- proof: the same question asked twice — a chat bubble on the left, a worked proof on the right ---------- */
  var PROOF = [
    { q: 'Is the liability cap acceptable?',
      bot: ['Yes. Liability is capped at the fees paid in the last twelve months, a standard mutual cap. ', 'Nothing to flag.', ''],
      verdict: 'During the free pilot, the cap is zero.',
      ref: '§ 9.2', cite: ['“…shall not exceed ', 'the fees paid', ' in the twelve (12) months preceding the claim.”'],
      steps: [['Day 1', 'Pilot starts, fees $0'], ['Month 5', 'A claim: cap = $0'], ['Outcome', 'You recover nothing']] },
    { q: 'Can either side walk away?',
      bot: ['Yes. Either party may terminate on thirty days’ notice, so the exit rights are ', 'mutual and balanced.', ''],
      verdict: 'They can leave on day 31 and keep eleven months of your fee.',
      ref: '§ 11.1', cite: ['“…either Party may ', 'terminate for convenience', ' on thirty (30) days’ written notice.”'],
      steps: [['Day 1', 'You prepay 12 months'], ['Day 31', 'They terminate'], ['Outcome', 'No refund (§ 4.3)']] },
    { q: 'When do we get paid?',
      bot: ['Thirty days after an accepted invoice. ', 'Net-30 is standard commercial practice.', ''],
      verdict: '“Accepted” is never defined. Payment can wait forever.',
      ref: '§ 5.2', cite: ['“…due thirty (30) days after the invoice is ', 'accepted by the Customer', '.”'],
      steps: [['Day 0', 'Invoice sent'], ['Day 30', 'Never “accepted”'], ['Outcome', 'Payment never due']] },
    { q: 'Do we have exclusivity?',
      bot: ['Yes. Section 2.4 grants you exclusive rights in the Territory, so ', 'exclusivity is secured.', ''],
      verdict: 'Schedule 2 is empty. Your exclusivity covers nowhere.',
      ref: '§ 2.4', cite: ['“…exclusive rights in the Territory (', 'as defined in Schedule 2', ').”'],
      steps: [['Signing', 'Territory = Schedule 2'], ['Month 3', 'A rival is appointed'], ['Outcome', 'No breach: it is empty']] },
    { q: 'Can they hand this contract to someone else?',
      bot: ['No. Assignment requires prior written consent, ', 'a standard mutual protection.', ''],
      verdict: 'A buyout isn’t an assignment. Your competitor can inherit the contract.',
      ref: '§ 14.2', cite: ['“Neither Party may ', 'assign this Agreement', ' without the prior written consent of the other.”'],
      steps: [['Year 1', 'A competitor buys them'], ['Same day', 'No consent needed'], ['Outcome', 'They inherit the contract']] }
  ];
  var PROOF_INTERVAL = 11500;

  function setupProof() {
    var tabsEl = $('#tabs'), duel = $('#duel');
    if (!tabsEl || !duel) return;
    var tabs = $$('.tab', tabsEl), ind = $('.tab-ind', tabsEl);
    var qWrap = $('#duelQ'), qEl = $('#duelQText'), bubble = $('#bubble'), bubbleText = $('#bubbleText');
    var bot = $('#ansBot'), sen = $('#ansSen'), botTag = $('#botTag'), senTag = $('#senTag');
    var miss = $$('#miss li'), verdict = $('#verdict'), citeRef = $('#citeRef'), citeText = $('#citeText');
    var cite = $('#cite'), sim = $('#sim'), trace = $('#trace'), nodes = $$('#trace li');
    // on a phone the two cards are stacked and long: the examples only move on when the reader asks
    var compact = mq('(max-width: 900px)'), nextBtn = $('#duelNext');
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
      citeText.appendChild(document.createTextNode(d.cite[0])); citeText.appendChild(el('mark', '', d.cite[1])); citeText.appendChild(document.createTextNode(d.cite[2]));
      nodes.forEach(function (li, j) { $('.trace-t', li).textContent = d.steps[j][0]; $('.trace-v', li).textContent = d.steps[j][1]; });
    }
    function markClause(now) {
      var m = $('mark', citeText); if (!m) return;
      if (now || !anim) m.style.setProperty('--hl', '100%');
      else tweens.push(gsap.fromTo(m, { '--hl': '0%' }, { '--hl': '100%', duration: 0.8, ease: 'power2.inOut' }));
    }
    // the contract is played forward: a playhead travels the timeline and each event lands as it is reached
    function playSim(now) {
      if (now || !anim) { nodes.forEach(function (li) { li.classList.add('on'); }); trace.style.setProperty('--run', 1); return; }
      var k = { v: 0 };
      nodes[0].classList.add('on');
      tweens.push(gsap.to(k, {
        v: 1, duration: 2.5, ease: 'power1.inOut',
        onUpdate: function () { trace.style.setProperty('--run', k.v.toFixed(4)); if (k.v >= 0.5) nodes[1].classList.add('on'); if (k.v >= 0.995) nodes[2].classList.add('on'); }
      }));
    }
    function reset() {
      qEl.textContent = ''; qWrap.classList.add('is-typing');
      bubble.classList.remove('is-done', 'is-thinking');
      bot.classList.remove('is-missed'); sen.classList.remove('is-proven');
      botTag.textContent = 'Answers'; senTag.textContent = 'Proving';
      miss.forEach(function (li) { li.classList.remove('on'); });
      cite.classList.remove('on'); sim.classList.remove('on');
      nodes.forEach(function (li) { li.classList.remove('on'); });
      trace.style.setProperty('--run', 0); sen.style.setProperty('--sheen', '-100%');
    }
    function showAll(d) {
      qEl.textContent = d.q; qWrap.classList.remove('is-typing'); bubble.classList.add('is-done');
      bot.classList.add('is-missed'); sen.classList.add('is-proven'); botTag.textContent = 'Missed it'; senTag.textContent = 'Proven';
      miss.forEach(function (li) { li.classList.add('on'); });
      $$('.split-word', verdict).forEach(function (w) { w.style.opacity = 1; });
      cite.classList.add('on'); sim.classList.add('on');
      markClause(true); playSim(true);
      var c = $('.claim', bubbleText); if (c) c.style.setProperty('--cut', '100%');
    }
    // the question is typed once; the chatbot "thinks" and answers; Sentinel gives its verdict, quotes the clause and
    // plays the contract forward; when the last event lands, the chatbot's confident line is struck out
    var stageEls = [$('.duel-cols', duel), qEl], shownOnce = false;
    function play(i) {
      var d = PROOF[i], my = ++turn;
      clearAll();
      if (!anim) { reset(); paint(d); showAll(d); return; }
      // between questions the old answer dissolves before the new one is set up (no hard cut to two empty cards)
      var out = shownOnce ? run(stageEls, { opacity: [1, 0], filter: ['blur(0px)', 'blur(6px)'] }, { duration: 0.3, spring: false }) : Promise.resolve();
      shownOnce = true;
      out.then(function () {
        if (my !== turn) return;
        reset(); paint(d);
        run(stageEls, { opacity: [0, 1], filter: ['blur(6px)', 'blur(0px)'] }, { duration: 0.8 }).then(function () { if (my === turn) { stageEls.forEach(function (e) { e.style.opacity = ''; }); tidy(stageEls); } });
        begin(d, my);
      });
    }
    function begin(d, my) {
      var k = 0;
      (function type() {
        if (my !== turn) return;
        k++; qEl.textContent = d.q.slice(0, k);
        if (k < d.q.length) { timers.push(setTimeout(type, (20 + Math.random() * 22) * slowBy)); return; }
        qWrap.classList.remove('is-typing');
        later(function () { bubble.classList.add('is-thinking'); }, 200);
        later(function () { bubble.classList.remove('is-thinking'); bubble.classList.add('is-done'); }, 1200);
        miss.forEach(function (li, j) { later(function () { li.classList.add('on'); }, 1900 + j * 220); });
        later(function () { run($$('.split-word', verdict), WORDS, { duration: 1.1, stagger: 0.055 }); }, 800);
        later(function () { cite.classList.add('on'); }, 1800);
        later(function () { markClause(false); }, 2400);
        later(function () { sim.classList.add('on'); }, 3300);
        later(function () { playSim(false); }, 3800);
        later(function () { sen.classList.add('is-proven'); swapText(senTag, 'Proven'); tweens.push(gsap.fromTo(sen, { '--sheen': '-100%' }, { '--sheen': '100%', duration: 1.2, ease: 'power2.inOut' })); }, 6700);
        later(function () {
          var c = $('.claim', bubbleText);
          if (c) tweens.push(gsap.fromTo(c, { '--cut': '0%' }, { '--cut': '100%', duration: 0.6, ease: 'power2.inOut' }));
          bot.classList.add('is-missed'); swapText(botTag, 'Missed it');
        }, 7300);
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
    function schedule() {
      clearTimeout(timer);
      if (!auto) return;
      restartProgress();
      timer = setTimeout(function () { select((current + 1) % PROOF.length); schedule(); }, PROOF_INTERVAL);
    }
    function stopAuto() { auto = false; clearTimeout(timer); tabsEl.classList.remove('is-auto'); }
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { stopAuto(); select(i); }); });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      stopAuto(); select((current + 1) % PROOF.length);
      var y = qWrap.getBoundingClientRect().top + (window.scrollY || 0) - 96;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    });
    var started = false;
    function start() { if (started) return; started = true; select(0); schedule(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { if (!started) start(); else schedule(); }
          else { clearTimeout(timer); tabsEl.classList.remove('is-auto'); }
        });
      }, { threshold: 0.3 }).observe(duel);
    } else start();
    if (fine) {
      duel.addEventListener('mouseenter', function () { clearTimeout(timer); tabsEl.classList.add('is-paused'); });
      duel.addEventListener('mouseleave', function () { tabsEl.classList.remove('is-paused'); if (started) schedule(); });
    }
    window.addEventListener('resize', function () { move($('.tab.is-active', tabsEl)); });
    fontsReady().then(function () { move($('.tab.is-active', tabsEl)); });
    move(tabs[0]);

    if (anim) {
      // the cobalt block opens like a shutter as it comes up the screen
      gsap.fromTo('.proof', { clipPath: 'inset(0% 6% 0% 6% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.proof', start: 'top 96%', end: 'top 30%', scrub: 0.6 } });
      gsap.fromTo('.proof-panel', { y: 70 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.proof', start: 'top bottom', end: 'top 30%', scrub: 0.8 } });
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

  /* ---------- why: what you walk away with. A fine dot-matrix display draws a sign for each of three outcomes ---------- */
  function setupVault() {
    var vault = $('#vault'), canvas = $('#matrix'), space = $('#matrixSpace');
    if (!vault || !canvas || !space) return;
    var ctx = canvas.getContext('2d'), ctls = $$('.ctl', vault), readout = $('#readout');
    var w = 0, h = 0, gap = 10, cols = 0, rows = 0, dots = [], scanAt = -9, t = 0, raf = null, on = false, lastNow = 0;
    var icon = { x: 0, y: 0, cells: 0 }, mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0, lx: null, ly: 0 };
    var current = -1, auto = !reduced, timer = null, tick = null, steps = [], hand = 0;
    var SIGNS = ['clock', 'target', 'memo'], SCAN = 0.7;
    var COLORS = { clock: [142, 160, 255], target: [255, 138, 132], memo: [47, 210, 127] };
    var tint = COLORS.clock;
    // what the panel prints for each outcome (a sample run: the same 14 findings the hero demo shows)
    var READ = [
      [['upload', 'done'], ['parse', '15 sections'], ['detect', '14 findings · 4 critical', 'bad'], ['elapsed', 'a few minutes', 'ok']],
      [['written for', 'the Buyer'], ['against you', '9', 'bad'], ['in your favour', '3', 'ok'], ['cuts both ways', '2']],
      [['memo.pdf', 'ready', 'ok'], ['memo.docx', 'ready', 'ok'], ['findings cited', '14 of 14', 'ok'], ['redlines', 'included']]
    ];

    // signs are drawn on a 24-unit grid at one pixel per dot, so the browser's anti-aliasing becomes dot brightness.
    // The matrix is fine (about 36 dots across a sign), which is what makes a sign read as an instrument, not a toy
    function drawIcon(name, cells) {
      var c = document.createElement('canvas'); c.width = cells; c.height = cells;
      var g = c.getContext('2d'), s = cells / 24;
      g.scale(s, s); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
      if (name === 'clock') {
        g.lineWidth = 2.3; g.beginPath(); g.arc(12, 12, 9.2, 0, 6.2832); g.stroke();
        // two thin hands and no hub: at this resolution a hub turns the middle of the dial into a blob
        g.lineWidth = 1.8; g.beginPath(); g.moveTo(12, 12); g.lineTo(12 + Math.sin(hand) * 6.8, 12 - Math.cos(hand) * 6.8); g.stroke();
        g.beginPath(); g.moveTo(12, 12); g.lineTo(12 + Math.sin(hand / 12 + 2.2) * 4.2, 12 - Math.cos(hand / 12 + 2.2) * 4.2); g.stroke();
      } else if (name === 'target') {
        g.lineWidth = 2.1; g.beginPath(); g.arc(12, 12, 9.2, 0, 6.2832); g.stroke();
        g.beginPath(); g.arc(12, 12, 4.7, 0, 6.2832); g.stroke();
        g.beginPath(); g.arc(12, 12, 1.5, 0, 6.2832); g.fill();
        g.lineWidth = 1.9; [[12, 0.6, 12, 3.4], [12, 20.6, 12, 23.4], [0.6, 12, 3.4, 12], [20.6, 12, 23.4, 12]].forEach(function (l) { g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke(); });
      } else if (name === 'memo') {
        g.lineWidth = 2.2; g.beginPath(); g.moveTo(5.4, 2.6); g.lineTo(14.6, 2.6); g.lineTo(18.6, 6.6); g.lineTo(18.6, 21.4); g.lineTo(5.4, 21.4); g.closePath(); g.stroke();
        g.lineWidth = 1.9; g.beginPath(); g.moveTo(9, 8.4); g.lineTo(13, 8.4); g.moveTo(9, 11.8); g.lineTo(15, 11.8); g.stroke();
        g.lineWidth = 2.2; g.beginPath(); g.moveTo(8.8, 16.2); g.lineTo(11, 18.4); g.lineTo(15.4, 13.9); g.stroke();
      }
      return c.getContext('2d').getImageData(0, 0, cells, cells).data;
    }
    function resize() {
      var r = vault.getBoundingClientRect(), sr = space.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height; gap = w < 700 ? 8 : 10;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / gap) + 1; rows = Math.ceil(h / gap) + 1;
      var size = Math.min(sr.width, sr.height) * (w < 700 ? 0.9 : 0.86);
      icon.cells = Math.max(20, Math.round(size / gap));
      icon.x = Math.round(((sr.left - r.left) + sr.width / 2 - icon.cells * gap / 2) / gap);
      icon.y = Math.round(((sr.top - r.top) + sr.height / 2 - icon.cells * gap / 2) / gap);
      dots = [];
      for (var j = 0; j < icon.cells; j++) for (var i = 0; i < icon.cells; i++) dots.push({ i: i, j: j, v: 0, to: 0, at: 0 });
      if (current >= 0) target(SIGNS[current], true);
    }
    // retarget every dot. A new sign is written by a scan line that runs down the display, the way a panel refreshes;
    // `quick` is the clock's tick: the hand moves without a new scan
    function target(name, instant, quick) {
      var data = drawIcon(name, icon.cells);
      tint = COLORS[name];
      if (!instant && !quick && !reduced) scanAt = t;
      dots.forEach(function (d) {
        var a = data[(d.j * icon.cells + d.i) * 4 + 3] / 255;
        var to = a <= 0.2 ? 0 : a >= 0.8 ? 1 : (a - 0.2) / 0.6; // a little contrast: edges stay soft, faces go solid
        if (instant || reduced) { d.v = d.to = to; return; }
        d.to = to; d.at = quick ? t : t + (d.j / icon.cells) * SCAN;
      });
    }
    function draw(now) {
      // real time, not frames: a slow machine gets the same motion in fewer steps
      var dt = Math.min(0.1, lastNow && now ? (now - lastNow) / 1000 : 0.016); lastNow = now || 0;
      var ease = 1 - Math.exp(-dt * 9);
      t += dt;
      mouse.vx *= Math.exp(-dt * 6); mouse.vy *= Math.exp(-dt * 6);
      ctx.clearRect(0, 0, w, h);
      var cx = (icon.x + icon.cells / 2) * gap, cy = (icon.y + icon.cells / 2) * gap;
      var ring = (t * 120) % (Math.max(w, h) * 0.9);
      // the pointer leaves a wake: dots near it are dragged along its motion and spring back. They never grow
      // (growing dots under the pointer read as a magnifying glass)
      function wake(x, y) { var f = Math.exp(-((x - mouse.x) * (x - mouse.x) + (y - mouse.y) * (y - mouse.y)) / 9000); return f < 0.01 ? 0 : f; }
      // the field around the sign: thousands of faint dots, drawn as small squares in a few brightness bands
      // (one fill colour per band instead of one per dot)
      var bands = [[], [], [], [], []], i, j;
      for (i = 0; i < cols; i++) {
        for (j = 0; j < rows; j++) {
          var ii = i - icon.x, jj = j - icon.y;
          if (ii >= 0 && jj >= 0 && ii < icon.cells && jj < icon.cells) continue;
          var x = i * gap + gap / 2, y = j * gap + gap / 2;
          var wave = Math.exp(-Math.pow((Math.hypot(x - cx, y - cy) - ring) / 80, 2));
          var f = mouse.x > -1e3 ? wake(x, y) : 0;
          var level = Math.min(4, Math.floor((wave * 0.8 + f * 0.5) * 5));
          bands[level].push(x + mouse.vx * f * 0.55, y + mouse.vy * f * 0.55);
        }
      }
      for (var b = 0; b < 5; b++) {
        var list = bands[b]; if (!list.length) continue;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.06 + b * 0.055).toFixed(3) + ')';
        var sz = b > 1 ? 2 : 1.6;
        for (var q = 0; q < list.length; q += 2) ctx.fillRect(list[q] - sz / 2, list[q + 1] - sz / 2, sz, sz);
      }
      // the sign: lit dots carry the colour, a faint halo gives them the glow of a real display,
      // and the row the scan line is writing flashes white as it passes
      var scanRow = (t - scanAt) / SCAN * icon.cells;
      for (var k = 0; k < dots.length; k++) {
        var d = dots[k];
        if (t >= d.at) d.v += (d.to - d.v) * ease;
        var px = (icon.x + d.i) * gap + gap / 2, py = (icon.y + d.j) * gap + gap / 2;
        var fw = mouse.x > -1e3 ? wake(px, py) : 0;
        px += mouse.vx * fw * 0.55; py += mouse.vy * fw * 0.55;
        var near = Math.abs(d.j - scanRow), flash = near < 1.6 && scanRow < icon.cells + 2 ? (1 - near / 1.6) : 0;
        var v = Math.max(0, Math.min(1, d.v));
        if (v < 0.02 && flash < 0.05) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(px - 0.8, py - 0.8, 1.6, 1.6); continue; }
        var mixw = Math.min(1, flash * 0.85), cr = Math.round(tint[0] + (255 - tint[0]) * mixw), cg = Math.round(tint[1] + (255 - tint[1]) * mixw), cb = Math.round(tint[2] + (255 - tint[2]) * mixw);
        var lum = Math.max(v, flash * 0.5);
        if (lum > 0.5) { ctx.beginPath(); ctx.arc(px, py, gap * 0.62, 0, 6.283); ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.09 * lum).toFixed(3) + ')'; ctx.fill(); }
        ctx.beginPath(); ctx.arc(px, py, 0.7 + lum * (gap * 0.27), 0, 6.283);
        ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.1 + lum * 0.88).toFixed(3) + ')';
        ctx.fill();
      }
      if (on && !reduced) raf = requestAnimationFrame(draw);
    }

    function say(lines) {
      steps.forEach(clearTimeout); steps = [];
      readout.textContent = '';
      lines.forEach(function (l, i) {
        steps.push(setTimeout(function () {
          var d = document.createElement('div'); if (l[2]) d.className = l[2];
          d.appendChild(document.createTextNode(l[0] + ' · ')); var b = document.createElement('b'); b.textContent = l[1]; d.appendChild(b);
          readout.appendChild(d);
        }, reduced ? 0 : 350 + i * 520));
      });
    }
    function select(i) {
      if (i === current) return;
      current = i;
      ctls.forEach(function (c, j) { c.classList.toggle('is-active', j === i); c.setAttribute('aria-pressed', String(j === i)); });
      clearInterval(tick);
      target(SIGNS[i]);
      say(READ[i]);
      // "minutes, not days": the clock's hand keeps sweeping while its row is selected
      if (i === 0 && !reduced) tick = setInterval(function () { if (!on || current !== 0) return; hand += 0.5236; target('clock', false, true); }, 420);
    }
    function schedule() {
      clearTimeout(timer);
      vault.classList.remove('is-auto');
      if (!auto) return;
      void vault.offsetWidth; vault.classList.add('is-auto');
      timer = setTimeout(function () { select((current + 1) % 3); schedule(); }, 5200);
    }
    ctls.forEach(function (c, i) { c.addEventListener('click', function () { auto = false; clearTimeout(timer); vault.classList.remove('is-auto'); select(i); }); });
    if (fine) {
      vault.addEventListener('mousemove', function (e) {
        var r = vault.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        if (mouse.lx !== null) { mouse.vx += ((x - mouse.lx) * 1.4 - mouse.vx) * 0.35; mouse.vy += ((y - mouse.ly) * 1.4 - mouse.vy) * 0.35; }
        var m = Math.hypot(mouse.vx, mouse.vy); if (m > 26) { mouse.vx *= 26 / m; mouse.vy *= 26 / m; }
        mouse.lx = x; mouse.ly = y; mouse.x = x; mouse.y = y;
      });
      vault.addEventListener('mouseleave', function () { mouse.x = -1e4; mouse.y = -1e4; mouse.lx = null; });
    }
    resize();
    window.addEventListener('resize', function () { resize(); if (!on) draw(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          on = e.isIntersecting;
          if (on) { if (current < 0) select(0); schedule(); if (!raf) raf = requestAnimationFrame(draw); }
          else { clearTimeout(timer); vault.classList.remove('is-auto'); if (raf) { cancelAnimationFrame(raf); raf = null; } }
        });
      }, { threshold: 0.25 }).observe(vault);
    } else { on = true; select(0); draw(); }
    draw();
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
    // the screen grows into place as it comes up the page
    if (anim) gsap.fromTo('#filmScreen', { scale: 0.86, opacity: 0.4, y: 40 }, { scale: 1, opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '#filmScreen', start: 'top 98%', end: 'top 38%', scrub: 0.6 } });
  }

  /* ---------- faq: a deck. Drag it, swipe it, use the arrows or the keyboard ---------- */
  function setupDeck() {
    var deck = $('#deck');
    if (!deck) return;
    var cards = $$('.qa', deck), prev = $('#deckPrev'), next = $('#deckNext'), bar = $('#deckBar');
    var nowEls = [$('#deckNow'), $('#deckNowM')], n = cards.length, ticking = false;
    function edge() { return parseFloat(window.getComputedStyle(deck).paddingLeft) || 0; }
    function maxLeft() { return Math.max(0, deck.scrollWidth - deck.clientWidth); }
    // where the deck can actually rest: each card at the left gutter, capped at the end of the scroll
    // (the last few cards share that final position, which is why stepping by card index got stuck there)
    function stops() {
      var e = edge(), m = maxLeft(), half = cards[0].offsetWidth * 0.5, out = [];
      // a card position that lands within half a card of the end is dropped: that step would barely move the deck
      cards.forEach(function (c) { var x = Math.max(0, c.offsetLeft - e); if (x < m - half) out.push(x); });
      out.push(m);
      return out;
    }
    function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }
    function update() {
      ticking = false;
      var left = deck.scrollLeft, right = left + deck.clientWidth, first = -1, last = -1;
      cards.forEach(function (c, i) {
        var a = c.offsetLeft, z = a + c.offsetWidth;
        var seen = Math.max(0, Math.min(z, right) - Math.max(a, left)) / Math.max(1, c.offsetWidth);
        c.style.setProperty('--f', Math.min(1, seen).toFixed(3)); // a card is lit by how much of it is on screen
        if (seen > 0.92) { if (first < 0) first = i; last = i; }
      });
      if (first < 0) { first = last = Math.max(0, Math.min(n - 1, Math.round((left) / Math.max(1, cards[0].offsetWidth)))); }
      var label = first === last ? pad(first) : pad(first) + '–' + pad(last);
      nowEls.forEach(function (el) { if (el) el.textContent = label; });
      if (bar) bar.style.width = ((last + 1) / n * 100).toFixed(1) + '%';
      if (prev) prev.disabled = left < 4;
      if (next) next.disabled = left >= maxLeft() - 4;
    }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    // while a step is still gliding, the next click counts from where that step is going, not from where the
    // deck happens to be (otherwise a quick second click just re-aims at the same stop)
    var aim = null, aimAt = 0;
    function go(x) { aim = x; aimAt = performance.now(); deck.scrollTo({ left: x, behavior: reduced ? 'auto' : 'smooth' }); }
    function step(dir) {
      var st = stops(), left = aim !== null && performance.now() - aimAt < 1200 ? aim : deck.scrollLeft, i;
      if (dir > 0) { for (i = 0; i < st.length; i++) if (st[i] > left + 4) { go(st[i]); return; } go(st[st.length - 1]); }
      else { for (i = st.length - 1; i >= 0; i--) if (st[i] < left - 4) { go(st[i]); return; } go(0); }
    }
    deck.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    // a sideways trackpad gesture belongs to the deck, not to the smooth scroller
    deck.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { aim = null; e.stopPropagation(); } }, { passive: true });
    // mouse drag (touch scrolls natively)
    var down = false, x0 = 0, left0 = 0, dragged = false, v = 0, lastX = 0, lastT = 0;
    deck.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; dragged = false; x0 = lastX = e.clientX; left0 = deck.scrollLeft; lastT = performance.now(); v = 0; aim = null;
    });
    deck.addEventListener('touchstart', function () { aim = null; }, { passive: true });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (!dragged && Math.abs(dx) > 5) { dragged = true; deck.classList.add('is-dragging'); }
      if (!dragged) return;
      deck.scrollLeft = left0 - dx;
      var now = performance.now(); v = (e.clientX - lastX) / Math.max(1, now - lastT); lastX = e.clientX; lastT = now;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (!dragged) return;
      deck.classList.remove('is-dragging');
      // a flick carries on in its direction; otherwise settle on the nearest resting place
      if (Math.abs(v) > 0.45) step(v < 0 ? 1 : -1);
      else { var st = stops(), left = deck.scrollLeft, best = 0; st.forEach(function (x) { if (Math.abs(x - left) < Math.abs(best - left)) best = x; }); go(best); }
      setTimeout(function () { dragged = false; }, 50);
    });
    deck.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);
    update();
  }

  /* ---------- book a call: the Cal.com inline embed, loaded only once the block is near the viewport ---------- */
  function setupCal() {
    var box = $('#calInline');
    if (!box) return;
    var skel = $('#calSkel'), fallback = $('#calFallback');
    var started = false;
    function fail() { if (skel) skel.hidden = true; if (fallback) fallback.hidden = false; }
    function start() {
      if (started) return;
      started = true;
      // Cal's loader, as documented; the first call injects embed.js and queues the rest
      (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; var s = d.createElement('script'); s.src = A; s.onerror = fail; d.head.appendChild(s); cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      window.Cal('init', 'demo', { origin: 'https://app.cal.com' });
      window.Cal.config = window.Cal.config || {};
      window.Cal.config.forwardQueryParams = true;
      window.Cal.ns.demo('inline', { elementOrSelector: '#calInline', config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', theme: 'dark' }, calLink: 'sentinel-ai/demo' });
      window.Cal.ns.demo('ui', { theme: 'dark', hideEventTypeDetails: false, layout: 'month_view', styles: { branding: { brandColor: '#4d6bff' } } });
      window.Cal.ns.demo('on', { action: 'linkReady', callback: function () { box.classList.add('is-ready'); } });
      window.Cal.ns.demo('on', { action: 'linkFailed', callback: fail });
      // belt and braces: the iframe arriving is enough to drop the skeleton
      new MutationObserver(function () { if (box.querySelector('iframe')) box.classList.add('is-ready'); }).observe(box, { childList: true, subtree: true });
      setTimeout(function () { if (!box.querySelector('iframe')) fail(); }, 15000);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) start(); }); }, { rootMargin: '600px 0px' }).observe(box);
    } else start();
  }

  /* ---------- small things: buttons lean toward the pointer, cards carry a light that follows it ---------- */
  function setupMagnetic() {
    if (!anim || !fine) return;
    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }), yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('mousemove', function (e) { var r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.28); yTo((e.clientY - r.top - r.height / 2) * 0.4); });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
  }
  function setupSpotlight() {
    if (!fine) return;
    $$('.pillar, .qa').forEach(function (el) {
      el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    });
  }

  /* ---------- the rest of the life in the page: the header drops in, cards lean toward the pointer ---------- */
  function setupExtras() {
    if (!anim) return;
    gsap.from('.header-inner > *', { y: -14, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06, delay: 0.1, clearProps: 'transform,opacity' });
    if (!fine) return;
    // pillars lean toward the pointer (set up on first hover, after their reveal has finished)
    $$('.pillar').forEach(function (el) {
      var rx = null, ry = null;
      el.addEventListener('pointerenter', function () {
        if (rx || !el.classList.contains('in')) return;
        el.style.transition = 'border-color 0.3s';
        gsap.set(el, { transformPerspective: 1000 });
        rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3.out' }); ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3.out' });
      });
      el.addEventListener('pointermove', function (e) {
        if (!rx) return;
        var r = el.getBoundingClientRect();
        rx(-((e.clientY - r.top) / r.height - 0.5) * 5); ry(((e.clientX - r.left) / r.width - 0.5) * 6);
      });
      el.addEventListener('pointerleave', function () { if (rx) { rx(0); ry(0); } });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();

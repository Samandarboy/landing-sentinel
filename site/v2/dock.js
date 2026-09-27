/* The floating dock (SNT-98): the site's nav, on every page.
   Text pills with the motion of a macOS dock (after Aceternity's FloatingDock): as the pointer moves along the
   bar, the pill under it grows, its neighbours grow a little less and step aside, each on its own spring.
   Also here: the dock firms up once the page scrolls, the phone menu opens and closes, and on the home page
   the pill of the section you are reading is marked. No dependencies. */
(function () {
  'use strict';
  var dock = document.getElementById('header');
  if (!dock || !dock.classList.contains('dock')) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- scrolled: a firmer glass once the page moves ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; dock.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset) > 8); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- the phone menu ---------- */
  var burger = document.getElementById('burger'), menu = document.getElementById('mobileMenu');
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('is-open') && !menu.contains(e.target) && !burger.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- the section you are in (home page: links are #anchors) ---------- */
  var nav = document.getElementById('dockNav');
  var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
  var local = links.filter(function (l) { return (l.getAttribute('href') || '').charAt(0) === '#'; });
  if (local.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        local.forEach(function (l) { l.classList.toggle('is-current', l.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    local.forEach(function (l) { var s = document.getElementById(l.getAttribute('href').slice(1)); if (s) io.observe(s); });
  }

  /* ---------- magnify-and-shift ---------- */
  if (!nav || !links.length || reduced || !fine) return;
  var MAX = 1.28;        // the pill right under the pointer
  var REACH = 150;       // px: how far along the bar the swell reaches
  var K = 320, C = 24;   // spring stiffness and damping (a quick, barely-bouncing settle)
  var items = links.map(function (a) { return { a: a, s: 1, v: 0, t: 1, c: 0, w: 0 }; });
  var px = null, raf = 0, last = 0;

  // each pill's rest width (its box never scales: only its label and backdrop do, and its margins make room)
  function measure() {
    items.forEach(function (it) {
      var w = it.a.offsetWidth;
      if (w && Math.abs(w - it.w) > 0.5) { it.w = w; it.a.style.setProperty('--w', w + 'px'); }
    });
  }
  // distance from the pointer to each pill's live centre, as the dock does: a pill that steps aside
  // moves away from the pointer, which is what lets the swell settle instead of chasing it
  function targets() {
    items.forEach(function (it) {
      if (px === null) { it.t = 1; return; }
      var r = it.a.getBoundingClientRect();
      var d = Math.abs(px - (r.left + r.width / 2)) / REACH;
      it.t = d >= 1 ? 1 : 1 + (MAX - 1) * (0.5 + 0.5 * Math.cos(Math.PI * d));
    });
  }
  function step(now) {
    var dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    var moving = false;
    items.forEach(function (it) {
      var f = -K * (it.s - it.t) - C * it.v;
      it.v += f * dt; it.s += it.v * dt;
      if (Math.abs(it.s - it.t) > 0.0005 || Math.abs(it.v) > 0.001) moving = true;
      else { it.s = it.t; it.v = 0; }
      it.a.style.setProperty('--s', it.s.toFixed(4));
    });
    raf = moving ? requestAnimationFrame(step) : 0;
  }
  function kick() { targets(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }

  nav.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; measure(); px = e.clientX; kick(); });
  nav.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; px = e.clientX; kick(); });
  nav.addEventListener('pointerleave', function () { px = null; kick(); });
  // fonts arriving or a resize change the rest widths
  window.addEventListener('resize', function () { if (px === null) measure(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
})();

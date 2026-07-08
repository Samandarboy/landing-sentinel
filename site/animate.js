// Sentinel landing — scroll-reveal + hover tagging (vanilla, no deps).
// Tags page elements with .rv / anim-* classes (styled by
// /landing/animations.css) and reveals them with an IntersectionObserver.
// The HTML itself stays untouched, so this works on the minified mirror.
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return; // CSS shows everything statically

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  // tag(el, delaySeconds, variant?)
  var tagged = [];
  function tag(el, delay, variant) {
    if (!el || el.classList.contains('rv')) return;
    el.classList.add('rv');
    if (variant) el.classList.add(variant);
    if (delay) el.style.setProperty('--rvd', delay.toFixed(2) + 's');
    tagged.push(el);
  }
  function stagger(els, base, step, variant) {
    els.forEach(function (el, i) { tag(el, (base || 0) + i * (step == null ? 0.1 : step), variant); });
  }

  function setup() {
    var sections = $$('section');
    var hero = sections[0];

    /* hero: headline -> subtitle -> CTA cascade on load */
    if (hero) {
      tag($('h1', hero), 0.05);
      stagger($$('h1 ~ p, h1 + p', hero).slice(0, 2), 0.2, 0.12);
      var heroBtns = $$('a, button', hero).filter(function (b) { return /Book a demo|Try/i.test(b.textContent); });
      stagger(heroBtns, 0.4, 0.1);
    }

    /* claims marquee strip */
    tag($('.cb-mask'), 0.15);

    /* features: heading, then the three buttons cascade, media panel slides in */
    var features = $('#features');
    if (features) {
      tag($('h2', features), 0);
      stagger($$('.feat-btn', features), 0.12, 0.14, 'rv-left');
      var media = $('.feat-panel', features);
      if (media && media.parentElement) tag(media.parentElement, 0.25, 'rv-scale');
    }

    /* why: heading + 4 cards cascade; cards also get hover zoom */
    var why = $('#why-sentinel');
    if (why) {
      tag($('h2', why), 0);
      tag($('h2 + p, p', why), 0.12);
      var cols = $$('.flex.items-start > div', why);
      cols.forEach(function (c) { c.classList.add('anim-card'); });
      stagger(cols, 0.1, 0.13);
    }

    /* versus: head, then the two sides from opposite directions */
    var versus = $('#versus');
    if (versus) {
      tag($('.vs-head', versus), 0);
      tag($('.vs-others', versus), 0.15, 'rv-left');
      tag($('.vs-sentinel', versus), 0.28, 'rv-right');
    }

    /* pricing: heading, billing toggle, three tier cards cascade + hover lift */
    var pricing = $('#pricing');
    if (pricing) {
      tag($('h2', pricing), 0);
      var toggle = $('#bill-monthly');
      if (toggle) tag(toggle.parentElement.parentElement, 0.12);
      var tiers = $$('.relative.grid > div', pricing);
      tiers.forEach(function (t) { t.classList.add('anim-tier'); });
      stagger(tiers, 0.15, 0.13, 'rv-scale');
    }

    /* demo form */
    var demo = $('#demo');
    if (demo) {
      tag($('.sf-head', demo), 0);
      tag($('.sf-card', demo), 0.18, 'rv-scale');
    }

    /* footer: brand block + link columns */
    var footer = $('footer');
    if (footer) {
      var blocks = $$('footer > div > div, footer .flex.flex-col');
      stagger(blocks.slice(0, 6), 0, 0.08);
      $$('a', footer).forEach(function (a) { a.classList.add('anim-link'); });
    }

    /* nav links + CTA buttons everywhere */
    $$('nav a').forEach(function (a) {
      if (/demo/i.test(a.textContent)) a.classList.add('anim-btn');
      else a.classList.add('anim-link');
    });
    $$('#pricing a, #pricing button, .sf-btn, .vs-link').forEach(function (b) {
      if (!b.id || b.id.indexOf('bill-') !== 0) b.classList.add('anim-btn');
    });

    /* reveal on intersection; hand transform control back after settle */
    function reveal(el) {
      if (el.classList.contains('rv-in')) return;
      el.classList.add('rv-in');
      var settle = 800 + parseFloat(el.style.getPropertyValue('--rvd') || 0) * 1000;
      setTimeout(function () { el.classList.add('rv-done'); }, settle);
    }
    var ioFired = false;
    var io = new IntersectionObserver(function (entries) {
      ioFired = true;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        reveal(e.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -14% 0px' });
    tagged.forEach(function (el) { io.observe(el); });

    /* safety net: if the observer never delivers (ancient browser, broken
       env), show everything rather than leave the page blank */
    setTimeout(function () {
      if (!ioFired) tagged.forEach(reveal);
    }, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();

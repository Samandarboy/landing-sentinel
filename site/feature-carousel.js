// Key Features auto-advancing carousel (vanilla, no deps).
// The media panels are live animated demos of the Sentinel interface
// (feature-demos.js), not videos. The active button fills a progress bar
// over the demo's choreographed duration, then advances and crossfades
// to the next panel. Click a button to jump.
(function () {
  function init() {
    var root = document.getElementById('features');
    if (!root) return;
    var btns = [].slice.call(root.querySelectorAll('.feat-btn'));
    var panels = [].slice.call(root.querySelectorAll('.feat-panel'));
    if (!btns.length || btns.length !== panels.length) return;
    var fills = btns.map(function (b) { return b.querySelector('.feat-bar-fill'); });
    var durs = panels.map(function (p) {
      var d = parseInt(p.getAttribute('data-duration'), 10);
      return isFinite(d) && d > 0 ? d : 11000;
    });
    var n = btns.length, cur = -1, raf = null;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function progress(i, start) {
      function tick(now) {
        var t = (now - start) / durs[i];
        if (t > 1) t = 1;
        if (fills[i]) fills[i].style.width = (t * 100).toFixed(2) + '%';
        if (t >= 1) { advance(); return; }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }

    function advance() { setActive((cur + 1) % n); }

    function setActive(i) {
      if (i === cur) return;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      cur = i;
      btns.forEach(function (b, j) {
        b.classList.toggle('is-active', j === i);
        if (fills[j]) fills[j].style.width = '0%';
      });
      panels.forEach(function (p, j) {
        p.style.opacity = j === i ? '1' : '0';
        if (window.SentinelDemos) {
          if (j === i) window.SentinelDemos.play(p);
          else window.SentinelDemos.stop(p);
        }
      });
      progress(i, performance.now());
    }

    btns.forEach(function (b, j) { b.addEventListener('click', function () { setActive(j); }); });

    // Start once visible (so the choreography isn't wasted off-screen).
    // Under reduced motion the demos render their final frame; the carousel
    // still rotates so all three features remain reachable.
    // Start only when the demo panel is genuinely on screen — never early,
    // so the viewer always sees demo 01 from its first frame.
    var started = false;
    var media = panels[0] && panels[0].parentElement ? panels[0].parentElement : root;
    function start() {
      if (started) return;
      started = true;
      window.removeEventListener('scroll', rectCheck);
      window.removeEventListener('resize', rectCheck);
      setActive(0);
    }
    function inView() {
      var r = media.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      // at least ~40% of the panel inside the viewport
      var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      return r.height > 0 && visible / r.height >= 0.4;
    }
    function rectCheck() { if (!started && inView()) start(); }
    if (reduced) { start(); return; }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { start(); io.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(media);
    }
    // fallback for environments where the observer never delivers:
    // same visibility rule, checked on scroll/resize + once now
    window.addEventListener('scroll', rectCheck, { passive: true });
    window.addEventListener('resize', rectCheck);
    rectCheck();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

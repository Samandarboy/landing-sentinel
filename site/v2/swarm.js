// Sentinel landing v2 — the swarm.
// One fixed WebGL layer (three.js) behind the page. Two populations share it:
//   dust   — a sparse, slowly drifting field that is always there;
//   shapes — points that stay dark until the page asks for a figure (a contract page beside the statement,
//            a question mark at the FAQ, the wordmark in the footer), then assemble it and let it go again.
// Figures are built like print, not like sand: points sit on a regular lattice, one per cell, and an edge cell
// gets a smaller dot in proportion to how much of it the figure covers (a halftone), so contours stay clean.
// A figure is lit from the top left, assembles in a sweep (a page prints top to bottom, a word left to right),
// each point rising a short way into place, and holds still once it is there.
// v2.js loads three.js and then calls create().
(function () {
  'use strict';

  var VERT = [
    'uniform float uTime, uCompile, uDpr, uScroll, uSize, uShape, uGrain, uRise;',
    'uniform vec2 uRes, uAnchor, uMouse, uMouseV;',
    'attribute vec2 aTarget;',
    'attribute vec4 aSeed;',   // x: dust or shape, y/w: scatter, z: depth
    'attribute vec4 aMeta;',   // x: part of the current figure, y: shade (lighting), z: dot scale (coverage), w: order in the sweep
    'attribute float aTint;',
    'varying float vAlpha;',
    'varying float vTint;',
    'vec2 flow(vec2 p, float t, float s) {',
    '  return vec2(sin(p.y * 0.0061 + t * 0.35 + s * 6.283), cos(p.x * 0.0053 - t * 0.31 + s * 4.1));',
    '}',
    'void main() {',
    '  float depth = aSeed.z;',
    '  float dust = step(aSeed.x, 0.11);',
    // dust: a slot in a field a little larger than the viewport, drifting upward, slower than the page (parallax), wrapped
    '  vec2 field = uRes + 240.0;',
    '  vec2 home = position.xy * field - 120.0;',
    '  home.y = mod(home.y - uScroll * (0.06 + depth * 0.30) - uTime * (3.0 + 9.0 * depth), field.y) - 120.0;',
    '  home += flow(home, uTime, aSeed.w) * (12.0 + 30.0 * depth);',
    '  float tw = 0.7 + 0.3 * sin(uTime * (0.6 + aSeed.y * 1.6) + aSeed.w * 6.283);',
    // figure: progress runs through the figure as a sweep, each point easing the last stretch of its way
    '  float c = clamp(uCompile * 1.7 - aMeta.w * 0.7, 0.0, 1.0);',
    '  c = c * c * c * (c * (c * 6.0 - 15.0) + 10.0);',
    '  vec2 tgt = uAnchor + aTarget;',
    '  vec2 from = tgt + vec2((aSeed.y - 0.5) * 0.5, 0.55 + aSeed.w * 0.45) * uRise;',
    '  vec2 shape = mix(from, tgt, c) + flow(tgt * 1.3, uTime * 0.8, aSeed.w) * 0.3;',
    '  vec2 p = mix(shape, home, dust);',
    // the pointer stirs them: particles are dragged along its motion with a sideways wobble, and settle when it rests.
    // (No radial push: that bulged the field like a magnifying glass.)
    '  vec2 d = p - uMouse;',
    '  float f = exp(-dot(d, d) / 13000.0);',
    '  float sp = length(uMouseV);',
    '  vec2 dir = sp > 0.001 ? uMouseV / sp : vec2(0.0);',
    '  float wob = sin(aSeed.w * 6.283 + uTime * 5.0);',
    '  p += (dir * 0.8 + vec2(-dir.y, dir.x) * wob * 0.6) * f * min(sp, 60.0) * (0.5 + 0.9 * aSeed.y);',
    '  vec2 clip = (p / uRes) * 2.0 - 1.0;',
    '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
    '  float aDust = (0.07 + 0.30 * depth) * tw;',
    '  float aShape = aMeta.x * aMeta.y * uShape * smoothstep(0.0, 0.6, c);',
    '  vAlpha = mix(aShape, aDust, dust);',
    '  float sDust = 1.0 + depth * 1.7;',
    '  float sShape = uGrain * aMeta.z * mix(0.55, 1.0, c);',
    '  gl_PointSize = mix(sShape, sDust, dust) * uDpr * uSize;',
    '  vTint = aTint * (1.0 - dust);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform vec3 uCol0, uCol1, uCol2;',
    'uniform float uAlpha;',
    'varying float vAlpha;',
    'varying float vTint;',
    'void main() {',
    '  float r = length(gl_PointCoord - 0.5);',
    '  float a = smoothstep(0.5, 0.36, r);',   // a crisp disc with a thin soft rim
    '  vec3 col = vTint > 1.5 ? uCol2 : (vTint > 0.5 ? uCol1 : uCol0);',
    '  gl_FragColor = vec4(col, a * vAlpha * uAlpha);',
    '}'
  ].join('\n');

  function rand(seed) { // small deterministic PRNG so a rebuild on resize keeps the same figure
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // light from the top left: a figure is a little brighter there and falls off toward the bottom right
  function lit(x, y, w, h) { return 0.62 + 0.38 * (1 - (0.6 * x / w + 0.4 * y / h)); }

  /* ---------- figures. Each returns a list of points: [x, y, tint, shade, scale, order] ---------- */
  var FIGURE = {
    // A contract page, set like a real one: a folded corner, a title and a rule, numbered paragraphs whose lines
    // break into words, two flagged lines with their margin marks, signature lines and a seal. Every point sits
    // on one lattice, so the page reads as print. It assembles from the top down.
    doc: function (w, h, o, rnd) {
      var ph = h, pw = ph * 0.76; if (pw > w) { pw = w; ph = pw / 0.76; }
      var s = Math.max(3.2, Math.min(5.6, pw / 62)), cols = Math.floor(pw / s), rows = Math.floor(ph / s);
      var x0 = (w - cols * s) / 2, y0 = (h - rows * s) / 2, pts = [], fold = 8;
      function put(i, j, tint, dim, scale) { var x = x0 + i * s, y = y0 + j * s; pts.push([x, y, tint || 0, lit(x, y, w, h) * (dim || 1), scale || 1, (j / rows) * 0.94 + rnd() * 0.06]); }
      var i, j;
      // outline with the top-right corner folded
      for (i = 0; i <= cols - fold; i++) put(i, 0, 0, 0.9);
      for (i = 1; i < fold; i++) put(cols - fold + i, i, 0, 0.9);
      for (j = fold; j <= rows; j++) put(cols, j, 0, 0.9);
      for (i = 0; i < cols; i++) put(i, rows, 0, 0.9);
      for (j = 1; j < rows; j++) put(0, j, 0, 0.9);
      for (j = 1; j < fold; j++) put(cols - fold, j, 0, 0.55);
      for (i = 1; i < fold; i++) put(cols - fold + i, fold, 0, 0.55);
      // title (two rows, cobalt) and the rule under it
      var m = 8, right = cols - m;
      for (i = m; i < m + Math.round((right - m) * 0.46); i++) { put(i, 7, 2, 1, 1.12); put(i, 8, 2, 1, 1.12); }
      for (i = m; i <= right; i++) put(i, 11, 0, 0.42, 0.8);
      // paragraphs: lines two rows apart, words of 3 to 8 points with a gap between them, the last line short
      var y = 15, para = 0, flagged = { 1: 1, 3: 2 }, last = rows - 17;
      while (y < last) {
        var lines = 3 + Math.floor(rnd() * 2);
        put(m - 3, y, 0, 0.6, 0.85); if (para > 8) put(m - 4, y, 0, 0.6, 0.85); // the paragraph number
        for (var l = 0; l < lines && y < last; l++, y += 2) {
          var hot = flagged[para] === l + 1, end = l === lines - 1 ? m + Math.round((right - m) * (0.35 + rnd() * 0.35)) : right;
          if (hot) { put(m - 2, y, 1, 1, 1.1); put(m - 2, y - 1, 1, 1, 1.1); }
          i = m;
          while (i <= end) {
            var word = 3 + Math.floor(rnd() * 6);
            for (var k = 0; k < word && i <= end; k++, i++) put(i, y, hot ? 1 : 0, hot ? 1 : 0.86, hot ? 1.06 : 0.94);
            i++; // the space between words
          }
        }
        y += 2; para++;
      }
      // signatures and a seal
      var sy = rows - 9;
      for (i = m; i < m + 14; i++) put(i, sy, 0, 0.6, 0.85);
      for (i = right - 14; i <= right; i++) put(i, sy, 0, 0.6, 0.85);
      var cx = right - 6, cy = rows - 15, R = 4.2;
      for (var a = 0; a < 26; a++) { var t = a / 26 * 6.2832; put(Math.round((cx + Math.cos(t) * R) * 2) / 2, Math.round((cy + Math.sin(t) * R) * 2) / 2, 2, 0.95, 0.9); }
      put(cx - 1.5, cy, 2, 1); put(cx - 0.5, cy + 1, 2, 1); put(cx + 0.5, cy, 2, 1); put(cx + 1.5, cy - 1, 2, 1);
      pts.cell = s;
      return pts;
    },
    // Filled figures (a glyph, the words of a live heading) are drawn at one pixel per lattice cell, so the browser's
    // own anti-aliasing reports how much of each cell is covered; the dot in that cell is sized to match.
    glyph: function (w, h, o, rnd, budget) {
      return halftone(w, h, budget, o, function (ctx) {
        var size = h * (o.scale || 1);
        ctx.font = (o.weight || 600) + ' ' + size + 'px ' + (o.family || 'Inter, sans-serif');
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        var mt = ctx.measureText(o.char);
        ctx.fillText(o.char, w / 2, h / 2 + (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2);
      });
    },
    text: function (w, h, o, rnd, budget) {
      return halftone(w, h, budget, o, function (ctx) {
        var host = o.el.getBoundingClientRect(), cs = window.getComputedStyle(o.el);
        ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        if ('letterSpacing' in ctx && cs.letterSpacing !== 'normal') ctx.letterSpacing = cs.letterSpacing;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        var fm = ctx.measureText('Hg'), A = fm.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.93, D = fm.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.24;
        o.words.forEach(function (el) {
          var r = el.getBoundingClientRect();
          ctx.fillText(el.textContent, r.left - host.left, r.top - host.top + (r.height - (A + D)) / 2 + A);
        });
      });
    }
  };

  function halftone(w, h, budget, o, paint) {
    var pts = [], s = o.cell || 4, tries = 0, data, cw, ch;
    // the cell is as fine as the point budget allows, never finer than the figure asks for
    do {
      cw = Math.max(2, Math.ceil(w / s)); ch = Math.max(2, Math.ceil(h / s));
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      var ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.scale(1 / s, 1 / s); ctx.fillStyle = '#fff';
      paint(ctx);
      data = ctx.getImageData(0, 0, cw, ch).data;
      var lit0 = 0;
      for (var q = 3; q < data.length; q += 4) if (data[q] > 40) lit0++;
      if (lit0 <= budget) break;
      s *= Math.max(1.06, Math.sqrt(lit0 / budget));
    } while (++tries < 6);
    var sweepX = o.sweep !== 'down';
    for (var j = 0; j < ch; j++) {
      for (var i = 0; i < cw; i++) {
        var cover = data[(j * cw + i) * 4 + 3] / 255;
        if (cover < 0.16) continue;
        var x = (i + 0.5) * s, y = (j + 0.5) * s;
        pts.push([x, y, 0, lit(x, y, w, h), 0.42 + 0.58 * Math.sqrt(cover), (sweepX ? x / w : y / h) * 0.94 + ((i * 7 + j * 13) % 10) * 0.006]);
      }
    }
    pts.cell = s;
    return pts;
  }

  function create(options) {
    var THREE = (options && options.three) || window.THREE, canvas = options && options.canvas;
    if (!THREE || !canvas) return null;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    var small = window.matchMedia('(max-width: 900px)').matches;
    var N = options.count || (small ? 7000 : 16000);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    var rnd = rand(20260918);
    var home = new Float32Array(N * 3), seed = new Float32Array(N * 4), free = [];
    for (var i = 0; i < N; i++) {
      home[i * 3] = rnd(); home[i * 3 + 1] = rnd(); home[i * 3 + 2] = 0;
      seed[i * 4] = rnd(); seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = Math.pow(rnd(), 1.6); seed[i * 4 + 3] = rnd();
      if (seed[i * 4] >= 0.11) free.push(i); // everything that is not dust can be part of a figure
    }
    var geo = new THREE.BufferGeometry();
    var targetAttr = new THREE.BufferAttribute(new Float32Array(N * 2), 2);
    var metaAttr = new THREE.BufferAttribute(new Float32Array(N * 4), 4);
    var tintAttr = new THREE.BufferAttribute(new Float32Array(N), 1);
    [targetAttr, metaAttr, tintAttr].forEach(function (a) { a.setUsage(THREE.DynamicDrawUsage); });
    geo.setAttribute('position', new THREE.BufferAttribute(home, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    geo.setAttribute('aTarget', targetAttr);
    geo.setAttribute('aMeta', metaAttr);
    geo.setAttribute('aTint', tintAttr);
    var uniforms = {
      uTime: { value: 0 }, uCompile: { value: 0 }, uDpr: { value: dpr }, uScroll: { value: 0 }, uSize: { value: small ? 0.9 : 1 },
      uShape: { value: 1 }, uGrain: { value: 2 }, uRise: { value: small ? 34 : 48 }, uAlpha: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) }, uAnchor: { value: new THREE.Vector2(0, 0) },
      uMouse: { value: new THREE.Vector2(-9999, -9999) }, uMouseV: { value: new THREE.Vector2(0, 0) },
      // plain vectors, not THREE.Color: three converts a Color to linear light, and this shader writes straight to
      // the screen, so a Color came out dark and over-saturated (the cobalt went royal blue, the coral pure red)
      uCol0: { value: new THREE.Vector3(0.898, 0.918, 0.965) }, uCol1: { value: new THREE.Vector3(1.0, 0.373, 0.341) }, uCol2: { value: new THREE.Vector3(0.557, 0.627, 1.0) }
    };
    // normal blending: a lattice never overlaps, and additive light would bloom the accents into blobs
    var mat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false, blending: THREE.NormalBlending });
    var points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    var scene = new THREE.Scene(); scene.add(points);
    var camera = new THREE.Camera();

    var anchors = [], active = null, compile = 0, running = false, raf = 0, last = 0, W = 0, H = 0;
    function smooth(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }

    function size() {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H, false);
      uniforms.uRes.value.set(W, H);
    }
    function build(a) {
      var r = a.el.getBoundingClientRect();
      a.shape = null;
      if (r.width < 4 || r.height < 4) return;
      a.opts.el = a.el;
      var pts = FIGURE[a.kind](r.width, r.height, a.opts, rand(a.seed), free.length);
      if (!pts.length) return;
      if (pts.length > free.length) pts.length = free.length;
      a.shape = pts;
      // a dot fills about two thirds of its cell: large enough to be a clean disc on a 1x screen, small enough
      // that the figure stays a lattice of separate points
      a.grain = a.opts.grain || Math.max(2.4, (pts.cell || 4) * 0.7);
    }
    function load(a) {
      if (!a || !a.shape) return;
      var T = targetAttr.array, M = metaAttr.array, C = tintAttr.array, pts = a.shape, k;
      for (k = 0; k < free.length; k++) M[free[k] * 4] = 0; // nobody is in the figure...
      for (k = 0; k < pts.length; k++) {                       // ...except one point per lattice cell
        var id = free[k], p = pts[k];
        T[id * 2] = p[0]; T[id * 2 + 1] = p[1];
        M[id * 4] = 1; M[id * 4 + 1] = p[3]; M[id * 4 + 2] = p[4]; M[id * 4 + 3] = p[5];
        C[id] = p[2];
      }
      targetAttr.needsUpdate = true; metaAttr.needsUpdate = true; tintAttr.needsUpdate = true;
    }
    function add(el, kind, opts) {
      if (!el || !FIGURE[kind]) return null;
      var a = { el: el, kind: kind, opts: opts || {}, seed: 7 + anchors.length * 101, shape: null, strength: (opts && opts.strength) || 1, enabled: true };
      build(a); anchors.push(a);
      return a;
    }
    function rebuild() { anchors.forEach(function (a) { if (a.enabled) build(a); }); if (active && active.enabled) load(active); }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      uniforms.uTime.value += dt;
      uniforms.uScroll.value = window.scrollY || window.pageYOffset || 0;
      uniforms.uMouseV.value.multiplyScalar(Math.exp(-dt * 7)); // the wake dies away once the pointer rests
      var target = 0, best = null, bestN = 1e9, bestRect = null;
      for (var i = 0; i < anchors.length; i++) {
        var a = anchors[i]; if (!a.enabled || !a.shape) continue;
        var r = a.el.getBoundingClientRect(), n, want;
        if (a.opts.mode === 'inview') {
          // assembles as the anchor comes fully into view (the last thing on the page can never reach the middle)
          var vis = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0)) / Math.max(1, r.height);
          n = 1 - vis; want = smooth((vis - 0.3) / 0.6);
        } else {
          // assembles around the middle of the screen, lets go toward its edges
          n = Math.abs(r.top + r.height / 2 - H / 2) / (H / 2 + r.height / 2);
          want = 1 - smooth((n - 0.42) / 0.5);
        }
        if (n < bestN) { bestN = n; best = a; bestRect = r; target = want; }
      }
      // a new figure is only loaded once the old one has gone
      if (best !== active) {
        if (compile < 0.02 || !active) { active = best; load(active); }
        else target = 0;
      }
      compile += (target - compile) * (1 - Math.exp(-dt * (target > compile ? 2.2 : 3.2)));
      uniforms.uCompile.value = compile;
      if (active) {
        var ar = active === best && bestRect ? bestRect : active.el.getBoundingClientRect();
        uniforms.uAnchor.value.set(ar.left, ar.top);
        uniforms.uShape.value = active.strength;
        uniforms.uGrain.value = active.grain || 2;
      }
      renderer.render(scene, camera);
    }
    function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    size();
    window.addEventListener('resize', (function () { var t; return function () { size(); clearTimeout(t); t = setTimeout(rebuild, 220); }; })());
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    if (window.matchMedia('(pointer: fine)').matches) {
      var lastX = null, lastY = 0;
      window.addEventListener('pointermove', function (e) {
        if (lastX !== null) {
          var v = uniforms.uMouseV.value;
          v.x += ((e.clientX - lastX) * 1.6 - v.x) * 0.35; v.y += ((e.clientY - lastY) * 1.6 - v.y) * 0.35;
        }
        lastX = e.clientX; lastY = e.clientY;
        uniforms.uMouse.value.set(e.clientX, e.clientY);
      }, { passive: true });
      document.addEventListener('pointerleave', function () { uniforms.uMouse.value.set(-9999, -9999); });
    }
    start();

    return {
      count: N,
      uniforms: uniforms,
      add: add,
      rebuild: rebuild,
      fade: function (v) { uniforms.uAlpha.value = v; },
      state: function () { return { compile: compile, active: active ? active.kind : null, points: active && active.shape ? active.shape.length : 0, cell: active && active.shape ? active.shape.cell : 0, anchors: anchors.length, running: running }; }
    };
  }

  window.SentinelSwarm = { create: create };
})();

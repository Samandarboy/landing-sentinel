/* The particle mark (SNT-104): the logo, drawn in points, in the booking card's "Pick a time" panel.
   A scattered cloud gathers into the three blades as the card scrolls up; once formed it sways a little,
   leans toward the pointer, and a blue scan line reads down it, over faint clause lines set behind it
   like the text of a page. Plain WebGL, no libraries.

   Placement (v2.css .pmark): lower left of the panel on wide screens, beside the copy at 1024px and
   below, not at all on phones (<= 640px, checked before anything is set up).
   ?particles=off  adds nothing        ?mark=timed  gathers on a timer once in view, not with the scroll
   Reduced motion: one still frame of the formed mark. No WebGL: nothing is added. */
(function () {
  'use strict';
  var call = document.getElementById('call');
  if (!call) return;
  var qs = new URLSearchParams(location.search);
  if (qs.get('particles') === 'off') return;
  if (window.matchMedia('(max-width: 640px)').matches) return; // phones skip the whole setup
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timed = qs.get('mark') === 'timed';
  var small = window.matchMedia('(max-width: 1024px)').matches;
  var COUNT = small ? 6000 : 9000;
  var LINE_SHARE = 0.18;           // of the points: the clause lines behind the mark
  var LOGO = 'M45.99 10.61L0.76 91.88L35.45 71.76ZM50 0L55.82 72.89L50 100L44.18 72.89ZM54.01 10.61L64.55 71.76L99.24 91.88Z';

  var canvas = document.createElement('canvas');
  canvas.className = 'pmark';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) return;

  /* ---------- the points ---------- */
  function rand(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  var rnd = rand(20260927);

  // where the logo is filled: rasterise the path once and sample inside it
  var R = 320, off = document.createElement('canvas');
  off.width = off.height = R;
  var ctx = off.getContext('2d');
  ctx.scale(R / 100, R / 100);
  ctx.fill(new Path2D(LOGO));
  var px = ctx.getImageData(0, 0, R, R).data;
  function inside(x, y) { return px[((y | 0) * R + (x | 0)) * 4 + 3] > 127; }

  var nLines = Math.round(COUNT * LINE_SHARE), nLogo = COUNT - nLines;
  var form = new Float32Array(COUNT * 3), scatter = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT * 2);
  var i = 0, guard = 0;
  while (i < nLogo && guard++ < nLogo * 60) {
    var sx = rnd() * R, sy = rnd() * R;
    if (!inside(sx, sy)) continue;
    form[i * 3] = (sx / R * 2 - 1) * 0.78;
    form[i * 3 + 1] = (1 - sy / R * 2) * 0.78 - 0.1;
    form[i * 3 + 2] = (rnd() - 0.5) * 0.06;
    seed[i * 2 + 1] = 0;
    i++;
  }
  nLogo = i;
  // clause lines: rows of "words" behind the mark, shorter last line per paragraph
  var rows = [];
  for (var y = 0.98, r = 0; y > -1.0; y -= 0.105, r++) {
    if (r % 6 === 5) continue; // a gap between paragraphs
    var end = r % 6 === 4 ? 0.2 + rnd() * 0.5 : 1.2;
    var x = -1.2;
    while (x < end) {
      var w = 0.05 + rnd() * 0.22;
      rows.push([x, Math.min(x + w, end), y]);
      x += w + 0.035 + rnd() * 0.03;
    }
  }
  var total = rows.reduce(function (s, w) { return s + (w[1] - w[0]); }, 0);
  for (var k = 0; k < rows.length && i < COUNT; k++) {
    var seg = rows[k], n = Math.max(1, Math.round((seg[1] - seg[0]) / total * nLines));
    for (var j = 0; j < n && i < COUNT; j++, i++) {
      form[i * 3] = seg[0] + rnd() * (seg[1] - seg[0]);
      form[i * 3 + 1] = seg[2] + (rnd() - 0.5) * 0.012;
      form[i * 3 + 2] = -0.45;
      seed[i * 2 + 1] = 1;
    }
  }
  var N = i;
  for (i = 0; i < N; i++) {
    // the cloud: wide, deep, and lower than the mark, so gathering reads as rising into place
    scatter[i * 3] = (rnd() * 2 - 1) * 1.9;
    scatter[i * 3 + 1] = (rnd() * 2 - 1) * 1.3 - 0.55;
    scatter[i * 3 + 2] = (rnd() * 2 - 1) * 1.1;
    // each point starts in its own moment: the top of the mark first, a little noise on top
    seed[i * 2] = Math.min(0.45, Math.max(0, (1 - form[i * 3 + 1]) * 0.17 + rnd() * 0.12));
  }

  /* ---------- the program ---------- */
  var VS = [
    'attribute vec3 aForm; attribute vec3 aScatter; attribute vec2 aSeed;',
    'uniform float uP, uTime, uScan, uAspect, uDpr, uRx, uRy;',
    'varying float vA; varying float vScan; varying float vKind;',
    'void main() {',
    '  float t = clamp((uP - aSeed.x) / 0.55, 0.0, 1.0);',
    '  float e = t * t * (3.0 - 2.0 * t);',
    '  vec3 drift = vec3(sin(uTime * 0.6 + aScatter.y * 7.0), cos(uTime * 0.5 + aScatter.x * 6.0), 0.0) * 0.035 * (1.0 - e);',
    '  vec3 p = mix(aScatter, aForm, e) + drift;',
    '  float cy = cos(uRy), sy = sin(uRy), cx = cos(uRx), sx = sin(uRx);',
    '  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);',
    '  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);',
    '  float f = 3.2 / (3.2 - p.z);',
    '  gl_Position = vec4(p.x * f * 0.9 / uAspect, p.y * f * 0.9, 0.0, 1.0);',
    '  float band = exp(-pow((aForm.y - uScan) / 0.055, 2.0)) * e;',
    '  vScan = band; vKind = aSeed.y;',
    '  vA = aSeed.y > 0.5 ? 0.16 * e + 0.05 : mix(0.32, 0.9, e);',
    '  gl_PointSize = (aSeed.y > 0.5 ? 1.3 : 1.7 + band * 1.1) * uDpr * f;',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'varying float vA; varying float vScan; varying float vKind;',
    'void main() {',
    '  vec2 c = gl_PointCoord - 0.5; float d = dot(c, c);',
    '  if (d > 0.25) discard;',
    '  float soft = 1.0 - smoothstep(0.12, 0.25, d);',
    '  vec3 white = vec3(0.97, 0.97, 0.98), blue = vec3(0.557, 0.627, 1.0);',
    '  float s = vScan * (vKind > 0.5 ? 0.7 : 1.0);',
    '  vec3 col = mix(white, blue, min(1.0, s * 1.4));',
    '  float a = min(1.0, vA + s * (vKind > 0.5 ? 0.35 : 0.25)) * soft;',
    '  gl_FragColor = vec4(col * a, a);',
    '}'
  ].join('\n');
  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  function attr(name, data, size) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, N * size), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }
  attr('aForm', form, 3); attr('aScatter', scatter, 3); attr('aSeed', seed, 2);
  var U = {};
  ['uP', 'uTime', 'uScan', 'uAspect', 'uDpr', 'uRx', 'uRy'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  call.appendChild(canvas);

  /* ---------- size ---------- */
  var dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
  }

  /* ---------- state ---------- */
  var p = reduced ? 1 : 0, pTarget = p, rx = 0, ry = 0, tx = 0, ty = 0, visible = false, raf = 0, t0 = performance.now(), timedStart = 0;
  function scrollProgress() {
    var r = call.getBoundingClientRect(), vh = window.innerHeight;
    // 0 while the card's top is at the bottom of the screen, 1 once it has risen to 30 % from the top
    return Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7)));
  }
  function draw(now) {
    var time = (now - t0) / 1000;
    if (!reduced) {
      if (timed) pTarget = timedStart ? Math.min(1, (now - timedStart) / 2600) : 0;
      else pTarget = scrollProgress();
      p += (pTarget - p) * 0.08;
      rx += (tx - rx) * 0.06; ry += (ty - ry) * 0.06;
    }
    var sway = reduced ? 0 : Math.sin(time * 0.45) * 0.1 * p;
    var tilt = reduced ? 0 : Math.sin(time * 0.31) * 0.05 * p;
    // the scan reads down the mark every 3.6 s, from above its top to below its foot
    var scan = reduced ? -9 : 1.05 - ((time % 3.6) / 3.6) * 2.4;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.uP, p);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uScan, p > 0.92 ? scan : -9);
    gl.uniform1f(U.uAspect, W / H);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uRx, rx + tilt);
    gl.uniform1f(U.uRy, ry + sway);
    gl.drawArrays(gl.POINTS, 0, N);
  }
  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && !reduced) raf = requestAnimationFrame(loop); }

  resize();
  if (reduced) {
    draw(performance.now());
    window.addEventListener('resize', function () { resize(); draw(performance.now()); });
  } else {
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', start);
    // the pointer anywhere over the card: the mark leans toward it
    call.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      var nx = (e.clientX - (r.left + r.width / 2)) / Math.max(300, r.width);
      var ny = (e.clientY - (r.top + r.height / 2)) / Math.max(300, r.height);
      ty = Math.max(-1, Math.min(1, nx)) * 0.38;
      tx = Math.max(-1, Math.min(1, ny)) * 0.3;
    });
    call.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && timed && !timedStart) timedStart = performance.now();
      if (visible) start();
    }, { rootMargin: '120px 0px' }).observe(call);
  } else { visible = true; timedStart = performance.now(); start(); }
  requestAnimationFrame(function () { canvas.classList.add('is-on'); });
})();

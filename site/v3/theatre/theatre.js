/* The theatre: the real Sentinel interface on the page, frozen, and a camera, a cursor and a spotlight to direct it.

   Every scene in scenes.json is a page of the real interface drawn by its own code on the bundled sample contract (tools/theatre/capture.py), and
   theatre.css holds the rules those pages use, with their media queries resolved at capture and vh/vw turned into pixels. So a scene is not a picture and
   not a redrawing: it is the product's own markup at a fixed 1440 x 900, scaled to its frame, and its text stays sharp at any zoom. It lives in a shadow root,
   so nothing of the interface reaches the page and nothing of the page reaches it.

   Stage(host, {scenes: [...], width, height})   mounts the scenes stacked; the first shows.
     .ready                                      resolves when they are in
     .q(sel, scene) / .qa(sel, scene)            an element of a scene
     .show(name, tl, at, dur)                    cross-fades to a scene (on a timeline, or now)
     .camTo(target, scale, opts) -> tween        moves the camera so that `target` (element or {x, y}) sits at the frame's centre
     .camReset(opts) -> tween
     .cursorTo(target, opts) -> tween            the pointer, on a slight curve
     .press(target, opts) -> timeline
     .spot(target, opts) / .unspot(opts)         the rest of the frame dims round a rounded rectangle
     .rect(el)                                   an element's box in design pixels
*/
(function () {
  "use strict";
  var ASSETS = (document.currentScript && document.currentScript.src || "").replace(/theatre\.js.*$/, "");
  var DW = 1440, DH = 900;
  var sheetP = null, scenesP = {};
  var BASE_CSS = [
    ":host{all:initial;display:block;position:relative;overflow:hidden;contain:strict;color-scheme:dark}",
    ".sx-view{position:absolute;left:0;top:0;width:1440px;height:900px;transform-origin:0 0;overflow:hidden}",
    ".sx-cam{position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:0 0}",
    ".sx-html{position:absolute;inset:0;overflow:hidden;background:var(--bg-page,#0b0d12)}",
    ".sx-body{position:relative;width:100%;height:100%;overflow:hidden}",
    /* a frozen page does not run its own motion, and has no scrollbars: only the camera and the script move */
    ".sx-html *,.sx-html *::before,.sx-html *::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;scrollbar-width:none!important}",
    ".sx-html ::-webkit-scrollbar{display:none!important}",
    /* the parts of the real interface a demo would not show */
    ".sx-html .hp-hint,.sx-html .ab-note,.sx-html [data-tip]::after{display:none!important}",
    ".sx-spot{position:absolute;left:0;top:0;pointer-events:none;border-radius:14px;box-shadow:0 0 0 2400px rgba(4,5,9,.62);opacity:0;z-index:50}",
    ".sx-cursor{position:absolute;left:0;top:0;width:26px;height:26px;z-index:60;pointer-events:none;opacity:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,.55))}",
    ".sx-ripple{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(142,160,255,.36);opacity:0;z-index:59;pointer-events:none}",
  ].join("\n");

  /* two sets of frozen pages: the desk's (1440 x 900) and the interface's own phone layout (390 x 844) */
  function loadSheet(set) {
    var key = set || "d";
    if (!sheetP) sheetP = {};
    if (!sheetP[key]) {
      sheetP[key] = fetch(ASSETS + (set === "m" ? "theatre-m.css" : "theatre.css")).then(function (r) { return r.text(); }).then(function (css) {
        if (window.CSSStyleSheet && "adoptedStyleSheets" in Document.prototype) {
          var s = new CSSStyleSheet();
          s.replaceSync(css + "\n" + BASE_CSS);
          return { sheet: s };
        }
        return { text: css + "\n" + BASE_CSS };
      });
    }
    return sheetP[key];
  }
  function loadScene(name, set) {
    var key = (set || "d") + ":" + name;
    if (!scenesP[key]) scenesP[key] = fetch(ASSETS + (set === "m" ? "scenes-m/" : "scenes/") + name + ".json").then(function (r) { return r.json(); });
    return scenesP[key];
  }

  var CURSOR = '<svg viewBox="0 0 26 26" width="26" height="26"><path d="M5 2.6l.02 18.1 4.5-4.3 2.9 6.9 3.1-1.3-2.95-6.8 6.4-.25z" fill="#fff" stroke="#0b0d12" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  function Stage(host, opts) {
    opts = opts || {};
    this.host = host;
    this.set = opts.set || "";
    this.w = opts.width || (this.set === "m" ? 390 : DW);
    this.h = opts.height || (this.set === "m" ? 844 : DH);
    this.layers = {};
    this.current = null;
    this.fit = opts.fit || "width";
    this.region = opts.region || null;   // {x, y, w}: the part of the page the frame shows, filling its width
    var self = this;
    var root = (this.root = host.shadowRoot || host.attachShadow({ mode: "open" }));
    var names = opts.scenes || [];
    this.ready = loadSheet(this.set).then(function (s) {
      if (s.sheet) root.adoptedStyleSheets = [s.sheet];
      else { var st = document.createElement("style"); st.textContent = s.text; root.appendChild(st); }
      var view = (self.view = document.createElement("div"));
      view.className = "sx-view";
      view.setAttribute("aria-hidden", "true");
      view.setAttribute("inert", "");
      var camEl = (self.camEl = document.createElement("div"));
      camEl.className = "sx-cam";
      view.appendChild(camEl);
      root.appendChild(view);
      var spot = (self.spotEl = document.createElement("div"));
      spot.className = "sx-spot";
      camEl.appendChild(spot);
      var cur = (self.cursorEl = document.createElement("div"));
      cur.className = "sx-cursor";
      cur.innerHTML = CURSOR;
      camEl.appendChild(cur);
      var rip = (self.rippleEl = document.createElement("div"));
      rip.className = "sx-ripple";
      camEl.appendChild(rip);
      self.resize();
      if (window.ResizeObserver) { self._ro = new ResizeObserver(function () { self.resize(); }); self._ro.observe(host); }
      return Promise.all(names.map(function (n) { return self.addScene(n); }));
    }).then(function () {
      // whichever scene arrived first, they stack in the order asked for
      names.forEach(function (n) { if (self.layers[n]) self.camEl.insertBefore(self.layers[n], self.spotEl); });
      if (names[0]) self.showNow(names[0]);
      return self;
    });
  }
  Stage.prototype.resize = function () {
    var w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    var r = this.region;
    this.scale = r ? w / r.w : this.fit === "cover" ? Math.max(w / this.w, h / this.h) : w / this.w;
    if (this.view) {
      this.view.style.width = this.w + "px";
      this.view.style.height = this.h + "px";
      this.view.style.transform = (r ? "translate(" + -r.x * this.scale + "px," + -(r.y || 0) * this.scale + "px) " : "") + "scale(" + this.scale + ")";
    }
    if (this.onResize) this.onResize();
  };
  /* let the reader's pointer into the frozen page (a list to scroll, a cell to hover); its links go nowhere */
  Stage.prototype.interactive = function () {
    if (!this.view) return;
    this.view.removeAttribute("inert");
    this.view.style.pointerEvents = "auto";
    this.root.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a[href]"); if (a) e.preventDefault(); }, true);
  };
  Stage.prototype.addScene = function (name) {
    var self = this;
    return loadScene(name, this.set).then(function (s) {
      if (!s) { console.warn("no scene", name); return null; }
      var html = document.createElement("div");
      html.className = "sx-html v2-theme-scope " + (s.html_class || "");
      Object.keys(s.html_attrs || {}).forEach(function (k) { html.setAttribute(k, s.html_attrs[k]); });
      html.style.opacity = "0";
      html.style.visibility = "hidden";
      html.dataset.scene = name;
      var body = document.createElement("div");
      body.className = "sx-body " + (s.body_class || "");
      Object.keys(s.body_attrs || {}).forEach(function (k) { if (k !== "id") body.setAttribute(k, s.body_attrs[k]); });
      body.innerHTML = s.html;
      html.appendChild(body);
      self.camEl.insertBefore(html, self.spotEl);
      Array.prototype.forEach.call(html.querySelectorAll("[data-sx-st],[data-sx-sl]"), function (n) {
        n.scrollTop = +n.getAttribute("data-sx-st") || 0;
        n.scrollLeft = +n.getAttribute("data-sx-sl") || 0;
      });
      self.layers[name] = html;
      return html;
    });
  };
  Stage.prototype.showNow = function (name) {
    var self = this;
    Object.keys(this.layers).forEach(function (k) {
      var on = k === name;
      self.layers[k].style.opacity = on ? "1" : "0";
      self.layers[k].style.visibility = on ? "visible" : "hidden";
    });
    this.current = name;
  };
  /* a cross-fade between two scenes, on a timeline (or now) */
  Stage.prototype.show = function (name, tl, at, dur) {
    var self = this, d = dur == null ? 0.5 : dur;
    var to = this.layers[name];
    var make = function (t, pos) {
      var from = null;
      t.call(function () {
        Object.keys(self.layers).forEach(function (k) { if (k !== name && self.layers[k].style.visibility !== "hidden") from = self.layers[k]; });
      }, null, pos);
      t.set(to, { visibility: "visible", zIndex: 2 }, pos);
      t.fromTo(to, { opacity: 0 }, { opacity: 1, duration: d, ease: "power1.inOut", immediateRender: false }, pos);
      t.call(function () {
        Object.keys(self.layers).forEach(function (k) { if (k !== name) { self.layers[k].style.opacity = "0"; self.layers[k].style.visibility = "hidden"; } });
        to.style.zIndex = "";
        self.current = name;
      }, null, (typeof pos === "number" ? pos + d : ">"));
      return t;
    };
    if (tl) return make(tl, at == null ? ">" : at);
    return make(window.gsap.timeline(), 0);
  };
  Stage.prototype.q = function (sel, scene) { var l = this.layers[scene || this.current]; return l ? l.querySelector(sel) : null; };
  Stage.prototype.qa = function (sel, scene) { var l = this.layers[scene || this.current]; return l ? Array.prototype.slice.call(l.querySelectorAll(sel)) : []; };
  /* an element's box in design pixels (whatever the camera and the frame's scale are now) */
  Stage.prototype.rect = function (el) {
    var c = this.camEl.getBoundingClientRect(), b = el.getBoundingClientRect();
    var k = (c.width / this.w) || 1;
    return { x: (b.left - c.left) / k, y: (b.top - c.top) / k, w: b.width / k, h: b.height / k };
  };
  Stage.prototype._aim = function (target, scale, o) {
    o = o || {};
    var r = target && target.nodeType ? this.rect(target) : { x: target.x, y: target.y, w: target.w || 0, h: target.h || 0 };
    var vw = this.viewW(), vh = this.viewH();
    var cx = r.x + r.w / 2 + (o.dx || 0), cy = r.y + r.h / 2 + (o.dy || 0);
    var x = vw / 2 - cx * scale, y = vh / 2 - cy * scale;
    // never past the page's edge
    x = Math.min(0, Math.max(vw - this.w * scale, x));
    y = Math.min(0, Math.max(vh - this.h * scale, y));
    return { x: x, y: y, scale: scale };
  };
  Stage.prototype.viewW = function () { return (this.host.clientWidth || this.w) / this.scale; };
  /* how much of the frame the reader can see (a frame the fold crops says so through `visible`) */
  Stage.prototype.viewH = function () { return (this.visible ? this.visible() : this.host.clientHeight || this.h) / this.scale; };
  Stage.prototype.camTo = function (target, scale, o) {
    o = o || {};
    var self = this;
    var a = null;
    return window.gsap.to(this.camEl, {
      duration: o.duration == null ? 1.4 : o.duration, ease: o.ease || "expo.inOut", force3D: false, transformOrigin: "0 0",
      x: function () { a = self._aim(target, scale, o); return a.x; },
      y: function () { return a.y; },
      scale: function () { return a.scale; },
    });
  };
  Stage.prototype.camReset = function (o) {
    o = o || {};
    return window.gsap.to(this.camEl, { x: 0, y: 0, scale: 1, duration: o.duration == null ? 1.2 : o.duration, ease: o.ease || "expo.inOut", force3D: false, transformOrigin: "0 0" });
  };
  Stage.prototype.cursorShow = function (x, y) { window.gsap.set(this.cursorEl, { x: x, y: y, opacity: 1 }); };
  Stage.prototype.cursorTo = function (target, o) {
    o = o || {};
    var self = this, el = this.cursorEl, g = window.gsap;
    var p0 = null, p1 = null, st = { t: 0 };
    return g.to(st, {
      t: 1, duration: o.duration == null ? 0.9 : o.duration, ease: o.ease || "power2.inOut",
      onStart: function () {
        p0 = { x: +g.getProperty(el, "x"), y: +g.getProperty(el, "y") };
        var r = target && target.nodeType ? self.rect(target) : target;
        p1 = { x: r.x + (r.w || 0) * (o.fx == null ? 0.5 : o.fx) - 4, y: r.y + (r.h || 0) * (o.fy == null ? 0.5 : o.fy) - 2 };
        g.set(el, { opacity: 1 });
      },
      onUpdate: function () {
        if (!p0) return;
        var t = st.t, mx = (p0.x + p1.x) / 2 + (p1.y - p0.y) * 0.12, my = (p0.y + p1.y) / 2 - (p1.x - p0.x) * 0.12;
        var x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * mx + t * t * p1.x;
        var y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * my + t * t * p1.y;
        g.set(el, { x: x, y: y });
      },
    });
  };
  Stage.prototype.press = function () {
    var g = window.gsap, el = this.cursorEl, rip = this.rippleEl, tl = g.timeline();
    tl.to(el, { scale: 0.86, duration: 0.09, ease: "power2.out" });
    tl.call(function () {
      var x = +g.getProperty(el, "x") + 4, y = +g.getProperty(el, "y") + 2;
      g.fromTo(rip, { x: x, y: y, scale: 0.3, opacity: 0.9 }, { scale: 1.3, opacity: 0, duration: 0.5, ease: "power2.out" });
    });
    tl.to(el, { scale: 1, duration: 0.16, ease: "power2.out" });
    return tl;
  };
  Stage.prototype.cursorHide = function (o) { return window.gsap.to(this.cursorEl, { opacity: 0, duration: (o && o.duration) || 0.3 }); };
  Stage.prototype.spot = function (target, o) {
    o = o || {};
    var self = this, pad = o.pad == null ? 8 : o.pad, g = window.gsap;
    return g.to(this.spotEl, {
      opacity: 1, duration: o.duration == null ? 0.6 : o.duration, ease: "power2.inOut",
      x: function () { return self.rect(target).x - pad; },
      y: function () { return self.rect(target).y - pad; },
      width: function () { return self.rect(target).w + pad * 2; },
      height: function () { return self.rect(target).h + pad * 2; },
    });
  };
  Stage.prototype.unspot = function (o) { return window.gsap.to(this.spotEl, { opacity: 0, duration: (o && o.duration) || 0.5, ease: "power2.inOut" }); };

  window.SentinelTheatre = { Stage: Stage, DW: DW, DH: DH, loadScene: loadScene };
})();

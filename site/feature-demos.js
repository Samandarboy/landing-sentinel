// Key Features — live demos of the Sentinel interface (no video files).
// Builds three faithful, animated recreations of the real product UI
// (Detect / Simulate / Report) running on the Valve/Riot fixture data
// from interface/data.js. feature-carousel.js drives play()/stop().
(function () {
  'use strict';

  /* ---------- shared SVG icons (paths copied from interface/index.html) ---------- */
  var ICONS = {
    draft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19l3-1L19 7l-2-2L6 16l-1 3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/><path d="M14 5l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    detect: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 16 21 21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 11h6M8 14h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    simulate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3-7 4 14 3-7h4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    stress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>',
    report: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 14l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true"><path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1" fill="currentColor"/></svg>'
  };

  function railHTML(active) {
    var modes = [['draft', 'Draft'], ['detect', 'Detect'], ['simulate', 'Simulate'], ['stress', 'Stress'], ['report', 'Report']];
    return '<div class="sd-rail"><div class="sd-rail-brand"></div>' + modes.map(function (m) {
      return '<div class="sd-rail-btn' + (m[0] === active ? ' is-active' : '') + '">' + ICONS[m[0]] + '<span>' + m[1] + '</span></div>';
    }).join('') + '</div>';
  }

  // Library panel. items: [{num,name,dot,meta,active,pulseDelay}]
  function libHTML(divider, items) {
    return '<div class="sd-lib">' +
      '<div class="sd-lib-head"><b>Sentinel</b><i>/v2.4</i></div>' +
      '<div class="sd-lib-divider">' + divider + '</div>' +
      '<div class="sd-lib-scroll">' + items.map(function (it) {
        return '<div class="sd-lib-item' + (it.active ? ' is-active' : '') + (it.pulse != null ? ' sd-pulse' : '') + '"' +
          (it.pulse != null ? ' style="--d:' + it.pulse + 's"' : '') + '>' +
          (it.num ? '<span class="sd-num">' + it.num + '</span>' : '') +
          (it.dot ? '<span class="sd-dot ' + it.dot + '"></span>' : '') +
          '<span class="sd-name">' + it.name + '</span>' +
          (it.meta ? '<span class="sd-meta">' + it.meta + '</span>' : '') +
          '</div>';
      }).join('') + '</div></div>';
  }

  var SECTIONS = [
    ['1', 'Definitions', 'crit'], ['2', 'The Acquisition', 'warn'], ['3', 'Closing & Outside Date', 'crit'],
    ['4', 'Representations of the Seller', 'ok'], ['5', 'Interim Covenants', 'warn'], ['6', 'Conditions to Closing', 'crit'],
    ['7', 'Termination', 'crit'], ['8', 'Intellectual Property', 'warn'], ['9', 'Indemnification', 'ok'],
    ['10', 'Employees & Benefits', 'warn'], ['11', 'Notices & Communications', 'warn'], ['12', 'Tax Matters', 'ok'],
    ['13', 'Confidentiality & Announcements', 'ok'], ['14', 'Governing Law & Disputes', 'ok'], ['15', 'General Provisions', 'ok']
  ];

  /* ============================================================
     Demo 1 — Detect: findings stream in on the Valve/Riot doc
  ============================================================ */
  function detectHTML() {
    var libItems = SECTIONS.map(function (s, i) {
      return { num: s[0], name: s[1], dot: s[2], pulse: (0.4 + i * 0.14).toFixed(2) };
    });
    var cards = [
      { sev: 'crit', title: 'Material Adverse Change is undefined',
        sum: 'MAC gates the closing condition (§6.1) and termination right (§7.1) but is never enumerated — almost any negative event is arguable.',
        refs: ['§1.3', '§6.1', '§7.1'] },
      { sev: 'crit', title: 'Closing condition stack cannot complete before Outside Date',
        sum: 'SAMR median timeline plus CFIUS extended review exceeds the Dec 31, 2026 Outside Date. Either party may then terminate.',
        refs: ['§3.1', '§3.2', '§7.2'] },
      { sev: 'crit', title: 'MAU earnout calculation is ambiguous',
        sum: '$8B of consideration rides on MAU “as reported by the Target” — no audit rights, no methodology lock.',
        refs: ['§2.3', '§1.4'] },
      { sev: 'crit', title: 'Tencent Consent scope undefined for material decisions',
        sum: 'Any Tencent objection during the 6–9 month pendency could block normal-course business.',
        refs: ['§6.4', '§1.6'] }
    ];
    // the first finding opens after the list has settled (--o): an inline detail,
    // like the product's accordion — what it means, the clause, the actions
    var OPEN_AT = 6.9;
    // the same sections the product's detail panel shows: what it means, what is at
    // stake, how we know (clause by clause), the actions, and the facts column
    var detail = '<div class="sd-detail"><div class="sd-detail-in">' +
      '<div class="sd-detail-main">' +
        '<div class="sd-dl">What this means</div>' +
        '<p class="sd-dp">Both the closing condition (§6.1) and the termination right (§7.1) turn on a term the agreement never defines. One bad quarter is arguably a MAC — or arguably not — and either side can litigate the difference.</p>' +
        '<div class="sd-dl">At stake</div>' +
        '<div class="sd-stake"><b>The closing itself</b><span>Either side can refuse to close (§6.1) or walk away (§7.1) on a word nobody defined.</span></div>' +
        '<div class="sd-dl">How we know</div>' +
        '<div class="sd-how">' +
          '<div class="sd-how-row"><span class="sd-ref">§ 1.3</span><span>Defined terms: 41 entries. “Material Adverse Change” is not among them.</span></div>' +
          '<div class="sd-how-row"><span class="sd-ref">§ 6.1(b)</span><span>“…no <mark>Material Adverse Change</mark> shall have occurred since the Balance Sheet Date.”</span></div>' +
          '<div class="sd-how-row"><span class="sd-ref">§ 7.1(c)</span><span>“…may terminate this Agreement if a <mark>Material Adverse Change</mark> has occurred.”</span></div>' +
          '<div class="sd-how-foot">Computed from the contract’s own text · confirmed on a second, independent reading · replayable at no cost</div>' +
        '</div>' +
      '</div>' +
      '<div class="sd-detail-side">' +
        '<span class="sd-btn is-primary">Accept finding</span><span class="sd-btn">Dismiss</span><span class="sd-btn">Synthesize a verified fix</span><span class="sd-btn is-ghost">Stress-test this</span>' +
        '<div class="sd-kv"><span>Severity</span><b class="crit">Critical</b></div>' +
        '<div class="sd-kv"><span>Confidence</span><b class="ok">High</b></div>' +
        '<div class="sd-kv"><span>Clauses</span><b>§1.3 · §6.1(b) · §7.1(c)</b></div>' +
        '<div class="sd-kv"><span>Who benefits</span><b>Whoever wants out</b></div>' +
      '</div>' +
    '</div></div>';
    var t0 = 2.6, step = 1.15;
    var cardHTML = cards.map(function (c, i) {
      var d = (t0 + i * step).toFixed(2);
      var open = i === 0;
      return '<li class="sd-card sd-anim' + (open ? ' sd-open' : '') + '" style="--d:' + d + 's' + (open ? ';--o:' + OPEN_AT + 's' : '') + '">' +
        '<span class="sd-bar ' + c.sev + '"></span>' +
        '<div><div class="sd-card-top"><span class="sd-card-title">' + c.title + '</span>' +
        '<span class="sd-badges"><span class="sd-sev ' + c.sev + '">Critical</span><span class="sd-deg">' + ICONS.check + 'Proven · 1st°</span></span></div>' +
        '<p class="sd-card-sum">' + c.sum + '</p>' +
        '<div class="sd-refs">' + c.refs.map(function (r) { return '<span class="sd-ref">' + r + '</span>'; }).join('') + '</div>' +
        (open ? detail : '') +
        '</div></li>';
    }).join('');
    var chips = [
      ['All', 14, 'is-active', ''], ['Critical', 4, '', 'crit'], ['High', 3, '', 'high'], ['Medium', 4, '', 'warn'], ['Low', 3, '', 'low']
    ].map(function (c, i) {
      return '<span class="sd-chip ' + c[2] + ' sd-anim" style="--d:' + (0.7 + i * 0.08).toFixed(2) + 's">' +
        (c[3] ? '<span class="sd-dot ' + c[3] + '"></span>' : '') + '<b>' + c[1] + '</b> ' + c[0] + '</span>';
    }).join('');

    return '<div class="sd-app">' + railHTML('detect') + libHTML('Sections · 15', libItems) +
      '<div class="sd-main">' +
        '<div class="sd-modebar"><span class="sd-mb-eyebrow">Detect</span><span class="sd-mb-title">Detection · Valve/Riot</span>' +
          '<span class="sd-mb-right"><span>217 rules</span><span>·</span><span>6 scenarios</span><span>·</span>' +
          '<span class="sd-status"><span class="sd-st run"><span class="sd-spinner"></span>analyzing…</span><span class="sd-st done">✓ signed report</span></span></span></div>' +
        '<div class="sd-stage">' +
          '<div class="sd-anim" style="--d:0.15s"><span class="sd-eyebrow">Detection</span>' +
            '<div class="sd-h1">Valve / Riot Acquisition Agreement</div>' +
            '<div class="sd-h1-sub">Valve Corporation · Riot Games, Inc. · Tencent Holdings Ltd. · 64 pages</div></div>' +
          '<div class="sd-chips">' + chips + '<span class="sd-cov sd-anim" style="--d:1.1s">14 findings · 4 critical</span></div>' +
          '<ul class="sd-cards">' + cardHTML + '</ul>' +
          '<div class="sd-scan"></div>' +
        '</div>' +
      '</div></div>';
  }

  /* ============================================================
     Demo 2 — Simulate: CFIUS Extended Review timeline plays out
  ============================================================ */
  function simulateHTML() {
    // playhead runs 2.0s -> 8.4s across Apr 1 2026 -> Dec 31 2026 (274 days)
    var T0 = 2.0, SPAN = 6.4;
    var events = [
      { date: 'Apr 1', label: 'Signing', day: 0 },
      { date: 'Apr 30', label: 'HSR filed', day: 29 },
      { date: 'Jun 15', label: 'CFIUS second request issued', day: 75 },
      { date: 'Jul 1', label: 'SAMR review begins', day: 91 },
      { date: 'Dec 31', label: 'Outside Date reached — approvals still pending', day: 274, conflict: true }
    ];
    var nodes = events.map(function (e) {
      var pct = (e.day / 274) * 100;
      var d = (T0 + SPAN * (e.day / 274)).toFixed(2);
      return '<span class="sd-node' + (e.conflict ? ' is-conflict' : '') + '" style="left:' + pct.toFixed(1) + '%;--d:' + d + 's"></span>';
    }).join('');
    var rows = events.map(function (e) {
      var d = (T0 + SPAN * (e.day / 274)).toFixed(2);
      return '<div class="sd-ev sd-anim-x' + (e.conflict ? ' is-conflict' : '') + '" style="--d:' + d + 's">' +
        '<span class="sd-ev-date">' + e.date + '</span><span class="sd-ev-text">' + e.label + '</span></div>';
    }).join('');
    var sessions = [
      { name: 'Detection · Valve/Riot', dot: 'high', meta: '2 min' },
      { name: 'CFIUS Extended Review', dot: 'crit', meta: '12 min', active: true },
      { name: 'Stress · Tencent consent', dot: 'warn', meta: '1 hr' },
      { name: 'Report draft 2', dot: 'mute', meta: '1 d' },
      { name: 'Detection · Vendor MSA', dot: 'mute', meta: '2 d' }
    ];
    return '<div class="sd-app">' + railHTML('simulate') + libHTML('Sessions', sessions) +
      '<div class="sd-main">' +
        '<div class="sd-modebar"><span class="sd-mb-eyebrow">Simulate</span><span class="sd-mb-title">CFIUS Extended Review</span>' +
          '<span class="sd-mb-right"><span>274-day window</span><span>·</span>' +
          '<span class="sd-status"><span class="sd-st run"><span class="sd-spinner"></span>simulating…</span><span class="sd-st done">✓ breach proven</span></span></span></div>' +
        '<div class="sd-stage">' +
          '<div class="sd-anim" style="--d:0.15s"><span class="sd-eyebrow">Simulation</span>' +
            '<div class="sd-h1">What if regulators run long?</div>' +
            '<div class="sd-h1-sub">Sentinel plays the contract forward, day by day, against the regulatory clock.</div></div>' +
          '<div class="sd-timebar sd-anim" style="--d:0.7s"><div class="sd-timebar-row">' +
            '<div class="sd-scen"><i>Scenario</i><b>CFIUS Extended Review</b></div>' +
            '<div class="sd-track-wrap"><span class="sd-time-end">Apr 1, 2026</span>' +
              '<div class="sd-track"><div class="sd-track-fill"></div>' + nodes + '<span class="sd-playhead"></span></div>' +
              '<span class="sd-time-end">Dec 31, 2026</span></div>' +
          '</div></div>' +
          '<div class="sd-sim-cols">' +
            '<div class="sd-panel sd-anim" style="--d:1.0s"><h4>Events<i>replayable trace</i></h4><div class="sd-events">' + rows + '</div></div>' +
            '<div class="sd-panel sd-anim" style="--d:1.2s"><h4>Kernel results</h4><div class="sd-results">' +
              '<div class="sd-res sd-anim-x" style="--d:8.7s"><span>CFIUS expected complete</span><b class="ok">Sep 12 · day 164</b></div>' +
              '<div class="sd-res sd-anim-x" style="--d:9.1s"><span>SAMR expected complete</span><b class="bad">Jan 21, 2027 · day 295</b></div>' +
            '</div></div>' +
          '</div>' +
          '<div class="sd-conflict sd-anim" style="--d:9.9s">' + ICONS.warn +
            '<span>SAMR clears ~21 days after the Outside Date — either party may terminate (§3.2). Buyer owes the <span class="sd-fee">$1.5B</span> regulatory-failure fee (§7.2).</span></div>' +
        '</div>' +
      '</div></div>';
  }

  /* ============================================================
     Demo 3 — Report: the clause-cited memo assembles itself
  ============================================================ */
  function reportHTML() {
    var findings = [
      { dot: 'crit', text: 'Material Adverse Change undefined — closing condition unusable', refs: '§1.3 · §6.1' },
      { dot: 'crit', text: 'Regulatory stack cannot clear before the Outside Date', refs: '§3.1 · §3.2' },
      { dot: 'crit', text: '$8B earnout rides on an unauditable MAU definition', refs: '§2.3 · §1.4' },
      { dot: 'high', text: 'Source-code escrow has no release triggers', refs: '§8.2' }
    ];
    var t0 = 2.1, step = 0.95;
    var rows = findings.map(function (f, i) {
      var d = (t0 + i * step).toFixed(2);
      return '<div class="sd-find sd-wipe" style="--d:' + d + 's"><span class="sd-dot ' + f.dot + '"></span>' +
        '<span>' + f.text + '</span><span class="sd-ref">' + f.refs + '</span></div>';
    }).join('');
    var sessions = [
      { name: 'Detection · Valve/Riot', dot: 'high', meta: '2 min' },
      { name: 'CFIUS Extended Review', dot: 'crit', meta: '12 min' },
      { name: 'Report draft 2', dot: 'mute', meta: 'now', active: true }
    ];
    return '<div class="sd-app">' + railHTML('report') + libHTML('Sessions', sessions) +
      '<div class="sd-main">' +
        '<div class="sd-modebar"><span class="sd-mb-eyebrow">Report</span><span class="sd-mb-title">Report draft 2 · Valve/Riot</span>' +
          '<span class="sd-mb-right"><span>PDF · DOCX</span><span>·</span>' +
          '<span class="sd-status"><span class="sd-st run"><span class="sd-spinner"></span>assembling…</span><span class="sd-st done">✓ signed</span></span></span></div>' +
        '<div class="sd-stage">' +
          '<div class="sd-doc sd-anim" style="--d:0.2s">' +
            '<div class="sd-doc-eyebrow sd-wipe" style="--d:0.6s">Legal analysis memorandum</div>' +
            '<div class="sd-doc-title sd-wipe" style="--d:0.9s">Valve / Riot Acquisition Agreement</div>' +
            '<div class="sd-doc-meta sd-wipe" style="--d:1.3s">v3 · 64 pages · 14 findings, 4 critical · every finding cited to its clause</div>' +
            '<div class="sd-doc-h sd-wipe" style="--d:1.7s">Findings</div>' +
            '<div class="sd-findings">' + rows + '</div>' +
            '<div class="sd-quote sd-wipe" style="--d:6.2s">“MAU means monthly active users of the Acquired Games, <mark>as reported by the Target</mark> on a trailing thirty (30) day basis.”<span class="sd-ref">§ 1.4</span></div>' +
            '<div class="sd-redline sd-anim" style="--d:7.3s"><b>Redline</b><span>Lock the MAU methodology at signing; give Buyer quarterly audit rights.</span></div>' +
            '<div class="sd-signed">' +
              '<span class="sd-seal sd-stamp" style="--d:8.4s"><svg viewBox="0 0 24 24" width="13" height="13"><path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
              '<span class="sd-anim" style="--d:8.6s"><span class="sd-sig-name">Kernel-signed &amp; reproducible</span><br>' +
              '<span class="sd-sig-hash">sha256 · 9f2c41ab…e81a · replay to verify</span></span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>';
  }

  /* ============================================================
     Mount + playback control
  ============================================================ */
  var BUILDERS = { detect: detectHTML, simulate: simulateHTML, report: reportHTML };
  var DESIGN_W = 920, DESIGN_H = 690;
  var demos = [];

  function fit(demo) {
    var w = demo.root.clientWidth, h = demo.root.clientHeight;
    if (!w || !h) return;
    // The design surface is 920x690 unless CSS re-sizes it (phones re-flow the
    // interface into a narrow single column). With `--fit: width` on the root
    // the surface is scaled to the root's width and the root crops the rest,
    // so a camera keyframe can pan down a tall surface without a blank strip.
    var dw = demo.surface.offsetWidth || DESIGN_W, dh = demo.surface.offsetHeight || DESIGN_H;
    var mode = (window.getComputedStyle(demo.root).getPropertyValue('--fit') || '').trim();
    var s = mode === 'width' ? w / dw : Math.min(w / dw, h / dh);
    demo.surface.style.transform = 'scale(' + s + ')';
    // center the letterboxed remainder, if any
    demo.surface.style.left = Math.max(0, (w - dw * s) / 2) + 'px';
    demo.surface.style.top = mode === 'width' ? '0px' : Math.max(0, (h - dh * s) / 2) + 'px';
  }

  function init() {
    var roots = [].slice.call(document.querySelectorAll('.sd-demo[data-demo]'));
    if (!roots.length) return;
    roots.forEach(function (root) {
      var kind = root.getAttribute('data-demo');
      var build = BUILDERS[kind];
      if (!build) return;
      var surface = document.createElement('div');
      surface.className = 'sd-scale';
      // .sd-cam is the "camera": CSS keyframes pan/zoom it onto the part of
      // the interface each feature is actually about
      surface.innerHTML = '<div class="sd-cam">' + build() + '</div>';
      root.appendChild(surface);
      demos.push({ root: root, surface: surface, kind: kind });
    });
    demos.forEach(fit);
    var pending = null;
    window.addEventListener('resize', function () {
      if (pending) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(function () { demos.forEach(fit); });
    });
  }

  window.SentinelDemos = {
    // restart a demo's animation timeline from zero
    play: function (rootEl) {
      var d = demos.filter(function (x) { return x.root === rootEl || x.root === rootEl.querySelector('.sd-demo'); })[0];
      if (!d) { // rootEl may be the .feat-panel wrapper
        var inner = rootEl && rootEl.querySelector ? rootEl.querySelector('.sd-demo') : null;
        d = demos.filter(function (x) { return x.root === inner; })[0];
      }
      if (!d) return;
      fit(d);
      d.root.classList.remove('is-playing');
      void d.root.offsetWidth; // force reflow so animations restart
      d.root.classList.add('is-playing');
    },
    stop: function (rootEl) {
      var inner = rootEl && rootEl.querySelector ? rootEl.querySelector('.sd-demo') : null;
      demos.forEach(function (x) {
        if (x.root === rootEl || x.root === inner) x.root.classList.remove('is-playing');
      });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

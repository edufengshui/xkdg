/* floorplan-stars.js — Floor Plan Flying Stars
 *
 * Overlay tool: upload a floor-plan image, set the facing degree and which side
 * of the image the facing is on, set the period, define the center, then draw
 * the 8-palace pie with the flying-star numbers (mountain 山 / base 運 /
 * facing 向) rotated to match the plan AS UPLOADED (the image is never rotated).
 *
 * Two ways to set the center:
 *   - Auto:   tap the perimeter vertices → area centroid (warns if it falls
 *             outside the outline, e.g. on L / U shaped plans).
 *   - Manual: tap any single point → that point is the center.
 *
 * NOTE on the SOUTH-at-top rule: the standard Flying Stars chart keeps South at
 * the top. Here, by design, the grid is rotated to align with the plan as the
 * user uploaded it, so the palaces fall on the correct rooms.
 *
 * Depends on: window.FlyingStars (flying-stars.js).
 * Public API:  window.FloorPlanStars.open(opts?)
 *   opts = { facingDeg?:Number, period?:Number, facingSide?:'top'|'bottom'|'left'|'right' }
 */
(function () {
  'use strict';

  // FlyingStars is a top-level `const` in flying-stars.js → reachable by name across
  // classic scripts, but NOT present on window. Resolve it safely either way.
  function getFS() {
    try { if (typeof FlyingStars !== 'undefined' && FlyingStars) return FlyingStars; } catch (e) {}
    return (typeof window !== 'undefined' && window.FlyingStars) ? window.FlyingStars : null;
  }

  // 24-mountain characters + degree → mountain (self-contained; mirrors app-fengshui).
  var MTN_CHAR = ['壬','子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙','午','丁','未','坤','申','庚','酉','辛','戌','乾','亥'];
  function mountainFromDeg(deg) { var d = ((deg % 360) + 360) % 360; var idx = Math.floor((d + 22.5) / 15) % 24; return MTN_CHAR[idx]; }

  // Palace grid index → compass degree of palace CENTER (same convention as FlyingStars).
  var PALACE_DEG = { 0: 135, 1: 180, 2: 225, 3: 90, 5: 270, 6: 45, 7: 0, 8: 315 };
  var PALACE_LABEL = { 0: 'SE', 1: 'S', 2: 'SW', 3: 'E', 5: 'W', 6: 'NE', 7: 'N', 8: 'NW' };
  var SIDE_OFFSET = { top: 0, right: 90, bottom: 180, left: 270 };

  var st = {
    img: null, drawW: 0, drawH: 0,
    facingDeg: 180, facingSide: 'top', period: 8,
    centerMode: 'auto',
    verts: [], center: null, chart: null, centerOutside: false
  };

  var els = {}; // cached DOM refs

  // ── Geometry ──────────────────────────────────────────────
  function centroid(pts) {
    if (!pts || pts.length === 0) return null;
    if (pts.length < 3) { // average for 1–2 points
      var sx = 0, sy = 0; pts.forEach(function (p) { sx += p.x; sy += p.y; });
      return { x: sx / pts.length, y: sy / pts.length };
    }
    var A = 0, cx = 0, cy = 0, n = pts.length;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      A += cross; cx += (pts[i].x + pts[j].x) * cross; cy += (pts[i].y + pts[j].y) * cross;
    }
    A *= 0.5;
    if (Math.abs(A) < 1e-6) { // degenerate → fall back to average
      var ax = 0, ay = 0; pts.forEach(function (p) { ax += p.x; ay += p.y; });
      return { x: ax / n, y: ay / n };
    }
    return { x: cx / (6 * A), y: cy / (6 * A) };
  }
  function pointInPolygon(pt, poly) {
    if (!poly || poly.length < 3) return true;
    var inside = false, n = poly.length;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      var hit = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }
  // compass degree that "up" (−y) of the image points to
  function imageUpDeg() {
    var off = SIDE_OFFSET[st.facingSide] || 0;
    return (((st.facingDeg - off) % 360) + 360) % 360;
  }
  // canvas angle (rad) for a compass degree D: φ = (270 + D − up) mod 360, then to rad
  function canvasAngle(D) {
    var up = imageUpDeg();
    var phi = (((270 + D - up) % 360) + 360) % 360;
    return phi * Math.PI / 180;
  }

  // ── Canvas drawing ────────────────────────────────────────
  function fitCanvas() {
    var maxW = Math.min(window.innerWidth - 48, 900);
    var nW = st.img.naturalWidth || st.img.width;
    var nH = st.img.naturalHeight || st.img.height;
    var scale = Math.min(1, maxW / nW);
    st.drawW = Math.round(nW * scale);
    st.drawH = Math.round(nH * scale);
    var c = els.canvas;
    c.width = st.drawW; c.height = st.drawH;
    c.style.width = '100%'; c.style.height = 'auto';
  }
  function canvasPt(ev) {
    var c = els.canvas, r = c.getBoundingClientRect();
    var cx = (ev.clientX != null) ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0);
    var cy = (ev.clientY != null) ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0);
    return { x: (cx - r.left) * (c.width / r.width), y: (cy - r.top) * (c.height / r.height) };
  }

  function redraw() {
    var c = els.canvas, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (st.img) ctx.drawImage(st.img, 0, 0, st.drawW, st.drawH);

    // perimeter polygon being tapped (auto mode)
    if (st.centerMode === 'auto' && st.verts.length) {
      ctx.save();
      ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(21,101,192,0.10)';
      ctx.beginPath();
      st.verts.forEach(function (p, i) { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      if (st.verts.length > 2) { ctx.closePath(); ctx.fill(); }
      ctx.stroke();
      st.verts.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI); ctx.fillStyle = '#1565c0'; ctx.fill(); });
      ctx.restore();
    }

    if (st.center) {
      if (st.chart) drawPie(ctx, st.center);
      // center marker
      ctx.save();
      ctx.beginPath(); ctx.arc(st.center.x, st.center.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = st.centerOutside ? '#b00020' : '#222'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  function drawPie(ctx, ctr) {
    var R = Math.hypot(Math.max(ctr.x, st.drawW - ctr.x), Math.max(ctr.y, st.drawH - ctr.y)) + 12;
    // sector boundary rays (8 lines at palace-edge angles)
    ctx.save();
    ctx.strokeStyle = 'rgba(90,55,20,0.85)'; ctx.lineWidth = 1.5;
    [0, 1, 2, 3, 5, 6, 7, 8].forEach(function (idx) {
      var a = canvasAngle(PALACE_DEG[idx] - 22.5);
      ctx.beginPath(); ctx.moveTo(ctr.x, ctr.y); ctx.lineTo(ctr.x + R * Math.cos(a), ctr.y + R * Math.sin(a)); ctx.stroke();
    });
    ctx.restore();

    // star clusters per palace
    var rLabel = 0.32 * Math.min(st.drawW, st.drawH);
    [0, 1, 2, 3, 5, 6, 7, 8].forEach(function (idx) {
      var a = canvasAngle(PALACE_DEG[idx]);
      var lx = ctr.x + rLabel * Math.cos(a);
      var ly = ctr.y + rLabel * Math.sin(a);
      lx = Math.max(34, Math.min(st.drawW - 34, lx));
      ly = Math.max(26, Math.min(st.drawH - 26, ly));
      drawCluster(ctx, lx, ly, st.chart.sittingStars[idx], st.chart.baseStars[idx], st.chart.facingStars[idx], PALACE_LABEL[idx]);
    });

    drawFacingArrow(ctx, ctr);
  }

  // distance from center along (dx,dy) to the image rectangle (minus margin)
  function reachToEdge(cx, cy, dx, dy, w, h, m) {
    var ts = [];
    if (dx > 1e-6) ts.push((w - m - cx) / dx); else if (dx < -1e-6) ts.push((m - cx) / dx);
    if (dy > 1e-6) ts.push((h - m - cy) / dy); else if (dy < -1e-6) ts.push((m - cy) / dy);
    var t = Infinity; ts.forEach(function (v) { if (v > 0 && v < t) t = v; });
    return isFinite(t) ? t : 0.4 * Math.min(w, h);
  }

  function drawFacingArrow(ctx, ctr) {
    var a = canvasAngle(st.facingDeg); // points exactly toward the declared side
    var dx = Math.cos(a), dy = Math.sin(a);
    var len = reachToEdge(ctr.x, ctr.y, dx, dy, st.drawW, st.drawH, 14) * 0.9;
    var ex = ctr.x + len * dx, ey = ctr.y + len * dy;
    ctx.save();
    // shaft
    ctx.strokeStyle = '#0033cc'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ctr.x, ctr.y); ctx.lineTo(ex, ey); ctx.stroke();
    // arrowhead
    var ah = 13;
    ctx.fillStyle = '#0033cc';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ah * Math.cos(a - 0.4), ey - ah * Math.sin(a - 0.4));
    ctx.lineTo(ex - ah * Math.cos(a + 0.4), ey - ah * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
    // label near the tip
    var lbl = 'Facing ' + st.facingDeg + '° ' + (st.chart ? st.chart.facingDirection : '') + (st.chart ? ' ' + st.chart.facingMountain : '');
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tw = ctx.measureText(lbl).width + 10;
    var tx = Math.max(tw / 2 + 2, Math.min(st.drawW - tw / 2 - 2, ex));
    var ty = Math.max(12, Math.min(st.drawH - 12, ey - 14 * (dy < 0 ? 1 : -1)));
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeText(lbl, tx, ty);
    ctx.fillStyle = '#0033cc'; ctx.fillText(lbl, tx, ty);
    ctx.restore();
  }

  function drawCluster(ctx, x, y, mountain, base, facing, label) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    // White outline only (no opaque box) so the floor plan stays fully visible underneath.
    function txt(s, px, py, fill) {
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeText(s, px, py);
      ctx.fillStyle = fill; ctx.fillText(s, px, py);
    }
    // mountain (山) green top-left, facing (向) red top-right
    ctx.font = 'bold 18px serif';
    txt(String(mountain), x - 13, y - 5, '#0a6e1f');
    txt(String(facing), x + 13, y - 5, '#cc0000');
    // base (運) small dark, bottom-center
    ctx.font = 'bold 12px serif';
    txt(String(base), x, y + 10, '#1a1008');
    // direction label
    ctx.font = 'bold 10px sans-serif';
    txt(label, x, y - 19, '#3a3a3a');
    ctx.restore();
  }

  // ── Actions ───────────────────────────────────────────────
  function onTap(ev) {
    if (!st.img) return;
    ev.preventDefault();
    var p = canvasPt(ev);
    if (st.centerMode === 'manual') {
      st.center = p; st.centerOutside = false;
      if (st.chart) {} // chart stays; user can redraw
      status('Center set. Press “Draw chart”.');
    } else {
      st.verts.push(p);
      status(st.verts.length + ' vertex point(s). Tap each corner, then “Draw chart”.');
    }
    redraw();
  }

  function draw() {
    var FS = getFS();
    if (!FS) { status('Flying Stars engine not loaded.', true); return; }
    if (!st.img) { status('Upload a floor plan first.', true); return; }
    st.facingDeg = clampDeg(parseFloat(els.deg.value));
    st.period = clampPeriod(parseInt(els.period.value, 10));
    els.deg.value = st.facingDeg; els.period.value = st.period;

    if (st.centerMode === 'auto') {
      if (st.verts.length < 3) { status('Tap at least 3 perimeter corners first.', true); return; }
      st.center = centroid(st.verts);
      st.centerOutside = !pointInPolygon(st.center, st.verts);
    } else {
      if (!st.center) { status('Tap a point to set the center first.', true); return; }
      st.centerOutside = false;
    }

    try {
      st.chart = FS.calculate(st.period, mountainFromDeg(st.facingDeg));
    } catch (e) { status('Calculation error: ' + (e && e.message || e), true); return; }

    redraw();
    var mtn = mountainFromDeg(st.facingDeg);
    var msg = 'Period ' + st.period + ' · facing ' + st.facingDeg + '° (' + mtn + ', ' + st.chart.facingDirection + ') · facing side: ' + st.facingSide + '.';
    if (st.centerOutside) msg += ' ⚠ The centroid falls OUTSIDE the outline (irregular plan) — review the missing-sector situation.';
    status(msg, st.centerOutside);
  }

  function clampDeg(v) { if (isNaN(v)) v = 0; v = ((v % 360) + 360) % 360; return Math.round(v * 10) / 10; }
  function clampPeriod(v) { if (isNaN(v)) v = 8; return Math.max(1, Math.min(9, v)); }
  function status(t, warn) { if (els.status) { els.status.textContent = t || ''; els.status.style.color = warn ? '#b00020' : '#555'; } }

  // ── UI build ──────────────────────────────────────────────
  function el(tag, attrs, txt) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function modeBtnStyle(active) {
    return 'flex:1;padding:7px;border:1px solid #5d4037;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;' +
      (active ? 'background:#5d4037;color:#fff;' : 'background:#fff;color:#5d4037;');
  }
  function sideBtnStyle(active) {
    return 'padding:6px 9px;border:1px solid #8a6a1f;border-radius:6px;cursor:pointer;font-size:12px;' +
      (active ? 'background:#8a6a1f;color:#fff;' : 'background:#fff;color:#8a6a1f;');
  }

  function open(opts) {
    opts = opts || {};
    if (typeof opts.facingDeg === 'number') st.facingDeg = clampDeg(opts.facingDeg);
    if (typeof opts.period === 'number') st.period = clampPeriod(opts.period);
    if (opts.facingSide && SIDE_OFFSET.hasOwnProperty(opts.facingSide)) st.facingSide = opts.facingSide;

    var old = document.getElementById('fps-overlay'); if (old) old.remove();

    var ov = el('div', { id: 'fps-overlay', style: 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:14px;' });
    var card = el('div', { style: 'background:#fff;border-radius:12px;max-width:940px;width:100%;padding:14px 16px;font-family:system-ui,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.35);' });

    var hd = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;' });
    hd.appendChild(el('h3', { style: 'margin:0;font-size:16px;color:#4a148c;' }, '🏠 Floor Plan Flying Stars'));
    var x = el('button', { style: 'border:0;background:transparent;font-size:22px;cursor:pointer;color:#888;' }, '✕');
    x.addEventListener('click', function () { ov.remove(); });
    hd.appendChild(x); card.appendChild(hd);

    // Controls row 1: upload + facing deg + period
    var row1 = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;' });
    var camBtn = el('label', { style: 'padding:7px 12px;border:0;border-radius:6px;background:#6a1b9a;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, '📷 Camera');
    var camInput = el('input', { type: 'file', accept: 'image/*', capture: 'environment', style: 'display:none;' });
    camBtn.appendChild(camInput);
    var galBtn = el('label', { style: 'padding:7px 12px;border:0;border-radius:6px;background:#8e24aa;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, '🖼️ Gallery / Files');
    var galInput = el('input', { type: 'file', accept: 'image/*', style: 'display:none;' });
    galBtn.appendChild(galInput);
    row1.appendChild(camBtn); row1.appendChild(galBtn);
    row1.appendChild(el('span', { style: 'font-size:12px;color:#555;' }, 'Facing °'));
    els.deg = el('input', { type: 'number', min: '0', max: '359', step: '0.1', value: String(st.facingDeg), style: 'width:74px;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    row1.appendChild(els.deg);
    row1.appendChild(el('span', { style: 'font-size:12px;color:#555;' }, 'Period'));
    els.period = el('input', { type: 'number', min: '1', max: '9', step: '1', value: String(st.period), style: 'width:56px;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    row1.appendChild(els.period);
    card.appendChild(row1);

    // Controls row 2: facing side
    var row2 = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;' });
    row2.appendChild(el('span', { style: 'font-size:12px;color:#555;margin-right:2px;' }, 'Facing is on the image:'));
    els.sideBtns = {};
    ['top', 'right', 'bottom', 'left'].forEach(function (s) {
      var b = el('button', { style: sideBtnStyle(st.facingSide === s) }, s.charAt(0).toUpperCase() + s.slice(1));
      b.addEventListener('click', function () {
        st.facingSide = s;
        Object.keys(els.sideBtns).forEach(function (k) { els.sideBtns[k].setAttribute('style', sideBtnStyle(k === s)); });
        if (st.chart) redraw();
      });
      els.sideBtns[s] = b; row2.appendChild(b);
    });
    card.appendChild(row2);

    // Controls row 3: center mode + actions
    var row3 = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;' });
    var modeWrap = el('div', { style: 'display:flex;gap:6px;flex:1;min-width:220px;' });
    els.autoBtn = el('button', { style: modeBtnStyle(st.centerMode === 'auto') }, 'Auto center (tap perimeter)');
    els.manBtn = el('button', { style: modeBtnStyle(st.centerMode === 'manual') }, 'Manual center (tap a point)');
    function setMode(m) {
      st.centerMode = m;
      els.autoBtn.setAttribute('style', modeBtnStyle(m === 'auto'));
      els.manBtn.setAttribute('style', modeBtnStyle(m === 'manual'));
      if (m === 'manual') { st.verts = []; }
      st.chart = null;
      status(m === 'auto' ? 'Auto: tap each perimeter corner, then “Draw chart”.' : 'Manual: tap any point to set the center.');
      redraw();
    }
    els.autoBtn.addEventListener('click', function () { setMode('auto'); });
    els.manBtn.addEventListener('click', function () { setMode('manual'); });
    modeWrap.appendChild(els.autoBtn); modeWrap.appendChild(els.manBtn);
    row3.appendChild(modeWrap);

    var undo = el('button', { style: 'padding:7px 10px;border:1px solid #999;border-radius:6px;background:#fff;color:#444;font-size:12px;cursor:pointer;' }, 'Undo point');
    undo.addEventListener('click', function () { if (st.centerMode === 'auto') st.verts.pop(); else st.center = null; st.chart = null; redraw(); status(''); });
    var clr = el('button', { style: 'padding:7px 10px;border:1px solid #999;border-radius:6px;background:#fff;color:#444;font-size:12px;cursor:pointer;' }, 'Clear points');
    clr.addEventListener('click', function () { st.verts = []; st.center = null; st.chart = null; redraw(); status(''); });
    var drawBtn = el('button', { style: 'padding:7px 14px;border:0;border-radius:6px;background:#2e7d32;color:#fff;font-size:13px;font-weight:700;cursor:pointer;' }, 'Draw chart');
    drawBtn.addEventListener('click', draw);
    row3.appendChild(undo); row3.appendChild(clr); row3.appendChild(drawBtn);
    card.appendChild(row3);

    // Canvas
    var canvasWrap = el('div', { style: 'border:1px solid #ddd;border-radius:8px;overflow:auto;max-height:60vh;background:#fafafa;display:flex;justify-content:center;' });
    els.canvas = el('canvas', { style: 'touch-action:none;display:block;max-width:100%;' });
    var ph = el('div', { id: 'fps-ph', style: 'padding:40px 16px;color:#999;font-size:13px;text-align:center;' }, 'Add a floor plan with 📷 Camera (take a photo now) or 🖼️ Gallery / Files (existing image — Google Drive is available here too). Then choose Auto (tap the corners) or Manual (tap one point), set the facing degree/side and period, and press “Draw chart”.');
    canvasWrap.appendChild(ph);
    canvasWrap.appendChild(els.canvas);
    els.canvas.style.display = 'none';
    card.appendChild(canvasWrap);

    els.status = el('div', { style: 'font-size:12px;color:#555;margin-top:8px;min-height:16px;line-height:1.4;' }, '');
    card.appendChild(els.status);

    card.appendChild(el('div', { style: 'font-size:11px;color:#999;margin-top:6px;line-height:1.5;' },
      'Each palace shows mountain star (山, green) · facing star (向, red) · base star (運, small). The grid is rotated to match the plan as uploaded — the image itself is not rotated.'));

    ov.appendChild(card); document.body.appendChild(ov);

    // wire file + taps
    function loadFile(e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          st.img = im; st.verts = []; st.center = null; st.chart = null;
          ph.style.display = 'none'; els.canvas.style.display = 'block';
          fitCanvas(); redraw();
          status(st.centerMode === 'auto' ? 'Tap each perimeter corner, then “Draw chart”.' : 'Tap any point to set the center.');
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
      try { e.target.value = ''; } catch (_) {} // allow re-picking the same file
    }
    camInput.addEventListener('change', loadFile);
    galInput.addEventListener('change', loadFile);
    els.canvas.addEventListener('pointerdown', onTap);
    // fallback for browsers without Pointer Events
    if (!('PointerEvent' in window)) {
      els.canvas.addEventListener('touchstart', onTap, { passive: false });
      els.canvas.addEventListener('mousedown', onTap);
    }
    window.addEventListener('resize', function () { if (st.img && document.getElementById('fps-overlay')) { fitCanvas(); redraw(); } });
  }

  window.FloorPlanStars = { open: open };
})();

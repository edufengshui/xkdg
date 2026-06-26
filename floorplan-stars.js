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
    centerMode: 'rect',          // 'rect' (draw rectangles) | 'manual' (tap a point)
    rects: [],                   // [{x0,y0,x1,y1}] rectangles covering the area
    drag: null,                  // {x0,y0,x1,y1} rectangle being dragged
    pending: null,               // {x,y} first tapped corner (two-tap rectangle)
    center: null, chart: null, centerOutside: false
  };

  var els = {}; // cached DOM refs

  // ── Geometry ──────────────────────────────────────────────
  function normRect(r) {
    return { x0: Math.min(r.x0, r.x1), y0: Math.min(r.y0, r.y1), x1: Math.max(r.x0, r.x1), y1: Math.max(r.y0, r.y1) };
  }
  function inAnyRect(pt, rects) {
    return rects.some(function (r) { return pt.x >= r.x0 && pt.x <= r.x1 && pt.y >= r.y0 && pt.y <= r.y1; });
  }
  // Centroid of the UNION of rectangles, by area sampling — correct even if
  // rectangles overlap (overlap is counted once, not twice).
  function unionCentroid(rects) {
    if (!rects || !rects.length) return null;
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    rects.forEach(function (r) { minx = Math.min(minx, r.x0); miny = Math.min(miny, r.y0); maxx = Math.max(maxx, r.x1); maxy = Math.max(maxy, r.y1); });
    var step = Math.max(2, Math.round(Math.min(maxx - minx, maxy - miny) / 120)); // ~120 samples across the smaller side
    var sx = 0, sy = 0, n = 0;
    for (var y = miny; y <= maxy; y += step) {
      for (var x = minx; x <= maxx; x += step) {
        for (var k = 0; k < rects.length; k++) {
          var r = rects[k];
          if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) { sx += x; sy += y; n++; break; }
        }
      }
    }
    if (!n) return null;
    return { x: sx / n, y: sy / n };
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
    var nW = st.img.naturalWidth || st.img.width;
    var nH = st.img.naturalHeight || st.img.height;
    // Fit within BOTH the available width and height (minus room for the toolbar),
    // so a wide/tall plan is fully visible inside the modal — no overflow.
    var maxW = Math.min(window.innerWidth - 40, 1040);
    var maxH = Math.max(260, window.innerHeight - 260);
    var scale = Math.min(1, maxW / nW, maxH / nH);
    st.drawW = Math.max(1, Math.round(nW * scale));
    st.drawH = Math.max(1, Math.round(nH * scale));
    var c = els.canvas;
    c.width = st.drawW; c.height = st.drawH;
    // Keep the on-screen display aspect-correct and bounded. The inline
    // !important properties beat any global `canvas { … }` rule, so the plan can
    // neither stretch nor overflow. aspect-ratio enforces the true proportions.
    c.style.setProperty('width', '100%', 'important');
    c.style.setProperty('height', 'auto', 'important');
    c.style.setProperty('aspect-ratio', st.drawW + ' / ' + st.drawH, 'important');
    c.style.setProperty('max-width', st.drawW + 'px', 'important');
    c.style.setProperty('max-height', st.drawH + 'px', 'important');
    c.style.setProperty('align-self', 'flex-start', 'important');
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

    // rectangles covering the area (rect mode) + live drag preview
    // (skipped when building a clean composite snapshot for the in-place view)
    if (!st._clean && st.centerMode === 'rect') {
      ctx.save();
      ctx.lineWidth = 2; ctx.strokeStyle = '#1565c0'; ctx.fillStyle = 'rgba(21,101,192,0.08)';
      st.rects.forEach(function (r) {
        ctx.beginPath(); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.fill(); ctx.stroke();
      });
      if (st.drag) {
        var d = normRect(st.drag);
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.rect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (st.pending) {
        ctx.beginPath(); ctx.arc(st.pending.x, st.pending.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#1565c0'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    }

    if (st.center) {
      if (st.chart) {
        drawPie(ctx, st.center); // includes the central palace cluster at the center
      } else if (!st._clean) {
        // center marker (shown until the chart is drawn)
        ctx.save();
        ctx.beginPath(); ctx.arc(st.center.x, st.center.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = st.centerOutside ? '#b00020' : '#222'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      }
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
    // central palace (Heaven Heart) drawn at the center point
    drawCluster(ctx, ctr.x, ctr.y, st.chart.sittingStars[4], st.chart.baseStars[4], st.chart.facingStars[4], '中');
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
  // In 'rect' mode you can either DRAG a rectangle, or TAP two opposite corners.
  // In 'manual' mode a single tap sets the center.
  var _down = null, _moved = false;
  function onDown(ev) {
    if (!st.img) return;
    ev.preventDefault();
    try { if (ev.pointerId != null && els.canvas.setPointerCapture) els.canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    var p = canvasPt(ev);
    if (st.centerMode === 'manual') {
      st.center = p; st.centerOutside = false; st.pending = null;
      status('Center set. Set facing/period, then “Draw chart”.');
      redraw();
      return;
    }
    _down = p; _moved = false;
    st.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  }
  function onMove(ev) {
    if (!st.drag || !_down) return;
    ev.preventDefault();
    var p = canvasPt(ev);
    st.drag.x1 = p.x; st.drag.y1 = p.y;
    if (Math.abs(p.x - _down.x) > 4 || Math.abs(p.y - _down.y) > 4) _moved = true;
    redraw();
  }
  function onUp(ev) {
    if (st.centerMode !== 'rect') { st.drag = null; return; }
    var end = st.drag ? { x: st.drag.x1, y: st.drag.y1 } : null;
    st.drag = null;
    if (!_down) { redraw(); return; }
    var dragged = _moved && end && Math.hypot(end.x - _down.x, end.y - _down.y) > 8;

    if (dragged) {
      var d = normRect({ x0: _down.x, y0: _down.y, x1: end.x, y1: end.y });
      if ((d.x1 - d.x0) > 6 && (d.y1 - d.y0) > 6) { st.rects.push(d); st.center = null; st.chart = null; }
      st.pending = null;
      status(st.rects.length + ' rectangle(s). Add more or press “Find center”.');
    } else {
      // tap → two-tap rectangle (first corner, then opposite corner)
      if (!st.pending) {
        st.pending = { x: _down.x, y: _down.y };
        status('First corner set — tap the opposite corner (or drag) to make a rectangle.');
      } else {
        var r = normRect({ x0: st.pending.x, y0: st.pending.y, x1: _down.x, y1: _down.y });
        st.pending = null;
        if ((r.x1 - r.x0) > 6 && (r.y1 - r.y0) > 6) {
          st.rects.push(r); st.center = null; st.chart = null;
          status(st.rects.length + ' rectangle(s). Add more or press “Find center”.');
        } else {
          status('Rectangle too small — tap two corners further apart.', true);
        }
      }
    }
    _down = null; _moved = false;
    redraw();
  }

  function findCenter() {
    if (st.centerMode === 'manual') { status('Manual mode: tap a point on the plan to set the center.'); return; }
    if (!st.rects.length) { status('Draw at least one rectangle over the plan first.', true); return; }
    st.pending = null;
    st.center = unionCentroid(st.rects);
    st.centerOutside = st.center ? !inAnyRect(st.center, st.rects) : false;
    st.chart = null;
    redraw();
    var msg = 'Center found from ' + st.rects.length + ' rectangle(s). Set facing/period, then “Draw chart”.';
    if (st.centerOutside) msg += ' ⚠ The center falls in a gap between rectangles (irregular plan) — review the missing-sector situation.';
    status(msg, st.centerOutside);
  }

  function draw() {
    var FS = getFS();
    if (!FS) { status('Flying Stars engine not loaded.', true); return; }
    if (!st.img) { status('Upload a floor plan first.', true); return; }
    st.facingDeg = clampDeg(parseFloat(els.deg.value));
    st.period = clampPeriod(parseInt(els.period.value, 10));
    els.deg.value = st.facingDeg; els.period.value = st.period;

    if (st.centerMode === 'rect') {
      if (!st.center) { // compute it now if the user skipped Find center
        if (!st.rects.length) { status('Draw rectangle(s) over the plan, then “Find center”.', true); return; }
        st.center = unionCentroid(st.rects);
        st.centerOutside = st.center ? !inAnyRect(st.center, st.rects) : false;
      }
      if (!st.center) { status('Could not compute the center — redraw the rectangles.', true); return; }
    } else {
      if (!st.center) { status('Tap a point to set the center first.', true); return; }
      st.centerOutside = false;
    }

    try {
      var computed = FS.calculate(st.period, mountainFromDeg(st.facingDeg));
      if (st.manualChart) {
        // Use the manually edited stars; keep the computed facing direction /
        // mountain only as labels (the star numbers come from the manual chart).
        st.chart = {
          sittingStars: st.manualChart.sittingStars.slice(),
          baseStars:    st.manualChart.baseStars.slice(),
          facingStars:  st.manualChart.facingStars.slice(),
          facingDirection: computed ? computed.facingDirection : '',
          facingMountain:  st.manualChart.facingMountain || (computed ? computed.facingMountain : ''),
          _manual: true
        };
      } else {
        st.chart = computed;
      }
    } catch (e) { status('Calculation error: ' + (e && e.message || e), true); return; }

    redraw();
    var mtn = mountainFromDeg(st.facingDeg);
    var msg = 'Period ' + st.period + ' · facing ' + st.facingDeg + '° (' + mtn + ', ' + st.chart.facingDirection + ') · facing side: ' + st.facingSide + '.'
            + (st.manualChart ? ' ⭐ Using the saved MANUAL chart.' : '');
    if (st.centerOutside) msg += ' ⚠ The center falls outside the covered area (irregular plan) — review the missing-sector situation.';
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

  // Re-encode an image to a compact JPEG data URL (capped size) so it can be
  // persisted in localStorage without blowing the quota.
  function compressImageToDataURL(img, maxDim, quality) {
    var nW = img.naturalWidth || img.width, nH = img.naturalHeight || img.height;
    if (!nW || !nH) return null;
    var scale = Math.min(1, maxDim / Math.max(nW, nH));
    var w = Math.max(1, Math.round(nW * scale)), h = Math.max(1, Math.round(nH * scale));
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
    try { return cv.toDataURL('image/jpeg', quality); }
    catch (e) { try { return cv.toDataURL(); } catch (e2) { return null; } }
  }

  function open(opts) {
    opts = opts || {};
    if (typeof opts.facingDeg === 'number') st.facingDeg = clampDeg(opts.facingDeg);
    if (typeof opts.period === 'number') st.period = clampPeriod(opts.period);
    if (opts.facingSide && SIDE_OFFSET.hasOwnProperty(opts.facingSide)) st.facingSide = opts.facingSide;
    // Saved MANUAL chart (replacement / changement chart). When present, "Draw
    // chart" uses these hand-edited stars instead of recomputing from facing+period.
    st.manualChart = (opts.manualChart && opts.manualChart.sittingStars && opts.manualChart.facingStars && opts.manualChart.baseStars)
      ? opts.manualChart : null;

    var old = document.getElementById('fps-overlay'); if (old) old.remove();

    var ov = el('div', { id: 'fps-overlay', style: 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:14px;' });
    var card = el('div', { style: 'background:#fff;border-radius:12px;max-width:1100px;width:100%;padding:14px 16px;font-family:system-ui,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.35);' });

    var hd = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;' });
    hd.appendChild(el('h3', { style: 'margin:0;font-size:16px;color:#4a148c;' }, '🏠 Floor Plan Flying Stars' + (opts.houseName ? ' — ' + opts.houseName : '')));
    var x = el('button', { style: 'border:0;background:transparent;font-size:22px;cursor:pointer;color:#888;' }, '✕');
    x.addEventListener('click', function () { ov.remove(); });
    hd.appendChild(x); card.appendChild(hd);

    // Stand-alone mode (no onSave from caller): the user opened the tool outside
    // a specific house, so there is no "Save to house" button. Make this obvious
    // and tell them exactly how to land in the flow where saving works.
    if (typeof opts.onSave !== 'function') {
      var warn = el('div', { style:
        'margin:0 0 10px 0;padding:10px 12px;border-radius:8px;'
      + 'background:#fff8e1;border:1px solid #f9a825;color:#5d4037;'
      + 'font-size:13px;line-height:1.4;' });
      warn.innerHTML =
        '<div style="font-weight:700;margin-bottom:4px;">\u26A0\uFE0F Read-only \u2014 you cannot save here</div>'
      + 'To <b>save the floor plan to a house</b>, close this window and open it from your house card:'
      + '<div style="margin-top:6px;">Feng Shui section \u2192 your house \u2192 the brown button '
      + '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#5d4037;color:#fff;font-size:11px;font-weight:700;">\uD83D\uDCD0 Import a floorplan</span>.</div>'
      + '<div style="margin-top:6px;font-size:12px;color:#7a5a3a;">Only that route shows the '
      + '<span style="display:inline-block;padding:1px 6px;border-radius:3px;background:#5d4037;color:#fff;font-size:11px;font-weight:700;">\uD83D\uDCBE Save to house</span> button.</div>';
      card.appendChild(warn);
    }

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
    els.autoBtn = el('button', { style: modeBtnStyle(st.centerMode === 'rect') }, 'Rectangles (drag to cover area)');
    els.manBtn = el('button', { style: modeBtnStyle(st.centerMode === 'manual') }, 'Manual center (tap a point)');
    function setMode(m) {
      st.centerMode = m;
      els.autoBtn.setAttribute('style', modeBtnStyle(m === 'rect'));
      els.manBtn.setAttribute('style', modeBtnStyle(m === 'manual'));
      st.center = null; st.chart = null; st.drag = null; st.pending = null;
      if (m === 'manual') st.rects = [];
      status(m === 'rect' ? 'Drag, or tap two opposite corners, to draw rectangles covering the plan; then “Find center”.' : 'Tap any point to set the center.');
      redraw();
    }
    els.autoBtn.addEventListener('click', function () { setMode('rect'); });
    els.manBtn.addEventListener('click', function () { setMode('manual'); });
    modeWrap.appendChild(els.autoBtn); modeWrap.appendChild(els.manBtn);
    row3.appendChild(modeWrap);

    var findBtn = el('button', { style: 'padding:7px 12px;border:0;border-radius:6px;background:#5d4037;color:#fff;font-size:12px;font-weight:600;cursor:pointer;' }, 'Find center');
    findBtn.addEventListener('click', findCenter);
    var undo = el('button', { style: 'padding:7px 10px;border:1px solid #999;border-radius:6px;background:#fff;color:#444;font-size:12px;cursor:pointer;' }, 'Undo');
    undo.addEventListener('click', function () { if (st.centerMode === 'rect') { if (st.pending) st.pending = null; else st.rects.pop(); } st.center = null; st.chart = null; redraw(); status(''); });
    var clr = el('button', { style: 'padding:7px 10px;border:1px solid #999;border-radius:6px;background:#fff;color:#444;font-size:12px;cursor:pointer;' }, 'Clear');
    clr.addEventListener('click', function () { st.rects = []; st.center = null; st.chart = null; st.drag = null; st.pending = null; redraw(); status(''); });
    var drawBtn = el('button', { style: 'padding:7px 14px;border:0;border-radius:6px;background:#2e7d32;color:#fff;font-size:13px;font-weight:700;cursor:pointer;' }, 'Draw chart');
    drawBtn.addEventListener('click', draw);
    row3.appendChild(findBtn); row3.appendChild(undo); row3.appendChild(clr); row3.appendChild(drawBtn);
    if (typeof opts.onSave === 'function') {
      var saveBtn = el('button', { style: 'padding:7px 14px;border:0;border-radius:6px;background:#5d4037;color:#fff;font-size:13px;font-weight:700;cursor:pointer;' }, '💾 Save to house');
      saveBtn.addEventListener('click', doSave);
      row3.appendChild(saveBtn);
    }
    card.appendChild(row3);

    // Canvas
    var canvasWrap = el('div', { style: 'border:1px solid #ddd;border-radius:8px;overflow:auto;background:#fafafa;display:flex;justify-content:center;align-items:flex-start;' });
    els.canvas = el('canvas', { style: 'touch-action:none;display:block;max-width:100%;' });
    var ph = el('div', { id: 'fps-ph', style: 'padding:40px 16px;color:#999;font-size:13px;text-align:center;' }, 'Add a floor plan with 📷 Camera (take a photo now) or 🖼️ Gallery / Files (existing image — Google Drive is available here too). Then mark the area: drag rectangles, or tap two opposite corners, covering the plan (several if needed), and press “Find center”. Finally set the facing degree/side and period, and press “Draw chart”.');
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
          st.img = im; st.rects = []; st.drag = null; st.pending = null; st.center = null; st.chart = null;
          ph.style.display = 'none'; els.canvas.style.display = 'block';
          fitCanvas(); redraw();
          status(st.centerMode === 'rect' ? 'Drag, or tap two opposite corners, to draw rectangles covering the plan; then “Find center”.' : 'Tap any point to set the center.');
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
      try { e.target.value = ''; } catch (_) {} // allow re-picking the same file
    }
    camInput.addEventListener('change', loadFile);
    galInput.addEventListener('change', loadFile);

    if ('PointerEvent' in window) {
      els.canvas.addEventListener('pointerdown', onDown);
      els.canvas.addEventListener('pointermove', onMove);
      els.canvas.addEventListener('pointerup', onUp);
      els.canvas.addEventListener('pointercancel', function () { st.drag = null; redraw(); });
    } else {
      els.canvas.addEventListener('touchstart', onDown, { passive: false });
      els.canvas.addEventListener('touchmove', onMove, { passive: false });
      els.canvas.addEventListener('touchend', onUp);
      els.canvas.addEventListener('mousedown', onDown);
      els.canvas.addEventListener('mousemove', onMove);
      els.canvas.addEventListener('mouseup', onUp);
    }
    window.addEventListener('resize', function () { if (st.img && document.getElementById('fps-overlay')) { fitCanvas(); redraw(); } });

    // ── Persistence: build a compact saved object / restore one ──
    // Clean composite (plan + flying stars, no editing rectangles), scaled and
    // JPEG-encoded — this is what the in-place "show in place of the luopan" view
    // displays large. Restores the editing redraw afterwards.
    function compositeToDataURL(maxDim, quality) {
      try {
        if (!st.img) return null;
        st._clean = true; redraw(); st._clean = false;
        var src = els.canvas;
        var sw = src.width || 1, sh = src.height || 1;
        var scale = Math.min(1, maxDim / Math.max(sw, sh));
        var w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d');
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
        cx.drawImage(src, 0, 0, w, h);
        var url = null;
        try { url = cv.toDataURL('image/jpeg', quality); }
        catch (e) { try { url = cv.toDataURL(); } catch (e2) { url = null; } }
        redraw();
        return url;
      } catch (e) { try { st._clean = false; redraw(); } catch (_) {} return null; }
    }
    function buildSaved() {
      if (!st.img) return null;
      var dW = st.drawW || 1, dH = st.drawH || 1;
      var rectsF = (st.rects || []).map(function (r) { return { x0: r.x0 / dW, y0: r.y0 / dH, x1: r.x1 / dW, y1: r.y1 / dH }; });
      var centerF = st.center ? { x: st.center.x / dW, y: st.center.y / dH } : null;
      var imgData = compressImageToDataURL(st.img, 1100, 0.72);
      if (!imgData) return null;
      return {
        imgData: imgData,
        starsImg: compositeToDataURL(1100, 0.72) || imgData,
        facingDeg: st.facingDeg, facingSide: st.facingSide, period: st.period,
        centerMode: st.centerMode, rectsF: rectsF, centerF: centerF,
        savedAt: Date.now()
      };
    }
    // Build a save object at a given (maxDim, quality) — used by the retry ladder.
    function buildSavedAt(maxDim, quality) {
      if (!st.img) return null;
      var dW = st.drawW || 1, dH = st.drawH || 1;
      var rectsF = (st.rects || []).map(function (r) { return { x0: r.x0 / dW, y0: r.y0 / dH, x1: r.x1 / dW, y1: r.y1 / dH }; });
      var centerF = st.center ? { x: st.center.x / dW, y: st.center.y / dH } : null;
      var imgData = compressImageToDataURL(st.img, maxDim, quality);
      if (!imgData) return null;
      return {
        imgData: imgData,
        starsImg: compositeToDataURL(maxDim, quality) || imgData,
        facingDeg: st.facingDeg, facingSide: st.facingSide, period: st.period,
        centerMode: st.centerMode, rectsF: rectsF, centerF: centerF,
        savedAt: Date.now()
      };
    }
    function doSave() {
      if (!st.img) { status('Add a floor plan first.', true); return; }
      st.facingDeg = clampDeg(parseFloat(els.deg.value));
      st.period = clampPeriod(parseInt(els.period.value, 10));
      els.deg.value = st.facingDeg; els.period.value = st.period;
      // Compression ladder: try progressively smaller / lower-quality encodings until
      // localStorage accepts the payload. Most plans go through at the first step;
      // very large camera photos may need a step down or two.
      var ladder = [ [1100, 0.72], [900, 0.65], [750, 0.58], [600, 0.5] ];
      var ok = false, lastErr = null, used = null;
      for (var i = 0; i < ladder.length && !ok; i++) {
        var obj = null;
        try { obj = buildSavedAt(ladder[i][0], ladder[i][1]); } catch (e) { lastErr = e; obj = null; }
        if (!obj) { lastErr = lastErr || new Error('encode-failed'); continue; }
        try {
          var ret = opts.onSave(obj);
          if (ret !== false) { ok = true; used = ladder[i]; }
          else { lastErr = new Error('quota'); }
        } catch (e) { lastErr = e; }
      }
      if (ok) {
        var note = (used && used[0] < 1100) ? ' (image downscaled to fit storage)' : '';
        status('Floor plan saved to this house \u2713' + note, false);
      } else {
        var msg = (lastErr && /quota/i.test(String(lastErr && lastErr.name || lastErr))) ?
          'Storage is full — remove an unused house or another saved floor plan, then try again.' :
          'Could not save the floor plan. Try removing other large items from this app, or use a smaller image.';
        status(msg, true);
      }
    }
    function restoreSaved(s) {
      st.facingDeg = clampDeg(s.facingDeg);
      st.period = clampPeriod(s.period);
      if (s.facingSide && SIDE_OFFSET.hasOwnProperty(s.facingSide)) st.facingSide = s.facingSide;
      st.centerMode = (s.centerMode === 'manual') ? 'manual' : 'rect';
      els.deg.value = st.facingDeg; els.period.value = st.period;
      try { Object.keys(els.sideBtns).forEach(function (k) { els.sideBtns[k].setAttribute('style', sideBtnStyle(k === st.facingSide)); }); } catch (e) {}
      try { els.autoBtn.setAttribute('style', modeBtnStyle(st.centerMode === 'rect')); els.manBtn.setAttribute('style', modeBtnStyle(st.centerMode === 'manual')); } catch (e) {}
      var im = new Image();
      im.onload = function () {
        st.img = im; st.drag = null; st.pending = null;
        ph.style.display = 'none'; els.canvas.style.display = 'block';
        fitCanvas();
        var dW = st.drawW || 1, dH = st.drawH || 1;
        st.rects = (s.rectsF || []).map(function (r) { return { x0: r.x0 * dW, y0: r.y0 * dH, x1: r.x1 * dW, y1: r.y1 * dH }; });
        st.center = s.centerF ? { x: s.centerF.x * dW, y: s.centerF.y * dH } : null;
        st.centerOutside = (st.center && st.centerMode === 'rect') ? !inAnyRect(st.center, st.rects) : false;
        var FS = getFS();
        if (FS && st.center) { try { st.chart = FS.calculate(st.period, mountainFromDeg(st.facingDeg)); } catch (e) { st.chart = null; } }
        else { st.chart = null; }
        redraw();
        status('Saved floor plan loaded \u2014 edit if needed, then \u201C\uD83D\uDCBE Save to house\u201D.');
      };
      im.src = s.imgData;
    }

    if (opts.saved && opts.saved.imgData) { try { restoreSaved(opts.saved); } catch (e) {} }
  }

  // Headless: render a saved floor plan + its flying stars to a composite JPEG
  // data URL, WITHOUT opening the modal. Reuses the exact modal renderer (drawPie)
  // so the stars match the editor / luopan. Async (image load): cb(dataURL | null).
  // Used for plans saved before the stars-snapshot feature, so the in-place view
  // always shows the chart, never the bare plan.
  function renderComposite(saved, cb) {
    cb = cb || function () {};
    try {
      if (!saved || !saved.imgData) { cb(null); return; }
      var im = new Image();
      im.onload = function () {
        // back up module state so an open editor (if any) is not disturbed
        var bak = { drawW: st.drawW, drawH: st.drawH, chart: st.chart,
                    facingDeg: st.facingDeg, facingSide: st.facingSide, period: st.period };
        try {
          var nW = im.naturalWidth || im.width, nH = im.naturalHeight || im.height;
          var scale = Math.min(1, 1100 / Math.max(nW, nH));
          var dW = Math.max(1, Math.round(nW * scale)), dH = Math.max(1, Math.round(nH * scale));
          var cv = document.createElement('canvas'); cv.width = dW; cv.height = dH;
          var ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dW, dH);
          ctx.drawImage(im, 0, 0, dW, dH);
          st.drawW = dW; st.drawH = dH;
          st.facingDeg = clampDeg(saved.facingDeg);
          st.facingSide = (saved.facingSide && SIDE_OFFSET.hasOwnProperty(saved.facingSide)) ? saved.facingSide : 'top';
          st.period = clampPeriod(saved.period);
          var center = saved.centerF ? { x: saved.centerF.x * dW, y: saved.centerF.y * dH } : null;
          var FS = getFS();
          st.chart = (FS && center) ? (function () { try { return FS.calculate(st.period, mountainFromDeg(st.facingDeg)); } catch (e) { return null; } })() : null;
          if (center && st.chart) drawPie(ctx, center);
          var url = null;
          try { url = cv.toDataURL('image/jpeg', 0.72); } catch (e) { try { url = cv.toDataURL(); } catch (e2) { url = null; } }
          st.drawW = bak.drawW; st.drawH = bak.drawH; st.chart = bak.chart;
          st.facingDeg = bak.facingDeg; st.facingSide = bak.facingSide; st.period = bak.period;
          cb(url || saved.imgData);
        } catch (e) {
          st.drawW = bak.drawW; st.drawH = bak.drawH; st.chart = bak.chart;
          st.facingDeg = bak.facingDeg; st.facingSide = bak.facingSide; st.period = bak.period;
          cb(saved.imgData);
        }
      };
      im.onerror = function () { cb(saved.imgData || null); };
      im.src = saved.imgData;
    } catch (e) { cb((saved && saved.imgData) || null); }
  }

  window.FloorPlanStars = { open: open, renderComposite: renderComposite };
})();

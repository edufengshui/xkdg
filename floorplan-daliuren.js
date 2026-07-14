// ============================================================
// floorplan-daliuren.js  —  Da Liu Ren ANNUAL chart overlay
//
// A twin of floorplan-stars.js, but for the Da Liu Ren annual Feng Shui
// chart. It draws a 12-sector "luopan" (one 30 degree palace per earth
// branch) either on a blank wheel or overlaid on the SAME saved floor-plan
// photo used by Flying Stars, with the annual GREEN / RED / hollow-green
// judgement from daliuren-fengshui.js.
//
// Design notes:
//   - It is ISOLATED from Flying Stars. It reuses the active house's saved
//     Flying-Stars floor plan (photo + centre) so the user never re-uploads;
//     if there is no saved plan it still works as a bare annual wheel.
//   - It reads the ACTIVE house facing (editable in the modal) and takes a
//     FREE year selector (past / present / future).
//   - It self-mounts a floating "DLR" button inside #fs-canvas-wrap, matching
//     the sun-moon / orient floating-button pattern (that row survives the
//     mode-toggle relocation done by _fsBuildZoneGate).
//
// Depends on: window.XKDGDaLiuRenFS (daliuren-fengshui.js) which itself needs
//             window.XKDGDaLiuRen (daliuren.js) + window.Lunar (lunar-javascript).
// Optional host helpers (from app-fengshui.js), resolved safely if present:
//   _fsActiveHouseFloorCtx, _fsFloorFacing, _fsHousesSave.
//
// Public API: window.FloorPlanDLR.open(opts?) / .mount()
//   opts = { year?:Number, facingDeg?:Number, facingSide?:'top'|'bottom'|'left'|'right',
//            saved?:<FS floorplan obj>, houseName?:String }
// ============================================================

(function () {
  'use strict';

  // ── engine + optional host helpers ──────────────────────────
  function DLR() {
    try { if (typeof XKDGDaLiuRenFS !== 'undefined' && XKDGDaLiuRenFS) return XKDGDaLiuRenFS; } catch (e) {}
    return (typeof window !== 'undefined' && window.XKDGDaLiuRenFS) ? window.XKDGDaLiuRenFS : null;
  }
  function host(name) {
    try { if (typeof window !== 'undefined' && typeof window[name] === 'function') return window[name]; } catch (e) {}
    try { /* jshint evil:true */ var f = eval(name); if (typeof f === 'function') return f; } catch (e) {}
    return null;
  }

  var BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  function bIdx(b) { return BRANCHES.indexOf(b); }
  // Earth branch → compass degree of its palace centre (子 = 0 = North, +30 CW).
  function branchDeg(b) { return bIdx(b) * 30; }

  var SIDE_OFFSET = { top: 0, right: 90, bottom: 180, left: 270 };

  var st = {
    img: null, drawW: 0, drawH: 0,
    year: (new Date()).getFullYear(),
    facingDeg: 180, facingSide: 'top',
    center: null,        // {x,y} in canvas px (house centroid, or canvas centre)
    result: null,        // last XKDGDaLiuRenFS.build() output
    houseName: ''
  };
  var els = {};

  // ── orientation (identical convention to floorplan-stars) ───
  function imageUpDeg() {
    var off = SIDE_OFFSET[st.facingSide] || 0;
    return (((st.facingDeg - off) % 360) + 360) % 360;
  }
  function canvasAngle(D) {
    var up = imageUpDeg();
    var phi = (((270 + D - up) % 360) + 360) % 360;
    return phi * Math.PI / 180;
  }
  function clampDeg(v) { if (isNaN(v)) v = 0; v = ((v % 360) + 360) % 360; return Math.round(v * 10) / 10; }
  function clampYear(v) { if (isNaN(v)) v = (new Date()).getFullYear(); return Math.max(1900, Math.min(2200, Math.round(v))); }

  // ── canvas sizing ───────────────────────────────────────────
  function fitCanvas() {
    var c = els.canvas;
    var maxW = Math.min((typeof window !== 'undefined' ? window.innerWidth : 800) - 40, 1040);
    var maxH = Math.max(260, (typeof window !== 'undefined' ? window.innerHeight : 700) - 260);
    if (st.img) {
      var nW = st.img.naturalWidth || st.img.width;
      var nH = st.img.naturalHeight || st.img.height;
      var scale = Math.min(1, maxW / nW, maxH / nH);
      st.drawW = Math.max(1, Math.round(nW * scale));
      st.drawH = Math.max(1, Math.round(nH * scale));
    } else {
      // bare wheel: a square canvas that fits the modal
      var side = Math.max(280, Math.min(maxW, maxH, 760));
      st.drawW = side; st.drawH = side;
    }
    c.width = st.drawW; c.height = st.drawH;
    c.style.setProperty('width', '100%', 'important');
    c.style.setProperty('height', 'auto', 'important');
    c.style.setProperty('aspect-ratio', st.drawW + ' / ' + st.drawH, 'important');
    c.style.setProperty('max-width', st.drawW + 'px', 'important');
    c.style.setProperty('max-height', st.drawH + 'px', 'important');
    c.style.setProperty('align-self', 'flex-start', 'important');
  }

  function centerPoint() {
    if (st.center) return st.center;
    return { x: st.drawW / 2, y: st.drawH / 2 };
  }

  // ── colours ─────────────────────────────────────────────────
  var GREEN = '#0a6e1f', RED = '#c30000', INK = '#1a1008', GREY = '#5a5a5a';

  function reachToEdge(cx, cy, dx, dy, w, h, m) {
    var ts = [];
    if (dx > 1e-6) ts.push((w - m - cx) / dx); else if (dx < -1e-6) ts.push((m - cx) / dx);
    if (dy > 1e-6) ts.push((h - m - cy) / dy); else if (dy < -1e-6) ts.push((m - cy) / dy);
    var t = Infinity; ts.forEach(function (v) { if (v > 0 && v < t) t = v; });
    return isFinite(t) ? t : 0.4 * Math.min(w, h);
  }

  // ── main draw ───────────────────────────────────────────────
  function redraw() {
    var c = els.canvas, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    if (st.img) {
      ctx.drawImage(st.img, 0, 0, st.drawW, st.drawH);
    } else {
      // bare annual wheel background
      ctx.fillStyle = '#fbf8f2'; ctx.fillRect(0, 0, st.drawW, st.drawH);
      var ctr0 = centerPoint();
      var Rw = 0.44 * Math.min(st.drawW, st.drawH);
      ctx.save();
      ctx.beginPath(); ctx.arc(ctr0.x, ctr0.y, Rw, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(90,55,20,0.55)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(ctr0.x, ctr0.y, Rw * 0.36, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(90,55,20,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }

    var ctr = centerPoint();

    // 12 sector boundary rays (at branch-centre - 15 degrees)
    var R = Math.hypot(Math.max(ctr.x, st.drawW - ctr.x), Math.max(ctr.y, st.drawH - ctr.y)) + 12;
    if (st.img) { R = Math.min(R, 0.5 * Math.min(st.drawW, st.drawH)); }
    else { R = 0.44 * Math.min(st.drawW, st.drawH); }
    ctx.save();
    ctx.strokeStyle = st.img ? 'rgba(90,55,20,0.75)' : 'rgba(90,55,20,0.45)';
    ctx.lineWidth = 1.25;
    for (var k = 0; k < 12; k++) {
      var a = canvasAngle(k * 30 - 15);
      ctx.beginPath(); ctx.moveTo(ctr.x, ctr.y); ctx.lineTo(ctr.x + R * Math.cos(a), ctr.y + R * Math.sin(a)); ctx.stroke();
    }
    ctx.restore();

    // per-sector clusters (only if we have a computed chart)
    if (st.result && !st.result.error && st.result.sectors) {
      var rLabel = (st.img ? 0.33 : 0.30) * Math.min(st.drawW, st.drawH);
      st.result.sectors.forEach(function (s) {
        var ang = canvasAngle(branchDeg(s.earth));
        var lx = ctr.x + rLabel * Math.cos(ang);
        var ly = ctr.y + rLabel * Math.sin(ang);
        lx = Math.max(36, Math.min(st.drawW - 36, lx));
        ly = Math.max(30, Math.min(st.drawH - 30, ly));
        drawSector(ctx, lx, ly, s);
      });
      drawFacingArrow(ctx, ctr);
    }

    // centre / caption info panel
    drawInfoPanel(ctx);

    // centre marker
    ctx.save();
    ctx.beginPath(); ctx.arc(ctr.x, ctr.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#222'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  // one 30-degree palace: general (top) · heaven branch (big) · earth branch
  // (small) · a status dot (green filled / red filled / green hollow / none).
  function drawSector(ctx, x, y, s) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    function txt(str, px, py, fill, font) {
      ctx.font = font;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.94)';
      ctx.strokeText(str, px, py);
      ctx.fillStyle = fill; ctx.fillText(str, px, py);
    }
    var gen = (s.general && s.general.cn) ? s.general.cn : '';
    // dot colour by net
    var net = s.net;
    var dotX = x, dotY = y - 30;
    if (net === 'green' || net === 'red' || net === 'green_hollow') {
      ctx.beginPath(); ctx.arc(dotX, dotY, 6.5, 0, 2 * Math.PI);
      if (net === 'green') { ctx.fillStyle = GREEN; ctx.fill(); }
      else if (net === 'red') { ctx.fillStyle = RED; ctx.fill(); }
      else { // green_hollow: outline only (Heavenly Doctor meeting a negative)
        ctx.lineWidth = 2.5; ctx.strokeStyle = GREEN;
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
      if (net !== 'green_hollow') ctx.stroke();
    }
    // general name (colour-hinted by net)
    var genColour = (net === 'green' || net === 'green_hollow') ? GREEN : (net === 'red' ? RED : GREY);
    txt(gen, x, y - 16, genColour, 'bold 13px serif');
    // heaven branch (the judged branch) — prominent
    txt(String(s.heaven), x, y + 3, INK, 'bold 20px serif');
    // earth branch (physical direction) — small, below
    txt(String(s.earth), x, y + 20, '#8a6a3a', 'bold 11px serif');
    ctx.restore();
  }

  function drawFacingArrow(ctx, ctr) {
    var a = canvasAngle(st.facingDeg);
    var dx = Math.cos(a), dy = Math.sin(a);
    var len = reachToEdge(ctr.x, ctr.y, dx, dy, st.drawW, st.drawH, 16) * 0.86;
    var ex = ctr.x + len * dx, ey = ctr.y + len * dy;
    ctx.save();
    ctx.strokeStyle = '#0033cc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ctr.x, ctr.y); ctx.lineTo(ex, ey); ctx.stroke();
    var ah = 12; ctx.fillStyle = '#0033cc';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ah * Math.cos(a - 0.4), ey - ah * Math.sin(a - 0.4));
    ctx.lineTo(ex - ah * Math.cos(a + 0.4), ey - ah * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
    var lbl = 'Facing ' + st.facingDeg + '\u00B0 ' + (st.result ? st.result.facingMountain : '');
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tw = ctx.measureText(lbl).width + 10;
    var tx = Math.max(tw / 2 + 2, Math.min(st.drawW - tw / 2 - 2, ex));
    var ty = Math.max(12, Math.min(st.drawH - 12, ey - 14 * (dy < 0 ? 1 : -1)));
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeText(lbl, tx, ty);
    ctx.fillStyle = '#0033cc'; ctx.fillText(lbl, tx, ty);
    ctx.restore();
  }

  // top caption strip: Year (pillar) · Season · Month general · Void
  function drawInfoPanel(ctx) {
    var r = st.result;
    var line;
    if (!r || r.error) {
      line = r && r.error ? ('DLR: ' + r.error) : ('Da Liu Ren \u2014 year ' + st.year + ' \u2014 press \u201CDraw chart\u201D');
    } else {
      var season = seasonOf(r.chosenDay && r.chosenDay.date);
      line = st.year + ' ' + r.yearPillar.gz + '  \u00B7  ' + season +
             '  \u00B7  \u6708\u5C07 ' + (r.chosenDay ? r.chosenDay.monthGeneral : '?') +
             '  \u00B7  Void ' + (r.dayVoid ? r.dayVoid.join('') : '');
    }
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    var w = ctx.measureText(line).width + 20;
    var x = st.drawW / 2, y = 16;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    roundRect(ctx, x - w / 2, y - 12, w, 24, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(90,55,20,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#4a2f10'; ctx.fillText(line, x, y);
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function seasonOf(d) {
    if (!(d instanceof Date)) return '';
    var m = d.getMonth() + 1;                     // 1..12 (Gregorian, good enough for a caption)
    if (m >= 3 && m <= 5) return 'Spring';
    if (m >= 6 && m <= 8) return 'Summer';
    if (m >= 9 && m <= 11) return 'Autumn';
    return 'Winter';
  }

  // ── compute ─────────────────────────────────────────────────
  function compute() {
    var eng = DLR();
    if (!eng) { st.result = { error: 'daliuren-fengshui.js not loaded' }; return; }
    try { st.result = eng.build({ year: st.year, facingDeg: st.facingDeg }); }
    catch (e) { st.result = { error: 'build failed: ' + (e && e.message || e) }; }
  }

  // ── modal UI ────────────────────────────────────────────────
  function el(tag, attrs, txt) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (txt != null) e.textContent = txt;
    return e;
  }
  function sideBtnStyle(active) {
    return 'background:' + (active ? '#5d4037' : '#eee') + ';color:' + (active ? '#fff' : '#555') +
           ';border:1px solid #cbb;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:bold;cursor:pointer;';
  }
  function status(t, warn) { if (els.status) { els.status.textContent = t || ''; els.status.style.color = warn ? '#b00020' : '#555'; } }

  function open(opts) {
    opts = opts || {};
    if (typeof opts.year === 'number') st.year = clampYear(opts.year);
    if (typeof opts.facingDeg === 'number') st.facingDeg = clampDeg(opts.facingDeg);
    if (opts.facingSide && SIDE_OFFSET.hasOwnProperty(opts.facingSide)) st.facingSide = opts.facingSide;
    st.houseName = opts.houseName || '';
    st.img = null; st.center = null; st.result = null;

    var old = document.getElementById('fpd-overlay'); if (old) old.remove();
    var ov = el('div', { id: 'fpd-overlay', style:
      'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:14px;' });
    var box = el('div', { style:
      'background:#fff;border-radius:12px;max-width:1080px;width:100%;margin:auto;padding:14px 14px 18px;box-shadow:0 10px 40px rgba(0,0,0,.4);' });
    ov.appendChild(box);

    // header
    var head = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;' });
    head.appendChild(el('div', { style: 'font-size:15px;font-weight:bold;color:#5d4037;' },
      '\uD83C\uDC04 Da Liu Ren \u2014 Annual chart' + (st.houseName ? ('  \u00B7  ' + st.houseName) : '')));
    var x = el('button', { style: 'background:#eee;border:none;border-radius:8px;width:34px;height:34px;font-size:18px;cursor:pointer;' }, '\u2715');
    x.addEventListener('click', function () { ov.remove(); });
    head.appendChild(x);
    box.appendChild(head);

    // controls row
    var ctlWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-bottom:10px;' });

    // YEAR stepper
    var yearCol = el('div', { style: 'display:flex;flex-direction:column;gap:2px;' });
    yearCol.appendChild(el('label', { style: 'font-size:11px;color:#666;' }, 'Year (past / present / future)'));
    var yrow = el('div', { style: 'display:flex;gap:4px;align-items:center;' });
    var ym = el('button', { style: 'width:30px;height:32px;border:1px solid #ccc;border-radius:6px;background:#f6f6f6;font-size:16px;cursor:pointer;' }, '\u2212');
    els.year = el('input', { type: 'number', min: '1900', max: '2200', step: '1', value: String(st.year),
      style: 'width:88px;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:14px;text-align:center;' });
    var yp = el('button', { style: 'width:30px;height:32px;border:1px solid #ccc;border-radius:6px;background:#f6f6f6;font-size:16px;cursor:pointer;' }, '+');
    ym.addEventListener('click', function () { st.year = clampYear(parseInt(els.year.value, 10) - 1); els.year.value = st.year; draw(); });
    yp.addEventListener('click', function () { st.year = clampYear(parseInt(els.year.value, 10) + 1); els.year.value = st.year; draw(); });
    yrow.appendChild(ym); yrow.appendChild(els.year); yrow.appendChild(yp);
    yearCol.appendChild(yrow); ctlWrap.appendChild(yearCol);

    // FACING
    var facCol = el('div', { style: 'display:flex;flex-direction:column;gap:2px;' });
    facCol.appendChild(el('label', { style: 'font-size:11px;color:#666;' }, 'Facing (\u00B0)'));
    els.deg = el('input', { type: 'number', min: '0', max: '359', step: '0.1', value: String(st.facingDeg),
      style: 'width:84px;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:14px;' });
    facCol.appendChild(els.deg); ctlWrap.appendChild(facCol);

    // FACING SIDE (relevant when a photo is loaded)
    var sideCol = el('div', { style: 'display:flex;flex-direction:column;gap:2px;' });
    sideCol.appendChild(el('label', { style: 'font-size:11px;color:#666;' }, 'Facing side of photo'));
    var sideRow = el('div', { style: 'display:flex;gap:4px;' });
    els.sideBtns = {};
    ['top', 'right', 'bottom', 'left'].forEach(function (side) {
      var b = el('button', { style: sideBtnStyle(st.facingSide === side) }, side.charAt(0).toUpperCase() + side.slice(1));
      b.addEventListener('click', function () {
        st.facingSide = side;
        Object.keys(els.sideBtns).forEach(function (kk) { els.sideBtns[kk].setAttribute('style', sideBtnStyle(kk === side)); });
        redraw();
      });
      els.sideBtns[side] = b; sideRow.appendChild(b);
    });
    sideCol.appendChild(sideRow); ctlWrap.appendChild(sideCol);

    // action buttons
    var actCol = el('div', { style: 'display:flex;gap:8px;align-items:center;margin-left:auto;' });
    var drawBtn = el('button', { style: 'background:#5d4037;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:bold;cursor:pointer;' }, 'Draw chart');
    var saveBtn = el('button', { style: 'background:#1b8a3f;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:bold;cursor:pointer;' }, '\uD83D\uDCBE Save to house');
    drawBtn.addEventListener('click', draw);
    saveBtn.addEventListener('click', doSave);
    actCol.appendChild(drawBtn); actCol.appendChild(saveBtn);
    ctlWrap.appendChild(actCol);
    box.appendChild(ctlWrap);

    // canvas
    var canWrap = el('div', { style: 'display:flex;justify-content:center;background:#faf7f1;border:1px solid #eee;border-radius:8px;padding:6px;overflow:auto;' });
    els.canvas = el('canvas', { width: '760', height: '760', style: 'display:block;' });
    canWrap.appendChild(els.canvas); box.appendChild(canWrap);

    // legend + status
    var legend = el('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin:8px 0 4px;font-size:11px;color:#444;' });
    legend.innerHTML =
      '<span><b style="color:' + GREEN + ';">\u25CF</b> auspicious</span>' +
      '<span><b style="color:' + RED + ';">\u25CF</b> inauspicious</span>' +
      '<span><b style="color:' + GREEN + ';">\u25CB</b> Heavenly Doctor w/ negative</span>' +
      '<span>no dot = neutral / cancelled</span>';
    box.appendChild(legend);
    els.status = el('div', { style: 'text-align:center;font-size:12px;color:#555;min-height:16px;margin-top:2px;' });
    box.appendChild(els.status);

    document.body.appendChild(ov);

    // load the saved FS floor plan (photo + centre), if any, then draw
    var saved = opts.saved || _lookupActiveSavedPlan();
    if (saved && saved.imgData) {
      status('Loading saved floor plan\u2026');
      var im = new Image();
      im.onload = function () {
        st.img = im;
        if (saved.facingSide && SIDE_OFFSET.hasOwnProperty(saved.facingSide)) {
          st.facingSide = saved.facingSide;
          try { Object.keys(els.sideBtns).forEach(function (kk) { els.sideBtns[kk].setAttribute('style', sideBtnStyle(kk === st.facingSide)); }); } catch (e) {}
        }
        fitCanvas();
        st.center = saved.centerF ? { x: saved.centerF.x * st.drawW, y: saved.centerF.y * st.drawH } : { x: st.drawW / 2, y: st.drawH / 2 };
        draw();
        status('Saved floor plan loaded \u2014 pick a year, then \u201CDraw chart\u201D.');
      };
      im.onerror = function () { st.img = null; fitCanvas(); st.center = null; draw(); status('Floor plan image failed \u2014 showing the bare annual wheel.', true); };
      im.src = saved.imgData;
    } else {
      st.img = null; fitCanvas(); st.center = null; draw();
      status('No saved floor plan for this house \u2014 showing the bare annual wheel. (Import & save a plan in Flying Stars to overlay it here.)');
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () {
        if (document.getElementById('fpd-overlay')) { var cc = st.center; fitCanvas(); if (cc && st.img) st.center = cc; redraw(); }
      });
    }
  }

  function draw() {
    st.year = clampYear(parseInt(els.year.value, 10));
    st.facingDeg = clampDeg(parseFloat(els.deg.value));
    els.year.value = st.year; els.deg.value = st.facingDeg;
    if (!st.img) { fitCanvas(); st.center = null; }
    compute();
    redraw();
    if (st.result && st.result.error) { status('DLR: ' + st.result.error, true); return; }
    var r = st.result;
    var mode = (r.chosenDay && r.chosenDay.mode === 'liuhe') ? ' (via \u516D\u5408 fallback)' : '';
    status('Year ' + st.year + ' ' + r.yearPillar.gz + ' \u00B7 Tai-Sui day ' +
      (r.chosenDay ? r.chosenDay.date.toDateString() : '?') + mode +
      ' \u00B7 \u6708\u5C07 ' + (r.chosenDay ? r.chosenDay.monthGeneral : '?') +
      ' \u00B7 hour ' + r.hourStem + r.facingBranch + ' \u00B7 void ' + (r.dayVoid ? r.dayVoid.join('') : '') + '.');
  }

  // ── persistence (tiny record; the photo stays owned by Flying Stars) ─
  function _activeCtx() { var f = host('_fsActiveHouseFloorCtx'); return f ? f() : null; }
  function _lookupActiveSavedPlan() {
    var ctx = _activeCtx();
    return (ctx && ctx.floor && ctx.floor.floorplan && ctx.floor.floorplan.imgData) ? ctx.floor.floorplan : null;
  }
  function doSave() {
    st.year = clampYear(parseInt(els.year.value, 10));
    st.facingDeg = clampDeg(parseFloat(els.deg.value));
    var ctx = _activeCtx();
    if (!ctx || !ctx.floor) { status('No active house/floor to save to. (Select a house in Flying Stars first.)', true); return; }
    var saveFn = host('_fsHousesSave');
    if (!saveFn) { status('Storage helper unavailable on this page.', true); return; }
    // Keep it small: year + facing + centre only. The floor-plan photo is
    // shared with Flying Stars and is NOT duplicated here.
    ctx.floor.floorplanDLR = {
      year: st.year, facingDeg: st.facingDeg, facingSide: st.facingSide,
      centerF: (st.center && st.img && st.drawW && st.drawH)
        ? { x: st.center.x / st.drawW, y: st.center.y / st.drawH } : null,
      savedAt: Date.now()
    };
    try { saveFn(ctx.all); status('Saved this year\u2019s DLR settings to the house \u2713'); }
    catch (e) {
      var nm = (e && e.name) || '';
      status(/quota/i.test(nm + String(e)) ? 'Storage is full \u2014 free some space and retry.' : 'Could not save \u2014 try again.', true);
    }
  }

  // ── self-mount: floating "DLR" button inside #fs-canvas-wrap ─
  function launchFromActiveHouse() {
    var ffn = host('_fsFloorFacing'), ctx = _activeCtx();
    var facing = null, side = 'top', houseName = '';
    if (ctx && ctx.house) {
      houseName = ctx.house.name || '';
      if (ffn) { var v = ffn(ctx.house, ctx.floor); if (typeof v === 'number') facing = v; }
      var fp = ctx.floor && ctx.floor.floorplan;
      if (fp && fp.facingSide) side = fp.facingSide;
    }
    var savedYear = (ctx && ctx.floor && ctx.floor.floorplanDLR && ctx.floor.floorplanDLR.year) || (new Date()).getFullYear();
    open({
      year: savedYear,
      facingDeg: (typeof facing === 'number') ? facing : 180,
      facingSide: side,
      houseName: houseName,
      saved: _lookupActiveSavedPlan()
    });
  }

  function ensureButton() {
    var wrap = document.getElementById('fs-canvas-wrap');
    if (!wrap) return;
    if (document.getElementById('fs-dlr-toggle')) return;
    var b = document.createElement('button');
    b.id = 'fs-dlr-toggle';
    b.type = 'button';
    b.title = 'Da Liu Ren annual chart for the active house (free year selector; overlays the saved floor plan)';
    b.textContent = '\uD83C\uDC04 DLR';
    b.setAttribute('style',
      'position:absolute;bottom:8px;left:8px;z-index:6;background:#fff;color:#5d4037;border:1px solid #5d4037;' +
      'border-radius:6px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.3);');
    b.addEventListener('click', function () {
      if (!DLR()) { alert('Da Liu Ren engine not loaded (daliuren.js / daliuren-fengshui.js).'); return; }
      launchFromActiveHouse();
    });
    wrap.appendChild(b);
  }

  function mount() {
    try { ensureButton(); } catch (e) {}
    // Re-inject if the Feng Shui page (and its canvas wrap) is (re)rendered.
    try {
      if (typeof MutationObserver !== 'undefined' && document.body) {
        var mo = new MutationObserver(function () { try { ensureButton(); } catch (e) {} });
        mo.observe(document.body, { childList: true, subtree: true });
      }
    } catch (e) {}
  }

  // ── expose + auto-mount ─────────────────────────────────────
  var API = { open: open, mount: mount };
  if (typeof window !== 'undefined') window.FloorPlanDLR = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();

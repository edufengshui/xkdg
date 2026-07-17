// ============================================================
// floorplan-daliuren.js  —  Da Liu Ren ANNUAL chart overlay
//
// Two surfaces, one engine (daliuren-fengshui.js):
//   A) MAIN LUOPAN RING — tap the floating "DLR" button and the 12 annual
//      spirits are drawn as a ring AROUND the existing luopan (the flying-star
//      chart stays visible underneath). Hooked from fsRedraw() exactly like
//      the Sun/Moon overlay: fsRedraw calls FloorPlanDLR.drawIfOn(ctx,cx,cy,
//      outerR,ROT). To avoid confusion the ring and the Sun/Moon overlay are
//      mutually exclusive (turning the ring on turns Sun/Moon off).
//   B) FLOOR-PLAN MODAL — "On floor plan" opens a full modal that overlays the
//      12 sectors on the SAME saved Flying-Stars floor plan WITH its flying
//      stars still visible (it uses the FS composite as the background).
//
// Label format (matches Edu's reference slide), per sector:
//      line 1  spirit name in English         (colour-hinted by the judgement)
//      line 2  EARTH branch  = Pinyin + 中文   (the physical palace / direction)
//      line 3  HEAVEN branch = Pinyin + 中文 + spirit number
// Spirit number is fixed per spirit (reverse canonical: 天后 Queen = 1 …
// 貴人 Nobleman = 12). Status dot: filled green (auspicious) / filled red
// (inauspicious) / hollow green ring (Heavenly Doctor meeting a negative) /
// none (neutral or cancelled).
//
// Depends on: window.XKDGDaLiuRenFS (daliuren-fengshui.js → daliuren.js +
// lunar-javascript). Optional host globals used if present: fsRedraw,
// _fsActiveHouseFloorCtx, _fsFloorFacing, _fsHousesSave, SunMoonMountain,
// FloorPlanStars.
//
// Public API: window.FloorPlanDLR = { open, openOnPlan, toggleRing, drawIfOn, mount }
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
  function sunMoon() {
    try { if (typeof SunMoonMountain !== 'undefined' && SunMoonMountain) return SunMoonMountain; } catch (e) {}
    return (typeof window !== 'undefined' && window.SunMoonMountain) ? window.SunMoonMountain : null;
  }
  function floorStars() {
    try { if (typeof FloorPlanStars !== 'undefined' && FloorPlanStars) return FloorPlanStars; } catch (e) {}
    return (typeof window !== 'undefined' && window.FloorPlanStars) ? window.FloorPlanStars : null;
  }

  var BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  function bIdx(b) { return BRANCHES.indexOf(b); }
  function branchDeg(b) { return bIdx(b) * 30; }              // 子 = 0 = North, +30 CW

  var PINYIN = { '子':'Zi','丑':'Chou','寅':'Yin','卯':'Mao','辰':'Chen','巳':'Si',
                 '午':'Wu','未':'Wei','申':'Shen','酉':'You','戌':'Xu','亥':'Hai' };
  // English spirit names + fixed number, to match the reference slide exactly.
  var SPIRIT_EN = { '貴人':'Nobleman','螣蛇':'Snake','朱雀':'Bird','六合':'Harmony',
                    '勾陳':'Polaris','青龍':'Dragon','天空':'EmptySky','白虎':'Tiger',
                    '太常':'Norm','玄武':'Warrior','太陰':'Moon','天后':'Queen' };
  var SPIRIT_NUM = { '天后':1,'太陰':2,'玄武':3,'太常':4,'白虎':5,'天空':6,
                     '青龍':7,'勾陳':8,'六合':9,'朱雀':10,'螣蛇':11,'貴人':12 };
  function branchLabel(b) { return (PINYIN[b] || '') + ' ' + b; }

  var SIDE_OFFSET = { top: 0, right: 90, bottom: 180, left: 270 };
  var GREEN = '#0a6e1f', RED = '#c30000', INK = '#1a1008', GREY = '#5a5a5a';

  var st = {
    // modal state
    img: null, drawW: 0, drawH: 0, center: null,
    facingSide: 'top',
    // shared
    year: (new Date()).getFullYear(),
    facingDeg: 180, result: null, houseName: '',
    // luopan-ring state
    ringOn: false
  };
  var els = {};

  function clampDeg(v) { if (isNaN(v)) v = 0; v = ((v % 360) + 360) % 360; return Math.round(v * 10) / 10; }
  function clampYear(v) { if (isNaN(v)) v = (new Date()).getFullYear(); return Math.max(1900, Math.min(2200, Math.round(v))); }

  function compute(facingDeg, year) {
    var eng = DLR();
    if (!eng) return { error: 'daliuren-fengshui.js not loaded' };
    try { return eng.build({ year: year, facingDeg: facingDeg }); }
    catch (e) { return { error: 'build failed: ' + (e && e.message || e) }; }
  }

  // net → dot painter (shared by both surfaces)
  function drawDot(ctx, x, y, net) {
    if (net !== 'green' && net !== 'red' && net !== 'green_hollow') return;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, 6.5, 0, 2 * Math.PI);
    if (net === 'green') { ctx.fillStyle = GREEN; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); }
    else if (net === 'red') { ctx.fillStyle = RED; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = GREEN; ctx.stroke(); }
    ctx.restore();
  }

  // 3-line slide-format label block centred at (x,y). fs = base font px.
  function drawLabelBlock(ctx, x, y, s, fs) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    function txt(str, py, fill, font) {
      ctx.font = font;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeText(str, x, py); ctx.fillStyle = fill; ctx.fillText(str, x, py);
    }
    var net = s.net;
    var spCol = (net === 'green' || net === 'green_hollow') ? GREEN : (net === 'red' ? RED : GREY);
    var name = SPIRIT_EN[s.general && s.general.cn] || (s.general && s.general.cn) || '';
    var num = SPIRIT_NUM[s.general && s.general.cn];
    drawDot(ctx, x, y - fs * 1.7, net);
    txt(name, y - fs * 0.55, spCol, 'bold ' + fs + 'px sans-serif');
    txt(branchLabel(s.earth), y + fs * 0.55, '#7a5a2a', (fs - 1) + 'px serif');
    txt(branchLabel(s.heaven) + (num ? ('  ' + num) : ''), y + fs * 1.6, INK, 'bold ' + (fs - 1) + 'px serif');
    ctx.restore();
  }

  // ============================================================
  // A) MAIN LUOPAN RING  (called by fsRedraw)
  // ============================================================
  function ringFacing() {
    try {
      var inp = document.getElementById('fs-house-facing');
      if (inp && inp.value !== '' && !isNaN(parseFloat(inp.value))) return clampDeg(parseFloat(inp.value));
    } catch (e) {}
    var ff = host('_fsFloorFacing'), ctx = _activeCtx();
    if (ff && ctx && ctx.house) { var v = ff(ctx.house, ctx.floor); if (typeof v === 'number') return clampDeg(v); }
    return st.facingDeg;
  }

  // Signature matches SunMoonMountain.drawIfOn(ctx, cx, cy, outerR, ROT).
  function drawIfOn(ctx, cx, cy, outerR, ROT) {
    if (!st.ringOn || !ctx) return;
    // HARDENING (session 23): this overlay draws LAST in fsRedraw. If ANY earlier
    // draw threw mid-way between a ctx.save() and its ctx.restore() (the throw gets
    // swallowed by fsRedraw's own try/catch wrappers), the context is left with a
    // stray transform/alpha and everything drawn afterwards lands transformed —
    // possibly entirely off-canvas — with no error anywhere. This function's math
    // assumes untransformed absolute coordinates by design, so resetting to the
    // identity state here is correct, not a workaround.
    var _canReset = (typeof ctx.setTransform === 'function');
    try { ctx.save(); if (_canReset) ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; } catch (ePre) {}
    try {
      var facing = ringFacing();
      st.facingDeg = facing;
      // memoize: fsRedraw fires often (e.g. Water input) — only rebuild when the
      // facing or the year actually changed.
      var key = facing + '@' + st.year;
      var r;
      if (st._ringKey === key && st._ringResult) { r = st._ringResult; }
      else { r = compute(facing, st.year); st._ringKey = key; st._ringResult = r; }
      st.result = r;
      if (!r || r.error || !r.sectors) return;
      var ang = function (deg) { return (deg - 270 + (ROT || 0)) * Math.PI / 180; };
      var W = (ctx.canvas && ctx.canvas.width) || (cx * 2);
      var H = (ctx.canvas && ctx.canvas.height) || (cy * 2);
      var rLabel = outerR + 108, rDotInner = outerR + 40;
      var pad = 42;
      r.sectors.forEach(function (s) {
        var a = ang(branchDeg(s.earth));
        var lx = cx + Math.cos(a) * rLabel, ly = cy + Math.sin(a) * rLabel;
        lx = Math.max(pad, Math.min(W - pad, lx));
        ly = Math.max(pad, Math.min(H - pad, ly));
        // colour dot on the wheel edge, pointing at the sector
        var dx = cx + Math.cos(a) * rDotInner, dy = cy + Math.sin(a) * rDotInner;
        drawDot(ctx, dx, dy, s.net);
        drawLabelBlock(ctx, lx, ly, s, 13);
      });
      // small caption at the top of the canvas
      var cap = st.year + ' ' + r.yearPillar.gz + '  \u00B7  \u6708\u5C07 ' +
                (r.chosenDay ? r.chosenDay.monthGeneral : '?') + '  \u00B7  DLR annual';
      ctx.save();
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(cap, cx, 6);
      ctx.fillStyle = '#5d4037'; ctx.fillText(cap, cx, 6);
      ctx.restore();
    } catch (e) { console.warn('FloorPlanDLR drawIfOn', e); /* never break the luopan — but never hide the reason either (session 23: this silent catch cost a whole debugging session) */ }
    try { ctx.restore(); } catch (ePost) {}
  }

  function toggleRing() {
    if (!DLR()) { alert('Da Liu Ren engine not loaded (daliuren.js / daliuren-fengshui.js).'); return; }
    st.ringOn = !st.ringOn;
    // mutual exclusion with Sun/Moon to avoid a crowded wheel
    if (st.ringOn) {
      try {
        var smBtn = document.getElementById('fs-sunmoon-toggle');
        var sm = sunMoon();
        if (sm && smBtn && /ON/.test(smBtn.textContent || '')) sm.toggle();
      } catch (e) {}
    }
    // sync year default from any saved DLR record
    var ctx = _activeCtx();
    if (ctx && ctx.floor && ctx.floor.floorplanDLR && ctx.floor.floorplanDLR.year) st.year = clampYear(ctx.floor.floorplanDLR.year);
    _styleButton();
    _syncControls();
    var rd = host('fsRedraw'); if (rd) rd();
  }

  // ============================================================
  // Floating button + inline year / on-plan controls
  // ============================================================
  function _styleButton() {
    var b = document.getElementById('fs-dlr-toggle');
    if (!b) return;
    var want = st.ringOn ? '\uD83C\uDC04 DLR ON' : '\uD83C\uDC04 DLR';
    if (b.textContent !== want) b.textContent = want;   // idempotent — see _refreshYear
    var bg = st.ringOn ? '#5d4037' : '#fff', fg = st.ringOn ? '#fff' : '#5d4037';
    if (b.style.background !== bg) b.style.background = bg;
    if (b.style.color !== fg) b.style.color = fg;
  }

  function _syncControls() {
    var wrap = document.getElementById('fs-canvas-wrap');
    if (!wrap) return;
    var bar = document.getElementById('fs-dlr-controls');
    if (!st.ringOn) { if (bar && bar.style.display !== 'none') bar.style.display = 'none'; return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fs-dlr-controls';
      bar.setAttribute('style',
        'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:7;display:flex;gap:6px;align-items:center;' +
        'background:rgba(255,255,255,.94);border:1px solid #5d4037;border-radius:8px;padding:4px 6px;box-shadow:0 1px 4px rgba(0,0,0,.3);');
      var mk = function (txt, title) {
        var e = document.createElement('button'); e.type = 'button'; e.textContent = txt; if (title) e.title = title;
        e.setAttribute('style', 'background:#f6f1ea;color:#5d4037;border:1px solid #cbb;border-radius:6px;padding:4px 9px;font-size:13px;font-weight:bold;cursor:pointer;');
        return e;
      };
      var prev = mk('\u25C0', 'Previous year');
      var ylabel = document.createElement('span'); ylabel.id = 'fs-dlr-year';
      ylabel.setAttribute('style', 'min-width:44px;text-align:center;font-size:13px;font-weight:bold;color:#5d4037;');
      var next = mk('\u25B6', 'Next year');
      var plan = mk('\uD83C\uDFE0 On floor plan', 'Overlay the DLR chart on the saved floor plan (stars visible)');
      plan.style.background = '#5d4037'; plan.style.color = '#fff'; plan.style.border = 'none';
      prev.addEventListener('click', function () { st.year = clampYear(st.year - 1); _refreshYear(); var rd = host('fsRedraw'); if (rd) rd(); });
      next.addEventListener('click', function () { st.year = clampYear(st.year + 1); _refreshYear(); var rd = host('fsRedraw'); if (rd) rd(); });
      plan.addEventListener('click', function () { openOnPlan(); });
      bar.appendChild(prev); bar.appendChild(ylabel); bar.appendChild(next); bar.appendChild(plan);
      wrap.appendChild(bar);
    }
    if (bar.style.display !== 'flex') bar.style.display = 'flex';
    _refreshYear();
  }
  function _refreshYear() {
    var y = document.getElementById('fs-dlr-year');
    // IDEMPOTENT (session 23): writing textContent replaces the text node even when
    // the value is identical — a childList mutation the body-wide observer sees,
    // which re-invoked this very function: an infinite microtask loop that froze
    // the whole page the moment the ring turned ON. Write only on real change.
    if (y && y.textContent !== String(st.year)) y.textContent = String(st.year);
  }

  function ensureButton() {
    var wrap = document.getElementById('fs-canvas-wrap');
    if (!wrap || document.getElementById('fs-dlr-toggle')) { if (st.ringOn) _syncControls(); return; }
    var b = document.createElement('button');
    b.id = 'fs-dlr-toggle'; b.type = 'button';
    b.title = 'Da Liu Ren annual chart — draw the 12 annual spirits around the luopan (and, from here, on the saved floor plan)';
    b.setAttribute('style',
      'position:absolute;bottom:8px;left:8px;z-index:30;background:#fff;color:#5d4037;border:1px solid #5d4037;' +
      'border-radius:6px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.3);pointer-events:auto;');
    b.addEventListener('click', _guardedToggle);
    wrap.appendChild(b);
    _styleButton();
    if (st.ringOn) _syncControls();
  }

  // BELT AND BRACES (session 23): a DELEGATED click handler on the document.
  // Direct listeners die silently if the button node is ever cloned or its
  // subtree rebuilt by other UI code; a delegated handler survives all of that.
  // Guarded so a click handled by the direct listener is not handled twice.
  var _lastToggleTs = 0;
  function _guardedToggle() {
    var now = Date.now();
    if (now - _lastToggleTs < 350) return;   // the direct listener already handled this click
    _lastToggleTs = now;
    toggleRing();
  }
  try {
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== document) {
        if (t.id === 'fs-dlr-toggle') { _guardedToggle(); return; }
        t = t.parentNode;
      }
    }, true);   // capture phase: fires even if something stops propagation at the button
  } catch (eDel) {}

  // ============================================================
  // B) FLOOR-PLAN MODAL  (stars visible under the DLR sectors)
  // ============================================================
  function imageUpDeg() { var off = SIDE_OFFSET[st.facingSide] || 0; return (((st.facingDeg - off) % 360) + 360) % 360; }
  function canvasAngle(D) { var up = imageUpDeg(); var phi = (((270 + D - up) % 360) + 360) % 360; return phi * Math.PI / 180; }
  function centerPoint() { return st.center || { x: st.drawW / 2, y: st.drawH / 2 }; }
  function reachToEdge(cx, cy, dx, dy, w, h, m) {
    var ts = [];
    if (dx > 1e-6) ts.push((w - m - cx) / dx); else if (dx < -1e-6) ts.push((m - cx) / dx);
    if (dy > 1e-6) ts.push((h - m - cy) / dy); else if (dy < -1e-6) ts.push((m - cy) / dy);
    var t = Infinity; ts.forEach(function (v) { if (v > 0 && v < t) t = v; });
    return isFinite(t) ? t : 0.4 * Math.min(w, h);
  }
  function fitCanvas() {
    var c = els.canvas;
    var maxW = Math.min((typeof window !== 'undefined' ? window.innerWidth : 800) - 40, 1040);
    var maxH = Math.max(260, (typeof window !== 'undefined' ? window.innerHeight : 700) - 260);
    if (st.img) {
      var nW = st.img.naturalWidth || st.img.width, nH = st.img.naturalHeight || st.img.height;
      var scale = Math.min(1, maxW / nW, maxH / nH);
      st.drawW = Math.max(1, Math.round(nW * scale)); st.drawH = Math.max(1, Math.round(nH * scale));
    } else { var side = Math.max(280, Math.min(maxW, maxH, 760)); st.drawW = side; st.drawH = side; }
    c.width = st.drawW; c.height = st.drawH;
    c.style.setProperty('width', '100%', 'important');
    c.style.setProperty('height', 'auto', 'important');
    c.style.setProperty('aspect-ratio', st.drawW + ' / ' + st.drawH, 'important');
    c.style.setProperty('max-width', st.drawW + 'px', 'important');
    c.style.setProperty('max-height', st.drawH + 'px', 'important');
    c.style.setProperty('align-self', 'flex-start', 'important');
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function seasonOf(d) {
    if (!(d instanceof Date)) return '';
    var m = d.getMonth() + 1;
    if (m >= 3 && m <= 5) return 'Spring'; if (m >= 6 && m <= 8) return 'Summer';
    if (m >= 9 && m <= 11) return 'Autumn'; return 'Winter';
  }

  function redraw() {
    var c = els.canvas, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (st.img) {
      ctx.drawImage(st.img, 0, 0, st.drawW, st.drawH);   // floor plan + flying stars composite
    } else {
      ctx.fillStyle = '#fbf8f2'; ctx.fillRect(0, 0, st.drawW, st.drawH);
      var c0 = centerPoint(), Rw = 0.44 * Math.min(st.drawW, st.drawH);
      ctx.save();
      ctx.beginPath(); ctx.arc(c0.x, c0.y, Rw, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(90,55,20,0.55)'; ctx.stroke();
      ctx.restore();
    }
    var ctr = centerPoint();
    var R = st.img ? 0.5 * Math.min(st.drawW, st.drawH) : 0.44 * Math.min(st.drawW, st.drawH);
    // 12 boundary rays
    ctx.save();
    ctx.strokeStyle = st.img ? 'rgba(90,55,20,0.7)' : 'rgba(90,55,20,0.45)'; ctx.lineWidth = 1.25;
    for (var k = 0; k < 12; k++) {
      var a = canvasAngle(k * 30 - 15);
      ctx.beginPath(); ctx.moveTo(ctr.x, ctr.y); ctx.lineTo(ctr.x + R * Math.cos(a), ctr.y + R * Math.sin(a)); ctx.stroke();
    }
    ctx.restore();

    if (st.result && !st.result.error && st.result.sectors) {
      var rLabel = (st.img ? 0.36 : 0.32) * Math.min(st.drawW, st.drawH);
      st.result.sectors.forEach(function (s) {
        var ang = canvasAngle(branchDeg(s.earth));
        var lx = ctr.x + rLabel * Math.cos(ang), ly = ctr.y + rLabel * Math.sin(ang);
        lx = Math.max(46, Math.min(st.drawW - 46, lx));
        ly = Math.max(34, Math.min(st.drawH - 34, ly));
        drawLabelBlock(ctx, lx, ly, s, 14);
      });
      drawFacingArrow(ctx, ctr);
    }
    drawInfoPanel(ctx);
    ctx.save();
    ctx.beginPath(); ctx.arc(ctr.x, ctr.y, 4, 0, 2 * Math.PI); ctx.fillStyle = '#222'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  }

  function drawFacingArrow(ctx, ctr) {
    var a = canvasAngle(st.facingDeg), dx = Math.cos(a), dy = Math.sin(a);
    var len = reachToEdge(ctr.x, ctr.y, dx, dy, st.drawW, st.drawH, 16) * 0.86;
    var ex = ctr.x + len * dx, ey = ctr.y + len * dy;
    ctx.save();
    ctx.strokeStyle = '#0033cc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ctr.x, ctr.y); ctx.lineTo(ex, ey); ctx.stroke();
    var ah = 12; ctx.fillStyle = '#0033cc';
    ctx.beginPath(); ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ah * Math.cos(a - 0.4), ey - ah * Math.sin(a - 0.4));
    ctx.lineTo(ex - ah * Math.cos(a + 0.4), ey - ah * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawInfoPanel(ctx) {
    var r = st.result, line;
    if (!r || r.error) line = r && r.error ? ('DLR: ' + r.error) : ('Da Liu Ren \u2014 year ' + st.year + ' \u2014 press \u201CDraw chart\u201D');
    else line = st.year + ' ' + r.yearPillar.gz + '  \u00B7  ' + seasonOf(r.chosenDay && r.chosenDay.date) +
                '  \u00B7  \u6708\u5C07 ' + (r.chosenDay ? r.chosenDay.monthGeneral : '?') +
                '  \u00B7  Void ' + (r.dayVoid ? r.dayVoid.join('') : '');
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    var w = ctx.measureText(line).width + 20, x = st.drawW / 2, y = 16;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; roundRect(ctx, x - w / 2, y - 12, w, 24, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(90,55,20,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#4a2f10'; ctx.fillText(line, x, y); ctx.restore();
  }

  function el(tag, attrs, txt) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (txt != null) e.textContent = txt; return e;
  }
  function sideBtnStyle(active) {
    return 'background:' + (active ? '#5d4037' : '#eee') + ';color:' + (active ? '#fff' : '#555') +
           ';border:1px solid #cbb;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:bold;cursor:pointer;';
  }
  function status(t, warn) { if (els.status) { els.status.textContent = t || ''; els.status.style.color = warn ? '#b00020' : '#555'; } }

  function openOnPlan() {
    var ffn = host('_fsFloorFacing'), ctx = _activeCtx();
    var facing = ringFacing(), side = 'top', houseName = '';
    if (ctx && ctx.house) {
      houseName = ctx.house.name || '';
      var fp = ctx.floor && ctx.floor.floorplan;
      if (fp && fp.facingSide) side = fp.facingSide;
    }
    open({ year: st.year, facingDeg: facing, facingSide: side, houseName: houseName, saved: _lookupActiveSavedPlan() });
  }

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

    var head = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;' });
    head.appendChild(el('div', { style: 'font-size:15px;font-weight:bold;color:#5d4037;' },
      '\uD83C\uDC04 Da Liu Ren \u2014 Annual chart' + (st.houseName ? ('  \u00B7  ' + st.houseName) : '')));
    var x = el('button', { style: 'background:#eee;border:none;border-radius:8px;width:34px;height:34px;font-size:18px;cursor:pointer;' }, '\u2715');
    x.addEventListener('click', function () { ov.remove(); });
    head.appendChild(x); box.appendChild(head);

    var ctlWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-bottom:10px;' });
    var yearCol = el('div', { style: 'display:flex;flex-direction:column;gap:2px;' });
    yearCol.appendChild(el('label', { style: 'font-size:11px;color:#666;' }, 'Year (past / present / future)'));
    var yrow = el('div', { style: 'display:flex;gap:4px;align-items:center;' });
    var ym = el('button', { style: 'width:30px;height:32px;border:1px solid #ccc;border-radius:6px;background:#f6f6f6;font-size:16px;cursor:pointer;' }, '\u2212');
    els.year = el('input', { type: 'number', min: '1900', max: '2200', step: '1', value: String(st.year),
      style: 'width:88px;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:14px;text-align:center;' });
    var yp = el('button', { style: 'width:30px;height:32px;border:1px solid #ccc;border-radius:6px;background:#f6f6f6;font-size:16px;cursor:pointer;' }, '+');
    ym.addEventListener('click', function () { st.year = clampYear(parseInt(els.year.value, 10) - 1); els.year.value = st.year; draw(); });
    yp.addEventListener('click', function () { st.year = clampYear(parseInt(els.year.value, 10) + 1); els.year.value = st.year; draw(); });
    yrow.appendChild(ym); yrow.appendChild(els.year); yrow.appendChild(yp); yearCol.appendChild(yrow); ctlWrap.appendChild(yearCol);

    var facCol = el('div', { style: 'display:flex;flex-direction:column;gap:2px;' });
    facCol.appendChild(el('label', { style: 'font-size:11px;color:#666;' }, 'Facing (\u00B0)'));
    els.deg = el('input', { type: 'number', min: '0', max: '359', step: '0.1', value: String(st.facingDeg),
      style: 'width:84px;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:14px;' });
    facCol.appendChild(els.deg); ctlWrap.appendChild(facCol);

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

    var actCol = el('div', { style: 'display:flex;gap:8px;align-items:center;margin-left:auto;' });
    var drawBtn = el('button', { style: 'background:#5d4037;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:bold;cursor:pointer;' }, 'Draw chart');
    var saveBtn = el('button', { style: 'background:#1b8a3f;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:bold;cursor:pointer;' }, '\uD83D\uDCBE Save to house');
    drawBtn.addEventListener('click', draw); saveBtn.addEventListener('click', doSave);
    actCol.appendChild(drawBtn); actCol.appendChild(saveBtn); ctlWrap.appendChild(actCol);
    box.appendChild(ctlWrap);

    var canWrap = el('div', { style: 'display:flex;justify-content:center;background:#faf7f1;border:1px solid #eee;border-radius:8px;padding:6px;overflow:auto;' });
    els.canvas = el('canvas', { width: '760', height: '760', style: 'display:block;' });
    canWrap.appendChild(els.canvas); box.appendChild(canWrap);

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

    var saved = opts.saved || _lookupActiveSavedPlan();
    if (saved && saved.imgData) {
      status('Loading floor plan + flying stars\u2026');
      var applyImg = function (src, alsoSetSide) {
        var im = new Image();
        im.onload = function () {
          st.img = im;
          if (alsoSetSide && saved.facingSide && SIDE_OFFSET.hasOwnProperty(saved.facingSide)) {
            st.facingSide = saved.facingSide;
            try { Object.keys(els.sideBtns).forEach(function (kk) { els.sideBtns[kk].setAttribute('style', sideBtnStyle(kk === st.facingSide)); }); } catch (e) {}
          }
          fitCanvas();
          st.center = saved.centerF ? { x: saved.centerF.x * st.drawW, y: saved.centerF.y * st.drawH } : { x: st.drawW / 2, y: st.drawH / 2 };
          draw();
          status('Floor plan + flying stars loaded \u2014 pick a year, then \u201CDraw chart\u201D.');
        };
        im.onerror = function () { if (src !== saved.imgData) applyImg(saved.imgData, alsoSetSide); else { st.img = null; fitCanvas(); st.center = null; draw(); status('Image failed \u2014 bare wheel shown.', true); } };
        im.src = src;
      };
      // Prefer the baked composite (plan + flying stars). Otherwise render it now
      // via FloorPlanStars so the stars are visible under the DLR sectors.
      var fps = floorStars();
      if (saved.starsImg) applyImg(saved.starsImg, true);
      else if (fps && typeof fps.renderComposite === 'function') {
        fps.renderComposite(saved, function (url) { applyImg(url || saved.imgData, true); });
      } else applyImg(saved.imgData, true);
    } else {
      st.img = null; fitCanvas(); st.center = null; draw();
      status('No saved floor plan for this house \u2014 bare annual wheel shown. (Import & save a plan in Flying Stars to overlay it here.)');
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
    st.result = compute(st.facingDeg, st.year);
    redraw();
    if (st.result && st.result.error) { status('DLR: ' + st.result.error, true); return; }
    var r = st.result, mode = (r.chosenDay && r.chosenDay.mode === 'liuhe') ? ' (via \u516D\u5408 fallback)' : '';
    status('Year ' + st.year + ' ' + r.yearPillar.gz + ' \u00B7 Tai-Sui day ' +
      (r.chosenDay ? r.chosenDay.date.toDateString() : '?') + mode +
      ' \u00B7 \u6708\u5C07 ' + (r.chosenDay ? r.chosenDay.monthGeneral : '?') +
      ' \u00B7 hour ' + r.hourStem + r.facingBranch + ' \u00B7 void ' + (r.dayVoid ? r.dayVoid.join('') : '') + '.');
  }

  // ── persistence ─────────────────────────────────────────────
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
    ctx.floor.floorplanDLR = {
      year: st.year, facingDeg: st.facingDeg, facingSide: st.facingSide,
      centerF: (st.center && st.img && st.drawW && st.drawH) ? { x: st.center.x / st.drawW, y: st.center.y / st.drawH } : null,
      savedAt: Date.now()
    };
    try { saveFn(ctx.all); status('Saved this year\u2019s DLR settings to the house \u2713'); }
    catch (e) {
      var nm = (e && e.name) || '';
      status(/quota/i.test(nm + String(e)) ? 'Storage is full \u2014 free some space and retry.' : 'Could not save \u2014 try again.', true);
    }
  }

  // ── mount ───────────────────────────────────────────────────
  function mount() {
    try { ensureButton(); } catch (e) {}
    try {
      if (typeof MutationObserver !== 'undefined' && document.body) {
        var _inObs = false;   // re-entrancy guard: our own DOM writes must not re-trigger us
        var mo = new MutationObserver(function () {
          if (_inObs) return;
          _inObs = true;
          try { ensureButton(); } catch (e) {}
          _inObs = false;
        });
        mo.observe(document.body, { childList: true, subtree: true });
      }
    } catch (e) {}
  }

  var API = { open: open, openOnPlan: openOnPlan, toggleRing: toggleRing, drawIfOn: drawIfOn, mount: mount };
  if (typeof window !== 'undefined') window.FloorPlanDLR = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();

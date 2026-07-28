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
    // 天盤 tianpan above, 地盤 dipan below — see drawSectorBox for the rationale.
    txt(branchLabel(s.heaven) + (num ? ('  ' + num) : ''), y + fs * 0.55, INK, 'bold ' + (fs - 1) + 'px serif');
    txt(branchLabel(s.earth), y + fs * 1.6, '#7a5a2a', (fs - 1) + 'px serif');
    ctx.restore();
  }

  // Bigger, boxed label for the DLR format: opaque card so it stays readable even
  // over the wheel, with the spirit name, the earth branch and the heaven branch.
  function drawSectorBox(ctx, x, y, s, fs) {
    var net = s.net;
    var spCol = (net === 'green' || net === 'green_hollow') ? GREEN : (net === 'red' ? RED : GREY);
    var name = SPIRIT_EN[s.general && s.general.cn] || (s.general && s.general.cn) || '';
    var num = SPIRIT_NUM[s.general && s.general.cn];
    var l1 = name;
    // DLR convention (Edu, session 24): the TIANPAN (heaven plate, which rotates)
    // is written ABOVE and the DIPAN (earth plate, fixed to the compass) BELOW.
    // The block itself sits at the DIPAN position — that is what anchors it to the
    // luopan. Writing them the other way round made the whole chart read reversed.
    var l2 = branchLabel(s.heaven) + (num ? ('  ' + num) : '');   // 天盤 tianpan
    var l3 = branchLabel(s.earth);                                 // 地盤 dipan (position)
    ctx.save();
    ctx.font = 'bold ' + fs + 'px sans-serif';
    var w = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width, ctx.measureText(l3).width) + 10;
    var h = fs * 3.2 + 6;
    // card
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x - w / 2, y - h / 2, w, h, 7);
    else ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = 'rgba(255,252,242,0.96)';
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = spCol; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = spCol; ctx.font = 'bold ' + fs + 'px sans-serif';
    ctx.fillText(l1, x, y - fs * 1.1);
    // Status dot (filled green / red / hollow green) INSIDE the card — at the old
    // radius it ended up under the opaque box and was invisible (session 24).
    drawDot(ctx, x - w / 2 + 8, y - fs * 1.1, net);
    ctx.fillStyle = '#7a5a2a'; ctx.font = (fs - 1) + 'px serif';
    ctx.fillText(l2, x, y + fs * 0.1);
    ctx.fillStyle = INK; ctx.font = 'bold ' + (fs - 1) + 'px serif';
    ctx.fillText(l3, x, y + fs * 1.25);
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
      if (!r || r.error || !r.sectors) {
        // Never fail silently: say WHY on the canvas (session 24).
        try {
          ctx.save();
          ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          var msg = '\u26a0 DLR ' + st.year + ': ' + ((r && r.error) || 'chart unavailable');
          ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(msg, cx, 6);
          ctx.fillStyle = '#c62828'; ctx.fillText(msg, cx, 6);
          ctx.restore();
        } catch (eMsg) {}
        return;
      }
      var ang = function (deg) { return (deg - 270 + (ROT || 0)) * Math.PI / 180; };
      var W = (ctx.canvas && ctx.canvas.width) || (cx * 2);
      var H = (ctx.canvas && ctx.canvas.height) || (cy * 2);
      var rLabel = outerR + 108, rDotInner = outerR + 40;
      var pad = 42;
      // ── DLR FORMAT (session 24) ──────────────────────────────────────
      // The 12 DLR sectors ARE the 12 Double Mountains (雙山): each spans 30° and
      // the SECOND mountain of the pair is always the earthly branch, so the sector
      // for a branch at B° runs from B-22.5° to B+7.5°. Four of these boundaries
      // (67.5 / 157.5 / 247.5 / 337.5) coincide exactly with the Eight-Palace
      // boundaries where the Flying Stars live — those are drawn heavier.
      var SECT_BACK = 22.5, SECT_FWD = 7.5;              // sector = [B-22.5°, B+7.5°]
      var PALACE_EDGES = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
      var rLineIn = outerR * 0.62;                        // lines start inside the wheel…
      var rLineOut = outerR + 150;                        // …and protrude well outside it
      var rBox = outerR + 61;                             // centre of each DLR box (outer band)

      // 1) the 12 dividing lines
      ctx.save();
      r.sectors.forEach(function (s) {
        var edge = branchDeg(s.earth) + SECT_FWD;         // shared edge with the next sector
        var e = ((edge % 360) + 360) % 360;
        var coincides = PALACE_EDGES.some(function (p) { return Math.abs(p - e) < 0.01; });
        var a = ang(e);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rLineIn, cy + Math.sin(a) * rLineIn);
        ctx.lineTo(cx + Math.cos(a) * rLineOut, cy + Math.sin(a) * rLineOut);
        // All 12 read clearly; the 4 that meet the palace edges differ by COLOUR,
        // not by fading the other 8 (same rule as the floor-plan view).
        ctx.lineWidth = coincides ? 3 : 2;
        ctx.strokeStyle = coincides ? 'rgba(198,40,40,0.92)' : 'rgba(90,55,20,0.85)';
        ctx.setLineDash([]);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      // 2) one big box per sector, centred in its own 30° wedge
      r.sectors.forEach(function (s) {
        var mid = branchDeg(s.earth) - SECT_BACK + 15;    // middle of the 30° sector
        var a = ang(mid);
        var bx = cx + Math.cos(a) * rBox, by = cy + Math.sin(a) * rBox;
        // (the status dot now lives inside the card — see drawSectorBox)
        drawSectorBox(ctx, bx, by, s, 11);
      });
      // small caption at the top of the canvas
      var cap = st.year + ' ' + r.yearPillar.gz + '  \u00B7  \u6708\u5C07 ' +
                (r.chosenDay ? r.chosenDay.monthGeneral : '?') + '  \u00B7  DLR annual';
      ctx.save();
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var _capCol = els.caption;
      if (!_capCol) { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(cap, cx, 6); }
      // The caption now lives in the right-hand strip (session 26), not over the plan.
      try {
        if (els.caption) {
          els.caption.innerHTML = String(cap).split('\u00b7').map(function (p) {
            return '<div>' + p.trim() + '</div>';
          }).join('');
        } else { ctx.fillStyle = '#5d4037'; ctx.fillText(cap, cx, 6); }
      } catch (eCap) { ctx.fillStyle = '#5d4037'; ctx.fillText(cap, cx, 6); }
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
        // Session 24: floating panel — drag it anywhere with a finger/mouse; the
        // position is remembered. Starts bottom-left, above the "DLR ON" toggle.
        'position:absolute;bottom:52px;left:8px;z-index:9;display:flex;gap:5px;align-items:center;' +
        'background:rgba(255,255,255,.94);border:1px solid #5d4037;border-radius:8px;padding:3px 5px;box-shadow:0 1px 4px rgba(0,0,0,.3);' +
        'touch-action:none;user-select:none;-webkit-user-select:none;');
      // drag grip
      var grip = document.createElement('span');
      grip.textContent = '\u2237';
      grip.title = 'Drag to move this panel';
      grip.setAttribute('style', 'cursor:grab;color:#8d6e63;font-size:15px;font-weight:bold;padding:0 3px;line-height:1;');
      bar.appendChild(grip);
      var mk = function (txt, title) {
        var e = document.createElement('button'); e.type = 'button'; e.textContent = txt; if (title) e.title = title;
        e.setAttribute('style', 'background:#f6f1ea;color:#5d4037;border:1px solid #cbb;border-radius:6px;padding:3px 8px;font-size:12px;font-weight:bold;cursor:pointer;');
        return e;
      };
      var prev = mk('\u25C0', 'Previous year');
      var ylabel = document.createElement('span'); ylabel.id = 'fs-dlr-year';
      ylabel.setAttribute('style', 'min-width:40px;text-align:center;font-size:12px;font-weight:bold;color:#5d4037;');
      var next = mk('\u25B6', 'Next year');
      var plan = mk('\uD83C\uDFE0 Plan', 'Overlay the DLR chart on the saved floor plan (stars visible)');
      var tbl = mk('\uD83D\uDCCB', 'Positives / negatives table for the 12 sectors');
      plan.style.background = '#5d4037'; plan.style.color = '#fff'; plan.style.border = 'none';
      prev.addEventListener('click', function () { st.year = clampYear(st.year - 1); _refreshYear(); var rd = host('fsRedraw'); if (rd) rd(); });
      next.addEventListener('click', function () { st.year = clampYear(st.year + 1); _refreshYear(); var rd = host('fsRedraw'); if (rd) rd(); });
      plan.addEventListener('click', function () { openOnPlan(); });
      tbl.addEventListener('click', function () { openTable(); });
      bar.appendChild(prev); bar.appendChild(ylabel); bar.appendChild(next); bar.appendChild(tbl); bar.appendChild(plan);
      wrap.appendChild(bar);
      _makeDraggable(bar, wrap, grip);
    }
    if (bar.style.display !== 'flex') bar.style.display = 'flex';
    _refreshYear();
  }
  // ── Floating panel drag (session 24) ────────────────────────────────
  // Pointer Events cover finger and mouse with one code path. Dragging starts on
  // the grip, or anywhere on the bar background — never on a button, so the year
  // arrows and "Plan" keep working normally. Position is clamped inside the luopan
  // wrapper and remembered in localStorage, per device.
  var DRAG_KEY = 'xkdg_dlr_bar_pos';
  function _savePos(l, t, key) { try { localStorage.setItem(key || DRAG_KEY, JSON.stringify({ l: Math.round(l), t: Math.round(t) })); } catch (e) {} }
  function _loadPos(key) { try { var v = JSON.parse(localStorage.getItem(key || DRAG_KEY) || 'null'); return (v && isFinite(v.l) && isFinite(v.t)) ? v : null; } catch (e) { return null; } }
  function _applyPos(bar, wrap, p) {
    if (!p) return;
    var wr = wrap.getBoundingClientRect(), br = bar.getBoundingClientRect();
    var maxL = Math.max(0, wr.width - br.width), maxT = Math.max(0, wr.height - br.height);
    bar.style.left = Math.max(0, Math.min(maxL, p.l)) + 'px';
    bar.style.top = Math.max(0, Math.min(maxT, p.t)) + 'px';
    bar.style.bottom = 'auto';
  }
  function _makeDraggable(bar, wrap, grip, key) {
    var saved = _loadPos(key);
    if (saved) { setTimeout(function () { _applyPos(bar, wrap, saved); }, 0); }
    var dragging = false, sx = 0, sy = 0, sl = 0, stp = 0;
    function down(e) {
      // let the buttons do their job
      if (e.target && e.target.tagName === 'BUTTON') return;
      var wr = wrap.getBoundingClientRect(), br = bar.getBoundingClientRect();
      sl = br.left - wr.left; stp = br.top - wr.top;
      // switch from bottom-anchored to top-anchored on first drag
      bar.style.left = sl + 'px'; bar.style.top = stp + 'px'; bar.style.bottom = 'auto';
      sx = e.clientX; sy = e.clientY; dragging = true;
      if (grip) grip.style.cursor = 'grabbing';
      try { bar.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      var wr = wrap.getBoundingClientRect(), br = bar.getBoundingClientRect();
      var maxL = Math.max(0, wr.width - br.width), maxT = Math.max(0, wr.height - br.height);
      var nl = Math.max(0, Math.min(maxL, sl + (e.clientX - sx)));
      var nt = Math.max(0, Math.min(maxT, stp + (e.clientY - sy)));
      bar.style.left = nl + 'px'; bar.style.top = nt + 'px';
      e.preventDefault();
    }
    function up(e) {
      if (!dragging) return;
      dragging = false;
      if (grip) grip.style.cursor = 'grab';
      try { bar.releasePointerCapture(e.pointerId); } catch (er) {}
      _savePos(parseFloat(bar.style.left) || 0, parseFloat(bar.style.top) || 0, key);
    }
    bar.addEventListener('pointerdown', down);
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
    // double-tap the grip → back to the default corner
    if (grip) grip.addEventListener('dblclick', function () {
      try { localStorage.removeItem(key || DRAG_KEY); } catch (er) {}
      bar.style.left = '8px'; bar.style.top = 'auto'; bar.style.bottom = '52px';
    });
  }

  // ── Positives / negatives TABLE (session 24) ────────────────────────
  // A floating, draggable panel listing the 12 sectors with everything that made
  // them green or red, so the reasons behind each dot are visible at a glance.
  function openTable() {
    var wrap = document.getElementById('fs-canvas-wrap') || document.getElementById('fs-luopan-wrap');
    if (!wrap) { alert('Luopan container not found.'); return; }
    var old = document.getElementById('fs-dlr-table');
    if (old) { old.parentNode.removeChild(old); return; }        // toggle off
    var r = st.result;
    if (!r || !r.sectors) {                       // not drawn yet → build it now
      try { r = compute(ringFacing(), st.year); st.result = r; } catch (e) {}
    }
    if (!r || r.error || !r.sectors) { alert('DLR chart not available' + (r && r.error ? (': ' + r.error) : '') + '. Turn the DLR ring on.'); return; }
    var box = document.createElement('div');
    box.id = 'fs-dlr-table';
    box.setAttribute('style',
      'position:absolute;top:10px;right:10px;z-index:40;width:min(360px,92vw);max-height:78%;overflow:auto;' +
      'background:#fffdf7;border:2px solid #5d4037;border-radius:10px;box-shadow:0 3px 14px rgba(0,0,0,.35);' +
      'padding:8px 10px;font-size:12px;color:#3b2b1a;touch-action:none;user-select:none;-webkit-user-select:none;');
    var DOT = { green: '#1b8a3a', red: '#c62828', green_hollow: '#1b8a3a', cancel: '#9e9e9e', neutral: '#bdbdbd' };
    var h = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">'
      + '<span id="fs-dlr-table-grip" style="cursor:grab;color:#8d6e63;font-size:15px;font-weight:bold;">\u2237</span>'
      + '<strong style="flex:1;">\u5927\u516D\u58EC \u00b7 ' + st.year + ' ' + (r.yearPillar ? r.yearPillar.gz : '') + '</strong>'
      + '<button id="fs-dlr-table-x" style="background:#5d4037;color:#fff;border:none;border-radius:6px;padding:2px 8px;cursor:pointer;font-weight:bold;">\u2715</button></div>';
    var _mb = '';
    try {
      var _eng = DLR();
      if (_eng && typeof _eng.monthBranchFor === 'function' && r.chosenDay && r.chosenDay.date) {
        _mb = _eng.monthBranchFor(r.chosenDay.date) || '';
      }
    } catch (e) {}
    h += '<div style="font-size:10px;color:#7a5a2a;margin-bottom:6px;">Day ' + (r.chosenDay ? String(r.chosenDay.date).slice(0, 15) : '?')
      + ' \u00b7 \u6708\u5C07 ' + (r.chosenDay ? r.chosenDay.monthGeneral : '?')
      + (_mb ? (' \u00b7 \u6708\u652F ' + _mb) : '')
      + ' \u00b7 mode ' + (r.chosenDay ? r.chosenDay.mode : '?') + '</div>';
    h += '<table style="width:100%;border-collapse:collapse;">';
    h += '<tr style="background:#f1e7d4;font-size:10px;text-align:left;">'
      + '<th style="padding:3px;">\u5929\u76E4 \u00b7 sector</th><th style="padding:3px;">General</th><th style="padding:3px;">+ / \u2212</th></tr>';
    r.sectors.forEach(function (s) {
      var col = DOT[s.net] || '#bdbdbd';
      var mark = (s.net === 'green_hollow') ? '\u25CB' : (s.net === 'cancel' ? '\u2298' : '\u25CF');
      var pos = (s.greens || []).join(', ');
      var neg = (s.reds || []).join(', ');
      var vir = (s.virtues || []).join(', ');
      h += '<tr style="border-top:1px solid #e6dcc8;">';
      h += '<td style="padding:4px 3px;white-space:nowrap;"><span style="color:' + col + ';font-size:13px;">' + mark + '</span> '
        + '<strong>' + branchLabel(s.heaven) + '</strong><br><span style="font-size:10px;color:#7a5a2a;">over ' + branchLabel(s.earth) + '</span></td>';
      h += '<td style="padding:4px 3px;white-space:nowrap;">' + ((s.general && s.general.cn) || '') + '<br>'
        + '<span style="font-size:10px;color:#666;">' + (SPIRIT_EN[s.general && s.general.cn] || '') + '</span></td>';
      h += '<td style="padding:4px 3px;font-size:11px;">';
      if (pos) h += '<div style="color:#1b8a3a;">+ ' + pos + '</div>';
      if (neg) h += '<div style="color:#c62828;">\u2212 ' + neg + '</div>';
      if (vir) h += '<div style="color:#8d6e63;font-size:10px;">' + vir + '</div>';
      if (!pos && !neg && !vir) h += '<span style="color:#bbb;">\u2014</span>';
      h += '</td></tr>';
    });
    h += '</table>';
    h += '<div style="margin-top:6px;font-size:10px;color:#777;line-height:1.5;">'
      + '<span style="color:#1b8a3a;">\u25CF</span> auspicious \u00b7 <span style="color:#c62828;">\u25CF</span> inauspicious \u00b7 '
      + '<span style="color:#1b8a3a;">\u25CB</span> Heavenly Doctor with a negative \u00b7 <span style="color:#9e9e9e;">\u2298</span> cancelled'
      + '<br>Big branch = \u5929\u76E4 tianpan \u2014 the general and the spirits are read on it.'
      + '<br>\u201cover \u2026\u201d = \u5730\u76E4 dipan, the sector of the house it lands on.</div>';
    box.innerHTML = h;
    wrap.appendChild(box);
    document.getElementById('fs-dlr-table-x').addEventListener('click', function () {
      if (box.parentNode) box.parentNode.removeChild(box);
    });
    try { _makeDraggable(box, wrap, document.getElementById('fs-dlr-table-grip'), 'xkdg_dlr_table_pos'); } catch (e) {}
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
    // Session 24: st.center is kept in PIXELS. Whenever the canvas is resized we
    // must move it proportionally, otherwise the rays, the arrow and the labels
    // are drawn around a stale point (they used to drift apart in full screen).
    var _oldW = st.drawW, _oldH = st.drawH, _oldC = st.center;
    // Session 24: roughly double the old drawing area, and unlimited in full screen.
    var _fs = !!st.fullscreen;
    var maxW = Math.min((typeof window !== 'undefined' ? window.innerWidth : 800) - (_fs ? 24 : 40), _fs ? 4000 : 1900);
    var maxH = Math.max(360, (typeof window !== 'undefined' ? window.innerHeight : 700) - (_fs ? 150 : 210));
    if (st.img) {
      var nW = st.img.naturalWidth || st.img.width, nH = st.img.naturalHeight || st.img.height;
      // Session 24: the old cap at 1 meant a small photo was NEVER enlarged, so a
      // bigger window changed nothing. Allow upscaling (a plan is line art, it
      // survives it well), capped at 4x so it can't get absurdly soft.
      // In full screen use the whole WIDTH and allow up to ~1.9 viewport heights,
      // letting the overlay scroll vertically — otherwise the window height caps
      // the plan and enlarging the window changes almost nothing.
      var hBudget = _fs ? maxH * 1.25 : maxH;
      var scale = Math.min(maxW / nW, hBudget / nH, 2);
      st.drawW = Math.max(1, Math.round(nW * scale)); st.drawH = Math.max(1, Math.round(nH * scale));
    } else { var side = Math.max(420, Math.min(maxW, maxH, _fs ? 3000 : 1400)); st.drawW = side; st.drawH = side; }
    if (_oldC && _oldW > 0 && _oldH > 0 && (st.drawW !== _oldW || st.drawH !== _oldH)) {
      st.center = { x: _oldC.x * (st.drawW / _oldW), y: _oldC.y * (st.drawH / _oldH) };
    }
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
    // 12 Double-Mountain boundary rays. They sit at branch + 7.5° (NOT k*30-15,
    // which was the old bug: with that offset NONE of them met the Eight-Palace
    // edges). At branch+7.5 exactly four — 67.5 / 157.5 / 247.5 / 337.5 — coincide
    // with the 45° palace boundaries, and those are drawn heavier. (Edu, session 24)
    var R = (st.img ? 0.70 : 0.62) * Math.min(st.drawW, st.drawH);   // protrude further
    var PALACE_EDGES_FP = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
    ctx.save();
    for (var k = 0; k < 12; k++) {
      var edg = ((k * 30 + 7.5) % 360 + 360) % 360;
      var coin = PALACE_EDGES_FP.some(function (p) { return Math.abs(p - edg) < 0.01; });
      var a = canvasAngle(edg);
      ctx.beginPath(); ctx.moveTo(ctr.x, ctr.y); ctx.lineTo(ctr.x + R * Math.cos(a), ctr.y + R * Math.sin(a));
      // All 12 must read clearly — they are the sectors of the chart. The 4 that
      // coincide with the palace edges are told apart by COLOUR, not by making the
      // other 8 faint (Edu, session 24: it was the wrong way round).
      ctx.lineWidth = coin ? 3 : 2;
      ctx.strokeStyle = coin ? 'rgba(198,40,40,0.92)' : 'rgba(90,55,20,0.85)';
      ctx.setLineDash([]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    if (st.result && !st.result.error && st.result.sectors) {
      var rLabel = (st.img ? 0.40 : 0.36) * Math.min(st.drawW, st.drawH);
      // Edu, session 26: at /46 the cards were wider than the 30\u00b0 sector they belong to
      // and ran into each other. The arc available to a sector at rLabel is about 0.21\u00b7D,
      // so the font has to stay well under that.
      var _lf = Math.max(9, Math.round(Math.min(st.drawW, st.drawH) / 78));
      st.result.sectors.forEach(function (s) {
        var ang = canvasAngle(branchDeg(s.earth));
        var lx = ctr.x + rLabel * Math.cos(ang), ly = ctr.y + rLabel * Math.sin(ang);
        lx = Math.max(46, Math.min(st.drawW - 46, lx));
        ly = Math.max(34, Math.min(st.drawH - 34, ly));
        // Edu, session 26: over a floor plan the plain outlined text was unreadable.
        // Same boxed card the luopan ring uses \u2014 opaque, colour-coded border.
        drawSectorBox(ctx, lx, ly, s, _lf);
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

  // The chart labels are the point of the drawing; the info block must not eat into
  // it. So it is stacked as a narrow COLUMN pinned to the left edge, never a wide
  // strip across the top (Edu).
  /* ===== EXPORT: save as PNG / print ====================================
   * The chart is only useful to a student if it can leave the screen. Both go
   * through a white sheet first: the canvas may be transparent, and a
   * transparent PNG prints as a black page. No PDF library — every browser's
   * print dialog, phones included, offers "Save as PDF" on its own. */
  function _expSheet() {
    var cv = els.canvas;
    if (!cv || !cv.width || !cv.height) { alert('Draw the chart first.'); return null; }
    var out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    var cx = out.getContext('2d');
    cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, out.width, out.height);
    cx.drawImage(cv, 0, 0);
    return out;
  }
  function _expSafeName(s) {
    return String(s == null ? '' : s).replace(/[\\\/:*?"<>|\u0000-\u001f]+/g, '-')
      .replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  function _expEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; });
  }
  function exportPlanImage(defaultName) {
    var cv = _expSheet(); if (!cv) return;
    var fallback = _expSafeName(defaultName) || 'chart';
    var name = window.prompt('File name', fallback);
    if (name === null) return;                      // user cancelled
    name = _expSafeName(name) || fallback;
    if (!/\.png$/i.test(name)) name += '.png';
    function grab(url, revoke) {
      var a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function () {
        try { document.body.removeChild(a); } catch (e) {}
        if (revoke) { try { URL.revokeObjectURL(url); } catch (e2) {} }
      }, 500);
    }
    function viaDataUrl() {
      try { grab(cv.toDataURL('image/png'), false); }
      catch (e) { alert('Could not build the image.'); }
    }
    if (typeof cv.toBlob === 'function' && typeof URL !== 'undefined' && URL.createObjectURL) {
      try {
        cv.toBlob(function (b) { if (b) grab(URL.createObjectURL(b), true); else viaDataUrl(); }, 'image/png');
      } catch (e) { viaDataUrl(); }
    } else viaDataUrl();
  }
  function printPlan(title) {
    var cv = _expSheet(); if (!cv) return;
    var url;
    try { url = cv.toDataURL('image/png'); }
    catch (e) { alert('Could not build the image.'); return; }
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + _expEsc(title || 'Chart') + '</title>'
      + '<style>@page{margin:10mm;}html,body{margin:0;padding:0;background:#fff;}'
      + 'img{width:100%;height:auto;display:block;}</style></head>'
      + '<body><img src="' + url + '"></body></html>';
    var win = null;
    try { win = window.open('', '_blank'); } catch (e) { win = null; }
    if (win && win.document) {
      try {
        win.document.open(); win.document.write(html); win.document.close();
        var go = function () { try { win.focus(); win.print(); } catch (e2) {} };
        if (win.document.readyState === 'complete') setTimeout(go, 350);
        else win.onload = go;
        return;
      } catch (e3) { try { win.close(); } catch (e4) {} }
    }
    // Popup blocked (common on phones): print from a hidden frame instead.
    var fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
    document.body.appendChild(fr);
    try {
      var d = fr.contentWindow.document;
      d.open(); d.write(html); d.close();
      setTimeout(function () {
        try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e5) {}
        setTimeout(function () { try { document.body.removeChild(fr); } catch (e6) {} }, 60000);
      }, 600);
    } catch (e7) {
      try { document.body.removeChild(fr); } catch (e8) {}
      alert('Printing was blocked by the browser. Use 📥 Save image and print the file.');
    }
  }

  function drawInfoPanel(ctx) {
    var r = st.result, lines;
    if (!r || r.error) {
      lines = r && r.error ? ['DLR: ' + r.error] : ['Da Liu Ren', 'year ' + st.year, 'press \u201CDraw chart\u201D'];
    } else {
      // The month BRANCH the Virtues are read from (session 27), not the calendar
      // season of the chosen day: that day is whichever Tai Sui day satisfies the
      // riding rule, so its season says nothing about the chart.
      var mb = '';
      try {
        var eng = DLR();
        if (eng && typeof eng.monthBranchFor === 'function' && r.chosenDay && r.chosenDay.date) {
          mb = eng.monthBranchFor(r.chosenDay.date) || '';
        }
      } catch (e) {}
      lines = [st.year + ' ' + r.yearPillar.gz,
               '\u6708\u5C07 ' + (r.chosenDay ? r.chosenDay.monthGeneral : '?')];
      if (mb) lines.push('\u6708\u652F ' + mb);
      lines.push('Void ' + (r.dayVoid ? r.dayVoid.join('') : ''));
    }
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    var wMax = 0;
    lines.forEach(function (t) { wMax = Math.max(wMax, ctx.measureText(t).width); });
    var padX = 8, padY = 6, lh = 17;
    var w = wMax + padX * 2, h = lines.length * lh + padY * 2;
    var x = 8, y = 8;                       // pinned to the LEFT edge
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; roundRect(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(90,55,20,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a2f10';
    lines.forEach(function (t, i) { ctx.fillText(t, x + padX, y + padY + lh * i + lh / 2); });
    ctx.restore();
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
    var box = el('div', { id: 'fpd-box', style:
      'background:#fff;border-radius:12px;max-width:1980px;width:100%;margin:auto;padding:14px 14px 18px;box-shadow:0 10px 40px rgba(0,0,0,.4);' });
    ov.appendChild(box);

    var head = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;' });
    head.appendChild(el('div', { style: 'font-size:15px;font-weight:bold;color:#5d4037;' },
      '\uD83C\uDC04 Da Liu Ren \u2014 Annual chart' + (st.houseName ? ('  \u00B7  ' + st.houseName) : '')));
    var fsBtn = el('button', { title: 'Full screen', style: 'background:#eee;border:none;border-radius:8px;width:34px;height:34px;font-size:16px;cursor:pointer;margin-right:6px;' }, '\u26F6');
    fsBtn.addEventListener('click', function () {
      st.fullscreen = !st.fullscreen;
      fsBtn.textContent = st.fullscreen ? '\u2715\uFE0E' : '\u26F6';
      fsBtn.title = st.fullscreen ? 'Exit full screen' : 'Full screen';
      box.style.maxWidth = st.fullscreen ? 'none' : '1980px';
      box.style.borderRadius = st.fullscreen ? '0' : '12px';
      ov.style.padding = st.fullscreen ? '0' : '14px';
      try { fitCanvas(); draw(); } catch (e) {}
    });
    var x = el('button', { style: 'background:#eee;border:none;border-radius:8px;width:34px;height:34px;font-size:18px;cursor:pointer;' }, '\u2715');
    x.addEventListener('click', function () { st.fullscreen = false; ov.remove(); });
    head.appendChild(fsBtn); head.appendChild(x); box.appendChild(head);

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
    actCol.appendChild(drawBtn); actCol.appendChild(saveBtn);
    var imgBtn = el('button', { style: 'background:#fff;color:#1565c0;border:1px solid #1565c0;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:bold;cursor:pointer;' }, '\uD83D\uDCE5 Save image');
    imgBtn.addEventListener('click', function () {
      exportPlanImage((st.houseName ? (st.houseName + ' ') : '') + st.year + ' DLR');
    });
    var prnBtn = el('button', { style: 'background:#fff;color:#1565c0;border:1px solid #1565c0;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:bold;cursor:pointer;' }, '\uD83D\uDDA8 Print');
    prnBtn.addEventListener('click', function () {
      printPlan((st.houseName ? (st.houseName + ' \u00b7 ') : '') + st.year + ' Da Liu Ren');
    });
    actCol.appendChild(imgBtn); actCol.appendChild(prnBtn);
    ctlWrap.appendChild(actCol);
    // Edu, session 26: the controls used to eat a full band across the top and the
    // chart caption another one. Both now sit in narrow side columns, so the plan
    // itself gets the height. On a narrow screen the row wraps back to stacked.
    ctlWrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;align-items:stretch;' +
      'flex:0 0 150px;min-width:130px;';
    var row = el('div', { style: 'display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;' });
    row.appendChild(ctlWrap);

    var canWrap = el('div', { style: 'flex:1 1 420px;min-width:280px;display:flex;justify-content:center;' +
      'background:#faf7f1;border:1px solid #eee;border-radius:8px;padding:6px;overflow:auto;' });
    els.canvas = el('canvas', { width: '1400', height: '1400', style: 'display:block;max-width:100%;height:auto;' });
    canWrap.appendChild(els.canvas); row.appendChild(canWrap);

    // right-hand strip: the year / season / general / void caption, off the canvas
    els.caption = el('div', { style: 'flex:0 0 120px;min-width:110px;font-size:12px;line-height:1.6;' +
      'color:#4a2f10;background:#fffdf6;border:1px solid #e6dcc4;border-radius:8px;padding:8px 9px;' });
    row.appendChild(els.caption);
    box.appendChild(row);

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
        if (document.getElementById('fpd-overlay')) { fitCanvas(); redraw(); }   // fitCanvas rescales the centre
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

  var API = { open: open, openOnPlan: openOnPlan, toggleRing: toggleRing, drawIfOn: drawIfOn, mount: mount,
              isRingOn: function () { return !!st.ringOn; }, openTable: openTable };
  if (typeof window !== 'undefined') window.FloorPlanDLR = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();

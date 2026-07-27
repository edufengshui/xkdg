/**
 * qmdj-annual.js — QMDJ Feng Shui ANNUAL chart (session 26)
 * ---------------------------------------------------------------------------
 * Edu's method, in three steps:
 *
 *   PERIOD → JU     The Flying-Stars period we are IN (9 until 2044) is the Ju.
 *                   Yang Zhai Feng Shui uses Yang Dun only, so: Yang Ju <period>.
 *   YEAR   → DAY    The stem of the current solar year picks the day-stem GROUP of
 *                   the 60 rotating charts. 2026 is 丙午 → the Bing-Xin group.
 *   FACING → HOUR   The house facing, reduced to its branch through the DOUBLE
 *                   MOUNTAIN, is the hour branch. The hour STEM follows from the
 *                   day group by the Five Rats rule (五鼠遁): a Bing/Xin day opens
 *                   at 戊子, so the 午 hour is 甲午.
 *
 * DOUBLE MOUNTAIN (雙山), confirmed by Edu: the 24 mountains pair off two by two
 * starting at 壬 — 壬子 癸丑 艮寅 甲卯 乙辰 巽巳 丙午 丁未 坤申 庚酉 辛戌 乾亥 — and
 * ANY facing landing in a pair is attributed to the branch, i.e. the second of the two.
 *
 * The chart itself is NOT computed here: it is the app's own rotating-pan engine
 * (qmdj-water-scanner.js) driven by Ju + hour instead of by a date. Verified palace
 * by palace against Edu's reference chart for Vienna — Yang Ju 9, day Bing-Xin,
 * hour 甲午 — all nine palaces identical, stems, stars, doors and spirits.
 *
 * NOTE ON SPIRITS: this is the ROTATING pan, which carries 白虎 Tiger and 玄武
 * Warrior in both dun. The Yang-only 勾陳/朱雀 pair belongs to the FLYING charts
 * (Edu, session 26) and must NOT be applied here.
 */
(function () {
  'use strict';

  // 24 mountains from 壬, in compass order. Pairs of two = the double mountains.
  var M24 = ['\u58EC', '\u5B50', '\u7678', '\u4E11', '\u826E', '\u5BC5',
             '\u7532', '\u536F', '\u4E59', '\u8FB0', '\u5DFD', '\u5DF3',
             '\u4E19', '\u5348', '\u4E01', '\u672A', '\u5764', '\u7533',
             '\u5E9A', '\u9149', '\u8F9B', '\u620C', '\u4E7E', '\u4EA5'];

  var STEMS = ['\u7532', '\u4E59', '\u4E19', '\u4E01', '\u620A',
               '\u5DF1', '\u5E9A', '\u8F9B', '\u58EC', '\u7678'];
  var STEM_EN = { '\u7532': 'Jia', '\u4E59': 'Yi', '\u4E19': 'Bing', '\u4E01': 'Ding', '\u620A': 'Wu',
                  '\u5DF1': 'Ji', '\u5E9A': 'Geng', '\u8F9B': 'Xin', '\u58EC': 'Ren', '\u7678': 'Gui' };
  var BRANCHES = ['\u5B50', '\u4E11', '\u5BC5', '\u536F', '\u8FB0', '\u5DF3',
                  '\u5348', '\u672A', '\u7533', '\u9149', '\u620C', '\u4EA5'];
  var BRANCH_EN = { '\u5B50': 'Zi', '\u4E11': 'Chou', '\u5BC5': 'Yin', '\u536F': 'Mao', '\u8FB0': 'Chen',
                    '\u5DF3': 'Si', '\u5348': 'Wu', '\u672A': 'Wei', '\u7533': 'Shen', '\u9149': 'You',
                    '\u620C': 'Xu', '\u4EA5': 'Hai' };

  // Five Rats Escaping: which stem opens the 子 hour, per day stem.
  //   甲/己 → 甲子   乙/庚 → 丙子   丙/辛 → 戊子   丁/壬 → 庚子   戊/癸 → 壬子
  var ZI_STEM = { '\u7532': '\u7532', '\u5DF1': '\u7532', '\u4E59': '\u4E19', '\u5E9A': '\u4E19',
                  '\u4E19': '\u620A', '\u8F9B': '\u620A', '\u4E01': '\u5E9A', '\u58EC': '\u5E9A',
                  '\u620A': '\u58EC', '\u7678': '\u58EC' };
  // The five day-stem GROUPS of the 60 rotating charts, as the reference tables name them.
  var DAY_GROUP = { '\u7532': 'Jia-Ji', '\u5DF1': 'Jia-Ji', '\u4E59': 'Yi-Geng', '\u5E9A': 'Yi-Geng',
                    '\u4E19': 'Bing-Xin', '\u8F9B': 'Bing-Xin', '\u4E01': 'Ding-Ren', '\u58EC': 'Ding-Ren',
                    '\u620A': 'Wu-Gui', '\u7678': 'Wu-Gui' };

  // Palace → compass label, and the grid order the app uses everywhere: SOUTH ON TOP.
  var PAL_DIR = { 1: 'N', 2: 'SW', 3: 'E', 4: 'SE', 5: '', 6: 'NW', 7: 'W', 8: 'NE', 9: 'S' };
  var GRID = [4, 9, 2, 3, 5, 7, 8, 1, 6];        // SE S SW / E C W / NE N NW

  // ── the three inputs ──────────────────────────────────────────────────
  function mountainFromDeg(deg) {
    var d = ((+deg % 360) + 360) % 360;
    // 壬 is centred on 345°, i.e. it starts at 337.5°.
    var i = Math.floor((((d - 337.5) % 360) + 360) % 360 / 15);
    return M24[i % 24];
  }
  // Double mountain: the branch is the second of each pair.
  function branchOfMountain(m) {
    var i = M24.indexOf(m);
    if (i < 0) return null;
    return M24[i % 2 === 0 ? i + 1 : i];
  }
  function hourStemFor(dayStem, branch) {
    var z = ZI_STEM[dayStem];
    if (!z) return null;
    var si = STEMS.indexOf(z), bi = BRANCHES.indexOf(branch);
    if (si < 0 || bi < 0) return null;
    return STEMS[(si + bi) % 10];
  }

  // The stem of the current SOLAR year (Lichun to Lichun). Uses the app's own year
  // table when present so there is a single source of truth for the boundary.
  function yearStemOf(dateIso) {
    try {
      var iso = dateIso || new Date().toISOString().slice(0, 10);
      if (typeof CHINESE_YEAR_STARTS !== 'undefined' && Array.isArray(CHINESE_YEAR_STARTS)) {
        for (var i = 0; i < CHINESE_YEAR_STARTS.length; i++) {
          var y = CHINESE_YEAR_STARTS[i];
          if (iso >= y.start && iso <= y.end) return y.year.charAt(0);
        }
      }
      // Fallback: 1984 was 甲子, and the year turns at Lichun (4 Feb, near enough).
      var p = iso.split('-'), yr = +p[0];
      if (iso < (yr + '-02-04')) yr -= 1;
      return STEMS[(((yr - 1984) % 10) + 10) % 10];
    } catch (e) { return null; }
  }

  // ── the chart ─────────────────────────────────────────────────────────
  function compute(opt) {
    opt = opt || {};
    var out = { ok: false, reason: '' };
    var period = parseInt(opt.period, 10);
    if (!isFinite(period) || period < 1 || period > 9) { out.reason = 'no period'; return out; }
    var deg = parseFloat(opt.facingDeg);
    if (!isFinite(deg)) { out.reason = 'no facing'; return out; }

    var yearStem = opt.yearStem || yearStemOf(opt.date);
    if (!yearStem) { out.reason = 'no year'; return out; }

    var mountain = mountainFromDeg(deg);
    var branch = branchOfMountain(mountain);
    var hourStem = hourStemFor(yearStem, branch);
    if (!branch || !hourStem) { out.reason = 'facing/hour'; return out; }

    var api = (typeof window !== 'undefined') && window.QMDJWaterScanner;
    if (!api || typeof api.rotatingChartFor !== 'function') { out.reason = 'engine missing'; return out; }
    var chart = api.rotatingChartFor(period, 'yang', STEM_EN[hourStem], BRANCH_EN[branch]);
    if (!chart || !chart.palaces) { out.reason = 'engine returned nothing'; return out; }

    out.ok = true;
    out.ju = period;
    out.dun = 'yang';
    out.yearStem = yearStem;
    out.dayGroup = DAY_GROUP[yearStem] || '';
    out.facingDeg = deg;
    out.house = opt.house || '';
    out.mountain = mountain;
    out.branch = branch;
    out.hourStem = hourStem;
    out.hourGanZhi = hourStem + branch;
    out.hourEn = STEM_EN[hourStem] + '-' + BRANCH_EN[branch];
    out.palaces = chart.palaces;
    out.chart = chart;
    return out;
  }

  // ── the card ──────────────────────────────────────────────────────────
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  // The chart itself is drawn by the app's OWN QMDJ renderer — the same showQimenChart()
  // behind the 🎲 dice icon — so the annual view is not a look-alike copy but literally the
  // same table, with the same colours, hexagrams and layout. We only add the heading that
  // says where its three ingredients came from.
  function cardHtml(r) {
    if (!r || !r.ok) {
      return '<div style="padding:18px;font:13px system-ui;color:#c62828;">Could not build the annual chart' +
             (r && r.reason ? (' \u2014 ' + esc(r.reason)) : '') + '.</div>';
    }
    var head = '<div style="text-align:center;font:600 14px system-ui;color:#1b5e20;margin-bottom:2px;">' +
      'QMDJ Feng Shui \u00b7 Annual chart' + (r.house ? (' \u00b7 ' + esc(r.house)) : '') + '</div>' +
      '<div style="text-align:center;font:11px system-ui;color:#555;margin-bottom:8px;">' +
      'Yang Ju ' + r.ju + ' \u00b7 Day ' + esc(r.dayGroup) + ' \u00b7 Hour ' + esc(r.hourGanZhi) + '<br>' +
      'facing ' + Math.round(r.facingDeg) + '\u00b0 \u2014 mountain ' + esc(r.mountain) +
      ' \u2192 branch ' + esc(r.branch) + ' (double mountain)</div>';

    var body = '';
    try {
      if (typeof window.showQimenChart === 'function') {
        body = window.showQimenChart('2000-01-01', r.hourStem, r.branch, null, {
          mode: 'rotating', returnHtml: true, forceJuDun: { ju: r.ju, dun: r.dun }
        }) || '';
      }
    } catch (e) { body = ''; }
    if (!body) body = '<div style="padding:14px;font:12px system-ui;color:#c62828;">' +
      'The QMDJ chart renderer is not available on this page.</div>';
    return head + body;
  }


  // ── what the menu calls ───────────────────────────────────────────────
  // Reads the active house/floor through the app's own accessors, so there is no
  // second copy of "which house am I looking at".
  // The active house/floor, read through the app's own accessor (window.XKDGHouse),
  // so there is no second copy of "which house am I looking at". Falls back to the
  // facing box on the page when no house profile is active.
  function activeInputs() {
    var o = { period: null, facingDeg: null, house: '' };
    try {
      if (window.XKDGHouse && typeof window.XKDGHouse.active === 'function') {
        var act = window.XKDGHouse.active();
        var h = act && (act.house || act);
        if (h) {
          o.house = h.name || '';
          var fl = null;
          if (h.floors && h.floors.length) fl = h.floors[h.activeFloor || 0] || h.floors[0];
          o.facingDeg = (fl && fl.facing != null) ? fl.facing : h.houseFacing;
          o.period = (fl && fl.period != null) ? fl.period : h.period;
        }
      }
    } catch (e) {}
    try {
      if (o.facingDeg == null || !isFinite(o.facingDeg)) {
        var fd = document.getElementById('facing-degree') || document.getElementById('fs-facing-deg');
        if (fd && fd.value !== '') o.facingDeg = parseFloat(fd.value);
      }
    } catch (e) {}
    return o;
  }


  function open() {
    var inp = activeInputs();
    // The Ju is the period we are IN, not the period the house was built in.
    var r = compute({ period: window.QMDJAnnualPeriod || 9, facingDeg: inp.facingDeg, house: inp.house });
    var host = document.getElementById('fs-cardview-html');
    if (!host) { alert('Card area not found.'); return; }
    host.innerHTML = '<div style="width:100%;">' + cardHtml(r) + '</div>';
    host.style.display = 'flex';
    var cv = document.getElementById('fs-canvas'); if (cv) cv.style.display = 'none';
    window.__qmdjAnnualOpen = true;
    return r;
  }
  function close() {
    var host = document.getElementById('fs-cardview-html');
    if (host) { host.innerHTML = ''; host.style.display = 'none'; }
    var cv = document.getElementById('fs-canvas'); if (cv) cv.style.display = '';
    window.__qmdjAnnualOpen = false;
  }
  function toggle() { return window.__qmdjAnnualOpen ? close() : open(); }

  window.QMDJAnnual = {
    compute: compute, cardHtml: cardHtml, open: open, close: close, toggle: toggle,
    _activeInputs: activeInputs,
    mountainFromDeg: mountainFromDeg, branchOfMountain: branchOfMountain,
    hourStemFor: hourStemFor, yearStemOf: yearStemOf,
    M24: M24, DAY_GROUP: DAY_GROUP
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
//  RING ON THE LUOPAN (session 26)
//  Hooked into the same place FloorPlanDLR uses: fsRedraw calls drawIfOn LAST,
//  with absolute (untransformed) coordinates. Same conventions: ang() maps a
//  compass degree to canvas angle honouring the luopan rotation ROT.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  var A = window.QMDJAnnual;
  if (!A) return;

  var st = { ringOn: false, key: '', cached: null };
  // The eight outer palaces at their compass centres. Centre palace 5 has no direction.
  var RING = [{ p: 1, deg: 0, d: 'N' }, { p: 8, deg: 45, d: 'NE' }, { p: 3, deg: 90, d: 'E' },
              { p: 4, deg: 135, d: 'SE' }, { p: 9, deg: 180, d: 'S' }, { p: 2, deg: 225, d: 'SW' },
              { p: 7, deg: 270, d: 'W' }, { p: 6, deg: 315, d: 'NW' }];
  var FAV = { Open: 1, Rest: 1, Birth: 1, View: 1 };

  function current() {
    var inp = A._activeInputs();
    var key = (inp.facingDeg == null ? '?' : inp.facingDeg) + '@' + (window.QMDJAnnualPeriod || 9);
    if (st.key === key && st.cached) return st.cached;
    var r = A.compute({ period: window.QMDJAnnualPeriod || 9, facingDeg: inp.facingDeg, house: inp.house });
    st.key = key; st.cached = r;
    return r;
  }
  function invalidate() { st.key = ''; st.cached = null; }

  // The palaces around the wheel are the CHART'S OWN CELLS (Edu, session 26: "take the
  // box as it appears in the qimen chart and paste it in the palace"). They are real DOM
  // nodes laid over the canvas inside #fs-canvas-wrap, not shapes redrawn on the canvas —
  // so they carry the chart's exact colours, fonts and layout, and follow it if it ever
  // changes. Positions are expressed in % of the canvas box, because the canvas is
  // displayed scaled (width:100%), so canvas pixels are not CSS pixels.
  var BOX_PX = 104;                       // side of a palace box, in canvas pixels
  var CANVAS_W = 1100, CANVAS_H = 1130;

  function boxHost() {
    var wrap = document.getElementById('fs-canvas-wrap');
    if (!wrap) return null;
    var host = document.getElementById('qmdj-annual-boxes');
    if (!host) {
      host = document.createElement('div');
      host.id = 'qmdj-annual-boxes';
      host.style.cssText = 'position:absolute;inset:0;z-index:20;pointer-events:none;';
      wrap.appendChild(host);
    }
    return host;
  }
  function clearBoxes() {
    var host = document.getElementById('qmdj-annual-boxes');
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }

  function syncBoxes(cx, cy, outerR, ROT) {
    var host = boxHost();
    if (!host) return;
    var r = current();
    if (!r || !r.ok) { host.innerHTML = ''; return; }

    // the chart's own cells
    var cells = null;
    try {
      if (typeof window.showQimenChart === 'function') {
        var res = window.showQimenChart('2000-01-01', r.hourStem, r.branch, null,
          { mode: 'rotating', cellsOnly: true, forceJuDun: { ju: r.ju, dun: r.dun } });
        cells = res && res.cells;
      }
    } catch (e) {}
    if (!cells) { host.innerHTML = ''; return; }

    // The star blocks are shrunk to 46 at offset 30 while this ring is up, so they end at
    // outerR+53. The boxes sit just beyond, at a radius that keeps them on the canvas.
    // A SQUARE box at a diagonal reaches inward by half its DIAGONAL, not half its side:
    // at 45 degrees the nearest corner is ~73px closer to the centre than the box centre.
    // Sizing on the side alone put NE/SE/SW/NW straight back on the star blocks.
    var rBox = outerR + 53 + (BOX_PX / 2) * Math.SQRT2 + 12;
    var html = '';
    RING.forEach(function (sec) {
      var cell = cells[sec.p];
      if (!cell) return;
      var a2 = (sec.deg - 270 + (ROT || 0)) * Math.PI / 180;
      var bx = cx + rBox * Math.cos(a2), by = cy + rBox * Math.sin(a2);
      var half = BOX_PX / 2;
      if (bx < half) bx = half; else if (bx > CANVAS_W - half) bx = CANVAS_W - half;
      if (by < half) by = half; else if (by > CANVAS_H - half) by = CANVAS_H - half;
      var L = ((bx - half) / CANVAS_W * 100).toFixed(3);
      var T = ((by - half) / CANVAS_H * 100).toFixed(3);
      var Wp = (BOX_PX / CANVAS_W * 100).toFixed(3);
      html += '<div style="position:absolute;left:' + L + '%;top:' + T + '%;width:' + Wp + '%;">'
            +   '<div style="font:700 9px system-ui;color:#1b5e20;text-align:center;'
            +   'text-shadow:0 0 3px #fff,0 0 3px #fff;">' + sec.d + '</div>'
            +   '<table style="border-collapse:collapse;width:100%;background:#0d5e2c;'
            +   'box-shadow:0 1px 5px rgba(0,0,0,.35);"><tr>' + cell + '</tr></table>'
            + '</div>';
    });
    host.innerHTML = html;
  }

  function drawIfOn(ctx, cx, cy, outerR, ROT) {
    if (!st.ringOn || !ctx) { clearBoxes(); return; }
    // Belt and braces: if the DLR ring came up through some other path, the annual ring
    // stands down rather than letting the two overlap on the luopan.
    try {
      if (window.FloorPlanDLR && typeof window.FloorPlanDLR.isRingOn === 'function'
          && window.FloorPlanDLR.isRingOn()) {
        st.ringOn = false; window.__qmdjAnnualRingOn = false; clearBoxes();
        try { if (typeof window.fsLuopanMenuSync === 'function') window.fsLuopanMenuSync(); } catch (e2) {}
        return;
      }
    } catch (e) {}

    var canReset = (typeof ctx.setTransform === 'function');
    try { ctx.save(); if (canReset) ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; } catch (e) {}
    try {
      var r = current();
      if (!r || !r.ok) {
        clearBoxes();
        ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var msg = '\u26a0 QMDJ annual: ' + ((r && r.reason) || 'chart unavailable');
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(msg, cx, 6);
        ctx.fillStyle = '#c62828'; ctx.fillText(msg, cx, 6);
        return;
      }
      // Only the heading is painted on the canvas; the palaces are DOM boxes.
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = 'bold 15px sans-serif';
      var head = 'QMDJ annual \u00b7 Yang J\u00fa ' + r.ju + ' \u00b7 ' + r.hourGanZhi +
                 ' \u00b7 facing ' + Math.round(r.facingDeg) + '\u00b0';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.strokeText(head, cx, 4);
      ctx.fillStyle = '#1b5e20'; ctx.fillText(head, cx, 4);
    } catch (e) {
      try { console.warn('QMDJAnnual ring', e); } catch (e2) {}
    } finally {
      try { ctx.restore(); } catch (e3) {}
    }
    try { syncBoxes(cx, cy, outerR, ROT); } catch (e4) { try { console.warn('QMDJAnnual boxes', e4); } catch (e5) {} }
  }

  function toggleRing() {
    st.ringOn = !st.ringOn;
    if (!st.ringOn) clearBoxes();
    // The ring lives in the band outside the star blocks, which only exists with the
    // compact luopan: at full size the wheel reaches the canvas edge and there is
    // nowhere to put it. So switching the ring on switches the luopan to compact.
    if (st.ringOn) {
      try {
        if (typeof window.fsIsLuopanCompact === 'function' && !window.fsIsLuopanCompact()
            && typeof window.fsToggleLuopanSize === 'function') {
          window.fsToggleLuopanSize();
        }
      } catch (e) {}
    }
    invalidate();
    window.__qmdjAnnualRingOn = st.ringOn;
    try { if (typeof window.fsRedraw === 'function') window.fsRedraw(); } catch (e) {}
    try { if (typeof window.fsLuopanMenuSync === 'function') window.fsLuopanMenuSync(); } catch (e) {}
    return st.ringOn;
  }

  A.drawIfOn = drawIfOn;
  A.toggleRing = toggleRing;
  A.isRingOn = function () { return st.ringOn; };
  A.invalidate = invalidate;
})();

// time-afflictions.js — Tai Sui 太歲, Sui Po 歲破, Five Yellow 五黃, San Sha 三煞, Wu Ji 戊己
// of the YEAR of the date shown in the main calendar (year only - Edu, session 49).
// Session 43 (Edu): same items as the reference calculator (bazi-calculator.com, Date Selection):
//   Tai Sui   = the pillar's branch mountain (15°)
//   Sui Po    = the opposite branch mountain (15°)
//   Five Yellow = palace of star 5 in that time unit's flying-star chart (45°), forward flight
//                 (stars from lunar-javascript getYear/Month/Day/TimeNineStar; checked on the
//                 calculator's example 15-07-2022: 7 4 6 5)
//   San Sha   = 申子辰 → S (巳午未), 寅午戌 → N (亥子丑), 亥卯未 → W (申酉戌), 巳酉丑 → E (寅卯辰), ≈75°
//   Wu Ji     = YEAR only: the Wu Ji Du Tian branches of the year stem (WJDT_BRANCHES, app-bazi.js)
// Shown: a table under the LUOPAN (session 49; before: under XKDG RELATIONS) + luopan ☰ → 🧭 Tai Sui · Sha overlay.
(function () {
  'use strict';
  var BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var BR_PY = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  var CN_NUM = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9 };
  // forward flight after the centre
  var FLIGHT = ['NW','W','NE','S','N','SW','E','SE'];
  var PAL_DEG = { N:0, NE:45, E:90, SE:135, S:180, SW:225, W:270, NW:315 };
  // Session 49 (Edu): these spirits are ONLY those of the YEAR - they change every year and stay the
  // same during it. (Sessions 43-48 also listed hour / day / month.)
  var UNITS = [['year','Year']];
  var COL = { ts:'#c62828', sp:'#37474f', y5:'#f9a825', ss:'#6a1b9a', wj:'#795548' };
  var NAMES = { ts:'Tai Sui 太歲', sp:'Sui Po 歲破', y5:'Five Yellow 五黃', ss:'San Sha 三煞', wj:'Wu Ji 戊己' };

  function norm(d) { return ((d % 360) + 360) % 360; }
  function rng(a, b) { return { from: norm(a), to: norm(b) }; }
  function fmt(r) { return r ? (r.from + '–' + r.to + '°') : ''; }
  function brRange(b) { return rng(b * 30 - 7.5, b * 30 + 7.5); }
  function starNum(s) { try { var n = s.getNumber(); return CN_NUM[n] || parseInt(n, 10) || null; } catch (e) { return null; } }
  function fivePalace(c) {
    if (!c) return null;
    if (c === 5) return 'C';
    for (var k = 0; k < 8; k++) if (((c + k) % 9) + 1 === 5) return FLIGHT[k];
    return null;
  }
  function sanSha(b) {
    var g = b % 4; // 0 申子辰 (子0 辰4 申8), 2 寅午戌, 3 亥卯未, 1 巳酉丑
    if (g === 0) return { dir: 'S', br: [5,6,7], r: rng(142.5, 217.5) };
    if (g === 2) return { dir: 'N', br: [11,0,1], r: rng(322.5, 37.5) };
    if (g === 3) return { dir: 'W', br: [8,9,10], r: rng(232.5, 307.5) };
    return { dir: 'E', br: [2,3,4], r: rng(52.5, 127.5) };
  }
  function wuJi(yearStem) {
    var list = (typeof WJDT_BRANCHES !== 'undefined' && WJDT_BRANCHES[yearStem]) || [];
    var idx = list.map(function (c) { return BR.indexOf(c); }).filter(function (i) { return i >= 0; }).sort(function (a, b) { return a - b; });
    if (!idx.length) return null;
    // contiguous run (子丑寅卯 → from 子 to 卯)
    return { br: idx, r: rng(idx[0] * 30 - 7.5, idx[idx.length - 1] * 30 + 7.5) };
  }

  var _last = null, _on = false, _sel = null;   // _sel = { key, unit|null }: the one picked in the table (session 49)
  // o = { pillars:{hour:'甲子',…}, beijing: Date (Beijing-naive, local fields), tst: Date (TST, local fields), label }
  function compute(o) {
    var L = window.Solar;
    var lb = L.fromYmdHms(o.beijing.getFullYear(), o.beijing.getMonth() + 1, o.beijing.getDate(), o.beijing.getHours(), o.beijing.getMinutes(), 0).getLunar();
    var lt = L.fromYmdHms(o.tst.getFullYear(), o.tst.getMonth() + 1, o.tst.getDate(), o.tst.getHours(), o.tst.getMinutes(), 0).getLunar();
    var stars = { year: starNum(lb.getYearNineStar()), month: starNum(lb.getMonthNineStar()), day: starNum(lt.getDayNineStar()), hour: starNum(lt.getTimeNineStar()) };
    var out = { label: o.label, stars: stars, units: {} };
    UNITS.forEach(function (u) {
      var k = u[0], gz = o.pillars[k] || '', b = BR.indexOf(gz.charAt(1));
      if (b < 0) return;
      var p = fivePalace(stars[k]), ss = sanSha(b);
      out.units[k] = {
        gz: gz,
        ts: { txt: BR[b] + ' ' + BR_PY[b], r: brRange(b) },
        sp: { txt: BR[(b + 6) % 12] + ' ' + BR_PY[(b + 6) % 12], r: brRange((b + 6) % 12) },
        y5: { txt: p === 'C' ? 'centre' : (p || ''), r: (p && p !== 'C') ? rng(PAL_DEG[p] - 22.5, PAL_DEG[p] + 22.5) : null, star: stars[k] },
        ss: { txt: ss.dir + ' (' + ss.br.map(function (i) { return BR[i]; }).join('') + ')', r: ss.r }
      };
    });
    // Wu Ji Sha (Edu, session 49): active ONLY on its own days in its own sector (wuJiShaDays, app-bazi.js)
    var wjd = (typeof wuJiShaDays === 'function') ? wuJiShaDays((o.pillars.year || '').charAt(0)) : [];
    if (out.units.year && wjd.length) {
      var today = o.pillars.day || '', act = wjd.filter(function (x) { return x.day === today; })[0] || null;
      out.units.year.wj = {
        txt: wjd.map(function (x) { return x.day + ' day → ' + x.branch + ' ' + x.py + ' (' + x.quadrant + ')'; }).join(' · '),
        r: rng(wjd[0].from, wjd[wjd.length - 1].to), parts: wjd, active: act, today: today };
    }
    return out;
  }

  function tableHtml(a) {
    var TD = 'padding:4px 6px;border-top:1px solid #eee;', y = a.units.year || {};
    var h = '<table style="border-collapse:collapse;font-size:12px;width:100%;">';
    ['ts','sp','y5','ss','wj'].forEach(function (key) {
      var x = y[key]; if (!x) return;
      var on = _sel && _sel.key === key;
      h += '<tr' + (x.r ? ' onclick="XKDGAfflictions.pick(\'' + key + '\')"' : '') + ' style="' + (x.r ? 'cursor:pointer;' : '') + (on ? 'background:#fff3cd;' : '') + '">'
        + '<td style="' + TD + 'color:' + COL[key] + ';font-weight:600;white-space:nowrap;">' + NAMES[key] + '</td>'
        + '<td style="' + TD + '">' + x.txt + (key === 'y5' && x.star ? ' <span style="color:#888;font-size:11px;">(year star ' + x.star + ')</span>' : '') + '</td>'
        + '<td style="' + TD + 'color:#888;white-space:nowrap;text-align:right;">' + (x.parts ? x.parts.map(function (q) { return q.from + '–' + q.to + '°'; }).join('<br>') : fmt(x.r)) + '</td></tr>';
      if (key === 'wj') h += '<tr><td colspan="3" style="padding:2px 6px 5px;font-size:11px;' + (x.active ? 'color:#b71c1c;font-weight:bold;' : 'color:#888;') + '">'
        + (x.active ? '⚠ ACTIVE TODAY (' + x.active.day + '): no works or activities in the ' + x.active.quadrant + ' — ' + x.active.branch + ' ' + x.active.py + ' sector.'
                    : 'Active only on those days, in that sector (strong Sha: no works or activities there). Today ' + (x.today || '') + ': not active.') + '</td></tr>';
    });
    return h + '</table>';
  }

  // The table lives UNDER THE LUOPAN (Edu, session 49: it is Feng Shui matter), not under XKDG RELATIONS.
  // The luopan view is built later and can be rebuilt, so place() is also run when #fengshui-view changes.
  function place() {
    var box = document.getElementById('xkdg-afflictions');
    var wrap = document.getElementById('fs-canvas-wrap');
    if (!wrap || !wrap.parentNode || !_last) { if (box && !wrap) box.remove(); return; }
    if (!box) {
      box = document.createElement('details'); box.id = 'xkdg-afflictions';
      box.style.cssText = 'margin:8px auto;max-width:760px;border:1px solid #d1c4e9;border-radius:8px;padding:6px 10px;background:#fff;';
    }
    var lg = document.getElementById('fs-legend'), anchor = (lg && lg.parentNode) ? lg : wrap;   // after the colour legend (Edu)
    if (box.previousElementSibling !== anchor) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    var yr = (_last.units.year && _last.units.year.gz) || '';
    var html = '<summary style="cursor:pointer;font-size:13px;font-weight:bold;color:#4527a0;">🧭 Tai Sui · Sui Po · Five Yellow · San Sha · Wu Ji' + (yr ? ' — year ' + yr : '') + '</summary>'
      + '<div style="font-size:11px;color:#777;margin:4px 0;">Spirits of the year ' + yr + ' (the same all year) · directions in degrees · <b>tap one to see it on the luopan</b> (tap again to hide)</div>' + tableHtml(_last);
    if (box._html !== html) { var open = box.open; box.innerHTML = html; box._html = html; box.open = open; }
  }
  function watch() {
    var fv = document.getElementById('fengshui-view'); if (!fv || fv._afflWatch) return;
    fv._afflWatch = true;
    new MutationObserver(function () { try { place(); } catch (e) {} }).observe(fv, { childList: true, subtree: true });
    place();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();

  // Called by app-bazi.js after the main chart is drawn.
  function update(o) {
    try { _last = compute(o); } catch (e) { _last = null; console.warn('XKDGAfflictions', e); return; }
    place();
    if (_on && typeof fsRedraw === 'function') try { fsRedraw(); } catch (e) {}
  }

  // Tap in the table: show that one on the luopan (a name = its four time units; a cell = that unit only).
  function pick(key, unit) {
    var same = _sel && _sel.key === key && (_sel.unit || null) === (unit || null);
    _sel = same ? null : { key: key, unit: unit || null };
    place();
    if (typeof fsRedraw === 'function') try { fsRedraw(); } catch (e) {}
    if (_sel) { var w = document.getElementById('fs-canvas-wrap'); if (w && w.scrollIntoView) try { w.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }
  }
  // Wu Ji Sha: one 15° sector per day (戊戌 → 戌, 己亥 → 亥), full colour only for the one active today.
  function drawWuJi(ctx, cx, cy, outerR, ang) {
    var x = _last.units.year && _last.units.year.wj; if (!x || !x.parts) return;
    x.parts.forEach(function (q) {
      var on = x.active && x.active.day === q.day, span = norm(q.to - q.from), a0 = ang(q.from), a1 = ang(q.from + span);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, outerR, a0, a1); ctx.closePath();
      ctx.fillStyle = on ? '#b71c1c' : COL.wj; ctx.globalAlpha = on ? 0.35 : 0.12; ctx.fill();
      ctx.globalAlpha = on ? 1 : 0.6; ctx.lineWidth = 2; ctx.strokeStyle = on ? '#b71c1c' : COL.wj;
      if (!on) ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.beginPath(); ctx.lineWidth = 14; ctx.arc(cx, cy, outerR + 14, a0, a1); ctx.stroke();
      ctx.setLineDash([]);
      var mid = ang(q.from + span / 2), tx = cx + Math.cos(mid) * (outerR + 44), ty = cy + Math.sin(mid) * (outerR + 44);
      ctx.globalAlpha = 1; ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = on ? '#b71c1c' : COL.wj;
      ctx.fillText(q.day, tx, ty);
      ctx.restore();
    });
    var H = ctx.canvas.height, y = H - 20 - 2 * 34;
    ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = 'bold 32px system-ui'; ctx.fillStyle = x.active ? '#b71c1c' : COL.wj;
    ctx.fillText(NAMES.wj + ' ' + ((_last.units.year && _last.units.year.gz) || ''), 10, y - 14);
    ctx.font = '28px system-ui'; ctx.fillStyle = x.active ? '#b71c1c' : '#333';
    ctx.fillText(x.active ? '⚠ ACTIVE TODAY (' + x.active.day + '): no works in the ' + x.active.quadrant : 'only on ' + x.parts.map(function (q) { return q.day; }).join(' / ') + ' days — today not active', 10, y + 22);
    ctx.restore();
  }
  // The picked one: a translucent wedge over the wheel + a bold arc outside it + a caption.
  function drawPicked(ctx, cx, cy, outerR, ang) {
    if (_sel.key === 'wj') { drawWuJi(ctx, cx, cy, outerR, ang); return; }
    var ab = { hour: 'Hour', day: 'Day', month: 'Month', year: 'Year' }, arcs = {}, key = _sel.key;
    UNITS.forEach(function (u) {
      if (_sel.unit && _sel.unit !== u[0]) return;
      var x = _last.units[u[0]] && _last.units[u[0]][key];
      if (!x || !x.r) return;
      var id = x.r.from + '_' + x.r.to;
      (arcs[id] = arcs[id] || { r: x.r, who: [], txt: x.txt }).who.push(ab[u[0]]);
    });
    var ids = Object.keys(arcs), lines = [];
    ids.forEach(function (id) {
      var a = arcs[id], span = norm(a.r.to - a.r.from) || 360, a0 = ang(a.r.from), a1 = ang(a.r.from + span);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, outerR, a0, a1); ctx.closePath();
      ctx.fillStyle = COL[key]; ctx.globalAlpha = 0.22; ctx.fill();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.strokeStyle = COL[key]; ctx.stroke();
      ctx.beginPath(); ctx.lineWidth = 14; ctx.arc(cx, cy, outerR + 14, a0, a1); ctx.stroke();
      var mid = ang(a.r.from + span / 2), tx = cx + Math.cos(mid) * (outerR + 14), ty = cy + Math.sin(mid) * (outerR + 14);
      ctx.globalAlpha = 1; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.restore();
      lines.push(a.txt + ' ' + fmt(a.r));
    });
    // the canvas is 1100 px wide and shown at about 400: fonts must be large to be readable
    var H = ctx.canvas.height, y = H - 20 - lines.length * 34;
    ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = 'bold 32px system-ui'; ctx.fillStyle = COL[key];
    ctx.fillText(NAMES[key] + ' ' + ((_last.units.year && _last.units.year.gz) || '') + (ids.length ? '' : ' — centre'), 10, y - 14);
    ctx.font = '28px system-ui'; ctx.fillStyle = '#333';
    lines.forEach(function (t, i) { ctx.fillText(t, 10, y + 22 + i * 34); });
    ctx.restore();
  }

  function toggle() {
    _on = !_on;
    if (typeof fsRedraw === 'function') try { fsRedraw(); } catch (e) {}
  }

  // Luopan overlay: one thin coloured ring per kind just outside the wheel; the time units
  // sharing an arc are written on it (Y M D H).
  function drawIfOn(ctx, cx, cy, outerR, ROT) {
    if ((!_on && !_sel) || !_last || !ctx) return;
    try {
      var ang = function (deg) { return (deg - 270 + (ROT || 0)) * Math.PI / 180; };
      if (!_on) { drawPicked(ctx, cx, cy, outerR, ang); return; }
      var ring = { ts: 0, sp: 1, y5: 2, ss: 3, wj: 4 }, ab = { hour: 'H', day: 'D', month: 'M', year: 'Y' };
      Object.keys(ring).forEach(function (key) {
        var arcs = {};
        UNITS.forEach(function (u) {
          var x = _last.units[u[0]] && _last.units[u[0]][key];
          if (!x || !x.r) return;
          if (key === 'wj') { if (!x.active) return; x = { r: rng(x.active.from, x.active.to) }; }   // only on its day, its sector
          var id = x.r.from + '_' + x.r.to;
          (arcs[id] = arcs[id] || { r: x.r, who: [] }).who.push(ab[u[0]]);
        });
        var rad = outerR + 10 + ring[key] * 13;
        Object.keys(arcs).forEach(function (id) {
          var a = arcs[id], span = norm(a.r.to - a.r.from) || 360;
          ctx.save();
          ctx.beginPath(); ctx.lineWidth = 9; ctx.strokeStyle = COL[key]; ctx.globalAlpha = 0.75;
          ctx.arc(cx, cy, rad, ang(a.r.from), ang(a.r.from + span));
          ctx.stroke(); ctx.globalAlpha = 1;
          var mid = ang(a.r.from + span / 2), tx = cx + Math.cos(mid) * rad, ty = cy + Math.sin(mid) * rad;
          ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
          ctx.restore();
        });
      });
      // legend, bottom-left
      var W = ctx.canvas.width, H = ctx.canvas.height, y = H - 12 - 5 * 14;
      ctx.save(); ctx.font = '11px system-ui'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333'; ctx.fillText('Year ' + ((_last.units.year && _last.units.year.gz) || ''), 10, y - 14);
      Object.keys(ring).forEach(function (key, i) {
        ctx.fillStyle = COL[key]; ctx.fillRect(10, y + i * 14 - 4, 14, 8);
        ctx.fillStyle = '#333'; ctx.fillText(NAMES[key], 30, y + i * 14);
      });
      ctx.restore();
    } catch (e) { console.warn('XKDGAfflictions.drawIfOn', e); }
  }

  window.XKDGAfflictions = { update: update, compute: compute, toggle: toggle, pick: pick, drawIfOn: drawIfOn,
    isOn: function () { return _on; }, last: function () { return _last; } };
})();

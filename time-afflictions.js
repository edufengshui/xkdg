// time-afflictions.js — Tai Sui 太歲, Sui Po 歲破, Five Yellow 五黃, San Sha 三煞, Wu Ji 戊己
// for the HOUR, DAY, MONTH and YEAR of the date shown in the main calendar.
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
  var UNITS = [['hour','Hour'],['day','Day'],['month','Month'],['year','Year']];
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

  var _last = null, _on = false;
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
    var wj = wuJi((o.pillars.year || '').charAt(0));
    if (out.units.year && wj) out.units.year.wj = { txt: wj.br.map(function (i) { return BR[i] + ' ' + BR_PY[i]; }).join(', '), r: wj.r };
    return out;
  }

  function tableHtml(a) {
    var TD = 'padding:3px 6px;border-top:1px solid #eee;', h = '<table style="border-collapse:collapse;font-size:12px;width:100%;">'
      + '<tr style="color:#777;text-align:left;"><th style="padding:3px 6px;"></th>' + UNITS.map(function (u) { return '<th style="padding:3px 6px;">' + u[1] + (a.units[u[0]] ? ' ' + a.units[u[0]].gz : '') + '</th>'; }).join('') + '</tr>'
      + '<tr><td style="' + TD + 'color:#777;">Flying star</td>' + UNITS.map(function (u) { return '<td style="' + TD + '">' + (a.stars[u[0]] || '') + '</td>'; }).join('') + '</tr>';
    ['ts','sp','y5','ss','wj'].forEach(function (key) {
      h += '<tr><td style="' + TD + 'color:' + COL[key] + ';font-weight:600;">' + NAMES[key] + '</td>' + UNITS.map(function (u) {
        var x = a.units[u[0]] && a.units[u[0]][key];
        return '<td style="' + TD + '">' + (x ? x.txt + (x.r ? '<br><span style="color:#888;font-size:11px;">' + fmt(x.r) + '</span>' : '') : '') + '</td>';
      }).join('') + '</tr>';
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
    if (box.previousElementSibling !== wrap) wrap.parentNode.insertBefore(box, wrap.nextSibling);
    var html = '<summary style="cursor:pointer;font-size:13px;font-weight:bold;color:#4527a0;">🧭 Tai Sui · Sui Po · Five Yellow · San Sha · Wu Ji</summary>'
      + '<div style="font-size:11px;color:#777;margin:4px 0;">' + (_last.label || '') + ' · directions in degrees · also on the luopan: ☰ → 🧭 Tai Sui · Sha</div>' + tableHtml(_last);
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

  function toggle() {
    _on = !_on;
    if (typeof fsRedraw === 'function') try { fsRedraw(); } catch (e) {}
  }

  // Luopan overlay: one thin coloured ring per kind just outside the wheel; the time units
  // sharing an arc are written on it (Y M D H).
  function drawIfOn(ctx, cx, cy, outerR, ROT) {
    if (!_on || !_last || !ctx) return;
    try {
      var ang = function (deg) { return (deg - 270 + (ROT || 0)) * Math.PI / 180; };
      var ring = { ts: 0, sp: 1, y5: 2, ss: 3, wj: 4 }, ab = { hour: 'H', day: 'D', month: 'M', year: 'Y' };
      Object.keys(ring).forEach(function (key) {
        var arcs = {};
        UNITS.forEach(function (u) {
          var x = _last.units[u[0]] && _last.units[u[0]][key];
          if (!x || !x.r) return;
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
          ctx.fillText(a.who.reverse().join(''), tx, ty);
          ctx.restore();
        });
      });
      // legend, bottom-left
      var W = ctx.canvas.width, H = ctx.canvas.height, y = H - 12 - 5 * 14;
      ctx.save(); ctx.font = '11px system-ui'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333'; ctx.fillText((_last.label || '') + '  (Y M D H)', 10, y - 14);
      Object.keys(ring).forEach(function (key, i) {
        ctx.fillStyle = COL[key]; ctx.fillRect(10, y + i * 14 - 4, 14, 8);
        ctx.fillStyle = '#333'; ctx.fillText(NAMES[key], 30, y + i * 14);
      });
      ctx.restore();
    } catch (e) { console.warn('XKDGAfflictions.drawIfOn', e); }
  }

  window.XKDGAfflictions = { update: update, compute: compute, toggle: toggle, drawIfOn: drawIfOn,
    isOn: function () { return _on; }, last: function () { return _last; } };
})();

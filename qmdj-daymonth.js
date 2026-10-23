// ============================================================
// XKDG — qmdj-daymonth.js
// QMDJ MONTH and DAY charts (session 32, Edu) — chapter "QMDJ5 - 03 Month and Day charts"
// ============================================================
// Both are ROTATING charts drawn by showQimenChart (app-fengshui.js) with the Jú forced,
// using the month pillar (month chart) or the day pillar (day chart) as the "hour".
//
// MONTH chart — Yin Dun only. Each Jú lasts 60 months (5 years, from a 甲 or 己 year, whose
// first month is 丙寅). The cycle goes 9, 8, 7 … 1 and restarts with 9 every 540 months
// (45 years). Anchor (Edu, session 32): 1864 上元甲子 = Yin 9 → 1909, 1954, 1999, 2044 …
//
// DAY chart — Yang Dun from the Winter Solstice, Yin Dun from the Summer Solstice.
//  1. At the 8 main seasonal points (冬至 立春 春分 立夏 夏至 立秋 秋分 立冬) the Jú restarts
//     from the point's Upper / Middle / Lower number, picked by the CYCLE OF THE MONTH PILLAR:
//     month in the 甲子 or 甲午 decade = Upper, 甲戌 or 甲辰 = Lower, 甲申 or 甲寅 = Middle.
//  2. Each decade of days (from a 甲 day) is one Jú: +1 in Yang, −1 in Yin.
//  3. At the entry of the other month branches the Jú moves to that branch's cycle
//     (子卯午酉 Upper, 丑辰未戌 Lower) with the Rule of the Six: ±6 per step (U→M→L).
//     Same cycle → no change (Edu, session 32: rule "A", the one taught in the slides).
//  The change applies from the day of the term (in local true solar time).
// Checked: the worked 1983-84 sequence (slides 27-30, 30/30) and the corrected event charts.
(function () {
  var ST = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥';
  var MAIN = { '冬至': [1, 7, 4], '立春': [8, 5, 2], '春分': [3, 9, 6], '立夏': [4, 1, 7],
               '夏至': [9, 3, 6], '立秋': [2, 5, 8], '秋分': [7, 1, 4], '立冬': [6, 9, 3] };
  var YANG = { '冬至': 1, '立春': 1, '春分': 1, '立夏': 1 };
  // non-main month-branch entries -> branch
  var ENTRY = { '惊蛰': '卯', '清明': '辰', '芒种': '午', '小暑': '未',
                '白露': '酉', '寒露': '戌', '大雪': '子', '小寒': '丑' };
  var BR_CYCLE = { '子': 0, '卯': 0, '午': 0, '酉': 0, '丑': 2, '辰': 2, '未': 2, '戌': 2 };  // U=0 M=1 L=2
  var CYC = ['Upper', 'Middle', 'Lower'];
  var PINYIN_TERM = { DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒', LI_CHUN: '立春', YU_SHUI: '雨水',
                      JING_ZHE: '惊蛰', DA_XUE: '大雪' };

  function gzIdx(gz) { for (var i = 0; i < 60; i++) if (ST[i % 10] + BR[i % 12] === gz) return i; return -1; }
  function monthCycle(monthGz) { return [0, 2, 1, 0, 2, 1][Math.floor(gzIdx(monthGz) / 10)]; }
  function wrap(n) { return ((n - 1) % 9 + 9) % 9 + 1; }
  function dayNum(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); }
  function ymd(n) { var d = new Date(n * 86400000); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; }
  function iso(n) { var a = ymd(n); return a[0] + '-' + String(a[1]).padStart(2, '0') + '-' + String(a[2]).padStart(2, '0'); }
  function dayGz(n) { var a = ymd(n); return window.Solar.fromYmd(a[0], a[1], a[2]).getLunar().getDayInGanZhi(); }

  function lonTz() {
    try { var lt = window.XKDGSolarTime && XKDGSolarTime.currentLonTz(); if (lt && isFinite(lt.lonDeg)) return lt; } catch (e) {}
    return { lonDeg: 12.1, tzOffsetMin: -60 };
  }

  // Solar terms around a year: [{name, day (local TST day number), bj: Solar (Beijing instant)}]
  function terms(year, lonDeg) {
    var out = [], seen = {};
    [year - 1, year, year + 1].forEach(function (y) {
      var t = window.Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
      Object.keys(t).forEach(function (k) {
        var name = PINYIN_TERM[k] || k, s = t[k];
        var key = name + s.toYmd(); if (seen[key]) return; seen[key] = 1;
        var day;
        try {
          var tst = XKDGSolarTime.beijingTermToTST(s.getYear(), s.getMonth(), s.getDay(), s.getHour(), s.getMinute(), s.getSecond(), lonDeg);
          day = dayNum(tst.y, tst.mo, tst.d);
        } catch (e) { day = dayNum(s.getYear(), s.getMonth(), s.getDay()); }
        out.push({ name: name, day: day, bj: s });
      });
    });
    return out.sort(function (a, b) { return a.day - b.day; });
  }

  // ── DAY chart Jú ──────────────────────────────────────────────────────────
  // y,m,d = the (true solar time) date of the day. Returns {dun, ju, dayGz, steps[]}.
  function dayChartJu(y, m, d, lonDeg) {
    if (lonDeg == null) lonDeg = lonTz().lonDeg;
    var T = dayNum(y, m, d), list = terms(y, lonDeg), start = null;
    list.forEach(function (t) { if (MAIN[t.name] && t.day <= T) start = t; });
    if (!start) return null;
    // month pillar in force just after the term (a 立 term opens a new month)
    var after = window.Solar.fromYmdHms(start.bj.getYear(), start.bj.getMonth(), start.bj.getDay(),
                                        start.bj.getHour(), start.bj.getMinute(), start.bj.getSecond());
    var mon = window.Solar.fromJulianDay(after.getJulianDay() + 1 / 24).getLunar().getMonthInGanZhiExact();
    var yang = !!YANG[start.name], cur = monthCycle(mon), ju = MAIN[start.name][cur];
    var steps = [{ date: iso(start.day), what: start.name + ' · month ' + mon + ' = ' + CYC[cur], ju: ju }];
    var entries = {}; list.forEach(function (t) { if (ENTRY[t.name]) entries[t.day] = t.name; });
    for (var n = start.day + 1; n <= T; n++) {
      var g = dayGz(n);
      if (gzIdx(g) % 10 === 0) { ju = wrap(ju + (yang ? 1 : -1)); steps.push({ date: iso(n), what: 'decade ' + g, ju: ju }); }
      if (entries[n]) {
        var br = ENTRY[entries[n]], nc = BR_CYCLE[br], k = ((nc - cur) % 3 + 3) % 3, old = ju;
        ju = wrap(ju + k * (yang ? 6 : -6)); cur = nc;
        steps.push({ date: iso(n), what: entries[n] + ' · ' + br + ' month = ' + CYC[nc]
                     + (k ? ' (Rule of the Six ' + old + '→' + ju + ')' : ' (same cycle)'), ju: ju });
      }
    }
    return { dun: yang ? 'yang' : 'yin', ju: ju, dayGz: dayGz(T), steps: steps };
  }

  // ── MONTH chart Jú ────────────────────────────────────────────────────────
  // yearGz / monthGz = the year and month pillars (Li Chun / Jie based); civilYear = the
  // Gregorian year of the moment. Returns {ju, blockStart}.
  function monthChartJu(yearGz, civilYear) {
    var sy = civilYear;                                   // Gregorian year that owns this year pillar
    if (((sy - 4) % 60 + 60) % 60 !== gzIdx(yearGz)) sy -= 1;   // before Li Chun
    var block = Math.floor((sy - 1864) / 5);
    var bs = 1864 + block * 5;
    return { ju: 9 - (((block % 9) + 9) % 9), blockStart: bs };
  }


  // ── Day + hour: the same palace positive in the DAY chart and in an HOUR chart ──
  // (session 32, Edu). "Positive" = the app's canonical QMDJ rules (QMDJ-RULES.md):
  // no §1 exclusion (formationFlags) and the §2 gate passed (directionGate: San Qi in the
  // Tien Pan, or Wu, or the Commander, with a favourable door). The purpose picked in the
  // main panel, when there is one, also requires its door in both charts. Hours are the 12
  // double-hours of that day in LOCAL TRUE SOLAR TIME, each with its own instant-level Jú.
  var PAL_NAME = { 1: 'Kan N', 8: 'Gen NE', 3: 'Zhen E', 4: 'Xun SE', 9: 'Li S', 2: 'Kun SW', 7: 'Dui W', 6: 'Qian NW' };
  function purposeEntry() {
    try {
      var k = (document.getElementById('purpose-select') || {}).value || '';
      var all = window.QMDJWaterScanner && QMDJWaterScanner.fsPurposeDoors ? QMDJWaterScanner.fsPurposeDoors() : null;
      return (k && all && all[k] && all[k].doors) ? { key: k, entry: all[k] } : null;
    } catch (e) { return null; }
  }
  function positive(cell, pur) {
    if (!cell || !cell.doorCode) return false;
    var W = window.QMDJWaterScanner;
    if (W.formationFlags(cell).disqualified) return false;
    if (!W.directionGate(cell, pur ? { purpose: pur.entry } : {}).eligible) return false;
    if (pur && pur.entry.doors.indexOf(cell.doorCode) === -1) return false;
    return true;
  }
  function cellText(c) {
    return (c.tiH || '') + '/' + (c.diH || '') + ' · ' + (c.doorName || c.door || '') + ' · ' + (c.star || '') + ' · ' + (c.deity || '');
  }
  function dayHourMatches(isoDate, dayChart, rot, pur) {
    var W = window.QMDJWaterScanner, p = isoDate.split('-'), lt = lonTz(), out = {};
    var good = [];
    [1, 8, 3, 4, 9, 2, 7, 6].forEach(function (n) { if (positive(dayChart.palaces[n], pur)) good.push(n); });
    if (!good.length) return { good: good, hits: out };
    for (var bi = 0; bi < 12; bi++) {
      var h = bi === 0 ? 0 : bi * 2, mi = bi === 0 ? 30 : 0;      // 子 = early Zi, centre of each double-hour after
      var wc = XKDGSolarTime.wallClockFromTST(+p[0], +p[1], +p[2], h, mi, lt.lonDeg, lt.tzOffsetMin);
      var hp = XKDGSolarTime.hourPillarFromCivil(wc.y, wc.mo, wc.d, wc.h, wc.mi, 0, lt.lonDeg, lt.tzOffsetMin);
      if (!hp || !hp.tst) continue;
      var c = rot ? W.getRotatingHourChart(hp.tst.y, hp.tst.mo, hp.tst.d, hp.gan, hp.zhi, hp.bj)
                  : W.getHourChart(hp.tst.y, hp.tst.mo, hp.tst.d, hp.gan, hp.zhi, hp.bj);
      if (!c || !c.palaces) continue;
      var civ = String(wc.h).padStart(2, '0') + ':' + String(wc.mi).padStart(2, '0');
      good.forEach(function (n) {
        if (positive(c.palaces[n], pur)) (out[n] = out[n] || []).push({ gan: hp.gan, zhi: hp.zhi, civ: civ, cell: c.palaces[n], ju: c.ju, dun: c.dun });
      });
    }
    return { good: good, hits: out };
  }
  function renderMatches(isoDate, dayChart, rot) {
    var el = document.getElementById('dm-match'); if (!el) return;
    if (_kind !== 'day') { el.innerHTML = ''; return; }
    var pur = purposeEntry(), R;
    try { R = dayHourMatches(isoDate, dayChart, rot, pur); } catch (e) { el.innerHTML = ''; return; }
    var h = '<div style="font:600 13px system-ui;color:#4527a0;margin:12px 0 4px;">✨ Day + hour in the same palace'
          + (pur ? ' · purpose ' + pur.entry.label : '') + ' · ' + (rot ? 'Rotating' : 'Flying') + '</div>';
    if (!R.good.length) { el.innerHTML = h + '<div style="font-size:12px;color:#888;">No positive palace in the day chart.</div>'; return; }
    R.good.forEach(function (n) {
      var dc = dayChart.palaces[n], hs = R.hits[n] || [];
      h += '<div style="border:1px solid #d1c4e9;border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:12px;">'
        + '<b>' + PAL_NAME[n] + '</b> <span style="color:#666;">day: ' + cellText(dc) + '</span><div style="margin-top:4px;">';
      if (!hs.length) h += '<span style="color:#999;">no hour of this day is positive here</span>';
      hs.forEach(function (x) {
        h += '<button onclick="xkdgDMOpenHour(\'' + isoDate + '\',\'' + x.gan + '\',\'' + x.zhi + '\',' + (rot ? 1 : 0) + ')" '
          + 'title="' + cellText(x.cell).replace(/"/g, '') + '" '
          + 'style="margin:2px 4px 2px 0;padding:3px 8px;border:1px solid #66bb6a;background:#e8f5e9;color:#1b5e20;border-radius:12px;font-size:12px;cursor:pointer;">'
          + x.gan + x.zhi + ' · ' + x.civ + ' · ' + (x.cell.doorName || '') + '</button>';
      });
      h += '</div></div>';
    });
    el.innerHTML = h + '<div style="font-size:10px;color:#999;">Positive = no excluding formation and San Qi (Tien Pan) / Wu / Commander with a favourable door. '
      + 'Hours in local true solar time; the time shown is the clock time at the centre of the hour. Tap an hour to open its chart.</div>';
  }
  // Open the 🎲 hour chart on that date and hour, in the same mode.
  function openHour(isoDate, gan, zhi, rot) {
    try {
      document.getElementById('dm-overlay').style.display = 'none';
      openQmdjChartPanel();
      setTimeout(function () {
        try {
          var cb = document.getElementById('qmdj-tool-manual'); if (cb && cb.checked) { cb.checked = false; _qmdjManualToggle(); }
          document.getElementById('qmdj-tool-date').value = isoDate;
          _qmdjChartPopulateHours(false);
          var sel = document.getElementById('qmdj-tool-hour');
          for (var k = 0; k < sel.options.length; k++) if (sel.options[k].getAttribute('data-zhi') === zhi) { sel.selectedIndex = k; break; }
          var r = document.querySelector('input[name="qmdj-tool-mode"][value="' + (rot ? 'rotating' : 'flying') + '"]'); if (r) r.checked = true;
          qmdjChartShow();
        } catch (e2) {}
      }, 80);
    } catch (e) {}
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  var _kind = 'day';
  function open(kind) {
    _kind = kind === 'month' ? 'month' : 'day';
    var ov = document.getElementById('dm-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'dm-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(20,8,30,.55);display:flex;'
        + 'align-items:flex-start;justify-content:center;padding:20px;overflow:auto;';
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.style.display = 'none'; });
      var B = 'background:#ede7f6;color:#4527a0;border:1px solid #b39ddb;border-radius:6px;padding:6px 16px;font-size:16px;font-weight:bold;cursor:pointer;line-height:1;';
      ov.innerHTML =
          '<div style="background:#fff;border-radius:12px;max-width:780px;width:100%;padding:16px;box-shadow:0 12px 44px rgba(0,0,0,.32);">'
        +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        +     '<div id="dm-title" style="font-size:16px;font-weight:bold;color:#5e35b1;"></div>'
        +     '<button onclick="document.getElementById(\'dm-overlay\').style.display=\'none\'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1;">✕</button>'
        +   '</div>'
        +   '<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px;">'
        +     '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:2px;">Date</label>'
        +       '<input type="date" id="dm-date" onchange="xkdgDMShow()" style="padding:6px;border:1px solid #b39ddb;border-radius:5px;font-size:13px;"></div>'
        +     '<div style="font-size:12px;"><label style="cursor:pointer;margin-right:8px;"><input type="radio" name="dm-kind" value="day" onchange="xkdgDMKind(this.value)"> Day 日</label>'
        +       '<label style="cursor:pointer;"><input type="radio" name="dm-kind" value="month" onchange="xkdgDMKind(this.value)"> Month 月</label></div>'
        // Session 32 (Edu): both kinds can be drawn Flying or Rotating; same Jú, same pillar.
        +     '<div style="font-size:12px;"><label style="cursor:pointer;margin-right:8px;"><input type="radio" name="dm-mode" value="rotating" checked onchange="xkdgDMShow()"> Rotating 轉盤</label>'
        +       '<label style="cursor:pointer;"><input type="radio" name="dm-mode" value="flying" onchange="xkdgDMShow()"> Flying 飛盤</label></div>'
        +   '</div>'
        +   '<div id="dm-info" style="font-size:12px;color:#333;margin-bottom:8px;line-height:1.5;"></div>'
        +   '<div id="dm-chart"></div>'
        +   '<div id="dm-match"></div>'
        +   '<div style="display:flex;justify-content:center;align-items:center;gap:14px;margin-top:10px;">'
        +     '<button onclick="xkdgDMStep(-1)" style="' + B + '">◀</button>'
        +     '<span id="dm-step-lbl" style="font-size:11px;color:#888;"></span>'
        +     '<button onclick="xkdgDMStep(1)" style="' + B + '">▶</button>'
        +   '</div>'
        +   '<details style="margin-top:10px;font-size:11px;color:#666;"><summary style="cursor:pointer;">How the Jú is found</summary><div id="dm-steps" style="margin-top:6px;line-height:1.6;"></div></details>'
        + '</div>';
      document.body.appendChild(ov);
    }
    // Follow the main calendar.
    var mainD = (document.getElementById('date') || {}).value || '';
    var dEl = document.getElementById('dm-date');
    dEl.value = /^\d{4}-\d{2}-\d{2}$/.test(mainD) ? mainD : new Date().toISOString().slice(0, 10);
    setKindRadio();
    ov.style.display = 'flex';
    show();
  }
  function setKindRadio() {
    var r = document.querySelector('input[name="dm-kind"][value="' + _kind + '"]'); if (r) r.checked = true;
    document.getElementById('dm-title').textContent = _kind === 'month' ? '🗓 QMDJ Month chart' : '📆 QMDJ Day chart';
    document.getElementById('dm-step-lbl').textContent = _kind === 'month' ? '1 month 月' : '1 day 日';
  }
  function setKind(k) { _kind = k; setKindRadio(); show(); }

  function step(delta) {
    var dEl = document.getElementById('dm-date'); var p = String(dEl.value).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    if (_kind === 'month') {
      // jump to the same moment of the next / previous solar month: ~30.44 days, then re-read
      d = new Date(d.getTime() + delta * 30.44 * 86400000);
    } else d = new Date(d.getTime() + delta * 86400000);
    dEl.value = d.toISOString().slice(0, 10);
    show();
  }

  function pillarsAtNoon(isoDate) {
    var p = isoDate.split('-'), lt = lonTz();
    try {
      var pp = XKDGSolarTime.pillarsFromCivil(+p[0], +p[1], +p[2], 12, 0, 0, lt.lonDeg, lt.tzOffsetMin);
      if (pp) return pp;
    } catch (e) {}
    var L = window.Solar.fromYmdHms(+p[0], +p[1], +p[2], 12, 0, 0).getLunar();
    return { year: L.getYearInGanZhiExact(), month: L.getMonthInGanZhiExact(), day: L.getDayInGanZhi(),
             meta: { tst: { y: +p[0], mo: +p[1], d: +p[2] } } };
  }

  function show() {
    var info = document.getElementById('dm-info'), box = document.getElementById('dm-chart'), st = document.getElementById('dm-steps');
    var v = (document.getElementById('dm-date') || {}).value || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !window.Solar) { info.innerHTML = '<span style="color:#c0392b;">Pick a date.</span>'; box.innerHTML = ''; return; }
    var P = pillarsAtNoon(v), ju, dun, g, z, html = '';
    if (_kind === 'month') {
      var M = monthChartJu(P.year, +v.slice(0, 4));
      ju = M.ju; dun = 'yin'; g = P.month.charAt(0); z = P.month.charAt(1);
      info.innerHTML = '<b>Yin Jú ' + ju + '</b> · month <b>' + P.month + '</b> · year ' + P.year
        + ' · 5-year block ' + M.blockStart + '–' + (M.blockStart + 4);
      st.innerHTML = 'Yin Dun only. One Jú per 60 months (5 years, from a 甲/己 year). '
        + 'The 45-year cycle restarts with Yin 9 in 1864, 1909, 1954, 1999, 2044 … and goes back one Jú every 5 years.<br>'
        + 'Block ' + M.blockStart + ' is ' + Math.floor((M.blockStart - 1864) / 5 % 9) + ' block(s) after the last restart → Yin ' + ju + '.';
    } else {
      var t = P.meta && P.meta.tst ? P.meta.tst : null; var p = v.split('-');
      var R = dayChartJu(t ? t.y : +p[0], t ? t.mo : +p[1], t ? t.d : +p[2]);
      if (!R) { info.innerHTML = '<span style="color:#c0392b;">Cannot place this date.</span>'; box.innerHTML = ''; return; }
      ju = R.ju; dun = R.dun; g = R.dayGz.charAt(0); z = R.dayGz.charAt(1);
      info.innerHTML = '<b>' + (dun === 'yang' ? 'Yang' : 'Yin') + ' Jú ' + ju + '</b> · day <b>' + R.dayGz + '</b> · month ' + P.month + ' · year ' + P.year;
      st.innerHTML = R.steps.map(function (s) { return s.date + ' · ' + s.what + ' → <b>' + s.ju + '</b>'; }).join('<br>');
    }
    try {
      var mEl = document.querySelector('input[name="dm-mode"]:checked');
      var rot = !mEl || mEl.value !== 'flying';
      html = window.showQimenChart('2000-01-01', g, z, null, { mode: rot ? 'rotating' : undefined, returnHtml: true, forceJuDun: { ju: ju, dun: dun } }) || '';
      var lbl = (_kind === 'month' ? 'Month' : 'Day');
      html = html.replace(/2000-01-01\s*·\s*/g, '').replace('Hour Rotating Chart', lbl + ' Rotating Chart').replace('Hour Flying Chart', lbl + ' Flying Chart');
    } catch (e) { html = ''; }
    box.innerHTML = html || '<div style="color:#c0392b;font-size:12px;">Chart renderer not available.</div>';
    try {
      var dc = rot ? window.QMDJWaterScanner.getRotatingHourChart(2000, 1, 1, g, z, null, { ju: ju, dun: dun })
                   : window.QMDJWaterScanner.getHourChart(2000, 1, 1, g, z, null, { ju: ju, dun: dun });
      if (_kind === 'day' && dc) { var dd = (P.meta && P.meta.tst) ? P.meta.tst : null;
        renderMatches(dd ? (dd.y + '-' + String(dd.mo).padStart(2, '0') + '-' + String(dd.d).padStart(2, '0')) : v, dc, rot); }
      else renderMatches(v, null, rot);
    } catch (e) {}
  }

  window.XKDGDayMonth = { dayChartJu: dayChartJu, monthChartJu: monthChartJu, open: open };
  window.xkdgDMShow = show; window.xkdgDMOpenHour = openHour; window.xkdgDMStep = step; window.xkdgDMKind = setKind;
  window.openQmdjDayChart = function () { open('day'); };
  window.openQmdjMonthChart = function () { open('month'); };
})();

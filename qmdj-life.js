/**
 * qmdj-life.js — QMDJ LIFE CHART (session 58, Edu)
 * ---------------------------------------------------------------------------
 * "It is the Qimen chart of the moment the person was born. Graphically the only
 * difference from a normal chart is that the Life Palace is highlighted."
 *
 * Life Palace (QMDJ-RULES.md §6 and §9, course "02 QMDJ Life Reading - Guidelines"):
 * the palace where the Day Stem falls — rotating chart of the birth hour, day stem on
 * the Tian Pan; a 甲 day takes the hidden stem of its decade (甲子 → 戊).
 *
 * Nothing is computed here: pillars in true solar time at the BIRTH place and the Life
 * Palace come from XKDGMultiChart.lifeStar (already used by the Multiple charts), the
 * drawing is the app's own showQimenChart with its highlight.
 * Checked against the course examples: Marilyn Monroe (癸巳 辛酉 癸巳 丙寅, Life Palace
 * Kan), Bill Gates (辛亥 壬戌 丙戌 乙未), J. D. Rockefeller (壬子 壬戌 辛未 己亥, Kan).
 *
 * Charts -> "QMDJ Life chart".  window.openQmdjLifeChart()
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var STEMS = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥';
  var HAN = { Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊', Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸' };
  var TRI = { 1: 'Kan · N', 2: 'Kun · SW', 3: 'Zhen · E', 4: 'Xun · SE', 6: 'Qian · NW', 7: 'Dui · W', 8: 'Gen · NE', 9: 'Li · S' };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Everyone with a full birth date and hour: Person A / B of the main form, then the saved people.
  function people() {
    var out = [], seen = {};
    var lon0 = parseFloat(($('longitude') || {}).value), utc0 = parseFloat(($('utc-offset') || {}).value);
    [['A', 'person-name', 'person-date', 'person-time', 'person-pillars-a'], ['B', 'person-name-b', 'person-date-b', 'person-time-b', 'person-pillars-b']].forEach(function (s) {
      var nm = (($(s[1]) || {}).value || '').trim(), date = ($(s[2]) || {}).value, time = ($(s[3]) || {}).value;
      var depth = parseInt(($(s[4]) || {}).value, 10) || 4;
      if (!nm || !date || !time || depth < 4) return;
      var g = null; try { g = window._personBirthGeo(s[0]); } catch (e) {}
      out.push({ name: nm, date: date, time: time, lon: g ? g.lon : lon0, utc: g ? g.utc : utc0, dst: !!(g && g.dst) });
      seen[nm] = 1;
    });
    var all = {}; try { all = window.xkdgPersonsAll() || {}; } catch (e) {}
    Object.keys(all).sort().forEach(function (k) {
      var r = all[k];
      if (seen[k] || !r || !r.date || !r.time || (r.depth || 4) < 4) return;
      out.push({ name: k, date: r.date, time: r.time, lon: isFinite(r.birthLon) ? r.birthLon : lon0,
                 utc: isFinite(r.birthUtc) ? r.birthUtc : utc0, dst: !!r.birthDst });
    });
    return out;
  }

  // The two void branches of the day pillar's decade.
  function voids(day) {
    var si = STEMS.indexOf(day.charAt(0)), bi = BR.indexOf(day.charAt(1));
    if (si < 0 || bi < 0) return '';
    var b0 = ((bi - si) % 12 + 12) % 12;
    return BR.charAt((b0 + 10) % 12) + ' ' + BR.charAt((b0 + 11) % 12);
  }

  // {ok, html, info} for one person.
  function build(p) {
    var M = window.XKDGMultiChart;
    if (!M || typeof M.lifeStar !== 'function' || typeof window.showQimenChart !== 'function') return { ok: false, error: 'Chart engine not loaded.' };
    var L = null;
    try { L = M.lifeStar({ date: p.date, time: p.time, lon: p.lon, utc: p.utc, dst: p.dst }); } catch (e) {}
    if (!L) return { ok: false, error: 'Cannot compute the chart for this birth date.' };
    var P = L.pillars, t = P.meta.tst;
    var iso = t.y + '-' + (t.mo < 10 ? '0' : '') + t.mo + '-' + (t.d < 10 ? '0' : '') + t.d;
    var html = '';
    try {
      html = window.showQimenChart(iso, P.hour.charAt(0), P.hour.charAt(1), L.palace,
        { mode: 'rotating', returnHtml: true, bjInstant: P.meta.beijing }) || '';
    } catch (e) { html = ''; }
    if (!html) return { ok: false, error: 'Chart renderer not available.' };
    html = html.replace(/Hour Rotating Chart/, 'Life chart');
    var ds = P.day.charAt(0), st = HAN[L.stem] || L.stem;
    var col = function (lbl, gz) {
      return '<td style="padding:2px 9px;text-align:center;"><div style="font-size:10px;color:#888;">' + lbl + '</div>'
        + '<div style="font-size:19px;line-height:1.15;">' + gz.charAt(0) + '<br>' + gz.charAt(1) + '</div></td>';
    };
    var info = '<table style="border-collapse:collapse;margin:0 auto 6px;"><tr>'
      + col('Hour', P.hour) + col('Day', P.day) + col('Month', P.month) + col('Year', P.year) + '</tr></table>'
      + '<div style="text-align:center;font-size:12px;color:#555;margin-bottom:6px;">Voids: <b>' + voids(P.day) + '</b>'
      + ' · <span style="color:#b71c1c;">Life Palace: <b>' + (TRI[L.palace] || L.palace) + '</b></span>'
      + ' · Day Stem <b>' + ds + '</b>' + (ds !== st ? ' (hidden under <b>' + st + '</b>)' : '') + '</div>';
    return { ok: true, html: html, info: info, life: L };
  }

  function show() {
    var sel = $('qlife-who'), out = $('qlife-out'); if (!sel || !out) return;
    var list = people(), p = list.filter(function (x) { return x.name === sel.value; })[0];
    if (!p) { out.innerHTML = '<div style="color:#888;font-size:12px;">Choose a person with a full birth date and hour.</div>'; return; }
    var r = build(p);
    out.innerHTML = r.ok ? (r.info + r.html) : '<div style="color:#c0392b;font-size:12px;">' + esc(r.error) + '</div>';
  }

  function open() {
    var ov = $('qlife-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'qlife-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(20,8,30,.55);display:flex;'
        + 'align-items:flex-start;justify-content:center;padding:20px;overflow:auto;';
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.style.display = 'none'; });
      ov.innerHTML =
          '<div style="background:#fff;border-radius:12px;max-width:780px;width:100%;padding:16px;box-shadow:0 12px 44px rgba(0,0,0,.32);">'
        +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        +     '<div style="font-size:16px;font-weight:bold;color:#4527a0;">👤 QMDJ Life chart</div>'
        +     '<button onclick="document.getElementById(\'qlife-overlay\').style.display=\'none\'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1;">✕</button>'
        +   '</div>'
        +   '<select id="qlife-who" onchange="qmdjLifeShow()" style="padding:6px;border:1px solid #b39ddb;border-radius:5px;font-size:14px;max-width:100%;margin-bottom:10px;"></select>'
        +   '<div id="qlife-out"></div>'
        + '</div>';
      document.body.appendChild(ov);
    }
    var list = people(), sel = $('qlife-who'), keep = sel.value;
    sel.innerHTML = (list.length ? '' : '<option value="">— no person with birth date and hour —</option>')
      + list.map(function (x) { return '<option value="' + esc(x.name) + '">' + esc(x.name) + '</option>'; }).join('');
    if (keep && list.some(function (x) { return x.name === keep; })) sel.value = keep;
    ov.style.display = 'flex';
    show();
  }

  window.openQmdjLifeChart = open;
  window.qmdjLifeShow = show;
  window.XKDGLifeChart = { people: people, build: build };
})();

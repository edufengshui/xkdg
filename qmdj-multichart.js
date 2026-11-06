// ============================================================
// XKDG — qmdj-multichart.js
// QMDJ Feng Shui activations with MULTIPLE charts (session 39, Edu) — QMDJ5 ch. 06, QMDJ-RULES.md §8
// ============================================================
// Flying charts only. Month + Day + Hour (or Day + Hour) are superimposed on one Yong Shen
// palace. The pure checks (crossCheck) take plain cells, so they can be tested without a date.
(function () {
  'use strict';
  var PAL_BR = { 1: ['子'], 8: ['丑', '寅'], 3: ['卯'], 4: ['辰', '巳'], 9: ['午'], 2: ['未', '申'], 7: ['酉'], 6: ['戌', '亥'] };
  var BR_CLASH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
  var BR_PIN = { 子: 'Zi', 丑: 'Chou', 寅: 'Yin', 卯: 'Mao', 辰: 'Chen', 巳: 'Si', 午: 'Wu', 未: 'Wei', 申: 'Shen', 酉: 'You', 戌: 'Xu', 亥: 'Hai' };
  var HAN = { Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊', Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸' };
  var EL = { Jia: 'wood', Yi: 'wood', Bing: 'fire', Ding: 'fire', Wu: 'earth', Ji: 'earth', Geng: 'metal', Xin: 'metal', Ren: 'water', Gui: 'water' };
  var GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
  var KE = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
  var CLASH = [['Jia', 'Geng'], ['Yi', 'Xin'], ['Bing', 'Ren'], ['Ding', 'Gui']];
  var BAD_PAIR = [['Bing', 'Geng'], ['Wu', 'Xin'], ['Ren', 'Ji'], ['Geng', 'Ji']];     // §1 pairs, across charts too (ex. 3: Xin + Wu)
  var COMBO = [['Jia', 'Ji'], ['Yi', 'Geng'], ['Bing', 'Xin'], ['Ding', 'Ren'], ['Wu', 'Gui']];
  var NAME = { month: 'Month', day: 'Day', hour: 'Hour' };
  var TRI = { 1: 'Kan', 2: 'Kun', 3: 'Zhen', 4: 'Xun', 5: 'Centre', 6: 'Qian', 7: 'Dui', 8: 'Gen', 9: 'Li' };
  var STEM_SEQ = '甲乙丙丁戊己庚辛壬癸', BR_SEQ = '子丑寅卯辰巳午未申酉戌亥';
  var JIA_LEAD = ['Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];                            // 甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸

  function has(list, a, b) { return list.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); }); }
  function A() { return window.QimenDirAnalysis; }
  function elements(c, n) { return A().analyzePalaceFlow(c, n).components.map(function (x) { return { el: x.el, name: x.han || x.name, type: x.type, plate: x.type }; }); }
  function rel(a, b) { return KE[a] === b || KE[b] === a; }                            // one element controls the other

  // charts = [{kind:'month'|'day'|'hour', cell}], master first.
  // Discard: door or star controlled across charts; same-plate stem clash not protected.
  function crossCheck(charts, n) {
    var conflicts = [], excused = [], combos = [];
    var D = A()._tables, pool = [];
    charts.forEach(function (c) { elements(c.cell, n).forEach(function (e) { e.kind = c.kind; pool.push(e); }); });
    for (var i = 0; i < charts.length; i++) for (var j = i + 1; j < charts.length; j++) {
      var a = charts[i], b = charts[j], ca = a.cell, cb = b.cell, who = NAME[a.kind] + '-' + NAME[b.kind];
      var da = D.DOOR_EL[ca.door], db = D.DOOR_EL[cb.door];
      if (da && db && rel(da, db)) conflicts.push(who + ' doors ' + ca.door + ' / ' + cb.door + ' in control');
      var sa = D.STAR_EL[ca.star], sb = D.STAR_EL[cb.star];
      if (sa && sb && rel(sa, sb)) conflicts.push(who + ' stars ' + ca.star + ' / ' + cb.star + ' in control');
      [['ti', 'Tian'], ['di', 'Di']].forEach(function (pl) {
        var x = ca[pl[0]], y = cb[pl[0]]; if (!x || !y) return;
        var txt = who + ' ' + pl[1] + ' Pan ' + HAN[x] + HAN[y];
        if (has(COMBO, x, y)) { combos.push(txt); return; }
        var isC = has(CLASH, x, y); if (!isC && !has(BAD_PAIR, x, y)) return;
        var by = null;
        if (isC) {                                     // bridge: the element between the two stems, from any chart
          var bridge = GEN[KE[EL[x]] === EL[y] ? EL[x] : EL[y]];
          pool.some(function (e) { if (e.el === bridge) { by = e.name + ' (' + NAME[e.kind] + ')'; return true; } return false; });
        }
        // protected by a third chart: a stem that combines with one of the two (ex. 3: Bing with Xin).
        charts.forEach(function (t) {
          if (by || t === a || t === b) return;
          [t.cell.ti, t.cell.di].forEach(function (s) { if (!by && s && (has(COMBO, s, x) || has(COMBO, s, y))) by = HAN[s] + ' (' + NAME[t.kind] + ')'; });
        });
        if (by) excused.push(txt + ' protected by ' + by); else conflicts.push(txt + (isC ? ' clash' : ' formation'));
      });
    }
    return { ok: !conflicts.length, conflicts: conflicts, excused: excused, combos: combos };
  }

  // Master flow + what the other charts fix. Combined = all the charts as one unit.
  function flowInfo(charts, n, monthBranch) {
    var m = A().analyzePalaceFlow(charts[0].cell, n, monthBranch), fixes = [], present = {};
    charts.forEach(function (c) { elements(c.cell, n).forEach(function (e) { present[e.el] = true; }); });
    m.corrections.forEach(function (el) {
      charts.slice(1).some(function (c) {
        var e = elements(c.cell, n).filter(function (x) { return x.el === el && x.type !== 'palace'; })[0];
        if (e) fixes.push(el + ' from ' + e.name + ' (' + NAME[c.kind] + ')');
        return !!e;
      });
    });
    var u = A().orderFlow(present);
    return { master: m, advice: A().flowAdvice(m), fixes: fixes, combined: { state: u.state, chain: u.chain, end: u.end, missing: u.gaps.reduce(function (r, g) { return r.concat(g.miss); }, []) } };
  }

  // The person = the star of the birth Life Palace (ch. 6 slide 5, QMDJ-RULES.md §9).
  // Rotating chart of the birth hour, day stem on the Tian Pan. 甲 = the hidden stem of its decade.
  // The stem from the centre travels with Rice as second stem: then the star is Fowl.
  // b: {date:'YYYY-MM-DD', time:'HH:MM', lon, utc, dst}
  function lifeStar(b) {
    var d = String(b.date).split('-').map(Number), t = String(b.time || '12:00').split(':').map(Number);
    var P = window.XKDGSolarTime.pillarsFromCivil(d[0], d[1], d[2], t[0] || 0, t[1] || 0, 0, b.lon, -((b.utc || 0) * 60 + (b.dst ? 60 : 0)));
    if (!P) return null;
    var pin = {}; Object.keys(HAN).forEach(function (k) { pin[HAN[k]] = k; });
    var si = STEM_SEQ.indexOf(P.day.charAt(0)), bi = BR_SEQ.indexOf(P.day.charAt(1));
    var idx = ((6 * si - 5 * bi) % 60 + 60) % 60;                     // position in the 60 JiaZi
    var stem = si === 0 ? JIA_LEAD[Math.floor(idx / 10)] : pin[P.day.charAt(0)];
    var c = window.QMDJWaterScanner.getRotatingHourChart(P.meta.tst.y, P.meta.tst.mo, P.meta.tst.d, P.hour.charAt(0), P.hour.charAt(1), P.meta.beijing);
    if (!c) return null;
    for (var n = 1; n <= 9; n++) {
      var x = c.palaces[n]; if (n === 5 || !x) continue;
      if (x.ti === stem) return { star: x.star, palace: n, stem: stem, pillars: P };
      if (x.ti2 === stem) return { star: 'Fowl', palace: n, stem: stem, pillars: P };
    }
    return null;
  }

  function starPalace(chart, star) {
    for (var n = 1; n <= 9; n++) if (chart.palaces[n] && chart.palaces[n].star === star) return n;
    return 0;
  }

  // Yong Shen palace against the palace of the person's star, on EVERY chart (ch. 6 slide 10).
  // YS generates, is generated or same: fine. Star palace controls YS: warning only.
  // YS controls the star palace: discard, unless ANOTHER chart brings the bridge element
  // into the YS palace. charts need .chart; people = [{name, star}].
  function personCheck(charts, n, people) {
    var D = A()._tables, rows = [], warnings = [], discards = [], fixes = [];
    (people || []).forEach(function (who) {
      charts.forEach(function (c) {
        var p = starPalace(c.chart, who.star); if (!p) return;
        var r = A().palaceRelation(n, p);
        rows.push({ name: who.name, star: who.star, kind: c.kind, palace: p, relation: r });
        var txt = who.name + ' ' + who.star + ' in ' + TRI[p] + ' (' + NAME[c.kind] + ')';
        if (r === 'controlled') warnings.push(txt + ' controls the Yong Shen palace');
        if (r !== 'controls') return;
        var bridge = GEN[D.PALACE_EL[n]], by = null;
        charts.some(function (o) {
          if (o === c) return false;
          var e = elements(o.cell, n).filter(function (x) { return x.el === bridge && x.type !== 'palace'; })[0];
          if (e) by = e.name + ' (' + NAME[o.kind] + ')';
          return !!e;
        });
        if (by) fixes.push(txt + ' controlled, bridged by ' + bridge + ' from ' + by);
        else discards.push(txt + ' controlled by the Yong Shen palace');
      });
    });
    return { ok: !discards.length, rows: rows, warnings: warnings, discards: discards, fixes: fixes };
  }

  function dayBlock(isoD, branch, n) {
    var p = isoD.split('-'), v = window.QMDJWaterScanner.dayVoidPalaces(+p[0], +p[1], +p[2]);
    if (v.palaces.indexOf(n) >= 0) return 'void';
    var clash = PAL_BR[n].indexOf(BR_CLASH[branch]) >= 0;
    if (clash && v.filledPalaces.indexOf(n) < 0) return 'clash_day';
    return (clash ? 'filled' : '');
  }

  // o: {palace, charts:'mdh'|'dh', mode:'long'|'short', start, days, purpose (entry), max, people:[{name, star}]}
  function scan(o) {
    var D = window.XKDGDayMonth, W = window.QMDJWaterScanner, n = +o.palace, useM = o.charts !== 'dh', short = o.mode === 'short';
    var days = Math.min(Math.max(+o.days || 30, 1), 180), max = Math.min(Math.max(+o.max || 10, 1), 40);
    var doorOk = function (c) { return !o.purpose || (o.purpose.doors || []).indexOf(c.doorCode) >= 0; };
    var st = String(o.start).split('-'), t0 = Date.UTC(+st[0], +st[1] - 1, +st[2]), out = [];
    var stats = { days: days, void: 0, clash_day: 0, month: 0, day: 0, month_day: 0, no_hour: 0, person: 0 };
    for (var i = 0; i < days && out.length < max; i++) {
      var dt = new Date(t0 + i * 86400000), y = dt.getUTCFullYear(), mo = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      var isoD = dt.toISOString().slice(0, 10), R = D.dayChartJu(y, mo, d); if (!R) continue;
      var block = dayBlock(isoD, R.dayGz.charAt(1), n);
      if (block === 'void' || block === 'clash_day') { stats[block]++; continue; }
      var P = D.pillarsAtNoon(isoD), mb = BR_PIN[P.month.charAt(1)], base = [], mj = null;
      if (useM) {
        mj = D.monthChartJu(P.year, y);
        var mc = W.getHourChart(2000, 1, 1, P.month.charAt(0), P.month.charAt(1), null, { ju: mj.ju, dun: 'yin' });
        var mCell = mc && mc.palaces[n];
        if (!D.positive(mCell, null) || (!short && !doorOk(mCell))) { stats.month++; continue; }
        base.push({ kind: 'month', cell: mCell, chart: mc });
      }
      var dc = W.getHourChart(2000, 1, 1, R.dayGz.charAt(0), R.dayGz.charAt(1), null, { ju: R.ju, dun: R.dun });
      var dCell = dc && dc.palaces[n];
      if (!D.positive(dCell, null) || (!short && !useM && !doorOk(dCell))) { stats.day++; continue; }
      base.push({ kind: 'day', cell: dCell, chart: dc });
      if (base.length === 2 && !crossCheck(base, n).ok) { stats.month_day++; continue; }
      var hours = [], lostToPerson = false;
      (D.dayHourMatches(isoD, dc, false, null, n).hits[n] || []).forEach(function (x) {
        if (short && !doorOk(x.cell)) return;
        var cs = base.concat([{ kind: 'hour', cell: x.cell, chart: x.chart }]);
        if (short) cs = cs.slice().reverse();                     // the fastest chart is the master
        var chk = crossCheck(cs, n); if (!chk.ok) return;
        var pc = personCheck(cs, n, o.people);
        if (!pc.ok) { lostToPerson = true; return; }
        var fl = flowInfo(cs, n, mb);
        hours.push({ ganzhi: x.gan + x.zhi, gan: x.gan, zhi: x.zhi, clock: x.civ, cell: x.cell, check: chk, flow: fl, person: pc });
      });
      if (!hours.length) { stats[lostToPerson ? 'person' : 'no_hour']++; continue; }
      out.push({ date: isoD, day: R.dayGz, month: P.month, year: P.year, dun: R.dun, ju: R.ju, month_ju: mj && mj.ju,
                 filled: block === 'filled', month_cell: useM ? base[0].cell : null, day_cell: dCell, hours: hours });
    }
    return { results: out, stats: stats };
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function cellLine(c) { return (c.tiH || '') + '/' + (c.diH || '') + ' · ' + (c.door || '') + ' · ' + (c.star || '') + ' · ' + (c.deity || ''); }
  function open() {
    var ov = $('mc-overlay');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'mc-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(20,8,30,.55);display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto;';
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.style.display = 'none'; });
      var F = 'padding:6px;border:1px solid #b39ddb;border-radius:5px;font-size:13px;', L = 'font-size:11px;color:#666;display:block;margin-bottom:2px;';
      ov.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:780px;width:100%;padding:16px;box-shadow:0 12px 44px rgba(0,0,0,.32);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-size:16px;font-weight:bold;color:#5e35b1;">🧩 QMDJ Multiple charts · Flying 飛盤</div>'
        + '<button onclick="document.getElementById(\'mc-overlay\').style.display=\'none\'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1;">✕</button></div>'
        + '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px;">'
        + '<div><label style="' + L + '">Yong Shen palace</label><select id="mc-pal" style="' + F + '"><option value="1">N Kan</option><option value="8">NE Gen</option><option value="3">E Zhen</option><option value="4">SE Xun</option><option value="9">S Li</option><option value="2">SW Kun</option><option value="7">W Dui</option><option value="6">NW Qian</option></select></div>'
        + '<div><label style="' + L + '">Charts</label><select id="mc-charts" style="' + F + '"><option value="mdh">Month + Day + Hour</option><option value="dh">Day + Hour</option></select></div>'
        + '<div><label style="' + L + '">Effect</label><select id="mc-mode" onchange="xkdgMCWarn()" style="' + F + '"><option value="long">Support the longer effect</option><option value="short">Boost the shorter effect</option></select></div>'
        + '<div><label style="' + L + '">From</label><input type="date" id="mc-from" style="' + F + '"></div>'
        + '<div><label style="' + L + '">Days</label><input type="number" id="mc-days" value="60" min="1" max="180" style="' + F + 'width:64px;"></div>'
        + '<div><label style="' + L + '">Person</label><select id="mc-p1" style="' + F + 'max-width:130px;"></select></div>'
        + '<div><label style="' + L + '">Person 2</label><select id="mc-p2" style="' + F + 'max-width:130px;"></select></div>'
        + '<button onclick="xkdgMCScan()" style="padding:7px 16px;border:none;border-radius:6px;background:#4527a0;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Scan</button></div>'
        + '<div id="mc-warn" style="font-size:12px;color:#b26a00;margin-bottom:6px;"></div><div id="mc-out"></div>'
        + '<div style="font-size:10px;color:#999;margin-top:10px;line-height:1.5;">Every chart must be positive in the palace. Left out: void palace, clash days (unless they fill the void palace), doors or stars in control across charts, unprotected stem clashes on the same plate, a Yong Shen palace controlling the person\'s star palace without a bridge from another chart. '
        + 'Hour: short effect. Day: medium effect. Month: long effect. The purpose picked in the main panel applies to the master chart. Clock time = centre of the Chinese hour.</div></div>';
      document.body.appendChild(ov);
    }
    var v = ($('date') || {}).value || '';
    $('mc-from').value = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10);
    fillPeople(); ov.style.display = 'flex'; warn();
  }
  // Only people with a full birth date and hour have a Life Palace.
  function savedPeople() {
    var all = {}; try { all = window.xkdgPersonsAll() || {}; } catch (e) {}
    return Object.keys(all).filter(function (k) { var p = all[k]; return p && p.date && p.time && (p.depth || 4) >= 4; }).sort().map(function (k) { return { name: k, rec: all[k] }; });
  }
  function fillPeople() {
    var opts = '<option value="">—</option>' + savedPeople().map(function (x) { var e = x.name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); return '<option value="' + e + '">' + e + '</option>'; }).join('');
    ['mc-p1', 'mc-p2'].forEach(function (id) { var el = $(id), v = el.value; el.innerHTML = opts; el.value = v; if (el.selectedIndex < 0) el.value = ''; });
    var cur = (($('person-name') || {}).value || '').trim();
    if (!$('mc-p1').value && cur) { $('mc-p1').value = cur; if ($('mc-p1').selectedIndex < 0) $('mc-p1').value = ''; }
  }
  function pickedPeople() {
    var list = savedPeople(), out = [], lon0 = parseFloat(($('longitude') || {}).value), utc0 = parseFloat(($('utc-offset') || {}).value);
    ['mc-p1', 'mc-p2'].forEach(function (id) {
      var nm = $(id).value, x = list.filter(function (q) { return q.name === nm; })[0];
      if (!x || out.some(function (q) { return q.name === nm; })) return;
      var r = x.rec, L = lifeStar({ date: r.date, time: r.time, lon: isFinite(r.birthLon) ? r.birthLon : lon0, utc: isFinite(r.birthUtc) ? r.birthUtc : utc0, dst: !!r.birthDst });
      if (L) out.push({ name: nm, star: L.star, palace: L.palace });
    });
    return out;
  }
  var REL_TXT = { same: 'same element as the Yong Shen palace', generates: 'generated by the Yong Shen palace', generated: 'generates the Yong Shen palace', controls: 'controlled by the Yong Shen palace', controlled: 'controls the Yong Shen palace' };
  function warn() { $('mc-warn').textContent = $('mc-mode').value === 'short' ? '⚠ Use this method with care. It is mainly to be used to unblock frozen situations.' : ''; }
  function run() {
    var out = $('mc-out'), D = window.XKDGDayMonth, pur = D.purposeEntry(), S, ppl = [];
    var long = $('mc-mode').value === 'long', useM = $('mc-charts').value === 'mdh';
    try { ppl = pickedPeople(); S = scan({ palace: +$('mc-pal').value, charts: $('mc-charts').value, mode: $('mc-mode').value, start: $('mc-from').value, days: +$('mc-days').value, purpose: pur && pur.entry, people: ppl }); }
    catch (e) { out.innerHTML = '<div style="color:#c0392b;font-size:12px;">Scan failed: ' + (e && e.message) + '</div>'; return; }
    var master = long ? (useM ? 'Month' : 'Day') : 'Hour', s = S.stats;
    var h = '<div style="font-size:12px;color:#4527a0;font-weight:600;margin-bottom:6px;">Master chart: ' + master + (pur ? ' · purpose ' + pur.entry.label : '') + ' · ' + S.results.length + ' day(s)</div>'
      + ppl.map(function (q) { return '<div style="font-size:12px;color:#555;margin-bottom:4px;">' + q.name + ': star ' + q.star + ' (Life Palace ' + TRI[q.palace] + ')</div>'; }).join('');
    S.results.forEach(function (r) {
      h += '<div style="border:1px solid #d1c4e9;border-radius:8px;padding:7px 9px;margin-bottom:7px;font-size:12px;"><b>' + r.date + '</b> · day ' + r.day + ' · month ' + r.month + (r.filled ? ' · <span style="color:#1b5e20;">clash day fills the void palace</span>' : '')
        + (r.month_cell ? '<div style="color:#666;">Month (Yin ' + r.month_ju + '): ' + cellLine(r.month_cell) + '</div>' : '')
        + '<div style="color:#666;">Day (' + (r.dun === 'yang' ? 'Yang ' : 'Yin ') + r.ju + '): ' + cellLine(r.day_cell) + '</div>';
      r.hours.forEach(function (x) {
        var notes = x.flow.fixes.map(function (t) { return '✓ fixes ' + t; }).concat(x.check.excused, x.check.combos.map(function (t) { return 'combination ' + t; }));
        h += '<div style="margin-top:5px;border-top:1px dashed #e0d8f0;padding-top:4px;"><button onclick="xkdgMCHour(\'' + r.date + '\',\'' + x.gan + '\',\'' + x.zhi + '\')" style="padding:3px 9px;border:1px solid #66bb6a;background:#e8f5e9;color:#1b5e20;border-radius:12px;font-size:12px;cursor:pointer;">' + x.ganzhi + ' · ' + x.clock + '</button> <span style="color:#555;">' + cellLine(x.cell) + '</span>'
          + x.flow.advice.map(function (a) { return '<div style="color:#333;">' + a.text + '</div>'; }).join('')
          + (notes.length ? '<div style="color:#6a1b9a;">' + notes.join(' · ') + '</div>' : '')
          + x.person.rows.map(function (q) { return '<div style="color:#555;">' + q.name + ' ' + q.star + ', ' + NAME[q.kind] + ': ' + TRI[q.palace] + ' ' + (REL_TXT[q.relation] || '') + '</div>'; }).join('')
          + x.person.fixes.map(function (t) { return '<div style="color:#1b5e20;">✓ ' + t + '</div>'; }).join('')
          + x.person.warnings.map(function (t) { return '<div style="color:#b26a00;">⚠ ' + t + '</div>'; }).join('') + '</div>';
      });
      h += '</div>';
    });
    if (!S.results.length) h += '<div style="font-size:12px;color:#888;">No combination in this period.</div>';
    h += '<div style="font-size:11px;color:#888;">Days left out: ' + s.void + ' void · ' + s.clash_day + ' clash day' + (useM ? ' · ' + s.month + ' month chart' : '') + ' · ' + s.day + ' day chart' + (useM ? ' · ' + s.month_day + ' month-day conflict' : '') + ' · ' + s.no_hour + ' no hour' + (ppl.length ? ' · ' + s.person + ' person' : '') + '</div>';
    out.innerHTML = h;
  }
  window.XKDGMultiChart = { crossCheck: crossCheck, flowInfo: flowInfo, scan: scan, open: open, lifeStar: lifeStar, personCheck: personCheck };
  window.openQmdjMultiChart = open; window.xkdgMCScan = run; window.xkdgMCWarn = warn;
  window.xkdgMCHour = function (iso, g, z) { var o = $('mc-overlay'); if (o) o.style.display = 'none'; window.xkdgDMOpenHour(iso, g, z, 0); };
})();

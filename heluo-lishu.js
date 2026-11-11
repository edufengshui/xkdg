// He Luo Li Shu 河洛理數 — natal chart (phase 1) + annual / monthly hexagrams (phase 2), calculations only.
// Rules from Edu's "Heluo Lishu" slides, decided with Edu in session 42 (handoff/heluo-lishu-plan.md).
// Year pillar from the WINTER SOLSTICE; month / day / hour in TRUE SOLAR TIME (XKDGSolarTime).
// Charts menu → ☯ He Luo Li Shu (app-fengshui.js xkdgChartsPick 'heluo').
(function (root) {
  'use strict';
  var STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var STEM_PY = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
  var BR_PY = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  // trigrams: lines bottom-up (1 = yang)
  var TRI = {
    Qian: [1,1,1], Dui: [1,1,0], Li: [1,0,1], Zhen: [1,0,0],
    Xun: [0,1,1], Kan: [0,1,0], Gen: [0,0,1], Kun: [0,0,0]
  };
  var TRI_CN = { Qian:'乾', Dui:'兌', Li:'離', Zhen:'震', Xun:'巽', Kan:'坎', Gen:'艮', Kun:'坤' };
  var TRI_EL = { Qian:'Metal', Dui:'Metal', Li:'Fire', Zhen:'Wood', Xun:'Wood', Kan:'Water', Gen:'Earth', Kun:'Earth' };
  var ORDER = ['Qian','Dui','Li','Zhen','Xun','Kan','Gen','Kun'];
  // King Wen number: KW[lower][index of upper in ORDER]
  var KW = {
    Qian: [1,43,14,34,9,5,26,11],  Dui: [10,58,38,54,61,60,41,19],
    Li:   [13,49,30,55,37,63,22,36], Zhen:[25,17,21,51,42,3,27,24],
    Xun:  [44,28,50,32,57,48,18,46], Kan: [6,47,64,40,59,29,4,7],
    Gen:  [33,31,56,62,53,39,52,15], Kun: [12,45,35,16,20,8,23,2]
  };
  // Na Jia for stems
  var NAJIA = ['Qian','Kun','Gen','Dui','Kan','Li','Zhen','Xun','Qian','Kun'];
  var NAJIA_N = [6,2,8,7,1,9,3,4,6,2];
  // Hetu for branches: [odd, even]
  var HETU = [[1,6],[5,10],[3,8],[3,8],[5,10],[7,2],[7,2],[5,10],[9,4],[9,4],[5,10],[1,6]];
  // branch -> trigram
  var BR_TRI = ['Kan','Gen','Gen','Zhen','Xun','Xun','Li','Kun','Kun','Dui','Qian','Qian'];
  var NUM_TRI = { 1:'Kan', 2:'Kun', 3:'Zhen', 4:'Xun', 6:'Qian', 7:'Dui', 8:'Gen', 9:'Li' };
  // month branch -> average [yang, yin] (Zi = December ... Hai = November)
  var MONTH_AVG = [[12,50],[16,40],[24,30],[32,20],[40,15],[48,10],[40,15],[32,20],[24,30],[16,40],[12,50],[8,60]];
  var MONTH_NAME = ['December','January','February','March','April','May','June','July','August','September','October','November'];
  var SEASON = ['Winter Solstice → Spring Equinox', 'Spring Equinox → Summer Solstice', 'Summer Solstice → Autumn Equinox', 'Autumn Equinox → Winter Solstice'];

  function triName(bits) { for (var k in TRI) if (TRI[k].join('') === bits.join('')) return k; return null; }
  function hexOf(lines) { // lines[0..5] bottom-up
    var lo = triName(lines.slice(0,3)), up = triName(lines.slice(3,6));
    return { n: KW[lo][ORDER.indexOf(up)], lower: lo, upper: up, lines: lines.slice() };
  }
  function hexFrom(upper, lower) { return hexOf(TRI[lower].concat(TRI[upper])); }

  // Heaven number -> trigram: above 25 subtract 25; then the units digit (10 -> 1, 20 -> 2); 5 -> special
  function heavenTrigram(n) {
    var r = n; while (r > 25) r -= 25;
    var d = r % 10; if (d === 0) d = r / 10;
    return d === 5 ? null : NUM_TRI[d];
  }
  // Earth number -> trigram: units digit (0 -> Kan)
  function earthTrigram(n) { var d = n % 10; return d === 0 ? 'Kan' : NUM_TRI[d]; }

  // the 5 case: cycles Upper 1864 / Middle 1924 / Lower 1984
  function fiveCycle(year) { return ((Math.floor((year - 1864) / 60) % 3) + 3) % 3; } // 0 upper, 1 middle, 2 lower
  function fiveTrigram(year, male) {
    var c = fiveCycle(year), even = year % 2 === 0;
    if (c === 0) return male ? 'Gen' : 'Kun';
    if (c === 2) return male ? 'Li' : 'Dui';
    return male ? (even ? 'Gen' : 'Kun') : (even ? 'Kun' : 'Gen');
  }

  // Branches on each line (yang time Zi..Si, yin time Wu..Hai). yangDun: born Winter -> Summer Solstice
  function lineBranches(lines, hourBr, male, yangDun) {
    var yang = [], yin = [], i, at = [[],[],[],[],[],[]];
    for (i = 0; i < 6; i++) (lines[i] ? yang : yin).push(i);
    var yangTime = hourBr <= 5;
    var first = yangTime ? 0 : 6;
    if (yang.length === 6 || yin.length === 6) {
      var reverse = yang.length === 6 ? (!male && yangDun) : (male && !yangDun);
      // normal: lower trigram bottom-up Zi Chou Yin / Mao Chen Si; upper Wu Wei Shen / You Xu Hai
      // reversed: upper top-down Zi.., lower top-down Wu..
      for (var b = 0; b < 12; b++) {
        var tg = b < 6 ? 0 : 1, k = b % 3, pos;
        if (!reverse) pos = tg * 3 + k; else pos = (tg === 0 ? 5 : 2) - k;
        at[pos].push(b);
      }
      return at;
    }
    var main = yangTime ? yang : yin, other = yangTime ? yin : yang;
    var order = main.length <= 3 ? main.concat(main) : main.slice();
    order = order.concat(other).slice(0, 6);
    for (i = 0; i < 6; i++) at[order[i]].push(first + i);
    return at;
  }
  function movingLine(lines, hourBr, male, yangDun) {
    var at = lineBranches(lines, hourBr, male, yangDun);
    for (var i = 0; i < 6; i++) if (at[i].indexOf(hourBr) >= 0) return { line: i + 1, branches: at };
    return { line: null, branches: at };
  }

  // Hou Tian Gua: change the moving line, swap the trigrams, the moving line keeps its place
  // inside its trigram. Special 29 / 3 / 39 (Edu, option a): ONLY when the moving line is the 5th
  // and the month is Wu..Hai, or the 6th and the month is Zi..Si → change that line, no swap,
  // same moving line.
  function houTian(xt, mv, monthBr) {
    var lines = xt.lines.slice();
    if ((xt.n === 29 || xt.n === 3 || xt.n === 39) && ((mv === 5 && monthBr >= 6) || (mv === 6 && monthBr <= 5))) {
      lines[mv - 1] = 1 - lines[mv - 1];
      return { hex: hexOf(lines), line: mv, rule: 'special' };
    }
    lines[mv - 1] = 1 - lines[mv - 1];
    var nh = hexOf(lines.slice(3, 6).concat(lines.slice(0, 3)));
    return { hex: nh, line: mv <= 3 ? mv + 3 : mv - 3, rule: 'normal' };
  }

  // time cycles: from the moving line upward, wrapping; yang 9 years, yin 6
  function cycles(lines, mv, startAge) {
    var out = [], age = startAge, i = mv - 1;
    for (var k = 0; k < 6; k++) {
      var len = lines[i] ? 9 : 6;
      out.push({ line: i + 1, yang: !!lines[i], from: age, to: age + len - 1 });
      age += len; i = (i + 1) % 6;
    }
    return out;
  }
  function huGua(lines) { return hexOf([lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]]); }
  function opposite(lines) { return hexOf(lines.map(function (x) { return 1 - x; })); }
  function inverse(lines) { return hexOf(lines.slice().reverse()); }
  function oppTri(t) { return triName(TRI[t].map(function (x) { return 1 - x; })); }
  function properPosition(lines, ln) { return (ln % 2 === 1) === !!lines[ln - 1]; }
  function properSupport(lines, ln) { var o = ln <= 3 ? ln + 3 : ln - 3; return lines[ln - 1] !== lines[o - 1]; }
  function prevailing(lines) {
    var y = lines.reduce(function (a, b) { return a + b; }, 0);
    if (y === 6) return 'pure yang'; if (y === 0) return 'pure yin';
    if (y === 1) return 'single yang line'; if (y === 5) return 'single yin line'; return null;
  }

  // ── Phase 2: annual and monthly hexagrams ────────────────────────────────
  // Rules read from the reference calculator (bazi-calculator.com/calcHLLS.php, session 43,
  // handoff/heluo-lishu-phase2.md, approved by Edu); year from the WINTER SOLSTICE (Edu).
  function wrap6(x) { return ((x - 1) % 6 + 6) % 6 + 1; }
  function partner(l) { return l <= 3 ? l + 3 : l - 3; }
  function flip(lines, set) { var b = lines.slice(); set.forEach(function (x) { b[x - 1] = 1 - b[x - 1]; }); return b; }
  // H = period hexagram (lines), L = ruling line, k = year of the period (1..), yangYear = the
  // period's FIRST year has a yang stem. Returns { hex, moved, changed:[lines vs H] }.
  // Yin line: year k changes L..L+k-1. Yang line: y1 L (none if the period starts in a yang year),
  // y2 + partner, y3 L again, y4.. L+1, L+2 … cumulative.
  function annualHex(H, L, k, yangYear) {
    var S = [], m;
    function t(x) { var i = S.indexOf(x); if (i >= 0) S.splice(i, 1); else S.push(x); }
    if (!H[L - 1]) { for (var i = 0; i < k; i++) t(wrap6(L + i)); m = wrap6(L + k - 1); }
    else {
      if (!yangYear) t(L); m = L;
      if (k >= 2) { t(partner(L)); m = partner(L); }
      if (k >= 3) { t(L); m = L; }
      for (var j = 4; j <= k; j++) { t(wrap6(L + j - 3)); m = wrap6(L + j - 3); }
    }
    return { hex: hexOf(flip(H, S)), moved: m, changed: S.slice().sort() };
  }
  // Monthly hexagram — Edu's rule, decided 10/11/2026 (HLLS project, claude/hlls-mensile-decisione.md).
  // The Heluo year starts at the Winter Solstice; its 12 months are whole months starting at the 中氣:
  // 冬至 = 1, 大寒 2, 雨水 3, 春分 4, 穀雨 5, 小滿 6, 夏至 7, 大暑 8, 處暑 9, 秋分 10, 霜降 11, 小雪 12.
  // Line k of the annual rules months 2k-1 and 2k (lines 1-3 from the Winter to the Summer Solstice, 4-6 after).
  // Odd month: the annual with line k changed. Even month: the previous month with the correlate of k changed too
  // (1<->4, 2<->5, 3<->6: two lines against the annual); then back to the annual. No accumulation; the moved line of
  // the annual does not enter the monthly. Example: annual 19 -> month 1 = 7, month 2 = 40, month 3 = 24.
  // (Replaces the cumulative rule of the reference calculator: months from the Jie, lines from the moved line + 1.)
  // A = annual hexagram (lines), i = month index 1..12.
  function monthlyHex(A, i) {
    var k = Math.ceil(i / 2), S = [k];
    if (i % 2 === 0) S.push(partner(k));
    return { hex: hexOf(flip(A, S)), changed: S.slice().sort(), index: i, line: k };
  }
  // The 12 中氣 that open the months (lunar-javascript names, simplified) and their English names for the UI
  var QI = ['冬至','大寒','雨水','春分','谷雨','小满','夏至','大暑','处暑','秋分','霜降','小雪'];
  var QI_EN = ['Winter Solstice','Greater Cold','Rain Water','Spring Equinox','Grain Rain','Grain Full','Summer Solstice','Greater Heat','End of Heat','Autumn Equinox','Frost Descent','Lesser Snow'];
  // Month of a moment. P = XKDGSolarTime pillars (P.meta.beijing = the instant in Beijing time).
  // Returns { index 1..12, qi: Beijing-naive Date of the 中氣 that opened the month }.
  function qiMonth(P) {
    var b = P.meta.beijing, S = root.Solar || root.Lunar.Solar;
    var q = S.fromYmdHms(b.y, b.mo, b.d, b.h, b.mi, b.s || 0).getLunar().getPrevQi(false), so = q.getSolar();
    return { index: QI.indexOf(q.getName()) + 1, qi: new Date(Date.UTC(so.getYear(), so.getMonth() - 1, so.getDay(), so.getHour(), so.getMinute(), so.getSecond())) };
  }
  // Daily hexagram (Edu, 10/11/2026: "Signore del Blocco"). M = monthly hexagram (lines), day = day of the
  // month (1 = day of the 中氣 that opened it, true solar time). Block k (5 days) = line k%6+1 of M: it changes on M -> block hexagram; that line
  // is the Lord of the Block and stays fixed. The other 5 lines cover the 5 days one each, rising from the line
  // above the Lord (after 6 back to 1); each day changes ONE line on the block hexagram (no accumulation).
  // Read the text of that line in the block hexagram and in the day hexagram.
  function dailyHex(M, day) {
    var i = day - 1, lord = Math.floor(i / 5) % 6 + 1, j = i % 5, line = wrap6(lord + 1 + j);
    var block = hexOf(flip(M, [lord]));
    return { lord: lord, block: block, line: line, hex: hexOf(flip(block.lines, [line])), dayInBlock: j + 1 };
  }
  // R = natal result, Y = Heluo year (Gregorian number; from the Winter Solstice of Y-1)
  function annual(R, Y) {
    var y0 = R.input ? R.input.o.year : R.year0, age = Y - y0 + 1, per = null, hx = null;
    (R.cyclesXT || []).forEach(function (c) { if (age >= c.from && age <= c.to) { per = c; hx = R.xianTian; } });
    if (!per) (R.cyclesHT || []).forEach(function (c) { if (age >= c.from && age <= c.to) { per = c; hx = R.houTian.hex; } });
    if (!per) return { year: Y, age: age, none: true };
    var k = age - per.from + 1, startYear = y0 + per.from - 1, yangYear = startYear % 2 === 0;
    var a = annualHex(hx.lines, per.line, k, yangYear);
    return { year: Y, age: age, period: per, periodHex: hx, k: k, len: per.to - per.from + 1, yangStart: yangYear,
      hex: a.hex, moved: a.moved, changed: a.changed,
      months: [1,2,3,4,5,6,7,8,9,10,11,12].map(function (i) { var mo = monthlyHex(a.hex.lines, i); return { index: i, line: mo.line, hex: mo.hex, changed: mo.changed }; }) };
  }
  // Month starts inside Heluo year Y (Beijing-naive Dates = instants; the UI converts them to true solar time):
  // the 12 中氣 from the Winter Solstice of Y-1 (month 1) to 小雪 of Y (month 12); then { end: Winter Solstice of Y }.
  function monthStarts(Y) {
    var t = root.Lunar.fromYmd(Y, 1, 1).getJieQiTable();
    function d(so) { return new Date(Date.UTC(so.getYear(), so.getMonth() - 1, so.getDay(), so.getHour(), so.getMinute(), so.getSecond())); }
    var out = QI.map(function (n, i) { return { index: i + 1, start: d(t[n]) }; });
    out.push({ end: d(t['DONG_ZHI']) });
    return out;
  }

  // p = { stems:[y,m,d,h], branches:[y,m,d,h] } (0-based, Heluo year pillar)
  // o = { male, year (Gregorian year of the Heluo year pillar), yangDun, season 0..3 }
  function natal(p, o) {
    var odd = [], even = [], i;
    for (i = 0; i < 4; i++) {
      var sn = NAJIA_N[p.stems[i]];
      (sn % 2 ? odd : even).push(sn);
      odd.push(HETU[p.branches[i]][0]); even.push(HETU[p.branches[i]][1]);
    }
    var H = odd.reduce(function (a, b) { return a + b; }, 0);
    var E = even.reduce(function (a, b) { return a + b; }, 0);
    var hT = heavenTrigram(H), five = false;
    if (!hT) { hT = fiveTrigram(o.year, o.male); five = true; }
    var eT = earthTrigram(E);
    var heavenUp = o.male ? o.year % 2 === 0 : o.year % 2 !== 0;
    var xt = heavenUp ? hexFrom(hT, eT) : hexFrom(eT, hT);
    var hourBr = p.branches[3], monthBr = p.branches[1];
    var mv = movingLine(xt.lines, hourBr, o.male, o.yangDun);
    var ht = mv.line ? houTian(xt, mv.line, monthBr) : null;
    var cyXT = mv.line ? cycles(xt.lines, mv.line, 1) : [];
    var endXT = cyXT.length ? cyXT[5].to : 0;
    var cyHT = ht ? cycles(ht.hex.lines, ht.line, endXT + 1) : [];
    var yearTri = { heaven: NAJIA[p.stems[0]], earth: BR_TRI[p.branches[0]] };
    var fame = ['Kan','Zhen','Li','Dui'][o.season];
    var avg = MONTH_AVG[monthBr];
    return {
      numbers: { heaven: H, earth: E, odd: odd, even: even, total: H + E,
        devHeaven: H - 25, devEarth: E - 30, monthAvg: { month: MONTH_NAME[monthBr], yang: avg[0], yin: avg[1] } },
      heavenTrigram: hT, earthTrigram: eT, five: five, fiveCycle: five ? ['Upper','Middle','Lower'][fiveCycle(o.year)] : null, heavenUp: heavenUp,
      xianTian: xt, moving: mv, houTian: ht,
      cyclesXT: cyXT, cyclesHT: cyHT,
      huXT: huGua(xt.lines), huHT: ht ? huGua(ht.hex.lines) : null,
      luck: { heaven: yearTri.heaven, earth: yearTri.earth, fame: fame,
        opposite: { heaven: oppTri(yearTri.heaven), earth: oppTri(yearTri.earth), fame: oppTri(fame) } },
      oppositeXT: opposite(xt.lines), inverseXT: inverse(xt.lines),
      oppositeHT: ht ? opposite(ht.hex.lines) : null, inverseHT: ht ? inverse(ht.hex.lines) : null,
      positionXT: mv.line ? properPosition(xt.lines, mv.line) : null,
      supportXT: mv.line ? properSupport(xt.lines, mv.line) : null,
      positionHT: ht ? properPosition(ht.hex.lines, ht.line) : null,
      supportHT: ht ? properSupport(ht.hex.lines, ht.line) : null,
      prevailingXT: prevailing(xt.lines), prevailingHT: ht ? prevailing(ht.hex.lines) : null
    };
  }

  // ── Birth → Heluo inputs ─────────────────────────────────────────────────
  // Solstices / equinoxes of Gregorian year Y as Beijing-naive Date (lunar-javascript is Beijing-based).
  var _sCache = {};
  function seasonTerms(Y) {
    if (_sCache[Y]) return _sCache[Y];
    var L = root.Lunar, t = L.fromYmd(Y, 1, 1).getJieQiTable();
    function d(so) { return new Date(Date.UTC(so.getYear(), so.getMonth() - 1, so.getDay(), so.getHour(), so.getMinute(), so.getSecond())); }
    var r = { SE: d(t['春分']), SS: d(t['夏至']), AE: d(t['秋分']), WS: d(t['DONG_ZHI']) };
    return (_sCache[Y] = r);
  }
  // P = XKDGSolarTime.pillarsFromCivil(...) result
  function fromPillars(P, male) {
    var bj = P.meta.beijing;
    var t = new Date(Date.UTC(bj.y, bj.mo - 1, bj.d, bj.h, bj.mi, bj.s || 0));
    var S = seasonTerms(bj.y);
    var year = t >= S.WS ? bj.y + 1 : bj.y;              // Heluo year starts at the Winter Solstice
    var season = t >= S.WS ? 0 : t >= S.AE ? 3 : t >= S.SS ? 2 : t >= S.SE ? 1 : 0;
    var ys = ((year - 4) % 10 + 10) % 10, yb = ((year - 4) % 12 + 12) % 12;
    var p = {
      stems: [ys, STEMS.indexOf(P.month.charAt(0)), STEMS.indexOf(P.day.charAt(0)), STEMS.indexOf(P.hour.charAt(0))],
      branches: [yb, BRANCHES.indexOf(P.month.charAt(1)), BRANCHES.indexOf(P.day.charAt(1)), BRANCHES.indexOf(P.hour.charAt(1))]
    };
    var o = { male: !!male, year: year, yangDun: season <= 1, season: season };
    var r = natal(p, o);
    r.input = { p: p, o: o, solarYearPillar: P.year, heluoYearPillar: STEMS[ys] + BRANCHES[yb], tst: P.meta.tst, Pn: P };
    return r;
  }
  // Heluo year (= its Gregorian year number) of a given moment (now by default)
  function heluoYearOf(date) {
    var dt = date || new Date();
    var bj = new Date(dt.getTime() + 8 * 3600000), Y = bj.getUTCFullYear();
    return bj >= seasonTerms(Y).WS ? Y + 1 : Y;
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function hexName(n) { try { if (n === 1) return 'Qian'; return (typeof HEX_NAMES !== 'undefined' && HEX_NAMES[n]) || ''; } catch (e) { return ''; } }
  function triLbl(t) { return t; }
  // 6 lines, bottom-up; mv = moving line (red dot)
  function hexSvg(lines, mv, w) {
    w = w || 54; var lh = 6, gap = 5, h = 6 * lh + 5 * gap, s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="display:block;">';
    for (var i = 0; i < 6; i++) {
      var y = (5 - i) * (lh + gap), col = (mv === i + 1) ? '#c62828' : '#222';
      var pad = 8, bw = w - 2 * pad;
      if (lines[i]) s += '<rect x="' + pad + '" y="' + y + '" width="' + bw + '" height="' + lh + '" fill="' + col + '"/>';
      else s += '<rect x="' + pad + '" y="' + y + '" width="' + (bw * 0.43) + '" height="' + lh + '" fill="' + col + '"/><rect x="' + (pad + bw * 0.57) + '" y="' + y + '" width="' + (bw * 0.43) + '" height="' + lh + '" fill="' + col + '"/>';
      if (mv === i + 1) s += '<circle cx="3" cy="' + (y + lh / 2) + '" r="2.6" fill="#c62828"/>';
    }
    return s + '</svg>';
  }
  function hexCard(title, hx, mv, extra, mvLbl) {
    return '<div style="border:1px solid #d1c4e9;border-radius:8px;padding:8px;min-width:260px;flex:1;">'
      + '<div style="font-size:11px;color:#777;margin-bottom:4px;">' + title + '</div>'
      + '<div style="display:flex;gap:10px;align-items:center;">' + hexSvg(hx.lines, mv)
      + '<div style="font-size:12px;line-height:1.5;"><b style="font-size:15px;">' + hx.n + '</b> ' + esc(hexName(hx.n))
      + '<br>' + triLbl(hx.upper) + '<br>' + triLbl(hx.lower) + (mv ? '<br><span style="color:#c62828;">' + (mvLbl || 'Moving line') + ' ' + mv + '</span>' : '') + '</div></div>'
      + (extra || '') + '</div>';
  }
  // ── Period of each line (Edu, 10/11/2026): ages in the natives; months in the annual; 5-day blocks in the monthly;
  // in the block hexagram the Lord of the Block (5 days) and one day per other line; the changed line in the day hexagram.
  // Annual: line k rules months 2k-1 and 2k (from the 中氣, monthlyHex). All dates in TRUE SOLAR TIME.
  var DAY = 86400000;
  function dayMs(dt) { return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()); }
  function fmtR(a, b) { var A = new Date(a), B = new Date(b); if (a === b) return fmtD(A);
    return A.getUTCMonth() === B.getUTCMonth() ? A.getUTCDate() + '–' + fmtD(B) : fmtD(A) + '–' + fmtD(B); }
  function msTST(Y, lon) {
    var ST_ = root.XKDGSolarTime;
    function bj2tst(dt) { if (!dt) return dt; var t = ST_.convert(dt.getTime() - 8 * 3600000, lon).tst; return new Date(Date.UTC(t.y, t.mo - 1, t.d, t.h, t.mi, t.s)); }
    return monthStarts(Y).map(function (m) { return { index: m.index, start: bj2tst(m.start), end: bj2tst(m.end) }; });
  }
  // ms = msTST(Y, lon): line k = months 2k-1 and 2k (the day of a 中氣 belongs to the month it opens)
  function annualPeriods(ms) {
    var span = {}, cap = {};
    for (var k = 1; k <= 6; k++) {
      var s = dayMs(ms[2 * k - 2].start), e = dayMs(ms[2 * k].start || ms[2 * k].end) - DAY;
      span[k] = fmtR(s, e); cap[k] = 'months ' + (2 * k - 1) + '–' + (2 * k) + ' · ' + fmtR(s, e);
    }
    return { span: span, cap: cap };
  }
  function monthPeriods(d0, startDay, endDay) { // 5 days per line from the day of the 中氣
    var span = {}, cap = {};
    for (var k = 0; d0 + k * 5 * DAY < endDay; k++) {
      var L = k % 6 + 1, s = Math.max(d0 + k * 5 * DAY, startDay), e = Math.min(d0 + (k + 1) * 5 * DAY, endDay) - DAY; if (e < s) continue;
      span[L] = span[L] ? span[L] + ', ' + fmtD(new Date(s)) : fmtR(s, e); cap[L] = (cap[L] ? cap[L] + ', ' : 'days ') + fmtR(s, e);
    }
    return { span: span, cap: cap };
  }
  function blockPeriods(lord, bS, startDay, endDay) {
    var s = Math.max(bS, startDay), e = Math.min(bS + 5 * DAY, endDay) - DAY, span = {}, cap = {};
    span[lord] = fmtR(s, e); cap[lord] = 'Lord of the Block · ' + fmtR(s, e);
    for (var j = 0; j < 5; j++) { var q = bS + j * DAY; if (q >= startDay && q < endDay) { var L = wrap6(lord + 1 + j); span[L] = fmtD(new Date(q)); cap[L] = 'day ' + fmtD(new Date(q)); } }
    return { span: span, cap: cap };
  }
  function dayPeriods(line, q) { var o = { span: {}, cap: {} }; o.span[line] = fmtD(new Date(q)); o.cap[line] = 'day ' + fmtD(new Date(q)); return o; }
  // Card in Edu's format (9/11/2026): title on top, branches left (hidden spirit too), relation initial and ages right,
  // active line in red, below person, branch, element and relation of the active line.
  function fmtCard(title, hx, ln, cy, me, extra) {
    return '<div style="border:1px solid #d1c4e9;border-radius:8px;padding:6px;flex:1 1 150px;min-width:0;">'
      + '<div style="font-size:12px;font-weight:600;color:#4527a0;text-align:center;">' + title + '</div>'
      + cycleHexSvg(hx, ln, cy, me) + (extra || '') + '</div>';
  }
  function small(title, hx) {
    return '<div style="display:flex;gap:6px;align-items:center;font-size:12px;">' + hexSvg(hx.lines, 0, 34)
      + '<div><span style="color:#777;">' + title + '</span><br><b>' + hx.n + '</b> ' + esc(hexName(hx.n)) + '</div></div>';
  }
  function miniHex(lines) {
    var s = '<svg width="26" height="25" viewBox="0 0 26 25" style="display:block;">';
    for (var i = 0; i < 6; i++) { var y = (5 - i) * 4.4;
      s += lines[i] ? '<rect x="1" y="' + y + '" width="24" height="3" fill="#222"/>' : '<rect x="1" y="' + y + '" width="10.5" height="3" fill="#222"/><rect x="14.5" y="' + y + '" width="10.5" height="3" fill="#222"/>'; }
    return s + '</svg>';
  }
  function yn(b) { return b ? '<span style="color:#1b5e20;">yes</span>' : '<span style="color:#b71c1c;">no</span>'; }

  function savedPeople() {
    var all = {}; try { all = root.xkdgPersonsAll() || {}; } catch (e) {}
    return Object.keys(all).filter(function (k) { var p = all[k]; return p && p.date && p.time && (p.depth || 4) >= 4; }).sort().map(function (k) { return { name: k, rec: all[k] }; });
  }
  function genderGet(n) { try { return root.xkdgGenderGet ? root.xkdgGenderGet(n) : ''; } catch (e) { return ''; } }
  function genderSet(n, v) {
    try { var o = JSON.parse(localStorage.getItem('xkdg_person_gender') || '{}') || {}; if (v) o[n] = v; else delete o[n]; localStorage.setItem('xkdg_person_gender', JSON.stringify(o)); } catch (e) {}
  }

  function open() {
    var ov = $('hl-overlay');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'hl-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(20,8,30,.55);display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto;';
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.style.display = 'none'; });
      var F = 'padding:6px;border:1px solid #b39ddb;border-radius:5px;font-size:13px;', L = 'font-size:11px;color:#666;display:block;margin-bottom:2px;';
      var TB = 'padding:6px 12px;border:none;border-radius:6px 6px 0 0;font-size:13px;cursor:pointer;background:#f3eefc;color:#4527a0;';
      ov.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:720px;width:100%;padding:16px;box-shadow:0 12px 44px rgba(0,0,0,.32);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-size:16px;font-weight:bold;color:#5e35b1;">☯ He Luo Li Shu 河洛理數</div>'
        + '<button onclick="document.getElementById(\'hl-overlay\').style.display=\'none\'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1;">✕</button></div>'
        + '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px;">'
        + '<div><label style="' + L + '">Person</label><select id="hl-p" onchange="xkdgHLPerson()" style="' + F + 'max-width:170px;"></select></div>'
        + '<div><label style="' + L + '">Gender</label><select id="hl-g" onchange="xkdgHLGender()" style="' + F + '"><option value="">—</option><option value="M">Man</option><option value="F">Woman</option></select></div>'
        + '</div><div style="display:flex;gap:4px;border-bottom:2px solid #d1c4e9;margin:4px 0 8px;">'
        + '<button id="hl-tab-chart" onclick="xkdgHLTab(\'chart\')" style="' + TB + '">Chart &amp; reading</button>'
        + '<button id="hl-tab-ds" onclick="xkdgHLTab(\'ds\')" style="' + TB + '">Date Selection</button></div>'
        + '<div id="hl-out"></div><div id="hl-ds" style="display:none;"></div>'
        + '<div style="font-size:10px;color:#999;margin-top:10px;line-height:1.5;">Year pillar from the Winter Solstice; month, day and hour in true solar time at the birth place. Texts: He Luo Li Shu translations by Edu (64 hexagrams and 384 lines).</div></div>';
      document.body.appendChild(ov);
    }
    var list = savedPeople(), sel = $('hl-p'), cur = sel.value;
    var mainA = (($('person-name') || {}).value || '').trim(), hasMainA = !!(($('person-date') || {}).value && ($('person-time') || {}).value);
    sel.innerHTML = (hasMainA ? '<option value="__A">Person A' + (mainA ? ' · ' + esc(mainA) : '') + '</option>' : '<option value="">—</option>')
      + list.map(function (x) { return '<option value="' + esc(x.name) + '">' + esc(x.name) + '</option>'; }).join('');
    if (cur) { sel.value = cur; if (sel.selectedIndex < 0) sel.selectedIndex = 0; }
    ov.style.display = 'flex';
    loadTexts(); loadNajia(); loadDS();
    tabStyle();
    xkdgHLPerson();
  }
  function current() {
    var v = $('hl-p').value;
    if (!v) return null;
    if (v === '__A') {
      var nm = (($('person-name') || {}).value || '').trim(), date = $('person-date').value, time = $('person-time').value;
      var g = null; try { g = root._personBirthGeo('A'); } catch (e) {}
      var lon0 = parseFloat(($('longitude') || {}).value), utc0 = parseFloat(($('utc-offset') || {}).value) || 0;
      return { name: nm || 'Person A', date: date, time: time, lon: g ? g.lon : lon0, utc: g ? g.utc : utc0, dst: !!(g && g.dst) };
    }
    var x = savedPeople().filter(function (q) { return q.name === v; })[0]; if (!x) return null;
    var r = x.rec, lon1 = parseFloat(($('longitude') || {}).value), utc1 = parseFloat(($('utc-offset') || {}).value) || 0;
    return { name: v, date: r.date, time: r.time, lon: isFinite(r.birthLon) ? r.birthLon : lon1, utc: isFinite(r.birthUtc) ? r.birthUtc : utc1, dst: !!r.birthDst, noGeo: !isFinite(r.birthLon) };
  }
  root.xkdgHLPerson = function () { var c = current(); $('hl-g').value = c ? genderGet(c.name) : ''; render(); };
  root.xkdgHLGender = function () { var c = current(); if (c) genderSet(c.name, $('hl-g').value); render(); };

  function compute(c, male) {
    var d = String(c.date).split('-').map(Number), t = String(c.time || '12:00').split(':').map(Number);
    if (!isFinite(c.lon)) return null;
    var P = root.XKDGSolarTime.pillarsFromCivil(d[0], d[1], d[2], t[0] || 0, t[1] || 0, 0, c.lon, -((c.utc || 0) * 60 + (c.dst ? 60 : 0)));
    return P ? fromPillars(P, male) : null;
  }
  // Hexagram with ONE line in red: start age on the left, end age on the right of that line.
  // Cycle drawing (Edu, 9/11/2026): hexagram with the active line in red; left the Na Jia branch (and the hidden
  // spirit, if any), right the relation initial calculated on the PERSON (not the palace) and the age span of each line;
  // below: branch, element and relation of the active line.
  function personEl(hx, line) { // HLLS rule: one-element hexagram = that element; two elements = trigram of the line
    var u = TRI_EL[hx.upper], l = TRI_EL[hx.lower];
    return u === l ? u : (line <= 3 ? l : u);
  }
  function relL(me, el) { // B C W G P of element `el` for the person `me`
    return me === el ? 'B' : GEN_[me] === el ? 'C' : CTL_[me] === el ? 'W' : GEN_[el] === me ? 'P' : 'G';
  }
  function cycleHexSvg(hx, ln, cy, meOv) { // meOv: person of the period (annual, monthly, block, day hexagrams)
    var d = NJ() && NJ()[hx.n], me = meOv || personEl(hx, ln), lines = hx.lines;
    var W = 300, bx = 92, bw = 96, lh = 9, gap = 9, top = 8, H = top + 6 * lh + 5 * gap + (d ? (ln ? 44 : 10) : 8);
    var F = ' font-family="system-ui"', s = '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;margin:6px auto;max-width:' + W + 'px;">';
    // cy: the cycles (ages of each line) or { span: {line: label}, cap: {line: period} } for annual, monthly, block, day
    var span = {}, cap = '';
    if (Array.isArray(cy)) cy.forEach(function (c) { span[c.line] = c.from + '–' + c.to; if (c.line === ln) cap = 'age ' + c.from + '–' + c.to; });
    else if (cy) { span = cy.span || {}; cap = (cy.cap && cy.cap[ln]) || ''; }
    for (var i = 0; i < 6; i++) {
      var y = top + (5 - i) * (lh + gap), red = (i + 1 === ln), col = red ? '#c62828' : '#222', ty = y + lh - 0.5;
      if (lines[i]) s += '<rect x="' + bx + '" y="' + y + '" width="' + bw + '" height="' + lh + '" fill="' + col + '"/>';
      else s += '<rect x="' + bx + '" y="' + y + '" width="' + (bw * 0.43) + '" height="' + lh + '" fill="' + col + '"/><rect x="' + (bx + bw * 0.57) + '" y="' + y + '" width="' + (bw * 0.43) + '" height="' + lh + '" fill="' + col + '"/>';
      if (d) {
        var L = d.lines[i], fs = L.fushen ? '<tspan font-size="10" fill="#777">' + relL(me, L.fushen.el) + ' ' + L.fushen.branch + '</tspan> ' : '';
        s += '<text x="' + (bx - 8) + '" y="' + ty + '" text-anchor="end" font-size="13"' + F + ' fill="' + col + '">' + fs + L.branch + '</text>'
           + '<text x="' + (bx + bw + 8) + '" y="' + ty + '" font-size="13" font-weight="700"' + F + ' fill="' + col + '">' + relL(me, L.el)
           + (span[i + 1] ? ' <tspan font-size="10" font-weight="400">' + span[i + 1] + '</tspan>' : '') + '</text>';
      }
    }
    if (d && ln) {
      var A = d.lines[ln - 1];
      s += '<text x="' + (W / 2) + '" y="' + (H - 24) + '" text-anchor="middle" font-size="12" font-weight="600"' + F + ' fill="#c62828">Line ' + ln + ': ' + A.branch + ' ' + A.el + ' · person ' + me + '</text>'
         + '<text x="' + (W / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11"' + F + ' fill="#555">' + REL[relL(me, A.el)] + (cap ? ' · ' + esc(cap) : '') + '</text>';
    }
    return s + '</svg>';
  }
  var _cyc = {}, _cycN = 0;
  root.xkdgHLCycle = function (id) {
    var el = $(id); if (!el) return;
    el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
  };
  // ── Texts (session 43): Edu's "He Luo Li Shu - The 64 Hexagrams and Age Readings" (heluo-texts.js,
  // loaded on first open, ~300 KB) ───────────────────────────────────────
  var _txtLoading = false;
  function TX() { return root.XKDG_HELUO_TEXTS || null; }
  function loadTexts() {
    if (TX() || _txtLoading) return; _txtLoading = true;
    var sc = document.createElement('script'); sc.src = 'heluo-texts.js';
    sc.onload = function () { try { if ($('hl-overlay') && $('hl-overlay').style.display !== 'none') render(); } catch (e) {} };
    sc.onerror = function () { _txtLoading = false; };
    document.head.appendChild(sc);
  }
  // Na Jia (heluo-najia.js, session 47): branch, element, six relations, Shi/Ying and hidden spirit of every line.
  var _njLoading = false;
  function NJ() { return root.HeluoNaJia || null; }
  function loadNajia() {
    if (NJ() || _njLoading) return; _njLoading = true;
    var sc = document.createElement('script'); sc.src = 'heluo-najia.js';
    sc.onload = function () { try { if ($('hl-overlay') && $('hl-overlay').style.display !== 'none') render(); } catch (e) {} };
    sc.onerror = function () { _njLoading = false; };
    document.head.appendChild(sc);
  }
  // Date Selection + cycle reading (heluo-ds.js with its text scores heluo-scores.js, 10/11/2026)
  var _dsLoading = false, _tab = 'chart', _chart = null;
  function loadDS() {
    if ((root.XKDGHeluoDS && root.XKDG_HELUO_SCORES && root.XKDGHeluoNatal && root.XKDG_HELUO_READINGS) || _dsLoading) return; _dsLoading = true;
    // + natal reading with analysis (heluo-natal.js) and its strong/weak line readings (heluo-readings.js), 11/11/2026
    var F = ['heluo-scores.js', 'heluo-ds.js', 'heluo-readings.js', 'heluo-natal.js'];
    var n = 0, done = function () { if (++n < F.length) return; try { if ($('hl-overlay') && $('hl-overlay').style.display !== 'none') render(); } catch (e) {} };
    F.forEach(function (f) {
      var sc = document.createElement('script'); sc.src = f; sc.onload = done; sc.onerror = function () { _dsLoading = false; }; document.head.appendChild(sc);
    });
  }
  function tabStyle() {
    ['chart', 'ds'].forEach(function (t) { var b = $('hl-tab-' + t); if (b) { b.style.background = t === _tab ? '#5e35b1' : '#f3eefc'; b.style.color = t === _tab ? '#fff' : '#4527a0'; } });
    if ($('hl-out')) $('hl-out').style.display = _tab === 'chart' ? '' : 'none';
    if ($('hl-ds')) $('hl-ds').style.display = _tab === 'ds' ? '' : 'none';
  }
  root.xkdgHLTab = function (t) { _tab = t; tabStyle(); render(); };
  // Opened from the XKDG Date Selection (Edu, 11/11/2026: A and B inside XKDG). o.tab = 'chart' (natal reading) or 'ds';
  // o.ds = { purpose, from, to } (ISO dates) pre-fills the He Luo Date Selection and runs it, for the same days as the XKDG scan.
  var _dsPreset = null;
  root.openHeluoLishuFor = function (o) {
    o = o || {}; _dsPreset = o.ds || null; _tab = o.tab === 'ds' ? 'ds' : 'chart';
    open();
    var sel = $('hl-p'); if (sel && sel.querySelector('option[value="__A"]') && sel.value !== '__A') { sel.value = '__A'; root.xkdgHLPerson(); }
    tabStyle(); render();
  };
  function renderDS() {
    var box = $('hl-ds'); if (!box || _tab !== 'ds') return;
    if (!root.XKDGHeluoDS || !root.XKDG_HELUO_SCORES || !NJ()) { box.innerHTML = '<div style="font-size:12px;color:#999;">Loading…</div>'; return; }
    if (_dsPreset && root.xkdgHLDSPreset) { root.xkdgHLDSPreset(_dsPreset); _dsPreset = null; }
    root.XKDGHeluoDS.render(box, _chart);
  }
  var REL = { B: 'Brothers', C: 'Children', W: 'Wealth', G: 'Ghost', P: 'Parent' };
  var REL_CN = { B: '兄弟', C: '子孫', W: '妻財', G: '官鬼', P: '父母' };
  var EL_CN = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
  // Six lines of a hexagram (top to bottom): Na Jia branch, relation, Shi/Ying; tap a line for its text.
  // Relations are calculated on the person's element (Edu, 9/11/2026); the palace relation stays in small grey when it differs.
  function linesTable(hx, mv, label, me) {
    var d = NJ() && NJ()[hx.n];
    if (!d) return NJ() ? '' : '<div style="font-size:11px;color:#999;margin-top:5px;">Loading lines…</div>';
    var TD = 'padding:3px 5px;', h = '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:12px;color:#4527a0;font-weight:600;">☰ ' + (label || 'Six lines · branch and relations') + '</summary>'
      + '<div style="font-size:11px;color:#555;margin:4px 0;">' + (me ? 'Relations on the person: <b>' + EL_CN[me] + ' ' + me + '</b> · ' : '') + 'Palace ' + d.palaceCn + ' ' + d.palace + ' (' + EL_CN[d.palaceEl] + ' ' + d.palaceEl + ') · Shi line ' + d.shi + ' · Ying line ' + d.ying + ' · tap a line for its text</div>'
      + '<table style="border-collapse:collapse;font-size:12px;width:100%;">';
    for (var i = 5; i >= 0; i--) {
      var L = d.lines[i], l = i + 1, id = 'hl-ln-' + (++_cycN), sy = l === d.shi ? 'Shi 世' : l === d.ying ? 'Ying 應' : '';
      var r = me ? relL(me, L.el) : L.rel, fr = L.fushen ? (me ? relL(me, L.fushen.el) : L.fushen.rel) : null;
      h += '<tr onclick="xkdgHLCycle(\'' + id + '\')" style="cursor:pointer;border-top:1px solid #eee;' + (l === mv ? 'background:#ffebee;' : '') + '">'
        + '<td style="' + TD + 'white-space:nowrap;">' + l + (l === mv ? ' <span style="color:#c62828;">●</span>' : '') + '</td>'
        + '<td style="' + TD + '">' + miniLine(L.yang) + '</td>'
        + '<td style="' + TD + 'white-space:nowrap;"><b>' + L.branch + '</b> ' + EL_CN[L.el] + ' ' + L.el + '</td>'
        + '<td style="' + TD + '">' + REL_CN[r] + ' ' + REL[r] + (me && r !== L.rel ? '<div style="font-size:10px;color:#999;">palace: ' + L.relCn + ' ' + REL[L.rel] + '</div>' : '')
        + (L.fushen ? '<div style="font-size:10px;color:#777;">hidden ' + L.fushen.branch + ' ' + EL_CN[L.fushen.el] + ' ' + REL_CN[fr] + ' ' + REL[fr] + '</div>' : '') + '</td>'
        + '<td style="' + TD + 'color:#6a1b9a;white-space:nowrap;">' + sy + '</td></tr>'
        + '<tr id="' + id + '" style="display:none;"><td colspan="5" style="padding:2px 6px 8px;">' + (lineBody(hx.n, l, true) || '') + '</td></tr>';
    }
    return h + '</table></details>';
  }
  function najiaLine(n, l, me) { // one-line Na Jia summary of line l of hexagram n (relations on the person when given)
    var d = NJ() && NJ()[n], L = d && d.lines[l - 1]; if (!L) return '';
    var r = me ? relL(me, L.el) : L.rel, fr = L.fushen ? (me ? relL(me, L.fushen.el) : L.fushen.rel) : null;
    return '<div style="font-size:11px;color:#6a1b9a;margin:3px 0;">Line ' + l + ': <b>' + L.branch + '</b> ' + EL_CN[L.el] + ' ' + L.el + ' · ' + REL_CN[r] + ' ' + REL[r] + (me ? ' (person ' + me + ')' : '')
      + (l === d.shi ? ' · Shi 世' : l === d.ying ? ' · Ying 應' : '') + (L.fushen ? ' · hidden ' + L.fushen.branch + ' ' + REL_CN[fr] + ' ' + REL[fr] : '') + '</div>';
  }
  function miniLine(yang) {
    return '<svg width="26" height="6" viewBox="0 0 26 6" style="display:block;">' + (yang ? '<rect x="1" y="1" width="24" height="4" fill="#222"/>'
      : '<rect x="1" y="1" width="10.5" height="4" fill="#222"/><rect x="14.5" y="1" width="10.5" height="4" fill="#222"/>') + '</svg>';
  }
  var P_ = 'font-size:12px;color:#333;line-height:1.55;margin:4px 0;';
  function hexText(n, label) {
    var t = TX() && TX()[n];
    if (!t) return TX() ? '' : '<div style="font-size:11px;color:#999;margin-top:5px;">Loading texts…</div>';
    return '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:12px;color:#4527a0;font-weight:600;">📖 ' + (label || (n + ' ' + esc(t.title))) + '</summary>'
      + '<div style="' + P_ + '"><b>' + n + ' ' + esc(t.title) + '</b></div>'
      + '<div style="' + P_ + '"><b>Judgment:</b> <i>' + esc(t.judgment) + '</i></div>'
      + '<div style="' + P_ + '"><b>He Luo poem:</b> ' + esc(t.poem) + '</div>'
      + '<div style="' + P_ + '"><b>Meaning in destiny:</b> ' + esc(t.destiny) + '</div></details>';
  }
  function lineBody(n, l, noReading) {
    var t = TX() && TX()[n], L = t && t.lines && t.lines[l];
    if (!L) return TX() ? '' : '<div style="font-size:11px;color:#999;">Loading texts…</div>';
    return '<div style="' + P_ + '"><b>' + n + ' · line ' + l + ' · ' + esc(L.label) + '</b></div>'
      + '<div style="' + P_ + '"><i>' + esc(L.statement) + '</i></div>'
      + (L.poem ? '<div style="' + P_ + '">' + esc(L.poem) + '</div>' : '')
      + (!noReading && L.reading ? '<div style="' + P_ + '"><b>Reading for this age:</b> ' + esc(L.reading) + '</div>' : '');
  }
  function lineText(n, l, label, noReading) {
    var b = lineBody(n, l, noReading); if (!b) return '';
    return '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:12px;color:#4527a0;font-weight:600;">📖 ' + label + '</summary>' + b + '</details>';
  }
  function cycleTable(title, cy, y0, nowAge, hx) {
    var TD = 'padding:4px 6px;';
    var h = '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:8px 0 3px;">' + title + '</div><table style="border-collapse:collapse;font-size:12px;width:100%;">'
      + '<tr style="color:#777;text-align:left;"><th style="' + TD + '">Line</th><th style="' + TD + '"></th><th style="' + TD + '">Age</th><th style="' + TD + '">Years (Winter Solstice → Winter Solstice)</th></tr>';
    cy.forEach(function (c) {
      var on = nowAge >= c.from && nowAge <= c.to, id = 'hl-cy-' + (++_cycN);
      h += '<tr onclick="xkdgHLCycle(\'' + id + '\')" style="cursor:pointer;' + (on ? 'background:#fff3e0;font-weight:600;' : '') + 'border-top:2px solid #b39ddb;"><td style="' + TD + '">' + c.line + '</td><td style="' + TD + '">' + (c.yang ? 'yang · 9' : 'yin · 6') + '</td>'
        + '<td style="' + TD + '">' + c.from + '–' + c.to + '</td><td style="' + TD + '">Dec ' + (y0 + c.from - 2) + ' → Dec ' + (y0 + c.to - 1) + (on ? ' ◀ now' : '') + '</td></tr>'
        + '<tr id="' + id + '" style="display:none;"><td colspan="4" style="padding:2px 6px 8px;">' + cycleHexSvg(hx, c.line, cy)
        + '<div style="text-align:center;font-size:11px;color:#555;">' + hx.n + ' ' + esc(hexName(hx.n)) + ' · line ' + c.line + ' · age ' + c.from + '–' + c.to + '</div>' + lineBody(hx.n, c.line) + '</td></tr>';
    });
    return h + '</table>';
  }
  // Annual + monthly section (phase 2). _hlY = Heluo year shown (null = the current one).
  var _hlY = null, _hlLon = NaN; // _hlLon: longitude of the person shown (fallback when there is no GPS)
  root.xkdgHLYear = function (d) { _hlY = d === 0 ? null : (_hlY || heluoYearOf()) + d; render(); };
  function fmtD(dt) { return dt.getUTCDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getUTCMonth()]; }
  function annualSection(R) {
    var Y = _hlY || heluoYearOf(), a = annual(R, Y), B = 'padding:3px 9px;border:1px solid #b39ddb;border-radius:5px;background:#fff;cursor:pointer;font-size:12px;';
    var h = '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:12px 0 4px;">Annual and monthly hexagrams</div>'
      + '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;font-size:12px;"><button style="' + B + '" onclick="xkdgHLYear(-1)">◀</button>'
      + '<b>Heluo year ' + Y + '</b> <span style="color:#777;">(Winter Solstice ' + (Y - 1) + ' → ' + Y + ')</span>'
      + '<button style="' + B + '" onclick="xkdgHLYear(1)">▶</button>' + (_hlY ? '<button style="' + B + '" onclick="xkdgHLYear(0)">now</button>' : '') + '</div>';
    if (a.none) return h + '<div style="font-size:12px;color:#888;">Age ' + a.age + ': outside the Xian Tian / Hou Tian cycles.</div>';
    var per = a.period, isXT = a.periodHex === R.xianTian, me = personEl(a.periodHex, per.line);
    var lonA = NaN; try { lonA = root.XKDGSolarTime.currentLonTz().lonDeg; } catch (e) {} if (!isFinite(lonA)) lonA = _hlLon;
    var aPer = null; try { aPer = annualPeriods(msTST(Y, lonA)); } catch (e) {}
    h += '<div style="font-size:12px;color:#333;line-height:1.6;margin-bottom:6px;">Age <b>' + a.age + '</b> · ' + (isXT ? 'Xian Tian' : 'Hou Tian') + ' ' + a.periodHex.n
      + ' line ' + per.line + ' (' + (per.yang ? 'yang · 9' : 'yin · 6') + ', age ' + per.from + '–' + per.to + ') · year <b>' + a.k + '</b> of ' + a.len
      + ' · person <b>' + me + '</b>' + (per.yang && a.k === 1 && a.yangStart ? '<br><span style="color:#6a1b9a;">Period starting in a yang year: the first year keeps the hexagram unchanged.</span>' : '') + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + fmtCard('Annual ' + Y + ' · ' + a.hex.n + ' ' + esc(hexName(a.hex.n)) + ' · age ' + a.age + ' · moved line ' + a.moved, a.hex, a.moved, aPer, me,
          (oppInvTag(R, a.hex).length ? '<div style="font-size:11px;color:#b71c1c;margin-top:5px;">✗ Unauspicious: ' + oppInvTag(R, a.hex).join(', ') + '</div>' : '')
          + '<div style="font-size:11px;color:#555;margin-top:5px;">Changed from ' + a.periodHex.n + ': ' + (a.changed.length ? 'lines ' + a.changed.join(', ') : 'none') + '</div>'
          + hexText(a.hex.n) + lineText(a.hex.n, a.moved, 'Line ' + a.moved + ' (moved this year)')) + '</div>';
    // Edu: ALWAYS true solar time. Month starts and the days of the month are counted in the TRUE SOLAR TIME of the
    // current place (GPS longitude; the person's birth place if no GPS), never in Beijing dates.
    var ST_ = root.XKDGSolarTime, lonT = NaN; try { lonT = ST_.currentLonTz().lonDeg; } catch (e) {}
    if (!isFinite(lonT)) lonT = _hlLon;
    function tstOf(utcMs) { var t = ST_.convert(utcMs, lonT).tst; return new Date(Date.UTC(t.y, t.mo - 1, t.d, t.h, t.mi, t.s)); }
    function bj2tst(dt) { return dt ? tstOf(dt.getTime() - 8 * 3600000) : dt; }
    var ms; try { ms = monthStarts(Y).map(function (m) { return { index: m.index, start: bj2tst(m.start), end: bj2tst(m.end) }; }); } catch (e) { ms = null; }
    var now = tstOf(Date.now()), TD = 'padding:3px 6px;', D = 86400000;
    var tb = '<table style="border-collapse:collapse;font-size:12px;width:100%;margin-top:8px;"><tr style="color:#777;text-align:left;"><th style="' + TD + '">Month</th><th style="' + TD + '">From</th><th style="' + TD + '">Line</th><th style="' + TD + '"></th><th style="' + TD + '">Hexagram</th></tr>';
    var today = '';
    // Months of the Heluo year (Edu, 10/11/2026): 12 whole months from the 中氣, month 1 from the Winter Solstice.
    for (var i = 0; i < 12; i++) {
      var mo = a.months[i], from = ms ? ms[i].start : null, to = ms ? (ms[i + 1].start || ms[i + 1].end) : null, on = from && now >= from && now < to;
      var id = 'hl-mo-' + (++_cycN), blocks = '', mPer = null;
      if (from) {
        // Daily hexagrams (Edu, 10/11/2026, Lord of the Block): 5 days per line of the monthly hexagram from the day of
        // the 中氣 (days 1-5 line 1 … 26-30 line 6, day 31 line 1 again); that line changes on the monthly -> block
        // hexagram; each day changes one of the other lines on it (dailyHex). The day of the next 中氣 opens the next month.
        var d0 = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()), startDay = d0;
        var endDay = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
        var nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        mPer = monthPeriods(d0, startDay, endDay);
        for (var k = 0; d0 + k * 5 * D < endDay; k++) {
          var bS = d0 + k * 5 * D, bE = Math.min(bS + 5 * D, endDay);
          var onB = nowDay >= bS && nowDay < bE, bk = dailyHex(mo.hex.lines, k * 5 + 1), seq = [];
          for (var q = bS; q < bE; q += D) {
            var dq = dailyHex(mo.hex.lines, (q - d0) / D + 1), isT = q === nowDay;
            seq.push('<span title="' + fmtD(new Date(q)) + ': line ' + dq.line + '"' + (isT ? ' style="color:#e65100;text-decoration:underline;"' : '') + '>' + dq.hex.n + '</span>');
          }
          blocks += '<tr style="' + (onB ? 'background:#fff3e0;font-weight:600;' : '') + '"><td style="padding:2px 6px;white-space:nowrap;">' + fmtR(bS, bE - D) + '</td><td style="padding:2px 6px;white-space:nowrap;">Lord l' + bk.lord + ' → <b>' + bk.block.n + '</b>' + (onB ? ' ◀ today' : '') + '</td><td style="padding:2px 6px;">days: ' + seq.join(' · ') + '</td></tr>';
          if (onB) {
            var dd = dailyHex(mo.hex.lines, (nowDay - d0) / D + 1);
            today = '<div style="font-size:12px;margin:8px 0 2px;padding:6px 8px;background:#fff3e0;border-radius:6px;"><b>Today</b>: month <b>' + mo.index + '</b> (' + QI_EN[i] + ', line ' + mo.line + ' of the annual) · monthly <b>' + mo.hex.n + '</b> ' + esc(hexName(mo.hex.n)) + ' · day ' + ((nowDay - d0) / D + 1) + ' of the month'
              + '<br>Block: Lord of the Block <b>line ' + dd.lord + '</b> → <b>' + dd.block.n + '</b> ' + esc(hexName(dd.block.n)) + ' (day ' + dd.dayInBlock + ' of 5)'
              + '<br>Day: <b>line ' + dd.line + '</b> → <b>' + dd.hex.n + '</b> ' + esc(hexName(dd.hex.n))
              + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">' + fmtCard('Monthly ' + mo.hex.n + ' · Lord line ' + dd.lord, mo.hex, dd.lord, mPer, me)
              + fmtCard('Block ' + dd.block.n + ' · day line ' + dd.line, dd.block, dd.line, blockPeriods(dd.lord, bS, startDay, endDay), me) + fmtCard('Day ' + dd.hex.n + ' · line ' + dd.line, dd.hex, dd.line, dayPeriods(dd.line, nowDay), me) + '</div>'
              + lineText(dd.block.n, dd.line, 'Primary (cause, action): line ' + dd.line + ' of ' + dd.block.n + ' (block)', true)
              + lineText(dd.hex.n, dd.line, 'Secondary (effect, outcome): line ' + dd.line + ' of ' + dd.hex.n + ' (day)', true)
              + lineText(dd.block.n, dd.lord, 'Line ' + dd.lord + ' of ' + dd.block.n + ' (Lord of the Block)', true) + '</div>';
          }
        }
      }
      tb += '<tr onclick="xkdgHLCycle(\'' + id + '\')" style="cursor:pointer;border-top:1px solid #eee;' + (on ? 'background:#fff3e0;font-weight:600;' : '') + '"><td style="' + TD + '">' + mo.index + ' · ' + QI_EN[i] + '</td>'
        + '<td style="' + TD + 'white-space:nowrap;">' + (from ? fmtD(from) : '') + (on ? ' ◀ now' : '') + '</td>'
        + '<td style="' + TD + 'white-space:nowrap;">l' + mo.line + (mo.changed.length > 1 ? ' + l' + mo.changed[1] : '') + '</td>'
        + '<td style="' + TD + '">' + miniHex(mo.hex.lines) + '</td><td style="' + TD + '"><b>' + mo.hex.n + '</b> ' + esc(hexName(mo.hex.n)) + '</td></tr>'
        + '<tr id="' + id + '" style="display:none;"><td colspan="5" style="padding:2px 6px 8px;">'
        + fmtCard('Monthly ' + mo.hex.n + ' ' + esc(hexName(mo.hex.n)) + ' · month ' + mo.index + ' · line ' + mo.line + ' of the annual', mo.hex, 0, mPer, me)
        + (blocks ? '<div style="font-size:11px;color:#777;margin:6px 0 2px;">Daily hexagrams: 5-day blocks (Lord of the Block → block hexagram), one line per day changes on it</div><table style="border-collapse:collapse;font-size:12px;">' + blocks + '</table>' : '')
        + hexText(mo.hex.n) + '</td></tr>';
    }
    return h + today + tb + '</table><div style="font-size:10px;color:#999;margin-top:4px;line-height:1.5;">Twelve whole months from the 中氣, month 1 from the Winter Solstice. Line k of the annual rules months 2k−1 and 2k: odd month = annual with line k changed, even month = also its correlate (1↔4, 2↔5, 3↔6). Dates and days of the month in true solar time (longitude ' + (Math.round(lonT * 100) / 100) + '°).</div>';
  }
  // ── Natal reading (session 47): Edu's slides "Heluo Lishu", from the general to the particular ──
  var EL_BR = ['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];
  var GEN_ = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
  var CTL_ = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };
  var YANG_TRI = { Qian:1, Zhen:1, Kan:1, Gen:1 };
  var LINE_CHAR = {
    1: 'line of new beginnings',
    2: 'protected line, in support position with the 5th',
    3: 'at the edge of the lower trigram, ready to enter the upper one: the risk-taker line, it needs support to succeed',
    4: 'line of the minister: close to the king but subject to his whims',
    5: 'line of the Emperor: yang, protected, watching everything from above, the best line',
    6: 'topmost line: very visible, easily isolated and exposed to attacks'
  };
  function relOf(me, other) { // what `other` element is for `me`
    if (me === other) return 'Companion'; if (GEN_[me] === other) return 'Output'; if (CTL_[me] === other) return 'Wealth';
    if (CTL_[other] === me) return 'Officer / Ghost'; return 'Resource';
  }
  function timeliness(tri, monthBr) { // 旺相休囚死 of the trigram element in the birth month
    var se = EL_BR[monthBr], e = TRI_EL[tri];
    if (e === se) return { k: 2, t: 'very timely (旺)' };
    if (GEN_[se] === e) return { k: 1, t: 'timely (相)' };
    if (GEN_[e] === se) return { k: 0, t: 'resting (休)' };
    if (CTL_[e] === se) return { k: -1, t: 'untimely, trapped (囚)' };
    return { k: -2, t: 'untimely, weak (死)' };
  }
  function flowTxt(lo, up) {
    var a = TRI_EL[lo], b = TRI_EL[up];
    if (a === b) return [1, 'one single element (' + a + '): unique qi'];
    if (GEN_[a] === b) return [1, 'lower ' + a + ' generates upper ' + b + ': good qi flow, the lower trigram nourishes the upper'];
    if (GEN_[b] === a) return [0, 'upper ' + b + ' generates lower ' + a + ': qi flows downward'];
    return [-1, (CTL_[a] === b ? 'lower ' + a + ' controls upper ' + b : 'upper ' + b + ' controls lower ' + a) + ': conflicting energy'];
  }
  function natalReading(R, male) {
    var N = R.numbers, p = R.input.p, mb = p.branches[1], avg = N.monthAvg, xt = R.xianTian, ht = R.houTian ? R.houTian.hex : null;
    var good = 0, bad = 0, out = [];
    function it(v, txt) { if (v > 0) good++; else if (v < 0) bad++;
      out.push('<li style="margin:3px 0;list-style:none;"><span style="display:inline-block;width:16px;color:' + (v > 0 ? '#1b5e20' : v < 0 ? '#b71c1c' : '#777') + ';">' + (v > 0 ? '✓' : v < 0 ? '✗' : '•') + '</span>' + txt + '</li>'); }
    function hd(t) { out.push('<li style="list-style:none;font-weight:600;color:#4527a0;margin:8px 0 2px;">' + t + '</li>'); }
    var pct = function (x) { return (x >= 0 ? '+' : '') + Math.round(x * 100) + '%'; };
    var yangMonth = mb >= 2 && mb <= 7;

    hd('1 · Yin / Yang proportion');
    var dH = N.devHeaven, dE = N.devEarth;
    it(0, 'Yang (Heaven) number <b>' + N.heaven + '</b>, balance 25 (' + (dH >= 0 ? '+' : '') + dH + ') · Yin (Earth) number <b>' + N.earth + '</b>, balance 30 (' + (dE >= 0 ? '+' : '') + dE + ').');
    if (Math.abs(dH - dE) <= 2) it(-1, 'Both numbers deviate almost equally from their balance: no yin-yang lead, confusion and lack of direction.');
    else it(1, 'Clear ' + (dH > dE ? 'yang' : 'yin') + ' lead over the balance numbers: a clear direction in life.');
    if (N.total > 78) it(-1, 'Total ' + N.total + ': too high compared with the balance 55.');
    else if (N.total >= 55) it(1, 'Total ' + N.total + ': similar to or above the balance 55, favourable.');
    else it(-1, 'Total ' + N.total + ': below the balance 55, low level of energy.');
    var leadOk = yangMonth ? N.heaven > N.earth : N.earth > N.heaven;
    it(leadOk ? 1 : -1, 'Born in a ' + (yangMonth ? 'yang' : 'yin') + ' month (' + BRANCHES[mb] + ' ' + BR_PY[mb] + '): the ' + (yangMonth ? 'yang' : 'yin') + ' number should be higher. '
      + (leadOk ? 'It is: auspicious.' : 'It is not: the dominant qi goes against the season.'));
    var rY = N.heaven / avg.yang - 1, rE = N.earth / avg.yin - 1;
    var lvl = function (r) { return Math.abs(r) <= 0.25 ? 0 : -1; };
    it(lvl(rY), 'Yang qi vs the ' + avg.month + ' average ' + avg.yang + ': ' + pct(rY) + (rY < -0.25 ? ' (underperforms)' : rY > 0.25 ? ' (overperforms, excess)' : ' (in line)') + '.');
    it(lvl(rE), 'Yin qi vs the ' + avg.month + ' average ' + avg.yin + ': ' + pct(rE) + (rE < -0.25 ? ' (underperforms)' : rE > 0.25 ? ' (overperforms, excess)' : ' (in line)') + '.');
    [['Xian Tian', xt], ['Hou Tian', ht]].forEach(function (g) {
      if (!g[1]) return; var ny = g[1].lines.reduce(function (a, b) { return a + b; }, 0), ni = 6 - ny, t = [];
      if (ny) t.push('each of the ' + ny + ' yang lines receives ' + (Math.round(N.heaven / ny * 10) / 10) + ' instead of ' + (Math.round(avg.yang / ny * 10) / 10));
      if (ni) t.push('each of the ' + ni + ' yin lines receives ' + (Math.round(N.earth / ni * 10) / 10) + ' instead of ' + (Math.round(avg.yin / ni * 10) / 10));
      it(0, g[0] + ' ' + g[1].n + ': ' + t.join('; ') + '. The effect shows when going through those lines.');
    });
    var tris = [xt.upper, xt.lower], hasY = tris.some(function (t) { return YANG_TRI[t]; }), hasI = tris.some(function (t) { return !YANG_TRI[t]; });
    if (rE > 0.25 && !hasI) it(-1, 'Yin qi is excessive but the Xian Tian has no yin trigram (Kun, Xun, Li, Dui): it cannot be expressed well; an annual or monthly hexagram can fill the gap.');
    if (rY > 0.25 && !hasY) it(-1, 'Yang qi is excessive but the Xian Tian has no yang trigram (Qian, Zhen, Kan, Gen): it cannot be expressed well; an annual or monthly hexagram can fill the gap.');
    if (rY < -0.25 && hasY) it(-1, 'Yang qi is too low: the yang trigram' + (tris.filter(function (t) { return YANG_TRI[t]; }).length > 1 ? 's' : '') + ' of the Xian Tian (' + tris.filter(function (t) { return YANG_TRI[t]; }).join(', ') + ') cannot function well and need to be generated.');
    if (rE < -0.25 && hasI) it(-1, 'Yin qi is too low: the yin trigram' + (tris.filter(function (t) { return !YANG_TRI[t]; }).length > 1 ? 's' : '') + ' of the Xian Tian (' + tris.filter(function (t) { return !YANG_TRI[t]; }).join(', ') + ') cannot function well and need to be generated.');
    var nyX = xt.lines.reduce(function (a, b) { return a + b; }, 0);
    if (nyX === 3) it(0, 'Xian Tian with 3 yang and 3 yin lines.');
    else it((male ? nyX > 3 : nyX < 3) ? 1 : -1, 'Xian Tian with ' + nyX + ' yang and ' + (6 - nyX) + ' yin lines: for a ' + (male ? 'man more yang' : 'woman more yin') + ' lines are best.');

    hd('2 · Moving line');
    [['Xian Tian', xt, R.moving.line, R.positionXT, R.supportXT, R.prevailingXT], ['Hou Tian', ht, ht && R.houTian.line, R.positionHT, R.supportHT, R.prevailingHT]].forEach(function (g) {
      if (!g[1] || !g[2]) return; var l = g[2], y = g[1].lines[l - 1], o = l <= 3 ? l + 3 : l - 3;
      it(g[3] ? 1 : -1, g[0] + ' line ' + l + ' (' + (y ? 'yang' : 'yin') + ') in a ' + (l % 2 ? 'yang' : 'yin') + ' position: ' + (g[3] ? 'proper position, auspicious.' : 'improper position.'));
      it(g[4] ? 1 : -1, 'Line ' + o + ' is ' + (g[1].lines[o - 1] ? 'yang' : 'yin') + ': ' + (g[4] ? 'proper support.' : 'no support (same polarity).'));
      it(l === 5 ? 1 : l === 2 ? 1 : l === 3 || l === 6 ? -1 : 0, 'Line ' + l + ': ' + LINE_CHAR[l] + '.');
      if (g[5]) { var yp = /pure yang|single yang/.test(g[5]), fit = yp === !!male;
        it(fit ? (g[3] ? 1 : 0) : -1, 'Prevailing hexagram (' + g[5] + '): ' + (fit ? 'favourable for a ' + (male ? 'man' : 'woman') + (g[3] ? ', moving line in proper position.' : ', but the moving line is not in proper position.') : 'it suits a ' + (male ? 'woman' : 'man') + ' more.')); }
    });

    hd('3 · Strength and relation of the trigrams');
    [['Xian Tian', xt], ['Hou Tian', ht]].forEach(function (g) {
      if (!g[1]) return; var u = timeliness(g[1].upper, mb), lo = timeliness(g[1].lower, mb), f = flowTxt(g[1].lower, g[1].upper);
      it(u.k > 0 ? 1 : u.k < 0 ? -1 : 0, g[0] + ' upper (external) ' + triLbl(g[1].upper) + ' ' + TRI_EL[g[1].upper] + ': ' + u.t + ' in ' + BRANCHES[mb] + ' month.');
      it(lo.k > 0 ? 1 : lo.k < 0 ? -1 : 0, g[0] + ' lower (internal) ' + triLbl(g[1].lower) + ' ' + TRI_EL[g[1].lower] + ': ' + lo.t + '.');
      it(f[0], g[0] + ': ' + f[1] + '.');
    });
    if (ht) it(0, 'From Xian Tian to Hou Tian what was external becomes internal and vice versa: it often marks a drastic change in life (age ' + R.cyclesHT[0].from + ').');

    hd('4 · Wu Xing: the person in the hexagram');
    if (TRI_EL[xt.upper] === TRI_EL[xt.lower]) {
      var me = TRI_EL[xt.upper], rel = ['Wood','Fire','Earth','Metal','Water'].filter(function (e) { return e !== me; }).map(function (e) { return e + ' = ' + relOf(me, e); });
      it(0, 'The Xian Tian has one element: the person is ' + me + '. ' + rel.join(', ') + '. Year branches will have an impact.');
    } else {
      var mt = R.moving.line <= 3 ? xt.lower : xt.upper, ot = R.moving.line <= 3 ? xt.upper : xt.lower, me2 = TRI_EL[mt];
      it(0, 'Two elements: the moving line represents the person. At birth (line ' + R.moving.line + ') the person is ' + me2 + ' (' + triLbl(mt) + '); the ' + (R.moving.line <= 3 ? 'upper' : 'lower') + ' trigram ' + triLbl(ot) + ' (' + TRI_EL[ot] + ') is the ' + relOf(me2, TRI_EL[ot]) + '. The focus moves with the cycles from one trigram to the other.');
    }

    hd('5 · The three Luck trigrams');
    var L = R.luck, natT = [xt.upper, xt.lower].concat(ht ? [ht.upper, ht.lower] : []), huT = [R.huXT.upper, R.huXT.lower].concat(R.huHT ? [R.huHT.upper, R.huHT.lower] : []);
    [['Heaven Luck (year stem)', 'heaven'], ['Earth Luck (year branch)', 'earth'], ['Fame Luck (season)', 'fame']].forEach(function (k) {
      var t = L[k[1]], tm = timeliness(t, mb), inN = natT.indexOf(t) >= 0, inH = huT.indexOf(t) >= 0, op = L.opposite[k[1]], opN = natT.indexOf(op) >= 0;
      it(inN || inH ? 1 : 0, k[0] + ' ' + triLbl(t) + ' (' + TRI_EL[t] + ', ' + tm.t + '): ' + (inN ? 'present in the native hexagrams, blessed' : inH ? 'present in the Hu Gua, blessed' : 'not in the native hexagrams or Hu Gua; it comes with the years, months and days that carry it') + '.');
      if (opN) it(-1, 'Its opposite ' + triLbl(op) + ' is part of the native hexagrams: like a clash, it can challenge or remove this luck; risk of inconsistency and contradiction.');
    });
    // Lines whose Na Jia branch carries a Luck trigram or its opposite (WWG, slides on Diana and Edu)
    if (NJ()) [['Xian Tian', xt], ['Hou Tian', ht]].forEach(function (g) {
      var d = g[1] && NJ()[g[1].n]; if (!d) return; var hits = [];
      d.lines.forEach(function (ln, i) { var t = BR_TRI[BRANCHES.indexOf(ln.branch)], v = 0, w = [];
        ['heaven','earth','fame'].forEach(function (k) { var K = k[0].toUpperCase() + k.slice(1);
          if (t === L[k]) { v++; w.push(K + ' Luck'); }
          if (t === L.opposite[k]) { v--; w.push('opposite of the ' + K + ' Luck'); } });
        if (w.length) hits.push([v, 'line ' + (i + 1) + ' ' + ln.branch + ' carries ' + triLbl(t) + ' = ' + w.join(' and ')]); });
      hits.forEach(function (h) { it(h[0], g[0] + ' ' + g[1].n + ': ' + h[1] + ' — ' + (h[0] > 0 ? 'its cycle years are favoured.' : h[0] < 0 ? 'its cycle years are challenged.' : 'mixed effect in its cycle years.')); });
    });
    it(0, 'Heaven Luck is yang, Earth Luck is yin: their effect depends on the yin/yang balance above (yang ' + pct(rY) + ', yin ' + pct(rE) + ') and on their timeliness.');

    hd('6 · Hu Gua, opposite and inverse');
    it(0, 'Hu Gua Xian Tian ' + R.huXT.n + ' ' + esc(hexName(R.huXT.n)) + (R.huHT ? ', Hou Tian ' + R.huHT.n + ' ' + esc(hexName(R.huHT.n)) : '') + ': inner aspects of the person and unexpected events.');
    var oi = function (o, v, h) { return 'opposite ' + o.n + ' ' + esc(hexName(o.n)) + (v.n !== h.n ? ', inverse ' + v.n + ' ' + esc(hexName(v.n)) : ' (no inverse: symmetric)'); };
    it(0, 'Xian Tian ' + oi(R.oppositeXT, R.inverseXT, xt) + (R.oppositeHT ? ' · Hou Tian ' + oi(R.oppositeHT, R.inverseHT, ht) : '') + ': obstacles on the path of life; the opposite is more evident, the inverse more deceptive. A year or month with these hexagrams is unauspicious.');

    return '<details open style="margin-top:12px;border:1px solid #d1c4e9;border-radius:8px;padding:8px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:#4527a0;">Natal reading · ' + good + ' favourable, ' + bad + ' unfavourable</summary>'
      + '<ul style="padding:0;margin:4px 0;font-size:12px;color:#333;line-height:1.5;">' + out.join('') + '</ul>'
      + '<div style="font-size:10px;color:#999;margin-top:4px;">Rules from the slides “Heluo Lishu”: first the natal chart, then the effect of the cycles.</div></details>';
  }
  // Natal reading with analysis (part A, Edu 11/11/2026): replaces the old ✓/✗ "Natal reading" and the "Cycle reading".
  // Yin/Yang balance at the top of the chart (Edu, 11/11/2026: "it does not tell me if I am balanced or not").
  // Same measure as the reading below and as the Cures: each number against the average of the birth month, in line within ±25%.
  function yyBalance(N) {
    var av = N.monthAvg, rY = N.heaven / av.yang - 1, rE = N.earth / av.yin - 1;
    function st(r) { return r > 0.25 ? 'in excess' : r < -0.25 ? 'deficient' : 'in line'; }
    function pc(r) { return (r >= 0 ? '+' : '−') + Math.abs(Math.round(r * 100)) + '%'; }
    function col(r) { return Math.abs(r) <= 0.25 ? '#2e7d32' : '#c62828'; }
    var needYang = rY < -0.25 || rE > 0.25, needYin = rE < -0.25 || rY > 0.25, v, ok = !needYang && !needYin;
    if (ok) v = 'Balanced: yin and yang are both in line. No cure needed.';
    else if (needYang && !needYin) v = 'Not balanced: ' + (rY < -0.25 ? 'yang is deficient' : 'yin is in excess') + (rY < -0.25 && rE > 0.25 ? ' and yin is in excess' : '') + '. The chart needs <b>yang</b>.';
    else if (needYin && !needYang) v = 'Not balanced: ' + (rE < -0.25 ? 'yin is deficient' : 'yang is in excess') + (rE < -0.25 && rY > 0.25 ? ' and yang is in excess' : '') + '. The chart needs <b>yin</b>.';
    else v = 'Not balanced: yang is ' + st(rY) + ' and yin is ' + st(rE) + '. No single cure: both need care.';
    return '<div style="border:1px solid ' + (ok ? '#a5d6a7' : '#ef9a9a') + ';background:' + (ok ? '#f1f8e9' : '#fdecea') + ';border-radius:8px;padding:6px 8px;margin:0 0 8px;font-size:12px;line-height:1.55;">'
      + '<b style="color:' + (ok ? '#2e7d32' : '#c62828') + ';">Yin/Yang · ' + v + '</b><br>'
      + 'Yang ' + N.heaven + ' · average for ' + av.month + ' ' + av.yang + ' · <span style="color:' + col(rY) + ';">' + pc(rY) + ', ' + st(rY) + '</span><br>'
      + 'Yin ' + N.earth + ' · average for ' + av.month + ' ' + av.yin + ' · <span style="color:' + col(rE) + ';">' + pc(rE) + ', ' + st(rE) + '</span></div>';
  }
  function newNatalReading(R, male, lon) {
    var NA = root.XKDGHeluoNatal, DC = root.XKDGHeluoDSCore;
    if (!NA || !DC || !NJ() || !root.XKDG_HELUO_SCORES || !root.XKDG_HELUO_READINGS) return '<div style="font-size:12px;color:#999;margin-top:10px;">Loading the natal reading…</div>';
    try {
      var A = NA.analyze(R, R.input.Pn, male), d = new Date(), nb = '';
      try { nb = NA.nowHtml(A, DC.pillarsTstNoon(d.getFullYear(), d.getMonth() + 1, d.getDate(), lon), lon); } catch (e) { nb = ''; }
      return '<details open style="margin-top:12px;border:1px solid #d1c4e9;border-radius:8px;padding:8px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:#4527a0;">Natal reading</summary>'
        + NA.html(A, nb) + '</details>';
    } catch (e) { return '<div style="font-size:12px;color:#c0392b;margin-top:10px;">Natal reading failed: ' + esc(e && e.message) + '</div>'; }
  }
  // which native hexagram (if any) the given one is opposite / inverse of
  function oppInvTag(R, hx) {
    var t = [];
    if (hx.n === R.oppositeXT.n) t.push('opposite of the Xian Tian'); if (hx.n === R.inverseXT.n && R.inverseXT.n !== R.xianTian.n) t.push('inverse of the Xian Tian');
    if (R.oppositeHT && hx.n === R.oppositeHT.n) t.push('opposite of the Hou Tian'); if (R.inverseHT && hx.n === R.inverseHT.n && R.inverseHT.n !== R.houTian.hex.n) t.push('inverse of the Hou Tian');
    return t;
  }
  function render() {
    var out = $('hl-out'), c = current();
    _chart = null;
    if (!c) { out.innerHTML = '<div style="font-size:12px;color:#888;">Load a person with birth date and hour (Person A or a saved person).</div>'; renderDS(); return; }
    if (!c.date || !c.time) { out.innerHTML = '<div style="font-size:12px;color:#c0392b;">This person needs the birth date and the birth hour.</div>'; renderDS(); return; }
    var g = $('hl-g').value;
    if (g !== 'M' && g !== 'F') { out.innerHTML = '<div style="font-size:12px;color:#b26a00;">Choose the gender: it decides the trigram on top and the moving line.</div>'; renderDS(); return; }
    var R; try { R = compute(c, g === 'M'); } catch (e) { out.innerHTML = '<div style="color:#c0392b;font-size:12px;">Calculation failed: ' + esc(e && e.message) + '</div>'; return; }
    if (!R) { out.innerHTML = '<div style="color:#c0392b;font-size:12px;">No birth longitude: set the GPS or the person\'s birth place.</div>'; renderDS(); return; }
    _hlLon = c.lon; _chart = { c: c, R: R, male: g === 'M', Pn: R.input.Pn };
    if (_tab === 'ds') { renderDS(); return; }
    var I = R.input, p = I.p, N = R.numbers, y0 = I.o.year, nowAge = heluoYearOf() - y0 + 1;
    var lineNow = function (cy, mv) { var l = mv; (cy || []).forEach(function (c) { if (nowAge >= c.from && nowAge <= c.to) l = c.line; }); return l; };
    var col = function (lbl, i) {
      return '<div style="text-align:center;min-width:52px;"><div style="font-size:10px;color:#777;">' + lbl + '</div><div style="font-size:20px;line-height:1.2;">' + STEMS[p.stems[i]] + '<br>' + BRANCHES[p.branches[i]] + '</div>'
        + '<div style="font-size:10px;color:#777;">' + STEM_PY[p.stems[i]] + ' ' + BR_PY[p.branches[i]] + '</div></div>';
    };
    var h = '<div style="font-size:12px;color:#555;margin-bottom:6px;"><b>' + esc(c.name) + '</b> · ' + esc(c.date) + ' ' + esc(c.time)
      + ' · TST ' + String(I.tst.h).padStart(2, '0') + ':' + String(I.tst.mi).padStart(2, '0') + ' · ' + (g === 'M' ? 'man' : 'woman')
      + (c.noGeo ? ' · <span style="color:#b26a00;">birth place not saved: current GPS used</span>' : '') + '</div>'
      + '<div style="display:flex;gap:6px;margin-bottom:6px;">' + col('Hour', 3) + col('Day', 2) + col('Month', 1) + col('Year', 0) + '</div>'
      + (I.heluoYearPillar !== I.solarYearPillar ? '<div style="font-size:11px;color:#6a1b9a;margin-bottom:6px;">Born after the Winter Solstice: Heluo year ' + I.heluoYearPillar + ' (solar year pillar ' + I.solarYearPillar + ').</div>' : '')
      + '<div style="font-size:12px;color:#333;line-height:1.6;margin-bottom:8px;">'
      + 'Heaven number <b>' + N.heaven + '</b> (' + N.odd.join('+') + ') → <b>' + triLbl(R.heavenTrigram) + '</b>' + (R.five ? ' (5 · ' + R.fiveCycle + ' cycle)' : '') + '<br>'
      + 'Earth number <b>' + N.earth + '</b> (' + N.even.join('+') + ') → <b>' + triLbl(R.earthTrigram) + '</b><br>'
      + 'Heaven trigram ' + (R.heavenUp ? 'on top' : 'below') + ' · ' + (I.o.yangDun ? 'Yang Dun' : 'Yin Dun') + ' · ' + SEASON[I.o.season] + '</div>'
      + yyBalance(N)
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      + fmtCard('Xian Tian ' + R.xianTian.n + ' ' + esc(hexName(R.xianTian.n)) + ' · moving line ' + R.moving.line, R.xianTian, lineNow(R.cyclesXT, R.moving.line), R.cyclesXT, null,
          '<div style="font-size:11px;color:#555;">Proper position ' + yn(R.positionXT) + ' · proper support ' + yn(R.supportXT) + (R.prevailingXT ? '<br>Prevailing: ' + R.prevailingXT : '') + '</div>' + hexText(R.xianTian.n))
      + (R.houTian ? fmtCard('Hou Tian ' + R.houTian.hex.n + ' ' + esc(hexName(R.houTian.hex.n)) + ' · moving line ' + R.houTian.line + (R.houTian.rule === 'special' ? ' · special 29/3/39' : ''), R.houTian.hex, lineNow(R.cyclesHT, R.houTian.line), R.cyclesHT, null,
          '<div style="font-size:11px;color:#555;">Proper position ' + yn(R.positionHT) + ' · proper support ' + yn(R.supportHT) + (R.prevailingHT ? '<br>Prevailing: ' + R.prevailingHT : '') + '</div>' + hexText(R.houTian.hex.n)) : '')
      + '</div>'
      // Edu, 11/11/2026: each derived hexagram next to its mother — one row for the Xian Tian, one for the Hou Tian
      + '<div style="font-size:11px;font-weight:600;color:#4527a0;margin-top:10px;">From the Xian Tian</div>'
      + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:3px;">'
      + small('Xian Tian', R.xianTian) + small('Hu Gua', R.huXT) + small('Opposite', R.oppositeXT) + small('Inverse', R.inverseXT) + '</div>'
      + (R.houTian ? '<div style="font-size:11px;font-weight:600;color:#4527a0;margin-top:10px;">From the Hou Tian</div>'
        + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:3px;">'
        + small('Hou Tian', R.houTian.hex) + (R.huHT ? small('Hu Gua', R.huHT) : '') + (R.oppositeHT ? small('Opposite', R.oppositeHT) + small('Inverse', R.inverseHT) : '') + '</div>' : '')
      + newNatalReading(R, g === 'M', c.lon)
      + (root.XKDGHeluoDS && root.XKDGHeluoDS.plannerHtml ? root.XKDGHeluoDS.plannerHtml(_chart) : '')
      + (R.cyclesXT.length ? cycleTable('Xian Tian cycles · age ' + nowAge + ' now · tap a line', R.cyclesXT, y0, nowAge, R.xianTian) + cycleTable('Hou Tian cycles', R.cyclesHT, y0, nowAge, R.houTian.hex) + annualSection(R) : '<div style="color:#c0392b;font-size:12px;">No moving line found.</div>')
      + '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:10px 0 3px;">Luck trigrams</div>'
      + '<table style="border-collapse:collapse;font-size:12px;"><tr style="color:#777;text-align:left;"><th style="padding:2px 8px;"></th><th style="padding:2px 8px;">Trigram</th><th style="padding:2px 8px;">Opposite</th></tr>'
      + [['Heaven (year stem)', 'heaven'], ['Earth (year branch)', 'earth'], ['Fame (season)', 'fame']].map(function (r) {
          return '<tr style="border-top:1px solid #eee;"><td style="padding:2px 8px;">' + r[0] + '</td><td style="padding:2px 8px;">' + triLbl(R.luck[r[1]]) + ' · ' + TRI_EL[R.luck[r[1]]] + '</td><td style="padding:2px 8px;">' + triLbl(R.luck.opposite[r[1]]) + '</td></tr>';
        }).join('') + '</table>'
      + '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:10px 0 3px;">Yin / Yang</div>'
      + '<div style="font-size:12px;color:#333;line-height:1.6;">Heaven (yang) ' + N.heaven + ' · balance 25 · ' + (N.devHeaven >= 0 ? '+' : '') + N.devHeaven
      + '<br>Earth (yin) ' + N.earth + ' · balance 30 · ' + (N.devEarth >= 0 ? '+' : '') + N.devEarth
      + '<br>Total ' + N.total + ' · balance 55 · ' + (N.total - 55 >= 0 ? '+' : '') + (N.total - 55)
      + '<br>Average for ' + N.monthAvg.month + ' (month ' + BR_PY[p.branches[1]] + '): yang ' + N.monthAvg.yang + ' · yin ' + N.monthAvg.yin + '</div>';
    out.innerHTML = h;
  }

  root.XKDGHeluo = { natal: natal, fromPillars: fromPillars, heluoYearOf: heluoYearOf, seasonTerms: seasonTerms, hexOf: hexOf, hexFrom: hexFrom,
    TRI: TRI, TRI_CN: TRI_CN, TRI_EL: TRI_EL, STEMS: STEMS, BRANCHES: BRANCHES, STEM_PY: STEM_PY, BR_PY: BR_PY,
    heavenTrigram: heavenTrigram, earthTrigram: earthTrigram, lineBranches: lineBranches, houTian: houTian,
    properPosition: properPosition, properSupport: properSupport, huGua: huGua, cycles: cycles,
    annual: annual, annualHex: annualHex, monthlyHex: monthlyHex, qiMonth: qiMonth, QI_EN: QI_EN, dailyHex: dailyHex, monthStarts: monthStarts, open: open,
    currentChart: function () { return _chart; },
    periods: { months: msTST, annual: annualPeriods, month: monthPeriods, block: blockPeriods, day: dayPeriods, dayMs: dayMs },
    ui: { cycleHexSvg: cycleHexSvg, lineBody: lineBody, hexName: hexName, najiaLine: najiaLine } };
  root.openHeluoLishu = open;
  // ── He Luo inside the XKDG Date Selection (Edu, 11/11/2026): Person A's chart without opening the window ──
  // chartA() → { c, R, male, Pn } or { err } ; ensure(cb) loads Na Jia, texts and the Date Selection files, then calls cb.
  root.XKDGHeluo.chartA = function () {
    var date = ($('person-date') || {}).value, time = ($('person-time') || {}).value; if (!date || !time) return { err: 'birth' };
    var nm = (($('person-name') || {}).value || '').trim() || 'Person A', g = genderGet(nm); if (g !== 'M' && g !== 'F') return { err: 'gender' };
    var geo = null; try { geo = root._personBirthGeo('A'); } catch (e) {}
    var lon0 = parseFloat(($('longitude') || {}).value), utc0 = parseFloat(($('utc-offset') || {}).value) || 0;
    var c = { name: nm, date: date, time: time, lon: geo ? geo.lon : lon0, utc: geo ? geo.utc : utc0, dst: !!(geo && geo.dst) }, R = null;
    try { R = compute(c, g === 'M'); } catch (e) {}
    return R ? { c: c, R: R, male: g === 'M', Pn: R.input.Pn } : { err: 'longitude' };
  };
  var _ensQ = null;
  root.XKDGHeluo.ready = function () { return !!(NJ() && TX() && root.XKDGHeluoDS && root.XKDG_HELUO_SCORES); };
  root.XKDGHeluo.ensure = function (cb) {
    if (root.XKDGHeluo.ready()) { cb(); return; }
    if (_ensQ) { _ensQ.push(cb); return; }
    _ensQ = [cb]; loadNajia(); loadTexts(); loadDS();
    var n = 0, iv = setInterval(function () {
      if (!root.XKDGHeluo.ready() && ++n < 150) return;
      clearInterval(iv); var q = _ensQ; _ensQ = null; if (root.XKDGHeluo.ready()) q.forEach(function (f) { try { f(); } catch (e) {} });
    }, 100);
  };
})(typeof window !== 'undefined' ? window : globalThis);

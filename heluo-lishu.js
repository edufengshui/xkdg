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
  // A = annual hexagram (lines), moved = line moved this year, monthBr 0..11 (Zi..Hai).
  // Month i: Yin 寅 = 1 … Chou 丑 = 12; lines s = moved+1, s+1 …; odd month: change the first
  // ceil(i/2) of them; even month: the same + the partner of the last one.
  function monthlyHex(A, moved, monthBr) {
    var i = (monthBr - 2 + 12) % 12 + 1, s = wrap6(moved + 1), j = Math.ceil(i / 2), S = [];
    for (var t = 0; t < j; t++) S.push(wrap6(s + t));
    var last = wrap6(s + j - 1);
    if (i % 2 === 0) { var p = partner(last), q = S.indexOf(p); if (q >= 0) S.splice(q, 1); else S.push(p); }
    return { hex: hexOf(flip(A, S)), changed: S.slice().sort(), index: i };
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
      months: [0,1,2,3,4,5,6,7,8,9,10,11].map(function (b) { var mo = monthlyHex(a.hex.lines, a.moved, b); return { br: b, index: mo.index, hex: mo.hex, changed: mo.changed }; }) };
  }
  // Month starts inside Heluo year Y (Beijing-naive Dates): Zi from the Winter Solstice of Y-1,
  // Chou 小寒 … Hai 立冬, Zi again from 大雪 to the Winter Solstice of Y.
  function monthStarts(Y) {
    var t = root.Lunar.fromYmd(Y, 1, 1).getJieQiTable();
    function d(so) { return new Date(Date.UTC(so.getYear(), so.getMonth() - 1, so.getDay(), so.getHour(), so.getMinute(), so.getSecond())); }
    var k = ['冬至','小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'], br = [0,1,2,3,4,5,6,7,8,9,10,11,0];
    var out = k.map(function (n, i) { return { br: br[i], start: d(t[n]) }; });
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
    r.input = { p: p, o: o, solarYearPillar: P.year, heluoYearPillar: STEMS[ys] + BRANCHES[yb], tst: P.meta.tst };
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
  function triLbl(t) { return t + ' ' + TRI_CN[t]; }
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
      ov.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:720px;width:100%;padding:16px;box-shadow:0 12px 44px rgba(0,0,0,.32);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-size:16px;font-weight:bold;color:#5e35b1;">☯ He Luo Li Shu 河洛理數</div>'
        + '<button onclick="document.getElementById(\'hl-overlay\').style.display=\'none\'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1;">✕</button></div>'
        + '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px;">'
        + '<div><label style="' + L + '">Person</label><select id="hl-p" onchange="xkdgHLPerson()" style="' + F + 'max-width:170px;"></select></div>'
        + '<div><label style="' + L + '">Gender</label><select id="hl-g" onchange="xkdgHLGender()" style="' + F + '"><option value="">—</option><option value="M">Man</option><option value="F">Woman</option></select></div>'
        + '</div><div id="hl-out"></div>'
        + '<div style="font-size:10px;color:#999;margin-top:10px;line-height:1.5;">Year pillar from the Winter Solstice; month, day and hour in true solar time at the birth place. Texts: He Luo Li Shu translations by Edu (64 hexagrams and 384 lines).</div></div>';
      document.body.appendChild(ov);
    }
    var list = savedPeople(), sel = $('hl-p'), cur = sel.value;
    var mainA = (($('person-name') || {}).value || '').trim(), hasMainA = !!(($('person-date') || {}).value && ($('person-time') || {}).value);
    sel.innerHTML = (hasMainA ? '<option value="__A">Person A' + (mainA ? ' · ' + esc(mainA) : '') + '</option>' : '<option value="">—</option>')
      + list.map(function (x) { return '<option value="' + esc(x.name) + '">' + esc(x.name) + '</option>'; }).join('');
    if (cur) { sel.value = cur; if (sel.selectedIndex < 0) sel.selectedIndex = 0; }
    ov.style.display = 'flex';
    loadTexts(); loadNajia();
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
  function cycleHexSvg(lines, ln, from, to) {
    var W = 220, bx = 60, bw = 100, lh = 9, gap = 7, top = 6, H = top * 2 + 6 * lh + 5 * gap;
    var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;margin:6px auto;">';
    for (var i = 0; i < 6; i++) {
      var y = top + (5 - i) * (lh + gap), red = (i + 1 === ln), col = red ? '#c62828' : '#222';
      if (lines[i]) s += '<rect x="' + bx + '" y="' + y + '" width="' + bw + '" height="' + lh + '" fill="' + col + '"/>';
      else s += '<rect x="' + bx + '" y="' + y + '" width="' + (bw * 0.43) + '" height="' + lh + '" fill="' + col + '"/><rect x="' + (bx + bw * 0.57) + '" y="' + y + '" width="' + (bw * 0.43) + '" height="' + lh + '" fill="' + col + '"/>';
      if (red) {
        var ty = y + lh - 0.5;
        s += '<text x="' + (bx - 8) + '" y="' + ty + '" text-anchor="end" font-size="14" font-weight="700" fill="#c62828" font-family="system-ui">' + from + '</text>'
           + '<text x="' + (bx + bw + 8) + '" y="' + ty + '" font-size="14" font-weight="700" fill="#c62828" font-family="system-ui">' + to + '</text>';
      }
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
  var REL = { B: 'Brothers', C: 'Offspring', W: 'Wealth', G: 'Officer / Ghost', P: 'Parents' };
  var REL_CN = { B: '兄弟', C: '子孫', W: '妻財', G: '官鬼', P: '父母' };
  var EL_CN = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
  // Six lines of a hexagram (top to bottom): Na Jia branch, relation, Shi/Ying; tap a line for its text.
  function linesTable(hx, mv, label) {
    var d = NJ() && NJ()[hx.n];
    if (!d) return NJ() ? '' : '<div style="font-size:11px;color:#999;margin-top:5px;">Loading lines…</div>';
    var TD = 'padding:3px 5px;', h = '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:12px;color:#4527a0;font-weight:600;">☰ ' + (label || 'Six lines · branch and relations') + '</summary>'
      + '<div style="font-size:11px;color:#555;margin:4px 0;">Palace ' + d.palaceCn + ' ' + d.palace + ' (' + EL_CN[d.palaceEl] + ' ' + d.palaceEl + ') · Shi line ' + d.shi + ' · Ying line ' + d.ying + ' · tap a line for its text</div>'
      + '<table style="border-collapse:collapse;font-size:12px;width:100%;">';
    for (var i = 5; i >= 0; i--) {
      var L = d.lines[i], l = i + 1, id = 'hl-ln-' + (++_cycN), sy = l === d.shi ? 'Shi 世' : l === d.ying ? 'Ying 應' : '';
      h += '<tr onclick="xkdgHLCycle(\'' + id + '\')" style="cursor:pointer;border-top:1px solid #eee;' + (l === mv ? 'background:#ffebee;' : '') + '">'
        + '<td style="' + TD + 'white-space:nowrap;">' + l + (l === mv ? ' <span style="color:#c62828;">●</span>' : '') + '</td>'
        + '<td style="' + TD + '">' + miniLine(L.yang) + '</td>'
        + '<td style="' + TD + 'white-space:nowrap;"><b>' + L.branch + '</b> ' + EL_CN[L.el] + ' ' + L.el + '</td>'
        + '<td style="' + TD + '">' + L.relCn + ' ' + REL[L.rel] + (L.fushen ? '<div style="font-size:10px;color:#777;">hidden ' + L.fushen.branch + ' ' + EL_CN[L.fushen.el] + ' ' + REL_CN[L.fushen.rel] + ' ' + REL[L.fushen.rel] + '</div>' : '') + '</td>'
        + '<td style="' + TD + 'color:#6a1b9a;white-space:nowrap;">' + sy + '</td></tr>'
        + '<tr id="' + id + '" style="display:none;"><td colspan="5" style="padding:2px 6px 8px;">' + (lineBody(hx.n, l, true) || '') + '</td></tr>';
    }
    return h + '</table></details>';
  }
  function najiaLine(n, l) { // one-line Na Jia summary of line l of hexagram n
    var d = NJ() && NJ()[n], L = d && d.lines[l - 1]; if (!L) return '';
    return '<div style="font-size:11px;color:#6a1b9a;margin:3px 0;">Line ' + l + ': <b>' + L.branch + '</b> ' + EL_CN[L.el] + ' ' + L.el + ' · ' + L.relCn + ' ' + REL[L.rel]
      + (l === d.shi ? ' · Shi 世' : l === d.ying ? ' · Ying 應' : '') + (L.fushen ? ' · hidden ' + L.fushen.branch + ' ' + REL_CN[L.fushen.rel] + ' ' + REL[L.fushen.rel] : '') + '</div>';
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
        + '<tr id="' + id + '" style="display:none;"><td colspan="4" style="padding:2px 6px 8px;">' + cycleHexSvg(hx.lines, c.line, c.from, c.to)
        + '<div style="text-align:center;font-size:11px;color:#555;">' + hx.n + ' ' + esc(hexName(hx.n)) + ' · line ' + c.line + ' · age ' + c.from + '–' + c.to + '</div>' + najiaLine(hx.n, c.line) + lineBody(hx.n, c.line) + '</td></tr>';
    });
    return h + '</table>';
  }
  // Annual + monthly section (phase 2). _hlY = Heluo year shown (null = the current one).
  var _hlY = null;
  root.xkdgHLYear = function (d) { _hlY = d === 0 ? null : (_hlY || heluoYearOf()) + d; render(); };
  function fmtD(dt) { return dt.getUTCDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getUTCMonth()]; }
  function annualSection(R) {
    var Y = _hlY || heluoYearOf(), a = annual(R, Y), B = 'padding:3px 9px;border:1px solid #b39ddb;border-radius:5px;background:#fff;cursor:pointer;font-size:12px;';
    var h = '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:12px 0 4px;">Annual and monthly hexagrams</div>'
      + '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;font-size:12px;"><button style="' + B + '" onclick="xkdgHLYear(-1)">◀</button>'
      + '<b>Heluo year ' + Y + '</b> <span style="color:#777;">(Winter Solstice ' + (Y - 1) + ' → ' + Y + ')</span>'
      + '<button style="' + B + '" onclick="xkdgHLYear(1)">▶</button>' + (_hlY ? '<button style="' + B + '" onclick="xkdgHLYear(0)">now</button>' : '') + '</div>';
    if (a.none) return h + '<div style="font-size:12px;color:#888;">Age ' + a.age + ': outside the Xian Tian / Hou Tian cycles.</div>';
    var per = a.period, isXT = a.periodHex === R.xianTian;
    h += '<div style="font-size:12px;color:#333;line-height:1.6;margin-bottom:6px;">Age <b>' + a.age + '</b> · ' + (isXT ? 'Xian Tian' : 'Hou Tian') + ' ' + a.periodHex.n
      + ' line ' + per.line + ' (' + (per.yang ? 'yang · 9' : 'yin · 6') + ', age ' + per.from + '–' + per.to + ') · year <b>' + a.k + '</b> of ' + a.len
      + (per.yang && a.k === 1 && a.yangStart ? '<br><span style="color:#6a1b9a;">Period starting in a yang year: the first year keeps the hexagram unchanged.</span>' : '') + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + hexCard('Annual hexagram ' + Y, a.hex, a.moved,
          '<div style="font-size:11px;color:#555;margin-top:5px;">Changed from ' + a.periodHex.n + ': ' + (a.changed.length ? 'lines ' + a.changed.join(', ') : 'none') + '</div>'
          + hexText(a.hex.n) + lineText(a.hex.n, a.moved, 'Line ' + a.moved + ' (moved this year)') + linesTable(a.hex, a.moved), 'Moved this year:') + '</div>';
    var ms; try { ms = monthStarts(Y); } catch (e) { ms = null; }
    var now = new Date(Date.now() + 8 * 3600000), TD = 'padding:3px 6px;';
    var tb = '<table style="border-collapse:collapse;font-size:12px;width:100%;margin-top:8px;"><tr style="color:#777;text-align:left;"><th style="' + TD + '">Month</th><th style="' + TD + '">From</th><th style="' + TD + '"></th><th style="' + TD + '">Hexagram</th></tr>';
    var today = '';
    for (var i = 0; i < 13; i++) {
      var br = ms ? ms[i].br : (i === 12 ? 0 : i), mo = a.months[br];
      var from = ms ? ms[i].start : null, to = ms ? (ms[i + 1].start || ms[i + 1].end) : null, on = from && now >= from && now < to;
      var id = 'hl-mo-' + (++_cycN), blocks = '';
      if (from) {
        // Daily lines (Edu's guide, session 43): from the first day of the SOLAR month, 5 days per line of the
        // monthly hexagram (days 1-5 line 1 … 26-30 line 6), day 31 starts again at line 1.
        // The Zi row from the Winter Solstice counts its days from Daxue of the previous year.
        var mStart = from; if (i === 0) { try { mStart = monthStarts(Y - 1)[12].start; } catch (e) {} }
        var d0 = Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth(), mStart.getUTCDate()), D = 86400000;
        var endDay = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()); // the Jie day belongs to the new month
        var nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        var startDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
        for (var k = 0; d0 + k * 5 * D < endDay; k++) {
          var bS = d0 + k * 5 * D, bE = Math.min(bS + 5 * D, endDay); if (bE <= startDay) continue;
          var ln = k % 6 + 1, onB = nowDay >= Math.max(bS, startDay) && nowDay < bE;
          blocks += '<tr style="' + (onB ? 'background:#fff3e0;font-weight:600;' : '') + '"><td style="padding:2px 6px;white-space:nowrap;">' + fmtD(new Date(Math.max(bS, startDay))) + ' – ' + fmtD(new Date(bE - D)) + '</td><td style="padding:2px 6px;">line ' + ln + (onB ? ' ◀ today' : '') + '</td></tr>';
          if (onB) today = '<div style="font-size:12px;margin:8px 0 2px;padding:6px 8px;background:#fff3e0;border-radius:6px;"><b>Today</b>: month ' + BRANCHES[br] + ' · hexagram <b>' + mo.hex.n + '</b> ' + esc(hexName(mo.hex.n)) + ' · day ' + ((nowDay - d0) / D + 1) + ' of the solar month → <b>line ' + ln + '</b>'
            + najiaLine(mo.hex.n, ln) + lineText(mo.hex.n, ln, 'Line ' + ln + ' of ' + mo.hex.n, true) + '</div>';
        }
      }
      tb += '<tr onclick="xkdgHLCycle(\'' + id + '\')" style="cursor:pointer;border-top:1px solid #eee;' + (on ? 'background:#fff3e0;font-weight:600;' : '') + '"><td style="' + TD + '">' + BRANCHES[br] + ' ' + BR_PY[br] + '</td>'
        + '<td style="' + TD + '">' + (from ? fmtD(from) + (i === 0 ? ' (WS)' : '') : '') + (on ? ' ◀ now' : '') + '</td>'
        + '<td style="' + TD + '">' + miniHex(mo.hex.lines) + '</td><td style="' + TD + '"><b>' + mo.hex.n + '</b> ' + esc(hexName(mo.hex.n)) + '</td></tr>'
        + '<tr id="' + id + '" style="display:none;"><td colspan="4" style="padding:2px 6px 8px;">'
        + (blocks ? '<div style="font-size:11px;color:#777;margin:2px 0;">Daily lines (5 days per line)</div><table style="border-collapse:collapse;font-size:12px;">' + blocks + '</table>' : '')
        + hexText(mo.hex.n) + linesTable(mo.hex, 0) + '</td></tr>';
    }
    return h + today + tb + '</table><div style="font-size:10px;color:#999;margin-top:4px;">Months change at the Jie (Beijing dates). Zi from Daxue to the Winter Solstice still uses this year; from the Winter Solstice the next Heluo year.</div>';
  }
  function render() {
    var out = $('hl-out'), c = current();
    if (!c) { out.innerHTML = '<div style="font-size:12px;color:#888;">Load a person with birth date and hour (Person A or a saved person).</div>'; return; }
    if (!c.date || !c.time) { out.innerHTML = '<div style="font-size:12px;color:#c0392b;">This person needs the birth date and the birth hour.</div>'; return; }
    var g = $('hl-g').value;
    if (g !== 'M' && g !== 'F') { out.innerHTML = '<div style="font-size:12px;color:#b26a00;">Choose the gender: it decides the trigram on top and the moving line.</div>'; return; }
    var R; try { R = compute(c, g === 'M'); } catch (e) { out.innerHTML = '<div style="color:#c0392b;font-size:12px;">Calculation failed: ' + esc(e && e.message) + '</div>'; return; }
    if (!R) { out.innerHTML = '<div style="color:#c0392b;font-size:12px;">No birth longitude: set the GPS or the person\'s birth place.</div>'; return; }
    var I = R.input, p = I.p, N = R.numbers, y0 = I.o.year, nowAge = heluoYearOf() - y0 + 1;
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
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      + hexCard('Xian Tian 先天 (Pre-Heaven)', R.xianTian, R.moving.line,
          '<div style="font-size:11px;color:#555;margin-top:5px;">Proper position ' + yn(R.positionXT) + ' · proper support ' + yn(R.supportXT) + (R.prevailingXT ? '<br>Prevailing: ' + R.prevailingXT : '') + '</div>' + hexText(R.xianTian.n) + linesTable(R.xianTian, R.moving.line))
      + (R.houTian ? hexCard('Hou Tian 後天 (Post-Heaven)' + (R.houTian.rule === 'special' ? ' · special 29/3/39' : ''), R.houTian.hex, R.houTian.line,
          '<div style="font-size:11px;color:#555;margin-top:5px;">Proper position ' + yn(R.positionHT) + ' · proper support ' + yn(R.supportHT) + (R.prevailingHT ? '<br>Prevailing: ' + R.prevailingHT : '') + '</div>' + hexText(R.houTian.hex.n) + linesTable(R.houTian.hex, R.houTian.line)) : '')
      + '</div>'
      + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;">'
      + small('Hu Gua XT', R.huXT) + (R.huHT ? small('Hu Gua HT', R.huHT) : '')
      + small('Opposite XT', R.oppositeXT) + small('Inverse XT', R.inverseXT)
      + (R.oppositeHT ? small('Opposite HT', R.oppositeHT) + small('Inverse HT', R.inverseHT) : '') + '</div>'
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
    annual: annual, annualHex: annualHex, monthlyHex: monthlyHex, monthStarts: monthStarts, open: open };
  root.openHeluoLishu = open;
})(typeof window !== 'undefined' ? window : globalThis);

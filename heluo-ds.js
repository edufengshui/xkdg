// He Luo Li Shu — Date Selection "a cascata" + cycle reading (Edu, 10/11/2026; HLLS project docs:
// hlls-regole-lettura-wealth.md, hlls-luck-cascata.md, hlls-piano-software.md).
// Port of the Node prototypes heluo-test/cmp/ds_cascata.js (option luck2, rule of 旺) and luck.js with their
// DEFAULT options; weights FIXED (Edu, 10/11: fixed until the test on a new group of 20–30 events).
// Needs: XKDGHeluo (heluo-lishu.js), HeluoNaJia (heluo-najia.js), XKDG_HELUO_SCORES (heluo-scores.js),
// XKDGSolarTime (solar-time.js), lunar-javascript (Solar). Always TRUE SOLAR TIME of the place; never Beijing dates.
// The core is pure and runs in Node too (heluo-test/cmp/ds_app_check.js compares it with the prototype).
(function (root) {
  'use strict';
  function H() { return root.XKDGHeluo; }
  function NJ() { return root.HeluoNaJia; }
  function SC() { return root.XKDG_HELUO_SCORES; }
  function STm() { return root.XKDGSolarTime; }
  function SOL() { return root.Solar || (root.Lunar && root.Lunar.Solar); }

  var BR = '子丑寅卯辰巳午未申酉戌亥', ST = '甲乙丙丁戊己庚辛壬癸';
  var TRI_EL = { Qian: 'Metal', Dui: 'Metal', Li: 'Fire', Zhen: 'Wood', Xun: 'Wood', Kan: 'Water', Gen: 'Earth', Kun: 'Earth' };
  var BR_EL = { 子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire', 午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water' };
  var GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
  var CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
  var LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  var SANHE = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
  var BR_TRI = ['Kan', 'Gen', 'Gen', 'Zhen', 'Xun', 'Xun', 'Li', 'Kun', 'Kun', 'Dui', 'Qian', 'Qian']; // Time 1
  var CLASH_TRI = { Kan: 'Li', Li: 'Kan', Gen: 'Kun', Kun: 'Gen', Zhen: 'Dui', Dui: 'Zhen', Xun: 'Qian', Qian: 'Xun' };
  var EL_BR = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'];
  var REL = { P: 'Parent', W: 'Wealth', G: 'Ghost', C: 'Children', B: 'Brothers' };
  function clash(b) { return BR[(BR.indexOf(b) + 6) % 12]; }
  function brTri(b) { return BR_TRI[BR.indexOf(b)]; }

  // relation of element `el` for the person `pers`
  function rel(pers, el) {
    if (el === pers) return 'B';
    if (GEN[pers] === el) return 'C';
    if (CTRL[pers] === el) return 'W';
    if (CTRL[el] === pers) return 'G';
    return 'P';
  }
  // HLLS rule 1: one-element hexagram = that element; two elements = trigram of the line
  function persona(hx, line) { var u = TRI_EL[hx.upper], l = TRI_EL[hx.lower]; return u === l ? u : (line <= 3 ? l : u); }

  // ── Fixed weights (ds_cascata.js) ─────────────────────────────────────────
  var PURPOSES = {
    wealth:  { label: 'Wealth · income, sales, listing',      w: { W: 2, C: 1, P: 0, G: 0, B: -1 } }, // 食傷生財; 比劫奪財
    output:  { label: 'Output · launch, creation, giving',     w: { C: 2, B: 1, W: 0, G: 0, P: -1 } }, // 梟神奪食
    parent:  { label: 'Parent · contracts, documents, study',  w: { P: 2, G: 1, B: 0, C: 0, W: -1 } }, // 官生印; 財壞印
    officer: { label: 'Officer · appointment, position',       w: { G: 2, W: 1, P: 0, B: 0, C: -1 } }  // 財生官; 傷官見官
  };
  // Timeliness (Edu, 9/11): Earth in 辰未戌丑 and in summer; the others in their season and in that of who generates them
  var SEASON = { 寅: 'Wood', 卯: 'Wood', 辰: 'Wood', 巳: 'Fire', 午: 'Fire', 未: 'Fire', 申: 'Metal', 酉: 'Metal', 戌: 'Metal', 亥: 'Water', 子: 'Water', 丑: 'Water' };
  function timely(el, mb) {
    var earthM = '辰未戌丑'.indexOf(mb) >= 0;
    if (el === 'Earth') return earthM || SEASON[mb] === 'Fire';
    var genBy = Object.keys(GEN).filter(function (k) { return GEN[k] === el; })[0];
    if (SEASON[mb] === el || SEASON[mb] === genBy) return true;
    return genBy === 'Earth' && earthM;
  }
  // 旺: the element in its own season; Earth in 辰未戌丑 (Edu, 10/11)
  function wang(el, mb) { return el === 'Earth' ? '辰未戌丑'.indexOf(mb) >= 0 : ({ 寅: 'Wood', 卯: 'Wood', 巳: 'Fire', 午: 'Fire', 申: 'Metal', 酉: 'Metal', 亥: 'Water', 子: 'Water' })[mb] === el; }
  function voids(p) { var x = ((BR.indexOf(p[1]) - ST.indexOf(p[0])) % 12 + 12) % 12; return [BR[(x + 10) % 12], BR[(x + 11) % 12]]; }

  // Edu, 11/11/2026 (Microsoft listing): 1) directional combination (三會): if the line branch completes 寅卯辰 Wood,
  // 巳午未 Fire, 申酉戌 Metal or 亥子丑 Water with the year, month and day branches, the line takes the element of the
  // combination (relation on the person included) and is very strong (+1); the branches of the combination do not
  // control it. 2) a branch void in the natal chart comes out of the void on the day with the same branch (填實).
  var SANHUI = { Wood: '寅卯辰', Fire: '巳午未', Metal: '申酉戌', Water: '亥子丑' };
  function sanhui(b, T) {
    var have = b + T.y + T.m + T.d;
    for (var el in SANHUI) if (SANHUI[el].indexOf(b) >= 0 && SANHUI[el].split('').every(function (x) { return have.indexOf(x) >= 0; })) return el;
    return null;
  }
  // time judgement of branch b against year, month, day branches (T = { y, m, d })
  function tempo(b, T, natVoids) {
    var sh = sanhui(b, T), el = sh || BR_EL[b], note = [], t = 0;
    if (sh) { t += 1; note.push('三會 ' + sh + ' combination'); }
    if (timely(el, T.m)) { t += 1; note.push('timely'); }
    [['Y', T.y], ['M', T.m], ['D', T.d]].forEach(function (kx) {
      var k = kx[0], x = kx[1];
      if (x === b) { t += 1; note.push('same ' + k); }
      else if (sh && SANHUI[sh].indexOf(x) >= 0) { /* same combination: ally */ }
      else if (LIUHE[b] === x) { t += 1; note.push('六合 ' + k); }
      else if (clash(b) === x) {
        // an element at full strength (旺) clashed by an untimely branch is not broken: it is excited (Edu, 10/11)
        if (wang(el, T.m) && !timely(BR_EL[x], T.m)) { t += 1; note.push('冲 ' + k + ' (excites)'); }
        else { t -= 2; note.push('冲 ' + k); }
      }
      else if (SANHE.some(function (s) { return s.indexOf(b) >= 0 && s.indexOf(x) >= 0; })) { t += 0.5; note.push('三合 ' + k); }
      var forte = wang(el, T.m);
      if (x !== b && CTRL[BR_EL[x]] === el && !(forte && !timely(BR_EL[x], T.m))) { t -= 0.5; note.push('剋 ' + k); }
    });
    if (natVoids.indexOf(b) >= 0 && !timely(el, T.m)) { if (b === T.d) note.push('void filled by the day'); else { t -= 1; note.push('空 void'); } }
    return { t: t, note: note };
  }
  // one level of the cascade: line `line` of hexagram hexN; text score moved ±1 towards the version chosen by time
  function level(hexN, line, pers, purpose, T, natVoids) {
    var L = NJ()[hexN].lines[line - 1], sh = sanhui(L.branch, T), r = rel(pers, sh || L.el), tm = tempo(L.branch, T, natVoids);
    var s = SC()[hexN].l[line], V = Math.sign(tm.t), txt = Math.max(-2, Math.min(2, s + V)), rs = PURPOSES[purpose].w[r];
    return { hexN: hexN, line: line, b: L.branch, el: sh || L.el, r: r, rs: rs, tm: tm, s: s, V: V, txt: txt, fushen: L.fushen, tot: rs + tm.t + txt };
  }

  // ── Moment → cascade (heluo_cmp.js predict, method A, monthly rule 'edu') ─────────────────────
  function bjMs(P) { var b = P.meta.beijing; return Date.UTC(b.y, b.mo - 1, b.d, b.h, b.mi, b.s || 0); }
  function wsYear(P) { var y = P.meta.beijing.y; return bjMs(P) >= H().seasonTerms(y).WS.getTime() ? y + 1 : y; }
  // TST calendar day (ms at 00:00) of a Beijing-naive instant (the 中氣 that opened the month)
  function tstDay(bjDate, lon) {
    var utc = bjDate.getTime() - 8 * 3600000, tst = new Date(utc + (lon * 4 + STm().equationOfTimeMinutes(new Date(utc))) * 60000);
    return Date.UTC(tst.getUTCFullYear(), tst.getUTCMonth(), tst.getUTCDate());
  }
  function predict(R, Pe, lon) {
    var Y = wsYear(Pe), y0 = R.input.o.year, age = Y - y0 + 1, per = null, hx = null, phase = null;
    R.cyclesXT.forEach(function (c) { if (age >= c.from && age <= c.to) { per = c; hx = R.xianTian; phase = 'XT'; } });
    if (!per && R.houTian) R.cyclesHT.forEach(function (c) { if (age >= c.from && age <= c.to) { per = c; hx = R.houTian.hex; phase = 'HT'; } });
    if (!per) return { age: age, none: true };
    var k = age - per.from + 1, startYear = y0 + per.from - 1;
    var a = H().annualHex(hx.lines, per.line, k, startYear % 2 === 0);
    // monthly (Edu, 10/11/2026): month index from the 中氣, line k of the annual for months 2k-1 and 2k
    var qm = H().qiMonth(Pe), mo = H().monthlyHex(a.hex.lines, qm.index);
    var t = Pe.meta.tst, tday = Date.UTC(t.y, t.mo - 1, t.d);
    var dayIdx = Math.max(0, Math.round((tday - tstDay(qm.qi, lon)) / 86400000)), dh = H().dailyHex(mo.hex.lines, dayIdx + 1);
    return { age: age, year: Y, phase: phase, hx: hx, per: per, k: k, annual: a, month: mo, daily: dh, dayOfMonth: dayIdx + 1,
      id: { cycle: [hx.n, per.line], year: [a.hex.n, a.moved], month: [mo.hex.n, 0], lord: [dh.block.n, dh.lord], day: [dh.block.n, dh.line], dayHex: [dh.hex.n, dh.line] } };
  }

  // ── The three Luck (luck.js, defaults: vuoti on, exit only by clashing branches, no opposites from branches, bridge 'esa') ──
  var LW = { A: { a: 0.25, m: 0.5, g: 1 }, B: { c: 0.25, a: 0.5, g: 1 }, C: { a: 0.25, m: 0.5, b: 0.5, g: 0.75 } };
  var YY = { low: 1.5, high: { M: { heaven: 0.5, earth: -0.5 }, F: { heaven: -0.5, earth: 0.5 } } };
  var TM = { 2: 1.5, 1: 1.25, 0: 1, '-1': 0.75, '-2': 0.5 };
  var TMK = { 2: '旺', 1: '相', 0: '休', '-1': '囚', '-2': '死' };
  var TRI_BR = {}; BR_TRI.forEach(function (t, i) { (TRI_BR[t] = TRI_BR[t] || []).push(BR[i]); });
  var _triOf = null;
  function TRI_OF(n) {
    if (!_triOf) { _triOf = {}; Object.keys(TRI_EL).forEach(function (u) { Object.keys(TRI_EL).forEach(function (l) { var h = H().hexFrom(u, l); _triOf[h.n] = [h.upper, h.lower]; }); }); }
    return _triOf[n];
  }
  function timeK(tri, mbi) { var se = EL_BR[mbi], e = TRI_EL[tri]; return e === se ? 2 : GEN[se] === e ? 1 : GEN[e] === se ? 0 : CTRL[e] === se ? -1 : -2; }
  function triVuoto(t, dp, yb, mb) {
    var v = voids(dp);
    return TRI_BR[t].every(function (b) { return v.indexOf(b) >= 0 && !timely(TRI_EL[t], mb) && clash(b) !== yb; });
  }
  function profile(R, Pn, male) {
    var N = R.numbers, mbi = BR.indexOf(Pn.month[1]);
    var rY = N.heaven / N.monthAvg.yang - 1, rE = N.earth / N.monthAvg.yin - 1;
    var xt = R.xianTian, ht = R.houTian && R.houTian.hex;
    var nat = [xt.upper, xt.lower, R.huXT.upper, R.huXT.lower].concat(ht ? [ht.upper, ht.lower, R.huHT.upper, R.huHT.lower] : []);
    var yb = BR[R.input.p.branches[0]], K = {};
    ['heaven', 'earth', 'fame'].forEach(function (k) {
      var t = R.luck[k], op = R.luck.opposite[k], tk = timeK(t, mbi), yy = 1, yt = 'in line';
      if (k === 'heaven') { if (rY < -0.25) { yy = YY.low; yt = 'yang deficient'; } else if (rY > 0.25) { yy = YY.high[male ? 'M' : 'F'].heaven; yt = 'yang in excess'; } }
      if (k === 'earth') { if (rE < -0.25) { yy = YY.low; yt = 'yin deficient'; } else if (rE > 0.25) { yy = YY.high[male ? 'M' : 'F'].earth; yt = 'yin in excess'; } }
      if (k === 'fame') yt = '—';
      var m = yy * TM[tk], vu = triVuoto(t, Pn.day, yb, Pn.month[1]);
      K[k] = { t: t, op: op, inNat: nat.indexOf(t) >= 0, opNat: nat.indexOf(op) >= 0, tk: tk, tkCn: TMK[tk], yy: yy, yt: yt, m: vu ? 0 : m, mPieno: m, vuoto: vu };
    });
    return { K: K, rY: rY, rE: rE };
  }
  function bridge(L, tr) { // Water–Fire Luck/opposite reconciled by Wood in the same hexagram (通關)
    if (!(['Kan', 'Li'].indexOf(L.t) >= 0 && ['Kan', 'Li'].indexOf(L.op) >= 0)) return false;
    return tr.some(function (t) { return t === 'Zhen' || t === 'Xun'; });
  }
  function luckDay(P, p, T) {
    var tot = 0, w = [], mUsa = {};
    ['heaven', 'earth', 'fame'].forEach(function (k) {
      var L = P.K[k]; mUsa[k] = L.m;
      if (!L.vuoto) return;
      var sc = CLASH_TRI[L.t];
      if ([T.y, T.m, T.d].some(function (b) { return brTri(b) === sc; })) { mUsa[k] = L.mPieno; w.push(cap(k) + ' Luck out of the void (' + sc + ')'); }
    });
    function add(k, v, src) { if (!v) return; tot += v * mUsa[k]; if (mUsa[k]) w.push(src + ' ' + (v > 0 ? '+' : '−') + cap(k)); }
    ['heaven', 'earth', 'fame'].forEach(function (k) {
      var L = P.K[k];
      [['year', T.y, LW.A.a], ['month', T.m, LW.A.m], ['day', T.d, LW.A.g]].forEach(function (x) { if (L.inNat && brTri(x[1]) === L.t) add(k, x[2], x[0] + ' ' + x[1]); });
      [['cycle line', p.id.cycle, LW.B.c], ['annual line', p.id.year, LW.B.a], ['day line', p.id.day, LW.B.g]].forEach(function (x) {
        var b = NJ()[x[1][0]].lines[x[1][1] - 1].branch; if (brTri(b) === L.t) add(k, x[2], x[0] + ' ' + b); });
      [['annual', p.id.year[0], LW.C.a], ['monthly', p.id.month[0], LW.C.m], ['block', p.id.lord[0], LW.C.b], ['day hex', p.id.dayHex[0], LW.C.g]].forEach(function (x) {
        var tr = TRI_OF(x[1]);
        if (tr.indexOf(L.t) >= 0) add(k, x[2], x[0] + ' ' + x[1]);
        if (tr.indexOf(L.op) >= 0 && !bridge(L, tr)) add(k, -x[2], x[0] + ' ' + x[1]);
      });
    });
    return { tot: Math.round(tot * 100) / 100, w: w };
  }
  function cap(k) { return k.charAt(0).toUpperCase() + k.slice(1); }

  // ── Context and day score ──────────────────────────────────────────────────
  // R = XKDGHeluo.fromPillars(Pn, male); Pn = birth pillars (XKDGSolarTime)
  function context(R, Pn, male) {
    return { R: R, Pn: Pn, male: !!male, natVoids: voids(Pn.day).concat(voids(R.input.heluoYearPillar)), prof: profile(R, Pn, male) };
  }
  function scoreDay(ctx, Pe, lon, purpose) {
    var p = predict(ctx.R, Pe, lon); if (p.none) return null;
    var pers = persona(p.hx, p.per.line), T = { y: Pe.year[1], m: Pe.month[1], d: Pe.day[1] };
    var c = level(p.id.cycle[0], p.id.cycle[1], pers, purpose, T, ctx.natVoids);
    var a = level(p.id.year[0], p.id.year[1], pers, purpose, T, ctx.natVoids);
    var d = level(p.id.day[0], p.id.day[1], pers, purpose, T, ctx.natVoids);
    var L = luckDay(ctx.prof, p, T);
    var tot = Math.round((c.tot + a.tot + d.tot + L.tot) * 100) / 100;
    var warn = [];
    if (d.r === 'G') warn.push('Ghost on the day line');
    [['cycle', c], ['annual', a], ['day', d]].forEach(function (x) {
      x[1].tm.note.forEach(function (n) { if (/^冲/.test(n) && !/excites/.test(n)) warn.push(x[0] + ' line ' + x[1].b + ' ' + n); });
      if (x[1].tm.note.indexOf('空 void') >= 0) { var sm = x[1].tm.note.filter(function (n) { return /^same /.test(n); }).map(function (n) { return n.slice(5); });
        warn.push(x[0] + ' line ' + x[1].b + ' in true void' + (sm.length ? ' (same branch as ' + sm.join(', ') + ')' : '')); }
    });
    return { Pe: Pe, p: p, pers: pers, T: T, c: c, a: a, d: d, L: L, tot: tot, warn: warn };
  }
  // pillars at true-solar noon of a TST calendar date (no time zone needed)
  function pillarsTstNoon(y, mo, d, lon) {
    var ST_ = STm(), tst = Date.UTC(y, mo - 1, d, 12, 0, 0), eot = ST_.equationOfTimeMinutes(new Date(tst - lon * 4 * 60000));
    return ST_.pillarsFromUtc(tst - (lon * 4 + eot) * 60000, lon);
  }
  // scan [fromMs, toMs] (UTC midnights of TST dates), max 366 days
  function scan(ctx, fromMs, toMs, lon, purpose) {
    var out = [], D = 86400000;
    for (var t = fromMs, n = 0; t <= toMs && n < 366; t += D, n++) {
      var dt = new Date(t), Pe = pillarsTstNoon(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), lon);
      var g = Pe && scoreDay(ctx, Pe, lon, purpose); if (g) { g.date = t; out.push(g); }
    }
    var sorted = out.slice().sort(function (x, y) { return y.tot - x.tot; });
    out.forEach(function (g) {
      var above = out.filter(function (x) { return x.tot > g.tot; }).length, same = out.filter(function (x) { return x.tot === g.tot; }).length;
      g.rank = above + (same + 1) / 2; g.n = out.length;
    });
    return { days: out, sorted: sorted };
  }

  // ── Cycle reading (rules 1–4 of hlls-regole-lettura-wealth.md) ────────────
  function cycleRows(R) {
    var rows = [], y0 = R.input.o.year;
    [['XT', R.xianTian, R.cyclesXT, R.huXT], ['HT', R.houTian && R.houTian.hex, R.cyclesHT, R.huHT]].forEach(function (g) {
      var hx = g[1]; if (!hx) return;
      g[2].forEach(function (c) {
        var me = persona(hx, c.line), L = NJ()[hx.n].lines[c.line - 1], r = rel(me, L.el), src = [];
        if (r === 'W') src.push({ k: 'W', t: 'cycle line ' + L.branch + ' is Wealth (rule 3.0)' });
        var two = TRI_EL[hx.upper] !== TRI_EL[hx.lower], other = c.line <= 3 ? hx.upper : hx.lower;
        if (two) { var ro = rel(me, TRI_EL[other]); src.push({ k: ro, t: (c.line <= 3 ? 'above: ' : 'below: ') + other + ' = ' + REL[ro] + (ro === 'W' ? ' (rule 3.1)' : '') }); }
        var hu = g[3], inLo = c.line >= 2 && c.line <= 4, inUp = c.line >= 3 && c.line <= 5;
        if (inLo) { var rl = rel(me, TRI_EL[hu.lower]); src.push({ k: rl, t: 'lower Hu ' + hu.lower + ' = ' + REL[rl] + (rl === 'W' ? ' (rule 3.2)' : '') }); }
        if (inUp) { var ru = rel(me, TRI_EL[hu.upper]); src.push({ k: ru, t: 'upper Hu ' + hu.upper + ' = ' + REL[ru] + (ru === 'W' ? ' (rule 3.2)' : '') }); }
        if (L.fushen) { var rf = rel(me, L.fushen.el); src.push({ k: rf, t: 'hidden ' + L.fushen.branch + ' = ' + REL[rf] + (rf === 'W' ? ' (rule 3.5, activated by the year branch)' : '') }); }
        var lk = [];
        ['heaven', 'earth', 'fame'].forEach(function (k) {
          if (brTri(L.branch) === R.luck[k]) lk.push('+' + cap(k));
        });
        src.forEach(function (o) { o.t = o.t.replace(/= (Parent|Wealth|Ghost|Children|Brothers)/, function (m, w) { return '= ' + w.charAt(0); }).replace(' is Wealth', ' = W'); });
        rows.push({ phase: g[0], hx: hx, c: c, me: me, L: L, r: r, src: src, luck: lk, y1: y0 + c.from - 1, y2: y0 + c.to - 1 });
      });
    });
    return rows;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { context: context, scoreDay: scoreDay, scan: scan, predict: predict, profile: profile, luckDay: luckDay, pillarsTstNoon: pillarsTstNoon,
      cycleRows: cycleRows, PURPOSES: PURPOSES, rel: rel, persona: persona, voids: voids };
  }
  if (typeof document === 'undefined') return;

  // ── UI (English only, Edu 10/11) ───────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function U() { return H().ui || {}; }
  var EL_CN = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function fmtDate(ms) { var d = new Date(ms); return WD[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function isoDay(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function sgn(x) { return (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(Math.round(x * 100) / 100); }
  var RC = { W: '#2e7d32', C: '#1565c0', P: '#6a1b9a', G: '#c62828', B: '#795548' };
  function relTag(r) { return '<b style="color:' + RC[r] + ';">' + r + '</b>'; }
  var S_ = 'font-size:12px;color:#333;line-height:1.55;';

  // Reading block for the Chart tab: cycles with person, relation, Wealth sources, line statement; next years.
  function readingHtml(R, male) {
    if (!NJ()) return '';
    var rows = cycleRows(R), nowY = H().heluoYearOf(), y0 = R.input.o.year, nowAge = nowY - y0 + 1, TD = 'padding:3px 5px;vertical-align:top;';
    var h = '<details open style="margin-top:12px;border:1px solid #d1c4e9;border-radius:8px;padding:8px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:#4527a0;">Cycle reading · person, relations, Wealth</summary>'
      + '<div style="font-size:11px;color:#666;margin:4px 0;">Relations on the person (rule 2): the person is the element of the trigram that holds the cycle line (rule 1). Tap a row for the drawing and the line text.</div>'
      + '<table style="border-collapse:collapse;font-size:12px;width:100%;"><tr style="color:#777;text-align:left;"><th style="' + TD + '">Age · years</th><th style="' + TD + '">Line</th><th style="' + TD + '">Person</th><th style="' + TD + '">Branch</th></tr>';
    rows.forEach(function (x, i) {
      var on = nowAge >= x.c.from && nowAge <= x.c.to, id = 'hl-rd-' + i, w = x.r === 'W' || x.src.some(function (s) { return s.k === 'W'; });
      h += '<tr onclick="xkdgHLCycle(\'' + id + '\')" style="cursor:pointer;border-top:1px solid #eee;' + (on ? 'background:#fff3e0;font-weight:600;' : w ? 'background:#f1f8e9;' : '') + '">'
        + '<td style="' + TD + 'white-space:nowrap;"><b>' + x.c.from + '–' + x.c.to + '</b>' + (on ? ' ◀' : '') + '<div style="font-size:10px;color:#888;">' + x.y1 + '–' + x.y2 + '</div></td>'
        + '<td style="' + TD + 'white-space:nowrap;">' + x.phase + ' ' + x.hx.n + ' l' + x.c.line + '</td><td style="' + TD + 'white-space:nowrap;">' + x.me + '</td>'
        + '<td style="' + TD + 'white-space:nowrap;">' + x.L.branch + ' ' + relTag(x.r) + (x.luck.length ? ' <span style="color:#e65100;">' + x.luck.join(' ') + '</span>' : '') + '</td>'
        + '</tr>' + (x.src.length ? '<tr onclick="xkdgHLCycle(\'' + id + '\')" style="cursor:pointer;' + (on ? 'background:#fff3e0;' : w ? 'background:#f1f8e9;' : '') + '"><td></td><td colspan="3" style="padding:0 5px 4px;font-size:11px;">' + x.src.map(function (s) { return '<span style="color:' + RC[s.k] + ';">' + esc(s.t) + '</span>'; }).join(' · ') + '</td></tr>' : '')
        + '<tr id="' + id + '" style="display:none;"><td colspan="4" style="padding:2px 6px 8px;">' + (U().cycleHexSvg ? U().cycleHexSvg(x.hx, x.c.line, x.phase === 'XT' ? R.cyclesXT : R.cyclesHT) : '')
        + (U().lineBody ? U().lineBody(x.hx.n, x.c.line) : '') + '</td></tr>';
    });
    h += '</table>';
    // single-element natives: Wealth from the year branches (rule 3.3) and Output that generates Wealth (rule 3.6)
    [['Xian Tian', R.xianTian], ['Hou Tian', R.houTian && R.houTian.hex]].forEach(function (g) {
      var hx = g[1]; if (!hx || TRI_EL[hx.upper] !== TRI_EL[hx.lower]) return;
      var me = TRI_EL[hx.upper], wEl = CTRL[me], oEl = GEN[me], wBr = BR.split('').filter(function (b) { return BR_EL[b] === wEl; }).join('');
      var hu = g[0] === 'Xian Tian' ? R.huXT : R.huHT, huW = [hu.upper, hu.lower].some(function (t) { return TRI_EL[t] === wEl; });
      h += '<div style="' + S_ + 'margin-top:6px;">' + g[0] + ' ' + hx.n + ' has one element: the person is ' + me + ', Wealth is ' + wEl + (huW ? ' (present in the Hu Gua, rule 3.2)' : ' (not in the trigrams or the Hu Gua)')
        + '. Years with branch ' + wBr + ' bring Wealth (rule 3.3); with no Wealth in the native, look for Output (' + oEl + ') in the annual hexagrams: money made by creating (rule 3.6), if the cycle line is not Ghost.</div>';
    });
    // next years: annual hexagram, moved line, relation, elements of the trigrams, Luck trigrams (with age)
    h += '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:10px 0 3px;">This year and the next ones</div>'
      + '<table style="border-collapse:collapse;font-size:12px;width:100%;"><tr style="color:#777;text-align:left;"><th style="' + TD + '">Year · age</th><th style="' + TD + '">Annual</th><th style="' + TD + '">Moved line</th><th style="' + TD + '">Trigrams · Luck</th></tr>';
    for (var Y = nowY; Y < nowY + 10; Y++) {
      var a = H().annual(R, Y); if (a.none) continue;
      var me = persona(a.periodHex, a.period.line), L = NJ()[a.hex.n].lines[a.moved - 1], r = rel(me, L.el), id2 = 'hl-ry-' + Y;
      var tr = [a.hex.upper, a.hex.lower], lk = [];
      ['heaven', 'earth', 'fame'].forEach(function (k) { if (tr.indexOf(R.luck[k]) >= 0) lk.push('<span style="color:#2e7d32;">+' + cap(k) + '</span>'); if (tr.indexOf(R.luck.opposite[k]) >= 0) lk.push('<span style="color:#c62828;">−' + cap(k) + '</span>'); });
      h += '<tr onclick="xkdgHLCycle(\'' + id2 + '\')" style="cursor:pointer;border-top:1px solid #eee;' + (Y === nowY ? 'background:#fff3e0;font-weight:600;' : '') + '"><td style="' + TD + 'white-space:nowrap;">' + Y + ' · ' + a.age + '</td>'
        + '<td style="' + TD + '">' + a.hex.n + ' ' + esc(U().hexName ? U().hexName(a.hex.n) : '') + '</td><td style="' + TD + 'white-space:nowrap;">l' + a.moved + ' ' + L.branch + ' ' + relTag(r) + '</td>'
        + '<td style="' + TD + 'font-size:11px;">' + a.hex.upper + ' ' + relTag(rel(me, TRI_EL[a.hex.upper])) + ' / ' + a.hex.lower + ' ' + relTag(rel(me, TRI_EL[a.hex.lower])) + (lk.length ? '<br>' + lk.join(' ') : '') + '</td></tr>'
        + '<tr id="' + id2 + '" style="display:none;"><td colspan="4" style="padding:2px 6px 8px;">' + (U().cycleHexSvg ? U().cycleHexSvg(a.hex, a.moved, yPer(a), me) : '') + (U().lineBody ? U().lineBody(a.hex.n, a.moved, true) : '') + '</td></tr>';
    }
    h += '</table>' + luckProfileHtml(R, context(R, R.input.Pn || null, male)) + '</details>';
    return h;
  }
  function yPer(a) { // months of each line of an annual hexagram (true solar time: GPS, else birth place)
    try { var lon = NaN; try { lon = STm().currentLonTz().lonDeg; } catch (e) {} if (!isFinite(lon)) lon = H().currentChart().c.lon;
      return H().periods.annual(H().periods.months(a.year, lon)); } catch (e) { return null; }
  }
  function luckProfileHtml(R, ctx) {
    if (!ctx || !ctx.prof) return '';
    var K = ctx.prof.K, TD = 'padding:3px 6px;';
    var h = '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:10px 0 3px;">The three Luck in the Date Selection</div><table style="border-collapse:collapse;font-size:12px;width:100%;">'
      + '<tr style="color:#777;text-align:left;"><th style="' + TD + '"></th><th style="' + TD + '">Trigram</th><th style="' + TD + '">In the native</th><th style="' + TD + '">Yin/yang</th><th style="' + TD + '">Time</th><th style="' + TD + '">Weight</th></tr>';
    ['heaven', 'earth', 'fame'].forEach(function (k) {
      var L = K[k];
      h += '<tr style="border-top:1px solid #eee;"><td style="' + TD + '">' + cap(k) + ' Luck</td><td style="' + TD + '">' + L.t + ' <span style="color:#999;">(opp. ' + L.op + ')</span></td>'
        + '<td style="' + TD + '">' + (L.inNat ? 'yes' : 'no') + (L.opNat ? ', opposite too' : '') + '</td><td style="' + TD + '">' + L.yt + ' ×' + L.yy + '</td><td style="' + TD + '">' + L.tkCn + ' ×' + TM[L.tk] + '</td>'
        + '<td style="' + TD + '"><b>' + (L.vuoto ? '0 (void)' : '×' + (Math.round(L.m * 1000) / 1000)) + '</b></td></tr>';
    });
    return h + '</table><div style="font-size:10px;color:#999;margin-top:3px;">A void Luck (all its branches true void from the birth day) counts again when the year, month or day branch clashes them. Fixed weights (Edu, 10/11/2026).</div>';
  }

  // ── Date Selection tab ─────────────────────────────────────────────────────
  var _st = { purpose: 'wealth', from: null, to: null, place: 'gps', res: null, open: null };
  function placeLon(c) {
    if (_st.place === 'birth' && c && isFinite(c.lon)) return { lon: c.lon, lbl: 'birth place' };
    var lon = NaN; try { lon = STm().currentLonTz().lonDeg; } catch (e) {}
    if (isFinite(lon)) return { lon: lon, lbl: 'current GPS' };
    return c && isFinite(c.lon) ? { lon: c.lon, lbl: 'birth place (no GPS)' } : null;
  }
  function render(box, chart) {
    if (!chart || !chart.R) { box.innerHTML = '<div style="font-size:12px;color:#888;">Choose a person with birth date, hour and gender in the Chart tab first.</div>'; return; }
    if (!_st.from) { var t = new Date(), d0 = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()); _st.from = isoDay(d0); _st.to = isoDay(d0 + 30 * 86400000); }
    var F = 'padding:5px;border:1px solid #b39ddb;border-radius:5px;font-size:13px;', Lb = 'font-size:11px;color:#666;display:block;margin-bottom:2px;';
    var pl = placeLon(chart.c);
    var h = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px;">'
      + '<div><label style="' + Lb + '">Purpose</label><select id="hlds-pu" style="' + F + '">' + Object.keys(PURPOSES).map(function (k) { return '<option value="' + k + '"' + (k === _st.purpose ? ' selected' : '') + '>' + PURPOSES[k].label + '</option>'; }).join('') + '</select></div>'
      + '<div><label style="' + Lb + '">From</label><input id="hlds-from" type="date" value="' + _st.from + '" style="' + F + '"></div>'
      + '<div><label style="' + Lb + '">To (max 1 year)</label><input id="hlds-to" type="date" value="' + _st.to + '" style="' + F + '"></div>'
      + '<div><label style="' + Lb + '">Place</label><select id="hlds-pl" style="' + F + '"><option value="gps"' + (_st.place === 'gps' ? ' selected' : '') + '>Current GPS</option><option value="birth"' + (_st.place === 'birth' ? ' selected' : '') + '>Birth place</option></select></div>'
      + '<button onclick="xkdgHLDSRun()" style="padding:6px 14px;border:none;border-radius:6px;background:#5e35b1;color:#fff;font-size:13px;cursor:pointer;">Find days</button></div>'
      + '<div id="hlds-info" style="font-size:11px;color:#666;margin-bottom:6px;">' + esc(chart.c.name) + ' · ' + (chart.male ? 'man' : 'woman') + (pl ? ' · days in true solar time at ' + pl.lbl + ' (longitude ' + Math.round(pl.lon * 100) / 100 + '°)' : ' · <span style="color:#c0392b;">no longitude: set the GPS</span>') + '</div>'
      + '<div id="hlds-res"></div>';
    box.innerHTML = h;
    if (_st.res && _st.res.key === key(chart)) results(chart);
  }
  function key(chart) { return chart.c.name + '|' + chart.c.date + '|' + chart.c.time + '|' + chart.male + '|' + _st.purpose + '|' + _st.from + '|' + _st.to + '|' + _st.place; }
  root.xkdgHLDSRun = function () {
    var chart = H().currentChart && H().currentChart(); if (!chart || !chart.R) return;
    _st.purpose = $('hlds-pu').value; _st.from = $('hlds-from').value; _st.to = $('hlds-to').value; _st.place = $('hlds-pl').value; _st.open = null;
    var a = Date.parse(_st.from + 'T00:00:00Z'), b = Date.parse(_st.to + 'T00:00:00Z'), out = $('hlds-res');
    if (!isFinite(a) || !isFinite(b) || b < a) { out.innerHTML = '<div style="color:#c0392b;font-size:12px;">Check the dates.</div>'; return; }
    if (b - a > 365 * 86400000) { b = a + 365 * 86400000; _st.to = isoDay(b); $('hlds-to').value = _st.to; }
    var pl = placeLon(chart.c); if ($('hlds-info') && pl) $('hlds-info').innerHTML = esc(chart.c.name) + ' · ' + (chart.male ? 'man' : 'woman') + ' · days in true solar time at ' + pl.lbl + ' (longitude ' + Math.round(pl.lon * 100) / 100 + '°)';
    if (!pl) { out.innerHTML = '<div style="color:#c0392b;font-size:12px;">No longitude: set the GPS or the birth place.</div>'; return; }
    out.innerHTML = '<div style="font-size:12px;color:#888;">Calculating…</div>';
    setTimeout(function () {
      try {
        var ctx = context(chart.R, chart.Pn, chart.male), r = scan(ctx, a, b, pl.lon, _st.purpose);
        _st.res = { key: key(chart), r: r, lon: pl.lon }; results(chart);
      } catch (e) { out.innerHTML = '<div style="color:#c0392b;font-size:12px;">Calculation failed: ' + esc(e && e.message) + '</div>'; }
    }, 20);
  };
  root.xkdgHLDSOpen = function (t) { _st.open = _st.open === t ? null : t; var chart = H().currentChart(); if (chart) results(chart); };
  root.xkdgHLDSAll = function () { _st.all = !_st.all; var chart = H().currentChart(); if (chart) results(chart); };
  function results(chart) {
    var out = $('hlds-res'), r = _st.res.r; if (!out) return;
    if (!r.days.length) { out.innerHTML = '<div style="font-size:12px;color:#888;">No day inside the Xian Tian / Hou Tian cycles.</div>'; return; }
    var list = _st.all ? r.days : r.sorted.slice(0, 15), TD = 'padding:4px 5px;', n = r.days.length;
    var h = '<div style="font-size:12px;color:#333;margin:4px 0;">' + (_st.all ? 'All ' + n + ' days in date order' : 'Best 15 of ' + n + ' days') + ' · purpose <b>' + _st.purpose + '</b> · '
      + '<a href="javascript:void 0" onclick="xkdgHLDSAll()" style="color:#5e35b1;">' + (_st.all ? 'show the best' : 'show all days') + '</a></div>'
      + '<table style="border-collapse:collapse;font-size:12px;width:100%;"><tr style="color:#777;text-align:left;"><th style="' + TD + '">Day</th><th style="' + TD + '">Score</th><th style="' + TD + '">Day · annual · cycle line</th></tr>';
    list.forEach(function (g) {
      var on = _st.open === g.date, pct = Math.max(1, Math.round(100 * g.rank / g.n));
      h += '<tr onclick="xkdgHLDSOpen(' + g.date + ')" style="cursor:pointer;border-top:1px solid #eee;' + (on ? 'background:#ede7f6;' : '') + '">'
        + '<td style="' + TD + 'white-space:nowrap;">' + fmtDate(g.date) + '<div style="font-size:10px;color:#999;">' + g.Pe.day + ' day · ' + g.Pe.month + ' month · age ' + g.p.age + '</div></td>'
        + '<td style="' + TD + '"><b>' + sgn(g.tot) + '</b><div style="font-size:10px;color:#999;">top ' + pct + '%</div></td>'
        + '<td style="' + TD + 'font-size:11px;line-height:1.5;">' + g.d.hexN + ' l' + g.d.line + ' ' + g.d.b + ' ' + relTag(g.d.r) + ' ' + sgn(g.d.tot)
        + ' · ' + g.a.b + ' ' + relTag(g.a.r) + ' ' + sgn(g.a.tot) + ' · ' + g.c.b + ' ' + relTag(g.c.r) + ' ' + sgn(g.c.tot)
        + '<br>Luck ' + sgn(g.L.tot) + (g.warn.length ? ' <span style="color:#c62828;">⚠ ' + esc(g.warn.join('; ')) + '</span>' : '') + '</td></tr>';
      if (on) h += '<tr><td colspan="3" style="padding:4px 4px 10px;">' + detail(chart, g) + '</td></tr>';
    });
    out.innerHTML = h + '</table><div style="font-size:10px;color:#999;margin-top:6px;line-height:1.5;">Score = cycle line + moved line of the annual + day line in the block hexagram (relation for the purpose, time of the branch against year, month and day, line text) + the three Luck. '
      + 'Relations: ' + Object.keys(REL).map(function (k) { return k + ' ' + REL[k]; }).join(', ') + '. Fixed weights (Edu, 10/11/2026), tested on 6 events only: an indication, not yet a proof.</div>';
  }
  function lvlHtml(title, x, hx, cy, me) {
    var tl = x.V > 0 ? 'favourable version' : x.V < 0 ? 'unfavourable version' : 'neutral';
    return '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;">'
      + '<div style="font-size:12px;font-weight:600;color:#4527a0;">' + title + ' · ' + x.hexN + ' ' + esc(U().hexName ? U().hexName(x.hexN) : '') + ' line ' + x.line + ' · ' + sgn(x.tot) + '</div>'
      + (U().cycleHexSvg ? U().cycleHexSvg(hx, x.line, cy, me) : '')
      + '<div style="' + S_ + '">' + x.b + ' ' + x.el + ' = ' + x.r + ' for the person ' + me + ' (' + sgn(x.rs) + ') · time ' + sgn(x.tm.t) + ' [' + (x.tm.note.join(', ') || '—') + '] · text ' + x.s + ' → ' + x.txt + ' (' + tl + ')</div>'
      + (U().lineBody ? U().lineBody(x.hexN, x.line, true) : '') + '</div>';
  }
  function detail(chart, g) {
    var p = g.p, R = chart.R, me = g.pers, dh = p.daily, HX = H(), PD = HX.periods, D = 86400000, lon = _st.res.lon;
    // period of every line (true solar time at the place): months of the annual, blocks of the monthly, days of the block
    var aP = null, mP = null, bP = null, dP = null;
    try {
      var ms = PD.months(p.year, lon), i = p.month.index - 1;
      var d0 = g.date - (p.dayOfMonth - 1) * D, endDay = PD.dayMs(ms[i + 1].start || ms[i + 1].end), startDay = d0;
      var bS = d0 + Math.floor((p.dayOfMonth - 1) / 5) * 5 * D;
      aP = PD.annual(ms); mP = PD.month(d0, startDay, endDay); bP = PD.block(dh.lord, bS, startDay, endDay); dP = PD.day(dh.line, g.date);
    } catch (e) {}
    var h = '<div style="' + S_ + '"><b>' + fmtDate(g.date) + '</b> · age ' + p.age + ' · Heluo year ' + p.year + ' · ' + p.phase + ' ' + p.hx.n + ' line ' + p.per.line + ' (age ' + p.per.from + '–' + p.per.to + ') · person <b>' + me + '</b>'
      + '<br>Pillars (Day · Month · Year, true-solar noon): ' + g.Pe.day + ' · ' + g.Pe.month + ' · ' + g.Pe.year + ' · day ' + p.dayOfMonth + ' of month ' + p.month.index + ' (' + H().QI_EN[p.month.index - 1] + ') · rank ' + g.rank + ' of ' + g.n + '</div>';
    if (g.warn.length) h += '<div style="font-size:12px;color:#c62828;margin:4px 0;">⚠ ' + esc(g.warn.join(' · ')) + '</div>';
    h += lvlHtml('1 · Cycle', g.c, p.hx, p.phase === 'XT' ? R.cyclesXT : R.cyclesHT, me)
      + lvlHtml('2 · Annual (moved line)', g.a, p.annual.hex, aP, me)
      + '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;"><div style="font-size:12px;font-weight:600;color:#4527a0;">3 · Monthly ' + p.month.hex.n + ' ' + esc(U().hexName ? U().hexName(p.month.hex.n) : '') + ' (month ' + p.month.index + ', line ' + p.month.line + ' of the annual) → Lord of the Block line ' + dh.lord + ' → block ' + dh.block.n + '</div>'
      + (U().cycleHexSvg ? U().cycleHexSvg(p.month.hex, dh.lord, mP, me) + U().cycleHexSvg(dh.block, dh.lord, bP, me) : '') + '</div>'
      + lvlHtml('4 · Day line in the block hexagram', g.d, dh.block, bP, me)
      + '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;"><div style="font-size:12px;font-weight:600;color:#4527a0;">5 · Day hexagram ' + dh.hex.n + ' ' + esc(U().hexName ? U().hexName(dh.hex.n) : '') + ' line ' + dh.line + ' (course of the day)</div>'
      + (U().cycleHexSvg ? U().cycleHexSvg(dh.hex, dh.line, dP, me) : '') + (U().lineBody ? U().lineBody(dh.hex.n, dh.line, true) : '') + '</div>'
      + '<div style="' + S_ + '"><b>Luck ' + sgn(g.L.tot) + '</b>: ' + (esc(g.L.w.join(' · ')) || 'none') + '</div>';
    return h;
  }

  root.XKDGHeluoDS = { render: render, readingHtml: readingHtml, context: context, scoreDay: scoreDay, scan: scan, PURPOSES: PURPOSES };
})(typeof window !== 'undefined' ? window : globalThis);

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
  // Cures (Edu, 11/11/2026): yin/yang of a hexagram from its trigrams, as in the natal reading — Qian, Zhen, Kan, Gen are
  // yang, Kun, Xun, Li, Dui yin. Two yang trigrams = yang, two yin = yin, one and one = neutral.
  var YANG_T = { Qian: 1, Zhen: 1, Kan: 1, Gen: 1 };
  function yyTri(h) { var n = (YANG_T[h.upper] ? 1 : 0) + (YANG_T[h.lower] ? 1 : 0); return n === 2 ? 'yang' : n === 0 ? 'yin' : null; }
  // Natal voids (Edu, 11/11/2026): counted from the DAY pillar. A void branch that stands in the bazi NEXT to the branch
  // that clashes it (hour–day, day–month, month–year) comes out of the void; far apart (e.g. month and hour) it does not.
  // → { all: the two void branches, out: those released by the adjacent clash, list: the ones still void }
  function natalVoids(Pn) {
    var v = voids(Pn.day), br = [Pn.hour[1], Pn.day[1], Pn.month[1], Pn.year[1]], out = [];
    v.forEach(function (b) { for (var i = 0; i < 3; i++) if ((br[i] === b && br[i + 1] === clash(b)) || (br[i + 1] === b && br[i] === clash(b))) { if (out.indexOf(b) < 0) out.push(b); } });
    return { all: v, out: out, list: v.filter(function (b) { return out.indexOf(b) < 0; }) };
  }
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
  // 3) a control by a time branch whose element is the relation of the purpose (Wealth for a Wealth event) is no penalty.
  // 4) the line of the annual that rules the month (line k for months 2k-1 and 2k) is scored as its own level, read in
  //    the monthly hexagram.
  var SANHUI = { Wood: '寅卯辰', Fire: '巳午未', Metal: '申酉戌', Water: '亥子丑' };
  function sanhui(b, T) {
    var have = b + T.y + T.m + T.d;
    for (var el in SANHUI) if (SANHUI[el].indexOf(b) >= 0 && SANHUI[el].split('').every(function (x) { return have.indexOf(x) >= 0; })) return el;
    return null;
  }
  // ── Voids in time (Edu, 12/11/2026) ──
  // A void timely in the birth month is STILL void, but comes out easily: with the same branch in the year, month or day
  // (填實), with a clash from the time by a branch that is timely (in the season of the date), or when a moving line of the
  // time carries the branch (what moves cannot be void). An untimely void hardly comes out: it needs a year AND a month
  // that make it timely; then the same three ways. At birth (V.birth) nothing releases it (only the adjacent clash, natalVoids).
  // V = { list: natal voids, mb: birth month branch, moved: branches of the moving lines, birth: true|false }
  function voidExit(b, mbBirth, T, moved) {
    var el = BR_EL[b], cl = clash(b), Ts = [T.y, T.m, T.d], easy = timely(el, mbBirth);
    var gate = easy || (!!T.y && !!T.m && timely(el, T.y) && timely(el, T.m));
    var how = !gate ? null : Ts.indexOf(b) >= 0 ? 'same' : (Ts.indexOf(cl) >= 0 && T.m && timely(BR_EL[cl], T.m)) ? 'clash' : (moved && moved.indexOf(b) >= 0) ? 'moved' : null;
    return { easy: easy, gate: gate, out: !!how, how: how };
  }
  // branches of the moving lines of the time: annual moved line, line of the month, line of the day (block hexagram)
  function movedBranches(p) {
    var br = function (n, l) { return n && l ? NJ()[n].lines[l - 1].branch : null; };
    return [br(p.id.year[0], p.id.year[1]), br(p.month.hex.n, p.month.line), br(p.id.day[0], p.id.day[1])].filter(Boolean);
  }
  var VOID_HOW = { same: 'filled by the same branch', clash: 'clashed by a timely branch', moved: 'it moves' };
  // time judgement of branch b against year, month, day branches (T = { y, m, d }); natVoids = list or V (see voidExit)
  function tempo(b, T, natVoids, favEl) {
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
      if (x !== b && CTRL[BR_EL[x]] === el && !(forte && !timely(BR_EL[x], T.m))) {
        if (favEl && BR_EL[x] === favEl) note.push('剋 ' + k + ' by the purpose relation (no penalty)'); else { t -= 0.5; note.push('剋 ' + k); } }
    });
    var V = natVoids && natVoids.list ? natVoids : { list: natVoids || [], birth: true };
    if (V.list.indexOf(b) >= 0) {
      var vx = V.birth ? { easy: V.mb ? timely(BR_EL[b], V.mb) : false, out: false } : voidExit(b, V.mb, T, V.moved);
      if (vx.out) note.push('void out (' + VOID_HOW[vx.how] + ')');
      else { t -= 1; note.push('空 void'); note.push(vx.easy ? 'void easy to leave (timely at birth)' : 'void hard to leave (untimely at birth)'); }
    }
    return { t: t, note: note };
  }
  // one level of the cascade: line `line` of hexagram hexN; text score moved ±1 towards the version chosen by time
  function level(hexN, line, pers, purpose, T, natVoids) {
    var favEl = Object.keys(GEN).filter(function (e) { return PURPOSES[purpose].w[rel(pers, e)] === 2; })[0];
    var L = NJ()[hexN].lines[line - 1], sh = sanhui(L.branch, T), r = rel(pers, sh || L.el), tm = tempo(L.branch, T, natVoids, favEl);
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
    return { R: R, Pn: Pn, male: !!male, natVoids: natalVoids(Pn).list,   // Edu, 11/11/2026: from the DAY pillar only, minus those released by an adjacent clash in the bazi
       prof: profile(R, Pn, male) };
  }
  function scoreDay(ctx, Pe, lon, purpose) {
    var p = predict(ctx.R, Pe, lon); if (p.none) return null;
    var pers = persona(p.hx, p.per.line), T = { y: Pe.year[1], m: Pe.month[1], d: Pe.day[1] };
    var V = { list: ctx.natVoids, mb: ctx.Pn.month[1], moved: movedBranches(p) };
    var c = level(p.id.cycle[0], p.id.cycle[1], pers, purpose, T, V);
    var a = level(p.id.year[0], p.id.year[1], pers, purpose, T, V);
    var m = level(p.month.hex.n, p.month.line, pers, purpose, T, V);
    // secondary text (Edu, 11/11/2026): the same line in the changed (day) hexagram, the outcome, at half weight;
    // the primary text is the day line in the block hexagram (cause, action)
    var s2 = level(p.id.dayHex[0], p.id.dayHex[1], pers, purpose, T, V);
    var d = level(p.id.day[0], p.id.day[1], pers, purpose, T, V);
    var L = luckDay(ctx.prof, p, T);
    var tot = Math.round((c.tot + a.tot + m.tot + d.tot + 0.5 * s2.tot + L.tot) * 100) / 100;
    var warn = [];
    if (d.r === 'G') warn.push('Ghost on the day line');
    [['cycle', c], ['annual', a], ['month', m], ['day', d]].forEach(function (x) {
      x[1].tm.note.forEach(function (n) { if (/^冲/.test(n) && !/excites/.test(n)) warn.push(x[0] + ' line ' + x[1].b + ' ' + n); });
      if (x[1].tm.note.indexOf('空 void') >= 0) { var sm = x[1].tm.note.filter(function (n) { return /^same /.test(n); }).map(function (n) { return n.slice(5); });
        warn.push(x[0] + ' line ' + x[1].b + ' in true void' + (sm.length ? ' (same branch as ' + sm.join(', ') + ')' : '')); }
    });
    return { Pe: Pe, p: p, pers: pers, T: T, c: c, a: a, m: m, d: d, s2: s2, L: L, tot: tot, warn: warn };
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

  // ── He Luo thread inside the XKDG Date Selection (Edu, 11/11/2026) ───────────────────────────────
  // He Luo does not choose days alone: it raises or lowers days ALREADY favourable for XKDG, with its month, block and
  // day system only (cycle and annual belong to the chart analysis). Thread of the purpose: the relation of the purpose
  // on the line of the month (1), the Lord of the Block (2), the primary line of the day (3) and its outcome (3); a
  // hidden line under the line read counts half; the relation that attacks the purpose (the price) takes the same away.
  // A void line (voids from the birth DAY pillar, see voidExit) is not a penalty: "fruits later". Thread / 3 = ☯ points, from −3 to +3; in the scan each point is 5% of the XKDG score (app-bazi.js _hlApply).
  var XK_REL = { wealth: 'W', career: 'G', speak: 'C', legal: 'P', health: 'C', journey: 'C', support: 'P' }; // relationship: W man, G woman
  var XK_ATT = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' }, XK_W = { m: 1, lord: 2, d: 3, s2: 3 };
  var XK_LBL = { m: 'month line', lord: 'Lord of the Block', d: 'day line (primary)', s2: 'day line (outcome)' };
  function xkRel(key, male) { return key === 'relationship' ? (male ? 'W' : 'G') : (XK_REL[key] || null); }
  function thread(ctx, Pe, lon, key) {
    var p = predict(ctx.R, Pe, lon); if (p.none) return null;
    var pers = persona(p.hx, p.per.line), T = [Pe.year[1], Pe.month[1], Pe.day[1]], yv = natalVoids(ctx.Pn).list, mb0 = ctx.Pn.month[1];
    var X = xkRel(key, ctx.male), A = X ? XK_ATT[X] : null;
    // Edu, 12/11/2026: voids, see voidExit (timely at birth = still void, but easy to leave; untimely = needs year and month in season)
    var TT = { y: T[0], m: T[1], d: T[2] }, mv = movedBranches(p);
    function li(k, n, l) { var L = NJ()[n].lines[l - 1], v = yv.indexOf(L.branch) >= 0, vx = v ? voidExit(L.branch, mb0, TT, mv) : null;
      return { k: k, n: n, l: l, b: L.branch, el: L.el, r: rel(pers, L.el), hid: L.fushen ? { b: L.fushen.branch, r: rel(pers, L.fushen.el) } : null,
        voidL: v, easy: v && vx.easy, filled: v && vx.out, how: vx && vx.how, byClash: v && vx.how === 'clash' }; }
    var Ls = [li('m', p.month.hex.n, p.month.line), li('lord', p.id.lord[0], p.id.lord[1]), li('d', p.id.day[0], p.id.day[1]), li('s2', p.id.dayHex[0], p.id.dayHex[1])];
    var t = 0, on = [], price = [], later = [];
    Ls.forEach(function (L) {
      if (X && L.r === X) { t += XK_W[L.k]; on.push(L); if (L.voidL && !L.filled) later.push(L); }
      else if (X && L.hid && L.hid.r === X) { t += XK_W[L.k] / 2; on.push({ k: L.k, b: L.hid.b, r: X, hidden: true }); }
      if (A && L.r === A) { t -= XK_W[L.k]; price.push(L); }
    });
    // the three Luck (Heaven, Earth, Fame) and their opposites in the monthly, block and day hexagram
    var hx = [['monthly', p.month.hex], ['block', p.daily.block], ['day', p.daily.hex]], lk = [], opp = [];
    ['heaven', 'earth', 'fame'].forEach(function (k) { hx.forEach(function (h) {
      if ([h[1].upper, h[1].lower].indexOf(ctx.R.luck[k]) >= 0) lk.push(cap(k) + ' Luck (' + ctx.R.luck[k] + ') in the ' + h[0] + ' hexagram');
      if ([h[1].upper, h[1].lower].indexOf(ctx.R.luck.opposite[k]) >= 0) opp.push('opposite of ' + cap(k) + ' Luck (' + ctx.R.luck.opposite[k] + ') in the ' + h[0] + ' hexagram');
    }); });
    // Cures: what the natal chart needs to come back into balance (yang or yin), from the block and day hexagram
    var pr = ctx.prof, need = (pr.rY < -0.25 || pr.rE > 0.25) && !(pr.rE < -0.25 || pr.rY > 0.25) ? 'yang' : (pr.rE < -0.25 || pr.rY > 0.25) && !(pr.rY < -0.25 || pr.rE > 0.25) ? 'yin' : null, cure = [];
    function yy(h) { return yyTri(h); }
    var adj = 0;
    if (key === 'luck') adj = lk.length - opp.length;
    else if (key === 'cure') { if (need) [[p.daily.hex, 2, 'day'], [p.daily.block, 1, 'block']].forEach(function (x) { var q = yy(x[0]); if (q) { adj += q === need ? x[1] : -x[1]; cure.push(x[2] + ' hexagram: two ' + q + ' trigrams' + (q === need ? ' (what the chart needs)' : ' (the chart has too much of it)')); } }); }
    else adj = Math.round(t / 3);
    adj = Math.max(-3, Math.min(3, adj));
    return { p: p, pers: pers, Pe: Pe, key: key, X: X, A: A, lines: Ls, t: t, adj: adj, on: on, price: price, later: later, luck: lk, opp: opp, need: need, cure: cure, yv: yv };
  }
  root.XKDGHeluoDSCore = { thread: thread, xkRel: xkRel, tempo: tempo, timely: timely, wang: wang, predict: predict, profile: profile, cycleRows: cycleRows, rel: rel, persona: persona, voids: voids, natalVoids: natalVoids, pillarsTstNoon: pillarsTstNoon, sanhui: sanhui, voidExit: voidExit, movedBranches: movedBranches, VOID_HOW: VOID_HOW };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { thread: thread, context: context, scoreDay: scoreDay, scan: scan, predict: predict, profile: profile, luckDay: luckDay, pillarsTstNoon: pillarsTstNoon,
      cycleRows: cycleRows, PURPOSES: PURPOSES, rel: rel, persona: persona, voids: voids, natalVoids: natalVoids, tempo: tempo, timely: timely, wang: wang, voidExit: voidExit, movedBranches: movedBranches };
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
        + '<tr id="' + id2 + '" style="display:none;"><td colspan="4" style="padding:2px 6px 8px;">' + (U().cycleHexSvg ? U().cycleHexSvg(a.hex, a.moved, yPer(a), me) : '') + (U().lineBody ? U().lineBody(a.hex.n, a.moved, 'year') : '') + '</td></tr>';
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
  // pre-fill from the XKDG Date Selection (heluo-lishu.js openHeluoLishuFor) and run at the next render
  root.xkdgHLDSPreset = function (o) {
    if (o.purpose && PURPOSES[o.purpose]) _st.purpose = o.purpose;
    if (o.from) { _st.from = o.from; _st.to = o.to || o.from; }
    _st.res = null; _st.open = null; _st.autorun = true;
  };
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
    if (_st.autorun && pl) { _st.autorun = false; setTimeout(function () { root.xkdgHLDSRun(); }, 0); return; }
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
      + '<table style="border-collapse:collapse;font-size:12px;width:100%;"><tr style="color:#777;text-align:left;"><th style="' + TD + '">Day</th><th style="' + TD + '">Score</th><th style="' + TD + '">Day · month · annual · cycle line</th></tr>';
    list.forEach(function (g) {
      var on = _st.open === g.date, pct = Math.max(1, Math.round(100 * g.rank / g.n));
      h += '<tr onclick="xkdgHLDSOpen(' + g.date + ')" style="cursor:pointer;border-top:1px solid #eee;' + (on ? 'background:#ede7f6;' : '') + '">'
        + '<td style="' + TD + 'white-space:nowrap;">' + fmtDate(g.date) + '<div style="font-size:10px;color:#999;">' + g.Pe.day + ' day · ' + g.Pe.month + ' month · age ' + g.p.age + '</div></td>'
        + '<td style="' + TD + '"><b>' + sgn(g.tot) + '</b><div style="font-size:10px;color:#999;">top ' + pct + '%</div></td>'
        + '<td style="' + TD + 'font-size:11px;line-height:1.5;">' + g.d.hexN + ' l' + g.d.line + ' ' + g.d.b + ' ' + relTag(g.d.r) + ' ' + sgn(g.d.tot)
        + ' · ' + g.m.b + ' ' + relTag(g.m.r) + ' ' + sgn(g.m.tot) + ' · ' + g.a.b + ' ' + relTag(g.a.r) + ' ' + sgn(g.a.tot) + ' · ' + g.c.b + ' ' + relTag(g.c.r) + ' ' + sgn(g.c.tot)
        + '<br>Luck ' + sgn(g.L.tot) + (g.warn.length ? ' <span style="color:#c62828;">⚠ ' + esc(g.warn.join('; ')) + '</span>' : '') + '</td></tr>';
      if (on) h += '<tr><td colspan="3" style="padding:4px 4px 10px;">' + detail(chart, g) + '</td></tr>';
    });
    out.innerHTML = h + '</table><div style="font-size:10px;color:#999;margin-top:6px;line-height:1.5;">Score = cycle line + moved line of the annual + line of the month in the monthly hexagram + day line in the block hexagram (primary) + half of the same line in the day hexagram (secondary) (relation for the purpose, time of the branch against year, month and day, line text) + the three Luck. '
      + 'Relations: ' + Object.keys(REL).map(function (k) { return k + ' ' + REL[k]; }).join(', ') + '. Fixed weights (Edu, 10/11/2026). Test on 30 new events (11/11/2026): the event day ranks like a random day, so read the texts, not only the score.</div>';
  }
  function lvlHtml(title, x, hx, cy, me, unit) {
    var tl = x.V > 0 ? 'favourable version' : x.V < 0 ? 'unfavourable version' : 'neutral';
    return '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;">'
      + '<div style="font-size:12px;font-weight:600;color:#4527a0;">' + title + ' · ' + x.hexN + ' ' + esc(U().hexName ? U().hexName(x.hexN) : '') + ' line ' + x.line + ' · ' + sgn(x.tot) + '</div>'
      + (U().cycleHexSvg ? U().cycleHexSvg(hx, x.line, cy, me) : '')
      + '<div style="' + S_ + '">' + x.b + ' ' + x.el + ' = ' + x.r + ' for the person ' + me + ' (' + sgn(x.rs) + ') · time ' + sgn(x.tm.t) + ' [' + (x.tm.note.join(', ') || '—') + '] · text ' + x.s + ' → ' + x.txt + ' (' + tl + ')</div>'
      + (U().lineBody ? U().lineBody(x.hexN, x.line, unit || true) : '') + '</div>';
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
      + lvlHtml('2 · Annual (moved line)', g.a, p.annual.hex, aP, me, 'year')
      + lvlHtml('3 · Month ' + p.month.index + ' (line ' + p.month.line + ' of the annual rules months ' + (2 * p.month.line - 1) + '–' + (2 * p.month.line) + ')', g.m, p.month.hex, mP, me, 'month')
      + '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;"><div style="font-size:12px;font-weight:600;color:#4527a0;">Block: monthly ' + p.month.hex.n + ' → Lord of the Block line ' + dh.lord + ' → block ' + dh.block.n + ' ' + esc(U().hexName ? U().hexName(dh.block.n) : '') + '</div>'
      + (U().cycleHexSvg ? U().cycleHexSvg(p.month.hex, dh.lord, mP, me) + U().cycleHexSvg(dh.block, dh.lord, bP, me) : '') + (U().lineBody ? U().lineBody(dh.block.n, dh.lord, 'day') : '') + '</div>'
      + lvlHtml('4 · Day line in the block hexagram — primary text: cause, action', g.d, dh.block, bP, me, 'day')
      + lvlHtml('5 · Same line in the changed (day) hexagram — secondary text: effect, outcome (half weight)', g.s2, dh.hex, dP, me, 'day')
      + '<div style="' + S_ + '"><b>Luck ' + sgn(g.L.tot) + '</b>: ' + (esc(g.L.w.join(' · ')) || 'none') + '</div>';
    return h;
  }

  // ── He Luo in the XKDG Date Selection: adjustment per day and reading of the day (Edu, 11/11/2026) ──────────
  var XK_PL = { wealth: 'Wealth', career: 'Career', relationship: 'Relationship', speak: 'Speak', legal: 'Legal', health: 'Health', journey: 'Journey', support: 'Support', luck: 'Luck', cure: 'Cures' };
  var BR_MON = { 子: 'December', 丑: 'January', 寅: 'February', 卯: 'March', 辰: 'April', 巳: 'May', 午: 'June', 未: 'July', 申: 'August', 酉: 'September', 戌: 'October', 亥: 'November' };
  var _xk = { key: null, by: {}, chart: null, lon: NaN };
  function xkLon(c) { var lon = NaN; try { lon = STm().currentLonTz().lonDeg; } catch (e) {} return isFinite(lon) ? lon : (c && c.lon); }
  // isoDates: days of the XKDG scan; key: XKDG purpose ('' = reading only). → { status, by: { iso: thread } }
  function xkScan(isoDates, key) {
    var ch = H().chartA ? H().chartA() : { err: 'birth' }; if (ch.err) return { status: ch.err, by: {} };
    var lon = xkLon(ch.c); if (!isFinite(lon)) return { status: 'longitude', by: {} };
    var k = [ch.c.name, ch.c.date, ch.c.time, ch.male, key, Math.round(lon * 100)].join('|');
    if (_xk.key !== k) _xk = { key: k, by: {}, chart: ch, lon: lon, ctx: context(ch.R, ch.Pn, ch.male), purpose: key };
    isoDates.forEach(function (iso) {
      if (iso in _xk.by) return;
      var d = iso.split('-').map(Number), th = null;
      try { var Pe = pillarsTstNoon(d[0], d[1], d[2], lon); th = Pe && thread(_xk.ctx, Pe, lon, key); } catch (e) { th = null; }
      _xk.by[iso] = th;
    });
    return { status: 'ok', by: _xk.by };
  }
  function xkSummary(th) { // one line for the row of the scan
    var a = [];
    if (th.key === 'luck') { if (th.luck.length) a.push(th.luck.length + ' Luck'); if (th.opp.length) a.push(th.opp.length + ' opposite'); }
    else if (th.key === 'cure') { if (th.adj) a.push(th.adj > 0 ? 'brings the ' + th.need + ' the chart needs' : 'against the balance (chart needs ' + th.need + ')'); }
    else if (th.X) { if (th.on.length) a.push(REL[th.X] + ' on ' + th.on.map(function (L) { return L.b + (L.hidden ? ' (hidden)' : ''); }).join(' ')); if (th.price.length) a.push('price: ' + REL[th.A]); if (th.later.length) a.push('fruits later'); }
    return a.join(' · ');
  }
  function xkDayHtml(th, iso) {
    var ch = _xk.chart, p = th.p, me = th.pers, dh = p.daily, PD = H().periods, D = 86400000, lon = _xk.lon, date = Date.parse(iso + 'T00:00:00Z');
    var aP = null, mP = null, bP = null, dP = null;
    try {
      var ms = PD.months(p.year, lon), i = p.month.index - 1, d0 = date - (p.dayOfMonth - 1) * D, endDay = PD.dayMs(ms[i + 1].start || ms[i + 1].end);
      var bS = d0 + Math.floor((p.dayOfMonth - 1) / 5) * 5 * D;
      mP = PD.month(d0, d0, endDay); bP = PD.block(dh.lord, bS, d0, endDay); dP = PD.day(dh.line, date);
    } catch (e) {}
    var y0 = ch.R.input.o.year, G = 'color:#2e7d32;', Rd = 'color:#c62828;', O = 'color:#e65100;';
    var h = '<div style="' + S_ + '"><b>' + fmtDate(date) + '</b> · ' + esc(ch.c.name) + ' · age ' + p.age + ' · person <b>' + me + '</b>'
      + '<div style="margin:4px 0;font-size:12px;">Day ' + th.Pe.day + '<br>Month ' + th.Pe.month + '<br>Year ' + th.Pe.year + '</div></div>';
    // what He Luo says for the purpose
    var box = '';
    if (th.key === 'luck') {
      box += th.luck.length ? '<div style="' + G + '">▲ ' + esc(th.luck.join(' · ')) + '</div>' : '<div>None of the three Luck in the hexagrams of this day.</div>';
      if (th.opp.length) box += '<div style="' + Rd + '">▼ ' + esc(th.opp.join(' · ')) + '</div>';
    } else if (th.key === 'cure') {
      box += th.need ? '<div>The natal chart needs <b>' + th.need + '</b> to come back into balance.</div>' + (th.cure.length ? '<div>' + esc(th.cure.join(' · ')) + '</div>' : '<div>Block and day hexagram are balanced: no help, no harm.</div>')
        : '<div>Yin and yang of the natal chart are in line: no cure needed from the day.</div>';
    } else if (th.X) {
      box += th.on.length ? '<div style="' + G + '">▲ ' + REL[th.X] + ' (' + XK_PL[th.key] + ') on: ' + th.on.map(function (L) { return XK_LBL[L.k] + ' ' + L.b + (L.hidden ? ' hidden' : ''); }).join(' · ') + '</div>'
        : '<div>' + REL[th.X] + ' (' + XK_PL[th.key] + ') is not on the lines of this day.</div>';
      if (th.price.length) box += '<div style="' + Rd + '">▼ The price: ' + REL[th.A] + ', which attacks ' + REL[th.X] + ', on ' + th.price.map(function (L) { return XK_LBL[L.k] + ' ' + L.b; }).join(' · ') + '</div>';
      th.later.forEach(function (L) {
        var Y = +iso.slice(0, 4) + 1; while (BR[((Y - 4) % 12 + 12) % 12] !== L.b) Y++;
        box += '<div style="' + O + '">⏳ ' + XK_LBL[L.k] + ' ' + L.b + ' is void: not a no, the fruits come later, when ' + L.b + ' comes out — '
          + (L.easy ? 'easy (in season at birth): the ' + L.b + ' month (' + BR_MON[L.b] + '), the year ' + Y + ' (age ' + (Y - y0 + 1) + '), a timely clash (' + clash(L.b) + ') or when it moves.'
            : 'hard (out of season at birth): only in a year and a month that put ' + L.el + ' in season, then with ' + L.b + ', a clash or when it moves.') + '</div>';
      });
      var cl = th.lines.filter(function (L) { return (L.k === 'd' || L.k === 's2') && th.Pe.day[1] === clash(L.b); });
      if (cl.length) box += '<div style="' + Rd + '">The day branch ' + th.Pe.day[1] + ' clashes ' + cl.map(function (L) { return XK_LBL[L.k] + ' ' + L.b; }).join(' · ') + '</div>';
    } else box += '<div>No purpose chosen: reading only.</div>';
    if (th.key !== 'luck' && (th.luck.length || th.opp.length)) box += '<div style="font-size:11px;color:#555;margin-top:3px;">' + (th.luck.length ? '<span style="' + G + '">' + esc(th.luck.join(' · ')) + '</span>' : '') + (th.luck.length && th.opp.length ? ' · ' : '') + (th.opp.length ? '<span style="' + Rd + '">' + esc(th.opp.join(' · ')) + '</span>' : '') + '</div>';
    var pos = dh.line === 1 ? 'Line 1: a beginning — good for what starts (launch, wedding, first step).' : dh.line === 6 ? 'Line 6: an end or a completion — good for what closes (sale, closing, conclusion).' : '';
    if (pos) box += '<div style="font-size:11px;color:#555;margin-top:3px;">' + pos + '</div>';
    h += '<div style="border:1px solid #b39ddb;background:#f7f3fd;border-radius:8px;padding:8px;margin:6px 0;font-size:12px;line-height:1.55;">'
      + '<div style="font-weight:700;color:#4527a0;">He Luo for ' + (XK_PL[th.key] || 'this day') + (th.adj ? ' · ' + sgn(th.adj * 5) + '% on the XKDG score' : ' · no change to the XKDG score') + '</div>' + box + '</div>';
    function lv(title, L, hx, cy) {
      return '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;"><div style="font-size:12px;font-weight:600;color:#4527a0;">' + title + ' · ' + L.n + ' ' + esc(U().hexName ? U().hexName(L.n) : '') + ' line ' + L.l + '</div>'
        + (U().cycleHexSvg ? U().cycleHexSvg(hx, L.l, cy, me) : '')
        + '<div style="' + S_ + '">' + L.b + ' ' + L.el + ' = ' + relTag(L.r) + ' ' + REL[L.r] + (L.hid ? ' · hidden ' + L.hid.b + ' ' + relTag(L.hid.r) : '') + (L.voidL ? (L.filled ? ' · void, out today (' + VOID_HOW[L.how] + ')' : ' · <span style="' + O + '">void: later' + (L.easy ? ' (easy to leave)' : ' (hard to leave)') + '</span>') : '') + '</div>'
        + (U().lineBody ? U().lineBody(L.n, L.l, L.k === 'm' ? 'month' : 'day') : '') + '</div>';
    }
    var Ls = th.lines;
    h += lv('1 · Month ' + p.month.index + ' — the line of the month', Ls[0], p.month.hex, mP)
      + lv('2 · Lord of the Block (5 days) — the background of these days', Ls[1], dh.block, bP)
      + lv('3 · Day line in the block hexagram — primary text: cause, action', Ls[2], dh.block, bP)
      + lv('4 · Same line in the day hexagram — outcome', Ls[3], dh.hex, dP)
      + '<div style="font-size:10px;color:#999;line-height:1.5;">He Luo raises or lowers days already favourable for XKDG (month, block, day only; from −3 to +3). The texts show the shape of the day — also the price of a success — not a plus or a minus. Years and months: see the He Luo chart reading.</div>';
    return h;
  }
  root.xkdgHLDay = function (iso) {
    var th = _xk.by[iso]; if (!th) return;
    var ov = $('hlxk-ov');
    if (!ov) { ov = document.createElement('div'); ov.id = 'hlxk-ov'; ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10050;overflow:auto;padding:10px;';
      ov.onclick = function (e) { if (e.target === ov) ov.style.display = 'none'; }; document.body.appendChild(ov); }
    ov.innerHTML = '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;padding:10px 12px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><b style="color:#4527a0;font-size:14px;">☯ He Luo · the day</b>'
      + '<button onclick="document.getElementById(\'hlxk-ov\').style.display=\'none\'" style="border:none;background:#eee;border-radius:6px;padding:4px 10px;font-size:13px;cursor:pointer;">Close</button></div>'
      + xkDayHtml(th, iso) + '</div>';
    ov.style.display = 'block'; ov.scrollTop = 0;
  };
  // ── Purpose planner in the chart reading (Edu, 11/11/2026): the wide Date Selection — periods of years, the single
  // year, the month — lives here, not in the XKDG day scan. Same purposes as XKDG. For each period (cycle line), year
  // (moved line of the annual) and month (line of the month in the monthly hexagram): ▲ the relation of the purpose on
  // the line (or hidden under it), ▼ the relation that attacks it (the price), ⏳ void line (fruits later), the three Luck.
  var _pl = { key: null, y0: null, openY: null, openM: null, openC: null };
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function plMark(ch, ctx, key, me, hx, line, yearBranch, monthBranch) {
    var L = NJ()[hx.n].lines[line - 1], X = xkRel(key, ch.male), A = X ? XK_ATT[X] : null, r = rel(me, L.el), m = [], sc = 0;
    var yv = natalVoids(ch.Pn).list, G = 'color:#2e7d32;font-weight:bold;', Rd = 'color:#c62828;font-weight:bold;', O = 'color:#e65100;';
    if (X && r === X) { m.push('<span style="' + G + '">▲ ' + REL[X] + '</span>'); sc += 2; }
    else if (X && L.fushen && rel(me, L.fushen.el) === X) { m.push('<span style="' + G + '">▲ ' + REL[X] + ' hidden (' + L.fushen.branch + ')</span>'); sc += 1; }
    if (A && r === A) { m.push('<span style="' + Rd + '">▼ price: ' + REL[A] + '</span>'); sc -= 2; }
    // voids (Edu, 12/11): the year and month rows read a MOVING line (what moves cannot be void); the period line does not move
    if (yv.indexOf(L.branch) >= 0) {
      var easy = timely(L.el, ch.Pn.month[1]), vt = '';
      if (!yearBranch) vt = easy ? ': easy to leave (same branch, a timely clash or a moving line)' : ': hard to leave (needs a year and a month in its season)';
      else if (!monthBranch) vt = easy ? ', out this year (it moves)' : timely(L.el, yearBranch) ? ': this year can bring it out, in the months of its season' : ': stays void this year (out of season)';
      else { var vx = voidExit(L.branch, ch.Pn.month[1], { y: yearBranch, m: monthBranch, d: null }, [L.branch]);
        vt = vx.out ? ', out this month (' + VOID_HOW[vx.how] + ')' : ': stays void (year and month not both in its season)'; }
      m.push('<span style="' + O + '">⏳ ' + L.branch + ' void' + vt + '</span>');
    }
    var tr = [hx.upper, hx.lower], lk = [], op = [];
    ['heaven', 'earth', 'fame'].forEach(function (k) { if (tr.indexOf(ch.R.luck[k]) >= 0) lk.push(cap(k)); if (tr.indexOf(ch.R.luck.opposite[k]) >= 0) op.push(cap(k)); });
    if (lk.length) m.push('<span style="' + (key === 'luck' ? G : 'color:#2e7d32;') + '">' + (key === 'luck' ? '▲ ' : '+') + lk.join(', ') + ' Luck</span>');
    if (op.length) m.push('<span style="' + (key === 'luck' ? Rd : 'color:#c62828;') + '">' + (key === 'luck' ? '▼ ' : '−') + 'opposite of ' + op.join(', ') + ' Luck</span>');
    if (key === 'luck') sc = lk.length - op.length;
    if (key === 'cure') {
      var pr = ctx.prof, need = (pr.rY < -0.25 || pr.rE > 0.25) && !(pr.rE < -0.25 || pr.rY > 0.25) ? 'yang' : (pr.rE < -0.25 || pr.rY > 0.25) && !(pr.rY < -0.25 || pr.rE > 0.25) ? 'yin' : null;
      var q = yyTri(hx);
      if (need && q) { m.unshift(q === need ? '<span style="' + G + '">▲ two ' + q + ' trigrams: what the chart needs</span>' : '<span style="' + Rd + '">▼ two ' + q + ' trigrams: the chart has too much</span>'); sc = q === need ? 2 : -2; }
      else if (!need) m.unshift('<span style="color:#777;">chart in balance</span>');
    }
    return { L: L, r: r, html: m.join(' · '), sc: sc };
  }
  function plBg(sc, on) { return on ? 'background:#fff3e0;' : sc > 0 ? 'background:#f1f8e9;' : sc < 0 ? 'background:#fdecea;' : ''; }
  function plBody(ch) {
    var R = ch.R, ctx = context(R, ch.Pn, ch.male), key = _pl.key, y0b = R.input.o.year, nowY = H().heluoYearOf(), nowAge = nowY - y0b + 1;
    var TD = 'padding:4px 5px;vertical-align:top;', X = xkRel(key, ch.male), lon = xkLon(ch.c);
    var F = 'padding:5px;border:1px solid #b39ddb;border-radius:5px;font-size:13px;';
    var h = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:6px 0;"><div><label style="font-size:11px;color:#666;display:block;">Purpose</label><select onchange="xkdgHLPlan(\'key\',this.value)" style="' + F + '">'
      + Object.keys(XK_PL).map(function (k) { return '<option value="' + k + '"' + (k === key ? ' selected' : '') + '>' + XK_PL[k] + '</option>'; }).join('') + '</select></div>'
      + '<div style="font-size:11px;color:#555;line-height:1.5;max-width:330px;">' + (X ? XK_PL[key] + ' = <b>' + REL[X] + '</b>' + (key === 'relationship' ? ' (' + (ch.male ? 'man' : 'woman') + ')' : '') + '; the price is ' + REL[XK_ATT[X]] + '.' : key === 'luck' ? 'Where the Heaven, Earth and Fame Luck trigrams appear.' : 'What brings the natal chart back into balance (yin and yang).') + ' ▲ helps · ▼ price · ⏳ void: later.</div></div>';
    // 1 · periods of years
    h += '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:8px 0 3px;">1 · Periods of years</div><table style="border-collapse:collapse;font-size:12px;width:100%;">';
    cycleRows(R).forEach(function (x, i) {
      var on = nowAge >= x.c.from && nowAge <= x.c.to, mk = plMark(ch, ctx, key, x.me, x.hx, x.c.line, null), id = 'c' + i, op = _pl.openC === id;
      h += '<tr onclick="xkdgHLPlan(\'c\',\'' + id + '\')" style="cursor:pointer;border-top:1px solid #eee;' + plBg(mk.sc, on) + '"><td style="' + TD + 'white-space:nowrap;"><b>age ' + x.c.from + '–' + x.c.to + '</b>' + (on ? ' ◀' : '') + '<div style="font-size:10px;color:#888;">' + x.y1 + '–' + x.y2 + '</div></td>'
        + '<td style="' + TD + 'white-space:nowrap;">' + x.phase + ' ' + x.hx.n + ' l' + x.c.line + '<br>' + mk.L.branch + ' ' + relTag(mk.r) + '</td><td style="' + TD + 'font-size:11px;line-height:1.5;">' + (mk.html || '<span style="color:#aaa;">—</span>') + '</td></tr>';
      if (op) h += '<tr><td colspan="3" style="padding:2px 6px 8px;">' + (U().cycleHexSvg ? U().cycleHexSvg(x.hx, x.c.line, x.phase === 'XT' ? R.cyclesXT : R.cyclesHT) : '') + (U().lineBody ? U().lineBody(x.hx.n, x.c.line) : '') + '</td></tr>';
    });
    h += '</table>';
    // 2 · the years, 3 · the months of the open year
    var Y0 = _pl.y0 || nowY, B = 'border:1px solid #b39ddb;background:#fff;color:#5e35b1;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;';
    h += '<div style="display:flex;align-items:center;gap:8px;margin:12px 0 3px;"><span style="font-size:12px;font-weight:600;color:#4527a0;">2 · The years · tap a year for its months</span>'
      + '<button onclick="xkdgHLPlan(\'y0\',' + (Y0 - 12) + ')" style="' + B + '">◀ 12</button><button onclick="xkdgHLPlan(\'y0\',' + nowY + ')" style="' + B + '">now</button><button onclick="xkdgHLPlan(\'y0\',' + (Y0 + 12) + ')" style="' + B + '">12 ▶</button></div>'
      + '<table style="border-collapse:collapse;font-size:12px;width:100%;">';
    for (var Y = Y0; Y < Y0 + 12; Y++) {
      var a = H().annual(R, Y); if (a.none) continue;
      var me = persona(a.periodHex, a.period.line), yb = BR[((Y - 4) % 12 + 12) % 12], mk = plMark(ch, ctx, key, me, a.hex, a.moved, yb), op = _pl.openY === Y;
      h += '<tr onclick="xkdgHLPlan(\'y\',' + Y + ')" style="cursor:pointer;border-top:1px solid #eee;' + plBg(mk.sc, Y === nowY) + (op ? 'outline:2px solid #5e35b1;' : '') + '"><td style="' + TD + 'white-space:nowrap;"><b>' + Y + '</b> · age ' + a.age + (Y === nowY ? ' ◀' : '') + '<div style="font-size:10px;color:#888;">' + yb + ' year</div></td>'
        + '<td style="' + TD + 'white-space:nowrap;">' + a.hex.n + ' ' + esc(U().hexName ? U().hexName(a.hex.n) : '') + '<br>l' + a.moved + ' ' + mk.L.branch + ' ' + relTag(mk.r) + '</td><td style="' + TD + 'font-size:11px;line-height:1.5;">' + (mk.html || '<span style="color:#aaa;">—</span>') + '</td></tr>';
      if (!op) continue;
      var ms = null, aP = null; try { ms = H().periods.months(Y, lon); aP = H().periods.annual(ms); } catch (e) {}
      h += '<tr><td colspan="3" style="padding:4px 4px 10px;background:#faf8ff;">' + (U().cycleHexSvg ? U().cycleHexSvg(a.hex, a.moved, aP, me) : '') + (U().lineBody ? U().lineBody(a.hex.n, a.moved, 'year') : '')
        + '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:8px 0 3px;">3 · The months of ' + Y + ' (age ' + a.age + ')</div><table style="border-collapse:collapse;font-size:12px;width:100%;">';
      a.months.forEach(function (mo, i) {
        var mm = plMark(ch, ctx, key, me, mo.hex, mo.line, yb, BR[(mo.index - 1) % 12]), opM = _pl.openM === mo.index, per = '';
        try { var s = ms[i].start, e = new Date((ms[i + 1].start || ms[i + 1].end).getTime() - 86400000); per = s.getUTCDate() + ' ' + MON3[s.getUTCMonth()] + '–' + e.getUTCDate() + ' ' + MON3[e.getUTCMonth()]; } catch (e2) {}
        h += '<tr onclick="event.stopPropagation();xkdgHLPlan(\'m\',' + mo.index + ')" style="cursor:pointer;border-top:1px solid #eee;' + plBg(mm.sc, false) + '"><td style="' + TD + 'white-space:nowrap;"><b>' + per + '</b></td>'
          + '<td style="' + TD + 'white-space:nowrap;">' + mo.hex.n + ' l' + mo.line + ' ' + mm.L.branch + ' ' + relTag(mm.r) + '</td><td style="' + TD + 'font-size:11px;line-height:1.5;">' + (mm.html || '<span style="color:#aaa;">—</span>') + '</td></tr>';
        if (opM) { var mP = null; try { var d0 = H().periods.dayMs(ms[i].start); mP = H().periods.month(d0, d0, H().periods.dayMs(ms[i + 1].start || ms[i + 1].end)); } catch (e3) {}
          h += '<tr onclick="event.stopPropagation()"><td colspan="3" style="padding:2px 6px 8px;">' + (U().cycleHexSvg ? U().cycleHexSvg(mo.hex, mo.line, mP, me) : '') + (U().lineBody ? U().lineBody(mo.hex.n, mo.line, 'month') : '') + '</td></tr>'; }
      });
      h += '</table></td></tr>';
    }
    return h + '</table><div style="font-size:10px;color:#999;margin-top:6px;line-height:1.5;">Periods: the cycle line. Years: the moved line of the annual hexagram (the year runs from the Winter Solstice). Months: the line of the month in the monthly hexagram. Green rows help the purpose, red rows carry its price. For the single days use the XKDG Date Selection (☯ on the favourable dates).</div>';
  }
  function plannerHtml(ch) {
    if (!ch || !ch.R || !NJ()) return '';
    if (!_pl.key) { var pk = ''; try { pk = document.getElementById('purpose-select').value; } catch (e) {} _pl.key = XK_PL[pk] ? pk : 'wealth'; }
    var body = ''; try { body = plBody(ch); } catch (e) { body = '<div style="font-size:12px;color:#c0392b;">Planner failed: ' + esc(e && e.message) + '</div>'; }
    return '<details id="hl-plan-d"' + (_pl.opened ? ' open' : '') + ' ontoggle="xkdgHLPlan(\'tog\',this.open)" style="margin-top:12px;border:1px solid #d1c4e9;border-radius:8px;padding:8px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:#4527a0;">Purpose planner · periods, years, months</summary><div id="hl-plan">' + body + '</div></details>';
  }
  root.xkdgHLPlan = function (what, v) {
    if (what === 'tog') { _pl.opened = !!v; return; }
    if (what === 'key') { _pl.key = v; } else if (what === 'y0') { _pl.y0 = v; _pl.openY = null; _pl.openM = null; }
    else if (what === 'y') { _pl.openY = _pl.openY === v ? null : v; _pl.openM = null; } else if (what === 'm') { _pl.openM = _pl.openM === v ? null : v; }
    else if (what === 'c') { _pl.openC = _pl.openC === v ? null : v; }
    var box = $('hl-plan'), ch = H().currentChart && H().currentChart(); if (box && ch) { try { box.innerHTML = plBody(ch); } catch (e) {} }
  };
  root.XKDGHeluoDS = { plannerHtml: plannerHtml, xkScan: xkScan, xkSummary: xkSummary, render: render, readingHtml: readingHtml, context: context, scoreDay: scoreDay, scan: scan, PURPOSES: PURPOSES };
})(typeof window !== 'undefined' ? window : globalThis);

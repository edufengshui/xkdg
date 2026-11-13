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
  // Qi flow between hexagrams in a row, general rule (Edu, 12/11/2026, afternoon): what is on the left strengthens what is
  // on its right in the same place if it generates it or is the same element (×1.5), weakens it if it controls it (×0.5);
  // every other case ×1. Trigrams: lower with lower, upper with upper. Lines: same position (line 3 of the cycle → line 3
  // of the annual). Row: cycle → annual → monthly → block → day. (The Luck keep their own flowMul: ×0.5 in all other cases.)
  function flowEl(a, b) { return !a || !b ? 1 : a === b || GEN[a] === b ? 1.5 : CTRL[a] === b ? 0.5 : 1; }
  // isVoid(branch) → true while the branch is void and has not come out: a void line feeds nobody (Edu 13/11, 43 l5 酉)
  function lineFlow(prevN, curN, pos, isVoid) { if (!prevN) return 1; var P = NJ()[prevN].lines[pos - 1];
    return isVoid && isVoid(P.branch) ? 1 : flowEl(P.el, NJ()[curN].lines[pos - 1].el); }
  // Speak (Edu 13/11, his 2026: 16 l5 申 B in Zhen = Heaven Luck, matching HT 43 l5 酉 B void): criticism of the Brothers
  // that falls in a Luck trigram, on a line whose twin in the cycle hexagram is a void Brothers, has no substance — warning only
  function critEmpty(ctx, pers, n, l, perN, isVoid) {
    if (!perN) return false;
    var t = TRI_OF(n)[l > 3 ? 0 : 1], P = NJ()[perN].lines[l - 1];
    var lk = ['heaven', 'earth', 'fame'].map(function (k) { return ctx.prof.K[k].t; }).concat(ctx.profD ? ['heaven', 'earth', 'fame'].map(function (k) { return ctx.profD.K[k].t; }) : []);
    return lk.indexOf(t) >= 0 && rel(pers, P.el) === 'B' && isVoid(P.branch);
  }
  // ── The purpose in the trigrams (Edu 12/11/2026, on his Wealth years 2009–13) ──
  // Not only the line: the relation of the purpose also lives in the trigrams and in the Hu of the hexagrams of the time,
  // each one strengthened or weakened by the trigram in the same place of the hexagram on its left (flowEl; the Hu flows
  // from its own hexagram). Relation of the purpose +, the price (XK_ATT) −. Wealth feeds the Ghost (財生殺): for a Wealth
  // purpose, Ghost trigrams take away when Wealth is there (on a line or in a trigram) — his 2005–08: Wealth on the cycle
  // line, Fire in every annual, no peak. Weights chosen by Claude (to be confirmed).
  // seq = [[label, hexN, prevN|null, weight, which]] — which: 'both' (default), 'other:upper'/'other:lower' for a native
  // (only the half where the person is not), huLines = [lo, up] booleans for the Hu trigrams counted (null = both)
  function triRows(seq) {
    var out = [];
    seq.forEach(function (x) {
      var tr = TRI_OF(x[1]), pv = x[2] ? TRI_OF(x[2]) : null, w = x[3], which = x[4] || 'both', nx = x[6] ? TRI_OF(x[6]) : null;
      [0, 1].forEach(function (i) {
        if (which !== 'both' && which !== (i ? 'lower' : 'upper')) return;
        // backward flow (Edu 13/11): the trigram in the same place of the smaller hexagram on the right generates it → ×1.5
        var fb = nx && GEN[TRI_EL[nx[i]]] === TRI_EL[tr[i]] ? 1.5 : 1;
        out.push({ n: x[1], lbl: (i ? 'lower ' : 'upper ') + tr[i] + ' of ' + x[0] + ' ' + x[1], t: tr[i], f: (pv ? flowEl(TRI_EL[pv[i]], TRI_EL[tr[i]]) : 1) * fb, fb: fb, from: nx ? nx[i] : null, prevT: pv ? pv[i] : null, w: w });
      });
      var hu = H().huGua(H().hexFrom(tr[0], tr[1]).lines), hl = x[5] || [true, true];
      [[hu.upper, tr[0], hl[1], 'upper'], [hu.lower, tr[1], hl[0], 'lower']].forEach(function (h) {
        if (h[2]) out.push({ n: x[1], lbl: h[3] + ' Hu ' + h[0] + ' of ' + x[0] + ' ' + x[1], t: h[0], f: flowEl(TRI_EL[h[1]], TRI_EL[h[0]]), w: w / 2 });
      });
    });
    return out;
  }
  // wHex = hexagrams with Wealth on the line read; the Ghost takes away only inside a hexagram that also holds Wealth
  // Void trigram (Edu 12/11, on his Dui = 酉): a trigram whose branches (Time 1) are all natal voids counts nothing, neither
  // help nor price, until one of them comes out (voidExit: same branch, timely clash, moving line). V = { list, mb, T, moved, birth }
  function triVoid(t, V) {
    if (!V || !V.list || !TRI_BR[t].every(function (b) { return V.list.indexOf(b) >= 0; })) return false;
    return V.birth || !TRI_BR[t].some(function (b) { return voidExit(b, V.mb, V.T, V.moved).out; });
  }
  // Brothers strong in hexagram n: a direct Brothers trigram that is not void (Edu 13/11, with o2.bro = Brothers on the line read)
  function broIn(pers, n, V) { return TRI_OF(n).some(function (t) { return rel(pers, TRI_EL[t]) === 'B' && !triVoid(t, V); }); }
  // o2 (Edu 13/11, all optional): opp = trigrams that do not count as Wealth (opposites of the year Luck, for Edu Xun: they
  // neither help nor feed the Fire); bro = hexagrams with Brothers on the line read; near = { hexN: [neighbour hexN] } in
  // the row; luckD = Luck trigrams of the day pillar (Speak, Support): never a price, they count + ("in harmony with that Luck")
  function triScore(pers, X, A, rows, wHex, V, o2) {
    o2 = o2 || {};
    var o = { plus: [], minus: [], ghost: [], voidT: [], oppW: [], chain: [], ctl: [], s: 0, gOn: false };
    if (!X) return o;
    var opp = o2.opp || [], lD = o2.luckD || [];
    rows.forEach(function (x) { var r = rel(pers, TRI_EL[x.t]), hu = x.lbl.indexOf('Hu') >= 0;
      if ((r === X || r === A || (X === 'W' && r === 'G')) && triVoid(x.t, V)) { o.voidT.push(x); return; }
      if (r === X) { if (X === 'W' && opp.indexOf(x.t) >= 0) o.oppW.push(x); else o.plus.push(x); }
      if (A && r === A) {
        if (lD.indexOf(x.t) >= 0) { x.dl = true; o.plus.push(x); }
        // Wealth (Edu 13/11): Brothers that feed the Children of the bigger hexagram on the left are not a price (B → C → W)
        else if (X === 'W' && !hu && x.prevT && rel(pers, TRI_EL[x.prevT]) === 'C') o.chain.push(x);
        else o.minus.push(x);
      }
      // 財生殺 only from a direct Fire trigram, not from the Hu (Edu 12–13/11)
      if (X === 'W' && r === 'G' && !hu) o.ghost.push(x); });
    function sum(a) { return a.reduce(function (z, x) { return z + x.w * x.f; }, 0); }
    var wh = (wHex || []).concat(o.plus.map(function (x) { return x.n; }));
    o.ghost = o.ghost.filter(function (x) { return wh.indexOf(x.n) >= 0; });
    // "when the Brothers are strong, the Ghost is needed to control them" (Edu 13/11): Fire in the same hexagram as strong
    // Brothers, or in the hexagram next to it in the row (6/9/2011: Qian of block 11 → Li of day 36), controls them
    var bro = o2.bro || [], near = o2.near || {};
    function strong(n) { return bro.indexOf(n) >= 0 || broIn(pers, n, V); }
    o.ctl = o.ghost.filter(function (x) { return strong(x.n) || (near[x.n] || []).some(strong); });
    o.ghost = o.ghost.filter(function (x) { return o.ctl.indexOf(x) < 0; }); o.gOn = o.ghost.length > 0;
    o.s = Math.round((sum(o.plus) - sum(o.minus) - (o.gOn ? sum(o.ghost) : 0)) * 100) / 100;
    return o;
  }
  function fArr(f, fb) { return (fb > 1 ? ' ↩' : '') + (f / (fb || 1) > 1 ? ' ↑' : f / (fb || 1) < 1 ? ' ↓' : ''); }
  // one level of the cascade: line `line` of hexagram hexN; text score moved ±1 towards the version chosen by time;
  // prevN = hexagram on its left in the row: the relation of the line counts ×fl (lineFlow)
  function level(hexN, line, pers, purpose, T, natVoids, prevN) {
    var favEl = Object.keys(GEN).filter(function (e) { return PURPOSES[purpose].w[rel(pers, e)] === 2; })[0];
    var L = NJ()[hexN].lines[line - 1], sh = sanhui(L.branch, T), r = rel(pers, sh || L.el), tm = tempo(L.branch, T, natVoids, favEl);
    var s = SC()[hexN].l[line], V = Math.sign(tm.t), txt = Math.max(-2, Math.min(2, s + V)), rs = PURPOSES[purpose].w[r], fl = lineFlow(prevN, hexN, line);
    return { hexN: hexN, line: line, b: L.branch, el: sh || L.el, r: r, rs: rs, fl: fl, tm: tm, s: s, V: V, txt: txt, fushen: L.fushen, tot: rs * fl + tm.t + txt };
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
  var LW = { A: { a: 0.25, m: 0.5, g: 1 }, B: { c: 0.25, a: 0.5, g: 1 }, C: { c: 0.25, h: 0.25, a: 0.25, m: 0.5, b: 0.5, g: 0.75 } };
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
  function profile(R, Pn, male, LS) { // LS: set of Luck (default R.luck, from the year; R.luckDay from the day pillar)
    LS = LS || R.luck;
    var N = R.numbers, mbi = BR.indexOf(Pn.month[1]);
    var rY = N.heaven / N.monthAvg.yang - 1, rE = N.earth / N.monthAvg.yin - 1;
    var xt = R.xianTian, ht = R.houTian && R.houTian.hex;
    var nat = [xt.upper, xt.lower, R.huXT.upper, R.huXT.lower].concat(ht ? [ht.upper, ht.lower, R.huHT.upper, R.huHT.lower] : []);
    var yb = BR[R.input.p.branches[0]], K = {};
    ['heaven', 'earth', 'fame'].forEach(function (k) {
      var t = LS[k], op = LS.opposite[k], tk = timeK(t, mbi), yy = 1, yt = 'in line';
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
  // Qi flow (Edu, 12/11/2026): hexagrams in a row, left to right (cycle → annual → monthly → block → day; the Hu of the
  // cycle is a side branch cycle → Hu). Lower with lower, upper with upper. The trigram on the right is strengthened (×1.5)
  // if the one on the left generates it or is the same element, weakened (×0.5) otherwise. First of the row ×1.
  function flowMul(prev, cur) {
    if (!prev) return [1, 1];
    return [0, 1].map(function (i) { var a = TRI_EL[prev[i]], b = TRI_EL[cur[i]]; return a === b || GEN[a] === b ? 1.5 : 0.5; });
  }
  // row of a day: [level, hexagram number, [upper, lower], flow multipliers]; Hu of the cycle only on lines 2–5
  function luckRow(p, levels) {
    var out = [], prev = null, cy = p.id.cycle[0];
    [['c', cy], ['a', p.id.year[0]], ['m', p.id.month[0]], ['b', p.id.lord[0]], ['g', p.id.dayHex[0]]].forEach(function (x) {
      var tr = TRI_OF(x[1]); if (!levels || levels.indexOf(x[0]) >= 0) out.push([x[0], x[1], tr, flowMul(prev, tr)]); prev = tr; });
    if ((!levels || levels.indexOf('h') >= 0) && p.id.cycle[1] >= 2 && p.id.cycle[1] <= 5) {
      var hu = H().huGua(H().hexFrom(TRI_OF(cy)[0], TRI_OF(cy)[1]).lines), tr = [hu.upper, hu.lower];
      out.splice(levels ? 0 : 1, 0, ['h', hu.n, tr, flowMul(TRI_OF(cy), tr)]);
    }
    return out;
  }
  // multipliers of a Luck for what adds (pos) and what takes away (neg). Void Luck (Edu, 12/11): adds nothing, but its
  // opposite still takes away (it lowers the natural Luck everyone has). Out of the void with a clashing branch of the time.
  function luckMuls(P, T, w) {
    var M = {};
    ['heaven', 'earth', 'fame'].forEach(function (k) {
      var L = P.K[k]; M[k] = { pos: L.m, neg: L.mPieno };
      if (!L.vuoto || !T) return;
      var sc = CLASH_TRI[L.t];
      if ([T.y, T.m, T.d].some(function (b) { return b && brTri(b) === sc; })) { M[k].pos = L.mPieno; if (w) w.push(cap(k) + ' Luck out of the void (' + sc + ')'); }
    });
    return M;
  }
  var LV_NAME = { c: 'cycle', h: 'Hu of the cycle', a: 'annual', m: 'monthly', b: 'block', g: 'day hex' };
  // V (Edu 12/11 evening, his Dui = 酉): an opposite whose branches are natal voids takes nothing away until it comes out
  function luckDay(P, p, T, V) {
    var tot = 0, w = [], M = luckMuls(P, T, w);
    function add(k, v, src) { if (!v) return; var m = v > 0 ? M[k].pos : M[k].neg; tot += v * m; if (m) w.push(src + ' ' + (v > 0 ? '+' : '−') + cap(k)); }
    var row = luckRow(p);
    ['heaven', 'earth', 'fame'].forEach(function (k) {
      var L = P.K[k];
      [['year', T.y, LW.A.a], ['month', T.m, LW.A.m], ['day', T.d, LW.A.g]].forEach(function (x) { if (L.inNat && brTri(x[1]) === L.t) add(k, x[2], x[0] + ' ' + x[1]); });
      [['cycle line', p.id.cycle, LW.B.c], ['annual line', p.id.year, LW.B.a], ['day line', p.id.day, LW.B.g]].forEach(function (x) {
        var b = NJ()[x[1][0]].lines[x[1][1] - 1].branch; if (brTri(b) === L.t) add(k, x[2], x[0] + ' ' + b); });
      row.forEach(function (x) {
        var br = bridge(L, x[2]);
        x[2].forEach(function (t, i) {
          var f = x[3][i], tag = LV_NAME[x[0]] + ' ' + x[1] + (f > 1 ? '↑' : f < 1 ? '↓' : '');
          if (t === L.t) add(k, LW.C[x[0]] * f, tag);
          if (t === L.op && !br && !triVoid(t, V)) add(k, -LW.C[x[0]] * f, tag);
        });
      });
    });
    return { tot: Math.round(tot * 100) / 100, w: w };
  }
  function cap(k) { return k.charAt(0).toUpperCase() + k.slice(1); }

  // ── Context and day score ──────────────────────────────────────────────────
  // R = XKDGHeluo.fromPillars(Pn, male); Pn = birth pillars (XKDGSolarTime)
  function context(R, Pn, male) {
    return { R: R, Pn: Pn, male: !!male, natVoids: natalVoids(Pn).list,   // Edu, 11/11/2026: from the DAY pillar only, minus those released by an adjacent clash in the bazi
       prof: profile(R, Pn, male), profD: R.luckDay ? profile(R, Pn, male, R.luckDay) : null };
  }
  // Two sets of Luck (Edu, 12/11/2026): from the YEAR = what one obtains (money, clients), the default; from the DAY = what
  // one is (study, writing, teaching), for Speak and Support in XKDG, Output and Parent in the old Date Selection.
  var DAY_LUCK = { speak: 1, support: 1, output: 1, parent: 1 };
  function profFor(ctx, key) { return DAY_LUCK[key] && ctx.profD ? ctx.profD : ctx.prof; }
  function scoreDay(ctx, Pe, lon, purpose) {
    var p = predict(ctx.R, Pe, lon); if (p.none) return null;
    var pers = persona(p.hx, p.per.line), T = { y: Pe.year[1], m: Pe.month[1], d: Pe.day[1] };
    var V = { list: ctx.natVoids, mb: ctx.Pn.month[1], moved: movedBranches(p) };
    // Qi flow on the lines (Edu 12/11): each line from the line in the same place of the hexagram on its left
    var c = level(p.id.cycle[0], p.id.cycle[1], pers, purpose, T, V);
    var a = level(p.id.year[0], p.id.year[1], pers, purpose, T, V, p.id.cycle[0]);
    var m = level(p.month.hex.n, p.month.line, pers, purpose, T, V, p.id.year[0]);
    // secondary text (Edu, 11/11/2026): the same line in the changed (day) hexagram, the outcome, at half weight;
    // the primary text is the day line in the block hexagram (cause, action)
    var s2 = level(p.id.dayHex[0], p.id.dayHex[1], pers, purpose, T, V, p.id.lord[0]);
    var d = level(p.id.day[0], p.id.day[1], pers, purpose, T, V, p.month.hex.n);
    // Edu 12/11 (Greece 2019): the line of the annual that rules the month, read in the annual, at half weight
    var am = level(p.id.year[0], p.month.line, pers, purpose, T, V, p.id.cycle[0]);
    var L = luckDay(profFor(ctx, purpose), p, T, { list: V.list, mb: V.mb, T: T, moved: V.moved });
    var tot = Math.round((c.tot + a.tot + 0.5 * am.tot + m.tot + d.tot + 0.5 * s2.tot + L.tot) * 100) / 100;
    var warn = [];
    if (d.r === 'G') warn.push('Ghost on the day line');
    [['cycle', c], ['annual', a], ['month', m], ['day', d]].forEach(function (x) {
      x[1].tm.note.forEach(function (n) { if (/^冲/.test(n) && !/excites/.test(n)) warn.push(x[0] + ' line ' + x[1].b + ' ' + n); });
      if (x[1].tm.note.indexOf('空 void') >= 0) { var sm = x[1].tm.note.filter(function (n) { return /^same /.test(n); }).map(function (n) { return n.slice(5); });
        warn.push(x[0] + ' line ' + x[1].b + ' in true void' + (sm.length ? ' (same branch as ' + sm.join(', ') + ')' : '')); }
    });
    return { Pe: Pe, p: p, pers: pers, T: T, c: c, a: a, am: am, m: m, d: d, s2: s2, L: L, tot: tot, warn: warn };
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
  var XK_ATT = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' }, XK_W = { am: 1, m: 1, lord: 2, d: 3, s2: 3 };
  // Edu 12/11/2026, from the Greece seminar 2019 (good month, then a sudden turn): four rules, weights chosen by Claude.
  // 1) the line of the annual that rules the month (line k for months 2k−1, 2k) is read too: relation and text;
  // 2) a void branch that comes out of the void = something hidden surfaces suddenly (what, from its relation);
  // 3) a good month followed by a bad one: what is obtained can turn at the change of the 中氣;
  // 4) Speak: Brothers on a line of the time (colleagues, rivals: criticism) and Dui trigrams (the mouth) take away.
  var REL_MEAN = { B: 'colleagues, rivals, people like you (criticism, competition)', G: 'pressure, authority, accusations', W: 'money, the partner', C: 'students, projects, what you create', P: 'documents, contracts, protection, reputation' };
  var XK_AM = { rel: 1, txt: 0.5 }, XK_CRIT = 0.5;
  // Edu 12/11 evening (after 8/12/2015): texts of the day line (primary, outcome) and 兄弟劫財 on Lord / day line
  var XK_TXT = { d: 1, s2: 0.5 }, XK_STEAL = 1.5;
  var ST_EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
  var XK_LBL = { am: 'annual line of the month', m: 'month line', lord: 'Lord of the Block', d: 'day line (primary)', s2: 'day line (outcome)' };
  function xkRel(key, male) { return key === 'relationship' ? (male ? 'W' : 'G') : (XK_REL[key] || null); }
  function thread(ctx, Pe, lon, key) {
    var p = predict(ctx.R, Pe, lon); if (p.none) return null;
    var pers = persona(p.hx, p.per.line), T = [Pe.year[1], Pe.month[1], Pe.day[1]], yv = natalVoids(ctx.Pn).list, mb0 = ctx.Pn.month[1];
    var X = xkRel(key, ctx.male), A = X ? XK_ATT[X] : null;
    // Edu, 12/11/2026: voids, see voidExit (timely at birth = still void, but easy to leave; untimely = needs year and month in season)
    var TT = { y: T[0], m: T[1], d: T[2] }, mv = movedBranches(p);
    var vNow = function (b) { return yv.indexOf(b) >= 0 && !voidExit(b, mb0, TT, mv).out; };
    // fl = Qi flow from the line in the same place of the hexagram on the left (Edu 12/11): annual → monthly → block → day
    function li(k, n, l, prevN) { var L = NJ()[n].lines[l - 1], v = yv.indexOf(L.branch) >= 0, vx = v ? voidExit(L.branch, mb0, TT, mv) : null;
      return { k: k, n: n, l: l, b: L.branch, el: L.el, r: rel(pers, L.el), hid: L.fushen ? { b: L.fushen.branch, r: rel(pers, L.fushen.el) } : null,
        voidL: v, easy: v && vx.easy, filled: v && vx.out, how: vx && vx.how, byClash: v && vx.how === 'clash',
        fl: lineFlow(prevN, n, l, vNow), from: prevN ? NJ()[prevN].lines[l - 1] : null }; }
    var Ls = [li('am', p.id.year[0], p.month.line, p.id.cycle[0]), li('m', p.month.hex.n, p.month.line, p.id.year[0]), li('lord', p.id.lord[0], p.id.lord[1], p.month.hex.n), li('d', p.id.day[0], p.id.day[1], p.month.hex.n), li('s2', p.id.dayHex[0], p.id.dayHex[1], p.id.lord[0])];
    // Backward flow (Edu 13/11): the master line of the smaller hexagram (the line read: month, Lord, day) that generates
    // the line crossed in the bigger one strengthens it ×1.5, only while the smaller lasts. Row: am ← m ← lord ← d ← s2.
    // Wealth: Brothers on the smaller that feed Children on the bigger are not a price (Brothers → Children → Wealth).
    [[0, 1], [1, 2], [2, 3], [3, 4]].forEach(function (q) { var Lb = Ls[q[0]], Lsm = Ls[q[1]];
      var off = Lsm.voidL && !Lsm.filled; // a void line feeds nobody until it comes out
      Lb.fb = !off && GEN[Lsm.el] === Lb.el ? 1.5 : 1; if (Lb.fb > 1) Lb.bk = Lsm;
      if (!off && X === 'W' && Lsm.r === 'B' && Lb.r === 'C') Lsm.chain = Lb; });
    Ls[4].fb = 1;
    var t = 0, on = [], price = [], later = [], crit = [], critE = [], surprise = [], chain = [];
    Ls.forEach(function (L) {
      if (X && L.r === X) { t += XK_W[L.k] * L.fl * L.fb; on.push(L); if (L.voidL && !L.filled) later.push(L); }
      else if (X && L.hid && L.hid.r === X) { t += XK_W[L.k] / 2; on.push({ k: L.k, b: L.hid.b, r: X, hidden: true }); }
      if (A && L.r === A) { if (L.chain) chain.push(L); else { t -= XK_W[L.k] * L.fl * L.fb; price.push(L); } }
      // rule 4 (Edu 12/11): for Speak, Brothers on a line of the time = criticism from colleagues and rivals
      //   — only when its text is unfavourable or it comes out of the void (a good Brothers text = good colleagues: 15 l3, June 2019)
      if (key === 'speak' && L.r === 'B' && ((SC() && SC()[L.n] && SC()[L.n].l[L.l] < 0) || (L.voidL && L.filled))) {
        if (critEmpty(ctx, pers, L.n, L.l, p.hx.n, vNow)) { L.critEmpty = true; critE.push(L); } else { t -= XK_W[L.k] * XK_CRIT * L.fl; crit.push(L); } }
      // rule 2 (Edu 12/11): a natal void that comes out now = something hidden surfaces suddenly
      if (L.voidL && L.filled) surprise.push(L);
    });
    // rule 1 (Edu 12/11): the text of the annual line that rules the month
    var amS = SC() && SC()[p.id.year[0]] ? SC()[p.id.year[0]].l[p.month.line] : 0;
    if (X) t += amS * XK_AM.txt;
    // Corrections after 8/12/2015 (Edu 12/11 evening, weights proposed by Claude and approved):
    // (a) the texts of the day line enter the score: primary ×1 per point, outcome ×0.5;
    // (b) 兄弟劫財: for Wealth and Relationship (man) Brothers on the Lord or on the day line steal the Wealth: price ×1.5;
    // (c) the relation of the purpose on a line with an unfavourable text = "in play, but at a loss": no plus, a warning;
    // (e) the purpose on the outcome after an unfavourable primary = the same warning, no plus.
    var sc = function (L) { return SC() && SC()[L.n] ? SC()[L.n].l[L.l] : 0; };
    var Ld = Ls[3], Lo = Ls[4], sd = sc(Ld), so = sc(Lo), loss = [], steal = [];
    var furto = key === 'wealth' || (key === 'relationship' && ctx.male);
    if (X) {
      t += sd * XK_TXT.d + so * XK_TXT.s2;
      Ls.forEach(function (L) {
        if (furto && L.r === 'B' && !L.chain && (L.k === 'lord' || L.k === 'd')) { t -= XK_W[L.k] * L.fl * (XK_STEAL - 1); steal.push(L); }
        if (L.r === X && sc(L) < 0) { t -= XK_W[L.k] * L.fl * L.fb; loss.push(L); }
      });
      if (sd < 0 && Lo.r === X && so >= 0) { t -= XK_W.s2 * Lo.fl; loss.push(Lo); }
    }
    // rule 4: Dui trigrams (the mouth) in monthly, block and day hexagram, for Speak (a void Dui does not count)
    if (key === 'speak') triRows([['monthly', p.month.hex.n, p.id.year[0], 0.5], ['block', p.id.lord[0], p.month.hex.n, 1], ['day', p.id.dayHex[0], p.id.lord[0], 1]])
      .forEach(function (x) { if (x.t === 'Dui' && x.lbl.indexOf('Hu') < 0 && !triVoid('Dui', { list: yv, mb: mb0, T: TT, moved: mv })) { t -= x.w * x.f * XK_CRIT; crit.push({ k: 'tri', lbl: x.lbl, f: x.f }); } });
    // rule 3 (Edu 12/11): a good month followed by a bad one for the purpose — what is obtained can turn at the next 中氣
    var turn = null;
    function moVal(i) {
      var mo = H().monthlyHex(p.annual.hex.lines, i), Lm = NJ()[mo.hex.n].lines[mo.line - 1], La = NJ()[p.id.year[0]].lines[mo.line - 1], v = 0;
      [[Lm, mo.hex.n], [La, p.id.year[0]]].forEach(function (z) { var r = rel(pers, z[0].el); if (r === X) v += 1; if (r === A) v -= 1; if (key === 'speak' && r === 'B' && (SC() && SC()[z[1]] ? SC()[z[1]].l[mo.line] : 0) < 0) v -= XK_CRIT; v += (SC() && SC()[z[1]] ? SC()[z[1]].l[mo.line] : 0) * 0.5; });
      return v;
    }
    if (X && p.month.index < 12) {
      var v0 = moVal(p.month.index), v1 = moVal(p.month.index + 1);
      if (v0 > 0 && v1 < 0) { var nx = null; try { nx = H().monthStarts(p.year)[p.month.index].start; } catch (e) {} turn = { now: v0, next: v1, from: nx }; }
    }
    // the purpose in the trigrams and Hu of monthly (0.5), block (1) and day hexagram (1), with the Qi flow (Edu 12/11)
    var hM = p.month.hex.n, hB = p.id.lord[0], hD = p.id.dayHex[0], nearX = {};
    nearX[hM] = [hB]; nearX[hB] = (nearX[hB] || []).concat([hM, hD]); nearX[hD] = (nearX[hD] || []).concat([hB]);
    var oppL = ['heaven', 'earth', 'fame'].map(function (k) { return ctx.prof.K[k].op; });
    var lDay = DAY_LUCK[key] && ctx.profD ? ['heaven', 'earth', 'fame'].filter(function (k) { return !ctx.profD.K[k].vuoto; }).map(function (k) { return ctx.profD.K[k].t; }) : [];
    var tri = triScore(pers, X, A, triRows([['monthly', hM, p.id.year[0], 0.5, null, null, hB], ['block', hB, hM, 1, null, null, hD], ['day', hD, hB, 1]]),
      X === 'W' ? on.filter(function (L) { return !L.hidden; }).map(function (L) { return L.n; }) : [], { list: yv, mb: mb0, T: TT, moved: mv },
      // (d) Edu 12/11 evening: for the Wealth purpose, Wealth in a trigram that is the opposite of a Luck from the year (for
      // Edu Xun: 1997–2000, 2010 not good) does not count, nor does it feed the Fire. Gen + for Speak/Support (Edu 13/11).
      { opp: key === 'wealth' ? oppL : [], bro: Ls.filter(function (L) { return L.r === 'B' && L.k !== 'am'; }).map(function (L) { return L.n; }), near: nearX, luckD: lDay });
    t += tri.s;
    // the three Luck (Heaven, Earth, Fame) and their opposites in the monthly, block and day hexagram, each trigram with the
    // Qi flow from the hexagram on its left (cycle → annual → monthly → block → day; Edu 12/11): ×1.5 strengthened, ×0.5 weakened.
    // A void Luck adds nothing (unless a clashing branch of the time brings it out), its opposite still takes away (Edu 12/11).
    function luckTri(P) {
    var HN = { m: 'monthly', b: 'block', g: 'day' }, lk = [], opp = [], lkS = 0, opS = 0, LM = luckMuls(P, TT), VV = { list: yv, mb: mb0, T: TT, moved: mv };
    luckRow(p, ['m', 'b', 'g']).forEach(function (x) { ['heaven', 'earth', 'fame'].forEach(function (k) {
      var L = P.K[k], br = bridge(L, x[2]);
      x[2].forEach(function (tr, i) {
        var f = x[3][i], fl = f > 1 ? ', strengthened' : f < 1 ? ', weakened' : '', pos = i ? 'lower' : 'upper';
        if (tr === L.t) { if (LM[k].pos) { lkS += f; lk.push(cap(k) + ' Luck (' + tr + ') ' + pos + ' in the ' + HN[x[0]] + ' hexagram' + fl); }
          else lk.push(cap(k) + ' Luck (' + tr + ') in the ' + HN[x[0]] + ' hexagram: void, does not count'); }
        if (tr === L.op && !br) { if (triVoid(tr, VV)) opp.push('opposite of ' + cap(k) + ' Luck (' + tr + ') in the ' + HN[x[0]] + ' hexagram: void, does not take away');
          else { opS += f; opp.push('opposite of ' + cap(k) + ' Luck (' + tr + ') ' + pos + ' in the ' + HN[x[0]] + ' hexagram' + fl); } }
      });
    }); });
    return { lk: lk, opp: opp, s: Math.round(lkS - opS) };
    }
    var LT = luckTri(profFor(ctx, key)), lk = LT.lk, opp = LT.opp, LD = key === 'luck' && ctx.profD ? luckTri(ctx.profD) : null;
    // Cures: what the natal chart needs to come back into balance (yang or yin), from the block and day hexagram
    var pr = ctx.prof, need = (pr.rY < -0.25 || pr.rE > 0.25) && !(pr.rE < -0.25 || pr.rY > 0.25) ? 'yang' : (pr.rE < -0.25 || pr.rY > 0.25) && !(pr.rY < -0.25 || pr.rE > 0.25) ? 'yin' : null, cure = [];
    function yy(h) { return yyTri(h); }
    // Critical day (Edu 12/11 evening, from 8/12/2015 — Ying's letter to all clients): five signals for Wealth
    // (and Relationship for a man). 5 = severe; 4 = light warning, critical with a sixth signal: a natal void that
    // comes out on the day (or in an hour, see hoursOfDay), or the palace of the spouse (natal day branch) hit by the day.
    var alarm = null;
    if (X === 'W' && furto) {
      var Pn = ctx.Pn, nb = [['hour', Pn.hour[1]], ['day', Pn.day[1]], ['month', Pn.month[1]], ['year', Pn.year[1]]];
      var wEl = CTRL[ST_EL[ST.indexOf(Pn.day[0])]], dB = Pe.day[1], sig = [];
      var hit = nb.filter(function (x) { return BR_EL[x[1]] === wEl && clash(x[1]) === dB; });
      if (hit.length) sig.push('the day ' + dB + ' clashes the natal ' + wEl + ' (' + hit.map(function (x) { return x[0] + ' ' + x[1]; }).join(', ') + '): money and partner');
      if (steal.length) sig.push('Brothers steal the Wealth (兄弟劫財) on ' + steal.map(function (L) { return XK_LBL[L.k] + ' ' + L.b; }).join(', '));
      if (sd <= -2) sig.push('very unfavourable primary text (' + Ld.n + ' l' + Ld.l + ')');
      if (amS < 0) sig.push('unfavourable annual line of the month (' + p.id.year[0] + ' l' + p.month.line + ')');
      if (sd < 0 && Lo.r === X) sig.push('Wealth on the outcome after an unfavourable primary');
      var six = [];
      yv.forEach(function (b) { if ((dB === b || dB === clash(b)) && voidExit(b, mb0, TT, mv).out) six.push('the natal void ' + b + ' comes out on the day'); });
      if (dB === Pn.day[1] || dB === clash(Pn.day[1])) six.push('the palace of the spouse (' + Pn.day[1] + ') is ' + (dB === Pn.day[1] ? 'present' : 'clashed') + ' on the day');
      var lvl = sig.length >= 5 ? 'severe' : sig.length === 4 ? (six.length ? 'critical' : 'light') : null;
      if (lvl) alarm = { level: lvl, n: sig.length, sig: sig, six: six };
    }
    var adj = 0;
    if (key === 'luck') adj = LT.s;
    else if (key === 'cure') { if (need) [[p.daily.hex, 2, 'day'], [p.daily.block, 1, 'block']].forEach(function (x) { var q = yy(x[0]); if (q) { adj += q === need ? x[1] : -x[1]; cure.push(x[2] + ' hexagram: two ' + q + ' trigrams' + (q === need ? ' (what the chart needs)' : ' (the chart has too much of it)')); } }); }
    else adj = Math.round(t / 3);
    adj = Math.max(-3, Math.min(3, adj));
    return { p: p, pers: pers, Pe: Pe, key: key, X: X, A: A, lines: Ls, t: t, adj: adj, on: on, price: price, later: later, tri: tri, luck: lk, opp: opp, luckD: LD, am: { n: p.id.year[0], l: p.month.line, s: amS }, crit: crit, surprise: surprise, turn: turn, dayLuck: !!(DAY_LUCK[key] && ctx.profD), need: need, cure: cure, yv: yv, loss: loss, steal: steal, alarm: alarm, sd: sd, so: so, chain: chain, critE: critE };
  }
  // Hexagram of the hour (Edu 12/11 evening, version A, provisional): line k of the day hexagram rules two hours on the
  // branches (line 1 = 子丑 … line 6 = 戌亥; the 子 hour from 23:00 belongs to the next day). Odd hour = the day hexagram
  // with line k changed; even hour = also the correlated line (as the month from the annual). Base = the day hexagram (outcome).
  // Not in the score: text and warnings only (a natal void that comes out in the hour = sixth signal of the critical day).
  var HOUR_TST = ['23–01', '01–03', '03–05', '05–07', '07–09', '09–11', '11–13', '13–15', '15–17', '17–19', '19–21', '21–23'];
  // ── Active lines of the day and relations between levels (Edu 13/11/2026) ──
  // Five active lines: cycle line, annual line of the month, month line, Lord of the Block, day line (primary). Prevalence = the
  // relation that comes most often. Relations only between NEIGHBOURING levels (cycle ← annual ← month ← block ← day): who
  // generates whom and who controls whom. Bigger controls smaller → relieved if the next smaller level generates the
  // controlled one (month G controls block B, day P feeds B). Smaller controls bigger → it lasts as long as the smaller; the
  // bridge element (controller generates it, it generates the controlled) is the advice (annual P controls cycle C: use
  // collaborators and friends, the Brothers, to create new projects).
  var CTL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
  var REL_WHO = { B: 'collaborators, colleagues and friends', C: 'creating, teaching, students and new projects', W: 'money, clients and the partner (man)', G: 'authority, bosses and discipline', P: 'mentors, study, documents and support' };
  var PREV_PURP = { P: ['support', 'legal'], C: ['speak', 'health', 'journey'], W: ['wealth'], G: ['career'], B: [] };
  function levelsOfDay(th) {
    if (!th || !th.p) return null;
    var p = th.p, pers = th.pers, cy = NJ()[p.hx.n].lines[p.per.line - 1];
    var lv = [{ k: 'cycle', lbl: 'cycle ' + p.phase + ' ' + p.hx.n + ' l' + p.per.line, b: cy.branch, el: cy.el }];
    ['am', 'm', 'lord', 'd'].forEach(function (k) { var L = th.lines.filter(function (x) { return x.k === k; })[0];
      if (L) lv.push({ k: k, lbl: (k === 'am' ? 'annual ' : k === 'm' ? 'month ' : k === 'lord' ? 'block (Lord) ' : 'day ') + L.n + ' l' + L.l, b: L.b, el: L.el }); });
    lv.forEach(function (x) { x.r = rel(pers, x.el); });
    var cnt = {}; lv.forEach(function (x) { cnt[x.r] = (cnt[x.r] || 0) + 1; });
    var mx = Math.max.apply(null, Object.keys(cnt).map(function (k) { return cnt[k]; }));
    var prev = mx > 1 ? Object.keys(cnt).filter(function (k) { return cnt[k] === mx; }) : [];
    var pairs = [];
    for (var i = 0; i + 1 < lv.length; i++) {
      var A = lv[i], B = lv[i + 1], C = lv[i + 2], o = { big: A, small: B };
      if (A.el === B.el) o.type = 'same';
      else if (GEN[A.el] === B.el) o.type = 'big feeds small';
      else if (GEN[B.el] === A.el) o.type = 'small feeds big';
      else if (CTL[A.el] === B.el) { o.type = 'big controls small'; if (C && GEN[C.el] === B.el) o.relief = C; }
      else if (CTL[B.el] === A.el) { o.type = 'small controls big'; var br = GEN[B.el]; o.bridge = rel(pers, br); o.advice = REL_WHO[o.bridge]; o.long = i === 0; }
      pairs.push(o);
    }
    return { lines: lv, count: cnt, prevalence: prev, pairs: pairs };
  }
  function levelsText(LV) {
    return LV.pairs.filter(function (o) { return o.type !== 'same'; }).map(function (o) {
      var a = o.big, b = o.small, A = a.lbl.split(' ')[0], B = b.lbl.split(' ')[0];
      if (o.type === 'big feeds small') return A + ' ' + a.b + ' ' + REL[a.r] + ' feeds ' + B + ' ' + b.b + ' ' + REL[b.r];
      if (o.type === 'small feeds big') return B + ' ' + b.b + ' ' + REL[b.r] + ' feeds ' + A + ' ' + a.b + ' ' + REL[a.r] + ' (backward, good)';
      if (o.type === 'big controls small') return A + ' ' + a.b + ' ' + REL[a.r] + ' controls ' + B + ' ' + b.b + ' ' + REL[b.r] + (o.relief ? ', relieved by the ' + o.relief.lbl.split(' ')[0] + ' ' + o.relief.b + ' ' + REL[o.relief.r] + ' that feeds it' : '');
      return B + ' ' + b.b + ' ' + REL[b.r] + ' controls ' + A + ' ' + a.b + ' ' + REL[a.r] + (o.long ? ' — for the whole year: nothing to do but ' : ' — while it lasts: ') + 'rely on ' + o.advice + ' (' + REL[o.bridge] + ')';
    });
  }
  function hoursOfDay(ctx, th) {
    if (!th) return [];
    var p = th.p, dh = p.daily.hex, pers = th.pers, mb0 = ctx.Pn.month[1], yv = th.yv || natalVoids(ctx.Pn).list, mv = movedBranches(p);
    var ds = ST.indexOf(th.Pe.day[0]), out = [];
    for (var i = 0; i < 12; i++) {
      var hb = BR[i], hs = ST[(ds % 5 * 2 + i) % 10], mo = H().monthlyHex(dh.lines, i + 1), L = NJ()[mo.hex.n].lines[mo.line - 1];
      var vo = yv.filter(function (b) { return (hb === b || hb === clash(b)) && voidExit(b, mb0, { y: th.Pe.year[1], m: th.Pe.month[1], d: hb }, mv).out; });
      // Edu 13/11: the hour that clashes (or is) the palace of the spouse = sixth signal, Relationship only (no 己/劫財 of the hour)
      var sp = th.key === 'relationship' && (hb === ctx.Pn.day[1] || hb === clash(ctx.Pn.day[1]));
      out.push({ i: i, b: hb, pillar: hs + hb, spouse: sp, tst: HOUR_TST[i], n: mo.hex.n, hex: mo.hex, l: mo.line, lb: L.branch, el: L.el, r: rel(pers, L.el),
        s: SC() && SC()[mo.hex.n] ? SC()[mo.hex.n].l[mo.line] : 0, voidOut: vo });
    }
    // Edu 13/11: an hour that brings the element that controls the prevailing relation relieves an excess (his 13/11/2026:
    // Parent prevails → a Wealth hour; the 卯 hour is too early, so also the Wood trigrams of the hour hexagram).
    // grade 3 = the line of the hour, 2 = both trigrams, 1 = one trigram; best = highest grade, then the best text.
    try {
      var LV = levelsOfDay(th), ELS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
      LV.prevalence.forEach(function (pr) {
        var prEl = ELS.filter(function (e) { return rel(pers, e) === pr; })[0], ce = ELS.filter(function (e) { return CTL[e] === prEl; })[0], cr = rel(pers, ce);
        out.forEach(function (h) {
          var nt = TRI_OF(h.n).filter(function (t) { return TRI_EL[t] === ce; }).length, g = h.el === ce ? 3 : nt === 2 ? 2 : nt;
          if (g && (!h.relief || h.relief.grade < g)) h.relief = { grade: g, of: pr, by: cr, how: g === 3 ? 'line ' + h.lb + ' ' + REL[cr] : (nt === 2 ? 'both trigrams' : 'one trigram') + ' ' + ce };
        });
      });
      var rk = out.filter(function (h) { return h.relief; }).sort(function (a, b) { return b.relief.grade - a.relief.grade || b.s - a.s; });
      if (rk.length) rk[0].relief.best = true;
      var rp = rk.filter(function (h) { return h.i >= 4; }); // practical: from the 辰 hour (07:00) to 23:00
      if (rp.length && !rp[0].relief.best) rp[0].relief.practical = true;
    } catch (e) {}
    return out;
  }
  // ── A branch of the time that clashes a QUIET line (Edu 13/11/2026, rule of the Yi Jing) ──
  // The year branch hits a quiet line of the annual and of the life hexagram (XT/HT); the day branch hits a quiet line of
  // the monthly and of the block hexagram. The MONTH decides: line timely in the month = activated, it becomes a moving line
  // (read its text and what it turns into: hexagram, branch and relation of the changed line, and whether it feeds or attacks
  // the line it comes from); not timely = eliminated (e.g. untimely Brothers in a deal: the competitors are removed).
  // Reading only, no score (Edu: the score after seeing it at work). Edu's years: 1994 OLIS, 1998, 2000, 2010, 2014, 2016, 2019.
  var REL_GONE = { B: 'rivals and competitors removed', W: 'money or clients lost', C: 'what you produce stops (students, projects)', P: 'support, documents or protection fail', G: 'pressure and authority removed' };
  function clashQuiet(pers, hexes, br, mb) { // hexes: [[label, hx, movingLines[]]], br: clashing branch, mb: month branch
    var out = [], seen = {};
    hexes.forEach(function (g) { var hx = g[1]; if (!hx || !NJ()[hx.n]) return;
      NJ()[hx.n].lines.forEach(function (L, i) {
        var l = i + 1; if (L.branch !== clash(br) || g[2].indexOf(l) >= 0) return;
        var tri = (i < 3 ? hx.lines.slice(0, 3) : hx.lines.slice(3)).join('') + (i < 3 ? 'lo' : 'up'), k = l + L.branch + tri;
        if (seen[k]) { seen[k].also.push(g[0]); return; }
        var o = { lv: g[0], also: [], hx: hx, n: hx.n, l: l, b: L.branch, el: L.el, r: rel(pers, L.el), on: timely(L.el, mb), s: SC() && SC()[hx.n] ? SC()[hx.n].l[l] : 0 };
        if (o.on) { var nl = hx.lines.slice(); nl[i] = nl[i] ? 0 : 1; var nh = H().hexOf(nl), N = NJ()[nh.n].lines[i];
          o.to = { hx: nh, n: nh.n, b: N.branch, el: N.el, r: rel(pers, N.el), s: SC() && SC()[nh.n] ? SC()[nh.n].l[l] : 0,
            back: GEN[N.el] === L.el ? 'turns back and feeds it' : CTL[N.el] === L.el ? 'turns back and attacks it' : N.el === L.el ? 'same element' : GEN[L.el] === N.el ? 'drains it' : 'controlled by it' }; }
        seen[k] = o; out.push(o);
      }); });
    return out;
  }
  function yearClash(R, Y, pers, a, mb) { // a = H().annual(R, Y)
    if (!a || a.none) return [];
    return clashQuiet(pers, [['annual', a.hex, [a.moved]], [(a.periodHex === R.xianTian ? 'XT' : 'HT') + ' ' + a.periodHex.n, a.periodHex, [a.period.line]]], BR[((Y - 4) % 12 + 12) % 12], mb);
  }
  function dayClash(th) {
    if (!th || !th.p) return [];
    var p = th.p; return clashQuiet(th.pers, [['block', p.daily.block, [p.id.lord[1], p.id.day[1]]], ['month', p.month.hex, [p.month.line]]], th.Pe.day[1], th.Pe.month[1]);
  }
  // ── The «film» of the day (Edu 13/11/2026, tried on 8/12/2015 and 13/11/2026) ──
  // scenario = cycle + annual (moved line), and the year branch that clashes them; backdrop = annual line of the month +
  // month line; actor = Lord of the block; action = day line + outcome, and the day branch that clashes them; hours = when
  // the actor enters (hour with the Lord's branch) and the answer (hour where the natal void comes out).
  // A clash on an ACTIVE line: timely in the month = it comes alive (its text acts strongly now: in 2015 the day 午 made
  // 29 l6 子 explode); not timely = it gives way (in 2015 the year 未 broke the «brake of bronze» 44 l1 丑, weak in winter).
  // Quiet lines keep clashQuiet (activated / eliminated). Reading only, no score.
  function filmOfDay(th) {
    if (!th || !th.p) return null;
    var p = th.p, pers = th.pers, mb = th.Pe.month[1], yb = BR[((p.year - 4) % 12 + 12) % 12], db = th.Pe.day[1];
    function line(n, l) { var L = NJ()[n].lines[l - 1]; return { n: n, l: l, b: L.branch, el: L.el, r: rel(pers, L.el), on: timely(L.el, mb), s: SC() && SC()[n] ? SC()[n].l[l] : 0 }; }
    function hit(o, br, who) { if (o.b !== clash(br)) return null; return { by: who + ' ' + br, n: o.n, l: o.l, b: o.b, r: o.r, alive: o.on }; }
    var cyc = line(p.hx.n, p.per.line), ann = line(p.annual.hex.n, p.annual.moved), yh = [], dh = [];
    [['cycle', cyc], ['annual moved line', ann]].forEach(function (x) { var h = hit(x[1], yb, 'year'); if (h) { h.lv = x[0]; yh.push(h); } });
    var A = { hex: p.annual.hex, moved: p.annual.moved, periodHex: p.hx, period: p.per };
    var yq = clashQuiet(pers, [['annual', A.hex, [A.moved]], [p.phase + ' ' + p.hx.n, p.hx, [p.per.line]]], yb, mb);
    var LBL = { am: 'annual line of the month', m: 'month line', lord: 'Lord of the block', d: 'day line', s2: 'outcome' }, by = {};
    th.lines.forEach(function (L) { var o = line(L.n, L.l); by[L.k] = o; var h = hit(o, db, 'day'); if (h) { h.lv = LBL[L.k]; dh.push(h); } });
    return { yb: yb, mb: mb, db: db, cycle: cyc, annual: ann, yearHits: yh, yearQuiet: yq, dayHits: dh, dayQuiet: dayClash(th), lines: by, lord: by.lord };
  }
  root.XKDGHeluoDSCore = { filmOfDay: filmOfDay, clashQuiet: clashQuiet, dayClash: dayClash, yearClash: yearClash, levelsOfDay: levelsOfDay, levelsText: levelsText, triVoid: triVoid, hoursOfDay: hoursOfDay, flowEl: flowEl, lineFlow: lineFlow, flowMul: flowMul, thread: thread, xkRel: xkRel, tempo: tempo, timely: timely, wang: wang, predict: predict, profile: profile, cycleRows: cycleRows, rel: rel, persona: persona, voids: voids, natalVoids: natalVoids, pillarsTstNoon: pillarsTstNoon, sanhui: sanhui, voidExit: voidExit, movedBranches: movedBranches, VOID_HOW: VOID_HOW };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { filmOfDay: filmOfDay, levelsOfDay: levelsOfDay, levelsText: levelsText, PREV_PURP: PREV_PURP, triVoid: triVoid, hoursOfDay: hoursOfDay, triRows: triRows, triScore: triScore, flowEl: flowEl, lineFlow: lineFlow, flowMul: flowMul, thread: thread, context: context, scoreDay: scoreDay, scan: scan, predict: predict, profile: profile, luckDay: luckDay, pillarsTstNoon: pillarsTstNoon,
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
    var TD = 'padding:3px 6px;', h = '';
    [[ctx.prof, 'The three Luck in the Date Selection · from the year pillar', 'What you obtain (money, clients): every purpose except Speak and Support.'],
     [ctx.profD, 'Luck from the day pillar', 'What you are (study, writing, teaching): Speak and Support (Edu, 12/11/2026).']].forEach(function (g) {
      if (!g[0]) return;
      var K = g[0].K;
      h += '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:10px 0 3px;">' + g[1] + '</div><div style="font-size:11px;color:#666;margin-bottom:2px;">' + g[2] + '</div><table style="border-collapse:collapse;font-size:12px;width:100%;">'
        + '<tr style="color:#777;text-align:left;"><th style="' + TD + '"></th><th style="' + TD + '">Trigram</th><th style="' + TD + '">In the native</th><th style="' + TD + '">Yin/yang</th><th style="' + TD + '">Time</th><th style="' + TD + '">Weight</th></tr>';
      ['heaven', 'earth', 'fame'].forEach(function (k) {
        var L = K[k];
        h += '<tr style="border-top:1px solid #eee;"><td style="' + TD + '">' + cap(k) + ' Luck</td><td style="' + TD + '">' + L.t + ' <span style="color:#999;">(opp. ' + L.op + ')</span></td>'
          + '<td style="' + TD + '">' + (L.inNat ? 'yes' : 'no') + (L.opNat ? ', opposite too' : '') + '</td><td style="' + TD + '">' + L.yt + ' ×' + L.yy + '</td><td style="' + TD + '">' + L.tkCn + ' ×' + TM[L.tk] + '</td>'
          + '<td style="' + TD + '"><b>' + (L.vuoto ? '0 (void)' : '×' + (Math.round(L.m * 1000) / 1000)) + '</b></td></tr>';
      });
      h += '</table>';
    });
    return h + '<div style="font-size:10px;color:#999;margin-top:3px;">A void Luck (all its branches true void from the birth day) counts again when the year, month or day branch clashes them. Fixed weights (Edu, 10/11/2026).</div>';
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
      + '<div style="' + S_ + '">' + x.b + ' ' + x.el + ' = ' + x.r + ' for the person ' + me + ' (' + sgn(x.rs) + (x.fl && x.fl !== 1 ? (x.fl > 1 ? ' ×1.5 ↑ strengthened' : ' ×0.5 ↓ weakened') + ' by the same line on the left' : '') + ') · time ' + sgn(x.tm.t) + ' [' + (x.tm.note.join(', ') || '—') + '] · text ' + x.s + ' → ' + x.txt + ' (' + tl + ')</div>'
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
      + (g.am ? lvlHtml('2b · Line ' + p.month.line + ' of the annual, which rules this month (half weight)', g.am, p.annual.hex, aP, me, 'year') : '')
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
    if (th.key === 'luck') { if (th.luck.length) a.push(th.luck.length + ' Luck'); if (th.opp.length) a.push(th.opp.length + ' opposite');
      if (th.luckD) a.push('day Luck ' + (th.luckD.s > 0 ? '+' : th.luckD.s < 0 ? '−' : '±') + Math.abs(th.luckD.s)); }
    else if (th.key === 'cure') { if (th.adj) a.push(th.adj > 0 ? 'brings the ' + th.need + ' the chart needs' : 'against the balance (chart needs ' + th.need + ')'); }
    else if (th.X) { if (th.on.length) a.push(REL[th.X] + ' on ' + th.on.map(function (L) { return L.b + (L.hidden ? ' (hidden)' : ''); }).join(' ')); if (th.tri && th.tri.plus.length) a.push(REL[th.X] + ' in ' + th.tri.plus.length + ' trigram' + (th.tri.plus.length > 1 ? 's' : '')); if (th.price.length || (th.tri && th.tri.minus.length)) a.push('price: ' + REL[th.A]); if (th.tri && th.tri.gOn) a.push('Wealth feeds the Ghost'); if (th.later.length) a.push('fruits later');
      if (th.crit && th.crit.length) a.push('criticism'); if (th.surprise && th.surprise.length) a.push('⚡ hidden ' + th.surprise.map(function (L) { return L.b; }).join('')); if (th.turn) a.push('⚠ turn of the month');
      if (th.loss && th.loss.length) a.push('in play, but at a loss'); }
    if (th.alarm && th.alarm.level !== 'light') a.unshift(th.alarm.level === 'severe' ? '⚠⚠ SEVERE DAY' : '⚠ CRITICAL DAY');
    else if (th.alarm) a.push('⚠ 4 danger signals');
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
    // Edu 13/11: active lines, prevalence and relations between neighbouring levels
    try { var LV = levelsOfDay(th);
      if (LV) h += '<div style="' + S_ + 'font-size:12px;line-height:1.6;"><b>Active lines</b>: ' + LV.lines.map(function (x) { return esc(x.lbl) + ' ' + x.b + ' ' + REL[x.r]; }).join(' · ')
        + '<br><b>Prevalence</b>: ' + (LV.prevalence.length ? LV.prevalence.map(function (r) { return REL[r] + ' ×' + LV.count[r] + (REL_WHO[r] ? ' (' + REL_WHO[r] + ')' : ''); }).join(', ') : 'none')
        + levelsText(LV).map(function (t) { return '<br>' + (t.indexOf('controls') >= 0 ? '<span style="' + O + '">⚖ ' : '<span style="' + G + '">↺ ') + esc(t) + '</span>'; }).join('') + '</div>';
    } catch (e) {}
    // what He Luo says for the purpose
    var box = '';
    if (th.key === 'luck') {
      box += th.luck.length ? '<div style="' + G + '">▲ ' + esc(th.luck.join(' · ')) + '</div>' : '<div>None of the three Luck in the hexagrams of this day.</div>';
      if (th.opp.length) box += '<div style="' + Rd + '">▼ ' + esc(th.opp.join(' · ')) + '</div>';
      if (th.luckD) { var D2 = th.luckD;
        box += '<div style="margin-top:5px;padding-top:4px;border-top:1px dashed #ccc;"><b>Luck from the day pillar</b> (what you are: study, writing, teaching) · ' + (D2.s > 0 ? '+' : D2.s < 0 ? '−' : '±') + Math.abs(D2.s) + '</div>'
          + (D2.lk.length ? '<div style="' + G + '">▲ ' + esc(D2.lk.join(' · ')) + '</div>' : '<div>None of the day Luck in the hexagrams of this day.</div>')
          + (D2.opp.length ? '<div style="' + Rd + '">▼ ' + esc(D2.opp.join(' · ')) + '</div>' : '')
          + '<div style="font-size:10px;color:#999;">Above: Luck from the year pillar (what you obtain: money, clients); the ☯ score uses those.</div>'; }
    } else if (th.key === 'cure') {
      box += th.need ? '<div>The natal chart needs <b>' + th.need + '</b> to come back into balance.</div>' + (th.cure.length ? '<div>' + esc(th.cure.join(' · ')) + '</div>' : '<div>Block and day hexagram are balanced: no help, no harm.</div>')
        : '<div>Yin and yang of the natal chart are in line: no cure needed from the day.</div>';
    } else if (th.X) {
      box += th.on.length ? '<div style="' + G + '">▲ ' + REL[th.X] + ' (' + XK_PL[th.key] + ') on: ' + th.on.map(function (L) { return XK_LBL[L.k] + ' ' + L.b + (L.hidden ? ' hidden' : '') + (L.fl > 1 ? ' ↑' : L.fl < 1 ? ' ↓' : ''); }).join(' · ') + '</div>'
        : '<div>' + REL[th.X] + ' (' + XK_PL[th.key] + ') is not on the lines of this day.</div>';
      if (th.price.length) box += '<div style="' + Rd + '">▼ The price: ' + REL[th.A] + ', which attacks ' + REL[th.X] + ', on ' + th.price.map(function (L) { return XK_LBL[L.k] + ' ' + L.b + (L.fl > 1 ? ' ↑' : L.fl < 1 ? ' ↓' : ''); }).join(' · ') + '</div>';
      var TR = th.tri, tl = function (a) { return a.map(function (x) { return x.lbl + (x.dl ? ' (day Luck: not a price)' : '') + fArr(x.f, x.fb); }).join(' · '); };
      if (TR && TR.plus.length) box += '<div style="' + G + '">▲ ' + REL[th.X] + ' also in the trigrams: ' + esc(tl(TR.plus)) + '</div>';
      if (TR && TR.minus.length) box += '<div style="' + Rd + '">▼ The price (' + REL[th.A] + ') in the trigrams: ' + esc(tl(TR.minus)) + '</div>';
      if (TR && TR.voidT.length) box += '<div style="' + O + '">⏳ Void trigrams, not counted (all their branches are empty): ' + esc(tl(TR.voidT)) + '</div>';
      if (TR && TR.gOn) box += '<div style="' + Rd + '">▼ Wealth feeds the Ghost (財生殺): money can turn into pressure — ' + esc(tl(TR.ghost)) + '</div>';
      if (TR && TR.ctl && TR.ctl.length) box += '<div style="' + G + '">▲ The Fire controls the strong Brothers (no 財生殺): ' + esc(tl(TR.ctl)) + ' — what competes for the money is kept in check.</div>';
      if (TR && TR.chain && TR.chain.length) box += '<div style="' + G + '">▲ Brothers feed the Children of the hexagram on the left: ' + esc(tl(TR.chain)) + ' — not a price.</div>';
      if (th.chain && th.chain.length) box += '<div style="' + G + '">▲ Brothers feed the Children (' + th.chain.map(function (L) { return XK_LBL[L.k] + ' ' + L.b + ' → ' + L.chain.b; }).join(' · ') + '): colleagues who make you productive, not a price.</div>';
      var bkL = th.lines.filter(function (L) { return L.fb > 1 && L.bk && (L.r === th.X || L.r === th.A); });
      if (bkL.length) box += '<div>' + bkL.map(function (L) { return '<span style="' + (L.r === th.X ? G : Rd) + '">↩ ' + XK_LBL[L.k] + ' ' + L.b + ' ' + REL[L.r] + ' strengthened by ' + XK_LBL[L.bk.k] + ' ' + L.bk.b + ' (backward flow, while it lasts)</span>'; }).join('<br>') + '</div>';
      if (TR && (TR.plus.length || TR.minus.length || TR.gOn)) box += '<div style="font-size:10px;color:#999;">↩ strengthened by the smaller hexagram on the right (backward flow). ↑ strengthened, ↓ weakened by the trigram in the same place of the hexagram on the left.</div>';
      th.later.forEach(function (L) {
        var Y = +iso.slice(0, 4) + 1; while (BR[((Y - 4) % 12 + 12) % 12] !== L.b) Y++;
        box += '<div style="' + O + '">⏳ ' + XK_LBL[L.k] + ' ' + L.b + ' is void: not a no, the fruits come later, when ' + L.b + ' comes out — '
          + (L.easy ? 'easy (in season at birth): the ' + L.b + ' month (' + BR_MON[L.b] + '), the year ' + Y + ' (age ' + (Y - y0 + 1) + '), a timely clash (' + clash(L.b) + ') or when it moves.'
            : 'hard (out of season at birth): only in a year and a month that put ' + L.el + ' in season, then with ' + L.b + ', a clash or when it moves.') + '</div>';
      });
      // Edu 12/11 (Greece 2019): annual line of the month, criticism (Speak), surprises from the void, turn of the month
      if (th.am) { var amL = NJ()[th.am.n].lines[th.am.l - 1], amR = rel(me, amL.el), amT = '';
        try { amT = (window.XKDG_HELUO_TEXTS[th.am.n].lines[th.am.l] || {}).statement || ''; } catch (e) {}
        box += '<div style="' + (th.am.s > 0 ? G : th.am.s < 0 ? Rd : '') + '">' + (th.am.s > 0 ? '▲' : th.am.s < 0 ? '▼' : '·') + ' Annual line of the month: ' + th.am.n + ' l' + th.am.l + ' ' + amL.branch + ' ' + REL[amR] + (amT ? ' — «' + esc(amT) + '»' : '') + '</div>'; }
      if (th.critE && th.critE.length) box += '<div style="' + O + '">⚠ Criticism without substance: ' + th.critE.map(function (L) { return XK_LBL[L.k] + ' ' + L.b; }).join(' · ') + ' (Brothers in a Luck trigram, void Brothers in the cycle) — it does not take away.</div>';
      if (th.crit && th.crit.length) box += '<div style="' + Rd + '">▼ Criticism from colleagues and rivals (Brothers' + (th.crit.some(function (c) { return c.k === 'tri'; }) ? ', Dui = the mouth' : '') + '): ' + th.crit.map(function (c) { return c.k === 'tri' ? c.lbl + fArr(c.f) : XK_LBL[c.k] + ' ' + c.b + (c.fl > 1 ? ' ↑' : c.fl < 1 ? ' ↓' : ''); }).join(' · ') + '</div>';
      (th.surprise || []).forEach(function (L) { box += '<div style="' + O + '">⚡ ' + XK_LBL[L.k] + ' ' + L.b + ' comes out of the void (' + VOID_HOW[L.how] + '): something hidden surfaces suddenly — ' + REL[L.r] + ': ' + REL_MEAN[L.r] + '.</div>'; });
      if (th.turn) box += '<div style="' + Rd + '">⚠ Turn of the month: this month is good for ' + XK_PL[th.key] + ', the next one is against it' + (th.turn.from ? ' (from ' + th.turn.from.getUTCDate() + ' ' + MON[th.turn.from.getUTCMonth()] + ')' : '') + '. What you obtain now can be reversed: close and secure it before the change.</div>';
      var cl = th.lines.filter(function (L) { return (L.k === 'd' || L.k === 's2') && th.Pe.day[1] === clash(L.b); });
      if (cl.length) box += '<div style="' + Rd + '">The day branch ' + th.Pe.day[1] + ' clashes ' + cl.map(function (L) { return XK_LBL[L.k] + ' ' + L.b; }).join(' · ') + '</div>';
      // Edu 12/11 evening (8/12/2015): texts of the day line, Wealth stolen, purpose at a loss
      if (th.steal && th.steal.length) box += '<div style="' + Rd + '">▼ Brothers steal the Wealth (兄弟劫財) on ' + th.steal.map(function (L) { return XK_LBL[L.k] + ' ' + L.b; }).join(' · ') + ': a partner, a rival or a third person takes what is yours.</div>';
      if (th.loss && th.loss.length) box += '<div style="' + Rd + '">▼ ' + REL[th.X] + ' is in play, but at a loss: ' + th.loss.map(function (L) { return XK_LBL[L.k] + ' ' + L.b; }).join(' · ') + ' (unfavourable text' + (th.sd < 0 ? ', after an unfavourable primary text' : '') + ').</div>';
      if (th.sd || th.so) box += '<div style="' + (th.sd + th.so / 2 > 0 ? G : th.sd + th.so / 2 < 0 ? Rd : '') + '">' + (th.sd + th.so / 2 > 0 ? '▲' : th.sd + th.so / 2 < 0 ? '▼' : '·') + ' Texts of the day: primary ' + sgn(th.sd) + ', outcome ' + sgn(th.so) + '.</div>';
    } else box += '<div>No purpose chosen: reading only.</div>';
    // Critical day (Edu 12/11 evening): 5 signals = severe; 4 = critical with a sixth signal, otherwise a light warning
    if (th.alarm) { var AL = th.alarm, sev = AL.level === 'severe', crt = AL.level === 'critical';
      box = '<div style="border:2px solid ' + (sev ? '#b71c1c' : crt ? '#c62828' : '#e65100') + ';background:' + (sev ? '#ffebee' : crt ? '#fff3f0' : '#fff8e1') + ';border-radius:6px;padding:6px;margin-bottom:6px;">'
        + '<b style="color:' + (sev ? '#b71c1c' : crt ? '#c62828' : '#e65100') + ';">' + (sev ? '⚠⚠ SEVERE DAY' : crt ? '⚠ CRITICAL DAY' : '⚠ Four danger signals') + '</b> — ' + (sev ? 'all five signals: break with the partner, money and clients lost. Do not choose this day; protect what you have.' : crt ? 'four signals and a sixth one: serious risk for money and partner. Avoid it.' : 'four of the five signals: be careful with money and partner.')
        + '<div style="font-size:11px;margin-top:3px;">' + AL.sig.map(function (x) { return '• ' + esc(x); }).join('<br>') + (AL.six.length ? '<br>' + AL.six.map(function (x) { return '• ' + esc(x); }).join('<br>') : '') + '</div>'
        + '</div>' + box; }
    if (th.key !== 'luck' && (th.luck.length || th.opp.length)) box += '<div style="font-size:11px;color:#555;margin-top:3px;">' + (th.dayLuck ? '<b>Luck from the day pillar</b> (study, teaching): ' : '') + (th.luck.length ? '<span style="' + G + '">' + esc(th.luck.join(' · ')) + '</span>' : '') + (th.luck.length && th.opp.length ? ' · ' : '') + (th.opp.length ? '<span style="' + Rd + '">' + esc(th.opp.join(' · ')) + '</span>' : '') + '</div>';
    var pos = dh.line === 1 ? 'Line 1: a beginning — good for what starts (launch, wedding, first step).' : dh.line === 6 ? 'Line 6: an end or a completion — good for what closes (sale, closing, conclusion).' : '';
    if (pos) box += '<div style="font-size:11px;color:#555;margin-top:3px;">' + pos + '</div>';
    h += '<div style="border:1px solid #b39ddb;background:#f7f3fd;border-radius:8px;padding:8px;margin:6px 0;font-size:12px;line-height:1.55;">'
      + '<div style="font-weight:700;color:#4527a0;">He Luo for ' + (XK_PL[th.key] || 'this day') + (th.adj ? ' · ' + sgn(th.adj * 5) + '% on the XKDG score' : ' · no change to the XKDG score') + '</div>' + box + '</div>';
    function lv(title, L, hx, cy) {
      return '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;"><div style="font-size:12px;font-weight:600;color:#4527a0;">' + title + ' · ' + L.n + ' ' + esc(U().hexName ? U().hexName(L.n) : '') + ' line ' + L.l + '</div>'
        + (U().cycleHexSvg ? U().cycleHexSvg(hx, L.l, cy, me) : '')
        + '<div style="' + S_ + '">' + L.b + ' ' + L.el + ' = ' + relTag(L.r) + ' ' + REL[L.r] + (L.hid ? ' · hidden ' + L.hid.b + ' ' + relTag(L.hid.r) : '') + (L.fl && L.fl !== 1 && L.from ? ' · <span style="' + (L.fl > 1 ? G : Rd) + '">' + (L.fl > 1 ? '↑ strengthened' : '↓ weakened') + ' by ' + L.from.branch + ' ' + L.from.el + ' (same line on the left)</span>' : '')
        + (L.fb > 1 && L.bk ? ' · <span style="' + G + '">↩ strengthened by ' + L.bk.b + ' ' + L.bk.el + ' (' + XK_LBL[L.bk.k] + ', backward flow)</span>' : '')
        + (L.chain ? ' · <span style="' + G + '">feeds ' + L.chain.b + ' Children: not a price</span>' : '')
        + (L.voidL ? (L.filled ? ' · void, out today (' + VOID_HOW[L.how] + ')' : ' · <span style="' + O + '">void: later' + (L.easy ? ' (easy to leave)' : ' (hard to leave)') + '</span>') : '') + '</div>'
        + (U().lineBody ? U().lineBody(L.n, L.l, L.k === 'm' ? 'month' : 'day', true) : '') + '</div>';
    }
    var LK = {}; th.lines.forEach(function (L) { LK[L.k] = L; });
    var DC = dayClash(th), dcH = '';
    if (DC.length) dcH = '<div style="border:1px solid #ce93d8;background:#fbf5fd;border-radius:8px;padding:6px 8px;margin:6px 0;font-size:12px;line-height:1.6;"><b style="color:#6a1b9a;">The day ' + th.Pe.day[1] + ' hits a quiet line</b> (timely in the month ' + th.Pe.month[1] + ' = activated, otherwise eliminated)<br>'
      + DC.map(function (o) { return clashSpan(o, th.X, th.A); }).join('<br>') + clashDetail(DC, me, 'day') + '</div>';
    h += lv('1 · Month ' + p.month.index + ' — the line of the month', LK.m, p.month.hex, mP)
      + lv('2 · Lord of the Block (5 days) — the background of these days', LK.lord, dh.block, bP)
      + lv('3 · Day line in the block hexagram — primary text: cause, action', LK.d, dh.block, bP)
      + lv('4 · Same line in the day hexagram — outcome', LK.s2, dh.hex, dP)
      + dcH
      + hoursHtml(th, me)
      + '<div style="font-size:10px;color:#999;line-height:1.5;">He Luo raises or lowers days already favourable for XKDG (month, block, day only; from −3 to +3). The texts show the shape of the day — also the price of a success — not a plus or a minus. Years and months: see the He Luo chart reading.</div>';
    return h;
  }
  // 5 · the hours (Edu 12/11 evening, version A: hours on the branches, true solar time). Text and warnings, no score.
  function hoursHtml(th, me) {
    var hs = []; try { hs = hoursOfDay(_xk.ctx, th); } catch (e) { hs = []; }
    if (!hs.length) return '';
    var G = 'color:#2e7d32;', Rd = 'color:#c62828;', O = 'color:#e65100;', AL = th.alarm, out = '';
    var span = {}; for (var j = 1; j <= 6; j++) span[j] = HOUR_TST[2 * j - 2].split('–')[0] + '–' + HOUR_TST[2 * j - 1].split('–')[1];
    hs.forEach(function (h) {
      var col = h.s > 0 ? G : h.s < 0 ? Rd : '', mk = [];
      if (th.X && h.r === th.X) mk.push('<span style="' + G + '">' + REL[h.r] + '</span>');
      if (th.A && h.r === th.A) mk.push('<span style="' + Rd + '">' + REL[h.r] + ' (the price)</span>');
      if (h.voidOut.length) mk.push('<span style="' + O + '">⚡ void ' + h.voidOut.join('') + ' comes out</span>');
      if (h.relief) mk.push('<span style="' + G + (h.relief.best ? 'font-weight:700;' : '') + '">✚ relieves the ' + REL[h.relief.of] + ' (' + esc(h.relief.how) + ')' + (h.relief.best ? ' · best hour for it' : h.relief.practical ? ' · best practical hour (07–23)' : '') + '</span>');
      if (h.spouse) mk.push('<span style="' + O + '">palace of the spouse ' + (h.b === _xk.ctx.Pn.day[1] ? 'present' : 'clashed') + '</span>');
      var six = h.voidOut.length || h.spouse;
      if (six && AL && AL.level === 'light') mk.push('<span style="' + Rd + ';font-weight:700;">⚠ critical in this hour</span>');
      if (six && AL && AL.level !== 'light') mk.push('<span style="' + Rd + ';font-weight:700;">⚠ the worst hour</span>');
      out += '<details style="border-top:1px solid #eee;padding:3px 0;"><summary style="cursor:pointer;font-size:12px;">'
        + '<b>' + h.pillar + '</b> ' + h.tst + (h.i === 0 ? ' (from the evening before)' : '') + ' · ' + h.n + ' ' + esc(U().hexName ? U().hexName(h.n) : '') + ' l' + h.l + ' ' + h.lb + ' ' + relTag(h.r)
        + ' <span style="' + col + '">' + (h.s > 0 ? '▲' : h.s < 0 ? '▼' : '·') + '</span>' + (mk.length ? ' · ' + mk.join(' · ') : '') + '</summary>'
        + (U().cycleHexSvg ? U().cycleHexSvg(h.hex, h.l, { span: span, cap: (function () { var c = {}; c[h.l] = h.tst; return c; })() }, me) : '')
        + '<div style="' + S_ + '">Hour ' + h.pillar + ' · ' + h.lb + ' ' + h.el + ' = ' + relTag(h.r) + ' ' + REL[h.r] + '</div>'
        + (U().lineBody ? U().lineBody(h.n, h.l, 'hour', true) : '') + '</details>';
    });
    return '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;"><div style="font-size:12px;font-weight:600;color:#4527a0;">5 · The hours (true solar time) — line k of the day hexagram rules two hours</div>'
      + '<div style="font-size:11px;color:#555;line-height:1.5;margin:2px 0 4px;">Odd hour: the day hexagram with line k changed; even hour: also the correlated line. The 子 hour starts the day at 23:00 of the evening before. Tap an hour for its hexagram and text. Not in the score.</div>'
      + out + '</div>';
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
  // lines hit by the year / day branch (Edu 13/11): ⚡ activated (timely in the month), ✕ eliminated (not timely)
  function clashSpan(o, X, A) {
    var w = o.lv + (o.also.length ? ' + ' + o.also.join(' + ') : '') + ' l' + o.l + ' ' + o.b + ' ' + REL[o.r];
    if (o.on) return '<span style="color:' + (o.s > 0 ? '#2e7d32' : o.s < 0 ? '#c62828' : '#555') + ';">⚡ ' + w + ' activated → ' + o.to.n + ' l' + o.l + ' ' + o.to.b + ' ' + REL[o.to.r] + ' (' + o.to.back + ')</span>';
    return '<span style="color:' + (X && o.r === X ? '#c62828' : A && o.r === A ? '#2e7d32' : '#777') + ';">✕ ' + w + ' eliminated: ' + REL_GONE[o.r] + '</span>';
  }
  function clashDetail(list, me, unit) {
    return list.filter(function (o) { return o.on; }).map(function (o) {
      return '<div style="border:1px solid #e0d7f0;border-radius:8px;padding:6px;margin:6px 0;"><div style="font-size:12px;font-weight:600;color:#4527a0;">⚡ Activated: ' + (/\d/.test(o.lv) ? o.lv : o.lv + ' ' + o.n) + ' ' + esc(U().hexName ? U().hexName(o.n) : '') + ' line ' + o.l + ' ' + o.b + ' ' + REL[o.r] + '</div>'
        + (U().cycleHexSvg ? U().cycleHexSvg(o.hx, o.l, null, me) : '') + (U().lineBody ? U().lineBody(o.n, o.l, unit, true) : '')
        + '<div style="font-size:12px;font-weight:600;color:#4527a0;margin-top:6px;">→ turns into ' + o.to.n + ' ' + esc(U().hexName ? U().hexName(o.to.n) : '') + ' line ' + o.l + ' ' + o.to.b + ' ' + REL[o.to.r] + ' (' + o.to.back + ')</div>'
        + (U().cycleHexSvg ? U().cycleHexSvg(o.to.hx, o.l, null, me) : '') + (U().lineBody ? U().lineBody(o.to.n, o.l, unit, true) : '') + '</div>';
    }).join('');
  }
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function plMark(ch, ctx, key, me, hx, line, yearBranch, monthBranch, prev, prevLine, perHex) {
    var L = NJ()[hx.n].lines[line - 1], X = xkRel(key, ch.male), A = X ? XK_ATT[X] : null, r = rel(me, L.el), m = [], sc = 0;
    var yv = natalVoids(ch.Pn).list, G = 'color:#2e7d32;font-weight:bold;', Rd = 'color:#c62828;font-weight:bold;', O = 'color:#e65100;';
    // Qi flow on the line (Edu 12/11): from the line in the same place of the hexagram on the left (period → year → month)
    var vNow = function (b) { return yv.indexOf(b) >= 0 && (!yearBranch || !voidExit(b, ch.Pn.month[1], { y: yearBranch, m: monthBranch, d: null }, [L.branch]).out); };
    var fl = prev ? lineFlow(prev.n, hx.n, line, vNow) : 1, fa = fl > 1 ? ' ↑' : fl < 1 ? ' ↓' : '';
    // backward flow (Edu 13/11): the master line of this year (its moved line) or month that generates the line crossed in
    // the bigger one (the period line; for a month the annual line that rules it) strengthens it for this year / month only.
    // Wealth: Brothers here that feed Children there are not a price (Brothers → Children → Wealth). His 2026 (67):
    // annual 16 l5 申 Brothers feeds the 子 Children of HT 43 l1 — productive with the help of collaborators.
    var LB = prev && prevLine ? NJ()[prev.n].lines[prevLine - 1] : null, rB = LB ? rel(me, LB.el) : null, chainL = false;
    if (LB && GEN[L.el] === LB.el && !vNow(L.branch)) {
      var bw = monthBranch ? XK_AM.rel * 2 * 0.5 : 2 * 0.5, wh = monthBranch ? 'the annual line ' + LB.branch : 'the period line ' + LB.branch;
      if (X && rB === X) { sc += bw; m.push('<span style="color:#2e7d32;">↩ ' + L.branch + ' ' + REL[r] + ' feeds ' + wh + ' ' + REL[rB] + ' (+' + REL[X] + ' while it lasts)</span>'); }
      else if (A && rB === A) { sc -= bw; m.push('<span style="color:#c62828;">↩ ' + L.branch + ' ' + REL[r] + ' feeds ' + wh + ' ' + REL[rB] + ' (the price grows)</span>'); }
      else if (rB) m.push('<span style="color:#555;">↩ ' + L.branch + ' ' + REL[r] + ' feeds ' + wh + ' ' + REL[rB] + '</span>');
    }
    if (X === 'W' && r === 'B' && rB === 'C' && !vNow(L.branch)) chainL = true;
    if (X && r === X) { m.push('<span style="' + G + '">▲ ' + REL[X] + fa + '</span>'); sc += 2 * fl; }
    else if (X && L.fushen && rel(me, L.fushen.el) === X) { m.push('<span style="' + G + '">▲ ' + REL[X] + ' hidden (' + L.fushen.branch + ')</span>'); sc += 1; }
    if (A && r === A && chainL) m.push('<span style="color:#2e7d32;">Brothers feed the Children (' + LB.branch + '): not a price</span>');
    else if (A && r === A) { m.push('<span style="' + Rd + '">▼ price: ' + REL[A] + fa + '</span>'); sc -= 2 * fl; }
    // Edu 12/11 (Greece 2019), rule 4: Speak — Brothers on the line = criticism from colleagues; Dui trigrams = the mouth
    var sL = SC() && SC()[hx.n] ? SC()[hx.n].l[line] : 0, outV = yv.indexOf(L.branch) >= 0 && !!yearBranch && (!monthBranch ? timely(L.el, ch.Pn.month[1]) : voidExit(L.branch, ch.Pn.month[1], { y: yearBranch, m: monthBranch, d: null }, [L.branch]).out);
    if (key === 'speak' && r === 'B' && (sL < 0 || outV)) {
      if (yearBranch && critEmpty(ctx, me, hx.n, line, perHex ? perHex.n : null, vNow)) m.push('<span style="' + O + '">⚠ Brothers: criticism without substance (in a Luck trigram, void Brothers in the cycle)</span>');
      else { m.push('<span style="' + Rd + '">▼ Brothers: criticism from colleagues' + fa + '</span>'); sc -= 2 * XK_CRIT * fl; } }
    if (key === 'speak' && yearBranch) { var nD = [hx.upper, hx.lower].filter(function (t) { return t === 'Dui'; }).length;
      if (nD && !triVoid('Dui', { list: yv, mb: ch.Pn.month[1], T: { y: yearBranch, m: monthBranch, d: null }, moved: [L.branch] })) { m.push('<span style="color:#c62828;">−Dui (the mouth: criticism)' + (nD > 1 ? ' ×2' : '') + '</span>'); sc -= nD * XK_CRIT; } }
    // rule 1: in a month row, the line of the annual that rules this month (prev = annual): relation and text
    // line value (relations and texts of the month line and of the annual line, no trigrams): for the turn of the month (rule 3)
    var lv = X ? (r === X ? 1 : 0) - (A && r === A ? 1 : 0) - (key === 'speak' && r === 'B' && sL < 0 ? XK_CRIT : 0) + sL * 0.5 : 0;
    if (monthBranch && prev) {
      var LA = NJ()[prev.n].lines[line - 1], rA = rel(me, LA.el), sA = SC() && SC()[prev.n] ? SC()[prev.n].l[line] : 0, aw = [];
      if (X && rA === X) { aw.push('+' + REL[X]); sc += XK_AM.rel * 2; }
      if (A && rA === A) { aw.push('−' + REL[A]); sc -= XK_AM.rel * 2; }
      if (key === 'speak' && rA === 'B' && sA < 0) { aw.push('−Brothers'); sc -= 2 * XK_CRIT; }
      if (X) { sc += sA * XK_AM.txt * 2; lv += (rA === X ? 1 : 0) - (A && rA === A ? 1 : 0) - (key === 'speak' && rA === 'B' && sA < 0 ? XK_CRIT : 0) + sA * 0.5; }
      if (X && (aw.length || sA)) m.push('<span style="' + (sA > 0 ? 'color:#2e7d32;' : sA < 0 ? 'color:#c62828;' : 'color:#555;') + '">annual l' + line + ' ' + LA.branch + ' ' + rA + (aw.length ? ' ' + aw.join(' ') : '') + (sA ? ', text ' + (sA > 0 ? '+' : '−') + Math.abs(sA) : '') + '</span>');
    }
    // the purpose in the trigrams and Hu (Edu 12/11): period = the other half of the native and the Hu that holds the line;
    // year = annual (flow from the period), month = monthly (flow from the annual); trigram 1, Hu 0.5
    if (X) {
      var seq;
      if (!yearBranch) { var two = TRI_EL[hx.upper] !== TRI_EL[hx.lower];
        seq = [['period', hx.n, null, 1, two ? (line <= 3 ? 'upper' : 'lower') : 'none', [line >= 2 && line <= 4, line >= 3 && line <= 5]]]; }
      else seq = [[monthBranch ? 'month' : 'year', hx.n, prev ? prev.n : null, 1]];
      var nr = {}; if (prev && yearBranch) nr[hx.n] = [prev.n];
      var lDp = DAY_LUCK[key] && ctx.profD ? ['heaven', 'earth', 'fame'].filter(function (k) { return !ctx.profD.K[k].vuoto; }).map(function (k) { return ctx.profD.K[k].t; }) : [];
      var Vp = !yearBranch ? { list: yv, birth: true } : { list: yv, mb: ch.Pn.month[1], T: { y: yearBranch, m: monthBranch, d: null }, moved: [L.branch] };
      var tq = triScore(me, X, A, triRows(seq), X === 'W' && r === 'W' ? [hx.n] : [], Vp,
        { opp: key === 'wealth' ? ['heaven', 'earth', 'fame'].map(function (k) { return ctx.prof.K[k].op; }) : [], bro: r === 'B' ? [hx.n] : [], near: nr, luckD: lDp });
      function tl(a) { var o = [], n = {}; a.forEach(function (x) { var k = x.t + (x.lbl.indexOf('Hu') >= 0 ? ' (Hu)' : '') + (x.dl ? ' (day Luck)' : '') + fArr(x.f, x.fb); if (!n[k]) o.push(k); n[k] = (n[k] || 0) + 1; }); return o.map(function (k) { return k + (n[k] > 1 ? ' ×' + n[k] : ''); }).join(', '); }
      if (tq.plus.length) m.push('<span style="color:#2e7d32;">+' + REL[X] + ' in ' + tl(tq.plus) + '</span>');
      if (tq.minus.length) m.push('<span style="color:#c62828;">−' + REL[A] + ' in ' + tl(tq.minus) + '</span>');
      if (tq.gOn) m.push('<span style="color:#c62828;">−Ghost fed by the Wealth: ' + tl(tq.ghost) + '</span>');
      if (tq.ctl.length) m.push('<span style="color:#2e7d32;">Fire controls the Brothers (no 財生殺): ' + tl(tq.ctl) + '</span>');
      if (tq.chain.length) m.push('<span style="color:#2e7d32;">Brothers feed the Children: ' + tl(tq.chain) + ' (not a price)</span>');
      if (tq.oppW.length) m.push('<span style="color:#777;">Wealth in the opposite of a Luck, not counted: ' + tl(tq.oppW) + '</span>');
      if (tq.voidT.length) m.push('<span style="' + O + '">⏳ void, not counted: ' + tl(tq.voidT) + '</span>');
      sc += tq.s;
    }
    // voids (Edu, 12/11): the year and month rows read a MOVING line (what moves cannot be void); the period line does not move
    if (yv.indexOf(L.branch) >= 0) {
      var easy = timely(L.el, ch.Pn.month[1]), vt = '';
      if (!yearBranch) vt = easy ? ': easy to leave (same branch, a timely clash or a moving line)' : ': hard to leave (needs a year and a month in its season)';
      else if (!monthBranch) vt = easy ? ', out this year (it moves)' : timely(L.el, yearBranch) ? ': this year can bring it out, in the months of its season' : ': stays void this year (out of season)';
      else { var vx = voidExit(L.branch, ch.Pn.month[1], { y: yearBranch, m: monthBranch, d: null }, [L.branch]);
        vt = vx.out ? ', out this month (' + VOID_HOW[vx.how] + ')' : ': stays void (year and month not both in its season)'; }
      m.push('<span style="' + O + '">⏳ ' + L.branch + ' void' + vt + '</span>');
      // rule 2 (Edu 12/11): out of the void now = something hidden surfaces suddenly
      if (yearBranch && /out this (month|year)/.test(vt)) m.push('<span style="' + O + '">⚡ hidden ' + REL[r] + ' surfaces suddenly: ' + REL_MEAN[r] + '</span>');
    }
    // Luck (Edu 12/11): each trigram with the Qi flow from the hexagram on its left (period → year → month; Hu of the
    // period on lines 2–5); a void Luck adds nothing unless a clashing branch of the time brings it out; opposites always count
    var rows = [[hx, prev ? flowMul([prev.upper, prev.lower], [hx.upper, hx.lower]) : [1, 1], '']];
    if (!yearBranch && line >= 2 && line <= 5) { var hu = H().huGua(hx.lines); rows[0][2] = ' (' + hx.n + ')'; rows.push([hu, flowMul([hx.upper, hx.lower], [hu.upper, hu.lower]), ' (Hu ' + hu.n + ')']); }
    function cnt(a) { var o = [], n = {}; a.forEach(function (x) { if (!n[x]) o.push(x); n[x] = (n[x] || 0) + 1; }); return o.map(function (x) { return x + (n[x] > 1 ? ' ×' + n[x] : ''); }).join(', '); }
    // two sets of Luck (Edu 12/11): year (default), day (Speak, Support); the Luck purpose shows both, the score from the year
    function luckPl(P, lbl) {
      var LM = luckMuls(P, { y: yearBranch, m: monthBranch, d: null }), lk = [], op = [], lkS = 0, opS = 0;
      // Edu 12/11 evening: a void opposite (his Dui = 酉) takes nothing away; periods stay void, years and months use voidExit
      var VP = { list: yv, mb: ch.Pn.month[1], T: { y: yearBranch, m: monthBranch, d: null }, moved: [L.branch], birth: !yearBranch };
      rows.forEach(function (x) { ['heaven', 'earth', 'fame'].forEach(function (k) {
        var Lk = P.K[k], br = bridge(Lk, [x[0].upper, x[0].lower]);
        [x[0].upper, x[0].lower].forEach(function (t, i) {
          var f = x[1][i], fl = f > 1 ? ' ↑' : f < 1 ? ' ↓' : '';
          if (t === Lk.t) { if (LM[k].pos) { lkS += f; lk.push(cap(k) + x[2] + fl); } else lk.push(cap(k) + x[2] + ' (void)'); }
          if (t === Lk.op && !br) { if (triVoid(t, VP)) op.push(cap(k) + x[2] + ' (void, 0)'); else { opS += f; op.push(cap(k) + x[2] + fl); } }
        });
      }); });
      if (lk.length) m.push('<span style="' + (key === 'luck' ? G : 'color:#2e7d32;') + '">' + (key === 'luck' ? '▲ ' : '+') + lbl + 'Luck: ' + cnt(lk) + '</span>');
      if (op.length) m.push('<span style="' + (key === 'luck' ? Rd : 'color:#c62828;') + '">' + (key === 'luck' ? '▼ ' : '−') + 'opposite of ' + lbl + 'Luck: ' + cnt(op) + '</span>');
      return Math.round(lkS - opS);
    }
    var dl = DAY_LUCK[key] && ctx.profD, lsY = luckPl(dl ? ctx.profD : ctx.prof, dl ? 'day ' : key === 'luck' && ctx.profD ? 'year ' : '');
    if (key === 'luck') { sc = lsY; if (ctx.profD) { var lsD = luckPl(ctx.profD, 'day '); if (lsD) m.push('<span style="color:#555;">day Luck ' + (lsD > 0 ? '+' : lsD < 0 ? '−' : '±') + Math.abs(lsD) + '</span>'); } }
    if (key === 'cure') {
      var pr = ctx.prof, need = (pr.rY < -0.25 || pr.rE > 0.25) && !(pr.rE < -0.25 || pr.rY > 0.25) ? 'yang' : (pr.rE < -0.25 || pr.rY > 0.25) && !(pr.rY < -0.25 || pr.rE > 0.25) ? 'yin' : null;
      var q = yyTri(hx);
      if (need && q) { m.unshift(q === need ? '<span style="' + G + '">▲ two ' + q + ' trigrams: what the chart needs</span>' : '<span style="' + Rd + '">▼ two ' + q + ' trigrams: the chart has too much</span>'); sc = q === need ? 2 : -2; }
      else if (!need) m.unshift('<span style="color:#777;">chart in balance</span>');
    }
    return { L: L, r: r, html: m.join(' · '), sc: sc, lv: lv };
  }
  // Advance notice (Edu 13/11): severe and critical days in the next 30 days (Wealth, and Relationship for a man), shown
  // at the opening of the He Luo chart and in the planner. Warning only, no score.
  var _al = { k: null, list: [] };
  function alarmsAhead(ch, days) {
    if (!ch || !ch.R || !ch.Pn || !NJ()) return [];
    days = days || 30;
    var lon = xkLon(ch.c); if (!isFinite(lon)) return [];
    var t = new Date(), d0 = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()), D = 86400000;
    var k = [ch.c.name, ch.c.date, ch.c.time, ch.male, Math.round(lon * 10), d0, days].join('|');
    if (_al.k === k) return _al.list;
    var ctx = context(ch.R, ch.Pn, ch.male), keys = ['wealth'].concat(ch.male ? ['relationship'] : []), by = {};
    for (var i = 0; i <= days; i++) {
      var dt = new Date(d0 + i * D), Pe = null;
      try { Pe = pillarsTstNoon(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), lon); } catch (e) { continue; }
      keys.forEach(function (key) { var th = null; try { th = thread(ctx, Pe, lon, key); } catch (e) {}
        if (!th || !th.alarm || th.alarm.level === 'light') return;
        var g = by[i] || (by[i] = { ms: d0 + i * D, inDays: i, level: th.alarm.level, keys: [], pillar: Pe.day });
        if (th.alarm.level === 'severe') g.level = 'severe'; g.keys.push(XK_PL[key]); });
    }
    _al = { k: k, list: Object.keys(by).map(function (x) { return by[x]; }).sort(function (a, b) { return a.ms - b.ms; }) };
    return _al.list;
  }
  function alarmAheadHtml(ch) {
    var L = []; try { L = alarmsAhead(ch, 30); } catch (e) { L = []; }
    if (!L.length) return '';
    return '<div style="border:2px solid #c62828;background:#fff3f0;border-radius:8px;padding:6px 8px;margin:6px 0;font-size:12px;line-height:1.6;">'
      + L.map(function (g) { var sev = g.level === 'severe';
        return '<div style="color:' + (sev ? '#b71c1c' : '#c62828') + ';"><b>' + (sev ? '⚠⚠ Severe day ahead' : '⚠ Critical day ahead') + '</b>: ' + fmtDate(g.ms) + ' (' + g.pillar + ' day), '
          + (g.inDays === 0 ? 'today' : g.inDays === 1 ? 'tomorrow' : 'in ' + g.inDays + ' days') + ' · ' + g.keys.join(', ') + '</div>'; }).join('')
      + '<div style="font-size:10px;color:#777;">Money and partner at risk: do not start or sign anything important that day; protect clients and what you have. Details in the XKDG day window (He Luo).</div></div>';
  }
  function plBg(sc, on) { return on ? 'background:#fff3e0;' : sc > 0 ? 'background:#f1f8e9;' : sc < 0 ? 'background:#fdecea;' : ''; }
  function plBody(ch) {
    var R = ch.R, ctx = context(R, ch.Pn, ch.male), key = _pl.key, y0b = R.input.o.year, nowY = H().heluoYearOf(), nowAge = nowY - y0b + 1;
    var TD = 'padding:4px 5px;vertical-align:top;', X = xkRel(key, ch.male), lon = xkLon(ch.c);
    var F = 'padding:5px;border:1px solid #b39ddb;border-radius:5px;font-size:13px;';
    var h = alarmAheadHtml(ch) + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:6px 0;"><div><label style="font-size:11px;color:#666;display:block;">Purpose</label><select onchange="xkdgHLPlan(\'key\',this.value)" style="' + F + '">'
      + Object.keys(XK_PL).map(function (k) { return '<option value="' + k + '"' + (k === key ? ' selected' : '') + '>' + XK_PL[k] + '</option>'; }).join('') + '</select></div>'
      + '<div style="font-size:11px;color:#555;line-height:1.5;max-width:330px;">' + (X ? XK_PL[key] + ' = <b>' + REL[X] + '</b>' + (key === 'relationship' ? ' (' + (ch.male ? 'man' : 'woman') + ')' : '') + '; the price is ' + REL[XK_ATT[X]] + '.' : key === 'luck' ? 'Where the Heaven, Earth and Fame Luck trigrams appear.' : 'What brings the natal chart back into balance (yin and yang).') + ' ▲ helps · ▼ price · ⏳ void: later.</div></div>';
    // 1 · periods of years
    h += '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:8px 0 3px;">1 · Periods of years</div><table style="border-collapse:collapse;font-size:12px;width:100%;">';
    cycleRows(R).forEach(function (x, i) {
      var on = nowAge >= x.c.from && nowAge <= x.c.to, mk = plMark(ch, ctx, key, x.me, x.hx, x.c.line, null), id = 'c' + i, op = _pl.openC === id;
      h += '<tr onclick="xkdgHLPlan(\'c\',\'' + id + '\')" style="cursor:pointer;border-top:1px solid #eee;' + plBg(mk.sc, on) + '"><td style="' + TD + 'white-space:nowrap;"><b>age ' + x.c.from + '–' + x.c.to + '</b>' + (on ? ' ◀' : '') + '<div style="font-size:10px;color:#888;">' + x.y1 + '–' + x.y2 + '</div></td>'
        + '<td style="' + TD + 'white-space:nowrap;">' + x.phase + ' ' + x.hx.n + ' l' + x.c.line + '<br>' + mk.L.branch + ' ' + relTag(mk.r) + '</td><td style="' + TD + 'font-size:11px;line-height:1.5;">' + (mk.html || '<span style="color:#aaa;">—</span>') + '</td></tr>';
      if (op) h += '<tr><td colspan="3" style="padding:2px 6px 8px;">' + (U().cycleHexSvg ? U().cycleHexSvg(x.hx, x.c.line, x.phase === 'XT' ? R.cyclesXT : R.cyclesHT) : '') + (U().lineBody ? U().lineBody(x.hx.n, x.c.line, false, true) : '') + '</td></tr>';
    });
    h += '</table>';
    // 2 · the years, 3 · the months of the open year
    var Y0 = _pl.y0 || nowY, B = 'border:1px solid #b39ddb;background:#fff;color:#5e35b1;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;';
    h += '<div style="display:flex;align-items:center;gap:8px;margin:12px 0 3px;"><span style="font-size:12px;font-weight:600;color:#4527a0;">2 · The years · tap a year for its months</span>'
      + '<button onclick="xkdgHLPlan(\'y0\',' + (Y0 - 12) + ')" style="' + B + '">◀ 12</button><button onclick="xkdgHLPlan(\'y0\',' + nowY + ')" style="' + B + '">now</button><button onclick="xkdgHLPlan(\'y0\',' + (Y0 + 12) + ')" style="' + B + '">12 ▶</button></div>'
      + '<table style="border-collapse:collapse;font-size:12px;width:100%;">';
    for (var Y = Y0; Y < Y0 + 12; Y++) {
      var a = H().annual(R, Y); if (a.none) continue;
      var me = persona(a.periodHex, a.period.line), yb = BR[((Y - 4) % 12 + 12) % 12], mk = plMark(ch, ctx, key, me, a.hex, a.moved, yb, null, a.periodHex, a.period.line, a.periodHex), op = _pl.openY === Y;
      var XY = xkRel(key, ch.male), AY = XY ? XK_ATT[XY] : null, yc = yearClash(R, Y, me, a, 'x');
      if (yc.length) mk.html += (mk.html ? ' · ' : '') + '<span style="color:#6a1b9a;">⚡ the year ' + yb + ' hits ' + yc.map(function (o) { return o.lv + (o.also.length ? ' + ' + o.also.join(' + ') : '') + ' l' + o.l + ' ' + o.b + ' ' + REL[o.r]; }).join(', ') + ': activated in the months of its season, eliminated in the others</span>';
      h += '<tr onclick="xkdgHLPlan(\'y\',' + Y + ')" style="cursor:pointer;border-top:1px solid #eee;' + plBg(mk.sc, Y === nowY) + (op ? 'outline:2px solid #5e35b1;' : '') + '"><td style="' + TD + 'white-space:nowrap;"><b>' + Y + '</b> · age ' + a.age + (Y === nowY ? ' ◀' : '') + '<div style="font-size:10px;color:#888;">' + yb + ' year</div></td>'
        + '<td style="' + TD + 'white-space:nowrap;">' + a.hex.n + ' ' + esc(U().hexName ? U().hexName(a.hex.n) : '') + '<br>l' + a.moved + ' ' + mk.L.branch + ' ' + relTag(mk.r) + '</td><td style="' + TD + 'font-size:11px;line-height:1.5;">' + (mk.html || '<span style="color:#aaa;">—</span>') + '</td></tr>';
      if (!op) continue;
      var ms = null, aP = null; try { ms = H().periods.months(Y, lon); aP = H().periods.annual(ms); } catch (e) {}
      h += '<tr><td colspan="3" style="padding:4px 4px 10px;background:#faf8ff;">' + (U().cycleHexSvg ? U().cycleHexSvg(a.hex, a.moved, aP, me) : '') + (U().lineBody ? U().lineBody(a.hex.n, a.moved, 'year', true) : '')
        + '<div style="font-size:12px;font-weight:600;color:#4527a0;margin:8px 0 3px;">3 · The months of ' + Y + ' (age ' + a.age + ')</div><table style="border-collapse:collapse;font-size:12px;width:100%;">';
      var MK = a.months.map(function (mo) { return plMark(ch, ctx, key, me, mo.hex, mo.line, yb, BR[(mo.index - 1) % 12], a.hex, mo.line, a.periodHex); });
      var YC = a.months.map(function (mo) { return yearClash(R, Y, me, a, BR[(mo.index - 1) % 12]); });
      MK.forEach(function (mm, i) { if (YC[i].length) mm.html += (mm.html ? ' · ' : '') + YC[i].map(function (o) { return clashSpan(o, XY, AY); }).join(' · '); });
      a.months.forEach(function (mo, i) {
        var mm = MK[i], opM = _pl.openM === mo.index, per = '';
        try { var s = ms[i].start, e = new Date((ms[i + 1].start || ms[i + 1].end).getTime() - 86400000); per = s.getUTCDate() + ' ' + MON3[s.getUTCMonth()] + '–' + e.getUTCDate() + ' ' + MON3[e.getUTCMonth()]; } catch (e2) {}
        h += '<tr onclick="event.stopPropagation();xkdgHLPlan(\'m\',' + mo.index + ')" style="cursor:pointer;border-top:1px solid #eee;' + plBg(mm.sc, false) + '"><td style="' + TD + 'white-space:nowrap;"><b>' + per + '</b></td>'
          + '<td style="' + TD + 'white-space:nowrap;">' + mo.hex.n + ' l' + mo.line + ' ' + mm.L.branch + ' ' + relTag(mm.r) + '</td><td style="' + TD + 'font-size:11px;line-height:1.5;">' + (i > 0 && MK[i - 1].lv > 0 && mm.lv < 0 && key !== 'luck' && key !== 'cure' ? '<span style="color:#c62828;font-weight:bold;">⚠ turn: after a good month, this one can reverse what was obtained</span> · ' : '') + (mm.html || '<span style="color:#aaa;">—</span>') + '</td></tr>';
        if (opM) { var mP = null; try { var d0 = H().periods.dayMs(ms[i].start); mP = H().periods.month(d0, d0, H().periods.dayMs(ms[i + 1].start || ms[i + 1].end)); } catch (e3) {}
          h += '<tr onclick="event.stopPropagation()"><td colspan="3" style="padding:2px 6px 8px;">' + (U().cycleHexSvg ? U().cycleHexSvg(mo.hex, mo.line, mP, me) : '') + (U().lineBody ? U().lineBody(mo.hex.n, mo.line, 'month', true) : '') + clashDetail(YC[i], me, 'month') + '</td></tr>'; }
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
  // ── For the XKDG Assistant (Edu 13/11/2026): Person A's He Luo Li Shu day as plain data ──
  // aiDay('2026-11-13', ['wealth','speak'], true) → the same engine as the XKDG day window (thread), one block per purpose.
  function aiDay(iso, keys, withHours) {
    var ch = H().chartA ? H().chartA() : { err: 'birth' };
    if (ch.err) return { error: ch.err === 'gender' ? 'Person A needs the gender (M/F) for the He Luo chart.' : ch.err === 'birth' ? 'Person A needs birth date and birth hour.' : 'No birth longitude for Person A.' };
    var lon = xkLon(ch.c); if (!isFinite(lon)) return { error: 'No longitude available.' };
    var t = new Date(), m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var Y = m ? +m[1] : t.getFullYear(), Mo = m ? +m[2] : t.getMonth() + 1, D = m ? +m[3] : t.getDate();
    var ctx = context(ch.R, ch.Pn, ch.male), Pe = pillarsTstNoon(Y, Mo, D, lon);
    keys = (keys && keys.length ? keys : (ch.male ? ['wealth', 'relationship', 'speak'] : ['wealth', 'relationship', 'speak'])).filter(function (k) { return XK_PL[k] && k !== 'cure'; });
    var LV0 = null; try { LV0 = levelsOfDay(thread(ctx, Pe, lon, 'wealth')); } catch (e) {}
    if (LV0) LV0.prevalence.forEach(function (r) { (PREV_PURP[r] || []).forEach(function (k) { if (keys.indexOf(k) < 0) keys.unshift(k); }); });
    var TXT = window.XKDG_HELUO_TEXTS || {};
    function stmt(n, l) { try { return ((TXT[n] || {}).lines || {})[l].statement || ''; } catch (e) { return ''; } }
    function lineOut(L) { return { level: XK_LBL[L.k], hexagram: L.n, line: L.l, branch: L.b, element: L.el, relation: REL[L.r], text_score: SC() && SC()[L.n] ? SC()[L.n].l[L.l] : null,
      text: stmt(L.n, L.l), void: L.voidL ? (L.filled ? 'void, comes out today' : 'void (later)') : undefined, backward_flow: L.fb > 1 ? 'strengthened by ' + L.bk.b : undefined }; }
    function triL(a) { return (a || []).map(function (x) { return x.lbl; }); }
    // the «film» of the day (Edu 13/11/2026): scenario, backdrop, actor, action, clashes on active lines, hours
    function hexT(n) { var t = TXT[n] || {}; return { hexagram: n, name: t.title || '', judgment: t.judgment || '' }; }
    function filmL(o, extra) { var r = { hexagram: o.n, line: o.l, branch: o.b, element: o.el, relation: REL[o.r], who: REL_WHO[o.r], text: stmt(o.n, o.l), text_score: o.s,
      season: o.on ? 'strong in this month (timely)' : 'weak in this month (not timely)' }; if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; }); return r; }
    function hitT(h) { return h.by + ' clashes the ' + h.lv + ' ' + h.n + ' l' + h.l + ' ' + h.b + ' ' + REL[h.r] + (h.alive ? ' — timely in the month: it COMES ALIVE, its text acts strongly now' : ' — not timely in the month: it GIVES WAY, its text breaks (a brake fails, a protection collapses)') + ' «' + stmt(h.n, h.l) + '»'; }
    function quietT(c, who) { return who + ' clashes the quiet line ' + c.lv + ' ' + c.n + ' l' + c.l + ' ' + c.b + ' ' + REL[c.r] + (c.on ? ' — ACTIVATED (timely): «' + stmt(c.n, c.l) + '» → turns into ' + c.to.n + ' l' + c.l + ' ' + c.to.b + ' ' + REL[c.to.r] + ' «' + stmt(c.to.n, c.l) + '»' : ' — ELIMINATED (not timely): ' + REL_GONE[c.r]); }
    function filmOut(F) {
      if (!F) return undefined; var L = F.lines, p = { };
      p.scenario = { cycle: filmL(F.cycle, hexT(F.cycle.n)), annual: filmL(F.annual, hexT(F.annual.n)), year_branch: F.yb,
        year_clash: F.yearHits.map(hitT).concat(F.yearQuiet.map(function (c) { return quietT(c, 'the year ' + F.yb); })) };
      p.backdrop = { annual_line_of_the_month: L.am ? filmL(L.am) : undefined, month_line: L.m ? filmL(L.m, hexT(L.m.n)) : undefined, month_branch: F.mb };
      p.actor = L.lord ? filmL(L.lord, hexT(L.lord.n)) : undefined;
      p.action = { day_line: L.d ? filmL(L.d) : undefined, outcome: L.s2 ? filmL(L.s2, hexT(L.s2.n)) : undefined, day_branch: F.db,
        day_clash: F.dayHits.map(hitT).concat(F.dayQuiet.map(function (c) { return quietT(c, 'the day ' + F.db); })) };
      return p;
    }
    var out = { person: ch.c.name, date: Y + '-' + String(Mo).padStart(2, '0') + '-' + String(D).padStart(2, '0'),
      bazi_of_the_day_column_order: [['Day', Pe.day], ['Month', Pe.month], ['Year', Pe.year]].map(function (x) { return x[0] + ' ' + x[1]; }),
      natal_bazi: ['Hour ' + ch.Pn.hour, 'Day ' + ch.Pn.day, 'Month ' + ch.Pn.month, 'Year ' + ch.Pn.year],
      natal_voids: natalVoids(ch.Pn).list, purposes: {} }, first = null;
    if (LV0) { out.active_lines = LV0.lines.map(function (x) { return x.lbl + ' ' + x.b + ' ' + x.el + ' ' + REL[x.r]; });
      out.prevalence = LV0.prevalence.length ? LV0.prevalence.map(function (r) { return REL[r] + ' x' + LV0.count[r] + (REL_WHO[r] ? ': ' + REL_WHO[r] : ''); }) : ['none'];
      out.prevalence_purposes_added = LV0.prevalence.reduce(function (a, r) { return a.concat((PREV_PURP[r] || []).map(function (k) { return XK_PL[k]; })); }, []);
      out.relations_between_levels = levelsText(LV0); }
    keys.forEach(function (key) {
      var th = null; try { th = thread(ctx, Pe, lon, key); } catch (e) { th = null; }
      if (!th) { out.purposes[XK_PL[key]] = { note: 'no reading for this day' }; return; }
      if (!first) first = th;
      if (!out.age_heluo) { var p = th.p; out.age_heluo = p.age;
        out.cycle = { phase: p.phase, hexagram: p.hx.n, line: p.per.line, branch: NJ()[p.hx.n].lines[p.per.line - 1].branch, person_element: th.pers };
        out.annual = { hexagram: p.id.year[0], moved_line: p.id.year[1], text: stmt(p.id.year[0], p.id.year[1]) };
        out.month = { hexagram: p.month.hex.n, line: p.month.line }; out.block = { hexagram: p.id.lord[0], lord_line: p.id.lord[1] };
        out.day = { hexagram: p.id.day[0], line: p.id.day[1], outcome_hexagram: p.id.dayHex[0] };
        try { out.film = filmOut(filmOfDay(th)); } catch (e) {} }
      var o = { score: th.adj, score_note: 'He Luo score of the day from −3 to +3 (raises or lowers XKDG days)', raw: Math.round(th.t * 100) / 100,
        lines_read: th.lines.map(lineOut) };
      if (th.alarm) o.alarm = { level: th.alarm.level, signals: th.alarm.sig, sixth: th.alarm.six };
      if (th.X) { o.purpose_relation = REL[th.X]; o.price_relation = th.A ? REL[th.A] : null;
        o.purpose_on = th.on.map(function (L) { return L.b + (L.hidden ? ' hidden' : ''); }); o.price_on = th.price.map(function (L) { return L.b; });
        o.purpose_in_trigrams = triL(th.tri.plus); o.price_in_trigrams = triL(th.tri.minus); }
      if (th.steal && th.steal.length) o.brothers_steal_wealth = th.steal.map(function (L) { return L.b; });
      if (th.loss && th.loss.length) o.in_play_but_at_a_loss = th.loss.map(function (L) { return L.b; });
      if (th.tri && th.tri.gOn) o.wealth_feeds_ghost = triL(th.tri.ghost);
      if (th.tri && th.tri.ctl && th.tri.ctl.length) o.fire_controls_brothers = triL(th.tri.ctl);
      if (th.chain && th.chain.length) o.brothers_feed_children = th.chain.map(function (L) { return L.b; });
      if (th.crit && th.crit.length) o.criticism = th.crit.map(function (L) { return L.b || L.lbl; });
      if (th.critE && th.critE.length) o.criticism_without_substance = th.critE.map(function (L) { return L.b; });
      if (th.surprise && th.surprise.length) o.hidden_surfaces = th.surprise.map(function (L) { return L.b; });
      if (th.turn) o.turn_of_the_month = th.turn;
      if (th.later && th.later.length) o.fruits_later_void = th.later.map(function (L) { return L.b; });
      try { var dcx = dayClash(th); if (dcx.length && !out.day_branch_hits_quiet_lines) out.day_branch_hits_quiet_lines = dcx.map(function (c) {
        return c.lv + ' ' + c.n + ' l' + c.l + ' ' + c.b + ' ' + REL[c.r] + (c.on ? ' ACTIVATED (timely in the month): text ' + c.s + ' «' + stmt(c.n, c.l) + '» → turns into ' + c.to.n + ' l' + c.l + ' ' + c.to.b + ' ' + REL[c.to.r] + ' (' + c.to.back + ') «' + stmt(c.to.n, c.l) + '»' : ' ELIMINATED (not timely in the month): ' + REL_GONE[c.r]); }); } catch (e) {}
      out.purposes[XK_PL[key]] = o;
    });
    // hours of the film: the actor enters in the hour with the Lord's branch, the answer comes in the hour where a natal void comes out
    var lordB = null; try { lordB = NJ()[first.p.id.lord[0]].lines[first.p.id.lord[1] - 1].branch; } catch (e) {}
    function role(h) { var r = []; if (lordB && h.b === lordB) r.push('the ACTOR ENTERS THE SCENE (same branch as the Lord ' + lordB + ')'); else if (lordB && h.b === clash(lordB)) r.push('someone confronts the actor (clashes the Lord ' + lordB + ')');
      if (h.voidOut.length) r.push('the natal void ' + h.voidOut.join(' ') + ' comes out: the ANSWER, what was missing arrives'); return r.length ? r.join('; ') : undefined; }
    if (first) try { var HS = hoursOfDay(ctx, first);
      out.film_hours = HS.filter(function (h) { return role(h); }).map(function (h) { return { pillar: h.pillar, tst: h.tst, role: role(h), hexagram: h.n, name: (TXT[h.n] || {}).title || '', line: h.l, branch: h.lb, relation: REL[h.r], text: stmt(h.n, h.l) }; });
    } catch (e) {}
    if (withHours && first) out.hours = hoursOfDay(ctx, first).map(function (h) { return { pillar: h.pillar, tst: h.tst, hexagram: h.n, line: h.l, branch: h.lb, relation: REL[h.r], text_score: h.s, text: stmt(h.n, h.l), role: role(h),
      void_comes_out: h.voidOut.length ? h.voidOut : undefined, spouse_palace: h.spouse || undefined,
      relieves_prevalence: h.relief ? REL[h.relief.of] + ' relieved by ' + h.relief.how + (h.relief.best ? ' (best)' : h.relief.practical ? ' (best practical, 07-23)' : '') : undefined }; });
    if (first) try { var rh = hoursOfDay(ctx, first).filter(function (h) { return h.relief; }).sort(function (a, b) { return b.relief.grade - a.relief.grade || b.s - a.s; });
      if (rh.length) out.hours_that_relieve_the_prevalence = rh.map(function (h) { return h.pillar + ' ' + h.tst + ' · ' + h.n + ' l' + h.l + ' · ' + h.relief.how + ' · text ' + h.s + (h.relief.best ? ' · BEST' : h.relief.practical ? ' · BEST PRACTICAL (07-23)' : ''); });
    } catch (e) {}
    try { out.alarms_next_30_days = alarmsAhead(ch, 30).map(function (g) { return { date: new Date(g.ms).toISOString().slice(0, 10), in_days: g.inDays, level: g.level, purposes: g.keys, day_pillar: g.pillar }; }); } catch (e) {}
    out.reading_rules = 'HOW TO ANSWER (Edu, 13/11/2026): go to the ESSENCE of what kind of day it is for the person, then a short analysis and concrete advice. Plain, colloquial language, in the language of the user (Italian for Edu), a few short paragraphs. NO numbers, NO scores (never write +3, -2, percentages or raw values), NO tables, NO long technical lists: the scores here are only for you, to judge; mention them only if the user explicitly asks about scores. Never use a technical term without explaining it in a few words. Order: 1) the essence in one or two sentences (the prevalence of the active lines tells what kind of day it is and what it favours); 2) TELL THE DAY AS A FILM (Edu 13/11/2026), one short paragraph each, using the field film: SCENARIO = the cycle (the period of life) and the annual (its name, judgment and moved line) with their strength in the month, and the year branch that clashes them (comes alive or gives way); BACKDROP = the annual line of the month and the month line (the climate of these weeks); ACTOR = the Lord of the block: its relation says WHO acts (Brothers = colleagues, rivals, a partner who takes; Wealth = money, clients, the partner of a man; Ghost = authority, pressure; Parent = documents, mentors, study; Children = students, projects, creations), its text says HOW; ACTION = the day line and the outcome, and the day branch that clashes them (timely = it explodes, it happens now; not timely = it breaks) or a quiet line (activated = comes into play, eliminated = removed); HOURS = film_hours: when the actor enters the scene (hour with the branch of the Lord) and when the answer comes (hour where a natal void comes out), with their texts; give the hours also in civil time if you know the place. Keep the story COHERENT with the flow of the Qi between neighbouring levels (relations_between_levels: who feeds whom, who controls whom, what relieves it) down to the outcome, and close with the flow in a few words (e.g. documents → rival → work → money that leaves). Read every text in the concrete context of the day and of the person, not as a literal translation, and never contradict what is timely or not; 3) the alarms and warnings, briefly; 4) advice: what to do, what to avoid, for whom; if hours_that_relieve_the_prevalence is given, suggest the BEST PRACTICAL hour when the BEST is before 07:00 (the user does not like very early hours), and mention the BEST. Edu (the user) is the authority on He Luo Li Shu. Read only what is given here; do not invent other systems (no Hetu/qi/yun sums: that is XKDG, not He Luo). If you write a bazi, write it in a column: Hour, Day, Month, Year. If you cite a hexagram, draw it with its six lines (top line first, ━━━━━ yang, ━━ ━━ yin, ◀ on the line read). Write the Heluo age next to every year (age = year − birth year + 1).';
    return out;
  }
  root.XKDGHeluoDS = { aiDay: aiDay, alarmAheadHtml: alarmAheadHtml, alarmsAhead: alarmsAhead, plannerHtml: plannerHtml, xkScan: xkScan, xkSummary: xkSummary, render: render, readingHtml: readingHtml, context: context, scoreDay: scoreDay, scan: scan, PURPOSES: PURPOSES };
})(typeof window !== 'undefined' ? window : globalThis);

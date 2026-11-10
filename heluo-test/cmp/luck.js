// HLLS — le tre Luck nella Date Selection a cascata (Edu, 10/11/2026; regole, punto 4c; slide 66–77).
// Heaven = stelo dell'anno di nascita con il Na Jia (yang); Earth = ramo dell'anno di nascita, tabella Time 1 (yin);
// Fame = stagione tra solstizi ed equinozi (Kan, Zhen, Li, Dui). Dati dall'app: XKDGHeluo.fromPillars(P).luck.
//
// Tre fonti, ognuna pesata per livello (giorno al primo posto, Edu 10/11):
//   A. Luck del nativo (XT, HT o loro Hu) attivata dal tempo: ramo di anno, mese, giorno che porta quel trigramma
//      (Time 1: 子 Kan, 丑寅 Gen, 卯 Zhen, 辰巳 Xun, 午 Li, 未申 Kun, 酉 Dui, 戌亥 Qian) → +;
//      il ramo porta l'opposto di una Luck presente nel nativo → − (scontro sulla Luck).
//   B. Linee attive (ciclo, linea mossa dell'annuale, linea del giorno nell'esagramma del blocco):
//      il ramo Na Jia porta una Luck → +, un opposto → −.
//   C. Esagrammi del tempo (annuale, mensile, blocco, esagramma del giorno): trigramma della Luck presente → +,
//      opposto → − (la versione del 10/11, ora pesata per livello).
// Ogni Luck ha poi un moltiplicatore = bilancio yin/yang × timeliness:
//   Heaven (yang): yang carente (numero Cielo sotto la media del mese di nascita di oltre il 25%) ×1,5;
//                  yang in eccesso (oltre +25%) ×0,5; altrimenti ×1.
//   Earth (yin):   yin carente ×1,5; yin in eccesso (oltre +25%) ×−0,5 (diventa controproducente); altrimenti ×1.
//   Donna: al contrario (Edu, 10/11) — yin in eccesso naturale, Earth ×0,5; yang in eccesso, Heaven ×−0,5.
//   Fame:          ×1 (nessun bilancio).
//   Timeliness del trigramma nel mese di nascita (旺相休囚死, come nella lettura natale dell'app):
//                  旺 ×1,5 · 相 ×1,25 · 休 ×1 · 囚 ×0,75 · 死 ×0,5.
// Il bilancio yin/yang è quello della lettura natale dell'app (punto 1): numero Cielo / media yang del mese − 1,
// numero Terra / media yin del mese − 1.
'use strict';
const path = require('path');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const H = global.XKDGHeluo;

const W = {                         // pesi per livello
  A: { a: 0.25, m: 0.5, g: 1 },     // ramo di anno, mese, giorno che attiva una Luck del nativo
  B: { c: 0.25, a: 0.5, g: 1 },     // ramo della linea del ciclo, della linea mossa, della linea del giorno
  C: { a: 0.25, m: 0.5, b: 0.5, g: 0.75 }, // trigrammi di annuale, mensile, blocco, esagramma del giorno
};
// eccesso: per un uomo lo yang alto è naturale (Heaven in eccesso ×0,5) e lo yin in eccesso rende la Earth controproducente;
// per una donna al contrario (Edu, 10/11): yin alto naturale (Earth ×0,5), yang in eccesso rende la Heaven controproducente
const YY = { low: 1.5, high: { M: { heaven: 0.5, earth: -0.5 }, F: { heaven: -0.5, earth: 0.5 } } };
const TM = { 2: 1.5, 1: 1.25, 0: 1, '-1': 0.75, '-2': 0.5 };

const BR = '子丑寅卯辰巳午未申酉戌亥';
const BR_TRI = ['Kan', 'Gen', 'Gen', 'Zhen', 'Xun', 'Xun', 'Li', 'Kun', 'Kun', 'Dui', 'Qian', 'Qian'];
const TRI_EL = { Qian: 'Metal', Dui: 'Metal', Li: 'Fire', Zhen: 'Wood', Xun: 'Wood', Kan: 'Water', Gen: 'Earth', Kun: 'Earth' };
const EL_BR = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'];
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const CTL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const brTri = b => BR_TRI[BR.indexOf(b)];
function timeK(tri, mb) { const se = EL_BR[mb], e = TRI_EL[tri];
  return e === se ? 2 : GEN[se] === e ? 1 : GEN[e] === se ? 0 : CTL[e] === se ? -1 : -2; }
const TRI_OF = {};
for (const u of Object.keys(TRI_EL)) for (const l of Object.keys(TRI_EL)) { const h = H.hexFrom(u, l); TRI_OF[h.n] = [h.upper, h.lower]; }

// profilo natale delle Luck: trigrammi, presenza nel nativo, moltiplicatori
// vuoti (旬空) dal pilastro del giorno di nascita (Edu, 10/11): una Luck è vuota se tutti i rami del suo trigramma
// (Time 1) sono vuoti veri. Non è vero il vuoto timely nel mese di nascita (regola di Edu del 9/11), né quello
// riempito dallo scontro con il ramo dell'anno di nascita (es. Diana, anno 丑: 未 vuoto ma riempito).
const ST = '甲乙丙丁戊己庚辛壬癸', TRI_BR = {};
BR_TRI.forEach((t, i) => { (TRI_BR[t] = TRI_BR[t] || []).push(BR[i]); });
const BR_EL = { 子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire', 午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water' };
const SEAS = { 寅: 'Wood', 卯: 'Wood', 辰: 'Wood', 巳: 'Fire', 午: 'Fire', 未: 'Fire', 申: 'Metal', 酉: 'Metal', 戌: 'Metal', 亥: 'Water', 子: 'Water', 丑: 'Water' };
function timelyEl(el, mb) { const eM = '辰未戌丑'.includes(mb); if (el === 'Earth') return eM || SEAS[mb] === 'Fire';
  const g = Object.keys(GEN).find(k => GEN[k] === el); return SEAS[mb] === el || SEAS[mb] === g || (g === 'Earth' && eM); }
function vuotiGiorno(dp) { const x = ((BR.indexOf(dp[1]) - ST.indexOf(dp[0])) % 12 + 12) % 12; return [BR[(x + 10) % 12], BR[(x + 11) % 12]]; }
function triVuoto(t, dp, yb, mb) {
  const v = vuotiGiorno(dp), cl = b => BR[(BR.indexOf(b) + 6) % 12];
  // LK_VT: 'trigramma' = timely sull'elemento del trigramma (default), 'ramo' = sull'elemento di ogni ramo, 'no' = senza timeliness
  const VT = process.env.LK_VT || 'trigramma', tm = b => VT === 'no' ? false : timelyEl(VT === 'trigramma' ? TRI_EL[t] : BR_EL[b], mb);
  return TRI_BR[t].every(b => v.includes(b) && !tm(b) && cl(b) !== yb);
}
function profilo(Pn, male) {
  const R = H.fromPillars(Pn, male), N = R.numbers, mb = H.BRANCHES.indexOf(Pn.month[1]);
  const rY = N.heaven / N.monthAvg.yang - 1, rE = N.earth / N.monthAvg.yin - 1;
  const xt = R.xianTian, ht = R.houTian && R.houTian.hex;
  const nat = [xt.upper, xt.lower, R.huXT.upper, R.huXT.lower].concat(ht ? [ht.upper, ht.lower, R.huHT.upper, R.huHT.lower] : []);
  const K = {};
  for (const k of ['heaven', 'earth', 'fame']) {
    const t = R.luck[k], op = R.luck.opposite[k], tk = timeK(t, mb);
    let yy = 1, yt = 'in linea';
    if (k === 'heaven') { if (rY < -0.25) { yy = YY.low; yt = 'yang carente'; } else if (rY > 0.25) { yy = YY.high[male ? 'M' : 'F'].heaven; yt = 'yang in eccesso'; } }
    if (k === 'earth') { if (rE < -0.25) { yy = YY.low; yt = 'yin carente'; } else if (rE > 0.25) { yy = YY.high[male ? 'M' : 'F'].earth; yt = 'yin in eccesso'; } }
    if (k === 'fame') yt = '—';
    // varianti per la prova di robustezza: LK_VAR=piatto (tutti ×1), soloyy (senza timeliness), solotm (senza yin/yang), earthpos (eccesso yin ×0,5)
    const V = process.env.LK_VAR || '';
    if (V === 'earthpos' && k === 'earth' && yy < 0) yy = 0.5;
    const m = V === 'piatto' ? 1 : V === 'soloyy' ? yy : V === 'solotm' ? TM[tk] : yy * TM[tk];
    const vu = process.env.LK_VUOTI !== 'no' && triVuoto(t, Pn.day, R.input && R.input.p ? BR[R.input.p.branches[0]] : Pn.year[1], Pn.month[1]);
    K[k] = { t, op, inNat: nat.includes(t), opNat: nat.includes(op), tk, yy, yt, m: vu ? 0 : m, vuoto: vu };
  }
  return { K, rY, rE, heaven: N.heaven, earth: N.earth, avg: N.monthAvg };
}

// punteggio Luck di un giorno. p = predict(...), T = { y, m, d } rami del tempo
function giorno(P, p, T) {
  let tot = 0; const w = [];
  const add = (k, v, src) => { if (!v) return; const x = v * P.K[k].m; tot += x; w.push(`${src} ${v > 0 ? '+' : '−'}${k[0].toUpperCase()}`); };
  for (const k of ['heaven', 'earth', 'fame']) {
    const L = P.K[k];
    // A. Luck del nativo attivata dai rami del tempo
    for (const [lv, b] of [['a', T.y], ['m', T.m], ['g', T.d]]) {
      if (L.inNat && brTri(b) === L.t) add(k, W.A[lv], 'A' + lv + b);
      if (L.inNat && brTri(b) === L.op) add(k, -W.A[lv], 'A' + lv + b);
    }
    // B. rami delle linee attive
    for (const [lv, id] of [['c', p.id.cycle], ['a', p.id.year], ['g', p.id.day]]) {
      const b = NJ[id[0]].lines[id[1] - 1].branch, t = brTri(b);
      if (t === L.t) add(k, W.B[lv], 'B' + lv + b);
      if (t === L.op) add(k, -W.B[lv], 'B' + lv + b);
    }
    // C. trigrammi degli esagrammi del tempo
    for (const [lv, n] of [['a', p.id.year[0]], ['m', p.id.month[0]], ['b', p.id.lord[0]], ['g', p.id.dayHex[0]]]) {
      const tr = TRI_OF[n];
      if (tr.includes(L.t)) add(k, W.C[lv], 'C' + lv + n);
      if (tr.includes(L.op)) add(k, -W.C[lv], 'C' + lv + n);
    }
  }
  return { tot: Math.round(tot * 100) / 100, w };
}

module.exports = { profilo, giorno, W, YY, TM, brTri };

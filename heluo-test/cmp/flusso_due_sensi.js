// NB 13/11/2026: dal commit successivo il flusso nei due sensi e 財生殺 V5 sono NEL CODICE (heluo-ds.js): questo prototipo va letto sul commit 17cfe31 (applicato al motore nuovo conterebbe due volte).
// Prototipo (13/11/2026): flusso tra esagrammi nei due sensi (punto 5, deciso da Edu) + controllo dei Brothers
// tra esagrammi diversi + conteggio 財生殺 per anno (oggi / V2 / V4 / V5). App non toccata.
//  - Flusso all'indietro: l'esagramma più piccolo (B, a destra nella fila ciclo → annuale → mensile → blocco → giorno)
//    rafforza ×1,5 ciò che sta nella stessa posizione del più grande (A) se lo genera. Vale solo finché dura B
//    (calcolato giorno per giorno). Linee: am ← mensile, m ← blocco, lord/d ← esagramma del giorno.
//    Trigrammi diretti: mensile ← blocco, blocco ← giorno (Hu esclusi). Solo generazione, non stesso elemento.
//  - Wealth: Brothers nel più piccolo che nutrono i Children nella stessa posizione del più grande non sono prezzo.
//  - 財生殺: V2 = Xun (opposto di Luck) non nutre il Fuoco + solo Fuoco nei trigrammi diretti;
//    V4 = + Fuoco diretto nello stesso esagramma di Brothers forti = controllo, non toglie;
//    V5 = + il controllo vale anche tra esagrammi vicini nella fila (mensile–blocco–giorno).
//    Brothers forti = trigramma diretto Brothers non vuoto, o Brothers sulla linea letta in quell'esagramma.
// Uso: node flusso_due_sensi.js [anni]   (es. node flusso_due_sensi.js 2005-2019)
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo, SC = global.XKDG_HELUO_SCORES, NJ = global.HeluoNaJia;
const Pn = pillars('1960-08-18', '10:00', 11.72, 'Europe/Rome'), R = H.fromPillars(Pn, true), ctx = DS.context(R, Pn, true);
const TRI_EL = { Qian: 'Metal', Dui: 'Metal', Li: 'Fire', Zhen: 'Wood', Xun: 'Wood', Kan: 'Water', Gen: 'Earth', Kun: 'Earth' };
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const REL = { Metal: 'B', Water: 'C', Wood: 'W', Fire: 'G', Earth: 'P' }; // Edu: persona Metallo per tutta la vita
const XK_W = { am: 1, m: 1, lord: 2, d: 3, s2: 3 }, ATT = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' };
const OPP = Object.values(ctx.prof.K).map(k => k.op);

function triOf(n) { // [upper, lower] dai rami del Na Jia: uso le righe del filo (triRows) per non dipendere da altro
  return DS.triRows([['x', n, null, 1]]).filter(x => x.lbl.indexOf('Hu') < 0).map(x => x.t);
}

function giorno(ds, lon, key) {
  const [y, mo, d] = ds.split('-').map(Number), Pe = DS.pillarsTstNoon(y, mo, d, lon), th = DS.thread(ctx, Pe, lon, key);
  return th && { th, v: varianti(th, key), Pe };
}

function varianti(th, key) {
  const p = th.p, X = th.X, A = th.A, V = th.yv;
  const hexM = p.month.hex.n, hexB = p.id.lord[0], hexD = p.id.dayHex[0], hexY = p.id.year[0], hexC = p.id.cycle[0];
  // ── 財生殺 ───────────────────────────────────────────────
  const tri = th.tri, ghostAll = tri.gOn ? tri.ghost : [];
  const sumG = a => a.reduce((z, x) => z + x.w * x.f, 0);
  const wHexLine = th.on.filter(x => !x.hidden).map(x => x.n);
  const plusNoXun = tri.plus.filter(x => !OPP.includes(x.t)); // tri.plus è già senza oppW se key = wealth
  const wHex = wHexLine.concat(plusNoXun.map(x => x.n));
  // ghost diretti (V2): ricostruiti dalle righe del filo
  const rows = DS.triRows([['monthly', hexM, hexY, 0.5], ['block', hexB, hexM, 1], ['day', hexD, hexB, 1]]);
  const dir = rows.filter(x => x.lbl.indexOf('Hu') < 0);
  const vObj = { list: V, mb: ctx.Pn.month[1], T: { y: th.Pe.year[1], m: th.Pe.month[1], d: th.Pe.day[1] }, moved: DS.movedBranches ? DS.movedBranches(p) : [] };
  const isVoid = t => DS.triVoid(t, vObj);
  const g2 = X === 'W' ? dir.filter(x => TRI_EL[x.t] === 'Fire' && wHex.includes(x.n)) : [];
  // Brothers forti per esagramma
  const strongB = n => dir.some(x => x.n === n && TRI_EL[x.t] === 'Metal' && !isVoid(x.t)) || th.lines.some(Lx => Lx.n === n && Lx.r === 'B' && ['m', 'lord', 'd', 's2'].includes(Lx.k));
  const ROW = [hexM, hexB, hexD];
  const g4 = g2.filter(x => !strongB(x.n));
  const vicini = n => { const i = ROW.indexOf(n); return [ROW[i - 1], ROW[i + 1]].filter(Boolean); };
  const g5 = g4.filter(x => !vicini(x.n).some(strongB));
  const ctl = g2.filter(x => !g5.includes(x)); // Fuoco che controlla i Brothers
  // ── flusso all'indietro ────────────────────────────────────
  let back = 0; const nota = [];
  if (X) {
    // linee lette, in fila nel tempo: am ← m, m ← lord, lord ← d, d ← s2 (il più piccolo a destra)
    const LL = Object.fromEntries(th.lines.map(Lx => [Lx.k, Lx]));
    [['am', 'm'], ['m', 'lord'], ['lord', 'd'], ['d', 's2']].forEach(([bk, sk]) => {
      const Lb = LL[bk], Ls = LL[sk];
      if (GEN[Ls.el] !== Lb.el) return;
      const w = XK_W[bk] * Lb.fl * 0.5;
      if (Lb.r === X && !th.loss.includes(Lb)) { back += w; nota.push(`↩ ${bk} ${Lb.n}l${Lb.l} ${Lb.b} rafforzato da ${sk} ${Ls.b}`); }
      if (Lb.r === A) { back -= w; nota.push(`↩ prezzo ${bk} ${Lb.b} rafforzato da ${sk} ${Ls.b}`); }
    });
    // trigrammi diretti: mensile ← blocco, blocco ← giorno
    const sm = { [hexM]: hexB, [hexB]: hexD };
    const tag = (lst, sgn, lab) => lst.filter(x => x.lbl.indexOf('Hu') < 0 && sm[x.n]).forEach(x => {
      const pos = x.lbl.startsWith('upper') ? 0 : 1, sT = triOf(sm[x.n])[pos];
      if (GEN[TRI_EL[sT]] === TRI_EL[x.t]) { back += sgn * x.w * x.f * 0.5; nota.push(`↩ ${lab} ${x.t} di ${x.n} rafforzato da ${sT} di ${sm[x.n]}`); }
    });
    const genP = (key === 'speak' || key === 'support') ? tri.minus.filter(x => x.t === 'Gen') : [];
    tag(tri.plus.concat(genP), 1, 'scopo'); tag(tri.minus.filter(x => !genP.includes(x)), -1, 'prezzo');
  }
  // Wealth: Brothers nel più piccolo che nutrono i Children del più grande → non prezzo
  let chain = 0;
  if (X === 'W') {
    const LL = Object.fromEntries(th.lines.map(Lx => [Lx.k, Lx]));
    [['am', 'm'], ['m', 'lord'], ['lord', 'd'], ['d', 's2']].forEach(([bk, sk]) => {
      const Lb = LL[bk], Ls = LL[sk];
      if (Ls.r !== 'B' || Lb.r !== 'C') return;
      const st = th.steal.includes(Ls) ? 0.5 : 0; chain += XK_W[sk] * Ls.fl * (1 + st);
      nota.push(`B→C ${sk} ${Ls.b} nutre ${bk} ${Lb.b} C: niente prezzo`);
    });
    const bigT = { [hexM]: hexY, [hexB]: hexM, [hexD]: hexB };
    tri.minus.filter(x => x.lbl.indexOf('Hu') < 0).forEach(x => {
      const pos = x.lbl.startsWith('upper') ? 0 : 1, bT = triOf(bigT[x.n])[pos];
      if (REL[TRI_EL[bT]] === 'C') { chain += x.w * x.f; nota.push(`B→C ${x.t} di ${x.n} nutre ${bT} di ${bigT[x.n]}: niente prezzo`); }
    });
  }
  // punto 3 (deciso): per Speak e Support Gen (Earth Luck dal giorno) conta +, non è prezzo (Kun resta prezzo)
  let gen = 0;
  if (key === 'speak' || key === 'support') tri.minus.filter(x => x.t === 'Gen').forEach(x => { gen += 2 * x.w * x.f; });
  const t0 = th.t, base = t0 + sumG(ghostAll);
  const tV4 = base - sumG(g4) + gen, tV5 = base - sumG(g5) + back + chain + gen;
  const adj = t => Math.max(-3, Math.min(3, Math.round(t / 3)));
  return { csk: { oggi: ghostAll.length > 0, v2: g2.length > 0, v4: g4.length > 0, v5: g5.length > 0 }, ctl, g5, back, chain, t0, tV5, a0: th.adj, a4: adj(tV4), a5: adj(tV5), gen, nota };
}
function NJL(n) { return NJ[n].lines; }
module.exports = { giorno, varianti };

if (require.main === module) {
  const arg = process.argv[2] || '2005-2019', [y0, y1] = arg.split('-').map(Number);
  const lon = 12.07;
  console.log('anno (età) | 財生殺 giorni: oggi / V2 / V4 / V5 | Wealth ☯>0: oggi / punti 1–4 / + flusso');
  for (let Y = y0; Y <= (y1 || y0); Y++) {
    const c = { oggi: 0, v2: 0, v4: 0, v5: 0 }; let p0 = 0, p4 = 0, p5 = 0, n = 0;
    for (let t = Date.UTC(Y, 0, 1); t < Date.UTC(Y + 1, 0, 1); t += 864e5) {
      const g = giorno(new Date(t).toISOString().slice(0, 10), lon, 'wealth'); if (!g) continue; n++;
      Object.keys(c).forEach(k => { if (g.v.csk[k]) c[k]++; });
      if (g.v.a0 > 0) p0++; if (g.v.a4 > 0) p4++; if (g.v.a5 > 0) p5++;
    }
    console.log(`${Y} (${Y - 1959}) | ${c.oggi} / ${c.v2} / ${c.v4} / ${c.v5} | ${p0} / ${p4} / ${p5}`);
  }
}

// HLLS — prova: affinare «Favorire» (Edu 13/11/2026). Solo prova, app non toccata.
'use strict';
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require('../../heluo-najia.js'); global.XKDG_HELUO_SCORES = require('../../heluo-scores.js');
const DS = require('../../heluo-ds.js'), H = global.XKDGHeluo;
const Pn = pillars('1960-08-18', '10:00', 11.72, 'Europe/Rome'), ctx = DS.context(H.fromPillars(Pn, true), Pn, true);
const ms = s => Date.parse(s + 'T00:00:00Z'), iso = t => new Date(t).toISOString().slice(0, 10);
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const CTL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const ATT = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' };
function feat(g, X) {
  const L = g.F.lines, th = g.th, A = ATT[X], f = {};
  const k3 = ['lord', 'd', 's2'];
  f.txt = k3.map(k => L[k].s || 0);
  f.actX = ['d', 's2'].filter(k => L[k].r === X && L[k].s > 0).length;   // scopo sull'azione
  f.lordX = L.lord.r === X && L.lord.s > 0;
  // flusso del film: attore → azione → esito (genera = passa, controlla = blocca)
  const fl = (a, b) => GEN[a.el] === b.el ? '+' : CTL[a.el] === b.el ? '−' : a.el === b.el ? '=' : '·';
  f.flow = fl(L.lord, L.d) + fl(L.d, L.s2);
  f.endX = L.s2.r === X; // il film finisce sullo scopo
  f.endA = L.s2.r === A && !(X === 'W' && L.s2.s > 0);
  f.sum = f.txt.reduce((a, b) => a + b, 0);
  f.neg = f.txt.filter(s => s < 0).length;
  // vuoti: linea dello scopo vuota non uscita
  f.voidX = th.lines.filter(x => x.r === X && x.voidL && !x.filled).map(x => x.k);
  // sfondo: annuale del mese e mese
  f.bg = (L.am ? L.am.s : 0) + (L.m ? L.m.s : 0); f.bgA = [L.am, L.m].filter(o => o && o.r === A).length;
  // scontri del giorno: scopo eliminato / prezzo eliminato / scopo acceso
  f.lost = g.F.dayQuiet.filter(c => c.r === X && !c.on).length + g.F.dayHits.filter(h => h.r === X && !h.alive).length;
  f.rivalOut = g.F.dayQuiet.filter(c => c.r === A && !c.on).length;
  f.lit = g.F.dayHits.filter(h => h.r === X && h.alive).length;
  return f;
}
const fmt = (g, f) => `${iso(g.date)} ${g.Pe.day} ${g.ok ? 'OK' : 'no'} txt ${f.txt.join(',')} act ${f.actX} lordX ${+f.lordX} flow ${f.flow} end ${f.endX ? 'X' : f.endA ? 'A' : '-'} bg ${f.bg}/${f.bgA} void ${f.voidX.join('')} lost ${f.lost} riv ${f.rivalOut} lit ${f.lit} | ${g.ok ? g.why.length : g.no.join('; ')}`;
module.exports = { DS, ctx, ms, iso, feat, fmt };
if (require.main === module) {
  const [a, b, lon, X, ...ev] = process.argv.slice(2);
  DS.cfScan(ctx, ms(a), ms(b), +lon, 'fav-' + X).forEach(g => { const f = feat(g, X); if (g.ok || ev.includes(iso(g.date))) console.log((ev.includes(iso(g.date)) ? '◆ ' : '  ') + fmt(g, f)); });
}

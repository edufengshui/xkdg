// HLLS — Favorire a tre livelli, v2 (Edu 13/11/2026): 1) scala ok; 2) lo sfondo conta solo se aiuta (mai penalità);
// 3) Wealth: Brothers neutri sull'azione con Brothers dal testo buono sull'altra linea dell'azione = collaboratori (Belgrado 8/10/2011),
//    e i collaboratori sull'azione bastano a far entrare il giorno. Solo prova, app non toccata.
'use strict';
const { DS, ctx, ms, iso } = require('./ds_fav_fino.js');
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' }, ATT = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' };
const ELS = Object.keys(GEN);
function fav(g, X) {
  const L = g.F.lines, th = g.th, A = ATT[X], eX = ELS.find(e => DS.rel(th.pers, e) === X);
  const act = [L.d, L.s2], bGood = o => o.r === 'B' && o.s > 0;
  const collab = o => X === 'W' && o.r === 'B' && (o.s > 0 || (o.s === 0 && act.some(z => z !== o && bGood(z))));
  if (th.alarm || L.d.s < 0) return { lv: 0 };
  if (act.some(o => o.r === A && !collab(o))) return { lv: 0 };
  const carry = []; if ((L.lord.r === X || GEN[L.lord.el] === eX) && L.lord.s > 0) carry.push(L.lord);
  act.forEach(o => { if (o.r === X && o.s > 0) carry.push(o); });
  const col = act.filter(collab); if (col.some(o => o.s > 0)) col.filter(o => o.s > 0).forEach(o => carry.push(o));
  if (!carry.length) return { lv: 0 };
  const why = [];
  const txt = [L.lord.s, L.d.s, L.s2.s];
  if (!(carry.some(o => o.s >= 2) && txt.every(s => s >= 0))) return { lv: 1 };
  if (carry.includes(L.lord) && carry.some(o => o !== L.lord)) why.push('attore e azione');
  if (carry.some(o => o.on)) why.push('di stagione');
  if (g.F.dayHits.some(h => h.r === X && h.alive)) why.push('acceso dal ramo del giorno');
  if (L.am && L.am.s > 0 && L.m && L.m.s > 0 && L.m.r !== A) why.push('sfondo che aiuta');
  const own = why.filter(w => w !== 'sfondo che aiuta'); return { lv: own.length ? 3 : 2, why, col: col.length > 0, two: own.length && why.length > own.length };
}
const P = [['W 2011', '2011-09-01', '2011-11-30', 12.07, 'W', ['2011-09-06', '2011-09-07', '2011-09-29', '2011-10-08', '2011-10-16', '2011-11-15']],
['W fine 2015', '2015-11-22', '2015-12-21', 12.07, 'W', ['2015-12-08']],
['C feb-mar 2017', '2017-02-01', '2017-03-31', 12.07, 'C', ['2017-02-19']],
['C mag-lug 2017', '2017-05-15', '2017-07-15', 12.07, 'C', []],
['C 2019', '2019-06-01', '2019-07-10', 23.73, 'C', ['2019-06-15', '2019-06-25', '2019-07-03']]];
for (const [tit, a, b, lon, X, ev] of P) {
  const t = DS.cfScan(ctx, ms(a), ms(b), lon, 'fav-' + X).map(g => ({ d: iso(g.date), ...fav(g, X) }));
  const n = k => t.filter(x => x.lv >= k).length;
  console.log(`\n${tit}: giorni ${t.length}, buoni ${n(1)}, forti ${n(2)}, migliori ${n(3)}`);
  console.log('  forti:', t.filter(x => x.lv >= 2).map(x => x.d.slice(5) + (x.lv === 3 ? (x.two ? '★★' : '★') : '') + (x.col ? 'c' : '')).join(' '));
  ev.forEach(e => { const x = t.find(z => z.d === e); console.log('  ◆', e, ['scartato', 'buono', 'forte', 'migliore'][x.lv], x.why ? x.why.join('+') : ''); });
}

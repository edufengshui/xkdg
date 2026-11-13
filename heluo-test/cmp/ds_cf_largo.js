// variante «larga» di Favorire: basta lo scopo (o chi lo nutre) su attore, giorno o esito con testo positivo;
// il prezzo blocca solo con testo negativo; giorno critico e testo del giorno negativo scartano.
'use strict';
process.argv.push('--quiet');
const { day } = require('./ds_cf.js');
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' }, ATT = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' };
function largo(D, X) { const A = ATT[X], eX = D.elOf(X), L = D.L, f = o => o.r === X || GEN[o.el] === eX;
  if (D.th.alarm || L.d.s < 0) return false;
  if ([L.lord, L.d, L.s2].some(o => o.r === A && o.s < 0)) return false;
  return [L.lord, L.d, L.s2].some(o => f(o) && o.s > 0); }
function range(a, b) { const o = []; for (let t = Date.parse(a); t <= Date.parse(b); t += 864e5) o.push(new Date(t).toISOString().slice(0, 10)); return o; }
for (const [tit, a, b, lon, X, ev] of [
  ['Wealth 2011', '2011-09-01', '2011-11-30', 12.07, 'W', ['2011-09-06', '2011-09-07', '2011-09-29', '2011-10-08', '2011-10-16', '2011-11-15']],
  ['Wealth dic 2015', '2015-11-22', '2015-12-21', 12.07, 'W', ['2015-12-08']],
  ['Children 2017', '2017-02-01', '2017-03-31', 12.07, 'C', ['2017-02-19']],
  ['Children 2019', '2019-06-01', '2019-07-10', 23.73, 'C', ['2019-06-15', '2019-06-25', '2019-07-03']]]) {
  const all = range(a, b).map(i => day(i, lon, X)).filter(Boolean), ok = all.filter(D => largo(D, X));
  console.log(tit, 'buoni', ok.length + '/' + all.length, ev.map(e => e + ':' + (ok.some(D => D.iso === e) ? 'SI' : 'no')).join(' '));
}

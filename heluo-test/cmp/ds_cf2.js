// Favorire v2 (Edu 13/11): 1) basta l'attore con lo scopo o che lo nutre, testo positivo; 2) per Wealth i Brothers con testo
// positivo sull'azione sono collaboratori, non prezzo; 3) il problema lo trova l'app (prevalenza; testi negativi = il lato cattivo).
'use strict';
process.argv.push('--quiet');
const { day } = require('./ds_cf.js');
global.window = global; const TX = global.XKDG_HELUO_TEXTS;
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' }, ATT = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' };
function fav(D, X) { const A = ATT[X], eX = D.elOf(X), L = D.L, f = o => o.r === X || GEN[o.el] === eX;
  if (D.th.alarm || L.d.s < 0) return null;
  const collab = o => X === 'W' && o.r === 'B' && o.s > 0;
  if ([L.d, L.s2].some(o => o.r === A && !collab(o))) return null;
  const why = [];
  if (f(L.lord) && L.lord.s > 0) why.push('attore');
  if ([L.d, L.s2].some(o => o.r === X && o.s > 0)) why.push('azione');
  if (!why.length) return null;
  if ([L.d, L.s2, L.lord].some(collab)) why.push('collaboratori');
  if ([L.lord, L.d, L.s2].some(o => o.r === X && o.on)) why.push('stagione');
  if (L.am && L.am.s >= 0 && L.m.r !== A) why.push('sfondo');
  return why; }
const range = (a, b) => { const o = []; for (let t = Date.parse(a); t <= Date.parse(b); t += 864e5) o.push(new Date(t).toISOString().slice(0, 10)); return o; };
for (const [tit, a, b, lon, X, ev] of [
  ['Wealth 2011', '2011-09-01', '2011-11-30', 12.07, 'W', ['2011-09-06', '2011-09-07', '2011-09-29', '2011-10-08', '2011-10-16', '2011-11-15']],
  ['Wealth dic 2015', '2015-11-22', '2015-12-21', 12.07, 'W', ['2015-12-08']],
  ['Children 2017', '2017-02-01', '2017-03-31', 12.07, 'C', ['2017-02-19']],
  ['Children 2019', '2019-06-01', '2019-07-10', 23.73, 'C', ['2019-06-15', '2019-06-25', '2019-07-03']]]) {
  const all = range(a, b).map(i => day(i, lon, X)).filter(Boolean), res = all.map(D => ({ D, w: fav(D, X) })), ok = res.filter(x => x.w);
  const best = ok.filter(x => x.w.length >= 3);
  console.log(`\n${tit}: buoni ${ok.length}/${all.length}, migliori (3+ segni) ${best.length}`);
  ev.forEach(e => { const x = res.find(z => z.D.iso === e); console.log('  ', e, x.w ? 'SI ' + x.w.join(',') + (x.w.length >= 3 ? ' ★' : '') : 'no'); });
  console.log('   migliori:', best.map(x => x.D.iso.slice(5) + ' ' + x.D.Pe.day).join(' | '));
}
// 8/12/2015: le linee Parent attive e i loro testi
const D = day('2015-12-08', 12.07, 'W'), DS = require('../../heluo-ds.js'), LV = DS.levelsOfDay(D.th);
console.log('\n8/12/2015 linee attive:'); LV.lines.forEach(x => { const [n, l] = x.lbl.match(/(\d+) l(\d)/).slice(1).map(Number); const s = global.XKDG_HELUO_SCORES[n].l[l];
  console.log('  ', x.lbl, x.b, x.r, s, '«' + TX[n].lines[l].statement + '»'); });
// Parent prevalenti con testo negativo, nov–dic 2015
console.log('\nGiorni con prevalenza Parent e testi Parent negativi (≥ metà):');
range('2015-11-22', '2015-12-21').forEach(iso => { const D = day(iso, 12.07, 'W'), LV = DS.levelsOfDay(D.th); if (!LV.prevalence.includes('P')) return;
  const P = LV.lines.filter(x => x.r === 'P').map(x => { const [n, l] = x.lbl.match(/(\d+) l(\d)/).slice(1).map(Number); return global.XKDG_HELUO_SCORES[n].l[l]; });
  const neg = P.filter(s => s < 0).length; if (neg * 2 >= P.length) console.log('  ', iso, D.Pe.day, 'P', P.length, 'negativi', neg, D.th.alarm ? '⚠' + D.th.alarm.level : ''); });

// Controllo: livelli di Favour nell'app (heluo-ds.js) contro il prototipo ds_fav_fino2.js (Edu 13/11/2026)
'use strict';
const { DS, ctx, ms, iso } = require('./ds_fav_fino.js');
for (const [tit, a, b, lon, X, ev] of [['W 2011', '2011-09-01', '2011-11-30', 12.07, 'W', ['2011-09-06', '2011-09-07', '2011-09-29', '2011-10-08', '2011-10-16', '2011-11-15']],
  ['W fine 2015', '2015-11-22', '2015-12-21', 12.07, 'W', ['2015-12-08']], ['C feb-mar 2017', '2017-02-01', '2017-03-31', 12.07, 'C', ['2017-02-19']],
  ['C mag-lug 2017', '2017-05-15', '2017-07-15', 12.07, 'C', []], ['C 2019', '2019-06-01', '2019-07-10', 23.73, 'C', ['2019-06-15', '2019-06-25', '2019-07-03']]]) {
  const t = DS.cfScan(ctx, ms(a), ms(b), lon, 'fav-' + X), n = k => t.filter(g => g.lv >= k).length;
  console.log(`\n${tit}: giorni ${t.length}, buoni ${n(1)}, forti ${n(2)}, migliori ${n(3)}`);
  console.log('  forti:', t.filter(g => g.lv >= 2).map(g => iso(g.date).slice(5) + (g.stars ? '★'.repeat(g.stars) : '')).join(' '));
  ev.forEach(e => { const g = t.find(z => iso(z.date) === e); console.log('  ◆', e, g.ok ? g.level + (g.stars ? ' ' + '★'.repeat(g.stars) : '') : 'scartato — ' + g.no.join('; ')); });
}

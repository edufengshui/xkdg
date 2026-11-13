// Controllo: Correct / Favour nell'app (heluo-ds.js) contro i prototipi ds_cf.js / ds_cf2.js
'use strict';
const path = require('path'); const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require('../../heluo-najia.js'); global.XKDG_HELUO_SCORES = require('../../heluo-scores.js');
const DS = require('../../heluo-ds.js'), H = global.XKDGHeluo;
const Pn = pillars('1960-08-18', '10:00', 11.72, 'Europe/Rome'), ctx = DS.context(H.fromPillars(Pn, true), Pn, true);
const ms = s => Date.parse(s + 'T00:00:00Z'), iso = t => new Date(t).toISOString().slice(0, 10);
const show = (tit, a, b, lon, mode) => { const r = DS.cfScan(ctx, ms(a), ms(b), lon, mode).filter(g => g.ok);
  console.log(tit + ':', r.map(g => iso(g.date).slice(5) + (g.best ? '★' : '')).join(' ')); return r; };
const c = show('Correct nov–dic 2015', '2015-11-22', '2015-12-21', 12.07, 'correct');
c.forEach(g => console.log('  ', iso(g.date), g.Pe.day, REL(g.problem), g.how, '|', g.why.join('; '), '| ore', g.hours.map(h => h.pillar).join(',') || '—'));
const g8 = DS.correctDay(ctx, DS.pillarsTstNoon(2015, 12, 8, 12.07), 12.07); console.log('  8/12:', g8.no.join('; '), g8.problems);
show('Favour W 2011', '2011-09-01', '2011-11-30', 12.07, 'fav-W');
show('Favour W dic 2015', '2015-11-22', '2015-12-21', 12.07, 'fav-W');
show('Favour C 2017', '2017-02-01', '2017-03-31', 12.07, 'fav-C');
show('Favour C 2019', '2019-06-01', '2019-07-10', 23.73, 'fav-C');
show('Favour B dic 2015', '2015-11-22', '2015-12-21', 12.07, 'fav-B');
function REL(r) { return { P: 'Parent', W: 'Wealth', G: 'Ghost', C: 'Children', B: 'Brothers' }[r]; }

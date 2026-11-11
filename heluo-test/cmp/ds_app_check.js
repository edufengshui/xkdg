// Check (10/11/2026): the app's Date Selection (heluo-ds.js) must give the same totals as the prototype
// ds_cascata.js luck2 on the six events. Uso: node ds_app_check.js
//   1) same day pillars as the prototype (civil noon, IANA zone)  → totals must match day by day
//   2) the app's own pillars (true-solar noon of each date)        → ranks used in the app
'use strict';
const path = require('path');
const { pillars, natal, predict } = require('./heluo_cmp.js');           // loads solar-time + heluo-lishu as globals
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
process.argv.push('luck2');
const PR = require('./ds_cascata.js'), LK2 = require('./luck.js');
const H = global.XKDGHeluo;

let diff = 0, tot = 0;
const pctA = [], pctB = [];
for (const e of PR.EVENTI) {
  const b = PR.NASCITE[e.chi], Pn = pillars(...b), R = H.fromPillars(Pn, true), ctx = DS.context(R, Pn, true);
  const N = natal('A', Pn, true), nat = { day: Pn.day, hour: Pn.hour, month: Pn.month, yearP: Pn.year, year: N.pillars[3], prof: LK2.profilo(Pn, true) };
  const Y = +e.d.slice(0, 4), lon = e.luogo[0], tz = e.luogo[1];
  const app = [], proto = [];
  for (let t = Date.UTC(Y, 0, 1); t < Date.UTC(Y + 1, 0, 1); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10), Pe = pillars(d, '12:00', lon, tz);
    const g = DS.scoreDay(ctx, Pe, lon, e.scopo), q = PR.giorno(N, nat, d, lon, tz, e.scopo);
    if (!g || !q) continue; tot++;
    if (Math.abs(g.tot - q.tot) > 0.011) { diff++; if (diff < 6) console.log('DIFF', e.chi, d, g.tot, q.tot); }
    app.push({ date: d, tot: g.tot }); proto.push({ date: d, tot: q.tot });
  }
  const rk = (all) => { const me = all.find(x => x.date === e.d); const s = all.filter(x => x.tot > me.tot).length, p = all.filter(x => x.tot === me.tot).length; return (s + (p + 1) / 2) / all.length; };
  const s2 = DS.scan(ctx, Date.UTC(Y, 0, 1), Date.UTC(Y, 11, 31), lon, e.scopo), me2 = s2.days.find(x => new Date(x.date).toISOString().slice(0, 10) === e.d);
  pctA.push(rk(app)); pctB.push(me2.rank / me2.n);
  console.log(`${e.chi} ${e.d} ${e.scopo}: app ${(100 * rk(app)).toFixed(0)} · prototype ${(100 * rk(proto)).toFixed(0)} · app true-solar noon ${(100 * me2.rank / me2.n).toFixed(0)} (score ${me2.tot})`);
}
const avg = a => (100 * a.reduce((x, y) => x + y, 0) / a.length).toFixed(0);
console.log(`\nDays compared ${tot}, different totals ${diff}. Mean percentile: app ${avg(pctA)} · app true-solar noon ${avg(pctB)} (chance 50)`);

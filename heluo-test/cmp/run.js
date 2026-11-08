// Run A/B/C on every event of the datasets + random control dates; write events.csv, summary.json
'use strict';
const fs = require('fs'), path = require('path');
const { natal, predict, pillars } = require('./heluo_cmp.js');
const DIR = path.join(__dirname, '..');
const people = [];
const f0 = pe => pe._file || '';
for (const f of ['famous_politics.json', 'famous_arts.json', 'famous_violent.json']) {
  const p = path.join(DIR, f); if (fs.existsSync(p)) JSON.parse(fs.readFileSync(p)).people.forEach(x => { x._file = f; if (!people.some(y => y.birth.date === x.birth.date && y.birth.time === x.birth.time)) people.push(x); });
}
// birth clock conventions (Astro-Databank): local mean time before standard zones; Atlanta 1929 on Central time
const TZ_FIX = { 'Adolf Hitler': 'LMT', 'Charles de Gaulle': 'LMT', 'Martin Luther King Jr.': 'UTC-6',
  'Albert Einstein': 'LMT', 'Marie Curie': 'LMT', 'Sigmund Freud': 'LMT', 'Pablo Picasso': 'LMT', 'Vincent van Gogh': 'LMT', 'Madonna': 'UTC-5' };
const M = ['A', 'B', 'C'], LV = ['cycle', 'year', 'yearHex', 'month', 'day'];
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const rows = [], natRows = [], ctrl = {};
M.forEach(m => { ctrl[m] = {}; LV.forEach(l => ctrl[m][l] = []); });
for (const pe of people) {
  const b = pe.birth, male = pe.sex === 'M';
  const P = pillars(b.date, b.time, b.lon, TZ_FIX[pe.name] || b.tz);
  const N = {}; M.forEach(m => { N[m] = natal(m, P, male); });
  natRows.push([pe.name, b.date + ' ' + b.time, N.A.pillars.join(' ')].concat(M.map(m => N[m].xt.n + ' l' + N[m].mv + ' → ' + N[m].ht.hex.n + ' l' + N[m].ht.line)));
  for (const ev of pe.events) {
    if (ev.date <= b.date) continue;
    const Pe = pillars(ev.date, ev.time, b.lon, b.tz);
    const r = { name: pe.name, date: ev.date, pol: ev.polarity, what: ev.what, violent: !!ev.violent, weak: !!pe.weakTime, src: f0(pe) };
    M.forEach(m => { r[m] = predict(N[m], Pe, b.lon); });
    rows.push(r);
  }
  // control: 25 random dates between age 1 and the last event / today
  const last = pe.events.reduce((a, e) => e.date > a ? e.date : a, b.date);
  const t0 = Date.parse(b.date) + 400 * 864e5, t1 = Date.parse(last);
  for (let i = 0; i < 25 && t1 > t0; i++) {
    const d = new Date(t0 + rnd() * (t1 - t0)).toISOString().slice(0, 10);
    const Pe = pillars(d, '12:00', b.lon, b.tz);
    M.forEach(m => { const x = predict(N[m], Pe, b.lon); if (!x.none) LV.forEach(l => ctrl[m][l].push(x.s[l])); });
  }
}
// stats
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const pct = (a, f) => a.length ? Math.round(100 * a.filter(f).length / a.length) : NaN;
function disc(pairs) { const p = pairs.filter(x => x.pol === '+').map(x => x.s), n = pairs.filter(x => x.pol === '-').map(x => x.s); return mean(p) - mean(n); }
const summary = {};
for (const m of M) for (const l of LV) {
  const pairs = rows.filter(r => !r[m].none).map(r => ({ pol: r.pol, s: r[m].s[l] }));
  const pos = pairs.filter(x => x.pol === '+').map(x => x.s), neg = pairs.filter(x => x.pol === '-').map(x => x.s);
  const D = disc(pairs); let ge = 0; const R = 5000;
  const pols = pairs.map(x => x.pol);
  for (let i = 0; i < R; i++) { // permutation test (one-sided: D > 0)
    const sh = pols.slice(); for (let j = sh.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [sh[j], sh[k]] = [sh[k], sh[j]]; }
    if (disc(pairs.map((x, j) => ({ pol: sh[j], s: x.s }))) >= D) ge++;
  }
  const nz = pairs.filter(x => x.s !== 0), agree = nz.filter(x => (x.s > 0) === (x.pol === '+')).length;
  summary[m + '.' + l] = { n: pairs.length, nPos: pos.length, nNeg: neg.length,
    meanPos: +mean(pos).toFixed(2), meanNeg: +mean(neg).toFixed(2), D: +D.toFixed(2), p: +(ge / R).toFixed(3),
    favOnPos: pct(pos, s => s > 0), favOnNeg: pct(neg, s => s > 0), unfavOnNeg: pct(neg, s => s < 0),
    signAgree: nz.length ? Math.round(100 * agree / nz.length) : NaN, ctrlFav: pct(ctrl[m][l], s => s > 0), ctrlMean: +mean(ctrl[m][l]).toFixed(2) };
}
const q = s => '"' + String(s).replace(/"/g, '""') + '"';
const head = ['Person', 'Date', 'Pol', 'Event'].concat(...M.map(m => [m + ' age', m + ' cycle', m + ' annual', m + ' month', m + ' day', m + ' sc cycle', m + ' sc year', m + ' sc month', m + ' sc day']));
const csv = [head.map(q).join(',')].concat(rows.map(r => [r.name, r.date, r.pol, r.what].concat(...M.map(m => r[m].none ? [r[m].age, 'outside cycles', '', '', '', '', '', '', ''] :
  [r[m].age, r[m].period, r[m].annual, r[m].month, r[m].day, r[m].s.cycle, r[m].s.year, r[m].s.month, r[m].s.day])).map(q).join(',')));
fs.writeFileSync(path.join(__dirname, 'events.csv'), csv.join('\n'));
fs.writeFileSync(path.join(__dirname, 'natal.csv'), [['Person', 'Birth', 'Pillars H D M Y', 'A', 'B', 'C']].concat(natRows).map(r => r.map(q).join(',')).join('\n'));
fs.writeFileSync(path.join(__dirname, 'rows.json'), JSON.stringify({ rows, natRows }));
fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify(summary, null, 1));
console.log('people', people.length, 'events', rows.length, '(+', rows.filter(r => r.pol === '+').length, '/ -', rows.filter(r => r.pol === '-').length, ')');
console.log('method.level  n  meanPos meanNeg  D   p   fav+ fav- unfav-  agree  ctrlFav');
for (const k in summary) { const s = summary[k]; console.log(k.padEnd(13), s.n, s.meanPos, s.meanNeg, s.D, s.p, s.favOnPos + '%', s.favOnNeg + '%', s.unfavOnNeg + '%', s.signAgree + '%', s.ctrlFav + '%'); }

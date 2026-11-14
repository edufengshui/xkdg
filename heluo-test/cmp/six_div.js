// HLLS — Six Clashes: divorzi e separazioni (gruppo nuovo, date da ricerca web 14/11/2026) contro matrimoni. Solo prova.
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo;
const SIX = new Set([1, 2, 29, 30, 51, 52, 57, 58, 25, 34]);
// x = data esatta (vale per blocco e giorno); y = solo anno affidabile
const NEW = {
  'Elizabeth Taylor': [['1957-01-26', 'x', 'divorzio Wilding'], ['1964-03-06', 'x', 'divorzio Fisher'], ['1974-06-26', 'x', 'divorzio Burton'], ['1976-07-29', 'x', 'secondo divorzio Burton'], ['1982-11-07', 'x', 'divorzio Warner'], ['1996-10-31', 'x', 'divorzio Fortensky']],
  'Ernest Hemingway': [['1927-04-14', 'x', 'divorzio Hadley'], ['1940-11-04', 'x', 'divorzio Pauline'], ['1945-12-21', 'x', 'divorzio Martha']],
  'Elvis Presley': [['1972-02-23', 'x', 'separazione Priscilla'], ['1973-10-09', 'x', 'divorzio Priscilla']],
  'Marilyn Monroe': [['1946-09-13', 'x', 'divorzio Dougherty'], ['1960-11-11', 'x', 'annuncio separazione Miller'], ['1961-01-20', 'x', 'divorzio Miller']],
  'Muhammad Ali': [['1966-01-10', 'x', 'divorzio Sonji'], ['1977-06-01', 'y', 'divorzio Belinda'], ['1986-07-01', 'y', 'separazione Veronica']],
  'Donald Trump': [['1990-12-11', 'x', 'divorzio Ivana'], ['1997-05-02', 'y', 'separazione Marla'], ['1999-06-08', 'x', 'divorzio Marla']],
  'Madonna': [['2008-10-15', 'x', 'annuncio separazione Ritchie'], ['2008-11-21', 'x', 'divorzio Ritchie']],
  'Audrey Hepburn': [['1968-12-05', 'x', 'divorzio Ferrer'], ['1982-06-01', 'y', 'divorzio Dotti']],
  'Michael Jackson': [['1996-01-18', 'x', 'Lisa Marie chiede il divorzio'], ['1996-08-20', 'x', 'divorzio Lisa Marie'], ['1999-10-08', 'x', 'divorzio Debbie Rowe']],
  'Natalie Wood': [['1961-06-20', 'y', 'separazione Wagner'], ['1962-04-15', 'y', 'divorzio Wagner']],
  'Robin Williams': [['1988-03-30', 'x', 'Valerie chiede il divorzio'], ['2008-03-21', 'x', 'Marsha chiede il divorzio']],
  'Salman Rushdie': [['1993-06-01', 'y', 'divorzio Wiggins'], ['2004-06-01', 'y', 'divorzio West'], ['2007-07-02', 'x', 'annuncio divorzio Padma']],
};
const people = {};
for (const f of ['famous_arts', 'famous_politics', 'famous_violent']) for (const q of require(path.join(__dirname, '..', f + '.json')).people) people[q.name] = people[q.name] || q;
function ctxOf(q) { const b = q.birth, tz = b.tz || (b.lmt ? 'LMT' : 'UTC' + (b.utcOffset >= 0 ? '+' : '') + b.utcOffset), male = (q.sex || 'M') === 'M';
  const Pn = pillars(b.date, b.time, b.lon, tz); return DS.context(H.fromPillars(Pn, male), Pn, male); }
function hx(q, ctx, date) { const [y, mo, d] = date.split('-').map(Number), th = DS.thread(ctx, DS.pillarsTstNoon(y, mo, d, q.birth.lon), q.birth.lon, 'relationship'), p = th.p;
  return { hy: p.year, age: p.age, cyc: p.hx.n, ann: p.annual.hex.n, mon: p.month.hex.n, blk: p.id.lord[0], day: p.id.dayHex[0] }; }
const div = [], wed = [];
for (const [name, q] of Object.entries(people)) {
  let ctx; try { ctx = ctxOf(q); } catch (e) { continue; }
  for (const e of q.events) { const w = e.what;
    if (/divor|separat|split/i.test(w) && !/marries|uccis/i.test(w)) div.push({ name, date: e.date, q: 'x', what: w, ...hx(q, ctx, e.date) });
    else if (/marri|wedding|sposa/i.test(w)) wed.push({ name, date: e.date, q: 'x', what: w, ...hx(q, ctx, e.date) }); }
  for (const [date, qq, what] of NEW[name] || []) if (!div.some(x => x.name === name && x.date === date)) div.push({ name, date, q: qq, what, nuovo: 1, ...hx(q, ctx, date) });
}
const LV = ['cyc', 'ann', 'mon', 'blk', 'day'];
function sum(lab, a) {
  const units = {}; a.forEach(r => { const k = r.name + '|' + r.hy; (units[k] = units[k] || []).push(r); });
  const U = Object.values(units), annU = U.filter(u => SIX.has(u[0].ann)).length, cycU = U.filter(u => SIX.has(u[0].cyc)).length;
  const ex = a.filter(r => r.q === 'x'), f = l => ex.filter(r => SIX.has(r[l])).length;
  const any3 = ex.filter(r => ['mon', 'blk', 'day'].some(l => SIX.has(r[l]))).length;
  console.log(`${lab}: eventi ${a.length} (esatti ${ex.length}), anni distinti ${U.length} | annuale SC ${annU}/${U.length} | ciclo SC ${cycU}/${U.length} | esatti: mese ${f('mon')} blocco ${f('blk')} giorno ${f('day')} su ${ex.length} | almeno uno fra mese/blocco/giorno ${any3}/${ex.length}`);
}
sum('DIVORZI (tutti)', div); sum('DIVORZI nuovi', div.filter(r => r.nuovo)); sum('MATRIMONI', wed);
if (process.argv[2] === 'list') div.sort((a, b) => a.name.localeCompare(b.name) || a.date.localeCompare(b.date)).forEach(r => console.log(r.name, r.date, r.q, r.what.slice(0, 40), 'età', r.age, LV.map(l => l + ' ' + r[l] + (SIX.has(r[l]) ? '*' : '')).join(' ')));
const binom = (k, n, p) => { let s = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = c * (n - j) / (j + 1); s += c * p ** i * (1 - p) ** (n - i); } return s.toFixed(3); };
console.log('p annuale nuovi', binom(8, 32, 10 / 64), '| p tutti (13/41?)');

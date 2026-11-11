// HLLS — Date Selection: prova dei pesi su 30 eventi NUOVI (11/11/2026).
// Eventi scelti PRIMA di vedere i punteggi: persone con ora Rodden AA/A (famous_*.json), giorno certo, scopo chiaro
// (officer = carica, output = lancio/uscita/prima, parent = contratti e firme). Nessuno dei 34 eventi usati finora.
// Uso: node ds_nuovi.js            → percentile di ogni evento con i pesi attuali dell'app + varianti dei pesi
//      node ds_nuovi.js dettaglio  → anche i pezzi del punteggio per evento
//      node ds_nuovi.js json       → scrive ds_nuovi.json (per la pagina)
'use strict';
const path = require('path'), fs = require('fs');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo;
global.window = global; require(path.join(__dirname, '..', '..', 'heluo-texts.js'));
const TX = global.XKDG_HELUO_TEXTS, NJ = global.HeluoNaJia;
const st = (n, l) => (TX[n] && TX[n].lines[l] ? TX[n].lines[l].statement : '');

const PEOPLE = {};
for (const f of ['famous_arts', 'famous_politics', 'famous_violent']) {
  for (const p of require(path.join(__dirname, '..', f + '.json')).people) {
    const b = p.birth, tz = b.tz || (b.lmt ? 'LMT' : 'UTC' + (b.utcOffset >= 0 ? '+' : '') + b.utcOffset);
    PEOPLE[p.name] = { date: b.date, time: b.time, lon: b.lon, tz, male: (p.sex || 'M') === 'M', rodden: b.rodden };
  }
}
const LON = { London: [-0.13, 'Europe/London'], Chicago: [-87.63, 'America/Chicago'], Boston: [-70.30, 'America/New_York'], Berlin: [13.40, 'Europe/Berlin'],
  Rome: [12.48, 'Europe/Rome'], Delhi: [77.21, 'Asia/Kolkata'], Paris: [2.35, 'Europe/Paris'], Vienna: [16.37, 'Europe/Vienna'], LA: [-118.25, 'America/Los_Angeles'],
  NY: [-74.0, 'America/New_York'], Seattle: [-122.33, 'America/Los_Angeles'], Venice: [12.33, 'Europe/Rome'], Washington: [-77.04, 'America/New_York'],
  Austin: [-97.74, 'America/Chicago'], Memphis: [-90.05, 'America/Chicago'], Colombo: [79.86, 'Asia/Colombo'], Rapallo: [9.23, 'Europe/Rome'], Palermo: [13.36, 'Europe/Rome'] };
const EVENTI = [
  // officer — carica
  ['Margaret Thatcher', '1979-05-04', 'London', 'officer', 'becomes Prime Minister'],
  ['Barack Obama', '2008-11-04', 'Chicago', 'officer', 'elected President'],
  ['John F. Kennedy', '1960-11-08', 'Boston', 'officer', 'elected President'],
  ['Winston Churchill', '1940-05-10', 'London', 'officer', 'becomes Prime Minister'],
  ['Adolf Hitler', '1933-01-30', 'Berlin', 'officer', 'appointed Chancellor'],
  ['Benito Mussolini', '1922-10-30', 'Rome', 'officer', 'appointed Prime Minister'],
  ['Papa Giovanni Paolo II (Karol Wojtyla)', '1978-10-16', 'Rome', 'officer', 'elected Pope'],
  ['Papa Paolo VI (Giovanni Battista Montini)', '1963-06-21', 'Rome', 'officer', 'elected Pope'],
  ['Indira Gandhi', '1966-01-24', 'Delhi', 'officer', 'becomes Prime Minister'],
  ['Emmanuel Macron', '2017-05-07', 'Paris', 'officer', 'elected President'],
  ['Charles de Gaulle', '1958-06-01', 'Paris', 'officer', 'invested Prime Minister'],
  ['Elizabeth II', '1953-06-02', 'London', 'officer', 'coronation'],
  // output — lancio, uscita, prima
  ['Sigmund Freud', '1899-11-04', 'Vienna', 'output', 'The Interpretation of Dreams published'],
  ['Michael Jackson', '1982-11-29', 'LA', 'output', 'Thriller released'],
  ['Madonna', '1983-07-27', 'NY', 'output', 'debut album released'],
  ['Kurt Cobain', '1991-09-24', 'Seattle', 'output', 'Nevermind released'],
  ['Jimi Hendrix', '1967-05-12', 'London', 'output', 'Are You Experienced released'],
  ['Pier Paolo Pasolini', '1961-08-31', 'Venice', 'output', 'Accattone premiere in Venice'],
  ['Salman Rushdie', '1988-09-26', 'London', 'output', 'The Satanic Verses published'],
  ['James Dean', '1955-03-09', 'NY', 'output', 'East of Eden premiere'],
  ['Christopher Reeve', '1978-12-10', 'Washington', 'output', 'Superman world premiere'],
  ['Jean Jaurès', '1904-04-18', 'Paris', 'output', 'first issue of L\'Humanité'],
  ['Robin Williams', '1978-09-14', 'LA', 'output', 'first episode of Mork & Mindy'],
  ['Stevie Ray Vaughan', '1983-06-13', 'Austin', 'output', 'Texas Flood released'],
  // parent — contratti, firme, documenti
  ['Elvis Presley', '1955-11-21', 'Memphis', 'parent', 'signs with RCA Victor'],
  ['Jayne Mansfield', '1956-05-03', 'LA', 'parent', 'six-year contract with 20th Century Fox'],
  ['Rajiv Gandhi', '1987-07-29', 'Colombo', 'parent', 'signs the Indo-Sri Lanka accord'],
  ['Walther Rathenau', '1922-04-16', 'Rapallo', 'parent', 'signs the Treaty of Rapallo'],
  ['Umberto I di Savoia', '1882-05-20', 'Vienna', 'parent', 'Triple Alliance signed'],
  ['Giovanni Falcone', '1985-11-08', 'Palermo', 'parent', 'files the Maxiprocesso indictment'],
].map(([chi, d, luogo, scopo, cosa]) => ({ chi, d, luogo: LON[luogo], scopo, cosa }));

// variants of the weights: f(g) → total from the parts of scoreDay
const lv = (L, k) => k.rel * L.rs + k.tm * L.tm.t + k.txt * L.txt;
const K1 = { rel: 1, tm: 1, txt: 1 };
const VAR = {
  'app now': g => g.tot,
  'no Luck': g => g.tot - g.L.tot,
  'no cycle line': g => g.tot - g.c.tot,
  'no annual line': g => g.tot - g.a.tot,
  'no month line': g => g.tot - g.m.tot,
  'no secondary': g => g.tot - 0.5 * g.s2.tot,
  'secondary ×1': g => g.tot + 0.5 * g.s2.tot,
  'day ×2': g => g.tot + g.d.tot + 0.5 * g.s2.tot,
  'day only (prim.+sec.)': g => g.d.tot + 0.5 * g.s2.tot,
  'no relation': g => ['c', 'a', 'm', 'd'].reduce((s, k) => s + lv(g[k], { rel: 0, tm: 1, txt: 1 }), 0) + 0.5 * lv(g.s2, { rel: 0, tm: 1, txt: 1 }) + g.L.tot,
  'no time': g => ['c', 'a', 'm', 'd'].reduce((s, k) => s + lv(g[k], { rel: 1, tm: 0, txt: 1 }), 0) + 0.5 * lv(g.s2, { rel: 1, tm: 0, txt: 1 }) + g.L.tot,
  'no text': g => ['c', 'a', 'm', 'd'].reduce((s, k) => s + lv(g[k], { rel: 1, tm: 1, txt: 0 }), 0) + 0.5 * lv(g.s2, { rel: 1, tm: 1, txt: 0 }) + g.L.tot,
  'relation ×2': g => ['c', 'a', 'm', 'd'].reduce((s, k) => s + lv(g[k], { rel: 2, tm: 1, txt: 1 }), 0) + 0.5 * lv(g.s2, { rel: 2, tm: 1, txt: 1 }) + g.L.tot,
  'time ×2': g => ['c', 'a', 'm', 'd'].reduce((s, k) => s + lv(g[k], { rel: 1, tm: 2, txt: 1 }), 0) + 0.5 * lv(g.s2, { rel: 1, tm: 2, txt: 1 }) + g.L.tot,
  'text ×2': g => ['c', 'a', 'm', 'd'].reduce((s, k) => s + lv(g[k], { rel: 1, tm: 1, txt: 2 }), 0) + 0.5 * lv(g.s2, { rel: 1, tm: 1, txt: 2 }) + g.L.tot,
};

function unEvento(e) {
  const b = PEOPLE[e.chi]; if (!b) throw new Error('no birth for ' + e.chi);
  const Pn = pillars(b.date, b.time, b.lon, b.tz), R = H.fromPillars(Pn, b.male), ctx = DS.context(R, Pn, b.male);
  const Y = +e.d.slice(0, 4), s = DS.scan(ctx, Date.UTC(Y, 0, 1), Date.UTC(Y, 11, 31), e.luogo[0], e.scopo);
  const me = s.days.find(x => new Date(x.date).toISOString().slice(0, 10) === e.d);
  if (!me) return { e, fuori: true, age: DS.predict(R, DS.pillarsTstNoon(Y, 6, 1, e.luogo[0]), e.luogo[0]).age };
  const pct = {};
  for (const [k, f] of Object.entries(VAR)) {
    const v = f(me), above = s.days.filter(x => f(x) > v + 1e-9).length, same = s.days.filter(x => Math.abs(f(x) - v) < 1e-9).length;
    pct[k] = (above + (same + 1) / 2) / s.days.length;
  }
  return { e, me, pct, n: s.days.length, Pn, R, b };
}

// the cascade in the shape of confronto_mensile.js (so verifica_edu.js can draw it)
function carta(x) {
  const g = x.me, p = g.p, D = 86400000, pers = g.pers;
  const li = (n, l) => { const L = NJ[n].lines[l - 1]; return { n, l, b: L.branch, el: L.el, r: DS.rel(pers, L.el), testo: st(n, l) }; };
  return { eta: p.age, pers, pil: [g.Pe.hour, g.Pe.day, g.Pe.month, g.Pe.year], fase: p.phase, giornoMese: p.dayOfMonth, mIndex: p.month.index, mChanged: p.month.changed,
    mStart: g.date - (p.dayOfMonth - 1) * D, ciclo: li(...p.id.cycle), annuale: li(...p.id.year), mensile: p.month.hex.n, signore: li(...p.id.lord), giorno: li(...p.id.day),
    esaGiorno: li(...p.id.dayHex), linee: { ciclo: p.hx.lines, annuale: p.annual.hex.lines, mensile: p.month.hex.lines, blocco: p.daily.block.lines, giorno: p.daily.hex.lines },
    cicli: (p.phase === 'XT' ? x.R.cyclesXT : x.R.cyclesHT).map(c => [c.line, c.from, c.to]),
    ds: { tot: g.tot, pct: x.pct['app now'], pctBase: x.pct['app now'], d: { r: g.d.r, rs: g.d.rs, t: g.d.tm.t, note: g.d.tm.note, s: g.d.s, txt: g.d.txt, tot: g.d.tot },
      s2: { t: g.s2.tm.t, note: g.s2.tm.note } } };
}
module.exports = { EVENTI, PEOPLE, VAR, unEvento };
if (require.main === module) {
  const det = process.argv.includes('dettaglio'), out = EVENTI.map(unEvento), ok = out.filter(x => !x.fuori);
  for (const x of out) {
    if (x.fuori) { console.log(`${x.e.chi.slice(0, 26).padEnd(26)} ${x.e.d} — out of the cycles (age ${x.age})`); continue; }
    const g = x.me;
    console.log(`${x.e.chi.slice(0, 26).padEnd(26)} ${x.e.d} ${x.e.scopo.padEnd(7)} pct ${(100 * x.pct['app now']).toFixed(0).padStart(3)}  score ${g.tot}  age ${g.p.age} pers ${g.pers}`);
    if (det) {
      const f = (n, L) => `${n} ${L.hexN} l${L.line} ${L.b} ${L.r} rel ${L.rs} time ${L.tm.t} [${L.tm.note.join(' ')}] text ${L.s}→${L.txt}`;
      console.log('     ' + [f('cycle', g.c), f('annual', g.a), f('month', g.m), f('day', g.d), f('sec', g.s2)].join('\n     ') + `\n     luck ${g.L.tot}`);
    }
  }
  const avg = (arr, k) => 100 * arr.reduce((s, x) => s + x.pct[k], 0) / arr.length;
  const top = (arr, k, q) => arr.filter(x => x.pct[k] <= q).length;
  console.log(`\nEvents scored ${ok.length}/${out.length}. Mean percentile (chance 50; lower = better) and events in the best 25% / 10%:`);
  for (const k of Object.keys(VAR)) {
    const by = sc => ok.filter(x => x.e.scopo === sc);
    console.log(`  ${k.padEnd(22)} ${avg(ok, k).toFixed(0).padStart(3)}   top25 ${top(ok, k, 0.25)}  top10 ${top(ok, k, 0.10)}   officer ${avg(by('officer'), k).toFixed(0)} · output ${avg(by('output'), k).toFixed(0)} · parent ${avg(by('parent'), k).toFixed(0)}`);
  }
  if (process.argv.includes('json')) {
    fs.writeFileSync(path.join(__dirname, 'ds_nuovi.json'), JSON.stringify(out.map(x => x.fuori ? { e: x.e, fuori: true, age: x.age } : {
      e: x.e, pct: x.pct, n: x.n, tot: x.me.tot, age: x.me.p.age, pers: x.me.pers, pil: [x.me.Pe.hour, x.me.Pe.day, x.me.Pe.month, x.me.Pe.year],
      lv: Object.fromEntries(['c', 'a', 'm', 'd', 's2'].map(k => [k, { hexN: x.me[k].hexN, line: x.me[k].line, b: x.me[k].b, r: x.me[k].r, rs: x.me[k].rs, t: x.me[k].tm.t, note: x.me[k].tm.note, s: x.me[k].s, txt: x.me[k].txt, tot: x.me[k].tot }])),
      luck: x.me.L.tot, x: carta(x) }), null, 1));
    console.log('written ds_nuovi.json');
  }
}

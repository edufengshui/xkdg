// HLLS — prova dell'esagramma dell'ora (Edu, 12/11/2026): la linea k dell'esagramma del giorno governa due ore.
// A = ore sui rami (linea 1 = 子+丑, 23:00–03:00; il 子 delle 23 appartiene al giorno dopo)
// B = come il mese dai 中氣: ore da mezzanotte (linea 1 = 00:00–04:00, 2 = 04–08 … 6 = 20–24), stessa data solare vera.
// Ora dispari = esagramma del giorno con la linea k mutata; ora pari = anche la correlata. Sempre ora solare vera.
// Uso: node ore_test.js
'use strict';
const path = require('path'), fs = require('fs');
const { pillars } = require('./heluo_cmp.js');
const NJ = global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const SC = global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo; global.window = global; require(path.join(__dirname, '..', '..', 'heluo-texts.js')); const TX = global.XKDG_HELUO_TEXTS;
const G = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' }, C = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const rel = (p, e) => e === p ? 'B' : G[p] === e ? 'C' : C[p] === e ? 'W' : C[e] === p ? 'G' : 'P';
const BR = '子丑寅卯辰巳午未申酉戌亥';
const LUOGHI = { // luogo dell'evento: [lon, tz]
  'Margaret Thatcher|1984-10-12': [-0.14, 'Europe/London'], 'Donald Trump|2024-07-13': [-79.9, 'America/New_York'],
  'Diana, Princess of Wales|1982-06-21': [-0.17, 'Europe/London'], 'Diana, Princess of Wales|1984-09-15': [-0.17, 'Europe/London'],
  'Diana, Princess of Wales|1997-08-31': [2.35, 'Europe/Paris'], 'Elizabeth II|2022-09-08': [-3.23, 'Europe/London'],
  'John F. Kennedy|1963-11-22': [-96.8, 'America/Chicago'], 'Jacqueline Kennedy Onassis|1963-11-22': [-96.8, 'America/Chicago'],
  'Richard Nixon|1974-08-08': [-77.04, 'America/New_York'], 'Adolf Hitler|1944-07-20': [21.49, 'UTC+2'], 'Adolf Hitler|1945-04-30': [13.4, 'UTC+2'],
  'Martin Luther King Jr.|1968-04-04': [-90.05, 'America/Chicago'], 'Robert F. Kennedy|1968-06-05': [-118.3, 'America/Los_Angeles'],
  'Robert F. Kennedy|1968-06-06': [-118.3, 'America/Los_Angeles'], 'Ayrton Senna|1994-05-01': [11.71, 'Europe/Rome'], 'Jimi Hendrix|1969-08-18': [-74.88, 'America/New_York'] };
const EV = [];
for (const f of ['famous_violent.json', 'famous_politics.json', 'famous_arts.json']) { const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', f))); for (const p of (Array.isArray(j) ? j : j.people || Object.values(j)))
  for (const e of p.events || []) if (e.time) EV.push({ p, e }); }
// Diana: anche l'ora dell'incidente (00:23)
EV.push({ p: EV.find(x => x.p.name.startsWith('Diana')).p, e: { date: '1997-08-31', time: '00:23', polarity: '-', what: 'Car crash in the Pont de l\'Alma tunnel' } });

// Eventi aggiunti il 12/11/2026 (ora verificata sul web; fonti nella risposta a Edu): [nome, data, ora civile, lon, tz, polarità, cosa]
const EXTRA = [
  ['Indira Gandhi', '1984-10-31', '09:20', 77.2, 'Asia/Kolkata', '-', 'Shot by her bodyguards, New Delhi'],
  ['Rajiv Gandhi', '1991-05-21', '22:10', 79.95, 'Asia/Kolkata', '-', 'Suicide bomb, Sriperumbudur'],
  ['Olof Palme', '1986-02-28', '23:21', 18.06, 'Europe/Stockholm', '-', 'Shot on Sveavägen, Stockholm'],
  ['Hendrik Verwoerd', '1966-09-06', '14:15', 18.42, 'Africa/Johannesburg', '-', 'Stabbed in the House of Assembly'],
  ['Malcolm X', '1965-02-21', '15:10', -73.94, 'America/New_York', '-', 'Shot at the Audubon Ballroom'],
  ['Giovanni Falcone', '1992-05-23', '17:58', 13.2, 'Europe/Rome', '-', 'Capaci bomb'],
  ['Papa Giovanni Paolo II (Karol Wojtyla)', '1981-05-13', '17:17', 12.46, 'Europe/Rome', '-', 'Shot in St Peter\'s Square'],
  ['Gianni Versace', '1997-07-15', '08:45', -80.13, 'America/New_York', '-', 'Shot on the steps of his villa, Miami Beach'],
  ['Albert Camus', '1960-01-04', '14:05', 3.33, 'Europe/Paris', '-', 'Car crash at Villeblevin (13:55–14:15)'],
  ['Jean Jaurès', '1914-07-31', '21:40', 2.34, 'UTC+0', '-', 'Shot at the Café du Croissant'],
  ['Jair Bolsonaro', '2018-09-06', '15:25', -43.35, 'America/Sao_Paulo', '-', 'Stabbed in Juiz de Fora (hospital 15:40)'],
  ['Anna Lindh', '2003-09-10', '16:10', 18.07, 'Europe/Stockholm', '-', 'Stabbed at NK (alarm 16:14)'],
  ['Charles III', '2023-05-06', '12:02', -0.13, 'Europe/London', '+', 'Crowned in Westminster Abbey'],
  ['Elizabeth II', '1953-06-02', '12:23', -0.13, 'Europe/London', '+', 'Crowned in Westminster Abbey'],
  ['Michael Jackson', '2009-06-25', '14:26', -118.44, 'America/Los_Angeles', '-', 'Pronounced dead, UCLA'],
  ['Albert Einstein', '1955-04-18', '01:15', -74.66, 'America/New_York', '-', 'Dies in Princeton Hospital'],
  ['James Dean', '1955-09-30', '17:45', -120.3, 'America/Los_Angeles', '-', 'Car crash at Cholame'],
];
const PEOPLE = {};
for (const f of ['famous_violent.json', 'famous_politics.json', 'famous_arts.json', ...fs.readdirSync(path.join(__dirname, '..', 'new')).filter(x => x.endsWith('.json')).map(x => 'new/' + x)]) {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', f))); for (const p of (Array.isArray(j) ? j : j.people || Object.values(j))) if (p && p.name && !PEOPLE[p.name]) PEOPLE[p.name] = p; }
// Edu, 8/12/2015 (ore solari vere già note): lettera alle 16:37, risposta alle 18:47
const EDU = { name: 'Edu', sex: 'M', birth: { date: '1960-08-18', time: '10:00', lon: 11.72, tz: 'Europe/Rome' } };
function oraLinea(ctx, ymd, lon, unit) {
  const [y, mo, d] = ymd, Pe = DS.pillarsTstNoon(y, mo, d, lon), th = DS.thread(ctx, Pe, lon, 'wealth');
  if (!th) return null;
  const dh = th.p.daily.hex;
  const m = H.monthlyHex(dh.lines, unit), k = m.line, Ld = NJ[dh.n].lines[k - 1], Lh = NJ[m.hex.n].lines[k - 1];
  return { dn: dh.n, hn: m.hex.n, k, d: Ld.branch + rel(th.pers, Ld.el), h: Lh.branch + rel(th.pers, Lh.el), sd: SC[dh.n].l[k], sh: SC[m.hex.n].l[k],
    td: TX[dh.n].lines[k].statement, thx: TX[m.hex.n].lines[k].statement, tt: TX[m.hex.n].title.split('(')[0].trim() };
}
const add = (y, mo, d, n) => { const t = new Date(Date.UTC(y, mo - 1, d) + n * 864e5); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
function prova(p, e, lon, tz, tst) {
  const b = p.birth, Pn = pillars(b.date, b.time, b.lon, b.tz), R = H.fromPillars(Pn, p.sex === 'M'), ctx = DS.context(R, Pn, p.sex === 'M');
  let T = tst; if (!T) { const P = pillars(e.date, e.time, lon, tz).meta.tst; T = { ymd: [P.y, P.mo, P.d], h: P.h, mi: P.mi }; }
  const min = T.h * 60 + T.mi, bi = Math.floor(((min + 60) % 1440) / 120);
  const A = oraLinea(ctx, T.h >= 23 ? add(...T.ymd, 1) : T.ymd, lon, bi + 1), B = oraLinea(ctx, T.ymd, lon, Math.floor(T.h / 2) + 1);
  if (!A || !B) { console.log(`\n${p.name} ${e.date}: fuori dai cicli, saltato`); return; }
  const same = A.hn === B.hn && A.k === B.k && A.dn === B.dn;
  console.log(`\n${p.name} ${e.date} ${e.time || ''} (${e.polarity}) ${e.what}\n  ora solare vera ${String(T.h).padStart(2, '0')}:${String(T.mi).padStart(2, '0')}, ramo ${BR[bi]}${same ? '  — A e B uguali' : ''}`);
  for (const [n, X] of same ? [['A=B', A]] : [['A', A], ['B', B]])
    console.log(`  ${n}: giorno ${X.dn} l${X.k} ${X.d}(${X.sd}) → ora ${X.hn} ${X.tt} l${X.k} ${X.h}(${X.sh})\n      P: ${X.td.slice(0, 150)}\n      S: ${X.thx.slice(0, 150)}`);
}
if (process.argv[2] !== 'nuovi') for (const { p, e } of EV) { const L = LUOGHI[p.name + '|' + e.date]; if (L) prova(p, e, L[0], L[1]); else console.log('manca il luogo', p.name, e.date); }
const SOLO_NUOVI = process.argv[2] === 'nuovi';
for (const [n, d, t, lon, tz, pol, what] of EXTRA) { const p = PEOPLE[n]; if (!p) { console.log('manca', n); continue; } prova(p, { date: d, time: t, polarity: pol, what }, lon, tz); }
prova(EDU, { date: '2015-12-08', time: '16:37', polarity: '-', what: 'lettera di Ying ai clienti' }, 12.07, null, { ymd: [2015, 12, 8], h: 16, mi: 37 });
prova(EDU, { date: '2015-12-08', time: '18:47', polarity: '-', what: 'risposta di Edu' }, 12.07, null, { ymd: [2015, 12, 8], h: 18, mi: 47 });

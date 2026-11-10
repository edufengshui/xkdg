// HLLS — check degli eventi con la regola del Signore del Blocco (Edu, 10/11/2026).
// Per ogni evento: ciclo, annuale, mensile; linea del giorno vecchia (sul mensile) e nuova
// (Signore del Blocco → esagramma del blocco → linea del giorno → esagramma del giorno),
// con ramo Na Jia, relazione sulla persona e giudizio sul tempo (anno, mese, giorno).
// Giorno del mese contato SEMPRE in ora solare vera del luogo dell'evento (Edu), mai con le date di Pechino.
// Uso: node check_giorno.js
'use strict';
const path = require('path');
const { natal, predict, pillars } = require('./heluo_cmp.js');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const H = global.XKDGHeluo;
const LK2 = require('./luck.js');
const TX = (() => { global.window = global; require(path.join(__dirname, '..', '..', 'heluo-texts.js')); return global.XKDG_HELUO_TEXTS; })();

const BR = '子丑寅卯辰巳午未申酉戌亥', ST = '甲乙丙丁戊己庚辛壬癸';
const TRI_EL = { Qian: 'Metal', Dui: 'Metal', Li: 'Fire', Zhen: 'Wood', Xun: 'Wood', Kan: 'Water', Gen: 'Earth', Kun: 'Earth' };
const BR_EL = { 子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire', 午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water' };
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const SANHE = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
const SEASON = { 寅: 'Wood', 卯: 'Wood', 辰: 'Wood', 巳: 'Fire', 午: 'Fire', 未: 'Fire', 申: 'Metal', 酉: 'Metal', 戌: 'Metal', 亥: 'Water', 子: 'Water', 丑: 'Water' };
const clash = b => BR[(BR.indexOf(b) + 6) % 12];
const rel = (p, el) => el === p ? 'B' : GEN[p] === el ? 'C' : CTRL[p] === el ? 'W' : CTRL[el] === p ? 'G' : 'P';
function timely(el, mb) {
  const earthM = '辰未戌丑'.includes(mb);
  if (el === 'Earth') return earthM || SEASON[mb] === 'Fire';
  const genBy = Object.keys(GEN).find(k => GEN[k] === el);
  return SEASON[mb] === el || SEASON[mb] === genBy || (genBy === 'Earth' && earthM);
}
const voids = p => { const x = ((BR.indexOf(p[1]) - ST.indexOf(p[0])) % 12 + 12) % 12; return [BR[(x + 10) % 12], BR[(x + 11) % 12]]; };
function tempo(b, T, nv) {
  const el = BR_EL[b], n = [];
  n.push(timely(el, T.m) ? 'timely' : 'non timely');
  for (const [k, x] of [['anno', T.y], ['mese', T.m], ['giorno', T.d]]) {
    if (x === b) n.push('=' + k); else if (LIUHE[b] === x) n.push('六合 ' + k);
    else if (clash(b) === x) n.push('冲 ' + k); else if (SANHE.some(s => s.includes(b) && s.includes(x))) n.push('三合 ' + k);
    if (x !== b && CTRL[BR_EL[x]] === el) n.push('剋 ' + k);
  }
  if (nv.includes(b)) n.push(timely(el, T.m) ? '空 (timely: non vero)' : '空 vero');
  return n.join(', ');
}
const persona = (hx, line) => { const u = TRI_EL[hx.upper], l = TRI_EL[hx.lower]; return u === l ? u : (line <= 3 ? l : u); };
const st = (n, l) => (TX[n] && TX[n].lines[l] ? TX[n].lines[l].statement : '');
function riga(nome, n, l, pers, T, nv) {
  const L = NJ[n].lines[l - 1];
  return `  ${nome.padEnd(16)} ${String(n).padStart(2)} l${l} ${L.branch} ${rel(pers, L.el)}  [${tempo(L.branch, T, nv)}]\n${' '.repeat(19)}“${st(n, l)}”`;
}

const EVENTI = [
  { chi: 'Gates', nasc: ['1955-10-28', '22:00', -122.33, 'America/Los_Angeles', true], d: '1986-03-13', ora: '06:30', luogo: [-122.33, 'America/Los_Angeles'], cosa: 'quotazione Microsoft' },
  { chi: 'Zuckerberg', nasc: ['1984-05-14', '14:39', -73.87, 'America/New_York', true], d: '2004-02-04', ora: '12:00', luogo: [-71.12, 'America/New_York'], cosa: 'lancio di Facebook' },
  { chi: 'Zuckerberg', nasc: ['1984-05-14', '14:39', -73.87, 'America/New_York', true], d: '2012-05-18', ora: '08:30', luogo: [-122.18, 'America/Los_Angeles'], cosa: 'quotazione Facebook' },
  { chi: 'Zuckerberg', nasc: ['1984-05-14', '14:39', -73.87, 'America/New_York', true], d: '2012-05-19', ora: '12:00', luogo: [-122.18, 'America/Los_Angeles'], cosa: 'nozze' },
  { chi: 'Jobs', nasc: ['1955-02-24', '19:15', -122.42, 'America/Los_Angeles', true], d: '2007-01-09', ora: '09:00', luogo: [-122.42, 'America/Los_Angeles'], cosa: 'presentazione iPhone' },
  { chi: 'Jobs', nasc: ['1955-02-24', '19:15', -122.42, 'America/Los_Angeles', true], d: '2011-10-05', ora: '15:00', luogo: [-122.14, 'America/Los_Angeles'], cosa: 'morte' },
  { chi: 'Musk', nasc: ['1971-06-28', '05:29', 28.19, 'Africa/Johannesburg', true], d: '2002-07-08', ora: '12:00', luogo: [-121.89, 'America/Los_Angeles'], cosa: 'eBay compra PayPal (annuncio)' },
  { chi: 'Musk', nasc: ['1971-06-28', '05:29', 28.19, 'Africa/Johannesburg', true], d: '2002-10-03', ora: '12:00', luogo: [-121.89, 'America/Los_Angeles'], cosa: 'eBay compra PayPal (chiusura)' },
  { chi: 'Diana', nasc: ['1961-07-01', '19:45', 0.50, 'Europe/London', false], d: '1997-08-31', ora: '00:25', luogo: [2.35, 'Europe/Paris'], cosa: 'incidente a Parigi' },
];

module.exports = { EVENTI };
if (require.main === module) for (const e of EVENTI) {
  const [d0, t0, lon0, tz0, male] = e.nasc, Pn = pillars(d0, t0, lon0, tz0), N = natal('A', Pn, male);
  const Pe = pillars(e.d, e.ora, e.luogo[0], e.luogo[1]), p = predict(N, Pe, e.luogo[0]);
  const hx = p.phase === 'XT' ? N.xt : N.ht.hex, pers = persona(hx, p.id.cycle[1]);
  const T = { y: Pe.year[1], m: Pe.month[1], d: Pe.day[1] }, nv = voids(Pn.day).concat(voids(N.pillars[3]));
  const dayN = +p.day.match(/\(d(\d+)\)/)[1], oldL = Math.floor((dayN - 1) / 5) % 6 + 1;
  console.log(`\n## ${e.chi} — ${e.d} ${e.cosa}; età ${p.age}; persona ${pers}`);
  console.log(`  pilastri (Ora · Giorno · Mese · Anno): ${Pe.hour} · ${Pe.day} · ${Pe.month} · ${Pe.year}; giorno ${dayN} del mese solare`);
  console.log(riga('ciclo', p.id.cycle[0], p.id.cycle[1], pers, T, nv));
  console.log(riga('annuale', p.id.year[0], p.id.year[1], pers, T, nv));
  console.log(`  mensile          ${p.id.month[0]}`);
  console.log(riga('VECCHIA giorno', p.id.month[0], oldL, pers, T, nv));
  console.log(riga('Signore Blocco', p.id.lord[0], p.id.lord[1], pers, T, nv) + `   (blocco ${p.id.month[0]} → ${p.id.lord[0]})`);
  console.log(riga('NUOVA giorno', p.id.day[0], p.id.day[1], pers, T, nv));
  console.log(riga('esag. giorno', p.id.dayHex[0], p.id.dayHex[1], pers, T, nv));
  const PR = LK2.profilo(Pn, male), K = PR.K, g = LK2.giorno(PR, p, T);
  console.log(`  Luck: ` + ['heaven', 'earth', 'fame'].map(k => `${k} ${K[k].t} (opp. ${K[k].op}${K[k].inNat ? ', nel nativo' : ''}, ×${K[k].m})`).join(' · '));
  console.log(`  Luck del giorno ${g.tot >= 0 ? '+' : ''}${g.tot}  [${g.w.join(' · ')}]`);
}


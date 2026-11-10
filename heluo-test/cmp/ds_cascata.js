// HLLS — Date Selection a cascata (9/11/2026).
// Per ogni giorno: linea del ciclo (XT/HT) → linea mossa dell'annuale → mensile con la linea del giorno.
// Ogni linea: relazione sulla persona pesata secondo lo scopo + giudizio sul tempo (anno, mese, giorno)
// + testo (scores.json, −2…+2) spostato di ±1 verso la versione scelta dal tempo.
// Uso: node ds_cascata.js            → prova sugli eventi noti
//      node ds_cascata.js dettaglio  → anche la scheda della cascata per ogni evento
//      node ds_cascata.js esagiorno  → livello del giorno sulla linea dell'esagramma del giorno invece che del blocco
// Linea del giorno (10/11/2026): regola di Edu del Signore del Blocco (predict in heluo_cmp.js, dailyHex nell'app);
// di default il livello del giorno è la linea del giorno nell'esagramma del blocco.
'use strict';
const path = require('path');
const { natal, predict, pillars } = require('./heluo_cmp.js');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const SC = require('./scores.json');

const BR = '子丑寅卯辰巳午未申酉戌亥', ST = '甲乙丙丁戊己庚辛壬癸';
const TRI_EL = { Qian: 'Metal', Dui: 'Metal', Li: 'Fire', Zhen: 'Wood', Xun: 'Wood', Kan: 'Water', Gen: 'Earth', Kun: 'Earth' };
const BR_EL = { 子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire', 午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water' };
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const SANHE = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
const clash = b => BR[(BR.indexOf(b) + 6) % 12];

// relazione dell'elemento della linea rispetto alla persona
function rel(pers, el) {
  if (el === pers) return 'B';
  if (GEN[pers] === el) return 'C';
  if (CTRL[pers] === el) return 'W';
  if (CTRL[el] === pers) return 'G';
  return 'P';
}
// pesi della relazione secondo lo scopo
const SCOPI = {
  wealth:  { W: 2, C: 1, P: 0, G: 0, B: -1 },   // guadagni, vendite (食傷生財; 比劫奪財)
  parent:  { P: 2, G: 1, B: 0, C: 0, W: -1 },   // contratti, documenti (官生印; 財壞印)
  output:  { C: 2, B: 1, W: 0, G: 0, P: -1 },   // lancio di un prodotto (梟神奪食)
  officer: { G: 2, W: 1, P: 0, B: 0, C: -1 },   // incarichi (財生官; 傷官見官)
};
// timeliness secondo Edu: Terra nei mesi 辰未戌丑 e in estate; gli altri nella loro stagione e in quella di chi li genera
const SEASON = { 寅: 'Wood', 卯: 'Wood', 辰: 'Wood', 巳: 'Fire', 午: 'Fire', 未: 'Fire', 申: 'Metal', 酉: 'Metal', 戌: 'Metal', 亥: 'Water', 子: 'Water', 丑: 'Water' };
function timely(el, mb) {
  const earthM = '辰未戌丑'.includes(mb);
  if (el === 'Earth') return earthM || SEASON[mb] === 'Fire';
  const genBy = Object.keys(GEN).find(k => GEN[k] === el);
  if (SEASON[mb] === el || SEASON[mb] === genBy) return true;
  return genBy === 'Earth' && earthM;
}
// vuoti (旬空) di un pilastro
function voids(p) {
  const s = ST.indexOf(p[0]), b = BR.indexOf(p[1]), x = ((b - s) % 12 + 12) % 12;
  return [BR[(x + 10) % 12], BR[(x + 11) % 12]];
}

// giudizio sul tempo del ramo b: anno, mese, giorno
function tempo(b, T, natVoids) {
  const el = BR_EL[b], note = [];
  let t = 0;
  if (timely(el, T.m)) { t += 1; note.push('timely'); }
  for (const [k, x] of [['a', T.y], ['m', T.m], ['g', T.d]]) {
    if (x === b) { t += 1; note.push('=' + k); }
    else if (LIUHE[b] === x) { t += 1; note.push('六合' + k); }
    else if (clash(b) === x) { t -= 2; note.push('冲' + k); }
    else if (SANHE.some(s => s.includes(b) && s.includes(x))) { t += 0.5; note.push('三合' + k); }
    if (x !== b && CTRL[BR_EL[x]] === el) { t -= 0.5; note.push('剋' + k); }
  }
  if (natVoids.includes(b) && !timely(el, T.m)) { t -= 1; note.push('空'); }
  return { t, note };
}

function livello(hexN, line, pers, scopo, T, natVoids) {
  const L = NJ[hexN].lines[line - 1], r = rel(pers, L.el), tm = tempo(L.branch, T, natVoids);
  const s = SC[hexN].lines[line].s, V = Math.sign(tm.t), txt = Math.max(-2, Math.min(2, s + V));
  return { hexN, line, b: L.branch, el: L.el, r, rs: SCOPI[scopo][r], tm, s, V, txt, tot: SCOPI[scopo][r] + tm.t + txt };
}

function persona(hx, line) {
  const u = TRI_EL[hx.upper], l = TRI_EL[hx.lower];
  return u === l ? u : (line <= 3 ? l : u);
}

function giorno(N, nat, date, lon, tz, scopo) {
  const Pe = pillars(date, '12:00', lon, tz), p = predict(N, Pe, lon);
  if (p.none) return null;
  const hx = p.phase === 'XT' ? N.xt : N.ht.hex, pers = persona(hx, p.id.cycle[1]);
  const T = { y: Pe.year[1], m: Pe.month[1], d: Pe.day[1] };
  const nv = voids(nat.day).concat(voids(nat.year));
  const c = livello(p.id.cycle[0], p.id.cycle[1], pers, scopo, T, nv);
  const a = livello(p.id.year[0], p.id.year[1], pers, scopo, T, nv);
  const dd = process.argv.includes('esagiorno') ? p.id.dayHex : p.id.day, d = livello(dd[0], dd[1], pers, scopo, T, nv);
  return { date, Pe, p, pers, c, a, d, tot: c.tot + a.tot + d.tot };
}

const NASCITE = {
  gates: ['1955-10-28', '22:00', -122.33, 'America/Los_Angeles'],
  jobs: ['1955-02-24', '19:15', -122.42, 'America/Los_Angeles'],
  zuckerberg: ['1984-05-14', '14:39', -73.87, 'America/New_York'],
  musk: ['1971-06-28', '05:29', 28.19, 'Africa/Johannesburg'],
};
const EVENTI = [
  { chi: 'gates', d: '1986-03-13', luogo: [-122.33, 'America/Los_Angeles'], scopo: 'wealth', cosa: 'quotazione Microsoft' },
  { chi: 'zuckerberg', d: '2004-02-04', luogo: [-71.12, 'America/New_York'], scopo: 'output', cosa: 'lancio di Facebook' },
  { chi: 'zuckerberg', d: '2012-05-18', luogo: [-122.18, 'America/Los_Angeles'], scopo: 'wealth', cosa: 'quotazione Facebook' },
  { chi: 'jobs', d: '2007-01-09', luogo: [-122.42, 'America/Los_Angeles'], scopo: 'output', cosa: 'presentazione iPhone' },
  { chi: 'musk', d: '2002-07-08', luogo: [-121.89, 'America/Los_Angeles'], scopo: 'wealth', cosa: 'eBay compra PayPal (annuncio)' },
  { chi: 'musk', d: '2002-10-03', luogo: [-121.89, 'America/Los_Angeles'], scopo: 'wealth', cosa: 'eBay compra PayPal (chiusura)' },
];

function anno(N, nat, Y, lon, tz, scopo) {
  const out = [];
  for (let t = Date.UTC(Y, 0, 1); t < Date.UTC(Y + 1, 0, 1); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10), g = giorno(N, nat, d, lon, tz, scopo);
    if (g) out.push(g);
  }
  return out;
}
function rango(all, d) {
  const me = all.find(x => x.date === d), sopra = all.filter(x => x.tot > me.tot).length, pari = all.filter(x => x.tot === me.tot).length;
  return { me, rank: sopra + (pari + 1) / 2, n: all.length, sopra, pari };
}
const fmt = (L, nome) => `${nome} ${L.hexN} l${L.line} ${L.b} ${L.r}  rel ${L.rs >= 0 ? '+' : ''}${L.rs}  tempo ${L.tm.t >= 0 ? '+' : ''}${L.tm.t} [${L.tm.note.join(' ')}]  testo ${L.s}→${L.txt}  = ${L.tot}`;

module.exports = { giorno, anno, rango, NASCITE, EVENTI, SCOPI, natal, pillars };
if (require.main === module) {
  const det = process.argv.includes('dettaglio'), riep = [];
  for (const e of EVENTI) {
    const b = NASCITE[e.chi], Pn = pillars(...b), N = natal('A', Pn, true), nat = { day: Pn.day, year: N.pillars[3] };
    const Y = +e.d.slice(0, 4), righe = {};
    for (const sc of Object.keys(SCOPI)) { const r = rango(anno(N, nat, Y, e.luogo[0], e.luogo[1], sc), e.d); righe[sc] = r; }
    const r = righe[e.scopo], g = r.me;
    console.log(`\n## ${e.chi} ${e.d} ${e.cosa} — età ${g.p.age}, persona ${g.pers}, scopo ${e.scopo}`);
    console.log(`   pilastri ${g.Pe.day} ${g.Pe.month} ${g.Pe.year}; rango ${r.rank}/${r.n} (percentile ${(100 * r.rank / r.n).toFixed(0)}), totale ${g.tot}`);
    console.log('   altri scopi: ' + Object.keys(SCOPI).map(k => `${k} ${righe[k].rank}`).join(' · '));
    if (det) { console.log('   ' + fmt(g.c, 'ciclo  ')); console.log('   ' + fmt(g.a, 'annuale')); console.log('   ' + fmt(g.d, 'giorno ')); }
    riep.push({ e, pct: r.rank / r.n, righe });
  }
  const m = riep.reduce((s, x) => s + x.pct, 0) / riep.length;
  console.log(`\nPercentile medio (scopo giusto): ${(100 * m).toFixed(0)} (atteso per caso 50)`);
}

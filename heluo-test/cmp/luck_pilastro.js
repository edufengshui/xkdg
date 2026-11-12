// HLLS — da quale pilastro si calcolano Heaven Luck ed Earth Luck? (domanda di Edu, 12/11/2026)
// Oggi: Heaven = stelo dell'ANNO con il Na Jia, Earth = ramo dell'ANNO (tabella Time 1). Qui si provano anche
// mese, giorno e ora. La Fame (stagione) non dipende dal pilastro e resta fuori.
// Prova 1 (natale): quante Luck stanno nei nativi (XT, HT, i loro Hu) di persone famose, contro un controllo in cui le
//   Luck vengono dal pilastro di un'altra persona a caso (stessa distribuzione dei trigrammi).
// Prova 2 (tempo): nell'anno di ogni evento, punteggio Luck = Luck portata dal ramo della linea del ciclo, dal ramo
//   della linea mossa dell'annuale e dal ramo dell'anno (+1 ciascuno), Luck nei trigrammi dell'annuale (+1),
//   opposto nei trigrammi dell'annuale (−1) (opposti solo come trigrammi, regola di Edu del 10/11).
//   Confronto: eventi positivi contro negativi, e positivi contro 25 date a caso della stessa vita.
// Uso: node luck_pilastro.js   (metodo A, come l'app); LK=heaven o LK=earth per una Luck sola nella prova 2
'use strict';
const fs = require('fs'), path = require('path');
const { natal, predict, pillars } = require('./heluo_cmp.js');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const H = global.XKDGHeluo, DIR = path.join(__dirname, '..');

const ST = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥';
const NAJIA = ['Qian', 'Kun', 'Gen', 'Dui', 'Kan', 'Li', 'Zhen', 'Xun', 'Qian', 'Kun'];
const BR_TRI = ['Kan', 'Gen', 'Gen', 'Zhen', 'Xun', 'Xun', 'Li', 'Kun', 'Kun', 'Dui', 'Qian', 'Qian'];
const OPP = { Qian: 'Kun', Kun: 'Qian', Zhen: 'Xun', Xun: 'Zhen', Kan: 'Li', Li: 'Kan', Gen: 'Dui', Dui: 'Gen' };
const brTri = b => BR_TRI[BR.indexOf(b)];
const TRI = {}; for (const n in NJ) TRI[n] = [NJ[n].upper, NJ[n].lower];
const VAR = { anno: 3, mese: 2, giorno: 1, ora: 0 }; // indice in N.pillars = [ora, giorno, mese, anno]

// ---- persone ----------------------------------------------------------------------------------
const TZ_FIX = { 'Adolf Hitler': 'LMT', 'Charles de Gaulle': 'LMT', 'Martin Luther King Jr.': 'UTC-6',
  'Albert Einstein': 'LMT', 'Marie Curie': 'LMT', 'Sigmund Freud': 'LMT', 'Pablo Picasso': 'LMT', 'Vincent van Gogh': 'LMT', 'Madonna': 'UTC-5' };
const people = [], seen = new Set();
function add(x) { const k = x.birth.date + ' ' + x.birth.time; if (seen.has(k)) return; seen.add(k); people.push(x); }
for (const f of ['famous_politics.json', 'famous_arts.json', 'famous_violent.json'])
  JSON.parse(fs.readFileSync(path.join(DIR, f))).people.forEach(x => add({ name: x.name, sex: x.sex, birth: { date: x.birth.date, time: x.birth.time, lon: x.birth.lon, tz: TZ_FIX[x.name] || x.birth.tz },
    events: x.events.map(e => ({ date: e.date, time: e.time, pol: e.polarity })) }));
for (let g = 1; g <= 6; g++) JSON.parse(fs.readFileSync(path.join(DIR, 'new', 'g' + g + '.json'))).forEach(x => {
  const b = x.birth, tz = b.lmt ? 'LMT' : 'UTC' + (b.utcOffset >= 0 ? '+' : '') + b.utcOffset;
  add({ name: x.name, sex: x.sex, birth: { date: b.date, time: b.time, lon: b.lon, tz }, events: x.events.map(e => ({ date: e.date, time: e.time, pol: e.pol })) });
});

let seed = 4242; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;

function lucks(N, v) { const p = N.pillars[VAR[v]]; return { heaven: NAJIA[ST.indexOf(p[0])], earth: BR_TRI[BR.indexOf(p[1])] }; }
function natT(N) { const h = (L) => H.huGua ? H.huGua(L) : null;
  const t = [N.xt.upper, N.xt.lower, N.ht.hex.upper, N.ht.hex.lower];
  for (const L of [N.xt.lines, N.ht.hex.lines]) { const u = H.hexOf([L[1], L[2], L[3]].concat([L[2], L[3], L[4]])); t.push(u.upper, u.lower); }
  return t; }
function score(N, x, Pe, Lk) {
  if (x.none) return null;
  const cyc = x.phase === 'XT' ? N.xt : N.ht.hex, per = x.id.cycle[1], ann = x.id.year[0], mv = x.id.year[1];
  const bC = NJ[cyc.n].lines[per - 1].branch, bA = NJ[ann].lines[mv - 1].branch, bY = Pe.year[1];
  let s = 0;
  for (const k of (process.env.LK ? [process.env.LK] : ['heaven', 'earth'])) {
    const t = Lk[k];
    [bC, bA, bY].forEach(b => { if (brTri(b) === t) s += 1; });
    TRI[ann].forEach(u => { if (u === t) s += 1; if (u === OPP[t]) s -= 1; });
  }
  return s;
}

const rows = []; // { v, pol, s, who }
const nat = { anno: [], mese: [], giorno: [], ora: [] }, Ns = [];
for (const pe of people) {
  const b = pe.birth, male = pe.sex === 'M';
  let P, N; try { P = pillars(b.date, b.time, b.lon, b.tz); N = natal("A", P, male); } catch (e) { console.log("salto", pe.name, e.message); continue; }
  Ns.push(N);
  const T = natT(N);
  for (const v in VAR) { const L = lucks(N, v); nat[v].push(['heaven', 'earth'].filter(k => T.includes(L[k])).length); }
  const ctrl = [];
  const last = pe.events.reduce((a, e) => e.date > a ? e.date : a, b.date);
  const t0 = Date.parse(b.date) + 400 * 864e5, t1 = Date.parse(last);
  for (let i = 0; i < 25 && t1 > t0; i++) ctrl.push({ date: new Date(t0 + rnd() * (t1 - t0)).toISOString().slice(0, 10), time: '12:00', pol: 'c' });
  for (const ev of pe.events.concat(ctrl)) {
    if (ev.date <= b.date || !/^[+\-c]$/.test(ev.pol || '')) continue;
    const Pe = pillars(ev.date, ev.time, b.lon, b.tz), x = predict(N, Pe, b.lon);
    for (const v in VAR) { const s = score(N, x, Pe, lucks(N, v)); if (s !== null) rows.push({ v, pol: ev.pol, s, who: pe.name }); }
  }
}

// ---- prova 1: nativi ----------------------------------------------------------------------------
console.log('Persone', Ns.length);
console.log('\nPROVA 1 — Luck (Heaven + Earth) nei nativi XT, HT e loro Hu');
console.log('pilastro   media reale   media controllo   % reale ≥ controllo (permutazioni)');
for (const v in VAR) {
  const real = mean(nat[v]); const R = 2000; let ge = 0, cm = [];
  for (let r = 0; r < R; r++) { // Luck prese dal pilastro di un'altra persona a caso
    const sh = Ns.map(() => Ns[Math.floor(rnd() * Ns.length)]);
    const m = mean(Ns.map((N, i) => { const T = natT(N), L = lucks(sh[i], v); return ['heaven', 'earth'].filter(k => T.includes(L[k])).length; }));
    cm.push(m); if (m >= real) ge++;
  }
  console.log(v.padEnd(10), real.toFixed(3).padStart(8), mean(cm).toFixed(3).padStart(14), '   p =', ((ge + 1) / (R + 1)).toFixed(3));
}

// ---- prova 2: anni degli eventi -------------------------------------------------------------------
function perm(a, b) { const D = mean(a) - mean(b), all = a.concat(b); let ge = 0; const R = 5000;
  for (let r = 0; r < R; r++) { const s = all.slice(); for (let j = s.length - 1; j > 0; j--) { const q = Math.floor(rnd() * (j + 1)); [s[j], s[q]] = [s[q], s[j]]; }
    if (mean(s.slice(0, a.length)) - mean(s.slice(a.length)) >= D) ge++; }
  return { D, p: (ge + 1) / (R + 1) }; }
console.log('\nPROVA 2 — punteggio Luck nell\'anno dell\'evento');
console.log('pilastro   positivi  negativi  date a caso   pos−neg (p)        pos−caso (p)');
for (const v in VAR) {
  const g = pol => rows.filter(r => r.v === v && r.pol === pol).map(r => r.s);
  const P = g('+'), Q = g('-'), C = g('c'), a = perm(P, Q), c = perm(P, C);
  console.log(v.padEnd(10), (mean(P).toFixed(2) + ' (' + P.length + ')').padStart(9), (mean(Q).toFixed(2) + ' (' + Q.length + ')').padStart(9), (mean(C).toFixed(2) + ' (' + C.length + ')').padStart(12),
    ('  ' + (a.D >= 0 ? '+' : '') + a.D.toFixed(2) + ' (' + a.p.toFixed(3) + ')').padEnd(19), (c.D >= 0 ? '+' : '') + c.D.toFixed(2) + ' (' + c.p.toFixed(3) + ')');
}

// HLLS — Date Selection a cascata (9/11/2026).
// Per ogni giorno: linea del ciclo (XT/HT) → linea mossa dell'annuale → mensile con la linea del giorno.
// Ogni linea: relazione sulla persona pesata secondo lo scopo + giudizio sul tempo (anno, mese, giorno)
// + testo (scores.json, −2…+2) spostato di ±1 verso la versione scelta dal tempo.
// Uso: node ds_cascata.js            → prova sugli eventi noti
//      node ds_cascata.js dettaglio  → anche la scheda della cascata per ogni evento
//      node ds_cascata.js luck       → aggiunge le tre Luck (Edu, 10/11): per annuale, mensile, blocco ed esagramma del
//                                      giorno, +0,5 per ogni Luck (Heaven, Earth, Fame) il cui trigramma c'è, −0,5 per ogni opposto
//      node ds_cascata.js luck2      → tre Luck complete (luck.js, punto 4c): Luck del nativo attivate dai rami del tempo,
//                                      rami delle linee attive, trigrammi degli esagrammi del tempo; pesi per livello
//                                      (giorno al primo posto) × bilancio yin/yang × timeliness nel mese di nascita
//      node ds_cascata.js esagiorno  → livello del giorno sulla linea dell'esagramma del giorno invece che del blocco
// Linea del giorno (10/11/2026): regola di Edu del Signore del Blocco (predict in heluo_cmp.js, dailyHex nell'app);
// di default il livello del giorno è la linea del giorno nell'esagramma del blocco.
'use strict';
const path = require('path');
const { natal, predict, pillars } = require('./heluo_cmp.js');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const SC = require('./scores.json');
const LK2 = require('./luck.js');
const FORZA = process.argv.includes('forza'), NOWANG = process.argv.includes('nowang');
// massimo della forza (旺): l'elemento nella sua stagione; la Terra nei mesi 辰未戌丑
const wang = (el, mb) => el === 'Earth' ? '辰未戌丑'.includes(mb) : ({ 寅: 'Wood', 卯: 'Wood', 巳: 'Fire', 午: 'Fire', 申: 'Metal', 酉: 'Metal', 亥: 'Water', 子: 'Water' })[mb] === el;

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

// Regole di Edu (11/11/2026, discutendo la quotazione Microsoft), attive di default; HL_TEMPO=vecchio le spegne:
// 1) trigono direzionale (HL_TEMPO=sanhui) (三會: 寅卯辰 Legno, 巳午未 Fuoco, 申酉戌 Metallo, 亥子丑 Acqua): se il ramo della linea
//    completa il trigono con i rami di anno, mese, giorno, la linea si trasforma nell'elemento del trigono (relazione
//    sulla persona compresa) ed è molto forte (+1); i rami del trigono non la controllano più.
// 3) controllo dal ramo che è la relazione dello scopo (HL_TEMPO=scopo): in un evento di Wealth la Wealth dell'anno, del
//    mese o del giorno che controlla la linea non è una penalità (es. Legno = Wealth che controlla 辰 Parent).
// 4) linea del mese (HL_TEMPO=mese): la linea k dell'annuale che governa il mese entra nel punteggio come livello a sé,
//    letta nell'esagramma mensile (mesi 2k−1 e 2k).
// 2) vuoto riempito (HL_TEMPO=pieno): un ramo vuoto nel natale esce dal vuoto nel giorno con lo stesso ramo (填實).
const SANHUI = { Wood: '寅卯辰', Fire: '巳午未', Metal: '申酉戌', Water: '亥子丑' };
const nuove = k => { const v = process.env.HL_TEMPO; return !v || v.split(',').includes(k); }; // HL_TEMPO=sanhui / pieno: una sola
function sanhui(b, T) {
  if (!nuove('sanhui')) return null;
  const have = b + T.y + T.m + T.d;
  for (const el of Object.keys(SANHUI)) if (SANHUI[el].includes(b) && [...SANHUI[el]].every(x => have.includes(x))) return el;
  return null;
}
// giudizio sul tempo del ramo b: anno, mese, giorno
function tempo(b, T, natVoids, favEl) {
  const sh = sanhui(b, T), el = sh || BR_EL[b], note = [];
  let t = 0;
  if (sh) { t += 1; note.push('三會 ' + sh); }
  if (timely(el, T.m)) { t += 1; note.push('timely'); }
  for (const [k, x] of [['a', T.y], ['m', T.m], ['g', T.d]]) {
    if (x === b) { t += 1; note.push('=' + k); }
    else if (sh && SANHUI[sh].includes(x)) { /* stesso trigono: alleato */ }
    else if (LIUHE[b] === x) { t += 1; note.push('六合' + k); }
    else if (clash(b) === x) {
      // opzione forza (Edu, 10/11): nello scontro conta chi è più forte; linea timely contro un ramo non timely non si rompe
      // regola di Edu (10/11): un elemento al massimo della forza (旺, nella sua stagione) scontrato da un ramo non timely
      // non si rompe: lo scontro lo eccita ancora di più (+1). Opzione 'forza' (vecchia prova): solo niente penalità se timely.
      if (!NOWANG && wang(el, T.m) && !timely(BR_EL[x], T.m)) { t += 1; note.push('冲' + k + '(eccita)'); }
      else if (FORZA && timely(el, T.m) && !timely(BR_EL[x], T.m)) note.push('冲' + k + '(regge)');
      else { t -= 2; note.push('冲' + k); } }
    else if (SANHE.some(s => s.includes(b) && s.includes(x))) { t += 0.5; note.push('三合' + k); }
    const forte = (!NOWANG && wang(el, T.m)) || (FORZA && timely(el, T.m));
    if (x !== b && CTRL[BR_EL[x]] === el && !(forte && !timely(BR_EL[x], T.m))) {
      if (favEl && nuove('scopo') && BR_EL[x] === favEl) note.push('剋' + k + '(scopo)'); else { t -= 0.5; note.push('剋' + k); } }
  }
  if (natVoids.includes(b) && !timely(el, T.m)) {
    if (nuove('pieno') && b === T.d) note.push('空 riempito'); else { t -= 1; note.push('空'); } }
  return { t, note };
}

function livello(hexN, line, pers, scopo, T, natVoids) {
  const favEl = Object.keys(GEN).find(e => SCOPI[scopo][rel(pers, e)] === 2);
  const L = NJ[hexN].lines[line - 1], sh = sanhui(L.branch, T), r = rel(pers, sh || L.el), tm = tempo(L.branch, T, natVoids, favEl);
  const s = SC[hexN].lines[line].s, V = Math.sign(tm.t), txt = Math.max(-2, Math.min(2, s + V));
  return { hexN, line, b: L.branch, el: L.el, r, rs: SCOPI[scopo][r], tm, s, V, txt, tot: SCOPI[scopo][r] + tm.t + txt };
}

function persona(hx, line) {
  const u = TRI_EL[hx.upper], l = TRI_EL[hx.lower];
  return u === l ? u : (line <= 3 ? l : u);
}

// Tre Luck (Heaven = stelo dell'anno, Earth = ramo dell'anno, Fame = stagione): dall'app (fromPillars).luck
const H_ = global.XKDGHeluo, TRI_OF = {};
for (const u of Object.keys(TRI_EL)) for (const l of Object.keys(TRI_EL)) { const h = H_.hexFrom(u, l); TRI_OF[h.n] = [h.upper, h.lower]; }
function luckHex(n, LK) {
  const t = TRI_OF[n]; let v = 0; const w = [];
  for (const k of ['heaven', 'earth', 'fame']) {
    if (t.includes(LK[k])) { v += 0.5; w.push('+' + k[0].toUpperCase()); }
    if (t.includes(LK.opposite[k])) { v -= 0.5; w.push('−' + k[0].toUpperCase()); }
  }
  return { v, w };
}
function luckTot(p, LK) {
  const L = { a: luckHex(p.id.year[0], LK), m: luckHex(p.id.month[0], LK), b: luckHex(p.id.lord[0], LK), g: luckHex(p.id.dayHex[0], LK) };
  L.tot = L.a.v + L.m.v + L.b.v + L.g.v; return L;
}

function giorno(N, nat, date, lon, tz, scopo) {
  const Pe = pillars(date, '12:00', lon, tz), p = predict(N, Pe, lon);
  if (p.none) return null;
  const hx = p.phase === 'XT' ? N.xt : N.ht.hex, pers = persona(hx, p.id.cycle[1]);
  const T = { y: Pe.year[1], m: Pe.month[1], d: Pe.day[1] };
  const nv = voids(nat.day); // Edu, 11/11/2026: voids from the day pillar only
  const c = livello(p.id.cycle[0], p.id.cycle[1], pers, scopo, T, nv);
  const a = livello(p.id.year[0], p.id.year[1], pers, scopo, T, nv);
  const dd = process.argv.includes('esagiorno') ? p.id.dayHex : p.id.day, d = livello(dd[0], dd[1], pers, scopo, T, nv);
  const m = nuove('mese') ? livello(p.id.month[0], Math.ceil(p.mIndex / 2), pers, scopo, T, nv) : null;
  // 5) testo secondario (Edu, 11/11/2026): la stessa linea nell'esagramma del giorno (esito) entra nel punteggio
  //    con peso SEC (HL_SEC, default 0.5); il testo primario è la linea nell'esagramma del blocco (causa, azione).
  const SEC = process.env.HL_SEC !== undefined ? +process.env.HL_SEC : 0.5;
  const sd = SEC ? livello(p.id.dayHex[0], p.id.dayHex[1], pers, scopo, T, nv) : null;
  const L = nat.luck ? luckTot(p, nat.luck) : null, useL = process.argv.includes('luck') && L;
  const L2 = nat.prof ? LK2.giorno(nat.prof, p, T) : null, useL2 = process.argv.includes('luck2') && L2;
  return { date, Pe, p, pers, c, a, m, d, L, L2, sd, tot: c.tot + a.tot + (m ? m.tot : 0) + d.tot + (sd ? SEC * sd.tot : 0) + (useL ? L.tot : 0) + (useL2 ? L2.tot : 0) };
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
    const b = NASCITE[e.chi], Pn = pillars(...b), N = natal('A', Pn, true), nat = { day: Pn.day, year: N.pillars[3], luck: H_.fromPillars(Pn, true).luck, prof: LK2.profilo(Pn, true) };
    const Y = +e.d.slice(0, 4), righe = {};
    for (const sc of Object.keys(SCOPI)) { const r = rango(anno(N, nat, Y, e.luogo[0], e.luogo[1], sc), e.d); righe[sc] = r; }
    const r = righe[e.scopo], g = r.me;
    console.log(`\n## ${e.chi} ${e.d} ${e.cosa} — età ${g.p.age}, persona ${g.pers}, scopo ${e.scopo}`);
    console.log(`   pilastri ${g.Pe.day} ${g.Pe.month} ${g.Pe.year}; rango ${r.rank}/${r.n} (percentile ${(100 * r.rank / r.n).toFixed(0)}), totale ${g.tot}`);
    console.log('   altri scopi: ' + Object.keys(SCOPI).map(k => `${k} ${righe[k].rank}`).join(' · '));
    if (det) { console.log('   ' + fmt(g.c, 'ciclo  ')); console.log('   ' + fmt(g.a, 'annuale')); console.log('   ' + fmt(g.d, 'giorno '));
      const f = (x, n) => `${n} ${x.v >= 0 ? '+' : ''}${x.v} [${x.w.join(' ')}]`;
      console.log(`   luck    ${f(g.L.a, 'annuale ' + g.p.id.year[0])} · ${f(g.L.m, 'mensile ' + g.p.id.month[0])} · ${f(g.L.b, 'blocco ' + g.p.id.lord[0])} · ${f(g.L.g, 'giorno ' + g.p.id.dayHex[0])} = ${g.L.tot}`);
      console.log(`   luck2   ${g.L2.tot} [${g.L2.w.join(' · ')}]`); }
    riep.push({ e, pct: r.rank / r.n, righe });
  }
  const m = riep.reduce((s, x) => s + x.pct, 0) / riep.length;
  console.log(`\nPercentile medio (scopo giusto): ${(100 * m).toFixed(0)} (atteso per caso 50)`);
}

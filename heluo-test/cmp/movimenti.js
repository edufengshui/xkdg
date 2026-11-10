// HLLS — indicatori di movimento (idee di Edu, 10/11; regole punto 4d). Prova sugli anni di trasloco.
// Cavallo Postale (驛馬) dal ramo dell'anno e del giorno di nascita: 申子辰→寅, 寅午戌→申, 巳酉丑→亥, 亥卯未→巳.
// Per ogni anno di vita si guarda se un indicatore è presente; il confronto è con la frequenza dello stesso
// indicatore in tutti gli anni della stessa persona (atteso = traslochi × frequenza).
// Uso: node movimenti.js [dettaglio]
// I traslochi sono stati elencati da Claude (non vengono dalle slide): da verificare.
'use strict';
const { natal, predict, pillars } = require('./heluo_cmp.js');
const path = require('path');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.window = global; require(path.join(__dirname, '..', '..', 'heluo-texts.js'));
const TX = global.XKDG_HELUO_TEXTS, H = global.XKDGHeluo;
const BR = '子丑寅卯辰巳午未申酉戌亥';
const yiMa = b => ({ 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' })[b];
const clash = b => BR[(BR.indexOf(b) + 6) % 12];
const TRI = {};
for (const u of Object.keys(H.TRI_EL)) for (const l of Object.keys(H.TRI_EL)) { const h = H.hexFrom(u, l); TRI[h.n] = [h.upper, h.lower]; }

const PERS = {
  einstein: { b: ['1879-03-14', '11:30', 9.99, 'LMT'], m: true, to: 1955, mv: { 1880: 'Monaco', 1894: 'Italia', 1895: 'Aarau', 1896: 'Zurigo', 1902: 'Berna', 1909: 'Zurigo', 1911: 'Praga', 1912: 'Zurigo', 1914: 'Berlino', 1933: 'USA' } },
  gates: { b: ['1955-10-28', '22:00', -122.33, 'America/Los_Angeles'], m: true, to: 2026, mv: { 1973: 'Harvard', 1975: 'Albuquerque', 1979: 'Bellevue' } },
  jobs: { b: ['1955-02-24', '19:15', -122.42, 'America/Los_Angeles'], m: true, to: 2011, mv: { 1960: 'Mountain View', 1967: 'Los Altos', 1972: 'Reed College', 1974: 'India', 1984: 'Woodside', 1991: 'Palo Alto' } },
  zuckerberg: { b: ['1984-05-14', '14:39', -73.87, 'America/New_York'], m: true, to: 2026, mv: { 2000: 'Exeter', 2002: 'Harvard', 2004: 'Palo Alto' } },
  musk: { b: ['1971-06-28', '05:29', 28.19, 'Africa/Johannesburg'], m: true, to: 2026, mv: { 1989: 'Canada', 1992: 'Pennsylvania', 1995: 'California', 2002: 'Los Angeles', 2020: 'Texas' } },
  buffett: { b: ['1930-08-30', '11:00', -95.94, 'America/Chicago'], m: true, to: 2026, mv: { 1943: 'Washington', 1947: 'Filadelfia', 1949: 'Lincoln', 1950: 'New York', 1951: 'Omaha', 1954: 'New York', 1956: 'Omaha' } },
  rockefeller: { b: ['1839-07-08', '23:50', -76.18, 'LMT'], m: true, to: 1937, mv: { 1843: 'Moravia', 1850: 'Owego', 1853: 'Ohio', 1884: 'New York' } },
  diana: { b: ['1961-07-01', '19:45', 0.50, 'Europe/London'], m: false, to: 1997, mv: { 1975: 'Althorp', 1979: 'Londra', 1981: 'Kensington Palace' } },
};
const IND = [
  ['cYM', 'ciclo: ramo = Cavallo'], ['cCL', 'ciclo: ramo scontra il Cavallo'], ['cSoglia', 'ciclo: linea 4 o primo ciclo HT'], ['cAny', 'ciclo: uno dei tre'],
  ['aYM', 'annuale: linea mossa = Cavallo'], ['aCL', 'annuale: linea mossa scontra il Cavallo'], ['aNasc', 'annuale: nascosto = Cavallo o lo scontra'],
  ['yYM', 'ramo dell\'anno = Cavallo'], ['yCL', 'ramo dell\'anno scontra il Cavallo'], ['aXun', 'annuale con Xun'], ['aTesto', 'annuale 56/59 o 利涉大川 sulla linea mossa'],
];
const det = process.argv.includes('dettaglio');
const tot = {}; IND.forEach(([k]) => tot[k] = { oss: 0, att: 0, perP: {} });
let nMv = 0;
for (const [nome, d] of Object.entries(PERS)) {
  const P = pillars(...d.b), N = natal('A', P, d.m), YM = [yiMa(P.year[1]), yiMa(P.day[1])], CL = YM.map(clash);
  const y0 = +d.b[0].slice(0, 4), rows = [];
  for (let y = y0 + 1; y <= d.to; y++) {
    const Pe = pillars(y + '-07-01', '12:00', d.b[2], d.b[3]), p = predict(N, Pe, d.b[2]);
    if (p.none || !p.id) continue;
    const [ch, cl] = p.id.cycle, [a, l] = p.id.year, cb = NJ[ch].lines[cl - 1].branch, ln = NJ[a].lines[l - 1], fs = ln.fushen && ln.fushen.branch;
    const firstHT = p.phase === 'HT' && N.cHT[0] && p.age >= N.cHT[0].from && p.age <= N.cHT[0].to;
    const r = { y, age: p.age, mv: d.mv[y], cyc: ch + ' l' + cl + ' ' + cb, ann: a + ' l' + l + ' ' + ln.branch + (fs ? '(' + fs + ')' : ''), yb: Pe.year };
    r.cYM = YM.includes(cb); r.cCL = CL.includes(cb); r.cSoglia = cl === 4 || firstHT; r.cAny = r.cYM || r.cCL || r.cSoglia;
    r.aYM = YM.includes(ln.branch); r.aCL = CL.includes(ln.branch); r.aNasc = !!fs && (YM.includes(fs) || CL.includes(fs));
    r.yYM = YM.includes(Pe.year[1]); r.yCL = CL.includes(Pe.year[1]); r.aXun = TRI[a].includes('Xun');
    r.aTesto = a === 56 || a === 59 || /great water/i.test(JSON.stringify(TX[a].lines[l]));
    rows.push(r);
  }
  const mv = rows.filter(r => r.mv); nMv += mv.length;
  if (det) { console.log(`\n## ${nome} — Cavallo ${YM.join(' ')} (scontro ${CL.join(' ')}), ${mv.length} traslochi su ${rows.length} anni`);
    mv.forEach(r => console.log(`  ${r.y} età ${r.age} ${r.mv.padEnd(14)} ciclo ${r.cyc.padEnd(9)} ann ${r.ann.padEnd(13)} anno ${r.yb}  ${IND.filter(([k]) => k !== 'cAny' && r[k]).map(([k]) => k).join(' ')}`)); }
  for (const [k] of IND) { const f = rows.filter(r => r[k]).length / rows.length, o = mv.filter(r => r[k]).length;
    tot[k].oss += o; tot[k].att += mv.length * f; tot[k].perP[nome] = [o, mv.length * f]; }
}
console.log(`\nTraslochi in tutto: ${nMv}. Osservati contro attesi (attesi = frequenza dell'indicatore negli anni della stessa persona):`);
for (const [k, lab] of IND) { const t = tot[k], se = t['perP'].einstein;
  console.log(`  ${lab.padEnd(46)} ${String(t.oss).padStart(2)} contro ${t.att.toFixed(1).padStart(4)}   (senza Einstein: ${t.oss - se[0]} contro ${(t.att - se[1]).toFixed(1)})`); }

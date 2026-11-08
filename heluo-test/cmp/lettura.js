// Lettura di Edu su Diana (sessione 45) trasformata in 3 indicatori fissati PRIMA di guardare gli altri eventi:
// I1 ciclo: linea del periodo 6/9 anni = Officer-Ghost (官鬼) e il ramo dell'anno la punisce (刑) o la colpisce (冲)
// I2 annuale: linea mossa annuale in clash (冲) col ramo del mese
// I3 mensile: il ramo del giorno è uguale al ramo di una linea Officer-Ghost dell'esagramma mensile
// Confronto: quanti indicatori (0-3) hanno i violenti rispetto ai successi. Diana esclusa.
'use strict';
const { Solar } = require('lunar-javascript');
const NAJIA = require('../../heluo-najia.js');
const { rows } = require('./rows.json');
const BR = '子丑寅卯辰巳午未申酉戌亥';
const clash = (a, b) => (BR.indexOf(a) - BR.indexOf(b) + 12) % 12 === 6;
const XING = { 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 子: '卯', 卯: '子', 辰: '辰', 午: '午', 酉: '酉', 亥: '亥' }; // a punisce XING[a]
const hits = (a, b) => clash(a, b) || XING[a] === b; // a (data) colpisce b (linea)
const lunar = d => { const [y, m, dd] = d.split('-').map(Number); return Solar.fromYmdHms(y, m, dd, 12, 0, 0).getLunar(); };
function ind(r, m) {
  const p = r[m]; if (p.none) return null;
  const L = lunar(r.date), yB = L.getYearZhiByLiChun(), mB = L.getMonthZhiExact(), dB = L.getDayZhiExact();
  const cyc = NAJIA[p.id.cycle[0]].lines[p.id.cycle[1] - 1];
  const I1 = cyc.rel === 'G' && hits(yB, cyc.branch);
  const I2 = clash(NAJIA[p.id.year[0]].lines[p.id.year[1] - 1].branch, mB);
  const I3 = NAJIA[p.id.month[0]].lines.some(l => l.rel === 'G' && l.branch === dB);
  return [I1, I2, I3].map(Number);
}
const di = rows.find(r => r.name.startsWith('Diana') && r.date === '1997-08-31');
console.log('Diana 31/8/1997  A:', ind(di, 'A'), ' C:', ind(di, 'C'));
const V1 = [5,29,38,70,91,107,108,111,117,124,134,147,153,155,159,166,167,173,184,185,194,243,270,278,292,311,313,315,316,322];
const viol = new Set(V1.map(i => rows[i]).concat(rows.filter(r => r.src === 'famous_violent.json' && r.violent && !r.weak)));
const use = rows.filter(r => !r.name.startsWith('Diana') && (r.src !== 'famous_violent.json' || !r.weak));
let seed = 3; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const perm = (v, p) => { const D = mean(v) - mean(p), all = v.concat(p); let ge = 0;
  for (let k = 0; k < 20000; k++) { const s = all.slice(); for (let j = s.length - 1; j > 0; j--) { const q = Math.floor(rnd() * (j + 1)); [s[j], s[q]] = [s[q], s[j]]; }
    if (mean(s.slice(0, v.length)) - mean(s.slice(v.length)) >= D) ge++; } return (ge + 1) / 20001; };
const pc = a => Math.round(100 * mean(a)) + '%';
for (const m of ['A', 'C']) {
  const V = [], P = [];
  for (const r of use) { const x = ind(r, m); if (!x) continue; if (viol.has(r)) V.push(x); else if (r.pol === '+') P.push(x); }
  console.log('\nMetodo ' + m + (m === 'A' ? ' (B quasi identico)' : '') + ' — ' + V.length + ' violenti, ' + P.length + ' successi');
  ['I1 ciclo Ufficiale colpito dall\'anno', 'I2 linea annuale in clash col mese', 'I3 giorno = ramo Ufficiale del mensile'].forEach((n, k) =>
    console.log('  ' + n.padEnd(40), 'violenti', pc(V.map(x => x[k])).padStart(4), '  successi', pc(P.map(x => x[k])).padStart(4), '  p', perm(V.map(x => x[k]), P.map(x => x[k])).toFixed(3)));
  const sv = V.map(x => x[0] + x[1] + x[2]), sp = P.map(x => x[0] + x[1] + x[2]);
  for (const t of [1, 2, 3]) console.log('  almeno ' + t + ' indicatori'.padEnd(33), 'violenti', pc(sv.map(s => +(s >= t))).padStart(4), '  successi', pc(sp.map(s => +(s >= t))).padStart(4));
  console.log('  media indicatori: violenti', mean(sv).toFixed(2), ' successi', mean(sp).toFixed(2), ' p', perm(sv, sp).toFixed(3));
}

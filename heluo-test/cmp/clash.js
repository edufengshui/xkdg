// Regola di Edu (sessione 45): la linea annuale mossa, col ramo Na Jia (Jing Fang), in clash col ramo del mese dell'evento
// → la lettura favorevole decade. Test: frequenza del clash su violenti vs positivi, e punteggio corretto.
'use strict';
require('./heluo_cmp.js');
const H = Object.values(global).find(v => v && typeof v === 'object' && v.monthlyHex);
const { Solar } = require('lunar-javascript');
const { rows } = require('./rows.json');
const BR = '子丑寅卯辰巳午未申酉戌亥';
const NJ = { Qian: ['子寅辰', '午申戌'], Kun: ['未巳卯', '丑亥酉'], Zhen: ['子寅辰', '午申戌'], Xun: ['丑亥酉', '未巳卯'],
  Kan: ['寅辰午', '申戌子'], Li: ['卯丑亥', '酉未巳'], Gen: ['辰午申', '戌子寅'], Dui: ['巳卯丑', '亥酉未'] };
const HEX = {}; for (let i = 0; i < 64; i++) { const l = [...Array(6)].map((_, j) => (i >> j) & 1), h = H.hexOf(l); HEX[h.n] = h; }
const NAJIA = require('../../heluo-najia.js');
const lineBr = (n, line) => NAJIA[n].lines[line - 1].branch;
const monthBr = d => { const [y, m, dd] = d.split('-').map(Number); return Solar.fromYmdHms(y, m, dd, 12, 0, 0).getLunar().getMonthZhiExact(); };
const clash = (a, b) => (BR.indexOf(a) - BR.indexOf(b) + 12) % 12 === 6;
// controllo con Diana
const di = rows.find(r => r.name.startsWith('Diana') && r.date === '1997-08-31');
console.log('Diana: linea', di.A.id.year, '→', lineBr(...di.A.id.year), '| mese', monthBr(di.date), '| clash', clash(lineBr(...di.A.id.year), monthBr(di.date)));
const V1 = [5,29,38,70,91,107,108,111,117,124,134,147,153,155,159,166,167,173,184,185,194,243,270,278,292,311,313,315,316,322];
const viol = new Set(V1.map(i => rows[i]).concat(rows.filter(r => r.src === 'famous_violent.json' && r.violent && !r.weak)));
const use = rows.filter(r => !r.name.startsWith('Diana') && (r.src !== 'famous_violent.json' || !r.weak));
let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function perm(v, p, R = 20000) { const D = mean(v) - mean(p), all = v.concat(p); let ge = 0;
  for (let k = 0; k < R; k++) { const s = all.slice(); for (let j = s.length - 1; j > 0; j--) { const q = Math.floor(rnd() * (j + 1)); [s[j], s[q]] = [s[q], s[j]]; }
    if (mean(s.slice(0, v.length)) - mean(s.slice(v.length)) >= D) ge++; } return (ge + 1) / (R + 1); }
console.log('\nmetodo  violenti con clash   positivi con clash   p (più clash nei violenti)   D punteggio annuale corretto (pos−viol)  p');
for (const m of ['A', 'B', 'C']) {
  const V = [], P = [], sv = [], sp = [];
  for (const r of use) { if (r[m].none) continue; const [n, l] = r[m].id.year, c = clash(lineBr(n, l), monthBr(r.date)) ? 1 : 0, s = c ? -Math.abs(r[m].s.year) : r[m].s.year;
    if (viol.has(r)) { V.push(c); sv.push(s); } else if (r.pol === '+') { P.push(c); sp.push(s); } }
  const p1 = perm(V, P), D = mean(sp) - mean(sv), p2 = perm(sp, sv);
  console.log(m.padEnd(7), (V.reduce((a, b) => a + b) + '/' + V.length + ' = ' + Math.round(100 * mean(V)) + '%').padEnd(20),
    (P.reduce((a, b) => a + b) + '/' + P.length + ' = ' + Math.round(100 * mean(P)) + '%').padEnd(20), p1.toFixed(3).padStart(8), D.toFixed(2).padStart(26), p2.toFixed(3).padStart(10));
}

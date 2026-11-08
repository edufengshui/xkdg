// Test eventi violenti, campione allargato (sessione 45).
// Usa rows.json prodotto da run.js. Vecchi violenti = indici V1 di violent.js (righe dei primi due file);
// nuovi violenti = righe di famous_violent.json con violent=true.
// Gruppi: VECCHI (30), NUOVI (replica indipendente), TUTTI. Confronto: violenti vs eventi positivi.
'use strict';
const fs = require('fs'), path = require('path');
const { rows } = require('./rows.json');
const V1 = [5,29,38,70,91,107,108,111,117,124,134,147,153,155,159,166,167,173,184,185,194,243,270,278,292,311,313,315,316,322];
const M = ['A', 'B', 'C'], LV = ['cycle', 'year', 'yearHex', 'month', 'day'];
const R = 20000, NTEST = M.length * LV.length, ALPHA = 0.05, BONF = ALPHA / NTEST;
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const oldV = V1.map(i => rows[i]);
oldV.forEach(r => { if (r.src === 'famous_violent.json') throw new Error('indici V1 spostati'); });
const LOOSE = process.env.LOOSE === '1'; // LOOSE=1 include anche le ore deboli (A da memoria, minuti tondi)
const okNew = r => r.src === 'famous_violent.json' && (LOOSE || !r.weak);
const newV = rows.filter(r => okNew(r) && r.violent);
console.log(LOOSE ? 'MODO LARGO: incluse ore deboli' : 'MODO STRETTO: escluse ore deboli');
const posOld = rows.filter(r => r.pol === '+' && r.src !== 'famous_violent.json');
const posNew = rows.filter(r => r.pol === '+' && okNew(r));
const posAll = posOld.concat(posNew);

function perm(v, p) { // one-sided: D = media pos − media viol > 0 (testo più favorevole sui positivi)
  const D = mean(p) - mean(v), all = p.concat(v); let ge = 0;
  for (let k = 0; k < R; k++) {
    const s = all.slice();
    for (let j = s.length - 1; j > 0; j--) { const q = Math.floor(rnd() * (j + 1)); [s[j], s[q]] = [s[q], s[j]]; }
    if (mean(s.slice(0, p.length)) - mean(s.slice(p.length)) >= D) ge++;
  }
  return { D, p: (ge + 1) / (R + 1) };
}
function holm(ps) { // Holm–Bonferroni: restituisce p corretti
  const o = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), out = Array(ps.length); let run = 0;
  o.forEach(([p, i], k) => { run = Math.max(run, Math.min(1, p * (ps.length - k))); out[i] = run; });
  return out;
}
const result = {};
function test(V, P, label) {
  const lines = [], ps = [];
  for (const m of M) for (const l of LV) {
    const v = V.filter(r => !r[m].none).map(r => r[m].s[l]), p = P.filter(r => !r[m].none).map(r => r[m].s[l]);
    const t = perm(v, p);
    lines.push({ k: m + '.' + l, nv: v.length, np: p.length, mv: mean(v), mp: mean(p), D: t.D, p: t.p,
      sfav: Math.round(100 * v.filter(x => x < 0).length / v.length), fav: Math.round(100 * v.filter(x => x > 0).length / v.length) });
    ps.push(t.p);
  }
  holm(ps).forEach((h, i) => lines[i].pHolm = h);
  result[label] = lines;
  console.log('\n' + label + ' — ' + V.length + ' violenti vs ' + P.length + ' positivi (soglia Bonferroni ' + BONF.toFixed(4) + ')');
  console.log('livello      media viol  media pos   D      p      p Holm  %sfav viol %fav viol');
  for (const x of lines) console.log(x.k.padEnd(12), x.mv.toFixed(2).padStart(8), x.mp.toFixed(2).padStart(10), x.D.toFixed(2).padStart(7),
    x.p.toFixed(4).padStart(8), x.pHolm.toFixed(3).padStart(7), (x.sfav + '%').padStart(9), (x.fav + '%').padStart(9), x.p < BONF ? ' *' : '');
}
test(oldV, posOld, 'VECCHI');
test(newV, posAll, 'NUOVI (replica)');
test(newV, posNew, 'NUOVI vs trionfi nuovi');
test(oldV.concat(newV), posAll, 'TUTTI');

// Replica pre-dichiarata: le due ipotesi nate dal primo test (C.yearHex, C.cycle) sui soli eventi nuovi
const rep = result['NUOVI (replica)'].filter(x => x.k === 'C.yearHex' || x.k === 'C.cycle');
console.log('\nREPLICA ipotesi del primo test (soglia 0.05/2 = 0.025):');
rep.forEach(x => console.log(' ', x.k, 'D', x.D.toFixed(2), 'p', x.p.toFixed(4), x.p < 0.025 ? 'CONFERMATA' : 'non confermata'));

// Dettaglio evento per evento
const q = s => '"' + String(s).replace(/"/g, '""') + '"';
const det = [['gruppo', 'persona', 'data', 'evento'].concat(...M.map(m => LV.map(l => m + '.' + l)))];
for (const [g, V] of [['vecchio', oldV], ['nuovo', newV]]) for (const r of V)
  det.push([g, r.name, r.date, r.what].concat(...M.map(m => LV.map(l => r[m].none ? '' : r[m].s[l]))));
fs.writeFileSync(path.join(__dirname, LOOSE ? 'violent2_dettaglio_largo.csv' : 'violent2_dettaglio.csv'), det.map(r => r.map(q).join(',')).join('\n'));
fs.writeFileSync(path.join(__dirname, LOOSE ? 'violent2_summary_largo.json' : 'violent2_summary.json'), JSON.stringify(result, null, 1));

// HLLS milionari — per ogni anno: persona (elemento), Wealth visibile nell'annuale (trigrammi o Hu Gua),
// Wealth nascosto (伏神 W del nativo) attivato dal ramo dell'anno (stesso ramo, scontro, 六合, 三合).
// Uso: node milionari.js [nome]   (metodo A)
'use strict';
const path = require('path');
const { natal, pillars } = require('./heluo_cmp.js');
const H = global.XKDGHeluo, NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const BR = '子丑寅卯辰巳午未申酉戌亥';
const TRI_EL = { Qian: 'Metal', Dui: 'Metal', Li: 'Fire', Zhen: 'Wood', Xun: 'Wood', Kan: 'Water', Gen: 'Earth', Kun: 'Earth' };
const CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' }; // io controllo = Wealth
const LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const SANHE = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
const clash = b => BR[(BR.indexOf(b) + 6) % 12];
function activ(hb, yb) {
  if (hb === yb) return 'ramo';
  if (clash(hb) === yb) return 'scontro';
  if (LIUHE[hb] === yb) return '六合';
  if (SANHE.some(s => s.includes(hb) && s.includes(yb))) return '三合';
  return null;
}
const huGua = l => H.hexOf([l[1], l[2], l[3], l[2], l[3], l[4]]);

const P = {
  rockefeller: { b: ['1839-07-08', '23:50', -76.18, 'LMT'], to: 1937 },
  gates: { b: ['1955-10-28', '22:00', -122.33, 'America/Los_Angeles'], to: 2026 },
  jobs: { b: ['1955-02-24', '19:15', -122.42, 'America/Los_Angeles'], to: 2011 },
  zuckerberg: { b: ['1984-05-14', '14:39', -73.87, 'America/New_York'], to: 2026 },
  buffett: { b: ['1930-08-30', '11:00', -95.94, 'America/Chicago'], to: 2026 },
  slim: { b: ['1940-01-28', '23:00', -99.13, 'America/Mexico_City'], to: 2026 },
};

function run(key) {
  const p = P[key], Pn = pillars(...p.b), N = natal('A', Pn, true);
  const out = { key, pillars: N.pillars, xt: N.xt.n + ' ' + N.xt.upper + '/' + N.xt.lower + ' l' + N.mv, ht: N.ht.hex.n + ' ' + N.ht.hex.upper + '/' + N.ht.hex.lower + ' l' + N.ht.line,
    cycles: N.cXT.concat(N.cHT).map(c => c.line + ':' + c.from + '-' + c.to), year0: N.year0, rows: [] };
  for (let Y = N.year0; Y <= p.to; Y++) {
    const age = Y - N.year0 + 1;
    let per = null, hx = null, ph = null;
    N.cXT.forEach(c => { if (age >= c.from && age <= c.to) { per = c; hx = N.xt; ph = 'XT'; } });
    if (!per) N.cHT.forEach(c => { if (age >= c.from && age <= c.to) { per = c; hx = N.ht.hex; ph = 'HT'; } });
    if (!per) { out.rows.push({ Y, age, none: true }); continue; }
    const k = age - per.from + 1, a = H.annualHex(hx.lines, per.line, k, (N.year0 + per.from - 1) % 2 === 0);
    const tri = per.line <= 3 ? hx.lower : hx.upper;
    const els = new Set([TRI_EL[hx.upper], TRI_EL[hx.lower]]);
    const pers = els.size === 1 ? TRI_EL[hx.upper] : TRI_EL[tri], W = CTRL[pers];
    const hu = huGua(a.hex.lines);
    const vis = [a.hex.upper, a.hex.lower].filter(t => TRI_EL[t] === W);
    const visHu = [hu.upper, hu.lower].filter(t => TRI_EL[t] === W);
    const yb = BR[((Y - 4) % 12 + 12) % 12];
    const hidden = NJ[hx.n].lines.filter(L => L.fushen && L.fushen.rel === 'W').map(L => ({ b: L.fushen.branch, pos: L.pos, act: activ(L.fushen.branch, yb) }));
    const najiaW = NJ[a.hex.n].lines.filter(L => L.el === W).map(L => L.pos + L.branch);
    out.rows.push({ Y, age, ph, line: per.line, pers, W, ann: a.hex.n + ' ' + a.hex.upper + '/' + a.hex.lower + ' l' + a.moved,
      hu: hu.n + ' ' + hu.upper + '/' + hu.lower, vis: vis.length ? 'diretto' : visHu.length ? 'Hu' : '', yb,
      hid: hidden.filter(h => h.act).map(h => h.b + '(l' + h.pos + ') ' + h.act).join(', '), hidAll: hidden.map(h => h.b + ' l' + h.pos).join(','), najiaW: najiaW.join(' ') });
  }
  return out;
}
module.exports = { run, P };
if (require.main === module) {
  for (const k of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(P)) {
    const r = run(k);
    console.log('\n=== ' + k, r.pillars.join(' '), 'XT', r.xt, 'HT', r.ht, 'cicli', r.cycles.join(' '));
    r.rows.forEach(x => console.log(x.none ? x.Y + ' ' + x.age + ' (oltre HT)' :
      [x.Y, x.age, x.ph + ' l' + x.line, x.pers + '→W ' + x.W, x.ann, 'Hu ' + x.hu, x.vis || '-', x.yb, x.hid ? 'NASC ' + x.hid : '', 'najiaW ' + x.najiaW].join(' | ')));
  }
}

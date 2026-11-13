// HLLS — prova (13/11/2026, Edu): il ramo dell'ANNO scontra una linea quieta dell'annuale o dell'esagramma del ciclo (XT/HT).
// Regola dello Yi Jing (Edu): linea scontrata non timely = eliminata; timely = attivata, diventa mobile: si legge il testo e in cosa si trasforma.
// Timely: rispetto al ramo dell'anno (stagione dell'anno). Uso: node anno_scontro.js
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo, NJ = global.HeluoNaJia, SC = global.XKDG_HELUO_SCORES;
global.window = global; require(path.join(__dirname, '..', '..', 'heluo-texts.js'));
const TX = global.XKDG_HELUO_TEXTS, st = (n, l) => (TX[n] && TX[n].lines[l] ? TX[n].lines[l].statement : '');
const BR = '子丑寅卯辰巳午未申酉戌亥', clash = b => BR[(BR.indexOf(b) + 6) % 12];
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' }, CTL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const Pn = pillars('1960-08-18', '10:00', 11.72, 'Europe/Rome'), ctx = DS.context(H.fromPillars(Pn, true), Pn, true), yv = DS.natalVoids(Pn).list;
const out = [];
for (let Y = 1961; Y <= 2028; Y++) {
  const Pe = DS.pillarsTstNoon(Y, 7, 1, 12.07), p = DS.predict(ctx.R, Pe, 12.07); if (p.none) continue;
  const pers = DS.persona(p.hx, p.per.line), yB = Pe.year[1], row = { Y, eta: Y - 1959, yB, pers, hit: [] };
  [['annuale', p.id.year[0], p.annual.hex.lines, p.id.year[1]], [p.phase, p.hx.n, p.hx.lines, p.per.line]].forEach(([lv, n, lines, mov]) => {
    NJ[n].lines.forEach((L, i) => { const l = i + 1; if (L.branch !== clash(yB)) return;
      const r = DS.rel(pers, L.el), tm = DS.timely(L.el, process.env.TM === 'nat' ? Pn.month[1] : yB), h = { lv, n, l, b: L.branch, r, tm, mov: l === mov, s: SC[n] ? SC[n].l[l] : 0, testo: st(n, l), vuoto: yv.includes(L.branch) };
      if (tm && l !== mov) { const nl = lines.slice(); nl[i] = typeof nl[i] === "boolean" ? !nl[i] : 1 - nl[i]; const nh = H.hexOf(nl), N = NJ[nh.n].lines[i];
        h.to = { n: nh.n, b: N.branch, r: DS.rel(pers, N.el), back: GEN[N.el] === L.el ? 'la nutre' : CTL[N.el] === L.el ? 'la attacca' : N.el === L.el ? 'uguale' : '', s: SC[nh.n] ? SC[nh.n].l[l] : 0, testo: st(nh.n, l) }; }
      row.hit.push(h); }); });
  out.push(row);
}
for (const r of out) { if (!r.hit.length) continue;
  console.log(`${r.Y} (${r.eta}) anno ${r.yB}`);
  r.hit.forEach(h => console.log(`   ${h.lv} ${h.n} l${h.l} ${h.b} ${h.r}${h.vuoto ? ' (vuoto)' : ''} ${h.mov ? 'MOBILE già' : h.tm ? 'ATTIVATA' : 'ELIMINATA'} testo ${h.s} «${h.testo.slice(0, 60)}»` +
    (h.to ? `\n        → ${h.to.n} l${h.l} ${h.to.b} ${h.to.r} (${h.to.back}) testo ${h.to.s} «${h.to.testo.slice(0, 60)}»` : ''))); }

// HLLS — prova (13/11/2026, Edu «sì»): il ramo dell'ANNO scontra una linea quieta dell'annuale o del ciclo (XT/HT);
// il MESE decide: linea timely nel mese = attivata (si legge il testo e in cosa si trasforma), altrimenti eliminata.
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
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const Pn = pillars('1960-08-18', '10:00', 11.72, 'Europe/Rome'), ctx = DS.context(H.fromPillars(Pn, true), Pn, true), yv = DS.natalVoids(Pn).list;
const Y0 = +(process.argv[2] || 1961), Y1 = +(process.argv[3] || 2028);
for (let Y = Y0; Y <= Y1; Y++) {
  const lines = {};
  for (let m = 1; m <= 12; m++) {
    const Pe = DS.pillarsTstNoon(Y, m, 20, 12.07), p = DS.predict(ctx.R, Pe, 12.07); if (p.none) continue;
    const pers = DS.persona(p.hx, p.per.line), yB = Pe.year[1], mB = Pe.month[1];
    [['annuale', p.id.year[0], p.annual.hex.lines, p.id.year[1]], [p.phase, p.hx.n, p.hx.lines, p.per.line]].forEach(([lv, n, ls, mov]) => NJ[n].lines.forEach((L, i) => {
      const l = i + 1; if (L.branch !== clash(yB) || l === mov) return;
      const k = `${lv} ${n} l${l} ${L.branch} ${DS.rel(pers, L.el)}${yv.includes(L.branch) ? ' (vuoto)' : ''} — anno ${yB}`, tm = DS.timely(L.el, mB);
      const o = lines[k] = lines[k] || { txt: `${SC[n] ? SC[n].l[l] : 0} «${st(n, l).slice(0, 70)}»`, on: [], off: [], to: null };
      (tm ? o.on : o.off).push(MESI[m - 1] + ' ' + mB);
      if (tm && !o.to) { const nl = ls.slice(); nl[i] = 1 - nl[i]; const nh = H.hexOf(nl), N = NJ[nh.n].lines[i];
        o.to = `${nh.n} l${l} ${N.branch} ${DS.rel(pers, N.el)} (${GEN[N.el] === L.el ? 'la nutre' : CTL[N.el] === L.el ? 'la attacca' : N.el === L.el ? 'uguale' : L.el === GEN[N.el] ? '' : GEN[L.el] === N.el ? 'la scarica' : 'la controlla lei'}) ${SC[nh.n] ? SC[nh.n].l[l] : 0} «${st(nh.n, l).slice(0, 70)}»`; }
    }));
  }
  const ks = Object.keys(lines); if (!ks.length) continue;
  console.log(`${Y} (${Y - 1959})`);
  ks.forEach(k => { const o = lines[k]; console.log(`  ${k}  testo ${o.txt}\n     attiva: ${o.on.join(', ') || '—'}\n     eliminata: ${o.off.join(', ') || '—'}${o.to ? '\n     → ' + o.to : ''}`); });
}

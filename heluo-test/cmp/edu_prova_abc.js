// Prova (12/11/2026, sera): effetto delle correzioni (a)(b)(c) proposte dopo l'8/12/2015 sul filo XKDG, senza toccare l'app.
// (a) testo della linea del giorno (primario ×1 per punto) e dell'esito (×0,5 per punto) nel punteggio;
// (b) Wealth/Relationship (uomo): Brothers sul Lord o sulla linea del giorno = 兄弟劫財, prezzo ×1,5;
// (c) scopo su una linea con testo sfavorevole: niente +, avviso «in gioco, ma in perdita».
// Uso: node edu_prova_abc.js
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo, SC = global.XKDG_HELUO_SCORES;
const Pn = pillars('1960-08-18', '10:00', 11.72, 'Europe/Rome'), R = H.fromPillars(Pn, true), ctx = DS.context(R, Pn, true);
const W = { am: 1, m: 1, lord: 2, d: 3, s2: 3 };
const OPP = Object.values(ctx.prof.K).map(k => k.op); // opposti delle Luck dall'anno (Edu: Xun, Li, Kan)
const XUN = process.env.XUN === 'si';
function nuovo(th, key) {
  let t = th.t, nota = [];
  if (XUN) th.tri.plus.forEach(x => { if (OPP.includes(x.t)) { t -= x.w * x.f; nota.push('−' + x.t + ' (opp. Luck)'); } });
  const male = true, furto = (key === 'wealth' || (key === 'relationship' && male));
  th.lines.forEach(L => {
    const s = SC[L.n].l[L.l];
    if (furto && L.r === 'B' && (L.k === 'lord' || L.k === 'd')) { t -= W[L.k] * L.fl * 0.5; nota.push('劫財 ' + L.k); }       // (b): da ×1 a ×1,5
    if (th.X && L.r === th.X && s < 0) { t -= W[L.k] * L.fl; nota.push('in perdita ' + L.k); }                             // (c)
  });
  const d = th.lines.find(L => L.k === 'd'), o = th.lines.find(L => L.k === 's2');
  const sd = SC[d.n].l[d.l], so = SC[o.n].l[o.l];
  // (e) esito che segue un primario sfavorevole: lo scopo sull'esito non aggiunge (avviso)
  if (process.env.ESITO === 'si' && th.X && sd < 0 && o.r === th.X && so >= 0) { t -= W.s2 * o.fl; nota.push('esito dopo primario negativo'); }
  if (th.X) t += sd * 1 + so * 0.5;                                                                                        // (a)
  return { t, adj: Math.max(-3, Math.min(3, Math.round(t / 3))), nota, sd, so };
}
function giorno(ds, lon, key) {
  const [y, mo, d] = ds.split('-').map(Number), Pe = DS.pillarsTstNoon(y, mo, d, lon), th = DS.thread(ctx, Pe, lon, key);
  return { th, nu: nuovo(th, key), Pe };
}
function anno(Y, lon, key) {
  const out = [];
  for (let t = Date.UTC(Y, 0, 1); t < Date.UTC(Y + 1, 0, 1); t += 864e5) { const ds = new Date(t).toISOString().slice(0, 10), g = giorno(ds, lon, key); if (g.th) out.push({ ds, a: g.th.t, b: g.nu.t, aa: g.th.adj, bb: g.nu.adj }); }
  return out;
}
const top = (all, ds, f) => { const me = all.find(x => x.ds === ds); const s = all.filter(x => f(x) > f(me)).length, p = all.filter(x => f(x) === f(me)).length; return Math.round(100 * (s + (p + 1) / 2) / all.length); };
const CASI = [
  ['2015-12-08', 12.07, ['wealth', 'relationship'], 'rottura Ying, clienti persi'],
  ['2011-09-06', 12.07, ['wealth'], 'invio Yu'], ['2011-09-07', 12.07, ['wealth'], 'ricezione'], ['2011-09-29', 12.07, ['wealth'], 'conferma'],
  ['2011-10-08', 20.46, ['wealth'], 'Belgrado'], ['2011-10-16', 12.07, ['wealth'], 'Dejan'], ['2011-11-15', 12.07, ['wealth'], 'report'],
  ['2019-06-15', 23.73, ['speak', 'wealth'], 'Grecia giugno'], ['2019-06-25', 23.73, ['speak', 'wealth'], 'Grecia fine giugno'], ['2019-07-03', 23.73, ['speak', 'wealth'], 'Grecia luglio'],
];
const cache = {};
for (const [ds, lon, keys, txt] of CASI) for (const key of keys) {
  const g = giorno(ds, lon, key), Y = +ds.slice(0, 4), ck = Y + key + lon; cache[ck] = cache[ck] || anno(Y, lon, key);
  const L = g.th.lines.map(L => `${L.k} ${L.n}l${L.l} ${L.b}${L.r}(${SC[L.n].l[L.l]})`).join(' · ');
  console.log(`${ds} ${key.padEnd(12)} ${txt}\n   ${L}\n   ora: t ${g.th.t.toFixed(2)} ☯${g.th.adj} top ${top(cache[ck], ds, x => x.a)}%  →  nuovo: t ${g.nu.t.toFixed(2)} ☯${g.nu.adj} top ${top(cache[ck], ds, x => x.b)}%  ${g.nu.nota.join(', ')}`);
}
// quante volte scattano le regole in un anno (Wealth 2011)
const y11 = cache['2011wealth12.07'];
console.log('\n2011 Wealth: giorni ☯>0 ora', y11.filter(x => x.aa > 0).length, '→ nuovo', y11.filter(x => x.bb > 0).length, '; ☯<0 ora', y11.filter(x => x.aa < 0).length, '→', y11.filter(x => x.bb < 0).length);
const y15 = anno(2015, 12.07, 'wealth');
console.log('2015 Wealth: giorni ☯>0 ora', y15.filter(x => x.aa > 0).length, '→ nuovo', y15.filter(x => x.bb > 0).length);

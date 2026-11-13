// HLLS — prototipo Date Selection «Correggere» e «Favorire» (regole di Edu, 13/11/2026). Solo prove, app non toccata.
// Progetto HLLS 1: claude/hlls-ds-correggere-favorire.md. Usa thread, filmOfDay, hoursOfDay, levelsOfDay di heluo-ds.js.
// Testo positivo = punteggio della linea > 0; 0 = neutro → «da chiarire col film»; < 0 = la cura non vale.
// Uso: node ds_cf.js
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo;
global.window = global; require(path.join(__dirname, '..', '..', 'heluo-texts.js'));
const TX = global.XKDG_HELUO_TEXTS, st = (n, l) => (TX[n] && TX[n].lines[l] ? TX[n].lines[l].statement : '');
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const CTL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const ELS = Object.keys(GEN), ATT = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' };
const KEY = { W: 'wealth', C: 'speak', P: 'legal', G: 'career', B: 'wealth' };
const PnE = pillars('1960-08-18', '10:00', 11.72, 'Europe/Rome'), ctx = DS.context(H.fromPillars(PnE, true), PnE, true);

function day(iso, lon, X) {
  const [y, m, d] = iso.split('-').map(Number), Pe = DS.pillarsTstNoon(y, m, d, lon);
  const th = Pe && DS.thread(ctx, Pe, lon, KEY[X] || 'wealth'); if (!th) return null;
  const F = DS.filmOfDay(th), L = F.lines, pers = th.pers, elOf = r => ELS.find(e => DS.rel(pers, e) === r);
  return { iso, Pe, th, F, L, pers, elOf, age: th.p.age, hours: DS.hoursOfDay(ctx, th) };
}
const lit = (D, k) => D.F.dayHits.find(h => h.lv === { lord: 'Lord of the block', d: 'day line', s2: 'outcome' }[k] && h.alive);

// ── B. FAVORIRE ──
function favorire(D, X) {
  const A = ATT[X], eX = D.elOf(X), L = D.L, why = [], no = [];
  const feeds = o => o.r === X || GEN[o.el] === eX;
  if (D.th.alarm) no.push('giorno critico');
  if ([L.d, L.s2].some(o => o.r === A) || (D.th.steal || []).length) no.push('il prezzo (' + A + ') arriva sull\'azione');
  const act = [L.d, L.s2].filter(o => o.r === X);
  const good = act.filter(o => o.s > 0), neu = act.filter(o => o.s === 0);
  if (!good.length && !neu.length) no.push('lo scopo non è sull\'azione');
  if (L.d.s < 0) no.push('testo del giorno negativo');
  if (no.length) return { ok: false, no };
  if (feeds(L.lord) && L.lord.s >= 0) why.push('attore ' + (L.lord.r === X ? 'con lo scopo' : 'che lo nutre'));
  if (act.some(o => o.on)) why.push('scopo di stagione');
  if (['d', 's2', 'lord'].some(k => L[k].r === X && lit(D, k))) why.push('il ramo del giorno lo accende');
  if (L.am && L.am.s >= 0 && L.m.r !== A) why.push('sfondo favorevole');
  const v = why.length + (good.length ? 1 : 0);
  return { ok: true, v, why, neutro: !good.length, ore: oreAttore(D) };
}
function oreAttore(D) { // ora in cui entra l'attore (ramo del Lord) e ora della risposta (vuoto che esce), 07–23
  const a = D.hours.find(h => h.b === D.L.lord.b), r = D.hours.find(h => h.voidOut.length && h.i >= 4);
  return { attore: a && a.i >= 4 ? a.pillar + ' ' + a.tst : null, risposta: r ? r.pillar + ' ' + r.tst : null };
}

// ── A. CORREGGERE ──
function correggere(D, P) {
  const eP = D.elOf(P), mb = D.Pe.month[1], season = DS.timely(eP, mb), L = D.L, why = [], no = [];
  const eCure = season ? GEN[eP] : ELS.find(e => CTL[e] === eP), rCure = DS.rel(D.pers, eCure);
  if (D.th.alarm) no.push('giorno critico');
  // la cura sulle linee del giorno (Lord, giorno, esito): elemento giusto E testo positivo (neutro = da chiarire col film)
  const cur = ['d', 's2', 'lord'].map(k => ({ k, o: L[k] })).filter(x => x.o.el === eCure);
  const pos = cur.filter(x => x.o.s > 0), neu = cur.filter(x => x.o.s === 0), neg = cur.filter(x => x.o.s < 0);
  // fuori stagione: anche lo scontro del giorno sulla linea del problema (quieta = eliminata, attiva = cede)
  const clash = !season ? D.F.dayHits.filter(h => h.r === P && !h.alive).map(h => 'cede ' + h.n + ' l' + h.l)
    .concat(D.F.dayQuiet.filter(c => c.r === P && !c.on).map(c => 'eliminata ' + c.n + ' l' + c.l)) : [];
  if (!pos.length && !neu.length && !clash.length) no.push(neg.length ? 'la cura c\'è ma con testo negativo' : 'nessuna cura');
  if (L.d.s < 0 && !pos.some(x => x.k === 'd')) no.push('testo del giorno negativo');
  if (no.length) return { ok: false, no, season, rCure };
  pos.forEach(x => why.push(rCure + ' ' + x.k + ' ' + x.o.n + ' l' + x.o.l));
  clash.forEach(c => why.push(c));
  const v = pos.reduce((s, x) => s + (x.k === 'd' ? 3 : x.k === 's2' ? 2 : 1), 0) + clash.length * 2;
  // ore che alleviano: linea dell'ora con l'elemento della cura E testo positivo
  const ore = D.hours.filter(h => h.i >= 4 && h.el === eCure && h.s > 0).map(h => h.pillar + ' ' + h.tst + ' ' + h.n + ' l' + h.l);
  return { ok: true, v, why, season, rCure, neutro: !pos.length && !clash.length, ore };
}

function range(a, b) { const o = []; for (let t = Date.parse(a); t <= Date.parse(b); t += 864e5) o.push(new Date(t).toISOString().slice(0, 10)); return o; }
function prova(tit, from, to, lon, fn, arg, eventi) {
  const all = range(from, to).map(iso => { const D = day(iso, lon, fn === favorire ? arg : 'W'); return D && { D, r: fn(D, arg) }; }).filter(Boolean);
  const ok = all.filter(x => x.r.ok).sort((a, b) => b.r.v - a.r.v);
  const top = ok.filter(x => x.r.v >= (ok[Math.min(ok.length - 1, 4)] || { r: { v: 0 } }).r.v);
  console.log(`\n══ ${tit} — ${from} … ${to}: buoni ${ok.length}/${all.length}, migliori ${top.length}`);
  top.slice(0, 8).forEach(x => console.log(`  ★ ${x.D.iso} ${x.D.Pe.day} (età ${x.D.age}) ${x.r.why.join('; ')}${x.r.neutro ? ' [neutro: film]' : ''}  ore ${JSON.stringify(x.r.ore)}`));
  (eventi || []).forEach(([iso, txt]) => { const x = all.find(z => z.D.iso === iso); if (!x) return;
    const L = x.D.L; console.log(`  · ${iso} ${txt}: ${x.r.ok ? 'BUONO' + (top.includes(x) ? ' (tra i migliori)' : '') + ' — ' + x.r.why.join('; ') : 'scartato — ' + x.r.no.join('; ')}`
      + `\n      Lord ${L.lord.n} l${L.lord.l} ${L.lord.b}${L.lord.r}(${L.lord.s}) giorno ${L.d.n} l${L.d.l} ${L.d.b}${L.d.r}(${L.d.s}) esito ${L.s2.n} l${L.s2.l} ${L.s2.b}${L.s2.r}(${L.s2.s}) ${x.D.th.alarm ? '⚠' + x.D.th.alarm.level : ''}`); });
  return { all, ok, top };
}

// prevalenza del momento (chi è il problema) — Dicembre 2015
const pv = {}; if (!process.argv.includes("--quiet")) range('2015-11-22', '2015-12-21').forEach(iso => { const D = day(iso, 12.07, 'W'); (DS.levelsOfDay(D.th).prevalence).forEach(r => pv[r] = (pv[r] || 0) + 1); });
if (!process.argv.includes("--quiet")) console.log('Prevalenza nov–dic 2015:', pv);
if (!process.argv.includes("--quiet")) { const d8 = day('2015-12-08', 12.07, 'W'); console.log('8/12/2015 prevalenza', DS.levelsOfDay(d8.th).prevalence, 'pers', d8.pers, 'mese', d8.Pe.month); }

if (!process.argv.includes("--quiet")) for (const P of ['B', 'C', 'G', 'P', 'W']) prova('CORREGGERE ' + P, '2015-11-22', '2015-12-21', 12.07, correggere, P, [['2015-12-08', 'rottura con Ying (da evitare)']]);
if (!process.argv.includes("--quiet")) prova('FAVORIRE Wealth set–nov 2011', '2011-09-01', '2011-11-30', 12.07, favorire, 'W',
  [['2011-09-06', 'invio al Maestro Yu'], ['2011-09-07', 'clienti'], ['2011-09-29', 'clienti, conferma'], ['2011-10-08', 'Belgrado'], ['2011-10-16', 'Dejan'], ['2011-11-15', 'report']]);
if (!process.argv.includes("--quiet")) prova('FAVORIRE Wealth dic 2015', '2015-11-22', '2015-12-21', 12.07, favorire, 'W', [['2015-12-08', 'rottura con Ying']]);
if (!process.argv.includes("--quiet")) prova('FAVORIRE Children feb–mar 2017', '2017-02-01', '2017-03-31', 12.07, favorire, 'C', [['2017-02-19', 'Israele, partenza (seminario buono, relazione difficile)']]);
if (!process.argv.includes("--quiet")) prova('FAVORIRE Children giu–lug 2019', '2019-06-01', '2019-07-10', 23.73, favorire, 'C', [['2019-06-15', 'Grecia, seminario (buono)'], ['2019-06-25', 'critiche'], ['2019-07-03', 'accuse']]);
module.exports = { day, favorire, correggere };

// HLLS — triplice punizione (丑戌未, 寅巳申) completata dal ramo del giorno con le linee attive, separata per relazione colpita
// e per stagione (Edu, 14/11/2026). Solo prova, app non toccata.
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo;
const EL = { 子: 'Water', 亥: 'Water', 寅: 'Wood', 卯: 'Wood', 巳: 'Fire', 午: 'Fire', 申: 'Metal', 酉: 'Metal', 辰: 'Earth', 戌: 'Earth', 丑: 'Earth', 未: 'Earth' };
const GROUPS = ['丑戌未', '寅巳申'];
// chi è colpito: 丑戌未 tutta Terra; 寅巳申: 申 (Metallo) colpisce 寅 (Legno), 巳 (Fuoco) colpisce 申 (Metallo)
const STRUCK = { '丑戌未': ['丑', '戌', '未'], '寅巳申': ['寅', '申'] };
const cat = (e, pol) => {
  const w = e.what;
  if (pol === '+') return 'pos';
  if (e.violent) return 'violento';
  if (/arrest|convict|sentenc|charged|impeach|indict|trial|prison|imprison|garanzia|investigat|captured|deposed/i.test(w)) return 'legale';
  if (/^death|died|dies/i.test(w)) return 'morte';
  return 'altro';
};
function pun(ctx, Pe, lon) {
  const th = DS.thread(ctx, Pe, lon, 'career'); if (!th) return null;
  const f = DS.filmOfDay(th), L = [f.cycle, f.lines.am, f.lines.m, f.lines.lord, f.lines.d, f.lines.s2].filter(Boolean);
  const db = Pe.day[1], mb = Pe.month[1], out = [];
  GROUPS.forEach(g => {
    if (process.env.LARGO) { // variante larga: il gruppo è completo con linee attive + rami di anno, mese, giorno; almeno una linea attiva coinvolta
      const T = [Pe.year[1], mb, db], all = [...g].every(b => L.some(x => x.b === b) || T.includes(b));
      if (!all || !L.some(x => g.includes(x.b))) return;
    } else {
    if (!g.includes(db)) return;
    const others = [...g].filter(b => b !== db), have = others.filter(b => L.some(x => x.b === b));
    if (have.length < 2 || L.some(x => x.b === db)) return; }
    const lines = L.filter(x => g.includes(x.b));
    const struck = STRUCK[g].map(b => ({ b, r: DS.rel(th.pers, EL[b]), on: DS.timely(EL[b], mb) }));
    out.push({ g, db, struck, lines, neg: lines.some(x => x.s < 0), sea: struck.some(s => s.on) ? 'timely' : 'untimely' });
  });
  return out;
}
const rows = [], base = []; let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const f of ['famous_arts', 'famous_politics', 'famous_violent']) for (const q of require(path.join(__dirname, '..', f + '.json')).people) {
  const b = q.birth, tz = b.tz || (b.lmt ? 'LMT' : 'UTC' + (b.utcOffset >= 0 ? '+' : '') + b.utcOffset), male = (q.sex || 'M') === 'M';
  let Pn; try { Pn = pillars(b.date, b.time, b.lon, tz); } catch (e) { continue; }
  const ctx = DS.context(H.fromPillars(Pn, male), Pn, male); const by = +b.date.slice(0, 4); let maxY = by;
  for (const e of q.events) { const [y, mo, d] = e.date.split('-').map(Number); maxY = Math.max(maxY, y); const pol = e.polarity || e.pol;
    let r; try { r = pun(ctx, DS.pillarsTstNoon(y, mo, d, b.lon), b.lon); } catch (x) { continue; } if (!r) continue;
    rows.push({ who: q.name, e, pol, cat: cat(e, pol), r }); }
  const y0 = by + 18, y1 = Math.max(maxY, y0 + 1);
  for (let i = 0; i < 60; i++) { const dd = new Date(Date.UTC(y0, 0, 1) + Math.floor(rnd() * (y1 - y0) * 365.25) * 864e5);
    let r; try { r = pun(ctx, DS.pillarsTstNoon(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(), b.lon), b.lon); } catch (x) { continue; } if (r) base.push({ r }); }
}
const pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
const G = { pos: rows.filter(x => x.pol === '+'), neg: rows.filter(x => x.pol === '-') };
['violento', 'legale', 'morte', 'altro'].forEach(c => G['neg:' + c] = rows.filter(x => x.cat === c)); G.base = base;
const has = (x, fn) => x.r.some(fn);
console.log('Punizione completata dal giorno (quota di eventi)');
for (const [k, a] of Object.entries(G)) console.log(k.padEnd(13), String(a.length).padStart(5), 'tutte', pc(a.filter(x => x.r.length).length, a.length),
  '| 丑戌未', pc(a.filter(x => has(x, p => p.g === '丑戌未')).length, a.length), '| 寅巳申', pc(a.filter(x => has(x, p => p.g === '寅巳申')).length, a.length),
  '| timely', pc(a.filter(x => has(x, p => p.sea === 'timely')).length, a.length), '| untimely', pc(a.filter(x => has(x, p => p.sea === 'untimely')).length, a.length),
  '| testo neg', pc(a.filter(x => has(x, p => p.neg)).length, a.length));
console.log('\nPer relazione colpita (quota di eventi)');
for (const R of ['P', 'W', 'G', 'C', 'B']) console.log(R, Object.entries(G).filter(([k]) => ['pos', 'neg', 'neg:legale', 'neg:violento', 'base'].includes(k)).map(([k, a]) =>
  k + ' ' + pc(a.filter(x => has(x, p => p.struck.some(s => s.r === R))).length, a.length) + ' (timely ' + pc(a.filter(x => has(x, p => p.struck.some(s => s.r === R && s.on))).length, a.length) + ')').join(' | '));
// esito degli eventi con punizione: quota negativi, per relazione e stagione
console.log('\nFra gli eventi con punizione completata: quanti sono negativi (eventi negativi in tutto:', pc(G.neg.length, rows.length) + ')');
const P = rows.filter(x => x.r.length);
const neg = a => pc(a.filter(x => x.pol === '-').length, a.length) + ' di ' + a.length;
console.log('tutti', neg(P), '| timely', neg(P.filter(x => has(x, p => p.sea === 'timely'))), '| untimely', neg(P.filter(x => has(x, p => p.sea === 'untimely'))), '| testo neg', neg(P.filter(x => has(x, p => p.neg))));
for (const R of ['P', 'W', 'G', 'C', 'B']) console.log(R, 'colpito', neg(P.filter(x => has(x, p => p.struck.some(s => s.r === R)))), '| timely', neg(P.filter(x => has(x, p => p.struck.some(s => s.r === R && s.on)))), '| untimely', neg(P.filter(x => has(x, p => p.struck.some(s => s.r === R && !s.on)))));
if (process.env.LIST) P.forEach(x => console.log(x.pol, x.who, x.e.date, x.e.what.slice(0, 50), x.r.map(p => p.g + ' giorno ' + p.db + ' colpiti ' + p.struck.map(s => s.b + s.r + (s.on ? '↑' : '↓')).join(',') + ' linee ' + p.lines.map(l => l.n + 'l' + l.l + l.b + '(' + l.s + ')').join(' ')).join('; ')));

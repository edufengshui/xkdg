// HLLS — prova Six Clashes (六冲卦) sui famosi (Edu, 14/11/2026). Solo prova, app non toccata.
// (a) livelli (ciclo, annuale, mese, blocco, giorno-esito) che sono un esagramma Six Clashes (8 puri + 25 + 34)
// (b) scontro fra linee attive di livelli vicini in posizioni corrispondenti (1–4, 2–5, 3–6)
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo, NJ = global.HeluoNaJia, SC = global.XKDG_HELUO_SCORES;
const BR = '子丑寅卯辰巳午未申酉戌亥', clash = b => BR[(BR.indexOf(b) + 6) % 12];
const SIX = new Set([1, 2, 29, 30, 51, 52, 57, 58, 25, 34]);
const LV = ['cyc', 'ann', 'mon', 'blk', 'day'];
const cat = e => {
  const w = e.what;
  if (/divor|separat|split/i.test(w)) return 'divorzio';
  if (/resign|fired|deposed|stripped|loses|lost|defeat|eliminated|dimiss|ousted|expelled/i.test(w)) return 'carica';
  if (/death of|killed in|husband .*killed|brother .*killed|sister .*killed|suicide of|assassinat.* (great|brother)|husband assassinated|stillbirth|learns of father/i.test(w) && !/^death/i.test(w)) return 'lutto';
  return 'altro';
};
function info(ctx, Pe, lon) {
  const th = DS.thread(ctx, Pe, lon, 'career'); if (!th) return null;
  const p = th.p, pers = th.pers;
  const hexes = { cyc: p.hx.n, ann: p.annual.hex.n, mon: p.month.hex.n, blk: p.id.lord[0], day: p.id.dayHex[0] };
  const act = { cyc: [p.hx.n, p.per.line], ann: [p.annual.hex.n, p.annual.moved], mon: [p.month.hex.n, p.month.line],
    lord: [p.id.lord[0], p.id.lord[1]], dl: [p.id.day[0], p.id.day[1]], out: [p.id.dayHex[0], p.id.dayHex[1]] };
  const L = k => { const [n, l] = act[k]; const x = NJ[n].lines[l - 1]; return { n, l, b: x.branch, r: DS.rel(pers, x.el), s: SC[n] ? SC[n].l[l] : 0 }; };
  const pairs = [['cyc', 'ann'], ['ann', 'mon'], ['mon', 'lord'], ['lord', 'dl'], ['lord', 'out']];
  const hits = [], hitsAny = [];
  pairs.forEach(([a, b]) => { const A = L(a), B = L(b); if (A.b !== clash(B.b)) return;
    const h = { pair: a + '-' + b, A, B, same: A.r === B.r }; hitsAny.push(h); if (Math.abs(A.l - B.l) === 3) hits.push(h); });
  return { hexes, hits, hitsAny };
}
const rows = [], base = [];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const f of ['famous_arts', 'famous_politics', 'famous_violent']) for (const q of require(path.join(__dirname, '..', f + '.json')).people) {
  const b = q.birth, tz = b.tz || (b.lmt ? 'LMT' : 'UTC' + (b.utcOffset >= 0 ? '+' : '') + b.utcOffset), male = (q.sex || 'M') === 'M';
  let Pn; try { Pn = pillars(b.date, b.time, b.lon, tz); } catch (e) { continue; }
  const ctx = DS.context(H.fromPillars(Pn, male), Pn, male);
  const by = +b.date.slice(0, 4); let maxY = by;
  for (const e of q.events) {
    const [y, mo, d] = e.date.split('-').map(Number); maxY = Math.max(maxY, y);
    let r; try { r = info(ctx, DS.pillarsTstNoon(y, mo, d, b.lon), b.lon); } catch (x) { continue; } if (!r) continue;
    const pol = e.polarity || e.pol;
    rows.push({ who: q.name, e, pol, cat: pol === '-' ? (e.violent ? 'violento' : cat(e)) : 'pos', ...r });
  }
  // base: 40 giorni a caso fra 18 anni e l'ultimo evento
  const y0 = by + 18, y1 = Math.max(maxY, y0 + 1);
  for (let i = 0; i < 40; i++) { const t = Date.UTC(y0, 0, 1) + Math.floor(rnd() * (y1 - y0) * 365.25) * 864e5, dd = new Date(t);
    let r; try { r = info(ctx, DS.pillarsTstNoon(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(), b.lon), b.lon); } catch (x) { continue; } if (r) base.push(r); }
}
const pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
const groups = { pos: rows.filter(r => r.pol === '+'), neg: rows.filter(r => r.pol === '-') };
['divorzio', 'carica', 'lutto', 'violento', 'altro'].forEach(c => groups['neg:' + c] = rows.filter(r => r.cat === c));
groups.base = base;
console.log('(a) quota di eventi con esagramma Six Clashes al livello (atteso ~15,6%)');
for (const [g, a] of Object.entries(groups)) console.log(g.padEnd(13), String(a.length).padStart(4), LV.map(l => l + ' ' + pc(a.filter(r => SIX.has(r.hexes[l])).length, a.length)).join(' | '),
  '| almeno uno', pc(a.filter(r => LV.some(l => SIX.has(r.hexes[l]))).length, a.length), '| mon/blk/day', pc(a.filter(r => ['mon', 'blk', 'day'].some(l => SIX.has(r.hexes[l]))).length, a.length));
console.log('\n(b) scontro fra linee attive di livelli vicini, posizioni corrispondenti (e in qualsiasi posizione)');
for (const [g, a] of Object.entries(groups)) {
  const h = a.filter(r => r.hits.length), hs = h.filter(r => r.hits.some(x => x.same)), ha = a.filter(r => r.hitsAny.length);
  const neg = h.filter(r => r.hits.some(x => x.A.s < 0 || x.B.s < 0));
  console.log(g.padEnd(13), String(a.length).padStart(4), 'corrisp', pc(h.length, a.length), '| stessa relazione', pc(hs.length, a.length), '| con testo neg', pc(neg.length, a.length), '| qualsiasi pos.', pc(ha.length, a.length));
}
// per coppia di livelli e per relazione (stessa)
console.log('\n(b) per coppia, corrispondenti');
for (const pr of ['cyc-ann', 'ann-mon', 'mon-lord', 'lord-dl', 'lord-out']) console.log(pr.padEnd(9), Object.entries(groups).filter(([g]) => ['pos', 'neg', 'base', 'neg:divorzio', 'neg:carica', 'neg:lutto'].includes(g)).map(([g, a]) => g + ' ' + pc(a.filter(r => r.hits.some(x => x.pair === pr)).length, a.length)).join(' | '));
console.log('\n(b) relazione stessa, per relazione (corrispondenti)');
for (const R of ['P', 'W', 'G', 'C', 'B']) console.log(R, Object.entries(groups).filter(([g]) => ['pos', 'neg', 'base'].includes(g)).map(([g, a]) => g + ' ' + pc(a.filter(r => r.hits.some(x => x.same && x.A.r === R)).length, a.length)).join(' | '));
if (process.argv[2] === 'list') rows.filter(r => r.hits.length && r.pol === '-').forEach(r => console.log(r.who, r.e.date, r.cat, r.e.what.slice(0, 60), r.hits.map(x => `${x.pair} ${x.A.n}l${x.A.l}${x.A.b}${x.A.r}(${x.A.s}) × ${x.B.n}l${x.B.l}${x.B.b}${x.B.r}(${x.B.s})`).join('; ')));
if (process.argv[2] === 'div') rows.filter(r => r.cat === 'divorzio' || /marri|wedding|sposa/i.test(r.e.what)).forEach(r => console.log(r.cat, r.who, r.e.date, r.e.what.slice(0, 50), LV.map(l => l + ' ' + r.hexes[l] + (SIX.has(r.hexes[l]) ? '*' : '')).join(' ')));

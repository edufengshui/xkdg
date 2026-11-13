// HLLS — prototipo: il RAMO DEL GIORNO (Edu, 13/11/2026, giorno 辛卯). Solo prove, app non toccata.
// A) il ramo del giorno ha una relazione con la persona: scopo +1, prezzo −1 (Brothers per Wealth / Relationship uomo = 劫財 −1,5).
// B) il ramo del giorno scontra (冲) una linea dell'esagramma del mese o del blocco e la attiva: la linea entra in gioco con
//    relazione (scopo +w, prezzo −w; 劫財 ×1,5) e testo (punteggio × 0,5 × w). w = 1 blocco, 0,5 mese. Una linea presente in
//    entrambi (trigramma non mutato) conta una volta sola, col peso del blocco. Le linee già lette (mese, Lord, giorno) non si
//    ricontano. Ramo vuoto natale scontrato: conta solo se esce (voidExit); altrimenti «frutti dopo», 0.
//    Variante B+ (SAME=si): anche le linee con lo STESSO ramo del giorno.
// Uso: node ramo_giorno.js            → date di Edu (prima/dopo per scopo) + eventi famosi con scopo (36)
//      node ramo_giorno.js json       → scrive ramo_giorno.json (per la pagina)
'use strict';
const path = require('path'), fs = require('fs');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo, NJ = global.HeluoNaJia, SC = global.XKDG_HELUO_SCORES;
global.window = global; require(path.join(__dirname, '..', '..', 'heluo-texts.js'));
const TX = global.XKDG_HELUO_TEXTS, st = (n, l) => (TX[n] && TX[n].lines[l] ? TX[n].lines[l].statement : '');
const BR = '子丑寅卯辰巳午未申酉戌亥', clash = b => BR[(BR.indexOf(b) + 6) % 12];
const BR_EL = { 子: 'Water', 亥: 'Water', 寅: 'Wood', 卯: 'Wood', 巳: 'Fire', 午: 'Fire', 申: 'Metal', 酉: 'Metal', 辰: 'Earth', 戌: 'Earth', 丑: 'Earth', 未: 'Earth' };
const W_A = 1, W_B = { block: 1, month: 0.5 }, STEAL = 1.5, TXT = 0.5;
const SAME = process.env.SAME === 'si';
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' }, CTL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const XK_W = { m: 1, lord: 2, d: 3 }, XK_T = { m: 0.5, lord: 0.5, d: 1 }, B2 = 0.5, CRIT = 0.5;

function ramo(ctx, Pe, lon, key, same) {
  const th = DS.thread(ctx, Pe, lon, key); if (!th) return null;
  const p = th.p, pers = th.pers, X = th.X, A = th.A, dB = Pe.day[1], mb0 = ctx.Pn.month[1];
  const TT = { y: Pe.year[1], m: Pe.month[1], d: dB }, mv = DS.movedBranches(p), yv = th.yv;
  const furto = key === 'wealth' || (key === 'relationship' && ctx.male);
  // A
  const rA = DS.rel(pers, BR_EL[dB]); let a = 0;
  if (X && rA === X) a = W_A; else if (A && rA === A) a = -W_A * (furto && rA === 'B' ? STEAL : 1);
  // B
  const hM = p.month.hex.n, hB = p.id.lord[0], read = { [hM]: [p.month.line], [hB]: [p.id.lord[1], p.id.day[1]] };
  const hit = [], seen = {}; let b = 0, b2 = 0;
  [['block', hB], ['month', hM]].forEach(([lv, n]) => NJ[n].lines.forEach((L, i) => {
    const l = i + 1, how = L.branch === clash(dB) ? '冲' : (same && L.branch === dB) ? '=' : null; if (!how) return;
    const k = L.branch + l + (i < 3 ? NJ[n].lines.slice(0, 3) : NJ[n].lines.slice(3)).map(x => x.branch).join('');
    const r = DS.rel(pers, L.el), s = SC[n] ? SC[n].l[l] : 0, isRead = read[n].includes(l);
    const h = { lv, n, l, b: L.branch, el: L.el, r, s, how, testo: st(n, l), read: isRead, dup: !!seen[k], v: 0 };
    if (seen[k]) { hit.push(h); return; } seen[k] = 1;
    if (isRead) { // B2: una linea già letta e scontrata dal giorno pesa ×1,5 (relazione e testo)
      const k2 = n === hM && l === p.month.line && lv === 'month' ? 'm' : l === p.id.lord[1] ? 'lord' : 'd', w2 = XK_W[k2]; let v2 = 0;
      if (X && r === X) v2 += w2; else if (A && r === A) v2 -= w2 * (furto && r === 'B' ? STEAL : 1);
      if (X) v2 += s * XK_T[k2]; v2 *= B2; h.nota = 'già letta (' + k2 + '), ×1,5'; h.v2 = v2; b2 += v2; hit.push(h); return; }
    if (yv.includes(L.branch)) { const vx = DS.voidExit(L.branch, mb0, TT, mv); if (!vx.out) { h.nota = 'vuota, frutti dopo'; hit.push(h); return; } h.nota = 'esce dal vuoto'; }
    const w = W_B[lv]; let v = 0;
    if (X && r === X) v += w; else if (A && r === A) v -= w * (furto && r === 'B' ? STEAL : 1);
    if (X) v += s * TXT * w;
    if (key === 'speak' && r === 'B' && (s < 0 || h.nota === 'esce dal vuoto')) { v -= w * CRIT; h.crit = true; } // regola 4 (Grecia): critiche
    h.v = v; b += v; hit.push(h);
  }));
  // A letta con la prevalenza (Edu: 卯 Wealth allevia il Parent prevalente): il ramo del giorno controlla l'elemento prevalente?
  const LV = DS.levelsOfDay(th), pv = LV && LV.prevalence.length === 1 ? LV.prevalence[0] : null, pEl = pv ? LV.lines.find(x => x.r === pv).el : null, dEl = BR_EL[dB];
  const prev = !pv ? null : { r: pv, eff: CTL[dEl] === pEl ? 'allevia' : (dEl === pEl || GEN[dEl] === pEl) ? 'accentua' : GEN[pEl] === dEl ? 'scarica' : CTL[pEl] === dEl ? 'controllato' : '' };
  const t3 = th.t + a + b + b2, adj3 = Math.max(-3, Math.min(3, Math.round(t3 / 3)));
  const t2 = th.t + a + b, adj2 = Math.max(-3, Math.min(3, Math.round(t2 / 3)));
  return { th, dB, rA, a, b, b2, hit, t2, adj2, t3, adj3, prev, adjA: Math.max(-3, Math.min(3, Math.round((th.t + a) / 3))) };
}

const SCOPO = { wealth: 'wealth', output: 'speak', officer: 'career', parent: 'legal' };
function anno(ctx, Y, lon, key, same) {
  const out = [];
  for (let t = Date.UTC(Y, 0, 1); t < Date.UTC(Y + 1, 0, 1); t += 864e5) {
    const d = new Date(t), Pe = DS.pillarsTstNoon(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), lon), g = Pe && ramo(ctx, Pe, lon, key, same);
    if (g) out.push({ ds: d.toISOString().slice(0, 10), t0: g.th.t, tA: g.th.t + g.a, t2: g.t2, t3: g.t3 });
  }
  return out;
}
const pct = (all, ds, f) => { const me = all.find(x => x.ds === ds); if (!me) return null; const s = all.filter(x => f(x) > f(me) + 1e-9).length, q = all.filter(x => Math.abs(f(x) - f(me)) < 1e-9).length; return Math.round(100 * (s + (q + 1) / 2) / all.length); };

// ── Edu ──
const PnE = pillars('1960-08-18', '10:00', 11.72, 'Europe/Rome'), ctxE = DS.context(H.fromPillars(PnE, true), PnE, true);
const CASI = [
  ['2015-12-08', 12.07, { wealth: -1, relationship: -1 }, 'rottura con Ying, lettera ai clienti'],
  ['2016-01-21', 12.07, { wealth: -1, relationship: -1 }, 'giorno critico (conti, casa, clienti)'],
  ['2011-09-06', 12.07, { wealth: 1 }, 'invio al Maestro Yu'],
  ['2011-09-07', 12.07, { wealth: 1 }, 'clienti: ricezione'], ['2011-09-29', 12.07, { wealth: 1 }, 'clienti: conferma'],
  ['2011-10-08', 20.46, { wealth: 1 }, 'Belgrado'], ['2011-10-16', 12.07, { wealth: 1 }, 'Dejan'], ['2011-11-15', 12.07, { wealth: 1 }, 'report'],
  ['2019-06-15', 23.73, { speak: 1, wealth: 1 }, 'Grecia, seminario'], ['2019-06-25', 23.73, { speak: -1, wealth: 0 }, 'Grecia, critiche'], ['2019-07-03', 23.73, { speak: -1, wealth: 0 }, 'Grecia, accuse'],
  ['2026-11-13', 16.37, { support: 0, legal: 0, wealth: 0, speak: 0 }, 'oggi, 辛卯 (Vienna)'],
];
const fmtHit = h => `${h.lv === 'block' ? 'blocco' : 'mese'} ${h.n} l${h.l} ${h.b}${h.r}${h.how}${h.dup ? ' (anche nell\'altro)' : ''} ${h.nota || ''} testo ${h.s} → B ${h.v || 0}${h.v2 ? ' B2 ' + h.v2 : ''}${h.crit ? ' (critiche)' : ''}`;
const json = [], cache = {};
console.log('═══ Date di Edu ═══');
for (const [ds, lon, keys, txt] of CASI) {
  const [y, mo, d] = ds.split('-').map(Number), Pe = DS.pillarsTstNoon(y, mo, d, lon);
  const row = { ds, lon, txt, eta: y - 1959, pil: [Pe.hour, Pe.day, Pe.month, Pe.year], keys: {} };
  console.log(`\n${ds} (età ${y - 1959}) ${txt} · giorno ${Pe.day} · Ora ${Pe.hour} Giorno ${Pe.day} Mese ${Pe.month} Anno ${Pe.year}`);
  for (const [key, dir] of Object.entries(keys)) {
    const g = ramo(ctxE, Pe, lon, key, SAME), ck = y + key + lon; cache[ck] = cache[ck] || anno(ctxE, y, lon, key, SAME);
    const p = g.th.p;
    if (!row.esa) row.esa = { pers: g.th.pers, dom: p.dayOfMonth, mIndex: p.month.index, ms: Date.UTC(y, mo - 1, d), testi: { m: st(p.month.hex.n, p.month.line), lord: st(p.id.lord[0], p.id.lord[1]), d: st(p.id.day[0], p.id.day[1]), s2: st(p.id.dayHex[0], p.id.dayHex[1]) }, mese: [p.month.hex.n, p.month.line, p.month.hex.lines], blocco: [p.id.lord[0], p.id.lord[1], p.daily.block.lines], giorno: [p.id.day[0], p.id.day[1]], esito: [p.id.dayHex[0], p.id.dayHex[1], p.daily.hex.lines], hit: g.hit, dB: g.dB, rA: g.rA };
    const r = { dir, a: g.a, b: g.b, t0: g.th.t, t2: g.t2, adj0: g.th.adj, adjA: g.adjA, adj2: g.adj2,
      b2: g.b2, t3: g.t3, adj3: g.adj3, prev: g.prev, p3: pct(cache[ck], ds, x => x.t3),
      p0: pct(cache[ck], ds, x => x.t0), pA: pct(cache[ck], ds, x => x.tA), p2: pct(cache[ck], ds, x => x.t2), alarm: g.th.alarm && g.th.alarm.level };
    row.keys[key] = r;
    console.log(`  ${key.padEnd(12)} A: ramo ${g.dB} = ${g.rA} → ${g.a}   B: ${g.b.toFixed(2)}   ☯ ${g.th.adj} → ${g.adjA} (A) → ${g.adj2} (A+B) → ${g.adj3} (+B2)   t ${g.th.t.toFixed(2)} → ${g.t2.toFixed(2)} → ${g.t3.toFixed(2)}   top ${r.p0}% → ${r.p2}% → ${r.p3}%  prev ${g.prev ? g.prev.r + ' ' + g.prev.eff : '-'}${r.alarm ? '  ⚠' + r.alarm : ''}`);
  }
  g0: for (const h of row.esa.hit) console.log('     ' + fmtHit(h) + '  «' + h.testo.slice(0, 70) + '»');
  json.push(row);
}

// ── famosi: 6 eventi DS + 30 nuovi (scopo noto, tutti positivi) ──
const PEOPLE = {};
for (const f of ['famous_arts', 'famous_politics', 'famous_violent']) for (const q of require(path.join(__dirname, '..', f + '.json')).people) {
  const bb = q.birth, tz = bb.tz || (bb.lmt ? 'LMT' : 'UTC' + (bb.utcOffset >= 0 ? '+' : '') + bb.utcOffset);
  PEOPLE[q.name] = { date: bb.date, time: bb.time, lon: bb.lon, tz, male: (q.sex || 'M') === 'M' };
}
const N6 = { gates: ['1955-10-28', '22:00', -122.33, 'America/Los_Angeles', true], jobs: ['1955-02-24', '19:15', -122.42, 'America/Los_Angeles', true], zuckerberg: ['1984-05-14', '14:39', -73.87, 'America/New_York', true], musk: ['1971-06-28', '05:29', 28.19, 'Africa/Johannesburg', true] };
const EV = require('./ds_cascata.js').EVENTI.map(e => ({ ...e, nasc: N6[e.chi] }))
  .concat(require('./ds_nuovi.json').map(x => x.e).filter(e => PEOPLE[e.chi]).map(e => { const q = PEOPLE[e.chi]; return { ...e, nasc: [q.date, q.time, q.lon, q.tz, q.male] }; }));
console.log('\n═══ Famosi (eventi positivi con scopo) ═══');
const fam = []; let su = 0, giu = 0, ug = 0, suA = 0, giuA = 0;
for (const e of EV) {
  const [bd, bt, blon, btz, male] = e.nasc, Pn = pillars(bd, bt, blon, btz), ctx = DS.context(H.fromPillars(Pn, male), Pn, male);
  const key = SCOPO[e.scopo], Y = +e.d.slice(0, 4), [y, mo, d] = e.d.split('-').map(Number), Pe = DS.pillarsTstNoon(y, mo, d, e.luogo[0]);
  const g = ramo(ctx, Pe, e.luogo[0], key, SAME); if (!g) { console.log(e.chi, e.d, 'fuori'); continue; }
  const all = anno(ctx, Y, e.luogo[0], key, SAME), p0 = pct(all, e.d, x => x.t0), pA = pct(all, e.d, x => x.tA), p2 = pct(all, e.d, x => x.t2), p3 = pct(all, e.d, x => x.t3);
  if (g.a > 0) suA++; if (g.a < 0) giuA++; if (p2 < p0) su++; else if (p2 > p0) giu++; else ug++;
  fam.push({ chi: e.chi, d: e.d, cosa: e.cosa, key, dB: g.dB, rA: g.rA, a: g.a, b: g.b, b2: g.b2, p0, pA, p2, p3, prev: g.prev, hit: g.hit.filter(h => !h.dup).map(h => ({ lv: h.lv, n: h.n, l: h.l, b: h.b, r: h.r, s: h.s, v: h.v, nota: h.nota || '' })) });
  console.log(`${e.chi.slice(0, 22).padEnd(22)} ${e.d} ${key.padEnd(7)} ramo ${g.dB}=${g.rA} A ${g.a >= 0 ? '+' : ''}${g.a}  B ${g.b >= 0 ? '+' : ''}${g.b.toFixed(2)}  top ${p0}% → ${pA}% (A) → ${p2}% (A+B) → ${p3}% (+B2)  B2 ${g.b2}  prev ${g.prev ? g.prev.r + ' ' + g.prev.eff : '-'}`);
}
const med = k => Math.round(fam.reduce((s, x) => s + x[k], 0) / fam.length);
console.log(`\nA: ramo del giorno a favore ${suA}, contro ${giuA}, neutro ${fam.length - suA - giuA} su ${fam.length}.`);
console.log(`A+B: evento sale in classifica ${su}, scende ${giu}, uguale ${ug}. Percentile medio ${med('p0')} → ${med('pA')} (A) → ${med('p2')} (A+B) → ${med('p3')} (+B2) (più basso = meglio; caso 50).`);
if (process.argv.includes('json')) fs.writeFileSync(path.join(__dirname, SAME ? 'ramo_giorno_same.json' : 'ramo_giorno.json'), JSON.stringify({ edu: json, fam }, null, 1));

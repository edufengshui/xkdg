// HLLS — Date Selection "filo dello scopo", versione corta (Edu, 11/11/2026): solo mese, blocco, giorno.
// Lo HLLS non sceglie i giorni da solo: alza o abbassa giorni già favorevoli per lo XKDG. Qui si prova se il filo,
// DA SOLO, riconosce il giorno dell'evento tra i giorni del suo anno (percentile, caso 50, basso = meglio).
// Regole e pesi FISSATI PRIMA di vedere i risultati:
//   filo = mese 1 + Signore del blocco 2 + primario 3 + esito 3, se la linea letta porta la relazione dello scopo;
//          la linea nascosta sotto la linea letta vale la metà.
//   Varianti dichiarate: senza nascoste · filo − prezzo (relazione che controlla lo scopo) · solo giorno · Luck.
//   Scopi: officer = Ghost, output = Children, parent = Parent, relationship = Wealth (uomo) / Ghost (donna).
//   Soglie: batte il caso se ≤ 40 sui 30 eventi nuovi E ≤ 45 sul gruppo grande.
// Uso: node ds_filo.js [dettaglio]
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
const N30 = require('./ds_nuovi.js'), DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo, NJ = global.HeluoNaJia;

const PESI = { m: 1, lord: 2, d: 3, s2: 3 }, NASCOSTA = 0.5;
const ATTACCA = { W: 'B', P: 'W', C: 'P', G: 'C', B: 'G' }; // who controls the purpose relation
const relScopo = (scopo, male) => scopo === 'officer' ? 'G' : scopo === 'output' ? 'C' : scopo === 'parent' ? 'P' : scopo === 'wealth' ? 'W' : scopo === 'relationship' ? (male ? 'W' : 'G') : null;
const TRI = {}; // hexagram number → [upper, lower]
for (let n = 1; n <= 64; n++) TRI[n] = null;

function linee(g) { // the four lines read in the short cascade
  const p = g.p, li = (n, l) => { const L = NJ[n].lines[l - 1]; return { n, l, b: L.branch, r: DS.rel(g.pers, L.el), h: L.fushen ? DS.rel(g.pers, L.fushen.el) : null }; };
  return { m: li(p.month.hex.n, p.month.line), lord: li(...p.id.lord), d: li(...p.id.day), s2: li(...p.id.dayHex) };
}
function filo(g, X, opt) {
  const L = linee(g); let t = 0;
  for (const k of Object.keys(PESI)) {
    if (opt.soloGiorno && (k === 'm' || k === 'lord')) continue;
    if (L[k].r === X) t += PESI[k]; else if (!opt.noNascoste && L[k].h === X) t += PESI[k] * NASCOSTA;
    if (opt.prezzo && L[k].r === ATTACCA[X]) t -= PESI[k];
  }
  return t;
}
function luck(g, prof) { // how many of the three Lucks show in monthly, block and day hexagram
  const p = g.p, tr = [p.month.hex, p.daily.block, p.daily.hex].map(h => [h.upper, h.lower]);
  let t = 0; for (const k of ['heaven', 'earth', 'fame']) for (const x of tr) if (x.indexOf(prof.K[k].t) >= 0) t++;
  return t;
}
const VAR = {
  'filo': (g, X) => filo(g, X, {}),
  'senza nascoste': (g, X) => filo(g, X, { noNascoste: true }),
  'filo − prezzo': (g, X) => filo(g, X, { prezzo: true }),
  'solo giorno': (g, X) => filo(g, X, { soloGiorno: true }),
  'Luck': (g, X, prof) => luck(g, prof),
};

function prova(b, data, lon, scopo) {
  const Pn = pillars(b.date, b.time, b.lon, b.tz), R = H.fromPillars(Pn, b.male), ctx = DS.context(R, Pn, b.male);
  const Y = +data.slice(0, 4), s = DS.scan(ctx, Date.UTC(Y, 0, 1), Date.UTC(Y, 11, 31), lon, 'wealth');
  const me = s.days.find(x => new Date(x.date).toISOString().slice(0, 10) === data); if (!me) return null;
  const X = relScopo(scopo, b.male), pct = {};
  for (const [k, f] of Object.entries(VAR)) {
    const v = f(me, X, ctx.prof), above = s.days.filter(x => f(x, X, ctx.prof) > v + 1e-9).length, same = s.days.filter(x => Math.abs(f(x, X, ctx.prof) - v) < 1e-9).length;
    pct[k] = (above + (same + 1) / 2) / s.days.length;
  }
  return { me, X, pct, L: linee(me), n: s.days.length };
}

// the large group: positive events of the famous_* files, purpose from the text (keywords fixed before the run)
const REGOLE = [
  ['relationship', /\b(marri|wedding|weds\b|spos[ao]|matrimonio|nozze)/i],
  ['officer', /\b(elected|re-elected|appointed|inaugurat|coronat|sworn|crowned|becomes (prime|president|chancellor|pope|king|queen|leader|secretary|minister|governor|mayor|emperor)|elett[oa]|nominat[oa]|incoronat|diventa (primo|presidente|papa|re\b|cancelliere|segretario|capo)|giura)/i],
  ['parent', /\b(signs|signed|contract|treaty|accord\b|agreement|graduat|doctorate|degree|diploma|firma|trattato|contratto|laurea|accordo)/i],
  ['output', /\b(released|publish|premiere|debut|first (issue|episode|performance|concert|exhibition)|launch|pubblic|esce\b|uscita|debutt|prima (assoluta|rappresentazione|proiezione))/i],
];
function gruppoGrande() {
  const gia = new Set(N30.EVENTI.map(e => e.chi + e.d)), out = [];
  for (const f of ['famous_arts', 'famous_politics', 'famous_violent']) for (const p of require(path.join(__dirname, '..', f + '.json')).people) {
    const b = N30.PEOPLE[p.name]; if (!b || !/^A/.test(b.rodden || '') || p.weakTime) continue;
    for (const e of p.events || []) {
      if (e.polarity !== '+' || gia.has(p.name + e.date)) continue;
      const r = REGOLE.find(x => x[1].test(e.what)); if (r) out.push({ chi: p.name, d: e.date, scopo: r[0], cosa: e.what, b });
    }
  }
  return out;
}

function riassunto(nome, righe) {
  const ok = righe.filter(Boolean), m = k => ok.reduce((s, x) => s + x.pct[k], 0) / ok.length;
  const es = k => { const a = m(k); return Math.sqrt(ok.reduce((s, x) => s + (x.pct[k] - a) ** 2, 0) / (ok.length - 1) / ok.length); };
  console.log(`\n${nome}: ${ok.length} eventi. Percentile medio (caso 50, basso = meglio) ± errore, e quanti nel miglior quarto`);
  for (const k of Object.keys(VAR)) {
    const per = sc => { const a = ok.filter(x => x.scopo === sc); return a.length ? `${sc} ${(100 * a.reduce((s, x) => s + x.pct[k], 0) / a.length).toFixed(0)} (${a.length})` : null; };
    console.log(`  ${k.padEnd(16)} ${(100 * m(k)).toFixed(1).padStart(5)} ± ${(100 * es(k)).toFixed(1)}   miglior quarto ${ok.filter(x => x.pct[k] <= 0.25).length}/${ok.length}   ` + ['officer', 'output', 'parent', 'relationship'].map(per).filter(Boolean).join(' · '));
  }
  // how often the purpose relation sits on the day line, against the days of the same year
  const colpi = ok.filter(x => x.L.d.r === x.X || x.L.s2.r === x.X).length;
  console.log(`  relazione dello scopo su primario o esito nel giorno dell'evento: ${colpi}/${ok.length}`);
}

if (require.main === module) {
  const det = process.argv.includes('dettaglio');
  const riga = (e, lon) => { const x = prova(e.b, e.d, lon, e.scopo); if (!x) return null; x.scopo = e.scopo;
    if (det) console.log(`${e.chi.slice(0, 24).padEnd(24)} ${e.d} ${e.scopo.padEnd(12)} ${x.X}  filo ${(100 * x.pct.filo).toFixed(0).padStart(3)}  ` + ['m', 'lord', 'd', 's2'].map(k => `${k} ${x.L[k].n}.${x.L[k].l} ${x.L[k].b} ${x.L[k].r}${x.L[k].h ? '(' + x.L[k].h + ')' : ''}`).join('  '));
    return x; };
  riassunto('30 eventi nuovi', N30.EVENTI.map(e => riga({ chi: e.chi, d: e.d, scopo: e.scopo, b: N30.PEOPLE[e.chi] }, e.luogo[0])));
  const G = gruppoGrande();
  riassunto('Gruppo grande', G.map(e => riga(e, e.b.lon)));
}
module.exports = { filo, linee, relScopo, VAR, PESI };

// HLLS — confronto tra le due regole dell'esagramma mensile (Edu, 10/11/2026).
//   calc = calcolatore di riferimento (in uso): mesi dai Jie (寅 = 1), linee dalla linea sopra la mossa, mutazioni cumulative.
//   edu  = regola scritta da Edu il 10/11: mesi dal Solstizio d'Inverno ai 中氣; la linea k dell'annuale governa i mesi
//          2k−1 e 2k (dispari: annuale con la linea k mutata; pari: anche la correlata); blocchi di 5 giorni dal giorno del 中氣.
// Ciclo e annuale sono uguali nelle due regole: cambiano mensile, blocco, linea del giorno, esagramma del giorno.
// Per ogni evento: la cascata con le due regole e il percentile del giorno nell'anno civile (Date Selection a cascata,
// ds_cascata.js luck2, pesi fissi). Eventi positivi: scopo indicato (percentile basso = giorno buono). Eventi negativi:
// punteggio senza la relazione (tempo + testo + Luck): percentile alto = giorno brutto.
// Uso: node confronto_mensile.js [json]     Eventi marcati src 'C' = aggiunti da Claude (date da verificare con Edu).
'use strict';
const path = require('path'), fs = require('fs');
const { natal, predict, pillars } = require('./heluo_cmp.js');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.window = global; require(path.join(__dirname, '..', '..', 'heluo-texts.js'));
const TX = global.XKDG_HELUO_TEXTS, H = global.XKDGHeluo;
process.argv.push('luck2');
const DS = require('./ds_cascata.js'), LK2 = require('./luck.js');

const NASC = {
  Gates: ['1955-10-28', '22:00', -122.33, 'America/Los_Angeles', true],
  Jobs: ['1955-02-24', '19:15', -122.42, 'America/Los_Angeles', true],
  Zuckerberg: ['1984-05-14', '14:39', -73.87, 'America/New_York', true],
  Musk: ['1971-06-28', '05:29', 28.19, 'Africa/Johannesburg', true],
  Buffett: ['1930-08-30', '11:00', -95.94, 'America/Chicago', true],
  Rockefeller: ['1839-07-08', '23:50', -76.18, 'LMT', true],
  Diana: ['1961-07-01', '19:45', 0.50, 'Europe/London', false],
  Einstein: ['1879-03-14', '11:30', 9.99, 'LMT', true],
};
const LA = 'America/Los_Angeles', NY = 'America/New_York';
// tipo: scopo (wealth, output, parent, officer) = evento positivo; 'neg' = evento negativo; 'neu' = solo lettura
const EVENTI = [
  { chi: 'Gates', d: '1975-04-04', ora: '12:00', luogo: [-106.65, 'America/Denver'], tipo: 'output', cosa: 'fondazione di Microsoft', src: 'C' },
  { chi: 'Gates', d: '1986-03-13', ora: '06:30', luogo: [-122.33, LA], tipo: 'wealth', cosa: 'quotazione Microsoft', src: 'E' },
  { chi: 'Gates', d: '1995-08-24', ora: '11:00', luogo: [-122.12, LA], tipo: 'output', cosa: 'lancio di Windows 95', src: 'C' },
  { chi: 'Gates', d: '2021-05-03', ora: '13:30', luogo: [-122.20, LA], tipo: 'neg', cosa: 'annuncio del divorzio', src: 'C' },
  { chi: 'Jobs', d: '1976-04-01', ora: '12:00', luogo: [-122.11, LA], tipo: 'output', cosa: 'fondazione di Apple', src: 'C' },
  { chi: 'Jobs', d: '1980-12-12', ora: '06:30', luogo: [-122.03, LA], tipo: 'wealth', cosa: 'quotazione Apple', src: 'C' },
  { chi: 'Jobs', d: '1984-01-24', ora: '10:00', luogo: [-122.03, LA], tipo: 'output', cosa: 'presentazione del Macintosh', src: 'C' },
  { chi: 'Jobs', d: '1985-09-17', ora: '12:00', luogo: [-122.03, LA], tipo: 'neg', cosa: 'dimissioni da Apple (cacciato)', src: 'C' },
  { chi: 'Jobs', d: '1996-12-20', ora: '12:00', luogo: [-122.03, LA], tipo: 'wealth', cosa: 'Apple compra NeXT (ritorno)', src: 'C' },
  { chi: 'Jobs', d: '2001-10-23', ora: '10:00', luogo: [-122.03, LA], tipo: 'output', cosa: 'presentazione dell\'iPod', src: 'C' },
  { chi: 'Jobs', d: '2007-01-09', ora: '09:00', luogo: [-122.42, LA], tipo: 'output', cosa: 'presentazione dell\'iPhone', src: 'E' },
  { chi: 'Jobs', d: '2011-08-24', ora: '15:00', luogo: [-122.03, LA], tipo: 'neg', cosa: 'dimissioni da CEO (malattia)', src: 'C' },
  { chi: 'Jobs', d: '2011-10-05', ora: '15:00', luogo: [-122.14, LA], tipo: 'neg', cosa: 'morte', src: 'E' },
  { chi: 'Zuckerberg', d: '2004-02-04', ora: '12:00', luogo: [-71.12, NY], tipo: 'output', cosa: 'lancio di Facebook', src: 'E' },
  { chi: 'Zuckerberg', d: '2012-05-18', ora: '08:30', luogo: [-122.18, LA], tipo: 'wealth', cosa: 'quotazione Facebook', src: 'E' },
  { chi: 'Zuckerberg', d: '2012-05-19', ora: '12:00', luogo: [-122.18, LA], tipo: 'neu', cosa: 'nozze', src: 'E' },
  { chi: 'Musk', d: '2002-07-08', ora: '12:00', luogo: [-121.89, LA], tipo: 'wealth', cosa: 'eBay compra PayPal (annuncio)', src: 'E' },
  { chi: 'Musk', d: '2002-10-03', ora: '12:00', luogo: [-121.89, LA], tipo: 'wealth', cosa: 'eBay compra PayPal (chiusura)', src: 'E' },
  { chi: 'Musk', d: '2008-09-28', ora: '16:15', luogo: [-118.33, LA], tipo: 'output', cosa: 'primo lancio riuscito del Falcon 1', src: 'C' },
  { chi: 'Musk', d: '2010-06-29', ora: '06:30', luogo: [-122.14, LA], tipo: 'wealth', cosa: 'quotazione Tesla', src: 'C' },
  { chi: 'Buffett', d: '1965-05-10', ora: '12:00', luogo: [-95.94, 'America/Chicago'], tipo: 'officer', cosa: 'prende il controllo di Berkshire Hathaway', src: 'C' },
  { chi: 'Rockefeller', d: '1870-01-10', ora: '12:00', luogo: [-81.69, 'LMT'], tipo: 'output', cosa: 'fondazione della Standard Oil', src: 'C' },
  { chi: 'Rockefeller', d: '1937-05-23', ora: '04:05', luogo: [-81.06, NY], tipo: 'neg', cosa: 'morte', src: 'C' },
  { chi: 'Diana', d: '1981-07-29', ora: '11:20', luogo: [-0.10, 'Europe/London'], tipo: 'officer', cosa: 'nozze con Carlo', src: 'C' },
  { chi: 'Diana', d: '1982-06-21', ora: '21:03', luogo: [-0.17, 'Europe/London'], tipo: 'output', cosa: 'nascita di William', src: 'C' },
  { chi: 'Diana', d: '1992-12-09', ora: '15:30', luogo: [-0.12, 'Europe/London'], tipo: 'neg', cosa: 'annuncio della separazione', src: 'C' },
  { chi: 'Diana', d: '1996-08-28', ora: '10:30', luogo: [-0.12, 'Europe/London'], tipo: 'neg', cosa: 'divorzio', src: 'C' },
  { chi: 'Diana', d: '1997-08-31', ora: '00:25', luogo: [2.35, 'Europe/Paris'], tipo: 'neg', cosa: 'incidente a Parigi', src: 'E' },
  { chi: 'Einstein', d: '1905-06-30', ora: '12:00', luogo: [7.45, 'Europe/Zurich'], tipo: 'output', cosa: 'consegna dell\'articolo sulla relatività ristretta', src: 'C' },
  { chi: 'Einstein', d: '1915-11-25', ora: '12:00', luogo: [13.40, 'Europe/Berlin'], tipo: 'output', cosa: 'presenta le equazioni della relatività generale', src: 'C' },
  { chi: 'Einstein', d: '1919-11-07', ora: '12:00', luogo: [13.40, 'Europe/Berlin'], tipo: 'officer', cosa: 'fama mondiale (conferma dell\'eclissi sui giornali)', src: 'C' },
  { chi: 'Einstein', d: '1933-10-17', ora: '12:00', luogo: [-74.01, NY], tipo: 'neu', cosa: 'arrivo negli Stati Uniti', src: 'C' },
  { chi: 'Einstein', d: '1939-08-02', ora: '12:00', luogo: [-72.42, NY], tipo: 'parent', cosa: 'lettera a Roosevelt', src: 'C' },
  { chi: 'Einstein', d: '1940-10-01', ora: '12:00', luogo: [-74.76, NY], tipo: 'parent', cosa: 'cittadinanza americana', src: 'C' },
  { chi: 'Einstein', d: '1955-04-18', ora: '01:15', luogo: [-74.66, NY], tipo: 'neg', cosa: 'morte', src: 'C' },
];

const BR = '子丑寅卯辰巳午未申酉戌亥', ST = '甲乙丙丁戊己庚辛壬癸';
const TRI_EL = { Qian: 'Metal', Dui: 'Metal', Li: 'Fire', Zhen: 'Wood', Xun: 'Wood', Kan: 'Water', Gen: 'Earth', Kun: 'Earth' };
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const rel = (p, el) => el === p ? 'B' : GEN[p] === el ? 'C' : CTRL[p] === el ? 'W' : CTRL[el] === p ? 'G' : 'P';
const persona = (hx, line) => { const u = TRI_EL[hx.upper], l = TRI_EL[hx.lower]; return u === l ? u : (line <= 3 ? l : u); };
const st = (n, l) => (TX[n] && TX[n].lines[l] ? TX[n].lines[l].statement : '');
const rank = (all, me, f) => { const v = f(me), s = all.filter(x => f(x) > v).length, p = all.filter(x => f(x) === v).length; return (s + (p + 1) / 2) / all.length; };
const base = g => Math.round((g.c.tot - g.c.rs + g.a.tot - g.a.rs + g.d.tot - g.d.rs + g.L2.tot) * 100) / 100;
const giornoSolo = g => Math.round((g.d.tot - g.d.rs) * 100) / 100; // tempo + testo della sola linea del giorno

function unEvento(e, regola) {
  if (regola === 'edu' || regola === 'yin1') process.env.HL_MENSILE = regola; else delete process.env.HL_MENSILE;
  const [d0, t0, lon0, tz0, male] = NASC[e.chi], Pn = pillars(d0, t0, lon0, tz0), N = natal('A', Pn, male);
  const Pe = pillars(e.d, e.ora, e.luogo[0], e.luogo[1]), p = predict(N, Pe, e.luogo[0]);
  if (p.none) return { fuori: true, eta: p.age };
  const hx = p.phase === 'XT' ? N.xt : N.ht.hex, pers = persona(hx, p.id.cycle[1]);
  const nat = { day: Pn.day, year: N.pillars[3], luck: H.fromPillars(Pn, male).luck, prof: LK2.profilo(Pn, male) };
  const Y = +e.d.slice(0, 4), scopo = ['neg', 'neu'].includes(e.tipo) ? 'wealth' : e.tipo;
  const all = DS.anno(N, nat, Y, e.luogo[0], e.luogo[1], scopo), me = all.find(x => x.date === e.d);
  const li = (n, l) => { const L = NJ[n].lines[l - 1]; return { n, l, b: L.branch, el: L.el, r: rel(pers, L.el), testo: st(n, l), fushen: L.fushen ? rel(pers, L.fushen.el) + ' ' + L.fushen.branch : null }; };
  return {
    eta: p.age, pers, pil: [Pe.hour, Pe.day, Pe.month, Pe.year], fase: p.phase, giornoMese: +p.day.match(/\(d(\d+)\)/)[1], mIndex: p.mIndex, mChanged: p.mChanged, mStart: p.mStart,
    ciclo: li(...p.id.cycle), annuale: li(...p.id.year), mensile: p.id.month[0], signore: li(...p.id.lord), giorno: li(...p.id.day), esaGiorno: li(...p.id.dayHex),
    linee: { ciclo: hx.lines, annuale: p.annLines, mensile: p.moLines, blocco: p.blockLines, giorno: p.dayLines },
    cicli: (p.phase === 'XT' ? N.cXT : N.cHT).map(c => [c.line, c.from, c.to]),
    ds: { tot: me.tot, pct: rank(all, me, x => x.tot), base: base(me), pctBase: rank(all, me, base), pctGiorno: rank(all, me, giornoSolo),
      d: { r: me.d.r, rs: me.d.rs, t: me.d.tm.t, note: me.d.tm.note, s: me.d.s, txt: me.d.txt, tot: me.d.tot }, luck: me.L2.tot, luckW: me.L2.w, n: all.length },
  };
}

const tutti = EVENTI.map(e => ({ ...e, calc: unEvento(e, 'calc'), edu: unEvento(e, 'edu') }));
const fuori = tutti.filter(e => e.calc.fuori), out = tutti.filter(e => !e.calc.fuori);
delete process.env.HL_MENSILE;
module.exports = { out, EVENTI, NASC };
if (require.main === module) {
  if (process.argv.includes('json')) { fs.writeFileSync(path.join(__dirname, 'confronto_mensile.json'), JSON.stringify(out)); }
  fuori.forEach(e => console.log(`FUORI DAI CICLI: ${e.chi} ${e.d} ${e.cosa} (età ${e.calc.eta})`));
  const pc = x => String(Math.round(100 * x)).padStart(3);
  const f = (x) => `${String(x.mensile).padStart(2)}→${String(x.signore.n).padStart(2)} l${x.giorno.l} ${x.giorno.b} ${x.giorno.r} →${String(x.esaGiorno.n).padStart(2)} ${x.esaGiorno.b} ${x.esaGiorno.r}`;
  console.log('evento'.padEnd(52) + 'tipo     | CALC mens→blocco linea → giorno    pct base | EDU  mens→blocco linea → giorno    pct base');
  for (const e of out) console.log(`${(e.chi + ' ' + e.d + ' ' + e.cosa).slice(0, 50).padEnd(52)}${e.tipo.padEnd(8)} | ${f(e.calc).padEnd(34)} ${pc(e.calc.ds.pct)} ${pc(e.calc.ds.pctBase)}  | ${f(e.edu).padEnd(34)} ${pc(e.edu.ds.pct)} ${pc(e.edu.ds.pctBase)}`);
  const media = (a, k, r) => a.length ? (100 * a.reduce((s, e) => s + e[r].ds[k], 0) / a.length).toFixed(0) : '-';
  const pos = out.filter(e => !['neg', 'neu'].includes(e.tipo)), neg = out.filter(e => e.tipo === 'neg');
  const gruppi = [['positivi, tutti', pos, 'pct'], ['positivi, già di Edu (6)', pos.filter(e => e.src === 'E'), 'pct'], ['positivi, aggiunti', pos.filter(e => e.src === 'C'), 'pct'],
    ['positivi milionari', pos.filter(e => !['Diana', 'Einstein'].includes(e.chi)), 'pct'], ['positivi Einstein', pos.filter(e => e.chi === 'Einstein'), 'pct'], ['positivi Diana', pos.filter(e => e.chi === 'Diana'), 'pct'],
    ['negativi (base)', neg, 'pctBase'], ['positivi (solo linea del giorno)', pos, 'pctGiorno'], ['negativi (solo linea del giorno)', neg, 'pctGiorno']];
  console.log('\nPercentile medio (positivi: basso = meglio; negativi: alto = meglio; caso 50)');
  for (const [nome, a, k] of gruppi) console.log(`  ${nome.padEnd(34)} n=${String(a.length).padStart(2)}  calc ${media(a, k, 'calc').padStart(3)}  edu ${media(a, k, 'edu').padStart(3)}`);
  const win = (a, k, low) => { let c = 0, d = 0, p = 0; a.forEach(e => { const x = e.calc.ds[k], y = e.edu.ds[k]; if (Math.abs(x - y) < 0.005) p++; else if ((x < y) === low) c++; else d++; }); return `calc meglio ${c}, edu meglio ${d}, pari ${p}`; };
  console.log('  positivi: ' + win(pos, 'pct', true) + '\n  negativi: ' + win(neg, 'pctBase', false));
  const cnt = (a, r, fn) => a.filter(e => fn(e[r])).length;
  for (const r of ['calc', 'edu']) console.log(`  ${r}: positivi con la relazione dello scopo sulla linea del giorno ${cnt(pos, r, x => x.ds.d.rs === 2)}/${pos.length}; con tempo favorevole ${cnt(pos, r, x => x.ds.d.t > 0)}/${pos.length}; negativi con Ghost sulla linea del giorno ${cnt(neg, r, x => x.giorno.r === 'G')}/${neg.length}, o nell'esagramma del giorno ${cnt(neg, r, x => x.esaGiorno.r === 'G')}/${neg.length}; negativi con tempo sfavorevole ${cnt(neg, r, x => x.ds.d.t < 0)}/${neg.length}`);
}

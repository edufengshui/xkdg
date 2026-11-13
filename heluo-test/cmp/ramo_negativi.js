// HLLS — ramo del giorno, regola 1 sui famosi: il giorno che scontra la linea rilevante (mese, Lord, giorno) nei giorni negativi vs positivi vs tutti.
'use strict';
const path = require('path');
const { pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo, NJ = global.HeluoNaJia, SC = global.XKDG_HELUO_SCORES;
const BR = '子丑寅卯辰巳午未申酉戌亥', clash = b => BR[(BR.indexOf(b) + 6) % 12];
function colpo(th) { // linee rilevanti scontrate dal giorno
  const p = th.p, dB = th.Pe.day[1], out = [];
  [['m', p.month.hex.n, p.month.line], ['lord', p.id.lord[0], p.id.lord[1]], ['d', p.id.day[0], p.id.day[1]]].forEach(([k, n, l]) => {
    const L = NJ[n].lines[l - 1]; if (L.branch === clash(dB)) out.push({ k, n, l, s: SC[n] ? SC[n].l[l] : 0 }); });
  return out;
}
const scopo = e => /divor|separa|split/i.test(e.what) ? 'relationship' : (e.violent || /died|death|muore|morto|morte|ucciso|assassin|suicid|killed|shot|uccis|incidente|crash/i.test(e.what)) ? 'health' : 'career';
const R = { neg: [], pos: [] }; let base = { n: 0, hit: 0, negTxt: 0 };
for (const f of ['famous_arts', 'famous_politics', 'famous_violent']) for (const q of require(path.join(__dirname, '..', f + '.json')).people) {
  const b = q.birth, tz = b.tz || (b.lmt ? 'LMT' : 'UTC' + (b.utcOffset >= 0 ? '+' : '') + b.utcOffset), male = (q.sex || 'M') === 'M';
  let Pn; try { Pn = pillars(b.date, b.time, b.lon, tz); } catch (e) { continue; }
  const ctx = DS.context(H.fromPillars(Pn, male), Pn, male);
  for (const e of q.events) {
    const [y, mo, d] = e.date.split('-').map(Number), Pe = DS.pillarsTstNoon(y, mo, d, b.lon), key = scopo(e);
    let th; try { th = DS.thread(ctx, Pe, b.lon, key); } catch (x) { continue; } if (!th) continue;
    const c = colpo(th); R[e.polarity === '-' ? 'neg' : 'pos'].push({ c, key });
    // base: 30 giorni a caso nello stesso anno
    for (let i = 0; i < 30; i++) { const t = Date.UTC(y, 0, 1) + Math.floor(((i * 12.17) % 365)) * 864e5, dd = new Date(t), P2 = DS.pillarsTstNoon(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(), b.lon);
      let t2; try { t2 = DS.thread(ctx, P2, b.lon, key); } catch (x) { continue; } if (!t2) continue; const c2 = colpo(t2); base.n++; if (c2.length) { base.hit++; if (c2.some(x => x.s < 0)) base.negTxt++; } }
  }
}
const pc = (a, b) => (100 * a / b).toFixed(1) + '%';
for (const k of ['neg', 'pos']) { const a = R[k], h = a.filter(x => x.c.length), hn = h.filter(x => x.c.some(y => y.s < 0)), hp = h.filter(x => x.c.some(y => y.s > 0));
  console.log(k, 'eventi', a.length, '| giorno scontra linea rilevante', h.length, pc(h.length, a.length), '| con testo negativo', hn.length, '| positivo', hp.length,
    '| per scopo', JSON.stringify(Object.fromEntries(['health', 'career', 'relationship'].map(s => [s, a.filter(x => x.key === s).length + '/' + h.filter(x => x.key === s).length])))); }
console.log('tutti i giorni (base)', base.n, '| scontro', pc(base.hit, base.n), '| con testo negativo', pc(base.negTxt, base.hit));

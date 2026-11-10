// Check of the monthly rule adopted by Edu on 10/11/2026 (claude/hlls-mensile-decisione.md): months from the 中氣,
// line k of the annual for months 2k-1 and 2k. Compares the APP (heluo-lishu.js + heluo-ds.js) with the prototype
// (heluo_cmp.js, default rule 'edu') hexagram by hexagram, not only the totals (ds_app_check.js does the totals).
//   1) Edu's example: annual 19 -> month 1 = 7, month 2 = 40, month 3 = 24
//   2) the three control values of the decision document (Gates, Diana, Jobs)
//   3) the 34 events of confronto_mensile.js and every day of their years: month index, monthly, block, day line,
//      day hexagram, day of the month
//   4) the app's month table (monthStarts in true solar time) starts on the same day as the prototype's 中氣 day
// Uso: node mensile_app_check.js
'use strict';
const path = require('path');
delete process.env.HL_MENSILE;
const { natal, predict, pillars } = require('./heluo_cmp.js');
global.HeluoNaJia = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
global.XKDG_HELUO_SCORES = require(path.join(__dirname, '..', '..', 'heluo-scores.js'));
const DS = require(path.join(__dirname, '..', '..', 'heluo-ds.js'));
const H = global.XKDGHeluo;
const { EVENTI, NASC } = require('./confronto_mensile.js');
delete process.env.HL_MENSILE;
let bad = 0;
const ok = (c, msg) => { if (!c) { bad++; console.log('  ✗ ' + msg); } return c; };

// 1) example
const A19 = H.hexOf([1, 1, 0, 0, 0, 0]); // 19 Lin: Dui below, Kun above
const ex = [1, 2, 3].map(i => H.monthlyHex(A19.lines, i).hex.n);
console.log('1) annual ' + A19.n + ' -> months 1-3: ' + ex.join(', ') + ' (expected 7, 40, 24)');
ok(A19.n === 19 && ex.join() === '7,40,24', 'example 19');

// 2) control values: [who, date, hour, place, month index, monthly, block hexagram, day line (branch, relation), day hexagram]
const CTRL = [
  ['Gates', '1986-03-13', '06:30', [-122.33, 'America/Los_Angeles'], 3, 24, 3, 'l3 辰 P', 63],
  ['Diana', '1997-08-31', '00:25', [2.35, 'Europe/Paris'], 9, 20, 59, 'l5 巳 W', 4],
  ['Jobs', '2011-10-05', '15:00', [-122.14, 'America/Los_Angeles'], 10, 56, 35, 'l6 巳 C', 16],
];
const REL = (pers, el) => DS.rel(pers, el);
console.log('2) control values (app):');
for (const [who, d, t, pl, eM, eMo, eB, eL, eD] of CTRL) {
  const b = NASC[who], Pn = pillars(b[0], b[1], b[2], b[3]), R = H.fromPillars(Pn, b[4]);
  const Pe = pillars(d, t, pl[0], pl[1]), p = DS.predict(R, Pe, pl[0]), pers = DS.persona(p.hx, p.per.line);
  const L = global.HeluoNaJia[p.daily.block.n].lines[p.daily.line - 1], lbl = 'l' + p.daily.line + ' ' + L.branch + ' ' + REL(pers, L.el);
  console.log(`   ${who} ${d}: TST ${Pe.meta.tst.d}/${Pe.meta.tst.mo} · month ${p.month.index} · monthly ${p.month.hex.n} · day ${p.dayOfMonth} · block ${p.daily.block.n} (Lord l${p.daily.lord}) · ${lbl} · day hex ${p.daily.hex.n}`);
  ok(p.month.index === eM && p.month.hex.n === eMo && p.daily.block.n === eB && lbl === eL && p.daily.hex.n === eD, who + ' control value');
}

// 3) app vs prototype on the events and on every day of their years (civil noon)
let n = 0, nd = 0;
for (const e of EVENTI) {
  const b = NASC[e.chi], Pn = pillars(b[0], b[1], b[2], b[3]), R = H.fromPillars(Pn, b[4]), N = natal('A', Pn, b[4]);
  const lon = e.luogo[0], tz = e.luogo[1], Y = +e.d.slice(0, 4);
  const cmp = (Pe, lbl) => {
    const a = DS.predict(R, Pe, lon), q = predict(N, Pe, lon); n++;
    if (a.none || q.none) return ok(!!a.none === !!q.none, lbl + ' none');
    const A = [a.month.index, a.month.hex.n, a.daily.lord, a.daily.block.n, a.daily.line, a.daily.hex.n, a.dayOfMonth].join();
    const B = [q.mIndex, q.month, q.lord, q.id.lord[0], q.dLine, q.id.dayHex[0], +q.day.match(/\(d(\d+)\)/)[1]].join();
    if (A !== B) { nd++; if (nd < 6) console.log('  ✗ ' + lbl + ' app ' + A + ' · prototype ' + B); bad++; }
  };
  cmp(pillars(e.d, e.ora, lon, tz), e.chi + ' ' + e.d);
  for (let t = Date.UTC(Y, 0, 1); t < Date.UTC(Y + 1, 0, 1); t += 86400000) { const d = new Date(t).toISOString().slice(0, 10); cmp(pillars(d, '12:00', lon, tz), e.chi + ' ' + d); }
}
console.log(`3) app vs prototype: ${n} moments, ${nd} different (month, monthly, Lord, block, day line, day hexagram, day of month)`);

// 4) month table of the app (true solar time) vs the 中氣 day of the prototype, Heluo years 1980-2030 at three longitudes
let nt = 0, dt = 0;
for (const lon of [-122.3, 12.1, 116.4]) for (let Y = 1980; Y <= 2030; Y++) {
  const ms = H.periods.months(Y, lon);
  ok(ms.length === 13 && ms[0].index === 1 && ms[11].index === 12 && ms[12].end, 'table shape ' + Y);
  for (let i = 0; i < 12; i++) {
    nt++;
    const s = H.periods.dayMs(ms[i].start), mid = new Date(s + 3 * 86400000); // a day inside the month: its 中氣 day must be s
    const P = global.XKDGSolarTime.pillarsFromUtc(Date.UTC(mid.getUTCFullYear(), mid.getUTCMonth(), mid.getUTCDate(), 12) - lon * 4 * 60000, lon);
    const qm = H.qiMonth(P);
    if (qm.index !== i + 1) { dt++; if (dt < 4) console.log('  ✗ table ' + Y + ' month ' + (i + 1) + ' -> ' + qm.index); bad++; }
  }
}
console.log(`4) month table: ${nt} months checked, ${dt} wrong`);
const ap = H.periods.annual(H.periods.months(2026, 12.1));
console.log('   periods of the annual lines, Heluo year 2026: ' + [1, 2, 3, 4, 5, 6].map(k => 'l' + k + ' ' + ap.cap[k]).join(' | '));
console.log(bad ? `\n${bad} PROBLEMS` : '\nAll checks passed.');
process.exit(bad ? 1 : 0);

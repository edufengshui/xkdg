// He Luo Li Shu — comparison of methods A / B / C against dated life events.
// A = app (Edu's slides): Heluo year from the Winter Solstice, Na Jia, 29/3/39 option a, calculator annual+monthly.
// B = reference calculator: Lichun year, Na Jia, 29/3/39 always special on lines 5/6 (Diana 29 l6 -> 59), calculator annual+monthly.
// C = "Calculation Guide and Sources": Lichun year, He Tu stems 1..10, -25/-30 reductions, 5 by sex x year polarity,
//     29/3/39 normal, calculator annual, guide monthly (odd month = line (i+1)/2, even = + partner).
// Daily line for all: 5 days per line of the monthly hexagram from the Jie day (TST date), day 31 -> line 1.
// True solar time everywhere (birth place longitude).
'use strict';
const path = require('path'), fs = require('fs');
const REPO = process.env.XKDG_REPO || require('path').join(__dirname, '..', '..');
const Lunar = require('lunar-javascript');
global.window = global; global.Solar = Lunar.Solar; global.Lunar = Lunar.Lunar;
global.document = { getElementById: () => null };
require(path.join(REPO, 'solar-time.js'));
require(path.join(REPO, 'heluo-lishu.js'));
const ST = global.XKDGSolarTime, H = global.XKDGHeluo;
const SC = JSON.parse(fs.readFileSync(path.join(__dirname, 'scores.json')));

const NAJIA_N = [6,2,8,7,1,9,3,4,6,2], HETU_STEM = [1,2,3,4,5,6,7,8,9,10];
const HETU = [[1,6],[5,10],[3,8],[3,8],[5,10],[7,2],[7,2],[5,10],[9,4],[9,4],[5,10],[1,6]];
const NUM_TRI = { 1:'Kan', 2:'Kun', 3:'Zhen', 4:'Xun', 6:'Qian', 7:'Dui', 8:'Gen', 9:'Li' };

function tzOffsetMin(tz, y, mo, d, h, mi) { // like Date.getTimezoneOffset (minutes, west positive) for a local wall time
  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(guess));
    const g = k => +p.find(x => x.type === k).value;
    const asLocal = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'));
    const off = (asLocal - guess) / 60000; guess = Date.UTC(y, mo - 1, d, h, mi) - off * 60000;
    if (i === 2) return -off;
  }
}
function pillars(date, time, lon, tz) {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = (time || '12:00').split(':').map(Number);
  // tz may be an IANA zone, 'LMT' (local mean time of the place) or 'UTC+h' / 'UTC-h' (fixed)
  const off = tz === 'LMT' ? -lon * 4 : /^UTC[+-]/.test(tz) ? -parseFloat(tz.slice(3)) * 60 : tzOffsetMin(tz, y, mo, d, h, mi);
  return ST.pillarsFromCivil(y, mo, d, h, mi, 0, lon, off);
}
const bjDate = P => new Date(Date.UTC(P.meta.beijing.y, P.meta.beijing.mo - 1, P.meta.beijing.d, P.meta.beijing.h, P.meta.beijing.mi, P.meta.beijing.s || 0));
const STEMS = H.STEMS, BR = H.BRANCHES;
function lichunYear(P) { // Gregorian number of the solar (Lichun) year pillar
  const y = P.meta.beijing.y, gz = STEMS[((y - 4) % 10 + 10) % 10] + BR[((y - 4) % 12 + 12) % 12];
  return gz === P.year ? y : y - 1;
}
function wsYear(P) { const t = bjDate(P), y = P.meta.beijing.y; return t >= H.seasonTerms(y).WS ? y + 1 : y; }
function season(P) { const t = bjDate(P), S = H.seasonTerms(P.meta.beijing.y); return t >= S.WS ? 0 : t >= S.AE ? 3 : t >= S.SS ? 2 : t >= S.SE ? 1 : 0; }

function wrap6(x) { return ((x - 1) % 6 + 6) % 6 + 1; }
function partner(l) { return l <= 3 ? l + 3 : l - 3; }
function flip(lines, set) { const b = lines.slice(); set.forEach(x => { b[x - 1] = 1 - b[x - 1]; }); return b; }

// ---- natal per method ------------------------------------------------------------------------
function natal(method, P, male) {
  const year = method === 'A' ? wsYear(P) : lichunYear(P);
  const ys = ((year - 4) % 10 + 10) % 10, yb = ((year - 4) % 12 + 12) % 12;
  const stems = [ys, STEMS.indexOf(P.month[0]), STEMS.indexOf(P.day[0]), STEMS.indexOf(P.hour[0])];
  const brs = [yb, BR.indexOf(P.month[1]), BR.indexOf(P.day[1]), BR.indexOf(P.hour[1])];
  const sea = season(P), yangDun = sea <= 1, yangYear = year % 2 === 0;
  const odd = [], even = [];
  for (let i = 0; i < 4; i++) {
    const sn = (method === 'C' ? HETU_STEM : NAJIA_N)[stems[i]]; (sn % 2 ? odd : even).push(sn);
    odd.push(HETU[brs[i]][0]); even.push(HETU[brs[i]][1]);
  }
  const Hs = odd.reduce((a, b) => a + b, 0), Es = even.reduce((a, b) => a + b, 0);
  let hT, eT, note = '';
  if (method === 'C') {
    const red = (n, base) => { if (n > base) n -= base; let d = n % 10; if (d === 0) d = n / 10; return d; };
    const hn = red(Hs, 25), en = red(Es, 30), yangSide = (male && yangYear) || (!male && !yangYear);
    hT = hn === 5 ? (yangSide ? 'Gen' : 'Kun') : NUM_TRI[hn];
    eT = en === 5 ? (yangSide ? 'Kun' : 'Gen') : NUM_TRI[en];
    if (hn === 5 || en === 5) note = 'five';
  } else {
    hT = H.heavenTrigram(Hs); eT = H.earthTrigram(Es);
    if (!hT) { // San Yuan
      const c = ((Math.floor((year - 1864) / 60) % 3) + 3) % 3;
      hT = c === 0 ? (male ? 'Gen' : 'Kun') : c === 2 ? (male ? 'Li' : 'Dui') : (male ? (yangYear ? 'Gen' : 'Kun') : (yangYear ? 'Kun' : 'Gen'));
      note = 'five';
    }
  }
  const heavenUp = male ? yangYear : !yangYear;
  const xt = heavenUp ? H.hexFrom(hT, eT) : H.hexFrom(eT, hT);
  const at = H.lineBranches(xt.lines, brs[3], male, yangDun);
  let mv = null; for (let i = 0; i < 6; i++) if (at[i].indexOf(brs[3]) >= 0) mv = i + 1;
  let ht;
  const sp = [29, 3, 39].indexOf(xt.n) >= 0 && (mv === 5 || mv === 6);
  if (method === 'A' && sp && ((mv === 5 && brs[1] >= 6) || (mv === 6 && brs[1] <= 5))) ht = { hex: H.hexOf(flip(xt.lines, [mv])), line: mv, special: true };
  else if (method === 'B' && sp) ht = { hex: H.hexOf(flip(xt.lines, [mv])), line: mv, special: true };
  else { const l = flip(xt.lines, [mv]); ht = { hex: H.hexOf(l.slice(3).concat(l.slice(0, 3))), line: mv <= 3 ? mv + 3 : mv - 3 }; }
  const cXT = H.cycles(xt.lines, mv, 1), cHT = H.cycles(ht.hex.lines, ht.line, cXT[5].to + 1);
  return { method, year0: year, Hs, Es, hT, eT, note, xt, mv, ht, cXT, cHT, pillars: [P.hour, P.day, P.month, STEMS[ys] + BR[yb]] };
}

// ---- prediction for a moment -------------------------------------------------------------------
function jieStartTstDay(Pe, lon) { // TST calendar day (ms at 00:00) of the Jie that opened the event's solar month
  const b = Pe.meta.beijing;
  const jie = Lunar.Solar.fromYmdHms(b.y, b.mo, b.d, b.h, b.mi, b.s || 0).getLunar().getPrevJie(false).getSolar();
  const utc = Date.UTC(jie.getYear(), jie.getMonth() - 1, jie.getDay(), jie.getHour(), jie.getMinute(), jie.getSecond()) - 8 * 3600000;
  const tst = new Date(utc + (lon * 4 + ST.equationOfTimeMinutes(new Date(utc))) * 60000);
  return Date.UTC(tst.getUTCFullYear(), tst.getUTCMonth(), tst.getUTCDate());
}
function predict(N, Pe, lon) {
  const Y = N.method === 'A' ? wsYear(Pe) : lichunYear(Pe), age = Y - N.year0 + 1;
  let per = null, hx = null, phase = null;
  N.cXT.forEach(c => { if (age >= c.from && age <= c.to) { per = c; hx = N.xt; phase = 'XT'; } });
  if (!per) N.cHT.forEach(c => { if (age >= c.from && age <= c.to) { per = c; hx = N.ht.hex; phase = 'HT'; } });
  if (!per) return { age, none: true };
  const k = age - per.from + 1, startYear = N.year0 + per.from - 1;
  const a = H.annualHex(hx.lines, per.line, k, startYear % 2 === 0);
  const br = BR.indexOf(Pe.month[1]);
  let mo;
  if (N.method === 'C') { const i = (br - 2 + 12) % 12 + 1, L = Math.ceil(i / 2), S = [L]; if (i % 2 === 0) S.push(partner(L)); mo = { hex: H.hexOf(flip(a.hex.lines, S)) }; }
  else mo = H.monthlyHex(a.hex.lines, a.moved, br);
  const t = Pe.meta.tst, tday = Date.UTC(t.y, t.mo - 1, t.d);
  const dayIdx = Math.round((tday - jieStartTstDay(Pe, lon)) / 86400000), dLine = Math.floor(dayIdx / 5) % 6 + 1;
  const ls = (n, l) => { if (!SC[n] || !SC[n].lines[l]) throw new Error("score " + n + " l" + l + " dayIdx " + dayIdx + " " + JSON.stringify(Pe.meta.tst)); return SC[n].lines[l].s; }, hs = n => SC[n].hex;
  return {
    age, phase, period: hx.n + ' l' + per.line + ' (' + per.from + '-' + per.to + ')', annual: a.hex.n + ' l' + a.moved,
    month: mo.hex.n, day: mo.hex.n + ' l' + dLine + ' (d' + (dayIdx + 1) + ')',
    id: { cycle: [hx.n, per.line], year: [a.hex.n, a.moved], yearHex: [a.hex.n, 0], month: [mo.hex.n, 0], day: [mo.hex.n, dLine] },
    s: { cycle: ls(hx.n, per.line), year: ls(a.hex.n, a.moved), yearHex: hs(a.hex.n), month: hs(mo.hex.n), day: ls(mo.hex.n, dLine) }
  };
}

module.exports = { natal, predict, pillars };

if (require.main === module) { // quick check: Diana
  const P = pillars('1961-07-01', '19:45', 0.50, 'Europe/London');
  for (const m of ['A', 'B', 'C']) {
    const N = natal(m, P, false);
    console.log(m, N.pillars.join(' '), 'H', N.Hs, 'E', N.Es, 'XT', N.xt.n, 'l' + N.mv, '→ HT', N.ht.hex.n, 'l' + N.ht.line, N.note);
    const Pe = pillars('1997-08-31', '00:25', 0.50, 'Europe/London');
    console.log('   death', JSON.stringify(predict(N, Pe, 0.5)));
  }
}

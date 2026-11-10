// He Luo Li Shu — comparison of methods A / B / C against dated life events.
// A = app (Edu's slides): Heluo year from the Winter Solstice, Na Jia, 29/3/39 option a, calculator annual+monthly.
// B = reference calculator: Lichun year, Na Jia, 29/3/39 always special on lines 5/6 (Diana 29 l6 -> 59), calculator annual+monthly.
// C = "Calculation Guide and Sources": Lichun year, He Tu stems 1..10, -25/-30 reductions, 5 by sex x year polarity,
//     29/3/39 normal, calculator annual, guide monthly (odd month = line (i+1)/2, even = + partner).
// Monthly: Edu's rule (10/11/2026), months from the 中氣 — see below (HL_MENSILE for the rejected variants).
// Daily hexagram for all (Edu, 10/11/2026, Lord of the Block): 5-day blocks from the day of the 中氣 (TST date); block k:
// line k%6+1 of the monthly changes -> block hexagram; each day one of the other lines (rising from the line above the
// Lord, after 6 back to 1) changes on the block hexagram -> day hexagram. Day level = that line in the block hexagram.
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
// ---- monthly hexagram, rule of Edu (10/11/2026) --------------------------------------------------
// DEFAULT (HL_MENSILE unset or 'edu') — the rule Edu adopted on 10/11/2026 (claude/hlls-mensile-decisione.md), the
// same as the app (heluo-lishu.js monthlyHex/qiMonth, heluo-ds.js predict; ds_app_check.js must give 0 differences):
// the HLLS year starts at the Winter Solstice and its 12 months start at the 中氣 (冬至 = month 1,
// 大寒 2, 雨水 3 … 小雪 12). Line k of the annual rules months 2k-1 and 2k: odd month = annual with line k changed;
// even month = the previous month with the correlate of k changed too. No accumulation; the moved line of the
// annual is not used. The 5-day blocks of the Lord of the Block are counted from the day of the 中氣 (TST date).
// Rejected variants, kept only for comparisons:
// HL_MENSILE=cumul: months from the Jie, lines from the one above the moved line, cumulative; month index
// 子 = 1 … 亥 = 12 (in the app from commit 99d6079 until 10/11/2026).
// HL_MENSILE=yin1: the same with the old numbering of the reference calculator (寅 = 1 … 丑 = 12), for comparisons.
// HL_MENSILE=coppie (Edu, 10/11/2026, sera): Edu's rule on the twelve branches. Month 1 = the 15 days of Zi after the
// Winter Solstice, month 2 = Chou (from Xiaohan), month 3 = Yin … month 12 = Hai; months start at the Jie. Line k of
// the annual rules the pair of branches 2k-1, 2k (子丑, 寅卯, 辰巳, 午未, 申酉, 戌亥): odd month = annual with line k
// changed; even month = the previous month with the correlate changed too (two lines against the annual). No
// accumulation; the moved line of the annual is not used. The 15 days of Zi from Daxue to the Solstice are month 1
// again (line 1) on the annual of the year that is ending, like the Zi hour. Blocks of 5 days from the Jie.
function monthCoppie(A, monthBr) {
  const i = monthBr + 1, k = Math.ceil(i / 2), S = [k];
  if (i % 2 === 0) S.push(partner(k));
  return { hex: H.hexOf(flip(A, S)), changed: S.slice().sort(), index: i, line: k };
}
function monthCumul(A, moved, monthBr) { // the app's monthlyHex before 10/11/2026 (子 = 1, cumulative)
  const i = monthBr + 1, s = wrap6(moved + 1), j = Math.ceil(i / 2), S = [];
  for (let t = 0; t < j; t++) S.push(wrap6(s + t));
  if (i % 2 === 0) { const p = partner(wrap6(s + j - 1)), q = S.indexOf(p); if (q >= 0) S.splice(q, 1); else S.push(p); }
  return { hex: H.hexOf(flip(A, S)), changed: S.slice().sort(), index: i };
}
function monthYin1(A, moved, monthBr) {
  const i = (monthBr - 2 + 12) % 12 + 1, s = wrap6(moved + 1), j = Math.ceil(i / 2), S = [];
  for (let t = 0; t < j; t++) S.push(wrap6(s + t));
  if (i % 2 === 0) { const p = partner(wrap6(s + j - 1)), q = S.indexOf(p); if (q >= 0) S.splice(q, 1); else S.push(p); }
  return { hex: H.hexOf(flip(A, S)), changed: S.slice().sort(), index: i };
}
const QI = ['冬至', '大寒', '雨水', '春分', '谷雨', '小满', '夏至', '大暑', '处暑', '秋分', '霜降', '小雪'];
function prevQi(Pe) { const b = Pe.meta.beijing; return Lunar.Solar.fromYmdHms(b.y, b.mo, b.d, b.h, b.mi, b.s || 0).getLunar().getPrevQi(false); }
function monthEdu(annualLines, Pe) {
  const i = QI.indexOf(prevQi(Pe).getName()) + 1, k = Math.ceil(i / 2), S = [k];
  if (i % 2 === 0) S.push(partner(k));
  return { hex: H.hexOf(flip(annualLines, S)), index: i, line: k, changed: S };
}
function qiStartTstDay(Pe, lon) {
  const q = prevQi(Pe).getSolar();
  const utc = Date.UTC(q.getYear(), q.getMonth() - 1, q.getDay(), q.getHour(), q.getMinute(), q.getSecond()) - 8 * 3600000;
  const tst = new Date(utc + (lon * 4 + ST.equationOfTimeMinutes(new Date(utc))) * 60000);
  return Date.UTC(tst.getUTCFullYear(), tst.getUTCMonth(), tst.getUTCDate());
}
function predict(N, Pe, lon) {
  const RULE = process.env.HL_MENSILE || 'edu', EDU = RULE === 'edu';
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
  else if (EDU) mo = monthEdu(a.hex.lines, Pe);
  else if (RULE === 'coppie') mo = monthCoppie(a.hex.lines, br);
  else if (RULE === 'yin1') mo = monthYin1(a.hex.lines, a.moved, br);
  else if (RULE === 'cumul') mo = monthCumul(a.hex.lines, a.moved, br);
  else throw new Error('HL_MENSILE: unknown rule ' + RULE);
  const t = Pe.meta.tst, tday = Date.UTC(t.y, t.mo - 1, t.d);
  const start = EDU ? qiStartTstDay(Pe, lon) : jieStartTstDay(Pe, lon);
  const dayIdx = Math.max(0, Math.round((tday - start) / 86400000)), dh = H.dailyHex(mo.hex.lines, dayIdx + 1), dLine = dh.line;
  const ls = (n, l) => { if (!SC[n] || !SC[n].lines[l]) throw new Error("score " + n + " l" + l + " dayIdx " + dayIdx + " " + JSON.stringify(Pe.meta.tst)); return SC[n].lines[l].s; }, hs = n => SC[n].hex;
  return {
    age, phase, mIndex: mo.index, mChanged: mo.changed, mStart: start, moved: a.moved, lord: dh.lord, dLine, annLines: a.hex.lines, moLines: mo.hex.lines, blockLines: dh.block.lines, dayLines: dh.hex.lines,
    period: hx.n + ' l' + per.line + ' (' + per.from + '-' + per.to + ')', annual: a.hex.n + ' l' + a.moved,
    month: mo.hex.n, block: mo.hex.n + ' L' + dh.lord + ' > ' + dh.block.n, day: dh.block.n + ' l' + dLine + ' > ' + dh.hex.n + ' (d' + (dayIdx + 1) + ')',
    id: { cycle: [hx.n, per.line], year: [a.hex.n, a.moved], yearHex: [a.hex.n, 0], month: [mo.hex.n, 0], lord: [dh.block.n, dh.lord], day: [dh.block.n, dLine], dayHex: [dh.hex.n, dLine] },
    s: { cycle: ls(hx.n, per.line), year: ls(a.hex.n, a.moved), yearHex: hs(a.hex.n), month: hs(mo.hex.n), lord: ls(dh.block.n, dh.lord), day: ls(dh.block.n, dLine), dayHex: ls(dh.hex.n, dLine) }
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

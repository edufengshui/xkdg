// XKDG daily digest — scan worker (session 31).
// Loads the app's OWN scanner (app-bazi.js + deps) headless in jsdom and runs it
// day by day for one person, so the email matches what the app shows.
// Input: JSON on argv[2]; output: JSON on stdout. Run with TZ=<person's IANA zone>
// (the app parses dates in the phone's local time). Prints NO personal data.
'use strict';
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const L = require('lunar-javascript');
const ROOT = path.resolve(__dirname, '..');

const P = JSON.parse(process.argv[2]);           // { birth_date, birth_time, jiazi, lat, lon, tz, start, days }
const PURPOSES = ['', 'health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'];

function tzOffsetMin(tz, date) {                  // minutes east of UTC for that instant
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = {}; f.formatToParts(date).forEach(x => { p[x.type] = x.value; });
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}
function stdOffsetMin(tz, year) {
  return Math.min(tzOffsetMin(tz, new Date(Date.UTC(year, 0, 15, 12))), tzOffsetMin(tz, new Date(Date.UTC(year, 6, 15, 12))));
}
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<link[^>]*>/g, '');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://fsadvisor.org/xkdg/', pretendToBeVisual: true });
const w = dom.window, d = w.document;
Object.assign(w, { Solar: L.Solar, Lunar: L.Lunar });
w.alert = () => {}; w.confirm = () => true; w.prompt = () => null; w.scrollTo = () => {};
w.fetch = () => Promise.reject(new Error('offline'));
w.console.error = () => {}; w.console.warn = () => {}; w.console.log = () => {};
// Every LOCAL script of index.html, in its order (CDN ones and sync/version helpers skipped),
// so the assistant's tools (aquarium activation) run with all their engines.
const SKIP = { 'gdrive-sync.js': 1, 'version.js': 1, 'register-sw.js': 1, 'index.js': 1 };
// He Luo of the day (Edu 25/11/2026): only when digest.js asks for it (P.heluo = 'M' | 'F', the owner's line).
// The He Luo is closed to the students in the app (xkdgHeluoAllowed): here it is opened for this process only,
// and the person "X" gets the gender the chart needs. Nothing changes for the other recipients.
const HL = (P.heluo === 'M' || P.heluo === 'F') ? P.heluo : null;
const inject = src => { const s = d.createElement('script'); s.textContent = fs.readFileSync(path.join(ROOT, src), 'utf8'); d.body.appendChild(s); };
if (HL) { try { w.localStorage.setItem('xkdg_person_gender', JSON.stringify({ X: HL })); } catch (e) {} }
// the sphere of life for the comments to the line texts (chosen in the He Luo window, sent by digest.js)
if (HL && P.sphere) { try { w.localStorage.setItem('xkdg_hl_sphere', String(P.sphere)); if (P.variant) w.localStorage.setItem('xkdg_xk_variant_' + P.sphere, String(P.variant)); } catch (e) {} }
fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script src="([^"]+)"/g, (m, src) => {
  if (/^https?:/.test(src) || SKIP[src] || !fs.existsSync(path.join(ROOT, src))) return m;
  if (HL && src === 'heluo-lishu.js') { const s0 = d.createElement('script'); s0.textContent = 'window.xkdgHeluoAllowed = function () { return true; };'; d.body.appendChild(s0); }
  inject(src); return m;
});
// the files the app loads on demand when the He Luo window opens
if (HL) ['heluo-najia.js', 'heluo-texts.js', 'heluo-texts-age.js', 'heluo-scores.js', 'heluo-readings.js', 'heluo-natal.js', 'heluo-ds.js'].forEach(f => { try { if (fs.existsSync(path.join(ROOT, f))) inject(f); } catch (e) {} });
w.onload = null;
const G = code => { const s = d.createElement('script'); s.textContent = 'window.__r=(function(){return (' + code + ');})();'; d.body.appendChild(s); return w.__r; };
const $ = id => d.getElementById(id);
// Capture the scanner's RAW rows (the labels the BEST list shows), not only the AI summary.
G('(function(){var o=renderScanResults; renderScanResults=function(r){ window.__raw=r||[]; return o.apply(this, arguments); }; return 1;})()');

const stdOff = stdOffsetMin(P.tz, +P.start.slice(0, 4));
$('longitude').value = String(P.lon); if ($('latitude')) $('latitude').value = String(P.lat);
$('utc-offset').value = String(stdOff / 60);
$('person-panel-a').style.display = 'block';
$('person-name').value = 'X';
if (P.jiazi && !P.birth_date) {
  if ($('person-pillars-a')) $('person-pillars-a').value = '1';
  if ($('person-year-a')) $('person-year-a').value = P.jiazi;
} else {
  $('person-date').value = P.birth_date; $('person-time').value = P.birth_time || '12:00';
}

const out = { days: [] };
for (let i = 0; i < (P.skip_hours ? 0 : P.days); i++) {
  const day = addDays(P.start, i);
  const dst = tzOffsetMin(P.tz, new Date(day + 'T12:00:00Z')) > stdOff;
  G('(_dstOn=' + (dst ? 'true' : 'false') + ')');
  $('date').value = day; $('time') && ($('time').value = '12:00');
  try { w.calculateBazi(); } catch (e) {}
  try { w.calculatePerson('A'); } catch (e) {}
  const tzMin = -(stdOff + (dst ? 60 : 0));
  const rows = {};
  PURPOSES.forEach(pur => {
    $('purpose-select').value = pur;
    try { if (w.onPurposeChange) w.onPurposeChange(); } catch (e) {}
    $('scan-start').value = day; $('scan-days').value = '1';
    w._lastScanResults = []; w.__raw = [];
    try { w._scanSilent = true; w.runScanner(); } catch (e) { out.error = out.error || ('scan failed: ' + e.message); }
    const rawBy = {};
    (w.__raw || []).forEach(x => { if (x && x.isoDate === day) rawBy[x.hourIndex] = x; });
    (w._lastScanResults || []).forEach(r => {
      if (r.isoDate !== day) return;
      const k = r.hourIndex;
      if (!rows[k]) rows[k] = { hourIndex: k, scores: {} };
      rows[k].scores[pur || 'general'] = r.score;
      if (r.cure) rows[k].cure = r.cure;   // session 33: remedy for the person's missing communication
      const x = rawBy[k] || {};
      if (!pur) {
        rows[k].nayin = r.rescuedByNayin ? (r.nayinLabel || 'Nayin') : null;
        const uniq = a => a.filter((v, i) => v && a.indexOf(v) === i);
        rows[k].detail = {
          day_links: uniq(x.matchLabels || []),            // the DAY's link with the person (getMatchLabels)
          hour_links: uniq(x.blueLabels || r.blueLabels || []), // the HOUR's links (empty when rescued by Nayin)
          quality: uniq(x.qualLabels || []),
          spirit: x.spiritLabel || '', spirit_good: x.spiritAuspicious,
          noble: !!x.hasNoble, tian_yi: !!x.hasTY,
          nayin: uniq([x.nayinLabel, x.nayinPersonLabel]),
          rescued_by_nayin: !!r.rescuedByNayin
        };
      } else {
        const q = (x.purposeQimen || []).concat(x.purposeQimenR || []).map(p => (p.label || '') + (p.dir ? ' ' + p.dir : '')).filter(Boolean);
        if (q.length) { rows[k].qimen = rows[k].qimen || {}; rows[k].qimen[pur] = q.filter((v, i) => q.indexOf(v) === i); }
      }
    });
  });
  const ST = w.XKDGSolarTime, HS = G('HOUR_STARTS');
  const list = Object.values(rows).map(r => {
    const [y, m, dd] = day.split('-').map(Number);
    const h0 = HS[r.hourIndex];
    const a = ST.wallClockFromTST(y, m, dd, h0, 0, P.lon, tzMin);
    const mid = ST.wallClockFromTST(y, m, dd, h0, 30, P.lon, tzMin);
    const b = ST.wallClockFromTST(y, m, dd, h0 + 2, 0, P.lon, tzMin);
    const pil = ST.pillarsFromCivil(mid.y, mid.mo, mid.d, mid.h, mid.mi, 0, P.lon, tzMin);
    const fmt = t => String(t.h).padStart(2, '0') + ':' + String(t.mi).padStart(2, '0');
    const cdate = t => t.y + '-' + String(t.mo).padStart(2, '0') + '-' + String(t.d).padStart(2, '0');
    return Object.assign(r, { from: fmt(a), to: fmt(b), civil_date: cdate(a), branch: pil ? pil.hour.charAt(1) : '', day_gz: pil ? pil.day : '', hour_gz: pil ? pil.hour : '' });
  }).sort((p, q) => (p.civil_date + p.from).localeCompare(q.civil_date + q.from));
  let dayGz = '';
  try { const [yy, mm, d2] = day.split('-').map(Number); const pn = ST.pillarsFromCivil(yy, mm, d2, 12, 0, 0, P.lon, tzMin); dayGz = pn ? pn.day : ''; } catch (e) {}
  out.days.push({ date: day, dst: dst, day_gz: dayGz, hours: list });
}
// ── He Luo Li Shu of the first day (Edu 25/11/2026): the app's own reading of the day (XKDGHeluoDS.aiDay, the
// same facts the Assistant gets): actor, action, outcome with their line texts, the background (cycle, year,
// month), the notes of the day and the hours that matter, in clock time. No score is invented here.
if (HL) {
  try {
    const dstH = tzOffsetMin(P.tz, new Date(P.start + 'T12:00:00Z')) > stdOff, tzMinH = -(stdOff + (dstH ? 60 : 0));
    G('(_dstOn=' + (dstH ? 'true' : 'false') + ')');
    $('longitude').value = String(P.lon); $('date').value = P.start; $('time') && ($('time').value = '12:00');
    try { w.calculateBazi(); } catch (e) {}
    try { w.calculatePerson('A'); } catch (e) {}
    const r = w.XKDGHeluoDS && w.XKDGHeluoDS.aiDay ? w.XKDGHeluoDS.aiDay(P.start, null, true) : { error: 'He Luo not loaded' };
    if (!r || r.error) out.heluo_error = (r && r.error) || 'no reading';
    else {
      const NJ = w.HeluoNaJia || {}, F = r.film || {}, sc = F.scenario || {}, bd = F.backdrop || {}, ac = F.action || {};
      const short = nm => String(nm || '').split(' – ')[0].split(' - ')[0].trim();
      const yy = n => { try { return NJ[n].lines.map(l => !!l.yang); } catch (e) { return null; } };
      const nameOf = n => { try { return short((w.XKDG_HELUO_TEXTS[n] || {}).title); } catch (e) { return ''; } };
      const ln = o => o ? { n: o.hexagram, name: nameOf(o.hexagram), l: o.line, b: o.branch, rel: o.relation, who: o.who || '', text: o.text || '',
        s: o.text_score, timely: /^strong/.test(o.season || ''), up: (NJ[o.hexagram] || {}).upper || '', lo: (NJ[o.hexagram] || {}).lower || '' } : null;
      // the three Luck from the year (Heaven, Earth, Fame) and their opposites, as the chart of the app gives them
      let luck = null; try { const K = w.XKDGHeluo.chartA().R.luck; luck = { heaven: K.heaven, earth: K.earth, fame: K.fame, opposite: K.opposite || {} }; } catch (e) {}
      // the comment already written for the line (heluo-readings.js), in the sphere chosen, on the side the time gives it
      const UI = (w.XKDGHeluo && w.XKDGHeluo.ui) || {}, male = HL === 'M', me = (r.cycle || {}).person_element;
      const bzr = {}; (r.bazi_of_the_day_column_order || []).forEach(x => { const p = String(x).split(' '); bzr[p[0].toLowerCase()] = p[1]; });
      // The corresponding line (1-4, 2-5, 3-6) of an active line (Edu 28/11/2026: «manca la relazione privilegiata fra le
      // linee»; rules of 23/11/2026): yin with yang = a special, favourable bond, stronger when both stand in their proper
      // place (yang on an odd line, yin on an even one); the support goes from the relation of that line to the relation
      // of this one; the text of that line says how good it is.
      const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' }, CTL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
      const RELN = { B: 'Brothers', C: 'Children', W: 'Wealth', G: 'Ghost', P: 'Parent' };
      const corr = o => { if (!o) return o; try {
          const d = NJ[o.n], k = o.l <= 3 ? o.l + 3 : o.l - 3, A = d.lines[o.l - 1], B = d.lines[k - 1];
          let r = ''; try { const I = UI.sphereInfo && me ? UI.sphereInfo(o.n, k, me, male, '') : null; r = (I && I.rel) || ''; } catch (e) {}
          const proper = (ln, yang) => (ln % 2 === 1) === !!yang;
          const flow = A.el === B.el ? 'same' : GEN[B.el] === A.el ? 'that generates this' : GEN[A.el] === B.el ? 'this generates that' : CTL[B.el] === A.el ? 'that controls this' : 'this controls that';
          let sc = 0; try { sc = w.XKDG_HELUO_SCORES[o.n].l[k] || 0; } catch (e) {}
          let tx = ''; try { tx = w.XKDG_HELUO_TEXTS[o.n].lines[k].statement || ''; } catch (e) {}
          o.corr = { l: k, b: B.branch || '', r: r, rel: RELN[r] || '', yy: !!A.yang !== !!B.yang, okHere: proper(o.l, A.yang), okThere: proper(k, B.yang), flow: flow, s: sc, text: tx };
        } catch (e) {} return o; };
      const cmt = o => { if (!o || !UI.sphereInfo || !me) return o;
        let pv; try { if (UI.sphTime) pv = UI.sphTime({ y: (bzr.year || '').charAt(1), m: (bzr.month || '').charAt(1), d: (bzr.day || '').charAt(1) });
          const I = UI.sphereInfo(o.n, o.l, me, male);
          if (I) o.cmt = { sphere: I.sphere, icon: I.icon, relation: I.relation, meaning: I.meaning, off: I.off, side: I.side, strong: I.strong, weak: I.weak, hand: I.hand };
        } catch (e) {} finally { try { if (UI.sphTime) UI.sphTime(pv); } catch (e) {} }
        return o; };
      const six = n => { try { return NJ[n].lines.map((l, i) => { let r = ''; try { const I = UI.sphereInfo && me ? UI.sphereInfo(n, i + 1, me, male, '') : null; r = (I && I.rel) || ''; } catch (e) {} return { b: l.branch || '', r: r }; }); } catch (e) { return null; } };
      const HS = G('HOUR_STARTS'), ST = w.XKDGSolarTime, [y, m, dd] = P.start.split('-').map(Number);
      const f2 = t => String(t.h).padStart(2, '0') + ':' + String(t.mi).padStart(2, '0');
      const win = br => { try { const i = '子丑寅卯辰巳午未申酉戌亥'.indexOf(br); if (i < 0) return '';
        return f2(ST.wallClockFromTST(y, m, dd, HS[i], 0, P.lon, tzMinH)) + '–' + f2(ST.wallClockFromTST(y, m, dd, HS[i] + 2, 0, P.lon, tzMinH)); } catch (e) { return ''; } };
      const bz = {}; (r.bazi_of_the_day_column_order || []).forEach(x => { const p = String(x).split(' '); bz[p[0].toLowerCase()] = p[1]; });
      const hrs = (r.hours || []).filter(h => h.role || /\(best/.test(h.relieves_prevalence || '')).map(h => ({ pillar: h.pillar, window: win(String(h.pillar).charAt(1)),
        n: h.hexagram, l: h.line, b: h.branch, rel: h.relation, s: h.text_score, text: h.text || '', role: h.role || '', relief: h.relieves_prevalence || '' }));
      out.heluo = { date: P.start, gender: HL, bazi: bz, luck: luck, age: r.age_heluo, phase: (r.cycle || {}).phase || '',
        cycle: ln(sc.cycle), annual: ln(sc.annual), annual_month: ln(bd.annual_line_of_the_month), month: ln(bd.month_line),
        actor: corr(cmt(ln(F.actor))), action: corr(cmt(ln(ac.day_line))), outcome: corr(cmt(ln(ac.outcome))),
        sphere: (function () { try { const k = UI.sphGet ? UI.sphGet() : ''; const E = k && w.XKDG_HELUO_READINGS.spheres.resolve(k, male, w.localStorage.getItem('xkdg_xk_variant_' + k) || ''); return E ? E.icon + ' ' + E.label + (E.variantLabel ? ' \u00b7 ' + E.variantLabel : '') : ''; } catch (e) { return ''; } })(),
        block_yy: F.actor ? yy(F.actor.hexagram) : null, day_yy: ac.outcome ? yy(ac.outcome.hexagram) : null,
        // branch and relation (B C W G P, for the person of the day) of all six lines, for the drawings (Edu 28/11/2026)
        block_ln: F.actor ? six(F.actor.hexagram) : null, day_ln: ac.outcome ? six(ac.outcome.hexagram) : null,
        // the hexagram of the day as a whole (Edu 28/11/2026: «in finale il senso dell'intero esagramma del giorno»)
        day_hex: (function () { try { const tx = w.XKDG_HELUO_TEXTS[ac.outcome.hexagram]; return { n: ac.outcome.hexagram, title: String(tx.title || ''), judgment: String(tx.judgment || '') }; } catch (e) { return null; } })(),
        prevalence: (r.prevalence || []).filter(x => x !== 'none'), levels: r.relations_between_levels || [],
        year_clash: sc.year_clash || [], day_clash: ac.day_clash || [], notes: r.notes_of_the_day || [],
        legacy: r.legacy_or_document || '', hours: hrs,
        correct: r.correct && r.correct.how ? r.correct : null,
        alarms: Array.isArray(r.alarms_next_30_days) ? r.alarms_next_30_days : [] };
    }
  } catch (e) { out.heluo_error = String(e && e.message || e); }
}
// ── Feng Shui placements of the person's houses: the app's own DAY scans ──
// water = fsFindMatchingDatesForSetup (door facing ZS + water LS, Person A),
// bed = _fsScanLuckyDates(owner + guest #2), desk = _fsScanLuckyDates(person).
// ── QMDJ DAY chart of the first day (session 32): Rotating (directions) + Flying (Feng Shui),
// in the true solar time of the recipient's city, with the hours of that same day positive
// in the same palace. Uses the app's own qmdj-daymonth.js. No personal data.
try {
  const DM = w.XKDGDayMonth, QW = w.QMDJWaterScanner;
  if (DM && QW && !P.heluo_only) {
    const dst0 = tzOffsetMin(P.tz, new Date(P.start + 'T12:00:00Z')) > stdOff;
    G('(_dstOn=' + (dst0 ? 'true' : 'false') + ')');
    const [y0, m0, d0] = P.start.split('-').map(Number);
    const R = DM.dayChartJu(y0, m0, d0, P.lon);
    if (R) {
      const g = R.dayGz.charAt(0), z = R.dayGz.charAt(1);
      const pack = (c) => {
        const o = {};
        Object.keys(c.palaces).forEach(k => { const q = c.palaces[k];
          o[k] = { ti: q.tiH || '', di: q.diH || '', ti2: q.ti2H || '', di2: q.di2H || '', star: q.star || '',
                   door: q.doorName || q.door || '', spirit: q.deity || '', zf: !!q.zhiFu, zs: !!q.zhiShi }; });
        return o;
      };
      const one = (rot) => {
        const c = rot ? QW.getRotatingHourChart(2000, 1, 1, g, z, null, { ju: R.ju, dun: R.dun })
                      : QW.getHourChart(2000, 1, 1, g, z, null, { ju: R.ju, dun: R.dun });
        if (!c) return null;
        let m = { good: [], hits: {} };
        try { m = DM.dayHourMatches(P.start, c, rot, null); } catch (e) {}
        const matches = (m.good || []).map(n => ({ palace: n,
          hours: (m.hits[n] || []).map(x => ({ gz: x.gan + x.zhi, clock: x.civ, door: x.cell.doorName || x.cell.door || '' })) }));
        return { palaces: pack(c), matches: matches };
      };
      out.qmdj_day = { date: P.start, day_gz: R.dayGz, dun: R.dun, ju: R.ju, rotating: one(true), flying: one(false) };
    }
  }
} catch (e) { out.qmdj_day_error = String(e && e.message || e); }

out.fs = [];
(async function () {
if (Array.isArray(P.houses) && P.houses.length) {
  const dst0 = tzOffsetMin(P.tz, new Date(P.start + 'T12:00:00Z')) > stdOff;
  G('(_dstOn=' + (dst0 ? 'true' : 'false') + ')');
  $('date').value = P.start;
  try { w.calculateBazi(); } catch (e) {}
  try { w.calculatePerson('A'); } catch (e) {}
  $('scan-start').value = P.start; $('scan-days').value = String(P.days); w._fsRangeDays = P.days;
  const me = G('_personAYear');
  const bestWindow = (iso, idx) => {
    try {
      if (!(idx >= 0)) return '';
      const HS = G('HOUR_STARTS'), ST = w.XKDGSolarTime, [y, m, dd] = iso.split('-').map(Number);
      const dst = tzOffsetMin(P.tz, new Date(iso + 'T12:00:00Z')) > stdOff, tzMin = -(stdOff + (dst ? 60 : 0));
      const a = ST.wallClockFromTST(y, m, dd, HS[idx], 0, P.lon, tzMin), b = ST.wallClockFromTST(y, m, dd, HS[idx] + 2, 0, P.lon, tzMin);
      const f = t => String(t.h).padStart(2, '0') + ':' + String(t.mi).padStart(2, '0');
      return ' ' + f(a) + '\u2013' + f(b);
    } catch (e) { return ''; }
  };
  const winOfBranch = (iso, br, lon) => {
    try {
      const idx = '子丑寅卯辰巳午未申酉戌亥'.indexOf(br); if (idx < 0) return '';
      const HS = G('HOUR_STARTS'), ST = w.XKDGSolarTime, [y, m, dd] = iso.split('-').map(Number);
      const dst = tzOffsetMin(P.tz, new Date(iso + 'T12:00:00Z')) > stdOff, tzMin = -(stdOff + (dst ? 60 : 0));
      const a = ST.wallClockFromTST(y, m, dd, HS[idx], 0, lon, tzMin), b = ST.wallClockFromTST(y, m, dd, HS[idx] + 2, 0, lon, tzMin);
      const f = t => String(t.h).padStart(2, '0') + ':' + String(t.mi).padStart(2, '0');
      return f(a) + '\u2013' + f(b);
    } catch (e) { return ''; }
  };
  const inRange = iso => iso >= P.start && iso <= addDays(P.start, P.days - 1);
  const yearPerson = (label, jz) => { const x = jz && w.getXkdgData(jz[0], jz[1]); return x ? { who: label, label: label, hex: x.hex, qi: x.qi, yun: x.yun } : null; };
  // Session 37 (Edu: "the email has no hours for A and B"): the fountains no longer depend on the
  // recipient line in the secret — any house whose name matches a fountain house (Vienna) gets them.
  try {
    for (const h of P.houses) {
      const fcs = (typeof w.XKDGFountains === 'function') ? (w.XKDGFountains(h.name || '') || []) : [];
      h.ops = Array.isArray(h.ops) ? h.ops : [];
      fcs.forEach(fc => { if (!h.ops.some(o => o.kind === 'fountain' && o.device === fc.shelly_house))
        h.ops.push({ kind: 'fountain', name: fc.name, device: fc.shelly_house, facing: fc.facing, water: fc.water }); });
    }
  } catch (e) {}
  for (const h of P.houses) {
    // the house's own place (Tuoro aquarium at Tuoro longitude); same time zone as this process
    const hLon = isFinite(+h.lon) ? +h.lon : P.lon, hLat = isFinite(+h.lat) ? +h.lat : P.lat;
    $('longitude').value = String(hLon); if ($('latitude')) $('latitude').value = String(hLat);
    try { w.calculateBazi(); } catch (e) {}
    try { w.calculatePerson('A'); } catch (e) {}
    for (const op of (h.ops || [])) {
      const rec = { house: h.name || '', name: op.name || op.kind, kind: op.kind, dates: [], note: null };
      try {
        if (op.kind === 'water') {
          const f = w.fsSlotForDeg(+op.facing), wt = w.fsSlotForDeg(+op.water);
          if (!w.fsIsZhengShen(f.yun)) rec.note = 'door facing not Zheng Shen';
          else if (!w.fsIsLingShen(wt.yun)) rec.note = 'water not Ling Shen';
          else (w.fsFindMatchingDatesForSetup(f, wt) || []).forEach(m => {
            if (!inRange(m.isoDate)) return;
            rec.dates.push({ date: m.isoDate, score: m.score, day_gz: (m.dGan || '') + (m.dZhi || ''),
              facing_links: m.facingLabels || [], water_links: m.waterLabels || [], full_blood_link: !!m.isBL,
              // the water scan samples CIVIL clock times: derive the window from the hour BRANCH (TST), not from its index
              best_hour: m.bestHour ? (m.bestHour.hGan + m.bestHour.hZhi + bestWindow(m.isoDate, '子丑寅卯辰巳午未申酉戌亥'.indexOf(m.bestHour.hZhi))) : null });
          });
          rec.hex = { facing: f.hexNum, water: wt.hexNum };
        } else if (op.kind === 'aquarium') {
          // the assistant's aquarium tool: XKDG (person) + Qimen at the palace (veto) + special
          // configurations at the water star + 4-pillar bond, graded in tiers
          const T = w.XKDGAITools;
          if (!T) rec.note = 'activation engine not available';
          else {
            if (op.star_num == null && op.facing != null && op.period != null && w.XKDGHouse) {
              try { op.star_num = w.XKDGHouse.starAt(w.XKDGHouse.chartFor(op.facing, op.period), op.direction, 'water'); } catch (e) {}
            }
            const inp = { direction: op.direction, days: P.days, start_date: P.start, full: true };
            if (op.star_num != null) { inp.star_type = 'water'; inp.star_num = op.star_num; }
            if (op.facing != null && op.period != null) { inp.facing_deg = op.facing; inp.period = op.period; }
            let r = T.exec('find_water_activation_full', inp);
            if (r && typeof r.then === 'function') r = await r;
            if (!r || r.error) rec.note = (r && r.error) || 'no result';
            else (r.results || []).forEach(x => {
              if (!inRange(x.date)) return;
              rec.dates.push({ date: x.date, branch: x.branch, window: winOfBranch(x.date, x.branch, hLon), tier: x.tier,
                person_connected: !!x.person_connected, why: x.why || '', hits: x.hits || [],
                also_good_for: (x.also_good_for || []).map(a => a.label || a.purpose) });
            });
            if (r && r.imprisonment_note) rec.imprisoned = r.imprisonment_note;
          }
          rec.direction = op.direction; rec.water_star = op.star_num;
        } else if (op.kind === 'fountain') {
          // Session 35: the assistant's own fountain plan (day or night rule, ON at the best hour, OFF at the end)
          const T = w.XKDGAITools;
          if (!T) rec.note = 'fountain engine not available';
          else {
            let r = T.exec('program_aquarium_light', { house: op.device, days: P.days + 1 });
            if (r && typeof r.then === 'function') r = await r;
            if (!r || r.error) rec.note = (r && /both persons/.test(r.error || '')) ? 'hours set in the app (they depend on both persons of the house)' : ((r && r.error) || 'no result');
            else {
              const hm = ts => { const x = new Date(ts); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
              const ymd = ts => { const x = new Date(ts); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
              (r.scheduled || []).forEach(x => {
                const dOn = ymd(x.onTs);                 // listed on the CIVIL day it switches on (a night row may start after midnight)
                if (!inRange(dOn)) return;
                rec.dates.push({ date: dOn, branch: x.branch, def: !!x.default_hour, via: x.via || '', on: hm(x.onTs), off: hm(x.offTs), window: hm(x.onTs) + '\u2013' + hm(x.offTs) });
              });
              rec.period = /^night/.test(r.period || '') ? 'night' : 'day';
            }
          }
          rec.facing = op.facing; rec.water = op.water;
        } else if (op.kind === 'bed' || op.kind === 'desk') {
          const slot = w.fsSlotForDeg(op.kind === 'bed' ? +op.sitting : +op.facing);
          const persons = [me ? { who: 'you', label: 'you', hex: me.hex, qi: me.qi, yun: me.yun } : null];
          if (op.kind === 'bed') (h.bed_with || []).forEach(o => persons.push(yearPerson(o.name, o.jiazi)));
          const ps = persons.filter(Boolean);
          if (!w.fsIsZhengShen(slot.yun)) rec.note = (op.kind === 'bed' ? 'bed sitting' : 'desk facing') + ' not Zheng Shen';
          else if (!ps.length) rec.note = 'no person data';
          else (w._fsScanLuckyDates(ps, slot, 120) || []).forEach(m => {
            if (!inRange(m.iso)) return;
            rec.dates.push({ date: m.iso, day_gz: m.dGan + m.dZhi,
              date_link: (m.eval && m.eval.dateLink && m.eval.dateLink.labels) || [],
              people: ((m.eval && m.eval.perPerson) || []).map(pp => ({ who: pp.label || pp.who, with_placement: pp.ps.labels, with_date: pp.pd.labels })) });
          });
          rec.hex = { placement: slot.hexNum };
        }
      } catch (e) { rec.note = 'scan failed'; }
      out.fs.push(rec);
    }
  }
}
})().then(() => process.stdout.write(JSON.stringify(out), () => process.exit(0)))   // the app sets timers: exit explicitly
.catch(e => { out.error = out.error || ('fs: ' + e.message); process.stdout.write(JSON.stringify(out), () => process.exit(0)); });

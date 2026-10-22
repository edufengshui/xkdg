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
fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script src="([^"]+)"/g, (m, src) => {
  if (/^https?:/.test(src) || SKIP[src] || !fs.existsSync(path.join(ROOT, src))) return m;
  const s = d.createElement('script'); s.textContent = fs.readFileSync(path.join(ROOT, src), 'utf8'); d.body.appendChild(s); return m;
});
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
// ── Feng Shui placements of the person's houses: the app's own DAY scans ──
// water = fsFindMatchingDatesForSetup (door facing ZS + water LS, Person A),
// bed = _fsScanLuckyDates(owner + guest #2), desk = _fsScanLuckyDates(person).
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

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
['cities.js', 'solar-time.js', 'app-bazi.js', 'qmdj-water-scanner-data.js', 'qmdj-water-scanner.js', 'qmdj-annual.js', 'app-fengshui.js']
  .forEach(f => { const s = d.createElement('script'); s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8'); d.body.appendChild(s); });
w.onload = null;
const G = code => { const s = d.createElement('script'); s.textContent = 'window.__r=(function(){return (' + code + ');})();'; d.body.appendChild(s); return w.__r; };
const $ = id => d.getElementById(id);

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
for (let i = 0; i < P.days; i++) {
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
    w._lastScanResults = [];
    try { w._scanSilent = true; w.runScanner(); } catch (e) { out.error = out.error || ('scan failed: ' + e.message); }
    (w._lastScanResults || []).forEach(r => {
      if (r.isoDate !== day) return;
      const k = r.hourIndex;
      if (!rows[k]) rows[k] = { hourIndex: k, scores: {} };
      rows[k].scores[pur || 'general'] = r.score;
      if (!pur) { rows[k].nayin = r.rescuedByNayin ? (r.nayinLabel || 'Nayin') : null; rows[k].labels = r.blueLabels || []; }
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
process.stdout.write(JSON.stringify(out));

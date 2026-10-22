// XKDG daily digest (session 31): every morning, for each recipient, the positive hours
// of today and the next 7 days — general scan + every purpose — computed with the app's
// own scanner (scan.js), sent by email through Gmail.
// Secrets (GitHub → Settings → Secrets and variables → Actions):
//   GMAIL_USER, GMAIL_APP_PASSWORD, XKDG_DIGEST_RECIPIENTS (JSON list, see README.md)
// Logs are PUBLIC on a public repo: never print names, emails or birth data.
'use strict';
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');

const CITIES = {
  vienna: { lat: 48.2082, lon: 16.3738, tz: 'Europe/Vienna', label: 'Vienna' },
  wien: { lat: 48.2082, lon: 16.3738, tz: 'Europe/Vienna', label: 'Wien' },
  tuoro: { lat: 43.2079, lon: 12.0753, tz: 'Europe/Rome', label: 'Tuoro sul Trasimeno' }
};
const T = {
  it: { subj: 'XKDG · Ore positive', sub: 'Ore positive di oggi e dei prossimi 7 giorni', best: 'Le migliori della settimana', none: 'Nessuna ora positiva',
        general: 'Generale', night: 'notte', note: 'Calcolato con lo scanner dell’app, in ora solare vera di', note2: 'Ora legale/solare gestita giorno per giorno.',
        days: ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'], months: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
        P: { health: 'Health', career: 'Career', wealth: 'Wealth', relationship: 'Relationship', journey: 'Journey', speak: 'Speak', legal: 'Legal' }, open: 'Apri l’app', day: 'giorno' },
  en: { subj: 'XKDG · Positive hours', sub: 'Positive hours today and the next 7 days', best: 'Best of the week', none: 'No positive hour',
        general: 'General', night: 'night', note: 'Computed with the app’s scanner, in true solar time of', note2: 'Daylight saving handled day by day.',
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        P: { health: 'Health', career: 'Career', wealth: 'Wealth', relationship: 'Relationship', journey: 'Journey', speak: 'Speak', legal: 'Legal' }, open: 'Open the app', day: 'day' },
  fr: { subj: 'XKDG · Heures positives', sub: 'Heures positives d’aujourd’hui et des 7 prochains jours', best: 'Les meilleures de la semaine', none: 'Aucune heure positive',
        general: 'Général', night: 'nuit', note: 'Calculé avec le scanner de l’app, en heure solaire vraie de', note2: 'Heure d’été/hiver gérée jour par jour.',
        days: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'], months: ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
        P: { health: 'Santé', career: 'Carrière', wealth: 'Richesse', relationship: 'Relation', journey: 'Voyage', speak: 'Parole', legal: 'Juridique' }, open: 'Ouvrir l’app', day: 'jour' }
};
const ICON = { health: '🩺', career: '🏆', wealth: '💰', relationship: '❤️', journey: '✈️', speak: '🗣️', legal: '⚖️' };
const PORDER = ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'];

function todayIn(tz) {
  const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return p.year + '-' + p.month + '-' + p.day;
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function dlabel(iso, t) { const d = new Date(iso + 'T12:00:00Z'); return t.days[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + t.months[d.getUTCMonth()]; }
function isNight(from) { const h = +from.slice(0, 2); return h >= 23 || h < 5; }

function build(rec, data, loc) {
  const t = T[rec.lang] || T.it;
  const all = [];
  data.days.forEach(dd => dd.hours.forEach(h => all.push(Object.assign({ day: dd.date }, h))));
  const best = all.slice().sort((a, b) => (b.scores.general || 0) - (a.scores.general || 0)).slice(0, 3);
  const pur = h => PORDER.filter(p => h.scores[p] != null).map(p => ICON[p] + ' ' + t.P[p]).join(' · ');
  const line = (h, withDay) => (withDay ? dlabel(h.civil_date, t) + ' ' : '') + h.from + '–' + h.to + ' ' + h.branch + (isNight(h.from) ? ' 🌙' : '') +
    ' · ' + (h.scores.general != null ? h.scores.general : '') + (pur(h) ? ' · ' + pur(h) : '');
  let H = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#222;">' +
    '<h2 style="margin:0 0 4px;color:#4a148c;">' + esc(t.sub) + '</h2>' +
    '<div style="color:#666;font-size:13px;margin-bottom:12px;">' + esc(rec.name || '') + ' · ' + esc(loc.label) + '</div>';
  let X = t.sub + '\n' + (rec.name || '') + ' - ' + loc.label + '\n\n';
  if (best.length) {
    H += '<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:8px 12px;margin-bottom:14px;"><b>⭐ ' + esc(t.best) + '</b><br>' +
      best.map(h => esc(line(h, true))).join('<br>') + '</div>';
    X += '* ' + t.best + '\n' + best.map(h => '  ' + line(h, true)).join('\n') + '\n\n';
  }
  data.days.forEach((dd, i) => {
    const gz = dd.day_gz || (dd.hours.length ? dd.hours[0].day_gz : '');
    H += '<h3 style="margin:14px 0 4px;color:' + (i === 0 ? '#c62828' : '#333') + ';border-bottom:1px solid #eee;">' + esc(dlabel(dd.date, t)) +
      (gz ? ' <span style="color:#888;font-weight:normal;font-size:13px;">' + esc(t.day) + ' ' + esc(gz) + '</span>' : '') + '</h3>';
    X += dlabel(dd.date, t) + (gz ? ' (' + gz + ')' : '') + '\n';
    if (!dd.hours.length) { H += '<div style="color:#999;font-size:13px;">' + esc(t.none) + '</div>'; X += '  ' + t.none + '\n'; return; }
    H += '<table style="border-collapse:collapse;font-size:13px;width:100%;">';
    dd.hours.forEach(h => {
      const s = h.scores.general != null ? h.scores.general : '';
      const strong = s !== '' && s >= 18;
      H += '<tr><td style="padding:3px 6px;white-space:nowrap;' + (strong ? 'font-weight:bold;' : '') + '">' + esc(h.from) + '–' + esc(h.to) + '</td>' +
        '<td style="padding:3px 6px;white-space:nowrap;">' + esc(h.branch) + (isNight(h.from) ? ' 🌙' : '') + '</td>' +
        '<td style="padding:3px 6px;text-align:right;' + (strong ? 'color:#2e7d32;font-weight:bold;' : '') + '">' + esc(s) + '</td>' +
        '<td style="padding:3px 6px;color:#555;">' + esc(pur(h)) + (h.nayin ? ' <span style="color:#8a6d00;">· ' + esc(h.nayin) + '</span>' : '') + '</td></tr>';
      X += '  ' + line(h, false) + (h.nayin ? ' (' + h.nayin + ')' : '') + '\n';
    });
    H += '</table>';
  });
  H += '<div style="color:#888;font-size:12px;margin-top:16px;">' + esc(t.note) + ' ' + esc(loc.label) + '. ' + esc(t.note2) +
    '<br><a href="https://fsadvisor.org/xkdg/">' + esc(t.open) + '</a></div></div>';
  const first = data.days[0].date, last = data.days[data.days.length - 1].date;
  return { subject: t.subj + ' · ' + dlabel(first, t) + ' → ' + dlabel(last, t), html: H, text: X };
}

async function main() {
  let recs;
  try { recs = JSON.parse(process.env.XKDG_DIGEST_RECIPIENTS || '[]'); } catch (e) { console.log('XKDG_DIGEST_RECIPIENTS is not valid JSON'); process.exit(1); }
  if (!Array.isArray(recs)) recs = [recs];
  if (!recs.length) { console.log('No recipients configured.'); process.exit(1); }
  const dry = !!process.env.DRY_RUN;
  let mailer = null;
  if (!dry) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) { console.log('Missing GMAIL_USER / GMAIL_APP_PASSWORD.'); process.exit(1); }
    mailer = require('nodemailer').createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') } });
  }
  let failed = 0;
  for (let i = 0; i < recs.length; i++) {
    const rec = recs[i], tag = 'recipient ' + (i + 1) + '/' + recs.length;
    try {
      if (rec.active === false) { console.log(tag + ': paused'); continue; }
      const c = CITIES[String(rec.city || 'vienna').toLowerCase()] || {};
      const loc = { lat: rec.lat != null ? +rec.lat : c.lat, lon: rec.lon != null ? +rec.lon : c.lon, tz: rec.tz || c.tz || 'Europe/Vienna', label: rec.city_label || c.label || rec.city || '' };
      if (!isFinite(loc.lat) || !isFinite(loc.lon)) throw new Error('unknown location');
      if (!rec.email || !(rec.birth_date || rec.jiazi)) throw new Error('email and birth_date (or jiazi) are required');
      const arg = JSON.stringify({ birth_date: rec.birth_date, birth_time: rec.birth_time, jiazi: rec.jiazi, lat: loc.lat, lon: loc.lon, tz: loc.tz, start: todayIn(loc.tz), days: 8 });
      const raw = execFileSync(process.execPath, [path.join(__dirname, 'scan.js'), arg], { env: Object.assign({}, process.env, { TZ: loc.tz }), maxBuffer: 20e6, timeout: 600000 });
      const data = JSON.parse(raw.toString());
      if (data.error) throw new Error(data.error);
      const msg = build(rec, data, loc);
      const n = data.days.reduce((s, d) => s + d.hours.length, 0);
      if (dry) {
        const dir = process.env.DRY_RUN_DIR || __dirname;
        fs.writeFileSync(path.join(dir, 'digest-' + (i + 1) + '.html'), '<meta charset="utf-8">' + msg.html);
        fs.writeFileSync(path.join(dir, 'digest-' + (i + 1) + '.txt'), msg.subject + '\n\n' + msg.text);
        console.log(tag + ': ' + n + ' hours (dry run, not sent)');
      } else {
        await mailer.sendMail({ from: '"XKDG" <' + process.env.GMAIL_USER + '>', to: rec.email, subject: msg.subject, html: msg.html, text: msg.text });
        console.log(tag + ': ' + n + ' hours, sent');
      }
    } catch (e) { failed++; console.log(tag + ': FAILED - ' + String(e.message || e).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>').slice(0, 200)); }
  }
  if (failed) process.exit(1);
}
main();

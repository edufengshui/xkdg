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
        P: { health: 'Health', career: 'Career', wealth: 'Wealth', relationship: 'Relationship', journey: 'Journey', speak: 'Speak', legal: 'Legal' }, open: 'Apri l’app', day: 'giorno', detail: 'Dettaglio di ogni ora', relH: 'Ora con te', relD: 'Giorno con te', qual: 'Qualità', spirit: 'Spirito dell’ora', nayin: 'Nayin', purposes: 'Scopi', noble: 'Nobile', ty: 'Tian Yi', rescued: 'non comunica con te: salvata dal Nayin Power', onlyGeneral: 'solo generale (nessuno scopo)', goodSp: 'favorevole', badSp: 'sfavorevole', see: 'Il dettaglio di ogni ora è in fondo.' },
  en: { subj: 'XKDG · Positive hours', sub: 'Positive hours today and the next 7 days', best: 'Best of the week', none: 'No positive hour',
        general: 'General', night: 'night', note: 'Computed with the app’s scanner, in true solar time of', note2: 'Daylight saving handled day by day.',
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        P: { health: 'Health', career: 'Career', wealth: 'Wealth', relationship: 'Relationship', journey: 'Journey', speak: 'Speak', legal: 'Legal' }, open: 'Open the app', day: 'day', detail: 'Detail of every hour', relH: 'Hour with you', relD: 'Day with you', qual: 'Quality', spirit: 'Hour spirit', nayin: 'Nayin', purposes: 'Purposes', noble: 'Noble', ty: 'Tian Yi', rescued: 'does not connect with you: rescued by Nayin Power', onlyGeneral: 'general only (no purpose)', goodSp: 'auspicious', badSp: 'inauspicious', see: 'The detail of every hour is at the end.' },
  fr: { subj: 'XKDG · Heures positives', sub: 'Heures positives d’aujourd’hui et des 7 prochains jours', best: 'Les meilleures de la semaine', none: 'Aucune heure positive',
        general: 'Général', night: 'nuit', note: 'Calculé avec le scanner de l’app, en heure solaire vraie de', note2: 'Heure d’été/hiver gérée jour par jour.',
        days: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'], months: ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
        P: { health: 'Santé', career: 'Carrière', wealth: 'Richesse', relationship: 'Relation', journey: 'Voyage', speak: 'Parole', legal: 'Juridique' }, open: 'Ouvrir l’app', day: 'jour', detail: 'Détail de chaque heure', relH: 'Heure avec vous', relD: 'Jour avec vous', qual: 'Qualité', spirit: 'Esprit de l’heure', nayin: 'Nayin', purposes: 'Objectifs', noble: 'Noble', ty: 'Tian Yi', rescued: 'ne communique pas avec vous : sauvée par le Nayin Power', onlyGeneral: 'général seulement (aucun objectif)', goodSp: 'favorable', badSp: 'défavorable', see: 'Le détail de chaque heure est à la fin.' }
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
      best.map(h => '<div style="margin:7px 0 0;">' +
        '<span style="display:inline-block;background:#4a148c;color:#fff;font-weight:bold;border-radius:5px;padding:2px 8px;margin-right:6px;white-space:nowrap;">' +
        esc(dlabel(h.civil_date, t)) + '</span>' +
        '<b style="white-space:nowrap;">' + esc(h.from) + '\u2013' + esc(h.to) + ' ' + esc(h.branch) + (isNight(h.from) ? ' \uD83C\uDF19' : '') + '</b>' +
        ' \u00b7 <b style="color:#2e7d32;">' + esc(h.scores.general != null ? h.scores.general : '') + '</b>' +
        (pur(h) ? '<br><span style="color:#555;">' + esc(pur(h)) + '</span>' : '') + '</div>').join('') + '</div>';
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
  // second section: the WHY of every hour (the glance stays at the top)
  if (all.length) {
    H += '<div style="color:#888;font-size:12px;margin-top:10px;">' + esc(t.see) + '</div>' +
      '<h2 style="margin:22px 0 6px;color:#4a148c;border-top:2px solid #e1bee7;padding-top:10px;">' + esc(t.detail) + '</h2>';
    X += '\n==== ' + t.detail + ' ====\n';
    all.forEach(h => {
      const D = h.detail || {}, parts = [];
      if (D.rescued_by_nayin) parts.push(['⚠', t.rescued]);
      if (D.hour_links && D.hour_links.length) parts.push([t.relH, D.hour_links.join(' · ')]);
      if (D.day_links && D.day_links.length) parts.push([t.relD, D.day_links.join(' · ')]);
      if (D.quality && D.quality.length) parts.push([t.qual, D.quality.join(' · ')]);
      if (D.spirit) parts.push([t.spirit, D.spirit + ' (' + (D.spirit_good === false ? t.badSp : (D.spirit_good ? t.goodSp : '?')) + ')']);
      const nt = [D.noble ? t.noble : '', D.tian_yi ? t.ty : ''].filter(Boolean); if (nt.length) parts.push(['✨', nt.join(' · ')]);
      if (D.nayin && D.nayin.length) parts.push([t.nayin, D.nayin.join(' · ')]);
      const ps = PORDER.filter(p => h.scores[p] != null).map(p => t.P[p] + ' ' + h.scores[p] + (h.qimen && h.qimen[p] ? ' (Qimen: ' + h.qimen[p].join(', ') + ')' : ''));
      parts.push([t.purposes, ps.length ? ps.join(' · ') : t.onlyGeneral]);
      const head = dlabel(h.civil_date, t) + ' · ' + h.from + '–' + h.to + ' ' + h.branch + ' (' + h.hour_gz + ')' + (isNight(h.from) ? ' 🌙' : '') +
        ' · ' + (h.scores.general != null ? h.scores.general : '');
      H += '<div style="margin:8px 0;padding:6px 10px;border-left:3px solid #ce93d8;background:#faf7fc;font-size:12px;">' +
        '<span style="display:inline-block;background:#4a148c;color:#fff;font-weight:bold;border-radius:5px;padding:1px 7px;margin-right:6px;font-size:12px;">' + esc(dlabel(h.civil_date, t)) + '</span>' +
        '<b style="font-size:13px;">' + esc(head.slice(dlabel(h.civil_date, t).length + 3)) + '</b><br>' + parts.map(p => '<span style="color:#777;">' + esc(p[0]) + ':</span> ' + esc(p[1])).join('<br>') + '</div>';
      X += '\n' + head + '\n' + parts.map(p => '   ' + p[0] + ': ' + p[1]).join('\n') + '\n';
    });
  }
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

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
  it: { qd: 'Carta Qimen del giorno', qdRot: 'Rotating · direzioni', qdFly: 'Flying · Feng Shui', qdMatch: 'Palazzi positivi del giorno con le ore positive nello stesso palazzo', qdNoHour: 'nessuna ora', qdNone: 'nessun palazzo positivo', subj: 'XKDG · Ore positive', sub: 'Ore positive di oggi e dei prossimi 7 giorni', best: 'Le migliori della settimana', none: 'Nessuna ora positiva',
        general: 'Generale', night: 'notte', note: 'Calcolato con lo scanner dell’app, in ora solare vera di', note2: 'Ora legale/solare gestita giorno per giorno.',
        days: ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'], months: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
        P: { health: 'Health', career: 'Career', wealth: 'Wealth', relationship: 'Relationship', journey: 'Journey', speak: 'Speak', legal: 'Legal' }, open: 'Apri l’app', day: 'giorno', fs: 'Feng Shui', fsDetail: 'Dettaglio Feng Shui', aqTier: 'Livello', local: 'ora locale', allDay: 'tutto il giorno', aqShort: 'non comunica con te', aqConn: 'comunica con te', aqNot: 'non comunica con te (buona per Qimen/Nayin)', aqWhy: 'Perché', fsSkip: 'non calcolato', fsDoor: 'Porta con il giorno', fsWater: 'Acqua con il giorno', fsBL: 'Full Blood Link', fsBest: 'Ora migliore', fsPl: 'Posizione con il giorno', fsWith: 'con la posizione', fsDate: 'con il giorno', detail: 'Dettaglio di ogni ora', relH: 'Ora con te', relD: 'Giorno con te', qual: 'Qualità', spirit: 'Spirito dell’ora', nayin: 'Nayin', purposes: 'Scopi', noble: 'Nobile', ty: 'Tian Yi', rescued: 'non comunica con te: salvata dal Nayin Power', onlyGeneral: 'solo generale (nessuno scopo)', goodSp: 'favorevole', badSp: 'sfavorevole', see: 'Il dettaglio di ogni ora è in fondo.' },
  en: { qd: 'Qimen day chart', qdRot: 'Rotating · directions', qdFly: 'Flying · Feng Shui', qdMatch: 'Positive palaces of the day with the hours positive in the same palace', qdNoHour: 'no hour', qdNone: 'no positive palace', subj: 'XKDG · Positive hours', sub: 'Positive hours today and the next 7 days', best: 'Best of the week', none: 'No positive hour',
        general: 'General', night: 'night', note: 'Computed with the app’s scanner, in true solar time of', note2: 'Daylight saving handled day by day.',
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        P: { health: 'Health', career: 'Career', wealth: 'Wealth', relationship: 'Relationship', journey: 'Journey', speak: 'Speak', legal: 'Legal' }, open: 'Open the app', day: 'day', fs: 'Feng Shui', fsDetail: 'Feng Shui detail', aqTier: 'Tier', local: 'local time', allDay: 'all day', aqShort: 'not connected to you', aqConn: 'connects with you', aqNot: 'does not connect with you (good by Qimen/Nayin)', aqWhy: 'Why', fsSkip: 'not scanned', fsDoor: 'Door with the day', fsWater: 'Water with the day', fsBL: 'Full Blood Link', fsBest: 'Best hour', fsPl: 'Placement with the day', fsWith: 'with the placement', fsDate: 'with the day', detail: 'Detail of every hour', relH: 'Hour with you', relD: 'Day with you', qual: 'Quality', spirit: 'Hour spirit', nayin: 'Nayin', purposes: 'Purposes', noble: 'Noble', ty: 'Tian Yi', rescued: 'does not connect with you: rescued by Nayin Power', onlyGeneral: 'general only (no purpose)', goodSp: 'auspicious', badSp: 'inauspicious', see: 'The detail of every hour is at the end.' },
  fr: { qd: 'Carte Qimen du jour', qdRot: 'Rotating · directions', qdFly: 'Flying · Feng Shui', qdMatch: 'Palais positifs du jour avec les heures positives dans le même palais', qdNoHour: 'aucune heure', qdNone: 'aucun palais positif', subj: 'XKDG · Heures positives', sub: 'Heures positives d’aujourd’hui et des 7 prochains jours', best: 'Les meilleures de la semaine', none: 'Aucune heure positive',
        general: 'Général', night: 'nuit', note: 'Calculé avec le scanner de l’app, en heure solaire vraie de', note2: 'Heure d’été/hiver gérée jour par jour.',
        days: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'], months: ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
        P: { health: 'Santé', career: 'Carrière', wealth: 'Richesse', relationship: 'Relation', journey: 'Voyage', speak: 'Parole', legal: 'Juridique' }, open: 'Ouvrir l’app', day: 'jour', fs: 'Feng Shui', fsDetail: 'Détail Feng Shui', aqTier: 'Niveau', local: 'heure locale', allDay: 'toute la journée', aqShort: 'ne communique pas avec vous', aqConn: 'communique avec vous', aqNot: 'ne communique pas avec vous (bonne par Qimen/Nayin)', aqWhy: 'Pourquoi', fsSkip: 'non calculé', fsDoor: 'Porte avec le jour', fsWater: 'Eau avec le jour', fsBL: 'Full Blood Link', fsBest: 'Meilleure heure', fsPl: 'Emplacement avec le jour', fsWith: 'avec l’emplacement', fsDate: 'avec le jour', detail: 'Détail de chaque heure', relH: 'Heure avec vous', relD: 'Jour avec vous', qual: 'Qualité', spirit: 'Esprit de l’heure', nayin: 'Nayin', purposes: 'Objectifs', noble: 'Noble', ty: 'Tian Yi', rescued: 'ne communique pas avec vous : sauvée par le Nayin Power', onlyGeneral: 'général seulement (aucun objectif)', goodSp: 'favorable', badSp: 'défavorable', see: 'Le détail de chaque heure est à la fin.' }
};
const ICON = { health: '🩺', career: '🏆', wealth: '💰', relationship: '❤️', journey: '✈️', speak: '🗣️', legal: '⚖️' };
const FSICON = { fountain: '\u26F2', aquarium: '\uD83D\uDC20', water: '\uD83D\uDCA7', bed: '\uD83D\uDECF\uFE0F', desk: '\uD83E\uDE91' };
const PORDER = ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'];
const HELUO_OWNER_LANG = 'it';     // the owner reads the «Commento» in Italian ("heluo_lang" in the line changes it)
const HELUO_OWNER_GENDER = 'M';   // the owner of the app (Edu): the He Luo chart needs the gender, the secret line has none

// Two zones are interchangeable when their UTC offsets match all year (Vienna = Rome).
function tzSig(tz) {
  const y = new Date().getUTCFullYear();
  return [0, 3, 6, 9].map(m => new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).format(new Date(Date.UTC(y, m, 15, 12)))).join('|').replace(/[^+\-\d:|GMT]/g, '');
}
function todayIn(tz) {
  const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return p.year + '-' + p.month + '-' + p.day;
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function dlabel(iso, t) { const d = new Date(iso + 'T12:00:00Z'); return t.days[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + t.months[d.getUTCMonth()]; }
function isNight(from) { const h = +from.slice(0, 2); return h >= 23 || h < 5; }

// Aquarium hours worth showing on a day (Edu): the best only.
//   2+ hours of tier 3-4 -> only those; exactly one -> that one + the tier 2;
//   none -> the tier 2; no tier 2 either -> the tier 1.
function aqVisible(r, date) {
  const all = (r.dates || []).filter(x => x.date === date);
  const t3 = all.filter(x => x.tier >= 3), t2 = all.filter(x => x.tier === 2);
  if (t3.length >= 2) return t3;
  if (t3.length === 1) return t3.concat(t2);
  if (t2.length) return t2;
  return all.filter(x => x.tier === 1);
}
// QMDJ day chart of today, as an email-safe 3×3 table (session 32). South on top, like the app.
const QPAL = { 1: 'Kan N', 8: 'Gen NE', 3: 'Zhen E', 4: 'Xun SE', 9: 'Li S', 2: 'Kun SW', 7: 'Dui W', 6: 'Qian NW', 5: '' };
const QCOL = s => ('甲乙'.includes(s) ? '#2e7d32' : '丙丁'.includes(s) ? '#c62828' : '戊己'.includes(s) ? '#bf6c00' : '庚辛'.includes(s) ? '#424242' : '壬癸'.includes(s) ? '#1565c0' : '#333');
function qStems(a, b) { return [a, b].filter(Boolean).map(x => '<span style="color:' + QCOL(x) + ';">' + esc(x) + '</span>').join(''); }
function qdGrid(ch) {
  const order = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
  return '<table style="border-collapse:collapse;font-size:11px;width:100%;max-width:330px;background:#fff;">' + order.map(row => '<tr>' + row.map(n => {
    const c = ch.palaces[n] || {};
    return '<td style="border:1px solid #1b5e20;padding:3px 4px;vertical-align:top;width:33%;">' +
      '<div style="text-align:center;font-weight:bold;">' + esc(c.spirit || '') + '</div>' +
      '<div><b style="font-size:14px;">' + qStems(c.ti, c.ti2) + '</b> <span style="float:right;color:#555;">' + esc(c.star || '') + '</span></div>' +
      '<div style="text-align:center;font-weight:bold;color:#1b5e20;">' + esc(c.door || '') + (c.zs ? ' <span style="color:#e65100;font-size:9px;">ZS</span>' : '') + '</div>' +
      '<div><b style="font-size:14px;">' + qStems(c.di, c.di2) + '</b> <span style="float:right;color:#999;font-size:9px;">' + esc(QPAL[n]) + '</span></div></td>';
  }).join('') + '</tr>').join('') + '</table>';
}
function qdBlock(q, t) {
  if (!q || !q.rotating || !q.flying) return { h: '', x: '' };
  const part = (ch, title) => {
    const m = (ch.matches || []);
    const list = m.length ? m.map(x => '<div style="margin-top:3px;"><b>' + esc(QPAL[x.palace]) + '</b> · ' +
      (x.hours.length ? x.hours.map(h => esc(h.clock + ' ' + h.gz + ' ' + h.door)).join(' · ') : '<span style="color:#999;">' + esc(t.qdNoHour) + '</span>') + '</div>').join('')
      : '<div style="color:#999;margin-top:3px;">' + esc(t.qdNone) + '</div>';
    return '<div style="margin:8px 0;"><div style="font-weight:bold;color:#4a148c;margin-bottom:3px;">' + esc(title) + '</div>' + qdGrid(ch) +
      '<div style="font-size:12px;color:#333;margin-top:4px;">' + list + '</div></div>';
  };
  const head = '📅 ' + t.qd + ' · ' + q.day_gz + ' · ' + (q.dun === 'yang' ? 'Yang' : 'Yin') + ' Jú ' + q.ju;
  const h = '<div style="background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:8px 10px;margin:0 0 14px;">' +
    '<b style="color:#4a148c;">' + esc(head) + '</b><div style="font-size:11px;color:#666;">' + esc(t.qdMatch) + '</div>' +
    part(q.rotating, t.qdRot) + part(q.flying, t.qdFly) + '</div>';
  const tx = (ch, title) => '  ' + title + ': ' + ((ch.matches || []).map(x => QPAL[x.palace] + ' [' + x.hours.map(hh => hh.clock + ' ' + hh.gz + ' ' + hh.door).join(', ') + ']').join('; ') || t.qdNone);
  const x = head + '\n' + tx(q.rotating, t.qdRot) + '\n' + tx(q.flying, t.qdFly) + '\n\n';
  return { h: h, x: x };
}

// ── Switch ON / OFF of aquariums and fountains (Edu 25/11/2026) ──
// The REAL times of the plans stored in the Shelly Worker (what the plugs will do), today and tomorrow,
// in the clock time of each device. Read in aquariumStatus(); nothing is computed here.
const SW = {
  it: { title: 'Accensione / spegnimento', today: 'Oggi', tomorrow: 'Domani', none: 'nessuna accensione', on: 'ON', off: 'OFF', since: 'acceso da' },
  en: { title: 'Switch ON / OFF', today: 'Today', tomorrow: 'Tomorrow', none: 'no switch-on', on: 'ON', off: 'OFF', since: 'on since' },
  fr: { title: 'Allumage / extinction', today: 'Aujourd’hui', tomorrow: 'Demain', none: 'aucun allumage', on: 'ON', off: 'OFF', since: 'allumé depuis' }
};
function switchBlock(aq, rec) {
  if (!aq || !aq.switches || !aq.switches.length) return { h: '', x: '' };
  const s = SW[rec.lang] || SW.en;
  const parts = iv => iv.map(v => (v.onPrev ? s.since + ' ' + v.on : s.on + ' ' + v.on) + ' → ' + s.off + ' ' + v.off);
  const one = iv => iv.length ? parts(iv).join('  ·  ') : s.none;
  const oneH = iv => iv.length ? parts(iv).map(esc).join('<br>') : esc(s.none);   // one switch per row on a phone
  let h = '<div style="background:#e3f2fd;border:1px solid #90caf9;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:13px;">' +
    '<b style="color:#0d47a1;">🔌 ' + esc(s.title) + '</b>', x = s.title + '\n';
  [['today', s.today], ['tomorrow', s.tomorrow]].forEach((d, i) => {
    h += '<div style="margin-top:6px;font-weight:bold;color:' + (i ? '#555' : '#c62828') + ';">' + esc(d[1]) + '</div>' +
      '<table style="border-collapse:collapse;font-size:13px;width:100%;">' +
      aq.switches.map(w => '<tr><td style="padding:2px 8px 2px 0;white-space:nowrap;vertical-align:top;">' + w.icon + ' ' + esc(w.name) + '</td>' +
        '<td style="padding:2px 0;' + (i ? 'color:#555;' : 'font-weight:bold;') + (w[d[0]].length ? '' : 'color:#999;font-weight:normal;') + '">' + oneH(w[d[0]]) + '</td></tr>').join('') + '</table>';
    x += '  ' + d[1] + '\n' + aq.switches.map(w => '    ' + w.icon + ' ' + w.name + ': ' + one(w[d[0]])).join('\n') + '\n';
  });
  return { h: h + '</div>', x: x + '\n' };
}

// ── He Luo Li Shu of the day (Edu 25/11/2026) — only in the owner's email (see main) ──
// Facts of the app's own reading (scan.js → XKDGHeluoDS.aiDay): who acts, what is done, how it ends, with the
// line texts; the background; the notes of the day; the hours that matter. English only, like the He Luo window.
const HL_RC = { Parent: '#6a1b9a', Wealth: '#2e7d32', Ghost: '#c62828', Children: '#1565c0', Brothers: '#555' };
function hlHex(yy, marks) {            // drawn hexagram, email-safe: line 6 on top; marks = { line: colour }
  if (!yy || yy.length !== 6) return '';
  let h = '<table style="border-collapse:collapse;">';
  for (let l = 6; l >= 1; l--) {
    const c = (marks && marks[l]) || '#444', bar = wd => '<td style="padding:2px 0;"><div style="width:' + wd + 'px;height:6px;background:' + c + ';font-size:0;line-height:0;">&nbsp;</div></td>';
    h += '<tr>' + (yy[l - 1] ? bar(22) + bar(10) + bar(22) : bar(22) + '<td style="padding:2px 0;"><div style="width:10px;height:6px;font-size:0;line-height:0;">&nbsp;</div></td>' + bar(22)) +
      '<td style="padding:0 0 0 5px;font-size:10px;color:' + c + ';line-height:10px;">' + (marks && marks[l] ? l : '') + '</td></tr>';
  }
  return h + '</table>';
}
function hlTxt(yy, marks) { if (!yy || yy.length !== 6) return ''; let o = ''; for (let l = 6; l >= 1; l--) o += '    ' + (yy[l - 1] ? '━━━━━' : '━━ ━━') + (marks && marks[l] ? '  ← ' + marks[l] : '') + '\n'; return o; }
// SHORT He Luo box (Edu 26/11/2026: «troppo complicata, si finisce col non capire niente»). The default from now on:
// three plain rows — who moves the day, what is done, how it ends — each with what it is about, good or not, and ONE
// comment in plain words; then one line for the Luck, one per hour that matters, and at most two warnings.
// No background, no clashes, no flows between the levels. The long box stays with "heluo_full": true in the line.
function heluoShort(hl, t) {
  if (!hl || !hl.actor || !hl.action || !hl.outcome) return { h: '', x: '' };
  const mark = o => (o.s > 0 ? '✓ favourable' : o.s < 0 ? '✗ unfavourable' : 'neutral');
  const col = o => (o.s > 0 ? '#2e7d32' : o.s < 0 ? '#c62828' : '#777');
  const about = o => { const c = o.cmt; return String((c && c.sphere && c.meaning) ? c.meaning : (o.who || ''))
      .replace(/(,| and) the partner \((man|woman)\)/g, (m, j, g) => ((g === 'man') === (hl.gender !== 'F')) ? j + ' the partner' : ''); };   // «the partner» only for whom it holds
  // one side only: the side the time gives; when the time does not decide, the side of the text
  const say = o => { const c = o.cmt; if (!c) return ''; return (c.side > 0 || (c.side === 0 && o.s >= 0)) ? (c.strong || '') : (c.weak || c.strong || ''); };
  const rows = [['Who moves the day', hl.actor], ['What is done', hl.action], ['How it ends', hl.outcome]];
  // Luck: only the block and the day; a trigram that is one of the three Luck counts as that Luck
  let luck = [];
  if (hl.luck) {
    const good = {}, bad = {}; [['heaven', 'Heaven'], ['earth', 'Earth'], ['fame', 'Fame']].forEach(k => { if (hl.luck[k[0]]) good[hl.luck[k[0]]] = k[1] + ' Luck'; });
    [['heaven', 'Heaven'], ['earth', 'Earth'], ['fame', 'Fame']].forEach(k => { const o = (hl.luck.opposite || {})[k[0]]; if (o && !good[o]) bad[o] = 'opposite of ' + k[1] + ' Luck'; });
    const seen = {};
    [['the block', hl.actor], ['the day', hl.outcome]].forEach(L => [L[1].up, L[1].lo].forEach(tg => { const nm = good[tg] || bad[tg]; if (!nm) return; const k = nm + ' (' + tg + ')'; (seen[k] = seen[k] || { good: !!good[tg], at: [] }); if (seen[k].at.indexOf(L[0]) < 0) seen[k].at.push(L[0]); }));
    luck = Object.keys(seen).map(k => ({ good: seen[k].good, txt: k + ' in ' + seen[k].at.join(' and ') }));
  }
  const hrs = (hl.hours || []).filter(o => o.role);     // only the hours with a part in the film
  const hourTxt = o => String(o.role).replace(/\s*\([^)]*\)/g, '').replace(/ACTOR ENTERS THE SCENE/, 'actor enters the scene').replace(/the ANSWER, /, '').replace(/\s+/g, ' ').trim();
  const warn = [].concat((hl.notes || []).filter(n => /^Six Clashes/.test(n)).map(n => n.replace(/^Six Clashes hexagram on [^:]*:\s*/, 'Six Clashes: ')), hl.legacy ? [hl.legacy] : []).slice(0, 2);
  const c2 = (lbl, gz) => '<td style="text-align:center;padding:0 8px 0 0;font-size:11px;color:#777;">' + lbl + '<div style="font-size:16px;color:#222;line-height:1.25;">' + (gz ? esc(gz.charAt(0)) + '<br>' + esc(gz.charAt(1)) : '·<br>·') + '</div></td>';
  const mB = {}; mB[hl.actor.l] = '#6a1b9a'; mB[hl.action.l] = '#c62828'; const mD = {}; mD[hl.outcome.l] = '#c62828';
  const ttl = 'He Luo' + (hl.who ? ' of ' + hl.who : '') + ' · ' + dlabel(hl.date, t) + (hl.sphere ? ' · ' + hl.sphere : '');
  let h = '<div style="background:#f7f3ff;border:1px solid #b39ddb;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:14px;">' +
    '<b style="color:#4527a0;font-size:15px;">☯ ' + esc(ttl) + '</b>' +
    '<table style="border-collapse:collapse;margin-top:6px;"><tr>' +
    '<td style="vertical-align:top;padding-right:14px;"><table style="border-collapse:collapse;"><tr>' + c2('Day', hl.bazi.day) + c2('Month', hl.bazi.month) + c2('Year', hl.bazi.year) + '</tr></table></td>' +
    '<td style="vertical-align:top;padding-right:14px;"><div style="font-size:11px;color:#777;margin-bottom:2px;">Block ' + hl.actor.n + ' ' + esc(hl.actor.name) + '</div>' + hlHex(hl.block_yy, mB) + '</td>' +
    '<td style="vertical-align:top;"><div style="font-size:11px;color:#777;margin-bottom:2px;">Day ' + hl.outcome.n + ' ' + esc(hl.outcome.name) + '</div>' + hlHex(hl.day_yy, mD) + '</td></tr></table>';
  let x = ttl + '\n';
  rows.forEach(r => { const o = r[1], sy = say(o);
    h += '<div style="margin-top:10px;"><b style="color:#4527a0;">' + r[0] + '</b> · <b style="color:' + col(o) + ';">' + mark(o) + '</b><br>' +
      '<b style="color:' + (HL_RC[o.rel] || '#333') + ';">' + esc(o.rel) + '</b>' + (about(o) ? ': ' + esc(about(o)) : '') +
      (sy ? '<div style="margin:3px 0 0;padding:5px 8px;background:#fff8e1;border-left:3px solid #f9a825;color:#222;">' + esc(sy) + '</div>' : '') +
      '<div style="font-size:11px;color:#888;margin-top:2px;"><i>«' + esc(o.text) + '»</i> · ' + o.n + ' line ' + o.l + ' ' + esc(o.b) + '</div></div>';
    x += '  ' + r[0] + ' · ' + mark(o) + '\n    ' + o.rel + (about(o) ? ': ' + about(o) : '') + '\n' + (sy ? '    > ' + sy + '\n' : '') + '    «' + o.text + '» (' + o.n + ' line ' + o.l + ' ' + o.b + ')\n';
  });
  if (luck.length) {
    h += '<div style="margin-top:10px;"><b style="color:#4527a0;">Luck</b> ' + luck.map(l => '<span style="color:' + (l.good ? '#2e7d32' : '#c62828') + ';">' + (l.good ? '☘ ' : '✖ ') + esc(l.txt) + '</span>').join(' · ') + '</div>';
    x += '  Luck: ' + luck.map(l => (l.good ? '+ ' : '- ') + l.txt).join(' · ') + '\n';
  }
  if (hrs.length) {
    h += '<div style="margin-top:10px;"><b style="color:#4527a0;">Hours</b>' + hrs.map(o => '<div style="margin-top:2px;"><b style="white-space:nowrap;">' + esc(o.window) + '</b> ' + esc(hourTxt(o)) + '</div>').join('') + '</div>';
    x += '  Hours\n' + hrs.map(o => '    ' + o.window + ' ' + hourTxt(o)).join('\n') + '\n';
  }
  if (warn.length) { h += warn.map(n => '<div style="margin-top:8px;color:#ad1457;">⚠ ' + esc(n) + '</div>').join(''); x += warn.map(n => '  ! ' + n).join('\n') + '\n'; }
  return { h: h + '</div>', x: x + '\n' };
}
// He Luo box as Edu wants it (26/11/2026, after two tries he could not read: «Così va bene. Prima però riporta il testo
// delle linee così come sono e poi scrivi "Commento" e metti il tuo commento»): the three line texts as they are, then
// «Commento»: a short reading in plain words written every morning by the Assistant (the xkdg-ai Worker, the same one
// the app's chat uses), in the reader's language. If the Assistant does not answer, the short box (heluoShort) is used.
const HL_L = {
  it: { texts: 'Testi delle linee', who: 'Chi muove la giornata', what: 'Cosa si fa', end: 'Come finisce', comment: 'Commento', line: 'linea' },
  en: { texts: 'Line texts', who: 'Who moves the day', what: 'What is done', end: 'How it ends', comment: 'Comment', line: 'line' }
};
const HL_LANG = { it: 'Italian', en: 'English', fr: 'French', de: 'German', es: 'Spanish', vi: 'Vietnamese' };
const AI_URL = process.env.XKDG_AI_URL || 'https://xkdg-ai.decumano16.workers.dev';
const HL_SYS = [
  'You write the daily He Luo Li Shu note inside a morning email. You receive the FACTS of today for one person, computed by an app (JSON). Write a short reading of the day that a person who knows nothing of the method understands at once.',
  'FORMAT, exactly:',
  'First one sentence that says what kind of day it is (good for what, less good for what).',
  'Then an empty line, then 3 to 5 bullets, each: "- **Label of two to four words.** One or two short sentences."',
  'The bullets, in this order, only those that have something to say: how the day starts (who_moves_the_day); what to do (what_is_done); what to watch at the end (how_it_ends); the hours (only if "hours" is not empty: give the clock times exactly as written and say what can happen then); the luck (only if "luck_today" is not empty).',
  'RULES:',
  '1. Plain everyday words and concrete advice (what to do, what to avoid, what not to chase). Speak to the reader directly, informal "you".',
  '2. No hexagram numbers or names, no line numbers, no Chinese characters, no technical words (block, cycle, clash, void, trine, timely). Do not use the words Wealth, Ghost, Parent, Children, Brothers: say what they mean in life, taken from "about" (money and clients; authority, rules and offices; documents, contracts and support; projects and what one produces; colleagues, friends and competitors). You may name the Luck (Fame Luck, Heaven Luck, Earth Luck).',
  '3. Each of the three lines has a text (an old image), text_sign (favourable, neutral, unfavourable) and sometimes a ready comment (written_comment). Turn the image into what it means today for the subject of that line. A favourable line is help; an unfavourable one is what to watch. Do not quote the texts: the reader has them just above.',
  '4. Use "notes" only to adjust the tone: GIVES WAY means that thing weakens or breaks today; COMES ALIVE means it acts strongly; Six Clashes means sudden moves and things that were tied coming apart. The background (cycle, year, month) is only a backdrop: at most half a sentence.',
  // Rule of Edu, 26/11/2026 (the day shut at home by the snow, 55 line 6 «they peer through the gate and no longer perceive anyone»):
  // «a volte bisogna considerare che il testo possa descrivere una situazione oggettiva».
  '4b. A line text is not always advice or a risk to avoid: it can simply DESCRIBE what happens that day. When the image is concrete (a house shut, a journey, a meeting, something lost or received, someone arriving), say it also as a plain possible fact of the day ("you may well spend the day at home, seeing no one"), not only as a warning. This holds above all for how_it_ends. Keep it as a possibility, never a certainty.',
  '5. Never invent facts, events or rules that are not in the data. No greeting, no title, no closing remark, no disclaimer. At most 120 words in all.'
].join('\n');
async function heluoComment(hl, lang) {
  if (!hl || !hl.actor || !hl.action || !hl.outcome) return null;
  const sign = o => (o.s > 0 ? 'favourable' : o.s < 0 ? 'unfavourable' : 'neutral');
  const about = o => String((o.cmt && o.cmt.sphere && o.cmt.meaning) ? o.cmt.meaning : (o.who || '')).replace(/(,| and) the partner \((man|woman)\)/g, (m, j, g) => ((g === 'man') === (hl.gender !== 'F')) ? j + ' the partner' : '');
  const say = o => { const c = o.cmt; if (!c) return ''; return (c.side > 0 || (c.side === 0 && o.s >= 0)) ? (c.strong || '') : (c.weak || c.strong || ''); };
  const L = o => o ? { relation: o.rel, about: about(o), text: o.text, text_sign: sign(o), helped_by_the_time: !!o.timely, written_comment: say(o) } : undefined;
  const lk = []; if (hl.luck) { const g = {}; [['heaven', 'Heaven Luck'], ['earth', 'Earth Luck'], ['fame', 'Fame Luck']].forEach(k => { if (hl.luck[k[0]]) g[hl.luck[k[0]]] = k[1]; });
    [hl.actor.up, hl.actor.lo, hl.outcome.up, hl.outcome.lo].forEach(tg => { if (g[tg] && lk.indexOf(g[tg]) < 0) lk.push(g[tg]); }); }
  const facts = { date: hl.date, reader: hl.gender === 'F' ? 'a woman' : 'a man', sphere_of_life: hl.sphere || 'General (the day as a whole)',
    who_moves_the_day: L(hl.actor), what_is_done: L(hl.action), how_it_ends: L(hl.outcome),
    background: { cycle: L(hl.cycle), year: L(hl.annual), month: L(hl.month) },
    notes: [].concat((hl.prevalence || []).map(p => 'Prevalence: ' + p), hl.year_clash || [], hl.day_clash || [], hl.notes || [], hl.legacy ? [hl.legacy] : []).slice(0, 10),
    luck_today: lk,
    hours: (hl.hours || []).filter(o => o.role).map(o => ({ clock: o.window, what: String(o.role).replace(/\s*\([^)]*\)/g, '') })) };
  const body = JSON.stringify({ max_tokens: 6000, system: HL_SYS + '\n6. Write in ' + (HL_LANG[lang] || 'English') + '.',
    messages: [{ role: 'user', content: 'FACTS OF TODAY:\n' + JSON.stringify(facts) }] });
  for (let n = 0; n < 2; n++) {
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 90000);
      const res = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, signal: ctl.signal }); clearTimeout(tm);
      const d = await res.json().catch(() => null);
      const txt = d && Array.isArray(d.content) ? d.content.map(c => (c && c.type === 'text') ? c.text : '').filter(Boolean).join('\n').trim() : '';
      if (txt) return txt.slice(0, 2500);
      heluoComment.lastError = d && d.error ? String((d.error.type || '') + ' ' + (d.error.message || d.error)).slice(0, 160) : ('HTTP ' + res.status);
    } catch (e) { heluoComment.lastError = String(e && e.message || e).slice(0, 160); }
  }
  return null;
}
// the Assistant's text → HTML: a first sentence, then bullets «- **Label.** text»
function hlCommentHtml(txt) {
  const b = x => esc(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  return String(txt).split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => /^[-•*]\s+/.test(x)
    ? '<div style="margin:5px 0 0 0;padding-left:14px;text-indent:-14px;">• ' + b(x.replace(/^[-•*]\s+/, '')) + '</div>'
    : '<div style="margin:4px 0 0;">' + b(x) + '</div>').join('');
}
function heluoPlain(hl, t) {
  const lang = HL_L[hl.lang] ? hl.lang : 'en', W = HL_L[lang], tt = T[lang] || t;
  const ttl = 'He Luo' + (hl.who ? ' · ' + hl.who : '') + ' · ' + dlabel(hl.date, tt) + (hl.sphere ? ' · ' + hl.sphere : '');
  const c2 = (lbl, gz) => '<td style="text-align:center;padding:0 8px 0 0;font-size:11px;color:#777;">' + lbl + '<div style="font-size:16px;color:#222;line-height:1.25;">' + (gz ? esc(gz.charAt(0)) + '<br>' + esc(gz.charAt(1)) : '·<br>·') + '</div></td>';
  const mB = {}; mB[hl.actor.l] = '#6a1b9a'; mB[hl.action.l] = '#c62828'; const mD = {}; mD[hl.outcome.l] = '#c62828';
  const rows = [[W.who, hl.actor], [W.what, hl.action], [W.end, hl.outcome]];
  let h = '<div style="background:#f7f3ff;border:1px solid #b39ddb;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:14px;">' +
    '<b style="color:#4527a0;font-size:15px;">☯ ' + esc(ttl) + '</b>' +
    '<table style="border-collapse:collapse;margin-top:6px;"><tr>' +
    '<td style="vertical-align:top;padding-right:14px;"><table style="border-collapse:collapse;"><tr>' + c2(tt === T.it ? 'Giorno' : 'Day', hl.bazi.day) + c2(tt === T.it ? 'Mese' : 'Month', hl.bazi.month) + c2(tt === T.it ? 'Anno' : 'Year', hl.bazi.year) + '</tr></table></td>' +
    '<td style="vertical-align:top;padding-right:14px;"><div style="font-size:11px;color:#777;margin-bottom:2px;">' + hl.actor.n + ' ' + esc(hl.actor.name) + '</div>' + hlHex(hl.block_yy, mB) + '</td>' +
    '<td style="vertical-align:top;"><div style="font-size:11px;color:#777;margin-bottom:2px;">' + hl.outcome.n + ' ' + esc(hl.outcome.name) + '</div>' + hlHex(hl.day_yy, mD) + '</td></tr></table>' +
    '<div style="margin-top:10px;"><b style="color:#4527a0;">' + W.texts + '</b></div>' +
    rows.map(r => '<div style="margin-top:6px;"><span style="color:#666;font-size:12px;">' + r[0] + ' · ' + r[1].n + ' ' + esc(r[1].name) + ', ' + W.line + ' ' + r[1].l + '</span><br><i>«' + esc(r[1].text) + '»</i></div>').join('') +
    '<div style="margin-top:12px;padding:8px 10px;background:#fff8e1;border-left:3px solid #f9a825;color:#222;line-height:1.45;"><b style="color:#4527a0;">' + W.comment + '</b>' + hlCommentHtml(hl.comment) + '</div></div>';
  const x = ttl + '\n  ' + W.texts + '\n' + rows.map(r => '    ' + r[0] + ' · ' + r[1].n + ' ' + r[1].name + ', ' + W.line + ' ' + r[1].l + '\n      «' + r[1].text + '»').join('\n') +
    '\n\n  ' + W.comment + '\n' + String(hl.comment).replace(/\*\*/g, '').split(/\n/).map(l => '    ' + l).join('\n') + '\n\n';
  return { h: h, x: x };
}
function heluoBlock(hl, t, full) {
  if (!full && hl && hl.comment && hl.actor && hl.action && hl.outcome) return heluoPlain(hl, t);
  if (!full) return heluoShort(hl, t);

  if (!hl || !hl.actor || !hl.action || !hl.outcome) return { h: '', x: '' };
  const fav = o => (o.s > 0 ? 'favourable' : o.s < 0 ? 'unfavourable' : 'neutral');
  const favC = o => (o.s > 0 ? '#2e7d32' : o.s < 0 ? '#c62828' : '#777');
  const id = o => o.n + ' ' + o.name + ' line ' + o.l + ' ' + o.b;
  // comment to the text: the reading already written in the app for that line, in the sphere chosen in the He Luo
  // window (General when none), on the side the time of today gives it (Edu 25/11/2026)
  const cm = o => { const c = o.cmt; if (!c || !(c.strong || c.meaning)) return null;
    const body = c.side > 0 ? c.strong : c.side < 0 ? c.weak : (c.strong ? 'With the time in favour: ' + c.strong + ' Against: ' + c.weak : '');
    return { head: c.sphere ? c.relation + ' = ' + c.meaning + '.' + (c.off ? ' Read the line about this, not about ' + c.off + '.' : '') : '', body: body }; };
  const cmH = o => { const c = cm(o); return c ? '<div style="margin:3px 0 0;padding:4px 8px;background:#fff8e1;border-left:3px solid #f9a825;color:#333;">💬 ' + (c.head ? '<b>' + esc(c.head) + '</b>' + (c.body ? '<br>' : '') : '') + esc(c.body) + '</div>' : ''; };
  const cmX = o => { const c = cm(o); return c ? '    > ' + [c.head, c.body].filter(Boolean).join(' ') + '\n' : ''; };
  const row = (lbl, o, what) => '<div style="margin-top:7px;"><b style="color:#4527a0;">' + esc(lbl) + '</b> <span style="color:#888;font-size:11px;">' + esc(what) + '</span><br>' +
    esc(id(o)) + ' · <b style="color:' + (HL_RC[o.rel] || '#333') + ';">' + esc(o.rel) + '</b>' + (o.who && !(o.cmt && o.cmt.sphere) ? ' <span style="color:#666;">(' + esc(o.who) + ')</span>' : '') +
    ' · <b style="color:' + favC(o) + ';">' + fav(o) + '</b>' + (o.timely ? ' · timely' : '') + '<br><i>«' + esc(o.text) + '»</i>' + cmH(o) + '</div>';
  const rowX = (lbl, o) => '  ' + lbl + ': ' + id(o) + ' · ' + o.rel + (o.who && !(o.cmt && o.cmt.sphere) ? ' (' + o.who + ')' : '') + ' · ' + fav(o) + (o.timely ? ' · timely' : '') + '\n    «' + o.text + '»\n' + cmX(o);
  const bg = [['Cycle', hl.cycle], ['Year', hl.annual], ['Year, line of the month', hl.annual_month], ['Month', hl.month]].filter(z => z[1]);
  const notes = [].concat(hl.prevalence.map(p => 'Prevalence: ' + p), hl.year_clash, hl.day_clash, hl.notes, hl.legacy ? [hl.legacy] : [], hl.levels);
  // The three Luck in the hexagrams of today (Edu 25/11/2026: «Li è il mio Fame, non c'è scritto»): where each Luck
  // trigram, or its opposite, stands, and which active line sits inside it. Only where they are; no score.
  const LK = hl.luck, lkRows = [];
  if (LK) {
    const nm = {}; [['heaven', 'Heaven'], ['earth', 'Earth'], ['fame', 'Fame']].forEach(k => { if (LK[k[0]]) (nm[LK[k[0]]] = nm[LK[k[0]]] || []).push(k[1] + ' Luck'); });
    [['heaven', 'Heaven'], ['earth', 'Earth'], ['fame', 'Fame']].forEach(k => { const o = (LK.opposite || {})[k[0]]; if (o) (nm[o] = nm[o] || []).push('opposite of ' + k[1]); });
    const lv = [['Cycle', [['line of the cycle', hl.cycle]]], ['Year', [['moved line', hl.annual], ['line of the month', hl.annual_month]]], ['Month', [['month line', hl.month]]],
      ['Block', [['Actor', hl.actor], ['Action', hl.action]]], ['Day', [['Outcome', hl.outcome]]]];
    lv.forEach(L => {
      const ls = L[1].filter(z => z[1]); if (!ls.length) return; const hx = ls[0][1];
      [['upper', hx.up], ['lower', hx.lo]].forEach(pos => {
        if (!pos[1] || !nm[pos[1]]) return;
        const inside = ls.filter(z => (z[1].l <= 3 ? 'lower' : 'upper') === pos[0]).map(z => z[0] + ' (line ' + z[1].l + ' ' + z[1].b + ' ' + z[1].rel + ')');
        lkRows.push({ good: nm[pos[1]].some(q => /Luck$/.test(q)), txt: L[0] + ' ' + hx.n + ' ' + hx.name + ': ' + pos[1] + ' ' + pos[0] + ' = ' + nm[pos[1]].join(', ') + (inside.length ? ' — inside it: ' + inside.join(', ') : '') });
      });
    });
  }
  const lkHead = LK ? 'Heaven ' + LK.heaven + ' · Earth ' + LK.earth + ' · Fame ' + LK.fame : '';
  const col = (lbl, gz) => '<td style="text-align:center;padding:0 8px 0 0;font-size:11px;color:#777;">' + lbl + '<div style="font-size:16px;color:#222;line-height:1.25;">' + (gz ? esc(gz.charAt(0)) + '<br>' + esc(gz.charAt(1)) : '·<br>·') + '</div></td>';
  const mB = {}; mB[hl.actor.l] = '#6a1b9a'; mB[hl.action.l] = '#c62828'; const mD = {}; mD[hl.outcome.l] = '#c62828';
  let h = '<div style="background:#f7f3ff;border:1px solid #b39ddb;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:13px;">' +
    '<b style="color:#4527a0;font-size:14px;">☯ He Luo' + (hl.who ? ' of ' + esc(hl.who) : '') + ' · ' + esc(dlabel(hl.date, t)) + '</b> <span style="color:#666;font-size:12px;">· ' + esc(hl.sphere || 'General') + '</span>' +
    '<table style="border-collapse:collapse;margin-top:6px;"><tr>' +
    '<td style="vertical-align:top;padding-right:14px;"><table style="border-collapse:collapse;"><tr>' + col('Day', hl.bazi.day) + col('Month', hl.bazi.month) + col('Year', hl.bazi.year) + '</tr></table></td>' +
    '<td style="vertical-align:top;padding-right:14px;"><div style="font-size:11px;color:#777;margin-bottom:2px;">Block ' + hl.actor.n + ' ' + esc(hl.actor.name) + '</div>' + hlHex(hl.block_yy, mB) + '</td>' +
    '<td style="vertical-align:top;"><div style="font-size:11px;color:#777;margin-bottom:2px;">Day ' + hl.outcome.n + ' ' + esc(hl.outcome.name) + '</div>' + hlHex(hl.day_yy, mD) + '</td></tr></table>' +
    row('Actor', hl.actor, 'who moves the day (Lord of the block)') + row('Action', hl.action, 'what is done (day line)') + row('Outcome', hl.outcome, 'how it ends (day hexagram)');
  let x = 'He Luo' + (hl.who ? ' of ' + hl.who : '') + ' · ' + dlabel(hl.date, t) + ' · ' + (hl.sphere || 'General') + '\n  Day ' + (hl.bazi.day || '') + ' · Month ' + (hl.bazi.month || '') + ' · Year ' + (hl.bazi.year || '') + '\n' +
    '  Block ' + hl.actor.n + ' ' + hl.actor.name + '\n' + hlTxt(hl.block_yy, (function () { const m = {}; m[hl.actor.l] = 'actor'; m[hl.action.l] = (m[hl.action.l] ? m[hl.action.l] + ', ' : '') + 'action'; return m; })()) +
    '  Day ' + hl.outcome.n + ' ' + hl.outcome.name + '\n' + hlTxt(hl.day_yy, (function () { const m = {}; m[hl.outcome.l] = 'outcome'; return m; })()) +
    rowX('Actor', hl.actor) + rowX('Action', hl.action) + rowX('Outcome', hl.outcome);
  if (LK) {
    h += '<div style="margin-top:9px;"><b style="color:#4527a0;">Luck</b> <span style="color:#666;">' + esc(lkHead) + '</span>' +
      (lkRows.length ? lkRows.map(r => '<div style="margin-top:3px;color:' + (r.good ? '#2e7d32' : '#c62828') + ';">' + (r.good ? '☘ ' : '✖ ') + esc(r.txt) + '</div>').join('')
        : '<div style="margin-top:3px;color:#999;">no Luck trigram in the hexagrams of today</div>') + '</div>';
    x += '  Luck: ' + lkHead + '\n' + (lkRows.length ? lkRows.map(r => '    ' + (r.good ? '+ ' : '- ') + r.txt).join('\n') : '    no Luck trigram in the hexagrams of today') + '\n';
  }
  if (hl.hours && hl.hours.length) {
    h += '<div style="margin-top:9px;"><b style="color:#4527a0;">Hours</b>' + hl.hours.map(o => '<div style="margin-top:3px;"><b style="white-space:nowrap;">' + esc(o.window) + ' ' + esc(o.pillar) + '</b> · ' +
      esc([o.role, o.relief].filter(Boolean).join(' · ')) + '<br><span style="color:#555;">' + o.n + ' line ' + o.l + ' ' + esc(o.b) + ' ' + esc(o.rel) + ' · <i>«' + esc(o.text) + '»</i></span></div>').join('') + '</div>';
    x += '  Hours\n' + hl.hours.map(o => '    ' + o.window + ' ' + o.pillar + ' · ' + [o.role, o.relief].filter(Boolean).join(' · ') + '\n      ' + o.n + ' line ' + o.l + ' ' + o.b + ' ' + o.rel + ' · «' + o.text + '»').join('\n') + '\n';
  }
  if (hl.correct) {
    const c = hl.correct, ct = 'Correct: ' + c.problem + (c.good_day_to_correct ? ' — good day to correct' + (c.what_to_do ? ': ' + c.what_to_do : '') : (c.why ? ' — ' + c.why : ''));
    h += '<div style="margin-top:9px;color:#ad1457;">✚ ' + esc(ct) + '</div>'; x += '  ' + ct + '\n';
  }
  if (hl.alarms && hl.alarms.length) {
    const at = hl.alarms.map(a => typeof a === 'string' ? a : [a.date, a.level, a.note || a.text || (Array.isArray(a.signals) ? a.signals.join(', ') : '')].filter(Boolean).join(' · '));
    h += '<div style="margin-top:9px;"><b style="color:#c62828;">⚠ Next 30 days</b>' + at.map(a => '<div style="margin-top:2px;color:#b71c1c;">' + esc(a) + '</div>').join('') + '</div>';
    x += '  Next 30 days\n' + at.map(a => '    ' + a).join('\n') + '\n';
  }
  if (bg.length) {
    h += '<div style="margin-top:9px;"><b style="color:#4527a0;">Background</b>' + bg.map(z => '<div style="margin-top:3px;color:#444;">' + esc(z[0]) + ': ' + esc(id(z[1])) + ' · <b style="color:' + (HL_RC[z[1].rel] || '#333') + ';">' + esc(z[1].rel) + '</b> · <span style="color:' + favC(z[1]) + ';">' + fav(z[1]) + '</span>' +
      (z[1].timely ? ' · timely' : '') + '<br><i>«' + esc(z[1].text) + '»</i></div>').join('') + '</div>';
    x += '  Background\n' + bg.map(z => '    ' + z[0] + ': ' + id(z[1]) + ' · ' + z[1].rel + ' · ' + fav(z[1]) + (z[1].timely ? ' · timely' : '') + ' · «' + z[1].text + '»').join('\n') + '\n';
  }
  if (notes.length) {
    h += '<div style="margin-top:9px;"><b style="color:#4527a0;">Notes of the day</b>' + notes.map(n => '<div style="margin-top:3px;color:#444;">• ' + esc(n) + '</div>').join('') + '</div>';
    x += '  Notes of the day\n' + notes.map(n => '    - ' + n).join('\n') + '\n';
  }
  return { h: h + '</div>', x: x + '\n' };
}

function build(rec, data, loc) {
  const t = T[rec.lang] || T.en;
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
  { const nm = newMonthLine(rec, loc, t);
    if (nm) {
      H += '<div style="background:#ede7f6;border:1px solid #b39ddb;border-radius:8px;padding:6px 12px;margin-bottom:12px;font-size:13px;color:#4527a0;"><b>🌙 ' + esc(nm.text) + '</b></div>';
      X += nm.text + '\n\n';
    } }
  if (data.aquarium && data.aquarium.list.length) {
    const aq = data.aquarium;
    H += '<div style="border:1px solid ' + (aq.anyBad ? '#e57373;background:#ffebee' : '#c8e6c9;background:#f1f8e9') + ';border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:13px;">' +
      '<b>' + (aq.anyBad ? '⚠ ' : '') + '\uD83D\uDC20 ' + esc(aq.title) + '</b>' +
      aq.list.map(x => '<div style="margin-top:3px;color:' + (x.bad ? '#b71c1c;font-weight:bold' : '#2e7d32') + ';">' + esc(x.text) + '</div>').join('') + '</div>';
    X += (aq.anyBad ? '!! ' : '') + aq.title + '\n' + aq.list.map(x => '  ' + x.text).join('\n') + '\n\n';
  }
  { const sb = switchBlock(data.aquarium, rec); H += sb.h; X += sb.x; }
  { const hb = heluoBlock(data.heluo, t, rec.heluo_full === true); H += hb.h; X += hb.x; }
  { const qb = qdBlock(data.qmdj_day, t); H += qb.h; X += qb.x; }
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
    const fsToday = (data.fs || []).map(r => ({ r: r, d: (r.dates || []).filter(x => x.date === dd.date)[0] })).filter(o => o.d);
    // Feng Shui of the day as a LIST, one row per hour / placement, like the hours above
    const fsRows = [];
    const seenR = new Set();
    fsToday.forEach(o => {
      const r = o.r, where = FSICON[r.kind] + ' ' + r.house + (r.local_time ? ' (' + t.local + ')' : '') + ' \u00b7 ' + r.name;
      if (r.kind === 'aquarium') {
        if (seenR.has(r)) return; seenR.add(r);
        aqVisible(r, dd.date).forEach(x => fsRows.push({
          time: x.window || '', branch: x.branch || '', where: where, grade: 'T' + x.tier, strong: x.tier >= 3,
          note: '', house: r.house }));   // T1 = not connected by definition: the detail says why
      } else if (r.kind === 'fountain') {
        r.dates.filter(x => x.date === dd.date).forEach(x => fsRows.push({ time: x.window, branch: x.branch || '', where: where + ' \u00b7 ON\u2192OFF',
          grade: '', strong: !x.def, note: x.def ? 'no positive hour' : '', house: r.house }));
      } else {
        const d = o.d, bh = d.best_hour ? String(d.best_hour).split(' ') : null;
        fsRows.push({ time: bh && bh[1] ? bh[1] : t.allDay, branch: bh ? bh[0].slice(1) : '', where: where,
          grade: d.score != null ? String(d.score) : '', strong: !!d.full_blood_link || (d.score != null && d.score >= 18),
          note: d.full_blood_link ? 'Full Blood Link' : '', house: r.house });
      }
    });
    fsRows.sort((a, b) => a.house.localeCompare(b.house) || a.time.localeCompare(b.time));   // one house after the other
    const fsHtml = fsRows.length ? '<div style="margin:6px 0 2px;padding:6px 8px;background:#e8f5e9;border-radius:6px;">' +
      '<b style="color:#1b5e20;font-size:13px;">\uD83C\uDFE0 ' + esc(t.fs) + '</b>' +
      '<table style="border-collapse:collapse;font-size:13px;width:100%;margin-top:2px;">' +
      fsRows.map(r => '<tr><td style="padding:3px 6px;white-space:nowrap;' + (r.strong ? 'font-weight:bold;' : '') + '">' + esc(r.time) + '</td>' +
        '<td style="padding:3px 6px;white-space:nowrap;">' + esc(r.branch) + (/^\d\d:/.test(r.time) && isNight(r.time) ? ' \uD83C\uDF19' : '') + '</td>' +
        '<td style="padding:3px 6px;text-align:right;white-space:nowrap;' + (r.strong ? 'color:#2e7d32;font-weight:bold;' : '') + '">' + esc(r.grade) + (r.strong ? ' \u2B50' : '') + '</td>' +
        '<td style="padding:3px 6px;color:#333;">' + esc(r.where) + (r.note ? ' <span style="color:#8a6d00;">\u00b7 ' + esc(r.note) + '</span>' : '') + '</td></tr>').join('') +
      '</table></div>' : '';
    const fsText = !fsRows.length ? '' : '  [' + t.fs + ']\n' + fsRows.map(r => '    ' + r.time + ' ' + r.branch + ' \u00b7 ' + r.grade + (r.strong ? ' *' : '') + ' \u00b7 ' + r.where + (r.note ? ' (' + r.note + ')' : '')).join('\n') + '\n';
    if (!dd.hours.length) { H += '<div style="color:#999;font-size:13px;">' + esc(t.none) + '</div>' + fsHtml; X += '  ' + t.none + '\n' + fsText; return; }
    H += '<table style="border-collapse:collapse;font-size:13px;width:100%;">';
    dd.hours.forEach(h => {
      const s = h.scores.general != null ? h.scores.general : '';
      const strong = s !== '' && s >= 18;
      H += '<tr><td style="padding:3px 6px;white-space:nowrap;' + (strong ? 'font-weight:bold;' : '') + '">' + esc(h.from) + '–' + esc(h.to) + '</td>' +
        '<td style="padding:3px 6px;white-space:nowrap;">' + esc(h.branch) + (isNight(h.from) ? ' 🌙' : '') + '</td>' +
        '<td style="padding:3px 6px;text-align:right;' + (strong ? 'color:#2e7d32;font-weight:bold;' : '') + '">' + esc(s) + '</td>' +
        '<td style="padding:3px 6px;color:#555;">' + esc(pur(h)) + (h.nayin ? ' <span style="color:#8a6d00;">· ' + esc(h.nayin) + '</span>' : '')
        + (h.cure ? ' <span style="color:#ad1457;font-weight:bold;">· ' + esc(h.cure) + '</span>' : '') + '</td></tr>';
      X += '  ' + line(h, false) + (h.nayin ? ' (' + h.nayin + ')' : '') + (h.cure ? ' [' + h.cure + ']' : '') + '\n';
    });
    H += '</table>' + fsHtml; X += fsText;
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
  const fsAll = [];
  (data.fs || []).forEach(r => {
    if (r.kind !== 'aquarium') { (r.dates || []).forEach(d => fsAll.push({ r: r, d: d })); return; }
    const days = [...new Set((r.dates || []).map(x => x.date))];
    days.forEach(day => aqVisible(r, day).forEach(d => fsAll.push({ r: r, d: d })));
  });
  const fsSkipped = (data.fs || []).filter(r => r.note);
  if (fsAll.length || fsSkipped.length) {
    fsAll.sort((a, b) => (a.d.date + (a.d.window || '')).localeCompare(b.d.date + (b.d.window || '')));
    H += '<h2 style="margin:22px 0 6px;color:#1b5e20;border-top:2px solid #c8e6c9;padding-top:10px;">\uD83C\uDFE0 ' + esc(t.fsDetail) + '</h2>';
    X += '\n==== ' + t.fsDetail + ' ====\n';
    fsAll.forEach(o => {
      const r = o.r, d = o.d, parts = [];
      if (r.kind === 'aquarium') {
        parts.push([t.aqTier, 'T' + d.tier + ' \u00b7 ' + (d.person_connected ? t.aqConn : t.aqNot)]);
        parts.push([t.aqWhy, d.why || '\u2014']);
        if (d.hits && d.hits.length) parts.push(['Qimen', d.hits.join(' \u00b7 ')]);
        if (d.also_good_for && d.also_good_for.length) parts.push([t.purposes, d.also_good_for.join(' \u00b7 ')]);
      } else if (r.kind === 'fountain') {
        parts.push(['ON \u2192 OFF', d.window + ' (' + (r.period === 'night' ? '\uD83C\uDF19' : '\u2600\uFE0F') + ' ' + d.branch + ')']);
        if (d.via) parts.push(['XKDG', d.via]);
      } else if (r.kind === 'water') {
        parts.push([t.fsDoor, (d.facing_links || []).join(' \u00b7 ') || '\u2014']);
        parts.push([t.fsWater, (d.water_links || []).join(' \u00b7 ') || '\u2014']);
        if (d.full_blood_link) parts.push(['\u2B50', t.fsBL]);
        if (d.best_hour) parts.push([t.fsBest, d.best_hour]);
      } else {
        parts.push([t.fsPl, (d.date_link || []).join(' \u00b7 ') || '\u2014']);
        (d.people || []).forEach(p => parts.push([p.who, t.fsWith + ': ' + ((p.with_placement || []).join(', ') || '\u2014') + ' \u00b7 ' + t.fsDate + ': ' + ((p.with_date || []).join(', ') || '\u2014')]));
      }
      const hx = r.kind === 'fountain' ? ' (' + r.facing + '\u00b0 / ' + r.water + '\u00b0)' : r.kind === 'aquarium' ? ' (' + r.direction + (r.water_star != null ? ', water star ' + r.water_star : '') + ')' + (d.window ? ' \u00b7 ' + d.branch + ' ' + d.window : '') : r.hex ? (r.kind === 'water' ? ' (hex ' + r.hex.facing + ' / ' + r.hex.water + ')' : ' (hex ' + r.hex.placement + ')') : '';
      const head = FSICON[r.kind] + ' ' + r.house + ' \u00b7 ' + r.name + hx + (d.score != null ? ' \u00b7 ' + d.score : '');
      H += '<div style="margin:8px 0;padding:6px 10px;border-left:3px solid #81c784;background:#f1f8e9;font-size:12px;">' +
        '<span style="display:inline-block;background:#1b5e20;color:#fff;font-weight:bold;border-radius:5px;padding:1px 7px;margin-right:6px;font-size:12px;">' + esc(dlabel(d.date, t)) + '</span>' +
        '<b style="font-size:13px;">' + esc(head) + '</b>' + (d.day_gz ? ' <span style="color:#888;">' + esc(t.day) + ' ' + esc(d.day_gz) + '</span>' : '') + '<br>' +
        parts.map(p => '<span style="color:#777;">' + esc(p[0]) + ':</span> ' + esc(p[1])).join('<br>') + '</div>';
      X += '\n' + dlabel(d.date, t) + ' ' + head + '\n' + parts.map(p => '   ' + p[0] + ': ' + p[1]).join('\n') + '\n';
    });
    fsSkipped.forEach(r => {
      H += '<div style="color:#999;font-size:12px;">' + esc(FSICON[r.kind] + ' ' + r.house + ' \u00b7 ' + r.name + ': ' + t.fsSkip + ' (' + r.note + ')') + '</div>';
      X += FSICON[r.kind] + ' ' + r.house + ' - ' + r.name + ': ' + t.fsSkip + ' (' + r.note + ')\n';
    });
  }
  H += '<div style="color:#888;font-size:12px;margin-top:16px;">' + esc(t.note) + ' ' + esc(loc.label) + '. ' + esc(t.note2) +
    '<br><a href="https://fsadvisor.org/xkdg/">' + esc(t.open) + '</a></div></div>';
  const first = data.days[0].date, last = data.days[data.days.length - 1].date;
  return { subject: (data.aquarium && data.aquarium.anyBad ? '⚠ \uD83D\uDC20 ' : '') + t.subj + ' · ' + dlabel(first, t) + ' → ' + dlabel(last, t), html: H, text: X };
}

// ── Aquarium light plans (session 33, Edu: "devo essere avvertito nella email") ──
// The recipient line can carry "shelly": {url, token, devices:[{name, device, tz}]} (built by
// the app's 📧 Daily email button). For each device the stored plan is read from the Shelly
// Worker and the email warns when it has ENDED, ends today/tomorrow, is PAUSED or has
// missed switch-ons. The token never appears in the logs.
const AQ = {
  it: { ok: 'piano fino al', ended: 'il piano è FINITO il {d}: la luce non si accende più. Apri l’app e deposita un nuovo piano.', none: 'nessun piano depositato: la luce non si accende. Apri l’app e deposita un piano.',
        ends: 'il piano finisce il {d}: rinnovalo.', paused: 'automazione IN PAUSA: il piano non scatta.', missed: '{n} accensioni/spegnimenti mancati', unread: 'impossibile leggere il piano', title: 'Acquari' },
  en: { ok: 'plan until', ended: 'the plan ENDED on {d}: the light no longer switches on. Open the app and deposit a new plan.', none: 'no plan stored: the light will not switch on. Open the app and deposit a plan.',
        ends: 'the plan ends on {d}: renew it.', paused: 'automation PAUSED: the plan does not fire.', missed: '{n} missed switch-ons/offs', unread: 'could not read the plan', title: 'Aquariums' },
  fr: { ok: 'plan jusqu’au', ended: 'le plan est TERMINÉ le {d} : la lumière ne s’allume plus. Ouvrez l’app et déposez un nouveau plan.', none: 'aucun plan déposé : la lumière ne s’allume pas. Ouvrez l’app et déposez un plan.',
        ends: 'le plan se termine le {d} : renouvelez-le.', paused: 'automatisation EN PAUSE : le plan ne se déclenche pas.', missed: '{n} allumages/extinctions manqués', unread: 'impossible de lire le plan', title: 'Aquariums' }
};
// Next solar month (节 Jie): absolute instant (lunar-javascript gives it in Beijing time).
function nextJie(fromMs) {
  try {
    const { Solar } = require('lunar-javascript');
    let s = Solar.fromDate(new Date(fromMs));
    for (let i = 0; i < 3; i++) {
      const j = s.getLunar().getNextJie(), so = j.getSolar();
      const ms = Date.UTC(so.getYear(), so.getMonth() - 1, so.getDay(), so.getHour() - 8, so.getMinute(), so.getSecond());
      if (ms > fromMs) return { ms: ms, name: j.getName() };
      s = Solar.fromDate(new Date(ms + 3600000));
    }
  } catch (e) {}
  return null;
}
const NM = {
  it: { t: 'Nuovo mese', d0: 'oggi', d1: 'domani', dn: 'tra {n} giorni', at: 'alle' },
  en: { t: 'New month', d0: 'today', d1: 'tomorrow', dn: 'in {n} days', at: 'at' },
  fr: { t: 'Nouveau mois', d0: 'aujourd’hui', d1: 'demain', dn: 'dans {n} jours', at: 'à' }
};
function newMonthLine(rec, loc, t) {
  const j = nextJie(Date.now()); if (!j) return null;
  const n = NM[rec.lang] || NM.en;
  const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: loc.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(j.ms)).forEach(x => { p[x.type] = x.value; });
  const iso = p.year + '-' + p.month + '-' + p.day;
  const days = Math.round((Date.parse(iso + 'T12:00:00Z') - Date.parse(todayIn(loc.tz) + 'T12:00:00Z')) / 86400000);
  const when = days === 0 ? n.d0 : days === 1 ? n.d1 : n.dn.replace('{n}', days);
  return { days: days, text: n.t + ' (' + j.name + ') ' + when + ': ' + dlabel(iso, t) + ' ' + n.at + ' ' + p.hour + ':' + p.minute };
}
async function aquariumStatus(rec, loc) {
  const S = rec.shelly;
  if (!S || !S.url || !S.token || !Array.isArray(S.devices) || !S.devices.length) return null;
  const a = AQ[rec.lang] || AQ.en, out = [], switches = [];
  const t0 = T[rec.lang] || T.en, d0 = todayIn((loc && loc.tz) || 'Europe/Vienna');
  const d1 = (function () { const d = new Date(d0 + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();
  for (const dv of S.devices) {
    const tz = dv.tz || 'Europe/Vienna', name = dv.name || dv.device;
    const fmt = ms => { const p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: '2-digit', month: '2-digit' }).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; }); return p.day + '/' + p.month; };
    try {
      const url = String(S.url).replace(/\/+$/, '') + '?get_plan&device=' + encodeURIComponent(dv.device) + '&token=' + encodeURIComponent(S.token);
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
      const res = await fetch(url, { method: 'POST', signal: ctl.signal }); clearTimeout(tm);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) { out.push({ bad: true, text: name + ': ' + a.unread }); continue; }
      const days = (data.plan && Array.isArray(data.plan.days)) ? data.plan.days : [];
      const now = Date.now(), msgs = []; let bad = false;
      // the switch times of today and tomorrow, as stored (clock time of the device)
      try {
        const loc2 = ms => { const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
          return { d: p.year + '-' + p.month + '-' + p.day, hm: p.hour + ':' + p.minute }; };
        const iv = days.map(d => ({ on: +d.onTs, off: +d.offTs })).filter(v => isFinite(v.on) && isFinite(v.off) && v.off > v.on).sort((p, q) => p.on - q.on);
        const of = day => iv.map(v => ({ A: loc2(v.on), B: loc2(v.off - 1000), Bx: loc2(v.off) })).filter(v => v.A.d <= day && v.B.d >= day)
          .map(v => ({ on: (v.A.d < day ? dlabel(v.A.d, t0) + ' ' : '') + v.A.hm, onPrev: v.A.d < day, off: (v.Bx.d > day ? dlabel(v.Bx.d, t0) + ' ' : '') + v.Bx.hm }));
        switches.push({ icon: /letto|porta|fount|fontan/i.test(dv.device + ' ' + name) ? '\u26F2' : '\uD83D\uDC20', name: name, today: of(d0), tomorrow: of(d1) });
      } catch (eSw) {}
      const lastOff = days.reduce((m, d) => Math.max(m, +d.offTs || 0), 0);
      if (!days.length) { msgs.push(a.none); bad = true; }
      else if (lastOff < now) { msgs.push(a.ended.replace('{d}', fmt(lastOff))); bad = true; }
      else if (lastOff - now < 36 * 3600000) { msgs.push(a.ends.replace('{d}', fmt(lastOff))); bad = true; }
      if (String(data.automation || '').toUpperCase() === 'PAUSED') { msgs.push(a.paused); bad = true; }
      const nMiss = data.alerts_total != null ? +data.alerts_total : (Array.isArray(data.alerts) ? data.alerts.length : 0);
      if (nMiss > 0) { msgs.push(a.missed.replace('{n}', nMiss)); bad = true; }
      if (!bad) msgs.push(a.ok + ' ' + fmt(lastOff));
      out.push({ bad: bad, text: name + ': ' + msgs.join(' · ') });
    } catch (e) { out.push({ bad: true, text: name + ': ' + a.unread }); }
  }
  return { title: a.title, list: out, anyBad: out.some(x => x.bad), switches: switches };
}

async function main() {
  let recs;
  try { recs = JSON.parse(process.env.XKDG_DIGEST_RECIPIENTS || '[]'); } catch (e) { console.log('XKDG_DIGEST_RECIPIENTS is not valid JSON'); process.exit(1); }
  if (!Array.isArray(recs)) recs = [recs];
  // One line may carry several addresses, "a@x.com, b@y.com" (Edu, session 42: Thao gets Edu's own email).
  function _mails(v) { return String(v || '').split(/[;,]/).map(x => x.trim()).filter(Boolean); }
  // Students who subscribed from their own app (session 41): read from the xkdg-shelly Worker with
  // the URL + token already in Edu's line (shelly), or XKDG_SUBS_URL / XKDG_SUBS_TOKEN. Same email:
  // the secret wins. The log shows only the count.
  try {
    const src = recs.find(r => r && r.shelly && r.shelly.url && r.shelly.token);
    const u = process.env.XKDG_SUBS_URL || (src && src.shelly.url), t = process.env.XKDG_SUBS_TOKEN || (src && src.shelly.token);
    if (u && t) {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
      const res = await fetch(String(u).replace(/\/+$/, '') + '?digest_subscribers&token=' + encodeURIComponent(t), { method: 'POST', signal: ctl.signal }); clearTimeout(tm);
      const j = await res.json().catch(() => null);
      const have = new Set([].concat.apply([], recs.map(r => _mails(r.email).map(x => x.toLowerCase()))));
      const add = (j && Array.isArray(j.subscribers) ? j.subscribers : []).filter(l => l && l.email && !have.has(String(l.email).toLowerCase()));
      // He Luo of the day (Edu 25/11/2026): never for a line a student sent from the app; the owner is the
      // line of the secret whose token reads the subscribers (the Worker's master token).
      add.forEach(l => { l._sub = true; delete l.heluo; });
      if (src && res.ok && j && Array.isArray(j.subscribers)) src._owner = true;
      recs = recs.concat(add);
      console.log('subscribers from the app: ' + add.length + (res.ok ? '' : ' (HTTP ' + res.status + ')'));
    }
  } catch (e) { console.log('subscribers from the app: not readable'); }
  if (!recs.length) { console.log('No recipients configured.'); process.exit(1); }
  const dry = !!process.env.DRY_RUN;
  const testOwner = !dry && !!process.env.TEST_OWNER;        // "Run workflow" → test: only the owner's own email is sent
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
      if (testOwner && !rec._owner) { console.log(tag + ': skipped (test run)'); continue; }
      const c = CITIES[String(rec.city || 'vienna').toLowerCase()] || {};
      const loc = { lat: rec.lat != null ? +rec.lat : c.lat, lon: rec.lon != null ? +rec.lon : c.lon, tz: rec.tz || c.tz || 'Europe/Vienna', label: rec.city_label || c.label || rec.city || '' };
      if (!isFinite(loc.lat) || !isFinite(loc.lon)) throw new Error('unknown location');
      if (!rec.email || !(rec.birth_date || rec.jiazi)) throw new Error('email and birth_date (or jiazi) are required');
      // each house at its own place; houses in another time zone run in their own process
      const houses = (rec.houses || []).map(h => {
        const hc = CITIES[String(h.city || '').toLowerCase()] || {};
        return Object.assign({}, h, { lat: h.lat != null ? +h.lat : (hc.lat != null ? hc.lat : loc.lat), lon: h.lon != null ? +h.lon : (hc.lon != null ? hc.lon : loc.lon), tz: h.tz || hc.tz || loc.tz });
      });
      const sameTz = (a, b) => tzSig(a) === tzSig(b);
      const run = (zone, extra) => JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'scan.js'), JSON.stringify(Object.assign({
        birth_date: rec.birth_date, birth_time: rec.birth_time, jiazi: rec.jiazi, lat: loc.lat, lon: loc.lon, tz: zone, start: todayIn(loc.tz), days: 8 }, extra))],
        { env: Object.assign({}, process.env, { TZ: zone }), maxBuffer: 20e6, timeout: 600000 }).toString());
      const data = run(loc.tz, { houses: houses.filter(h => sameTz(h.tz, loc.tz)) });
      if (data.error) throw new Error(data.error);
      const others = {};
      houses.filter(h => !sameTz(h.tz, loc.tz)).forEach(h => { (others[h.tz] = others[h.tz] || []).push(h); });
      Object.keys(others).forEach(z => { const d2 = run(z, { houses: others[z], skip_hours: true }); (d2.fs || []).forEach(r => { r.local_time = true; }); data.fs = (data.fs || []).concat(d2.fs || []); });
      try { data.aquarium = await aquariumStatus(rec, loc); } catch (eAq) { data.aquarium = null; }
      // He Luo of today: a line of the secret with "heluo": "M" | "F"; the owner's line gets it by itself
      // (HELUO_OWNER_GENDER) unless it says "heluo": false. Its own process, so the hours above do not change.
      try {
        const hg = rec._sub ? null : (rec.heluo === 'M' || rec.heluo === 'F') ? rec.heluo : (rec.heluo === false ? null : (rec._owner ? HELUO_OWNER_GENDER : null));
        // sphere of the comments: the one chosen in the He Luo window (the app sends it to the Worker, ?set_pref);
        // else "sphere" in the line of the secret; else General
        let sph = typeof rec.sphere === 'string' ? rec.sphere : '', vr = typeof rec.variant === 'string' ? rec.variant : '';
        if (hg && rec._owner && rec.shelly && rec.shelly.url && rec.shelly.token) {
          try { const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 15000);
            const rs = await fetch(String(rec.shelly.url).replace(/\/+$/, '') + '?get_pref&token=' + encodeURIComponent(rec.shelly.token), { method: 'POST', signal: ctl.signal }); clearTimeout(tm);
            const jp = await rs.json().catch(() => null);
            if (jp && jp.action === 'get_pref') rec._sphApp = true;   // the Worker knows ?get_pref (25/11/2026 or later)
            if (jp && jp.action === 'get_pref' && jp.pref && typeof jp.pref.sphere === 'string') { sph = jp.pref.sphere; vr = String(jp.pref.variant || ''); }
          } catch (ePf) {}
        }
        sph = /^[a-z]{0,20}$/.test(sph) ? sph : ''; vr = /^[A-Za-z0-9_-]{0,20}$/.test(vr) ? vr : '';
        if (hg && rec.birth_date && rec.birth_time) { const d3 = run(loc.tz, { heluo: hg, heluo_only: true, skip_hours: true, days: 1, sphere: sph, variant: vr }); data.heluo = d3.heluo || null; if (!d3.heluo) console.log(tag + ': He Luo not computed'); }
      } catch (eHl) { data.heluo = null; console.log(tag + ': He Luo not computed'); }
      // Who reads which He Luo (Edu 25/11/2026: «la mail a Thao deve contenere il SUO HLLS del giorno, non il mio»).
      // A line with several addresses and a He Luo: the reading of the line is for the FIRST address only. Another
      // address gets its own reading when the line carries that person — "heluo_for": { "<address>": { "name",
      // "birth_date", "birth_time", "gender": "M" | "F", "sphere" } } — and no He Luo box otherwise. The rest of the
      // email is the same for all. One address, or no He Luo: one email to everybody, as before.
      const mails = _mails(rec.email), sends = [];
      if (data.heluo && mails.length > 1) {
        const hf = {}; if (!rec._sub && rec.heluo_for && typeof rec.heluo_for === 'object') Object.keys(rec.heluo_for).forEach(k => { hf[String(k).trim().toLowerCase()] = rec.heluo_for[k]; });
        sends.push({ to: [mails[0]], heluo: data.heluo });
        const plain = [];
        mails.slice(1).forEach(m => {
          const p = hf[m.toLowerCase()]; let h = null;
          if (p && typeof p === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(String(p.birth_date || '')) && /^\d{1,2}:\d{2}$/.test(String(p.birth_time || '')) && (p.gender === 'M' || p.gender === 'F')) {
            try { const d4 = run(loc.tz, { birth_date: p.birth_date, birth_time: p.birth_time, jiazi: undefined, heluo: p.gender, heluo_only: true, skip_hours: true, days: 1,
                sphere: /^[a-z]{1,20}$/.test(String(p.sphere || '')) ? p.sphere : '', variant: '' });
              h = d4.heluo || null; if (h) { h.who = String(p.name || '').slice(0, 40); h.lang = HL_L[p.lang] ? p.lang : 'en'; } } catch (e4) { h = null; }
            if (!h) console.log(tag + ': He Luo of a second reader not computed');
          }
          if (h) sends.push({ to: [m], heluo: h }); else plain.push(m);
        });
        if (plain.length) sends.push({ to: plain, heluo: null });
      } else sends.push({ to: mails, heluo: data.heluo || null });
      const n = data.days.reduce((s, d) => s + d.hours.length, 0);
      // «Commento»: one request to the Assistant per reader with a He Luo (not for the long box). The line's own
      // reader gets it in "heluo_lang" (the owner: Italian); a second reader in the "lang" of their entry (English).
      let cmtN = 0, cmtErr = '';
      for (let k = 0; k < sends.length; k++) {
        const hh = sends[k].heluo; if (!hh || rec.heluo_full === true || (testOwner && k > 0)) continue;
        if (!hh.lang) hh.lang = HL_L[rec.heluo_lang] ? rec.heluo_lang : (rec._owner ? HELUO_OWNER_LANG : (HL_L[rec.lang] ? rec.lang : 'en'));
        hh.comment = await heluoComment(hh, hh.lang); if (hh.comment) cmtN++; else cmtErr = heluoComment.lastError || 'no reply';
      }
      for (let k = 0; k < sends.length; k++) {
        if (testOwner && k > 0) break;                       // test run: the owner's own email only
        data.heluo = sends[k].heluo;
        const msg = build(rec, data, loc);
        if (testOwner) msg.subject = 'TEST \u00b7 ' + msg.subject;
        if (dry) {
          const dir = process.env.DRY_RUN_DIR || __dirname, nm = 'digest-' + (i + 1) + (k ? String.fromCharCode(97 + k) : '');
          fs.writeFileSync(path.join(dir, nm + '.html'), '<meta charset="utf-8">' + msg.html);
          fs.writeFileSync(path.join(dir, nm + '.txt'), msg.subject + '\n\n' + msg.text);
        } else {
          await mailer.sendMail({ from: '"XKDG" <' + process.env.GMAIL_USER + '>', to: sends[k].to, subject: msg.subject, html: msg.html, text: msg.text });
        }
      }
      // counts only (the log is public): how many emails, how many carry a He Luo box, whether the sphere came from the app
      console.log(tag + ': ' + n + ' hours' + (sends.length > 1 ? ', ' + sends.length + ' emails' : '') +
        (sends.some(x => x.heluo) ? ', He Luo in ' + sends.filter(x => x.heluo).length + (rec._sphApp ? ' (sphere from the app)' : '') + ', comments written ' + cmtN + (cmtErr ? ' (Assistant: ' + cmtErr + ')' : '') : '') +
        (dry ? ' (dry run, not sent)' : testOwner ? ', TEST sent to the first address only' : ', sent'));
    } catch (e) { failed++; console.log(tag + ': FAILED - ' + String(e.message || e).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>').slice(0, 200)); }
  }
  if (failed) process.exit(1);
}
main();

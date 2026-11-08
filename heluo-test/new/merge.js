// Unisce new/g*.json in ../famous_violent.json nello schema di famous_*.json
'use strict';
const fs = require('fs'), path = require('path');
const DROP = [ // eventi tolti in revisione: [nome, data, motivo]
  ['Jim Clark', '1961-09-10', 'Clark illeso a Monza 1961: nessun danno alla persona'],
  ['Federico García Lorca', '1936-08-19', 'data della fucilazione solo presunta'],
];
const people = [], log = [];
for (const f of fs.readdirSync(__dirname).filter(f => /^g\d+\.json$/.test(f)).sort()) {
  for (const p of JSON.parse(fs.readFileSync(path.join(__dirname, f)))) {
    const b = p.birth;
    if (!['AA', 'A'].includes(b.rodden)) { log.push('scartato ' + p.name + ' rating ' + b.rodden); continue; }
    const tz = b.lmt ? 'LMT' : 'UTC' + (b.utcOffset >= 0 ? '+' : '') + b.utcOffset;
    const events = p.events.filter(e => !DROP.some(d => d[0] === p.name && d[1] === e.date))
      .map(e => ({ date: e.date, time: null, polarity: e.pol, what: e.what, source: e.source, violent: !!e.violent }));
    // ora debole: rating A (non da documento) con minuti tondi (:00 :15 :30 :45) o mezzanotte convenzionale (00:01)
    const mm = +b.time.slice(3), weak = b.rodden === 'A' && ([0, 15, 30, 45].includes(mm) || b.time === '00:01');
    people.push({ name: p.name, sex: p.sex, group: f.replace('.json', ''), weakTime: weak,
      birth: { date: b.date, time: b.time, place: b.place, lat: b.lat, lon: b.lon, tz, rodden: b.rodden, source: b.sourceBirth, notes: b.note || '' },
      events });
  }
}
const out = { meta: { created: new Date().toISOString().slice(0, 10), note: 'Campione allargato eventi violenti (sessione 45). Ore Rodden AA/A da astrotheme. tz: UTC±h fisso come da fonte, LMT prima dei fusi standard.', dropped: DROP }, people };
fs.writeFileSync(path.join(__dirname, '..', 'famous_violent.json'), JSON.stringify(out, null, 1));
const ev = people.flatMap(p => p.events);
console.log('persone', people.length, 'eventi', ev.length, 'violenti', ev.filter(e => e.violent).length, 'trionfi', ev.filter(e => e.polarity === '+').length);
log.forEach(l => console.log(l));

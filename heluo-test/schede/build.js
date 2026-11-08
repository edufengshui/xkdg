// Schede natali He Luo (metodo A = app) per il giudizio cieco di Edu.
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../cmp/heluo_cmp.js');
const H = global.XKDGHeluo;
require(path.join(__dirname, '..', '..', 'heluo-texts.js'));
const TX = global.XKDG_HELUO_TEXTS;
const all = [].concat(...['famous_violent.json','famous_arts.json','famous_politics.json'].map(f => JSON.parse(fs.readFileSync(path.join(__dirname,'..',f))).people));
const PICK = ['Olof Palme','Anna Lindh','Sharon Tate','James Dean','Malcolm X','Pier Paolo Pasolini',
              'Elizabeth II','Luciano Pavarotti','Sophia Loren','Albert Einstein','Pablo Picasso','Bill Gates'];
// ordine mescolato fisso
const ORDER = [7,0,10,3,8,1,11,4,6,2,9,5];
const tname = n => (TX[n] && TX[n].title) || '';
const hx = h => ({ n: h.n, name: tname(h.n), upper: h.upper, lower: h.lower, lines: h.lines.join('') });
const out = [], key = {};
ORDER.forEach((ix, k) => {
  const p = all.find(x => x.name === PICK[ix]), b = p.birth, code = 'S' + String(k + 1).padStart(2, '0');
  const P = C.pillars(b.date, b.time, b.lon, b.tz), R = H.fromPillars(P, p.sex === 'M');
  const I = R.input, ST = H.STEMS, BR = H.BRANCHES;
  const col = i => ST[I.p.stems[i]] + BR[I.p.branches[i]];
  key[code] = p.name;
  out.push({ code, sex: p.sex,
    bazi: { ora: col(3), giorno: col(2), mese: col(1), anno: col(0) }, heluoYear: I.o.year, solarYearPillar: I.solarYearPillar,
    dun: I.o.yangDun ? 'Yang Dun' : 'Yin Dun', season: ['WS→SE','SE→SS','SS→AE','AE→WS'][I.o.season],
    numbers: R.numbers, heaven: R.heavenTrigram, earth: R.earthTrigram, five: R.five ? R.fiveCycle : null, heavenUp: R.heavenUp,
    xt: hx(R.xianTian), mv: R.moving.line, ht: R.houTian && Object.assign(hx(R.houTian.hex), { line: R.houTian.line, rule: R.houTian.rule }),
    posXT: R.positionXT, supXT: R.supportXT, posHT: R.positionHT, supHT: R.supportHT, prevXT: R.prevailingXT, prevHT: R.prevailingHT,
    huXT: hx(R.huXT), huHT: R.huHT && hx(R.huHT), oppXT: hx(R.oppositeXT), invXT: hx(R.inverseXT),
    oppHT: R.oppositeHT && hx(R.oppositeHT), invHT: R.inverseHT && hx(R.inverseHT),
    luck: R.luck, cXT: R.cyclesXT, cHT: R.cyclesHT });
});
fs.writeFileSync(path.join(__dirname, 'schede.json'), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(__dirname, 'chiave-NON-APRIRE.json'), JSON.stringify(key, null, 1));
out.forEach(s => console.log(s.code, s.sex, s.bazi.ora, s.bazi.giorno, s.bazi.mese, s.bazi.anno, 'H', s.numbers.heaven, 'E', s.numbers.earth, s.heaven+'/'+s.earth, 'XT', s.xt.n, 'l'+s.mv, '→HT', s.ht && s.ht.n, 'l'+(s.ht&&s.ht.line), s.five||'', 'luck', s.luck.heaven, s.luck.earth, s.luck.fame));

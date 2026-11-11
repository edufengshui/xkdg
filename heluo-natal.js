// He Luo Li Shu — natal reading with analysis (part A, Edu 11/11/2026).
// Order: Profile → Structure (XT/HT) → Six relations on the person → Luck and voids → Life cycles (drawing, text,
// time judgement, score) → Synthesis → Now (annual, monthly, today with primary and secondary text).
// Rules: claude/hlls-regole-lettura-wealth.md (person = element of the trigram of the line; relations on the person;
// Wealth searched in cycle line, other trigram, Hu, hidden, year branches, Output 食傷生財), claude/hlls-luck-cascata.md,
// time rules of 11/11 (三會, void filled by the same branch). Needs XKDGHeluo, HeluoNaJia, XKDGHeluoDSCore, XKDG_HELUO_SCORES.
// Interface in English (Edu 10/11). Cycle-line time is judged on the birth pillars (year, month, day) — the "natal
// time" — and the years of the cycle that activate or clash the line are listed.
(function (root) {
  'use strict';
  function H() { return root.XKDGHeluo; }
  function NJ() { return root.HeluoNaJia; }
  function DS() { return root.XKDGHeluoDSCore; }
  function SC() { return root.XKDG_HELUO_SCORES; }
  function TX() { return root.XKDG_HELUO_TEXTS || null; }

  var BR = '子丑寅卯辰巳午未申酉戌亥';
  var TRI_EL = { Qian: 'Metal', Dui: 'Metal', Li: 'Fire', Zhen: 'Wood', Xun: 'Wood', Kan: 'Water', Gen: 'Earth', Kun: 'Earth' };
  var BR_EL = { 子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire', 午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water' };
  var BR_TRI = ['Kan', 'Gen', 'Gen', 'Zhen', 'Xun', 'Xun', 'Li', 'Kun', 'Kun', 'Dui', 'Qian', 'Qian'];
  var GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
  var CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
  var LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  var REL = { P: 'Parent', W: 'Wealth', G: 'Ghost', C: 'Children', B: 'Brothers' };
  var REL_ORDER = ['W', 'C', 'P', 'G', 'B'];
  var MEANING = {
    W: 'harvest, accumulated wealth, for a man also the partner',
    C: 'output: creating, products, teaching, giving; it generates Wealth (食傷生財)',
    P: 'support, documents, contracts, study, property',
    G: 'pressure, attacks, illness; also office, authority and public role',
    B: 'partners, peers, associates; also competitors who take the Wealth (比劫奪財)'
  };
  function clash(b) { return BR[(BR.indexOf(b) + 6) % 12]; }
  function brTri(b) { return BR_TRI[BR.indexOf(b)]; }
  function yearBranch(y) { return BR[((y - 4) % 12 + 12) % 12]; }
  function cap(k) { return k.charAt(0).toUpperCase() + k.slice(1); }
  function rel(me, el) { return DS().rel(me, el); }

  // places of each relation inside a native hexagram, for the person `me`
  function relPlaces(hx, hu, me) {
    var out = { W: [], C: [], P: [], G: [], B: [] }, d = NJ()[hx.n];
    out[rel(me, TRI_EL[hx.upper])].push('upper trigram ' + hx.upper);
    out[rel(me, TRI_EL[hx.lower])].push('lower trigram ' + hx.lower);
    out[rel(me, TRI_EL[hu.upper])].push('upper Hu ' + hu.upper + ' (lines 3–5)');
    out[rel(me, TRI_EL[hu.lower])].push('lower Hu ' + hu.lower + ' (lines 2–4)');
    d.lines.forEach(function (L, i) {
      out[rel(me, L.el)].push('line ' + (i + 1) + ' ' + L.branch);
      if (L.fushen) out[rel(me, L.fushen.el)].push('hidden ' + L.fushen.branch + ' under line ' + (i + 1));
    });
    return out;
  }

  // ── Analysis ──────────────────────────────────────────────────────────────
  // R = XKDGHeluo.fromPillars(Pn, male); Pn = birth pillars (XKDGSolarTime)
  function analyze(R, Pn, male) {
    var ds = DS(), xt = R.xianTian, ht = R.houTian && R.houTian.hex, y0 = R.input.o.year;
    var mb = Pn.month[1], T = { y: R.input.heluoYearPillar ? R.input.heluoYearPillar[1] : Pn.year[1], m: mb, d: Pn.day[1] };
    var dayV = ds.voids(Pn.day), yearV = ds.voids(R.input.heluoYearPillar || Pn.year), natVoids = dayV.concat(yearV);
    var A = { R: R, Pn: Pn, male: !!male, y0: y0, T: T, natives: [], voids: null, luck: [], cycles: [], synth: [], warn: [] };

    // 1 · Profile and 3 · relations per native (one person per element of the native)
    [['XT', 'Xian Tian', xt, R.huXT, R.cyclesXT], ['HT', 'Hou Tian', ht, R.huHT, R.cyclesHT]].forEach(function (g) {
      var hx = g[2]; if (!hx) return;
      var one = TRI_EL[hx.upper] === TRI_EL[hx.lower], persons = one ? [TRI_EL[hx.upper]] : [TRI_EL[hx.lower], TRI_EL[hx.upper]];
      var cy = g[4], N = {
        key: g[0], name: g[1], hx: hx, hu: g[3], cycles: cy, one: one, from: cy[0].from, to: cy[cy.length - 1].to,
        movingLine: g[0] === 'XT' ? R.moving.line : R.houTian.line,
        position: g[0] === 'XT' ? R.positionXT : R.positionHT, support: g[0] === 'XT' ? R.supportXT : R.supportHT,
        prevailing: g[0] === 'XT' ? R.prevailingXT : R.prevailingHT,
        persons: persons.map(function (me, i) {
          var tri = one ? null : (i === 0 ? hx.lower : hx.upper);
          var ages = cy.filter(function (c) { return one || (i === 0 ? c.line <= 3 : c.line >= 4); }).map(function (c) { return [c.from, c.to]; });
          return { me: me, tri: tri, ages: ages, timely: ds.timely(me, mb), wang: ds.wang(me, mb), places: relPlaces(hx, g[3], me) };
        })
      };
      A.natives.push(N);
    });

    // 4 · voids (true = not timely in the birth month)
    function vInfo(b) { return { b: b, el: BR_EL[b], true_: !ds.timely(BR_EL[b], mb) }; }
    A.voids = { day: dayV.map(vInfo), year: yearV.map(vInfo), all: natVoids };
    A.voidLines = [];
    A.natives.forEach(function (N) { NJ()[N.hx.n].lines.forEach(function (L, i) {
      if (natVoids.indexOf(L.branch) >= 0 && !ds.timely(L.el, mb)) A.voidLines.push(N.key + ' ' + N.hx.n + ' line ' + (i + 1) + ' ' + L.branch);
      if (L.fushen && natVoids.indexOf(L.fushen.branch) >= 0 && !ds.timely(L.fushen.el, mb)) A.voidLines.push(N.key + ' ' + N.hx.n + ' hidden ' + L.fushen.branch + ' under line ' + (i + 1));
    }); });

    // 4 · the three Luck
    var prof = ds.profile(R, Pn, male), natT = [xt.upper, xt.lower, R.huXT.upper, R.huXT.lower].concat(ht ? [ht.upper, ht.lower, R.huHT.upper, R.huHT.lower] : []);
    ['heaven', 'earth', 'fame'].forEach(function (k) {
      var K = prof.K[k], t = R.luck[k];
      var lines = []; A.natives.forEach(function (N) { NJ()[N.hx.n].lines.forEach(function (L, i) {
        if (brTri(L.branch) === t) lines.push(N.key + ' l' + (i + 1) + ' ' + L.branch);
        if (brTri(L.branch) === R.luck.opposite[k]) lines.push('−' + N.key + ' l' + (i + 1) + ' ' + L.branch);
      }); });
      A.luck.push({ k: k, t: t, el: TRI_EL[t], op: R.luck.opposite[k], inNat: K.inNat, opNat: K.opNat, tkCn: K.tkCn, tk: K.tk, yt: K.yt, vuoto: K.vuoto, m: K.m, lines: lines,
        branches: BR.split('').filter(function (b) { return brTri(b) === t; }) });
    });

    // 5 · life cycles
    ds.cycleRows(R).forEach(function (x) {
      var hx = x.hx, line = x.c.line, L = x.L, me = x.me, N = A.natives.filter(function (n) { return n.key === x.phase; })[0];
      var tm = ds.tempo(L.branch, T, natVoids, null);
      var isVoid = tm.note.indexOf('空 void') >= 0;
      var s = SC() && SC()[hx.n] ? SC()[hx.n].l[line] : 0, V = Math.sign(tm.t), txt = Math.max(-2, Math.min(2, s + V));
      // years of the cycle that activate (same branch, 六合) or clash the line
      var act = [], com = [], hit = [];
      for (var y = x.y1; y <= x.y2; y++) { var yb = yearBranch(y), age = y - y0 + 1;
        if (yb === L.branch) act.push(y + ' (' + age + ')'); else if (LIUHE[L.branch] === yb) com.push(y + ' (' + age + ')'); else if (clash(L.branch) === yb) hit.push(y + ' (' + age + ')'); }
      // relations present in the cycle (line, other trigram, Hu that holds the line, hidden)
      var has = { W: 0, C: 0, P: 0, G: 0, B: 0 }, srcRel = x.src.map(function (o) { return o.k; });
      has[x.r] += 2; srcRel.forEach(function (k, i) { var t = x.src[i].t; has[k] += /^hidden/.test(t) ? 0.5 : /Hu/.test(t) ? 1 : 2; });
      // Wealth score of the cycle (weights of this prototype, to be tested)
      var w = 0, why = [];
      x.src.forEach(function (o) { if (o.k !== 'W') return; var v = /^hidden/.test(o.t) ? 0.5 : /Hu/.test(o.t) ? 1 : 2; w += v; why.push(o.t.split(' = ')[0].replace(' is Wealth (rule 3.0)', '') + ' W +' + v); });
      if (!has.W && has.C && x.r !== 'G') { w += 0.5; why.push('Output that generates Wealth +0.5'); }
      if (x.r === 'G') { w -= 1.5; why.push('line Ghost −1.5'); }
      else if (has.G) { w -= 0.5; why.push('Ghost in the cycle −0.5'); }
      if (x.r === 'B' && has.W) { w -= 0.5; why.push('Brothers on the line take the Wealth −0.5'); }
      var tv = tm.t > 0 ? 0.5 : tm.t < 0 ? -0.5 : 0; if (tv) { w += tv; why.push('natal time ' + (tv > 0 ? '+' : '−') + Math.abs(tv)); }
      x.luck.forEach(function () { w += 0.5; why.push('Luck on the line +0.5'); });
      A.luck.forEach(function (Lk) { if (brTri(L.branch) === Lk.op) { w -= 0.5; why.push('opposite of the ' + cap(Lk.k) + ' Luck −0.5'); } });
      var flags = [];
      if (has.W && has.G >= 2) flags.push('Wealth and Ghost together: Wealth feeds the Ghost (財生殺), watch health and pressure');
      if (x.r === 'G' && !has.C) flags.push('Ghost on the line with no Output to control it (食神制殺 missing)');
      if (isVoid) flags.push('line in true void at birth: it works only when the same branch fills it' + (act.length ? ' (' + act.join(', ') + ')' : ''));
      var rs = { W: has.W, C: has.C, P: has.P, G: has.G, B: has.B }; rs[x.r] += tv;
      A.cycles.push({ phase: x.phase, N: N, hx: hx, c: x.c, line: line, L: L, me: me, r: x.r, src: x.src, luck: x.luck, y1: x.y1, y2: x.y2,
        tm: tm, isVoid: isVoid, s: s, V: V, txt: txt, act: act, com: com, hit: hit, has: has, score: Math.round(w * 100) / 100, rs: rs, why: why, flags: flags,
        crossTri: !N.one && (line === 3 || line === 4), isStart: line === N.movingLine && x.c.from === N.from });
    });

    synthesis(A);
    return A;
  }

  // ── Synthesis in plain words (Edu 11/11: colloquial, not technical) ──────────
  function ageStr(a) { return a[0] + '–' + a[1]; }
  var RELW = { W: 'money (Wealth)', C: 'creating and teaching (Children)', P: 'support and documents (Parent)', G: 'pressure (Ghost)', B: 'partners and rivals (Brothers)' };
  function per(c) { return 'age ' + c.c.from + '–' + c.c.to + ' (' + c.y1 + '–' + c.y2 + ')'; }
  function synthesis(A) {
    var S = A.synth, he = A.male ? 'he' : 'she', He = A.male ? 'He' : 'She', his = A.male ? 'his' : 'her';
    var who = A.natives.map(function (N, i) {
      var when = i === 0 ? 'Up to age ' + N.to : 'From age ' + N.from;
      return N.one ? when + ' ' + he + ' is ' + N.persons[0].me
        : when + ' ' + he + ' changes with the line: ' + N.persons.map(function (p) { return p.me + ' at age ' + p.ages.map(ageStr).join(', '); }).join('; ');
    });
    S.push(['Who', who.join('. ') + '.']);
    var p0 = A.natives[0].persons;
    S.push(['Strength', p0.map(function (p) { return p.me + (p.wang ? ' is at its strongest in ' + his + ' birth month' : p.timely ? ' is in good shape in ' + his + ' birth month' : ' is weak in ' + his + ' birth month'); }).join('; ') + '. '
      + (p0.some(function (p) { return !p.timely; }) ? He + ' needs support and allies first, then money: too much money too early wears ' + (A.male ? 'him' : 'her') + ' out.' : He + ' is solid and can carry money and responsibility.')]);
    var wl = [];
    A.natives.forEach(function (N) { N.persons.forEach(function (p) {
      var pl = p.places.W; wl.push((N.key === 'XT' ? 'first chart' : 'second chart') + (N.one ? '' : ' (as ' + p.me + ')') + ': ' + (pl.length ? pl.join(', ') : 'nowhere') + ' — money is ' + CTRL[p.me] + ' for ' + (A.male ? 'him' : 'her'));
    }); });
    S.push(['Where the money is', wl.join('; ') + '.']);
    var srt = A.cycles.slice().sort(function (a, b) { return b.score - a.score; });
    var top = srt.filter(function (c) { return c.has.W >= 1 && c.score > 0; }).slice(0, 3);
    S.push(['Best years for money', top.length ? top.map(function (c) { return per(c) + ', line ' + c.L.branch + ' ' + REL[c.r]; }).join('; ') + '.'
      : 'no period brings money by itself: it comes year by year, in the years ' + BR.split('').filter(function (b) { return BR_EL[b] === CTRL[p0[0].me]; }).join('') + ', or from what ' + he + ' creates.']);
    var low = srt.slice().reverse().filter(function (c) { return c.score < 0; }).slice(0, 3);
    if (low.length) S.push(['Hardest years', low.map(function (c) { return per(c) + ', line ' + c.L.branch + ' ' + REL[c.r]; }).join('; ') + '.']);
    var risk = A.cycles.filter(function (c) { return c.flags.length; }).map(function (c) { return per(c) + ': ' + c.flags.join('; '); });
    if (risk.length) S.push(['Be careful', risk.join('. ') + '.']);
    S.push(['Luck', A.luck.map(function (L) {
      return cap(L.k) + ' Luck is ' + L.t + ' (' + L.el + '): ' + (L.inNat ? 'it is in ' + his + ' charts, so the periods that touch it are blessed' : 'not in ' + his + ' charts, it comes from outside, in the years, months and days ' + L.branches.join(''))
        + (L.opNat ? '; its opposite ' + L.op + ' is in ' + his + ' charts and can spoil it' : '');
    }).join('. ') + '.']);
    var vv = A.voids.day.concat(A.voids.year).filter(function (v) { return v.true_; }).map(function (v) { return v.b; });
    S.push(['Empty branches', 'At birth ' + A.voids.day.map(function (v) { return v.b; }).join('') + ' (from the day) and ' + A.voids.year.map(function (v) { return v.b; }).join('') + ' (from the year) are empty. '
      + (vv.length ? 'Really empty, because out of season: ' + vv.join('') + '.' : 'None is really empty: they are all in season.')
      + (A.voidLines.length ? ' Lines touched: ' + A.voidLines.join(', ') + '. They wake up only when a year, month or day brings the same branch.' : '')]);
  }

  // ── HTML ─────────────────────────────────────────────────────────────────
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  var RC = { W: '#2e7d32', C: '#1565c0', P: '#6a1b9a', G: '#c62828', B: '#795548' };
  var S_ = 'font-size:12px;color:#333;line-height:1.55;';
  function hd(t) { return '<div style="font-size:13px;font-weight:700;color:#4527a0;margin:14px 0 4px;border-bottom:1px solid #d1c4e9;">' + t + '</div>'; }
  function p(t) { return '<div style="' + S_ + 'margin:3px 0;">' + t + '</div>'; }
  function relTag(r) { return '<b style="color:' + RC[r] + ';">' + r + '</b>'; }
  function relFull(r) { return '<b style="color:' + RC[r] + ';">' + REL[r] + '</b>'; }
  function hexName(n) { var u = H().ui; return (u && u.hexName && u.hexName(n)) || ''; }
  function draw(hx, ln, cy, me) { var u = H().ui; return u && u.cycleHexSvg ? u.cycleHexSvg(hx, ln, cy, me) : ''; }
  function card(title, svg) { return '<div style="border:1px solid #d1c4e9;border-radius:8px;padding:6px;flex:1 1 220px;min-width:0;max-width:340px;"><div style="font-size:12px;font-weight:600;color:#4527a0;text-align:center;">' + title + '</div>' + svg + '</div>'; }
  function lineTxt(n, l, withReading) {
    var t = TX() && TX()[n], L = t && t.lines && t.lines[l]; if (!L) return '';
    return '<div style="' + S_ + 'margin:3px 0;"><i>“' + esc(L.statement) + '”</i></div>' + (withReading && L.reading ? '<div style="' + S_ + 'color:#555;">' + esc(L.reading) + '</div>' : '');
  }
  var TIMEW = { '-2': 'read the text on its dark side', '-1': 'read the text more on its difficult side', '0': 'the text can go either way', '1': 'read the text more on its bright side', '2': 'read the text on its bright side' };
  var WHO_ = { Y: 'year', M: 'month', D: 'day' };
  // time notes in plain words
  function plain(notes, ref, T) {
    ref = ref || 'birth'; var TB = T ? { Y: T.y, M: T.m, D: T.d } : {};
    return notes.map(function (n) {
      var m;
      if (n === 'timely') return 'in season';
      if ((m = n.match(/^same (\w)/))) return 'same branch as the ' + ref + ' ' + WHO_[m[1]] + ' (reinforced)';
      if ((m = n.match(/^六合 (\w)/))) return 'bonds with the ' + ref + ' ' + WHO_[m[1]];
      if ((m = n.match(/^三合 (\w)/))) return 'gets on well with the ' + ref + ' ' + WHO_[m[1]];
      if ((m = n.match(/^冲 (\w) \(excites\)/))) return 'clashed by the ' + ref + ' ' + WHO_[m[1]] + ', but too strong to break: it gets fired up';
      if ((m = n.match(/^冲 (\w)/))) return 'clashed by the ' + ref + ' ' + WHO_[m[1]];
      if ((m = n.match(/^剋 (\w) by the purpose/))) return 'kept in check by the ' + ref + ' ' + WHO_[m[1]] + ' (no harm for this purpose)';
      if ((m = n.match(/^剋 (\w)/))) return 'kept in check by the ' + (TB[m[1]] ? BR_EL[TB[m[1]]] + ' of the ' : '') + ref + ' ' + WHO_[m[1]] + (TB[m[1]] ? ' (' + TB[m[1]] + ')' : '');
      if (n === '空 void') return 'empty (void)';
      if (n === 'void filled by the day') return 'empty, but filled by the day';
      if ((m = n.match(/^三會 (\w+)/))) return 'joins a full ' + m[1] + ' season group: very strong';
      return n;
    }).join(', ');
  }
  function flagPlain(f) {
    if (/財生殺/.test(f)) return 'money and pressure come together: money can bring stress and health problems';
    if (/食神制殺/.test(f)) return 'pressure with nothing to hold it back';
    if (/void/.test(f)) { var m = f.match(/\((.*)\)$/); return 'this line is empty at birth: it works only in the years with its own branch' + (m ? ' (' + m[1] + ')' : ''); }
    return f;
  }
  // what surrounds the line of a cycle, in plain words
  function around(c) {
    var t = [], hx = c.hx, me = c.me, hu = c.N.hu;
    if (!c.N.one) { var o = c.line <= 3 ? hx.upper : hx.lower, r = rel(me, TRI_EL[o]); t.push((c.line <= 3 ? 'above it ' : 'below it ') + o + ' = ' + REL[r]); }
    if (c.line >= 2 && c.line <= 4) t.push('inner trigram ' + hu.lower + ' = ' + REL[rel(me, TRI_EL[hu.lower])]);
    if (c.line >= 3 && c.line <= 5) t.push('inner trigram ' + hu.upper + ' = ' + REL[rel(me, TRI_EL[hu.upper])]);
    if (c.L.fushen) t.push('hidden ' + c.L.fushen.branch + ' = ' + REL[rel(me, c.L.fushen.el)]);
    return t;
  }

  // Life theme of a relation, for the starting line (Edu 11/11: Gates XT l6 戌 Parent = a life of study)
  var THEME = { P: 'learning, books, support and documents', C: 'creating, teaching and giving', W: 'earning and owning', G: 'pressure, duty and authority', B: 'partners, friends and competition' };
  // Which side of the line text to read (Edu 11/11): the time decides. A warning text on a line that is strong at
  // birth (e.g. same branch as the birth month) shows its good side; a positive text on a weak line shows its shadow.
  function side(s, t) {
    var tone = s < 0 ? 'The text is a warning' : s > 0 ? 'The text is positive' : 'The text is neutral';
    if (t > 0) return tone + (s < 0 ? ', but the line is strong, so its good side comes out.' : ' and the line is strong: read it at its best.');
    if (t < 0) return tone + (s > 0 ? ', but the line is weak, so its promise is only half kept.' : ' and the line is weak: its difficult side comes out.');
    return tone + ' and the time neither helps nor hurts: read it as it is.';
  }
  // Life stage of a period (Edu 11/11: adapt the reading to the age) and how each relation plays out in it
  function stage(c) { var m = (c.c.from + c.c.to) / 2; return m <= 12 ? 'child' : m <= 30 ? 'young' : m <= 60 ? 'adult' : 'old'; }
  var STAGE_NAME = { child: 'childhood', young: 'youth', adult: 'adult life', old: 'later life' };
  var STAGE_REL = {
    P: { child: 'family, school and books: it shapes how {he} learns', young: 'studies, teachers, diplomas and the first important papers', adult: 'contracts, documents, property and the people who back {him}', old: 'home, care and passing on what {he} knows' },
    C: { child: 'play, curiosity and creativity', young: 'first creations, projects and the wish to express {himself}', adult: 'products, ideas, teaching and what {he} gives to others', old: 'children, students and what {he} leaves behind' },
    W: { child: 'what the family has and how {he} learns the value of things', young: 'first earnings and first partner', adult: 'money, business and the partner', old: 'savings, inheritance and comfort' },
    G: { child: 'strict rules, discipline and health', young: 'exams, bosses, pressure and duties', adult: 'authority, rivals, legal matters and stress, but also rank and power', old: 'health and the weight of responsibilities' },
    B: { child: 'brothers, sisters and friends', young: 'friends, classmates and first partners in projects', adult: 'partners, associates and competitors', old: 'old friends and sharing what {he} has' }
  };
  function pron(t, male) {
    var m = male ? { he: 'he', He: 'He', his: 'his', His: 'His', him: 'him', himself: 'himself' } : { he: 'she', He: 'She', his: 'her', His: 'Her', him: 'her', himself: 'herself' };
    return t.replace(/\{(\w+)\}/g, function (x, k) { return m[k] || x; });
  }
  function meaning(A, c) {
    var RD = root.XKDG_HELUO_READINGS, r = RD && RD[c.hx.n] && RD[c.hx.n][c.line], st = stage(c), out = '';
    if (r) {
      var good = c.tm.t > 0 || DS().timely(c.L.el, A.T.m), t = pron(good ? r.strong : r.weak, A.male);
      out += esc(t) + ' ';
    }
    out += 'At this age it shows in ' + esc(pron(STAGE_REL[c.r][st], A.male)) + '.';
    return p(out);
  }

  // Plain verdict (Edu 11/11: "his creativity, though vital, is taking its first steps"): the subject is the relation,
  // the state comes from season (vitality) and from what the birth branches do to the line.
  var SUBJ = { P: '{his} studies and the support around {him} (Parent)', C: '{his} creativity (Children)', W: '{his} money (Wealth)', G: 'pressure and authority in {his} life (Ghost)', B: '{his} friends and partners (Brothers)' };
  function state(A, c) {
    var alive = DS().timely(c.L.el, A.T.m), t = c.tm.t, early = stage(c) === 'child' || stage(c) === 'young';
    if (c.isVoid) return 'is there, but empty: it wakes up only in some years';
    if (alive && t > 0) return 'is strong and shows clearly';
    if (alive) return early ? 'is full of life but is only taking its first steps' : 'is full of life but grows slowly, held in by others';
    if (t > 0) return 'is not strong alone, but gets help from around ' + (A.male ? 'him' : 'her');
    return 'struggles and needs care';
  }
  function period(A, c) {
    var N = c.N, sub = pron(SUBJ[c.r], A.male);
    var tech = 'Line ' + c.L.branch + ' ' + c.L.el + ', person ' + c.me + '. At birth: ' + (plain(c.tm.note, 'birth', A.T) || 'no link with the birth branches') + '.'
      + (around(c).length ? ' Around it: ' + around(c).join(', ') + '.' : '') + (c.luck.length ? ' Carries the ' + c.luck.map(function (x) { return x.slice(1); }).join(' and ') + ' Luck.' : '')
      + (c.act.length ? ' Switched on in ' + c.act.join(', ') + '.' : '') + (c.com.length ? ' Helped in ' + c.com.join(', ') + '.' : '') + (c.hit.length ? ' Hit in ' + c.hit.join(', ') + '.' : '');
    return '<div style="border-left:4px solid ' + RC[c.r] + ';padding:4px 8px;background:#fcfbff;border-radius:4px;">'
      + '<div style="font-size:13px;font-weight:600;">Age ' + c.c.from + '–' + c.c.to + ' <span style="color:#888;font-weight:400;">(' + c.y1 + '–' + c.y2 + ', ' + (c.c.to - c.c.from + 1) + ' years)</span> · line ' + c.line + ' ' + c.L.branch + ' ' + relFull(c.r) + '</div>'
      + draw(c.hx, c.line, N.cycles, c.me)
      + (c.isStart ? p('<span style="color:#e65100;">★</span> This line colors the whole chart (age ' + N.from + '–' + N.to + '), and these first years shape ' + (A.male ? 'him' : 'her') + ' deeply.') : '')
      + p('<b>' + esc(sub.charAt(0).toUpperCase() + sub.slice(1)) + ' ' + (c.r === 'C' || c.r === 'W' ? state(A, c) : state(A, c).replace(/^is /, 'are ').replace(/ shows /, ' show ').replace(/ gets /, ' get ').replace(/ grows /, ' grow ').replace(/^struggles/, 'struggle').replace(/ needs /, ' need ')) + '.</b>')
      + lineTxt(c.hx.n, c.line, false)
      + meaning(A, c)
      + (c.flags.length ? p('<span style="color:#c62828;">⚠ ' + esc(c.flags.map(flagPlain).join('; ')) + '</span>') : '')
      + '<details style="margin-top:3px;"><summary style="font-size:11px;color:#999;cursor:pointer;">details</summary><div style="font-size:11px;color:#777;line-height:1.5;">' + esc(tech) + '</div></details>'
      + '</div>';
  }

  function html(A, nowBox) {
    var R = A.R, P = A.Pn, h = '', his = A.male ? 'his' : 'her';
    h += hd('1 · Who this person is');
    var col = function (lbl, x) { return '<div style="text-align:center;min-width:46px;"><div style="font-size:10px;color:#777;">' + lbl + '</div><div style="font-size:19px;line-height:1.2;">' + x[0] + '<br>' + x[1] + '</div></div>'; };
    h += '<div style="display:flex;gap:6px;margin:4px 0 6px;">' + col('Hour', P.hour) + col('Day', P.day) + col('Month', P.month) + col('Year', P.year) + '</div>';
    h += p((A.male ? 'Man' : 'Woman') + ', born ' + R.input.o.year + '. Heaven number ' + R.numbers.heaven + ' (' + R.heavenTrigram + '), Earth number ' + R.numbers.earth + ' (' + R.earthTrigram + ').');
    A.synth.slice(0, 2).forEach(function (s) { h += p(esc(s[1])); });

    // 2 and 3 · one chart at a time (Edu 11/11): first chart complete, then the second
    A.natives.forEach(function (N, ni) {
      var lo = TRI_EL[N.hx.lower], up = TRI_EL[N.hx.upper], cs = A.cycles.filter(function (c) { return c.phase === N.key; });
      var f = lo === up ? 'a single element (' + lo + '): one clear direction' : GEN[lo] === up ? 'the bottom feeds the top: energy flows well' : GEN[up] === lo ? 'the top feeds the bottom: energy goes inward' : 'the two halves fight each other';
      var trig = N.one ? 'The whole chart is ' + up + ', like ' + his + ' element: ' + REL[rel(N.persons[0].me, up)] + '. Inner trigrams ' + N.hu.upper + ' and ' + N.hu.lower + ' = ' + REL[rel(N.persons[0].me, TRI_EL[N.hu.upper])] + (N.hu.upper !== N.hu.lower ? ' and ' + REL[rel(N.persons[0].me, TRI_EL[N.hu.lower])] : '') + '.'
        : 'Two elements: ' + (A.male ? 'he' : 'she') + ' is the half where the line stands, and the other half is what ' + (A.male ? 'he' : 'she') + ' has above or below.';
      h += hd((ni + 2) + ' · ' + (N.key === 'XT' ? 'First chart (Xian Tian) ' : 'Second chart (Hou Tian) ') + N.hx.n + ' ' + esc(hexName(N.hx.n)) + ' · age ' + N.from + '–' + N.to);
      h += '<div style="display:flex;justify-content:center;">' + card(N.hx.n + ' ' + esc(hexName(N.hx.n)) + ' · ' + (A.y0 + N.from - 1) + '–' + (A.y0 + N.to - 1), draw(N.hx, N.movingLine, N.cycles, null)) + '</div>';
      h += p(N.hx.upper + ' over ' + N.hx.lower + ', ' + f + '. It starts from line ' + N.movingLine + ', ' + (N.position ? 'in its right place' : 'not in its right place') + (N.support ? ' and backed by its partner line.' : ', with no backing from its partner line.') + ' ' + trig);
      h += '<div style="font-size:11px;color:#666;margin:6px 0 2px;">The lines of ' + his + ' life, youngest age on top. Tap a line to read that period.</div><table style="border-collapse:collapse;font-size:12px;width:100%;">';
      cs.forEach(function (c) {
        var ar = around(c);
        h += '<tr onclick="var r=this.nextElementSibling;r.style.display=r.style.display===\'none\'?\'\':\'none\'" style="cursor:pointer;border-top:1px solid #eee;' + (c.isStart ? 'background:#fff8e1;' : '') + '">'
          + '<td style="padding:4px 5px;white-space:nowrap;vertical-align:top;font-size:13px;">Line ' + c.line + ' <b>' + c.L.branch + '</b><br>' + relFull(c.r) + '</td>'
          + '<td style="padding:4px 5px;vertical-align:top;"><b>' + (c.c.to - c.c.from + 1) + ' years</b> · age ' + c.c.from + '–' + c.c.to + ' · ' + c.y1 + '–' + c.y2 + ' <span style="color:#4527a0;">▾</span>'
          + (c.isStart ? '<br><span style="color:#e65100;">★ starting line: it colors the whole chart</span>' : '')
          + (N.one ? '' : '<br><span style="color:#555;">' + his + ' element here: ' + c.me + '</span>')
          + (ar.length ? '<div style="font-size:11px;color:#666;">' + esc(ar.join(' · ')) + '</div>' : '') + '</td></tr>'
          + '<tr style="display:none;"><td colspan="2" style="padding:2px 4px 10px;">' + period(A, c) + '</td></tr>';
      });
      h += '</table>';
    });
    h += '<div style="font-size:11px;color:#777;margin-top:4px;">Wealth = money · Children = creating, teaching, giving · Parent = support, study, documents, home · Ghost = pressure, illness, but also authority · Brothers = partners and rivals.</div>';

    var sec = A.natives.length + 2;
    h += hd(sec++ + ' · Luck and empty branches');
    A.synth.filter(function (s) { return s[0] === 'Luck' || s[0] === 'Empty branches'; }).forEach(function (s) { h += p('<b>' + s[0] + ':</b> ' + esc(s[1])); });

    h += hd(sec++ + ' · In short');
    A.synth.filter(function (s) { return ['Where the money is', 'Best years for money', 'Hardest years', 'Be careful'].indexOf(s[0]) >= 0; }).forEach(function (s) {
      h += p('<b>' + s[0] + ':</b> ' + esc(s[0] === 'Be careful' ? s[1].replace(/: ([^.]*)/g, function (m, x) { return ': ' + x.split('; ').map(flagPlain).join('; '); }) : s[1])); });
    // one chart per relation (Edu 11/11)
    h += hd(sec++ + ' · The five relations, period by period');
    h += '<div style="font-size:11px;color:#666;margin-bottom:4px;">How strong each relation is in each period: on the line +2, in the other half of the chart +2, in an inner trigram +1, hidden +0.5, birth time on the line ±0.5. Test weights.</div>';
    REL_ORDER.forEach(function (k) { h += curve(A, k); });
    if (nowBox) h += nowBox.replace(/>\d+ · Now/, '>' + sec + ' · Now');
    return h;
  }
  // bar chart of one relation across the periods (SVG); the line between the two charts is marked
  function curve(A, k) {
    var C = A.cycles, n = C.length; if (!n) return '';
    var v = C.map(function (c) { return c.rs[k]; }), W = 340, bw = (W - 30) / n, H0 = 46, NEG = 10, mx = Math.max(3, Math.max.apply(null, v));
    var s = '<div style="font-size:12px;font-weight:600;color:' + RC[k] + ';margin:8px 0 0;">' + REL[k] + ' <span style="font-weight:400;color:#888;">· ' + MEANING[k] + '</span></div>'
      + '<svg width="100%" viewBox="0 0 ' + W + ' ' + (H0 + NEG + 26) + '" style="max-width:520px;display:block;"><line x1="25" x2="' + W + '" y1="' + H0 + '" y2="' + H0 + '" stroke="#bbb"/>';
    C.forEach(function (c, i) {
      var x = 28 + i * bw, val = v[i], hgt = Math.abs(val) / mx * (H0 - 6), y = val >= 0 ? H0 - hgt : H0;
      if (i && C[i - 1].phase !== c.phase) s += '<line x1="' + (x - 1.5) + '" x2="' + (x - 1.5) + '" y1="2" y2="' + (H0 + NEG) + '" stroke="#b39ddb" stroke-dasharray="3,2"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="' + (bw - 3) + '" height="' + Math.max(val ? 1 : 0, hgt) + '" fill="' + (val >= 0 ? RC[k] : '#bdbdbd') + '" rx="2" opacity="0.85"/>'
        + '<text x="' + (x + bw / 2 - 1.5) + '" y="' + (H0 + NEG + 10) + '" font-size="8.5" text-anchor="middle" fill="#555" font-family="system-ui">' + c.c.from + '</text>'
        + '<text x="' + (x + bw / 2 - 1.5) + '" y="' + (H0 + NEG + 21) + '" font-size="8.5" text-anchor="middle" fill="' + RC[c.r] + '" font-family="system-ui" font-weight="700">' + c.L.branch + c.r + '</text>';
    });
    return s + '<text x="0" y="' + (H0 + NEG + 10) + '" font-size="8.5" fill="#888" font-family="system-ui">age</text></svg>';
  }

  // ── Now: annual, monthly, today (block + day, primary and secondary text) ─────────
  // Pe = pillars of today at true-solar noon of the place (lon); same cascade as the Date Selection.
  function nowHtml(A, Pe, lon) {
    var ds = DS(), pr = ds.predict(A.R, Pe, lon); if (pr.none) return '';
    var me = ds.persona(pr.hx, pr.per.line), T = { y: Pe.year[1], m: Pe.month[1], d: Pe.day[1] };
    function lv(n, l) { var L = NJ()[n].lines[l - 1], sh = ds.sanhui(L.branch, T), tm = ds.tempo(L.branch, T, A.voids.all, null), s = SC()[n].l[l], txt = 0;
      return { L: L, r: rel(me, sh || L.el), tm: tm, txt: txt }; }
    function row(title, n, l, withR) { var x = lv(n, l);
      return '<div style="margin:6px 0;">' + p('<b>' + title + '</b>: ' + n + ' ' + esc(hexName(n)) + ' line ' + l + ' ' + x.L.branch + ' = ' + relFull(x.r) + ' · ' + esc(plain(x.tm.note, 'current', T) || 'not touched by the time') + '. ' + side(SC()[n].l[l], x.tm.t)) + lineTxt(n, l, withR) + '</div>'; }
    var a = pr.annual, mo = pr.month, d = pr.daily, age = pr.age;
    var h = hd('6 · Now · age ' + age)
      + p('Year ' + Pe.year + ', month ' + Pe.month + ', day ' + Pe.day + '. ' + (A.male ? 'He' : 'She') + ' is ' + me + ', in the period of line ' + pr.per.line + ' (age ' + pr.per.from + '–' + pr.per.to + ').')
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      + card('Annual ' + a.hex.n + ' · moved line ' + a.moved, draw(a.hex, a.moved, null, me))
      + card('Monthly ' + mo.hex.n + ' · month ' + mo.index + ' · line ' + mo.line + ' of the annual', draw(mo.hex, mo.line, null, me))
      + card('Block ' + d.block.n + ' · Lord l' + d.lord + ' · day line ' + d.line, draw(d.block, d.line, null, me))
      + card('Day ' + d.hex.n + ' · line ' + d.line, draw(d.hex, d.line, null, me)) + '</div>'
      + row('This year', a.hex.n, a.moved, false)
      + row('This month', mo.hex.n, mo.line, false)
      + row('Today, what happens (primary)', d.block.n, d.line, false)
      + row('Today, how it ends (secondary)', d.hex.n, d.line, false)
      + '<div style="font-size:10px;color:#999;">Months: 12 whole months from the 中氣, month 1 from the Winter Solstice; line k of the annual rules months 2k−1 and 2k (odd = line k changed, even = also its correlate). Day: 5-day blocks from the day of the 中氣 (Lord of the Block). True solar time.</div>';
    return h;
  }

  var API = { analyze: analyze, html: html, nowHtml: nowHtml };
  root.XKDGHeluoNatal = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

/**
 * qmdj-life-reading.js — QMDJ LIFE READING (session 59, Edu)
 * ---------------------------------------------------------------------------
 * The written reading of the QMDJ Life chart, composed inside the app from the data of
 * the chart: no AI call (same method as heluo-readings.js). Tone approved by Edu on
 * 22/11/2026 on three trial readings (Marilyn Monroe, Bill Gates, Princess Diana).
 *
 * Source: Edu's course "QMDJ Life Reading" — 01 Basic Concepts, 02 Guidelines,
 * 03a Charts Discussions, 04 Timing, 06 Areas of Life.
 *
 * Rules fixed by Edu (22/11/2026):
 *  - Host / Guest = Tian Pan stem against Di Pan stem. The Qi flow in the palace is a
 *    separate thing and never decides host or guest.
 *  - A corner palace is void when its Di Pan stem and the void branch have the same
 *    polarity (yin stem + yin branch, yang stem + yang branch).
 *  - In a Life Reading the void has a minor function: it is noted, nothing more.
 *  - Names of doors, stars and spirits stay in English as on the chart; stems and
 *    branches in characters.
 *
 * XKDGLifeReading.build({ chart, pillars, palace, male, birthYear }) ->
 *   { natal:[{t,x}], areas:[{t,x}], phases:[{t,x}], cycles:[...], year(y) -> {gz,lines} }
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.XKDGLifeReading = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STEMS = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥';
  var TRI = { 1: 'Kan', 2: 'Kun', 3: 'Zhen', 4: 'Xun', 6: 'Qian', 7: 'Dui', 8: 'Gen', 9: 'Li' };
  var PEL = { 1: 'water', 2: 'earth', 3: 'wood', 4: 'wood', 6: 'metal', 7: 'metal', 8: 'earth', 9: 'fire' };
  var PBR = { 1: '子', 8: '丑寅', 3: '卯', 4: '辰巳', 9: '午', 2: '未申', 7: '酉', 6: '戌亥' };
  var OPP = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };
  var ALL = [1, 8, 3, 4, 9, 2, 7, 6];
  var STEM_EL = { '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water' };
  var STAR_EL = { Grass: 'water', Rice: 'earth', Aggressor: 'wood', Assistant: 'wood', Fowl: 'earth', Heart: 'metal', Pillar: 'metal', Official: 'earth', Hero: 'fire' };
  var DOOR_EL = { Open: 'metal', Rest: 'water', Birth: 'earth', Injury: 'wood', Delusion: 'wood', View: 'fire', Death: 'earth', Shocking: 'metal' };
  // 06 Areas of Life, Spiritual Development 2: how the spirits appear in the five elements.
  var SPIRIT_EL = { Commander: 'fire', Snake: 'fire', Yin: 'metal', Harmonies: 'wood', Tiger: 'metal', Warrior: 'water', Earth: 'earth', Heaven: 'metal' };
  var GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
  var KE = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
  var ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
  var REL = { P: 'Parents', O: 'Offspring', B: 'Brothers', W: 'Wealth', G: 'Officer/Ghost', S: 'Life Palace' };
  var STAGE = ['', 'Birth', 'Babyhood', 'Schooling', 'Graduation', 'Prime', 'Retiring', 'Sick', 'Dead', 'Tomb', 'Vanishing', 'Embryo', 'Development'];
  var BIRTH_AT = { wood: 11, fire: 2, metal: 5, water: 8 };                 // 亥 寅 巳 申
  // 02 Guidelines, Life Palace in Gen or Kun.
  var EARTH_ST = { '子': 'Retired', '丑': 'Strong', '寅': 'Retired', '卯': 'Jailed', '辰': 'Strong', '巳': 'Prosper', '午': 'Sword', '未': 'Strong', '申': 'Retired', '酉': 'Jailed', '戌': 'Strong', '亥': 'Retired' };
  var JIA_LEAD = ['戊', '己', '庚', '辛', '壬', '癸'];                        // 甲子 甲戌 甲申 甲午 甲辰 甲寅
  var JIA_BR = { '戊': '子', '己': '戌', '庚': '申', '辛': '午', '壬': '辰', '癸': '寅' };
  var COMBO = { '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊' };
  var SCLASH = { '甲': '庚', '庚': '甲', '乙': '辛', '辛': '乙', '丙': '壬', '壬': '丙', '丁': '癸', '癸': '丁' };
  var LIUHE = { '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午' };
  var HARM = { '子': '未', '未': '子', '丑': '午', '午': '丑', '寅': '巳', '巳': '寅', '卯': '辰', '辰': '卯', '申': '亥', '亥': '申', '酉': '戌', '戌': '酉' };
  var PENAL = { '子': '卯', '卯': '子', '寅': '巳', '巳': '申', '申': '寅', '丑': '未', '未': '戌', '戌': '丑', '辰': '辰', '午': '午', '酉': '酉', '亥': '亥' };
  // 06 Areas of Life, Love and Relationship 2.
  var SPOUSE_M = { '甲': '己', '乙': '戊', '丙': '辛', '丁': '庚', '戊': '癸', '己': '壬', '庚': '乙', '辛': '甲', '壬': '丁', '癸': '丙' };
  var SPOUSE_F = { '甲': '辛', '乙': '庚', '丙': '癸', '丁': '壬', '戊': '乙', '己': '甲', '庚': '丁', '辛': '丙', '壬': '己', '癸': '戊' };

  function bclash(b) { return BR.charAt((BR.indexOf(b) + 6) % 12); }
  function rel(lp, o) { return lp === o ? 'B' : GEN[o] === lp ? 'P' : GEN[lp] === o ? 'O' : KE[lp] === o ? 'W' : 'G'; }
  function list(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function jz(i) { i = ((i % 60) + 60) % 60; return STEMS.charAt(i % 10) + BR.charAt(i % 12); }
  function jzIdx(gz) { var s = STEMS.indexOf(gz.charAt(0)), b = BR.indexOf(gz.charAt(1)); return ((6 * s - 5 * b) % 60 + 60) % 60; }
  function pron(t, male) {
    var m = male ? { he: 'he', He: 'He', his: 'his', His: 'His', him: 'him', himself: 'himself' }
                 : { he: 'she', He: 'She', his: 'her', His: 'Her', him: 'her', himself: 'herself' };
    return t.replace(/\{(\w+)\}/g, function (x, k) { return m[k] || x; });
  }

  // 12 stages of a palace element in a branch (02 Guidelines, Life Palace 9).
  function stageOf(el, branch) {
    if (el === 'earth') {
      var n = EARTH_ST[branch];
      return { name: n, strong: n === 'Strong' || n === 'Prosper' || n === 'Sword', very: n === 'Strong' || n === 'Prosper' || n === 'Sword' };
    }
    var s = ((BR.indexOf(branch) - BIRTH_AT[el]) % 12 + 12) % 12 + 1;
    return { n: s, name: STAGE[s], strong: s <= 6, very: s === 4 || s === 5 };
  }

  // The stem of a pillar as it shows in the chart: a 甲 pillar is under the stem of its decade.
  function chartStem(gz) { return gz.charAt(0) === '甲' ? JIA_LEAD[Math.floor(jzIdx(gz) / 10)] : gz.charAt(0); }

  // ===========================================================================
  function build(inp) {
    var C = inp.chart, PS = inp.pillars, LP = inp.palace, male = !!inp.male;
    var P = C.palaces, lp = P[LP], lpEl = PEL[LP];
    var out = { natal: [], areas: [], phases: [], cycles: [] };
    var T = function (t) { return pron(t, male); };

    function tian(p) { return [P[p].tiH, P[p].ti2H].filter(Boolean); }
    function di(p) { return [P[p].diH, P[p].di2H].filter(Boolean); }
    function tianOf(st) { return ALL.filter(function (p) { return tian(p).indexOf(st) >= 0; }); }
    function diOf(st) { return ALL.filter(function (p) { return di(p).indexOf(st) >= 0; }); }
    function anyOf(st) { return ALL.filter(function (p) { return tian(p).indexOf(st) >= 0 || di(p).indexOf(st) >= 0; }); }
    function palOfBranch(b) { for (var i = 0; i < ALL.length; i++) if (PBR[ALL[i]].indexOf(b) >= 0) return ALL[i]; return 0; }
    function find(key, val) { for (var i = 0; i < ALL.length; i++) if (P[ALL[i]][key] === val || (key === 'star' && P[ALL[i]].star2 === val)) return ALL[i]; return 0; }
    function door(p) { return P[p].doorName || ''; }
    function R(p) { return p === LP ? 'S' : rel(lpEl, PEL[p]); }
    function relName(p) { return REL[R(p)]; }
    function where(p) { return p === LP ? 'the Life Palace' : TRI[p] + ' (' + relName(p) + ')'; }
    function byRel(r) { return ALL.filter(function (p) { return p !== LP && R(p) === r; }); }
    function holdsAll(p) { return list([P[p].star + (P[p].star2 ? ' with ' + P[p].star2 : ''), door(p), P[p].deity].filter(Boolean)); }
    function holds(p) { return list([P[p].star, door(p)].filter(Boolean)); }
    var SBIRTH = { '甲': 11, '丙': 2, '戊': 2, '庚': 5, '壬': 8, '乙': 6, '丁': 9, '己': 9, '辛': 0, '癸': 3 };
    // 12 stages of a stem in a palace (yang forward, yin backward); a corner palace takes its better branch.
    function stemStage(st, p) {
      var best = 13, yang = STEMS.indexOf(st) % 2 === 0;
      PBR[p].split('').forEach(function (b) { var d = BR.indexOf(b) - SBIRTH[st]; var n = (((yang ? d : -d) % 12) + 12) % 12 + 1; if (n < best) best = n; });
      return best;
    }

    // ---- voids (Edu 22/11/2026) --------------------------------------------
    var dI = jzIdx(PS.day), b0 = ((BR.indexOf(PS.day.charAt(1)) - STEMS.indexOf(PS.day.charAt(0))) % 12 + 12) % 12;
    var voidBr = [BR.charAt((b0 + 10) % 12), BR.charAt((b0 + 11) % 12)], voidPal = {};
    voidBr.forEach(function (b) {
      var p = palOfBranch(b);
      if (PBR[p].length === 1) { voidPal[p] = b; return; }
      var st = P[p].diH;
      if (st && STEMS.indexOf(st) % 2 === BR.indexOf(b) % 2) voidPal[p] = b;
    });

    // ---- strength -----------------------------------------------------------
    var mb = PS.month.charAt(1), mq = palOfBranch(mb);
    var stg = stageOf(lpEl, mb), atMajor = mq === LP;
    var strong = atMajor || stg.strong, very = atMajor || stg.very;
    var parents = byRel('P'), offs = byRel('O'), bros = byRel('B'), wealth = byRel('W'), ghosts = byRel('G');
    var zf = 0, zs = 0; ALL.forEach(function (p) { if (P[p].zhiFu) zf = p; if (P[p].zhiShi) zs = p; });
    var dayStem = PS.day.charAt(0);
    var inner = (C.dun === 'yang') ? { 1: 1, 8: 1, 3: 1, 4: 1 } : { 9: 1, 2: 1, 7: 1, 6: 1 };

    // ================= 1. STRENGTH ==========================================
    (function () {
      var x = atMajor
        ? 'The Life Palace holds the month branch ' + mb + ': it is the Major Qi itself and very timely.'
        : cap(lpEl) + ' is ' + (lpEl === 'earth' ? stg.name : 'at ' + stg.name) + ' in a ' + mb + ' month: the Life Palace is ' + (very ? 'very timely' : strong ? 'timely' : 'weak') + '.';
      if (voidPal[LP]) x += ' (It is also void: ' + voidPal[LP] + '.)';
      if (strong) x += ' {He} has energy to spend and should look for productive work (Offspring, Wealth, Officer/Ghost) more than for support.';
      else x += ' {He} does not stand on {his} own strength: {he} needs support, and the quality of that support decides much of {his} life.'
        + (parents.length ? ' It comes from ' + list(parents.map(function (p) { return TRI[p]; })) + '.' : '');
      out.natal.push({ t: 'Strength', x: T(x) });
    })();

    // ================= 2. THE PERSON ========================================
    var DOOR_LP = {
      Open: 'Open: open-minded and career oriented, {he} likes to act in the open.',
      Rest: 'Rest: easy-going, {he} looks for pleasure, affection and a good life.',
      Birth: 'Birth: productive and practical, {he} makes things grow.',
      Injury: 'Injury: impulsive, physical and competitive, drawn to action.',
      Delusion: 'Delusion: {he} works on what others do not see yet, and keeps {his} plans to {himself}.',
      View: 'View: {he} likes to be seen: display, performance, things shown in public.',
      Death: 'Death: serious and persistent, at ease with what is fixed: rules, land, judgement.',
      Shocking: 'Shocking: a talker. Speech, voice and debate are {his} tools, and talk follows {him}.'
    };
    var STAR_LP = {
      Grass: 'Grass: intelligent and ambitious.', Rice: 'Rice: a practical mind, close to the body and to material things.',
      Aggressor: 'Aggressor: direct and driven, quick to act.', Assistant: 'Assistant: a cultured mind, made for study, art and writing.',
      Fowl: 'Fowl: a central, balanced mind, able to hold a high position.', Heart: 'Heart: analytical, good at planning and at healing arts.',
      Pillar: 'Pillar: straightforward and critical, a mind for speech and argument.', Official: 'Official: steady and patient, a builder of long works.',
      Hero: 'Hero: a bright mind that wants to shine.'
    };
    var SPIRIT_LP = {
      Commander: 'Commander: natural authority.', Snake: 'Snake: subtle and changeable, with a twisting imagination.',
      Yin: 'Yin: discreet, {he} likes to work in the shade.', Harmonies: 'Harmonies: sociable and graceful, good at agreements.',
      Tiger: 'Tiger: forceful, with a strong emotional impact.', Warrior: 'Warrior: clever and secretive.',
      Earth: 'Earth: down to earth, at ease with ordinary people.', Heaven: 'Heaven: {he} aims high, drawn to what is big and far.'
    };
    // 02 Guidelines, Stems Settings (Tian + Di), softened where the old text is harsh.
    var STEM_SET = {
      '戊丙': 'Cerulean Dragon turns its head: {he} comes first in what {he} studies.', '丙戊': 'Flying Bird falling into the cavern: riches and fame.',
      '辛乙': 'White Tiger ferocious: an untamed, rough side.', '乙辛': 'Cerulean Dragon flees: {he} tends to avoid confrontation, and the partner can cost {him} dearly.',
      '丁癸': 'Crimson Bird drowns in the river: a career among papers and documents.', '癸丁': 'Dancing Snake twining: a tormented, tangled way of thinking.',
      '庚丙': 'Venus entering Mars: poor early, rich later.', '丙庚': 'Mars entering Venus: the family fortune goes down.',
      '庚戊': 'life like a roller coaster.', '戊庚': 'life like a roller coaster.', '庚庚': 'conflict between brothers or equals.',
      '庚乙': 'the health of the partner is a worry.', '乙庚': 'worries about scandal.', '庚癸': 'a wandering life, far from home.', '庚壬': 'a period of poverty that passes.'
    };
    // 02 Guidelines, Star and Door Setting: [with qi, without qi].
    var STAR_DOOR = {
      'Aggressor+Injury': ['the setting of a military or commanding officer', 'the setting of a messenger: much running for others'],
      'Assistant+Delusion': ['the setting of a writer or artist', 'the setting of a hermit: talent lived apart'],
      'Hero+View': ['the setting of a celebrity', 'the setting of hard work near the fire, far from the stage'],
      'Rice+Death': ['the setting of a governor', 'a setting of solitude and scarce means'],
      'Pillar+Shocking': ['the setting of a professor', 'the setting of a storyteller, living by the word'],
      'Heart+Open': ['the setting of someone who does well in medicine or metaphysics', 'the setting of an ordinary, hard-working life'],
      'Grass+Rest': ['the setting of an officer of law and order', 'a setting on the edge of the rules'],
      'Official+Birth': ['the setting of a wealthy land developer', 'the setting of hard manual work']
    };
    var HALL = { '乙3': 'Sun Wonder rising to the hall: {he} rises in rank.', '丙9': 'Moon Wonder rising to the hall: brilliance that everyone sees.', '丁7': 'Star Wonder rising to the hall: remarkable accomplishments.' };

    (function () {
      var g = {}, add = function (el, name) { if (!el) return; (g[el] = g[el] || []).push(name); };
      add(lpEl, 'the palace');
      add(STEM_EL[lp.tiH], lp.tiH); add(STEM_EL[lp.diH], lp.diH);
      add(STAR_EL[lp.star], lp.star);
      add(DOOR_EL[door(LP)], door(LP)); add(SPIRIT_EL[lp.deity], lp.deity);
      var els = ORDER.filter(function (e) { return g[e]; }), x = '';
      var arcs = els.filter(function (e) { return !g[ORDER[(ORDER.indexOf(e) + 4) % 5]]; });
      var broken = arcs.length > 1 ? els.filter(function (e) { return g[KE[e]] && !g[GEN[e]]; }) : [];
      if (els.length === 1) x = 'Everything in the palace is ' + els[0] + ': a single-minded, concentrated nature.';
      else if (!broken.length) {
        var start = els.length === 5 ? lpEl : arcs[0];
        var chain = []; for (var e = start, k = 0; k < els.length && g[e]; k++, e = GEN[e]) chain.push(e);
        var seg = [];
        for (var i = 0; i < chain.length - 1; i++) {
          var a = g[chain[i]], subj = i === 0 ? cap(list(a)) : chain[i];
          seg.push(subj + (i === 0 && a.length > 1 ? ' feed ' : ' feeds ') + list(g[chain[i + 1]]));
        }
        x = seg.join(', ') + (els.length === 5
          ? ': the flow runs through all five elements without a break. Mind, action and body pull the same way.'
          : ': the flow is smooth and the four levels work together. {He} is consistent in {himself}.');
      } else {
        var e0 = broken[0];
        x = 'The flow is broken: ' + list(g[e0]) + (g[e0].length > 1 ? ' control ' : ' controls ') + list(g[KE[e0]]) + ' and ' + GEN[e0] + ' is missing between them. {He} has inner tensions to manage, and ' + GEN[e0] + ' is what eases them.';
      }
      // Host / Guest: Tian Pan stem against Di Pan stem.
      var ts = lp.tiH, ds = lp.diH, te = STEM_EL[ts], de = STEM_EL[ds];
      if (te && de) {
        if (te === de) x += ' ' + ts + ' over ' + ds + ' are the same element: neither host nor guest prevails.';
        else if (KE[te] === de) x += ' ' + ts + ' in the Tian Pan controls ' + ds + ' in the Di Pan: the guest leads, {he} is proactive and action oriented.';
        else if (GEN[de] === te) x += ' ' + ds + ' in the Di Pan generates ' + ts + ' in the Tian Pan: the guest leads, {he} is proactive and action oriented.';
        else if (KE[de] === te) x += ' ' + ds + ' in the Di Pan controls ' + ts + ' in the Tian Pan: the host leads, {he} is reflective and reacts more than {he} initiates.';
        else x += ' ' + ts + ' in the Tian Pan generates ' + ds + ' in the Di Pan: the host leads, {he} is reflective and reacts more than {he} initiates.';
      }
      x += inner[LP] ? ' Inner palace: reserved by nature, whatever {he} shows outside.' : ' Outer palace: a life turned toward the outside.';
      if (STAR_LP[lp.star]) x += ' ' + STAR_LP[lp.star];
      if (DOOR_LP[door(LP)]) x += ' ' + DOOR_LP[door(LP)];
      if (SPIRIT_LP[lp.deity]) x += ' ' + SPIRIT_LP[lp.deity];
      tian(LP).forEach(function (s) {
        if ('乙丙丁'.indexOf(s) < 0) return;
        x += ' ' + (HALL[s + LP] ? s + ' in ' + TRI[LP] + ' is ' + HALL[s + LP] : s + ' is in {his} palace: a personal gift that people notice at once.');
      });
      var ss = STEM_SET[(lp.tiH || '') + (lp.diH || '')];
      if (ss) x += ' ' + lp.tiH + ' over ' + lp.diH + ', in the old books: ' + ss;
      var sd = STAR_DOOR[lp.star + '+' + door(LP)];
      if (sd) x += ' ' + lp.star + ' with ' + door(LP) + ' is ' + sd[strong ? 0 : 1] + '.';
      out.natal.push({ t: 'The person', x: T(x) });
    })();

    // ================= 3. MAJOR QI ==========================================
    (function () {
      var x, m = P[mq], r = R(mq);
      var boost = (GEN[STAR_EL[m.star]] === PEL[mq] || GEN[STAR_EL[m.star]] === DOOR_EL[door(mq)]);
      if (r === 'S') x = 'The Major Qi is in the Life Palace itself: {he} carries the strongest force of the chart in person.';
      else {
        x = TRI[mq] + ', {his} ' + REL[r] + ' palace, with ' + holds(mq) + (mq === zf ? ', and it also holds the Zhi Fu' : '') + (mq === zs ? ', and it also holds the Zhi Shi' : '') + '.';
        if (boost) x += ' ' + m.star + ' generates ' + (GEN[STAR_EL[m.star]] === PEL[mq] ? 'the palace' : door(mq)) + ' there: it is very strong.';
        x += ' ' + ({
          P: strong ? 'The strongest force of the chart stands behind {him}: {he} is well supported, perhaps more than {he} needs.' : 'The strongest force of the chart nourishes {him}: exactly the support {he} needs.',
          O: strong ? 'What {he} produces is the strongest thing in the chart. With a strong Life Palace this is extremely favourable: {he} goes after it and it pays.' : 'What {he} gives out is the strongest force in the chart, and it drains {him}. With a weak Life Palace this costs more than it returns.',
          W: strong ? 'Money, assets' + (male ? ' and the partner' : '') + ' are the main theme of the chart, and {he} can handle them.' : 'Money and assets are the main theme of the chart, but holding them tires {him}: wealth that is hard to keep.',
          G: strong ? 'Pressure, rank and duty are the main theme of the chart. {He} can take it and turn it into accomplishment.' : 'The strongest force of the chart presses on {him}: a life of constraints, unless a palace bridges it.',
          B: strong ? 'Peers, partners and competitors are the main theme of the chart: {he} measures {himself} against equals.' : 'Peers and partners are the main theme of the chart, and they help {him} stand.'
        })[r];
      }
      out.natal.push({ t: 'Major Qi', x: T(x) });
    })();

    // ================= 4. ZHI FU AND ZHI SHI ================================
    (function () {
      var x = '', r = R(zf), fs = P[zf].star, ls = lp.star;
      x += ({
        S: 'The Zhi Fu is in the Life Palace: a natural born leader who sets the direction {himself}.',
        O: 'Zhi Fu in ' + TRI[zf] + ', at Offspring: {his} focus is performing, or following a leader.',
        W: 'Zhi Fu in ' + TRI[zf] + ', at Wealth: {his} focus is making money and building assets' + (male ? ', or romance' : '') + '.',
        G: 'Zhi Fu in ' + TRI[zf] + ', at Officer/Ghost: {he} feels strong constraints, and {his} focus is accomplishment.',
        P: 'Zhi Fu in ' + TRI[zf] + ', {his} Parents palace: the focus of {his} life is support and security.',
        B: 'Zhi Fu in ' + TRI[zf] + ', at Brothers: {his} focus is on equals, partners and competitors.'
      })[r];
      if (zf !== LP) {
        var fe = STAR_EL[fs], le = STAR_EL[ls];
        if (GEN[fe] === le) x += ' ' + fs + ' generates {his} star ' + ls + ': the Commander backs {him}.';
        else if (GEN[le] === fe) x += ' {His} star ' + ls + ' generates the Zhi Fu star ' + fs + ': {he} is called to serve a leader.';
        else if (KE[le] === fe) x += ' {His} star ' + ls + ' controls the Zhi Fu star ' + fs + ': {he} does not bend easily to authority.';
        else if (KE[fe] === le) x += ' The Zhi Fu star ' + fs + ' controls {his} star ' + ls + ': {he} feels limited by those above {him}.';
        else x += ' {His} star ' + ls + ' and the Zhi Fu star ' + fs + ' are the same element: {he} thinks like those who lead.';
        var cb = tian(zf).concat(di(zf)).filter(function (s) { return COMBO[s] === dayStem; })[0];
        if (cb) x += ' ' + cb + ' there combines with {his} Day Stem ' + dayStem + ': the tie is personal, a union.';
        if (voidPal[zf]) x += ' The palace is void (' + voidPal[zf] + '): the tie shows fully in the years that fill or clash it.';
      }
      var rs = R(zs), zd = door(zs), ld = door(LP);
      x += ' ' + ({
        S: 'The Zhi Shi is in {his} own palace: {he} is the one who carries the work, in front of everyone.',
        P: 'The Zhi Shi is ' + zd + ' in ' + TRI[zs] + ', {his} Parents palace: those who carry things out stand behind {him}.',
        O: 'The Zhi Shi is ' + zd + ' in ' + TRI[zs] + ', at Offspring: what {he} does is taken up by a wider circle of people.',
        W: 'The Zhi Shi is ' + zd + ' in ' + TRI[zs] + ', at Wealth: the working world is something {he} manages and profits from.',
        G: 'The Zhi Shi is ' + zd + ' in ' + TRI[zs] + ', at Officer/Ghost: pressure comes from the people around {him} and from the rules.',
        B: 'The Zhi Shi is ' + zd + ' in ' + TRI[zs] + ', at Brothers: {he} works side by side with equals.'
      })[rs];
      if (zs !== LP) {
        var ze = DOOR_EL[zd], de = DOOR_EL[ld];
        if (GEN[ze] === de) x += ' ' + zd + ' generates {his} door ' + ld + ': relations with others are smooth.';
        else if (KE[ze] === de) x += ' ' + zd + ' controls {his} door ' + ld + ': relations with others are not always smooth.';
        else if (GEN[de] === ze) x += ' {His} door ' + ld + ' generates ' + zd + ': {he} is burdened with obligations.';
        else if (KE[de] === ze) x += ' {His} door ' + ld + ' controls ' + zd + ': {he} tends to be controlling.';
        if (zf !== LP && GEN[STAR_EL[fs]] === STAR_EL[ls] && GEN[ze] === de) x += ' Star and door both come to {him}: great chances of success.';
      }
      out.natal.push({ t: 'Zhi Fu and Zhi Shi', x: T(x) });
    })();

    // ================= 5. SUPPORT / USEFUL PALACE ===========================
    var DOOR_GIVES = { Open: 'a profession, a position', Rest: 'rest, affection, a family', Birth: 'assets, a productive activity', Injury: 'movement, sport, competition',
      Delusion: 'study done apart, research, discretion', View: 'visibility, culture, things shown', Death: 'firm rules, land, tradition', Shocking: 'speech, voice, debate' };
    (function () {
      var x = '', power = function (p) { return p === mq || p === zf || p === zs; };
      var hard = strong ? [] : ghosts.filter(power);
      if (hard.length && parents.length) {
        var up = parents.filter(function (p) { return !voidPal[p]; }); if (!up.length) up = parents;
        x += list(up.map(function (p) { return TRI[p]; })) + '. The ' + PEL[hard[0]] + ' of ' + list(hard.map(function (p) { return TRI[p]; })) + ' feeds the ' + PEL[up[0]] + ' of ' + list(up.map(function (p) { return TRI[p]; }))
          + ', which feeds {his} ' + lpEl + ': pressure is turned into support. Whatever harms the Useful Palace harms {him}.';
        up.forEach(function (p) { if (power(OPP[p])) x += ' ' + TRI[OPP[p]] + ' clashes ' + TRI[p] + '.'; });
        x += ' ';
      }
      if (!strong) {
        if (!parents.length) x += 'No palace generates the Life Palace.';
        parents.forEach(function (p) {
          x += TRI[p] + ' has ' + holds(p) + ': ' + (DOOR_GIVES[door(p)] || 'what is there') + ' nourish {him}' + (power(OPP[p]) && !hard.length ? ', but ' + TRI[OPP[p]] + ' clashes it' : '') + '. ';
        });
        if (bros.length) x += list(bros.map(function (p) { return TRI[p]; })) + ', at Brothers, ' + (bros.length > 1 ? 'stand' : 'stands') + ' beside {him}.';
      } else {
        var w = [];
        if (offs.length) w.push('Offspring in ' + list(offs.map(function (p) { return TRI[p] + ' (' + door(p) + ')'; })));
        if (wealth.length) w.push('Wealth in ' + list(wealth.map(function (p) { return TRI[p] + ' (' + door(p) + ')'; })));
        if (ghosts.length) w.push('Officer/Ghost in ' + list(ghosts.map(function (p) { return TRI[p] + ' (' + door(p) + ')'; })));
        x += 'Productive work for a strong Life Palace: ' + w.join('; ') + '.';
        var tgt = [mq, zf].filter(function (p) { return p !== LP && 'OWG'.indexOf(R(p)) >= 0; })[0];
        if (tgt) x += ' The first place to spend {his} energy is ' + TRI[tgt] + '.';
      }
      out.natal.push({ t: hard.length && parents.length ? 'Useful Palace' : 'Support', x: T(x.trim()) });
    })();

    // ================= 6. THREE WONDERS =====================================
    (function () {
      var W = { P: 'a good teacher or guide, help that arrives', O: 'a good ability to perform', W: 'skill at making money', G: 'what presses on {him} arrives with a gift, and can be turned into accomplishment', B: 'talented friends and partners', S: 'a talent {he} carries in person' };
      var x = '乙丙丁'.split('').map(function (s) {
        var ps = tianOf(s); if (!ps.length) return '';
        var p = ps[0];
        return s + ' in ' + where(p) + (door(p) ? ' with ' + door(p) : '') + ': ' + W[R(p)] + (!strong && R(p) === 'O' ? ', which spends {his} energy' : '') + '.';
      }).filter(Boolean).join(' ');
      out.natal.push({ t: 'Three Wonders', x: T(x) });
    })();

    // ================= 7. FOUR PILLARS ======================================
    (function () {
      var M = {
        Year: ['the family of origin and the world at large are solid and count in {his} life', 'a break with the family of origin or with authority'],
        Month: ['{his} generation, peers and working world are a solid presence: {he} speaks for them', '{he} breaks with the rules and the people of {his} environment'],
        Day: ['strength of character: {he} is firmly {himself}', 'something in {his} own person, body or couple does not hold together: a point to protect'],
        Hour: ['children, works and the later part of life are solid', 'a break in what the hour stands for: children, works, the later part of life']
      };
      var seen = {}, x = [];
      [['Year', PS.year], ['Month', PS.month], ['Day', PS.day], ['Hour', PS.hour]].forEach(function (it) {
        var gz = it[1], sp = tianOf(chartStem(gz)), bp = palOfBranch(gz.charAt(1));
        if (sp.indexOf(bp) >= 0) x.push('The ' + it[0] + ' Pillar ' + gz + ' is whole in ' + where(bp) + ': ' + M[it[0]][0] + '.');
        else if (sp.indexOf(OPP[bp]) >= 0) x.push('The ' + it[0] + ' Pillar ' + gz + ' is split between ' + TRI[OPP[bp]] + ' and ' + TRI[bp] + ': ' + M[it[0]][1] + '.');
        seen[gz] = 1;
      });
      out.natal.push({ t: 'Four Pillars', x: T(x.length ? x.join(' ') : 'No pillar is whole in one palace and none is split.') });
    })();

    // ================= 8. DOORS =============================================
    var DOORS = {
      Open: { S: 'career and authority are in {his} own nature', P: 'a career helps {him}, and rank arrives through support', O: '{he} builds {his} career with what {he} produces, and it takes effort',
        B: 'a career made among equals', W: '{he} directs {his} own career and profits from it', G: 'career comes with pressure and obstacles' },
      Rest: { S: 'enjoyment, love and family are what {he} {himself} is about', P: 'love and family life restore {him}: good fortune there', O: '{he} gives much for love and family, and enjoys what {he} creates',
        B: 'pleasure is shared with friends', W: 'family life is there but {he} does not fully enjoy it', G: 'love and family life bring hardship' },
      Birth: { S: '{he} {himself} is the asset: wealth stays close to {him}', P: 'wealth comes to {him}: good fortune with money', O: 'wealth through {his} own output',
        B: 'wealth through partners, and shared with them', W: '{he} controls the assets: {he} can make money, and must work to hold it', G: 'money comes with constraints' }
    };
    (function () {
      var x = [], rank = { S: 0, P: 1, B: 2, O: 3, W: 4, G: 5 }, best = null;
      ['Open', 'Rest', 'Birth'].forEach(function (d) {
        var p = find('doorName', d); if (!p) return;
        var r = R(p);
        x.push(d + ' in ' + where(p) + ': ' + DOORS[d][r] + '.');
        if (!best || rank[r] < rank[best.r]) best = { d: d, r: r };
      });
      if (best && rank[best.r] <= 1) x.push('Direction of life: ' + ({ Open: 'career and position', Rest: 'enjoyment, love and family', Birth: 'wealth and assets' })[best.d] + ' (' + best.d + ').');
      out.natal.push({ t: 'Doors', x: T(x.join(' ')) });
    })();

    // =========================================================================
    //  AREAS OF LIFE (06)
    // =========================================================================
    var RELWORD = { S: 'is the Life Palace', P: 'generates the Life Palace', O: 'is generated by the Life Palace', B: 'stands beside the Life Palace', W: 'is controlled by the Life Palace', G: 'controls the Life Palace' };
    function vib(p) { return p === mq || stageOf(PEL[p], mb).strong; }

    // ---- Love and relationships
    (function () {
      var x = [], pr = find('doorName', 'Rest'), ph = find('deity', 'Harmonies');
      var HARMONY = { S: 'unions and agreements are part of {his} nature', P: 'unions and agreements nourish {him}', O: '{he} gives much to keep unions and agreements alive',
        B: 'unions and agreements are made among equals', W: '{he} sets the terms of unions and agreements', G: 'unions and agreements weigh on {him}' };
      if (pr) x.push('Rest in ' + where(pr) + ': ' + DOORS.Rest[R(pr)] + '.');
      if (ph) x.push('Harmonies in ' + where(ph) + ': ' + HARMONY[R(ph)] + '.');
      var sp = (male ? SPOUSE_M : SPOUSE_F)[dayStem], sps = sp === '甲' ? [] : tianOf(sp);
      if (sps.length) {
        var p = sps[0], r = R(p), n = stemStage(sp, p), weakSp = n >= 7, side = r === 'P' || r === 'B' || r === 'S';
        x.push('The spouse element is ' + sp + ', in ' + where(p) + ', at ' + STAGE[n] + '. '
          + (side ? (weakSp ? 'The partner is on {his} side, but is not strong.' : 'The partner is on {his} side and strong: a good setting for married life.')
            : r === 'O' ? 'The partner takes {his} energy.' : r === 'G' ? 'The partner presses on {him}.' : '{He} leads the couple.')
          + (side && !weakSp ? '' : r === 'W' ? '' : ' Difficulties show in the years that activate ' + TRI[p] + '.'));
      } else if (sp === '甲') x.push('The spouse element is 甲, hidden in the chart under the stem of its decade.');
      out.areas.push({ t: 'Love and relationships', x: T(x.join(' ')) });
    })();

    // ---- Intelligence and education
    (function () {
      var x = [], pa = find('star', 'Assistant'), pg = find('star', 'Grass'), ph = find('deity', 'Harmonies');
      if (pg) { var rg = R(pg); if (rg === 'S') x.push('Grass is in the Life Palace: very intelligent.'); else if (rg !== 'G' && rg !== 'W') x.push('Grass in ' + where(pg) + ' is in harmony with the Life Palace: intelligent.'); }
      if (pa) { var ra = R(pa); x.push('Assistant in ' + where(pa) + ': ' + (ra === 'W' ? 'capable, but not drawn to formal schooling: what {he} knows does not come from school' : ra === 'G' ? 'formal education does not come easily to {him}' : 'well educated, at ease with study') + '.'); }
      if (ph) { var rh = R(ph); if (rh === 'P' || rh === 'S') x.push('Harmonies ' + (rh === 'S' ? 'is in' : 'generates') + ' the Life Palace: good manners come naturally.'); else if (rh === 'W') x.push('{He} controls the Harmonies palace: {he} can go against protocol.'); }
      out.areas.push({ t: 'Intelligence and education', x: T(x.join(' ')) });
    })();

    // ---- Health
    (function () {
      var BODY = { 6: 'the head', 2: 'the stomach and abdomen', 3: 'the feet and liver', 4: 'the hips and thighs', 1: 'the kidneys and ears', 9: 'the eyes and heart', 8: 'the hands and back', 7: 'the mouth and lungs' };
      var x = [];
      [['Rice', 'star', 'a tendency to sickness'], ['Death', 'doorName', 'a tendency to pain and scars'], ['Injury', 'doorName', 'a tendency to injuries']].forEach(function (it) {
        var p = find(it[1], it[0]); if (!p) return;
        var r = R(p);
        if (r === 'G' && vib(p)) x.push(it[0] + ' in ' + TRI[p] + ' is vibrant and controls the Life Palace: ' + it[2] + '; the area to watch is ' + BODY[p] + '.');
        else if (r === 'G') x.push(it[0] + ' in ' + TRI[p] + ' controls the Life Palace but has little Qi: a minor point to watch, ' + BODY[p] + '.');
        else if (r === 'O' && !strong) x.push(it[0] + ' in ' + TRI[p] + ' drains a weak Life Palace: a slow wearing down, rest matters.');
      });
      if (!x.length) x.push('None of Rice, Death and Injury controls the Life Palace: no strong warning from the chart.');
      out.areas.push({ t: 'Health', x: T(x.join(' ')) });
    })();

    // ---- Family
    (function () {
      var F = { S: 'very close to {him}', P: 'supportive', O: '{he} gives more than {he} receives', B: 'on equal terms', W: '{he} takes the lead', G: 'a weight on {him}' };
      var x = [];
      [['Parents', PS.year, 'Year'], ['Siblings', PS.month, 'Month'], ['Children', PS.hour, 'Hour']].forEach(function (it) {
        var st = chartStem(it[1]), ps = tianOf(st); if (!ps.length) return;
        x.push(it[0] + ' (' + it[2] + ' Stem ' + it[1].charAt(0) + (st !== it[1].charAt(0) ? ', under ' + st : '') + ') in ' + where(ps[0]) + ': ' + F[R(ps[0])] + '.');
      });
      if (LP !== 6) x.push('Father (Qian): ' + F[R(6)] + '.');
      if (LP !== 2) x.push('Mother (Kun): ' + F[R(2)] + '.');
      out.areas.push({ t: 'Family', x: T(x.join(' ')) });
    })();

    // ---- Wealth and income
    (function () {
      var x = [], pb = find('doorName', 'Birth'), pw = tianOf('戊')[0];
      if (pb) x.push('Birth in ' + where(pb) + ': ' + DOORS.Birth[R(pb)] + '.');
      if (pb && pw) {
        var be = PEL[pb], we = PEL[pw], ok = pb === pw || be === we || GEN[be] === we || GEN[we] === be;
        var linked = [pb, pw].some(function (p) { var r = R(p); return r === 'S' || r === 'P' || r === 'O' || r === 'B'; });
        if (pb === pw && R(pb) === 'G' && vib(pb)) x.push('戊 and Birth are together in ' + TRI[pb] + ', vibrant, and control the Life Palace: there is wealth potential, but {he} is not interested in pursuing money.');
        else if (ok && linked) x.push('戊 in ' + where(pw) + ' and Birth work together and connect with the Life Palace: what {he} produces becomes profit, and profit becomes capital. {He} can build wealth.');
        else if (ok) x.push('戊 in ' + where(pw) + ' and Birth work together, but the Life Palace is not connected: the wealth exists and does not easily reach {him}.');
        else x.push('戊 in ' + where(pw) + ' and Birth control each other: the pursuit of wealth meets obstacles.');
      }
      out.areas.push({ t: 'Wealth and income', x: T(x.join(' ')) });
    })();

    // ---- Career and power
    (function () {
      var x = [], po = find('doorName', 'Open');
      if (po) x.push('Open in ' + where(po) + ': ' + DOORS.Open[R(po)] + '.');
      var ys = tianOf(chartStem(PS.year))[0];
      if (ys && ys !== LP) {
        var a = STAR_EL[P[ys].star], b = STAR_EL[lp.star];
        if (GEN[a] === b || a === b) x.push('The Year Stem palace star ' + P[ys].star + ' supports {his} star ' + lp.star + ': promotion comes from people above.');
        else if (KE[a] === b) x.push('The Year Stem palace star ' + P[ys].star + ' controls {his} star ' + lp.star + ': those above hold {him} back.');
      }
      if (zf === LP) x.push('The Zhi Fu is in the Life Palace: {he} holds the power {himself}.');
      else if (GEN[STAR_EL[P[zf].star]] === STAR_EL[lp.star]) x.push('The Zhi Fu star generates {his} star: {he} rises with broad support.');
      if (ghosts.length) x.push('Power sits in ' + list(ghosts.map(function (p) { return TRI[p] + ' (' + holds(p) + ')'; })) + ': ' + (strong ? 'a strong Life Palace can go after it.' : 'a weak Life Palace needs a bridge to reach it.'));
      out.areas.push({ t: 'Career and power', x: T(x.join(' ')) });
    })();

    // ---- Spiritual development
    (function () {
      var x = [], se = SPIRIT_EL[lp.deity], te = STAR_EL[lp.star];
      if (se && te) x.push(GEN[se] === te || se === te || KE[te] === se
        ? lp.deity + ' and ' + lp.star + ' communicate in the Life Palace: {his} thoughts connect readily with the spirit.'
        : lp.deity + ' and ' + lp.star + ' do not communicate directly in the Life Palace: the connection with the spirit needs practice.');
      var pg = find('star', 'Grass'), ph = find('star', 'Hero');
      if (pg && ph) {
        var rg = R(pg), rh = R(ph);
        if ((rg === 'P' && rh === 'O') || (rg === 'O' && rh === 'P')) x.push('Grass and Hero are in balance, one at Parents and one at Offspring: the best setting.');
        if (rg === 'P' || rg === 'S') x.push('Grass nourishes {him}: {he} can connect with ancient wisdom and receive help from it.');
        if (rh === 'P' || rh === 'S') x.push('Hero nourishes {him}: {he} is made for self-enquiry.');
        if (tian(ph).concat(di(ph)).indexOf('庚') >= 0) x.push('Hero is with 庚: the old obstacles can be transmuted by the spiritual fire.');
      }
      out.areas.push({ t: 'Spiritual development', x: T(x.join(' ')) });
    })();

    // =========================================================================
    //  TIMING (04)
    // =========================================================================
    var PERIOD = { S: 'the years in which {he} is most {himself}', P: 'smooth and supported', O: 'active and giving' + (strong ? '' : ', and tiring'), B: 'spent among equals', W: 'rewarding, with {him} in control', G: 'under pressure, with challenges' };
    // Trigrams: man Gen, Kan, Zhen, Qian; woman Dui, Li, Xun, Kun.
    (male ? [[8, 'Younger years'], [1, 'Young adult age'], [3, 'Mature age'], [6, 'Old age']] : [[7, 'Younger years'], [9, 'Young adult age'], [4, 'Mature age'], [2, 'Old age']]).forEach(function (it) {
      var p = it[0];
      out.phases.push({ t: it[1] + ' · ' + TRI[p], x: T(cap(PERIOD[R(p)]) + '. ' + TRI[p] + ' ' + RELWORD[R(p)] + ', with ' + holdsAll(p) + '.') });
    });

    // Zhi Fu of each decade, from the hour pillar.
    var CYCLE = { S: 'the new Zhi Fu comes to the Life Palace: a period that defines {him}', P: 'a supported period: help, study, protection', O: 'a period of output: performing, producing, giving',
      B: 'a period among equals: partners and competitors', W: 'a period for money, assets and managing', G: 'a period of pressure, duty and rank' };
    var by = inp.birthYear, hI = jzIdx(PS.hour), pos = hI % 10, dec = Math.floor(hI / 10);
    (function () {
      var age = 0, len = 10 - pos;
      for (var k = 0; k < 10 && age < 96; k++) {
        var st = JIA_LEAD[(dec + k) % 6], tp = tianOf(st)[0], dp = diOf(st)[0];
        var x = '';
        if (tp) x += cap(CYCLE[R(tp)]) + '. ' + st + ' is on the Tian Pan in ' + where(tp) + ', with ' + holds(tp) + '.';
        if (dp && dp !== tp) x += ' On the Di Pan it is in ' + where(dp) + '.';
        out.cycles.push({ from: age, to: age + len - 1, y0: by + age, y1: by + age + len - 1, lead: '甲' + JIA_BR[st] + st, x: T(x) });
        age += len; len = 10;
      }
    })();

    // Zhi Fu trigger branch (04 Timing, Zhi Fu 1-6).
    var trig = (function () {
      var jb = JIA_BR[JIA_LEAD[Math.floor(hI / 10)]], pb = PBR[zf].split(''), o = [];
      if (voidPal[zf]) return { why: 'the Zhi Fu palace is void', br: [voidPal[zf], bclash(voidPal[zf])] };
      pb.forEach(function (b) {
        if (bclash(jb) === b) o.push({ why: jb + ' of the Zhi Fu clashes ' + b + ' of ' + TRI[zf], br: [LIUHE[jb]] });
        else if (LIUHE[jb] === b) o.push({ why: jb + ' of the Zhi Fu combines with ' + b + ' of ' + TRI[zf], br: [bclash(b)] });
        else if (PENAL[jb] === b || PENAL[b] === jb) o.push({ why: jb + ' of the Zhi Fu and ' + b + ' of ' + TRI[zf] + ' form a penalty', br: [LIUHE[jb]] });
        else if (HARM[jb] === b) o.push({ why: jb + ' of the Zhi Fu harms ' + b + ' of ' + TRI[zf], br: [LIUHE[jb]] });
      });
      return o[0] || null;
    })();
    out.trigger = trig ? T('Zhi Fu years: ' + trig.br.join(' and ') + ' (' + trig.why + ').') : '';

    // Geng setting: 庚 together with a pillar stem.
    var geng = [];
    anyOf('庚').forEach(function (p) {
      [['Year', PS.year], ['Month', PS.month], ['Day', PS.day], ['Hour', PS.hour]].forEach(function (it) {
        var s = it[1].charAt(0);
        if (s !== '庚' && s !== '甲' && tian(p).concat(di(p)).indexOf(s) >= 0 && !geng.some(function (g) { return g.s === s; })) geng.push({ s: s, w: it[0], p: p });
      });
    });
    out.geng = geng.length ? T('庚 setting: ' + geng.map(function (g) { return '庚 is with the ' + g.w + ' Stem ' + g.s + ' in ' + TRI[g.p]; }).join('; ') + '. Things can happen in ' + list(geng.map(function (g) { return g.s; })) + ' years.') : '';

    // ---- one year ------------------------------------------------------------
    var WHAT = { S: '{he} {himself} is in play: a turning point', P: 'support, study, a position, help from above', O: 'output, performance, children, energy spent', B: 'peers, partners and competitors',
      W: 'money, assets' + (male ? ', the partner' : ''), G: 'pressure, rank, duty' + (male ? '' : ', the partner') };
    var CARRIED = { '子': '戊', '寅': '癸', '辰': '壬', '午': '辛', '申': '庚', '戌': '己' };
    out.year = function (y) {
      var gz = jz(y - 4), ys = chartStem(gz), yb = gz.charAt(1), lines = [];
      var sp = anyOf(ys), bp = palOfBranch(yb), main = [];
      function desc(p) { return TRI[p] + ' (' + relName(p) + ': ' + holds(p) + (P[p].zhiFu ? ', Zhi Fu' : '') + (P[p].zhiShi ? ', Zhi Shi' : '') + ')'; }
      if (sp.indexOf(bp) >= 0) { lines.push('The whole pillar ' + gz + ' falls in ' + desc(bp) + ': a significant year, what is in this palace manifests.'); main = [bp]; }
      else if (sp.indexOf(OPP[bp]) >= 0) { lines.push(gz + ' falls in opposite palaces and activates both ' + desc(OPP[bp]) + ' and ' + desc(bp) + '.'); main = [OPP[bp], bp]; }
      else {
        lines.push('The branch ' + yb + ' activates ' + desc(bp) + '.');
        if (sp.length) lines.push('The stem ' + gz.charAt(0) + (ys !== gz.charAt(0) ? ' (under ' + ys + ')' : '') + ' is in ' + list(sp.map(function (p) { return TRI[p] + ' (' + relName(p) + ')'; })) + '.');
        main = [bp];
      }
      main.forEach(function (p) {
        lines.push(TRI[p] + ' ' + RELWORD[R(p)] + ': ' + (R(p) === 'S' ? '{he} {himself} is in play, a turning point' : WHAT[R(p)]) + '.' + (P[p].zhiFu || P[p].zhiShi ? ' The ' + (P[p].zhiFu ? 'Zhi Fu' : 'Zhi Shi') + ' is activated: the year weighs more.' : ''));
      });
      if (CARRIED[yb]) { var cp = anyOf(CARRIED[yb]).filter(function (p) { return main.indexOf(p) < 0; }); if (cp.length) lines.push(yb + ' is carried by ' + CARRIED[yb] + ': it also touches ' + list(cp.map(function (p) { return TRI[p]; })) + '.'); }
      var cmb = COMBO[gz.charAt(0)], cl = SCLASH[gz.charAt(0)];
      var tch = [];
      if (cmb && anyOf(cmb).length) tch.push('combines with ' + cmb + ' in ' + list(anyOf(cmb).map(function (p) { return TRI[p]; })));
      if (cl && anyOf(cl).length) tch.push('clashes ' + cl + ' in ' + list(anyOf(cl).map(function (p) { return TRI[p]; })));
      if (tch.length) lines.push(gz.charAt(0) + ' ' + tch.join(' and ') + '.');
      if (voidBr.indexOf(yb) >= 0 && voidPal[bp]) lines.push('The year fills the void of ' + TRI[bp] + '.');
      else { var vc = voidBr.filter(function (b) { return bclash(b) === yb && voidPal[palOfBranch(b)]; })[0]; if (vc) lines.push('The year clashes the void branch ' + vc + ' of ' + TRI[palOfBranch(vc)] + ' and opens it.'); }
      if (trig && trig.br.indexOf(yb) >= 0) lines.push('A Zhi Fu year: ' + trig.why + '.');
      geng.forEach(function (g) { if (g.s === gz.charAt(0)) lines.push('庚 setting: ' + g.s + ' is with 庚 in ' + TRI[g.p] + '. Things can happen this year.'); });
      var cy = out.cycles.filter(function (c) { return y >= c.y0 && y <= c.y1; })[0];
      if (cy) lines.push('Zhi Fu cycle ' + cy.lead + ' (age ' + cy.from + '–' + cy.to + '): ' + cy.x);
      return { gz: gz, age: y - by, lines: lines.map(T) };
    };

    out.voids = voidBr; out.voidPalaces = voidPal; out.strong = strong;
    return out;
  }

  return { build: build };
}));

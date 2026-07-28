// ============================================================
// daliuren-fengshui.js  —  Da Liu Ren Feng Shui ANNUAL chart
//
// Wraps the generic 大六壬 engine (window.XKDGDaLiuRen, from daliuren.js)
// with the Feng Shui "Li Qi" casting rules and the annual GREEN/RED
// judgement for the 12 double-mountain sectors of a house.
//
// CASTING (per Edu's slides, all validated against the July-2019 example):
//   • Day pillar   = the YEAR pillar (Tai Sui). The 6 "Tai Sui days" are those
//     with day GanZhi == year GanZhi (60 days apart) inside the SOLAR year,
//     i.e. from 立春 Lichun to the next Lichun — never Jan 1 → Dec 31.
//     Among them pick, in this order (Edu, session 24):
//       1. the day whose chart has the house SITTING branch riding (in HEAVEN,
//          over) the Tai Sui branch in EARTH;
//       2. else the day where the 六合 OF THE SITTING rides the Tai Sui branch;
//       3. else the reverse relation — the SITTING rides the 六合 OF THE TAI SUI
//          (e.g. 2026, Tai Sui 午 whose 六合 is 未, sitting 子 → 子 over 未);
//       4. else the reverse of rule 1 — the TAI SUI rides the SITTING;
//       5. else the TAI SUI rides the FACING.
//     Rules 4 and 5 together mean "the Tai Sui must ride the house", from the
//     sitting side then from the facing side. Verified over 1212 year/sector
//     pairs (2000-2100): every one resolves, none is left without a chart.
//   • Hour branch  = the house FACING reduced to its 12-branch (double
//     mountain) sector; hour stem via 五鼠遁.
//   • Month general= 月將 of that selected date (中氣-based).
//
// GREEN (auspicious) vs RED (inauspicious) on each of the 12 EARTH sectors,
// judged on the HEAVEN branch sitting over that sector + the general there:
//   GREEN  general: 貴人 Nobleman, 青龍 Dragon, 六合 Six Harmonies
//   GREEN  heaven : year Lu (stage4), year Wealth, Heavenly Doctor,
//                   Heaven/Month/Day/Branch Virtue
//   RED    general: 白虎 Tiger, 玄武 Warrior, 勾陳 Polaris, 天空 Empty Sky
//   RED    heaven : Ghost Sha, Tomb Sha, year Brothers
//   Parent / Children heavens are CONTEXTUAL (bedroom / recreation) → off
//   in the default view. One green + one red on the same sector cancel,
//   EXCEPT the Heavenly Doctor (天醫): always counted, and when it meets a
//   negative it yields a HOLLOW green circle (net 'green_hollow'), not a
//   cancel. 六合 is a normal (cancellable) green. The day-void is NOT
//   significant in the annual reading — kept as data, shown only as a note.
//
// Depends on: window.XKDGDaLiuRen (daliuren.js), window.Lunar (lunar-javascript).
// ============================================================

(function () {
  'use strict';

  function ENG() { return (typeof window !== 'undefined' && window.XKDGDaLiuRen) || (typeof XKDGDaLiuRen !== 'undefined' ? XKDGDaLiuRen : null); }
  function LUN() { return (typeof window !== 'undefined' && window.Lunar) || (typeof Lunar !== 'undefined' ? Lunar : null); }

  var STEMS    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  function sIdx(s){ return STEMS.indexOf(s); }
  function bIdx(b){ return BRANCHES.indexOf(b); }

  // ── 12 長生 stages: Lu = stage 4 (臨官), Tomb = stage 9 (墓) ──
  var CS_START = { '甲':'亥','丙':'寅','戊':'寅','庚':'巳','壬':'申',
                   '乙':'午','丁':'酉','己':'酉','辛':'子','癸':'卯' };
  var YANG_STEM = { '甲':1,'丙':1,'戊':1,'庚':1,'壬':1 };
  function stageBranch(stem, stageNum){ // stageNum 1..12 (1=長生)
    var start = bIdx(CS_START[stem]);
    var fwd = !!YANG_STEM[stem];
    var i = stageNum - 1;
    var idx = fwd ? (start + i) % 12 : ((start - i) % 12 + 12) % 12;
    return BRANCHES[idx];
  }
  function yearLu(stem){   return stageBranch(stem, 4); }
  function tombSha(stem){  return stageBranch(stem, 9); }

  // ── Heavenly Doctor (Tien Yi) = 寄宮 of the stem + 2 branches forward ──
  var STEM_JIGONG = { '甲':'寅','乙':'辰','丙':'巳','丁':'未','戊':'巳','己':'未','庚':'申','辛':'戌','壬':'亥','癸':'丑' };
  function heavenlyDoctor(stem){ return BRANCHES[(bIdx(STEM_JIGONG[stem]) + 2) % 12]; }

  // ── Virtues ──
  // Branch Virtue: day branch + 5.
  function branchVirtue(dayBranch){ return BRANCHES[(bIdx(dayBranch) + 5) % 12]; }
  // Day Virtue by day stem.
  var DAY_VIRTUE = { '甲':'寅','己':'寅','乙':'申','庚':'申','丙':'巳','辛':'巳','戊':'巳','癸':'巳','丁':'亥','壬':'亥' };
  // Month Virtue = Lu (stage4) of the triad's Yang stem: 亥卯未→甲, 寅午戌→丙, 巳酉丑→庚, 申子辰→壬.
  var MONTH_VIRTUE_STEM = { '亥':'甲','卯':'甲','未':'甲', '寅':'丙','午':'丙','戌':'丙',
                            '巳':'庚','酉':'庚','丑':'庚', '申':'壬','子':'壬','辰':'壬' };
  function monthVirtue(monthBranch){ return yearLu(MONTH_VIRTUE_STEM[monthBranch]); }
  // Heaven Virtue by month branch (confirmed table).
  var HEAVEN_VIRTUE = { '寅':'未','卯':'申','辰':'亥','巳':'戌','午':'亥','未':'寅',
                        '申':'丑','酉':'寅','戌':'巳','亥':'辰','子':'巳','丑':'申' };

  // ── 六合 (six-combine) for the sitting fallback ──
  var LIU_HE = { '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯',
                 '辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午' };

  // ── double-mountain: facing degree → its 12-branch sector ──
  // sectors are the branch shifted back 7.5°: boundaries at 7.5+30k.
  // order from boundary 7.5°: 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥 子
  var DM_ORDER = ['丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子'];
  function facingBranch(deg){
    var d = ((deg % 360) + 360) % 360;
    return DM_ORDER[Math.floor(((d - 7.5 + 360) % 360) / 30)];
  }
  // 24-mountain char at a degree (for the sitting mountain reduction to branch)
  var MTN24 = ['壬','子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙','午','丁','未','坤','申','庚','酉','辛','戌','乾','亥'];
  function mountainFromDeg(deg){ var d=((deg%360)+360)%360; return MTN24[Math.floor((d+7.5)/15)%24]; }

  // ── year pillar (Li Chun boundary) ──
  function yearPillar(year){
    var L = LUN(); if (!L) return null;
    // mid-year is safely inside the Li-Chun→Li-Chun window for that civil year
    var gz = L.fromDate(new Date(year, 5, 1)).getYearInGanZhi();
    return { stem: gz.charAt(0), branch: gz.charAt(1), gz: gz };
  }

  // ── the (up to 6) Tai Sui days of a civil year: day GanZhi == year GanZhi ──
  // 立春 Lichun timestamp for a given civil year — the boundary of the SOLAR year.
  // (Edu, session 24: the Tai Sui days always run Lichun → Lichun, never Jan 1 →
  // Dec 31. A day before Lichun belongs to the PREVIOUS solar year.)
  function lichunOf(year){
    var L = LUN(); if (!L) return null;
    var best = null;
    [year - 1, year, year + 1].forEach(function (yy) {
      var table = L.fromYmd(yy, 1, 1).getJieQiTable();
      for (var kk in table) {
        var nm = ROMAN2CN[kk] || kk;
        if (nm !== '\u7ACB\u6625') continue;                       // 立春
        var s = table[kk];
        var ts = new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour() || 0, s.getMinute() || 0);
        if (ts.getFullYear() === year && (!best || ts < best)) best = ts;
      }
    });
    return best;
  }

  function taiSuiDays(year){
    var L = LUN(); if (!L) return [];
    var yp = yearPillar(year); if (!yp) return [];
    // SOLAR year window: [Lichun(year), Lichun(year+1)) — NOT the civil year.
    var start = lichunOf(year), end = lichunOf(year + 1);
    if (!start || !end) { start = new Date(year, 1, 4); end = new Date(year + 1, 1, 4); }
    var out = [];
    function dayGZ(dt){
      var lun = L.fromDate(dt);
      return lun.getDayInGanZhi();
    }
    // find the first Tai Sui day at or after Lichun, then step +60 days
    var first = null;
    for (var k = 0; k < 62 && !first; k++) {
      var dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
      if (dayGZ(dt) === yp.gz) first = dt;
    }
    if (!first) return [];
    for (var t = new Date(first); t < end; t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 60)) {
      out.push(new Date(t));
    }
    return out;
  }

  // ── month general 月將 (中氣-based) for a date ──
  var ROMAN2CN = { DA_XUE:'大雪', DONG_ZHI:'冬至', XIAO_HAN:'小寒', DA_HAN:'大寒', LI_CHUN:'立春', YU_SHUI:'雨水', JING_ZHE:'惊蛰' };
  function monthGeneralFor(dt){
    var L = LUN(), E = ENG(); if (!L || !E) return null;
    var ZQ = E.MONTH_GENERAL_BY_ZHONGQI;
    var y = dt.getFullYear();
    var events = [];
    [y - 1, y, y + 1].forEach(function (yy) {
      var table = L.fromYmd(yy, 1, 1).getJieQiTable();
      for (var kk in table) {
        var s = table[kk], nm = ROMAN2CN[kk] || kk;
        events.push({ name: nm, ts: new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour() || 0, s.getMinute() || 0).getTime() });
      }
    });
    events.sort(function (a, b) { return a.ts - b.ts; });
    var refTs = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0).getTime();
    var cur = null;
    for (var i = 0; i < events.length; i++) { if (events[i].ts <= refTs) cur = events[i]; else break; }
    // step back to the latest 中氣 (a name present in ZQ)
    for (var j = events.indexOf(cur); j >= 0; j--) { if (ZQ[events[j].name]) return ZQ[events[j].name]; }
    return null;
  }

  // ── main: build the annual chart for a house ──
  // opts = { year:Number, facingDeg:Number }
  function build(opts){
    var E = ENG(); if (!E) return { error: 'daliuren.js engine not loaded' };
    var L = LUN(); if (!L) return { error: 'lunar-javascript not loaded' };
    var year = opts.year, facingDeg = opts.facingDeg;
    var yp = yearPillar(year); if (!yp) return { error: 'year pillar failed' };

    var facingMtn  = mountainFromDeg(facingDeg);
    var facMtnIdx  = MTN24.indexOf(facingMtn);
    var sittingMtn = MTN24[(facMtnIdx + 12) % 24];          // opposite mountain
    var facBr = facingBranch(facingDeg);                    // hour branch (facing sector)
    var sitBr = facingBranch((facingDeg + 180) % 360);      // sitting sector branch
    var sitCombo = LIU_HE[sitBr];

    var hourStem = E.hourStemFor(yp.stem, facBr);

    // choose the Tai Sui day: sitting (heaven) rides Day branch, else its 六合
    var days = taiSuiDays(year);
    var dayCombo = LIU_HE[yp.branch];                        // 六合 of the Tai Sui branch
    var chosen = null, chosenMode = null;
    var candidates = [];
    for (var i = 0; i < days.length; i++) {
      var dt = days[i];
      var mg = monthGeneralFor(dt);
      if (!mg) continue;
      var plates = E.buildPlates(mg, facBr);
      var heavenOverDay = plates.heavenAbove(yp.branch);     // who rides the Day/Tai Sui branch
      var heavenOverDayCombo = dayCombo ? plates.heavenAbove(dayCombo) : null; // …and its 六合
      var isSit   = heavenOverDay === sitBr;
      var isCombo = heavenOverDay === sitCombo;
      // 3rd rule (Edu, session 24): when neither of the first two can be met, the
      // relation is taken the other way round — the SITTING must ride the 六合 OF
      // THE TAI SUI. E.g. 2026 (Tai Sui 午, 六合 未) with sitting 子 → 子 over 未.
      var isSitOverDayCombo = !!heavenOverDayCombo && heavenOverDayCombo === sitBr;
      // 4th rule (Edu, session 24): when even the 3rd cannot be met, take rule 1
      // the other way round — the TAI SUI branch rides the SITTING.
      var heavenOverSitting = plates.heavenAbove(sitBr);
      var isDayOverSit = heavenOverSitting === yp.branch;
      // 5th rule (Edu, session 24): last resort — the TAI SUI rides the FACING.
      // Together with the 4th this says "the Tai Sui must ride the house", once on
      // the sitting side and once on the facing side. Needed for the rare years
      // where none of the first four can be met (~1.8% of year/sector pairs).
      var heavenOverFacing = plates.heavenAbove(facBr);
      var isDayOverFacing = heavenOverFacing === yp.branch;
      candidates.push({ date: dt, monthGeneral: mg, heavenOverDay: heavenOverDay,
                        heavenOverDayCombo: heavenOverDayCombo, heavenOverSitting: heavenOverSitting,
                        isSit: isSit, isCombo: isCombo, isSitOverDayCombo: isSitOverDayCombo,
                        isDayOverSit: isDayOverSit, heavenOverFacing: heavenOverFacing,
                        isDayOverFacing: isDayOverFacing });
      if (!chosen && isSit)   { chosen = candidates[candidates.length - 1]; chosenMode = 'sitting'; }
    }
    if (!chosen) { // 2nd: the 六合 of the sitting rides the Tai Sui branch
      for (var c = 0; c < candidates.length; c++) { if (candidates[c].isCombo) { chosen = candidates[c]; chosenMode = 'liuhe'; break; } }
    }
    if (!chosen) { // 3rd: the sitting rides the 六合 of the Tai Sui branch
      for (var c3 = 0; c3 < candidates.length; c3++) { if (candidates[c3].isSitOverDayCombo) { chosen = candidates[c3]; chosenMode = 'sitting-over-taisui-combo'; break; } }
    }
    if (!chosen) { // 4th: the reverse of rule 1 — the Tai Sui rides the sitting
      for (var c4 = 0; c4 < candidates.length; c4++) { if (candidates[c4].isDayOverSit) { chosen = candidates[c4]; chosenMode = 'taisui-over-sitting'; break; } }
    }
    if (!chosen) { // 5th: the Tai Sui rides the facing
      for (var c5 = 0; c5 < candidates.length; c5++) { if (candidates[c5].isDayOverFacing) { chosen = candidates[c5]; chosenMode = 'taisui-over-facing'; break; } }
    }
    if (!chosen) return { error: 'no Tai Sui day satisfies the riding rule', candidates: candidates, yearPillar: yp };

    var monthBranch = chosen.monthGeneral;
    var chart = E.buildChartFromPrimitives(yp.stem, yp.branch, facBr, chosen.monthGeneral, hourStem);

    // ── build the trigger sets for the annual judgement ──
    var wealth = {}, brothers = {}, parents = {}, children = {}, ghost = {};
    BRANCHES.forEach(function (b) {
      var rel = E.sixRelation(yp.stem, b).en;
      if (rel === 'Wealth')   wealth[b] = 1;
      if (rel === 'Brothers') brothers[b] = 1;
      if (rel === 'Parents')  parents[b] = 1;
      if (rel === 'Children') children[b] = 1;
      if (rel === 'Ghost')    ghost[b] = 1;
    });
    var lu   = yearLu(yp.stem);
    var tomb = tombSha(yp.stem);
    var hd   = heavenlyDoctor(yp.stem);
    // Session 26: a branch can carry MORE THAN ONE virtue (this year 亥 is both Heaven
    // and Branch Virtue). The old single-value map silently overwrote them.
    var virtues = {};
    function _addVirtue(br, name){ if (!br) return; (virtues[br] = virtues[br] || []).push(name); }
    _addVirtue(HEAVEN_VIRTUE[monthBranch], 'Heaven');
    _addVirtue(monthVirtue(monthBranch),   'Month');
    _addVirtue(DAY_VIRTUE[yp.stem],        'Day');
    _addVirtue(branchVirtue(yp.branch),    'Branch');
    var dayVoid = E.xunKong(sIdx(yp.stem), bIdx(yp.branch)); // Void OF THE DAY (= year pillar)

    // Session 26 \u2014 spirit list set by Edu. GREEN dot: Nobleman, Green Dragon, Lu,
    // Proper/Unproper Wealth, the four Virtues, Heavenly Doctor. RED dot: Tomb Sha,
    // Ghost Sha, Tiger, Empty Sky. NO dot: Post Horse, Ding Spirit, Brothers.
    var GREEN_GEN = { '貴人':1, '青龍':1 };
    var RED_GEN   = { '白虎':1, '天空':1 };
    // Ding Spirit: inside the decade (旬) of the day/year pillar, the branch carrying
    // the 丁 stem. 2026 丙午 sits in the 甲辰 decade, whose \u4e01 member is 丁未 \u2192 未 all year.
    var _dingSpirit = (function () {
      var idx = (bIdx(yp.branch) - sIdx(yp.stem) + 12) % 12;      // decade head branch index
      return E.BRANCHES[(idx + 3) % 12];                          // 甲 +3 = 丁
    })();
    var _postHorse = E.postHorse ? E.postHorse(yp.branch) : null;
    // Wealth = what the day stem controls. Opposite polarity = Proper, same = Unproper.
    var _stemYang = ('甲丙戊庚壬'.indexOf(yp.stem) >= 0);
    function _branchYang(b) { return bIdx(b) % 2 === 0; }

    // per EARTH sector (12 double-mountain palaces): judge on the HEAVEN branch + general
    var sectors = chart.generals.palaces.map(function (p) {
      var H = p.heaven, genCn = p.general ? p.general.cn : '';
      var greens = [], reds = [], ctx = [], mods = [];
      if (GREEN_GEN[genCn]) greens.push(p.general.en);
      if (RED_GEN[genCn])   reds.push(p.general.en);
      if (H === lu)     greens.push('Lu');
      if (wealth[H])    greens.push(_branchYang(H) === _stemYang ? 'Unproper Wealth' : 'Proper Wealth');
      if (H === hd)     greens.push('Heavenly Doctor');
      if (virtues[H])   virtues[H].forEach(function (v) { greens.push(v + ' Virtue'); });
      if (H === ghost || ghost[H]) reds.push('Ghost Sha');
      if (H === tomb)   reds.push('Tomb Sha');
      // no dot, listed only
      if (brothers[H])  ctx.push('Brothers');
      if (H === _postHorse)  ctx.push('Post Horse');
      if (H === _dingSpirit) ctx.push('Ding Spirit');
      if (parents[H])   ctx.push('Parent (bedroom)');
      if (children[H])  ctx.push('Children (recreation)');
      // Virtues "help what is there" — modifiers, not standalone greens.

      // 空亡: the void falls on the EARTH palace of the void branches. Voids are
      // NOT significant in the annual DLR Feng Shui reading (Edu) — kept as data
      // only, shown as a small note in the centre panel, never as a sector mark.
      var isVoid = dayVoid.indexOf(p.earth) >= 0;
      // net judgement: green vs red cancel one-for-one, WITH one exception —
      // the Heavenly Doctor (天醫) is always counted and never simply cancelled:
      // if it meets a negative on the same sector the result is a HOLLOW green
      // circle (green outline, not filled), not a neutral cancel (Edu).
      // Edu, session 26: ANY green landing on a sector that also carries a red shows a
      // hollow circle \u2014 not just the Heavenly Doctor, as it was before.
      var net = 'neutral';
      if (greens.length && !reds.length) net = 'green';
      else if (reds.length && !greens.length) net = 'red';
      else if (greens.length && reds.length) net = 'green_hollow';
      return { earth: p.earth, heaven: H, general: p.general, relation: p.relation,
               greens: greens, reds: reds, context: ctx, virtues: mods, isVoid: isVoid, net: net };
    });

    return {
      year: year, yearPillar: yp,
      facingDeg: facingDeg, facingMountain: facingMtn, sittingMountain: sittingMtn,
      facingBranch: facBr, sittingBranch: sitBr,
      chosenDay: { date: chosen.date, mode: chosenMode, monthGeneral: chosen.monthGeneral },
      hourStem: hourStem,
      dayVoid: dayVoid,
      triggers: { lu: lu, tomb: tomb, ghost: Object.keys(ghost), wealth: Object.keys(wealth),
                  brothers: Object.keys(brothers), parents: Object.keys(parents),
                  children: Object.keys(children), heavenlyDoctor: hd, virtues: virtues },
      chart: chart,
      sectors: sectors,
      candidates: candidates
    };
  }

  var API = {
    build: build,
    yearPillar: yearPillar, taiSuiDays: taiSuiDays, monthGeneralFor: monthGeneralFor,
    yearLu: yearLu, tombSha: tombSha, heavenlyDoctor: heavenlyDoctor,
    facingBranch: facingBranch, mountainFromDeg: mountainFromDeg,
    HEAVEN_VIRTUE: HEAVEN_VIRTUE
  };
  if (typeof window !== 'undefined') window.XKDGDaLiuRenFS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();

// ============================================================
// daliuren-fengshui.js  —  Da Liu Ren Feng Shui ANNUAL chart
//
// Wraps the generic 大六壬 engine (window.XKDGDaLiuRen, from daliuren.js)
// with the Feng Shui "Li Qi" casting rules and the annual GREEN/RED
// judgement for the 12 double-mountain sectors of a house.
//
// CASTING (per Edu's slides, all validated against the July-2019 example):
//   • Day pillar   = the YEAR pillar (Tai Sui). Of the 6 "Tai Sui days"
//     in the year (day GanZhi == year GanZhi, 60 days apart) pick the one
//     whose chart has the house SITTING branch riding (sitting in HEAVEN,
//     over) the Day branch in EARTH; if none, the branch in 六合 with the
//     sitting must ride it.
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
  function taiSuiDays(year){
    var L = LUN(); if (!L) return [];
    var yp = yearPillar(year); if (!yp) return [];
    var out = [], d = new Date(year, 0, 1), end = new Date(year, 11, 31);
    // find first match then step +60 days
    var Solar = (typeof window !== 'undefined' && window.Solar) || (typeof Solar !== 'undefined' ? Solar : null);
    function dayGZ(dt){
      var lun = L.fromDate(dt);
      return lun.getDayInGanZhi();
    }
    // scan first 60 days for the first Tai Sui day
    var first = null;
    for (var k = 0; k < 62 && !first; k++) {
      var dt = new Date(year, 0, 1 + k);
      if (dayGZ(dt) === yp.gz) first = dt;
    }
    if (!first) return [];
    for (var t = new Date(first); t <= end; t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 60)) {
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
    var chosen = null, chosenMode = null;
    var candidates = [];
    for (var i = 0; i < days.length; i++) {
      var dt = days[i];
      var mg = monthGeneralFor(dt);
      if (!mg) continue;
      var plates = E.buildPlates(mg, facBr);
      var heavenOverDay = plates.heavenAbove(yp.branch);     // who rides the Day/Tai Sui branch
      var isSit   = heavenOverDay === sitBr;
      var isCombo = heavenOverDay === sitCombo;
      candidates.push({ date: dt, monthGeneral: mg, heavenOverDay: heavenOverDay, isSit: isSit, isCombo: isCombo });
      if (!chosen && isSit)   { chosen = candidates[candidates.length - 1]; chosenMode = 'sitting'; }
    }
    if (!chosen) { // fallback to 六合
      for (var c = 0; c < candidates.length; c++) { if (candidates[c].isCombo) { chosen = candidates[c]; chosenMode = 'liuhe'; break; } }
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
    var virtues = {};
    virtues[HEAVEN_VIRTUE[monthBranch]] = 'Heaven';
    virtues[monthVirtue(monthBranch)]   = 'Month';
    virtues[DAY_VIRTUE[yp.stem]]        = 'Day';
    virtues[branchVirtue(yp.branch)]    = 'Branch';
    var dayVoid = E.xunKong(sIdx(yp.stem), bIdx(yp.branch)); // Void OF THE DAY (= year pillar)

    var GREEN_GEN = { '貴人':1, '青龍':1, '六合':1 };
    var RED_GEN   = { '白虎':1, '玄武':1, '勾陳':1, '天空':1 };

    // per EARTH sector (12 double-mountain palaces): judge on the HEAVEN branch + general
    var sectors = chart.generals.palaces.map(function (p) {
      var H = p.heaven, genCn = p.general ? p.general.cn : '';
      var greens = [], reds = [], ctx = [], mods = [];
      if (GREEN_GEN[genCn]) greens.push(p.general.en);
      if (RED_GEN[genCn])   reds.push(p.general.en);
      if (H === lu)     greens.push('Lu');
      if (wealth[H])    greens.push('Wealth');
      if (H === hd)     greens.push('Heavenly Doctor');
      if (H === ghost || ghost[H]) reds.push('Ghost Sha');
      if (H === tomb)   reds.push('Tomb Sha');
      if (brothers[H])  reds.push('Brothers');
      if (parents[H])   ctx.push('Parent (bedroom)');
      if (children[H])  ctx.push('Children (recreation)');
      // Virtues "help what is there" — modifiers, not standalone greens.
      if (virtues[H])   mods.push(virtues[H] + ' Virtue');
      // 空亡: the void falls on the EARTH palace of the void branches. Voids are
      // NOT significant in the annual DLR Feng Shui reading (Edu) — kept as data
      // only, shown as a small note in the centre panel, never as a sector mark.
      var isVoid = dayVoid.indexOf(p.earth) >= 0;
      // net judgement: green vs red cancel one-for-one, WITH one exception —
      // the Heavenly Doctor (天醫) is always counted and never simply cancelled:
      // if it meets a negative on the same sector the result is a HOLLOW green
      // circle (green outline, not filled), not a neutral cancel (Edu).
      var hasHD = greens.indexOf('Heavenly Doctor') >= 0;
      var net = 'neutral';
      if (greens.length && !reds.length) net = 'green';
      else if (reds.length && !greens.length) net = 'red';
      else if (greens.length && reds.length) net = hasHD ? 'green_hollow' : 'cancel';
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

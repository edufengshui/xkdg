/* daliuren.js — 大六壬 chart engine (core v1).
 *
 * Builds, from a divination instant, the deterministic skeleton of a Da Liu Ren chart:
 *   1. 月將 (month general / sun's palace)  — from the current 中氣
 *   2. 天地盤 (heaven/earth plates)          — by 月將加時 (month general placed on the hour)
 *   3. 四課 (four lessons)                   — from day-stem 寄宮 and day-branch
 *   4. 三傳 (three transmissions)            — via 九宗門, all nine implemented (see below)
 *   5. 十二天將 (twelve heaven generals)     — Nobleman by day-stem + 晝/夜, then ordered
 *                                              clockwise/anti-clockwise around the heaven plate.
 *
 * INPUT CONVENTIONS (house rules, consistent with the rest of the app — confirm if wrong):
 *   - 占時 (divination hour branch) = the TST hour branch (from solar-time.js).
 *   - 月將 = the 中氣 current at 00:00 GMT of the TST chart-day (reuses jieqi-gmt.js rule).
 *   - 日干支 = the TST day pillar.
 *
 * STATUS of 三傳 (九宗門 / Nine Rituals) — all nine implemented:
 *   VALIDATED against reference charts : 賊剋 (元首/重審), 比用, 遙剋 (蒿矢/彈射), 返吟-with-克.
 *   RULE-COMPLETE, deterministic        : 昴星 (Hairy Head), 伏吟 (Hidden Hum), 返吟-no-克 (驛馬).
 *     Coded verbatim from the reference slides; no ambiguity, but not yet chart-confirmed.
 *   RULE-CODED, needsValidation:true    : 涉害 (depth-of-harm counting direction is school-
 *     dependent), 別責 (干合/三合 "in front" reading), 八專 ("count 3" inclusivity). One
 *     reference chart each will lock these.
 *
 * Pure data + functions; the instant→chart wrapper uses XKDGSolarTime / XKDGJieQiGMT if present.
 */
(function () {
  'use strict';

  var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var STEMS    = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  function bIdx(b) { return BRANCHES.indexOf(b); }
  function sIdx(s) { return STEMS.indexOf(s); }

  // 地支五行
  var BRANCH_WUXING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
  };
  // X 克 Y ?
  var KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  function controls(a, b) { return KE[a] === b; }              // wuxing a 克 wuxing b
  function branchControls(x, y) { return controls(BRANCH_WUXING[x], BRANCH_WUXING[y]); }

  // 天干寄宮 (stem parking palace)
  var STEM_JIGONG = {
    '甲': '寅', '乙': '辰', '丙': '巳', '丁': '未', '戊': '巳',
    '己': '未', '庚': '申', '辛': '戌', '壬': '亥', '癸': '丑'
  };
  // polarity: 陽 = even index, 陰 = odd index (both stems and branches)
  function stemYang(s) { return sIdx(s) % 2 === 0; }
  function branchYang(b) { return bIdx(b) % 2 === 0; }
  // 天干五行
  var STEM_WUXING = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  function stemWuXing(s) { return STEM_WUXING[sIdx(s)]; }
  // 驛馬 (post horse) by day-branch trine: 申子辰→寅, 寅午戌→申, 巳酉丑→亥, 亥卯未→巳
  function postHorse(dayBranch) {
    var i = bIdx(dayBranch) % 4; // 子辰申→0, 丑巳酉→1, 寅午戌→2, 卯未亥→3
    return ({ 0: '寅', 1: '亥', 2: '申', 3: '巳' })[i];
  }

  // 刑 (penalty) map — from the Penalties-of-Branches table.
  var XING = {
    '子': '卯', '卯': '子',                       // 無禮 (rude)
    '寅': '巳', '巳': '申', '申': '寅',           // 恃勢 (ungrateful)
    '丑': '戌', '戌': '未', '未': '丑',           // 無恩 (bullying)
    '辰': '辰', '午': '午', '酉': '酉', '亥': '亥' // 自刑 (self)
  };
  function isSelfXing(b) { return b === '辰' || b === '午' || b === '酉' || b === '亥'; }
  function chong(b) { return BRANCHES[(bIdx(b) + 6) % 12]; }   // 冲 (clash, 6 apart)

  // 干合 (stem combinations): 甲己 乙庚 丙辛 丁壬 戊癸
  var STEM_COMBINE = {
    '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛',
    '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊'
  };
  // 三合 (triangular combinations). trineNext = the member one step clockwise (+4).
  function trineNext(b) { return BRANCHES[(bIdx(b) + 4) % 12]; }
  // 孟 (corners) / 仲 (cardinals) / 季 (tombs) for 涉害 tie-breaks.
  function isMeng(b) { return '寅申巳亥'.indexOf(b) >= 0; }
  function isZhong(b) { return '子午卯酉'.indexOf(b) >= 0; }

  // 月將 by 中氣 (sun's palace). Keyed by the 中氣 (氣) name.
  var MONTH_GENERAL_BY_ZHONGQI = {
    '雨水': '亥', '春分': '戌', '谷雨': '酉', '小满': '申', '夏至': '未', '大暑': '午',
    '处暑': '巳', '秋分': '辰', '霜降': '卯', '小雪': '寅', '冬至': '丑', '大寒': '子'
  };
  // 月將 traditional names
  var MONTH_GENERAL_NAME = {
    '亥': '登明', '戌': '河魁', '酉': '從魁', '申': '傳送', '未': '小吉', '午': '勝光',
    '巳': '太乙', '辰': '天罡', '卯': '太衝', '寅': '功曹', '丑': '大吉', '子': '神后'
  };

  // ---- 天地盤: 月將加時 (place the month general on the hour branch) -----------
  // delta rotates the heaven plate so heaven[hourBranch] == monthGeneral.
  function buildPlates(monthGeneralBranch, hourBranch) {
    var mg = bIdx(monthGeneralBranch), hr = bIdx(hourBranch);
    var delta = ((mg - hr) % 12 + 12) % 12;
    var heaven = BRANCHES.map(function (_, e) { return BRANCHES[(e + delta) % 12]; });
    function heavenAbove(branch) { return BRANCHES[(bIdx(branch) + delta) % 12]; }
    function earthUnder(branch) { return BRANCHES[((bIdx(branch) - delta) % 12 + 12) % 12]; }
    return {
      delta: delta,
      heaven: heaven,                 // heaven[i] sits over earth branch BRANCHES[i]
      heavenAbove: heavenAbove,
      earthUnder: earthUnder,
      isFuYin: delta === 0,           // 伏吟  (月將==占時)
      isFanYin: delta === 6           // 返吟  (月將 冲 占時)
    };
  }

  // ---- 四課 -------------------------------------------------------------------
  function fourLessons(dayStem, dayBranch, plates) {
    var L = [];
    var b1 = STEM_JIGONG[dayStem];                 // 1課下 = 干寄宮
    var t1 = plates.heavenAbove(b1);               // 1課上
    L.push({ top: t1, bottom: b1, base: 'stem' });
    var t2 = plates.heavenAbove(t1);               // 2課: 下=1課上
    L.push({ top: t2, bottom: t1, base: 'stem' });
    var t3 = plates.heavenAbove(dayBranch);        // 3課下 = 日支
    L.push({ top: t3, bottom: dayBranch, base: 'branch' });
    var t4 = plates.heavenAbove(t3);               // 4課: 下=3課上
    L.push({ top: t4, bottom: t3, base: 'branch' });
    return L;
  }

  // ---- 三傳 (九宗門 / Nine Rituals) -------------------------------------------
  // Priority (from the reference slides):
  //   structural 伏吟(delta0) / 返吟(delta6) first; otherwise
  //   has-克 → 賊剋(元首/重審) → 比用 → 涉害;
  //   no-克  → 八專(struct) → 遙剋(蒿矢/彈射) → 別責(3-distinct) → 昴星.
  function threeTransmissions(lessons, dayStem, dayBranch, plates) {
    var ha = plates.heavenAbove, eu = plates.earthUnder;
    var jigong = STEM_JIGONG[dayStem];
    var dayYang = stemYang(dayStem);
    function chain(first) { var m = ha(first); return { chu: first, zhong: m, mo: ha(m) }; }

    var xiaKeShang = [], shangKeXia = [];
    lessons.forEach(function (L, i) {
      if (branchControls(L.bottom, L.top)) xiaKeShang.push(i); // 下克上 (賊 / Zei)
      if (branchControls(L.top, L.bottom)) shangKeXia.push(i); // 上克下 (克 / Ke)
    });
    var hasKe = xiaKeShang.length > 0 || shangKeXia.length > 0;

    // distinct-lesson structure for 八專 / 別責
    var distinct = []; lessons.forEach(function (L) {
      var k = L.top + L.bottom; if (distinct.indexOf(k) < 0) distinct.push(k);
    });
    var isBaZhuan = (jigong === dayBranch);        // 干寄宮==日支 → two pairs (八專)

    function biYong(idxs) {
      var want = dayYang;
      return idxs.filter(function (i) { return branchYang(lessons[i].top) === want; });
    }

    // 涉害深淺: harm depth = # earth cells that 克 the upper spirit on its way home (retrograde).
    function harmDepth(i) {
      var X = lessons[i].top, seat = lessons[i].bottom, home = bIdx(X), n = 0;
      var p = bIdx(seat);
      for (var step = 0; step < 12; step++) {
        if (p === home) break;
        if (branchControls(BRANCHES[p], X)) n++;
        p = (p + 11) % 12; // retrograde
      }
      return n;
    }

    function shfrom(set, methodName) {  // 賊剋 family + 比用 + 涉害
      if (set.length === 1) return ok(set[0], methodName);
      var bi = biYong(set);
      if (bi.length === 1) return ok(bi[0], '比用');
      // 涉害: deepest harm; tie → 孟 then 仲 (季 excluded); else last resort
      var pool = bi.length ? bi : set;
      var depths = pool.map(harmDepth), max = Math.max.apply(null, depths);
      var deep = pool.filter(function (i, k) { return depths[k] === max; });
      var chosen = null;
      if (deep.length === 1) chosen = deep[0];
      else {
        var meng = deep.filter(function (i) { return isMeng(lessons[i].bottom); });
        var zhong = deep.filter(function (i) { return isZhong(lessons[i].bottom); });
        if (meng.length === 1) chosen = meng[0];
        else if (meng.length === 0 && zhong.length === 1) chosen = zhong[0];
      }
      if (chosen !== null) return flag(chosen, '涉害');
      // last resort 涉害: yang→day-stem上神, yin→day-branch上神
      return flagThree('涉害', chain(dayYang ? ha(jigong) : ha(dayBranch)));
    }

    function ok(i, m) { return result(m, false, chain(lessons[i].top), null); }
    function flag(i, m) { return result(m, true, chain(lessons[i].top), null); }
    function flagThree(m, three) { return result(m, true, three, null); }
    function result(method, needsValidation, three, special) {
      return { method: method, needsValidation: needsValidation, special: special,
               three: three, xiaKeShang: xiaKeShang, shangKeXia: shangKeXia };
    }

    // penalty chain used by 伏吟: 2nd = 1st刑 (or secondIfSelf if 1st自刑); 3rd = 2nd刑 (or 2nd冲 if 2nd自刑)
    function penaltyChain(first, secondIfSelf) {
      var zhong = isSelfXing(first) ? secondIfSelf : XING[first];
      var mo = isSelfXing(zhong) ? chong(zhong) : XING[zhong];
      return { chu: first, zhong: zhong, mo: mo };
    }

    // ---------- structural: 伏吟 (Hidden Hum) ----------
    if (plates.isFuYin) {
      var first;
      if (hasKe) { var s = (xiaKeShang.length ? xiaKeShang : shangKeXia); first = lessons[s[0]].top; }
      else { first = dayYang ? ha(jigong) : dayBranch; }
      var secondIfSelf = dayYang ? dayBranch : jigong;  // yang→day branch, yin→day stem palace
      return result('伏吟', false, penaltyChain(first, secondIfSelf), '伏吟');
    }

    // ---------- structural: 返吟 (Clashing) ----------
    if (plates.isFanYin) {
      if (hasKe) {
        var r = shfrom(xiaKeShang.length ? xiaKeShang : shangKeXia,
                       xiaKeShang.length ? '重審' : '元首');
        r.method = '返吟·' + r.method; r.special = '返吟'; return r;
      }
      // no-克: 1st = Post Horse, 2nd = day-branch上神, 3rd = day-stem上神
      return result('返吟·驛馬', false,
        { chu: postHorse(dayBranch), zhong: ha(dayBranch), mo: ha(jigong) }, '返吟');
    }

    // ---------- has 克: 賊剋 / 比用 / 涉害 ----------
    if (hasKe) {
      return shfrom(xiaKeShang.length ? xiaKeShang : shangKeXia,
                    xiaKeShang.length ? '重審' : '元首');
    }

    // ---------- no 克 ----------
    // 八專 (Eight Specialty): structural, distant not counted
    if (isBaZhuan) {
      var base = ha(jigong);
      var chu = dayYang
        ? BRANCHES[(bIdx(base) + 2) % 12]          // yang: 3 clockwise (inclusive) from day-stem上神
        : BRANCHES[((bIdx(lessons[3].top) - 2) % 12 + 12) % 12]; // yin: 3 anti-clockwise from 4th上神
      return result('八專', true, { chu: chu, zhong: base, mo: base }, null);
    }

    // 遙剋 (Distant Control): 蒿矢(上神克日) else 彈射(日克上神)
    var dayWX = stemWuXing(dayStem), hao = [], tan = [];
    lessons.forEach(function (L, i) {
      var top = BRANCH_WUXING[L.top];
      if (controls(top, dayWX)) hao.push(i);
      if (controls(dayWX, top)) tan.push(i);
    });
    var yset = hao.length ? hao : tan, ynm = hao.length ? '遙剋·蒿矢' : '遙剋·彈射';
    if (yset.length) {
      var uq = []; yset.forEach(function (i) {
        if (!uq.some(function (j) { return lessons[j].top === lessons[i].top; })) uq.push(i);
      });
      if (uq.length === 1) return ok(uq[0], ynm);
      var bi2 = biYong(uq);
      if (bi2.length === 1) return ok(bi2[0], ynm + '·比用');
      return flag(uq[0], ynm);
    }

    // 別責 (Other Responsibility): 3 distinct lessons, no 克, no 遙剋
    if (distinct.length === 3) {
      var bzChu = dayYang
        ? ha(STEM_JIGONG[STEM_COMBINE[dayStem]])    // yang: 上神 above day-stem's 干合 partner palace
        : trineNext(dayBranch);                     // yin: branch in front of day branch in 三合
      var dz = ha(jigong);
      return result('別責', true, { chu: bzChu, zhong: dz, mo: dz }, null);
    }

    // 昴星 (Hairy Head): full 4 distinct, no 克, no 遙剋
    if (dayYang) {
      return result('昴星', false, { chu: ha('酉'), zhong: ha(dayBranch), mo: ha(jigong) }, null);
    }
    return result('昴星', false, { chu: eu('酉'), zhong: ha(jigong), mo: ha(dayBranch) }, null);
  }

  // ---- 六親 (Six Relations) & 旬空 (Hour Void) --------------------------------
  var SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }; // 生 generates
  // Relation of a branch to the day stem (day stem = "self").
  function sixRelation(dayStem, branch) {
    var d = stemWuXing(dayStem), e = BRANCH_WUXING[branch];
    if (e === d) return { cn: '兄弟', en: 'Brothers' };
    if (SHENG[d] === e) return { cn: '子孫', en: 'Children' };     // day generates branch (output)
    if (SHENG[e] === d) return { cn: '父母', en: 'Parents' };      // branch generates day (resource)
    if (KE[d] === e) return { cn: '妻財', en: 'Wealth' };          // day controls branch
    // branch controls day → 官 (opposite polarity) / 鬼 (same polarity)
    var samePolarity = (branchYang(branch) === stemYang(dayStem));
    return samePolarity ? { cn: '鬼', en: 'Ghost' } : { cn: '官', en: 'Officer' };
  }
  // 旬空 (void) of a pillar = the two branches with no stem in that pillar's 旬 (decade).
  function xunKong(stemIdx, branchIdx) {
    var head = ((branchIdx - stemIdx) % 12 + 12) % 12; // 旬-head branch index
    return [BRANCHES[(head + 10) % 12], BRANCHES[(head + 11) % 12]];
  }

  // ---- 12 天將 (Twelve Heaven Generals) --------------------------------------
  // Fixed order starting from 貴人 (Nobleman); the rest follow around the HEAVEN plate.
  var GENERALS = [
    { cn: '貴人', en: 'Nobleman' }, { cn: '螣蛇', en: 'Flying Snake' },
    { cn: '朱雀', en: 'Red Bird' }, { cn: '六合', en: 'Six Harmonies' },
    { cn: '勾陳', en: 'Polaris' }, { cn: '青龍', en: 'Green Dragon' },
    { cn: '天空', en: 'Empty Sky' }, { cn: '白虎', en: 'White Tiger' },
    { cn: '太常', en: 'Supreme Norm' }, { cn: '玄武', en: 'Black Warrior' },
    { cn: '太陰', en: 'Moon' }, { cn: '天后', en: 'Heaven Queen' }
  ];
  // 貴人 (Nobleman) branch by day stem — 晝 (Day) and 夜 (Night) noblemen.
  var NOBLEMAN_DAY   = { '甲': '未', '乙': '申', '丙': '酉', '丁': '亥', '戊': '丑',
                         '己': '子', '庚': '丑', '辛': '寅', '壬': '卯', '癸': '巳' };
  var NOBLEMAN_NIGHT = { '甲': '丑', '乙': '子', '丙': '亥', '丁': '酉', '戊': '未',
                         '己': '申', '庚': '未', '辛': '午', '壬': '巳', '癸': '卯' };
  // 占時 day/night split: hours 卯辰巳午未申 = 晝 (day); 酉戌亥子丑寅 = 夜 (night).
  function isDayDivination(hourBranch) { return '卯辰巳午未申'.indexOf(hourBranch) >= 0; }
  // direction: Nobleman's EARTH palace in 亥子丑寅卯辰 → clockwise; 巳午未申酉戌 → anti-clockwise.
  function generalDirection(earthPalace) { return '亥子丑寅卯辰'.indexOf(earthPalace) >= 0 ? 1 : -1; }

  function placeGenerals(dayStem, hourBranch, plates) {
    var isDay = isDayDivination(hourBranch);
    var nob = (isDay ? NOBLEMAN_DAY : NOBLEMAN_NIGHT)[dayStem];   // heaven-plate branch
    var earthPalace = plates.earthUnder(nob);                    // palace it "arrives at"
    var dir = generalDirection(earthPalace);
    var byHeaven = {};                                           // heaven branch → general
    for (var k = 0; k < 12; k++) {
      var hb = BRANCHES[((bIdx(nob) + dir * k) % 12 + 12) % 12];
      byHeaven[hb] = GENERALS[k];
    }
    return {
      nobleman: nob, isDay: isDay, dayNight: isDay ? '晝/Day' : '夜/Night',
      earthPalace: earthPalace, direction: dir > 0 ? '順/clockwise' : '逆/anti-clockwise',
      byHeavenBranch: byHeaven,
      generalOf: function (heavenBranch) { return byHeaven[heavenBranch]; }
    };
  }

  // ---- assemble a chart from explicit primitives (testable in isolation) ------
  function buildChartFromPrimitives(dayStem, dayBranch, hourBranch, monthGeneralBranch, hourStem) {
    var plates = buildPlates(monthGeneralBranch, hourBranch);
    var lessons = fourLessons(dayStem, dayBranch, plates);
    var trans = threeTransmissions(lessons, dayStem, dayBranch, plates);
    var generals = placeGenerals(dayStem, hourBranch, plates);

    // 旬空 (Hour Void): from the HOUR pillar's 旬 (requires the hour stem).
    var voidBranches = (hourStem != null)
      ? xunKong(sIdx(hourStem), bIdx(hourBranch)) : null;
    function isVoid(b) { return voidBranches ? (voidBranches.indexOf(b) >= 0) : null; }
    function decorate(branch) {
      return { branch: branch, general: generals.generalOf(branch),
               relation: sixRelation(dayStem, branch), isVoid: isVoid(branch) };
    }

    var withGen = lessons.map(function (L) {
      return { top: decorate(L.top), bottom: L.bottom, base: L.base,
               zei: branchControls(L.bottom, L.top), ke: branchControls(L.top, L.bottom) };
    });
    var threeWithGen = null;
    if (trans.three) {
      threeWithGen = { chu: decorate(trans.three.chu),
                       zhong: decorate(trans.three.zhong),
                       mo: decorate(trans.three.mo) };
    }
    var palaces = BRANCHES.map(function (e) {
      var hb = plates.heavenAbove(e);
      return { earth: e, heaven: hb, general: generals.generalOf(hb),
               relation: sixRelation(dayStem, hb), isVoid: isVoid(hb) };
    });
    return {
      dayStem: dayStem, dayBranch: dayBranch, hourBranch: hourBranch, hourStem: hourStem || null,
      monthGeneral: { branch: monthGeneralBranch, name: MONTH_GENERAL_NAME[monthGeneralBranch] },
      postHorse: postHorse(dayBranch),
      hourVoid: voidBranches,
      plates: { delta: plates.delta, heaven: plates.heaven, earth: BRANCHES.slice(),
                isFuYin: plates.isFuYin, isFanYin: plates.isFanYin },
      fourLessons: withGen,
      transmission: { method: trans.method, needsValidation: trans.needsValidation,
                      special: trans.special, three: trans.three, threeDetailed: threeWithGen,
                      xiaKeShang: trans.xiaKeShang, shangKeXia: trans.shangKeXia },
      generals: { nobleman: generals.nobleman, dayNight: generals.dayNight,
                  earthPalace: generals.earthPalace, direction: generals.direction,
                  palaces: palaces }
    };
  }

  // 五鼠遁 (Five-Rat method): hour stem from day stem + hour branch.
  // 子-hour stem: 甲己→甲, 乙庚→丙, 丙辛→戊, 丁壬→庚, 戊癸→壬; then advances with the branch.
  function hourStemFor(dayStem, hourBranch) {
    var s0 = ((sIdx(dayStem) % 5) * 2) % 10;
    return STEMS[(s0 + bIdx(hourBranch)) % 10];
  }

  // ---- Forex chart: 占時 comes from the daily seed branch, not the clock -------
  // Day pillar and 月將 are taken from the instant (00:00 GMT at the chosen longitude);
  // the hour branch is the seed 地支, and its stem is derived via 五鼠遁 so 旬空 works.
  function buildChartFromForexSeed(utcMs, lonDeg, seedBranch) {
    var ST = (typeof window !== 'undefined' ? window.XKDGSolarTime : null) ||
             (typeof require !== 'undefined' ? safeReq('./solar-time.js') : null);
    var JQ = (typeof window !== 'undefined' ? window.XKDGJieQiGMT : null) ||
             (typeof require !== 'undefined' ? safeReq('./jieqi-gmt.js') : null);
    if (!ST || !JQ) return { error: 'missing XKDGSolarTime or XKDGJieQiGMT' };

    var p = ST.pillarsFromUtc(utcMs, lonDeg);
    if (!p) return { error: 'pillars failed (lunar-javascript Solar missing?)' };
    var dayStem = p.day.charAt(0), dayBranch = p.day.charAt(1);
    var tst = p.meta.tst;

    var cur = JQ.currentJieQi(tst.y, tst.mo, tst.d);
    var zhongQi = nearestZhongQi(JQ, tst, cur);
    if (!zhongQi) return { error: 'could not resolve 中氣' };
    var mg = MONTH_GENERAL_BY_ZHONGQI[zhongQi];

    var hourStem = hourStemFor(dayStem, seedBranch);
    var chart = buildChartFromPrimitives(dayStem, dayBranch, seedBranch, mg, hourStem);
    chart.source = {
      mode: 'forex', dayPillar: p.day, hourPillar: hourStem + seedBranch,
      seedBranch: seedBranch, zhongQi: zhongQi, tst: tst, longitude: lonDeg
    };
    return chart;
  }

  // ---- wrapper from an absolute instant, using the other app modules ----------
  // utcMs + longitude → day pillar + hour branch (TST) via XKDGSolarTime,
  // 中氣 via XKDGJieQiGMT (00:00 GMT of the TST chart-day) → 月將 → chart.
  function buildChartFromInstant(utcMs, lonDeg) {
    var ST = (typeof window !== 'undefined' ? window.XKDGSolarTime : null) ||
             (typeof require !== 'undefined' ? safeReq('./solar-time.js') : null);
    var JQ = (typeof window !== 'undefined' ? window.XKDGJieQiGMT : null) ||
             (typeof require !== 'undefined' ? safeReq('./jieqi-gmt.js') : null);
    if (!ST || !JQ) return { error: 'missing XKDGSolarTime or XKDGJieQiGMT' };

    var p = ST.pillarsFromUtc(utcMs, lonDeg);
    if (!p) return { error: 'pillars failed (lunar-javascript Solar missing?)' };
    var dayStem = p.day.charAt(0), dayBranch = p.day.charAt(1);
    var hourBranch = p.hour.charAt(1);
    var tst = p.meta.tst;

    // current 中氣 = latest 气 entered; walk the 24-term current and step back to a 气.
    var cur = JQ.currentJieQi(tst.y, tst.mo, tst.d);
    var zhongQi = nearestZhongQi(JQ, tst, cur);
    if (!zhongQi) return { error: 'could not resolve 中氣' };
    var mg = MONTH_GENERAL_BY_ZHONGQI[zhongQi];

    var chart = buildChartFromPrimitives(dayStem, dayBranch, hourBranch, mg, p.hour.charAt(0));
    chart.source = { dayPillar: p.day, hourPillar: p.hour, zhongQi: zhongQi, tst: tst };
    return chart;
  }

  // find the 中氣 (氣) currently in effect: from the current term, if it is a 气 use it,
  // else it is a 节 — step to the table and take the latest entered 气.
  function nearestZhongQi(JQ, tst, cur) {
    var ZHONGQI = MONTH_GENERAL_BY_ZHONGQI;
    if (cur && ZHONGQI[cur.name] && cur.isJie === false) return cur.name;
    var table = JQ.jieQiTableForDay(tst.y, tst.mo, tst.d);
    var best = null;
    table.forEach(function (r) {
      if (!ZHONGQI[r.name]) return;          // only 气
      if (r.entered !== true) return;
      if (!best || r.instant.utcMs > best.instant.utcMs) best = r;
    });
    return best ? best.name : null;
  }

  function safeReq(p) { try { return require(p); } catch (e) { return null; } }

  var API = {
    BRANCHES: BRANCHES, STEMS: STEMS,
    STEM_JIGONG: STEM_JIGONG, BRANCH_WUXING: BRANCH_WUXING,
    MONTH_GENERAL_BY_ZHONGQI: MONTH_GENERAL_BY_ZHONGQI, MONTH_GENERAL_NAME: MONTH_GENERAL_NAME,
    GENERALS: GENERALS, NOBLEMAN_DAY: NOBLEMAN_DAY, NOBLEMAN_NIGHT: NOBLEMAN_NIGHT,
    XING: XING, STEM_COMBINE: STEM_COMBINE,
    buildPlates: buildPlates,
    fourLessons: fourLessons,
    threeTransmissions: threeTransmissions,
    placeGenerals: placeGenerals,
    sixRelation: sixRelation,
    xunKong: xunKong,
    postHorse: postHorse,
    hourStemFor: hourStemFor,
    buildChartFromPrimitives: buildChartFromPrimitives,
    buildChartFromInstant: buildChartFromInstant,
    buildChartFromForexSeed: buildChartFromForexSeed
  };
  if (typeof window !== 'undefined') window.XKDGDaLiuRen = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();

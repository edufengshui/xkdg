/* qimen-div-finder.js
 * DIVINATION chart finder. Scans future ROTATING (转盘) QMDJ hour charts and returns the
 * date/double-hours whose chart satisfies a set of expert-supplied conditions:
 *   - a STEM sits (on the Tien Pan: ti or the migrant ti2) in a given palace, or in ANY of
 *     a set of palaces (e.g. the querent stem may stay in Gen / Xun / Dui / Qian);
 *   - a DOOR sits in a given palace (e.g. Injury in Gen).
 * A chart matches only when ALL conditions hold simultaneously.
 *
 * Example (debt collection): Geng waits to be paid by Bing. Find a future chart where
 *   Bing in Li, Injury in Gen, and Geng in one of {Gen, Xun, Dui, Qian}.
 *
 * Uses QMDJWaterScanner.getRotatingHourChart (Tien Pan) — the divination chart in this app.
 */
(function () {
  'use strict';

  var DOOR_EN2KEY = { Open: 'Kai', Rest: 'Xiu', Birth: 'Sheng', Injury: 'Shang', Delusion: 'Du', View: 'JingS', Death: 'Si', Shocking: 'JingF' };
  // palace name / trigram → number
  var NAME2PAL = {
    SE: 4, S: 9, SW: 2, E: 3, C: 5, CENTER: 5, W: 7, NE: 8, N: 1, NW: 6,
    XUN: 4, LI: 9, KUN: 2, ZHEN: 3, DUI: 7, GEN: 8, KAN: 1, QIAN: 6
  };
  var PAL2NAME = { 1: 'N 坎 Kan', 2: 'SW 坤 Kun', 3: 'E 震 Zhen', 4: 'SE 巽 Xun', 5: 'Center', 6: 'NW 乾 Qian', 7: 'W 兌 Dui', 8: 'NE 艮 Gen', 9: 'S 離 Li' };
  var STEM_HAN = { Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊', Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸' };
  var H2P = { '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu', '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui' };
  var BR_H2P = { '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si', '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai' };
  // representative clock hour for each of the 12 double-hours (branch)
  var DH = [{ h: 0, br: 'Zi' }, { h: 2, br: 'Chou' }, { h: 4, br: 'Yin' }, { h: 6, br: 'Mao' }, { h: 8, br: 'Chen' }, { h: 10, br: 'Si' }, { h: 12, br: 'Wu' }, { h: 14, br: 'Wei' }, { h: 16, br: 'Shen' }, { h: 18, br: 'You' }, { h: 20, br: 'Xu' }, { h: 22, br: 'Hai' }];

  function G() { return (typeof window !== 'undefined') ? window : global; }
  function palNum(p) {
    if (typeof p === 'number') return p;
    var k = String(p).toUpperCase().trim();
    return NAME2PAL[k] || (parseInt(p, 10) || null);
  }
  function normStem(s) { return STEM_HAN[s] ? s : (H2P[s] || s); }

  // Does palace pd carry stem on the Tien Pan (ti or migrant ti2)?
  function stemInPalace(pd, stem) { return !!pd && (pd.ti === stem || pd.ti2 === stem); }
  function doorInPalace(pd, doorEN) {
    if (!pd) return false;
    var key = DOOR_EN2KEY[doorEN] || doorEN;
    return pd.door === key || pd.doorName === doorEN || pd.door === doorEN;
  }

  // conditions: { stems:[{stem, palaces:[...]}], doors:[{door, palace}] }
  function chartMatches(chart, conds) {
    if (!chart || !chart.palaces) return null;
    var where = {};
    var ok = (conds.stems || []).every(function (c) {
      var stem = normStem(c.stem);
      var pals = (c.palaces || (c.palace != null ? [c.palace] : [])).map(palNum).filter(Boolean);
      var hit = pals.filter(function (p) { return stemInPalace(chart.palaces[p], stem); });
      if (!hit.length) return false;
      where['stem:' + stem] = hit.map(function (p) { return PAL2NAME[p]; });
      return true;
    }) && (conds.doors || []).every(function (c) {
      var p = palNum(c.palace);
      if (!doorInPalace(chart.palaces[p], c.door)) return false;
      where['door:' + c.door] = PAL2NAME[p];
      return true;
    });
    return ok ? where : null;
  }

  // Scan forward. opts: { startDate:'YYYY-MM-DD', days, maxResults, dayHours(optional subset of branches) }
  function scan(conds, opts) {
    opts = opts || {};
    var S = G().Solar || (G().Lunar && G().Lunar.Solar);
    if (!S) return { ok: false, error: 'Lunar library not available.' };
    if (typeof QMDJWaterScanner === 'undefined' || typeof QMDJWaterScanner.getRotatingHourChart !== 'function')
      return { ok: false, error: 'Rotating chart engine not available.' };
    var days = Math.min(opts.days || 60, 400);
    var maxResults = opts.maxResults || 40;
    var start = opts.startDate ? opts.startDate.split('-').map(Number) : (function () { var d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; })();
    var base = new Date(start[0], start[1] - 1, start[2]);
    var matches = [];
    var _lt = (typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.currentLonTz() : null;
    var _useTST = _lt && isFinite(_lt.lonDeg) && typeof XKDGSolarTime.hourPillarFromCivil === 'function';
    // House rule (Edu): EVERYTHING is decided in True Solar Time. Without longitude (no GPS) TST
    // cannot be computed, so we BLOCK and warn rather than silently fall back to civil time.
    if (!_useTST) {
      return { ok: false, error: 'Location (longitude) is missing — True Solar Time cannot be computed, so the scan is not run (civil time is never used). Set your GPS / longitude first.' };
    }
    for (var day = 0; day < days && matches.length < maxResults; day++) {
      var d = new Date(base.getTime() + day * 86400000);
      var Y = d.getFullYear(), M = d.getMonth() + 1, D = d.getDate();
      for (var i = 0; i < DH.length && matches.length < maxResults; i++) {
        var rep = DH[i];
        var hGan, hZhi, qmY, qmM, qmD;
        try {
          // Hour pillar in TST; the engine reads day / Jú / 元 / Jie Qi from the date it is given,
          // so we pass the TRUE SOLAR TIME calendar date (hp.tst), not the civil day — near TST
          // midnight the two differ and the civil date would select the wrong Jú.
          var hp = XKDGSolarTime.hourPillarFromCivil(Y, M, D, rep.h, 30, 0, _lt.lonDeg, _lt.tzOffsetMin);
          if (!hp || !hp.tst) continue;
          hGan = H2P[hp.gan] || hp.gan; hZhi = BR_H2P[hp.zhi] || hp.zhi;
          qmY = hp.tst.y; qmM = hp.tst.mo; qmD = hp.tst.d;
        } catch (e) { continue; }
        var chart;
        try { chart = QMDJWaterScanner.getRotatingHourChart(qmY, qmM, qmD, hGan, hZhi); } catch (e) { continue; }
        var where = chartMatches(chart, conds);
        if (where) {
          // Focus palace = the door's palace (the scene of the action); else the
          // first matched stem's palace. Score THAT palace on this ROTATING chart
          // with the app's canonical rotating scorer (never the flying chart).
          var focusPal = null;
          if (conds.doors && conds.doors.length) focusPal = palNum(conds.doors[0].palace);
          if (!focusPal && conds.stems && conds.stems.length) {
            var c0 = conds.stems[0];
            var pals0 = (c0.palaces || (c0.palace != null ? [c0.palace] : [])).map(palNum).filter(Boolean);
            var s0 = normStem(c0.stem);
            for (var pi = 0; pi < pals0.length; pi++) { if (stemInPalace(chart.palaces[pals0[pi]], s0)) { focusPal = pals0[pi]; break; } }
          }
          var sc = null;
          try {
            if (focusPal && G().TravelPlanner && typeof G().TravelPlanner.scoreRotatingPalace === 'function')
              sc = G().TravelPlanner.scoreRotatingPalace(chart, focusPal);
          } catch (e) {}
          matches.push({
            date: Y + '-' + String(M).padStart(2, '0') + '-' + String(D).padStart(2, '0'),
            qmDate: qmY + '-' + String(qmM).padStart(2, '0') + '-' + String(qmD).padStart(2, '0'),
            hour: rep.h, branch: hZhi, hourStem: hGan,
            label: STEM_HAN[hGan] + BR_BRANCH_HAN(hZhi),
            where: where,
            score: sc ? sc.score : null,
            scoreOk: sc ? !!sc.ok : null,
            scorePalace: focusPal ? PAL2NAME[focusPal] : null,
            profile: sc ? {
              sanQi: !!sc.hasSanQi, commander: !!sc.zhiFu, zhiShi: !!sc.zhiShi,
              deity: sc.deity || null, door: sc.door || null, configs: sc.configs || []
            } : null
          });
        }
      }
    }
    matches.sort(function (a, b) {
      var sa = (a.score == null) ? -Infinity : a.score, sb = (b.score == null) ? -Infinity : b.score;
      if (sb !== sa) return sb - sa;                       // best rotating score first
      return (a.date < b.date) ? -1 : (a.date > b.date ? 1 : 0);   // then soonest
    });
    return { ok: true, count: matches.length, truncated: matches.length >= maxResults, matches: matches };
  }
  var BR_P2H = { Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯', Chen: '辰', Si: '巳', Wu: '午', Wei: '未', Shen: '申', You: '酉', Xu: '戌', Hai: '亥' };
  function BR_BRANCH_HAN(p) { return BR_P2H[p] || p; }

  var API = { scan: scan, chartMatches: chartMatches, _maps: { DOOR_EN2KEY: DOOR_EN2KEY, NAME2PAL: NAME2PAL, PAL2NAME: PAL2NAME } };
  if (typeof window !== 'undefined') window.QimenDivFinder = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();

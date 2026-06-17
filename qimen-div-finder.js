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
    for (var day = 0; day < days && matches.length < maxResults; day++) {
      var d = new Date(base.getTime() + day * 86400000);
      var Y = d.getFullYear(), M = d.getMonth() + 1, D = d.getDate();
      for (var i = 0; i < DH.length && matches.length < maxResults; i++) {
        var rep = DH[i];
        var ec, hGan, hZhi;
        try {
          ec = S.fromYmdHms(Y, M, D, rep.h, 30, 0).getLunar().getEightChar();
          hGan = H2P[ec.getTimeGan()] || ec.getTimeGan();
          hZhi = BR_H2P[ec.getTimeZhi()] || ec.getTimeZhi();
        } catch (e) { continue; }
        var chart;
        try { chart = QMDJWaterScanner.getRotatingHourChart(Y, M, D, hGan, hZhi); } catch (e) { continue; }
        var where = chartMatches(chart, conds);
        if (where) {
          matches.push({
            date: Y + '-' + String(M).padStart(2, '0') + '-' + String(D).padStart(2, '0'),
            hour: rep.h, branch: hZhi, hourStem: hGan,
            label: STEM_HAN[hGan] + BR_BRANCH_HAN(hZhi),
            where: where
          });
        }
      }
    }
    return { ok: true, count: matches.length, truncated: matches.length >= maxResults, matches: matches };
  }
  var BR_P2H = { Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯', Chen: '辰', Si: '巳', Wu: '午', Wei: '未', Shen: '申', You: '酉', Xu: '戌', Hai: '亥' };
  function BR_BRANCH_HAN(p) { return BR_P2H[p] || p; }

  var API = { scan: scan, chartMatches: chartMatches, _maps: { DOOR_EN2KEY: DOOR_EN2KEY, NAME2PAL: NAME2PAL, PAL2NAME: PAL2NAME } };
  if (typeof window !== 'undefined') window.QimenDivFinder = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();

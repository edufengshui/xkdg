/* solar-time.js — Central TRUE SOLAR TIME (真太阳时) engine.
 *
 * House rule (Edu): every date/time used anywhere must be the LOCAL TRUE SOLAR TIME of the
 * place, never Beijing time and never raw civil clock time. TST = UTC + longitude·4min/deg
 * + Equation of Time. Longitude comes from the current GPS position.
 *
 * Pillar model (confirmed):
 *   - YEAR / MONTH pillars: decided by absolute instant vs the jieqi (立春 / 节). Comparing
 *     absolute instants is equivalent to comparing TST values (the longitude + EoT offset is
 *     common to event and term and cancels at the boundary). Implemented by feeding the
 *     Beijing-naive instant (UTC+8) to lunar-javascript, whose jieqi are Beijing-based.
 *   - DAY pillar: rolls at TST midnight (00:00). Implemented from the TST calendar date.
 *   - HOUR pillar: branch from the TST clock (子 = 23:00–01:00 …); stem via 五鼠遁 from the day stem.
 *
 * Depends on lunar-javascript (window.Solar / window.Lunar).
 */
(function () {
  'use strict';
  function G() { return (typeof window !== 'undefined') ? window : global; }
  function S() { var g = G(); return g.Solar || (g.Lunar && g.Lunar.Solar); }

  var STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  // Equation of Time (minutes), NOAA approximation (~0.1 min accuracy).
  function equationOfTimeMinutes(utcDate) {
    var start = Date.UTC(utcDate.getUTCFullYear(), 0, 1);
    var doy = Math.floor((utcDate.getTime() - start) / 86400000); // 0-based day of year
    var hourUTC = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600;
    var g = 2 * Math.PI / 365 * (doy + (hourUTC - 12) / 24);
    return 229.18 * (0.000075
      + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  }

  // Build the UTC instant (ms) from a local civil wall-clock + that zone's offset.
  // tzOffsetMin = (UTC - local) in minutes, i.e. JS Date.getTimezoneOffset() (negative east of UTC).
  function utcFromCivil(y, mo, d, h, mi, s, tzOffsetMin) {
    var localAsUtc = Date.UTC(y, mo - 1, d, h, mi || 0, s || 0);
    return localAsUtc + (tzOffsetMin || 0) * 60000;
  }

  // Core conversion. Returns the absolute instant plus the naive TST and Beijing clocks.
  function convert(utcMs, lonDeg) {
    var u = new Date(utcMs);
    var eot = equationOfTimeMinutes(u);
    var tstMs = utcMs + (lonDeg * 4 + eot) * 60000;   // 4 min per degree east + EoT
    var bjMs = utcMs + 8 * 60 * 60000;                // Beijing = UTC+8 (for jieqi comparison)
    var t = new Date(tstMs), b = new Date(bjMs);
    return {
      utcMs: utcMs, lonDeg: lonDeg, eotMinutes: eot,
      tst: { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() },
      beijing: { y: b.getUTCFullYear(), mo: b.getUTCMonth() + 1, d: b.getUTCDate(), h: b.getUTCHours(), mi: b.getUTCMinutes(), s: b.getUTCSeconds() }
    };
  }

  // 时辰 branch index from a TST clock hour (子 spans 23:00–01:00).
  function hourBranchIndex(h) { return Math.floor(((h + 1) % 24) / 2); }
  // 五鼠遁: hour stem index from day stem index + hour branch index.
  function hourStemIndex(dayStemIdx, hourBrIdx) { return (dayStemIdx * 2 + hourBrIdx) % 10; }

  // Full four pillars per the confirmed model.
  function pillarsFromUtc(utcMs, lonDeg) {
    var Solar = S();
    if (!Solar) return null;
    var c = convert(utcMs, lonDeg);

    // YEAR + MONTH: Beijing-naive instant → lunar-javascript EightChar (jieqi are Beijing-based).
    var bj = c.beijing;
    var ecB = Solar.fromYmdHms(bj.y, bj.mo, bj.d, bj.h, bj.mi, bj.s).getLunar().getEightChar();
    var yearGZ = ecB.getYear();   // e.g. "丙午"
    var monthGZ = ecB.getMonth();

    // DAY: TST calendar date (midnight boundary) → day pillar read at local noon to avoid edges.
    var tst = c.tst;
    var dayGZ = Solar.fromYmdHms(tst.y, tst.mo, tst.d, 12, 0, 0).getLunar().getDayInGanZhi();
    var dayStemIdx = STEMS.indexOf(dayGZ.charAt(0));

    // HOUR: branch from TST clock; stem via 五鼠遁 from the day stem.
    // Late 子 (TST 23:00–24:00): the 子 hour opens the NEXT day's hour cycle, so its
    // stem comes from the next day's stem — after 癸亥 (亥 hour) comes 甲子 (子 hour),
    // keeping the 60-cycle continuous. The DAY pillar still rolls at TST midnight, so
    // it stays the current day (e.g. 癸亥 day with a 甲子 late-子 hour).
    var hourDayStemIdx = dayStemIdx;
    if (tst.h === 23) {
      var nd = new Date(Date.UTC(tst.y, tst.mo - 1, tst.d, 12, 0, 0) + 24 * 3600000);
      var nextDayGZ = Solar.fromYmdHms(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate(), 12, 0, 0).getLunar().getDayInGanZhi();
      var ndIdx = STEMS.indexOf(nextDayGZ.charAt(0));
      if (ndIdx >= 0) hourDayStemIdx = ndIdx;
    }
    var hbi = hourBranchIndex(tst.h);
    var hsi = hourStemIndex(hourDayStemIdx, hbi);
    var hourGZ = STEMS[hsi] + BRANCHES[hbi];

    return {
      year: yearGZ, month: monthGZ, day: dayGZ, hour: hourGZ,
      meta: { tst: tst, beijing: bj, eotMinutes: c.eotMinutes, lonDeg: lonDeg, utcMs: utcMs }
    };
  }

  function pillarsFromCivil(y, mo, d, h, mi, s, lonDeg, tzOffsetMin) {
    return pillarsFromUtc(utcFromCivil(y, mo, d, h, mi, s, tzOffsetMin), lonDeg);
  }

  // Just the HOUR pillar {gan, zhi} in true solar time — for QMDJ hour charts / scanners
  // that previously did Solar.fromYmdHms(civil)…getTimeGan()/getTimeZhi() on civil time.
  function hourPillarFromCivil(y, mo, d, h, mi, s, lonDeg, tzOffsetMin) {
    var p = pillarsFromCivil(y, mo, d, h, mi, s, lonDeg, tzOffsetMin);
    return p ? { gan: p.hour.charAt(0), zhi: p.hour.charAt(1), tst: p.meta.tst } : null;
  }

  // Read the current GPS longitude + civil UTC offset (incl. DST) from the app inputs,
  // so every call site is a one-liner. Falls back to localStorage GPS for longitude.
  function currentLonTz() {
    var lon = NaN, utcH = 0, dstOn = false;
    try { lon = parseFloat(document.getElementById('longitude').value); } catch (e) {}
    if (!isFinite(lon)) { try { lon = JSON.parse(localStorage.getItem('xkdg_gps') || '{}').lng; } catch (e) {} }
    try { utcH = parseFloat(document.getElementById('utc-offset').value) || 0; } catch (e) {}
    try { dstOn = (typeof _dstOn !== 'undefined') ? _dstOn : !!(typeof window !== 'undefined' && window._dstOn); } catch (e) {}
    return { lonDeg: lon, tzOffsetMin: -(utcH * 60 + (dstOn ? 60 : 0)) };
  }

  // Inverse of pillarsFromCivil's TST step: given a TST clock time on a date, return the
  // civil WALL-CLOCK {y,mo,d,h,mi} that produces it (used to open a scan row back into Main).
  function wallClockFromTST(y, mo, d, h, mi, lonDeg, tzOffsetMin) {
    var tstMs = Date.UTC(y, mo - 1, d, h, mi || 0, 0);
    var eot = equationOfTimeMinutes(new Date(tstMs - lonDeg * 4 * 60000)); // EoT at ~UTC of that moment
    var utcMs = tstMs - (lonDeg * 4 + eot) * 60000;
    var w = new Date(utcMs - (tzOffsetMin || 0) * 60000);
    return { y: w.getUTCFullYear(), mo: w.getUTCMonth() + 1, d: w.getUTCDate(), h: w.getUTCHours(), mi: w.getUTCMinutes() };
  }

  // Convert a Beijing-time solar-term instant (as lunar-javascript reports it) to local TST clock.
  // Pass the term's Beijing Y/M/D H:M:S; returns the {y,mo,d,h,mi,s} in local TST.
  function beijingTermToTST(by, bmo, bd, bh, bmi, bs, lonDeg) {
    var utcMs = Date.UTC(by, bmo - 1, bd, bh, bmi || 0, bs || 0) - 8 * 60 * 60000;
    return convert(utcMs, lonDeg).tst;
  }

  var API = {
    equationOfTimeMinutes: equationOfTimeMinutes,
    utcFromCivil: utcFromCivil,
    convert: convert,
    pillarsFromUtc: pillarsFromUtc,
    pillarsFromCivil: pillarsFromCivil,
    hourPillarFromCivil: hourPillarFromCivil,
    currentLonTz: currentLonTz,
    beijingTermToTST: beijingTermToTST,
    wallClockFromTST: wallClockFromTST,
    hourBranchIndex: hourBranchIndex, hourStemIndex: hourStemIndex,
    STEMS: STEMS, BRANCHES: BRANCHES
  };
  if (typeof window !== 'undefined') window.XKDGSolarTime = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();

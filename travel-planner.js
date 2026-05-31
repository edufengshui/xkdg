/* ============================================================================
 * travel-planner.js — XKDG Travel Direction Planner (engine v1)
 * ----------------------------------------------------------------------------
 * Plans a road trip as a chain of "legs" separated by >=20 min reset stops.
 *
 * Metaphysical model (confirmed with user):
 *   - The directional influence locks ONLY when you set off from a standstill
 *     (departure, or restart after a >=20 min stop). While driving, hour
 *     changes are ignored. So only the DECISION MOMENTS matter.
 *   - A direction is "good to set off toward" (minimum positive condition,
 *     evaluated on the ROTATING Pan only — no Flying Stars / Flying Pan):
 *         * one of the San Qi on the Heaven plate  (ti in Yi / Bing / Ding)
 *         * a favourable Door                       (Kai / Xiu / Sheng)
 *         * NO internal Tian-Di stem clash          (STEM_CLASHES[ti] !== di)
 *         * NO Warrior (玄武) and NO Tiger (白虎)     (deity not in those two)
 *
 * Solar time: same convention as the rest of the app
 *   offsetMin = (lon - utc*15)*4 - (DST?60:0);  solarDate = wallClock + offsetMin
 * but the longitude is INTERPOLATED along the route (Vienna -> Rome), so the
 * double-hour (時辰) boundaries shift west as you drive, exactly as in reality.
 *
 * Depends on: lunar-javascript (global `Solar`) and QMDJWaterScanner
 * (getRotatingHourChart). Load this script AFTER app-fengshui.js.
 * ==========================================================================*/
(function () {
  'use strict';

  /* ---- CONFIG you may want to tweak --------------------------------------
   * FIXED (immovable) condition for a direction = San Qi on Heaven plate
   * AND a favourable Door. Everything else only raises/lowers the SCORE.
   *
   * Favourable doors now include View 景 (JingS) alongside the three
   * auspicious gates 三吉門 (Open 開 / Rest 休 / Birth 生).
   * ----------------------------------------------------------------------- */
  var TP_FAV_DOORS = ['Kai', 'Xiu', 'Sheng', 'JingS'];

  // San Qi 三奇 on the Heaven plate (Tian Pan)
  var TP_SAN_QI = ['Yi', 'Bing', 'Ding'];

  // Tian-Di stem clashes 天干相沖 (mirror of scanner's STEM_CLASHES)
  var TP_STEM_CLASHES = {
    Jia: 'Geng', Geng: 'Jia', Yi: 'Xin', Xin: 'Yi',
    Bing: 'Ren', Ren: 'Bing', Ding: 'Gui', Gui: 'Ding'
  };

  // ---- SWITCHES (defaults — confirm with user) ----------------------------
  // Tiger 白虎 is now ACCEPTABLE (no longer rejected).
  // Warrior 玄武: default = still excluded. Set to false to make it acceptable.
  var TP_EXCLUDE_WARRIOR = true;
  // Internal Tian-Di clash: 'exclude' = hard reject, 'penalty' = lower score,
  // 'ignore' = no effect. Default = soft penalty (since the FIXED condition is
  // now only San Qi + favourable door).
  var TP_CLASH_MODE = 'penalty';
  var TP_CLASH_PENALTY = -1;

  // Score bonuses (auspicious extras above the minimum)
  var TP_BONUS_ZHIFU = 1;   // 直符 Zhi Fu at the palace
  var TP_BONUS_ZHISHI = 1;  // 直使 Zhi Shi at the palace
  var TP_BONUS_CONFIG = 1;  // each named auspicious config (Dun/Pretense/Borrow)

  // ---- HOUR positivity + synergy (from the app's BEST score, via cache) ----
  // An hour counts as "positive" when its native app score is >= this:
  var TP_HOUR_THRESHOLD = 8;
  // Synergy bonus when a positive hour coincides with a gated direction:
  var TP_SYNERGY_ENDS = 8;  // at departure and at arrival
  var TP_SYNERGY_MID = 3;   // at intermediate legs

  // Local civil clock hour -> hour branch (han). Matches BEST, where the hour
  // branch follows the LOCAL clock (the day pillar is solar-corrected, the hour
  // branch is not). Used only to look up the cached hour score by the app's key.
  var TP_CIVIL_BRANCH = {
    23: '子', 0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅', 5: '卯', 6: '卯',
    7: '辰', 8: '辰', 9: '巳', 10: '巳', 11: '午', 12: '午', 13: '未', 14: '未',
    15: '申', 16: '申', 17: '酉', 18: '酉', 19: '戌', 20: '戌', 21: '亥', 22: '亥'
  };
  function tpLocalISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Look up the cached hour score for a wall-clock moment (civil branch + civil day)
  function tpHourScoreAt(wallDate) {
    var cache = (typeof window !== 'undefined') ? window._tpHourCache : null;
    if (!cache) return null;
    var br = TP_CIVIL_BRANCH[wallDate.getHours()];
    var rec = cache[tpLocalISO(wallDate) + '#' + br];
    return rec ? rec.score : null;
  }

  // Palace <-> 8 directions (palace 5 = centre, skipped)
  var TP_PALACE_DIR = { 1: 'N', 2: 'SW', 3: 'E', 4: 'SE', 6: 'NW', 7: 'W', 8: 'NE', 9: 'S' };
  var TP_DIR_TO_PALACE = { N: 1, NE: 8, E: 3, SE: 4, S: 9, SW: 2, W: 7, NW: 6 };
  var TP_DIR_ORDER = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  var TP_DIR_DEG = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

  // Han -> pinyin for display
  var STEM_PY = { '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu', '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui' };
  var BR_PY = { '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si', '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai' };
  var WD_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  // Default endpoints
  var TP_DEFAULT = {
    origin: { name: 'Vienna', lat: 48.2082, lon: 16.3738 },
    dest: { name: 'Roma', lat: 41.9028, lon: 12.4964 }
  };

  /* ---- solar-time offset (minutes), matching app convention -------------- */
  function tpOffsetMin(lon, utc, dstOn) {
    return (lon - utc * 15) * 4 - (dstOn ? 60 : 0);
  }

  /* ---- initial great-circle bearing origin -> dest (degrees 0..360) ------ */
  function tpBearing(lat1, lon1, lat2, lon2) {
    var toR = Math.PI / 180;
    var p1 = lat1 * toR, p2 = lat2 * toR, dl = (lon2 - lon1) * toR;
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    var b = Math.atan2(y, x) / toR;
    return (b + 360) % 360;
  }
  function tpSnapDir(deg) {
    var best = 'N', bestD = 999;
    for (var i = 0; i < TP_DIR_ORDER.length; i++) {
      var d = TP_DIR_ORDER[i];
      var diff = Math.abs(((TP_DIR_DEG[d] - deg + 540) % 360) - 180);
      if (diff < bestD) { bestD = diff; best = d; }
    }
    return best;
  }
  function tpAngDiff(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }

  /* ---- evaluate one rotating-chart palace ---------------------------------
   * Returns { ok, score, ... } where:
   *   ok    = meets the FIXED condition (San Qi + favourable door) and is not
   *           excluded by a switch (Warrior, or clash in 'exclude' mode).
   *   score = auspicious extras above the minimum (Zhi Fu / Zhi Shi / named
   *           configs) minus the clash penalty (in 'penalty' mode).
   * `configCount` is the number of named auspicious configs at this palace
   * (computed by the caller via QMDJWaterScanner.checkRotatingPalace).
   * ----------------------------------------------------------------------- */
  function tpPalaceOK(pd, configCount) {
    if (!pd) return null;
    var ti = pd.ti, di = pd.di, door = pd.door, deity = pd.deity;
    configCount = configCount || 0;

    var hasSanQi = TP_SAN_QI.indexOf(ti) !== -1;
    var favDoor = TP_FAV_DOORS.indexOf(door) !== -1;
    var clash = (TP_STEM_CLASHES[ti] === di);
    var isWarrior = (deity === 'Warrior');
    var isTiger = (deity === 'Tiger'); // now acceptable — reported only

    // FIXED condition
    var gate = hasSanQi && favDoor;

    // Exclusions (switches)
    var excluded = false;
    if (TP_EXCLUDE_WARRIOR && isWarrior) excluded = true;
    if (TP_CLASH_MODE === 'exclude' && clash) excluded = true;

    var ok = gate && !excluded;

    // Score (only meaningful when ok)
    var score = 0;
    if (pd.zhiFu) score += TP_BONUS_ZHIFU;
    if (pd.zhiShi) score += TP_BONUS_ZHISHI;
    score += configCount * TP_BONUS_CONFIG;
    if (TP_CLASH_MODE === 'penalty' && clash) score += TP_CLASH_PENALTY;

    return {
      ok: ok, score: score,
      hasSanQi: hasSanQi, favDoor: favDoor, clash: clash,
      isWarrior: isWarrior, isTiger: isTiger,
      zhiFu: !!pd.zhiFu, zhiShi: !!pd.zhiShi, configCount: configCount,
      ti: ti, di: di, door: door, deity: deity
    };
  }

  /* ---- scan all 8 directions for one rotating chart ---------------------- */
  function tpScanDirs(Y, M, D, hGanHan, hZhiHan, bearing) {
    var out = [];
    if (typeof QMDJWaterScanner === 'undefined' ||
        typeof QMDJWaterScanner.getRotatingHourChart !== 'function') return out;
    var chart = QMDJWaterScanner.getRotatingHourChart(Y, M, D, hGanHan, hZhiHan);
    if (!chart || !chart.palaces) return out;
    for (var i = 0; i < TP_DIR_ORDER.length; i++) {
      var dir = TP_DIR_ORDER[i];
      var pal = TP_DIR_TO_PALACE[dir];
      // named auspicious configs at this palace (Dun / Pretense / Borrow)
      var configs = (typeof QMDJWaterScanner.checkRotatingPalace === 'function')
        ? (QMDJWaterScanner.checkRotatingPalace(chart, pal) || []) : [];
      var ev = tpPalaceOK(chart.palaces[pal], configs.length);
      if (ev) ev.configs = configs.map(function (c) { return c.label; });
      var toward = (bearing != null) ? (tpAngDiff(TP_DIR_DEG[dir], bearing) <= 67.5) : false;
      out.push({ dir: dir, palace: pal, eval: ev, towardDest: toward });
    }
    return out;
  }

  /* ---- CORE: build the trip timeline ------------------------------------- *
   * opts = {
   *   depDate  : Date  (wall-clock departure),
   *   durationH: Number (hours, >= ),
   *   origin   : {lat, lon}, dest: {lat, lon},
   *   utc      : Number (base UTC offset, e.g. 1 for CET),
   *   dstOn    : Boolean,
   *   stepMin  : Number (sampling step, default 5)
   * }
   * returns { bearing, snapDir, slots:[ {
   *   wallStart, wallEnd (Date), tstStart, tstEnd ('HH:MM'),
   *   lonUsed, brHan, brPy, gZhiHan ('乙卯'), gZhiPy ('Yi Mao'),
   *   weekday, dirs:[ {dir, palace, eval, towardDest} ]
   * } ] }
   * ----------------------------------------------------------------------- */
  function tpPlan(opts) {
    opts = opts || {};
    var dep = opts.depDate;
    var durH = opts.durationH || 12;
    var O = opts.origin || TP_DEFAULT.origin;
    var Dst = opts.dest || TP_DEFAULT.dest;
    var utc = (opts.utc != null) ? opts.utc : 1;
    var dstOn = !!opts.dstOn;
    var step = (opts.stepMin || 5) * 60000;

    if (!dep || isNaN(dep.getTime())) throw new Error('Invalid departure date');
    if (typeof Solar === 'undefined') throw new Error('lunar-javascript (Solar) not loaded');

    var bearing = tpBearing(O.lat, O.lon, Dst.lat, Dst.lon);
    var snapDir = tpSnapDir(bearing);

    var startMs = dep.getTime();
    var endMs = startMs + durH * 3600000;
    var spanMs = Math.max(endMs - startMs, 1);

    function lonAt(ms) {
      var f = (ms - startMs) / spanMs;
      if (f < 0) f = 0; if (f > 1) f = 1;
      return O.lon + (Dst.lon - O.lon) * f;
    }
    function solarAt(ms) {
      var lon = lonAt(ms);
      var off = tpOffsetMin(lon, utc, dstOn);
      return { lon: lon, date: new Date(ms + off * 60000) };
    }
    function fmtHM(d) {
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    var slots = [];
    var cur = null;
    for (var ms = startMs; ms <= endMs; ms += step) {
      var s = solarAt(ms);
      var ec = Solar.fromDate(s.date).getLunar().getEightChar();
      var brHan = ec.getTimeZhi();
      if (!cur || cur.brHan !== brHan) {
        // close previous
        if (cur) {
          cur.wallEnd = new Date(ms);
          cur.tstEnd = fmtHM(s.date); // boundary in TST
          slots.push(cur);
        }
        // open new slot — lock evaluation at this restart moment
        var gHan = ec.getTimeGan();
        cur = {
          wallStart: new Date(ms),
          wallEnd: null,
          tstStart: fmtHM(s.date),
          tstEnd: null,
          lonUsed: s.lon,
          brHan: brHan,
          brPy: BR_PY[brHan] || brHan,
          gZhiHan: gHan + brHan,
          gZhiPy: (STEM_PY[gHan] || gHan) + ' ' + (BR_PY[brHan] || brHan),
          weekday: WD_IT[s.date.getDay()],
          dirs: tpScanDirs(s.date.getFullYear(), s.date.getMonth() + 1, s.date.getDate(),
                           gHan, brHan, bearing)
        };
      }
    }
    if (cur) {
      cur.wallEnd = new Date(endMs);
      var sEnd = solarAt(endMs);
      cur.tstEnd = fmtHM(sEnd.date);
      slots.push(cur);
    }

    // ---- Hour positivity + synergy + combined score per direction ----------
    var anyHour = false;
    slots.forEach(function (slot, idx) {
      var isDep = (idx === 0);
      var isArr = (idx === slots.length - 1);
      slot.legType = isDep ? 'Partenza' : (isArr ? 'Arrivo' : 'Tappa');
      slot.hourScore = tpHourScoreAt(slot.wallStart);   // null if cache miss
      if (slot.hourScore != null) anyHour = true;
      slot.hourPositive = (slot.hourScore != null && slot.hourScore >= TP_HOUR_THRESHOLD);
      var synergy = (isDep || isArr) ? TP_SYNERGY_ENDS : TP_SYNERGY_MID;
      slot.synergyApplied = slot.hourPositive ? synergy : 0;
      slot.dirs.forEach(function (d) {
        // Combined = direction score + (synergy if the hour is positive).
        // Synergy lifts all gated directions equally; the direction score ranks them.
        d.combined = (d.eval && d.eval.ok) ? (d.eval.score + slot.synergyApplied) : null;
      });
    });

    // ---- Stop plan: auto suggester, or the user's own charging stops -------
    var plan = (opts.stopMode === 'mine')
      ? tpPlanWithStops(slots, opts.charges || [])
      : tpSuggestStops(slots, opts.maxLegHours || 4);

    return { bearing: bearing, snapDir: snapDir, origin: O, dest: Dst, slots: slots,
             hasHourData: anyHour, plan: plan, stopMode: opts.stopMode || 'auto',
             maxLegHours: opts.maxLegHours || 4 };
  }

  /* ---- pick the best gated direction in a slot ---------------------------- *
   * Prefers directions heading toward the destination; ranks by combined score.
   * ----------------------------------------------------------------------- */
  function tpBestDir(slot, preferToward) {
    var gated = slot.dirs.filter(function (d) { return d.eval && d.eval.ok; });
    if (!gated.length) return null;
    var toward = gated.filter(function (d) { return d.towardDest; });
    var pool = (preferToward && toward.length) ? toward : gated;
    pool = pool.slice().sort(function (a, b) { return (b.combined || 0) - (a.combined || 0); });
    return pool[0];
  }

  /* ---- STOP SUGGESTER ----------------------------------------------------- *
   * Builds the leg/stop itinerary from the slots. Faithful to the model:
   *   - You lock a direction only when setting off (departure or restart).
   *   - While driving you are immune to the hour change, so a stop is only
   *     worth it when the NEW double-hour gives you something better.
   * Rule for stopping at a slot boundary:
   *   a) the new hour is positive AND offers a toward-destination direction
   *      (re-locking captures the synergy and keeps you progressing), OR
   *   b) you are currently NOT heading toward the destination and the new
   *      slot offers one (course correction), OR
   *   c) you have driven >= maxLegHours without a stop (rest needed).
   * Otherwise: keep driving (immune to the change).
   * Returns an ordered timeline of {type:'leg'|'stop', ...}.
   * ----------------------------------------------------------------------- */
  function tpSuggestStops(slots, maxLegHours) {
    maxLegHours = maxLegHours || 4;
    var timeline = [];
    if (!slots.length) return timeline;

    var legStart = slots[0].wallStart;
    var legStartSlot = 0;
    var curHead = tpBestDir(slots[0], true);

    function pushLeg(endWall, endSlotIdx, note) {
      timeline.push({
        type: 'leg', startWall: legStart, endWall: endWall,
        heading: curHead, startSlotIdx: legStartSlot, endSlotIdx: endSlotIdx,
        durationH: (endWall - legStart) / 3600000, note: note || ''
      });
    }

    for (var i = 1; i < slots.length; i++) {
      var slot = slots[i];
      var bi = tpBestDir(slot, true);
      var elapsedH = (slot.wallStart - legStart) / 3600000;
      var forcedRest = elapsedH >= maxLegHours;
      var curTowards = !!(curHead && curHead.towardDest);
      var biTowards = !!(bi && bi.towardDest);

      var doStop = false, reason = '';
      if (bi && biTowards && slot.hourPositive) { doStop = true; reason = 'ora positiva + direzione verso la meta (sinergia)'; }
      else if (!curTowards && biTowards) { doStop = true; reason = 'correzione rotta verso la meta'; }
      else if (forcedRest && bi) { doStop = true; reason = 'sosta di riposo (≥' + maxLegHours + 'h di marcia)'; }

      if (doStop) {
        pushLeg(slot.wallStart, i - 1);
        timeline.push({ type: 'stop', atWall: slot.wallStart, slotIdx: i, reason: reason, newHeading: bi });
        legStart = slot.wallStart; legStartSlot = i; curHead = bi;
      }
    }
    pushLeg(slots[slots.length - 1].wallEnd, slots.length - 1, 'arrivo');
    return timeline;
  }

  /* ---- parse charging-stop times from the text field --------------------- *
   * Accepts "HH:MM" entries separated by commas, optional duration after
   * × or x or * (minutes), e.g. "15:30×45, 19:30". Times are taken on the
   * departure date; if a time is earlier than departure it rolls to next day.
   * Returns [{ start: Date, durationMin: Number }] sorted by time.
   * ----------------------------------------------------------------------- */
  function tpParseCharges(text, depDate) {
    if (!text) return [];
    var out = [];
    text.split(',').forEach(function (raw) {
      var s = raw.trim(); if (!s) return;
      var m = s.match(/^(\d{1,2}):(\d{2})\s*[×x*]?\s*(\d+)?$/);
      if (!m) return;
      var hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
      var dur = m[3] ? parseInt(m[3], 10) : 30;
      var d = new Date(depDate.getFullYear(), depDate.getMonth(), depDate.getDate(), hh, mm, 0);
      if (d.getTime() < depDate.getTime()) d = new Date(d.getTime() + 86400000); // next day
      out.push({ start: d, durationMin: dur });
    });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }

  // Which slot index contains a wall-clock moment (by wall range)
  function tpSlotIndexAt(slots, wallDate) {
    var t = wallDate.getTime();
    for (var i = 0; i < slots.length; i++) {
      if (t >= slots[i].wallStart.getTime() && t < slots[i].wallEnd.getTime()) return i;
    }
    if (slots.length && t >= slots[slots.length - 1].wallEnd.getTime()) return slots.length - 1;
    return 0;
  }

  // Hint: would an adjacent double-hour give a better toward-destination option?
  function tpNeighborHint(slots, i) {
    function towardScore(s) { var b = tpBestDir(s, true); return (b && b.towardDest) ? b.combined : null; }
    var here = towardScore(slots[i]);
    var cand = null;
    [i - 1, i + 1].forEach(function (j) {
      if (j < 0 || j >= slots.length) return;
      var sc = towardScore(slots[j]);
      if (sc == null) return;
      if ((here == null) || (sc > here)) {
        if (!cand || sc > cand.score) cand = { idx: j, score: sc, slot: slots[j], earlier: (j < i) };
      }
    });
    return cand; // null if no better neighbor
  }

  /* ---- USER-SUPPLIED CHARGING STOPS -------------------------------------- *
   * The user lists when they'll charge (each a >=20 min reset). For each, we
   * report the restart double-hour + best toward-destination direction, and
   * hint if shifting the charge by one double-hour would land a better one.
   * ----------------------------------------------------------------------- */
  function tpPlanWithStops(slots, charges) {
    var timeline = [];
    if (!slots.length) return timeline;
    var legStart = slots[0].wallStart, legStartSlot = 0;
    var curHead = tpBestDir(slots[0], true);
    function pushLeg(endWall, endSlotIdx, note) {
      timeline.push({ type: 'leg', startWall: legStart, endWall: endWall, heading: curHead,
        startSlotIdx: legStartSlot, endSlotIdx: endSlotIdx,
        durationH: (endWall - legStart) / 3600000, note: note || '' });
    }
    var tripStart = slots[0].wallStart.getTime();
    var tripEnd = slots[slots.length - 1].wallEnd.getTime();

    charges.forEach(function (ch) {
      if (ch.start.getTime() <= tripStart || ch.start.getTime() >= tripEnd) return; // outside trip
      // close current leg at the charge start
      var atSlot = tpSlotIndexAt(slots, ch.start);
      pushLeg(ch.start, atSlot);
      // restart moment = charge start + duration
      var restart = new Date(ch.start.getTime() + ch.durationMin * 60000);
      if (restart.getTime() >= tripEnd) restart = new Date(tripEnd - 1);
      var rSlotIdx = tpSlotIndexAt(slots, restart);
      var rSlot = slots[rSlotIdx];
      var newHead = tpBestDir(rSlot, true);
      var hint = tpNeighborHint(slots, rSlotIdx);
      timeline.push({
        type: 'stop', charge: true, atWall: ch.start, durationMin: ch.durationMin,
        restartWall: restart, restartSlotIdx: rSlotIdx, slotIdx: rSlotIdx,
        reason: 'ricarica (' + ch.durationMin + ' min) — reset',
        newHeading: newHead,
        restartSlotLabel: rSlot.gZhiHan + ' (TST ' + rSlot.tstStart + '–' + rSlot.tstEnd + ')',
        chargeHint: hint ? {
          dir: tpBestDir(hint.slot, true), label: hint.slot.gZhiHan, earlier: hint.earlier,
          wall: fmtHMonly(hint.slot.wallStart) + '–' + fmtHMonly(hint.slot.wallEnd), score: hint.score
        } : null
      });
      legStart = restart; legStartSlot = rSlotIdx; curHead = newHead;
    });
    pushLeg(slots[slots.length - 1].wallEnd, slots.length - 1, 'arrivo');
    return timeline;
  }

  /* ======================================================================= *
   *  MINIMAL SELF-CONTAINED UI  (so you can test without editing the app)
   * ======================================================================= */
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function fmtDateHM(d) {
    return String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getMonth() + 1).padStart(2, '0') + ' ' +
           String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0');
  }
  function fmtHMonly(d) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function tpHeadLabel(h, destName) {
    if (!h) return '<span style="color:#b00;">nessuna direzione favorevole</span>';
    return '<b>' + h.dir + '</b>' + (h.towardDest ? ' →' + destName : '') +
           ' <span style="color:#1b8a3f;">(' + (h.combined > 0 ? '+' : '') + h.combined + ')</span>';
  }

  function tpRenderPlan(result, container) {
    var plan = result.plan || [];
    var nStops = plan.filter(function (x) { return x.type === 'stop'; }).length;

    var wrap = el('div', { style: 'border:2px solid #1b8a3f;border-radius:10px;padding:10px 12px;margin:6px 0 4px;background:#f3fbf5;' });
    wrap.appendChild(el('div', { style: 'font-size:14px;font-weight:700;color:#1b8a3f;margin-bottom:8px;' },
      '🗺️ Piano consigliato — ' + nStops + ' sosta' + (nStops === 1 ? '' : 'e') + ' (≥20 min)'));

    plan.forEach(function (item) {
      if (item.type === 'leg') {
        var row = el('div', { style: 'display:flex;gap:8px;align-items:flex-start;margin:4px 0;font-size:13px;' });
        row.appendChild(el('span', { style: 'font-size:15px;' }, '🚗'));
        var dur = item.durationH;
        var durTxt = (dur >= 1 ? dur.toFixed(dur % 1 ? 1 : 0) + 'h' : Math.round(dur * 60) + 'm');
        row.appendChild(el('div', null,
          'Guida <b>' + fmtHMonly(item.startWall) + '→' + fmtHMonly(item.endWall) + '</b> (' + durTxt + ') verso ' +
          tpHeadLabel(item.heading, result.dest.name) +
          (item.note === 'arrivo' ? ' &nbsp;🏁 <b>arrivo a ' + result.dest.name + '</b>' : '')));
        wrap.appendChild(row);
      } else { // stop
        var srow = el('div', { style: 'display:flex;gap:8px;align-items:flex-start;margin:4px 0 4px 4px;font-size:13px;color:#8a4b00;' });
        srow.appendChild(el('span', { style: 'font-size:15px;' }, item.charge ? '🔌' : '🛑'));
        var body = item.charge
          ? '<b>Ricarica ' + item.durationMin + ' min</b> alle <b>' + fmtHMonly(item.atWall) + '</b> (reset)' +
            '<br>riparti alle <b>' + fmtHMonly(item.restartWall) + '</b> in ' + item.restartSlotLabel +
            ' verso ' + tpHeadLabel(item.newHeading, result.dest.name) +
            (item.chargeHint && item.chargeHint.dir
              ? '<br><span style="color:#1565c0;">💡 ' + (item.chargeHint.earlier ? 'anticipando' : 'ritardando') +
                ' la ricarica alla finestra ' + item.chargeHint.wall + ' (' + item.chargeHint.label +
                ') ripartiresti verso ' + tpHeadLabel(item.chargeHint.dir, result.dest.name) + '</span>'
              : '')
          : '<b>Sosta ≥20 min</b> alle <b>' + fmtHMonly(item.atWall) + '</b> — ' + item.reason +
            '<br>poi riparti verso ' + tpHeadLabel(item.newHeading, result.dest.name);
        srow.appendChild(el('div', null, body));
        wrap.appendChild(srow);
      }
    });

    if (!plan.length) {
      wrap.appendChild(el('div', { style: 'color:#b00;font-size:13px;' }, 'Nessun piano: nessuna direzione favorevole nel periodo.'));
    }
    container.appendChild(wrap);
  }

  function tpRender(result, container) {
    container.innerHTML = '';
    var head = el('div', { style: 'margin:6px 0 10px;font-size:13px;color:#333;' },
      '🧭 Bearing to <b>' + result.dest.name + '</b>: ' + Math.round(result.bearing) +
      '° (≈ <b>' + result.snapDir + '</b>). Le direzioni con <b>→' + result.dest.name +
      '</b> ti fanno avanzare verso la meta. Le chip mostrano il punteggio <b>combinato</b> (direzione + sinergia ora).');
    container.appendChild(head);

    if (!result.hasHourData) {
      container.appendChild(el('div', {
        style: 'margin:6px 0 10px;padding:8px 10px;border-radius:8px;background:#fff4e5;color:#8a4b00;font-size:12px;'
      }, '⚠️ Punteggio dell\'ora non disponibile: esegui prima un <b>scan BEST</b> sulle date del viaggio (con la persona giusta attiva). ' +
         'Poi riapri il pianificatore. Per ora vedi solo il punteggio di direzione.'));
    }

    // ---- Recommended plan (stop suggester) ----
    tpRenderPlan(result, container);

    // ---- Detailed slot grid (reference) ----
    container.appendChild(el('div', { style: 'margin:14px 0 4px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;' }, 'Dettaglio per doppia-ora'));

    result.slots.forEach(function (slot) {
      var card = el('div', { style: 'border:1px solid #d9d9e3;border-radius:8px;padding:8px 10px;margin:8px 0;background:#fafaff;' });

      // Hour-score badge
      var hb;
      if (slot.hourScore == null) hb = '<span style="color:#b58900;">ora n.d.</span>';
      else if (slot.hourPositive) hb = '<span style="color:#1b8a3f;font-weight:700;">ora ✓ ' + slot.hourScore + ' (+' + slot.synergyApplied + ')</span>';
      else hb = '<span style="color:#999;">ora ' + slot.hourScore + ' &lt;8</span>';
      var legColor = slot.legType === 'Partenza' ? '#c77800' : (slot.legType === 'Arrivo' ? '#7b1fa2' : '#888');

      var title = el('div', { style: 'font-size:13px;font-weight:600;color:#1565c0;margin-bottom:6px;' },
        '<span style="color:' + legColor + ';">' + slot.legType + '</span> · ' +
        slot.weekday + ' ' + fmtDateHM(slot.wallStart) + '→' + fmtDateHM(slot.wallEnd) +
        ' &nbsp;<span style="color:#888;font-weight:400;">(TST ' + slot.tstStart + '–' + slot.tstEnd +
        ')</span> &nbsp;' + hb +
        '<br><span style="color:#5a3d8a;">' + slot.gZhiHan + ' ' + slot.gZhiPy +
        '</span> <span style="color:#aaa;font-weight:400;font-size:11px;">lon ' + slot.lonUsed.toFixed(2) + '°</span>');
      card.appendChild(title);

      var grid = el('div', { style: 'display:flex;flex-wrap:wrap;gap:5px;' });
      slot.dirs.forEach(function (d) {
        var ok = d.eval && d.eval.ok;
        var comb = d.combined;
        var bg = ok ? '#1b8a3f' : '#ececf2';
        var fg = ok ? '#fff' : '#9a9aa5';
        var ring = d.towardDest ? 'box-shadow:0 0 0 2px #c77800;' : '';
        var scTag = ok ? ' ·' + (comb > 0 ? '+' : '') + comb : '';
        var label = d.dir + (d.towardDest ? ' →' + result.dest.name.slice(0, 4) : '') + scTag;
        var chip = el('span', {
          style: 'cursor:pointer;user-select:none;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;' +
            'background:' + bg + ';color:' + fg + ';' + ring,
          title: 'tap per dettagli'
        }, label);
        chip.addEventListener('click', function () {
          var e = d.eval || {};
          alert(
            d.dir + ' (palazzo ' + d.palace + ') — ' + (e.ok ? 'FAVOREVOLE ✓' : 'non favorevole ✗') +
            (e.ok ? '  score ' + (e.score > 0 ? '+' : '') + e.score : '') + '\n\n' +
            'Tian/Di: ' + (e.ti || '?') + ' / ' + (e.di || '?') + '\n' +
            'Porta: ' + (e.door || '?') + '\n' +
            'Spirito: ' + (e.deity || '?') + '\n\n' +
            '— Condizione fissa —\n' +
            'San Qi (乙丙丁): ' + (e.hasSanQi ? 'sì ✓' : 'no ✗') + '\n' +
            'Porta favorevole: ' + (e.favDoor ? 'sì ✓' : 'no ✗') + '\n\n' +
            '— Bonus/penalità —\n' +
            'Zhi Fu 直符: ' + (e.zhiFu ? '+' + 1 : '—') + '\n' +
            'Zhi Shi 直使: ' + (e.zhiShi ? '+' + 1 : '—') + '\n' +
            'Configurazioni: ' + (e.configs && e.configs.length ? e.configs.join(', ') : '—') + '\n' +
            'Clash interno: ' + (e.clash ? 'sì (' + TP_CLASH_MODE + ')' : 'no') + '\n' +
            'Warrior 玄武: ' + (e.isWarrior ? 'sì' + (TP_EXCLUDE_WARRIOR ? ' → escluso' : '') : 'no') + '\n' +
            'Tiger 白虎: ' + (e.isTiger ? 'sì (accettato)' : 'no') + '\n\n' +
            '— Ora (' + slot.legType + ') —\n' +
            'Punteggio ora (app): ' + (slot.hourScore == null ? 'n.d. (scan BEST)' : slot.hourScore) + '\n' +
            'Ora positiva (≥8): ' + (slot.hourPositive ? 'sì → sinergia +' + slot.synergyApplied : 'no') + '\n' +
            (e.ok ? 'COMBINATO: ' + (d.combined > 0 ? '+' : '') + d.combined + '\n' : '') +
            (d.towardDest ? '\n→ Direzione verso ' + result.dest.name : '')
          );
        });
        grid.appendChild(chip);
      });
      card.appendChild(grid);
      container.appendChild(card);
    });

    if (!result.slots.length) {
      container.appendChild(el('div', { style: 'color:#b00;font-size:13px;' },
        'Nessuno slot calcolato — controlla data/ora e che le librerie siano caricate.'));
    }
  }

  function tpOpen() {
    var existing = document.getElementById('tp-overlay');
    if (existing) { existing.style.display = 'flex'; return; }

    var ov = el('div', {
      id: 'tp-overlay',
      style: 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.45);display:flex;' +
        'align-items:flex-start;justify-content:center;overflow:auto;padding:16px;'
    });
    var panel = el('div', {
      style: 'background:#fff;border-radius:12px;max-width:680px;width:100%;padding:16px 18px;' +
        'box-shadow:0 10px 40px rgba(0,0,0,.3);font-family:system-ui,Arial,sans-serif;'
    });

    panel.appendChild(el('div', { style: 'display:flex;justify-content:space-between;align-items:center;' },
      '<h3 style="margin:0;font-size:17px;">🚗 Travel Direction Planner</h3>' +
      '<span id="tp-close" style="cursor:pointer;font-size:22px;color:#888;line-height:1;">✕</span>'));

    var nowUtc = (function () {
      var v = document.getElementById('utc-offset');
      return v && isFinite(parseFloat(v.value)) ? parseFloat(v.value) : 1;
    })();
    var nowDst = (typeof _dstOn !== 'undefined') ? _dstOn : true;

    var form = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;font-size:13px;' });
    function field(label, id, val, type) {
      var w = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#444;' }, label);
      var inp = el('input', { id: id, type: type || 'text', value: val,
        style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
      w.appendChild(inp);
      return w;
    }
    form.appendChild(field('Partenza (data)', 'tp-date', '2026-06-03', 'date'));
    form.appendChild(field('Partenza (ora)', 'tp-time', '12:00', 'time'));
    form.appendChild(field('Durata viaggio (ore)', 'tp-dur', '12', 'number'));
    form.appendChild(field('Ore max marcia/sosta', 'tp-maxleg', '4', 'number'));
    form.appendChild(field('UTC offset (base)', 'tp-utc', String(nowUtc), 'number'));
    form.appendChild(field('Origine lon (Vienna)', 'tp-olon', String(TP_DEFAULT.origin.lon), 'number'));
    form.appendChild(field('Origine lat', 'tp-olat', String(TP_DEFAULT.origin.lat), 'number'));
    form.appendChild(field('Dest lon (Roma)', 'tp-dlon', String(TP_DEFAULT.dest.lon), 'number'));
    form.appendChild(field('Dest lat', 'tp-dlat', String(TP_DEFAULT.dest.lat), 'number'));

    var dstWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;color:#444;grid-column:1 / span 2;' });
    var dstChk = el('input', { id: 'tp-dst', type: 'checkbox' });
    if (nowDst) dstChk.checked = true;
    dstWrap.appendChild(dstChk);
    dstWrap.appendChild(el('span', null, 'Ora legale (DST) attiva'));
    form.appendChild(dstWrap);

    // Stop mode: auto suggester vs user-supplied charging stops
    var modeWrap = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#444;grid-column:1 / span 2;' }, 'Soste');
    var modeSel = el('select', { id: 'tp-stopmode',
      style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    modeSel.appendChild(el('option', { value: 'auto' }, 'Automatiche (le sceglie il pianificatore)'));
    modeSel.appendChild(el('option', { value: 'mine' }, 'Le mie ricariche (le inserisco io)'));
    modeWrap.appendChild(modeSel);
    form.appendChild(modeWrap);

    var chWrap = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#444;grid-column:1 / span 2;' },
      'Orari di ricarica (HH:MM, separati da virgola; durata opzionale con ×min, es. 15:30×45)');
    chWrap.appendChild(el('input', { id: 'tp-charges', type: 'text', value: '',
      placeholder: 'es. 15:30×45, 19:30×30',
      style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' }));
    form.appendChild(chWrap);

    panel.appendChild(form);

    var btn = el('button', {
      style: 'width:100%;padding:10px;border:0;border-radius:8px;background:#1565c0;color:#fff;' +
        'font-size:14px;font-weight:600;cursor:pointer;'
    }, 'SCAN VIAGGIO');
    panel.appendChild(btn);

    var results = el('div', { id: 'tp-results', style: 'margin-top:12px;' });
    panel.appendChild(results);

    ov.appendChild(panel);
    document.body.appendChild(ov);

    ov.querySelector('#tp-close').addEventListener('click', function () { ov.style.display = 'none'; });
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.style.display = 'none'; });

    btn.addEventListener('click', function () {
      try {
        var dStr = document.getElementById('tp-date').value;
        var tStr = document.getElementById('tp-time').value || '12:00';
        var dep = new Date(dStr + 'T' + tStr);
        var opts = {
          depDate: dep,
          durationH: parseFloat(document.getElementById('tp-dur').value) || 12,
          maxLegHours: parseFloat(document.getElementById('tp-maxleg').value) || 4,
          utc: parseFloat(document.getElementById('tp-utc').value) || 0,
          dstOn: document.getElementById('tp-dst').checked,
          origin: { lat: parseFloat(document.getElementById('tp-olat').value), lon: parseFloat(document.getElementById('tp-olon').value) },
          dest: { lat: parseFloat(document.getElementById('tp-dlat').value), lon: parseFloat(document.getElementById('tp-dlon').value), name: 'Roma' }
        };
        opts.origin.name = 'Vienna';
        opts.stopMode = document.getElementById('tp-stopmode').value;
        opts.charges = tpParseCharges(document.getElementById('tp-charges').value, dep);
        var res = tpPlan(opts);
        tpRender(res, results);
      } catch (err) {
        results.innerHTML = '<div style="color:#b00;font-size:13px;">Errore: ' + err.message + '</div>';
      }
    });
  }

  // Inject a small launcher button so you can open the planner with one tap.
  function tpInjectLauncher() {
    if (document.getElementById('tp-launch')) return;
    var b = el('button', {
      id: 'tp-launch',
      title: 'Travel Direction Planner',
      style: 'position:fixed;right:14px;bottom:14px;z-index:99998;width:48px;height:48px;border:0;' +
        'border-radius:50%;background:#1565c0;color:#fff;font-size:22px;cursor:pointer;' +
        'box-shadow:0 4px 12px rgba(0,0,0,.3);'
    }, '🚗');
    b.addEventListener('click', tpOpen);
    document.body.appendChild(b);
  }
  // The TRAVEL PLANNER tab button (in index.html) calls tpOpen() directly.
  // The floating 🚗 launcher is now opt-in only: set window.TP_FLOATING_BUTTON
  // = true before this script loads if you ever want it back.
  if (window.TP_FLOATING_BUTTON === true) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tpInjectLauncher);
    } else {
      tpInjectLauncher();
    }
  }

  // Public API
  window.TravelPlanner = {
    plan: tpPlan,
    open: tpOpen,
    evalPalace: tpPalaceOK,
    config: function (favDoors) { if (favDoors) TP_FAV_DOORS = favDoors; return TP_FAV_DOORS.slice(); }
  };
})();

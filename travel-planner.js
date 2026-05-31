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
 * The longitude follows the REAL ROAD when a route is available from the
 * Worker (Phase C): position along the polyline at constant average speed
 * (distance fraction == elapsed fraction of the trip). If no route is fetched,
 * it falls back to a straight line Vienna -> Rome. Either way the double-hour
 * (時辰) boundaries shift west as you drive, exactly as in reality.
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
  // TST double-hour branch -> hour index, matching the app's HOUR_STARTS
  // [23,1,3,5,7,9,11,13,15,17,19,21] = 子丑寅卯辰巳午未申酉戌亥. Used to open the
  // exact hour in the Main view via loadDateIntoMain(iso, hourIndex).
  var TP_BRANCH_TO_HINDEX = {
    '子': 0, '丑': 1, '寅': 2, '卯': 3, '辰': 4, '巳': 5,
    '午': 6, '未': 7, '申': 8, '酉': 9, '戌': 10, '亥': 11
  };
  // Look up the cached hour score for a wall-clock moment (civil branch + civil day)
  function tpHourScoreAt(wallDate) {
    var cache = (typeof window !== 'undefined') ? window._tpHourCache : null;
    if (!cache) return null;
    var br = TP_CIVIL_BRANCH[wallDate.getHours()];
    var rec = cache[tpLocalISO(wallDate) + '#' + br];
    return rec ? rec.score : null;
  }
  // Full cached record (score + XKDG extract) for a wall-clock moment
  function tpHourRecordAt(wallDate) {
    var cache = (typeof window !== 'undefined') ? window._tpHourCache : null;
    if (!cache) return null;
    var br = TP_CIVIL_BRANCH[wallDate.getHours()];
    return cache[tpLocalISO(wallDate) + '#' + br] || null;
  }

  // Palace <-> 8 directions (palace 5 = centre, skipped)
  var TP_PALACE_DIR = { 1: 'N', 2: 'SW', 3: 'E', 4: 'SE', 6: 'NW', 7: 'W', 8: 'NE', 9: 'S' };
  var TP_DIR_TO_PALACE = { N: 1, NE: 8, E: 3, SE: 4, S: 9, SW: 2, W: 7, NW: 6 };
  var TP_DIR_ORDER = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  var TP_DIR_DEG = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

  // Han -> pinyin for display
  var STEM_PY = { '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu', '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui' };
  var BR_PY = { '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si', '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai' };
  var WD_IT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Default endpoints
  var TP_DEFAULT = {
    origin: { name: 'Vienna', lat: 48.2082, lon: 16.3738 },
    dest: { name: 'Rome', lat: 41.9028, lon: 12.4964 }
  };

  // Cloudflare Worker proxy (Routes API). Editable in the panel; persisted in localStorage.
  var TP_DEFAULT_WORKER = 'https://xkdg-proxy.decumano16.workers.dev/';
  function tpGetWorkerUrl() {
    try { return localStorage.getItem('xkdg_worker_url') || TP_DEFAULT_WORKER; } catch (e) { return TP_DEFAULT_WORKER; }
  }
  function tpSetWorkerUrl(u) { try { localStorage.setItem('xkdg_worker_url', u); } catch (e) {} }

  // Last route fetched from the Worker (used later by the bearing phase)
  // shape: { origin, dest, distanceMeters, durationSec, coords: [[lon,lat],...] }
  var TP_LAST_ROUTE = null;

  /* ---- fetch the real route from the Cloudflare Worker (Google Routes API) -
   * Returns a Promise resolving to
   *   { origin, dest, distanceMeters, durationSec, coords:[[lon,lat],...] }
   * Throws with a readable message on any failure.
   * ----------------------------------------------------------------------- */
  function tpFetchRoute(workerUrl, origin, dest) {
    return fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: origin, destination: dest })
    }).then(function (resp) {
      return resp.text().then(function (txt) {
        var data;
        try { data = JSON.parse(txt); } catch (e) { throw new Error('Worker did not return JSON: ' + txt.slice(0, 120)); }
        if (!resp.ok) {
          var msg = (data && data.error && (data.error.message || data.error)) || txt.slice(0, 160);
          throw new Error('Route service error (' + resp.status + '): ' + msg);
        }
        var route = data.routes && data.routes[0];
        if (!route) throw new Error('No route in response (check origin/destination).');
        var line = route.polyline && route.polyline.geoJsonLinestring;
        var coords = line && line.coordinates;
        if (!coords || !coords.length) throw new Error('Route has no geometry (polyline missing).');
        var durSec = parseInt(String(route.duration || '0').replace(/[^0-9]/g, ''), 10) || 0;
        return {
          origin: origin, dest: dest,
          distanceMeters: route.distanceMeters || 0,
          durationSec: durSec,
          coords: coords
        };
      });
    });
  }

  /* ---- solar-time offset (minutes), matching app convention -------------- */
  function tpOffsetMin(lon, utc, dstOn) {
    return (lon - utc * 15) * 4 - (dstOn ? 60 : 0);
  }

  /* ---- loxodromic (rhumb-line) bearing A -> B, degrees 0..360 ------------- *
   * Constant-heading bearing: how B sits relative to A, regardless of any
   * turns/curves in between. This is the "direction of march" of a leg, snapped
   * to a 45° palace. (Not great-circle — that would change heading along the path.)
   * ----------------------------------------------------------------------- */
  function tpBearing(lat1, lon1, lat2, lon2) {
    var toR = Math.PI / 180;
    var p1 = lat1 * toR, p2 = lat2 * toR;
    var dpsi = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2));
    var dl = (lon2 - lon1) * toR;
    if (Math.abs(dl) > Math.PI) dl = dl > 0 ? -(2 * Math.PI - dl) : (2 * Math.PI + dl);
    var b = Math.atan2(dl, dpsi) / toR;
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

  /* ---- REAL-ROUTE geometry (Phase C) ------------------------------------- *
   * Great-circle distance between two points, in metres. Used only to build a
   * cumulative-distance index along the route polyline.
   * ----------------------------------------------------------------------- */
  function tpHaversine(lat1, lon1, lat2, lon2) {
    var R = 6371000, toR = Math.PI / 180;
    var dphi = (lat2 - lat1) * toR, dl = (lon2 - lon1) * toR;
    var a = Math.sin(dphi / 2) * Math.sin(dphi / 2) +
            Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* Build a distance-indexed view of a fetched route.
   * route = { coords:[[lon,lat],...], distanceMeters, durationSec, ... }
   * Returns { coords, cum[], total, distanceMeters, durationSec, posAt(f) } or
   * null if the route is missing/degenerate. posAt(f) maps a fraction 0..1 of
   * the TOTAL ROAD DISTANCE to a {lat,lon} point on the polyline (constant
   * average speed — the V2a simplification, since the service gives no per-point
   * timestamps). */
  function tpBuildRouteIndex(route) {
    if (!route || !route.coords || route.coords.length < 2) return null;
    var coords = route.coords;            // [[lon,lat], ...]
    var cum = [0];
    for (var i = 1; i < coords.length; i++) {
      var d = tpHaversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
      cum.push(cum[i - 1] + d);
    }
    var total = cum[cum.length - 1] || 0;
    if (total <= 0) return null;
    return {
      coords: coords, cum: cum, total: total,
      distanceMeters: route.distanceMeters || total,
      durationSec: route.durationSec || 0,
      posAt: function (f) {
        if (f <= 0) return { lat: coords[0][1], lon: coords[0][0] };
        if (f >= 1) { var L = coords.length - 1; return { lat: coords[L][1], lon: coords[L][0] }; }
        var target = f * total;
        var lo = 0, hi = cum.length - 1;
        while (lo < hi - 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= target) lo = mid; else hi = mid; }
        var segLen = (cum[hi] - cum[lo]) || 1;
        var t = (target - cum[lo]) / segLen;
        var a = coords[lo], b = coords[hi];
        return { lat: a[1] + (b[1] - a[1]) * t, lon: a[0] + (b[0] - a[0]) * t };
      }
    };
  }

  /* Does a previously fetched route match the current origin/dest endpoints?
   * (so SCAN TRIP can reuse a route already fetched by the test button). */
  function tpRouteMatches(route, O, D) {
    if (!route || !route.origin || !route.dest) return false;
    function near(a, b) { return (a != null && b != null) && Math.abs(a - b) < 1e-4; }
    return near(route.origin.lat, O.lat) && near(route.origin.lng, O.lng) &&
           near(route.dest.lat, D.lat) && near(route.dest.lng, D.lng);
  }

  /* Best gated direction in a slot toward an ARBITRARY target bearing (not just
   * the final destination). Reuses each direction's precomputed `combined`
   * score; only the "toward" test changes (within 67.5° of the target). Returns
   * a fresh object so the slot's stored dirs are never mutated. */
  function tpBestDirToward(slot, targetBearing) {
    var gated = slot.dirs.filter(function (d) { return d.eval && d.eval.ok; });
    if (!gated.length) return null;
    var toward = gated.filter(function (d) { return tpAngDiff(TP_DIR_DEG[d.dir], targetBearing) <= 67.5; });
    var pool = (toward.length ? toward : gated).slice()
      .sort(function (a, b) { return (b.combined || 0) - (a.combined || 0); });
    var best = pool[0];
    return { dir: best.dir, palace: best.palace, eval: best.eval, combined: best.combined, towardDest: true };
  }

  /* ---- PHASE C re-aim: nudge a leg's heading toward the upcoming stop ----- *
   * Implements the confirmed rule for INTERMEDIATE decision moments:
   *   point at the next stop instead of the final destination WHEN
   *     (a) the stop is functional to approaching the destination
   *         (heading-to-stop within 67.5° of heading-to-destination), AND
   *     (b) it yields better positivity (a higher-scored gated direction), AND
   *     (c) the stop is reached within the SAME double-hour window in which the
   *         locked positive configuration persists (so the heading governs the
   *         whole leg to that stop).
   * Otherwise the leg keeps pointing at the final destination. Defensive: only
   * ever IMPROVES a leg; never blanks an existing heading.
   * ----------------------------------------------------------------------- */
  function tpReaimLegsAtStops(plan, slots, posAt, Dst) {
    if (!plan || !plan.length) return;
    for (var k = 0; k < plan.length - 1; k++) {
      var leg = plan[k], nxt = plan[k + 1];
      if (leg.type !== 'leg' || nxt.type !== 'stop') continue;
      var slot = slots[leg.startSlotIdx];
      if (!slot || !slot.posStart || !slot.wallEnd) continue;
      var stopWall = nxt.atWall;
      if (!stopWall) continue;
      // (c) within the same double-hour window as the decision moment
      if (stopWall.getTime() >= slot.wallEnd.getTime()) continue;
      // candidate target = real position at the stop
      var sp = posAt(stopWall.getTime());
      var bearStop = tpBearing(slot.posStart.lat, slot.posStart.lon, sp.lat, sp.lon);
      // (a) functional to approaching the destination
      if (tpAngDiff(bearStop, slot.bearingDest) > 67.5) continue;
      // (b) better positivity than aiming straight at the destination
      var towardStop = tpBestDirToward(slot, bearStop);
      var towardDest = tpBestDirToward(slot, slot.bearingDest);
      if (!towardStop) continue;
      var scStop = (towardStop.combined != null) ? towardStop.combined : -Infinity;
      var scDest = (towardDest && towardDest.combined != null) ? towardDest.combined : -Infinity;
      if (scStop > scDest && (!leg.heading || towardStop.dir !== leg.heading.dir)) {
        leg.heading = towardStop;
        leg.aimedAtStop = true;
        leg.aimNote = 'aimed at next stop (better config, within the double-hour)';
      }
    }
  }

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

    // Overall headline bearing (origin -> dest), shown in the result header.
    var bearing = tpBearing(O.lat, O.lon, Dst.lat, Dst.lon);
    var snapDir = tpSnapDir(bearing);

    var startMs = dep.getTime();
    var endMs = startMs + durH * 3600000;
    var spanMs = Math.max(endMs - startMs, 1);

    // ---- Real route geometry (Phase C) — falls back to a straight line ------
    var routeIdx = tpBuildRouteIndex(opts.route);   // null if no/invalid route
    var usedRealRoute = !!routeIdx;

    // Position {lat,lon} at a wall-clock moment. Constant average speed (V2a):
    // the distance fraction along the road equals the elapsed fraction of the
    // trip span. With no route, this degrades to the old straight-line interp.
    function posAt(ms) {
      var f = (ms - startMs) / spanMs;
      if (f < 0) f = 0; if (f > 1) f = 1;
      if (routeIdx) return routeIdx.posAt(f);
      return { lat: O.lat + (Dst.lat - O.lat) * f, lon: O.lon + (Dst.lon - O.lon) * f };
    }
    function solarAt(ms) {
      var p = posAt(ms);
      var off = tpOffsetMin(p.lon, utc, dstOn);
      return { lat: p.lat, lon: p.lon, date: new Date(ms + off * 60000) };
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
        // Per-slot bearing: rhumb from the REAL position at this decision moment
        // to the final destination. This makes "toward destination" reflect the
        // actual road position, not a single trip-wide straight line.
        var bearHere = tpBearing(s.lat, s.lon, Dst.lat, Dst.lon);
        cur = {
          wallStart: new Date(ms),
          wallEnd: null,
          tstStart: fmtHM(s.date),
          tstEnd: null,
          lonUsed: s.lon,
          latUsed: s.lat,
          posStart: { lat: s.lat, lon: s.lon },
          bearingDest: bearHere,
          brHan: brHan,
          brPy: BR_PY[brHan] || brHan,
          gZhiHan: gHan + brHan,
          gZhiPy: (STEM_PY[gHan] || gHan) + ' ' + (BR_PY[brHan] || brHan),
          weekday: WD_IT[s.date.getDay()],
          // solar date parts + hour pillar, for reopening the rotating chart / LIST
          qmY: s.date.getFullYear(), qmM: s.date.getMonth() + 1, qmD: s.date.getDate(),
          iso: s.date.getFullYear() + '-' + String(s.date.getMonth() + 1).padStart(2, '0') + '-' + String(s.date.getDate()).padStart(2, '0'),
          hGanHan: gHan, hZhiHan: brHan,
          dirs: tpScanDirs(s.date.getFullYear(), s.date.getMonth() + 1, s.date.getDate(),
                           gHan, brHan, bearHere)
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
      slot.legType = isDep ? 'Departure' : (isArr ? 'Arrival' : 'Leg');
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

    // ---- PHASE C: re-aim intermediate legs at the next stop when warranted --
    try { tpReaimLegsAtStops(plan, slots, posAt, Dst); } catch (e) { /* keep base plan */ }

    return { bearing: bearing, snapDir: snapDir, origin: O, dest: Dst, slots: slots,
             hasHourData: anyHour, plan: plan, stopMode: opts.stopMode || 'auto',
             maxLegHours: opts.maxLegHours || 4,
             usedRealRoute: usedRealRoute,
             routeMeta: routeIdx ? {
               km: routeIdx.distanceMeters / 1000,
               durationSec: routeIdx.durationSec,
               points: routeIdx.coords.length
             } : null };
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
      if (bi && biTowards && slot.hourPositive) { doStop = true; reason = 'positive hour + direction toward destination (synergy)'; }
      else if (!curTowards && biTowards) { doStop = true; reason = 'course correction toward destination'; }
      else if (forcedRest && bi) { doStop = true; reason = 'rest stop (≥' + maxLegHours + 'h driving)'; }

      if (doStop) {
        pushLeg(slot.wallStart, i - 1);
        timeline.push({ type: 'stop', atWall: slot.wallStart, slotIdx: i, reason: reason, newHeading: bi });
        legStart = slot.wallStart; legStartSlot = i; curHead = bi;
      }
    }
    pushLeg(slots[slots.length - 1].wallEnd, slots.length - 1, 'arrival');
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
        reason: 'charge (' + ch.durationMin + ' min) — reset',
        newHeading: newHead,
        restartSlotLabel: rSlot.gZhiHan + ' (TST ' + rSlot.tstStart + '–' + rSlot.tstEnd + ')',
        chargeHint: hint ? {
          dir: tpBestDir(hint.slot, true), label: hint.slot.gZhiHan, earlier: hint.earlier,
          wall: fmtHMonly(hint.slot.wallStart) + '–' + fmtHMonly(hint.slot.wallEnd), score: hint.score
        } : null
      });
      legStart = restart; legStartSlot = rSlotIdx; curHead = newHead;
    });
    pushLeg(slots[slots.length - 1].wallEnd, slots.length - 1, 'arrival');
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
    if (!h) return '<span style="color:#b00;">no favourable direction</span>';
    return '<b>' + h.dir + '</b>' + (h.towardDest ? ' →' + destName : '') +
           ' <span style="color:#1b8a3f;">(' + (h.combined > 0 ? '+' : '') + h.combined + ')</span>';
  }

  /* ---- ROTATING-pan chart (the directional Qimen the planner evaluates) --- */
  function tpRotChartHtml(slot, highlightPalace) {
    try {
    if (typeof QMDJWaterScanner === 'undefined' || typeof QMDJWaterScanner.getRotatingHourChart !== 'function')
      return '<div style="color:#b00;">Scanner not loaded.</div>';
    var chart = QMDJWaterScanner.getRotatingHourChart(slot.qmY, slot.qmM, slot.qmD, slot.hGanHan, slot.hZhiHan);
    if (!chart || !chart.palaces) return '<div style="color:#b00;">No chart.</div>';
    var DIRH = { 4: 'SE', 9: 'S', 2: 'SW', 3: 'E', 5: 'C', 7: 'W', 8: 'NE', 1: 'N', 6: 'NW' };
    var order = [4, 9, 2, 3, 5, 7, 8, 1, 6];
    var GREEN = '#0d5e2c';
    function cell(p) {
      if (p === 5) return '<td style="border:1px solid ' + GREEN + ';background:#f3f7f3;text-align:center;color:#999;font-size:11px;padding:6px;">C</td>';
      var pd = chart.palaces[p];
      if (!pd) return '<td style="border:1px solid ' + GREEN + ';text-align:center;color:#aaa;">—</td>';
      var configs = (typeof QMDJWaterScanner.checkRotatingPalace === 'function')
        ? (QMDJWaterScanner.checkRotatingPalace(chart, p) || []) : [];
      var ev = tpPalaceOK(pd, configs.length);
      var hi = (highlightPalace && p === highlightPalace);
      var bg = hi ? '#fff3b0' : (ev && ev.ok ? '#eaf6ee' : '#fff');
      var bd = hi ? '3px solid #f9a825' : '1px solid ' + GREEN;
      var flags = [];
      if (ev.hasSanQi) flags.push('<span style="color:#1b5e20;">SanQi</span>');
      if (ev.favDoor) flags.push('<span style="color:#1b5e20;">Door\u2713</span>');
      if (ev.zhiFu) flags.push('\u76f4\u7b26');
      if (ev.zhiShi) flags.push('\u76f4\u4f7f');
      if (ev.clash) flags.push('<span style="color:#c62828;">clash</span>');
      if (ev.isWarrior) flags.push('<span style="color:#c62828;">\u7384\u6b66</span>');
      if (ev.isTiger) flags.push('\u767d\u864e');
      configs.forEach(function (c) { flags.push('<span style="color:#7b1fa2;">' + c.label + '</span>'); });
      return '<td style="border:' + bd + ';background:' + bg + ';vertical-align:top;padding:5px;font-size:11px;min-width:96px;">' +
        '<div style="font-weight:700;color:#1565c0;">' + DIRH[p] + ' \u00b7 ' + p + (ev.ok ? ' <span style="color:#1b8a3f;">\u2713' + (ev.score ? ' +' + ev.score : '') + '</span>' : '') + '</div>' +
        '<div style="font-size:14px;color:#333;">' + (pd.tiH || pd.ti || '') + ' / ' + (pd.diH || pd.di || '') + '</div>' +
        '<div style="color:#555;">' + (pd.doorName || pd.door || '') + ' \u00b7 ' + (pd.deity || '') + '</div>' +
        '<div style="margin-top:2px;line-height:1.4;">' + flags.join(' ') + '</div>' +
        '</td>';
    }
    var rows = '';
    for (var r = 0; r < 3; r++) {
      rows += '<tr>' + cell(order[r * 3]) + cell(order[r * 3 + 1]) + cell(order[r * 3 + 2]) + '</tr>';
    }
    return '<table style="border-collapse:collapse;width:100%;">' + rows + '</table>';
    } catch (e) { return '<div style="color:#b00;font-size:12px;">Chart error: ' + e.message + '</div>'; }
  }

  /* ---- leg detail: rotating Qimen config + link to full XKDG (LIST) ------- */
  /* ---- prominent card for the single chosen palace ----------------------- */
  function tpSinglePalaceHtml(slot, palace) {
    try {
    if (!palace || typeof QMDJWaterScanner === 'undefined' || typeof QMDJWaterScanner.getRotatingHourChart !== 'function') return '';
    var chart = QMDJWaterScanner.getRotatingHourChart(slot.qmY, slot.qmM, slot.qmD, slot.hGanHan, slot.hZhiHan);
    if (!chart || !chart.palaces || !chart.palaces[palace]) return '';
    var pd = chart.palaces[palace];
    var configs = (typeof QMDJWaterScanner.checkRotatingPalace === 'function')
      ? (QMDJWaterScanner.checkRotatingPalace(chart, palace) || []) : [];
    var ev = tpPalaceOK(pd, configs.length);
    var DIRH = { 4: 'SE', 9: 'S', 2: 'SW', 3: 'E', 7: 'W', 8: 'NE', 1: 'N', 6: 'NW' };
    function yn(b, good) { return b ? '<span style="color:#1b8a3f;">yes \u2713</span>' : '<span style="color:' + (good ? '#c62828' : '#999') + ';">no</span>'; }
    var rows =
      '<div style="display:flex;align-items:baseline;gap:10px;">' +
        '<div style="font-size:26px;font-weight:800;color:#0d5e2c;">' + (DIRH[palace] || '') + '</div>' +
        '<div style="font-size:12px;color:#666;">Palace ' + palace + (ev.ok ? ' \u00b7 <b style="color:#1b8a3f;">favourable</b> (score ' + (ev.score >= 0 ? '+' : '') + ev.score + ')' : ' \u00b7 not favourable') + '</div>' +
      '</div>' +
      '<div style="font-size:20px;color:#333;margin:4px 0;">' + (pd.tiH || pd.ti || '') + ' <span style="color:#aaa;">/</span> ' + (pd.diH || pd.di || '') +
        ' &nbsp;<span style="font-size:13px;color:#555;">' + (pd.doorName || pd.door || '') + ' \u00b7 ' + (pd.deity || '') + '</span></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;font-size:12px;color:#444;margin-top:4px;">' +
        '<div>San Qi (\u4e59\u4e19\u4e01): ' + yn(ev.hasSanQi, true) + '</div>' +
        '<div>Favourable door: ' + yn(ev.favDoor, true) + '</div>' +
        '<div>Zhi Fu \u76f4\u7b26: ' + yn(ev.zhiFu) + '</div>' +
        '<div>Zhi Shi \u76f4\u4f7f: ' + yn(ev.zhiShi) + '</div>' +
        '<div>Internal clash: ' + (ev.clash ? '<span style="color:#c62828;">yes</span>' : 'no') + '</div>' +
        '<div>Warrior/Tiger: ' + (ev.isWarrior ? '<span style="color:#c62828;">\u7384\u6b66</span>' : (ev.isTiger ? '\u767d\u864e' : 'no')) + '</div>' +
      '</div>' +
      (configs.length ? '<div style="font-size:12px;color:#7b1fa2;margin-top:4px;">Configs: ' + configs.map(function (c) { return c.label; }).join(', ') + '</div>' : '');
    return '<div style="border:2px solid #f9a825;border-radius:10px;padding:10px 12px;background:#fffdf5;">' + rows + '</div>';
    } catch (e) { return '<div style="color:#b00;font-size:12px;">Palace error: ' + e.message + '</div>'; }
  }

  /* ---- inline XKDG extract (from the BEST cache record) ------------------- */
  function tpXkdgExtractHtml(rec) {
    if (!rec) return '<div style="font-size:12px;color:#b58900;">No XKDG data yet — press SCAN TRIP (with the person loaded).</div>';
    var parts = [];
    parts.push('<b>Score ' + rec.score + '</b>' + (rec.score >= 8 ? ' <span style="color:#1b8a3f;">(positive \u2265 8)</span>' : ''));
    if (rec.spiritEn) parts.push('Spirit: <span style="color:' + (rec.spiritAusp ? '#0044cc' : '#d40000') + ';font-weight:600;">' + rec.spiritEn + '</span>');
    if (rec.nayin) parts.push('Nayin: <b>' + rec.nayin + '</b>');
    if (rec.ke) parts.push('Ke +' + rec.ke);
    var tags = (rec.xkdgTags && rec.xkdgTags.length) ? rec.xkdgTags.join(' \u00b7 ') : '\u2014';
    return '<div style="font-size:12px;color:#444;line-height:1.6;">' + parts.join(' &nbsp;\u00b7&nbsp; ') +
      '<div style="margin-top:3px;">Hexagram relations: <span style="color:#1565c0;">' + tags + '</span></div></div>';
  }

  function tpShowLegDetail(slot, highlightPalace, title) {
    if (!slot) return;
    var prev = document.getElementById('tp-leg-detail');
    if (prev) prev.parentNode.removeChild(prev);
    var ov = el('div', { id: 'tp-leg-detail',
      style: 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;' });
    var box = el('div', { style: 'background:#fff;border-radius:12px;max-width:560px;width:100%;padding:16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:system-ui,Arial,sans-serif;' });
    box.appendChild(el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;' },
      '<h3 style="margin:0;font-size:16px;">' + (title || 'Leg detail') + '</h3>' +
      '<span id="tp-ld-close" style="cursor:pointer;font-size:22px;color:#888;line-height:1;">\u2715</span>'));
    box.appendChild(el('div', { style: 'font-size:12px;color:#555;margin-bottom:8px;' },
      slot.weekday + ' ' + slot.iso + ' \u00b7 ' + slot.gZhiHan + ' ' + slot.gZhiPy +
      ' \u00b7 TST ' + slot.tstStart + '\u2013' + slot.tstEnd +
      (slot.hourScore != null ? ' \u00b7 hour score ' + slot.hourScore + (slot.hourPositive ? ' \u2713' : '') : '')));

    // 1) The ORIGINAL rotating Qimen chart, native app style (showQimenChart),
    //    with the chosen direction's palace highlighted.
    var rotHtml = '';
    if (typeof showQimenChart === 'function') {
      try {
        rotHtml = showQimenChart(slot.iso, slot.hGanHan, slot.hZhiHan, highlightPalace || null,
          { mode: 'rotating', returnHtml: true }) || '';
      } catch (e) { rotHtml = '<div style="color:#b00;font-size:12px;">Chart error: ' + e.message + '</div>'; }
    }
    if (rotHtml) {
      box.appendChild(el('div', { style: 'font-size:12px;font-weight:700;color:#0d5e2c;margin:6px 0 2px;' }, 'Rotating Qimen chart'));
      box.appendChild(el('div', null, rotHtml));
    } else if (highlightPalace) {
      // fallback if the chart can't be drawn
      box.appendChild(el('div', null, tpSinglePalaceHtml(slot, highlightPalace)));
    }

    // 2) The exact LIST row for this hour (real XKDG setting + score), pasted inline
    var hIdx = TP_BRANCH_TO_HINDEX[slot.brHan];
    var listRow = '';
    if (typeof window !== 'undefined' && typeof window.tpGetListRowHtml === 'function' && hIdx != null) {
      try { listRow = window.tpGetListRowHtml(slot.iso, hIdx) || ''; } catch (e) { listRow = ''; }
    }
    box.appendChild(el('div', { style: 'font-size:12px;font-weight:700;color:#7b1fa2;margin:14px 0 4px;' }, 'XKDG setting (from LIST)'));
    if (listRow) {
      box.appendChild(el('div', {
        style: 'border:1px solid #e0d4ec;border-radius:8px;overflow:hidden;'
      }, listRow));
    } else {
      box.appendChild(el('div', { style: 'font-size:12px;color:#b58900;' },
        'Press SCAN TRIP (with the person loaded) to load the LIST setting for this hour.'));
    }

    ov.appendChild(box);
    document.body.appendChild(ov);
    ov.querySelector('#tp-ld-close').addEventListener('click', function () { if (ov.parentNode) ov.parentNode.removeChild(ov); });
    // NOTE: no background-click-to-close here — on touch the opening tap can
    // reach the new full-screen overlay and dismiss it instantly. Close via ✕ only.
  }

  function tpRenderPlan(result, container) {
    var plan = result.plan || [];
    var nStops = plan.filter(function (x) { return x.type === 'stop'; }).length;

    var wrap = el('div', { style: 'border:2px solid #1b8a3f;border-radius:10px;padding:10px 12px;margin:6px 0 4px;background:#f3fbf5;' });
    wrap.appendChild(el('div', { style: 'font-size:14px;font-weight:700;color:#1b8a3f;margin-bottom:8px;' },
      '🗺️ Suggested plan — ' + nStops + ' stop' + (nStops === 1 ? '' : 's') + ' (≥20 min)'));

    plan.forEach(function (item) {
      if (item.type === 'leg') {
        var row = el('div', { style: 'display:flex;gap:8px;align-items:flex-start;margin:4px 0;font-size:13px;cursor:pointer;border-radius:6px;padding:2px 4px;' });
        row.title = 'tap to inspect this leg';
        row.appendChild(el('span', { style: 'font-size:15px;' }, '🚗'));
        var dur = item.durationH;
        var durTxt = (dur >= 1 ? dur.toFixed(dur % 1 ? 1 : 0) + 'h' : Math.round(dur * 60) + 'm');
        row.appendChild(el('div', null,
          'Drive <b>' + fmtHMonly(item.startWall) + '→' + fmtHMonly(item.endWall) + '</b> (' + durTxt + ') toward ' +
          tpHeadLabel(item.heading, result.dest.name) +
          (item.note === 'arrival' ? ' &nbsp;🏁 <b>arrive at ' + result.dest.name + '</b>' : '') +
          ' <span style="color:#1565c0;font-size:11px;">🔍</span>' +
          (item.aimedAtStop ? '<br><span style="color:#7b1fa2;font-size:11px;">↪ ' + (item.aimNote || 'aimed at next stop') + '</span>' : '')));
        (function (it) {
          row.addEventListener('click', function (e) {
            if (e) e.stopPropagation();
            var s = result.slots[it.startSlotIdx];
            tpShowLegDetail(s, it.heading ? it.heading.palace : null,
              (s ? s.legType : 'Leg') + ' — ' + (it.heading ? it.heading.dir : ''));
          });
        })(item);
        wrap.appendChild(row);
      } else { // stop
        var srow = el('div', { style: 'display:flex;gap:8px;align-items:flex-start;margin:4px 0 4px 4px;font-size:13px;color:#8a4b00;cursor:pointer;border-radius:6px;padding:2px 4px;' });
        srow.title = 'tap to inspect the restart';
        srow.appendChild(el('span', { style: 'font-size:15px;' }, item.charge ? '🔌' : '🛑'));
        var body = item.charge
          ? '<b>Charge ' + item.durationMin + ' min</b> at <b>' + fmtHMonly(item.atWall) + '</b> (reset)' +
            '<br>set off at <b>' + fmtHMonly(item.restartWall) + '</b> in ' + item.restartSlotLabel +
            ' toward ' + tpHeadLabel(item.newHeading, result.dest.name) +
            (item.chargeHint && item.chargeHint.dir
              ? '<br><span style="color:#1565c0;">💡 charging ' + (item.chargeHint.earlier ? 'earlier' : 'later') +
                ' (window ' + item.chargeHint.wall + ', ' + item.chargeHint.label +
                ') you would set off toward ' + tpHeadLabel(item.chargeHint.dir, result.dest.name) + '</span>'
              : '')
          : '<b>Stop ≥20 min</b> at <b>' + fmtHMonly(item.atWall) + '</b> — ' + item.reason +
            '<br>then set off toward ' + tpHeadLabel(item.newHeading, result.dest.name);
        srow.appendChild(el('div', null, body + ' <span style="color:#1565c0;font-size:11px;">🔍</span>'));
        (function (it) {
          srow.addEventListener('click', function (e) {
            if (e) e.stopPropagation();
            var idx = (it.restartSlotIdx != null) ? it.restartSlotIdx : it.slotIdx;
            var s = result.slots[idx];
            tpShowLegDetail(s, it.newHeading ? it.newHeading.palace : null,
              'Restart — ' + (it.newHeading ? it.newHeading.dir : ''));
          });
        })(item);
        wrap.appendChild(srow);
      }
    });

    if (!plan.length) {
      wrap.appendChild(el('div', { style: 'color:#b00;font-size:13px;' }, 'No plan: no favourable direction in the period.'));
    }
    container.appendChild(wrap);
  }

  function tpRender(result, container) {
    container.innerHTML = '';
    var head = el('div', { style: 'margin:6px 0 10px;font-size:13px;color:#333;' },
      '🧭 Bearing to <b>' + result.dest.name + '</b>: ' + Math.round(result.bearing) +
      '° (≈ <b>' + result.snapDir + '</b>). Directions marked <b>→' + result.dest.name +
      '</b> head toward the destination. Chips show the <b>combined</b> score (direction + hour synergy).');
    container.appendChild(head);

    // ---- Real-route vs straight-line banner (Phase C) ----
    if (result.usedRealRoute) {
      var rm = result.routeMeta || {};
      var rmTxt = '';
      if (rm.km) {
        rmTxt = ' (' + Math.round(rm.km) + ' km';
        if (rm.durationSec) {
          var rh = Math.floor(rm.durationSec / 3600), rmn = Math.round((rm.durationSec % 3600) / 60);
          rmTxt += ' · ' + rh + 'h' + String(rmn).padStart(2, '0') + ' driving';
        }
        rmTxt += ' · ' + (rm.points || 0) + ' path points)';
      }
      container.appendChild(el('div', {
        style: 'margin:6px 0 10px;padding:8px 10px;border-radius:8px;background:#f3fbf5;color:#1b5e20;font-size:12px;border:1px solid #1b8a3f;'
      }, '📍 Directions follow the <b>real road</b> from the route service' + rmTxt +
         '. Each decision moment\u2019s bearing and solar time use its true position along the polyline ' +
         '(constant average speed — V2a).'));
    } else {
      container.appendChild(el('div', {
        style: 'margin:6px 0 10px;padding:8px 10px;border-radius:8px;background:#fff4e5;color:#8a4b00;font-size:12px;'
      }, '➖ Using a <b>straight line</b> ' + result.origin.name + '→' + result.dest.name +
         ' (no live route fetched). Set the Worker URL and press SCAN TRIP to follow the real road.'));
    }

    if (!result.hasHourData) {
      container.appendChild(el('div', {
        style: 'margin:6px 0 10px;padding:8px 10px;border-radius:8px;background:#fff4e5;color:#8a4b00;font-size:12px;'
      }, '⚠️ Hour score unavailable: run a <b>BEST scan</b> over the trip dates first (with the right person active). ' +
         'Then reopen the planner. For now you only see the direction score.'));
    }

    // ---- Recommended plan (stop suggester) ----
    tpRenderPlan(result, container);

    // ---- Detailed slot grid (reference) ----
    container.appendChild(el('div', { style: 'margin:14px 0 4px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;' }, 'Detail by double-hour'));

    result.slots.forEach(function (slot) {
      var card = el('div', { style: 'border:1px solid #d9d9e3;border-radius:8px;padding:8px 10px;margin:8px 0;background:#fafaff;' });

      // Hour-score badge
      var hb;
      if (slot.hourScore == null) hb = '<span style="color:#b58900;">hour n/a</span>';
      else if (slot.hourPositive) hb = '<span style="color:#1b8a3f;font-weight:700;">hour ✓ ' + slot.hourScore + ' (+' + slot.synergyApplied + ')</span>';
      else hb = '<span style="color:#999;">hour ' + slot.hourScore + ' &lt;8</span>';
      var legColor = slot.legType === 'Departure' ? '#c77800' : (slot.legType === 'Arrival' ? '#7b1fa2' : '#888');

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
          title: 'tap for details'
        }, label);
        chip.addEventListener('click', function (ev) {
          if (ev) ev.stopPropagation();
          tpShowLegDetail(slot, d.palace, slot.legType + ' — ' + d.dir +
            (d.towardDest ? ' →' + result.dest.name : ''));
        });
        grid.appendChild(chip);
      });
      card.appendChild(grid);
      container.appendChild(card);
    });

    if (!result.slots.length) {
      container.appendChild(el('div', { style: 'color:#b00;font-size:13px;' },
        'No slots computed — check date/time and that the libraries are loaded.'));
    }
  }

  function tpShowGuide() {
    var prev = document.getElementById('tp-guide-ov');
    if (prev) prev.parentNode.removeChild(prev);
    var ov = el('div', { id: 'tp-guide-ov',
      style: 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;' });
    var box = el('div', { style: 'background:#fff;border-radius:12px;max-width:580px;width:100%;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:system-ui,Arial,sans-serif;' });
    var steps = [
      ['Load the traveller', 'In the main view enter the person whose trip this is. The hour score (XKDG, spirits, Nayin) is computed for this person — without it you only get the direction score.'],
      ['Set the trip', 'Open TRAVEL PLANNER and set departure date & time, trip duration, and origin/destination (Vienna→Rome by default), plus UTC offset and DST.'],
      ['Press SCAN TRIP', 'The app automatically scans the trip dates (BEST) to compute each hour\u2019s score, then builds the plan. If an hour shows \u201chour n/a\u201d, make sure the person is loaded and scan again.'],
      ['Read the plan', '\uD83D\uDE97 legs show where to drive and toward which direction (\u2192Rome = toward the destination). \uD83D\uDED1/\uD83D\uDD0C mark stops/charges and the direction to set off afterwards. The number is the combined score (direction + hour synergy).'],
      ['Inspect any step', 'Tap a leg or a stop (\uD83D\uDD0D) to open its Rotating-Pan Qimen chart (chosen direction highlighted) and a button to open the full XKDG for that day in LIST.'],
      ['Your charging stops', 'Switch \u201cStops\u201d to \u201cMy charging stops\u201d and type your charge times (e.g. 15:30\u00d745). Each charge is treated as a reset; the planner judges it and may suggest shifting it by one double-hour.']
    ];
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<h3 style="margin:0;font-size:17px;">\uD83D\uDE97 Travel Planner — How to use</h3>' +
      '<span id="tp-guide-close" style="cursor:pointer;font-size:22px;color:#888;line-height:1;">\u2715</span></div>';
    html += '<ol style="margin:0;padding-left:22px;font-size:13px;line-height:1.5;color:#333;">';
    steps.forEach(function (s) {
      html += '<li style="margin-bottom:9px;"><b>' + s[0] + '.</b> ' + s[1] + '</li>';
    });
    html += '</ol>';
    html += '<div style="margin-top:12px;padding:9px 11px;background:#f3f7fb;border-radius:8px;font-size:12px;color:#444;">' +
      '<b>How scoring works.</b> A direction must pass the Qimen gate (one San Qi + a favourable door) to be eligible. ' +
      'The hour adds a synergy bonus when its score is \u2265 8 — strong at departure and arrival (+8), lighter on the way (+3).</div>';
    box.innerHTML = html;
    var done = el('button', { style: 'margin-top:14px;width:100%;padding:10px;border:0;border-radius:8px;background:#1b8a3f;color:#fff;font-size:14px;font-weight:600;cursor:pointer;' }, 'Got it');
    box.appendChild(done);
    ov.appendChild(box);
    document.body.appendChild(ov);
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.querySelector('#tp-guide-close').addEventListener('click', close);
    done.addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
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
      '<span><span id="tp-guide" style="cursor:pointer;font-size:13px;color:#1565c0;margin-right:14px;font-weight:600;">❔ Guide</span>' +
      '<span id="tp-close" style="cursor:pointer;font-size:22px;color:#888;line-height:1;">✕</span></span>'));

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
    form.appendChild(field('Departure (date)', 'tp-date', '2026-06-03', 'date'));
    form.appendChild(field('Departure (time)', 'tp-time', '12:00', 'time'));
    form.appendChild(field('Trip duration (hours)', 'tp-dur', '12', 'number'));
    form.appendChild(field('Max drive hours per leg', 'tp-maxleg', '4', 'number'));
    form.appendChild(field('UTC offset (base)', 'tp-utc', String(nowUtc), 'number'));
    form.appendChild(field('Origin lon (Vienna)', 'tp-olon', String(TP_DEFAULT.origin.lon), 'number'));
    form.appendChild(field('Origin lat', 'tp-olat', String(TP_DEFAULT.origin.lat), 'number'));
    form.appendChild(field('Dest lon (Rome)', 'tp-dlon', String(TP_DEFAULT.dest.lon), 'number'));
    form.appendChild(field('Dest lat', 'tp-dlat', String(TP_DEFAULT.dest.lat), 'number'));

    var dstWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;color:#444;grid-column:1 / span 2;' });
    var dstChk = el('input', { id: 'tp-dst', type: 'checkbox' });
    if (nowDst) dstChk.checked = true;
    dstWrap.appendChild(dstChk);
    dstWrap.appendChild(el('span', null, 'Daylight saving (DST) on'));
    form.appendChild(dstWrap);

    // Stop mode: auto suggester vs user-supplied charging stops
    var modeWrap = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#444;grid-column:1 / span 2;' }, 'Stops');
    var modeSel = el('select', { id: 'tp-stopmode',
      style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    modeSel.appendChild(el('option', { value: 'auto' }, 'Automatic (planner chooses)'));
    modeSel.appendChild(el('option', { value: 'mine' }, 'My charging stops (I enter them)'));
    modeWrap.appendChild(modeSel);
    form.appendChild(modeWrap);

    var chWrap = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#444;grid-column:1 / span 2;' },
      'Charging times (HH:MM, comma-separated; optional duration with ×min, e.g. 15:30×45)');
    chWrap.appendChild(el('input', { id: 'tp-charges', type: 'text', value: '',
      placeholder: 'e.g. 15:30×45, 19:30×30',
      style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' }));
    form.appendChild(chWrap);

    // Worker URL (Cloudflare proxy to Google Routes API)
    var wkWrap = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#444;grid-column:1 / span 2;' },
      'Worker URL (route proxy)');
    wkWrap.appendChild(el('input', { id: 'tp-worker', type: 'text', value: tpGetWorkerUrl(),
      placeholder: 'https://xkdg-proxy.<name>.workers.dev/',
      style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' }));
    form.appendChild(wkWrap);

    panel.appendChild(form);

    var btn = el('button', {
      style: 'width:100%;padding:10px;border:0;border-radius:8px;background:#1565c0;color:#fff;' +
        'font-size:14px;font-weight:600;cursor:pointer;'
    }, 'SCAN TRIP');
    panel.appendChild(btn);

    // Fetch route (test the app <-> Worker dialogue, without touching the plan yet)
    var routeBtn = el('button', {
      style: 'width:100%;margin-top:8px;padding:9px;border:1px solid #1565c0;border-radius:8px;background:#fff;color:#1565c0;' +
        'font-size:13px;font-weight:600;cursor:pointer;'
    }, '🛰️ Fetch route (test Worker)');
    panel.appendChild(routeBtn);
    var routeInfo = el('div', { id: 'tp-route-info', style: 'margin-top:8px;font-size:12px;' });
    panel.appendChild(routeInfo);

    routeBtn.addEventListener('click', function () {
      var url = (document.getElementById('tp-worker').value || '').trim();
      if (!url) { routeInfo.innerHTML = '<span style="color:#b00;">Enter the Worker URL first.</span>'; return; }
      tpSetWorkerUrl(url);
      var O = { lat: parseFloat(document.getElementById('tp-olat').value), lng: parseFloat(document.getElementById('tp-olon').value) };
      var D = { lat: parseFloat(document.getElementById('tp-dlat').value), lng: parseFloat(document.getElementById('tp-dlon').value) };
      routeInfo.innerHTML = '<span style="color:#666;">Contacting Worker…</span>';
      tpFetchRoute(url, O, D).then(function (r) {
        TP_LAST_ROUTE = r;
        var km = (r.distanceMeters / 1000).toFixed(0);
        var h = Math.floor(r.durationSec / 3600), m = Math.round((r.durationSec % 3600) / 60);
        routeInfo.innerHTML =
          '<div style="border:1px solid #1b8a3f;border-radius:8px;padding:8px 10px;background:#f3fbf5;color:#1b5e20;">' +
          '✓ Route received — <b>' + km + ' km</b>, driving time <b>' + h + 'h' + String(m).padStart(2, '0') + '</b>, ' +
          '<b>' + r.coords.length + '</b> path points.<br>' +
          '<span style="color:#666;font-size:11px;">First point ' + r.coords[0][1].toFixed(4) + ', ' + r.coords[0][0].toFixed(4) +
          ' · last ' + r.coords[r.coords.length - 1][1].toFixed(4) + ', ' + r.coords[r.coords.length - 1][0].toFixed(4) + '</span></div>';
      }).catch(function (e) {
        routeInfo.innerHTML = '<div style="border:1px solid #b00;border-radius:8px;padding:8px 10px;background:#fff4f4;color:#b00;">✗ ' + e.message + '</div>';
      });
    });

    var results = el('div', { id: 'tp-results', style: 'margin-top:12px;' });
    panel.appendChild(results);

    ov.appendChild(panel);
    document.body.appendChild(ov);

    ov.querySelector('#tp-close').addEventListener('click', function () { ov.style.display = 'none'; });
    ov.querySelector('#tp-guide').addEventListener('click', tpShowGuide);
    // Show the guide automatically the first time the planner is opened this session.
    if (!window._tpGuideShown) { window._tpGuideShown = true; tpShowGuide(); }
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
          dest: { lat: parseFloat(document.getElementById('tp-dlat').value), lon: parseFloat(document.getElementById('tp-dlon').value), name: 'Rome' }
        };
        opts.origin.name = 'Vienna';
        opts.stopMode = document.getElementById('tp-stopmode').value;
        opts.charges = tpParseCharges(document.getElementById('tp-charges').value, dep);

        // Auto-scan BEST over the trip dates to fill the hour-score cache, so the
        // user doesn't have to do it manually. Defensive: if anything fails we
        // fall back to whatever cache exists (and the "hour n/a" banner).
        try {
          if (typeof runScanner === 'function') {
            var ss = document.getElementById('scan-start');
            var sd = document.getElementById('scan-days');
            var prevStart = ss ? ss.value : null;
            var prevDays = sd ? sd.value : null;
            if (ss) ss.value = dStr;
            if (sd) sd.value = String(Math.ceil((opts.durationH || 12) / 24) + 1);
            runScanner();
            if (ss && prevStart != null) ss.value = prevStart;
            if (sd && prevDays != null) sd.value = prevDays;
          }
        } catch (autoErr) { /* keep going; manual scan / banner is the fallback */ }

        // ---- Build + render. The route may be supplied (real road) or null. --
        function buildAndRender(route, fetchNote) {
          try {
            opts.route = route || null;
            var res = tpPlan(opts);
            tpRender(res, results);
            if (fetchNote) {
              var n = el('div', { style: 'margin-top:6px;font-size:11px;color:#b58900;' }, fetchNote);
              results.appendChild(n);
            }
          } catch (err) {
            results.innerHTML = '<div style="color:#b00;font-size:13px;">Error: ' + err.message + '</div>';
          }
        }

        // ---- PHASE C: fetch the real route from the Worker, then build. ------
        // Reuse a route already fetched (e.g. via the test button) if the
        // endpoints match. Defensive: any failure -> straight-line fallback.
        var url = (document.getElementById('tp-worker').value || '').trim();
        var O = { lat: opts.origin.lat, lng: opts.origin.lon };
        var D = { lat: opts.dest.lat, lng: opts.dest.lon };
        var haveMatch = TP_LAST_ROUTE && tpRouteMatches(TP_LAST_ROUTE, O, D);

        if (haveMatch) {
          buildAndRender(TP_LAST_ROUTE);
        } else if (url) {
          tpSetWorkerUrl(url);
          results.innerHTML = '<div style="font-size:13px;color:#666;">Fetching real route from the Worker…</div>';
          tpFetchRoute(url, O, D).then(function (r) {
            TP_LAST_ROUTE = r;
            buildAndRender(r);
          }).catch(function (e) {
            buildAndRender(null, 'Route fetch failed (' + e.message + ') — used the straight-line fallback. ' +
              'You can retry with 🛰️ Fetch route to see the error in detail.');
          });
        } else {
          buildAndRender(null);
        }
      } catch (err) {
        results.innerHTML = '<div style="color:#b00;font-size:13px;">Error: ' + err.message + '</div>';
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
  // Expose tpOpen as a global so the TRAVEL PLANNER tab button (onclick="tpOpen()") works.
  window.tpOpen = tpOpen;
})();

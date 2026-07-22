// redeploy bump 2026-07-04b — force redeploy (no logic change)
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
  // The gate now requires only a FAVOURABLE DOOR. Missing San Qi, a Warrior, or
  // a Tiger no longer reject a direction — they make it a FALLBACK, used only
  // when no cleaner direction (San Qi + favourable door, no Warrior/Tiger) is
  // available in that double-hour. The penalties below order the fallbacks.
  var TP_EXCLUDE_WARRIOR = false;   // Warrior no longer hard-rejected (now a fallback)
  // Internal Tian-Di clash: 'exclude' = hard reject, 'penalty' = lower score,
  // 'ignore' = no effect. Default = soft penalty.
  var TP_CLASH_MODE = 'penalty';
  var TP_CLASH_PENALTY = -1;

  // Score bonuses (auspicious extras above the minimum)
  var TP_BONUS_ZHIFU = 1;   // 直符 Zhi Fu at the palace
  var TP_BONUS_ZHISHI = 1;  // 直使 Zhi Shi at the palace
  var TP_BONUS_CONFIG = 1;  // each named auspicious config (Dun/Pretense/Borrow)

  // A usable (gated) direction always scores POSITIVE — low for a fallback,
  // higher for a clean one. We build the score additively from a positive base
  // plus bonuses (no negative penalties), and never let it fall below the floor.
  var TP_SCORE_BASE = 1;       // base for any direction that passes the gate (favourable door)
  var TP_SCORE_FLOOR = 1;      // a usable direction's score is never below this (> 0)
  var TP_BONUS_SANQI = 2;      // San Qi present on the Heaven plate (clean)
  var TP_BONUS_GOODDEITY = 1;  // deity is NOT Warrior/Tiger (clean)

  // ---- HOUR positivity + synergy (from the app's BEST score, via cache) ----
  // An hour counts as "positive" when its native app score is >= this:
  var TP_HOUR_THRESHOLD = 8;
  // Synergy bonus when a positive hour coincides with a gated direction:
  var TP_SYNERGY_ENDS = 8;  // at departure and at arrival
  var TP_SYNERGY_MID = 3;   // at intermediate legs

  // ---- Google Maps export (Phase D) ---------------------------------------
  // Consumer Google Maps keeps a limited number of intermediate stops in a
  // shared "directions" link. Beyond this we warn (Maps may drop the extras).
  var TP_MAPS_MAX_WAYPOINTS = 9;
  // "Shortest possible" guard: a planned cashing/quadrant stop is added to the
  // Maps route ONLY if it sits within this many km of the fastest real road.
  // Beyond it (or with no real route at all) we export the DIRECT route so the
  // trip is never lengthened by an off-road waypoint.
  var TP_WAYPOINT_MAX_OFFKM = 3;

  // ---- Access lock (preview gate) -----------------------------------------
  // The Travel Planner is gated behind a code while the feature is in
  // development. Set TP_LOCK_ENABLED = false to remove the gate when it's
  // ready for everyone. The code is asked once per session (page load).
  var TP_LOCK_ENABLED = true;
  var TP_LOCK_CODE = '9861';
  // Persist the unlock across reloads: once the correct code is entered, the
  // planner stays unlocked (so the AI flow is never interrupted by the prompt).
  var tpUnlocked = (function () { try { return localStorage.getItem('xkdg_tp_unlocked') === '1'; } catch (e) { return false; } })();

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
  // Google Places (New) proxy — turns a point+category into a REAL named place.
  // Optional: if not deployed/reachable, the planner silently falls back to OSM.
  var TP_PLACES_WORKER_DEFAULT = 'https://xkdg-places.decumano16.workers.dev';
  // Ticketmaster (Discovery) proxy — turns a point + date window + category into
  // REAL dated events. Optional: if not deployed/reachable, event search silently
  // returns nothing and the rest of the planner is unaffected.
  var TP_EVENTS_WORKER_DEFAULT = 'https://xkdg-events.decumano16.workers.dev';
  function tpGetWorkerUrl() {
    try { return localStorage.getItem('xkdg_worker_url') || TP_DEFAULT_WORKER; } catch (e) { return TP_DEFAULT_WORKER; }
  }
  function tpSetWorkerUrl(u) { try { localStorage.setItem('xkdg_worker_url', u); } catch (e) {} }

  // ---- Open Charge Map (Phase F): real charging stations -------------------
  // The OCM key runs client-side (OCM designed it that way); kept in the panel
  // and persisted, never hard-coded here. Networks are matched against each
  // station's operator name (case-insensitive substring) — easily extensible.
  function tpGetOcmKey() { try { return localStorage.getItem('xkdg_ocm_key') || ''; } catch (e) { return ''; } }
  function tpSetOcmKey(k) { try { localStorage.setItem('xkdg_ocm_key', k); } catch (e) {} }
  // Hands-free: ON by default, so the whole flow is automatic. After the AI computes an itinerary the app
  // navigates itself to Google Maps (no tap). Turns off only if the user unticks it (stored '0').
  function tpReportCharger(info) {
    try { if (window.XKDGChat && typeof window.XKDGChat.updateItineraryCharging === 'function') window.XKDGChat.updateItineraryCharging(info); } catch (e) {}
  }
  function tpAutoMapsOn() { try { return localStorage.getItem('xkdg_tp_automaps') === '1'; } catch (e) { return false; } }   // default OFF: Maps opens only on an explicit command/tap
  function tpSetAutoMaps(on) { try { localStorage.setItem('xkdg_tp_automaps', on ? '1' : '0'); } catch (e) {} }

  // --- Live charge from the car (Strada 2) ---------------------------------
  // The last range read from the Polestar, kept so any later plan (even with the
  // panel closed, even one launched by the AI) can use the real remaining range.
  function tpGetLiveRange() {
    try { var o = JSON.parse(localStorage.getItem('xkdg_tp_live_range') || 'null'); return (o && isFinite(o.km)) ? o : null; } catch (e) { return null; }
  }
  function tpSetLiveRange(km, soc) {
    try { localStorage.setItem('xkdg_tp_live_range', JSON.stringify({ km: Math.round(km), soc: (soc != null ? Math.round(soc) : null), ts: Date.now() })); } catch (e) {}
  }
  // The car's REAL full range at 100% for the way THIS driver actually drives
  // (mostly motorway → higher consumption than the dashboard estimate). Persisted
  // so range = SoC% x this, which matches reality far better than the car's own
  // optimistic "distance to empty". Default 450; the user calibrates it.
  function tpGetFullRange() {
    try { var v = parseFloat(localStorage.getItem('xkdg_tp_fullrange')); return (isFinite(v) && v > 0) ? v : 450; } catch (e) { return 450; }
  }
  function tpSetFullRange(km) {
    try { if (isFinite(km) && km > 0) localStorage.setItem('xkdg_tp_fullrange', String(Math.round(km))); } catch (e) {}
  }

  // --- Range-forced EV charging stops (Phase E) ----------------------------
  // The default charge level reached at a fast stop on a trip (DC slows a lot
  // past 80%). Tunable.
  var TP_CHARGE_TARGET = 0.80;
  var TP_LAST_MAPS_CHECKS = [];   // {cb, pos, stop}[] from the LAST Maps-export render;
                                   // lets Phase F uncheck a stop it proves unnecessary.

  // --- EV DC fast-charging curve (session 23, Edu's real car numbers) ------
  // Two-segment power(SoC%) model: flat at peak power up to a plateau SoC,
  // then a power-law taper down toward empty. There is only ONE real
  // calibration point today — Edu's Polestar 2: 79 kWh usable, 205 kW peak,
  // 10% -> 80% in 30 min. EV_TAPER_GAMMA was solved offline (bisection) so
  // this exact model reproduces that number: tpEvChargeTimeMin(10,80) = 30.
  // If Edu ever gets a second real data point (e.g. a slower-SoC segment or
  // a cold-weather run), re-solve gamma against BOTH points instead of
  // guessing — this shape is a plausible curve fitted to one measurement,
  // not a manufacturer spec.
  var EV_USABLE_KWH  = 79;
  var EV_PEAK_KW     = 205;
  var EV_PLATEAU_END = 20;      // % SoC below which power stays flat at peak
  var EV_TAPER_GAMMA = 1.1093;  // calibrated so 10% -> 80% = exactly 30 min

  function tpEvPowerAtSoc(socPct) {
    var s = Math.max(0, Math.min(100, socPct));
    if (s <= EV_PLATEAU_END) return EV_PEAK_KW;
    var t = (s - EV_PLATEAU_END) / (100 - EV_PLATEAU_END);
    return EV_PEAK_KW * Math.pow(1 - t, EV_TAPER_GAMMA);
  }
  // Numerically integrates charge time (whole minutes) from socFrom% to socTo%.
  // capKw optional: caps the curve at a realistic sustained power (e.g. 150 kW at a
  // REAL station along the road, rather than the car's own 205 kW peak — Edu, session
  // 23: "limitare l'ottimistica previsione di una carica a 200kW ai più normali 150").
  // Default (no capKw) = the car's own peak, unchanged: Phase E's forced-range stops
  // (mkCharge) keep calling this the old way and are NOT affected by this addition.
  function tpEvChargeTimeMin(socFrom, socTo, capKw) {
    if (!(socTo > socFrom)) return 0;
    var cap = (capKw != null && capKw > 0) ? capKw : EV_PEAK_KW;
    var steps = 40, dSoc = (socTo - socFrom) / steps, hours = 0;
    for (var i = 0; i < steps; i++) {
      var soc = socFrom + dSoc * (i + 0.5);
      var p = Math.min(tpEvPowerAtSoc(soc), cap);
      var dKwh = EV_USABLE_KWH * (dSoc / 100);
      if (p > 0) hours += dKwh / p;
    }
    return Math.round(hours * 60);
  }
  function tpEvEnergyKwh(socFrom, socTo) {
    if (!(socTo > socFrom)) return 0;
    return Math.round(EV_USABLE_KWH * (socTo - socFrom) / 100 * 10) / 10;
  }

  // Two usable-range numbers for an EV trip:
  //   firstKm = how far you can go RIGHT NOW (current charge, minus reserve)
  //   afterKm = how far you can go after a fast charge to TP_CHARGE_TARGET
  // Returns null when there is no EV range set (then no charge stops are forced).
  function tpEvRangePlan() {
    try {
      var firstKm = 0;
      var lr = tpGetLiveRange();
      if (lr && (Date.now() - lr.ts) < 2 * 3600000 && lr.km > 0) firstKm = lr.km;
      else { var rEl = document.getElementById('tp-range'); var v = rEl ? parseFloat(rEl.value) : NaN; if (isFinite(v) && v > 0) firstKm = v; }
      if (!(firstKm > 0)) return null;
      var reserve = 15;
      var resEl = document.getElementById('tp-reserve');
      if (resEl) { var rv = parseFloat(resEl.value); if (isFinite(rv)) reserve = rv; }
      var resFrac = Math.max(0, Math.min(0.9, reserve / 100));
      var full = tpGetFullRange();
      var firstUsable = firstKm * (1 - resFrac);
      var afterUsable = (full > 0) ? (TP_CHARGE_TARGET * full * (1 - resFrac)) : firstUsable;
      if (!(firstUsable > 0)) return null;
      if (!(afterUsable > 0)) afterUsable = firstUsable;
      // Real starting SoC%, for the charging-curve model. Prefer the car's own
      // reported SoC (tpGetLiveRange().soc); fall back to estimating it from
      // firstKm/full when only a manual range was entered. null when neither
      // is available — callers must treat that as "no curve data" and fall
      // back to the old fixed duration, never guess a number.
      var soc0 = null;
      if (lr && lr.soc != null && isFinite(lr.soc)) soc0 = lr.soc;
      else if (full > 0) soc0 = Math.min(100, (firstKm / full) * 100);
      return { firstKm: firstUsable, afterKm: afterUsable, soc0: soc0, fullKm: (full > 0 ? full : null) };
    } catch (e) { return null; }
  }
  // Walk the leg/stop timeline and SPLIT any leg whose distance exceeds the
  // usable range, inserting a charge stop. The FIRST gap uses the current
  // charge (firstKm); every gap after a charge uses the post-charge range
  // (afterKm). Additive only: never removes the favourable (auspicious) stops.
  // time<->distance is linear here (posAt maps a time fraction to a distance
  // fraction of the real route), so range thresholds become time thresholds.
  function tpInsertRangeCharges(plan, ev, totalKm, startMs, spanMs, posAt) {
    if (!ev || !(ev.firstKm > 0) || !(totalKm > 0) || !(spanMs > 0) || !plan || !plan.length) return plan;
    var firstMs = (ev.firstKm / totalKm) * spanMs;
    var afterMs = (ev.afterKm > 0 ? (ev.afterKm / totalKm) * spanMs : firstMs);
    if (!(firstMs > 0)) return plan;
    if (!(afterMs > 0)) afterMs = firstMs;
    var SLACK = 1.05, MIN_LEG_MS = 4 * 60000, MAX_INS = 15;
    var out = [], inserted = 0, lastChargeMs = null, limit = firstMs;
    // Real-SoC tracking, parallel to the existing km/ms bookkeeping above.
    // curSegStartSoc = the SoC% at the start of the current "segment" (since
    // departure, or since the last stop/charge). It mirrors the SAME reset
    // assumption already baked into `limit` (every stop is assumed to leave
    // you at TP_CHARGE_TARGET usable range) — so a real charge stop's SoC
    // stays consistent with WHEN the existing algorithm decided to place it.
    // null (no live SoC / no full-range figure) -> every mkCharge() call below
    // falls back to the old fixed 20 min, never a guessed number.
    var curSegStartSoc = (ev.soc0 != null && isFinite(ev.soc0)) ? ev.soc0 : null;
    var pctPerKm = (ev.fullKm > 0) ? (100 / ev.fullKm) : null;
    var TARGET_PCT = TP_CHARGE_TARGET * 100;
    function mkLeg(s, e, head, note, ss, es) {
      return { type: 'leg', startWall: new Date(s), endWall: new Date(e), heading: head,
        startSlotIdx: (ss != null ? ss : null), endSlotIdx: (es != null ? es : null),
        durationH: (e - s) / 3600000, note: note || '' };
    }
    // Self-contained fortune check for a charge stop's arrival slot (session 23).
    // Duplicates tpPlan's own roadFortunate() logic (same slot.dirs/bearingDest
    // fields, populated once per slot and carried through) rather than threading a
    // closure reference across functions — a charge stop landing in a fortunate
    // hour IS fortunate; it was never even checked before.
    function chargeSlotFortunate(slotIdx) {
      if (slotIdx == null) return false;
      var slot = slots[slotIdx];
      if (!slot) return false;
      // slot.bearingDest is set unconditionally for every slot (tpPlan's own
      // build loop) — no outer-scope fallback needed or available here.
      var deg = slot.bearingDest;
      var name = tpSnapDir(deg);
      var ds = slot.dirs || [];
      for (var k = 0; k < ds.length; k++) {
        if (ds[k].dir === name) return !!(ds[k].eval && ds[k].eval.ok);
      }
      return false;
    }
    function mkCharge(tc, head, slotIdx, socFrom) {
      var p = posAt(tc);
      var targetPct = TP_CHARGE_TARGET * 100;
      // Real duration/kWh only when we know where the battery actually stood at
      // arrival (socFrom, from the curve model). Otherwise fall back to the old
      // fixed 20 min — never invent a SoC number to force the curve to run.
      var hasSoc = (socFrom != null && isFinite(socFrom) && socFrom < targetPct);
      var durMin = hasSoc ? Math.max(5, tpEvChargeTimeMin(socFrom, targetPct)) : 20;
      var kwh = hasSoc ? tpEvEnergyKwh(socFrom, targetPct) : null;
      // BUGFIX (session 23): restartWall used to equal atWall (charge duration
      // was never actually added to the restart time) — the "restart" shown to
      // the user was really just the arrival time.
      var restart = new Date(tc + durMin * 60000);
      return { type: 'stop', charge: true, durationMin: durMin, atWall: new Date(tc), restartWall: restart,
        newHeading: head, pos: { lat: p.lat, lon: p.lon }, cashDir: null, limitDeg: null,
        slotIdx: (slotIdx != null ? slotIdx : null), reason: 'charging stop (battery range)',
        // FIX (session 23): this used to be hardcoded false — a charging stop was
        // NEVER counted as fortunate no matter when it landed. Edu: "voglio che le
        // tappe di ricarica stiano dentro un itinerario fortunato" — the very first
        // step is to actually SEE when they already are.
        fortunate: chargeSlotFortunate(slotIdx), rangeForced: true,
        socFrom: (hasSoc ? Math.round(socFrom) : null), socTo: (hasSoc ? Math.round(targetPct) : null),
        kwh: kwh };
    }
    for (var i = 0; i < plan.length; i++) {
      var it = plan[i];
      if (it.type === 'leg') {
        var s = it.startWall.getTime(), e = it.endWall.getTime();
        if (lastChargeMs == null) lastChargeMs = s;
        var curStart = s;
        while (inserted < MAX_INS && (e - lastChargeMs) > limit * SLACK) {
          var tc = lastChargeMs + limit;
          if (tc <= curStart) tc = curStart + Math.max(MIN_LEG_MS, limit);
          if (tc >= e - MIN_LEG_MS) break;   // close enough to the leg's own stop — charge there instead
          out.push(mkLeg(curStart, tc, it.heading, '', it.startSlotIdx, it.endSlotIdx));
          // Real SoC at arrival: elapsed range since the last reset (start,
          // stop, or charge), converted from km to % via the full-range figure.
          var socFromNow = null;
          if (curSegStartSoc != null && pctPerKm != null && spanMs > 0) {
            var elapsedKm = ((tc - lastChargeMs) / spanMs) * totalKm;
            socFromNow = Math.max(0, curSegStartSoc - elapsedKm * pctPerKm);
          }
          out.push(mkCharge(tc, it.heading, it.endSlotIdx, socFromNow));
          // ROOT FIX (session 23): curStart/lastChargeMs used to advance to `tc`
          // (ARRIVAL at the charger) — the charge's own duration was computed and
          // shown on the stop, but the NEXT driving leg silently started at the
          // same instant, as if charging took zero minutes. Read the charge just
          // pushed and resume from ITS restartWall (arrival + real duration).
          var _justCharged = out[out.length - 1];
          var _restartMs = (_justCharged && _justCharged.restartWall) ? _justCharged.restartWall.getTime() : tc;
          inserted++; curStart = _restartMs; lastChargeMs = _restartMs; limit = afterMs; curSegStartSoc = TARGET_PCT;
        }
        out.push(mkLeg(curStart, e, it.heading, it.note, it.startSlotIdx, it.endSlotIdx));
      } else if (it.type === 'stop') {
        out.push(it);
        if (it.atWall) { lastChargeMs = it.atWall.getTime(); limit = afterMs; curSegStartSoc = TARGET_PCT; }
      } else { out.push(it); }
    }
    return out;
  }
  // Ask the xkdg-soc Worker for the live SoC + remaining range. Reads the Worker
  // URL from localStorage (set in the planner), stores the live range, and fills
  // the form fields if the panel is open. Returns a Promise.
  function tpReadChargeFromCar() {
    return new Promise(function (resolve, reject) {
      var wk = '';
      try { wk = (localStorage.getItem('xkdg_tp_soc_worker') || '').trim(); } catch (e) {}
      if (!wk) { reject(new Error('No SoC Worker URL set (open the planner \u2192 \uD83D\uDD0B Range & charging).')); return; }
      fetch(wk, { method: 'GET' }).then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.error) throw new Error(d.error);
        var soc = (d && d.soc != null) ? Number(d.soc) : null;
        var carKm = (d && d.rangeKm != null) ? Number(d.rangeKm) : null;   // car's own estimate (knows RECENT real consumption)
        var fr = tpGetFullRange();
        // PRUDENT range = the MINIMUM of the two available estimates:
        //   (a) SoC% x the driver's calibrated full range (static model of this driver), and
        //   (b) the car's own estimate, which incorporates the RECENT real consumption
        //       (climbs, cold, headwind) that the static model cannot see.
        // The car's number is usually optimistic on a flat cruise (then (a) wins), but
        // after an Alpine stretch or in winter it can be LOWER than (a) — and then it is
        // the truer figure. Taking the minimum is always the safe side.
        var modelKm = (soc != null && isFinite(soc) && fr > 0) ? Math.round(soc * fr / 100) : null;
        var realKm = (modelKm != null && carKm != null && isFinite(carKm) && carKm > 0)
                   ? Math.min(modelKm, Math.round(carKm))
                   : (modelKm != null ? modelKm : ((carKm != null && isFinite(carKm)) ? Math.round(carKm) : null));
        if (realKm != null && realKm > 0) tpSetLiveRange(realKm, soc);
        try {
          var socEl = document.getElementById('tp-soc'), rgEl = document.getElementById('tp-range');
          if (socEl && soc != null) socEl.value = String(Math.round(soc));
          if (rgEl && realKm != null && realKm > 0) rgEl.value = String(realKm);
        } catch (e) {}
        resolve({ soc: soc, rangeKm: realKm, carKm: carKm, fullRange: fr, charging: !!(d && d.charging), raw: d });
      }).catch(function (e) { reject(e instanceof Error ? e : new Error(String(e))); });
    });
  }
  // Open the current itinerary in Google Maps. navigate=true changes the current tab (NOT blocked by pop-up
  // blockers, works with no tap) - used hands-free. Otherwise open a new tab (keeps the app), falling back to
  // navigation if the pop-up is blocked.
  function tpOpenInMaps(navigate) {
    var b = document.getElementById('tp-maps-open');
    var url = b && b._url;
    if (!url) return { ok: false, reason: 'no_itinerary', note: 'No computed itinerary yet — plan a trip first.' };
    if (navigate) {
      // NAVIGATION (sent to the car): drop the PLANNED origin from the URL. Google Maps
      // then starts from "your location" — the car's REAL position — so the navigator
      // locks onto the route immediately. With a fixed generic origin (e.g. Vienna city
      // centre) the Polestar received a route starting where the car was NOT, and did
      // not recognise it. The inspect link (navigate=false) keeps the planned origin.
      var navUrl = url.replace(/([?&])origin=[^&]*&?/, '$1').replace(/[?&]$/, '');
      try { window.location.href = navUrl; } catch (e) {}
      return { ok: true, navigated: true, url: navUrl };
    }
    var w = null; try { w = window.open(url, '_blank'); } catch (e) {}
    if (!w) { try { window.location.href = url; } catch (e) {} return { ok: true, navigated: true, url: url }; }
    return { ok: true, opened: true, url: url };
  }
  var TP_NETWORKS = [
    { id: 'tesla', label: 'Tesla Supercharger', match: ['tesla'] },
    { id: 'electra', label: 'Electra', match: ['electra'] }
    // future: { id:'ionity', label:'Ionity', match:['ionity'] }, etc.
  ];
  // Only consider FAST charging by default. A Tesla "Destination Charger" is ~11 kW (hours to charge) and must be
  // skipped; real fast DC is >= 150 kW. If no Tesla/Electra fast station is reachable, we fall back to ANY operator
  // that is still fast (>= this threshold).
  var TP_MIN_KW = 150;
  // Secondary floor: if nothing >=150 kW is reachable, accept >=80 kW rather than nothing (still usable; ~30-45 min).
  var TP_MIN_KW2 = 80;

  // ---- Recent places (auto-saved origins/destinations) --------------------
  // Saved on this device only. Each: { name, lat, lon, utc|null }. Most recent
  // first, de-duplicated by name, capped at 20.
  function tpGetRecents() {
    try { var a = JSON.parse(localStorage.getItem('xkdg_tp_recents') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function tpSaveRecents(list) { try { localStorage.setItem('xkdg_tp_recents', JSON.stringify(list.slice(0, 20))); } catch (e) {} }
  function tpAddRecent(place) {
    if (!place || !place.name || !isFinite(place.lat) || !isFinite(place.lon)) return;
    var nm = String(place.name).trim();
    var list = tpGetRecents().filter(function (r) { return r.name.toLowerCase() !== nm.toLowerCase(); });
    list.unshift({ name: nm, lat: place.lat, lon: place.lon, utc: (place.utc != null ? place.utc : null) });
    tpSaveRecents(list);
  }
  function tpFindRecent(name) {
    var n = (name || '').trim().toLowerCase();
    if (!n) return null;
    return tpGetRecents().filter(function (r) { return r.name.toLowerCase() === n; })[0] || null;
  }
  function tpRemoveRecent(name) {
    var n = (name || '').trim().toLowerCase();
    tpSaveRecents(tpGetRecents().filter(function (r) { return r.name.toLowerCase() !== n; }));
  }
  // Keep the shared city datalist's "recent" options in sync (so typing the
  // first letters of a recent place suggests it).
  function tpSyncRecentDatalist() {
    var dl = document.getElementById('tp-city-list'); if (!dl) return;
    [].slice.call(dl.querySelectorAll('option[data-recent="1"]')).forEach(function (o) { o.parentNode.removeChild(o); });
    var recs = tpGetRecents();
    for (var i = recs.length - 1; i >= 0; i--) {
      var o = document.createElement('option');
      o.value = recs[i].name; o.setAttribute('data-recent', '1');
      dl.insertBefore(o, dl.firstChild);
    }
  }

  // ---- Saved itineraries (Phase G1) ---------------------------------------
  // Save the "shape" of a trip (endpoints, stops, duration, params) under a
  // name, on this device. Reload to refill the form, then SCAN. The departure
  // date/time is saved too but is what "When to depart" will search over.
  function tpGetItineraries() {
    try { var a = JSON.parse(localStorage.getItem('xkdg_tp_itineraries') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function tpSaveItineraries(list) { try { localStorage.setItem('xkdg_tp_itineraries', JSON.stringify(list.slice(0, 40))); } catch (e) {} }
  function tpFindItinerary(name) {
    var n = (name || '').trim().toLowerCase();
    return tpGetItineraries().filter(function (it) { return it.name.toLowerCase() === n; })[0] || null;
  }
  function tpSaveItinerary(name, fields) {
    if (!name) return;
    var list = tpGetItineraries().filter(function (it) { return it.name.toLowerCase() !== name.toLowerCase(); });
    list.unshift({ name: name, fields: fields, savedAt: Date.now() });
    tpSaveItineraries(list);
  }
  function tpDeleteItinerary(name) {
    tpSaveItineraries(tpGetItineraries().filter(function (it) { return it.name.toLowerCase() !== (name || '').toLowerCase(); }));
  }
  // Read/write the whole planner form as a plain object.
  function tpCollectFields() {
    function v(id) { var e = document.getElementById(id); return e ? e.value : ''; }
    function chk(id) { var e = document.getElementById(id); return !!(e && e.checked); }
    var nets = {}; TP_NETWORKS.forEach(function (n) { nets[n.id] = chk('tp-net-' + n.id); });
    return {
      ocity: v('tp-ocity'), olat: v('tp-olat'), olon: v('tp-olon'),
      dcity: v('tp-dcity'), dlat: v('tp-dlat'), dlon: v('tp-dlon'),
      date: v('tp-date'), time: v('tp-time'), dur: v('tp-dur'), maxleg: v('tp-maxleg'),
      utc: v('tp-utc'), dst: chk('tp-dst'), stopmode: v('tp-stopmode'), charges: v('tp-charges'),
      worker: v('tp-worker'), range: v('tp-range'), reserve: v('tp-reserve'),
      soc: v('tp-soc'), fullrange: v('tp-fullrange'), nets: nets
    };
  }
  function tpApplyFields(f) {
    if (!f) return;
    function set(id, val) { var e = document.getElementById(id); if (e && val != null) e.value = val; }
    set('tp-ocity', f.ocity); set('tp-olat', f.olat); set('tp-olon', f.olon);
    set('tp-dcity', f.dcity); set('tp-dlat', f.dlat); set('tp-dlon', f.dlon);
    set('tp-date', f.date); set('tp-time', f.time); set('tp-dur', f.dur); set('tp-maxleg', f.maxleg);
    set('tp-utc', f.utc); set('tp-stopmode', f.stopmode); set('tp-charges', f.charges);
    set('tp-worker', f.worker); set('tp-range', f.range); set('tp-reserve', f.reserve);
    set('tp-soc', f.soc); set('tp-fullrange', f.fullrange);
    var dstEl = document.getElementById('tp-dst'); if (dstEl) dstEl.checked = !!f.dst;
    if (f.nets) TP_NETWORKS.forEach(function (n) { var c = document.getElementById('tp-net-' + n.id); if (c && f.nets[n.id] != null) c.checked = !!f.nets[n.id]; });
    var ms = document.getElementById('tp-stopmode'); if (ms) { try { ms.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} }
  }
  // The "📁 Itinerary" bar (name + Save, plus a Load/Delete picker).
  function tpBuildItineraryBar() {
    var bar = el('div', { style: 'grid-column:1 / span 2;border:1px solid #d0d7de;border-radius:8px;padding:8px 10px;background:#fafbfc;' });
    bar.appendChild(el('div', { style: 'font-weight:600;color:#333;margin-bottom:5px;' }, '📁 Itinerary'));
    var row1 = el('div', { style: 'display:flex;gap:6px;align-items:center;margin-bottom:6px;' });
    var nameInp = el('input', { id: 'tp-itin-name', type: 'text', placeholder: 'name (e.g. Home → Tuoro)',
      style: 'flex:1;min-width:0;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    var saveBtn = el('button', { type: 'button', style: 'padding:6px 10px;border:0;border-radius:6px;background:#1565c0;color:#fff;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;' }, '💾 Save');
    row1.appendChild(nameInp); row1.appendChild(saveBtn);
    bar.appendChild(row1);
    var row2 = el('div', { style: 'display:flex;gap:6px;align-items:center;' });
    var sel = el('select', { id: 'tp-itin-select', style: 'flex:1;min-width:0;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    var loadBtn = el('button', { type: 'button', style: 'padding:6px 10px;border:1px solid #1565c0;border-radius:6px;background:#fff;color:#1565c0;font-size:13px;font-weight:600;cursor:pointer;' }, '📂 Load');
    var delBtn = el('button', { type: 'button', title: 'Delete', style: 'padding:6px 9px;border:1px solid #b00;border-radius:6px;background:#fff;color:#b00;font-size:13px;cursor:pointer;' }, '🗑');
    row2.appendChild(sel); row2.appendChild(loadBtn); row2.appendChild(delBtn);
    bar.appendChild(row2);
    var status = el('div', { style: 'font-size:11px;color:#888;margin-top:4px;min-height:13px;' }, '');
    bar.appendChild(status);

    function refresh() {
      var its = tpGetItineraries();
      sel.innerHTML = '';
      if (!its.length) {
        var o0 = document.createElement('option'); o0.value = ''; o0.textContent = '— no saved itineraries —'; sel.appendChild(o0);
      } else its.forEach(function (it) {
        var o = document.createElement('option'); o.value = it.name; o.textContent = it.name; sel.appendChild(o);
      });
    }
    saveBtn.addEventListener('click', function () {
      var nm = (nameInp.value || '').trim();
      if (!nm) { status.style.color = '#b58900'; status.textContent = 'Type a name first.'; return; }
      tpSaveItinerary(nm, tpCollectFields()); refresh(); sel.value = nm;
      status.style.color = '#1b8a3f'; status.textContent = '✓ Saved “' + nm + '”.';
    });
    loadBtn.addEventListener('click', function () {
      var it = tpFindItinerary(sel.value);
      if (!it) { status.style.color = '#b58900'; status.textContent = 'Pick a saved itinerary.'; return; }
      tpApplyFields(it.fields); nameInp.value = it.name;
      status.style.color = '#1b8a3f'; status.textContent = '✓ Loaded “' + it.name + '”. Press SCAN TRIP.';
    });
    delBtn.addEventListener('click', function () {
      var nm = sel.value; if (!nm) return;
      tpDeleteItinerary(nm); refresh();
      status.style.color = '#666'; status.textContent = 'Deleted “' + nm + '”.';
    });
    refresh();
    return bar;
  }

  // Last route fetched from the Worker (used later by the bearing phase)
  // shape: { origin, dest, distanceMeters, durationSec, coords: [[lon,lat],...] }
  var TP_LAST_ROUTE = null;
  // Range-only (fallback) chargers found for the CURRENT plan: kept WITH their
  // coordinates so the Maps export can POSITION them in travel order yet emit them
  // BY NAME. Reset at the start of every charger search.
  var TP_RANGE_CHARGERS = [];
  // Reference to the live Maps-export update() so a later charger search can refresh
  // the link once the range chargers are known.
  var _tpMapsUpdate = null;
  function tpRefreshMapsExport() { try { if (typeof _tpMapsUpdate === 'function') _tpMapsUpdate(); } catch (e) {} }
  // When set to an object, getRotatingHourChart results are memoised by date+hour
  // pillar. Enabled only during a multi-day SEARCH (many candidates share the same
  // hour charts) and cleared afterwards, so normal single plans are unaffected.
  var _tpRotCache = null;

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

  /* ===== PERSISTENT ROAD-SHAPE CACHE ==================================== *
   * The road SHAPE between two points is ~fixed, so we save it (localStorage)
   * keyed by rounded origin/dest and reuse it across sessions instead of re-
   * fetching from the Worker. The SAME cache also serves detour legs (they are
   * just A->B routes too), so realized detours are saved and reused as well.
   * ------------------------------------------------------------------- */
  function tpRouteShapeKey(O, D) {
    function r(n){ return Math.round(parseFloat(n) * 1000) / 1000; }   // ~111 m bucket
    return 'xkdg_tp_route_' + r(O.lat) + '_' + r(O.lng) + '_' + r(D.lat) + '_' + r(D.lng);
  }
  function tpSaveRouteShape(route, names) {
    try {
      if (!route || !route.origin || !route.dest || !route.coords || !route.coords.length) return;
      var key = tpRouteShapeKey({ lat: route.origin.lat, lng: route.origin.lng }, { lat: route.dest.lat, lng: route.dest.lng });
      var rec = { origin: route.origin, dest: route.dest,
        distanceMeters: route.distanceMeters, durationSec: route.durationSec, coords: route.coords, saved: Date.now() };
      if (names && (names.origin || names.dest)) rec.names = { o: names.origin || '', d: names.dest || '' };
      localStorage.setItem(key, JSON.stringify(rec));
    } catch (e) {}
  }
  function tpLoadRouteShape(O, D) {
    try {
      var raw = localStorage.getItem(tpRouteShapeKey(O, D));
      if (!raw) return null;
      var r = JSON.parse(raw);
      if (!r || !r.coords || !r.coords.length) return null;
      r._fromCache = true; return r;
    } catch (e) { return null; }
  }
  // Fetch a leg but reuse/save the persistent shape. Does NOT touch TP_LAST_ROUTE
  // (safe for detour segments). Returns a route or null (never throws).
  function tpFetchRouteCached(workerUrl, O, D) {
    var saved = tpLoadRouteShape(O, D);
    if (saved) return Promise.resolve(saved);
    if (!workerUrl) return Promise.resolve(null);
    return tpFetchRoute(workerUrl, O, D).then(function (r) { tpSaveRouteShape(r); return r; }).catch(function () { return null; });
  }
  // Acquire the MAIN route: in-session match -> saved shape -> fetch (then save).
  function tpAcquireRoute(O, D, workerUrl) {
    if (TP_LAST_ROUTE && tpRouteMatches(TP_LAST_ROUTE, O, D)) return Promise.resolve(TP_LAST_ROUTE);
    var saved = tpLoadRouteShape(O, D);
    if (saved) { TP_LAST_ROUTE = saved; return Promise.resolve(saved); }
    if (!workerUrl) return Promise.resolve(null);
    return tpFetchRoute(workerUrl, O, D).then(function (r) { TP_LAST_ROUTE = r; tpSaveRouteShape(r, window._tpNames); return r; }).catch(function () { return null; });
  }

  // List every saved road shape (for the management panel).
  function tpListSavedRoutes() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('xkdg_tp_route_') !== 0) continue;
        var r; try { r = JSON.parse(localStorage.getItem(k)); } catch (e) { continue; }
        if (!r || !r.origin || !r.dest) continue;
        out.push({ key: k, origin: r.origin, dest: r.dest, names: r.names || null,
          km: r.distanceMeters ? Math.round(r.distanceMeters / 1000) : null,
          min: r.durationSec ? Math.round(r.durationSec / 60) : null, saved: r.saved || null });
      }
    } catch (e) {}
    out.sort(function (a, b) { return (b.saved || 0) - (a.saved || 0); });
    return out;
  }
  function tpClearSavedRoute(key) { try { localStorage.removeItem(key); } catch (e) {} }
  function tpClearAllSavedRoutes() {
    try {
      var del = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('xkdg_tp_route_') === 0) del.push(k); }
      del.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }
  // Render the saved-roads manager into #tp-results.
  function tpShowSavedRoads() {
    function r3(n){ return Math.round(parseFloat(n) * 1000) / 1000; }
    var results = document.getElementById('tp-results');
    if (!results) return;
    var rows = tpListSavedRoutes();
    results.innerHTML = '';
    var box = el('div', { style: 'border:1px solid #cdd7e0;border-radius:10px;padding:10px;background:#f7f9fb;' });
    var top = el('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:8px;' });
    top.appendChild(el('div', { style: 'flex:1;font-weight:700;color:#1f3a5f;font-size:14px;' }, '\uD83D\uDDFA Saved roads (' + rows.length + ')'));
    if (rows.length) {
      var clrAll = el('button', { type: 'button', style: 'padding:5px 9px;border:1px solid #b00;border-radius:6px;background:#fff;color:#b00;font-size:12px;font-weight:600;cursor:pointer;' }, 'Clear all');
      clrAll.addEventListener('click', function () { if (window.confirm('Delete all saved road shapes?')) { tpClearAllSavedRoutes(); tpShowSavedRoads(); } });
      top.appendChild(clrAll);
    }
    box.appendChild(top);
    if (!rows.length) {
      box.appendChild(el('div', { style: 'font-size:12px;color:#888;' }, 'No saved road shapes yet. Run SCAN TRIP with the Worker URL set; the road is saved and reused next time.'));
    } else {
      rows.forEach(function (it) {
        var label = (it.names && (it.names.o || it.names.d)) ? ((it.names.o || '?') + ' \u2192 ' + (it.names.d || '?'))
          : (r3(it.origin.lat) + ',' + r3(it.origin.lng) + ' \u2192 ' + r3(it.dest.lat) + ',' + r3(it.dest.lng));
        var meta = [];
        if (it.km != null) meta.push(it.km + ' km');
        if (it.min != null) meta.push('~' + (Math.round(it.min / 6) / 10) + 'h');
        if (it.saved) { try { meta.push('saved ' + new Date(it.saved).toLocaleDateString()); } catch (e) {} }
        var row = el('div', { style: 'display:flex;align-items:center;gap:8px;margin:4px 0;padding:7px 9px;border-radius:8px;border:1px solid #e2e8ee;background:#fff;' });
        var left = el('div', { style: 'flex:1;min-width:0;' });
        left.appendChild(el('div', { style: 'font-weight:600;font-size:13px;color:#222;overflow:hidden;text-overflow:ellipsis;' }, label));
        left.appendChild(el('div', { style: 'font-size:11px;color:#777;' }, meta.join(' \u00b7 ')));
        row.appendChild(left);
        var del = el('button', { type: 'button', style: 'flex:none;padding:5px 10px;border:1px solid #b00;border-radius:6px;background:#fff;color:#b00;font-size:12px;font-weight:600;cursor:pointer;' }, 'Clear');
        del.addEventListener('click', function () { tpClearSavedRoute(it.key); tpShowSavedRoads(); });
        row.appendChild(del);
        box.appendChild(row);
      });
      box.appendChild(el('div', { style: 'font-size:11px;color:#888;margin-top:6px;' }, 'Clearing a road forces a fresh fetch from the Worker next time (use it if a route really changed).'));
    }
    results.appendChild(box);
  }

  /* ===== PHASE 2 — active detour engine ================================= *
   * When the fast route gives a 时辰 with a POSITIVE adjacent direction that
   * cannot be cashed on the direct road, deviate to a REAL place in that
   * direction, then resume toward the destination. Adopt only if the extra
   * REAL road time stays within +TP_DETOUR_BUDGET; otherwise flag it for the
   * user's explicit authorization. Fully async; safe fallback to the base plan.
   * TP_DETOUR_REACH_H is a TUNING knob (how far ahead to place the waypoint),
   * NOT a domain rule — tune it after testing.
   * --------------------------------------------------------------------- */
  var TP_DETOUR_BUDGET = 0.15;   // max extra REAL road time vs the direct route
  var TP_DETOUR_REACH_H = 1.0;   // hours of cruising ahead to place the detour waypoint (tunable)
  var TP_DETOUR_MAX = 3;             // max real detours to chain along ONE trip
  var TP_DETOUR_BUDGET_TOTAL = 0.30; // max extra REAL road time for ALL chained detours combined
  var TP_XKDG_WEIGHT = 0.5;          // weight of the GRADED XKDG/person hour score (slot.hourScore: Blood Link/Family/Pure Qi...) when the direction is ALSO favourable
  var TP_XKDG_ONLY_WEIGHT = 0.25;    // smaller weight when the hour is XKDG-positive but the DIRECTION is not (beats a dead hour; flags a detour candidate)
  // ARRIVAL CASH (domain rule, Edu): reaching the DESTINATION inside a window whose
  // gated favourable direction matches the OVERALL origin→destination direction is a
  // cash in itself — worth MORE than a road-side cash stop. No stop and no margin is
  // required: arriving within the window is enough. This multiplier scales that
  // direction's score above a normal (1.0×) cash stop.
  var TP_ARRIVAL_CASH_MULT = 1.5;

  // Great-circle projection: point at distance km on bearing from (lat,lon)
  function tpProject(lat, lon, bearingDeg, km) {
    var R = 6371, d = km / R, br = bearingDeg * Math.PI / 180;
    var la1 = lat * Math.PI / 180, lo1 = lon * Math.PI / 180;
    var la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(br));
    var lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
    return { lat: la2 * 180 / Math.PI, lon: ((lo2 * 180 / Math.PI + 540) % 360) - 180 };
  }

  // Concatenate two fetched routes into one (drops the duplicate join vertex)
  function tpStitchRoutes(rA, rB) {
    if (!rA || !rB || !rA.coords || !rB.coords || !rA.coords.length || !rB.coords.length) return null;
    var coords = rA.coords.concat(rB.coords.slice(1));
    return {
      origin: rA.origin, dest: rB.dest,
      distanceMeters: (rA.distanceMeters || 0) + (rB.distanceMeters || 0),
      durationSec: (rA.durationSec || 0) + (rB.durationSec || 0),
      coords: coords, _viaDetour: true
    };
  }

  /* Realize ONE detour intent into a real, stitched route.
   * originLL/destLL: {lat,lng}. Resolves with
   *   { route, W, dir, addedPct, withinBudget, intent }  or  null.
   * Never throws. */
  function tpRealizeDetour(workerUrl, originLL, destLL, baselineSec, intent, isEV, cruiseKmh) {
    try {
      if (!workerUrl || !intent || !baselineSec) return Promise.resolve(null);
      var reachKm = Math.max(15, (cruiseKmh || 80) * TP_DETOUR_REACH_H);
      var wt = tpProject(intent.pos.lat, intent.pos.lon, intent.targetDeg, reachKm);
      return tpFindStopover(wt.lat, wt.lon, !!isEV).then(function (W) {
        if (!W || W.lat == null || W.lon == null) return null;
        var wLL = { lat: W.lat, lng: W.lon };
        return Promise.all([
          tpFetchRoute(workerUrl, originLL, wLL).catch(function () { return null; }),
          tpFetchRoute(workerUrl, wLL, destLL).catch(function () { return null; })
        ]).then(function (parts) {
          var stitched = tpStitchRoutes(parts[0], parts[1]);
          if (!stitched) return null;
          var addedPct = (stitched.durationSec - baselineSec) / baselineSec;
          return { route: stitched, W: W, dir: intent.dir, intent: intent,
                   addedPct: addedPct, withinBudget: (addedPct <= TP_DETOUR_BUDGET) };
        });
      }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  /* Realize MULTIPLE detour intents into ONE real route: origin -> W1 -> W2 ->
   * ... -> dest. Greedily keeps the longest prefix of detours whose TOTAL extra
   * road time stays within TP_DETOUR_BUDGET_TOTAL. Resolves with
   *   { route, count, Ws:[...], dirs:[...], addedPct, withinBudget:true }  or  null.
   * Never throws. */
  function tpRealizeDetoursMulti(workerUrl, originLL, destLL, baselineSec, intents, isEV, cruiseKmh) {
    try {
      if (!workerUrl || !baselineSec || !intents || !intents.length) return Promise.resolve(null);
      var reachKm = Math.max(15, (cruiseKmh || 80) * TP_DETOUR_REACH_H);
      // Prefer rescuing XKDG-positive hours (a detour there yields cash + the big XKDG
      // bonus), then keep them in route order so the stitched route stays geographic.
      var _pool = intents.slice();
      _pool.sort(function (a, b) { return ((b.xkPositive ? 1 : 0) - (a.xkPositive ? 1 : 0)) || ((a.slotIdx || 0) - (b.slotIdx || 0)); });
      var cand = _pool.slice(0, TP_DETOUR_MAX);
      cand.sort(function (a, b) { return (a.slotIdx || 0) - (b.slotIdx || 0); });
      return Promise.all(cand.map(function (it) {
        var wt = tpProject(it.pos.lat, it.pos.lon, it.targetDeg, reachKm);
        return tpFindStopover(wt.lat, wt.lon, !!isEV).then(function (W) {
          return (W && W.lat != null && W.lon != null) ? { W: W, dir: it.dir, intent: it } : null;
        }).catch(function () { return null; });
      })).then(function (resolved) {
        var ws = [];
        resolved.forEach(function (r) {
          if (!r) return;
          for (var i = 0; i < ws.length; i++) {              // drop waypoints clustered together
            if (tpHaversineKm(ws[i].W.lat, ws[i].W.lon, r.W.lat, r.W.lon) < 12) return;
          }
          ws.push(r);
        });
        if (!ws.length) return null;
        var segIn = [], segOut = [], fetches = [];   // segIn: origin->W1, W1->W2, ... ; segOut: Wk->dest
        fetches.push(tpFetchRouteCached(workerUrl, originLL, { lat: ws[0].W.lat, lng: ws[0].W.lon })
          .then(function (r) { segIn[0] = r; }).catch(function () { segIn[0] = null; }));
        for (var a = 0; a < ws.length - 1; a++) { (function (a) {
          fetches.push(tpFetchRouteCached(workerUrl, { lat: ws[a].W.lat, lng: ws[a].W.lon }, { lat: ws[a+1].W.lat, lng: ws[a+1].W.lon })
            .then(function (r) { segIn[a+1] = r; }).catch(function () { segIn[a+1] = null; }));
        })(a); }
        for (var b = 0; b < ws.length; b++) { (function (b) {
          fetches.push(tpFetchRouteCached(workerUrl, { lat: ws[b].W.lat, lng: ws[b].W.lon }, destLL)
            .then(function (r) { segOut[b] = r; }).catch(function () { segOut[b] = null; }));
        })(b); }
        return Promise.all(fetches).then(function () {
          var best = null, prefix = null;
          for (var k = 0; k < ws.length; k++) {
            if (!segIn[k]) break;                              // missing link -> cannot extend further
            prefix = prefix ? tpStitchRoutes(prefix, segIn[k]) : segIn[k];
            if (!prefix) break;
            if (!segOut[k]) continue;                          // cannot close to dest here; try a longer prefix
            var full = tpStitchRoutes(prefix, segOut[k]);
            if (!full) continue;
            var addedPct = (full.durationSec - baselineSec) / baselineSec;
            if (addedPct <= TP_DETOUR_BUDGET_TOTAL) {
              best = { route: full, count: k + 1,
                       Ws: ws.slice(0, k + 1).map(function (x) { return x.W; }),
                       dirs: ws.slice(0, k + 1).map(function (x) { return x.dir; }),
                       addedPct: addedPct, withinBudget: true };
            } else { break; }                                  // more waypoints only add time
          }
          return best;
        });
      }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  /* ---- solar-time offset (minutes), matching app convention -------------- */
  function tpOffsetMin(lon, utc, dstOn, refMs) {
    var base = (lon - utc * 15) * 4 - (dstOn ? 60 : 0);
    // Full true solar time: add the Equation of Time for the reference instant when available.
    if (refMs != null && typeof XKDGSolarTime !== 'undefined' && typeof XKDGSolarTime.equationOfTimeMinutes === 'function') {
      try { base += XKDGSolarTime.equationOfTimeMinutes(new Date(refMs)); } catch (e) {}
    }
    return base;
  }
  // Is daylight saving in effect on date d (per the device timezone)? Standard time has the larger offset;
  // a smaller offset on d means DST is active. Works in both hemispheres.
  function tpDstActiveOn(d) {
    try {
      var y = d.getFullYear();
      var std = Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset());
      return d.getTimezoneOffset() < std;
    } catch (e) { return false; }
  }
  function tpDstFromIso(iso) {
    var p = String(iso || '').split('-');
    return (p.length === 3) ? tpDstActiveOn(new Date(+p[0], +p[1] - 1, +p[2])) : false;
  }

  /* ---- loxodromic (rhumb-line) bearing A -> B, degrees 0..360 ------------- *
   * Constant-heading bearing: how B sits relative to A, regardless of any
   * turns/curves in between. This is the "direction of march" of a leg, snapped
   * to a 45° palace. (Not great-circle — that would change heading along the path.)
   * ----------------------------------------------------------------------- */
  // Magnetic declination at a point, "today" (Edu, session 23: "le direzioni dei
  // palazzi Feng Shui sono SEMPRE in base alla bussola magnetica" — not true/map
  // north). WMM2025, same model + convention (East declination = positive) already
  // used by facing-map.js's "Measure facing" tool: magnetic = true − declination.
  // Synchronous, no network. Falls back to 0 (= old true-north behaviour) if
  // geomag.js isn't loaded for some reason — never throws, never blocks a bearing.
  function tpMagDeclination(lat, lon) {
    try {
      if (window.XKDGGeoMag && typeof window.XKDGGeoMag.declination === 'function') {
        var d = window.XKDGGeoMag.declination(lat, lon, new Date());
        if (isFinite(d)) return d;
      }
    } catch (e) {}
    return 0;
  }
  function tpBearing(lat1, lon1, lat2, lon2) {
    var toR = Math.PI / 180;
    var p1 = lat1 * toR, p2 = lat2 * toR;
    var dpsi = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2));
    var dl = (lon2 - lon1) * toR;
    if (Math.abs(dl) > Math.PI) dl = dl > 0 ? -(2 * Math.PI - dl) : (2 * Math.PI + dl);
    var b = Math.atan2(dl, dpsi) / toR;
    var trueBearing = (b + 360) % 360;
    // MAGNETIC (session 23, root fix): every QMDJ/Feng Shui palace/direction check
    // in this file (Lucky Trip, road-fortune gate, EV day-search, Live compass —
    // ALL of it) reads this return value, so the correction belongs HERE, once,
    // not patched into each of the dozens of call sites.
    return (trueBearing - tpMagDeclination(lat1, lon1) + 360) % 360;
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

  // Directions usable for SELECTION: prefer "clean" ones (San Qi + favourable
  // door, no Warrior/Tiger); fall back to the relaxed ones (missing San Qi or
  // Warrior/Tiger) only when no clean direction exists in this slot.
  function tpUsableDirs(dirs) {
    var ok = (dirs || []).filter(function (d) { return d.eval && d.eval.ok; });
    var clean = ok.filter(function (d) { return d.eval && !d.eval.fallback; });
    return clean.length ? clean : ok;
  }

  /* Best gated direction in a slot toward an ARBITRARY target bearing (not just
   * the final destination). Reuses each direction's precomputed `combined`
   * score; only the "toward" test changes (within 67.5° of the target). Returns
   * a fresh object so the slot's stored dirs are never mutated. */
  function tpBestDirToward(slot, targetBearing) {
    var gated = tpUsableDirs(slot.dirs);
    if (!gated.length) return null;
    var toward = gated.filter(function (d) { return tpAngDiff(TP_DIR_DEG[d.dir], targetBearing) <= 67.5; });
    var pool = (toward.length ? toward : gated).slice()
      .sort(function (a, b) { return (b.combined || 0) - (a.combined || 0); });
    var best = pool[0];
    return { dir: best.dir, palace: best.palace, eval: best.eval, combined: best.combined, towardDest: true };
  }

  // The single palace whose compass direction is CLOSEST to `bearing` (no ±tolerance).
  // Used to enforce the absolute rule: the exact travel direction's door must be
  // favourable at the moment of departure.
  function tpDirExact(slot, bearing) {
    var best = null, bd = 999;
    (slot.dirs || []).forEach(function (d) {
      var diff = tpAngDiff(TP_DIR_DEG[d.dir], bearing);
      if (diff < bd) { bd = diff; best = d; }
    });
    return best;
  }

  /* ---- PHASE D: Google Maps export helpers -------------------------------- *
   * Build a Google Maps "Directions" deep link (Maps URL API) with the chosen
   * stops as waypoints. Opening it on the phone hands navigation to Maps; on a
   * car with Google built-in (e.g. Polestar) signed into the same account the
   * route can be picked up there. A PWA cannot draw on the car screen itself.
   * ----------------------------------------------------------------------- */
  function tpLatLng(p) {
    return Number(p.lat).toFixed(5) + ',' + Number(p.lon).toFixed(5);
  }
  // A Maps point is either {lat,lon} (-> "lat,lng") or a plain string (a place
  // name typed by the user). Empty/invalid -> ''.
  function tpMapsPoint(p) {
    if (p == null) return '';
    if (typeof p === 'string') return p.trim();
    if (p.lat != null && p.lon != null && isFinite(p.lat) && isFinite(p.lon)) return tpLatLng(p);
    return '';
  }
  function tpBuildMapsUrl(origin, dest, waypoints, placeIds) {
    var parts = ['https://www.google.com/maps/dir/?api=1'];
    var o = tpMapsPoint(origin), d = tpMapsPoint(dest);
    if (o) parts.push('origin=' + encodeURIComponent(o));
    if (d) parts.push('destination=' + encodeURIComponent(d));
    var wps = (waypoints || []).map(tpMapsPoint).filter(Boolean);
    if (wps.length) parts.push('waypoints=' + wps.map(encodeURIComponent).join('%7C'));
    // Parallel place-ID list (Maps URLs API): pins each waypoint to the EXACT establishment
    // instead of snapping its lat/lon to the nearest road. Must be same length/order as
    // waypoints — blanks ('') for points without a place ID. Only emitted if at least one
    // real ID exists, and only when its length matches the waypoints (Maps requires alignment).
    if (wps.length && placeIds && placeIds.length === wps.length && placeIds.some(function (x) { return x; })) {
      parts.push('waypoint_place_ids=' + placeIds.map(function (x) { return encodeURIComponent(x || ''); }).join('%7C'));
    }
    parts.push('travelmode=driving');
    return parts.join('&');
  }
  // Build a Google Maps "Directions" link for a multi-stop CITY TOUR: the base as
  // the start, then every stop in visiting order, ending at the last stop. Defaults
  // to WALKING (a city tour is on foot / short hops). Returns null if fewer than two
  // points resolve. Kept SEPARATE from tpBuildMapsUrl so the driving export is untouched.
  function tpBuildTourMapsUrl(origin, stops, mode) {
    var pts = [];
    if (origin && isFinite(origin.lat) && isFinite(origin.lon)) pts.push(tpLatLng(origin));
    (stops || []).forEach(function (s) {
      var la = (s && s.dest_lat != null) ? s.dest_lat : (s && s.lat);
      var lo = (s && s.dest_lon != null) ? s.dest_lon : (s && s.lon);
      if (isFinite(la) && isFinite(lo)) pts.push(Number(la).toFixed(5) + ',' + Number(lo).toFixed(5));
    });
    if (pts.length < 2) return null;     // need at least base + one stop
    var parts = ['https://www.google.com/maps/dir/?api=1',
      'origin=' + encodeURIComponent(pts[0]),
      'destination=' + encodeURIComponent(pts[pts.length - 1])];
    var wps = pts.slice(1, pts.length - 1);
    if (wps.length) parts.push('waypoints=' + wps.map(encodeURIComponent).join('%7C'));
    var m = (mode === 'driving' || mode === 'bicycling' || mode === 'transit') ? mode : 'walking';
    parts.push('travelmode=' + m);
    return parts.join('&');
  }
  // ---- Crowd de-emphasis (opt-in "off the beaten path") -----------------------
  // When the traveller wants to stay away from the crowds, a place with very many
  // reviews is treated as slightly "farther" (a mild multiplier on its effective
  // distance) or scored slightly lower. It NEVER overrides the direction/door rule —
  // it only breaks ties toward quieter spots among already-valid candidates. Opt-in;
  // if review counts are absent (Places worker not yet updated) it has no effect.
  var TP_CROWD_W = 0.12;
  function tpCrowdMult(reviews) {
    var n = (reviews != null && isFinite(reviews) && reviews > 0) ? reviews : 0;
    if (!n) return 1;
    return 1 + TP_CROWD_W * (Math.log(1 + n) / Math.LN10);   // log10, ES5-safe
  }
  // Clipboard with a graceful fallback for browsers without the async API.
  function tpCopyToClipboard(text, btn, doneLabel, restoreLabel) {
    function ok() { if (btn) { btn.textContent = doneLabel; setTimeout(function () { btn.textContent = restoreLabel; }, 1500); } }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { tpCopyFallback(text, ok); });
        return;
      }
    } catch (e) { /* fall through */ }
    tpCopyFallback(text, ok);
  }
  function tpCopyFallback(text, ok) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      ok();
    } catch (e) { try { window.prompt('Copy this link:', text); } catch (_) {} }
  }

  /* ---- Geocoding (city/place name -> lat/lon) ----------------------------- *
   * Same free OpenStreetMap (Nominatim) geocoder already used by the Direction
   * Calculator, so behaviour matches the rest of the app. Returns a Promise of
   * { lat, lon, display }. We use it only to fill the LATITUDE that CITY_LIST
   * doesn't carry — longitude/UTC still come from the curated CITY_LIST data.
   * ----------------------------------------------------------------------- */
  function tpGeocode(query) {
    return fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + '&format=json&limit=1',
        { headers: { 'Accept-Language': 'en' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.length) throw new Error('not found');
        var p = data[0];
        return { lat: parseFloat(p.lat), lon: parseFloat(p.lon), display: p.display_name || query };
      });
  }

  // Geocode an AREA/region NAME to its bounding box (Nominatim returns one for
  // administrative areas). Returns a Promise of
  // { lat, lon, box:{south,north,west,east} } or rejects. Used to fence a
  // themed trip to a region (e.g. Tuscany) so stops can't drift into a neighbour.
  function tpGeocodeArea(query) {
    return fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + '&format=json&limit=1',
        { headers: { 'Accept-Language': 'en' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.length) throw new Error('not found');
        var p = data[0];
        var bb = p.boundingbox || null;
        var box = (bb && bb.length === 4) ? {
          south: parseFloat(bb[0]), north: parseFloat(bb[1]),
          west: parseFloat(bb[2]), east: parseFloat(bb[3])
        } : null;
        return { lat: parseFloat(p.lat), lon: parseFloat(p.lon), display: p.display_name || query, box: box };
      });
  }

  // Resolve a place to {lat,lon}. Prefers geocoding the NAME (reliable) over  // caller-supplied coordinates, which the AI generates "from its knowledge" and
  // can get badly wrong for small towns. Falls back to the supplied lat/lon if
  // the name is missing or geocoding fails/times out. Always resolves (never rejects).
  function _tpResolvePlace(name, lat, lon) {
    var nLat = parseFloat(lat), nLon = parseFloat(lon);
    var fallback = (isFinite(nLat) && isFinite(nLon)) ? { lat: nLat, lon: nLon } : null;
    if (!name || typeof name !== 'string' || !name.trim()) return Promise.resolve(fallback);
    var timeout = new Promise(function (res) { setTimeout(function () { res(null); }, 6000); });
    var geo = tpGeocode(name.trim())
      .then(function (g) { return (g && isFinite(g.lat) && isFinite(g.lon)) ? { lat: g.lat, lon: g.lon } : null; })
      .catch(function () { return null; });
    return Promise.race([geo, timeout]).then(function (r) { return r || fallback; });
  }

  // Open a SINGLE point in Google Maps (a pin you can save / mark yourself).
  function tpMapsPointUrl(lat, lon) {
    return 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(Number(lat).toFixed(6) + ',' + Number(lon).toFixed(6));
  }
  function tpOpenPoint(lat, lon) {
    var url = tpMapsPointUrl(lat, lon), w = null;
    try { w = window.open(url, '_blank'); } catch (e) {}
    if (!w) { try { window.location.href = url; } catch (e) {} }
  }
  // Reverse geocode lat/lon -> a short place name (town/city/…); null on failure.
  function tpReverseGeocode(lat, lon) {
    return fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=12&addressdetails=1&lat=' +
        encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon), { headers: { 'Accept-Language': 'it' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var a = (d && d.address) || {};
        return a.town || a.village || a.city || a.municipality || a.suburb || a.county || a.state || (d && d.name) || null;
      });
  }
  // Reverse geocode several points SEQUENTIALLY (gentle on the free geocoder).
  // Each has a 5s timeout; resolves to an array of names (null where it failed).
  function tpReverseGeocodeMany(points) {
    var out = [];
    return (points || []).reduce(function (chain, p) {
      return chain.then(function () {
        var to = new Promise(function (res) { setTimeout(function () { res(null); }, 5000); });
        return Promise.race([tpReverseGeocode(p.lat, p.lon).catch(function () { return null; }), to])
          .then(function (name) { out.push(name); });
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  /* ---- Charging stations (Phase F, Open Charge Map) ----------------------- */
  function tpHaversineKm(lat1, lon1, lat2, lon2) { return tpHaversine(lat1, lon1, lat2, lon2) / 1000; }

  // Query OCM around a point. Returns a Promise of normalized stations:
  // { lat, lon, title, operator, maxKW, distanceKm }. Defensive: rejects with a
  // clear message on missing key / network / empty results.
  function tpFetchChargers(opts) {
    var key = (opts.key || '').trim();
    if (!key) return Promise.reject(new Error('no Open Charge Map key'));
    var url = 'https://api.openchargemap.io/v3/poi/?output=json&compact=true&verbose=false' +
      '&latitude=' + opts.lat + '&longitude=' + opts.lon +
      '&distance=' + (opts.radiusKm || 100) + '&distanceunit=KM' +
      '&maxresults=' + (opts.maxResults || 80) +
      '&key=' + encodeURIComponent(key);
    return fetch(url, { headers: { 'X-API-Key': key } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error('unexpected OCM response');
        return data.map(function (poi) {
          var a = poi.AddressInfo || {};
          // Operator name: OperatorInfo.Title is often EMPTY in OCM for brands like Electra
          // (the brand lives only in the site Title). Fall back to the Title so the network
          // filter can still recognise it — otherwise Electra silently never matches.
          var op = (poi.OperatorInfo && poi.OperatorInfo.Title) || '';
          var titleStr = a.Title || '';
          var maxKW = 0, anyPower = false;
          (poi.Connections || []).forEach(function (c) {
            if (c && c.PowerKW != null) { anyPower = true; if (c.PowerKW > maxKW) maxKW = c.PowerKW; }
          });
          return { lat: a.Latitude, lon: a.Longitude, title: titleStr || op || 'Charger',
                   operator: op || titleStr, maxKW: maxKW, powerKnown: anyPower && maxKW > 0,
                   distanceKm: a.Distance || null };
        }).filter(function (s) { return isFinite(s.lat) && isFinite(s.lon); });
      });
  }

  // Keep only stations whose operator matches one of the selected networks.
  function tpFilterChargersByNetwork(stations, networkIds) {
    var keys = [];
    TP_NETWORKS.forEach(function (n) { if (networkIds.indexOf(n.id) >= 0) keys = keys.concat(n.match); });
    if (!keys.length) return stations;
    return stations.filter(function (s) {
      var hay = ((s.operator || '') + ' ' + (s.title || '')).toLowerCase();
      return keys.some(function (k) { return hay.indexOf(k) >= 0; });
    });
  }

  /* ---- SECOND charger source: TomTom via the xkdg-ev Cloudflare Worker ----- *
   * TomTom's European coverage (Electra, Ionity, ...) is far more complete than
   * crowd-sourced OCM, carries the brand in the station name and REAL connector
   * power. The worker normalises its response to the exact OCM station shape
   * ({title, operator, lat, lon, maxKW, powerKnown, distanceKm}), so merging is
   * trivial. Everything is optional: no worker URL saved → OCM-only, as before.
   * ------------------------------------------------------------------------- */
  function tpEvWorkerUrl() {
    try { var v = (localStorage.getItem('xkdg_tp_ev_worker') || '').trim(); return v || ''; } catch (e) { return ''; }
  }
  // Silent-failure tracking: on flaky mobile data a whole source can drop out with no
  // visible error, silently shrinking the charger pool (that is how an Electra "disappears"
  // on the phone while the PC finds it). Timestamps of the last DEFINITIVE failure per
  // source; the search status shows a warning when a failure happened during this search.
  var TP_SRC_FAIL = { ocm: 0, tomtom: 0 };
  function tpSrcWarnText() {
    try {
      var w = [], now = Date.now();
      if (TP_SRC_FAIL.tomtom && (now - TP_SRC_FAIL.tomtom) < 180000) w.push('TomTom');
      if (TP_SRC_FAIL.ocm && (now - TP_SRC_FAIL.ocm) < 180000) w.push('OCM');
      return w.length ? (' \u26a0 ' + w.join(' & ') + ' unreachable during this search \u2014 charger pool may be incomplete; run it again.') : '';
    } catch (e) { return ''; }
  }
  function tpFetchChargersTomTom(opts) {
    var base = tpEvWorkerUrl();
    if (!base) return Promise.resolve([]);
    var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
      'lat=' + opts.lat + '&lon=' + opts.lon +
      '&radius=' + Math.round((opts.radiusKm || 100) * 1000) +
      '&max=' + (opts.maxResults || 80) +
      // FAST ONLY: without this, TomTom fills the result limit with the NEAREST
      // stations — near towns those are dozens of 11-22 kW urban posts, and the
      // 300 kW motorway hubs (Electra!) never make the list. >= TP_MIN_KW2 keeps
      // every returned slot useful for trip charging.
      '&minkw=' + TP_MIN_KW2;
    function once() {
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
      return fetch(url, { signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (to) clearTimeout(to);
          if (!j || j.status !== 'ok' || !Array.isArray(j.results)) throw new Error('bad response');
          return j.results.filter(function (s) { return s && isFinite(s.lat) && isFinite(s.lon); });
        })
        .catch(function (e) { if (to) clearTimeout(to); throw e; });
    }
    // ONE automatic retry after a short pause: a single dropped request on mobile data
    // must not silently cost a whole area's stations.
    return once()
      .catch(function () { return new Promise(function (res) { setTimeout(res, 800); }).then(once); })
      .catch(function () { TP_SRC_FAIL.tomtom = Date.now(); return []; });   // reset happens at search start
  }
  // Merge stations from several sources, de-duplicating by REAL distance (<=150 m):
  // the same physical station has slightly different coordinates in each database,
  // and a grid-cell snap fails right at cell borders. On a duplicate keep the record
  // with a KNOWN power figure, then higher power, then the longer title. n is small
  // (a few dozen per sampled centre), so the O(n^2) scan is negligible.
  function tpMergeChargers(lists) {
    var kept = [];
    var DUP_M = 150;   // two records closer than this are the same station
    function better(a, b) {
      if (!!a.powerKnown !== !!b.powerKnown) return a.powerKnown ? a : b;
      if ((a.maxKW || 0) !== (b.maxKW || 0)) return (a.maxKW || 0) > (b.maxKW || 0) ? a : b;
      return (String(a.title || '').length >= String(b.title || '').length) ? a : b;
    }
    function nearIdx(s) {
      var cosLat = Math.cos(s.lat * Math.PI / 180);
      for (var i = 0; i < kept.length; i++) {
        var dLat = (kept[i].lat - s.lat) * 111320;
        var dLon = (kept[i].lon - s.lon) * 111320 * cosLat;
        if ((dLat * dLat + dLon * dLon) <= DUP_M * DUP_M) return i;
      }
      return -1;
    }
    (lists || []).forEach(function (list) {
      (list || []).forEach(function (s) {
        if (!s || !isFinite(s.lat) || !isFinite(s.lon)) return;
        var i = nearIdx(s);
        if (i >= 0) kept[i] = better(kept[i], s);
        else kept.push(s);
      });
    });
    return kept;
  }
  // Unified fetch: OCM (needs its API key) + TomTom (needs the worker URL), each
  // optional; rejects only when NEITHER source is configured.
  function tpFetchChargersMerged(opts) {
    var jobs = [];
    if (((opts && opts.key) || '').trim()) jobs.push(
      tpFetchChargers(opts)
        .catch(function () { TP_SRC_FAIL.ocm = Date.now(); return []; })   // reset happens at search start
    );
    if (tpEvWorkerUrl()) jobs.push(tpFetchChargersTomTom(opts));
    if (!jobs.length) return Promise.reject(new Error('no charger source (OCM key or TomTom worker)'));
    return Promise.all(jobs).then(tpMergeChargers);
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
  function tpPalaceOK(pd, configCount, noCar, purpose) {
    if (!pd) return null;
    var ti = pd.ti, di = pd.di, door = pd.door, deity = pd.deity;
    var star = pd.star, isZhiFu = !!pd.zhiFu;
    configCount = configCount || 0;

    // ── CANONICAL rules (single source: QMDJWaterScanner). No local rule logic. ──
    // Display flags for the returned object / UI — NOT the gate authority.
    var hasSanQi = (TP_SAN_QI.indexOf(ti) !== -1) || (TP_SAN_QI.indexOf(di) !== -1)
                 || (ti === 'Wu') || (di === 'Wu');            // Wu 戊 ranks with San Qi
    var favDoor = TP_FAV_DOORS.indexOf(door) !== -1;
    var clash = (TP_STEM_CLASHES[ti] === di);
    var isWarrior = (deity === 'Warrior');
    var isTiger = (deity === 'Tiger');
    // Injury door 傷 redeemed by San Qi/Wu (travel only) — handled inside directionGate.
    var injuryRescue = (door === 'Shang') && hasSanQi;

    // §1 exclusions + §2 mandatory gate — DELEGATED to the canonical predicate so
    // travel/directions, Water/FS activation and the special scan share one rule set.
    // OPTIONAL purpose (session 23): when given (an FS_PURPOSE_DOORS-shaped object,
    // e.g. QMDJWaterScanner.fsPurposeDoors()['wealth']), the gate ALSO requires that
    // purpose's own primary door — not just "any favourable door". Every existing
    // caller that doesn't pass this 4th argument keeps the exact old behaviour.
    var _Q = (typeof QMDJWaterScanner !== 'undefined') ? QMDJWaterScanner : null;
    var _ff = (_Q && _Q.formationFlags) ? _Q.formationFlags(pd) : { disqualified: false, reasons: [] };
    var _gate = (_Q && _Q.directionGate) ? _Q.directionGate(pd, { travel: true, purpose: purpose || null }) : { eligible: (favDoor || injuryRescue), reasons: [] };
    var excluded = !!_ff.disqualified;
    var gengExcluded = excluded && _ff.reasons.join(';').indexOf('Geng') !== -1;   // display only
    var gate = !!_gate.eligible;
    // Purpose door filter — UNCONDITIONAL, mirroring the canonical
    // checkHourAtPalace/checkRotatingHourAtPalace exactly: a purpose with a
    // specific door list only accepts THAT door (allowNonFav only widens what
    // directionGate itself will redeem into eligibility above — it does NOT
    // widen which doors satisfy the purpose afterward).
    if (purpose && purpose.doors && purpose.doors.indexOf(door) === -1) gate = false;

    // Edu directive: the Injury-door/San-Qi "rescue" is TRAVEL-ONLY in the canonical sense
    // (i.e. by car). On foot/bike (noCar) it must NOT redeem an Injury door — San Qi does
    // not excuse walking through 傷門. Scoped locally: only callers that explicitly pass
    // noCar=true (currently City Tour, which is always a walking route) are affected; every
    // other caller keeps the canonical car-travel behaviour unchanged.
    if (noCar && door === 'Shang') gate = false;

    var ok = gate && !excluded;

    // No "fallback" any more: San Qi/Wu + favourable door is mandatory, Warrior is
    // always excluded, Tiger only with San Qi/Wu + favourable door — all enforced by
    // the canonical predicate. A palace either qualifies cleanly or it is out.
    var fallback = false;

    // Score — always POSITIVE for a usable (gated) direction. Built additively
    // from a positive base + bonuses; clean directions (San Qi, clean deity)
    // score higher, fallbacks (no San Qi / Warrior / Tiger) score low but > 0.
    var score = TP_SCORE_BASE;
    if (hasSanQi) score += TP_BONUS_SANQI;                       // San Qi present
    if (!isWarrior && !isTiger) score += TP_BONUS_GOODDEITY;     // clean deity
    if (pd.zhiFu) score += TP_BONUS_ZHIFU;
    if (pd.zhiShi) score += TP_BONUS_ZHISHI;
    score += configCount * TP_BONUS_CONFIG;
    if (TP_CLASH_MODE === 'penalty' && clash) score += TP_CLASH_PENALTY;   // mild
    if (score < TP_SCORE_FLOOR) score = TP_SCORE_FLOOR;          // never below the positive floor

    return {
      ok: ok, fallback: fallback, score: score,
      hasSanQi: hasSanQi, favDoor: favDoor, clash: clash, injuryRescue: injuryRescue, gengExcluded: gengExcluded,
      isWarrior: isWarrior, isTiger: isTiger,
      zhiFu: !!pd.zhiFu, zhiShi: !!pd.zhiShi, configCount: configCount,
      ti: ti, di: di, door: door, deity: deity
    };
  }

  /* ---- scan all 8 directions for one rotating chart ---------------------- */
  function tpScanDirs(Y, M, D, hGanHan, hZhiHan, bearing, noCar) {
    var out = [];
    if (typeof QMDJWaterScanner === 'undefined' ||
        typeof QMDJWaterScanner.getRotatingHourChart !== 'function') return out;
    var chart;
    if (_tpRotCache) {
      var _ck = Y + '-' + M + '-' + D + '-' + hGanHan + '-' + hZhiHan;
      chart = _tpRotCache[_ck] || (_tpRotCache[_ck] = QMDJWaterScanner.getRotatingHourChart(Y, M, D, hGanHan, hZhiHan));
    } else {
      chart = QMDJWaterScanner.getRotatingHourChart(Y, M, D, hGanHan, hZhiHan);
    }
    if (!chart || !chart.palaces) return out;
    for (var i = 0; i < TP_DIR_ORDER.length; i++) {
      var dir = TP_DIR_ORDER[i];
      var pal = TP_DIR_TO_PALACE[dir];
      // named auspicious configs at this palace (Dun / Pretense / Borrow)
      var configs = (typeof QMDJWaterScanner.checkRotatingPalace === 'function')
        ? (QMDJWaterScanner.checkRotatingPalace(chart, pal) || []) : [];
      var ev = tpPalaceOK(chart.palaces[pal], configs.length, noCar);
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
    // Snap the departure back to the START of the Chinese double-hour it falls in, so the trip
    // uses the FULL two hours of that (favourable) hour instead of beginning halfway through it.
    if (opts.snapDepart !== false) {
      try {
        var offO = tpOffsetMin(O.lon, utc, dstOn, startMs);
        var brOriginAt = function (ms) { return Solar.fromDate(new Date(ms + offO * 60000)).getLunar().getEightChar().getTimeZhi(); };
        var br0 = brOriginAt(startMs), probe = startMs, guard = 0;
        while (guard++ < 130) { var prev = probe - 60000; if (brOriginAt(prev) !== br0) break; probe = prev; }
        startMs = probe;   // start of the current double-hour (to the minute)
      } catch (e) { /* keep requested departure */ }
    }
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
      var off = tpOffsetMin(p.lon, utc, dstOn, ms);
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

    // ---- Stop plan: net-direction cashing (auto), or the user's own stops --
    var plan = (opts.stopMode === 'mine')
      ? tpPlanWithStops(slots, opts.charges || [])
      : tpSuggestStopsNetDir(slots, posAt, O, Dst, bearing, opts.maxLegHours || 4);

    // ---- PHASE E: insert range-forced charging stops for an EV -------------
    // Auto mode + a REAL route only (straight-line distances are unreliable).
    // Splits any leg longer than the usable range; first gap = current charge,
    // later gaps = post-charge range. Fully guarded: on any error keep the plan.
    try {
      if ((opts.stopMode || 'auto') !== 'mine' && routeIdx) {
        var _ev = tpEvRangePlan();
        if (_ev) {
          var _totKm = (routeIdx.distanceMeters || routeIdx.total || 0) / 1000;
          plan = tpInsertRangeCharges(plan, _ev, _totKm, startMs, spanMs, posAt);
        }
      }
    } catch (e) { /* keep base plan on any error */ }

    // ---- PHASE C re-aim only applies to the user-charges timeline ----------
    if (opts.stopMode === 'mine') {
      try { tpReaimLegsAtStops(plan, slots, posAt, Dst); } catch (e) { /* keep base plan */ }
    }

    // ---- PHASE D: attach the real road position to each stop (Maps export) --
    try {
      (plan || []).forEach(function (item) {
        if (item.type === 'stop' && item.atWall) {
          var p = posAt(item.atWall.getTime());
          item.pos = { lat: p.lat, lon: p.lon };
        }
      });
    } catch (e) { /* stops without pos are simply skipped in the export */ }

    return { bearing: bearing, snapDir: snapDir, origin: O, dest: Dst, slots: slots,
             utc: utc, dstOn: dstOn,
             hasHourData: anyHour, plan: plan, stopMode: opts.stopMode || 'auto',
             maxLegHours: opts.maxLegHours || 4,
             usedRealRoute: usedRealRoute,
             evSoc0: (typeof _ev !== 'undefined' && _ev && _ev.soc0 != null) ? Math.round(_ev.soc0) : null,
             routeMeta: routeIdx ? {
               km: routeIdx.distanceMeters / 1000,
               durationSec: routeIdx.durationSec,
               points: routeIdx.coords.length
             } : null };
  }

  /* ---- ARRIVE-BY planner ------------------------------------------------- *
   * Flexible departure, FIXED arrival (± tolerance, default 15 min). Sweeps
   * candidate trip durations: the shortest = drive straight / leave latest;
   * longer ones = leave earlier and span more favourable double-hours. Every
   * candidate arrives at the target (departure = target − duration, no snap),
   * and they are ranked SHORTEST first (longer = second option). Charging is
   * optional. Returns { target, tolMin, driveH, usedRealRoute, km,
   * solutions[ {durH, depWall, arriveWall, depClock, arriveClock, nCashStops,
   * dirsCashed, favHours, quality, chargeNeeded, result} ], chosen, bestFavorable }.
   * --------------------------------------------------------------------- */
  function tpPlanArriveBy(opts) {
    opts = opts || {};
    var target = opts.arriveDate;
    if (!target || isNaN(target.getTime())) throw new Error('Invalid arrival date/time');
    var O = opts.origin || TP_DEFAULT.origin;
    var Dst = opts.dest || TP_DEFAULT.dest;
    var utc = (opts.utc != null) ? opts.utc : 1;
    var dstOn = !!opts.dstOn;
    var tolMin = (opts.tolMin != null) ? opts.tolMin : 15;
    var maxLegHours = opts.maxLegHours || 4;
    var stepMin = opts.stepMin || 30;
    var maxExtraHours = (opts.maxExtraHours != null) ? opts.maxExtraHours : 5;

    // Driving time: real route if supplied/cached & matching, else straight-line estimate.
    var route = opts.route ||
      ((TP_LAST_ROUTE && tpRouteMatches(TP_LAST_ROUTE, { lat: O.lat, lng: O.lon }, { lat: Dst.lat, lng: Dst.lon })) ? TP_LAST_ROUTE : null);
    var routeIdx = tpBuildRouteIndex(route);
    var usedRealRoute = !!routeIdx;
    // Straight-line distance badly under-estimates a real drive, so when we have
    // no road route yet, inflate by a road factor and use a cautious average
    // speed — otherwise the chosen duration can come out shorter than the real
    // driving time and the plan looks "compressed".
    var TP_ROAD_FACTOR = 1.3, TP_AVG_KMH = 72;
    var straightKm = tpHaversineKm(O.lat, O.lon, Dst.lat, Dst.lon);
    var km = routeIdx ? routeIdx.distanceMeters / 1000 : straightKm * TP_ROAD_FACTOR;
    var driveH = routeIdx ? routeIdx.durationSec / 3600 : (km / TP_AVG_KMH);
    if (!isFinite(driveH) || driveH <= 0) driveH = 1;

    var usableKm = (opts.rangeKm > 0) ? (opts.rangeKm - (opts.reserveKm || 0)) : 0;
    var minDur = Math.max(driveH, 0.5);
    var solutions = [], seen = {};
    for (var extra = 0; extra <= maxExtraHours + 1e-9; extra += stepMin / 60) {
      var durH = minDur + extra;
      var dep = new Date(target.getTime() - durH * 3600000);
      var key = Math.round(dep.getTime() / 60000);
      if (seen[key]) continue; seen[key] = 1;
      var res;
      try {
        res = tpPlan({ depDate: dep, durationH: durH, origin: O, dest: Dst, utc: utc, dstOn: dstOn,
          route: route, maxLegHours: maxLegHours, snapDepart: false, stepMin: 30, stopMode: 'auto' });
      } catch (e) { continue; }
      var arriveMs = dep.getTime() + durH * 3600000;
      if (Math.abs(arriveMs - target.getTime()) > tolMin * 60000 + 1000) continue;
      var stopsCash = (res.plan || []).filter(function (x) { return x.type === 'stop' && x.cashDir; });
      var dirsCashed = []; stopsCash.forEach(function (s) { if (dirsCashed.indexOf(s.cashDir) < 0) dirsCashed.push(s.cashDir); });
      var favHours = (res.slots || []).filter(function (s) { return s.hourPositive; }).length;
      var towardSlots = (res.slots || []).filter(function (s) {
        return (s.dirs || []).some(function (d) { return d.towardDest && d.eval && d.eval.ok; });
      }).length;
      solutions.push({
        durH: Math.round(durH * 100) / 100, depWall: dep, arriveWall: new Date(arriveMs),
        depClock: fmtHMonly(dep), arriveClock: fmtHMonly(new Date(arriveMs)),
        nCashStops: stopsCash.length, dirsCashed: dirsCashed, favHours: favHours, towardSlots: towardSlots,
        quality: towardSlots + stopsCash.length + favHours,
        chargeNeeded: (usableKm > 0) ? (km > usableKm) : false,
        result: res
      });
    }
    // Shortest first (priority), tie-break by the more favourable trip.
    solutions.sort(function (a, b) { return (a.durH - b.durH) || (b.quality - a.quality); });
    var bestFav = null; solutions.forEach(function (s) { if (!bestFav || s.quality > bestFav.quality) bestFav = s; });
    return {
      target: target, tolMin: tolMin, driveH: Math.round(driveH * 100) / 100,
      usedRealRoute: usedRealRoute, km: Math.round(km),
      solutions: solutions, chosen: solutions[0] || null, bestFavorable: bestFav
    };
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

  /* ---- NET-DIRECTION CASHING engine (the user's model) -------------------- *
   * In each positive double-hour we want the NET displacement from the current
   * reference point P0 (origin, or the last stop) to enter the auspicious
   * direction's 45° sector (±22.5°). We follow the REAL road and find the point
   * - as late as possible inside that double-hour - where the net bearing from
   * P0 is already inside the sector (e.g. an initial stretch driven W is
   * "turned into" a net S trip once enough south has accumulated). We stop 20
   * min there: that portion of the drive has cashed the direction's positive
   * energy. The stop becomes the new P0 for the next double-hour.
   * Among several positive directions in a slot we pick the one closest to the
   * overall origin->dest bearing; we skip cashing a direction that points
   * essentially backward (> 90° from the overall route).
   * ----------------------------------------------------------------------- */
  function tpSuggestStopsNetDir(slots, posAt, O, Dst, overallBearing, maxLegHours) {
    maxLegHours = maxLegHours || 4;
    // Reach the cash point at least ~15 min BEFORE the favourable window closes
    // (flexible minimum: arriving earlier is fine; arriving later than this is not).
    var CASH_BUFFER_MS = 15 * 60000;
    var timeline = [];
    timeline.detourIntents = [];   // PHASE 2: detour opportunities for the async real-route layer
    if (!slots.length) return timeline;

    // ── METHOD RULE (authoritative) ──────────────────────────────────────────
    // For EACH Chinese double-hour (时辰):
    //  • If the ROAD direction toward the destination is FORTUNATE this hour → drive
    //    toward the destination and CASH (stop) at the END of the 时辰 (incassi the luck).
    //  • If it is NOT fortunate → either
    //      A) keep driving toward the destination but DO NOT stop until the hour ends
    //         (nothing to cash in a non-positive hour), or
    //      B) DETOUR toward an adjacent (±45°) direction that IS fortunate and does not
    //         lead too far from the destination (within ±67.5°), cashing there; the
    //         return toward the destination in the next hour is itself fortunate, or an
    //         option-A leg. Recorded as a detour intent for the async real-route layer.
    // The leg heading shown is ALWAYS the real direction driven — never a fortunate
    // direction we are not actually following.
    function roadDirOf(slot) {
      var b = (slot.bearingDest != null) ? slot.bearingDest : overallBearing;
      return { name: tpSnapDir(b), deg: b };
    }
    function entryOf(slot, name) {
      var ds = slot.dirs || [];
      for (var k = 0; k < ds.length; k++) if (ds[k].dir === name) return ds[k];
      return null;
    }
    // The road direction's QMDJ entry IF it is fortunate this hour, else null.
    function roadFortunate(slot) {
      var e = entryOf(slot, roadDirOf(slot).name);
      return (e && e.eval && e.eval.ok) ? e : null;
    }
    function neighboursOf(name) {
      var i = TP_DIR_ORDER.indexOf(name);
      if (i < 0) return [];
      var n = TP_DIR_ORDER.length;
      return [TP_DIR_ORDER[(i + n - 1) % n], TP_DIR_ORDER[(i + 1) % n]];
    }
    // A fortunate ADJACENT direction usable for a detour (conditions 1 + 2), or null.
    function detourEntryOf(slot) {
      var rd = roadDirOf(slot);
      var best = null, bestSc = -Infinity;
      neighboursOf(rd.name).forEach(function (nm) {
        var e = entryOf(slot, nm);
        if (!e || !e.eval || !e.eval.ok) return;                 // (1) the adjacent dir must be fortunate
        if (tpAngDiff(TP_DIR_DEG[nm], rd.deg) > 67.5) return;     // (2) must not lead too far from the dest
        var sc = (e.combined != null) ? e.combined : 0;
        if (sc > bestSc) { bestSc = sc; best = e; }
      });
      return best;
    }
    function headFromEntry(entry, roadName, fortunate) {
      if (entry) return { dir: entry.dir, palace: entry.palace, eval: entry.eval, combined: entry.combined, fortunate: !!fortunate, towardDest: true };
      return { dir: roadName, palace: TP_DIR_TO_PALACE[roadName], eval: null, combined: null, fortunate: false, towardDest: true };
    }
    // "then set off toward …" shown on a stop = the next hour's real road heading.
    function nextHeadAfter(i) {
      var ns = (i + 1 < slots.length) ? slots[i + 1] : slots[i];
      var nf = roadFortunate(ns);
      return nf ? headFromEntry(nf, roadDirOf(ns).name, true) : headFromEntry(null, roadDirOf(ns).name, false);
    }

    var P0 = { lat: O.lat, lon: O.lon };
    var legStartMs = slots[0].wallStart.getTime();
    function pushLeg(endWall, endSlotIdx, head, note) {
      timeline.push({ type: 'leg', startWall: new Date(legStartMs), endWall: endWall, heading: head,
        startSlotIdx: tpSlotIndexAt(slots, new Date(legStartMs)), endSlotIdx: endSlotIdx,
        durationH: (endWall.getTime() - legStartMs) / 3600000, note: note || '' });
    }

    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var rd = roadDirOf(slot);
      var fortEntry = roadFortunate(slot);

      if (fortEntry) {
        // FORTUNATE HOUR → drive toward the destination and CASH near the end of the
        // 时辰, stopping ≥ ~15 min before the window closes (arrive a little early to
        // park, plug in and cash within the favourable window).
        var endMs = slot.wallEnd.getTime() - CASH_BUFFER_MS;
        if (endMs <= legStartMs) endMs = slot.wallEnd.getTime();   // guard: never before this leg started
        var endWall = new Date(endMs);
        var rp = posAt(endMs);
        pushLeg(endWall, i, headFromEntry(fortEntry, rd.name, true), '');
        timeline.push({ type: 'stop', atWall: endWall, slotIdx: i,
          reason: 'cash a positive ' + rd.name + ' hour (' + slot.brPy + ') — stop ≥15 min before the window ends',
          newHeading: nextHeadAfter(i), pos: { lat: rp.lat, lon: rp.lon },
          cashDir: rd.name, limitDeg: null, fortunate: true });
        P0 = { lat: rp.lat, lon: rp.lon };
        legStartMs = endMs;
        continue;
      }

      // NON-FORTUNATE HOUR → option B (record a detour) when possible, else option A.
      var det = detourEntryOf(slot);
      if (det) {
        var nextFort = (i + 1 < slots.length) ? !!roadFortunate(slots[i + 1]) : false;
        timeline.detourIntents.push({
          slotIdx: i, pos: { lat: P0.lat, lon: P0.lon },
          dir: det.dir, targetDeg: TP_DIR_DEG[det.dir],
          bearingDest: slot.bearingDest, returnFortunate: nextFort,
          xkScore: (slot.hourScore != null ? slot.hourScore : null), xkPositive: !!slot.hourPositive,
          wallStart: slot.wallStart, wallEnd: slot.wallEnd, brPy: slot.brPy
        });
      }
      // Domain rule: each 時辰 is one travel unit.
      // In a non-fortunate hour the driver may stop:
      //   • Option 1 – leave in the last minutes of the previous fortunate hour,
      //     stop anywhere during this non-fortunate hour; or
      //   • Option 2 – stop at the END of this non-fortunate hour.
      // Either way the stop falls inside this slot. We always record a rest stop
      // at the slot boundary so the snap layer finds a real charger / service area.
      // The driver chooses where exactly to stop within the window.
      if (i < slots.length - 1) {
        var rp2 = posAt(slot.wallEnd.getTime());
        pushLeg(slot.wallEnd, i, headFromEntry(null, rd.name, false), '');
        timeline.push({ type: 'stop', atWall: slot.wallEnd, slotIdx: i,
          reason: 'rest — stop where convenient (non-positive hour)',
          newHeading: nextHeadAfter(i), pos: { lat: rp2.lat, lon: rp2.lon },
          cashDir: null, limitDeg: null, fortunate: false });
        P0 = { lat: rp2.lat, lon: rp2.lon };
        legStartMs = slot.wallEnd.getTime();
      }
    }
    var lastSlot = slots[slots.length - 1];
    pushLeg(lastSlot.wallEnd, slots.length - 1, headFromEntry(null, roadDirOf(lastSlot).name, false), 'arrival');

    // ── RULE #3 (Edu), RESTRICTED: ARRIVAL cashes ONLY the hour you arrive in ──
    // If the journey ENDS while the road direction is fortunate, arriving IS the cash
    // FOR THAT LAST HOUR — so only the last hour's cash stop is pointless and gets
    // dropped. EARLIER fortunate hours are NOT reached at arrival (the trip isn't over
    // yet), so they KEEP their own cash stop: you must still cash before each of those
    // hours ends. Rest stops (non-fortunate) and later EV range-charge stops are NOT
    // touched here; range charging is re-inserted afterwards only if the battery needs it.
    try {
      var arrFort = !!roadFortunate(lastSlot);   // destination reached within a fortunate window?
      if (arrFort) {
        var _lastIdx = slots.length - 1;         // the hour you actually arrive in
        var kept = timeline.filter(function (it) { return !(it.type === 'stop' && it.fortunate && it.slotIdx === _lastIdx); });
        kept.detourIntents = timeline.detourIntents;
        kept.arrivalCashes = true;               // flag for the itinerary text (last hour only)
        timeline = kept;
      }
    } catch (e) { /* keep timeline on any error */ }
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

  // ---- "My tariffs": user-owned charging cards & their per-kWh price -------
  function tpGetTariffs() {
    try { var a = JSON.parse(localStorage.getItem('xkdg_tp_tariffs') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function tpSaveTariffs(list) { try { localStorage.setItem('xkdg_tp_tariffs', JSON.stringify((list || []).slice(0, 60))); } catch (e) {} }
  var TP_TARIFF_SEED = ['Tesla', 'Electra', 'Electric', 'Ionity', 'Free To X', 'Ewiva',
    'Be Charge', 'Atlante', 'A2A', 'EnBW', 'Smatrics', 'Wien Energie', 'Fastned', 'Allego', 'Shell Recharge'];
  function tpSeedTariffsIfNeeded() {
    try {
      if (localStorage.getItem('xkdg_tp_tariffs_seeded') === '1') return;
      if (tpGetTariffs().length) { localStorage.setItem('xkdg_tp_tariffs_seeded', '1'); return; }
      tpSaveTariffs(TP_TARIFF_SEED.map(function (n) { return { network: n, card: '', eur: null }; }));
      localStorage.setItem('xkdg_tp_tariffs_seeded', '1');
    } catch (e) {}
  }
  function tpCheapestTariff(name) {
    var hay = String(name || '').toLowerCase();
    if (!hay) return null;
    var best = null;
    tpGetTariffs().forEach(function (t) {
      var net = String(t.network || '').trim().toLowerCase();
      if (!net || hay.indexOf(net) < 0) return;
      var eur = parseFloat(t.eur);
      if (!isFinite(eur)) return;
      if (!best || eur < best.eur) best = { card: (t.card || t.network), eur: eur, network: t.network };
    });
    return best;
  }
  function tpBuildTariffTable() {
    tpSeedTariffsIfNeeded();
    var box = el('div', { style: 'grid-column:1 / span 2;margin-top:8px;' });
    box.appendChild(el('div', { style: 'font-weight:600;color:#2e5d2e;font-size:12px;margin-bottom:3px;' }, '\uD83D\uDCB3 My charging tariffs'));
    box.appendChild(el('div', { style: 'color:#777;font-size:11px;margin-bottom:5px;' },
      'Add any operator + the card you use + your \u20AC/kWh. The cheapest matching card is shown on each charger. Operator is matched as text inside the charger name (e.g. \u201CFree To X\u201D, \u201CIonity\u201D, \u201CTesla\u201D).'));
    var rowsHost = el('div', {});
    box.appendChild(rowsHost);
    function render() {
      rowsHost.innerHTML = '';
      var list = tpGetTariffs();
      if (!list.length) rowsHost.appendChild(el('div', { style: 'color:#999;font-size:11px;margin:3px 0;' }, 'No tariffs yet \u2014 add your cards below.'));
      list.forEach(function (t, i) {
        var r = el('div', { style: 'display:flex;gap:5px;align-items:center;margin:3px 0;' });
        var netI = el('input', { type: 'text', placeholder: 'Operator (e.g. Free To X)', value: (t.network || ''),
          style: 'flex:2;min-width:0;padding:4px 6px;border:1px solid #cfe3cf;border-radius:5px;font-size:12px;' });
        var cardI = el('input', { type: 'text', placeholder: 'Card (e.g. EVDC)', value: (t.card || ''),
          style: 'flex:1.4;min-width:0;padding:4px 6px;border:1px solid #cfe3cf;border-radius:5px;font-size:12px;' });
        var eurI = el('input', { type: 'number', step: '0.01', min: '0', placeholder: '\u20AC/kWh', value: (t.eur != null && isFinite(t.eur) ? t.eur : ''),
          style: 'flex:none;width:74px;padding:4px 6px;border:1px solid #cfe3cf;border-radius:5px;font-size:12px;' });
        function save() { var l = tpGetTariffs(); l[i] = { network: netI.value.trim(), card: cardI.value.trim(), eur: parseFloat(eurI.value) }; tpSaveTariffs(l); }
        netI.addEventListener('change', save); cardI.addEventListener('change', save); eurI.addEventListener('change', save);
        var del = el('button', { type: 'button', title: 'Remove',
          style: 'flex:none;padding:4px 8px;border:1px solid #e0b0b0;border-radius:5px;background:#fff;color:#b00;font-size:12px;cursor:pointer;' }, '\u2715');
        del.addEventListener('click', function () { var l = tpGetTariffs(); l.splice(i, 1); tpSaveTariffs(l); render(); });
        r.appendChild(netI); r.appendChild(cardI); r.appendChild(eurI); r.appendChild(del);
        rowsHost.appendChild(r);
      });
    }
    var addBtn = el('button', { type: 'button',
      style: 'margin-top:4px;padding:5px 11px;border:1px solid #2e7d32;border-radius:6px;background:#fff;color:#2e7d32;font-size:12px;font-weight:600;cursor:pointer;' }, '+ Add card');
    addBtn.addEventListener('click', function () { var l = tpGetTariffs(); l.push({ network: '', card: '', eur: null }); tpSaveTariffs(l); render(); });
    box.appendChild(addBtn);
    render();
    return box;
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

  /* ---- PHASE F: charging stops along the route --------------------------- *
   * Finds real Tesla/Electra stations from Open Charge Map that are reachable
   * (a) within the remaining range entered by the user (minus a safety reserve)
   * and (b) before the current 2-hour window falls. Reachable stations can be
   * added to the Google Maps export with one tap. All distances along the real
   * route; constant-average-speed ETA (V2a). Live OCM call is defensive.
   * ----------------------------------------------------------------------- */
  function tpNearestRoutePoint(lat, lon, idx) {
    // approximate: nearest polyline vertex; returns {alongKm, offKm}
    var best = { off: Infinity, alongM: 0 };
    for (var i = 0; i < idx.coords.length; i++) {
      var c = idx.coords[i];
      var d = tpHaversineKm(lat, lon, c[1], c[0]);
      if (d < best.off) { best.off = d; best.alongM = idx.cum[i]; }
    }
    return { alongKm: best.alongM / 1000, offKm: best.off };
  }

  // Fetch chargers along the WHOLE route, not just near the origin: sample the
  // polyline every ~step km and query Open Charge Map around each sample, then merge
  // and de-duplicate. Without this, on a long trip only stations within ~250 km of the
  // start are ever retrieved, so the chain collapses to one early charge near home.
  function tpFetchChargersAlong(idx, key, usableKm, corridorKm) {
    var total = idx.total / 1000;
    var step = Math.max(60, Math.min(usableKm * 0.8, 120));   // sample spacing along the route
    var radius = 80;                                          // OCM per-call radius (km); circles overlap at step<=120
    var centers = [];
    for (var a = 0; a < total; a += step) centers.push(idx.posAt(a / total));
    centers.push(idx.posAt(1)); // include the destination end
    var seen = {};
    return Promise.all(centers.map(function (c) {
      // BOTH sources per sampled centre (OCM + TomTom via xkdg-ev), merged & deduped.
      return tpFetchChargersMerged({ key: key, lat: c.lat, lon: c.lon, radiusKm: radius, maxResults: 60 })
        .catch(function () { return []; });
    })).then(function (lists) {
      var merged = [];
      lists.forEach(function (list) {
        (list || []).forEach(function (s) {
          var id = s.lat.toFixed(4) + ',' + s.lon.toFixed(4);
          if (seen[id]) return; seen[id] = 1; merged.push(s);
        });
      });
      return merged;
    });
  }

  function tpRenderChargers(result, container) {
    var block = el('div', { style: 'border:2px solid #1b6e2f;border-radius:10px;padding:10px 12px;margin:14px 0 4px;background:#f6fbf6;' });
    block.appendChild(el('div', { style: 'font-size:14px;font-weight:700;color:#1b6e2f;margin-bottom:6px;' }, '🔌 Charging stops along the route'));
    var note = el('div', { style: 'font-size:11px;color:#666;margin-bottom:8px;line-height:1.5;' },
      'Finds FAST charging (\u2265150 kW) from Open Charge Map reachable within your range (minus reserve) and before the 2-hour window. Prefers Tesla Supercharger/Electra, then other fast operators; if nothing is reachable at that power it falls back to 80 kW. Slow chargers (e.g. 11 kW Destination Chargers) are always skipped. Reachable ones can be added to the Maps export.');
    block.appendChild(note);

    var findBtn = el('button', { type: 'button',
      style: 'width:100%;padding:9px;border:0;border-radius:8px;background:#1b6e2f;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' },
      '🔌 Find charging stops');
    block.appendChild(findBtn);
    var status = el('div', { style: 'font-size:11px;color:#888;margin:6px 0;min-height:14px;' }, '');
    block.appendChild(status);
    var listWrap = el('div', {});
    block.appendChild(listWrap);

    function runChargerSearch(auto) {
      listWrap.innerHTML = '';
      var ocmRealEl = document.getElementById('tp-ocm-key');
      var ocmEditEl = document.getElementById('tp-ocm-key-edit');
      var key = (ocmEditEl && ocmEditEl.style.display !== 'none' && (ocmEditEl.value || '').trim())
        ? ocmEditEl.value.trim()
        : ((ocmRealEl && ocmRealEl.value) || '').trim();
      if (ocmRealEl) ocmRealEl.value = key;
      var range = parseFloat(document.getElementById('tp-range') && document.getElementById('tp-range').value) || 0;
      // If we have a FRESH live reading from the car (<2h), it is authoritative for
      // charging-stop placement — otherwise the plan would silently use the typed/
      // default value and send you to a charger you cannot reach. Reflect it in the field.
      try {
        var _lr = tpGetLiveRange();
        if (_lr && (Date.now() - _lr.ts) < 2 * 3600000 && _lr.km > 0) {
          range = _lr.km;
          var _rEl2 = document.getElementById('tp-range'); if (_rEl2) _rEl2.value = String(_lr.km);
        }
      } catch (e) {}
      var reserve = parseFloat(document.getElementById('tp-reserve') && document.getElementById('tp-reserve').value) || 0;
      var nets = TP_NETWORKS.filter(function (n) { var c = document.getElementById('tp-net-' + n.id); return c && c.checked; }).map(function (n) { return n.id; });
      var preferredOnly = !!(document.getElementById('tp-net-only') && document.getElementById('tp-net-only').checked);

      if (!key && !tpEvWorkerUrl()) { status.style.color = '#b58900'; status.textContent = 'Enter your Open Charge Map key (or the TomTom EV Worker URL) in 🔋 Range & charging first.'; if (auto) { tpReportCharger({ error: 'no_key' }); window._tpChargerPending = false; } return; }
      TP_SRC_FAIL.ocm = 0; TP_SRC_FAIL.tomtom = 0;   // fresh failure tracking for THIS search
      if (!range) { status.style.color = '#b58900'; status.textContent = 'Enter your remaining range (km) in 🔋 Range & charging.'; if (auto) { tpReportCharger({ error: 'no_range' }); window._tpChargerPending = false; } return; }
      var idx = tpBuildRouteIndex(TP_LAST_ROUTE);
      if (!idx) { status.style.color = '#b58900'; status.textContent = 'No real route yet — set the Worker URL and press SCAN TRIP first.'; if (auto) { tpReportCharger({ error: 'no_route' }); window._tpChargerPending = false; } return; }
      tpSetOcmKey(key);

      var usableKm = range * (1 - reserve / 100);
      // DYNAMIC REACH (session 23, Edu: "ho bisogno di un sistema dinamico, altrimenti
      // durante il viaggio l'itinerario non è più realistico"). usableKm is the range
      // from the CURRENT charge — correct for the FIRST leg only. The loop below used it
      // for every leg, i.e. it assumed each recharge put you back exactly where you are
      // now: leaving at 50% planned the whole trip in half-battery hops and invented
      // stops that reality does not need. After a charge the reach is what the target
      // charge gives (up to the 95% ceiling Edu allows), so track it separately.
      var _fullKmR = 0; try { _fullKmR = tpGetFullRange() || 0; } catch (e) {}
      // Same arithmetic the per-stop target below uses (reserve as SoC POINTS, not as a
      // fraction of what's left): reach at the 95% ceiling = (95 - reserve)% of the full
      // range. Deliberately the more conservative of the two formulas in play, so the
      // loop can never pick a charger the charge target cannot actually reach.
      var _afterChargeKm = (_fullKmR > 0) ? (Math.max(0, 95 - reserve) / 100) * _fullKmR : usableKm;
      if (!(_afterChargeKm > 0)) _afterChargeKm = usableKm;
      var _reachKm = usableKm;   // reach for the CURRENT leg; becomes _afterChargeKm after each stop
      var totalKm = idx.total / 1000;
      var O = result.origin;
      // departure + span for ETA (constant average speed)
      var dStr = document.getElementById('tp-date').value, tStr = document.getElementById('tp-time').value || '12:00';
      var depMs = new Date(dStr + 'T' + tStr).getTime();
      var durH = parseFloat(document.getElementById('tp-dur').value) || 12;
      var spanMs = durH * 3600000;
      var winEnd = (result.slots && result.slots[0] && result.slots[0].wallEnd) ? result.slots[0].wallEnd.getTime() : null;
      // Corridor: 15 km is the on-route band. We fetch a WIDER band (up to the detour
      // budget) so the cascade can DETOUR to a preferred, score-preserving Tesla/Electra
      // before opening to other operators. Off-route distance is penalised in ranking, so
      // an on-route charger still wins unless a detour is needed to keep the score up.
      var corridorKm = 15;
      var TP_DETOUR_OFFKM = 35;   // farthest a score-preserving detour may sit off the route

      status.style.color = '#888';
      status.textContent = 'Searching Open Charge Map along the route (usable ≈ ' + Math.round(usableKm) + ' km/leg)…';
      tpFetchChargersAlong(idx, key, usableKm, TP_DETOUR_OFFKM)
        .then(function (stations) {
          // Enrich every station with along-route distance + ETA; keep those within the
          // DETOUR corridor (a wider band). On-route (<=corridorKm) vs detour is tracked
          // via offKm and used to rank: on-route first, detours only when they save the score.
          function tpEnrich(s) {
            var np = tpNearestRoutePoint(s.lat, s.lon, idx);
            return { s: s, alongKm: np.alongKm, offKm: np.offKm,
              etaMs: depMs + (totalKm > 0 ? (np.alongKm / totalKm) : 0) * spanMs };
          }
          var enriched = stations.map(tpEnrich).filter(function (r) { return r.offKm <= TP_DETOUR_OFFKM && isFinite(r.alongKm); });
          function isTE(s) { return tpFilterChargersByNetwork([s], nets).length > 0; }
          enriched.forEach(function (r) { r.isPref = isTE(r.s); });   // preferred brand (Tesla/Electra)?
          // "Preferred networks only": drop every non-preferred station up front, so the
          // fallback tiers below can only ever pick Tesla/Electra. Off by default.
          if (preferredOnly) enriched = enriched.filter(function (r) { return r.isPref; });

          // Cash-stop boundaries: along-route km of each 20-min stop (the 2-hour-window edges), in order.
          var bounds = (result.plan || []).filter(function (x) { return x.type === 'stop' && x.pos; })
            .map(function (st) { var np = tpNearestRoutePoint(st.pos.lat, st.pos.lon, idx); return { atWall: st.atWall, alongKm: np.alongKm, stop: st }; })
            .filter(function (b) { return isFinite(b.alongKm); })
            .sort(function (a, b) { return a.alongKm - b.alongKm; });

          var PRE_KM = 50;   // look this far before each quadrant-exit boundary (50 km before the exit)
          // How far PAST a boundary a charger may still be paired with it. Was hardcoded
          // at 8 km, which lost a real pairing by ONE km on Vienna→Tuoro (ELECTRA at
          // 609 km vs a stop at ~600 km → window ended at 608). A charger a few km past
          // the stop is the same practical break; 25 km stays well inside the reach test
          // in pool(), which independently caps everything at _reachKm.
          var POST_KM = 25;

          // --- Score-preserving cascade (keep the trip >= 3/7 positive legs) -------
          // A charging stop hurts the trip score when its RESTART lands in an
          // unfavourable double-hour (an unfavourable slot). We can tell, at pick time,
          // whether a candidate's ETA falls in a POSITIVE slot: one whose hour is
          // positive OR that offers a gated direction toward the destination. Preferring
          // such chargers is the concrete form of "detour toward a better Tesla/Electra
          // that keeps the score up" before opening to other networks.
          var _slots = result.slots || [];
          function slotAtMs(ms) {
            for (var i = 0; i < _slots.length; i++) {
              var s = _slots[i];
              var a = s.wallStart ? s.wallStart.getTime() : null;
              var b = s.wallEnd ? s.wallEnd.getTime() : null;
              if (a != null && b != null && ms >= a && ms < b) return s;
            }
            return null;
          }
          // true when restarting in this candidate's slot preserves positivity
          function preservesScore(r) {
            var s = slotAtMs(r.etaMs);
            if (!s) return false;
            if (s.hourPositive) return true;
            return (s.dirs || []).some(function (d) { return d.towardDest && d.eval && d.eval.ok; });
          }

          // Best charger inside [lo,hi] reachable from prevAlong. The cascade, in order:
          //   1. PREFERRED (Tesla/Electra) that also PRESERVE the score (positive slot)  [fast, then 80kW]
          //   2. PREFERRED, any slot                                                     [fast, then 80kW]
          //   3. OTHER networks that PRESERVE the score                                  [fast, then 80kW]
          //   4. OTHER networks, any slot                                                [fast, then 80kW]
          // With "preferred networks only" ticked, tiers 3-4 are empty (non-preferred
          // were already dropped up front), so it stays strictly Tesla/Electra.
          function pickForWindow(lo, hi, prevAlong) {
            function pool(kw) {
              return enriched.filter(function (r) {
                // Preferred brands (Tesla/Electra) are known fast-DC hubs; OCM frequently
                // records their PowerKW as null/0. Treat unknown-power PREFERRED stations as
                // meeting the fast threshold so Electra is no longer silently dropped. Non-
                // preferred stations still require a real power reading >= kw.
                var powerOk = (r.isPref && !r.s.powerKnown) ? true : ((r.s.maxKW || 0) >= kw);
                return r.alongKm >= lo && r.alongKm <= hi && powerOk &&
                       (r.alongKm - prevAlong) >= 0 && (r.alongKm - prevAlong) <= _reachKm;
              });
            }
            function closest(list) {
              return list.slice().sort(function (a, b) {
                if (b.alongKm !== a.alongKm) return b.alongKm - a.alongKm;   // as close to the boundary as possible, but before it
                if ((a.offKm || 0) !== (b.offKm || 0)) return (a.offKm || 0) - (b.offKm || 0);  // then nearer the route (smaller detour)
                return (b.s.maxKW || 0) - (a.s.maxKW || 0);                  // then higher power
              })[0] || null;
            }
            function te(list) { return list.filter(function (r) { return r.isPref; }); }
            function keep(list) { return list.filter(preservesScore); }     // score-preserving subset
            function notPos(list) { return list.filter(function (r) { return !preservesScore(r); }); }  // restart window NOT fortunate
            // Try, in priority order, returning the first non-empty pick with flags.
            function tryTier(list, opts) {
              var row = closest(list);
              return row ? { row: row, lowPower: !!opts.low, fallback: !!opts.fb, scoreKept: !!opts.kept } : null;
            }
            var p1 = pool(TP_MIN_KW), p2 = pool(TP_MIN_KW2);
            var t1 = te(p1), t2 = te(p2);
            // POWER RULE (Edu): the plan is built on 20-minute stops, which REQUIRES
            // >=150 kW. A slower charger (80-149 kW) needs a much longer charge and
            // would wreck the hour plan — EXCEPT when the restart window is NOT
            // fortunate: nothing is cashed by leaving quickly, so a longer charge
            // costs nothing (it even waits out the bad window). So the 80+ tier is
            // only ever offered on non-fortunate windows.
            return (
              // 1. preferred, fast, score-preserving
              tryTier(keep(t1), { kept: true }) ||
              // 2. preferred, fast, any window
              tryTier(t1, {}) ||
              // 3. preferred, 80+ kW, ONLY on a non-fortunate restart window (longer charge OK)
              tryTier(notPos(t2), { low: true }) ||
              // 4-6. other networks, same ladder (empty when preferredOnly: te == pool)
              tryTier(keep(p1), { kept: true, fb: true }) ||
              tryTier(p1, { fb: true }) ||
              tryTier(notPos(p2), { low: true, fb: true }) ||
              null
            );
          }

          // RANGE-BASED CHAIN: add charges from start to finish so no leg exceeds the
          // usable range. As far as possible each step (maximise progress), preferring a
          // fast Tesla/Electra; when a 2-hour cash stop falls within the reachable window
          // we charge there (rest + charge together). Stops once the destination is in range.
          var chosen = [], anyLow = false, anyFb = false, prevAlong = 0, gap = false, guard = 0;
          var keptCount = 0, brokeCount = 0;   // score-preserving vs score-breaking stops
          while ((totalKm - prevAlong) > _reachKm && guard++ < 15) {
            var hi = prevAlong + _reachKm;
            var pk = null;
            // (a) prefer a cash-stop boundary reachable within range — charge while resting.
            // Session 23: this used to try ONLY the farthest reachable boundary; if no
            // charger sat next to THAT one, the pick fell through to (b)/(c) and produced
            // a charger with no stopRef — which is invisible in the chat card (it only
            // reaches the Maps export). Measured on Vienna→Tuoro: 4 chargers chosen, 3 of
            // them stopRef-less, so the card showed 1 real charge out of 4. Try EVERY
            // reachable boundary, farthest first, before giving up on a cash pairing.
            var reach = bounds.filter(function (b) { return b.alongKm > prevAlong + 5 && b.alongKm <= hi; });
            for (var _bi = reach.length - 1; _bi >= 0 && (!pk || !pk.row); _bi--) {
              var bb = reach[_bi];
              pk = pickForWindow(Math.max(prevAlong + 1, bb.alongKm - PRE_KM), Math.min(hi, bb.alongKm + POST_KM), prevAlong);
              if (pk && pk.row) pk.stopRef = bb.stop;
            }
            // (b) otherwise the farthest fast charger within range (near the range edge first)
            if (!pk || !pk.row) pk = pickForWindow(Math.max(prevAlong + 1, hi - PRE_KM), hi, prevAlong);
            // (c) last resort: anything reachable ahead
            if (!pk || !pk.row) pk = pickForWindow(prevAlong + 1, hi, prevAlong);
            if (!pk || !pk.row) { gap = true; break; }                    // no reachable charger ahead → gap
            if (pk.row.alongKm <= prevAlong + 1) { gap = true; break; }   // no forward progress → stop
            var dup = chosen.some(function (c) { return c.row.s.lat === pk.row.s.lat && c.row.s.lon === pk.row.s.lon; });
            if (dup) break;
            pk.segStartAlong = prevAlong;   // where THIS segment began, for real SoC math below
            // Expose the tier ladder's own fortune judgment (session 23) — pickForWindow
            // already prefers a restart-window-preserving charger FIRST (tiers 1/2/4);
            // that decision existed but was silently discarded before now.
            pk.fortunate = !!pk.scoreKept;
            chosen.push(pk); if (pk.lowPower) anyLow = true; if (pk.fallback) anyFb = true;
            if (pk.scoreKept) keptCount++; else brokeCount++;
            prevAlong = pk.row.alongKm;
            _reachKm = _afterChargeKm;   // from here on you travel on a CHARGED battery, not today's leftover
          }
          if (!gap && (totalKm - prevAlong) > _reachKm) gap = true;        // tail leg still too long

          if (!chosen.length) {
            if ((totalKm - prevAlong) <= usableKm) {
              // Whole trip fits in the usable range — no charging stop is needed.
              status.style.color = '#1b6e2f';
              status.textContent = '\u2713 Trip is within range (' + Math.round(totalKm) + ' km \u2264 ' + Math.round(usableKm) + ' km usable) — no charging stop needed.';
              if (auto) { tpReportCharger({ error: 'not_needed' }); window._tpChargerPending = false; }
            } else {
              status.style.color = '#b58900';
              status.textContent = 'No reachable fast charger on this route within ' + Math.round(usableKm) + ' km — try a higher range or a different route.' + tpSrcWarnText();
              if (auto) { tpReportCharger({ error: 'none' }); window._tpChargerPending = false; }
            }
            return;
          }

          status.style.color = gap ? '#b58900' : '#1b6e2f';
          var _openedNote = (anyFb && brokeCount > 0)
            ? ' \u2014 opened to other networks to keep you moving; ' + brokeCount + ' stop' + (brokeCount === 1 ? '' : 's') + ' may lower the trip score.'
            : (brokeCount > 0 ? ' \u2014 ' + brokeCount + ' stop' + (brokeCount === 1 ? '' : 's') + ' fall in a less favourable hour.' : '');
          status.textContent = '\u2713 ' + chosen.length + ' charging stop' + (chosen.length === 1 ? '' : 's') + ' along the route (first leg \u2248' + Math.round(usableKm) + ' km on the current charge, then \u2248' + Math.round(_afterChargeKm) + ' km per charged leg)' +
            (anyLow ? ' (a stop uses ' + TP_MIN_KW2 + '\u2013' + TP_MIN_KW + ' kW on a non-fortunate window \u2014 longer charge there costs nothing)' : '') +
            (anyFb ? ' (other networks)' : '') +
            _openedNote +
            (gap ? ' \u2014 \u26a0\ufe0f a leg may exceed your range; add range or stops.' : '') + '.' + tpSrcWarnText();

          // Real SoC/duration at each REAL charger Phase F picked (session 23).
          // Target SoC is no longer flat at 80% for every stop: it is computed PER
          // STOP from how far the NEXT chosen charger (or the destination) actually
          // is. A short gap after this stop → charge little (Edu's "40→60% for a
          // mini cash"); a long gap → charge more, up to the 95% ceiling (Edu's
          // "90% to reach further"). This falls straight out of the route's own
          // geometry — no separate rule needed for the two cases he described.
          // Power is capped at 150 kW — the station's own rating if lower, never the
          // car's 205 kW peak (Edu: a real session rarely sustains the car's ceiling).
          // null soc0/fullKm -> every stop below falls back to the old fixed 20 min,
          // exactly like Phase E when the same data is missing.
          try {
            var _fFullKm = tpGetFullRange();
            var _fLr = tpGetLiveRange();
            var _fSoc0 = (_fLr && _fLr.soc != null && isFinite(_fLr.soc)) ? _fLr.soc
              : ((_fFullKm > 0) ? Math.min(100, (range / _fFullKm) * 100) : null);
            var _fPctPerKm = (_fFullKm > 0) ? (100 / _fFullKm) : null;
            var _fCurSoc = (_fSoc0 != null && isFinite(_fSoc0)) ? _fSoc0 : null;
            var _fReserveFrac = Math.max(0, Math.min(0.9, (reserve || 15) / 100));
            var TARGET_CAP_PCT = 95;   // Edu, session 23: fine up to 95% when the stop
                                       // itself costs nothing extra (e.g. a mall charger).
            var TARGET_MARGIN_PCT = 5; // small safety buffer over the bare minimum needed
            chosen.forEach(function (c, ci) {
              var elapsedKm = c.row.alongKm - (c.segStartAlong != null ? c.segStartAlong : 0);
              var socFrom = (_fCurSoc != null && _fPctPerKm != null)
                ? Math.max(0, _fCurSoc - elapsedKm * _fPctPerKm) : null;
              // How far to the NEXT already-chosen stop (or the destination, for the
              // last one)? That distance — not a flat percentage — sets the target.
              var nextAlongKm = (ci + 1 < chosen.length) ? chosen[ci + 1].row.alongKm : totalKm;
              var gapKm = Math.max(0, nextAlongKm - c.row.alongKm);
              var targetPct = null;
              if (_fPctPerKm != null) {
                var neededPct = (_fReserveFrac * 100) + (gapKm * _fPctPerKm) + TARGET_MARGIN_PCT;
                targetPct = Math.min(TARGET_CAP_PCT, Math.max(neededPct, (socFrom != null ? socFrom : 0) + 5));
              } else {
                targetPct = TP_CHARGE_TARGET * 100;   // no full-range figure -> old flat fallback
              }
              var capKw = Math.min(150, (c.row.s.maxKW && c.row.s.maxKW > 0) ? c.row.s.maxKW : 150);
              var hasSoc = (socFrom != null && socFrom < targetPct);
              var durMin = hasSoc ? Math.max(5, tpEvChargeTimeMin(socFrom, targetPct, capKw)) : 20;
              var kwh = hasSoc ? tpEvEnergyKwh(socFrom, targetPct) : null;
              c.durationMin = durMin;
              c.socFrom = hasSoc ? Math.round(socFrom) : null;
              c.socTo = hasSoc ? Math.round(targetPct) : null;
              c.kwh = kwh;
              if (_fCurSoc != null) _fCurSoc = targetPct;
              // Write onto the actual plan stop, when this charger coincides with one:
              // tpStoreLastResult() already reads it.charge/durationMin/socFrom/socTo/kwh
              // (session 23, Phase E plumbing) — reusing those SAME field names means
              // no second wiring is needed downstream, the card picks this up for free.
              if (c.stopRef) {
                c.stopRef.charge = true;
                c.stopRef.durationMin = durMin;
                if (c.stopRef.atWall) c.stopRef.restartWall = new Date(c.stopRef.atWall.getTime() + durMin * 60000);
                c.stopRef.socFrom = c.socFrom; c.stopRef.socTo = c.socTo; c.stopRef.kwh = kwh;
              }
            });
          } catch (eSoc) { /* leave chosen[].durationMin undefined -> falls back to 20 min below */ }


          // Attach each chosen charger to its quadrant-exit stop so the Maps export
          // shows them interleaved (exit -> charger -> next exit ...). A fallback
          // charger with no cash stop goes into the free-text waypoints instead.
          var exEl = document.getElementById('tp-extra-wp');
          TP_RANGE_CHARGERS = [];   // fresh for this plan
          var _pidJobs = [];        // async place-ID resolutions (exact Maps pin)
          chosen.forEach(function (c) {
            var s = c.row.s;
            var cName = (s.title && !/^\s*charger\s*$/i.test(s.title)) ? String(s.title).trim() : (s.operator || '');
            var rec;
            if (c.stopRef) {
              c.stopRef.charger = { lat: s.lat, lon: s.lon, title: s.title || s.operator || 'Charger', placeId: '' };
              rec = c.stopRef.charger;
            } else if (isFinite(s.lat) && isFinite(s.lon)) {
              // Fallback charger (no linked quadrant stop). Keep its NAME *and* its
              // coordinates so the Maps export positions it in travel order yet emits
              // it by name.
              var cTitle = (s.title && !/^\s*charger\s*$/i.test(s.title)) ? String(s.title).trim() : '';
              rec = { name: cTitle || null, lat: s.lat, lon: s.lon, placeId: '' };
              TP_RANGE_CHARGERS.push(rec);
            }
            // Resolve the Google Place ID so the Maps waypoint pins the station's own
            // listing (its parking entrance) instead of snapping to the nearest road.
            // Best-effort: on failure the token still carries name + coords as a fallback.
            if (rec) {
              _pidJobs.push(
                tpResolveChargerPlaceId(cName, s.lat, s.lon).then(function (pid) {
                  if (pid) rec.placeId = pid;
                }).catch(function () {})
              );
            }
          });
          tpRefreshMapsExport();   // rebuild the Maps link now that the range chargers are known
          if (exEl) exEl.dispatchEvent(new Event('input', { bubbles: true }));  // also refresh via the panel
          // Once place IDs come back, rebuild the export again so the URL gains waypoint_place_ids.
          if (_pidJobs.length) {
            Promise.all(_pidJobs).then(function () {
              try { tpRefreshMapsExport(); } catch (e) {}
              try { if (exEl) exEl.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
            });
          }
          // The card (_tpLastResult / an already-open chat bubble) was built BEFORE this
          // async charger search resolved, so its stop objects still hold the placeholder
          // 20 min. Re-calling tpStoreLastResult() here would REPLACE window._tpLastResult
          // .legs with brand-new objects, breaking the reference the open card's DOM holds
          // (_itinStopEls[i].it) — same trap the OTHER async flow above avoids by mutating
          // leg.place/leg.kind IN PLACE. Do the same: find each matching stored leg (by
          // its "at" time, already unique per stop) and mutate it, then refresh the DOM.
          try {
            if (window._tpLastResult && window._tpLastResult.legs) {
              var _storedLegs = window._tpLastResult.legs;
              chosen.forEach(function (c) {
                if (!c.stopRef || !c.stopRef.atWall) return;
                // Match by ARRAY POSITION (plan and _storedLegs share the same order/length
                // via the original plan.map() build), not by comparing "at" strings — a
                // string match would break for the SECOND+ charge corrected in this same
                // loop, since the FIRST one's cascade has already shifted later strings.
                var idx = plan.indexOf(c.stopRef);
                if (idx < 0 || idx >= _storedLegs.length) return;
                var match = _storedLegs[idx];
                var atStr = match.at;   // this stop's OWN clock (possibly already shifted by an earlier charge's cascade — that's fine, exits compare against the current timeline)
                // CASCADE FIX (session 23): the charge's real duration/restart (from Phase F,
                // async) can differ a lot from the placeholder it replaces — a blind Phase E
                // stop defaults to 20 min flat, but a real 20%→95% charge often needs 45-70+
                // min (most of it in the slow tail of the curve). Before now only THIS stop's
                // own fields were corrected; every "Drive HH:MM → HH:MM" and every later stop's
                // clock AFTER it stayed frozen at the old estimate — Edu saw a charge start and
                // the very next drive line begin at the SAME clock time, as if the charge took
                // zero minutes. Shift everything from here on by the real delta.
                var oldDurMin = (match.duration_min != null) ? match.duration_min : 20;
                match.kind = 'charge';
                match.duration_min = c.durationMin;
                match.restart = fmtHMonly(c.stopRef.restartWall);
                match.socFrom = c.socFrom; match.socTo = c.socTo; match.kwh = c.kwh;
                var deltaMin = Math.round(c.durationMin - oldDurMin);
                if (deltaMin) {
                  for (var lj = idx + 1; lj < _storedLegs.length; lj++) {
                    var Lg = _storedLegs[lj];
                    if (Lg.kind === 'drive') { Lg.from = _shiftHM(Lg.from, deltaMin); Lg.to = _shiftHM(Lg.to, deltaMin); }
                    else { Lg.at = _shiftHM(Lg.at, deltaMin); Lg.restart = _shiftHM(Lg.restart, deltaMin); }
                  }
                  if (window._tpLastResult.exits) {
                    window._tpLastResult.exits.forEach(function (ex) {
                      // Only exits strictly after this stop's ORIGINAL time — comparing the
                      // (now-shifted) boundary via the stop's pre-shift clock avoids moving
                      // exits that happened earlier in the trip.
                      if (ex.at > atStr) ex.at = _shiftHM(ex.at, deltaMin);
                    });
                  }
                }
              });
            }
          } catch (eMatch) {}
          // Chargers Phase F chose that pair with NO cash stop (stopRef null) never reach
          // the chat card — they only enter the Maps export. Measured on Vienna→Tuoro:
          // 4 chosen, 1 visible. Inserting them as real steps would shift every later
          // time and push the cash stops out of their favourable double-hours, so that
          // needs a full replan (open work). Until then they are at least REPORTED, with
          // their SoC/ETA, so the itinerary never understates how many stops it needs.
          // Fold "extra" chargers (no cash-stop pairing) INTO the real numbered
          // sequence instead of hiding them (Edu, session 23): "non capisco il senso
          // di avere degli stop che non sono inclusi nella lista... per le ore non
          // positive in cui bisogna fermarsi si fa così" — the SAME Option-2 doctrine
          // already used for every other forced stop in a non-fortunate hour (stop at
          // the END of that double-hour, then depart) applies here too. A charger
          // landing in a bad hour is not special-cased: charge, and if the charge
          // alone ends before the hour does, wait out the rest of it.
          function _optionTwoRestart(arrivalMs, chargeDurMin) {
            var chargeEndMs = arrivalMs + chargeDurMin * 60000;
            var slot = slotAtMs(arrivalMs);
            var fortunateHere = slot ? (slot.hourPositive || (slot.dirs || []).some(function (d) { return d.towardDest && d.eval && d.eval.ok; })) : true;
            if (fortunateHere || !slot) return { restartMs: chargeEndMs, fortunate: fortunateHere };
            // Option 2 (established doctrine): stay until the unfavourable double-hour
            // itself ends, whichever is later than the charge's own natural end.
            return { restartMs: Math.max(chargeEndMs, slot.wallEnd.getTime()), fortunate: false };
          }
          try {
            var _extras = chosen.filter(function (c) { return !c.stopRef; });
            var _mergeFailed = [];
            if (_extras.length && window._tpLastResult && window._tpLastResult.legs && result.plan) {
              var _planArr = result.plan;
              var _storedLegsX = window._tpLastResult.legs;
              _extras.forEach(function (c) {
                try {
                  var arrivalMs = c.row.etaMs;
                  var opt2 = _optionTwoRestart(arrivalMs, c.durationMin);
                  var waitMin = Math.round((opt2.restartMs - (arrivalMs + c.durationMin * 60000)) / 60000);
                  // Find the drive leg (in the ORIGINAL, unshifted plan — absolute
                  // Date objects, immune to any HH:MM string ambiguity around
                  // midnight) that currently spans this charger's arrival.
                  var splitAt = -1;
                  for (var pi = 0; pi < _planArr.length; pi++) {
                    var pit = _planArr[pi];
                    if (pit.type === 'leg' && pit.startWall.getTime() <= arrivalMs && arrivalMs < pit.endWall.getTime()) { splitAt = pi; break; }
                  }
                  if (splitAt < 0) { _mergeFailed.push(c); return; }
                  var origLeg = _planArr[splitAt];
                  var origLegStartStr = fmtHMonly(origLeg.startWall), origLegEndStr = fmtHMonly(origLeg.endWall);
                  // EXTENDED (session 23 follow-up, Edu's screenshot): a charger that
                  // needs more time than is left before the NEXT already-planned stop
                  // used to just be abandoned here (safe, but back in the yellow box —
                  // exactly the case Edu found: charge 20:16→20:46, but stop F was
                  // already fixed at 20:26, only 10 min of room). Instead of giving up,
                  // PUSH that next stop (and everything after it) later by the overflow —
                  // the same cascade already used for Phase F's real-duration correction,
                  // just triggered by an insertion instead of a delta.
                  var overflowMs = Math.max(0, opt2.restartMs - (origLeg.endWall.getTime() - 60000));
                  var overflowMin = Math.ceil(overflowMs / 60000);
                  if (overflowMs > 0) {
                    for (var pj = splitAt + 1; pj < _planArr.length; pj++) {
                      var pjt = _planArr[pj];
                      if (pjt.startWall) pjt.startWall = new Date(pjt.startWall.getTime() + overflowMs);
                      if (pjt.endWall) pjt.endWall = new Date(pjt.endWall.getTime() + overflowMs);
                      if (pjt.atWall) pjt.atWall = new Date(pjt.atWall.getTime() + overflowMs);
                      if (pjt.restartWall) pjt.restartWall = new Date(pjt.restartWall.getTime() + overflowMs);
                    }
                  }
                  var arrivalDate = new Date(arrivalMs), restartDate = new Date(opt2.restartMs);
                  var pushedEndWall = new Date(origLeg.endWall.getTime() + overflowMs);
                  var slotHere = tpSlotIndexAt(_slots, arrivalDate);
                  var slotAfter = tpSlotIndexAt(_slots, restartDate);
                  var newStop = {
                    type: 'stop', charge: true, durationMin: (c.durationMin + Math.max(0, waitMin)),
                    atWall: arrivalDate, restartWall: restartDate,
                    newHeading: origLeg.heading, pos: { lat: c.row.lat, lon: c.row.lon },
                    cashDir: null, limitDeg: null, slotIdx: slotAfter,
                    reason: 'charging stop (battery range)' + (waitMin > 0 ? ' + wait for the next favourable hour' : ''),
                    fortunate: opt2.fortunate, rangeForced: false,
                    socFrom: c.socFrom, socTo: c.socTo, kwh: c.kwh
                  };
                  var legBefore = { type: 'leg', startWall: origLeg.startWall, endWall: arrivalDate, heading: origLeg.heading,
                    startSlotIdx: origLeg.startSlotIdx, endSlotIdx: slotHere, durationH: (arrivalMs - origLeg.startWall.getTime()) / 3600000, note: '' };
                  var legAfter = { type: 'leg', startWall: restartDate, endWall: pushedEndWall, heading: origLeg.heading,
                    startSlotIdx: slotAfter, endSlotIdx: origLeg.endSlotIdx, durationH: (pushedEndWall.getTime() - opt2.restartMs) / 3600000, note: origLeg.note };
                  _planArr.splice(splitAt, 1, legBefore, newStop, legAfter);
                  // Same shape tpStoreLastResult()'s own plan.map() produces — kept in
                  // sync by hand so this stays a splice, not a full rebuild (which would
                  // replace _tpLastResult.legs and break the card's existing DOM refs).
                  var storedBefore = { kind: 'drive', from: fmtHMonly(legBefore.startWall), to: fmtHMonly(legBefore.endWall),
                    hours: Math.round(legBefore.durationH * 10) / 10, toward: tpHeadDirOnly(legBefore.heading), arrival: false };
                  var storedStop = { kind: 'charge', at: fmtHMonly(newStop.atWall), duration_min: newStop.durationMin,
                    restart: fmtHMonly(newStop.restartWall), toward: tpHeadDirOnly(newStop.newHeading),
                    lat: c.row.lat, lon: c.row.lon, cashDir: null, limitDeg: null,
                    socFrom: c.socFrom, socTo: c.socTo, kwh: c.kwh, fortunate: opt2.fortunate,
                    rangeForced: false, redundant: false,
                    place: (c.row.s.title && !/^\s*charger\s*$/i.test(c.row.s.title)) ? String(c.row.s.title).trim() : (c.row.s.operator || null) };
                  var storedAfter = { kind: 'drive', from: fmtHMonly(legAfter.startWall), to: fmtHMonly(legAfter.endWall),
                    hours: Math.round(legAfter.durationH * 10) / 10, toward: tpHeadDirOnly(legAfter.heading), arrival: (origLeg.note === 'arrival') };
                  var storedIdx = -1;
                  for (var si2 = 0; si2 < _storedLegsX.length; si2++) {
                    if (_storedLegsX[si2].kind === 'drive' && _storedLegsX[si2].from === origLegStartStr && _storedLegsX[si2].to === origLegEndStr) { storedIdx = si2; break; }
                  }
                  if (storedIdx < 0) { _planArr.splice(splitAt, 3, origLeg); _mergeFailed.push(c); return; }   // undo the plan splice, fall back
                  if (overflowMin > 0) {
                    for (var sj = storedIdx + 1; sj < _storedLegsX.length; sj++) {
                      var Lgx = _storedLegsX[sj];
                      if (Lgx.kind === 'drive') { Lgx.from = _shiftHM(Lgx.from, overflowMin); Lgx.to = _shiftHM(Lgx.to, overflowMin); }
                      else { Lgx.at = _shiftHM(Lgx.at, overflowMin); Lgx.restart = _shiftHM(Lgx.restart, overflowMin); }
                    }
                    if (window._tpLastResult.exits) {
                      window._tpLastResult.exits.forEach(function (ex) { if (ex.at >= origLegEndStr) ex.at = _shiftHM(ex.at, overflowMin); });
                    }
                  }
                  _storedLegsX.splice(storedIdx, 1, storedBefore, storedStop, storedAfter);
                } catch (eOne) { _mergeFailed.push(c); }
              });
              window._tpLastResult.stops_changed = true;   // signal ai-chat.js: rebuild the numbered list, don't just patch fields
            } else {
              _mergeFailed = _extras;
            }
            // Any charger that could NOT be merged (rare — split point not found, or a
            // stored-leg lookup mismatch) still gets reported, never silently dropped.
            if (window._tpLastResult) {
              window._tpLastResult.extra_chargers = _mergeFailed.map(function (c) {
                return {
                  name: (c.row.s.title && !/^\s*charger\s*$/i.test(c.row.s.title)) ? String(c.row.s.title).trim() : (c.row.s.operator || 'Charger'),
                  km: Math.round(c.row.alongKm), kw: (c.row.s.maxKW > 0) ? Math.round(c.row.s.maxKW) : null,
                  eta: fmtHMonly(new Date(c.row.etaMs)), socFrom: c.socFrom, socTo: c.socTo, kwh: c.kwh,
                  duration_min: c.durationMin, fortunate: !!c.fortunate
                };
              });
            }
          } catch (eExtra) {}
          // Whole-trip lucky fraction (Edu, session 23). BUGFIX: this used to filter
          // _lr.legs by `it.type === 'stop'` — but legs (the STORED/exposed mirror) use
          // `kind`, not `type` (`type` only exists on the separate `plan` array) — so
          // _cashStops was ALWAYS empty and every cash stop was silently missing from
          // the count. Now every stop/charge entry in the FINAL legs array (cash stops,
          // Phase-F-attached chargers, blind Phase-E chargers, and the merged extras
          // above — all of it, one array, no more separate tally) counts once.
          try {
            var _lr = window._tpLastResult;
            if (_lr && _lr.legs) {
              var _allStops = _lr.legs.filter(function (it) { return it && (it.kind === 'stop' || it.kind === 'charge'); });
              var _fort = _allStops.filter(function (it) { return !!it.fortunate; }).length;
              var _total = _allStops.length;
              _lr.lucky_fraction = _total > 0 ? Math.round((_fort / _total) * 100) / 100 : null;
              _lr.lucky_stops = _fort; _lr.total_stops = _total;
            }
          } catch (eFrac) {}
          // Edu, session 23: forced-by-range stops (Phase E, blind) should be the LAST
          // resort, not the default — this is the concrete fix ("lo AI costruisce un
          // itinerario dove mi devo fermare anche se non ce n'è bisogno"). A forced stop
          // is provably UNNECESSARY when (a) the whole trip turned out coverable end to
          // end by REAL chargers (gap === false, computed above) AND (b) THIS SPECIFIC
          // forced stop never got a real charger attached by Phase F's own bounds-match
          // (which already tries — see `bounds` above, built from EVERY stop incl.
          // forced ones). If Phase F found no gap yet skipped straight past it, nothing
          // was ever needed there. Never removes the row (would desync the A/B/C… map
          // letters other lines already reference) — greys it out instead.
          try {
            if (!gap && result.plan && window._tpLastResult && window._tpLastResult.legs) {
              var _storedLegs2 = window._tpLastResult.legs;
              result.plan.forEach(function (fp) {
                if (fp.type === 'stop' && fp.rangeForced && !fp.charger && fp.atWall) {
                  fp.redundant = true;
                  var atStr2 = fmtHMonly(fp.atWall);
                  var match2 = _storedLegs2.filter(function (Lg) { return Lg.kind !== 'drive' && Lg.at === atStr2; })[0];
                  if (match2) match2.redundant = true;
                  // Also uncheck it in the Maps-export checklist (session 23) — the
                  // real-world stakes here are higher than the chat card: sending Edu
                  // to a stop that was never needed is a wasted 20+ minutes on the road,
                  // not just a confusing line of text. He can still re-check it by hand.
                  try {
                    var cbEntry = TP_LAST_MAPS_CHECKS.filter(function (x) { return x.stop === fp; })[0];
                    if (cbEntry && cbEntry.cb) {
                      cbEntry.cb.checked = false;
                      cbEntry.cb.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  } catch (eCb) {}
                }
              });
            }
          } catch (eRedund) {}
          try { if (window.XKDGChat && window.XKDGChat.updateItineraryStops) window.XKDGChat.updateItineraryStops(); } catch (eUpd) {}

          chosen.forEach(function (c) {
            var r = c.row, s = r.s, when = new Date(r.etaMs);
            var hm = String(when.getHours()).padStart(2, '0') + ':' + String(when.getMinutes()).padStart(2, '0');
            var row = el('div', { style: 'display:flex;align-items:center;gap:8px;border-top:1px solid #e0eee0;padding:6px 0;font-size:12px;' });
            var info = el('div', { style: 'flex:1;min-width:0;' });
            info.appendChild(el('div', { style: 'font-weight:600;color:#333;' }, (s.title || s.operator || 'Charger')));
            info.appendChild(el('div', { style: 'color:#888;' },
              (s.operator ? s.operator + ' \u00b7 ' : '') + (s.maxKW ? Math.round(s.maxKW) + ' kW \u00b7 ' : '') +
              Math.round(r.alongKm) + ' km along \u00b7 ' + r.offKm.toFixed(1) + ' km off route \u00b7 ETA ' + hm));
            var _tf = tpCheapestTariff((s.title || '') + ' ' + (s.operator || ''));
            if (_tf) info.appendChild(el('div', { style: 'color:#1b6e2f;font-size:11px;font-weight:600;' },
              '\uD83D\uDCB3 ' + _tf.card + ' \u00b7 \u20AC' + _tf.eur.toFixed(2) + '/kWh'));
            row.appendChild(info);
            var seeBtn = el('button', { type: 'button', title: 'See this charger in Google Maps',
              style: 'padding:5px 9px;border:1px solid #1565c0;border-radius:6px;background:#fff;color:#1565c0;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;' }, '\ud83d\udd0d Maps');
            (function (la, lo) { seeBtn.addEventListener('click', function () { tpOpenPoint(la, lo); }); })(s.lat, s.lon);
            row.appendChild(seeBtn);
            row.appendChild(el('span', { style: 'color:#1b6e2f;font-size:12px;font-weight:600;white-space:nowrap;' }, '\u2713 on route'));
            listWrap.appendChild(row);
          });

          if (auto) {
            status.textContent += ' \u00b7 added to the Maps export.';
            var first = chosen[0].row;
            tpReportCharger({ name: first.s.title || first.s.operator || 'Charger', km: Math.round(first.alongKm), kw: first.s.maxKW,
              fallback: anyFb, lowPower: anyLow, count: chosen.length,
              scoreKept: keptCount, scoreBroke: brokeCount, openedOtherNetworks: (anyFb && brokeCount > 0) });
          }
          if (auto) window._tpChargerPending = false;
        })
        .catch(function (err) {
          status.style.color = '#b00';
          status.textContent = 'Charging lookup failed: ' + err.message + '. Check the OCM key / connection.';
          if (auto) { tpReportCharger({ error: 'failed' }); window._tpChargerPending = false; }
        });
    }
    findBtn.addEventListener('click', function () { runChargerSearch(false); });

    container.appendChild(block);
    // When opened by the AI, run the charger search automatically (one-shot) and add the best stop to the Maps export.
    if (window._tpAutoChargers) { window._tpAutoChargers = false; setTimeout(function () { try { runChargerSearch(true); } catch (e) {} }, 60); }
  }

  /* ---- PHASE D: Google Maps export panel --------------------------------- *
   * Lets the user choose which planned stops become waypoints, and add their
   * own (place names or lat,lng) for real-world changes. Builds a live Maps
   * deep link with Open / Copy actions.
   * ----------------------------------------------------------------------- */
  function tpRenderMapsExport(result, container) {
    var O = result.origin, Dst = result.dest;
    if (!O || !Dst || O.lat == null || Dst.lat == null) return;
    var stops = (result.plan || []).filter(function (x) { return x.type === 'stop' && x.pos; });

    var wrap = el('div', { style: 'border:2px solid #1565c0;border-radius:10px;padding:10px 12px;margin:14px 0 4px;background:#f4f8ff;' });
    wrap.appendChild(el('div', { style: 'font-size:14px;font-weight:700;color:#1565c0;margin-bottom:6px;' }, '🗺️ Send to Google Maps'));
    wrap.appendChild(el('div', { style: 'font-size:11px;color:#666;margin-bottom:8px;line-height:1.5;' },
      'Pick which planned stops to include as waypoints. Charging stops are sent <b>by name</b> (a named, tappable pin in ' +
      'Google Maps, so the route is forced through them); other on-road points are sent as coordinates. Open the link and ' +
      'adjust to the nearest charger/town if needed. Add your own stops below for real-world changes (separate with “;”).'));

    // From (fixed)
    wrap.appendChild(el('div', { style: 'font-size:12px;color:#333;margin:2px 0;' },
      '<b>From:</b> ' + (O.name || 'Origin') + ' <span style="color:#999;">(' + tpLatLng({ lat: O.lat, lon: O.lon }) + ')</span>'));

    // Stops checklist
    var checks = [];
    TP_LAST_MAPS_CHECKS = checks;   // exposed so Phase F (async, later) can uncheck a
                                     // stop it proves unnecessary — same `stop` object
                                     // reference as `result.plan`'s entries (see below).
    if (stops.length) {
      var listWrap = el('div', { style: 'margin:6px 0 6px 4px;' });
      var _placePts = [];   // { span, pos } to fill with reverse-geocoded names
      stops.forEach(function (st) {
        var row = el('div', { style: 'display:flex;align-items:center;gap:7px;margin:3px 0;' });
        var lab = el('label', { style: 'display:flex;align-items:center;gap:7px;font-size:12px;color:#333;cursor:pointer;flex:1;min-width:0;' });
        var cb = el('input', { type: 'checkbox' });
        cb.checked = true;
        var when = fmtHMonly(st.atWall);
        var txt;
        if (st.cashDir) {
          txt = '\ud83d\udea9 Exit <b>' + st.cashDir + '</b> quadrant \u00b7 <b>' + when + '</b> \u00b7 ' +
            '<span class="tp-place" style="color:#1565c0;">\u2026</span>' +
            (st.limitDeg != null ? ' <span style="color:#999;">(limit ' + Math.round(st.limitDeg) + '\u00b0)</span>' : '');
        } else {
          var dur = st.charge && st.durationMin ? ' (' + st.durationMin + ' min)' : '';
          txt = (st.charge ? '\ud83d\udd0c' : '\ud83d\uded1') + ' <b>' + when + '</b>' + dur +
            ' \u00b7 <span class="tp-place" style="color:#999;">\u2026</span>';
        }
        lab.appendChild(cb);
        var span = el('span', null, txt);
        lab.appendChild(span);
        row.appendChild(lab);
        var seeBtn = el('button', { type: 'button', title: 'See this point in Google Maps',
          style: 'padding:5px 9px;border:1px solid #1565c0;border-radius:6px;background:#fff;color:#1565c0;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;' }, '\ud83d\udd0d Maps');
        (function (p) { seeBtn.addEventListener('click', function (e) { if (e) e.preventDefault(); tpOpenPoint(p.lat, p.lon); }); })(st.pos);
        row.appendChild(seeBtn);
        listWrap.appendChild(row);
        checks.push({ cb: cb, pos: st.pos, stop: st });
        var ps = span.querySelector('.tp-place');
        if (ps) _placePts.push({ span: ps, pos: st.pos });
      });
      wrap.appendChild(listWrap);
      // Fill the place names (reverse geocoding, sequential so we are gentle on the geocoder).
      tpReverseGeocodeMany(_placePts.map(function (x) { return x.pos; }))
        .then(function (names) { _placePts.forEach(function (x, i) { x.span.textContent = names[i] ? ('near ' + names[i]) : tpLatLng(x.pos); }); })
        .catch(function () { _placePts.forEach(function (x) { x.span.textContent = tpLatLng(x.pos); }); });
    } else {
      wrap.appendChild(el('div', { style: 'font-size:12px;color:#888;margin:4px 0 4px 4px;' }, 'No planned stops — the link will be a direct route (you can still add your own below).'));
    }

    // Extra (free-text) waypoints
    var extraWrap = el('label', { style: 'display:flex;flex-direction:column;gap:2px;font-size:12px;color:#444;margin:6px 0;' },
      'Add your own stops (place names or lat,lng, separated by “;”)');
    var extraInp = el('input', { id: 'tp-extra-wp', type: 'text', placeholder: 'e.g. Firenze; 43.7696,11.2558; Autogrill Secchia',
      style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:12px;' });
    extraWrap.appendChild(extraInp);
    wrap.appendChild(extraWrap);

    // To (fixed)
    wrap.appendChild(el('div', { style: 'font-size:12px;color:#333;margin:2px 0;' },
      '<b>To:</b> ' + (Dst.name || 'Destination') + ' <span style="color:#999;">(' + tpLatLng({ lat: Dst.lat, lon: Dst.lon }) + ')</span>'));

    var status = el('div', { style: 'font-size:11px;margin:8px 0 6px;color:#666;' });
    wrap.appendChild(status);

    var btnRow = el('div', { style: 'display:flex;gap:8px;' });
    var openBtn = el('button', { id: 'tp-maps-open', style: 'flex:1;padding:9px;border:0;border-radius:8px;background:#1565c0;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, '📍 Open in Google Maps');
    var copyBtn = el('button', { style: 'flex:1;padding:9px;border:1px solid #1565c0;border-radius:8px;background:#fff;color:#1565c0;font-size:13px;font-weight:600;cursor:pointer;' }, '🔗 Copy link');
    btnRow.appendChild(openBtn); btnRow.appendChild(copyBtn);
    wrap.appendChild(btnRow);

    // Auto-open toggle (default OFF): when ticked, an AI-planned itinerary opens Google Maps by itself (no tap), by
    // navigating this tab to Maps. Default OFF — the planner stays open and the user opens Maps deliberately
    // (button, or a voice/typed "open in Maps"). Meant only for those who want the old hands-free driving behaviour.
    var hfLab = el('label', { style: 'display:flex;align-items:center;gap:7px;margin:8px 0 0;font-size:12px;color:#444;cursor:pointer;' });
    var hfCb = el('input', { type: 'checkbox', id: 'tp-automaps' });
    hfCb.checked = tpAutoMapsOn();
    hfCb.addEventListener('change', function () { tpSetAutoMaps(hfCb.checked); });
    hfLab.appendChild(hfCb);
    hfLab.appendChild(el('span', null, '🚗 Auto-open Maps (default OFF): tick only if you want an AI-planned trip to jump to Google Maps by itself. Off = the planner stays open and you open Maps with the button (or by saying/typing "open in Maps").'));
    wrap.appendChild(hfLab);

    function collectWaypoints() {
      // Resolve each point's distance ALONG the route so the waypoints come out
      // in travel order (origin → … → destination) instead of the order they
      // were collected — otherwise Maps draws a zig-zag.
      // Use the real road route ONLY if it matches THIS trip's endpoints (never an
      // earlier trip's route — projecting onto a stale route is what put stops out of
      // order). If it does not match, we cannot project, so we keep the chargers in
      // their found (travel) order instead.
      var matchRoute = (TP_LAST_ROUTE && O && Dst &&
        tpRouteMatches(TP_LAST_ROUTE, { lat: O.lat, lng: O.lon }, { lat: Dst.lat, lng: Dst.lon })) ? TP_LAST_ROUTE : null;
      var idx = tpBuildRouteIndex(matchRoute);
      var extraRaw = (extraInp.value || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      function nearOf(p) { return idx ? tpNearestRoutePoint(p.lat, p.lon, idx) : null; }
      var pts = [];          // positionable along the route ({token, placeId, along})
      var seq = [];          // travel-ordered fallback when no route ({token, placeId, order})
      var seqN = 0, dropped = 0;
      // A charger token carries BOTH its name AND its coordinates ("Name, lat, lon") as a
      // TEXT fallback; when a Google PLACE ID is known it is emitted in the parallel
      // waypoint_place_ids list, which pins the station's OWN listing (its parking entrance)
      // instead of snapping a bare lat/lon onto the nearest road. Positioning along the route
      // uses the numeric lat/lon, so travel order is unchanged.
      function chargerToken(name, lat, lon) {
        var nm = (name && String(name).trim()) ? String(name).trim() : '';
        var ll = tpLatLng({ lat: lat, lon: lon });
        return nm ? (nm + ', ' + ll) : ll;
      }
      function addCharger(name, lat, lon, placeId) {
        var tok = chargerToken(name, lat, lon);
        if (idx) {
          var npc = nearOf({ lat: lat, lon: lon });
          if (npc && isFinite(npc.alongKm)) { pts.push({ token: tok, placeId: placeId || '', along: npc.alongKm }); return; }
        }
        seq.push({ token: tok, placeId: placeId || '', order: seqN++ });   // no route (or off the indexed path): keep found order
      }
      checks.filter(function (c) { return c.cb.checked; }).forEach(function (c) {
        var st = c.stop;
        // A CHARGE stop IS the charger: emit it BY NAME + PLACE ID (exact, route-forcing pin).
        if (st && st.charge && st.charger && isFinite(st.charger.lat) && isFinite(st.charger.lon)) {
          var title = (st.charger.title && !/^\s*charger\s*$/i.test(st.charger.title)) ? String(st.charger.title).trim() : '';
          addCharger(title, st.charger.lat, st.charger.lon, st.charger.placeId || '');
          return;
        }
        // A quadrant-exit point is a bare coordinate that must sit ON the fast road —
        // it can only be placed when a matching route is loaded; otherwise skip it
        // (an unpositioned coordinate would scramble the order).
        if (!idx) { return; }
        var np = nearOf(c.pos);
        if (!np || !isFinite(np.alongKm) || np.offKm > TP_WAYPOINT_MAX_OFFKM) { dropped++; return; }
        pts.push({ token: tpLatLng(c.pos), placeId: '', along: np.alongKm });               // quadrant-exit point
      });
      // Range-only (fallback) chargers: already found in travel order; emit BY NAME + PLACE ID,
      // positioned along the route when possible so they interleave correctly.
      (TP_RANGE_CHARGERS || []).forEach(function (ch) {
        if (ch && isFinite(ch.lat) && isFinite(ch.lon)) addCharger(ch.name, ch.lat, ch.lon, ch.placeId || '');
      });
      // User free-text extras: coordinates get positioned; typed names trail in order.
      var trailing = [];
      extraRaw.forEach(function (tok) {
        var m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(tok);
        if (m && idx) {
          var np2 = tpNearestRoutePoint(parseFloat(m[1]), parseFloat(m[2]), idx);
          if (np2 && isFinite(np2.alongKm)) { pts.push({ token: tok, placeId: '', along: np2.alongKm }); return; }
        }
        trailing.push(tok);
      });
      pts.sort(function (a, b) { return a.along - b.along; });                          // travel order
      var orderedPts = pts.concat(seq.sort(function (a, b) { return a.order - b.order; }));
      var wps = [], pids = [];
      orderedPts.forEach(function (p) {                                                // de-dup neighbours by token
        if (wps.length && wps[wps.length - 1] === p.token) return;
        wps.push(p.token); pids.push(p.placeId || '');
      });
      trailing.forEach(function (t) { wps.push(t); pids.push(''); });
      collectWaypoints._dropped = dropped;
      // Google Maps keeps only a limited number of waypoints; after sorting,
      // trimming from the far end keeps the nearest ones (reached first).
      if (wps.length > TP_MAPS_MAX_WAYPOINTS) { wps = wps.slice(0, TP_MAPS_MAX_WAYPOINTS); pids = pids.slice(0, TP_MAPS_MAX_WAYPOINTS); }
      collectWaypoints._placeIds = pids;
      return wps;
    }
    function update() {
      var wps = collectWaypoints();
      var n = wps.length;
      var dropped = collectWaypoints._dropped || 0;
      var url = tpBuildMapsUrl({ lat: O.lat, lon: O.lon }, { lat: Dst.lat, lon: Dst.lon }, wps, collectWaypoints._placeIds);
      openBtn._url = url; copyBtn._url = url;
      var warn = (n > TP_MAPS_MAX_WAYPOINTS)
        ? ' <span style="color:#b00;">⚠️ ' + n + ' waypoints — Maps may keep only the first ' + TP_MAPS_MAX_WAYPOINTS + '. Deselect a few.</span>'
        : '';
      var dropNote = dropped
        ? ' <span style="color:#0b8043;">' + dropped + ' favourable stop' + (dropped === 1 ? '' : 's') + ' off the fast road were skipped to keep the route shortest.</span>'
        : '';
      var routeNote = (!tpBuildRouteIndex(TP_LAST_ROUTE))
        ? ' <span style="color:#b58900;">No real road route loaded — exporting the DIRECT route (press 🛰️ Fetch route / set the Worker URL to follow favourable on-road stops).</span>'
        : '';
      status.innerHTML = '<b>' + n + '</b> waypoint' + (n === 1 ? '' : 's') + ' in travel order (origin → … → destination). ' +
        'You can still drag to reorder once Maps opens.' + warn + dropNote + routeNote;
    }
    checks.forEach(function (c) { c.cb.addEventListener('change', update); });
    extraInp.addEventListener('input', update);
    openBtn.addEventListener('click', function () { tpOpenInMaps(false); });
    copyBtn.addEventListener('click', function () { tpCopyToClipboard(copyBtn._url, copyBtn, '✓ Copied', '🔗 Copy link'); });
    _tpMapsUpdate = update;   // let a later charger search refresh the link
    update();

    container.appendChild(wrap);
  }

  function tpHeadDirOnly(h) { return (h && h.dir) ? h.dir : '?'; }
  // Shift an "HH:MM" string by N minutes (session 23 helper). Module-scope on
  // purpose — two separate cascade fixes inside tpRenderChargers both need it,
  // and a function declared inside one try-block's if-body is NOT reliably
  // visible to a sibling try-block (that depends on non-strict-mode hoisting
  // quirks this file shouldn't lean on).
  function _shiftHM(hm, deltaMin) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hm || '');
    if (!m || !deltaMin) return hm;
    var total = ((parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + deltaMin) % 1440 + 1440) % 1440;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }
  function tpStoreLastResult(result) {
    try {
      var rm = result.routeMeta || {};
      var drive = null;
      if (rm.durationSec) { var h = Math.floor(rm.durationSec / 3600), m = Math.round((rm.durationSec % 3600) / 60); drive = h + 'h' + String(m).padStart(2, '0'); }
      var plan = result.plan || [];
      var nStops = plan.filter(function (x) { return x.type === 'stop'; }).length;
      var legs = plan.map(function (it) {
        if (it.type === 'leg') {
          return { kind: 'drive', from: fmtHMonly(it.startWall), to: fmtHMonly(it.endWall),
            hours: Math.round(it.durationH * 10) / 10, toward: tpHeadDirOnly(it.heading), arrival: it.note === 'arrival' };
        }
        return { kind: it.charge ? 'charge' : 'stop', at: fmtHMonly(it.atWall),
          duration_min: it.charge ? it.durationMin : 20,
          restart: it.charge ? fmtHMonly(it.restartWall) : fmtHMonly(it.atWall),
          toward: tpHeadDirOnly(it.newHeading),
          lat: (it.pos ? it.pos.lat : null), lon: (it.pos ? it.pos.lon : null),
          cashDir: it.cashDir || null,
          limitDeg: (it.limitDeg != null ? Math.round(it.limitDeg) : null),
          socFrom: (it.socFrom != null ? it.socFrom : null),
          socTo: (it.socTo != null ? it.socTo : null),
          kwh: (it.kwh != null ? it.kwh : null),
          // rangeForced: this stop exists ONLY because a leg exceeded usable range —
          // not because of a favourable hour or a real charger (Phase E, blind).
          // redundant: set later, ASYNC, by Phase F (session 23) — true only when the
          // whole trip turned out coverable by REAL chargers and this specific forced
          // stop never got one attached. False/undefined at first render; the card
          // greys it out once (if) Phase F confirms it wasn't actually needed.
          rangeForced: !!it.rangeForced,
          redundant: false,
          place: null };
      });
      var exits = [];
      plan.forEach(function (it) {
        if (it.type === 'stop' && it.cashDir && it.pos)
          exits.push({ dir: it.cashDir, at: fmtHMonly(it.atWall),
            limitDeg: (it.limitDeg != null ? Math.round(it.limitDeg) : null),
            lat: it.pos.lat, lon: it.pos.lon, place: null });
      });
      var lines = [];
      // #1 (Edu): ALWAYS show the Chinese double-hour (时辰) of departure, e.g. "巳时 (Si)".
      var _depCh = null;
      try {
        var _firstLeg = (plan || []).filter(function (x) { return x.type === 'leg' && x.startWall; })[0];
        if (_firstLeg && result.origin && result.origin.lon != null) {
          var _ch = tpChineseHourAt(_firstLeg.startWall.getTime(), result.origin.lon, (result.utc != null ? result.utc : 1), !!result.dstOn);
          if (_ch) _depCh = _ch.han + '时 (' + _ch.py + ')';
        }
      } catch (e) {}
      lines.push((result.origin.name || 'Origin') + ' → ' + (result.dest.name || 'Destination') +
        ' · bearing ' + Math.round(result.bearing) + '° (' + result.snapDir + ')' +
        (_depCh ? ' · depart ' + _depCh : '') +
        (result.usedRealRoute && rm.km ? ' · real road ' + Math.round(rm.km) + ' km' + (drive ? ' · ' + drive + ' driving' : '') : ' · straight-line estimate'));
      plan.forEach(function (it) {
        if (it.type === 'leg') {
          lines.push('Drive ' + fmtHMonly(it.startWall) + '→' + fmtHMonly(it.endWall) + ' (' + (Math.round(it.durationH * 10) / 10) + 'h) toward ' + tpHeadDirOnly(it.heading) + (it.note === 'arrival' ? ' — arrive at ' + result.dest.name : ''));
        } else if (it.cashDir) {
          lines.push('Exit ' + it.cashDir + ' quadrant ~' + fmtHMonly(it.atWall) +
            (it.limitDeg != null ? ' (limit ' + Math.round(it.limitDeg) + '°)' : '') +
            ', then set off toward ' + tpHeadDirOnly(it.newHeading));
        } else {
          lines.push((it.charge ? 'Charge ' + it.durationMin + ' min' : 'Stop ' + (20) + ' min') + ' at ' + fmtHMonly(it.atWall) + ', then set off toward ' + tpHeadDirOnly(it.newHeading));
        }
      });
      // Per-HOUR QMDJ panel: one row per 时辰 so the user can inspect every hour's
      // rotating chart, see the activated setting, the stop length, and whether the
      // hour is a CASH (road direction fortunate), a DETOUR (an adjacent direction is
      // fortunate), or a plain DRIVE (no fortunate direction). Additive.
      var PALACE_NAME = { 1: 'Kan', 2: 'Kun', 3: 'Zhen', 4: 'Xun', 5: 'Center', 6: 'Qian', 7: 'Dui', 8: 'Gen', 9: 'Li' };
      // Map each fortunate cash hour to the length of the stop placed at its end.
      var stopDurBySlot = {};
      try { plan.forEach(function (p) { if (p.type === 'stop' && p.slotIdx != null) stopDurBySlot[p.slotIdx] = p.charge ? p.durationMin : 20; }); } catch (e) {}
      // Concise description of the QMDJ "setting" being activated (door · San Qi/Wu · named formations · spirit).
      function settingOf(ev) {
        if (!ev) return '';
        var bits = [];
        if (ev.door) bits.push(tpDoorLabel(ev.door));
        if (ev.hasSanQi) bits.push('San Qi 三奇');
        if (ev.configs && ev.configs.length) bits.push(ev.configs.join(' · '));
        if (ev.deity) bits.push(ev.deity);
        if (ev.zhiFu) bits.push('Commander 值符');
        return bits.join(' · ');
      }
      var hours = [];
      try {
        (result.slots || []).forEach(function (s, si) {
          var roadDir = tpSnapDir((s.bearingDest != null) ? s.bearingDest : result.bearing);
          var rEntry = (s.dirs || []).filter(function (d) { return d.dir === roadDir; })[0] || null;
          var rev = (rEntry && rEntry.eval) ? rEntry.eval : null;
          var fortunate = !!(rev && rev.ok);
          var fav = (s.dirs || []).filter(function (d) { return d.eval && d.eval.ok; })
            .map(function (d) {
              return { dir: d.dir, palace: d.palace, palaceName: PALACE_NAME[d.palace] || '',
                       door: (d.eval.door ? tpDoorLabel(d.eval.door) : null), score: (d.eval.score || null), sanqi: !!d.eval.hasSanQi,
                       setting: settingOf(d.eval) };
            });
          // Classify the hour. DETOUR = the road dir is NOT fortunate, but one of its
          // 45° neighbours IS fortunate and stays within ±67.5° of the destination.
          var ri = TP_DIR_ORDER.indexOf(roadDir), rdeg = (s.bearingDest != null) ? s.bearingDest : result.bearing;
          var detour = null;
          if (!fortunate && ri >= 0) {
            var nbrs = [TP_DIR_ORDER[(ri + 7) % 8], TP_DIR_ORDER[(ri + 1) % 8]];
            fav.forEach(function (d) {
              if (nbrs.indexOf(d.dir) < 0) return;
              if (tpAngDiff(TP_DIR_DEG[d.dir], rdeg) > 67.5) return;
              if (!detour || (d.score || 0) > (detour.score || 0)) detour = d;
            });
          }
          var kind = fortunate ? 'cash' : (detour ? 'detour' : 'drive');
          hours.push({
            from: fmtHMonly(s.wallStart), to: fmtHMonly(s.wallEnd),
            ganzhi: s.gZhiPy || s.brPy || '',
            roadDir: roadDir, palace: TP_DIR_TO_PALACE[roadDir], palaceName: PALACE_NAME[TP_DIR_TO_PALACE[roadDir]] || '',
            fortunate: fortunate, kind: kind,
            setting: fortunate ? settingOf(rev) : (detour ? detour.setting : ''),
            door: fortunate ? (rev.door ? tpDoorLabel(rev.door) : null) : null,
            sanqi: fortunate ? !!rev.hasSanQi : false,
            deity: fortunate ? (rev.deity || null) : null,
            score: fortunate ? (rev.score || null) : null,
            configs: fortunate ? (rev.configs || []) : [],
            cash_min: fortunate ? (stopDurBySlot[si] || 20) : null,
            detour: detour ? { dir: detour.dir, palace: detour.palace, palaceName: detour.palaceName, door: detour.door, score: detour.score, setting: detour.setting } : null,
            favourable_dirs: fav,
            iso: s.iso, hGan: s.hGanHan, hZhi: s.hZhiHan, brPy: s.brPy,
            hourScore: (s.hourScore != null ? s.hourScore : null), xkPositive: !!s.hourPositive
          });
        });
      } catch (eH) { hours = []; }
      // One-line favourable summary — SAME counting as the coloured hour strips
      // (cash + detour both count as favourable), inserted right under the route
      // line and exposed as fav_summary, so the strips, the panel header and the
      // AI's wording all tell the same story (no more "2/7" vs 5 coloured rows).
      var favSummary = null;
      try {
        if (hours.length) {
          var _nC = hours.filter(function (x) { return x.kind === 'cash'; }).length;
          var _nD = hours.filter(function (x) { return x.kind === 'detour'; }).length;
          var _nN = hours.length - _nC - _nD;
          favSummary = 'Favourable hours: ' + (_nC + _nD) + '/' + hours.length + ' (' + _nC + ' cash + ' + _nD + ' detour)' +
            (_nN ? ' \u00b7 ' + _nN + ' without favourable window' : '');
          lines.splice(1, 0, favSummary);
        }
      } catch (eS) {}
      // ARRIVAL CASH line (domain rule): if the arrival falls inside a window whose
      // favourable directions include the overall origin→destination direction, say
      // so explicitly — it outranks a road cash stop and explains departure choices.
      var arrivalCashNote = null;
      try {
        var _lastS = result.slots && result.slots[result.slots.length - 1];
        if (_lastS && result.snapDir) {
          var _ad = (_lastS.dirs || []).filter(function (x) { return x.dir === result.snapDir; })[0];
          if (_ad && _ad.eval && _ad.eval.ok) {
            arrivalCashNote = '\u2605 ARRIVAL CASH: you reach the destination INSIDE a favourable window (direction ' + result.snapDir + ') \u2014 stronger than a road cash stop.';
            lines.splice(1, 0, arrivalCashNote);
          }
        }
      } catch (eA) {}
      window._tpLastResult = {
        stamp: Date.now(),
        origin: result.origin.name || null, dest: result.dest.name || null,
        bearing: Math.round(result.bearing), snapped: result.snapDir,
        real_route: !!result.usedRealRoute, km: rm.km ? Math.round(rm.km) : null, driving_time: drive,
        stops: nStops, legs: legs, has_hour_data: !!result.hasHourData,
        fav_summary: favSummary, arrival_cash_note: arrivalCashNote,
        exits: exits, hours: hours,
        soc: (result.evSoc0 != null ? result.evSoc0 : null),
        text: lines.join('\n')
      };
      // Compact payload for the live compass (net bearing + quadrant from the reference point during the drive).
      try {
        var favSlots = [];
        (result.slots || []).forEach(function (s) {
          var posd = (s.dirs || []).filter(function (d) { return d.eval && d.eval.ok; });
          if (!posd.length) return;
          var best = null, bd = 999;
          posd.forEach(function (d) { var diff = tpAngDiff(TP_DIR_DEG[d.dir], result.bearing); if (diff < bd) { bd = diff; best = d; } });
          if (!best || tpAngDiff(TP_DIR_DEG[best.dir], result.bearing) > 90) return;   // skip backward-only directions
          favSlots.push({ startMs: s.wallStart.getTime(), endMs: s.wallEnd.getTime(), dir: best.dir, deg: TP_DIR_DEG[best.dir], ganzhi: s.gZhiPy || s.brPy || '' });
        });
        window._tpLive = {
          stamp: Date.now(),
          originPos: { lat: result.origin.lat, lon: result.origin.lon }, originName: result.origin.name || 'Origin',
          destPos: { lat: result.dest.lat, lon: result.dest.lon }, destName: result.dest.name || 'Destination',
          overallBearing: Math.round(result.bearing), overallDir: result.snapDir,
          favSlots: favSlots,
          stops: (result.plan || []).filter(function (x) { return x.type === 'stop' && x.pos; })
            .map(function (st) { return { lat: st.pos.lat, lon: st.pos.lon, atMs: st.atWall ? st.atWall.getTime() : 0, charge: !!st.charge }; })
        };
      } catch (e) {}
      // If the AI opened this planner, push the finished itinerary into the chat (with an Open-in-Maps button).
      var fromAI = !!window._tpFromAI;
      if (fromAI) window._tpFromAI = false;
      if (fromAI && window.XKDGChat && typeof window.XKDGChat.addItinerary === 'function') {
        var payload = {}; for (var kk in window._tpLastResult) { if (window._tpLastResult.hasOwnProperty(kk)) payload[kk] = window._tpLastResult[kk]; }
        payload.charging_pending = true;   // a charger search runs right after; the line updates in place
        try { window.XKDGChat.addItinerary(payload); } catch (e) {}
        // Snap each numbered STOP to a REAL stoppable place — EV charger (if electric),
        // else service area / rest area / fuel / parking near the on-route point. This
        // updates the card AND the Maps waypoint coords (checks share it.pos by reference),
        // so a stop is never "in the middle of the road". Falls back to naming the locality.
        var hasRange = false;
        try { var rEl = document.getElementById('tp-range'); hasRange = !!(rEl && parseFloat(rEl.value) > 0); } catch (e) {}
        // OCM key + preferred networks (so EV cash stops can snap to a real high-power charger).
        var ocmKey = '';
        try {
          var ek = document.getElementById('tp-ocm-key-edit'), rk = document.getElementById('tp-ocm-key');
          ocmKey = (ek && ek.style.display !== 'none' && (ek.value || '').trim()) ? ek.value.trim() : ((rk && rk.value) || '').trim();
        } catch (e) {}
        var ocmNets = [];
        try { ocmNets = TP_NETWORKS.filter(function (n) { var c = document.getElementById('tp-net-' + n.id); return c && c.checked; }).map(function (n) { return n.id; }); } catch (e) {}
        // For an EV trip, the cashing stop should COINCIDE with a high-power charger
        // (you must recharge anyway): try a charger first, then a generic stopover.
        var ocmPrefOnly = !!(document.getElementById('tp-net-only') && document.getElementById('tp-net-only').checked);
        function findStop(la, lo) {
          if (hasRange) {
            // With "Preferred networks only" ON, NEVER substitute a non-preferred charger.
            // If no Tesla/Electra is here, fall back to a PLAIN stopover (no EV lookup) so
            // ATLANTE / Free To X / Ionity etc. can never sneak in via the OSM charger
            // search. Without the flag, the old behaviour stands (any charger, then stop).
            if (ocmPrefOnly) {
              return tpFindChargerStop(la, lo, ocmKey, ocmNets, true).then(function (c) { return c || tpFindStopover(la, lo, false); });
            }
            return tpFindChargerStop(la, lo, ocmKey, ocmNets, ocmPrefOnly).then(function (c) { return c || tpFindStopover(la, lo, true); });
          }
          return tpFindStopover(la, lo, false);
        }
        window._tpStopoverDebug = [];
        plan.forEach(function (it, i) {
          if (!(it.type === 'stop' && it.pos)) return;
          var leg = window._tpLastResult.legs[i];
          var dbg = { at: leg && leg.at, from: [Math.round(it.pos.lat * 1000) / 1000, Math.round(it.pos.lon * 1000) / 1000], snapped: null, kind: null };
          window._tpStopoverDebug.push(dbg);
          findStop(it.pos.lat, it.pos.lon).then(function (place) {
            if (place) {
              dbg.snapped = place.name; dbg.kind = place.kind;
              it.pos.lat = place.lat; it.pos.lon = place.lon;                 // snap Maps/checks (shared reference)
              if (leg) { leg.lat = place.lat; leg.lon = place.lon; leg.place = place.name; leg.stopKind = place.kind; if (place.power) leg.stopPower = place.power; if (place.operator) leg.operator = place.operator; }
              try { if (window.XKDGChat && window.XKDGChat.updateItineraryStops) window.XKDGChat.updateItineraryStops(); } catch (e) {}
              if (leg && place.kind === 'charger') {   // second opinion: nearby services (fills in async, like the address)
                tpFindAmenitiesNear(place.lat, place.lon).then(function (am) {
                  if (am) { leg.amenities = am; try { if (window.XKDGChat && window.XKDGChat.updateItineraryStops) window.XKDGChat.updateItineraryStops(); } catch (e) {} }
                }).catch(function () {});
              }
              if (leg && isFinite(place.lat) && isFinite(place.lon)) {   // human address for the card (independent Maps lookup)
                tpReverseGeocodeMany([{ lat: place.lat, lon: place.lon }]).then(function (nm) {
                  if (nm && nm[0]) { leg.addr = nm[0]; try { if (window.XKDGChat && window.XKDGChat.updateItineraryStops) window.XKDGChat.updateItineraryStops(); } catch (e) {} }
                }).catch(function () {});
              }
            } else if (leg && leg.lat != null) {
              dbg.kind = 'point(fallback)';
              // No stoppable place nearby → at least name the locality so it is not a bare point.
              tpReverseGeocodeMany([{ lat: leg.lat, lon: leg.lon }]).then(function (names) {
                leg.place = names[0] || null; leg.stopKind = 'point'; dbg.snapped = leg.place;
                try { if (window.XKDGChat && window.XKDGChat.updateItineraryStops) window.XKDGChat.updateItineraryStops(); } catch (e) {}
              }).catch(function () {});
            }
          });
        });
      }
      // Hands-free: switch to Google Maps by itself (no tap). Wait a moment so the auto-charger stop is in the link.
      if (fromAI && tpAutoMapsOn()) {
        // Wait until the auto charging search has finished (so the chargers are
        // already in the Maps URL) before navigating; cap the wait so we never hang.
        var _navT0 = Date.now();
        (function waitForChargers() {
          if (!window._tpChargerPending || (Date.now() - _navT0) > 10000) {
            setTimeout(function () { try { tpOpenInMaps(true); } catch (e) {} }, 600);
            return;
          }
          setTimeout(waitForChargers, 200);
        })();
      }
    } catch (e) {}
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

    // ---- Charging stops along the route (Phase F) ----
    tpRenderChargers(result, container);

    // ---- Google Maps export (Phase D) ----
    tpRenderMapsExport(result, container);

    // Make the computed itinerary available to the AI chat (text + structured).
    tpStoreLastResult(result);

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

  /* ---- Access gate: ask for the preview code before opening -------------- *
   * Note: this is a soft client-side lock to keep students out while the
   * feature is unfinished — not real security (the code lives in this file).
   * Asked once per page load; after a correct code the planner opens freely
   * until the page is reloaded.
   * ----------------------------------------------------------------------- */
  function tpRequestCode(onSuccess, title) {
    var existing = document.getElementById('tp-lock-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var ov = el('div', {
      id: 'tp-lock-overlay',
      style: 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.5);display:flex;' +
        'align-items:center;justify-content:center;padding:16px;'
    });
    var card = el('div', {
      style: 'background:#fff;border-radius:14px;max-width:340px;width:100%;padding:20px;' +
        'box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:inherit;'
    });
    card.appendChild(el('div', { style: 'font-size:17px;font-weight:700;color:#1565c0;margin-bottom:6px;' }, '\uD83D\uDD12 ' + (title || 'Travel Planner (preview)')));
    card.appendChild(el('div', { style: 'font-size:13px;color:#555;line-height:1.5;margin-bottom:14px;' },
      'This feature is still in development. Enter the access code to continue.'));

    var inp = el('input', {
      type: 'password', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Access code',
      style: 'width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccc;border-radius:8px;' +
        'font-size:16px;text-align:center;letter-spacing:3px;'
    });
    card.appendChild(inp);

    var err = el('div', { style: 'font-size:12px;color:#b00;margin:8px 2px 0;min-height:15px;' }, '');
    card.appendChild(err);

    var btnRow = el('div', { style: 'display:flex;gap:8px;margin-top:14px;' });
    var cancel = el('button', { style: 'flex:1;padding:10px;border:1px solid #bbb;border-radius:8px;background:#fff;color:#555;font-size:14px;cursor:pointer;' }, 'Cancel');
    var unlock = el('button', { style: 'flex:1;padding:10px;border:0;border-radius:8px;background:#1565c0;color:#fff;font-size:14px;font-weight:600;cursor:pointer;' }, 'Unlock');
    btnRow.appendChild(cancel); btnRow.appendChild(unlock);
    card.appendChild(btnRow);
    ov.appendChild(card);

    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    function submit() {
      if ((inp.value || '').trim() === TP_LOCK_CODE) {
        tpUnlocked = true;
        try { localStorage.setItem('xkdg_tp_unlocked', '1'); } catch (e) {}
        close();
        try { onSuccess(); } catch (e) {}
      } else {
        err.textContent = 'Wrong code. Try again.';
        inp.value = '';
        inp.focus();
      }
    }
    cancel.addEventListener('click', close);
    unlock.addEventListener('click', submit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    // close on backdrop tap (but not when tapping the card)
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });

    document.body.appendChild(ov);
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 50);
  }

  // ---- Shared preview-code gate ------------------------------------------
  // One code (TP_LOCK_CODE) protects the whole in-development "Directions" area:
  // Travel Planner + the future Divinations and Birth-charts sections. Unlocking
  // any one of them unlocks the others for the session/device (xkdg_tp_unlocked).
  // Usage from anywhere:
  //   window.xkdgRequireCode(function(){ /* open the section */ }, 'Divinations (preview)');
  function xkdgRequireCode(onSuccess, title) {
    if (!TP_LOCK_ENABLED || tpUnlocked) { try { if (onSuccess) onSuccess(); } catch (e) {} return; }
    tpRequestCode(function () { try { if (onSuccess) onSuccess(); } catch (e) {} }, title);
  }
  try { window.xkdgRequireCode = xkdgRequireCode; } catch (e) {}

  // ---- Directions hub -----------------------------------------------------
  // Single entry point for the "Directions" area. Lists its sections:
  //   ✈️ Air travel    — FREE (no code) — opens the flight Direction Calculator
  //   🚗 Travel Planner — under code     — opens the road-trip planner (tpOpen)
  //   🔮 Divinations / 🎴 Birth charts — coming soon (placeholders, built later)
  function xkdgOpenDirections() {
    var existing = document.getElementById('xkdg-dir-overlay');
    if (existing) { existing.style.display = 'flex'; return; }

    var ov = el('div', {
      id: 'xkdg-dir-overlay',
      style: 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:flex;' +
        'align-items:center;justify-content:center;padding:16px;'
    });
    var card = el('div', {
      style: 'background:#fff;border-radius:14px;max-width:360px;width:100%;padding:18px;' +
        'box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:system-ui,Arial,sans-serif;'
    });

    var head = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;' });
    head.appendChild(el('div', { style: 'font-size:17px;font-weight:700;color:#1565c0;' }, '\uD83E\uDDED Directions'));
    var xBtn = el('span', { style: 'cursor:pointer;font-size:22px;color:#888;line-height:1;' }, '\u2715');
    head.appendChild(xBtn);
    card.appendChild(head);

    // PURPOSE selector (Edu, session 23: "inserisci il PURPOSES qui dentro" — this
    // hub, not one level down inside Air travel's own popup). Same element, same
    // sync pattern as the one added to fsOpenDirectionCalc(): reads/writes the
    // page's #purpose-select directly (single source of truth), bypassing
    // onPurposeChange()'s birth-data reset check, which is for the DATE-scan use
    // case and irrelevant here (a direction's door doesn't need a person's data).
    var purWrap = el('div', { style: 'background:#f3e5f5;border-radius:8px;padding:10px;margin-bottom:12px;' });
    purWrap.appendChild(el('div', { style: 'font-size:11px;font-weight:700;color:#6a1b9a;margin-bottom:5px;' }, '\ud83c\udfaf PURPOSE (applies to all sections below)'));
    var purSel = el('select', { id: 'xkdg-dir-purpose-select', style: 'width:100%;padding:6px 8px;border-radius:4px;border:1px solid #6a1b9a;font-size:12px;font-weight:bold;color:#6a1b9a;' });
    [['', '\u2014 Any \u2014'], ['health', '\ud83c\udfe5 Health'], ['career', '\ud83d\udcbc Career'], ['wealth', '\ud83d\udcb0 Wealth'],
     ['relationship', '\u2764\ufe0f Relationship'], ['journey', '\u2708\ufe0f Journey'], ['speak', '\ud83c\udfa4 Speak'], ['legal', '\u2696\ufe0f Legal']]
      .forEach(function (opt) { purSel.appendChild(el('option', { value: opt[0] }, opt[1])); });
    try { var _mainPur = document.getElementById('purpose-select'); if (_mainPur) purSel.value = _mainPur.value || ''; } catch (e) {}
    purSel.addEventListener('change', function () {
      try { var _mp = document.getElementById('purpose-select'); if (_mp) _mp.value = purSel.value; } catch (e) {}
    });
    purWrap.appendChild(purSel);

    // SCAN button (Edu, session 23: "il pulsante Scan dove sta? Dovrebbe darmi
    // tutte le carte/direzioni buone per Wealth"). No origin/destination needed —
    // this scans ALL 8 compass directions for the chosen Purpose, using the SAME
    // engine (scanTravelPurpose, rotating chart) already built and verified for
    // find_purpose_direction — just called directly here, results shown inline,
    // no AI round-trip.
    var scanBtn = el('button', { type: 'button', style: 'width:100%;margin-top:8px;background:#6a1b9a;color:#fff;border:0;border-radius:7px;padding:9px;font-size:13px;font-weight:700;cursor:pointer;' }, '\ud83d\udd0e Scan next 7 days');
    var scanBox = el('div', { style: 'margin-top:8px;max-height:220px;overflow-y:auto;' });
    scanBtn.addEventListener('click', function () {
      scanBtn.textContent = '\u2026';
      setTimeout(function () {
        try {
          if (!(window.QMDJWaterScanner && typeof window.QMDJWaterScanner.scanTravelPurpose === 'function')) {
            scanBox.innerHTML = '<div style="font-size:12px;color:#b00;">Scanner not loaded on this page.</div>';
            return;
          }
          var purposeVal = purSel.value || null;
          var today = tpLocalISO(new Date());
          var rows = window.QMDJWaterScanner.scanTravelPurpose('', today, 7, purposeVal) || [];
          if (!rows.length) {
            scanBox.innerHTML = '<div style="font-size:12px;color:#888;padding:6px 0;">No favourable window found for ' +
              (purposeVal ? purposeVal : 'any purpose') + ' in the next 7 days.</div>';
            return;
          }
          var html = '';
          rows.slice(0, 25).forEach(function (r) {
            html += '<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 4px;border-bottom:1px solid #f0f0f0;font-size:12px;">' +
              '<span>' + r.date + ' \u00b7 ' + r.weekday + ' \u00b7 ' + r.hourHan + '</span>' +
              '<span style="font-weight:700;color:#6a1b9a;">' + r.dir + '</span>' +
              '</div>';
          });
          scanBox.innerHTML = html;
        } catch (eScan) {
          scanBox.innerHTML = '<div style="font-size:12px;color:#b00;">Scan failed: ' + (eScan && eScan.message || eScan) + '</div>';
        } finally {
          scanBtn.textContent = '\ud83d\udd0e Scan next 7 days';
        }
      }, 10);
    });
    purWrap.appendChild(scanBtn);
    purWrap.appendChild(scanBox);
    card.appendChild(purWrap);

    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }

    // A section button. `gated` true -> opens behind the shared code.
    function sectionBtn(emoji, label, sub, color, onOpen, gated, soon) {
      var b = el('button', {
        type: 'button',
        style: 'width:100%;text-align:left;display:flex;align-items:center;gap:10px;margin-bottom:8px;' +
          'padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;background:' + (soon ? '#f5f5f5' : '#fff') + ';' +
          'cursor:' + (soon ? 'default' : 'pointer') + ';' + (soon ? 'opacity:.6;' : '')
      });
      b.appendChild(el('span', { style: 'font-size:20px;' }, emoji));
      var txt = el('div', { style: 'flex:1;min-width:0;' });
      txt.appendChild(el('div', { style: 'font-weight:700;font-size:14px;color:' + color + ';' },
        label + (gated ? '  \uD83D\uDD12' : '')));
      if (sub) txt.appendChild(el('div', { style: 'font-size:11px;color:#777;' }, sub));
      b.appendChild(txt);
      if (!soon) {
        b.addEventListener('click', function () {
          close();
          if (gated) xkdgRequireCode(onOpen, label + ' (preview)');
          else { try { onOpen(); } catch (e) {} }
        });
      }
      card.appendChild(b);
    }

    // ✈️ Air travel — FREE
    sectionBtn('\u2708\uFE0F', 'Air travel', 'Flight direction & best dates', '#1565c0', function () {
      if (typeof window.fsOpenDirectionCalc === 'function') window.fsOpenDirectionCalc(xkdgOpenDirections);
      else if (typeof fsOpenDirectionCalc === 'function') fsOpenDirectionCalc(xkdgOpenDirections);
      else alert('The Direction Calculator is not available on this page.');
    }, false, false);

    // 🚗 Travel Planner — under code (gated via the shared preview code)
    sectionBtn('\uD83D\uDE97', 'Travel Planner', 'Road-trip direction planner', '#1b8a3f', function () {
      tpOpenReal(xkdgOpenDirections);
    }, true, false);

    // 🍀 Lucky Trip — under code (same 9861 gate) — theme/area lucky itineraries
    sectionBtn('\uD83C\uDF40', 'Lucky Trip', 'Lucky itineraries by area or theme', '#2e7d32', function () {
      tpOpenLuckyTrip(xkdgOpenDirections);
    }, true, false);

    // 🔮 Divinations — gated (QMDJ rotating chart + strategy notes)
    sectionBtn('\uD83D\uDD2E', 'Divinations', 'QMDJ chart + strategy', '#6a1b9a', function () {
      if (window.DirectionsCharts && window.DirectionsCharts.openDivinations) window.DirectionsCharts.openDivinations(xkdgOpenDirections);
      else alert('Divinations module not available on this page.');
    }, true, false);
    // 🎴 Birth charts — gated (QMDJ rotating chart from a birth date)
    sectionBtn('\uD83C\uDCCF', 'Birth charts', 'QMDJ chart from a birth date', '#6a1b9a', function () {
      if (window.DirectionsCharts && window.DirectionsCharts.openBirthCharts) window.DirectionsCharts.openBirthCharts(xkdgOpenDirections);
      else alert('Birth charts module not available on this page.');
    }, true, false);

    xBtn.addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.appendChild(card);
    document.body.appendChild(ov);
  }
  try { window.xkdgOpenDirections = xkdgOpenDirections; } catch (e) {}

  // ---- Lucky Trip panel ---------------------------------------------------
  // A structured front-end that DRIVES the existing AI (XKDGChat.ask): the user
  // picks an area/theme + category families, and we compose a request the AI
  // engine already knows how to answer (real POIs + lucky direction & hour).
  // Two modes:  A — explore what an area offers in the chosen categories;
  //             B — compose an n-day itinerary around a theme.
  // Additive & isolated; opened only behind the shared 9861 gate.
  function tpOpenLuckyTrip(back) {
    var existing = document.getElementById('xkdg-lucky-overlay');
    if (existing) { existing.style.display = 'flex'; return; }

    var ov = el('div', { id: 'xkdg-lucky-overlay',
      style: 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.45);display:flex;' +
        'align-items:center;justify-content:center;padding:16px;' });
    var card = el('div', { style: 'background:#fff;border-radius:14px;max-width:380px;width:100%;' +
      'max-height:90vh;overflow:auto;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);' +
      'font-family:system-ui,Arial,sans-serif;' });

    var head = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;' });
    head.appendChild(el('div', { style: 'font-size:17px;font-weight:700;color:#2e7d32;' }, '\uD83C\uDF40 Lucky Trip'));
    var xBtn = el('span', { style: 'cursor:pointer;font-size:22px;color:#888;line-height:1;' }, '\u2715');
    head.appendChild(xBtn);
    card.appendChild(head);

    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    xBtn.addEventListener('click', function () { close(); if (typeof back === 'function') back(); });

    // mode tabs
    var mode = 'A';
    var tabRow = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;' });
    function mkTab(id, label) {
      var t = el('button', { type: 'button',
        style: 'flex:1 1 45%;padding:8px 6px;border-radius:8px;border:1px solid #cfcfcf;cursor:pointer;font-size:12px;font-weight:700;' }, label);
      t.addEventListener('click', function () { mode = id; paint(); });
      return t;
    }
    var tabA = mkTab('A', 'Explore an area');
    var tabB = mkTab('B', 'Themed trip');
    var tabC = mkTab('C', 'City tour');
    var tabD = mkTab('D', '\uD83C\uDF9F Events');
    tabRow.appendChild(tabA); tabRow.appendChild(tabB); tabRow.appendChild(tabC); tabRow.appendChild(tabD);
    card.appendChild(tabRow);

    var explain = el('div', { style: 'font-size:11px;color:#666;margin-bottom:10px;line-height:1.4;' });
    card.appendChild(explain);

    // area / origin
    var areaWrap = el('div', { style: 'margin-bottom:10px;' });
    var areaLab = el('div', { style: 'font-size:11px;color:#555;margin-bottom:3px;font-weight:600;' }, 'Area');
    var areaRow = el('div', { style: 'display:flex;gap:6px;align-items:center;' });
    var areaInp = el('input', { type: 'text', placeholder: '',
      style: 'flex:1;min-width:0;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;box-sizing:border-box;' });
    var areaGps = el('button', { type: 'button', title: 'Use my exact GPS position as the start point',
      style: 'padding:9px 11px;border:1px solid #1565c0;border-radius:8px;background:#fff;color:#1565c0;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;' }, '\uD83D\uDCCD GPS');
    var areaGpsStatus = el('div', { style: 'font-size:11px;color:#888;margin-top:3px;min-height:13px;' }, '');
    areaGps.addEventListener('click', function () {
      if (!navigator.geolocation) { areaGpsStatus.style.color = '#b00'; areaGpsStatus.textContent = 'GPS not available on this device/browser.'; return; }
      areaGpsStatus.style.color = '#888'; areaGpsStatus.textContent = 'Getting GPS position\u2026';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var la = pos.coords.latitude, lo = pos.coords.longitude;
        areaInp.value = la.toFixed(5) + ', ' + lo.toFixed(5);
        try { window._lastGpsLat = la; window._lastGpsLng = lo; localStorage.setItem('xkdg_gps', JSON.stringify({ lat: la, lng: lo })); } catch (e) {}
        areaGpsStatus.style.color = '#1b8a3f';
        areaGpsStatus.textContent = '\u2713 Exact GPS set as start \u00b7 ' + la.toFixed(4) + ', ' + lo.toFixed(4);
      }, function (err) {
        areaGpsStatus.style.color = '#b00'; areaGpsStatus.textContent = 'GPS error: ' + err.message;
      }, { enableHighAccuracy: true, timeout: 10000 });
    });
    areaRow.appendChild(areaInp); areaRow.appendChild(areaGps);
    areaWrap.appendChild(areaLab); areaWrap.appendChild(areaRow); areaWrap.appendChild(areaGpsStatus); card.appendChild(areaWrap);

    // Themed trip only: a SECOND field = the AREA/region to stay within, so the
    // base (e.g. Siena) and the area to explore (e.g. Tuscany) are DISTINCT. This
    // fences the search to the region and stops it wandering into a neighbour.
    var areaConstraintWrap = el('div', { style: 'margin-bottom:10px;display:none;' });
    var areaConstraintLab = el('div', { style: 'font-size:11px;color:#555;margin-bottom:3px;font-weight:600;' }, 'Area to explore (stay within)');
    var areaConstraintInp = el('input', { type: 'text', placeholder: 'e.g. Tuscany - optional, keeps stops inside it',
      style: 'width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;box-sizing:border-box;' });
    areaConstraintWrap.appendChild(areaConstraintLab); areaConstraintWrap.appendChild(areaConstraintInp); card.appendChild(areaConstraintWrap);

    // date + days
    var dateRow = el('div', { style: 'display:flex;gap:8px;margin-bottom:10px;' });
    var dateW = el('div', { style: 'flex:1;' });
    dateW.appendChild(el('div', { style: 'font-size:11px;color:#555;margin-bottom:3px;font-weight:600;' }, 'Date'));
    var dateInp = el('input', { type: 'date', value: tpLocalISO(new Date()),
      style: 'width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;box-sizing:border-box;' });
    dateW.appendChild(dateInp); dateRow.appendChild(dateW);
    var daysW = el('div', { style: 'width:84px;' });
    daysW.appendChild(el('div', { style: 'font-size:11px;color:#555;margin-bottom:3px;font-weight:600;' }, 'Days'));
    var daysInp = el('input', { type: 'number', min: '1', max: '14', value: '1',
      style: 'width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;box-sizing:border-box;' });
    daysW.appendChild(daysInp); dateRow.appendChild(daysW);
    card.appendChild(dateRow);

    // minimum distance from base — selectable (replaces the old hardcoded 15 km).
    // Defaults: 0 for City tour (in-city), 15 km otherwise; user can override.
    var minTouched = false;
    var minWrap = el('div', { style: 'margin-bottom:10px;' });
    minWrap.appendChild(el('div', { style: 'font-size:11px;color:#555;margin-bottom:3px;font-weight:600;' }, 'Minimum distance from base'));
    var minSel = el('select', { style: 'width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;box-sizing:border-box;background:#fff;' });
    [['0', 'No minimum (in-city)'], ['1', '1 km'], ['5', '5 km'], ['15', '15 km (excursion)'], ['30', '30 km']].forEach(function (o) {
      minSel.appendChild(el('option', { value: o[0] }, o[1]));
    });
    minSel.value = '15';
    minSel.addEventListener('change', function () { minTouched = true; });
    minWrap.appendChild(minSel); card.appendChild(minWrap);

    // category families (multi-select)
    card.appendChild(el('div', { style: 'font-size:11px;color:#555;margin:6px 0 5px;font-weight:600;' }, 'Categories (pick one or more)'));
    var FAMILIES = [
      ['\uD83C\uDF3F', 'Sacred nature / off the crowd', 'sacred nature off the crowd'],
      ['\uD83D\uDD2E', 'Mysterious / energetic', 'mysterious symbolic energetic places'],
      ['\uD83D\uDED5', 'Spiritual / sacred', 'spiritual places hermitages abbeys sanctuaries'],
      ['\uD83C\uDF38', 'Healing / wellbeing', 'thermal baths wellness natural healing'],
      ['\uD83C\uDFDB', 'Deep culture', 'deep culture medieval villages ruins'],
      ['\uD83C\uDF77', 'Land & tradition', 'organic wineries farms local products'],
      ['\uD83C\uDFD6', 'Secluded / exclusive beauty', 'secluded beaches alpine lakes hiking exclusive places'],
      ['\uD83C\uDFAD', 'Events / festivals', 'events festivals'],
      ['\uD83D\uDDFA', 'Popular classics', 'castles museums villages main attractions']
    ];
    var picked = {};
    var grid = el('div', { style: 'display:flex;flex-direction:column;gap:5px;margin-bottom:12px;' });
    FAMILIES.forEach(function (f, i) {
      var row = el('label', { style: 'display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;cursor:pointer;font-size:12px;' });
      var cb = el('input', { type: 'checkbox' });
      cb.addEventListener('change', function () { picked[i] = cb.checked; });
      row.appendChild(cb);
      row.appendChild(el('span', { style: 'font-size:16px;' }, f[0]));
      row.appendChild(el('span', null, f[1]));
      grid.appendChild(row);
    });
    card.appendChild(grid);

    // Global modifier (opt-in): stay OFF THE BEATEN PATH. When checked, the intent is
    // added to the prompt so the AI sets avoid_crowds on the planner tools, which then
    // de-emphasise very popular / crowded places (many reviews) via tpCrowdMult —
    // WITHOUT ever overriding the favourable direction. Needs Places review counts.
    var otbWrap = el('label', { style: 'display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid #a5d6a7;border-radius:8px;cursor:pointer;font-size:12px;background:#f1f8f1;margin-bottom:12px;' });
    var otbCb = el('input', { type: 'checkbox', id: 'tp-otb' });
    otbWrap.appendChild(otbCb);
    otbWrap.appendChild(el('span', { style: 'font-size:16px;' }, '\uD83C\uDF3F'));
    otbWrap.appendChild(el('span', null, 'Off the beaten path (avoid crowded, touristy places)'));
    card.appendChild(otbWrap);

    var go = el('button', { type: 'button',
      style: 'width:100%;padding:12px;border:none;border-radius:10px;background:#2e7d32;color:#fff;font-size:14px;font-weight:700;cursor:pointer;' },
      '\uD83C\uDF40 Find lucky trips');
    card.appendChild(go);
    card.appendChild(el('div', { style: 'font-size:10.5px;color:#888;margin-top:8px;text-align:center;' },
      'Proposals appear in the AI chat.'));
    var rfTest = el('div', { style: 'font-size:10.5px;color:#9c27b0;margin-top:6px;text-align:center;cursor:pointer;text-decoration:underline;' }, '\uD83E\uDDED Resonance test (dev)');
    rfTest.addEventListener('click', function () {
      if (window.ResonanceFinder && typeof window.ResonanceFinder.openTestPanel === 'function') window.ResonanceFinder.openTestPanel();
      else alert('Resonance Finder not loaded on this page.');
    });
    card.appendChild(rfTest);

    go.addEventListener('click', function () {
      var area = (areaInp.value || '').trim();
      if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(area)) area += ' (exact GPS coordinates - use these directly as the origin, do not geocode)';
      var date = dateInp.value || tpLocalISO(new Date());
      var minKm = minSel.value || '15';
      var cats = FAMILIES.filter(function (f, i) { return picked[i]; }).map(function (f) { return f[2]; });
      var catTxt = cats.join('; ');
      var prompt;
      if (mode === 'D') {
        var evCat = cats.length ? catTxt : 'any kind';
        prompt = 'Lucky Trip \\u2014 EVENTS. Base: ' + (area || '(use my current location)') +
          '. From ' + date + ' for the next 30 days, within about 80 km. Kind of event: ' + evCat + '. ' +
          'Use the lucky-events planner (plan_lucky_events): find REAL dated events and keep only the ones whose ' +
          'direction from the base is favourable ON THE EVENT\\u2019S OWN DATE. For each kept event tell me the ' +
          'double-hour to set off, the door, the score and the ticket link; and list separately events found but NOT ' +
          'auspicious to reach on their day.';
      } else if (mode === 'C') {
        var cTheme = cats.length ? catTxt : 'famous attractions';
        prompt = 'Lucky Trip \u2014 CITY TOUR (inside the city). City/base: ' + (area || '(use my current location)') +
          '. Date: ' + date + '. Categories: ' + cTheme + '. Minimum distance from base: ' + minKm + ' km. ' +
          'Compose a ONE-DAY tour of famous places INSIDE the city using the city-tour planner: each place visited in the ' +
          'double-hour when its direction from the base is favourable. Show the place names, their direction and the hour.';
      } else if (mode === 'B') {
        if (!cats.length) { alert('Pick at least one category.'); return; }
        var days = parseInt(daysInp.value, 10) || 1;
        var areaConstraint = (areaConstraintInp.value || '').trim();
        prompt = 'Lucky Trip \u2014 themed itinerary. Origin: ' + (area || '(use my current location)') +
          '. Start date: ' + date + '. Days: ' + days + '. Theme/categories: ' + catTxt + '. Minimum distance from base: ' + minKm + ' km. ' +
          (areaConstraint ? ('Area to stay within: ' + areaConstraint + '. Keep EVERY place strictly inside this area (do NOT wander into neighbouring regions). ') : '') +
          'Compose a ' + days + '-day itinerary where EVERY stop has a propitious direction and hour, choosing real named places that fit the theme. Show the place names.';
      } else {
        if (!cats.length) { alert('Pick at least one category.'); return; }
        prompt = 'Lucky Trip \u2014 explore an area. Area/origin: ' + (area || '(use my current location)') +
          '. Date: ' + date + '. Categories: ' + catTxt + '. Minimum distance from base: ' + minKm + ' km. ' +
          'Propose several REAL, named places in these categories around that area, each reachable with a propitious direction and hour, so I can choose among them. Show the place names.';
      }
      if (otbCb.checked) {
        prompt += ' IMPORTANT: I want to stay OFF THE BEATEN PATH \u2014 set avoid_crowds true and de-emphasise very popular / crowded / touristy places (those with many reviews), preferring quiet, secluded, non-touristy spots, WITHOUT ever overriding the favourable direction.';
      }
      if (window.XKDGChat && typeof window.XKDGChat.ask === 'function') {
        close();
        window.XKDGChat.ask(prompt);
      } else if (window.XKDGChat && typeof window.XKDGChat.open === 'function') {
        window.XKDGChat.open();
        alert('Copy this into the AI chat:\n\n' + prompt);
      } else {
        alert(prompt);
      }
    });

    function paint() {
      function setTab(t, on) { t.style.background = on ? '#2e7d32' : '#f5f5f5'; t.style.color = on ? '#fff' : '#333'; }
      setTab(tabA, mode === 'A'); setTab(tabB, mode === 'B'); setTab(tabC, mode === 'C'); setTab(tabD, mode === 'D');
      daysW.style.display = (mode === 'B') ? 'block' : 'none';
      minWrap.style.display = (mode === 'D') ? 'none' : 'block';
      areaConstraintWrap.style.display = (mode === 'B') ? 'block' : 'none';   // base vs area are separate only for Themed trip
      if (!minTouched) minSel.value = (mode === 'C') ? '0' : '15';   // sensible default per mode
      areaLab.textContent = (mode === 'A') ? 'Area to explore' : (mode === 'C') ? 'City or start address' : (mode === 'D') ? 'Base' : (mode === 'B') ? 'Base town (where you sleep)' : 'Starting point';
      areaInp.placeholder = (mode === 'A') ? 'e.g. Rome, or: north of Vienna'
        : (mode === 'C') ? 'e.g. Rome, or a hotel / street address'
        : (mode === 'D') ? 'e.g. Vienna (your base)'
        : (mode === 'B') ? 'e.g. Siena (your base town)'
        : 'e.g. Vienna (where you start)';
      explain.textContent = (mode === 'A')
        ? 'Given a place, the AI proposes what it offers in the chosen categories \u2014 you pick among the proposals.'
        : (mode === 'C')
          ? 'A one-day tour of famous places INSIDE a city, each visited when its direction from the base is favourable.'
          : (mode === 'D')
            ? 'Real dated events near the base: keeps the ones whose direction is favourable on the event date, with the hour to set off. (The date below is the window start.)'
            : 'Given a theme, the AI composes a multi-day itinerary, finding suitable places.';
    }
    paint();

    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.appendChild(card);
    document.body.appendChild(ov);
  }
  try { window.tpOpenLuckyTrip = tpOpenLuckyTrip; } catch (e) {}

  // Gate every entry point: ask for the code (once per session), then open.
  function tpOpen() {
    if (!TP_LOCK_ENABLED || tpUnlocked) { tpOpenReal(); return; }
    tpRequestCode(tpOpenReal);
  }

  function tpMakePanelMovable(panel) {
    var hdr = panel.querySelector('#tp-header');
    var minBtn = panel.querySelector('#tp-min');
    if (!hdr) return;
    var ox = 0, oy = 0, sx = 0, sy = 0, dragging = false;
    function pt(e) { return (e.touches && e.touches[0]) || e; }
    function onMove(e) {
      if (!dragging) return;
      var p = pt(e);
      panel.style.transform = 'translate(' + (ox + (p.clientX - sx)) + 'px,' + (oy + (p.clientY - sy)) + 'px)';
      if (e.cancelable) e.preventDefault();
    }
    function onUp(e) {
      if (!dragging) return;
      var p = pt(e);
      ox += (p.clientX - sx); oy += (p.clientY - sy);
      dragging = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }
    hdr.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('#tp-min,#tp-close,#tp-guide')) return; // keep the buttons clickable
      dragging = true;
      var p = pt(e); sx = p.clientX; sy = p.clientY;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      if (e.cancelable) e.preventDefault();
    });
    if (minBtn) {
      var minimized = false;
      minBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        minimized = !minimized;
        for (var i = 1; i < panel.children.length; i++) panel.children[i].style.display = minimized ? 'none' : '';
        minBtn.textContent = minimized ? '+' : '–';
        panel.style.width = minimized ? 'auto' : '';
        panel.style.maxHeight = minimized ? 'none' : '92vh';
      });
    }
  }
  var tpReturnFn = null;
  function tpOpenReal(onClose) {
    var existing = document.getElementById('tp-overlay');
    if (existing) { existing.style.display = 'flex'; tpReturnFn = (typeof onClose === 'function' ? onClose : null); return; }
    tpReturnFn = (typeof onClose === 'function' ? onClose : null);

    var ov = el('div', {
      id: 'tp-overlay',
      style: 'position:fixed;inset:0;z-index:99990;background:transparent;display:flex;' +
        'align-items:flex-start;justify-content:center;overflow:visible;padding:16px;pointer-events:none;'
    });
    var panel = el('div', {
      style: 'background:#fff;border-radius:12px;max-width:680px;width:100%;padding:16px 18px;' +
        'box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:system-ui,Arial,sans-serif;' +
        'pointer-events:auto;max-height:92vh;overflow:auto;will-change:transform;'
    });

    var header = el('div', { id: 'tp-header',
      style: 'display:flex;justify-content:space-between;align-items:center;cursor:move;touch-action:none;' +
        'user-select:none;position:sticky;top:0;background:#fff;padding:2px 0 6px;z-index:1;' });
    header.innerHTML = '<h3 style="margin:0;font-size:17px;">🚗 Travel Direction Planner</h3>' +
      '<span style="display:flex;align-items:center;gap:14px;">' +
      '<span id="tp-guide" style="cursor:pointer;font-size:13px;color:#1565c0;font-weight:600;">❔ Guide</span>' +
      '<span id="tp-min" title="Minimize / expand (drag the bar to move)" style="cursor:pointer;font-size:22px;color:#888;line-height:1;">–</span>' +
      '<span id="tp-close" style="cursor:pointer;font-size:22px;color:#888;line-height:1;">✕</span></span>';
    panel.appendChild(header);

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
    form.appendChild(tpBuildItineraryBar());
    var _tpToday = (function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    form.appendChild(field('Departure (date)', 'tp-date', _tpToday, 'date'));
    form.appendChild(field('Departure (time)', 'tp-time', '12:00', 'time'));
    form.appendChild(field('Trip duration (hours)', 'tp-dur', '12', 'number'));
    form.appendChild(field('Max drive hours per leg', 'tp-maxleg', '2.5', 'number'));
    form.appendChild(field('UTC offset (base)', 'tp-utc', String(nowUtc), 'number'));

    // ---- Location pickers: city dropdown + GPS (same system as Main) -------
    // A shared <datalist> of CITY_LIST names. Picking a city sets longitude+UTC
    // from the curated data and geocodes the name to fill latitude (which the
    // city data doesn't carry). GPS sets lat+lon directly. The manual lon/lat
    // number inputs are kept (the scanner reads tp-olon/olat/dlon/dlat).
    var tpCityData = {};
    var tpCityOptionsHtml = '';
    try {
      if (window.CITY_LIST && Array.isArray(window.CITY_LIST)) {
        window.CITY_LIST.forEach(function (group) {
          (group.cities || []).forEach(function (c) {
            tpCityData[c.name] = { lng: c.lng, utc: c.utc };
            tpCityOptionsHtml += '<option value="' + c.name + '"></option>';
          });
        });
      }
    } catch (e) {}
    var dataListHolder = el('div', { style: 'grid-column:1 / span 2;height:0;overflow:hidden;' });
    dataListHolder.innerHTML = '<datalist id="tp-city-list">' + tpCityOptionsHtml + '</datalist>';
    form.appendChild(dataListHolder);

    function tpBuildLocationPicker(kind) {
      var isOrigin = (kind === 'origin');
      var lonId = isOrigin ? 'tp-olon' : 'tp-dlon';
      var latId = isOrigin ? 'tp-olat' : 'tp-dlat';
      var cityId = isOrigin ? 'tp-ocity' : 'tp-dcity';
      var defLon = isOrigin ? TP_DEFAULT.origin.lon : TP_DEFAULT.dest.lon;
      var defLat = isOrigin ? TP_DEFAULT.origin.lat : TP_DEFAULT.dest.lat;
      var defName = isOrigin ? TP_DEFAULT.origin.name : TP_DEFAULT.dest.name;

      var block = el('div', { style: 'grid-column:1 / span 2;border:1px solid #e0e0e0;border-radius:8px;padding:8px 10px;background:#fafafa;' });
      block.appendChild(el('div', { style: 'font-weight:600;color:#333;margin-bottom:5px;' }, '📍 ' + (isOrigin ? 'Origin' : 'Destination')));

      var row = el('div', { style: 'display:flex;gap:6px;align-items:center;' });
      var cityInp = el('input', { id: cityId, list: 'tp-city-list', autocomplete: 'off',
        placeholder: 'Type any place… (default ' + defName + ')',
        style: 'flex:1;min-width:0;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
      var findBtn = el('button', { type: 'button', title: 'Find this place (any town/village)',
        style: 'padding:6px 10px;border:1px solid #1565c0;border-radius:6px;background:#fff;color:#1565c0;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;' }, '🔍 Find');
      var gpsBtn = el('button', { type: 'button',
        style: 'padding:6px 10px;border:1px solid #1565c0;border-radius:6px;background:#fff;color:#1565c0;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;' }, '📍 GPS');
      var recBtn = el('button', { type: 'button', title: 'Recent places',
        style: 'padding:6px 9px;border:1px solid #888;border-radius:6px;background:#fff;font-size:13px;cursor:pointer;white-space:nowrap;' }, '🕘');
      row.appendChild(cityInp); row.appendChild(findBtn); row.appendChild(gpsBtn); row.appendChild(recBtn);
      block.appendChild(row);

      // Recents dropdown (populated when opened)
      var recPanel = el('div', { style: 'display:none;border:1px solid #ccc;border-radius:6px;margin-top:4px;max-height:170px;overflow:auto;background:#fff;' });
      block.appendChild(recPanel);

      var status = el('div', { style: 'font-size:11px;color:#888;margin:4px 0 6px;min-height:14px;' }, '');
      block.appendChild(status);

      var manual = el('div', { style: 'display:flex;gap:8px;' });
      function num(lbl, id, val) {
        var w = el('label', { style: 'flex:1;display:flex;flex-direction:column;gap:2px;color:#777;font-size:11px;' }, lbl);
        w.appendChild(el('input', { id: id, type: 'number', step: 'any', value: String(val),
          style: 'padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;' }));
        return w;
      }
      manual.appendChild(num('lon (manual)', lonId, defLon));
      manual.appendChild(num('lat (manual)', latId, defLat));
      block.appendChild(manual);

      // Fill the fields from a place we already have coordinates for (recent or
      // a station), without geocoding.
      function fillPlace(p, label) {
        document.getElementById(latId).value = Number(p.lat).toFixed(6);
        document.getElementById(lonId).value = Number(p.lon).toFixed(6);
        if (isOrigin) { var u = document.getElementById('tp-utc'); if (u) u.value = (p.utc != null ? p.utc : Math.round(p.lon / 15)); }
        cityInp.value = p.name;
        status.style.color = '#1b8a3f';
        status.textContent = '✓ ' + (label || p.name);
      }

      function populateRecents() {
        recPanel.innerHTML = '';
        var recs = tpGetRecents();
        if (!recs.length) {
          recPanel.appendChild(el('div', { style: 'padding:8px;font-size:12px;color:#888;' }, 'No recent places yet — they appear here after you Find or pick a place.'));
          return;
        }
        recs.forEach(function (r) {
          var item = el('div', { style: 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;' });
          var pick = el('div', { style: 'flex:1;min-width:0;cursor:pointer;color:#1565c0;' }, r.name);
          pick.addEventListener('click', function () { fillPlace(r, 'recent: ' + r.name); tpAddRecent(r); tpSyncRecentDatalist(); recPanel.style.display = 'none'; });
          var del = el('span', { title: 'Remove', style: 'cursor:pointer;color:#b00;font-size:14px;padding:0 4px;' }, '✕');
          del.addEventListener('click', function (e) { e.stopPropagation(); tpRemoveRecent(r.name); tpSyncRecentDatalist(); populateRecents(); });
          item.appendChild(pick); item.appendChild(del);
          recPanel.appendChild(item);
        });
      }
      recBtn.addEventListener('click', function () {
        if (recPanel.style.display === 'none') { populateRecents(); recPanel.style.display = ''; }
        else { recPanel.style.display = 'none'; }
      });

      // Resolve a typed/picked place name. Order: a previously-saved recent
      // (instant, works offline) → a curated CITY_LIST city (lon/UTC + geocode
      // for lat) → any other place via geocoding (Nominatim). Successful
      // resolutions are auto-saved to recents.
      function resolveTyped() {
        var name = (cityInp.value || '').trim();
        if (!name) { status.style.color = '#b58900'; status.textContent = 'Type a place first, then 🔍 Find.'; return; }
        var rec = tpFindRecent(name);
        if (rec) { fillPlace(rec, 'recent: ' + rec.name); tpAddRecent(rec); tpSyncRecentDatalist(); return; }
        var known = tpCityData[name];
        if (known) {
          document.getElementById(lonId).value = Number(known.lng).toFixed(2);
          if (isOrigin) { var u = document.getElementById('tp-utc'); if (u) u.value = known.utc; }
        }
        status.style.color = '#888';
        status.textContent = 'Locating ' + name + '…';
        tpGeocode(name).then(function (g) {
          document.getElementById(latId).value = g.lat.toFixed(6);
          if (!known) document.getElementById(lonId).value = g.lon.toFixed(6);
          tpAddRecent({ name: name, lat: g.lat, lon: (known ? known.lng : g.lon), utc: (known ? known.utc : null) });
          tpSyncRecentDatalist();
          status.style.color = '#1b8a3f';
          status.textContent = '✓ ' + String(g.display || name).substring(0, 75);
        }).catch(function (err) {
          status.style.color = '#b58900';
          status.textContent = known
            ? 'Longitude/UTC set, but latitude lookup failed — tap 📍 GPS or type lat. (' + err.message + ')'
            : 'Place not found — try a more specific name, or 📍 GPS. (' + err.message + ')';
        });
      }
      cityInp.addEventListener('change', resolveTyped);
      cityInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); resolveTyped(); } });
      findBtn.addEventListener('click', resolveTyped);

      // GPS: fill lat+lon directly; for origin, estimate UTC from longitude.
      gpsBtn.addEventListener('click', function () {
        if (!navigator.geolocation) { status.style.color = '#b00'; status.textContent = 'GPS not available on this device/browser.'; return; }
        status.style.color = '#888'; status.textContent = 'Getting GPS position…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          var la = pos.coords.latitude, lo = pos.coords.longitude;
          document.getElementById(latId).value = la.toFixed(6);
          document.getElementById(lonId).value = lo.toFixed(6);
          if (isOrigin) { var u = document.getElementById('tp-utc'); if (u) u.value = Math.round(lo / 15); }
          cityInp.value = 'Current location';
          try { window._lastGpsLat = la; window._lastGpsLng = lo; localStorage.setItem('xkdg_gps', JSON.stringify({ lat: la, lng: lo })); } catch (e) {}
          status.style.color = '#1b8a3f';
          status.textContent = '✓ GPS ' + la.toFixed(4) + ', ' + lo.toFixed(4) + (isOrigin ? ' · UTC≈' + Math.round(lo / 15) + ' (edit if needed)' : '');
        }, function (err) {
          status.style.color = '#b00'; status.textContent = 'GPS error: ' + err.message;
        }, { enableHighAccuracy: true, timeout: 10000 });
      });

      return block;
    }

    form.appendChild(tpBuildLocationPicker('origin'));
    form.appendChild(tpBuildLocationPicker('dest'));
    try { tpSyncRecentDatalist(); } catch (e) {}

    var dstWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;color:#444;grid-column:1 / span 2;' });
    var dstChk = el('input', { id: 'tp-dst', type: 'checkbox' });
    dstChk.checked = tpDstFromIso((document.getElementById('tp-date') || {}).value || _tpToday); // auto from the departure date
    var _dstDateEl = document.getElementById('tp-date');
    if (_dstDateEl) _dstDateEl.addEventListener('change', function () { dstChk.checked = tpDstFromIso(_dstDateEl.value); });
    dstWrap.appendChild(dstChk);
    dstWrap.appendChild(el('span', null, 'Daylight saving (DST) - auto from date'));
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

    // ---- 🔋 Range & charging (Phase F) ------------------------------------
    var rcBlock = el('div', { style: 'grid-column:1 / span 2;border:1px solid #cfe3cf;border-radius:8px;padding:8px 10px;background:#f6fbf6;' });
    rcBlock.appendChild(el('div', { style: 'font-weight:600;color:#1b6e2f;margin-bottom:6px;' }, '🔋 Range & charging'));

    function rcNum(lbl, id, val, ph) {
      var w = el('label', { style: 'flex:1;display:flex;flex-direction:column;gap:2px;color:#555;font-size:11px;' }, lbl);
      w.appendChild(el('input', { id: id, type: 'number', step: 'any', value: String(val), placeholder: ph || '',
        style: 'padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;' }));
      return w;
    }

    // Charge-from-% helper: type the car's current charge (%) and the car's
    // full range (km); "Remaining range (km)" below is filled automatically.
    // (Strada 2 will later write tp-soc on its own; for now it is typed by hand.)
    var socRow = el('div', { style: 'display:flex;gap:8px;' });
    socRow.appendChild(rcNum('Current charge (%)', 'tp-soc', '', 'e.g. 80'));
    socRow.appendChild(rcNum('Full range @100% (km)', 'tp-fullrange', tpGetFullRange()));
    rcBlock.appendChild(socRow);
    var socHint = el('div', { id: 'tp-soc-hint', style: 'font-size:11px;color:#1b6e2f;margin:2px 0 6px;min-height:14px;' }, '');
    rcBlock.appendChild(socHint);

    var rcRow = el('div', { style: 'display:flex;gap:8px;' });
    var _liveR = tpGetLiveRange();
    var _rangeDefault = (_liveR && (Date.now() - _liveR.ts) < 2 * 3600000) ? _liveR.km : 200;
    rcRow.appendChild(rcNum('Remaining range (km)', 'tp-range', _rangeDefault));
    rcRow.appendChild(rcNum('Safety reserve (%)', 'tp-reserve', 15));
    rcBlock.appendChild(rcRow);

    function tpSocRecalc() {
      try {
        var socEl = document.getElementById('tp-soc');
        var frEl  = document.getElementById('tp-fullrange');
        var rgEl  = document.getElementById('tp-range');
        if (!socEl || !frEl || !rgEl) return;
        var soc = parseFloat(socEl.value), fr = parseFloat(frEl.value);
        if (isFinite(soc) && soc > 0 && isFinite(fr) && fr > 0) {
          var km = Math.round(fr * Math.min(soc, 100) / 100);
          rgEl.value = String(km);
          socHint.textContent = '\u2192 Remaining range set to \u2248 ' + km + ' km (' + soc + '% of ' + fr + ' km)';
        } else { socHint.textContent = ''; }
      } catch (e) {}
    }
    try {
      var _seB = socRow.querySelector('#tp-soc');
      var _feB = socRow.querySelector('#tp-fullrange');
      if (_seB) _seB.addEventListener('input', tpSocRecalc);
      if (_feB) _feB.addEventListener('input', function () { tpSetFullRange(parseFloat(_feB.value)); tpSocRecalc(); });
    } catch (e) {}

    // ---- 🔋 Read charge from car (Strada 2: xkdg-soc Worker) -------------
    // Paste the xkdg-soc Worker URL once (including ?k=YOUR_KEY); it is saved
    // locally. Tapping the button asks the Worker (which holds the Polestar
    // credentials) for the live SoC and remaining range, then fills the fields.
    try {
      var socWk = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#555;font-size:11px;margin-top:4px;' }, 'SoC Worker URL (include ?k=)');
      var socWkIn = el('input', { id: 'tp-soc-worker', type: 'password', autocomplete: 'off', spellcheck: 'false',
        value: (function () { try { return localStorage.getItem('xkdg_tp_soc_worker') || ''; } catch (e) { return ''; } })(),
        placeholder: 'https://xkdg-soc.<name>.workers.dev/?k=YOUR_KEY',
        style: 'padding:5px;border:1px solid #ccc;border-radius:6px;font-size:12px;' });
      socWk.appendChild(socWkIn);
      rcBlock.appendChild(socWk);

      var socBtnRow = el('div', { style: 'display:flex;gap:8px;align-items:center;margin:6px 0 2px;' });
      var socBtn = el('button', { type: 'button', id: 'tp-soc-read',
        style: 'padding:6px 12px;border:0;border-radius:6px;background:#1b6e2f;color:#fff;font-size:13px;cursor:pointer;' },
        '\uD83D\uDD0B Read charge from car');
      socBtnRow.appendChild(socBtn);
      var socEye = el('button', { type: 'button', id: 'tp-soc-eye', title: 'Show/hide URL',
        style: 'padding:6px 10px;border:1px solid #ccc;border-radius:6px;background:#fff;font-size:13px;cursor:pointer;' },
        '\uD83D\uDC41');
      socEye.addEventListener('click', function () {
        if (socWkIn.type === 'password') { socWkIn.type = 'text'; socEye.textContent = '\uD83D\uDE48'; }
        else { socWkIn.type = 'password'; socEye.textContent = '\uD83D\uDC41'; }
      });
      socBtnRow.appendChild(socEye);
      rcBlock.appendChild(socBtnRow);

      socBtn.addEventListener('click', function () {
        var wk = (socWkIn.value || '').trim();
        if (!wk) { socHint.style.color = '#b00'; socHint.textContent = 'Paste the SoC Worker URL first.'; return; }
        try { localStorage.setItem('xkdg_tp_soc_worker', wk); } catch (e) {}
        socBtn.disabled = true; var _old = socBtn.textContent; socBtn.textContent = '\u23F3 Reading\u2026';
        socHint.style.color = '#1b6e2f'; socHint.textContent = 'Contacting car\u2026';
        tpReadChargeFromCar().then(function (d) {
          var soc = (d && d.soc != null) ? Number(d.soc) : NaN;
          var rangeKm = (d && d.rangeKm != null) ? Number(d.rangeKm) : NaN;
          if (!(isFinite(rangeKm) && rangeKm > 0) && isFinite(soc)) { tpSocRecalc(); }
          var bits = [];
          if (isFinite(soc)) bits.push(Math.round(soc) + '%');
          if (isFinite(rangeKm) && rangeKm > 0) bits.push('~' + Math.round(rangeKm) + ' km left');
          if (d && d.charging) bits.push('\u26A1 charging');
          socHint.style.color = '#1b6e2f';
          socHint.textContent = '\uD83D\uDD0B From car: ' + (bits.join(' \u00B7 ') || 'updated');
        }).catch(function (e) {
          socHint.style.color = '#b00';
          socHint.textContent = 'Could not read charge: ' + ((e && e.message) || e);
        }).then(function () { socBtn.disabled = false; socBtn.textContent = _old; });
      });
    } catch (e) {}

    var netWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;margin:6px 0;font-size:12px;color:#444;' });
    TP_NETWORKS.forEach(function (n) {
      var lab = el('label', { style: 'display:flex;align-items:center;gap:5px;cursor:pointer;' });
      var cb = el('input', { type: 'checkbox', id: 'tp-net-' + n.id });
      cb.checked = true;
      lab.appendChild(cb); lab.appendChild(el('span', null, n.label));
      netWrap.appendChild(lab);
    });
    rcBlock.appendChild(netWrap);
    // "Preferred networks only" — when ticked, ONLY the checked networks (Tesla/Electra)
    // are ever chosen; no fallback to other operators. Persisted on this device.
    var prefOnlyLab = el('label', { style: 'display:flex;align-items:center;gap:6px;margin:2px 0 6px;font-size:12px;color:#444;cursor:pointer;' });
    var prefOnlyCb = el('input', { type: 'checkbox', id: 'tp-net-only' });
    try { prefOnlyCb.checked = (localStorage.getItem('xkdg_tp_pref_only') === '1'); } catch (e) {}
    prefOnlyCb.addEventListener('change', function () { try { localStorage.setItem('xkdg_tp_pref_only', prefOnlyCb.checked ? '1' : '0'); } catch (e) {} });
    prefOnlyLab.appendChild(prefOnlyCb);
    prefOnlyLab.appendChild(el('span', null, '\u2b50 Preferred networks only (no other operators as fallback)'));
    rcBlock.appendChild(prefOnlyLab);
    rcBlock.appendChild(tpBuildTariffTable());   // user-editable tariffs

    // OCM key: hidden input holds the real key (read by Find); the visible UI
    // shows it masked once saved, with reveal (👁) and change (✏️) actions.
    var ocmWrap = el('div', { style: 'display:flex;flex-direction:column;gap:3px;color:#555;font-size:11px;' });
    ocmWrap.appendChild(el('span', null, 'Open Charge Map API key'));
    var ocmReal = el('input', { id: 'tp-ocm-key', type: 'hidden', value: tpGetOcmKey() });
    ocmWrap.appendChild(ocmReal);
    var ocmRow = el('div', { style: 'display:flex;gap:6px;align-items:center;' });
    var ocmEdit = el('input', { id: 'tp-ocm-key-edit', type: 'text', placeholder: 'paste your OCM key', autocomplete: 'off',
      style: 'flex:1;min-width:0;padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    var ocmMask = el('div', { style: 'flex:1;min-width:0;padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;background:#f3f3f3;color:#555;font-family:monospace;' }, '');
    var ocmSave = el('button', { type: 'button', style: 'padding:5px 10px;border:1px solid #1b6e2f;border-radius:6px;background:#1b6e2f;color:#fff;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;' }, '💾 Save');
    var ocmEye = el('button', { type: 'button', title: 'Show / hide', style: 'padding:5px 9px;border:1px solid #888;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;' }, '👁');
    var ocmChange = el('button', { type: 'button', title: 'Change key', style: 'padding:5px 9px;border:1px solid #888;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;' }, '✏️');
    ocmRow.appendChild(ocmEdit); ocmRow.appendChild(ocmMask);
    ocmRow.appendChild(ocmSave); ocmRow.appendChild(ocmEye); ocmRow.appendChild(ocmChange);
    ocmWrap.appendChild(ocmRow);

    function ocmMaskStr(k) { return k.length <= 4 ? '•'.repeat(k.length) : '••••••••' + k.slice(-4); }
    var ocmRevealed = false;
    function ocmShowSaved() {
      ocmRevealed = false;
      ocmEdit.style.display = 'none'; ocmSave.style.display = 'none';
      ocmMask.style.display = ''; ocmEye.style.display = ''; ocmChange.style.display = '';
      ocmMask.textContent = ocmMaskStr(ocmReal.value || '');
    }
    function ocmShowEdit(prefill) {
      ocmEdit.value = prefill || '';
      ocmEdit.style.display = ''; ocmSave.style.display = '';
      ocmMask.style.display = 'none'; ocmEye.style.display = 'none'; ocmChange.style.display = 'none';
      ocmEdit.focus();
    }
    ocmSave.addEventListener('click', function () {
      var k = (ocmEdit.value || '').trim();
      ocmReal.value = k; tpSetOcmKey(k);
      if (k) ocmShowSaved(); else ocmShowEdit('');
    });
    ocmEdit.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ocmSave.click(); } });
    ocmEye.addEventListener('click', function () {
      ocmRevealed = !ocmRevealed;
      ocmMask.textContent = ocmRevealed ? (ocmReal.value || '') : ocmMaskStr(ocmReal.value || '');
    });
    ocmChange.addEventListener('click', function () { ocmShowEdit(ocmReal.value || ''); });
    if (ocmReal.value) ocmShowSaved(); else ocmShowEdit('');

    rcBlock.appendChild(ocmWrap);
    rcBlock.appendChild(el('div', { style: 'font-size:10px;color:#888;margin-top:3px;' },
      'Saved on this device only. Used to find Tesla/Electra stations reachable within your range AND before the 2-hour window. After SCAN TRIP, use “🔌 Find charging stops”.'));
    // TomTom EV Worker (xkdg-ev): SECOND charger source merged with OCM — far better
    // European coverage (Electra!). Optional: leave empty to stay OCM-only.
    var evWrap = el('div', { style: 'display:flex;flex-direction:column;gap:3px;color:#555;font-size:11px;margin-top:8px;' });
    evWrap.appendChild(el('span', null, 'TomTom EV Worker URL (optional — adds Electra & full EU coverage)'));
    var evIn = el('input', { id: 'tp-ev-worker', type: 'text', autocomplete: 'off',
      placeholder: 'https://xkdg-ev.<name>.workers.dev/?k=YOUR_KEY',
      value: (function () { try { return localStorage.getItem('xkdg_tp_ev_worker') || ''; } catch (e) { return ''; } })(),
      style: 'padding:5px;border:1px solid #ccc;border-radius:6px;font-size:12px;' });
    evIn.addEventListener('change', function () { try { localStorage.setItem('xkdg_tp_ev_worker', (evIn.value || '').trim()); } catch (e) {} });
    evWrap.appendChild(evIn);
    rcBlock.appendChild(evWrap);
    form.appendChild(rcBlock);

    panel.appendChild(form);

    var btn = el('button', {
      id: 'tp-scan',
      style: 'width:100%;padding:10px;border:0;border-radius:8px;background:#1565c0;color:#fff;' +
        'font-size:14px;font-weight:600;cursor:pointer;'
    }, 'SCAN TRIP');
    panel.appendChild(btn);

    var depBtn = el('button', { id: 'tp-depopts', type: 'button',
      style: 'width:100%;margin-top:6px;padding:9px;border:1px solid #4527a0;border-radius:8px;background:#fff;color:#4527a0;font-size:13px;font-weight:600;cursor:pointer;' },
      '\uD83D\uDD50 Departure options (BEST / BY HOUR)');
    depBtn.addEventListener('click', function(){ try { tpShowDepartureOptions(); } catch(e){} });
    panel.appendChild(depBtn);

    var roadsBtn = el('button', { id: 'tp-savedroads', type: 'button',
      style: 'width:100%;margin-top:6px;padding:8px;border:1px solid #1f3a5f;border-radius:8px;background:#fff;color:#1f3a5f;font-size:12px;font-weight:600;cursor:pointer;' },
      '\uD83D\uDDFA Saved roads');
    roadsBtn.addEventListener('click', function(){ try { tpShowSavedRoads(); } catch(e){} });
    panel.appendChild(roadsBtn);

    // ---- ARRIVE-BY: fixed arrival, flexible departure ---------------------
    // Lists travel solutions that all arrive at the target time (± tolerance),
    // shortest first; "Use" fills departure+duration (no snap) and runs SCAN.
    var abWrap = el('div', { style: 'margin-top:10px;border:1px solid #d9c9ec;border-radius:8px;padding:9px;background:#faf7fd;' });
    abWrap.appendChild(el('div', { style: 'font-weight:700;color:#5b2a86;font-size:13px;margin-bottom:5px;' }, '\ud83c\udfaf Arrive by (flexible departure)'));
    abWrap.appendChild(el('div', { style: 'font-size:11px;color:#777;margin-bottom:7px;' },
      'Fixed arrival, flexible departure. Solutions are shortest first; longer ones pass through more favourable directions. Uses the trip date above as the arrival date. Run SCAN TRIP first for the real driving time.'));
    var abRow = el('div', { style: 'display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;' });
    var abTimeW = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#444;font-size:12px;flex:1;min-width:110px;' }, 'Arrival time');
    abTimeW.appendChild(el('input', { id: 'tp-arr-time', type: 'time', value: '18:00', style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' }));
    abRow.appendChild(abTimeW);
    var abTolW = el('label', { style: 'display:flex;flex-direction:column;gap:2px;color:#444;font-size:12px;width:96px;' }, 'Tolerance (min)');
    abTolW.appendChild(el('input', { id: 'tp-arr-tol', type: 'number', value: '15', style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' }));
    abRow.appendChild(abTolW);
    abWrap.appendChild(abRow);
    var abBtn = el('button', { type: 'button', id: 'tp-arr-find',
      style: 'width:100%;margin-top:8px;padding:9px;border:0;border-radius:8px;background:#7e3ff2;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' },
      'FIND ARRIVE-BY SOLUTIONS');
    abWrap.appendChild(abBtn);
    var abOut = el('div', { id: 'tp-arr-out', style: 'margin-top:8px;font-size:12px;' });
    abWrap.appendChild(abOut);
    panel.appendChild(abWrap);

    abBtn.addEventListener('click', function () {
      abOut.innerHTML = '';
      function num(id) { var e = document.getElementById(id); return e ? parseFloat(e.value) : NaN; }
      var oLat = num('tp-olat'), oLon = num('tp-olon'), dLat = num('tp-dlat'), dLon = num('tp-dlon');
      if (!isFinite(oLat) || !isFinite(oLon) || !isFinite(dLat) || !isFinite(dLon)) {
        abOut.innerHTML = '<div style="color:#b00;">Set From and To (origin/destination) first.</div>'; return;
      }
      var dateStr = (document.getElementById('tp-date') || {}).value;
      var timeStr = (document.getElementById('tp-arr-time') || {}).value || '18:00';
      var target = new Date(dateStr + 'T' + timeStr);
      if (isNaN(target.getTime())) { abOut.innerHTML = '<div style="color:#b00;">Invalid arrival date/time.</div>'; return; }
      var tol = parseInt((document.getElementById('tp-arr-tol') || {}).value, 10); if (!isFinite(tol)) tol = 15;
      var utc = num('tp-utc'); if (!isFinite(utc)) utc = 0;
      var range = num('tp-range') || 0, reserve = num('tp-reserve') || 0;
      var out;
      try {
        out = tpPlanArriveBy({ arriveDate: target, tolMin: tol,
          origin: { lat: oLat, lon: oLon, name: (window._tpNames && window._tpNames.origin) || 'Origin' },
          dest: { lat: dLat, lon: dLon, name: (window._tpNames && window._tpNames.dest) || 'Destination' },
          utc: utc, dstOn: tpDstActiveOn(target), rangeKm: range, reserveKm: reserve, maxExtraHours: 5 });
      } catch (e) { abOut.innerHTML = '<div style="color:#b00;">Error: ' + e.message + '</div>'; return; }
      if (!out.solutions.length) { abOut.innerHTML = '<div style="color:#b58900;">No solution within \u00b1' + tol + ' min.</div>'; return; }
      abOut.appendChild(el('div', { style: 'color:#555;margin-bottom:5px;' },
        'Arrive ' + timeStr + ' \u00b1' + tol + ' min \u00b7 ' + out.km + ' km \u00b7 drive \u2248' + out.driveH + 'h' +
        (out.usedRealRoute ? ' (real route)' : ' (estimate \u2014 run SCAN TRIP for real driving time)')));
      out.solutions.slice(0, 5).forEach(function (s, i) {
        var row = el('div', { style: 'display:flex;align-items:center;gap:8px;border-top:1px solid #e7dcf5;padding:6px 0;' });
        var info = el('div', { style: 'flex:1;min-width:0;' });
        info.appendChild(el('div', { style: 'font-weight:600;color:#333;' },
          (i === 0 ? '\u26a1 ' : '') + 'Leave <b>' + s.depClock + '</b> \u2192 arrive ' + s.arriveClock + ' \u00b7 ' + s.durH + 'h'));
        info.appendChild(el('div', { style: 'color:#888;' },
          (s.dirsCashed.length ? 'favourable: ' + s.dirsCashed.join(', ') : 'no favourable cashing') +
          (s.favHours ? ' \u00b7 ' + s.favHours + ' good hours' : '') +
          (s.chargeNeeded ? ' \u00b7 \ud83d\udd0c charge needed' : '')));
        row.appendChild(info);
        var useBtn = el('button', { type: 'button',
          style: 'padding:6px 10px;border:1px solid #7e3ff2;border-radius:6px;background:#fff;color:#7e3ff2;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;' }, 'Use');
        (function (sol) {
          useBtn.addEventListener('click', function () {
            var dd = sol.depWall;
            var ds = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
            var ts = String(dd.getHours()).padStart(2, '0') + ':' + String(dd.getMinutes()).padStart(2, '0');
            var de = document.getElementById('tp-date'); if (de) de.value = ds;
            var te = document.getElementById('tp-time'); if (te) te.value = ts;
            var du = document.getElementById('tp-dur'); if (du) du.value = sol.durH;
            window._tpNoSnap = true;   // keep this exact departure so arrival stays on target
            var sb = document.getElementById('tp-scan'); if (sb) sb.click();
          });
        })(s);
        row.appendChild(useBtn);
        abOut.appendChild(row);
      });
    });

    // ---- "I'm here now": reset origin to current GPS and replan ------------
    // For stopping mid-trip (e.g. in the countryside) and restarting the route
    // from the exact point you are. Sets origin = GPS, clears the cached route
    // so it is re-fetched from here, then runs SCAN TRIP.
    var resetBtn = el('button', { type: 'button',
      style: 'width:100%;padding:9px;margin-top:8px;border:1px solid #b58900;border-radius:8px;' +
        'background:#fff8e1;color:#8a4b00;font-size:13px;font-weight:600;cursor:pointer;' },
      '🔄 I\u2019m here now — reset origin to my GPS & replan');
    panel.appendChild(resetBtn);
    var resetStatus = el('div', { style: 'font-size:11px;color:#888;margin-top:4px;text-align:center;min-height:14px;' }, '');
    panel.appendChild(resetStatus);
    resetBtn.addEventListener('click', function () {
      if (!navigator.geolocation) { resetStatus.style.color = '#b00'; resetStatus.textContent = 'GPS not available on this device/browser.'; return; }
      resetStatus.style.color = '#888'; resetStatus.textContent = 'Getting your position…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var la = pos.coords.latitude, lo = pos.coords.longitude;
        document.getElementById('tp-olat').value = la.toFixed(6);
        document.getElementById('tp-olon').value = lo.toFixed(6);
        var u = document.getElementById('tp-utc'); if (u) u.value = Math.round(lo / 15);
        var oc = document.getElementById('tp-ocity'); if (oc) oc.value = 'Current location';
        try { window._lastGpsLat = la; window._lastGpsLng = lo; localStorage.setItem('xkdg_gps', JSON.stringify({ lat: la, lng: lo })); } catch (e) {}
        TP_LAST_ROUTE = null;   // force a fresh route fetch from the new origin
        resetStatus.style.color = '#1b8a3f';
        resetStatus.textContent = '✓ Origin set to your position (' + la.toFixed(4) + ', ' + lo.toFixed(4) + ') — replanning…';
        try { btn.click(); } catch (e) { resetStatus.style.color = '#b00'; resetStatus.textContent = 'Replan error: ' + e.message; }
      }, function (err) {
        resetStatus.style.color = '#b00'; resetStatus.textContent = 'GPS error: ' + err.message;
      }, { enableHighAccuracy: true, timeout: 10000 });
    });

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

    ov.querySelector('#tp-close').addEventListener('click', function () { ov.style.display = 'none'; if (tpReturnFn) { var f = tpReturnFn; tpReturnFn = null; try { f(); } catch (e) {} } });
    ov.querySelector('#tp-guide').addEventListener('click', tpShowGuide);
    // Show the guide automatically the first time the planner is opened this session.
    if (!window._tpGuideShown) { window._tpGuideShown = true; tpShowGuide(); }

    // Draggable (finger/mouse) + minimizable so the panel never blocks the AI chat.
    tpMakePanelMovable(panel);

    btn.addEventListener('click', function () {
      try {
        var dStr = document.getElementById('tp-date').value;
        var tStr = document.getElementById('tp-time').value || '12:00';
        var dep = new Date(dStr + 'T' + tStr);
        var dstAuto = document.getElementById('tp-dst'); if (dstAuto) dstAuto.checked = tpDstActiveOn(dep); // auto DST from the date
        var opts = {
          depDate: dep,
          durationH: parseFloat(document.getElementById('tp-dur').value) || 12,
          maxLegHours: parseFloat(document.getElementById('tp-maxleg').value) || 2.5,
          utc: parseFloat(document.getElementById('tp-utc').value) || 0,
          dstOn: document.getElementById('tp-dst').checked,
          origin: { lat: parseFloat(document.getElementById('tp-olat').value), lon: parseFloat(document.getElementById('tp-olon').value) },
          dest: { lat: parseFloat(document.getElementById('tp-dlat').value), lon: parseFloat(document.getElementById('tp-dlon').value), name: (window._tpNames && window._tpNames.dest) || 'Destination' }
        };
        opts.origin.name = (window._tpNames && window._tpNames.origin) || 'Origin';
        opts.stopMode = document.getElementById('tp-stopmode').value;
        opts.charges = tpParseCharges(document.getElementById('tp-charges').value, dep);
        if (window._tpNoSnap) { opts.snapDepart = false; window._tpNoSnap = false; }  // arrive-by: keep the exact departure

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

        // ---- Auto-departure: no time was given -> pick the most favourable (and
        // earliest, to stay shortest) departure now that the hour cache is warm. --
        if (window._tpAutoDepart) {
          window._tpAutoDepart = false;
          try {
            var routeForPick = (TP_LAST_ROUTE && tpRouteMatches(TP_LAST_ROUTE, { lat: opts.origin.lat, lng: opts.origin.lon }, { lat: opts.dest.lat, lng: opts.dest.lon })) ? TP_LAST_ROUTE : null;
            var bestDep = tpPickBestDepartureForDay(opts.origin, opts.dest, dStr, opts.utc, opts.dstOn, routeForPick);
            if (bestDep && bestDep.clock) {
              var teEl2 = document.getElementById('tp-time'); if (teEl2) teEl2.value = bestDep.clock;
              dep = new Date(dStr + 'T' + bestDep.clock);
              opts.depDate = dep;
              if (dstAuto) dstAuto.checked = tpDstActiveOn(dep);
              opts.dstOn = document.getElementById('tp-dst').checked;
              opts.charges = tpParseCharges(document.getElementById('tp-charges').value, dep);
            }
          } catch (ePick) { /* keep the placeholder departure */ }
        }

        // ---- Build + render. The route may be supplied (real road) or null. --
        function buildAndRender(route, fetchNote) {
          try {
            opts.route = route || null;
            // "Shortest possible" timing: when a real road route is known and the
            // duration is still at the generic default (12h or blank), shrink the
            // planning window to the actual driving time + a small margin (enough to
            // pick a favourable double-hour and short on-road stops). Never EXPAND a
            // duration the user typed deliberately, and never grow past 12h.
            try {
              var durField = document.getElementById('tp-dur');
              var raw = durField ? (durField.value || '').trim() : '';
              var isDefaultDur = (raw === '' || raw === '12');
              var ridx = tpBuildRouteIndex(route);
              if (isDefaultDur && ridx && ridx.durationSec) {
                var driveH = ridx.durationSec / 3600;
                var sized = Math.max(2, Math.min(12, Math.ceil(driveH + 2)));   // drive + ~2h margin
                if (sized < (parseFloat(raw) || 12)) {
                  opts.durationH = sized;
                  if (durField) durField.value = String(sized);
                }
              }
            } catch (eDur) { /* keep whatever duration was set */ }
            var res = tpPlan(opts);
            tpRender(res, results);
            if (fetchNote) {
              var n = el('div', { style: 'margin-top:6px;font-size:11px;color:#b58900;' }, fetchNote);
              results.appendChild(n);
            }
            // ---- PHASE 2: active detour (best-effort, async) ----------------
            try {
              var _intents = (res.plan && res.plan.detourIntents) || [];
              if (!opts._detourTried && opts.detours !== false && _intents.length &&
                  res.routeMeta && res.routeMeta.durationSec) {
                var _wurl = (document.getElementById('tp-worker') || {}).value;
                _wurl = (_wurl || '').trim();
                if (_wurl) {
                  var _rng = document.getElementById('tp-range');
                  var _isEV = !!(_rng && parseFloat(_rng.value) > 0);
                  var _cruise = (res.routeMeta.km && res.routeMeta.durationSec)
                    ? (res.routeMeta.km / (res.routeMeta.durationSec / 3600)) : 80;
                  var _baseSec = res.routeMeta.durationSec;
                  var _oLL = { lat: opts.origin.lat, lng: opts.origin.lon };
                  var _dLL = { lat: opts.dest.lat, lng: opts.dest.lon };
                  var _dn = el('div', { id: 'tp-detour-note', style: 'margin-top:8px;font-size:12px;color:#666;' },
                    '\u21aa Checking a real positive detour\u2026');
                  results.appendChild(_dn);
                  tpRealizeDetoursMulti(_wurl, _oLL, _dLL, _baseSec, _intents, _isEV, _cruise).then(function (det) {
                    try {
                      if (!det) { if (_dn.parentNode) _dn.parentNode.removeChild(_dn); return; }
                      var pct = Math.round(det.addedPct * 100);
                      opts._detourTried = true;
                      TP_LAST_ROUTE = det.route;
                      var _df = document.getElementById('tp-dur'); if (_df) _df.value = '';
                      results.innerHTML = '';
                      buildAndRender(det.route);
                      var _via = (det.Ws || []).map(function (w) { return w.name || 'a stop'; }).join(', ');
                      var _n = det.count || ((det.Ws && det.Ws.length) || 1);
                      var ok = el('div', { style: 'margin-top:8px;font-size:12px;color:#1b5e20;border:1px solid #1b8a3f;border-radius:8px;padding:8px 10px;background:#f3fbf5;' },
                        '\u21aa ' + _n + ' positive detour' + (_n === 1 ? '' : 's') + ' adopted via ' + _via +
                        ' \u2014 +' + pct + '% road time total (within budget), so more legs head a favourable direction.');
                      results.appendChild(ok);
                    } catch (e3) { try { if (_dn.parentNode) _dn.parentNode.removeChild(_dn); } catch (e4) {} }
                  });
                }
              }
            } catch (eDet) { /* detours are best-effort; keep the base plan */ }
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
        var savedShape = haveMatch ? null : tpLoadRouteShape(O, D);   // persistent road shape from a previous session

        if (haveMatch) {
          buildAndRender(TP_LAST_ROUTE);
        } else if (savedShape) {
          TP_LAST_ROUTE = savedShape;
          buildAndRender(savedShape);
        } else if (url) {
          tpSetWorkerUrl(url);
          results.innerHTML = '<div style="font-size:13px;color:#666;">Fetching real route from the Worker…</div>';
          tpFetchRoute(url, O, D).then(function (r) {
            TP_LAST_ROUTE = r;
            tpSaveRouteShape(r, window._tpNames); // save the shape (with names) so next time no fetch is needed
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
  // Open the planner with the fields PRE-FILLED (and optionally run the plan).
  // Used by the AI assistant so "plan an itinerary from A to B" actually fills
  // origin/destination/departure (+ EV range/reserve) and launches the road plan,
  // instead of opening a blank panel. Waits for the panel to exist (handles the
  // unlock-code case) before filling. params keys: originLat/originLon/originName,
  // destLat/destLon/destName, departDate ('YYYY-MM-DD'), departTime ('HH:MM'),
  // durationH, utc, rangeKm, reserveKm, charges, worker, run (default true).
  // Pick the best DEPARTURE double-hour of a day when the user gave no time.
  // Rule (Edu): highest luck score wins; on a tie, the EARLIEST start (so the
  // trip is also the shortest/finishes soonest). "Luck score" = the best
  // toward-destination direction's `combined` value (direction score + hour
  // synergy), which is exactly what the planner ranks on. Considers daytime
  // departures only. Returns { clock:'HH:MM', ms, score } or null.
  // ---- B) DEPARTURE OPTIONS ------------------------------------------------
  // Edu's "road timetable" idea: the road SHAPE (e.g. Vienna->Tuoro) is ~fixed, so
  // we fetch/reuse ONE route and score MANY departure times against it cheaply.
  // Reuses tpSearchItineraries (one route + per-departure tpPlan + tpScoreItinerary
  // = whole-trip cash score). One option per 2h block, sortable BEST / BY HOUR;
  // tapping a time builds its full itinerary.
  function tpShowDepartureOptions() {
    function pad(n){ return String(n).padStart(2, '0'); }
    var results = document.getElementById('tp-results');
    if (!results) return;
    var dStr = (document.getElementById('tp-date') || {}).value;
    var oLat = parseFloat((document.getElementById('tp-olat') || {}).value);
    var oLon = parseFloat((document.getElementById('tp-olon') || {}).value);
    var dLat = parseFloat((document.getElementById('tp-dlat') || {}).value);
    var dLon = parseFloat((document.getElementById('tp-dlon') || {}).value);
    if (!dStr || !isFinite(oLat) || !isFinite(oLon) || !isFinite(dLat) || !isFinite(dLon)) {
      results.innerHTML = '<div style="color:#b58900;font-size:13px;">Set origin, destination and date first.</div>'; return;
    }
    var O = { lat: oLat, lon: oLon }, Dst = { lat: dLat, lon: dLon };
    var utc = parseFloat((document.getElementById('tp-utc') || {}).value) || 0;
    var dstOn = tpDstActiveOn(new Date(dStr + 'T12:00:00'));
    results.innerHTML = '<div style="font-size:13px;color:#666;">Scoring departures along the road shape\u2026</div>';
    try {
      if (typeof runScanner === 'function') {
        var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days');
        var ps = ss ? ss.value : null, pd = sd ? sd.value : null;
        if (ss) ss.value = dStr; if (sd) sd.value = '2';
        runScanner();
        if (ss && ps != null) ss.value = ps; if (sd && pd != null) sd.value = pd;
      }
    } catch (e) {}
    var nowMs = null;
    try { var t = new Date(); if (dStr === (t.getFullYear() + '-' + pad(t.getMonth()+1) + '-' + pad(t.getDate()))) nowMs = t.getTime(); } catch (e) {}
    tpSearchItineraries({ origin: O, dest: Dst, startDate: dStr, days: 1, topK: 64, utc: utc, dstOn: dstOn, optimizeArrival: true })
      .then(function (res) {
        var all = (res && res.top) || [];
        if (nowMs) all = all.filter(function (c) { return c.depart_ms >= nowMs; });
        var byBlock = {};
        all.forEach(function (c) {
          var d = new Date(c.depart_ms);
          var key = Math.floor((d.getHours() * 60 + d.getMinutes()) / 120);   // 2h block
          var cur = byBlock[key];
          if (!cur || c.score > cur.score || (c.score === cur.score && c.depart_ms < cur.depart_ms)) byBlock[key] = c;
        });
        var cands = Object.keys(byBlock).map(function (k) { return byBlock[k]; });
        if (!cands.length) { results.innerHTML = '<div style="font-size:13px;color:#8a6d00;">No favourable daytime departure on ' + dStr + '. Try another date.</div>'; return; }
        tpRenderDepartureOptions(results, cands, res, dStr);
      })
      .catch(function (e) { results.innerHTML = '<div style="color:#b00;font-size:13px;">Could not rank departures: ' + (e && e.message ? e.message : e) + '</div>'; });
  }

  function tpRenderDepartureOptions(container, cands, meta, dStr) {
    if (!window._tpDepSort) window._tpDepSort = 'best';
    var chosen = (document.getElementById('tp-time') || {}).value || '';
    container.innerHTML = '';
    var box = el('div', { style: 'border:1px solid #c9b6d6;border-radius:10px;padding:10px;background:#faf7fd;' });
    box.appendChild(el('div', { style: 'font-weight:700;color:#4527a0;font-size:14px;margin-bottom:2px;' }, '\uD83D\uDD50 Departure options \u2014 ' + dStr));
    var sub = 'Whole-trip score (sum of favourable cash hours).';
    if (meta) sub += ' ' + (meta.real_route ? 'Real road' : 'Straight-line') + (meta.driving_h != null ? (' \u00b7 ~' + meta.driving_h + 'h' + (meta.km ? (' \u00b7 ' + meta.km + ' km') : '')) : '') + '.';
    box.appendChild(el('div', { style: 'font-size:11px;color:#777;margin-bottom:8px;' }, sub + ' Tap a time to build its full itinerary.'));
    var tg = el('div', { style: 'display:flex;gap:6px;margin-bottom:8px;' });
    function mkTab(id, label){ var on = (window._tpDepSort === id);
      var b = el('button', { type: 'button', style: 'flex:1;padding:6px;border-radius:7px;border:1px solid ' + (on ? '#4527a0' : '#c9b6d6') + ';background:' + (on ? '#4527a0' : '#fff') + ';color:' + (on ? '#fff' : '#4527a0') + ';font-size:12px;font-weight:700;cursor:pointer;' }, label);
      b.addEventListener('click', function(){ window._tpDepSort = id; tpRenderDepartureOptions(container, cands, meta, dStr); });
      return b; }
    tg.appendChild(mkTab('best', 'BEST')); tg.appendChild(mkTab('hour', 'BY HOUR'));
    box.appendChild(tg);
    var list = cands.slice();
    if (window._tpDepSort === 'best') list.sort(function(a,b){ return (b.score - a.score) || (a.depart_ms - b.depart_ms); });
    else list.sort(function(a,b){ return a.depart_ms - b.depart_ms; });
    var maxSc = 0; cands.forEach(function(c){ if (c.score > maxSc) maxSc = c.score; });
    list.forEach(function(c){
      var hhmm = c.depart || '';
      var isChosen = (hhmm === chosen);
      var row = el('div', { style: 'display:flex;align-items:center;gap:8px;margin:4px 0;padding:7px 9px;border-radius:8px;cursor:pointer;border:1px solid ' + (isChosen ? '#1b8a3f' : '#e0d4e8') + ';background:' + (isChosen ? '#f1f8f2' : '#fff') + ';' });
      var star = (c.score === maxSc && maxSc > 0) ? '\u2b50' : '';
      var left = el('div', { style: 'flex:1;' });
      left.appendChild(el('div', { style: 'font-weight:700;font-size:14px;color:#222;' }, (star ? star + ' ' : '') + hhmm + (c.arrive ? (' \u2192 ' + c.arrive + (c.arrive_next_day ? ' (+1)' : '')) : '')));
      left.appendChild(el('div', { style: 'font-size:11px;color:#666;' }, 'score ' + (Math.round((c.score||0) * 10) / 10) + ' \u00b7 ' + (c.cash_hours||0) + '/' + (c.total_hours||0) + ' fortunate' + ((c.xkdg_bonus) ? (' \u00b7 XKDG +' + c.xkdg_bonus + ' (' + (c.xkdg_hours||0) + ')') : '')));
      row.appendChild(left);
      row.appendChild(el('div', { style: 'font-size:12px;color:#1565c0;font-weight:700;white-space:nowrap;' }, isChosen ? 'current' : 'Plan \u2192'));
      row.addEventListener('click', function(){
        var tEl = document.getElementById('tp-time'); if (tEl) tEl.value = hhmm;
        window._tpNoSnap = true; window._tpAutoDepart = false;
        var scan = document.getElementById('tp-scan'); if (scan) scan.click();
      });
      box.appendChild(row);
    });
    container.appendChild(box);
  }

  function tpPickBestDepartureForDay(O, Dst, dateStr, utc, dstOn, route, minMs, strict) {
    var DAY_START_H = 5, DAY_END_H = 21;   // sensible driving window, local clock
    var probe;
    try {
      probe = tpPlan({
        depDate: new Date(dateStr + 'T05:00:00'),
        durationH: (DAY_END_H - DAY_START_H),
        origin: O, dest: Dst, utc: utc, dstOn: dstOn,
        snapDepart: true, stepMin: 30, stopMode: 'auto',
        route: (route && tpRouteMatches(route, { lat: O.lat, lng: O.lon }, { lat: Dst.lat, lng: Dst.lon })) ? route : null
      });
    } catch (e) { return null; }
    if (!probe || !probe.slots || !probe.slots.length) return null;
    // Driving time estimate for THIS trip: needed to know in which window the ARRIVAL
    // falls for each candidate departure (arrival cash — domain rule).
    var _driveH = (route && route.durationSec) ? (route.durationSec / 3600)
                : (tpHaversineKm(O.lat, O.lon, Dst.lat, Dst.lon) / 72);
    var _overall = probe.snapDir || null;   // overall origin→destination direction (8-wind snap)
    function _arrivalBonus(depSlot) {
      // ARRIVAL CASH: if the window containing the (estimated) arrival lists the
      // OVERALL direction among its gated favourable directions, add its score
      // × TP_ARRIVAL_CASH_MULT — reaching the destination inside a favourable
      // window is worth MORE than a favourable departure. Arriving is enough.
      try {
        if (!_overall) return 0;
        var arrMs = depSlot.wallStart.getTime() + _driveH * 3600000;
        for (var i = 0; i < probe.slots.length; i++) {
          var s = probe.slots[i];
          var a = s.wallStart ? s.wallStart.getTime() : null, b = s.wallEnd ? s.wallEnd.getTime() : null;
          if (a == null || b == null || arrMs < a || arrMs >= b) continue;
          var d = (s.dirs || []).filter(function (x) { return x.dir === _overall; })[0];
          if (d && d.eval && d.eval.ok) return ((d.combined != null) ? d.combined : (d.eval.score || 0)) * TP_ARRIVAL_CASH_MULT;
          return 0;
        }
      } catch (e) {}
      return 0;
    }
    var best = null, bestHourOnly = null, earliest = null;
    probe.slots.forEach(function (slot) {
      var h = slot.wallStart.getHours();
      if (h < DAY_START_H || h > DAY_END_H) return;
      if (minMs && slot.wallStart.getTime() < minMs) return;   // skip departures already past / too soon (today)
      if (!earliest) earliest = slot;
      var hs = (slot.hourScore != null) ? slot.hourScore : -Infinity;
      if (!bestHourOnly || hs > bestHourOnly._hs) { bestHourOnly = slot; bestHourOnly._hs = hs; }
      var arrB = _arrivalBonus(slot);
      if (strict) {
        // ABSOLUTE RULE: the EXACT travel direction's door must be favourable at departure.
        var de = tpDirExact(slot, slot.bearingDest);
        if (!de || !de.eval || !de.eval.ok) return;   // unfavourable door in the travel direction -> not allowed
        var scs = ((de.combined != null) ? de.combined : 0) + arrB;   // arrival cash on top, after the gate
        if (!best || scs > best._sc) { best = slot; best._sc = scs; }
      } else {
        var bd = tpBestDirToward(slot, slot.bearingDest);
        var sc = (bd && bd.combined != null) ? bd.combined : null;
        // A candidate qualifies if the DEPARTURE is favourable OR the ARRIVAL cashes:
        // a short trip that lands inside a favourable window is a valid (often the
        // best) plan even when the departure hour itself offers nothing.
        if (sc != null || arrB > 0) {
          var tot = ((sc != null) ? sc : 0) + arrB;
          if (!best || tot > best._sc) { best = slot; best._sc = tot; }
        }
      }
    });
    // strict: NO fallback to an unfavourable hour — if nothing qualifies, there is no valid departure.
    var chosen = strict ? best : (best || bestHourOnly || earliest);
    if (!chosen) return null;
    var d = chosen.wallStart;
    return {
      clock: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
      ms: d.getTime(),
      score: (best ? best._sc : null)
    };
  }

  // ── MULTI-DAY ITINERARY SEARCH ───────────────────────────────────────────────
  // Score = TOTAL CASH: the sum of the QMDJ scores of every fortunate (cash) hour
  // of the trip. With optimizeArrival, the arrival hour's own favourable score is
  // added too (so arriving in a favourable hour/direction is rewarded).
  function tpScoreItinerary(result, optimizeArrival) {
    var slots = (result && result.slots) || [];
    function roadEntry(s) {
      var rd = tpSnapDir((s.bearingDest != null) ? s.bearingDest : result.bearing);
      return (s.dirs || []).filter(function (d) { return d.dir === rd; })[0] || null;
    }
    // XKDG/person dimension is the GRADED lucky-date hour score (slot.hourScore),
    // exactly the Date Selection number: it already folds in Blood Link / Family /
    // Pure Qi / Hetu / Adding with the traveller(s) (calcHourScore, averaged over A
    // and B). hourPositive = score >= TP_HOUR_THRESHOLD. Combined with the QMDJ
    // direction score so BOTH dimensions count:
    //   direction favourable + XKDG-positive -> dir score + graded XKDG bonus
    //   direction favourable only            -> dir score
    //   XKDG-positive only (bad direction)   -> SMALL XKDG bonus (beats a dead hour)
    //   neither                              -> 0 (the worst)
    function xkScore(s){ return (s && s.hourScore != null) ? s.hourScore : null; }
    function xkPositive(s){ return !!(s && s.hourPositive); }
    var cash = 0, xkBonus = 0, cashHours = 0, xkdgHours = 0;
    slots.forEach(function (s) {
      var e = roadEntry(s);
      var dirOK = !!(e && e.eval && e.eval.ok);
      var xs = xkScore(s), xkOK = xkPositive(s);
      if (dirOK) {
        cash += (e.eval.score || 0); cashHours++;
        if (xkOK && xs != null) { xkBonus += xs * TP_XKDG_WEIGHT; xkdgHours++; }      // graded bonus (Blood Link big)
      } else if (xkOK && xs != null) {
        xkBonus += xs * TP_XKDG_ONLY_WEIGHT; xkdgHours++;                              // small bonus: XKDG good, direction not
      }
    });
    var arrivalScore = 0;
    if (optimizeArrival && slots.length) {
      var last = slots[slots.length - 1], le = roadEntry(last);
      if (le && le.eval && le.eval.ok) {
        arrivalScore = (le.eval.score || 0);
        if (xkPositive(last) && xkScore(last) != null) arrivalScore += xkScore(last) * TP_XKDG_WEIGHT;
      }
    }
    // ARRIVAL CASH (domain rule): ALWAYS counted, in every mode. If the window the
    // ARRIVAL falls in has the OVERALL origin→destination direction (result.snapDir)
    // among its gated favourable directions, the trip cashes the arrival itself —
    // worth MORE than a road cash stop (× TP_ARRIVAL_CASH_MULT). Arriving within the
    // window is enough: no stop, no margin.
    var arrCash = 0, arrCashDir = null;
    (function () {
      var lastS = slots[slots.length - 1];
      var overall = result && result.snapDir;
      if (!lastS || !overall) return;
      var d = (lastS.dirs || []).filter(function (x) { return x.dir === overall; })[0];
      if (d && d.eval && d.eval.ok) { arrCash = (d.eval.score || 0) * TP_ARRIVAL_CASH_MULT; arrCashDir = overall; }
    })();
    var rnd = function (n) { return Math.round(n * 10) / 10; };
    return { total_cash: cash, xkdg_bonus: rnd(xkBonus), cash_hours: cashHours, xkdg_hours: xkdgHours,
             total_hours: slots.length, arrival_score: arrivalScore,
             arrival_cash: rnd(arrCash), arrival_cash_dir: arrCashDir,
             score: rnd(cash + xkBonus + arrivalScore + arrCash) };
  }

  // Scan `days` days from startDate; for every double-hour departure in the daytime
  // window, plan the trip (reusing ONE pre-fetched route) and score it. Returns a
  // Promise of the ranked top-K itineraries. The route is fetched once; per-candidate
  // planning is local (no network). Chart results are memoised and the loop yields
  // between days so the UI never freezes.
  function tpSearchItineraries(opts) {
    opts = opts || {};
    var O = opts.origin, Dst = opts.dest;
    var days = Math.max(1, Math.min(parseInt(opts.days, 10) || 7, 31));
    var utc = (opts.utc != null) ? opts.utc : 1, dstOn = !!opts.dstOn;
    var topK = Math.max(1, parseInt(opts.topK, 10) || 5);
    var optArr = !!opts.optimizeArrival;
    var startDate = (opts.startDate instanceof Date) ? opts.startDate : new Date(String(opts.startDate || '') + 'T00:00:00');
    if (isNaN(startDate.getTime())) startDate = new Date();
    function pad(n) { return String(n).padStart(2, '0'); }
    function ensureRoute() {
      // Persistent road-shape cache: reuse the saved shape across sessions; only
      // fetch from the Worker the first time, then save it.
      return tpAcquireRoute({ lat: O.lat, lng: O.lon }, { lat: Dst.lat, lng: Dst.lon }, tpGetWorkerUrl());
    }
    return ensureRoute().then(function (route) {
      return new Promise(function (resolve) {
        var matchRoute = (route && tpRouteMatches(route, { lat: O.lat, lng: O.lon }, { lat: Dst.lat, lng: Dst.lon })) ? route : null;
        var AVG_KMH = 72;   // straight-line fallback speed (same as tpPlan) when no road route is available
        var driveH = matchRoute ? (matchRoute.durationSec / 3600) : (tpHaversineKm(O.lat, O.lon, Dst.lat, Dst.lon) / AVG_KMH);
        var DAY_START_H = 5, DAY_END_H = 21;
        var candidates = [];
        _tpRotCache = {};   // memoise rotating charts across all candidates of this scan
        function finish() {
          _tpRotCache = null;
          candidates.sort(function (a, b) { return (b.score - a.score) || (a.depart_ms - b.depart_ms); });
          resolve({ origin: O, dest: Dst, driving_h: Math.round(driveH * 10) / 10,
            driving_min: Math.round(driveH * 60),
            km: matchRoute ? Math.round(matchRoute.distanceMeters / 1000) : null,
            real_route: !!matchRoute, optimize_arrival: optArr, days: days,
            total_evaluated: candidates.length, top: candidates.slice(0, topK) });
        }
        function processDay(di) {
          if (di >= days) { finish(); return; }
          var day = new Date(startDate.getTime() + di * 86400000);
          var dateStr = day.getFullYear() + '-' + pad(day.getMonth() + 1) + '-' + pad(day.getDate());
          var probe = null;
          try {
            probe = tpPlan({ depDate: new Date(dateStr + 'T05:00:00'), durationH: (DAY_END_H - DAY_START_H),
              origin: O, dest: Dst, utc: utc, dstOn: dstOn, snapDepart: true, stepMin: 30, stopMode: 'auto', route: matchRoute });
          } catch (e) {}
          if (probe && probe.slots) {
            var seen = {};
            probe.slots.forEach(function (slot) {
              var h = slot.wallStart.getHours();
              if (h < DAY_START_H || h > DAY_END_H) return;
              var depMs = slot.wallStart.getTime();
              if (seen[depMs]) return; seen[depMs] = 1;
              var r = null;
              try {
                r = tpPlan({ depDate: new Date(depMs), durationH: driveH, origin: O, dest: Dst,
                  utc: utc, dstOn: dstOn, snapDepart: false, stepMin: 30, stopMode: 'auto', route: matchRoute });
              } catch (e) {}
              if (!r || !r.slots || !r.slots.length) return;
              var sc = tpScoreItinerary(r, optArr);
              var depD = r.slots[0].wallStart, arrD = r.slots[r.slots.length - 1].wallEnd;
              candidates.push({
                date: dateStr, weekday: (typeof WD_IT !== 'undefined' && WD_IT) ? WD_IT[depD.getDay()] : '',
                depart: pad(depD.getHours()) + ':' + pad(depD.getMinutes()),
                arrive: pad(arrD.getHours()) + ':' + pad(arrD.getMinutes()),
                arrive_next_day: (arrD.getDate() !== depD.getDate()),
                depart_ms: depMs, score: sc.score, total_cash: sc.total_cash,
                cash_hours: sc.cash_hours, xkdg_hours: sc.xkdg_hours, xkdg_bonus: sc.xkdg_bonus, total_hours: sc.total_hours, arrival_score: sc.arrival_score
              });
            });
          }
          setTimeout(function () { processDay(di + 1); }, 0);   // yield to the UI between days
        }
        // Warm the per-hour XKDG/person cache over the whole search range so each
        // candidate's hours carry the graded lucky-date score (slot.hourScore).
        try {
          if (typeof runScanner === 'function') {
            var _ss = document.getElementById('scan-start'), _sd = document.getElementById('scan-days');
            var _ps = _ss ? _ss.value : null, _pd = _sd ? _sd.value : null;
            var _sy = startDate.getFullYear() + '-' + pad(startDate.getMonth() + 1) + '-' + pad(startDate.getDate());
            if (_ss) _ss.value = _sy; if (_sd) _sd.value = String(Math.min(days + 1, 32));
            runScanner();
            if (_ss && _ps != null) _ss.value = _ps; if (_sd && _pd != null) _sd.value = _pd;
          }
        } catch (e) {}
        processDay(0);
      });
    });
  }

  function tpOpenPrefilled(params) {
    params = params || {};
    window._tpGuideShown = true;                       // don't show the guide overlay when the AI opens it
    // Auto-run charging ONLY when a real range was given. Without it we must NOT charge
    // off the panel's default value (that silently assumed ~200 km) — the AI should ask.
    // Auto-run charging ONLY when a real range is known. The old test looked ONLY at
    // params.rangeKm — the value the MODEL passed — so a natural-language trip never
    // ran the charger search (and never showed the per-stop SoC targets) even when the
    // car's LIVE range sat right there in storage from the xkdg-soc worker. A fresh
    // live reading (same 2h freshness rule runChargerSearch itself applies) is a real
    // figure, not the panel's blind default the original guard was protecting against.
    var _wcRange = parseFloat(params.rangeKm);
    if (!(_wcRange > 0)) {
      try { var _wcLr = tpGetLiveRange(); if (_wcLr && _wcLr.km > 0 && (Date.now() - _wcLr.ts) < 2 * 3600000) _wcRange = _wcLr.km; } catch (e) {}
    }
    var wantCharge = (params.autoChargers !== false) && (_wcRange > 0);
    window._tpAutoChargers = wantCharge;               // auto-run "Find charging stops" after the plan
    window._tpChargerPending = wantCharge;             // hands-free navigation waits until this clears
    if (params.noSnap) window._tpNoSnap = true;                 // arrive-by: do NOT snap the departure (keep arrival exact)
    window._tpFromAI = true;                            // push the computed itinerary into the AI chat when done
    window._tpAutoDepart = !!params.autoDepart;          // no time given -> SCAN picks the most favourable (and earliest) departure
    tpOpen();
    window._tpNames = {
      origin: params.originName || (window._tpNames && window._tpNames.origin) || 'Origin',
      dest:   params.destName   || (window._tpNames && window._tpNames.dest)   || 'Destination'
    };
    var tries = 0;
    function fill() {
      var dateEl = document.getElementById('tp-date');
      if (!dateEl) { if (tries++ < 40) { setTimeout(fill, 100); } return; } // wait for panel (unlock / async build)
      function set(id, val) {
        if (val === undefined || val === null || val === '') return;
        var e = document.getElementById(id);
        if (e) e.value = String(val);
      }
      set('tp-olat', params.originLat); set('tp-olon', params.originLon);
      set('tp-dlat', params.destLat);   set('tp-dlon', params.destLon);
      set('tp-date', params.departDate); set('tp-time', params.departTime);
      // Auto-depart: leave a placeholder time so the SCAN can run; it will be
      // replaced by the best departure the planner picks (cache is warm there).
      if (window._tpAutoDepart) { var teEl = document.getElementById('tp-time'); if (teEl && !teEl.value) teEl.value = '12:00'; }
      set('tp-dur', params.durationH);   set('tp-utc', params.utc);
      var dstEl = document.getElementById('tp-dst'); if (dstEl && params.dst != null) dstEl.checked = !!params.dst;
      set('tp-range', params.rangeKm);   set('tp-reserve', params.reserveKm);
      set('tp-charges', params.charges); set('tp-worker', params.worker);
      var canRun = params.run !== false &&
        params.originLat != null && params.destLat != null &&
        document.getElementById('tp-date').value && document.getElementById('tp-time').value;
      if (canRun) { var b = document.getElementById('tp-scan'); if (b) b.click(); }
    }
    // The AI supplies coordinates "from its knowledge", which a small model can
    // get badly wrong for minor towns (it once placed Tuoro sul Trasimeno in
    // Sicily). Geocode the place NAMES (reliable) and use those coordinates,
    // keeping the supplied lat/lon only as a fallback. Sequential to be gentle
    // on the free geocoder.
    _tpResolvePlace(params.originName, params.originLat, params.originLon).then(function (o) {
      if (o) { params.originLat = o.lat; params.originLon = o.lon; }
      return _tpResolvePlace(params.destName, params.destLat, params.destLon);
    }).then(function (d) {
      if (d) { params.destLat = d.lat; params.destLon = d.lon; }
    }).catch(function () {}).then(function () { fill(); });
    return true;
  }

  // Search across departure DAYS for one where the resulting itinerary keeps
  // MORE THAN HALF its stops (cash + charging) inside a fortunate window (Edu,
  // session 23: "voglio che le tappe di ricarica stiano dentro un itinerario
  // fortunato... se quel giorno non ci riesce se ne trova un altro, altrimenti
  // mi dici che non ce ne sono"). Reuses the EXISTING single-day pipeline
  // unchanged (openPrefilled -> real SCAN -> Phase E dynamic reach -> Phase F
  // real chargers, all fixed earlier this session) once per candidate day —
  // deliberately NOT a rewrite of the chain-trip stop-placement logic, which
  // stays untouched. Coordinates only (no place names) to avoid re-geocoding
  // the same origin/destination on every candidate day.
  function tpFindLuckyDeparture(params, opts) {
    opts = opts || {};
    var maxDays = Math.max(1, Math.min(14, opts.maxDays || 5));
    var threshold = (opts.threshold != null) ? opts.threshold : 0.5;
    var startDate = opts.startDate || tpLocalISO(new Date());
    return new Promise(function (resolve) {
      var tried = [], day = 0;
      function tryDay() {
        var d = new Date(startDate + 'T00:00:00');
        d.setDate(d.getDate() + day);
        var dateStr = tpLocalISO(d);
        var stampBefore = (window._tpLastResult && window._tpLastResult.stamp) || 0;
        window._tpFromAI = false;   // this is a silent trial — only the FINAL pick posts a card
        tpOpenPrefilled({
          originLat: params.originLat, originLon: params.originLon,
          destLat: params.destLat, destLon: params.destLon,
          departDate: dateStr, autoDepart: true,
          utc: params.utc, dst: params.dst,
          rangeKm: opts.rangeKm, reserveKm: opts.reserveKm, run: true
        });
        var waited = 0;
        var poll = setInterval(function () {
          waited += 300;
          var r = window._tpLastResult;
          var fresh = r && r.stamp && r.stamp !== stampBefore;
          var settled = fresh && !window._tpChargerPending;
          if (settled || waited > 25000) {
            clearInterval(poll);
            var frac = (settled && r.lucky_fraction != null) ? r.lucky_fraction : null;
            tried.push({ date: dateStr, lucky_fraction: frac, lucky_stops: r ? r.lucky_stops : null,
              total_stops: r ? r.total_stops : null, timed_out: !settled });
            if (frac != null && frac >= threshold) {
              // Re-run this SAME winning day once more with _tpFromAI restored, so it
              // posts the real chat card — every earlier trial (including this one)
              // ran silently on purpose, so nothing posted yet.
              var winDate = dateStr;
              window._tpFromAI = true;
              var stampBeforeFinal = (window._tpLastResult && window._tpLastResult.stamp) || 0;
              tpOpenPrefilled({
                originLat: params.originLat, originLon: params.originLon,
                destLat: params.destLat, destLon: params.destLon,
                departDate: winDate, autoDepart: true,
                utc: params.utc, dst: params.dst,
                rangeKm: opts.rangeKm, reserveKm: opts.reserveKm, run: true
              });
              var waited2 = 0;
              var poll2 = setInterval(function () {
                waited2 += 300;
                var r2 = window._tpLastResult;
                var settled2 = r2 && r2.stamp && r2.stamp !== stampBeforeFinal && !window._tpChargerPending;
                if (settled2 || waited2 > 25000) {
                  clearInterval(poll2);
                  resolve({ ok: true, chosen_date: winDate, lucky_fraction: frac, days_tried: tried.length, tried: tried });
                }
              }, 300);
              return;
            }
            day++;
            if (day >= maxDays) {
              var ranked = tried.filter(function (t) { return t.lucky_fraction != null; })
                .sort(function (a, b) { return b.lucky_fraction - a.lucky_fraction; });
              var bestT = ranked[0] || null;
              if (!bestT) { resolve({ ok: false, best: null, days_tried: tried.length, tried: tried }); return; }
              // No day cleared the threshold — still surface the CLOSEST one as a real
              // card (re-run once more with _tpFromAI restored), so the user sees an
              // actual itinerary instead of only a verdict.
              window._tpFromAI = true;
              var stampBeforeBest = (window._tpLastResult && window._tpLastResult.stamp) || 0;
              tpOpenPrefilled({
                originLat: params.originLat, originLon: params.originLon,
                destLat: params.destLat, destLon: params.destLon,
                departDate: bestT.date, autoDepart: true,
                utc: params.utc, dst: params.dst,
                rangeKm: opts.rangeKm, reserveKm: opts.reserveKm, run: true
              });
              var waited3 = 0;
              var poll3 = setInterval(function () {
                waited3 += 300;
                var r3 = window._tpLastResult;
                var settled3 = r3 && r3.stamp && r3.stamp !== stampBeforeBest && !window._tpChargerPending;
                if (settled3 || waited3 > 25000) {
                  clearInterval(poll3);
                  resolve({ ok: false, best: bestT, days_tried: tried.length, tried: tried });
                }
              }, 300);
              return;
            }
            tryDay();
          }
        }, 300);
      }
      tryDay();
    });
  }

  /* ===== LIVE COMPASS: autonomous + predictive ============================ *
   * Works on its own (no trip needed). From a REFERENCE point it shows, live
   * from GPS:
   *   - the net bearing (deg) + 8-direction quadrant FROM the reference,
   *   - your real travel heading (derived from movement) + speed,
   *   - a PREDICTION of where on the map you will cross out of the current
   *     45 deg quadrant into the next one (point, distance, ETA, place name,
   *     and a "Maps" button to that exact spot),
   *   - and, IF a trip was computed, the favourable window active right now
   *     plus the spoken "about to leave the quadrant" alert (unchanged).
   *
   * REFERENCE priority:
   *   1) an autonomous origin set with "Here" (current GPS) or "From place"/AI
   *      (a named place, possibly already km behind you);
   *   2) else, if a trip is loaded, origin -> last passed stop (Auto) or origin;
   *   3) else nothing yet -> ask to tap "Here".
   * No Wake Lock: it recomputes on screen wake (visibilitychange) and via the
   * refresh button.
   * ----------------------------------------------------------------------- */
  var _cmpWatch = null;          // GPS watch id
  var _cmpPos = null;            // current fix {lat, lon, acc}
  var _cmpPrev = null;           // last fix kept for heading/speed {lat, lon, t}
  var _cmpHeading = null;        // travel heading in degrees (derived or GPS)
  var _cmpSpeedKmh = null;       // travel speed (km/h), null if unknown
  var _cmpOrigin = null;         // autonomous reference {lat, lon, name}; null -> trip-based
  // 🎯 DESTINATION (address → geocoded): shows the CONSTANT rhumb-line bearing to
  // follow from the CURRENT position, live. Persisted so it survives reloads in the car.
  var _cmpDest = null;           // {lat, lon, name} or null
  var _cmpDest2 = null;          // {lat, lon, name} or null — turn-wedge advisor target (session 23)
  // ── Draggable turn-wedges (session 24): two independent wedge sources, each with
  // its own dragged radius + handle. 'dest2' = where to STOP (wedgeDir); 'origin' =
  // favourable travel direction to head IN now/next (favDir). Octants are drawn
  // MAGNETIC (declination added at draw time) to match the rest of the direction
  // system. null radius = auto length (old behaviour).
  var _cmpWedgeLayer = null;     // shared Leaflet layer for all wedge polygons
  var _cmpWedgeState = {
    dest2:  { radiusKm: null, handle: null, dragging: false },
    origin: { radiusKm: null, handle: null, dragging: false },
    probe:  { radiusKm: null, handle: null, dragging: false },
    live:   { radiusKm: null, handle: null, dragging: false }
  };
  // Manual octant override (session 24): typing a bare compass token (N/NE/…/NW;
  // Italian O/NO/SO/NORD/SUD/EST/OVEST accepted) into a destination field draws a
  // single 45° wedge instead of geocoding a place.
  //   dest1 field → ORIGIN wedge, drawn AS TYPED (travel direction).
  //   dest2 field → the dest2 point's wedge, drawn OPPOSITE (favourable-from-there).
  var _cmpOriginManualDir = null;  // typed dir for the origin wedge (drawn direct)
  var _cmpDest2ManualDir  = null;  // typed dir for the dest2 wedge (drawn opposite)
  // Draggable endpoints (session 24): finger-move the origin (green) and the A->B
  // destination (red) markers directly on the map. Handles live on _cmpMap (not in
  // _cmpMapLayer) so a redraw never destroys them mid-drag.
  var _cmpEndHandle   = { origin: null, dest: null, probe: null };
  var _cmpEndDragging = { origin: false, dest: false, probe: false };
  // Octant-rose probe (session 24): tap the map to drop an independent point and see
  // the full 8-octant rose from there, each octant coloured favourable/not.
  var _cmpProbe = null;          // {lat, lon} or null
  var _cmpProbeMode = false;     // when true, a map tap places/moves the probe
  try { var _cmpDs = localStorage.getItem('xkdg_cmp_dest'); if (_cmpDs) _cmpDest = JSON.parse(_cmpDs); } catch (e) {}
  function cmpSaveDest() { try { if (_cmpDest) localStorage.setItem('xkdg_cmp_dest', JSON.stringify(_cmpDest)); else localStorage.removeItem('xkdg_cmp_dest'); } catch (e) {}
  }
  // Loxodromic (rhumb-line) bearing: the CONSTANT heading from A to B — the same
  // definition the flight Direction Calculator uses. On the web-mercator map a
  // straight line IS the rhumb line, so the dashed you→destination line below is
  // exactly this constant course drawn on the map.
  function tpRhumbBearing(lat1, lon1, lat2, lon2) {
    var f1 = lat1 * Math.PI / 180, f2 = lat2 * Math.PI / 180;
    var dL = (lon2 - lon1) * Math.PI / 180;
    if (Math.abs(dL) > Math.PI) dL = (dL > 0) ? (dL - 2 * Math.PI) : (dL + 2 * Math.PI);
    var dPsi = Math.log(Math.tan(Math.PI / 4 + f2 / 2) / Math.tan(Math.PI / 4 + f1 / 2));
    var th = Math.atan2(dL, dPsi) * 180 / Math.PI;
    var trueBearing = (th + 360) % 360;
    // MAGNETIC (session 23) — same root fix and same reasoning as tpBearing above.
    return (trueBearing - tpMagDeclination(lat1, lon1) + 360) % 360;
  }
  var _cmpPanelFull = false, _cmpPanelCss = null;   // whole-panel fullscreen (distinct from the map-only Expand)
  var _cmpExit = null;           // last predicted exit {lat, lon, fromQ, toQ, distKm, etaMin}
  var _cmpExitName = null;       // reverse-geocoded name of the predicted exit
  var _cmpExitNameAt = null;     // {lat, lon} the cached name was fetched for
  var _cmpExitNameTs = 0;        // last reverse-geocode time (ms) for throttling
  var _tpRefMode = 'auto', _tpCmpState = null;
  // ---- Leaflet map state (lazy-loaded from CDN; optional) ----
  var _cmpLeafletP = null;       // promise: resolves to window.L once loaded
  var _cmpMap = null;            // Leaflet map instance
  var _cmpMapLayer = null;       // layer group we clear+repaint each update
  var _cmpMapBig = false;        // expanded (near-fullscreen) state
  var _cmpMapFollow = true;      // auto-fit origin/you/exit (toggle off to pan freely)
  var _cmpMapFitted = false;     // have we framed the current scene yet
  var _cmpMapFailed = false;     // Leaflet could not load (offline) -> keep Maps button only
  function tpCmpVoiceOn() { try { return localStorage.getItem('xkdg_cmp_voice') !== '0'; } catch (e) { return true; } }   // default ON
  function tpCmpLang() {
    var s = null; try { s = localStorage.getItem('xkdg_ai_lang'); } catch (e) {}
    return (s === 'en' || s === 'fr' || s === 'it') ? s : 'it';   // default Italian for spoken alerts
  }
  var TP_DIR_WORD = {
    it: { N: 'Nord', NE: 'Nord-Est', E: 'Est', SE: 'Sud-Est', S: 'Sud', SW: 'Sud-Ovest', W: 'Ovest', NW: 'Nord-Ovest' },
    en: { N: 'North', NE: 'Northeast', E: 'East', SE: 'Southeast', S: 'South', SW: 'Southwest', W: 'West', NW: 'Northwest' },
    fr: { N: 'Nord', NE: 'Nord-Est', E: 'Est', SE: 'Sud-Est', S: 'Sud', SW: 'Sud-Ouest', W: 'Ouest', NW: 'Nord-Ouest' }
  };
  function tpSpeak(text) {
    try {
      if (!tpCmpVoiceOn() || !window.speechSynthesis) return;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = { it: 'it-IT', en: 'en-US', fr: 'fr-FR' }[tpCmpLang()];
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function tpCmpAlert(state, q) {
    var L = tpCmpLang(), name = TP_DIR_WORD[L][q] || q;
    if (state === 'edge') tpSpeak({ it: 'Stai per uscire dal quadrante ' + name + '. Valuta una sosta.',
      en: 'About to leave the ' + name + ' quadrant. Consider stopping.',
      fr: 'Vous allez quitter le quadrant ' + name + '. Pensez \u00e0 vous arr\u00eater.' }[L]);
    else if (state === 'left') tpSpeak({ it: 'Sei uscito dal quadrante ' + name + '.',
      en: 'You have left the ' + name + ' quadrant.',
      fr: 'Vous avez quitt\u00e9 le quadrant ' + name + '.' }[L]);
  }
  function tpQ8(deg) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8]; }

  /* ---- Leaflet: lazy-load from CDN once, on first map open --------------- */
  function cmpEnsureLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (_cmpLeafletP) return _cmpLeafletP;
    _cmpLeafletP = new Promise(function (res, rej) {
      try {
        if (!document.getElementById('tp-leaflet-css')) {
          var lk = document.createElement('link');
          lk.id = 'tp-leaflet-css'; lk.rel = 'stylesheet';
          lk.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(lk);
        }
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
        s.onload = function () { window.L ? res(window.L) : rej(new Error('Leaflet missing after load')); };
        s.onerror = function () { rej(new Error('Leaflet load failed')); };
        document.head.appendChild(s);
      } catch (e) { rej(e); }
    });
    return _cmpLeafletP;
  }
  // Destination point from `ref` at bearing `brgDeg` and `km` (equirectangular; fine at these scales).
  function cmpForward(ref, brgDeg, km) {
    var toR = Math.PI / 180, mLat = 111.320, mLon = 111.320 * Math.cos(ref.lat * toR);
    return { lat: ref.lat + (Math.cos(brgDeg * toR) * km) / mLat, lon: ref.lon + (Math.sin(brgDeg * toR) * km) / (mLon || 1e-6) };
  }
  // Build the current 45° quadrant pie-slice (from `ref`, centred on the bearing
  // to `pos`, spanning center±22.5) as an array of [lat,lon] points for a polygon.
  function cmpWedgePoints(ref, centerDeg, radiusKm) {
    var pts = [[ref.lat, ref.lon]];
    for (var a = -22.5; a <= 22.5 + 0.001; a += 4.5) {
      var p = cmpForward(ref, centerDeg + a, radiusKm);
      pts.push([p.lat, p.lon]);
    }
    pts.push([ref.lat, ref.lon]);
    return pts;
  }
  // Draw / refresh the map: origin, you, predicted exit, the 45° wedge, bearing line.
  function cmpRenderMap() {
    if (_cmpMapFailed) return;
    var host = document.getElementById('tp-cmp-map'); if (!host) return;
    var r = cmpResolveRef();
    // TURN-WEDGE (session 23): dest2 alone (no origin/dest1/trip) is still enough
    // to draw the wedges — don't bail out just because there's no "main" reference.
    if (!r && !(_cmpDest2 && _cmpPos)) return;
    var _abMode = !!(_cmpDest && isFinite(_cmpDest.lat) && isFinite(_cmpDest.lon));
    // Live-quadrant mode needs a GPS fix; A->B mode does NOT (it draws A and B only).
    if (!_abMode && !_cmpPos && !(r && _cmpDest2)) return;   // nothing to draw yet
    cmpEnsureLeaflet().then(function (L) {
      host = document.getElementById('tp-cmp-map'); if (!host) return;
      var ref = (r && r.ref) || { lat: _cmpPos.lat, lon: _cmpPos.lon };
      var initCenter = _abMode ? [ (ref.lat + _cmpDest.lat) / 2, (ref.lon + _cmpDest.lon) / 2 ]
                               : [ (_cmpPos || ref).lat, (_cmpPos || ref).lon ];
      if (!_cmpMap) {
        _cmpMap = L.map(host, { zoomControl: true, attributionControl: false, dragging: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_cmpMap);
        _cmpMap.setView(initCenter, 11);
        _cmpMapLayer = L.layerGroup().addTo(_cmpMap);
        // Tap-to-place the octant-rose probe (session 24). A Leaflet 'click' fires on
        // a tap, NOT on a pan/drag, so this never interferes with moving the map.
        _cmpMap.on('click', function (e) {
          if (!_cmpProbeMode || !e || !e.latlng) return;
          _cmpProbe = { lat: e.latlng.lat, lon: e.latlng.lng };
          try { cmpRenderMap(); tpCmpRender(); } catch (er) {}
        });
        setTimeout(function () { if (_cmpMap) _cmpMap.invalidateSize(); }, 60);
      }
      _cmpMapLayer.clearLayers();
      var pos = _cmpPos;
      var exit = _cmpExit;
      // Live wedge / rays / bearing-to-you line: ONLY in live-quadrant mode.
      if (!_abMode) {
        var bearDeg = tpBearing(ref.lat, ref.lon, pos.lat, pos.lon);
        var center = Math.round(bearDeg / 45) * 45;
        // MAGNETIC octant (declination added). interactive:false so a tap goes THROUGH
        // to the map (otherwise the polygon eats the tap and the probe never drops).
        var mcenter = center + tpMagDeclination(ref.lat, ref.lon);
        var distKm = tpHaversineKm(ref.lat, ref.lon, pos.lat, pos.lon);
        var lst = _cmpWedgeState.live;
        var autoR = Math.max(distKm, exit ? tpHaversineKm(ref.lat, ref.lon, exit.lat, exit.lon) : 0, 2) * 1.15;
        var lRadiusKm = (lst.radiusKm != null) ? lst.radiusKm : autoR;   // dragged value overrides
        L.polygon(cmpWedgePoints(ref, mcenter, lRadiusKm), { color: '#1565c0', weight: 1, fillColor: '#1565c0', fillOpacity: 0.12, interactive: false }).addTo(_cmpMapLayer);
        L.polyline([[ref.lat, ref.lon], [cmpForward(ref, mcenter - 22.5, lRadiusKm).lat, cmpForward(ref, mcenter - 22.5, lRadiusKm).lon]], { color: '#1565c0', weight: 1.5, opacity: 0.6, dashArray: '4,4', interactive: false }).addTo(_cmpMapLayer);
        L.polyline([[ref.lat, ref.lon], [cmpForward(ref, mcenter + 22.5, lRadiusKm).lat, cmpForward(ref, mcenter + 22.5, lRadiusKm).lon]], { color: '#1565c0', weight: 1.5, opacity: 0.6, dashArray: '4,4', interactive: false }).addTo(_cmpMapLayer);
        L.polyline([[ref.lat, ref.lon], [pos.lat, pos.lon]], { color: '#888', weight: 1.5, opacity: 0.8, interactive: false }).addTo(_cmpMapLayer);
        // Extend handle for the quadrant (blue dot on its tip).
        var lTip = cmpForward(ref, mcenter, lRadiusKm);
        if (!lst.handle) {
          var licon = L.divIcon({ className: '', html: '<div style="width:20px;height:20px;border-radius:50%;background:#1565c0;border:3px solid #fff;box-shadow:0 0 0 2px #1565c0,0 1px 4px rgba(0,0,0,.4);cursor:grab;"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
          lst.handle = L.marker([lTip.lat, lTip.lon], { draggable: true, icon: licon, zIndexOffset: 1000, keyboard: false }).addTo(_cmpMap);
          lst.handle.on('drag', function (e) { cmpWedgeHandleDrag('live', e); });
          lst.handle.on('dragend', function (e) { cmpWedgeHandleDrag('live', e); });
          lst.handle.on('dblclick', function () { lst.radiusKm = null; lst.dragging = false; cmpRenderMap(); });
          lst.handle.bindTooltip('', { permanent: false, direction: 'top', offset: [0, -12] });
        } else if (!lst.dragging) {
          lst.handle.setLatLng([lTip.lat, lTip.lon]);
        }
        lst.handle.setTooltipContent('\u2194\ufe0f ' + Math.round(lRadiusKm) + ' km \u00b7 quadrant \u00b7 drag to extend \u00b7 double-tap = auto');
      } else if (_cmpWedgeState.live.handle) {
        try { _cmpMap.removeLayer(_cmpWedgeState.live.handle); } catch (e) {}
        _cmpWedgeState.live.handle = null;
      }
      // Origin marker.
      L.circleMarker([ref.lat, ref.lon], { radius: 6, color: '#0b8043', weight: 2, fillColor: '#0b8043', fillOpacity: 1 }).addTo(_cmpMapLayer).bindTooltip('Origin', { permanent: false });

      // ═══ PLANNED-TRIP OVERLAY (Edu, session 23): the itinerary the AI/planner
      // computed (window._tpLive, published by tpStoreLastResult) drawn ON the live
      // compass map — follow the plan and check the directions in one screen.
      // Fresh within 24h; ignored otherwise (yesterday's trip must not haunt today).
      try {
        var _lv = window._tpLive;
        if (_lv && _lv.stamp && (Date.now() - _lv.stamp) < 24 * 3600000 && _lv.stops) {
          var _routePts = [[_lv.originPos.lat, _lv.originPos.lon]];
          _lv.stops.forEach(function (st, si) {
            _routePts.push([st.lat, st.lon]);
            var isCh = !!st.charge;
            var letter = String.fromCharCode(65 + si);   // A, B, C… same lettering as the chat card
            var hhmm = st.atMs ? (function (d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })(new Date(st.atMs)) : '';
            L.circleMarker([st.lat, st.lon], {
              radius: 7, weight: 2,
              color: isCh ? '#ad1457' : '#1565c0',
              fillColor: isCh ? '#f8bbd0' : '#bbdefb', fillOpacity: 1
            }).addTo(_cmpMapLayer)
              .bindTooltip((isCh ? '\u26a1 ' : '') + letter + (hhmm ? ' \u00b7 ' + hhmm : ''), { permanent: true, direction: 'top', offset: [0, -8], opacity: 0.9 });
          });
          _routePts.push([_lv.destPos.lat, _lv.destPos.lon]);
          L.polyline(_routePts, { color: '#1565c0', weight: 3, opacity: 0.55, dashArray: '7 6' }).addTo(_cmpMapLayer);
          L.circleMarker([_lv.destPos.lat, _lv.destPos.lon], { radius: 7, color: '#b00', weight: 2, fillColor: '#e53935', fillOpacity: 1 })
            .addTo(_cmpMapLayer).bindTooltip('\ud83c\udfc1 ' + (_lv.destName || 'Arrival'), { permanent: false });
        }
      } catch (eTrip) {}

      // ═══ TURN-WEDGE ADVISOR (Edu, session 23) ═══ — from the sea today: "la
      // direzione positiva era N, mi sono spinto avanti fino al punto dove il
      // quadrante NW che parte da casa intersecava la mia strada." Draws the
      // wedge(s) radiating OUT of the 2nd destination: arrive anywhere in a
      // shaded wedge and that point sits in a FAVOURABLE direction from there,
      // now (orange) or at the next hour change (green).
      // Turn-wedge advisor now lives in its own layer + draggable handle so it can
      // be stretched with a finger (session 24). See cmpDrawWedges() below.
      try { cmpDrawWedges(); } catch (eWedge) {}
      try { cmpDrawDragPoints(); } catch (eDrag) {}
      // In A->B mode (a destination is set) the user's own GPS position is IRRELEVANT
      // — the trip is between two typed points. Show the live "You" marker + exit wedge
      // ONLY in live-quadrant mode (no destination), otherwise a stray red dot hundreds
      // of km away just clutters the map. (_abMode is defined at the top of this fn.)
      if (!_abMode) {
        // You.
        L.circleMarker([pos.lat, pos.lon], { radius: 6, color: '#b00', weight: 2, fillColor: '#e53935', fillOpacity: 1 }).addTo(_cmpMapLayer).bindTooltip('You', { permanent: false });
        // Predicted exit point.
        if (exit) {
          L.marker([exit.lat, exit.lon]).addTo(_cmpMapLayer)
            .bindTooltip('Exit ' + exit.fromQ + '→' + exit.toQ + ' · ' + (exit.distKm < 10 ? exit.distKm.toFixed(1) : Math.round(exit.distKm)) + ' km', { permanent: false });
        }
      }
      // 🎯 Destination = RED endpoint (arrival colour) with the constant course
      // drawn A -> B (a straight segment on the web-mercator map IS the rhumb line).
      if (_abMode) {
        L.circleMarker([_cmpDest.lat, _cmpDest.lon], { radius: 7, color: '#b00', weight: 2, fillColor: '#e53935', fillOpacity: 1 })
          .addTo(_cmpMapLayer).bindTooltip('\ud83c\udfaf ' + (_cmpDest.name || 'Destination'), { permanent: true });
        L.polyline([[ref.lat, ref.lon], [_cmpDest.lat, _cmpDest.lon]], { color: '#7b1fa2', weight: 3, opacity: 0.9 }).addTo(_cmpMapLayer);   // constant course ORIGIN -> DEST
      }
      // Frame the scene (only while following, and only once per scene change).
      if (_cmpMapFollow && !_cmpMapFitted) {
        var b;
        if (_abMode) {                       // A->B: frame ONLY origin + destination
          b = L.latLngBounds([[ref.lat, ref.lon], [_cmpDest.lat, _cmpDest.lon]]);
        } else {
          b = L.latLngBounds([[ref.lat, ref.lon], [pos.lat, pos.lon]]);
          if (exit) b.extend([exit.lat, exit.lon]);
        }
        try { _cmpMap.fitBounds(b, { padding: [24, 24], maxZoom: 14, animate: false }); } catch (e) {}
        _cmpMapFitted = true;
      } else if (_cmpMapFollow && !_abMode) {
        // keep you in view without changing zoom abruptly (live mode only)
        var b2 = L.latLngBounds([[ref.lat, ref.lon], [pos.lat, pos.lon]]);
        if (exit) b2.extend([exit.lat, exit.lon]);
        if (!_cmpMap.getBounds().contains([pos.lat, pos.lon])) {
          try { _cmpMap.fitBounds(b2, { padding: [24, 24], maxZoom: 14, animate: false }); } catch (e) {}
        }
      }
    }).catch(function () {
      _cmpMapFailed = true;
      var wrap = document.getElementById('tp-cmp-map-wrap');
      if (wrap) wrap.innerHTML = '<div style="font-size:11px;color:#888;padding:8px;text-align:center;">Map needs internet — use the 🔍 Maps button for the exit point.</div>';
    });
  }
  // Expand the map to (near) fullscreen, or collapse it back.
  // Refresh the drive-view strip (direction + countdown) over the big map.
  // Called from tpCmpRender on every GPS tick and from the minute ticker, so
  // both numbers stay live in either mode.
  function cmpUpdateBigStrip(degRounded, quadrant, lon, color) {
    try {
      var strip = document.getElementById('tp-cmp-big-strip');
      if (!strip || !_cmpMapBig) return;
      strip.innerHTML =
        '<span style="font-size:46px;font-weight:800;line-height:1;color:' + (color || '#1565c0') + ';">' + degRounded + '\u00b0</span>' +
        ' <span style="font-size:26px;font-weight:700;vertical-align:6px;">' + quadrant + '</span>' +
        '<div id="tp-cmp-big-hour" data-lon="' + lon + '" style="font-size:16px;line-height:1.25;margin-top:1px;">' + tpCmpHourInner(lon) + '</div>';
    } catch (e) {}
  }
  function cmpSetMapBig(big) {
    _cmpMapBig = !!big; _cmpMapFitted = false;
    var small = document.getElementById('tp-cmp-map-wrap');
    var host = document.getElementById('tp-cmp-map');
    var btn = document.getElementById('tp-cmp-expand');
    if (!host) return;
    if (_cmpMapBig) {
      var big2 = document.getElementById('tp-cmp-map-big');
      if (!big2) {
        big2 = el('div', { id: 'tp-cmp-map-big', style: 'position:fixed;inset:0;z-index:100000;background:#fff;display:flex;flex-direction:column;' });
        var bar = el('div', { style: 'display:flex;align-items:center;gap:8px;background:#1565c0;color:#fff;padding:9px 12px;font-size:14px;font-weight:700;' });
        bar.appendChild(el('div', { style: 'flex:1;' }, '\ud83d\ude97 Drive view'));
        // 🧭 Octant-rose probe toggle — available IN drive view (this is where Edu
        // actually is while driving). ON = yellow; then a tap on the map drops a rose.
        var probeB = el('button', { id: 'tp-cmp-big-probe', type: 'button', style: 'background:' + (_cmpProbeMode ? '#ffd54f' : 'rgba(255,255,255,.2)') + ';color:' + (_cmpProbeMode ? '#333' : '#fff') + ';border:0;border-radius:6px;padding:5px 10px;font-size:13px;font-weight:700;cursor:pointer;' }, _cmpProbeMode ? '\ud83e\udded TAP MAP' : '\ud83e\udded Rose');
        var foll = el('button', { id: 'tp-cmp-big-follow', type: 'button', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:5px 10px;font-size:13px;cursor:pointer;' }, _cmpMapFollow ? '📍 Follow: on' : '📍 Follow: off');
        var mapsB = el('button', { type: 'button', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:5px 10px;font-size:13px;cursor:pointer;' }, '🔍 Maps');
        var close = el('button', { type: 'button', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:5px 12px;font-size:14px;cursor:pointer;' }, '✕ Close');
        probeB.addEventListener('click', function () {
          _cmpProbeMode = !_cmpProbeMode;
          if (!_cmpProbeMode) _cmpProbe = null;
          probeB.style.background = _cmpProbeMode ? '#ffd54f' : 'rgba(255,255,255,.2)';
          probeB.style.color = _cmpProbeMode ? '#333' : '#fff';
          probeB.textContent = _cmpProbeMode ? '\ud83e\udded TAP MAP' : '\ud83e\udded Rose';
          var pb = document.getElementById('tp-cmp-probe');
          if (pb) { pb.style.background = _cmpProbeMode ? '#ffd54f' : 'rgba(255,255,255,.2)'; pb.style.color = _cmpProbeMode ? '#333' : '#fff'; }
          try { cmpRenderMap(); } catch (e) {}
        });
        foll.addEventListener('click', function () { _cmpMapFollow = !_cmpMapFollow; _cmpMapFitted = false; foll.textContent = _cmpMapFollow ? '📍 Follow: on' : '📍 Follow: off'; cmpRenderMap(); });
        mapsB.addEventListener('click', function () { if (_cmpExit) tpOpenPoint(_cmpExit.lat, _cmpExit.lon); });
        close.addEventListener('click', function () { cmpSetMapBig(false); });
        bar.appendChild(probeB); bar.appendChild(foll); bar.appendChild(mapsB); bar.appendChild(close);
        big2.appendChild(bar);
        var holder = el('div', { id: 'tp-cmp-map-bigholder', style: 'flex:1;min-height:0;position:relative;' });
        // DRIVE STRIP (Edu, session 23): direction + hour countdown floating over the
        // near-fullscreen map — the only two numbers that must stay readable while
        // everything else is out of the way. pointer-events:none: the map underneath
        // stays fully pannable/zoomable straight through it.
        holder.appendChild(el('div', { id: 'tp-cmp-big-strip', style: 'position:absolute;top:0;left:0;right:0;z-index:1000;pointer-events:none;text-align:center;background:rgba(255,255,255,.85);padding:4px 8px 6px;border-bottom:1px solid rgba(0,0,0,.08);' }));
        big2.appendChild(holder);
        document.body.appendChild(big2);
      }
      document.getElementById('tp-cmp-map-bigholder').appendChild(host);   // move the SAME map element
      host.style.height = '100%';
      big2.style.display = 'flex';
      if (btn) btn.textContent = '⛶';
    } else {
      var big3 = document.getElementById('tp-cmp-map-big');
      if (big3) big3.style.display = 'none';
      if (small) small.appendChild(host);   // move it back into the small panel
      host.style.height = '48vh'; host.style.minHeight = '300px';   // matches the (session 23) enlarged panel map
      if (btn) btn.textContent = '⛶ Expand';
    }
    setTimeout(function () { if (_cmpMap) { _cmpMap.invalidateSize(); cmpRenderMap(); } }, 80);
  }

  // Resolve the reference point to measure FROM. Returns { ref:{lat,lon}, label } or null.
  function cmpResolveRef() {
    if (_cmpOrigin) return { ref: { lat: _cmpOrigin.lat, lon: _cmpOrigin.lon }, label: _cmpOrigin.name ? ('from ' + _cmpOrigin.name) : 'from set start' };
    var live = window._tpLive;
    if (live && live.originPos) {
      var ref = live.originPos, label = 'from trip start';
      if (_tpRefMode !== 'origin' && _cmpPos && live.stops && live.stops.length && live.destPos) {
        var myToDest = tpHaversineKm(_cmpPos.lat, _cmpPos.lon, live.destPos.lat, live.destPos.lon), best = null;
        live.stops.forEach(function (s) {
          var sToDest = tpHaversineKm(s.lat, s.lon, live.destPos.lat, live.destPos.lon);
          if (sToDest > myToDest || tpHaversineKm(_cmpPos.lat, _cmpPos.lon, s.lat, s.lon) < 3) best = s;
        });
        if (best) { ref = { lat: best.lat, lon: best.lon }; label = 'from last stop'; }
      }
      return { ref: { lat: ref.lat, lon: ref.lon }, label: label };
    }
    // No explicit origin, no computed trip — but a destination IS set and GPS is
    // available (Edu, session 23: "la direzione fra dove mi trovo e una città,
    // dovrebbe essere ovvio"). Use the LIVE fix as the reference, continuously —
    // NOT a one-time snapshot like 📍 Here — so it keeps following the car as it
    // moves, rather than needing an explicit setup step first.
    if (_cmpDest && _cmpPos) return { ref: { lat: _cmpPos.lat, lon: _cmpPos.lon }, label: 'from here (live)' };
    return null;
  }

  // Predict where the current 45 deg quadrant (measured from `ref`) is crossed,
  // travelling from `pos` along `headingDeg`. Local equirectangular projection
  // centred on `ref` (fine for tens of km). Returns the nearest crossing AHEAD.
  function cmpPredictExit(ref, pos, headingDeg) {
    if (ref == null || pos == null || headingDeg == null || !isFinite(headingDeg)) return null;
    var toR = Math.PI / 180;
    var mLat = 111320, mLon = 111320 * Math.cos(ref.lat * toR);
    if (!isFinite(mLon) || Math.abs(mLon) < 1) return null;
    var Px = (pos.lon - ref.lon) * mLon, Py = (pos.lat - ref.lat) * mLat;
    if (Math.hypot(Px, Py) < 50) return null;   // too close to the reference: bearing unstable
    var ux = Math.sin(headingDeg * toR), uy = Math.cos(headingDeg * toR);
    var curBear = (Math.atan2(Px, Py) / toR + 360) % 360;
    var center = Math.round(curBear / 45) * 45;
    var best = null;
    [1, -1].forEach(function (side) {
      var theta = ((center + side * 22.5) % 360 + 360) % 360;
      var vx = Math.sin(theta * toR), vy = Math.cos(theta * toR);
      var denom = ux * vy - uy * vx;
      if (Math.abs(denom) < 1e-9) return;                 // travelling parallel to the boundary
      var d = (Py * vx - Px * vy) / denom;                // metres ahead along travel
      if (!(d > 1)) return;                               // boundary is behind you
      var Qx = Px + d * ux, Qy = Py + d * uy;
      var t = Math.abs(vx) > Math.abs(vy) ? Qx / vx : Qy / vy;   // distance from ref along the boundary ray
      if (!(t > 0)) return;                               // crossing is on the wrong side of the origin
      if (!best || d < best.dM) {
        best = {
          dM: d,
          lat: ref.lat + Qy / mLat, lon: ref.lon + Qx / mLon,
          fromQ: tpQ8(center), toQ: tpQ8(center + side * 45)
        };
      }
    });
    if (!best) return null;
    var distKm = best.dM / 1000;
    var etaMin = (_cmpSpeedKmh && _cmpSpeedKmh > 3) ? (distKm / _cmpSpeedKmh * 60) : null;
    return { lat: best.lat, lon: best.lon, fromQ: best.fromQ, toQ: best.toQ, distKm: distKm, etaMin: etaMin };
  }

  // Lazily reverse-geocode the predicted exit (throttled; only when it moved enough).
  function cmpUpdateExitName(exit) {
    if (!exit) { _cmpExitName = null; _cmpExitNameAt = null; return; }
    var moved = !_cmpExitNameAt || tpHaversineKm(_cmpExitNameAt.lat, _cmpExitNameAt.lon, exit.lat, exit.lon) > 3;
    var now = Date.now();
    if (!moved || (now - _cmpExitNameTs) < 15000) return;
    _cmpExitNameTs = now; _cmpExitNameAt = { lat: exit.lat, lon: exit.lon };
    tpReverseGeocode(exit.lat, exit.lon)
      .then(function (name) { if (name) { _cmpExitName = name; tpCmpRender(); } })
      .catch(function () {});
  }

  function cmpFmtEta(min) {
    if (min == null) return '';
    if (min < 1) return '<1 min';
    if (min < 90) return Math.round(min) + ' min';
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return h + 'h' + (m ? ' ' + m + 'm' : '');
  }

  /* ⏳ 时辰 COUNTDOWN (additive) ==========================================
   * Minutes until the current Chinese double-hour (时辰) rolls over, measured on
   * the SAME compensated TRUE SOLAR TIME the rest of the app uses (longitude eq.
   * of time + UTC + DST, via tpOffsetMin). 时辰 boundaries fall on the ODD solar
   * hours (…23:00, 01:00, 03:00…); each 时辰 lasts 120 min. UTC/DST are derived
   * from the device timezone so this also works with a "bare" compass (no trip).
   * Everything here is self-contained and never throws. --------------------- */
  // ══════════════════════════════════════════════════════════════════════
  //  TURN-WEDGE ADVISOR (Edu, session 23) — the technique he described from
  //  the sea today: the direct hour was unfavourable (NE), so he drove a
  //  favourable direction instead (N) far enough that, once the NEW hour
  //  started, home would sit in a favourable octant (SE) from wherever he'd
  //  be. He worked this out "by eye" mid-drive; this computes it.
  //
  //  Geometry: if the driver stands somewhere in octant X *from home*, then
  //  home sits in octant opposite(X) *from the driver* (NW-of-home <=>
  //  home-is-SE-from-there). So to arrive somewhere that puts home in a
  //  FAVOURABLE octant F, the wedge to aim for is opposite(F), drawn radiating
  //  OUT of home — exactly "il quadrante NW che parte dalla casa" in Edu's
  //  own words. Uses the SAME rotating-chart favourability tpScanDirs already
  //  computes everywhere else in this file — no new rule, just a new use.
  // ══════════════════════════════════════════════════════════════════════
  function tpTurnWedgeAdvice(home, lon) {
    if (!home || lon == null || !isFinite(lon)) return [];
    var now = Date.now();
    var y = new Date(now).getFullYear();
    var utc = -Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset()) / 60;
    var dstOn = tpDstActiveOn(new Date(now));
    var c = tpCmpHourCountdown(lon);
    if (!c) return [];
    var windows = [
      { label: 'now', ms: now, minsLeft: c.minsLeft },
      { label: 'next', ms: (now + (c.minsLeft + 1) * 60000), minsLeft: null }
    ];
    var seen = {}, byWin = { now: [], next: [] };
    windows.forEach(function (win) {
      var hp = tpFullHourAt(win.ms, lon, utc, dstOn);
      if (!hp) return;
      var dirs = tpScanDirs(hp.Y, hp.M, hp.D, hp.gan, hp.zhi, null, false);
      dirs.forEach(function (d) {
        if (!d.eval || !d.eval.ok) return;                     // only favourable octants
        var favIdx = TP_DIR_ORDER.indexOf(d.dir);
        var wedgeIdx = (favIdx + 4) % 8;                        // opposite octant = where to STAND
        var wedgeDir = TP_DIR_ORDER[wedgeIdx];
        var key = win.label + '|' + wedgeDir;
        if (seen[key]) return; seen[key] = true;
        byWin[win.label].push({
          when: win.label, minsLeft: win.minsLeft,
          hourHan: hp.zhi, favDir: d.dir, wedgeDir: wedgeDir,
          door: d.eval.door || null, score: d.eval.score || 0
        });
      });
    });
    // Cap to the best TWO per window (Edu: "oppure anche solo uno o due") — highest
    // score first; a tie keeps the one closer to the current heading if given.
    var out = [];
    ['now', 'next'].forEach(function (w) {
      byWin[w].sort(function (a, b) { return b.score - a.score; });
      out = out.concat(byWin[w].slice(0, 2));
    });
    return out;
  }
  // Pie-slice polygon for one octant, radiating OUT of a centre point — the
  // wedge itself (45° wide, centred on wedgeDir), for drawing on the map.
  function tpWedgePolygon(center, wedgeDir, radiusKm) {
    var centerDeg = TP_DIR_DEG[wedgeDir];
    if (centerDeg == null) return null;
    var pts = [[center.lat, center.lon]];
    for (var a = centerDeg - 22.5; a <= centerDeg + 22.5 + 0.01; a += 5) {
      var p = tpDestPoint(center, ((a % 360) + 360) % 360, radiusKm);
      pts.push([p.lat, p.lon]);
    }
    pts.push([center.lat, center.lon]);
    return pts;
  }

  // ═══ DRAGGABLE TURN-WEDGES (session 24) ═══════════════════════════════
  // Two wedge sources, each in _cmpWedgeLayer with its own draggable handle:
  //   • dest2  — orange/green — where to STOP (opposite octant, wedgeDir).
  //   • origin — blue/teal   — favourable travel direction to head IN (favDir).
  // Drag a handle to extend/shrink that source's wedges and sight the exact point
  // where the origin's travel wedge crosses the dest2 stop wedge (or a road).
  // Octants are drawn MAGNETIC (declination added). Double-tap a handle = auto length.
  // Parse a bare compass token → canonical dir (N/NE/E/SE/S/SW/W/NW), else null.
  // English + Italian aliases; ignores spaces/dots and case.
  function tpParseOctant(text) {
    if (!text) return null;
    var t = String(text).trim().toUpperCase().replace(/[\s.]/g, '');
    var map = {
      N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SW', W: 'W', NW: 'NW',
      O: 'W', NO: 'NW', SO: 'SW',                       // Italian: Ovest, Nord-Ovest, Sud-Ovest
      NORD: 'N', SUD: 'S', EST: 'E', OVEST: 'W'
    };
    return map[t] || null;
  }
  function tpOppositeDir(dir) {
    var i = TP_DIR_ORDER.indexOf(dir);
    return i < 0 ? null : TP_DIR_ORDER[(i + 4) % 8];
  }
  // Pie-slice polygon around an ALREADY-magnetic centre bearing (degrees), radiating
  // out of `center`. Kept separate from tpWedgePolygon so the declination is applied
  // once, at the call site, not baked into the octant table.
  function cmpWedgePolyAtBearing(center, centerDeg, radiusKm) {
    var pts = [[center.lat, center.lon]];
    for (var a = centerDeg - 22.5; a <= centerDeg + 22.5 + 0.01; a += 5) {
      var p = tpDestPoint(center, ((a % 360) + 360) % 360, radiusKm);
      pts.push([p.lat, p.lon]);
    }
    pts.push([center.lat, center.lon]);
    return pts;
  }

  // Resolve the current centre point for a wedge source ('dest2' or 'origin').
  function cmpWedgeCenter(key) {
    if (key === 'dest2') return _cmpDest2;
    if (key === 'probe') return _cmpProbe;
    try { var r = cmpResolveRef(); return (r && r.ref && isFinite(r.ref.lat)) ? r.ref : null; } catch (e) { return null; }
  }

  // Draw / refresh both wedge sources. Called from cmpRenderMap and after every drag.
  function cmpDrawWedges() {
    if (!_cmpMap) return;
    if (!_cmpWedgeLayer) _cmpWedgeLayer = L.layerGroup().addTo(_cmpMap);
    _cmpWedgeLayer.clearLayers();
    // dest2 = where to STOP (opposite octant). origin = favourable travel direction.
    cmpDrawWedgeSet('dest2', {
      dirKey: 'wedgeDir', now: '#e65100', next: '#2e7d32', fillNow: '#ffb74d', fillNext: '#81c784',
      apex: '#6a1b9a', apexFill: '#ce93d8', drawApex: true, tag: 'stop-wedge', verb: 'stop here'
    });
    // Origin wedges show in turn-wedge mode (a 2nd destination set) OR when a manual
    // origin direction was typed — otherwise they'd clutter plain A->B navigation.
    if (_cmpDest2 || _cmpOriginManualDir) {
      cmpDrawWedgeSet('origin', {
        dirKey: 'favDir', now: '#1565c0', next: '#00838f', fillNow: '#90caf9', fillNext: '#80deea',
        apex: '#0b8043', apexFill: '#a5d6a7', drawApex: false, tag: 'go-wedge', verb: 'head this way'
      });
    } else if (_cmpWedgeState.origin.handle) {
      try { _cmpMap.removeLayer(_cmpWedgeState.origin.handle); } catch (e) {}
      _cmpWedgeState.origin.handle = null;
    }
    // Octant-rose probe (independent tap point), drawn into the same (cleared) layer.
    try { cmpDrawProbeRose(); } catch (eRose) {}
  }

  // Draw one wedge source into _cmpWedgeLayer + manage its draggable handle.
  // Octants are rotated by the local magnetic declination so they match the compass.
  function cmpDrawWedgeSet(key, pal) {
    var st = _cmpWedgeState[key];
    var center = cmpWedgeCenter(key);
    if (!center || !isFinite(center.lat) || !isFinite(center.lon)) {
      if (st.handle) { try { _cmpMap.removeLayer(st.handle); } catch (e) {} st.handle = null; }
      return;
    }
    var decl = tpMagDeclination(center.lat, center.lon);   // true = magnetic + declination
    var autoR = Math.max(8, Math.min(60, (_cmpPos ? tpHaversineKm(_cmpPos.lat, _cmpPos.lon, center.lat, center.lon) : 25) * 0.35));
    var radiusKm = (st.radiusKm != null) ? st.radiusKm : autoR;

    // Build the octant list to draw: a MANUAL typed direction wins (single 45°
    // wedge), else the chart's auto favourable wedges. In manual mode BOTH sources
    // draw the typed direction AS-IS — you type where each sector should point, i.e.
    // toward the crossing (origin points your travel way, dest2 points back at it).
    var manualDir = (key === 'origin') ? _cmpOriginManualDir : _cmpDest2ManualDir;
    var items;
    if (manualDir) {
      items = [{ dir: manualDir, isNow: true, manual: true, typed: manualDir }];
    } else {
      items = tpTurnWedgeAdvice(center, center.lon).map(function (a) {
        return { dir: a[pal.dirKey], isNow: (a.when === 'now'), hourHan: a.hourHan, favDir: a.favDir, minsLeft: a.minsLeft };
      });
    }

    items.forEach(function (it) {
      var baseDeg = TP_DIR_DEG[it.dir];
      if (baseDeg == null) return;
      var centerDeg = ((baseDeg + decl) % 360 + 360) % 360;   // MAGNETIC octant
      var isNow = it.isNow;
      L.polygon(cmpWedgePolyAtBearing(center, centerDeg, radiusKm), {
        color: isNow ? pal.now : pal.next, weight: 2,
        fillColor: isNow ? pal.fillNow : pal.fillNext, fillOpacity: 0.28, interactive: false
      }).addTo(_cmpWedgeLayer)
        .bindTooltip(
          it.manual
            ? '\ud83d\udccd manual: sector points ' + it.dir + (key === 'dest2' ? ' \u00b7 toward crossing' : '')
            : (isNow ? '\u23f1\ufe0f now' : '\u23e9 next hour') + ' \u00b7 ' + it.hourHan + ': ' + pal.verb +
              (key === 'dest2'
                ? ' \u2192 ' + (center.name || '2nd dest') + ' becomes ' + it.favDir
                : ' (' + it.favDir + ' favourable)') +
              (it.minsLeft != null ? ' (' + it.minsLeft + ' min left)' : ''),
          { sticky: true }
        );
      // Faint dashed bisector out to the tip — easier to sight a crossing along a road.
      var mid = tpDestPoint(center, centerDeg, radiusKm);
      L.polyline([[center.lat, center.lon], [mid.lat, mid.lon]],
        { color: isNow ? pal.now : pal.next, weight: 1, opacity: 0.5, dashArray: '4,5', interactive: false }).addTo(_cmpWedgeLayer);
    });

    // Apex marker (dest2 only — the origin already has its green 'Origin' dot).
    if (pal.drawApex) {
      L.circleMarker([center.lat, center.lon], { radius: 8, color: pal.apex, weight: 2, fillColor: pal.apexFill, fillOpacity: 1 })
        .addTo(_cmpWedgeLayer).bindTooltip('\ud83c\udfe0 ' + (center.name || '2nd destination'), { permanent: false });
    }

    // Draggable handle (one per source). Lives on the map, not in _cmpWedgeLayer, so
    // a redraw never destroys it mid-drag. Placed on the FIRST wedge's magnetic tip.
    if (items.length) {
      var b0 = TP_DIR_DEG[items[0].dir];
      var hDeg = ((((b0 == null ? 90 : b0) + decl) % 360) + 360) % 360;
      var tip = tpDestPoint(center, hDeg, radiusKm);
      if (!st.handle) {
        var icon = L.divIcon({
          className: '',
          html: '<div style="width:20px;height:20px;border-radius:50%;background:' + pal.apex + ';border:3px solid #fff;box-shadow:0 0 0 2px ' + pal.apex + ',0 1px 4px rgba(0,0,0,.4);cursor:grab;"></div>',
          iconSize: [20, 20], iconAnchor: [10, 10]
        });
        st.handle = L.marker([tip.lat, tip.lon], { draggable: true, icon: icon, zIndexOffset: 1000, keyboard: false }).addTo(_cmpMap);
        st.handle.on('drag', function (e) { cmpWedgeHandleDrag(key, e); });
        st.handle.on('dragend', function (e) { cmpWedgeHandleDrag(key, e); });
        st.handle.on('dblclick', function () { st.radiusKm = null; st.dragging = false; cmpDrawWedges(); });
        st.handle.bindTooltip('', { permanent: false, direction: 'top', offset: [0, -12] });
      } else if (!st.dragging) {
        st.handle.setLatLng([tip.lat, tip.lon]);   // reposition only when the finger isn't holding it
      }
      st.handle.setTooltipContent('\u2194\ufe0f ' + Math.round(radiusKm) + ' km \u00b7 ' + pal.tag + ' \u00b7 drag to extend \u00b7 double-tap = auto');
    } else if (st.handle) {
      try { _cmpMap.removeLayer(st.handle); } catch (e) {}
      st.handle = null;
    }
  }

  // Turn a handle's dragged position into a new radius for its source and redraw.
  // During the drag the finger owns the handle, so cmpDrawWedgeSet must NOT move it
  // (guarded by st.dragging).
  function cmpWedgeHandleDrag(key, e) {
    var st = _cmpWedgeState[key];
    var center = cmpWedgeCenter(key);
    if (!center || !st.handle) return;
    var ll = st.handle.getLatLng();   // Leaflet latlng uses .lng (not .lon)
    var d = tpHaversineKm(center.lat, center.lon, ll.lat, ll.lng);
    st.radiusKm = Math.max(1, Math.min(400, d));   // clamp 1–400 km
    st.dragging = (e && e.type === 'drag');         // true while dragging, false on dragend
    if (key === 'live') { try { cmpRenderMap(); } catch (err) {} }
    else { try { cmpDrawWedges(); } catch (err) {} }
  }

  // ═══ DRAGGABLE ENDPOINTS (session 24) ═════════════════════════════════
  // Finger-move the ORIGIN (green) and the A->B DESTINATION (red) on the map.
  // Dragging the origin pins it as an explicit origin at the dropped spot (so the
  // origin wedge follows). Handles live on _cmpMap so a redraw won't kill them.
  function cmpDrawDragPoints() {
    if (!_cmpMap) return;
    var r = null; try { r = cmpResolveRef(); } catch (e) {}
    var oPt = (r && r.ref && isFinite(r.ref.lat)) ? r.ref : null;
    cmpEnsureEndHandle('origin', oPt, '#0b8043', function (lat, lon) {
      _cmpOrigin = { lat: lat, lon: lon, name: (_cmpOrigin && _cmpOrigin.name) || null };
    });
    var dPt = (_cmpDest && isFinite(_cmpDest.lat)) ? _cmpDest : null;
    cmpEnsureEndHandle('dest', dPt, '#e53935', function (lat, lon) {
      _cmpDest = { lat: lat, lon: lon, name: (_cmpDest && _cmpDest.name) || null };
      cmpSaveDest();
    });
  }

  function cmpEnsureEndHandle(key, pt, color, onMove) {
    var h = _cmpEndHandle[key];
    if (!pt) {
      if (h) { try { _cmpMap.removeLayer(h); } catch (e) {} _cmpEndHandle[key] = null; }
      return;
    }
    if (!h) {
      var icon = L.divIcon({
        className: '',
        html: '<div style="width:26px;height:26px;border-radius:50%;border:3px solid ' + color + ';background:rgba(255,255,255,.25);box-shadow:0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.4);cursor:grab;"></div>',
        iconSize: [26, 26], iconAnchor: [13, 13]
      });
      h = L.marker([pt.lat, pt.lon], { draggable: true, icon: icon, zIndexOffset: 1100, keyboard: false }).addTo(_cmpMap);
      h.bindTooltip(key === 'origin' ? 'Drag to move origin' : 'Drag to move destination', { permanent: false, direction: 'top', offset: [0, -14] });
      h.on('drag', function () {
        _cmpEndDragging[key] = true;
        var ll = h.getLatLng();
        onMove(ll.lat, ll.lng);            // Leaflet latlng uses .lng
        try { cmpRenderMap(); } catch (e) {}
      });
      h.on('dragend', function () {
        _cmpEndDragging[key] = false;
        var ll = h.getLatLng();
        onMove(ll.lat, ll.lng);
        try { cmpRenderMap(); tpCmpRender(); } catch (e) {}
      });
      _cmpEndHandle[key] = h;
    } else if (!_cmpEndDragging[key]) {
      h.setLatLng([pt.lat, pt.lon]);        // reposition only when the finger isn't holding it
    }
  }

  // ═══ OCTANT-ROSE PROBE (session 24) ═══════════════════════════════════
  // Favourability of ALL 8 octants at the probe point, for the current TST hour.
  function cmpProbeOctants() {
    if (!_cmpProbe) return [];
    try {
      var now = Date.now();
      var y = new Date(now).getFullYear();
      var utc = -Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset()) / 60;
      var dstOn = tpDstActiveOn(new Date(now));
      var hp = tpFullHourAt(now, _cmpProbe.lon, utc, dstOn);   // TST hour pillar at the probe
      if (!hp) return [];
      var dirs = tpScanDirs(hp.Y, hp.M, hp.D, hp.gan, hp.zhi, null, false);
      return dirs.map(function (d) { return { dir: d.dir, ok: !!(d.eval && d.eval.ok), score: (d.eval && d.eval.score) || 0 }; });
    } catch (e) { return []; }
  }

  // Draw the full 8-octant rose from the probe, each octant coloured favourable/not.
  // Octants are MAGNETIC (declination added). Radius scales to the current view so
  // the rose stays visible at any zoom. Drawn into _cmpWedgeLayer (cleared by
  // cmpDrawWedges); the probe centre is a draggable handle on the map.
  function cmpDrawProbeRose() {
    if (!_cmpMap) return;
    var pst = _cmpWedgeState.probe;
    if (!_cmpProbeMode || !_cmpProbe || !isFinite(_cmpProbe.lat)) {
      cmpEnsureEndHandle('probe', null, '#5e35b1', function () {});
      if (pst.handle) { try { _cmpMap.removeLayer(pst.handle); } catch (e) {} pst.handle = null; }
      return;
    }
    if (!_cmpWedgeLayer) _cmpWedgeLayer = L.layerGroup().addTo(_cmpMap);
    var c = _cmpProbe;
    var decl = tpMagDeclination(c.lat, c.lon);
    // Auto radius scales to the view; a dragged value (pst.radiusKm) overrides it.
    var autoR = 30;
    try {
      var b = _cmpMap.getBounds();
      var diagKm = tpHaversineKm(b.getSouth(), b.getWest(), b.getNorth(), b.getEast());
      if (isFinite(diagKm) && diagKm > 0) autoR = Math.max(3, diagKm * 0.22);
    } catch (e) {}
    var radiusKm = (pst.radiusKm != null) ? pst.radiusKm : autoR;
    var okByDir = {};
    cmpProbeOctants().forEach(function (o) { okByDir[o.dir] = o.ok; });
    TP_DIR_ORDER.forEach(function (dir) {
      var centerDeg = ((TP_DIR_DEG[dir] + decl) % 360 + 360) % 360;   // magnetic
      var ok = !!okByDir[dir];
      L.polygon(cmpWedgePolyAtBearing(c, centerDeg, radiusKm), {
        color: ok ? '#2e7d32' : '#9e9e9e', weight: ok ? 2 : 1,
        fillColor: ok ? '#66bb6a' : '#bdbdbd', fillOpacity: ok ? 0.32 : 0.12, interactive: false
      }).addTo(_cmpWedgeLayer)
        .bindTooltip((ok ? '\u2705 ' : '\u2014 ') + dir + (ok ? ' favourable' : ' not favourable'), { sticky: true });
    });
    // Probe centre — draggable to MOVE the whole rose (hollow indigo ring).
    cmpEnsureEndHandle('probe', c, '#5e35b1', function (lat, lon) { _cmpProbe = { lat: lat, lon: lon }; });
    // Radius handle — drag to EXTEND all 8 octants (solid indigo dot on the N rim).
    var rimDeg = ((TP_DIR_DEG['N'] + decl) % 360 + 360) % 360;
    var tip = tpDestPoint(c, rimDeg, radiusKm);
    if (!pst.handle) {
      var icon = L.divIcon({
        className: '',
        html: '<div style="width:20px;height:20px;border-radius:50%;background:#5e35b1;border:3px solid #fff;box-shadow:0 0 0 2px #5e35b1,0 1px 4px rgba(0,0,0,.4);cursor:grab;"></div>',
        iconSize: [20, 20], iconAnchor: [10, 10]
      });
      pst.handle = L.marker([tip.lat, tip.lon], { draggable: true, icon: icon, zIndexOffset: 1050, keyboard: false }).addTo(_cmpMap);
      pst.handle.on('drag', function (e) { cmpWedgeHandleDrag('probe', e); });
      pst.handle.on('dragend', function (e) { cmpWedgeHandleDrag('probe', e); });
      pst.handle.on('dblclick', function () { pst.radiusKm = null; pst.dragging = false; cmpDrawWedges(); });
      pst.handle.bindTooltip('', { permanent: false, direction: 'top', offset: [0, -12] });
    } else if (!pst.dragging) {
      pst.handle.setLatLng([tip.lat, tip.lon]);
    }
    pst.handle.setTooltipContent('\u2194\ufe0f ' + Math.round(radiusKm) + ' km \u00b7 rose \u00b7 drag to extend \u00b7 double-tap = auto');
  }

  function tpCmpHourCountdown(lon) {
    try {
      if (lon == null || !isFinite(lon)) return null;
      var now = Date.now();
      var y = new Date(now).getFullYear();
      // Standard-time UTC offset in hours (DST handled separately by tpOffsetMin).
      var utcStd = -Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset()) / 60;
      var dstOn = tpDstActiveOn(new Date(now));
      var off = tpOffsetMin(lon, utcStd, dstOn, now);            // wall-clock -> true solar, minutes
      var solarMs = now + off * 60000;
      var sd = new Date(solarMs);
      var H = sd.getHours();
      var nextOdd = (H % 2 === 0) ? (H + 1) : (H + 2);           // next ODD solar hour (23/01/03…)
      var boundarySolarMs = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate(), nextOdd, 0, 0, 0).getTime();
      var boundaryWallMs = boundarySolarMs - off * 60000;        // back to wall-clock
      var minsLeft = Math.max(0, Math.round((boundaryWallMs - now) / 60000));
      var cur = tpChineseHourAt(now, lon, utcStd, dstOn);
      var nxt = tpChineseHourAt(boundaryWallMs + 60000, lon, utcStd, dstOn);   // 1 min into the next 时辰
      return { minsLeft: minsLeft, cur: cur, next: nxt, tst: cur ? cur.tst : null };
    } catch (e) { return null; }
  }
  // Inner HTML (text only) for the countdown line — regenerated live by the ticker.
  function tpCmpHourInner(lon) {
    try {
      var c = tpCmpHourCountdown(lon);
      if (!c || !c.cur) return '';
      var curLbl = c.cur.han + (c.cur.py ? ' ' + c.cur.py : '');
      var nextLbl = c.next ? (c.next.han + (c.next.py ? ' ' + c.next.py : '')) : '';
      var m = c.minsLeft, urgent = m <= 15;
      return '<span style="' + (urgent ? 'color:#b00;font-weight:700;' : 'color:#7b1fa2;') + '">' +
        '\u23f3 ' + curLbl + ' \u00b7 hour change in <b style="font-size:34px;vertical-align:-2px;">' + m + ' min</b>' +
        (nextLbl ? ' \u2192 ' + nextLbl : '') +
        (c.tst ? ' <span style="color:#999;font-weight:400;font-size:14px;">(TST ' + c.tst + ')</span>' : '') +
        '</span>';
    } catch (e) { return ''; }
  }
  // Full countdown block (wrapper + inner). Carries data-lon so the ticker can
  // refresh it in place without a full re-render. Returns '' if unavailable.
  function tpCmpHourCountdownHtml(lon) {
    try {
      var inner = tpCmpHourInner(lon);
      if (!inner) return '';
      // Driving-readable (Edu, session 23): this line was font-size:12px — unreadable
      // at a glance behind the wheel. The countdown is THE number that decides when
      // to stop, so it gets a big block of its own; tpCmpHourInner makes the minutes
      // themselves even larger.
      return '<div id="tp-cmp-hour" data-lon="' + lon + '" style="font-size:22px;line-height:1.3;margin-top:8px;text-align:center;">' + inner + '</div>';
    } catch (e) { return ''; }
  }
  // Light ticker: once a minute-ish, refresh the countdown text in place so it
  // counts down even when the car is stopped (no GPS movement -> no re-render).
  var _cmpHourTimer = null;
  function tpCmpEnsureHourTimer() {
    try {
      if (_cmpHourTimer != null) return;
      _cmpHourTimer = setInterval(function () {
        try {
          var host = document.getElementById('tp-cmp-hour');
          if (host) {
            var lon = parseFloat(host.getAttribute('data-lon'));
            if (isFinite(lon)) host.innerHTML = tpCmpHourInner(lon);
          }
          // Drive-view strip over the big map (session 23): same in-place refresh
          var strip = document.getElementById('tp-cmp-big-hour');
          if (strip) {
            var lon2 = parseFloat(strip.getAttribute('data-lon'));
            if (isFinite(lon2)) strip.innerHTML = tpCmpHourInner(lon2);
          }
        } catch (e) {}
      }, 15000);
    } catch (e) {}
  }
  tpCmpEnsureHourTimer();

  function tpCmpRender() {
    var box = document.getElementById('tp-cmp-body'); if (!box) return;
    var r = cmpResolveRef();
    if (!r) {
      // TURN-WEDGE (session 23): dest2 alone still has something real to show —
      // don't reduce it to the generic "Tap Here" placeholder.
      if (_cmpDest2 && _cmpPos) {
        var _adviceOnly = tpTurnWedgeAdvice(_cmpDest2, _cmpDest2.lon);
        var _pickOnly = _adviceOnly.filter(function (a) { return a.when === 'now'; })[0] || _adviceOnly[0];
        box.innerHTML = '<div style="color:#888;font-size:12px;margin-bottom:6px;">No origin/destination set \u2014 showing the turn-wedge advisor only.</div>' +
          (_pickOnly
            ? '<div style="font-size:15px;font-weight:700;color:#6a1b9a;">\ud83c\udfe0 ' + (_cmpDest2.name || '2nd dest') + ': stop in the <b>' + _pickOnly.wedgeDir + '</b> wedge \u2192 becomes ' +
              '<b>' + _pickOnly.favDir + '</b> (' + (_pickOnly.when === 'now' ? 'now, ' + _pickOnly.minsLeft + ' min left' : 'next hour, ' + _pickOnly.hourHan) + ')</div>'
            : '<div style="font-size:13px;color:#888;">No favourable wedge found in the current or next hour.</div>');
        return;
      }
      box.innerHTML = '<div style="color:#888;font-size:13px;">Tap <b>📍 Here</b> to use this spot as the origin, or type origin (and optional 🎯 destination) below and press <b>\u25b6 Go</b>. No destination = live quadrant mode; with a destination = constant course origin \u2192 destination.</div>'; return;
    }
    var ref = r.ref, refLabel = r.label;
    var _abMode = !!(_cmpDest && isFinite(_cmpDest.lat) && isFinite(_cmpDest.lon));

    // A->B MODE: the answer is the CONSTANT course from origin A to destination B.
    // The user's GPS is irrelevant here, so this works with no location fix at all.
    if (_abMode) {
      var rb = tpRhumbBearing(ref.lat, ref.lon, _cmpDest.lat, _cmpDest.lon);
      var rdKm = tpHaversineKm(ref.lat, ref.lon, _cmpDest.lat, _cmpDest.lon);
      cmpUpdateBigStrip(Math.round(rb), tpQ8(rb), ref.lon, '#7b1fa2');   // drive strip over the big map (session 23)
      var abHtml = '<div style="font-size:64px;font-weight:800;line-height:1;color:#7b1fa2;">' + Math.round(rb) + '°</div>' +
        '<div style="font-size:30px;font-weight:700;margin-top:2px;">' + tpQ8(rb) + '</div>' +
        '<div style="font-size:12px;color:#666;margin-top:4px;">constant course \u00b7 ' + (rdKm < 10 ? rdKm.toFixed(1) : Math.round(rdKm)) + ' km</div>' +
        tpCmpHourCountdownHtml(ref.lon) +
        '<div style="margin-top:8px;padding-top:7px;border-top:1px solid #eee;font-size:12px;text-align:left;color:#555;line-height:1.5;">' +
        '<b style="color:#0b8043;">A</b> ' + (_cmpOrigin && _cmpOrigin.name ? _cmpOrigin.name : 'origin') + '<br>' +
        '<b style="color:#b00;">B</b> ' + (_cmpDest.name || 'destination') + '</div>';
      // If a live heading happens to be available, still show the steer delta.
      if (_cmpHeading != null && isFinite(_cmpHeading)) {
        var dH = ((rb - _cmpHeading + 540) % 360) - 180, aH = Math.abs(Math.round(dH));
        abHtml += '<div style="font-size:12px;margin-top:4px;text-align:left;' + (aH <= 8 ? 'color:#1b6e2f;' : 'color:#b58900;') + '">' +
          (aH <= 8 ? '\u2713 On course (\u0394 ' + aH + '\u00b0)' : 'Steer ' + (dH > 0 ? 'RIGHT' : 'LEFT') + ' ~' + aH + '\u00b0') + '</div>';
      }
      box.innerHTML = abHtml;
      return;
    }

    // LIVE-QUADRANT MODE (no destination): needs a GPS fix.
    if (!_cmpPos) { box.innerHTML = '<div style="color:#888;font-size:13px;">Waiting for GPS… allow location and tap ↻.</div>'; return; }
    var pos = _cmpPos;
    var deg = tpBearing(ref.lat, ref.lon, pos.lat, pos.lon), q = tpQ8(deg);
    var distKm = tpHaversineKm(ref.lat, ref.lon, pos.lat, pos.lon);
    cmpUpdateBigStrip(Math.round(deg), q, pos.lon, '#1565c0');   // drive strip over the big map (session 23)

    var html = '<div style="font-size:64px;font-weight:800;line-height:1;color:#1565c0;">' + Math.round(deg) + '°</div>' +
      '<div style="font-size:30px;font-weight:700;margin-top:2px;">' + q + '</div>' +
      '<div style="font-size:12px;color:#666;margin-top:4px;">' + refLabel + ' · ' + (distKm < 10 ? distKm.toFixed(1) : Math.round(distKm)) + ' km</div>' +
      tpCmpHourCountdownHtml(pos.lon);
    // NEXT PLANNED STOP (Edu, session 23): tie the AI itinerary to the live drive.
    // "Next" = the not-yet-reached stop (>1.5 km away) with the earliest planned
    // time no more than 30 min in the past — times drift while driving, so a stop
    // whose clock has slipped a little is still "next", but one you are parked at
    // (or long past) is not.
    try {
      var _lvN = window._tpLive;
      if (_lvN && _lvN.stamp && (Date.now() - _lvN.stamp) < 24 * 3600000 && _lvN.stops && _lvN.stops.length) {
        var _nowMs = Date.now(), _next = null, _nextIdx = -1;
        for (var ni = 0; ni < _lvN.stops.length; ni++) {
          var stN = _lvN.stops[ni];
          if (stN.atMs && stN.atMs < _nowMs - 30 * 60000) continue;
          if (tpHaversineKm(pos.lat, pos.lon, stN.lat, stN.lon) < 1.5) continue;
          _next = stN; _nextIdx = ni; break;
        }
        if (_next) {
          var _dN = tpHaversineKm(pos.lat, pos.lon, _next.lat, _next.lon);
          var _tN = _next.atMs ? new Date(_next.atMs) : null;
          var _hhN = _tN ? (String(_tN.getHours()).padStart(2, '0') + ':' + String(_tN.getMinutes()).padStart(2, '0')) : '';
          html += '<div style="font-size:18px;font-weight:700;margin-top:6px;color:' + (_next.charge ? '#ad1457' : '#1565c0') + ';">' +
            (_next.charge ? '\u26a1 ' : '\ud83d\udccd ') + 'Next: ' + String.fromCharCode(65 + _nextIdx) +
            ' \u00b7 <b style="font-size:24px;">' + (_dN < 10 ? _dN.toFixed(1) : Math.round(_dN)) + ' km</b>' +
            (_hhN ? ' \u00b7 ' + _hhN : '') + '</div>';
        }
      }
    } catch (eNext) {}
    // TURN-WEDGE summary line (Edu, session 23) — the top pick in text, so it's
    // readable without looking at the map at all.
    try {
      if (_cmpDest2) {
        var _adviceTxt = tpTurnWedgeAdvice(_cmpDest2, _cmpDest2.lon);
        var _bestNow = _adviceTxt.filter(function (a) { return a.when === 'now'; })[0];
        var _bestNext = _adviceTxt.filter(function (a) { return a.when === 'next'; })[0];
        var _pick = _bestNow || _bestNext;
        if (_pick) {
          html += '<div style="font-size:15px;font-weight:700;margin-top:6px;color:#6a1b9a;">' +
            '\ud83c\udfe0 ' + (_cmpDest2.name || '2nd dest') + ': stop in the <b>' + _pick.wedgeDir + '</b> wedge \u2192 becomes ' +
            '<b>' + _pick.favDir + '</b> (' + (_pick.when === 'now' ? 'now, ' + _pick.minsLeft + ' min left' : 'next hour, ' + _pick.hourHan) + ')' +
            '</div>';
        }
      }
    } catch (eWedgeTxt) {}
    if (distKm < 1) html += '<div style="font-size:12px;color:#b58900;margin-top:4px;">Too close to the reference for a stable bearing — drive a bit.</div>';

    // Travel heading (your real direction of march).
    html += '<div style="margin-top:8px;padding-top:7px;border-top:1px solid #eee;font-size:13px;text-align:left;">';
    if (_cmpHeading != null && isFinite(_cmpHeading)) {
      html += 'Heading: <b>' + Math.round(_cmpHeading) + '° ' + tpQ8(_cmpHeading) + '</b>' +
        (_cmpSpeedKmh ? ' · ' + Math.round(_cmpSpeedKmh) + ' km/h' : '');
    } else {
      html += '<span style="color:#888;">Move a little so I can read your travel direction…</span>';
    }
    html += '</div>';

    // (A->B constant course is rendered at the top with an early return; nothing else
    // to add here for the destination.)

    // PREDICTION: where you cross out of the current quadrant.
    var exit = cmpPredictExit(ref, pos, _cmpHeading);
    _cmpExit = exit;
    if (exit) {
      cmpUpdateExitName(exit);
      var placeTxt = (_cmpExitName && _cmpExitNameAt && tpHaversineKm(_cmpExitNameAt.lat, _cmpExitNameAt.lon, exit.lat, exit.lon) < 5) ? (' · near ' + _cmpExitName) : '';
      var etaTxt = exit.etaMin != null ? (' · ~' + cmpFmtEta(exit.etaMin)) : '';
      html += '<div style="margin-top:8px;padding-top:7px;border-top:1px solid #eee;font-size:13px;text-align:left;">' +
        '🚩 Exit <b>' + exit.fromQ + '</b> → <b>' + exit.toQ + '</b> in <b>' +
        (exit.distKm < 10 ? exit.distKm.toFixed(1) : Math.round(exit.distKm)) + ' km</b>' + etaTxt + placeTxt +
        ' <button id="tp-cmp-exit-maps" type="button" style="margin-left:4px;background:#1565c0;color:#fff;border:0;border-radius:6px;padding:2px 8px;font-size:12px;cursor:pointer;">🔍 Maps</button>' +
        '</div>';
    } else if (_cmpHeading != null && isFinite(_cmpHeading)) {
      html += '<div style="margin-top:8px;padding-top:7px;border-top:1px solid #eee;font-size:12px;color:#888;text-align:left;">No quadrant exit ahead on this heading (you are heading toward / along the origin).</div>';
    }

    // Favourable window now (only if a trip was computed) + spoken alert.
    var live = window._tpLive;
    var now = Date.now(), slot = null;
    if (live) (live.favSlots || []).forEach(function (s) { if (now >= s.startMs && now < s.endMs) slot = s; });
    if (slot) {
      var diff = tpAngDiff(deg, slot.deg), inSec = diff <= 22.5, margin = Math.round(22.5 - diff);
      var qTarget = tpQ8(slot.deg);
      var state = !inSec ? 'left' : (diff >= 17 ? 'edge' : 'inside');
      var stateKey = slot.startMs + ':' + state;
      if (state !== 'inside' && stateKey !== _tpCmpState) tpCmpAlert(state, qTarget);
      _tpCmpState = (state === 'inside') ? (slot.startMs + ':inside') : stateKey;
      html += '<div style="margin-top:8px;padding-top:7px;border-top:1px solid #eee;font-size:13px;text-align:left;">';
      html += 'Favourable now: <b>' + qTarget + '</b> (' + slot.dir + (slot.ganzhi ? ' · ' + slot.ganzhi : '') + ')';
      if (!inSec) html += '<div style="color:#b00;font-weight:700;font-size:14px;margin-top:3px;">\u26a0 You have LEFT the ' + qTarget + ' quadrant.</div>';
      else if (diff >= 17) html += '<div style="color:#b58900;font-weight:700;font-size:14px;margin-top:3px;">\u26a0 About to leave ' + qTarget + ' (~' + margin + '\u00b0 margin) — consider stopping to cash it.</div>';
      else html += '<div style="color:#1b6e2f;font-size:13px;margin-top:3px;">\u2713 Inside ' + qTarget + ' (~' + margin + '\u00b0 to the edge).</div>';
      html += '</div>';
    } else if (live) {
      _tpCmpState = null;
      html += '<div style="margin-top:8px;padding-top:7px;border-top:1px solid #eee;font-size:13px;text-align:left;">No favourable window now. Overall trip: <b>' + live.overallDir + '</b> ' + live.overallBearing + '\u00b0.</div>';
    }

    box.innerHTML = html;
    var mapsBtn = document.getElementById('tp-cmp-exit-maps');
    if (mapsBtn) mapsBtn.addEventListener('click', function () { if (_cmpExit) tpOpenPoint(_cmpExit.lat, _cmpExit.lon); });
    cmpRenderMap();
  }

  // Take one GPS fix, update position + derive heading/speed, then render.
  function cmpAcceptFix(p) {
    var pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
    var tNow = (p.timestamp || Date.now());
    if (_cmpPrev) {
      var dKm = tpHaversineKm(_cmpPrev.lat, _cmpPrev.lon, pos.lat, pos.lon);
      if (dKm >= 0.02) {                                   // moved >= 20 m: trust this leg for heading
        _cmpHeading = tpBearing(_cmpPrev.lat, _cmpPrev.lon, pos.lat, pos.lon);
        var dtH = (tNow - _cmpPrev.t) / 3600000;
        _cmpSpeedKmh = (dtH > 0) ? (dKm / dtH) : _cmpSpeedKmh;
        _cmpPrev = { lat: pos.lat, lon: pos.lon, t: tNow };
      }
    } else {
      _cmpPrev = { lat: pos.lat, lon: pos.lon, t: tNow };
    }
    // Fall back to the device's own heading/speed if we have no movement-derived one yet.
    // GeolocationCoordinates.heading is defined (W3C spec) relative to TRUE north —
    // same magnetic correction as tpBearing above, so it agrees with everything else.
    if ((_cmpHeading == null || !isFinite(_cmpHeading)) && p.coords.heading != null && isFinite(p.coords.heading)) {
      _cmpHeading = (p.coords.heading - tpMagDeclination(pos.lat, pos.lon) + 360) % 360;
      if (p.coords.speed != null && isFinite(p.coords.speed)) _cmpSpeedKmh = p.coords.speed * 3.6;
    }
    _cmpPos = pos;
    tpCmpRender();
  }

  function tpCmpRefreshOnce() {
    if (!navigator.geolocation) { var b = document.getElementById('tp-cmp-body'); if (b) b.innerHTML = '<div style="color:#b00;font-size:13px;">No geolocation on this device.</div>'; return; }
    navigator.geolocation.getCurrentPosition(
      function (p) { cmpAcceptFix(p); },
      function () {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }
  function tpCmpStart() {
    if (!navigator.geolocation || _cmpWatch != null) return;
    _cmpWatch = navigator.geolocation.watchPosition(
      function (p) { cmpAcceptFix(p); },
      function (err) { var b = document.getElementById('tp-cmp-body'); if (b && !_cmpPos) b.innerHTML = '<div style="color:#b00;font-size:13px;">GPS error: ' + (err && err.message) + '. Allow location and tap ↻.</div>'; },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
  }
  function tpCmpStop() { if (_cmpWatch != null) { try { navigator.geolocation.clearWatch(_cmpWatch); } catch (e) {} _cmpWatch = null; } }

  // Set the autonomous origin to the current GPS spot.
  function tpCmpSetOriginHere() {
    var lbl = document.getElementById('tp-cmp-ref-label');
    if (!navigator.geolocation) { if (lbl) lbl.textContent = 'No GPS.'; return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      _cmpOrigin = { lat: p.coords.latitude, lon: p.coords.longitude, name: null };
      _cmpPrev = null; _cmpHeading = null; _cmpSpeedKmh = null; _cmpExitName = null; _cmpExitNameAt = null; _cmpMapFitted = false;
      tpReverseGeocode(_cmpOrigin.lat, _cmpOrigin.lon).then(function (n) { if (n && _cmpOrigin) { _cmpOrigin.name = n; tpCmpRender(); cmpUpdateRefLabel(); } }).catch(function () {});
      cmpAcceptFix(p); cmpUpdateRefLabel();
    }, function () { if (lbl) lbl.textContent = 'GPS denied.'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }
  // Set the autonomous origin to a named place (geocoded). Returns a Promise.
  function tpCmpSetOriginFrom(name) {
    if (!name || !String(name).trim()) return Promise.resolve(null);
    return tpCmpGeocodeSmart(String(name).trim()).then(function (g) {
      if (!g) return null;
      _cmpOrigin = { lat: g.lat, lon: g.lon, name: String(name).trim() };
      _cmpPrev = null; _cmpHeading = null; _cmpSpeedKmh = null; _cmpExitName = null; _cmpExitNameAt = null; _cmpMapFitted = false;
      cmpUpdateRefLabel(); tpCmpRender(); tpCmpRefreshOnce();
      return { lat: g.lat, lon: g.lon, name: _cmpOrigin.name };
    });
  }
  function tpCmpClearOrigin() { _cmpOrigin = null; _cmpExitName = null; _cmpExitNameAt = null; _cmpMapFitted = false; cmpUpdateRefLabel(); tpCmpRender(); }
  // SMART geocoding for the compass fields. Nominatim (used by _tpResolvePlace) is
  // strict: Italian compound house numbers ("31/1") and BUSINESS names ("Studio
  // Anemos") routinely fail. Cascade:
  //   1) the query as typed (Nominatim);
  //   2) compound house number normalised "31/1" -> "31";
  //   3) house number dropped entirely (street + town still pin the right spot);
  //   4) the xkdg-places worker (Google Places) near the current GPS (<=50 km box):
  //      resolves businesses and odd addresses that OSM does not know.
  // Resolves to {lat, lon, name} or null. Sequential (gentle on Nominatim).
  function tpCmpPlacesLookup(q, center) {
    try {
      var base = tpPlacesWorkerUrl(); if (!base) return Promise.resolve(null);
      // Search center: an EXPLICIT center (near the destination city) wins; only if none
      // was resolved do we fall back to the current GPS. This is the fix for a business
      // far from here ("Studio Anemos, Garda" while standing 287 km away in Tuoro): the
      // worker restricts results to ~50 km around the point it is given, so it must be
      // given the destination's area, not mine.
      var c = center || _cmpPos || ((window._lastGpsLat != null && window._lastGpsLng != null) ? { lat: window._lastGpsLat, lon: window._lastGpsLng } : null);
      if (!c) return Promise.resolve(null);
      var k = tpPlacesAccessKey();
      var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
        'q=' + encodeURIComponent(q) + '&lat=' + c.lat + '&lon=' + c.lon +
        '&radius=50000&max=3' + (k ? '&k=' + encodeURIComponent(k) : '');
      return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || j.status !== 'ok' || !j.results || !j.results.length) return null;
        var b = j.results[0];
        return (b && isFinite(b.lat) && isFinite(b.lon)) ? { lat: b.lat, lon: b.lon, name: b.name || q } : null;
      }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function tpCmpGeocodeSmart(raw) {
    var q = String(raw || '').trim();
    if (!q) return Promise.resolve(null);
    // GOOGLE GEOCODING first: the worker's ?mode=geocode endpoint uses Google's
    // Geocoding API — the same engine Google Maps uses for street addresses, so
    // "Via degli Alpini 31/1, 37010 Castion Veronese VR" resolves exactly. This is
    // far stronger than OSM/Nominatim for Italian addresses; Nominatim + Places stay
    // as fallbacks below for when the worker URL isn't set or Google finds nothing.
    function google(qq) {
      try {
        var base = tpPlacesWorkerUrl(); if (!base || !qq || !qq.trim()) return Promise.resolve(null);
        var k = tpPlacesAccessKey();
        var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
          'mode=geocode&address=' + encodeURIComponent(qq.trim()) + (k ? '&k=' + encodeURIComponent(k) : '');
        return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
          if (!j || j.status !== 'ok' || !j.results || !j.results.length) return null;
          var b = j.results[0];
          return (b && isFinite(b.lat) && isFinite(b.lon)) ? { lat: b.lat, lon: b.lon, name: q } : null;
        }).catch(function () { return null; });
      } catch (e) { return Promise.resolve(null); }
    }
    function nom(qq) {
      if (!qq || !qq.trim()) return Promise.resolve(null);
      return tpGeocode(qq)
        .then(function (g) { return (g && isFinite(g.lat) && isFinite(g.lon)) ? { lat: g.lat, lon: g.lon, name: q } : null; })
        .catch(function () { return null; });
    }
    return google(q).then(function (gr) {
      if (gr) return gr;
      return tpCmpGeocodeOSM(q, nom);   // fallback cascade (Nominatim variants + Places)
    });
  }
  // OSM/Nominatim fallback cascade (was the whole function before Google was added).
  function tpCmpGeocodeOSM(q, nom) {
    // Build an ordered list of Nominatim variants, from most to least specific.
    // Italian addresses often carry a compound house number ("31/1"), a 5-digit CAP
    // and a 2-letter province ("VR") — all of which make OSM miss. We progressively
    // strip them and also try "street + town" and "town only".
    function clean(s) { return s.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '').trim(); }
    var variants = [];
    function add(v) { v = clean(v || ''); if (v && variants.indexOf(v) < 0) variants.push(v); }
    add(q);                                                            // as typed
    add(q.replace(/\b(\d+)\s*\/\s*\w+\b/g, '$1'));                     // "31/1" -> "31"
    var noCapProv = q.replace(/\b\d{5}\b/g, ' ').replace(/\b[A-Z]{2}\b/g, ' ');   // drop CAP + province code
    add(noCapProv);
    add(noCapProv.replace(/\b(\d+)\s*\/\s*\w+\b/g, '$1'));             // + normalized house number
    add(noCapProv.replace(/\b\d+\s*\/?\s*\w{0,2}\b/g, ' '));          // + drop the house number entirely
    // "street, town" (first street-like part + last town-like part)
    var parts = q.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var streetPart = null, townPart = null;
    for (var a = 0; a < parts.length; a++) { if (/\b(via|viale|piazza|corso|strada|località|localita|vicolo|largo)\b/i.test(parts[a])) { streetPart = parts[a].replace(/\b\d+\s*\/?\s*\w{0,2}\b/g, '').trim(); break; } }
    for (var b = parts.length - 1; b >= 0; b--) { if (parts[b] && !/\d/.test(parts[b]) && !/\b(via|viale|piazza|corso|strada|località|localita|vicolo|largo)\b/i.test(parts[b])) { townPart = parts[b].replace(/\b[A-Z]{2}\b/g, '').trim(); break; } }
    if (streetPart && townPart) add(streetPart + ', ' + townPart);
    if (townPart) add(townPart);                                       // town only (last resort for a rough pin)

    // Try each variant in order; first hit wins.
    function tryFrom(i) {
      if (i >= variants.length) {
        // Nothing from OSM: try Places (a business), centered on the town if we have one.
        var centerP = townPart ? nom(townPart) : Promise.resolve(null);
        return centerP.then(function (ctr) {
          return tpCmpPlacesLookup(q, ctr).then(function (viaCtr) {
            return viaCtr || tpCmpPlacesLookup(q, null);
          });
        });
      }
      return nom(variants[i]).then(function (r) { return r || tryFrom(i + 1); });
    }
    return tryFrom(0);
  }
  // Set the DESTINATION to a named place / address (same geocoder as the origin).
  function tpCmpSetDest(name) {
    if (!name || !String(name).trim()) return Promise.resolve(null);
    return tpCmpGeocodeSmart(String(name).trim()).then(function (g) {
      if (!g) return null;
      _cmpDest = { lat: g.lat, lon: g.lon, name: (g.name || String(name).trim()) };
      cmpSaveDest(); _cmpMapFitted = false; tpCmpRender();
      return { lat: g.lat, lon: g.lon, name: _cmpDest.name };
    });
  }
  function tpCmpClearDest() { _cmpDest = null; cmpSaveDest(); _cmpMapFitted = false; tpCmpRender(); }
  // Whole-panel FULLSCREEN (for in-car reading): the entire Live compass — readout,
  // controls and map — fills the screen; the map stretches to the remaining height.
  // Pseudo-fullscreen via CSS (works everywhere incl. iPhone PWA, unlike the
  // Fullscreen API). Distinct from the map-only ⛶ Expand, which stays as is.
  function cmpSetPanelFull(full) {
    var ov = document.getElementById('tp-cmp-ov'); if (!ov) return;
    _cmpPanelFull = !!full;
    var mapWrap = document.getElementById('tp-cmp-map-wrap');
    var mapHost = document.getElementById('tp-cmp-map');
    var fsBtn = document.getElementById('tp-cmp-full');
    if (_cmpPanelFull) {
      if (_cmpPanelCss == null) _cmpPanelCss = ov.style.cssText;   // save to restore verbatim
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;width:auto;height:100dvh;padding-top:env(safe-area-inset-top,0px);background:#fff;border:0;border-radius:0;box-shadow:none;display:flex;flex-direction:column;overflow:auto;-webkit-overflow-scrolling:touch;';
      if (mapWrap) { mapWrap.style.flex = '1 1 auto'; mapWrap.style.display = 'flex'; mapWrap.style.flexDirection = 'column'; mapWrap.style.minHeight = '180px'; }
      if (mapHost) { mapHost.style.flex = '1 1 auto'; mapHost.style.height = 'auto'; mapHost.style.minHeight = '160px'; }
      if (fsBtn) { fsBtn.textContent = '\ud83d\uddd7'; fsBtn.title = 'Exit full screen'; }
    } else {
      if (_cmpPanelCss != null) { ov.style.cssText = _cmpPanelCss; _cmpPanelCss = null; }
      if (mapWrap) { mapWrap.style.flex = ''; mapWrap.style.display = ''; mapWrap.style.flexDirection = ''; mapWrap.style.minHeight = ''; }
      if (mapHost) { mapHost.style.flex = ''; mapHost.style.height = '150px'; mapHost.style.minHeight = ''; }
      if (fsBtn) { fsBtn.textContent = '\u26f6'; fsBtn.title = 'Full screen'; }
    }
    _cmpMapFitted = false;
    setTimeout(function () { try { if (_cmpMap) _cmpMap.invalidateSize(); } catch (e) {} cmpRenderMap(); }, 80);
  }
  function cmpUpdateRefLabel() {
    var lbl = document.getElementById('tp-cmp-ref-label'); if (!lbl) return;
    if (_cmpOrigin) lbl.innerHTML = 'Origin: <b>' + (_cmpOrigin.name || 'here') + '</b> · <span id="tp-cmp-clear" style="color:#1565c0;cursor:pointer;text-decoration:underline;">clear</span>';
    else if (window._tpLive) lbl.textContent = 'Origin: trip start (use Here / From place to override).';
    else lbl.textContent = 'No origin yet — tap 📍 Here.';
    var clr = document.getElementById('tp-cmp-clear'); if (clr) clr.addEventListener('click', tpCmpClearOrigin);
  }

  function tpOpenCompass() {
    var ov = document.getElementById('tp-cmp-ov');
    if (!ov) {
      // max-height caps the panel so its TOP never slides under the browser address bar
      // / notch (previously the header + big readout were cut off at the top with no way
      // to scroll up). 100dvh accounts for mobile toolbars; safe-area-inset-top respects
      // the notch. overflow:auto lets the inner content scroll while the panel stays put.
      ov = el('div', { id: 'tp-cmp-ov', style: 'position:fixed;left:12px;bottom:80px;z-index:99996;width:248px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 96px - env(safe-area-inset-top,0px));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:#fff;border:2px solid #1565c0;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.3);' });
      var head = el('div', { style: 'position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:6px;background:#1565c0;color:#fff;border-radius:10px 10px 0 0;padding:7px 9px;' });
      head.appendChild(el('div', { style: 'flex:1;font-size:13px;font-weight:700;' }, '🧭 Live compass'));
      var refBtn = el('button', { id: 'tp-cmp-ref', type: 'button', title: 'Trip reference: Auto (origin→last stop) / Origin only (used only when no Here/From place origin is set)', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;' }, 'Auto');
      var refr = el('button', { type: 'button', title: 'Refresh now', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:3px 7px;font-size:13px;cursor:pointer;' }, '\u21bb');
      var vox = el('button', { id: 'tp-cmp-vox', type: 'button', title: 'Voice alerts on/off', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:3px 7px;font-size:13px;cursor:pointer;' }, tpCmpVoiceOn() ? '\ud83d\udd0a' : '\ud83d\udd07');
      vox.addEventListener('click', function () {
        var on = !tpCmpVoiceOn();
        try { localStorage.setItem('xkdg_cmp_voice', on ? '1' : '0'); } catch (e) {}
        vox.textContent = on ? '\ud83d\udd0a' : '\ud83d\udd07';
        if (on) tpSpeak({ it: 'Voce attivata.', en: 'Voice on.', fr: 'Voix activ\u00e9e.' }[tpCmpLang()]);
        else if (window.speechSynthesis) window.speechSynthesis.cancel();
      });
      var fullBtn = el('button', { id: 'tp-cmp-full', type: 'button', title: 'Full screen', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:3px 8px;font-size:13px;cursor:pointer;' }, '\u26f6');
      fullBtn.addEventListener('click', function () { cmpSetPanelFull(!_cmpPanelFull); });
      var cls = el('button', { type: 'button', title: 'Close', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:3px 8px;font-size:13px;cursor:pointer;' }, '\u00d7');
      // 🧭 Octant-rose probe toggle (session 24): when ON, a tap on the map drops an
      // independent probe and draws the full 8-octant rose (favourable/not) from it.
      var probeBtn = el('button', { id: 'tp-cmp-probe', type: 'button', title: 'Octant rose: tap the map to probe any point', style: 'background:' + (_cmpProbeMode ? '#ffd54f' : 'rgba(255,255,255,.2)') + ';color:' + (_cmpProbeMode ? '#333' : '#fff') + ';border:0;border-radius:6px;padding:3px 8px;font-size:13px;cursor:pointer;' }, '\ud83e\udded');
      probeBtn.addEventListener('click', function () {
        _cmpProbeMode = !_cmpProbeMode;
        if (!_cmpProbeMode) _cmpProbe = null;   // turning off clears the probe
        probeBtn.style.background = _cmpProbeMode ? '#ffd54f' : 'rgba(255,255,255,.2)';
        probeBtn.style.color = _cmpProbeMode ? '#333' : '#fff';
        var lp = document.getElementById('tp-cmp-ref-label');
        if (_cmpProbeMode && lp) lp.textContent = 'Octant rose ON \u2014 tap the map to probe a point.';
        try { cmpRenderMap(); tpCmpRender(); } catch (e) {}
      });
      refBtn.addEventListener('click', function () { _tpRefMode = (_tpRefMode === 'origin') ? 'auto' : 'origin'; refBtn.textContent = (_tpRefMode === 'origin') ? 'Origin' : 'Auto'; tpCmpRender(); });
      refr.addEventListener('click', tpCmpRefreshOnce);
      cls.addEventListener('click', function () { tpCloseCompass(); });
      head.appendChild(refBtn); head.appendChild(probeBtn); head.appendChild(vox); head.appendChild(refr); head.appendChild(fullBtn); head.appendChild(cls);
      ov.appendChild(head);

      ov.appendChild(el('div', { id: 'tp-cmp-body', style: 'padding:12px;text-align:center;color:#222;' }));

      // Controls — one clear column (Edu's layout): 📍 Here on top, then origin,
      // then destination, then a single ▶ Go that resolves everything at once.
      // GO semantics: destination EMPTY -> original live-quadrant mode from the
      // origin; destination FILLED -> constant rhumb-line course ORIGIN -> DEST.
      //
      // COLLAPSIBLE (Edu, session 23: "l'importante è che direzione, mappa e
      // countdown siano leggibili mentre guido"): the whole setup block —
      // origin row, Here, from/to inputs, Go — is setup-time machinery that was
      // eating the vertical space between the countdown and the map. A slim
      // toggle keeps it one tap away; it starts COLLAPSED whenever an origin is
      // already set (i.e. while actually driving), OPEN on a fresh panel.
      var _ctrlOpen = !(_cmpOrigin || (window._tpLive && window._tpLive.originLat != null));
      var ctrlToggle = el('button', { type: 'button', style: 'display:block;width:calc(100% - 20px);margin:4px 10px 0;background:#f4f0fa;color:#5e35b1;border:1px solid #d1c4e9;border-radius:7px;padding:5px 9px;font-size:12px;font-weight:700;cursor:pointer;text-align:left;' });
      var ctrl = el('div', { style: 'padding:0 10px 10px;border-top:1px solid #eee;' });
      function _syncCtrl() {
        ctrl.style.display = _ctrlOpen ? 'block' : 'none';
        ctrlToggle.textContent = (_ctrlOpen ? '\u25be ' : '\u25b8 ') + '\u2699 Origin / Destination';
      }
      ctrlToggle.addEventListener('click', function () { _ctrlOpen = !_ctrlOpen; _syncCtrl(); setTimeout(function () { try { if (_cmpMap) _cmpMap.invalidateSize(); } catch (e) {} }, 60); });
      ov.appendChild(ctrlToggle);
      _syncCtrl();
      ctrl.appendChild(el('div', { id: 'tp-cmp-ref-label', style: 'font-size:11px;color:#666;margin:7px 0;' }));
      var hereBtn = el('button', { type: 'button', style: 'width:100%;background:#1565c0;color:#fff;border:0;border-radius:7px;padding:7px 9px;font-size:13px;font-weight:700;cursor:pointer;' }, '📍 Here — use my current position as origin');
      hereBtn.addEventListener('click', function () { tpCmpStart(); tpCmpSetOriginHere(); });
      ctrl.appendChild(hereBtn);
      var nameInp = el('input', { id: 'tp-cmp-name', type: 'text', placeholder: 'From a place… (e.g. Arezzo)', style: 'width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #ccc;border-radius:7px;padding:7px 8px;font-size:12px;' });
      ctrl.appendChild(nameInp);
      var drow = el('div', { style: 'display:flex;gap:6px;align-items:center;margin-top:6px;' });
      var destInp = el('input', { id: 'tp-cmp-dest', type: 'text', placeholder: '\ud83c\udfaf To a place\u2026 or a direction (NW) from origin', value: (_cmpOriginManualDir || (_cmpDest && _cmpDest.name) || ''), style: 'flex:1;min-width:0;border:1px solid #ccc;border-radius:7px;padding:7px 8px;font-size:12px;' });
      var destClr = el('button', { type: 'button', title: 'Clear destination', style: 'flex:0 0 auto;background:#eee;color:#555;border:0;border-radius:7px;padding:7px 9px;font-size:12px;cursor:pointer;' }, '\u2715');
      destClr.addEventListener('click', function () { destInp.value = ''; _cmpOriginManualDir = null; tpCmpClearDest(); cmpRenderMap(); });
      drow.appendChild(destInp); drow.appendChild(destClr);
      ctrl.appendChild(drow);
      // TURN-WEDGE ADVISOR (Edu, session 23): a SEPARATE point (his example: home)
      // from which the map draws the wedge(s) to aim for — the octant, radiating
      // OUT of this point, such that arriving there puts it in a favourable
      // direction from you, now or at the next hour change. Independent of the
      // main Destination above (in his example the two happened to coincide, but
      // they don't have to — this is the "detour timing" tool, not the route).
      var drow2 = el('div', { style: 'display:flex;gap:6px;align-items:center;margin-top:6px;' });
      var dest2Inp = el('input', { id: 'tp-cmp-dest2', type: 'text', placeholder: '\ud83c\udfe0 2nd dest place\u2026 or a direction (S)', value: (_cmpDest2ManualDir || (_cmpDest2 && _cmpDest2.name) || ''), style: 'flex:1;min-width:0;border:1px solid #ccc;border-radius:7px;padding:7px 8px;font-size:12px;' });
      var dest2Clr = el('button', { type: 'button', title: 'Clear 2nd destination', style: 'flex:0 0 auto;background:#eee;color:#555;border:0;border-radius:7px;padding:7px 9px;font-size:12px;cursor:pointer;' }, '\u2715');
      dest2Clr.addEventListener('click', function () { dest2Inp.value = ''; _cmpDest2 = null; _cmpDest2ManualDir = null; cmpRenderMap(); tpCmpRender(); });
      dest2Inp.addEventListener('change', function () {
        var v = dest2Inp.value.trim();
        if (!v) { _cmpDest2 = null; _cmpDest2ManualDir = null; cmpRenderMap(); tpCmpRender(); return; }
        // A bare direction (e.g. "S") → manual octant for the dest2 wedge (drawn as the
        // OPPOSITE octant). The dest2 POINT is kept; set a place first if none exists.
        var octD = tpParseOctant(v);
        if (octD) {
          _cmpDest2ManualDir = octD;
          var lm = document.getElementById('tp-cmp-ref-label');
          if (!_cmpDest2 && lm) lm.textContent = 'Set a 2nd-destination place first, then type the direction.';
          cmpRenderMap(); tpCmpRender();
          return;
        }
        _cmpDest2ManualDir = null;   // a real place → back to the chart's auto wedges
        _tpResolvePlace(v, null, null).then(function (p) {
          if (p) { _cmpDest2 = { lat: p.lat, lon: p.lon, name: v }; cmpRenderMap(); tpCmpRender(); }
          else { var l2 = document.getElementById('tp-cmp-ref-label'); if (l2) l2.textContent = '2nd destination not found.'; }
        });
      });
      drow2.appendChild(dest2Inp); drow2.appendChild(dest2Clr);
      ctrl.appendChild(drow2);
      var goBtn = el('button', { type: 'button', style: 'width:100%;margin-top:8px;background:#0b8043;color:#fff;border:0;border-radius:8px;padding:9px;font-size:14px;font-weight:800;cursor:pointer;' }, '\u25b6 Go');
      function doGo() {
        var fromV = (nameInp.value || '').trim();
        var toV = (destInp.value || '').trim();
        goBtn.textContent = '\u2026';
        tpCmpStart();
        var lbl = function () { return document.getElementById('tp-cmp-ref-label'); };
        // 1) ORIGIN: typed place wins; else keep the existing origin; else fall back to Here.
        // FIX (session 23, Edu: "la direzione fra dove mi trovo e una città... funziona solo
        // se ci si muove"): a NEW destination typed with origin left blank is a fresh "from
        // here to X" question — it must default to Here, NOT silently reuse an unrelated
        // earlier trip's origin (e.g. this morning's Vienna→Tuoro), which produced a stale,
        // meaningless bearing that only looked "alive" once driving shifted the trip's own
        // last-stop tracking. Reusing the trip is still correct when NEITHER field changed
        // (re-pressing Go on an already-active trip view).
        var pOrigin = fromV
          ? tpCmpSetOriginFrom(fromV).then(function (r) {
              if (!r && lbl()) lbl().textContent = 'Place not found \u2014 try without the house number, or just \u201cname, town\u201d.';
              return r;
            })
          : (toV ? Promise.resolve(_cmpOrigin) : Promise.resolve(_cmpOrigin || (window._tpLive ? { trip: true } : null)));
        pOrigin.then(function (o) {
          if (!o && !fromV) { tpCmpSetOriginHere(); }
          // 2) DESTINATION: a bare direction (e.g. "NW") → manual ORIGIN wedge, no
          //    geocode. A place → rhumb course origin->dest. Empty → quadrant mode.
          var octD = tpParseOctant(toV);
          if (octD) { _cmpOriginManualDir = octD; tpCmpClearDest(); return null; }
          _cmpOriginManualDir = null;   // a real place clears any manual origin octant
          if (toV) {
            return tpCmpSetDest(toV).then(function (r2) {
              if (!r2 && lbl()) lbl().textContent = 'Destination not found \u2014 try without the house number, or just \u201cname, town\u201d.';
            });
          }
          tpCmpClearDest();
          return null;
        }).then(function () {
          goBtn.textContent = '\u25b6 Go';
          tpCmpRefreshOnce();
          _ctrlOpen = false; _syncCtrl();   // back to the driving view (session 23)
          setTimeout(function () { try { if (_cmpMap) _cmpMap.invalidateSize(); } catch (e) {} }, 60);
        }).catch(function () { goBtn.textContent = '\u25b6 Go'; });
      }
      goBtn.addEventListener('click', doGo);
      nameInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doGo(); } });
      destInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doGo(); } });
      ctrl.appendChild(goBtn);
      ov.appendChild(ctrl);

      // Mini map. (The old "⛶ Expand" map-only button is gone — the header ⛶ full
      // screen replaced it; voice "expand" still works for the big-map overlay.)
      var mapWrap = el('div', { id: 'tp-cmp-map-wrap', style: 'padding:0 10px 10px;' });
      // ⛶ Drive view (Edu, session 23): one tap → near-fullscreen map with ONLY the
      // direction + hour countdown floating on it; everything else disappears until Close.
      var driveBtn = el('button', { type: 'button', style: 'display:block;width:100%;margin-top:6px;background:#1565c0;color:#fff;border:0;border-radius:8px;padding:8px;font-size:14px;font-weight:800;cursor:pointer;' }, '\u26f6 Drive view \u2014 full-screen map');
      driveBtn.addEventListener('click', function () { cmpSetMapBig(true); });
      mapWrap.appendChild(driveBtn);
      mapWrap.appendChild(el('div', { id: 'tp-cmp-map', style: 'width:100%;height:48vh;min-height:300px;border-radius:8px;overflow:hidden;background:#eef;margin-top:6px;' }));
      ov.appendChild(mapWrap);

      document.body.appendChild(ov);
    }
    ov.style.display = 'block';
    cmpUpdateRefLabel(); tpCmpRender(); tpCmpStart(); tpCmpRefreshOnce();
    tpCmpWakeAcquire();   // keep the phone screen alive while the compass is the driving screen (session 23)
    // Leaflet caches its container size: after a close (display:none) → reopen,
    // it still draws tiles for the OLD size and the rest of the box stays blank
    // ("taglia a metà la mappa", session 23). Re-measure on every open, after
    // the box has its real layout size.
    setTimeout(function () { try { if (_cmpMap) { _cmpMap.invalidateSize(); cmpRenderMap(); } } catch (e) {} }, 120);
  }
  document.addEventListener('visibilitychange', function () {
    var ov = document.getElementById('tp-cmp-ov');
    if (!document.hidden && ov && ov.style.display !== 'none') tpCmpRefreshOnce();   // recompute on screen wake (no Wake Lock)
  });
  // 48vh changes with orientation/keyboard: re-measure the map on any resize
  // while the compass is open (session 23, same stale-size class as above).
  window.addEventListener('resize', function () {
    try {
      var ov = document.getElementById('tp-cmp-ov');
      if (ov && ov.style.display !== 'none' && _cmpMap) setTimeout(function () { try { _cmpMap.invalidateSize(); } catch (e) {} }, 120);
    } catch (e) {}
  });

  // Open the compass and, optionally, set its origin in one go.
  //   spec === 'here'  -> origin = current GPS
  //   spec (a string)  -> origin = that named place (geocoded)
  function tpStartCompass(spec) {
    tpOpenCompass(); tpCmpStart();
    if (spec === 'here' || spec === true) { tpCmpSetOriginHere(); return Promise.resolve({ origin: 'here' }); }
    if (spec && typeof spec === 'string') return tpCmpSetOriginFrom(spec).then(function (r) { return { origin: (r && r.name) || spec, found: !!r }; });
    return Promise.resolve({ opened: true });
  }
  // ═══ WAKE LOCK (Edu, session 23, promoted from the long-standing backlog) ═══
  // Vivaldi on the Polestar's own screen is killed by Android Automotive's
  // driver-distraction lockout the moment the car moves, so the REAL driving
  // screen is the phone on its mount — where the display would otherwise go to
  // sleep mid-trip. Screen Wake Lock while the compass is open keeps it alive.
  // The lock is auto-released by the OS whenever the tab goes to background;
  // the visibilitychange listener below re-acquires it on return. Browsers
  // without the API (or with it denied) are simply left as they are.
  var _cmpWakeLock = null;
  function tpCmpWakeAcquire() {
    try {
      if (!('wakeLock' in navigator)) return;
      navigator.wakeLock.request('screen').then(function (wl) {
        _cmpWakeLock = wl;
        wl.addEventListener('release', function () { _cmpWakeLock = null; });
      }).catch(function () { /* denied / power-save: nothing to do */ });
    } catch (e) {}
  }
  function tpCmpWakeRelease() {
    try { if (_cmpWakeLock) { _cmpWakeLock.release(); _cmpWakeLock = null; } } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () {
    try {
      var ov = document.getElementById('tp-cmp-ov');
      if (!document.hidden && ov && ov.style.display !== 'none' && !_cmpWakeLock) tpCmpWakeAcquire();
    } catch (e) {}
  });

  function tpCloseCompass() {
    tpCmpStop();
    tpCmpWakeRelease();
    if (_cmpMapBig) cmpSetMapBig(false);
    var ov = document.getElementById('tp-cmp-ov'); if (ov) ov.style.display = 'none';
  }
  // Voice/AI control of the open compass. Returns a small status object.
  function tpCompassControl(action) {
    action = (action || '').toString().toLowerCase().trim();
    switch (action) {
      case 'open': tpOpenCompass(); tpCmpStart(); return { ok: true, action: 'open' };
      case 'close': tpCloseCompass(); return { ok: true, action: 'close' };
      case 'expand': case 'enlarge': case 'big':
        tpOpenCompass(); tpCmpStart(); tpCmpRefreshOnce(); cmpSetMapBig(true); return { ok: true, action: 'expand' };
      case 'fullscreen': case 'full_screen': case 'full':
        tpOpenCompass(); tpCmpStart(); tpCmpRefreshOnce(); cmpSetPanelFull(true); return { ok: true, action: 'fullscreen' };
      case 'exit_fullscreen': case 'windowed': cmpSetPanelFull(false); return { ok: true, action: 'exit_fullscreen' };
      case 'collapse': case 'shrink': case 'small': cmpSetMapBig(false); cmpSetPanelFull(false); return { ok: true, action: 'collapse' };
      case 'clear_destination': case 'clear_dest': tpCmpClearDest(); return { ok: true, action: 'clear_destination' };
      case 'clear': case 'clear_origin': case 'reset_origin': tpCmpClearOrigin(); return { ok: true, action: 'clear_origin' };
      case 'refresh': case 'recalculate': case 'recompute': tpCmpRefreshOnce(); return { ok: true, action: 'refresh' };
      case 'recenter': case 'center': case 'follow_on':
        _cmpMapFollow = true; _cmpMapFitted = false; cmpRenderMap(); return { ok: true, action: 'recenter' };
      case 'follow_off': case 'free': _cmpMapFollow = false; cmpRenderMap(); return { ok: true, action: 'follow_off' };
      default:
        // 'destination:<name or address>' — set the 🎯 destination by voice/AI.
        if (action.indexOf('destination:') === 0) {
          var _dn = action.slice(12).trim();
          if (_dn) { tpOpenCompass(); tpCmpStart(); tpCmpSetDest(_dn); return { ok: true, action: 'set_destination', name: _dn }; }
        }
        return { error: 'Unknown compass action: ' + action };
    }
  }

  function tpInstallCompassFab() {
    if (document.getElementById('tp-compass-fab')) return;
    var b = el('button', { id: 'tp-compass-fab', type: 'button', title: 'Live compass',
      style: 'position:fixed;left:14px;bottom:14px;z-index:99994;width:46px;height:46px;border:0;border-radius:50%;background:#1565c0;color:#fff;font-size:21px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);' }, '🧭');
    b.addEventListener('click', tpOpenCompass);
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tpInstallCompassFab); else tpInstallCompassFab();

  /* ---- LUCKY ROUND-TRIP orchestration (core) ----------------------------- *
   * Plans OUT -> stay -> BACK, reusing the existing per-leg planner. The return
   * leg is planned toward HOME, so the engine's net-direction logic composes
   * alternative favourable legs (e.g. SE+NE -> E) on its own. A leg's "quality"
   * = favourable-hours + toward-dest slots + cashing stops; the trip score is
   * the MINIMUM of the two legs (both must be good). If no stay length in the
   * requested window yields a clean return, the stay window is widened
   * automatically. Returns a Promise of a structured summary for the AI card.
   * NOTE: fine "back-timing" of leg starts is a separate, later step.
   * ----------------------------------------------------------------------- */
  function tpTripQuality(res) {
    var slots = (res && res.slots) || [];
    var n = slots.length || 1;
    var favHours = slots.filter(function (s) { return s.hourPositive; }).length;
    var towardSlots = slots.filter(function (s) {
      return (s.dirs || []).some(function (d) { return d.towardDest && d.eval && d.eval.ok; });
    }).length;
    var cash = ((res && res.plan) || []).filter(function (x) { return x.type === 'stop' && x.cashDir; }).length;
    var anyOk = slots.some(function (s) { return tpUsableDirs(s.dirs).length > 0; });
    // Length-INDEPENDENT quality 0..1: average favourability per double-hour
    // (direction toward dest + hour positive). A short fully-favourable trip
    // scores as high as a long one — distance no longer inflates luck.
    var q = ((towardSlots / n) + (favHours / n)) / 2;
    return { q: q, favHours: favHours, towardSlots: towardSlots, cash: cash, slots: n, anyOk: anyOk };
  }

  function tpRouteDriveH(route, A, B) {
    var idx = tpBuildRouteIndex(route);
    if (idx && idx.durationSec) return { h: idx.durationSec / 3600, km: idx.distanceMeters / 1000, real: true };
    var km = tpHaversineKm(A.lat, A.lon, B.lat, B.lon) * 1.3;
    return { h: Math.max(0.5, km / 72), km: km, real: false };
  }

  // Chinese double-hour (时辰) at a wall-clock instant `ms` and longitude `lon`,
  // computed on the SAME compensated true-solar-time the Main uses:
  // solar = wall-clock + tpOffsetMin(lon, utc, dstOn) [longitude eq. of time + UTC + DST].
  // Returns { han:'午', py:'Wu', tst:'13:12' } (tst is the true-solar clock, for cross-checking).
  // Full hour pillar (stem+branch+solar date) at a moment — tpChineseHourAt only
  // returns the branch (for the countdown display); tpScanDirs needs the FULL
  // pillar plus Y/M/D to look up the rotating chart (session 23, turn-wedge advisor).
  function tpFullHourAt(ms, lon, utc, dstOn) {
    try {
      var off = tpOffsetMin(lon, utc, dstOn, ms);
      var sd = new Date(ms + off * 60000);
      var ec = Solar.fromDate(sd).getLunar().getEightChar();
      return { Y: sd.getFullYear(), M: sd.getMonth() + 1, D: sd.getDate(), gan: ec.getTimeGan(), zhi: ec.getTimeZhi() };
    } catch (e) { return null; }
  }
  function tpChineseHourAt(ms, lon, utc, dstOn) {
    try {
      var off = tpOffsetMin(lon, utc, dstOn, ms);
      var sd = new Date(ms + off * 60000);
      var han = Solar.fromDate(sd).getLunar().getEightChar().getTimeZhi();
      var tst = String(sd.getHours()).padStart(2, '0') + ':' + String(sd.getMinutes()).padStart(2, '0');
      return { han: han, py: (BR_PY[han] || han), tst: tst };
    } catch (e) { return null; }
  }

  function tpPlanRoundTrip(opts) {
    opts = opts || {};
    var O = opts.origin || TP_DEFAULT.origin;
    var Dst = opts.dest || TP_DEFAULT.dest;
    var utc = (opts.utc != null) ? opts.utc : 1;
    var dstOn = !!opts.dstOn;
    var dateStr = opts.dateStr || tpLocalISO(new Date());
    var stayMin = (opts.stayMinH != null) ? opts.stayMinH : (opts.stayHours != null ? opts.stayHours : 2);
    var stayMax = (opts.stayMaxH != null) ? opts.stayMaxH : (opts.stayHours != null ? opts.stayHours : 3);
    var nowMs = (opts.nowMs != null) ? opts.nowMs : Date.now();
    var marginMs = ((opts.departMarginMin != null) ? opts.departMarginMin : 20) * 60000;
    // For today, departures must be in the future (now + margin); for a future day, no floor.
    var minDepartMs = (dateStr === tpLocalISO(new Date(nowMs))) ? (nowMs + marginMs) : 0;
    var worker = tpGetWorkerUrl();
    var STAY_STEP = 0.5, WIDEN_MAX = 8, GOOD = 0.5;   // GOOD on a 0..1 quality scale

    var fetchOut = (opts.estimateOnly) ? Promise.resolve(null)
      : (opts.routeOut ? Promise.resolve(opts.routeOut)
        : tpFetchRoute(worker, { lat: O.lat, lng: O.lon }, { lat: Dst.lat, lng: Dst.lon }).catch(function () { return null; }));
    var fetchBack = (opts.estimateOnly) ? Promise.resolve(null)
      : (opts.routeBack ? Promise.resolve(opts.routeBack)
        : tpFetchRoute(worker, { lat: Dst.lat, lng: Dst.lon }, { lat: O.lat, lng: O.lon }).catch(function () { return null; }));

    return Promise.all([fetchOut, fetchBack]).then(function (rs) {
      var routeOut = rs[0], routeBack = rs[1];
      var driveOut = tpRouteDriveH(routeOut, O, Dst);
      var driveBack = tpRouteDriveH(routeBack, Dst, O);

      var bestDep = tpPickBestDepartureForDay(O, Dst, dateStr, utc, dstOn, routeOut, minDepartMs, true);
      if (!bestDep) throw new Error('No favourable departure (exact direction) for ' + dateStr);
      var depOutMs = bestDep.ms;
      var outRes = tpPlan({ depDate: new Date(depOutMs), durationH: Math.max(driveOut.h, 0.5),
        origin: O, dest: Dst, utc: utc, dstOn: dstOn, route: routeOut, snapDepart: false, stepMin: 30, stopMode: 'auto' });
      var qOut = tpTripQuality(outRes);
      var arriveOutMs = depOutMs + driveOut.h * 3600000;

      function evalStay(stayH) {
        var depBackMs = arriveOutMs + stayH * 3600000;
        var res = tpPlan({ depDate: new Date(depBackMs), durationH: Math.max(driveBack.h, 0.5),
          origin: Dst, dest: O, utc: utc, dstOn: dstOn, route: routeBack, snapDepart: false, stepMin: 30, stopMode: 'auto' });
        var qBack = tpTripQuality(res);
        // ABSOLUTE RULE: the exact direction toward home must be favourable at the moment of leaving back.
        var s0 = (res.slots && res.slots[0]) ? res.slots[0] : null;
        var de = s0 ? tpDirExact(s0, s0.bearingDest) : null;
        var validStart = !!(de && de.eval && de.eval.ok);
        return { stayH: stayH, res: res, qBack: qBack, depBackMs: depBackMs, combined: Math.min(qOut.q, qBack.q), validStart: validStart };
      }
      // Only round-trips whose RETURN also departs in a favourable exact direction are admissible.
      function bestOf(list) {
        var valid = list.filter(function (c) { return c.validStart; });
        return valid.slice().sort(function (a, b) { return b.combined - a.combined; })[0] || null;
      }

      var cands = [];
      for (var s = stayMin; s <= stayMax + 1e-9; s += STAY_STEP) cands.push(evalStay(Math.round(s * 100) / 100));
      var best = bestOf(cands), widened = false;
      if (!best || best.combined < GOOD) {
        for (var s2 = stayMax + STAY_STEP; s2 <= WIDEN_MAX + 1e-9; s2 += STAY_STEP) {
          cands.push(evalStay(Math.round(s2 * 100) / 100)); widened = true;
          best = bestOf(cands);
          if (best && best.combined >= GOOD) break;
        }
      }
      best = bestOf(cands);
      if (!best) return { ok: false, reason: 'no_favourable_return' };   // no admissible return -> drop this direction

      function clock(ms) { var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
      var arriveBackMs = best.depBackMs + driveBack.h * 3600000;
      var clean = (qOut.q >= GOOD && best.qBack.q >= GOOD);
      // Chinese double-hours on compensated TST: departure & arrival use the longitude
      // of the place they happen at (origin for departure/home-arrival, dest for arrival/return).
      var cnDepOut = tpChineseHourAt(depOutMs, O.lon, utc, dstOn);
      var cnArrOut = tpChineseHourAt(arriveOutMs, Dst.lon, utc, dstOn);
      var cnDepBack = tpChineseHourAt(best.depBackMs, Dst.lon, utc, dstOn);
      var cnArrBack = tpChineseHourAt(arriveBackMs, O.lon, utc, dstOn);
      return {
        ok: true, date: dateStr, widenedStay: widened, clean: clean,
        outbound: { depClock: clock(depOutMs), arriveClock: clock(arriveOutMs), departCn: cnDepOut, arriveCn: cnArrOut,
          driveH: Math.round(driveOut.h * 100) / 100,
          km: Math.round(driveOut.km), quality: qOut.q, favHours: qOut.favHours, towardSlots: qOut.towardSlots, cashStops: qOut.cash, realRoute: driveOut.real },
        stayH: best.stayH,
        back: { depClock: clock(best.depBackMs), arriveClock: clock(arriveBackMs), departCn: cnDepBack, arriveCn: cnArrBack,
          driveH: Math.round(driveBack.h * 100) / 100,
          km: Math.round(driveBack.km), quality: best.qBack.q, favHours: best.qBack.favHours, towardSlots: best.qBack.towardSlots, cashStops: best.qBack.cash, realRoute: driveBack.real },
        combined: best.combined,
        note: clean ? (widened ? 'Favourable round-trip found by widening the stay.' : 'Favourable round-trip.')
                    : 'No fully favourable round-trip today even after widening — best compromise shown.'
      };
    });
  }

  // Project a point from O along a compass bearing for `km` (spherical).
  function tpDestPoint(O, bearingDeg, km) {
    var R = 6371, br = bearingDeg * Math.PI / 180, lat1 = O.lat * Math.PI / 180, dr = km / R;
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(br));
    var lon2 = (O.lon * Math.PI / 180) + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(lat1), Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2));
    return { lat: lat2 * 180 / Math.PI, lon: ((lon2 * 180 / Math.PI) + 540) % 360 - 180 };
  }

  // ---- POI engine (OpenStreetMap / Overpass, free) ------------------------
  // Turns a projected "point" into a REAL place of a chosen category near it.
  // NOTE: nature includes AREAS (parks/reserves/national parks/water) via nwr,
  // and access points (parking/trailhead) WITHOUT a name requirement — a trailhead
  // car park is exactly where you stop to start a walk, and most are unnamed in OSM.
  var TP_POI_FILTERS = {
    nature: ['nwr["leisure"="nature_reserve"]', 'nwr["boundary"="national_park"]',
             'nwr["leisure"="park"]', 'nwr["natural"="water"]',
             'node["tourism"="viewpoint"]', 'node["natural"="peak"]', 'node["natural"="waterfall"]',
             'node["tourism"="picnic_site"]', 'node["tourism"="camp_site"]',
             'node["information"="guidepost"]', 'node["highway"="trailhead"]',
             'nwr["amenity"="parking"]'],
    culture: ['node["historic"="castle"]["name"]', 'node["tourism"="museum"]["name"]',
              'node["historic"="monument"]["name"]', 'node["historic"="memorial"]["name"]',
              'node["historic"="ruins"]["name"]', 'nwr["amenity"="parking"]'],
    town: ['node["place"="town"]["name"]', 'node["place"="village"]["name"]'],
    any: ['node["tourism"="attraction"]["name"]', 'node["place"="town"]["name"]',
          'node["historic"="castle"]["name"]', 'node["tourism"="viewpoint"]["name"]'],
    // light, almost-always-populated set used as a fallback to name a real place
    broad: ['node["place"="town"]["name"]', 'node["place"="village"]["name"]',
            'node["tourism"="attraction"]["name"]', 'node["amenity"="parking"]["name"]'],
    // real places where you can actually pull over and stop (snapped cash stops):
    // SPARSE, fast-to-query types — motorway service area / rest area / fuel station.
    // (EV chargers are always fetched too, by tpFindPOI, and preferred for electric trips.)
    stopover: ['nwr["highway"="services"]', 'nwr["highway"="rest_area"]', 'nwr["amenity"="fuel"]'],
    // parking is VERY dense (times out a wide query), so it is a separate small-radius fallback.
    parkingonly: ['nwr["amenity"="parking"]']
  };
  // Classify an OSM element so the user knows WHAT kind of stop it is.
  function tpPoiKind(t) {
    if (!t) return 'place';
    if (t.highway === 'services') return 'services';
    if (t.highway === 'rest_area') return 'rest_area';
    if (t.amenity === 'fuel') return 'fuel';
    if (t.amenity === 'parking') return 'parking';
    if (t.highway === 'trailhead' || t.information === 'guidepost' || t.tourism === 'information') return 'trailhead';
    if (t.tourism === 'viewpoint') return 'viewpoint';
    if (t.tourism === 'picnic_site') return 'picnic';
    if (t.tourism === 'camp_site') return 'camp';
    if (t.boundary === 'national_park' || t.leisure === 'nature_reserve' || t.boundary === 'protected_area') return 'reserve';
    if (t.leisure === 'park') return 'park';
    if (t.natural === 'waterfall' || t.waterway === 'waterfall') return 'waterfall';
    if (t.natural === 'water') return 'lake';
    if (t.natural === 'peak') return 'peak';
    if (t.place === 'town' || t.place === 'village') return 'town';
    if (t.historic) return 'historic';
    if (t.tourism === 'museum') return 'museum';
    return 'place';
  }
  // Lower rank = better place to actually stop and start a walk.
  function tpAccessRank(kind) {
    var R = { parking: 0, trailhead: 0, picnic: 1, viewpoint: 1, camp: 1, waterfall: 1, park: 2, reserve: 2, town: 3, lake: 4, forest: 4, peak: 4 };
    return (R[kind] != null) ? R[kind] : 5;
  }
  function tpChargerPower(t) {
    var p = t['charging_station:output'] || t.maximum_power || t.output ||
            t['socket:type2:output'] || t['socket:type2_combo:output'] || t['socket:ccs:output'] || t['socket:chademo:output'];
    return p ? String(p) : null;
  }
  // Nearest EV charger to a stop point (within ~350 m, so you can charge while you walk).
  function tpNearestCharger(p, chargers) {
    var best = null, bd = Infinity;
    (chargers || []).forEach(function (c) { var d = tpHaversineKm(p.lat, p.lon, c.lat, c.lon); if (d < bd) { bd = d; best = c; } });
    return (best && bd <= 0.35) ? { dist: bd, power: best.power } : null;
  }
  function tpPoiCategory(cat) {
    cat = (cat || '').toLowerCase();
    if (/(natur|walk|hik|lake|lago|forest|bosco|wood|park|parco|passeg|escursion|sentier|monta|outdoor|panoram|viewpoint)/.test(cat)) return 'nature';
    if (/(cultur|castle|castell|museo|museum|histor|storic|monument|art|abbazia|chiesa|church)/.test(cat)) return 'culture';
    if (/(town|village|borgo|borghi|paese|paesi|citt)/.test(cat)) return 'town';
    if (TP_POI_FILTERS[cat]) return cat;
    return 'any';
  }
  function tpFindPOI(lat, lon, radiusKm, category) {
    var key = tpPoiCategory(category);
    var filters = TP_POI_FILTERS[key] || TP_POI_FILTERS.any;
    var r = Math.round(Math.max(1, radiusKm) * 1000);
    // Always also fetch EV chargers in the area (free, same call) to favour rechargeable stops.
    var q = '[out:json][timeout:13];(' +
      filters.map(function (f) { return f + '(around:' + r + ',' + lat + ',' + lon + ');'; }).join('') +
      'node["amenity"="charging_station"](around:' + r + ',' + lat + ',' + lon + ');' +
      ');out center 250;';
    // Route OpenStreetMap (Overpass) through our own Cloudflare worker (avoids browser
    // CORS / service-worker issues). The worker itself falls back across public mirrors.
    // Can be overridden at runtime by setting window.TP_OVERPASS_URL.
    var customUrl = (typeof window !== 'undefined' && window.TP_OVERPASS_URL)
      ? window.TP_OVERPASS_URL : 'https://xkdg-osm.decumano16.workers.dev';
    var endpoints = [customUrl];
    var TP_SYN_NAME = { parking: 'Parking', trailhead: 'Trailhead', picnic: 'Picnic area', camp: 'Campsite', viewpoint: 'Viewpoint', peak: 'Peak', waterfall: 'Waterfall', services: 'Service area', rest_area: 'Rest area', fuel: 'Fuel station' };
    function parse(j) {
      var els = [], chargers = [];
      (j.elements || []).forEach(function (e) {
        var la = (e.lat != null) ? e.lat : (e.center && e.center.lat);
        var lo = (e.lon != null) ? e.lon : (e.center && e.center.lon);
        if (la == null || lo == null) return;
        var t = e.tags || {};
        if (t.amenity === 'charging_station') { chargers.push({ lat: la, lon: lo, power: tpChargerPower(t) }); return; }
        var kind = tpPoiKind(t);
        var nm = t['name:en'] || t.name;
        var named = !!nm;
        if (!nm) {
          // Unnamed elements are useful only as access/landmark stop points.
          if (!TP_SYN_NAME[kind]) return;
          nm = TP_SYN_NAME[kind];
        }
        els.push({ name: nm, lat: la, lon: lo, kind: kind, tags: t, named: named });
      });
      return { els: els, chargers: chargers };
    }
    function tryAt(i) {
      if (i >= endpoints.length) return Promise.resolve({ ok: false, els: [], chargers: [], error: 'unreachable' });
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
      return fetch(endpoints[i], {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(q), signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) { if (to) clearTimeout(to); if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (j) { var pr = parse(j); return { ok: true, els: pr.els, chargers: pr.chargers, error: null }; })
        .catch(function () { if (to) clearTimeout(to); return tryAt(i + 1); });
    }
    // Up to 2 automatic retries (3 attempts total) with growing backoff, to ride
    // out transient windows where every Overpass mirror is briefly slow/over capacity
    // before we report the area as having no place.
    function attemptWithRetries(retriesLeft, delayMs) {
      return tryAt(0).then(function (res) {
        if (res && res.ok) return res;
        if (retriesLeft <= 0) return res;
        return new Promise(function (rs) { setTimeout(rs, delayMs); })
          .then(function () { return attemptWithRetries(retriesLeft - 1, Math.min(delayMs * 2, 3000)); });
      });
    }
    return attemptWithRetries(2, 800);
  }
  // Choose the best POI: prefer real stop/start points (parking, trailhead, viewpoint…)
  // over abstract areas (lake/wood), then the closest to the projected point.
  // Two passes: first within the trip's reach (maxKm), then — if that eliminated
  // every candidate — ignoring the cap, so any returned data still yields a NAME
  // (better to label a slightly-far place than to show "no place").
  function tpPickBestPOI(els, projPoint, origin, maxKm) {
    function pick(useCap) {
      var best = null, bestKey = Infinity;
      (els || []).forEach(function (p) {
        if (useCap && maxKm && tpHaversineKm(origin.lat, origin.lon, p.lat, p.lon) > maxKm + 5) return;
        var d = tpHaversineKm(projPoint.lat, projPoint.lon, p.lat, p.lon);
        // type priority dominates; a nearby EV charger lifts the stop ~1.5 ranks; distance breaks ties
        var key = (tpAccessRank(p.kind) - (p.ev ? 1.5 : 0)) * 1000 + d;
        if (key < bestKey) { bestKey = key; best = p; }
      });
      return best;
    }
    return pick(true) || pick(false);
  }

  // ---- Snap a cash stop to a REAL stoppable place -------------------------
  // A geometric quadrant-exit point is unusable ("middle of the road"). Snap it
  // to where one can actually stop: an EV charger (preferred for electric trips),
  // else a motorway service area / rest area / fuel station / parking, near the point.
  function tpStopoverRank(kind) { var R = { charger: 0, services: 1, rest_area: 2, fuel: 3, parking: 4 }; return (R[kind] != null) ? R[kind] : 5; }
  function tpPickStopover(els, chargers, point, ev) {
    var cands = [];
    if (ev) (chargers || []).forEach(function (c) { cands.push({ kind: 'charger', name: 'EV charging', lat: c.lat, lon: c.lon, power: c.power || null }); });
    (els || []).forEach(function (e) {
      if (e.kind === 'services' || e.kind === 'rest_area' || e.kind === 'fuel' || e.kind === 'parking')
        cands.push({ kind: e.kind, name: e.name, lat: e.lat, lon: e.lon });
    });
    var best = null, bk = Infinity;
    cands.forEach(function (c) {
      var d = tpHaversineKm(point.lat, point.lon, c.lat, c.lon);
      if (d > 12) return;                                   // must stay near the on-route stop point
      var key = tpStopoverRank(c.kind) * 100 + d;           // type preference dominates, distance breaks ties
      if (key < bk) { bk = key; best = c; }
    });
    return best;
  }
  // High-power EV charger near a cash stop (Open Charge Map: real power + operator).
  // Priority: preferred brand (selected nets, e.g. Tesla/Electra) ≥150 kW, then ANY ≥150,
  // then preferred ≥80, then any ≥80, then nearest of anything — so a long-trip cashing
  // stop coincides with where you must recharge anyway. Needs the OCM key.
  function tpFindChargerStop(lat, lon, key, nets, preferredOnly) {
    if (!key && !tpEvWorkerUrl()) return Promise.resolve(null);   // no source at all
    var pt = { lat: lat, lon: lon };
    return tpFetchChargersMerged({ key: key, lat: lat, lon: lon, radiusKm: 30, maxResults: 60 })
      .then(function (stations) {
        var pool = (stations || []).filter(function (s) { return tpHaversineKm(pt.lat, pt.lon, s.lat, s.lon) <= 30; });
        if (!pool.length) return null;
        function dist(s) { return tpHaversineKm(pt.lat, pt.lon, s.lat, s.lon); }
        var pref = tpFilterChargersByNetwork(pool, nets || []);     // preferred brands (e.g. Tesla/Electra)
        // Preferred brands are known fast-DC hubs; OCM often lacks their power → treat
        // unknown-power preferred as fast so Electra is not skipped here either.
        function fast(s, minKW) { return (pref.indexOf(s) >= 0 && !s.powerKnown) ? true : ((s.maxKW || 0) >= minKW); }
        function bestBy(list, minKW) {
          var c = (list || []).filter(function (s) { return fast(s, minKW); }).slice().sort(function (a, b) { return dist(a) - dist(b); });
          return c[0] || null;
        }
        var pick;
        if (preferredOnly) {
          // Only a preferred-brand FAST charger (>=150 kW). A cash stop's restart is
          // fortunate BY CONSTRUCTION (the stop exists to cash that direction), so the
          // 20-minute plan is rigid here: no 80 kW tier, no slow Destination Chargers.
          // Better a plain stopover than a charge that wrecks the hour plan.
          pick = bestBy(pref, TP_MIN_KW) || null;
        } else {
          pick = bestBy(pref, TP_MIN_KW) || bestBy(pool, TP_MIN_KW) ||
                 bestBy(pref, TP_MIN_KW2) || bestBy(pool, TP_MIN_KW2) ||
                 pool.slice().sort(function (a, b) { return dist(a) - dist(b); })[0];
        }
        if (!pick) return null;
        return { name: pick.title || pick.operator || 'EV charging', lat: pick.lat, lon: pick.lon,
                 kind: 'charger', power: (pick.maxKW ? Math.round(pick.maxKW) + ' kW' : null), operator: pick.operator || null };
      }).catch(function () { return null; });
  }
  // Best-effort "second opinion" on a charger: which services sit within ~600 m
  // (food / WC / fuel / shop). Returns a compact flags object or null. Uses the
  // same OSM (Overpass) worker as tpFindPOI; never blocks the charger result.
  function tpFindAmenitiesNear(lat, lon) {
    try {
      var r = 600;
      var q = '[out:json][timeout:12];(' +
        'node["amenity"~"^(restaurant|cafe|fast_food)$"](around:' + r + ',' + lat + ',' + lon + ');' +
        'node["amenity"="toilets"](around:' + r + ',' + lat + ',' + lon + ');' +
        'node["amenity"="fuel"](around:' + r + ',' + lat + ',' + lon + ');' +
        'node["shop"~"^(supermarket|convenience)$"](around:' + r + ',' + lat + ',' + lon + ');' +
        ');out tags 80;';
      var url = (typeof window !== 'undefined' && window.TP_OVERPASS_URL)
        ? window.TP_OVERPASS_URL : 'https://xkdg-osm.decumano16.workers.dev';
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
      return fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(q), signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) { if (to) clearTimeout(to); if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (j) {
          var sum = { food: false, wc: false, fuel: false, shop: false };
          ((j && j.elements) || []).forEach(function (e) {
            var t = e.tags || {};
            if (t.amenity === 'restaurant' || t.amenity === 'cafe' || t.amenity === 'fast_food') sum.food = true;
            else if (t.amenity === 'toilets') sum.wc = true;
            else if (t.amenity === 'fuel') sum.fuel = true;
            else if (t.shop === 'supermarket' || t.shop === 'convenience') sum.shop = true;
          });
          return (sum.food || sum.wc || sum.fuel || sum.shop) ? sum : null;
        }).catch(function () { if (to) clearTimeout(to); return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  // --- Google Places (New): real named POIs for tour/Lucky-Trip stops ---------
  function tpPlacesWorkerUrl() {
    try {
      if (typeof window !== 'undefined' && window.TP_PLACES_URL) return window.TP_PLACES_URL;
      var v = localStorage.getItem('xkdg_tp_places_url'); if (v) return v;
    } catch (e) {}
    return TP_PLACES_WORKER_DEFAULT;
  }
  function tpPlacesAccessKey() {
    try { var v = localStorage.getItem('xkdg_tp_places_key'); if (v) return v; } catch (e) {}
    return '';
  }
  // Resolve a charger's GOOGLE PLACE ID by name + location, via the xkdg-places worker.
  // A place-ID waypoint is the ONLY way Maps/Polestar pin the exact station (its parking
  // entrance) instead of snapping a bare lat/lon onto the nearest road. Best-effort:
  // resolves to null on any failure (worker missing, no match, station too far). Never throws.
  // Requires the worker to return `place_id` (FieldMask includes places.id).
  function tpResolveChargerPlaceId(name, lat, lon) {
    try {
      var base = tpPlacesWorkerUrl();
      if (!base || !isFinite(lat) || !isFinite(lon)) return Promise.resolve(null);
      var q = (name && String(name).trim()) ? String(name).trim() : 'EV charging station';
      var k = tpPlacesAccessKey();
      var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
        'q=' + encodeURIComponent(q) + '&lat=' + lat + '&lon=' + lon +
        '&radius=2000&max=6' + (k ? '&k=' + encodeURIComponent(k) : '');
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;
      return fetch(url, { signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) { return res.json(); })
        .then(function (j) {
          if (to) clearTimeout(to);
          if (!j || j.status !== 'ok' || !j.results || !j.results.length) return null;
          // Pick the result closest to the charger's own coordinates (the OCM point),
          // within 400 m, that carries a place_id. Guards against a same-named station
          // elsewhere in the search box.
          var best = null, bd = Infinity;
          j.results.forEach(function (rr) {
            if (!rr || !rr.place_id || !isFinite(rr.lat) || !isFinite(rr.lon)) return;
            var d = tpHaversineKm(lat, lon, rr.lat, rr.lon);
            if (d < bd) { bd = d; best = rr; }
          });
          if (best && bd <= 0.4) return best.place_id;   // <=400 m → same station
          return null;
        })
        .catch(function () { if (to) clearTimeout(to); return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  // Map a free-text category (IT/EN, whatever the AI passes) to a concise English
  // search term for Google Places. Ordered: the most SPECIFIC niche families first
  // (Part 2 of the POI document), then the generic/popular ones (Part 1), then a
  // safe default. First regex that matches wins.
  var TP_PLACES_MAP = [
    // ---- Part 2 — misterioso / simbolico / energetico ----
    [/megalit|dolmen|menhir|stone circle|cerchio di pietr|standing stone|luogo di poter|place of power|energetic|ley.?line|linea energ|labirint|labyrinth|cript|crypt|mister|mystery|esoteri|sacro antico|sacred site/, 'megalithic site standing stones sacred mystical place'],
    // ---- Part 2 — spirituale / sacro non turistico ----
    [/eremo|hermitage|monaster|abbazi|abbey|pieve|santuari|sanctuary|pellegrin|pilgrimage|convent/, 'hermitage monastery abbey sanctuary'],
    // ---- Part 2 — guarigione / benessere naturale ----
    [/term|thermal|hot spring|sorgente termal|\bspa\b|wellness|benesser|ritir|retreat|\bzen\b|\berbe\b|herb garden|giardino terap|botanic|botanico/, 'natural hot spring thermal bath wellness spa'],
    // ---- Part 2 — terra e tradizione ----
    [/cantina|vino\b|\bwine\b|vineyard|vigne|weingut|fattoria|\bfarm\b|farmers market|biodinam|biologic|organic/, 'organic winery biodynamic farm'],
    // ---- Part 2 — bellezza appartata / esclusiva (stagionale) ----
    [/spiagg|beach|calet|\bcala\b|\bcove\b|\bmare\b/, 'secluded beach hidden cove'],
    [/lago alpin|alpine lake|baita|rifugio|refuge|chalet|malga/, 'alpine lake mountain refuge'],
    [/trekking|\bhik|sentier|\btrail\b|escursion|cammin/, 'scenic hiking trail nature trail'],
    [/vetta|summit|\bpasso\b|mountain pass|alta quota|\bcima\b/, 'mountain summit scenic mountain pass'],
    [/boutique|agriturism|charme|charming|appartat|secluded|\bretreat\b/, 'boutique hotel charming secluded retreat'],
    [/esclusiv|\blusso\b|luxury|\bresort\b|exclusive/, 'exclusive luxury resort retreat'],
    // ---- Part 2 — natura sacra / fuori dalla folla ----
    [/foresta antic|ancient forest|albero monument|monumental tree|bosco sacr|sacred grove/, 'ancient forest monumental tree'],
    [/sorgent|\bspring\b|cascat|waterfall/, 'sacred spring secluded waterfall'],
    [/grott|\bcave\b|\bgola\b|gorge|formazione rocci|rock formation/, 'cave gorge rock formation'],
    [/belveder|viewpoint|panoram|scenic overlook/, 'scenic viewpoint'],
    // ---- Part 2 — cultura profonda / autentica ----
    [/borgo mediev|medieval village|citt.? fantasma|ghost town/, 'medieval village ghost town'],
    [/rovin|ruins|rudere/, 'atmospheric ruins'],
    [/casa d.?artist|artist house|piccolo museo|small museum|collezione/, 'small museum artist house'],
    // ---- Part 1 — generic / popular ----
    [/castel|castle|fortez|rocca|palazzo|palace|\bburg\b|schloss/, 'castle palace'],
    [/\bmus|galler|\barte\b|\bart\b|cultur/, 'museum art gallery'],
    [/storic|historic|archeolog|archaeolog/, 'historic site archaeological site'],
    [/chies|church|cattedr|cathedral|basilic|tempio|temple|duomo|sinagog|\bculto\b/, 'church cathedral'],
    [/borgh|village|villaggio|old town|\bpaese\b|hamlet/, 'historic village old town'],
    [/centro storic|historic center|piazza|town square/, 'historic center old town'],
    [/\bparc|\bpark|giardin|garden/, 'park garden'],
    [/natur|nature|\blago\b|\blake\b|\bmonte\b|mountain|national park|outdoor/, 'national park scenic nature'],
    [/enogastronom|ristorant|restaurant|\bfood\b|cucina|trattoria|osteria/, 'restaurant local food'],
    [/mercat|market|shopping|artigian|craft/, 'local market craft'],
    [/\bzoo\b|acquari|aquarium|parco a tema|theme park|famigli|\bfamily\b/, 'zoo aquarium theme park family'],
    [/attrazion|tourist|landmark|monument/, 'tourist attraction landmark']
  ];
  function tpPlacesQueryFor(category) {
    var c = String(category || '').toLowerCase();
    for (var i = 0; i < TP_PLACES_MAP.length; i++) {
      if (TP_PLACES_MAP[i][0].test(c)) return TP_PLACES_MAP[i][1];
    }
    return 'tourist attraction';
  }
  // Returns a single best place (rating, then closeness) in the OSM-pick shape, or
  // null. Best-effort: any failure (no worker, no key, error) resolves to null so
  // the caller falls back to OSM. NEVER throws.
  function tpFindPlacesPOI(lat, lon, radiusKm, category, avoidCrowds) {
    try {
      var base = tpPlacesWorkerUrl();
      if (!base) return Promise.resolve(null);
      var q = tpPlacesQueryFor(category);
      var k = tpPlacesAccessKey();
      var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
        'q=' + encodeURIComponent(q) + '&lat=' + lat + '&lon=' + lon +
        '&radius=' + Math.round(Math.max(1, radiusKm) * 1000) + '&max=12' +
        (k ? '&k=' + encodeURIComponent(k) : '');
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
      return fetch(url, { signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) { return res.json(); })
        .then(function (j) {
          if (to) clearTimeout(to);
          if (!j || j.status !== 'ok' || !j.results || !j.results.length) return null;
          var best = null, bk = -Infinity;
          var maxKm = Math.max(60, (radiusKm || 25) * 2.5);   // hard area cap: drop geocoding strays
          j.results.forEach(function (rr) {                    // (e.g. a same-named abbey on another continent)
            if (!isFinite(rr.lat) || !isFinite(rr.lon)) return;
            var d = tpHaversineKm(lat, lon, rr.lat, rr.lon);
            if (d > maxKm) return;                             // too far from the target → ignore
            var rating = (rr.rating != null) ? rr.rating : 3.0;
            var score = rating - 0.1 * d;                 // rating dominates; nearer breaks ties
            if (avoidCrowds) score -= (tpCrowdMult(rr.reviews) - 1);   // quieter spots score higher (opt-in)
            if (score > bk) { bk = score; best = rr; }
          });
          if (!best) return null;
          return { name: best.name, lat: best.lat, lon: best.lon, kind: 'place',
                   access: null, feature: best.name, ev: null, source: 'google',
                   rating: (best.rating != null ? best.rating : null),
                   reviews: (best.reviews != null ? best.reviews : null) };
        })
        .catch(function () { if (to) clearTimeout(to); return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  // LIST variant: returns an array of named places (for a city tour). Best-effort,
  // never throws; [] on any failure so callers degrade gracefully.
  function tpFindPlacesList(lat, lon, radiusKm, category, max) {
    try {
      var base = tpPlacesWorkerUrl();
      if (!base) return Promise.resolve([]);
      var q = tpPlacesQueryFor(category);
      var k = tpPlacesAccessKey();
      var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
        'q=' + encodeURIComponent(q) + '&lat=' + lat + '&lon=' + lon +
        '&radius=' + Math.round(Math.max(1, radiusKm) * 1000) + '&max=' + (max || 20) +
        (k ? '&k=' + encodeURIComponent(k) : '');
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
      return fetch(url, { signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) { return res.json(); })
        .then(function (j) {
          if (to) clearTimeout(to);
          if (!j || j.status !== 'ok' || !j.results) return [];
          return j.results.filter(function (r) { return isFinite(r.lat) && isFinite(r.lon); });
        })
        .catch(function () { if (to) clearTimeout(to); return []; });
    } catch (e) { return Promise.resolve([]); }
  }
  // ---- Events (Ticketmaster via the xkdg-events Worker) -----------------------
  function tpEventsWorkerUrl() {
    try {
      if (typeof window !== 'undefined' && window.TP_EVENTS_URL) return window.TP_EVENTS_URL;
      var v = localStorage.getItem('xkdg_tp_events_url'); if (v) return v;
    } catch (e) {}
    return TP_EVENTS_WORKER_DEFAULT;
  }
  function tpEventsAccessKey() {
    try { var v = localStorage.getItem('xkdg_tp_events_key'); if (v) return v; } catch (e) {}
    return '';
  }
  // Map a free-text category (IT/EN) to Ticketmaster's keyword / segment. Most
  // categories are best as a KEYWORD (festival, jazz, opera...); a few map to a
  // proper segment. Returns { q, classification } — either may be ''.
  function tpEventClassFor(category) {
    var c = String(category || '').toLowerCase().trim();
    if (!c) return { q: '', classification: '' };
    if (/concert|concerto|music|musica|live|gig|dj\b/.test(c)) return { q: '', classification: 'Music' };
    if (/theatre|theater|teatro|opera|ballet|danza|dance|musical/.test(c)) return { q: '', classification: 'Arts & Theatre' };
    if (/sport|calcio|football|match|gara/.test(c)) return { q: '', classification: 'Sports' };
    if (/film|cinema|movie/.test(c)) return { q: '', classification: 'Film' };
    if (/family|famiglia|bambin|kids|child/.test(c)) return { q: 'family', classification: '' };
    // festivals, fairs, comedy, exhibitions, markets... → keyword search (the user's word)
    return { q: c, classification: '' };
  }
  // Returns an array of dated events near a point in a date window. Best-effort,
  // never throws; [] on any failure so callers degrade gracefully.
  function tpFindEvents(lat, lon, radiusKm, opts) {
    opts = opts || {};
    try {
      var base = tpEventsWorkerUrl();
      if (!base) return Promise.resolve([]);
      var cls = tpEventClassFor(opts.category);
      var k = tpEventsAccessKey();
      var qs = 'lat=' + lat + '&lon=' + lon + '&radius=' + Math.round(Math.max(1, radiusKm || 50)) +
               '&max=' + (opts.max || 40) +
               (opts.from ? ('&from=' + encodeURIComponent(opts.from)) : '') +
               (opts.to ? ('&to=' + encodeURIComponent(opts.to)) : '') +
               (cls.q ? ('&q=' + encodeURIComponent(cls.q)) : '') +
               (cls.classification ? ('&classification=' + encodeURIComponent(cls.classification)) : '') +
               (k ? ('&k=' + encodeURIComponent(k)) : '');
      var url = base + (base.indexOf('?') >= 0 ? '&' : '?') + qs;
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
      return fetch(url, { signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) { return res.json(); })
        .then(function (j) {
          if (to) clearTimeout(to);
          if (!j || j.status !== 'ok' || !j.results) return [];
          return j.results.filter(function (r) { return isFinite(r.lat) && isFinite(r.lon) && r.start; });
        })
        .catch(function () { if (to) clearTimeout(to); return []; });
    } catch (e) { return Promise.resolve([]); }
  }

  function tpFindStopover(lat, lon, ev) {
    // Staged so the query stays LIGHT and reliable: 1) sparse types (service area / rest
    // area / fuel + EV chargers) at 8 km then 20 km; 2) only if nothing, a small-radius
    // parking query (parking is too dense to query wide without timing out).
    function tryStop(radius) {
      return tpFindPOI(lat, lon, radius, 'stopover').then(function (resp) {
        if (!resp.ok) return { fail: true };
        return { pick: tpPickStopover(resp.els, resp.chargers, { lat: lat, lon: lon }, ev) };
      });
    }
    return tryStop(8).then(function (a) {
      if (a.pick) return a.pick;
      return tryStop(20).then(function (b) {
        if (b.pick) return b.pick;
        return tpFindPOI(lat, lon, 5, 'parkingonly').then(function (r) {
          if (!r.ok) return null;
          return tpPickStopover(r.els, r.chargers, { lat: lat, lon: lon }, ev);
        });
      });
    }).catch(function () { return null; });
  }

  function tpIsAccessKind(k) { return k === 'parking' || k === 'trailhead' || k === 'picnic' || k === 'camp'; }
  function tpIsFeatureKind(k) { return k === 'reserve' || k === 'park' || k === 'viewpoint' || k === 'peak' || k === 'lake' || k === 'waterfall'; }
  // Real wild features rank above urban parks/picnic so "nature" means nature.
  function tpFeatRank(k) { var R = { reserve: 0, peak: 0, waterfall: 0, lake: 1, viewpoint: 1, park: 2, picnic: 2 }; return (R[k] != null) ? R[k] : 2; }
  // For "nature": pick the best natural FEATURE near the target and OUT of the city
  // (>= minOriginKm from origin so urban parks don't win), preferring real wild
  // features over city parks; then attach the nearest car park / trailhead (<=4 km)
  // as the actual stop. Stop coords = the lot; shown name = the feature.
  function tpPickNatureStop(els, projPoint, origin, maxKm, minOriginKm) {
    els = els || [];
    minOriginKm = (minOriginKm != null) ? minOriginKm : 15;
    function farEnough(p) { return tpHaversineKm(origin.lat, origin.lon, p.lat, p.lon) >= minOriginKm; }
    function within(p) { return !(maxKm && tpHaversineKm(origin.lat, origin.lon, p.lat, p.lon) > maxKm + 5); }
    var feats = els.filter(function (e) { return tpIsFeatureKind(e.kind) && e.named; });
    var access = els.filter(function (e) { return tpIsAccessKind(e.kind); });
    function pickFeat(useMin, useCap) {
      var best = null, bk = Infinity;
      feats.forEach(function (f) {
        if (useMin && !farEnough(f)) return;
        if (useCap && !within(f)) return;
        // real features preferred (rank*15 km-equiv), then closeness to the target point
        var key = tpFeatRank(f.kind) * 15 + tpHaversineKm(projPoint.lat, projPoint.lon, f.lat, f.lon);
        if (key < bk) { bk = key; best = f; }
      });
      return best;
    }
    var feat = pickFeat(true, true) || pickFeat(false, true) || pickFeat(false, false);
    if (feat) {
      var lot = null, ld = Infinity;
      access.forEach(function (a) { var d = tpHaversineKm(feat.lat, feat.lon, a.lat, a.lon); if (d < ld) { ld = d; lot = a; } });
      if (lot && ld <= 4) {
        return { name: feat.name, lat: lot.lat, lon: lot.lon, kind: feat.kind, tags: lot.tags, ev: lot.ev, access: lot.kind, feature: feat.name };
      }
      // No real access point near this feature → do NOT drop the pin on the feature
      // CENTRE (often water / forest / a road crossing it: the "stop in the middle of
      // the road" bug). Fall through to a real access point near the target instead.
    }
    // No usable wild feature → a car park / trailhead out of the city, nearest to the target.
    var aOk = access.filter(farEnough); if (!aOk.length) aOk = access;
    if (aOk.length) {
      var b = null, bd = Infinity;
      aOk.forEach(function (a) { var d = tpHaversineKm(projPoint.lat, projPoint.lon, a.lat, a.lon); if (d < bd) { bd = d; b = a; } });
      return { name: (b.named ? b.name : (b.kind === 'trailhead' ? 'Trailhead' : 'Parking')), lat: b.lat, lon: b.lon, kind: b.kind, tags: b.tags, ev: b.ev, access: b.kind, feature: null };
    }
    return tpPickBestPOI(els, projPoint, origin, maxKm);
  }

  /* ===================================================================== *
   * CHAINED LUCKY TRIP (multi-leg) — Edu's true XKDG model.
   * A chain of legs, ONE per consecutive double-hour, each driven in a
   * direction whose door is favourable in THAT hour; the polygon closes
   * EXACTLY back on the origin. The first legs "explore" (chosen base
   * lengths) and the last two legs are solved so the trip returns home.
   * Pure local-plane geometry (verified), no network calls.
   * ===================================================================== */
  var TP_DOOR_LABEL = {
    Kai: { en: 'Open', han: '\u958b' }, Xiu: { en: 'Rest', han: '\u4f11' }, Sheng: { en: 'Birth', han: '\u751f' },
    JingS: { en: 'View', han: '\u666f' }, Shang: { en: 'Injury', han: '\u50b7' }, Du: { en: 'Delusion', han: '\u675c' },
    JingF: { en: 'Shocking', han: '\u9a5a' }, Jing: { en: 'Shocking', han: '\u9a5a' }, Si: { en: 'Death', han: '\u6b7b' }
  };
  function tpDoorLabel(code) { var d = TP_DOOR_LABEL[code]; return d ? (d.en + ' ' + d.han) : (code || '?'); }

  var TP_D2R = Math.PI / 180;
  function tpUnitVec(deg) { return { e: Math.sin(deg * TP_D2R), n: Math.cos(deg * TP_D2R) }; }

  // Solve the last two leg lengths so the polygon returns to the origin (plane).
  function tpCloseChain(dirsDeg, exploreLens, minKm, maxKm) {
    var N = dirsDeg.length;
    if (N < 2) return null;
    var u = dirsDeg.map(tpUnitVec);
    if (N === 2) {
      var dot = u[0].e * u[1].e + u[0].n * u[1].n;
      if (dot > -0.985) return null;                 // legs not (nearly) opposite -> cannot close
      var L = exploreLens[0] || 50; return [L, L];
    }
    var Re = 0, Rn = 0, lens = [];
    for (var i = 0; i < N - 2; i++) { var d = exploreLens[i] || 50; lens.push(d); Re -= d * u[i].e; Rn -= d * u[i].n; }
    var a = u[N - 2], b = u[N - 1];
    var det = a.e * b.n - b.e * a.n;
    if (Math.abs(det) < 1e-6) return null;             // last two legs collinear
    var dA = (Re * b.n - Rn * b.e) / det;
    var dB = (a.e * Rn - a.n * Re) / det;
    if (dA < minKm - 1e-6 || dB < minKm - 1e-6) return null;
    if (dA > maxKm + 1e-6 || dB > maxKm + 1e-6) return null;
    lens.push(dA, dB); return lens;
  }

  // Favourable directions for the double-hour containing `ms` (evaluated at O).
  function tpHourFavDirs(ms, O, utc, dstOn, noCar) {
    try {
      var off = tpOffsetMin(O.lon, utc, dstOn, ms);
      var sd = new Date(ms + off * 60000);
      var ec = Solar.fromDate(sd).getLunar().getEightChar();
      var gHan = ec.getTimeGan(), brHan = ec.getTimeZhi();
      var dirs = tpScanDirs(sd.getFullYear(), sd.getMonth() + 1, sd.getDate(), gHan, brHan, null, noCar);
      var fav = tpUsableDirs(dirs);
      return {
        brHan: brHan, brPy: (BR_PY[brHan] || brHan), gHan: gHan,
        dirs: fav.map(function (d) {
          return {
            dir: d.dir, deg: TP_DIR_DEG[d.dir], door: (d.eval && d.eval.door) || '',
            combined: (d.eval && d.eval.score) || 1, sanqi: !!(d.eval && d.eval.hasSanQi),
            configs: (d.eval && d.eval.configs) || []
          };
        })
      };
    } catch (e) { return null; }
  }

  // The future daytime double-hours of `dateStr`, each with its favourable dirs.
  // noCar (optional): when true, the Injury-door/San-Qi rescue does not apply (walking route).
  function tpDayHourSlots(O, dateStr, utc, dstOn, nowMs, marginMs, noCar) {
    var DAY_START_H = 5, DAY_END_H = 21, out = [], seen = {};
    var off = tpOffsetMin(O.lon, utc, dstOn, (function(){ try { return new Date(dateStr + 'T12:00:00').getTime(); } catch(e){ return null; } })());
    var minMs = nowMs + marginMs;
    for (var h = DAY_START_H; h <= DAY_END_H; h++) {
      for (var mm = 0; mm < 60; mm += 20) {
        var d = new Date(dateStr + 'T' + String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':00');
        var ms = d.getTime();
        if (ms < minMs) continue;
        var sd = new Date(ms + off * 60000);
        var br = Solar.fromDate(sd).getLunar().getEightChar().getTimeZhi();
        if (seen[br]) continue;                         // first entry into this double-hour at/after now
        seen[br] = true;
        var fav = tpHourFavDirs(ms, O, utc, dstOn, noCar);
        if (fav && fav.dirs.length) out.push({ startMs: ms, br: br, fav: fav });
      }
    }
    out.sort(function (a, b) { return a.startMs - b.startMs; });
    return out;
  }

  // ---- 8-wind compass helpers (shared by lucky round-trips and chain loops) ----
  var TP_DIRS8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function tpDir8Step(a, b) {                  // 0,1,2… 45° steps between two 8-wind labels
    var ia = TP_DIRS8.indexOf(a), ib = TP_DIRS8.indexOf(b);
    if (ia < 0 || ib < 0) return 99;
    var d = Math.abs(ia - ib); return Math.min(d, 8 - d);
  }
  function tpDir8Near(a, b) { return tpDir8Step(a, b) <= 1; }   // within one 45° step
  function tpDir8Exact(a, b) { return tpDir8Step(a, b) === 0; }

  function tpProposeChainTrips(opts) {
    opts = opts || {};
    var O = opts.origin || TP_DEFAULT.origin;
    var utc = (opts.utc != null) ? opts.utc : 1;
    var dstOn = !!opts.dstOn;
    var nowMs = (opts.nowMs != null) ? opts.nowMs : Date.now();
    var dateStr = opts.dateStr || tpLocalISO(new Date(nowMs));
    var marginMs = ((opts.departMarginMin != null) ? opts.departMarginMin : 20) * 60000;
    if (dateStr !== tpLocalISO(new Date(nowMs))) marginMs = -(24 * 3600000);  // future day: no floor
    var maxLegs = Math.min(opts.maxLegs || 5, 5);
    var minKm = opts.minLegKm || 10, maxKm = opts.maxLegKm || 140;
    var speed = opts.speedKmh || 70, count = opts.count || 5, maxDirsPerHour = 4;
    var wantDir = opts.firstDir || null;          // bias/limit loops by their FIRST leg's direction
    var firstDirOnly = !!opts.firstDirOnly;       // keep ONLY loops whose first leg heads wantDir (±45°)

    if (typeof Solar === 'undefined') return { ok: false, reason: 'no_solar' };
    var hours = tpDayHourSlots(O, dateStr, utc, dstOn, nowMs, marginMs);
    if (hours.length < 2) return { ok: false, reason: 'not_enough_hours', date: dateStr };

    var chains = [];
    for (var si = 0; si < hours.length; si++) {
      for (var N = 2; N <= maxLegs && si + N <= hours.length; N++) {
        var win = hours.slice(si, si + N);
        var perHour = win.map(function (hh) {
          return hh.fav.dirs.slice().sort(function (a, b) { return b.combined - a.combined; }).slice(0, maxDirsPerHour);
        });
        var combos = [[]];
        for (var k = 0; k < perHour.length; k++) {
          var nx = [];
          for (var c = 0; c < combos.length; c++) for (var p = 0; p < perHour[k].length; p++) nx.push(combos[c].concat([perHour[k][p]]));
          combos = nx; if (combos.length > 4000) break;
        }
        for (var ci = 0; ci < combos.length; ci++) {
          var combo = combos[ci];
          if (combo.length !== N) continue;
          var dirsDeg = combo.map(function (x) { return x.deg; });
          var baseSet = (N <= 2) ? [50] : [40, 70, 100];
          for (var bi = 0; bi < baseSet.length; bi++) {
            var explore = []; for (var e = 0; e < N - 2; e++) explore.push(baseSet[bi]);
            var lens = tpCloseChain(dirsDeg, explore, minKm, maxKm);
            if (!lens) continue;
            var ok = true, pts = [O], legs = [];
            for (var L = 0; L < N; L++) {
              var km = lens[L], durH = km / speed;
              if (durH > 2.2) { ok = false; break; }      // a leg must fit inside its ~2h double-hour
              var from = pts[pts.length - 1];
              var to = tpDestPoint(from, dirsDeg[L], km);
              var depMs = win[L].startMs, arrMs = depMs + durH * 3600000;
              legs.push({
                n: L + 1, dir: combo[L].dir, deg: dirsDeg[L], km: Math.round(km),
                door: combo[L].door, doorLabel: tpDoorLabel(combo[L].door),
                br: win[L].br, brPy: (BR_PY[win[L].br] || win[L].br),
                sanqi: combo[L].sanqi, combined: combo[L].combined,
                from: { lat: from.lat, lon: from.lon }, to: { lat: to.lat, lon: to.lon },
                departCn: tpChineseHourAt(depMs, from.lon, utc, dstOn),
                arriveCn: tpChineseHourAt(arrMs, to.lon, utc, dstOn)
              });
              pts.push(to);
            }
            if (!ok) continue;
            var endPt = pts[pts.length - 1];
            var resid = tpHaversineKm(endPt.lat, endPt.lon, O.lat, O.lon);
            if (resid > 6) continue;                       // must return (near-)exactly to Vienna
            var avg = legs.reduce(function (s, l) { return s + l.combined; }, 0) / legs.length;
            var sanqiCount = legs.filter(function (l) { return l.sanqi; }).length;
            var maxClean = TP_SCORE_BASE + TP_BONUS_SANQI + TP_BONUS_GOODDEITY;
            var score5 = Math.max(1, Math.min(5, Math.round(avg / maxClean * 5)));
            chains.push({
              legs: legs, n: N, stops: N - 1, startMs: win[0].startMs, score: score5, avg: avg,
              sanqiCount: sanqiCount, resid: Math.round(resid * 10) / 10,
              sig: combo.map(function (x) { return x.dir; }).join('-')
            });
            break;                                          // one closing base length is enough
          }
        }
      }
    }
    if (!chains.length) return { ok: false, reason: 'no_closed_chain', date: dateStr };
    if (wantDir && firstDirOnly) {
      chains = chains.filter(function (c) { return tpDir8Near(c.legs[0].dir, wantDir); });
      if (!chains.length) return { ok: false, reason: 'no_chain_toward_dir', date: dateStr, requestedDir: wantDir };
    }
    chains.sort(function (a, b) {
      if (wantDir) {                                            // first leg toward the requested direction first
        var as = tpDir8Step(a.legs[0].dir, wantDir), bs = tpDir8Step(b.legs[0].dir, wantDir);
        var ar = as === 0 ? 0 : (as <= 1 ? 1 : 2), br = bs === 0 ? 0 : (bs <= 1 ? 1 : 2);  // exact < adjacent < far
        if (ar !== br) return ar - br;
      }
      return (b.score - a.score) || (b.sanqiCount - a.sanqiCount) || (a.n - b.n) || (a.startMs - b.startMs);
    });
    var picked = [], seen2 = {};
    if (opts.onePerN) {
      // Best loop for EACH leg-count (2..maxLegs) → one option with 1 stop, one with 2, 3, 4…
      var byN = {};
      for (var z = 0; z < chains.length; z++) { var nn = chains[z].n; if (!byN[nn]) byN[nn] = chains[z]; }
      picked = Object.keys(byN).map(function (k) { return byN[k]; }).sort(function (a, b) { return a.n - b.n; });
    } else {
      for (var x = 0; x < chains.length && picked.length < count; x++) {
        var key = chains[x].n + '|' + chains[x].legs[0].dir;
        if (seen2[key]) continue; seen2[key] = true; picked.push(chains[x]);
      }
      for (var y = 0; y < chains.length && picked.length < count; y++) if (picked.indexOf(chains[y]) === -1) picked.push(chains[y]);
    }
    return { ok: true, date: dateStr, origin: { lat: O.lat, lon: O.lon }, count: picked.length, chains: picked };
  }

  /* Generate several VARIED lucky round-trip proposals for one day: probes
   * multiple directions × distances (estimate-only, no network), scores each,
   * and returns the best few diversified by direction and distance band. The
   * real route is computed later, when the user picks one. */
  function tpProposeLuckyTrips(opts) {
    opts = opts || {};
    var O = opts.origin || TP_DEFAULT.origin;
    var utc = (opts.utc != null) ? opts.utc : 1;
    var dstOn = !!opts.dstOn;
    var dateStr = opts.dateStr || tpLocalISO(new Date());
    var maxKm = opts.maxRadiusKm || 200;
    var stayMin = (opts.stayMinH != null) ? opts.stayMinH : 1.5;
    var stayMax = (opts.stayMaxH != null) ? opts.stayMaxH : 3;
    var topN = opts.topN || 4;
    var category = opts.category || null;
    var avoidCrowds = !!opts.avoidCrowds;   // opt-in "off the beaten path" (needs Places review counts)
    var nowMs = (opts.nowMs != null) ? opts.nowMs : Date.now();
    var minKm = (opts.minOriginKm != null) ? opts.minOriginKm : 15;   // selectable floor (0 = in-city)
    var bearings = [0, 45, 90, 135, 180, 225, 270, 315];
    // When the floor is small (city scale) probe SHORT distances too, so in-city
    // famous places can win; otherwise keep the excursion spread.
    var dflt = (minKm < 12) ? [Math.max(1, minKm || 2), 4, 8, 15, 30, 60, 120] : [30, 80, 150];
    var dists = (opts.distancesKm || dflt).filter(function (d) { return d <= maxKm && d >= Math.max(0, minKm * 0.5); });
    if (!dists.length) dists = [Math.min(Math.max(minKm, 2), maxKm)];

    var jobs = [];
    bearings.forEach(function (b) {
      dists.forEach(function (km) {
        var Dst = tpDestPoint(O, b, km);
        jobs.push(
          tpPlanRoundTrip({ origin: O, dest: Dst, utc: utc, dstOn: dstOn, dateStr: dateStr,
            stayMinH: stayMin, stayMaxH: stayMax, estimateOnly: true, nowMs: nowMs })
            .then(function (r) { if (r) { r.bearing = b; r.snapDir = tpSnapDir(b); r.km = km; r.dest = Dst; } return r; })
            .catch(function () { return null; })
        );
      });
    });

    return Promise.all(jobs).then(function (list) {
      var ok = list.filter(function (r) { return r && r.ok; });
      if (opts.direction) ok = ok.filter(function (r) { return tpDir8Near(r.snapDir, opts.direction); });  // keep only round-trips toward the requested direction
      ok.sort(function (a, b) { return b.combined - a.combined; });
      function band(km) { return km <= 60 ? 'near' : (km <= 120 ? 'mid' : 'far'); }
      var picked = [], usedDir = {};
      // 1) best of each distance band → guarantees variety of distance (near / mid / far)
      ['near', 'mid', 'far'].forEach(function (bd) {
        for (var i = 0; i < ok.length; i++) {
          if (band(ok[i].km) === bd && picked.indexOf(ok[i]) < 0) { picked.push(ok[i]); usedDir[ok[i].snapDir] = 1; break; }
        }
      });
      // 2) fill remaining slots with the next best in a NEW direction
      for (var i = 0; i < ok.length && picked.length < topN; i++) {
        if (picked.indexOf(ok[i]) >= 0 || usedDir[ok[i].snapDir]) continue;
        picked.push(ok[i]); usedDir[ok[i].snapDir] = 1;
      }
      // 3) still short? take the next best regardless
      for (var j = 0; j < ok.length && picked.length < topN; j++) { if (picked.indexOf(ok[j]) < 0) picked.push(ok[j]); }
      picked.sort(function (a, b) { return b.combined - a.combined; });

      function fmtCn(h) { return h ? (h.py + ' ' + h.han + ' · TST ' + h.tst) : null; }
      function buildProposal(r, poi) {
        var dlat = poi ? poi.lat : r.dest.lat;
        var dlon = poi ? poi.lon : r.dest.lon;
        return {
          direction: r.snapDir, bearing: r.bearing,
          km: poi ? Math.round(tpHaversineKm(O.lat, O.lon, dlat, dlon)) : r.km,
          place: poi ? poi.name : null,
          place_kind: poi ? poi.kind : null,
          place_access: poi && poi.access ? poi.access : null,
          place_feature: poi && poi.feature ? poi.feature : null,
          ev_charging: !!(poi && poi.ev),
          ev_power: (poi && poi.ev && poi.ev.power) ? poi.ev.power : null,
          depart: r.outbound.depClock, arrive: r.outbound.arriveClock,
          depart_cn: fmtCn(r.outbound.departCn), arrive_cn: fmtCn(r.outbound.arriveCn),
          stay_h: r.stayH, return_depart: r.back.depClock, return_arrive: r.back.arriveClock,
          return_depart_cn: fmtCn(r.back.departCn), return_arrive_cn: fmtCn(r.back.arriveCn),
          score: Math.round(r.combined * 5), clean: r.clean, widened_stay: r.widenedStay,
          dest_lat: Math.round(dlat * 100000) / 100000, dest_lon: Math.round(dlon * 100000) / 100000
        };
      }

      if (!category) {
        return {
          date: dateStr, origin: O, category: null, anyClean: picked.some(function (r) { return r.clean; }),
          proposals: picked.map(function (r) { return buildProposal(r, null); })
        };
      }
      // Category given → find a REAL place near each picked point.
      // Nature searches a tighter radius (25 km) so the stop stays near the target
      // instead of reaching back toward the city; other categories use 40 km.
      // In city mode (small maxKm) shrink the POI radius so a stop is precise.
      var catKey = tpPoiCategory(category);
      var poiRadius = Math.max(3, Math.min((catKey === 'nature') ? 25 : 40, maxKm));
      var poiDbg = [];
      return Promise.all(picked.map(function (r) {
        var dbg = { dest: [Math.round(r.dest.lat * 1000) / 1000, Math.round(r.dest.lon * 1000) / 1000], nature: -1, broad40: -1, broad90: -1, pick: null };
        poiDbg.push(dbg);
        return tpFindPlacesPOI(r.dest.lat, r.dest.lon, poiRadius, category, avoidCrowds).then(function (gp) {
          if (gp) { dbg.pick = gp.name + ' (google)'; return { poi: gp, failed: false }; }
          return tpFindPOI(r.dest.lat, r.dest.lon, poiRadius, category).then(function (resp) {
          if (!resp.ok) { dbg.nature = 'FAIL'; return { poi: null, failed: true }; }
          resp.els.forEach(function (p) { p.ev = tpNearestCharger(p, resp.chargers); });
          dbg.nature = resp.els.length;
          var pick = (catKey === 'nature')
            ? tpPickNatureStop(resp.els, r.dest, O, maxKm, minKm)
            : tpPickBestPOI(resp.els, r.dest, O, maxKm);
          if (pick) { dbg.pick = pick.name; return { poi: pick, failed: false }; }
          // service OK but the specific category was empty here → fall back to the nearest
          // named place, widening the radius before giving up so a real name appears in
          // populated areas (only truly remote points end up without a place).
          return tpFindPOI(r.dest.lat, r.dest.lon, poiRadius, 'broad').then(function (r2) {
            if (!r2.ok) { dbg.broad40 = 'FAIL'; return { poi: null, failed: true }; }
            r2.els.forEach(function (p) { p.ev = tpNearestCharger(p, r2.chargers); });
            dbg.broad40 = r2.els.length;
            var b1 = tpPickBestPOI(r2.els, r.dest, O, maxKm);
            if (b1) { dbg.pick = b1.name; return { poi: b1, failed: false }; }
            return tpFindPOI(r.dest.lat, r.dest.lon, 90, 'broad').then(function (r3) {
              if (!r3.ok) { dbg.broad90 = 'FAIL'; return { poi: null, failed: true }; }
              r3.els.forEach(function (p) { p.ev = tpNearestCharger(p, r3.chargers); });
              dbg.broad90 = r3.els.length;
              var b3 = tpPickBestPOI(r3.els, r.dest, O, 0); // last resort: no origin cap → guarantee a name if any data
              if (b3) dbg.pick = b3.name;
              return { poi: b3, failed: false };
            });
          });
          }).catch(function () { dbg.pick = 'EXCEPTION'; return { poi: null, failed: true }; });
        });
      })).then(function (res) {
        try { window._tpLastPoiDebug = poiDbg; } catch (e) {}
        // CORRECTNESS FIX (Edu directive): the POI search above can fall back all the way to a
        // 90 km, origin-DISTANCE-UNCAPPED lookup ("guarantee a name if any data"), so the real
        // place found can sit at a TRUE bearing from origin that has nothing to do with the
        // synthetic compass ray (r.bearing/r.snapDir) that was searched. Showing that stale
        // synthetic direction — while the Qimen favourability was also only ever validated for
        // THAT synthetic direction — would label a place with the wrong compass direction AND
        // claim a "clean"/favourable verdict that was never actually checked for the real place.
        // So: re-run the round-trip evaluation on the REAL poi coordinates (bearing, door
        // favourability, everything) and only keep proposals still favourable at the TRUE
        // direction. Never present a direction or a verdict that doesn't match the real place.
        var rescored = picked.map(function (r, i) {
          var poi = res[i].poi;
          if (!poi) return Promise.resolve({ r: r, poi: null, dropped: false });
          var realBearing = tpBearing(O.lat, O.lon, poi.lat, poi.lon);
          return tpPlanRoundTrip({ origin: O, dest: { lat: poi.lat, lon: poi.lon }, utc: utc, dstOn: dstOn, dateStr: dateStr,
            stayMinH: stayMin, stayMaxH: stayMax, estimateOnly: true, nowMs: nowMs })
            .then(function (r2) {
              if (!r2 || !r2.ok) return { r: r, poi: poi, dropped: true };  // not favourable at the REAL direction -> drop
              r2.bearing = realBearing; r2.snapDir = tpSnapDir(realBearing);
              r2.km = Math.round(tpHaversineKm(O.lat, O.lon, poi.lat, poi.lon)); r2.dest = { lat: poi.lat, lon: poi.lon };
              return { r: r2, poi: poi, dropped: false };
            })
            .catch(function () { return { r: r, poi: poi, dropped: true }; });
        });
        return Promise.all(rescored).then(function (final) {
          var kept = final.filter(function (x) { return !x.dropped; });
          var droppedForRealDirection = final.length - kept.length;
          return {
            date: dateStr, origin: O, category: tpPoiCategory(category),
            anyClean: kept.some(function (x) { return x.r.clean; }),
            some_without_place: kept.some(function (x) { return !x.poi; }),
            poi_service_error: res.some(function (x) { return x.failed; }),
            poi_found_but_not_favourable: droppedForRealDirection || undefined,
            proposals: kept.map(function (x) { return buildProposal(x.r, x.poi); })
          };
        });
      });
    });
  }

  // ── DIAGNOSTICS: why does Google Maps differ from the planned stops? ─────────
  // Returns the runtime facts the in-app AI needs to answer that: the ACTUAL Maps
  // link on the button, its parsed waypoints (name vs anonymous coordinate), the
  // planned itinerary it was built from, the real-road route state (and whether it
  // matches THIS trip), the drop/cap rules, and a plain diff. Read-only.
  function tpDiagnoseMapsExport() {
    var out = { ok: true, what: 'Diagnostics for the last trip\'s "Open in Google Maps" link.' };
    try {
      var btn = document.getElementById('tp-maps-open');
      var url = (btn && btn._url) || null;
      out.maps_link_present = !!url;
      if (url) {
        out.maps_url = url;
        var pick = function (re) { var m = url.match(re); return m ? decodeURIComponent(m[1]) : null; };
        out.link_origin = pick(/[?&]origin=([^&]*)/);
        out.link_destination = pick(/[?&]destination=([^&]*)/);
        var wpRaw = (url.match(/[?&]waypoints=([^&]*)/) || [])[1] || '';
        var list = wpRaw ? decodeURIComponent(wpRaw).split('|') : [];
        out.link_waypoint_count = list.length;
        out.link_waypoints = list.map(function (t) {
          var coord = /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(t);
          return { value: t, kind: coord ? 'coordinate (anonymous lettered pin in Maps)' : 'name (tappable named pin; Maps is forced through it)' };
        });
      } else {
        out.note = 'No Maps link built yet — plan a trip and make sure the "Send to Google Maps" section has rendered.';
      }

      var r = window._tpLastResult || null;
      if (r) {
        out.planned = { from: r.origin, to: r.dest, bearing_deg: r.bearing, snapped_dir: r.snapped,
          real_road_route_used: r.real_route, road_km: r.km, driving_time: r.driving_time, planned_stops: r.stops };
        var stops = [];
        (r.legs || []).forEach(function (l) {
          if (l.kind === 'charge' || l.kind === 'stop')
            stops.push({ kind: l.kind, cashDir: l.cashDir || null, at: l.at, lat: l.lat, lon: l.lon });
        });
        out.planned_stop_list = stops;
      } else { out.planned = null; }

      out.export_rules = { max_waypoints: TP_MAPS_MAX_WAYPOINTS, off_road_drop_km: TP_WAYPOINT_MAX_OFFKM,
        note: 'A planned stop more than off_road_drop_km from the fast road is dropped from the link; Maps keeps at most max_waypoints.' };

      var routeLoaded = !!TP_LAST_ROUTE;
      out.real_route_loaded = routeLoaded;
      if (routeLoaded) {
        var ridx = tpBuildRouteIndex(TP_LAST_ROUTE);
        out.real_route_km = ridx ? Math.round((ridx.distanceMeters || ridx.total) / 1000) : null;
        out.real_route_drive_h = (ridx && ridx.durationSec) ? Math.round(ridx.durationSec / 360) / 10 : null;
        var live = window._tpLive;
        if (live && live.originPos && live.destPos) {
          out.real_route_matches_trip = tpRouteMatches(TP_LAST_ROUTE,
            { lat: live.originPos.lat, lng: live.originPos.lon }, { lat: live.destPos.lat, lng: live.destPos.lon });
          out.matches_note = out.real_route_matches_trip
            ? 'The route used for the export matches this trip.'
            : 'WARNING: the loaded route does NOT match this trip — the export may project stops onto a stale route or fall back to a direct link.';
        }
      } else {
        out.real_route_note = 'No real road route loaded — the link is exported as a DIRECT origin→destination route (planned stops are not added as waypoints).';
      }

      if (out.planned && out.link_waypoint_count != null) {
        out.diff_hint = 'Planned stops: ' + (out.planned.planned_stops || 0) + ' · waypoints actually in the link: ' + out.link_waypoint_count +
          '. A gap usually means stops were dropped (off the fast road), capped (>' + TP_MAPS_MAX_WAYPOINTS + '), or the link fell back to a direct route.';
      }
      out.why_maps_can_differ = 'Google re-plans the road BETWEEN the points it receives, using live traffic the app did not have. ' +
        'Coordinate waypoints become anonymous lettered pins; named ones are forced through and tappable. A small divergence is normal; ' +
        'a large one means stops were dropped or never passed. A per-segment time tooltip in Maps (e.g. "3 hr 37 min") is ONE leg, not the whole trip.';
    } catch (e) { out.ok = false; out.error = String((e && e.message) || e); }
    return out;
  }

  /* ===================================================================== *
   * CITY TOUR (multi-stop, intra-city) — same direction-per-hour model,
   * at any scale (no minimum distance). For a chosen city BASE and date,
   * fetch famous places INSIDE the city (Google Places) and assign each to
   * the double-hour in which its direction FROM THE BASE is favourable —
   * building a one-day walking/short-drive tour. Pure reuse of tpDayHourSlots
   * (the per-hour favourable-direction engine) + Places. Async (Places).
   * ===================================================================== */
  function tpProposeCityTour(opts) {
    opts = opts || {};
    var O = opts.origin || TP_DEFAULT.origin;
    var utc = (opts.utc != null) ? opts.utc : 1;
    var dstOn = !!opts.dstOn;
    var nowMs = (opts.nowMs != null) ? opts.nowMs : Date.now();
    var dateStr = opts.dateStr || tpLocalISO(new Date(nowMs));
    var marginMs = ((opts.departMarginMin != null) ? opts.departMarginMin : 20) * 60000;
    if (dateStr !== tpLocalISO(new Date(nowMs))) marginMs = -(24 * 3600000);   // future day: no floor
    var radiusKm = opts.radiusKm || 8;                 // city extent
    var minKm = (opts.minOriginKm != null) ? opts.minOriginKm : 0;   // 0 = include everything in town
    var category = opts.category || 'top tourist attractions';
    var maxStops = opts.maxStops || 6;
    var avoidCrowds = !!opts.avoidCrowds;   // opt-in "off the beaten path" (needs Places review counts)

    if (typeof Solar === 'undefined') return Promise.resolve({ ok: false, reason: 'no_solar', date: dateStr });
    // City Tour is ALWAYS a walking route (its Maps export is hardcoded 'walking' below), so
    // the Injury-door San-Qi rescue — travel-only in the canonical rule — must NOT apply here.
    var hours = tpDayHourSlots(O, dateStr, utc, dstOn, nowMs, marginMs, true);
    if (!hours.length) return Promise.resolve({ ok: false, reason: 'no_hours', date: dateStr });

    return tpFindPlacesList(O.lat, O.lon, radiusKm, category, 20).then(function (places) {
      if (!places || !places.length) return { ok: false, reason: 'no_places', date: dateStr, category: category };
      // bearing + 8-wind + distance from the base for each place
      places = places.map(function (p) {
        var b = tpBearing(O.lat, O.lon, p.lat, p.lon);
        return { name: p.name, lat: p.lat, lon: p.lon, rating: (p.rating != null ? p.rating : null),
                 reviews: (p.reviews != null ? p.reviews : null),
                 bearing: b, dir8: tpSnapDir(b), distKm: tpHaversineKm(O.lat, O.lon, p.lat, p.lon) };
      }).filter(function (p) { return p.distKm >= minKm; });   // honour the chosen floor
      if (!places.length) return { ok: false, reason: 'no_places_beyond_min', date: dateStr };

      // Greedy route-builder: walk the double-hours in time order. For each hour
      // pick the favourable direction (best score first) that still has an unused
      // famous place, and among those take the one NEAREST TO WHERE WE CURRENTLY
      // ARE — not nearest to the base — so the day flows as a continuous tour
      // instead of zig-zagging out and back from the centre. The direction is
      // still measured from the base (the metaphysical anchor); this only reorders
      // the visiting sequence and never relaxes the direction rule.
      var used = {}, stops = [];
      var refLat = O.lat, refLon = O.lon;             // the walk starts at the base
      for (var hi = 0; hi < hours.length && stops.length < maxStops; hi++) {
        var hh = hours[hi];
        var favs = hh.fav.dirs.slice().sort(function (a, b) { return b.combined - a.combined; });
        var chosen = -1, chosenFav = null, chosenHop = 0;
        for (var fi = 0; fi < favs.length && chosen < 0; fi++) {
          var fav = favs[fi], best = -1, bd = Infinity, bestHop = 0;
          for (var pi = 0; pi < places.length; pi++) {
            if (used[pi]) continue;
            if (!tpDir8Near(places[pi].dir8, fav.dir)) continue;     // within one 45° step
            var hop = tpHaversineKm(refLat, refLon, places[pi].lat, places[pi].lon);
            var eff = avoidCrowds ? (hop * tpCrowdMult(places[pi].reviews)) : hop;  // busier = "farther" (opt-in)
            if (eff < bd) { bd = eff; best = pi; bestHop = hop; }
          }
          if (best >= 0) { chosen = best; chosenFav = fav; chosenHop = bestHop; }
        }
        if (chosen >= 0) {
          used[chosen] = 1;
          var p = places[chosen];
          stops.push({
            place: p.name, dest_lat: Math.round(p.lat * 100000) / 100000, dest_lon: Math.round(p.lon * 100000) / 100000,
            // CORRECTNESS FIX: show the place's OWN true direction (p.dir8, from its real
            // bearing) — not chosenFav.dir, which is the favourable bucket that was SEARCHED
            // for that hour. tpDir8Near only requires them to be within one 45° step, so they
            // can legitimately differ; the label shown must always match the real place.
            rating: p.rating, direction: p.dir8, bearing: Math.round(p.bearing),
            dist_km: Math.round(p.distKm * 10) / 10,
            hop_km: Math.round(chosenHop * 10) / 10,         // distance from the previous stop
            door: chosenFav.door, doorLabel: tpDoorLabel(chosenFav.door),
            score: Math.round((chosenFav.combined || 0) * 5),
            br: hh.br, brPy: (BR_PY[hh.br] || hh.br),
            hour_cn: tpChineseHourAt(hh.startMs, O.lon, utc, dstOn)
          });
          refLat = p.lat; refLon = p.lon;                   // continue the walk from here
        }
      }

      // Leftovers made ACTIONABLE: for every famous place we couldn't fit, list the
      // double-hours today when its direction from the base is favourable (so a
      // student with spare time can still slot it in), and sort nearest-first.
      // Places with no favourable window today are flagged so they aren't proposed
      // for a direction-based visit by mistake.
      var leftover = [];
      for (var li = 0; li < places.length; li++) {
        if (used[li]) continue;
        var lp = places[li], windows = [];
        for (var wj = 0; wj < hours.length; wj++) {
          var wf = hours[wj].fav.dirs, okHour = false;
          for (var wk = 0; wk < wf.length; wk++) { if (tpDir8Near(lp.dir8, wf[wk].dir)) { okHour = true; break; } }
          if (okHour) windows.push(tpChineseHourAt(hours[wj].startMs, O.lon, utc, dstOn));
        }
        leftover.push({ place: lp.name, direction: lp.dir8, dist_km: Math.round(lp.distKm * 10) / 10,
                        fav_hours: windows.slice(0, 4), no_fav_today: windows.length === 0 });
      }
      leftover.sort(function (a, b) { return a.dist_km - b.dist_km; });

      return { ok: true, date: dateStr, origin: O, category: category, city_radius_km: radiusKm,
               stops: stops, places_found: places.length, leftover: leftover.slice(0, 8) };
    }).catch(function (e) { return { ok: false, reason: 'error', error: (e && e.message) || String(e), date: dateStr }; });
  }

  /* Given a base, a date window and a category, fetch REAL dated events nearby and —
   * because an event's DATE is FIXED — check whether that date has a favourable
   * double-hour whose favourable directions include the event's direction from the
   * base. "Catchable" events come back with the matching hour/door/score; the rest
   * are listed as found-but-not-auspicious-to-reach-that-day. */
  function tpProposeLuckyEvents(opts) {
    opts = opts || {};
    var O = opts.origin || TP_DEFAULT.origin;
    var utc = (opts.utc != null) ? opts.utc : 1;
    var dstOn = !!opts.dstOn;
    var nowMs = (opts.nowMs != null) ? opts.nowMs : Date.now();
    var radiusKm = opts.radiusKm || 80;
    var category = opts.category || 'festival';
    var todayIso = tpLocalISO(new Date(nowMs));
    var from = opts.from || todayIso;
    var to = opts.to || tpLocalISO(new Date(nowMs + 30 * 86400000));
    var maxOut = opts.maxOut || 12;

    if (typeof Solar === 'undefined') return Promise.resolve({ ok: false, reason: 'no_solar' });

    return tpFindEvents(O.lat, O.lon, radiusKm, { from: from, to: to, category: category, max: 60 }).then(function (events) {
      if (!events || !events.length) return { ok: false, reason: 'no_events', from: from, to: to, category: category };

      var slotsByDate = {};   // the day's favourable double-hour slots, computed once per date
      function slotsFor(dateStr) {
        if (slotsByDate[dateStr]) return slotsByDate[dateStr];
        var margin = (dateStr === todayIso) ? (20 * 60000) : -(24 * 3600000);   // future day: no floor
        var s = tpDayHourSlots(O, dateStr, utc, dstOn, nowMs, margin) || [];
        slotsByDate[dateStr] = s;
        return s;
      }

      var good = [], skipped = [];
      events.forEach(function (ev) {
        var dateStr = String(ev.start).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
        var bearing = tpBearing(O.lat, O.lon, ev.lat, ev.lon);
        var dir8 = tpSnapDir(bearing);
        var distKm = tpHaversineKm(O.lat, O.lon, ev.lat, ev.lon);
        var slots = slotsFor(dateStr);
        var bestSlot = null, bestFav = null;
        for (var si = 0; si < slots.length; si++) {
          var favs = slots[si].fav.dirs;
          for (var fi = 0; fi < favs.length; fi++) {
            if (!tpDir8Near(dir8, favs[fi].dir)) continue;
            if (!bestFav || (favs[fi].combined || 0) > (bestFav.combined || 0)) { bestFav = favs[fi]; bestSlot = slots[si]; }
          }
        }
        var rec = {
          event: ev.name, date: dateStr, event_start: ev.start, local_time: ev.local_time || null,
          venue: ev.venue || null, city: ev.city || null, category: ev.category || null, url: ev.url || null,
          direction: dir8, bearing: Math.round(bearing), dist_km: Math.round(distKm * 10) / 10,
          dest_lat: Math.round(ev.lat * 100000) / 100000, dest_lon: Math.round(ev.lon * 100000) / 100000
        };
        if (bestSlot && bestFav) {
          rec.hour_cn = tpChineseHourAt(bestSlot.startMs, O.lon, utc, dstOn);
          rec.br = bestSlot.br; rec.brPy = (BR_PY[bestSlot.br] || bestSlot.br);
          rec.door = bestFav.door; rec.doorLabel = tpDoorLabel(bestFav.door);
          rec.score = Math.round((bestFav.combined || 0) * 5);
          good.push(rec);
        } else {
          skipped.push(rec);
        }
      });

      good.sort(function (a, b) { return (b.score - a.score) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0); });
      skipped.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

      return { ok: true, origin: O, from: from, to: to, category: category,
               events_found: events.length, events: good.slice(0, maxOut), skipped: skipped.slice(0, 8) };
    }).catch(function (e) { return { ok: false, reason: 'error', error: (e && e.message) || String(e) }; });
  }

  window.TravelPlanner = {
    plan: tpPlan,
    planRoundTrip: tpPlanRoundTrip,
    proposeLuckyTrips: tpProposeLuckyTrips,
    proposeChainTrips: tpProposeChainTrips,
    // Score ONE palace of a ROTATING (转盘) chart with the canonical predicate —
    // the same auspiciousness score the Travel Planner uses for directions. Never
    // the flying chart. Returns { ok, score, hasSanQi, zhiFu, zhiShi, deity, door,
    // configs, ... } or null.
    scoreRotatingPalace: function (chart, pal) {
      try {
        if (!chart || !chart.palaces) return null;
        var p = (typeof pal === 'number') ? pal : parseInt(pal, 10);
        if (!p || !chart.palaces[p]) return null;
        var configs = (typeof QMDJWaterScanner !== 'undefined' && typeof QMDJWaterScanner.checkRotatingPalace === 'function')
          ? (QMDJWaterScanner.checkRotatingPalace(chart, p) || []) : [];
        var ev = tpPalaceOK(chart.palaces[p], configs.length);
        if (ev) ev.configs = configs.map(function (c) { return c.label; });
        return ev;
      } catch (e) { return null; }
    },
    proposeCityTour: tpProposeCityTour,
    proposeLuckyEvents: tpProposeLuckyEvents,
    findEvents: tpFindEvents,
    findPOI: tpFindPOI,
    planArriveBy: tpPlanArriveBy,
    searchItineraries: function (opts) { return tpSearchItineraries(opts); },
    fetchRoute: function (origin, dest) {
      return tpFetchRoute(tpGetWorkerUrl(), origin, dest).then(function (r) { TP_LAST_ROUTE = r; return r; });
    },
    resolvePlace: function (name, lat, lon) { return _tpResolvePlace(name, lat, lon); },
    resolveArea: function (name) {
      if (!name || !String(name).trim()) return Promise.resolve(null);
      return tpGeocodeArea(String(name).trim()).then(function (a) { return a; }).catch(function () { return null; });
    },
    cheapestTariff: function (name) { return tpCheapestTariff(name); },
    getWorkerUrl: tpGetWorkerUrl,
    readChargeFromCar: tpReadChargeFromCar,
    getLiveRange: tpGetLiveRange,
    open: tpOpen,
    openCompass: tpOpenCompass,
    startCompass: tpStartCompass,
    closeCompass: tpCloseCompass,
    compassControl: tpCompassControl,
    setCompassOrigin: tpCmpSetOriginFrom,
    openPrefilled: tpOpenPrefilled,
    findLuckyDeparture: tpFindLuckyDeparture,
    evalPalace: tpPalaceOK,
    doorLabel: function (code) { return tpDoorLabel(code); },
    getLastResult: function () { return window._tpLastResult || null; },
    openInMaps: function (navigate) { return tpOpenInMaps(!!navigate); },
    buildTourMapsUrl: function (origin, stops, mode) { return tpBuildTourMapsUrl(origin, stops, mode); },
    diagnoseMapsExport: function () { return tpDiagnoseMapsExport(); },
    getAutoMaps: tpAutoMapsOn,
    setAutoMaps: tpSetAutoMaps,
    config: function (favDoors) { if (favDoors) TP_FAV_DOORS = favDoors; return TP_FAV_DOORS.slice(); }
  };
  // Expose tpOpen as a global so the TRAVEL PLANNER tab button (onclick="tpOpen()") works.
  window.tpOpen = tpOpen;
  window.tpOpenPrefilled = tpOpenPrefilled;
})();

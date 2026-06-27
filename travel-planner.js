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
  // Open the current itinerary in Google Maps. navigate=true changes the current tab (NOT blocked by pop-up
  // blockers, works with no tap) - used hands-free. Otherwise open a new tab (keeps the app), falling back to
  // navigation if the pop-up is blocked.
  function tpOpenInMaps(navigate) {
    var b = document.getElementById('tp-maps-open');
    var url = b && b._url;
    if (!url) return { ok: false, reason: 'no_itinerary', note: 'No computed itinerary yet — plan a trip first.' };
    if (navigate) { try { window.location.href = url; } catch (e) {} return { ok: true, navigated: true, url: url }; }
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
      worker: v('tp-worker'), range: v('tp-range'), reserve: v('tp-reserve'), nets: nets
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
  function tpBuildMapsUrl(origin, dest, waypoints) {
    var parts = ['https://www.google.com/maps/dir/?api=1'];
    var o = tpMapsPoint(origin), d = tpMapsPoint(dest);
    if (o) parts.push('origin=' + encodeURIComponent(o));
    if (d) parts.push('destination=' + encodeURIComponent(d));
    var wps = (waypoints || []).map(tpMapsPoint).filter(Boolean);
    if (wps.length) parts.push('waypoints=' + wps.map(encodeURIComponent).join('%7C'));
    parts.push('travelmode=driving');
    return parts.join('&');
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
          var op = (poi.OperatorInfo && poi.OperatorInfo.Title) || '';
          var maxKW = 0;
          (poi.Connections || []).forEach(function (c) { if (c && c.PowerKW && c.PowerKW > maxKW) maxKW = c.PowerKW; });
          return { lat: a.Latitude, lon: a.Longitude, title: a.Title || op || 'Charger',
                   operator: op, maxKW: maxKW, distanceKm: a.Distance || null };
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
    var _Q = (typeof QMDJWaterScanner !== 'undefined') ? QMDJWaterScanner : null;
    var _ff = (_Q && _Q.formationFlags) ? _Q.formationFlags(pd) : { disqualified: false, reasons: [] };
    var _gate = (_Q && _Q.directionGate) ? _Q.directionGate(pd, { travel: true }) : { eligible: (favDoor || injuryRescue), reasons: [] };
    var excluded = !!_ff.disqualified;
    var gengExcluded = excluded && _ff.reasons.join(';').indexOf('Geng') !== -1;   // display only
    var gate = !!_gate.eligible;

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
             hasHourData: anyHour, plan: plan, stopMode: opts.stopMode || 'auto',
             maxLegHours: opts.maxLegHours || 4,
             usedRealRoute: usedRealRoute,
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
        // FORTUNATE HOUR → drive toward the destination and CASH at the end of the 时辰.
        var endWall = slot.wallEnd;
        var rp = posAt(endWall.getTime());
        pushLeg(endWall, i, headFromEntry(fortEntry, rd.name, true), '');
        timeline.push({ type: 'stop', atWall: endWall, slotIdx: i,
          reason: 'cash a positive ' + rd.name + ' hour (' + slot.brPy + ')',
          newHeading: nextHeadAfter(i), pos: { lat: rp.lat, lon: rp.lon },
          cashDir: rd.name, limitDeg: null, fortunate: true });
        P0 = { lat: rp.lat, lon: rp.lon };
        legStartMs = endWall.getTime();
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
          wallStart: slot.wallStart, wallEnd: slot.wallEnd, brPy: slot.brPy
        });
      }
      // OPTION A (also the base behaviour while a B detour is pending realization):
      // keep driving toward the destination through the whole non-positive hour with
      // NO cash/stop. Only a SAFETY rest is allowed after very long continuous driving.
      var elapsedH = (slot.wallEnd.getTime() - legStartMs) / 3600000;
      if (elapsedH >= maxLegHours && i < slots.length - 1) {
        var rp2 = posAt(slot.wallEnd.getTime());
        pushLeg(slot.wallEnd, i, headFromEntry(null, rd.name, false), '');
        timeline.push({ type: 'stop', atWall: slot.wallEnd, slotIdx: i,
          reason: 'rest stop (\u2265' + maxLegHours + 'h driving, non-positive hour \u2014 not a cash)',
          newHeading: nextHeadAfter(i), pos: { lat: rp2.lat, lon: rp2.lon },
          cashDir: null, limitDeg: null, fortunate: false });
        P0 = { lat: rp2.lat, lon: rp2.lon };
        legStartMs = slot.wallEnd.getTime();
      }
      // else: keep driving into the next slot (P0 / legStartMs unchanged)
    }
    var lastSlot = slots[slots.length - 1];
    pushLeg(lastSlot.wallEnd, slots.length - 1, headFromEntry(null, roadDirOf(lastSlot).name, false), 'arrival');
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
      return tpFetchChargers({ key: key, lat: c.lat, lon: c.lon, radiusKm: radius, maxResults: 60 })
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
      var reserve = parseFloat(document.getElementById('tp-reserve') && document.getElementById('tp-reserve').value) || 0;
      var nets = TP_NETWORKS.filter(function (n) { var c = document.getElementById('tp-net-' + n.id); return c && c.checked; }).map(function (n) { return n.id; });

      if (!key) { status.style.color = '#b58900'; status.textContent = 'Enter your Open Charge Map key in 🔋 Range & charging first.'; if (auto) { tpReportCharger({ error: 'no_key' }); window._tpChargerPending = false; } return; }
      if (!range) { status.style.color = '#b58900'; status.textContent = 'Enter your remaining range (km) in 🔋 Range & charging.'; if (auto) { tpReportCharger({ error: 'no_range' }); window._tpChargerPending = false; } return; }
      var idx = tpBuildRouteIndex(TP_LAST_ROUTE);
      if (!idx) { status.style.color = '#b58900'; status.textContent = 'No real route yet — set the Worker URL and press SCAN TRIP first.'; if (auto) { tpReportCharger({ error: 'no_route' }); window._tpChargerPending = false; } return; }
      tpSetOcmKey(key);

      var usableKm = range * (1 - reserve / 100);
      var totalKm = idx.total / 1000;
      var O = result.origin;
      // departure + span for ETA (constant average speed)
      var dStr = document.getElementById('tp-date').value, tStr = document.getElementById('tp-time').value || '12:00';
      var depMs = new Date(dStr + 'T' + tStr).getTime();
      var durH = parseFloat(document.getElementById('tp-dur').value) || 12;
      var spanMs = durH * 3600000;
      var winEnd = (result.slots && result.slots[0] && result.slots[0].wallEnd) ? result.slots[0].wallEnd.getTime() : null;
      var corridorKm = 15;

      status.style.color = '#888';
      status.textContent = 'Searching Open Charge Map along the route (usable ≈ ' + Math.round(usableKm) + ' km/leg)…';
      tpFetchChargersAlong(idx, key, usableKm, corridorKm)
        .then(function (stations) {
          // Enrich every station with along-route distance + ETA; keep only those near the corridor.
          function tpEnrich(s) {
            var np = tpNearestRoutePoint(s.lat, s.lon, idx);
            return { s: s, alongKm: np.alongKm, offKm: np.offKm,
              etaMs: depMs + (totalKm > 0 ? (np.alongKm / totalKm) : 0) * spanMs };
          }
          var enriched = stations.map(tpEnrich).filter(function (r) { return r.offKm <= corridorKm && isFinite(r.alongKm); });
          function isTE(s) { return tpFilterChargersByNetwork([s], nets).length > 0; }

          // Cash-stop boundaries: along-route km of each 20-min stop (the 2-hour-window edges), in order.
          var bounds = (result.plan || []).filter(function (x) { return x.type === 'stop' && x.pos; })
            .map(function (st) { var np = tpNearestRoutePoint(st.pos.lat, st.pos.lon, idx); return { atWall: st.atWall, alongKm: np.alongKm, stop: st }; })
            .filter(function (b) { return isFinite(b.alongKm); })
            .sort(function (a, b) { return a.alongKm - b.alongKm; });

          var PRE_KM = 50;   // look this far before each quadrant-exit boundary (50 km before the exit)
          // Best charger inside [lo,hi] reachable from prevAlong; tiers: >=150 Tesla/Electra, >=150 other, >=80 T/E, >=80 other.
          function pickForWindow(lo, hi, prevAlong) {
            function pool(kw) {
              return enriched.filter(function (r) {
                return r.alongKm >= lo && r.alongKm <= hi && (r.s.maxKW || 0) >= kw &&
                       (r.alongKm - prevAlong) >= 0 && (r.alongKm - prevAlong) <= usableKm;
              });
            }
            function closest(list) {
              return list.slice().sort(function (a, b) {
                if (b.alongKm !== a.alongKm) return b.alongKm - a.alongKm;   // as close to the boundary as possible, but before it
                return (b.s.maxKW || 0) - (a.s.maxKW || 0);                  // then higher power
              })[0] || null;
            }
            function te(list) { return list.filter(function (r) { return isTE(r.s); }); }
            var p1 = pool(TP_MIN_KW), t1 = te(p1);
            if (t1.length) return { row: closest(t1), lowPower: false, fallback: false };
            if (p1.length) return { row: closest(p1), lowPower: false, fallback: true };
            var p2 = pool(TP_MIN_KW2), t2 = te(p2);
            if (t2.length) return { row: closest(t2), lowPower: true, fallback: false };
            if (p2.length) return { row: closest(p2), lowPower: true, fallback: true };
            return null;
          }

          // RANGE-BASED CHAIN: add charges from start to finish so no leg exceeds the
          // usable range. As far as possible each step (maximise progress), preferring a
          // fast Tesla/Electra; when a 2-hour cash stop falls within the reachable window
          // we charge there (rest + charge together). Stops once the destination is in range.
          var chosen = [], anyLow = false, anyFb = false, prevAlong = 0, gap = false, guard = 0;
          while ((totalKm - prevAlong) > usableKm && guard++ < 15) {
            var hi = prevAlong + usableKm;
            var pk = null;
            // (a) prefer a cash-stop boundary reachable within range — charge while resting
            var reach = bounds.filter(function (b) { return b.alongKm > prevAlong + 5 && b.alongKm <= hi; });
            if (reach.length) {
              var bb = reach[reach.length - 1]; // farthest reachable boundary
              pk = pickForWindow(Math.max(prevAlong + 1, bb.alongKm - PRE_KM), Math.min(hi, bb.alongKm + 8), prevAlong);
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
            chosen.push(pk); if (pk.lowPower) anyLow = true; if (pk.fallback) anyFb = true; prevAlong = pk.row.alongKm;
          }
          if (!gap && (totalKm - prevAlong) > usableKm) gap = true;        // tail leg still too long

          if (!chosen.length) {
            if ((totalKm - prevAlong) <= usableKm) {
              // Whole trip fits in the usable range — no charging stop is needed.
              status.style.color = '#1b6e2f';
              status.textContent = '\u2713 Trip is within range (' + Math.round(totalKm) + ' km \u2264 ' + Math.round(usableKm) + ' km usable) — no charging stop needed.';
              if (auto) { tpReportCharger({ error: 'not_needed' }); window._tpChargerPending = false; }
            } else {
              status.style.color = '#b58900';
              status.textContent = 'No reachable fast charger on this route within ' + Math.round(usableKm) + ' km — try a higher range or a different route.';
              if (auto) { tpReportCharger({ error: 'none' }); window._tpChargerPending = false; }
            }
            return;
          }

          status.style.color = gap ? '#b58900' : '#1b6e2f';
          status.textContent = '\u2713 ' + chosen.length + ' charging stop' + (chosen.length === 1 ? '' : 's') + ' along the route (every \u2248' + Math.round(usableKm) + ' km)' +
            (anyLow ? ' (\u2265' + TP_MIN_KW2 + ' kW - no \u2265' + TP_MIN_KW + ' kW found)' : '') +
            (anyFb ? ' (other networks)' : '') +
            (gap ? ' \u2014 \u26a0\ufe0f a leg may exceed your range; add range or stops.' : '') + '.';

          // Attach each chosen charger to its quadrant-exit stop so the Maps export
          // shows them interleaved (exit -> charger -> next exit ...). A fallback
          // charger with no cash stop goes into the free-text waypoints instead.
          var exEl = document.getElementById('tp-extra-wp');
          TP_RANGE_CHARGERS = [];   // fresh for this plan
          chosen.forEach(function (c) {
            var s = c.row.s;
            if (c.stopRef) {
              c.stopRef.charger = { lat: s.lat, lon: s.lon, title: s.title || s.operator || 'Charger' };
            } else if (isFinite(s.lat) && isFinite(s.lon)) {
              // Fallback charger (no linked quadrant stop). Keep its NAME *and* its
              // coordinates so the Maps export positions it in travel order yet emits
              // it by name. (Previously only the name went into the free-text field,
              // which Maps could not position → it trailed out of order.)
              var cTitle = (s.title && !/^\s*charger\s*$/i.test(s.title)) ? String(s.title).trim() : '';
              TP_RANGE_CHARGERS.push({ name: cTitle || null, lat: s.lat, lon: s.lon });
            }
          });
          tpRefreshMapsExport();   // rebuild the Maps link now that the range chargers are known
          if (exEl) exEl.dispatchEvent(new Event('input', { bubbles: true }));  // also refresh via the panel

          chosen.forEach(function (c) {
            var r = c.row, s = r.s, when = new Date(r.etaMs);
            var hm = String(when.getHours()).padStart(2, '0') + ':' + String(when.getMinutes()).padStart(2, '0');
            var row = el('div', { style: 'display:flex;align-items:center;gap:8px;border-top:1px solid #e0eee0;padding:6px 0;font-size:12px;' });
            var info = el('div', { style: 'flex:1;min-width:0;' });
            info.appendChild(el('div', { style: 'font-weight:600;color:#333;' }, (s.title || s.operator || 'Charger')));
            info.appendChild(el('div', { style: 'color:#888;' },
              (s.operator ? s.operator + ' \u00b7 ' : '') + (s.maxKW ? Math.round(s.maxKW) + ' kW \u00b7 ' : '') +
              Math.round(r.alongKm) + ' km along \u00b7 ' + r.offKm.toFixed(1) + ' km off route \u00b7 ETA ' + hm));
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
              fallback: anyFb, lowPower: anyLow, count: chosen.length });
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
      var pts = [];          // positionable along the route ({token, along})
      var seq = [];          // travel-ordered fallback when no route ({token, order})
      var seqN = 0, dropped = 0;
      function addCharger(name, lat, lon) {
        var tok = (name && String(name).trim()) ? String(name).trim() : tpLatLng({ lat: lat, lon: lon });
        if (idx) {
          var npc = nearOf({ lat: lat, lon: lon });
          if (npc && isFinite(npc.alongKm)) { pts.push({ token: tok, along: npc.alongKm }); return; }
        }
        seq.push({ token: tok, order: seqN++ });   // no route (or off the indexed path): keep found order
      }
      checks.filter(function (c) { return c.cb.checked; }).forEach(function (c) {
        var st = c.stop;
        // A CHARGE stop IS the charger: emit it BY NAME (tappable, route-forcing pin).
        if (st && st.charge && st.charger && isFinite(st.charger.lat) && isFinite(st.charger.lon)) {
          var title = (st.charger.title && !/^\s*charger\s*$/i.test(st.charger.title)) ? String(st.charger.title).trim() : '';
          addCharger(title, st.charger.lat, st.charger.lon);
          return;
        }
        // A quadrant-exit point is a bare coordinate that must sit ON the fast road —
        // it can only be placed when a matching route is loaded; otherwise skip it
        // (an unpositioned coordinate would scramble the order).
        if (!idx) { return; }
        var np = nearOf(c.pos);
        if (!np || !isFinite(np.alongKm) || np.offKm > TP_WAYPOINT_MAX_OFFKM) { dropped++; return; }
        pts.push({ token: tpLatLng(c.pos), along: np.alongKm });                            // quadrant-exit point
      });
      // Range-only (fallback) chargers: already found in travel order; emit BY NAME,
      // positioned along the route when possible so they interleave correctly.
      (TP_RANGE_CHARGERS || []).forEach(function (ch) {
        if (ch && isFinite(ch.lat) && isFinite(ch.lon)) addCharger(ch.name, ch.lat, ch.lon);
      });
      // User free-text extras: coordinates get positioned; typed names trail in order.
      var trailing = [];
      extraRaw.forEach(function (tok) {
        var m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(tok);
        if (m && idx) {
          var np2 = tpNearestRoutePoint(parseFloat(m[1]), parseFloat(m[2]), idx);
          if (np2 && isFinite(np2.alongKm)) { pts.push({ token: tok, along: np2.alongKm }); return; }
        }
        trailing.push(tok);
      });
      pts.sort(function (a, b) { return a.along - b.along; });                          // travel order
      var ordered = pts.map(function (p) { return p.token; })
        .concat(seq.sort(function (a, b) { return a.order - b.order; }).map(function (s) { return s.token; }));
      var wps = [];
      ordered.forEach(function (t) { if (!wps.length || wps[wps.length - 1] !== t) wps.push(t); }); // de-dup neighbours
      wps = wps.concat(trailing);
      collectWaypoints._dropped = dropped;
      // Google Maps keeps only a limited number of waypoints; after sorting,
      // trimming from the far end keeps the nearest ones (reached first).
      if (wps.length > TP_MAPS_MAX_WAYPOINTS) wps = wps.slice(0, TP_MAPS_MAX_WAYPOINTS);
      return wps;
    }
    function update() {
      var wps = collectWaypoints();
      var n = wps.length;
      var dropped = collectWaypoints._dropped || 0;
      var url = tpBuildMapsUrl({ lat: O.lat, lon: O.lon }, { lat: Dst.lat, lon: Dst.lon }, wps);
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
      lines.push((result.origin.name || 'Origin') + ' → ' + (result.dest.name || 'Destination') +
        ' · bearing ' + Math.round(result.bearing) + '° (' + result.snapDir + ')' +
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
        if (ev.door) bits.push(ev.door);
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
                       door: (d.eval.door || null), score: (d.eval.score || null), sanqi: !!d.eval.hasSanQi,
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
            door: fortunate ? (rev.door || null) : null,
            sanqi: fortunate ? !!rev.hasSanQi : false,
            deity: fortunate ? (rev.deity || null) : null,
            score: fortunate ? (rev.score || null) : null,
            configs: fortunate ? (rev.configs || []) : [],
            cash_min: fortunate ? (stopDurBySlot[si] || 20) : null,
            detour: detour ? { dir: detour.dir, palace: detour.palace, palaceName: detour.palaceName, door: detour.door, score: detour.score, setting: detour.setting } : null,
            favourable_dirs: fav,
            iso: s.iso, hGan: s.hGanHan, hZhi: s.hZhiHan, brPy: s.brPy
          });
        });
      } catch (eH) { hours = []; }
      window._tpLastResult = {
        stamp: Date.now(),
        origin: result.origin.name || null, dest: result.dest.name || null,
        bearing: Math.round(result.bearing), snapped: result.snapDir,
        real_route: !!result.usedRealRoute, km: rm.km ? Math.round(rm.km) : null, driving_time: drive,
        stops: nStops, legs: legs, has_hour_data: !!result.hasHourData,
        exits: exits, hours: hours,
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
        function findStop(la, lo) {
          if (hasRange) {
            return tpFindChargerStop(la, lo, ocmKey, ocmNets).then(function (c) { return c || tpFindStopover(la, lo, true); });
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
              if (leg) { leg.lat = place.lat; leg.lon = place.lon; leg.place = place.name; leg.stopKind = place.kind; if (place.power) leg.stopPower = place.power; }
              try { if (window.XKDGChat && window.XKDGChat.updateItineraryStops) window.XKDGChat.updateItineraryStops(); } catch (e) {}
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
    form.appendChild(field('Max drive hours per leg', 'tp-maxleg', '4', 'number'));
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

    var rcRow = el('div', { style: 'display:flex;gap:8px;' });
    function rcNum(lbl, id, val, ph) {
      var w = el('label', { style: 'flex:1;display:flex;flex-direction:column;gap:2px;color:#555;font-size:11px;' }, lbl);
      w.appendChild(el('input', { id: id, type: 'number', step: 'any', value: String(val), placeholder: ph || '',
        style: 'padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;' }));
      return w;
    }
    rcRow.appendChild(rcNum('Remaining range (km)', 'tp-range', 200));
    rcRow.appendChild(rcNum('Safety reserve (%)', 'tp-reserve', 15));
    rcBlock.appendChild(rcRow);

    var netWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;margin:6px 0;font-size:12px;color:#444;' });
    TP_NETWORKS.forEach(function (n) {
      var lab = el('label', { style: 'display:flex;align-items:center;gap:5px;cursor:pointer;' });
      var cb = el('input', { type: 'checkbox', id: 'tp-net-' + n.id });
      cb.checked = true;
      lab.appendChild(cb); lab.appendChild(el('span', null, n.label));
      netWrap.appendChild(lab);
    });
    rcBlock.appendChild(netWrap);

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
    form.appendChild(rcBlock);

    panel.appendChild(form);

    var btn = el('button', {
      id: 'tp-scan',
      style: 'width:100%;padding:10px;border:0;border-radius:8px;background:#1565c0;color:#fff;' +
        'font-size:14px;font-weight:600;cursor:pointer;'
    }, 'SCAN TRIP');
    panel.appendChild(btn);

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
          maxLegHours: parseFloat(document.getElementById('tp-maxleg').value) || 4,
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
                  tpRealizeDetour(_wurl, _oLL, _dLL, _baseSec, _intents[0], _isEV, _cruise).then(function (det) {
                    try {
                      if (!det) { if (_dn.parentNode) _dn.parentNode.removeChild(_dn); return; }
                      var pct = Math.round(det.addedPct * 100);
                      if (det.withinBudget) {
                        opts._detourTried = true;
                        TP_LAST_ROUTE = det.route;
                        var _df = document.getElementById('tp-dur'); if (_df) _df.value = '';
                        results.innerHTML = '';
                        buildAndRender(det.route);
                        var ok = el('div', { style: 'margin-top:8px;font-size:12px;color:#1b5e20;border:1px solid #1b8a3f;border-radius:8px;padding:8px 10px;background:#f3fbf5;' },
                          '\u21aa Detour adopted via ' + (det.W.name || 'a real stop') + ' \u2014 heading ' + det.dir +
                          ', +' + pct + '% road time (within the 15% budget) so the direction stays positive.');
                        results.appendChild(ok);
                      } else {
                        if (_dn.parentNode) _dn.parentNode.removeChild(_dn);
                        var ask = el('div', { style: 'margin-top:8px;font-size:12px;color:#8a6d00;border:1px solid #d4a800;border-radius:8px;padding:8px 10px;background:#fffbf0;' },
                          '\u21aa A real detour via ' + (det.W.name || 'a stop') + ' would keep heading ' + det.dir +
                          ' positive, but it adds +' + pct + '% road time (over the 15% budget). It was NOT applied \u2014 authorize it explicitly to use it.');
                        results.appendChild(ask);
                      }
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
    var best = null, bestHourOnly = null, earliest = null;
    probe.slots.forEach(function (slot) {
      var h = slot.wallStart.getHours();
      if (h < DAY_START_H || h > DAY_END_H) return;
      if (minMs && slot.wallStart.getTime() < minMs) return;   // skip departures already past / too soon (today)
      if (!earliest) earliest = slot;
      var hs = (slot.hourScore != null) ? slot.hourScore : -Infinity;
      if (!bestHourOnly || hs > bestHourOnly._hs) { bestHourOnly = slot; bestHourOnly._hs = hs; }
      if (strict) {
        // ABSOLUTE RULE: the EXACT travel direction's door must be favourable at departure.
        var de = tpDirExact(slot, slot.bearingDest);
        if (!de || !de.eval || !de.eval.ok) return;   // unfavourable door in the travel direction -> not allowed
        var scs = (de.combined != null) ? de.combined : 0;
        if (!best || scs > best._sc) { best = slot; best._sc = scs; }
      } else {
        var bd = tpBestDirToward(slot, slot.bearingDest);
        var sc = (bd && bd.combined != null) ? bd.combined : null;
        if (sc != null) { if (!best || sc > best._sc) { best = slot; best._sc = sc; } }
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

  function tpOpenPrefilled(params) {
    params = params || {};
    window._tpGuideShown = true;                       // don't show the guide overlay when the AI opens it
    // Auto-run charging ONLY when a real range was given. Without it we must NOT charge
    // off the panel's default value (that silently assumed ~200 km) — the AI should ask.
    var wantCharge = (params.autoChargers !== false) && (parseFloat(params.rangeKm) > 0);
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
    if (!r || !_cmpPos) return;   // nothing to draw yet
    cmpEnsureLeaflet().then(function (L) {
      host = document.getElementById('tp-cmp-map'); if (!host) return;
      if (!_cmpMap) {
        _cmpMap = L.map(host, { zoomControl: true, attributionControl: false, dragging: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_cmpMap);
        _cmpMap.setView([_cmpPos.lat, _cmpPos.lon], 11);
        _cmpMapLayer = L.layerGroup().addTo(_cmpMap);
        setTimeout(function () { if (_cmpMap) _cmpMap.invalidateSize(); }, 60);
      }
      _cmpMapLayer.clearLayers();
      var ref = r.ref, pos = _cmpPos;
      var bearDeg = tpBearing(ref.lat, ref.lon, pos.lat, pos.lon);
      var center = Math.round(bearDeg / 45) * 45;
      var distKm = tpHaversineKm(ref.lat, ref.lon, pos.lat, pos.lon);
      var exit = _cmpExit;
      var radiusKm = Math.max(distKm, exit ? tpHaversineKm(ref.lat, ref.lon, exit.lat, exit.lon) : 0, 2) * 1.15;

      // 45° wedge (current quadrant from the origin).
      L.polygon(cmpWedgePoints(ref, center, radiusKm), { color: '#1565c0', weight: 1, fillColor: '#1565c0', fillOpacity: 0.12 }).addTo(_cmpMapLayer);
      // The two boundary rays, slightly stronger.
      L.polyline([[ref.lat, ref.lon], [cmpForward(ref, center - 22.5, radiusKm).lat, cmpForward(ref, center - 22.5, radiusKm).lon]], { color: '#1565c0', weight: 1.5, opacity: 0.6, dashArray: '4,4' }).addTo(_cmpMapLayer);
      L.polyline([[ref.lat, ref.lon], [cmpForward(ref, center + 22.5, radiusKm).lat, cmpForward(ref, center + 22.5, radiusKm).lon]], { color: '#1565c0', weight: 1.5, opacity: 0.6, dashArray: '4,4' }).addTo(_cmpMapLayer);
      // Bearing line origin -> you.
      L.polyline([[ref.lat, ref.lon], [pos.lat, pos.lon]], { color: '#888', weight: 1.5, opacity: 0.8 }).addTo(_cmpMapLayer);
      // Origin marker.
      L.circleMarker([ref.lat, ref.lon], { radius: 6, color: '#0b8043', weight: 2, fillColor: '#0b8043', fillOpacity: 1 }).addTo(_cmpMapLayer).bindTooltip('Origin', { permanent: false });
      // You.
      L.circleMarker([pos.lat, pos.lon], { radius: 6, color: '#b00', weight: 2, fillColor: '#e53935', fillOpacity: 1 }).addTo(_cmpMapLayer).bindTooltip('You', { permanent: false });
      // Predicted exit point.
      if (exit) {
        L.marker([exit.lat, exit.lon]).addTo(_cmpMapLayer)
          .bindTooltip('Exit ' + exit.fromQ + '→' + exit.toQ + ' · ' + (exit.distKm < 10 ? exit.distKm.toFixed(1) : Math.round(exit.distKm)) + ' km', { permanent: false });
      }
      // Frame the scene (only while following, and only once per scene change).
      if (_cmpMapFollow && !_cmpMapFitted) {
        var b = L.latLngBounds([[ref.lat, ref.lon], [pos.lat, pos.lon]]);
        if (exit) b.extend([exit.lat, exit.lon]);
        try { _cmpMap.fitBounds(b, { padding: [24, 24], maxZoom: 14, animate: false }); } catch (e) {}
        _cmpMapFitted = true;
      } else if (_cmpMapFollow) {
        // keep you in view without changing zoom abruptly
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
        bar.appendChild(el('div', { style: 'flex:1;' }, '🧭 Compass map'));
        var foll = el('button', { id: 'tp-cmp-big-follow', type: 'button', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:5px 10px;font-size:13px;cursor:pointer;' }, _cmpMapFollow ? '📍 Follow: on' : '📍 Follow: off');
        var mapsB = el('button', { type: 'button', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:5px 10px;font-size:13px;cursor:pointer;' }, '🔍 Maps');
        var close = el('button', { type: 'button', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:5px 12px;font-size:14px;cursor:pointer;' }, '✕ Close');
        foll.addEventListener('click', function () { _cmpMapFollow = !_cmpMapFollow; _cmpMapFitted = false; foll.textContent = _cmpMapFollow ? '📍 Follow: on' : '📍 Follow: off'; cmpRenderMap(); });
        mapsB.addEventListener('click', function () { if (_cmpExit) tpOpenPoint(_cmpExit.lat, _cmpExit.lon); });
        close.addEventListener('click', function () { cmpSetMapBig(false); });
        bar.appendChild(foll); bar.appendChild(mapsB); bar.appendChild(close);
        big2.appendChild(bar);
        var holder = el('div', { id: 'tp-cmp-map-bigholder', style: 'flex:1;min-height:0;' });
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
      host.style.height = '150px';
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

  function tpCmpRender() {
    var box = document.getElementById('tp-cmp-body'); if (!box) return;
    var r = cmpResolveRef();
    if (!r) { box.innerHTML = '<div style="color:#888;font-size:13px;">Tap <b>📍 Here</b> to set this spot as the origin, or set one with <b>✏️ From place</b> — or compute a trip first.</div>'; return; }
    if (!_cmpPos) { box.innerHTML = '<div style="color:#888;font-size:13px;">Waiting for GPS… allow location and tap ↻.</div>'; return; }
    var ref = r.ref, refLabel = r.label, pos = _cmpPos;
    var deg = tpBearing(ref.lat, ref.lon, pos.lat, pos.lon), q = tpQ8(deg);
    var distKm = tpHaversineKm(ref.lat, ref.lon, pos.lat, pos.lon);

    var html = '<div style="font-size:46px;font-weight:800;line-height:1;color:#1565c0;">' + Math.round(deg) + '°</div>' +
      '<div style="font-size:24px;font-weight:700;margin-top:2px;">' + q + '</div>' +
      '<div style="font-size:12px;color:#666;margin-top:4px;">' + refLabel + ' · ' + (distKm < 10 ? distKm.toFixed(1) : Math.round(distKm)) + ' km</div>';
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
    if ((_cmpHeading == null || !isFinite(_cmpHeading)) && p.coords.heading != null && isFinite(p.coords.heading)) {
      _cmpHeading = p.coords.heading;
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
    return _tpResolvePlace(String(name).trim(), null, null).then(function (g) {
      if (!g) return null;
      _cmpOrigin = { lat: g.lat, lon: g.lon, name: String(name).trim() };
      _cmpPrev = null; _cmpHeading = null; _cmpSpeedKmh = null; _cmpExitName = null; _cmpExitNameAt = null; _cmpMapFitted = false;
      cmpUpdateRefLabel(); tpCmpRender(); tpCmpRefreshOnce();
      return { lat: g.lat, lon: g.lon, name: _cmpOrigin.name };
    });
  }
  function tpCmpClearOrigin() { _cmpOrigin = null; _cmpExitName = null; _cmpExitNameAt = null; _cmpMapFitted = false; cmpUpdateRefLabel(); tpCmpRender(); }
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
      ov = el('div', { id: 'tp-cmp-ov', style: 'position:fixed;left:12px;bottom:80px;z-index:99996;width:248px;background:#fff;border:2px solid #1565c0;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.3);' });
      var head = el('div', { style: 'display:flex;align-items:center;gap:6px;background:#1565c0;color:#fff;border-radius:10px 10px 0 0;padding:7px 9px;' });
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
      var cls = el('button', { type: 'button', title: 'Close', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:3px 8px;font-size:13px;cursor:pointer;' }, '\u00d7');
      refBtn.addEventListener('click', function () { _tpRefMode = (_tpRefMode === 'origin') ? 'auto' : 'origin'; refBtn.textContent = (_tpRefMode === 'origin') ? 'Origin' : 'Auto'; tpCmpRender(); });
      refr.addEventListener('click', tpCmpRefreshOnce);
      cls.addEventListener('click', function () { tpCloseCompass(); });
      head.appendChild(refBtn); head.appendChild(vox); head.appendChild(refr); head.appendChild(cls);
      ov.appendChild(head);

      ov.appendChild(el('div', { id: 'tp-cmp-body', style: 'padding:12px;text-align:center;color:#222;' }));

      // Origin controls.
      var ctrl = el('div', { style: 'padding:0 10px 10px;border-top:1px solid #eee;' });
      ctrl.appendChild(el('div', { id: 'tp-cmp-ref-label', style: 'font-size:11px;color:#666;margin:7px 0;' }));
      var row = el('div', { style: 'display:flex;gap:6px;align-items:center;' });
      var hereBtn = el('button', { type: 'button', style: 'flex:0 0 auto;background:#1565c0;color:#fff;border:0;border-radius:7px;padding:6px 9px;font-size:12px;font-weight:700;cursor:pointer;' }, '📍 Here');
      var nameInp = el('input', { id: 'tp-cmp-name', type: 'text', placeholder: 'From a place… (e.g. Arezzo)', style: 'flex:1;min-width:0;border:1px solid #ccc;border-radius:7px;padding:6px 8px;font-size:12px;' });
      var setBtn = el('button', { type: 'button', style: 'flex:0 0 auto;background:#0b8043;color:#fff;border:0;border-radius:7px;padding:6px 9px;font-size:12px;font-weight:700;cursor:pointer;' }, 'Set');
      hereBtn.addEventListener('click', function () { tpCmpStart(); tpCmpSetOriginHere(); });
      function doSet() {
        var v = nameInp.value;
        if (!v || !v.trim()) return;
        setBtn.textContent = '…';
        tpCmpStart();
        tpCmpSetOriginFrom(v).then(function (r) { setBtn.textContent = 'Set'; if (!r) { var lbl = document.getElementById('tp-cmp-ref-label'); if (lbl) lbl.textContent = 'Place not found.'; } });
      }
      setBtn.addEventListener('click', doSet);
      nameInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSet(); } });
      row.appendChild(hereBtn); row.appendChild(nameInp); row.appendChild(setBtn);
      ctrl.appendChild(row);
      ov.appendChild(ctrl);

      // Mini map + expand button.
      var mapWrap = el('div', { id: 'tp-cmp-map-wrap', style: 'padding:0 10px 10px;' });
      var expandRow = el('div', { style: 'display:flex;justify-content:flex-end;margin-bottom:6px;' });
      var expandBtn = el('button', { id: 'tp-cmp-expand', type: 'button', style: 'background:#1565c0;color:#fff;border:0;border-radius:7px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;' }, '⛶ Expand');
      expandBtn.addEventListener('click', function () { cmpSetMapBig(!_cmpMapBig); });
      expandRow.appendChild(expandBtn);
      mapWrap.appendChild(expandRow);
      mapWrap.appendChild(el('div', { id: 'tp-cmp-map', style: 'width:100%;height:150px;border-radius:8px;overflow:hidden;background:#eef;' }));
      ov.appendChild(mapWrap);

      document.body.appendChild(ov);
    }
    ov.style.display = 'block';
    cmpUpdateRefLabel(); tpCmpRender(); tpCmpStart(); tpCmpRefreshOnce();
  }
  document.addEventListener('visibilitychange', function () {
    var ov = document.getElementById('tp-cmp-ov');
    if (!document.hidden && ov && ov.style.display !== 'none') tpCmpRefreshOnce();   // recompute on screen wake (no Wake Lock)
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
  function tpCloseCompass() {
    tpCmpStop();
    if (_cmpMapBig) cmpSetMapBig(false);
    var ov = document.getElementById('tp-cmp-ov'); if (ov) ov.style.display = 'none';
  }
  // Voice/AI control of the open compass. Returns a small status object.
  function tpCompassControl(action) {
    action = (action || '').toString().toLowerCase().trim();
    switch (action) {
      case 'open': tpOpenCompass(); tpCmpStart(); return { ok: true, action: 'open' };
      case 'close': tpCloseCompass(); return { ok: true, action: 'close' };
      case 'expand': case 'enlarge': case 'big': case 'fullscreen':
        tpOpenCompass(); tpCmpStart(); tpCmpRefreshOnce(); cmpSetMapBig(true); return { ok: true, action: 'expand' };
      case 'collapse': case 'shrink': case 'small': cmpSetMapBig(false); return { ok: true, action: 'collapse' };
      case 'clear': case 'clear_origin': case 'reset_origin': tpCmpClearOrigin(); return { ok: true, action: 'clear_origin' };
      case 'refresh': case 'recalculate': case 'recompute': tpCmpRefreshOnce(); return { ok: true, action: 'refresh' };
      case 'recenter': case 'center': case 'follow_on':
        _cmpMapFollow = true; _cmpMapFitted = false; cmpRenderMap(); return { ok: true, action: 'recenter' };
      case 'follow_off': case 'free': _cmpMapFollow = false; cmpRenderMap(); return { ok: true, action: 'follow_off' };
      default: return { error: 'Unknown compass action: ' + action };
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
  function tpFindChargerStop(lat, lon, key, nets) {
    if (!key) return Promise.resolve(null);
    var pt = { lat: lat, lon: lon };
    return tpFetchChargers({ key: key, lat: lat, lon: lon, radiusKm: 30, maxResults: 60 })
      .then(function (stations) {
        var pool = (stations || []).filter(function (s) { return tpHaversineKm(pt.lat, pt.lon, s.lat, s.lon) <= 30; });
        if (!pool.length) return null;
        function dist(s) { return tpHaversineKm(pt.lat, pt.lon, s.lat, s.lon); }
        var pref = tpFilterChargersByNetwork(pool, nets || []);     // preferred brands (e.g. Tesla/Electra)
        function bestBy(list, minKW) {
          var c = (list || []).filter(function (s) { return (s.maxKW || 0) >= minKW; }).slice().sort(function (a, b) { return dist(a) - dist(b); });
          return c[0] || null;
        }
        var pick = bestBy(pref, TP_MIN_KW) || bestBy(pool, TP_MIN_KW) ||
                   bestBy(pref, TP_MIN_KW2) || bestBy(pool, TP_MIN_KW2) ||
                   pool.slice().sort(function (a, b) { return dist(a) - dist(b); })[0];
        if (!pick) return null;
        return { name: pick.title || pick.operator || 'EV charging', lat: pick.lat, lon: pick.lon,
                 kind: 'charger', power: (pick.maxKW ? Math.round(pick.maxKW) + ' kW' : null), operator: pick.operator || null };
      }).catch(function () { return null; });
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
      return { name: feat.name, lat: feat.lat, lon: feat.lon, kind: feat.kind, tags: feat.tags, ev: feat.ev, access: null, feature: feat.name };
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
    Kai: { en: 'Open', han: '开' }, Xiu: { en: 'Rest', han: '休' }, Sheng: { en: 'Birth', han: '生' },
    JingS: { en: 'View', han: '景' }, Shang: { en: 'Injury', han: '伤' }, Du: { en: 'Delusion', han: '杜' },
    Jing: { en: 'Shocking', han: '惊' }, Si: { en: 'Death', han: '死' }
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
  function tpHourFavDirs(ms, O, utc, dstOn) {
    try {
      var off = tpOffsetMin(O.lon, utc, dstOn, ms);
      var sd = new Date(ms + off * 60000);
      var ec = Solar.fromDate(sd).getLunar().getEightChar();
      var gHan = ec.getTimeGan(), brHan = ec.getTimeZhi();
      var dirs = tpScanDirs(sd.getFullYear(), sd.getMonth() + 1, sd.getDate(), gHan, brHan, null);
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
  function tpDayHourSlots(O, dateStr, utc, dstOn, nowMs, marginMs) {
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
        var fav = tpHourFavDirs(ms, O, utc, dstOn);
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
    var nowMs = (opts.nowMs != null) ? opts.nowMs : Date.now();
    var bearings = [0, 45, 90, 135, 180, 225, 270, 315];
    var dists = (opts.distancesKm || [30, 80, 150]).filter(function (d) { return d <= maxKm; });
    if (!dists.length) dists = [Math.min(30, maxKm)];

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
      var catKey = tpPoiCategory(category);
      var poiRadius = (catKey === 'nature') ? 25 : 40;
      var poiDbg = [];
      return Promise.all(picked.map(function (r) {
        var dbg = { dest: [Math.round(r.dest.lat * 1000) / 1000, Math.round(r.dest.lon * 1000) / 1000], nature: -1, broad40: -1, broad90: -1, pick: null };
        poiDbg.push(dbg);
        return tpFindPOI(r.dest.lat, r.dest.lon, poiRadius, category).then(function (resp) {
          if (!resp.ok) { dbg.nature = 'FAIL'; return { poi: null, failed: true }; }
          resp.els.forEach(function (p) { p.ev = tpNearestCharger(p, resp.chargers); });
          dbg.nature = resp.els.length;
          var pick = (catKey === 'nature')
            ? tpPickNatureStop(resp.els, r.dest, O, maxKm, 15)
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
      })).then(function (res) {
        try { window._tpLastPoiDebug = poiDbg; } catch (e) {}
        return {
          date: dateStr, origin: O, category: tpPoiCategory(category),
          anyClean: picked.some(function (r) { return r.clean; }),
          some_without_place: res.some(function (x) { return !x.poi; }),
          poi_service_error: res.some(function (x) { return x.failed; }),
          proposals: picked.map(function (r, i) { return buildProposal(r, res[i].poi); })
        };
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

  window.TravelPlanner = {
    plan: tpPlan,
    planRoundTrip: tpPlanRoundTrip,
    proposeLuckyTrips: tpProposeLuckyTrips,
    proposeChainTrips: tpProposeChainTrips,
    findPOI: tpFindPOI,
    planArriveBy: tpPlanArriveBy,
    fetchRoute: function (origin, dest) {
      return tpFetchRoute(tpGetWorkerUrl(), origin, dest).then(function (r) { TP_LAST_ROUTE = r; return r; });
    },
    resolvePlace: function (name, lat, lon) { return _tpResolvePlace(name, lat, lon); },
    getWorkerUrl: tpGetWorkerUrl,
    open: tpOpen,
    openCompass: tpOpenCompass,
    startCompass: tpStartCompass,
    closeCompass: tpCloseCompass,
    compassControl: tpCompassControl,
    setCompassOrigin: tpCmpSetOriginFrom,
    openPrefilled: tpOpenPrefilled,
    evalPalace: tpPalaceOK,
    getLastResult: function () { return window._tpLastResult || null; },
    openInMaps: function (navigate) { return tpOpenInMaps(!!navigate); },
    diagnoseMapsExport: function () { return tpDiagnoseMapsExport(); },
    getAutoMaps: tpAutoMapsOn,
    setAutoMaps: tpSetAutoMaps,
    config: function (favDoors) { if (favDoors) TP_FAV_DOORS = favDoors; return TP_FAV_DOORS.slice(); }
  };
  // Expose tpOpen as a global so the TRAVEL PLANNER tab button (onclick="tpOpen()") works.
  window.tpOpen = tpOpen;
  window.tpOpenPrefilled = tpOpenPrefilled;
})();

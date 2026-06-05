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

  // ---- Google Maps export (Phase D) ---------------------------------------
  // Consumer Google Maps keeps a limited number of intermediate stops in a
  // shared "directions" link. Beyond this we warn (Maps may drop the extras).
  var TP_MAPS_MAX_WAYPOINTS = 9;

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
  function tpAutoMapsOn() { try { return localStorage.getItem('xkdg_tp_automaps') !== '0'; } catch (e) { return true; } }
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
    // Snap the departure back to the START of the Chinese double-hour it falls in, so the trip
    // uses the FULL two hours of that (favourable) hour instead of beginning halfway through it.
    if (opts.snapDepart !== false) {
      try {
        var offO = tpOffsetMin(O.lon, utc, dstOn);
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
    if (!slots.length) return timeline;

    function slotTarget(slot) {
      var posd = slot.dirs.filter(function (d) { return d.eval && d.eval.ok; });
      if (!posd.length) return null;
      var best = null, bestDiff = 999;
      posd.forEach(function (d) {
        var diff = tpAngDiff(TP_DIR_DEG[d.dir], overallBearing);
        if (diff < bestDiff) { bestDiff = diff; best = d; }
      });
      // skip a positive direction that points essentially backward vs the route
      if (best && tpAngDiff(TP_DIR_DEG[best.dir], overallBearing) > 90) return null;
      return best;
    }
    // latest in-window point where the NET bearing from P0 is inside the target sector
    function cashPoint(P0, slot, targetDeg) {
      var step = 2 * 60000, last = null, entered = false;
      for (var t = slot.wallStart.getTime(); t <= slot.wallEnd.getTime(); t += step) {
        var p = posAt(t);
        if (tpHaversineKm(P0.lat, P0.lon, p.lat, p.lon) < 1) continue; // too close: bearing is noise
        var nb = tpBearing(P0.lat, P0.lon, p.lat, p.lon);
        if (tpAngDiff(nb, targetDeg) <= 22.5) { last = { t: t, pos: { lat: p.lat, lon: p.lon }, netBearing: nb }; entered = true; }
        else if (entered) break; // net has just LEFT the sector -> stop at the last in-sector point (cash before exiting)
      }
      return last;
    }
    function nextTargetFrom(i) {
      for (var j = i; j < slots.length; j++) { var tg = slotTarget(slots[j]); if (tg) return tg; }
      return null;
    }

    var P0 = { lat: O.lat, lon: O.lon };
    var legStartMs = slots[0].wallStart.getTime();
    var curHead = nextTargetFrom(0) || tpBestDir(slots[0], true);

    function pushLeg(endWall, endSlotIdx, note) {
      timeline.push({
        type: 'leg', startWall: new Date(legStartMs), endWall: endWall, heading: curHead,
        startSlotIdx: tpSlotIndexAt(slots, new Date(legStartMs)), endSlotIdx: endSlotIdx,
        durationH: (endWall.getTime() - legStartMs) / 3600000, note: note || ''
      });
    }

    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var target = slotTarget(slot);
      if (!target) {
        // no usable positive direction this double-hour; only a forced rest if we've driven long
        var elapsedH = (slot.wallEnd.getTime() - legStartMs) / 3600000;
        if (elapsedH >= maxLegHours && i < slots.length - 1) {
          var rp = posAt(slot.wallEnd.getTime());
          pushLeg(slot.wallEnd, i, '');
          var nh = nextTargetFrom(i + 1) || curHead;
          timeline.push({ type: 'stop', atWall: slot.wallEnd, slotIdx: i,
            reason: 'rest stop (\u2265' + maxLegHours + 'h driving)', newHeading: nh,
            pos: { lat: rp.lat, lon: rp.lon } });
          P0 = { lat: rp.lat, lon: rp.lon }; legStartMs = slot.wallEnd.getTime(); curHead = nh;
        }
        continue;
      }
      curHead = target;   // the leg into this cash aims at the net target direction
      var cp = cashPoint(P0, slot, TP_DIR_DEG[target.dir]);
      if (cp) {
        var endWall = new Date(cp.t);
        pushLeg(endWall, i, '');
        var nh2 = nextTargetFrom(i + 1) || target;
        timeline.push({ type: 'stop', atWall: endWall, slotIdx: i,
          reason: 'cashed a net ' + target.dir + ' trip from the start point (positive ' + slot.brPy + ' hour)',
          newHeading: nh2, pos: cp.pos });
        P0 = cp.pos; legStartMs = cp.t; curHead = nh2;
      }
      // if no cash point this slot: keep driving (P0 unchanged), the direction was not achievable here
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
      status.textContent = 'Searching Open Charge Map (≤ ' + Math.round(usableKm) + ' km usable)…';
      tpFetchChargers({ key: key, lat: O.lat, lon: O.lon, radiusKm: Math.min(Math.ceil(usableKm) + corridorKm, 250), maxResults: 100 })
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

          var chosen = [], anyLow = false, anyFb = false, prevAlong = 0;
          if (bounds.length) {
            bounds.forEach(function (b) {
              var hi = b.alongKm, lo = Math.max(0, hi - PRE_KM);
              var pk = pickForWindow(lo, hi, prevAlong);
              if (pk && pk.row) {
                var dup = chosen.some(function (c) { return c.row.s.lat === pk.row.s.lat && c.row.s.lon === pk.row.s.lon; });
                if (!dup) { pk.stopRef = b.stop; chosen.push(pk); if (pk.lowPower) anyLow = true; if (pk.fallback) anyFb = true; prevAlong = pk.row.alongKm; }
              }
            });
          }
          // Fallback: no cash stops (or none found at them) -> single best fast charger along the whole reachable route.
          if (!chosen.length) {
            var pkG = pickForWindow(0, usableKm, 0);
            if (pkG && pkG.row) { chosen.push(pkG); anyLow = pkG.lowPower; anyFb = pkG.fallback; }
          }

          if (!chosen.length) {
            status.style.color = '#b58900';
            status.textContent = 'No charging station \u2265 ' + TP_MIN_KW2 + ' kW near the stops within ' + Math.round(usableKm) + ' km.';
            if (auto) { tpReportCharger({ error: 'none' }); window._tpChargerPending = false; }
            return;
          }

          status.style.color = '#1b6e2f';
          status.textContent = '\u2713 ' + chosen.length + ' charging stop' + (chosen.length === 1 ? '' : 's') + ' near the 2-hour boundaries' +
            (anyLow ? ' (\u2265' + TP_MIN_KW2 + ' kW - no \u2265' + TP_MIN_KW + ' kW found)' : '') +
            (anyFb ? ' (other networks)' : '') + '.';

          // Attach each chosen charger to its quadrant-exit stop so the Maps export
          // shows them interleaved (exit -> charger -> next exit ...). A fallback
          // charger with no cash stop goes into the free-text waypoints instead.
          var exEl = document.getElementById('tp-extra-wp');
          chosen.forEach(function (c) {
            var s = c.row.s;
            if (c.stopRef) {
              c.stopRef.charger = { lat: s.lat, lon: s.lon, title: s.title || s.operator || 'Charger' };
            } else if (exEl) {
              var token = s.lat.toFixed(5) + ',' + s.lon.toFixed(5);
              if ((exEl.value || '').indexOf(token) < 0)
                exEl.value = exEl.value.trim() ? (exEl.value.trim().replace(/;?\s*$/, '') + '; ' + token) : token;
            }
          });
          if (exEl) exEl.dispatchEvent(new Event('input', { bubbles: true }));  // refresh the Maps URL

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
      'Pick which planned stops to include as waypoints. Each is a point <i>on the road</i> matching the planned time — ' +
      'open the link and adjust it to the nearest charger/town if needed. Add your own stops below for real-world changes ' +
      '(separate with “;”).'));

    // From (fixed)
    wrap.appendChild(el('div', { style: 'font-size:12px;color:#333;margin:2px 0;' },
      '<b>From:</b> ' + (O.name || 'Origin') + ' <span style="color:#999;">(' + tpLatLng({ lat: O.lat, lon: O.lon }) + ')</span>'));

    // Stops checklist
    var checks = [];
    if (stops.length) {
      var listWrap = el('div', { style: 'margin:6px 0 6px 4px;' });
      stops.forEach(function (st) {
        var row = el('label', { style: 'display:flex;align-items:center;gap:7px;font-size:12px;color:#333;margin:3px 0;cursor:pointer;' });
        var cb = el('input', { type: 'checkbox' });
        cb.checked = true;
        var icon = st.charge ? '🔌' : '🛑';
        var when = fmtHMonly(st.atWall);
        var dur = st.charge && st.durationMin ? ' (' + st.durationMin + ' min)' : '';
        row.appendChild(cb);
        row.appendChild(el('span', null, icon + ' <b>' + when + '</b>' + dur +
          ' <span style="color:#999;">· road point ' + tpLatLng(st.pos) + '</span>'));
        listWrap.appendChild(row);
        checks.push({ cb: cb, pos: st.pos, stop: st });
      });
      wrap.appendChild(listWrap);
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

    // Hands-free toggle: when ON, an AI-planned itinerary opens Google Maps by itself (no tap), by navigating
    // this tab to Maps. Meant for driving: wake the phone, give the voice command, then just tap "send to car".
    var hfLab = el('label', { style: 'display:flex;align-items:center;gap:7px;margin:8px 0 0;font-size:12px;color:#444;cursor:pointer;' });
    var hfCb = el('input', { type: 'checkbox', id: 'tp-automaps' });
    hfCb.checked = tpAutoMapsOn();
    hfCb.addEventListener('change', function () { tpSetAutoMaps(hfCb.checked); });
    hfLab.appendChild(hfCb);
    hfLab.appendChild(el('span', null, '🚗 Hands-free (default ON): when the AI plans a trip, open Google Maps automatically (no tap). The app switches to Maps. Untick to keep the planner open instead.'));
    wrap.appendChild(hfLab);

    function collectWaypoints() {
      var wps = [];
      checks.filter(function (c) { return c.cb.checked; }).forEach(function (c) {
        wps.push(tpLatLng(c.pos));                                   // the quadrant-exit point
        if (c.stop && c.stop.charger && isFinite(c.stop.charger.lat) && isFinite(c.stop.charger.lon))
          wps.push(tpLatLng(c.stop.charger));                       // its recommended charger, right after
      });
      var extra = (extraInp.value || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      wps = wps.concat(extra);
      // Google Maps keeps only a limited number of waypoints; trim from the far
      // end so the nearest exit+charger pairs (the ones you reach first) survive.
      if (wps.length > TP_MAPS_MAX_WAYPOINTS) wps = wps.slice(0, TP_MAPS_MAX_WAYPOINTS);
      return wps;
    }
    function update() {
      var wps = collectWaypoints();
      var n = wps.length;
      var url = tpBuildMapsUrl({ lat: O.lat, lon: O.lon }, { lat: Dst.lat, lon: Dst.lon }, wps);
      openBtn._url = url; copyBtn._url = url;
      var warn = (n > TP_MAPS_MAX_WAYPOINTS)
        ? ' <span style="color:#b00;">⚠️ ' + n + ' waypoints — Maps may keep only the first ' + TP_MAPS_MAX_WAYPOINTS + '. Deselect a few.</span>'
        : '';
      status.innerHTML = '<b>' + n + '</b> waypoint' + (n === 1 ? '' : 's') + ' selected (added after the planned stops, in order). ' +
        'You can drag to reorder once Maps opens.' + warn;
    }
    checks.forEach(function (c) { c.cb.addEventListener('change', update); });
    extraInp.addEventListener('input', update);
    openBtn.addEventListener('click', function () { tpOpenInMaps(false); });
    copyBtn.addEventListener('click', function () { tpCopyToClipboard(copyBtn._url, copyBtn, '✓ Copied', '🔗 Copy link'); });
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
          toward: tpHeadDirOnly(it.newHeading) };
      });
      var lines = [];
      lines.push((result.origin.name || 'Origin') + ' → ' + (result.dest.name || 'Destination') +
        ' · bearing ' + Math.round(result.bearing) + '° (' + result.snapDir + ')' +
        (result.usedRealRoute && rm.km ? ' · real road ' + Math.round(rm.km) + ' km' + (drive ? ' · ' + drive + ' driving' : '') : ' · straight-line estimate'));
      plan.forEach(function (it) {
        if (it.type === 'leg') {
          lines.push('Drive ' + fmtHMonly(it.startWall) + '→' + fmtHMonly(it.endWall) + ' (' + (Math.round(it.durationH * 10) / 10) + 'h) toward ' + tpHeadDirOnly(it.heading) + (it.note === 'arrival' ? ' — arrive at ' + result.dest.name : ''));
        } else {
          lines.push((it.charge ? 'Charge ' + it.durationMin + ' min' : 'Stop ' + (20) + ' min') + ' at ' + fmtHMonly(it.atWall) + ', then set off toward ' + tpHeadDirOnly(it.newHeading));
        }
      });
      window._tpLastResult = {
        stamp: Date.now(),
        origin: result.origin.name || null, dest: result.dest.name || null,
        bearing: Math.round(result.bearing), snapped: result.snapDir,
        real_route: !!result.usedRealRoute, km: rm.km ? Math.round(rm.km) : null, driving_time: drive,
        stops: nStops, legs: legs, has_hour_data: !!result.hasHourData,
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
  function tpRequestCode(onSuccess) {
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
    card.appendChild(el('div', { style: 'font-size:17px;font-weight:700;color:#1565c0;margin-bottom:6px;' }, '🔒 Travel Planner (preview)'));
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
  function tpOpenReal() {
    var existing = document.getElementById('tp-overlay');
    if (existing) { existing.style.display = 'flex'; return; }

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

    ov.querySelector('#tp-close').addEventListener('click', function () { ov.style.display = 'none'; });
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
  // Open the planner with the fields PRE-FILLED (and optionally run the plan).
  // Used by the AI assistant so "plan an itinerary from A to B" actually fills
  // origin/destination/departure (+ EV range/reserve) and launches the road plan,
  // instead of opening a blank panel. Waits for the panel to exist (handles the
  // unlock-code case) before filling. params keys: originLat/originLon/originName,
  // destLat/destLon/destName, departDate ('YYYY-MM-DD'), departTime ('HH:MM'),
  // durationH, utc, rangeKm, reserveKm, charges, worker, run (default true).
  function tpOpenPrefilled(params) {
    params = params || {};
    window._tpGuideShown = true;                       // don't show the guide overlay when the AI opens it
    window._tpAutoChargers = (params.autoChargers !== false);  // auto-run "Find charging stops" after the plan
    window._tpChargerPending = (params.autoChargers !== false); // hands-free navigation waits until this clears
    window._tpFromAI = true;                            // push the computed itinerary into the AI chat when done
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
      set('tp-dur', params.durationH);   set('tp-utc', params.utc);
      var dstEl = document.getElementById('tp-dst'); if (dstEl && params.dst != null) dstEl.checked = !!params.dst;
      set('tp-range', params.rangeKm);   set('tp-reserve', params.reserveKm);
      set('tp-charges', params.charges); set('tp-worker', params.worker);
      var canRun = params.run !== false &&
        params.originLat != null && params.destLat != null &&
        document.getElementById('tp-date').value && document.getElementById('tp-time').value;
      if (canRun) { var b = document.getElementById('tp-scan'); if (b) b.click(); }
    }
    fill();
    return true;
  }

  /* ===== LIVE COMPASS: net bearing + quadrant from the reference point ===== *
   * While driving (screen on, app foreground) it shows, in real time from GPS:
   *  - net bearing (degrees) + 8-direction quadrant FROM the reference point
   *    (origin, advancing to the last stop you have passed),
   *  - the favourable direction active right now, and a warning when you are
   *    about to leave its quadrant (time to stop & cash). No Wake Lock: it
   *    recomputes on screen wake (visibilitychange) and via the ↻ button.
   * ----------------------------------------------------------------------- */
  var _tpCmpWatch = null, _tpCmpPos = null, _tpRefMode = 'auto', _tpCmpState = null;
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
  function tpCmpRender() {
    var box = document.getElementById('tp-cmp-body'); if (!box) return;
    var live = window._tpLive;
    if (!live) { box.innerHTML = '<div style="color:#888;font-size:13px;">Compute a trip first (set From/To, SCAN TRIP), then reopen.</div>'; return; }
    if (!_tpCmpPos) { box.innerHTML = '<div style="color:#888;font-size:13px;">Waiting for GPS… allow location and tap ↻.</div>'; return; }
    var pos = _tpCmpPos, ref = live.originPos, refLabel = 'from start';
    if (_tpRefMode !== 'origin' && live.stops && live.stops.length) {
      var myToDest = tpHaversineKm(pos.lat, pos.lon, live.destPos.lat, live.destPos.lon), best = null;
      live.stops.forEach(function (s) {
        var sToDest = tpHaversineKm(s.lat, s.lon, live.destPos.lat, live.destPos.lon);
        if (sToDest > myToDest || tpHaversineKm(pos.lat, pos.lon, s.lat, s.lon) < 3) best = s;   // passed it, or you're at it
      });
      if (best) { ref = { lat: best.lat, lon: best.lon }; refLabel = 'from last stop'; }
    }
    var deg = tpBearing(ref.lat, ref.lon, pos.lat, pos.lon), q = tpQ8(deg);
    var distKm = tpHaversineKm(ref.lat, ref.lon, pos.lat, pos.lon);
    var now = Date.now(), slot = null;
    (live.favSlots || []).forEach(function (s) { if (now >= s.startMs && now < s.endMs) slot = s; });
    var html = '<div style="font-size:46px;font-weight:800;line-height:1;color:#1565c0;">' + Math.round(deg) + '°</div>' +
      '<div style="font-size:24px;font-weight:700;margin-top:2px;">' + q + '</div>' +
      '<div style="font-size:12px;color:#666;margin-top:4px;">' + refLabel + ' · ' + (distKm < 10 ? distKm.toFixed(1) : Math.round(distKm)) + ' km</div>';
    if (distKm < 1) html += '<div style="font-size:12px;color:#b58900;margin-top:4px;">Too close to the reference for a stable bearing.</div>';
    html += '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #eee;font-size:13px;">';
    if (slot) {
      var diff = tpAngDiff(deg, slot.deg), inSec = diff <= 22.5, margin = Math.round(22.5 - diff);
      var qTarget = tpQ8(slot.deg);
      var state = !inSec ? 'left' : (diff >= 17 ? 'edge' : 'inside');
      var stateKey = slot.startMs + ':' + state;   // tie the spoken alert to this window + state
      if (state !== 'inside' && stateKey !== _tpCmpState) tpCmpAlert(state, qTarget);
      _tpCmpState = (state === 'inside') ? (slot.startMs + ':inside') : stateKey;
      html += 'Favourable now: <b>' + qTarget + '</b> (' + slot.dir + (slot.ganzhi ? ' · ' + slot.ganzhi : '') + ')</div>';
      if (!inSec) html += '<div style="color:#b00;font-weight:700;font-size:14px;margin-top:3px;">\u26a0 You have LEFT the ' + qTarget + ' quadrant.</div>';
      else if (diff >= 17) html += '<div style="color:#b58900;font-weight:700;font-size:14px;margin-top:3px;">\u26a0 About to leave ' + qTarget + ' (~' + margin + '\u00b0 margin) — consider stopping to cash it.</div>';
      else html += '<div style="color:#1b6e2f;font-size:13px;margin-top:3px;">\u2713 Inside ' + qTarget + ' (~' + margin + '\u00b0 to the edge).</div>';
    } else {
      _tpCmpState = null;
      html += 'No favourable window active now. Overall trip: <b>' + live.overallDir + '</b> ' + live.overallBearing + '\u00b0.</div>';
    }
    box.innerHTML = html;
  }
  function tpCmpRefreshOnce() {
    if (!navigator.geolocation) { var b = document.getElementById('tp-cmp-body'); if (b) b.innerHTML = '<div style="color:#b00;font-size:13px;">No geolocation on this device.</div>'; return; }
    navigator.geolocation.getCurrentPosition(
      function (p) { _tpCmpPos = { lat: p.coords.latitude, lon: p.coords.longitude }; tpCmpRender(); },
      function () {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }
  function tpCmpStart() {
    if (!navigator.geolocation || _tpCmpWatch != null) return;
    _tpCmpWatch = navigator.geolocation.watchPosition(
      function (p) { _tpCmpPos = { lat: p.coords.latitude, lon: p.coords.longitude }; tpCmpRender(); },
      function (err) { var b = document.getElementById('tp-cmp-body'); if (b && !_tpCmpPos) b.innerHTML = '<div style="color:#b00;font-size:13px;">GPS error: ' + (err && err.message) + '. Allow location and tap ↻.</div>'; },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }
  function tpCmpStop() { if (_tpCmpWatch != null) { try { navigator.geolocation.clearWatch(_tpCmpWatch); } catch (e) {} _tpCmpWatch = null; } }
  function tpOpenCompass() {
    var ov = document.getElementById('tp-cmp-ov');
    if (!ov) {
      ov = el('div', { id: 'tp-cmp-ov', style: 'position:fixed;left:12px;bottom:80px;z-index:99996;width:230px;background:#fff;border:2px solid #1565c0;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.3);' });
      var head = el('div', { style: 'display:flex;align-items:center;gap:6px;background:#1565c0;color:#fff;border-radius:10px 10px 0 0;padding:7px 9px;' });
      head.appendChild(el('div', { style: 'flex:1;font-size:13px;font-weight:700;' }, '🧭 Live compass'));
      var refBtn = el('button', { id: 'tp-cmp-ref', type: 'button', title: 'Reference: Auto (origin→last stop) / Origin only', style: 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;' }, 'Auto');
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
      cls.addEventListener('click', function () { tpCmpStop(); ov.style.display = 'none'; });
      head.appendChild(refBtn); head.appendChild(vox); head.appendChild(refr); head.appendChild(cls);
      ov.appendChild(head);
      ov.appendChild(el('div', { id: 'tp-cmp-body', style: 'padding:12px;text-align:center;color:#222;' }));
      document.body.appendChild(ov);
    }
    ov.style.display = 'block';
    tpCmpRender(); tpCmpStart(); tpCmpRefreshOnce();
  }
  document.addEventListener('visibilitychange', function () {
    var ov = document.getElementById('tp-cmp-ov');
    if (!document.hidden && ov && ov.style.display !== 'none') tpCmpRefreshOnce();   // recompute on screen wake (no Wake Lock)
  });
  function tpInstallCompassFab() {
    if (document.getElementById('tp-compass-fab')) return;
    var b = el('button', { id: 'tp-compass-fab', type: 'button', title: 'Live compass',
      style: 'position:fixed;left:14px;bottom:14px;z-index:99994;width:46px;height:46px;border:0;border-radius:50%;background:#1565c0;color:#fff;font-size:21px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);' }, '🧭');
    b.addEventListener('click', tpOpenCompass);
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tpInstallCompassFab); else tpInstallCompassFab();

  window.TravelPlanner = {
    plan: tpPlan,
    open: tpOpen,
    openCompass: tpOpenCompass,
    openPrefilled: tpOpenPrefilled,
    evalPalace: tpPalaceOK,
    getLastResult: function () { return window._tpLastResult || null; },
    openInMaps: function (navigate) { return tpOpenInMaps(!!navigate); },
    getAutoMaps: tpAutoMapsOn,
    setAutoMaps: tpSetAutoMaps,
    config: function (favDoors) { if (favDoors) TP_FAV_DOORS = favDoors; return TP_FAV_DOORS.slice(); }
  };
  // Expose tpOpen as a global so the TRAVEL PLANNER tab button (onclick="tpOpen()") works.
  window.tpOpen = tpOpen;
  window.tpOpenPrefilled = tpOpenPrefilled;
})();

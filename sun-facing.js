// ============================================================
// XKDG — sun-facing.js  (session 31)
// ============================================================
// "☀️ Sun facing": measure a house facing with the sun instead of a compass
// (Edu's method). A card lies LEVEL on the window sill, one straight edge flush
// against the wall plane (frame/glass, not a splayed reveal); a vertical object
// casts a shadow line on it; the user notes the exact time and the angle α
// between the shadow line and the card edge, on the side the shadow leans to.
//
// Standing inside, looking out of the window:
//   shadow leaning LEFT  → window facing = sun azimuth − (90° − α)
//   shadow leaning RIGHT → window facing = sun azimuth + (90° − α)
// That is the TRUE bearing; the app's facings are MAGNETIC, so the WMM
// declination (XKDGGeoMag, geomag.js) is subtracted: magnetic = true − decl.
// Sun position: NOAA solar position algorithm (≈0.01°).
// ============================================================
(function () {
  'use strict';
  var RAD = Math.PI / 180;
  function norm(d) { return ((d % 360) + 360) % 360; }
  function angDiff(a, b) { return ((a - b + 540) % 360) - 180; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  var D8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function d8(deg) { return D8[Math.round(norm(deg) / 45) % 8]; }

  // ── NOAA solar position ────────────────────────────────────
  function sunPosition(date, lat, lon) {
    var jd = date.getTime() / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
    var L0 = norm(280.46646 + T * (36000.76983 + T * 0.0003032));
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
    var omega = 125.04 - 1934.136 * T;
    var lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * Math.cos(omega * RAD);
    var decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) / RAD;
    var y = Math.tan(eps / 2 * RAD); y *= y;
    var eot = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
              - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));            // minutes
    var utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    var tst = utcMin + eot + 4 * lon;                                                           // true solar time, minutes
    var ha = tst / 4 - 180;                                                                      // hour angle, degrees
    var cz = Math.sin(lat * RAD) * Math.sin(decl * RAD) + Math.cos(lat * RAD) * Math.cos(decl * RAD) * Math.cos(ha * RAD);
    cz = Math.max(-1, Math.min(1, cz));
    var zen = Math.acos(cz) / RAD;
    var az = Math.atan2(Math.sin(ha * RAD), Math.cos(ha * RAD) * Math.sin(lat * RAD) - Math.tan(decl * RAD) * Math.cos(lat * RAD)) / RAD + 180;
    return { azimuth: norm(az), altitude: 90 - zen };
  }
  function declination(lat, lon, date) {
    try { if (window.XKDGGeoMag && XKDGGeoMag.declination) return XKDGGeoMag.declination(lat, lon, date); } catch (e) {}
    return null;
  }
  // One measurement → facing of the window.
  function compute(m, lat, lon) {
    var date = (m.date instanceof Date) ? m.date : parseLocal(m.date);
    if (!date || isNaN(date)) return { error: 'Invalid date/time.' };
    var a = +m.alpha;
    if (!(a >= 0 && a <= 90)) return { error: 'The angle α must be between 0 and 90° (the acute angle between the shadow line and the card edge).' };
    var side = String(m.side || '').toLowerCase();
    if (side !== 'left' && side !== 'right') return { error: 'Say whether the shadow leans LEFT or RIGHT (standing inside, looking out).' };
    var sp = sunPosition(date, lat, lon);
    var trueF = norm(side === 'left' ? sp.azimuth - (90 - a) : sp.azimuth + (90 - a));
    var dec = declination(lat, lon, date);
    var out = { time: date.toString().slice(0, 24), sun_azimuth: r1(sp.azimuth), sun_altitude: r1(sp.altitude),
                true_facing: r1(trueF), declination: dec != null ? r1(dec) : null,
                magnetic_facing: dec != null ? r1(norm(trueF - dec)) : null, warnings: [] };
    if (sp.altitude <= 0) out.warnings.push('The sun is below the horizon at that time: check the date, time and time zone.');
    else if (sp.altitude < 4) out.warnings.push('The sun is very low: refraction and a long blurred shadow make it less precise.');
    if (sp.altitude > 60) out.warnings.push('The sun is high: the shadow is short and the azimuth changes fast - better a reading in the morning or afternoon.');
    if (a < 5) out.warnings.push('The shadow is almost parallel to the window: the sun hits the window from the side, a small error in α weighs more.');
    return out;
  }
  function parseLocal(s) {
    var m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }
  function circMean(arr) {
    var sx = 0, sy = 0; arr.forEach(function (d) { sx += Math.cos(d * RAD); sy += Math.sin(d * RAD); });
    return norm(Math.atan2(sy, sx) / RAD);
  }
  function summary(results, houseFacing) {
    var mags = results.filter(function (r) { return r.magnetic_facing != null; }).map(function (r) { return r.magnetic_facing; });
    if (!mags.length) return null;
    var mean = circMean(mags), spread = Math.max.apply(null, mags.map(function (d) { return Math.abs(angDiff(d, mean)); }));
    var s = { measurements: mags.length, window_magnetic_facing: r1(mean), spread: r1(spread),
              if_window_on_facade: r1(mean), if_window_on_back: r1(norm(mean + 180)) };
    if (houseFacing != null) {
      var walls = [0, 90, 180, 270].map(function (k) { return norm(houseFacing + k); });
      var best = walls.map(function (w) { return { w: w, d: angDiff(mean, w) }; }).sort(function (p, q) { return Math.abs(p.d) - Math.abs(q.d); })[0];
      s.saved_house_facing = houseFacing;
      s.closest_wall_of_saved_facing = best.w; s.difference_from_it = r1(best.d);
    }
    return s;
  }
  function getLocation() {
    return new Promise(function (resolve) {
      var fallback = function () {
        try { var g = JSON.parse(localStorage.getItem('xkdg_gps') || 'null'); if (g && isFinite(g.lat) && isFinite(g.lng)) return resolve({ lat: +g.lat, lon: +g.lng, src: 'last GPS fix' }); } catch (e) {}
        resolve(null);
      };
      if (!navigator.geolocation) return fallback();
      navigator.geolocation.getCurrentPosition(function (p) { resolve({ lat: p.coords.latitude, lon: p.coords.longitude, src: 'GPS now' }); },
        fallback, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
    });
  }

  // ── house helpers ─────────────────────────────────────────
  function houseRef(key, idx) {
    var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {};
    var h = all[key] && all[key][idx]; if (!h) return null;
    var f = (typeof _fsActiveFloor === 'function') ? _fsActiveFloor(h) : null;
    var hf = (typeof _fsFloorFacing === 'function') ? _fsFloorFacing(h, f) : h.houseFacing;
    return { all: all, h: h, f: f, facing: hf != null ? norm(+hf) : null };
  }
  function findHouse(name) {
    var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {};
    var keys = Object.keys(all), want = name ? String(name).trim().toLowerCase() : '';
    if (want) { for (var i = 0; i < keys.length; i++) { var arr = all[keys[i]] || []; for (var j = 0; j < arr.length; j++) if (arr[j] && String(arr[j].name || '').trim().toLowerCase() === want) return { key: keys[i], idx: j }; } return null; }
    try {
      var p = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
      if (p && all[p.name] && all[p.name].length) { var a = (typeof _fsActiveHouseGet === 'function') ? _fsActiveHouseGet(p.name) : 0; return { key: p.name, idx: (a < all[p.name].length ? a : 0) }; }
    } catch (e) {}
    return null;
  }
  function saveHouseFacing(key, idx, deg) {
    var R = houseRef(key, idx); if (!R) return false;
    deg = Math.round(norm(deg) * 10) / 10;
    var oldF = R.facing;
    R.h.houseFacing = deg;
    (R.h.floors || []).forEach(function (fl, i) { if (R.h.sameFacing || fl === R.f) fl.facing = deg; });
    // walls follow the facing: doors / items / bed / desk turn with it (app-fengshui.js)
    try { if (typeof fsAlignFloorsToFacing === 'function') fsAlignFloorsToFacing(R.h, R.h.sameFacing ? R.h.floors : [R.f], oldF, deg); } catch (e) {}
    _fsHousesSave(R.all);
    try { if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles(); } catch (e) {}
    return deg;
  }

  // ── dialog ────────────────────────────────────────────────
  var S = null;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nowLocal() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function open(key, idx) {
    var R = houseRef(key, idx); if (!R) { alert('House not found.'); return; }
    S = { key: key, idx: idx, name: R.h.name, facing: R.facing, loc: null, rows: [] };
    var old = document.getElementById('xsf-modal'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'xsf-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;overflow-y:auto;';
    m.innerHTML = '<div style="background:#fff;margin:10px auto;max-width:720px;border-radius:10px;overflow:hidden;">' +
      '<div style="background:#f9a825;color:#3e2723;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">' +
      '<b>☀️ Sun facing — ' + esc(S.name) + '</b><button onclick="XKDGSunFacing.close()" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="padding:10px 12px;font-size:12px;color:#333;line-height:1.5;">' +
      '<ol style="margin:0 0 8px 18px;padding:0;">' +
        '<li>Lay a card <b>level</b> on the sill, one straight edge flush against the <b>wall plane</b> (frame or glass, not the splayed reveal).</li>' +
        '<li>Stand a <b>tube or a bottle</b> on it. Its shadow has two parallel edges: trace the edge <b>nearest the card edge</b> (the side the shadow leans to).</li>' +
        '<li>Note the time <b>at that moment</b> (tap "Now").</li>' +
        '<li>Measure the acute angle α between the shadow line and the card edge, on the side the shadow leans to.</li>' +
        '<li>Standing inside and looking out: does the shadow lean <b>left</b> or <b>right</b>?</li></ol>' +
      '<div id="xsf-loc" style="margin-bottom:6px;color:#555;">Getting your position…</div>' +
      '<div id="xsf-rows"></div>' +
      '<button onclick="XKDGSunFacing._add()" style="padding:5px 10px;border-radius:6px;border:1px solid #f9a825;background:#fffde7;cursor:pointer;">➕ Add a measurement</button>' +
      '<div id="xsf-sum" style="margin-top:10px;"></div>' +
      '</div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.body.appendChild(m);
    addRow();
    getLocation().then(function (loc) {
      if (!S) return; S.loc = loc;
      document.getElementById('xsf-loc').innerHTML = loc ? ('Position: ' + loc.lat.toFixed(4) + ', ' + loc.lon.toFixed(4) + ' <span style="color:#888;">(' + loc.src + ')</span>') :
        '<span style="color:#c62828;">No position: allow location access, or open the app\'s GPS once.</span>';
      recompute();
    });
  }
  function addRow() {
    S.rows.push({ t: nowLocal(), alpha: '', side: '' });
    renderRows();
  }
  function renderRows() {
    var box = document.getElementById('xsf-rows'); if (!box) return;
    box.innerHTML = S.rows.map(function (r, i) {
      return '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid #eee;">' +
        '<b>#' + (i + 1) + '</b>' +
        '<input type="datetime-local" step="1" value="' + esc(r.t) + '" onchange="XKDGSunFacing._set(' + i + ',\'t\',this.value)" style="font-size:12px;">' +
        '<button onclick="XKDGSunFacing._now(' + i + ')" style="font-size:11px;border:1px solid #ccc;background:#fff;border-radius:5px;cursor:pointer;">Now</button>' +
        '<span>α <input type="number" step="0.5" min="0" max="90" value="' + esc(r.alpha) + '" onchange="XKDGSunFacing._set(' + i + ',\'alpha\',this.value)" style="width:56px;font-size:12px;">°</span>' +
        '<select onchange="XKDGSunFacing._set(' + i + ',\'side\',this.value)" style="font-size:12px;"><option value="">shadow leans…</option>' +
          '<option value="left"' + (r.side === 'left' ? ' selected' : '') + '>left</option><option value="right"' + (r.side === 'right' ? ' selected' : '') + '>right</option></select>' +
        '<button onclick="XKDGSunFacing._del(' + i + ')" style="font-size:11px;border:1px solid #ffcdd2;background:#fff0f0;color:#c62828;border-radius:5px;cursor:pointer;">✕</button>' +
        '<div id="xsf-res-' + i + '" style="flex-basis:100%;color:#555;"></div></div>';
    }).join('');
    recompute();
  }
  function recompute() {
    if (!S) return;
    var res = [];
    S.rows.forEach(function (r, i) {
      var el = document.getElementById('xsf-res-' + i); if (!el) return;
      if (!S.loc || r.alpha === '' || !r.side) { el.textContent = ''; return; }
      var c = compute({ date: r.t.replace('T', ' '), alpha: r.alpha, side: r.side }, S.loc.lat, S.loc.lon);
      if (c.error) { el.innerHTML = '<span style="color:#c62828;">' + esc(c.error) + '</span>'; return; }
      res.push(c);
      el.innerHTML = 'Sun ' + c.sun_azimuth + '° (altitude ' + c.sun_altitude + '°) → window facing <b>' + c.true_facing + '° true</b>' +
        (c.magnetic_facing != null ? ', declination ' + c.declination + '° → <b style="color:#e65100;">' + c.magnetic_facing + '° magnetic (' + d8(c.magnetic_facing) + ')</b>' : '') +
        (c.warnings.length ? '<br><span style="color:#b45309;">⚠ ' + esc(c.warnings.join(' ')) + '</span>' : '');
    });
    var s = summary(res, S.facing), box = document.getElementById('xsf-sum'); if (!box) return;
    if (!s) { box.innerHTML = ''; return; }
    var btn = 'padding:6px 10px;border-radius:6px;border:none;cursor:pointer;margin:4px 6px 0 0;';
    box.innerHTML = '<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:8px 10px;">' +
      '<b>Window facing: ' + s.window_magnetic_facing + '° magnetic</b>' + (s.measurements > 1 ? ' (average of ' + s.measurements + ', spread ±' + s.spread + '°' + (s.spread > 1.5 ? ' — ⚠ the readings disagree, check them' : '') + ')' : ' — add one or two more readings to confirm') +
      (s.saved_house_facing != null ? '<br>Saved house facing ' + s.saved_house_facing + '°: the nearest wall direction is ' + s.closest_wall_of_saved_facing + '°, difference ' + (s.difference_from_it > 0 ? '+' : '') + s.difference_from_it + '°.' : '') +
      '<br><button onclick="XKDGSunFacing._save(' + s.if_window_on_facade + ')" style="' + btn + 'background:#2e7d32;color:#fff;">Window on the façade → house facing ' + s.if_window_on_facade + '°</button>' +
      '<button onclick="XKDGSunFacing._save(' + s.if_window_on_back + ')" style="' + btn + 'background:#5d4037;color:#fff;">Window on the back → house facing ' + s.if_window_on_back + '°</button>' +
      '<div style="color:#777;margin-top:4px;">A window on a side wall gives the facing ±90°: tell the assistant which side, or type it in the house.</div></div>';
  }
  function close() { var m = document.getElementById('xsf-modal'); if (m) m.remove(); S = null; }

  window.XKDGSunFacing = {
    sunPosition: sunPosition, compute: compute,
    open: open, close: close,
    // AI: one or more measurements → result (+ optional save)
    measure: function (o) {
      o = o || {};
      var list = Array.isArray(o.measurements) && o.measurements.length ? o.measurements
        : [{ date_time: o.date_time, alpha_deg: o.alpha_deg, shadow_side: o.shadow_side }];
      var withLoc = function (loc) {
        if (!loc) return { error: 'No position: give lat/lon, or ask the user to allow location access.' };
        var res = list.map(function (m) { return compute({ date: m.date_time, alpha: m.alpha_deg, side: m.shadow_side }, loc.lat, loc.lon); });
        var bad = res.filter(function (r) { return r.error; }); if (bad.length) return { error: bad[0].error };
        var hs = findHouse(o.house_name), R = hs ? houseRef(hs.key, hs.idx) : null;
        var out = { position: { lat: +loc.lat.toFixed(4), lon: +loc.lon.toFixed(4), source: loc.src || 'given' }, readings: res,
                    summary: summary(res, R ? R.facing : null), house: R ? R.h.name : null };
        if (o.save_as && hs && out.summary) {
          var v = o.save_as === 'back' ? out.summary.if_window_on_back : (o.save_as === 'facade' ? out.summary.if_window_on_facade
                : (isFinite(+o.save_as) ? +o.save_as : null));
          if (v != null) out.saved_house_facing = saveHouseFacing(hs.key, hs.idx, v);
        }
        return out;
      };
      if (isFinite(+o.lat) && isFinite(+o.lon) && o.lat !== null && o.lon !== null && o.lat !== '' && o.lon !== '') return withLoc({ lat: +o.lat, lon: +o.lon, src: 'given' });
      return getLocation().then(withLoc);
    },
    openForHouse: open,
    _add: function () { addRow(); },
    _now: function (i) { S.rows[i].t = nowLocal(); renderRows(); },
    _set: function (i, k, v) { S.rows[i][k] = v; recompute(); },
    _del: function (i) { S.rows.splice(i, 1); if (!S.rows.length) addRow(); else renderRows(); },
    _save: function (v) {
      if (!confirm('Save ' + v + '° as the house facing of "' + S.name + '"?')) return;
      var d = saveHouseFacing(S.key, S.idx, v); S.facing = d; alert('House facing saved: ' + d + '°'); recompute();
    }
  };
})();

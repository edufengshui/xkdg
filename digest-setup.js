// ============================================================
// XKDG — digest-setup.js  (session 31)
// ============================================================
// "📧 Daily email" in House Profiles: builds the line of the GitHub secret
// XKDG_DIGEST_RECIPIENTS for the loaded person — birth data + every house they
// live in (owner, guest or member) with the placements that have a day scan in
// the app: door + fountain (Water scan), bed sitting (Bed scan), desk facing
// (Desk scan). The daily email (digest/) runs those same scans on GitHub.
// Occupants other than the person travel as their YEAR pillar only.
// ============================================================
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? Math.round(n * 100) / 100 : null; }

  function archiveRec(name) {
    try {
      var a = loadArchive('xkdg_persons_a') || {}, b = loadArchive('xkdg_persons_b') || {};
      return a[name] || b[name] || null;
    } catch (e) { return null; }
  }
  function yearJiazi(name) {
    var rec = archiveRec(name); if (!rec) return null;
    if ((rec.depth === 1 || !rec.date) && rec.jiaZiYear) return rec.jiaZiYear.slice(0, 2);
    try {
      var geo = isFinite(rec.birthLon) ? { lon: rec.birthLon, tz: -(((rec.birthUtc || 0) * 60) + (rec.birthDst ? 60 : 0)) } : undefined;
      var P = (typeof _tstPillarsFor === 'function') ? _tstPillarsFor(rec.date, rec.time || '12:00', geo) : null;
      return P ? P.year : null;
    } catch (e) { return null; }
  }
  function houseOps(h) {
    var ops = [];
    (h.floors || []).forEach(function (f, fi) {
      var fl = (h.floors.length > 1) ? (f.label || ('Floor ' + (fi + 1))) + ' · ' : '';
      (f.doors || []).forEach(function (d) {
        if (d && num(d.facing) != null && num(d.water) != null)
          ops.push({ kind: 'water', name: fl + (d.name || 'Door') + ' fountain', facing: num(d.facing), water: num(d.water) });
      });
      var st = f.settings || {};
      (st.water || []).forEach(function (s) {
        var fc = num(s.doorFacing), wt = num(s.water);
        if (fc != null && wt != null) ops.push({ kind: 'water', name: fl + (s.name || 'Water'), facing: fc, water: wt });
      });
      (st.bed || []).forEach(function (s) {
        if (num(s.bedSitting) != null) ops.push({ kind: 'bed', name: fl + (s.name || 'Bed'), sitting: num(s.bedSitting) });
        if (num(s.bedWater) != null && num(s.bedSitting) != null)
          ops.push({ kind: 'water', name: fl + (s.name || 'Bed') + ' fountain', facing: num((+s.bedSitting + 180) % 360), water: num(s.bedWater) });
      });
      (st.desk || []).forEach(function (s) {
        if (num(s.deskFacing) != null) ops.push({ kind: 'desk', name: fl + (s.name || 'Desk'), facing: num(s.deskFacing) });
        if (num(s.deskWater) != null && num(s.deskFacing) != null)
          ops.push({ kind: 'water', name: fl + (s.name || 'Desk') + ' fountain', facing: num(s.deskFacing), water: num(s.deskWater) });
      });
    });
    // aquariums and palace waters (no degree): activated by DIRECTION with the assistant's
    // aquarium tool (XKDG + Qimen at the palace), using the floor's flying-star chart
    try {
      var N = (window.XKDGHouse && XKDGHouse.normalize) ? XKDGHouse.normalize(h) : null;
      (N ? N.floors : []).forEach(function (f, fi) {
        var fl = (N.floors.length > 1) ? (f.label || ('Floor ' + (fi + 1))) + ' · ' : '';
        (f.water_features || []).forEach(function (wf) {
          if (!wf.direction || wf.direction === 'C') return;
          ops.push({ kind: 'aquarium', name: fl + (wf.name || ('Water ' + wf.direction)), direction: wf.direction,
                     facing: num(f.facing), period: f.period != null ? +f.period : null, star_num: wf.water_star != null ? wf.water_star : null });
        });
      });
    } catch (e) {}
    // de-duplicate identical placements
    var seen = {};
    return ops.filter(function (o) { var k = JSON.stringify([o.kind, o.facing, o.water, o.sitting, o.direction]); if (seen[k]) return false; seen[k] = 1; return true; });
  }
  // Where the house is: from its address or name (the email computes each house at its own longitude).
  function cityOf(h) {
    var t = ((h.address || '') + ' ' + (h.name || '')).toLowerCase();
    if (/wien|vienna|vienne/.test(t)) return 'Vienna';
    if (/tuoro|trasimeno/.test(t)) return 'Tuoro';
    return null;
  }
  function housesOf(name) {
    var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {};
    var out = [];
    Object.keys(all).forEach(function (key) {
      (all[key] || []).forEach(function (h) {
        if (!h) return;
        var owner = h.personName || key, guest = h.guest && h.guest.name;
        var members = Array.isArray(h.guests) ? h.guests : [];
        if (owner !== name && guest !== name && members.indexOf(name) < 0) return;
        var ops = houseOps(h); if (!ops.length) return;
        // the bed is for owner + guest #2 (the app's Person A + B)
        var bedPeople = [owner, guest].filter(function (n) { return n && n !== name; })
          .map(function (n) { var j = yearJiazi(n); return j ? { name: n, jiazi: j } : null; }).filter(Boolean);
        var hh = { name: h.name || 'House', ops: ops, bed_with: bedPeople };
        var c = cityOf(h); if (c) hh.city = c;
        out.push(hh);
      });
    });
    return out;
  }
  function build(name, email, city, lang, noFs) {
    var rec = archiveRec(name);
    if (!rec) return { error: '"' + name + '" is not a saved person.' };
    var o = { name: name, email: email || 'EMAIL', city: city || 'Vienna' };
    // Session 32 (Edu): a student anywhere in the world - the email is computed at HIS
    // position (true solar time) and in HIS time zone. digest.js accepts lat/lon/tz/city_label.
    if (city === 'GPS') {
      var g = null;
      try { g = JSON.parse(localStorage.getItem('xkdg_gps') || 'null'); } catch (e) {}
      var lat = g && isFinite(+g.lat) ? +g.lat : (window._lastGpsLat != null ? +window._lastGpsLat : NaN);
      var lon = g && isFinite(+g.lng) ? +g.lng : (window._lastGpsLng != null ? +window._lastGpsLng : NaN);
      if (!isFinite(lat) || !isFinite(lon)) return { error: 'No GPS position yet: allow location in the app (or open the compass once), then Build again.' };
      var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      var label = ((el('xdg-place') || {}).value || '').trim();
      delete o.city;
      o.lat = Math.round(lat * 10000) / 10000; o.lon = Math.round(lon * 10000) / 10000;
      o.tz = tz || 'UTC'; o.city_label = label || 'My location';
    }
    if (rec.date && rec.depth !== 1) { o.birth_date = rec.date; o.birth_time = rec.time || '12:00'; }
    else if (rec.jiaZiYear) o.jiazi = rec.jiaZiYear.slice(0, 2);
    else return { error: 'No birth data for "' + name + '".' };
    if (lang && lang !== 'en') o.lang = lang;
    var hs = noFs ? [] : housesOf(name); if (hs.length) o.houses = hs;   // noFs: hours only (Edu: Feng Shui only for the house's owner)
    return o;
  }

  function open() {
    var nm = ((el('person-name') || {}).value || '').trim();
    var old = el('xdg-modal'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'xdg-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;overflow-y:auto;';
    m.innerHTML = '<div style="background:#fff;margin:10px auto;max-width:640px;border-radius:10px;overflow:hidden;font-size:12px;color:#333;">' +
      '<div style="background:#4a148c;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;"><b>📧 Daily email settings</b>' +
      '<button onclick="XKDGDigestSetup.close()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="padding:10px 12px;line-height:1.6;">' +
      'This builds one line of the GitHub secret <b>XKDG_DIGEST_RECIPIENTS</b>: birth data and the houses (door fountains, bed, desk) of the person, ' +
      'so the daily email can add the Feng Shui dates.<br>' +
      'Person <input id="xdg-name" value="' + nm.replace(/"/g, '&quot;') + '" style="width:120px;"> ' +
      'Email <input id="xdg-email" type="email" placeholder="name@example.com" style="width:180px;"> ' +
      'City <select id="xdg-city" onchange="document.getElementById(\'xdg-place\').style.display=this.value===\'GPS\'?\'\':\'none\'"><option>Vienna</option><option>Tuoro</option><option value="GPS">My location (GPS)</option></select> ' +
      '<input id="xdg-place" placeholder="place name, e.g. Kuala Lumpur" style="width:170px;display:none;"> ' +
      '<label><input type="checkbox" id="xdg-fs" checked> include Feng Shui dates (houses)</label> ' +
      'Language <select id="xdg-lang"><option value="en">English</option><option value="it">Italiano</option><option value="fr">Français</option></select> ' +
      '<button onclick="XKDGDigestSetup._go()" style="padding:4px 10px;border-radius:6px;border:none;background:#4a148c;color:#fff;cursor:pointer;">Build</button>' +
      '<textarea id="xdg-out" readonly style="width:100%;height:150px;margin-top:8px;font-family:monospace;font-size:11px;"></textarea>' +
      '<div id="xdg-info" style="color:#555;"></div>' +
      '<button onclick="XKDGDigestSetup._copy()" style="margin-top:6px;padding:5px 12px;border-radius:6px;border:none;background:#2e7d32;color:#fff;cursor:pointer;">📋 Copy</button>' +
      '<div style="color:#777;margin-top:8px;">Paste it inside the [ … ] of the secret (GitHub → Settings → Secrets and variables → Actions), ' +
      'one line per person, separated by commas. Build it again after changing a house.</div></div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.body.appendChild(m);
  }
  function close() { var m = el('xdg-modal'); if (m) m.remove(); }

  window.XKDGDigestSetup = {
    build: build, housesOf: housesOf, open: open, close: close,
    _go: function () {
      var o = build((el('xdg-name').value || '').trim(), (el('xdg-email').value || '').trim(), el('xdg-city').value, el('xdg-lang').value, !el('xdg-fs').checked);
      if (o.error) { el('xdg-out').value = ''; el('xdg-info').textContent = o.error; return; }
      el('xdg-out').value = JSON.stringify(o);
      var n = (o.houses || []).reduce(function (s, h) { return s + h.ops.length; }, 0);
      el('xdg-info').textContent = (o.houses || []).length + ' house(s), ' + n + ' placement(s): ' +
        (o.houses || []).map(function (h) { return h.name + ' (' + h.ops.map(function (x) { return x.kind; }).join(', ') + ')'; }).join('; ') +
        (n ? '' : ' — no door fountain / bed / desk saved yet: the email will have only the hours.');
    },
    _copy: function () {
      var t = el('xdg-out'); if (!t.value) return;
      try { navigator.clipboard.writeText(t.value).then(function () { el('xdg-info').textContent = 'Copied.'; }); }
      catch (e) { t.select(); document.execCommand('copy'); }
    }
  };
})();

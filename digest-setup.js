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
  function allCities() { var out = []; (window.CITY_LIST || []).forEach(function (g) { (g && g.cities ? g.cities : [g]).forEach(function (c) { if (c && c.name && c.tz) out.push(c); }); }); return out; }
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
          ops.push({ kind: 'water', name: fl + (d.name || 'Door') + (d.kind === 'item' ? ' yang source' : ' fountain'), facing: num(d.facing), water: num(d.water) });
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
    // Session 35 (Edu): the fountains with their own day / night rule (Fountain A bed by DAY,
    // Fountain B bedroom door by NIGHT) - the email lists their ON/OFF times like the assistant.
    try {
      if (typeof window.XKDGFountains === 'function')
        window.XKDGFountains(h.name).forEach(function (fc) { ops.push({ kind: 'fountain', name: fc.name, device: fc.shelly_house, facing: fc.facing, water: fc.water }); });
    } catch (e) {}
    // de-duplicate identical placements
    var seen = {};
    return ops.filter(function (o) { var k = JSON.stringify([o.kind, o.facing, o.water, o.sitting, o.direction, o.device]); if (seen[k]) return false; seen[k] = 1; return true; });
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
  function build(name, email, city, lang, noFs, withAq) {
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
    // Session 41: any city of the app's list (cities.js: longitude + IANA zone). The hour scan does
    // not use the latitude, so 0 stands in for it.
    if (city === 'OTHER') {
      var cn = ((el('xdg-other') || {}).value || '').trim().toLowerCase();
      var hit = allCities().filter(function (c) { return c && c.name && c.name.toLowerCase() === cn; })[0]
             || allCities().filter(function (c) { return c && c.name && c.tz && c.name.toLowerCase().indexOf(cn) === 0; })[0];
      if (!cn || !hit || !hit.tz) return { error: 'Pick a city from the list (type the first letters).' };
      delete o.city;
      o.lat = 0; o.lon = hit.lng; o.tz = hit.tz; o.city_label = hit.name.split(',')[0];
    }
    if (rec.date && rec.depth !== 1) { o.birth_date = rec.date; o.birth_time = rec.time || '12:00'; }
    else if (rec.jiaZiYear) o.jiazi = rec.jiaZiYear.slice(0, 2);
    else return { error: 'No birth data for "' + name + '".' };
    if (lang && lang !== 'en') o.lang = lang;
    var hs = noFs ? [] : housesOf(name); if (hs.length) o.houses = hs;   // noFs: hours only (Edu: Feng Shui only for the house's owner)
    // Session 33 (Edu): warn in the email when an aquarium light plan ends / is paused.
    if (withAq) {
      var sc = null; try { sc = JSON.parse(localStorage.getItem('xkdg_shelly_cfg') || 'null'); } catch (e) {}
      if (sc && sc.url && sc.token) o.shelly = { url: sc.url, token: sc.token, devices: [
        { name: 'Tuoro', device: 'tuoro', tz: 'Europe/Rome' }, { name: 'Vienna', device: 'vienna', tz: 'Europe/Vienna' },
        { name: 'Fountain A', device: 'vienna-letto', tz: 'Europe/Vienna' }, { name: 'Fountain B', device: 'vienna-porta', tz: 'Europe/Vienna' } ] };
    }
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
      '<div style="background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:8px 10px;margin-bottom:10px;">' +
      '<b>📬 Get the daily email</b> — for the person loaded in the app (A). Fill Email, City and Language below, then:<br>' +
      '<button onclick="XKDGDigestSetup._sub()" style="margin-top:4px;padding:6px 12px;border-radius:6px;border:none;background:#6a1b9a;color:#fff;font-weight:bold;cursor:pointer;">✉ Subscribe</button> ' +
      '<button onclick="XKDGDigestSetup._unsub()" style="margin-top:4px;padding:6px 12px;border-radius:6px;border:1px solid #6a1b9a;background:#fff;color:#6a1b9a;cursor:pointer;">Unsubscribe</button>' +
      '<div id="xdg-sub-msg" style="margin-top:4px;color:#4a148c;"></div>' +
      '<div style="color:#777;">Subscribe again after you change city, birth data or a house: your line is updated.</div></div>' +
      'Person <input id="xdg-name" value="' + nm.replace(/"/g, '&quot;') + '" style="width:120px;"> ' +
      'Email <input id="xdg-email" type="email" placeholder="name@example.com" style="width:180px;"> ' +
      'City <select id="xdg-city" onchange="document.getElementById(\'xdg-place\').style.display=this.value===\'GPS\'?\'\':\'none\';document.getElementById(\'xdg-other\').style.display=this.value===\'OTHER\'?\'\':\'none\'"><option>Vienna</option><option>Tuoro</option><option value="OTHER">Other city…</option><option value="GPS">My location (GPS)</option></select> ' +
      '<input id="xdg-other" list="xdg-cities" placeholder="city, e.g. Sydney" style="width:170px;display:none;"><datalist id="xdg-cities">' +
      allCities().filter(function (c) { return c && c.name && c.tz; }).map(function (c) { return '<option value="' + c.name.replace(/"/g, '&quot;') + '">'; }).join('') + '</datalist> ' +
      '<input id="xdg-place" placeholder="place name, e.g. Kuala Lumpur" style="width:170px;display:none;"> ' +
      '<label><input type="checkbox" id="xdg-fs" checked> include Feng Shui dates (houses)</label> ' +
      (function () { var ok = false; try { var c = JSON.parse(localStorage.getItem('xkdg_shelly_cfg') || 'null'); ok = !!(c && c.url && c.token); } catch (e) {}
        return ok ? '<label><input type="checkbox" id="xdg-aq" checked> warn about the aquarium light plans (Shelly)</label> ' : ''; })() +
      'Language <select id="xdg-lang"><option value="en">English</option><option value="it">Italiano</option><option value="fr">Français</option></select> ' +
      '<details style="margin-top:10px;"><summary style="cursor:pointer;color:#555;">For Edu: the GitHub secret</summary>This builds one line of the GitHub secret <b>XKDG_DIGEST_RECIPIENTS</b>: birth data and the houses (door fountains, bed, desk) of the person, ' +
      'so the daily email can add the Feng Shui dates.<br>' +
      '<button onclick="XKDGDigestSetup._go()" style="padding:4px 10px;border-radius:6px;border:none;background:#4a148c;color:#fff;cursor:pointer;">Build</button>' +
      '<textarea id="xdg-out" readonly style="width:100%;height:150px;margin-top:8px;font-family:monospace;font-size:11px;"></textarea>' +
      '<div id="xdg-info" style="color:#555;"></div>' +
      '<button onclick="XKDGDigestSetup._copy()" style="margin-top:6px;padding:5px 12px;border-radius:6px;border:none;background:#2e7d32;color:#fff;cursor:pointer;">📋 Copy</button>' +
      '<div style="margin-top:10px;border-top:1px solid #ddd;padding-top:8px;"><b>All the people of the email</b> (every Build is kept here, by email):' +
      '<div id="xdg-list"></div>' +
      '<button onclick="XKDGDigestSetup._copyAll()" style="margin-top:6px;padding:6px 12px;border-radius:6px;border:none;background:#4a148c;color:#fff;font-weight:bold;cursor:pointer;">📋 Copy the WHOLE secret</button>' +
      '<div style="color:#777;margin-top:6px;">Paste it as the whole value of the secret <b>XKDG_DIGEST_RECIPIENTS</b> (GitHub → Settings → Secrets and variables → Actions), replacing what is there. ' +
      'Build a person again after changing a house: their line is updated, the others stay.</div></div></details></div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.body.appendChild(m);
    renderList();
  }
  function subUrl() {
    try { var u = localStorage.getItem('xkdg_shelly_url'); if (u) return u.replace(/\/+$/, ''); } catch (e) {}
    try { var c = JSON.parse(localStorage.getItem('xkdg_shelly_cfg') || 'null'); if (c && c.url) return String(c.url).replace(/\/+$/, ''); } catch (e) {}
    return 'https://xkdg-shelly.decumano16.workers.dev';
  }
  var LKEY = 'xkdg_digest_lines';
  function lines() { try { return JSON.parse(localStorage.getItem(LKEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveLines(l) { localStorage.setItem(LKEY, JSON.stringify(l)); renderList(); }
  function renderList() {
    var b = el('xdg-list'); if (!b) return;
    var l = lines(), k = Object.keys(l);
    b.innerHTML = k.length ? k.map(function (e) {
      var o = l[e];
      return '<div style="display:flex;gap:6px;align-items:center;padding:2px 0;"><span style="flex:1;">' + (o.active === false ? '⏸ ' : '') + '<b>' + String(o.name).replace(/</g, '&lt;') + '</b> · ' + e.replace(/</g, '&lt;')
           + ' · ' + (o.city || o.city_label || '') + ((o.houses || []).length ? ' · ' + o.houses.length + ' house(s)' : '') + '</span>'
           + '<button data-e="' + e.replace(/"/g, '&quot;') + '" onclick="XKDGDigestSetup._del(this.dataset.e)" style="border:1px solid #e57373;background:#fff;color:#c62828;border-radius:6px;cursor:pointer;">✕</button></div>';
    }).join('') : '<div style="color:#888;">Nobody yet: Build each person once.</div>';
  }
  function close() { var m = el('xdg-modal'); if (m) m.remove(); }

  window.XKDGDigestSetup = {
    build: build, housesOf: housesOf, open: open, close: close,
    _go: function () {
      var o = build((el('xdg-name').value || '').trim(), (el('xdg-email').value || '').trim(), el('xdg-city').value, el('xdg-lang').value, !el('xdg-fs').checked, !!(el('xdg-aq') && el('xdg-aq').checked));
      if (o.error) { el('xdg-out').value = ''; el('xdg-info').textContent = o.error; return; }
      el('xdg-out').value = JSON.stringify(o);
      if (o.email && o.email !== 'EMAIL') { var l = lines(); l[o.email] = o; saveLines(l); }
      var n = (o.houses || []).reduce(function (s, h) { return s + h.ops.length; }, 0);
      el('xdg-info').textContent = (o.houses || []).length + ' house(s), ' + n + ' placement(s): ' +
        (o.houses || []).map(function (h) { return h.name + ' (' + h.ops.map(function (x) { return x.kind; }).join(', ') + ')'; }).join('; ') +
        (n ? '' : ' — no door fountain / bed / desk saved yet: the email will have only the hours.');
    },
    _sub: async function () {
      var msg = el('xdg-sub-msg'), lic = null;
      try { var l = JSON.parse(localStorage.getItem('xkdg_license') || 'null'); lic = l && l.codeHash; } catch (e) {}
      if (!lic) { msg.textContent = 'No XKDG licence on this device.'; return; }
      var o = build((el('xdg-name').value || '').trim(), (el('xdg-email').value || '').trim(), el('xdg-city').value, el('xdg-lang').value, !el('xdg-fs').checked, false);
      if (o.error) { msg.textContent = o.error; return; }
      if (!o.email || o.email === 'EMAIL') { msg.textContent = 'Write your email.'; return; }
      msg.textContent = 'Sending…';
      try {
        var res = await fetch(subUrl() + '/?digest_subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ licence: lic, line: o }) });
        var j = await res.json().catch(function () { return null; });
        msg.textContent = j && j.ok ? (j.action === 'updated' ? '✓ Updated. ' : '✓ Subscribed. ') + 'The email arrives every morning at ' + o.email + '.' : '✗ ' + ((j && j.error) || ('HTTP ' + res.status));
      } catch (e) { msg.textContent = '✗ No connection to the server.'; }
    },
    _unsub: async function () {
      var msg = el('xdg-sub-msg'), lic = null, em = (el('xdg-email').value || '').trim();
      try { var l = JSON.parse(localStorage.getItem('xkdg_license') || 'null'); lic = l && l.codeHash; } catch (e) {}
      if (!lic || !em) { msg.textContent = 'Write the email to unsubscribe.'; return; }
      try {
        var res = await fetch(subUrl() + '/?digest_unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ licence: lic, email: em }) });
        var j = await res.json().catch(function () { return null; });
        msg.textContent = j && j.ok ? '✓ ' + (j.action === 'unsubscribed' ? 'Unsubscribed.' : 'This email was not subscribed.') : '✗ ' + ((j && j.error) || ('HTTP ' + res.status));
      } catch (e) { msg.textContent = '✗ No connection to the server.'; }
    },
    _del: function (e) { var l = lines(); delete l[e]; saveLines(l); },
    _copyAll: function () {
      var l = lines(), arr = Object.keys(l).map(function (k) { return l[k]; });
      if (!arr.length) { el('xdg-info').textContent = 'Build each person first.'; return; }
      var t = JSON.stringify(arr), done = function () { el('xdg-info').textContent = 'Copied: ' + arr.length + ' people. Paste it as the whole secret.'; };
      try { navigator.clipboard.writeText(t).then(done); }
      catch (e) { var x = el('xdg-out'); x.value = t; x.select(); document.execCommand('copy'); done(); }
    },
    _copy: function () {
      var t = el('xdg-out'); if (!t.value) return;
      try { navigator.clipboard.writeText(t.value).then(function () { el('xdg-info').textContent = 'Copied.'; }); }
      catch (e) { t.select(); document.execCommand('copy'); }
    }
  };
})();

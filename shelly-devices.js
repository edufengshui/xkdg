// ============================================================
// XKDG — shelly-devices.js  (session 38, Edu)
// ============================================================
// "🔌 Aquarium plug (Shelly)" for STUDENTS. Each student has his OWN Shelly Cloud
// account; the plug is switched by Edu's shared xkdg-shelly Worker (v7).
//
// Flow: house card ☰ → 🔌 Aquarium plug (Shelly) → the student types
//   • Server        (Shelly app → Settings → Authorization cloud key → "server")
//   • Auth key      (same page)
//   • Device ID     (device → Settings → Device information → Device ID)
//   • Longitude / UTC of the house (for the True Solar Time of the plan)
// → POST <worker>?register {licence, house, label, host, key, id}. The Worker checks
// the XKDG licence with the xkdg-ai Worker, tests the plug, stores the device in KV
// and returns a PER-DEVICE token, which authorises that device only.
//
// Stored locally (never synced to another account's Worker key):
//   localStorage xkdg_shelly_devices = [{ house, houseName, device, label, token,
//                                         url, lon, utc, at }]
// ai-chat.js merges these into SHELLY_HOUSES (window.XKDGShellyDevices.list()),
// so program_aquarium_light / aquarium_light / aquarium_plan work for that house.
// ============================================================
(function () {
  var KEY = 'xkdg_shelly_devices';
  var DEFAULT_URL = 'https://xkdg-shelly.decumano16.workers.dev';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(id) { return document.getElementById(id); }
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function workerUrl() {
    try { var u = localStorage.getItem('xkdg_shelly_url'); if (u) return u.replace(/\/+$/, ''); } catch (e) {}
    try { var c = JSON.parse(localStorage.getItem('xkdg_shelly_cfg') || 'null'); if (c && c.url) return String(c.url).replace(/\/+$/, ''); } catch (e) {}
    return DEFAULT_URL;
  }
  function licenceHash() {
    try { var l = JSON.parse(localStorage.getItem('xkdg_license') || 'null'); return (l && l.codeHash) || null; } catch (e) { return null; }
  }
  function get(houseName) {
    var k = String(houseName || '').trim().toLowerCase();
    return load().filter(function (d) { return d.house === k; })[0] || null;
  }
  function houseObj(personName, hi) {
    try { var all = JSON.parse(localStorage.getItem('xkdg_houses') || '{}'); return (all[personName] || [])[hi] || null; } catch (e) { return null; }
  }
  // Standard (winter) UTC offset of this phone, in hours: the plan code adds DST itself.
  function stdUtc() {
    var y = new Date().getFullYear();
    var a = -new Date(y, 0, 1).getTimezoneOffset(), b = -new Date(y, 6, 1).getTimezoneOffset();
    return Math.min(a, b) / 60;
  }
  function gpsLon() {
    try { var g = JSON.parse(localStorage.getItem('xkdg_gps') || 'null'); if (g && isFinite(g.lng)) return +g.lng; } catch (e) {}
    return null;
  }

  var S = { person: null, hi: null, msg: '', busy: false };

  async function call(q, d, body) {
    var url = (d && d.url) || workerUrl();
    var sep = q.indexOf('?') === 0 ? '' : '?';
    var full = url + '/' + sep + q + (d ? '&device=' + encodeURIComponent(d.device) + '&token=' + encodeURIComponent(d.token) : '');
    var res = await fetch(full, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    var data = await res.json().catch(function () { return null; });
    return { http: res.status, ok: res.ok, data: data };
  }

  function close() { var m = el('xsd-modal'); if (m) m.remove(); }

  function render() {
    var h = houseObj(S.person, S.hi);
    if (!h) { close(); return; }
    var d = get(h.name);
    var btn = 'border-radius:5px;padding:6px 12px;font-size:13px;cursor:pointer;';
    var inp = 'width:100%;box-sizing:border-box;font-size:14px;padding:6px;border:1px solid #bbb;border-radius:4px;margin:2px 0 8px;';
    var body;
    if (d) {
      body =
        '<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:8px 10px;margin-bottom:10px;">' +
          '✅ <b>' + esc(d.label || 'Aquarium') + '</b> is connected to this house.<br>' +
          '<span style="color:#555;font-size:12px;">Device ' + esc(d.device) + ' · longitude ' + esc(d.lon) + ' · UTC ' + (d.utc >= 0 ? '+' : '') + esc(d.utc) + '</span></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
          '<button onclick="XKDGShellyDevices._turn(\'on\')" style="' + btn + 'background:#2e7d32;color:#fff;border:none;">💡 Test ON</button>' +
          '<button onclick="XKDGShellyDevices._turn(\'off\')" style="' + btn + 'background:#555;color:#fff;border:none;">⏻ Test OFF</button>' +
          '<button onclick="XKDGShellyDevices._turn(\'status\')" style="' + btn + 'background:#fff;color:#1565c0;border:1px solid #1565c0;">Status</button></div>' +
        '<div style="font-size:12px;color:#444;line-height:1.5;margin-bottom:10px;">To program the light, ask the assistant: <i>"program the aquarium of ' + esc(h.name) + '"</i>. ' +
          'It shows the plan first; nothing is sent until you confirm.</div>' +
        '<button onclick="XKDGShellyDevices._remove()" style="' + btn + 'background:#fff;color:#c62828;border:1px solid #c62828;">🗑 Disconnect the plug</button>';
    } else {
      var lon = gpsLon();
      body =
        '<div style="font-size:12px;color:#444;line-height:1.5;margin-bottom:10px;">Connect the Shelly plug of the aquarium light of this house. ' +
          'The values come from <b>your</b> Shelly app; they are stored on the XKDG server only to switch your plug.</div>' +
        '<label style="font-size:12px;">Name<input id="xsd-label" style="' + inp + '" value="Aquarium"></label>' +
        '<label style="font-size:12px;">Server <span style="color:#888;">(Shelly app → Settings → Authorization cloud key)</span>' +
          '<input id="xsd-host" style="' + inp + '" placeholder="shelly-123-eu.shelly.cloud" autocapitalize="off" autocorrect="off" spellcheck="false"></label>' +
        '<label style="font-size:12px;">Authorization cloud key <span style="color:#888;">(same page, tap to copy)</span>' +
          '<input id="xsd-key" style="' + inp + '" autocapitalize="off" autocorrect="off" spellcheck="false"></label>' +
        '<label style="font-size:12px;">Device ID <span style="color:#888;">(the plug → Settings → Device information)</span>' +
          '<input id="xsd-id" style="' + inp + '" placeholder="e.g. a0b765c3d2e4" autocapitalize="off" autocorrect="off" spellcheck="false"></label>' +
        '<div style="display:flex;gap:8px;">' +
          '<label style="font-size:12px;flex:1;">Longitude of the house<input id="xsd-lon" type="number" step="0.01" style="' + inp + '" value="' + (lon != null ? lon.toFixed(2) : '') + '"></label>' +
          '<label style="font-size:12px;flex:1;">UTC (winter)<input id="xsd-utc" type="number" step="0.5" style="' + inp + '" value="' + stdUtc() + '"></label></div>' +
        '<div style="font-size:11px;color:#777;margin:-4px 0 10px;">Longitude: east positive (Rome 12.5, Vienna 16.4). The longitude is filled from your GPS when known — check it is the house, not where you are now.</div>' +
        '<button onclick="XKDGShellyDevices._register()" style="' + btn + 'background:#1565c0;color:#fff;border:none;"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? '⏳ Connecting…' : '🔌 Connect') + '</button>';
    }
    var old = el('xsd-modal'); if (old) old.remove();
    var m = document.createElement('div');
    m.id = 'xsd-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100040;overflow-y:auto;';
    m.innerHTML =
      '<div style="background:#fff;margin:10px auto;max-width:520px;border-radius:10px;overflow:hidden;">' +
      '<div style="background:#1565c0;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">' +
        '<b>🔌 Aquarium plug (Shelly) — ' + esc(h.name || '') + '</b>' +
        '<span><a href="guides/shelly.html" target="_blank" rel="noopener" style="color:#fff;margin-right:12px;text-decoration:none;">📘 Guide</a>' +
        '<button onclick="XKDGShellyDevices.close()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button></span></div>' +
      '<div style="padding:12px 14px;font-size:13px;color:#333;">' + body +
        (S.msg ? '<div id="xsd-msg" style="margin-top:10px;font-size:13px;">' + S.msg + '</div>' : '') +
      '</div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.body.appendChild(m);
  }

  function open(personName, hi) { S.person = personName; S.hi = hi; S.msg = ''; S.busy = false; render(); }

  async function register() {
    var h = houseObj(S.person, S.hi); if (!h) return;
    var v = function (id) { var x = el(id); return x ? String(x.value || '').trim() : ''; };
    var host = v('xsd-host').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    var key = v('xsd-key'), id = v('xsd-id').toLowerCase(), label = v('xsd-label') || 'Aquarium';
    var lon = parseFloat(v('xsd-lon')), utc = parseFloat(v('xsd-utc'));
    var err = !host ? 'Type the Server.' : !key ? 'Type the Authorization cloud key.' : !id ? 'Type the Device ID.'
            : !isFinite(lon) || Math.abs(lon) > 180 ? 'Type the longitude of the house.' : !isFinite(utc) ? 'Type the UTC offset.' : '';
    var lic = licenceHash();
    if (!err && !lic) err = 'This needs an XKDG licence on this phone.';
    if (err) { S.msg = '<span style="color:#c62828;">' + esc(err) + '</span>'; render(); return; }
    S.busy = true; S.msg = ''; render();
    try {
      var r = await call('?register', null, { licence: lic, house: h.name, label: label, host: host, key: key, id: id });
      S.busy = false;
      if (!r.ok || !r.data || !r.data.ok) {
        S.msg = '<span style="color:#c62828;">❌ ' + esc((r.data && r.data.error) || ('HTTP ' + r.http)) + '</span>';
        render(); return;
      }
      var list = load().filter(function (d) { return d.house !== h.name.trim().toLowerCase(); });
      list.push({ house: h.name.trim().toLowerCase(), houseName: h.name, device: r.data.device, label: label,
                  token: r.data.token, url: workerUrl(), lon: lon, utc: utc, at: new Date().toISOString() });
      save(list);
      try { if (window.XKDGShellyRefresh) window.XKDGShellyRefresh(); } catch (e) {}
      S.msg = '<span style="color:#2e7d32;">✅ Connected' + (r.data.relay_on != null ? ' — the plug is ' + (r.data.relay_on ? 'ON' : 'OFF') + ' now' : '') + '. Try Test ON / OFF.</span>';
      render();
    } catch (e) {
      S.busy = false;
      S.msg = '<span style="color:#c62828;">❌ No connection to the XKDG server: ' + esc((e && e.message) || e) + '</span>';
      render();
    }
  }

  async function turn(t) {
    var h = houseObj(S.person, S.hi); var d = h && get(h.name); if (!d) return;
    S.msg = '⏳ …'; render();
    try {
      var r = await call('?turn=' + t, d);
      if (!r.ok) { S.msg = '<span style="color:#c62828;">❌ ' + esc((r.data && r.data.error) || ('HTTP ' + r.http)) + '</span>'; render(); return; }
      var on = r.data && r.data.relay_on;
      S.msg = on == null ? '<span style="color:#2e7d32;">✅ Sent.</span>'
            : '<span style="color:#2e7d32;">✅ The plug is <b>' + (on ? 'ON' : 'OFF') + '</b>.</span>';
    } catch (e) { S.msg = '<span style="color:#c62828;">❌ ' + esc((e && e.message) || e) + '</span>'; }
    render();
  }

  async function remove() {
    var h = houseObj(S.person, S.hi); var d = h && get(h.name); if (!d) return;
    if (!confirm('Disconnect the plug from this house? The plan stored on the server is deleted too.')) return;
    try { await call('?unregister', d); } catch (e) {}
    save(load().filter(function (x) { return x.house !== d.house; }));
    try { if (window.XKDGShellyRefresh) window.XKDGShellyRefresh(); } catch (e) {}
    S.msg = 'Disconnected.'; render();
  }

  window.XKDGShellyDevices = {
    open: open, close: close, list: load, get: get, workerUrl: workerUrl,
    _register: register, _turn: turn, _remove: remove
  };
})();

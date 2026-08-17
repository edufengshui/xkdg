/* ============================================================================
 *  gdrive-sync.js  —  XKDG data sync via the user's OWN Google Drive
 *
 *  Saves / loads ALL app data (localStorage) as a single JSON file
 *  ("xkdg-sync.json") in the user's Google Drive, so two devices can stay
 *  aligned. Uses Google Identity Services (token model) + Drive REST API
 *  with the NON-sensitive `drive.file` scope (the app only ever sees the one
 *  file it created — nothing else in the Drive).
 *
 *  Requires (in index.html): <script src="https://accounts.google.com/gsi/client" async defer></script>
 *  Setup (once): the user pastes their Google OAuth Client ID in the panel.
 *
 *  NOTE: this syncs DATA, not a live session. "Last save wins" per device:
 *  edit on one device → Save → on the other device → Load.
 * ========================================================================== */
(function () {
  'use strict';

  var SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events';
  var FILE_NAME = 'xkdg-sync.json';
  var K_CLIENT = 'xkdg_gdrive_client_id';
  var K_FILEID = 'xkdg_gdrive_fileid';
  var K_LASTSYNC = 'xkdg_gdrive_lastsync';
  var K_DRIVE_MTIME = 'xkdg_gdrive_drive_mtime';   // Drive file modifiedTime as last seen by THIS device (server clock)
  var K_AUTOSYNC = 'xkdg_gdrive_autosync';         // '1' when auto-sync is ON for THIS device
  var EXCLUDE_PREFIX = 'xkdg_gdrive_';   // never sync the sync config itself
  // Derived caches: big, device-local, and rebuilt on demand. They must never
  // travel to Drive — a single long road shape is hundreds of KB, and carrying
  // them both ways filled the browser storage and broke the restore.
  var SKIP_PREFIXES = ['xkdg_gdrive_', 'xkdg_tp_route_'];
  function skipKey(k){
    if (!k) return true;
    for (var i = 0; i < SKIP_PREFIXES.length; i++) { if (k.indexOf(SKIP_PREFIXES[i]) === 0) return true; }
    return false;
  }

  var tokenClient = null, pendingAction = null;
  var pendingOnToken = null, pendingOnFail = null, pendingSilent = false;
  var accessToken = null, tokenExp = 0;                 // cached short-lived token for silent ops
  var dirty = false, saveTimer = null, suppressDirty = false, autoBusy = false, AUTO_DEBOUNCE = 9000;

  function autoOn(){ try { return localStorage.getItem(K_AUTOSYNC) === '1'; } catch(e){ return false; } }

  function clientId(){ try { return (localStorage.getItem(K_CLIENT) || '').trim(); } catch(e){ return ''; } }

  // ---- collect / restore all app data ----
  function collectData(){
    var data = {};
    for (var i = 0; i < localStorage.length; i++){
      var k = localStorage.key(i);
      if (!k || skipKey(k)) continue;
      data[k] = localStorage.getItem(k);
    }
    return JSON.stringify({ __xkdg_sync: 1, ts: new Date().toISOString(), data: data });
  }
  function restoreData(text){
    var obj = JSON.parse(text);
    if (!obj || !obj.__xkdg_sync || !obj.data) throw new Error('Not an XKDG sync file.');
    var keys = Object.keys(obj.data);
    var written = 0, failed = [];
    suppressDirty = true;
    // One key that will not fit must not abort the whole restore: write what we
    // can and report the rest, so the user knows exactly what is missing.
    try {
      keys.forEach(function (k){
        if (skipKey(k)) return;
        try { localStorage.setItem(k, obj.data[k]); written++; }
        catch (e) { failed.push(k); }
      });
    }
    finally { suppressDirty = false; }
    return { count: keys.length, written: written, failed: failed, ts: obj.ts };
  }

  // ---- Google auth (GIS token model) ----
  // requestToken({silent, onToken, onFail}). Silent ops never show UI or alerts
  // (prompt:'none'); manual ops keep the original prompts. A short-lived token is
  // cached so background auto-sync doesn't re-prompt.
  function requestToken(opts){
    opts = opts || {};
    var cid = clientId();
    if (!cid){ if (opts.silent){ opts.onFail && opts.onFail('no-client'); } else { alert('First paste your Google Client ID (⚙ Settings in this panel).'); } return; }
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2){
      if (opts.silent){ opts.onFail && opts.onFail('gis-not-ready'); } else { alert('Google sign-in script not ready yet — wait a second and try again.'); }
      return;
    }
    if (accessToken && Date.now() < tokenExp){ opts.onToken && opts.onToken(accessToken); return; }
    if (!tokenClient || tokenClient.__cid !== cid){
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: cid, scope: SCOPE,
        callback: function (resp){
          if (resp && resp.access_token){
            accessToken = resp.access_token;
            tokenExp = Date.now() + ((resp.expires_in || 3600) * 1000) - 60000;
            var a = pendingOnToken; pendingOnToken = null; pendingOnFail = null;
            if (a) a(accessToken);
          } else {
            var f = pendingOnFail; var silent = pendingSilent; pendingOnToken = null; pendingOnFail = null;
            if (silent){ if (f) f('no-token'); } else { alert('Google authorization failed or was cancelled.'); }
          }
        },
        error_callback: function (err){
          var f = pendingOnFail; var silent = pendingSilent; pendingOnToken = null; pendingOnFail = null;
          if (silent){ if (f) f((err && err.type) || 'error'); } else { setStatus('Authorization error — try again.', '#ff6b6b'); }
        }
      });
      tokenClient.__cid = cid;
    }
    pendingOnToken = opts.onToken; pendingOnFail = opts.onFail; pendingSilent = !!opts.silent;
    try { tokenClient.requestAccessToken({ prompt: opts.silent ? 'none' : '' }); }
    catch(e){ if (opts.silent){ opts.onFail && opts.onFail('throw'); } else { alert('Could not start Google authorization.'); } }
  }
  // Manual flow (unchanged behaviour): pops UI/alerts as before.
  function getToken(action){ requestToken({ silent:false, onToken:action, onFail:function(){} }); }

  // ---- Drive REST ----
  function driveFind(token){
    var url = 'https://www.googleapis.com/drive/v3/files?q=' +
      encodeURIComponent("name='" + FILE_NAME + "' and trashed=false") +
      '&spaces=drive&fields=' + encodeURIComponent('files(id,name,modifiedTime)');
    return fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r){ return r.json(); })
      .then(function (j){ return (j.files && j.files[0]) ? j.files[0] : null; });
  }
  function driveDownload(token, id){
    return fetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media',
                 { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r){ if (!r.ok) throw new Error('Download failed (' + r.status + ')'); return r.text(); });
  }
  function driveCreate(token, content){
    var boundary = 'xkdgsync' + Date.now();
    var meta = { name: FILE_NAME, mimeType: 'application/json' };
    var body = '--' + boundary + '\r\n' +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Type: application/json\r\n\r\n' + content + '\r\n' +
      '--' + boundary + '--';
    return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',
      { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body })
      .then(function (r){ if (!r.ok) throw new Error('Create failed (' + r.status + ')'); return r.json(); });
  }
  function driveUpdate(token, id, content){
    return fetch('https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media&fields=id,modifiedTime',
      { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: content })
      .then(function (r){ if (!r.ok) throw new Error('Update failed (' + r.status + ')'); return r.json(); });
  }

  // ---- actions ----
  function setStatus(msg, color){
    var el = document.getElementById('gds-status');
    if (el){ el.textContent = msg; el.style.color = color || '#9fb0d6'; }
  }
  function doSave(){
    setStatus('Authorizing…');
    getToken(function (token){
      setStatus('Checking the Drive copy…');
      var content = collectData();
      var savedId = '';
      try { savedId = localStorage.getItem(K_FILEID) || ''; } catch(e){}
      driveFind(token).then(function (f){
        // GUARD: if the Drive copy changed (another device) after our last sync, warn before overwriting.
        var seen = ''; try { seen = localStorage.getItem(K_DRIVE_MTIME) || ''; } catch(e){}
        if (f && f.modifiedTime && seen && f.modifiedTime !== seen){
          if (!confirm('\u26A0\uFE0F The copy on Drive was updated (by another device) on '
              + new Date(f.modifiedTime).toLocaleString()
              + ', AFTER this device\u2019s last sync.\n\n'
              + 'Saving now will OVERWRITE that newer copy with THIS device\u2019s data.\n\n'
              + 'Tip: Cancel, then \u2b07 Load it first if you want to keep those changes.\n\nOverwrite anyway?')){
            setStatus('Save cancelled — the Drive copy is newer.', '#ffd479');
            return null;
          }
        }
        setStatus('Saving to Drive…');
        var id = (f && f.id) || savedId;
        return id ? driveUpdate(token, id, content) : driveCreate(token, content);
      }).then(function (res){
        if (!res) return;   // aborted by the guard
        try {
          localStorage.setItem(K_FILEID, res.id);
          localStorage.setItem(K_LASTSYNC, new Date().toISOString());
          if (res.modifiedTime) localStorage.setItem(K_DRIVE_MTIME, res.modifiedTime);
        } catch(e){}
        setStatus('✓ Saved to Drive ' + new Date().toLocaleString(), '#7CFC9A');
        refreshInfo();
      }).catch(function (e){ setStatus('✗ ' + e.message, '#ff6b6b'); });
    });
  }
  function doLoad(){
    setStatus('Authorizing…');
    getToken(function (token){
      setStatus('Looking for the Drive copy…');
      driveFind(token).then(function (f){
        if (!f){ setStatus('No xkdg-sync.json found in Drive yet. Save from your other device first.', '#ffd479'); return; }
        var seen = ''; try { seen = localStorage.getItem(K_DRIVE_MTIME) || ''; } catch(e){}
        var when = new Date(f.modifiedTime).toLocaleString();
        var msg;
        if (seen && f.modifiedTime === seen){
          // GUARD: the Drive copy has NOT changed since this device last synced →
          // loading brings nothing newer and would overwrite any local edits made since.
          msg = '\u26A0\uFE0F The Drive copy has NOT changed since this device\u2019s last sync ('
              + when + ').\n\n'
              + 'Loading brings nothing newer and will OVERWRITE any changes you made on THIS device since then.\n\nLoad anyway?';
        } else {
          msg = 'This will REPLACE this device\u2019s data with the Drive copy (saved ' + when + ').\n\nContinue?';
        }
        if (!confirm(msg)) { setStatus('Cancelled.'); return; }
        return driveDownload(token, f.id).then(function (text){
          var r = restoreData(text);
          try {
            localStorage.setItem(K_FILEID, f.id);
            localStorage.setItem(K_LASTSYNC, new Date().toISOString());
            if (f.modifiedTime) localStorage.setItem(K_DRIVE_MTIME, f.modifiedTime);
          } catch(e){}
          if (r.failed && r.failed.length) {
            setStatus('\u26a0 Loaded ' + r.written + ' items, ' + r.failed.length
              + ' did not fit (storage full): ' + r.failed.slice(0, 3).join(', ')
              + (r.failed.length > 3 ? '\u2026' : '') + '. Free space and load again.', '#ffd479');
            return;
          }
          setStatus('\u2713 Loaded ' + r.written + ' items. Reloading\u2026', '#7CFC9A');
          setTimeout(function (){ location.reload(); }, 800);
        });
      }).catch(function (e){ setStatus('✗ ' + e.message, '#ff6b6b'); });
    });
  }

  function refreshInfo(){
    var el = document.getElementById('gds-info');
    if (!el) return;
    var last = '';
    try { last = localStorage.getItem(K_LASTSYNC) || ''; } catch(e){}
    el.textContent = last ? ('Last sync on this device: ' + new Date(last).toLocaleString()) : 'This device has never synced.';
  }

  // ===== AUTO-SYNC (per device) =====================================
  // Debounced push after edits + a "newer copy?" check on open. Both are
  // silent (no popups). Conflicts are NEVER auto-overwritten.

  function scheduleAutoSave(){
    if (!autoOn()) return;
    dirty = true;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function (){ saveTimer = null; if (dirty) autoSave(); }, AUTO_DEBOUNCE);
  }

  function autoSave(){
    if (!autoOn() || !clientId() || autoBusy) return;
    requestToken({ silent:true, onToken:function (token){
      autoBusy = true;
      var content = collectData();
      var savedId = ''; try { savedId = localStorage.getItem(K_FILEID) || ''; } catch(e){}
      driveFind(token).then(function (f){
        var seen = ''; try { seen = localStorage.getItem(K_DRIVE_MTIME) || ''; } catch(e){}
        // CONFLICT: Drive changed (another device) since our last sync → do NOT auto-overwrite.
        if (f && f.modifiedTime && seen && f.modifiedTime !== seen){
          setStatus('⚠ Auto-sync paused: Drive has newer data from another device. Open Drive Sync and Load or Save manually.', '#ffd479');
          autoBusy = false; return null;
        }
        var id = (f && f.id) || savedId;
        return id ? driveUpdate(token, id, content) : driveCreate(token, content);
      }).then(function (res){
        autoBusy = false;
        if (!res) return;
        try {
          localStorage.setItem(K_FILEID, res.id);
          localStorage.setItem(K_LASTSYNC, new Date().toISOString());
          if (res.modifiedTime) localStorage.setItem(K_DRIVE_MTIME, res.modifiedTime);
        } catch(e){}
        dirty = false;
        setStatus('✓ Auto-saved ' + new Date().toLocaleTimeString(), '#7CFC9A');
        refreshInfo();
      }).catch(function (){ autoBusy = false; /* stay dirty; will retry on next edit */ });
    }, onFail:function (){ /* no silent token available → skip quietly, retry later */ } });
  }

  // On open: if the Drive copy is newer than what this device last synced, ASK to load it.
  function checkNewerOnOpen(){
    if (!autoOn() || !clientId()) return;
    var seen = ''; try { seen = localStorage.getItem(K_DRIVE_MTIME) || ''; } catch(e){}
    if (!seen) return;   // never synced on this device → do the first sync manually
    requestToken({ silent:true, onToken:function (token){
      driveFind(token).then(function (f){
        if (!f || !f.modifiedTime || f.modifiedTime === seen) return;   // nothing newer
        var when = new Date(f.modifiedTime).toLocaleString();
        if (!confirm('\u2601 A newer XKDG copy is on Drive (saved ' + when + '), from another device.\n\nLoad it now? This will REPLACE this device\u2019s data.')) return;
        driveDownload(token, f.id).then(function (text){
          try {
            restoreData(text);
            localStorage.setItem(K_FILEID, f.id);
            localStorage.setItem(K_LASTSYNC, new Date().toISOString());
            localStorage.setItem(K_DRIVE_MTIME, f.modifiedTime);
          } catch(e){ alert('Could not load the Drive copy: ' + e.message); return; }
          location.reload();
        }).catch(function (){});
      }).catch(function (){});
    }, onFail:function (){ /* silent token not available → skip; user can sync manually */ } });
  }

  // Hook localStorage writes so edits schedule a debounced auto-save.
  function installAutoSaveHook(){
    try {
      var store = window.localStorage;
      if (!store || store.__xkdgHook) return;
      var orig = store.setItem.bind(store);
      store.setItem = function (k, v){
        orig(k, v);
        try {
          if (!suppressDirty && k && !skipKey(k) && autoOn()) scheduleAutoSave();
        } catch(e){}
      };
      store.__xkdgHook = true;
    } catch(e){ /* if the environment forbids it, auto-save simply won't trigger */ }
  }
  // ==================================================================

  // ---- panel UI ----
  function openPanel(){
    if (document.getElementById('gds-root')) return;
    function el(tag, css, html){ var e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }
    var root = el('div', 'position:fixed;inset:0;z-index:100000;background:rgba(8,12,28,.92);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;');
    root.id = 'gds-root';
    var card = el('div', 'background:#11182e;color:#eee;border:1px solid #2a3556;border-radius:12px;max-width:440px;width:100%;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,.4);');
    card.appendChild(el('div', 'font-weight:bold;font-size:16px;color:#ffd479;margin-bottom:4px;', '☁ Google Drive Sync'));
    card.appendChild(el('div', 'font-size:12px;color:#9fb0d6;margin-bottom:12px;',
      'Sync all your data (houses, people, settings) through your own Google Drive. Edit on one device, <b>Save</b>, then <b>Load</b> on the other.'));

    var btnRow = el('div', 'display:flex;gap:8px;margin-bottom:10px;');
    var bSave = el('button', 'flex:1;background:#1d7a3a;color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:bold;font-size:13px;', '⬆ Save to Drive');
    var bLoad = el('button', 'flex:1;background:#23314f;color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:bold;font-size:13px;', '⬇ Load from Drive');
    bSave.onclick = doSave; bLoad.onclick = doLoad;
    btnRow.appendChild(bSave); btnRow.appendChild(bLoad);
    card.appendChild(btnRow);

    card.appendChild(el('div', 'font-size:12px;min-height:18px;margin-bottom:4px;', '')).id = 'gds-status';
    card.appendChild(el('div', 'font-size:11px;color:#7e8db3;margin-bottom:10px;', '')).id = 'gds-info';

    // auto-sync toggle (per device)
    var autoRow = el('div', 'border-top:1px solid #2a3556;padding-top:10px;margin-bottom:10px;');
    var autoLab = el('label', 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#cfe0ff;font-weight:bold;');
    var autoCb = document.createElement('input'); autoCb.type = 'checkbox'; autoCb.style.cssText = 'width:16px;height:16px;cursor:pointer;';
    try { autoCb.checked = autoOn(); } catch(e){}
    autoCb.onchange = function (){
      try { localStorage.setItem(K_AUTOSYNC, autoCb.checked ? '1' : '0'); } catch(e){}
      if (autoCb.checked){ installAutoSaveHook(); setStatus('Auto-sync ON for this device.', '#7CFC9A'); }
      else { if (saveTimer){ clearTimeout(saveTimer); saveTimer = null; } setStatus('Auto-sync OFF.', '#9fb0d6'); }
    };
    autoLab.appendChild(autoCb); autoLab.appendChild(document.createTextNode('Auto-sync (this device)'));
    autoRow.appendChild(autoLab);
    autoRow.appendChild(el('div', 'font-size:10.5px;color:#7e8db3;margin-top:6px;',
      'When on: checks Drive for a newer copy when you open the app (asks before loading), and auto-saves your changes a few seconds after you edit. Conflicts are never auto-overwritten — you stay in control.'));
    card.appendChild(autoRow);

    // settings (client id)
    var setRow = el('div', 'border-top:1px solid #2a3556;padding-top:10px;');
    setRow.appendChild(el('label', 'font-size:11px;color:#9fb0d6;display:block;margin-bottom:4px;', '⚙ Google OAuth Client ID'));
    var inp = el('input', 'width:100%;padding:7px;border:1px solid #2a3556;border-radius:6px;background:#0b1020;color:#eee;font-size:12px;');
    inp.placeholder = 'xxxxxxxx.apps.googleusercontent.com';
    try { inp.value = clientId(); } catch(e){}
    inp.onchange = function (){ try { localStorage.setItem(K_CLIENT, (inp.value || '').trim()); tokenClient = null; accessToken = null; tokenExp = 0; setStatus('Client ID saved.', '#7CFC9A'); } catch(e){} };
    setRow.appendChild(inp);
    setRow.appendChild(el('div', 'font-size:10.5px;color:#7e8db3;margin-top:6px;',
      'Create it once in Google Cloud Console (Drive API + OAuth client, scope drive.file). Origin must be this site.'));
    card.appendChild(setRow);

    var bClose = el('button', 'margin-top:14px;width:100%;background:#3a2030;color:#fff;border:none;border-radius:8px;padding:9px;cursor:pointer;font-size:13px;', 'Close');
    bClose.onclick = function (){ if (root.parentNode) root.parentNode.removeChild(root); };
    card.appendChild(bClose);

    root.appendChild(card);
    document.body.appendChild(root);
    refreshInfo();
  }

  // ---- launcher button (near the version tag) ----
  function injectLauncher(){
    if (document.getElementById('gds-launch')) return;
    var btn = document.createElement('button');
    btn.id = 'gds-launch';
    btn.textContent = '☁ Drive Sync';
    btn.style.cssText = 'display:block;margin:10px auto;background:#fff;color:#1565c0;border:1px solid #1565c0;border-radius:6px;padding:7px 16px;font-size:13px;font-weight:bold;cursor:pointer;';
    btn.onclick = openPanel;
    var anchor = document.getElementById('version-tag');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor);
    else document.body.appendChild(btn);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectLauncher);
  else injectLauncher();

  // Boot auto-sync if enabled on this device: install the edit hook now, and
  // (after GIS has had a moment to load) silently check for a newer Drive copy.
  if (autoOn()){
    installAutoSaveHook();
    setTimeout(checkNewerOnOpen, 4000);
  }

  window.XKDGDriveSync = { open: openPanel, save: doSave, load: doLoad };

  // ── Google Calendar reminder (Edu, session 29) ──────────────────────────────
  // When an aquarium plan is (re)generated, drop ONE reminder per aquarium in the
  // user's primary calendar. The event sits on the plan's END date at 09:00 with a
  // popup reminder 2 DAYS BEFORE — so the notification fires two days before the
  // plan runs out. Re-running a plan UPDATES the same event (found by a private
  // extended property) instead of piling up duplicates. Uses the same Google login
  // as Drive; the calendar.events scope is now part of SCOPE, so one consent covers
  // both. Silent by design: if calendar was never authorized it no-ops and reports
  // it, and connectCalendar() triggers the one-time consent.
  function _calTz(device){ return device === 'vienna' ? 'Europe/Vienna' : 'Europe/Rome'; }
  function _calPretty(device){ return device === 'vienna' ? 'Vienna' : 'Tuoro'; }

  function _calFindExisting(token, device){
    var url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
            + '?privateExtendedProperty=' + encodeURIComponent('xkdgAquarium=' + device)
            + '&showDeleted=false&singleEvents=true&maxResults=5&orderBy=updated';
    return fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      .then(function(r){ return r.ok ? r.json() : { items: [] }; })
      .then(function(j){ return (j.items || [])[0] || null; })
      .catch(function(){ return null; });
  }

  function _calEventBody(device, endIso, label){
    var tz = _calTz(device), pretty = _calPretty(device);
    return {
      summary: '\uD83D\uDC1F Acquario ' + pretty + ' \u2014 la programmazione finisce oggi (rigenera)',
      description: (label ? (label + '\n') : '')
                 + 'Promemoria XKDG: il piano di accensione dell\u2019acquario termina oggi. '
                 + 'Rigeneralo per i prossimi giorni.',
      start: { dateTime: endIso + 'T09:00:00', timeZone: tz },
      end:   { dateTime: endIso + 'T09:15:00', timeZone: tz },
      reminders: { useDefault: false, overrides: [ { method: 'popup', minutes: 2 * 24 * 60 } ] },
      extendedProperties: { private: { xkdgAquarium: device } },
      transparency: 'transparent'
    };
  }

  // upsertAquariumReminder({device, endIso, label}) -> Promise<{ok, updated?, reason?}>
  function upsertAquariumReminder(opts){
    opts = opts || {};
    var device = (opts.device === 'vienna') ? 'vienna' : 'tuoro';
    var endIso = opts.endIso;
    if (!endIso || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) return Promise.resolve({ ok:false, reason:'no-end' });
    return new Promise(function(resolve){
      requestToken({ silent: (opts.silent === false) ? false : true,
        onToken: function(token){
          _calFindExisting(token, device).then(function(existing){
            var body = _calEventBody(device, endIso, opts.label);
            var url, method;
            if (existing && existing.id){
              url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(existing.id);
              method = 'PATCH';
            } else {
              url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
              method = 'POST';
            }
            fetch(url, { method: method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
              .then(function(r){ resolve({ ok: r.ok, updated: !!(existing && existing.id), http: r.status }); })
              .catch(function(){ resolve({ ok:false, reason:'network' }); });
          });
        },
        onFail: function(reason){ resolve({ ok:false, reason: reason || 'no-auth' }); }
      });
    });
  }

  // One-time interactive consent for the calendar scope (also (re)grants Drive).
  function connectCalendar(){
    return new Promise(function(resolve){
      requestToken({ silent:false,
        onToken: function(){ resolve({ ok:true }); },
        onFail:  function(reason){ resolve({ ok:false, reason: reason || 'cancelled' }); } });
    });
  }

  window.XKDGCalendar = { upsertAquariumReminder: upsertAquariumReminder, connect: connectCalendar };
})();

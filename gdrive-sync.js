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

  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var FILE_NAME = 'xkdg-sync.json';
  var K_CLIENT = 'xkdg_gdrive_client_id';
  var K_FILEID = 'xkdg_gdrive_fileid';
  var K_LASTSYNC = 'xkdg_gdrive_lastsync';
  var K_DRIVE_MTIME = 'xkdg_gdrive_drive_mtime';   // Drive file modifiedTime as last seen by THIS device (server clock)
  var EXCLUDE_PREFIX = 'xkdg_gdrive_';   // never sync the sync config itself

  var tokenClient = null, pendingAction = null;

  function clientId(){ try { return (localStorage.getItem(K_CLIENT) || '').trim(); } catch(e){ return ''; } }

  // ---- collect / restore all app data ----
  function collectData(){
    var data = {};
    for (var i = 0; i < localStorage.length; i++){
      var k = localStorage.key(i);
      if (!k || k.indexOf(EXCLUDE_PREFIX) === 0) continue;
      data[k] = localStorage.getItem(k);
    }
    return JSON.stringify({ __xkdg_sync: 1, ts: new Date().toISOString(), data: data });
  }
  function restoreData(text){
    var obj = JSON.parse(text);
    if (!obj || !obj.__xkdg_sync || !obj.data) throw new Error('Not an XKDG sync file.');
    var keys = Object.keys(obj.data);
    keys.forEach(function (k){ if (k.indexOf(EXCLUDE_PREFIX) !== 0) localStorage.setItem(k, obj.data[k]); });
    return { count: keys.length, ts: obj.ts };
  }

  // ---- Google auth (GIS token model) ----
  function getToken(action){
    pendingAction = action;
    var cid = clientId();
    if (!cid){ alert('First paste your Google Client ID (⚙ Settings in this panel).'); return; }
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2){
      alert('Google sign-in script not ready yet — wait a second and try again.'); return;
    }
    if (!tokenClient || tokenClient.__cid !== cid){
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: cid, scope: SCOPE,
        callback: function (resp){
          if (resp && resp.access_token){ var a = pendingAction; pendingAction = null; if (a) a(resp.access_token); }
          else { alert('Google authorization failed or was cancelled.'); }
        }
      });
      tokenClient.__cid = cid;
    }
    tokenClient.requestAccessToken({ prompt: '' });
  }

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
          setStatus('✓ Loaded ' + r.count + ' items. Reloading…', '#7CFC9A');
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
    card.appendChild(el('div', 'font-size:11px;color:#7e8db3;margin-bottom:12px;', '')).id = 'gds-info';

    // settings (client id)
    var setRow = el('div', 'border-top:1px solid #2a3556;padding-top:10px;');
    setRow.appendChild(el('label', 'font-size:11px;color:#9fb0d6;display:block;margin-bottom:4px;', '⚙ Google OAuth Client ID'));
    var inp = el('input', 'width:100%;padding:7px;border:1px solid #2a3556;border-radius:6px;background:#0b1020;color:#eee;font-size:12px;');
    inp.placeholder = 'xxxxxxxx.apps.googleusercontent.com';
    try { inp.value = clientId(); } catch(e){}
    inp.onchange = function (){ try { localStorage.setItem(K_CLIENT, (inp.value || '').trim()); tokenClient = null; setStatus('Client ID saved.', '#7CFC9A'); } catch(e){} };
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

  window.XKDGDriveSync = { open: openPanel, save: doSave, load: doLoad };
})();

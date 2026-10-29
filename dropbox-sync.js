/* ============================================================================
 *  dropbox-sync.js  —  XKDG data sync via the user's OWN Dropbox (session 35)
 *
 *  Same idea as gdrive-sync.js (Drive Sync), side by side with it: ALL app data
 *  (localStorage) is saved / loaded as ONE file, "xkdg-sync.json", in the app's
 *  own folder of the user's Dropbox (Apps/<app name>/). The app sees nothing else.
 *
 *  Auth: OAuth 2 "PKCE" with a refresh token (token_access_type=offline) — no
 *  secret in the page, the user taps "Connect Dropbox" ONCE per device, then
 *  every Save / Load / Auto-sync works without new prompts.
 *
 *  Setup (once, by Edu): create an app on dropbox.com/developers
 *    (Scoped access · App folder · permissions files.content.read + write),
 *    add the Redirect URIs of the site, and put its App key in DBX_APP_KEY below.
 *    Until then a field in the panel accepts an App key (stored on the device).
 * ========================================================================== */
(function () {
  'use strict';

  var DBX_APP_KEY = 'is4jeokayukx75x';                     // ← Edu's Dropbox App key (public, not a secret)
  var FILE_PATH = '/xkdg-sync.json';
  var P = 'xkdg_dbx_';                        // every key of this module starts with it (never synced)
  var K_KEY = P + 'app_key', K_REFRESH = P + 'refresh', K_LASTSYNC = P + 'lastsync',
      K_REV = P + 'rev', K_AUTOSYNC = P + 'autosync', K_ACCOUNT = P + 'account';
  var SS_VERIFIER = P + 'verifier', SS_STATE = P + 'state', SS_AFTER = P + 'after';
  var SKIP_PREFIXES = ['xkdg_gdrive_', 'xkdg_dbx_', 'xkdg_tp_route_'];
  function skipKey(k){ if (!k) return true; for (var i = 0; i < SKIP_PREFIXES.length; i++) if (k.indexOf(SKIP_PREFIXES[i]) === 0) return true; return false; }

  var accessToken = null, tokenExp = 0;
  var dirty = false, saveTimer = null, suppressDirty = false, autoBusy = false, AUTO_DEBOUNCE = 9000;

  function ls(k){ try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k){ try { localStorage.removeItem(k); } catch (e) {} }
  function appKey(){ return (DBX_APP_KEY || ls(K_KEY)).trim(); }
  function connected(){ return !!ls(K_REFRESH); }
  function autoOn(){ return ls(K_AUTOSYNC) === '1'; }
  function redirectUri(){ return location.origin + location.pathname; }

  // ---- collect / restore (same format as Drive Sync: the two files are interchangeable) ----
  function collectData(){
    var data = {};
    for (var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if (!k || skipKey(k)) continue; data[k] = localStorage.getItem(k); }
    return JSON.stringify({ __xkdg_sync: 1, ts: new Date().toISOString(), data: data });
  }
  function restoreData(text){
    var obj = JSON.parse(text);
    if (!obj || !obj.__xkdg_sync || !obj.data) throw new Error('Not an XKDG sync file.');
    var keys = Object.keys(obj.data), written = 0, failed = [];
    suppressDirty = true;
    try { keys.forEach(function (k){ if (skipKey(k)) return; try { localStorage.setItem(k, obj.data[k]); written++; } catch (e) { failed.push(k); } }); }
    finally { suppressDirty = false; }
    return { count: keys.length, written: written, failed: failed, ts: obj.ts };
  }

  // ---- PKCE helpers ----
  function b64url(bytes){ var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function randomStr(n){ var a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); }
  function sha256b64(str){ return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (h){ return b64url(new Uint8Array(h)); }); }

  // Connect: go to Dropbox, come back to this page with ?code=…; `after` = 'save' | 'load' | ''.
  function connect(after){
    var key = appKey();
    if (!key){ alert('Dropbox is not set up yet: the App key is missing (see the guide).'); return; }
    var verifier = randomStr(48), state = randomStr(12);
    try { sessionStorage.setItem(SS_VERIFIER, verifier); sessionStorage.setItem(SS_STATE, state); sessionStorage.setItem(SS_AFTER, after || ''); } catch (e) {}
    sha256b64(verifier).then(function (ch){
      location.href = 'https://www.dropbox.com/oauth2/authorize?client_id=' + encodeURIComponent(key)
        + '&response_type=code&token_access_type=offline&code_challenge_method=S256&code_challenge=' + ch
        + '&state=' + state + '&redirect_uri=' + encodeURIComponent(redirectUri());
    });
  }
  function tokenRequest(params){
    var body = Object.keys(params).map(function (k){ return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(function (r){ return r.json().then(function (j){ if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || ('token ' + r.status)); return j; }); });
  }
  // Back from Dropbox: exchange the code, clean the URL, then run the pending action.
  function handleRedirect(){
    var q = new URLSearchParams(location.search);
    var code = q.get('code'), state = q.get('state'), err = q.get('error');
    var myState = ''; try { myState = sessionStorage.getItem(SS_STATE) || ''; } catch (e) {}
    if (!myState || state !== myState || (!code && !err)) return;
    var clean = function (){ try { history.replaceState(null, '', redirectUri() + location.hash); } catch (e) {} };
    var verifier = '', after = '';
    try { verifier = sessionStorage.getItem(SS_VERIFIER) || ''; after = sessionStorage.getItem(SS_AFTER) || ''; [SS_VERIFIER, SS_STATE, SS_AFTER].forEach(function (k){ sessionStorage.removeItem(k); }); } catch (e) {}
    clean();
    if (err){ setTimeout(function (){ openPanel(); setStatus('Dropbox connection cancelled.', '#ffd479'); }, 300); return; }
    tokenRequest({ code: code, grant_type: 'authorization_code', code_verifier: verifier, client_id: appKey(), redirect_uri: redirectUri() })
      .then(function (j){
        if (j.refresh_token) lsSet(K_REFRESH, j.refresh_token);
        accessToken = j.access_token; tokenExp = Date.now() + ((j.expires_in || 14400) * 1000) - 60000;
        return api('users/get_current_account', null).then(function (a){ if (a && a.email) lsSet(K_ACCOUNT, a.email); }).catch(function (){});
      })
      .then(function (){
        openPanel(); setStatus('✓ Dropbox connected.', '#7CFC9A');
        if (after === 'save') doSave(); else if (after === 'load') doLoad();
      })
      .catch(function (e){ openPanel(); setStatus('✗ Dropbox: ' + e.message, '#ff6b6b'); });
  }
  function getToken(){
    if (accessToken && Date.now() < tokenExp) return Promise.resolve(accessToken);
    var rt = ls(K_REFRESH);
    if (!rt) return Promise.reject(new Error('not-connected'));
    return tokenRequest({ grant_type: 'refresh_token', refresh_token: rt, client_id: appKey() }).then(function (j){
      accessToken = j.access_token; tokenExp = Date.now() + ((j.expires_in || 14400) * 1000) - 60000; return accessToken;
    }, function (e){ if (/invalid_grant|revoked|expired/i.test(e.message)) lsDel(K_REFRESH); throw e; });
  }

  // ---- Dropbox API ----
  function api(route, arg){
    return getToken().then(function (t){
      var o = { method: 'POST', headers: { Authorization: 'Bearer ' + t } };
      if (arg != null){ o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(arg); }
      return fetch('https://api.dropboxapi.com/2/' + route, o);
    }).then(function (r){
      if (r.status === 409) return null;               // path/not_found and similar
      if (!r.ok) throw new Error('Dropbox ' + r.status);
      return r.json();
    });
  }
  function dbxMeta(){ return api('files/get_metadata', { path: FILE_PATH }); }   // → { rev, server_modified } | null
  function dbxDownload(){
    return getToken().then(function (t){
      return fetch('https://content.dropboxapi.com/2/files/download', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH }) } });
    }).then(function (r){ if (!r.ok) throw new Error('Download failed (' + r.status + ')'); return r.text(); });
  }
  function dbxUpload(content){
    return getToken().then(function (t){
      return fetch('https://content.dropboxapi.com/2/files/upload', { method: 'POST',
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH, mode: 'overwrite', mute: true }) },
        body: content });
    }).then(function (r){ if (!r.ok) throw new Error('Upload failed (' + r.status + ')'); return r.json(); });
  }
  function remember(meta){ lsSet(K_LASTSYNC, new Date().toISOString()); if (meta && meta.rev) lsSet(K_REV, meta.rev); }

  // ---- actions ----
  function setStatus(msg, color){ var el = document.getElementById('dbs-status'); if (el){ el.textContent = msg; el.style.color = color || '#9fb0d6'; } }
  function doSave(){
    if (!connected()) return connect('save');
    setStatus('Checking the Dropbox copy…');
    dbxMeta().then(function (m){
      var seen = ls(K_REV);
      if (m && m.rev && seen && m.rev !== seen){
        if (!confirm('⚠️ The copy on Dropbox was updated (by another device) on ' + new Date(m.server_modified).toLocaleString()
            + ', AFTER this device’s last sync.\n\nSaving now will OVERWRITE that newer copy with THIS device’s data.\n\n'
            + 'Tip: Cancel, then ⬇ Load it first if you want to keep those changes.\n\nOverwrite anyway?')){
          setStatus('Save cancelled — the Dropbox copy is newer.', '#ffd479'); return null;
        }
      }
      setStatus('Saving to Dropbox…');
      return dbxUpload(collectData());
    }).then(function (res){
      if (!res) return;
      remember(res);
      setStatus('✓ Saved to Dropbox ' + new Date().toLocaleString(), '#7CFC9A'); refreshInfo();
    }).catch(failed);
  }
  function doLoad(){
    if (!connected()) return connect('load');
    setStatus('Looking for the Dropbox copy…');
    dbxMeta().then(function (m){
      if (!m){ setStatus('No xkdg-sync.json in Dropbox yet. Save from your other device first.', '#ffd479'); return; }
      var when = new Date(m.server_modified).toLocaleString(), seen = ls(K_REV);
      var msg = (seen && m.rev === seen)
        ? '⚠️ The Dropbox copy has NOT changed since this device’s last sync (' + when + ').\n\nLoading brings nothing newer and will OVERWRITE any changes you made on THIS device since then.\n\nLoad anyway?'
        : 'This will REPLACE this device’s data with the Dropbox copy (saved ' + when + ').\n\nContinue?';
      if (!confirm(msg)){ setStatus('Cancelled.'); return; }
      return dbxDownload().then(function (text){
        var r = restoreData(text); remember(m);
        if (r.failed.length){ setStatus('⚠ Loaded ' + r.written + ' items, ' + r.failed.length + ' did not fit (storage full): ' + r.failed.slice(0, 3).join(', ') + (r.failed.length > 3 ? '…' : '') + '. Free space and load again.', '#ffd479'); return; }
        setStatus('✓ Loaded ' + r.written + ' items. Reloading…', '#7CFC9A');
        setTimeout(function (){ location.reload(); }, 800);
      });
    }).catch(failed);
  }
  function failed(e){
    if (e && e.message === 'not-connected'){ setStatus('Dropbox is not connected on this device.', '#ffd479'); refreshInfo(); return; }
    if (!connected()){ setStatus('Dropbox access was revoked — tap Connect again.', '#ffd479'); refreshInfo(); return; }
    setStatus('✗ ' + (e && e.message || e), '#ff6b6b');
  }
  function disconnect(){
    if (!confirm('Disconnect Dropbox on this device? Your file in Dropbox is not touched.')) return;
    var rt = ls(K_REFRESH);
    if (rt) getToken().then(function (t){ fetch('https://api.dropboxapi.com/2/auth/token/revoke', { method: 'POST', headers: { Authorization: 'Bearer ' + t } }).catch(function (){}); }).catch(function (){});
    [K_REFRESH, K_REV, K_LASTSYNC, K_ACCOUNT, K_AUTOSYNC].forEach(lsDel); accessToken = null; tokenExp = 0;
    closePanel(); openPanel(); setStatus('Dropbox disconnected.', '#9fb0d6');
  }
  function refreshInfo(){
    var el = document.getElementById('dbs-info'); if (!el) return;
    var last = ls(K_LASTSYNC), acc = ls(K_ACCOUNT);
    el.textContent = (connected() ? ('Connected' + (acc ? ' as ' + acc : '') + '. ') : 'Not connected on this device. ')
      + (last ? 'Last sync on this device: ' + new Date(last).toLocaleString() : 'This device has never synced.');
  }

  // ===== AUTO-SYNC (per device) — same rules as Drive Sync ===========
  function scheduleAutoSave(){ if (!autoOn()) return; dirty = true; if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(function (){ saveTimer = null; if (dirty) autoSave(); }, AUTO_DEBOUNCE); }
  function autoSave(){
    if (!autoOn() || !connected() || autoBusy) return;
    autoBusy = true;
    dbxMeta().then(function (m){
      var seen = ls(K_REV);
      if (m && m.rev && seen && m.rev !== seen){ setStatus('⚠ Auto-sync paused: Dropbox has newer data from another device. Load or Save manually.', '#ffd479'); return null; }
      return dbxUpload(collectData());
    }).then(function (res){
      autoBusy = false; if (!res) return;
      remember(res); dirty = false; setStatus('✓ Auto-saved ' + new Date().toLocaleTimeString(), '#7CFC9A'); refreshInfo();
    }).catch(function (){ autoBusy = false; });
  }
  function checkNewerOnOpen(){
    if (!autoOn() || !connected()) return;
    var seen = ls(K_REV); if (!seen) return;
    dbxMeta().then(function (m){
      if (!m || !m.rev || m.rev === seen) return;
      if (!confirm('📦 A newer XKDG copy is on Dropbox (saved ' + new Date(m.server_modified).toLocaleString() + '), from another device.\n\nLoad it now? This will REPLACE this device’s data.')) return;
      return dbxDownload().then(function (text){ restoreData(text); remember(m); location.reload(); });
    }).catch(function (){});
  }
  function installAutoSaveHook(){
    try {
      var store = window.localStorage; if (!store || store.__xkdgDbxHook) return;
      var orig = store.setItem.bind(store);
      store.setItem = function (k, v){ orig(k, v); try { if (!suppressDirty && k && !skipKey(k) && autoOn()) scheduleAutoSave(); } catch (e) {} };
      store.__xkdgDbxHook = true;
    } catch (e) {}
  }

  // ---- panel UI (same look as Drive Sync) ----
  function closePanel(){ var r = document.getElementById('dbs-root'); if (r && r.parentNode) r.parentNode.removeChild(r); }
  function openPanel(){
    if (document.getElementById('dbs-root')){ refreshInfo(); return; }
    function el(tag, css, html){ var e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }
    var root = el('div', 'position:fixed;inset:0;z-index:100000;background:rgba(8,12,28,.92);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;');
    root.id = 'dbs-root';
    var card = el('div', 'background:#11182e;color:#eee;border:1px solid #2a3556;border-radius:12px;max-width:440px;width:100%;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,.4);');
    card.appendChild(el('div', 'font-weight:bold;font-size:16px;color:#7fb8ff;margin-bottom:4px;', '📦 Dropbox Sync'));
    card.appendChild(el('div', 'font-size:12px;color:#9fb0d6;margin-bottom:12px;',
      'Sync all your data (houses, people, settings) through your own Dropbox. Edit on one device, <b>Save</b>, then <b>Load</b> on the other. <a href="guides/people-and-database.html#dropbox" target="_blank" style="color:#7fb8ff;">Guide</a>'));
    if (!connected()){
      var bC = el('button', 'width:100%;background:#0061fe;color:#fff;border:none;border-radius:8px;padding:11px;cursor:pointer;font-weight:bold;font-size:14px;margin-bottom:10px;', '🔗 Connect Dropbox');
      bC.onclick = function (){ connect(''); };
      card.appendChild(bC);
    }
    var row = el('div', 'display:flex;gap:8px;margin-bottom:10px;');
    var bS = el('button', 'flex:1;background:#1d7a3a;color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:bold;font-size:13px;', '⬆ Save to Dropbox');
    var bL = el('button', 'flex:1;background:#23314f;color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:bold;font-size:13px;', '⬇ Load from Dropbox');
    bS.onclick = doSave; bL.onclick = doLoad; row.appendChild(bS); row.appendChild(bL); card.appendChild(row);
    card.appendChild(el('div', 'font-size:12px;min-height:18px;margin-bottom:4px;', '')).id = 'dbs-status';
    card.appendChild(el('div', 'font-size:11px;color:#7e8db3;margin-bottom:10px;', '')).id = 'dbs-info';

    var autoRow = el('div', 'border-top:1px solid #2a3556;padding-top:10px;margin-bottom:10px;');
    var lab = el('label', 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#cfe0ff;font-weight:bold;');
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.style.cssText = 'width:16px;height:16px;cursor:pointer;'; cb.checked = autoOn();
    cb.onchange = function (){
      if (cb.checked && !connected()){ cb.checked = false; setStatus('Connect Dropbox first.', '#ffd479'); return; }
      lsSet(K_AUTOSYNC, cb.checked ? '1' : '0');
      if (cb.checked){ installAutoSaveHook(); setStatus('Auto-sync ON for this device.', '#7CFC9A'); }
      else { if (saveTimer){ clearTimeout(saveTimer); saveTimer = null; } setStatus('Auto-sync OFF.', '#9fb0d6'); }
    };
    lab.appendChild(cb); lab.appendChild(document.createTextNode('Auto-sync (this device)')); autoRow.appendChild(lab);
    autoRow.appendChild(el('div', 'font-size:10.5px;color:#7e8db3;margin-top:6px;',
      'When on: checks Dropbox for a newer copy when you open the app (asks before loading), and auto-saves your changes a few seconds after you edit. Conflicts are never auto-overwritten.'));
    card.appendChild(autoRow);

    if (!DBX_APP_KEY){            // only until Edu's App key is built in
      var setRow = el('div', 'border-top:1px solid #2a3556;padding-top:10px;');
      setRow.appendChild(el('label', 'font-size:11px;color:#9fb0d6;display:block;margin-bottom:4px;', '⚙ Dropbox App key'));
      var inp = el('input', 'width:100%;padding:7px;border:1px solid #2a3556;border-radius:6px;background:#0b1020;color:#eee;font-size:12px;');
      inp.value = ls(K_KEY); inp.placeholder = 'App key from dropbox.com/developers';
      inp.onchange = function (){ lsSet(K_KEY, (inp.value || '').trim()); setStatus('App key saved.', '#7CFC9A'); };
      setRow.appendChild(inp); card.appendChild(setRow);
    }
    var foot = el('div', 'display:flex;gap:8px;margin-top:14px;');
    if (connected()){
      var bD = el('button', 'flex:1;background:#2a2f45;color:#cfd8ff;border:none;border-radius:8px;padding:9px;cursor:pointer;font-size:12px;', 'Disconnect');
      bD.onclick = disconnect; foot.appendChild(bD);
    }
    var bX = el('button', 'flex:1;background:#3a2030;color:#fff;border:none;border-radius:8px;padding:9px;cursor:pointer;font-size:13px;', 'Close');
    bX.onclick = closePanel; foot.appendChild(bX); card.appendChild(foot);
    root.appendChild(card); document.body.appendChild(root); refreshInfo();
  }

  // ---- launcher: next to ☁ Drive Sync ----
  function injectLauncher(){
    if (document.getElementById('dbs-launch')) return;
    var btn = document.createElement('button');
    btn.id = 'dbs-launch'; btn.textContent = '📦 Dropbox Sync';
    btn.style.cssText = 'background:#fff;color:#0061fe;border:1px solid #0061fe;border-radius:6px;padding:7px 16px;font-size:13px;font-weight:bold;cursor:pointer;';
    btn.onclick = openPanel;
    var drive = document.getElementById('gds-launch');
    if (drive && drive.parentNode) drive.parentNode.insertBefore(btn, drive.nextSibling);
    else { var a = document.getElementById('version-tag'); if (a && a.parentNode) a.parentNode.insertBefore(btn, a); else document.body.appendChild(btn); }
  }
  function boot(){
    injectLauncher();
    handleRedirect();
    if (autoOn() && connected()){ installAutoSaveHook(); setTimeout(checkNewerOnOpen, 4000); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.XKDGDropboxSync = { open: openPanel, save: doSave, load: doLoad, connect: connect };
})();

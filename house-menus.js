// ═══════════════════════════════════════════════════════════════
//  House Profile ☰ menus + 📖 per-item help (session 32, Edu: "c'è talmente
//  tanta confusione che non si capisce niente" → every sub-section of a house
//  card gets a ☰ on its right that opens its actions; each action has a 📖
//  book icon with a short guide on that single item).
// ═══════════════════════════════════════════════════════════════
(function () {
  var G = 'guides/';
  var FS = G + 'feng-shui-basics.html', PH = G + 'photo-sectors-and-floor-plan.html',
      SUN = G + 'sun-facing.html', PPL = G + 'people-and-database.html', CH = G + 'charts.html';

  // key → [title, html text, guide page]
  var HELP = {
    load: ['📂 Load', 'Puts this house on the luopan: facing, period and flying stars of the active floor, its doors and saved settings. The owner is loaded into Person A (and the guest into Person B).', FS],
    floorplan_view: ['🖼 Floor plan', 'Shows the saved floor plan of this floor, large, with the 8 palaces and the flying stars (山 mountain star green, 向 facing star red), in place of the luopan. <b>↩ Luopan</b> goes back.', FS],
    floorplan_edit: ['✏ Edit floor plan', 'Opens the saved plan in the floor-plan editor. Change the rectangles / centre, the facing side or the chart, tap <b>Draw chart</b> and then <b>💾 Save to house</b>.', FS],
    floorplan_remove: ['🗑 Remove floor plan', 'Deletes the saved floor plan of this floor (the house, doors and settings stay). You can import a new one afterwards.', FS],
    floorplan_import: ['📐 Import a floorplan', '<ol><li>Choose the right <b>Floor</b> first.</li><li>📷 Camera or 🖼️ Gallery / Files to load the plan.</li><li>Draw rectangles over the plan and tap <b>Find center</b> (or Manual center).</li><li>Tap the side of the picture where the house faces, then <b>Draw chart</b>.</li><li><b>💾 Save to house</b>.</li></ol>', FS],
    photo_sectors: ['📷 Photo sectors', 'Take a photo from the facing point (centre of a door, or head of the bed), upright and level. For the EXACT spot take a second photo from the same point toward the water, main lens 1×, and calibrate it: near the edges of a wide photo the boxes can be off by 2–3°. The app draws red boxes where the good <b>Ling Shen</b> water hexagrams fall, checked against the facing and the people. Calibrate first with <b>🧱 Align to a wall</b>. It also does the 8 palaces / 24 mountains on 4 photos from the centre of the house.', PH, [['Video: water positions', G + 'video.html?v=photo-sectors'], ['Video: palaces and mountains', G + 'video.html?v=palaces-centre']]],
    plan_builder: ['📏 Plan builder', 'Shows the floor plan built from <b>laser measurements</b>, with the rooms and their sizes along and across the facing, and the 8 palaces. Build it with the assistant: 💬 <i>"help me build the floor plan"</i>.', PH, G + 'video.html?v=plan-builder'],
    plan_3d: ['🧊 3D view', 'The floor plan from the 📏 Plan builder in 3D: rooms, walls with doors and windows, the furniture, the 8 palaces drawn on the floor from the centre, the facing arrow and the last bed–door check (green / red line). One finger rotates, two fingers zoom. <b>⬇ Top</b> looks from above; <b>🧱 Low walls</b> cuts the walls to see inside. Needs the internet the first time.', PH],
    room_photo: ['📷 Room photo + furniture', 'Shows a real photo of a room with the furniture of the plan drawn INTO it, true size and true perspective — e.g. a table you saw at the shop ("in prova", semi-transparent) before buying it.<ol><li>Take the photo standing still, phone upright and level; load it.</li><li>Type where you stood: two laser distances from two walls, and the phone height.</li><li>Calibrate: pick a known point (a room corner, a door edge) and tap it in the photo; best two points, left and right.</li><li>Check: the cyan lines must sit on the real floor edges and corners; fine-tune with turn / tilt / height.</li><li>Pick a piece of furniture and move it 5 cm at a time; 📥 Save image.</li></ol>The assistant can lead you: <i>"put the table from this photo in the living room"</i>.', PH],
    rename_house: ['✏ Rename house', 'Changes the name of the house. Nothing else changes.', FS],
    archive_open: ['📁 Archive', 'Opens the client\'s Google Drive folder (photos, written consultations).', FS],
    archive_set: ['📁 Archive link', 'Sets or changes the link to the client\'s Google Drive folder (photos, consultations). Paste the folder link.', FS],
    delete_house: ['🗑 Delete house', 'Deletes the house with all its floors, doors, settings and floor plans. <b>It cannot be undone</b>: make a <b>⬇ Backup</b> first if in doubt.', FS],

    add_member: ['➕ Extra member', 'Adds a saved person as an extra member of the house (year only). Only the <b>birth year</b> enters the date/hour scans, and everybody must connect. Six people maximum. Tap × on a name to remove it.', FS],
    add_guest: ['👥 Add a new guest', 'Adds occupant #2 (name, birth date, birth time). The guest goes into Person B, so every scan considers both people. Then choose <b>Cohabit</b> (both scanned) or <b>Guest as #1</b> (owner away, hidden from the scans).', FS],
    remove_guest: ['🗑 Remove guest', 'Removes occupant #2 from this house. The person stays in your database.', FS],

    map: ['🗺 Map', 'Opens the saved address in Google Maps.', FS],
    address: ['✏ Address', 'Saves or changes the address of the house. It is used by 📍 Measure facing and by the daily email (city of the house).', FS],
    measure_facing: ['📍 Measure facing', 'Opens a satellite map at the house address: line up the façade to read the <b>magnetic</b> facing. The value goes into <b>House Facing (°)</b> in the ⭐ FLYING STARS box; save it there.', SUN],
    sun_facing: ['☀️ Sun facing', 'Measures the facing with the sun, no compass: a card flat on the window sill, a tube or a bottle casts a shadow (trace its edge nearest the card edge); enter the exact time, the angle α (0–90°) and whether the shadow leans left or right (inside, looking out). Take 2–3 readings at different hours: the app averages them and saves the <b>magnetic</b> facing.', SUN, G + 'video.html?v=sun-facing'],

    floor_facing: ['✎ Facing / period', 'Changes the facing (°) and period of this floor. If all floors share the same facing, the change applies to the whole house. Doors, items, bed and desk on the walls turn with the new facing (±90 / 180).', FS],
    align_walls: ['📐 Align to the walls', 'Every wall follows the house facing (facing, ±90°, 180°). This turns the doors, items, bed sitting and desk facing that are within 10° of a wall onto the exact wall direction of the current facing. It happens by itself whenever you change the facing; use this to fix data saved before. Water / fountain degrees are not touched.', FS],
    rename_floor: ['✏ Rename floor', 'Changes the name of the selected floor.', FS],
    add_floor: ['+ Add floor', 'Adds a floor (e.g. "Attic"). <b>OK</b> = same facing and period as the house; <b>Cancel</b> = this floor has its own (the app asks them). Doors, waters, settings and the floor plan belong to each floor.', FS],
    delete_floor: ['🗑 Delete floor', 'Deletes the selected floor with its doors, settings and floor plan. Only when the house has more than one floor.', FS],

    ext_door: ['+ External Door', 'Front door / façade. Type a name, the <b>XKDG facing</b> (must be 正神 Zheng Shen, or period 1/9), the <b>water</b> degree (零神 Ling Shen, within ±70°; optional) and, optionally, the <b>palace where the door is</b> seen from the centre (used by QMDJ Li Qi as the Qi mouth). Then 🔎 SCAN on the door finds the dates.', FS],
    int_door: ['+ Internal Door', 'A room door. Name, XKDG facing (Zheng Shen, or period 1/9) and the <b>fountain</b> degree (Ling Shen, within ±70°; optional). Then 🔎 SCAN on the door finds the dates.', FS],
    add_item: ['🔶 Add item', 'Any object whose facing you want to check (altar, sofa, cash desk, statue, sign…). Type its name, its <b>facing</b> — it must be 正神 <b>Zheng Shen</b> (or period 1/9) — and, if you want, a <b>yang source</b> (water, light…) at a 零神 <b>Ling Shen</b> degree within ±70°, and the palace where it is. It works like a door: open it from the ☰ to ✏ edit, ✕ remove or 🔎 SCAN its dates.', FS],
    add_bed: ['🛏 Add Bed', 'Opens the Bed section: choose the <b>bed palace</b>, type the <b>sitting</b> (headboard) — it must be Zheng Shen — check that it communicates with the people, optionally a <b>fountain</b> in front of the bed, then 🔎 SCAN lucky dates. Save it with 💾 Save current.', FS],
    add_desk: ['🪑 Add Desk', 'Opens the Desk section: who sits, the <b>desk palace</b> and the <b>desk facing</b> (Zheng Shen, communicating with the person), optionally a fountain among the propitious water positions, then 🔎 SCAN lucky dates. Save it with 💾 Save current.', FS],
    add_water: ['💧 Add Water', 'Opens the Water section: ① a water feature (aquarium / fountain) <b>by palace</b> with the Flying-Star dates, or ② a water for a door facing in degrees (💡 Suggest proposes the best Ling Shen water). Save it in the house with 💾 Save to house / 💾 Save current.', FS],
    hide_house: ['🙈 Hide house', 'Takes the house off this list without deleting it. It stays in <b>🗄 Houses DB</b> (button at the top of House Profiles), where <b>👁 Show</b> brings it back and <b>🗑 Delete</b> removes it for good.', FS],
    houses_db: ['🗄 Houses DB', 'All your saved houses, grouped by person. <b>🙈 Hide</b> takes a house off the House Profiles list but keeps it; <b>👁 Show</b> brings it back; <b>🗑</b> deletes it <b>permanently</b> (asks first). Each house has its own <b>category</b> (Mine, Friends, Clients…): pick it in the 📁 menu under the house, or <b>➕ New category…</b> to add one. Filter by category, by All / Visible / Hidden, or search. Tip: make a <b>⬇ Backup</b> before deleting.', FS],
    saved_setting: ['⚙ Saved setting', 'A setting saved in this house (water, bed or desk), shown on the luopan. <b>✓ Save</b> keeps the new name (and palace); <b>🔎 Scan dates</b> loads it and searches its dates; <b>✏️ Open to edit</b> loads it in its section to change the degrees; <b>🗑 Remove</b> deletes it from the house.', FS],
    door_scan: ['🔎 SCAN', 'Finds the dates that match this door: Zheng Shen facing, Ling Shen water within ±70°, and the people of the house. Uses FROM / DAYS of the toolbar.', FS]
  };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  // items: [{icon,label,act,help}] or {html, help}. act = JS string run on tap.
  function menu(id, items) {
    var rows = items.filter(Boolean).map(function (it) {
      var main = it.html != null ? '<div style="flex:1;padding:6px 8px;">' + it.html + '</div>'
        : '<button onclick="fsHMClose();' + esc(it.act) + '" style="flex:1;text-align:left;background:none;border:none;padding:8px 10px;font-size:13px;cursor:pointer;color:' + (it.danger ? '#c62828' : '#222') + ';">' + it.label + '</button>';
      var book = it.help ? '<button onclick="fsHelp(\'' + it.help + '\',event)" title="Guide" style="background:none;border:none;border-left:1px solid #eee;padding:6px 10px;font-size:16px;cursor:pointer;">📖</button>' : '';
      return '<div style="display:flex;align-items:center;border-bottom:1px solid #f0f0f0;">' + main + book + '</div>';
    }).join('');
    return '<div style="position:relative;margin-left:auto;flex:0 0 auto;">' +
      '<button onclick="fsHMToggle(\'' + id + '\',event)" title="Menu" style="background:#fff;border:1px solid #2e7d32;color:#2e7d32;border-radius:6px;padding:2px 10px;font-size:18px;line-height:1.2;cursor:pointer;">☰</button>' +
      '<div id="' + id + '" class="fs-hm" style="display:none;position:absolute;right:0;top:110%;z-index:60;background:#fff;border:1px solid #a5d6a7;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);min-width:240px;max-width:86vw;overflow:hidden;">' + rows + '</div></div>';
  }
  // A sub-section: header (title left, ☰ right) + body.
  function section(title, color, menuHtml, body) {
    return '<div style="border-left:3px solid ' + color + ';background:#fff;border-radius:4px;padding:5px 8px;margin:6px 0;">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><span style="font-size:12px;font-weight:bold;color:' + color + ';">' + title + '</span>' + menuHtml + '</div>' +
      body + '</div>';
  }

  window.fsHMClose = function () {
    var a = document.querySelectorAll('.fs-hm'); for (var i = 0; i < a.length; i++) a[i].style.display = 'none';
  };
  window.fsHMToggle = function (id, ev) {
    if (ev) ev.stopPropagation();
    var m = document.getElementById(id); if (!m) return;
    var open = m.style.display === 'none';
    window.fsHMClose();
    if (open) m.style.display = 'block';
  };
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.fs-hm')) window.fsHMClose();
  });

  window.fsHelp = function (key, ev) {
    if (ev) ev.stopPropagation();
    var h = HELP[key]; if (!h) return;
    var old = document.getElementById('fs-help-ov'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'fs-help-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.innerHTML = '<div style="background:#fff;border-radius:10px;max-width:440px;width:100%;padding:14px 16px;font-size:14px;line-height:1.5;color:#222;box-shadow:0 6px 24px rgba(0,0,0,.35);">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:20px;">📖</span><b style="flex:1;color:#2e7d32;font-size:16px;">' + h[0] + '</b>' +
      '<button onclick="document.getElementById(\'fs-help-ov\').remove()" style="background:#eee;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">✕</button></div>' +
      '<div>' + h[1] + '</div>' +
      '<div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
      (h[3] ? '<span>' + (Array.isArray(h[3]) ? h[3] : [['Video tutorial', h[3]]]).map(function (v) { return '<a href="' + v[1] + '" target="_blank" rel="noopener" style="color:#c62828;font-weight:bold;display:block;">▶ ' + v[0] + '</a>'; }).join('') + '</span>' : '<span></span>') +   // session 35: optional 4th item = video URL, or [[label, url], …]
      '<a href="' + h[2] + '" target="_blank" rel="noopener" style="color:#00695c;font-weight:bold;">📘 Full guide →</a></div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  };

  // ── 🗄 Houses DB: every saved house (all people), show / hide / delete for good ──
  function save(all) { _fsHousesSave(all); try { fsRenderHouseProfiles(); } catch (e) {} }
  window.fsHouseSetHidden = function (pn, i, hide) {
    var all = _fsHousesLoad(), h = all[pn] && all[pn][i]; if (!h) return;
    if (hide) h.hidden = true; else delete h.hidden;
    save(all);
    if (document.getElementById('fs-hdb-ov')) window.fsHouseDB();
  };
  window.fsHouseDeleteForever = function (pn, i) {
    var all = _fsHousesLoad(), h = all[pn] && all[pn][i]; if (!h) return;
    if (!confirm('Delete "' + (h.name || 'house') + '" (' + pn + ') PERMANENTLY?\n\nFloors, doors, settings and floor plans are lost. This cannot be undone.')) return;
    fsDeleteHouse(pn, i, true);
    if (document.getElementById('fs-hdb-ov')) window.fsHouseDB();
  };
  window.fsHouseDB = function () {
    var all = _fsHousesLoad();
    var cur = null; try { var ap = fsGetActivePersonForHouse(); cur = ap && ap.name; } catch (e) {}
    var view = window._fsHdbView || 'all', q = (window._fsHdbQ || '').toLowerCase(), cat = window._fsHdbCat || '';
    var names = Object.keys(all).sort(function (a, b) { return a === cur ? -1 : b === cur ? 1 : a.localeCompare(b); });
    var rows = '', count = 0, hidN = 0;
    names.forEach(function (pn) {
      var hs = all[pn] || [], block = '';
      hs.forEach(function (h, i) {
        if (h.hidden) hidN++;
        if (view === 'visible' && h.hidden) return;
        if (view === 'hidden' && !h.hidden) return;
        var hc = (typeof xkdgHouseCat === 'function') ? xkdgHouseCat(h, pn) : '';
        if (cat && !(typeof xkdgFolderMatch === 'function' ? xkdgFolderMatch(hc, cat) : hc === cat)) return;
        if (q && (String(h.name || '') + ' ' + pn + ' ' + String(h.address || '') + ' ' + hc).toLowerCase().indexOf(q) < 0) return;
        count++;
        var fl = null, fc = null, pe = null;
        try { fl = _fsActiveFloor(h); fc = _fsFloorFacing(h, fl); pe = _fsFloorPeriod(h, fl); } catch (e) {}
        var pq = '\'' + String(pn).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\',' + i;
        block += '<div style="display:flex;align-items:center;gap:6px;padding:6px 4px;border-bottom:1px solid #eee;' + (h.hidden ? 'opacity:.6;' : '') + '">' +
          '<div style="flex:1;min-width:0;"><b>' + esc(h.name || '—') + '</b> ' + (h.hidden ? '<span style="font-size:10px;color:#888;">🙈 hidden</span>' : '') +
          '<div style="font-size:11px;color:#777;">' + (fc != null ? 'Facing ' + fc + '°' : '') + (pe != null ? ' · Period ' + pe : '') + (h.address ? ' · ' + esc(h.address) : '') + '</div>' +
          (typeof xkdgHouseCatAssignHtml === 'function' ? '<div style="margin-top:3px;">' + xkdgHouseCatAssignHtml(pn, i, h, 'font-size:11px;padding:2px 4px;border:1px solid #c9a84c;border-radius:10px;background:#fffdf5;') + '</div>' : '') + '</div>' +
          (h.hidden
            ? '<button onclick="fsHouseSetHidden(' + pq + ',false)" style="background:#2e7d32;color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:12px;cursor:pointer;">👁 Show</button>'
            : '<button onclick="fsHouseSetHidden(' + pq + ',true)" style="background:#fff;color:#555;border:1px solid #999;border-radius:5px;padding:4px 8px;font-size:12px;cursor:pointer;">🙈 Hide</button>') +
          '<button onclick="fsHouseDeleteForever(' + pq + ')" title="Delete permanently" style="background:#fff;color:#c62828;border:1px solid #c62828;border-radius:5px;padding:4px 8px;font-size:12px;cursor:pointer;">🗑</button></div>';
      });
      if (block) rows += '<div style="margin-top:8px;font-size:12px;font-weight:bold;color:#2e7d32;">👤 ' + esc(pn) + (pn === cur ? ' <span style="font-weight:normal;color:#888;">(loaded)</span>' : '') + '</div>' + block;
    });
    if (!rows) rows = '<div style="color:#999;font-size:13px;padding:12px 4px;">No houses.</div>';
    var btn = function (v, l) { return '<button onclick="window._fsHdbView=\'' + v + '\';fsHouseDB()" style="border:1px solid #2e7d32;border-radius:12px;padding:3px 10px;font-size:12px;cursor:pointer;background:' + (view === v ? '#2e7d32;color:#fff' : '#fff;color:#2e7d32') + ';">' + l + '</button>'; };
    var old = document.getElementById('fs-hdb-ov'), keepScroll = 0;
    if (old) { var lb = old.querySelector('.fs-hdb-list'); keepScroll = lb ? lb.scrollTop : 0; old.remove(); }
    var ov = document.createElement('div'); ov.id = 'fs-hdb-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100040;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:12px;';
    ov.innerHTML = '<div style="background:#fff;border-radius:10px;width:100%;max-width:520px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 6px 24px rgba(0,0,0,.35);">' +
      '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#2e7d32;color:#fff;border-radius:10px 10px 0 0;"><b style="flex:1;">🗄 Houses DB</b>' +
      '<button onclick="fsHelp(\'houses_db\',event)" style="background:none;border:none;font-size:18px;cursor:pointer;">📖</button>' +
      '<button onclick="document.getElementById(\'fs-hdb-ov\').remove()" style="background:#fff;color:#2e7d32;border:none;border-radius:6px;padding:3px 10px;cursor:pointer;font-weight:bold;">✕</button></div>' +
      '<div style="padding:8px 14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #eee;">' +
      btn('all', 'All') + btn('visible', 'Visible') + btn('hidden', 'Hidden' + (hidN ? ' (' + hidN + ')' : '')) +
      (typeof xkdgFolderList === 'function' ? '<select onchange="window._fsHdbCat=this.value;fsHouseDB()" style="font-size:12px;padding:3px 6px;border:1px solid #c9a84c;border-radius:12px;"><option value="">📁 All categories</option>' +
        xkdgFolderList().map(function (f) { return '<option value="' + esc(f) + '"' + (cat === f ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join('') +
        '<option value="__none__"' + (cat === '__none__' ? ' selected' : '') + '>— no category</option></select>' : '') +
      '<input id="fs-hdb-q" placeholder="🔍 search" value="' + esc(window._fsHdbQ || '') + '" oninput="window._fsHdbQ=this.value;clearTimeout(window._fsHdbT);window._fsHdbT=setTimeout(function(){fsHouseDB();var e=document.getElementById(\'fs-hdb-q\');if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length);}},300)" style="flex:1;min-width:110px;padding:4px 8px;border:1px solid #ccc;border-radius:12px;font-size:12px;"></div>' +
      '<div class="fs-hdb-list" style="overflow:auto;padding:0 14px 12px;">' + rows + '</div>' +
      '<div style="padding:6px 14px;font-size:11px;color:#888;border-top:1px solid #eee;">' + count + ' shown · 🙈 Hide keeps the house (not in the list) · 🗑 deletes it for good</div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    var lb2 = ov.querySelector('.fs-hdb-list'); if (lb2) lb2.scrollTop = keepScroll;
  };

  window.XKDGHouseMenus = { menu: menu, section: section, HELP: HELP };
})();

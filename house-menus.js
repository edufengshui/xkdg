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
    photo_sectors: ['📷 Photo sectors', 'Take a photo from the facing point (centre of a door, or head of the bed), upright and level. The app draws red boxes where the good <b>Ling Shen</b> water hexagrams fall, checked against the facing and the people. Calibrate first with <b>🧱 Align to a wall</b>. It also does the 8 palaces / 24 mountains on 4 photos from the centre.', PH],
    plan_builder: ['📏 Plan builder', 'Shows the floor plan built from <b>laser measurements</b>, with the rooms and their sizes along and across the facing, and the 8 palaces. Build it with the assistant: 💬 <i>"help me build the floor plan"</i>.', PH],
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
    sun_facing: ['☀️ Sun facing', 'Measures the facing with the sun, no compass: a card flat on the window sill, a vertical object casts a shadow; enter the exact time, the angle α (0–90°) and whether the shadow leans left or right (inside, looking out). Take 2–3 readings at different hours: the app averages them and saves the <b>magnetic</b> facing.', SUN],

    floor_facing: ['✎ Facing / period', 'Changes the facing (°) and period of this floor. If all floors share the same facing, the change applies to the whole house.', FS],
    rename_floor: ['✏ Rename floor', 'Changes the name of the selected floor.', FS],
    add_floor: ['+ Add floor', 'Adds a floor (e.g. "Attic"). <b>OK</b> = same facing and period as the house; <b>Cancel</b> = this floor has its own (the app asks them). Doors, waters, settings and the floor plan belong to each floor.', FS],
    delete_floor: ['🗑 Delete floor', 'Deletes the selected floor with its doors, settings and floor plan. Only when the house has more than one floor.', FS],

    ext_door: ['+ External Door', 'Front door / façade. Type a name, the <b>XKDG facing</b> (must be 正神 Zheng Shen, or period 1/9), the <b>water</b> degree (零神 Ling Shen, within ±70°; optional) and, optionally, the <b>palace where the door is</b> seen from the centre (used by QMDJ Li Qi as the Qi mouth). Then 🔎 SCAN on the door finds the dates.', FS],
    int_door: ['+ Internal Door', 'A room door. Name, XKDG facing (Zheng Shen, or period 1/9) and the <b>fountain</b> degree (Ling Shen, within ±70°; optional). Then 🔎 SCAN on the door finds the dates.', FS],
    add_bed: ['🛏 Add Bed', 'Opens the Bed section: choose the <b>bed palace</b>, type the <b>sitting</b> (headboard) — it must be Zheng Shen — check that it communicates with the people, optionally a <b>fountain</b> in front of the bed, then 🔎 SCAN lucky dates. Save it with 💾 Save current.', FS],
    add_desk: ['🪑 Add Desk', 'Opens the Desk section: who sits, the <b>desk palace</b> and the <b>desk facing</b> (Zheng Shen, communicating with the person), optionally a fountain among the propitious water positions, then 🔎 SCAN lucky dates. Save it with 💾 Save current.', FS],
    add_water: ['💧 Add Water', 'Opens the Water section: ① a water feature (aquarium / fountain) <b>by palace</b> with the Flying-Star dates, or ② a water for a door facing in degrees (💡 Suggest proposes the best Ling Shen water). Save it in the house with 💾 Save to house / 💾 Save current.', FS],
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
      '<div style="margin-top:12px;text-align:right;"><a href="' + h[2] + '" target="_blank" rel="noopener" style="color:#00695c;font-weight:bold;">📘 Full guide →</a></div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  };

  window.XKDGHouseMenus = { menu: menu, section: section, HELP: HELP };
})();

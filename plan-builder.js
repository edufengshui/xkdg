// ============================================================
// XKDG — plan-builder.js  (session 31)
// ============================================================
// Floor-plan builder from laser measurements. Every wall follows the HOUSE
// facing or its perpendicular (Edu), so each room is a rectangle already
// oriented: two wall-to-wall measurements per room are enough. Rooms are
// attached to each other through a shared wall (internal wall thickness in
// between), and the finished plan is handed to the existing floor-plan tool
// (floorplan-stars.js) with its rectangles and centre already set, so the
// 8 palaces are drawn at once.
//
// Plan frame (metres), matching the floor-plan tool with facingSide 'bottom':
//   +y = toward the FACING direction  (bottom of the drawing)
//   +x = toward facing − 90°          (right of the drawing)
// so the four sides of a room point to: facing (y max), facing+180 (y min),
// facing−90 (x max), facing+90 (x min).
//
// Data: house.floors[active].plan = { wall_m, rooms:[{name,x,y,w,d}] }
//   w = size along the x axis (facing±90 axis), d = size along the facing axis.
// Driven mainly by the AI assistant (tools plan_*), with a viewer dialog.
// ============================================================
(function () {
  'use strict';

  function norm(d) { return ((d % 360) + 360) % 360; }
  function angDiff(a, b) { return ((a - b + 540) % 360) - 180; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  var D8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function d8(deg) { return D8[Math.round(norm(deg) / 45) % 8]; }

  // ── house / floor access ───────────────────────────────────
  function findHouse(name) {
    var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {};
    var want = name ? String(name).trim().toLowerCase() : '';
    var keys = Object.keys(all);
    if (want) {
      for (var i = 0; i < keys.length; i++) {
        var arr = all[keys[i]] || [];
        for (var j = 0; j < arr.length; j++) if (arr[j] && String(arr[j].name || '').trim().toLowerCase() === want) return { all: all, key: keys[i], idx: j };
      }
      return null;
    }
    try {
      var p = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
      if (p && all[p.name] && all[p.name].length) {
        var a = (typeof _fsActiveHouseGet === 'function') ? _fsActiveHouseGet(p.name) : 0;
        if (!(a < all[p.name].length)) a = 0;
        return { all: all, key: p.name, idx: a };
      }
    } catch (e) {}
    return null;
  }
  function ctx(houseName) {
    var hs = findHouse(houseName); if (!hs) return null;
    var h = hs.all[hs.key][hs.idx];
    var f = (typeof _fsActiveFloor === 'function') ? _fsActiveFloor(h) : (h.floors && h.floors[0]);
    if (!f) return null;
    if (!f.plan) f.plan = { wall_m: 0.12, rooms: [] };
    var facing = (typeof _fsFloorFacing === 'function') ? _fsFloorFacing(h, f) : h.houseFacing;
    var period = (typeof _fsFloorPeriod === 'function') ? _fsFloorPeriod(h, f) : null;
    return { hs: hs, h: h, f: f, plan: f.plan, facing: (facing != null ? norm(+facing) : null), period: period,
             save: function () { _fsHousesSave(hs.all); try { if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles(); } catch (e) {} } };
  }
  function sideDirs(facing) {
    return { facing: norm(facing), back: norm(facing + 180), xmax: norm(facing - 90), xmin: norm(facing + 90) };
  }
  function sideKey(facing, deg) {
    var S = sideDirs(facing), best = null;
    Object.keys(S).forEach(function (k) { var dd = Math.abs(angDiff(S[k], deg)); if (!best || dd < best.d) best = { k: k, d: dd }; });
    return best && best.d <= 45 ? best.k : null;
  }
  function sidesText(facing) {
    var S = sideDirs(facing);
    return {
      toward_facing: S.facing + '° (' + d8(S.facing) + ')', toward_back: S.back + '° (' + d8(S.back) + ')',
      toward_right_of_drawing: S.xmax + '° (' + d8(S.xmax) + ')', toward_left_of_drawing: S.xmin + '° (' + d8(S.xmin) + ')'
    };
  }
  function findRoom(plan, name) {
    var w = String(name || '').trim().toLowerCase();
    for (var i = 0; i < plan.rooms.length; i++) if (String(plan.rooms[i].name).trim().toLowerCase() === w) return i;
    return -1;
  }

  // ── geometry checks ────────────────────────────────────────
  function overlaps(plan) {
    var out = [], R = plan.rooms, eps = 0.02;
    for (var i = 0; i < R.length; i++) for (var j = i + 1; j < R.length; j++) {
      var a = R[i], b = R[j];
      var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y);
      if (ox > eps && oy > eps) out.push(a.name + ' / ' + b.name + ' overlap by ' + r2(ox) + ' x ' + r2(oy) + ' m');
    }
    return out;
  }
  function bbox(plan) {
    var R = plan.rooms; if (!R.length) return null;
    var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    R.forEach(function (r) { b.x0 = Math.min(b.x0, r.x); b.y0 = Math.min(b.y0, r.y); b.x1 = Math.max(b.x1, r.x + r.w); b.y1 = Math.max(b.y1, r.y + r.d); });
    return b;
  }
  // Rooms + the internal walls between neighbours, as the footprint used for the centre.
  function footprint(plan) {
    var R = plan.rooms.map(function (r) { return { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.d }; });
    var t = plan.wall_m || 0, gap = t + 0.05;
    plan.rooms.forEach(function (a, i) {
      plan.rooms.forEach(function (b, j) {
        if (j <= i) return;
        var oy0 = Math.max(a.y, b.y), oy1 = Math.min(a.y + a.d, b.y + b.d);
        var ox0 = Math.max(a.x, b.x), ox1 = Math.min(a.x + a.w, b.x + b.w);
        var dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), dy = Math.max(b.y - (a.y + a.d), a.y - (b.y + b.d));
        if (oy1 - oy0 > 0.05 && dx >= -0.01 && dx <= gap) { var xs = (b.x > a.x) ? a.x + a.w : b.x + b.w; R.push({ x0: xs, y0: oy0, x1: xs + Math.max(dx, 0), y1: oy1 }); }
        if (ox1 - ox0 > 0.05 && dy >= -0.01 && dy <= gap) { var ys = (b.y > a.y) ? a.y + a.d : b.y + b.d; R.push({ x0: ox0, y0: ys, x1: ox1, y1: ys + Math.max(dy, 0) }); }
      });
    });
    return R.filter(function (r) { return r.x1 - r.x0 > 0.001 && r.y1 - r.y0 > 0.001; });
  }
  function centroid(rects) {
    var A = 0, sx = 0, sy = 0;
    // rectangles may overlap only along walls (zero/small area) — fine for a centre estimate
    rects.forEach(function (r) { var a = (r.x1 - r.x0) * (r.y1 - r.y0); A += a; sx += a * (r.x0 + r.x1) / 2; sy += a * (r.y0 + r.y1) / 2; });
    return A ? { x: sx / A, y: sy / A, area: A } : null;
  }
  function inside(p, rects) { return rects.some(function (r) { return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1; }); }

  // ── public operations (used by the AI tools and the dialog) ──
  function status(houseName) {
    var c = ctx(houseName);
    if (!c) return { error: houseName ? 'No house named "' + houseName + '".' : 'No active house: load the person and pick the house, or give house_name.' };
    if (c.facing == null) return { error: 'This house has no facing saved yet: set the house facing first.' };
    var p = c.plan, b = bbox(p), fp = footprint(p), cen = fp.length ? centroid(fp) : null;
    return {
      house: c.h.name, floor: c.f.label || ('Floor ' + ((c.h.activeFloor || 0) + 1)), house_facing: c.facing,
      wall_thickness_m: p.wall_m,
      side_directions: sidesText(c.facing),
      rooms: p.rooms.map(function (r) {
        return { name: r.name, size_along_facing_axis_m: r2(r.d), size_across_m: r2(r.w), area_m2: r2(r.w * r.d),
                 position_m: { x: r2(r.x), y: r2(r.y) } };
      }),
      total_room_area_m2: r2(p.rooms.reduce(function (s, r) { return s + r.w * r.d; }, 0)),
      outer_size_m: b ? { along_facing_axis: r2(b.y1 - b.y0), across: r2(b.x1 - b.x0) } : null,
      centre_m: cen ? { x: r2(cen.x), y: r2(cen.y), inside_the_plan: inside(cen, fp) } : null,
      warnings: overlaps(p),
      saved_as_floorplan: !!(c.f.floorplan && c.f.floorplan.fromPlanBuilder)
    };
  }
  function roomOp(o) {
    var c = ctx(o.house_name);
    if (!c) return { error: o.house_name ? 'No house named "' + o.house_name + '".' : 'No active house.' };
    if (c.facing == null) return { error: 'This house has no facing saved yet.' };
    var p = c.plan, act = o.action || 'add', i = findRoom(p, o.name);
    if (act === 'remove') {
      if (i < 0) return { error: 'No room named "' + o.name + '".' };
      p.rooms.splice(i, 1); c.save(); return status(o.house_name);
    }
    if (!o.name) return { error: 'Give the room a name.' };
    if (act === 'add' && i >= 0) return { error: 'A room named "' + o.name + '" already exists: use action "update".' };
    if (act === 'update' && i < 0) return { error: 'No room named "' + o.name + '".' };
    var r = (act === 'update') ? p.rooms[i] : { name: String(o.name).trim(), x: 0, y: 0, w: 0, d: 0 };
    if (o.new_name) r.name = String(o.new_name).trim();
    if (o.size_along_facing_axis_m != null) { if (!(+o.size_along_facing_axis_m > 0)) return { error: 'size_along_facing_axis_m must be > 0.' }; r.d = +o.size_along_facing_axis_m; }
    if (o.size_across_m != null) { if (!(+o.size_across_m > 0)) return { error: 'size_across_m must be > 0.' }; r.w = +o.size_across_m; }
    if (!(r.w > 0 && r.d > 0)) return { error: 'Both sizes are needed (size_along_facing_axis_m and size_across_m).' };
    if (o.attach_to) {
      var j = findRoom(p, o.attach_to);
      if (j < 0) return { error: 'No room named "' + o.attach_to + '" to attach to.' };
      var B = p.rooms[j];
      var side = sideKey(c.facing, +o.side_deg);
      if (!side) return { error: 'side_deg must be one of the four wall directions: ' + JSON.stringify(sidesText(c.facing)) };
      var t = (o.wall_m != null && isFinite(+o.wall_m)) ? +o.wall_m : (p.wall_m || 0);
      var off = +o.offset_m || 0;
      // offset measured along the shared wall, from the corner of the existing room that lies
      // toward offset_from_deg (default: the corner toward facing+90 / toward the back)
      if (side === 'facing' || side === 'back') {
        r.y = (side === 'facing') ? B.y + B.d + t : B.y - t - r.d;
        var fromXmax = o.offset_from_deg != null && sideKey(c.facing, +o.offset_from_deg) === 'xmax';
        r.x = fromXmax ? (B.x + B.w - off - r.w) : (B.x + off);
      } else {
        r.x = (side === 'xmax') ? B.x + B.w + t : B.x - t - r.w;
        var fromFacing = o.offset_from_deg != null && sideKey(c.facing, +o.offset_from_deg) === 'facing';
        r.y = fromFacing ? (B.y + B.d - off - r.d) : (B.y + off);
      }
    } else if (o.x_m != null || o.y_m != null) {
      if (o.x_m != null) r.x = +o.x_m; if (o.y_m != null) r.y = +o.y_m;
    } else if (act === 'add' && p.rooms.length) {
      return { error: 'Say where this room is: attach_to + side_deg (+ offset_m), or x_m/y_m.' };
    }
    if (act === 'add') p.rooms.push(r);
    c.save();
    var st = status(o.house_name); st.done = act + ' ' + r.name;
    return st;
  }
  function settings(o) {
    var c = ctx(o.house_name); if (!c) return { error: 'No house found.' };
    if (o.wall_m != null) { if (!(+o.wall_m >= 0 && +o.wall_m < 1)) return { error: 'wall_m must be between 0 and 1 m.' }; c.plan.wall_m = +o.wall_m; }
    if (o.clear === true) c.plan.rooms = [];
    c.save(); return status(o.house_name);
  }

  // ── drawing ───────────────────────────────────────────────
  function render(c, maxPx) {
    var p = c.plan, b = bbox(p); if (!b) return null;
    var M = 60, W0 = b.x1 - b.x0, H0 = b.y1 - b.y0;
    var k = (maxPx - 2 * M) / Math.max(W0, H0);
    var cv = document.createElement('canvas');
    cv.width = Math.round(W0 * k + 2 * M); cv.height = Math.round(H0 * k + 2 * M);
    var g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    var X = function (x) { return M + (x - b.x0) * k; }, Y = function (y) { return M + (y - b.y0) * k; };
    // footprint (walls) in grey, rooms in white on top
    footprint(p).forEach(function (r) { g.fillStyle = '#9e9e9e'; g.fillRect(X(r.x0), Y(r.y0), (r.x1 - r.x0) * k, (r.y1 - r.y0) * k); });
    p.rooms.forEach(function (r) {
      g.fillStyle = '#fbfaf5'; g.fillRect(X(r.x), Y(r.y), r.w * k, r.d * k);
      g.lineWidth = 3; g.strokeStyle = '#333'; g.strokeRect(X(r.x), Y(r.y), r.w * k, r.d * k);
      var fs = Math.max(11, Math.min(22, Math.min(r.w, r.d) * k / 6));
      g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold ' + fs + 'px sans-serif'; g.fillText(r.name, X(r.x + r.w / 2), Y(r.y + r.d / 2) - fs * 0.6);
      g.font = (fs * 0.8) + 'px sans-serif'; g.fillText(r2(r.w) + ' x ' + r2(r.d) + ' m', X(r.x + r.w / 2), Y(r.y + r.d / 2) + fs * 0.6);
    });
    // side labels
    var S = sideDirs(c.facing);
    g.font = 'bold 16px sans-serif'; g.fillStyle = '#7b1fa2'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('↓ facing ' + S.facing + '° (' + d8(S.facing) + ')', cv.width / 2, cv.height - M / 2);
    g.fillText(S.back + '° (' + d8(S.back) + ')', cv.width / 2, M / 2);
    g.save(); g.translate(M / 2, cv.height / 2); g.rotate(-Math.PI / 2); g.fillText(S.xmin + '° (' + d8(S.xmin) + ')', 0, 0); g.restore();
    g.save(); g.translate(cv.width - M / 2, cv.height / 2); g.rotate(Math.PI / 2); g.fillText(S.xmax + '° (' + d8(S.xmax) + ')', 0, 0); g.restore();
    return { canvas: cv, X: X, Y: Y, b: b, k: k };
  }

  // Hand the plan to the floor-plan tool: rectangles + centre already set.
  function toFloorplan(houseName) {
    var c = ctx(houseName); if (!c) return { error: 'No house found.' };
    if (!c.plan.rooms.length) return { error: 'The plan has no rooms yet.' };
    var R = render(c, 1100); if (!R) return { error: 'Nothing to draw.' };
    var cw = R.canvas.width, ch = R.canvas.height;
    var fp = footprint(c.plan), cen = centroid(fp);
    var obj = {
      imgData: R.canvas.toDataURL('image/png'), starsImg: null,
      facingDeg: c.facing, facingSide: 'bottom', period: (c.period != null ? c.period : 9),
      centerMode: 'rect',
      rectsF: fp.map(function (r) { return { x0: R.X(r.x0) / cw, y0: R.Y(r.y0) / ch, x1: R.X(r.x1) / cw, y1: R.Y(r.y1) / ch }; }),
      centerF: cen ? { x: R.X(cen.x) / cw, y: R.Y(cen.y) / ch } : null,
      fromPlanBuilder: true, savedAt: Date.now()
    };
    obj.starsImg = obj.imgData;
    c.f.floorplan = obj;
    try { c.save(); } catch (e) { return { error: 'Storage is full: could not save the plan image.' }; }
    // open the floor-plan tool on it, so the 8 palaces + stars are drawn; "Save to house" refreshes the composite
    try { if (typeof fsHouseImportFloorplan === 'function') fsHouseImportFloorplan(c.hs.key, c.hs.idx); } catch (e) {}
    return { saved: true, note: 'Plan saved as this floor\'s floor plan and opened in the floor-plan tool (8 palaces drawn from the centre). Press "Save to house" there to store the picture with the stars.' };
  }

  // ── viewer dialog ─────────────────────────────────────────
  function open(houseName) {
    var c = ctx(houseName);
    if (!c) { alert('No house found.'); return { error: 'No house found.' }; }
    var old = document.getElementById('xpb-modal'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'xpb-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;overflow-y:auto;';
    var st = status(houseName);
    var R = c.plan.rooms.length ? render(c, 1000) : null;
    var rows = c.plan.rooms.map(function (r) {
      return '<tr><td style="padding:3px 6px;">' + esc(r.name) + '</td><td style="padding:3px 6px;text-align:right;">' + r2(r.d) + '</td><td style="padding:3px 6px;text-align:right;">' + r2(r.w) +
        '</td><td style="padding:3px 6px;text-align:right;">' + r2(r.w * r.d) + '</td><td><button data-n="' + esc(r.name) + '" onclick="XKDGPlanBuilder._del(this.dataset.n)" style="border:1px solid #ffcdd2;background:#fff0f0;color:#c62828;border-radius:5px;cursor:pointer;">✕</button></td></tr>';
    }).join('');
    m.innerHTML = '<div style="background:#fff;margin:10px auto;max-width:900px;border-radius:10px;overflow:hidden;">' +
      '<div style="background:#5d4037;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">' +
      '<b>📏 Plan builder — ' + esc(c.h.name) + ' · ' + esc(st.floor) + '</b>' +
      '<button onclick="XKDGPlanBuilder.close()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="padding:10px 12px;font-size:12px;color:#333;">' +
      '<div style="margin-bottom:6px;line-height:1.5;">The easiest way: open the assistant and say <b>"let\'s build the floor plan of ' + esc(c.h.name) + '"</b> — it asks for each laser measurement. ' +
      'Walls follow the house facing (' + c.facing + '°) and its perpendiculars. Internal walls: <b>' + c.plan.wall_m + ' m</b>.</div>' +
      (R ? '<div id="xpb-img"></div>' : '<div style="color:#888;padding:20px;text-align:center;">No rooms yet.</div>') +
      (rows ? '<table style="border-collapse:collapse;margin-top:8px;font-size:12px;"><tr style="background:#efebe9;"><th style="padding:3px 6px;">Room</th><th>along facing (m)</th><th>across (m)</th><th>m²</th><th></th></tr>' + rows + '</table>' : '') +
      (st.warnings && st.warnings.length ? '<div style="color:#c62828;margin-top:6px;">⚠ ' + esc(st.warnings.join(' · ')) + '</div>' : '') +
      (st.centre_m && !st.centre_m.inside_the_plan ? '<div style="color:#c62828;margin-top:6px;">⚠ The centre falls outside the rooms (irregular plan): check the missing sectors.</div>' : '') +
      (R ? '<div style="margin-top:10px;"><button onclick="XKDGPlanBuilder._toFp()" style="padding:6px 12px;border-radius:6px;border:none;background:#5d4037;color:#fff;cursor:pointer;">🖼 Use as floor plan (8 palaces)</button></div>' : '') +
      '</div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.body.appendChild(m);
    if (R) { R.canvas.style.cssText = 'width:100%;height:auto;border:1px solid #ddd;border-radius:6px;'; document.getElementById('xpb-img').appendChild(R.canvas); }
    m._house = houseName || null;
    return { open: true };
  }
  function close() { var m = document.getElementById('xpb-modal'); if (m) m.remove(); }
  function currentHouseName() { var m = document.getElementById('xpb-modal'); return m ? m._house : null; }

  window.XKDGPlanBuilder = {
    status: status, room: roomOp, settings: settings, open: open, close: close, toFloorplan: toFloorplan,
    openForHouse: function (key, idx) {
      var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {};
      var h = all[key] && all[key][idx]; return open(h ? h.name : null);
    },
    _del: function (n) { if (!confirm('Delete room "' + n + '"?')) return; var hn = currentHouseName(); roomOp({ house_name: hn, action: 'remove', name: n }); open(hn); },
    _toFp: function () { var hn = currentHouseName(); var r = toFloorplan(hn); if (r && r.error) alert(r.error); else close(); }
  };
})();

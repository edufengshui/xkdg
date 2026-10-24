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
      wall_thickness_m: p.wall_m, ceiling_height_m: p.height_m || null,
      side_directions: sidesText(c.facing),
      rooms: p.rooms.map(function (r) {
        return { name: r.name, size_along_facing_axis_m: r2(r.d), size_across_m: r2(r.w), area_m2: r2(r.w * r.d),
                 position_m: { x: r2(r.x), y: r2(r.y) } };
      }),
      total_room_area_m2: r2(p.rooms.reduce(function (s, r) { return s + r.w * r.d; }, 0)),
      outer_size_m: b ? { along_facing_axis: r2(b.y1 - b.y0), across: r2(b.x1 - b.x0) } : null,
      centre_m: cen ? { x: r2(cen.x), y: r2(cen.y), inside_the_plan: inside(cen, fp) } : null,
      openings: (p.openings || []).map(function (op) { return { name: op.name, kind: op.kind, room: op.room, wall_deg: sideDirs(c.facing)[op.side], offset_m: r2(op.offset), width_m: r2(op.width) }; }),
      items: (p.items || []).map(function (it) { return { name: it.name, kind: it.kind, trial: !!it.trial, color: it.color || null, room: it.room, back_wall_deg: sideDirs(c.facing)[it.side], sitting_deg: sideDirs(c.facing)[it.side], offset_m: r2(it.offset), width_m: r2(it.width), depth_m: r2(it.depth), gap_m: r2(it.gap || 0) }; }),
      offset_rule: 'offset_m along a wall is measured from its START corner: on the walls toward ' + sideDirs(c.facing).facing + '° and ' + sideDirs(c.facing).back + '° from the corner toward ' + sideDirs(c.facing).xmin + '° (' + d8(sideDirs(c.facing).xmin) + '); on the walls toward ' + sideDirs(c.facing).xmax + '° and ' + sideDirs(c.facing).xmin + '° from the corner toward ' + sideDirs(c.facing).back + '° (' + d8(sideDirs(c.facing).back) + '). Pass offset_from_deg to measure from the other corner.',
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
    if (o.height_m != null) { if (!(+o.height_m > 1.5 && +o.height_m < 10)) return { error: 'height_m (ceiling) must be between 1.5 and 10 m.' }; c.plan.height_m = +o.height_m; }
    if (o.clear === true) { c.plan.rooms = []; c.plan.items = []; c.plan.openings = []; }
    c.save(); return status(o.house_name);
  }


  // ══ Furniture + openings + ZS/LS optimisation (session 32, Edu) ══════════
  // plan.openings: [{name, room, side, offset, width, kind:'door'|'window'}]
  // plan.items:    [{name, kind, room, side (wall its BACK touches), offset, width (along that
  //                  wall), depth (out of the wall), gap (distance from the wall, default 0)}]
  // side = 'facing' | 'back' | 'xmax' | 'xmin'. offset = along the wall from the START corner:
  // facing/back walls start at the corner toward facing+90 (x = room.x, going +x);
  // xmin/xmax walls start at the back corner (y = room.y, going +y). offset_from_deg flips it.
  function wallLen(r, side) { return (side === 'facing' || side === 'back') ? r.w : r.d; }
  function startCornerDeg(facing, side) { var S = sideDirs(facing); return (side === 'facing' || side === 'back') ? S.xmin : S.back; }
  // point on a wall at distance s from the start corner, pushed `inward` metres into the room
  function wallPoint(r, side, s, inward) {
    inward = inward || 0;
    if (side === 'facing') return { x: r.x + s, y: r.y + r.d - inward };
    if (side === 'back')   return { x: r.x + s, y: r.y + inward };
    if (side === 'xmax')   return { x: r.x + r.w - inward, y: r.y + s };
    return { x: r.x + inward, y: r.y + s };                       // xmin
  }
  // compass bearing from P to Q in the plan frame (+y = facing, +x = facing − 90)
  function bearingPQ(facing, P, Q) { return norm(facing + Math.atan2(-(Q.x - P.x), (Q.y - P.y)) * 180 / Math.PI); }
  function sideFromDeg(c, deg) { return sideKey(c.facing, +deg); }
  function offsetIn(o, c, side, len, width) {
    var off = +o.offset_m || 0;
    var flip = o.offset_from_deg != null && sideKey(c.facing, +o.offset_from_deg) !== null &&
               sideKey(c.facing, +o.offset_from_deg) === ((side === 'facing' || side === 'back') ? 'xmax' : 'facing');
    return flip ? (len - off - (width || 0)) : off;
  }
  function listOp(o, key, build) {
    var c = ctx(o.house_name);
    if (!c) return { error: o.house_name ? 'No house named "' + o.house_name + '".' : 'No active house.' };
    if (c.facing == null) return { error: 'This house has no facing saved yet.' };
    var p = c.plan; if (!p[key]) p[key] = [];
    var L = p[key], act = o.action || 'add', nm = String(o.name || '').trim().toLowerCase();
    var i = -1; for (var k = 0; k < L.length; k++) if (String(L[k].name).trim().toLowerCase() === nm) i = k;
    if (act === 'remove') { if (i < 0) return { error: 'Not found: "' + o.name + '".' }; L.splice(i, 1); c.save(); return status(o.house_name); }
    if (!o.name) return { error: 'Give it a name.' };
    if (act === 'add' && i >= 0) return { error: '"' + o.name + '" already exists: use action "update".' };
    if (act === 'update' && i < 0) return { error: 'Not found: "' + o.name + '".' };
    var cur = (act === 'update') ? L[i] : { name: String(o.name).trim() };
    var res = build(c, cur, o); if (res && res.error) return res;
    if (o.new_name) cur.name = String(o.new_name).trim();
    if (act === 'add') L.push(cur);
    c.save();
    var st = status(o.house_name); st.done = act + ' ' + cur.name; return st;
  }
  function placeOnWall(c, cur, o, needDepth) {
    var roomName = o.room || cur.room, ri = findRoom(c.plan, roomName);
    if (ri < 0) return { error: 'No room named "' + roomName + '". Rooms: ' + c.plan.rooms.map(function (r) { return r.name; }).join(', ') };
    var r = c.plan.rooms[ri]; cur.room = r.name;
    if (o.side_deg != null) { var sd = sideFromDeg(c, o.side_deg); if (!sd) return { error: 'side_deg must be one of the four wall directions: ' + JSON.stringify(sidesText(c.facing)) }; cur.side = sd; }
    if (!cur.side) return { error: 'Say which wall (side_deg = the direction that wall faces, one of ' + JSON.stringify(sidesText(c.facing)) + ').' };
    if (o.width_m != null) cur.width = +o.width_m;
    if (needDepth && o.depth_m != null) cur.depth = +o.depth_m;
    if (o.gap_m != null) cur.gap = +o.gap_m;
    if (!(cur.width > 0)) return { error: 'width_m is needed (along the wall).' };
    if (needDepth && !(cur.depth > 0)) return { error: 'depth_m is needed (from the wall into the room).' };
    var len = wallLen(r, cur.side);
    if (o.offset_m != null) cur.offset = offsetIn(o, c, cur.side, len, cur.width);
    if (cur.offset == null) return { error: 'offset_m is needed: distance along the wall from the corner toward ' + startCornerDeg(c.facing, cur.side) + '° (' + d8(startCornerDeg(c.facing, cur.side)) + ').' };
    if (cur.offset < -0.01 || cur.offset + cur.width > len + 0.01) return { error: 'It does not fit on that wall: wall ' + r2(len) + ' m, offset ' + r2(cur.offset) + ' + width ' + r2(cur.width) + ' m.' };
    return null;
  }
  function openingOp(o) {
    return listOp(o, 'openings', function (c, cur, o) {
      if (o.kind) cur.kind = o.kind === 'window' ? 'window' : 'door';
      if (!cur.kind) cur.kind = 'door';
      if (o.height_m != null) cur.height = +o.height_m;
      if (o.sill_m != null) cur.sill = +o.sill_m;
      return placeOnWall(c, cur, o, false);
    });
  }
  function itemOp(o) {
    return listOp(o, 'items', function (c, cur, o) {
      if (o.kind) cur.kind = String(o.kind).toLowerCase();
      if (!cur.kind) cur.kind = 'other';
      if (o.height_m != null) cur.height = +o.height_m;
      if (o.trial != null) { if (o.trial) cur.trial = true; else delete cur.trial; }
      if (o.color) cur.color = String(o.color);
      return placeOnWall(c, cur, o, true);
    });
  }
  function itemGeom(c, it) {
    var r = c.plan.rooms[findRoom(c.plan, it.room)]; if (!r) return null;
    var g = it.gap || 0, s0 = it.offset, s1 = it.offset + it.width;
    var a = wallPoint(r, it.side, s0, g), b = wallPoint(r, it.side, s1, g + it.depth);
    return { r: r, x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y),
             sitting: sideDirs(c.facing)[it.side] };
  }
  function openingPoint(c, op) {
    var r = c.plan.rooms[findRoom(c.plan, op.room)]; if (!r) return null;
    return wallPoint(r, op.side, op.offset + op.width / 2, 0);
  }
  // Evaluate the item → opening line for one item offset. ref_m = how far from the back wall
  // the reference point sits (0 = centre of the headboard / backrest).
  function evalAt(c, it, op, offset, ref_m) {
    var r = c.plan.rooms[findRoom(c.plan, it.room)];
    var P = wallPoint(r, it.side, offset + it.width / 2, (it.gap || 0) + (ref_m || 0));
    var Q = openingPoint(c, op);
    var brg = bearingPQ(c.facing, P, Q);
    var sitting = sideDirs(c.facing)[it.side], facingDir = norm(sitting + 180);
    var sitSlot = fsSlotForDeg(sitting), fSlot = fsSlotForDeg(facingDir), tSlot = fsSlotForDeg(brg);
    var ls = fsIsLingShen(tSlot.yun);
    var dist = Math.abs(angDiff(brg, fSlot.startDeg + 2.8125));
    var links = (typeof fsWaterMatchVsFacing === 'function') ? fsWaterMatchVsFacing(fSlot, tSlot) : [];
    var maxA = (typeof FS_WATER_MAX_DEG !== 'undefined') ? FS_WATER_MAX_DEG : 70;
    return { bearing: Math.round(brg * 10) / 10, hex: tSlot.hexNum, yun: tSlot.yun, qi: tSlot.qi, ling_shen: ls,
             within_70: dist <= maxA, links: links, ok: ls && dist <= maxA && links.length > 0,
             distance_m: r2(Math.hypot(Q.x - P.x, Q.y - P.y)), P: P, Q: Q,
             sitting: sitting, sitting_hex: sitSlot.hexNum, sitting_zheng_shen: fsIsZhengShen(sitSlot.yun), facing: facingDir, facing_hex: fSlot.hexNum };
  }
  function findIn(L, name) { var w = String(name || '').trim().toLowerCase(); for (var i = 0; i < (L || []).length; i++) if (String(L[i].name).trim().toLowerCase() === w) return L[i]; return null; }
  // Slide the item along its wall (1 cm steps) and report the stretches where the opening
  // falls on a good Ling Shen hexagram for the item's sitting.
  function optimize(o) {
    var c = ctx(o.house_name); if (!c) return { error: 'No house found.' };
    var p = c.plan, it = findIn(p.items, o.item), op = findIn(p.openings, o.opening);
    if (!it) return { error: 'No item named "' + o.item + '". Items: ' + (p.items || []).map(function (x) { return x.name; }).join(', ') };
    if (!op) return { error: 'No door/opening named "' + o.opening + '". Openings: ' + (p.openings || []).map(function (x) { return x.name; }).join(', ') };
    if (typeof fsSlotForDeg !== 'function') return { error: 'Feng Shui engine not loaded.' };
    var ref = (o.reference_m != null) ? +o.reference_m : 0;
    var r = p.rooms[findRoom(p, it.room)], len = wallLen(r, it.side);
    var now = evalAt(c, it, op, it.offset, ref);
    var runs = [], run = null;
    for (var s = 0; s + it.width <= len + 1e-6; s += 0.01) {
      var e = evalAt(c, it, op, s, ref);
      if (e.ok) { if (!run) run = { from: s, to: s, hex: {} }; run.to = s; run.hex[e.hex] = e.links.join(', '); }
      else if (run) { runs.push(run); run = null; }
    }
    if (run) runs.push(run);
    var best = null;
    runs.forEach(function (rn) {
      var mid = (rn.from + rn.to) / 2, tgt = (it.offset >= rn.from && it.offset <= rn.to) ? it.offset : Math.min(Math.max(it.offset, rn.from + 0.03), rn.to - 0.03);
      if (rn.to - rn.from < 0.06) tgt = mid;
      var mv = tgt - it.offset;
      if (!best || Math.abs(mv) < Math.abs(best.move)) best = { move: mv, offset: tgt, run: rn };
    });
    var dirTo = function (mv) { var S = sideDirs(c.facing); var horiz = (it.side === 'facing' || it.side === 'back'); return mv > 0 ? (horiz ? S.xmax : S.facing) : (horiz ? S.xmin : S.back); };
    var out = {
      item: it.name, opening: op.name, room: it.room,
      sitting: now.sitting + '° (' + d8(now.sitting) + ', hex ' + now.sitting_hex + ')', sitting_zheng_shen: now.sitting_zheng_shen,
      item_facing: now.facing + '° (hex ' + now.facing_hex + ')',
      reference_point: ref ? (ref + ' m in front of the back (headboard) wall, centre of the item') : 'centre of the headboard / backrest',
      now: { offset_m: r2(it.offset), bearing_to_opening: now.bearing, hex: now.hex, yun: now.yun, ling_shen: now.ling_shen,
             within_70: now.within_70, links: now.links, good: now.ok, distance_m: now.distance_m },
      good_stretches: runs.map(function (rn) {
        return { offset_from_m: r2(rn.from), offset_to_m: r2(rn.to), width_cm: Math.round((rn.to - rn.from) * 100) + 1,
                 hexagrams: Object.keys(rn.hex).map(function (h) { return 'hex ' + h + ' (' + rn.hex[h] + ')'; }) };
      }),
      wall_length_m: r2(len),
      offset_measured_from: 'corner toward ' + startCornerDeg(c.facing, it.side) + '° (' + d8(startCornerDeg(c.facing, it.side)) + ')'
    };
    if (!now.sitting_zheng_shen) out.warning = 'The sitting (' + now.sitting + '°, hex ' + now.sitting_hex + ') is NOT Zheng Shen: moving along this wall cannot fix that; consider another wall.';
    if (now.ok && !now.sitting_zheng_shen) out.advice = 'The door line is fine, but the SITTING is not Zheng Shen: move the ' + it.name + ' to a wall whose direction is Zheng Shen (see other_walls) and run the check again.';
    else if (now.ok) out.advice = 'Already good: the opening falls on hex ' + now.hex + ' (Ling Shen, ' + now.links.join(', ') + ').';
    else if (best) {
      var d = dirTo(best.move);
      out.advice = 'Move the ' + it.name + ' ' + Math.round(Math.abs(best.move) * 100) + ' cm toward ' + d + '° (' + d8(d) + ') along the wall: the centre of "' + op.name + '" then falls on ' + Object.keys(best.run.hex).map(function (h) { return 'hex ' + h; }).join(' / ') + ' (Ling Shen).';
      out.suggested_offset_m = r2(best.offset);
    } else out.advice = 'No position along this wall puts the opening on a good Ling Shen hexagram for this sitting. Try another wall for the ' + it.name + ' (sitting must be Zheng Shen).';
    // other walls of the room, for information
    var alt = [];
    ['facing', 'back', 'xmax', 'xmin'].forEach(function (sd) {
      if (sd === it.side) return;
      var sit = sideDirs(c.facing)[sd], sl = fsSlotForDeg(sit);
      var L2 = wallLen(r, sd); if (L2 < it.width) return;
      var tmp = { name: it.name, room: it.room, side: sd, offset: 0, width: it.width, depth: it.depth, gap: it.gap }, n = 0;
      for (var s2 = 0; s2 + it.width <= L2 + 1e-6; s2 += 0.02) if (evalAt(c, tmp, op, s2, ref).ok) n++;
      alt.push({ wall_deg: sit, sitting_hex: sl.hexNum, sitting_zheng_shen: fsIsZhengShen(sl.yun), good_positions: n > 0 });
    });
    out.other_walls = alt;
    window._xpbLastOpt = { house: o.house_name || null, item: it.name, opening: op.name, P: now.P, Q: now.Q, ok: now.ok };
    return out;
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
    // openings (doors brown, windows blue) — a thick coloured gap on the wall
    (p.openings || []).forEach(function (op) {
      var r = p.rooms[findRoom(p, op.room)]; if (!r) return;
      var A = wallPoint(r, op.side, op.offset, 0), B = wallPoint(r, op.side, op.offset + op.width, 0);
      g.lineWidth = 7; g.strokeStyle = op.kind === 'window' ? '#42a5f5' : '#8d6e63';
      g.beginPath(); g.moveTo(X(A.x), Y(A.y)); g.lineTo(X(B.x), Y(B.y)); g.stroke();
      g.fillStyle = '#5d4037'; g.font = '11px sans-serif'; g.textAlign = 'center';
      var Mx = (A.x + B.x) / 2, My = (A.y + B.y) / 2; g.fillText(op.name, X(Mx), Y(My) + (op.side === 'facing' ? -10 : 12));
    });
    // furniture
    (p.items || []).forEach(function (it) {
      var G = itemGeom(c, it); if (!G) return;
      g.fillStyle = it.kind === 'bed' ? 'rgba(171,71,188,.25)' : 'rgba(255,183,77,.35)';
      g.fillRect(X(G.x0), Y(G.y0), (G.x1 - G.x0) * k, (G.y1 - G.y0) * k);
      g.lineWidth = 1.5; g.strokeStyle = '#6d4c41'; g.strokeRect(X(G.x0), Y(G.y0), (G.x1 - G.x0) * k, (G.y1 - G.y0) * k);
      // back (headboard) edge thicker
      var r = G.r, a1 = wallPoint(r, it.side, it.offset, it.gap || 0), a2 = wallPoint(r, it.side, it.offset + it.width, it.gap || 0);
      g.lineWidth = 5; g.strokeStyle = '#4a148c'; g.beginPath(); g.moveTo(X(a1.x), Y(a1.y)); g.lineTo(X(a2.x), Y(a2.y)); g.stroke();
      g.fillStyle = '#3e2723'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(it.name, X((G.x0 + G.x1) / 2), Y((G.y0 + G.y1) / 2));
    });
    // last optimisation: line from the item to the opening (green = good, red = not)
    var LO = window._xpbLastOpt;
    if (LO && LO.P && LO.Q) {
      g.setLineDash([8, 6]); g.lineWidth = 3; g.strokeStyle = LO.ok ? '#2e7d32' : '#c62828';
      g.beginPath(); g.moveTo(X(LO.P.x), Y(LO.P.y)); g.lineTo(X(LO.Q.x), Y(LO.Q.y)); g.stroke(); g.setLineDash([]);
    }
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
      (R ? '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;"><button onclick="XKDGPlanBuilder._toFp()" style="padding:6px 12px;border-radius:6px;border:none;background:#5d4037;color:#fff;cursor:pointer;">🖼 Use as floor plan (8 palaces)</button>' +
           '<button onclick="if(window.XKDGPlan3D)XKDGPlan3D.open(XKDGPlanBuilder._house())" style="padding:6px 12px;border-radius:6px;border:none;background:#283593;color:#fff;cursor:pointer;">🧊 3D view</button></div>' : '') +
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
    opening: openingOp, item: itemOp, optimize: optimize,
    // geometry for the 3D view (plan-3d.js)
    geom: function (houseName) {
      var c = ctx(houseName); if (!c || c.facing == null) return null;
      var fp = footprint(c.plan), cen = fp.length ? centroid(fp) : null;
      return { house: c.h.name, facing: c.facing, plan: c.plan, centre: cen, sideDirs: sideDirs(c.facing),
               wallPoint: wallPoint, findRoom: function (n) { return c.plan.rooms[findRoom(c.plan, n)] || null; },
               lastOpt: window._xpbLastOpt || null };
    },
    openForHouse: function (key, idx) {
      var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {};
      var h = all[key] && all[key][idx]; return open(h ? h.name : null);
    },
    // room-photo.js: store / replace the photo record of one room (image itself lives in IndexedDB)
    savePhoto: function (houseName, rec) {
      var c = ctx(houseName); if (!c || !rec || !rec.room) return false;
      if (!c.plan.photos) c.plan.photos = [];
      var L = c.plan.photos, i = -1; for (var k = 0; k < L.length; k++) if (L[k].room === rec.room) i = k;
      if (i >= 0) L[i] = rec; else L.push(rec);
      c.save(); return true;
    },
    _house: function () { return currentHouseName(); },
    _del: function (n) { if (!confirm('Delete room "' + n + '"?')) return; var hn = currentHouseName(); roomOp({ house_name: hn, action: 'remove', name: n }); open(hn); },
    _toFp: function () { var hn = currentHouseName(); var r = toFloorplan(hn); if (r && r.error) alert(r.error); else close(); }
  };
})();

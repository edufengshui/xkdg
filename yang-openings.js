// ============================================================
// XKDG — yang-openings.js  (session 37, Edu)
// ============================================================
// "🪟 Yang openings": place bed, desk, doors and items so that the EXISTING yang
// openings (house entrance door, room doors, OPENABLE windows) fall on the good
// Ling Shen water hexagrams of each facing. First without fountains; a fountain is
// suggested only for the good hexagrams no opening can reach.
//
// Decisions (Edu, session 36):
//  • conflicts between openings have NO automatic priority: the tool lists the
//    options, the user picks one case by case;
//  • windows count only if they can be OPENED (fixed glass is not an opening);
//  • texts purely technical, no interpretations.
//
// Data (per floor):
//   f.windows   = [{ oid, name, openable:true }]          (doors already exist in f.doors)
//   d.oid       = stable id given to a door the first time it is measured
//   f.yangMeas  = { "<group>|<label>": {                 one entry per FACING SOURCE
//                    label, group, deg,
//                    op: { <oid>: { c, l, r, dist, at, photo } },   bearings ° / metres
//                    calc: { targets:{oid:hex}, sideMax, fwdMax, sideOn, fwdOn },
//                    choice: { s, t, label, at, rows } } }
//
// Geometry (facing point = centre of the bed head / door centre / desk; facing φ):
//   a = bearing − φ, F = D·cos a (forward), L = D·sin a (right of the facing)
//   moving the piece s m to the RIGHT and t m FORWARD → new bearing φ + atan2(L − s, F − t)
//   two openings + both moves → 2 linear equations, exact centring:
//   (L − s)·cos τ = (F − t)·sin τ   ⇔   −s·cos τ + t·sin τ = F·sin τ − L·cos τ
// ============================================================
(function () {
  'use strict';

  var HEXW = 5.625, HALF = 2.8125;
  var BR_NAMES = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
  var BR_CH = '子丑寅卯辰巳午未申酉戌亥';
  var S = null;   // open panel state

  function norm(d) { return ((d % 360) + 360) % 360; }
  function angDiff(a, b) { return ((a - b + 540) % 360) - 180; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function el(id) { return document.getElementById(id); }
  function num(x) { if (x === '' || x == null) return null; var n = parseFloat(String(x).replace(',', '.')); return isFinite(n) ? n : null; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function newId(p) { return p + Math.random().toString(36).slice(2, 8); }

  // ── storage ────────────────────────────────────────────────
  function loadCtx(pk, hi) {
    var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {};
    var h = all[pk] && all[pk][hi]; if (!h) return null;
    var f = _fsActiveFloor(h);
    var dirty = false;
    (f.doors || []).forEach(function (d) { if (d && d.kind !== 'item' && !d.oid) { d.oid = newId('d'); dirty = true; } });
    if (!Array.isArray(f.windows)) { f.windows = []; }
    if (!f.yangMeas || typeof f.yangMeas !== 'object') f.yangMeas = {};
    if (dirty) _fsHousesSave(all);
    return { all: all, h: h, f: f, pk: pk, hi: hi };
  }
  function saveCtx(c) { _fsHousesSave(c.all); }

  // Facing sources — same list (and labels) as 📷 Photo sectors, so measurements saved
  // from a photo land on the same source. Bed facing = sitting + 180.
  function sources(h, f) {
    var out = [];
    var hf = (typeof _fsFloorFacing === 'function') ? _fsFloorFacing(h, f) : h.houseFacing;
    if (hf != null && isFinite(+hf)) out.push({ group: 'House', label: 'House facing', deg: norm(+hf) });
    (f.doors || []).forEach(function (d, i) {
      if (!d || d.facing == null || !isFinite(+d.facing)) return;
      out.push({ group: d.kind === 'item' ? 'Items' : 'Doors', label: d.name || ((d.kind === 'item' ? 'Item ' : 'Door ') + (i + 1)), deg: norm(+d.facing), oid: d.oid || null });
    });
    var st = f.settings || {};
    (st.bed || []).forEach(function (b, i) { var s = num(b.bedSitting); if (s != null) out.push({ group: 'Beds', label: b.name || ('Bed ' + (i + 1)), deg: norm(s + 180) }); });
    (st.desk || []).forEach(function (k, i) { var s = num(k.deskFacing); if (s != null) out.push({ group: 'Desks', label: k.name || ('Desk ' + (i + 1)), deg: norm(s) }); });
    out.forEach(function (s) { s.key = s.group + '|' + s.label; });
    return out;
  }
  function findSource(list, want) {
    if (want == null || want === '') return list.filter(function (s) { return s.group !== 'House'; })[0] || list[0] || null;
    var w = String(want).trim().toLowerCase();
    var hit = list.filter(function (s) { return s.key.toLowerCase() === w || s.label.toLowerCase() === w; })[0];
    if (hit) return hit;
    var n = num(want);
    if (n != null) { hit = list.filter(function (s) { return Math.abs(angDiff(s.deg, n)) < 0.06; })[0]; if (hit) return hit; }
    return list.filter(function (s) { return s.label.toLowerCase().indexOf(w) >= 0; })[0] || null;
  }
  // Openings seen from a source: external + internal doors (not items, not the source
  // door itself) and the openable windows.
  function openings(f, src) {
    var out = [];
    (f.doors || []).forEach(function (d) {
      if (!d || d.kind === 'item' || !d.oid) return;
      if (src && src.oid && src.oid === d.oid) return;
      out.push({ oid: d.oid, name: d.name || 'Door', kind: d.kind === 'internal' ? 'internal door' : 'external door', icon: '🚪' });
    });
    (f.windows || []).forEach(function (w) {
      if (!w || w.openable === false) return;
      out.push({ oid: w.oid, name: w.name || 'Window', kind: 'window', icon: '🪟' });
    });
    return out;
  }
  function measOf(f, src) {
    var m = f.yangMeas[src.key];
    if (!m) m = f.yangMeas[src.key] = { label: src.label, group: src.group, deg: src.deg, op: {} };
    if (!m.op) m.op = {};
    m.deg = src.deg;
    return m;
  }

  // ── rules (from the app: Photo sectors / find_water_positions) ──
  function people(h, pk) {
    try { return (window.XKDGPhotoSectors && XKDGPhotoSectors.people) ? XKDGPhotoSectors.people(h, pk) : []; } catch (e) { return []; }
  }
  function goodHexes(facing, ppl) {
    var c = (window.XKDGPhotoSectors && XKDGPhotoSectors.candidates) ? XKDGPhotoSectors.candidates(facing, ppl || []) : { rows: [] };
    var good = {};
    c.rows.forEach(function (r) { if (r.valid) good[r.hex] = r; });
    var fs = fsSlotForDeg(facing);
    return { facingHex: c.facingHex, facingCentre: fs.startDeg + HALF, rows: c.rows.filter(function (r) { return r.valid; }), good: good };
  }
  function slotOfHex(hex) {
    for (var i = 0; i < FS_SLOTS.length; i++) if (FS_SLOTS[i].hexNum === hex) return FS_SLOTS[i];
    return null;
  }
  // Where a bearing falls: hexagram, distance to the nearest edge, status.
  function evalBearing(b, G, thr) {
    var s = fsSlotForDeg(b), d1 = norm(b - s.startDeg); if (d1 > HEXW) d1 = 0;
    var margin = Math.min(d1, HEXW - d1);
    var good = !!G.good[s.hexNum], why = '';
    if (!good) {
      var lim = (typeof FS_WATER_MAX_DEG !== 'undefined') ? FS_WATER_MAX_DEG : 70;
      if (!fsIsLingShen(s.yun)) why = 'Zheng Shen';
      else if (fsAngularDist(G.facingCentre, s.centerDeg) > lim) why = 'Ling Shen, beyond ±' + lim + '° of the facing';
      else why = 'Ling Shen, not linked with the facing';
    }
    return { deg: norm(b), hex: s.hexNum, from: s.startDeg, to: s.startDeg + HEXW, margin: margin, good: good,
             status: !good ? 'bad' : (margin < thr ? 'edge' : 'ok'), why: why };
  }
  // Signed margin of a bearing inside a TARGET hexagram (negative = outside).
  function marginIn(b, hex) { var s = slotOfHex(hex); return s ? HALF - Math.abs(angDiff(b, s.centerDeg)) : -99; }
  function polar(facing, o) {       // o = { c, dist } → forward / right components
    var a = angDiff(o.c, facing) * Math.PI / 180;
    return { F: o.dist * Math.cos(a), L: o.dist * Math.sin(a) };
  }
  function moved(facing, P, s, t) { return norm(facing + Math.atan2(P.L - s, P.F - t) * 180 / Math.PI); }
  function moveText(s, t) {
    var a = [];
    if (Math.abs(s) >= 0.005) a.push(Math.round(Math.abs(s) * 100) + ' cm ' + (s > 0 ? 'right' : 'left'));
    if (Math.abs(t) >= 0.005) a.push(Math.round(Math.abs(t) * 100) + ' cm ' + (t > 0 ? 'forward' : 'back'));
    return a.length ? a.join(' + ') : 'no move';
  }
  function width(o) {
    if (o.l == null || o.r == null) return null;
    var w = Math.abs(angDiff(o.r, o.l));
    var sl = fsSlotForDeg(o.l).hexNum, sr = fsSlotForDeg(o.r).hexNum;
    return { deg: w, fits: w <= HEXW, inside: sl === sr, hexL: sl, hexR: sr };
  }

  // ── the analysis (shared by the panel and the AI tool) ──────
  function analyse(c, src, thr) {
    thr = (thr != null && isFinite(thr)) ? thr : 1;
    var G = goodHexes(src.deg, people(c.h, c.pk));
    var M = measOf(c.f, src);
    var rows = openings(c.f, src).map(function (o) {
      var m = M.op[o.oid] || {};
      var r = { oid: o.oid, name: o.name, kind: o.kind, icon: o.icon, m: m };
      if (m.c != null) {
        r.now = evalBearing(m.c, G, thr);
        r.width = width(m);
        if (m.dist != null && m.dist > 0) r.P = polar(src.deg, m);
      }
      return r;
    });
    return { G: G, M: M, rows: rows, thr: thr };
  }

  // Move calculator. targets = { oid: hex }. Returns options; the user chooses (no priority).
  function solve(A, src, targets, o) {
    var thr = A.thr, sOn = o.sideOn !== false, tOn = o.fwdOn !== false;
    var sMax = sOn ? Math.max(0, Math.round(o.sideMax != null ? o.sideMax : 50)) : 0;
    var tMax = tOn ? Math.max(0, Math.round(o.fwdMax != null ? o.fwdMax : 50)) : 0;
    var T = A.rows.filter(function (r) { return targets[r.oid] && r.P; });
    var all = A.rows.filter(function (r) { return r.P; });
    var opts = [], seen = {};
    function rowsAt(s, t) {
      return all.map(function (r) {
        var b = moved(src.deg, r.P, s, t), e = evalBearing(b, A.G, thr);
        var tg = targets[r.oid];
        return { oid: r.oid, name: r.name, deg: r1(b), hex: e.hex, status: e.status, margin: r2(e.margin), target: tg || null,
                 onTarget: tg ? marginIn(b, tg) >= 0 : null };
      });
    }
    function push(kind, label, s, t, note) {
      var k = Math.round(s * 100) + ',' + Math.round(t * 100);
      if (seen[k]) { var o0 = seen[k]; if (o0.label.indexOf(label) < 0) o0.label += ' = ' + label; if (kind !== 'now' && o0.kind === 'now') o0.kind = 'now-option'; return; }
      var o = { kind: kind, label: label, s: r2(s), t: r2(t), move: moveText(s, t), note: note || '', rows: rowsAt(s, t) };
      seen[k] = o; opts.push(o);
    }
    push('now', 'Now', 0, 0);
    if (!T.length) return { options: opts, common: null, error: T.length ? null : 'Choose a target hexagram for at least one measured opening (bearing + distance).' };

    // grid search, 1 cm
    function scan(list) {
      var best = null, least = null, leastEdge = null;
      for (var si = -sMax; si <= sMax; si++) for (var ti = -tMax; ti <= tMax; ti++) {
        var s = si / 100, t = ti / 100, mn = 99;
        for (var j = 0; j < list.length; j++) {
          var r = list[j], P = r.P;
          if (P.F - t <= 0.05 && Math.abs(P.L - s) < 0.05) { mn = -99; break; }   // the piece would sit on the opening
          var m = marginIn(moved(src.deg, P, s, t), targets[r.oid]); if (m < mn) mn = m;
        }
        var d = Math.hypot(s, t);
        if (!best || mn > best.m + 1e-9 || (Math.abs(mn - best.m) < 1e-9 && d < best.d)) best = { s: s, t: t, m: mn, d: d };
        if (mn >= thr && (!least || d < least.d)) least = { s: s, t: t, m: mn, d: d };
        if (mn >= 0 && (!leastEdge || d < leastEdge.d)) leastEdge = { s: s, t: t, m: mn, d: d };
      }
      return { best: best, least: least, leastEdge: leastEdge };
    }
    var R = scan(T), common = !!(R.leastEdge);
    if (common) {
      if (R.least) push('least', 'Smallest move (all targets, ≥ ' + thr + '° from the edges)', R.least.s, R.least.t);
      else push('least', 'Smallest move (all targets — near an edge)', R.leastEdge.s, R.leastEdge.t, 'boundary');
      push('centred', 'Best centred (largest distance from the edges)', R.best.s, R.best.t);
      // exact centring of two openings with both moves
      if (T.length === 2 && sOn && tOn) {
        var eq = T.map(function (r) {
          var tau = angDiff(slotOfHex(targets[r.oid]).centerDeg, src.deg) * Math.PI / 180;
          return { a: -Math.cos(tau), b: Math.sin(tau), k: r.P.F * Math.sin(tau) - r.P.L * Math.cos(tau) };
        });
        var den = eq[0].a * eq[1].b - eq[1].a * eq[0].b;
        if (Math.abs(den) > 1e-9) {
          var s0 = (eq[0].k * eq[1].b - eq[1].k * eq[0].b) / den, t0 = (eq[0].a * eq[1].k - eq[1].a * eq[0].k) / den;
          var okDir = T.every(function (r) { return Math.abs(angDiff(moved(src.deg, r.P, s0, t0), slotOfHex(targets[r.oid]).centerDeg)) < 0.5; });
          if (okDir) {
            var inside = Math.abs(s0) * 100 <= sMax + 0.5 && Math.abs(t0) * 100 <= tMax + 0.5;
            push('exact', 'Exact centring of both openings', s0, t0, inside ? '' : 'beyond the allowed move');
          }
        }
      }
    } else {
      // No common solution: one option per opening, the user decides (Edu: no automatic priority).
      T.forEach(function (r) {
        var one = scan([r]), hx = targets[r.oid];
        if (!one.leastEdge) { push('one', r.name + ' on hex ' + hx + ' — not reachable within the allowed move (closest)', one.best.s, one.best.t, 'boundary'); return; }
        push('one', r.name + ' on hex ' + hx + ' — best centred', one.best.s, one.best.t);
        var l = one.least || one.leastEdge;
        if (Math.hypot(l.s - one.best.s, l.t - one.best.t) >= 0.02) push('one', r.name + ' on hex ' + hx + ' — smallest move' + (one.least ? '' : ' (near an edge)'), l.s, l.t, one.least ? '' : 'boundary');
      });
    }
    return { options: opts, common: common };
  }

  // Good hexagrams not reached by any opening (now, or after the chosen move).
  function freeHexes(A, src) {
    var ch = A.M.choice, used = {};
    A.rows.forEach(function (r) {
      if (!r.now) return;
      var b = (ch && r.P) ? moved(src.deg, r.P, ch.s, ch.t) : r.m.c;
      used[fsSlotForDeg(b).hexNum] = true;
    });
    return A.G.rows.filter(function (g) { return !used[g.hex]; });
  }

  // Hours passing the daily fountain rule (water hex ↔ hour ↔ day), from ai-chat.js.
  function fountainHours(waterDeg, iso) {
    if (typeof window.XKDGFountainHours !== 'function') return null;
    try { return window.XKDGFountainHours(waterDeg, iso); } catch (e) { return null; }
  }

  // ── panel ──────────────────────────────────────────────────
  function open(pk, hi, srcWant) {
    var c = loadCtx(pk, hi); if (!c) { alert('House not found.'); return false; }
    var list = sources(c.h, c.f);
    if (!list.length) { alert('This floor has no facing yet (house facing, doors, beds or desks).'); return false; }
    var src = findSource(list, srcWant);
    S = { pk: pk, hi: hi, list: list, src: src, thr: (S && S.thr) || 1, result: null, fdays: {} };
    render();
    return true;
  }
  function close() { var m = el('xyo-modal'); if (m) m.remove(); S = null; }

  function statusBadge(e) {
    if (!e) return '<span style="color:#999;">not measured</span>';
    var col = e.status === 'ok' ? '#2e7d32' : e.status === 'edge' ? '#ef6c00' : '#c62828';
    var ic = e.status === 'ok' ? '✓' : e.status === 'edge' ? '⚠' : '✗';
    var txt = e.status === 'ok' ? 'on a good Ling Shen hexagram' : e.status === 'edge' ? 'boundary: ' + r1(e.margin) + '° from the edge' : 'not on a good Ling Shen hexagram (' + e.why + ')';
    return '<b style="color:' + col + ';">' + ic + ' hex ' + e.hex + '</b> <span style="color:#555;">' + r1(e.from) + '–' + r1(e.to) + '° · ' + txt + '</span>';
  }

  function render() {
    var c = loadCtx(S.pk, S.hi); if (!c) return;
    S.list = sources(c.h, c.f);
    S.src = findSource(S.list, S.src && S.src.key) || S.list[0];
    var src = S.src, A = analyse(c, src, S.thr);
    S.A = A;
    var calc = A.M.calc || {};
    var btn = 'padding:5px 10px;border-radius:6px;font-size:12px;cursor:pointer;';
    var inp = 'width:62px;font-size:12px;padding:2px 3px;';
    var opts = ['House', 'Doors', 'Beds', 'Desks', 'Items'].map(function (g) {
      var it = S.list.filter(function (s) { return s.group === g; }); if (!it.length) return '';
      return '<optgroup label="' + g + '">' + it.map(function (s) { return '<option value="' + esc(s.key) + '"' + (s.key === src.key ? ' selected' : '') + '>' + esc(s.label) + ' ' + r1(s.deg) + '°</option>'; }).join('') + '</optgroup>';
    }).join('');
    var goodChips = A.G.rows.map(function (g) {
      return '<span style="display:inline-block;margin:2px 4px 2px 0;padding:1px 7px;border:1px solid #a5d6a7;border-radius:10px;background:#f1f8e9;">hex <b>' + g.hex + '</b> ' + r1(g.from) + '–' + r1(g.to) + '°</span>';
    }).join('') || '<span style="color:#c62828;">No good Ling Shen hexagram within range for this facing.</span>';

    // openings
    var opHtml = A.rows.map(function (r) {
      var m = r.m, w = r.width;
      var a = 'XKDGYangOpenings._set(\'' + r.oid + '\',';
      var wTxt = w ? 'Width ' + r1(w.deg) + '° (a hexagram is 5.6°): ' + (w.fits ? (w.inside ? 'the whole opening is inside hex ' + w.hexL : 'it can fit in one hexagram, now it spans hex ' + w.hexL + '–' + w.hexR) : 'wider than one hexagram — only its centre can be placed') : '';
      return '<div style="border:1px solid #e0e0e0;border-radius:8px;padding:6px 8px;margin:5px 0;background:#fafafa;">' +
        '<div style="display:flex;align-items:center;gap:6px;"><b>' + r.icon + ' ' + esc(r.name) + '</b><span style="color:#888;font-size:11px;">' + r.kind + '</span>' +
        (r.kind === 'window' ? '<button onclick="XKDGYangOpenings._delWin(\'' + r.oid + '\')" title="Remove window" style="margin-left:auto;background:none;border:none;color:#c62828;cursor:pointer;">✕</button>' : '') + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:4px 0;font-size:12px;">' +
          '<span>Centre <input type="number" step="0.1" style="' + inp + '" value="' + (m.c != null ? r1(m.c) : '') + '" onchange="' + a + '\'c\',this.value)">°</span>' +
          '<span>Distance <input type="number" step="0.01" style="' + inp + '" value="' + (m.dist != null ? m.dist : '') + '" onchange="' + a + '\'dist\',this.value)"> m</span>' +
          '<span>Edges <input type="number" step="0.1" style="' + inp + '" placeholder="left" value="' + (m.l != null ? r1(m.l) : '') + '" onchange="' + a + '\'l\',this.value)">° – ' +
          '<input type="number" step="0.1" style="' + inp + '" placeholder="right" value="' + (m.r != null ? r1(m.r) : '') + '" onchange="' + a + '\'r\',this.value)">°</span>' +
        '</div>' +
        '<div style="font-size:12px;">' + statusBadge(r.now) + '</div>' +
        (wTxt ? '<div style="font-size:11px;color:#555;margin-top:2px;">' + wTxt + '</div>' : '') +
        ((m.at || m.photo) ? '<div style="font-size:10px;color:#999;margin-top:2px;">' + esc([m.at ? 'measured ' + m.at : '', m.photo || ''].filter(Boolean).join(' · ')) + '</div>' : '') +
      '</div>';
    }).join('') || '<div style="color:#888;">No doors or windows on this floor yet.</div>';

    // move calculator
    var measured = A.rows.filter(function (r) { return r.P; });
    var tgtHtml = measured.map(function (r) {
      var cur = calc.targets && calc.targets[r.oid] !== undefined ? calc.targets[r.oid] : defaultTarget(r, A);
      return '<div style="display:flex;gap:6px;align-items:center;margin:2px 0;font-size:12px;">' + r.icon + ' ' + esc(r.name) + ' → ' +
        '<select data-oid="' + r.oid + '" class="xyo-tg" style="font-size:12px;"><option value="">— not a target —</option>' +
        A.G.rows.map(function (g) { return '<option value="' + g.hex + '"' + (+cur === g.hex ? ' selected' : '') + '>hex ' + g.hex + ' (' + r1(g.centre) + '°)</option>'; }).join('') +
        '</select></div>';
    }).join('');
    var resHtml = '';
    if (S.result) {
      var R = S.result;
      if (R.error) resHtml = '<div style="color:#c62828;">' + esc(R.error) + '</div>';
      else {
        if (!R.common) resHtml += '<div style="padding:5px 8px;border-radius:6px;background:#fff3e0;border:1px solid #ffb74d;margin:4px 0;">No move puts ALL the targets on their hexagram. One option per opening below — you choose.</div>';
        resHtml += R.options.map(function (o, i) {
          var isCh = A.M.choice && Math.abs(A.M.choice.s - o.s) < 0.005 && Math.abs(A.M.choice.t - o.t) < 0.005;
          return '<div style="border:1px solid ' + (isCh ? '#2e7d32' : '#ddd') + ';border-radius:8px;padding:6px 8px;margin:5px 0;background:' + (isCh ? '#f1f8e9' : '#fff') + ';">' +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><b>' + esc(o.label) + '</b><span style="color:#1565c0;font-weight:bold;">' + o.move + '</span>' +
            (o.note === 'beyond the allowed move' ? '<span style="color:#ef6c00;">(beyond the allowed move)</span>' : '') +
            (o.kind !== 'now' || o.label !== 'Now' ? '<button onclick="XKDGYangOpenings._choose(' + i + ')" style="' + btn + 'margin-left:auto;border:1px solid #2e7d32;background:' + (isCh ? '#2e7d32' : '#fff') + ';color:' + (isCh ? '#fff' : '#2e7d32') + ';">' + (isCh ? '✔ Chosen' : 'Choose') + '</button>' : '') + '</div>' +
            o.rows.map(function (x) {
              var col = x.status === 'ok' ? '#2e7d32' : x.status === 'edge' ? '#ef6c00' : '#c62828', ic = x.status === 'ok' ? '✓' : x.status === 'edge' ? '⚠' : '✗';
              return '<div style="font-size:12px;">' + esc(x.name) + ': ' + x.deg + '° → <b style="color:' + col + ';">' + ic + ' hex ' + x.hex + '</b>' +
                (x.status === 'edge' ? ' <span style="color:#ef6c00;">' + x.margin + '° from the edge</span>' : '') +
                (x.target ? (x.onTarget ? ' <span style="color:#2e7d32;">(target ' + x.target + ')</span>' : ' <span style="color:#c62828;">(target ' + x.target + ' missed)</span>') : '') + '</div>';
            }).join('') + '</div>';
        }).join('');
      }
    } else if (A.M.choice) {
      resHtml = '<div style="font-size:12px;padding:5px 8px;border:1px solid #2e7d32;border-radius:6px;background:#f1f8e9;">✔ Chosen (' + esc(A.M.choice.at || '') + '): <b>' + esc(A.M.choice.label) + '</b> — ' + esc(moveText(A.M.choice.s, A.M.choice.t)) +
        ' <button onclick="XKDGYangOpenings._unchoose()" style="' + btn + 'border:1px solid #999;background:#fff;">Clear</button></div>';
    }

    // fountains
    var free = freeHexes(A, src);
    var fHtml = free.map(function (g) {
      var open = S.fdays[g.hex];
      var hrs = '';
      if (open) {
        hrs = [0, 1, 2].map(function (k) {
          var d = new Date(); d.setDate(d.getDate() + k);
          var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          var H = fountainHours(g.centre, iso);
          if (H === null) return '<div style="color:#888;">The fountain rule needs the assistant module (not loaded).</div>';
          return '<div style="margin-top:3px;"><b>' + iso + '</b>' + (H.length ? H.map(function (x) { return '<div style="margin-left:8px;"><b>' + x.name + ' ' + x.branch + '</b> (solar ' + x.solar + ') <span style="color:#666;">' + esc(x.via) + '</span></div>'; }).join('') : ' <span style="color:#c62828;">no hour</span>') + '</div>';
        }).join('');
        hrs = '<div style="font-size:11px;margin-top:3px;color:#333;">Hours that pass the daily fountain rule (water hex ↔ hour ↔ day):' + hrs + '</div>';
      }
      return '<div style="border:1px dashed #4fc3f7;border-radius:8px;padding:5px 8px;margin:4px 0;font-size:12px;">⛲ <b>hex ' + g.hex + '</b> ' + r1(g.from) + '–' + r1(g.to) + '° (centre ' + r1(g.centre) + '°) · ' + esc(g.linksFacing.join(', ') || g.famFacing.join(', ')) +
        '<div style="margin-top:3px;display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button onclick="XKDGYangOpenings._fh(' + g.hex + ')" style="' + btn + 'border:1px solid #0288d1;background:#fff;color:#0288d1;">' + (open ? 'Hide hours' : '🕐 Daily hours') + '</button>' +
        '<button onclick="XKDGYangOpenings._wdates(' + r1(g.centre) + ')" style="' + btn + 'border:1px solid #00897b;background:#fff;color:#00897b;">🔎 Dates to place it</button></div>' + hrs + '</div>';
    }).join('');
    if (!free.length && A.G.rows.length) fHtml = '<div style="color:#2e7d32;font-size:12px;">Every good Ling Shen hexagram of this facing already has an opening — no fountain needed.</div>';

    var old = el('xyo-modal'), scroll = old ? old.scrollTop : 0; if (old) old.remove();
    var m = document.createElement('div');
    m.id = 'xyo-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;overflow-y:auto;';
    var fh = fsSlotForDeg(src.deg);
    m.innerHTML =
      '<div style="background:#fff;margin:10px auto;max-width:820px;border-radius:10px;overflow:hidden;">' +
      '<div style="background:#0277bd;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">' +
        '<b>🪟 Yang openings — ' + esc(c.h.name || '') + '</b>' +
        '<span><a href="guides/yang-openings.html" target="_blank" rel="noopener" style="color:#fff;margin-right:12px;text-decoration:none;">📘 Guide</a>' +
        '<button onclick="XKDGYangOpenings.close()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button></span></div>' +
      '<div style="padding:10px 12px;font-size:12px;color:#333;line-height:1.45;">' +
        '<div style="margin-bottom:6px;">Facing source: <select onchange="XKDGYangOpenings._src(this.value)" style="font-size:12px;">' + opts + '</select> ' +
          '<span style="color:#555;">facing hex ' + fh.hexNum + '</span></div>' +
        '<div style="margin-bottom:8px;"><b>Good Ling Shen water hexagrams</b> <span style="color:#777;">(as in 📷 Photo sectors)</span><br>' + goodChips + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;"><b>Openings</b> <span style="color:#777;">bearing from the facing point, laser distance to the centre (door / window closed)</span>' +
          '<button onclick="XKDGYangOpenings._addWin()" style="' + btn + 'margin-left:auto;border:1px solid #0277bd;background:#fff;color:#0277bd;">+ 🪟 Window</button></div>' +
        '<div style="font-size:11px;color:#777;">Only windows that can be OPENED count. Doors are taken from the house card.</div>' +
        opHtml +
        '<div style="margin-top:4px;font-size:11px;color:#555;">⚠ boundary warning when the centre is closer than <input type="number" step="0.1" min="0" max="2.8" value="' + S.thr + '" style="width:48px;font-size:11px;" onchange="XKDGYangOpenings._thr(this.value)">° to a hexagram edge.</div>' +
        '<div style="margin-top:12px;padding-top:8px;border-top:2px solid #e3f2fd;"><b>📐 Move calculator</b> <span style="color:#777;">left / right / forward as seen from the facing point looking along the facing</span>' +
          (measured.length ? tgtHtml : '<div style="color:#888;">Measure the bearing AND the distance of at least one opening first.</div>') +
          '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:6px 0;">' +
            '<label><input id="xyo-son" type="checkbox"' + (calc.sideOn === false ? '' : ' checked') + '> sideways, max <input id="xyo-smax" type="number" style="width:50px;font-size:12px;" value="' + (calc.sideMax != null ? calc.sideMax : 50) + '"> cm</label>' +
            '<label><input id="xyo-fon" type="checkbox"' + (calc.fwdOn === false ? '' : ' checked') + '> forward / back, max <input id="xyo-fmax" type="number" style="width:50px;font-size:12px;" value="' + (calc.fwdMax != null ? calc.fwdMax : 50) + '"> cm</label>' +
            '<button onclick="XKDGYangOpenings._calc()" style="' + btn + 'background:#0277bd;color:#fff;border:none;">Calculate</button></div>' +
          '<div id="xyo-res">' + resHtml + '</div></div>' +
        '<div style="margin-top:12px;padding-top:8px;border-top:2px solid #e0f7fa;"><b>⛲ Good hexagrams still without an opening</b> <span style="color:#777;">' + (A.M.choice ? '(after the chosen move)' : '(now)') + ' — a fountain here, nozzle inside the box (1× photo check), switched daily by the fountain rule</span>' + fHtml + '</div>' +
      '</div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.body.appendChild(m);
    m.scrollTop = scroll;
  }
  function defaultTarget(r, A) {
    if (!r.now) return '';
    if (r.now.good) return r.now.hex;
    var best = null;
    A.G.rows.forEach(function (g) { var d = Math.abs(angDiff(g.centre, r.m.c)); if (!best || d < best.d) best = { d: d, hex: g.hex }; });
    return best && best.d <= 12 ? best.hex : '';
  }
  function readCalc() {
    var t = {};
    Array.prototype.forEach.call(document.querySelectorAll('#xyo-modal .xyo-tg'), function (s) { t[s.getAttribute('data-oid')] = s.value ? +s.value : ''; });
    return { targets: t, sideOn: !!(el('xyo-son') && el('xyo-son').checked), fwdOn: !!(el('xyo-fon') && el('xyo-fon').checked),
             sideMax: num(el('xyo-smax') && el('xyo-smax').value) || 0, fwdMax: num(el('xyo-fmax') && el('xyo-fmax').value) || 0 };
  }

  // ── public API (also used by Photo sectors and the AI assistant) ──
  function saveMeasure(pk, hi, srcWant, oid, vals) {
    var c = loadCtx(pk, hi); if (!c) return { error: 'House not found.' };
    var src = findSource(sources(c.h, c.f), srcWant); if (!src) return { error: 'Facing source not found.' };
    var ops = openings(c.f, src), op = ops.filter(function (o) { return o.oid === oid || o.name.toLowerCase() === String(oid || '').toLowerCase(); })[0];
    if (!op) return { error: 'Opening not found. Openings: ' + ops.map(function (o) { return o.name; }).join(', ') };
    var M = measOf(c.f, src), m = M.op[op.oid] || (M.op[op.oid] = {});
    ['c', 'l', 'r'].forEach(function (k) { if (k in vals) { var n = num(vals[k]); if (n == null) delete m[k]; else m[k] = norm(n); } });
    if ('dist' in vals) { var d = num(vals.dist); if (d == null || d <= 0) delete m.dist; else m.dist = r2(d) === d ? d : Math.round(d * 1000) / 1000; }
    if (vals.photo) m.photo = String(vals.photo).slice(0, 120);
    m.at = today();
    saveCtx(c);
    return { ok: true, source: src.label, opening: op.name };
  }
  function addWindow(pk, hi, name, openable) {
    var c = loadCtx(pk, hi); if (!c) return { error: 'House not found.' };
    if (openable === false) return { error: 'Only windows that can be opened count as yang openings — a fixed glass is not saved.' };
    if (!name || !String(name).trim()) return { error: 'A name is needed.' };
    var w = { oid: newId('w'), name: String(name).trim(), openable: true };
    c.f.windows.push(w); saveCtx(c);
    return { ok: true, oid: w.oid, name: w.name };
  }
  function status(pk, hi, srcWant, thr) {
    var c = loadCtx(pk, hi); if (!c) return { error: 'House not found.' };
    var list = sources(c.h, c.f), src = findSource(list, srcWant);
    if (!src) return { error: 'Facing source not found.', sources: list.map(function (s) { return s.label + ' ' + r1(s.deg); }) };
    var A = analyse(c, src, thr);
    return {
      house: c.h.name, source: src.label, source_group: src.group, facing: r1(src.deg), facing_hex: fsSlotForDeg(src.deg).hexNum,
      sources: list.map(function (s) { return s.label + ' (' + s.group + ') ' + r1(s.deg) + '°'; }),
      good_hexagrams: A.G.rows.map(function (g) { return { hex: g.hex, from: r2(g.from), to: r2(g.to), centre: r2(g.centre), links: g.linksFacing }; }),
      boundary_deg: A.thr,
      openings: A.rows.map(function (r) {
        var o = { name: r.name, kind: r.kind };
        if (!r.now) { o.measured = false; return o; }
        o.centre_deg = r1(r.m.c); if (r.m.dist != null) o.distance_m = r.m.dist;
        if (r.m.l != null) o.left_deg = r1(r.m.l); if (r.m.r != null) o.right_deg = r1(r.m.r);
        o.hex = r.now.hex; o.status = r.now.status === 'ok' ? 'on a good Ling Shen hexagram' : r.now.status === 'edge' ? 'boundary (' + r1(r.now.margin) + '° from the edge)' : 'not on a good Ling Shen hexagram: ' + r.now.why;
        if (r.width) o.width = r1(r.width.deg) + '° vs 5.6° of a hexagram: ' + (r.width.fits ? (r.width.inside ? 'whole opening inside hex ' + r.width.hexL : 'can fit, now spans ' + r.width.hexL + '–' + r.width.hexR) : 'wider than a hexagram, only the centre can be placed');
        if (r.P) { o.forward_m = r2(r.P.F); o.right_m = r2(r.P.L); }
        return o;
      }),
      chosen_move: A.M.choice ? { label: A.M.choice.label, move: moveText(A.M.choice.s, A.M.choice.t) } : null,
      fountain_candidates: freeHexes(A, src).map(function (g) { return { hex: g.hex, from: r2(g.from), to: r2(g.to), centre: r2(g.centre) }; })
    };
  }
  function moves(pk, hi, srcWant, o) {
    o = o || {};
    var c = loadCtx(pk, hi); if (!c) return { error: 'House not found.' };
    var src = findSource(sources(c.h, c.f), srcWant); if (!src) return { error: 'Facing source not found.' };
    var A = analyse(c, src, o.thr);
    var targets = {};
    if (o.targets && typeof o.targets === 'object') {
      Object.keys(o.targets).forEach(function (k) {
        var r = A.rows.filter(function (x) { return x.oid === k || x.name.toLowerCase() === k.toLowerCase(); })[0];
        var hx = parseInt(o.targets[k], 10); if (r && hx >= 1 && hx <= 64) targets[r.oid] = hx;
      });
    } else A.rows.forEach(function (r) { var d = defaultTarget(r, A); if (d && r.P) targets[r.oid] = d; });
    var bad = Object.keys(targets).filter(function (k) { return !A.G.good[targets[k]]; });
    var R = solve(A, src, targets, o);
    R.targets = Object.keys(targets).map(function (k) { var r = A.rows.filter(function (x) { return x.oid === k; })[0]; return { opening: r ? r.name : k, hex: targets[k] }; });
    if (bad.length) R.warning = 'Some targets are not good Ling Shen hexagrams of this facing.';
    R.source = src.label; R.facing = r1(src.deg);
    return R;
  }

  window.XKDGYangOpenings = {
    open: open, close: close, status: status, moves: moves, saveMeasure: saveMeasure, addWindow: addWindow,
    sources: function (pk, hi) { var c = loadCtx(pk, hi); return c ? sources(c.h, c.f) : []; },
    openingsFor: function (pk, hi, srcWant) { var c = loadCtx(pk, hi); if (!c) return []; var s = findSource(sources(c.h, c.f), srcWant); return s ? openings(c.f, s) : []; },
    isOpen: function () { return !!S; },
    _geom: { polar: polar, moved: moved, moveText: moveText },
    _src: function (k) { S.src = findSource(S.list, k); S.result = null; render(); },
    _thr: function (v) { var n = num(v); S.thr = (n != null && n >= 0 && n <= HALF) ? n : 1; S.result = null; render(); },
    _set: function (oid, k, v) { var o = {}; o[k] = v; saveMeasure(S.pk, S.hi, S.src.key, oid, o); S.result = null; render(); },
    _addWin: function () {
      var n = prompt('Name of the window (e.g. "Bedroom window"):'); if (!n || !n.trim()) return;
      var op = confirm('Can this window be OPENED?\n\nOK = yes, it opens · Cancel = fixed glass (not a yang opening, not saved)');
      var r = addWindow(S.pk, S.hi, n, op); if (r.error) { alert(r.error); return; }
      render();
    },
    _delWin: function (oid) {
      var c = loadCtx(S.pk, S.hi); if (!c) return;
      var w = c.f.windows.filter(function (x) { return x.oid === oid; })[0]; if (!w || !confirm('Remove the window "' + w.name + '" and its measurements?')) return;
      c.f.windows = c.f.windows.filter(function (x) { return x.oid !== oid; });
      Object.keys(c.f.yangMeas).forEach(function (k) { if (c.f.yangMeas[k].op) delete c.f.yangMeas[k].op[oid]; });
      saveCtx(c); S.result = null; render();
    },
    _calc: function () {
      var o = readCalc(), c = loadCtx(S.pk, S.hi), M = measOf(c.f, S.src);
      M.calc = o; saveCtx(c);
      var tg = {}; Object.keys(o.targets).forEach(function (k) { if (o.targets[k]) tg[k] = o.targets[k]; });
      S.result = solve(analyse(c, S.src, S.thr), S.src, tg, o);
      render();
    },
    _choose: function (i) {
      var o = S.result && S.result.options[i]; if (!o) return;
      var c = loadCtx(S.pk, S.hi), M = measOf(c.f, S.src);
      M.choice = { s: o.s, t: o.t, label: o.label, at: today(), rows: o.rows.map(function (x) { return { name: x.name, deg: x.deg, hex: x.hex, status: x.status }; }) };
      saveCtx(c); render();
    },
    _unchoose: function () { var c = loadCtx(S.pk, S.hi), M = measOf(c.f, S.src); delete M.choice; saveCtx(c); render(); },
    _fh: function (hex) { S.fdays[hex] = !S.fdays[hex]; render(); },
    _wdates: function (deg) {
      var src = S.src, pk = S.pk, hi = S.hi;
      close();
      try { if (typeof fsOpenZoneForHouse === 'function') fsOpenZoneForHouse(pk, hi, 'water'); } catch (e) {}
      setTimeout(function () {
        var fi = el('fs-facing'), wi = el('fs-water');
        if (fi) fi.value = r1(src.deg);
        if (wi) wi.value = r1(deg);
        try { if (typeof fsCheckFacingZS === 'function') fsCheckFacingZS(); } catch (e) {}
        try { if (typeof fsRedraw === 'function') fsRedraw(); } catch (e) {}
      }, 300);
    }
  };
})();

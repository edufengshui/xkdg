// ============================================================
// XKDG — plan-3d.js  (session 32, Edu: "la planimetria girata in 3D")
// ============================================================
// 3D view of the Plan-builder floor plan: rooms, walls with door/window gaps,
// furniture as recognisable shapes (bed, desk, table, sofa, kitchen, stove,
// altar), the 8 palaces drawn on the floor from the centre of the house, the
// facing arrow and the last ZS/LS check line (item → door, green / red).
// three.js r128 is loaded only when the view is opened.
// Plan frame (metres): +x = facing − 90 (right of the drawing), +y = facing.
// 3D: X = x, Z = y, Y = up.
// ============================================================
(function () {
  'use strict';
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  var D8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  var DEF_H = { bed: 0.55, desk: 0.75, table: 0.75, sofa: 0.85, kitchen: 0.9, stove: 0.9, altar: 1.0, other: 0.8 };

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Cannot load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureThree() {
    if (window.THREE && window.THREE.OrbitControls) return Promise.resolve();
    return (window.THREE ? Promise.resolve() : loadScript(THREE_URL)).then(function () {
      return window.THREE.OrbitControls ? null : loadScript(ORBIT_URL);
    });
  }

  var S = null;   // current view state

  function mat(color, opts) {
    var o = { color: color }; if (opts) for (var k in opts) o[k] = opts[k];
    return new THREE.MeshLambertMaterial(o);
  }
  function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
  function cyl(r, h, m) { return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), m); }
  function at(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

  // text label as a sprite
  function label(text, color, size) {
    var c = document.createElement('canvas'), g = c.getContext('2d'), fs = 48;
    g.font = 'bold ' + fs + 'px sans-serif';
    var w = Math.ceil(g.measureText(text).width) + 24;
    c.width = w; c.height = fs + 20;
    g.font = 'bold ' + fs + 'px sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = color || '#222'; g.textBaseline = 'middle'; g.fillText(text, 12, c.height / 2);
    var tx = new THREE.CanvasTexture(c);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false }));
    var s = size || 0.35; sp.scale.set(s * c.width / c.height, s, 1);
    sp.renderOrder = 10;
    return sp;
  }

  // ── furniture, built in LOCAL space: x along the wall (0..w), z out of the wall (0..d), y up
  function furniture(kind, w, d, h) {
    var g = new THREE.Group();
    var wood = mat(0x8d6e63), dark = mat(0x4e342e), white = mat(0xfafafa), fabric = mat(0x7e57c2),
        sofaC = mat(0x5c6bc0), steel = mat(0xb0bec5), black = mat(0x212121), gold = mat(0xc9a84c), red = mat(0xc62828);
    if (kind === 'bed') {
      var baseH = 0.3, matH = 0.22;
      g.add(at(box(w, baseH, d, wood), w / 2, baseH / 2, d / 2));
      g.add(at(box(w - 0.04, matH, d - 0.06, white), w / 2, baseH + matH / 2, d / 2 + 0.02));
      g.add(at(box(w, 1.0, 0.07, dark), w / 2, 0.5, 0.035));                         // headboard
      var nP = w > 1.2 ? 2 : 1, pw = (w - 0.2) / nP - 0.05;
      for (var i = 0; i < nP; i++) g.add(at(box(pw, 0.12, 0.35, white), 0.1 + pw / 2 + i * (pw + 0.05) + 0.025, baseH + matH + 0.06, 0.28));
      g.add(at(box(w - 0.04, 0.05, d * 0.55, fabric), w / 2, baseH + matH + 0.02, d * 0.7));   // blanket
    } else if (kind === 'desk' || kind === 'table') {
      var th = h || 0.75, top = 0.04, lg = 0.05;
      g.add(at(box(w, top, d, wood), w / 2, th - top / 2, d / 2));
      [[lg, lg], [w - lg, lg], [lg, d - lg], [w - lg, d - lg]].forEach(function (p) { g.add(at(box(lg, th - top, lg, dark), p[0], (th - top) / 2, p[1])); });
      if (kind === 'desk') {   // chair in front
        var cw = Math.min(0.5, w * 0.5);
        g.add(at(box(cw, 0.05, 0.45, black), w / 2, 0.45, d + 0.3));
        g.add(at(box(cw, 0.45, 0.05, black), w / 2, 0.7, d + 0.53));
        g.add(at(cyl(0.03, 0.42, steel), w / 2, 0.21, d + 0.3));
      }
    } else if (kind === 'sofa') {
      var seatH = 0.42, arm = 0.18;
      g.add(at(box(w, seatH, d, sofaC), w / 2, seatH / 2, d / 2));
      g.add(at(box(w, (h || 0.85) - seatH, 0.2, sofaC), w / 2, seatH + ((h || 0.85) - seatH) / 2, 0.1));
      g.add(at(box(arm, 0.62, d, sofaC), arm / 2, 0.31, d / 2));
      g.add(at(box(arm, 0.62, d, sofaC), w - arm / 2, 0.31, d / 2));
      g.add(at(box(w - 2 * arm, 0.1, d - 0.25, mat(0x7986cb)), w / 2, seatH + 0.05, d / 2 + 0.1));
    } else if (kind === 'kitchen' || kind === 'stove') {
      var ch = h || 0.9;
      g.add(at(box(w, ch - 0.04, d, white), w / 2, (ch - 0.04) / 2, d / 2));
      g.add(at(box(w, 0.04, d, mat(0x455a64)), w / 2, ch - 0.02, d / 2));
      if (kind === 'stove' || w >= 1.2) {   // hob
        var hx = kind === 'stove' ? w / 2 : Math.min(w - 0.35, 0.6);
        [[-0.13, -0.12], [0.13, -0.12], [-0.13, 0.12], [0.13, 0.12]].forEach(function (p) { g.add(at(cyl(0.08, 0.012, black), hx + p[0], ch + 0.006, d / 2 + p[1])); });
      }
      if (kind === 'kitchen') g.add(at(box(w, 0.7, 0.35, white), w / 2, 1.85, 0.175));   // wall cabinets
    } else if (kind === 'altar') {
      var ah = h || 1.0;
      g.add(at(box(w, ah, d, red), w / 2, ah / 2, d / 2));
      g.add(at(box(w * 0.6, 0.25, d * 0.5, gold), w / 2, ah + 0.125, d * 0.35));
      g.add(at(cyl(0.05, 0.12, gold), w * 0.25, ah + 0.06, d * 0.75));
      g.add(at(cyl(0.05, 0.12, gold), w * 0.75, ah + 0.06, d * 0.75));
    } else {
      g.add(at(box(w, h || 0.8, d, mat(0xffb74d)), w / 2, (h || 0.8) / 2, d / 2));
    }
    return g;
  }

  // A furniture item placed in the plan frame (3D X = plan x, Z = plan y). Trial items
  // ("in prova") are semi-transparent; it.color tints the main body.
  function placedItem(G, it, opts) {
    var r = G.findRoom(it.room); if (!r) return new THREE.Group();
    var grp = furniture(it.kind, it.width, it.depth, it.height || DEF_H[it.kind]);
    // local → plan: origin at the start corner of the wall (inward by gap), x along wall, z into room
    var a = G.wallPoint(r, it.side, it.offset, it.gap || 0);
    var ex = G.wallPoint(r, it.side, it.offset + 1, it.gap || 0), ez = G.wallPoint(r, it.side, it.offset, (it.gap || 0) + 1);
    var m4 = new THREE.Matrix4().set(ex.x - a.x, 0, ez.x - a.x, a.x,
                                     0, 1, 0, 0,
                                     ex.y - a.y, 0, ez.y - a.y, a.y,
                                     0, 0, 0, 1);
    grp.applyMatrix4(m4);
    var tint = it.color ? new THREE.Color(it.color) : null, first = true;
    var alpha = (opts && opts.opacity != null) ? opts.opacity : (it.trial ? 0.55 : 1);
    grp.traverse(function (o) {
      if (!o.material) return;
      o.material = o.material.clone();
      o.material.side = THREE.DoubleSide;
      var hx = o.material.color.getHex();
      if (tint && hx !== 0xfafafa && hx !== 0x212121 && hx !== 0xb0bec5) { o.material.color = tint.clone(); }
      first = false;
      if (alpha < 1) { o.material.transparent = true; o.material.opacity = alpha; }
    });
    return grp;
  }
  function build(G) {
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f1ea);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    var sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(5, 10, 3); scene.add(sun);
    var p = G.plan, H = p.height_m || 2.7, T = Math.max(0.06, (p.wall_m || 0.12) / 2), wallH = S.lowWalls ? 1.1 : H;
    var floorM = mat(0xefe6d6), wallM = mat(0xe0e0e0, { transparent: true, opacity: S.lowWalls ? 1 : 0.55 }),
        doorM = mat(0x8d6e63), glassM = mat(0x90caf9, { transparent: true, opacity: 0.45 });
    var bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    p.rooms.forEach(function (r) {
      bb.x0 = Math.min(bb.x0, r.x); bb.y0 = Math.min(bb.y0, r.y); bb.x1 = Math.max(bb.x1, r.x + r.w); bb.y1 = Math.max(bb.y1, r.y + r.d);
      scene.add(at(box(r.w, 0.02, r.d, floorM), r.x + r.w / 2, -0.01, r.y + r.d / 2));
      var lb = label(r.name, '#5d4037', 0.3); lb.position.set(r.x + r.w / 2, 0.05, r.y + r.d / 2); scene.add(lb);
      // walls with gaps for the openings of this room
      ['back', 'facing', 'xmin', 'xmax'].forEach(function (side) {
        var horiz = (side === 'back' || side === 'facing'), len = horiz ? r.w : r.d;
        var ops = (p.openings || []).filter(function (o) { return o.room === r.name && o.side === side; })
                    .sort(function (a, b) { return a.offset - b.offset; });
        var seg = function (s0, s1, y0, y1) {
          if (s1 - s0 < 0.005 || y1 - y0 < 0.005) return;
          var A = G.wallPoint(r, side, (s0 + s1) / 2, -T / 2);
          var m = horiz ? box(s1 - s0, y1 - y0, T, wallM) : box(T, y1 - y0, s1 - s0, wallM);
          scene.add(at(m, A.x, (y0 + y1) / 2, A.y));
        };
        var cur = 0;
        ops.forEach(function (o) {
          seg(cur, o.offset, 0, wallH);
          var oh = o.height || (o.kind === 'window' ? 1.2 : 2.1), sill = o.kind === 'window' ? (o.sill != null ? o.sill : 0.9) : 0;
          seg(o.offset, o.offset + o.width, 0, Math.min(sill, wallH));
          seg(o.offset, o.offset + o.width, Math.min(sill + oh, wallH), wallH);
          var C = G.wallPoint(r, side, o.offset + o.width / 2, -T / 2);
          if (o.kind === 'window') {
            if (sill < wallH) { var gm = horiz ? box(o.width, Math.min(oh, wallH - sill), 0.02, glassM) : box(0.02, Math.min(oh, wallH - sill), o.width, glassM); scene.add(at(gm, C.x, sill + Math.min(oh, wallH - sill) / 2, C.y)); }
          } else {
            // open door leaf, hinged at the near jamb, swung into the room (90°)
            var J = G.wallPoint(r, side, o.offset, 0), into = G.wallPoint(r, side, o.offset, o.width);
            var leaf = horiz ? box(0.04, Math.min(oh, wallH), o.width, doorM) : box(o.width, Math.min(oh, wallH), 0.04, doorM);
            scene.add(at(leaf, (J.x + into.x) / 2, Math.min(oh, wallH) / 2, (J.y + into.y) / 2));
          }
          var ol = label(o.name, '#4e342e', 0.22); ol.position.set(C.x, Math.min(oh + sill, wallH) + 0.2, C.y); scene.add(ol);
          cur = o.offset + o.width;
        });
        seg(cur, len, 0, wallH);
      });
    });
    // furniture
    (p.items || []).forEach(function (it) {
      var r = G.findRoom(it.room); if (!r) return;
      scene.add(placedItem(G, it));
      var c = G.wallPoint(r, it.side, it.offset + it.width / 2, (it.gap || 0) + it.depth / 2);
      var lb = label(it.name, '#3e2723', 0.22); lb.position.set(c.x, (it.height || DEF_H[it.kind] || 0.8) + 0.35, c.y); scene.add(lb);
    });
    // 8 palaces on the floor from the centre + facing arrow
    if (G.centre) {
      var cx = G.centre.x, cz = G.centre.y, R = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.75;
      var dirV = function (bearing) { var th = (bearing - G.facing) * Math.PI / 180; return { x: -Math.sin(th), z: Math.cos(th) }; };
      for (var k = 0; k < 8; k++) {
        var bd = k * 45 + 22.5, v = dirV(bd);
        var geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(cx, 0.02, cz), new THREE.Vector3(cx + v.x * R, 0.02, cz + v.z * R)]);
        scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7b1fa2 })));
        var vl = dirV(k * 45), pl = label(D8[k], '#7b1fa2', 0.3); pl.position.set(cx + vl.x * R * 0.55, 0.1, cz + vl.z * R * 0.55); scene.add(pl);
      }
      scene.add(at(cyl(0.06, 0.04, mat(0x7b1fa2)), cx, 0.02, cz));
      var fv = dirV(G.facing), arrow = new THREE.ArrowHelper(new THREE.Vector3(fv.x, 0, fv.z), new THREE.Vector3(cx, 0.05, cz), R * 0.9, 0xc62828, 0.35, 0.2);
      scene.add(arrow);
      var fl = label('Facing ' + G.facing + '°', '#c62828', 0.3); fl.position.set(cx + fv.x * R * 0.95, 0.3, cz + fv.z * R * 0.95); scene.add(fl);
    }
    // last ZS/LS check line
    var LO = G.lastOpt;
    if (LO && LO.P && LO.Q) {
      var lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(LO.P.x, 0.6, LO.P.y), new THREE.Vector3(LO.Q.x, 0.6, LO.Q.y)]);
      var ln = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: LO.ok ? 0x2e7d32 : 0xc62828, dashSize: 0.15, gapSize: 0.08 }));
      ln.computeLineDistances(); scene.add(ln);
    }
    return { scene: scene, bb: bb, H: H };
  }

  function render() { if (S && S.renderer) S.renderer.render(S.scene, S.camera); }
  function rebuild() {
    var G = window.XKDGPlanBuilder && XKDGPlanBuilder.geom(S.house);
    if (!G || !G.plan.rooms.length) { S.msg.textContent = 'No rooms in the plan yet — build it first with the assistant.'; return; }
    var B = build(G);
    S.scene = B.scene;
    var cx = (B.bb.x0 + B.bb.x1) / 2, cz = (B.bb.y0 + B.bb.y1) / 2, span = Math.max(B.bb.x1 - B.bb.x0, B.bb.y1 - B.bb.y0, 3);
    S.controls.target.set(cx, 0, cz);
    if (!S.placed) { S.camera.position.set(cx + span * 0.6, span * 1.1, cz + span * 1.2); S.placed = true; }
    S.span = span; S.cx = cx; S.cz = cz;
    S.controls.update(); render();
  }

  function open(houseName) {
    var old = document.getElementById('xp3-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'xp3-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100060;background:#f4f1ea;display:flex;flex-direction:column;';
    var bar = 'padding:6px 10px;border:none;border-radius:6px;font-size:13px;cursor:pointer;';
    ov.innerHTML = '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px 10px;background:#283593;color:#fff;">' +
      '<b style="flex:1;">🧊 3D view' + (houseName ? ' — ' + String(houseName).replace(/</g, '&lt;') : '') + '</b>' +
      '<button id="xp3-top" style="' + bar + 'background:#fff;color:#283593;">⬇ Top</button>' +
      '<button id="xp3-walls" style="' + bar + 'background:#fff;color:#283593;">🧱 Low walls</button>' +
      '<button id="xp3-close" style="' + bar + 'background:#c62828;color:#fff;">✕</button></div>' +
      '<div id="xp3-msg" style="font-size:12px;color:#555;padding:4px 10px;">Loading 3D…</div>' +
      '<div id="xp3-canvas" style="flex:1;position:relative;touch-action:none;"></div>' +
      '<div style="font-size:11px;color:#666;padding:4px 10px;">One finger: rotate · two fingers: zoom / move · purple lines: the 8 palaces from the centre · red arrow: facing · dashed line: last bed–door check (green good, red not)</div>';
    document.body.appendChild(ov);
    S = { house: houseName || null, lowWalls: false, placed: false, msg: ov.querySelector('#xp3-msg') };
    ov.querySelector('#xp3-close').onclick = close;
    ensureThree().then(function () {
      var host = ov.querySelector('#xp3-canvas');
      var w = host.clientWidth || window.innerWidth, h = host.clientHeight || (window.innerHeight - 120);
      S.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      S.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      S.renderer.setSize(w, h); host.appendChild(S.renderer.domElement);
      S.camera = new THREE.PerspectiveCamera(50, w / h, 0.05, 200);
      S.controls = new THREE.OrbitControls(S.camera, S.renderer.domElement);
      S.controls.enableDamping = false; S.controls.maxPolarAngle = Math.PI / 2 - 0.02;
      S.controls.addEventListener('change', render);
      S.msg.textContent = '';
      rebuild();
      ov.querySelector('#xp3-top').onclick = function () { S.camera.position.set(S.cx, S.span * 1.6, S.cz + 0.001); S.controls.update(); render(); };
      ov.querySelector('#xp3-walls').onclick = function () { S.lowWalls = !S.lowWalls; this.textContent = S.lowWalls ? '🧱 Full walls' : '🧱 Low walls'; rebuild(); };
      S.onResize = function () { var W = host.clientWidth, Hh = host.clientHeight; if (!W || !Hh) return; S.renderer.setSize(W, Hh); S.camera.aspect = W / Hh; S.camera.updateProjectionMatrix(); render(); };
      window.addEventListener('resize', S.onResize);
    }).catch(function (e) { S.msg.textContent = '⚠ ' + e.message + ' — the 3D view needs the internet the first time.'; });
    return { open: true };
  }
  function close() {
    var ov = document.getElementById('xp3-ov'); if (ov) ov.remove();
    if (S) { try { window.removeEventListener('resize', S.onResize); S.renderer && S.renderer.dispose(); } catch (e) {} }
    S = null;
  }
  window.XKDGPlan3D = { open: open, close: close, ensureThree: ensureThree, placedItem: placedItem, label: function (a, b, c) { return label(a, b, c); },
    openForHouse: function (key, idx) { var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {}; var h = all[key] && all[key][idx]; return open(h ? h.name : null); } };
})();

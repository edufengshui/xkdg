// ============================================================
// XKDG — room-photo.js  (session 32, Edu: "il mobile inserito nella stanza vera")
// ============================================================
// A real photo of a room + the Plan-builder furniture drawn INTO it, in true
// perspective and true size. The camera is located from the plan:
//   - where the photo was taken: laser distances from two walls (+ phone height)
//   - which way it looks + the lens: tap 1 or 2 known points in the photo
//     (room corners, door / window edges) whose plan position is known.
// The phone is assumed upright and level; tilt / height / turn can be nudged.
// Floor outline + room corners are drawn in cyan, so the user SEES if the
// calibration fits the real room. Photos live in IndexedDB (not in the backup).
// ============================================================
(function () {
  'use strict';
  var RAD = Math.PI / 180;
  function norm(d) { return ((d % 360) + 360) % 360; }
  function angDiff(a, b) { return ((a - b + 540) % 360) - 180; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  var D8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function d8(deg) { return D8[Math.round(norm(deg) / 45) % 8]; }

  // ── IndexedDB for the images ───────────────────────────────
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('xkdg-room-photos', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('p'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function idbPut(k, v) { return idb().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('p', 'readwrite'); tx.objectStore('p').put(v, k); tx.oncomplete = res; tx.onerror = function () { rej(tx.error); }; }); }); }
  function idbGet(k) { return idb().then(function (db) { return new Promise(function (res, rej) { var q = db.transaction('p').objectStore('p').get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); }); }

  // ── plan access ────────────────────────────────────────────
  function G(house) { return window.XKDGPlanBuilder && XKDGPlanBuilder.geom(house); }
  function photoOf(g, room) { var L = g.plan.photos || []; for (var i = 0; i < L.length; i++) if (L[i].room === room) return L[i]; return null; }
  function bearingPQ(facing, P, Q) { return norm(facing + Math.atan2(-(Q.x - P.x), (Q.y - P.y)) / RAD); }
  function refPoints(g, r) {
    var sd = g.sideDirs, pts = [];
    var cn = function (a, b) { return d8(sd[a]) + '–' + d8(sd[b]); };
    pts.push({ k: 'c1', name: 'Corner ' + cn('back', 'xmin'), x: r.x, y: r.y });
    pts.push({ k: 'c2', name: 'Corner ' + cn('back', 'xmax'), x: r.x + r.w, y: r.y });
    pts.push({ k: 'c3', name: 'Corner ' + cn('facing', 'xmin'), x: r.x, y: r.y + r.d });
    pts.push({ k: 'c4', name: 'Corner ' + cn('facing', 'xmax'), x: r.x + r.w, y: r.y + r.d });
    (g.plan.openings || []).forEach(function (o, i) {
      if (o.room !== r.name) return;
      var A = g.wallPoint(r, o.side, o.offset, 0), B = g.wallPoint(r, o.side, o.offset + o.width, 0);
      pts.push({ k: 'o' + i + 'a', name: o.name + ' — edge 1', x: A.x, y: A.y });
      pts.push({ k: 'o' + i + 'b', name: o.name + ' — edge 2', x: B.x, y: B.y });
    });
    return pts;
  }
  function alphaOf(u, hfov) { return Math.atan((2 * u - 1) * Math.tan(hfov * RAD / 2)) / RAD; }
  // calibrate from 1 or 2 taps → yaw (and hfov with 2)
  function calibrate(g, ph, taps) {
    var C = { x: ph.camX, y: ph.camY };
    if (!taps.length) return { error: 'Tap at least one known point.' };
    var b = taps.map(function (t) { return bearingPQ(g.facing, C, t.p); });
    if (taps.length >= 2) {
      var u1 = taps[0].u, u2 = taps[1].u, D = angDiff(b[1], b[0]) * RAD;
      var f = function (t) { return Math.atan((2 * u2 - 1) * t) - Math.atan((2 * u1 - 1) * t) - D; };
      var lo = 0.15, hi = 4, flo = f(lo), fhi = f(hi);
      if (flo * fhi < 0) {
        for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2, fm = f(m); if (fm * flo < 0) { hi = m; } else { lo = m; flo = fm; } }
        ph.hfov = Math.round(2 * Math.atan((lo + hi) / 2) / RAD * 10) / 10;
      } else return { error: 'The two points do not fit (check that you tapped the right ones, left and right).' };
    }
    ph.yaw = norm(b[0] - alphaOf(taps[0].u, ph.hfov));
    ph.calibrated = true;
    return { yaw: Math.round(ph.yaw * 10) / 10, hfov: ph.hfov };
  }

  // ── view state ─────────────────────────────────────────────
  var S = null;

  function render() {
    if (!S || !S.renderer || !S.ph || !S.ph.calibrated) return;
    var g = G(S.house); if (!g) return;
    var r = g.findRoom(S.room); if (!r) return;
    var ph = S.ph, W = S.img.naturalWidth, H = S.img.naturalHeight, aspect = W / H;
    var scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    var dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(2, 6, 3); scene.add(dl);
    // room outline (floor rectangle + vertical corners) in cyan, to check the calibration
    var Hc = g.plan.height_m || 2.7, cyan = new THREE.LineBasicMaterial({ color: 0x00e5ff });
    var c = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.d], [r.x, r.y + r.d]];
    var floor = c.map(function (p) { return new THREE.Vector3(p[0], 0.005, p[1]); }); floor.push(floor[0].clone());
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(floor), cyan));
    c.forEach(function (p) { scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p[0], 0, p[1]), new THREE.Vector3(p[0], Hc, p[1])]), cyan)); });
    (g.plan.openings || []).forEach(function (o) {
      if (o.room !== r.name) return;
      var A = g.wallPoint(r, o.side, o.offset, 0), B = g.wallPoint(r, o.side, o.offset + o.width, 0);
      var sill = o.kind === 'window' ? (o.sill != null ? o.sill : 0.9) : 0, oh = o.height || (o.kind === 'window' ? 1.2 : 2.1);
      var pts = [[A, sill], [A, sill + oh], [B, sill + oh], [B, sill], [A, sill]].map(function (q) { return new THREE.Vector3(q[0].x, q[1], q[0].y); });
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffd600 })));
    });
    // furniture of this room
    (g.plan.items || []).forEach(function (it) {
      if (it.room !== r.name) return;
      scene.add(XKDGPlan3D.placedItem(g, it, { opacity: it.trial ? 0.8 : (S.showAll ? 0.85 : 0) }));
    });
    // last bed-door line
    var LO = g.lastOpt;
    if (LO && LO.P && LO.Q) {
      var ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(LO.P.x, 0.6, LO.P.y), new THREE.Vector3(LO.Q.x, 0.6, LO.Q.y)]),
        new THREE.LineDashedMaterial({ color: LO.ok ? 0x00c853 : 0xff1744, dashSize: 0.12, gapSize: 0.06 }));
      ln.computeLineDistances(); scene.add(ln);
    }
    var vfov = 2 * Math.atan(Math.tan(ph.hfov * RAD / 2) / aspect) / RAD;
    var cam = new THREE.PerspectiveCamera(vfov, aspect, 0.05, 100);
    cam.position.set(ph.camX, ph.camH, ph.camY);
    var th = (ph.yaw - g.facing) * RAD, p = (ph.pitch || 0) * RAD;
    cam.lookAt(ph.camX - Math.sin(th) * Math.cos(p), ph.camH + Math.sin(p), ph.camY + Math.cos(th) * Math.cos(p));
    S.renderer.render(scene, cam);
  }

  function sizeOverlay() {
    if (!S || !S.renderer) return;
    var w = S.img.clientWidth, h = S.img.clientHeight; if (!w || !h) return;
    S.renderer.setPixelRatio(S.img.naturalWidth / w);
    S.renderer.setSize(w, h);
    render();
  }

  function setupRenderer() {
    var holder = S.ov.querySelector('#xrp-stage');
    S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    S.renderer.setClearColor(0x000000, 0);
    var cv = S.renderer.domElement; cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
    holder.appendChild(cv);
    sizeOverlay();
  }

  function ui() {
    var g = G(S.house), r = g && g.findRoom(S.room);
    var box = S.ov.querySelector('#xrp-panel'); if (!box || !g || !r) return;
    var ph = S.ph, sd = g.sideDirs;
    var sel = function (id, opts, cur) { return '<select id="' + id + '" style="font-size:13px;padding:3px;">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
    var inp = function (id, v, w) { return '<input id="' + id + '" type="number" step="0.01" value="' + (v != null ? v : '') + '" style="width:' + (w || 70) + 'px;font-size:13px;padding:3px;">'; };
    var h = '';
    if (!S.img) {
      h += '<div style="margin:6px 0;"><b>1.</b> Take the photo standing still, phone <b>upright and level</b>, then load it: ' +
        '<input type="file" id="xrp-file" accept="image/*" style="font-size:13px;"></div>';
    } else {
      var w1 = ph.w1 || 'back', w2 = ph.w2 || 'xmin';
      h += '<div style="margin:4px 0;"><b>1. Where you stood</b> (laser): ' +
        inp('xrp-d1', ph.d1) + ' m from the wall toward ' + sel('xrp-w1', [['back', sd.back + '° ' + d8(sd.back)], ['facing', sd.facing + '° ' + d8(sd.facing)]], w1) + ' · ' +
        inp('xrp-d2', ph.d2) + ' m from the wall toward ' + sel('xrp-w2', [['xmin', sd.xmin + '° ' + d8(sd.xmin)], ['xmax', sd.xmax + '° ' + d8(sd.xmax)]], w2) + ' · phone height ' + inp('xrp-h', ph.camH != null ? ph.camH : 1.5, 60) + ' m · lens ' +
        sel('xrp-lens', [['main', '1× main'], ['wide', '0.5× wide']], ph.lens || 'main') + '</div>';
      var refs = refPoints(g, r);
      h += '<div style="margin:4px 0;"><b>2. Calibrate</b>: choose a point, then tap it in the photo (best two points, far apart, left and right): ' +
        sel('xrp-ref', refs.map(function (p) { return [p.k, esc(p.name)]; }), S.refK || refs[0].k) +
        ' <span id="xrp-taps" style="color:#2e7d32;">' + S.taps.map(function (t) { return '✓ ' + esc(t.name); }).join(' · ') + '</span>' +
        ' <button id="xrp-clear" style="font-size:12px;">↺ Clear taps</button></div>';
      h += '<div style="margin:4px 0;"><b>3. Check</b>: the <span style="color:#00acc1;font-weight:bold;">cyan lines</span> must lie on the real floor edges and corners. Fine-tune: ' +
        'turn <button data-n="yaw,-0.5">◀</button><button data-n="yaw,0.5">▶</button> · tilt <button data-n="pitch,-0.5">▼</button><button data-n="pitch,0.5">▲</button> · height <button data-n="camH,-0.02">−</button><button data-n="camH,0.02">+</button>' +
        ' <span style="color:#777;">(' + (ph.calibrated ? 'turn ' + Math.round(ph.yaw * 10) / 10 + '° · lens ' + ph.hfov + '° · tilt ' + (ph.pitch || 0) + '° · h ' + ph.camH + ' m' : 'not calibrated yet') + ')</span></div>';
      var items = (g.plan.items || []).filter(function (it) { return it.room === r.name; });
      h += '<div style="margin:4px 0;"><b>4. Furniture</b>: ' + (items.length ? sel('xrp-item', items.map(function (it) { return [it.name, esc(it.name) + (it.trial ? ' (in prova)' : '')]; }), S.itemN || items[0].name) +
        ' move along its wall <button data-m="-0.05">◀ 5 cm</button><button data-m="0.05">5 cm ▶</button>' : '<i>no furniture in this room yet — ask the assistant</i>') +
        ' <label style="font-size:12px;"><input type="checkbox" id="xrp-all"' + (S.showAll ? ' checked' : '') + '> show the existing furniture too</label>' +
        ' <button id="xrp-save" style="font-size:12px;">📥 Save image</button></div>';
    }
    box.innerHTML = h;
    var $ = function (id) { return box.querySelector('#' + id); };
    if ($('xrp-file')) $('xrp-file').onchange = function () { loadFile(this.files && this.files[0]); };
    if (!S.img) return;
    var upd = function () {
      ph.d1 = parseFloat($('xrp-d1').value); ph.d2 = parseFloat($('xrp-d2').value);
      ph.w1 = $('xrp-w1').value; ph.w2 = $('xrp-w2').value; ph.camH = parseFloat($('xrp-h').value) || 1.5;
      var lens = $('xrp-lens').value; if (lens !== ph.lens) { ph.lens = lens; ph.hfov = defHfov(lens); }
      if (isFinite(ph.d1)) ph.camY = ph.w1 === 'back' ? r.y + ph.d1 : r.y + r.d - ph.d1;
      if (isFinite(ph.d2)) ph.camX = ph.w2 === 'xmin' ? r.x + ph.d2 : r.x + r.w - ph.d2;
      if (S.taps.length && isFinite(ph.camX) && isFinite(ph.camY)) calibrate(g, ph, S.taps);
      persist(); ui(); render();
    };
    ['xrp-d1', 'xrp-d2', 'xrp-w1', 'xrp-w2', 'xrp-h', 'xrp-lens'].forEach(function (id) { $(id).onchange = upd; });
    $('xrp-ref').onchange = function () { S.refK = this.value; };
    $('xrp-clear').onclick = function () { S.taps = []; ph.calibrated = false; ph.hfov = defHfov(ph.lens || 'main'); persist(); ui(); render(); S.renderer && S.renderer.clear(); };
    box.querySelectorAll('button[data-n]').forEach(function (b) {
      b.onclick = function () { var a = this.dataset.n.split(','); ph[a[0]] = Math.round(((+ph[a[0]] || 0) + +a[1]) * 100) / 100; if (a[0] === 'yaw') ph.yaw = norm(ph.yaw); persist(); ui(); render(); };
    });
    if ($('xrp-item')) $('xrp-item').onchange = function () { S.itemN = this.value; };
    box.querySelectorAll('button[data-m]').forEach(function (b) {
      b.onclick = function () {
        var nm = $('xrp-item').value, it = (g.plan.items || []).filter(function (x) { return x.name === nm; })[0]; if (!it) return;
        var res = XKDGPlanBuilder.item({ house_name: S.house, action: 'update', name: nm, offset_m: Math.round((it.offset + +this.dataset.m) * 100) / 100 });
        if (res && res.error) { alert(res.error); return; }
        S.itemN = nm; ui(); render();
      };
    });
    if ($('xrp-all')) $('xrp-all').onchange = function () { S.showAll = this.checked; render(); };
    if ($('xrp-save')) $('xrp-save').onclick = saveImage;
  }
  function defHfov(lens) {
    // portrait photos: 26 mm main ≈ 49.6° wide, 13 mm ultra-wide ≈ 85°; landscape: 69.4° / 108°
    var portrait = S && S.img && S.img.naturalHeight > S.img.naturalWidth;
    if (lens === 'wide') return portrait ? 85 : 108;
    return portrait ? 49.6 : 69.4;
  }
  function persist() {
    var rec = {}; for (var key in S.ph) if (key !== 'img') rec[key] = S.ph[key];
    rec.room = S.room;
    rec.taps = S.taps.map(function (t) { return { k: t.k, name: t.name, u: t.u, p: t.p }; });
    XKDGPlanBuilder.savePhoto(S.house, rec);
  }
  function loadFile(file) {
    if (!file) return;
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var M = 1600, k = Math.min(1, M / Math.max(im.width, im.height));
        var c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        var data = c.toDataURL('image/jpeg', 0.82);
        S.ph.id = S.ph.id || ('rp-' + Date.now());
        idbPut(S.ph.id, data).then(function () { showImage(data); }).catch(function (e) { alert('Could not store the photo: ' + e.message); });
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
  function showImage(data) {
    var stage = S.ov.querySelector('#xrp-stage');
    stage.innerHTML = '';
    var im = new Image(); im.style.cssText = 'display:block;width:100%;height:auto;user-select:none;';
    im.onload = function () {
      S.img = im;
      if (!S.ph.hfov) { S.ph.lens = S.ph.lens || 'main'; S.ph.hfov = defHfov(S.ph.lens); }
      persist(); ui(); setupRenderer();
    };
    im.onclick = function (e) {
      var g = G(S.house), r = g && g.findRoom(S.room); if (!r) return;
      if (!isFinite(S.ph.camX) || !isFinite(S.ph.camY)) { alert('First enter where you stood (the two laser distances).'); return; }
      var rect = im.getBoundingClientRect(), u = (e.clientX - rect.left) / rect.width;
      var key = (S.ov.querySelector('#xrp-ref') || {}).value, ref = refPoints(g, r).filter(function (p) { return p.k === key; })[0];
      if (!ref) return;
      S.taps = S.taps.filter(function (t) { return t.k !== ref.k; });
      S.taps.push({ k: ref.k, name: ref.name, u: u, p: { x: ref.x, y: ref.y } });
      if (S.taps.length > 2) S.taps.shift();
      var res = calibrate(g, S.ph, S.taps);
      if (res.error) alert(res.error);
      persist(); ui(); render();
    };
    im.src = data; stage.appendChild(im);
  }
  function saveImage() {
    if (!S || !S.img) return;
    render();
    var c = document.createElement('canvas'); c.width = S.img.naturalWidth; c.height = S.img.naturalHeight;
    var gx = c.getContext('2d'); gx.drawImage(S.img, 0, 0, c.width, c.height);
    try { gx.drawImage(S.renderer.domElement, 0, 0, c.width, c.height); } catch (e) {}
    var a = document.createElement('a'); a.href = c.toDataURL('image/jpeg', 0.9); a.download = 'xkdg-room-' + S.room.replace(/\W+/g, '_') + '.jpg';
    document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000);
  }

  function open(house, room) {
    var g = G(house);
    if (!g) { alert('No house / plan found.'); return { error: 'No house / plan found.' }; }
    if (!room) room = g.plan.rooms.length ? g.plan.rooms[0].name : null;
    var r = room && g.findRoom(room);
    if (!r) return { error: 'No room named "' + room + '" in the plan. Rooms: ' + g.plan.rooms.map(function (x) { return x.name; }).join(', ') };
    close();
    var ov = document.createElement('div'); ov.id = 'xrp-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100060;background:#263238;overflow:auto;';
    ov.innerHTML = '<div style="display:flex;gap:6px;align-items:center;padding:8px 10px;background:#00695c;color:#fff;position:sticky;top:0;z-index:2;">' +
      '<b style="flex:1;">📷 Room photo — ' + esc(r.name) + '</b>' +
      '<select id="xrp-room" style="font-size:13px;">' + g.plan.rooms.map(function (x) { return '<option' + (x.name === r.name ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' +
      '<button id="xrp-close" style="background:#c62828;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;">✕</button></div>' +
      '<div id="xrp-stage" style="position:relative;max-width:1000px;margin:0 auto;"></div>' +
      '<div id="xrp-panel" style="background:#fff;max-width:1000px;margin:0 auto;padding:8px 10px;font-size:13px;line-height:1.7;"></div>';
    document.body.appendChild(ov);
    var saved = photoOf(g, r.name) || { room: r.name };
    S = { house: house || null, room: r.name, ov: ov, ph: JSON.parse(JSON.stringify(saved)), taps: (saved.taps || []).slice(), img: null, showAll: true };
    ov.querySelector('#xrp-close').onclick = close;
    ov.querySelector('#xrp-room').onchange = function () { open(house, this.value); };
    S.onResize = function () { sizeOverlay(); };
    window.addEventListener('resize', S.onResize);
    ui();
    XKDGPlan3D.ensureThree().then(function () {
      if (S.ph.id) idbGet(S.ph.id).then(function (d) { if (d) showImage(d); else { S.ph.id = null; ui(); } });
    }).catch(function (e) { S.ov.querySelector('#xrp-panel').insertAdjacentHTML('afterbegin', '<div style="color:#c62828;">⚠ ' + esc(e.message) + ' — needs the internet the first time.</div>'); });
    return { open: true, room: r.name, has_photo: !!saved.id, calibrated: !!saved.calibrated };
  }
  function close() {
    var ov = document.getElementById('xrp-ov'); if (ov) ov.remove();
    if (S) { try { window.removeEventListener('resize', S.onResize); S.renderer && S.renderer.dispose(); } catch (e) {} }
    S = null;
  }
  function state(house, room) {
    var g = G(house); if (!g) return { error: 'No house / plan found.' };
    var out = (g.plan.photos || []).map(function (p) {
      return { room: p.room, has_photo: !!p.id, stood_at: (p.d1 != null && p.d2 != null) ? p.d1 + ' m from wall ' + g.sideDirs[p.w1 || 'back'] + '°, ' + p.d2 + ' m from wall ' + g.sideDirs[p.w2 || 'xmin'] + '°' : null,
               phone_height_m: p.camH, calibrated: !!p.calibrated, taps: (p.taps || []).map(function (t) { return t.name; }),
               looking_toward_deg: p.calibrated ? Math.round(p.yaw) : null, lens_deg: p.hfov };
    });
    if (room) out = out.filter(function (p) { return p.room === room; });
    return { photos: out, rooms: g.plan.rooms.map(function (r) { return r.name; }) };
  }
  window.XKDGRoomPhoto = { open: open, close: close, state: state,
    openForHouse: function (key, idx) { var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {}; var h = all[key] && all[key][idx]; return open(h ? h.name : null); } };
})();

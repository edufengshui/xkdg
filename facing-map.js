/* ============================================================================
 *  facing-map.js  —  XKDG "Measure facing on map" tool
 *
 *  Measure a house/door facing from satellite imagery + OSM building outlines,
 *  then convert the geographic (true-north) azimuth to the MAGNETIC facing the
 *  luopan needs, by subtracting the WMM2025 magnetic declination (geomag.js).
 *
 *    magnetic_facing = (true_facing − declination + 360) mod 360     (East decl +)
 *
 *  Method A: trace the facing WALL (two points / one OSM polygon edge); the
 *  facing (向) is the PERPENDICULAR to that wall, on the outward side.
 *
 *  Requires: Leaflet (window.L) and window.XKDGGeoMag (geomag.js).
 *  Public:   XKDGFacingMap.open({ lat, lng, address, target, onResult })
 *            onResult(magneticDeg, info) is called when the user confirms.
 * ========================================================================== */
(function () {
  'use strict';

  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var ESRI_ATTR = 'Imagery © Esri';
  function overpassUrl(){
    return (typeof window !== 'undefined' && window.TP_OVERPASS_URL)
      ? window.TP_OVERPASS_URL : 'https://xkdg-overpass.decumano16.workers.dev';
  }

  // 24 mountains, index 0 = 子 (N) centred on 0°, clockwise, 15° each.
  var MOUNTAINS = ['子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙',
                   '午','丁','未','坤','申','庚','酉','辛','戌','乾','亥','壬'];
  var DIR8 = ['N','NE','E','SE','S','SW','W','NW'];

  function toRad(d){ return d * Math.PI / 180; }
  function toDeg(r){ return r * 180 / Math.PI; }
  function norm360(d){ return ((d % 360) + 360) % 360; }

  // Initial (true-north) bearing from point 1 to point 2, degrees 0..360.
  function bearing(lat1, lng1, lat2, lng2){
    var p1 = toRad(lat1), p2 = toRad(lat2), dl = toRad(lng2 - lng1);
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return norm360(toDeg(Math.atan2(y, x)));
  }
  function mountainOf(deg){
    var i = Math.round(norm360(deg) / 15) % 24;
    return MOUNTAINS[i];
  }
  function dir8Of(deg){
    return DIR8[Math.round(norm360(deg) / 45) % 8];
  }

  // ---- DOM helpers ----
  function el(tag, css, html){
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var STATE = null;

  function close(){
    if (STATE && STATE.root && STATE.root.parentNode) STATE.root.parentNode.removeChild(STATE.root);
    if (STATE && STATE.map){ try { STATE.map.remove(); } catch(e){} }
    STATE = null;
  }

  function open(opts){
    opts = opts || {};
    if (typeof window.L === 'undefined'){
      alert('Map library (Leaflet) not loaded. Add it in index.html.');
      return;
    }
    close();

    var root = el('div', 'position:fixed;inset:0;z-index:100000;background:#0b1020;display:flex;flex-direction:column;font-family:inherit;color:#eee;');
    // Top bar
    var bar = el('div', 'display:flex;align-items:center;gap:8px;padding:8px 10px;background:#11182e;border-bottom:1px solid #2a3556;flex-wrap:wrap;');
    bar.appendChild(el('div', 'font-weight:bold;font-size:14px;color:#ffd479;', '📍 Measure facing'));
    var search = el('input', 'flex:1;min-width:160px;padding:6px 8px;border:1px solid #2a3556;border-radius:6px;background:#0b1020;color:#eee;font-size:13px;');
    search.placeholder = 'Search address… (then Enter)';
    bar.appendChild(search);
    var btnClose = el('button', 'background:#3a2030;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:bold;', '✕ Close');
    btnClose.onclick = close;
    bar.appendChild(btnClose);
    root.appendChild(bar);

    // Map
    var mapDiv = el('div', 'flex:1;min-height:0;');
    root.appendChild(mapDiv);

    // Bottom panel
    var panel = el('div', 'background:#11182e;border-top:1px solid #2a3556;padding:10px 12px;');
    var instructions = el('div', 'font-size:12px;color:#9fb0d6;margin-bottom:8px;',
      'Tap a <b>building edge</b> (OSM outline) on the <b>facing wall</b> — or tap two points along the wall. The facing (向) is the <b>perpendicular</b>, outward.');
    panel.appendChild(instructions);

    var readout = el('div', 'display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:13px;margin-bottom:8px;');
    panel.appendChild(readout);

    var controls = el('div', 'display:flex;gap:8px;flex-wrap:wrap;');
    var btnFlip = el('button', 'background:#23314f;color:#fff;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;font-size:13px;', '↔ Flip outward side');
    var btnClear = el('button', 'background:#23314f;color:#fff;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;font-size:13px;', '🗑 Clear line');
    var btnUse = el('button', 'background:#1d7a3a;color:#fff;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:bold;font-size:13px;margin-left:auto;', '✓ Use this facing');
    controls.appendChild(btnFlip); controls.appendChild(btnClear); controls.appendChild(btnUse);
    panel.appendChild(controls);
    root.appendChild(panel);

    document.body.appendChild(root);

    // ---- Leaflet ----
    var startLat = parseFloat(opts.lat), startLng = parseFloat(opts.lng);
    var hasStart = isFinite(startLat) && isFinite(startLng);
    var map = window.L.map(mapDiv, { zoomControl: true, attributionControl: true })
      .setView(hasStart ? [startLat, startLng] : [20, 0], hasStart ? 19 : 3);
    window.L.tileLayer(ESRI, { maxZoom: 21, maxNativeZoom: 19, attribution: ESRI_ATTR }).addTo(map);

    STATE = { root: root, map: map, p1: null, p2: null, side: +1,
              wallLine: null, facingArrow: null, mk1: null, mk2: null,
              buildings: null, onResult: opts.onResult, target: opts.target };

    if (hasStart){
      window.L.circleMarker([startLat, startLng], { radius: 4, color: '#ffd479', weight: 2, fillOpacity: 1 })
        .addTo(map).bindTooltip('address', { permanent: false });
    }

    // ---- buildings overlay (OSM via Overpass worker) ----
    function loadBuildings(){
      if (map.getZoom() < 17) return;
      var b = map.getBounds();
      var bbox = b.getSouth().toFixed(5) + ',' + b.getWest().toFixed(5) + ',' +
                 b.getNorth().toFixed(5) + ',' + b.getEast().toFixed(5);
      var q = '[out:json][timeout:25];way["building"](' + bbox + ');out geom;';
      fetch(overpassUrl(), { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
                          body:'data=' + encodeURIComponent(q) })
        .then(function(r){ return r.json(); })
        .then(function(j){
          if (STATE && STATE.buildings){ map.removeLayer(STATE.buildings); STATE.buildings = null; }
          var grp = window.L.layerGroup();
          (j.elements || []).forEach(function(w){
            if (!w.geometry || w.geometry.length < 3) return;
            var pts = w.geometry.map(function(g){ return [g.lat, g.lon]; });
            var poly = window.L.polygon(pts, { color:'#ffd479', weight:1.5, fillOpacity:0.05, opacity:0.85 });
            poly.on('click', function(ev){ window.L.DomEvent.stop(ev); pickEdge(pts, ev.latlng); });
            grp.addLayer(poly);
          });
          grp.addTo(map);
          STATE.buildings = grp;
        })
        .catch(function(){ /* offline / no data → manual two-point mode still works */ });
    }
    map.on('moveend', loadBuildings);
    loadBuildings();

    // ---- picking ----
    // Distance (m, approx) from a point to a segment, for nearest-edge selection.
    function segDistM(plat, plng, alat, alng, blat, blng){
      var k = Math.cos(toRad(plat));
      var px = plng * k, py = plat, ax = alng * k, ay = alat, bx = blng * k, by = blat;
      var dx = bx - ax, dy = by - ay, L2 = dx*dx + dy*dy;
      var t = L2 ? (((px-ax)*dx + (py-ay)*dy) / L2) : 0;
      t = Math.max(0, Math.min(1, t));
      var cx = ax + t*dx, cy = ay + t*dy;
      var ddx = (px-cx)/k, ddy = py-cy;
      return Math.sqrt(ddx*ddx + ddy*ddy) * 111320;
    }
    function pickEdge(pts, clickLatLng){
      var best = null, bestD = Infinity;
      for (var i = 0; i < pts.length - 1; i++){
        var a = pts[i], b = pts[i+1];
        var d = segDistM(clickLatLng.lat, clickLatLng.lng, a[0], a[1], b[0], b[1]);
        if (d < bestD){ bestD = d; best = [a, b]; }
      }
      if (best){ setLine({lat:best[0][0], lng:best[0][1]}, {lat:best[1][0], lng:best[1][1]}); }
    }

    // free two-point mode
    map.on('click', function(ev){
      if (!STATE.p1){ setPoint1(ev.latlng); }
      else if (!STATE.p2){ setLine(STATE.p1, ev.latlng); }
      else { clearLine(); setPoint1(ev.latlng); }
    });

    function setPoint1(ll){
      STATE.p1 = { lat: ll.lat, lng: ll.lng }; STATE.p2 = null;
      if (STATE.mk1) map.removeLayer(STATE.mk1);
      STATE.mk1 = window.L.circleMarker([ll.lat, ll.lng], { radius:5, color:'#4da6ff', weight:2, fillOpacity:1 }).addTo(map);
      render();
    }
    function setLine(a, b){
      STATE.p1 = { lat:a.lat, lng:a.lng }; STATE.p2 = { lat:b.lat, lng:b.lng };
      render();
    }
    function clearLine(){
      STATE.p1 = STATE.p2 = null;
      [ 'wallLine','facingArrow','mk1','mk2' ].forEach(function(k){ if (STATE[k]){ map.removeLayer(STATE[k]); STATE[k] = null; } });
      render();
    }

    function render(){
      [ 'wallLine','facingArrow','mk2','arrowTip' ].forEach(function(k){ if (STATE[k]){ map.removeLayer(STATE[k]); STATE[k] = null; } });
      if (STATE.p1 && STATE.mk1){ /* keep */ }

      if (!STATE.p1 || !STATE.p2){
        readout.innerHTML = '<span style="color:#9fb0d6;">Trace the facing wall…</span>';
        return;
      }
      var a = STATE.p1, b = STATE.p2;
      var midLat = (a.lat + b.lat) / 2, midLng = (a.lng + b.lng) / 2;
      var wallAz = bearing(a.lat, a.lng, b.lat, b.lng);
      var facingTrue = norm360(wallAz + 90 * STATE.side);
      // declination at the facade midpoint, for today
      var decl = 0, declOk = false;
      try { if (window.XKDGGeoMag){ decl = window.XKDGGeoMag.declination(midLat, midLng, new Date()); declOk = true; } } catch(e){}
      var facingMag = norm360(facingTrue - decl);

      // draw wall + facing arrow
      STATE.wallLine = window.L.polyline([[a.lat,a.lng],[b.lat,b.lng]], { color:'#4da6ff', weight:4, opacity:0.95 }).addTo(map);
      if (STATE.mk2) map.removeLayer(STATE.mk2);
      STATE.mk2 = window.L.circleMarker([b.lat,b.lng], { radius:5, color:'#4da6ff', weight:2, fillOpacity:1 }).addTo(map);
      // arrow: from midpoint outward ~ 60% of wall length
      var dLat = (b.lat - a.lat), dLng = (b.lng - a.lng);
      var wallLen = Math.sqrt(dLat*dLat + dLng*dLng);
      var arrowLen = wallLen * 0.6 || 0.0006;
      var fr = toRad(facingTrue);
      var k = Math.cos(toRad(midLat));
      var tipLat = midLat + arrowLen * Math.cos(fr);
      var tipLng = midLng + arrowLen * Math.sin(fr) / (k || 1);
      STATE.facingArrow = window.L.polyline([[midLat,midLng],[tipLat,tipLng]], { color:'#ff5a8a', weight:4, opacity:0.95 }).addTo(map);
      STATE.arrowTip = window.L.circleMarker([tipLat,tipLng], { radius:4, color:'#ff5a8a', weight:2, fillOpacity:1 }).addTo(map);

      readout.innerHTML =
        '<span>Wall: <b style="color:#4da6ff;">' + wallAz.toFixed(1) + '°</b></span>' +
        '<span>Facing (true): <b>' + facingTrue.toFixed(1) + '°</b></span>' +
        '<span>Declination: <b style="color:' + (declOk?'#ffd479':'#ff6b6b') + ';">' + (decl>=0?'+':'') + decl.toFixed(2) + '°' + (declOk?'':' (n/a)') + '</b></span>' +
        '<span style="font-size:15px;">Facing (magnetic): <b style="color:#7CFC9A;">' + facingMag.toFixed(1) + '°</b></span>' +
        '<span>≈ <b>' + mountainOf(facingMag) + '</b> (' + dir8Of(facingMag) + ')</span>';

      STATE._result = facingMag;
    }

    btnFlip.onclick = function(){ STATE.side = -STATE.side; render(); };
    btnClear.onclick = clearLine;
    btnUse.onclick = function(){
      if (STATE._result == null){ alert('Trace the facing wall first.'); return; }
      var r = STATE._result, t = STATE.target, cb = STATE.onResult;
      close();
      if (typeof cb === 'function') cb(r, { target: t });
    };

    // ---- address search (Nominatim) ----
    function doSearch(){
      var q = (search.value || '').trim();
      if (!q) return;
      fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q),
            { headers: { 'Accept':'application/json' } })
        .then(function(r){ return r.json(); })
        .then(function(arr){
          if (arr && arr[0]){ map.setView([parseFloat(arr[0].lat), parseFloat(arr[0].lon)], 19); }
          else alert('Address not found.');
        })
        .catch(function(){ alert('Search failed (offline?).'); });
    }
    search.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); doSearch(); } });

    if (opts.address && !hasStart){ search.value = opts.address; doSearch(); }
    render();
  }

  window.XKDGFacingMap = { open: open };
})();

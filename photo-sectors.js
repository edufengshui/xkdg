// ============================================================
// XKDG — photo-sectors.js  (session 31)
// ============================================================
// "📷 Photo sectors" in each house card: take/choose a photo shot from the
// facing point (bed, door…), and the app draws the hexagram sectors of the
// water candidates on it as red boxes — the same geometry Edu verified by hand.
//
// Geometry (rectilinear photo):
//   f_px      = (W/2) * f35 / (w35/2),  w35 = 43.27mm * W / hypot(W,H)
//   bearing   = centre + atan((x - W/2) / f_px)
//   x(bearing)= W/2 + f_px * tan(bearing - centre)
// The photo CENTRE direction is the weak point (indoor compasses drift), so it
// can be calibrated. The only reliable data is the HOUSE facing, and every wall is
// that degree or ±90/180 (Edu). So the main calibration is "align to a wall": the
// user traces two horizontal edges of one wall (skirting + ceiling line); their
// vanishing point is the wall's direction, i.e. house facing + k·90°. One wall
// fixes the centre; two walls at 90° (or any 2+ references) also fix the focal.
// A tapped point read with a compass is accepted too, CORRECTED by the compass's
// indoor error (Edu): read the facing with the same compass from the same spot,
// the difference from the real facing is the correction applied to every reading.
//
// Water rules come from app-fengshui.js (fsWaterMatchVsFacing / fsWaterScore):
// Ling Shen only, within ±FS_WATER_MAX_DEG of the facing, a yun link (Hetu or
// adding to exactly 10) or a family shared with the facing. People count by the
// YEAR pillar, then the DAY pillar; month and hour never count (Edu).
// Layers (session 31): water hexagram boxes, the EIGHT directions (boundaries at
// 22.5° + k·45°, Later-Heaven trigrams) and the 24 mountains (boundaries at 7.5° + k·15°).
// For the 8 directions the photo must be taken from the CENTRE of the house.
// window.XKDGPhotoSectors is also the hook for the AI assistant (option C).
// ============================================================
(function () {
  'use strict';

  var DIAG35 = 43.267;
  var S = null;          // state of the open dialog

  // ── small helpers ──────────────────────────────────────────
  function norm(d) { return ((d % 360) + 360) % 360; }
  function angDiff(a, b) { return ((a - b + 540) % 360) - 180; }      // a-b in (-180,180]
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function el(id) { return document.getElementById(id); }

  // ── EXIF: 35mm-equivalent focal length, focal length, make/model ──
  function readExif(buf) {
    try {
      var v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return null;
      var off = 2;
      while (off + 4 < v.byteLength) {
        var marker = v.getUint16(off), len = v.getUint16(off + 2);
        if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10);
        if ((marker & 0xFF00) !== 0xFF00) break;
        off += 2 + len;
      }
    } catch (e) {}
    return null;
  }
  function parseTiff(v, t) {
    var le = v.getUint16(t) === 0x4949;
    var u16 = function (o) { return v.getUint16(o, le); }, u32 = function (o) { return v.getUint32(o, le); };
    var out = {};
    function str(o, n) { var s = ''; for (var i = 0; i < n; i++) { var c = v.getUint8(o + i); if (!c) break; s += String.fromCharCode(c); } return s.trim(); }
    function ifd(o, cb) {
      var n = u16(o);
      for (var i = 0; i < n; i++) {
        var e = o + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), vo = e + 8;
        cb(tag, type, cnt, vo);
      }
    }
    var exifPtr = null;
    ifd(t + u32(t + 4), function (tag, type, cnt, vo) {
      if (tag === 0x8769) exifPtr = u32(vo);
      if (tag === 0x010F || tag === 0x0110) out[tag === 0x010F ? 'make' : 'model'] = str(cnt > 4 ? t + u32(vo) : vo, cnt);
    });
    if (exifPtr != null) ifd(t + exifPtr, function (tag, type, cnt, vo) {
      if (tag === 0xA405) out.f35 = u16(vo);
      if (tag === 0x920A) { var p = t + u32(vo); var d = u32(p + 4); if (d) out.focal = u32(p) / d; }
    });
    return out;
  }

  // ── people of the house: year (first) + day (second) pillars ──
  function personPillars(name) {
    try {
      var a = loadArchive('xkdg_persons_a') || {}, b = loadArchive('xkdg_persons_b') || {};
      var rec = a[name] || b[name]; if (!rec) return null;
      var out = { name: name };
      if (rec.date && rec.depth !== 1 && typeof _tstPillarsFor === 'function') {
        var geo;
        if (isFinite(rec.birthLon)) geo = { lon: rec.birthLon, tz: -(((rec.birthUtc || 0) * 60) + (rec.birthDst ? 60 : 0)) };
        var P = _tstPillarsFor(rec.date, rec.time || '12:00', geo);
        if (P) { out.year = P.year; out.day = P.day; }
      }
      if (!out.year && rec.jiaZiYear && rec.jiaZiYear.length >= 2) out.year = rec.jiaZiYear.slice(0, 2);
      ['year', 'day'].forEach(function (k) {
        if (out[k] && typeof XKDG_TABLE !== 'undefined' && XKDG_TABLE[out[k]]) out[k + 'Hex'] = XKDG_TABLE[out[k]].hex;
      });
      return out.yearHex ? out : null;
    } catch (e) { return null; }
  }
  function housePeople(h, key) {
    var names = [];
    var add = function (n) { if (n && names.indexOf(n) < 0) names.push(n); };
    add(h.personName || key);
    if (h.guest && h.guest.name) add(h.guest.name);
    (Array.isArray(h.guests) ? h.guests : []).forEach(add);
    return names.map(personPillars).filter(Boolean);
  }

  // ── hexagram links ─────────────────────────────────────────
  function qy(h) { try { return fsQiYun(h); } catch (e) { return null; } }
  function fams(h) { try { return getHexFamilies(h) || []; } catch (e) { return []; } }
  function links(h1, h2, facingWater) {
    var a = qy(h1), b = qy(h2), out = []; if (!a || !b) return out;
    if (isHetuPair(a.yun, b.yun)) out.push('Hetu yun');
    if (facingWater ? a.yun + b.yun === 10 : [5, 10, 15].indexOf(a.yun + b.yun) >= 0) out.push('Adding yun ' + (a.yun + b.yun));
    else if (facingWater && (b.yun === 1 || b.yun === 9) && (a.yun + b.yun === 5 || a.yun + b.yun === 15)) out.push('Adding yun ' + (a.yun + b.yun) + ' (1/9 exception)');
    if (isHetuPair(a.qi, b.qi)) out.push('Hetu qi');
    if (facingWater ? a.qi + b.qi === 10 : [5, 10, 15].indexOf(a.qi + b.qi) >= 0) out.push('Adding qi ' + (a.qi + b.qi));   // FS pairs: only 10
    var fb = fams(h2); fams(h1).forEach(function (f) { if (fb.indexOf(f) >= 0) out.push('Family ' + f); });
    return out;
  }
  // Pure Yin / Pure Yang sub-range of a water sector against the facing (Di Pan facing,
  // Tien Pan water — same convention as fsYinYangMatch).
  function yinYangRange(facingDeg, a, b) {
    if (typeof fsMountainYangDi !== 'function' || typeof fsMountainYangTien !== 'function') return null;
    var fy = fsMountainYangDi(facingDeg), lo = null, hi = null, N = 225;
    for (var i = 0; i <= N; i++) {
      var d = a + (b - a) * i / N;
      if (fsMountainYangTien(norm(d)) === fy) { if (lo === null) lo = d; hi = d; }
    }
    if (lo === null) return null;
    return { from: lo, to: hi, full: (hi - lo) > (b - a) - 0.05, kind: fy ? 'Pure Yang' : 'Pure Yin' };
  }

  // Water candidates for a facing, ranked like the assistant's find_water_positions.
  function candidates(facingDeg, people) {
    var fs = fsSlotForDeg(facingDeg), fC = fs.startDeg + 2.8125;
    var maxA = (typeof FS_WATER_MAX_DEG !== 'undefined') ? FS_WATER_MAX_DEG : 70;
    var rows = [];
    FS_SLOTS.forEach(function (ws) {
      if (!fsIsLingShen(ws.yun)) return;
      var ang = fsAngularDist(fC, ws.centerDeg); if (ang > maxA) return;
      var lf = links(ws.hexNum, fs.hexNum, true);
      var yun = lf.some(function (l) { return /yun/.test(l); });
      var famF = fams(fs.hexNum).filter(function (f) { return fams(ws.hexNum).indexOf(f) >= 0; });
      var valid = yun || famF.length > 0;
      var per = people.map(function (p) {
        var ly = links(ws.hexNum, p.yearHex, true), ld = p.dayHex ? links(ws.hexNum, p.dayHex, true) : [];
        return { name: p.name, year: ly, day: ld };
      });
      var inFam = function (p, k, f) { return p[k + 'Hex'] && fams(p[k + 'Hex']).indexOf(f) >= 0; };
      var aifY = famF.filter(function (f) { return people.length && people.every(function (p) { return inFam(p, 'year', f); }); });
      var aifD = famF.filter(function (f) { return people.length && people.every(function (p) { return inFam(p, 'year', f) || inFam(p, 'day', f); }); });
      var a = ws.startDeg, b = ws.startDeg + 5.625;
      rows.push({
        hex: ws.hexNum, from: a, to: b, centre: a + 2.8125, angle: ang, qi: ws.qi, yun: ws.yun,
        linksFacing: lf, yunLink: yun, famFacing: famF, valid: valid,
        allInFamily: aifY.length ? 'year' : (aifD.length ? 'year/day' : ''),
        people: per, yy: yinYangRange(fC, a, b),
        score: (typeof fsWaterScore === 'function') ? fsWaterScore(fs, ws) : 0
      });
    });
    var rank = function (r) { return (r.allInFamily === 'year' ? 2 : r.allInFamily ? 1 : 0); };
    var byYear = function (r) { return r.people.filter(function (p) { return p.year.length; }).length; };
    var byDay = function (r) { return r.people.filter(function (p) { return p.year.length || p.day.length; }).length; };
    rows.sort(function (x, y) {
      return (y.valid - x.valid) || (rank(y) - rank(x)) || ((y.famFacing.length ? 1 : 0) - (x.famFacing.length ? 1 : 0)) ||
             (byYear(y) - byYear(x)) || (byDay(y) - byDay(x)) ||
             (y.yunLink - x.yunLink) || (y.score - x.score) || (x.angle - y.angle);
    });
    return { facingHex: fs.hexNum, rows: rows };
  }
  function sectorOf(hex) {
    for (var i = 0; i < FS_SLOTS.length; i++) if (FS_SLOTS[i].hexNum === hex) {
      var a = FS_SLOTS[i].startDeg; return { hex: hex, from: a, to: a + 5.625, centre: a + 2.8125 };
    }
    return null;
  }

  // ── camera model + calibration ─────────────────────────────
  function fpx(f35) { var w35 = DIAG35 * S.W / Math.hypot(S.W, S.H); return (S.W / 2) * f35 / (w35 / 2); }
  function calibrate() {
    var refs = S.refs, f35 = S.f35, centre = S.centre, note;
    var cOf = function (r, f) { return r.deg - Math.atan((r.x - S.W / 2) / f) * 180 / Math.PI; };
    var circMean = function (arr) {
      var sx = 0, sy = 0; arr.forEach(function (d) { sx += Math.cos(d * Math.PI / 180); sy += Math.sin(d * Math.PI / 180); });
      return norm(Math.atan2(sy, sx) * 180 / Math.PI);
    };
    if (refs.length >= 2 && !S.f35Locked) {
      var best = null;
      for (var f = 8; f <= 160; f += 0.25) {
        var cs = refs.map(function (r) { return cOf(r, fpx(f)); }), m = circMean(cs);
        var sp = Math.max.apply(null, cs.map(function (c) { return Math.abs(angDiff(c, m)); }));
        if (!best || sp < best.sp) best = { sp: sp, f: f, c: m };
      }
      f35 = best.f; centre = best.c;
      note = refs.length + ' references → focal ' + r1(f35) + ' mm, max error ' + r2(best.sp) + '°';
    } else if (refs.length >= 2) {
      // Focal known (photo data or lens chosen): keep it, average the centre and show
      // how well the references agree — a large spread means one of them is off.
      var cs2 = refs.map(function (r) { return cOf(r, fpx(f35)); }); centre = circMean(cs2);
      var sp2 = Math.max.apply(null, cs2.map(function (c) { return Math.abs(angDiff(c, centre)); }));
      note = refs.length + ' references agree within ±' + r1(sp2) + '° (focal ' + r1(f35) + ' mm ' + S.f35Source + ')' +
             (sp2 > 2 ? ' — WARNING: they disagree, check the readings or the lens' : '');
    } else if (refs.length === 1) {
      centre = norm(cOf(refs[0], fpx(f35)));
      note = (refs[0].wall ? 'Aligned to a wall (' + r1(refs[0].deg) + '°)' : '1 reference point') + ' → centre fixed (focal ' + r1(f35) + ' mm ' + S.f35Source + ').';
    } else {
      note = 'NOT calibrated: centre taken from the direction field (focal ' + r1(f35) + ' mm ' + S.f35Source + '). Use 🧱 Align to a wall.';
    }
    S.cal = { f: fpx(f35), f35: f35, centre: norm(centre), note: note };
  }
  function X(b) {
    var d = angDiff(b, S.cal.centre); if (Math.abs(d) >= 89) return null;
    return S.W / 2 + S.cal.f * Math.tan(d * Math.PI / 180);
  }
  function bearing(x) { return norm(S.cal.centre + Math.atan((x - S.W / 2) / S.cal.f) * 180 / Math.PI); }

  // ── drawing ───────────────────────────────────────────────
  function draw() {
    if (!S || !S.img) return;
    calibrate();
    var cv = el('xps-canvas'), ctx = cv.getContext('2d');
    cv.width = S.W; cv.height = S.H;
    ctx.drawImage(S.img, 0, 0, S.W, S.H);
    var u = Math.max(S.W, S.H) / 1000;                     // drawing unit
    var y0 = S.H * S.boxTop, y1 = S.H * S.boxBottom;
    drawDirections(ctx, u);
    var list = !S.layers.water ? [] : S.cand.rows.filter(function (r) { return S.sel[r.hex]; });
    Object.keys(S.sel).forEach(function (h) {               // manually added hexagrams
      h = +h; if (S.layers.water && S.sel[h] && !list.some(function (r) { return r.hex === h; })) { var s = sectorOf(h); if (s) list.push(s); }
    });
    var labels = [];
    list.forEach(function (r) {
      var xa = X(r.from), xb = X(r.to); if (xa === null || xb === null) return;
      if (Math.max(xa, xb) < 0 || Math.min(xa, xb) > S.W) return;
      var best = r.allInFamily || (r.people && r.people.length && r.people.every(function (p) { return p.year.length; }));
      ctx.fillStyle = 'rgba(255,0,0,0.16)'; ctx.fillRect(xa, y0, xb - xa, y1 - y0);
      if (r.yy) { var ya = X(r.yy.from), yb = X(r.yy.to); ctx.fillStyle = 'rgba(255,0,0,0.30)'; ctx.fillRect(ya, y0, yb - ya, y1 - y0); }
      ctx.lineWidth = 2 * u; ctx.strokeStyle = '#fff'; ctx.strokeRect(xa, y0, xb - xa, y1 - y0);
      ctx.lineWidth = (best ? 6 : 3.5) * u; ctx.strokeStyle = '#d00000'; ctx.strokeRect(xa + 1.5 * u, y0 + 1.5 * u, xb - xa - 3 * u, y1 - y0 - 3 * u);
      var lines = ['Hex ' + r.hex, r1(r.centre) + '°'];
      if (r.yy) lines.push(r.yy.kind + (r.yy.full ? '' : ' ' + r1(r.yy.from) + '–' + r1(r.yy.to) + '°'));
      labels.push({ cx: (xa + xb) / 2, lines: lines });
    });
    // labels, stacked so they never overlap
    var fs1 = 20 * u, fs2 = 14 * u, placed = [];
    labels.forEach(function (L) {
      ctx.font = 'bold ' + fs1 + 'px sans-serif'; var w = ctx.measureText(L.lines[0]).width;
      ctx.font = 'bold ' + fs2 + 'px sans-serif'; L.lines.slice(1).forEach(function (t) { w = Math.max(w, ctx.measureText(t).width); });
      w += 12 * u; var x0 = Math.max(2, Math.min(S.W - w - 2, L.cx - w / 2)), row = 0;
      while (placed.some(function (p) { return p.row === row && !(x0 + w < p.x0 - 4 * u || x0 > p.x1 + 4 * u); })) row++;
      placed.push({ x0: x0, x1: x0 + w, row: row });
      var hh = fs1 + 8 * u + (L.lines.length - 1) * (fs2 + 4 * u), ty = y0 - 8 * u - hh - row * (hh + 6 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(x0, ty, w, hh);
      ctx.lineWidth = 1.5 * u; ctx.strokeStyle = '#d00000'; ctx.strokeRect(x0, ty, w, hh);
      ctx.beginPath(); ctx.moveTo(L.cx, ty + hh); ctx.lineTo(L.cx, y0); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = '#c00000'; ctx.font = 'bold ' + fs1 + 'px sans-serif'; ctx.fillText(L.lines[0], x0 + w / 2, ty + 3 * u);
      ctx.fillStyle = '#7a0000'; ctx.font = 'bold ' + fs2 + 'px sans-serif';
      L.lines.slice(1).forEach(function (t, i) { ctx.fillText(t, x0 + w / 2, ty + 5 * u + fs1 + i * (fs2 + 4 * u)); });
    });
    // facing line
    var xf = X(S.facing);
    if (xf !== null && xf >= 0 && xf <= S.W) {
      ctx.setLineDash([10 * u, 8 * u]); ctx.lineWidth = 2.5 * u; ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.moveTo(xf, y1 + 6 * u); ctx.lineTo(xf, S.H); ctx.stroke(); ctx.setLineDash([]);
      tag(ctx, u, xf, y1 + 14 * u, 'Facing ' + r1(S.facing) + '°', 'rgba(0,0,0,0.65)', '#fff');
    }
    // traced wall edges, extended to their vanishing point
    S.refs.forEach(function (r) {
      if (!r.wall) return;
      ctx.lineWidth = 2.5 * u; ctx.strokeStyle = r.ai ? 'rgba(255,111,0,0.95)' : 'rgba(21,101,192,0.9)';
      if (r.ai) ctx.setLineDash([12 * u, 8 * u]);
      r.lines.forEach(function (L) { ctx.beginPath(); ctx.moveTo(L[0].x, L[0].y); ctx.lineTo(r.x, r.y); ctx.stroke(); });
      ctx.setLineDash([]);
    });
    S.wallPts.forEach(function (p) { ctx.fillStyle = '#1565c0'; ctx.beginPath(); ctx.arc(p.x, p.y, 7 * u, 0, 2 * Math.PI); ctx.fill(); });
    if (S.wallPts.length >= 2) { ctx.lineWidth = 2.5 * u; ctx.strokeStyle = '#1565c0'; ctx.beginPath(); ctx.moveTo(S.wallPts[0].x, S.wallPts[0].y); ctx.lineTo(S.wallPts[1].x, S.wallPts[1].y); ctx.stroke(); }
    // reference points
    S.refs.forEach(function (r) {
      ctx.lineWidth = 1.5 * u; ctx.strokeStyle = 'rgba(21,101,192,0.6)'; ctx.setLineDash([6 * u, 6 * u]);
      ctx.beginPath(); ctx.moveTo(r.x, 30 * u); ctx.lineTo(r.x, S.H); ctx.stroke(); ctx.setLineDash([]);
      if (r.x >= 0 && r.x <= S.W) tag(ctx, u, r.x, (S.layers.dir8 || S.layers.mtn24) ? S.H * 0.06 + 70 * u : 8 * u, (r.wall ? (r.ai ? 'AI wall ' : 'wall ') : (r.raw != null && r.raw !== r.deg ? 'compass ' + r1(r.raw) + '→' : 'ref ')) + r1(r.deg) + '°', '#1565c0', '#fff');
    });
    // measured point
    if (S.measure != null) {
      var b = bearing(S.measure), hx = fsSlotForDeg(b).hexNum;
      var yyM = yinYangRange(fsSlotForDeg(S.facing).startDeg + 2.8125, b, b);
      ctx.lineWidth = 2.5 * u; ctx.strokeStyle = '#ffd600'; ctx.beginPath(); ctx.moveTo(S.measure, 0); ctx.lineTo(S.measure, S.H); ctx.stroke();
      tag(ctx, u, S.measure, S.H - 40 * u, r1(b) + '° · Hex ' + hx + (yyM ? ' · ' + yyM.kind : ''), '#ffd600', '#000');
    }
    el('xps-cal').textContent = 'Photo centre ' + r1(S.cal.centre) + '°. ' + S.cal.note;
  }
  // ── 8 directions / 24 mountains: boundary lines + labels ──
  var DIR8 = [['N'], ['NE'], ['E'], ['SE'], ['S'], ['SW'], ['W'], ['NW']];   // directions only (Edu: no trigram names)
  function drawDirections(ctx, u) {
    var yTop = S.H * 0.06;
    if (S.layers.mtn24) {
      for (var m = 0; m < 24; m++) {
        var bd = norm(7.5 + m * 15), x = X(bd);
        if (x !== null && x >= 0 && x <= S.W && (!S.layers.dir8 || (bd - 22.5) % 45 !== 0)) {
          ctx.lineWidth = 1.5 * u; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.setLineDash([5 * u, 5 * u]);
          ctx.beginPath(); ctx.moveTo(x, yTop + 30 * u); ctx.lineTo(x, S.H); ctx.stroke(); ctx.setLineDash([]);
        }
        var cd = norm(m * 15), xc = X(cd);                       // mountain centred at k·15°
        if (xc !== null && xc >= 0 && xc <= S.W && typeof fsMountainCharFromDeg === 'function')
          tag(ctx, u, xc, yTop + 34 * u, fsMountainCharFromDeg(cd) + ' ' + r1(cd) + '\u00b0', 'rgba(255,255,255,0.85)', '#333');
      }
    }
    if (S.layers.dir8) {
      for (var k = 0; k < 8; k++) {
        var b = norm(22.5 + k * 45), xb = X(b);
        if (xb !== null && xb >= 0 && xb <= S.W) {
          ctx.lineWidth = 4 * u; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.moveTo(xb, 0); ctx.lineTo(xb, S.H); ctx.stroke();
          ctx.lineWidth = 2.5 * u; ctx.strokeStyle = '#7b1fa2'; ctx.beginPath(); ctx.moveTo(xb, 0); ctx.lineTo(xb, S.H); ctx.stroke();
          tag(ctx, u, xb, S.H * 0.93, r1(b) + '\u00b0', '#7b1fa2', '#fff');
        }
        var c = k * 45, xc2 = X(c);
        if (xc2 !== null && xc2 >= -S.W * 0.02 && xc2 <= S.W * 1.02) {
          ctx.font = 'bold ' + 30 * u + 'px sans-serif';
          var t1 = DIR8[k][0];
          var w = ctx.measureText(t1).width + 20 * u;
          var x0 = Math.max(2, Math.min(S.W - w - 2, xc2 - w / 2));
          ctx.fillStyle = 'rgba(123,31,162,0.88)'; ctx.fillRect(x0, yTop - 26 * u, w, 38 * u);
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(t1, x0 + w / 2, yTop - 22 * u);
        }
      }
    }
  }
  function tag(ctx, u, x, y, t, bg, fg) {
    ctx.font = 'bold ' + 15 * u + 'px sans-serif'; var w = ctx.measureText(t).width + 12 * u;
    var x0 = Math.max(2, Math.min(S.W - w - 2, x - w / 2));
    ctx.fillStyle = bg; ctx.fillRect(x0, y, w, 22 * u);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(t, x0 + w / 2, y + 3 * u);
  }

  // ── candidate list (checkboxes) ───────────────────────────
  function renderList() {
    var box = el('xps-list'); if (!box) return;
    var html = '';
    S.cand.rows.forEach(function (r) {
      var tags = [];
      if (r.allInFamily) tags.push('<b style="color:#b8860b;">★ all in family (' + r.allInFamily + ')</b>');
      else if (r.famFacing.length) tags.push('family with facing');
      if (r.yunLink) tags.push('yun link');
      if (r.yy) tags.push(r.yy.kind + (r.yy.full ? '' : ' (part)'));
      if (!r.valid) tags.push('<span style="color:#999;">no facing link</span>');
      var ppl = r.people.map(function (p) {
        var ok = p.year.length ? '✓ year' : (p.day.length ? '~ day' : '✗');
        return esc(p.name) + ' ' + ok;
      }).join(' · ');
      html += '<label style="display:flex;gap:6px;align-items:flex-start;padding:4px 2px;border-bottom:1px solid #eee;font-size:12px;' + (r.valid ? '' : 'opacity:.6;') + '">' +
        '<input type="checkbox" data-hex="' + r.hex + '"' + (S.sel[r.hex] ? ' checked' : '') + ' onchange="XKDGPhotoSectors._toggle(' + r.hex + ',this.checked)">' +
        '<span><b>Hex ' + r.hex + '</b> ' + r1(r.from) + '°–' + r1(r.to) + '° <span style="color:#777;">(' + r1(r.angle) + '° from facing)</span><br>' +
        '<span style="color:#555;">' + tags.join(' · ') + '</span>' + (ppl ? '<br><span style="color:#2e7d32;">' + ppl + '</span>' : '') + '</span></label>';
    });
    box.innerHTML = html || '<div style="color:#888;font-size:12px;">No Ling Shen position in range for this facing.</div>';
  }

  // ── dialog ────────────────────────────────────────────────
  function open(personKey, houseIdx) {
    var all = (typeof _fsHousesLoad === 'function') ? _fsHousesLoad() : {};
    var h = all[personKey] && all[personKey][houseIdx];
    if (!h) { alert('House not found.'); return false; }
    var f = (typeof _fsActiveFloor === 'function') ? _fsActiveFloor(h) : null;
    var facings = [];
    var hf = (typeof _fsFloorFacing === 'function') ? _fsFloorFacing(h, f) : h.houseFacing;
    // Session 35 (Edu): grouped list — House · Doors · Beds · Desks · Items (bed facing = sitting + 180)
    var num = function (x) { var n = parseFloat(x); return isNaN(n) ? null : n; };
    if (hf != null) facings.push({ group: 'House', label: 'House facing', deg: +hf });
    ((f && f.doors) || []).forEach(function (d, i) {
      if (!d || d.facing == null) return;
      facings.push({ group: d.kind === 'item' ? 'Items' : 'Doors', label: (d.name || ((d.kind === 'item' ? 'Item ' : 'Door ') + (i + 1))), deg: +d.facing });
    });
    var st = (f && f.settings) || {};
    (st.bed || []).forEach(function (b, i) { var sit = num(b.bedSitting); if (sit != null) facings.push({ group: 'Beds', label: b.name || ('Bed ' + (i + 1)), deg: (sit + 180) % 360 }); });
    (st.desk || []).forEach(function (k, i) { var fc = num(k.deskFacing); if (fc != null) facings.push({ group: 'Desks', label: k.name || ('Desk ' + (i + 1)), deg: fc }); });
    var people = housePeople(h, personKey);
    S = { house: h, people: people, facings: facings, facing: facings.length ? facings[facings.length > 1 ? 1 : 0].deg : 180,
          img: null, W: 0, H: 0, f35: 24, f35Source: '(default)', centre: null, refs: [], mode: 'measure',
          sel: {}, layers: { water: true, dir8: false, mtn24: false }, boxTop: 0.38, boxBottom: 0.62, measure: null, wallPts: [], compassOffset: 0,
          wallBase: (hf != null ? norm(+hf) : null) };
    S.centre = S.facing;
    S.facingSrc = facings.length ? facings[facings.length > 1 ? 1 : 0] : null;
    S.personKey = personKey; S.houseIdx = houseIdx;
    build();
    setFacing(S.facing);
    return true;
  }

  // ── programmatic API (AI assistant, option C) ───────────────
  // Normalised coordinates (0..1 of width / height) so the caller never needs pixels.
  function apiOpenWithPhoto(personKey, houseIdx, file, o) {
    o = o || {};
    if (!open(personKey, houseIdx)) return Promise.resolve({ error: 'House not found.' });
    if (o.facing != null && isFinite(+o.facing)) setFacing(+o.facing);
    return loadFile(file).then(function (ok) {
      if (!ok) return { error: 'Could not read the photo.' };
      if (o.lens_mm > 0 && !S.f35Locked) { S.f35 = +o.lens_mm; S.f35Locked = true; S.f35Source = '(lens given)'; el('xps-f35').value = r1(S.f35); }
      if (o.compass_correction != null && isFinite(+o.compass_correction)) { S.compassOffset = +o.compass_correction; el('xps-coff').value = S.compassOffset; }
      (o.wall_lines || []).forEach(function (w) { apiWall(w.lines, w.direction, true); });
      (o.references || []).forEach(function (r) {
        if (r && isFinite(+r.x) && isFinite(+r.deg)) S.refs.push({ x: +r.x * S.W, deg: norm(+r.deg + (r.compass ? (S.compassOffset || 0) : 0)), raw: r.compass ? +r.deg : undefined });
      });
      (o.highlight || []).forEach(function (h) { h = parseInt(h, 10); if (h >= 1 && h <= 64) S.sel[h] = true; });
      if (Array.isArray(o.only) && o.only.length) { S.sel = {}; o.only.forEach(function (h) { S.sel[parseInt(h, 10)] = true; }); renderList(); }
      if (o.layers && typeof o.layers === 'object') ['water', 'dir8', 'mtn24'].forEach(function (k) { if (k in o.layers) S.layers[k] = !!o.layers[k]; });
      if (o.measure_x != null && isFinite(+o.measure_x)) S.measure = +o.measure_x * S.W;
      draw(); hint();
      return apiState();
    });
  }
  // lines: [[x1,y1,x2,y2],[x3,y3,x4,y4]] normalised; direction: degree, or null = closest wall direction
  function apiWall(lines, direction, proposedByAi) {
    if (!S || !S.img || !Array.isArray(lines) || lines.length < 2) return false;
    var P = [lines[0][0], lines[0][1], lines[0][2], lines[0][3], lines[1][0], lines[1][1], lines[1][2], lines[1][3]].map(Number);
    if (P.some(function (v) { return !isFinite(v); })) return false;
    var x1 = P[0] * S.W, y1 = P[1] * S.H, x2 = P[2] * S.W, y2 = P[3] * S.H, x3 = P[4] * S.W, y3 = P[5] * S.H, x4 = P[6] * S.W, y4 = P[7] * S.H;
    var den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6 * S.W * S.W) return false;
    var a = x1 * y2 - y1 * x2, b = x3 * y4 - y3 * x4;
    var vx = (a * (x3 - x4) - (x1 - x2) * b) / den, vy = (a * (y3 - y4) - (y1 - y2) * b) / den;
    calibrate();
    var base = (S.wallBase != null) ? S.wallBase : S.facing, est = bearing(vx), deg = direction;
    if (deg == null || !isFinite(+deg)) {
      deg = [0, 90, 180, 270].map(function (k) { return norm(base + k); })
        .sort(function (p, q) { return Math.abs(angDiff(p, est)) - Math.abs(angDiff(q, est)); })[0];
    }
    S.refs.push({ x: vx, y: vy, deg: norm(+deg), wall: true, ai: !!proposedByAi,
                  lines: [[{ x: x1, y: y1 }, { x: x2, y: y2 }], [{ x: x3, y: y3 }, { x: x4, y: y4 }]] });
    return true;
  }
  function apiState() {
    if (!S) return { open: false };
    var st = { open: true, house: S.house.name, facing: r1(S.facing), facing_hex: S.cand.facingHex,
               walls_follow_house_facing: S.wallBase != null ? r1(S.wallBase) : null, photo_loaded: !!S.img,
               people: S.people.map(function (p) { return p.name + ' (year ' + p.year + ', day ' + (p.day || '?') + ')'; }) };
    if (!S.img) return st;
    calibrate();
    st.calibrated = S.refs.length > 0;
    st.calibration = { photo_centre_deg: r1(S.cal.centre), focal_35mm: r1(S.cal.f35), note: S.cal.note,
                       references: S.refs.map(function (r) { return { kind: r.wall ? (r.ai ? 'wall (proposed by the assistant)' : 'wall (traced by the user)') : 'compass point', deg: r1(r.deg) }; }) };
    var half = Math.atan((S.W / 2) / S.cal.f) * 180 / Math.PI;
    st.visible_range_deg = [r1(norm(S.cal.centre - half)), r1(norm(S.cal.centre + half))];
    st.sectors_drawn = [];
    Object.keys(S.sel).forEach(function (h) {
      h = +h; var r = S.cand.rows.filter(function (x) { return x.hex === h; })[0] || sectorOf(h); if (!r) return;
      var xa = X(r.from), xb = X(r.to);
      var o = { hex: h, from_deg: r1(r.from), to_deg: r1(r.to) };
      if (xa === null || xb === null || xb < 0 || xa > S.W) o.in_photo = false;
      else { o.in_photo = true; o.x_from = r2(Math.max(0, xa) / S.W); o.x_to = r2(Math.min(S.W, xb) / S.W); }
      if (r.yy) o[r.yy.kind.replace(' ', '_').toLowerCase()] = r.yy.full ? 'whole sector' : (r1(r.yy.from) + '-' + r1(r.yy.to));
      if (r.people) o.people = r.people.map(function (p) { return p.name + ': ' + (p.year.length ? 'year ' + p.year.join('/') : (p.day.length ? 'day ' + p.day.join('/') : 'no link')); });
      if (r.allInFamily) o.all_in_family = r.allInFamily;
      st.sectors_drawn.push(o);
    });
    st.layers = JSON.parse(JSON.stringify(S.layers));
    if (S.layers.dir8) {
      st.direction_boundaries = [];
      for (var k = 0; k < 8; k++) {
        var bd = norm(22.5 + k * 45), xb = X(bd);
        if (xb !== null && xb >= 0 && xb <= S.W) st.direction_boundaries.push({ deg: bd, between: DIR8[k][0] + '|' + DIR8[(k + 1) % 8][0], x: r2(xb / S.W) });
      }
      st.direction_note = 'Valid only if the photo was taken from the centre of the house.';
    }
    if (S.measure != null) {
      var b = bearing(S.measure);
      st.measured_point = { x: r2(S.measure / S.W), deg: r1(b), hex: fsSlotForDeg(b).hexNum, direction: DIR8[Math.round(norm(b) / 45) % 8][0],
                            mountain: (typeof fsMountainCharFromDeg === 'function') ? fsMountainCharFromDeg(b) : undefined };
    }
    return st;
  }
  function apiMeasure(xNorm) {
    if (!S || !S.img) return { error: 'No photo open.' };
    S.measure = +xNorm * S.W; draw();
    return apiState().measured_point;
  }
  function setFacing(deg) {
    S.facing = norm(+deg); if (!S.refs.length) { S.centre = S.facing; var c = el('xps-centre'); if (c) c.value = r1(S.centre); }
    S.cand = candidates(S.facing, S.people); S.sel = {};
    S.cand.rows.forEach(function (r) { if (r.valid) S.sel[r.hex] = true; });
    var fi = el('xps-facing'); if (fi) fi.value = r1(S.facing);
    el('xps-facing-hex').textContent = 'Facing hexagram ' + S.cand.facingHex + ' · ' + S.people.length + ' people: ' +
      (S.people.map(function (p) { return p.name; }).join(', ') || 'none saved — links to people not checked') +
      (S.wallBase != null ? ' · walls follow the house facing ' + r1(S.wallBase) + '° (±90°)' : ' · no house facing saved: walls assumed on this facing');
    renderList(); if (S.img) draw();
  }
  function build() {
    var old = el('xps-modal'); if (old) old.remove();
    var btn = 'padding:5px 10px;border-radius:6px;font-size:12px;cursor:pointer;';
    var opts = ['House', 'Doors', 'Beds', 'Desks', 'Items'].map(function (g) {
      var it = S.facings.filter(function (f) { return (f.group || 'House') === g; });
      if (!it.length) return '';
      return '<optgroup label="' + g + '">' + it.map(function (f) { return '<option value="#' + S.facings.indexOf(f) + '"' + (f === S.facingSrc ? ' selected' : '') + '>' + esc(f.label) + ' ' + r1(f.deg) + '°</option>'; }).join('') + '</optgroup>';
    }).join('');
    var m = document.createElement('div');
    m.id = 'xps-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;overflow-y:auto;';
    m.innerHTML =
      '<div style="background:#fff;margin:10px auto;max-width:900px;border-radius:10px;overflow:hidden;">' +
      '<div style="background:#2e7d32;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">' +
        '<b>📷 Photo sectors — ' + esc(S.house.name || '') + '</b>' +
        '<button onclick="XKDGPhotoSectors.close()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="padding:10px 12px;font-size:12px;color:#333;">' +
        '<div style="margin-bottom:6px;line-height:1.5;">Stand (or sit) at the facing point — bed head, door centre — and take a photo <b>straight ahead</b>, phone upright, not tilted. Use the wide lens (0.5×) to see more.' +
        '<div style="margin-top:4px;padding:5px 8px;border-radius:6px;background:#fff3e0;border:1px solid #ffb74d;"><b>⚠ Final check of the exact spot:</b> near the edges of a wide photo the boxes can be off by 2–3° (half a hexagram). Take a <b>second photo from the same point, turned toward the water spot</b>, with the <b>main lens 1×</b>; type its direction in Photo centre, calibrate with 🧱 Align to a wall and check that the object is inside the box.</div></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">' +
          '<label style="' + btn + 'background:#2e7d32;color:#fff;">📷 Photo<input type="file" accept="image/*" style="display:none" onchange="XKDGPhotoSectors._file(this.files[0])"></label>' +
          '<span>Facing: <select onchange="XKDGPhotoSectors._facing(this.value)" style="font-size:12px;">' + opts + '<option value="">custom…</option></select> ' +
          '<input id="xps-facing" type="number" step="0.1" style="width:70px;font-size:12px;" onchange="XKDGPhotoSectors._facing(this.value)"></span>' +
          '<span id="xps-facing-hex" style="color:#555;"></span>' +
        '</div>' +
        '<div id="xps-photo-tools" style="display:none;">' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px;">' +
            '<span>Photo centre <input id="xps-centre" type="number" step="0.1" style="width:70px;font-size:12px;" onchange="XKDGPhotoSectors._centre(this.value)">°</span>' +
            '<span>Lens <select id="xps-lens" onchange="XKDGPhotoSectors._lens(this.value)" style="font-size:12px;">' +
              '<option value="12">wide 0.5× · 12 mm (Xiaomi 14 Ultra)</option><option value="13">wide 0.5× · 13 mm (iPhone)</option>' +
              '<option value="23">main 1× · 23 mm (Xiaomi 14 Ultra)</option><option value="24">main 1× · 24 mm</option><option value="26">main 1× · 26 mm (iPhone)</option>' +
              '<option value="48">2× · ~48 mm</option><option value="">other…</option></select> ' +
              '<input id="xps-f35" type="number" step="0.5" style="width:56px;font-size:12px;" onchange="XKDGPhotoSectors._f35(this.value)"> mm</span>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;">' +
            '<span>Tap on the photo to:</span>' +
            '<button id="xps-m-measure" onclick="XKDGPhotoSectors._mode(\'measure\')" style="' + btn + '">📍 Measure a point</button>' +
            '<button id="xps-m-wall" onclick="XKDGPhotoSectors._mode(\'wall\')" style="' + btn + '">🧱 Align to a wall</button>' +
            '<button id="xps-m-ref" onclick="XKDGPhotoSectors._mode(\'ref\')" style="' + btn + '">🎯 Point read with the compass</button>' +
            '<button onclick="XKDGPhotoSectors._clearRefs()" style="' + btn + 'border:1px solid #ccc;background:#fff;">Clear references</button>' +
            '<button onclick="XKDGPhotoSectors._saveOpening()" title="Save the measured point as the centre or an edge of a door / openable window, for 🪟 Yang openings" style="' + btn + 'border:1px solid #0277bd;background:#fff;color:#0277bd;">🪟 Save as opening</button>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;">' +
            '<span title="Indoor compasses are off by several degrees. Read the facing (e.g. the door) with your compass from the photo spot: the difference from the real facing corrects every other reading.">Compass correction ' +
            '<input id="xps-coff" type="number" step="0.1" value="0" style="width:60px;font-size:12px;" onchange="XKDGPhotoSectors._coff(this.value)">°</span>' +
            '<button onclick="XKDGPhotoSectors._coffFromFacing()" style="' + btn + 'border:1px solid #1565c0;background:#fff;color:#1565c0;">Set it from the facing</button>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:6px;">' +
            '<span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">Show: ' +
              '<label><input type="checkbox" checked onchange="XKDGPhotoSectors._layer(\'water\',this.checked)"> water hexagrams</label>' +
              '<label title="Take the photo from the CENTRE of the house"><input type="checkbox" onchange="XKDGPhotoSectors._layer(\'dir8\',this.checked)"> 8 directions</label>' +
              '<label><input type="checkbox" onchange="XKDGPhotoSectors._layer(\'mtn24\',this.checked)"> 24 mountains</label></span>' +
            '<span>Boxes top <input type="range" min="0" max="95" value="38" oninput="XKDGPhotoSectors._box(\'t\',this.value)"></span>' +
            '<span>bottom <input type="range" min="5" max="100" value="62" oninput="XKDGPhotoSectors._box(\'b\',this.value)"></span>' +
            '<span>Add hexagram <input id="xps-add" type="number" min="1" max="64" style="width:50px;font-size:12px;"> <button onclick="XKDGPhotoSectors._add()" style="' + btn + 'border:1px solid #2e7d32;background:#fff;color:#2e7d32;">+</button></span>' +
            '<button onclick="XKDGPhotoSectors._save()" style="' + btn + 'background:#1565c0;color:#fff;border:none;">⬇ Save / share image</button>' +
            ' <button id="xps-dbx" onclick="XKDGPhotoSectors._saveDbx()" title="Save in Dropbox: House profiles / house / facing" style="' + btn + 'background:#0061fe;color:#fff;border:none;">📦 Save to Dropbox</button>' +
          '</div>' +
          '<div id="xps-hint" style="font-size:12px;color:#b45309;font-weight:bold;margin-bottom:4px;"></div>' +
          '<div id="xps-cal" style="font-size:11px;color:#1565c0;margin-bottom:6px;"></div>' +
          '<canvas id="xps-canvas" style="width:100%;height:auto;border:1px solid #ddd;border-radius:6px;touch-action:manipulation;cursor:crosshair;"></canvas>' +
        '</div>' +
        '<div style="margin-top:8px;"><b>Water positions</b> <span style="color:#777;">(Ling Shen within ±' + ((typeof FS_WATER_MAX_DEG !== 'undefined') ? FS_WATER_MAX_DEG : 70) + '° — tick to draw; people count by year ✓, then day ~)</span>' +
          '<div id="xps-list" style="max-height:260px;overflow-y:auto;margin-top:4px;"></div></div>' +
      '</div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.body.appendChild(m);
    var cv0 = el('xps-canvas');
    // Session 36 (Edu): on the phone the photo could not be zoomed to place the wall points.
    // In 🧱 wall / 🎯 compass mode a MAGNIFIER follows the finger; the point is set where it is lifted.
    cv0.addEventListener('click', function (e) { if (S.mode === 'wall' || S.mode === 'ref') return; onTap(e); });
    cv0.addEventListener('pointerdown', loupeDown);
    cv0.addEventListener('pointermove', loupeMove);
    cv0.addEventListener('pointerup', loupeUp);
    cv0.addEventListener('pointercancel', loupeHide);
    modeButtons();
  }
  // ── magnifier (session 36) ──
  var LP = null;   // { cv, ctx, active, x, y, id }
  function loupeOn() { return S.mode === 'wall' || S.mode === 'ref'; }
  function loupeEnsure() {
    if (LP && document.body.contains(LP.cv)) return LP;
    var c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1, D = 150;
    c.width = D * dpr; c.height = D * dpr;
    c.style.cssText = 'position:fixed;width:' + D + 'px;height:' + D + 'px;border-radius:50%;border:3px solid #1565c0;box-shadow:0 6px 18px rgba(0,0,0,.45);z-index:100100;pointer-events:none;display:none;background:#fff;';
    document.body.appendChild(c);
    LP = { cv: c, ctx: c.getContext('2d'), D: D, dpr: dpr, active: false };
    return LP;
  }
  function loupeRender(e) {
    var cv = el('xps-canvas'); if (!cv) return;
    var L = loupeEnsure(), rc = cv.getBoundingClientRect(), D = L.D, dpr = L.dpr, Z = 3;
    var px = (e.clientX - rc.left) * (S.W / rc.width), py = (e.clientY - rc.top) * (S.H / rc.height);
    var srcW = D / Z * (S.W / rc.width);          // canvas px shown in the loupe
    var g = L.ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, D * dpr, D * dpr);
    g.drawImage(cv, px - srcW / 2, py - srcW / 2, srcW, srcW, 0, 0, D * dpr, D * dpr);
    g.strokeStyle = '#ff1744'; g.lineWidth = 2 * dpr; g.beginPath();
    g.moveTo(D * dpr / 2, 0); g.lineTo(D * dpr / 2, D * dpr * .42); g.moveTo(D * dpr / 2, D * dpr * .58); g.lineTo(D * dpr / 2, D * dpr);
    g.moveTo(0, D * dpr / 2); g.lineTo(D * dpr * .42, D * dpr / 2); g.moveTo(D * dpr * .58, D * dpr / 2); g.lineTo(D * dpr, D * dpr / 2); g.stroke();
    g.beginPath(); g.arc(D * dpr / 2, D * dpr / 2, 3 * dpr, 0, Math.PI * 2); g.stroke();
    // above the finger (below it when too close to the top of the screen)
    var lx = Math.max(4, Math.min(window.innerWidth - D - 4, e.clientX - D / 2)), ly = e.clientY - D - 40;
    if (ly < 4) ly = e.clientY + 40;
    L.cv.style.left = lx + 'px'; L.cv.style.top = ly + 'px'; L.cv.style.display = 'block';
  }
  function loupeDown(e) {
    if (!loupeOn()) return;
    e.preventDefault();
    var L = loupeEnsure(); L.active = true; L.id = e.pointerId; L.last = e;
    try { e.target.setPointerCapture(e.pointerId); } catch (x) {}
    loupeRender(e);
  }
  function loupeMove(e) { if (!LP || !LP.active || e.pointerId !== LP.id) return; e.preventDefault(); LP.last = e; loupeRender(e); }
  function loupeUp(e) {
    if (!LP || !LP.active || e.pointerId !== LP.id) return;
    e.preventDefault(); var last = e; loupeHide();
    onTap({ clientX: last.clientX, clientY: last.clientY });
  }
  function loupeHide() { if (LP) { LP.active = false; LP.cv.style.display = 'none'; } }
  function modeButtons() {
    var a = el('xps-m-measure'), b = el('xps-m-ref'), w = el('xps-m-wall'); if (!a) return;
    w.style.background = S.mode === 'wall' ? '#1565c0' : '#fff'; w.style.color = S.mode === 'wall' ? '#fff' : '#1565c0'; w.style.border = '1px solid #1565c0';
    a.style.background = S.mode === 'measure' ? '#ffd600' : '#fff'; a.style.border = '1px solid #c9a800';
    b.style.background = S.mode === 'ref' ? '#1565c0' : '#fff'; b.style.color = S.mode === 'ref' ? '#fff' : '#1565c0'; b.style.border = '1px solid #1565c0';
    var cv = el('xps-canvas'); if (cv) cv.style.touchAction = (S.mode === 'wall' || S.mode === 'ref') ? 'none' : 'manipulation';   // no scrolling while placing points
  }
  function onTap(e) {
    var cv = el('xps-canvas'), rc = cv.getBoundingClientRect();
    var x = (e.clientX - rc.left) * (S.W / rc.width);
    var y = (e.clientY - rc.top) * (S.H / rc.height);
    if (S.mode === 'wall') { wallTap(x, y); return; }
    if (S.mode === 'ref') {
      var off = S.compassOffset || 0;
      var d = prompt('Compass reading of the point you tapped (0-360), taken from the SAME spot as the photo.' +
        (off ? '\nIt will be corrected by ' + (off > 0 ? '+' : '') + r1(off) + '° (compass correction).' : '\nTip: set the compass correction first (read the facing with the same compass).'));
      if (d === null || !isFinite(parseFloat(d))) return;
      S.refs.push({ x: x, deg: norm(parseFloat(d) + off), raw: parseFloat(d) });
    } else S.measure = x;
    draw();
    var c = el('xps-centre'); if (c) c.value = r1(S.cal.centre);
    var fi = el('xps-f35'); if (fi && S.refs.length >= 2) fi.value = r1(S.cal.f35);
  }
  // ── align to a wall: 2 taps on one horizontal edge, 2 on another edge of the same wall ──
  function wallTap(x, y) {
    S.wallPts.push({ x: x, y: y });
    hint();
    if (S.wallPts.length < 4) { draw(); return; }
    var P = S.wallPts; S.wallPts = [];
    var x1 = P[0].x, y1 = P[0].y, x2 = P[1].x, y2 = P[1].y, x3 = P[2].x, y3 = P[2].y, x4 = P[3].x, y4 = P[3].y;
    var den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6 * S.W * S.W) { alert('The two lines are parallel in the photo: trace two edges that clearly converge (skirting board and ceiling line of a wall running away from you).'); hint(); draw(); return; }
    var a = x1 * y2 - y1 * x2, b = x3 * y4 - y3 * x4;
    var vx = (a * (x3 - x4) - (x1 - x2) * b) / den, vy = (a * (y3 - y4) - (y1 - y2) * b) / den;
    var base = (S.wallBase != null) ? S.wallBase : S.facing;
    var est = bearing(vx);
    var dirs = [0, 90, 180, 270].map(function (k) { return norm(base + k); })
      .sort(function (p, q) { return Math.abs(angDiff(p, est)) - Math.abs(angDiff(q, est)); });
    var ans = prompt('The wall you traced RUNS AWAY from you toward which direction?\n(where its lines meet — NOT the direction the wall faces; walls are the house facing ' + r1(base) + '° or ±90°/180°)\n\n' +
      dirs.map(function (d, i) { return (i + 1) + ' = ' + r1(d) + '°' + (i === 0 ? '   ← most likely' : ''); }).join('\n'), '1');
    if (ans === null) { hint(); draw(); return; }
    var i = parseInt(ans, 10); var deg = (i >= 1 && i <= 4) ? dirs[i - 1] : parseFloat(ans);
    if (!isFinite(deg)) { hint(); draw(); return; }
    // Session 36 (Edu): picking the direction the wall FACES (90° off) shifts every box by 90°.
    if (Math.abs(angDiff(deg, est)) > 45 && !confirm('Your lines meet at about ' + r1(est) + '° in the photo, but you chose ' + r1(deg) + '°.\n' +
        'Choose the direction the wall RUNS TOWARD (where its lines meet), not the direction it faces.\n\nOK = use ' + r1(dirs[0]) + '° · Cancel = keep ' + r1(deg) + '°')) {
      // keep the user's choice
    } else if (Math.abs(angDiff(deg, est)) > 45) deg = dirs[0];
    S.refs.push({ x: vx, y: vy, deg: norm(deg), wall: true, lines: [[P[0], P[1]], [P[2], P[3]]] });
    S.mode = 'measure'; modeButtons(); hint(); draw();
    var c = el('xps-centre'); if (c) c.value = r1(S.cal.centre);
    var fi = el('xps-f35'); if (fi && S.refs.length >= 2) fi.value = r1(S.cal.f35);
  }
  function hint() {
    var h = el('xps-hint'); if (!h) return;
    var n = S.wallPts.length;
    var tip = ' <span style="color:#1565c0;">Hold your finger on the photo: a 🔍 magnifier appears — slide until the red cross is on the edge, then lift.</span>';
    if (S.mode === 'wall') h.innerHTML = (['Tap 2 points along a <b>horizontal edge</b> of a wall that runs away from you (e.g. the skirting board).',
      'Now the second point of that edge.',
      'Now 2 points along <b>another horizontal edge of the same wall</b> (e.g. where it meets the ceiling).',
      'Now the last point.'][n] || '') + tip;
    else if (S.mode === 'ref') h.innerHTML = 'Tap a point you have read with the compass from the photo spot (set the compass correction first).' + tip;
    else h.textContent = S.refs.length ? '' : 'Calibrate first: 🧱 Align to a wall (the walls follow the house facing).';
  }
  function loadFile(file) {
    if (!file) return Promise.resolve(false);
    return new Promise(function (resolve) {
    var fr = new FileReader();
    fr.onerror = function () { resolve(false); };
    fr.onload = function () {
      var ex = readExif(fr.result);
      if (ex && ex.f35) { S.f35 = ex.f35; S.f35Locked = true; S.f35Source = '(from photo data' + (ex.model ? ', ' + ex.model : '') + ')'; }
      else { S.f35Locked = false; S.f35Source = '(lens unknown — choose the lens you used, or calibrate with 2 walls)'; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
        S.img = img; S.W = Math.round(img.naturalWidth * k); S.H = Math.round(img.naturalHeight * k);
        S.refs = []; S.measure = null; S.centre = S.facing;
        el('xps-photo-tools').style.display = 'block'; hint();
        el('xps-centre').value = r1(S.centre); el('xps-f35').value = r1(S.f35);
        var ls = el('xps-lens'); ls.value = [12, 13, 23, 24, 26, 48].indexOf(Math.round(S.f35)) >= 0 ? String(Math.round(S.f35)) : '';
        draw();
        resolve(true);
      };
      img.onerror = function () { resolve(false); };
      img.src = url;
    };
    fr.readAsArrayBuffer(file);
    });
  }
  function save() {
    var cv = el('xps-canvas'); if (!cv) return;
    cv.toBlob(function (blob) {
      var name = 'sectors-' + (S.house.name || 'house').replace(/[^\w-]+/g, '_') + '.jpg';
      try { if (window.XKDGDropboxSync && XKDGDropboxSync.autoSave) { var P = dbxParts(); XKDGDropboxSync.autoSave(P.parts, P.file, blob); } } catch (eD) {}
      try {
        var file = new File([blob], name, { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function () {}); return; }
      } catch (e) {}
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { try { window.open(url, '_blank'); } catch (e) {} }, 300);
    }, 'image/jpeg', 0.9);
  }
  // Session 36 (Edu): keep the picture in Dropbox, in a folder of the house and of the facing used:
  // /House profiles/<house>/<facing name> facing/<date time> · centre <deg>.jpg
  function srcNow() {
    if (S.facingSrc && Math.abs(angDiff(S.facingSrc.deg, S.facing)) < 0.05) return S.facingSrc;
    return (S.facings || []).filter(function (x) { return Math.abs(angDiff(x.deg, S.facing)) < 0.05; })[0] || null;
  }
  function dbxParts() {
    var f = srcNow();
    return { parts: ['House profiles', S.house.name || 'house', f ? f.label.replace(/\s*facing$/i, '') + ' facing' : 'facing ' + r1(S.facing)],
             file: (window.XKDGDropboxSync ? XKDGDropboxSync.stamp() : '') + ' - centre ' + r1(S.cal.centre) + '.jpg' };
  }
  function saveDropbox() {
    var D = window.XKDGDropboxSync, cv = el('xps-canvas'); if (!cv || !S) return;
    if (!D || !D.uploadFile) { alert('Dropbox Sync is not available.'); return; }
    if (!D.connected()) { alert('Connect Dropbox first (📦 Dropbox Sync), then tap this button again.'); try { D.open(); } catch (e) {} return; }
    var P0 = dbxParts();
    var path = '/' + P0.parts.map(D.cleanName).join('/') + '/' + D.cleanName(P0.file);
    var b = el('xps-dbx'); if (b) { b.disabled = true; b.textContent = '⏳ Saving…'; }
    cv.toBlob(function (blob) {
      D.uploadFile(path, blob).then(function (r) {
        if (b) { b.disabled = false; b.textContent = '✓ Saved in Dropbox'; setTimeout(function () { if (b) b.textContent = '📦 Save to Dropbox'; }, 3000); }
        var h = el('xps-cal'); if (h) h.innerHTML += '<br><span style="color:#2e7d32;">📦 Saved: ' + esc((r && r.path_display) || path) + '</span>';
      }).catch(function (e) { if (b) { b.disabled = false; b.textContent = '📦 Save to Dropbox'; } alert('Dropbox: ' + e.message); });
    }, 'image/jpeg', 0.9);
  }
  // Session 37 (Edu): 🪟 Yang openings — the 📍 measured point is saved as the centre or an
  // edge of a door / openable window, seen from the selected facing source.
  function saveOpening() {
    var Y = window.XKDGYangOpenings;
    if (!Y) { alert('The Yang openings tool is not loaded.'); return; }
    if (!S || !S.img || S.measure == null) { alert('Tap 📍 Measure a point on the CENTRE (or an edge) of the door / window first.'); return; }
    var f = srcNow();
    if (!f) { alert('Choose a saved facing source (house, door, bed, desk, item) in the Facing list: a typed facing cannot hold openings.'); return; }
    var key = (f.group || 'House') + '|' + f.label;
    var ops = Y.openingsFor(S.personKey, S.houseIdx, key);
    var ask = 'Which opening is this point on?\n' + ops.map(function (o, i) { return (i + 1) + ' = ' + o.icon + ' ' + o.name; }).join('\n') +
              (ops.length ? '\n' : '') + (ops.length + 1) + ' = + new openable window';
    var a = prompt(ask, ops.length ? '1' : String(ops.length + 1)); if (a === null) return;
    var i = parseInt(a, 10), op;
    if (i === ops.length + 1) {
      var n = prompt('Name of the window:'); if (!n || !n.trim()) return;
      if (!confirm('Can this window be OPENED?\n\nOK = yes · Cancel = fixed glass (not a yang opening, not saved)')) return;
      var w = Y.addWindow(S.personKey, S.houseIdx, n, true); if (w.error) { alert(w.error); return; }
      op = { oid: w.oid, name: w.name };
    } else if (i >= 1 && i <= ops.length) op = ops[i - 1];
    else return;
    var part = prompt('The point you measured is the:\n1 = CENTRE of the opening\n2 = LEFT edge\n3 = RIGHT edge', '1'); if (part === null) return;
    var k = part === '2' ? 'l' : part === '3' ? 'r' : 'c', b = bearing(S.measure), vals = {};
    vals[k] = r2(b);
    if (k === 'c') {
      var d = prompt('Laser distance from the facing point to the CENTRE of "' + op.name + '" (metres, door/window closed — leave empty if not measured):', '');
      if (d !== null && d.trim()) vals.dist = d;
    }
    vals.photo = 'Photo sectors ' + (S.refs.length ? 'calibrated' : 'NOT calibrated') + ', centre ' + r1(S.cal.centre) + '°, ' + r1(S.cal.f35) + ' mm';
    var r = Y.saveMeasure(S.personKey, S.houseIdx, key, op.oid, vals);
    if (r.error) { alert(r.error); return; }
    alert('Saved for ' + f.label + ': ' + op.name + ' ' + (k === 'c' ? 'centre' : k === 'l' ? 'left edge' : 'right edge') + ' ' + r1(b) + '° (hex ' + fsSlotForDeg(b).hexNum + ').' +
          (S.refs.length ? '' : '\n\n⚠ The photo is NOT calibrated: use 🧱 Align to a wall.') + '\nOpen 🪟 Yang openings in the house ☰ to see the status.');
  }
  function close() { var m = el('xps-modal'); if (m) m.remove(); loupeHide(); S = null; }

  window.XKDGPhotoSectors = {
    open: open, close: close,
    // pure helpers, reusable by the AI assistant (option C)
    candidates: candidates, readExif: readExif, yinYangRange: yinYangRange,
    people: function (h, key) { return housePeople(h, key); },
    _saveOpening: saveOpening,
    openWithPhoto: apiOpenWithPhoto, addWall: function (l, d) { var ok = apiWall(l, d, true); if (ok) draw(); return ok; },
    state: apiState, measure: apiMeasure, isOpen: function () { return !!S; },
    _file: loadFile, _save: save, _saveDbx: saveDropbox,
    _facing: function (v) {
      if (v === '' || v == null) { var fi = el('xps-facing'); if (fi) fi.focus(); return; }
      // session 37: the list passes "#index" so two sources with the same degree (door and bed) stay apart
      if (String(v).charAt(0) === '#') { var f = S.facings[parseInt(String(v).slice(1), 10)]; if (!f) return; S.facingSrc = f; setFacing(f.deg); return; }
      S.facingSrc = null; setFacing(v);
    },
    _centre: function (v) { if (!isFinite(parseFloat(v))) return; S.refs = []; S.centre = norm(parseFloat(v)); draw(); },
    _lens: function (v) { if (!v) { el('xps-f35').focus(); return; } S.f35 = +v; S.f35Locked = true; S.f35Source = '(lens setting)'; el('xps-f35').value = v; draw(); },
    _f35: function (v) { if (!(+v > 0)) return; S.f35 = +v; S.f35Locked = true; S.f35Source = '(typed)'; draw(); },
    _coff: function (v) { S.compassOffset = isFinite(parseFloat(v)) ? parseFloat(v) : 0; },
    _coffFromFacing: function () {
      var r = prompt('Point your compass along the facing (' + r1(S.facing) + '°), from the spot where you take the photo.\nWhat does it read?');
      if (r === null || !isFinite(parseFloat(r))) return;
      S.compassOffset = r1(angDiff(S.facing, parseFloat(r)));
      el('xps-coff').value = S.compassOffset;
      alert('Compass correction ' + (S.compassOffset > 0 ? '+' : '') + S.compassOffset + '°: every compass reading you type is corrected by this amount.');
    },
    _layer: function (k, on) {
      S.layers[k] = !!on;
      if ((k === 'dir8' || k === 'mtn24') && on) {
        var h = el('xps-hint'); if (h) h.textContent = '8 directions / 24 mountains: valid only if the photo is taken from the CENTRE of the house, phone upright, calibrated on a wall.';
      }
      draw();
    },
    _mode: function (m) { S.mode = m; S.wallPts = []; modeButtons(); hint(); if (S.img) draw(); },
    _clearRefs: function () { S.refs = []; S.wallPts = []; S.centre = parseFloat(el('xps-centre').value) || S.facing; draw(); },
    _box: function (w, v) { if (w === 't') S.boxTop = Math.min(+v / 100, S.boxBottom - 0.03); else S.boxBottom = Math.max(+v / 100, S.boxTop + 0.03); draw(); },
    _toggle: function (hex, on) { if (on) S.sel[hex] = true; else delete S.sel[hex]; draw(); },
    _add: function () { var n = parseInt(el('xps-add').value, 10); if (n >= 1 && n <= 64) { S.sel[n] = true; draw(); } }
  };
})();

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
    if (isHetuPair(a.qi, b.qi)) out.push('Hetu qi');
    if ([5, 10, 15].indexOf(a.qi + b.qi) >= 0) out.push('Adding qi ' + (a.qi + b.qi));
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
        var ly = links(ws.hexNum, p.yearHex), ld = p.dayHex ? links(ws.hexNum, p.dayHex) : [];
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
    var list = S.cand.rows.filter(function (r) { return S.sel[r.hex]; });
    Object.keys(S.sel).forEach(function (h) {               // manually added hexagrams
      h = +h; if (S.sel[h] && !list.some(function (r) { return r.hex === h; })) { var s = sectorOf(h); if (s) list.push(s); }
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
      ctx.lineWidth = 2.5 * u; ctx.strokeStyle = 'rgba(21,101,192,0.9)';
      r.lines.forEach(function (L) { ctx.beginPath(); ctx.moveTo(L[0].x, L[0].y); ctx.lineTo(r.x, r.y); ctx.stroke(); });
    });
    S.wallPts.forEach(function (p) { ctx.fillStyle = '#1565c0'; ctx.beginPath(); ctx.arc(p.x, p.y, 7 * u, 0, 2 * Math.PI); ctx.fill(); });
    if (S.wallPts.length >= 2) { ctx.lineWidth = 2.5 * u; ctx.strokeStyle = '#1565c0'; ctx.beginPath(); ctx.moveTo(S.wallPts[0].x, S.wallPts[0].y); ctx.lineTo(S.wallPts[1].x, S.wallPts[1].y); ctx.stroke(); }
    // reference points
    S.refs.forEach(function (r) {
      ctx.lineWidth = 1.5 * u; ctx.strokeStyle = 'rgba(21,101,192,0.6)'; ctx.setLineDash([6 * u, 6 * u]);
      ctx.beginPath(); ctx.moveTo(r.x, 30 * u); ctx.lineTo(r.x, S.H); ctx.stroke(); ctx.setLineDash([]);
      if (r.x >= 0 && r.x <= S.W) tag(ctx, u, r.x, 8 * u, (r.wall ? 'wall ' : (r.raw != null && r.raw !== r.deg ? 'compass ' + r1(r.raw) + '→' : 'ref ')) + r1(r.deg) + '°', '#1565c0', '#fff');
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
    if (!h) { alert('House not found.'); return; }
    var f = (typeof _fsActiveFloor === 'function') ? _fsActiveFloor(h) : null;
    var facings = [];
    var hf = (typeof _fsFloorFacing === 'function') ? _fsFloorFacing(h, f) : h.houseFacing;
    if (hf != null) facings.push({ label: 'House facing', deg: +hf });
    ((f && f.doors) || []).forEach(function (d, i) { if (d && d.facing != null) facings.push({ label: (d.name || ('Door ' + (i + 1))), deg: +d.facing }); });
    var people = housePeople(h, personKey);
    S = { house: h, people: people, facings: facings, facing: facings.length ? facings[facings.length > 1 ? 1 : 0].deg : 180,
          img: null, W: 0, H: 0, f35: 24, f35Source: '(default)', centre: null, refs: [], mode: 'measure',
          sel: {}, boxTop: 0.38, boxBottom: 0.62, measure: null, wallPts: [], compassOffset: 0,
          wallBase: (hf != null ? norm(+hf) : null) };
    S.centre = S.facing;
    build();
    setFacing(S.facing);
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
    var opts = S.facings.map(function (f, i) { return '<option value="' + f.deg + '"' + (f.deg === S.facing ? ' selected' : '') + '>' + esc(f.label) + ' ' + r1(f.deg) + '°</option>'; }).join('');
    var m = document.createElement('div');
    m.id = 'xps-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;overflow-y:auto;';
    m.innerHTML =
      '<div style="background:#fff;margin:10px auto;max-width:900px;border-radius:10px;overflow:hidden;">' +
      '<div style="background:#2e7d32;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">' +
        '<b>📷 Photo sectors — ' + esc(S.house.name || '') + '</b>' +
        '<button onclick="XKDGPhotoSectors.close()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="padding:10px 12px;font-size:12px;color:#333;">' +
        '<div style="margin-bottom:6px;line-height:1.5;">Stand (or sit) at the facing point — bed head, door centre — and take a photo <b>straight ahead</b>, phone upright, not tilted. Use the wide lens (0.5×) to see more.</div>' +
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
              '<option value="13">wide 0.5× (~13 mm)</option><option value="24">main 1× (~24 mm)</option><option value="48">2× (~48 mm)</option><option value="">other…</option></select> ' +
              '<input id="xps-f35" type="number" step="0.5" style="width:56px;font-size:12px;" onchange="XKDGPhotoSectors._f35(this.value)"> mm</span>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;">' +
            '<span>Tap on the photo to:</span>' +
            '<button id="xps-m-measure" onclick="XKDGPhotoSectors._mode(\'measure\')" style="' + btn + '">📍 Measure a point</button>' +
            '<button id="xps-m-wall" onclick="XKDGPhotoSectors._mode(\'wall\')" style="' + btn + '">🧱 Align to a wall</button>' +
            '<button id="xps-m-ref" onclick="XKDGPhotoSectors._mode(\'ref\')" style="' + btn + '">🎯 Point read with the compass</button>' +
            '<button onclick="XKDGPhotoSectors._clearRefs()" style="' + btn + 'border:1px solid #ccc;background:#fff;">Clear references</button>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;">' +
            '<span title="Indoor compasses are off by several degrees. Read the facing (e.g. the door) with your compass from the photo spot: the difference from the real facing corrects every other reading.">Compass correction ' +
            '<input id="xps-coff" type="number" step="0.1" value="0" style="width:60px;font-size:12px;" onchange="XKDGPhotoSectors._coff(this.value)">°</span>' +
            '<button onclick="XKDGPhotoSectors._coffFromFacing()" style="' + btn + 'border:1px solid #1565c0;background:#fff;color:#1565c0;">Set it from the facing</button>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:6px;">' +
            '<span>Boxes top <input type="range" min="0" max="95" value="38" oninput="XKDGPhotoSectors._box(\'t\',this.value)"></span>' +
            '<span>bottom <input type="range" min="5" max="100" value="62" oninput="XKDGPhotoSectors._box(\'b\',this.value)"></span>' +
            '<span>Add hexagram <input id="xps-add" type="number" min="1" max="64" style="width:50px;font-size:12px;"> <button onclick="XKDGPhotoSectors._add()" style="' + btn + 'border:1px solid #2e7d32;background:#fff;color:#2e7d32;">+</button></span>' +
            '<button onclick="XKDGPhotoSectors._save()" style="' + btn + 'background:#1565c0;color:#fff;border:none;">⬇ Save / share image</button>' +
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
    el('xps-canvas').addEventListener('click', onTap);
    modeButtons();
  }
  function modeButtons() {
    var a = el('xps-m-measure'), b = el('xps-m-ref'), w = el('xps-m-wall'); if (!a) return;
    w.style.background = S.mode === 'wall' ? '#1565c0' : '#fff'; w.style.color = S.mode === 'wall' ? '#fff' : '#1565c0'; w.style.border = '1px solid #1565c0';
    a.style.background = S.mode === 'measure' ? '#ffd600' : '#fff'; a.style.border = '1px solid #c9a800';
    b.style.background = S.mode === 'ref' ? '#1565c0' : '#fff'; b.style.color = S.mode === 'ref' ? '#fff' : '#1565c0'; b.style.border = '1px solid #1565c0';
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
    var ans = prompt('This wall runs toward which direction?\n(walls are the house facing ' + r1(base) + '° or ±90°/180°)\n\n' +
      dirs.map(function (d, i) { return (i + 1) + ' = ' + r1(d) + '°' + (i === 0 ? '   ← most likely' : ''); }).join('\n'), '1');
    if (ans === null) { hint(); draw(); return; }
    var i = parseInt(ans, 10); var deg = (i >= 1 && i <= 4) ? dirs[i - 1] : parseFloat(ans);
    if (!isFinite(deg)) { hint(); draw(); return; }
    S.refs.push({ x: vx, y: vy, deg: norm(deg), wall: true, lines: [[P[0], P[1]], [P[2], P[3]]] });
    S.mode = 'measure'; modeButtons(); hint(); draw();
    var c = el('xps-centre'); if (c) c.value = r1(S.cal.centre);
    var fi = el('xps-f35'); if (fi && S.refs.length >= 2) fi.value = r1(S.cal.f35);
  }
  function hint() {
    var h = el('xps-hint'); if (!h) return;
    var n = S.wallPts.length;
    if (S.mode === 'wall') h.innerHTML = ['Tap 2 points along a <b>horizontal edge</b> of a wall that runs away from you (e.g. the skirting board).',
      'Now the second point of that edge.',
      'Now 2 points along <b>another horizontal edge of the same wall</b> (e.g. where it meets the ceiling).',
      'Now the last point.'][n] || '';
    else if (S.mode === 'ref') h.textContent = 'Tap a point you have read with the compass from the photo spot (set the compass correction first).';
    else h.textContent = S.refs.length ? '' : 'Calibrate first: 🧱 Align to a wall (the walls follow the house facing).';
  }
  function loadFile(file) {
    if (!file) return;
    var fr = new FileReader();
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
        var ls = el('xps-lens'); ls.value = [13, 24, 48].indexOf(Math.round(S.f35)) >= 0 ? String(Math.round(S.f35)) : '';
        draw();
      };
      img.src = url;
    };
    fr.readAsArrayBuffer(file);
  }
  function save() {
    var cv = el('xps-canvas'); if (!cv) return;
    cv.toBlob(function (blob) {
      var name = 'sectors-' + (S.house.name || 'house').replace(/[^\w-]+/g, '_') + '.jpg';
      try {
        var file = new File([blob], name, { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function () {}); return; }
      } catch (e) {}
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { try { window.open(url, '_blank'); } catch (e) {} }, 300);
    }, 'image/jpeg', 0.9);
  }
  function close() { var m = el('xps-modal'); if (m) m.remove(); S = null; }

  window.XKDGPhotoSectors = {
    open: open, close: close,
    // pure helpers, reusable by the AI assistant (option C)
    candidates: candidates, readExif: readExif, yinYangRange: yinYangRange,
    _file: loadFile, _save: save,
    _facing: function (v) { if (v === '' || v == null) { var fi = el('xps-facing'); if (fi) fi.focus(); return; } setFacing(v); },
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
    _mode: function (m) { S.mode = m; S.wallPts = []; modeButtons(); hint(); if (S.img) draw(); },
    _clearRefs: function () { S.refs = []; S.wallPts = []; S.centre = parseFloat(el('xps-centre').value) || S.facing; draw(); },
    _box: function (w, v) { if (w === 't') S.boxTop = Math.min(+v / 100, S.boxBottom - 0.03); else S.boxBottom = Math.max(+v / 100, S.boxTop + 0.03); draw(); },
    _toggle: function (hex, on) { if (on) S.sel[hex] = true; else delete S.sel[hex]; draw(); },
    _add: function () { var n = parseInt(el('xps-add').value, 10); if (n >= 1 && n <= 64) { S.sel[n] = true; draw(); } }
  };
})();

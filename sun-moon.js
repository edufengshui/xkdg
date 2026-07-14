// ============================================================
// sun-moon.js
// "Sun arriving at mountain" (太陽到山) and "Moon arriving at
// mountain" (太陰到山) formulas.
//
// Every ~15 days, at each of the 24 JieQi (solar terms), the Sun
// moves ONE mountain counter-clockwise through the 24-mountain
// wheel, and the Moon moves one mountain clockwise. When the
// Sun/Moon is on a mountain that is a house's facing, OR on one of
// its two "perfect trine" (三合) partners — 8 mountain-positions
// before/after on the 24-mountain wheel, i.e. exactly 120° apart —
// that facing enters a ~15-day auspicious window (good for
// celebrations, invitations, important Feng Shui activations, new
// business, presentations/launches for offices).
//
// This module only ANSWERS "where is the Sun/Moon right now, and
// what are the 3 trine-mountains for each" — it does not judge any
// specific house on its own; that reading is the practitioner's.
//
// USO:
//   In index.html, dopo lunar.js e dopo app-fengshui.js:
//     <script src="sun-moon.js"></script>
//   Pulsante "☉/☾ Time" già presente nell'HTML del Luopan
//   (app-fengshui.js) chiama SunMoonMountain.toggle().
//   fsRedraw() chiama SunMoonMountain.drawIfOn(ctx,cx,cy,outerR,ROT)
//   in coda, così le icone restano visibili ad ogni ridisegno.
//
// DIPENDENZE:
//   • lunar-javascript (window.Lunar) — stesso motore JieQi usato
//     da buildJieqiMap() in app-bazi.js (True Solar Time altrove,
//     qui date civili semplici come nella tabella cartacea di Edu).
// ============================================================

(function () {
  'use strict';

  // 24 montagne in ordine di indice (stesso ordine/indice usato in
  // fs-chart-finder.js: idx*15-15 = grado centrale).
  var MTN_CHAR = [
    '\u58EC','\u5B50','\u7678','\u4E11','\u826E','\u5BC5',
    '\u7532','\u536F','\u4E59','\u8FB0','\u5DFD','\u5DF3',
    '\u4E19','\u5348','\u4E01','\u672A','\u5764','\u7533',
    '\u5E9A','\u9149','\u8F9B','\u620C','\u4E7E','\u4EA5'
  ];
  // Etichette posizione (地/天/人), stesso ordine di MTN_CHAR.
  var POS_LABEL = [
    'N1','N2','N3','NE1','NE2','NE3','E1','E2','E3','SE1','SE2','SE3',
    'S1','S2','S3','SW1','SW2','SW3','W1','W2','W3','NW1','NW2','NW3'
  ];
  function mtnIdx(ch){ return MTN_CHAR.indexOf(ch); }
  function mtnCenterDeg(idx){ return (idx * 15 - 15 + 360) % 360; }
  function mtnLabel(ch){
    var i = mtnIdx(ch);
    return i < 0 ? ch : (ch + ' ' + POS_LABEL[i]);
  }

  // ── SUN table (太陽到山) — JieQi name → mountain the Sun sits on
  // during that ~15-day window. Verified against Edu's photographed
  // table (image1) and cross-checked against lunar-javascript's own
  // JieQi dates (match within the usual ±1 day year-to-year drift).
  var SUN_MOUNTAIN_BY_JIEQI = {
    '\u7ACB\u6625':'\u58EC', '\u96E8\u6C34':'\u4EA5', '\u60CA\u86F0':'\u4E7E', '\u6625\u5206':'\u620C',
    '\u6E05\u660E':'\u8F9B', '\u8C37\u96E8':'\u9149', '\u7ACB\u590F':'\u5E9A', '\u5C0F\u6EE1':'\u7533',
    '\u8292\u79CD':'\u5764', '\u590F\u81F3':'\u672A', '\u5C0F\u6691':'\u4E01', '\u5927\u6691':'\u5348',
    '\u7ACB\u79CB':'\u4E19', '\u5904\u6691':'\u5DF3', '\u767D\u9732':'\u5DFD', '\u79CB\u5206':'\u8FB0',
    '\u5BD2\u9732':'\u4E59', '\u971C\u964D':'\u536F', '\u7ACB\u51AC':'\u7532', '\u5C0F\u96EA':'\u5BC5',
    '\u5927\u96EA':'\u826E', '\u51AC\u81F3':'\u4E11', '\u5C0F\u5BD2':'\u7678', '\u5927\u5BD2':'\u5B50'
  };
  // ── MOON table (太陰到山) — same 24 JieQi windows, mountain the
  // Moon sits on (opposite rotation direction). Verified against
  // Edu's photographed table (image2).
  var MOON_MOUNTAIN_BY_JIEQI = {
    '\u5927\u96EA':'\u58EC', '\u51AC\u81F3':'\u5B50', '\u5C0F\u5BD2':'\u7678', '\u5927\u5BD2':'\u4E11',
    '\u7ACB\u6625':'\u826E', '\u96E8\u6C34':'\u5BC5', '\u60CA\u86F0':'\u7532', '\u6625\u5206':'\u536F',
    '\u6E05\u660E':'\u4E59', '\u8C37\u96E8':'\u8FB0', '\u7ACB\u590F':'\u5DFD', '\u5C0F\u6EE1':'\u5DF3',
    '\u8292\u79CD':'\u4E19', '\u590F\u81F3':'\u5348', '\u5C0F\u6691':'\u4E01', '\u5927\u6691':'\u672A',
    '\u7ACB\u79CB':'\u5764', '\u5904\u6691':'\u7533', '\u767D\u9732':'\u5E9A', '\u79CB\u5206':'\u9149',
    '\u5BD2\u9732':'\u8F9B', '\u971C\u964D':'\u620C', '\u7ACB\u51AC':'\u4E7E', '\u5C0F\u96EA':'\u4EA5'
  };
  // Reverse lookups: mountain → JieQi name (for showing a trine
  // partner's OWN yearly window, since it is a different date than
  // "now").
  function reverseMap(m){
    var r = {};
    for (var k in m) r[m[k]] = k;
    return r;
  }
  var SUN_JIEQI_BY_MOUNTAIN  = reverseMap(SUN_MOUNTAIN_BY_JIEQI);
  var MOON_JIEQI_BY_MOUNTAIN = reverseMap(MOON_MOUNTAIN_BY_JIEQI);

  // Some lunar-javascript years expose 6-7 JieQi keys romanized
  // (year-boundary overlap entries) instead of Chinese; normalize.
  var ROMAN2CN = {
    DA_XUE:'\u5927\u96EA', DONG_ZHI:'\u51AC\u81F3', XIAO_HAN:'\u5C0F\u5BD2', DA_HAN:'\u5927\u5BD2',
    LI_CHUN:'\u7ACB\u6625', YU_SHUI:'\u96E8\u6C34', JING_ZHE:'\u60CA\u86F0'
  };
  function normKey(k){ return ROMAN2CN[k] || k; }

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Build & cache the sorted JieQi event list spanning year-1..year+1
  // (civil dates from lunar-javascript, no TST — same simplification
  // as Edu's printed reference table).
  var _cache = {}; // year -> sorted events[]
  function eventsForWindow(year){
    if (_cache[year]) return _cache[year];
    if (typeof Lunar === 'undefined') return null;
    var out = [];
    [year - 1, year, year + 1].forEach(function (y) {
      var table = Lunar.fromYmd(y, 1, 1).getJieQiTable();
      for (var k in table) {
        var s = table[k];
        out.push({ name: normKey(k), y: s.getYear(), mo: s.getMonth(), d: s.getDay(), h: s.getHour(), mi: s.getMinute() });
      }
    });
    var seen = {};
    out = out.filter(function (e) {
      var key = e.y + '-' + e.mo + '-' + e.d + '-' + e.name;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    out.forEach(function (e) { e.ts = new Date(e.y, e.mo - 1, e.d, e.h, e.mi).getTime(); });
    out.sort(function (a, b) { return a.ts - b.ts; });
    _cache[year] = out;
    return out;
  }

  // Current JieQi (the most recent one at/ before refDate).
  function currentJieqi(refDate){
    var events = eventsForWindow(refDate.getFullYear());
    if (!events) return null;
    var refTs = refDate.getTime(), cur = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].ts <= refTs) cur = events[i]; else break;
    }
    return cur;
  }

  // Calendar window "D Mon – D Mon" for a given entry (from its own
  // start to the next entry's start), no year shown — matches the
  // style of Edu's printed table.
  function rangeLabelForEntry(entry, events){
    var idx = events.indexOf(entry);
    var next = events[(idx + 1) % events.length];
    return entry.d + ' ' + MONTHS[entry.mo - 1] + ' \u2013 ' + next.d + ' ' + MONTHS[next.mo - 1];
  }

  // Window label for an arbitrary JieQi NAME, choosing whichever
  // yearly occurrence (within the cached window) is closest to refDate.
  function rangeLabelForName(jieqiName, refDate, events){
    var refTs = refDate.getTime(), best = null, bestDelta = Infinity;
    events.forEach(function (e) {
      if (e.name !== jieqiName) return;
      var delta = Math.abs(e.ts - refTs);
      if (delta < bestDelta) { bestDelta = delta; best = e; }
    });
    if (!best) return '';
    return rangeLabelForEntry(best, events);
  }

  // Trine group (三合, ±8 positions = 120°) — applies to all 24
  // mountains alike (stems, branches, trigrams). Returns [self, +8, -8].
  function trineGroup(mtnChar){
    var idx = mtnIdx(mtnChar);
    if (idx < 0) return [mtnChar];
    return [mtnChar, MTN_CHAR[(idx + 8) % 24], MTN_CHAR[(idx + 16) % 24]];
  }

  function computeCurrent(refDate){
    refDate = refDate || new Date();
    if (typeof Lunar === 'undefined') return null;
    var events = eventsForWindow(refDate.getFullYear());
    var cur = currentJieqi(refDate);
    if (!events || !cur) return null;

    var sunMtn  = SUN_MOUNTAIN_BY_JIEQI[cur.name];
    var moonMtn = MOON_MOUNTAIN_BY_JIEQI[cur.name];
    if (!sunMtn || !moonMtn) return null;

    var nowRange = rangeLabelForEntry(cur, events);

    function trio(mainMtn, reverseMap){
      var group = trineGroup(mainMtn); // [main, +8, -8]
      return group.map(function (m, i) {
        var range = (i === 0) ? nowRange : rangeLabelForName(reverseMap[m], refDate, events);
        return { mountain: m, label: mtnLabel(m), range: range };
      });
    }

    return {
      jieqiName: cur.name,
      sun:  { mountain: sunMtn,  label: mtnLabel(sunMtn),  range: nowRange, trio: trio(sunMtn,  SUN_JIEQI_BY_MOUNTAIN)  },
      moon: { mountain: moonMtn, label: mtnLabel(moonMtn), range: nowRange, trio: trio(moonMtn, MOON_JIEQI_BY_MOUNTAIN) }
    };
  }

  function popupText(info){
    if (!info) return 'Sun/Moon Mountain: data unavailable (lunar-javascript not loaded).';
    var sunTxt  = info.sun.trio.map(function (t) { return t.label + ' (' + t.range + ')'; }).join(', ');
    var moonTxt = info.moon.trio.map(function (t) { return t.label + ' (' + t.range + ')'; }).join(', ');
    return '\u2600\uFE0F Sun at ' + sunTxt + '\n\uD83C\uDF19 Moon at ' + moonTxt;
  }

  // ── UI: toggle state, popup, canvas overlay ────────────────────
  var _on = false;

  function showPopup(text){
    var old = document.getElementById('sunmoon-popup');
    if (old) old.remove();
    var box = document.createElement('div');
    box.id = 'sunmoon-popup';
    box.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);' +
      'background:#1a1008;color:#fff8e1;border:1px solid #c9a84c;border-radius:8px;' +
      'padding:12px 16px;font-size:13px;line-height:1.5;z-index:9999;max-width:90vw;' +
      'white-space:pre-line;box-shadow:0 4px 16px rgba(0,0,0,.4);text-align:center;';
    box.textContent = text;
    var close = document.createElement('div');
    close.textContent = '\u2715';
    close.style.cssText = 'position:absolute;top:2px;right:8px;cursor:pointer;color:#c9a84c;font-weight:bold;';
    close.onclick = function () { box.remove(); };
    box.appendChild(close);
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.remove(); }, 9000);
  }

  function toggle(){
    _on = !_on;
    var btn = document.getElementById('fs-sunmoon-toggle');
    if (btn) {
      btn.textContent = _on ? '\u2600\uFE0F\uD83C\uDF19 Time ON' : '\u2600\uFE0F\uD83C\uDF19 Time';
      btn.style.background = _on ? '#4527a0' : '#fff';
      btn.style.color = _on ? '#fff' : '#4527a0';
    }
    if (_on) {
      var info = computeCurrent();
      showPopup(popupText(info));
    } else {
      var old = document.getElementById('sunmoon-popup');
      if (old) old.remove();
    }
    if (typeof fsRedraw === 'function') fsRedraw();
  }

  // Called by fsRedraw() at the end of its draw pass. Draws two small
  // markers (☀️/🌙) on the mountains where Sun/Moon sit right now.
  function drawIfOn(ctx, cx, cy, outerR, ROT){
    if (!_on || !ctx) return;
    try {
      var info = computeCurrent();
      if (!info) return;
      var ang = function (deg) { return (deg - 270 + (ROT || 0)) * Math.PI / 180; };
      // Just past the star blocks (which sit roughly at outerR+15..+95),
      // near the outer edge of the whole luopan drawing.
      var r = outerR + 95;
      var W = (ctx.canvas && ctx.canvas.width)  || (cx * 2);
      var H = (ctx.canvas && ctx.canvas.height) || (cy * 2);
      var pad = 20; // half marker size + small margin, same pattern as the arrow labels
      function marker(mtnChar, emoji, color, nudge){
        var idx = mtnIdx(mtnChar);
        if (idx < 0) return;
        var a = ang(mtnCenterDeg(idx));
        var rr = r + nudge;
        var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        x = Math.max(pad, Math.min(W - pad, x));
        y = Math.max(pad, Math.min(H - pad, y));
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke();
        ctx.font = '17px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y + 1);
        ctx.restore();
      }
      // Small radial offset if Sun and Moon land on the same mountain.
      var same = info.sun.mountain === info.moon.mountain;
      marker(info.sun.mountain,  '\u2600\uFE0F', '#e65100', same ? -14 : 0);
      marker(info.moon.mountain, '\uD83C\uDF19', '#1a237e', same ?  14 : 0);
    } catch (e) { console.warn('SunMoonMountain.drawIfOn', e); }
  }

  window.SunMoonMountain = {
    toggle: toggle,
    drawIfOn: drawIfOn,
    computeCurrent: computeCurrent,   // exposed for future re-use (e.g. an all-houses scan)
    trineGroup: trineGroup,
    isOn: function () { return _on; }
  };
})();

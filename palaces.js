// ═══════════════════════════════════════════════════════════════
//  ⌂ PALACES (session 49, Edu)
//
//  Palace number of a pillar = Early Heaven number of the LOWER trigram of its
//  hexagram (Qian 9, Dui 4, Li 3, Zhen 8, Xun 2, Kan 7, Gen 6, Kun 1) = the
//  sector of the luopan where that hexagram sits. Relations as for Elements and
//  Periods: 5/10/15, Hetu, same number; a sum or Hetu pair is cancelled by a
//  branch clash; a pillar with no number link still communicates if it shares a
//  family with another pillar (xkdgPalaceComm in app-bazi.js).
//
//  1. Option "⌂ Palaces" (one switch, remembered on the device) beside
//     "⬡ XKDG RELATIONS" of the DATE and of PERSON A / B: shows the palace
//     numbers and which relations they make.
//  2. Palaces are Earth energy, close to Feng Shui: when a pillar is isolated the
//     app says which luopan hexagram to use — Zheng Shen (facing / door / bed /
//     desk) or Ling Shen (water). Shown in the 👤 PERSON tab and in the luopan
//     ☰ → 🌿 Cure panel (always there, the switch does not hide it).
//  A palace cure never enters the remedy rules of Elements / Periods.
// ═══════════════════════════════════════════════════════════════
(function () {
  var KEY = 'xkdgPalaces';
  var TRI = { 9: 'Qian', 4: 'Dui', 3: 'Li', 8: 'Zhen', 2: 'Xun', 7: 'Kan', 6: 'Gen', 1: 'Kun' };
  var XT = { 7: 9, 3: 4, 5: 3, 1: 8, 6: 2, 2: 7, 4: 6, 0: 1 };
  var L = { hour: 'Hour', day: 'Day', month: 'Month', year: 'Year' };
  var K4 = ['hour', 'day', 'month', 'year'];

  function isOn() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function palOfHex(h) { var b = (typeof _XK_HEXBIN !== 'undefined') ? _XK_HEXBIN[h] : null; return b == null ? null : XT[b & 7]; }
  function famsOfPillar(p) { try { return _xkdgResolvedFamilyEntries(p).map(function (e) { return e.family; }); } catch (e) { return []; } }
  function famsOfHex(h) { try { return (typeof getHexFamilies === 'function') ? (getHexFamilies(h) || []) : []; } catch (e) { return []; } }
  function clashes(a, b) { return !!(a && b && typeof BRANCH_CLASHES !== 'undefined' && (BRANCH_CLASHES[a] === b || BRANCH_CLASHES[b] === a)); }

  // Every palace relation of a chart: values, pairs (with clashes), family links, isolated pillars.
  function relations(P) {
    var pc = (typeof xkdgPalaceComm === 'function') ? xkdgPalaceComm(P) : null;
    if (!pc) return null;
    var Q = {}; pc.values.forEach(function (v) { Q[v.pillar] = Object.assign({}, P[v.pillar], { pal: v.value }); });
    var keys = pc.values.map(function (v) { return v.pillar; }), pairs = [];
    for (var i = 0; i < keys.length; i++) for (var j = i + 1; j < keys.length; j++) {
      var r = _xkdgPairRel(Q, keys[i], keys[j], 'pal'); if (!r) continue;
      pairs.push({ a: keys[i], b: keys[j], lang: r.lang, txt: r.txt, cancelled: !!r.cancelled,
                   clash: r.cancelled ? (P[keys[i]].branch + '-' + P[keys[j]].branch) : null });
    }
    pc.pairs = pairs;
    return pc;
  }

  // The luopan hexagrams that take an isolated pillar out of isolation.
  //  - number link: its palace links the isolated pillar in the language the other pillars speak
  //    (Adding 5/10/15 or Hetu) or with the same number; no branch clash for a sum / Hetu;
  //  - ★ family: it shares a family with the isolated pillar.
  // Each hexagram is marked Zheng Shen and/or Ling Shen (period of the luopan).
  function cures(P) {
    var pc = relations(P);
    if (!pc || pc.good || typeof FS_SLOTS === 'undefined') return pc ? { pc: pc, groups: [] } : null;
    var iso = pc.isolated, isoK = iso.map(function (x) { return x.pillar; });
    var net = pc.values.filter(function (v) { return isoK.indexOf(v.pillar) < 0; }).map(function (v) { return v.value; });
    var lang = _xkdgSettingLang(net);
    var link = function (v, x) { return v === x ? 'same number' : _xkdgRelIn(lang, v, x); };
    var NUM = [1, 2, 3, 4, 6, 7, 8, 9];
    // targets: one group for all isolated pillars when one number does it, else one per pillar
    var all = NUM.filter(function (v) { return iso.every(function (x) { return link(v, x.value); }); });
    var targets = all.length ? [{ pillars: iso, nums: all }]
                 : iso.map(function (x) { return { pillars: [x], nums: NUM.filter(function (v) { return link(v, x.value); }) }; });
    var used = {};
    var slotOf = function (s, extra) {
      var jz = (typeof _xkdgJzOfHex === 'function') ? _xkdgJzOfHex(s.hexNum) : null;
      return Object.assign({ hex: s.hexNum, idx: s.idx, deg: Math.round(s.centerDeg * 10) / 10, branch: jz && jz.branch,
        zs: (typeof fsIsZhengShen === 'function') && !!fsIsZhengShen(s.yun), ls: (typeof fsIsLingShen === 'function') && !!fsIsLingShen(s.yun) }, extra || {});
    };
    var groups = targets.map(function (t) {
      var g = { pillars: t.pillars, byNum: [], family: [] };
      t.nums.forEach(function (v) {
        var talks = pc.values.filter(function (w) { return isoK.indexOf(w.pillar) < 0 && _xkdgTalk(v, w.value); }).map(function (w) { return w.pillar; });
        var row = { pal: v, tri: TRI[v], rel: t.pillars.map(function (x) { var r = link(v, x.value); return L[x.pillar] + ' ' + x.value + ': ' + (r === 'same number' ? 'same number ' + v : r); }), talks: talks, hexes: [] };
        FS_SLOTS.forEach(function (s) {
          if (palOfHex(s.hexNum) !== v) return;
          if (t.pillars.some(function (x) { return P[x.pillar] && P[x.pillar].hex === s.hexNum; })) return;     // the same hexagram is that pillar again
          var e = slotOf(s);
          if (t.pillars.some(function (x) { return v !== x.value && clashes(e.branch, P[x.pillar].branch); })) return;   // clash cancels the link
          if (!e.zs && !e.ls) return;
          row.hexes.push(e); used[s.hexNum + '|' + t.pillars.map(function (x) { return x.pillar; }).join()] = 1;
        });
        if (row.hexes.length) g.byNum.push(row);
      });
      g.byNum.sort(function (a, b) { return b.talks.length - a.talks.length; });   // the ones that also join the chart first
      var fk = t.pillars.map(function (x) { return famsOfPillar(P[x.pillar]); });
      FS_SLOTS.forEach(function (s) {
        if (used[s.hexNum + '|' + t.pillars.map(function (x) { return x.pillar; }).join()]) return;
        if (t.pillars.some(function (x) { return P[x.pillar] && P[x.pillar].hex === s.hexNum; })) return;
        var hf = famsOfHex(s.hexNum), shared = fk.map(function (f) { return f.filter(function (m) { return hf.indexOf(m) >= 0; })[0]; });
        if (shared.some(function (m) { return !m; })) return;
        var e = slotOf(s, { pal: palOfHex(s.hexNum), family: shared[0] });
        if (e.zs || e.ls) g.family.push(e);
      });
      return g;
    });
    return { pc: pc, lang: lang, groups: groups };
  }

  // ── HTML ────────────────────────────────────────────────────────
  function relText(pc) {
    var bits = [];
    var ok = pc.pairs.filter(function (p) { return !p.cancelled; }), ko = pc.pairs.filter(function (p) { return p.cancelled; });
    if (ok.length) bits.push(ok.map(function (p) { return L[p.a] + ' + ' + L[p.b] + ' (' + (p.lang === 'eq' ? 'same number ' + p.txt.split(' ')[0] : p.txt) + ')'; }).join(' · '));
    if (ko.length) bits.push('<span style="color:#c62828;">⚡ ' + ko.map(function (p) { return L[p.a] + ' + ' + L[p.b] + ' (' + p.txt + ') cancelled by the clash ' + p.clash; }).join(' · ') + '</span>');
    pc.by_family.forEach(function (x) { bits.push(L[x.pillar] + ' ' + x.value + ' has no number link but communicates with the ' + L[x.with] + ' through the ' + x.family + ' family'); });
    if (!ok.length && !pc.by_family.length && !ko.length) bits.push('no pillar talks with another');
    return bits.join('; ');
  }
  function relHtml(P, opts) {
    opts = opts || {};
    var pc = relations(P); if (!pc) return '';
    var nums = pc.values.map(function (v) { return '<b>' + L[v.pillar] + ' ' + v.value + '</b> <span style="color:#888;">' + TRI[v.value] + '</span>'; }).join(' · ');
    var h = '<div class="xk-pal" style="font-size:12px;margin-top:6px;padding:5px 8px;border-radius:8px;border:1px solid ' + (pc.good ? '#a5d6a7;background:#f1f8e9' : '#d7ccc8;background:#efebe9') + ';">'
      + '<div><b>⌂ Palaces</b> <span style="color:#888;">(minor — Earth, Feng Shui)</span>: ' + nums + '</div>'
      + '<div style="margin-top:2px;">' + relText(pc) + '.</div>'
      + '<div style="margin-top:2px;font-weight:bold;color:' + (pc.good ? '#2e7d32' : '#c62828') + ';">'
      + (pc.good ? '✓ All palaces communicate.' : pc.isolated.map(function (x) { return L[x.pillar] + ' (' + x.value + ')'; }).join(', ') + ' isolated.') + '</div>';
    if (!pc.good && opts.cure) {
      // short line here: which palace numbers cure; the ZS / LS hexagrams are in the 👤 PERSON tab
      var c = cures(P), short = [];
      if (c) c.groups.forEach(function (g) {
        var nums = g.byNum.map(function (r) { return r.pal + ' ' + r.tri; });
        if (g.family.length) nums.push('★ shared family');
        if (nums.length) short.push((c.groups.length > 1 ? L[g.pillars[0].pillar] + ': ' : '') + nums.join(', '));
      });
      if (short.length) h += '<div style="margin-top:2px;color:#4e342e;">🧭 Feng Shui cure — a hexagram in palace ' + short.join(' · ') + '. Which <b>正 Zheng Shen</b> / <b>零 Ling Shen</b> hexagram: <b>👤 PERSON</b> tab or luopan ☰ → 🌿 Cure.</div>';
    }
    return h + '</div>';
  }
  function hexChip(e, scan, role) {
    var t = 'hex ' + e.hex + ' <span style="color:#888;">' + e.deg.toFixed(1) + '°</span>' + (e.family ? ' <span style="color:#6a1b9a;">★' + e.family + '</span>' : '');
    var st = 'display:inline-block;white-space:nowrap;margin:2px 4px 0 0;padding:1px 7px;border-radius:9px;border:1px solid ' + (role === 'ls' ? '#90caf9' : '#ef9a9a') + ';background:#fff;';
    return scan ? '<span onclick="fsHexFilterScan(' + e.idx + ')" title="Tap: matching dates for this hexagram" style="cursor:pointer;' + st + '">' + t + '</span>'
                : '<span style="' + st + '">' + t + '</span>';
  }
  // Full cure block: for the 👤 PERSON tab and the luopan 🌿 Cure panel.
  function cureHtml(P, name, scan) {
    var c = cures(P); if (!c || !c.pc || c.pc.good) return '';
    var h = '<div style="margin:6px 0;padding:6px 8px;border-radius:8px;border:1px solid #bcaaa4;background:#efebe9;font-size:12px;">'
      + '<div style="font-weight:bold;color:#4e342e;">⌂ Palaces' + (name ? ' — ' + name : '') + ': ' + c.pc.isolated.map(function (x) { return L[x.pillar] + ' (' + x.value + ')'; }).join(', ') + ' isolated</div>'
      + '<div style="color:#6d4c41;">' + c.pc.values.map(function (v) { return L[v.pillar] + ' ' + v.value; }).join(' · ') + ' — ' + relText(c.pc) + '. Palaces are Earth energy: the cure is a luopan hexagram, '
      + '<b style="color:#c62828;">正 Zheng Shen</b> (facing, door, bed, desk) or <b style="color:#1565c0;">零 Ling Shen</b> (water).</div>';
    var any = false;
    c.groups.forEach(function (g) {
      if (c.groups.length > 1) h += '<div style="margin-top:5px;font-weight:bold;">For the ' + L[g.pillars[0].pillar] + ' (' + g.pillars[0].value + '):</div>';
      g.byNum.forEach(function (r) {
        any = true;
        var zs = r.hexes.filter(function (e) { return e.zs; }), ls = r.hexes.filter(function (e) { return e.ls; });
        h += '<div style="margin-top:5px;"><b>Palace ' + r.pal + ' ' + r.tri + '</b> — ' + r.rel.join(', ')
          + (r.talks.length ? ' <span style="color:#2e7d32;">(it also talks with ' + r.talks.map(function (k) { return L[k]; }).join(', ') + ')</span>' : '') + '</div>';
        if (zs.length) h += '<div style="margin-left:8px;"><b style="color:#c62828;">正 ZS</b> ' + zs.map(function (e) { return hexChip(e, scan, 'zs'); }).join('') + '</div>';
        if (ls.length) h += '<div style="margin-left:8px;"><b style="color:#1565c0;">零 LS</b> ' + ls.map(function (e) { return hexChip(e, scan, 'ls'); }).join('') + '</div>';
      });
      if (g.family.length) {
        any = true;
        var fz = g.family.filter(function (e) { return e.zs; }), fl = g.family.filter(function (e) { return e.ls; });
        h += '<div style="margin-top:5px;color:#4a148c;"><b>★ Family</b> — no number link, it communicates through the shared family</div>';
        if (fz.length) h += '<div style="margin-left:8px;"><b style="color:#c62828;">正 ZS</b> ' + fz.map(function (e) { return hexChip(e, scan, 'zs'); }).join('') + '</div>';
        if (fl.length) h += '<div style="margin-left:8px;"><b style="color:#1565c0;">零 LS</b> ' + fl.map(function (e) { return hexChip(e, scan, 'ls'); }).join('') + '</div>';
      }
    });
    if (!any) h += '<div style="margin-top:4px;color:#c62828;">No luopan hexagram links the isolated palace in this period.</div>';
    h += '<div style="margin-top:4px;color:#888;font-size:10px;">Minor dimension: it does not change the cures of Elements and Periods.' + (scan ? ' Tap a hexagram to see its matching dates.' : '') + '</div>';
    return h + '</div>';
  }

  // ── The switch ──────────────────────────────────────────────────
  function btnHtml(id) {
    var on = isOn();
    return '<button type="button" id="' + id + '" onclick="xkdgTogglePalaces()" title="Show the palace numbers and their relations (Feng Shui)" style="font-size:10px;padding:2px 8px;border-radius:10px;cursor:pointer;margin-left:auto;margin-right:4px;border:1px solid '
      + (on ? '#8d6e63;background:#efebe9;color:#4e342e;' : '#bbb;background:#f5f5f5;color:#555;') + '">⌂ Palaces ' + (on ? 'ON' : 'OFF') + '</button>';
  }
  function placeButtons() {
    [['#analysis-section h3', 'xk-pal-btn-date', null], ['#person-analysis-a h3', 'xk-pal-btn-a', '#toggle-stars-a'], ['#person-analysis-b h3', 'xk-pal-btn-b', '#toggle-stars-b']].forEach(function (s) {
      var h3 = document.querySelector(s[0]); if (!h3) return;
      var old = document.getElementById(s[1]);
      var tmp = document.createElement('span'); tmp.innerHTML = btnHtml(s[1]); var b = tmp.firstChild;
      if (old) { old.replaceWith(b); return; }
      h3.style.display = 'flex'; h3.style.alignItems = 'center'; h3.style.justifyContent = 'flex-start';
      var st = s[2] ? document.querySelector(s[2]) : null;
      if (st && st.parentNode === h3) h3.insertBefore(b, st); else { b.style.marginRight = '0'; h3.appendChild(b); }
    });
  }
  function refresh() {
    placeButtons();
    try { renderDatePalaces(); } catch (e) {}
    try {
      if (typeof _personAPillars !== 'undefined' && _personAPillars) { var a = document.getElementById('person-gaps-a'); if (a) a.innerHTML = xkdgGapsHtml(xkdgPersonGaps(_personAPillars)); }
      if (typeof _personBPillars !== 'undefined' && _personBPillars) { var b = document.getElementById('person-gaps-b'); if (b) b.innerHTML = xkdgGapsHtml(xkdgPersonGaps(_personBPillars)); }
    } catch (e) {}
  }
  function renderDatePalaces() {
    var col = document.querySelector('#analysis-section .analysis-items-col'); if (!col) return;
    var box = document.getElementById('date-palaces');
    if (!box) { box = document.createElement('div'); box.id = 'date-palaces'; col.appendChild(box); }
    box.innerHTML = (isOn() && window._xkdgDateP) ? relHtml(window._xkdgDateP) : '';
  }

  window.xkdgTogglePalaces = function () {
    try { localStorage.setItem(KEY, isOn() ? '0' : '1'); } catch (e) {}
    refresh();
  };
  window.xkdgPalacesOn = isOn;
  window.xkdgPalaceRelations = relations;
  window.xkdgPalaceCures = cures;
  window.xkdgPalaceRelHtml = relHtml;
  window.xkdgPalaceCureHtml = cureHtml;
  window.xkdgRenderDatePalaces = renderDatePalaces;
  window.xkdgPalaceButtons = placeButtons;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', placeButtons); else placeButtons();
})();

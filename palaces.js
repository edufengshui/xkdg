// ═══════════════════════════════════════════════════════════════
//  ⌂ PALACES (session 49, Edu)
//
//  Palace number of a pillar = Early Heaven number of the LOWER trigram of its
//  hexagram (Qian 9, Dui 4, Li 3, Zhen 8, Xun 2, Kan 7, Gen 6, Kun 1) = the
//  sector of the luopan where that hexagram sits. Relations as for Elements and
//  Periods: 5/10/15, Hetu (the same number counts only between two persons, not
//  inside one chart - Edu, session 49); a sum or Hetu pair is cancelled by a
//  branch clash; a pillar with no number link still communicates if it shares a
//  family with another pillar (xkdgPalaceComm in app-bazi.js).
//
//  1. Option "⌂ Palaces" (one switch, ON by default, remembered on the device): a compact
//     full-width strip under the XKDG RELATIONS of the DATE and of PERSON A / B with the
//     palace numbers and their relations; the ON/OFF chip is in the strip itself.
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

  function isOn() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }   // OFF until the left toggle turns it on (Edu, session 49b)
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
      var r = _xkdgPairRel(Q, keys[i], keys[j], 'pal'); if (!r || r.lang === 'eq') continue;   // same number: only between two persons (Edu)
      pairs.push({ a: keys[i], b: keys[j], lang: r.lang, txt: r.txt, cancelled: !!r.cancelled,
                   clash: r.cancelled ? (P[keys[i]].branch + '-' + P[keys[j]].branch) : null });
    }
    pc.pairs = pairs;
    return pc;
  }

  // The luopan hexagrams that take an isolated pillar out of isolation.
  //  - number link: its palace links the isolated pillar in the language the other pillars speak
  //    (Adding 5/10/15 or Hetu) — not the same number (Edu); no branch clash;
  //  - ★ family: it shares a family with the isolated pillar.
  // Each hexagram is marked Zheng Shen and/or Ling Shen (period of the luopan).
  function cures(P) {
    var pc = relations(P);
    if (!pc || pc.good || typeof FS_SLOTS === 'undefined') return pc ? { pc: pc, groups: [] } : null;
    var iso = pc.isolated, isoK = iso.map(function (x) { return x.pillar; });
    var net = pc.values.filter(function (v) { return isoK.indexOf(v.pillar) < 0; }).map(function (v) { return v.value; });
    var lang = _xkdgSettingLang(net);
    var link = function (v, x) { return _xkdgRelIn(lang, v, x); };   // Edu: the same number is NOT a cure, only 5/10/15 or Hetu
    var NUM = [1, 2, 3, 4, 6, 7, 8, 9];
    // targets: one group for all isolated pillars when one number does it, else one per pillar
    var all = NUM.filter(function (v) { return iso.every(function (x) { return link(v, x.value); }); });
    var targets = all.length ? [{ pillars: iso, nums: all }]
                 : Object.values(iso.reduce(function (m, x) { (m[x.value] = m[x.value] || []).push(x); return m; }, {}))   // one group per isolated value
                     .map(function (ps) { return { pillars: ps, nums: NUM.filter(function (v) { return link(v, ps[0].value); }) }; });
    var used = {};
    var slotOf = function (s, extra) {
      var jz = (typeof _xkdgJzOfHex === 'function') ? _xkdgJzOfHex(s.hexNum) : null;
      return Object.assign({ hex: s.hexNum, idx: s.idx, deg: Math.round(s.centerDeg * 10) / 10, branch: jz && jz.branch,
        zs: (typeof fsIsZhengShen === 'function') && !!fsIsZhengShen(s.yun), ls: (typeof fsIsLingShen === 'function') && !!fsIsLingShen(s.yun) }, extra || {});
    };
    var groups = targets.map(function (t) {
      var g = { pillars: t.pillars, byNum: [], family: [] };
      t.nums.forEach(function (v) {
        var talks = pc.values.filter(function (w) { var r = _xkdgRel(v, w.value); return isoK.indexOf(w.pillar) < 0 && r && r.lang !== 'eq'; }).map(function (w) { return w.pillar; });
        var row = { pal: v, tri: TRI[v], rel: t.pillars.map(function (x) { var r = link(v, x.value); return L[x.pillar] + ' ' + x.value + ': ' + r; }), talks: talks, hexes: [] };
        FS_SLOTS.forEach(function (s) {
          if (palOfHex(s.hexNum) !== v) return;
          if (t.pillars.some(function (x) { return P[x.pillar] && P[x.pillar].hex === s.hexNum; })) return;     // the same hexagram is that pillar again
          var e = slotOf(s);
          if (t.pillars.some(function (x) { return clashes(e.branch, P[x.pillar].branch); })) return;   // clash cancels the link
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
    var bits = [], seen = {};
    pc.pairs.forEach(function (p) {
      bits.push(p.cancelled ? '<span style="color:#c98b8b;">⚡' + L[p.a] + '+' + L[p.b] + ' ' + p.txt + ' (' + p.clash + ')</span>'
                            : L[p.a] + '+' + L[p.b] + ' ' + p.txt);
    });
    pc.by_family.forEach(function (x) {
      var k = [x.pillar, x.with].sort().join('|'); if (seen[k]) return; seen[k] = 1;
      bits.push(L[x.pillar] + '+' + L[x.with] + ' ' + x.family);
    });
    return bits.length ? bits.join(' · ') : 'no link';
  }
  // The palace setting, one small row (only with the toggle ON).
  function lineHtml(P, person) {
    var pc = relations(P); if (!pc) return '';
    var end = pc.good ? '<span style="color:#7cb342;">✓</span>'
      : '<span style="color:#c98b8b;">✕ ' + pc.isolated.map(function (x) { return L[x.pillar]; }).join(', ') + '</span>';
    if (!pc.good && person) {
      var c = cures(P), parts = [];
      if (c) c.groups.forEach(function (g) {
        var ns = g.byNum.map(function (r) { return r.pal; }); if (!ns.length) return;
        parts.push((c.groups.length > 1 ? g.pillars.map(function (x) { return L[x.pillar]; }).join('+') + ' ' : '') + '⌂' + ns.join('/'));
      });
      if (parts.length) end += ' · cure ' + parts.join(', ') + ' (ZS/LS in 👤)';
    }
    return '⌂ Palaces: ' + relText(pc) + ' — ' + end;
  }
  function hexChip(e, scan, role) {
    var t = 'hex ' + e.hex + ' <span style="color:#888;">' + e.deg.toFixed(1) + '°</span>' + (e.family ? ' <span style="color:#6a1b9a;">★' + e.family + '</span>' : '');
    var st = 'display:inline-block;white-space:nowrap;margin:2px 4px 0 0;padding:1px 7px;border-radius:9px;border:1px solid ' + (role === 'ls' ? '#90caf9' : '#ef9a9a') + ';background:#fff;';
    return scan ? '<span onclick="fsHexFilterScan(' + e.idx + ')" title="Tap: matching dates for this hexagram" style="cursor:pointer;' + st + '">' + t + '</span>'
                : '<span style="' + st + '">' + t + '</span>';
  }
  // Full cure block: for the 👤 PERSON tab and the luopan 🌿 Cure panel.
  function cureHtml(P, name, scan) {
    if (!isOn()) return '';
    var c = cures(P); if (!c || !c.pc || c.pc.good) return '';
    var h = '<div style="margin:6px 0;padding:6px 8px;border-radius:8px;border:1px solid #bcaaa4;background:#efebe9;font-size:12px;">'
      + '<div style="font-weight:bold;color:#4e342e;">⌂ Palaces' + (name ? ' — ' + name : '') + ': ' + c.pc.isolated.map(function (x) { return L[x.pillar] + ' (' + x.value + ')'; }).join(', ') + ' isolated</div>'
      + '<div style="color:#6d4c41;">' + c.pc.values.map(function (v) { return L[v.pillar] + ' ' + v.value; }).join(' · ') + ' — ' + relText(c.pc) + '. Palaces are Earth energy: the cure is a luopan hexagram, '
      + '<b style="color:#c62828;">正 Zheng Shen</b> (facing, door, bed, desk) or <b style="color:#1565c0;">零 Ling Shen</b> (water).</div>';
    var any = false;
    c.groups.forEach(function (g) {
      if (c.groups.length > 1) h += '<div style="margin-top:5px;font-weight:bold;">For the ' + g.pillars.map(function (x) { return L[x.pillar]; }).join(', ') + ' (' + g.pillars[0].value + '):</div>';
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

  // ── Between TWO persons (Edu, session 49): the same palace number in a pillar of each
  // may point to a visible physical relation. Shown only when it appears; nothing otherwise.
  function samePalaceHtml(PA, PB, nA, nB) {
    if (!isOn()) return '';
    var out = [];
    K4.forEach(function (a) {
      var pa = PA && PA[a] && PA[a].hex ? palOfHex(PA[a].hex) : null; if (pa == null) return;
      K4.forEach(function (b) {
        var pb = PB && PB[b] && PB[b].hex ? palOfHex(PB[b].hex) : null;
        if (pb === pa) out.push(nA + '\'s ' + L[a] + ' and ' + nB + '\'s ' + L[b] + ': palace ' + pa + ' ' + TRI[pa]);
      });
    });
    if (!out.length) return '';
    return '<div style="margin:6px 0;padding:6px 8px;border-radius:8px;border:1px solid #bcaaa4;background:#efebe9;font-size:12px;">'
      + '<b style="color:#4e342e;">⌂ Same palace between the two persons</b> — may point to a visible physical relation'
      + '<div style="margin-top:2px;">' + out.join('<br>') + '</div></div>';
  }

  // Between two persons the same palace number is also a CURE (Edu, session 49): a pillar of the other
  // person cures an isolated palace of this person when it has the SAME number, or links it with
  // 5/10/15 or Hetu in this person's setting (no branch clash). Only when it appears.
  function mutualCures(P, O) {
    var c = cures(P); if (!c || !c.pc || c.pc.good || !O) return [];
    var isoK = c.pc.isolated.map(function (x) { return x.pillar; });
    var lang = _xkdgSettingLang(c.pc.values.filter(function (v) { return isoK.indexOf(v.pillar) < 0; }).map(function (v) { return v.value; }));
    var out = [];
    K4.forEach(function (k) {
      var q = O[k]; if (!q || !q.hex) return; var v = palOfHex(q.hex); if (v == null) return;
      c.pc.isolated.forEach(function (x) {
        var how = v === x.value ? 'same number ' + v : _xkdgRelIn(lang, v, x.value);
        if (!how) return;
        if (v !== x.value && clashes(q.branch, P[x.pillar] && P[x.pillar].branch)) return;
        out.push({ src: k, pal: v, pillar: x.pillar, value: x.value, how: how });
      });
    });
    return out;
  }
  function mutualCureHtml(P, O, nP, nO) {
    if (!isOn()) return '';
    var m = mutualCures(P, O); if (!m.length) return '';
    return '<div style="margin:6px 0;padding:6px 8px;border-radius:8px;border:1px solid #bcaaa4;background:#efebe9;font-size:12px;">'
      + '<b style="color:#4e342e;">⌂ Palace cure from ' + nO + '\'s chart</b> (for ' + nP + ')'
      + '<div style="margin-top:2px;">' + m.map(function (x) { return nO + '\'s ' + L[x.src] + ' (palace ' + x.pal + ' ' + TRI[x.pal] + ') takes ' + nP + '\'s isolated ' + L[x.pillar] + ' (' + x.value + ') out of isolation — ' + x.how; }).join('<br>') + '</div></div>';
  }

  // ── The switch ──────────────────────────────────────────────────
  // ── Discreet display (Edu, session 49b): a small ⌂n in the corner of each hexagram cell and one
  // thin grey line under the pillars. Nothing else on the page moves.
  function renderChart(pre, P, person) {
    var first = document.getElementById(pre + '-hour'); if (!first) return;
    var chart = first.parentNode, on = isOn() && P && P.hour, pc = on ? relations(P) : null;
    var iso = pc ? pc.isolated.map(function (x) { return x.pillar; }) : [];
    K4.forEach(function (k) {
      var cell = document.querySelector('#' + pre + '-' + k + ' .hex-section'); if (!cell) return;
      var old = cell.querySelector('.xk-palnum'); if (old) old.remove();
      var v = on && P[k] && P[k].hex ? palOfHex(P[k].hex) : null; if (v == null) return;
      // beside the Period number under the lower trigram, smaller and brown (Edu)
      var yun = cell.querySelector('.hex-yun'); if (!yun) return;
      yun.style.position = 'relative';
      var b = document.createElement('span'); b.className = 'xk-palnum';
      b.title = 'Palace ' + v + ' ' + TRI[v];
      b.style.cssText = 'position:absolute;left:100%;bottom:3px;margin-left:4px;font-size:12px;font-weight:normal;line-height:1;color:' + (iso.indexOf(k) >= 0 ? '#c62828' : '#8d6e63') + ';';
      b.textContent = '(' + v + ')'; yun.appendChild(b);
    });
    // the palace setting: last row of the XKDG RELATIONS list (Edu, session 49c) — no line under the pillars
    var old = document.getElementById(pre + '-palline'); if (old) old.remove();
    var items = document.getElementById({ p: 'analysis-items', pp: 'person-analysis-items-a', pb: 'person-analysis-items-b' }[pre]);
    if (!on || !pc || !items) return;
    var row = document.createElement('div'); row.id = pre + '-palline'; row.className = 'analysis-item';
    row.style.cssText = 'font-size:11px;color:#8d6e63;';
    row.innerHTML = lineHtml(P, person);
    items.appendChild(row);
  }
  function renderAll() {
    try { renderChart('p', window._xkdgDateP, false); } catch (e) {}
    try { renderChart('pp', typeof _personAPillars !== 'undefined' ? _personAPillars : null, true); } catch (e) {}
    try { renderChart('pb', typeof _personBPillars !== 'undefined' ? _personBPillars : null, true); } catch (e) {}
  }
  // The toggle: one small tab on the right edge of the page.
  function placeToggle() {
    var t = document.getElementById('xk-pal-toggle');
    if (!t) {
      t = document.createElement('div'); t.id = 'xk-pal-toggle';
      t.title = 'Palaces'; t.textContent = '⌂';
      t.onclick = function () { window.xkdgTogglePalaces(); };
      document.body.appendChild(t);
    }
    var on = isOn();
    t.style.cssText = 'position:fixed;right:0;top:42%;z-index:900;width:18px;height:34px;display:flex;align-items:center;justify-content:center;'
      + 'font-size:12px;cursor:pointer;user-select:none;border-radius:8px 0 0 8px;border:1px solid #bcaaa4;border-right:none;'
      + (on ? 'background:#8d6e63;color:#fff;opacity:.9;' : 'background:#fff;color:#a1887f;opacity:.6;');
  }
  function refresh() {
    placeToggle(); renderAll();
    var pv = document.getElementById('person-view');
    try { if (pv && getComputedStyle(pv).display !== 'none' && typeof setMode === 'function') { setMode('person'); setMode('person'); } } catch (e) {}
  }
  function renderDatePalaces() { renderAll(); }

  window.xkdgTogglePalaces = function () {
    try { localStorage.setItem(KEY, isOn() ? '0' : '1'); } catch (e) {}
    refresh();
  };
  window.xkdgPalacesOn = isOn;
  window.xkdgPalaceRelations = relations;
  window.xkdgPalaceCures = cures;
  window.xkdgRenderPalaces = renderAll;
  window.xkdgPalaceCureHtml = cureHtml;
  window.xkdgSamePalaceHtml = samePalaceHtml;
  window.xkdgMutualPalaceCures = mutualCures;
  window.xkdgMutualPalaceCureHtml = mutualCureHtml;
  window.xkdgRenderDatePalaces = renderDatePalaces;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', placeToggle); else placeToggle();
})();

/* qimen-direction-analysis.js
 * Directional "activation" analysis for the rotating (转盘) QMDJ chart — human
 * directional actions only (Travel Planner / Directions). NEVER uses the flying chart.
 *
 * Three analyses, per Edu's teaching:
 *  1) Qi flow in the STARTING palace (the palace OPPOSITE the travel direction):
 *     trace the generating cycle through the 5 components (heaven stem, earth stem,
 *     door, star, trigram). Elements are ordered on the generating cycle; a missing inner
 *     element is the bridge to add. The spirit is shown only. Rules: QMDJ-RULES.md §6.
 *  2) Strong interaction between the heaven-plate (ti) stem of the START palace and the
 *     ti stem of the DESTINATION palace: clash (冲) or combination (合) → alert.
 *  3) Tai Sui: if the DESTINATION ti stem equals the current year's stem (丙 in 2026),
 *     the destination carries authority/government energy → alert.
 *
 * All structural functions take plain data so they are unit-testable; analyzeDirection()
 * is the thin wrapper that reads QMDJWaterScanner.getRotatingHourChart().
 */
(function () {
  'use strict';

  // ---- Five-element tables -------------------------------------------------
  var STEM_EL = { Jia: 'wood', Yi: 'wood', Bing: 'fire', Ding: 'fire', Wu: 'earth', Ji: 'earth', Geng: 'metal', Xin: 'metal', Ren: 'water', Gui: 'water' };
  var STAR_EL = { Grass: 'water', Rice: 'earth', Aggressor: 'wood', Assistant: 'wood', Fowl: 'earth', Heart: 'metal', Pillar: 'metal', Official: 'earth', Hero: 'fire' };
  var DOOR_EL = { Open: 'metal', Rest: 'water', Birth: 'earth', Injury: 'wood', Delusion: 'wood', View: 'fire', Death: 'earth', Shocking: 'metal' };
  // door scanner-keys → English (rotating chart stores keys like Kai/Xiu/Sheng…)
  var DOOR_KEY_EN = { Kai: 'Open', Xiu: 'Rest', Sheng: 'Birth', Shang: 'Injury', Du: 'Delusion', Jing: 'View', Si: 'Death', Jed: 'Shocking', Jing2: 'Shocking', Jingfright: 'Shocking' };
  var PALACE_EL = { 1: 'water', 2: 'earth', 3: 'wood', 4: 'wood', 5: 'earth', 6: 'metal', 7: 'metal', 8: 'earth', 9: 'fire' };
  var PALACE_TRIGRAM = { 1: 'Kan', 2: 'Kun', 3: 'Zhen', 4: 'Xun', 5: 'Center', 6: 'Qian', 7: 'Dui', 8: 'Gen', 9: 'Li' };

  var EL_HAN = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
  var EL_IT = { wood: 'Legno', fire: 'Fuoco', earth: 'Terra', metal: 'Metallo', water: 'Acqua' };

  // generating (sheng) and controlling (ke) cycles
  var GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
  var KE = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

  // ---- Direction ↔ palace -------------------------------------------------
  var DIR_PALACE = { N: 1, SW: 2, E: 3, SE: 4, NW: 6, W: 7, NE: 8, S: 9 };
  var PALACE_DIR = { 1: 'N', 2: 'SW', 3: 'E', 4: 'SE', 6: 'NW', 7: 'W', 8: 'NE', 9: 'S' };
  var OPPOSITE_PALACE = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };

  // ---- Stem strong interactions ------------------------------------------
  var STEM_CLASH = [['Jia', 'Geng'], ['Yi', 'Xin'], ['Bing', 'Ren'], ['Ding', 'Gui']];
  var STEM_COMBO = [['Jia', 'Ji'], ['Yi', 'Geng'], ['Bing', 'Xin'], ['Ding', 'Ren'], ['Wu', 'Gui']];
  var STEM_HAN = { Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊', Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸' };
  var COMBO_RESULT = { 'Jia|Ji': 'earth', 'Yi|Geng': 'metal', 'Bing|Xin': 'water', 'Ding|Ren': 'wood', 'Wu|Gui': 'fire' };

  // ---- Editable character text (DRAFT — Edu refines) ----------------------
  // Star = intention character; Door = emotional tone.
  var STAR_CHAR = {
    Hero: 'visibilità, riconoscimento, brillare', Heart: 'strategia, lucidità, problem solving',
    Pillar: 'fermezza, difesa, parola tagliente (attenzione ai conflitti)', Assistant: 'pianificazione, saggezza, raffinatezza',
    Aggressor: 'iniziativa, slancio, coraggio', Official: 'diligenza, affidabilità, responsabilità',
    Rice: 'studio, cura, pazienza', Fowl: 'equilibrio, centralità, leadership',
    Grass: 'audacia, cogliere l\u2019occasione (attenzione all\u2019imprudenza)'
  };
  var DOOR_TONE = {
    Open: 'fiducia, apertura, opportunità', Rest: 'calma, ricettività, relazioni',
    Birth: 'speranza, crescita, vitalità', View: 'ispirazione, espressione, visione',
    Injury: 'irrequietezza, impulso, veicoli/movimento', Delusion: 'riservatezza, protezione, nascondere',
    Death: 'pesantezza, stallo, chiusura', Shocking: 'allerta, sorpresa, dispute'
  };

  function stemEl(s) { return STEM_EL[s] || null; }
  function doorEN(d) { return DOOR_EL[d] ? d : (DOOR_KEY_EN[d] || d); }
  function doorEl(d) { return DOOR_EL[doorEN(d)] || null; }
  function starEl(s) { return STAR_EL[s] || null; }

  // Build the 5 (or more) components of a palace with their elements. A plate can hold a
  // STACKED second stem (e.g. 庚癸) — pass pd.ti2 / pd.di2 to include it in the flow.
  function components(pd, palaceNum) {
    var list = [];
    if (pd.ti && stemEl(pd.ti)) list.push({ type: 'heavenStem', name: pd.ti, han: STEM_HAN[pd.ti] || pd.ti, el: stemEl(pd.ti) });
    if (pd.ti2 && stemEl(pd.ti2)) list.push({ type: 'heavenStem', name: pd.ti2, han: STEM_HAN[pd.ti2] || pd.ti2, el: stemEl(pd.ti2) });
    if (pd.di && stemEl(pd.di)) list.push({ type: 'earthStem', name: pd.di, han: STEM_HAN[pd.di] || pd.di, el: stemEl(pd.di) });
    if (pd.di2 && stemEl(pd.di2)) list.push({ type: 'earthStem', name: pd.di2, han: STEM_HAN[pd.di2] || pd.di2, el: stemEl(pd.di2) });
    if (pd.door && doorEl(pd.door)) list.push({ type: 'door', name: doorEN(pd.door), el: doorEl(pd.door) });
    if (pd.star && starEl(pd.star)) list.push({ type: 'star', name: pd.star, el: starEl(pd.star) });
    if (pd.star2 && starEl(pd.star2)) list.push({ type: 'star', name: pd.star2, el: starEl(pd.star2) });
    if (PALACE_EL[palaceNum]) list.push({ type: 'palace', name: PALACE_TRIGRAM[palaceNum], el: PALACE_EL[palaceNum] });
    return list;
  }

  // Element order on the generating cycle.
  var CYCLE = ['wood', 'fire', 'earth', 'metal', 'water'];
  // Season element of the month branch.
  var BRANCH_SEASON = { Yin: 'wood', Mao: 'wood', Si: 'fire', Wu: 'fire', Shen: 'metal', You: 'metal', Hai: 'water', Zi: 'water', Chen: 'earth', Xu: 'earth', Chou: 'earth', Wei: 'earth' };

  // Palace timely (Bazi rule): same element as the season, or generated by it.
  function palaceTimely(el, season) { return !!(el && season) && (el === season || GEN[season] === el); }
  // Star vibrant (Edu): same element as the season, or generating it.
  function starVibrant(el, season) { return !!(el && season) && (el === season || GEN[el] === season); }

  // Order the elements present in a palace along the generating cycle. The largest run of
  // absent elements is where the flow starts; a smaller run inside the chain is a gap.
  // Results: complete (all 5: flow is good, no end point), split (two equal interruptions:
  // no end point, corrections needed), or a chain with its end element and inner gaps.
  function orderFlow(present) {
    var idx = CYCLE.filter(function (e) { return present[e]; }).map(function (e) { return CYCLE.indexOf(e); });
    var n = idx.length;
    var absent = CYCLE.filter(function (e) { return !present[e]; });
    if (n === 5) return { state: 'complete', chain: CYCLE.slice(), end: null, gaps: [], absent: [] };
    if (n === 1) return { state: 'chain', chain: [CYCLE[idx[0]]], end: CYCLE[idx[0]], gaps: [], absent: absent };
    var runs = idx.map(function (from, i) {
      var to = idx[(i + 1) % n], miss = [];
      for (var k = (from + 1) % 5; k !== to; k = (k + 1) % 5) miss.push(CYCLE[k]);
      return { from: CYCLE[from], to: CYCLE[to], at: i, miss: miss };
    });
    var max = Math.max.apply(null, runs.map(function (r) { return r.miss.length; }));
    var breaks = runs.filter(function (r) { return r.miss.length === max; });
    if (breaks.length > 1) {
      return { state: 'split', chain: CYCLE.filter(function (e) { return present[e]; }), end: null, gaps: runs.filter(function (r) { return r.miss.length; }), absent: absent };
    }
    var br = breaks[0], chain = [], gaps = [];
    for (var i = 1; i <= n; i++) {
      var r = runs[(br.at + i) % n];
      chain.push(r.from);
      if (i < n && r.miss.length) gaps.push(r);
    }
    return { state: 'chain', chain: chain, end: br.from, gaps: gaps, absent: absent };
  }

  var GOOD_DOORS = { Open: 1, Rest: 1, Birth: 1, View: 1 };

  // Elements still needed to carry the flow from `from` to `to`, on the generating cycle.
  // Only the absent ones: what is already in the palace needs no corrective.
  function pathBetween(from, to, present) {
    var out = [], x = GEN[from], n = 0;
    while (x !== to && n++ < 5) { if (!present[x]) out.push(x); x = GEN[x]; }
    return out;
  }

  // Stem clashes inside the palace (Tian and Di plates, second stems included), each with
  // its bridge: the element between the two stems, carried by another component.
  function palaceClashes(comps) {
    var stems = comps.filter(function (c) { return c.type === 'heavenStem' || c.type === 'earthStem'; });
    var seen = {}, out = [];
    stems.forEach(function (a) {
      stems.forEach(function (b) {
        if (a === b) return;
        var hit = STEM_CLASH.some(function (p) { return p[0] === a.name && p[1] === b.name; });
        if (!hit || seen[a.name + b.name]) return;
        seen[a.name + b.name] = true;
        var ctrl = KE[a.el] === b.el ? a.el : b.el;
        var bridge = GEN[ctrl], by = comps.filter(function (c) { return c.el === bridge; });
        out.push({ a: a.han, b: b.han, bridge: bridge, bridgedBy: by.length ? by[0].name : null });
      });
    });
    return out;
  }

  // Qi flow of one palace. pd = {ti,ti2,di,di2,door,star,star2,deity}. monthBranch (pinyin)
  // is optional and adds seasonality; role 'start' or 'dest' adds the correctives. The spirit is shown, it does not enter the flow.
  function analyzePalaceFlow(pd, palaceNum, monthBranch, role) {
    var comps = components(pd, palaceNum);
    var present = {}; comps.forEach(function (c) { present[c.el] = true; });
    var ord = orderFlow(present);

    var noEnd = ord.end === null;
    var terminus = noEnd ? [] : comps.filter(function (c) { return c.el === ord.end; });
    var focus = { star: null, door: null, palace: null, heavenStem: null, earthStem: null, stems: [] };
    terminus.forEach(function (c) {
      if (c.type === 'star') focus.star = focus.star ? (focus.star + ', ' + c.name) : c.name;
      else if (c.type === 'door') focus.door = c.name;
      else if (c.type === 'palace') focus.palace = c.name;
      else if (c.type === 'heavenStem') { focus.heavenStem = c.han || c.name; focus.stems.push(c.han || c.name); }
      else if (c.type === 'earthStem') { focus.earthStem = c.han || c.name; focus.stems.push(c.han || c.name); }
    });
    // No natural end point: door and star are shown side by side.
    if (noEnd) {
      comps.forEach(function (c) { if (c.type === 'star' && !focus.star) focus.star = c.name; if (c.type === 'door') focus.door = c.name; });
    }

    // Corrections: elements missing INSIDE the flow (the bridge between two parts).
    var corrections = [];
    ord.gaps.forEach(function (g) { g.miss.forEach(function (e) { if (corrections.indexOf(e) < 0) corrections.push(e); }); });
    // Correctives toward the focus. Starting palace: the star is the best focus, the door
    // comes second. Destination: ends on a stem only, toward a favourable door (slide 27).
    var stars = comps.filter(function (c) { return c.type === 'star'; });
    var doors = comps.filter(function (c) { return c.type === 'door'; });
    var toStar = null, toDoor = null;
    if (!noEnd && role === 'start') {
      if (stars.length && !focus.star) toStar = { star: stars.map(function (c) { return c.name; }).join(', '), need: pathBetween(ord.end, stars[0].el, present) };
      if (doors.length && !focus.star && !focus.door && GOOD_DOORS[doors[0].name]) toDoor = { door: doors[0].name, need: pathBetween(ord.end, doors[0].el, present) };
    } else if (!noEnd && role === 'dest' && doors.length && !focus.star && !focus.door && !focus.palace && GOOD_DOORS[doors[0].name]) {
      toDoor = { door: doors[0].name, need: pathBetween(ord.end, doors[0].el, present) };
    }

    var clashes = palaceClashes(comps);
    var season = monthBranch ? (BRANCH_SEASON[monthBranch] || null) : null;
    var timely = season ? palaceTimely(PALACE_EL[palaceNum], season) : null;
    var vibrant = season ? stars.filter(function (c) { return starVibrant(c.el, season); }).map(function (c) { return c.name; }) : [];

    return {
      palace: PALACE_TRIGRAM[palaceNum], palaceNum: palaceNum, spirit: pd.deity || null,
      components: comps, state: ord.state, chain: ord.chain, end: ord.end,
      sinks: ord.end ? [ord.end] : [], terminus: terminus, focus: focus,
      corrections: corrections, toStar: toStar, toDoor: toDoor, clashes: clashes,
      season: season, timely: timely, vibrantStars: vibrant,
      defects: ord.gaps.map(function (g) { return { from: g.from, to: g.to, bridge: g.miss }; }),
      remedies: corrections.slice()
    };
  }

  function elName(e) { return e.charAt(0).toUpperCase() + e.slice(1) + ' ' + (EL_HAN[e] || ''); }
  function elList(a) { return a.map(elName).join(' and '); }

  // Build the flow statements for the assistant (facts only, no character texts).
  function flowAdvice(flow) {
    var msgs = [], f = flow.focus;
    if (flow.state === 'complete') {
      msgs.push({ kind: 'flow', text: 'All 5 elements are present: the qi flow is good, with no single end point. Focus: ' + [f.door && ('door ' + f.door), f.star && ('star ' + f.star)].filter(Boolean).join(' and ') + '.' });
    } else if (flow.state === 'split') {
      msgs.push({ kind: 'flow', text: 'The qi flow is interrupted in two places: corrections are needed.' });
    } else {
      var at = [f.door && ('door ' + f.door), f.star && ('star ' + f.star)].filter(Boolean);
      if (!at.length && f.palace) at = ['the palace ' + f.palace];
      if (!at.length) at = ['stem ' + f.stems.join(', ')];
      msgs.push({ kind: 'flow', text: 'The qi flow ends at ' + at.join(' and ') + ' (' + elName(flow.end) + ').' });
    }
    if (flow.corrections.length) msgs.push({ kind: 'remedy', remedies: flow.corrections, text: 'Missing element: add ' + elList(flow.corrections) + ' as a bridge in the flow.' });
    if (flow.toStar && flow.toStar.need.length) msgs.push({ kind: 'star', remedies: flow.toStar.need, text: 'Best focus: to reach the star ' + flow.toStar.star + ', the flow needs ' + elList(flow.toStar.need) + '.' });
    if (flow.toDoor && flow.toDoor.need.length) msgs.push({ kind: 'door', remedies: flow.toDoor.need, text: (flow.toStar ? 'Second choice: to' : 'To') + ' reach the door ' + flow.toDoor.door + ', the flow needs ' + elList(flow.toDoor.need) + '.' });
    flow.clashes.forEach(function (c) {
      msgs.push({ kind: 'clash', text: 'Stem clash ' + c.a + c.b + (c.bridgedBy ? (': bridged by ' + c.bridgedBy + ' (' + elName(c.bridge) + ').') : (': no bridge, add ' + elName(c.bridge) + '.')) });
    });
    if (flow.season) {
      msgs.push({ kind: 'season', text: 'Palace ' + flow.palace + ' is ' + (flow.timely ? 'timely' : 'not timely') + ' this month' + (flow.vibrantStars.length ? ('; vibrant star: ' + flow.vibrantStars.join(', ')) : '') + '.' });
    }
    return msgs;
  }

  // ---- Stem interaction (start ti ↔ dest ti) ------------------------------
  function stemPair(a, b) {
    if (!a || !b) return null;
    function has(list) { return list.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); }); }
    if (has(STEM_CLASH)) return { type: 'clash', a: a, b: b, aHan: STEM_HAN[a], bHan: STEM_HAN[b] };
    if (has(STEM_COMBO)) {
      var key = (STEM_HAN[a] && COMBO_RESULT[a + '|' + b]) ? a + '|' + b : b + '|' + a;
      return { type: 'combo', a: a, b: b, aHan: STEM_HAN[a], bHan: STEM_HAN[b], result: COMBO_RESULT[key] || null };
    }
    return null;
  }

  // ---- Start ↔ destination comparison (information only, no effect on scores) --
  // Accumulation: a clash with no bridge, or a missing element inside the flow, leaks energy.
  // Timeliness of the starting palace adds to it. Release: the flow of the destination palace.
  function palaceRelation(a, b) {
    var ea = PALACE_EL[a], eb = PALACE_EL[b];
    if (!ea || !eb) return null;
    if (ea === eb) return 'same';
    if (GEN[ea] === eb) return 'generates';
    if (GEN[eb] === ea) return 'generated';
    if (KE[ea] === eb) return 'controls';
    return 'controlled';
  }
  function comparePalaces(startFlow, destFlow) {
    var leaks = [];
    startFlow.clashes.forEach(function (c) { if (!c.bridgedBy) leaks.push('stem clash ' + c.a + c.b + ' with no bridge'); });
    if (startFlow.corrections.length) leaks.push('missing ' + elList(startFlow.corrections));
    var rel = palaceRelation(startFlow.palaceNum, destFlow.palaceNum);
    var S = startFlow.palace, D = destFlow.palace;
    var REL = { same: S + ' and ' + D + ' are the same element', generates: S + ' generates ' + D, generated: D + ' generates ' + S, controls: S + ' controls ' + D, controlled: D + ' controls ' + S };
    return { good: !leaks.length, leaks: leaks, timely: startFlow.timely, relation: rel, relationText: rel ? REL[rel] : '' };
  }
  // Both flows and the comparison, from a rotating chart, for a movement INTO destPalace.
  function tripFlows(chart, destPalace, monthBranch) {
    var startPal = OPPOSITE_PALACE[destPalace];
    if (!chart || !chart.palaces || !startPal || !chart.palaces[startPal] || !chart.palaces[destPalace]) return null;
    var a = analyzePalaceFlow(chart.palaces[startPal], startPal, monthBranch || null, 'start');
    var b = analyzePalaceFlow(chart.palaces[destPalace], destPalace, monthBranch || null, 'dest');
    return { start: a, dest: b, startAdvice: flowAdvice(a), destAdvice: flowAdvice(b), compare: comparePalaces(a, b) };
  }

  // ---- Tai Sui (year stem) on destination --------------------------------
  function isTaiSui(destTi, yearStem) { return !!(destTi && yearStem && destTi === yearStem); }

  // ---- High-level wrapper -------------------------------------------------
  // params: { Y, M, D, hGan, hZhi, direction ('N'..'NW'), yearStem, monthBranch (pinyin, optional) }
  function analyzeDirection(params) {
    try {
      if (typeof QMDJWaterScanner === 'undefined' || typeof QMDJWaterScanner.getRotatingHourChart !== 'function') return null;
      var dirPal = DIR_PALACE[params.direction];
      if (!dirPal) return null;
      var startPal = OPPOSITE_PALACE[dirPal];
      var chart = QMDJWaterScanner.getRotatingHourChart(params.Y, params.M, params.D, params.hGan, params.hZhi);
      if (!chart || !chart.palaces) return null;
      var dest = chart.palaces[dirPal], start = chart.palaces[startPal];
      if (!dest || !start) return null;

      var flow = analyzePalaceFlow(start, startPal, params.monthBranch || null, 'start');
      var destFlow = analyzePalaceFlow(dest, dirPal, params.monthBranch || null, 'dest');
      var cmp = comparePalaces(flow, destFlow);
      var pair = stemPair(start.ti, dest.ti);
      var taiSui = isTaiSui(dest.ti, params.yearStem || null);

      var alerts = [];
      if (pair) {
        alerts.push(pair.type === 'clash'
          ? { kind: 'stem_clash', text: 'Alert: clash tra lo stelo di partenza ' + pair.aHan + ' e quello di destinazione ' + pair.bHan + ' (interazione forte).' }
          : { kind: 'stem_combo', text: 'Alert: combinazione ' + pair.aHan + pair.bHan + (pair.result ? ' \u2192 ' + (EL_IT[pair.result] || pair.result) : '') + ' tra partenza e destinazione (interazione forte).' });
      }
      if (taiSui) alerts.push({ kind: 'tai_sui', text: 'Alert: la destinazione porta lo stelo dell\u2019anno (Tai Sui ' + (STEM_HAN[dest.ti] || dest.ti) + ') \u2192 autorità/governo.' });

      return {
        direction: params.direction, destPalace: PALACE_TRIGRAM[dirPal], startPalace: PALACE_TRIGRAM[startPal],
        startTi: start.ti, destTi: dest.ti,
        flow: flow, flowAdvice: flowAdvice(flow), destFlow: destFlow, destFlowAdvice: flowAdvice(destFlow), compare: cmp,
        stemInteraction: pair, taiSui: taiSui, alerts: alerts
      };
    } catch (e) { return null; }
  }

  var API = {
    analyzeDirection: analyzeDirection,
    analyzePalaceFlow: analyzePalaceFlow,
    tripFlows: tripFlows, comparePalaces: comparePalaces, palaceRelation: palaceRelation,
    orderFlow: orderFlow, palaceTimely: palaceTimely, starVibrant: starVibrant,
    flowAdvice: flowAdvice,
    stemPair: stemPair,
    isTaiSui: isTaiSui,
    DIR_PALACE: DIR_PALACE, OPPOSITE_PALACE: OPPOSITE_PALACE,
    STAR_CHAR: STAR_CHAR, DOOR_TONE: DOOR_TONE,
    _tables: { STEM_EL: STEM_EL, STAR_EL: STAR_EL, DOOR_EL: DOOR_EL, PALACE_EL: PALACE_EL }
  };
  if (typeof window !== 'undefined') window.QimenDirAnalysis = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();

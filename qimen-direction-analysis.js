/* qimen-direction-analysis.js
 * Directional "activation" analysis for the rotating (转盘) QMDJ chart — human
 * directional actions only (Travel Planner / Directions). NEVER uses the flying chart.
 *
 * Three analyses, per Edu's teaching:
 *  1) Qi flow in the STARTING palace (the palace OPPOSITE the travel direction):
 *     trace the generating cycle through the 5 components (heaven stem, earth stem,
 *     door, star, trigram); the SINK is where the flow ends. Focus = star (intention)
 *     / door (emotion) / trigram (place). Defect = an unbridged control → remedy element.
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

  // Trace the generating flow; find the SINK (element that generates something absent).
  // The flow only advances to an element that is actually PRESENT in the palace — no
  // component (Di Pan included) "pulls" an absent element into being. So a component whose
  // generated element is absent is a dead-end (passive), exactly as the Di Pan behaves.
  function analyzePalaceFlow(pd, palaceNum) {
    var comps = components(pd, palaceNum);
    var present = {}; comps.forEach(function (c) { present[c.el] = true; });

    function isSink(c) { return !present[GEN[c.el]]; }
    var terminus = comps.filter(isSink);
    var sinkSet = {}; terminus.forEach(function (c) { sinkSet[c.el] = true; });
    var sinks = Object.keys(sinkSet);

    var focus = { star: null, door: null, palace: null, heavenStem: null, earthStem: null, stems: [] };
    terminus.forEach(function (c) {
      if (c.type === 'star') focus.star = c.name;
      else if (c.type === 'door') focus.door = c.name;
      else if (c.type === 'palace') focus.palace = c.name;
      else if (c.type === 'heavenStem') { focus.heavenStem = c.han || c.name; focus.stems.push(c.han || c.name); }
      else if (c.type === 'earthStem') { focus.earthStem = c.han || c.name; focus.stems.push(c.han || c.name); }
    });

    // A control between two present elements is a DEFECT only if they are NOT already
    // linked by a generating path (otherwise energy flowed forward; the control is benign).
    function genConnected(a, b) {
      var seen = {}, stack = [a];
      while (stack.length) {
        var x = stack.pop(); if (x === b) return true; if (seen[x]) continue; seen[x] = true;
        if (present[GEN[x]]) stack.push(GEN[x]);
        Object.keys(present).forEach(function (y) { if (GEN[y] === x) stack.push(y); });
      }
      return false;
    }
    var defects = [], remedies = {};
    var els = Object.keys(present);
    els.forEach(function (a) {
      els.forEach(function (b) {
        if (a === b || KE[a] !== b) return;
        if (genConnected(a, b)) return;
        defects.push({ controller: a, controlled: b, bridge: GEN[a] });
        remedies[GEN[a]] = true;
      });
    });

    // Remedy to RE-ANCHOR the flow: ONLY when the flow dies on stems with no meaningful
    // anchor at the terminus (no star/door/palace). If it already ends on a star, door or
    // palace, that IS the focus and no remedy is needed. Target priority: star → door → Di-Pan stem.
    var reanchor = null;
    if (sinks.length && !focus.star && !focus.door && !focus.palace) {
      var sinkEl = sinks[0], anchorEl = null, anchorType = null, anchorName = null;
      if (pd.star && starEl(pd.star)) { anchorEl = starEl(pd.star); anchorType = 'star'; anchorName = pd.star; }
      else if (pd.door && doorEl(pd.door)) { anchorEl = doorEl(pd.door); anchorType = 'door'; anchorName = doorEN(pd.door); }
      else if (pd.di && stemEl(pd.di)) { anchorEl = stemEl(pd.di); anchorType = 'earthStem'; anchorName = STEM_HAN[pd.di] || pd.di; }
      if (anchorEl && anchorEl !== sinkEl) {
        if (GEN[sinkEl] === anchorEl) reanchor = { target: anchorType, name: anchorName, bridge: null };
        else { reanchor = { target: anchorType, name: anchorName, bridge: GEN[sinkEl] }; remedies[GEN[sinkEl]] = true; }
      }
    }

    return {
      palace: PALACE_TRIGRAM[palaceNum], palaceNum: palaceNum,
      components: comps, sinks: sinks, terminus: terminus, focus: focus,
      defects: defects, remedies: Object.keys(remedies), reanchor: reanchor
    };
  }

  // Build human advice from the flow result.
  function flowAdvice(flow) {
    var msgs = [];
    if (flow.focus.star) msgs.push({ kind: 'intention', star: flow.focus.star, text: 'Il flusso termina sulla stella ' + flow.focus.star + ': formula un\u2019intenzione di ' + (STAR_CHAR[flow.focus.star] || flow.focus.star) + '.' });
    if (flow.focus.door) msgs.push({ kind: 'emotion', door: flow.focus.door, text: 'Il flusso termina sulla porta ' + flow.focus.door + ': sintonizzati sul tono emotivo di ' + (DOOR_TONE[flow.focus.door] || flow.focus.door) + '.' });
    if (flow.focus.palace && !flow.focus.star && !flow.focus.door) msgs.push({ kind: 'place', palace: flow.focus.palace, text: 'Il flusso termina sul palazzo ' + flow.focus.palace + ': l\u2019energia si radica nel luogo stesso.' });
    if (!msgs.length && flow.focus.stems.length) msgs.push({ kind: 'stem', text: 'Il flusso termina su uno stelo (' + flow.focus.stems.join(', ') + ') nel Di Pan: passivo, nessun ancoraggio a stella/porta.' });
    if (flow.reanchor && flow.reanchor.bridge) {
      var tgtIt = flow.reanchor.target === 'star' ? ('alla stella ' + flow.reanchor.name) : (flow.reanchor.target === 'door' ? ('alla porta ' + flow.reanchor.name) : ('allo stelo ' + flow.reanchor.name + ' del Di Pan'));
      msgs.push({ kind: 'remedy', remedies: [flow.reanchor.bridge],
        text: 'Rimedio: introdurre ' + (EL_IT[flow.reanchor.bridge] || flow.reanchor.bridge) + ' ' + (EL_HAN[flow.reanchor.bridge] || '') + ' per riportare il flusso ' + tgtIt + '.' });
    }
    if (flow.defects.length) {
      msgs.push({ kind: 'remedy', remedies: flow.remedies,
        text: 'Difetto nel flusso (controllo non risolto). Rimedio: introdurre ' + flow.remedies.map(function (e) { return (EL_IT[e] || e) + ' ' + (EL_HAN[e] || ''); }).join(' / ') + '.' });
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

  // ---- Tai Sui (year stem) on destination --------------------------------
  function isTaiSui(destTi, yearStem) { return !!(destTi && yearStem && destTi === yearStem); }

  // ---- High-level wrapper -------------------------------------------------
  // params: { Y, M, D, hGan, hZhi, direction ('N'..'NW'), yearStem (pinyin, optional) }
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

      var flow = analyzePalaceFlow(start, startPal);
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
        flow: flow, flowAdvice: flowAdvice(flow),
        stemInteraction: pair, taiSui: taiSui, alerts: alerts
      };
    } catch (e) { return null; }
  }

  var API = {
    analyzeDirection: analyzeDirection,
    analyzePalaceFlow: analyzePalaceFlow,
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

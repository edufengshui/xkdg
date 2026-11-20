// ============================================================
// XKDG — qmdj-liqi.js
// QMDJ Li Qi permanent chart · Flying Pan method (session 32, Edu)
// ============================================================
// Source: Edu's chapter "Qi Men Dun Jia Feng Shui – Li Qi 2". Only Yang Dun. The period
// of construction / move-in gives the Yang Jú. The chart is the one of the 60 of that Jú
// where:
//   house    → Fu Shou 符首 = Six Jia of the SITTING double mountain,
//              Zhi Fu 值符 palace = palace of the Qi mouth (door);
//   business → Fu Shou = Six Jia of the FACING double mountain,
//              Zhi Fu palace = the facing palace.
// In the Flying Pan the Zhi Fu goes where the hour stem sits on the earth plate, so the
// hour is the one of that Xun whose stem is the earth-plate stem of the Zhi Fu palace.
// Kun uses its OWN stem, not the centre's lodged one (slides 15 and 20).
// Checked against the slides: ex. 1 壬申, ex. 2 丁巳, ex. 3 己亥, ex. 4 壬辰,
// case study 1 丙申, case study 3 丙子.
// The chart itself is drawn by showQimenChart (app-fengshui.js), Flying mode, with the
// Jú forced to Yang — the same renderer as the 🎲 QMDJ chart.
(function () {
  var ST = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var DM = ['壬子','癸丑','艮寅','甲卯','乙辰','巽巳','丙午','丁未','坤申','庚酉','辛戌','乾亥'];
  // double-mountain branch -> [index of its Six Jia head in the 60 cycle, Yi stem it hides under]
  var JIA = { '子':[0,'戊'], '丑':[0,'戊'], '戌':[10,'己'], '卯':[10,'己'],
              '申':[20,'庚'], '巳':[20,'庚'], '午':[30,'辛'], '未':[30,'辛'],
              '辰':[40,'壬'], '酉':[40,'壬'], '寅':[50,'癸'], '亥':[50,'癸'] };
  var PAL = [[1,'Kan','N'],[8,'Gen','NE'],[3,'Zhen','E'],[4,'Xun','SE'],
             [9,'Li','S'],[2,'Kun','SW'],[7,'Dui','W'],[6,'Qian','NW']];
  // Yang Dun earth plate: 戊 at the Jú palace, then forward through the Luo Shu numbers.
  var YI_ORDER = ['戊','己','庚','辛','壬','癸','丁','丙','乙'];
  var PY = { '子':'Zi','丑':'Chou','寅':'Yin','卯':'Mao','辰':'Chen','巳':'Si',
             '午':'Wu','未':'Wei','申':'Shen','酉':'You','戌':'Xu','亥':'Hai' };

  function norm(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function mountainIdx(deg) { return Math.floor(norm(deg + 22.5) / 30) % 12; }   // 0 = 壬子 (337.5–7.5)
  function palaceOf(deg) { return PAL[Math.floor(norm(deg + 22.5) / 45) % 8]; }
  function earthStem(ju, pal) { return YI_ORDER[((pal - ju) % 9 + 9) % 9]; }
  function gz(i) { return ST[i % 10] + BR[i % 12]; }

  // Pure computation, no DOM. kind 'house' | 'business'; qiPalace = Luo Shu number (house only).
  function compute(kind, facingDeg, period, qiPalace) {
    var ju = parseInt(period, 10);
    if (!(ju >= 1 && ju <= 9)) return { error: 'Period must be 1–9.' };
    if (!isFinite(facingDeg)) return { error: 'Enter the facing in degrees.' };
    var facing = norm(facingDeg), sitting = norm(facing + 180);
    var fsDeg = (kind === 'business') ? facing : sitting;          // Fu Shou direction
    var mi = mountainIdx(fsDeg), br = BR[mi], jia = JIA[br];
    var zf = (kind === 'business') ? palaceOf(facing)[0] : parseInt(qiPalace, 10);
    if (!(zf >= 1 && zf <= 9) || zf === 5) return { error: 'Pick the palace of the Qi mouth.' };
    var target = earthStem(ju, zf);
    // When the Zhi Fu palace holds the Fu Shou's own Yi, two hours fit: the Jia hour (Xun head,
    // full Fu Yin - stars AND doors at home) and the hour of that Yi stem (e.g. 戊辰). Edu,
    // session 32: the Fu Yin chart is discarded, so the Yi-stem hour is used. The general
    // formula already gives it.
    var hourIdx = jia[0] + ST.indexOf(target);
    var h = gz(hourIdx);
    var pal = PAL.filter(function (x) { return x[0] === zf; })[0];
    var off = norm(fsDeg + 22.5) % 30, edge = Math.min(off, 30 - off);
    return { ju: ju, kind: kind, facing: facing, sitting: sitting, fsDeg: fsDeg,
             mountain: DM[mi], branch: br, xunHead: gz(jia[0]), yi: jia[1],
             zhiFu: zf, zhiFuName: pal ? pal[1] : '', target: target,
             hGan: h.charAt(0), hZhi: h.charAt(1), nearEdge: edge < 1.5 };
  }

  // The house loaded in House Profiles (like every other Feng Shui chart): facing and period
  // of its active floor, and the palace of its first EXTERNAL door that has one (the Qi mouth).
  // Session 57 (Edu: "it does not let me choose the house"): the panel has its own house menu.
  // Picking a house here does NOT change the house loaded in the rest of the app. Facing and
  // period can also be typed by hand (not saved): for a client's place that has no profile yet.
  var _pick = null;                         // { personName, houseIdx } chosen in the panel
  var _ovFacing = null, _ovPeriod = null;   // typed by hand in the panel
  function cur() { return _pick || window._fsLoadedHouse || null; }
  function allHouses() {
    var out = [];
    try {
      var all = _fsHousesLoad();
      Object.keys(all).forEach(function (pn) {
        (all[pn] || []).forEach(function (h, i) { out.push({ personName: pn, houseIdx: i, name: h.name || '' }); });
      });
    } catch (e) {}
    return out;
  }
  function houseData() {
    var H = houseDataRaw();
    if (!H && (_ovFacing != null || _ovPeriod != null)) H = { name: '', person: '', facing: null, period: null, doorPalace: null, doorName: '' };
    if (H) { if (_ovFacing != null) H.facing = _ovFacing; if (_ovPeriod != null) H.period = _ovPeriod; }
    return H;
  }
  function houseDataRaw() {
    try {
      var L = cur();
      if (!L || typeof _fsHousesLoad !== 'function') return null;
      var all = _fsHousesLoad(), h = (all[L.personName] || [])[L.houseIdx];
      if (!h) return null;
      var f = _fsActiveFloor(h);
      var door = null;
      (f.doors || []).some(function (d) {
        if (d.kind !== 'internal' && d.kind !== 'item' && d.palace) { door = d; return true; } return false; });
      return { name: h.name || '', person: L.personName,
               facing: _fsFloorFacing(h, f), period: _fsFloorPeriod(h, f),
               doorPalace: door ? door.palace : null, doorName: door ? door.name : '' };
    } catch (e) { return null; }
  }

  var _qiManual = null;      // palace picked by hand; null = take it from the door

  function open() {
    var ov = document.getElementById('liqi-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'liqi-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(20,8,30,.55);display:flex;'
        + 'align-items:flex-start;justify-content:center;padding:20px;overflow:auto;';
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.style.display = 'none'; });
      var IN = 'padding:5px;border:1px solid #b39ddb;border-radius:5px;font-size:13px;';
      ov.innerHTML =
          '<div style="background:#fff;border-radius:12px;max-width:780px;width:100%;padding:16px;box-shadow:0 12px 44px rgba(0,0,0,.32);">'
        +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        +     '<div style="font-size:16px;font-weight:bold;color:#5e35b1;">🏠 QMDJ Li Qi · Flying Pan</div>'
        +     '<button onclick="document.getElementById(\'liqi-overlay\').style.display=\'none\'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1;">✕</button>'
        +   '</div>'
        +   '<div id="liqi-house" style="font-size:12px;color:#555;margin-bottom:6px;"></div>'
        // Step 1 (Edu, session 32): House or Business BEFORE the chart is drawn. House is the default.
        +   '<div id="liqi-step1" style="padding:6px 0 4px;">'
        +     '<div style="font-size:13px;color:#555;margin-bottom:8px;">This space is a:</div>'
        +     '<div style="display:flex;gap:10px;">'
        +       '<button id="liqi-btn-house" onclick="liqiKind(\'house\')" style="flex:1;padding:14px;border:3px solid #4527a0;border-radius:8px;background:#5e35b1;color:#fff;font-size:15px;font-weight:bold;cursor:pointer;">🏠 House</button>'
        +       '<button onclick="liqiKind(\'business\')" style="flex:1;padding:14px;border:3px solid transparent;border-radius:8px;background:#8a6a1f;color:#fff;font-size:15px;font-weight:bold;cursor:pointer;">🏢 Business</button>'
        +     '</div>'
        +   '</div>'
        +   '<div id="liqi-step2" style="display:none;">'
        +     '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:8px;font-size:13px;">'
        +       '<span><b id="liqi-kind-lbl"></b> <a href="#" onclick="liqiBack();return false;" style="font-size:11px;color:#5e35b1;">change</a></span>'
        +       '<span id="liqi-qi-wrap">Qi mouth <select id="liqi-qi" onchange="liqiPickQi(this.value)" style="' + IN + '"></select></span>'
        +     '</div>'
        +     '<div id="liqi-info" style="font-size:12px;color:#333;margin-bottom:8px;line-height:1.5;"></div>'
        +     '<div id="liqi-chart"></div>'
        +   '</div>'
        + '</div>';
      document.body.appendChild(ov);
    }
    _qiManual = null;          // every opening starts again from the saved door
    _pick = null; _ovFacing = null; _ovPeriod = null;   // ...and from the house loaded in the app
    back(); head();
    ov.style.display = 'flex';
    try { document.getElementById('liqi-btn-house').focus(); } catch (e) {}
  }

  // House menu + facing / period boxes (always visible, on both steps).
  function head() {
    var hEl = document.getElementById('liqi-house'); if (!hEl) return;
    var IN = 'padding:5px;border:1px solid #b39ddb;border-radius:5px;font-size:13px;';
    var list = allHouses(), L = cur(), H = houseData();
    var opts = list.length ? '' : '<option value="">— no saved house —</option>';
    var found = false;
    list.forEach(function (x, i) {
      var on = L && L.personName === x.personName && L.houseIdx === x.houseIdx; if (on) found = true;
      var lbl = (x.name || 'House') + (x.personName && x.personName !== x.name ? ' · ' + x.personName : '');
      opts += '<option value="' + i + '"' + (on ? ' selected' : '') + '>' + lbl.replace(/</g, '&lt;') + '</option>';
    });
    if (list.length && !found) opts = '<option value="" selected>— choose a house —</option>' + opts;
    var per = '<option value="">—</option>';
    for (var n = 1; n <= 9; n++) per += '<option value="' + n + '"' + (H && String(H.period) === String(n) ? ' selected' : '') + '>' + n + '</option>';
    hEl.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + '<select onchange="liqiPickHouse(this.value)" style="' + IN + 'max-width:100%;flex:1 1 180px;">' + opts + '</select>'
      + '<span>Facing <input type="number" step="0.1" min="0" max="360" value="' + (H && H.facing != null && isFinite(parseFloat(H.facing)) ? H.facing : '')
      + '" onchange="liqiSet(\'facing\',this.value)" style="' + IN + 'width:68px;">°</span>'
      + '<span>Period <select onchange="liqiSet(\'period\',this.value)" style="' + IN + '">' + per + '</select></span>'
      + '</div>';
  }
  function refresh() {
    var b = document.getElementById('liqi-step2');
    if (b && b.style.display !== 'none') show(); else head();
  }
  function pickHouse(v) {
    var list = allHouses(), x = list[parseInt(v, 10)];
    _pick = x ? { personName: x.personName, houseIdx: x.houseIdx } : null;
    _ovFacing = null; _ovPeriod = null; _qiManual = null;
    refresh();
  }
  function setVal(what, v) {
    if (what === 'facing') { var f = parseFloat(v); _ovFacing = isFinite(f) ? norm(f) : null; }
    else { var p = parseInt(v, 10); _ovPeriod = (p >= 1 && p <= 9) ? p : null; }
    refresh();
  }

  var _kind = 'house';
  function setKind(k) {
    _kind = (k === 'business') ? 'business' : 'house';
    document.getElementById('liqi-step1').style.display = 'none';
    document.getElementById('liqi-step2').style.display = '';
    document.getElementById('liqi-kind-lbl').textContent = (_kind === 'business') ? '🏢 Business' : '🏠 House';
    show();
  }
  function back() {
    var a = document.getElementById('liqi-step1'), b = document.getElementById('liqi-step2');
    if (a) a.style.display = ''; if (b) b.style.display = 'none';
  }

  function pickQi(v) { _qiManual = v ? parseInt(v, 10) : null; show(); }

  // ── AI interpretation (session 32, Edu) ────────────────────────────────────
  // The reading method distilled from the chapter's Guidelines (slides 16-18) and its five
  // case studies (restaurant, trading office, family house, model agency, hotel lobby).
  var READ_GUIDE = [
    'You interpret a QMDJ Li Qi PERMANENT chart (Qi Men Dun Jia Feng Shui, Flying Pan method, school of Master Eduardo Hess / Joseph Yu).',
    'The chart is built from the period of construction or move-in (Yang Dun only). House: sitting double mountain = Fu Shou, palace of the Qi mouth (door) = Zhi Fu. Business: facing double mountain = Fu Shou, facing palace = Zhi Fu.',
    'It is superimposed on the floor plan: each of the 8 palaces is an area of the space, read on four levels: earth (doors), man (stems), heaven (stars), spirits (deities).',
    '',
    'HOW TO READ (from the chapter guidelines):',
    '- Read each palace like the QMDJ Annual chart: heaven stem over earth stem (formations, combinations, clashes, penalties), the door, the star, the spirit, and the palace element (whether door / star / stem suit the palace, 12 growth stages of the wonders 乙丙丁).',
    '- The Qi mouth / door palace and the facing palace matter most: they show the quality of the qi entering the space. The sitting palace shows the support behind.',
    '- Voids (Kong Wang / empty branches) do NOT count in a QMDJ Feng Shui (Li Qi) chart: never mention them.',
    '- Names (Edu): ALWAYS keep the English names exactly as they appear on the chart — doors (View, Birth, Rest, Death, Injury, Shocking, Delusion, Open), stars (Rice, Grass, Heart, Pillar, Hero, Fowl, Assistant, Aggressor, Official…), spirits (Commander, Snake, Yin, Harmonies, Earth, Heaven, Polaris, Bird, Norm…) — and the Chinese stems as characters. NEVER translate them into Italian or French (no "stella Riso", "Porta della Vista", "Comandante"): write e.g. "stella Rice", "porta View", "spirito Commander".',
    '- Terminology (Edu): in Italian the sitting is "seduta" (palazzo della seduta) — NEVER "schiena"; the facing is "facciata". In French: "assise" and "façade".',
    '- The Commander (Zhi Fu) in a Li Qi chart only marks where the Qi mouth is: IGNORE it in the reading — give it no meaning (no protection, prominence or support) and do not comment on it, on heaven or Di Pan. Zhi Shi (the door of the Commander) is a key point.',
    '- QI FLOW of a palace (Edu, 20/11/2026) - ALWAYS trace where the qi of a palace ends up, along the chain: palace element (earth, yin, the START) -> earth-plate stem -> door -> heaven stem and star (heaven, yang, the ARRIVAL). The chart data gives this chain ready for every palace on its "Qi flow" line: use it, do not work the elements out again.',
    '  Example, Kan with 戊 over 乙, door View, star Rice: the Water of the palace generates 乙 (Wood), which generates View (Fire), which generates 戊 and Rice (both Earth). Because the qi moves from yin to yang - from the palace as the start up to the heaven stem and the star as the arrival - the area favours MOVEMENT and ACTIVITY: having the entrance door there is appropriate.',
    '  The heaven stem and the star at the end of the flow are the ACTORS: read them together for what the area brings (in the example 戊 can be money and Rice gradual accumulation, or a tendency to save).',
    '  Do NOT call a door or a star weak or unfavourable just because its element clashes with the element of the palace (wrong: "View is Fire, controlled by the Water of Kan, so it struggles"): read the whole chain. ',
    '  When the flow TURNS BACK - yang generates yin, the upper level generates the lower one, e.g. the star generates the door - the area suits REST and QUIET (Edu, 20/11/2026).',
    '  SAME ELEMENT: the factors of a palace that share an element act TOGETHER as one group (the data lists them on the "Elements" line). Read the relations between the GROUPS, not level by level.',
    '  CONTROL inside a palace is not a verdict, it is a choice of USE, settled by the element you ADD to the space (Edu, 20/11/2026). Example, Zhen with 庚 over 己, door Death, star Assistant: 己 and Death are Earth and generate 庚 (Metal); Zhen and Assistant are Wood and control the Earth. To live this area in an ACTIVE way add FIRE (Wood -> Fire -> Earth -> Metal: the qi runs from the palace up to the heaven stem, yin to yang). To live it in a YIN way - rest, study - add WATER (Metal -> Water -> Wood: the qi runs from the heaven stem back to the palace, yang to yin).',
    '  So for every control the cure is the BRIDGE element between the two (the one the controller generates and that generates the controlled): the data gives it on the "Controls" line. A bridge that makes the qi leave the palace and climb to the heaven stem / star serves activity; a bridge that brings the qi back down to the palace serves rest and quiet. Always offer the occupant both options when both exist, and say which use each one serves.',
    '- Once the bridge is added and the flow runs right, the stars and doors at the arrival work for that use (Edu): e.g. Kun, active use with Metal added — Aggressor does NOT bring tension, it is the drive of the active area. Never warn that a cure "risks" tension or conflict because of a star\'s name: the cure settles it.',
    '- ROOMS: when a palace carries "ROOM: <name>", that is the real use of the area (Edu). Read the palace FOR THAT ROOM: say whether its qi suits it, and give the cure for that use (a bedroom or study is a yin use, a kitchen, living room or office an active one). Do not propose another function for it; if the qi really does not suit the room, say so and give the remedy. Palaces with no room: read as usual.',
    '- FLYING STARS ARE ALWAYS THE BASE (Edu): the other systems lean on them and, read correctly, improve them greatly. When the data gives the flying stars, start each cure from them (what the mountain and water stars of that palace need) and use the Li Qi to choose where and how it works best; never let the Li Qi contradict the flying stars.',
    '- PREVAILING WATER STAR IN THE CENTRE (Edu, always): when the data carries a PRIORITY line, the prevailing water star of the current period is locked in the centre and the advice is ALWAYS to free it: either towards the facing, or by exchanging its place with the water star 5 (the line says where it is). Say it in the opening overview as the most important intervention of the house, before every other cure.',
    '- WATER and MOUNTAIN cures (Edu, only when the Li Qi is read TOGETHER with the flying stars): a Water intervention (to support the water star, or a Ling Shen hexagram: aquarium, fountain, water feature) is MOST effective in a palace where a Wonder (乙丙丁, tag WONDER) stands at a good growth stage AND the qi flow goes toward yang (climbs to the heaven stem / star). The opposite for an intervention aimed at the MOUNTAIN star: most effective where the flow goes toward yin (comes back to the palace). Point out these palaces when you give such advice.',
    '- FACING PALACE (Edu): the facing must always emphasise YANG. There recommend only the ACTIVE cure — the bridge that makes the qi climb (on the "Controls" line marked active use) — stated plainly as THE advice to activate the facing (what to add, where, shape and colour), with no hedging ("without overdoing it") and no yin / quiet option.',
    '- THE FIVE ELEMENTS AS CURES are added to the space as SHAPES and COLOURS (form and colour count more than the material - Edu\'s Feng Shui course, lesson on the Five Elements): WOOD = tall, narrow, columnar shapes; green (a tall plant, a green fabric). FIRE = pointed, triangular shapes; red, orange, purple (a lamp, a red cushion). EARTH = square, flat shapes; yellow, ochre, brown (a square rug, ceramics, stone). METAL = round, domed shapes; white, grey, gold, silver (a round bowl, white). WATER = wavy, irregular shapes; dark blue, black (a wavy form, blue; a fountain or aquarium is moving Water, Yang). The cure must be in proportion to what it has to balance.',
    '- Birth YEAR stem of the occupants: find the palace where that stem sits on the HEAVEN plate; that area affects the person most (positively or negatively). A stem clashed or penalised there warns of trouble for that person.',
    '- Match the qi to the USE of each area: doors and stars suit some functions and not others. E.g. Open door is unsuitable for storage, archives or a closed area; Rest door suits relaxation, bedrooms, lifts after a long day; View door suits trading, scenic views, display; Shocking door suits signs, restaurants and talk; Death door suits storage, fabrics, stable/conservative work, and also WARDROBES and CUPBOARDS (Edu) — when the area is given a yin use (rest, study, quiet), wardrobes and cupboards there are favoured: say so; Birth door is money-making; Delusion door gives confusion or hides things (but can help creative ideas); Injury brings fighting energy.',
    '- Stars: Pillar = eating, restaurants, speech, also destructive/renovation force; Rice = penny saver, sickness star, cheap furniture; Official = traditional, health; Hero = fire, status, display; Grass = planner, talkative, water collecting; Heart = medicine, interviews, selection; Assistant = creativity, art, sales; Fowl = importance, dignity, golden colours; Aggressor = action, conflict.',
    '- Spirits: Snake = winding paths, cables, strange shapes, spaghetti-like forms; Yin = refined, high class; Harmonies = socialising, gathering people (but arguments affect family); Polaris (= Gou Chen = Qilin) = rough ground, obstacles, renovation; Bird = arguments, talk, indices, documents; Earth (Nine Earth) = calm, stable, flat ground, reliability; Heaven (Nine Heaven) = high, bright, appearance, expansion; Norm (Supreme Norm) = comfort, good food, appearance.',
    '- Each palace also has a Di Pan (earth-plate) spirit: the heaven spirit of the palace where its earth stem sits on the heaven plate: read it together with the heaven spirit (e.g. Bird over Zhi Fu in the Di Pan = spacious, comfortable, good for meetings; Gou Chen in the Di Pan = rough, dusty ground; Nine Earth in the Di Pan = calm, but obstacles in the centre).',
    '- Known formations used in the chapter: 甲 over 丙 "Cerulean Dragon turns its head" (fortunate at a door); 乙 over 辛 "Cerulean Dragon flees" (not attractive, people do not stay); 甲 hiding behind 辛 "Creeper twining on a tree"; 丁 wonder at birth/stage 2 "Star Wonder rises the Hall"; 乙 wonder "Moon/Sun wonder rises the hall" when strong; 丙 over 己 "Fire Star into imprisonment"; 庚 over 癸 or 癸 over 庚 a clash (White Tiger over water: metallic, sharp structures, confrontation); 戊/辛, 壬/己, 丙/壬, 丙/庚, 辛/乙 clashes; double 辛 or double 壬 self-penalty; Fu Yin (same stem above and below) = calm and stable but stagnant; Fan Yin between star and door = reversal, arguments; stem combinations (e.g. 甲 with 己, 丁 with 壬) and branch frames formed with the palace branches or the door branches (fire frame, water frame) soften clashes or make the palace too hot / too cold.',
    '- Growth stages of 乙丙丁 in the palace: Birth / Lu / stage 1-4 strong; Tomb or Vanishing (stage 10+) weak: e.g. 丙 in tomb in Qian = energy not received inside, keep the area bright.',
    '- Combine with the forms: a feature in the area (stairs, roads, water, a pergola, a statue) often mirrors the chart; read with flexibility, some qi is represented, some is not. Suggest cures: colour schemes by element, objects, lighting, better use of the area, moving desks or functions.',
    '',
    'OUTPUT:',
    '- Start with 2-3 sentences on the overall quality of the space and the qi entering at the Qi mouth. If the data gives a CHART CHARACTER, open with it: it is the distinctive character of the whole house (Edu). E.g. the Three Wonders all at stage 1 Birth = the energy of the house favours new beginnings, new ventures and the development of new ideas — provided the corresponding areas are cared for and lived in the appropriate way.',
    '- Then one short paragraph per palace (in the order Qi mouth palace, facing palace, sitting palace, then the others), naming the palace and direction, the QI FLOW (where the qi ends up and who the actors are), the other key factors you read, what the area is good or not good for, and a practical suggestion.',
    '- Then a short paragraph on each occupant whose birth year stem is given.',
    '- Be concrete and concise, like the case studies. Do not invent forms you were not told about: when the use of a room would matter, say what use suits the palace.',
    '- Plain text with **bold** palace names; no tables.'
  ].join('\n');

  // Qi flow of a palace (session 57, Edu): palace -> earth stem -> door -> heaven stem + star.
  var STEM_EL = { '甲':'Wood','乙':'Wood','丙':'Fire','丁':'Fire','戊':'Earth','己':'Earth','庚':'Metal','辛':'Metal','壬':'Water','癸':'Water' };
  var STAR_EL = { Grass:'Water', Rice:'Earth', Aggressor:'Wood', Assistant:'Wood', Fowl:'Earth', Heart:'Metal', Pillar:'Metal', Official:'Earth', Hero:'Fire' };
  var DOOR_EL = { Open:'Metal', Rest:'Water', Birth:'Earth', Injury:'Wood', Delusion:'Wood', View:'Fire', Death:'Earth', Shocking:'Metal' };
  var PAL_EL = { 1:'Water', 8:'Earth', 3:'Wood', 4:'Wood', 9:'Fire', 2:'Earth', 7:'Metal', 6:'Metal', 5:'Earth' };
  var GEN = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
  var CTL = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };
  function elRel(a, b) {             // how the qi passes from a (below) to b (above)
    if (!a || !b) return '';
    if (a === b) return 'same element as';
    if (GEN[a] === b) return 'GENERATES';
    if (GEN[b] === a) return 'is generated by (the flow TURNS BACK, yang generates yin: rest and quiet)';
    if (CTL[a] === b) return 'controls';
    return 'is controlled by';
  }
  function qiFlow(n, p) {
    var steps = [{ t: 'palace ' + PAL_EL[n], e: PAL_EL[n] }];
    if (p.diH && STEM_EL[p.diH]) steps.push({ t: 'earth stem ' + p.diH + ' ' + STEM_EL[p.diH], e: STEM_EL[p.diH] });
    if (p.door && DOOR_EL[p.door]) steps.push({ t: 'door ' + p.door + ' ' + DOOR_EL[p.door], e: DOOR_EL[p.door] });
    var out = steps[0].t, up = true;
    for (var i = 1; i < steps.length; i++) {
      var r = elRel(steps[i - 1].e, steps[i].e); if (r !== 'GENERATES') up = false;
      out += ' ' + r + ' ' + steps[i].t;
    }
    var last = steps[steps.length - 1].e, ends = [];
    if (p.tiH && STEM_EL[p.tiH]) { var r1 = elRel(last, STEM_EL[p.tiH]); if (r1 !== 'GENERATES') up = false; ends.push(r1 + ' heaven stem ' + p.tiH + ' ' + STEM_EL[p.tiH]); }
    if (p.star && STAR_EL[p.star]) { var r2 = elRel(last, STAR_EL[p.star]); if (r2 !== 'GENERATES') up = false; ends.push(r2 + ' star ' + p.star + ' ' + STAR_EL[p.star]); }
    if (ends.length) out += ', which ' + ends.join(' and ');
    return out + (up ? '  => unbroken generating flow from yin to yang (movement, activity)' : '  => not a fully generating flow');
  }

  // Element groups of a palace and the controls between them, each with its bridge element
  // (session 57, Edu: read by groups; a control is settled by the element added to the space).
  function elGroups(n, p) {
    var items = [{ t: 'palace', e: PAL_EL[n], lv: 0 }];
    if (p.diH && STEM_EL[p.diH]) items.push({ t: 'earth stem ' + p.diH, e: STEM_EL[p.diH], lv: 1 });
    if (p.door && DOOR_EL[p.door]) items.push({ t: 'door ' + p.door, e: DOOR_EL[p.door], lv: 2 });
    if (p.tiH && STEM_EL[p.tiH]) items.push({ t: 'heaven stem ' + p.tiH, e: STEM_EL[p.tiH], lv: 3 });
    if (p.star && STAR_EL[p.star]) items.push({ t: 'star ' + p.star, e: STAR_EL[p.star], lv: 3 });
    var order = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'], g = {};
    items.forEach(function (x) { (g[x.e] = g[x.e] || []).push(x); });
    var names = function (e) { return e + ' (' + g[e].map(function (x) { return x.t; }).join(' + ') + ')'; };
    var has = order.filter(function (e) { return g[e]; });
    var out = ['   Elements: ' + has.map(names).join('; ')];
    var gens = [], ctls = [];
    has.forEach(function (a) {
      if (g[GEN[a]]) gens.push(a + ' generates ' + GEN[a]);
      if (g[CTL[a]]) {
        var b = CTL[a], bridge = GEN[a], use = '';
        var aPal = g[a].some(function (x) { return x.lv === 0; }), bPal = g[b].some(function (x) { return x.lv === 0; });
        // Session 58: also between the upper steps (e.g. door controls star): a bridge that
        // carries the qi UP (from the lower level to the higher) is active, DOWN is yin.
        var lo = function (arr) { return Math.min.apply(null, arr.map(function (x) { return x.lv; })); };
        if (aPal) use = ': the qi then LEAVES the palace and climbs (active use)';
        else if (bPal) use = ': the qi then comes BACK to the palace (yin use: rest, study)';
        else if (lo(g[a]) < lo(g[b])) use = ': the qi then climbs to the upper level (active use)';
        else if (lo(g[a]) > lo(g[b])) use = ': the qi then comes back down (yin use: rest, study)';
        ctls.push(a + ' controls ' + b + ' - bridge ' + bridge + (g[bridge] ? ' (already present)' : ' (to add)') + use);
      }
    });
    if (gens.length) out.push('   Generating: ' + gens.join('; '));
    if (ctls.length) out.push('   Controls: ' + ctls.join(' | '));
    return out;
  }

  var PAL_INFO = { 1:'Kan · N · Water', 8:'Gen · NE · Earth', 3:'Zhen · E · Wood', 4:'Xun · SE · Wood',
                   9:'Li · S · Fire', 2:'Kun · SW · Earth', 7:'Dui · W · Metal', 6:'Qian · NW · Metal', 5:'Centre · Earth' };

  // Birth YEAR pillars of the people of the house (owner + guest #2), by Li Chun.
  function occupants() {
    var out = [];
    try {
      var L = cur(), all = _fsHousesLoad(), h = (all[L.personName] || [])[L.houseIdx];
      var list = [];
      if (h && !h.ownerAway) list.push({ who: h.personName || L.personName || 'Owner', date: h.birthDate || '' });
      if (h && h.guest && h.guest.birthDate) list.push({ who: h.guest.name || 'Occupant 2', date: h.guest.birthDate });
      if (h && !h.ownerAway && !h.birthDate) {        // owner stored as the person card
        var pd = (document.getElementById('person-date') || {}).value || '';
        if (pd && list.length) list[0].date = pd;
      }
      list.forEach(function (o) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(o.date || '');
        if (!m || !window.Solar) return;
        var y = window.Solar.fromYmd(+m[1], +m[2], +m[3]).getLunar().getYearInGanZhiExact();
        out.push({ who: o.who, year: y });
      });
    } catch (e) {}
    return out;
  }

  var _last = null;          // { r, kind, H } of the chart on screen

  // Session 58 (Edu): the room in each palace, saved with the house (h.liqiRooms = { palace: name }).
  // Without a saved house (facing typed by hand) the names live only until the panel closes.
  var _roomsTmp = {};
  function roomsOf() {
    try {
      var L = cur();
      if (L && typeof _fsHousesLoad === 'function') {
        var h = (_fsHousesLoad()[L.personName] || [])[L.houseIdx];
        if (h) return h.liqiRooms || {};
      }
    } catch (e) {}
    return _roomsTmp;
  }
  function roomSet(n, v) {
    v = String(v || '').trim().slice(0, 40);
    try {
      var L = cur();
      if (L && typeof _fsHousesLoad === 'function' && typeof _fsHousesSave === 'function') {
        var all = _fsHousesLoad(), h = (all[L.personName] || [])[L.houseIdx];
        if (h) {
          var m = h.liqiRooms || {};
          if (v) m[n] = v; else delete m[n];
          h.liqiRooms = m; _fsHousesSave(all); roomsCount(); return;
        }
      }
    } catch (e) {}
    if (v) _roomsTmp[n] = v; else delete _roomsTmp[n];
    roomsCount();
  }
  function roomsCount() {
    var el = document.getElementById('liqi-rooms-n'); if (!el) return;
    var k = Object.keys(roomsOf()).length; el.textContent = k ? ' (' + k + ')' : '';
  }
  function roomsToggle() {
    var g = document.getElementById('liqi-rooms'); if (!g) return;
    g.style.display = (g.style.display === 'none') ? '' : 'none';
  }
  function roomsHtml() {
    var R = roomsOf(), esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var cells = [4, 9, 2, 3, 5, 7, 8, 1, 6].map(function (n) {      // South on top
      var nm = n === 5 ? 'Centre' : String(PAL_INFO[n] || n).split(' · ').slice(0, 2).join(' ');
      return '<input value="' + esc(R[n] || '') + '" placeholder="' + esc(nm) + '" maxlength="40" '
        + 'onchange="liqiRoom(' + n + ',this.value)" style="width:100%;box-sizing:border-box;font-size:12px;padding:5px;'
        + 'border:1px solid #ccc;border-radius:4px;">';
    }).join('');
    var k = Object.keys(R).length;
    return '<div style="margin-top:8px;font-size:12px;"><a href="#" onclick="liqiRoomsToggle();return false;" style="color:#5e35b1;">'
      + '🏷 Rooms<span id="liqi-rooms-n">' + (k ? ' (' + k + ')' : '') + '</span></a>'
      + '<div id="liqi-rooms" style="display:none;margin-top:6px;">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">' + cells + '</div>'
      + '<div style="font-size:10px;color:#999;margin-top:3px;">South on top. The room in each palace: the Interpretation reads it for that use.</div>'
      + '</div></div>';
  }

  // Session 58 (Edu): growth stages of the Three Wonders 乙丙丁 on the heaven plate, and the
  // chart's distinctive character when all three stand at the same stage (e.g. all at Birth).
  var BRS = '子丑寅卯辰巳午未申酉戌亥';
  var PAL_BR = { 1:'子', 8:'丑寅', 3:'卯', 4:'辰巳', 9:'午', 2:'未申', 7:'酉', 6:'戌亥' };
  var STAGES = ['Birth','Bath','Crown','Lu','Emperor','Decline','Sick','Death','Tomb','Vanishing','Conceived','Nourish'];
  var BIRTH_AT = { '乙':'午', '丙':'寅', '丁':'酉' }, YANG = { '丙':1 };
  function stageOf(stem, br) {
    var b0 = BRS.indexOf(BIRTH_AT[stem]), b = BRS.indexOf(br);
    var k = YANG[stem] ? (b - b0 + 12) % 12 : (b0 - b + 12) % 12;
    return STAGES[k];
  }
  function wonders(c) {
    var out = [];
    Object.keys(c.palaces).forEach(function (n) {
      var p = c.palaces[n], st = p && p.tiH;
      if (!BIRTH_AT[st] || !PAL_BR[n]) return;
      out.push({ stem: st, pal: +n, stages: PAL_BR[n].split('').map(function (br) { return { br: br, st: stageOf(st, br) }; }) });
    });
    return out;
  }

  function describe(L) {
    L = L || _last;
    var c = window.QMDJWaterScanner.getHourChart(2000, 1, 1, L.r.hGan, L.r.hZhi, null,
                                                 { ju: L.r.ju, dun: 'yang' });
    if (!c || !c.palaces) return null;
    var r = L.r, H = L.H, kind = L.kind;
    var facePal = PAL.filter(function (x) { return x[0] === palaceOf(r.facing)[0]; })[0][0];
    var sitPal = palaceOf(r.sitting)[0];
    var dp = dipanDeities(r);
    var lines = [];
    lines.push('Space: ' + (kind === 'business' ? 'BUSINESS' : 'HOUSE') + (H.name ? ' "' + H.name + '"' : ''));
    lines.push('Period ' + r.ju + ' -> Yang Ju ' + r.ju + '. Facing ' + r.facing + ' deg (palace ' + facePal + '), sitting ' + r.sitting + ' deg (palace ' + sitPal + ').');
    lines.push('Fu Shou ' + r.xunHead + ' ' + r.yi + ' (' + r.mountain + '). Zhi Fu palace = ' + r.zhiFu + (kind === 'house' ? ' (Qi mouth / door)' : ' (facing palace)') + '. Chart hour ' + r.hGan + r.hZhi + '.');
    // Session 58 (Edu): voids do not count in a QMDJ Feng Shui (Li Qi) chart -> not given to the model.
    try {
      var W = wonders(c);
      if (W.length) {
        lines.push('THREE WONDERS (heaven plate) growth stages: ' + W.map(function (w) {
          return w.stem + ' in ' + String(PAL_INFO[w.pal]).split(' · ')[0] + ' ' + w.stages.map(function (x) { return x.br + ' ' + x.st; }).join(' / ');
        }).join('; ') + '.');
        if (W.length === 3) {
          var common = STAGES.filter(function (S) { return W.every(function (w) { return w.stages.some(function (x) { return x.st === S; }); }); });
          if (common.length) lines.push('CHART CHARACTER: all three Wonders 乙丙丁 stand at the same growth stage: ' + common.join(' / ') + '.');
        }
      }
    } catch (e) {}
    // Session 58 (Edu): the flying stars are always the BASE; the Li Qi leans on them.
    var FSX = null;
    try {
      if (typeof FlyingStars !== 'undefined' && typeof fsMountainCharFromDeg === 'function' && isFinite(parseFloat(H.facing))) {
        var fc = null;
        // The house's saved MANUAL chart wins (Edu's Vienna chart is hand-composed), unless
        // facing / period were typed by hand in this panel.
        try {
          var Lh = cur();
          if (Lh && _ovFacing == null && _ovPeriod == null) {
            var hh = (_fsHousesLoad()[Lh.personName] || [])[Lh.houseIdx], ff = hh ? _fsActiveFloor(hh) : null;
            if (ff && ff.manualChart && ff.manualChart.facingStars && ff.manualChart.sittingStars && ff.manualChart.baseStars) fc = ff.manualChart;
          }
        } catch (e) {}
        var manual = !!fc;
        if (!fc) fc = FlyingStars.calculate(parseInt(H.period, 10), fsMountainCharFromDeg(parseFloat(H.facing)),
                                       typeof _fsReplacementOn !== 'undefined' ? !!_fsReplacementOn : false);
        FSX = {};
        [4, 9, 2, 3, 5, 7, 8, 1, 6].forEach(function (n, i) {     // FlyingStars arrays: South-on-top grid order
          FSX[n] = { b: fc.baseStars[i], m: fc.sittingStars[i], w: fc.facingStars[i] };
        });
        lines.push('FLYING STARS (natal chart, period ' + H.period + ', house facing ' + H.facing + ' deg' + (fc.replacement ? ', replacement' : '') + (manual ? ', MANUAL chart composed by the consultant: use it exactly as given' : '') + '): the BASE of the reading.');
      }
    } catch (e) { FSX = null; }
    // Session 58 (Edu): the prevailing water star of the current period locked in the centre
    // must ALWAYS be freed (towards the facing, exchanged with the facing's water star).
    try {
      var yNow = new Date().getFullYear(), curP = yNow >= 2044 ? 1 : (yNow >= 2024 ? 9 : 8);
      if (FSX && FSX[5] && FSX[5].w === curP) {
        var p5 = null; [4, 9, 2, 3, 7, 8, 1, 6].forEach(function (k) { if (FSX[k] && FSX[k].w === 5) p5 = k; });
        var nm = function (k) { return String(PAL_INFO[k]).split(' · ').slice(0, 2).join(' '); };
        lines.push('PRIORITY: the prevailing water star ' + curP + ' of the current period is locked in the CENTRE. It must be freed: either towards the FACING (palace '
          + nm(facePal) + '), or by exchanging its place with the water star 5' + (p5 ? ' (in palace ' + nm(p5) + ')' : '')
          + (p5 === facePal ? ' - here the two ways coincide: the water star 5 is in the facing palace.' : '.'));
      }
    } catch (e) {}
    lines.push('');
    lines.push('PALACES (heaven stem / earth stem, star, door, spirit, Di Pan spirit):');
    [4, 9, 2, 3, 5, 7, 8, 1, 6].forEach(function (n) {
      var p = c.palaces[n]; if (!p) return;
      var tags = [];
      if (n === r.zhiFu) tags.push(kind === 'house' ? 'QI MOUTH' : 'FACING / QI MOUTH');
      if (n === facePal && kind === 'house') tags.push('FACING PALACE');
      if (n === sitPal) tags.push('SITTING PALACE');
      if (p.zhiFu) tags.push('Zhi Fu');
      if (p.zhiShi) tags.push('Zhi Shi');
      if (BIRTH_AT[p.tiH] && PAL_BR[n]) tags.push('WONDER ' + p.tiH + ' ' + PAL_BR[n].split('').map(function (br) { return stageOf(p.tiH, br); }).join('/'));
      var room = (roomsOf() || {})[n];
      if (room) tags.push('ROOM: ' + room);
      lines.push(n + ' ' + PAL_INFO[n] + ': ' + p.tiH + ' over ' + p.diH + ', star ' + p.star
        + (p.door ? ', door ' + p.door : '') + ', spirit ' + p.deity
        + (dp && dp[n] ? ', Di Pan spirit ' + dp[n] : '') + (tags.length ? '  [' + tags.join(', ') + ']' : ''));
      if (FSX && FSX[n]) lines.push('   Flying stars: mountain ' + FSX[n].m + ', water ' + FSX[n].w + ' (base ' + FSX[n].b + ')');
      try { lines.push('   Qi flow: ' + qiFlow(n, p)); elGroups(n, p).forEach(function (x) { lines.push(x); }); } catch (e) {}
    });
    var occ = occupants();
    if (occ.length) {
      lines.push('');
      lines.push('OCCUPANTS (birth year pillar): ' + occ.map(function (o) { return o.who + ' ' + o.year; }).join('; '));
    }
    return lines.join('\n');
  }

  function replyLang() {
    var l = 'auto';
    try { l = localStorage.getItem('xkdg_ai_lang') || 'auto'; } catch (e) {}
    if (l === 'it') return 'Write the interpretation in Italian.';
    if (l === 'fr') return 'Write the interpretation in French.';
    if (l === 'en') return 'Write the interpretation in English.';
    var n = (navigator.language || 'en').slice(0, 2);
    return n === 'it' ? 'Write the interpretation in Italian.' : n === 'fr' ? 'Write the interpretation in French.' : 'Write the interpretation in English.';
  }

  function md(t) {
    var e = String(t).replace(/[&<>]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]; });
    e = e.replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    return e.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
  }

  function interpret() {
    var out = document.getElementById('liqi-ai-out'), btn = document.getElementById('liqi-ai-btn');
    if (!out || !_last) return;
    if (typeof window.XKDGAIOneShot !== 'function') {
      out.innerHTML = '<span style="color:#c0392b;">The AI assistant is not available in this app.</span>'; return;
    }
    var data = describe();
    if (!data) { out.innerHTML = '<span style="color:#c0392b;">Chart data not available.</span>'; return; }
    if (btn) btn.disabled = true;
    out.innerHTML = '<span style="color:#888;">⏳ Interpreting the chart…</span>';
    window.XKDGAIOneShot(READ_GUIDE, 'Interpret this QMDJ Li Qi permanent chart.\n\n' + data + '\n\n' + replyLang(), 3500, { effort: 'low', onText: function (t) { out.innerHTML = md(t) + ' <span style="color:#888;">⏳</span>'; } })
      .then(function (t) { out.innerHTML = md(t); })
      .catch(function (e) { out.innerHTML = '<span style="color:#c0392b;">⚠ ' + String(e && e.message || e) + '</span>'; })
      .then(function () { if (btn) btn.disabled = false; });
  }

  // Di Pan spirits (session 32, Edu): the Di Pan spirit of a palace is the heaven spirit
  // that goes with that palace's EARTH stem, i.e. the spirit of the palace where that same
  // stem sits on the heaven plate. (Same result as the spirits of the Fu Yin chart of the
  // Fu Shou: checked on all 540 Yang charts.) Matches case studies 1, 2 and 4.
  function dipanDeities(r) {
    try {
      var c = window.QMDJWaterScanner.getHourChart(2000, 1, 1, r.hGan, r.hZhi, null, { ju: r.ju, dun: 'yang' });
      var byHeaven = {};
      Object.keys(c.palaces).forEach(function (k) { var q = c.palaces[k]; if (q.tiH) byHeaven[q.tiH] = q.deity; });
      var m = {};
      Object.keys(c.palaces).forEach(function (k) {
        var d = byHeaven[c.palaces[k].diH]; if (d) m[k] = d; });
      return m;
    } catch (e) { return null; }
  }

  function show() {
    var info = document.getElementById('liqi-info'), box = document.getElementById('liqi-chart');
    var hEl = document.getElementById('liqi-house'), sel = document.getElementById('liqi-qi');
    if (!info || !box) return;
    var H = houseData();
    head();
    if (!H) {
      info.innerHTML = '<span style="color:#c0392b;">Choose a house above, or type the facing and the period.</span>';
      box.innerHTML = ''; return;
    }
    if (H.facing == null || H.facing === '' || !isFinite(parseFloat(H.facing)) || H.period == null || H.period === '') {
      info.innerHTML = '<span style="color:#c0392b;">This house has no ' + ((H.facing == null || H.facing === '' || !isFinite(parseFloat(H.facing))) ? 'facing' : 'period')
        + ' saved: type it above (it is used for this chart only), or choose another house.</span>';
      box.innerHTML = ''; return;
    }
    var kind = _kind;
    document.getElementById('liqi-qi-wrap').style.display = (kind === 'business') ? 'none' : '';
    // Qi mouth menu: the saved door first (when there is one), then every palace by hand.
    var qi = _qiManual || H.doorPalace || null;
    var opts = '<option value="">' + (H.doorPalace
        ? ('🚪 ' + (H.doorName || 'door') + ' · ' + PAL.filter(function (x) { return x[0] === H.doorPalace; })[0][1])
        : '— pick by hand —') + '</option>';
    PAL.forEach(function (x) {
      opts += '<option value="' + x[0] + '"' + (_qiManual === x[0] ? ' selected' : '') + '>'
            + x[1] + ' ' + x[0] + ' · ' + x[2] + '</option>';
    });
    sel.innerHTML = opts;
    var r = compute(kind, parseFloat(H.facing), H.period, qi);
    if (r.error) {
      var msg = r.error;
      if (/Qi mouth/.test(msg)) msg = 'No door palace saved for this house: pick the Qi mouth above, '
        + 'or add it to the external door in House Profiles (✏).';
      info.innerHTML = '<span style="color:#c0392b;">' + msg + '</span>'; box.innerHTML = ''; return;
    }
    var dir = (kind === 'business') ? 'Facing' : 'Sitting';
    info.innerHTML =
        '<b>Yang Jú ' + r.ju + '</b> · ' + dir + ' ' + (Math.round(r.fsDeg * 10) / 10) + '° = <b>' + r.mountain + '</b>'
      + ' → Fu Shou <b>' + r.xunHead + ' ' + r.yi + '</b>'
      + ' · Zhi Fu in <b>' + r.zhiFuName + ' ' + r.zhiFu + '</b>'
      + ' → hour <b>' + r.hGan + r.hZhi + '</b> ' + (PY[r.hZhi] || '')
      + (r.nearEdge ? '<div style="color:#b26a00;">⚠ ' + dir
          + ' is within 1.5° of a double-mountain edge: check the next mountain too.</div>' : '');
    var html = '';
    try {
      html = window.showQimenChart('2000-01-01', r.hGan, r.hZhi, null,
        { returnHtml: true, forceJuDun: { ju: r.ju, dun: 'yang' }, dipanDeities: dipanDeities(r) }) || '';
      html = html.replace(/2000-01-01\s*·\s*/g, '');               // a permanent chart has no date
    } catch (e) { html = ''; }
    _last = html ? { r: r, kind: kind, H: H } : null;
    box.innerHTML = (html || '<div style="color:#c0392b;font-size:12px;">Chart renderer not available.</div>')
      + (html ? roomsHtml() : '')
      + (html ? '<div style="margin-top:12px;text-align:center;">'
          + '<button id="liqi-ai-btn" onclick="liqiInterpret()" style="background:#5e35b1;color:#fff;border:none;border-radius:6px;'
          + 'padding:9px 20px;font-size:14px;font-weight:bold;cursor:pointer;">✨ Interpretation</button>'
          + '<div style="font-size:10px;color:#999;margin-top:4px;">AI reading, indicative only: it is not a substitute for a consultation.</div>'
          + '</div><div id="liqi-ai-out" style="margin-top:10px;font-size:13px;line-height:1.55;color:#333;"></div>' : '');
  }

  // Session 57 (Edu: "the Assistant should know this chart"): the same chart text and reading
  // method the Interpretation button uses, for the in-app Assistant (tool get_liqi_chart).
  // o: { kind 'house'|'business', qi_palace 1-9 (house only), facing, period, show }.
  // Facing / period / Qi mouth default to the house loaded in House Profiles.
  function forAI(o) {
    o = o || {};
    var H = houseData() || { name: '', facing: null, period: null, doorPalace: null, doorName: '' };
    var kind = (o.kind === 'business') ? 'business' : 'house';
    var facing = (o.facing != null && isFinite(o.facing)) ? +o.facing : parseFloat(H.facing);
    var period = (o.period != null) ? o.period : H.period;
    var qi = o.qi_palace || H.doorPalace || null;
    if (!isFinite(facing) || period == null) return { ok: false, error: 'No house loaded and no facing / period given: load a house (load_house) or pass facing and period.' };
    var r = compute(kind, facing, period, qi);
    if (r.error) return { ok: false, error: /Qi mouth/.test(r.error)
      ? 'House chart: the palace of the Qi mouth (main door) is needed. No external door with a palace is saved for this house: ask the user in which palace the door is (or pass qi_palace), or use kind "business" when it is a business.'
      : r.error };
    var HH = { name: H.name, facing: facing, period: period, doorPalace: H.doorPalace, doorName: H.doorName };
    var text = null; try { text = describe({ r: r, kind: kind, H: HH }); } catch (e) {}
    if (!text) return { ok: false, error: 'Chart data not available.' };
    var shown = false;
    if (o.show && houseData()) { try { shown = true; open(); _qiManual = (kind === 'house' && o.qi_palace) ? parseInt(o.qi_palace, 10) : null; setKind(kind); } catch (e) {} }
    var cut = READ_GUIDE.indexOf('\nOUTPUT:');
    return { ok: true, scanner: 'qmdj_liqi', house: H.name || undefined, kind: kind,
             qi_mouth_from: kind === 'business' ? 'facing palace' : (o.qi_palace ? 'given by hand' : ('saved door' + (H.doorName ? ' "' + H.doorName + '"' : ''))),
             near_double_mountain_edge: r.nearEdge || undefined,
             chart: text, how_to_read: cut > 0 ? READ_GUIDE.slice(0, cut) : READ_GUIDE,
             shown_on_screen: shown };
  }
  window.qmdjLiQiForAI = forAI;
  window.qmdjLiQiCompute = compute;
  window.openLiQiPanel = open;
  window.liqiShow = show;
  window.liqiPickQi = pickQi;
  window.liqiPickHouse = pickHouse;
  window.liqiSet = setVal;
  window.liqiKind = setKind;
  window.liqiBack = back;
  // Session 58 (Edu): the Li Qi chart around the luopan — its eight cells, cut out and set
  // around the wheel (same ring as the QMDJ annual chart). Always the house LOADED in the
  // app (the one the luopan shows), as a House, Qi mouth = the saved external door.
  window.qmdjLiQiRing = function () {
    var sp = _pick, sf = _ovFacing, spd = _ovPeriod, H = null;
    try { _pick = null; _ovFacing = null; _ovPeriod = null; H = houseData(); }
    finally { _pick = sp; _ovFacing = sf; _ovPeriod = spd; }
    if (!H) return { ok: false, reason: 'load a house first' };
    if (H.facing == null || H.facing === '' || !isFinite(parseFloat(H.facing)) || H.period == null || H.period === '')
      return { ok: false, reason: 'this house has no facing or period saved' };
    if (!H.doorPalace) return { ok: false, reason: 'no Qi mouth: add the palace of the external door in House Profiles' };
    var r = compute('house', parseFloat(H.facing), H.period, H.doorPalace);
    if (!r || r.error) return { ok: false, reason: (r && r.error) || 'chart unavailable' };
    return { ok: true, hGan: r.hGan, hZhi: r.hZhi, ju: r.ju, dipan: dipanDeities(r),
             head: 'QMDJ Li Qi \u00b7 Yang J\u00fa ' + r.ju + ' \u00b7 ' + r.hGan + r.hZhi + ' \u00b7 Qi mouth ' + r.zhiFuName };
  };
  window.liqiInterpret = interpret;
  window.liqiRoom = roomSet;
  window.liqiRoomsToggle = roomsToggle;
})();

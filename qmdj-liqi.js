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
  function houseData() {
    try {
      var L = window._fsLoadedHouse;
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
    back();
    ov.style.display = 'flex';
    try { document.getElementById('liqi-btn-house').focus(); } catch (e) {}
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
    '- Zhi Fu (Commander) and Zhi Shi (the door of the Commander) are key points.',
    '- Birth YEAR stem of the occupants: find the palace where that stem sits on the HEAVEN plate; that area affects the person most (positively or negatively). A stem clashed or penalised there warns of trouble for that person.',
    '- Match the qi to the USE of each area: doors and stars suit some functions and not others. E.g. Open door is unsuitable for storage, archives or a closed area; Rest door suits relaxation, bedrooms, lifts after a long day; View door suits trading, scenic views, display; Shocking door suits signs, restaurants and talk; Death door suits storage, fabrics, stable/conservative work; Birth door is money-making; Delusion door gives confusion or hides things (but can help creative ideas); Injury brings fighting energy.',
    '- Stars: Pillar = eating, restaurants, speech, also destructive/renovation force; Rice = penny saver, sickness star, cheap furniture; Official = traditional, health; Hero = fire, status, display; Grass = planner, talkative, water collecting; Heart = medicine, interviews, selection; Assistant = creativity, art, sales; Fowl = importance, dignity, golden colours; Aggressor = action, conflict.',
    '- Spirits: Commander/Zhi Fu = prominent, protected; Snake = winding paths, cables, strange shapes, spaghetti-like forms; Yin = refined, high class; Harmonies = socialising, gathering people (but arguments affect family); Polaris (= Gou Chen = Qilin) = rough ground, obstacles, renovation; Bird = arguments, talk, indices, documents; Earth (Nine Earth) = calm, stable, flat ground, reliability; Heaven (Nine Heaven) = high, bright, appearance, expansion; Norm (Supreme Norm) = comfort, good food, appearance.',
    '- Each palace also has a Di Pan (earth-plate) spirit: the heaven spirit of the palace where its earth stem sits on the heaven plate: read it together with the heaven spirit (e.g. Bird over Zhi Fu in the Di Pan = spacious, comfortable, good for meetings; Gou Chen in the Di Pan = rough, dusty ground; Nine Earth in the Di Pan = calm, but obstacles in the centre).',
    '- Known formations used in the chapter: 甲 over 丙 "Cerulean Dragon turns its head" (fortunate at a door); 乙 over 辛 "Cerulean Dragon flees" (not attractive, people do not stay); 甲 hiding behind 辛 "Creeper twining on a tree"; 丁 wonder at birth/stage 2 "Star Wonder rises the Hall"; 乙 wonder "Moon/Sun wonder rises the hall" when strong; 丙 over 己 "Fire Star into imprisonment"; 庚 over 癸 or 癸 over 庚 a clash (White Tiger over water: metallic, sharp structures, confrontation); 戊/辛, 壬/己, 丙/壬, 丙/庚, 辛/乙 clashes; double 辛 or double 壬 self-penalty; Fu Yin (same stem above and below) = calm and stable but stagnant; Fan Yin between star and door = reversal, arguments; stem combinations (e.g. 甲 with 己, 丁 with 壬) and branch frames formed with the palace branches or the door branches (fire frame, water frame) soften clashes or make the palace too hot / too cold.',
    '- Growth stages of 乙丙丁 in the palace: Birth / Lu / stage 1-4 strong; Tomb or Vanishing (stage 10+) weak: e.g. 丙 in tomb in Qian = energy not received inside, keep the area bright.',
    '- Combine with the forms: a feature in the area (stairs, roads, water, a pergola, a statue) often mirrors the chart; read with flexibility, some qi is represented, some is not. Suggest cures: colour schemes by element, objects, lighting, better use of the area, moving desks or functions.',
    '',
    'OUTPUT:',
    '- Start with 2-3 sentences on the overall quality of the space and the qi entering at the Qi mouth.',
    '- Then one short paragraph per palace (in the order Qi mouth palace, facing palace, sitting palace, then the others), naming the palace and direction, the key factors you read, what the area is good or not good for, and a practical suggestion.',
    '- Then a short paragraph on each occupant whose birth year stem is given.',
    '- Be concrete and concise, like the case studies. Do not invent forms you were not told about: when the use of a room would matter, say what use suits the palace.',
    '- Plain text with **bold** palace names; no tables.'
  ].join('\n');

  var PAL_INFO = { 1:'Kan · N · Water', 8:'Gen · NE · Earth', 3:'Zhen · E · Wood', 4:'Xun · SE · Wood',
                   9:'Li · S · Fire', 2:'Kun · SW · Earth', 7:'Dui · W · Metal', 6:'Qian · NW · Metal', 5:'Centre · Earth' };

  // Birth YEAR pillars of the people of the house (owner + guest #2), by Li Chun.
  function occupants() {
    var out = [];
    try {
      var L = window._fsLoadedHouse, all = _fsHousesLoad(), h = (all[L.personName] || [])[L.houseIdx];
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

  function describe() {
    var c = window.QMDJWaterScanner.getHourChart(2000, 1, 1, _last.r.hGan, _last.r.hZhi, null,
                                                 { ju: _last.r.ju, dun: 'yang' });
    if (!c || !c.palaces) return null;
    var r = _last.r, H = _last.H, kind = _last.kind;
    var facePal = PAL.filter(function (x) { return x[0] === palaceOf(r.facing)[0]; })[0][0];
    var sitPal = palaceOf(r.sitting)[0];
    var dp = dipanDeities(r);
    var lines = [];
    lines.push('Space: ' + (kind === 'business' ? 'BUSINESS' : 'HOUSE') + (H.name ? ' "' + H.name + '"' : ''));
    lines.push('Period ' + r.ju + ' -> Yang Ju ' + r.ju + '. Facing ' + r.facing + ' deg (palace ' + facePal + '), sitting ' + r.sitting + ' deg (palace ' + sitPal + ').');
    lines.push('Fu Shou ' + r.xunHead + ' ' + r.yi + ' (' + r.mountain + '). Zhi Fu palace = ' + r.zhiFu + (kind === 'house' ? ' (Qi mouth / door)' : ' (facing palace)') + '. Chart hour ' + r.hGan + r.hZhi + '.');
    if (c.voidBranches && c.voidBranches.length) lines.push('Void (Kong Wang) branches: ' + c.voidBranches.join(' ') + ' (palaces ' + (c.voidPalaces || []).join(', ') + ').');
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
      lines.push(n + ' ' + PAL_INFO[n] + ': ' + p.tiH + ' over ' + p.diH + ', star ' + p.star
        + (p.door ? ', door ' + p.door : '') + ', spirit ' + p.deity
        + (dp && dp[n] ? ', Di Pan spirit ' + dp[n] : '') + (tags.length ? '  [' + tags.join(', ') + ']' : ''));
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
    window.XKDGAIOneShot(READ_GUIDE, 'Interpret this QMDJ Li Qi permanent chart.\n\n' + data + '\n\n' + replyLang(), 3500)
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
    if (!H) {
      hEl.innerHTML = '';
      info.innerHTML = '<span style="color:#c0392b;">Load a house in House Profiles first.</span>';
      box.innerHTML = ''; return;
    }
    hEl.innerHTML = '<b>' + (H.name || 'House') + '</b> · Facing ' + (H.facing != null ? H.facing + '°' : '—')
      + ' · Period ' + (H.period != null ? H.period : '—');
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
      + (html ? '<div style="margin-top:12px;text-align:center;">'
          + '<button id="liqi-ai-btn" onclick="liqiInterpret()" style="background:#5e35b1;color:#fff;border:none;border-radius:6px;'
          + 'padding:9px 20px;font-size:14px;font-weight:bold;cursor:pointer;">✨ Interpretation</button>'
          + '<div style="font-size:10px;color:#999;margin-top:4px;">AI reading, indicative only: it is not a substitute for a consultation.</div>'
          + '</div><div id="liqi-ai-out" style="margin-top:10px;font-size:13px;line-height:1.55;color:#333;"></div>' : '');
  }

  window.qmdjLiQiCompute = compute;
  window.openLiQiPanel = open;
  window.liqiShow = show;
  window.liqiPickQi = pickQi;
  window.liqiKind = setKind;
  window.liqiBack = back;
  window.liqiInterpret = interpret;
})();

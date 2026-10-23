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
        if (d.kind !== 'internal' && d.palace) { door = d; return true; } return false; });
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
        { returnHtml: true, forceJuDun: { ju: r.ju, dun: 'yang' } }) || '';
      html = html.replace(/2000-01-01\s*·\s*/g, '');               // a permanent chart has no date
    } catch (e) { html = ''; }
    box.innerHTML = html || '<div style="color:#c0392b;font-size:12px;">Chart renderer not available.</div>';
  }

  window.qmdjLiQiCompute = compute;
  window.openLiQiPanel = open;
  window.liqiShow = show;
  window.liqiPickQi = pickQi;
  window.liqiKind = setKind;
  window.liqiBack = back;
})();

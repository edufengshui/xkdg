// ============================================================
// flying-stars-qimen.js
// Find Qimen Dun Jia hours that "activate" a specific Flying
// Star (Mountain 山星 or Water 向星) in the native chart.
// XKDG Bazi Calculator
// ============================================================
//
// USO:
//   1. In index.html, dopo flying-stars.js e qmdj-water-scanner.js:
//        <script src="flying-stars-qimen.js"></script>
//   2. In app-fengshui.js, aggiungi un pulsante che chiama:
//        onclick="QFS.open()"
//
// COSA FA:
//   Per la carta Flying Stars corrente (basata su House Facing e
//   Period), trova le ORE in cui certe entità del Qi Men Dun Jia
//   (steli 三奇 乙/丙/丁, porte 吉門 開/休/生/景, 9 stelle celesti,
//   8 spiriti 八神) cadono nel palazzo dove si trova una Water Star
//   (向星) o Mountain Star (山星) specifica della carta nativa.
//
// DIPENDENZE:
//   • flying-stars.js   (window.FlyingStars)
//   • qmdj-water-scanner.js (window.QMDJWaterScanner)
//   • lunar-javascript  (window.Solar)
//   • app-fengshui.js   (fsMountainCharFromDeg, opzionalmente showQimenChart)
//
// LEGGE DAL DOM:
//   • #fs-house-facing, #fs-period   — input della carta FS
//   • #scan-start                    — data di partenza nella toolbar
//   • window._fsRangeDays            — durata in giorni (impostata
//                                      dai pulsanti 1m/3m/6m/1y/2y/5y)
// SCRIVE NEL DOM:
//   • inietta pannello e risultati dentro #fs-results-area
//
// ============================================================

(function(){
  'use strict';

  // ---------------------------------------------------------------
  // COSTANTI: mappatura griglia Flying Stars → palazzo QMDJ
  // ---------------------------------------------------------------
  // FS griglia (3×3, Sud in alto):    QMDJ Luo Shu palaces:
  //   0=SE  1=S   2=SW                  4   9   2
  //   3=E   4=Ctr 5=W                   3   5   7
  //   6=NE  7=N   8=NW                  8   1   6
  var FS_GRID_TO_QMDJ_PALACE = {
    0:4, 1:9, 2:2,
    3:3, 4:5, 5:7,
    6:8, 7:1, 8:6
  };
  var FS_GRID_TO_LABEL = {
    0:'SE 巽', 1:'S 離', 2:'SW 坤',
    3:'E 震',  4:'C 中', 5:'W 兌',
    6:'NE 艮', 7:'N 坎', 8:'NW 乾'
  };
  var QMDJ_PALACE_TO_LABEL = {
    4:'SE 巽', 9:'S 離',  2:'SW 坤',
    3:'E 震',  5:'C 中',  7:'W 兌',
    8:'NE 艮', 1:'N 坎',  6:'NW 乾'
  };

  // 9 stelle celesti — il QMDJ scanner ritorna i nomi inglesi tradotti
  // num = numero della stella (1-9); color = colore richiesto per la UI.
  var QM_STARS = [
    {key:'Peng',  en:'Grass',     han:'天蓬', num:1, color:'#1565c0', label:'天蓬 Peng (Grass)'},
    {key:'Rui',   en:'Rice',      han:'天芮', num:2, color:'#795548', label:'天芮 Rui (Rice)'},
    {key:'Chong', en:'Aggressor', han:'天沖', num:3, color:'#2e7d32', label:'天沖 Chong (Aggressor)'},
    {key:'Fu',    en:'Assistant', han:'天輔', num:4, color:'#2e7d32', label:'天輔 Fu (Assistant)'},
    {key:'Qin',   en:'Fowl',      han:'天禽', num:5, color:'#795548', label:'天禽 Qin (Fowl)'},
    {key:'Xin',   en:'Heart',     han:'天心', num:6, color:'#9e9e9e', label:'天心 Xin (Heart)'},
    {key:'Zhu',   en:'Pillar',    han:'天柱', num:7, color:'#9e9e9e', label:'天柱 Zhu (Pillar)'},
    {key:'Ren',   en:'Official',  han:'天任', num:8, color:'#795548', label:'天任 Ren (Official)'},
    {key:'Ying',  en:'Hero',      han:'天英', num:9, color:'#c62828', label:'天英 Ying (Hero)'}
  ];
  // Mappa nome inglese (come restituito da getHourChart) → chiave pinyin
  var STAR_EN_TO_KEY = {};
  QM_STARS.forEach(function(s){ STAR_EN_TO_KEY[s.en] = s.key; });

  // 3 stelle Qi (San Qi)
  var QM_STEMS = [
    {key:'Yi',   han:'乙', label:'乙 Yi'},
    {key:'Bing', han:'丙', label:'丙 Bing'},
    {key:'Ding', han:'丁', label:'丁 Ding'}
  ];

  // 4 porte favorevoli — il QMDJ scanner ritorna i nomi inglesi
  var QM_DOORS = [
    {key:'Open',     han:'開', label:'開 Open'},
    {key:'Rest',     han:'休', label:'休 Rest'},
    {key:'Birth',    han:'生', label:'生 Birth'},
    {key:'View',     han:'景', label:'景 View'},
    // Unfavorable doors 凶門 — keys MUST match the scanner's pdata.door values
    // (DOOR_NAME in qmdj-water-scanner.js): Si→Death, JingF→Shocking, Shang→Injury, Du→Delusion.
    {key:'Death',    han:'死', label:'死 Death',      unfav:true},
    {key:'Shocking', han:'驚', label:'驚 Fear/Shocking', unfav:true},
    {key:'Injury',   han:'傷', label:'傷 Injury',     unfav:true},
    {key:'Delusion', han:'杜', label:'杜 Delusion',   unfav:true}
  ];

  // 8(+2) spiriti 八神 — cell[3] del chart QMDJ, stringa inglese
  // In Yang Dun si vedono Norm/Bird; in Yin Dun Tiger/Warrior
  // (o viceversa a seconda della tradizione).
  // Li includiamo tutti: quelli non presenti nei dati semplicemente
  // non produrranno mai match.
  var QM_SPIRITS = [
    {key:'Commander', han:'值符', label:'值符 Commander'},
    {key:'Snake',     han:'螣蛇', label:'螣蛇 Snake'},
    {key:'Yin',       han:'太陰', label:'太陰 Yin'},
    {key:'Harmonies', han:'六合', label:'六合 Harmonies'},
    {key:'Tiger',     han:'白虎', label:'白虎 Tiger'},
    {key:'Warrior',   han:'玄武', label:'玄武 Warrior'},
    {key:'Earth',     han:'九地', label:'九地 Earth'},
    {key:'Heaven',    han:'九天', label:'九天 Heaven'},
    {key:'Norm',      han:'勾陳', label:'勾陳 Norm'},
    {key:'Bird',      han:'朱雀', label:'朱雀 Bird'}
  ];

  // 17 configurazioni Qimen (profili). Le etichette DEVONO coincidere
  // esattamente con gli hit di QMDJWaterScanner.checkHourAtPalace e con
  // le chiavi di _qimenDescriptions (app-fengshui.js), così sia il match
  // sia il popup descrizione+warning (showQimenPopup) funzionano.
  var QM_PROFILES = {
    dun: [
      'Heaven Dun 天遁','Earth Dun 地遁','Human Dun 人遁','Deity Dun 神遁','Ghost Dun 鬼遁',
      'Wind Dun 風遁','Cloud Dun 云遁','Dragon Dun 龍遁','Tiger Dun 虎遁'
    ],
    zha: ['Real Pretenses 真詐','Rest Pretenses 休詐','Multiple Pretenses 重詐'],
    jia: ['Heaven Borrows 天假','Earth Borrows 地假','Human Borrows 人假','Deity Borrows 神假','Ghost Borrows 鬼假']
  };
  var QM_PROFILE_SET = {};
  ['dun','zha','jia'].forEach(function(g){ QM_PROFILES[g].forEach(function(l){ QM_PROFILE_SET[l] = true; }); });

  // Steli/rami per il calcolo dei pilastri orari
  var STEM_SEQ = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
  var BR_SEQ   = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  var STEM_HAN = {Jia:'甲',Yi:'乙',Bing:'丙',Ding:'丁',Wu:'戊',Ji:'己',Geng:'庚',Xin:'辛',Ren:'壬',Gui:'癸'};
  var BR_HAN   = {Zi:'子',Chou:'丑',Yin:'寅',Mao:'卯',Chen:'辰',Si:'巳',Wu:'午',Wei:'未',Shen:'申',You:'酉',Xu:'戌',Hai:'亥'};
  var STEM_HAN_TO_EN = {};
  Object.keys(STEM_HAN).forEach(function(k){ STEM_HAN_TO_EN[STEM_HAN[k]] = k; });
  var BR_HAN_TO_EN = {};
  Object.keys(BR_HAN).forEach(function(k){ BR_HAN_TO_EN[BR_HAN[k]] = k; });
  var HOUR_TIMES = {
    Zi:'23–01', Chou:'01–03', Yin:'03–05', Mao:'05–07',
    Chen:'07–09', Si:'09–11', Wu:'11–13', Wei:'13–15',
    Shen:'15–17', You:'17–19', Xu:'19–21', Hai:'21–23'
  };
  var WEEKDAYS_IT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

  // ---------------------------------------------------------------
  // HELPER
  // ---------------------------------------------------------------

  // Regola dei "Cinque Topi" (五鼠遁): dato lo stelo del giorno (in
  // pinyin, es. 'Jia'), restituisce i 12 pilastri orari del giorno.
  function hourPillarsForDay(dayStemPinyin){
    var dayIdx = STEM_SEQ.indexOf(dayStemPinyin);
    if(dayIdx < 0) return [];
    var ziStemIdx = (dayIdx % 5) * 2;
    var hours = [];
    for(var brIdx = 0; brIdx < 12; brIdx++){
      var sIdx = (ziStemIdx + brIdx) % 10;
      var stem = STEM_SEQ[sIdx];
      var br   = BR_SEQ[brIdx];
      hours.push({
        stem:   stem,
        branch: br,
        han:    STEM_HAN[stem] + BR_HAN[br],
        time:   HOUR_TIMES[br]
      });
    }
    return hours;
  }

  // Recupera la carta Flying Stars corrente leggendo dagli input
  // Resolve the active house's facing/period via the single source of truth
  // (window.XKDGHouse), used when the FS panel fields are empty.
  function _fsActiveHouseFP(){
    try {
      var c = window.XKDGHouse && window.XKDGHouse.active();
      return c ? { facing: c.facing, period: c.period } : null;
    } catch(e){ return null; }
  }

  // Floors of the ACTIVE house (each: {index,label,facing,period,chart}). Empty if none.
  function _qfsFloors(){
    try {
      var c = window.XKDGHouse && window.XKDGHouse.active();
      return (c && c.floors) ? c.floors : [];
    } catch(e){ return []; }
  }
  // The floor the panel is currently pointed at. Defaults to the house's active floor.
  function _qfsSelectedFloor(){
    var floors = _qfsFloors();
    if(!floors.length) return null;
    var idx = (typeof window._qfsFloorIndex === 'number') ? window._qfsFloorIndex : -1;
    for(var i = 0; i < floors.length; i++){ if(floors[i].index === idx) return floors[i]; }
    // fall back to the active floor
    for(var j = 0; j < floors.length; j++){ if(floors[j].active) return floors[j]; }
    return floors[0];
  }

  function getCurrentFSChart(){
    // Priority order matters here:
    //  1) An EXPLICIT floor pick in this panel (multi-floor house) wins over everything —
    //     it is a deliberate, later user action; the user expects to see THAT floor's chart.
    //     Each floor carries its own facing/period, hence its own chart.
    //  2) Otherwise a saved MANUAL override (window._fsManualChart, ⭐ Manual editor) wins over
    //     the auto-computed chart — mirrors _fsGetActiveChart() in app-fengshui.js (Bed section).
    //  3) Otherwise recompute from the panel/house facing+period.
    var _floors = _qfsFloors();
    if(_floors.length > 1){
      var selFloor = _qfsSelectedFloor();
      if(selFloor && selFloor.chart) return selFloor.chart;
    }
    if(typeof window !== 'undefined' && window._fsManualChart) return window._fsManualChart;
    if(typeof FlyingStars === 'undefined') return null;
    if(typeof fsMountainCharFromDeg !== 'function') return null;
    var hf = document.getElementById('fs-house-facing');
    var pp = document.getElementById('fs-period');
    var hfDeg = hf ? parseFloat(hf.value) : NaN;
    var period = pp ? parseInt(pp.value, 10) : NaN;
    if(isNaN(hfDeg) || isNaN(period) || period < 1 || period > 9){
      var fp = _fsActiveHouseFP();
      if(fp){
        if(isNaN(hfDeg) && fp.facing != null) hfDeg = parseFloat(fp.facing);
        if((isNaN(period) || period < 1 || period > 9) && fp.period != null) period = parseInt(fp.period, 10);
      }
    }
    if(isNaN(hfDeg) || isNaN(period) || period < 1 || period > 9) return null;
    try {
      var mch = fsMountainCharFromDeg(hfDeg);
      return FlyingStars.calculate(period, mch);
    } catch(e){ return null; }
  }

  // Trova gli indici di griglia dove vive una certa stella (1-9)
  function findStarPalaces(chart, starType, starNum){
    var arr = (starType === 'water') ? chart.facingStars : chart.sittingStars;
    var indices = [];
    for(var i = 0; i < 9; i++) if(arr[i] === starNum) indices.push(i);
    return indices;
  }

  // 令星入囚 — the RULER water star trapped at the centre.
  // Domain rule (Edu): the ruler of the CURRENT ERA (San Yuan period, 2024–2044 → star 9) is the
  // ONLY star released when it falls in the centre. It applies ONLY to the WATER star (向星) that
  // equals the current-era ruler — NOT to the house/chart period, and not to any other star or the
  // mountain star. Two classical releases are offered as options:
  //   ① 向 facing — the grid palace of the house's facing direction;
  //   ② swap with 5 — the palace where 向星5 naturally lives becomes the active palace for 9.
  //
  // IMPLEMENTATION NOTE: this delegates to the pre-existing imprisonmentInfo()/_fsCurrentPeriod()
  // used by the headless AI-chat path (scanStarPreset), so the panel UI (label + scan) and the AI
  // tool share ONE source of truth. The ruler is the CURRENT-ERA period (from the civil year via
  // _fsCurrentPeriod), deliberately NOT chart.period — a Period-2 house whose chart still has ws9
  // trapped at centre must still release it, because 9 is the ruler of the current era.
  // Returns null when no release applies. Otherwise { facingGrid, swapGrid } (either may be -1),
  // so the same result feeds both the label and the scan.
  function rulerCenterRelease(chart, starType, starNum){
    if(!chart || starType !== 'water') return null;                 // water star only
    var imp = imprisonmentInfo(chart);
    if(!imp || !imp.imprisoned) return null;
    if(parseInt(starNum, 10) !== imp.periodStar) return null;       // only the current-era ruler star
    var facingGrid = -1, swapGrid = -1;
    (imp.palaces || []).forEach(function(p){
      if(p.via && p.via.indexOf('facing') >= 0 && facingGrid < 0) facingGrid = p.grid;
      if(p.via && p.via.indexOf('5ws')    >= 0 && swapGrid   < 0) swapGrid   = p.grid;
    });
    if(facingGrid < 0 && swapGrid < 0) return null;
    return { facingGrid: facingGrid, swapGrid: swapGrid };
  }

  // 令星入囚 + real aquarium: the trapped ruler is released to the facing palace OR the
  // swap-with-5 palace — but the aquarium has ALREADY been physically placed in ONE of them,
  // and that placement is a saved fact in the house profile (XKDGHouse). So we don't offer two
  // abstract options: we look across ALL FLOORS of the ACTIVE house for a saved water feature
  // whose direction matches one of the two release palaces, and use ONLY that one.
  //   • Returns { grid, via, aquarium } when a saved aquarium sits in a release palace.
  //   • Returns { none:true, release:{facingGrid,swapGrid} } when the ruler IS trapped but no
  //     saved aquarium occupies either release palace (caller must BLOCK + warn).
  //   • Returns null when the ruler is not trapped (normal case; no release at all).
  function resolveReleaseAquarium(chart, starType, starNum){
    var rel = rulerCenterRelease(chart, starType, starNum);
    if(!rel) return null;                                           // not trapped → no release
    var releaseGrids = [];
    if(rel.facingGrid >= 0) releaseGrids.push({ grid: rel.facingGrid, via: 'facing' });
    if(rel.swapGrid   >= 0) releaseGrids.push({ grid: rel.swapGrid,   via: '5ws' });

    // Gather saved water features. Prefer the SELECTED floor (its chart is what defines the
    // imprisonment); if that floor has no matching aquarium, fall back to all floors of the house.
    var found = null;
    try {
      var D2G = (window.XKDGHouse && window.XKDGHouse.DIR2GRID) ? window.XKDGHouse.DIR2GRID
              : { SE:0, S:1, SW:2, E:3, C:4, W:5, NE:6, N:7, NW:8 };
      var h = window.XKDGHouse && window.XKDGHouse.active();
      var allFloors = (h && h.floors) ? h.floors : [];
      var sel = _qfsSelectedFloor();
      // ordered list: selected floor first, then the rest
      var floors = [];
      if(sel) floors.push(sel);
      for(var af = 0; af < allFloors.length; af++){ if(!sel || allFloors[af].index !== sel.index) floors.push(allFloors[af]); }
      for(var fi = 0; fi < floors.length && !found; fi++){
        var wfs = floors[fi].water_features || [];
        for(var wi = 0; wi < wfs.length && !found; wi++){
          var wf = wfs[wi];
          var g = (wf && wf.direction != null) ? D2G[wf.direction] : null;
          if(g == null) continue;
          for(var ri = 0; ri < releaseGrids.length; ri++){
            if(releaseGrids[ri].grid === g){
              found = { grid: g, via: releaseGrids[ri].via,
                        aquarium: { name: wf.name || 'aquarium', direction: wf.direction,
                                    floor: floors[fi].label || ('Floor ' + (fi + 1)), source: wf.source || 'aquarium' } };
              break;
            }
          }
        }
      }
    } catch(e){ found = null; }

    if(found) return found;
    return { none: true, release: rel };
  }

  // Recupera il range dalla toolbar principale
  function getRange(){
    var days = (typeof window._fsRangeDays === 'number' && window._fsRangeDays > 0)
             ? window._fsRangeDays
             : 60;
    var startInput = document.getElementById('scan-start') || document.getElementById('start-date');
    var startStr = startInput ? startInput.value : '';
    return { startStr: startStr, days: days };
  }

  // ---------------------------------------------------------------
  // TOGGLE REQUIRED / OPTIONAL
  // ---------------------------------------------------------------
  function toggleCat(el){
    var state = el.getAttribute('data-state');
    if(state === 'optional'){
      el.setAttribute('data-state', 'required');
      el.textContent = 'REQ';
      el.style.background = '#00695c';
      el.style.color = '#fff';
    } else {
      el.setAttribute('data-state', 'optional');
      el.textContent = 'OPT';
      el.style.background = '#cfd8dc';
      el.style.color = '#555';
    }
  }

  // Per-ITEM REQ/OPT toggle handler. Flipping an item to REQ auto-checks its checkbox
  // (a required item that isn't selected would make every hour impossible).
  function toggleEnt(el){
    var state = el.getAttribute('data-state');
    if(state === 'optional'){
      el.setAttribute('data-state', 'required');
      el.textContent = 'REQ';
      el.style.background = '#00695c';
      el.style.color = '#fff';
      // ensure the linked checkbox is checked
      var cat = el.getAttribute('data-cat'), key = el.getAttribute('data-key');
      var cb = document.querySelector('input.qfs-ent[data-cat="'+cat+'"][data-key="'+key+'"]');
      if(cb) cb.checked = true;
    } else {
      el.setAttribute('data-state', 'optional');
      el.textContent = 'OPT';
      el.style.background = '#cfd8dc';
      el.style.color = '#555';
    }
  }

  // ---------------------------------------------------------------
  // COSTRUZIONE PANNELLO DI CONFIGURAZIONE
  // ---------------------------------------------------------------
  function buildPanel(area){
    // Per-ITEM REQ/OPT toggle: each entity (stem, door, star, spirit) carries its own small
    // toggle so a SINGLE item (e.g. Commander) can be made mandatory without forcing its whole
    // category. Default OPT (bonus only). data-key on the toggle links it to its checkbox.
    var entToggle = function(cat, key){
      return '<span class="qfs-ent-toggle" data-cat="'+cat+'" data-key="'+key+'" data-state="optional" '
           + 'onclick="event.preventDefault();event.stopPropagation();QFS.toggleEnt(this)" '
           + 'style="display:inline-block;padding:0 5px;border-radius:3px;font-size:8px;font-weight:bold;'
           + 'cursor:pointer;vertical-align:middle;margin-left:3px;background:#cfd8dc;color:#555;user-select:none;">OPT</span>';
    };
    // One entity checkbox + its individual REQ/OPT toggle. `extra` = optional colored inner HTML.
    var entItem = function(cat, key, labelHtml, checked, wrapStyle){
      return '<span style="display:inline-flex;align-items:center;white-space:nowrap;'+(wrapStyle||'')+'">'
           +   '<label style="white-space:nowrap;cursor:pointer;">'
           +     '<input type="checkbox" class="qfs-ent" data-cat="'+cat+'" data-key="'+key+'"'+(checked?' checked':'')+'> '+labelHtml
           +   '</label>'
           +   entToggle(cat, key)
           + '</span>';
    };

    var stemHtml = QM_STEMS.map(function(s){
      return entItem('stem', s.key, s.label, true);
    }).join('');
    var doorHtml = QM_DOORS.map(function(d){
      // Favorable doors default checked; unfavorable doors shown in red, default unchecked.
      var lbl = d.unfav ? '<span style="color:#c62828;">'+d.label+'</span>' : d.label;
      return entItem('door', d.key, lbl, !d.unfav);
    }).join('');
    var starHtml = QM_STARS.map(function(s){
      var c = s.color || '#333';
      var lbl = '<span style="color:'+c+';">'+s.label+'</span> <b style="color:'+c+';">'+s.num+'</b>';
      return entItem('star', s.key, lbl, false, 'font-size:11px;');
    }).join('');
    var spiritHtml = QM_SPIRITS.map(function(sp){
      return entItem('spirit', sp.key, sp.label, false, 'font-size:11px;');
    }).join('');

    // Floor selector — shown when the active house has more than one floor.
    // TEMP DIAGNOSTIC: also show a small line reporting how many floors the panel sees and from
    // which house, so we can tell whether "stuck on one floor" is an upstream data issue or a UI
    // one. (Remove the diagnostic line once confirmed.)
    var floorSelHtml = '';
    var _fl = _qfsFloors();
    var _diagHouse = '';
    try { var _hc = window.XKDGHouse && window.XKDGHouse.active(); _diagHouse = _hc ? (_hc.name || '?') : '(no active house)'; } catch(e){ _diagHouse = '(error)'; }
    var _diag = '<div style="margin-bottom:6px;font-size:10px;color:#00695c;font-style:italic;">'
              + '🏠 house: <b>' + _diagHouse + '</b> · floors seen: <b>' + _fl.length + '</b>'
              + (_fl.length ? ' [' + _fl.map(function(f){ return (f.label||('F'+(f.index+1))) + (f.active?'✓':''); }).join(', ') + ']' : '')
              + '</div>';
    if(_fl.length > 1){
      var cur = _qfsSelectedFloor();
      var curIdx = cur ? cur.index : (_fl[0] && _fl[0].index);
      var opts = _fl.map(function(f){
        var lbl = (f.label || ('Floor ' + (f.index + 1)));
        if(f.facing != null && f.period != null) lbl += ' · ' + f.facing + '° P' + f.period;
        return '<option value="'+f.index+'"'+(f.index === curIdx ? ' selected' : '')+'>'+lbl+'</option>';
      }).join('');
      floorSelHtml =
          '<div style="margin-bottom:8px;padding:6px 8px;background:#b2dfdb;border-radius:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
        +   '<span style="font-size:11px;font-weight:bold;color:#004d40;">🏠 Floor:</span>'
        +   '<select id="qfs-floor" style="padding:4px 6px;border:1px solid #00695c;border-radius:4px;font-size:12px;">'+opts+'</select>'
        +   '<span style="font-size:10px;color:#00695c;font-style:italic;">this house has multiple floors — pick which one to scan</span>'
        + '</div>';
    }
    floorSelHtml = _diag + floorSelHtml;


    // Sezione 17 profili Qimen — ciascuno con info (ⓘ) → descrizione + warning
    var profGroup = function(arr){
      // Palazzo di manifestazione di ciascun profilo, secondo la detection dello scanner.
      // Solo Wind/Dragon/Tiger Dun sono vincolati a palazzi fissi; tutti gli altri 14
      // dipendono solo da stelo+porta+spirito → possono apparire in qualsiasi palazzo.
      var PALACE_HINT = {
        'Wind Dun 風遁':   'SE (4) only',
        'Dragon Dun 龍遁': 'N (1) / E (3) only',
        'Tiger Dun 虎遁':  'NE (8) / W (7) only'
      };
      return '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:2px;">'
        + arr.map(function(label){
            var esc = label.replace(/'/g, "\\'");
            var hintTxt   = PALACE_HINT[label] || 'any palace';
            var isLocked  = / only$/.test(hintTxt);
            var hintColor = isLocked ? '#b71c1c' : '#777';
            var hint = ' <span style="color:'+hintColor+';font-size:9px;font-weight:bold;">('+hintTxt+')</span>';
            return '<span style="white-space:nowrap;font-size:11px;display:inline-flex;align-items:center;gap:4px;">'
                 +   '<label style="white-space:nowrap;cursor:pointer;">'
                 +     '<input type="checkbox" class="qfs-prof" data-key="'+label+'"> '+label+hint
                 +   '</label>'
                 +   '<span onclick="event.stopPropagation();QFS.profInfo(\''+esc+'\')" title="Description + warning" '
                 +         'style="cursor:pointer;color:#fff;background:#00695c;border-radius:50%;width:16px;height:16px;'
                 +         'line-height:16px;text-align:center;font-weight:bold;font-size:11px;flex:0 0 auto;">i</span>'
                 + '</span>';
          }).join('')
        + '</div>';
    };
    var profHtml =
        '<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #80cbc4;">'
      +   '<div style="font-weight:bold;color:#004d40;margin-bottom:2px;">'
      +     '3. Qimen profiles 奇門格局 (17)'
      +     ' <button onclick="QFS.selectAllProfiles(true)" style="background:#00695c;color:#fff;border:none;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;margin-left:6px;font-weight:bold;">All</button>'
      +     ' <button onclick="QFS.selectAllProfiles(false)" style="background:#999;color:#fff;border:none;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;font-weight:bold;">None</button>'
      +   '</div>'
      +   '<div style="font-size:10px;color:#666;margin-bottom:6px;font-style:italic;">'
      +     'Many profiles already include San Qi / Doors / Spirits internally. Tap ⓘ for description + ⚠️ warning.'
      +   '</div>'
      +   '<div style="font-size:11px;color:#004d40;font-weight:bold;margin-top:4px;">九遁 Nine Dun (auspicious)</div>'
      +   profGroup(QM_PROFILES.dun)
      +   '<div style="font-size:11px;color:#b71c1c;font-weight:bold;margin-top:6px;">三詐 Three Pretenses ⚠️</div>'
      +   profGroup(QM_PROFILES.zha)
      +   '<div style="font-size:11px;color:#b71c1c;font-weight:bold;margin-top:6px;">五假 Five Borrows ⚠️</div>'
      +   profGroup(QM_PROFILES.jia)
      +   '<div style="margin-top:8px;font-size:11px;line-height:1.8;">'
      +     '<span style="color:#004d40;font-weight:bold;">If profiles are selected, match:</span><br>'
      +     '<label style="white-space:nowrap;margin-right:12px;"><input type="radio" name="qfs-profmode" value="with" checked> <strong>With positives</strong> (profile <em>and</em> the entities above)</label>'
      +     '<label style="white-space:nowrap;"><input type="radio" name="qfs-profmode" value="alone"> <strong>Alone</strong> (profile only)</label>'
      +   '</div>'
      + '</div>';

    var starOptions = '';
    for(var n = 1; n <= 9; n++){
      starOptions += '<option value="'+n+'"'+(n === 8 ? ' selected' : '')+'>Star '+n+'</option>';
    }

    // Toggle button template — default OPT (optional)
    var toggleBtn = function(cat){
      return ' <span class="qfs-cat-toggle" data-cat="'+cat+'" data-state="optional" '
           + 'onclick="QFS.toggleCat(this)" '
           + 'style="display:inline-block;padding:1px 7px;border-radius:3px;font-size:9px;font-weight:bold;'
           + 'cursor:pointer;vertical-align:middle;margin-left:6px;'
           + 'background:#cfd8dc;color:#555;user-select:none;">OPT</span>';
    };

    var html =
      '<div id="qfs-panel" style="border:2px solid #00695c;border-radius:8px;background:#e0f2f1;padding:12px;margin-top:10px;font-size:12px;color:#1a1008;">'
    +   '<div style="font-weight:bold;color:#00695c;font-size:13px;margin-bottom:8px;">'
    +     '🌀 Find Qimen hours that activate a Flying Star'
    +     '<span onclick="QFS.close()" style="float:right;cursor:pointer;color:#666;font-weight:normal;">✕</span>'
    +   '</div>'

    +   floorSelHtml

      // STEP 1 — selezione stella FS
    +   '<div style="margin-bottom:10px;">'
    +     '<div style="font-weight:bold;color:#004d40;margin-bottom:4px;">1. Which Flying Star to activate?</div>'
    +     '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">'
    +       '<label style="white-space:nowrap;"><input type="radio" name="qfs-type" value="water" checked> 向星 Water Star</label>'
    +       '<label style="white-space:nowrap;"><input type="radio" name="qfs-type" value="mountain"> 山星 Mountain Star</label>'
    +       '<select id="qfs-starnum" style="padding:4px 6px;border:1px solid #00695c;border-radius:4px;font-size:12px;">'
    +         starOptions
    +       '</select>'
    +     '</div>'
    +     '<div id="qfs-palace-info" style="font-size:11px;color:#00695c;margin-top:4px;font-style:italic;min-height:16px;"></div>'
    +   '</div>'

      // STEP 2 — entità Qimen con toggle Required/Optional per categoria
    +   '<div style="margin-bottom:10px;">'
    +     '<div style="font-weight:bold;color:#004d40;margin-bottom:4px;">'
    +       '2. Which Qimen entities to look for in that palace?'
    +       ' <button onclick="QFS.selectAll(true)" style="background:#00695c;color:#fff;border:none;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;margin-left:6px;font-weight:bold;">All</button>'
    +       ' <button onclick="QFS.selectAll(false)" style="background:#999;color:#fff;border:none;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;font-weight:bold;">None</button>'
    +       ' <button onclick="QFS.clearAllQimen()" style="background:#c62828;color:#fff;border:none;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;margin-left:6px;font-weight:bold;">✗ Clear ALL (entities + profiles)</button>'
    +       ' <button onclick="QFS.savePreset()" style="background:#1565c0;color:#fff;border:none;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;margin-left:6px;font-weight:bold;">💾 Save as preset</button>'
    +       ' <button onclick="QFS.clearPreset()" style="background:#8a6a1f;color:#fff;border:none;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;font-weight:bold;">↺ Auto preset</button>'
    +       '<div id="qfs-preset-state" style="font-size:10px;color:#00695c;margin-top:4px;font-style:italic;"></div>'
    +     '</div>'
    +     '<div style="font-size:10px;color:#666;margin-bottom:6px;font-style:italic;">'
    +       'REQ = the palace MUST contain an entity from that category. OPT = bonus only.'
    +     '</div>'

    // San Qi
    +     '<div style="font-size:11px;color:#004d40;font-weight:bold;margin-top:4px;">'
    +       'San Qi 三奇 · stems' + toggleBtn('stem')
    +     '</div>'
    +     '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px;">'+stemHtml+'</div>'

    // Doors
    +     '<div style="font-size:11px;color:#004d40;font-weight:bold;margin-top:6px;">'
    +       'Favorable Doors 吉門' + toggleBtn('door')
    +     '</div>'
    +     '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px;">'+doorHtml+'</div>'

    // Stars
    +     '<div style="font-size:11px;color:#004d40;font-weight:bold;margin-top:6px;">'
    +       'Celestial Stars 九星' + toggleBtn('star')
    +     '</div>'
    +     '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;">'+starHtml+'</div>'

    // Spirits (NUOVA SEZIONE)
    +     '<div style="font-size:11px;color:#004d40;font-weight:bold;margin-top:6px;">'
    +       'Spirits 八神' + toggleBtn('spirit')
    +     '</div>'
    +     '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;">'+spiritHtml+'</div>'

    +   '</div>'

    // STEP 3 — profili Qimen (17 configurazioni)
    +   profHtml

      // Filtro Fu Yin 伏吟
    +   '<div style="margin-top:8px;padding:6px 10px;background:#fff8e1;border:1px solid #ffe082;border-radius:6px;font-size:12px;">'
    +     '<label style="cursor:pointer;">'
    +       '<input type="checkbox" id="qfs-no-fuyin" checked> '
    +       '<strong>Exclude Fu Yin 伏吟</strong> <span style="color:#888;">(skip hours where Tian Pan stem = Di Pan stem in the target palace)</span>'
    +     '</label>'
    +   '</div>'

      // STEP 3 — scan + range info
    +   '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid #b2dfdb;">'
    +     '<button id="qfs-scan-btn" style="background:#00695c;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:bold;cursor:pointer;">🔎 SCAN HOURS</button>'
    +     '<span id="qfs-rangelbl" style="font-size:11px;color:#555;"></span>'
    +     '<span style="font-size:10px;color:#888;font-style:italic;">Range from main toolbar (1m/3m/6m/1y/2y/5y)</span>'
    +   '</div>'
    + '</div>'
    + '<div id="qfs-results" style="margin-top:8px;"></div>';

    area.innerHTML = html;

    document.getElementById('qfs-scan-btn').onclick = runScan;
    var radios = document.querySelectorAll('input[name="qfs-type"]');
    for(var i = 0; i < radios.length; i++) radios[i].onchange = updatePalaceInfo;
    document.getElementById('qfs-starnum').onchange = updatePalaceInfo;
    var floorSel = document.getElementById('qfs-floor');
    if(floorSel){
      floorSel.onchange = function(){
        window._qfsFloorIndex = parseInt(this.value, 10);
        updatePalaceInfo();
      };
      // initialise the panel's floor index to the current selection
      window._qfsFloorIndex = parseInt(floorSel.value, 10);
    }

    updatePalaceInfo();
    updateRangeLabel();
  }

  function updatePalaceInfo(){
    var box = document.getElementById('qfs-palace-info');
    if(!box) return;
    var chart = getCurrentFSChart();
    if(!chart){
      box.innerHTML = '<span style="color:#c62828;">⚠ Set House Facing and Period in the Flying Stars block above.</span>';
      return;
    }
    var typeEl = document.querySelector('input[name="qfs-type"]:checked');
    var numEl  = document.getElementById('qfs-starnum');
    if(!typeEl || !numEl) return;
    var type = typeEl.value;
    var n = parseInt(numEl.value, 10);
    var indices = findStarPalaces(chart, type, n);
    if(!indices.length){
      box.innerHTML = 'Star '+n+' is not in this chart.';
      return;
    }
    var outerLabels = indices.filter(function(i){ return i !== 4; }).map(function(i){ return FS_GRID_TO_LABEL[i]; });
    var hasCenter = indices.indexOf(4) >= 0;
    var typeLbl = (type === 'water') ? '向星' : '山星';
    var msg = typeLbl + ' ' + n + ' lives in: <b>' + (outerLabels.join(', ') || '—') + '</b>';
    if(hasCenter){
      var res = resolveReleaseAquarium(chart, type, n);
      if(res && res.none){
        // 令星入囚 but NO saved aquarium sits in either release palace → block + warn.
        var rel = res.release, rl = [];
        if(rel.facingGrid >= 0) rl.push('① 向 facing = ' + FS_GRID_TO_LABEL[rel.facingGrid]);
        if(rel.swapGrid >= 0)   rl.push('② swap with 5 = ' + FS_GRID_TO_LABEL[rel.swapGrid]);
        msg = typeLbl + ' ' + n + ' is the Period ruler <b>trapped at the centre (入囚)</b>. '
            + '<span style="color:#c62828;">⚠ No saved aquarium is in a release palace (' + rl.join(' or ') + '). '
            + 'Place the aquarium in one of them first — the scan is blocked.</span>';
      } else if(res){
        // 令星入囚 resolved to the ACTUAL aquarium position → use ONLY that palace.
        var viaLbl = (res.via === 'facing') ? '向 facing' : 'swap with 5';
        msg = typeLbl + ' ' + n + ' is the Period ruler <b>trapped at the centre (入囚)</b>, released at your aquarium: '
            + '<b>' + FS_GRID_TO_LABEL[res.grid] + '</b> <span style="color:#888;">(' + viaLbl + ' · '
            + res.aquarium.name + (res.aquarium.floor ? ', ' + res.aquarium.floor : '') + ')</span>';
      } else {
        msg += ' <span style="color:#888;">(also at center — center is skipped in scan)</span>';
      }
    }
    box.innerHTML = msg;
  }

  function updateRangeLabel(){
    var lbl = document.getElementById('qfs-rangelbl');
    if(!lbl) return;
    var r = getRange();
    if(!r.startStr){
      lbl.innerHTML = '<span style="color:#c62828;font-weight:bold;">⚠ Set FROM date in toolbar</span>';
      return;
    }
    lbl.textContent = 'from ' + r.startStr + ' · ' + r.days + ' days';
  }

  // ---------------------------------------------------------------
  // MATCH LOGIC
  // ---------------------------------------------------------------
  function matchPalace(palaceData, wanted){
    if(!palaceData) return [];
    var hits = [];
    // Stems (San Qi)
    if(palaceData.ti && wanted.stems.has(palaceData.ti)){
      hits.push({cat:'stem', key:palaceData.ti, label:(palaceData.tiH || palaceData.ti) + ' (天/Tian)'});
    }
    if(palaceData.di && wanted.stems.has(palaceData.di)){
      hits.push({cat:'stem', key:palaceData.di, label:(palaceData.diH || palaceData.di) + ' (地/Di)'});
    }
    // Doors
    if(palaceData.door && wanted.doors.has(palaceData.door)){
      hits.push({cat:'door', key:palaceData.door, label:palaceData.door + ' Door'});
    }
    // Stars
    var starKey = STAR_EN_TO_KEY[palaceData.star];
    if(starKey && wanted.stars.has(starKey)){
      hits.push({cat:'star', key:starKey, label:palaceData.star + ' Star'});
    }
    // Spirits (八神)
    if(palaceData.deity && wanted.spirits.has(palaceData.deity)){
      hits.push({cat:'spirit', key:palaceData.deity, label:palaceData.deity + ' 神'});
    }
    return hits;
  }

  // ---------------------------------------------------------------
  // SCANSIONE
  // ---------------------------------------------------------------
  function runScan(){
    var resultsBox = document.getElementById('qfs-results');
    if(!resultsBox) return;
    resultsBox.innerHTML = '<div style="padding:12px;color:#666;font-size:12px;text-align:center;">⏳ Scanning hours…</div>';

    if(typeof Solar === 'undefined'){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ lunar-javascript not loaded.</div>';
      return;
    }
    if(typeof QMDJWaterScanner === 'undefined'){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ qmdj-water-scanner.js not loaded.</div>';
      return;
    }
    var chart = getCurrentFSChart();
    if(!chart){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ Set House Facing and Period first.</div>';
      return;
    }

    var typeEl = document.querySelector('input[name="qfs-type"]:checked');
    var numEl  = document.getElementById('qfs-starnum');
    var type   = typeEl.value;
    var starN  = parseInt(numEl.value, 10);

    // Trova i palazzi QMDJ dove vive la stella scelta (esclude il centro)
    var gridIndices = findStarPalaces(chart, type, starN);
    var fsGrids = gridIndices.filter(function(g){ return g !== 4; });
    // 令星入囚: if the current-era ruler water star sits in the centre, it is released to the
    // palace where the REAL aquarium is already placed (facing OR swap-with-5). Use ONLY that
    // palace. If no saved aquarium occupies either release palace, BLOCK with a warning.
    var _res = resolveReleaseAquarium(chart, type, starN);
    if(_res && _res.none){
      var _r = _res.release, _rl = [];
      if(_r.facingGrid >= 0) _rl.push('向 facing = ' + FS_GRID_TO_LABEL[_r.facingGrid]);
      if(_r.swapGrid >= 0)   _rl.push('swap with 5 = ' + FS_GRID_TO_LABEL[_r.swapGrid]);
      resultsBox.innerHTML = '<div style="color:#c62828;padding:12px;font-size:13px;line-height:1.5;">'
        + '⚠ <b>' + (type === 'water' ? '向星' : '山星') + ' ' + starN + ' is trapped at the centre (入囚)</b>, '
        + 'but no saved aquarium is in a release palace (' + _rl.join(' or ') + ').<br>'
        + 'Place the aquarium in one of those palaces (in the house profile) first — the scan is blocked.'
        + '</div>';
      return;
    }
    if(_res){
      // Resolved to the actual aquarium position → scan ONLY that palace.
      fsGrids = [_res.grid];
    }
    var fsPalaces = fsGrids.map(function(g){ return FS_GRID_TO_QMDJ_PALACE[g]; });
    if(!fsPalaces.length){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ Star '+starN+' does not appear in any outer palace of this chart.</div>';
      return;
    }

    // Raccoglie le entità Qimen selezionate (4 categorie)
    var wanted = { stems:new Set(), doors:new Set(), stars:new Set(), spirits:new Set() };
    var boxes = document.querySelectorAll('input.qfs-ent');
    for(var b = 0; b < boxes.length; b++){
      if(!boxes[b].checked) continue;
      var cat = boxes[b].getAttribute('data-cat');
      var key = boxes[b].getAttribute('data-key');
      if(cat === 'stem')   wanted.stems.add(key);
      if(cat === 'door')   wanted.doors.add(key);
      if(cat === 'star')   wanted.stars.add(key);
      if(cat === 'spirit') wanted.spirits.add(key);
    }
    var totalSelected = wanted.stems.size + wanted.doors.size + wanted.stars.size + wanted.spirits.size;

    // Profili Qimen selezionati (17 configurazioni) + modalità
    var selProfiles = new Set();
    var profBoxes = document.querySelectorAll('input.qfs-prof');
    for(var pb = 0; pb < profBoxes.length; pb++){
      if(profBoxes[pb].checked) selProfiles.add(profBoxes[pb].getAttribute('data-key'));
    }
    var profModeEl = document.querySelector('input[name="qfs-profmode"]:checked');
    var profMode = profModeEl ? profModeEl.value : 'with';

    if(totalSelected === 0 && selProfiles.size === 0){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ Select at least one Qimen entity or profile.</div>';
      return;
    }

    // Raccoglie lo stato Required/Optional per ogni categoria
    // Una categoria è "required" solo se è togglata REQ E ha almeno
    // un'entità selezionata (altrimenti sarebbe impossibile matchare).
    var required = new Set();
    var toggles = document.querySelectorAll('.qfs-cat-toggle');
    for(var t = 0; t < toggles.length; t++){
      if(toggles[t].getAttribute('data-state') === 'required'){
        var tCat = toggles[t].getAttribute('data-cat');
        if(tCat === 'stem'   && wanted.stems.size   > 0) required.add('stem');
        if(tCat === 'door'   && wanted.doors.size   > 0) required.add('door');
        if(tCat === 'star'   && wanted.stars.size   > 0) required.add('star');
        if(tCat === 'spirit' && wanted.spirits.size > 0) required.add('spirit');
      }
    }

    // Raccoglie le voci REQ INDIVIDUALI (Commander, una porta specifica, …). Ogni voce marcata
    // REQ e spuntata diventa un requisito obbligatorio a sé: il palazzo dell'ora DEVE contenerla.
    // Se ce ne sono più di una, valgono tutte insieme (AND). Set di chiavi "cat:key".
    var requiredItems = new Set();
    var entToggles = document.querySelectorAll('.qfs-ent-toggle');
    for(var et = 0; et < entToggles.length; et++){
      if(entToggles[et].getAttribute('data-state') !== 'required') continue;
      var eCat = entToggles[et].getAttribute('data-cat');
      var eKey = entToggles[et].getAttribute('data-key');
      // only count it if its checkbox is actually selected
      var setForCat = (eCat === 'stem') ? wanted.stems : (eCat === 'door') ? wanted.doors
                    : (eCat === 'star') ? wanted.stars : (eCat === 'spirit') ? wanted.spirits : null;
      if(setForCat && setForCat.has(eKey)) requiredItems.add(eCat + ':' + eKey);
    }

    var range = getRange();
    if(!range.startStr){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ Set the FROM date in the main toolbar first.</div>';
      return;
    }

    var excludeFuYin = false;
    var fuyinBox = document.getElementById('qfs-no-fuyin');
    if(fuyinBox) excludeFuYin = fuyinBox.checked;

    // Esegue lo scan in modo deferito così il messaggio "Scanning…" viene
    // mostrato prima che il loop blocchi il thread.
    setTimeout(function(){
      var parts = range.startStr.split('-');
      var startY = parseInt(parts[0], 10);
      var startM = parseInt(parts[1], 10);
      var startD = parseInt(parts[2], 10);
      if(isNaN(startY) || isNaN(startM) || isNaN(startD)){
        resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ Invalid FROM date.</div>';
        return;
      }
      var startDate = new Date(startY, startM - 1, startD);

      var byDate = {};
      var dateOrder = [];
      var totalHits = 0;

      for(var d = 0; d < range.days; d++){
        var dt = new Date(startDate.getTime() + d * 86400000);
        var Y = dt.getFullYear();
        var M = dt.getMonth() + 1;
        var D = dt.getDate();

        // Ottiene lo stelo del giorno (carattere cinese) e lo converte in pinyin
        var dayStemEn = null;
        var dayPillarHan = '', dayPillarPy = '';
        try {
          var dGanHan, dZhiHan;
          var _ltq = (typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.currentLonTz() : null;
          if (_ltq && isFinite(_ltq.lonDeg)) {
            var _Pq = XKDGSolarTime.pillarsFromCivil(Y, M, D, 12, 0, 0, _ltq.lonDeg, _ltq.tzOffsetMin);
            dGanHan = _Pq.day.charAt(0); dZhiHan = _Pq.day.charAt(1);
          } else {
            var ec = Solar.fromYmd(Y, M, D).getLunar().getEightChar();
            dGanHan = ec.getDayGan(); dZhiHan = ec.getDayZhi();
          }
          dayStemEn = STEM_HAN_TO_EN[dGanHan];
          var dBranchEn = BR_HAN_TO_EN[dZhiHan] || '';
          dayPillarHan = dGanHan + dZhiHan;
          dayPillarPy  = (dayStemEn || '') + ' ' + dBranchEn;
        } catch(e){ continue; }
        if(!dayStemEn) continue;

        var hours = hourPillarsForDay(dayStemEn);

        for(var h = 0; h < hours.length; h++){
          var hp = hours[h];
          var hourChart;
          try {
            hourChart = QMDJWaterScanner.getHourChart(Y, M, D, hp.stem, hp.branch);
          } catch(e){ continue; }
          if(!hourChart || !hourChart.palaces) continue;

          for(var pi = 0; pi < fsPalaces.length; pi++){
            var palace = fsPalaces[pi];
            var pdata  = hourChart.palaces[palace];
            if(!pdata) continue;

            // Filtro Fu Yin 伏吟: stelo Tian Pan = stelo Di Pan
            if(excludeFuYin && pdata.ti && pdata.ti === pdata.di) continue;

            var entityHits = matchPalace(pdata, wanted);

            // Hit dei profili (17 config) a questo palazzo, limitati a quelli selezionati
            var profileHits = [];
            if(selProfiles.size > 0){
              try {
                var chk = QMDJWaterScanner.checkHourAtPalace(Y, M, D, hp.stem, hp.branch, palace);
                if(chk && chk.hits){
                  for(var ph = 0; ph < chk.hits.length; ph++){
                    var hcat = chk.hits[ph].cat;
                    if((hcat === 'dun' || hcat === 'zha' || hcat === 'jia') && selProfiles.has(chk.hits[ph].label)){
                      profileHits.push({ cat:'profile', label: chk.hits[ph].label });
                    }
                  }
                }
              } catch(e){}
            }

            // Il palazzo soddisfa i criteri sulle ENTITÀ?
            var passEnt;
            if(totalSelected === 0){
              passEnt = true; // nessun vincolo di entità
            } else if(required.size > 0){
              passEnt = true;
              required.forEach(function(reqCat){
                var hasCat = false;
                for(var hi = 0; hi < entityHits.length; hi++){
                  if(entityHits[hi].cat === reqCat){ hasCat = true; break; }
                }
                if(!hasCat) passEnt = false;
              });
            } else {
              passEnt = entityHits.length > 0;
            }

            // Vincolo per-VOCE (Commander, una porta specifica, …): OGNI voce marcata REQ
            // deve essere presente in questo palazzo. Vale insieme (AND) e si somma ai
            // vincoli di categoria: se manca anche una sola voce obbligatoria, l'ora è esclusa.
            if(requiredItems.size > 0){
              requiredItems.forEach(function(ck){
                var found = false;
                for(var hi = 0; hi < entityHits.length; hi++){
                  if((entityHits[hi].cat + ':' + entityHits[hi].key) === ck){ found = true; break; }
                }
                if(!found) passEnt = false;
              });
            }

            // --- DECISIONE DI INCLUSIONE ---
            var finalHits;
            if(selProfiles.size === 0){
              // Solo entità (comportamento originale)
              if(!passEnt) continue;
              finalHits = entityHits;
            } else if(profMode === 'alone'){
              // Solo profilo — le entità vengono ignorate
              if(profileHits.length === 0) continue;
              finalHits = profileHits;
            } else {
              // "With positives" — serve il profilo E le entità
              if(profileHits.length === 0) continue;
              if(!passEnt) continue;
              finalHits = entityHits.concat(profileHits);
            }

            var dateKey = Y + '-' + String(M).padStart(2,'0') + '-' + String(D).padStart(2,'0');
            if(!byDate[dateKey]){ byDate[dateKey] = []; dateOrder.push(dateKey); }
            byDate[dateKey].push({
              date:       dateKey,
              weekday:    WEEKDAYS_IT[dt.getDay()],
              dayPillarHan: dayPillarHan,
              dayPillarPy:  dayPillarPy,
              palace:     palace,
              palaceLbl:  QMDJ_PALACE_TO_LABEL[palace] || ('P'+palace),
              hourStem:   hp.stem,
              hourBranch: hp.branch,
              hourHan:    hp.han,
              hourTime:   hp.time,
              cell:       pdata,
              hits:       finalHits,
              score:      finalHits.length
            });
            totalHits++;
          }
        }
      }

      renderResults(resultsBox, byDate, dateOrder, totalHits, type, starN, fsPalaces, range, required);
    }, 30);
  }

  // ---------------------------------------------------------------
  // RENDER RISULTATI
  // ---------------------------------------------------------------
  function renderResults(box, byDate, dateOrder, total, type, starNum, fsPalaces, range, required){
    if(total === 0){
      box.innerHTML =
        '<div style="padding:16px;background:#fafafa;border:1px dashed #ccc;border-radius:6px;'
      + 'color:#888;font-size:14px;text-align:center;">'
      +   'No matching hours in ' + range.days + ' days from ' + range.startStr + '. '
      +   'Try a wider range, more entities, or a different star.'
      + '</div>';
      return;
    }

    var typeLabel = (type === 'water') ? '向星 Water' : '山星 Mountain';
    var palaceList = fsPalaces.map(function(p){ return QMDJ_PALACE_TO_LABEL[p] || ('P'+p); }).join(', ');

    // Info sulla modalità Required attiva
    var reqInfo = '';
    if(required && required.size > 0){
      var reqNames = [];
      required.forEach(function(c){
        var names = {stem:'San Qi', door:'Doors', star:'Stars', spirit:'Spirits'};
        reqNames.push(names[c] || c);
      });
      reqInfo = ' · <span style="color:#004d40;font-weight:bold;">REQ: ' + reqNames.join(', ') + '</span>';
    }

    var html =
      '<div style="font-weight:bold;color:#00695c;font-size:16px;margin:10px 0 4px;">'
    +   '🌀 ' + total + ' hour' + (total > 1 ? 's' : '') + ' found · '
    +   typeLabel + ' Star ' + starNum + ' in palace ' + palaceList
    + '</div>'
    + '<div style="font-size:13px;color:#666;margin-bottom:10px;">'
    +   'from ' + range.startStr + ' · ' + range.days + ' days · '
    +   dateOrder.length + ' distinct day' + (dateOrder.length > 1 ? 's' : '')
    +   reqInfo
    + '</div>';

    dateOrder.sort();
    var seq = 0;

    for(var i = 0; i < dateOrder.length; i++){
      var dk = dateOrder[i];
      var items = byDate[dk];
      items.sort(function(a, b){
        if(b.score !== a.score) return b.score - a.score;
        return a.hourTime.localeCompare(b.hourTime);
      });
      var weekday = items[0].weekday;
      var dParts = dk.split('-');
      var dkDisplay = (dParts.length === 3) ? (dParts[2] + '/' + dParts[1] + '/' + dParts[0]) : dk;
      var dayPilTxt = items[0].dayPillarHan
                    ? (' · ' + items[0].dayPillarHan + ' ' + items[0].dayPillarPy)
                    : '';
      html +=
        '<div style="margin-bottom:12px;border:1px solid #b2dfdb;border-radius:8px;overflow:hidden;background:#fff;">'
      +   '<div style="background:#00695c;color:#fff;padding:8px 12px;font-weight:bold;font-size:15px;">'
      +     dkDisplay + ' · ' + weekday + dayPilTxt
      +   '</div>'
      +   '<table style="width:100%;border-collapse:collapse;font-size:14px;">';

      for(var j = 0; j < items.length; j++){
        seq++;
        var it = items[j];
        var hitsHtml = it.hits.map(function(h){
          if(h.cat === 'profile'){
            var esc = (h.label || '').replace(/'/g, "\\'");
            return '<span onclick="QFS.profInfo(\''+esc+'\')" title="Description + warning" '
                 + 'style="background:#00695c;color:#fff;padding:3px 9px;border-radius:4px;margin:2px 4px 2px 0;'
                 + 'font-size:13px;display:inline-block;font-weight:bold;cursor:pointer;border:1px solid #b2dfdb;">'
                 + '🌀 ' + h.label + ' ⓘ</span>';
          }
          var bg = (h.cat === 'door')   ? '#1b5e20'
                 : (h.cat === 'stem')   ? '#bf6c00'
                 : (h.cat === 'spirit') ? '#6a1b9a'
                 : '#283593';
          return '<span style="background:'+bg+';color:#fff;padding:3px 9px;border-radius:4px;margin:2px 4px 2px 0;font-size:13px;display:inline-block;font-weight:bold;">'
               + h.label + '</span>';
        }).join('');

        var doorColor = (['Open','Rest','Birth','View'].indexOf(it.cell.door) >= 0) ? '#1b5e20' : '#c62828';
        var cellSummary =
            '<span style="color:#888;">' + (it.cell.deity || '-') + '</span> · '
          + '<span style="color:#c62828;font-weight:bold;">' + (it.cell.tiH || '') + '</span>'
          + '/'
          + '<span style="color:#1565c0;font-weight:bold;">' + (it.cell.diH || '') + '</span> · '
          + '<span style="color:#444;">' + (it.cell.star || '') + '</span> · '
          + '<span style="font-weight:bold;color:'+doorColor+';">' + (it.cell.door || '') + '</span>';

        html +=
          '<tr style="border-top:1px solid #e0e0e0;">'
        +   '<td style="padding:10px;vertical-align:top;background:#f5fafa;">'
        +     '<div style="color:#999;font-size:11px;font-weight:bold;">#' + seq + '</div>'
        +     '<div style="font-weight:bold;color:#00695c;font-size:22px;line-height:1.2;">' + it.hourHan + '</div>'
        +     '<div style="color:#555;font-size:14px;margin-top:2px;">' + it.hourTime + '</div>'
        +     '<div style="color:#777;font-size:13px;margin-top:3px;">P' + it.palace + ' · ' + it.palaceLbl + '</div>'
        +   '</td>'
        +   '<td style="padding:10px;vertical-align:top;">'
        +     '<div style="margin-bottom:6px;line-height:1.6;">' + hitsHtml + '</div>'
        +     '<div style="color:#555;font-size:13px;margin-bottom:6px;">' + cellSummary + '</div>'
        +     '<div>'
        +       '<button onclick="QFS.showChart(this,\''+it.date+'\',\''+it.hourStem+'\',\''+it.hourBranch+'\','+it.palace+')" '
        +              'style="background:#fff;color:#00695c;border:1.5px solid #00695c;border-radius:5px;padding:5px 14px;font-size:13px;cursor:pointer;font-weight:bold;">View full chart</button>'
        +     '</div>'
        +   '</td>'
        + '</tr>';
      }

      html += '</table></div>';
    }

    box.innerHTML = html;
  }

  // ---------------------------------------------------------------
  // API PUBBLICA
  // ---------------------------------------------------------------
  // Dedicated, always-reachable mount point inserted right under the FLYING
  // STARS block — same approach as the Charts finder (#fscf-host). Avoids
  // depending on #fs-results-area, which the zone-gate layout can hide/move.
  function qfsGetHost(){
    var host = document.getElementById('qfs-host');
    if(host) return host;
    host = document.createElement('div');
    host.id = 'qfs-host';
    host.style.marginTop = '10px';
    var anchor = document.getElementById('fs-flying-stars-block');
    if(anchor && anchor.parentNode){
      if(anchor.nextSibling) anchor.parentNode.insertBefore(host, anchor.nextSibling);
      else anchor.parentNode.appendChild(host);
    } else {
      var fv = document.getElementById('fengshui-view') ||
               document.getElementById('fs-results-area') || document.body;
      fv.appendChild(host);
    }
    return host;
  }

  function open(opts){
    opts = opts || {};
    if(typeof FlyingStars === 'undefined'){ alert('flying-stars.js not loaded'); return; }
    if(typeof QMDJWaterScanner === 'undefined'){ alert('qmdj-water-scanner.js not loaded'); return; }

    var chart = getCurrentFSChart();
    if(!chart){
      alert('Set House Facing (\u00b0) and Period (1-9) in the Flying Stars block first.');
      return;
    }

    var host = qfsGetHost();
    buildPanel(host);
    try { updatePresetLabel(); } catch(e){}

    // Optional: preset (and optionally LOCK) the target star type — used by the
    // Operative Qimen stimulators (Water → 向星, Bed → 山星, others → free).
    try {
      if(opts.type === 'water' || opts.type === 'mountain'){
        var _r = document.querySelectorAll('input[name="qfs-type"]');
        for(var _i = 0; _i < _r.length; _i++){
          _r[_i].checked  = (_r[_i].value === opts.type);
          _r[_i].disabled = !!opts.lockType && (_r[_i].value !== opts.type);
        }
      }
      if(opts.starNum){
        var _sn = document.getElementById('qfs-starnum');
        if(_sn) _sn.value = String(opts.starNum);
      }
      if((opts.type || opts.starNum) && typeof updatePalaceInfo === 'function') updatePalaceInfo();
    } catch(e){ console.warn('QFS.open opts', e); }

    var panel = document.getElementById('qfs-panel');
    if(panel) panel.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function close(){
    var panel = document.getElementById('qfs-panel');
    if(panel) panel.remove();
    var res = document.getElementById('qfs-results');
    if(res) res.remove();
  }

  function selectAll(state){
    var boxes = document.querySelectorAll('input.qfs-ent');
    for(var i = 0; i < boxes.length; i++) boxes[i].checked = state;
  }

  function selectAllProfiles(state){
    var boxes = document.querySelectorAll('input.qfs-prof');
    for(var i = 0; i < boxes.length; i++) boxes[i].checked = state;
  }

  // Reset every per-item REQ toggle back to OPT (used by Clear ALL).
  function _resetEntToggles(){
    var t = document.querySelectorAll('.qfs-ent-toggle');
    for(var i = 0; i < t.length; i++){
      t[i].setAttribute('data-state', 'optional');
      t[i].textContent = 'OPT';
      t[i].style.background = '#cfd8dc';
      t[i].style.color = '#555';
    }
  }

  // Deseleziona TUTTE le scelte della sezione Qimen (entità + profili) in un colpo solo
  function clearAllQimen(){
    var ent  = document.querySelectorAll('input.qfs-ent');
    for(var i = 0; i < ent.length; i++)  ent[i].checked  = false;
    var prof = document.querySelectorAll('input.qfs-prof');
    for(var j = 0; j < prof.length; j++) prof[j].checked = false;
    _resetEntToggles();
  }

  // Mostra descrizione + warning di un profilo (riusa showQimenPopup di app-fengshui.js)
  function profInfo(label){
    if(typeof showQimenPopup === 'function') showQimenPopup(label);
    else alert(label);
  }

  // Bottone attualmente in stato "Hide chart" (uno solo per volta)
  var _openChartBtn = null;
  function setChartBtnLabel(btn, isOpen){
    if(btn) btn.textContent = isOpen ? 'Hide chart' : 'View full chart';
  }

  function showChart(btn, isoDate, hStemKey, hBranchKey, palace){
    var existing = document.getElementById('qimen-full-chart');

    // Se QUESTO bottone ha già aperto la carta → nascondila (toggle)
    if(btn && _openChartBtn === btn && existing){
      existing.remove();
      setChartBtnLabel(btn, false);
      _openChartBtn = null;
      return;
    }

    // Rimuovi la carta eventualmente aperta da un ALTRO bottone e riallinea la sua etichetta
    if(existing) existing.remove();
    if(_openChartBtn && _openChartBtn !== btn) setChartBtnLabel(_openChartBtn, false);

    if(typeof showQimenChart !== 'function'){
      alert('showQimenChart not available (defined in app-fengshui.js).');
      return;
    }

    // showQimenChart è definita in app-fengshui.js e accetta caratteri cinesi.
    // IMPORTANTE: da sola inserisce la carta in #fs-results-area, che il layout a
    // zone del pannello QFS può nascondere o spostare — per questo il bottone
    // sembrava "morto". Usiamo invece la sua API returnHtml per ottenere l'HTML e
    // lo agganciamo dentro #qfs-results (i risultati QFS, sempre visibili).
    var html = null;
    try {
      html = showQimenChart(isoDate, STEM_HAN[hStemKey] || hStemKey, BR_HAN[hBranchKey] || hBranchKey, palace, { returnHtml:true });
    } catch(e){ html = null; }

    if(html){
      var host = document.getElementById('qfs-results') || document.getElementById('qfs-host');
      if(!host && btn && btn.closest) host = btn.closest('table') ? btn.closest('table').parentNode : null;
      if(host){
        host.insertAdjacentHTML('beforeend', html);
      } else {
        // ultimissima risorsa: lascia che sia showQimenChart a piazzarla
        showQimenChart(isoDate, STEM_HAN[hStemKey] || hStemKey, BR_HAN[hBranchKey] || hBranchKey, palace);
      }
    } else {
      // returnHtml non supportato / carta non disponibile → comportamento originale
      showQimenChart(isoDate, STEM_HAN[hStemKey] || hStemKey, BR_HAN[hBranchKey] || hBranchKey, palace);
    }

    // Questo bottone ora mostra la carta
    setChartBtnLabel(btn, true);
    _openChartBtn = btn;

    // Porta la carta in vista e, se l'utente la chiude con la ✕ propria, riallinea l'etichetta
    var chartEl = document.getElementById('qimen-full-chart');
    if(chartEl){
      if(chartEl.scrollIntoView) chartEl.scrollIntoView({behavior:'smooth', block:'nearest'});
      var closeX = chartEl.querySelector('[onclick*="qimen-full-chart"]');
      if(closeX){
        closeX.addEventListener('click', function(){
          setChartBtnLabel(btn, false);
          if(_openChartBtn === btn) _openChartBtn = null;
        });
      }
    }
  }

  // ---------------------------------------------------------------
  // HEADLESS SCAN (for the AI assistant): given a flying star
  // (type 'water'|'mountain', number 1-9), find the hours that send a
  // FIXED favourable preset to that star's palace(s):
  //   • the 4 favourable doors: Open 開 / Rest 休 / Birth 生 / View 景
  //   • the 3 noble Qi (San Qi): Yi 乙 / Bing 丙 / Ding 丁
  // A palace matches if it carries AT LEAST ONE of those entities.
  // Returns data (no DOM), so it can be called programmatically.
  // ---------------------------------------------------------------
  // ── Imprisoned-star (入囚) detection & liberation ──────────────────────
  // When the CURRENT-PERIOD water (facing) star sits in the CENTRE it is
  // "imprisoned". Moving water frees it toward EITHER the palace where the
  // 5 water star sits OR the FACING palace (if they coincide, that one).
  function _fsCurrentPeriod(){
    var y = new Date().getFullYear();
    return ((Math.floor((y - 1864) / 20)) % 9) + 1;            // San Yuan 9×20y; P9 = 2024-2043
  }
  var _FS_OCT_TO_GRID = [7, 6, 3, 0, 1, 2, 5, 8];              // N,NE,E,SE,S,SW,W,NW → grid idx
  function _fsFacingGridFromDeg(deg){
    if(!isFinite(deg)) return -1;
    var oct = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return _FS_OCT_TO_GRID[oct];
  }
  function _fsDirNameToGrid(name){
    if(name == null) return -1;
    var s = String(name).trim().toUpperCase();
    if(/^-?\d+(\.\d+)?$/.test(s)) return _fsFacingGridFromDeg(parseFloat(s));
    var map = { N:7,NORTH:7,NORD:7, NE:6,NORDEST:6, E:3,EAST:3,EST:3, SE:0,SUDEST:0,
                S:1,SOUTH:1,SUD:1, SW:2,SUDOVEST:2, W:5,WEST:5,OVEST:5, NW:8,NORDOVEST:8 };
    return (s in map) ? map[s] : -1;
  }
  // Heavenly-stem clash (相冲): 甲庚, 乙辛, 丙壬, 丁癸. A palace whose Tian Pan stem
  // clashes its Di Pan stem (e.g. 乙/辛 = 青龍逃走) is NOT favourable for activation.
  var _FS_STEM_CLASH = { Jia:'Geng', Geng:'Jia', Yi:'Xin', Xin:'Yi', Bing:'Ren', Ren:'Bing', Ding:'Gui', Gui:'Ding' };
  function _fsStemClash(a, b){ return !!a && !!b && _FS_STEM_CLASH[a] === b; }

  function imprisonmentInfo(chart){
    try {
      if(!chart || !chart.facingStars) return { imprisoned:false };
      var per = _fsCurrentPeriod();
      if(chart.facingStars[4] !== per) return { imprisoned:false };   // period water star not in centre
      var byGrid = {};
      var add = function(g, via){ if(g==null || g<0 || g===4) return; if(!byGrid[g]) byGrid[g]={grid:g,vias:[]}; if(byGrid[g].vias.indexOf(via)<0) byGrid[g].vias.push(via); };
      for(var i=0;i<9;i++){ if(chart.facingStars[i] === 5) add(i, '5ws'); }            // (a) where the 5 water star sits
      var facDeg = NaN;
      var hf = (typeof document!=='undefined') ? document.getElementById('fs-house-facing') : null;
      if(hf) facDeg = parseFloat(hf.value);
      if(isNaN(facDeg)){ var fp = _fsActiveHouseFP(); if(fp && fp.facing != null) facDeg = parseFloat(fp.facing); }
      if(isFinite(facDeg)) add(_fsFacingGridFromDeg(facDeg), 'facing');                  // (b) the facing palace
      var palaces = Object.keys(byGrid).map(function(g){
        var c = byGrid[g], pal = FS_GRID_TO_QMDJ_PALACE[c.grid];
        return { grid:c.grid, qmdj:pal, label:QMDJ_PALACE_TO_LABEL[pal]||('P'+pal), via:c.vias.join('+') };
      });
      return { imprisoned:true, periodStar:per, palaces:palaces };
    } catch(e){ return { imprisoned:false }; }
  }

  function scanStarPreset(type, starN, opts){
    opts = opts || {};
    if(typeof Solar === 'undefined') return { error:'lunar-javascript not loaded.' };
    if(typeof QMDJWaterScanner === 'undefined' || typeof QMDJWaterScanner.getHourChart !== 'function')
      return { error:'qmdj-water-scanner.js not loaded.' };
    var chart = getCurrentFSChart();
    if(!chart) return { error:'Set House Facing and Period first.' };
    if(type !== 'water' && type !== 'mountain') return { error:"star_type must be 'water' (facing star) or 'mountain' (sitting star)." };
    starN = parseInt(starN, 10);
    if(isNaN(starN) || starN < 1 || starN > 9) return { error:'star_num must be 1-9.' };

    var imp = imprisonmentInfo(chart);
    var gridIndices = findStarPalaces(chart, type, starN);
    var fsPalaces = gridIndices
      .filter(function(g){ return g !== 4; })
      .map(function(g){ return FS_GRID_TO_QMDJ_PALACE[g]; });

    // 入囚 — the CURRENT-PERIOD water star imprisoned in the centre is activated
    // by MOVING WATER at the liberation palace(s) instead of its own (centre) palace.
    var liberation = null;
    if(type === 'water' && imp.imprisoned && starN === imp.periodStar && !fsPalaces.length){
      liberation = imp.palaces.slice();
      if(opts.liberationDir != null){
        var wantGrid = _fsDirNameToGrid(opts.liberationDir);
        if(wantGrid >= 0){ var f = liberation.filter(function(p){ return p.grid === wantGrid; }); if(f.length) liberation = f; }
      }
      fsPalaces = liberation.map(function(p){ return p.qmdj; });
    }

    if(!fsPalaces.length){
      var inCentre = gridIndices.indexOf(4) !== -1;
      var isImp = imp.imprisoned && starN === imp.periodStar;
      return {
        error: 'Star ' + starN + ' (' + type + ') ' + (inCentre
          ? 'sits in the CENTRE palace this period, so it has no outer palace to activate with Qimen'
          : 'does not appear in any outer palace of this chart') + '.',
        chart: 'flying (\u98db\u76e4)',
        imprisoned: isImp || false,
        imprisonment_note: isImp
          ? ('Star ' + starN + ' (current period) is IMPRISONED in the centre (\u5165\u56da). Free it with moving water toward: '
             + imp.palaces.map(function(p){ return p.label + ' (' + p.via + ')'; }).join(' OR ')
             + '. Ask the user in which of those quadrants the water sits, then scan that palace.')
          : undefined,
        liberation: isImp ? imp.palaces : undefined,
        palaces: [], count: 0, results: []
      };
    }

    // Default favourable preset: San Qi + 4 good doors + the Qimen celestial
    // star that CORRESPONDS to the flying star (same number 1-9). A saved
    // custom selection, if present, always overrides this preset.
    var presetLabel = 'San Qi (Yi/Bing/Ding) + Open/Rest/Birth/View doors + matching \u4e5d\u661f star (palaces with a Tian/Di stem clash \u76f8\u51b2 are excluded)';
    var wanted = {
      stems:   new Set(['Yi','Bing','Ding']),
      doors:   new Set(['Open','Rest','Birth','View']),
      stars:   new Set(),
      spirits: new Set()
    };
    QM_STARS.forEach(function(s){ if(s.num === starN) wanted.stars.add(s.key); });   // corresponding 九星
    try {
      var savedP = JSON.parse(localStorage.getItem('xkdg_qfs_preset') || 'null');
      if(savedP && (((savedP.stems||[]).length)+((savedP.doors||[]).length)+((savedP.stars||[]).length)+((savedP.spirits||[]).length)) > 0){
        wanted = {
          stems:   new Set(savedP.stems   || []),
          doors:   new Set(savedP.doors   || []),
          stars:   new Set(savedP.stars   || []),
          spirits: new Set(savedP.spirits || [])
        };
        presetLabel = 'Custom saved preset';
      }
    } catch(e){}
    var excludeFuYin = !!opts.excludeFuYin;

    var range = getRange();
    var startStr = opts.startStr || range.startStr;
    var days = parseInt(opts.days, 10) || range.days || 7;
    if(!startStr) return { error:'Set the FROM date in the toolbar first (or pass a start date).' };
    var parts = String(startStr).split('-');
    var startDate = new Date(+parts[0], (+parts[1]) - 1, +parts[2]);
    if(isNaN(startDate.getTime())) return { error:'Invalid start date.' };

    var out = [];
    for(var d = 0; d < days; d++){
      var dt = new Date(startDate.getTime() + d * 86400000);
      var Y = dt.getFullYear(), M = dt.getMonth() + 1, D = dt.getDate();
      var dayStemEn = null, dayPillarHan = '';
      try {
        var dG, dZ;
        var _ltq2 = (typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.currentLonTz() : null;
        if (_ltq2 && isFinite(_ltq2.lonDeg)) {
          var _Pq2 = XKDGSolarTime.pillarsFromCivil(Y, M, D, 12, 0, 0, _ltq2.lonDeg, _ltq2.tzOffsetMin);
          dG = _Pq2.day.charAt(0); dZ = _Pq2.day.charAt(1);
        } else {
          var ec = Solar.fromYmd(Y, M, D).getLunar().getEightChar();
          dG = ec.getDayGan(); dZ = ec.getDayZhi();
        }
        dayStemEn = STEM_HAN_TO_EN[dG]; dayPillarHan = dG + dZ;
      } catch(e){ continue; }
      if(!dayStemEn) continue;
      var hours = hourPillarsForDay(dayStemEn);
      for(var h = 0; h < hours.length; h++){
        var hp = hours[h], hourChart;
        try { hourChart = QMDJWaterScanner.getHourChart(Y, M, D, hp.stem, hp.branch); } catch(e){ continue; }
        if(!hourChart || !hourChart.palaces) continue;
        for(var pi = 0; pi < fsPalaces.length; pi++){
          var palace = fsPalaces[pi];
          var pdata = hourChart.palaces[palace];
          if(!pdata) continue;
          if(excludeFuYin && pdata.ti && pdata.ti === pdata.di) continue;
          // Centralised CANONICAL gate (single source: QMDJWaterScanner).
          // §1 exclusions (clash 相冲 unless Commander, 丙庚 unless Geng=Commander,
          // 庚己 unless Pillar+door, Geng↔Commander, Warrior always, Tiger unless gate).
          var pflags = (window.QMDJWaterScanner && window.QMDJWaterScanner.palaceFlags)
            ? window.QMDJWaterScanner.palaceFlags(pdata)
            : { disqualified: _fsStemClash(pdata.ti, pdata.di), reasons: [] };
          if(!opts.allowClash && pflags.disqualified) continue;
          // §2 mandatory gate — San Qi/Wu + favourable door (flying 飛盤, no travel exception).
          if(!opts.allowClash && window.QMDJWaterScanner && window.QMDJWaterScanner.directionGate){
            if(!window.QMDJWaterScanner.directionGate(pdata, { travel:false }).eligible) continue;
          }
          var isVoid = (hourChart.voidPalaces || []).indexOf(palace) >= 0;
          var hits = matchPalace(pdata, wanted);
          if(!hits.length) continue;
          out.push({
            date:      Y + '-' + String(M).padStart(2,'0') + '-' + String(D).padStart(2,'0'),
            weekday:   WEEKDAYS_IT[dt.getDay()],
            dayPillar: dayPillarHan,
            palace:    palace,
            palaceLbl: QMDJ_PALACE_TO_LABEL[palace] || ('P' + palace),
            liberates: liberation ? ('frees ws' + imp.periodStar + ' toward ' + (QMDJ_PALACE_TO_LABEL[palace] || palace)) : undefined,
            isVoid:    isVoid || undefined,
            hourHan:   hp.han,
            hourTime:  hp.time,
            dun:       hourChart.dun,
            ju:        hourChart.ju,
            hits:      hits,
            score:     hits.length
          });
        }
      }
    }
    out.sort(function(a, b){ if(a.date !== b.date) return a.date < b.date ? -1 : 1; return b.score - a.score; });
    return {
      starType: type, starNum: starN,
      chart: 'flying (\u98db\u76e4)',
      imprisoned: !!liberation,
      liberatesStar: liberation ? imp.periodStar : undefined,
      liberationPalaces: liberation ? liberation.map(function(p){ return p.label + ' (' + p.via + ')'; }) : undefined,
      imprisonment_note: liberation
        ? ('Star ' + imp.periodStar + ' is imprisoned in the centre (\u5165\u56da); these hours send the favourable Qimen preset to the LIBERATION palace, freeing it toward ' + liberation.map(function(p){ return p.label; }).join(' / ') + '.')
        : undefined,
      palaces: fsPalaces.map(function(p){ return QMDJ_PALACE_TO_LABEL[p] || ('P' + p); }),
      preset: presetLabel,
      count: out.length, results: out
    };
  }

  // Save the current checkbox selection as a custom preset (overrides the auto
  // preset in scanStarPreset). Clear reverts to the auto preset.
  function savePreset(){
    var w = { stems:[], doors:[], stars:[], spirits:[] };
    var boxes = document.querySelectorAll('input.qfs-ent');
    for(var b=0;b<boxes.length;b++){
      if(!boxes[b].checked) continue;
      var cat = boxes[b].getAttribute('data-cat'), key = boxes[b].getAttribute('data-key');
      if(cat==='stem') w.stems.push(key);
      else if(cat==='door') w.doors.push(key);
      else if(cat==='star') w.stars.push(key);
      else if(cat==='spirit') w.spirits.push(key);
    }
    if((w.stems.length+w.doors.length+w.stars.length+w.spirits.length) === 0){ alert('Select at least one entity to save as preset.'); return; }
    try { localStorage.setItem('xkdg_qfs_preset', JSON.stringify(w)); alert('Saved as custom preset. It will now be used instead of the auto preset (San Qi + doors + matching star).'); }
    catch(e){ alert('Could not save preset.'); }
    updatePresetLabel();
  }
  function clearPreset(){
    try { localStorage.removeItem('xkdg_qfs_preset'); } catch(e){}
    alert('Custom preset cleared. Auto preset restored: San Qi + 4 doors + the matching \u4e5d\u661f star.');
    updatePresetLabel();
  }
  function updatePresetLabel(){
    var el = document.getElementById('qfs-preset-state'); if(!el) return;
    var has = false;
    try { var s = JSON.parse(localStorage.getItem('xkdg_qfs_preset') || 'null');
      has = !!(s && ((s.stems||[]).length + (s.doors||[]).length + (s.stars||[]).length + (s.spirits||[]).length)); } catch(e){}
    el.textContent = has
      ? '\u25CF Active preset: your custom saved selection (overrides auto).'
      : '\u25CB Active preset: auto = San Qi + 4 doors + the star matching the flying star.';
  }

  // ── Stateless flying-star chart from facing degrees + period ─────────────────
  // Adapter the AI chat uses (get_house_setup -> flying_stars). It does NOT depend
  // on any open page: it computes the SAME chart the Feng Shui section draws,
  // via FlyingStars.calculate(period, fsMountainCharFromDeg(facing)), and returns
  // it keyed by DIRECTION (South-at-top) so the AI can read palaces[<DIR>].water.
  // Convert ANY flying-star chart object (auto from FlyingStars.calculate OR a
  // hand-composed manual chart) into the direction-keyed shape the AI reads.
  // Both share facingStars/sittingStars/baseStars (9 values by grid index, South
  // at top), so a manual override flows through here unchanged.
  function chartToFlyingStars(chart){
    if (!chart || !chart.facingStars || !chart.sittingStars) return { error: 'no chart' };
    var I = FlyingStars.DIR_TO_INDEX;
    var DIRS = ['SE','S','SW','E','W','NE','N','NW'];
    var palaces = {};
    DIRS.forEach(function (d) { var gi = I[d]; palaces[d] = { water: chart.facingStars[gi], mountain: chart.sittingStars[gi], base: (chart.baseStars ? chart.baseStars[gi] : null) }; });
    var center = { water: chart.facingStars[4], mountain: chart.sittingStars[4], base: (chart.baseStars ? chart.baseStars[4] : null) };
    // Facing direction: auto charts carry facingDirection; manual ones carry only
    // facingMountain, so derive it from the mountain when needed.
    var facingDir = chart.facingDirection || null;
    if (!facingDir && chart.facingMountain && typeof FlyingStars.getMountainPosition === 'function') {
      var mp = FlyingStars.getMountainPosition(chart.facingMountain); if (mp) facingDir = mp.direction;
    }
    // 入囚 (imprisonment): the CURRENT-period water (facing) star locked in the centre.
    // Freed with moving water at the liberation quadrant(s): where the 5 water star
    // sits and/or the facing palace. Matches the section's own imprisonment handling.
    var imprisoned = false, liberation = null, note = null;
    var curPer = (typeof _fsCurrentPeriod === 'function') ? _fsCurrentPeriod() : NaN;
    if (isFinite(curPer) && chart.facingStars[4] === curPer) {
      imprisoned = true;
      var gridToDir = {}; DIRS.forEach(function (d) { gridToDir[I[d]] = d; });
      var libSet = {};
      for (var i = 0; i < 9; i++) { if (i !== 4 && chart.facingStars[i] === 5 && gridToDir[i]) libSet[gridToDir[i]] = true; }
      var facGrid = (facingDir != null) ? I[facingDir] : null; if (facGrid != null && facGrid !== 4 && gridToDir[facGrid]) libSet[gridToDir[facGrid]] = true;
      liberation = Object.keys(libSet);
      note = 'Imprisoned (\u5165\u56da): the current-period water star sits in the centre. Free it with MOVING WATER at the liberation quadrant(s): ' + liberation.join(', ') + '.';
    }
    return {
      manual: !!chart._manual,
      facing_mountain: chart.facingMountain || null, facing_direction: facingDir, sitting_direction: chart.sittingDirection || null,
      palaces: palaces, center: center,
      imprisoned: imprisoned, liberation: liberation, imprisonment_note: note
    };
  }
  function computeChart(facingDeg, period){
    if (typeof FlyingStars === 'undefined' || typeof fsMountainCharFromDeg !== 'function')
      return { error: 'flying-star engine unavailable' };
    var f = parseFloat(facingDeg), p = parseInt(period, 10);
    if (!isFinite(f) || isNaN(p) || p < 1 || p > 9) return { error: 'facing or period missing/invalid' };
    var mch; try { mch = fsMountainCharFromDeg(f); } catch (e) { return { error: 'bad facing degrees' }; }
    var chart; try { chart = FlyingStars.calculate(p, mch); } catch (e) { return { error: (e && e.message) || 'calculate failed' }; }
    var out = chartToFlyingStars(chart);
    if (out && !out.error) { out.facing = f; out.period = p; }
    return out;
  }

  window.QFS = {
    open:      open,
    computeChart: computeChart,
    chartToFlyingStars: chartToFlyingStars,
    scanStarPreset: scanStarPreset,
    close:     close,
    selectAll: selectAll,
    selectAllProfiles: selectAllProfiles,
    clearAllQimen: clearAllQimen,
    savePreset: savePreset,
    clearPreset: clearPreset,
    profInfo:  profInfo,
    showChart: showChart,
    toggleCat: toggleCat,
    toggleEnt: toggleEnt
  };
  // Alias più "verboso" per chi cerca un nome esplicito
  window.fsFindQimenForFlyingStars = open;

})();

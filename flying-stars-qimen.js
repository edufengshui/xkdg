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
  var QM_STARS = [
    {key:'Peng',  en:'Grass',     han:'天蓬', label:'天蓬 Peng (Grass)'},
    {key:'Rui',   en:'Rice',      han:'天芮', label:'天芮 Rui (Rice)'},
    {key:'Chong', en:'Aggressor', han:'天沖', label:'天沖 Chong (Aggressor)'},
    {key:'Fu',    en:'Assistant', han:'天輔', label:'天輔 Fu (Assistant)'},
    {key:'Qin',   en:'Fowl',      han:'天禽', label:'天禽 Qin (Fowl)'},
    {key:'Xin',   en:'Heart',     han:'天心', label:'天心 Xin (Heart)'},
    {key:'Zhu',   en:'Pillar',    han:'天柱', label:'天柱 Zhu (Pillar)'},
    {key:'Ren',   en:'Official',  han:'天任', label:'天任 Ren (Official)'},
    {key:'Ying',  en:'Hero',      han:'天英', label:'天英 Ying (Hero)'}
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
    {key:'Open',  han:'開', label:'開 Open'},
    {key:'Rest',  han:'休', label:'休 Rest'},
    {key:'Birth', han:'生', label:'生 Birth'},
    {key:'View',  han:'景', label:'景 View'}
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
  function getCurrentFSChart(){
    if(typeof FlyingStars === 'undefined') return null;
    if(typeof fsMountainCharFromDeg !== 'function') return null;
    var hf = document.getElementById('fs-house-facing');
    var pp = document.getElementById('fs-period');
    if(!hf || !pp) return null;
    var hfDeg = parseFloat(hf.value);
    var period = parseInt(pp.value, 10);
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

  // ---------------------------------------------------------------
  // COSTRUZIONE PANNELLO DI CONFIGURAZIONE
  // ---------------------------------------------------------------
  function buildPanel(area){
    var stemHtml = QM_STEMS.map(function(s){
      return '<label style="white-space:nowrap;">'
           +   '<input type="checkbox" class="qfs-ent" data-cat="stem" data-key="'+s.key+'" checked> '+s.label
           + '</label>';
    }).join('');
    var doorHtml = QM_DOORS.map(function(d){
      return '<label style="white-space:nowrap;">'
           +   '<input type="checkbox" class="qfs-ent" data-cat="door" data-key="'+d.key+'" checked> '+d.label
           + '</label>';
    }).join('');
    var starHtml = QM_STARS.map(function(s){
      return '<label style="white-space:nowrap;font-size:11px;">'
           +   '<input type="checkbox" class="qfs-ent" data-cat="star" data-key="'+s.key+'"> '+s.label
           + '</label>';
    }).join('');
    var spiritHtml = QM_SPIRITS.map(function(sp){
      return '<label style="white-space:nowrap;font-size:11px;">'
           +   '<input type="checkbox" class="qfs-ent" data-cat="spirit" data-key="'+sp.key+'"> '+sp.label
           + '</label>';
    }).join('');

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
    if(hasCenter) msg += ' <span style="color:#888;">(also at center — center is skipped in scan)</span>';
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
      hits.push({cat:'stem', label:(palaceData.tiH || palaceData.ti) + ' (天/Tian)'});
    }
    if(palaceData.di && wanted.stems.has(palaceData.di)){
      hits.push({cat:'stem', label:(palaceData.diH || palaceData.di) + ' (地/Di)'});
    }
    // Doors
    if(palaceData.door && wanted.doors.has(palaceData.door)){
      hits.push({cat:'door', label:palaceData.door + ' Door'});
    }
    // Stars
    var starKey = STAR_EN_TO_KEY[palaceData.star];
    if(starKey && wanted.stars.has(starKey)){
      hits.push({cat:'star', label:palaceData.star + ' Star'});
    }
    // Spirits (八神)
    if(palaceData.deity && wanted.spirits.has(palaceData.deity)){
      hits.push({cat:'spirit', label:palaceData.deity + ' 神'});
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
    var fsPalaces = gridIndices
      .filter(function(g){ return g !== 4; })
      .map(function(g){ return FS_GRID_TO_QMDJ_PALACE[g]; });
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
          var ec = Solar.fromYmd(Y, M, D).getLunar().getEightChar();
          var dGanHan = ec.getDayGan(), dZhiHan = ec.getDayZhi();
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
  function open(){
    var area = document.getElementById('fs-results-area');
    if(!area){ alert('Feng Shui view not active. Open the Feng Shui mode first.'); return; }
    if(typeof FlyingStars === 'undefined'){ alert('flying-stars.js not loaded'); return; }
    if(typeof QMDJWaterScanner === 'undefined'){ alert('qmdj-water-scanner.js not loaded'); return; }

    var chart = getCurrentFSChart();
    if(!chart){
      alert('Set House Facing (°) and Period (1-9) in the Flying Stars block first.');
      return;
    }

    buildPanel(area);
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

  // Deseleziona TUTTE le scelte della sezione Qimen (entità + profili) in un colpo solo
  function clearAllQimen(){
    var ent  = document.querySelectorAll('input.qfs-ent');
    for(var i = 0; i < ent.length; i++)  ent[i].checked  = false;
    var prof = document.querySelectorAll('input.qfs-prof');
    for(var j = 0; j < prof.length; j++) prof[j].checked = false;
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

    if(typeof showQimenChart !== 'function'){
      alert('showQimenChart not available (defined in app-fengshui.js).');
      return;
    }
    // showQimenChart è definita in app-fengshui.js e accetta caratteri cinesi
    showQimenChart(isoDate, STEM_HAN[hStemKey] || hStemKey, BR_HAN[hBranchKey] || hBranchKey, palace);

    // Riporta l'eventuale bottone precedentemente aperto a "View full chart"
    if(_openChartBtn && _openChartBtn !== btn) setChartBtnLabel(_openChartBtn, false);

    // Questo bottone ora mostra la carta
    setChartBtnLabel(btn, true);
    _openChartBtn = btn;

    // Se l'utente chiude la carta con la ✕ propria, riallinea l'etichetta del bottone
    var chartEl = document.getElementById('qimen-full-chart');
    if(chartEl){
      var closeX = chartEl.querySelector('[onclick*="qimen-full-chart"]');
      if(closeX){
        closeX.addEventListener('click', function(){
          setChartBtnLabel(btn, false);
          if(_openChartBtn === btn) _openChartBtn = null;
        });
      }
    }
  }

  window.QFS = {
    open:      open,
    close:     close,
    selectAll: selectAll,
    selectAllProfiles: selectAllProfiles,
    clearAllQimen: clearAllQimen,
    profInfo:  profInfo,
    showChart: showChart,
    toggleCat: toggleCat
  };
  // Alias più "verboso" per chi cerca un nome esplicito
  window.fsFindQimenForFlyingStars = open;

})();

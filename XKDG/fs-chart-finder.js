// ============================================================
// fs-chart-finder.js
// Find all Flying Stars charts (Period + Facing) where a given
// Water Star or Mountain Star sits in a specific palace.
// XKDG Bazi Calculator
// ============================================================
//
// USO:
//   1. In index.html, dopo flying-stars.js:
//        <script src="fs-chart-finder.js"></script>
//   2. In app-fengshui.js, pulsante che chiama:
//        onclick="FSChartFinder.open()"
//
// DIPENDENZE:
//   • flying-stars.js   (window.FlyingStars)
//   • app-fengshui.js   (fsMountainCharFromDeg — globale)
//
// ============================================================

(function(){
  'use strict';

  // 24 montagne in ordine di indice (da fsMountainCharFromDeg)
  var MTN_CHAR = [
    '壬','子','癸','丑','艮','寅',
    '甲','卯','乙','辰','巽','巳',
    '丙','午','丁','未','坤','申',
    '庚','酉','辛','戌','乾','亥'
  ];
  var MTN_PINYIN = [
    'Ren','Zi','Gui','Chou','Gen','Yin',
    'Jia','Mao','Yi','Chen','Xun','Si',
    'Bing','Wu','Ding','Wei','Kun','Shen',
    'Geng','You','Xin','Xu','Qian','Hai'
  ];

  // Griglia FS (S in alto): indice → etichetta palazzo
  var GRID_LABEL = {
    0:'SE 巽', 1:'S 離', 2:'SW 坤',
    3:'E 震',  4:'Center 中', 5:'W 兌',
    6:'NE 艮', 7:'N 坎', 8:'NW 乾'
  };

  // Grado centrale di ogni montagna
  function mtnCenterDeg(idx){
    return (idx * 15 - 15 + 360) % 360;
  }
  // Range di gradi (stringa) per una montagna
  function mtnDegRange(idx){
    var center = mtnCenterDeg(idx);
    var lo = ((center - 7.5) + 360) % 360;
    var hi = (center + 7.5) % 360;
    // Formatta con 1 decimale
    return lo.toFixed(1) + '°–' + hi.toFixed(1) + '°';
  }

  // ---------------------------------------------------------------
  // PANNELLO UI
  // ---------------------------------------------------------------
  function buildPanel(area){
    var starOptions = '';
    for(var n = 1; n <= 9; n++){
      starOptions += '<option value="'+n+'"'+(n===8?' selected':'')+'>Star '+n+'</option>';
    }

    var palaceOptions = '';
    for(var g = 0; g < 9; g++){
      palaceOptions += '<option value="'+g+'">'+GRID_LABEL[g]+'</option>';
    }

    var periodOptions = '<option value="all" selected>All Periods (1–9)</option>';
    for(var p = 1; p <= 9; p++){
      periodOptions += '<option value="'+p+'">Period '+p+' only</option>';
    }

    var html =
      '<div id="fscf-panel" style="border:2px solid #1565c0;border-radius:8px;background:#e3f2fd;padding:12px;margin-top:10px;font-size:12px;color:#1a1008;">'
    +   '<div style="font-weight:bold;color:#1565c0;font-size:13px;margin-bottom:8px;">'
    +     '🔍 Find Charts by Star Position'
    +     '<span onclick="FSChartFinder.close()" style="float:right;cursor:pointer;color:#666;font-weight:normal;">✕</span>'
    +   '</div>'

    +   '<div style="font-size:11px;color:#555;margin-bottom:10px;font-style:italic;">'
    +     'Find all Flying Stars charts (Period + Facing) where a specific Water Star or Mountain Star sits in a chosen palace.'
    +   '</div>'

    +   '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">'
    // Star type
    +     '<div style="display:flex;gap:8px;align-items:center;">'
    +       '<label style="white-space:nowrap;"><input type="radio" name="fscf-type" value="water" checked> 向星 Water</label>'
    +       '<label style="white-space:nowrap;"><input type="radio" name="fscf-type" value="mountain"> 山星 Mountain</label>'
    +     '</div>'
    // Star number
    +     '<div style="display:flex;gap:4px;align-items:center;">'
    +       '<span style="font-weight:bold;color:#0d47a1;">Star:</span>'
    +       '<select id="fscf-starnum" style="padding:4px 6px;border:1px solid #1565c0;border-radius:4px;font-size:12px;">'
    +         starOptions
    +       '</select>'
    +     '</div>'
    +   '</div>'

    +   '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">'
    // Target palace
    +     '<div style="display:flex;gap:4px;align-items:center;">'
    +       '<span style="font-weight:bold;color:#0d47a1;">In palace:</span>'
    +       '<select id="fscf-palace" style="padding:4px 6px;border:1px solid #1565c0;border-radius:4px;font-size:12px;">'
    +         palaceOptions
    +       '</select>'
    +     '</div>'
    // Period filter
    +     '<div style="display:flex;gap:4px;align-items:center;">'
    +       '<span style="font-weight:bold;color:#0d47a1;">Period:</span>'
    +       '<select id="fscf-period" style="padding:4px 6px;border:1px solid #1565c0;border-radius:4px;font-size:12px;">'
    +         periodOptions
    +       '</select>'
    +     '</div>'
    +   '</div>'

    +   '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #bbdefb;">'
    +     '<button id="fscf-search-btn" style="background:#1565c0;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:bold;cursor:pointer;">🔎 SEARCH CHARTS</button>'
    +   '</div>'

    + '</div>'
    + '<div id="fscf-results" style="margin-top:8px;"></div>';

    area.innerHTML = html;
    document.getElementById('fscf-search-btn').onclick = runSearch;
  }

  // ---------------------------------------------------------------
  // RICERCA
  // ---------------------------------------------------------------
  function runSearch(){
    var resultsBox = document.getElementById('fscf-results');
    if(!resultsBox) return;
    resultsBox.innerHTML = '<div style="padding:12px;color:#666;font-size:12px;text-align:center;">⏳ Searching…</div>';

    if(typeof FlyingStars === 'undefined'){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ flying-stars.js not loaded.</div>';
      return;
    }
    if(typeof fsMountainCharFromDeg !== 'function'){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">⚠ fsMountainCharFromDeg not found (from app-fengshui.js).</div>';
      return;
    }

    var typeEl = document.querySelector('input[name="fscf-type"]:checked');
    var starNum  = parseInt(document.getElementById('fscf-starnum').value, 10);
    var gridIdx  = parseInt(document.getElementById('fscf-palace').value, 10);
    var periodEl = document.getElementById('fscf-period');
    var periodFilter = periodEl.value; // 'all' or '1'-'9'
    var starType = typeEl.value; // 'water' or 'mountain'

    setTimeout(function(){
      var matches = [];

      var periods = [];
      if(periodFilter === 'all'){
        for(var p = 1; p <= 9; p++) periods.push(p);
      } else {
        periods.push(parseInt(periodFilter, 10));
      }

      for(var pi = 0; pi < periods.length; pi++){
        var period = periods[pi];

        for(var mi = 0; mi < 24; mi++){
          var mtnChar = MTN_CHAR[mi];
          var chart;
          try {
            chart = FlyingStars.calculate(period, mtnChar);
          } catch(e){ continue; }
          if(!chart) continue;

          var starArr = (starType === 'water') ? chart.facingStars : chart.sittingStars;
          if(!starArr) continue;

          if(starArr[gridIdx] === starNum){
            // Trovato! Raccoglie info per la visualizzazione
            matches.push({
              period:    period,
              mtnIdx:    mi,
              mtnChar:   mtnChar,
              mtnPinyin: MTN_PINYIN[mi],
              degRange:  mtnDegRange(mi),
              centerDeg: mtnCenterDeg(mi),
              chart:     chart
            });
          }
        }
      }

      renderResults(resultsBox, matches, starType, starNum, gridIdx);
    }, 20);
  }

  // ---------------------------------------------------------------
  // RENDER RISULTATI
  // ---------------------------------------------------------------
  function renderResults(box, matches, starType, starNum, gridIdx){
    var typeLbl = (starType === 'water') ? '向星 Water' : '山星 Mountain';
    var palaceLbl = GRID_LABEL[gridIdx];

    if(matches.length === 0){
      box.innerHTML =
        '<div style="padding:16px;background:#fafafa;border:1px dashed #ccc;border-radius:6px;color:#888;font-size:14px;text-align:center;">'
      +   'No charts found with ' + typeLbl + ' Star ' + starNum + ' in ' + palaceLbl + '.'
      + '</div>';
      return;
    }

    var html =
      '<div style="font-weight:bold;color:#1565c0;font-size:16px;margin:10px 0 4px;">'
    +   '🔍 ' + matches.length + ' chart' + (matches.length > 1 ? 's' : '') + ' found'
    + '</div>'
    + '<div style="font-size:13px;color:#666;margin-bottom:10px;">'
    +   typeLbl + ' Star ' + starNum + ' in palace ' + palaceLbl
    + '</div>';

    // Tabella risultati
    html +=
      '<div style="overflow-x:auto;">'
    + '<table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #bbdefb;border-radius:6px;">'
    + '<thead>'
    + '<tr style="background:#1565c0;color:#fff;">'
    +   '<th style="padding:8px 10px;text-align:left;">Period</th>'
    +   '<th style="padding:8px 10px;text-align:left;">Facing Mountain</th>'
    +   '<th style="padding:8px 10px;text-align:left;">Degrees</th>'
    +   '<th style="padding:8px 10px;text-align:center;">Chart Grid</th>'
    +   '<th style="padding:8px 10px;text-align:center;"></th>'
    + '</tr>'
    + '</thead><tbody>';

    for(var i = 0; i < matches.length; i++){
      var m = matches[i];
      var miniGrid = buildMiniGrid(m.chart, starType, starNum, gridIdx);
      var rowBg = (i % 2 === 0) ? '#fff' : '#f5f9ff';

      html +=
        '<tr style="border-top:1px solid #e0e0e0;background:'+rowBg+';">'
      +   '<td style="padding:8px 10px;font-weight:bold;color:#0d47a1;font-size:16px;">P' + m.period + '</td>'
      +   '<td style="padding:8px 10px;">'
      +     '<span style="font-size:18px;font-weight:bold;color:#1a1008;">' + m.mtnChar + '</span> '
      +     '<span style="color:#555;">' + m.mtnPinyin + '</span>'
      +   '</td>'
      +   '<td style="padding:8px 10px;color:#555;">' + m.degRange + '</td>'
      +   '<td style="padding:8px 10px;">' + miniGrid + '</td>'
      +   '<td style="padding:8px 10px;text-align:center;">'
      +     '<button onclick="FSChartFinder.loadChart('+m.period+','+m.centerDeg+')" '
      +            'style="background:#fff;color:#1565c0;border:1.5px solid #1565c0;border-radius:5px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:bold;white-space:nowrap;">Load chart</button>'
      +   '</td>'
      + '</tr>';
    }

    html += '</tbody></table></div>';
    box.innerHTML = html;
  }

  // Mini griglia 3×3 con sitting·base·facing per ogni cella
  function buildMiniGrid(chart, starType, starNum, highlightGridIdx){
    var cells = [];
    // Griglia FS: 0=SE, 1=S, 2=SW, 3=E, 4=C, 5=W, 6=NE, 7=N, 8=NW
    for(var g = 0; g < 9; g++){
      var base    = chart.baseStars[g];
      var sitting = chart.sittingStars[g];
      var facing  = chart.facingStars[g];
      var isTarget = (g === highlightGridIdx);
      var cellBg = isTarget ? '#e8f5e9' : '#fff';
      var cellBorder = isTarget ? '2px solid #2e7d32' : '1px solid #ccc';

      var facingStyle = '';
      var sittingStyle = '';
      if(starType === 'water' && facing === starNum && isTarget){
        facingStyle = 'color:#c62828;font-weight:bold;';
      }
      if(starType === 'mountain' && sitting === starNum && isTarget){
        sittingStyle = 'color:#c62828;font-weight:bold;';
      }

      cells[g] = '<td style="width:28px;height:28px;text-align:center;vertical-align:middle;'
         + 'background:'+cellBg+';border:'+cellBorder+';padding:1px;font-size:9px;line-height:1.1;">'
         + '<span style="'+sittingStyle+'">'+sitting+'</span>'
         + '<span style="color:#888;font-size:8px;">·'+base+'·</span>'
         + '<span style="'+facingStyle+'">'+facing+'</span>'
         + '</td>';
    }

    // 3×3 table (S at top): row0 = SE,S,SW ; row1 = E,C,W ; row2 = NE,N,NW
    return '<table style="border-collapse:collapse;margin:0 auto;">'
         + '<tr>' + cells[0] + cells[1] + cells[2] + '</tr>'
         + '<tr>' + cells[3] + cells[4] + cells[5] + '</tr>'
         + '<tr>' + cells[6] + cells[7] + cells[8] + '</tr>'
         + '</table>';
  }

  // ---------------------------------------------------------------
  // LOAD CHART — imposta i valori negli input FS e ridisegna il Luopan
  // ---------------------------------------------------------------
  function loadChart(period, deg){
    var hfInput = document.getElementById('fs-house-facing');
    var ppInput = document.getElementById('fs-period');
    if(hfInput) hfInput.value = deg;
    if(ppInput) ppInput.value = period;

    // La carta Flying Stars si disegna sul Luopan SOLO quando la
    // visualizzazione stelle (toggle ⭐) è attiva. Se è spenta, la accendiamo.
    var starsBtn = document.getElementById('fs-stars-toggle');
    if(starsBtn && /OFF/i.test(starsBtn.textContent) && typeof fsToggleStars === 'function'){
      fsToggleStars();          // accende le stelle E ridisegna
    } else if(typeof fsRedraw === 'function'){
      fsRedraw();               // già accese — ridisegna con i nuovi valori
    } else {
      // Fallback: lancia lo stesso evento a cui reagiscono gli input
      if(hfInput) hfInput.dispatchEvent(new Event('input'));
      if(ppInput) ppInput.dispatchEvent(new Event('input'));
    }

    // Scorre in alto verso il Luopan così la carta caricata è visibile
    var fsBlock = document.getElementById('fs-house-facing');
    if(fsBlock) fsBlock.scrollIntoView({behavior:'smooth', block:'center'});
  }

  // ---------------------------------------------------------------
  // API PUBBLICA
  // ---------------------------------------------------------------
  function open(){
    var area = document.getElementById('fs-results-area');
    if(!area){ alert('Feng Shui view not active. Open the Feng Shui mode first.'); return; }
    if(typeof FlyingStars === 'undefined'){ alert('flying-stars.js not loaded'); return; }
    buildPanel(area);
    var panel = document.getElementById('fscf-panel');
    if(panel) panel.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function close(){
    var panel = document.getElementById('fscf-panel');
    if(panel) panel.remove();
    var res = document.getElementById('fscf-results');
    if(res) res.remove();
  }

  window.FSChartFinder = {
    open:      open,
    close:     close,
    loadChart: loadChart
  };
})();

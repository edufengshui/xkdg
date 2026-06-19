// ============================================================
// fs-chart-finder.js
// Find all Flying Stars charts (Period + Facing) that satisfy a
// SET of Water/Mountain Star conditions (each star in its own
// palace). Optional Facing filter (pin one of the 24 mountains)
// and Period filter.
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
//   • app-fengshui.js   (fs-house-facing / fs-period inputs, fsToggleStars/fsRedraw)
//
// ============================================================

(function(){
  'use strict';

  // 24 montagne in ordine di indice (da fsMountainCharFromDeg)
  var MTN_CHAR = [
    '\u58EC','\u5B50','\u7678','\u4E11','\u826E','\u5BC5',
    '\u7532','\u536F','\u4E59','\u8FB0','\u5DFD','\u5DF3',
    '\u4E19','\u5348','\u4E01','\u672A','\u5764','\u7533',
    '\u5E9A','\u9149','\u8F9B','\u620C','\u4E7E','\u4EA5'
  ];
  var MTN_PINYIN = [
    'Ren','Zi','Gui','Chou','Gen','Yin',
    'Jia','Mao','Yi','Chen','Xun','Si',
    'Bing','Wu','Ding','Wei','Kun','Shen',
    'Geng','You','Xin','Xu','Qian','Hai'
  ];

  // Griglia FS (S in alto): indice -> etichetta palazzo
  var GRID_LABEL = {
    0:'SE \u5DFD', 1:'S \u96E2', 2:'SW \u5764',
    3:'E \u9707',  4:'Center \u4E2D', 5:'W \u514C',
    6:'NE \u826E', 7:'N \u574E', 8:'NW \u4E7E'
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
    return lo.toFixed(1) + '\u00B0\u2013' + hi.toFixed(1) + '\u00B0';
  }

  // ---------------------------------------------------------------
  // HELPER HTML (riusati nelle righe condizione)
  // ---------------------------------------------------------------
  var SEL_STYLE = 'padding:4px 6px;border:1px solid #1565c0;border-radius:4px;font-size:12px;';

  function starOptionsHtml(def){
    var s = '';
    for(var n = 1; n <= 9; n++){
      s += '<option value="'+n+'"'+(n===def?' selected':'')+'>Star '+n+'</option>';
    }
    return s;
  }
  function typeSelHtml(def){
    return '<select class="fscf-cond-type" style="'+SEL_STYLE+'">'
      + '<option value="water"'+(def==='water'?' selected':'')+'>\u5411\u661F Water</option>'
      + '<option value="mountain"'+(def==='mountain'?' selected':'')+'>\u5C71\u661F Mountain</option>'
      + '</select>';
  }
  function palaceSelHtml(def){
    var s = '<select class="fscf-cond-palace" style="'+SEL_STYLE+'">';
    for(var g = 0; g < 9; g++){
      s += '<option value="'+g+'"'+(g===def?' selected':'')+'>'+GRID_LABEL[g]+'</option>';
    }
    return s + '</select>';
  }

  // Una riga di condizione: [tipo] [stella] in [palazzo] [x]
  function condRowHtml(type, star, palace){
    return '<div class="fscf-cond" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;background:#fff;border:1px solid #bbdefb;border-radius:6px;padding:6px 8px;">'
      + typeSelHtml(type)
      + '<select class="fscf-cond-star" style="'+SEL_STYLE+'">' + starOptionsHtml(star) + '</select>'
      + '<span style="color:#555;font-weight:bold;">in</span>'
      + palaceSelHtml(palace)
      + '<button type="button" class="fscf-cond-del" title="Remove condition" '
      +   'style="margin-left:auto;background:#fff;color:#c62828;border:1px solid #ef9a9a;border-radius:5px;padding:3px 9px;font-size:12px;cursor:pointer;font-weight:bold;">\u2715</button>'
      + '</div>';
  }

  // ---------------------------------------------------------------
  // PANNELLO UI
  // ---------------------------------------------------------------
  function buildPanel(area){
    // Facing filter: All + 24 mountains
    var facingOptions = '<option value="all" selected>All facings (24)</option>';
    for(var i = 0; i < 24; i++){
      facingOptions += '<option value="'+i+'">'+MTN_CHAR[i]+' '+MTN_PINYIN[i]+' \u00B7 '+mtnDegRange(i)+'</option>';
    }

    var periodOptions = '<option value="all" selected>All Periods (1\u20139)</option>';
    for(var p = 1; p <= 9; p++){
      periodOptions += '<option value="'+p+'">Period '+p+' only</option>';
    }

    // Due condizioni iniziali (combinazione che produce risultati): Water 8 in SE, Water 3 in S.
    var initialConds = condRowHtml('water', 8, 0) + condRowHtml('water', 3, 1);

    var html =
      '<div id="fscf-panel" style="border:2px solid #1565c0;border-radius:8px;background:#e3f2fd;padding:12px;margin-top:10px;font-size:12px;color:#1a1008;">'
    +   '<div style="font-weight:bold;color:#1565c0;font-size:13px;margin-bottom:8px;">'
    +     '\uD83D\uDD0D Find Charts by Star Position'
    +     '<span onclick="FSChartFinder.close()" style="float:right;cursor:pointer;color:#666;font-weight:normal;">\u2715</span>'
    +   '</div>'

    +   '<div style="font-size:11px;color:#555;margin-bottom:10px;font-style:italic;">'
    +     'Find all Flying Stars charts (Period + Facing) where ALL the chosen Water/Mountain Star conditions hold \u2014 each star in its own palace. Optionally pin a Facing.'
    +   '</div>'

    // ---- CONDIZIONI (AND) ----
    +   '<div style="font-weight:bold;color:#0d47a1;margin-bottom:6px;">Conditions <span style="font-weight:normal;color:#777;">(all must match)</span></div>'
    +   '<div id="fscf-conditions">' + initialConds + '</div>'
    +   '<button id="fscf-add-btn" type="button" style="background:#fff;color:#1565c0;border:1.5px dashed #1565c0;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;margin-bottom:12px;">\u2795 Add condition</button>'

    // ---- FILTRI: Facing + Period ----
    +   '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:10px;padding-top:8px;border-top:1px solid #bbdefb;">'
    +     '<div style="display:flex;gap:4px;align-items:center;">'
    +       '<span style="font-weight:bold;color:#0d47a1;">Facing:</span>'
    +       '<select id="fscf-facing" style="'+SEL_STYLE+'max-width:220px;">' + facingOptions + '</select>'
    +     '</div>'
    +     '<div style="display:flex;gap:4px;align-items:center;">'
    +       '<span style="font-weight:bold;color:#0d47a1;">Period:</span>'
    +       '<select id="fscf-period" style="'+SEL_STYLE+'">' + periodOptions + '</select>'
    +     '</div>'
    +   '</div>'

    +   '<div style="margin-top:6px;padding-top:8px;border-top:1px solid #bbdefb;">'
    +     '<button id="fscf-search-btn" type="button" style="background:#1565c0;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:bold;cursor:pointer;">\uD83D\uDD0E SEARCH CHARTS</button>'
    +   '</div>'

    + '</div>'
    + '<div id="fscf-results" style="margin-top:8px;"></div>';

    area.innerHTML = html;

    document.getElementById('fscf-search-btn').onclick = runSearch;

    // Add condition
    document.getElementById('fscf-add-btn').onclick = function(){
      var box = document.getElementById('fscf-conditions');
      if(box) box.insertAdjacentHTML('beforeend', condRowHtml('water', 8, 0));
    };

    // Remove condition (event delegation)
    var condBox = document.getElementById('fscf-conditions');
    if(condBox){
      condBox.addEventListener('click', function(ev){
        var btn = ev.target;
        if(btn && btn.classList && btn.classList.contains('fscf-cond-del')){
          var row = btn.closest('.fscf-cond');
          if(row) row.remove();
        }
      });
    }
  }

  // ---------------------------------------------------------------
  // RICERCA
  // ---------------------------------------------------------------
  function runSearch(){
    var resultsBox = document.getElementById('fscf-results');
    if(!resultsBox) return;
    resultsBox.innerHTML = '<div style="padding:12px;color:#666;font-size:12px;text-align:center;">\u23F3 Searching\u2026</div>';

    if(typeof FlyingStars === 'undefined'){
      resultsBox.innerHTML = '<div style="color:#c62828;padding:10px;">\u26A0 flying-stars.js not loaded.</div>';
      return;
    }

    // Raccoglie le condizioni dalle righe
    var conds = [];
    var rows = document.querySelectorAll('#fscf-conditions .fscf-cond');
    for(var ri = 0; ri < rows.length; ri++){
      var r = rows[ri];
      var tEl = r.querySelector('.fscf-cond-type');
      var sEl = r.querySelector('.fscf-cond-star');
      var gEl = r.querySelector('.fscf-cond-palace');
      if(!tEl || !sEl || !gEl) continue;
      conds.push({
        type:   tEl.value,                       // 'water' | 'mountain'
        star:   parseInt(sEl.value, 10),         // 1-9
        palace: parseInt(gEl.value, 10)          // 0-8
      });
    }

    var facingFilter = document.getElementById('fscf-facing').value; // 'all' or '0'-'23'
    var periodFilter = document.getElementById('fscf-period').value; // 'all' or '1'-'9'

    setTimeout(function(){
      var periods = [];
      if(periodFilter === 'all'){ for(var p = 1; p <= 9; p++) periods.push(p); }
      else { periods.push(parseInt(periodFilter, 10)); }

      var mtns = [];
      if(facingFilter === 'all'){ for(var k = 0; k < 24; k++) mtns.push(k); }
      else { mtns.push(parseInt(facingFilter, 10)); }

      var matches = [];

      for(var pi = 0; pi < periods.length; pi++){
        var period = periods[pi];

        for(var mj = 0; mj < mtns.length; mj++){
          var mi = mtns[mj];
          var mtnChar = MTN_CHAR[mi];
          var chart;
          try { chart = FlyingStars.calculate(period, mtnChar); }
          catch(e){ continue; }
          if(!chart) continue;

          // Tutte le condizioni devono valere (ciascuna nel proprio palazzo)
          var ok = true;
          for(var ci = 0; ci < conds.length; ci++){
            var c = conds[ci];
            var arr = (c.type === 'water') ? chart.facingStars : chart.sittingStars;
            if(!arr || arr[c.palace] !== c.star){ ok = false; break; }
          }
          if(!ok) continue;

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

      renderResults(resultsBox, matches, conds, facingFilter, periodFilter);
    }, 20);
  }

  // ---------------------------------------------------------------
  // RENDER RISULTATI
  // ---------------------------------------------------------------
  function condLabel(c){
    var t = (c.type === 'water') ? '\u5411\u661F Water' : '\u5C71\u661F Mountain';
    return t + ' ' + c.star + ' in ' + GRID_LABEL[c.palace];
  }

  function facingLabel(facingFilter){
    if(facingFilter === 'all') return 'All facings';
    var i = parseInt(facingFilter, 10);
    return MTN_CHAR[i] + ' ' + MTN_PINYIN[i] + ' (' + mtnDegRange(i) + ')';
  }

  function renderResults(box, matches, conds, facingFilter, periodFilter){
    // Mappa palazzo -> {water:bool, mountain:bool} per evidenziare la mini-griglia
    var hl = {};
    for(var ci = 0; ci < conds.length; ci++){
      var c = conds[ci];
      if(!hl[c.palace]) hl[c.palace] = {};
      hl[c.palace][c.type] = true;
    }

    // Riepilogo condizioni
    var condTxt = conds.length
      ? conds.map(condLabel).join('  AND  ')
      : '(no star condition \u2014 every chart for the filters)';
    var periodTxt = (periodFilter === 'all') ? 'All periods' : ('Period ' + periodFilter);

    if(matches.length === 0){
      box.innerHTML =
        '<div style="padding:16px;background:#fafafa;border:1px dashed #ccc;border-radius:6px;color:#888;font-size:14px;text-align:center;">'
      +   'No charts match: <b style="color:#555;">' + condTxt + '</b>'
      +   '<div style="font-size:12px;margin-top:4px;">Facing: ' + facingLabel(facingFilter) + ' \u00B7 ' + periodTxt + '</div>'
      + '</div>';
      return;
    }

    var html =
      '<div style="font-weight:bold;color:#1565c0;font-size:16px;margin:10px 0 4px;">'
    +   '\uD83D\uDD0D ' + matches.length + ' chart' + (matches.length > 1 ? 's' : '') + ' found'
    + '</div>'
    + '<div style="font-size:13px;color:#666;margin-bottom:4px;">' + condTxt + '</div>'
    + '<div style="font-size:12px;color:#888;margin-bottom:10px;">Facing: ' + facingLabel(facingFilter) + ' \u00B7 ' + periodTxt + '</div>';

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
      var miniGrid = buildMiniGrid(m.chart, hl);
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

  // Mini griglia 3x3 con sitting.base.facing per ogni cella.
  // hl: { palaceIdx: {water:true?, mountain:true?} } -> celle da evidenziare.
  function buildMiniGrid(chart, hl){
    var cells = [];
    // Griglia FS: 0=SE, 1=S, 2=SW, 3=E, 4=C, 5=W, 6=NE, 7=N, 8=NW
    for(var g = 0; g < 9; g++){
      var base    = chart.baseStars[g];
      var sitting = chart.sittingStars[g];
      var facing  = chart.facingStars[g];
      var cell    = hl[g];
      var isTarget = !!cell;
      var cellBg = isTarget ? '#e8f5e9' : '#fff';
      var cellBorder = isTarget ? '2px solid #2e7d32' : '1px solid #ccc';

      var sittingStyle = (cell && cell.mountain) ? 'color:#c62828;font-weight:bold;' : '';
      var facingStyle  = (cell && cell.water)    ? 'color:#c62828;font-weight:bold;' : '';

      cells[g] = '<td style="width:28px;height:28px;text-align:center;vertical-align:middle;'
         + 'background:'+cellBg+';border:'+cellBorder+';padding:1px;font-size:9px;line-height:1.1;">'
         + '<span style="'+sittingStyle+'">'+sitting+'</span>'
         + '<span style="color:#888;font-size:8px;">\u00B7'+base+'\u00B7</span>'
         + '<span style="'+facingStyle+'">'+facing+'</span>'
         + '</td>';
    }

    // 3x3 table (S at top): row0 = SE,S,SW ; row1 = E,C,W ; row2 = NE,N,NW
    return '<table style="border-collapse:collapse;margin:0 auto;">'
         + '<tr>' + cells[0] + cells[1] + cells[2] + '</tr>'
         + '<tr>' + cells[3] + cells[4] + cells[5] + '</tr>'
         + '<tr>' + cells[6] + cells[7] + cells[8] + '</tr>'
         + '</table>';
  }

  // ---------------------------------------------------------------
  // LOAD CHART -> imposta i valori negli input FS e ridisegna il Luopan
  // ---------------------------------------------------------------
  function loadChart(period, deg){
    var hfInput = document.getElementById('fs-house-facing');
    var ppInput = document.getElementById('fs-period');
    if(hfInput) hfInput.value = deg;
    if(ppInput) ppInput.value = period;

    // Se le stelle FS sono spente, le accendiamo (fsToggleStars le accende
    // E ridisegna). Se sono gia accese, ridisegniamo solo con fsRedraw().
    try {
      if(!FS_STARS_ON && typeof fsToggleStars === 'function'){
        fsToggleStars();   // accende le stelle E ridisegna
      } else if(typeof fsRedraw === 'function'){
        fsRedraw();        // gia accese -> ridisegna con i nuovi valori
      }
    } catch(e){
      if(typeof fsRedraw === 'function') fsRedraw();
    }

    // Scorre al canvas del luopan
    var canvasWrap = document.getElementById('fs-canvas-wrap');
    if(canvasWrap) canvasWrap.scrollIntoView({behavior:'smooth', block:'start'});
  }

  // ---------------------------------------------------------------
  // API PUBBLICA
  // ---------------------------------------------------------------
  function open(){
    var area = document.getElementById('fs-results-area');
    if(!area){ alert('Feng Shui view not active. Open the Feng Shui mode first.'); return; }
    if(typeof FlyingStars === 'undefined'){ alert('flying-stars.js not loaded'); return; }

    // First try inline (original behaviour).
    buildPanel(area);
    var panel = document.getElementById('fscf-panel');

    // If the inline host is hidden by the current FS layout/section state, the
    // panel exists but isn't visible (offsetParent === null). In that case rebuild
    // it as a floating overlay on <body> so it's always shown.
    if(panel && panel.offsetParent === null){
      close();                                   // remove the hidden inline panel + results
      var host = document.createElement('div');
      host.id = 'fscf-float-host';
      host.style.cssText = 'position:fixed;z-index:99999;left:50%;top:50%;transform:translate(-50%,-50%);'
        + 'width:min(520px,94vw);max-height:88vh;overflow:auto;background:#e3f2fd;border-radius:10px;'
        + 'box-shadow:0 12px 48px rgba(0,0,0,.35);';
      document.body.appendChild(host);
      buildPanel(host);                          // panel + results now live in the visible host
      panel = document.getElementById('fscf-panel');
    }

    try { if(panel) panel.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e){}
  }

  function close(){
    var panel = document.getElementById('fscf-panel');
    if(panel) panel.remove();
    var res = document.getElementById('fscf-results');
    if(res) res.remove();
    var host = document.getElementById('fscf-float-host');
    if(host) host.remove();
  }

  window.FSChartFinder = {
    open:      open,
    close:     close,
    loadChart: loadChart
  };
})();

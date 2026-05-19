/**
 * QMDJ Water Activation Scanner
 * Browser module — self-contained UI + logic
 * Pattern: window.QMDJWaterScanner.mount(root) / .unmount()
 * 
 * Dependencies:
 *   - lunar-javascript (already loaded from CDN in the app)
 *   - qmdj-1080-criteria.json (fetched on first use)
 * 
 * Build: 2026-05-18-water-scanner-v1
 */
(function(){
  'use strict';

  // ============================================================
  // STATE
  // ============================================================
  let _root = null;
  let _criteria = null; // loaded lazily
  let _mounted = false;

  // ============================================================
  // CONSTANTS
  // ============================================================
  const STEM_SEQ = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
  const BR_SEQ   = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  const STEM_HAN = {Jia:'甲',Yi:'乙',Bing:'丙',Ding:'丁',Wu:'戊',Ji:'己',Geng:'庚',Xin:'辛',Ren:'壬',Gui:'癸'};
  const BR_HAN   = {Zi:'子',Chou:'丑',Yin:'寅',Mao:'卯',Chen:'辰',Si:'巳',Wu:'午',Wei:'未',Shen:'申',You:'酉',Xu:'戌',Hai:'亥'};
  const STEM_H2P = {'甲':'Jia','乙':'Yi','丙':'Bing','丁':'Ding','戊':'Wu','己':'Ji','庚':'Geng','辛':'Xin','壬':'Ren','癸':'Gui'};
  const BR_H2P   = {'子':'Zi','丑':'Chou','寅':'Yin','卯':'Mao','辰':'Chen','巳':'Si','午':'Wu','未':'Wei','申':'Shen','酉':'You','戌':'Xu','亥':'Hai'};

  const DIR_TO_PALACE = { N:1, NE:8, E:3, SE:4, S:9, SW:2, W:7, NW:6 };
  const PALACE_TO_DIR = { 1:'N', 2:'SW', 3:'E', 4:'SE', 5:'Center', 6:'NW', 7:'W', 8:'NE', 9:'S' };
  const PALACE_NAME   = { 1:'Kan 坎', 2:'Kun 坤', 3:'Zhen 震', 4:'Xun 巽', 5:'Center 中', 6:'Qian 乾', 7:'Dui 兌', 8:'Gen 艮', 9:'Li 離' };

  const HOUR_TIMES = {
    Zi:'23–01', Chou:'01–03', Yin:'03–05', Mao:'05–07',
    Chen:'07–09', Si:'09–11', Wu:'11–13', Wei:'13–15',
    Shen:'15–17', You:'17–19', Xu:'19–21', Hai:'21–23'
  };
  const WEEKDAYS_IT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

  // Jie Qi
  const JQ_CN2PY = {
    '冬至':'Dong Zhi','小寒':'Xiao Han','大寒':'Da Han',
    '立春':'Li Chun','雨水':'Yu Shui','惊蛰':'Jing Zhe',
    '春分':'Chun Fen','清明':'Qing Ming','谷雨':'Gu Yu',
    '立夏':'Li Xia','小满':'Xiao Man','芒种':'Mang Zhong',
    '夏至':'Xia Zhi','小暑':'Xiao Shu','大暑':'Da Shu',
    '立秋':'Li Qiu','处暑':'Chu Shu','白露':'Bai Lu',
    '秋分':'Qiu Fen','寒露':'Han Lu','霜降':'Shuang Jiang',
    '立冬':'Li Dong','小雪':'Xiao Xue','大雪':'Da Xue'
  };
  const YANG_TERMS = new Set([
    'Dong Zhi','Xiao Han','Da Han','Li Chun','Yu Shui','Jing Zhe',
    'Chun Fen','Qing Ming','Gu Yu','Li Xia','Xiao Man','Mang Zhong'
  ]);
  const YUAN_BY_BR = {
    Zi:'U',Wu:'U',Mao:'U',You:'U',
    Yin:'M',Shen:'M',Si:'M',Hai:'M',
    Chen:'L',Wei:'L',Xu:'L',Chou:'L'
  };
  const JU_TABLE = {
    'Dong Zhi':{U:1,M:7,L:4},'Xiao Han':{U:2,M:8,L:5},'Da Han':{U:3,M:9,L:6},
    'Li Chun':{U:8,M:5,L:2},'Yu Shui':{U:9,M:6,L:3},'Jing Zhe':{U:1,M:7,L:4},
    'Chun Fen':{U:3,M:9,L:6},'Qing Ming':{U:4,M:1,L:7},'Gu Yu':{U:5,M:2,L:8},
    'Li Xia':{U:4,M:1,L:7},'Xiao Man':{U:5,M:2,L:8},'Mang Zhong':{U:6,M:3,L:9},
    'Xia Zhi':{U:9,M:3,L:6},'Xiao Shu':{U:8,M:2,L:5},'Da Shu':{U:7,M:1,L:4},
    'Li Qiu':{U:2,M:5,L:8},'Chu Shu':{U:1,M:4,L:7},'Bai Lu':{U:9,M:3,L:6},
    'Qiu Fen':{U:7,M:1,L:4},'Han Lu':{U:6,M:9,L:3},'Shuang Jiang':{U:5,M:8,L:2},
    'Li Dong':{U:6,M:9,L:3},'Xiao Xue':{U:5,M:8,L:2},'Da Xue':{U:4,M:7,L:1}
  };

  const DOOR_LABELS  = { Kai:'Open 開', Xiu:'Rest 休', Sheng:'Birth 生', JingS:'View 景' };
  const QI_LABELS    = { Yi:'乙 Yi', Bing:'丙 Bing', Ding:'丁 Ding' };
  const COMBO_LABELS = {
    BsW:'丙↑戊 Bing above Wu', WsB:'戊↑丙 Wu above Bing',
    QZF:'San Qi + Zhi Fu', QZS:'San Qi + Zhi Shi',
    DdZS:'丁 Di Pan + Zhi Shi', Yi3:'乙 Yi in Zhen 震',
    Bi94:'丙 Bing in Li/Xun', Di79:'丁 Ding in Dui/Li'
  };

  // ============================================================
  // UTILITY
  // ============================================================
  function jiaZiIdx(stem, branch){
    for(var i = 0; i < 60; i++){
      if(STEM_SEQ[i % 10] === stem && BR_SEQ[i % 12] === branch) return i;
    }
    return -1;
  }

  // ============================================================
  // DATE CALCULATION (uses global Solar/Lunar from lunar-javascript CDN)
  // ============================================================
  function getDunJuForDate(year, month, day){
    var solar = Solar.fromYmd(year, month, day);
    var lunar = solar.getLunar();
    var bazi  = lunar.getEightChar();

    // Jie Qi → Dun
    var pjq   = lunar.getPrevJieQi();
    var jqPy  = JQ_CN2PY[pjq.getName()];
    if(!jqPy) return null; // safety
    var dun   = YANG_TERMS.has(jqPy) ? 'yang' : 'yin';

    // Day pillar → Fu Tou → Yuan
    var dayStem   = STEM_H2P[bazi.getDayGan()];
    var dayBranch = BR_H2P[bazi.getDayZhi()];
    var dayIdx    = jiaZiIdx(dayStem, dayBranch);
    var xunBlock  = Math.floor(dayIdx / 10);
    var xunStart  = xunBlock * 10;
    var offset    = dayIdx - xunStart;
    var leadIdx   = (offset <= 4) ? xunStart : (xunStart + 5);
    var fuBranch  = BR_SEQ[leadIdx % 12];
    var yuan      = YUAN_BY_BR[fuBranch];

    // Ju
    var ju = JU_TABLE[jqPy][yuan];

    return { dun:dun, ju:ju, jqPy:jqPy, yuan:yuan, dayStem:dayStem, dayBranch:dayBranch };
  }

  function getHourPillarsForDay(dayStem){
    var dayStemIdx = STEM_SEQ.indexOf(dayStem);
    var ziStemIdx  = (dayStemIdx % 5) * 2;
    var hours = [];
    for(var brIdx = 0; brIdx < 12; brIdx++){
      var stemIdx = (ziStemIdx + brIdx) % 10;
      var stem    = STEM_SEQ[stemIdx];
      var branch  = BR_SEQ[brIdx];
      hours.push({ stem:stem, branch:branch, idx60:jiaZiIdx(stem, branch), time:HOUR_TIMES[branch] });
    }
    return hours;
  }

  // ============================================================
  // CRITERIA SCORING
  // ============================================================
  function scorePalace(cr, targetPalace){
    var hits = [];

    // Favorable doors
    if(cr.d){
      for(var dk in cr.d){
        if(cr.d[dk] === targetPalace && DOOR_LABELS[dk]){
          hits.push({ cat:'door', label:DOOR_LABELS[dk], icon:'🚪' });
        }
      }
    }

    // San Qi on Tian Pan
    if(cr.q){
      for(var qi in cr.q){
        if(cr.q[qi] && cr.q[qi].indexOf(targetPalace) !== -1 && QI_LABELS[qi]){
          hits.push({ cat:'qi', label:QI_LABELS[qi], icon:'✦' });
        }
      }
    }

    // Zhi Fu at target palace
    if(cr.zf === targetPalace) hits.push({ cat:'zhi', label:'Zhi Fu 直符', icon:'⭐' });
    // Zhi Shi at target palace
    if(cr.zs === targetPalace) hits.push({ cat:'zhi', label:'Zhi Shi 直使', icon:'⭐' });

    // Combos
    if(cr.x){
      for(var i = 0; i < cr.x.length; i++){
        if(cr.x[i][1] === targetPalace && COMBO_LABELS[cr.x[i][0]]){
          hits.push({ cat:'combo', label:COMBO_LABELS[cr.x[i][0]], icon:'🔥' });
        }
      }
    }

    return hits;
  }

  // ============================================================
  // MAIN SCANNER
  // ============================================================
  function scanDates(targetDir, startDateStr, numDays){
    var targetPalace = DIR_TO_PALACE[targetDir];
    if(!targetPalace) return [];

    var results = [];
    var startParts = startDateStr.split('-');
    var startDate  = new Date(+startParts[0], +startParts[1] - 1, +startParts[2]);

    for(var d = 0; d < numDays; d++){
      var date = new Date(startDate.getTime() + d * 86400000);
      var Y = date.getFullYear(), M = date.getMonth() + 1, D = date.getDate();

      var info = getDunJuForDate(Y, M, D);
      if(!info) continue;

      var hourPillars = getHourPillarsForDay(info.dayStem);

      for(var h = 0; h < hourPillars.length; h++){
        var hp = hourPillars[h];
        var cr = _criteria[info.dun][info.ju][hp.idx60];
        if(!cr) continue;

        var hits = scorePalace(cr, targetPalace);
        if(hits.length > 0){
          results.push({
            date: Y + '-' + String(M).padStart(2,'0') + '-' + String(D).padStart(2,'0'),
            weekday: WEEKDAYS_IT[date.getDay()],
            hourHan: STEM_HAN[hp.stem] + BR_HAN[hp.branch],
            hourPin: hp.stem + '-' + hp.branch,
            hourTime: hp.time,
            dun: info.dun,
            ju: info.ju,
            jieQi: info.jqPy,
            score: hits.length,
            hits: hits
          });
        }
      }
    }

    // Sort by date then by score descending
    results.sort(function(a, b){
      if(a.date !== b.date) return a.date < b.date ? -1 : 1;
      return b.score - a.score;
    });

    return results;
  }

  // ============================================================
  // UI
  // ============================================================
  function buildUI(root){
    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
      String(today.getMonth()+1).padStart(2,'0') + '-' +
      String(today.getDate()).padStart(2,'0');

    root.innerHTML = ''
      + '<style>'
      + '#qmdj-ws-panel { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }'
      + '#qmdj-ws-panel .ws-card { background:#fff; border:1px solid #e0e0e0; border-radius:12px; padding:16px; margin-bottom:16px; }'
      + '#qmdj-ws-panel .ws-title { font-size:18px; font-weight:600; margin:0 0 4px; color:#1a1a1a; }'
      + '#qmdj-ws-panel .ws-subtitle { font-size:13px; color:#666; margin:0 0 16px; }'
      + '#qmdj-ws-panel .ws-row { display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; }'
      + '#qmdj-ws-panel .ws-field { flex:1; min-width:120px; }'
      + '#qmdj-ws-panel .ws-label { display:block; font-size:12px; color:#666; margin-bottom:4px; font-weight:500; }'
      + '#qmdj-ws-panel .ws-select, #qmdj-ws-panel .ws-input { width:100%; padding:10px 12px; border:1px solid #d0d0d0; border-radius:8px; font-size:15px; background:#fafafa; -webkit-appearance:none; }'
      + '#qmdj-ws-panel .ws-select:focus, #qmdj-ws-panel .ws-input:focus { border-color:#2d6e54; outline:none; box-shadow:0 0 0 3px rgba(45,110,84,0.15); }'
      + '#qmdj-ws-panel .ws-btn { display:block; width:100%; padding:12px; background:#2d6e54; color:#fff; border:none; border-radius:10px; font-size:16px; font-weight:600; cursor:pointer; margin-top:8px; }'
      + '#qmdj-ws-panel .ws-btn:active { background:#245a45; }'
      + '#qmdj-ws-panel .ws-btn:disabled { background:#aaa; cursor:wait; }'
      + '#qmdj-ws-panel .ws-status { text-align:center; padding:20px; color:#888; font-size:14px; }'
      + '#qmdj-ws-panel .ws-result-card { background:#fff; border:1px solid #e8e8e8; border-radius:10px; padding:12px 14px; margin-bottom:8px; }'
      + '#qmdj-ws-panel .ws-result-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }'
      + '#qmdj-ws-panel .ws-result-date { font-size:15px; font-weight:600; color:#1a1a1a; }'
      + '#qmdj-ws-panel .ws-result-hour { font-size:14px; color:#333; }'
      + '#qmdj-ws-panel .ws-result-score { font-size:14px; color:#2d6e54; font-weight:600; }'
      + '#qmdj-ws-panel .ws-result-meta { font-size:12px; color:#888; margin-bottom:6px; }'
      + '#qmdj-ws-panel .ws-result-hits { display:flex; flex-wrap:wrap; gap:6px; }'
      + '#qmdj-ws-panel .ws-tag { font-size:12px; padding:3px 8px; border-radius:6px; }'
      + '#qmdj-ws-panel .ws-tag-door  { background:#e8f5e9; color:#2e7d32; }'
      + '#qmdj-ws-panel .ws-tag-qi    { background:#e3f2fd; color:#1565c0; }'
      + '#qmdj-ws-panel .ws-tag-zhi   { background:#fff3e0; color:#e65100; }'
      + '#qmdj-ws-panel .ws-tag-combo { background:#fce4ec; color:#c62828; }'
      + '#qmdj-ws-panel .ws-day-header { font-size:14px; font-weight:600; color:#333; margin:16px 0 8px; padding-bottom:4px; border-bottom:1px solid #eee; }'
      + '#qmdj-ws-panel .ws-summary { font-size:13px; color:#666; margin-top:12px; padding:12px; background:#f8f8f8; border-radius:8px; }'
      + '</style>'
      + '<div id="qmdj-ws-panel">'
      +   '<div class="ws-card">'
      +     '<p class="ws-title">💧 QMDJ Water Activation</p>'
      +     '<p class="ws-subtitle">Trova le ore favorevoli per attivare l\'acqua in una specifica direzione</p>'
      +     '<div class="ws-row">'
      +       '<div class="ws-field">'
      +         '<span class="ws-label">Direzione acqua / fontana</span>'
      +         '<select id="qmdj-ws-dir" class="ws-select">'
      +           '<option value="N">N — Kan 坎</option>'
      +           '<option value="NE">NE — Gen 艮</option>'
      +           '<option value="E">E — Zhen 震</option>'
      +           '<option value="SE" selected>SE — Xun 巽</option>'
      +           '<option value="S">S — Li 離</option>'
      +           '<option value="SW">SW — Kun 坤</option>'
      +           '<option value="W">W — Dui 兌</option>'
      +           '<option value="NW">NW — Qian 乾</option>'
      +         '</select>'
      +       '</div>'
      +     '</div>'
      +     '<div class="ws-row">'
      +       '<div class="ws-field">'
      +         '<span class="ws-label">Data inizio</span>'
      +         '<input type="date" id="qmdj-ws-start" class="ws-input" value="' + todayStr + '">'
      +       '</div>'
      +       '<div class="ws-field">'
      +         '<span class="ws-label">Giorni da cercare</span>'
      +         '<select id="qmdj-ws-days" class="ws-select">'
      +           '<option value="7">7 giorni</option>'
      +           '<option value="14">14 giorni</option>'
      +           '<option value="30" selected>30 giorni</option>'
      +           '<option value="60">60 giorni</option>'
      +           '<option value="90">90 giorni</option>'
      +         '</select>'
      +       '</div>'
      +     '</div>'
      +     '<button id="qmdj-ws-scan" class="ws-btn">🔍 Cerca ore favorevoli</button>'
      +   '</div>'
      +   '<div id="qmdj-ws-results"></div>'
      + '</div>';

    // Bind scan button
    var scanBtn = root.querySelector('#qmdj-ws-scan');
    scanBtn.addEventListener('click', handleScan);
  }

  function handleScan(){
    var panel = _root.querySelector('#qmdj-ws-panel');
    var btn   = panel.querySelector('#qmdj-ws-scan');
    var out   = panel.querySelector('#qmdj-ws-results');

    var dir   = panel.querySelector('#qmdj-ws-dir').value;
    var start = panel.querySelector('#qmdj-ws-start').value;
    var days  = parseInt(panel.querySelector('#qmdj-ws-days').value, 10);

    if(!start){
      out.innerHTML = '<div class="ws-status">Seleziona una data di inizio</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Calcolo in corso...';
    out.innerHTML = '<div class="ws-status">Analizzando ' + days + ' giorni × 12 ore = ' + (days * 12) + ' carte QMDJ...</div>';

    // Run async to allow UI update
    setTimeout(function(){
      try {
        var results = scanDates(dir, start, days);
        renderResults(results, dir, start, days, out);
      } catch(e) {
        out.innerHTML = '<div class="ws-status" style="color:#c62828;">Errore: ' + (e.message || e) + '</div>';
      }
      btn.disabled = false;
      btn.textContent = '🔍 Cerca ore favorevoli';
    }, 50);
  }

  function renderResults(results, dir, startStr, days, container){
    var palace   = DIR_TO_PALACE[dir];
    var palLabel = PALACE_NAME[palace] || palace;

    if(results.length === 0){
      container.innerHTML = '<div class="ws-status">Nessuna ora favorevole trovata per ' + dir + ' (' + palLabel + ') in questo periodo.</div>';
      return;
    }

    // Group by date
    var byDate = {};
    var dateOrder = [];
    for(var i = 0; i < results.length; i++){
      var r = results[i];
      if(!byDate[r.date]){
        byDate[r.date] = [];
        dateOrder.push(r.date);
      }
      byDate[r.date].push(r);
    }

    // Count best scores
    var total   = results.length;
    var best5   = results.filter(function(r){ return r.score >= 5; }).length;
    var best4   = results.filter(function(r){ return r.score >= 4; }).length;
    var best3   = results.filter(function(r){ return r.score >= 3; }).length;

    var html = ''
      + '<div class="ws-summary">'
      + '<strong>' + dir + ' — ' + palLabel + ' (palazzo ' + palace + ')</strong><br>'
      + 'Periodo: ' + startStr + ' → ' + days + ' giorni<br>'
      + 'Totale ore favorevoli: <strong>' + total + '</strong>'
      + (best5 > 0 ? ' &nbsp;|&nbsp; ★★★★★: ' + best5 : '')
      + (best4 > 0 ? ' &nbsp;|&nbsp; ★★★★+: ' + best4 : '')
      + (best3 > 0 ? ' &nbsp;|&nbsp; ★★★+: ' + best3 : '')
      + '</div>';

    for(var di = 0; di < dateOrder.length; di++){
      var date = dateOrder[di];
      var dayResults = byDate[date];
      // Sort by score desc within day
      dayResults.sort(function(a,b){ return b.score - a.score; });

      var weekday = dayResults[0].weekday;
      var dun     = dayResults[0].dun;
      var ju      = dayResults[0].ju;
      var jieQi   = dayResults[0].jieQi;
      var dunLabel = dun === 'yang' ? 'Yang' : 'Yin';

      html += '<div class="ws-day-header">'
        + date + ' ' + weekday
        + ' &nbsp;•&nbsp; ' + dunLabel + ' Ju ' + ju
        + ' &nbsp;•&nbsp; ' + jieQi
        + ' &nbsp;(' + dayResults.length + ' ore)'
        + '</div>';

      for(var ri = 0; ri < dayResults.length; ri++){
        var r = dayResults[ri];
        var stars = '';
        for(var s = 0; s < Math.min(r.score, 5); s++) stars += '★';

        var tagsHtml = '';
        for(var hi = 0; hi < r.hits.length; hi++){
          var h = r.hits[hi];
          tagsHtml += '<span class="ws-tag ws-tag-' + h.cat + '">' + h.icon + ' ' + h.label + '</span>';
        }

        html += '<div class="ws-result-card">'
          + '<div class="ws-result-top">'
          +   '<span class="ws-result-hour">' + r.hourHan + ' <span style="color:#888;">(' + r.hourTime + ')</span></span>'
          +   '<span class="ws-result-score">' + stars + ' (' + r.score + ')</span>'
          + '</div>'
          + '<div class="ws-result-hits">' + tagsHtml + '</div>'
          + '</div>';
      }
    }

    container.innerHTML = html;
  }

  // ============================================================
  // LOAD CRITERIA
  // ============================================================
  function loadCriteria(){
    return new Promise(function(resolve, reject){
      if(_criteria){
        resolve(_criteria);
        return;
      }
      // Try relative path first (same directory as HTML)
      fetch('./qmdj-1080-criteria.json')
        .then(function(resp){
          if(!resp.ok) throw new Error('HTTP ' + resp.status);
          return resp.json();
        })
        .then(function(data){
          _criteria = data;
          resolve(data);
        })
        .catch(function(err){
          reject(new Error('Cannot load qmdj-1080-criteria.json: ' + err.message));
        });
    });
  }

  // ============================================================
  // MOUNT / UNMOUNT
  // ============================================================
  function mount(root){
    if(_mounted) unmount();
    _root = root;
    _root.innerHTML = '<div id="qmdj-ws-panel"><div class="ws-status" style="padding:20px;text-align:center;color:#888;">Caricamento dati QMDJ (126 KB)...</div></div>';

    // Check lunar-javascript is available
    if(typeof Solar === 'undefined' || typeof Lunar === 'undefined'){
      _root.innerHTML = '<div style="padding:20px;color:#c62828;">Errore: lunar-javascript non trovato. Assicurati che sia caricato dal CDN prima di questo script.</div>';
      return false;
    }

    loadCriteria()
      .then(function(){
        buildUI(_root);
        _mounted = true;
      })
      .catch(function(err){
        _root.innerHTML = '<div style="padding:20px;color:#c62828;">' + err.message + '</div>';
      });

    return true;
  }

  function unmount(){
    if(_root) _root.innerHTML = '';
    _mounted = false;
    _root = null;
  }

  // ============================================================
  // EXPOSE
  // ============================================================
  window.QMDJWaterScanner = {
    mount: mount,
    unmount: unmount,
    // Expose scanner function for programmatic use
    scanDates: function(dir, startStr, days){
      if(!_criteria) throw new Error('Criteria not loaded. Call mount() first.');
      return scanDates(dir, startStr, days);
    }
  };

})();

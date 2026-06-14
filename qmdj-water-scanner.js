/**
 * QMDJ Water Activation Scanner v5
 * Browser module — self-contained UI + logic + embedded full chart data
 * Pattern: window.QMDJWaterScanner.mount(root) / .unmount()
 * 
 * Requires lunar-javascript loaded globally (Solar, Lunar)
 * Build: 2026-05-18-water-scanner-v5-graphical-quadrant
 */
(function(){
  'use strict';

  let _root = null;
  let _charts = null;
  let _mounted = false;

  const STEM_SEQ = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
  const BR_SEQ   = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  const STEM_HAN = {Jia:'甲',Yi:'乙',Bing:'丙',Ding:'丁',Wu:'戊',Ji:'己',Geng:'庚',Xin:'辛',Ren:'壬',Gui:'癸'};
  const BR_HAN   = {Zi:'子',Chou:'丑',Yin:'寅',Mao:'卯',Chen:'辰',Si:'巳',Wu:'午',Wei:'未',Shen:'申',You:'酉',Xu:'戌',Hai:'亥'};
  const STEM_H2P = {'甲':'Jia','乙':'Yi','丙':'Bing','丁':'Ding','戊':'Wu','己':'Ji','庚':'Geng','辛':'Xin','壬':'Ren','癸':'Gui'};
  const BR_H2P   = {'子':'Zi','丑':'Chou','寅':'Yin','卯':'Mao','辰':'Chen','巳':'Si','午':'Wu','未':'Wei','申':'Shen','酉':'You','戌':'Xu','亥':'Hai'};

  const DIR_TO_PALACE = { N:1, NE:8, E:3, SE:4, S:9, SW:2, W:7, NW:6 };
  const PALACE_NAME   = { 1:'Kan 坎', 2:'Kun 坤', 3:'Zhen 震', 4:'Xun 巽', 5:'Center 中', 6:'Qian 乾', 7:'Dui 兌', 8:'Gen 艮', 9:'Li 離' };

  // Branch positioning per palace, matching the user's chart layout (S-at-top)
  const PALACE_QUAD = {
    1: { dir:'N',  trigram:'☵', topBr:'',  leftBr:'',  rightBr:'',  bottomBr:'子' },
    2: { dir:'SW', trigram:'☷', topBr:'未', leftBr:'',  rightBr:'申', bottomBr:'' },
    3: { dir:'E',  trigram:'☳', topBr:'',  leftBr:'卯', rightBr:'',  bottomBr:'' },
    4: { dir:'SE', trigram:'☴', topBr:'巳', leftBr:'辰', rightBr:'',  bottomBr:'' },
    6: { dir:'NW', trigram:'☰', topBr:'',  leftBr:'',  rightBr:'戌', bottomBr:'亥' },
    7: { dir:'W',  trigram:'☱', topBr:'',  leftBr:'',  rightBr:'酉', bottomBr:'' },
    8: { dir:'NE', trigram:'☶', topBr:'',  leftBr:'寅', rightBr:'',  bottomBr:'丑' },
    9: { dir:'S',  trigram:'☲', topBr:'午', leftBr:'',  rightBr:'',  bottomBr:'' }
  };

  const HOUR_TIMES = {
    Zi:'23–01', Chou:'01–03', Yin:'03–05', Mao:'05–07',
    Chen:'07–09', Si:'09–11', Wu:'11–13', Wei:'13–15',
    Shen:'15–17', You:'17–19', Xu:'19–21', Hai:'21–23'
  };
  const WEEKDAYS_IT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

  const STAR_NAME = {Peng:'Grass',Rui:'Rice',Chong:'Aggressor',Fu:'Assistant',Qin:'Fowl',Xin:'Heart',Zhu:'Pillar',Ren:'Official',Ying:'Hero'};
  const DOOR_NAME = {Kai:'Open',Xiu:'Rest',Sheng:'Birth',Shang:'Injury',Du:'Delusion',JingS:'View',Si:'Death',JingF:'Shocking'};

  const JQ_CN2PY = {
    '冬至':'Dong Zhi','小寒':'Xiao Han','大寒':'Da Han',
    '立春':'Li Chun','雨水':'Yu Shui','惊蛰':'Jing Zhe',
    '春分':'Chun Fen','清明':'Qing Ming','谷雨':'Gu Yu',
    '立夏':'Li Xia','小满':'Xiao Man','芒种':'Mang Zhong',
    '夏至':'Xia Zhi','小暑':'Xiao Shu','大暑':'Da Shu',
    '立秋':'Li Qiu','处暑':'Chu Shu','白露':'Bai Lu',
    '秋分':'Qiu Fen','寒露':'Han Lu','霜降':'Shuang Jiang',
    '立冬':'Li Dong','小雪':'Xiao Xue','大雪':'Da Xue',
    '驚蟄':'Jing Zhe','穀雨':'Gu Yu','小滿':'Xiao Man','處暑':'Chu Shu'
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

  const FAV_DOORS = ['Kai','Xiu','Sheng','JingS'];
  const SAN_QI    = ['Yi','Bing','Ding'];
  const DOOR_TAG_LABELS = {Kai:'Open 開', Xiu:'Rest 休', Sheng:'Birth 生', JingS:'View 景', Du:'Delusion 杜', Shang:'Injury 傷', Si:'Death 死', JingF:'Shocking 驚'};
  const QI_TAG_LABELS   = {Yi:'乙 Yi', Bing:'丙 Bing', Ding:'丁 Ding'};

  function jiaZiIdx(stem, branch){
    for(var i=0;i<60;i++){
      if(STEM_SEQ[i%10]===stem && BR_SEQ[i%12]===branch) return i;
    }
    return -1;
  }

  function getDunJuForDate(year, month, day){
    var solar = Solar.fromYmd(year, month, day);
    var lunar = solar.getLunar();
    var bazi  = lunar.getEightChar();
    var pjq   = lunar.getPrevJieQi();
    var jqPy  = JQ_CN2PY[pjq.getName()];
    if(!jqPy) return null;
    var dun   = YANG_TERMS.has(jqPy) ? 'yang' : 'yin';
    var dayStem   = STEM_H2P[bazi.getDayGan()];
    var dayBranch = BR_H2P[bazi.getDayZhi()];
    var dayIdx    = jiaZiIdx(dayStem, dayBranch);
    var xunBlock  = Math.floor(dayIdx/10);
    var xunStart  = xunBlock*10;
    var offset    = dayIdx - xunStart;
    var leadIdx   = (offset<=4) ? xunStart : (xunStart+5);
    var fuBranch  = BR_SEQ[leadIdx%12];
    var yuan      = YUAN_BY_BR[fuBranch];
    var ju        = JU_TABLE[jqPy][yuan];
    return { dun:dun, ju:ju, jqPy:jqPy, yuan:yuan, dayStem:dayStem, dayBranch:dayBranch };
  }

  function getHourPillarsForDay(dayStem){
    var dayStemIdx = STEM_SEQ.indexOf(dayStem);
    var ziStemIdx  = (dayStemIdx % 5) * 2;
    var hours = [];
    for(var brIdx=0; brIdx<12; brIdx++){
      var stemIdx = (ziStemIdx + brIdx) % 10;
      var stem    = STEM_SEQ[stemIdx];
      var branch  = BR_SEQ[brIdx];
      hours.push({ stem:stem, branch:branch, idx60:jiaZiIdx(stem,branch), time:HOUR_TIMES[branch] });
    }
    return hours;
  }

  // Tian-Di stem clashes (天干相沖): 甲-庚, 乙-辛, 丙-壬, 丁-癸
  const STEM_CLASHES = {
    'Jia':'Geng', 'Geng':'Jia',
    'Yi':'Xin',   'Xin':'Yi',
    'Bing':'Ren', 'Ren':'Bing',
    'Ding':'Gui', 'Gui':'Ding'
  };

  // Penalties — only on Tian Pan stem in the listed palace (each = -1 to score)
  const TIAN_PENALTIES = {
    'Wu':   [3],   // Wu in Zhen
    'Ji':   [2],   // Ji in Kun
    'Geng': [8],   // Geng in Gen (rare since Geng is mostly excluded)
    'Xin':  [9],   // Xin in Li
    'Ren':  [4],   // Ren in Xun
    'Gui':  [4]    // Gui in Xun
  };

  function extractHits(chart, targetPalace){
    var cell = chart.c[targetPalace];
    if(!cell) return [];
    var di = cell[0], ti = cell[1], door = cell[4];
    var leadStem = chart.ld;       // Commander stem of the current xun
    var commanderPal = chart.zfp;  // Zhi Fu palace = where Commander lives

    // FILTER 1 — Tian/Di stem clash → exclude
    // EXCEPTION: Yi/Tian + Xin/Di with favorable door (Kai/Xiu/Sheng) forms Cloud Dun (or Tiger Dun at Gen)
    // — Joseph Yu tradition treats this clash as transformed in this Nine Glimpses configuration
    if(STEM_CLASHES[ti] === di){
      var doorsFav3 = ['Kai','Xiu','Sheng'];
      var isCloudOrTiger = (ti==='Yi' && di==='Xin' && doorsFav3.indexOf(door)!==-1);
      if(!isCloudOrTiger) return [];
    }

    // FILTER 2 — Geng restrictions (with exceptions that NEUTRALIZE Geng)
    var gengInPalace = (ti === 'Geng' || di === 'Geng');
    if(gengInPalace){
      // EXCEPTION 1 — Geng IS the Commander (the Tian stem carrying the Zhi Fu) → not negative.
      var gengIsCommander = (targetPalace === commanderPal && ti === 'Geng');
      // EXCEPTION 2 — Water trine 申子辰 inside THIS palace neutralizes Geng (Geng = 申 Shen).
      // 子 Zi and 辰 Chen may come from a stem, a star or a door:
      //   Zi  = Wu 戊 / Grass (Peng 天蓬) / Rest (Xiu 休)
      //   Chen= Ren 壬 / Assistant (Fu 天輔) / Delusion (Du 杜)
      var star2 = cell[2];
      var hasZi   = (ti === 'Wu'  || di === 'Wu'  || star2 === 'Peng' || door === 'Xiu');
      var hasChen = (ti === 'Ren' || di === 'Ren' || star2 === 'Fu'   || door === 'Du');
      var waterTrine = hasZi && hasChen;   // Geng itself supplies 申
      if(!gengIsCommander && !waterTrine){
        // 2a — Geng as the OTHER stem in the Commander palace → excluded
        if(targetPalace === commanderPal) return [];
        // 2b — Geng without Ding in the palace → excluded (Geng + Ding stays positive)
        var dingInPalace = (ti === 'Ding' || di === 'Ding');
        if(!dingInPalace) return [];
      }
    }

    // FILTER 3 — duplicate Xin/Ren/Gui (Tian == Di), allowed only if that stem is Commander
    if(ti === di && (ti === 'Xin' || ti === 'Ren' || ti === 'Gui')){
      if(leadStem !== ti) return [];
    }

    // FILTER 4 — must have favorable door
    // EXCEPTIONS: Ghost Dun and Five Borrows are auspicious despite using non-favorable doors
    var hasFavDoor = door && FAV_DOORS.indexOf(door) !== -1;
    var deity = cell[3];
    var isGhostDun = (ti==='Ding' && door==='Du' && deity==='Earth');
    // Five Borrows (五假 Wu Jia) — named auspicious configurations with unfavorable doors
    var isTianJia = (ti==='Ding' && door==='JingS' && deity==='Heaven');
    var isDiJia   = (ti==='Gui' && door==='Du' && deity==='Earth');
    var isRenJia  = (ti==='Ren' && door==='JingS' && deity==='Earth');
    var isShenJia = (ti==='Bing' && door==='JingS' && deity==='Commander');
    var isGuiJia  = (ti==='Ding' && door==='Du' && deity==='Earth');
    var isAnyBorrow = isTianJia || isDiJia || isRenJia || isShenJia || isGuiJia;
    if(!hasFavDoor && !isGhostDun && !isAnyBorrow) return [];

    // FILTER 5 — must have San Qi on Tian (Yi/Bing/Ding).
    // EXCEPTION: Five Borrows bypass this filter (they are recognized configurations).
    // NOTE: Zhi Fu / Zhi Shi are BONUSES (add to score), not qualifiers.
    var hasSanQi  = SAN_QI.indexOf(ti) !== -1;
    var hasZhiFu  = chart.zfp === targetPalace;
    var hasZhiShi = chart.zsp === targetPalace;
    if(!hasSanQi && !isAnyBorrow) return [];

    // PASSED ALL FILTERS — build hit list
    var hits = [];
    hits.push({cat:'door', label:DOOR_TAG_LABELS[door]});
    if(hasSanQi)  hits.push({cat:'qi',  label:QI_TAG_LABELS[ti]});
    if(hasZhiFu)  hits.push({cat:'zhi', label:'Zhi Fu 直符'});
    if(hasZhiShi) hits.push({cat:'zhi', label:'Zhi Shi 直使'});

    // BONUS COMBOS — amplifiers (positive)
    if(ti === 'Bing' && di === 'Wu')   hits.push({cat:'combo', label:'丙↑戊'});
    if(ti === 'Wu'   && di === 'Bing') hits.push({cat:'combo', label:'戊↑丙'});
    if(hasZhiFu  && hasSanQi)          hits.push({cat:'combo', label:'SanQi+ZhiFu'});
    if(hasZhiShi && hasSanQi)          hits.push({cat:'combo', label:'SanQi+ZhiShi'});
    if(hasZhiShi && di === 'Ding')     hits.push({cat:'combo', label:'丁Di+ZhiShi'});
    if(ti === 'Yi'   && targetPalace === 3) hits.push({cat:'combo', label:'乙@震'});
    if(ti === 'Bing' && (targetPalace === 9 || targetPalace === 4)) hits.push({cat:'combo', label:'丙@離/巽'});
    if(ti === 'Ding' && (targetPalace === 7 || targetPalace === 9)) hits.push({cat:'combo', label:'丁@兌/離'});

    // NINE GLIMPSES 九遁 (Jiu Dun) — high-value auspicious configurations
    var doorsFav3 = ['Kai','Xiu','Sheng'];
    // 1. Heaven Dun 天遁: Bing/Tian + (Ding|Wu)/Di + Sheng/Door
    if(ti==='Bing' && door==='Sheng' && ((di==='Ding'||di==='Wu') || deity==='Commander'))
      hits.push({cat:'dun', label:'Heaven Dun 天遁'});
    // 2. Earth Dun 地遁: Yi/Tian + Ji/Di + Kai/Door
    if(ti==='Yi' && door==='Kai' && (di==='Ji' || deity==='Earth'))
      hits.push({cat:'dun', label:'Earth Dun 地遁'});
    // 3. Human Dun 人遁: Ding/Tian + Xiu/Door + Yin/Deity (Tai Yin 太陰)
    if(ti==='Ding' && door==='Xiu' && deity==='Yin')
      hits.push({cat:'dun', label:'Human Dun 人遁'});
    // 4. Deity Dun 神遁: Yi/Tian + Sheng/Door + Heaven/Deity (九天)
    if((ti==='Yi'||ti==='Bing') && door==='Sheng' && deity==='Heaven')
      hits.push({cat:'dun', label:'Deity Dun 神遁'});
    // 5. Ghost Dun 鬼遁: Ding/Tian + Du/Door + Earth/Deity (九地)
    //    NB: requires Du door which fails the basic filter — included for completeness
    if(ti==='Ding' && door==='Du' && deity==='Earth')
      hits.push({cat:'dun', label:'Ghost Dun 鬼遁'});
    // 6. Wind Dun 風遁: Yi/Tian + fav door (Xiu|Sheng|Kai) + Xun/Palace (4)
    if(ti==='Yi' && (door==='Kai'||door==='JingS') && targetPalace===4)
      hits.push({cat:'dun', label:'Wind Dun 風遁'});
    // 7. Cloud Dun 云遁: Yi/Tian + Xin/Di + fav door (Xiu|Sheng|Kai)
    if(ti==='Yi' && door==='Kai' && deity==='Harmonies')
      hits.push({cat:'dun', label:'Cloud Dun 云遁'});
    // 8. Dragon Dun 龍遁: Yi/Tian + fav door (Xiu|Sheng|Kai) + Kan/Palace (1)
    if((ti==='Yi'||ti==='Gui') && (door==='Xiu'||door==='Sheng') && (targetPalace===1||targetPalace===3))
      hits.push({cat:'dun', label:'Dragon Dun 龍遁'});
    // 9. Tiger Dun 虎遁: Yi/Tian + Xin/Di + (Xiu|Sheng) door + Gen/Palace (8)
    if((ti==='Xin'||ti==='Geng') && (door==='Sheng'||door==='Shang') && (targetPalace===8||targetPalace===7))
      hits.push({cat:'dun', label:'Tiger Dun 虎遁'});

    // THREE PRETENSES 三詐 (San Zha) — favorable for specific activities
    // Common pattern: San Qi (Yi/Bing/Ding) on Tian + Rest/Birth/Open door + specific Spirit
    var isSanQiOnTian = (ti==='Yi' || ti==='Bing' || ti==='Ding');
    var isXSK = (door==='Xiu' || door==='Sheng' || door==='Kai');
    if(isSanQiOnTian && isXSK){
      // Real Pretense 真詐 — Tai Yin (Yin) — spiritual/religious/charity
      if(deity==='Yin')       hits.push({cat:'zha', label:'Real Pretenses 真詐'});
      // Rest Pretense 休詐 — Six Harmonies — medicine/religious activities
      if(deity==='Earth') hits.push({cat:'zha', label:'Rest Pretenses 休詐'});
      // Multiple Pretense 重詐 — Nine Earth — fame/fortune/attracting people
      if(deity==='Harmonies') hits.push({cat:'zha', label:'Multiple Pretenses 重詐'});
    }

    // FIVE BORROWS 五假 (Wu Jia) — auspicious configurations for specific tactical uses
    // (use unfavorable doors but recognized as positive in their domain)
    if(isTianJia) hits.push({cat:'jia', label:'Heaven Borrows 天假'});  // war, litigation, important post
    if(isDiJia)   hits.push({cat:'jia', label:'Earth Borrows 地假'});   // hiding, preparations, secret affairs
    if(isRenJia)  hits.push({cat:'jia', label:'Human Borrows 人假'});   // pursuing fugitives
    if(isShenJia) hits.push({cat:'jia', label:'Deity Borrows 神假'});   // hiding things, seeking compensation
    if(isGuiJia)  hits.push({cat:'jia', label:'Ghost Borrows 鬼假'});   // burial, hunting, pacifying people

    // PENALTIES — Tian Pan stem in disadvantageous palace (each -1)
    var penPalaces = TIAN_PENALTIES[ti];
    if(penPalaces && penPalaces.indexOf(targetPalace) !== -1){
      hits.push({cat:'pen', label:'⚠ ' + STEM_HAN[ti] + ' @ ' + targetPalace});
    }

    return hits;
  }

  function getCellInfo(chart, targetPalace){
    var cell = chart.c[targetPalace];
    if(!cell) return null;
    var di = cell[0], ti = cell[1], star = cell[2], deity = cell[3], door = cell[4];
    return {
      tianHan: STEM_HAN[ti] || '?',
      tianPin: ti,
      diHan: STEM_HAN[di] || '?',
      diPin: di,
      starName: STAR_NAME[star] || star,
      deityName: deity,
      doorName: door ? (DOOR_NAME[door] || door) : ''
    };
  }

  function scanDates(targetDir, startDateStr, numDays){
    var targetPalace = DIR_TO_PALACE[targetDir];
    if(!targetPalace) return [];
    var results = [];
    var parts = startDateStr.split('-');
    var startDate = new Date(+parts[0], +parts[1]-1, +parts[2]);
    for(var d=0; d<numDays; d++){
      var date = new Date(startDate.getTime() + d*86400000);
      var Y = date.getFullYear(), M = date.getMonth()+1, D = date.getDate();
      var info = getDunJuForDate(Y, M, D);
      if(!info) continue;
      var hourPillars = getHourPillarsForDay(info.dayStem);
      for(var h=0; h<hourPillars.length; h++){
        var hp = hourPillars[h];
        var chart = _charts[info.dun][info.ju][hp.idx60];
        if(!chart) continue;
        var hits = extractHits(chart, targetPalace);
        if(hits.length>0){
          var cellInfo = getCellInfo(chart, targetPalace);
          results.push({
            date: Y + '-' + String(M).padStart(2,'0') + '-' + String(D).padStart(2,'0'),
            weekday: WEEKDAYS_IT[date.getDay()],
            hourHan: STEM_HAN[hp.stem] + BR_HAN[hp.branch],
            hourTime: hp.time,
            dun: info.dun, ju: info.ju, jieQi: info.jqPy,
            score: (function(){var p=0,n=0;for(var k=0;k<hits.length;k++){if(hits[k].cat==='pen')n++;else p++;}return p-n;})(),
            hits: hits, cell: cellInfo
          });
        }
      }
    }
    results.sort(function(a,b){
      if(a.date!==b.date) return a.date<b.date ? -1 : 1;
      return b.score-a.score;
    });
    return results;
  }

  function runDiagnostic(startStr, targetDir){
    var lines = [];
    try {
      var parts = startStr.split('-');
      var Y = +parts[0], M = +parts[1], D = +parts[2];
      lines.push('Date: ' + Y + '-' + M + '-' + D);
      lines.push('Target: ' + targetDir + ' = palace ' + DIR_TO_PALACE[targetDir]);
      if(typeof Solar==='undefined') return 'FAIL: Solar undefined';
      var solar = Solar.fromYmd(Y, M, D);
      var lunar = solar.getLunar();
      var pjq = lunar.getPrevJieQi();
      var jqName = pjq ? pjq.getName() : null;
      lines.push('Prev Jie Qi: "' + jqName + '"');
      var jqPy = JQ_CN2PY[jqName];
      if(jqPy){
        var info = getDunJuForDate(Y, M, D);
        if(info) lines.push('Dun: ' + info.dun + ' | Ju: ' + info.ju);
      } else {
        lines.push('FAIL: Jie Qi name not in mapping');
      }
    } catch(e){ lines.push('Error: ' + e.message); }
    return lines.join('<br>');
  }

  function stemElement(stem){
    var map = {Jia:'wood',Yi:'wood',Bing:'fire',Ding:'fire',Wu:'earth',Ji:'earth',Geng:'metal',Xin:'metal',Ren:'water',Gui:'water'};
    return map[stem] || 'metal';
  }

  function buildUI(root){
    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
      String(today.getMonth()+1).padStart(2,'0') + '-' +
      String(today.getDate()).padStart(2,'0');
    root.innerHTML = '' +
      '<style>' +
      '#qmdj-ws-panel{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}' +
      '#qmdj-ws-panel .ws-card{background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:16px;margin-bottom:16px;}' +
      '#qmdj-ws-panel .ws-title{font-size:18px;font-weight:600;margin:0 0 4px;color:#1a1a1a;}' +
      '#qmdj-ws-panel .ws-subtitle{font-size:13px;color:#666;margin:0 0 16px;}' +
      '#qmdj-ws-panel .ws-row{display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;}' +
      '#qmdj-ws-panel .ws-field{flex:1;min-width:120px;}' +
      '#qmdj-ws-panel .ws-label{display:block;font-size:12px;color:#666;margin-bottom:4px;font-weight:500;}' +
      '#qmdj-ws-panel .ws-select,#qmdj-ws-panel .ws-input{width:100%;padding:10px 12px;border:1px solid #d0d0d0;border-radius:8px;font-size:15px;background:#fafafa;-webkit-appearance:none;}' +
      '#qmdj-ws-panel .ws-btn{display:block;width:100%;padding:12px;background:#2d6e54;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px;}' +
      '#qmdj-ws-panel .ws-btn:disabled{background:#aaa;cursor:wait;}' +
      '#qmdj-ws-panel .ws-status{text-align:center;padding:20px;color:#888;font-size:14px;}' +
      '#qmdj-ws-panel .ws-result-card{background:#fff;border:1px solid #e8e8e8;border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start;}' +
      '#qmdj-ws-panel .ws-result-main{flex:1;min-width:0;}' +
      '#qmdj-ws-panel .ws-result-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap;}' +
      '#qmdj-ws-panel .ws-result-hour{font-size:14px;color:#333;}' +
      '#qmdj-ws-panel .ws-result-score{font-size:14px;color:#2d6e54;font-weight:600;}' +
      '#qmdj-ws-panel .ws-result-hits{display:flex;flex-wrap:wrap;gap:6px;}' +
      '#qmdj-ws-panel .ws-tag{font-size:12px;padding:3px 8px;border-radius:6px;}' +
      '#qmdj-ws-panel .ws-tag-door{background:#e8f5e9;color:#2e7d32;}' +
      '#qmdj-ws-panel .ws-tag-qi{background:#e3f2fd;color:#1565c0;}' +
      '#qmdj-ws-panel .ws-tag-zhi{background:#fff3e0;color:#e65100;}' +
      '#qmdj-ws-panel .ws-tag-combo{background:#fce4ec;color:#c62828;}' +
      '#qmdj-ws-panel .ws-tag-dun{background:#e0f2f1;color:#00695c;font-weight:600;border:1px solid #4db6ac;}' +
      '#qmdj-ws-panel .ws-tag-zha{background:#f3e5f5;color:#6a1b9a;font-weight:600;border:1px solid #ba68c8;}' +
      '#qmdj-ws-panel .ws-tag-jia{background:#efebe9;color:#5d4037;font-weight:600;border:1px solid #a1887f;}' +
      '#qmdj-ws-panel .ws-tag-pen{background:#fff3cd;color:#856404;border:1px solid #ffd966;}' +
      '#qmdj-ws-panel .ws-day-header{font-size:14px;font-weight:600;color:#333;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #eee;}' +
      '#qmdj-ws-panel .ws-summary{font-size:13px;color:#666;margin-top:12px;padding:12px;background:#f8f8f8;border-radius:8px;}' +
      // ============ Mini quadrant cell (chart-cell style) ============
      '#qmdj-ws-panel .ws-quad{width:150px;height:150px;flex-shrink:0;background:#0a6938;color:#fff;display:grid;grid-template-columns:22px 1fr 22px;grid-template-rows:22px 1fr 22px;font-family:-apple-system,sans-serif;line-height:1;border-radius:3px;overflow:hidden;}' +
      '#qmdj-ws-panel .ws-quad .q-tl{display:flex;align-items:center;justify-content:flex-start;padding-left:4px;font-size:11px;font-weight:600;color:#fff;}' +
      '#qmdj-ws-panel .ws-quad .q-tc{display:flex;align-items:center;justify-content:center;font-size:14px;color:#e8e8e8;}' +
      '#qmdj-ws-panel .ws-quad .q-tr{display:flex;align-items:center;justify-content:center;font-size:12px;color:#e8e8e8;}' +
      '#qmdj-ws-panel .ws-quad .q-lf{display:flex;align-items:center;justify-content:center;font-size:14px;color:#e8e8e8;}' +
      '#qmdj-ws-panel .ws-quad .q-rt{display:flex;align-items:center;justify-content:center;font-size:14px;color:#e8e8e8;}' +
      '#qmdj-ws-panel .ws-quad .q-bl{display:flex;align-items:center;justify-content:center;font-size:11px;color:#e8e8e8;}' +
      '#qmdj-ws-panel .ws-quad .q-bc{display:flex;align-items:center;justify-content:center;font-size:14px;color:#e8e8e8;}' +
      '#qmdj-ws-panel .ws-quad .q-br{display:flex;align-items:center;justify-content:center;font-size:12px;color:#e8e8e8;}' +
      '#qmdj-ws-panel .ws-quad .q-inner{background:#fdfcf7;color:#1a1a1a;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto auto 1fr auto auto;grid-template-areas:"deity deity" "tian star" "door door" "di palnum" ".  trig";padding:5px 7px;font-size:11px;}' +
      '#qmdj-ws-panel .ws-quad .qi-deity{grid-area:deity;text-align:center;line-height:1.2;}' +
      '#qmdj-ws-panel .ws-quad .qi-tian{grid-area:tian;font-size:20px;font-weight:500;align-self:center;}' +
      '#qmdj-ws-panel .ws-quad .qi-star{grid-area:star;text-align:right;align-self:center;}' +
      '#qmdj-ws-panel .ws-quad .qi-door{grid-area:door;text-align:center;font-size:14px;font-weight:500;align-self:center;padding:2px 0;}' +
      '#qmdj-ws-panel .ws-quad .qi-di{grid-area:di;font-size:20px;font-weight:500;align-self:end;}' +
      '#qmdj-ws-panel .ws-quad .qi-palnum{grid-area:palnum;text-align:right;font-size:14px;color:#999;align-self:end;}' +
      '#qmdj-ws-panel .ws-quad .qi-trig{grid-area:trig;text-align:right;font-size:11px;color:#999;line-height:1;}' +
      '#qmdj-ws-panel .elem-wood{color:#2f6708;}' +
      '#qmdj-ws-panel .elem-fire{color:#a32d2d;}' +
      '#qmdj-ws-panel .elem-earth{color:#7a4a0d;}' +
      '#qmdj-ws-panel .elem-metal{color:#1a1a1a;}' +
      '#qmdj-ws-panel .elem-water{color:#185fa5;}' +
      '@media (max-width: 480px){' +
      '#qmdj-ws-panel .ws-result-card{flex-direction:column;}' +
      '#qmdj-ws-panel .ws-quad{align-self:center;}' +
      '}' +
      '</style>' +
      '<div id="qmdj-ws-panel">' +
        '<div class="ws-card">' +
          '<p class="ws-title">QMDJ Water Activation</p>' +
          '<p class="ws-subtitle">Trova le ore favorevoli per attivare l\'acqua in una direzione</p>' +
          '<div class="ws-row">' +
            '<div class="ws-field">' +
              '<span class="ws-label">Direzione acqua / fontana</span>' +
              '<select id="qmdj-ws-dir" class="ws-select">' +
                '<option value="N">N — Kan 坎</option>' +
                '<option value="NE">NE — Gen 艮</option>' +
                '<option value="E">E — Zhen 震</option>' +
                '<option value="SE" selected>SE — Xun 巽</option>' +
                '<option value="S">S — Li 離</option>' +
                '<option value="SW">SW — Kun 坤</option>' +
                '<option value="W">W — Dui 兌</option>' +
                '<option value="NW">NW — Qian 乾</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="ws-row">' +
            '<div class="ws-field">' +
              '<span class="ws-label">Data inizio</span>' +
              '<input type="date" id="qmdj-ws-start" class="ws-input" value="' + todayStr + '">' +
            '</div>' +
            '<div class="ws-field">' +
              '<span class="ws-label">Giorni</span>' +
              '<select id="qmdj-ws-days" class="ws-select">' +
                '<option value="7">7 giorni</option>' +
                '<option value="14">14 giorni</option>' +
                '<option value="30" selected>30 giorni</option>' +
                '<option value="60">60 giorni</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<button id="qmdj-ws-scan" class="ws-btn">Cerca ore favorevoli</button>' +
        '</div>' +
        '<div id="qmdj-ws-results"></div>' +
      '</div>';
    root.querySelector('#qmdj-ws-scan').addEventListener('click', handleScan);
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
    btn.textContent = 'Calcolo...';
    out.innerHTML = '<div class="ws-status">Analizzando ' + days + ' giorni × 12 ore...</div>';
    setTimeout(function(){
      try {
        var results = scanDates(dir, start, days);
        if(results.length===0){
          out.innerHTML = '<div class="ws-status" style="text-align:left;padding:14px;background:#fff8e1;border:1px solid #ffc107;border-radius:8px;font-family:monospace;font-size:12px;">Nessun risultato.<br><br>' + runDiagnostic(start, dir) + '</div>';
        } else {
          renderResults(results, dir, start, days, out);
        }
      } catch(e){
        out.innerHTML = '<div class="ws-status" style="color:#c62828;text-align:left;font-family:monospace;font-size:12px;">Errore: ' + (e.message||e) + '</div>';
      }
      btn.disabled = false;
      btn.textContent = 'Cerca ore favorevoli';
    }, 50);
  }

  function buildQuadrant(palace, cell){
    var info = PALACE_QUAD[palace];
    if(!info) return '';
    var tianEl = stemElement(cell.tianPin);
    var diEl   = stemElement(cell.diPin);
    return '<div class="ws-quad">' +
      '<span class="q-tl">' + info.dir + '</span>' +
      '<span class="q-tc">' + (info.topBr || '') + '</span>' +
      '<span class="q-tr"></span>' +
      '<span class="q-lf">' + (info.leftBr || '') + '</span>' +
      '<div class="q-inner">' +
        '<span class="qi-deity">' + cell.deityName + '</span>' +
        '<span class="qi-tian elem-' + tianEl + '">' + cell.tianHan + '</span>' +
        '<span class="qi-star">' + cell.starName + '</span>' +
        '<span class="qi-door">' + cell.doorName + '</span>' +
        '<span class="qi-di elem-' + diEl + '">' + cell.diHan + '</span>' +
        '<span class="qi-palnum">' + palace + '</span>' +
        '<span class="qi-trig">' + info.trigram + '</span>' +
      '</div>' +
      '<span class="q-rt">' + (info.rightBr || '') + '</span>' +
      '<span class="q-bl"></span>' +
      '<span class="q-bc">' + (info.bottomBr || '') + '</span>' +
      '<span class="q-br"></span>' +
      '</div>';
  }

  function renderResults(results, dir, startStr, days, container){
    var palace = DIR_TO_PALACE[dir];
    var palLabel = PALACE_NAME[palace] || palace;
    var byDate = {}, dateOrder = [];
    for(var i=0; i<results.length; i++){
      var r = results[i];
      if(!byDate[r.date]){ byDate[r.date]=[]; dateOrder.push(r.date); }
      byDate[r.date].push(r);
    }
    var html = '<div class="ws-summary"><strong>' + dir + ' — ' + palLabel + '</strong><br>' +
      'Periodo: ' + startStr + ' → ' + days + ' giorni<br>' +
      'Totale ore favorevoli: <strong>' + results.length + '</strong></div>';
    for(var di=0; di<dateOrder.length; di++){
      var date = dateOrder[di];
      var dayResults = byDate[date];
      dayResults.sort(function(a,b){ return b.score-a.score; });
      var first = dayResults[0];
      html += '<div class="ws-day-header">' + date + ' ' + first.weekday +
        ' • ' + (first.dun==='yang'?'Yang':'Yin') + ' Ju ' + first.ju +
        ' • ' + first.jieQi + ' (' + dayResults.length + ' ore)</div>';
      for(var ri=0; ri<dayResults.length; ri++){
        var r = dayResults[ri];
        var stars = '';
        for(var s=0; s<Math.min(r.score,5); s++) stars += '★';
        var quadHtml = buildQuadrant(palace, r.cell);
        var tagsHtml = '';
        for(var hi=0; hi<r.hits.length; hi++){
          var h = r.hits[hi];
          tagsHtml += '<span class="ws-tag ws-tag-' + h.cat + '">' + h.label + '</span>';
        }
        html += '<div class="ws-result-card">' +
          '<div class="ws-result-main">' +
            '<div class="ws-result-top">' +
              '<span class="ws-result-hour">' + r.hourHan + ' <span style="color:#888;">(' + r.hourTime + ')</span></span>' +
              '<span class="ws-result-score">' + stars + ' (' + r.score + ')</span>' +
            '</div>' +
            '<div class="ws-result-hits">' + tagsHtml + '</div>' +
          '</div>' +
          quadHtml +
          '</div>';
      }
    }
    container.innerHTML = html;
  }

  // ============================================================
  // EMBEDDED FULL CHART DATA
  // ============================================================
  var EMBEDDED_CHARTS = window.QMDJ_EMBEDDED_CHARTS;

  // ── PUBLIC API helpers (for integration with app-fengshui.js) ──

  /**
   * Convert compass degrees (0-360) to QMDJ palace number (1-9, never 5).
   * 0° = North. Returns palace number or null if invalid.
   */
  function degToPalace(deg){
    if(typeof deg !== 'number' || isNaN(deg)) return null;
    deg = ((deg % 360) + 360) % 360; // normalize to 0-360
    // N: 337.5–360 and 0–22.5 → Palace 1 (Kan)
    if(deg >= 337.5 || deg < 22.5)   return 1;
    if(deg >= 22.5  && deg < 67.5)   return 8; // NE → Gen
    if(deg >= 67.5  && deg < 112.5)  return 3; // E  → Zhen
    if(deg >= 112.5 && deg < 157.5)  return 4; // SE → Xun
    if(deg >= 157.5 && deg < 202.5)  return 9; // S  → Li
    if(deg >= 202.5 && deg < 247.5)  return 2; // SW → Kun
    if(deg >= 247.5 && deg < 292.5)  return 7; // W  → Dui
    if(deg >= 292.5 && deg < 337.5)  return 6; // NW → Qian
    return null;
  }

  /**
   * Check a specific hour at a specific palace for QMDJ Water activation.
   * Requires lunar-javascript (Solar) and embedded charts to be available.
   *
   * @param {number} year  - Solar year
   * @param {number} month - Solar month (1-12)
   * @param {number} day   - Solar day
   * @param {string} hourStem   - Pinyin ('Jia') or Chinese ('甲') stem of the hour
   * @param {string} hourBranch - Pinyin ('Zi') or Chinese ('子') branch of the hour
   * @param {number} palace     - Target palace (1-9, not 5)
   * @returns {Object|null} {matched:bool, hits:[{cat,label}], score:N} or null on error
   */
  function checkHourAtPalace(year, month, day, hourStem, hourBranch, palace){
    if(typeof Solar === 'undefined') return null;
    var charts = _charts || EMBEDDED_CHARTS;
    if(!charts) return null;
    if(palace === 5 || palace < 1 || palace > 9) return null;

    // Accept Chinese characters too (e.g. '甲','子') — auto-convert to pinyin
    if(STEM_H2P[hourStem])   hourStem   = STEM_H2P[hourStem];
    if(BR_H2P[hourBranch])   hourBranch = BR_H2P[hourBranch];

    var info = getDunJuForDate(year, month, day);
    if(!info) return null;

    var idx60 = jiaZiIdx(hourStem, hourBranch);
    if(idx60 < 0) return null;

    var chart = charts[info.dun] && charts[info.dun][info.ju] && charts[info.dun][info.ju][idx60];
    if(!chart) return null;

    var cell = chart.c[palace];
    if(!cell) return null;
    var hits = extractHits(chart, palace);

    // Raw cell data for display (always returned, even when no match)
    var STEM_P2H = {Jia:'甲',Yi:'乙',Bing:'丙',Ding:'丁',Wu:'戊',Ji:'己',Geng:'庚',Xin:'辛',Ren:'壬',Gui:'癸'};
    // Six Jia hiding (六甲遁): lead stem → full Jia designation
    var JIA_HIDE = {Wu:'甲子戊',Ji:'甲戌己',Geng:'甲申庚',Xin:'甲午辛',Ren:'甲辰壬',Gui:'甲寅癸'};
    var isZhiFu  = (chart.zfp === palace);
    var isZhiShi = (chart.zsp === palace);
    var cellInfo = {
      ti:    cell[1],  tiH: STEM_P2H[cell[1]]||cell[1],
      di:    cell[0],  diH: STEM_P2H[cell[0]]||cell[0],
      star:  STAR_NAME[cell[2]]||cell[2],
      deity: cell[3],
      door:  DOOR_NAME[cell[4]]||cell[4],
      zhiFu:  isZhiFu,
      zhiShi: isZhiShi,
      jiaName: isZhiFu ? (JIA_HIDE[chart.ld]||'') : ''
    };

    if(hits.length === 0) return { matched: false, hits: [], score: 0, cell: cellInfo };

    var pos = 0, neg = 0;
    for(var i = 0; i < hits.length; i++){
      if(hits[i].cat === 'pen') neg++; else pos++;
    }
    return { matched: true, hits: hits, score: pos - neg, cell: cellInfo };
  }

  // ── getHourChart: returns full 9-palace chart data for rendering ──
  // Returns { palaces: {1:{ti,tiH,di,diH,star,deity,door,zhiFu,zhiShi,jiaName}, ...}, dun, ju }
  // or null if chart not found.
  function getHourChart(year, month, day, hourStem, hourBranch){
    var charts = _charts || EMBEDDED_CHARTS;
    if(!charts) return null;
    var info = getDunJuForDate(year, month, day);
    if(!info) return null;
    var hs = hourStem, hb = hourBranch;
    if(STEM_H2P[hs]) hs = STEM_H2P[hs];
    if(BR_H2P[hb])   hb = BR_H2P[hb];
    var idx60 = jiaZiIdx(hs, hb);
    if(idx60 < 0) return null;
    var chart = charts[info.dun] && charts[info.dun][info.ju] && charts[info.dun][info.ju][idx60];
    if(!chart) return null;
    var STEM_P2H = {Jia:'甲',Yi:'乙',Bing:'丙',Ding:'丁',Wu:'戊',Ji:'己',Geng:'庚',Xin:'辛',Ren:'壬',Gui:'癸'};
    var JIA_HIDE = {Wu:'甲子戊',Ji:'甲戌己',Geng:'甲申庚',Xin:'甲午辛',Ren:'甲辰壬',Gui:'甲寅癸'};
    var palaces = {};
    for(var p = 1; p <= 9; p++){
      if(p === 5){
        palaces[5] = { ti:'', tiH:'', di:'', diH:'', star:'Pillar', deity:'', door:'', zhiFu:false, zhiShi:false, jiaName:'' };
        // Center uses the chart's center data if available
        if(chart.c[5]){
          var c5 = chart.c[5];
          palaces[5].ti = c5[1]; palaces[5].tiH = STEM_P2H[c5[1]]||c5[1];
          palaces[5].di = c5[0]; palaces[5].diH = STEM_P2H[c5[0]]||c5[0];
          palaces[5].star = STAR_NAME[c5[2]]||c5[2];
          palaces[5].deity = c5[3]||'';
          palaces[5].door = DOOR_NAME[c5[4]]||c5[4]||'';
        }
        continue;
      }
      var cell = chart.c[p];
      if(!cell){ palaces[p] = null; continue; }
      var isZF = (chart.zfp === p);
      palaces[p] = {
        ti: cell[1], tiH: STEM_P2H[cell[1]]||cell[1],
        di: cell[0], diH: STEM_P2H[cell[0]]||cell[0],
        star: STAR_NAME[cell[2]]||cell[2],
        deity: cell[3],
        door: DOOR_NAME[cell[4]]||cell[4],
        zhiFu: isZF,
        zhiShi: (chart.zsp === p),
        jiaName: isZF ? (JIA_HIDE[chart.ld]||'') : ''
      };
    }
    return { palaces: palaces, dun: info.dun, ju: info.ju };
  }

  function mount(root){
    if(_mounted) unmount();
    _root = root;
    if(typeof Solar==='undefined' || typeof Lunar==='undefined'){
      _root.innerHTML = '<div style="padding:20px;color:#c62828;font-family:sans-serif;">Errore: lunar-javascript non trovato.</div>';
      return false;
    }
    _charts = EMBEDDED_CHARTS;
    buildUI(_root);
    _mounted = true;
    return true;
  }

  function unmount(){
    if(_root) _root.innerHTML = '';
    _mounted = false;
    _root = null;
  }


  // ══════════════════════════════════════════════════════════════════════
  //  ROTATING PAN (轉盤) — hourly chart generator
  //  Adapted from the yearly 轉盤 algorithm. Uses rigid compass rotation
  //  instead of Luo-Shu flying for stars, gates, and deities.
  // ══════════════════════════════════════════════════════════════════════

  var R_COMP = [1,8,3,4,9,2,7,6];  // compass wheel (clockwise)
  var R_STEM_ORDER = ['Wu','Ji','Geng','Xin','Ren','Gui','Ding','Bing','Yi'];
  var R_STAR_EN = {1:'Grass',2:'Rice',3:'Aggressor',4:'Assistant',5:'Fowl',6:'Heart',7:'Pillar',8:'Official',9:'Hero'};
  var R_DEITY_EN = ['Commander','Snake','Yin','Harmonies','Tiger','Warrior','Earth','Heaven'];
  // Palace home gate → scanner door key
  var R_GATE_KEY = {1:'Xiu',2:'Si',3:'Shang',4:'Du',6:'Kai',7:'JingF',8:'Sheng',9:'JingS'};

  function genRotatingDipan(ju, dun){
    var dp = {}; var p = ju;
    for(var i=0; i<R_STEM_ORDER.length; i++){
      dp[p] = R_STEM_ORDER[i];
      p = dun==='yang' ? (p%9+1) : ((p-2+9)%9+1);
    }
    return dp;
  }

  function getRotatingHourChart(year, month, day, hourStem, hourBranch){
    var info = getDunJuForDate(year, month, day);
    if(!info) return null;
    var hs = STEM_H2P[hourStem] || hourStem;
    var hb = BR_H2P[hourBranch] || hourBranch;
    var idx60 = jiaZiIdx(hs, hb);
    if(idx60 < 0) return null;

    var ju = info.ju, dun = info.dun;
    var dp = genRotatingDipan(ju, dun);

    // 旬首: hiding stem + position within decade
    var hd = idx60 - (idx60 % 10);
    var xstem = ['Wu','Ji','Geng','Xin','Ren','Gui'][Math.floor(hd/10)];
    var k = idx60 % 10;

    // Find 旬首 palace on Di Pan
    var xpal = null;
    for(var pp=1; pp<=9; pp++) if(dp[pp]===xstem) xpal=pp;
    if(xpal===null) return null;

    // Effective stem (甲 uses hiding stem)
    var eff = (hs==='Jia') ? xstem : hs;

    // Target palace (where effective stem sits on Di Pan)
    var tgt = null;
    for(var pp=1; pp<=9; pp++) if(dp[pp]===eff) tgt=pp;
    if(tgt===null) return null;
    if(tgt===5) tgt=2;  // center lodges to Kun

    // Stars — rigid compass rotation from xpal to tgt
    var sS = R_COMP.indexOf(tgt) - R_COMP.indexOf(xpal);
    var starAt = {};
    for(var i=0; i<8; i++) starAt[R_COMP[((i+sS)%8+8)%8]] = R_COMP[i];
    starAt[5] = 5;

    // Deities — from 值符 (at tgt), cw (Yang) / ccw (Yin)
    var deityMap = {};
    var iF = R_COMP.indexOf(tgt);
    for(var dd=0; dd<8; dd++){
      deityMap[dun==='yang' ? R_COMP[(iF+dd)%8] : R_COMP[((iF-dd)%8+8)%8]] = dd;
    }

    // Gates — 值使 advances from xpal by k steps; rigid rotation; 杜↔景 swap
    var g = xpal;
    for(var s=0; s<k; s++) g = dun==='yang' ? (g%9+1) : ((g-2+9)%9+1);
    if(g===5) g=2;
    var gS = R_COMP.indexOf(g) - R_COMP.indexOf(xpal);
    var gateHome = {};
    for(var i=0; i<8; i++) gateHome[R_COMP[((i+gS)%8+8)%8]] = R_COMP[i];
    // 杜↔景 swap (palace 4 ↔ palace 9 gate identities)
    for(var q in gateHome){
      if(gateHome[q]===4) gateHome[q]=9;
      else if(gateHome[q]===9) gateHome[q]=4;
    }

    // Build palaces in same format as getHourChart
    var STEM_P2H_R = {Jia:'甲',Yi:'乙',Bing:'丙',Ding:'丁',Wu:'戊',Ji:'己',Geng:'庚',Xin:'辛',Ren:'壬',Gui:'癸'};
    var palaces = {};
    var isZhiFu = tgt;
    // Zhi Shi palace = where gate g is
    var zhiShi = null;
    for(var q in gateHome) if(+q===g) zhiShi=+q;
    if(!zhiShi) zhiShi = g;

    for(var pn=1; pn<=9; pn++){
      if(pn===5){
        palaces[5] = { ti:dp[5]||'', tiH:STEM_P2H_R[dp[5]]||'', di:dp[5]||'', diH:STEM_P2H_R[dp[5]]||'',
                       star:'Fowl', deity:'', door:'', zhiFu:false, zhiShi:false, jiaName:'' };
        continue;
      }
      var star = starAt[pn];
      var hStem = dp[star];  // heaven plate stem = di pan stem of the star's home palace
      var eStem = dp[pn];    // earth plate stem
      var deityIdx = deityMap[pn];
      var gHome = gateHome[pn];
      var doorKey = gHome ? R_GATE_KEY[gHome] : '';
      var doorName = doorKey ? (DOOR_NAME[doorKey]||doorKey) : '';

      palaces[pn] = {
        ti: hStem, tiH: STEM_P2H_R[hStem]||hStem,
        di: eStem, diH: STEM_P2H_R[eStem]||eStem,
        star: R_STAR_EN[star]||'',
        deity: deityIdx!==undefined ? R_DEITY_EN[deityIdx] : '',
        door: doorKey,  // use scanner key (Kai/Xiu/Sheng/etc.) for hit detection
        doorName: doorName, // English name for display
        zhiFu: (pn===isZhiFu),
        zhiShi: (pn===zhiShi),
        jiaName: ''
      };
    }
    return { palaces: palaces, dun: dun, ju: ju, method: 'rotating' };
  }

  // Check a rotating chart palace for Dun/Pretense/Borrow hits
  // Uses the same conditions as extractHits but simplified for the rotating chart
  function checkRotatingPalace(chart, palace){
    if(!chart || palace===5 || palace<1 || palace>9) return [];
    var pd = chart.palaces[palace];
    if(!pd) return [];
    var ti = pd.ti, di = pd.di, door = pd.door, deity = pd.deity;
    var hits = [];

    // NINE DUN
    if(ti==='Bing' && door==='Sheng' && ((di==='Ding'||di==='Wu') || deity==='Commander'))
      hits.push({cat:'dun', label:'Heaven Dun 天遁'});
    if(ti==='Yi' && door==='Kai' && (di==='Ji' || deity==='Earth'))
      hits.push({cat:'dun', label:'Earth Dun 地遁'});
    if(ti==='Ding' && door==='Xiu' && deity==='Yin')
      hits.push({cat:'dun', label:'Human Dun 人遁'});
    if((ti==='Yi'||ti==='Bing') && door==='Sheng' && deity==='Heaven')
      hits.push({cat:'dun', label:'Deity Dun 神遁'});
    if(ti==='Ding' && door==='Du' && deity==='Earth')
      hits.push({cat:'dun', label:'Ghost Dun 鬼遁'});
    if(ti==='Yi' && (door==='Kai'||door==='JingS') && palace===4)
      hits.push({cat:'dun', label:'Wind Dun 風遁'});
    if(ti==='Yi' && door==='Kai' && deity==='Harmonies')
      hits.push({cat:'dun', label:'Cloud Dun 云遁'});
    if((ti==='Yi'||ti==='Gui') && (door==='Xiu'||door==='Sheng') && (palace===1||palace===3))
      hits.push({cat:'dun', label:'Dragon Dun 龍遁'});
    if((ti==='Xin'||ti==='Geng') && (door==='Sheng'||door==='Shang') && (palace===8||palace===7))
      hits.push({cat:'dun', label:'Tiger Dun 虎遁'});

    // THREE PRETENSES
    var isSanQi = (ti==='Yi' || ti==='Bing' || ti==='Ding');
    var isXSK = (door==='Xiu' || door==='Sheng' || door==='Kai');
    if(isSanQi && isXSK){
      if(deity==='Yin')       hits.push({cat:'zha', label:'Real Pretenses 真詐'});
      if(deity==='Earth')     hits.push({cat:'zha', label:'Rest Pretenses 休詐'});
      if(deity==='Harmonies') hits.push({cat:'zha', label:'Multiple Pretenses 重詐'});
    }

    // FIVE BORROWS
    if(ti==='Ding' && door==='JingS' && deity==='Heaven')
      hits.push({cat:'jia', label:'Heaven Borrows 天假'});
    if(ti==='Gui' && door==='Du' && deity==='Earth')
      hits.push({cat:'jia', label:'Earth Borrows 地假'});
    if(ti==='Ren' && door==='JingS' && deity==='Earth')
      hits.push({cat:'jia', label:'Human Borrows 人假'});
    if(ti==='Bing' && door==='JingS' && deity==='Commander')
      hits.push({cat:'jia', label:'Deity Borrows 神假'});
    if(ti==='Ding' && door==='Du' && deity==='Earth')
      hits.push({cat:'jia', label:'Ghost Borrows 鬼假'});

    return hits;
  }


    window.QMDJWaterScanner = {
    mount: mount,
    unmount: unmount,
    scanDates: function(dir, start, days){
      if(!_charts) throw new Error('Charts not loaded. Call mount() first.');
      return scanDates(dir, start, days);
    },
    // Headless scan: loads the embedded charts itself (no UI mount needed) so the
    // AI assistant / other code can run a water scan and read the results directly.
    scan: function(dir, start, days){
      if(!_charts) _charts = EMBEDDED_CHARTS;
      if(!_charts) throw new Error('Embedded charts not loaded (qmdj-water-scanner-data.js missing?).');
      return scanDates(dir, start, days);
    },
    validDirections: function(){ return Object.keys(DIR_TO_PALACE); },
    degToPalace: degToPalace,
    checkHourAtPalace: function(year, month, day, hourStem, hourBranch, palace){
      return checkHourAtPalace(year, month, day, hourStem, hourBranch, palace);
    },
    getHourChart: function(year, month, day, hourStem, hourBranch){
      return getHourChart(year, month, day, hourStem, hourBranch);
    },
    getRotatingHourChart: function(year, month, day, hourStem, hourBranch){
      return getRotatingHourChart(year, month, day, hourStem, hourBranch);
    },
    checkRotatingPalace: function(chart, palace){
      return checkRotatingPalace(chart, palace);
    }
  };
})();

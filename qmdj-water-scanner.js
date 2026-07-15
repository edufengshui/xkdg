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

  // Purpose-specific QMDJ boosters — ADD to effectiveness/score, never gate.
  // Star names use STAR_NAME English values (cell star). Spirits use the raw
  // deity key (cell[3]): Bird=朱雀, Norm=勾陳.
  const PURPOSE_QM_STARS   = { health:['Heart'], speak:['Pillar','Assistant'], career:['Hero','Official'] };
  const PURPOSE_QM_SPIRITS = { legal:['Bird'], career:['Norm'] };

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

  // ══════════════════════════════════════════════════════════════════════════
  //  BRANCH LAYER — 三合 trines and 三會 directional combinations INSIDE one palace
  //  (canonical, Edu). Everything in a palace carries a branch:
  //   • the six Jia 六甲遁 — each of the six lead stems hides a branch. Jia 甲 and
  //     the San Qi 乙丙丁 hide none, so they never contribute.
  //   • the palace itself carries its own branch(es).
  //   • a star and a door carry the branch(es) of the palace they ORIGINATE from
  //     (e.g. Assistant 天輔 and Delusion 杜 both come from Xun 巽 → 辰巳).
  //  Up to five sources per cell: Tian stem, Di stem, star, door, palace.
  //  NOTE no dual-branch source (未申 · 辰巳 · 戌亥 · 丑寅) can ever supply two
  //  members of the SAME group, so a completed group is never ambiguous.
  // ══════════════════════════════════════════════════════════════════════════
  const JIA_BRANCH = { Wu:'Zi', Ji:'Xu', Geng:'Shen', Xin:'Wu', Ren:'Chen', Gui:'Yin' };  // 甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸
  const PALACE_BRANCHES = { 1:['Zi'], 2:['Wei','Shen'], 3:['Mao'], 4:['Chen','Si'], 5:[], 6:['Xu','Hai'], 7:['You'], 8:['Chou','Yin'], 9:['Wu'] };
  // Origin palace of each star — raw chart code AND the STAR_NAME display value,
  // because cellInfo carries the display name while extractHits carries the code.
  const STAR_ORIGIN = { Peng:1, Rui:2, Chong:3, Fu:4, Qin:5, Xin:6, Zhu:7, Ren:8, Ying:9,
                        Grass:1, Rice:2, Aggressor:3, Assistant:4, Fowl:5, Heart:6, Pillar:7, Official:8, Hero:9 };
  const DOOR_ORIGIN = { Xiu:1, Si:2, Shang:3, Du:4, Kai:6, JingF:7, Sheng:8, JingS:9 };
  const BRANCH_GROUPS = [
    { members:['Shen','Zi','Chen'],  element:'water', kind:'trine',  label:'\u7533\u5b50\u8fb0' },
    { members:['Yin','Wu','Xu'],     element:'fire',  kind:'trine',  label:'\u5bc5\u5348\u620c' },
    { members:['Si','You','Chou'],   element:'metal', kind:'trine',  label:'\u5df3\u9149\u4e11' },
    { members:['Hai','Mao','Wei'],   element:'wood',  kind:'trine',  label:'\u4ea5\u5375\u672a' },
    { members:['Hai','Zi','Chou'],   element:'water', kind:'combo',  label:'\u4ea5\u5b50\u4e11' },
    { members:['Yin','Mao','Chen'],  element:'wood',  kind:'combo',  label:'\u5bc5\u5375\u8fb0' },
    { members:['Si','Wu','Wei'],     element:'fire',  kind:'combo',  label:'\u5df3\u5348\u672a' },
    { members:['Shen','You','Xu'],   element:'metal', kind:'combo',  label:'\u7533\u9149\u620c' }
  ];
  const PALACE_ELEMENT = { 1:'water', 2:'earth', 3:'wood', 4:'wood', 5:'earth', 6:'metal', 7:'metal', 8:'earth', 9:'fire' };
  const ELEM_GENERATES = { water:'wood', wood:'fire', fire:'earth', earth:'metal', metal:'water' };   // X generates ELEM_GENERATES[X]
  const ELEM_CONTROLS  = { water:'fire', fire:'metal', metal:'wood', wood:'earth', earth:'water' };   // X controls  ELEM_CONTROLS[X]
  // Score effect on a WATER/FS ACTIVATION (Edu): a group that GENERATES the palace
  // outranks a group of the palace's OWN element; the other two relations are neutral;
  // a group that CONTROLS the palace disqualifies the hour. Tunable.
  const TRINE_BONUS_GENERATES = 2;
  const TRINE_BONUS_SAME      = 1;

  // Every branch present in a cell -> the sources that supply it.
  // `palace` may be omitted (callers that do not know it); the palace branch is then
  // simply absent and a group can still complete from stems + star + door alone.
  function _qmBranchesInPalace(cell, palace){
    var out = {};
    function add(br, src){ if(!br) return; (out[br] = out[br] || []).push(src); }
    if(cell){
      add(JIA_BRANCH[cell.ti], (STEM_HAN[cell.ti] || cell.ti) + '\u5929');   // Tian stem
      add(JIA_BRANCH[cell.di], (STEM_HAN[cell.di] || cell.di) + '\u5730');   // Di stem
      var sp = STAR_ORIGIN[cell.star] || STAR_ORIGIN[cell.starCode];
      if(sp) (PALACE_BRANCHES[sp] || []).forEach(function(b){ add(b, 'star ' + cell.star); });
      var dp = DOOR_ORIGIN[cell.doorCode];
      if(dp) (PALACE_BRANCHES[dp] || []).forEach(function(b){ add(b, 'door ' + (DOOR_TAG_LABELS[cell.doorCode] || cell.doorCode)); });
    }
    var pal = palace || (cell && cell.palace);
    if(pal) (PALACE_BRANCHES[pal] || []).forEach(function(b){ add(b, 'palace ' + (PALACE_NAME[pal] || pal)); });
    return out;
  }

  // Completed 三合 / 三會 groups in a palace, with their relation to the palace element.
  // -> { groups:[{label,element,kind,relation}], bonus, controls:Boolean }
  function detectBranchGroups(cell, palace){
    var brs = _qmBranchesInPalace(cell, palace);
    var pal = palace || (cell && cell.palace);
    var palElem = PALACE_ELEMENT[pal] || null;
    var groups = [], bonus = 0, controls = false;
    BRANCH_GROUPS.forEach(function(g){
      if(!g.members.every(function(m){ return brs[m]; })) return;
      var rel = 'neutral';
      if(palElem){
        if(ELEM_CONTROLS[g.element] === palElem)       { rel = 'controls';  controls = true; }
        else if(ELEM_GENERATES[g.element] === palElem) { rel = 'generates'; bonus += TRINE_BONUS_GENERATES; }
        else if(g.element === palElem)                 { rel = 'same';      bonus += TRINE_BONUS_SAME; }
      }
      groups.push({ label:g.label, element:g.element, kind:g.kind, relation:rel });
    });
    return { groups: groups, bonus: bonus, controls: controls };
  }

  // Does branch `br` sit inside a COMPLETED group in this palace? Used to neutralize
  // a negative stem (Geng 庚 = 申; the 庚己 pair completing 申酉戌; …).
  function _qmBranchInGroup(cell, palace, br){
    var d = detectBranchGroups(cell, palace);
    for(var i = 0; i < d.groups.length; i++){
      var g = BRANCH_GROUPS.filter(function(x){ return x.label === d.groups[i].label; })[0];
      if(g && g.members.indexOf(br) !== -1) return d.groups[i];
    }
    return null;
  }

  // ── FS WATER-ACTIVATION PURPOSES → primary QMDJ door(s) ─────────────────
  // Date per "accendere l'acquario": ogni Purpose seleziona la porta principale
  // del palazzo. Tutte le regole canoniche valgono (§1 formationFlags + §2 gate
  // San Qi/Wu obbligatorio). `allowNonFav` = la porta primaria NON è favorevole
  // (Kai/Xiu/Sheng/JingS) ed è redenta dal San Qi — stesso schema dell'eccezione
  // Injury-per-viaggi. `wuBonus` = bonus quando Wu 戊 è nello stesso palazzo.
  // `mainPurpose` = chiave del Purpose Main corrispondente per lo score XKDG.
  const FS_PURPOSE_DOORS = {
    health:       { doors:['Xiu'],          allowNonFav:false, label:'Health',       mainPurpose:'health' },
    career:       { doors:['Kai','JingS'],  allowNonFav:false, label:'Career',       mainPurpose:'career' },
    wealth:       { doors:['Sheng'],        allowNonFav:false, wuBonus:true, premiumWuBing:true, label:'Wealth', mainPurpose:'wealth' },
    relationship: { doors:['Xiu'],          allowNonFav:false, label:'Relationship', mainPurpose:'relationship' },
    journey:      { doors:['Xiu'],          allowNonFav:false, label:'Journey',      mainPurpose:'journey' },
    speak:        { doors:['JingS'],        allowNonFav:false, label:'Speak',        mainPurpose:'speak' },
    legal:        { doors:['JingF'],        allowNonFav:true,  label:'Legal',        mainPurpose:'legal' },  // JingF 驚 redento dal San Qi
    water:        { doors:null,             allowNonFav:false, wuBonus:true, label:'Water',        mainPurpose:'',     isWater:true }  // any fav door; palace from house profile
  };

  function jiaZiIdx(stem, branch){
    for(var i=0;i<60;i++){
      if(STEM_SEQ[i%10]===stem && BR_SEQ[i%12]===branch) return i;
    }
    return -1;
  }

  function getDunJuForDate(year, month, day, bjInstant){
    var solar = Solar.fromYmd(year, month, day);
    var lunar = solar.getLunar();
    var bazi  = lunar.getEightChar();
    // Jie Qi / dun at INSTANT level when a Beijing-naive instant is supplied (TST-correct on the
    // exact day a term falls); otherwise day granularity. lunar-javascript's jieqi are Beijing-based,
    // so the Beijing-naive instant is the correct frame to compare against. The DAY pillar and 元
    // stay from (year,month,day) = the TST calendar date (元 is a day property).
    var pjq = lunar.getPrevJieQi();
    if(bjInstant && bjInstant.y){
      try {
        pjq = Solar.fromYmdHms(bjInstant.y, bjInstant.mo, bjInstant.d,
                               bjInstant.h || 0, bjInstant.mi || 0, bjInstant.s || 0)
                   .getLunar().getPrevJieQi();
      } catch(e){ /* keep the day-granular pjq */ }
    }
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
    // CANONICAL: Warrior 玄武 is ALWAYS excluded — no exception, in every section.
    if(cell[3] === 'Warrior') return [];
    var leadStem = chart.ld;       // Commander stem of the current xun
    var commanderPal = chart.zfp;  // Zhi Fu palace = where Commander lives

    // FILTER 1 — Tian/Di stem clash 相冲 → exclude.
    // DEFAULT (automatic): excused ONLY if this palace carries the Commander 值符.
    // (Cloud/Tiger Dun excusing a clash is a Glimpse — available via MANUAL selection only.)
    if(STEM_CLASHES[ti] === di){
      if(targetPalace !== commanderPal) return [];
    }

    // FILTER 2 — Geng restrictions (with exceptions that NEUTRALIZE Geng)
    var gengInPalace = (ti === 'Geng' || di === 'Geng');
    if(gengInPalace){
      // EXCEPTION 1 — Geng IS the Commander (the Tian stem carrying the Zhi Fu) → not negative.
      var gengIsCommander = (targetPalace === commanderPal && ti === 'Geng');
      // EXCEPTION 2 — Geng 庚 hides 申 Shen (甲申庚). When 申 completes a group INSIDE this
      // palace — the water trine 申子辰 or the metal combination 申酉戌 — Geng is neutralized.
      // Branches come from the six Jia stems, the star's and the door's ORIGIN palace and the
      // palace itself (canonical branch layer at the top of this file), so this generalizes the
      // old hand-written 子/辰 test to every group 申 can belong to.
      var star2 = cell[2];
      var _gengCell = { ti: ti, di: di, starCode: star2, doorCode: door, palace: targetPalace };
      var waterTrine = !!_qmBranchInGroup(_gengCell, targetPalace, 'Shen');
      // Canonical default: 庚己 is allowed with the Pillar star 天柱 + a favourable door.
      var gengJiPillar = (((ti==='Geng'&&di==='Ji')||(ti==='Ji'&&di==='Geng'))
        && STAR_NAME[star2] === 'Pillar' && FAV_DOORS.indexOf(door) !== -1);
      if(!gengIsCommander && !waterTrine && !gengJiPillar){
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

    // FILTER 4 — DEFAULT (automatic): a favourable door is required.
    // Ghost Dun / Five Borrows that use a non-favourable door qualify ONLY via
    // MANUAL selection (advanced students), never in an automatic search.
    var hasFavDoor = door && FAV_DOORS.indexOf(door) !== -1;
    var deity = cell[3];
    if(!hasFavDoor) return [];

    // FILTER 5 — DEFAULT (automatic): San Qi on Tian (Yi/Bing/Ding) is required.
    // Five Borrows bypass this ONLY via manual selection.
    // NOTE: Zhi Fu / Zhi Shi are BONUSES (add to score), not qualifiers.
    var hasSanQi  = SAN_QI.indexOf(ti) !== -1;
    var hasZhiFu  = chart.zfp === targetPalace;
    var hasZhiShi = chart.zsp === targetPalace;
    if(!hasSanQi) return [];

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
    // (use unfavorable doors but recognized as positive in their domain). These are
    // LABELS ONLY now: in an automatic search they appear solely on a palace that
    // already passed the default conditions above. The unfavourable-door Borrows
    // (Earth/Ghost via Du) are reachable only through MANUAL selection.
    var isTianJia = (ti==='Ding' && door==='JingS' && deity==='Heaven');
    var isDiJia   = (ti==='Gui'  && door==='Du'    && deity==='Earth');
    var isRenJia  = (ti==='Ren'  && door==='JingS' && deity==='Earth');
    var isShenJia = (ti==='Bing' && door==='JingS' && deity==='Commander');
    var isGuiJia  = (ti==='Ding' && door==='Du'    && deity==='Earth');
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

  // ── PURPOSE-AWARE ACTIVATION SCAN (canonical §1+§2 path) ──────────────────
  // Iterates days/hours through the canonical checkHourAtPalace gate
  // (formationFlags §1 + directionGate §2), optionally filtered to a
  // purpose's primary door. purposeKey = ''/null → general canonical scan.
  //
  // targetDir:
  //   - 'N','NE',… → scan only that palace (used for Water, where palace is fixed)
  //   - '' / null   → scan ALL 8 outer palaces (the purpose can match at any quadrant)
  //
  // Results include .palace and .dir so the caller knows WHERE the match happened.
  var _PAL_DIR = {1:'N',2:'SW',3:'E',4:'SE',6:'NW',7:'W',8:'NE',9:'S'};
  function scanWaterPurpose(targetDir, startDateStr, numDays, purposeKey){
    var palaces;
    if(targetDir && DIR_TO_PALACE[targetDir]){
      palaces = [DIR_TO_PALACE[targetDir]];
    } else {
      palaces = [1,2,3,4,6,7,8,9]; // all 8 outer palaces
    }
    var purpose = purposeKey ? (FS_PURPOSE_DOORS[purposeKey] || null) : null;
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
        for(var pi=0; pi<palaces.length; pi++){
          var pal = palaces[pi];
          var res = checkHourAtPalace(Y, M, D, hp.stem, hp.branch, pal, { purpose: purpose });
          if(res && res.matched){
            results.push({
              date: Y + '-' + String(M).padStart(2,'0') + '-' + String(D).padStart(2,'0'),
              weekday: WEEKDAYS_IT[date.getDay()],
              hourHan: STEM_HAN[hp.stem] + BR_HAN[hp.branch],
              hourTime: hp.time,
              hidx: (d * 100) + h,   // chronological key: day index * 100 + hour-of-day index
              dun: info.dun, ju: info.ju, jieQi: info.jqPy,
              score: res.score || 0,
              hits: res.hits || [],
              cell: res.cell,
              palace: pal,
              dir: _PAL_DIR[pal] || '?',
              purposeDoor: res.purposeDoor || null
            });
          }
        }
      }
    }
    // Sort: best score first; within same score, by date
    results.sort(function(a,b){ return (b.score-a.score) || (a.date<b.date ? -1 : a.date>b.date ? 1 : 0); });
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
  // ── Palace formation flags + Void (shared rule set, used by all scans) ─────
  // Disqualifying formations for activation:
  //   • stem CLASH 相冲 (甲庚 乙辛 丙壬 丁癸) — EXCUSED if the palace carries the Commander 值符
  //   • 丙庚 (either order)
  //   • 庚己 (either order) — unless the Pillar star 天柱 is present
  // ════════════════════════════════════════════════════════════════════════
  // CANONICAL QMDJ RULES — single source of truth (see QMDJ-RULES.md).
  // Consumed by every section: Water/FS activation (flying 飛盤), special Qimen
  // scan, directions and travel (rotating 轉盤). No section re-implements these.
  // ════════════════════════════════════════════════════════════════════════
  var _QM_STEM_CLASH = { Jia:'Geng', Geng:'Jia', Yi:'Xin', Xin:'Yi', Bing:'Ren', Ren:'Bing', Ding:'Gui', Gui:'Ding' };
  // Wu 戊 ranks alongside San Qi 乙丙丁 (favourable, with a lucky door).
  var _QM_SANQI_WU = { Yi:1, Bing:1, Ding:1, Wu:1 };
  // Favourable doors 三吉門(+景): Open 開, Rest 休, Birth 生, View 景.
  var _QM_FAV_DOOR = { Kai:1, Xiu:1, Sheng:1, JingS:1 };

  function _qmIsCommander(cell){ return !!cell && (cell.zhiFu === true || cell.deity === 'Commander' || cell.deity === '\u503c\u7b26'); }
  function _qmHasStem(cell, s){ return cell && (cell.ti === s || cell.di === s); }
  function _qmPairIs(cell, a, b){ return cell && ((cell.ti === a && cell.di === b) || (cell.ti === b && cell.di === a)); }
  function _qmGengIsCommander(cell){ return _qmIsCommander(cell) && cell.cmdStem === 'Geng'; }
  function _qmHasSanQiWu(cell){ return !!cell && (_QM_SANQI_WU[cell.ti] === 1 || _QM_SANQI_WU[cell.di] === 1); }
  function _qmFavDoor(cell){ return !!cell && _QM_FAV_DOOR[cell.doorCode] === 1; }

  // §1 — UNIVERSAL EXCLUSIONS. A disqualified palace is out, in every section.
  function formationFlags(cell){
    var reasons = [], disq = false;
    if(cell){
      // Stem clash 相冲 — excused only if the palace carries the Commander 值符.
      if(_QM_STEM_CLASH[cell.ti] === cell.di){
        if(_qmIsCommander(cell)) reasons.push('clash ' + (cell.tiH||cell.ti) + (cell.diH||cell.di) + ' excused by Commander \u503c\u7b26');
        else { disq = true; reasons.push('clash ' + (cell.tiH||cell.ti) + (cell.diH||cell.di) + ' \u76f8\u51b2'); }
      }
      // 丙庚 — excluded unless Geng hides the Commander (on Tian or Di plate).
      if(_qmPairIs(cell, 'Bing', 'Geng')){
        if(_qmGengIsCommander(cell)) reasons.push('\u4e19\u5e9a excused — Geng hides Commander \u503c\u7b26');
        else { disq = true; reasons.push('\u4e19\u5e9a formation'); }
      }
      // 戊辛 (Wu+Xin, either order) — excluded unless either stem hides the Commander.
      if(_qmPairIs(cell, 'Wu', 'Xin')){
        if(_qmIsCommander(cell) && (cell.cmdStem === 'Wu' || cell.cmdStem === 'Xin'))
          reasons.push('\u620a\u8f9b excused — stem hides Commander \u503c\u7b26');
        else { disq = true; reasons.push('\u620a\u8f9b formation'); }
      }
      // 壬己 (Ren+Ji, either order) — excluded unless either stem hides the Commander.
      if(_qmPairIs(cell, 'Ren', 'Ji')){
        if(_qmIsCommander(cell) && (cell.cmdStem === 'Ren' || cell.cmdStem === 'Ji'))
          reasons.push('\u58ec\u5df1 excused — stem hides Commander \u503c\u7b26');
        else { disq = true; reasons.push('\u58ec\u5df1 formation'); }
      }
      // 庚己 — 庚 hides 申 and 己 hides 戌 (甲申庚 · 甲戌己), so the pair is two thirds of the
      // metal combination 申酉戌: supply 酉 and the negative is annulled. 酉 comes from the
      // Pillar star 天柱 or from the Dui 兌 palace (both originate in palace 7). The old rule
      // (Pillar + favourable door) is the keyhole view of this — kept as a fallback for callers
      // that pass no palace. §2 requires a favourable door anyway.
      if(_qmPairIs(cell, 'Geng', 'Ji')){
        var _gj = _qmBranchInGroup(cell, cell.palace, 'You');
        if(_gj && _gj.label === '\u7533\u9149\u620c') reasons.push('\u5e9a\u5df1 annulled — ' + _gj.label + ' metal combination complete');
        else if(cell.star === 'Pillar' && _qmFavDoor(cell)) reasons.push('\u5e9a\u5df1 ok — Pillar \u5929\u67f1 + favourable door');
        else { disq = true; reasons.push('\u5e9a\u5df1 formation'); }
      }
      // Geng sitting with a Commander that is NOT Geng (above or below) — always excluded.
      if(_qmHasStem(cell, 'Geng') && _qmIsCommander(cell) && cell.cmdStem !== 'Geng'){
        disq = true; reasons.push('Geng \u5e9a oppressing Commander \u503c\u7b26');
      }
      // Warrior 玄武 — always excluded.
      if(cell.deity === 'Warrior'){ disq = true; reasons.push('Warrior \u7384\u6b66 \u51f6\u795e'); }
      // Tiger 白虎 — kept only with San Qi/Wu AND a favourable door.
      if(cell.deity === 'Tiger'){
        if(_qmHasSanQiWu(cell) && _qmFavDoor(cell)) reasons.push('Tiger \u767d\u864e kept — San Qi/Wu + favourable door');
        else { disq = true; reasons.push('Tiger \u767d\u864e \u51f6\u795e'); }
      }
    }
    return { disqualified: disq, reasons: reasons };
  }
  // palaceFlags kept as the public name (now a thin alias over the canonical predicate).
  function palaceFlags(cell){ return formationFlags(cell); }

  // §2 — MANDATORY GATE (San Qi/Wu + favourable door). Applies to BOTH charts.
  // Only exception: Injury door 傷 (Shang) admitted for TRAVEL, and only with San Qi/Wu.
  function directionGate(cell, opts){
    opts = opts || {};
    if(!cell) return { eligible:false, reasons:['no cell'] };
    if(!_qmHasSanQiWu(cell)) return { eligible:false, reasons:['no San Qi/Wu \u4e59\u4e19\u4e01/\u620a'] };
    var fav = _qmFavDoor(cell);
    var injuryTravel = !!opts.travel && cell.doorCode === 'Shang';   // San Qi already required above
    // FS Purpose: a purpose may redeem its NON-favourable primary door, but a
    // non-favourable door (e.g. Legal → JingF 驚) is redeemed by San Qi 三奇 (乙丙丁)
    // ONLY — not by Wu 戊. (Wu is acceptable only together with a FAVOURABLE door.)
    var purposeRedeem = false;
    if(opts.purpose && opts.purpose.allowNonFav && opts.purpose.doors &&
       opts.purpose.doors.indexOf(cell.doorCode) !== -1){
      purposeRedeem = (SAN_QI.indexOf(cell.ti) !== -1 || SAN_QI.indexOf(cell.di) !== -1);
    }
    if(!fav && !injuryTravel && !purposeRedeem) return { eligible:false, reasons:['no favourable door'] };
    var rs = [];
    if(injuryTravel)              rs.push('Injury \u50b7 redeemed by San Qi (travel)');
    if(purposeRedeem && !fav)     rs.push((DOOR_TAG_LABELS[cell.doorCode]||cell.doorCode) + ' redeemed by San Qi (' + (opts.purpose.label||'purpose') + ')');
    return { eligible:true, reasons: rs };
  }
  // 旬空 (Void) is based on the DAY pillar's decade — NOT the hour. The decade's two
  // empty branches map to their palace(s). E.g. day 戊辰 (甲子 decade) → void 戌亥 → NW 乾.
  var _QM_VOID_BY_DECADE = [ ['Xu','Hai'], ['Shen','You'], ['Wu','Wei'], ['Chen','Si'], ['Yin','Mao'], ['Zi','Chou'] ];
  var _QM_BR_TO_PAL = { Zi:1, Chou:8, Yin:8, Mao:3, Chen:4, Si:4, Wu:9, Wei:2, Shen:2, You:7, Xu:6, Hai:6 };
  var _QM_BR_H = { Zi:'\u5b50', Chou:'\u4e11', Yin:'\u5bc5', Mao:'\u536f', Chen:'\u8fb0', Si:'\u5df3', Wu:'\u5348', Wei:'\u672a', Shen:'\u7533', You:'\u9149', Xu:'\u620c', Hai:'\u4ea5' };
  function voidInfoForIdx(idx60){
    if(idx60 == null || idx60 < 0) return { palaces: [], branches: [] };
    var brs = _QM_VOID_BY_DECADE[Math.floor(idx60 / 10)] || [];
    var pals = []; brs.forEach(function(b){ var p = _QM_BR_TO_PAL[b]; if(pals.indexOf(p) < 0) pals.push(p); });
    return { palaces: pals, branches: brs.map(function(b){ return _QM_BR_H[b]; }) };
  }
  // Day pillar (pinyin + 60-jiazi index), TST boundary when available.
  var _QM_BR_CLASH = { Zi:'Wu', Wu:'Zi', Chou:'Wei', Wei:'Chou', Yin:'Shen', Shen:'Yin', Mao:'You', You:'Mao', Chen:'Xu', Xu:'Chen', Si:'Hai', Hai:'Si' };
  function dayPillarPin(Y, M, D){
    var dG = null, dZ = null;
    try {
      if(typeof XKDGSolarTime !== 'undefined' && XKDGSolarTime.currentLonTz){
        var lt = XKDGSolarTime.currentLonTz();
        if(lt && isFinite(lt.lonDeg)){
          var P = XKDGSolarTime.pillarsFromCivil(Y, M, D, 12, 0, 0, lt.lonDeg, lt.tzOffsetMin);
          dG = P.day.charAt(0); dZ = P.day.charAt(1);
        }
      }
    } catch(e){}
    if(!dG){ try { var ec = Solar.fromYmd(Y, M, D).getLunar().getEightChar(); dG = ec.getDayGan(); dZ = ec.getDayZhi(); } catch(e){ return null; } }
    var sp = STEM_H2P[dG] || dG, bp = BR_H2P[dZ] || dZ;
    return { stem: sp, branch: bp, idx: jiaZiIdx(sp, bp) };
  }
  // Void palaces for a DAY, applying 冲空填实: a decade-void branch CLASHED by the day
  // branch is "filled" (no longer void), so its palace is not flagged void that day.
  function dayVoidPalaces(Y, M, D){
    var dp = dayPillarPin(Y, M, D);
    if(!dp || dp.idx < 0) return { palaces: [], branches: [], filledPalaces: [] };
    var vbrs = _QM_VOID_BY_DECADE[Math.floor(dp.idx / 10)] || [];
    var fills = _QM_BR_CLASH[dp.branch];                 // branch the day clashes (fills)
    var byPal = {};
    vbrs.forEach(function(b){ var p = _QM_BR_TO_PAL[b]; (byPal[p] = byPal[p] || []).push(b); });
    var palaces = [], branches = [], filledPalaces = [];
    Object.keys(byPal).forEach(function(pk){
      var p = +pk, bs = byPal[pk];
      if(bs.indexOf(fills) >= 0){ filledPalaces.push(p); }   // day clashes one of this palace's void branches → filled
      else { palaces.push(p); bs.forEach(function(b){ branches.push(_QM_BR_H[b]); }); }
    });
    return { palaces: palaces, branches: branches, filledPalaces: filledPalaces };
  }

  function checkHourAtPalace(year, month, day, hourStem, hourBranch, palace, opts){
    opts = opts || {};
    var purpose = opts.purpose || null;   // resolved FS_PURPOSE_DOORS entry, or null
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
      starCode: cell[2],          // raw star code — origin palace lookup for the branch layer
      palace: palace,             // the palace itself carries a branch (申子辰 / 申酉戌 …)
      deity: cell[3],
      door:  DOOR_NAME[cell[4]]||cell[4],
      doorCode: cell[4],
      cmdStem: chart.ld,
      zhiFu:  isZhiFu,
      zhiShi: isZhiShi,
      jiaName: isZhiFu ? (JIA_HIDE[chart.ld]||'') : ''
    };

    var flags = palaceFlags(cellInfo);
    var isVoid = dayVoidPalaces(year, month, day).palaces.indexOf(palace) >= 0;

    if(flags.disqualified) return { matched: false, hits: [], score: 0, cell: cellInfo, disqualified: true, flags: flags.reasons, isVoid: isVoid };
    // §2 gate — San Qi/Wu + favourable door is mandatory for activation too (flying 飛盤).
    // A purpose may redeem its own non-favourable primary door (e.g. Legal JingF) with San Qi.
    var gate = directionGate(cellInfo, { travel: false, purpose: purpose });
    if(!gate.eligible) return { matched: false, hits: [], score: 0, cell: cellInfo, disqualified: true, flags: flags.reasons.concat(gate.reasons), gateFail: true, isVoid: isVoid };

    // Purpose door filter — when a purpose specifies primary doors, the palace door
    // must match. Water purpose has doors:null → no filter (any favourable door is fine).
    if(purpose && purpose.doors && purpose.doors.indexOf(cellInfo.doorCode) === -1){
      return { matched: false, hits: [], score: 0, cell: cellInfo, isVoid: isVoid, flags: flags.reasons, purposeMismatch: true };
    }

    // extractHits filters out non-favourable doors, so for a purpose whose primary door
    // is non-favourable (Legal JingF) the hit list is empty even though the gate passed.
    // Synthesize a canonical hit list from the gated cell in that case.
    if(hits.length === 0){
      if(purpose){
        hits = [{ cat:'door', label:(DOOR_TAG_LABELS[cellInfo.doorCode] || cellInfo.door) }];
        if(SAN_QI.indexOf(cellInfo.ti) !== -1)      hits.push({ cat:'qi', label:(QI_TAG_LABELS[cellInfo.ti] || cellInfo.ti) });
        else if(SAN_QI.indexOf(cellInfo.di) !== -1) hits.push({ cat:'qi', label:(QI_TAG_LABELS[cellInfo.di] || cellInfo.di) });
        if(cellInfo.zhiFu)  hits.push({ cat:'zhi', label:'Zhi Fu \u76f4\u7b26' });
        if(cellInfo.zhiShi) hits.push({ cat:'zhi', label:'Zhi Shi \u76f4\u4f7f' });
      } else {
        return { matched: false, hits: [], score: 0, cell: cellInfo, isVoid: isVoid, flags: flags.reasons };
      }
    }

    var pos = 0, neg = 0;
    for(var i = 0; i < hits.length; i++){
      if(hits[i].cat === 'pen') neg++; else pos++;
    }
    var score = pos - neg;

    // ── 三合 / 三會 INSIDE the palace (Edu, canonical) ──────────────────────
    // A completed group is read against the PALACE's own element:
    //   generates the palace → +2 · same element → +1 · neutral → 0 ·
    //   CONTROLS the palace → the hour is dropped from the selection entirely.
    // Applies to the FS/water activation path (a purpose is set); the neutralizing
    // effect on Geng / 庚己 lives in extractHits and formationFlags and is universal.
    var _bg = null;
    if(purpose){
      _bg = detectBranchGroups(cellInfo, palace);
      if(_bg.controls){
        var _ctl = _bg.groups.filter(function(g){ return g.relation === 'controls'; })[0];
        return { matched: false, hits: [], score: 0, cell: cellInfo, disqualified: true, isVoid: isVoid,
                 flags: flags.reasons.concat([_ctl.label + ' ' + _ctl.element + ' controls the ' +
                        (PALACE_ELEMENT[palace] || '?') + ' palace']) };
      }
      score += _bg.bonus;
      _bg.groups.forEach(function(g){
        if(g.relation === 'neutral') return;   // present but with no effect — not worth a hit line
        hits = hits.concat([{ cat:'combo', label: g.label + ' ' + (g.kind === 'trine' ? '\u4e09\u5408' : '\u4e09\u6703') +
                              ' ' + g.element + ' ' + (g.relation === 'generates' ? '\u2192 generates palace' : '= palace element') }]);
      });
    }

    // Wu 戊 alone (Edu): counted only WITH a favourable door and with NO penalty in the
    // palace. §1 already removed clashes, §2 already required the favourable door for a
    // purpose that does not redeem a non-favourable one — both are re-checked here so the
    // rule stands on its own and does not depend on the caller's path.
    if(purpose && purpose.wuBonus && (cellInfo.ti === 'Wu' || cellInfo.di === 'Wu') &&
       _qmFavDoor(cellInfo) && neg === 0 && !flags.disqualified){
      score += 1;
      hits = hits.concat([{ cat:'combo', label:'\u620a in Wealth palace' }]);
    }
    // Wu+Bing pairing (戊丙 / 丙戊) — highly valued; takes PRIORITY among Wu cases.
    // 戊↑丙 = Wu on Tian over Bing on Di; 丙↑戊 = Bing on Tian over Wu on Di.
    if(purpose && ((cellInfo.ti === 'Wu' && cellInfo.di === 'Bing') ||
                   (cellInfo.ti === 'Bing' && cellInfo.di === 'Wu'))){
      score += 2;
      var comboLbl = (cellInfo.ti === 'Wu') ? '\u620a\u2191\u4e19' : '\u4e19\u2191\u620a';
      var found = false;
      hits = hits.map(function(h){
        if(h.label === '\u620a\u2191\u4e19' || h.label === '\u4e19\u2191\u620a'){ found = true; return { cat:'combo', label:h.label + ' \u2605' }; }
        return h;
      });
      if(!found) hits = hits.concat([{ cat:'combo', label:comboLbl + ' \u2605' }]);

      // PREMIUM (Wealth): Birth door (already required) + 戊丙/丙戊 + Commander 值符
      // and/or Zhi Shi 值使 → top tier, scored above everything else.
      if(purpose && purpose.premiumWuBing){
        var hasCmd = !!cellInfo.zhiFu, hasShi = !!cellInfo.zhiShi;
        if(hasCmd || hasShi){
          score += (hasCmd ? 2 : 0) + (hasShi ? 2 : 0);   // up to +4 when both present
          var prem = '\uD83D\uDC8E PREMIUM';
          if(hasCmd && hasShi) prem += ' (\u503c\u7b26+\u503c\u4f7f)';
          else if(hasCmd)      prem += ' (\u503c\u7b26)';
          else                 prem += ' (\u503c\u4f7f)';
          hits = hits.concat([{ cat:'combo', label: prem }]);
        }
      }
    }
    // ── Purpose / Commander effectiveness boosters (additive; never gate) ──
    try {
      // Commander 值符, wherever it is, increases effectiveness (any purpose).
      var _hasCmdHit = hits.some(function(h){ return h.label && (h.label.indexOf('Commander') >= 0 || h.label.indexOf('\u503c\u7b26') >= 0); });
      if((cellInfo.deity === 'Commander' || cellInfo.zhiFu) && !_hasCmdHit){
        score += 1; hits = hits.concat([{ cat:'combo', label:'\u503c\u7b26 Commander \u2605' }]);
      }
      var _pk = purpose && purpose.mainPurpose;
      if(_pk){
        var _qs = PURPOSE_QM_STARS[_pk];
        if(_qs && _qs.indexOf(cellInfo.star) !== -1){ score += 1; hits = hits.concat([{ cat:'combo', label:'\u2605 ' + cellInfo.star + ' star' }]); }
        var _qd = PURPOSE_QM_SPIRITS[_pk];
        if(_qd && _qd.indexOf(cellInfo.deity) !== -1){ score += 1; hits = hits.concat([{ cat:'combo', label:'\u2605 ' + cellInfo.deity + ' spirit' }]); }
      }
    } catch(e){}
    // \u2605 SUPERIOR CONFIGURATION (any purpose): the Commander \u503c\u7b26 sitting on a
    // San Qi \u4e09\u5947 (\u4e59\u4e19\u4e01 \u2014 a "Wonder") together with a favourable door is a
    // top, hard-to-beat activation pattern and must score clearly above an ordinary
    // favourable hour. Additive on top of the normal hits; never gates.
    try {
      var _supCmd = (cellInfo.zhiFu || cellInfo.deity === 'Commander');
      var _supSanQi = (SAN_QI.indexOf(cellInfo.ti) !== -1 || SAN_QI.indexOf(cellInfo.di) !== -1);  // genuine Wonder \u4e59\u4e19\u4e01 (not Wu)
      var _supFav = FAV_DOORS.indexOf(cellInfo.doorCode) !== -1;
      if(_supCmd && _supSanQi && _supFav){
        score += 4;   // premium elevation \u2014 a superior, hard-to-beat configuration
        hits = hits.concat([{ cat:'combo', label:'\uD83D\uDC8E \u503c\u7b26 on San Qi \u4e09\u5947 + favourable door (superior)' }]);
      }
    } catch(e){}
    return { matched: true, hits: hits, score: score, cell: cellInfo, isVoid: isVoid, flags: flags.reasons, purposeDoor: purpose ? cellInfo.doorCode : null };
  }

  // ── getHourChart: returns full 9-palace chart data for rendering ──
  // Returns { palaces: {1:{ti,tiH,di,diH,star,deity,door,zhiFu,zhiShi,jiaName}, ...}, dun, ju }
  // or null if chart not found.
  function getHourChart(year, month, day, hourStem, hourBranch, bjInstant){
    var charts = _charts || EMBEDDED_CHARTS;
    if(!charts) return null;
    var info = getDunJuForDate(year, month, day, bjInstant);
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
        starCode: cell[2],          // raw star code — origin palace lookup for the branch layer
        palace: p,                  // the palace carries its own branch(es)
        deity: cell[3],
        door: DOOR_NAME[cell[4]]||cell[4],
        doorCode: cell[4],          // raw door code (Kai/Xiu/Sheng/JingS/Shang…) for rule gates
        cmdStem: chart.ld,          // lead/Commander stem of the xun (for Geng↔Commander rules)
        zhiFu: isZF,
        zhiShi: (chart.zsp === p),
        jiaName: isZF ? (JIA_HIDE[chart.ld]||'') : ''
      };
    }
    var _vp = dayVoidPalaces(year, month, day);
    return { palaces: palaces, dun: info.dun, ju: info.ju, voidPalaces: _vp.palaces, voidBranches: _vp.branches };
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

  function getRotatingHourChart(year, month, day, hourStem, hourBranch, bjInstant){
    var info = getDunJuForDate(year, month, day, bjInstant);
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

    // When the 旬首 (fu-head) sits in the CENTER (palace 5), it lodges to Kun (2)
    // for the rigid ring rotation of stars AND gates — exactly as tgt does above.
    // Without this, R_COMP.indexOf(5) === -1 poisons both shifts. The 值使 gate
    // ADVANCE (below) still starts from the real xpal, so center counts as a step.
    var xpalRing = (xpal === 5) ? 2 : xpal;

    // Stars — rigid compass rotation from xpalRing to tgt
    var sS = R_COMP.indexOf(tgt) - R_COMP.indexOf(xpalRing);
    var starAt = {};
    for(var i=0; i<8; i++) starAt[R_COMP[((i+sS)%8+8)%8]] = R_COMP[i];
    starAt[5] = 5;

    // Deities — from 值符 (at tgt), cw (Yang) / ccw (Yin)
    var deityMap = {};
    var iF = R_COMP.indexOf(tgt);
    for(var dd=0; dd<8; dd++){
      deityMap[dun==='yang' ? R_COMP[(iF+dd)%8] : R_COMP[((iF-dd)%8+8)%8]] = dd;
    }

    // Gates — 值使 advances from the real xpal by k steps (center counts as a
    // step); then a rigid rotation on the same compass ring as the stars.
    var g = xpal;
    for(var s=0; s<k; s++) g = dun==='yang' ? (g%9+1) : ((g-2+9)%9+1);
    if(g===5) g=2;
    var gS = R_COMP.indexOf(g) - R_COMP.indexOf(xpalRing);
    var gateHome = {};
    for(var i=0; i<8; i++) gateHome[R_COMP[((i+gS)%8+8)%8]] = R_COMP[i];

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
        doorCode: doorKey,  // canonical rule gates read doorCode
        doorName: doorName, // English name for display
        cmdStem: xstem,     // 旬首 lead/Commander stem (for Geng↔Commander rules)
        zhiFu: (pn===isZhiFu),
        zhiShi: (pn===zhiShi),
        jiaName: ''
      };
    }
    // Fowl (天禽) + the central-palace stem are "migrants": on the moving Tien Pan they
    // always travel WITH Rice (天芮); on the static Di Pan they are housed at SW (Kun, 2).
    // Expose the second star/stem so the directional flow analysis reads the full palace.
    var centerStem = dp[5];
    if (centerStem) {
      for (var rp = 1; rp <= 9; rp++) {
        if (rp === 5 || !palaces[rp]) continue;
        if (palaces[rp].star === 'Rice') {
          palaces[rp].star2 = 'Fowl';
          palaces[rp].ti2 = centerStem; palaces[rp].ti2H = STEM_P2H_R[centerStem] || centerStem;
        }
      }
      if (palaces[2]) { palaces[2].di2 = centerStem; palaces[2].di2H = STEM_P2H_R[centerStem] || centerStem; }
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
    // CANONICAL: Warrior 玄武 is ALWAYS excluded — no exception, in every section.
    if(deity === 'Warrior') return [];
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
    // Purpose-aware canonical scan (§1 formationFlags + §2 directionGate), optionally
    // filtered to a Purpose's primary door. purposeKey '' / null → general canonical scan.
    scanWaterPurpose: function(dir, start, days, purposeKey){
      if(!_charts) _charts = EMBEDDED_CHARTS;
      if(!_charts) throw new Error('Embedded charts not loaded (qmdj-water-scanner-data.js missing?).');
      return scanWaterPurpose(dir, start, days, purposeKey);
    },
    fsPurposeDoors: function(){ return FS_PURPOSE_DOORS; },
    validDirections: function(){ return Object.keys(DIR_TO_PALACE); },
    degToPalace: degToPalace,
    checkHourAtPalace: function(year, month, day, hourStem, hourBranch, palace, opts){
      return checkHourAtPalace(year, month, day, hourStem, hourBranch, palace, opts);
    },
    getHourChart: function(year, month, day, hourStem, hourBranch, bjInstant){
      return getHourChart(year, month, day, hourStem, hourBranch, bjInstant);
    },
    getRotatingHourChart: function(year, month, day, hourStem, hourBranch, bjInstant){
      return getRotatingHourChart(year, month, day, hourStem, hourBranch, bjInstant);
    },
    checkRotatingPalace: function(chart, palace){
      return checkRotatingPalace(chart, palace);
    },
    palaceFlags: function(cell){ return palaceFlags(cell); },
    formationFlags: function(cell){ return formationFlags(cell); },
    // 三合 / 三會 completed inside one palace, read against the palace element.
    // cell needs {ti,di,star|starCode,doorCode} and either a `palace` field or the 2nd argument.
    detectBranchGroups: function(cell, palace){ return detectBranchGroups(cell, palace); },
    directionGate: function(cell, opts){ return directionGate(cell, opts); },
    voidInfoForIdx: function(idx60){ return voidInfoForIdx(idx60); },
    dayVoidPalaces: function(Y, M, D){ return dayVoidPalaces(Y, M, D); },
    // Public helper: the 12 hour pillars (時辰) of a civil date, with Chinese
    // stem/branch and the clock range — used by the QMDJ Chart tool to turn a
    // chosen date + 時辰 into the (stem, branch) that showQimenChart needs.
    hourPillarsForDate: function(Y, M, D){
      try {
        var info = getDunJuForDate(Y, M, D);
        if(!info) return null;
        return getHourPillarsForDay(info.dayStem).map(function(p){
          return { stem:p.stem, branch:p.branch, stemHan:STEM_HAN[p.stem], branchHan:BR_HAN[p.branch], time:p.time };
        });
      } catch(e){ return null; }
    }
  };
})();

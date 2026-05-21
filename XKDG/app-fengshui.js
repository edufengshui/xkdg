// ═══════════════════════════════════════════════════════════════════
//  FENG SHUI LUOPAN MODULE
//  Integrated into the XKDG Calendar. Reuses existing helpers:
//   - XKDG_TABLE         (jiazi → {hex, qi, yun, alt})
//   - JIAZI_FAMILY_DATA  (jiazi → [{family, role}])
//   - isHetuPair, getInverseHex
//   - HEX_NAMES (for hex 2-64 — we add 1 below if missing)
// ═══════════════════════════════════════════════════════════════════

// SEQ: clockwise hex layout from 180°. Hex 44 starts at 180°.
const FS_SEQ = [44,28,50,32,57,48,18,46,6,47,64,40,59,29,4,7,33,31,56,62,
                53,39,52,15,12,45,35,16,20,8,23,2,24,27,3,42,51,21,17,25,
                36,22,63,37,55,30,49,13,19,41,60,61,54,38,58,10,11,26,5,9,
                34,14,43,1];

// Trigram binary table — bottom-to-top
const FS_BIN = {
  1:0b111111,2:0b000000,3:0b010001,4:0b100010,5:0b010111,6:0b111010,7:0b000010,8:0b010000,
  9:0b110111,10:0b111011,11:0b000111,12:0b111000,13:0b111101,14:0b101111,15:0b000100,16:0b001000,
  17:0b011001,18:0b100110,19:0b000011,20:0b110000,21:0b101001,22:0b100101,23:0b100000,24:0b000001,
  25:0b111001,26:0b100111,27:0b100001,28:0b011110,29:0b010010,30:0b101101,31:0b011100,32:0b001110,
  33:0b111100,34:0b001111,35:0b101000,36:0b000101,37:0b110101,38:0b101011,39:0b010100,40:0b001010,
  41:0b100011,42:0b110001,43:0b011111,44:0b111110,45:0b011000,46:0b000110,47:0b011010,48:0b010110,
  49:0b011101,50:0b101110,51:0b001001,52:0b100100,53:0b110100,54:0b001011,55:0b001101,56:0b101100,
  57:0b110110,58:0b011011,59:0b110010,60:0b010011,61:0b110011,62:0b001100,63:0b010101,64:0b101010
};
const FS_XT  = {Qian:9,Dui:4,Li:3,Zhen:8,Xun:2,Kan:7,Gen:6,Kun:1};
const FS_TRI = {Qian:[1,1,1],Dui:[1,1,0],Li:[1,0,1],Zhen:[1,0,0],
                Xun:[0,1,1],Kan:[0,1,0],Gen:[0,0,1],Kun:[0,0,0]};

function fsTrigramName(trio){
  for (const [n,v] of Object.entries(FS_TRI))
    if (v[0]===trio[0]&&v[1]===trio[1]&&v[2]===trio[2]) return n;
  return 'Kun';
}
function fsQiYun(num){
  const b=FS_BIN[num]||0;
  const lines=[]; for (let i=5;i>=0;i--) lines.push((b>>i)&1);
  const low=[lines[5],lines[4],lines[3]], upp=[lines[2],lines[1],lines[0]];
  const same=[0,1,2].map(i=>low[i]===upp[i]?1:0);
  const ns=same.reduce((a,b)=>a+b,0), nd=3-ns;
  let yun;
  if (nd===0) yun=1;
  else if (nd===3) yun=9;
  else if (ns===1 && same[0]) yun=2;
  else if (ns===1 && same[1]) yun=3;
  else if (ns===1 && same[2]) yun=4;
  else if (nd===1 && !same[0]) yun=8;
  else if (nd===1 && !same[1]) yun=7;
  else if (nd===1 && !same[2]) yun=6;
  else yun=5;
  const uName=fsTrigramName(upp);
  return {qi: FS_XT[uName], yun, upper: uName, lower: fsTrigramName(low)};
}

// ── Period system (Zheng Shen / Ling Shen) ─────────────────────
let FS_POST_2044 = false;
function fsIsZhengShen(yun){ return FS_POST_2044 ? yun<=4 : yun>=6; }
function fsIsLingShen(yun){  return FS_POST_2044 ? yun>=6 : yun<=4; }

// ── getHexFamilies — derived from JIAZI_FAMILY_DATA + XKDG_TABLE ──
// For a given hex number, return set of families it belongs to.
// Walks all jiazi; if jiazi's hex (or alt.hex) == hexNum, accumulate its families.
let _FS_HEX_FAMILIES = null;
function getHexFamilies(hexNum){
  if (!_FS_HEX_FAMILIES){
    _FS_HEX_FAMILIES = {};
    for (const jz in XKDG_TABLE){
      const entry = XKDG_TABLE[jz];
      const fams = (JIAZI_FAMILY_DATA[jz] || []).map(e => e.family);
      if (fams.length === 0) continue;
      const targets = [entry.hex];
      if (entry.alt && entry.alt.hex) targets.push(entry.alt.hex);
      targets.forEach(h => {
        if (!_FS_HEX_FAMILIES[h]) _FS_HEX_FAMILIES[h] = new Set();
        fams.forEach(f => _FS_HEX_FAMILIES[h].add(f));
      });
    }
    // Convert sets to arrays
    Object.keys(_FS_HEX_FAMILIES).forEach(h => {
      _FS_HEX_FAMILIES[h] = Array.from(_FS_HEX_FAMILIES[h]);
    });
  }
  return _FS_HEX_FAMILIES[hexNum] || [];
}

// ── hexConnectionLabels — 5-rule check, source ↔ destination ─────
// Direct check (no setting prerequisite). Used for hex↔hex pairings
// like facing↔water and facing↔person, where neither side has a
// 4-pillar context.
function hexConnectionLabels(srcHex, srcQi, srcYun, dstHex, dstQi, dstYun){
  const out = [];
  // 1. Hetu — qi or yun
  if (isHetuPair(srcQi, dstQi))   out.push('Hetu (qi)');
  if (isHetuPair(srcYun, dstYun)) out.push('Hetu (yun)');
  // 2. Adding — qi or yun sums to 5, 10, or 15
  const qSum = srcQi + dstQi, yS = srcYun + dstYun;
  if ([5,10,15].includes(qSum))  out.push('Adding qi='+qSum);
  if ([5,10,15].includes(yS))    out.push('Adding yun='+yS);
  // 3. Pure Qi — same qi or same yun
  if (srcQi  === dstQi)  out.push('Pure Qi (qi)');
  if (srcYun === dstYun) out.push('Pure Qi (yun)');
  // 4. Family — share at least one Jia Zi family
  const sf = getHexFamilies(srcHex);
  const df = getHexFamilies(dstHex);
  const shared = sf.filter(f => df.includes(f));
  if (shared.length) out.push('Family: ' + shared.join(','));
  // 5. Inverse — getInverseHex(src) === dst
  if (getInverseHex(srcHex) === dstHex) out.push('Inverse Hex');
  return out;
}

// ── Read date settings from _currentDayAnalysis.items ─────────────
// Each rule can only fire on a line (qi or yun) that the date already
// exhibits as a setting (e.g. "Hetu Periods" means yun-line Hetu).
function fsGetDateSettings(){
  const off = { hetuQi:false, hetuYun:false, addingQi:false, addingYun:false,
                pureQiQi:false, pureQiYun:false, family:false, inverse:false };
  if (typeof _currentDayAnalysis === 'undefined' || !_currentDayAnalysis) return off;
  const items = _currentDayAnalysis.items || [];
  const has = test => items.some(test);
  return {
    hetuQi:    has(i => i.text && i.text.includes('Hetu')   && i.text.includes('Elements')),
    hetuYun:   has(i => i.text && i.text.includes('Hetu')   && i.text.includes('Periods')),
    addingQi:  has(i => i.text && i.text.includes('Adding') && i.text.includes('Elements')),
    addingYun: has(i => i.text && i.text.includes('Adding') && i.text.includes('Periods')),
    pureQiQi:  has(i => i.text === 'Pure Qi' || i.text === 'Pure Qi Elements'),
    pureQiYun: has(i => i.text === 'Pure Qi' || i.text === 'Pure Qi Periods'),
    family:    has(i => i.tag === 'family'),
    inverse:   has(i => i.text && i.text.startsWith && i.text.startsWith('Inverse Hex')),
  };
}

// ── Extract family names the current date is bound to ─────────────
// (date has a Family setting only when all 4 pillars share that family
// AND the gender-balance rule passes; analyzeXkdg pushes items like
// {text:"XXX Family", tag:"family"} when so.)
function fsGetDateFamilies(){
  if (typeof _currentDayAnalysis === 'undefined' || !_currentDayAnalysis) return [];
  return (_currentDayAnalysis.items || [])
    .filter(i => i.tag === 'family' && i.text)
    .map(i => i.text.replace(/\s+Family$/,'').trim());
}

// ── hexDateConnectionLabels — facing ↔ day pillar ─────────────────
// Feng-shui rules: yun-line Hetu / Adding only. Pure Qi NOT used.
// Family path: the whole date is bound to a family AND the facing
// hex is in that same family (still requires facing to be Zheng Shen,
// enforced by caller).
function hexDateConnectionLabels(srcHex, srcQi, srcYun, dayHex, dayQi, dayYun, settings){
  const out = [];
  if (isHetuPair(srcYun, dayYun))                 out.push('Hetu (yun)');
  const yS = srcYun + dayYun;
  if ([5,10,15].includes(yS))                     out.push('Adding yun='+yS);
  const dateFams = fsGetDateFamilies();
  if (dateFams.length > 0){
    const srcFams = getHexFamilies(srcHex);
    const shared = srcFams.filter(f => dateFams.includes(f));
    if (shared.length) out.push('Family: ' + shared.join(','));
  }
  return out;
}

// ── waterMatchVsFacing — water ↔ facing pairing rules ─────────────
// Yun-line Hetu/Adding only (no Pure Qi, no Inverse, no qi-line).
// Family path: date is bound to a family AND water hex is in that
// family (independent of facing — facing has its own family path).
function fsWaterMatchVsFacing(facing, water){
  const labels = [];
  if (isHetuPair(water.yun, facing.yun))                  labels.push('Hetu (yun)');
  const yS = water.yun + facing.yun;
  if ([5,10,15].includes(yS))                             labels.push('Adding yun='+yS);
  const dateFams = fsGetDateFamilies();
  if (dateFams.length > 0){
    const wFams = getHexFamilies(water.hexNum);
    const shared = dateFams.filter(f => wFams.includes(f));
    if (shared.length) labels.push('Family: ' + shared.join(','));
  }
  return labels;
}

// ── fsWaterScore — qi-line points for ranking ─────────────────────
// Each qi-line Hetu/Adding hit adds 1 point. Higher score = better pair.
function fsWaterScore(facing, water){
  let score = 0;
  if (isHetuPair(water.qi, facing.qi))         score += 1;
  const qSum = water.qi + facing.qi;
  if ([5,10,15].includes(qSum))                score += 1;
  // Yin/Yang mountain match (Di Pan facing ↔ Tien Pan water): heavy bonus
  // so YY-aligned pairs always rank above non-aligned ones.
  if (fsYinYangMatch(facing.startDeg + 2.8125, water.centerDeg)) score += 3;
  return score;
}

// ── 24-Mountains Yin/Yang (Pure Yin / Pure Yang 净阴净阳) ──────────
// San He convention: Hetu pairings of trigrams with stems/branches.
//   YANG (12): 乾甲 Qian-Jia · 坤乙 Kun-Yi
//              · 离(午)壬寅戌 Li-Ren-Yin-Xu
//              · 坎(子)癸申辰 Kan-Gui-Shen-Chen
//   YIN  (12): 艮丙 Gen-Bing · 巽辛 Xun-Xin
//              · 震(卯)庚亥未 Zhen-Geng-Hai-Wei
//              · 兑(酉)丁巳丑 Dui-Ding-Si-Chou
// Order matches MTN_24 (compass clockwise from Ren centered at 345°).
const FS_MTN_YANG = [
  true,  true,  true,  false, false, true,    // Ren Zi Gui Chou Gen Yin
  true,  false, true,  true,  false, false,   // Jia Mao Yi Chen Xun Si
  false, true,  false, false, true,  true,    // Bing Wu Ding Wei Kun Shen
  false, false, false, true,  true,  false    // Geng You Xin Xu Qian Hai
];

// ── 24-Mountains → corresponding trigram (San He grouping) ────────
// Each mountain belongs to one of the 8 trigrams via the Hetu pairings above.
const FS_MTN_TRIGRAM = [
  'Li',   'Kan',  'Kan',  'Dui',  'Gen',  'Li',    // Ren Zi Gui Chou Gen Yin
  'Qian', 'Zhen', 'Kun',  'Kan',  'Xun',  'Dui',   // Jia Mao Yi Chen Xun Si
  'Gen',  'Li',   'Dui',  'Zhen', 'Kun',  'Kan',   // Bing Wu Ding Wei Kun Shen
  'Zhen', 'Dui',  'Xun',  'Li',   'Qian', 'Zhen'   // Geng You Xin Xu Qian Hai
];
// ── 24-Mountains → Chinese characters (for Flying Stars module) ───
// Same order as FS_MTN_TRIGRAM. Index 0 = Ren centered at 345°.
const FS_MTN_CHAR = [
  '壬', '子', '癸', '丑', '艮', '寅',  // Ren Zi Gui Chou Gen Yin
  '甲', '卯', '乙', '辰', '巽', '巳',  // Jia Mao Yi Chen Xun Si
  '丙', '午', '丁', '未', '坤', '申',  // Bing Wu Ding Wei Kun Shen
  '庚', '酉', '辛', '戌', '乾', '亥'   // Geng You Xin Xu Qian Hai
];
// Convert compass degrees → Chinese mountain character (one of 24).
// Each mountain occupies 15°. Ren (壬) is centered at 345°, so the index 0
// covers 337.5°-352.5°. Formula matches fsMountainTrigramDi.
function fsMountainCharFromDeg(deg){
  const d = ((deg % 360) + 360) % 360;
  const idx = Math.floor((d + 22.5) / 15) % 24;
  return FS_MTN_CHAR[idx];
}
const FS_TRIGRAM_SYM = {
  'Qian': '☰', 'Kun':  '☷', 'Li':   '☲', 'Kan':  '☵',
  'Gen':  '☶', 'Xun':  '☴', 'Zhen': '☳', 'Dui':  '☱'
};
const FS_TRIGRAM_ZH = {
  'Qian': '乾', 'Kun':  '坤', 'Li':   '离', 'Kan':  '坎',
  'Gen':  '艮', 'Xun':  '巽', 'Zhen': '震', 'Dui':  '兑'
};
// Pure YY trigram numbers (Lo Shu without center 5)
const FS_TRIGRAM_NUM = {
  'Kun':  1, 'Xun': 2, 'Li':   3, 'Dui':  4,
  'Gen':  6, 'Kan': 7, 'Zhen': 8, 'Qian': 9
};
// Trigram lines [bottom, middle, top] — 1=Yang, 0=Yin
const FS_TRIGRAM_LINES = {
  'Qian': [1,1,1], 'Kun':  [0,0,0],
  'Zhen': [1,0,0], 'Gen':  [0,0,1],
  'Li':   [1,0,1], 'Kan':  [0,1,0],
  'Dui':  [1,1,0], 'Xun':  [0,1,1]
};
// Compare two trigrams: returns array of indices (0=bottom, 1=middle, 2=top) where they differ
function fsTrigramLineDiff(t1, t2) {
  const l1 = FS_TRIGRAM_LINES[t1], l2 = FS_TRIGRAM_LINES[t2];
  if (!l1 || !l2) return [];
  const diffs = [];
  for (let i = 0; i < 3; i++) if (l1[i] !== l2[i]) diffs.push(i);
  return diffs;
}
// Compute Pure YY star name for facing/water trigram pair.
// Based on which lines differ between F and W trigrams.
// Lines: 0 = bottom (prima), 1 = middle (seconda), 2 = top (terza)
function fsPureYYStar(fTri, wTri) {
  return fsPureYYStarInfo(fTri, wTri).name;
}
// Same as fsPureYYStar but returns {name, auspicious} object.
// Auspicious stars: Fu Bi, Wu Qu, Tan Lang, Ju Men — these are also Pure YY matches.
// Inauspicious: Lian Zhen, Wen Qu, Po Jun, Lu Cun — these are NOT Pure YY matches.
function fsPureYYStarInfo(fTri, wTri) {
  if (!fTri || !wTri) return { name: '', auspicious: null };
  const diffs   = fsTrigramLineDiff(fTri, wTri);
  const diffKey = diffs.join(',');
  switch (diffKey) {
    case '':      return { name: 'Fu Bi',                       auspicious: true  }; // 0 changes
    case '0':     return { name: 'Lian Zhen',                   auspicious: false }; // only 1st
    case '1':     return { name: 'Wu Qu',                       auspicious: true  }; // only 2nd
    case '2':     return { name: 'Wen Qu',                      auspicious: false }; // only 3rd
    case '0,1':   return { name: 'Po Jun',                      auspicious: false }; // 1st + 2nd
    case '0,2':   return { name: 'Tan Lang',                    auspicious: true  }; // 1st + 3rd
    case '1,2':   return { name: 'Lu Cun',                      auspicious: false }; // 2nd + 3rd
    case '0,1,2': return { name: 'perfect match - Ju Men',      auspicious: true  }; // all three
    default:      return { name: '', auspicious: null };
  }
}

// Di Pan: mountain i centered at compass (i*15 − 15)°. Wu at 180°, Zi at 0°.
function fsMountainYangDi(deg){
  const d = ((deg % 360) + 360) % 360;
  const idx = Math.floor((d + 22.5) / 15) % 24;
  return FS_MTN_YANG[idx];
}
// Tien Pan: Di Pan rotated +7.5° clockwise. So Tien Pan at compass deg
// equals Di Pan at (deg − 7.5°).
function fsMountainYangTien(deg){
  return fsMountainYangDi(deg - 7.5);
}
// Trigram for a Di Pan mountain (used for Facing)
function fsMountainTrigramDi(deg){
  const d = ((deg % 360) + 360) % 360;
  const idx = Math.floor((d + 22.5) / 15) % 24;
  return FS_MTN_TRIGRAM[idx];
}
// Trigram for a Tien Pan mountain (used for Water): same shift as Yang lookup
function fsMountainTrigramTien(deg){
  return fsMountainTrigramDi(deg - 7.5);
}
function fsYinYangMatch(facingDeg, waterDeg){
  return fsMountainYangDi(facingDeg) === fsMountainYangTien(waterDeg);
}

// ── Hex slot lookup: deg → slot info ─────────────────────────────
function fsSlotForDeg(deg){
  const d = ((deg % 360) + 360) % 360;
  let off = (d - 180 + 360) % 360;
  let idx = Math.floor(off / 5.625);
  if (idx < 0) idx = 0;
  if (idx > 63) idx = 63;
  const hexNum = FS_SEQ[idx];
  const startDeg = (180 + idx*5.625) % 360;
  return {idx, hexNum, startDeg,
          endDeg:    (startDeg + 5.625) % 360,
          centerDeg: (startDeg + 2.8125) % 360,
          ...fsQiYun(hexNum)};
}

// Build all 64 slots once (degrees normalized to 0-360 range)
const FS_SLOTS = FS_SEQ.map((h, i) => {
  const qy = fsQiYun(h);
  const startDeg = (180 + i*5.625) % 360;
  return {idx: i, hexNum: h, qi: qy.qi, yun: qy.yun,
          startDeg,
          endDeg:    (startDeg + 5.625) % 360,
          centerDeg: (startDeg + 2.8125) % 360};
});

// Water max angular distance from facing (strict directional constraint)
const FS_WATER_MAX_DEG = 70;

function fsAngularDist(a, b){
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

// ═══════════════════════════════════════════════════════════════
//  Luopan visual rendering
// ═══════════════════════════════════════════════════════════════
const FS_LUOPAN_IMG = new Image();

function buildFengShuiView(){
  const view = document.getElementById('fengshui-view');
  if (!view || view.dataset.built === '1') return;
  view.dataset.built = '1';
  view.innerHTML = `
    <div style="max-width:480px;margin:0 auto;font-family:serif;color:#1a1008;">
      <div id="fs-context" style="background:#fff8e1;border:1px solid #c9a84c;border-radius:8px;padding:10px;margin-bottom:10px;font-size:13px;line-height:1.5;"></div>

      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;font-size:12px;">
        <span style="color:#666;">PERIOD:</span>
        <button id="fs-period-btn" onclick="fsTogglePeriod()" style="background:#8a6a1f;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:bold;">NOW → 2044</button>
        <span id="fs-period-lbl" style="font-style:italic;color:#8a6a1f;">Zheng Shen = 6-9</span>
      </div>

      <div style="display:flex;gap:8px;align-items:end;margin-bottom:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;">
          <label style="font-size:11px;color:#666;display:block;">Facing (°)</label>
          <input type="number" id="fs-facing" min="0" max="360" step="0.1" placeholder="e.g. 180"
                 style="width:100%;padding:6px;border:1px solid #c9a84c;border-radius:4px;font-size:14px;"
                 oninput="fsRedraw()">
        </div>
        <div style="flex:1;min-width:120px;">
          <label style="font-size:11px;color:#666;display:block;">Water (°)</label>
          <div style="display:flex;gap:4px;">
            <input type="number" id="fs-water" min="0" max="360" step="0.1" placeholder="optional"
                   style="flex:1;padding:6px;border:1px solid #4a9ead;border-radius:4px;font-size:14px;"
                   oninput="fsRedraw()">
            <button onclick="fsSuggestWater()" title="Suggest closest favorable Water position" style="background:#4a9ead;color:#fff;border:none;border-radius:4px;padding:0 10px;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;">💡 Suggest</button>
          </div>
        </div>
      </div>

      <!-- ═══ FLYING STARS (玄空飛星) controls ═══ -->
      <div style="background:#fff8e1;border:1px solid #c9a84c;border-radius:6px;padding:8px;margin-bottom:10px;">
        <div style="font-size:11px;color:#8a6a1f;font-weight:bold;margin-bottom:6px;">⭐ FLYING STARS (玄空飛星)</div>
        <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;">
          <div style="flex:1;min-width:110px;">
            <label style="font-size:11px;color:#666;display:block;">House Facing (°)</label>
            <input type="number" id="fs-house-facing" min="0" max="360" step="0.1" placeholder="e.g. 180"
                   style="width:100%;padding:6px;border:1px solid #8a6a1f;border-radius:4px;font-size:14px;"
                   oninput="fsRedraw()">
          </div>
          <div style="min-width:90px;">
            <label style="font-size:11px;color:#666;display:block;">Period (1-9)</label>
            <input type="number" id="fs-period" min="1" max="9" step="1" placeholder="8"
                   style="width:100%;padding:6px;border:1px solid #8a6a1f;border-radius:4px;font-size:14px;"
                   oninput="fsRedraw()">
          </div>
          <button id="fs-stars-toggle" onclick="fsToggleStars()" style="background:#aaa;color:#fff;border:none;border-radius:4px;padding:8px 12px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">⭐ OFF</button>
        </div>
        <div id="fs-stars-center" style="margin-top:6px;font-size:13px;color:#666;text-align:center;min-height:18px;"></div>
      </div>

      <div id="fs-canvas-wrap" style="position:relative;width:100%;aspect-ratio:1100/1130;max-width:760px;margin:0 auto 10px;">
        <canvas id="fs-canvas" width="1100" height="1130" style="width:100%;height:100%;"></canvas>
      </div>

      <div id="fs-legend" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px;font-size:11px;"></div>

      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button onclick="fsFindDirections()" style="flex:1;background:#1565c0;color:#fff;border:none;border-radius:6px;padding:10px;font-weight:bold;font-size:13px;cursor:pointer;">🔎 FIND MATCHING FACING/WATER DIRECTIONS</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button onclick="fsFindDates()" style="flex:1;background:#1565c0;color:#fff;border:none;border-radius:6px;padding:10px;font-weight:bold;font-size:13px;cursor:pointer;">🔎 FIND MATCHING DATES</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button onclick="(typeof QFS!=='undefined') ? QFS.open() : alert('flying-stars-qimen.js not loaded')" style="flex:1;background:#00695c;color:#fff;border:none;border-radius:6px;padding:10px;font-weight:bold;font-size:13px;cursor:pointer;">🌀 FIND QIMEN HOURS FOR FLYING STARS</button>
      </div>

      <div id="fs-results-area"></div>
    </div>`;

  // Inject legend
  const lg = document.getElementById('fs-legend');
  lg.innerHTML = `
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(180,40,40,0.25);border:1px solid #c9a84c;vertical-align:middle;"></span> 正神</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(40,80,180,0.25);border:1px solid #c9a84c;vertical-align:middle;"></span> 零神</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(0,220,80,0.6);vertical-align:middle;"></span> ✓ Facing for date</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(0,200,255,0.6);vertical-align:middle;"></span> Water for facing</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(255,200,0,0.8);vertical-align:middle;"></span> Selected facing</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(0,200,255,0.45);border:1px solid rgba(0,100,180,0.7);vertical-align:middle;"></span> Water ±70° zone</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(255,30,30,0.8);vertical-align:middle;"></span> Invalid water</span>`;

  // Load image
  if (!FS_LUOPAN_IMG.src){
    FS_LUOPAN_IMG.onload = () => fsRedraw();
    FS_LUOPAN_IMG.src = "icons/luopan.jpg";
  }
}

function fsTogglePeriod(){
  FS_POST_2044 = !FS_POST_2044;
  document.getElementById('fs-period-btn').textContent = FS_POST_2044 ? 'POST 2044' : 'NOW → 2044';
  document.getElementById('fs-period-lbl').textContent = FS_POST_2044 ? 'Zheng Shen = 1-4' : 'Zheng Shen = 6-9';
  fsRedraw();
}

// ── Flying Stars (玄空飛星) toggle state ───────────────────────────
let FS_STARS_ON = false;
function fsToggleStars(){
  FS_STARS_ON = !FS_STARS_ON;
  const btn = document.getElementById('fs-stars-toggle');
  if (btn){
    btn.textContent = FS_STARS_ON ? '⭐ ON' : '⭐ OFF';
    btn.style.background = FS_STARS_ON ? '#8a6a1f' : '#aaa';
  }
  fsRedraw();
}

// ── Get current date day pillar + person year hex from calendar state ──
function fsGetCurrentContext(){
  // Day pillar — from analyzeXkdg input via the current calculation
  let dayHex = null, dayQi = null, dayYun = null, dayLabel = null;
  if (typeof _currentDayXkdg !== 'undefined' && _currentDayXkdg) {
    dayHex = _currentDayXkdg.hex;
    dayQi  = _currentDayXkdg.qi;
    dayYun = _currentDayXkdg.yun;
    dayLabel = (_currentDayXkdg.stem||'') + (_currentDayXkdg.branch||'');
  }
  // Person A year hex
  let pAHex = null, pAQi = null, pAYun = null, pALabel = null;
  if (typeof _personAYear !== 'undefined' && _personAYear) {
    pAHex = _personAYear.hex;  pAQi = _personAYear.qi;  pAYun = _personAYear.yun;
    pALabel = (_personAYear.stem||'') + (_personAYear.branch||'');
  }
  // Person B
  let pBHex = null, pBQi = null, pBYun = null, pBLabel = null;
  if (typeof _personBYear !== 'undefined' && _personBYear) {
    pBHex = _personBYear.hex;  pBQi = _personBYear.qi;  pBYun = _personBYear.yun;
    pBLabel = (_personBYear.stem||'') + (_personBYear.branch||'');
  }
  return { dayHex, dayQi, dayYun, dayLabel, pAHex, pAQi, pAYun, pALabel, pBHex, pBQi, pBYun, pBLabel };
}

function fsRenderContext(){
  const c = fsGetCurrentContext();
  const ctxBox = document.getElementById('fs-context');
  if (!ctxBox) return;
  let html = '<strong>Current context:</strong><br>';
  if (c.dayHex){
    html += `Day pillar ${c.dayLabel} — hex ${c.dayHex}, qi ${c.dayQi}, yun ${c.dayYun}<br>`;
    html += `<span style="font-size:11px;color:#1565c0;">Facings: ZS, yun-rule vs day (+ Family). Waters: LS, ±70°, yun-rule vs facing (+ Family). Score: ☯ Yin/Yang match (Di Pan facing ↔ Tien Pan +7.5° water) + ★ qi-line bonus.</span><br>`;
  } else {
    html += '<span style="color:#999;">No date selected — pick a date first.</span><br>';
  }
  if (c.pAHex) html += `Person A year ${c.pALabel} — hex ${c.pAHex}, qi ${c.pAQi}, yun ${c.pAYun}<br>`;
  if (c.pBHex) html += `Person B year ${c.pBLabel} — hex ${c.pBHex}, qi ${c.pBQi}, yun ${c.pBYun}<br>`;
  ctxBox.innerHTML = html;
}

function openFengShui(){
  buildFengShuiView();
  fsRenderContext();
  fsRedraw();
}

// Called from the 🧭 FS button next to CALCULATE — switches mode + scrolls.
function openFengShuiFromTop(){
  setMode('fengshui');
  setTimeout(() => {
    const v = document.getElementById('fengshui-view');
    if (v) v.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

// ── Compute valid facings for current date + valid waters for selected facing ──
function fsComputeValid(){
  const c = fsGetCurrentContext();
  const settings = fsGetDateSettings();
  // Valid facings: Zheng Shen + 5-rule match with day pillar (gated by date settings)
  const facings = new Set();
  if (c.dayHex){
    FS_SLOTS.forEach(s => {
      if (!fsIsZhengShen(s.yun)) return;
      const labels = hexDateConnectionLabels(s.hexNum, s.qi, s.yun, c.dayHex, c.dayQi, c.dayYun, settings);
      if (labels.length) facings.add(s.idx);
    });
  }
  // Valid waters for the chosen facing — must be Ling Shen AND ±70° AND yun-line Hetu/Adding (or Family path)
  const fDeg = parseFloat(document.getElementById('fs-facing').value);
  let waters = new Set(), facingSlot = null;
  if (!isNaN(fDeg)){
    facingSlot = fsSlotForDeg(fDeg);
    const facingCenter = facingSlot.startDeg + 2.8125;
    FS_SLOTS.forEach(s => {
      if (!fsIsLingShen(s.yun)) return;
      if (fsAngularDist(facingCenter, s.centerDeg) > FS_WATER_MAX_DEG) return;
      const labels = fsWaterMatchVsFacing(facingSlot, s);
      if (labels.length) waters.add(s.idx);
    });
  }
  return { facings, waters, facingSlot, ctx: c };
}

// ── Compute all (facing, water) compatible pairs for current date ──
function fsComputePairs(){
  const c = fsGetCurrentContext();
  if (!c.dayHex) return [];
  const settings = fsGetDateSettings();
  const pairs = [];
  FS_SLOTS.forEach(fs => {
    if (!fsIsZhengShen(fs.yun)) return;
    const fLbls = hexDateConnectionLabels(fs.hexNum, fs.qi, fs.yun, c.dayHex, c.dayQi, c.dayYun, settings);
    if (fLbls.length === 0) return;
    const facingCenter = fs.startDeg + 2.8125;
    FS_SLOTS.forEach(ws => {
      if (!fsIsLingShen(ws.yun)) return;
      if (fsAngularDist(facingCenter, ws.centerDeg) > FS_WATER_MAX_DEG) return;
      const wLbls = fsWaterMatchVsFacing(fs, ws);
      if (wLbls.length === 0) return;
      const score = fsWaterScore(fs, ws);
      pairs.push({ facing: fs, water: ws, facingLabels: fLbls, waterLabels: wLbls, score });
    });
  });
  // Sort by score descending, then by facing degree, then by water degree
  pairs.sort((a,b) => b.score - a.score
                   || a.facing.startDeg - b.facing.startDeg
                   || a.water.centerDeg - b.water.centerDeg);
  return pairs;
}

// ── Render the (facing, water) pairs table ──
function fsRenderPairsTable(){
  const box = document.getElementById('fs-pairs-table');
  if (!box) return;
  const pairs = fsComputePairs();
  if (!pairs.length){
    const c = fsGetCurrentContext();
    box.innerHTML = c.dayHex
      ? '<div style="text-align:center;color:#888;padding:10px;font-size:12px;">No facing/water combinations available for this date.</div>'
      : '';
    return;
  }
  // Current inputs (for highlighting the active row)
  const fIn = parseFloat(document.getElementById('fs-facing').value);
  const wIn = parseFloat(document.getElementById('fs-water').value);
  const activeFIdx = !isNaN(fIn) ? fsSlotForDeg(fIn).idx : -1;
  const activeWIdx = !isNaN(wIn) ? fsSlotForDeg(wIn).idx : -1;

  let html = `<div style="font-size:12px;font-weight:bold;margin:10px 0 4px;color:#1a1008;">Compatible facing / water pairs (${pairs.length}) — sorted by score (☯ + ★ bonuses):</div>`;
  html += '<div style="overflow-x:auto;border:1px solid #c9a84c;border-radius:6px;">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
  html += '<thead><tr style="background:#fff8e1;">';
  html += '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #c9a84c;color:#c0392b;">Facing 正神</th>';
  html += '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #c9a84c;color:#1565c0;">Water 零神</th>';
  html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#8a6a1f;">Score</th>';
  html += '</tr></thead><tbody>';
  pairs.forEach(p => {
    const fc = (p.facing.startDeg + 2.8125) % 360;
    const wc = p.water.centerDeg;
    const isActive = (p.facing.idx === activeFIdx && p.water.idx === activeWIdx);
    const bg = isActive ? '#fff3a8' : '#fff';
    const yyOk = fsYinYangMatch(fc, wc);
    const qiStars = p.score - (yyOk ? 3 : 0);  // back out the YY bonus to show qi-only stars
    const yySymbol = yyOk ? '<span title="Yin/Yang mountain match" style="color:#c0392b;font-size:14px;">☯</span>' : '<span style="color:#ccc;font-size:14px;">☯</span>';
    const stars = '★'.repeat(qiStars) + '<span style="color:#ddd;">' + '★'.repeat(2-qiStars) + '</span>';
    html += `<tr onclick="fsSelectPair(${fc.toFixed(3)},${wc.toFixed(3)})" `
         +  `style="cursor:pointer;background:${bg};border-bottom:1px solid #eee;" `
         +  `onmouseover="this.style.background='${isActive?'#fff3a8':'#f7eedb'}'" `
         +  `onmouseout="this.style.background='${bg}'">`;
    html += `<td style="padding:6px 8px;">`
         +  `<strong>Hex ${p.facing.hexNum}</strong> · ${fc.toFixed(1)}°`
         +  `<br><span style="color:#888;">qi ${p.facing.qi} · yun ${p.facing.yun} · ${fsMountainYangDi(fc) ? 'Yang' : 'Yin'}</span>`
         +  `</td>`;
    html += `<td style="padding:6px 8px;">`
         +  `<strong>Hex ${p.water.hexNum}</strong> · ${wc.toFixed(1)}°`
         +  `<br><span style="color:#888;">qi ${p.water.qi} · yun ${p.water.yun} · ${fsMountainYangTien(wc) ? 'Yang' : 'Yin'}</span>`
         +  `</td>`;
    html += `<td style="padding:6px 4px;text-align:center;color:#c9a84c;font-size:13px;white-space:nowrap;">${yySymbol} ${stars}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  box.innerHTML = html;
}

// ── Click a pair row → set both inputs, redraw, scroll back to compass ──
function fsSelectPair(facingDeg, waterDeg){
  document.getElementById('fs-facing').value = facingDeg.toFixed(3);
  document.getElementById('fs-water').value  = waterDeg.toFixed(3);
  fsRedraw();
  const wrap = document.getElementById('fs-canvas-wrap');
  if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Canvas redraw — photo + overlays ─────────────────────────────
function fsRedraw(){
  const canvas = document.getElementById('fs-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  // Transparent background — the page/wrap background shows through (no more beige frame around the luopan).

  const PAD = 100, IMG_W = 900, IMG_H = 930;
  const cx = PAD + 450, cy = PAD + 464;
  const outerR = 447, rHexOut = 360, rHexIn = 295;

  if (FS_LUOPAN_IMG.complete && FS_LUOPAN_IMG.naturalWidth>0)
    ctx.drawImage(FS_LUOPAN_IMG, PAD, PAD, IMG_W, IMG_H);

  const fDeg = parseFloat(document.getElementById('fs-facing').value);
  const wDeg = parseFloat(document.getElementById('fs-water').value);
  const fd = isNaN(fDeg) ? null : fDeg;
  const wd = isNaN(wDeg) ? null : wDeg;

  const { facings, waters, facingSlot, ctx: dctx } = fsComputeValid();
  const fInput = fd !== null ? fsSlotForDeg(fd) : null;
  const wInput = wd !== null ? fsSlotForDeg(wd) : null;

  function paintCell(slot, color){
    const aS = (slot.startDeg - 270) * Math.PI/180;
    const aE = (slot.endDeg   - 270) * Math.PI/180;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rHexOut, aS, aE);
    ctx.arc(cx, cy, rHexIn,  aE, aS, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // Pass 1: Zheng/Ling tint (always)
  FS_SLOTS.forEach(s => {
    paintCell(s, fsIsZhengShen(s.yun) ? 'rgba(180,40,40,0.18)' : 'rgba(40,80,180,0.18)');
  });

  // Pass 1b: when a facing is set, draw subtle ±70° water-zone band just outside hex ring
  if (fInput){
    const facingCenter = fInput.startDeg + 2.8125;
    const aMid = (facingCenter - 270) * Math.PI / 180;
    const halfW = FS_WATER_MAX_DEG * Math.PI / 180;
    const rZoneIn  = rHexOut + 4;
    const rZoneOut = rHexOut + 16;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rZoneOut, aMid - halfW, aMid + halfW);
    ctx.arc(cx, cy, rZoneIn,  aMid + halfW, aMid - halfW, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,200,255,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,100,180,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Pass 2: valid facings for current date — green tint
  facings.forEach(i => paintCell(FS_SLOTS[i], 'rgba(0,220,80,0.55)'));

  // Pass 3: valid waters for current facing — cyan tint (only when facing input given)
  waters.forEach(i => paintCell(FS_SLOTS[i], 'rgba(0,200,255,0.55)'));

  // Pass 4: explicit user inputs
  if (fInput) paintCell(fInput, 'rgba(255,200,0,0.80)'); // gold = your facing
  if (wInput){
    const ok = facingSlot && waters.has(wInput.idx);
    paintCell(wInput, ok ? 'rgba(0,255,200,0.85)' : 'rgba(255,30,30,0.85)');
  }

  // Cell boundaries
  ctx.save();
  ctx.strokeStyle = 'rgba(180,140,40,0.35)';
  ctx.lineWidth = 0.6;
  FS_SLOTS.forEach(s => {
    const aS = (s.startDeg - 270) * Math.PI/180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(aS)*rHexIn,  cy + Math.sin(aS)*rHexIn);
    ctx.lineTo(cx + Math.cos(aS)*rHexOut, cy + Math.sin(aS)*rHexOut);
    ctx.stroke();
  });
  ctx.restore();

  // Arrows
  // When Flying Stars are ON, shorten the arrow so its tip stops at the
  // INNER edge of the star box (and push the label OUTSIDE the box).
  // When OFF, use the original layout.
  function drawArrow(deg, color, label){
    const a = (deg - 270) * Math.PI/180;
    let tipR, labelR;
    if (FS_STARS_ON){
      // Box centred at outerR + 55, half-size 40 → inner edge at +15, outer at +95
      tipR   = outerR + 15;
      labelR = outerR + 110;
    } else {
      tipR   = outerR + 75;
      labelR = tipR + 22;
    }
    const tipX = cx + Math.cos(a)*tipR;
    const tipY = cy + Math.sin(a)*tipR;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tipX,tipY);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    const perpX = Math.cos(a+Math.PI/2)*18, perpY = Math.sin(a+Math.PI/2)*18;
    const bx = tipX - Math.cos(a)*36, by = tipY - Math.sin(a)*36;
    ctx.beginPath(); ctx.moveTo(tipX,tipY);
    ctx.lineTo(bx+perpX, by+perpY); ctx.lineTo(bx-perpX, by-perpY);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.restore();
    if (label){
      ctx.save();
      ctx.font = 'bold 16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4;
      // Compute label position and clamp inside canvas (avoid overflow on E/W/N/S extremes)
      let lx = cx + Math.cos(a) * labelR;
      let ly = cy + Math.sin(a) * labelR;
      const pad = 35;     // half label width + small margin
      const padV = 14;    // half label height + small margin
      lx = Math.max(pad, Math.min(W - pad, lx));
      ly = Math.max(padV, Math.min(H - padV, ly));
      ctx.strokeText(label, lx, ly);
      ctx.fillText(label,   lx, ly);
      ctx.restore();
    }
  }
  if (fd !== null) drawArrow(fd, '#cc0000', 'Facing');
  if (wd !== null) drawArrow(wd, '#0a8c2c', 'Water');

  // Center pin
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,7,0,Math.PI*2); ctx.fillStyle='#1a1008'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,3.5,0,Math.PI*2); ctx.fillStyle='#ffd24a'; ctx.fill();
  ctx.restore();

  // ═══ FLYING STARS (玄空飛星) overlay ═══
  fsDrawFlyingStars(ctx, cx, cy, outerR);

  // Render detail panel
  fsRenderDetail(fInput, wInput, facingSlot, waters, facings, dctx);
  fsRenderPairsTable();
}

// Draws Flying Stars on the Luopan if toggle is ON and inputs are valid.
// Also updates the text under the canvas with the center stars.
function fsDrawFlyingStars(ctx, cx, cy, outerR){
  const centerBox = document.getElementById('fs-stars-center');
  if (!FS_STARS_ON){
    if (centerBox) centerBox.innerHTML = '';
    return;
  }
  const hfInput = document.getElementById('fs-house-facing');
  const pInput  = document.getElementById('fs-period');
  if (!hfInput || !pInput) return;
  const hfDeg = parseFloat(hfInput.value);
  const period = parseInt(pInput.value, 10);
  if (isNaN(hfDeg) || isNaN(period) || period < 1 || period > 9){
    if (centerBox) centerBox.innerHTML =
      '<span style="color:#aaa;">Enter House Facing (°) and Period (1-9) to display Flying Stars</span>';
    return;
  }
  if (typeof FlyingStars === 'undefined'){
    if (centerBox) centerBox.innerHTML =
      '<span style="color:#c00;">⚠ flying-stars.js not loaded</span>';
    return;
  }

  const mountainChar = fsMountainCharFromDeg(hfDeg);
  let chart;
  try {
    chart = FlyingStars.calculate(period, mountainChar);
  } catch (err){
    if (centerBox) centerBox.innerHTML =
      '<span style="color:#c00;">⚠ ' + err.message + '</span>';
    return;
  }

  FlyingStars.drawOnLuopan(ctx, chart, cx, cy, outerR);

  // Update center stars line below the canvas
  if (centerBox){
    const dirZh = { N:'坎', NE:'艮', E:'震', SE:'巽',
                    S:'離', SW:'坤', W:'兌', NW:'乾' };
    centerBox.innerHTML =
      '<span style="color:#8a6a1f;font-weight:bold;">第' + period + '運 · ' +
      chart.facingMountain + '山' + chart.sittingMountain + '向</span>' +
      ' &nbsp;|&nbsp; Center: ' + FlyingStars.getCenterStarsHTML(chart);
  }
}

function fsRenderDetail(fInput, wInput, facingSlot, waters, facings, dctx){
  const box = document.getElementById('fs-detail');
  if (!box) return;
  let html = '';
  // FS page now supports BOTH flows:
  //   1. Default (entered from MAIN): date → compatible facing/water pairs
  //      (rendered by fsRenderPairsTable below — the big table).
  //   2. On-demand (FIND MATCHING DATES): facing/water → matching dates
  //      (rendered by fsRenderMatchingDatesTable when the user clicks).
  // This detail panel validates whatever the user has entered (Facing/Water
  // degrees) and shows compatibility with the loaded date if present.
  if (fInput){
    const isZS = fsIsZhengShen(fInput.yun);
    html += `<div style="background:#fff8e1;border:1px solid #c9a84c;padding:8px;border-radius:4px;margin-bottom:6px;font-size:12px;">`;
    html += `<strong>Facing:</strong> hex ${fInput.hexNum}, qi ${fInput.qi}, yun ${fInput.yun} `;
    html += isZS ? '<span style="color:#c0392b;font-weight:bold;">[正神 ✓]</span>'
                 : '<span style="color:#c0392b;font-weight:bold;">[NOT Zheng Shen ✗ — pick a Zheng Shen facing]</span>';
    html += `</div>`;
  }
  if (wInput){
    const fSlot = facingSlot;
    const isLS = fsIsLingShen(wInput.yun);
    const lbls = fSlot ? hexConnectionLabels(wInput.hexNum, wInput.qi, wInput.yun, fSlot.hexNum, fSlot.qi, fSlot.yun) : [];
    const dist = fSlot ? fsAngularDist(fSlot.startDeg + 2.8125, wInput.centerDeg) : null;
    const distOk = dist === null || dist <= FS_WATER_MAX_DEG;
    const valid = isLS && distOk && lbls.length > 0;
    html += `<div style="background:${valid?'#e8f5e9':'#ffebee'};border:1px solid ${valid?'#0a8c2c':'#c0392b'};padding:8px;border-radius:4px;margin-bottom:6px;font-size:12px;">`;
    html += `<strong>Water:</strong> hex ${wInput.hexNum}, qi ${wInput.qi}, yun ${wInput.yun} `;
    html += isLS ? '<span style="color:#1565c0;font-weight:bold;">[零神 ✓]</span>'
                 : '<span style="color:#c0392b;font-weight:bold;">[NOT Ling Shen ✗]</span>';
    if (dist !== null){
      html += `<br>Distance from facing: ${dist.toFixed(1)}° `;
      html += distOk ? '<span style="color:#0a8c2c;font-weight:bold;">[within ±'+FS_WATER_MAX_DEG+'° ✓]</span>'
                     : '<span style="color:#c0392b;font-weight:bold;">[exceeds ±'+FS_WATER_MAX_DEG+'° ✗]</span>';
    }
    html += `<br>vs Facing: ${lbls.length ? lbls.join(' · ') : '<span style="color:#888;">no connection</span>'}`;
    html += `<br><strong>Verdict: ${valid ? '✓ COMPATIBLE — click FIND MATCHING DATES to scan' : '✗ NOT COMPATIBLE'}</strong>`;
    html += `</div>`;
  }
  box.innerHTML = html;
}

// ── Flow A button: Find matching facing/water directions for the loaded date ──
function fsFindDirections(){
  const area = document.getElementById('fs-results-area');
  if (!area) return;
  // Create the result containers
  area.innerHTML = '<div id="fs-detail" style="font-size:12px;color:#333;"></div>' +
                   '<div id="fs-pairs-table" style="margin-top:8px;"></div>';
  window._fsShowingMatching = false;
  // Trigger a full redraw which will populate fs-detail and fs-pairs-table
  fsRedraw();
  // Scroll to results
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Flow B: Find matching dates given facing/water ────────────────
function fsFindDates(){
  const fDeg = parseFloat(document.getElementById('fs-facing').value);
  const wDeg = parseFloat(document.getElementById('fs-water').value);
  if (isNaN(fDeg)){ alert('Set a facing degree first.'); return; }
  const fSlot = fsSlotForDeg(fDeg);
  if (!fsIsZhengShen(fSlot.yun)){
    alert('Facing hex (yun '+fSlot.yun+') is NOT Zheng Shen. Pick a Zheng Shen facing first.'); return;
  }
  let wSlot = null;
  if (!isNaN(wDeg)){
    wSlot = fsSlotForDeg(wDeg);
    if (!fsIsLingShen(wSlot.yun)){
      alert('Water hex (yun '+wSlot.yun+') is NOT Ling Shen. Pick a Ling Shen water.'); return;
    }
    const facingCenter = fSlot.startDeg + 2.8125;
    const dist = fsAngularDist(facingCenter, wSlot.centerDeg);
    if (dist > FS_WATER_MAX_DEG){
      alert('Water is '+dist.toFixed(1)+'° from facing — exceeds the ±'+FS_WATER_MAX_DEG+'° limit.'); return;
    }
    const lbls = hexConnectionLabels(wSlot.hexNum, wSlot.qi, wSlot.yun, fSlot.hexNum, fSlot.qi, fSlot.yun);
    if (lbls.length === 0){
      alert('Water hex does not communicate with facing hex via any rule. Pick a compatible water.'); return;
    }
  }
  // Set up result containers in the results area
  const area = document.getElementById('fs-results-area');
  if (area) area.innerHTML = '<div id="fs-detail" style="font-size:12px;color:#333;"></div>' +
                             '<div id="fs-pairs-table" style="margin-top:8px;"></div>';
  // Compute and render matching dates for this Facing (+Water) setup.
  // Uses the FROM/DAYS range from the main scan inputs.
  const matches = fsFindMatchingDatesForSetup(fSlot, wSlot);
  if (matches === null) return; // alert already shown
  window._fsShowingMatching = true; // suppress auto reverse-logic render
  fsRenderMatchingDatesTable(fSlot, wSlot, matches);
  // Scroll to results so the user sees them immediately
  const box = document.getElementById('fs-pairs-table');
  if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Scan the FROM/DAYS range (or window._fsRangeDays override) and return all
//    dates whose Day pillar connects to the given Facing (and Water if
//    provided). Normal connection rule: Hetu (yun), Adding=5/10/15, shared
//    Family at noon. Additionally scans the 12 hour pillars of each day for
//    Full Blood Link matches in the TARGET FAMILIES (= families of the Facing
//    hex ∪ families of the Water hex). A BL date is the #1 combination in
//    every sense, so it gets a +20 score boost and is auto-pinned to the top
//    of BEST sort. Returns an unsorted array — the render function sorts.
function fsFindMatchingDatesForSetup(fSlot, wSlot){
  const startDate = (document.getElementById('scan-start') && document.getElementById('scan-start').value)
                 || (document.getElementById('start-date') && document.getElementById('start-date').value);
  if (!startDate){
    alert('Set a FROM date and DAYS in the toolbar first (the matching scan uses the same range).'); return null;
  }
  // Range: prefer window._fsRangeDays (set by range buttons), else scan-days input
  const days = (typeof window._fsRangeDays === 'number' && window._fsRangeDays > 0)
             ? window._fsRangeDays
             : (parseInt((document.getElementById('scan-days') || {}).value) || 60);
  const lon  = parseFloat(document.getElementById('longitude').value);
  const utc  = parseFloat(document.getElementById('utc-offset').value);
  if (isNaN(lon) || isNaN(utc)){
    alert('Longitude / UTC offset not set.'); return null;
  }
  const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);
  const start = new Date(startDate + 'T00:00:00');

  // Person A star data (optional, used to enrich + boost scoring)
  const pDayStem   = _personADayStem   || null;
  const pDayBranch = _personADayBranchXkdg || _personADayBranch || null;
  const pMthBranch = _personAMonthBranch || null;
  const pNoble = pDayStem   ? (NOBLE_BRANCHES[pDayStem]   || []) : [];
  const pLu    = pDayStem   ? (LU_BRANCH[pDayStem]        || null) : null;
  const pHV    = pMthBranch ? (HEAVEN_VIRTUE[pMthBranch]  || null) : null;
  const pBV    = pDayBranch ? (BRANCH_VIRTUE[pDayBranch]  || null) : null;
  const pMV    = pMthBranch ? (MONTH_VIRTUE[pMthBranch]   || null) : null;
  const pTY    = pDayStem   ? (TIAN_YI[pDayStem]          || null) : null;

  // Target families for Full BL detection: union of Facing/Water hex families.
  // Any Full BL date in a target family is auto-promoted to the top of results.
  const fFams = (fSlot && typeof getHexFamilies === 'function') ? (getHexFamilies(fSlot.hexNum) || []) : [];
  const wFams = (wSlot && typeof getHexFamilies === 'function') ? (getHexFamilies(wSlot.hexNum) || []) : [];
  const targetFams = new Set([...fFams, ...wFams]);

  const matches = [];
  for (let d = 0; d < days; d++){
    const dayDate = new Date(start.getTime() + d * 86400000);
    const midDay  = new Date(dayDate); midDay.setHours(12, 0, 0, 0);
    const ec      = Solar.fromDate(new Date(midDay.getTime() + offsetMin * 60000)).getLunar().getEightChar();
    const dGan = ec.getDayGan(),  dZhi = ec.getDayZhi();
    const dData = getXkdgData(dGan, dZhi);
    if (!dData) continue;
    const yGan = ec.getYearGan(),  yZhi = ec.getYearZhi();
    const mGan = ec.getMonthGan(), mZhi = ec.getMonthZhi();
    const hGanNoon = ec.getTimeGan(),  hZhiNoon = ec.getTimeZhi();
    const { strong: ss, growing: sg } = getJieqiSeason(midDay);

    // Family detection at noon (used by the normal connection rule below).
    // For Full BL detection we scan all 12 hour pillars further down.
    let dayFamilies = [];
    try {
      const pillars = buildResolvedPillars(yGan, yZhi, mGan, mZhi, dGan, dZhi, hGanNoon, hZhiNoon);
      const analysisRes = analyzeXkdg(pillars, ss, sg);
      dayFamilies = (analysisRes.items || [])
        .filter(i => i.tag === 'family' && i.text)
        .map(i => i.text.replace(/\s+Family$/, '').trim());
    } catch (e) { /* fall through with empty families */ }

    // Person A year stem/branch — needed by calcHourScore for the match
    // multiplier (when Person A's year connects to the day pillar, scoreA
    // jumps from 1 to 4, multiplying the score significantly).
    const pYStem = (typeof _personAStem !== 'undefined') ? _personAStem : null;
    const pYBranch = (typeof _personABranch !== 'undefined') ? _personABranch : null;

    // Normal FS connection check (date → Facing/Water via Hetu/Adding/Family)
    // — kept as the primary FILTER for "is this date a match at all".
    const fLbls = fsConnectionLabelsForDay(fSlot.hexNum, fSlot.yun, dData.hexNum, dData.yun, dayFamilies);
    let wLbls = [];
    if (wSlot){
      wLbls = fsConnectionLabelsForDay(wSlot.hexNum, wSlot.yun, dData.hexNum, dData.yun, dayFamilies);
    }
    
    // Calculate Pure YY star for this facing/water pair
    const fTri = (typeof fsMountainTrigramDi === 'function') ? fsMountainTrigramDi(fSlot.startDeg + 2.8125) : null;
    const wTri = (typeof fsMountainTrigramTien === 'function') ? fsMountainTrigramTien(wSlot.centerDeg) : null;
    const pureYYStarInfo = (typeof fsPureYYStarInfo === 'function') ? fsPureYYStarInfo(fTri, wTri) : { name: '', auspicious: null };
        const hasNormalMatch = fLbls.length > 0 && (!wSlot || wLbls.length > 0);

    // Cheap BL pre-filter: do Y, M, D pillars share any target family?
    // (If not, no hour can produce a target-family Full BL.)
    let couldBeBL = false;
    if (targetFams.size > 0) {
      const yFams = (typeof getJiaZiFamilies === 'function') ? (getJiaZiFamilies(yGan, yZhi) || []) : [];
      const mFams = (typeof getJiaZiFamilies === 'function') ? (getJiaZiFamilies(mGan, mZhi) || []) : [];
      const dFams = (typeof getJiaZiFamilies === 'function') ? (getJiaZiFamilies(dGan, dZhi) || []) : [];
      couldBeBL = [...targetFams].some(f => yFams.includes(f) && mFams.includes(f) && dFams.includes(f));
    }

    // Skip days that have neither a FS connection nor BL potential.
    if (!hasNormalMatch && !couldBeBL) continue;

    // ── Unified hourly scan ──────────────────────────────────────────
    // Compute calcHourScore for each of the 12 hour pillars (SAME formula
    // as BEST/LIST views) and track the best-scoring hour. Detect target-
    // family Full BL in the same pass. Person ↔ date match is folded into
    // calcHourScore as a multiplier on qualityScore.
    let bestHourScore = -999;
    let bestHGan = '', bestHZhi = '', bestHourIdx = -1;
    let blInfo = null;

    for (let h = 0; h < 12; h++) {
      const hs = HOUR_STARTS[h];
      let bd = new Date(dayDate);
      if (hs === 23) bd = new Date(dayDate.getTime() - 86400000);
      bd.setHours(hs, 30, 0, 0);
      const ecH = Solar.fromDate(new Date(bd.getTime() + offsetMin * 60000)).getLunar().getEightChar();
      const hGanH = ecH.getTimeGan(), hZhiH = ecH.getTimeZhi();

      let scoreH = 0;
      try {
        const hPillarsH = buildResolvedPillars(yGan, yZhi, mGan, mZhi, dGan, dZhi, hGanH, hZhiH);
        const { items: itemsH } = analyzeXkdg(hPillarsH, ss, sg);
        const hourSpiritH = (typeof getSpiritForHour === 'function') ? getSpiritForHour(dZhi, hZhiH) : null;
        scoreH = calcHourScore(
          dGan, dZhi, hGanH, hZhiH, mGan, mZhi, yGan, yZhi,
          itemsH, hourSpiritH, ss, sg,
          (typeof _personAYear !== 'undefined' ? _personAYear : null), pYStem, pYBranch,
          pNoble, pLu, pHV, pBV, pMV, pTY,
          hPillarsH
        );
        // Target-family Full BL detection (reuses the items[] we just computed)
        if (!blInfo && couldBeBL) {
          const blFams = itemsH.filter(i => i.tag === 'family' && i.text)
                                .map(i => i.text.replace(/\s+Family$/, '').trim());
          const blFam = blFams.find(f => targetFams.has(f));
          if (blFam) {
            blInfo = { hourIndex: h, hourStart: hs, family: blFam, hGan: hGanH, hZhi: hZhiH };
          }
        }
      } catch (e) { scoreH = 0; }

      if (scoreH > bestHourScore) {
        bestHourScore = scoreH;
        bestHourIdx = h;
        bestHGan = hGanH;
        bestHZhi = hZhiH;
      }
    }

    // Person ↔ Day match level — captured for the tooltip so the user can
    // see WHY a score is high (e.g. "Family match ×4 multiplier").
    let personMatchLvl = 0;
    if (typeof _personAYear !== 'undefined' && _personAYear && dData) {
      try { personMatchLvl = getMatchScore(_personAYear, pYStem, pYBranch, dData, dGan, dZhi); } catch (e) {}
    }

    // Final date score: best-hour calcHourScore. Target-family Full BL adds a
    // small +5 nudge on top (calcHourScore already gives Full BL a floor of 8
    // via relationFloor, so generic BL dates already rank high; +5 keeps
    // *target-family* BL above other Full BL dates).
    let score = Math.max(bestHourScore, 0);
    if (blInfo) score += 5;

    matches.push({
      date: dayDate,
      isoDate: localISODate(dayDate),
      dGan, dZhi, mGan, mZhi, yGan, yZhi,
      dayHex: dData.hexNum, dayQi: dData.qi, dayYun: dData.yun,
      facingLabels: fLbls,
      waterLabels: wLbls,
      facingTri: fTri,
      waterTri: wTri,
      pureYYStarInfo,
      score,
      bestHour: bestHourIdx >= 0 ? { idx: bestHourIdx, hGan: bestHGan, hZhi: bestHZhi } : null,
      personMatchLvl,
      isBL: !!blInfo,
      blInfo
    });
  }

  return matches; // render function handles sort based on window._fsSortMode
}

// Internal helper: standalone version of hexDateConnectionLabels that takes
// the day's family list directly rather than reading global state. Lets the
// scan stay correct across many days without mutating _currentDayAnalysis.
function fsConnectionLabelsForDay(srcHex, srcYun, dayHex, dayYun, dayFamilies){
  const out = [];
  if (isHetuPair(srcYun, dayYun))      out.push('Hetu (yun)');
  const ys = srcYun + dayYun;
  if ([5,10,15].includes(ys))          out.push('Adding yun=' + ys);
  if (dayFamilies && dayFamilies.length){
    const srcFams = getHexFamilies(srcHex);
    const shared = srcFams.filter(f => dayFamilies.includes(f));
    if (shared.length) out.push('Family: ' + shared.join(','));
  }
  return out;
}

// Render the matching-dates list into the FS results panel. When Person A
// is NOT loaded, surface a prominent CTA tag that scrolls the user back to
// the Person A input box so they can complete the setup. Adds a toolbar with
// a Sort toggle (BEST/LIST) and Range buttons (1m..5y) that override the
// main scan-days input for this scan only. BL dates are pinned to the top
// in BEST mode and highlighted in yellow with a Family Blood Link badge.
function fsRenderMatchingDatesTable(fSlot, wSlot, matches){
  const box = document.getElementById('fs-pairs-table');
  if (!box) return;

  // Cache last context so the Sort toggle can re-render without rescanning.
  window._fsLastMatches = matches;
  window._fsLastFSlot = fSlot;
  window._fsLastWSlot = wSlot;
  window._fsQimenAnnotated = false; // reset on new scan
  const sortMode = window._fsSortMode || 'best';

  // If already in qimen mode, auto-annotate the new matches
  if (window._fsQimenActive && typeof window.QMDJWaterScanner !== 'undefined') {
    fsAnnotateQimenHits(matches, fSlot, wSlot);
    window._fsQimenAnnotated = true;
  }

  // Sort logic — combines two independent controls:
  //   _fsSortMode  ('best' or 'list')  — primary sort within tier
  //   _fsQimenActive (boolean)         — when true, Qimen-matched dates float to top
  let sorted = matches.slice();
  const qimenActive = !!window._fsQimenActive;
  const primaryAsc  = (sortMode === 'list'); // chronological

  function primaryCmp(a, b){
    if (primaryAsc) return a.date - b.date;
    if (a.isBL !== b.isBL) return a.isBL ? -1 : 1;
    const aScore = a.score + (a._qimenBonus || 0);
    const bScore = b.score + (b._qimenBonus || 0);
    if (bScore !== aScore) return bScore - aScore;
    return a.date - b.date;
  }

  if (qimenActive) {
    sorted.sort((a, b) => {
      // Tier 1: Qimen-matched dates first
      const aHasQ = (a._qimenF || a._qimenW) ? 1 : 0;
      const bHasQ = (b._qimenF || b._qimenW) ? 1 : 0;
      if (aHasQ !== bHasQ) return bHasQ - aHasQ;
      // Tier 2 (within Qimen group): FW > single F or W
      if (aHasQ && bHasQ) {
        const aq = a._qimenFW ? 2 : 1;
        const bq = b._qimenFW ? 2 : 1;
        if (aq !== bq) return bq - aq;
      }
      // Tier 3: primary sort (BEST or chronological)
      return primaryCmp(a, b);
    });
  } else {
    sorted.sort(primaryCmp);
  }

  const aLoaded = !!_personAYear;
  const bLoaded = !!_personBYear;
  let personCTA = '';
  if (!aLoaded || !bLoaded) {
    const tagA = aLoaded
      ? '<span style="background:#e8f5e9;border:1px solid #2e7d32;color:#2e7d32;padding:4px 10px;border-radius:14px;font-size:12px;font-weight:bold;">✓ Person A loaded</span>'
      : '<span onclick="fsScrollToPerson(\'a\')" style="background:#fff;border:1px dashed #2e7d32;color:#2e7d32;padding:4px 10px;border-radius:14px;font-size:12px;font-weight:bold;cursor:pointer;">+ Add Person A</span>';
    const tagB = bLoaded
      ? '<span style="background:#f3e5f5;border:1px solid #7b1fa2;color:#7b1fa2;padding:4px 10px;border-radius:14px;font-size:12px;font-weight:bold;">✓ Person B loaded</span>'
      : '<span onclick="fsScrollToPerson(\'b\')" style="background:#fff;border:1px dashed #7b1fa2;color:#7b1fa2;padding:4px 10px;border-radius:14px;font-size:12px;font-weight:bold;cursor:pointer;">+ Add Person B</span>';
    personCTA = `
    <div style="margin:8px 0 12px;padding:10px 12px;background:#fff3e0;border:1px solid #ff9800;border-radius:6px;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <span style="color:#5d4037;">💡 Adding birth data surfaces personal stars (Noble · Lu · HV · BV · MV · TY) on each matching date and refines the ranking.</span>
      <span style="display:flex;gap:6px;flex-wrap:wrap;">${tagA} ${tagB}</span>
    </div>`;
  }

  // Toolbar: Sort toggle + Range buttons (1m..5y).
  // Range buttons set window._fsRangeDays and re-run fsFindDates without
  // touching the main scan-days input. Sort toggle just re-renders.
  const currentRange = (typeof window._fsRangeDays === 'number' && window._fsRangeDays > 0)
                     ? window._fsRangeDays
                     : (parseInt((document.getElementById('scan-days') || {}).value) || 60);
  const rangeBtn = (label, days) => {
    const active = (window._fsRangeDays === days);
    const bg = active ? '#1565c0' : '#fff';
    const fg = active ? '#fff'    : '#1565c0';
    const bd = active ? '#1565c0' : '#90caf9';
    return `<button onclick="fsSetRange(${days})" style="background:${bg};color:${fg};border:1px solid ${bd};padding:5px 9px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;">${label}</button>`;
  };
  const sortBtn = (label, mode) => {
    const active = (sortMode === mode);
    const bg = active ? '#8a6a1f' : '#fff';
    const fg = active ? '#fff'    : '#8a6a1f';
    const bd = active ? '#8a6a1f' : '#d4b96f';
    return `<button onclick="fsSetSortMode('${mode}')" style="background:${bg};color:${fg};border:1px solid ${bd};padding:5px 12px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;">${label}</button>`;
  };
  const resetBtn = (typeof window._fsRangeDays === 'number')
    ? '<button onclick="fsSetRange(null)" style="background:#fff;color:#666;border:1px solid #ccc;padding:5px 9px;border-radius:6px;font-size:11px;cursor:pointer;">✕ Reset</button>'
    : '';
  const toolbar = `
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:8px 0 10px;padding:8px 10px;background:#fafafa;border:1px solid #d4b96f;border-radius:6px;">
      <div style="display:flex;gap:6px;align-items:center;">
        <span style="font-size:11px;color:#666;font-weight:bold;">Sort:</span>
        ${sortBtn('BEST', 'best')}
        ${sortBtn('LIST', 'list')}
        ${typeof window.QMDJWaterScanner !== 'undefined' ? (() => {
          const active = !!window._fsQimenActive;
          const bg = active ? '#00695c' : '#fff';
          const fg = active ? '#fff'    : '#00695c';
          const bd = active ? '#00695c' : '#80cbc4';
          const sym = active ? '★ ON' : '☆ OFF';
          return '<span style="margin-left:6px;border-left:1px solid #ccc;padding-left:8px;"><button onclick="fsToggleQimen()" style="background:' + bg + ';color:' + fg + ';border:1px solid ' + bd + ';padding:5px 12px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;">☆ QIMEN ' + sym + '</button></span>';
        })() : ''}
      </div>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
        <span style="font-size:11px;color:#666;font-weight:bold;">Range:</span>
        ${rangeBtn('1m', 30)}
        ${rangeBtn('3m', 90)}
        ${rangeBtn('6m', 180)}
        ${rangeBtn('1y', 365)}
        ${rangeBtn('2y', 730)}
        ${rangeBtn('5y', 1825)}
        ${resetBtn}
      </div>
    </div>`;

  // Enhanced summary with trigrammi and Pure YY star info
  const fTri_h = (typeof fsMountainTrigramDi === 'function') ? fsMountainTrigramDi(fSlot.startDeg + 2.8125) : null;
  const wTri_h = (typeof fsMountainTrigramTien === 'function') ? fsMountainTrigramTien(wSlot ? wSlot.centerDeg : 0) : null;
  const fTriName = fTri_h && FS_TRIGRAM_ZH ? (FS_TRIGRAM_ZH[fTri_h] || '') : '';
  const wTriName = wTri_h && FS_TRIGRAM_ZH ? (FS_TRIGRAM_ZH[wTri_h] || '') : '';
  const fTriSym = fTri_h && FS_TRIGRAM_SYM ? (FS_TRIGRAM_SYM[fTri_h] || '') : '';
  const wTriSym = wTri_h && FS_TRIGRAM_SYM ? (FS_TRIGRAM_SYM[wTri_h] || '') : '';
  
  let yyStarDisplay = '';
  if (fTri_h && wTri_h && typeof fsPureYYStarInfo === 'function') {
    const yyInfo = fsPureYYStarInfo(fTri_h, wTri_h);
    if (yyInfo.name) {
      const yyIcon = yyInfo.auspicious === true ? '✓' : yyInfo.auspicious === false ? '✗' : '';
      yyStarDisplay = ` · Pure YY: ${yyIcon} ${yyInfo.name}`;
    }
  }
  
  const fSummary = `Facing hex ${fSlot.hexNum} (qi ${fSlot.qi}, yun ${fSlot.yun})${fTriSym ? ` ${fTriSym} ${fTriName}` : ''}`
                 + (wSlot ? ` · Water hex ${wSlot.hexNum} (qi ${wSlot.qi}, yun ${wSlot.yun})${wTriSym ? ` ${wTriSym} ${wTriName}` : ''}` : ' · no water set')
                 + yyStarDisplay;
  const blCount = sorted.filter(m => m.isBL).length;

  if (!sorted.length){
    box.innerHTML = `
      <div style="font-weight:bold;font-size:13px;margin:10px 0 4px;color:#1a1008;">Matching dates for this setup</div>
      <div style="font-size:11px;color:#666;margin-bottom:8px;">${fSummary} · range ${currentRange} days</div>
      ${toolbar}
      ${personCTA}
      <div style="text-align:center;color:#888;padding:15px;font-size:12px;background:#fafafa;border:1px dashed #ccc;border-radius:6px;">No dates in this range connect to this Facing${wSlot?'+Water':''} setup. Try a wider range above.</div>`;
    return;
  }

  const qimenCount = (qimenActive) ? sorted.filter(m => m._qimenF || m._qimenW).length : 0;
  const qimenNote = (qimenActive)
    ? ` · <span style="color:#00695c;">☆ ${qimenCount} with Qimen</span>`
    : '';
  let html = `<div style="font-weight:bold;font-size:13px;margin:10px 0 4px;color:#1a1008;">
    Matching dates for this setup: <span style="color:#1b5e20;">${sorted.length} found</span>${blCount ? ` · <span style="color:#b8860b;">🔗 ${blCount} Full BL</span>` : ''}${qimenNote}
  </div>`;
  html += `<div style="font-size:11px;color:#666;margin-bottom:8px;">${fSummary} · range ${currentRange} days</div>`;
  html += toolbar;
  html += personCTA;

  html += '<div style="border:1px solid #c9a84c;border-radius:6px;overflow-x:auto;background:#fff;">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
  
  // Qimen column only when scanner is loaded
  const _qimenAvail = (typeof window.QMDJWaterScanner !== 'undefined');
  let _fPalace = null, _wPalace = null;
  if (_qimenAvail) {
    const scanner = window.QMDJWaterScanner;
    const _fDeg = fSlot ? (fSlot.startDeg + 2.8125) : null;
    const _wDeg = wSlot ? wSlot.centerDeg : null;
    _fPalace = (_fDeg != null) ? scanner.degToPalace(_fDeg) : null;
    _wPalace = (_wDeg != null) ? scanner.degToPalace(_wDeg) : null;
  }

  // Table header
  html += '<thead>';
  html += '<tr style="background:#fff8e1;">';
  html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#1565c0;width:18%;">Date</th>';
  html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#880e4f;width:10%;">Hour</th>';
  html += '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #c9a84c;color:#8a6a1f;width:auto;">XKDG Relations</th>';
  if (_qimenAvail) html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#00695c;">☆ Qimen</th>';
  html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#8a6a1f;width:14%;">Pure YY Star</th>';
  html += '<th style="text-align:center;padding:6px;border-bottom:1px solid #c9a84c;color:#8a6a1f;width:10%;">Score</th>';
  html += '</tr>';
  html += '</thead>';
  
  html += '<tbody>';
  const _matchLabels = ['', 'Hetu/Adding', 'Pure Hetu/Adding', 'Pure Qi', 'Family'];
  const _matchColors = ['', '#0277bd', '#0277bd', '#1565c0', '#1b5e20'];
  const _colSpan = _qimenAvail ? 6 : 5;
  let _qimenSepInserted = false;
  
  sorted.forEach((m, i) => {
    const dateLabel = m.date.toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    const hasQimen = !!(m._qimenF || m._qimenW);

    // In QIMEN mode: insert separator row between Qimen and non-Qimen dates
    if (qimenActive && !hasQimen && !_qimenSepInserted) {
      _qimenSepInserted = true;
      html += '<tr><td colspan="' + _colSpan + '" style="padding:6px 12px;background:#f5f5f5;border-top:2px solid #80cbc4;border-bottom:1px solid #ddd;font-size:11px;color:#666;font-weight:bold;">── Other XKDG dates (no Qimen match) ──</td></tr>';
    }
    
    // Star styling
    const starColor = m.pureYYStarInfo && m.pureYYStarInfo.auspicious === true  ? '#1b5e20'
                    : m.pureYYStarInfo && m.pureYYStarInfo.auspicious === false ? '#c0392b'
                    : '#8a6a1f';
    const starIcon  = m.pureYYStarInfo && m.pureYYStarInfo.auspicious === true  ? '✓ '
                    : m.pureYYStarInfo && m.pureYYStarInfo.auspicious === false ? '✗ '
                    : '';
    
    // XKDG Relations — facing labels on first line, water on second if present
    const xkdgHtml = '<div style="font-size:11px;color:#c0392b;font-weight:bold;">' + (m.facingLabels.length ? m.facingLabels.join(' · ') : '—') + '</div>'
                   + (wSlot ? '<div style="font-size:11px;color:#1565c0;font-weight:bold;">' + (m.waterLabels.length ? m.waterLabels.join(' · ') : '—') + '</div>' : '');
    
    // Qimen palace cards
    let qimenCell = '';
    if (_qimenAvail) {
      const _PALACE_INFO = {
        1:{tri:'Kan',han:'坎',dir:'N'},  2:{tri:'Kun',han:'坤',dir:'SW'},
        3:{tri:'Zhen',han:'震',dir:'E'}, 4:{tri:'Xun',han:'巽',dir:'SE'},
        6:{tri:'Qian',han:'乾',dir:'NW'},7:{tri:'Dui',han:'兌',dir:'W'},
        8:{tri:'Gen',han:'艮',dir:'NE'}, 9:{tri:'Li',han:'離',dir:'S'}
      };
      const _qTagColors = {
        door:  { bg:'#e8f5e9', fg:'#2e7d32' },
        qi:    { bg:'#e3f2fd', fg:'#1565c0' },
        zhi:   { bg:'#fff3e0', fg:'#e65100' },
        combo: { bg:'#fce4ec', fg:'#c62828' },
        dun:   { bg:'#e0f2f1', fg:'#00695c' },
        zha:   { bg:'#f3e5f5', fg:'#6a1b9a' },
        jia:   { bg:'#efebe9', fg:'#5d4037' },
        pen:   { bg:'#fff3cd', fg:'#856404' }
      };
      const _qSymbol = { dun:'☆', zha:'✦', jia:'◆', pen:'⚠' };

      function renderPalaceCard(result, palaceNum, label, accentColor, hourLabel, onClickStr) {
        if (!result || !result.hits || !result.hits.length) return '';
        const pi = _PALACE_INFO[palaceNum] || {};
        const cl = result.cell || {};

        var specialHits = [], penHits = [];
        result.hits.forEach(function(hit){
          if (hit.cat === 'dun' || hit.cat === 'zha' || hit.cat === 'jia') specialHits.push(hit);
          else if (hit.cat === 'pen') penHits.push(hit);
        });

        var doorColor = ['Open','Rest','Birth','View'].indexOf(cl.door)!==-1 ? '#2e7d32' : '#c62828';
        var clickAttr = onClickStr ? ' onclick="' + onClickStr + '" title="Tap to view full Qimen chart"' : '';

        var h = '<div style="border:1px solid ' + accentColor + ';border-radius:4px;margin:2px auto;background:#fff;overflow:hidden;width:88px;display:inline-block;vertical-align:top;cursor:' + (onClickStr ? 'pointer' : 'default') + ';"' + clickAttr + '>';

        // Header — just Facing or Water
        h += '<div style="background:' + accentColor + ';color:#fff;padding:2px 4px;font-size:9px;font-weight:bold;text-align:center;">'
           + label + '</div>';

        // Square cell body
        h += '<div style="padding:2px 4px;">';
        // Deity
        h += '<div style="text-align:center;color:#666;font-size:9px;font-weight:bold;line-height:1.2;">' + (cl.deity||'') + '</div>';
        // Tian stem (left) + Star (right)
        h += '<div style="display:flex;justify-content:space-between;align-items:center;">'
           + '<span style="color:#c62828;font-weight:bold;font-size:13px;">' + (cl.tiH||'') + '</span>'
           + '<span style="color:#555;font-size:8px;">' + (cl.star||'') + '</span>'
           + '</div>';
        // Door (center, bold)
        h += '<div style="text-align:center;font-weight:bold;color:' + doorColor + ';font-size:11px;line-height:1.3;">' + (cl.door||'') + '</div>';
        // Di stem + palace number
        var diExtra = (cl.zhiFu && cl.jiaName) ? '<div style="font-size:7px;color:#e65100;font-weight:bold;line-height:1;">' + cl.jiaName + '</div>' : '';
        h += '<div style="display:flex;justify-content:space-between;align-items:flex-end;">'
           + '<div><span style="color:#bf6c00;font-weight:bold;font-size:13px;">' + (cl.diH||'') + '</span>' + diExtra + '</div>'
           + '<span style="color:#999;font-weight:bold;font-size:10px;">' + palaceNum + '</span>'
           + '</div>';
        h += '</div>';

        // Config name (below cell)
        if (specialHits.length) {
          h += '<div style="border-top:1px solid ' + accentColor + '40;padding:1px 2px;background:#f8fffe;text-align:center;">';
          specialHits.forEach(function(sp){
            var sc = _qTagColors[sp.cat] || {bg:'#f5f5f5',fg:'#333'};
            var sym = _qSymbol[sp.cat] || '';
            h += '<div style="background:' + sc.bg + ';color:' + sc.fg + ';padding:1px 3px;border-radius:4px;font-size:8px;font-weight:bold;margin:1px 0;cursor:pointer;border:1px solid ' + sc.fg + '40;" onclick="event.stopPropagation();showQimenPopup(\'' + (sp.label||'').replace(/'/g,"\\'") + '\')">' + sym + ' ' + (sp.label||'') + '</div>';
          });
          h += '</div>';
        }
        if (penHits.length) {
          h += '<div style="text-align:center;padding:1px 2px;">';
          penHits.forEach(function(pn){ h += '<span style="font-size:7px;color:#856404;">⚠' + (pn.label||'') + '</span>'; });
          h += '</div>';
        }

        h += '</div>';
        return h;
      }

      let qContent = '—';
      const _hourLabel = m.bestHour ? (m.bestHour.hGan + m.bestHour.hZhi) : '';
      if (m._qimenF || m._qimenW) {
        const _hourBase = m.bestHour ? "'" + m.isoDate + "','" + m.bestHour.hGan + "','" + m.bestHour.hZhi + "'" : null;
        const _clickF = _hourBase ? "event.stopPropagation();showQimenChart(" + _hourBase + "," + _fPalace + ")" : '';
        const _clickW = _hourBase ? "event.stopPropagation();showQimenChart(" + _hourBase + "," + _wPalace + ")" : '';
        qContent = '';
        if (m._qimenF) qContent += renderPalaceCard(m._qimenF, _fPalace, 'Facing', '#00695c', _hourLabel, _clickF);
        if (m._qimenW) qContent += renderPalaceCard(m._qimenW, _wPalace, 'Water', '#1565c0', _hourLabel, _clickW);
      }
      qimenCell = '<td style="padding:4px 3px;text-align:center;border-bottom:1px solid #eee;vertical-align:top;">' + qContent + '</td>';
    }

    // Row background: Qimen-matched rows get teal tint in QIMEN mode, BL stays yellow
    let rowBg, rowBorder;
    if (m.isBL) {
      rowBg = '#fff8b0';
      rowBorder = 'border-left:4px solid #b8860b;';
    } else if (qimenActive && hasQimen) {
      rowBg = (i % 2 === 0) ? '#e0f2f1' : '#ecf7f6';
      rowBorder = 'border-left:4px solid #00695c;';
    } else {
      rowBg = (i % 2 === 0) ? '#fffaf0' : '#fff';
      rowBorder = '';
    }

    // Date label: add ☆ prefix for Qimen-matched dates in QIMEN mode
    const datePrefix = (qimenActive && hasQimen) ? '☆ ' : '';
    
    html += '<tr style="background:' + rowBg + ';' + rowBorder + 'cursor:pointer;" onclick="loadDateIntoMain(\'' + m.isoDate + '\', 6)">';
    html += '<td style="padding:6px 4px;text-align:center;color:#1565c0;font-weight:bold;border-bottom:1px solid #eee;">' + datePrefix + dateLabel + '</td>';
    // Hour cell: bestHour pillar + time range
    const _hourTimes = {'子':'23-01','丑':'01-03','寅':'03-05','卯':'05-07','辰':'07-09','巳':'09-11','午':'11-13','未':'13-15','申':'15-17','酉':'17-19','戌':'19-21','亥':'21-23'};
    const hLabel = m.bestHour ? (m.bestHour.hGan + '<br>' + m.bestHour.hZhi) : (m.dGan + '<br>' + m.dZhi);
    const hTime = (m.bestHour && _hourTimes[m.bestHour.hZhi]) ? '<div style="font-size:9px;color:#666;margin-top:1px;">' + _hourTimes[m.bestHour.hZhi] + '</div>' : '';
    html += '<td style="padding:6px 4px;text-align:center;color:#880e4f;font-weight:bold;font-size:12px;line-height:1.1;border-bottom:1px solid #eee;">' + hLabel + hTime + '</td>';
    html += '<td style="padding:6px 8px;text-align:left;border-bottom:1px solid #eee;">' + xkdgHtml + '</td>';
    html += qimenCell;
    html += '<td style="padding:6px 4px;text-align:center;border-bottom:1px solid #eee;font-size:11px;color:' + starColor + ';font-weight:bold;">' + (m.pureYYStarInfo && m.pureYYStarInfo.name ? starIcon + m.pureYYStarInfo.name : '—') + '</td>';
    const combinedScore = m.score + (m._qimenBonus || 0);
    const scoreLabel = (m._qimenBonus > 0)
      ? combinedScore + '<div style="font-size:8px;color:#00695c;font-weight:normal;">(+' + m._qimenBonus + ' ☆)</div>'
      : '' + combinedScore;
    html += '<td style="padding:6px;text-align:center;font-weight:bold;font-size:14px;color:' + (m.isBL ? '#b8860b' : '#8a6a1f') + ';border-bottom:1px solid #eee;">' + scoreLabel + '</td>';
    html += '</tr>';
  });
  
  html += '</tbody>';
  html += '</table></div>';

  box.innerHTML = html;
}

// Range button handler. Pass a positive integer to override scan-days for the
// FS matching scan; pass null to clear and revert to the main scan-days input.
// Re-runs fsFindDates with the same Facing/Water already entered.
function fsSetRange(days){
  window._fsRangeDays = (typeof days === 'number' && days > 0) ? days : null;
  fsFindDates();
}

// BEST/LIST toggle — primary sort within tier (score-priority or chronological).
// Does NOT affect QIMEN toggle.
function fsSetSortMode(mode){
  window._fsSortMode = (mode === 'list') ? 'list' : 'best';
  if (window._fsLastMatches && window._fsLastFSlot) {
    fsRenderMatchingDatesTable(window._fsLastFSlot, window._fsLastWSlot, window._fsLastMatches);
  }
}

// QIMEN toggle — independent of BEST/LIST.
// When ON: Qimen-matched dates float to top (within tier, BEST/LIST applies).
// When OFF: all dates sorted purely by BEST/LIST.
function fsToggleQimen(){
  window._fsQimenActive = !window._fsQimenActive;
  if (window._fsLastMatches && window._fsLastFSlot) {
    // Lazy annotation: run once on first activation per dataset
    if (window._fsQimenActive && !window._fsQimenAnnotated) {
      fsAnnotateQimenHits(window._fsLastMatches, window._fsLastFSlot, window._fsLastWSlot);
      window._fsQimenAnnotated = true;
    }
    fsRenderMatchingDatesTable(window._fsLastFSlot, window._fsLastWSlot, window._fsLastMatches);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  QIMEN DUNJIA ANNOTATION — extension for QMDJ Water Scanner
//
//  Annotates matching dates with QMDJ Water activation hits for the
//  Facing and Water palaces. Each match's bestHour is tested against
//  both palaces via QMDJWaterScanner.checkHourAtPalace().
//
//  Sets on each match object:
//    _qimenF   : {matched, hits, score} for Facing palace
//    _qimenW   : {matched, hits, score} for Water palace
//    _qimenFW  : true when BOTH palaces matched (convenience flag)
//
//  Called lazily on first QIMEN tab click, or auto when sort is
//  already 'qimen' and new matches arrive.
// ═══════════════════════════════════════════════════════════════════

function fsAnnotateQimenHits(matches, fSlot, wSlot){
  if (typeof window.QMDJWaterScanner === 'undefined') return;
  const scanner = window.QMDJWaterScanner;

  // Degrees → palace
  const fDeg = fSlot ? (fSlot.startDeg + 2.8125) : null;
  const wDeg = wSlot ? wSlot.centerDeg : null;
  const fPalace = (fDeg != null) ? scanner.degToPalace(fDeg) : null;
  const wPalace = (wDeg != null) ? scanner.degToPalace(wDeg) : null;

  if (!fPalace && !wPalace) return; // nothing to test

  matches.forEach(function(m){
    m._qimenF  = null;
    m._qimenW  = null;
    m._qimenFW = false;
    m._qimenBonus = 0;
    if (!m.bestHour) return;

    // Extract solar date from the Date object stored in m.date
    const Y = m.date.getFullYear(), M = m.date.getMonth() + 1, D = m.date.getDate();
    const hGan = m.bestHour.hGan;   // Chinese character (甲)
    const hZhi = m.bestHour.hZhi;   // Chinese character (子)

    if (fPalace) {
      const res = scanner.checkHourAtPalace(Y, M, D, hGan, hZhi, fPalace);
      if (res && res.matched) m._qimenF = res;
    }
    if (wPalace) {
      const res = scanner.checkHourAtPalace(Y, M, D, hGan, hZhi, wPalace);
      if (res && res.matched) m._qimenW = res;
    }
    if (m._qimenF && m._qimenW) m._qimenFW = true;

    // Compute Qimen score bonus:
    //   +15 per sector matched (F or W)
    //   +5 extra if BOTH sectors matched (F+W)
    //   + raw Qimen hit score (typically 2-5 pts per sector)
    var bonus = 0;
    if (m._qimenF) bonus += 15 + (m._qimenF.score || 0);
    if (m._qimenW) bonus += 15 + (m._qimenW.score || 0);
    if (m._qimenFW) bonus += 5;
    m._qimenBonus = bonus;
  });
}

// ── Qimen configuration popup ──
var _qimenDescriptions = {
  'Heaven Dun 天遁':   'Bing on Tian + Ding or Wu on Di + Birth door.\nPrayers, petitions to heaven, auspicious requests.',
  'Earth Dun 地遁':    'Yi on Tian + Ji on Di + Open door.\nEarth-related work, hiding, concealment.',
  'Human Dun 人遁':    'Ding on Tian + Rest door + Yin deity.\nSocial matters, human relationships.',
  'Deity Dun 神遁':    'Yi on Tian + Birth door + Heaven deity.\nSpiritual activities, divine support.',
  'Ghost Dun 鬼遁':    'Ding on Tian + Delusion door + Earth deity.\nCommunicating with spirits, rituals.',
  'Wind Dun 風遁':     'Yi on Tian + favorable door + Xun palace.\nQuick movement, travel, wind energy.',
  'Cloud Dun 云遁':    'Yi on Tian + Xin on Di + favorable door.\nConcealment, mystery, hidden support.',
  'Dragon Dun 龍遁':   'Yi on Tian + favorable door + Kan palace.\nWater activities, aquatic energy.',
  'Tiger Dun 虎遁':    'Yi on Tian + Xin on Di + Rest/Birth door + Gen palace.\nMountain energy, stability.',
  'Real Pretenses 真詐':     'San Qi on Tian + favorable door + Yin deity.\nSpiritual and charitable activities.',
  'Rest Pretenses 休詐':     'San Qi on Tian + favorable door + Harmonies deity.\nMedicine, healing, religious activities.',
  'Multiple Pretenses 重詐': 'San Qi on Tian + favorable door + Earth deity.\nFame, fortune, attracting people.',
  'Heaven Borrows 天假':   'Earth deity + San Qi + View door.\nWar, litigation, important positions.',
  'Earth Borrows 地假':    'Earth/Yin/Harmonies + Ding/Ji/Gui + Delusion door.\nHiding, preparations, secret affairs.',
  'Human Borrows 人假':    'Heaven deity + Ren + Shocking door.\nPursuing fugitives, tracking.',
  'Deity Borrows 神假':    'Earth/Harmonies + Ding/Ji/Gui + Injury door.\nHiding valuables, seeking compensation.',
  'Ghost Borrows 鬼假':    'Earth deity + Ding/Ji/Gui + Death door.\nBurial rites, hunting, pacifying.'
};
function showQimenPopup(label){
  var old = document.getElementById('qimen-popup-overlay');
  if(old) old.remove();
  old = document.getElementById('qimen-popup');
  if(old) old.remove();
  var desc = _qimenDescriptions[label] || '';
  if(!desc) return;
  var overlay = document.createElement('div');
  overlay.id = 'qimen-popup-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9998;';
  var div = document.createElement('div');
  div.id = 'qimen-popup';
  div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid #00695c;border-radius:10px;padding:14px 18px;max-width:300px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
  div.innerHTML = '<div style="font-weight:bold;color:#00695c;font-size:14px;margin-bottom:6px;">' + label + '</div>'
    + '<div style="color:#333;font-size:12px;line-height:1.5;white-space:pre-line;">' + desc + '</div>'
    + '<div style="text-align:right;margin-top:10px;"><button onclick="document.getElementById(\'qimen-popup\').remove();document.getElementById(\'qimen-popup-overlay\').remove()" style="background:#00695c;color:#fff;border:none;padding:5px 16px;border-radius:6px;font-size:11px;cursor:pointer;">OK</button></div>';
  overlay.onclick = function(){ div.remove(); overlay.remove(); };
  document.body.appendChild(overlay);
  document.body.appendChild(div);
}

// ── Jia hiding (六甲遁) and Zhi Fu/Zhi Shi popups ──
function showJiaPopup(jiaName){
  var explanations = {
    '甲子戊': 'Jia Zi hiding as Wu (戊). The Commander 甲 conceals himself in the Wu stem.',
    '甲戌己': 'Jia Xu hiding as Ji (己). The Commander 甲 conceals himself in the Ji stem.',
    '甲申庚': 'Jia Shen hiding as Geng (庚). The Commander 甲 conceals himself in the Geng stem.',
    '甲午辛': 'Jia Wu hiding as Xin (辛). The Commander 甲 conceals himself in the Xin stem.',
    '甲辰壬': 'Jia Chen hiding as Ren (壬). The Commander 甲 conceals himself in the Ren stem.',
    '甲寅癸': 'Jia Yin hiding as Gui (癸). The Commander 甲 conceals himself in the Gui stem.'
  };
  var desc = explanations[jiaName] || 'The Six Jia (六甲) are the leaders of the 60 Jia Zi cycle, each hiding under a different stem during their Xun (10-day cycle).';
  _showInfoPopup('六甲遁 · ' + jiaName, desc);
}
function showZhiPopup(which){
  if(which === 'zhiFu'){
    _showInfoPopup('直符 Zhi Fu (Commander)',
      'The Zhi Fu (直符) is the palace where the active Commander stem 甲 is hidden. It carries the highest authority and is the most auspicious palace for matters of leadership, official affairs, and important decisions.');
  } else {
    _showInfoPopup('直使 Zhi Shi (Door of the Commander)',
      'The Zhi Shi (直使) is the palace where the active Door of the Commander resides. It represents the active force and is auspicious for taking action, movement, and decisive deeds.');
  }
}
function _showInfoPopup(title, desc){
  var old = document.getElementById('info-popup-overlay');
  if(old) old.remove();
  old = document.getElementById('info-popup');
  if(old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'info-popup-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9998;';
  var div = document.createElement('div');
  div.id = 'info-popup';
  div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid #e65100;border-radius:10px;padding:14px 18px;max-width:320px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
  div.innerHTML = '<div style="font-weight:bold;color:#e65100;font-size:14px;margin-bottom:6px;">' + title + '</div>'
    + '<div style="color:#333;font-size:12px;line-height:1.5;">' + desc + '</div>'
    + '<div style="text-align:right;margin-top:10px;"><button onclick="document.getElementById(\'info-popup\').remove();document.getElementById(\'info-popup-overlay\').remove()" style="background:#e65100;color:#fff;border:none;padding:5px 16px;border-radius:6px;font-size:11px;cursor:pointer;">OK</button></div>';
  overlay.onclick = function(){ div.remove(); overlay.remove(); };
  document.body.appendChild(overlay);
  document.body.appendChild(div);
}

// ── Full Qimen Hour Chart display ──
// Called when user taps a Qimen card. Renders the complete 9-palace
// flying chart at the bottom of the results area.
function showQimenChart(isoDate, hGan, hZhi, highlightPalace){
  if (!isoDate || !hGan || !hZhi) return;
  if (typeof window.QMDJWaterScanner === 'undefined') return;
  var parts = isoDate.split('-');
  var Y = parseInt(parts[0]), M = parseInt(parts[1]), D = parseInt(parts[2]);
  var chart = window.QMDJWaterScanner.getHourChart(Y, M, D, hGan, hZhi);
  if (!chart) { alert('Cannot load chart for ' + isoDate + ' ' + hGan + hZhi); return; }

  // Direction info (label, hanzi, di-pan trigram)
  var DIR = {
    4:{dir:'SE',han:'巽',tri:'☴'}, 9:{dir:'S',han:'離',tri:'☲'}, 2:{dir:'SW',han:'坤',tri:'☷'},
    3:{dir:'E',han:'震',tri:'☳'},  5:{dir:'C',han:'',tri:''},     7:{dir:'W',han:'兌',tri:'☱'},
    8:{dir:'NE',han:'艮',tri:'☶'}, 1:{dir:'N',han:'坎',tri:'☵'},  6:{dir:'NW',han:'乾',tri:'☰'}
  };
  // Traditional QMDJ stem colors
  function stemColor(stem){
    if(!stem) return '#333';
    if(stem==='甲'||stem==='乙') return '#2e7d32'; // wood: green
    if(stem==='丙'||stem==='丁') return '#c62828'; // fire: red
    if(stem==='戊'||stem==='己') return '#bf6c00'; // earth: brown
    if(stem==='庚'||stem==='辛') return '#424242'; // metal: dark gray
    if(stem==='壬'||stem==='癸') return '#1565c0'; // water: blue
    return '#333';
  }
  var FAV = ['Open','Rest','Birth','View'];
  var GREEN = '#0d5e2c';  // dark forest green like the reference
  var gridOrder = [4,9,2, 3,5,7, 8,1,6]; // SE,S,SW, E,C,W, NE,N,NW

  function cellHtml(p){
    var d = chart.palaces[p];
    var di = DIR[p];
    if(!d){
      return '<td style="background:#fff;padding:6px;text-align:center;color:#aaa;border:1px solid '+GREEN+';">—</td>';
    }
    var doorColor = FAV.indexOf(d.door)!==-1 ? '#1b5e20' : '#c62828';
    var isHighlight = (highlightPalace && p === highlightPalace);
    var bg = isHighlight ? '#fff3b0' : '#fff';
    var border = isHighlight ? '3px solid #f9a825' : '1px solid ' + GREEN;

    // Mark Zhi Shi only (Zhi Fu is visible via Commander deity already)
    var zMark = '';
    if(d.zhiShi) zMark = '<div onclick="event.stopPropagation();showZhiPopup(\'zhiShi\')" style="display:inline-block;font-size:10px;color:#e65100;font-weight:bold;line-height:1.2;cursor:pointer;background:#fff8e1;border:1px solid #ffb74d;border-radius:3px;padding:1px 5px;margin-top:2px;">Zhi Shi ℹ</div>';
    var jia = ''; // Jia hiding name removed per user request

    // Center palace gets a special layout with vertical spacing between the two stems
    if(p === 5){
      return '<td style="background:'+bg+';padding:8px 7px;vertical-align:middle;text-align:center;border:'+border+';width:33%;">'
        + '<div style="text-align:center;color:#222;font-size:13px;font-weight:bold;">' + (d.deity||'Center') + '</div>'
        + '<div style="color:'+stemColor(d.tiH)+';font-weight:bold;font-size:18px;margin:8px 0 2px;">' + (d.tiH||'') + '</div>'
        + '<div style="color:#444;font-size:12px;">' + (d.star||'') + '</div>'
        + '<div style="color:'+stemColor(d.diH)+';font-weight:bold;font-size:18px;margin:8px 0 2px;">' + (d.diH||'') + '</div>'
        + '<div style="color:#999;font-size:13px;font-weight:bold;margin-top:4px;">' + p + '</div>'
        + '</td>';
    }

    return '<td style="background:'+bg+';padding:6px 7px;vertical-align:top;border:'+border+';width:33%;">'
      + '<div style="text-align:center;color:#222;font-size:13px;font-weight:bold;line-height:1.2;">' + (d.deity||'') + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;">'
      +   '<span style="color:'+stemColor(d.tiH)+';font-weight:bold;font-size:17px;">' + (d.tiH||'') + '</span>'
      +   '<span style="color:#444;font-size:12px;">' + (d.star||'') + '</span>'
      + '</div>'
      + '<div style="text-align:center;font-weight:bold;color:'+doorColor+';font-size:16px;margin:4px 0;">' + (d.door||'') + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-end;">'
      +   '<div><span style="color:'+stemColor(d.diH)+';font-weight:bold;font-size:17px;">' + (d.diH||'') + '</span>' + jia + zMark + '</div>'
      +   '<span style="color:#999;font-size:13px;font-weight:bold;">' + p + '</span>'
      + '</div>'
      + '</td>';
  }

  // Branch labels around the perimeter (each side has 3 cells)
  // Top row of branches:    SE→巳  S→午  SW→未
  // Right col of branches:  SW→申  W→酉  NW→戌
  // Bottom row of branches: NW→亥  N→子  NE→丑
  // Left col of branches:   NE→寅  E→卯  SE→辰
  var labelStyle = 'color:#fff;font-weight:bold;font-size:14px;text-align:center;background:'+GREEN+';';
  var triStyle   = 'color:#cfe8d4;font-size:12px;text-align:center;background:'+GREEN+';width:18px;';
  var brStyle    = 'color:#fff;font-size:13px;text-align:center;background:'+GREEN+';width:18px;';
  var cornerStyle= 'color:#fff;font-weight:bold;font-size:10px;text-align:center;background:'+GREEN+';width:18px;';

  // Build the full table layout (5 rows × 5 cols)
  var html = '<div id="qimen-full-chart" style="margin:16px auto;max-width:480px;border-radius:8px;overflow:hidden;background:'+GREEN+';">';

  // Title bar
  html += '<div style="background:#fff;color:'+GREEN+';padding:8px 12px;font-weight:bold;font-size:14px;text-align:center;border-bottom:2px solid '+GREEN+';">'
       + '📅 QMDJ • Hour Flying Chart'
       + '<span onclick="document.getElementById(\'qimen-full-chart\').remove()" style="float:right;cursor:pointer;font-size:18px;color:#666;">✕</span>'
       + '</div>';

  // Main table
  html += '<table style="width:100%;border-collapse:collapse;background:'+GREEN+';">';

  // Row 1: corner | SE label+branch | S label+branch | SW label+branch | corner
  html += '<tr>'
       + '<td style="'+cornerStyle+'padding:4px;">SE</td>'
       + '<td style="'+labelStyle+'padding:4px;">'+DIR[4].tri+' 巳</td>'
       + '<td style="'+labelStyle+'padding:4px;">'+DIR[9].tri+' S 午</td>'
       + '<td style="'+labelStyle+'padding:4px;">未 '+DIR[2].tri+'</td>'
       + '<td style="'+cornerStyle+'padding:4px;">SW</td>'
       + '</tr>';

  // Row 2: 辰 | P4 | P9 | P2 | 申
  html += '<tr>'
       + '<td style="'+brStyle+'padding:6px 2px;">辰</td>'
       + cellHtml(4) + cellHtml(9) + cellHtml(2)
       + '<td style="'+brStyle+'padding:6px 2px;">申</td>'
       + '</tr>';

  // Row 3: E+卯 | P3 | P5 | P7 | 酉+W
  html += '<tr>'
       + '<td style="'+labelStyle+'padding:6px 2px;line-height:1.3;">E<br>'+DIR[3].tri+'<br>卯</td>'
       + cellHtml(3) + cellHtml(5) + cellHtml(7)
       + '<td style="'+labelStyle+'padding:6px 2px;line-height:1.3;">W<br>'+DIR[7].tri+'<br>酉</td>'
       + '</tr>';

  // Row 4: 寅 | P8 | P1 | P6 | 戌
  html += '<tr>'
       + '<td style="'+brStyle+'padding:6px 2px;">寅</td>'
       + cellHtml(8) + cellHtml(1) + cellHtml(6)
       + '<td style="'+brStyle+'padding:6px 2px;">戌</td>'
       + '</tr>';

  // Row 5: NE | NE-丑 | N-子 | 亥-NW | NW
  html += '<tr>'
       + '<td style="'+cornerStyle+'padding:4px;">NE</td>'
       + '<td style="'+labelStyle+'padding:4px;">'+DIR[8].tri+' 丑</td>'
       + '<td style="'+labelStyle+'padding:4px;">'+DIR[1].tri+' N 子</td>'
       + '<td style="'+labelStyle+'padding:4px;">亥 '+DIR[6].tri+'</td>'
       + '<td style="'+cornerStyle+'padding:4px;">NW</td>'
       + '</tr>';

  html += '</table>';

  // Footer with date/hour
  html += '<div style="background:#fff;color:#444;padding:6px 12px;text-align:center;font-size:12px;border-top:2px solid '+GREEN+';">'
       + isoDate + ' · ' + hGan + hZhi
       + ' <span style="color:#888;">(' + chart.dun + ' dun, ju ' + chart.ju + ')</span>'
       + '</div>';

  html += '</div>';

  // Remove previous chart if any
  var old = document.getElementById('qimen-full-chart');
  if(old) old.remove();

  // Insert at the bottom of the results area
  var area = document.getElementById('fs-results-area');
  if(area) area.insertAdjacentHTML('beforeend', html);
  // Scroll to it
  var el = document.getElementById('qimen-full-chart');
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

// ── Suggest closest favorable Water position ──
// Searches all 64 hex slots for Water positions that:
//   (1) are Ling Shen (valid),
//   (2) are within FS_WATER_MAX_DEG of facing,
//   (3) have at least one XKDG connection with facing (Hetu/Adding/Pure Qi/Family/Inverse),
//   (4) have an auspicious Pure YY star (Fu Bi, Wu Qu, Tan Lang, or Ju Men).
// Among valid candidates, picks the one closest to the current Water (or facing if none).
function fsSuggestWater(){
  const fIn = parseFloat(document.getElementById('fs-facing').value);
  if (!isFinite(fIn)) { alert('Please set Facing first.'); return; }
  const fSlot = fsSlotForDeg(fIn);
  const fCenter = fSlot.centerDeg;
  const fTri = (typeof fsMountainTrigramTien === 'function') ? fsMountainTrigramTien(fCenter) : null;
  if (!fTri) { alert('Cannot compute Facing trigram.'); return; }

  const curWaterIn = parseFloat(document.getElementById('fs-water').value);
  const refDeg = isFinite(curWaterIn) ? curWaterIn : fCenter; // distance reference

  // Scan all 64 slots
  const candidates = [];
  for (let i = 0; i < FS_SLOTS.length; i++){
    const s = FS_SLOTS[i];
    if (s.hexNum === fSlot.hexNum) continue;
    if (!fsIsLingShen(s.yun)) continue;
    const distFromFacing = fsAngularDist(fCenter, s.centerDeg);
    if (distFromFacing > FS_WATER_MAX_DEG) continue;
    const lbls = hexConnectionLabels(s.hexNum, s.qi, s.yun, fSlot.hexNum, fSlot.qi, fSlot.yun);
    if (!lbls.length) continue;
    const wTri = fsMountainTrigramTien(s.centerDeg);
    const pyy  = fsPureYYStarInfo(fTri, wTri);
    if (pyy.auspicious !== true) continue;
    candidates.push({
      slot: s,
      distFromCurrent: fsAngularDist(refDeg, s.centerDeg),
      labels: lbls,
      pyy: pyy
    });
  }

  if (!candidates.length){
    alert('No favorable Water position found for this Facing.\n\nTry a different Facing or check Ling Shen rules.');
    return;
  }

  // Sort by distance from current water (ascending)
  candidates.sort((a, b) => a.distFromCurrent - b.distFromCurrent);
  const best = candidates[0];

  // Build popup
  var old = document.getElementById('suggest-water-popup');
  if (old) old.remove();
  old = document.getElementById('suggest-water-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'suggest-water-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9998;';

  const div = document.createElement('div');
  div.id = 'suggest-water-popup';
  div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid #4a9ead;border-radius:10px;padding:16px 20px;max-width:360px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-size:13px;';

  const altCount = Math.min(3, candidates.length);
  let altHtml = '';
  if (candidates.length > 1){
    altHtml = '<div style="margin-top:10px;border-top:1px solid #eee;padding-top:8px;font-size:11px;color:#666;"><b>Other options (closest after best):</b><br>';
    for (let i = 1; i < altCount; i++){
      const c = candidates[i];
      altHtml += '<div style="margin:3px 0;">• <b>' + c.slot.centerDeg.toFixed(1) + '°</b> · hex ' + c.slot.hexNum
              + ' · ' + c.pyy.name + ' · ' + c.labels[0]
              + ' · dist ' + c.distFromCurrent.toFixed(1) + '°</div>';
    }
    altHtml += '</div>';
  }

  div.innerHTML =
    '<div style="font-weight:bold;color:#4a9ead;font-size:15px;margin-bottom:10px;">💡 Suggested Water</div>'
    + '<div style="margin-bottom:6px;"><b>Position:</b> <span style="color:#4a9ead;font-size:16px;font-weight:bold;">' + best.slot.centerDeg.toFixed(2) + '°</span> (hex ' + best.slot.hexNum + ', qi ' + best.slot.qi + ', yun ' + best.slot.yun + ')</div>'
    + '<div style="margin-bottom:4px;"><b>XKDG:</b> <span style="color:#c0392b;">' + best.labels.join(' · ') + '</span></div>'
    + '<div style="margin-bottom:4px;"><b>Pure YY:</b> <span style="color:#1b5e20;">✓ ' + best.pyy.name + '</span></div>'
    + '<div style="margin-bottom:8px;"><b>Distance from current Water:</b> ' + best.distFromCurrent.toFixed(1) + '°</div>'
    + altHtml
    + '<div style="text-align:right;margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">'
    + '<button onclick="document.getElementById(\'suggest-water-popup\').remove();document.getElementById(\'suggest-water-overlay\').remove();" style="background:#999;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;">Cancel</button>'
    + '<button onclick="document.getElementById(\'fs-water\').value=' + best.slot.centerDeg.toFixed(3) + ';fsRedraw();document.getElementById(\'suggest-water-popup\').remove();document.getElementById(\'suggest-water-overlay\').remove();" style="background:#4a9ead;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;">Apply</button>'
    + '</div>';

  overlay.onclick = function(){ div.remove(); overlay.remove(); };
  document.body.appendChild(overlay);
  document.body.appendChild(div);
}

// Scroll the user back to the Person A (or B) input panel and focus its date
// field so they can complete the setup. Used by the CTA tags in the
// matching-dates table when a person is not yet loaded.
function fsScrollToPerson(which){
  const isB = (which === 'b' || which === 'B');
  const panelId = isB ? 'person-panel-b' : 'person-panel-a';
  const inputId = isB ? 'person-date-b'  : 'person-date';
  const panel = document.getElementById(panelId);
  if (panel) {
    if (panel.style.display === 'none') panel.style.display = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const dateInput = document.getElementById(inputId);
    if (dateInput) setTimeout(() => dateInput.focus(), 400);
  } else {
    // Fallback: scroll to top of page if panel id changed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PURE YIN/YANG FILTER — extension v5 (additive, non-invasive)
//
//  Adds:
//   - "Solo Pure YY" toggle button in the toolbar (default ON):
//     when on, the pairs table shows only pairs that are Pure Yin or
//     Pure Yang (i.e. ☯ rosso). When off, all pairs are visible.
//   - Subtle pink background on Pure Yin/Yang rows so they stand out
//     even when the filter is off.
//
//  No XKDG / feng shui calculation is modified. The pairs table is
//  rendered normally by the original code, then rows that are not
//  Pure Yin/Yang are hidden via CSS display:none.
// ═══════════════════════════════════════════════════════════════════

let FS_FILTER_PURE_YY = true; // default: only Pure YY visible

function fsToggleFilterPureYY(){
  FS_FILTER_PURE_YY = !FS_FILTER_PURE_YY;
  const btn = document.getElementById('fs-filter-pyy-btn');
  if (btn){
    btn.style.background = FS_FILTER_PURE_YY ? '#c0392b' : '#aaa';
    btn.textContent = FS_FILTER_PURE_YY ? '✓ Pure YY' : 'Pure YY';
  }
  fsApplyPureYYFilter();
}

function fsApplyPureYYFilter(){
  const box = document.getElementById('fs-pairs-table');
  if (!box) return;
  const rows = box.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const isPureYY = !!row.querySelector('span[title="Yin/Yang mountain match"]');
    row.style.display = (FS_FILTER_PURE_YY && !isPureYY) ? 'none' : '';
    row.style.backgroundColor = isPureYY ? 'rgba(192, 57, 43, 0.08)' : '';
  });
}

function fsInjectPureYYFilterButton(){
  if (document.getElementById('fs-filter-pyy-btn')) return;
  const periodLbl = document.getElementById('fs-period-lbl');
  if (!periodLbl) return;
  const html =
    '<span style="margin-left:8px;color:#666;">|</span>' +
    '<button id="fs-filter-pyy-btn" onclick="fsToggleFilterPureYY()" ' +
    'style="background:#c0392b;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;font-weight:bold;" ' +
    'title="Show only Pure Yin/Yang pairs (☯)">✓ Pure YY</button>';
  periodLbl.insertAdjacentHTML('afterend', html);
}

const _fsRenderPairsTableOrig = fsRenderPairsTable;
fsRenderPairsTable = function(){
  _fsRenderPairsTableOrig();
  fsApplyPureYYFilter();
};

const _buildFengShuiViewOrig = buildFengShuiView;
buildFengShuiView = function(){
  _buildFengShuiViewOrig();
  fsInjectPureYYFilterButton();
};

(function(){
  const v = document.getElementById('fengshui-view');
  if (v && v.dataset.built === '1') fsInjectPureYYFilterButton();
})();

// ═══════════════════════════════════════════════════════════════════
//  SAVED LOCATION — extension v6 (additive, non-invasive)
//
//  Adds a SAVE button (in index.html, next to NOW and GPS) that
//  persists the current longitude, UTC offset, and DST state to
//  localStorage. On the next app launch, these values are restored
//  automatically into the inputs instead of the CET defaults.
//
//  No existing logic is touched. If the user clicks GPS, the inputs
//  get overwritten as usual — only the saved values are reapplied
//  at startup.
// ═══════════════════════════════════════════════════════════════════

const XKDG_LOC_KEY = 'xkdg_saved_location';

function saveLocation(){
  try {
    const lon = document.getElementById('longitude');
    const utc = document.getElementById('utc-offset');
    const dst = document.getElementById('dst-btn');
    const data = {
      longitude: lon ? lon.value : null,
      utcOffset: utc ? utc.value : null,
      dstOn:     dst ? dst.textContent.includes('ON') : false
    };
    localStorage.setItem(XKDG_LOC_KEY, JSON.stringify(data));
    // Visual feedback on the button
    const btn = document.getElementById('btn-save-loc');
    if (btn){
      const origText = btn.textContent;
      const origBg   = btn.style.background;
      btn.textContent  = '✓';
      btn.style.background = '#27ae60';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.textContent     = origText;
        btn.style.background = origBg;
        btn.style.color = '';
      }, 1200);
    }
  } catch (e) {
    console.error('saveLocation failed:', e);
  }
}

function loadSavedLocation(){
  try {
    const raw = localStorage.getItem(XKDG_LOC_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const lon = document.getElementById('longitude');
    const utc = document.getElementById('utc-offset');
    const dst = document.getElementById('dst-btn');
    if (lon && data.longitude != null) lon.value = data.longitude;
    if (utc && data.utcOffset != null) utc.value = data.utcOffset;
    if (dst){
      const currentlyOn = dst.textContent.includes('ON');
      const savedOn     = !!data.dstOn;
      if (currentlyOn !== savedOn && typeof toggleDST === 'function'){
        toggleDST();
      }
    }
  } catch (e) {
    console.error('loadSavedLocation failed:', e);
  }
}

// Run as early as possible — if DOM is ready use it now; else wait
if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', loadSavedLocation);
} else {
  loadSavedLocation();
}

// ── Inject SAVE button next to the longitude input (additive, idempotent) ──
// The saveLocation() function above expects an element with id="btn-save-loc".
// Since the button may be missing from index.html, we create it dynamically
// here, mirroring the city-picker injection pattern at the bottom of this file.
(function setupSaveLocButton(){
  function inject(){
    if (document.getElementById('btn-save-loc')) return;
    const lon = document.getElementById('longitude');
    if (!lon || !lon.parentElement) return;
    const btn = document.createElement('button');
    btn.id = 'btn-save-loc';
    btn.type = 'button';
    btn.textContent = '💾 SAVE';
    btn.title = 'Save longitude, UTC offset and DST as default for next launch';
    btn.style.cssText =
      'margin-left:6px;padding:6px 10px;border:1px solid #1565c0;' +
      'background:#1565c0;color:#fff;border-radius:4px;cursor:pointer;' +
      'font-size:13px;font-weight:bold;';
    btn.addEventListener('click', saveLocation);
    // Place it in the geo-row-top container (new layout v428+)
    const geoTop = document.getElementById('geo-row-top');
    if (geoTop) {
      geoTop.appendChild(btn);
    } else {
      // Fallback for older HTML without geo-row-top
      lon.parentElement.insertBefore(btn, lon.nextSibling);
    }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

// ═══════════════════════════════════════════════════════════════════
//  GPS HALF-HOUR TIMEZONE WARNING — extension v7 (additive)
//
//  Wraps getGPS() to warn the user when the detected coordinates
//  fall in a region with non-standard (half-hour or quarter-hour)
//  time zones. Helps avoid silently using a wrong UTC offset, which
//  the GPS auto-set (round longitude/15) cannot detect.
//
//  Regions covered:
//   - Indian subcontinent + neighbors
//     (India +5:30, Sri Lanka +5:30, Nepal +5:45, Myanmar +6:30,
//      Iran +3:30, Afghanistan +4:30)
//   - Central Australia (Adelaide / Darwin, UTC+9:30, +10:30 DST)
//   - Newfoundland, Canada (UTC-3:30)
//
//  The original GPS behavior (longitude, UTC offset, true solar)
//  is preserved. Only an extra alert is shown when applicable.
// ═══════════════════════════════════════════════════════════════════

function _xkdgInBBox(lat, lon, latMin, latMax, lonMin, lonMax){
  return lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax;
}

function checkHalfHourTimezone(lat, lon){
  // Indian subcontinent + adjacent half-hour / quarter-hour zones
  if (_xkdgInBBox(lat, lon, 5, 37, 60, 100)){
    alert(
      'GPS detected your location in the Indian / South Asian region.\n\n' +
      'Several countries here use NON-STANDARD (half-hour or ' +
      'quarter-hour) UTC offsets that the GPS button cannot detect ' +
      'automatically:\n\n' +
      '  • India        UTC+5:30\n' +
      '  • Sri Lanka    UTC+5:30\n' +
      '  • Nepal        UTC+5:45\n' +
      '  • Myanmar      UTC+6:30\n' +
      '  • Iran         UTC+3:30\n' +
      '  • Afghanistan  UTC+4:30\n\n' +
      'Please verify and correct the UTC OFFSET field manually ' +
      'before calculating.'
    );
    return;
  }
  // Central Australia (Adelaide, Darwin)
  if (_xkdgInBBox(lat, lon, -38, -10, 129, 141)){
    alert(
      'GPS detected your location in CENTRAL AUSTRALIA.\n\n' +
      'This region uses non-standard UTC offsets:\n' +
      '  • UTC+9:30  (standard time)\n' +
      '  • UTC+10:30 (with DST)\n\n' +
      'Please verify and correct the UTC OFFSET field manually ' +
      'before calculating.'
    );
    return;
  }
  // Newfoundland and Labrador, Canada
  if (_xkdgInBBox(lat, lon, 46, 52, -60, -52)){
    alert(
      'GPS detected your location in NEWFOUNDLAND, Canada.\n\n' +
      'This region uses UTC-3:30 (standard time).\n\n' +
      'Please verify and correct the UTC OFFSET field manually ' +
      'before calculating.'
    );
    return;
  }
}

// Wrap the original getGPS to inject the half-hour-timezone check
const _getGPSOrig = getGPS;
getGPS = function(){
  if (!navigator.geolocation){
    alert('Geolocation not supported by this browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    document.getElementById('longitude').value = lon.toFixed(2);
    // Use smart lookup (handles Malaysia, China, India, Spain, etc.)
    const utcReal    = (typeof getRealUtcOffset === 'function') ? getRealUtcOffset(lat, lon) : Math.round(lon / 15);
    const utcClamped = Math.max(-12, Math.min(14, utcReal));
    document.getElementById('utc-offset').value = utcClamped;
    checkHalfHourTimezone(lat, lon);
    if (typeof calculateBazi === 'function') calculateBazi();
  }, (err) => {
    alert('GPS error: ' + err.message);
  }, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000
  });
};

// ═══════════════════════════════════════════════════════════════════
//  FS LAYOUT EXPAND + LUOPAN ZOOM — extension v8 (additive)
//
//  - Makes the luopan canvas use the full viewport width (escapes
//    the container's max-width and padding via the negative-margin
//    "full-bleed" trick), so on mobile the luopan is as large as
//    the screen allows.
//  - Adds pinch-to-zoom (1x..5x), one-finger pan when zoomed,
//    and double-tap to reset on mobile.
//  - On desktop: mouse wheel zoom + double-click reset.
//
//  Wraps buildFengShuiView so the existing code is untouched.
// ═══════════════════════════════════════════════════════════════════

// ── Layout expansion ────────────────────────────────────────────────
function fsExpandLayout(){
  const view = document.getElementById('fengshui-view');
  if (!view) return;
  const inner = view.firstElementChild;
  if (inner){
    inner.style.maxWidth = 'none';
  }
  const cwrap = document.getElementById('fs-canvas-wrap');
  if (cwrap){
    cwrap.style.maxWidth   = 'none';
    cwrap.style.width      = '100vw';
    cwrap.style.marginLeft  = 'calc(50% - 50vw)';
    cwrap.style.marginRight = 'calc(50% - 50vw)';
    cwrap.style.background = '#fff';
    cwrap.style.overflow   = 'hidden'; // clip zoom transform
  }
}

// ── Pinch/wheel zoom state ─────────────────────────────────────────
let _fsZoomScale = 1;
let _fsZoomTx = 0, _fsZoomTy = 0;
let _fsPinchInitDist = 0, _fsPinchInitScale = 1;
let _fsPinchInitTx = 0,   _fsPinchInitTy = 0;
let _fsPinchInitCx = 0,   _fsPinchInitCy = 0;
let _fsPanLastX = 0, _fsPanLastY = 0, _fsPanning = false;
let _fsLastTapTime = 0;

function _fsApplyTransform(){
  const canvas = document.getElementById('fs-canvas');
  if (!canvas) return;
  canvas.style.transformOrigin = '0 0';
  canvas.style.transform =
    'translate(' + _fsZoomTx + 'px, ' + _fsZoomTy + 'px) ' +
    'scale('     + _fsZoomScale + ')';
}

function _fsResetZoom(){
  _fsZoomScale = 1;
  _fsZoomTx = 0;
  _fsZoomTy = 0;
  _fsApplyTransform();
}

function _fsAttachZoomHandlers(){
  const canvas = document.getElementById('fs-canvas');
  if (!canvas || canvas.dataset.zoomAttached === '1') return;
  canvas.dataset.zoomAttached = '1';
  canvas.style.touchAction = 'none';
  canvas.title = 'Pinch to zoom · drag to pan · double-tap to reset';

  // Mobile: touch
  canvas.addEventListener('touchstart', function(e){
    if (e.touches.length === 2){
      const t0 = e.touches[0], t1 = e.touches[1];
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      _fsPinchInitDist  = Math.sqrt(dx*dx + dy*dy);
      _fsPinchInitScale = _fsZoomScale;
      _fsPinchInitTx    = _fsZoomTx;
      _fsPinchInitTy    = _fsZoomTy;
      const rect = canvas.getBoundingClientRect();
      _fsPinchInitCx = (t0.clientX + t1.clientX) / 2 - rect.left;
      _fsPinchInitCy = (t0.clientY + t1.clientY) / 2 - rect.top;
      _fsPanning = false;
      e.preventDefault();
    } else if (e.touches.length === 1){
      const now = Date.now();
      if (now - _fsLastTapTime < 300){
        _fsResetZoom();
        _fsLastTapTime = 0;
        e.preventDefault();
        return;
      }
      _fsLastTapTime = now;
      if (_fsZoomScale > 1.01){
        _fsPanning = true;
        _fsPanLastX = e.touches[0].clientX;
        _fsPanLastY = e.touches[0].clientY;
        e.preventDefault();
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function(e){
    if (e.touches.length === 2 && _fsPinchInitDist > 0){
      const t0 = e.touches[0], t1 = e.touches[1];
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const newScale = Math.max(1, Math.min(5, _fsPinchInitScale * (dist / _fsPinchInitDist)));
      const k = newScale / _fsPinchInitScale;
      _fsZoomTx = _fsPinchInitCx - (_fsPinchInitCx - _fsPinchInitTx) * k;
      _fsZoomTy = _fsPinchInitCy - (_fsPinchInitCy - _fsPinchInitTy) * k;
      _fsZoomScale = newScale;
      _fsApplyTransform();
      e.preventDefault();
    } else if (e.touches.length === 1 && _fsPanning){
      const dx = e.touches[0].clientX - _fsPanLastX;
      const dy = e.touches[0].clientY - _fsPanLastY;
      _fsZoomTx += dx;
      _fsZoomTy += dy;
      _fsPanLastX = e.touches[0].clientX;
      _fsPanLastY = e.touches[0].clientY;
      _fsApplyTransform();
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function(){
    _fsPanning = false;
    _fsPinchInitDist = 0;
    if (_fsZoomScale < 1) _fsResetZoom();
  });

  // Desktop: wheel + dblclick
  canvas.addEventListener('wheel', function(e){
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const delta = -e.deltaY * 0.002;
    const newScale = Math.max(1, Math.min(5, _fsZoomScale * (1 + delta)));
    if (Math.abs(newScale - _fsZoomScale) < 0.001) return;
    const k = newScale / _fsZoomScale;
    _fsZoomTx = cx - (cx - _fsZoomTx) * k;
    _fsZoomTy = cy - (cy - _fsZoomTy) * k;
    _fsZoomScale = newScale;
    _fsApplyTransform();
  }, { passive: false });

  canvas.addEventListener('dblclick', function(e){
    e.preventDefault();
    _fsResetZoom();
  });
}

// ── Wrap buildFengShuiView ─────────────────────────────────────────
const _buildFengShuiViewOrig_v8 = buildFengShuiView;
buildFengShuiView = function(){
  _buildFengShuiViewOrig_v8();
  fsExpandLayout();
  _fsAttachZoomHandlers();
};

// If view already built when this script loads, apply now
(function(){
  const v = document.getElementById('fengshui-view');
  if (v && v.dataset.built === '1'){
    fsExpandLayout();
    _fsAttachZoomHandlers();
  }
})();

// ═══════════════════════════════════════════════════════════════════
//  ADJACENT-HEX FILTER — extension v9 (additive)
//
//  Adds a second filter toggle in the FS toolbar, next to "Pure YY":
//  "No Adj" — when ON (default), hides pairs where the water hex is
//  in the slot immediately before or after the facing hex on the
//  compass (slot index difference == 1, with wrap-around).
//
//  Combines cleanly with the Pure YY filter: a row is hidden if
//  EITHER filter rejects it. The existing fsApplyPureYYFilter is
//  replaced with a combined version that respects both flags.
// ═══════════════════════════════════════════════════════════════════

let FS_FILTER_NO_ADJ = true; // default: hide pairs with adjacent hexes

// Check whether the slots that contain fDeg and wDeg are immediate neighbors
function fsAreHexesAdjacent(fDeg, wDeg){
  if (typeof fsSlotForDeg !== 'function' || !Array.isArray(FS_SLOTS)) return false;
  const fSlot = fsSlotForDeg(fDeg);
  const wSlot = fsSlotForDeg(wDeg);
  if (!fSlot || !wSlot) return false;
  // Use findIndex with property comparison instead of indexOf (object reference)
  const fIdx = FS_SLOTS.findIndex(s => s.hexNum === fSlot.hexNum);
  const wIdx = FS_SLOTS.findIndex(s => s.hexNum === wSlot.hexNum);
  if (fIdx < 0 || wIdx < 0) return false;
  const diff = Math.abs(fIdx - wIdx);
  return diff === 1 || diff === 63; // wrap-around for 64 slots
}

function fsToggleFilterNoAdj(){
  FS_FILTER_NO_ADJ = !FS_FILTER_NO_ADJ;
  const btn = document.getElementById('fs-filter-adj-btn');
  if (btn){
    btn.style.background = FS_FILTER_NO_ADJ ? '#8e44ad' : '#aaa';
    btn.textContent = FS_FILTER_NO_ADJ ? '✓ No Adj' : 'No Adj';
  }
  fsApplyPureYYFilter(); // calls the combined filter below
}

// Replace fsApplyPureYYFilter with a combined version that honors both flags
fsApplyPureYYFilter = function(){
  const box = document.getElementById('fs-pairs-table');
  if (!box) return;
  const rows = box.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const isPureYY = !!row.querySelector('span[title="Yin/Yang mountain match"]');
    let isAdj = false;
    if (FS_FILTER_NO_ADJ){
      const onclick = row.getAttribute('onclick') || '';
      const m = onclick.match(/fsSelectPair\(([\d.\-]+),([\d.\-]+)\)/);
      if (m){
        const fDeg = parseFloat(m[1]);
        const wDeg = parseFloat(m[2]);
        isAdj = fsAreHexesAdjacent(fDeg, wDeg);
      }
    }
    const hide = (FS_FILTER_PURE_YY && !isPureYY) || (FS_FILTER_NO_ADJ && isAdj);
    row.style.display = hide ? 'none' : '';
    row.style.backgroundColor = isPureYY ? 'rgba(192, 57, 43, 0.08)' : '';
  });
};

function fsInjectNoAdjFilterButton(){
  if (document.getElementById('fs-filter-adj-btn')) return;
  const pureYYBtn = document.getElementById('fs-filter-pyy-btn');
  if (!pureYYBtn) return;
  const html =
    '<button id="fs-filter-adj-btn" onclick="fsToggleFilterNoAdj()" ' +
    'style="background:#8e44ad;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;font-weight:bold;margin-left:4px;" ' +
    'title="Hide pairs where the water hex is immediately adjacent to the facing hex on the compass">✓ No Adj</button>';
  pureYYBtn.insertAdjacentHTML('afterend', html);
}

// Wrap buildFengShuiView to inject the new button after the view is built
const _buildFengShuiViewOrig_v9 = buildFengShuiView;
buildFengShuiView = function(){
  _buildFengShuiViewOrig_v9();
  fsInjectNoAdjFilterButton();
};

// If view already built when this script loads, inject now
(function(){
  const v = document.getElementById('fengshui-view');
  if (v && v.dataset.built === '1') fsInjectNoAdjFilterButton();
})();

// ═══════════════════════════════════════════════════════════════════
//  FS LAYOUT FIX (tablet/desktop) + MOUSE-DRAG PAN — extension v10
//
//  Two fixes:
//   1. v8 made the canvas 100vw with negative margins. On phones this
//      gives a nicely full-bleed luopan; on tablets/desktops the canvas
//      becomes too large (aspect-ratio keeps it ≈ square, so a 1500px
//      wide viewport produces a 1500×1540 canvas — bigger than the
//      window). Now: a CSS media query gives full-bleed up to 600px
//      and a capped 600px centered layout above that.
//
//   2. v8 attached only TOUCH handlers, so on desktop you couldn't
//      pan the luopan when zoomed in. Now mouse drag works too:
//      grab with the cursor and move when scale > 1.
// ═══════════════════════════════════════════════════════════════════

function fsInjectExpansionCSS(){
  if (document.getElementById('fs-layout-style-v10')) return;
  const style = document.createElement('style');
  style.id = 'fs-layout-style-v10';
  style.textContent = [
    '#fengshui-view > div { max-width: none !important; }',
    '#fs-canvas-wrap {',
    '  max-width: none !important;',
    '  background: #fff;',
    '  overflow: hidden;',
    '}',
    '@media (max-width: 600px) {',
    '  #fs-canvas-wrap {',
    '    width: 100vw !important;',
    '    margin-left: calc(50% - 50vw) !important;',
    '    margin-right: calc(50% - 50vw) !important;',
    '  }',
    '}',
    '@media (min-width: 601px) {',
    '  #fs-canvas-wrap {',
    '    width: 100% !important;',
    '    max-width: 760px !important;',
    '    margin: 0 auto !important;',
    '  }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

// Replace v8's fsExpandLayout: drop the inline approach in favor of
// media-query CSS, and clear any inline styles v8 may have left on cwrap.
fsExpandLayout = function(){
  fsInjectExpansionCSS();
  const cwrap = document.getElementById('fs-canvas-wrap');
  if (cwrap){
    cwrap.style.width        = '';
    cwrap.style.marginLeft   = '';
    cwrap.style.marginRight  = '';
    cwrap.style.maxWidth     = '';
    cwrap.style.background   = '';
    cwrap.style.overflow     = '';
  }
};

// Add mouse-drag pan for desktop (v8 only attached touch events)
function _fsAttachMouseDragHandlers(){
  const canvas = document.getElementById('fs-canvas');
  if (!canvas || canvas.dataset.mouseDragAttached === '1') return;
  canvas.dataset.mouseDragAttached = '1';
  let dragging = false, lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', function(e){
    if (_fsZoomScale > 1.01){
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  canvas.addEventListener('mousemove', function(e){
    if (dragging){
      _fsZoomTx += e.clientX - lastX;
      _fsZoomTy += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      _fsApplyTransform();
    } else {
      canvas.style.cursor = _fsZoomScale > 1.01 ? 'grab' : '';
    }
  });

  const endDrag = function(){
    dragging = false;
    canvas.style.cursor = _fsZoomScale > 1.01 ? 'grab' : '';
  };
  canvas.addEventListener('mouseup',    endDrag);
  canvas.addEventListener('mouseleave', endDrag);
}

// Wrap buildFengShuiView to attach mouse-drag handlers after build
const _buildFengShuiViewOrig_v10 = buildFengShuiView;
buildFengShuiView = function(){
  _buildFengShuiViewOrig_v10();
  _fsAttachMouseDragHandlers();
};

// Apply now if view is already built - force handler re-attach
(function(){
  const v = document.getElementById('fengshui-view');
  if (v && v.dataset.built === '1'){
    fsExpandLayout();
    const canvas = document.getElementById('fs-canvas');
    if (canvas){
      // Reset flags to force fresh attachment of ALL handlers
      canvas.dataset.zoomAttached = '0';
      canvas.dataset.mouseDragAttached = '0';
    }
    if (typeof _fsAttachZoomHandlers === 'function') _fsAttachZoomHandlers();
    _fsAttachMouseDragHandlers();
  }
})();


// ═══════════════════════════════════════════════════════════════════
//  PAIRS TABLE REDESIGN — extension v11 (replaces fsRenderPairsTable)
//
//  Calls fsComputePairs() internally (the original way). Uses each
//  pair's facingLabels and waterLabels (arrays of XKDG rule strings
//  like 'Hetu (yun)', 'Adding yun=10', 'Family: ...') for the new
//  "XKDG Relations" column.
//
//  Layout:
//   Facing | Water | XKDG Relations | Pure YY | Score
//   - Facing/Water: hexagram glyph + qi/yun + degree + Yin/Yang
//   - XKDG Relations: facing rules + water rules + element Sheng/Ke
//   - Pure YY: empty (user will populate later)
//   - Score: numeric only
// ═══════════════════════════════════════════════════════════════════

function fsHexGlyph(n){
  if (typeof n !== 'number' || n < 1 || n > 64) return '?';
  return String.fromCodePoint(0x4DC0 + n - 1);
}

function fsElementRelation(qiF, qiW){
  const qiToElem = {1:'Water',2:'Earth',3:'Wood',4:'Wood',5:'Earth',6:'Metal',7:'Metal',8:'Earth',9:'Fire'};
  const eF = qiToElem[qiF]; const eW = qiToElem[qiW];
  if (!eF || !eW) return '';
  const sheng = {'Wood':'Fire','Fire':'Earth','Earth':'Metal','Metal':'Water','Water':'Wood'};
  const ke    = {'Wood':'Earth','Earth':'Water','Water':'Fire','Fire':'Metal','Metal':'Wood'};
  if (eF === eW)           return 'He';
  if (sheng[eW] === eF)    return 'Sheng In';   // water feeds facing
  if (ke[eW] === eF)       return 'Ke In';      // water controls facing
  // Sheng Out / Ke Out: not shown
  return '';
}

// Local Hetu check (1-6, 2-7, 3-8, 4-9, 5-10)
function _fsIsHetuPair(a, b){
  const pairs = [[1,6],[2,7],[3,8],[4,9],[5,10]];
  return pairs.some(p => (p[0]===a && p[1]===b) || (p[0]===b && p[1]===a));
}

fsRenderPairsTable = function(){
  try {
    // When the user has clicked "FIND MATCHING DATES", the panel is showing the
    // facing+water → dates view (forward logic). Skip this auto-render so it
    // doesn't clobber that table with the reverse-logic one. The flag clears
    // when the user navigates away from FS and back (see setMode), restoring
    // the default reverse-logic view on next entry from MAIN.
    if (window._fsShowingMatching) return;
    const box = document.getElementById('fs-pairs-table');
    if (!box) return;
    // Default flow when entering FS from MAIN: render the date → compatible
    // facing/water pairs table (reverse logic). The legacy renderer below
    // computes all 64 yun slots vs the current date's pillars.
    const fIn = parseFloat(document.getElementById('fs-facing').value);
    const wIn = parseFloat(document.getElementById('fs-water').value);
    const pairs = (typeof fsComputePairs === 'function') ? fsComputePairs() : [];
    if (!pairs.length){
      const c = (typeof fsGetCurrentContext === 'function') ? fsGetCurrentContext() : {};
      box.innerHTML = c.dayHex
        ? '<div style="text-align:center;color:#888;padding:10px;font-size:12px;">No facing/water combinations available for this date.</div>'
        : '';
      return;
    }
    const activeFIdx = !isNaN(fIn) && typeof fsSlotForDeg === 'function' ? fsSlotForDeg(fIn).idx : -1;
    const activeWIdx = !isNaN(wIn) && typeof fsSlotForDeg === 'function' ? fsSlotForDeg(wIn).idx : -1;

    // Family / Blood Link bonuses (added at display time)
    // Day hex's families: ALWAYS used for the +3 family-match bonus, on any date
    const _ctxFs = (typeof fsGetCurrentContext === 'function') ? fsGetCurrentContext() : {};
    const dayHex = _ctxFs.dayHex;
    const dayFams = (dayHex && typeof getHexFamilies === 'function') ? (getHexFamilies(dayHex) || []) : [];
    // Full Blood Link: only true when the WHOLE date pillars share a family
    const dateFams = (typeof fsGetDateFamilies === 'function') ? fsGetDateFamilies() : [];
    const isFullBL = dateFams.length > 0;
    function _famMatch(hexNum){
      if (!dayFams.length || typeof getHexFamilies !== 'function') return false;
      const hFams = getHexFamilies(hexNum) || [];
      return hFams.some(f => dayFams.includes(f));
    }
    // Compute display score with bonuses, then re-sort pairs by display score (desc)
    pairs.forEach(p => {
      if (!p || !p.facing || !p.water) { p._displayScore = (p && p.score) || 0; return; }
      const fMatch = _famMatch(p.facing.hexNum);
      const wMatch = _famMatch(p.water.hexNum);
      let bonus = 0;
      if (fMatch) bonus += 3;
      if (wMatch) bonus += 3;
      if (isFullBL && (fMatch || wMatch)) bonus += 10;
      p._famF = fMatch;
      p._famW = wMatch;
      p._blRow = isFullBL && (fMatch || wMatch);
      p._displayScore = p.score + bonus;
    });
    pairs.sort((a,b) => (b._displayScore||0) - (a._displayScore||0));

    let html = '<div style="font-size:12px;font-weight:bold;margin:10px 0 4px;color:#1a1008;">Compatible facing / water pairs (' + pairs.length + '):</div>';
    html += '<div style="overflow-x:auto;border:1px solid #c9a84c;border-radius:6px;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
    html += '<thead>';
    // Row 1 — top headers (rowspan=2 for simple cols, colspan=3 for Pure YY)
    html += '<tr style="background:#fff8e1;">';
    html += '<th rowspan="2" style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#c0392b;width:12%;">Facing 正神</th>';
    html += '<th rowspan="2" style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#1565c0;width:12%;">Water 零神</th>';
    html += '<th rowspan="2" style="text-align:center;padding:6px 8px;border-bottom:1px solid #c9a84c;color:#8a6a1f;width:36%;">XKDG Relations</th>';
    html += '<th colspan="3" style="text-align:center;padding:4px;border-bottom:1px solid #e0c87a;color:#666;width:32%;">Pure YY</th>';
    html += '<th rowspan="2" style="text-align:center;padding:6px;border-bottom:1px solid #c9a84c;color:#8a6a1f;width:8%;">Score</th>';
    html += '</tr>';
    // Row 2 — Pure YY sub-headers (F, W, Star)
    html += '<tr style="background:#fff8e1;">';
    html += '<th style="text-align:center;padding:4px;border-bottom:1px solid #c9a84c;border-right:1px solid #e0c87a;color:#c0392b;font-size:11px;width:11%;">F</th>';
    html += '<th style="text-align:center;padding:4px;border-bottom:1px solid #c9a84c;border-right:1px solid #e0c87a;color:#1565c0;font-size:11px;width:11%;">W</th>';
    html += '<th style="text-align:center;padding:4px;border-bottom:1px solid #c9a84c;color:#8a6a1f;font-size:11px;width:10%;">Star</th>';
    html += '</tr>';
    html += '</thead><tbody>';

    pairs.forEach(p => {
      if (!p || !p.facing || !p.water) return;
      const f = p.facing, w = p.water;
      const fc = f.startDeg + 2.8125;
      const wc = w.centerDeg;
      const isActive = (f.idx === activeFIdx && w.idx === activeWIdx);
      // Yellow row when Full BL + family match (replaces the active highlight color appropriately)
      const bg = p._blRow ? '#fff8b0' : (isActive ? '#fff3a8' : '#fff');

      // Pure YY check (used as hidden marker for filter)
      const yyOk = (typeof fsYinYangMatch === 'function') ? fsYinYangMatch(fc, wc) : false;
      const yyMarker = yyOk ? '<span title="Yin/Yang mountain match" style="display:none;"></span>' : '';

      // Yin/Yang polarities
      const fY = (typeof fsMountainYang === 'function') ? fsMountainYang(fc) : null;
      const wY = (typeof fsMountainYangTien === 'function') ? fsMountainYangTien(wc) : null;
      const fPol = fY === true ? 'Yang' : (fY === false ? 'Yin' : '');
      const wPol = wY === true ? 'Yang' : (wY === false ? 'Yin' : '');

      // XKDG Relations: split into element (red, top) and period (blue, bottom) sections
      const qiHetu  = _fsIsHetuPair(f.qi, w.qi);
      const qiSum   = f.qi + w.qi;
      const qiAdd   = [5,10,15].includes(qiSum);
      const yunLbls = Array.isArray(p.waterLabels) ? p.waterLabels : [];
      const elemRels = []; // red, top row
      const yunRels = [];  // blue, bottom row
      // Element-level relations (qi)
      if (qiHetu)          elemRels.push('Hetu (qi)');
      if (qiAdd)           elemRels.push('Adding qi=' + qiSum);
      if (!qiHetu && !qiAdd) {
        const er = fsElementRelation(f.qi, w.qi);
        if (er) elemRels.push(er);
      }
      // Period-level relations (yun)
      yunLbls.forEach(l => yunRels.push(l));

      html += '<tr onclick="fsSelectPair(' + fc + ',' + wc + ')" style="background:' + bg + ';border-bottom:1px solid #eee;cursor:pointer;">';

      // Facing (vertical layout: qi-red, glyph, yun-blue, deg, pol, hexN)
      // Degree and polarity are kept on SEPARATE lines (polarity always present, nbsp when empty)
      // so the cell always has the same number of lines as the Water cell — keeps hex glyphs aligned.
      html += '<td style="padding:6px 4px;text-align:center;vertical-align:middle;">' + yyMarker;
      html += '<div style="font-size:16px;color:#c0392b;font-weight:bold;line-height:1.1;">' + f.qi + '</div>';
      html += '<div style="font-size:38px;line-height:1;margin:1px 0;font-weight:' + (p._famF ? 'bold' : 'normal') + ';">' + fsHexGlyph(f.hexNum) + '</div>';
      html += '<div style="font-size:16px;color:#1565c0;font-weight:bold;line-height:1.1;">' + f.yun + '</div>';
      html += '<div style="font-size:11px;color:#666;margin-top:3px;line-height:1.2;">' + fc.toFixed(1) + '°</div>';
      html += '<div style="font-size:11px;color:#666;font-style:italic;line-height:1.2;">' + (fPol || '\u00A0') + '</div>';
      html += '<div style="font-size:10px;color:#aaa;line-height:1.2;">Hex ' + f.hexNum + '</div>';
      html += '</td>';

      // Water (vertical layout: qi-red, glyph, yun-blue, deg, pol, hexN)
      // Same line structure as Facing cell — ensures the hex glyphs are vertically aligned across columns.
      html += '<td style="padding:6px 4px;text-align:center;vertical-align:middle;">';
      html += '<div style="font-size:16px;color:#c0392b;font-weight:bold;line-height:1.1;">' + w.qi + '</div>';
      html += '<div style="font-size:38px;line-height:1;margin:1px 0;font-weight:' + (p._famW ? 'bold' : 'normal') + ';">' + fsHexGlyph(w.hexNum) + '</div>';
      html += '<div style="font-size:16px;color:#1565c0;font-weight:bold;line-height:1.1;">' + w.yun + '</div>';
      html += '<div style="font-size:11px;color:#666;margin-top:3px;line-height:1.2;">' + wc.toFixed(1) + '°</div>';
      html += '<div style="font-size:11px;color:#666;font-style:italic;line-height:1.2;">' + (wPol || '\u00A0') + '</div>';
      html += '<div style="font-size:10px;color:#aaa;line-height:1.2;">Hex ' + w.hexNum + '</div>';
      html += '</td>';

      // XKDG Relations: red + blue lines stacked tight, centered horizontally,
      // and pulled UP with negative margin-top to visually align with the hex glyph
      // (which sits near the top of the Facing/Water cells, not at their vertical center).
      html += '<td style="padding:6px 8px;vertical-align:middle;text-align:center;">';
      html += '<div style="margin-top:-40px;">';
      html += '<div style="font-size:13px;font-weight:bold;color:#c0392b;line-height:1.3;">';
      html += elemRels.length ? elemRels.join(' · ') : '\u00A0';
      html += '</div>';
      html += '<div style="font-size:13px;font-weight:bold;color:#1565c0;line-height:1.3;">';
      html += yunRels.length ? yunRels.join(' · ') : '\u00A0';
      html += '</div>';
      html += '</div>';
      html += '</td>';

      // Pure YY — split into 3 sub-cells: F (facing trigram), W (water trigram), Star (empty for later)
      const fTri = (typeof fsMountainTrigramDi === 'function')   ? fsMountainTrigramDi(fc)   : null;
      const wTri = (typeof fsMountainTrigramTien === 'function') ? fsMountainTrigramTien(wc) : null;
      const fSym = fTri && FS_TRIGRAM_SYM[fTri] || '';
      const fZh  = fTri && FS_TRIGRAM_ZH[fTri]  || '';
      const wSym = wTri && FS_TRIGRAM_SYM[wTri] || '';
      const wZh  = wTri && FS_TRIGRAM_ZH[wTri]  || '';
      // F sub-cell — facing trigram (red)
      html += '<td style="padding:6px 4px;text-align:center;vertical-align:middle;border-right:1px solid #e0c87a;">';
      if (fTri) html += '<div style="color:#c0392b;font-weight:bold;line-height:1.2;"><div style="font-size:22px;">' + fSym + '</div><div style="font-size:13px;">' + fZh + '</div><div style="font-size:10px;color:#888;font-weight:normal;">' + fTri + '</div></div>';
      html += '</td>';
      // W sub-cell — water trigram (blue)
      html += '<td style="padding:6px 4px;text-align:center;vertical-align:middle;border-right:1px solid #e0c87a;">';
      if (wTri) html += '<div style="color:#1565c0;font-weight:bold;line-height:1.2;"><div style="font-size:22px;">' + wSym + '</div><div style="font-size:13px;">' + wZh + '</div><div style="font-size:10px;color:#888;font-weight:normal;">' + wTri + '</div></div>';
      html += '</td>';
      // Star sub-cell — Pure YY star name + auspicious/inauspicious marker
      const starInfo  = (typeof fsPureYYStarInfo === 'function') ? fsPureYYStarInfo(fTri, wTri) : { name: '', auspicious: null };
      const starColor = starInfo.auspicious === true  ? '#1b5e20'
                      : starInfo.auspicious === false ? '#c0392b'
                      : '#8a6a1f';
      const starIcon  = starInfo.auspicious === true  ? '✓ '
                      : starInfo.auspicious === false ? '✗ '
                      : '';
      html += '<td style="padding:6px 4px;text-align:center;vertical-align:middle;font-size:11px;color:' + starColor + ';font-weight:bold;">' + starIcon + starInfo.name + '</td>';

      // Score (number only) — uses display score that includes family/BL bonuses
      html += '<td style="padding:6px;text-align:center;font-weight:bold;font-size:15px;color:#8a6a1f;vertical-align:middle;">' + (p._displayScore != null ? p._displayScore : p.score) + '</td>';

      html += '</tr>';
    });

    html += '</tbody></table></div>';
    box.innerHTML = html;

    // Apply filters
    if (typeof fsApplyPureYYFilter === 'function') fsApplyPureYYFilter();
  } catch (err) {
    console.error('fsRenderPairsTable error:', err);
    const box = document.getElementById('fs-pairs-table');
    if (box) box.innerHTML = '<p style="color:#c0392b;padding:20px;">Error: ' + err.message + '</p>';
  }
};


// ═══════════════════════════════════════════════════════════════════
//  BL YELLOW HIGHLIGHT — extension v12
//
//  Restores the yellow background that distinguishes Family Blood Link
//  dates in all views. The CSS rank classes (.scan-item.rank-1, etc.)
//  apply green tier colours that override any inline yellow, so we
//  post-process the DOM after each render and force yellow on rows whose
//  content matches the Full BL pattern (e.g. "Sun-Xian Family").
//
//  Applies to: scanner view, month/list view, calendar view.
// ═══════════════════════════════════════════════════════════════════

const _BL_YELLOW = '#fffb00';
const _BL_BORDER = '#f9a825';

// Match the analyzeXkdg full-BL label format: "<family-name> Family"
// (e.g. "Sun-Xian Family", "Heng-Yi Family"). Excludes "Partial BL(...)".
const _BL_FAMILY_RE = /\b[A-Z][a-z]+-[A-Z][a-z]+\s+Family\b/;

function _hasFullBLText(el){
  if (!el) return false;
  const t = el.textContent || '';
  return _BL_FAMILY_RE.test(t);
}

function _forceYellowBg(el){
  if (!el) return;
  el.style.setProperty('background', _BL_YELLOW, 'important');
  el.style.setProperty('background-color', _BL_YELLOW, 'important');
  el.style.setProperty('border-left', '4px solid ' + _BL_BORDER, 'important');
}

function fsApplyBLHighlights(){
  try {
    // 1) Scanner view items
    document.querySelectorAll('#scan-results .scan-item').forEach(el => {
      if (_hasFullBLText(el)) _forceYellowBg(el);
    });
    // 2) List view (month-view) — rows are direct children with onclick="loadDateIntoMain(...)"
    const mv = document.getElementById('month-view');
    if (mv) {
      mv.querySelectorAll('div[onclick*="loadDateIntoMain"]').forEach(el => {
        if (_hasFullBLText(el)) _forceYellowBg(el);
      });
    }
    // 3) Calendar view cells
    document.querySelectorAll('.cal-cell').forEach(el => {
      if (_hasFullBLText(el)) _forceYellowBg(el);
    });
  } catch (err) {
    console.error('fsApplyBLHighlights error:', err);
  }
}

// Hook renderScanResults
if (typeof renderScanResults === 'function') {
  const _renderScanResultsOrig_v12 = renderScanResults;
  renderScanResults = function(results, mode){
    _renderScanResultsOrig_v12(results, mode);
    setTimeout(fsApplyBLHighlights, 0);
  };
}

// Hook buildMonthView
if (typeof buildMonthView === 'function') {
  const _buildMonthViewOrig_v12 = buildMonthView;
  buildMonthView = function(){
    _buildMonthViewOrig_v12();
    setTimeout(fsApplyBLHighlights, 0);
  };
}

// Hook buildCalView
if (typeof buildCalView === 'function') {
  const _buildCalViewOrig_v12 = buildCalView;
  buildCalView = function(){
    _buildCalViewOrig_v12();
    setTimeout(fsApplyBLHighlights, 0);
  };
}


// ─── City picker dropdown ─────────────────────────────────────────────────
// Injects a <select> next to the LONGITUDE input on the main page. The data
// comes from window.CITY_LIST defined in cities.js (loaded before app.js by
// index.html). Selecting a city sets LONGITUDE and UTC OFFSET in one click,
// then dispatches input/change events so any solar-time refresh listener
// picks up the new values.
(function setupCityPicker(){
    function inject(){
        if (!window.CITY_LIST || !Array.isArray(window.CITY_LIST)) return;
        if (document.getElementById('city-picker')) return;
        const lngInput = document.getElementById('longitude');
        if (!lngInput) return;
        const lngContainer = lngInput.parentElement;
        if (!lngContainer || !lngContainer.parentElement) return;

        var options = [];
        window.CITY_LIST.forEach(function(group){
            group.cities.forEach(function(c){
                options.push({name: c.name, lng: c.lng, utc: c.utc});
            });
        });

        var datalistHtml = options.map(function(c){
            return '<option value="' + c.name + '" data-lng="' + c.lng + '" data-utc="' + c.utc + '">';
        }).join('');

        var wrap = document.createElement('div');
        wrap.id = 'city-picker-wrap';
        wrap.style.cssText = 'display:flex;align-items:center;gap:4px;';
        wrap.innerHTML =
            '<label for="city-picker" style="font-size:12px;color:#666;">📍</label>' +
            '<input id="city-picker" list="city-list" placeholder="City..." ' +
            'style="font-size:16px;padding:6px 8px;border:1px solid #bbb;border-radius:4px;background:#fff;width:150px;" ' +
            'autocomplete="off">' +
            '<datalist id="city-list">' + datalistHtml + '</datalist>';

        // Place in geo-row-top, before the SAVE button (new layout v428+)
        const geoTop = document.getElementById('geo-row-top');
        const saveBtn = document.getElementById('btn-save-loc');
        if (geoTop && saveBtn) {
            geoTop.insertBefore(wrap, saveBtn);
        } else if (geoTop) {
            geoTop.appendChild(wrap);
        } else {
            // Fallback for older HTML without geo-row-top
            lngContainer.parentElement.insertBefore(wrap, lngContainer.nextSibling);
        }

        var cityData = {};
        options.forEach(function(c){ cityData[c.name] = c; });

        document.getElementById('city-picker').addEventListener('change', function(e){
            var picked = cityData[e.target.value];
            if (!picked) return;
            lngInput.value = picked.lng.toFixed(2);
            lngInput.dispatchEvent(new Event('input',  { bubbles: true }));
            lngInput.dispatchEvent(new Event('change', { bubbles: true }));
            var utcInput = document.getElementById('utc-offset');
            if (utcInput) {
                utcInput.value = picked.utc;
                utcInput.dispatchEvent(new Event('input',  { bubbles: true }));
                utcInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            e.target.value = '';
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();

window.onload = () => {
    try { renderArchive('A'); } catch(e) { console.error('archiveA:', e.message); }
    try { renderArchive('B'); } catch(e) { console.error('archiveB:', e.message); }
    checkLicense();
};

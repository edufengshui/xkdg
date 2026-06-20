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

      <!-- ═══ HOUSE PROFILES (🏠) — DOMINANT, AT TOP ═══ -->
      <div id="fs-house-profiles" style="background:#e8f5e9;border:2px solid #4caf50;border-radius:8px;padding:10px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;">
          <span style="font-size:14px;font-weight:bold;color:#2e7d32;">🏠 HOUSE PROFILES</span>
          <button onclick="fsAddNewHouse()" style="background:#2e7d32;color:#fff;border:none;border-radius:5px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">+ Add a new house</button>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
          <button onclick="fsExportBackup()" title="Download a .json backup of all houses, persons and settings" style="background:#fff;color:#2e7d32;border:1px solid #2e7d32;border-radius:5px;padding:5px 10px;font-size:11px;font-weight:bold;cursor:pointer;">⬇ Backup</button>
          <button onclick="document.getElementById('fs-restore-input').click()" title="Restore everything from a .json backup file" style="background:#fff;color:#2e7d32;border:1px solid #2e7d32;border-radius:5px;padding:5px 10px;font-size:11px;font-weight:bold;cursor:pointer;">⬆ Restore</button>
          <input type="file" id="fs-restore-input" accept="application/json,.json" style="display:none;" onchange="fsImportBackup(this)">
        </div>
        <div id="fs-house-person-label" style="font-size:11px;color:#666;margin-bottom:6px;"></div>
        <div style="font-size:11px;color:#888;font-style:italic;margin-bottom:8px;">Pick a house to edit its chart and settings. New house → press “+ Add a new house”, then fill the Flying Stars data and read the luopan below.</div>
        <!-- ACTIVE HOUSE DETAIL (cards + placements + Add buttons) — now lives INSIDE House Profiles, at the very top -->
        <div id="fs-house-detail" style="font-size:12px;"></div>
      </div>

      <!-- ═══ FLYING STARS (玄空飛星) — FIRST ═══ -->
      <div id="fs-flying-stars-block" style="background:#fff8e1;border:1px solid #c9a84c;border-radius:6px;padding:8px;margin-bottom:10px;">
        <div style="font-size:11px;color:#8a6a1f;font-weight:bold;margin-bottom:6px;">⭐ FLYING STARS (玄空飛星)</div>
        <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;">
          <div style="flex:0 0 140px;min-width:120px;">
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
          <button id="fs-stars-toggle" onclick="fsToggleStars()" style="background:#aaa;color:#fff;border:none;border-radius:4px;padding:8px 12px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">⭐ Show Stars</button>
          <button id="fs-manual-toggle" onclick="fsOpenManualStars()" title="Compile the flying stars chart by hand" style="background:#fff;color:#8a6a1f;border:1px solid #8a6a1f;border-radius:4px;padding:8px 12px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">⭐ Manual</button>
          <button onclick="(typeof FSChartFinder!=='undefined') ? FSChartFinder.open() : alert('fs-chart-finder.js not loaded')" title="Find charts by star position" style="background:#fff;color:#1565c0;border:1px solid #1565c0;border-radius:4px;padding:8px 10px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">🔍 Charts</button>
          <button onclick="(typeof QFS!=='undefined') ? QFS.open() : alert('flying-stars-qimen.js not loaded')" title="Find Qimen hours for flying stars" style="background:#fff;color:#8a6a1f;border:1px solid #8a6a1f;border-radius:4px;padding:8px 10px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">🌀 Qimen</button>
          <button id="fs-save-house-top" onclick="fsSaveHouse()" title="Save this house profile" style="margin-left:auto;background:#558b2f;color:#fff;border:none;border-radius:4px;padding:8px 12px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">💾 SAVE</button>
        </div>
        <div id="fs-stars-center" style="margin-top:6px;font-size:13px;color:#666;text-align:center;min-height:18px;"></div>
        <div id="fs-manual-badge" style="display:none;margin-top:6px;text-align:center;"></div>
        <div id="fs-manual-editor" style="display:none;margin-top:8px;"></div>
      </div>

      <!-- ═══ XKDG DOOR (🚪) — SECOND ═══ -->
      <div style="background:#fdf6e3;border:1px solid #c9a84c;border-radius:6px;padding:8px;margin-bottom:10px;">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;font-size:12px;">
          <span style="font-size:11px;color:#c9a84c;font-weight:bold;">② 🚪 Internal Door Facing</span>
          <span style="color:#666;font-size:11px;">PERIOD:</span>
          <button id="fs-period-btn" onclick="fsTogglePeriod()" style="background:#8a6a1f;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:bold;">NOW → 2044</button>
          <span id="fs-period-lbl" style="font-style:italic;color:#8a6a1f;font-size:11px;">Zheng Shen = 6-9</span>
        </div>
        <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;">
            <label style="font-size:11px;color:#666;display:block;">Door Facing (°) · 正神 ZS</label>
            <input type="number" id="fs-facing" min="0" max="360" step="0.1" placeholder="e.g. 180"
                   style="width:100%;padding:6px;border:1px solid #c9a84c;border-radius:4px;font-size:14px;"
                   oninput="fsRedraw()" onchange="fsCheckFacingZS()">
          </div>
          <div style="flex:1;min-width:120px;">
            <label style="font-size:11px;color:#666;display:block;">Water (°) · 零神 LS</label>
            <div style="display:flex;gap:4px;">
              <input type="number" id="fs-water" min="0" max="360" step="0.1" placeholder="optional"
                     style="flex:1;padding:6px;border:1px solid #4a9ead;border-radius:4px;font-size:14px;"
                     oninput="fsRedraw()" onchange="fsCheckWaterLS()">
              <button onclick="fsSuggestWater()" title="Suggest closest favorable Water position" style="background:#4a9ead;color:#fff;border:none;border-radius:4px;padding:0 10px;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;">💡 Suggest</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ LUOPAN MODE TOGGLE ═══ -->
      <div style="display:flex;gap:6px;justify-content:center;margin-bottom:10px;">
        <button id="fs-mode-fs" onclick="fsSetLuopanMode('fs')" style="background:#8a6a1f;color:#fff;border:none;border-radius:4px;padding:6px 14px;font-size:11px;font-weight:bold;cursor:pointer;">⭐ FS only</button>
        <button id="fs-mode-xkdg" onclick="fsSetLuopanMode('xkdg')" style="background:#aaa;color:#fff;border:none;border-radius:4px;padding:6px 14px;font-size:11px;font-weight:bold;cursor:pointer;">🚪 XKDG only</button>
        <button id="fs-mode-both" onclick="fsSetLuopanMode('both')" style="background:#aaa;color:#fff;border:none;border-radius:4px;padding:6px 14px;font-size:11px;font-weight:bold;cursor:pointer;">⭐🚪 Both</button>
      </div>

      <div id="fs-canvas-wrap" style="position:relative;width:100%;aspect-ratio:1100/1130;max-width:760px;margin:0 auto 10px;">
        <canvas id="fs-canvas" width="1100" height="1130" style="width:100%;height:100%;"></canvas>
      </div>

      <!-- (Active house detail moved UP into the green HOUSE PROFILES box.) -->
      <!-- (Generic water-feature scan moved DOWN into the ⚡ OPERATIVE area.) -->

      <div id="fs-legend" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px;font-size:11px;"></div>

      <!-- Date-selection controls (DIRECTION / Purpose / SCAN) intentionally removed:
           the Feng Shui setup must not mix the date-selection wing. Dates appear only
           as answers to a query (e.g. the Bed / Desk SCAN buttons). -->

      <!-- Qimen-hours & Find-charts buttons relocated next to ⭐ Manual in the
           Flying Stars block (main sector). -->

      <!-- ═══ 🚪 XKDG buttons ═══ -->
      <div style="font-size:11px;font-weight:bold;color:#c9a84c;margin-bottom:4px;">🚪 XKDG</div>

      <div id="fs-xkdg-detail" style="font-size:12px;margin-bottom:8px;"></div>

      <div style="display:flex;gap:8px;margin-bottom:10px;justify-content:center;flex-wrap:wrap;">
        <button onclick="fsFindDates()" style="background:#1565c0;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-weight:bold;font-size:12px;cursor:pointer;">🔎 Find matching dates</button>
        <button class="fs-recall-fs-btn" onclick="fsRecallFlyingStars()" style="background:#fff;color:#8a6a1f;border:1px solid #8a6a1f;border-radius:6px;padding:6px 14px;font-weight:bold;font-size:12px;cursor:pointer;">⭐ Recall Flying Stars</button>
      </div>

      <div id="fs-results-area"></div>

      <!-- ═══ ⚡ OPERATIVE — ACTIVATION (dynamic) — AT THE BOTTOM ═══ -->
      <div id="fs-operative" style="background:#ede7f6;border:2px solid #5e35b1;border-radius:8px;padding:10px;margin-top:18px;">
        <div style="font-size:14px;font-weight:bold;color:#4527a0;margin-bottom:4px;">⚡ OPERATIVE — Activation</div>
        <div style="font-size:11px;color:#666;font-style:italic;margin-bottom:10px;">Setup lives above in House Profiles. Here you decide <strong>when</strong> (dates / hours) and <strong>how</strong> (Qimen) to activate a placed element. Dates appear only as answers.</div>

        <!-- Current context (date / person analysis) — moved here from the top -->
        <div id="fs-context" style="background:#fff8e1;border:1px solid #c9a84c;border-radius:8px;padding:10px;margin:0 0 10px;font-size:13px;line-height:1.5;"></div>

        <!-- 💧 Add a generic water feature → scan good dates/hours to activate it (XKDG + Qimen) -->
        <div id="fs-wateract-block" style="background:#e0f2f1;border:1px solid #00897b;border-radius:8px;padding:10px;margin:0 0 10px;">
          <div style="font-size:12px;font-weight:bold;color:#00695c;margin-bottom:8px;">① 💧 General water feature (aquarium / fountain) — by palace</div>
          <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;">
            <div style="flex:1;min-width:150px;">
              <label style="font-size:11px;color:#666;display:block;">Palace</label>
              <select id="fs-wateract-dir" style="width:100%;padding:6px;border:1px solid #00897b;border-radius:4px;font-size:14px;">
                <option value="">— select —</option>
                <option value="N">N 坎</option><option value="NE">NE 艮</option><option value="E">E 震</option><option value="SE">SE 巽</option>
                <option value="S">S 離</option><option value="SW">SW 坤</option><option value="W">W 兌</option><option value="NW">NW 乾</option>
              </select>
            </div>
            <div style="flex:0 0 80px;">
              <label style="font-size:11px;color:#666;display:block;">Days</label>
              <input type="number" id="fs-wateract-days" min="1" max="120" value="7" style="width:100%;padding:6px;border:1px solid #00897b;border-radius:4px;font-size:14px;">
            </div>
            <button onclick="fsWaterActivationScan()" style="background:linear-gradient(135deg,#00897b,#26a69a);color:#fff;font-weight:bold;font-size:14px;padding:10px 16px;border:none;border-radius:8px;cursor:pointer;white-space:nowrap;">🔎 SCAN dates</button>
            <button onclick="fsGenWaterSaveToHouse()" title="Save this water feature into the active house" style="background:#fff;color:#00695c;border:1px solid #00695c;font-weight:bold;font-size:12px;padding:9px 14px;border-radius:8px;cursor:pointer;white-space:nowrap;">💾 Save to house</button>
          </div>
          <div id="fs-wateract-results" style="margin-top:10px;"></div>
        </div>

        <!-- 🎯 Guided activation: house → task → SCAN (replaces Placed elements + QFS boxes) -->
        <div id="fs-op-activate" style="background:#ede7f6;border:1px solid #5e35b1;border-radius:8px;padding:10px;margin:0 0 10px;"></div>

        <!-- 🔧 Fine-tune (advanced) — at the very end -->
        <div id="fs-op-finetune" style="border-top:1px dashed #b39ddb;padding-top:8px;margin-top:4px;">
          <button onclick="fsQimenStimulate(null)" style="background:#fff;color:#7e57c2;border:1px solid #b39ddb;border-radius:4px;padding:3px 10px;font-size:10px;font-weight:bold;cursor:pointer;" title="Free choice of target star on the general chart — advanced use">🔧 Fine-tune target (advanced)</button>
          <span style="font-size:10px;color:#999;font-style:italic;margin-left:6px;">Free choice of star on the general chart — for advanced students.</span>
        </div>
      </div>
    </div>`;

  // Inject legend
  const lg = document.getElementById('fs-legend');
  lg.innerHTML = `
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(180,40,40,0.25);border:1px solid #c9a84c;vertical-align:middle;"></span> 正神</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(40,80,180,0.25);border:1px solid #c9a84c;vertical-align:middle;"></span> 零神</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:rgba(0,220,80,0.6);vertical-align:middle;"></span> ✓ Door Facing for date</span>
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
let FS_STARS_ON = true;
// Luopan display mode: 'fs' = Flying Stars only, 'xkdg' = XKDG Door only, 'both' = combined
var _fsLuopanMode = 'fs';
function fsSetLuopanMode(mode){
  _fsLuopanMode = mode;
  ['fs','xkdg','both'].forEach(function(m){
    var btn = document.getElementById('fs-mode-' + m);
    if (btn){
      btn.style.background = (m === mode) ? (m === 'fs' ? '#8a6a1f' : m === 'xkdg' ? '#c9a84c' : '#00695c') : '#aaa';
    }
  });
  fsRedraw();
}
window._fsStarsVisible = false;
function _fsSyncStarsToggleLabel(visible){
  window._fsStarsVisible = !!visible;
  const btn = document.getElementById('fs-stars-toggle');
  if (!btn) return;
  btn.textContent = visible ? '⭐ Hide Stars' : '⭐ Show Stars';
  btn.style.background = visible ? '#8a6a1f' : '#aaa';
}
function fsToggleStars(){
  // A button must always show the available ACTION, not the state.
  // If stars are currently visible, the action is Hide; otherwise Show.
  if (window._fsStarsVisible) FS_STARS_ON = false;
  else FS_STARS_ON = true;
  fsRedraw(); // fsDrawFlyingStars() refreshes the label via _fsSyncStarsToggleLabel
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
  fsRenderHouseProfiles();
  if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
  if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
  if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
  // Auto-load active house for current person (covers app startup / view switch)
  var person = fsGetActivePersonForHouse();
  if (person) fsAutoLoadHouse(person.name);
  else fsRedraw();
  // No house profile? Restore the last hand-composed (global) manual chart.
  try {
    if (!_fsActiveHouseFloorCtx() && !window._fsManualChart){
      _fsRestoreManualChartForHouse(null);
      if (typeof fsRedraw === 'function') fsRedraw();
    }
  } catch(e){}
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
  html += '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #c9a84c;color:#c0392b;">Door Facing 正神</th>';
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
  // Bed/Desk sections draw their OWN luopan (their data, not the Water flow).
  if (window._fsActiveZone === 'bed' || window._fsActiveZone === 'desk'){
    if (typeof fsDrawSectionLuopan === 'function') fsDrawSectionLuopan();
    if (typeof _fsUpdateLuopanVis === 'function') _fsUpdateLuopanVis();
    return;
  }
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

  // House Facing for FS arrow
  const hfDeg = parseFloat((document.getElementById('fs-house-facing') || {}).value);
  const hfd = isNaN(hfDeg) ? null : hfDeg;

  const showXKDG = (_fsLuopanMode === 'xkdg' || _fsLuopanMode === 'both');
  const showFS   = (_fsLuopanMode === 'fs'   || _fsLuopanMode === 'both') || (!!window._fsActiveZone && !!window._fsFSRecalled);

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

  // Pass 1: Zheng/Ling tint (only in XKDG or Both mode)
  if (showXKDG) {
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
  } // end if (showXKDG)

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
  function drawArrow(deg, color, label, dashed){
    const a = (deg - 270) * Math.PI/180;
    let tipR, labelR;
    if (FS_STARS_ON){
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
    if (dashed) ctx.setLineDash([14, 8]);
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tipX,tipY);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.setLineDash([]);
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
  // Arrows — mode-aware
  if (showFS && hfd !== null)  drawArrow(hfd, '#8B0000', 'House');
  if (showXKDG && fd !== null) drawArrow(fd,  _fsLuopanMode === 'both' ? '#cc6600' : '#cc0000', 'Door');
  if (showXKDG && wd !== null) drawArrow(wd,  '#0a8c2c', 'Water', true);

  // Center pin
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,7,0,Math.PI*2); ctx.fillStyle='#1a1008'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,3.5,0,Math.PI*2); ctx.fillStyle='#ffd24a'; ctx.fill();
  ctx.restore();

  // ═══ FLYING STARS (玄空飛星) overlay ═══
  fsDrawFlyingStars(ctx, cx, cy, outerR);

  // Render detail panel
  fsRenderDetail(fInput, wInput, facingSlot, waters, facings, dctx);
  // Live XKDG detail panel — always visible when facing/water entered
  fsRenderXkdgDetail(fInput, wInput, facingSlot);
  fsRenderPairsTable();
  if (typeof _fsUpdateLuopanVis === 'function') _fsUpdateLuopanVis();
}

// Draws Flying Stars on the Luopan if toggle is ON and inputs are valid.
// Also updates the text under the canvas with the center stars.
function fsDrawFlyingStars(ctx, cx, cy, outerR){
  const centerBox = document.getElementById('fs-stars-center');
  if (!FS_STARS_ON){
    if (centerBox) centerBox.innerHTML = '';
    _fsSyncStarsToggleLabel(false);
    return;
  }
  // Manual override takes precedence over the auto calculation
  if (window._fsManualChart && typeof FlyingStars !== 'undefined'){
    try {
      FlyingStars.drawOnLuopan(ctx, window._fsManualChart, cx, cy, outerR);
      if (centerBox) centerBox.innerHTML =
        '<span style="color:#8a6a1f;font-weight:bold;">⭐ Manual</span> &nbsp;|&nbsp; Center: ' +
        FlyingStars.getCenterStarsHTML(window._fsManualChart);
      _fsSyncStarsToggleLabel(true);
    } catch(e){
      if (centerBox) centerBox.innerHTML = '<span style="color:#c00;">⚠ ' + e.message + '</span>';
      _fsSyncStarsToggleLabel(false);
    }
    return;
  }
  const hfInput = document.getElementById('fs-house-facing');
  const pInput  = document.getElementById('fs-period');
  if (!hfInput || !pInput){ _fsSyncStarsToggleLabel(false); return; }
  const hfDeg = parseFloat(hfInput.value);
  const period = parseInt(pInput.value, 10);
  if (isNaN(hfDeg) || isNaN(period) || period < 1 || period > 9){
    if (centerBox) centerBox.innerHTML =
      '<span style="color:#aaa;">Enter House Facing (°) and Period (1-9) to display Flying Stars</span>';
    _fsSyncStarsToggleLabel(false);
    return;
  }
  if (typeof FlyingStars === 'undefined'){
    if (centerBox) centerBox.innerHTML =
      '<span style="color:#c00;">⚠ flying-stars.js not loaded</span>';
    _fsSyncStarsToggleLabel(false);
    return;
  }

  const mountainChar = fsMountainCharFromDeg(hfDeg);
  let chart;
  try {
    chart = FlyingStars.calculate(period, mountainChar);
  } catch (err){
    if (centerBox) centerBox.innerHTML =
      '<span style="color:#c00;">⚠ ' + err.message + '</span>';
    _fsSyncStarsToggleLabel(false);
    return;
  }

  FlyingStars.drawOnLuopan(ctx, chart, cx, cy, outerR);

  // Update center stars line below the canvas
  if (centerBox){
    centerBox.innerHTML =
      '<span style="color:#8a6a1f;font-weight:bold;">第' + period + '運 · ' +
      chart.facingMountain + '山' + chart.sittingMountain + '向</span>' +
      ' &nbsp;|&nbsp; Center: ' + FlyingStars.getCenterStarsHTML(chart);
  }
  _fsSyncStarsToggleLabel(true);
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
    html += `<strong>Door Facing:</strong> hex ${fInput.hexNum}, qi ${fInput.qi}, yun ${fInput.yun} `;
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

// ── Live XKDG detail — shows hex/qi/yun/ZS/LS/PureYY for entered facing+water ──
function fsRenderXkdgDetail(fInput, wInput, facingSlot){
  var box = document.getElementById('fs-xkdg-detail');
  if (!box) return;
  if (!fInput && !wInput){ box.innerHTML = ''; return; }

  var html = '';

  // Door Facing info
  if (fInput){
    var isZS = fsIsZhengShen(fInput.yun);
    var zsHtml = isZS
      ? '<span style="color:#2e7d32;font-weight:bold;">[正神 Zheng Shen ✓]</span>'
      : '<span style="color:#c0392b;font-weight:bold;">[NOT Zheng Shen ✗]</span>';
    html += '<div style="background:#fff8e1;border:1px solid #c9a84c;padding:6px 8px;border-radius:4px;margin-bottom:4px;">';
    html += '<strong>🚪 Door Facing:</strong> Hex ' + fInput.hexNum + ', qi ' + fInput.qi + ', yun ' + fInput.yun + ' ' + zsHtml;
    html += '</div>';
  }

  // Water info
  if (wInput){
    var isLS = fsIsLingShen(wInput.yun);
    var lsHtml = isLS
      ? '<span style="color:#1565c0;font-weight:bold;">[零神 Ling Shen ✓]</span>'
      : '<span style="color:#c0392b;font-weight:bold;">[NOT Ling Shen ✗]</span>';
    html += '<div style="background:#e3f2fd;border:1px solid #4a9ead;padding:6px 8px;border-radius:4px;margin-bottom:4px;">';
    html += '<strong>🌊 Water:</strong> Hex ' + wInput.hexNum + ', qi ' + wInput.qi + ', yun ' + wInput.yun + ' ' + lsHtml;

    // Distance + connection labels vs facing
    if (facingSlot){
      var dist = fsAngularDist(facingSlot.startDeg + 2.8125, wInput.centerDeg);
      var distOk = dist <= FS_WATER_MAX_DEG;
      html += '<br>Distance: ' + dist.toFixed(1) + '° ';
      html += distOk
        ? '<span style="color:#2e7d32;">[±' + FS_WATER_MAX_DEG + '° ✓]</span>'
        : '<span style="color:#c0392b;">[exceeds ±' + FS_WATER_MAX_DEG + '° ✗]</span>';
      var lbls = hexConnectionLabels(wInput.hexNum, wInput.qi, wInput.yun, facingSlot.hexNum, facingSlot.qi, facingSlot.yun);
      html += '<br>vs Door: ' + (lbls.length ? '<strong>' + lbls.join(' · ') + '</strong>' : '<span style="color:#888;">no connection</span>');
    }
    html += '</div>';
  }

  // Pure Yin/Yang analysis (needs both facing and water)
  if (fInput && wInput){
    var fDeg = fInput.startDeg + 2.8125;
    var fTri = (typeof fsMountainTrigramDi === 'function') ? fsMountainTrigramDi(fDeg) : null;
    var wTri = (typeof fsMountainTrigramTien === 'function') ? fsMountainTrigramTien(wInput.centerDeg) : null;
    if (fTri && wTri){
      var starInfo = fsPureYYStarInfo(fTri, wTri);
      var yyMatch = (typeof fsYinYangMatch === 'function') ? fsYinYangMatch(fDeg, wInput.centerDeg) : false;
      var starColor = starInfo.auspicious ? '#2e7d32' : '#c0392b';
      var starIcon  = starInfo.auspicious ? '✓' : '✗';
      html += '<div style="background:#f3e5f5;border:1px solid #9c27b0;padding:6px 8px;border-radius:4px;">';
      html += '<strong>☯ Pure YY:</strong> <span style="color:' + starColor + ';font-weight:bold;">' + starInfo.name + ' ' + starIcon + '</span>';
      html += ' &nbsp;|&nbsp; Yin/Yang match: ' + (yyMatch ? '<span style="color:#2e7d32;font-weight:bold;">✓</span>' : '<span style="color:#c0392b;">✗</span>');
      html += '</div>';
    }
  }

  box.innerHTML = html;
}
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
    let dGan, dZhi, yGan, yZhi, mGan, mZhi, hGanNoon, hZhiNoon;
    const _Pn = (function(){ try {
        if (typeof XKDGSolarTime === 'undefined') return null;
        const lt = XKDGSolarTime.currentLonTz(); if (!isFinite(lt.lonDeg)) return null;
        return XKDGSolarTime.pillarsFromCivil(dayDate.getFullYear(), dayDate.getMonth()+1, dayDate.getDate(), 12, 0, 0, lt.lonDeg, lt.tzOffsetMin);
    } catch(e){ return null; } })();
    if (_Pn) {
        dGan=_Pn.day.charAt(0); dZhi=_Pn.day.charAt(1);
        yGan=_Pn.year.charAt(0); yZhi=_Pn.year.charAt(1);
        mGan=_Pn.month.charAt(0); mZhi=_Pn.month.charAt(1);
        hGanNoon=_Pn.hour.charAt(0); hZhiNoon=_Pn.hour.charAt(1);
    } else {
        const ec = Solar.fromDate(new Date(midDay.getTime() + offsetMin * 60000)).getLunar().getEightChar();
        dGan = ec.getDayGan(); dZhi = ec.getDayZhi();
        yGan = ec.getYearGan(); yZhi = ec.getYearZhi();
        mGan = ec.getMonthGan(); mZhi = ec.getMonthZhi();
        hGanNoon = ec.getTimeGan(); hZhiNoon = ec.getTimeZhi();
    }
    const dData = getXkdgData(dGan, dZhi);
    if (!dData) continue;
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
      const ecH = Solar.fromDate(new Date(bd.getTime() + (offsetMin + ((typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.equationOfTimeMinutes(midDay) : 0)) * 60000)).getLunar().getEightChar();
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
    // Hour cell: bestHour pillar + REAL clock window (true solar time, DST-adjusted — as in BEST/LIST)
    const _BR_SOLAR = {'子':23,'丑':1,'寅':3,'卯':5,'辰':7,'巳':9,'午':11,'未':13,'申':15,'酉':17,'戌':19,'亥':21};
    const hLabel = m.bestHour ? (m.bestHour.hGan + '<br>' + m.bestHour.hZhi) : (m.dGan + '<br>' + m.dZhi);
    let hTimeTxt = '';
    if (m.bestHour && _BR_SOLAR[m.bestHour.hZhi] != null) {
      try {
        const _lon = parseFloat(document.getElementById('longitude').value);
        const _utc = parseFloat(document.getElementById('utc-offset').value);
        if (!isNaN(_lon) && !isNaN(_utc)) {
          const _off = (_lon - _utc * 15) * 4 - (_dstOn ? 60 : 0);          // solar = clock + off
          let _s = (((_BR_SOLAR[m.bestHour.hZhi] * 60 - _off) % 1440) + 1440) % 1440;
          let _e = (_s + 120) % 1440;
          const _f = v => { v = Math.round(((v % 1440) + 1440) % 1440); const H = Math.floor(v / 60), M = v % 60; return (H < 10 ? '0' : '') + H + ':' + (M < 10 ? '0' : '') + M; };
          hTimeTxt = _f(_s) + '\u2013' + _f(_e);
        }
      } catch (e) {}
      if (!hTimeTxt) {
        const _civ = {'子':'23-01','丑':'01-03','寅':'03-05','卯':'05-07','辰':'07-09','巳':'09-11','午':'11-13','未':'13-15','申':'15-17','酉':'17-19','戌':'19-21','亥':'21-23'};
        hTimeTxt = _civ[m.bestHour.hZhi] || '';
      }
    }
    const hTime = hTimeTxt ? '<div style="font-size:9px;color:#666;margin-top:1px;">' + hTimeTxt + '</div>' : '';
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
  // ═══ NINE DUN (九遁 Escapes) ═══
  'Heaven Dun 天遁':
    'Configuration: The Marvel Bing (丙) on the Heavenly Plate meets the Sheng Gate (生 Life) and the Spirit Zhi Fu (值符 Commander) or the Earth element.\n\nMeaning: The highest energy of visibility and heavenly protection. Excellent for launching new businesses, making proposals, expanding, or seeking support from mentors and authority figures.',

  'Earth Dun 地遁':
    'Configuration: The Marvel Yi (乙) on the Heavenly Plate meets the Kai Gate (开 Open) and the Spirit Jiu Di (九地 Nine Earths).\n\nMeaning: Offers stability, protection, and grounding. Ideal for accumulating wealth, purchasing real estate, signing long-term contracts, or hiding/keeping a low profile.',

  'Human Dun 人遁':
    'Configuration: The Marvel Ding (丁) on the Heavenly Plate meets the Xiu Gate (休 Rest) and the Spirit Tai Yin (太阴 Great Shadow).\n\nMeaning: Governs human relationships and harmony. Perfect for negotiating, finding allies, resolving conflicts, taking exams, or meeting business and romantic partners.',

  'Deity Dun 神遁':
    'Configuration: The Marvel Bing (丙) meets the Sheng Gate (生 Life) and the Spirit Jiu Tian (九天 Nine Heavens).\n\nMeaning: Connects to higher forces. The best structure for spiritual development, meditation, visualization and manifestation, or for actions requiring strong inspiration and intuition.',

  'Ghost Dun 鬼遁':
    'Configuration: The Stem Ding (丁) meets the Du Gate (杜 Delusion/Closed) and the Spirit Jiu Di (九地 Nine Earths) (or variants with the Death Gate Si Mian).\n\nMeaning: Linked to total concealment and indirect strategies. Excellent for industrial espionage, secret market research, catching adversaries by surprise, or acting behind the scenes unnoticed.',

  'Wind Dun 風遁':
    'Configuration: The Stem Yi (乙) meets a specific combination of Gates (often Kai or Jing of Fire) in the Wind Palace (Xun 4).\n\nMeaning: Harnesses speed and information diffusion. Useful for viral marketing campaigns, impactful public speaking, or making your ideas spread rapidly.',

  'Cloud Dun 云遁':
    'Configuration: The Stem Yi (乙) meets the Kai Gate (Open) and the Spirit Liu He (六合 Six Harmonies) or configurations with the Water element.\n\nMeaning: Represents fluidity and adaptability. Excellent for blending into ambiguous situations, waiting for the right moment, and accumulating resources before a decisive move.',

  'Dragon Dun 龍遁':
    'Configuration: The Marvel Yi (乙) or Gui (癸) combined with the Xiu Gate (Rest) or Sheng Gate (Life) in Palace Kan 1 (Water) or Zhen 3 (Wood/Dragon).\n\nMeaning: Represents the power of the dragon rising from the waters. Excellent for gaining leadership, winning legal contests, dominating a market, or launching technological or maritime projects.',

  'Tiger Dun 虎遁':
    'Configuration: The Stem Xin (辛) or Geng (庚) with the Sheng Gate (Life) or Shang Gate (Injury) in Palace Gen 8 or Dui 7 (Metal/Tiger).\n\nMeaning: Martial, aggressive, and defensive energy. Excellent for overcoming difficult obstacles, winning disputes, intimidating competitors, or protecting your business/personal boundaries with determination.',

  // ═══ THREE PRETENSES (三诈) ═══
  'Real Pretenses 真詐':
    'TRUE PRETENSE (Zhen Zha 真诈)\nConfiguration: A Lucky Door (Sheng, Kai, or Xiu) + One of the Three Marvels (Yi, Bing, or Ding) + the Spirit Tai Yin (太阴 Grand Shade).\n\nTai Yin provides deep shade, secrecy, and hidden assistance. The ultimate "stealth" structure.\n\nBest for: Designing secret strategies, planning behind closed doors, corporate planning, or actions where you do not want competitors to see you coming. Allows flawless execution because the opposition remains completely in the dark.\n\n⚠️ WARNING: Use ONLY for the intended purpose described above, or it can even be harmful.',

  'Rest Pretenses 休詐':
    'EARTH PRETENSE (Di Zha 地诈)\nConfiguration: A Lucky Door (Sheng, Kai, or Xiu) + One of the Three Marvels (Yi, Bing, or Ding) + the Spirit Jiu Di (九地 Nine Earths).\n\nJiu Di represents Earth, stability, hiding, and low-profile growth.\n\nBest for: Concealing assets, burying a situation, defensive strategies, or setting up traps/ambushes (metaphorically in business or negotiations). Highly effective for quietly acquiring real estate, signing long-term confidentiality agreements, or waiting out a storm in complete safety.\n\n⚠️ WARNING: Use ONLY for the intended purpose described above, or it can even be harmful.',

  'Multiple Pretenses 重詐':
    'DIVINE PRETENSE (Shen Zha 神诈)\nConfiguration: A Lucky Door (Sheng, Kai, or Xiu) + One of the Three Marvels (Yi, Bing, or Ding) + the Spirit Liu He (六合 Six Harmonies).\n\nLiu He represents partnerships, public relations, and universal connection. In a Pretense structure, it means using optics, alignment, and social leverage to your advantage.\n\nBest for: Psychological warfare, blending in with a crowd, using a "front" or proxy to achieve a goal, negotiation, and making peace offerings that secretly benefit your position. Excellent for "pretending" to align with someone while quietly maintaining your own agenda.\n\n⚠️ WARNING: Use ONLY for the intended purpose described above, or it can even be harmful.',

  // ═══ FIVE BORROWS (五假) ═══
  'Heaven Borrows 天假':
    'HEAVEN BORROW (Tian Jia 天假)\nConfiguration: The Marvel Ding (丁) + the Jing Gate (景 Scenery) + the Spirit Jiu Tian (九天 Nine Heavens).\n\nYou are borrowing the majestic, high-profile power of the Heavens to project absolute authority.\n\nBest for: Submitting proposals to high-level executives, publishing manifestos, public speaking, issuing corporate decrees, or making demands. Even if you lack real power, you will appear immensely authoritative, and others will comply out of respect or awe.\n\n⚠️ WARNING: Use ONLY for the intended purpose described above, or it can even be harmful.',

  'Earth Borrows 地假':
    'EARTH BORROW (Di Jia 地假)\nConfiguration: The Marvel Gui (癸) + the Du Gate (杜 Hidden) + the Spirit Jiu Di (九地 Nine Earths).\n\nYou are borrowing the secretive, sheltering power of the Earth to disappear or build up resources.\n\nBest for: Finding a safe haven during a crisis, quietly moving assets, corporate restructuring behind the scenes, or escaping an unfavorable contract. Allows you to use the environment to shield you from harm when you are too weak to fight.\n\n⚠️ WARNING: Use ONLY for the intended purpose described above, or it can even be harmful.',

  'Human Borrows 人假':
    'MAN BORROW (Ren Jia 人假)\nConfiguration: The Stem Ren (壬) + the Spirit Jiu Di (九地 Nine Earths) + the Jing Gate (景 Scenery).\n\nYou are borrowing human compliance, public sentiment, or the cooperation of the masses.\n\nBest for: Catching fugitives, recruiting talent when your company is unknown, winning over a hostile audience, or negotiating with people who initially don\'t trust you. Temporarily creates a bridge of human connection and compliance that you didn\'t previously possess.\n\n⚠️ WARNING: Use ONLY for the intended purpose described above, or it can even be harmful.',

  'Deity Borrows 神假':
    'DEITY BORROW (Shen Jia 神假)\nConfiguration: The Marvel Bing (丙) + the Jing Gate (景 Scenery) + the Spirit Zhi Fu (值符 Chief).\n\nYou are borrowing divine authority, spiritual luck, or upper-class elite status.\n\nBest for: Suppressing evil, handling corrupt situations, managing highly toxic disputes, or dealing with lawsuits where you are the underdog. Wraps you in an aura of untouchable righteousness, forcing the opposition to back down.\n\n⚠️ WARNING: Use ONLY for the intended purpose described above, or it can even be harmful.',

  'Ghost Borrows 鬼假':
    'GHOST BORROW (Gui Jia 鬼假)\nConfiguration: The Marvel Ding (丁) + the Du Gate (杜 Hidden) + the Spirit Jiu Di (九地 Nine Earths). Often forming when the Palace interacts with specific Grave/Tomb branches.\n\nYou are borrowing the hidden, unseen, or "spectral" forces of the shadow world.\n\nBest for: Stealth maneuvers, psychological warfare, planting rumors to confuse an opponent, conducting secret audits, or executing a strategy where you want competitors to chase ghosts while you take the prize.\n\n⚠️ WARNING: Use ONLY for the intended purpose described above, or it can even be harmful.'
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
    + '<div style="background:#fff3e0;border:1px solid #ff9800;border-radius:6px;padding:8px;margin-top:10px;font-size:11px;color:#e65100;line-height:1.4;">⚠️ <strong>IMPORTANT:</strong> Your intended action MUST align with this configuration\'s expertise. Using it for a different purpose will not produce the desired result, or can even be harmful.</div>'
    + '<div style="text-align:right;margin-top:10px;"><button onclick="document.getElementById(\'qimen-popup\').remove();document.getElementById(\'qimen-popup-overlay\').remove()" style="background:#00695c;color:#fff;border:none;padding:5px 16px;border-radius:6px;font-size:11px;cursor:pointer;">OK</button></div>';
  overlay.onclick = function(){ div.remove(); overlay.remove(); };
  document.body.appendChild(overlay);
  document.body.appendChild(div);
}

// ── Jia hiding (六甲遁) and Zhi Fu/Zhi Shi popups ──
// ── DIRECTION CALCULATOR (🧭) ─────────────────────────────────────
// Computes compass direction from origin to destination.
// When set, acts as a FILTER in Purpose scans: only hours with a
// matching rotating-chart config at the target palace are shown.

var _fsActionPalace = null;   // target palace (1-9) for directional filter
var _fsActionDir    = null;   // direction label (N, NE, etc.)
var _DIR_TO_PALACE  = {N:1,NE:8,E:3,SE:4,S:9,SW:2,W:7,NW:6};

// Sync clone Purpose select with main one (bidirectional)
function fsSyncPurpose(val){
  var main = document.getElementById('purpose-select');
  if(main && main.value !== val){ main.value = val; if(typeof onPurposeChange === 'function') onPurposeChange(); }
}
function fsSyncPurposeAndScan(){
  var clone = document.getElementById('fs-purpose-clone');
  if(clone) fsSyncPurpose(clone.value);
  if(typeof runAll === 'function') runAll();
}
// Update clone when main changes (called from onPurposeChange hook)
function fsUpdatePurposeClone(){
  var main = document.getElementById('purpose-select');
  var clone = document.getElementById('fs-purpose-clone');
  if(main && clone && clone.value !== main.value) clone.value = main.value;
  // Update direction filter indicator
  var indicator = document.getElementById('fs-dir-active');
  if(indicator){
    if(_fsActionDir){
      indicator.textContent = '🧭 →' + _fsActionDir + ' (Palace ' + _fsActionPalace + ')';
      indicator.style.display = 'inline';
    } else {
      indicator.style.display = 'none';
    }
  }
}

function _fsBearing(lat1, lng1, lat2, lng2){
  // Loxodromic (rhumb-line) bearing: constant heading A->B, regardless of the
  // curvature in between — consistent with the Travel Planner's direction model.
  // (Previously great-circle initial bearing; changed for consistency.)
  var toR = Math.PI / 180;
  var dpsi = Math.log(Math.tan(Math.PI/4 + lat2*toR/2) / Math.tan(Math.PI/4 + lat1*toR/2));
  var dl = (lng2 - lng1) * toR;
  if (Math.abs(dl) > Math.PI) dl = dl > 0 ? -(2*Math.PI - dl) : (2*Math.PI + dl);
  return (Math.atan2(dl, dpsi) * 180 / Math.PI + 360) % 360;
}
function _fsBearingToDir8(deg){
  var dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}
var _fsDirectionArrows = {N:'↑',NE:'↗',E:'→',SE:'↘',S:'↓',SW:'↙',W:'←',NW:'↖'};
var _fsDirReturn = null;
function fsCloseDirectionCalc(){
  var p = document.getElementById('dir-calc-popup'); if(p) p.remove();
  var o = document.getElementById('dir-calc-overlay'); if(o) o.remove();
  if(typeof _fsDirReturn === 'function'){ var f = _fsDirReturn; _fsDirReturn = null; try { f(); } catch(e){} }
}

function fsOpenDirectionCalc(onClose){
  _fsDirReturn = (typeof onClose === 'function' ? onClose : null);
  var old = document.getElementById('dir-calc-overlay');
  if(old) old.remove();
  old = document.getElementById('dir-calc-popup');
  if(old) old.remove();

  // Origin defaults to the Main page's CURRENT location (the GPS / NOW location set
  // on the first page). The Main's visible Longitude field is authoritative for the
  // longitude; the latitude comes from the most recent GPS fix the Main recorded.
  var defLat = '', defLng = '';
  var lonEl = document.getElementById('longitude');
  if (lonEl && lonEl.value) defLng = lonEl.value;                       // Main longitude (what you see)
  // Latitude from the freshest GPS fix (this session first, then the saved one).
  if (window._lastGpsLat != null) defLat = String(window._lastGpsLat);
  else { try { var _g = JSON.parse(localStorage.getItem('xkdg_gps') || 'null'); if (_g && _g.lat != null) defLat = String(_g.lat); } catch(e){} }
  // If the Main longitude was empty, fall back to the GPS longitude so the pair stays consistent.
  if (!defLng){
    if (window._lastGpsLng != null) defLng = String(window._lastGpsLng);
    else { try { var _g2 = JSON.parse(localStorage.getItem('xkdg_gps') || 'null'); if (_g2 && _g2.lng != null) defLng = String(_g2.lng); } catch(e){} }
  }

  var overlay = document.createElement('div');
  overlay.id = 'dir-calc-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9998;';

  var popup = document.createElement('div');
  popup.id = 'dir-calc-popup';
  popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid #1565c0;border-radius:12px;padding:18px;max-width:400px;width:92%;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;';

  popup.innerHTML = ''
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
    + '<span style="font-weight:bold;color:#1565c0;font-size:16px;">🧭 Direction Calculator</span>'
    + '<button onclick="fsCloseDirectionCalc()" style="background:#888;color:#fff;border:none;border-radius:4px;padding:4px 12px;font-size:12px;cursor:pointer;">✕</button>'
    + '</div>'

    // ORIGIN
    + '<div style="background:#e3f2fd;border-radius:6px;padding:10px;margin-bottom:10px;">'
    + '<div style="font-size:12px;font-weight:bold;color:#1565c0;margin-bottom:6px;">📍 ORIGIN (your location)</div>'
    + '<div style="margin-bottom:6px;"><label style="font-size:10px;color:#666;">Address or City</label>'
    + '<div style="display:flex;gap:4px;">'
    + '<input type="text" id="dir-orig-addr" placeholder="e.g. Dubai, UAE" style="flex:1;padding:5px;border:1px solid #90caf9;border-radius:4px;font-size:13px;">'
    + '<button onclick="fsDirectionGeocodeOrigin()" style="background:#1565c0;color:#fff;border:none;border-radius:4px;padding:6px 10px;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;">🔍 Find</button>'
    + '</div></div>'
    + '<div style="display:flex;gap:6px;align-items:end;flex-wrap:wrap;">'
    + '<div style="flex:1;min-width:80px;"><label style="font-size:10px;color:#666;">Latitude</label>'
    + '<input type="number" id="dir-orig-lat" step="any" placeholder="e.g. 48.2082" value="' + defLat + '" style="width:100%;padding:5px;border:1px solid #90caf9;border-radius:4px;font-size:13px;"></div>'
    + '<div style="flex:1;min-width:80px;"><label style="font-size:10px;color:#666;">Longitude</label>'
    + '<input type="number" id="dir-orig-lng" step="any" placeholder="e.g. 16.3738" value="' + defLng + '" style="width:100%;padding:5px;border:1px solid #90caf9;border-radius:4px;font-size:13px;"></div>'
    + '<button onclick="fsDirectionGPS()" style="background:#1565c0;color:#fff;border:none;border-radius:4px;padding:6px 10px;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;">📡 GPS</button>'
    + '</div></div>'

    // DESTINATION
    + '<div style="background:#fff3e0;border-radius:6px;padding:10px;margin-bottom:10px;">'
    + '<div style="font-size:12px;font-weight:bold;color:#e65100;margin-bottom:6px;">🎯 DESTINATION</div>'
    + '<div style="margin-bottom:6px;"><label style="font-size:10px;color:#666;">Address or City</label>'
    + '<div style="display:flex;gap:4px;">'
    + '<input type="text" id="dir-dest-addr" placeholder="e.g. Milano, Italy" style="flex:1;padding:5px;border:1px solid #ffcc80;border-radius:4px;font-size:13px;">'
    + '<button onclick="fsDirectionGeocode()" style="background:#e65100;color:#fff;border:none;border-radius:4px;padding:6px 10px;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;">🔍 Find</button>'
    + '</div></div>'
    + '<div style="display:flex;gap:6px;align-items:end;">'
    + '<div style="flex:1;min-width:80px;"><label style="font-size:10px;color:#666;">Latitude</label>'
    + '<input type="number" id="dir-dest-lat" step="any" placeholder="—" style="width:100%;padding:5px;border:1px solid #ffcc80;border-radius:4px;font-size:13px;"></div>'
    + '<div style="flex:1;min-width:80px;"><label style="font-size:10px;color:#666;">Longitude</label>'
    + '<input type="number" id="dir-dest-lng" step="any" placeholder="—" style="width:100%;padding:5px;border:1px solid #ffcc80;border-radius:4px;font-size:13px;"></div>'
    + '</div>'
    + '<div id="dir-geocode-status" style="font-size:10px;color:#888;margin-top:4px;"></div>'
    + '</div>'

    // CALCULATE BUTTON
    + '<button onclick="fsDirectionCalc()" style="width:100%;background:#2e7d32;color:#fff;border:none;border-radius:6px;padding:12px;font-size:16px;font-weight:bold;cursor:pointer;margin-bottom:8px;">🧭 CALCULATE DIRECTION</button>'

    // ONE-TAP: calculate direction + set Journey + 7-day window + run BEST scan
    + '<button onclick="fsDirectionScanFlights()" style="width:100%;background:#1565c0;color:#fff;border:none;border-radius:6px;padding:12px;font-size:15px;font-weight:bold;cursor:pointer;margin-bottom:10px;">🔭 SCAN flight dates</button>'

    // RESULT
    + '<div id="dir-calc-result" style="text-align:center;min-height:40px;"></div>';

  overlay.onclick = function(e){ if(e.target === overlay){ fsCloseDirectionCalc(); } };
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  try { _fsDirRestore(); } catch(e){}
}

// Persist / restore the Direction Calculator origin+destination so the user
// doesn't have to re-enter them every time the panel (or page) is reopened.
function _fsDirSave(){
  try {
    var g = function(id){ var e = document.getElementById(id); return e ? e.value.trim() : ''; };
    var route = {
      oAddr: g('dir-orig-addr'), oLat: g('dir-orig-lat'), oLng: g('dir-orig-lng'),
      dAddr: g('dir-dest-addr'), dLat: g('dir-dest-lat'), dLng: g('dir-dest-lng')
    };
    localStorage.setItem('xkdg_dir_route', JSON.stringify(route));
    // Keep the flight-search route in sync too (used by the 🔎 buttons).
    if (route.dAddr){ window._fsFlightDest = route.dAddr; localStorage.setItem('xkdg_flight_dest', route.dAddr); }
    if (route.oAddr){ window._fsFlightOrigin = route.oAddr; localStorage.setItem('xkdg_flight_orig', route.oAddr); }
  } catch(e){}
}
function _fsDirRestore(){
  try {
    var route = JSON.parse(localStorage.getItem('xkdg_dir_route') || 'null');
    if (!route) return;
    var set = function(id, v){ var e = document.getElementById(id); if (e && v) e.value = v; };
    // Destination: always restore (it has no other default source).
    set('dir-dest-addr', route.dAddr); set('dir-dest-lat', route.dLat); set('dir-dest-lng', route.dLng);
    // Origin: restore the city name; keep the live Main/GPS coordinates if already
    // filled (so origin still reflects "where I am now"), else use the saved ones.
    set('dir-orig-addr', route.oAddr);
    var ol = document.getElementById('dir-orig-lat'), og = document.getElementById('dir-orig-lng');
    if (ol && !ol.value && route.oLat) ol.value = route.oLat;
    if (og && !og.value && route.oLng) og.value = route.oLng;
  } catch(e){}
}

function fsDirectionGPS(){
  if(!navigator.geolocation){ alert('GPS not available'); return; }
  var status = document.getElementById('dir-geocode-status');
  if(status) status.textContent = 'Getting GPS position...';
  navigator.geolocation.getCurrentPosition(function(pos){
    document.getElementById('dir-orig-lat').value = pos.coords.latitude.toFixed(6);
    document.getElementById('dir-orig-lng').value = pos.coords.longitude.toFixed(6);
    window._lastGpsLat = pos.coords.latitude;
    window._lastGpsLng = pos.coords.longitude;
    try { localStorage.setItem('xkdg_gps', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })); } catch(e){}
    if(status) status.textContent = 'GPS position acquired.';
  }, function(err){
    if(status) status.textContent = 'GPS error: ' + err.message;
  }, {enableHighAccuracy: true, timeout: 10000});
}

function fsDirectionGeocodeOrigin(){
  var addr = document.getElementById('dir-orig-addr').value.trim();
  if(!addr){ alert('Enter an origin address or city name.'); return; }
  var status = document.getElementById('dir-geocode-status');
  if(status) status.textContent = 'Searching origin...';
  fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(addr) + '&format=json&limit=1', {
    headers: {'Accept-Language': 'en'}
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if(!data || !data.length){
      if(status) status.textContent = 'Origin not found. Try a different query.';
      return;
    }
    var place = data[0];
    document.getElementById('dir-orig-lat').value = parseFloat(place.lat).toFixed(6);
    document.getElementById('dir-orig-lng').value = parseFloat(place.lon).toFixed(6);
    if(status) status.textContent = '✓ Origin: ' + place.display_name.substring(0, 80);
    try { _fsDirSave(); } catch(e){}
  })
  .catch(function(err){
    if(status) status.textContent = 'Origin geocoding error: ' + err.message;
  });
}

function fsDirectionGeocode(){
  var addr = document.getElementById('dir-dest-addr').value.trim();
  if(!addr){ alert('Enter an address or city name.'); return; }
  var status = document.getElementById('dir-geocode-status');
  if(status) status.textContent = 'Searching...';
  fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(addr) + '&format=json&limit=1', {
    headers: {'Accept-Language': 'en'}
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if(!data || !data.length){
      if(status) status.textContent = 'Address not found. Try a different query.';
      return;
    }
    var place = data[0];
    document.getElementById('dir-dest-lat').value = parseFloat(place.lat).toFixed(6);
    document.getElementById('dir-dest-lng').value = parseFloat(place.lon).toFixed(6);
    if(status) status.textContent = '✓ Found: ' + place.display_name.substring(0, 80);
    try { _fsDirSave(); } catch(e){}
  })
  .catch(function(err){
    if(status) status.textContent = 'Geocoding error: ' + err.message;
  });
}

function fsDirectionCalc(){
  var lat1 = parseFloat(document.getElementById('dir-orig-lat').value);
  var lng1 = parseFloat(document.getElementById('dir-orig-lng').value);
  var lat2 = parseFloat(document.getElementById('dir-dest-lat').value);
  var lng2 = parseFloat(document.getElementById('dir-dest-lng').value);
  if(isNaN(lat1)||isNaN(lng1)){ alert('Enter Origin coordinates or use GPS.'); return; }
  if(isNaN(lat2)||isNaN(lng2)){ alert('Enter Destination address and click Find.'); return; }
  try { _fsDirSave(); } catch(e){}

  var deg = _fsBearing(lat1, lng1, lat2, lng2);
  var dir = _fsBearingToDir8(deg);
  var arrow = _fsDirectionArrows[dir] || '→';

  var box = document.getElementById('dir-calc-result');
  if(!box) return;

  // Set global filter
  _fsActionDir = dir;
  _fsActionPalace = _DIR_TO_PALACE[dir] || null;

  box.innerHTML = ''
    + '<div style="font-size:48px;line-height:1;">' + arrow + '</div>'
    + '<div style="font-size:28px;font-weight:bold;color:#1565c0;margin:6px 0;">Direction: ' + dir + ' (Palace ' + _fsActionPalace + ')</div>'
    + '<div style="font-size:13px;color:#666;">Bearing: ' + deg.toFixed(1) + '°</div>'
    + '<div style="margin-top:10px;padding:8px;background:#e8f5e9;border-radius:6px;font-size:12px;color:#2e7d32;">'
    + '✓ <strong>Direction filter active!</strong> Purpose scans will now show ONLY hours with a matching Qimen configuration towards ' + dir + '.'
    + '</div>'
    + '<div style="margin-top:8px;text-align:center;">'
    + '<button onclick="fsClearDirectionFilter()" style="background:#c62828;color:#fff;border:none;border-radius:4px;padding:6px 16px;font-size:12px;cursor:pointer;">✕ Clear Direction Filter</button>'
    + '</div>';
  fsUpdatePurposeClone();
}

function fsClearDirectionFilter(){
  _fsActionPalace = null;
  _fsActionDir = null;
  var box = document.getElementById('dir-calc-result');
  if(box) box.innerHTML = '<div style="color:#888;font-size:12px;">Direction filter cleared. Purpose scans will show all qualifying hours.</div>';
  fsUpdatePurposeClone();
}

// One-tap flight scan: validate inputs, compute the (loxodromic) direction and
// activate the filter, force Purpose = Journey, ensure a scan window (today + 7
// days if none set), close the popup, and run the BEST scan. The BEST scan then
// lists the day/hours whose score >= 8 AND whose Qimen direction gate (San Qi +
// favourable door) passes toward the flight direction — best first.
function fsDirectionScanFlights(){
  var lat1 = parseFloat(document.getElementById('dir-orig-lat').value);
  var lng1 = parseFloat(document.getElementById('dir-orig-lng').value);
  var lat2 = parseFloat(document.getElementById('dir-dest-lat').value);
  var lng2 = parseFloat(document.getElementById('dir-dest-lng').value);
  if(isNaN(lat1)||isNaN(lng1)){ alert('Enter the ORIGIN city (🔍 Find) or use GPS.'); return; }
  if(isNaN(lat2)||isNaN(lng2)){ alert('Enter the DESTINATION city and click 🔍 Find.'); return; }

  // 1) Compute the direction + activate the filter.
  fsDirectionCalc();
  if(!_fsActionPalace){ return; }

  // 2) Force Purpose = Journey.
  var psel = document.getElementById('purpose-select');
  if(psel){ psel.value = 'journey'; if(typeof onPurposeChange === 'function') onPurposeChange(); }
  if(typeof getPurpose === 'function' && getPurpose() !== 'journey'){
    alert('Load Person A/B (or enable Test Mode) first — a person is needed to score the dates.');
    return;
  }

  // 3) Ensure a scan window (default: today + 7 days; expandable by the user).
  var ss = document.getElementById('scan-start');
  if(ss && !ss.value){
    var t = new Date();
    ss.value = t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0');
  }
  var sd = document.getElementById('scan-days');
  if(sd && (!sd.value || parseInt(sd.value) < 1)){ sd.value = '7'; }

  // 4) Close the popup. (This path runs the scan in Main on purpose — no hub return.)
  _fsDirReturn = null;
  var p = document.getElementById('dir-calc-popup'); if(p) p.remove();
  var o = document.getElementById('dir-calc-overlay'); if(o) o.remove();

  // Capture origin/destination for the ✈ flight-search buttons (CAL + LIST).
  // Prefer the typed city names; fall back to coordinates if no city given.
  try {
    var _oa = document.getElementById('dir-orig-addr');
    var _da = document.getElementById('dir-dest-addr');
    var _olat = document.getElementById('dir-orig-lat'), _olng = document.getElementById('dir-orig-lng');
    var _dlat = document.getElementById('dir-dest-lat'), _dlng = document.getElementById('dir-dest-lng');
    window._fsFlightOrigin = (_oa && _oa.value.trim()) ? _oa.value.trim()
        : ((_olat && _olng && _olat.value && _olng.value) ? (_olat.value + ',' + _olng.value) : '');
    window._fsFlightDest = (_da && _da.value.trim()) ? _da.value.trim()
        : ((_dlat && _dlng && _dlat.value && _dlng.value) ? (_dlat.value + ',' + _dlng.value) : '');
  } catch(e){}

  // 5) Scan the CURRENT month (today → end of month) and show it on the calendar
  //    with ✈ favourable-hour badges. Navigating months (+1m/+2m/…) re-scans that
  //    whole month. A future month is scanned in full; the current month starts today.
  if (typeof _fsScanMonthForFlights === 'function'){
    var _tn = new Date();
    _fsScanMonthForFlights(_tn.getFullYear(), _tn.getMonth() + 1);
  } else if (typeof runScanner === 'function'){
    runScanner();
    if (typeof setMode === 'function' && typeof buildCalView === 'function'){
      setMode('cal');
      window._fsFlightCalMode = true;
      buildCalView();
    }
  }
  else { alert('Scanner not available on this page.'); }
}

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
function showQimenChart(isoDate, hGan, hZhi, highlightPalace, opts){
  if (!isoDate || !hGan || !hZhi) return;
  if (typeof window.QMDJWaterScanner === 'undefined') return;
  opts = opts || {};
  var isRot = (opts.mode === 'rotating' && typeof window.QMDJWaterScanner.getRotatingHourChart === 'function');
  var parts = isoDate.split('-');
  var Y = parseInt(parts[0]), M = parseInt(parts[1]), D = parseInt(parts[2]);
  var chart = isRot
    ? window.QMDJWaterScanner.getRotatingHourChart(Y, M, D, hGan, hZhi)
    : window.QMDJWaterScanner.getHourChart(Y, M, D, hGan, hZhi);
  if (!chart) { if (opts.returnHtml) return ''; alert('Cannot load chart for ' + isoDate + ' ' + hGan + hZhi); return; }

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
    var doorTxt = d.doorName || d.door || '';
    var doorColor = FAV.indexOf(doorTxt)!==-1 ? '#1b5e20' : '#c62828';
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
      + '<div style="text-align:center;font-weight:bold;color:'+doorColor+';font-size:16px;margin:4px 0;">' + doorTxt + '</div>'
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
       + '📅 QMDJ • Hour ' + (isRot ? 'Rotating' : 'Flying') + ' Chart'
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

  // Allow callers (e.g. travel planner) to embed the chart wherever they want
  if (opts.returnHtml) return html;

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

// ── Internal/External door helpers: Zheng Shen facing + Ling Shen water ──
function fsNearestZhengShen(deg){
  if (!isFinite(deg)) return null;
  var best = null, bestD = 999;
  for (var i = 0; i < FS_SLOTS.length; i++){
    var s = FS_SLOTS[i];
    if (!fsIsZhengShen(s.yun)) continue;
    var d = fsAngularDist(deg, s.centerDeg);
    if (d < bestD){ bestD = d; best = s; }
  }
  return best;
}
function fsCheckFacingZS(){
  try {
    var el = document.getElementById('fs-facing');
    var v = parseFloat((el || {}).value);
    if (!isFinite(v)) return;
    var slot = fsSlotForDeg(v);
    if (slot && fsIsZhengShen(slot.yun)) return;            // OK — it's Zheng Shen
    var near = fsNearestZhengShen(v);
    var msg = '\u26A0 This Door Facing (' + v.toFixed(1) + '\u00B0) is NOT on a \u6B63\u795E Zheng Shen hexagram'
            + (slot ? ' (hex ' + slot.hexNum + ', yun ' + slot.yun + ').' : '.');
    if (near){
      msg += '\n\nNearest \u6B63\u795E facing: ' + near.centerDeg.toFixed(1) + '\u00B0 (hex ' + near.hexNum + ', yun ' + near.yun + ').'
           + '\n\nPress OK to use it, or Cancel to keep your value.';
      if (confirm(msg)){
        el.value = near.centerDeg.toFixed(2);
        if (typeof fsRedraw === 'function') fsRedraw();
      }
    } else { alert(msg); }
  } catch(e){ console.warn('fsCheckFacingZS', e); }
}
function fsCheckWaterLS(){
  try {
    var v = parseFloat((document.getElementById('fs-water') || {}).value);
    if (!isFinite(v)) return;
    var slot = fsSlotForDeg(v);
    if (slot && fsIsLingShen(slot.yun)) return;             // OK — it's Ling Shen
    alert('\u26A0 This Water position (' + v.toFixed(1) + '\u00B0) is NOT on a \u96F6\u795E Ling Shen hexagram'
        + (slot ? ' (hex ' + slot.hexNum + ', yun ' + slot.yun + ').' : '.')
        + '\n\nUse \uD83D\uDCA1 Suggest to get the closest favorable \u96F6\u795E Water.');
  } catch(e){ console.warn('fsCheckWaterLS', e); }
}
function fsGenWaterSaveToHouse(){
  try {
    var ref = (typeof _fsSettingRef === 'function') ? _fsSettingRef() : null;
    if (!ref){ alert('Load a person and a saved house first — settings are stored inside the active house.'); return; }
    var pal = (document.getElementById('fs-wateract-dir') || {}).value || '';
    if (!pal){ alert('Select a Palace first.'); return; }
    var name = prompt('Name for this water feature (e.g. "Aquarium ' + pal + '"):', 'Water ' + pal);
    if (!name || !name.trim()) return;
    if (!ref.floor.settings.water) ref.floor.settings.water = [];
    ref.floor.settings.water.push({ name: name.trim(), kind: 'general', palace: pal, ts: Date.now() });
    _fsHousesSave(ref.all);
    if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
    if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles();
    alert('Saved "' + name.trim() + '" (palace ' + pal + ') to the house.');
  } catch(e){ console.warn('fsGenWaterSaveToHouse', e); alert('Save failed.'); }
}

// ── Saved settings (Water/Bed/Desk) — view / edit / scan / remove from the card ──
// Toggle the inline view-edit panel under a saved setting chip.
function fsToggleSavedEdit(hi, zone, idx){
  try {
    var el = document.getElementById('fs-set-edit-' + hi + '-' + zone + '-' + idx);
    if (!el) return;
    el.style.display = (!el.style.display || el.style.display === 'none') ? 'block' : 'none';
  } catch(e){ console.warn('fsToggleSavedEdit', e); }
}

// Persist edits (name, and palace for a general water feature) made inline.
function fsSaveSavedSetting(personName, hi, zone, idx){
  try {
    var all = _fsHousesLoad();
    var houses = all[personName] || [];
    var house = houses[hi]; if (!house) return;
    var floor = _fsActiveFloor(house);
    var arr = (floor.settings && floor.settings[zone]) || [];
    var s = arr[idx]; if (!s) return;
    var nameEl = document.getElementById('fs-setname-' + hi + '-' + zone + '-' + idx);
    if (nameEl && nameEl.value.trim()) s.name = nameEl.value.trim();
    var palEl = document.getElementById('fs-setpal-' + hi + '-' + zone + '-' + idx);
    if (palEl && palEl.value) s.palace = palEl.value;
    _fsHousesSave(all);
    if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles();
    if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
  } catch(e){ console.warn('fsSaveSavedSetting', e); }
}

// Jump from a saved setting straight to its ⚡ Operative activation (house + task
// pre-selected) AND auto-start the SCAN. No need to re-enter "Add Water".
function fsActivateSavedSetting(personName, hi, zone, idx){
  try {
    if (typeof _fsActiveHouseSet === 'function') _fsActiveHouseSet(personName, hi);
    if (typeof fsLoadHouse === 'function') fsLoadHouse(personName, hi);   // load chart so the target star can be derived
    window._fsOpTaskKey = zone + '|' + idx;
    if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles();
    if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();  // derives window._fsOpStar from the placement
    var box = document.getElementById('fs-op-activate');
    if (box) box.scrollIntoView({ behavior:'smooth', block:'center' });
    // Auto-start the scan once the render has settled and QFS is ready.
    setTimeout(function(){
      try {
        window._fsOpTaskKey = zone + '|' + idx;          // re-assert in case a re-render reset it
        if (typeof fsOpScan === 'function') fsOpScan();
      } catch(e){ console.warn('fsActivateSavedSetting/auto-scan', e); }
    }, 220);
  } catch(e){ console.warn('fsActivateSavedSetting', e); }
}

// Open a snapshot-type setting (Water-by-degrees / Bed / Desk) back in its zone
// editor, pre-filled, so its geometry can be modified.
function fsOpenSavedForEdit(personName, hi, zone, idx){
  try {
    if (typeof fsSetActiveHouse === 'function') fsSetActiveHouse(personName, hi);
    if (typeof fsOpenZoneForHouse === 'function') fsOpenZoneForHouse(personName, hi, zone);
    if (typeof fsLoadZoneSetting === 'function') fsLoadZoneSetting(idx);
  } catch(e){ console.warn('fsOpenSavedForEdit', e); }
}

// Remove a saved Water/Bed/Desk setting from a house floor.
function fsDeleteSavedSetting(personName, hi, zone, idx){
  try {
    var all = _fsHousesLoad();
    var houses = all[personName] || [];
    var house = houses[hi]; if (!house) return;
    var floor = _fsActiveFloor(house);
    var arr = (floor.settings && floor.settings[zone]) || [];
    var s = arr[idx]; if (!s) return;
    if (!confirm('Remove saved ' + zone + ' "' + (s.name || '') + '" from this house?')) return;
    arr.splice(idx, 1);
    _fsHousesSave(all);
    if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles();
    if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
  } catch(e){ console.warn('fsDeleteSavedSetting', e); }
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
  fsRenderHouseProfiles();
};

// ═══════════════════════════════════════════════════════════════════
//  HOUSE PROFILES — save/load FS chart per person (multi-house,
//  multi-door, multi-water).  localStorage key: xkdg_houses
//
//  Structure v2:
//  { "PersonName": [ {
//      name, houseFacing, period,
//      doors: [ { name, facing, water } ],   // multiple XKDG porte/facciate
//      waters: [{ name, dir, palace }]        // 🐟 acquari permanenti
//  } ] }
//
//  Migration: old format (facing, xkdgWater at top level) is auto-
//  converted to doors[0] on load.
// ═══════════════════════════════════════════════════════════════════

/** Migrate a single house object from v1 (flat facing/xkdgWater) to v2 (doors[]). */
function _fsHouseMigrate(h){
  if (h.doors) return h;                       // already v2
  var door0 = {
    name: 'Main door',
    facing: h.facing != null ? h.facing : null,
    water:  h.xkdgWater != null ? h.xkdgWater : null
  };
  var migrated = {
    name:        h.name,
    houseFacing: h.houseFacing != null ? h.houseFacing : null,
    period:      h.period != null ? h.period : null,
    doors:       (door0.facing != null || door0.water != null) ? [door0] : [],
    waters:      h.waters || []
  };
  return migrated;
}

function _fsHousesLoad(){
  try {
    var raw = JSON.parse(localStorage.getItem('xkdg_houses') || '{}');
    var dirty = false;
    Object.keys(raw).forEach(function(pn){
      raw[pn] = raw[pn].map(function(h){
        if (!h.floors){
          if (!h.doors){ dirty = true; h = _fsHouseMigrate(h); }
          dirty = true; h = _fsHouseAddFloors(h);
        }
        return h;
      });
    });
    if (dirty) _fsHousesSave(raw);              // persist migration
    return raw;
  } catch(e){ return {}; }
}

/** Migrate a v2 house (flat doors/waters/zones/settings) to v3 (floors[]). */
function _fsHouseAddFloors(h){
  if (h.floors) return h;
  var floor0 = {
    label:    'Floor 1',
    facing:   (h.houseFacing != null ? h.houseFacing : null),
    period:   (h.period != null ? h.period : null),
    doors:    h.doors  || [],
    waters:   h.waters || [],
    zones:    h.zones  || [],
    settings: h.settings || { water: [], bed: [], desk: [] }
  };
  return {
    name:        h.name,
    sameFacing:  (h.sameFacing != null ? h.sameFacing : true),
    houseFacing: (h.houseFacing != null ? h.houseFacing : null),
    period:      (h.period != null ? h.period : null),
    floors:      [floor0],
    activeFloor: 0
  };
}

/** The currently-selected floor object of a house (self-healing). */
function _fsActiveFloor(h){
  if (!h) return null;
  if (!h.floors || !h.floors.length){
    h.floors = [{ label: 'Floor 1', facing: (h.houseFacing != null ? h.houseFacing : null), period: (h.period != null ? h.period : null),
      doors: h.doors || [], waters: h.waters || [], zones: h.zones || [], settings: h.settings || { water: [], bed: [], desk: [] } }];
    h.activeFloor = 0;
  }
  var i = h.activeFloor || 0; if (i >= h.floors.length) i = 0;
  var f = h.floors[i];
  if (!f.doors) f.doors = [];
  if (!f.waters) f.waters = [];
  if (!f.zones) f.zones = [];
  if (!f.settings) f.settings = { water: [], bed: [], desk: [] };
  return f;
}
/** Effective facing/period for a floor (shared house value when sameFacing). */
function _fsFloorFacing(h, f){ return (h && h.sameFacing) ? h.houseFacing : (f ? f.facing : null); }
function _fsFloorPeriod(h, f){ return (h && h.sameFacing) ? h.period : (f ? f.period : null); }
function _fsHousesSave(data){ localStorage.setItem('xkdg_houses', JSON.stringify(data)); }

// ── Backup / Restore (all localStorage: houses, persons, archives, settings) ──
function fsExportBackup(){
  try {
    var data = {};
    for (var i = 0; i < localStorage.length; i++){
      var k = localStorage.key(i);
      if (k != null) data[k] = localStorage.getItem(k);
    }
    var payload = { app: 'XKDG', kind: 'backup', version: 1, savedAt: new Date().toISOString(), data: data };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var d = new Date();
    var p2 = function(n){ return String(n).padStart(2, '0'); };
    var stamp = d.getFullYear() + '-' + p2(d.getMonth()+1) + '-' + p2(d.getDate()) + '_' + p2(d.getHours()) + p2(d.getMinutes());
    var a = document.createElement('a');
    a.href = url; a.download = 'xkdg-backup_' + stamp + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch(e){} }, 1500);
  } catch(e){ alert('Backup failed: ' + ((e && e.message) || e)); }
}

function fsImportBackup(input){
  try {
    var file = input && input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var parsed = JSON.parse(reader.result);
        var data = (parsed && parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
        if (!data || typeof data !== 'object'){ alert('This file is not a valid XKDG backup.'); input.value = ''; return; }
        var keys = Object.keys(data);
        var nHouses = 0;
        try { var hh = JSON.parse(data['xkdg_houses'] || '{}'); Object.keys(hh).forEach(function(k){ nHouses += (hh[k] || []).length; }); } catch(e){}
        var msg = 'Restore this backup?\n\n'
                + (nHouses ? ('Houses: ' + nHouses + '\n') : '')
                + 'Stored items: ' + keys.length + '\n'
                + (parsed && parsed.savedAt ? ('Saved: ' + parsed.savedAt + '\n') : '')
                + '\nThis OVERWRITES the houses, persons and settings currently on this device.';
        if (!confirm(msg)){ input.value = ''; return; }
        keys.forEach(function(k){
          try { localStorage.setItem(k, (typeof data[k] === 'string') ? data[k] : JSON.stringify(data[k])); } catch(e){}
        });
        alert('Backup restored. The app will reload now.');
        input.value = '';
        location.reload();
      } catch(e){ alert('Could not read this backup file: ' + ((e && e.message) || e)); input.value = ''; }
    };
    reader.readAsText(file);
  } catch(e){ alert('Restore failed: ' + ((e && e.message) || e)); }
}

// Active house index per person — stored separately to avoid migration issues
function _fsActiveHouseGet(personName){
  try { var m = JSON.parse(localStorage.getItem('xkdg_active_house') || '{}'); return m[personName] || 0; } catch(e){ return 0; }
}
function _fsActiveHouseSet(personName, idx){
  try { var m = JSON.parse(localStorage.getItem('xkdg_active_house') || '{}'); m[personName] = idx; localStorage.setItem('xkdg_active_house', JSON.stringify(m)); } catch(e){}
}
function fsSetActiveHouse(personName, idx){
  _fsActiveHouseSet(personName, idx);
  fsLoadHouse(personName, idx);
  fsRenderHouseProfiles();
  if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
  if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
}

// Open the Water/Bed/Desk calculation tool, pre-attached to a specific house/floor.
// This makes House the single entry point: the "Set up …" buttons in a house card
// open the same engine the old standalone tiles used, already bound to that house.
function fsOpenZoneForHouse(personName, houseIdx, zone){
  try { if (typeof fsSetActiveHouse === 'function') fsSetActiveHouse(personName, houseIdx); } catch(e){ console.warn('fsOpenZoneForHouse/setActive', e); }
  try { if (typeof fsSelectZone === 'function') fsSelectZone(zone); } catch(e){ console.warn('fsOpenZoneForHouse/selectZone', e); }
  try {
    var el = document.getElementById('fs-zone-tools') || document.getElementById('fs-zone-banner') || document.getElementById('fs-zone-gate');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(e){}
}

// ── Multi-floor operations ───────────────────────────────────────
function fsSwitchFloor(personName, houseIdx, floorIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    floorIdx = parseInt(floorIdx, 10) || 0;
    if (!h.floors || floorIdx >= h.floors.length) return;
    h.activeFloor = floorIdx;
    _fsHousesSave(all);
    if (_fsActiveHouseGet(personName) === houseIdx) fsLoadHouse(personName, houseIdx);
    fsRenderHouseProfiles();
    if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
  } catch(e){ console.warn('fsSwitchFloor', e); }
}
function fsAddFloor(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    if (!h.floors) h.floors = [];
    var name = prompt('Name of the new floor (e.g. "1st floor", "Attic"):', 'Floor ' + (h.floors.length + 1));
    if (name === null) return;
    if (!name.trim()) name = 'Floor ' + (h.floors.length + 1);
    h.floors.push({ label: name.trim(),
      facing: (h.sameFacing ? h.houseFacing : null), period: (h.sameFacing ? h.period : null),
      doors: [], waters: [], zones: [], settings: { water: [], bed: [], desk: [] } });
    h.activeFloor = h.floors.length - 1;
    _fsHousesSave(all);
    if (_fsActiveHouseGet(personName) === houseIdx) fsLoadHouse(personName, houseIdx);
    fsRenderHouseProfiles();
    if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
  } catch(e){ console.warn('fsAddFloor', e); }
}
function fsRenameFloor(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    var f = _fsActiveFloor(h); if (!f) return;
    var name = prompt('Rename floor:', f.label || '');
    if (name === null || !name.trim()) return;
    f.label = name.trim();
    _fsHousesSave(all);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsRenameFloor', e); }
}
function fsDeleteFloor(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h || !h.floors || h.floors.length <= 1) return;
    var f = _fsActiveFloor(h);
    if (!confirm('Delete floor "' + (f.label || '') + '" and all its settings?')) return;
    h.floors.splice((h.activeFloor || 0), 1);
    h.activeFloor = 0;
    _fsHousesSave(all);
    if (_fsActiveHouseGet(personName) === houseIdx) fsLoadHouse(personName, houseIdx);
    fsRenderHouseProfiles();
    if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
  } catch(e){ console.warn('fsDeleteFloor', e); }
}
function fsToggleSameFacing(personName, houseIdx, checked){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    h.sameFacing = !!checked;
    if (h.sameFacing){
      var f = _fsActiveFloor(h);
      if (h.houseFacing == null && f && f.facing != null) h.houseFacing = f.facing;
      if (h.period == null && f && f.period != null) h.period = f.period;
    }
    _fsHousesSave(all);
    if (_fsActiveHouseGet(personName) === houseIdx) fsLoadHouse(personName, houseIdx);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsToggleSameFacing', e); }
}
function fsEditFloorFacing(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    var f = _fsActiveFloor(h); if (!f) return;
    var fac = prompt('Facing (\u00b0) for floor "' + (f.label || '') + '":', f.facing != null ? f.facing : '');
    if (fac === null) return;
    var per = prompt('Period (1-9) for floor "' + (f.label || '') + '":', f.period != null ? f.period : '');
    if (per === null) return;
    f.facing = (String(fac).trim() === '') ? null : parseFloat(fac);
    f.period = (String(per).trim() === '') ? null : parseInt(per, 10);
    _fsHousesSave(all);
    if (_fsActiveHouseGet(personName) === houseIdx) fsLoadHouse(personName, houseIdx);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsEditFloorFacing', e); }
}

/** Return { name, who } for the currently loaded person (A preferred, else B). */
function fsGetActivePersonForHouse(){
  const nA = (document.getElementById('person-name') || {}).value || '';
  const nB = (document.getElementById('person-name-b') || {}).value || '';
  var raw = nA.trim() ? { name: nA.trim(), who: 'A' } : (nB.trim() ? { name: nB.trim(), who: 'B' } : null);
  if (!raw) return null;
  // House profiles are keyed by person name, so a small name difference (case,
  // or "ed" vs "Edu") would hide them. If the exact name has no group, fall back
  // to a case-insensitive key, then to a group whose stored birthDate matches
  // this person's birth date — so houses are never lost to a name typo.
  try {
    var all = _fsHousesLoad();
    if (!all[raw.name] || !all[raw.name].length){
      var keys  = Object.keys(all);
      var lower = raw.name.toLowerCase();
      var ci = keys.filter(function(k){ return k.toLowerCase() === lower; })[0];
      if (ci){
        raw.name = ci;
      } else {
        var bd = (document.getElementById(raw.who === 'B' ? 'person-date-b' : 'person-date') || {}).value || '';
        if (bd){
          var byDate = keys.filter(function(k){
            return (all[k] || []).some(function(h){ return h && h.birthDate === bd; });
          })[0];
          if (byDate) raw.name = byDate;
        }
      }
    }
  } catch(e){}
  return raw;
}

// Open the Floor-Plan Flying-Stars tool for a SPECIFIC house, pre-filled with
// that house's active-floor facing & period, restoring any saved plan, and
// saving the plan back into that floor (xkdg_houses) — so it's tied to the house.
function fsHouseImportFloorplan(pName, hi){
  try {
    var all = _fsHousesLoad();
    var houses = all[pName] || [];
    var h = houses[hi];
    if (!h){ alert('House not found.'); return; }
    var fIdx = h.activeFloor || 0; if (fIdx >= h.floors.length) fIdx = 0;
    var f = h.floors[fIdx];
    var opts = {
      houseName: h.name,
      saved: (f && f.floorplan && f.floorplan.imgData) ? f.floorplan : null,
      onSave: function(obj){
        try {
          var all2 = _fsHousesLoad();
          var hh = (all2[pName] || [])[hi];
          if (!hh) return false;
          var fi = hh.activeFloor || 0; if (fi >= hh.floors.length) fi = 0;
          if (!hh.floors[fi]) return false;
          hh.floors[fi].floorplan = obj;
          _fsHousesSave(all2);            // throws on quota overflow -> caught below
          fsRenderHouseProfiles();
          return true;
        } catch (e){ return false; }
      }
    };
    var fac = _fsFloorFacing(h, f);
    var per = _fsFloorPeriod(h, f);
    if (typeof fac === 'number') opts.facingDeg = fac;
    if (typeof per === 'number') opts.period = per;
    if (f && f.floorplan && f.floorplan.facingSide) opts.facingSide = f.floorplan.facingSide;
    if (window.FloorPlanStars && typeof FloorPlanStars.open === 'function') FloorPlanStars.open(opts);
    else alert('Floorplans not available on this page.');
  } catch (e){ alert('Could not open the floor-plan tool.'); }
}

// Remove the saved floor plan from a house's active floor.
function fsHouseRemoveFloorplan(pName, hi){
  if (!confirm('Remove the saved floor plan for this floor?')) return;
  try {
    var all = _fsHousesLoad();
    var h = (all[pName] || [])[hi];
    if (!h) return;
    var fi = h.activeFloor || 0; if (fi >= h.floors.length) fi = 0;
    if (h.floors[fi] && h.floors[fi].floorplan){ delete h.floors[fi].floorplan; _fsHousesSave(all); fsRenderHouseProfiles(); }
  } catch (e){}
}

function fsRenderHouseProfiles(){
  const label = document.getElementById('fs-house-person-label');
  const list  = document.getElementById('fs-house-detail') || document.getElementById('fs-house-list');
  if (!label || !list) return;

  const person = fsGetActivePersonForHouse();
  if (!person){
    label.innerHTML = '<span style="color:#999;">Load a person (A or B) to manage house profiles.</span>';
    list.innerHTML = '';
    return;
  }
  label.innerHTML = 'Person: <strong>' + person.name + '</strong> (' + person.who + ')';

  const all = _fsHousesLoad();
  const houses = all[person.name] || [];

  if (!houses.length){
    list.innerHTML = '<div style="color:#999;font-style:italic;padding:4px 0;">No saved houses yet. Press <strong>+ Add a new house</strong> (top right) to create one.</div>';
    return;
  }

  var escHtml = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); };
  var escJs   = function(s){ return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); };

  var activeIdx = _fsActiveHouseGet(person.name);
  if (activeIdx >= houses.length) activeIdx = 0;

  var cats = _fsCatsLoad();
  var filter = window._fsHouseFilter || null;

  var html = '';
  // Category filter (only if categories exist)
  if (cats.length){
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:11px;color:#555;">';
    html += '<span>🔎 Filter:</span><select onchange="fsFilterHouses(this.value)" style="font-size:11px;padding:2px 4px;border:1px solid #2e7d32;border-radius:4px;">';
    html += '<option value="__all__"' + (!filter ? ' selected' : '') + '>All categories</option>';
    cats.forEach(function(c){ html += '<option value="' + escHtml(c) + '"' + (filter === c ? ' selected' : '') + '>' + escHtml(c) + '</option>'; });
    html += '</select></div>';
  }
  houses.forEach(function(h, hi){
    if (filter && (h.category || null) !== filter) return;   // hidden by filter
    var isActive = (hi === activeIdx);
    var borderColor = isActive ? '#2e7d32' : '#a5d6a7';
    var bgColor = isActive ? '#f1f8e9' : '#fff';
    html += '<div style="background:' + bgColor + ';border:2px solid ' + borderColor + ';border-radius:6px;padding:8px;margin-bottom:6px;">';
    // ── Collapse / expand state + summary ──
    var _expKey = person.name + '|' + hi;
    var _exp = !!(window._fsHouseExpanded && window._fsHouseExpanded[_expKey]);
    var _sf = _fsActiveFloor(h);
    var _sFacing = _fsFloorFacing(h, _sf), _sPeriod = _fsFloorPeriod(h, _sf);
    var _sumBits = [];
    if (_sFacing != null) _sumBits.push('Facing ' + _sFacing + '°');
    if (_sPeriod != null) _sumBits.push('Period ' + _sPeriod);
    var _pn = h.personName || person.name;

    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;">';

    // LEFT: ●/○ name ACTIVE [Hide details] summary  ·  then owner name + category
    html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;flex:1 1 auto;">';
    if (isActive) html += '<span style="color:#2e7d32;font-size:22px;line-height:1;" title="Active house">●</span>';
    else html += '<span onclick="fsSetActiveHouse(\'' + escJs(person.name) + '\',' + hi + ')" style="color:#bbb;font-size:22px;line-height:1;cursor:pointer;" title="Set as active house">○</span>';
    html += '<strong style="color:' + (isActive ? '#2e7d32' : '#666') + ';">' + escHtml(h.name) + '</strong>';
    html += '<button onclick="fsToggleHouseDetails(\'' + escJs(person.name) + '\',' + hi + ',this)" style="background:#fff;color:#2e7d32;border:1px solid #2e7d32;border-radius:4px;padding:2px 10px;font-size:10px;font-weight:bold;cursor:pointer;white-space:nowrap;">' + (_exp ? '▾ Hide details' : '▸ Open details') + '</button>';
    if (_sumBits.length) html += '<span style="font-size:11px;color:#777;">' + _sumBits.join(' · ') + '</span>';
    // Category selector — on the same line (the owner name sits on the Facing/Period line inside the house)
    html += '<span style="display:flex;align-items:center;gap:3px;font-size:11px;color:#555;">🏷<select onchange="fsSetHouseCategory(\'' + escJs(person.name) + '\',' + hi + ',this.value)" style="font-size:11px;padding:1px 4px;border:1px solid #c9a84c;border-radius:4px;">';
    html += '<option value=""' + (!h.category ? ' selected' : '') + '>— category —</option>';
    cats.forEach(function(c){ html += '<option value="' + escHtml(c) + '"' + (h.category === c ? ' selected' : '') + '>' + escHtml(c) + '</option>'; });
    html += '<option value="__new__">➕ New…</option>';
    html += '</select></span>';
    html += '</div>';

    // RIGHT (top-right corner): Load · Rename · Delete · Archive
    html += '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:flex-end;flex:0 0 auto;">';
    html += '<button onclick="fsLoadHouse(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#1565c0;color:#fff;border:none;border-radius:3px;padding:3px 8px;font-size:10px;cursor:pointer;" title="Load into FS inputs to edit">📂 Load</button>';
    html += '<button onclick="fsRenameHouse(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#fff;color:#2e7d32;border:1px solid #2e7d32;border-radius:3px;padding:3px 8px;font-size:10px;cursor:pointer;" title="Rename house">✏ Rename</button>';
    html += '<button onclick="fsDeleteHouse(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#c62828;color:#fff;border:none;border-radius:3px;padding:3px 8px;font-size:10px;cursor:pointer;" title="Delete house">🗑</button>';
    // 📁 Archive = the client\'s Google Drive folder (photos, written consultations, etc.)
    if (h.driveUrl){
      html += '<a href="' + escHtml(h.driveUrl) + '" target="_blank" rel="noopener" style="background:#0f9d58;color:#fff;border-radius:3px;padding:3px 8px;font-size:10px;text-decoration:none;" title="Open the Google Drive archive (photos, consultations)">📁 Archive</a>';
      html += '<button onclick="fsEditHouseDrive(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#fff;color:#0f9d58;border:1px solid #0f9d58;border-radius:3px;padding:3px 6px;font-size:10px;cursor:pointer;" title="Edit the archive link">✏</button>';
    } else {
      html += '<button onclick="fsEditHouseDrive(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#fff;color:#0f9d58;border:1px solid #0f9d58;border-radius:3px;padding:3px 8px;font-size:10px;cursor:pointer;" title="Set the Google Drive archive link (photos, consultations)">📁 Archive</button>';
    }
    html += '</div>';

    html += '</div>';
    html += '<div class="fs-house-body" id="fs-house-body-' + hi + '" style="display:' + (_exp ? 'block' : 'none') + ';">';

    // ── Address (left) + Floor selector (right) on one line ──
    var f = _fsActiveFloor(h);
    var fIdx = h.activeFloor || 0; if (fIdx >= h.floors.length) fIdx = 0;
    var effFacing = _fsFloorFacing(h, f);
    var effPeriod = _fsFloorPeriod(h, f);

    html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;margin:2px 0 4px;">';
    // Address (left)
    html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:#555;">';
    html += '<span>📍</span>';
    if (h.address){
      var mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(h.address);
      html += '<span>' + escHtml(h.address) + '</span>';
      html += '<a href="' + mapsUrl + '" target="_blank" rel="noopener" style="background:#1565c0;color:#fff;border-radius:3px;padding:1px 8px;font-size:10px;text-decoration:none;">🗺 Map</a>';
    } else {
      html += '<span style="color:#999;">No address</span>';
    }
    html += '<button onclick="fsEditHouseAddress(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#fff;color:#1565c0;border:1px solid #1565c0;border-radius:3px;padding:1px 8px;font-size:10px;cursor:pointer;">✏ Address</button>';
    html += '</div>';
    // Floor (right) — uses the empty space on the right
    html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;">';
    html += '<span style="font-weight:bold;color:#2e7d32;">🏢 Floor:</span>';
    html += '<select onchange="fsSwitchFloor(\'' + escJs(person.name) + '\',' + hi + ',this.value)" style="font-size:11px;padding:2px 4px;border:1px solid #2e7d32;border-radius:4px;">';
    h.floors.forEach(function(fl, fi){ html += '<option value="' + fi + '"' + (fi === fIdx ? ' selected' : '') + '>' + escHtml(fl.label || ('Floor ' + (fi + 1))) + '</option>'; });
    html += '</select>';
    html += '<button onclick="fsAddFloor(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#2e7d32;color:#fff;border:none;border-radius:3px;padding:2px 9px;font-size:10px;font-weight:bold;cursor:pointer;">+ Add floor</button>';
    html += '<button onclick="fsRenameFloor(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#fff;color:#2e7d32;border:1px solid #2e7d32;border-radius:3px;padding:2px 7px;font-size:10px;cursor:pointer;">✏ Rename</button>';
    if (h.floors.length > 1) html += '<button onclick="fsDeleteFloor(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#fff;color:#c62828;border:1px solid #c62828;border-radius:3px;padding:2px 7px;font-size:10px;cursor:pointer;">🗑</button>';
    html += '</div>';
    html += '</div>';
    // Same Facing / Period toggle
    html += '<label style="display:flex;align-items:center;gap:4px;font-size:10px;color:#555;margin:0 0 4px;cursor:pointer;">';
    html += '<input type="checkbox"' + (h.sameFacing ? ' checked' : '') + ' onchange="fsToggleSameFacing(\'' + escJs(person.name) + '\',' + hi + ',this.checked)"> Same Facing / Period for all floors';
    html += '</label>';

    // ── Guest (occupant #2) — cohabit (owner+guest) or guest-as-#1 (owner away) ──
    if (h.guest && h.guest.name){
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:#1565c0;margin-bottom:4px;padding-left:8px;border-left:2px solid #90caf9;">'
        + '<span>👥 Guest #2: <strong>' + escHtml(h.guest.name) + '</strong></span>'
        + '<span style="color:#888;">🎂 ' + (h.guest.birthDate ? escHtml(h.guest.birthDate) : 'no date') + '</span>'
        + (h.ownerAway ? '<span style="color:#8a6a1f;">· owner #1 hidden</span>' : '')
        + '<select onchange="fsSetGuestAway(\'' + escJs(person.name) + '\',' + hi + ',this.value===\'1\')" style="font-size:10px;padding:1px 4px;border:1px solid #1565c0;border-radius:4px;">'
        +   '<option value="0"' + (!h.ownerAway ? ' selected' : '') + '>Cohabit (owner + guest)</option>'
        +   '<option value="1"' + (h.ownerAway ? ' selected' : '') + '>Guest as #1 (owner away)</option>'
        + '</select>'
        + '<button onclick="fsRemoveGuest(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#fff;color:#c0392b;border:1px solid #e09a9a;border-radius:3px;padding:1px 8px;font-size:10px;cursor:pointer;">🗑 Remove guest</button>'
        + '</div>';
    }

    // House / floor info (owner name on the right)
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px;color:#555;">';
    html += '<span>';
    if (effFacing != null) html += 'Facing: ' + effFacing + '° &nbsp;';
    if (effPeriod != null) html += 'Period: ' + effPeriod;
    if (effFacing == null && effPeriod == null) html += '<span style="color:#e65100;">No facing/period for this floor yet</span>';
    if (!h.sameFacing) html += ' <button onclick="fsEditFloorFacing(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#1565c0;color:#fff;border:none;border-radius:3px;padding:1px 7px;font-size:10px;cursor:pointer;margin-left:4px;">✏ Floor facing/period</button>';
    html += '</span>';
    html += '<span style="white-space:nowrap;color:#444;">👤 <strong>' + escHtml(_pn) + '</strong></span>';
    html += '</div>';

    // ── FLOOR PLAN (📐) — moved DOWN into the bottom "Add" row (see _fpBtns below) ──

    // ── DOORS (🚪) — labeled block only when there are doors ──
    var doors = f.doors;
    if (doors.length){
      html += '<div style="margin-top:6px;padding-left:8px;border-left:2px solid #c9a84c;">';
      html += '<div style="font-size:11px;font-weight:bold;color:#8a6a1f;margin-bottom:3px;">🚪 External Doors</div>';
      doors.forEach(function(d, di){
        var facingStr = d.facing != null ? d.facing + '°' : '—';
        var waterStr  = d.water  != null ? d.water  + '°' : '—';
        html += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">';
        html += '<span style="font-size:11px;">🚪 <strong>' + escHtml(d.name) + '</strong> — Facing: ' + facingStr + ' · Water: ' + waterStr + '</span>';
        html += '<button onclick="fsEditDoor(\'' + escJs(person.name) + '\',' + hi + ',' + di + ')" style="background:#8a6a1f;color:#fff;border:none;border-radius:3px;padding:1px 6px;font-size:10px;cursor:pointer;" title="Edit door">✏</button>';
        html += '<button onclick="fsRemoveDoor(\'' + escJs(person.name) + '\',' + hi + ',' + di + ')" style="background:#e65100;color:#fff;border:none;border-radius:3px;padding:1px 6px;font-size:10px;cursor:pointer;" title="Remove door">✕</button>';
        html += '</div>';
      });
      html += '<button onclick="fsAddDoor(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#c9a84c;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;margin-top:2px;">+ Add External Door</button>';
      html += '</div>';
    }

    // ── STAR WATERS (🐟) — labeled block only when there are aquariums ──
    var hasWaters = !!(f.waters && f.waters.length);
    if (hasWaters){
      html += '<div style="margin-top:4px;padding-left:8px;border-left:2px solid #4db6ac;">';
      html += '<div style="font-size:11px;font-weight:bold;color:#00897b;margin-bottom:3px;">🐟 Star Waters (aquariums)</div>';
      f.waters.forEach(function(w, wi){
        var dirLabel = w.dir ? w.dir : (w.deg != null ? w.deg + '°' : '?');
        var palaceLabel = w.palace ? ' (Palace ' + w.palace + ')' : '';
        html += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">';
        html += '<span style="font-size:11px;">🐟 <strong>' + escHtml(w.name) + '</strong> — ' + dirLabel + palaceLabel + '</span>';
        html += '<button onclick="fsRemoveWater(\'' + escJs(person.name) + '\',' + hi + ',' + wi + ')" style="background:#e65100;color:#fff;border:none;border-radius:3px;padding:1px 6px;font-size:10px;cursor:pointer;" title="Remove this aquarium">✕</button>';
        html += '</div>';
      });
      html += '<button onclick="fsOpenZoneForHouse(\'' + escJs(person.name) + '\',' + hi + ',\'water\')" style="background:#4db6ac;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;margin-top:2px;">💧 Add Water</button>';
      html += '</div>';
    }

    // ── QFS ZONES (🌀) — management lives here in House Profiles; the SCAN runs
    //    from the ⚡ Operative area (zones appear there as tasks). ──
    if (f.zones && f.zones.length){
      var _palDirZ = {1:'N',2:'SW',3:'E',4:'SE',5:'C',6:'NW',7:'W',8:'NE',9:'S'};
      html += '<div style="margin-top:4px;padding-left:8px;border-left:2px solid #7b1fa2;">';
      html += '<div style="font-size:11px;font-weight:bold;color:#7b1fa2;margin-bottom:3px;">🌀 QFS Zones</div>';
      f.zones.forEach(function(z, zi){
        var tl = z.target === 'mountain' ? '山星' : '向星';
        html += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">';
        html += '<span style="font-size:11px;">🌀 <strong>' + escHtml(z.name) + '</strong> — ' + (z.dir || (_palDirZ[z.palace] || '?')) + ' (Palace ' + z.palace + ') · ' + tl + '</span>';
        html += '<button onclick="fsRemoveZone(\'' + escJs(person.name) + '\',' + hi + ',' + zi + ')" style="background:#7b1fa2;color:#fff;border:none;border-radius:3px;padding:1px 6px;font-size:10px;cursor:pointer;" title="Remove zone">✕</button>';
        html += '</div>';
      });
      html += '<button onclick="fsAddZone(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#7b1fa2;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;margin-top:2px;">+ Add Zone</button>';
      html += '</div>';
    }

    // ── Saved settings (Water / Bed / Desk) — names block only when some exist ──
    var _st = f.settings || { water: [], bed: [], desk: [] };
    var _zlbl = { water: '💧 Water', bed: '🛏 Bed', desk: '🪑 Desk' };
    var _anySt = ['water', 'bed', 'desk'].some(function(z){ return (_st[z] || []).length; });
    if (_anySt){
      html += '<div style="margin-top:4px;padding-left:8px;border-left:2px solid #8a6a1f;">';
      html += '<div style="font-size:11px;font-weight:bold;color:#8a6a1f;margin-bottom:3px;">💾 Saved settings (Water / Bed / Desk)</div>';
      ['water', 'bed', 'desk'].forEach(function(z){
        var arr = _st[z] || [];
        if (!arr.length) return;
        var PAL  = ['N','NE','E','SE','S','SW','W','NW'];
        var PALL = {N:'N 坎',NE:'NE 艮',E:'E 震',SE:'SE 巽',S:'S 離',SW:'SW 坤',W:'W 兌',NW:'NW 乾'};
        html += '<div style="font-size:11px;color:#5a4410;padding:1px 0;"><strong>' + _zlbl[z] + ':</strong> ';
        arr.forEach(function(s, sidx){
          var eid    = 'fs-set-edit-' + hi + '-' + z + '-' + sidx;
          var nameId = 'fs-setname-' + hi + '-' + z + '-' + sidx;
          var palId  = 'fs-setpal-'  + hi + '-' + z + '-' + sidx;
          // Clickable chip → toggles the inline view/edit/scan panel below.
          html += '<span onclick="fsToggleSavedEdit(' + hi + ',\'' + z + '\',' + sidx + ')" '
            + 'style="cursor:pointer;color:#1565c0;text-decoration:underline dotted;margin-right:6px;" title="View / edit / scan dates">'
            + '⚙ ' + escHtml(s.name) + (s.palace ? (' (' + escHtml(s.palace) + ')') : '') + '</span>';
          // Inline view/edit panel (hidden until the chip is clicked)
          var ed = '<div id="' + eid + '" style="display:none;margin:4px 0 8px;padding:8px;background:#fff;border:1px solid #c9a84c;border-radius:6px;">';
          ed += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">';
          ed += '<label style="font-size:10px;color:#888;">Name</label>';
          ed += '<input id="' + nameId + '" value="' + escHtml(s.name || '') + '" style="flex:1;min-width:110px;padding:4px 6px;border:1px solid #c9a84c;border-radius:4px;font-size:12px;">';
          if (s.palace){
            ed += '<label style="font-size:10px;color:#888;">Palace</label>';
            ed += '<select id="' + palId + '" style="padding:4px 6px;border:1px solid #00897b;border-radius:4px;font-size:12px;">';
            PAL.forEach(function(p){ ed += '<option value="' + p + '"' + (p === s.palace ? ' selected' : '') + '>' + PALL[p] + '</option>'; });
            ed += '</select>';
          } else {
            var bits = [];
            if (s.houseFacing != null && s.houseFacing !== '') bits.push('Facing ' + s.houseFacing + '°');
            if (s.period      != null && s.period      !== '') bits.push('P' + s.period);
            if (s.doorFacing  != null && s.doorFacing  !== '') bits.push('Door ' + s.doorFacing + '°');
            if (s.water       != null && s.water       !== '') bits.push('Water ' + s.water + '°');
            if (s.bedPalace)  bits.push('Bed ' + s.bedPalace);
            if (s.bedSitting) bits.push('Sit ' + s.bedSitting);
            if (s.deskFacing) bits.push('Desk ' + s.deskFacing + '°');
            if (bits.length) ed += '<span style="font-size:10px;color:#777;">' + bits.join(' · ') + '</span>';
          }
          ed += '</div>';
          ed += '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
          ed += '<button onclick="fsSaveSavedSetting(\'' + escJs(person.name) + '\',' + hi + ',\'' + z + '\',' + sidx + ')" style="background:#2e7d32;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:bold;">✓ Save</button>';
          ed += '<button onclick="fsActivateSavedSetting(\'' + escJs(person.name) + '\',' + hi + ',\'' + z + '\',' + sidx + ')" style="background:#5e35b1;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:bold;">🔎 Scan dates</button>';
          if (!s.palace){
            ed += '<button onclick="fsOpenSavedForEdit(\'' + escJs(person.name) + '\',' + hi + ',\'' + z + '\',' + sidx + ')" style="background:#fff;color:#8a6a1f;border:1px solid #8a6a1f;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:bold;">✏️ Open to edit</button>';
          }
          ed += '<button onclick="fsDeleteSavedSetting(\'' + escJs(person.name) + '\',' + hi + ',\'' + z + '\',' + sidx + ')" style="background:#fff;color:#c0392b;border:1px solid #e09a9a;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:bold;">🗑 Remove</button>';
          ed += '</div></div>';
          html += ed;
        });
        html += '</div>';
      });
      html += '</div>';
    }

    // ── Bottom "Add" row: empty sections collapse to horizontal Add buttons here
    //    (no point in a full vertical block when there is nothing inside). ──
    var _addBtns = '';
    if (!doors.length) _addBtns += '<button onclick="fsAddDoor(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#c9a84c;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;">+ Add External Door</button>';
    if (!hasWaters)    _addBtns += '<button onclick="fsOpenZoneForHouse(\'' + escJs(person.name) + '\',' + hi + ',\'water\')" style="background:#4db6ac;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;">💧 Add Water</button>';
    _addBtns += '<button onclick="fsOpenZoneForHouse(\'' + escJs(person.name) + '\',' + hi + ',\'bed\')" style="background:#8a6a1f;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;">🛏 Add Bed</button>';
    _addBtns += '<button onclick="fsOpenZoneForHouse(\'' + escJs(person.name) + '\',' + hi + ',\'desk\')" style="background:#8a6a1f;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;">🪑 Add Desk</button>';
    if (!(f.zones && f.zones.length)) _addBtns += '<button onclick="fsAddZone(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#7b1fa2;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;">🌀 Add Zone</button>';
    // "+ Add a new guest" — pushed to the RIGHT and visually separated from the
    // placement "Add" buttons (it's a different kind of action).
    if (!(h.guest && h.guest.name)) _addBtns += '<button onclick="fsAddGuest(\'' + escJs(person.name) + '\',' + hi + ')" title="Invite a guest as occupant #2 (considered in every scan, like Person B)" style="margin-left:auto;background:#0d47a1;color:#fff;border:1px solid #82b1ff;border-radius:4px;padding:3px 12px;font-size:10px;font-weight:bold;cursor:pointer;box-shadow:0 1px 3px rgba(13,71,161,.3);">👥 Add a new guest</button>';
    // Floor plan button(s) — leftmost in the bottom row, before the Add buttons.
    var _fpBtns;
    if (f && f.floorplan && f.floorplan.imgData){
      _fpBtns = '<button onclick="fsHouseImportFloorplan(\'' + escJs(person.name) + '\',' + hi + ')" title="Open / edit the saved floor plan" style="background:#5d4037;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;">📐 Floor plan ✓</button>'
        + '<button onclick="fsHouseRemoveFloorplan(\'' + escJs(person.name) + '\',' + hi + ')" title="Remove floor plan" style="background:#fff;color:#c62828;border:1px solid #c62828;border-radius:4px;padding:3px 8px;font-size:10px;cursor:pointer;">🗑</button>';
    } else {
      _fpBtns = '<button onclick="fsHouseImportFloorplan(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#5d4037;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;cursor:pointer;">📐 Import a floorplan</button>';
    }
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;">'
      + '<span style="font-size:10px;color:#999;">Add:</span>' + _fpBtns + _addBtns + '</div>';

    html += '</div>'; // close .fs-house-body (collapsible)
    html += '</div>';
  });
  list.innerHTML = html;
}

// Toggle a house card's detail body. Default is collapsed; state is kept in
// memory so it survives the frequent re-renders of the house list.
function fsToggleHouseDetails(personName, hi, btn){
  try {
    if (!window._fsHouseExpanded) window._fsHouseExpanded = {};
    var key = personName + '|' + hi;
    var body = document.getElementById('fs-house-body-' + hi);
    if (!body) return;
    var isHidden = (body.style.display === 'none' || body.style.display === '');
    if (isHidden){
      body.style.display = 'block';
      window._fsHouseExpanded[key] = true;
      if (btn) btn.innerHTML = '▾ Hide details';
    } else {
      body.style.display = 'none';
      window._fsHouseExpanded[key] = false;
      if (btn) btn.innerHTML = '▸ Open details';
    }
  } catch(e){ console.warn('fsToggleHouseDetails', e); }
}

/** Header "+ Add a new house": create a house, optionally importing the
 *  current Main-Luopan consultation (House Facing / Period / door) as its data. */
function fsAddNewHouse(){
  var person = fsGetActivePersonForHouse();
  if (!person){ alert('Load a person (A or B) first.'); return; }
  var name = prompt('Name of the new house (e.g. "Vienna apartment"):');
  if (name === null || !name.trim()) return;
  name = name.trim();

  var hf = parseFloat((document.getElementById('fs-house-facing') || {}).value);
  var pd = parseInt((document.getElementById('fs-period') || {}).value, 10);
  var df = parseFloat((document.getElementById('fs-facing') || {}).value);
  var wt = parseFloat((document.getElementById('fs-water') || {}).value);
  var hasConsult = !isNaN(hf) || !isNaN(pd) || !isNaN(df);

  var importIt = false;
  if (hasConsult){
    importIt = confirm('Import the current Main Luopan consultation into "' + name + '"?\n\n'
      + 'Facing: ' + (isNaN(hf) ? '—' : hf + '\u00b0') + '   Period: ' + (isNaN(pd) ? '—' : pd)
      + (isNaN(df) ? '' : '   Door: ' + df + '\u00b0')
      + '\n\nOK = import these as the house\u2019s facing/period.\nCancel = start an empty house and fill it in yourself.');
  }
  var facing = (importIt && !isNaN(hf)) ? hf : null;
  var period = (importIt && !isNaN(pd)) ? pd : null;
  var doors = [];
  if (importIt && !isNaN(df)) doors.push({ name: 'Main door', facing: df, water: (!isNaN(wt) ? wt : null) });

  var house = {
    name: name, sameFacing: true, houseFacing: facing, period: period,
    floors: [{ label: 'Floor 1', facing: facing, period: period, doors: doors, waters: [], zones: [], settings: { water: [], bed: [], desk: [] } }],
    activeFloor: 0
  };
  // ── Owner (intestatario #1) ───────────────────────────────────────────
  // Person A's current data (the usual owner). If the entered owner matches
  // Person A we reuse their birth data; otherwise we ask for it and save them.
  var pAName = ((document.getElementById('person-name') || {}).value || '').trim();
  var pADate = ((document.getElementById('person-date') || {}).value || '').trim();
  var pATime = ((document.getElementById('person-time') || {}).value || '').trim();

  var owner = prompt('Who is this house registered to?  (owner — occupant #1)', pAName || '');
  if (owner === null) return;
  owner = owner.trim();
  if (!owner){ alert('An owner name is required.'); return; }

  var oDate, oTime;
  if (pAName && owner.toLowerCase() === pAName.toLowerCase() && pADate){
    oDate = pADate; oTime = pATime || '';
  } else {
    oDate = prompt('Birth date of ' + owner + '  (YYYY-MM-DD):', '');
    if (oDate === null) return;
    oDate = oDate.trim();
    if (oDate && !/^\d{4}-\d{2}-\d{2}$/.test(oDate)){ alert('Please use the format YYYY-MM-DD.'); return; }
    oTime = prompt('Birth time of ' + owner + '  (HH:MM — leave blank if unknown):', '12:00');
    if (oTime === null) oTime = '';
    oTime = oTime.trim();
  }

  house.personName = owner;
  house.birthDate  = oDate || null;
  house.birthTime  = oTime || null;

  // The house belongs to its owner → store it under the owner's key, so it
  // shows in that person's House Profiles once they become Person A.
  var all = _fsHousesLoad();
  if (!all[owner]) all[owner] = [];
  var newIdx = all[owner].length;
  all[owner].push(house);
  _fsHousesSave(all);
  _fsUpsertPersonDB(house.personName, house.birthDate, house.birthTime, house.category, false);   // unify owner into people DB
  _fsActiveHouseSet(owner, newIdx);     // new house becomes active
  // Make the settings sections target the new house by default
  window._fsSettingHouseIdx = newIdx; window._fsSettingFloorIdx = null;
  // Bring the owner into Person A (and load the chart if we imported one).
  if (importIt) fsLoadHouse(owner, newIdx);
  else _fsLoadOwnerIntoPersonA(house);
  fsRenderHouseProfiles();
  if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
}

// ── House categories (free, user-defined) + address ──────────────
function _fsCatsLoad(){ try { var c = JSON.parse(localStorage.getItem('xkdg_house_categories') || 'null'); return (Array.isArray(c) && c.length) ? c : ['Mine', 'Students', 'Clients', 'Friends']; } catch(e){ return ['Mine', 'Students', 'Clients', 'Friends']; } }
function _fsCatsSave(arr){ try { localStorage.setItem('xkdg_house_categories', JSON.stringify(arr)); } catch(e){} }

function fsSetHouseCategory(personName, houseIdx, val){
  try {
    if (val === '__new__'){
      var nc = prompt('New category (e.g. "My clients", "My students"):');
      if (!nc || !nc.trim()){ fsRenderHouseProfiles(); return; }
      nc = nc.trim();
      var cats = _fsCatsLoad();
      if (cats.indexOf(nc) < 0){ cats.push(nc); _fsCatsSave(cats); }
      val = nc;
    }
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    h.category = (val === '' ? null : val);
    _fsHousesSave(all);
    if (h.personName) _fsUpsertPersonDB(h.personName, h.birthDate, h.birthTime, h.category, false);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsSetHouseCategory', e); }
}
function fsEditHouseAddress(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    var a = prompt('Address of this house (street, city, country):', h.address || '');
    if (a === null) return;
    h.address = a.trim() ? a.trim() : null;
    _fsHousesSave(all);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsEditHouseAddress', e); }
}

function fsEditHouseDrive(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    var u = prompt('Google Drive folder link for this client\n(open the folder in Drive → Share → Copy link, then paste here):', h.driveUrl || '');
    if (u === null) return;
    u = u.trim();
    if (u && !/^https?:\/\//i.test(u)){ alert('Please paste a full link starting with http:// or https://'); return; }
    h.driveUrl = u || null;
    _fsHousesSave(all);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsEditHouseDrive', e); }
}
function fsFilterHouses(val){
  window._fsHouseFilter = (val === '__all__' ? null : val);
  fsRenderHouseProfiles();
}

// ── House ↔ Person (name + birth date) unification ───────────────
/** Read the loaded person's name + birth date/time from Person A/B inputs. */
function _fsActivePersonData(){
  var p = fsGetActivePersonForHouse();
  if (!p) return null;
  var dEl = document.getElementById(p.who === 'B' ? 'person-date-b' : 'person-date');
  var tEl = document.getElementById(p.who === 'B' ? 'person-time-b' : 'person-time');
  var d = ((dEl && dEl.value) || '').trim();
  if (!d && p.who === 'B'){ var yEl = document.getElementById('person-year-b'); d = ((yEl && yEl.value) || '').trim(); }
  var t = ((tEl && tEl.value) || '').trim();
  return { name: p.name, who: p.who, birthDate: d, birthTime: t };
}

/** Non-destructive upsert of a house owner into the people DB
 *  (xkdg_persons_a / _b), adding a `category` tag — to unify house owners
 *  with the saved-people archive. `force` overwrites an existing birth date. */
function _fsUpsertPersonDB(name, birthDate, birthTime, category, force){
  if (!name) return;
  try {
    var A = JSON.parse(localStorage.getItem('xkdg_persons_a') || '{}');
    var B = JSON.parse(localStorage.getItem('xkdg_persons_b') || '{}');
    var key, arch;
    if (B[name] && !A[name]) { key = 'xkdg_persons_b'; arch = B; } else { key = 'xkdg_persons_a'; arch = A; }
    var rec = arch[name] || {};
    if (birthDate) rec.date = force ? birthDate : (rec.date || birthDate);
    if (birthTime && !rec.time) rec.time = birthTime;
    if (!rec.time) rec.time = '12:00';
    if (category) rec.category = category;
    if (!rec.savedAt) rec.savedAt = Date.now();
    arch[name] = rec;
    localStorage.setItem(key, JSON.stringify(arch));
  } catch(e){ console.warn('upsert person DB', e); }
}
/** Sync: pull name/birth from Person A/B into the house; and if a Person A/B
 *  field is empty, push the house value back into it (transfer to the person DB). */
function fsSyncHousePerson(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    if (!h.personName) h.personName = personName;
    var pd = _fsActivePersonData();
    if (pd){
      if (pd.name) h.personName = pd.name;
      if (pd.birthDate) h.birthDate = pd.birthDate;
      if (pd.birthTime) h.birthTime = pd.birthTime;
      var nameEl = document.getElementById(pd.who === 'B' ? 'person-name-b' : 'person-name');
      var dateEl = document.getElementById(pd.who === 'B' ? 'person-date-b' : 'person-date');
      var timeEl = document.getElementById(pd.who === 'B' ? 'person-time-b' : 'person-time');
      if (nameEl && !nameEl.value && h.personName) nameEl.value = h.personName;
      if (dateEl && !dateEl.value && h.birthDate) dateEl.value = h.birthDate;
      if (timeEl && !timeEl.value && h.birthTime) timeEl.value = h.birthTime;
    }
    _fsHousesSave(all);
    if (h.personName) _fsUpsertPersonDB(h.personName, h.birthDate, h.birthTime, h.category, true);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsSyncHousePerson', e); }
}
/** Manually edit the house's person name + birth date (and push to an empty Person A/B). */
function fsEditHousePerson(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    var nm = prompt('Person name for this house:', h.personName || personName || '');
    if (nm === null) return;
    var bd = prompt('Birth date (e.g. 1985-07-23):', h.birthDate || '');
    if (bd === null) return;
    h.personName = nm.trim() || h.personName || personName;
    h.birthDate  = bd.trim() ? bd.trim() : null;
    _fsHousesSave(all);
    if (h.personName) _fsUpsertPersonDB(h.personName, h.birthDate, h.birthTime, h.category, true);
    var p = fsGetActivePersonForHouse();
    if (p){
      var nameEl = document.getElementById(p.who === 'B' ? 'person-name-b' : 'person-name');
      var dateEl = document.getElementById(p.who === 'B' ? 'person-date-b' : 'person-date');
      if (nameEl && !nameEl.value && h.personName) nameEl.value = h.personName;
      if (dateEl && !dateEl.value && h.birthDate) dateEl.value = h.birthDate;
    }
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsEditHousePerson', e); }
}

function fsSaveHouse(){
  const person = fsGetActivePersonForHouse();
  if (!person){ alert('Load a person (A or B) first.'); return; }

  const hfVal     = (document.getElementById('fs-house-facing') || {}).value || '';
  const perVal    = (document.getElementById('fs-period') || {}).value || '';
  const facingVal = (document.getElementById('fs-facing') || {}).value || '';
  const xkdgWVal  = (document.getElementById('fs-water') || {}).value || '';

  if (!hfVal && !facingVal){ alert('Enter at least a House Facing or a Door Facing first.'); return; }

  var all = _fsHousesLoad();
  var houses = all[person.name] || [];

  // No house yet for this person → create a new one (same as "+ Add a new house").
  if (!houses.length){ fsAddNewHouse(); return; }

  // Otherwise ask WHICH house (or a new one) to save this chart into.
  var lines = ['Save this chart into which house?', '', '0 = \u2795 New house'];
  houses.forEach(function(h, i){ lines.push((i + 1) + ' = ' + h.name); });
  var pick = prompt(lines.join('\n'), '1');
  if (pick === null) return;
  pick = parseInt(pick, 10);
  if (isNaN(pick)){ alert('Please type a number.'); return; }
  if (pick === 0){ fsAddNewHouse(); return; }
  var hIdx = pick - 1;
  if (hIdx < 0 || hIdx >= houses.length){ alert('Invalid choice.'); return; }
  var h = houses[hIdx];

  // Which floor?
  _fsActiveFloor(h);                                       // ensure floors[]
  var fIdx = (h.activeFloor || 0);
  if (h.floors.length > 1){
    var flines = ['Into which floor of "' + h.name + '"?'];
    h.floors.forEach(function(fl, i){ flines.push((i + 1) + ' = ' + (fl.label || ('Floor ' + (i + 1)))); });
    var fp = prompt(flines.join('\n'), String(fIdx + 1));
    if (fp === null) return;
    fp = parseInt(fp, 10);
    if (isNaN(fp) || fp < 1 || fp > h.floors.length){ alert('Invalid floor.'); return; }
    fIdx = fp - 1;
  }
  var floor = h.floors[fIdx];

  // Write the chart (facing / period / main door) into the chosen floor.
  var facingNum = hfVal  ? parseFloat(hfVal) : null;
  var periodNum = perVal ? parseInt(perVal, 10) : null;
  if (h.sameFacing){
    if (facingNum != null) h.houseFacing = facingNum;     // shared across floors
    if (periodNum != null) h.period = periodNum;
  }
  if (facingNum != null) floor.facing = facingNum;
  if (periodNum != null) floor.period = periodNum;
  if (facingVal){
    var door = { name: 'Main door', facing: parseFloat(facingVal), water: (xkdgWVal ? parseFloat(xkdgWVal) : null) };
    if (!floor.doors) floor.doors = [];
    if (floor.doors.length) floor.doors[0] = door; else floor.doors.push(door);
  }
  h.activeFloor = fIdx;
  _fsHousesSave(all);
  _fsActiveHouseSet(person.name, hIdx);
  window._fsSettingHouseIdx = hIdx; window._fsSettingFloorIdx = fIdx;
  fsRenderHouseProfiles();
  if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
  alert('Chart saved into "' + h.name + '" \u00b7 ' + (floor.label || ('Floor ' + (fIdx + 1))) + '.');
}

function fsRenameHouse(personName, houseIdx){
  try {
    var all = _fsHousesLoad();
    var h = all[personName] && all[personName][houseIdx]; if (!h) return;
    var nm = prompt('Rename house:', h.name || '');
    if (nm === null || !nm.trim()) return;
    h.name = nm.trim();
    _fsHousesSave(all);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsRenameHouse', e); }
}

// Load a house's active occupants into the global Person A (+ Person B) inputs and
// recalculate, so every date / Feng Shui scan automatically uses them:
//   • owner (#1) → Person A   (unless ownerAway → owner hidden, not scanned)
//   • guest (#2) → Person B   (cohabit). If only one active occupant → B cleared.
// Guarded so it does nothing when already loaded and cannot re-enter itself.
function _fsLoadHouseOccupants(house){
  try {
    if (!house || window._fsLoadingOwner) return;
    var occ = [];
    if (!house.ownerAway && (house.personName || house.birthDate)){
      occ.push({ name: (house.personName||''), date: (house.birthDate||''), time: (house.birthTime||'') });
    }
    if (house.guest && (house.guest.name || house.guest.birthDate)){
      occ.push({ name: (house.guest.name||''), date: (house.guest.birthDate||''), time: (house.guest.birthTime||'') });
    }
    if (!occ.length) return;
    window._fsLoadingOwner = true;
    try {
      // Person A = first active occupant
      var a = occ[0];
      var nA = document.getElementById('person-name'), dA = document.getElementById('person-date'), tA = document.getElementById('person-time');
      if (nA && dA){
        var sameA = ((nA.value||'').trim().toLowerCase() === a.name.trim().toLowerCase()) && ((dA.value||'').trim() === a.date.trim());
        if (!sameA){
          if (a.name) nA.value = a.name;
          if (a.date) dA.value = a.date;
          if (tA && a.time) tA.value = a.time;
          if (a.date && typeof calculatePerson === 'function') calculatePerson('A');
        }
      }
      // Person B = second active occupant; otherwise clear B.
      if (occ.length >= 2){
        var b = occ[1];
        var nB = document.getElementById('person-name-b'), dB = document.getElementById('person-date-b'), tB = document.getElementById('person-time-b');
        if (nB && dB){
          var sameB = ((nB.value||'').trim().toLowerCase() === b.name.trim().toLowerCase()) && ((dB.value||'').trim() === b.date.trim());
          if (!sameB){
            if (b.name) nB.value = b.name;
            if (b.date) dB.value = b.date;
            if (tB && b.time) tB.value = b.time;
            if (b.date && typeof calculatePerson === 'function') calculatePerson('B');
          }
        }
      } else {
        if (typeof fsClearPersonB === 'function') fsClearPersonB();
      }
    } finally { window._fsLoadingOwner = false; }
  } catch(e){ window._fsLoadingOwner = false; console.warn('_fsLoadHouseOccupants', e); }
}
// Back-compat name used by existing callers.
function _fsLoadOwnerIntoPersonA(house){ return _fsLoadHouseOccupants(house); }

// ── Guest (intestatario #2) ──────────────────────────────────────────────
// Default relationship is "cohabit": owner #1 → Person A, guest #2 → Person B,
// so every Feng Shui / date scan considers both (exactly like A + B).
function fsAddGuest(personName, hi){
  try {
    var all = _fsHousesLoad();
    var house = (all[personName] || [])[hi]; if (!house) return;
    var name = prompt('Guest name (occupant #2 — invited to stay):', '');
    if (name === null || !name.trim()) return;
    name = name.trim();
    var date = prompt('Birth date of ' + name + '  (YYYY-MM-DD):', '');
    if (date === null) return;
    date = date.trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)){ alert('Please use the format YYYY-MM-DD.'); return; }
    var time = prompt('Birth time of ' + name + '  (HH:MM — leave blank if unknown):', '12:00');
    if (time === null) time = '';
    time = time.trim();
    house.guest = { name: name, birthDate: date || null, birthTime: time || null };
    house.ownerAway = false;   // cohabit by default
    _fsHousesSave(all);
    _fsUpsertPersonDB(name, date, time, house.category, false);
    _fsLoadHouseOccupants(house);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsAddGuest', e); }
}

// away=true → guest acts as #1, owner hidden from scans (kept, recoverable).
// away=false → cohabit (owner #1 + guest #2 both scanned).
function fsSetGuestAway(personName, hi, away){
  try {
    var all = _fsHousesLoad();
    var house = (all[personName] || [])[hi]; if (!house) return;
    house.ownerAway = !!away;
    _fsHousesSave(all);
    _fsLoadHouseOccupants(house);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsSetGuestAway', e); }
}

function fsRemoveGuest(personName, hi){
  try {
    var all = _fsHousesLoad();
    var house = (all[personName] || [])[hi]; if (!house) return;
    if (!house.guest) return;
    if (!confirm('Remove guest "' + (house.guest.name || '') + '" from this house?')) return;
    delete house.guest;
    house.ownerAway = false;
    _fsHousesSave(all);
    _fsLoadHouseOccupants(house);
    fsRenderHouseProfiles();
  } catch(e){ console.warn('fsRemoveGuest', e); }
}

function fsLoadHouse(personName, houseIdx){
  const all = _fsHousesLoad();
  const houses = all[personName] || [];
  const h = houses[houseIdx];
  if (!h) return;

  var f = _fsActiveFloor(h);
  var effFacing = _fsFloorFacing(h, f);
  var effPeriod = _fsFloorPeriod(h, f);

  // Load (effective) House Facing + Period
  if (effFacing != null){ const el = document.getElementById('fs-house-facing'); if (el){ el.value = effFacing; } }
  if (effPeriod != null){ const el = document.getElementById('fs-period');       if (el){ el.value = effPeriod; } }
  // Load active floor's first door Facing + Water into Luopan inputs
  var doors = f.doors || [];
  if (doors.length > 0){
    var d0 = doors[0];
    if (d0.facing != null){ const el = document.getElementById('fs-facing'); if (el){ el.value = d0.facing; } }
    if (d0.water != null){ const el = document.getElementById('fs-water'); if (el){ el.value = d0.water; } }
  }
  // Restore this house/floor's hand-composed manual chart (or clear if none).
  _fsRestoreManualChartForHouse(f);
  // Turn on Flying Stars if facing+period are available
  if (effFacing != null && effPeriod != null && !FS_STARS_ON){
    fsToggleStars();
  }
  // Auto-insert this house's owner (intestatario #1) into Person A.
  _fsLoadOwnerIntoPersonA(h);
  fsRedraw();
}

/** Auto-load active house profile for the given person name.
 *  Called when a person is loaded or toggled ON. */
function fsAutoLoadHouse(personName){
  if (!personName) return;
  var all = _fsHousesLoad();
  var houses = all[personName] || [];
  if (houses.length > 0){
    var activeIdx = _fsActiveHouseGet(personName);
    if (activeIdx >= houses.length) activeIdx = 0;
    fsLoadHouse(personName, activeIdx);
  }
  if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles();
}

/** Clear Luopan FS inputs (called when a person is toggled OFF). */
function fsClearHouseInputs(){
  var ids = ['fs-house-facing', 'fs-period', 'fs-facing', 'fs-water'];
  ids.forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (typeof fsRedraw === 'function') fsRedraw();
}

function fsDeleteHouse(personName, houseIdx){
  if (!confirm('Delete this house profile?')) return;
  const all = _fsHousesLoad();
  if (!all[personName]) return;
  all[personName].splice(houseIdx, 1);
  if (!all[personName].length) delete all[personName];
  _fsHousesSave(all);
  // Adjust active index
  var activeIdx = _fsActiveHouseGet(personName);
  var remaining = (all[personName] || []).length;
  if (remaining === 0) { _fsActiveHouseSet(personName, 0); fsClearHouseInputs(); }
  else if (houseIdx === activeIdx) { _fsActiveHouseSet(personName, 0); fsLoadHouse(personName, 0); }
  else if (houseIdx < activeIdx) { _fsActiveHouseSet(personName, activeIdx - 1); }
  fsRenderHouseProfiles();
}

// ── DOOR CRUD ───────────────────────────────────────────────────

function fsAddDoor(personName, houseIdx){
  var dName = prompt('Name for this EXTERNAL door / facade\n(e.g. "Garage door", "South facade"):');
  if (!dName || !dName.trim()) return;
  var facingStr = prompt('XKDG Facing degree (°) for this door:');
  if (!facingStr) return;
  var facing = parseFloat(facingStr);
  if (isNaN(facing)){ alert('Invalid degree.'); return; }
  var waterStr = prompt('XKDG Water degree (°) for this door\n(leave empty if none):');
  var water = (waterStr && waterStr.trim()) ? parseFloat(waterStr) : null;
  if (water !== null && isNaN(water)){ alert('Invalid water degree.'); return; }

  var all = _fsHousesLoad();
  if (!all[personName] || !all[personName][houseIdx]) return;
  var _f = _fsActiveFloor(all[personName][houseIdx]);
  _f.doors.push({ name: dName.trim(), facing: facing, water: water });
  _fsHousesSave(all);
  fsRenderHouseProfiles();
}

function fsEditDoor(personName, houseIdx, doorIdx){
  var all = _fsHousesLoad();
  if (!all[personName] || !all[personName][houseIdx]) return;
  var doors = _fsActiveFloor(all[personName][houseIdx]).doors;
  var d = doors[doorIdx];
  if (!d) return;

  var newName = prompt('Door name:', d.name);
  if (newName === null) return;  // cancelled
  var facingStr = prompt('XKDG Facing degree (°):', d.facing != null ? String(d.facing) : '');
  if (facingStr === null) return;
  var waterStr = prompt('XKDG Water degree (°) (leave empty if none):', d.water != null ? String(d.water) : '');
  if (waterStr === null) return;

  var facing = facingStr.trim() ? parseFloat(facingStr) : null;
  var water  = waterStr.trim()  ? parseFloat(waterStr)  : null;
  if (facing !== null && isNaN(facing)){ alert('Invalid facing degree.'); return; }
  if (water  !== null && isNaN(water)){ alert('Invalid water degree.'); return; }

  d.name   = (newName && newName.trim()) ? newName.trim() : d.name;
  d.facing = facing;
  d.water  = water;
  _fsHousesSave(all);
  fsRenderHouseProfiles();
}

function fsRemoveDoor(personName, houseIdx, doorIdx){
  if (!confirm('Remove this door?')) return;
  var all = _fsHousesLoad();
  if (!all[personName] || !all[personName][houseIdx]) return;
  var doors = _fsActiveFloor(all[personName][houseIdx]).doors;
  doors.splice(doorIdx, 1);
  _fsHousesSave(all);
  fsRenderHouseProfiles();
}

// ── STAR WATER (🐟) CRUD — unchanged logic ─────────────────────

// Direction → Flying Stars palace mapping
var _fsDirToPalace = { 'S':9, 'SW':2, 'W':7, 'NW':6, 'N':1, 'NE':8, 'E':3, 'SE':4 };
var _fsPalaceToDir = { 9:'S', 2:'SW', 7:'W', 6:'NW', 1:'N', 8:'NE', 3:'E', 4:'SE' };

function fsAddWaterToHouse(personName, houseIdx){
  const wName = prompt('Name for this aquarium / water feature\n(e.g. "Living room aquarium"):');
  if (!wName || !wName.trim()) return;
  const dirStr = prompt('Direction of the aquarium:\nN, NE, E, SE, S, SW, W, NW');
  if (!dirStr) return;
  const dir = dirStr.trim().toUpperCase();
  const palace = _fsDirToPalace[dir];
  if (!palace) { alert('Invalid direction. Use: N, NE, E, SE, S, SW, W, NW'); return; }
  const all = _fsHousesLoad();
  if (!all[personName] || !all[personName][houseIdx]) return;
  _fsActiveFloor(all[personName][houseIdx]).waters.push({ name: wName.trim(), dir: dir, palace: palace });
  _fsHousesSave(all);
  fsRenderHouseProfiles();
}

function fsRemoveWater(personName, houseIdx, waterIdx){
  if (!confirm('Remove this aquarium?')) return;
  const all = _fsHousesLoad();
  if (!all[personName] || !all[personName][houseIdx]) return;
  _fsActiveFloor(all[personName][houseIdx]).waters.splice(waterIdx, 1);
  _fsHousesSave(all);
  fsRenderHouseProfiles();
}

// ── QFS ZONE CRUD ───────────────────────────────────────────────

// ── ⚡ OPERATIVE: QFS Zones panel (relocated from House Profiles) ──
// Operates on the ACTIVE house's ACTIVE floor; reuses fsAddZone/fsRemoveZone.
function fsRenderOperativeZones(){
  var box = document.getElementById('fs-op-zones');
  if (!box) return;
  var header = '<div style="font-size:12px;font-weight:bold;color:#7b1fa2;margin-bottom:3px;">🌀 QFS Zones (Qimen × Flying Stars)</div>'
    + '<div style="font-size:10px;color:#888;margin-bottom:6px;font-style:italic;">A saved target for the Qimen × Flying-Stars scan: a direction + which flying star to activate there (Water 向星 for aquariums, Mountain 山星 for still features).</div>';
  var person = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
  if (!person){
    box.innerHTML = header + '<div style="font-size:11px;color:#999;">Load a person and pick an active house in House Profiles above to manage its QFS zones.</div>';
    return;
  }
  var all = _fsHousesLoad();
  var houses = all[person.name] || [];
  if (!houses.length){
    box.innerHTML = header + '<div style="font-size:11px;color:#999;">No houses yet — add one in House Profiles above.</div>';
    return;
  }
  var hi = _fsActiveHouseGet(person.name); if (hi >= houses.length) hi = 0;
  var house = houses[hi];
  var floor = _fsActiveFloor(house);
  var zones = floor.zones || [];
  var escHtml = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); };
  var escJs   = function(s){ return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); };
  var _palDir = {1:'N',2:'SW',3:'E',4:'SE',5:'C',6:'NW',7:'W',8:'NE',9:'S'};
  var html = header;
  html += '<div style="font-size:11px;color:#555;margin-bottom:6px;">House: <strong>' + escHtml(house.name) + '</strong> · Floor: <strong>' + escHtml(floor.label || 'Floor 1') + '</strong></div>';
  if (zones.length){
    zones.forEach(function(z, zi){
      var targetLabel = z.target === 'water' ? 'Water \u2605' : 'Mountain \u2605';
      var presetLabel = (z.preset === 'custom') ? ' \u00b7 custom preset' : ' \u00b7 auto preset';
      html += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">';
      html += '<span style="font-size:11px;flex:1 1 auto;">\uD83C\uDF00 <strong>' + escHtml(z.name) + '</strong> \u2014 ' + (z.dir || (_palDir[z.palace] || '?')) + ' (Palace ' + z.palace + ') \u00b7 ' + targetLabel + presetLabel + '</span>';
      html += '<button onclick="fsQimenStimulate(\'' + (z.target === 'mountain' ? 'mountain' : 'water') + '\')" style="background:#fff;color:#7b1fa2;border:1px solid #7b1fa2;border-radius:4px;padding:2px 10px;font-size:10px;font-weight:bold;cursor:pointer;white-space:nowrap;" title="Qimen targeting for this zone">\uD83C\uDF00 Qimen</button>';
      html += '<button onclick="fsRemoveZone(\'' + escJs(person.name) + '\',' + hi + ',' + zi + ')" style="background:#7b1fa2;color:#fff;border:none;border-radius:3px;padding:1px 6px;font-size:10px;cursor:pointer;" title="Remove zone">\u2715</button>';
      html += '</div>';
    });
  } else {
    html += '<div style="font-size:11px;color:#999;padding:2px 0;">No zones yet</div>';
  }
  html += '<button onclick="fsAddZone(\'' + escJs(person.name) + '\',' + hi + ')" style="background:#7b1fa2;color:#fff;border:none;border-radius:4px;padding:4px 12px;font-size:11px;font-weight:bold;cursor:pointer;margin-top:6px;">+ Add Zone</button>';
  box.innerHTML = html;
}

// ── ⚡ OPERATIVE: Placed elements (saved Water / Bed / Desk) of the ACTIVE house ──
// Each has an ⚡ Activate button that opens its tool pre-loaded, ready to scan.
function fsRenderOperativeElements(){
  var box = document.getElementById('fs-op-elements');
  if (!box) return;
  var header = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">'
    + '<span style="font-size:12px;font-weight:bold;color:#4527a0;">⚡ Placed elements</span>'
    + '<button onclick="fsQimenStimulate(null)" style="background:#fff;color:#5e35b1;border:1px solid #5e35b1;border-radius:4px;padding:2px 10px;font-size:10px;font-weight:bold;cursor:pointer;" title="Qimen targeting on the general flying-star chart (free choice of star)">\uD83C\uDF00 Qimen (general)</button>'
    + '</div>'
    + '<div style="font-size:10px;color:#888;margin-bottom:6px;font-style:italic;">Placements of the active house. <strong>\u26A1 Activate</strong> opens the tool ready to scan dates. <strong>\uD83C\uDF00 Qimen</strong> finds hours to stimulate the flying star (Water \u2192 \u5411\u661f, Bed \u2192 \u5C71\u661f, others \u2192 free).</div>';
  var person = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
  if (!person){ box.innerHTML = header + '<div style="font-size:11px;color:#999;">Load a person and pick an active house above.</div>'; return; }
  var all = _fsHousesLoad();
  var houses = all[person.name] || [];
  if (!houses.length){ box.innerHTML = header + '<div style="font-size:11px;color:#999;">No houses yet \u2014 add one in House Profiles above.</div>'; return; }
  var hi = _fsActiveHouseGet(person.name); if (hi >= houses.length) hi = 0;
  var house = houses[hi];
  var floor = _fsActiveFloor(house);
  var fIdx = house.activeFloor || 0; if (fIdx >= house.floors.length) fIdx = 0;
  var st = floor.settings || { water: [], bed: [], desk: [] };
  var escHtml = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); };
  var escJs   = function(s){ return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); };
  var ICON = { water: '\uD83D\uDCA7', bed: '\uD83D\uDECF', desk: '\uD83E\uDE91' };
  var ZLBL = { water: 'Water', bed: 'Bed', desk: 'Desk' };
  var QLOCK = { water: 'water', bed: 'mountain', desk: null };   // forced target star per type
  var QBTN = 'background:#fff;color:#5e35b1;border:1px solid #5e35b1;border-radius:4px;padding:3px 10px;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;';
  var ABTN = 'background:#5e35b1;color:#fff;border:none;border-radius:4px;padding:3px 12px;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;';
  var html = header;
  html += '<div style="font-size:11px;color:#555;margin-bottom:6px;">House: <strong>' + escHtml(house.name) + '</strong> \u00b7 Floor: <strong>' + escHtml(floor.label || 'Floor 1') + '</strong></div>';
  var any = false;

  // Doors (free choice) — Qimen only; doors have no date-Activate.
  var fdoors = floor.doors || [];
  fdoors.forEach(function(dr){
    any = true;
    html += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">';
    html += '<span style="font-size:11px;flex:1 1 auto;">\uD83D\uDEAA <strong>' + escHtml(dr.name) + '</strong> <span style="color:#999;">\u00b7 Door</span></span>';
    html += '<button onclick="fsQimenStimulate(null)" style="' + QBTN + '" title="Qimen targeting (free choice of star)">\uD83C\uDF00 Qimen</button>';
    html += '</div>';
  });

  // Water / Bed / Desk placements — Qimen (locked per type) + Activate.
  ['water', 'bed', 'desk'].forEach(function(zone){
    var arr = st[zone] || [];
    arr.forEach(function(s, idx){
      any = true;
      var lockJs = (QLOCK[zone] === null) ? 'null' : ("'" + QLOCK[zone] + "'");
      html += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">';
      html += '<span style="font-size:11px;flex:1 1 auto;">' + ICON[zone] + ' <strong>' + escHtml(s.name) + '</strong> <span style="color:#999;">\u00b7 ' + ZLBL[zone] + '</span></span>';
      html += '<button onclick="fsQimenStimulate(' + lockJs + ')" style="' + QBTN + '" title="Qimen targeting">\uD83C\uDF00 Qimen</button>';
      html += '<button onclick="fsActivatePlacement(\'' + escJs(person.name) + '\',' + hi + ',' + fIdx + ',\'' + zone + '\',' + idx + ')" style="' + ABTN + '">\u26A1 Activate</button>';
      html += '</div>';
    });
  });

  if (!any) html += '<div style="font-size:11px;color:#999;padding:2px 0;">No settings yet \u2014 add Door / Water / Bed / Desk in the house card above.</div>';
  box.innerHTML = html;
}

// Open the Qimen × Flying-Stars stimulator. typeLock: 'water' | 'mountain' | null (free).
function fsQimenStimulate(typeLock){
  try {
    if (typeof QFS === 'undefined' || typeof QFS.open !== 'function'){ alert('flying-stars-qimen.js not loaded'); return; }
    // Make sure the active house chart is loaded into the Flying Stars block.
    var hfEl = document.getElementById('fs-house-facing');
    if (hfEl && !hfEl.value){
      var p = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
      if (p && typeof fsAutoLoadHouse === 'function') fsAutoLoadHouse(p.name);
    }
    var locked = (typeLock === 'water' || typeLock === 'mountain');
    QFS.open({ type: locked ? typeLock : undefined, lockType: locked });
  } catch(e){ console.warn('fsQimenStimulate', e); }
}

// Open the matching zone tool with a saved placement loaded, ready to SCAN.
function fsActivatePlacement(personName, hi, fIdx, zone, idx){
  try {
    window._fsSettingHouseIdx = hi;
    window._fsSettingFloorIdx = fIdx;
    if (typeof fsSelectZone === 'function') fsSelectZone(zone);
    if (typeof fsLoadZoneSetting === 'function') fsLoadZoneSetting(idx);
    var tools = document.getElementById('fs-zone-tools');
    if (tools) setTimeout(function(){ try { tools.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(e){} }, 60);
  } catch(e){ console.warn('fsActivatePlacement', e); }
}

// Degrees → 8-direction (N/NE/.../NW), or null if not a number.
function _fsDeg8(deg){
  if (deg == null || isNaN(deg)) return null;
  var dirs = ['N','NE','E','SE','S','SW','W','NW'];
  var i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[i];
}
// Auto-target the flying star for a task from its position on the house chart
// (the chart fixed in House Profiles). Returns {type, starNum, dir} or null.
function _fsTaskStar(task, house, floor, freeType){
  try {
    if (typeof FlyingStars === 'undefined' || typeof fsMountainCharFromDeg !== 'function') return null;
    var effFacing = (typeof _fsFloorFacing === 'function') ? _fsFloorFacing(house, floor) : null;
    var effPeriod = (typeof _fsFloorPeriod === 'function') ? _fsFloorPeriod(house, floor) : null;
    if (effFacing == null || effPeriod == null) return null;
    var chart;
    try { chart = FlyingStars.calculate(parseInt(effPeriod, 10), fsMountainCharFromDeg(parseFloat(effFacing))); } catch(e){ return null; }
    if (!chart || !FlyingStars.DIR_TO_INDEX) return null;
    var PAL = {1:'N',2:'SW',3:'E',4:'SE',5:'C',6:'NW',7:'W',8:'NE',9:'S'};
    var dir = null, type = task.type;
    if (task.kind === 'water'){
      var sw = (floor.settings.water || [])[task.idx]; if (!sw) return null;
      dir = sw.palace ? sw.palace : _fsDeg8(parseFloat(sw.water));   // general → palace; XKDG → water degree
      type = 'water';
    } else if (task.kind === 'bed'){
      var sb = (floor.settings.bed || [])[task.idx]; if (!sb) return null;
      dir = sb.bedPalace || null; type = 'mountain';
    } else if (task.kind === 'desk'){
      var sd = (floor.settings.desk || [])[task.idx]; if (!sd) return null;
      dir = _fsDeg8(parseFloat(sd.deskFacing)); type = freeType || 'water';
    } else if (task.kind === 'door'){
      var dr = (floor.doors || [])[task.idx]; if (!dr) return null;
      dir = _fsDeg8(parseFloat(dr.facing)); type = freeType || 'water';
    } else if (task.kind === 'zone'){
      var z = (floor.zones || [])[task.idx]; if (!z) return null;
      dir = z.dir || PAL[z.palace]; type = (z.target === 'mountain') ? 'mountain' : 'water';
    }
    if (!dir || dir === 'C') return null;
    var gi = FlyingStars.DIR_TO_INDEX[dir];
    if (gi == null) return null;
    var arr = (type === 'water') ? chart.facingStars : chart.sittingStars;
    var starNum = arr ? arr[gi] : null;
    if (starNum == null) return null;
    return { type: type, starNum: starNum, dir: dir };
  } catch(e){ console.warn('_fsTaskStar', e); return null; }
}

// ── ⚡ OPERATIVE: guided activation (house → task → SCAN) ──
// Replaces the old "Placed elements" + "QFS Zones" boxes. Lists only the
// placements that actually exist in the chosen house; SCAN opens the Qimen
// stimulator pre-set/locked to the right target star.
function fsRenderOperativeActivate(){
  var box = document.getElementById('fs-op-activate');
  if (!box) return;
  var escHtml = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); };
  var title = '<div style="font-size:12px;font-weight:bold;color:#4527a0;margin-bottom:6px;">🎯 Activate a setting (Qimen targeting)</div>';
  var person = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
  if (!person){ box.innerHTML = title + '<div style="font-size:11px;color:#999;">Load a person (A or B) first.</div>'; return; }
  var all = _fsHousesLoad();
  var houses = all[person.name] || [];
  if (!houses.length){ box.innerHTML = title + '<div style="font-size:11px;color:#999;">No houses yet — add one in House Profiles above.</div>'; return; }
  var activeIdx = _fsActiveHouseGet(person.name); if (activeIdx >= houses.length) activeIdx = 0;
  var house = houses[activeIdx];
  var floor = _fsActiveFloor(house);

  var html = title;

  // build task list first (only settings that exist), so House + Task can share a row
  var tasks = [];
  (floor.settings && floor.settings.water || []).forEach(function(s, idx){ tasks.push({ kind:'water', idx:idx, label:'💧 ' + s.name + (s.palace ? ' · ' + s.palace : '') + ' · Water (向星)', type:'water', free:false }); });
  (floor.settings && floor.settings.bed   || []).forEach(function(s, idx){ tasks.push({ kind:'bed',   idx:idx, label:'🛏 ' + s.name + ' · Bed (山星)',   type:'mountain', free:false }); });
  (floor.settings && floor.settings.desk  || []).forEach(function(s, idx){ tasks.push({ kind:'desk',  idx:idx, label:'🪑 ' + s.name + ' · Desk (free)',  type:null, free:true }); });
  (floor.doors || []).forEach(function(d, idx){ tasks.push({ kind:'door', idx:idx, label:'🚪 ' + d.name + ' · Door (free)', type:null, free:true }); });
  (floor.zones || []).forEach(function(z, idx){ tasks.push({ kind:'zone', idx:idx, label:'🌀 ' + z.name + ' · Zone (' + (z.target === 'mountain' ? '山星' : '向星') + ')', type:(z.target === 'mountain' ? 'mountain' : 'water'), free:false }); });
  window._fsOpTasks = tasks;

  // STEP 1 (house) + STEP 2 (task) — on the same row
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start;">';
  // House (left)
  html += '<div style="flex:1 1 240px;min-width:200px;">';
  html += '<div style="font-size:11px;color:#555;margin-bottom:2px;"><strong>1.</strong> House to treat:</div>';
  html += '<select onchange="fsOpPickHouse(this.value)" style="width:100%;padding:6px;border:1px solid #5e35b1;border-radius:4px;font-size:13px;">';
  houses.forEach(function(h, i){ html += '<option value="' + i + '"' + (i === activeIdx ? ' selected' : '') + '>' + escHtml(h.name) + '</option>'; });
  html += '</select>';
  html += '</div>';
  // Task (right)
  html += '<div style="flex:1 1 240px;min-width:200px;">';
  html += '<div style="font-size:11px;color:#555;margin-bottom:2px;"><strong>2.</strong> Task in this house:</div>';
  if (!tasks.length){
    html += '<div style="font-size:11px;color:#999;">No settings in this house yet — add Door / Water / Bed / Desk (and QFS Zones) in House Profiles above.</div>';
    html += '</div></div>';
    box.innerHTML = html; return;
  }
  var keys = tasks.map(function(t){ return t.kind + '|' + t.idx; });
  var selKey = window._fsOpTaskKey;
  if (keys.indexOf(selKey) === -1) selKey = keys[0];
  window._fsOpTaskKey = selKey;
  html += '<select onchange="fsOpPickTask(this.value)" style="width:100%;padding:6px;border:1px solid #5e35b1;border-radius:4px;font-size:13px;">';
  tasks.forEach(function(t){ var k = t.kind + '|' + t.idx; html += '<option value="' + k + '"' + (k === selKey ? ' selected' : '') + '>' + escHtml(t.label) + '</option>'; });
  html += '</select>';
  html += '</div>';   // close task column (row still open)

  // STEP 3 — target star (third column on the same row, auto-derived from the setting)
  var cur = tasks[keys.indexOf(selKey)];
  var freeType = window._fsOpFreeType || 'water';
  html += '<div style="flex:1 1 200px;min-width:180px;">';
  html += '<div style="font-size:11px;color:#555;margin-bottom:2px;"><strong>3.</strong> Target star:</div>';
  if (cur.free){
    html += '<label style="font-size:12px;margin-right:14px;cursor:pointer;"><input type="radio" name="fs-op-ft" value="water"' + (freeType === 'water' ? ' checked' : '') + ' onchange="fsOpPickFreeType(this.value)"> 向星 Water</label>';
    html += '<label style="font-size:12px;cursor:pointer;"><input type="radio" name="fs-op-ft" value="mountain"' + (freeType === 'mountain' ? ' checked' : '') + ' onchange="fsOpPickFreeType(this.value)"> 山星 Mountain</label>';
  }
  var info = _fsTaskStar(cur, house, floor, freeType);
  window._fsOpStar = info;   // remembered for the one-click scan
  if (info){
    var tl = (info.type === 'mountain') ? '山星 Mountain' : '向星 Water';
    html += '<div style="font-size:12px;color:#4527a0;font-weight:bold;margin-top:5px;">\u2192 ' + tl + ' Star <span style="font-size:15px;">' + info.starNum + '</span> at ' + info.dir + ' <span style="color:#999;font-weight:normal;">(auto-targeted)</span></div>';
  } else {
    html += '<div style="font-size:11px;color:#c0392b;margin-top:5px;">Can\'t auto-target \u2014 set the house chart (Facing + Period) in House Profiles and give this setting its direction. SCAN will open the panel to pick the star manually.</div>';
  }
  html += '</div>';   // close target-star column
  html += '</div>';   // close the row

  // STEP 4 — scan
  html += '<div style="margin-top:10px;"><button onclick="fsOpScan()" style="background:linear-gradient(135deg,#5e35b1,#7e57c2);color:#fff;font-weight:bold;font-size:14px;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;">🔎 SCAN</button></div>';
  box.innerHTML = html;
}

function fsOpPickHouse(v){
  try {
    var person = fsGetActivePersonForHouse(); if (!person) return;
    var i = parseInt(v, 10); if (isNaN(i)) return;
    window._fsOpTaskKey = null;                       // reset task selection for the new house
    if (typeof _fsActiveHouseSet === 'function') _fsActiveHouseSet(person.name, i);
    if (typeof fsLoadHouse === 'function') fsLoadHouse(person.name, i);  // load its chart into the FS block
    if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles();
    fsRenderOperativeActivate();
  } catch(e){ console.warn('fsOpPickHouse', e); }
}
function fsOpPickTask(v){ window._fsOpTaskKey = v; fsRenderOperativeActivate(); }
function fsOpPickFreeType(v){ window._fsOpFreeType = v; fsRenderOperativeActivate(); }
function fsOpScan(){
  try {
    var tasks = window._fsOpTasks || [];
    var key = window._fsOpTaskKey;
    var cur = null;
    for (var i = 0; i < tasks.length; i++){ if ((tasks[i].kind + '|' + tasks[i].idx) === key){ cur = tasks[i]; break; } }
    if (!cur){ alert('Select a task first.'); return; }
    if (typeof QFS === 'undefined' || typeof QFS.open !== 'function'){ alert('flying-stars-qimen.js not loaded'); return; }
    // Make sure the active house chart is loaded into the Flying Stars block.
    var hfEl = document.getElementById('fs-house-facing');
    if (hfEl && !hfEl.value){
      var p = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
      if (p && typeof fsAutoLoadHouse === 'function') fsAutoLoadHouse(p.name);
    }
    var info = window._fsOpStar;
    if (info && info.starNum){
      // Auto-targeted → open the panel locked to the exact star and run it in one click.
      QFS.open({ type: info.type, starNum: info.starNum, lockType: true });
      var btn = document.getElementById('qfs-scan-btn');
      if (btn) btn.click();
    } else {
      // Fallback (no derivable direction) → open the panel locked to the type only.
      var type = cur.free ? (window._fsOpFreeType || 'water') : cur.type;
      fsQimenStimulate(type);
    }
  } catch(e){ console.warn('fsOpScan', e); }
}

function fsAddZone(personName, houseIdx){
  // Ask by DIRECTION (clear) and map to the palace internally.
  var DIR2PAL = { N:1, NE:8, E:3, SE:4, S:9, SW:2, W:7, NW:6 };
  var dirStr = prompt('Direction of this zone \u2014 where the aquarium / feature sits.\nType one: N, NE, E, SE, S, SW, W, NW');
  if (!dirStr) return;
  var dir = dirStr.trim().toUpperCase();
  if (!DIR2PAL[dir]){ alert('Invalid direction. Use N, NE, E, SE, S, SW, W or NW.'); return; }
  var palace = DIR2PAL[dir];

  var tStr = prompt('Which flying star to activate here?\n\nType  W  = Water Star \u5411\u661f  (for aquariums / moving water)\nType  M  = Mountain Star \u5C71\u661f  (for still / mountain features)', 'W');
  if (tStr === null) return;
  var t = tStr.trim().toLowerCase();
  var target = (t === 'm' || t === 'mountain') ? 'mountain' : (t === 'w' || t === 'water' || t === '') ? 'water' : null;
  if (!target){ alert('Type W (water) or M (mountain).'); return; }

  // Preset for the Qimen special-config scan: auto (San Qi + 4 doors + the
  // star matching the flying star) or the saved custom Qimen selection.
  var preset = 'auto';
  var hasCustom = false;
  try { var cp = JSON.parse(localStorage.getItem('xkdg_qfs_preset') || 'null');
    hasCustom = !!(cp && ((cp.stems||[]).length + (cp.doors||[]).length + (cp.stars||[]).length + (cp.spirits||[]).length)); } catch(e){}
  if (hasCustom){
    var pStr = prompt('Qimen preset for this zone?\n\nType  A  = Auto (San Qi + 4 doors + the star matching the flying star)\nType  C  = Custom (your saved Qimen selection)', 'A');
    if (pStr === null) return;
    preset = (pStr.trim().toLowerCase().charAt(0) === 'c') ? 'custom' : 'auto';
  }

  var defName = (target === 'water' ? 'Water ' : 'Mountain ') + dir;
  var zName = prompt('Name for this zone (optional):', defName);
  if (zName === null) return;
  if (!zName.trim()) zName = defName;

  var all = _fsHousesLoad();
  if (!all[personName] || !all[personName][houseIdx]) return;
  _fsActiveFloor(all[personName][houseIdx]).zones.push({ name: zName.trim(), palace: palace, target: target, dir: dir, preset: preset });
  _fsHousesSave(all);
  fsRenderHouseProfiles();
  if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
}

function fsRemoveZone(personName, houseIdx, zoneIdx){
  if (!confirm('Remove this QFS zone?')) return;
  var all = _fsHousesLoad();
  if (!all[personName] || !all[personName][houseIdx]) return;
  var zones = _fsActiveFloor(all[personName][houseIdx]).zones;
  zones.splice(zoneIdx, 1);
  _fsHousesSave(all);
  fsRenderHouseProfiles();
  if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
}


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

// Keep the zoomed luopan inside its frame so it can never be dragged
// "overboard". transformOrigin is 0,0, so the visible box runs from
// (tx,ty) to (tx + W*scale, ty + H*scale); constrain it to cover the wrap.
// At scale 1 this forces tx=ty=0, i.e. the image snaps back to its place.
function _fsClampPan(canvas){
  try {
    canvas = canvas || document.getElementById('fs-canvas');
    if (!canvas) return;
    var wrap = canvas.parentElement;
    var W  = canvas.offsetWidth  || 1;
    var H  = canvas.offsetHeight || 1;
    var Wc = wrap ? wrap.clientWidth  : W;
    var Hc = wrap ? wrap.clientHeight : H;
    var s  = _fsZoomScale;
    var minTx = Math.min(0, Wc - W * s);
    var minTy = Math.min(0, Hc - H * s);
    if (_fsZoomTx > 0) _fsZoomTx = 0; else if (_fsZoomTx < minTx) _fsZoomTx = minTx;
    if (_fsZoomTy > 0) _fsZoomTy = 0; else if (_fsZoomTy < minTy) _fsZoomTy = minTy;
  } catch(e){}
}

function _fsApplyTransform(){
  const canvas = document.getElementById('fs-canvas');
  if (!canvas) return;
  _fsClampPan(canvas);
  canvas.style.transformOrigin = '0 0';
  canvas.style.transform =
    'translate(' + _fsZoomTx + 'px, ' + _fsZoomTy + 'px) ' +
    'scale('     + _fsZoomScale + ')';
  // At 1x the page must scroll through the luopan; when zoomed, the finger pans it.
  canvas.style.touchAction = (_fsZoomScale > 1.01) ? 'none' : 'pan-y';
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
  // Let the PAGE scroll vertically through the luopan when it is NOT zoomed; only
  // capture all gestures (pan the image) once zoomed in. _fsApplyTransform keeps
  // this in sync with the zoom level. (Was 'none', which blocked page scroll and
  // made the luopan feel "stuck" on phones.)
  canvas.style.touchAction = 'pan-y';
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
      // Double-tap to reset only matters when zoomed; at 1x do nothing so a quick
      // double-flick still scrolls the page.
      if (_fsZoomScale > 1.01 && now - _fsLastTapTime < 300){
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
      // scale == 1: do NOT preventDefault — let the page scroll normally.
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
    '    width: calc(100vw - 32px) !important;',     /* anchor to the VIEWPORT, not an ancestor that may be */
    '    max-width: calc(100vw - 32px) !important;',  /* wider than the phone (that overflow pushed the side */
    '    margin-left: auto !important;',              /* star boxes off BOTH edges). 16px gutter each side. */
    '    margin-right: auto !important;',
    '    box-sizing: border-box !important;',
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

        // Current UTC offset (hours, incl. DST) of an IANA zone at instant d.
        function _tzOffH(tz, d){
            try {
                var p = new Intl.DateTimeFormat('en-US',{timeZone:tz,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})
                    .formatToParts(d).reduce(function(a,x){ a[x.type]=x.value; return a; },{});
                var hh = (p.hour === '24') ? 0 : parseInt(p.hour,10);
                var asUTC = Date.UTC(p.year, p.month-1, p.day, hh, p.minute, p.second);
                return Math.round((asUTC - d.getTime())/60000)/60;
            } catch(e){ return null; }
        }
        function _tzLocalParts(tz, d){
            var p = new Intl.DateTimeFormat('en-CA',{timeZone:tz,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
                .formatToParts(d).reduce(function(a,x){ a[x.type]=x.value; return a; },{});
            return { date: p.year+'-'+p.month+'-'+p.day, time: ((p.hour==='24')?'00':p.hour)+':'+p.minute };
        }

        document.getElementById('city-picker').addEventListener('change', function(e){
            var picked = cityData[e.target.value];
            if (!picked) return;
            lngInput.value = picked.lng.toFixed(2);
            lngInput.dispatchEvent(new Event('input',  { bubbles: true }));
            lngInput.dispatchEvent(new Event('change', { bubbles: true }));

            var utcInput = document.getElementById('utc-offset');
            var dEl = document.getElementById('date'), tEl = document.getElementById('time');
            var p2 = function(n){ return (n < 10 ? '0' : '') + n; };
            var now = new Date();
            var doneViaTz = false;

            // Preferred: use the city's IANA timezone (browser's built-in DST rules).
            if (picked.tz) {
                try {
                    var cur = _tzOffH(picked.tz, now);
                    var jan = _tzOffH(picked.tz, new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 12)));
                    var jul = _tzOffH(picked.tz, new Date(Date.UTC(now.getUTCFullYear(), 6, 1, 12)));
                    if (cur != null && jan != null && jul != null) {
                        var std = Math.min(jan, jul);          // winter standard offset
                        var isDst = cur > std + 0.01;          // DST currently active?
                        if (utcInput) {
                            utcInput.value = std;
                            utcInput.dispatchEvent(new Event('input',  { bubbles: true }));
                            utcInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        // Sync the DST toggle to the real situation in that city.
                        if (typeof _dstOn !== 'undefined' && typeof toggleDST === 'function') {
                            if (isDst && !_dstOn) toggleDST();
                            else if (!isDst && _dstOn) toggleDST();
                        }
                        var lp = _tzLocalParts(picked.tz, now);
                        if (dEl) dEl.value = lp.date;
                        if (tEl) tEl.value = lp.time;
                        doneViaTz = true;
                    }
                } catch (err) { console.warn('city tz update', err); }
            }

            // Fallback: fixed standard offset + current DST toggle (legacy behaviour).
            if (!doneViaTz) {
                if (utcInput) {
                    utcInput.value = picked.utc;
                    utcInput.dispatchEvent(new Event('input',  { bubbles: true }));
                    utcInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                try {
                    var dstAdd = (typeof _dstOn !== 'undefined' && _dstOn) ? 3600000 : 0;
                    var cityWall = new Date(now.getTime() + picked.utc * 3600000 + dstAdd);
                    if (dEl) dEl.value = cityWall.getUTCFullYear() + '-' + p2(cityWall.getUTCMonth() + 1) + '-' + p2(cityWall.getUTCDate());
                    if (tEl) tEl.value = p2(cityWall.getUTCHours()) + ':' + p2(cityWall.getUTCMinutes());
                } catch (err) { console.warn('city clock update', err); }
            }

            try { if (typeof calculateBazi === 'function') calculateBazi(); } catch (err) {}
            // Keep the selected city name visible in the field (do not clear it).
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

// ═══════════════════════════════════════════════════════════════
//  MANUAL FLYING STARS EDITOR (⭐ Manual)
//  Lets the user hand-compile the flying stars chart for the rare
//  case where the auto chart must be overridden.
//  South-at-top 3×3 — indices match flying-stars.js grid exactly:
//    [0 SE][1 S ][2 SW]
//    [3 E ][4 C ][5 W ]
//    [6 NE][7 N ][8 NW]
//  Each palace holds 3 stars: 山 Sitting · 向 Facing · 運 Base.
// ═══════════════════════════════════════════════════════════════
window._fsManualChart = window._fsManualChart || null;
var FSM_LABELS = ['SE 巽','S 離','SW 坤','E 震','Center','W 兌','NE 艮','N 坎','NW 乾'];

function fsCloseManualStars(){
  var ed = document.getElementById('fs-manual-editor');
  if (ed) ed.style.display = 'none';
}

function fsOpenManualStars(){
  try {
    var ed = document.getElementById('fs-manual-editor');
    if (!ed) return;
    if (ed.style.display !== 'none'){ ed.style.display = 'none'; return; }

    var seedSit  = new Array(9).fill('');
    var seedBase = new Array(9).fill('');
    var seedFac  = new Array(9).fill('');

    if (window._fsManualChart){
      seedSit  = window._fsManualChart.sittingStars.slice();
      seedBase = window._fsManualChart.baseStars.slice();
      seedFac  = window._fsManualChart.facingStars.slice();
    } else if (typeof FlyingStars !== 'undefined'){
      var hf = parseFloat((document.getElementById('fs-house-facing')||{}).value);
      var pd = parseInt((document.getElementById('fs-period')||{}).value, 10);
      if (!isNaN(hf) && !isNaN(pd) && pd >= 1 && pd <= 9){
        try {
          var c = FlyingStars.calculate(pd, fsMountainCharFromDeg(hf));
          seedSit  = c.sittingStars.slice();
          seedBase = c.baseStars.slice();
          seedFac  = c.facingStars.slice();
        } catch(e){
          if (!isNaN(pd)) seedBase = FlyingStars.flyStars(pd, true);
        }
      } else if (!isNaN(pd) && pd >= 1 && pd <= 9){
        seedBase = FlyingStars.flyStars(pd, true);
      }
    }

    var cells = '';
    for (var i = 0; i < 9; i++){
      var isCenter = (i === 4);
      cells +=
        '<div style="border:1px solid #c9a84c;border-radius:6px;padding:4px;' + (isCenter ? 'background:rgba(201,168,76,0.12);' : 'background:#fff;') + '">' +
          '<div style="font-size:9px;color:#999;text-align:center;margin-bottom:2px;">' + FSM_LABELS[i] + '</div>' +
          '<div style="display:flex;justify-content:space-between;gap:2px;">' +
            '<input type="number" min="1" max="9" id="fsm-sit-' + i + '" value="' + (seedSit[i] || '') + '" title="Sitting 山" style="width:30px;padding:2px;border:1px solid #0a6e1f;border-radius:3px;color:#0a6e1f;font-weight:bold;text-align:center;font-size:13px;">' +
            '<input type="number" min="1" max="9" id="fsm-fac-' + i + '" value="' + (seedFac[i] || '') + '" title="Facing 向" style="width:30px;padding:2px;border:1px solid #cc0000;border-radius:3px;color:#cc0000;font-weight:bold;text-align:center;font-size:13px;">' +
          '</div>' +
          '<div style="text-align:center;margin-top:2px;">' +
            '<input type="number" min="1" max="9" id="fsm-base-' + i + '" value="' + (seedBase[i] || '') + '" title="Base 運" style="width:30px;padding:2px;border:1px solid #1a1008;border-radius:3px;color:#1a1008;text-align:center;font-size:12px;">' +
          '</div>' +
        '</div>';
    }

    ed.innerHTML =
      '<div style="background:#fffdf5;border:1px solid #c9a84c;border-radius:6px;padding:8px;">' +
        '<div style="font-size:11px;color:#8a6a1f;font-weight:bold;margin-bottom:4px;">⭐ Manual flying stars — South at top</div>' +
        '<div style="font-size:10px;color:#999;margin-bottom:6px;">Per palace: <span style="color:#0a6e1f;font-weight:bold;">山 Sitting</span> · <span style="color:#cc0000;font-weight:bold;">向 Facing</span> · <span style="color:#1a1008;font-weight:bold;">運 Base</span>. Values 1–9.</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px;">' + cells + '</div>' +
        '<div style="display:flex;gap:6px;justify-content:flex-end;">' +
          '<button onclick="fsCloseManualStars()" style="background:#eee;color:#555;border:none;border-radius:5px;padding:6px 12px;font-size:12px;cursor:pointer;">Cancel</button>' +
          '<button onclick="fsApplyManualStars()" style="background:#8a6a1f;color:#fff;border:none;border-radius:5px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;">Apply</button>' +
        '</div>' +
      '</div>';
    ed.style.display = 'block';
  } catch(err){ console.warn('fsOpenManualStars', err); }
}

function fsApplyManualStars(){
  try {
    var sit = [], fac = [], base = [];
    for (var i = 0; i < 9; i++){
      var s = parseInt((document.getElementById('fsm-sit-' + i) || {}).value, 10);
      var f = parseInt((document.getElementById('fsm-fac-' + i) || {}).value, 10);
      var b = parseInt((document.getElementById('fsm-base-' + i) || {}).value, 10);
      var trio = [[s, 'Sitting 山'], [f, 'Facing 向'], [b, 'Base 運']];
      for (var k = 0; k < trio.length; k++){
        var v = trio[k][0];
        if (isNaN(v) || v < 1 || v > 9){
          alert('Every star must be a number 1–9. Check the ' + trio[k][1] + ' value in palace ' + FSM_LABELS[i] + '.');
          return;
        }
      }
      sit[i] = s; fac[i] = f; base[i] = b;
    }
    var period = parseInt((document.getElementById('fs-period') || {}).value, 10);
    if (isNaN(period)) period = '?';
    var facingMountain = '—', sittingMountain = '—';
    if (typeof FlyingStars !== 'undefined'){
      var hf = parseFloat((document.getElementById('fs-house-facing') || {}).value);
      if (!isNaN(hf)){
        try {
          var mc = fsMountainCharFromDeg(hf);
          facingMountain = mc;
          sittingMountain = FlyingStars.getSittingMountain(mc) || '—';
        } catch(e){}
      }
    }
    window._fsManualChart = {
      period: period,
      facingMountain: facingMountain,
      sittingMountain: sittingMountain,
      facingForward: true,
      sittingForward: true,
      sittingStars: sit,
      facingStars: fac,
      baseStars: base,
      _manual: true
    };
    fsCloseManualStars();
    fsUpdateManualBadge();
    _fsPersistManualChart();
    if (typeof FS_STARS_ON !== 'undefined' && !FS_STARS_ON){ fsToggleStars(); }
    else if (typeof fsRedraw === 'function'){ fsRedraw(); }
  } catch(err){ console.warn('fsApplyManualStars', err); }
}

function fsResetManualStars(){
  window._fsManualChart = null;
  fsUpdateManualBadge();
  _fsPersistManualChart();
  if (typeof fsRedraw === 'function') fsRedraw();
}

function fsUpdateManualBadge(){
  var b = document.getElementById('fs-manual-badge');
  if (!b) return;
  if (window._fsManualChart){
    b.style.display = 'block';
    b.innerHTML =
      '<span style="background:#8a6a1f;color:#fff;border-radius:10px;padding:2px 10px;font-size:11px;font-weight:bold;">⭐ Manual ON</span>' +
      '<button onclick="fsResetManualStars()" style="background:#fff;color:#8a6a1f;border:1px solid #8a6a1f;border-radius:10px;padding:2px 10px;font-size:11px;font-weight:bold;cursor:pointer;margin-left:6px;">↺ Reset to auto</button>';
  } else {
    b.style.display = 'none';
    b.innerHTML = '';
  }
}

// ── Manual chart persistence ──────────────────────────────────────
//  The hand-composed chart is tied to the active house's floor (saved in
//  xkdg_houses) plus a global fallback (xkdg_fs_manual) for users who edit
//  without a house profile. It is restored on house load / FS open so the
//  student never has to recompose it.
function _fsActiveHouseFloorCtx(){
  try {
    var person = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
    if (!person) return null;
    var all = _fsHousesLoad();
    var houses = all[person.name]; if (!houses || !houses.length) return null;
    var hi = (typeof _fsActiveHouseGet === 'function') ? _fsActiveHouseGet(person.name) : 0;
    if (hi >= houses.length) hi = 0;
    var house = houses[hi]; if (!house) return null;
    var floor = _fsActiveFloor(house);
    return { all: all, house: house, floor: floor };
  } catch(e){ return null; }
}
function _fsPersistManualChart(){
  try {
    var mc = window._fsManualChart || null;
    try { if (mc) localStorage.setItem('xkdg_fs_manual', JSON.stringify(mc)); else localStorage.removeItem('xkdg_fs_manual'); } catch(e){}
    var ctx = _fsActiveHouseFloorCtx();
    if (ctx && ctx.floor){
      if (mc) ctx.floor.manualChart = mc;
      else { try { delete ctx.floor.manualChart; } catch(e){ ctx.floor.manualChart = null; } }
      _fsHousesSave(ctx.all);
    }
  } catch(e){ console.warn('_fsPersistManualChart', e); }
}
function _fsRestoreManualChartForHouse(floor){
  try {
    if (floor && floor.manualChart){ window._fsManualChart = floor.manualChart; }
    else if (floor){ window._fsManualChart = null; }           // this house has no manual override
    else {                                                       // no house context → last global manual
      try { var raw = localStorage.getItem('xkdg_fs_manual'); if (raw) window._fsManualChart = JSON.parse(raw); } catch(e){}
    }
    if (typeof fsUpdateManualBadge === 'function') fsUpdateManualBadge();
    if (window._fsManualChart && typeof FS_STARS_ON !== 'undefined' && !FS_STARS_ON && typeof fsToggleStars === 'function') fsToggleStars();
  } catch(e){ console.warn('_fsRestoreManualChartForHouse', e); }
}

// ═══════════════════════════════════════════════════════════════
//  THREE-ZONE GATE — Phase A (additive, extension v11)
//  Clicking FENG SHUI now shows a zone chooser FIRST:
//    🌊 Setting up the Water · 🛏 Setting up the Bed · 🪑 Setting up the Desk
//  The shared base (Current context + Flying Stars block, incl. ⭐ Manual)
//  stays visible on top. The rest of the module (the "tools") is revealed
//  only after a zone is chosen.
//    Water = current module, unchanged.
//    Bed / Desk = clones of the same engine for now; section-specific
//                 rules arrive in later phases.
//  The reorganisation runs once and anchors on #fs-stars-center, so it is
//  robust to the buttons injected by the earlier wrappers.
// ═══════════════════════════════════════════════════════════════
window._fsActiveZone = window._fsActiveZone || null;

var FS_ZONES = {
  water: { label: '🌊 Setting up the Water', clone: false },
  bed:   { label: '🛏 Setting up the Bed',   clone: false },
  desk:  { label: '🪑 Setting up the Desk',  clone: false }
};

function _fsZoneBtnStyle(active){
  return 'flex:1;min-width:130px;border-radius:8px;padding:12px 10px;font-size:13px;font-weight:bold;cursor:pointer;white-space:nowrap;border:2px solid #8a6a1f;'
    + (active ? 'background:#8a6a1f;color:#fff;' : 'background:#fff8e1;color:#8a6a1f;');
}

function fsRenderZoneGate(){
  var gate = document.getElementById('fs-zone-gate');
  if (!gate) return;
  var z = window._fsActiveZone;
  if (z){
    // A tool is open (launched from a house card): show its label + a way back.
    var lbl = (FS_ZONES[z] && FS_ZONES[z].label) || z;
    gate.innerHTML =
      '<div style="background:#fdf6e3;border:1px solid #c9a84c;border-radius:8px;padding:8px 10px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
      + '<span style="background:#8a6a1f;color:#fff;border-radius:8px;padding:4px 12px;font-size:13px;font-weight:bold;">' + lbl + '</span>'
      + '<span style="font-size:11px;color:#999;flex:1 1 auto;">Editing for the active house. Save with “Add setting to house”.</span>'
      + '<button onclick="fsExitZone()" style="flex:0 0 auto;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;border:2px solid #b71c1c;background:#fff;color:#b71c1c;white-space:nowrap;">← Close</button>'
      + '</div>';
  } else {
    // No tool open → no hint needed (the house "Add …" buttons are self-explanatory).
    gate.innerHTML = '';
  }
}

function fsSelectZone(zone){
  try {
    if (!FS_ZONES[zone]) return;
    window._fsActiveZone = zone;
    window._fsFSRecalled = false;
    if (typeof _fsSyncRecallButtons === 'function') _fsSyncRecallButtons();
    var tools = document.getElementById('fs-zone-tools');
    if (tools) tools.style.display = 'block';
    fsRenderZoneGate();
    var banner = document.getElementById('fs-zone-banner');
    if (banner){
      var z = FS_ZONES[zone];
      // The gate header above already names the section, so don't repeat the
      // title here; keep only the (rare) clone note.
      banner.innerHTML = (z && z.clone) ? '<span style="font-size:11px;color:#999;">clone — section-specific rules coming in a later phase</span>' : '';
    }
    if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
    // Bed and Desk zones show their dedicated panels; Water shows the generic tools.
    var bedPanel = document.getElementById('fs-bed-panel');
    var deskPanel = document.getElementById('fs-desk-panel');
    var generic = document.getElementById('fs-generic-tools');
    if (zone === 'bed'){
      if (bedPanel) bedPanel.style.display = 'block';
      if (deskPanel) deskPanel.style.display = 'none';
      if (generic) generic.style.display = 'none';
      if (typeof fsBedReadChart === 'function') fsBedReadChart();
    } else if (zone === 'desk'){
      if (bedPanel) bedPanel.style.display = 'none';
      if (deskPanel) deskPanel.style.display = 'block';
      if (generic) generic.style.display = 'none';
      if (typeof fsDeskReadChart === 'function') fsDeskReadChart();
    } else {
      if (bedPanel) bedPanel.style.display = 'none';
      if (deskPanel) deskPanel.style.display = 'none';
      if (generic) generic.style.display = 'block';
      // Water section order (robust against the fragile one-time relocation):
      //   ① General water feature (by palace)  →  ② Internal Door Facing  →  rest.
      try {
        if (generic){
          var gw = document.getElementById('fs-wateract-block');
          // Find the Internal Door block = the wrapper of #fs-facing that is a
          // direct child of the generic container.
          var doorBlk = document.getElementById('fs-facing');
          while (doorBlk && doorBlk.parentNode && doorBlk.parentNode !== generic) doorBlk = doorBlk.parentNode;
          // ① General Water first.
          if (gw && generic.firstElementChild !== gw) generic.insertBefore(gw, generic.firstChild);
          // ② Internal Door Facing right after ① (only if it's a child of generic).
          if (doorBlk && doorBlk.parentNode === generic){
            var afterGw = gw ? gw.nextSibling : generic.firstChild;
            if (doorBlk !== afterGw) generic.insertBefore(doorBlk, afterGw);
          }
        }
      } catch(e){}
    }
    if (typeof fsRedraw === 'function') fsRedraw();
  } catch(err){ console.warn('fsSelectZone', err); }
}

// Leave the current section and return to the shared base (no zone). Lets the
// user go back when they need to set the base chart / start date they forgot.
function fsExitZone(){
  try {
    window._fsActiveZone = null;
    window._fsFSRecalled = false;
    var bedPanel = document.getElementById('fs-bed-panel');
    var deskPanel = document.getElementById('fs-desk-panel');
    var generic  = document.getElementById('fs-generic-tools');
    if (bedPanel)  bedPanel.style.display  = 'none';
    if (deskPanel) deskPanel.style.display = 'none';
    if (generic)   generic.style.display   = 'none';
    var tools = document.getElementById('fs-zone-tools');
    if (tools) tools.style.display = 'none';
    var banner = document.getElementById('fs-zone-banner');
    if (banner) banner.innerHTML = '';
    if (typeof _fsSyncRecallButtons === 'function') _fsSyncRecallButtons();
    if (typeof fsRenderZoneGate === 'function') fsRenderZoneGate();
    if (typeof _fsUpdateLuopanVis === 'function') _fsUpdateLuopanVis();
    if (typeof fsRedraw === 'function') fsRedraw();
    if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
    if (typeof fsRenderOperativeActivate === 'function') fsRenderOperativeActivate();
    var gate = document.getElementById('fs-zone-gate');
    if (gate) gate.scrollIntoView({ behavior:'smooth', block:'start' });
  } catch(err){ console.warn('fsExitZone', err); }
}

// Real local clock window (true solar time, DST-adjusted) for a Chinese hour
// branch — same convention as BEST/LIST. hourHan may be a full ganzhi.
function _fsBranchClock(hourHan){
  try {
    var SOLAR = {'子':23,'丑':1,'寅':3,'卯':5,'辰':7,'巳':9,'午':11,'未':13,'申':15,'酉':17,'戌':19,'亥':21};
    var chars = String(hourHan||'').replace(/[^\u4e00-\u9fff]/g,''), br=null;
    for (var i=chars.length-1;i>=0;i--){ if (SOLAR[chars[i]]!=null){ br=chars[i]; break; } }
    if (!br) return null;
    var lon=parseFloat((document.getElementById('longitude')||{}).value);
    var utc=parseFloat((document.getElementById('utc-offset')||{}).value);
    if (isNaN(lon)||isNaN(utc)) return null;
    var dstOn=false; try{ dstOn=(typeof _dstOn!=='undefined')?_dstOn:!!window._dstOn; }catch(e){}
    var off=(lon-utc*15)*4-(dstOn?60:0);
    var s=(((SOLAR[br]*60-off)%1440)+1440)%1440, e=(s+120)%1440;
    var f=function(m){m=Math.round(((m%1440)+1440)%1440);var h=Math.floor(m/60),mm=m%60;return (h<10?'0':'')+h+':'+(mm<10?'0':'')+mm;};
    return f(s)+'\u2013'+f(e);
  } catch(e){ return null; }
}

// MANUAL equivalent of the AI find_water_activation tool: for the selected 45°
// quadrant, run BOTH the QMDJ water-hour scan (Qimen sector) AND the XKDG day
// scan for the loaded person, then merge by date with a combined score.
function fsWaterActivationScan(){
  var out=document.getElementById('fs-wateract-results');
  if (!out) return;
  try {
    var sel=document.getElementById('fs-wateract-dir');
    var dir=sel?sel.value:'';
    if (!dir){ out.innerHTML='<div style="font-size:12px;color:#c0392b;">Select a quadrant first.</div>'; return; }
    if (typeof window.QMDJWaterScanner==='undefined' || typeof window.QMDJWaterScanner.scan!=='function'){
      out.innerHTML='<div style="font-size:12px;color:#c0392b;">QMDJ water scanner not available on this page.</div>'; return;
    }
    var daysEl=document.getElementById('fs-wateract-days');
    var days=(daysEl&&parseInt(daysEl.value,10))||7;
    var startEl=document.getElementById('scan-start');
    var start=(startEl&&startEl.value)|| new Date().toISOString().slice(0,10);
    out.innerHTML='<div style="font-size:12px;color:#666;">Scanning…</div>';

    // (1) Qimen sector hours
    var qres=[];
    try { qres=window.QMDJWaterScanner.scan(dir,start,days)||[]; }
    catch(e){ out.innerHTML='<div style="font-size:12px;color:#c0392b;">Qimen scan failed.</div>'; return; }

    // (2) XKDG day quality for the loaded person (best score per date)
    var xkdgByDate={}, hasPerson=false;
    try { var pA=(typeof _personAYear!=='undefined')?_personAYear:window._personAYear; var pB=(typeof _personBYear!=='undefined')?_personBYear:window._personBYear; hasPerson=!!(pA||pB); } catch(e){}
    if (hasPerson && typeof window.runScanner==='function'){
      try {
        var ss=document.getElementById('scan-start'), sd=document.getElementById('scan-days'), ps=document.getElementById('purpose-select');
        if (ss) ss.value=start; if (sd) sd.value=String(days);
        if (ps){ ps.value=''; if (typeof window.onPurposeChange==='function') try{window.onPurposeChange();}catch(e){} }
        window.runScanner();
        (window._lastScanResults||[]).forEach(function(r){ if(!r.isoDate) return; if(xkdgByDate[r.isoDate]==null||r.score>xkdgByDate[r.isoDate]) xkdgByDate[r.isoDate]=r.score; });
      } catch(e){}
    }

    // (3) Merge by date — both scores + combined
    var rows=qres.map(function(r){
      var xs=(xkdgByDate[r.date]!=null)?xkdgByDate[r.date]:null;
      return { date:r.date, weekday:r.weekday, hour:(_fsBranchClock(r.hourHan)||r.hourTime), ganzhi:r.hourHan, q:(r.score||0), x:xs, c:(r.score||0)+(xs!=null?xs:0), hits:(r.hits||[]).map(function(h){return h.label;}) };
    });
    rows.sort(function(a,b){ return (b.c-a.c)||(b.q-a.q); });
    if (!rows.length){ out.innerHTML='<div style="font-size:12px;color:#e65100;">No favourable Qimen water hours in this range for '+dir+'.</div>'; return; }

    var dmy=function(iso){ var p=String(iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; };
    var html='<div style="font-size:12px;font-weight:bold;color:#00695c;margin-bottom:6px;">'+dir+' — '+rows.length+' hours · '+(hasPerson?'Qimen + XKDG':'Qimen only — load a person (A/B) to add XKDG')+'</div>';
    html+='<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html+='<tr style="color:#00695c;">'
      +'<th style="text-align:left;padding:4px;border-bottom:1px solid #b2dfdb;">Date</th>'
      +'<th style="padding:4px;border-bottom:1px solid #b2dfdb;">Hour</th>'
      +'<th style="padding:4px;border-bottom:1px solid #b2dfdb;">Qimen</th>'
      +'<th style="padding:4px;border-bottom:1px solid #b2dfdb;">XKDG</th>'
      +'<th style="padding:4px;border-bottom:1px solid #b2dfdb;">Combined</th></tr>';
    rows.slice(0,20).forEach(function(r){
      html+='<tr style="border-bottom:1px solid #eee;">'
        +'<td style="padding:4px;white-space:nowrap;"><b>'+dmy(r.date)+'</b> <span style="color:#888;">'+(r.ganzhi||'')+'</span></td>'
        +'<td style="padding:4px;text-align:center;white-space:nowrap;">'+r.hour+'</td>'
        +'<td style="padding:4px;text-align:center;color:#00695c;font-weight:bold;">'+r.q+'</td>'
        +'<td style="padding:4px;text-align:center;font-weight:bold;color:'+(r.x!=null?'#6a1b9a':'#bbb')+';">'+(r.x!=null?r.x:'\u2014')+'</td>'
        +'<td style="padding:4px;text-align:center;font-weight:bold;color:#1565c0;">'+r.c+'</td>'
        +'</tr>';
      if (r.hits && r.hits.length){
        html+='<tr><td colspan="5" style="padding:0 4px 6px 4px;font-size:10px;color:#777;">'+r.hits.join(' \u00b7 ')+'</td></tr>';
      }
    });
    html+='</table></div>';
    out.innerHTML=html;
  } catch(err){ console.warn('fsWaterActivationScan', err); out.innerHTML='<div style="font-size:12px;color:#c0392b;">Scan error.</div>'; }
}

// Reorganise the FS view into: gate + shared base (incl. luopan) + gated tools.
// Runs once. Anchors on stable IDs so it survives the earlier wrappers.
function _fsBuildZoneGate(){
  try {
    var view = document.getElementById('fengshui-view');
    if (!view) return;
    if (document.getElementById('fs-zone-gate')) return; // already reorganised
    var fsRoot = view.firstElementChild;
    if (!fsRoot) return;

    var gate = document.createElement('div');
    gate.id = 'fs-zone-gate';
    fsRoot.insertBefore(gate, fsRoot.firstChild);

    var tools = document.createElement('div');
    tools.id = 'fs-zone-tools';
    tools.style.display = 'none';
    var banner = document.createElement('div');
    banner.id = 'fs-zone-banner';
    banner.style.cssText = 'margin-bottom:10px;text-align:center;';
    tools.appendChild(banner);
    // Per-zone, per-person settings panel (Phase B) — appended LAST so it sits
    // under the section content (the XKDG Door block must be first).
    var zoneSettings = document.createElement('div');
    zoneSettings.id = 'fs-zone-settings';

    // Bed-specific panel — shown only for the Bed zone.
    var bedPanel = document.createElement('div');
    bedPanel.id = 'fs-bed-panel';
    bedPanel.style.display = 'none';

    // Desk-specific panel — shown only for the Desk zone.
    var deskPanel = document.createElement('div');
    deskPanel.id = 'fs-desk-panel';
    deskPanel.style.display = 'none';

    // Generic (Water) tools wrapper — the XKDG Door block is the FIRST thing in
    // the section (it's what you fill to make the luopan appear).
    var generic = document.createElement('div');
    generic.id = 'fs-generic-tools';

    var doorEl = document.getElementById('fs-facing');
    var doorBlock = doorEl;
    while (doorBlock && doorBlock.parentNode !== fsRoot) doorBlock = doorBlock.parentNode;
    if (doorBlock) generic.appendChild(doorBlock);

    var modeEl = document.getElementById('fs-mode-fs');
    var modeToggle = modeEl;
    while (modeToggle && modeToggle.parentNode !== fsRoot) modeToggle = modeToggle.parentNode;
    if (modeToggle) generic.appendChild(modeToggle);

    // ① General water feature box lives in the Water section (moved out of the
    // OPERATIVE area so there is no duplicate). Put it FIRST, above the Internal Door.
    var genWater = document.getElementById('fs-wateract-block');
    if (genWater) generic.insertBefore(genWater, generic.firstChild);

    // Capture House Profiles BEFORE the sweep (the sweep moves it into the
    // detached generic wrapper, after which getElementById can't find it).
    var hp = document.getElementById('fs-house-profiles');
    // Capture the ⚡ OPERATIVE area too — it sits after the legend and would
    // otherwise be swept into the hidden tools wrapper.
    var op = document.getElementById('fs-operative');

    var legend = document.getElementById('fs-legend');
    if (legend){
      var node = legend.nextSibling;
      while (node){ var next = node.nextSibling; generic.appendChild(node); node = next; }
    }

    // House Profiles belong to the MAIN sector and must be the FIRST thing the
    // user sees — put them at the very TOP of the base (above the gate hint),
    // i.e. above the Flying-Stars box and the luopan.
    if (hp){
      var gateEl = document.getElementById('fs-zone-gate');
      if (gateEl && gateEl.parentNode === fsRoot) fsRoot.insertBefore(hp, gateEl);
      else fsRoot.insertBefore(hp, fsRoot.firstChild);
    }

    // Section content order: banner, [Door-first generic], bed, desk, settings.
    tools.appendChild(generic);
    tools.appendChild(bedPanel);
    tools.appendChild(deskPanel);
    tools.appendChild(zoneSettings);
    fsRoot.appendChild(tools);

    // ⚡ OPERATIVE must stay in the MAIN base and be visible at the BOTTOM.
    // The post-legend sweep pulled it into the hidden tools wrapper, so move it
    // back out as the last child of the base.
    if (op) fsRoot.appendChild(op);

    if (typeof fsBuildBedPanel === 'function') fsBuildBedPanel();
    if (typeof fsBuildDeskPanel === 'function') fsBuildDeskPanel();
    fsRenderZoneGate();
    if (window._fsActiveZone) fsSelectZone(window._fsActiveZone);
  } catch(err){ console.warn('_fsBuildZoneGate', err); }
}

const _buildFengShuiViewOrig_v11 = buildFengShuiView;
buildFengShuiView = function(){
  _buildFengShuiViewOrig_v11();
  _fsBuildZoneGate();
};

// If the view is already built when this script loads, reorganise now
(function(){
  var v = document.getElementById('fengshui-view');
  if (v && v.dataset.built === '1') _fsBuildZoneGate();
})();

// ═══════════════════════════════════════════════════════════════
//  PER-ZONE SETTINGS — Phase B (additive)
//  Each section (water / bed / desk) keeps its OWN list of saved
//  settings, ISOLATED from the others, and the list FOLLOWS THE
//  PERSON. Settings are provisional snapshots of the current FS
//  inputs (House Facing, Period, Door Facing, Water, + optional
//  manual chart). Adding them to a "house" comes in Phase C.
//
//  Store (separate from xkdg_houses):
//    xkdg_fs_settings = {
//      "<PersonName>": { water:[s], bed:[s], desk:[s] }
//    }
//    s = { name, ts, houseFacing, period, doorFacing, water, manualChart }
// ═══════════════════════════════════════════════════════════════
function _fsZsLoad(){
  try { return JSON.parse(localStorage.getItem('xkdg_fs_settings') || '{}'); }
  catch(e){ return {}; }
}
function _fsZsSave(data){
  try { localStorage.setItem('xkdg_fs_settings', JSON.stringify(data)); } catch(e){}
}
// ── Phase C: everything converges into House Profiles ─────────────
// Section settings (water/bed/desk) now live INSIDE the active house
// (house.settings = {water:[],bed:[],desk:[]}), so the AI can read the
// whole setup of a house from House Profiles.
function _fsActiveHouseRef(){
  var person = fsGetActivePersonForHouse();
  if (!person) return null;
  var all = _fsHousesLoad();
  var list = all[person.name];
  if (!list || !list.length) return null;
  var idx = _fsActiveHouseGet(person.name);
  if (idx >= list.length) idx = 0;
  var house = list[idx];
  if (!house) return null;
  var floor = _fsActiveFloor(house);
  if (!floor.settings) floor.settings = { water: [], bed: [], desk: [] };
  return { all: all, person: person, idx: idx, house: house, floor: floor };
}

// Target house/floor for the "Setting up…" sections. Defaults to the active
// house + active floor, but the user can override via the dropdowns.
function _fsSettingRef(){
  var person = fsGetActivePersonForHouse();
  if (!person) return null;
  var all = _fsHousesLoad();
  var list = all[person.name];
  if (!list || !list.length) return null;
  var hIdx = (window._fsSettingHouseIdx != null) ? window._fsSettingHouseIdx : _fsActiveHouseGet(person.name);
  if (hIdx == null || hIdx >= list.length) hIdx = 0;
  var house = list[hIdx];
  if (!house) return null;
  _fsActiveFloor(house);                                   // self-heal floors[]
  var fIdx = (window._fsSettingFloorIdx != null) ? window._fsSettingFloorIdx : (house.activeFloor || 0);
  if (fIdx >= house.floors.length) fIdx = 0;
  var floor = house.floors[fIdx];
  if (!floor.settings) floor.settings = { water: [], bed: [], desk: [] };
  return { all: all, person: person, idx: hIdx, house: house, floor: floor, floorIdx: fIdx };
}
function fsSettingPickHouse(v){
  window._fsSettingHouseIdx = (v === '' ? null : parseInt(v, 10));
  window._fsSettingFloorIdx = null;                        // reset floor for the new house
  if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
}
function fsSettingPickFloor(v){
  window._fsSettingFloorIdx = (v === '' ? null : parseInt(v, 10));
  if (typeof fsRenderZoneSettings === 'function') fsRenderZoneSettings();
}
// store into each person's active (or first) house.
function _fsMigrateZoneSettings(){
  try {
    if (localStorage.getItem('xkdg_fs_settings_migrated') === '1') return;
    var old = JSON.parse(localStorage.getItem('xkdg_fs_settings') || '{}');
    var houses = _fsHousesLoad();
    var changed = false;
    Object.keys(old).forEach(function(pname){
      var list = houses[pname];
      if (!list || !list.length) return;            // no house for this person — leave old data as-is
      var idx = _fsActiveHouseGet(pname); if (idx >= list.length) idx = 0;
      var house = list[idx];
      var floor = _fsActiveFloor(house);
      if (!floor.settings) floor.settings = { water: [], bed: [], desk: [] };
      ['water', 'bed', 'desk'].forEach(function(z){
        var arr = (old[pname] && old[pname][z]) || [];
        if (arr.length){ floor.settings[z] = (floor.settings[z] || []).concat(arr); changed = true; }
      });
    });
    if (changed) _fsHousesSave(houses);
    localStorage.setItem('xkdg_fs_settings_migrated', '1');
  } catch(e){ console.warn('migrate zone settings', e); }
}
function _fsEsc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function _fsSetVal(id, v){
  var el = document.getElementById(id);
  if (el) el.value = (v == null ? '' : v);
}

function fsSaveZoneSetting(){
  try {
    var zone = window._fsActiveZone;
    if (!FS_ZONES[zone]) return;
    var ref = _fsSettingRef();
    if (!ref){ alert('Load a person and a saved house first — these settings are stored inside the active house.'); return; }
    var hf = (document.getElementById('fs-house-facing') || {}).value || '';
    var pd = (document.getElementById('fs-period') || {}).value || '';
    var df = (document.getElementById('fs-facing') || {}).value || '';
    var wt = (document.getElementById('fs-water') || {}).value || '';
    if (!hf && !df && !window._fsManualChart){
      alert('Nothing to save yet — set House Facing / Period (and optionally Door Facing) first.');
      return;
    }
    var name = prompt('Setting name (e.g. "Aquarium SE"):');
    if (!name || !name.trim()) return;
    // Zone-specific direction so Bed / Desk can be re-loaded ready to scan.
    var bedPalace  = (document.getElementById('fs-bed-palace')  || {}).value || '';
    var bedSitting = (document.getElementById('fs-bed-sitting') || {}).value || '';
    var deskFacing = (document.getElementById('fs-desk-facing') || {}).value || '';
    var s = {
      name: name.trim(), ts: Date.now(),
      houseFacing: hf, period: pd, doorFacing: df, water: wt,
      bedPalace: bedPalace, bedSitting: bedSitting, deskFacing: deskFacing,
      manualChart: window._fsManualChart ? JSON.parse(JSON.stringify(window._fsManualChart)) : null
    };
    if (!ref.floor.settings[zone]) ref.floor.settings[zone] = [];
    ref.floor.settings[zone].push(s);
    _fsHousesSave(ref.all);
    fsRenderZoneSettings();
    if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles();
  } catch(err){ console.warn('fsSaveZoneSetting', err); }
}

function fsLoadZoneSetting(idx){
  try {
    var zone = window._fsActiveZone;
    var ref = _fsSettingRef();
    if (!FS_ZONES[zone] || !ref) return;
    var list = ref.floor.settings[zone] || [];
    var s = list[idx];
    if (!s) return;
    _fsSetVal('fs-house-facing', s.houseFacing);
    _fsSetVal('fs-period', s.period);
    _fsSetVal('fs-facing', s.doorFacing);
    _fsSetVal('fs-water', s.water);
    window._fsManualChart = s.manualChart ? JSON.parse(JSON.stringify(s.manualChart)) : null;
    if (typeof fsUpdateManualBadge === 'function') fsUpdateManualBadge();
    // Restore the zone-specific direction so the Bed / Desk scan has everything it needs.
    if (zone === 'bed'){
      _fsSetVal('fs-bed-palace', s.bedPalace);
      _fsSetVal('fs-bed-sitting', s.bedSitting);
      if (typeof fsBedReadChart === 'function') fsBedReadChart();
    } else if (zone === 'desk'){
      _fsSetVal('fs-desk-facing', s.deskFacing);
      if (typeof fsDeskReadChart === 'function') fsDeskReadChart();
    }
    if (typeof FS_STARS_ON !== 'undefined' && !FS_STARS_ON){ fsToggleStars(); }
    else if (typeof fsRedraw === 'function'){ fsRedraw(); }
  } catch(err){ console.warn('fsLoadZoneSetting', err); }
}

function fsDeleteZoneSetting(idx){
  try {
    var zone = window._fsActiveZone;
    var ref = _fsSettingRef();
    if (!FS_ZONES[zone] || !ref) return;
    var list = ref.floor.settings[zone];
    if (!list || !list[idx]) return;
    if (!confirm('Delete setting "' + list[idx].name + '"?')) return;
    list.splice(idx, 1);
    _fsHousesSave(ref.all);
    fsRenderZoneSettings();
    if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles();
  } catch(err){ console.warn('fsDeleteZoneSetting', err); }
}

function fsRenderZoneSettings(){
  var box = document.getElementById('fs-zone-settings');
  if (!box) return;
  var zone = window._fsActiveZone;
  if (!FS_ZONES[zone]){ box.innerHTML = ''; return; }
  _fsMigrateZoneSettings();
  var ref = _fsSettingRef();
  var zoneLabel = FS_ZONES[zone].label;

  var html = '<div style="background:#fdf6e3;border:1px solid #c9a84c;border-radius:8px;padding:10px;margin-bottom:10px;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">'
      + '<span style="font-size:12px;font-weight:bold;color:#8a6a1f;">💾 ' + zoneLabel + ' — settings</span>';
  if (ref){
    html += '<button onclick="fsSaveZoneSetting()" style="background:#8a6a1f;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">💾 Save current</button>';
  }
  html += '</div>';

  if (!ref){
    html += '<div style="font-size:11px;color:#999;">Load a person (A or B) and a saved house first — these settings are stored inside the active house (House Profiles).</div></div>';
    box.innerHTML = html;
    return;
  }

  // Target selectors: choose WHICH house and WHICH floor this setting is saved into.
  var _houses = ref.all[ref.person.name] || [];
  html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;font-size:11px;color:#666;">';
  html += '<span>Save in:</span>';
  html += '<span>🏠</span><select onchange="fsSettingPickHouse(this.value)" style="font-size:11px;padding:2px 4px;border:1px solid #8a6a1f;border-radius:4px;max-width:150px;">';
  _houses.forEach(function(hh, hidx){
    html += '<option value="' + hidx + '"' + (hidx === ref.idx ? ' selected' : '') + '>' + _fsEsc(hh.name) + '</option>';
  });
  html += '</select>';
  html += '<span>🏢</span><select onchange="fsSettingPickFloor(this.value)" style="font-size:11px;padding:2px 4px;border:1px solid #8a6a1f;border-radius:4px;max-width:130px;">';
  (ref.house.floors || []).forEach(function(fl, fidx){
    html += '<option value="' + fidx + '"' + (fidx === ref.floorIdx ? ' selected' : '') + '>' + _fsEsc(fl.label || ('Floor ' + (fidx + 1))) + '</option>';
  });
  html += '</select>';
  html += '<span style="color:#999;">· ' + _fsEsc(ref.person.name) + '</span>';
  html += '</div>';

  var list = ref.floor.settings[zone] || [];
  if (!list.length){
    html += '<div style="font-size:12px;color:#999;padding:4px 0;">No settings saved yet for this section.</div>';
  } else {
    list.forEach(function(s, i){
      html += '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-top:1px solid #e6d8a8;">'
        + '<span style="flex:1;font-size:12px;color:#5a4410;">' + _fsEsc(s.name)
        + (s.manualChart ? ' <span title="manual chart" style="color:#8a6a1f;">⭐</span>' : '')
        + '</span>'
        + '<button onclick="fsLoadZoneSetting(' + i + ')" style="background:#fff;color:#8a6a1f;border:1px solid #8a6a1f;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:bold;cursor:pointer;">Load</button>'
        + '<button onclick="fsDeleteZoneSetting(' + i + ')" title="Delete" style="background:#fff;color:#c0392b;border:1px solid #c0392b;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:bold;cursor:pointer;">✕</button>'
        + '</div>';
    });
  }
  html += '</div>';
  box.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  BED SECTION — piece 1 (additive): inputs + read chart + ZS gate
//  Inputs: Bed palace (one of 8 directions) + Bed Sitting (°).
//  Outputs: the 3 flying stars of the bed's palace (Mountain 山
//  highlighted), and the sitting hexagram (from the 64-hex ring at
//  the Bed Sitting degree). The sitting hexagram MUST be Zheng Shen
//  (yun 6–9, or 1–4 post-2044); if not, suggest the nearest ZS sitting.
//  Person compatibility (period/element) + SCAN come in pieces 2–3.
// ═══════════════════════════════════════════════════════════════
function _fsGetActiveChart(){
  if (window._fsManualChart) return window._fsManualChart;
  if (typeof FlyingStars === 'undefined') return null;
  var hf = parseFloat((document.getElementById('fs-house-facing') || {}).value);
  var pd = parseInt((document.getElementById('fs-period') || {}).value, 10);
  if (isNaN(hf) || isNaN(pd) || pd < 1 || pd > 9) return null;
  try { return FlyingStars.calculate(pd, fsMountainCharFromDeg(hf)); }
  catch(e){ return null; }
}

function _fsBedNearestZS(deg){
  if (!Array.isArray(FS_SLOTS)) return null;
  var d0 = ((deg % 360) + 360) % 360;
  var best = null, bestD = Infinity;
  FS_SLOTS.forEach(function(s){
    if (!fsIsZhengShen(s.yun)) return;
    var d = fsAngularDist(s.centerDeg, d0);
    if (d < bestD){ bestD = d; best = s; }
  });
  return best;
}

function fsBuildBedPanel(){
  var panel = document.getElementById('fs-bed-panel');
  if (!panel || panel.dataset.built === '1') return;
  panel.dataset.built = '1';
  panel.innerHTML =
    '<div style="background:#f3e5f5;border:1px solid #9c27b0;border-radius:8px;padding:10px;margin-bottom:10px;">'
    + '<div style="font-size:12px;font-weight:bold;color:#6a1b9a;margin-bottom:8px;">🛏 Bed setup</div>'
    + '<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;">'
      + '<div style="flex:1;min-width:130px;">'
        + '<label style="font-size:11px;color:#666;display:block;">Bed palace (where the bed is)</label>'
        + '<select id="fs-bed-palace" onchange="fsBedReadChart()" style="width:100%;padding:6px;border:1px solid #9c27b0;border-radius:4px;font-size:14px;">'
          + '<option value="">— select —</option>'
          + '<option value="N">N 坎</option><option value="NE">NE 艮</option><option value="E">E 震</option><option value="SE">SE 巽</option>'
          + '<option value="S">S 離</option><option value="SW">SW 坤</option><option value="W">W 兌</option><option value="NW">NW 乾</option>'
        + '</select>'
      + '</div>'
      + '<div style="flex:1;min-width:130px;">'
        + '<label style="font-size:11px;color:#666;display:block;">Bed Sitting (°) — headboard</label>'
        + '<input type="number" id="fs-bed-sitting" min="0" max="360" step="0.1" placeholder="e.g. 0" oninput="fsBedReadChart()" style="width:100%;padding:6px;border:1px solid #9c27b0;border-radius:4px;font-size:14px;">'
      + '</div>'
    + '</div>'
    + '<div id="fs-bed-readout" style="margin-top:10px;font-size:13px;line-height:1.5;"></div>'
    + '<div style="margin-top:10px;display:flex;gap:8px;align-items:stretch;"><button onclick="fsBedScan()" style="flex:1;background:linear-gradient(135deg,#6a1b9a,#9c27b0);color:#fff;font-weight:bold;font-size:14px;padding:10px;border:none;border-radius:8px;cursor:pointer;">🔎 SCAN lucky dates to move the bed</button><button class="fs-recall-fs-btn" onclick="fsRecallFlyingStars()" style="background:#fff;color:#8a6a1f;border:1px solid #8a6a1f;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">⭐ Recall Flying Stars</button></div>'
    + '<div id="fs-bed-results" style="margin-top:10px;"></div>'
    + '</div>';
}

function fsBedReadChart(){
  try {
    var box = document.getElementById('fs-bed-readout');
    if (!box) return;
    var dir = (document.getElementById('fs-bed-palace') || {}).value || '';
    var sitDeg = parseFloat((document.getElementById('fs-bed-sitting') || {}).value);
    var parts = [];

    // ── Palace 3 stars (Mountain highlighted) ──
    if (!dir){
      parts.push('<div style="color:#999;">Select the bed palace.</div>');
    } else {
      var chart = _fsGetActiveChart();
      if (!chart){
        parts.push('<div style="color:#c0392b;">Enter House Facing + Period (or set a ⭐ Manual chart) in the base above to read the palace stars.</div>');
      } else {
        var di = (typeof FlyingStars !== 'undefined' && FlyingStars.DIR_TO_INDEX) ? FlyingStars.DIR_TO_INDEX[dir] : null;
        if (di == null){
          parts.push('<div style="color:#c0392b;">Unknown palace.</div>');
        } else {
          var mt = chart.sittingStars[di], bs = chart.baseStars[di], fc = chart.facingStars[di];
          parts.push('<div style="margin-bottom:6px;">Palace <strong>' + dir + '</strong>: '
            + '<span style="color:#0a6e1f;font-weight:bold;">山 ' + mt + '</span> · '
            + '<span style="color:#1a1008;">運 ' + bs + '</span> · '
            + '<span style="color:#cc0000;">向 ' + fc + '</span> '
            + '<span style="background:#0a6e1f;color:#fff;border-radius:6px;padding:1px 8px;font-size:11px;margin-left:4px;">Mountain ★ ' + mt + '</span></div>');
        }
      }
    }

    // ── Sitting hexagram + Zheng Shen gate ──
    if (isNaN(sitDeg)){
      parts.push('<div style="color:#999;">Enter the Bed Sitting degree.</div>');
    } else {
      var slot = fsSlotForDeg(sitDeg);
      var glyph = (typeof fsHexGlyph === 'function') ? fsHexGlyph(slot.hexNum) : ('#' + slot.hexNum);
      parts.push('<div style="margin-bottom:4px;">Sitting hexagram: <strong>' + glyph + ' hex ' + slot.hexNum + '</strong> · qi ' + slot.qi + ' · yun ' + slot.yun + '</div>');
      var zsRange = (typeof FS_POST_2044 !== 'undefined' && FS_POST_2044) ? '1–4' : '6–9';
      if (fsIsZhengShen(slot.yun)){
        parts.push('<div style="color:#2e7d32;font-weight:bold;">正神 Zheng Shen ✓ (yun ' + slot.yun + ')</div>');
      } else {
        parts.push('<div style="color:#c0392b;font-weight:bold;">NOT Zheng Shen ✗ (yun ' + slot.yun + ') — the sitting hexagram must be yun ' + zsRange + '.</div>');
        var sug = _fsBedNearestZS(sitDeg);
        if (sug){
          parts.push('<div style="margin-top:4px;color:#6a1b9a;">Nearest Zheng Shen sitting: <strong>' + sug.centerDeg.toFixed(1) + '°</strong> (hex ' + sug.hexNum + ', yun ' + sug.yun + ') '
            + '<button onclick="document.getElementById(\'fs-bed-sitting\').value=' + sug.centerDeg.toFixed(1) + ';fsBedReadChart();" style="background:#9c27b0;color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:bold;cursor:pointer;margin-left:6px;">Use</button></div>');
        }
      }

      // ── Person compatibility (Piece 2): period / element links ──
      parts.push(_fsBedCompatHTML(slot));
    }

    box.innerHTML = parts.join('');
    if (typeof fsRedraw === 'function') fsRedraw();
  } catch(err){ console.warn('fsBedReadChart', err); }
}

// ═══════════════════════════════════════════════════════════════
//  BED SECTION — piece 2 (additive): person ↔ sitting compatibility
//  Rules (same as Main): a hexagram connects via PERIOD when the two
//  yun form a Hetu pair (1-6,2-7,3-8,4-9) or an Adding pair (sum
//  5/10/15); via ELEMENT when the two qi do the same. A person is
//  compatible with the sitting hexagram if at least one link holds.
//  If incompatible, suggest the nearest Zheng Shen sitting that is
//  compatible with every loaded person. (The two-person combined
//  verdict + lucky dates, incl. the crossed rule, are SCAN / piece 3.)
// ═══════════════════════════════════════════════════════════════
function _fsHexConnect(qi1, yun1, qi2, yun2){
  var add = function(a, b){ var s = a + b; return s === 5 || s === 10 || s === 15; };
  return {
    periodLink:  (typeof isHetuPair === 'function' && isHetuPair(yun1, yun2)) || add(yun1, yun2),
    elementLink: (typeof isHetuPair === 'function' && isHetuPair(qi1, qi2))  || add(qi1, qi2)
  };
}

// Full "communication" check between two hexagrams. What matters is THAT they
// communicate — not how — so this accepts ANY mechanism the app recognises:
// Hetu (qi/yun), Adding (qi/yun), Pure Qi, Family, Inverse Hex. Returns
// { connected, labels } where labels names the mechanism(s) for display.
// (Replaces the reduced _fsHexConnect, which only saw Hetu/Adding on qi/yun.)
function _fsCommunicate(hexA, qiA, yunA, hexB, qiB, yunB){
  var labels = (typeof hexConnectionLabels === 'function')
    ? hexConnectionLabels(hexA, qiA, yunA, hexB, qiB, yunB) : [];
  return { connected: labels.length > 0, labels: labels };
}
// Compact, human-readable rendering of communication labels.
function _fsCommText(labels){
  if (!labels || !labels.length) return '—';
  return labels.map(function(t){
    return String(t)
      .replace('Hetu (qi)',  '氣 Hetu').replace('Hetu (yun)', '運 Hetu')
      .replace(/Adding qi=\d+/, '氣 Adding').replace(/Adding yun=\d+/, '運 Adding')
      .replace('Pure Qi (qi)', '氣 Pure').replace('Pure Qi (yun)', '運 Pure')
      .replace(/Family:.*/, 'Family').replace('Inverse Hex', 'Inverse');
  }).join(', ');
}

function _fsBedPersons(){
  var c = (typeof fsGetCurrentContext === 'function') ? fsGetCurrentContext() : {};
  var arr = [];
  if (c.pAHex != null) arr.push({ who: 'A', label: c.pALabel || '', hex: c.pAHex, qi: c.pAQi, yun: c.pAYun });
  if (c.pBHex != null) arr.push({ who: 'B', label: c.pBLabel || '', hex: c.pBHex, qi: c.pBQi, yun: c.pBYun });
  return arr;
}

function _fsBedNearestCompatibleZS(deg, persons){
  if (!Array.isArray(FS_SLOTS) || !persons.length) return null;
  var d0 = ((deg % 360) + 360) % 360;
  var best = null, bestD = Infinity;
  FS_SLOTS.forEach(function(s){
    if (!fsIsZhengShen(s.yun)) return;
    var allOk = persons.every(function(p){
      return _fsCommunicate(p.hex, p.qi, p.yun, s.hexNum, s.qi, s.yun).connected;
    });
    if (!allOk) return;
    var d = fsAngularDist(s.centerDeg, d0);
    if (d < bestD){ bestD = d; best = s; }
  });
  return best;
}

function _fsBedCompatHTML(slot){
  var persons = _fsBedPersons();
  if (!persons.length){
    return '<div style="margin-top:8px;font-size:12px;color:#999;">Load a person (A or B) to check compatibility with this sitting.</div>';
  }
  var html = '<div style="margin-top:8px;padding-top:6px;border-top:1px solid #e1bee7;">'
    + '<div style="font-size:12px;font-weight:bold;color:#6a1b9a;margin-bottom:4px;">Communication with the sitting hexagram</div>';
  var anyIncompat = false;
  persons.forEach(function(p){
    var c = _fsCommunicate(p.hex, p.qi, p.yun, slot.hexNum, slot.qi, slot.yun);
    if (!c.connected) anyIncompat = true;
    html += '<div style="font-size:12px;margin:2px 0;">'
      + '<strong>' + p.who + '</strong> ' + (p.label ? '<span style="color:#888;">' + p.label + '</span> ' : '')
      + '→ ' + (c.connected
            ? '<span style="color:#2e7d32;font-weight:bold;">communicates</span> <span style="color:#888;">(' + _fsCommText(c.labels) + ')</span>'
            : '<span style="color:#c0392b;font-weight:bold;">no communication</span>')
      + '</div>';
  });
  if (anyIncompat){
    var sit = parseFloat((document.getElementById('fs-bed-sitting') || {}).value);
    var sug = isNaN(sit) ? null : _fsBedNearestCompatibleZS(sit, persons);
    if (sug){
      html += '<div style="margin-top:4px;font-size:12px;color:#6a1b9a;">Suggested sitting compatible with '
        + (persons.length > 1 ? 'both' : 'the person') + ': <strong>' + sug.centerDeg.toFixed(1) + '°</strong> (hex ' + sug.hexNum + ', yun ' + sug.yun + ') '
        + '<button onclick="document.getElementById(\'fs-bed-sitting\').value=' + sug.centerDeg.toFixed(1) + ';fsBedReadChart();" style="background:#9c27b0;color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:bold;cursor:pointer;margin-left:6px;">Use</button></div>';
    } else {
      html += '<div style="margin-top:4px;font-size:12px;color:#c0392b;">No nearby Zheng Shen sitting is compatible with ' + (persons.length > 1 ? 'both persons' : 'the person') + '.</div>';
    }
  }
  if (persons.length > 1){
    html += '<div style="margin-top:4px;font-size:11px;color:#888;">Two people: the combined verdict and the lucky dates (including the crossed period/element rule) come from SCAN — next piece.</div>';
  }
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════════════════════
//  SHARED SCAN ENGINE — piece 3: lucky dates (person ↔ date ↔ placement)
//  Confirmed rule — a date passes when the "loop" closes:
//    • date ↔ placement (facing/sitting): at least one link (period or element);
//    • for every involved person p:
//        - date ↔ p: at least one link;
//        - period covered: (p↔placement period) OR (p↔date period);
//        - element covered: (p↔placement element) OR (p↔date element).
//  Two people (Bed) → both must pass: the date fills each one's missing
//  channel. One person (Desk) → that person must pass.
//  Reuses getXkdgData (day hexagram), the toolbar date range, and the
//  longitude/UTC/DST offset, exactly like the existing FS scans.
// ═══════════════════════════════════════════════════════════════
function _fsIsoLocal(dt){
  var y = dt.getFullYear();
  var m = ('0' + (dt.getMonth() + 1)).slice(-2);
  var d = ('0' + dt.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}

// One date evaluation against a placement (sitting/facing) slot for a set of
// persons. The loop closes when every pair COMMUNICATES — by any mechanism
// (Hetu, Adding, Pure Qi, Family, Inverse). The kind of communication does not
// matter, only that it exists. Returns
// { pass, dateLink, perPerson:[{who,label,ps,pd,ok}] }.
function _fsEvalDateForPlacement(persons, slot, dayHex, dayQi, dayYun){
  var dl = _fsCommunicate(slot.hexNum, slot.qi, slot.yun, dayHex, dayQi, dayYun);  // date ↔ placement
  var res = { pass: false, dateLink: dl, perPerson: [] };
  if (!dl.connected) return res;                                // date must communicate with the placement
  var allOk = (persons.length > 0);
  persons.forEach(function(p){
    var ps = _fsCommunicate(p.hex, p.qi, p.yun, slot.hexNum, slot.qi, slot.yun);   // person ↔ placement (fixed)
    var pd = _fsCommunicate(p.hex, p.qi, p.yun, dayHex, dayQi, dayYun);            // person ↔ date (varies)
    var ok = ps.connected && pd.connected;                       // person must communicate with BOTH
    if (!ok) allOk = false;
    res.perPerson.push({ who: p.who, label: p.label, ps: ps, pd: pd, ok: ok });
  });
  res.pass = allOk;
  return res;
}

// Scans the toolbar date range and returns the passing dates (max `maxResults`).
function _fsScanLuckyDates(persons, slot, maxResults){
  var out = [];
  if (typeof Solar === 'undefined' || typeof getXkdgData !== 'function') return out;
  var startVal = (document.getElementById('scan-start') || {}).value;
  if (!startVal) return out;
  var days = (typeof window._fsRangeDays === 'number' && window._fsRangeDays > 0)
           ? window._fsRangeDays
           : (parseInt((document.getElementById('scan-days') || {}).value) || 60);
  var lon = parseFloat((document.getElementById('longitude') || {}).value);
  var utc = parseFloat((document.getElementById('utc-offset') || {}).value);
  if (isNaN(lon) || isNaN(utc)) return out;
  var dstOn = (typeof _dstOn !== 'undefined') ? _dstOn : false;
  var offsetMin = (lon - utc * 15) * 4 - (dstOn ? 60 : 0);
  var start = new Date(startVal + 'T00:00:00');
  var cap = (typeof maxResults === 'number') ? maxResults : 120;

  for (var d = 0; d < days; d++){
    var dayDate = new Date(start.getTime() + d * 86400000);
    var iso = _fsIsoLocal(dayDate);
    if (typeof isDateAllowed === 'function' && !isDateAllowed(iso)) continue; // honor license cap
    var midDay = new Date(dayDate); midDay.setHours(12, 0, 0, 0);
    var dGan, dZhi, dData;
    try {
      var _Pn3 = (function(){ try {
          if (typeof XKDGSolarTime === 'undefined') return null;
          var lt = XKDGSolarTime.currentLonTz(); if (!isFinite(lt.lonDeg)) return null;
          return XKDGSolarTime.pillarsFromCivil(dayDate.getFullYear(), dayDate.getMonth()+1, dayDate.getDate(), 12, 0, 0, lt.lonDeg, lt.tzOffsetMin);
      } catch(e){ return null; } })();
      if (_Pn3) { dGan = _Pn3.day.charAt(0); dZhi = _Pn3.day.charAt(1); }
      else { var ec = Solar.fromDate(new Date(midDay.getTime() + offsetMin * 60000)).getLunar().getEightChar(); dGan = ec.getDayGan(); dZhi = ec.getDayZhi(); }
      dData = getXkdgData(dGan, dZhi);
    } catch(e){ continue; }
    if (!dData) continue;
    var ev = _fsEvalDateForPlacement(persons, slot, dData.hex, dData.qi, dData.yun);
    if (ev.pass){
      out.push({ iso: iso, dGan: dGan, dZhi: dZhi, dData: dData, eval: ev });
      if (out.length >= cap) break;
    }
  }
  return out;
}

// ── Bed SCAN (piece 3) — two-person aware ──
function fsBedScan(){
  try {
    var box = document.getElementById('fs-bed-results');
    if (!box) return;
    var persons = _fsBedPersons();
    if (!persons.length){ box.innerHTML = '<div style="color:#c0392b;font-size:12px;">Load a person (A or B) first.</div>'; return; }
    var sitDeg = parseFloat((document.getElementById('fs-bed-sitting') || {}).value);
    if (isNaN(sitDeg)){ box.innerHTML = '<div style="color:#c0392b;font-size:12px;">Enter the Bed Sitting degree first.</div>'; return; }
    var slot = fsSlotForDeg(sitDeg);
    if (!fsIsZhengShen(slot.yun)){ box.innerHTML = '<div style="color:#c0392b;font-size:12px;">The sitting hexagram must be Zheng Shen before scanning.</div>'; return; }
    if (!(document.getElementById('scan-start') || {}).value){ box.innerHTML = '<div style="color:#c0392b;font-size:12px;">Set a FROM date and DAYS in the toolbar first.</div>'; return; }
    box.innerHTML = '<div style="color:#888;font-size:12px;">Scanning…</div>';
    var matches = _fsScanLuckyDates(persons, slot, 120);
    box.innerHTML = _fsBedScanHTML(persons, slot, matches);
  } catch(err){ console.warn('fsBedScan', err); }
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' (Chinese ganzhi is shown separately, unchanged).
function _fsFmtDMY(iso){
  var p = String(iso).split('-');
  return (p.length === 3) ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}

// Plain-language explanation of WHEN a date is lucky (shown above the list).
function _fsLuckyLegend(kind){
  var place = (kind === 'desk') ? 'desk facing' : 'bed sitting';
  var who   = (kind === 'desk') ? 'the person who sits' : 'each loaded person (A and/or B)';
  return '<div style="background:#faf3ff;border:1px solid #e1bee7;border-radius:6px;padding:8px;font-size:11px;color:#4a148c;line-height:1.5;margin-bottom:8px;">'
    + '<b>What makes a date lucky?</b> What matters is that the hexagrams <b>communicate</b> — not how. '
    + 'Two hexagrams communicate when they share <u>any</u> of these links: Hetu pair, Adding (sum 5/10/15), '
    + 'Pure Qi (same number), same Family, or Inverse hexagram (運 = period numbers, 氣 = element numbers).<br>'
    + 'A day passes when the loop closes: ① the <b>date</b> communicates with the <b>' + place + '</b>; and for ' + who + ' — '
    + '② the person communicates with the <b>' + place + '</b> (the fixed link) <b>and</b> ③ the person communicates with the <b>date</b> (this is the part that changes day to day). '
    + 'Each line below shows the kind of communication for every pair.'
    + '</div>';
}

// One lucky-date row: dd/mm/yyyy + ganzhi + the date's own 運/氣, then per person
// HOW the date communicates with the person and with the placement (any mechanism).
function _fsLuckyDateRowHTML(m, persons, slot, placeWord){
  var dQi = m.dData.qi, dYun = m.dData.yun;
  var perHtml = m.eval.perPerson.map(function(pp){
    return '<div style="margin-top:3px;"><span style="color:#6a1b9a;font-weight:bold;">' + pp.who
      + '</span> communicates with the ' + placeWord + ': <b>' + _fsCommText(pp.ps.labels)
      + '</b> &nbsp;·&nbsp; with the date: <b>' + _fsCommText(pp.pd.labels) + '</b></div>';
  }).join('');
  return '<div style="border-top:1px solid #eee;padding:6px 0;font-size:12px;">'
    + '<strong>' + _fsFmtDMY(m.iso) + '</strong> · ' + m.dGan + m.dZhi
    + ' <span style="color:#555;">· 運 ' + dYun + ' · 氣 ' + dQi + '</span>'
    + ' <span style="color:#999;">(hex ' + m.dData.hex + ')</span>'
    + '<div style="font-size:11px;color:#666;margin-top:2px;">The date communicates with the ' + placeWord + ': <b>' + _fsCommText(m.eval.dateLink.labels) + '</b></div>'
    + '<div style="font-size:11px;color:#444;">' + perHtml + '</div>'
    + '</div>';
}

function _fsBedScanHTML(persons, slot, matches){
  if (!matches.length){
    return '<div style="background:#fff3e0;border:1px solid #ffb74d;border-radius:6px;padding:8px;font-size:12px;color:#e65100;">No lucky dates in this range. Try a wider range, or a different sitting (compatibility may not close the loop here).</div>';
  }
  var html = '<div style="font-size:12px;font-weight:bold;color:#6a1b9a;margin-bottom:6px;">Lucky dates to move the bed — ' + matches.length + ' found</div>';
  matches.forEach(function(m){ html += _fsLuckyDateRowHTML(m, persons, slot, 'bed sitting'); });
  return html;
}

// ═══════════════════════════════════════════════════════════════
//  DESK SECTION — dedicated panel (single active person)
//  Flow (almost the facing/water flow, but compatibility is vs the PERSON):
//   • Desk Facing must be Zheng Shen AND compatible with the person who sits
//     (period/element). If not, suggest the nearest Zheng Shen facing that
//     suits the person.
//   • Propitious Water positions: Ling Shen (1-4), within ±FS_WATER_MAX_DEG of
//     the facing, matching the facing (fsWaterMatchVsFacing) AND suiting the
//     person.
//   • SCAN: shared engine with ONE person, placement = the desk facing —
//     lucky dates to orient the desk and place the moving water.
//  The person who sits is the active one; switching means loading another
//  person. When both A and B are loaded, a small selector picks who sits.
// ═══════════════════════════════════════════════════════════════
function fsBuildDeskPanel(){
  var panel = document.getElementById('fs-desk-panel');
  if (!panel || panel.dataset.built === '1') return;
  panel.dataset.built = '1';
  panel.innerHTML =
    '<div style="background:#f3e5f5;border:1px solid #ce93d8;border-radius:10px;padding:12px;">'
    + '<div style="font-weight:bold;color:#6a1b9a;font-size:15px;margin-bottom:8px;">🪑 Desk — facing &amp; water for the person who sits</div>'
    + '<div id="fs-desk-person" style="margin-bottom:8px;"></div>'
    + '<label style="font-size:12px;color:#555;">Desk Facing (°)</label>'
    + '<input id="fs-desk-facing" type="number" step="0.1" min="0" max="360" placeholder="e.g. 175.5" '
    + 'oninput="fsDeskReadChart()" style="width:100%;padding:8px;margin:4px 0 8px;border:1px solid #ce93d8;border-radius:6px;font-size:14px;box-sizing:border-box;" />'
    + '<div id="fs-desk-readout" style="font-size:13px;line-height:1.5;"></div>'
    + '<div style="margin-top:10px;display:flex;gap:8px;align-items:stretch;"><button onclick="fsDeskScan()" style="flex:1;background:linear-gradient(135deg,#6a1b9a,#9c27b0);color:#fff;font-weight:bold;font-size:14px;padding:10px;border:none;border-radius:8px;cursor:pointer;">🔎 SCAN lucky dates to set up the desk &amp; water</button><button class="fs-recall-fs-btn" onclick="fsRecallFlyingStars()" style="background:#fff;color:#8a6a1f;border:1px solid #8a6a1f;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">⭐ Recall Flying Stars</button></div>'
    + '<div id="fs-desk-results" style="margin-top:10px;"></div>'
    + '</div>';
}

function _fsDeskPerson(){
  var persons = _fsBedPersons();
  if (!persons.length) return null;
  if (persons.length === 1) return persons[0];
  var who = window._fsDeskWho || 'A';
  return persons.filter(function(p){ return p.who === who; })[0] || persons[0];
}

function _fsDeskPersonSelectorHTML(){
  var persons = _fsBedPersons();
  if (!persons.length) return '<div style="font-size:12px;color:#c0392b;">No person loaded — load the person who sits at the desk.</div>';
  if (persons.length === 1){
    return '<div style="font-size:12px;color:#555;">Person who sits: <strong>' + persons[0].who + '</strong>' + (persons[0].label ? ' <span style="color:#888;">' + persons[0].label + '</span>' : '') + '</div>';
  }
  var who = window._fsDeskWho || 'A';
  return '<div style="font-size:12px;color:#555;margin-bottom:4px;">Person who sits:</div>'
    + persons.map(function(p){
        var on = (p.who === who);
        return '<button onclick="window._fsDeskWho=\'' + p.who + '\';fsDeskReadChart();" style="background:' + (on ? '#9c27b0' : '#eee') + ';color:' + (on ? '#fff' : '#555') + ';border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;margin-right:6px;">' + p.who + (p.label ? ' · ' + p.label : '') + '</button>';
      }).join('');
}

function _fsDeskNearestGoodFacing(deg, person){
  if (!Array.isArray(FS_SLOTS) || !person) return null;
  var d0 = ((deg % 360) + 360) % 360;
  var best = null, bestD = Infinity;
  FS_SLOTS.forEach(function(s){
    if (!fsIsZhengShen(s.yun)) return;
    if (!_fsCommunicate(person.hex, person.qi, person.yun, s.hexNum, s.qi, s.yun).connected) return;
    var d = fsAngularDist(s.centerDeg, d0);
    if (d < bestD){ bestD = d; best = s; }
  });
  return best;
}

function _fsDeskWaterList(facingSlot, person){
  var out = [];
  if (!Array.isArray(FS_SLOTS)) return out;
  FS_SLOTS.forEach(function(s){
    if (s.hexNum === facingSlot.hexNum) return;
    if (!fsIsLingShen(s.yun)) return;
    var dist = fsAngularDist(facingSlot.centerDeg, s.centerDeg);
    if (dist > FS_WATER_MAX_DEG) return;
    var mLabels = fsWaterMatchVsFacing(facingSlot, s);
    if (!mLabels.length) return;
    var pl = person ? _fsCommunicate(person.hex, person.qi, person.yun, s.hexNum, s.qi, s.yun) : null;
    if (person && !pl.connected) return; // must suit the person
    out.push({ slot: s, matchLabels: mLabels, link: pl, dist: dist });
  });
  out.sort(function(a, b){ return a.dist - b.dist; });
  return out;
}

function fsDeskReadChart(){
  try {
    var sel = document.getElementById('fs-desk-person');
    if (sel) sel.innerHTML = _fsDeskPersonSelectorHTML();
    var box = document.getElementById('fs-desk-readout');
    if (!box) return;
    var person = _fsDeskPerson();
    var fDeg = parseFloat((document.getElementById('fs-desk-facing') || {}).value);
    if (isNaN(fDeg)){
      box.innerHTML = '<div style="color:#888;font-size:12px;">Enter the Desk Facing degree to begin.</div>';
      return;
    }
    var slot = fsSlotForDeg(fDeg);
    var glyph = (typeof fsHexGlyph === 'function') ? fsHexGlyph(slot.hexNum) : ('#' + slot.hexNum);
    var parts = [];
    parts.push('<div style="font-size:12px;">Desk Facing hexagram: <strong>' + glyph + '</strong> (hex ' + slot.hexNum + ', qi ' + slot.qi + ', yun ' + slot.yun + ')</div>');
    var isZS = fsIsZhengShen(slot.yun);
    parts.push('<div style="font-size:12px;margin-top:2px;">Zheng Shen: ' + (isZS ? '<span style="color:#2e7d32;font-weight:bold;">yes ✓</span>' : '<span style="color:#c0392b;font-weight:bold;">no — the desk facing must be Zheng Shen</span>') + '</div>');

    var compatOk = false;
    if (!person){
      parts.push('<div style="font-size:12px;color:#999;margin-top:4px;">Load a person to check compatibility and water positions.</div>');
    } else {
      var c = _fsCommunicate(person.hex, person.qi, person.yun, slot.hexNum, slot.qi, slot.yun);
      compatOk = c.connected;
      parts.push('<div style="font-size:12px;margin-top:4px;"><strong>' + person.who + '</strong> ' + (person.label ? '<span style="color:#888;">' + person.label + '</span> ' : '')
        + '→ ' + (compatOk
            ? '<span style="color:#2e7d32;font-weight:bold;">communicates</span> <span style="color:#888;">(' + _fsCommText(c.labels) + ')</span>'
            : '<span style="color:#c0392b;font-weight:bold;">no communication</span>') + '</div>');
    }

    if (person && (!isZS || !compatOk)){
      var sug = _fsDeskNearestGoodFacing(fDeg, person);
      if (sug){
        parts.push('<div style="margin-top:4px;font-size:12px;color:#6a1b9a;">Nearest Zheng Shen facing that suits the person: <strong>' + sug.centerDeg.toFixed(1) + '°</strong> (hex ' + sug.hexNum + ', yun ' + sug.yun + ') '
          + '<button onclick="document.getElementById(\'fs-desk-facing\').value=' + sug.centerDeg.toFixed(1) + ';fsDeskReadChart();" style="background:#9c27b0;color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:bold;cursor:pointer;margin-left:6px;">Use</button></div>');
      } else {
        parts.push('<div style="margin-top:4px;font-size:12px;color:#c0392b;">No nearby Zheng Shen facing suits the person.</div>');
      }
    }

    if (isZS){
      var waters = _fsDeskWaterList(slot, person);
      parts.push('<div style="margin-top:8px;padding-top:6px;border-top:1px solid #e1bee7;"><div style="font-size:12px;font-weight:bold;color:#6a1b9a;margin-bottom:4px;">Propitious water positions (Ling Shen, within ±' + FS_WATER_MAX_DEG + '°, matching the facing' + (person ? ' &amp; the person' : '') + ')</div>');
      if (!waters.length){
        parts.push('<div style="font-size:12px;color:#c0392b;">None found for this facing' + (person ? ' / person' : '') + '.</div>');
      } else {
        waters.slice(0, 8).forEach(function(w){
          var pTxt = '';
          if (w.link && w.link.connected){
            pTxt = ' · person: ' + _fsCommText(w.link.labels);
          }
          parts.push('<div style="font-size:12px;margin:2px 0;">💧 <strong>' + w.slot.centerDeg.toFixed(1) + '°</strong> (hex ' + w.slot.hexNum + ', yun ' + w.slot.yun + ') <span style="color:#888;">— ' + w.matchLabels.join(', ') + pTxt + '</span></div>');
        });
      }
      parts.push('</div>');
    }
    box.innerHTML = parts.join('');
    if (typeof fsRedraw === 'function') fsRedraw();
  } catch(err){ console.warn('fsDeskReadChart', err); }
}

function fsDeskScan(){
  try {
    var box = document.getElementById('fs-desk-results');
    if (!box) return;
    var person = _fsDeskPerson();
    if (!person){ box.innerHTML = '<div style="color:#c0392b;font-size:12px;">Load the person who sits first.</div>'; return; }
    var fDeg = parseFloat((document.getElementById('fs-desk-facing') || {}).value);
    if (isNaN(fDeg)){ box.innerHTML = '<div style="color:#c0392b;font-size:12px;">Enter the Desk Facing degree first.</div>'; return; }
    var slot = fsSlotForDeg(fDeg);
    if (!fsIsZhengShen(slot.yun)){ box.innerHTML = '<div style="color:#c0392b;font-size:12px;">The desk facing must be Zheng Shen before scanning.</div>'; return; }
    if (!(document.getElementById('scan-start') || {}).value){ box.innerHTML = '<div style="color:#c0392b;font-size:12px;">Set a FROM date and DAYS in the toolbar first.</div>'; return; }
    box.innerHTML = '<div style="color:#888;font-size:12px;">Scanning…</div>';
    var matches = _fsScanLuckyDates([person], slot, 120);
    box.innerHTML = _fsDeskScanHTML(person, slot, matches);
  } catch(err){ console.warn('fsDeskScan', err); }
}

function _fsDeskScanHTML(person, slot, matches){
  if (!matches.length){
    return '<div style="background:#fff3e0;border:1px solid #ffb74d;border-radius:6px;padding:8px;font-size:12px;color:#e65100;">No lucky dates in this range. Try a wider range, or a facing that better suits the person.</div>';
  }
  var html = '<div style="font-size:12px;font-weight:bold;color:#6a1b9a;margin-bottom:6px;">Lucky dates to set up the desk &amp; place the moving water — ' + matches.length + ' found</div>';
  matches.forEach(function(m){ html += _fsLuckyDateRowHTML(m, [person], slot, 'desk facing'); });
  return html;
}

// ═══════════════════════════════════════════════════════════════
//  LUOPAN VISIBILITY — flying-stars domain belongs to the MAIN sector
//  Main (no section chosen): the Flying Stars block + the luopan (showing the
//  flying stars) are visible. Inside a section (Water/Bed/Desk): the flying
//  stars are NOT repeated — the block is hidden and the luopan shows the
//  section's own data once filled (e.g. Water shows it after a Door Facing is
//  entered). The house flying-stars chart can still be recalled on demand with
//  the "Recall Flying Stars" button (window._fsFSRecalled).
// ═══════════════════════════════════════════════════════════════
function _fsUpdateLuopanVis(){
  try {
    var fsBlock = document.getElementById('fs-flying-stars-block');
    var wrap    = document.getElementById('fs-canvas-wrap');
    var legend  = document.getElementById('fs-legend');
    var modeBtn = document.getElementById('fs-mode-fs');
    var modeToggle = modeBtn ? modeBtn.parentNode : null;
    var inSection = !!window._fsActiveZone;

    // Flying-stars input block: main sector only.
    if (fsBlock) fsBlock.style.display = inSection ? 'none' : '';
    // House Profiles also belong to the main sector only.
    var hp = document.getElementById('fs-house-profiles');
    if (hp) hp.style.display = inSection ? 'none' : '';
    // General water-feature block: it is the ① part of the Water section, so it
    // must stay visible there. Hide it only in the Bed/Desk sections. (In MAIN it
    // sits inside the hidden zone-tools wrapper, so display:'' is harmless.)
    var wact = document.getElementById('fs-wateract-block');
    if (wact) wact.style.display = (inSection && window._fsActiveZone !== 'water') ? 'none' : '';
    // Operative area: main sector only.
    var op = document.getElementById('fs-operative');
    if (op) op.style.display = inSection ? 'none' : '';

    var showLuopan;
    if (!inSection){
      showLuopan = true;                         // main: flying stars luopan
    } else {
      var hasData;
      if (window._fsActiveZone === 'bed'){
        var bs = (document.getElementById('fs-bed-sitting') || {}).value;
        hasData = !!(bs && String(bs).trim() !== '');
      } else if (window._fsActiveZone === 'desk'){
        var df = (document.getElementById('fs-desk-facing') || {}).value;
        hasData = !!(df && String(df).trim() !== '');
      } else {
        var f = (document.getElementById('fs-facing') || {}).value;
        hasData = !!(f && String(f).trim() !== '');
      }
      showLuopan = hasData || !!window._fsFSRecalled; // section's own data, or recalled
    }
    if (wrap)       wrap.style.display       = showLuopan ? '' : 'none';
    if (legend)     legend.style.display     = showLuopan ? '' : 'none';
    if (modeToggle) modeToggle.style.display = showLuopan ? '' : 'none';
  } catch(err){ console.warn('_fsUpdateLuopanVis', err); }
}

// Toggle: deliberately recall (or hide again) the house flying-stars chart on
// the section's luopan. Works in any of the three sections.
function fsRecallFlyingStars(){
  try {
    window._fsFSRecalled = !window._fsFSRecalled;
    _fsSyncRecallButtons();
    if (typeof fsRedraw === 'function') fsRedraw();
  } catch(err){ console.warn('fsRecallFlyingStars', err); }
}
function _fsSyncRecallButtons(){
  try {
    var on = !!window._fsFSRecalled;
    var btns = document.querySelectorAll('.fs-recall-fs-btn');
    for (var i = 0; i < btns.length; i++){
      btns[i].style.background = on ? '#8a6a1f' : '#fff';
      btns[i].style.color      = on ? '#fff' : '#8a6a1f';
      btns[i].textContent      = on ? '⭐ Hide Flying Stars' : '⭐ Recall Flying Stars';
    }
  } catch(e){}
}

// ═══════════════════════════════════════════════════════════════
//  SECTION LUOPAN — Bed & Desk draw their own data on the compass
//  Bed: Zheng/Ling tint + the Sitting arrow (gold slot). Desk: tint +
//  Facing arrow (gold slot) + ±FS_WATER_MAX_DEG band + propitious water
//  slots (cyan). If flying stars are recalled (window._fsFSRecalled) the
//  house FS chart is overlaid on top. Same geometry as fsRedraw.
// ═══════════════════════════════════════════════════════════════
function fsDrawSectionLuopan(){
  try {
    var zone = window._fsActiveZone;
    if (zone !== 'bed' && zone !== 'desk') return;
    var canvas = document.getElementById('fs-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    var PAD = 100, IMG_W = 900, IMG_H = 930;
    var cx = PAD + 450, cy = PAD + 464;
    var outerR = 447, rHexOut = 360, rHexIn = 295;

    if (typeof FS_LUOPAN_IMG !== 'undefined' && FS_LUOPAN_IMG.complete && FS_LUOPAN_IMG.naturalWidth > 0)
      ctx.drawImage(FS_LUOPAN_IMG, PAD, PAD, IMG_W, IMG_H);

    function paintCell(slot, color){
      var aS = (slot.startDeg - 270) * Math.PI / 180;
      var aE = (slot.endDeg   - 270) * Math.PI / 180;
      ctx.save(); ctx.beginPath();
      ctx.arc(cx, cy, rHexOut, aS, aE);
      ctx.arc(cx, cy, rHexIn,  aE, aS, true);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
    }
    function drawArrow(deg, color, label, dashed){
      var a = (deg - 270) * Math.PI / 180;
      var tipR = outerR + 30, labelR = outerR + 72;
      var tipX = cx + Math.cos(a) * tipR, tipY = cy + Math.sin(a) * tipR;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4;
      if (dashed) ctx.setLineDash([14, 8]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
      ctx.setLineDash([]);
      var perpX = Math.cos(a + Math.PI / 2) * 18, perpY = Math.sin(a + Math.PI / 2) * 18;
      var bx = tipX - Math.cos(a) * 36, by = tipY - Math.sin(a) * 36;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(bx + perpX, by + perpY); ctx.lineTo(bx - perpX, by - perpY);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
      if (label){
        ctx.save();
        ctx.font = 'bold 16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = color; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4;
        var lx = cx + Math.cos(a) * labelR, ly = cy + Math.sin(a) * labelR;
        lx = Math.max(35, Math.min(W - 35, lx)); ly = Math.max(14, Math.min(H - 14, ly));
        ctx.strokeText(label, lx, ly); ctx.fillText(label, lx, ly); ctx.restore();
      }
    }

    // Zheng/Ling tint (sections care about Zheng Shen / Ling Shen zones)
    if (Array.isArray(FS_SLOTS)) FS_SLOTS.forEach(function(s){
      paintCell(s, fsIsZhengShen(s.yun) ? 'rgba(180,40,40,0.18)' : 'rgba(40,80,180,0.18)');
    });

    if (zone === 'bed'){
      var sd = parseFloat((document.getElementById('fs-bed-sitting') || {}).value);
      if (!isNaN(sd)){
        var ss = fsSlotForDeg(sd);
        paintCell(ss, 'rgba(255,200,0,0.80)');
        drawArrow(sd, '#cc0000', 'Sitting');
      }
    } else { // desk
      var fdg = parseFloat((document.getElementById('fs-desk-facing') || {}).value);
      if (!isNaN(fdg)){
        var fsl = fsSlotForDeg(fdg);
        // ±70° water band just outside the hex ring
        var aMid = (fsl.startDeg + 2.8125 - 270) * Math.PI / 180;
        var halfW = FS_WATER_MAX_DEG * Math.PI / 180;
        var rZoneIn = rHexOut + 4, rZoneOut = rHexOut + 16;
        ctx.save(); ctx.beginPath();
        ctx.arc(cx, cy, rZoneOut, aMid - halfW, aMid + halfW);
        ctx.arc(cx, cy, rZoneIn,  aMid + halfW, aMid - halfW, true);
        ctx.closePath(); ctx.fillStyle = 'rgba(0,200,255,0.45)';
        ctx.fill(); ctx.strokeStyle = 'rgba(0,100,180,0.7)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
        // propitious water positions (Ling Shen + in-range + matches facing + suits person)
        var person = (typeof _fsDeskPerson === 'function') ? _fsDeskPerson() : null;
        if (fsIsZhengShen(fsl.yun) && typeof _fsDeskWaterList === 'function'){
          _fsDeskWaterList(fsl, person).forEach(function(w){ paintCell(w.slot, 'rgba(0,200,255,0.55)'); });
        }
        paintCell(fsl, 'rgba(255,200,0,0.80)');
        drawArrow(fdg, '#cc6600', 'Facing');
      }
    }

    // Cell boundaries
    ctx.save(); ctx.strokeStyle = 'rgba(180,140,40,0.35)'; ctx.lineWidth = 0.6;
    if (Array.isArray(FS_SLOTS)) FS_SLOTS.forEach(function(s){
      var aS = (s.startDeg - 270) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(aS) * rHexIn,  cy + Math.sin(aS) * rHexIn);
      ctx.lineTo(cx + Math.cos(aS) * rHexOut, cy + Math.sin(aS) * rHexOut);
      ctx.stroke();
    });
    ctx.restore();

    // Center pin
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fillStyle = '#1a1008'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#ffd24a'; ctx.fill();
    ctx.restore();

    // Deliberately recalled house flying-stars overlay
    if (window._fsFSRecalled && typeof fsDrawFlyingStars === 'function'){
      fsDrawFlyingStars(ctx, cx, cy, outerR);
    }
  } catch(err){ console.warn('fsDrawSectionLuopan', err); }
}

// ─────────────────────────────────────────────
//  XKDG DATA (from xkdg_hex.js)
// ─────────────────────────────────────────────
const XKDG_TABLE = {
    '甲子': { hex: 2,  qi: 1, yun: 8, alt: { hex: 24, qi: 1, yun: 8 } }, '乙丑': { hex: 21, qi: 3, yun: 6 },
    '丙寅': { hex: 37, qi: 2, yun: 4 }, '丁卯': { hex: 41, qi: 6, yun: 9 },
    '戊辰': { hex: 10, qi: 9, yun: 6 }, '己巳': { hex: 34, qi: 8, yun: 2 },
    '庚午': { hex: 32, qi: 8, yun: 9 }, '辛未': { hex: 6,  qi: 9, yun: 3 },
    '壬申': { hex: 7,  qi: 1, yun: 7 }, '癸酉': { hex: 53, qi: 2, yun: 7 },
    '甲戌': { hex: 39, qi: 7, yun: 2 }, '乙亥': { hex: 35, qi: 3, yun: 3 },
    '丙子': { hex: 27, qi: 6, yun: 3 }, '丁丑': { hex: 17, qi: 4, yun: 7 },
    '戊寅': { hex: 55, qi: 8, yun: 6 }, '己卯': { hex: 60, qi: 7, yun: 8 },
    '庚辰': { hex: 11, qi: 1, yun: 9 }, '辛巳': { hex: 14, qi: 3, yun: 7 },
    '壬午': { hex: 57, qi: 2, yun: 1 }, '癸未': { hex: 48, qi: 4, yun: 6 },
    '甲申': { hex: 64, qi: 3, yun: 9 }, '乙酉': { hex: 33, qi: 9, yun: 4 },
    '丙戌': { hex: 52, qi: 6, yun: 1 }, '丁亥': { hex: 16, qi: 8, yun: 8 },
    '戊子': { hex: 3,  qi: 7, yun: 4 }, '己丑': { hex: 25, qi: 9, yun: 2 },
    '庚寅': { hex: 30, qi: 3, yun: 1, alt: { hex: 49, qi: 4, yun: 2 } }, '辛卯': { hex: 61, qi: 2, yun: 3 },
    '壬辰': { hex: 26, qi: 6, yun: 4 }, '癸巳': { hex: 43, qi: 4, yun: 6 },
    '甲午': { hex: 1,  qi: 9, yun: 1, alt: { hex: 44, qi: 9, yun: 8 } }, '乙未': { hex: 38, qi: 7, yun: 6 },
    '丙申': { hex: 40, qi: 8, yun: 4 }, '丁酉': { hex: 31, qi: 4, yun: 9 },
    '戊戌': { hex: 15, qi: 1, yun: 6 }, '己亥': { hex: 20, qi: 2, yun: 2 },
    '庚子': { hex: 42, qi: 2, yun: 9 }, '辛丑': { hex: 36, qi: 1, yun: 3 },
    '壬寅': { hex: 13, qi: 9, yun: 7 }, '癸卯': { hex: 54, qi: 8, yun: 7 },
    '甲辰': { hex: 38, qi: 3, yun: 6 }, '乙巳': { hex: 5,  qi: 7, yun: 3 },
    '丙午': { hex: 28, qi: 4, yun: 3 }, '丁未': { hex: 18, qi: 6, yun: 7 },
    '戊申': { hex: 59, qi: 2, yun: 6 }, '己酉': { hex: 56, qi: 3, yun: 8 },
    '庚戌': { hex: 12, qi: 9, yun: 9 }, '辛亥': { hex: 8,  qi: 7, yun: 7 },
    '壬子': { hex: 51, qi: 8, yun: 1 }, '癸丑': { hex: 22, qi: 6, yun: 8 },
    '甲寅': { hex: 63, qi: 7, yun: 9 }, '乙卯': { hex: 19, qi: 1, yun: 4 },
    '丙辰': { hex: 58, qi: 4, yun: 1 }, '丁巳': { hex: 9,  qi: 2, yun: 8 },
    '戊午': { hex: 50, qi: 3, yun: 4 }, '己未': { hex: 46, qi: 1, yun: 2 },
    '庚申': { hex: 29, qi: 7, yun: 1, alt: { hex: 39, qi: 6, yun: 2 } }, '辛酉': { hex: 62, qi: 8, yun: 3 },
    '壬戌': { hex: 45, qi: 4, yun: 4 }, '癸亥': { hex: 23, qi: 6, yun: 6 }
};

// Family map: Jia Zi → array of {family, role} objects
const JIAZI_FAMILY_DATA = {};

function _add(jz, family, role) {
    if (!JIAZI_FAMILY_DATA[jz]) JIAZI_FAMILY_DATA[jz] = [];
    JIAZI_FAMILY_DATA[jz].push({ family, role });
}

// ── Qian-Kun ──
_add('甲午','Qian-Kun','father'); _add('甲子','Qian-Kun','mother');
_add('壬寅','Qian-Kun','daughter'); _add('戊辰','Qian-Kun','daughter');
_add('丁巳','Qian-Kun','daughter'); _add('辛巳','Qian-Kun','daughter'); _add('癸巳','Qian-Kun','daughter');
_add('壬申','Qian-Kun','son'); _add('戊戌','Qian-Kun','son');
_add('丁亥','Qian-Kun','son'); _add('辛亥','Qian-Kun','son'); _add('癸亥','Qian-Kun','son');
// ── Kan-Li ──
_add('庚申','Kan-Li','father'); _add('庚寅','Kan-Li','mother');
_add('己卯','Kan-Li','daughter'); _add('辛亥','Kan-Li','daughter'); _add('乙未','Kan-Li','daughter');
_add('癸未','Kan-Li','daughter'); _add('壬申','Kan-Li','daughter'); _add('戊申','Kan-Li','daughter');
_add('己酉','Kan-Li','son'); _add('辛巳','Kan-Li','son'); _add('乙丑','Kan-Li','son');
_add('癸丑','Kan-Li','son'); _add('壬寅','Kan-Li','son'); _add('戊寅','Kan-Li','son');
// ── Zhen-Xun ──
_add('壬子','Zhen-Xun','father'); _add('壬午','Zhen-Xun','mother');
_add('丁亥','Zhen-Xun','daughter'); _add('癸卯','Zhen-Xun','daughter'); _add('戊寅','Zhen-Xun','daughter');
_add('甲子','Zhen-Xun','daughter'); _add('丁丑','Zhen-Xun','daughter'); _add('乙丑','Zhen-Xun','daughter');
_add('丁巳','Zhen-Xun','son'); _add('癸酉','Zhen-Xun','son'); _add('戊申','Zhen-Xun','son');
_add('甲午','Zhen-Xun','son'); _add('丁未','Zhen-Xun','son'); _add('乙未','Zhen-Xun','son');
// ── Gen-Dui ──
_add('丙戌','Gen-Dui','father'); _add('丙辰','Gen-Dui','mother');
_add('癸丑','Gen-Dui','daughter'); _add('丁未','Gen-Dui','daughter'); _add('癸亥','Gen-Dui','daughter');
_add('己酉','Gen-Dui','daughter'); _add('癸酉','Gen-Dui','daughter'); _add('戊戌','Gen-Dui','daughter');
_add('癸未','Gen-Dui','son'); _add('丁丑','Gen-Dui','son'); _add('癸巳','Gen-Dui','son');
_add('己卯','Gen-Dui','son'); _add('癸卯','Gen-Dui','son'); _add('戊辰','Gen-Dui','son');
// ── Pi-Tai ──
_add('庚戌','Pi-Tai','father'); _add('庚辰','Pi-Tai','mother');
_add('己丑','Pi-Tai','daughter'); _add('辛未','Pi-Tai','daughter'); _add('乙酉','Pi-Tai','daughter');
_add('己亥','Pi-Tai','daughter'); _add('乙亥','Pi-Tai','daughter'); _add('壬戌','Pi-Tai','daughter');
_add('己未','Pi-Tai','son'); _add('辛丑','Pi-Tai','son'); _add('乙卯','Pi-Tai','son');
_add('己巳','Pi-Tai','son'); _add('乙巳','Pi-Tai','son'); _add('壬辰','Pi-Tai','son');
// ── JiJi-WeiJi ──
_add('甲寅','JiJi-WeiJi','father'); _add('甲申','JiJi-WeiJi','mother');
_add('甲戌','JiJi-WeiJi','daughter'); _add('乙巳','JiJi-WeiJi','daughter'); _add('戊子','JiJi-WeiJi','daughter');
_add('庚寅','JiJi-WeiJi','daughter'); _add('辛丑','JiJi-WeiJi','daughter'); _add('丙寅','JiJi-WeiJi','daughter');
_add('甲辰','JiJi-WeiJi','son'); _add('乙亥','JiJi-WeiJi','son'); _add('戊午','JiJi-WeiJi','son');
_add('庚申','JiJi-WeiJi','son'); _add('辛未','JiJi-WeiJi','son'); _add('丙申','JiJi-WeiJi','son');
// ── Heng-Yi ──
_add('庚午','Heng-Yi','father'); _add('庚子','Heng-Yi','mother');
_add('己巳','Heng-Yi','daughter'); _add('辛酉','Heng-Yi','daughter'); _add('丙申','Heng-Yi','daughter');
_add('己未','Heng-Yi','daughter'); _add('丙午','Heng-Yi','daughter'); _add('戊午','Heng-Yi','daughter');
_add('己亥','Heng-Yi','son'); _add('辛卯','Heng-Yi','son'); _add('丙寅','Heng-Yi','son');
_add('己丑','Heng-Yi','son'); _add('丙子','Heng-Yi','son'); _add('戊子','Heng-Yi','son');
// ── Sun-Xian ──
_add('丁卯','Sun-Xian','father'); _add('丁酉','Sun-Xian','mother');
_add('庚申','Sun-Xian','daughter'); _add('壬辰','Sun-Xian','daughter'); _add('丙子','Sun-Xian','daughter');
_add('甲辰','Sun-Xian','daughter'); _add('辛卯','Sun-Xian','daughter'); _add('乙卯','Sun-Xian','daughter');
_add('庚寅','Sun-Xian','son'); _add('丙午','Sun-Xian','son'); _add('壬戌','Sun-Xian','son');
_add('甲戌','Sun-Xian','son'); _add('辛酉','Sun-Xian','son'); _add('乙酉','Sun-Xian','son');

// Get family label with per-family role sign for children, plain for parents
function getHexFamilyLabel(stem, branch, hexNum) {
    const entries = JIAZI_FAMILY_DATA[stem + branch] || [];
    if (!hexNum || entries.length <= 1) {
        return entries.map(e => {
            if (e.role === 'father' || e.role === 'mother') return e.family;
            return `${e.family} ${e.role === 'son' ? '+' : '-'}`;
        }).join('<br>');
    }
    // Dual entry: find which hex is primary and which is alt
    const jz = stem + branch;
    const raw = XKDG_TABLE[jz];
    if (!raw || !raw.alt) {
        return entries.map(e => {
            if (e.role === 'father' || e.role === 'mother') return e.family;
            return `${e.family} ${e.role === 'son' ? '+' : '-'}`;
        }).join('<br>');
    }
    const isPrimary = raw.hex === hexNum;
    // Primary hex: show parent family only (no children families)
    // Alt hex: show children families only (no parent family)
    const filtered = entries.filter(e => {
        if (e.role === 'father' || e.role === 'mother') return isPrimary;
        return !isPrimary; // children only for alt hex
    });
    return filtered.map(e => {
        if (e.role === 'father' || e.role === 'mother') return e.family;
        return `${e.family} ${e.role === 'son' ? '+' : '-'}`;
    }).join('<br>');
}

// Get role label (P or C only, no gender mark)
function getRoleLabel(stem, branch, hexNum) {
    const entries = JIAZI_FAMILY_DATA[stem + branch] || [];
    if (entries.length === 0) return '';
    // For dual entries, check if this hex is the primary (parent) one
    if (hexNum && entries.length > 1) {
        const jz = stem + branch;
        const raw = XKDG_TABLE[jz];
        if (raw && raw.hex !== hexNum) {
            // This is the alt hex — role is child
            return '<span style="color:#0044cc;font-size:15px;font-weight:bold;">C</span>';
        }
    }
    const role = entries[0].role;
    if (role === 'father' || role === 'mother')
        return '<span style="color:#d40000;font-size:15px;font-weight:bold;">P</span>';
    return '<span style="color:#0044cc;font-size:15px;font-weight:bold;">C</span>';
}

// Get family array for analysis
function getJiaZiFamilies(stem, branch) {
    return (JIAZI_FAMILY_DATA[stem + branch] || []).map(e => e.family);
}

// Hex-aware version: for dual entries (庚申/庚寅/甲子/甲午), filter by resolved hex number
function getJiaZiFamiliesByHex(stem, branch, hexNum) {
    const entries = JIAZI_FAMILY_DATA[stem + branch] || [];
    if (!hexNum || entries.length <= 1) return entries.map(e => e.family);
    // Check XKDG_TABLE to find which alt hex corresponds to which family
    const jz = stem + branch;
    const raw = XKDG_TABLE[jz];
    if (!raw) return entries.map(e => e.family);
    // If hexNum matches primary hex, return primary role's family
    // If hexNum matches alt hex, return the other entries' families
    const isPrimary = raw.hex === hexNum;
    const isAlt     = raw.alt && raw.alt.hex === hexNum;
    if (!isPrimary && !isAlt) return entries.map(e => e.family);
    // Parent (father/mother) always belongs to the primary hex
    // Children belong to both
    return entries.filter(e => {
        if (e.role === 'father' || e.role === 'mother') return isPrimary;
        return true; // children shown for both
    }).map(e => e.family);
}

// Full Nayin (Melodic Element) map — 60 Jia Zi → English
const NAYIN = {
    '甲子':'Metal in the Sea',    '乙丑':'Metal in the Sea',
    '丙寅':'Fire in Furnace',     '丁卯':'Fire in Furnace',
    '戊辰':'Wood in Forest',      '己巳':'Wood in Forest',
    '庚午':'Road Side Earth',     '辛未':'Road Side Earth',
    '壬申':'Metal in Sword',      '癸酉':'Metal in Sword',
    '甲戌':'Fire on Mountain',    '乙亥':'Fire on Mountain',
    '丙子':'Water in Stream',     '丁丑':'Water in Stream',
    '戊寅':'Earth on Fortress',   '己卯':'Earth on Fortress',
    '庚辰':'White Molten Metal', '辛巳':'White Molten Metal',
    '壬午':'Wood of Willow',      '癸未':'Wood of Willow',
    '甲申':'Water in Spring',     '乙酉':'Water in Spring',
    '丙戌':'Earth on House',      '丁亥':'Earth on House',
    '戊子':'Lightning Fire',     '己丑':'Lightning Fire',
    '庚寅':'Wood of Pine Tree',   '辛卯':'Wood of Pine Tree',
    '壬辰':'Forever Running Water','癸巳':'Forever Running Water',
    '甲午':'Metal in Sand',       '乙未':'Metal in Sand',
    '丙申':'Fire on Slope',       '丁酉':'Fire on Slope',
    '戊戌':'Wood on Plain',       '己亥':'Wood on Plain',
    '庚子':'Earth on Wall',       '辛丑':'Earth on Wall',
    '壬寅':'Gold Foil Metal',     '癸卯':'Gold Foil Metal',
    '甲辰':'Fire of Lamp',        '乙巳':'Fire of Lamp',
    '丙午':'Water in Milky Way',  '丁未':'Water in Milky Way',
    '戊申':'Earth on Highway',    '己酉':'Earth on Highway',
    '庚戌':'Gold in Jewelry',     '辛亥':'Gold in Jewelry',
    '壬子':'Mulberry Wood',       '癸丑':'Mulberry Wood',
    '甲寅':'Water in River',      '乙卯':'Water in River',
    '丙辰':'Earth in Sand',       '丁巳':'Earth in Sand',
    '戊午':'Fire in Heaven',      '己未':'Fire in Heaven',
    '庚申':'Guava Wood',          '辛酉':'Guava Wood',
    '壬戌':'Ocean Water',         '癸亥':'Ocean Water'
};

// Extract base element from Nayin name
const NAYIN_ELEMENT = {
    'Metal': ['Metal in the Sea','Metal in Sword','White Molten Metal','Metal in Sand','Gold Foil Metal','Gold in Jewelry'],
    'Fire':  ['Fire in Furnace','Fire on Mountain','Fire in Heaven','Fire of Lamp','Fire on Slope','Lightning Fire'],
    'Wood':  ['Wood in Forest','Wood of Willow','Wood of Pine Tree','Wood on Plain','Mulberry Wood','Guava Wood'],
    'Earth': ['Road Side Earth','Earth on Fortress','Earth on House','Earth on Highway','Earth on Wall','Earth in Sand'],
    'Water': ['Water in Stream','Water in Spring','Water in River','Water in Milky Way','Forever Running Water','Ocean Water']
};

// Build reverse lookup: nayin name → element
const NAYIN_TO_ELEM = {};
Object.entries(NAYIN_ELEMENT).forEach(([elem, names]) => {
    names.forEach(n => { NAYIN_TO_ELEM[n] = elem; });
});

// Global element cycle tables
const NAYIN_SHENG = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
const NAYIN_KE    = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };

/**
 * Analyze Nayin relationships for a date.
 * Returns { label, score, personLabel, personScore }
 *
 * @param {string} dGan  Day stem
 * @param {string} dZhi  Day branch
 * @param {string} hGan  Hour stem
 * @param {string} hZhi  Hour branch
 * @param {string} mGan  Month stem
 * @param {string} mZhi  Month branch
 * @param {string} yGan  Year stem
 * @param {string} yZhi  Year branch
 * @param {string|null} pGan  Person year stem (optional)
 * @param {string|null} pZhi  Person year branch (optional)
 */
function analyzeNayin(dGan, dZhi, hGan, hZhi, mGan, mZhi, yGan, yZhi, pGan, pZhi, pDayGan, pDayZhi) {
    const dayNayin  = NAYIN[dGan + dZhi] || null;
    const hourNayin = NAYIN[hGan + hZhi] || null;
    const mthNayin  = NAYIN[mGan + mZhi] || null;
    const yrNayin   = NAYIN[yGan + yZhi] || null;
    if (!dayNayin) return { label: null, score: 0, personLabel: null, personScore: 0 };

    const dayElem = NAYIN_TO_ELEM[dayNayin] || null;
    if (!dayElem) return { label: null, score: 0, personLabel: null, personScore: 0 };

    // Check each pillar's relationship to Day Nayin
    function pillarRelation(otherNayin) {
        if (!otherNayin) return 0;
        const otherElem = NAYIN_TO_ELEM[otherNayin] || null;
        if (!otherElem) return 0;
        if (otherElem === dayElem) return 1;
        if (NAYIN_SHENG[otherElem] === dayElem) return 1;
        if (NAYIN_KE[dayElem] === otherElem) return 1;
        if (NAYIN_SHENG[dayElem] === otherElem) return -1;
        if (NAYIN_KE[otherElem] === dayElem) return -1;
        return 0;
    }

    const relations = [pillarRelation(hourNayin), pillarRelation(mthNayin), pillarRelation(yrNayin)];
    const positives = relations.filter(r => r === 1).length;
    const negatives = relations.filter(r => r === -1).length;

    let label = null, score = 0;
    if (positives === 3) { label = 'Nayin Power'; score = 5; }
    else if (positives === 2) { label = 'Nayin'; score = 1; }
    else if (negatives === 3) { label = 'Nayin Weak'; score = -2; }

    // Step 2: Person Year AND Day Nayin vs DATE DAY Nayin (not hour)
    let personLabel = null, personScore = 0;
    if (pGan && pZhi && (label === 'Nayin Power' || label === 'Nayin')) {
        function personNayinRelation(pG, pZ) {
            if (!pG || !pZ) return 0;
            const pNayin = NAYIN[pG + pZ] || null;
            const pElem  = pNayin ? (NAYIN_TO_ELEM[pNayin] || null) : null;
            if (!pElem) return 0;
            if (pElem === dayElem || NAYIN_SHENG[dayElem] === pElem || NAYIN_KE[pElem] === dayElem) return 1;
            if (NAYIN_SHENG[pElem] === dayElem || NAYIN_KE[dayElem] === pElem) return -1;
            return 0;
        }

        const yearRel = personNayinRelation(pGan, pZhi);
        const dayRel  = personNayinRelation(pDayGan, pDayZhi);

        const yearGood = yearRel === 1, dayGood = dayRel === 1;
        const yearBad  = yearRel === -1, dayBad  = dayRel === -1;

        if (yearGood || dayGood) {
            const tag = (yearGood && dayGood) ? ' DY' : yearGood ? ' Y' : ' D';
            personLabel = 'Nayin ✦ Person' + tag;
            personScore = 3;
        } else if (yearBad || dayBad) {
            const tag = (yearBad && dayBad) ? ' DY' : yearBad ? ' Y' : ' D';
            personLabel = 'Nayin ✗ Person' + tag;
            personScore = -2;
        }
    }

    return { label, score, personLabel, personScore, dayNayin, dayElem };
}

const HEX_NAMES = {2:'Kun',3:'Zhun',4:'Meng',5:'Xu',6:'Song',7:'Shi',8:'Bi',
    9:'Xiao Chu',10:'Lü',11:'Tai',12:'Pi',13:'Tong Ren',14:'Da You',15:'Qian',16:'Yu',
    17:'Sui',18:'Gu',19:'Lin',20:'Guan',21:'Shi He',22:'Bi',23:'Bo',24:'Fu',
    25:'Wu Wang',26:'Da Chu',27:'Yi',28:'Da Guo',29:'Kan',30:'Li',31:'Xian',32:'Heng',
    33:'Dun',34:'Da Zhuang',35:'Jin',36:'Ming Yi',37:'Jia Ren',38:'Kui',39:'Jian',40:'Jie',
    41:'Sun',42:'Yi',43:'Guai',44:'Gou',45:'Cui',46:'Sheng',47:'Kun',48:'Jing',
    49:'Ge',50:'Ding',51:'Zhen',52:'Gen',53:'Jian',54:'Gui Mei',55:'Feng',56:'Lü',
    57:'Xun',58:'Dui',59:'Huan',60:'Jie',61:'Zhong Fu',62:'Xiao Guo',63:'Ji Ji',64:'Wei Ji'
};

function getHexIcon(n) {
    return String.fromCodePoint(0x4DC0 + n - 1);
}

function buildResolvedPillars(yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi) {
    const raw = {
        year:  { ...( getXkdgData(yearGan,  yearZhi)  || {}), stem: yearGan,  branch: yearZhi  },
        month: { ...( getXkdgData(monthGan, monthZhi) || {}), stem: monthGan, branch: monthZhi },
        day:   { ...( getXkdgData(dayGan,   dayZhi)   || {}), stem: dayGan,   branch: dayZhi   },
        hour:  { ...( getXkdgData(hourGan,  hourZhi)  || {}), stem: hourGan,  branch: hourZhi  }
    };
    const resolved = {};
    Object.keys(raw).forEach(k => {
        const others = Object.keys(raw).filter(j => j !== k).map(j => raw[j]);
        resolved[k] = resolveDualXkdg(raw[k], others);
    });
    return resolved;
}

function getXkdgData(stem, branch) {
    return XKDG_TABLE[stem + branch] || null;
}

// For dual-hexagram Jia Zi, resolve which variant to use given the other 3 pillars
function resolveDualXkdg(data, otherPillarsData) {
    if (!data.alt) return data; // no dual, return as-is
    // Try main first, then alt — pick whichever has a match with others
    const main = { hex: data.hex, qi: data.qi, yun: data.yun };
    const alt  = { hex: data.alt.hex, qi: data.alt.qi, yun: data.alt.yun };
    // Check if alt produces any Adding or Hetu match with any other pillar
    const altMatch = otherPillarsData.some(o => {
        if (!o) return false;
        const qiSum = alt.qi + o.qi;
        const yunSum = alt.yun + o.yun;
        return [5,10,15].includes(qiSum) || [5,10,15].includes(yunSum) ||
               isHetuPair(alt.qi, o.qi) || isHetuPair(alt.yun, o.yun) ||
               alt.qi === o.qi || alt.yun === o.yun;
    });
    const mainMatch = otherPillarsData.some(o => {
        if (!o) return false;
        const qiSum = main.qi + o.qi;
        const yunSum = main.yun + o.yun;
        return [5,10,15].includes(qiSum) || [5,10,15].includes(yunSum) ||
               isHetuPair(main.qi, o.qi) || isHetuPair(main.yun, o.yun) ||
               main.qi === o.qi || main.yun === o.yun;
    });
    if (altMatch && !mainMatch) return { ...data, ...alt };
    return { ...data, ...main }; // default to main
}

// HeTu pair check: 1↔6, 2↔7, 3↔8, 4↔9
// ── 12 Spirits (十二神) ──────────────────────────────────────
const SPIRIT_NAMES = [
    { en: 'Cerulean Dragon', zh: '青龙', auspicious: true  },
    { en: 'Bright Hall',     zh: '明堂', auspicious: true  },
    { en: 'Heaven Penalty',  zh: '天刑', auspicious: false },
    { en: 'Red Bird',        zh: '朱雀', auspicious: false },
    { en: 'Golden Box',      zh: '金柜', auspicious: true  },
    { en: 'Heaven Virtue',   zh: '天德', auspicious: true  },
    { en: 'White Tiger',     zh: '白虎', auspicious: false },
    { en: 'Jade Hall',       zh: '玉堂', auspicious: true  },
    { en: 'Heaven Prison',   zh: '天牢', auspicious: false },
    { en: 'Black Tortoise',  zh: '玄武', auspicious: false },
    { en: 'Fate Master',     zh: '司命', auspicious: true  },
    { en: 'Gou Chen',        zh: '勾陈', auspicious: false }
];

// Day branch → starting branch index for Cerulean Dragon
const DRAGON_START = {
    '子':'申', '午':'申',
    '丑':'戌', '未':'戌',
    '寅':'子', '申':'子',
    '卯':'寅', '酉':'寅',
    '辰':'辰', '戌':'辰',
    '巳':'午', '亥':'午'
};

const BRANCH_ORDER = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function getSpiritForHour(dayBranch, hourBranch) {
    const startBranch = DRAGON_START[dayBranch];
    if (!startBranch) return null;
    const startIdx = BRANCH_ORDER.indexOf(startBranch);
    const hourIdx  = BRANCH_ORDER.indexOf(hourBranch);
    if (startIdx === -1 || hourIdx === -1) return null;
    const spiritIdx = ((hourIdx - startIdx) + 12) % 12;
    return SPIRIT_NAMES[spiritIdx];
}
// ── Clashes ──────────────────────────────────────────────────
// ── Kong Wang 空亡 (Void/Empty) ──────────────────────────────
// Maps day stem to the two void branches for its Xun group
// Determined by which Jia Zi the day belongs to
const KONG_WANG = {
    // 甲子旬 (甲子→癸酉) → 戌亥 void
    '甲':'戌亥', '乙':'戌亥', '丙':'戌亥', '丁':'戌亥', '戊':'戌亥',
    '己':'戌亥', '庚':'戌亥', '辛':'戌亥', '壬':'戌亥', '癸':'戌亥'
};
// Full lookup by Jia Zi stem+branch
const KONG_WANG_MAP = {
    // 甲子旬
    '甲子':['戌','亥'], '乙丑':['戌','亥'], '丙寅':['戌','亥'], '丁卯':['戌','亥'],
    '戊辰':['戌','亥'], '己巳':['戌','亥'], '庚午':['戌','亥'], '辛未':['戌','亥'],
    '壬申':['戌','亥'], '癸酉':['戌','亥'],
    // 甲戌旬
    '甲戌':['申','酉'], '乙亥':['申','酉'], '丙子':['申','酉'], '丁丑':['申','酉'],
    '戊寅':['申','酉'], '己卯':['申','酉'], '庚辰':['申','酉'], '辛巳':['申','酉'],
    '壬午':['申','酉'], '癸未':['申','酉'],
    // 甲申旬
    '甲申':['午','未'], '乙酉':['午','未'], '丙戌':['午','未'], '丁亥':['午','未'],
    '戊子':['午','未'], '己丑':['午','未'], '庚寅':['午','未'], '辛卯':['午','未'],
    '壬辰':['午','未'], '癸巳':['午','未'],
    // 甲午旬
    '甲午':['辰','巳'], '乙未':['辰','巳'], '丙申':['辰','巳'], '丁酉':['辰','巳'],
    '戊戌':['辰','巳'], '己亥':['辰','巳'], '庚子':['辰','巳'], '辛丑':['辰','巳'],
    '壬寅':['辰','巳'], '癸卯':['辰','巳'],
    // 甲辰旬
    '甲辰':['寅','卯'], '乙巳':['寅','卯'], '丙午':['寅','卯'], '丁未':['寅','卯'],
    '戊申':['寅','卯'], '己酉':['寅','卯'], '庚戌':['寅','卯'], '辛亥':['寅','卯'],
    '壬子':['寅','卯'], '癸丑':['寅','卯'],
    // 甲寅旬
    '甲寅':['子','丑'], '乙卯':['子','丑'], '丙辰':['子','丑'], '丁巳':['子','丑'],
    '戊午':['子','丑'], '己未':['子','丑'], '庚申':['子','丑'], '辛酉':['子','丑'],
    '壬戌':['子','丑'], '癸亥':['子','丑'],
};

// Branch → element mapping for Kong Wang check
const BRANCH_ELEMENT = {
    '子':'Water','丑':'Earth','寅':'Wood','卯':'Wood',
    '辰':'Earth','巳':'Fire', '午':'Fire', '未':'Earth',
    '申':'Metal','酉':'Metal','戌':'Earth','亥':'Water'
};

function getKongWang(dayGan, dayZhi) {
    return KONG_WANG_MAP[dayGan + dayZhi] || [];
}

function isKongWangVoid(hourBranch, dayGan, dayZhi, seasonStrong, seasonGrowing) {
    const voids = getKongWang(dayGan, dayZhi);
    if (!voids.includes(hourBranch)) return false;
    const elem = BRANCH_ELEMENT[hourBranch];
    if (!elem) return false;
    // Element is timely if it IS the season element, or if its generator is the season element
    // XKDG generating cycle: Water→Wood, Wood→Fire, Fire→Earth, Earth→Metal, Metal→Water
    const GENERATES = { 'Water':'Wood', 'Wood':'Fire', 'Fire':'Earth', 'Earth':'Metal', 'Metal':'Water' };
    const generator = Object.keys(GENERATES).find(k => GENERATES[k] === elem);
    const isTimely = elem === seasonStrong || elem === seasonGrowing ||
                     generator === seasonStrong; // only strong generator counts
    return !isTimely; // void AND untimely → discard
}

const BRANCH_CLASHES = {
    '子':'午','午':'子','丑':'未','未':'丑',
    '寅':'申','申':'寅','卯':'酉','酉':'卯',
    '辰':'戌','戌':'辰','巳':'亥','亥':'巳'
};
const STEM_CLASHES = {
    '甲':'庚','庚':'甲','乙':'辛','辛':'乙',
    '丙':'壬','壬':'丙','丁':'癸','癸':'丁'
};

function getClashType(dayGan, dayZhi, yearZhi, monthGan, monthZhi) {
    if (BRANCH_CLASHES[dayZhi] === yearZhi)  return 'clash-year';
    if (STEM_CLASHES[dayGan]   === monthGan) return 'clash-month-stem';
    if (BRANCH_CLASHES[dayZhi] === monthZhi) return 'clash-month-branch';
    return null;
}

const TOMB_SHA = {
    '甲':'未', '乙':'戌',
    '丙':'戌', '丁':'丑',
    '戊':'戌', '己':'丑',
    '庚':'丑', '辛':'辰',
    '壬':'辰', '癸':'未'
};

// Stem → element for timeliness check
const STEM_ELEMENT = {
    '甲':'Wood','乙':'Wood','丙':'Fire','丁':'Fire',
    '戊':'Earth','己':'Earth','庚':'Metal','辛':'Metal',
    '壬':'Water','癸':'Water'
};

// Ke cycle for stems: key controls value
const STEM_KE = { 'Wood':'Earth','Earth':'Water','Water':'Fire','Fire':'Metal','Metal':'Wood' };

function isTombSha(hourBranch, dayStem, seasonStrong, seasonGrowing) {
    const tomb = TOMB_SHA[dayStem];
    if (!tomb || tomb !== hourBranch) return false;
    const elem = STEM_ELEMENT[dayStem];
    // Generate cycle: Water→Wood, Wood→Fire, Fire→Earth, Earth→Metal, Metal→Water
    const GENERATES = { 'Water':'Wood','Wood':'Fire','Fire':'Earth','Earth':'Metal','Metal':'Water' };
    const generator = Object.keys(GENERATES).find(k => GENERATES[k] === elem);
    const isTimely = elem === seasonStrong || elem === seasonGrowing ||
                     generator === seasonStrong; // only strong generator counts
    return !isTimely; // only flag when untimely
}


const NOBLE_BRANCHES = {
    '甲': ['丑','未'], '乙': ['子','申'],
    '丙': ['亥','酉'], '丁': ['亥','酉'],
    '戊': ['丑','未'], '己': ['子','申'],
    '庚': ['丑','未'], '辛': ['寅','午'],
    '壬': ['卯','巳'], '癸': ['卯','巳']
};

// Lu (禄) — one branch per stem
const LU_BRANCH = {
    '甲':'寅', '乙':'卯', '丙':'巳', '丁':'午',
    '戊':'巳', '己':'午', '庚':'申', '辛':'酉',
    '壬':'亥', '癸':'子'
};

// ── Tian Yi 天医 (Heavenly Doctor) ──────────────────────────
// Day Stem → Tian Yi branch (DLR lodging +2 clockwise)
const TIAN_YI = {
    '甲':'辰', '乙':'午', '丙':'未', '丁':'酉',
    '戊':'未', '己':'酉', '庚':'戌', '辛':'子',
    '壬':'丑', '癸':'卯'
};

// ── Heaven Virtue (天德) ─────────────────────────────────────
const HEAVEN_VIRTUE = {
    '寅':'未', '卯':'申', '辰':'亥', '巳':'戌',
    '午':'亥', '未':'寅', '申':'丑', '酉':'寅',
    '戌':'巳', '亥':'辰', '子':'巳', '丑':'申'
};

// ── Branch Virtue (支德) ─────────────────────────────────────
const BRANCH_VIRTUE = {
    '子':'巳', '丑':'午', '寅':'未', '卯':'申',
    '辰':'酉', '巳':'戌', '午':'亥', '未':'子',
    '申':'丑', '酉':'寅', '戌':'卯', '亥':'辰'
};

// ── Month Virtue (月德) ──────────────────────────────────────
const MONTH_VIRTUE = {
    '亥':{ stem:'甲', branch:'寅' }, '卯':{ stem:'甲', branch:'寅' }, '未':{ stem:'甲', branch:'寅' },
    '寅':{ stem:'丙', branch:'巳' }, '午':{ stem:'丙', branch:'巳' }, '戌':{ stem:'丙', branch:'巳' },
    '巳':{ stem:'庚', branch:'申' }, '酉':{ stem:'庚', branch:'申' }, '丑':{ stem:'庚', branch:'申' },
    '申':{ stem:'壬', branch:'亥' }, '子':{ stem:'壬', branch:'亥' }, '辰':{ stem:'壬', branch:'亥' }
};

function getPersonMonthBranch(birthDate, birthTime, offsetMin) {
    if (!birthDate) return null;
    const base  = new Date(`${birthDate}T${birthTime}`);
    const solar = new Date(base.getTime() + offsetMin * 60000);
    return Solar.fromDate(solar).getLunar().getEightChar().getMonthZhi();
}

// Returns: 'date', 'person', 'both', or null
function getLuType(branch, dateDayStem, personDayStem) {
    const isDate   = LU_BRANCH[dateDayStem]   === branch;
    const isPerson = personDayStem ? LU_BRANCH[personDayStem] === branch : false;
    if (isDate && isPerson) return 'both';
    if (isDate)   return 'date';
    if (isPerson) return 'person';
    return null;
}

// Returns: 'date' (date noble), 'person' (person noble), 'both', or null
function getNobleType(hourBranch, dateDayStem, personDayStem) {
    const dateNobles   = NOBLE_BRANCHES[dateDayStem]   || [];
    const personNobles = personDayStem ? (NOBLE_BRANCHES[personDayStem] || []) : [];
    const isDate   = dateNobles.includes(hourBranch);
    const isPerson = personNobles.includes(hourBranch);
    if (isDate && isPerson) return 'both';
    if (isDate)   return 'date';
    if (isPerson) return 'person';
    return null;
}

// Get person A's day stem from their birth date
function getPersonDayStem() {
    const dVal = document.getElementById('person-date').value;
    const tVal = document.getElementById('person-time').value || '12:00';
    if (!dVal) return null;
    const lon = parseFloat(document.getElementById('longitude').value);
    const utc = parseFloat(document.getElementById('utc-offset').value);
    const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);
    const base   = new Date(`${dVal}T${tVal}`);
    const solar  = new Date(base.getTime() + offsetMin * 60000);
    const ec     = Solar.fromDate(solar).getLunar().getEightChar();
    let dGan = ec.getDayGan();
    if (solar.getHours() === 23) {
        const yest = Solar.fromDate(new Date(solar.getTime() - 3600000));
        dGan = yest.getLunar().getEightChar().getDayGan();
    }
    return dGan;
}

function getPersonDayStemFromBirth(birthDate, birthTime, offsetMin) {
    if (!birthDate) return null;
    const base  = new Date(`${birthDate}T${birthTime}`);
    const solar = new Date(base.getTime() + offsetMin * 60000);
    const ec    = Solar.fromDate(solar).getLunar().getEightChar();
    let dGan = ec.getDayGan();
    if (solar.getHours() === 23) {
        const yest = Solar.fromDate(new Date(solar.getTime() - 3600000));
        dGan = yest.getLunar().getEightChar().getDayGan();
    }
    return dGan;
}

function isHetuPair(a, b) {
    const sorted = [a, b].sort((x,y) => x-y).join('-');
    return ['1-6','2-7','3-8','4-9'].includes(sorted);
}

const QI_ELEMENT = {
    1:'Water',6:'Water', 2:'Fire',7:'Fire',
    3:'Wood',8:'Wood',   4:'Metal',9:'Metal'
};

// ── Inverse Hexagram lookup (flip all 6 lines) ───────────────
const INVERSE_HEX = {1:2,2:1,3:50,4:49,5:35,6:36,7:13,8:14,9:16,10:15,11:12,12:11,13:7,14:8,15:10,16:9,17:18,18:17,19:33,20:34,21:48,22:47,23:43,24:44,25:46,26:45,27:28,28:27,29:30,30:29,31:41,32:42,33:19,34:20,35:5,36:6,37:40,38:39,39:38,40:37,41:31,42:32,43:23,44:24,45:26,46:25,47:22,48:21,49:4,50:3,51:57,52:58,53:54,54:53,55:59,56:60,57:51,58:52,59:55,60:56,61:62,62:61,63:64,64:63};

function getInverseHex(hexNum) {
    return INVERSE_HEX[hexNum] || null;
}

function analyzeXkdg(pillars, seasonStrong, seasonGrowing) {
    const items = [];
    const keys = ['year','month','day','hour'];
    if (!keys.every(k => pillars[k])) return { items, sameFamily: false };

    const qi     = k => pillars[k].qi;
    const yun    = k => pillars[k].yun;
    const branch = k => pillars[k].branch;

    // 6 classical branch clashes
    const CLASHES = [
        ['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']
    ];
    function isClashing(k1, k2) {
        const b1 = branch(k1), b2 = branch(k2);
        return CLASHES.some(([a,b]) => (b1===a && b2===b) || (b1===b && b2===a));
    }

    // Returns 'Pure Hetu', 'Hetu', or null — all 4 pillars must be covered (overlapping allowed)
    // XKDG element relationships (no Earth)
    const XKDG_SHENG = { 'Water':'Wood', 'Wood':'Fire', 'Metal':'Water' };
    const XKDG_KE    = { 'Fire':'Metal', 'Water':'Fire', 'Metal':'Wood' };

    function hetuElem(val) { return QI_ELEMENT[val] || null; }

    function pairBActsOnPairA(elemA, elemB) {
        // Pair B (elemB) must Sheng or Ke Pair A (elemA)
        return XKDG_SHENG[elemB] === elemA || XKDG_KE[elemB] === elemA;
    }

    function checkHetu(valFn) {
        const validPairs = [];
        for (let i = 0; i < keys.length; i++)
            for (let j = i+1; j < keys.length; j++)
                if (!isClashing(keys[i], keys[j]) && isHetuPair(valFn(keys[i]), valFn(keys[j])))
                    validPairs.push([keys[i], keys[j]]);
        if (validPairs.length === 0) return null;
        // All 4 pillars must appear in at least one valid pair
        const covered = new Set(validPairs.flat());
        if (covered.size < 4) return null;
        // Pure Hetu: ALL pairs share the same single element family
        const elements = validPairs.map(([a,b]) => hetuElem(valFn(a)));
        const allSameElem = elements.every(e => e && e === elements[0]);
        if (allSameElem) return 'Pure Hetu';

        // Mixed Hetu: find which pair contains the day pillar
        const dayPairIdx = validPairs.findIndex(p => p.includes('day'));
        if (dayPairIdx === -1) return null; // day not in any pair → discard
        const elemDay   = hetuElem(valFn(validPairs[dayPairIdx][0]));
        // Other pair(s) must Sheng or Ke the day pair
        const otherPairs = validPairs.filter((_, i) => i !== dayPairIdx);
        const hasRelation = otherPairs.some(p => {
            const elemOther = hetuElem(valFn(p[0]));
            return pairBActsOnPairA(elemDay, elemOther);
        });
        if (!hasRelation) return null; // no Sheng/Ke → discard
        return 'Hetu';
    }

    // Returns 'Pure Adding', 'Adding', or null — all 4 pillars must be covered (overlapping allowed)
    function checkAdd(valFn) {
        const validPairs = [];
        for (let i = 0; i < keys.length; i++)
            for (let j = i+1; j < keys.length; j++) {
                if (isClashing(keys[i], keys[j])) continue;
                const s = valFn(keys[i]) + valFn(keys[j]);
                if ([5,10,15].includes(s)) validPairs.push({ a: keys[i], b: keys[j], sum: s });
            }
        if (validPairs.length === 0) return null;
        // All 4 pillars must appear in at least one valid pair
        const covered = new Set(validPairs.flatMap(p => [p.a, p.b]));
        if (covered.size < 4) return null;
        // Pure Adding: all valid pairs hit the same target
        const allSame = validPairs.every(p => p.sum === validPairs[0].sum);
        return allSame ? 'Pure Adding' : 'Adding';
    }

    // ── Pure Qi ──────────────────────────────────────────────────────
    const qiSame  = keys.every(k => qi(k)  === qi('year'));
    const yunSame = keys.every(k => yun(k) === yun('year'));
    if (qiSame && yunSame)   items.push({ text: 'Pure Qi', tag: 'blue' });
    else if (qiSame)         items.push({ text: 'Pure Qi Elements', tag: 'blue' });
    else if (yunSame)        items.push({ text: 'Pure Qi Periods',  tag: 'blue' });

    // ── Hetu / Pure Hetu ─────────────────────────────────────────────
    const hQi  = checkHetu(qi);
    const hYun = checkHetu(yun);
    if (hQi)  items.push({ text: `${hQi} Elements`, tag: 'blue' });
    if (hYun) items.push({ text: `${hYun} Periods`,  tag: 'blue' });

    // ── Adding / Pure Adding ──────────────────────────────────────────
    const aQi  = checkAdd(qi);
    const aYun = checkAdd(yun);
    if (aQi)  items.push({ text: `${aQi} Elements`, tag: 'blue' });
    if (aYun) items.push({ text: `${aYun} Periods`,  tag: 'blue' });

    // ── Sheng In / Ke In ─────────────────────────────────────────────
    // Map qi number → element family (no Earth in XKDG)
    const QI_TO_ELEM = {
        1:'Water', 6:'Water',
        2:'Fire',  7:'Fire',
        3:'Wood',  8:'Wood',
        4:'Metal', 9:'Metal'
    };
    // Sheng (generates): key generates value
    const SHENG = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
    // Ke (controls): key controls value
    const KE    = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };

    const dayElem = QI_TO_ELEM[qi('day')];
    if (dayElem) {
        const guests = ['year','month','hour'];
        let score = 0;

        guests.forEach(k => {
            const gElem = QI_TO_ELEM[qi(k)];
            if (!gElem) return;
            const qualifies = gElem === dayElem || SHENG[gElem] === dayElem || KE[gElem] === dayElem;
            if (qualifies) score += (k === 'hour') ? 2 : 1;
        });

        const NEXT_ELEM_CYCLE = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
        const isSeasonStrong  = dayElem === seasonStrong;
        const isSeasonGrowing = dayElem === NEXT_ELEM_CYCLE[seasonStrong];
        const isSeasonDead    = NEXT_ELEM_CYCLE[dayElem] === seasonStrong;
        const isSeasonWeak    = !isSeasonStrong && !isSeasonGrowing && !isSeasonDead;

        // Combined system
        let label = null, labelTag = 'green';

        if (isSeasonStrong && score >= 4) {
            label = 'Powerful'; labelTag = 'powerful';
        } else if ((isSeasonStrong && score >= 2) || score >= 4) {
            label = 'Energetic'; labelTag = 'energetic';
        } else if ((isSeasonDead || isSeasonWeak) && score === 0) {
            label = 'Very Weak'; labelTag = 'clash-year';
        }

        if (label) items.push({ text: label, tag: labelTag });

        // ── Seasonal Timely ───────────────────────────────────────────
        if (score >= 3) {
            if      (dayElem === seasonStrong)  items.push({ text: 'Very Timely', tag: 'gold' });
            else if (dayElem === seasonGrowing) items.push({ text: 'Timely',      tag: 'gold' });
        }

        // ── Chang Sheng Birth Stage Timely ───────────────────────────
        // Element reaches Birth (長生) in specific month branch
        const BIRTH_BRANCH = { 'Water':'申', 'Fire':'寅', 'Wood':'亥', 'Metal':'巳' };
        const monthBranch = pillars.month.branch;
        if (monthBranch && BIRTH_BRANCH[dayElem] === monthBranch) {
            if (!items.some(i => i.text === 'Very Timely' || i.text === 'Timely')) {
                items.push({ text: 'Timely at Birth', tag: 'gold' });
            }
        }
    }

    // ── Inverse Hexagram ─────────────────────────────────────────────
    // Day is always the original; Hour/Month/Year can be its inverse
    const dayHex = pillars.day.hex;
    if (dayHex) {
        const invHex = getInverseHex(dayHex);
        if (invHex) {
            const PILLAR_LABELS = { hour: 'Hour', month: 'Month', year: 'Year' };
            const inverseMatches = ['hour','month','year'].filter(k => pillars[k].hex === invHex);
            if (inverseMatches.length > 0) {
                const matchStr = inverseMatches.map(k => PILLAR_LABELS[k]).join('·');
                items.push({ text: `Inverse Hex (${matchStr})`, tag: 'blue' });
            }
        }
    }

    // ── Family Check ─────────────────────────────────────────────────
    const pillarFamilies = keys.map(k => getJiaZiFamilies(pillars[k].stem, pillars[k].branch));
    const sharedFamilies = pillarFamilies[0].filter(f =>
        f !== undefined && f !== null && pillarFamilies.every(fams => fams.includes(f))
    );

    const validFamilies = sharedFamilies.filter(f => {
        // Get role of each pillar in this family
        const roles = keys.map(k => {
            const entry = (JIAZI_FAMILY_DATA[pillars[k].stem + pillars[k].branch] || [])
                .find(e => e.family === f);
            return entry ? entry.role : null;
        });

        // Count males (+) and females (-)
        // father = male, mother = female, son = male, daughter = female
        const males   = roles.filter(r => r === 'father' || r === 'son').length;
        const females = roles.filter(r => r === 'mother' || r === 'daughter').length;

        // Rule 1: discard if all same gender (all male or all female, including parent)
        if (males === 0 || females === 0) return false;

        // Rule 2: minimum balance — at least 1 of each gender (+++- or ---+)
        // i.e. at least 1 male AND at least 1 female among the 4 pillars
        if (males < 1 || females < 1) return false;

        return true;
    });

    const allSameFamily = validFamilies.length > 0;
    if (allSameFamily) {
        validFamilies.forEach(f => items.push({ text: `${f} Family`, tag: 'family' }));
    }

    return { items, sameFamily: allSameFamily };
}
// ─────────────────────────────────────────────
const ELEMENTS_EN = {
    '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth',
    '己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water',
    '子':'water','丑':'earth','寅':'wood','卯':'wood','辰':'earth',
    '巳':'fire','午':'fire','未':'earth','申':'metal','酉':'metal',
    '戌':'earth','亥':'water'
};

// ── Global: Jieqi season detector ─────────────────────────────
function getJieqiSeason(solarDate) {
    const LI_TERMS  = { '立春':'Wood', '立夏':'Fire', '立秋':'Metal', '立冬':'Water' };
    const NEXT_ELEM = { Water:'Wood', Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water' };
    const y = solarDate.getFullYear();
    const currentMs = solarDate.getTime();
    let lastLiDate = null, lastLiElem = null;
    for (const yr of [y - 1, y]) {
        const table = Lunar.fromYmd(yr, 1, 1).getJieQiTable();
        for (const [name, s] of Object.entries(table)) {
            if (!LI_TERMS[name]) continue;
            const termMs = new Date(s.getYear(), s.getMonth() - 1, s.getDay()).getTime();
            if (termMs <= currentMs && (!lastLiDate || termMs > lastLiDate)) {
                lastLiDate = termMs; lastLiElem = LI_TERMS[name];
            }
        }
    }
    if (!lastLiElem) return { strong: null, growing: null };
    return { strong: lastLiElem, growing: NEXT_ELEM[lastLiElem] };
}

let _dstOn = false;
let _dstOnA = false;
let _dstOnB = false;

function toggleDSTperson(person) {
    const isB = person === 'B';
    if (isB) {
        _dstOnB = !_dstOnB;
        const btn = document.getElementById('dst-btn-b');
        btn.textContent = `DST: ${_dstOnB ? 'ON' : 'OFF'}`;
        btn.style.background = _dstOnB ? '#f3e5f5' : '#fff';
        btn.style.borderColor = _dstOnB ? '#7b1fa2' : '#bbb';
        btn.style.color = _dstOnB ? '#7b1fa2' : '#333';
    } else {
        _dstOnA = !_dstOnA;
        const btn = document.getElementById('dst-btn-a');
        btn.textContent = `DST: ${_dstOnA ? 'ON' : 'OFF'}`;
        btn.style.background = _dstOnA ? '#e8f5e9' : '#fff';
        btn.style.borderColor = _dstOnA ? '#2e7d32' : '#bbb';
        btn.style.color = _dstOnA ? '#2e7d32' : '#333';
    }
}
function toggleDST() {
    _dstOn = !_dstOn;
    const btn = document.getElementById('dst-btn');
    btn.textContent  = `DST: ${_dstOn ? 'ON' : 'OFF'}`;
    btn.style.background = _dstOn ? '#fff3e0' : '#fff';
    btn.style.borderColor = _dstOn ? '#e65100' : '#bbb';
    btn.style.color = _dstOn ? '#e65100' : '#333';
    calculateBazi();
}

function setNow() {
    try {
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        document.getElementById('date').value = localDate;
        document.getElementById('time').value = now.toTimeString().slice(0,5);
        // Set standard UTC offset (subtract 1 if DST is active on device)
        const deviceOffset = -now.getTimezoneOffset() / 60; // e.g. +2 in Vienna summer
        const isDSTActive = deviceOffset !== (-(new Date(now.getFullYear(), 0, 1).getTimezoneOffset()) / 60);
        const standardOffset = isDSTActive ? deviceOffset - 1 : deviceOffset;
        document.getElementById('utc-offset').value = standardOffset;
        // Auto-set DST toggle to match device
        if (isDSTActive && !_dstOn) toggleDST();
        else if (!isDSTActive && _dstOn) toggleDST();
        calculateBazi();
    } catch(e) {
        console.error('setNow error:', e.message, e.stack);
    }
}

function getGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lon = pos.coords.longitude;
            document.getElementById('longitude').value = lon.toFixed(2);
            // Auto-set UTC offset from longitude (approximate: every 15° = 1 hour)
            const utcGuess = Math.round(lon / 15);
            const utcClamped = Math.max(-12, Math.min(14, utcGuess));
            document.getElementById('utc-offset').value = utcClamped;
            calculateBazi();
        }, (err) => {
            alert('GPS error: ' + err.message);
        }, {
            enableHighAccuracy: true,
            maximumAge: 0,        // always fresh — never use cached position
            timeout: 10000
        });
    } else {
        alert('Geolocation not supported by this browser.');
    }
}

function calculateBazi() {
    const dVal = document.getElementById('date').value;
    const tVal = document.getElementById('time').value || "00:00";
    const lon  = parseFloat(document.getElementById('longitude').value);
    const utc  = parseFloat(document.getElementById('utc-offset').value);
    
    if (!dVal) return;

    // 1. True Solar Time
    const standardMeridian = utc * 15;
    const offsetMinutes = (lon - standardMeridian) * 4;
    const dstOffset = _dstOn ? 60 : 0;
    let baseDate  = new Date(`${dVal}T${tVal}`);
    let solarDate = new Date(baseDate.getTime() + offsetMinutes * 60000 - dstOffset * 60000);
    
    document.getElementById('solar-time-display').textContent =
        "True Solar: " + solarDate.toTimeString().slice(0,5);

    // 2. Bazi from lunar-javascript
    const solar    = Solar.fromDate(solarDate);
    const lunar    = solar.getLunar();
    const eightChar = lunar.getEightChar();

    // DAY: handle the 23:00-00:00 edge-case
    let dayGan = eightChar.getDayGan();
    let dayZhi = eightChar.getDayZhi();
    if (solarDate.getHours() === 23) {
        const yesterday = new Date(solarDate.getTime() - 3600000);
        const oldEC = Solar.fromDate(yesterday).getLunar().getEightChar();
        dayGan = oldEC.getDayGan();
        dayZhi = oldEC.getDayZhi();
    }

    // 3. Collect pillar keys (Stem+Branch) for XKDG lookup
    const pillarKeys = {
        year:  { stem: eightChar.getYearGan(),  branch: eightChar.getYearZhi()  },
        month: { stem: eightChar.getMonthGan(), branch: eightChar.getMonthZhi() },
        day:   { stem: dayGan,                  branch: dayZhi                  },
        hour:  { stem: eightChar.getTimeGan(),  branch: eightChar.getTimeZhi()  }
    };

    // 4. Get XKDG data for each pillar (include branch for clash checking)
    const xkdgData = {};
    // First pass: get raw data for all pillars
    const rawXkdg = {};
    Object.keys(pillarKeys).forEach(k => {
        const { stem, branch } = pillarKeys[k];
        const data = getXkdgData(stem, branch);
        if (data) rawXkdg[k] = { ...data, branch, stem };
    });
    // Second pass: resolve dual hexagrams using other pillars as context
    Object.keys(rawXkdg).forEach(k => {
        const others = Object.keys(rawXkdg).filter(j => j !== k).map(j => rawXkdg[j]);
        xkdgData[k] = resolveDualXkdg(rawXkdg[k], others);
    });

    // 5. Render pillars — include Nayin (melodic element)
    // Format date labels for headers
    const yearLabel  = solarDate.getFullYear();
    const monthLabel = solarDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const dayLabel   = solarDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const hourLabel  = solarDate.toTimeString().slice(0,5);

    const hYear  = document.querySelector('#p-year .header');
    const hMonth = document.querySelector('#p-month .header');
    const hDay   = document.querySelector('#p-day .header');
    const hHour  = document.querySelector('#p-hour .header');
    if (hYear)  hYear.innerHTML  = `YEAR`;
    if (hMonth) hMonth.innerHTML = `MONTH`;
    if (hDay)   hDay.innerHTML   = `DAY`;
    if (hHour)  hHour.innerHTML  = `HOUR`;

    // Store day stem/branch for Noble and Purpose calculations
    window._currentDayGan = dayGan;
    window._currentDayZhi = dayZhi;

    updatePillar('p-year',  pillarKeys.year.stem,  pillarKeys.year.branch,  xkdgData.year,  eightChar.getYearNaYin());
    updatePillar('p-month', pillarKeys.month.stem, pillarKeys.month.branch, xkdgData.month, eightChar.getMonthNaYin());
    updatePillar('p-day',   pillarKeys.day.stem,   pillarKeys.day.branch,   xkdgData.day,   eightChar.getDayNaYin());
    updatePillar('p-hour',  pillarKeys.hour.stem,  pillarKeys.hour.branch,  xkdgData.hour,  eightChar.getTimeNaYin());

    const { strong: seasonStrong, growing: seasonGrowing } = getJieqiSeason(solarDate);

    const { items: analysis, sameFamily } = analyzeXkdg(xkdgData, seasonStrong, seasonGrowing);

    // Hour branch by slot for reliable Noble/Lu (not library-dependent)
    const HOUR_BRANCHES_MAP = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const hourZhiDirect = pillarKeys.hour.branch; // already correct from eightChar

    // Noble check:
    const personDayStem = getPersonDayStem();
    const dateNobles   = NOBLE_BRANCHES[dayGan] || [];
    const personNobles = personDayStem ? (NOBLE_BRANCHES[personDayStem] || []) : [];
    const isDateNoble   = dateNobles.includes(pillarKeys.hour.branch);
    const isPersonNoble = personNobles.includes(dayZhi);

    if (isDateNoble || isPersonNoble) {
        let label, tag;
        if (isDateNoble && isPersonNoble) { label = 'Noble ★ (Date + Person)'; tag = 'noble-both'; }
        else if (isDateNoble)              { label = 'Noble (Date)';   tag = 'noble'; }
        else                               { label = 'Noble (Person)'; tag = 'noble'; }
        analysis.push({ text: label, tag });
    }

    // Lu check: date lu = hour branch, person lu = day branch
    const isDateLu   = LU_BRANCH[dayGan]         === pillarKeys.hour.branch;
    const isPersonLu = personDayStem ? LU_BRANCH[personDayStem] === dayZhi : false;
    if (isDateLu || isPersonLu) {
        let label, tag;
        if (isDateLu && isPersonLu) { label = 'Lu ★ (Date + Person)'; tag = 'lu-both'; }
        else if (isDateLu)           { label = 'Lu (Date)';   tag = 'lu'; }
        else                         { label = 'Lu (Person)'; tag = 'lu'; }
        analysis.push({ text: label, tag });
    }

    // Tian Yi check: date = hour branch matches day stem TY; person = day branch matches person day stem TY
    const tyBranchDate = TIAN_YI[dayGan] || null;
    const isDateTY     = tyBranchDate === pillarKeys.hour.branch;
    const isPersonTY   = personDayStem ? TIAN_YI[personDayStem] === dayZhi : false;
    if (isDateTY || isPersonTY) {
        let label, tag;
        if (isDateTY && isPersonTY) { label = 'Tian Yi ★ (Date + Person)'; tag = 'ty-both'; }
        else if (isDateTY)           { label = 'Tian Yi (Date)';   tag = 'ty'; }
        else                         { label = 'Tian Yi (Person)'; tag = 'ty'; }
        analysis.push({ text: label, tag });
    }
    const hvBranchDate   = HEAVEN_VIRTUE[pillarKeys.month.branch] || null;
    const personMthBranch = getPersonMonthBranch(
        document.getElementById('person-date').value,
        document.getElementById('person-time').value || '12:00',
        (parseFloat(document.getElementById('longitude').value) - parseFloat(document.getElementById('utc-offset').value) * 15) * 4 - (_dstOn ? 60 : 0)
    );
    const hvBranchPerson = personMthBranch ? (HEAVEN_VIRTUE[personMthBranch] || null) : null;
    const isDateHV   = hvBranchDate   === pillarKeys.hour.branch;
    const isPersonHV = hvBranchPerson === dayZhi;
    if (isDateHV || isPersonHV) {
        let label, tag;
        if (isDateHV && isPersonHV) { label = 'Heaven Virtue ★ (Date + Person)'; tag = 'hv-both'; }
        else if (isDateHV)           { label = 'Heaven Virtue (Date)';   tag = 'hv'; }
        else                         { label = 'Heaven Virtue (Person)'; tag = 'hv'; }
        analysis.push({ text: label, tag });
    }
    const currentSpirit = getSpiritForHour(dayZhi, pillarKeys.hour.branch);
    if (currentSpirit) {
        analysis.push({ text: `${currentSpirit.en} ${currentSpirit.zh}`, tag: currentSpirit.auspicious ? 'spirit-good' : 'spirit-bad' });
    }

    // Clash detection
    const clashType = getClashType(dayGan, dayZhi, pillarKeys.year.branch, pillarKeys.month.stem, pillarKeys.month.branch);
    if (clashType === 'clash-year') {
        analysis.push({ text: 'Day-Year Branch Clash', tag: 'clash-year' });
    } else if (clashType === 'clash-month-stem') {
        analysis.push({ text: 'Day-Month Stem Clash', tag: 'clash-month-stem' });
    } else if (clashType === 'clash-month-branch') {
        analysis.push({ text: 'Day-Month Branch Clash', tag: 'clash-month-branch' });
    }
    // Tomb Sha: hour branch = tomb of day stem, only when element untimely
    if (isTombSha(pillarKeys.hour.branch, dayGan, seasonStrong, seasonGrowing)) {
        analysis.push({ text: `Tomb Sha 墓煞 (${dayGan}→${TOMB_SHA[dayGan]})`, tag: 'clash-year' });
    }
    const mvDate = MONTH_VIRTUE[pillarKeys.month.branch] || null;
    const personMthBranchMV2 = getPersonMonthBranch(
        document.getElementById('person-date').value,
        document.getElementById('person-time').value || '12:00',
        (parseFloat(document.getElementById('longitude').value) - parseFloat(document.getElementById('utc-offset').value) * 15) * 4 - (_dstOn ? 60 : 0)
    );
    const mvPerson = personMthBranchMV2 ? (MONTH_VIRTUE[personMthBranchMV2] || null) : null;
    const isDateMVStem   = mvDate   ? mvDate.stem   === pillarKeys.hour.stem   : false;
    const isDateMVBranch = mvDate   ? mvDate.branch === dayZhi                  : false;
    const isPersonMVStem   = mvPerson ? mvPerson.stem   === pillarKeys.hour.stem : false;
    const isPersonMVBranch = mvPerson ? mvPerson.branch === dayZhi               : false;
    const isDateMV   = isDateMVStem   || isDateMVBranch;
    const isPersonMV = isPersonMVStem || isPersonMVBranch;
    if (isDateMV || isPersonMV) {
        let label, tag;
        if (isDateMV && isPersonMV) { label = 'Month Virtue ★ (Date + Person)'; tag = 'mv-both'; }
        else if (isDateMV)           { label = 'Month Virtue (Date)';   tag = 'mv'; }
        else                         { label = 'Month Virtue (Person)'; tag = 'mv'; }
        analysis.push({ text: label, tag });
    }
    const bvDateBranch = BRANCH_VIRTUE[dayZhi] || null;
    const isDateBV = bvDateBranch === pillarKeys.hour.branch;
    const personDayZhiMain = (() => {
        const dv = document.getElementById('person-date').value;
        const tv = document.getElementById('person-time').value || '12:00';
        if (!dv) return null;
        const off = (parseFloat(document.getElementById('longitude').value) - parseFloat(document.getElementById('utc-offset').value) * 15) * 4 - (_dstOn ? 60 : 0);
        const s = Solar.fromDate(new Date(new Date(`${dv}T${tv}`).getTime() + off * 60000));
        return s.getLunar().getEightChar().getDayZhi();
    })();
    const isPersonBV = personDayZhiMain ? BRANCH_VIRTUE[personDayZhiMain] === dayZhi : false;
    if (isDateBV || isPersonBV) {
        let label, tag;
        if (isDateBV && isPersonBV) { label = 'Branch Virtue ★ (Date + Person)'; tag = 'bv-both'; }
        else if (isDateBV)           { label = 'Branch Virtue (Date)';   tag = 'bv'; }
        else                         { label = 'Branch Virtue (Person)'; tag = 'bv'; }
        analysis.push({ text: label, tag });
    }

    // Nayin (Melodic Element) analysis
    const personYearStemNY   = _personAStem      || null;
    const personYearBranchNY = _personABranch    || null;
    const personDayStemNY    = _personADayStem   || null;
    const personDayBranchNY  = _personADayBranch || null;
    const nayinResult = analyzeNayin(
        dayGan, dayZhi,
        pillarKeys.hour.stem, pillarKeys.hour.branch,
        pillarKeys.month.stem, pillarKeys.month.branch,
        pillarKeys.year.stem, pillarKeys.year.branch,
        personYearStemNY, personYearBranchNY,
        personDayStemNY, personDayBranchNY
    );
    if (nayinResult.label) {
        const tag = nayinResult.label === 'Nayin Power' ? 'nayin-power' : nayinResult.label === 'Nayin Weak' ? 'nayin-weak' : 'nayin';
        analysis.push({ text: nayinResult.label, tag, nayin: nayinResult.dayNayin });
    }
    if (nayinResult.personLabel) {
        const tag = nayinResult.personScore > 0 ? 'nayin-person-good' : 'nayin-person-bad';
        analysis.push({ text: nayinResult.personLabel, tag });
    }

    renderAnalysis(analysis);

    _currentDayXkdg     = xkdgData.day;
    _currentDayAnalysis = { items: analysis, sameFamily,
        pillars: { hour: xkdgData.hour, day: xkdgData.day, month: xkdgData.month, year: xkdgData.year },
        branches: { hour: pillarKeys.hour.branch, day: pillarKeys.day.branch, month: pillarKeys.month.branch, year: pillarKeys.year.branch },
        stems:    { hour: pillarKeys.hour.stem,   day: pillarKeys.day.stem,   month: pillarKeys.month.stem,   year: pillarKeys.year.stem } };

    // Re-run favourable check for both persons if data entered
    if (_personAYear) checkFavourable(_personAYear, _personAStem, _personABranch, 'A');
    else { const el = document.getElementById('favourable-col'); if(el) el.style.display = 'none'; }
    if (_personBYear) checkFavourable(_personBYear, _personBStem, _personBBranch, 'B');
    else { const el = document.getElementById('favourable-col-b'); if(el) el.style.display = 'none'; }

    // Highlight all hexagram boxes bright yellow if same family
    ['p-hour','p-day','p-month','p-year'].forEach(id => {
        const hexSection = document.querySelector(`#${id} .hex-section`);
        if (hexSection) {
            hexSection.style.background = sameFamily ? '#fffb00' : '';
            hexSection.style.boxShadow  = sameFamily ? '0 0 12px 3px #fffb00' : '';
        }
    });
}

function updatePillar(id, stem, branch, xkdg, nayin) {
    const elS = ELEMENTS_EN[stem];
    const elB = ELEMENTS_EN[branch];
    const p   = document.getElementById(id);
    if (!p) return;

    p.querySelector('.stem').innerHTML =
        `<span class="hanzi ${elS}">${stem}</span>` +
        `<span class="element-label">- ${elS} -</span>`;

    p.querySelector('.branch').innerHTML =
        `<span class="hanzi ${elB}">${branch}</span>` +
        `<span class="element-label">- ${elB} -</span>`;

    // Nayin — use English map, fall back to library string
    const nayinEn = NAYIN[stem + branch] || nayin || '';
    p.querySelector('.nayin').innerHTML =
        `<div class="nayin-label">${nayinEn}</div>`;

    // Build hex section from XKDG data
    let hexHTML = '';
    if (xkdg) {
        const icon       = getHexIcon(xkdg.hex);
        const hexName    = `${xkdg.hex} ${HEX_NAMES[xkdg.hex] || ''}`;
        const familyLabel = getHexFamilyLabel(stem, branch, xkdg.hex);
        const roleLabel   = getRoleLabel(stem, branch, xkdg.hex);
        hexHTML =
            `<div style="display:flex;flex-direction:column;align-items:center;width:100%;">` +
                `<div style="color:#d40000;font-weight:bold;font-size:20px;">${xkdg.qi}</div>` +
                `<div class="hex-icon" style="line-height:1;padding-top:6px;padding-bottom:0px;">${icon}</div>` +
                `<div style="color:#0044cc;font-weight:bold;font-size:20px;margin-top:-8px;">${xkdg.yun}</div>` +
            `</div>` +
            `<div class="hex-info">${hexName}</div>` +
            `<div class="hex-family-label">${familyLabel}</div>` +
            (roleLabel ? `<div style="margin-top:3px;text-align:center;width:100%;">${roleLabel}</div>` : '');
    } else {
        hexHTML = `<div class="hex-missing">No XKDG data<br>${stem}${branch}</div>`;
    }

    p.querySelector('.hex-section').innerHTML = hexHTML;
}

const ANALYSIS_TIPS = {
    'Very Timely':     'Day Element is the ruling season element AND well supported — at peak power.',
    'Timely':          'Day Element is generated by the current season — gaining strength (相).',
    'Timely at Birth': 'Day Element reaches its Chang Sheng (長生) Birth stage in the current month.',
    'Powerful':        'Day Element is strong in the season AND fully supported by Sheng In / Ke In from the other three hexagrams.',
    'Energetic':       'Day Element is either seasonally strong with partial support, or not in season but fully supported by the other hexagrams.',
    'Very Weak':       'Day Element is Dead or Weak in the current season AND receives no Sheng In / Ke In support from the other hexagrams.',
    'Noble (Date)':         'Noble Star 贵人 — Hour branch is a Noble branch of the Day stem. Attracts helpful people and smooth outcomes.',
    'Noble (Person)':       'Noble Star 贵人 — Day branch matches the Person\'s Noble branch. Personal support and assistance.',
    'Noble ★ (Date + Person)': 'Noble Star 贵人 — Both Date and Person Noble align. Double noble power — exceptional support.',
    'Lu (Date)':            'Lu Star 禄 — Hour branch is the Lu (Prosperity) branch of the Day stem. Wealth and career luck.',
    'Lu (Person)':          'Lu Star 禄 — Day branch is the Lu branch of the Person\'s Day stem. Personal prosperity.',
    'Lu ★ (Date + Person)': 'Lu Star 禄 — Both Date and Person Lu align. Double prosperity — strong wealth and career indication.',
    'Tian Yi (Date)':            'Tian Yi 天医 — Heavenly Doctor. Hour branch matches the Day stem\'s healing branch. Excellent for health matters.',
    'Tian Yi (Person)':          'Tian Yi 天医 — Day branch matches the Person\'s Heavenly Doctor branch. Personal healing energy.',
    'Tian Yi ★ (Date + Person)': 'Tian Yi 天医 — Both Date and Person Tian Yi align. Strongest healing star — ideal for health decisions.',
    'Heaven Virtue (Date)':            'Heaven Virtue 天德 — Protective heavenly star. Hour branch matches the Month branch\'s Heaven Virtue. Dissolves misfortune.',
    'Heaven Virtue (Person)':          'Heaven Virtue 天德 — Day branch matches the Person\'s Heaven Virtue. Personal divine protection.',
    'Heaven Virtue ★ (Date + Person)': 'Heaven Virtue 天德 — Both Date and Person Heaven Virtue align. Double protection — dissolves obstacles and bad luck.',
    'Branch Virtue (Date)':            'Branch Virtue 支德 — Supportive earth energy. Hour branch matches the Day branch\'s virtue pair. Stability and support.',
    'Branch Virtue (Person)':          'Branch Virtue 支德 — Day branch matches the Person\'s Branch Virtue. Personal grounding energy.',
    'Branch Virtue ★ (Date + Person)': 'Branch Virtue 支德 — Both Date and Person Branch Virtue align. Double grounding — strong stability.',
    'Month Virtue (Date)':             'Month Virtue 月德 — Monthly benevolent star. Hour stem/branch matches the Month branch\'s virtue. Smooth progress.',
    'Month Virtue (Person)':           'Month Virtue 月德 — Day branch matches the Person\'s Month Virtue. Personal monthly blessing and smooth flow.',
    'Month Virtue ★ (Date + Person)':  'Month Virtue 月德 — Both Date and Person Month virtue align. Double monthly blessing.',
    'Cerulean Dragon 青龙': 'Cerulean Dragon 青龙 — Most auspicious of the 12 spirits. Brings wealth, joy, and celebration. Excellent for all matters.',
    'Bright Hall 明堂':     'Bright Hall 明堂 — Auspicious spirit of clarity and opportunity. Good for meetings, signings, and new ventures.',
    'Golden Box 金柜':      'Golden Box 金柜 — Auspicious spirit associated with wealth and treasure. Good for financial matters.',
    'Jade Hall 玉堂':       'Jade Hall 玉堂 — Auspicious spirit of nobility and refinement. Good for career advancement and important events.',
    'Heaven Virtue 天德':   'Heaven Virtue Spirit 天德 — Divine protective spirit. Dissolves disasters and bad luck. Very auspicious.',
    'Fate Master 司命':     'Fate Master 司命 — Auspicious spirit overseeing life matters. Good for prayers, blessings, and life decisions.',
    'Heaven Penalty 天刑':  'Heaven Penalty 天刑 — Inauspicious spirit of lawsuits and conflict. Avoid legal matters and confrontations.',
    'Red Bird 朱雀':        'Red Bird 朱雀 — Inauspicious spirit causing disputes and arguments. Avoid signing contracts or important talks.',
    'White Tiger 白虎':     'White Tiger 白虎 — Inauspicious spirit of injury and accidents. Avoid surgery, travel, and risky activities.',
    'Black Tortoise 玄武':  'Black Tortoise 玄武 — Inauspicious spirit of theft and deception. Avoid financial transactions and trusting strangers.',
    'Heaven Prison 天牢':   'Heaven Prison 天牢 — Inauspicious spirit of obstruction and imprisonment. Avoid major decisions and new starts.',
    'Gou Chen 勾陈':        'Gou Chen 勾陈 — Inauspicious spirit of entanglement and delays. Avoid litigation and complex negotiations.',
    'Day-Year Branch Clash':   'Branch Clash ⚡ — Day branch directly clashes with Year branch. Turbulent energy — avoid major commitments.',
    'Day-Month Stem Clash':    'Stem Clash ⚡ — Day stem clashes with Month stem.',
    'Day-Month Branch Clash':  'Branch Clash ⚡ — Day branch clashes with Month branch.',
    'Adding Elements':  'Two or more pillars sum to 5, 10 or 15 in Qi.',
    'Month Virtue':     'Month Virtue 月德 — Monthly benevolent star. Attracts external support and social harmony.',
    'Adding Periods':   'Two or more pillars sum to 5, 10 or 15 in Yun in the period cycle.',
    'Hetu Elements':    'Two or more pillars form a He Tu pairing in Qi — numbers differing by 5.',
    'Hetu Periods':     'Two or more pillars form a He Tu pairing in Yun — numbers differing by 5.',
    'Pure Qi Elements': 'All four pillars share the same Qi number.',
    'Pure Qi Periods':  'All four pillars share the same Yun number.',
    'Inverse Hex':      'Hexagrams communicate well with their inverted counterparts, making the date usable.',
    'Family':           'Hexagrams belong to the same Blood Link family — a powerful and cohesive energy setting.',
    'Nayin Power': 'Nayin Power — All 3 other pillars support the Day Melodic Element (generated, in command, or matched). The day carries maximum Nayin energy.',
    'Nayin':       'Nayin — 2 of the 3 other pillars support the Day Melodic Element. Good Nayin setting, but not at full power.',
    'Nayin Weak':  'Nayin Weak — All 3 other pillars drain or suppress the Day Melodic Element. Avoid important actions on this day.',
    'Nayin ✦ Person': 'The Date Day Nayin has a positive relationship with the person\'s Nayin (Year or Day pillar). Y = Year, D = Day, DY = both.',
    'Nayin ✗ Person': 'The Date Day Nayin has a negative relationship with the person\'s Nayin (Year or Day pillar). Y = Year, D = Day, DY = both.',
};

// Technical-only descriptions for Person birth chart profile labels
const PROFILE_TIPS = {
    'Adding Elements':   'Two or more pillars sum to 5, 10 or 15 in Qi .',
    'Adding Periods':    'Two or more pillars sum to 5, 10 or 15 in Yun in the period cycle.',
    'Pure Adding':       'All four pillars form Adding relationships across both Qi and Yun.',
    'Hetu Elements':     'Two or more pillars form a He Tu pairing in Qi — numbers differing by 5.',
    'Hetu Periods':      'Two or more pillars form a He Tu pairing in Yun — numbers differing by 5.',
    'Pure Hetu':         'All four pillars form He Tu pairings across both Qi and Yun.',
    'Pure Qi':           'Three or more pillars share the same Qi number.',
    'Pure Qi Elements':  'All four pillars share the same Qi number.',
    'Pure Qi Periods':   'All four pillars share the same Yun number.',
    'Inverse Hex':       'Two or more pillars are inverted (mirror) versions of each other — all six lines flipped.',
    'Family':            'Two or more pillars belong to the same Blood Link family of eight hexagrams.',
};
function showProfileTip(el, text, dict) {
    event.stopPropagation();
    var desc = dict === 'profile' ? PROFILE_TIPS[text]
             : dict === 'analysis' ? ANALYSIS_TIPS[text]
             : (BADGE_INFO[text] ? BADGE_INFO[text].desc : null);
    var full = dict === 'badge' && BADGE_INFO[text] ? BADGE_INFO[text].full : text;
    if (!desc) return;
    var tip = document.getElementById('badge-tip');
    tip.innerHTML = '<strong>' + full + '</strong><br><span style="font-size:11px;opacity:0.85;">' + desc + '</span>';
    tip.style.display = 'block';
    tip.style.pointerEvents = 'auto';
    var r = el.getBoundingClientRect();
    tip.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 240)) + 'px';
    tip.style.top  = (r.bottom + 8) + 'px';
}

function showAnalysisTip(el, text) {
    event.stopPropagation();
    var desc = ANALYSIS_TIPS[text];
    var full = text;
    if (!desc) {
        var info = BADGE_INFO[text];
        if (info) { desc = info.desc; full = info.full; }
    }
    if (!desc) return;
    var tip = document.getElementById('badge-tip');
    tip.innerHTML = '<strong>' + full + '</strong><br><span style="font-size:11px;opacity:0.85;">' + desc + '</span>';
    tip.style.display = 'block';
    tip.style.pointerEvents = 'auto';
    var r = el.getBoundingClientRect();
    tip.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 240)) + 'px';
    tip.style.top  = (r.bottom + 8) + 'px';
}
function renderAnalysis(items) {
    const section   = document.getElementById('analysis-section');
    const container = document.getElementById('analysis-items');
    if (!items || items.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'flex';
    container.innerHTML = items.map(item => {
        const content = item.tag === 'blue'         ? `<span class="tag-blue">${item.text}</span>`
                      : item.tag === 'powerful'     ? `<span class="tag-powerful">${item.text}</span>`
                      : item.tag === 'energetic'    ? `<span class="tag-energetic">${item.text}</span>`
                      : item.tag === 'green'        ? `<span class="tag-green">${item.text}</span>`
                      : item.tag === 'gold'         ? `<span class="tag-gold">${item.text}</span>`
                      : item.tag === 'family'       ? `<span class="tag-family">⬡ ${item.text}</span>`
                      : item.tag === 'noble-both'   ? `<span class="tag-noble-both">☯ ${item.text}</span>`
                      : item.tag === 'noble'        ? `<span class="tag-noble">☯ ${item.text}</span>`
                      : item.tag === 'lu-both'      ? `<span class="tag-lu-both">禄 ${item.text}</span>`
                      : item.tag === 'lu'           ? `<span class="tag-lu">禄 ${item.text}</span>`
                      : item.tag === 'hv-both'      ? `<span class="tag-hv-both">天德 ${item.text}</span>`
                      : item.tag === 'hv'           ? `<span class="tag-hv">天德 ${item.text}</span>`
                      : item.tag === 'ty-both'      ? `<span class="tag-ty-both">天医 ${item.text}</span>`
                      : item.tag === 'ty'           ? `<span class="tag-ty">天医 ${item.text}</span>`
                      : item.tag === 'bv-both'      ? `<span class="tag-bv-both">支德 ${item.text}</span>`
                      : item.tag === 'bv'           ? `<span class="tag-bv">支德 ${item.text}</span>`
                      : item.tag === 'mv-both'      ? `<span class="tag-mv-both">月德 ${item.text}</span>`
                      : item.tag === 'mv'           ? `<span class="tag-mv">月德 ${item.text}</span>`
                      : item.tag === 'spirit-good'       ? `<span class="tag-spirit-good">★ ${item.text}</span>`
                      : item.tag === 'spirit-bad'        ? `<span class="tag-spirit-bad">✕ ${item.text}</span>`
                      : item.tag === 'clash-year'        ? `<span class="tag-clash-year"><span style="font-size:20px;">⚡</span> <strong>${item.text}</strong></span>`
                      : item.tag === 'clash-month-stem'  ? `<span class="tag-clash-month-stem"><span style="font-size:20px;">⚡</span> <strong>${item.text}</strong></span>`
                      : item.tag === 'clash-month-branch'? `<span class="tag-clash-month-branch"><span style="font-size:20px;">⚡</span> <strong>${item.text}</strong></span>`
                      : item.tag === 'nayin-power'       ? `<span style="color:#1b5e20;font-weight:bold;border:1px solid #1b5e20;border-radius:4px;padding:1px 6px;background:#e8f5e9;">☯ ${item.text}</span>`
                      : item.tag === 'nayin'             ? `<span style="color:#2e7d32;font-weight:bold;border:1px solid #2e7d32;border-radius:4px;padding:1px 6px;background:#f1f8e9;">${item.text}</span>`
                      : item.tag === 'nayin-weak'        ? `<span style="color:#b71c1c;font-weight:bold;border:1px solid #b71c1c;border-radius:4px;padding:1px 6px;background:#ffebee;">✕ ${item.text}</span>`
                      : item.tag === 'nayin-person-good' ? `<span style="color:#0d47a1;font-weight:bold;border:1px solid #0d47a1;border-radius:4px;padding:1px 6px;background:#e3f2fd;">✦ ${item.text}</span>`
                      : item.tag === 'nayin-person-bad'  ? `<span style="color:#e65100;font-weight:bold;border:1px solid #e65100;border-radius:4px;padding:1px 6px;background:#fff3e0;">✕ ${item.text}</span>`
                      : item.text;
        // Make any item tappable if ANALYSIS_TIPS or BADGE_INFO has an entry
        var tipKey = null;
        if (item.text) {
            tipKey = Object.keys(ANALYSIS_TIPS).find(k => item.text === k);
            if (!tipKey) tipKey = Object.keys(ANALYSIS_TIPS).find(k => item.text.startsWith(k));
            if (!tipKey) tipKey = Object.keys(BADGE_INFO).find(k => item.text === k);
            if (!tipKey) tipKey = Object.keys(BADGE_INFO).find(k => item.text.startsWith(k));
            if (!tipKey && item.text.startsWith('Tomb Sha')) tipKey = '墓煞';
        }
        var tipAttr = tipKey ? ' onclick="showAnalysisTip(this,\'' + tipKey.replace(/'/g,"\\'") + '\')" style="cursor:pointer;"' : '';
        return '<div class="analysis-item"' + tipAttr + '>⬡ ' + content + '</div>';
    }).join('');
}

// ─────────────────────────────────────────────
//  PERSON BIRTH CHART + ARCHIVE (A & B)
// ─────────────────────────────────────────────

let _personPanelOpen = { a: true, b: true };
let _showPersonStars = { a: false, b: false };

function togglePersonPanel(person) {
    _personPanelOpen[person] = !_personPanelOpen[person];
    const arrow = document.getElementById(`toggle-panel-${person}`);
    const isOn  = _personPanelOpen[person];

    if (isOn) {
        // Restore from archive if available
        if (arrow) arrow.textContent = '▾ ON';
    } else {
        // Clear active fields but keep archive
        const suffix = person === 'b' ? '-b' : '';
        document.getElementById(`person-name${suffix}`).value  = '';
        document.getElementById(`person-date${suffix}`).value  = '';
        document.getElementById(`person-time${suffix}`).value  = '12:00';
        // Clear calculated chart and relations
        const chartId = person === 'b' ? 'person-chart-b' : 'person-chart';
        const chartEl = document.getElementById(chartId);
        if (chartEl) chartEl.style.display = 'none';
        const wrapId2 = person === 'b' ? 'pillar-toggle-b-wrap' : 'pillar-toggle-a-wrap';
        const wrapEl = document.getElementById(wrapId2);
        if (wrapEl) wrapEl.style.display = 'none';
        const analysisId = person === 'b' ? 'person-analysis-b' : 'person-analysis-a';
        const analysisEl = document.getElementById(analysisId);
        if (analysisEl) analysisEl.style.display = 'none';
        // Clear global person data
        if (person === 'a') {
            _personAYear = null; _personAStem = null; _personABranch = null;
            _personADay  = null; _personARelations = null;
            _personADayStem = null; _personADayBranch = null;
            _personAMonth = null; _personAHour = null;
            _personAMonthBranch = null; _personADayBranchXkdg = null;
            _personAPillars = null;
        } else {
            _personBYear = null; _personBStem = null; _personBBranch = null;
            _personBDay  = null; _personBRelations = null;
            _personBDayStem = null; _personBDayBranch = null;
            _personBMonth = null; _personBHour = null;
            _personBMonthBranch = null; _personBDayBranchXkdg = null;
            _personBPillars = null;
        }
        if (arrow) arrow.textContent = '▸ OFF';
    }

    // Clear results and prompt rescan
    const mv = document.getElementById('month-view');
    const sr = document.getElementById('scan-results');
    const cv = document.getElementById('cal-view');
    if (mv) mv.innerHTML = `<div class="scan-empty">Person ${person.toUpperCase()} is ${isOn ? 'ON' : 'OFF'} — tap SCAN to refresh.</div>`;
    if (sr) sr.innerHTML = '';
    if (cv) cv.innerHTML = '';
    _scanResults = [];
    updateScoreModeBtn();
}



function togglePillarDisplay(person) {
    const chartId = person === 'b' ? 'person-chart-b' : 'person-chart';
    const btnId   = person === 'b' ? 'pillar-toggle-b' : 'pillar-toggle-a';
    const chart   = document.getElementById(chartId);
    const btn     = document.getElementById(btnId);
    if (!chart || !btn) return;

    const cells = chart.querySelectorAll('.cell.stem, .cell.branch, .cell.nayin');
    const isVisible = cells.length > 0 && cells[0].style.display !== 'none';
    cells.forEach(c => c.style.display = isVisible ? 'none' : '');
    btn.textContent = isVisible ? '▼ Show Pillars' : '▲ Hide Pillars';
}

function toggleScanSortMode() {
    window._chipSortMode = !window._chipSortMode;
    const nayinOrder = { 'Nayin Power': 3, 'Nayin': 2, 'Nayin Weak': 1 };
    const af = getActiveFilters();
    if (window._chipSortMode) {
        if (af.has('ke-wealth')) _scanResults.sort((a,b) => (b.keScore||0)-(a.keScore||0) || b.score-a.score);
        else if (af.has('nayin')) _scanResults.sort((a,b) => (nayinOrder[b.nayinLabel]||0)-(nayinOrder[a.nayinLabel]||0) || b.score-a.score);
        else _scanResults.sort((a,b) => b.score-a.score);
    } else {
        _scanResults.sort((a,b) => b.score - a.score);
    }
    const mode = _personBYear ? 'both' : 'score';
    renderScanResults(_scanResults, mode);
}

function togglePersonStars(person) {
    _showPersonStars[person] = !_showPersonStars[person];
    const btn = document.getElementById(`toggle-stars-${person}`);
    if (btn) {
        btn.textContent = _showPersonStars[person] ? '★ Stars ON' : '☆ Stars OFF';
        btn.style.background = _showPersonStars[person] ? '#fff9c4' : '#f5f5f5';
        btn.style.color = _showPersonStars[person] ? '#b8860b' : '#555';
    }
    // Re-render by recalculating
    calculatePerson(person === 'a' ? 'A' : 'B');
}
let _currentDayAnalysis = null;
let _scanResults = [];
let _personAYear = null, _personAStem = null, _personABranch = null;
let _personADay  = null, _personADayStem = null, _personADayBranch = null;
let _personAMonth = null, _personAHour = null;
let _personAMonthBranch = null, _personADayBranchXkdg = null;
let _personAPillars = null;
let _personARelations = null;
let _personBYear = null, _personBStem = null, _personBBranch = null;
let _personBDay  = null, _personBDayStem = null, _personBDayBranch = null;
let _personBMonth = null, _personBHour = null;
let _personBMonthBranch = null, _personBDayBranchXkdg = null;
let _personBPillars = null;
let _personBRelations = null;

// ── Archive ──────────────────────────────────
function loadArchive(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch(e) { return {}; }
}
function saveArchiveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function renderArchive(person) {
    const key     = person === 'B' ? 'xkdg_persons_b' : 'xkdg_persons_a';
    const divId   = person === 'B' ? 'person-archive-b' : 'person-archive';
    const archive = loadArchive(key);
    const hidden  = loadArchive('xkdg_persons_hidden') || {};
    const keys    = Object.keys(archive).filter(name => !hidden[name]);
    const div     = document.getElementById(divId);
    if (keys.length === 0) { div.style.display = 'none'; return; }
    div.style.display = 'flex';
    div.innerHTML = keys.map(name =>
        `<span style="display:inline-flex;align-items:center;gap:3px;margin:2px;">
            <span class="archive-btn" onclick="loadPerson('${person}','${name}')">${name}</span>
            <span class="archive-del" onclick="hidePerson(event,'${person}','${name}')" title="Hide from label row" style="font-size:13px;padding:1px 6px;border-radius:6px;background:#fff0f0;border:1px solid #ffcdd2;color:#c62828;font-weight:bold;cursor:pointer;">×</span>
         </span>`
    ).join('') + `<button onclick="openDB()" style="margin-left:auto;padding:2px 10px;font-size:11px;border-radius:8px;border:1px solid #1565c0;background:#e3f2fd;color:#1565c0;cursor:pointer;font-weight:bold;">📋 DB</button>`;
}

// ── Person Database ──────────────────────────────────────────
let _dbSort = 'alpha';

function openDB() {
    document.getElementById('db-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    renderDB();
}

function closeDB() {
    document.getElementById('db-modal').style.display = 'none';
    document.body.style.overflow = '';
}

function setDBSort(mode) {
    _dbSort = mode;
    document.getElementById('db-sort-alpha').style.background  = mode === 'alpha'  ? '#1976d2' : 'transparent';
    document.getElementById('db-sort-recent').style.background = mode === 'recent' ? '#1976d2' : 'transparent';
    document.getElementById('db-sort-alpha').style.border  = mode === 'alpha'  ? '1px solid #fff' : '1px solid #90caf9';
    document.getElementById('db-sort-recent').style.border = mode === 'recent' ? '1px solid #fff' : '1px solid #90caf9';
    renderDB();
}

function renderDB() {
    const archiveA = loadArchive('xkdg_persons_a');
    const archiveB = loadArchive('xkdg_persons_b');
    const notes    = loadArchive('xkdg_persons_notes') || {};
    const hidden   = loadArchive('xkdg_persons_hidden') || {};
    const pinned   = loadArchive('xkdg_persons_pinned') || {};
    const entries  = [];
    Object.entries(archiveA).forEach(([name, data]) => entries.push({ name, data, panel: 'A', savedAt: data.savedAt || 0 }));
    Object.entries(archiveB).forEach(([name, data]) => entries.push({ name, data, panel: 'B', savedAt: data.savedAt || 0 }));

    // Pinned always first, then apply sort
    if (_dbSort === 'alpha') entries.sort((a,b) => {
        const pa = pinned[a.name] ? 1 : 0, pb = pinned[b.name] ? 1 : 0;
        if (pb !== pa) return pb - pa;
        return a.name.localeCompare(b.name);
    });
    else entries.sort((a,b) => {
        const pa = pinned[a.name] ? 1 : 0, pb = pinned[b.name] ? 1 : 0;
        if (pb !== pa) return pb - pa;
        return (b.savedAt||0) - (a.savedAt||0);
    });

    if (entries.length === 0) {
        document.getElementById('db-list').innerHTML = '<div style="padding:20px;text-align:center;color:#888;">No persons saved yet.</div>';
        return;
    }

    document.getElementById('db-list').innerHTML = entries.map(({ name, data, panel }) => {
        const note = notes[name] || '';
        const dateStr = data.date ? data.date : '';
        const isHidden = !!hidden[name];
        const isPinned = !!pinned[name];
        const panelColor = panel === 'A' ? '#1b5e20' : '#6a1b9a';
        const panelBg    = panel === 'A' ? '#e8f5e9' : '#f3e5f5';
        const hiddenTag  = isHidden
            ? `<span style="font-size:10px;color:#888;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;padding:1px 6px;">hidden</span>
               <button onclick="showPersonInLabels(this.dataset.panel, this.dataset.name)" data-panel="${panel}" data-name="${name.replace(/"/g,'&quot;')}" style="font-size:10px;padding:1px 7px;border-radius:8px;border:1px solid #388e3c;background:#e8f5e9;color:#1b5e20;cursor:pointer;">Show</button>`
            : '';
        const pinBtn = `<span onclick="togglePinPerson(this.dataset.name)" data-name="${name.replace(/"/g,'&quot;')}" title="${isPinned?'Unpin':'Pin to top'}"
            style="cursor:pointer;font-size:15px;color:${isPinned?'#f9a825':'#ccc'};padding:0 2px;">★</span>`;
        return `<div style="border:1px solid ${isPinned?'#f9a825':'#e0e0e0'};border-radius:8px;margin:6px 0;padding:10px 12px;background:${isPinned?'#fffde7':isHidden?'#fafafa':'#fff'};">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                ${pinBtn}
                <span style="font-size:10px;font-weight:bold;color:${panelColor};background:${panelBg};border-radius:10px;padding:1px 7px;">${panel}</span>
                <span style="font-weight:bold;font-size:14px;flex:1;${isHidden?'opacity:0.5;':''}">${name}</span>
                <span style="font-size:11px;color:#888;">${dateStr}</span>
                ${hiddenTag}
                <button onclick="loadPersonFromDB('A', this.dataset.name)" data-name="${name.replace(/"/g,'&quot;')}" style="font-size:11px;padding:2px 8px;border-radius:8px;border:1px solid #1b5e20;background:#e8f5e9;color:#1b5e20;cursor:pointer;">→ A</button>
                <button onclick="loadPersonFromDB('B', this.dataset.name)" data-name="${name.replace(/"/g,'&quot;')}" style="font-size:11px;padding:2px 8px;border-radius:8px;border:1px solid #6a1b9a;background:#f3e5f5;color:#6a1b9a;cursor:pointer;">→ B</button>
                <span onclick="deleteFromDB(this.dataset.panel, this.dataset.name)" data-panel="${panel}" data-name="${name.replace(/"/g,'&quot;')}" style="font-size:13px;padding:1px 6px;border-radius:6px;background:#fff0f0;border:1px solid #ffcdd2;color:#c62828;font-weight:bold;cursor:pointer;">×</span>
            </div>
            <input type="text" placeholder="Note about this person…" value="${note.replace(/"/g,'&quot;')}"
                onchange="saveDBNote(this.dataset.name, this.value)" data-name="${name.replace(/"/g,'&quot;')}"
                style="width:100%;box-sizing:border-box;font-size:12px;padding:4px 8px;border:1px solid #ddd;border-radius:6px;background:#fff;color:#333;">
        </div>`;
    }).join('');
}

function togglePinPerson(name) {
    const n = (typeof name === 'string') ? name : name;
    const pinned = loadArchive('xkdg_persons_pinned') || {};
    if (pinned[n]) delete pinned[n];
    else pinned[n] = true;
    localStorage.setItem('xkdg_persons_pinned', JSON.stringify(pinned));
    renderDB();
}

function showPersonInLabels(panel, name) {
    const hidden = loadArchive('xkdg_persons_hidden') || {};
    delete hidden[name];
    localStorage.setItem('xkdg_persons_hidden', JSON.stringify(hidden));
    renderArchive(panel);
    renderDB();
}

function loadPersonFromDB(targetPanel, name) {
    closeDB();
    // Find which archive actually has this person
    const archiveA = loadArchive('xkdg_persons_a');
    const archiveB = loadArchive('xkdg_persons_b');
    const sourceKey = archiveA[name] ? 'xkdg_persons_a' : 'xkdg_persons_b';
    const p = archiveA[name] || archiveB[name];
    if (!p) return;

    const panelKey = targetPanel.toLowerCase();
    if (!_personPanelOpen[panelKey]) togglePersonPanel(panelKey);
    if (panelKey === 'b') {
        const panelEl = document.getElementById('person-panel-b');
        if (panelEl && panelEl.style.display === 'none') panelEl.style.display = 'block';
    }

    setTimeout(() => {
        const nameId = targetPanel === 'B' ? 'person-name-b' : 'person-name';
        const dateId = targetPanel === 'B' ? 'person-date-b' : 'person-date';
        const timeId = targetPanel === 'B' ? 'person-time-b' : 'person-time';
        document.getElementById(nameId).value = name;
        document.getElementById(dateId).value = p.date;
        document.getElementById(timeId).value = p.time || '12:00';
        // Restore pillar depth for Person B
        if (targetPanel === 'B') {
            const sel = document.getElementById('person-pillars-b');
            if (sel) { sel.value = p.depth || 4; onPersonBPillarsChange(); }
            if (p.depth === 1 && p.jiaZiYear) {
                const yr = document.getElementById('person-year-b');
                if (yr) yr.value = p.jiaZiYear;
            }
        }
        calculateBazi();
        calculatePerson(targetPanel);
    }, 80);
}

function saveDBNote(name, note) {
    const notes = loadArchive('xkdg_persons_notes') || {};
    notes[name] = note;
    localStorage.setItem('xkdg_persons_notes', JSON.stringify(notes));
}

function deleteFromDB(panel, name) {
    if (!confirm(`Permanently delete "${name}"?`)) return;
    const key = panel === 'B' ? 'xkdg_persons_b' : 'xkdg_persons_a';
    const archive = loadArchive(key);
    delete archive[name];
    saveArchiveData(key, archive);
    // Also remove note, hidden and pin flags
    const notes = loadArchive('xkdg_persons_notes') || {};
    delete notes[name];
    localStorage.setItem('xkdg_persons_notes', JSON.stringify(notes));
    const hidden2 = loadArchive('xkdg_persons_hidden') || {};
    delete hidden2[name];
    localStorage.setItem('xkdg_persons_hidden', JSON.stringify(hidden2));
    const pinned2 = loadArchive('xkdg_persons_pinned') || {};
    delete pinned2[name];
    localStorage.setItem('xkdg_persons_pinned', JSON.stringify(pinned2));
    renderArchive(panel);
    renderDB();
}

function savePerson(person) {
    const nameId = person === 'B' ? 'person-name-b' : 'person-name';
    const dateId = person === 'B' ? 'person-date-b' : 'person-date';
    const timeId = person === 'B' ? 'person-time-b' : 'person-time';
    const name   = document.getElementById(nameId).value.trim();
    const date   = document.getElementById(dateId).value;
    const time   = document.getElementById(timeId).value || '12:00';
    if (!name) { alert('Please enter a name.'); return; }
    if (!date) { alert('Please enter a birth date.'); return; }
    const key     = person === 'B' ? 'xkdg_persons_b' : 'xkdg_persons_a';
    const archive = loadArchive(key);
    const depth = isB ? (parseInt(document.getElementById('person-pillars-b')?.value) || 4) : 4;
    const jiaZiYear = (isB && depth === 1) ? (document.getElementById('person-year-b')?.value || '') : '';
    archive[name] = { date, time, savedAt: Date.now(), depth, jiaZiYear };
    saveArchiveData(key, archive);
    renderArchive(person);
}

function loadPerson(person, name) {
    const key     = person === 'B' ? 'xkdg_persons_b' : 'xkdg_persons_a';
    const archive = loadArchive(key);
    const p       = archive[name];
    if (!p) return;
    const nameId = person === 'B' ? 'person-name-b' : 'person-name';
    const dateId = person === 'B' ? 'person-date-b' : 'person-date';
    const timeId = person === 'B' ? 'person-time-b' : 'person-time';
    document.getElementById(nameId).value = name;
    document.getElementById(dateId).value = p.date;
    document.getElementById(timeId).value = p.time || '12:00';
    // Always recalculate main chart first to ensure fresh connection check
    calculateBazi();
    calculatePerson(person);
}

function hidePerson(e, person, name) {
    e.stopPropagation();
    const hidden = loadArchive('xkdg_persons_hidden') || {};
    hidden[name] = true;
    localStorage.setItem('xkdg_persons_hidden', JSON.stringify(hidden));
    renderArchive(person);
}

function deletePerson(e, person, name) {
    e.stopPropagation();
    hidePerson(e, person, name);
}

function onPersonBPillarsChange() {
    const depth = parseInt(document.getElementById('person-pillars-b').value);
    const dateRow = document.getElementById('person-b-date-row');
    const yearRow = document.getElementById('person-b-year-row');
    const timeRow = document.getElementById('person-b-time-row');
    const dstBtn  = document.getElementById('dst-btn-b');
    dateRow.style.display = depth >= 2 ? '' : 'none';
    yearRow.style.display = depth === 1 ? '' : 'none';
    timeRow.style.display = depth >= 4 ? '' : 'none';
    if (dstBtn) dstBtn.style.display = depth >= 4 ? '' : 'none';
}

// ── Calculate Person ─────────────────────────
function calculatePerson(person) {
    const isB    = person === 'B';
    const depth  = isB ? (parseInt(document.getElementById('person-pillars-b')?.value) || 4) : 4;
    const dateId = isB ? 'person-date-b' : 'person-date';
    const timeId = isB ? 'person-time-b' : 'person-time';

    // For depth 1 (year only), use JiaZi dropdown directly — no date calculation needed
    let dVal = document.getElementById(dateId).value;
    const tVal = depth >= 4 ? (document.getElementById(timeId).value || '12:00') : '12:00';

    if (isB && depth === 1) {
        const sel = document.getElementById('person-year-b');
        const jz  = sel ? sel.value.trim() : '';
        if (!jz || jz.length < 2) return;
        const yStem   = jz[0];
        const yBranch = jz[1];
        const yData   = getXkdgData(yStem, yBranch);
        // Set globals for year pillar only
        _personBYear = yData || null; _personBMonth = null; _personBDay = null; _personBHour = null;
        _personBPillars = { hour: null, day: null, month: null, year: yData || null };
        _personBStem = yStem; _personBBranch = yBranch;
        _personBDayStem = null; _personBDayBranch = null;
        _personBMonthBranch = null; _personBDayBranchXkdg = null; _personBRelations = [];
        // Show chart, fade unused pillars
        const chartEl = document.getElementById('person-chart-b');
        if (chartEl) chartEl.style.display = 'grid';
        const wrapEl = document.getElementById('pillar-toggle-b-wrap');
        if (wrapEl) wrapEl.style.display = 'block';
        ['pb-hour','pb-day','pb-month'].forEach(id => { const el = document.getElementById(id); if (el) el.style.opacity = '0.15'; });
        const yrEl = document.getElementById('pb-year'); if (yrEl) yrEl.style.opacity = '1';
        updatePillar('pb-year', yStem, yBranch, yData, NAYIN[yStem + yBranch] || '');
        checkFavourable(yData, yStem, yBranch, 'B');
        const aSection = document.getElementById('person-analysis-container-b');
        if (aSection) aSection.style.display = 'none';
        updateScoreModeBtn();
        return;
    }
    if (!dVal) return;

    const lon = parseFloat(document.getElementById('longitude').value);
    const utc = parseFloat(document.getElementById('utc-offset').value);
    const personDst = isB ? _dstOnB : _dstOnA;
    const offsetMin = ((lon - utc * 15) * 4) - (personDst ? 60 : 0);

    const baseDate  = new Date(`${dVal}T${tVal}`);
    const solarDate = new Date(baseDate.getTime() + offsetMin * 60000);
    const solar     = Solar.fromDate(solarDate);
    const lunar     = solar.getLunar();
    const eightChar = lunar.getEightChar();

    let dGan = eightChar.getDayGan(), dZhi = eightChar.getDayZhi();
    if (solarDate.getHours() === 23) {
        const yest = Solar.fromDate(new Date(solarDate.getTime() - 3600000));
        dGan = yest.getLunar().getEightChar().getDayGan();
        dZhi = yest.getLunar().getEightChar().getDayZhi();
    }

    const pillarKeys = {
        year:  { stem: eightChar.getYearGan(),  branch: eightChar.getYearZhi()  },
        month: depth >= 2 ? { stem: eightChar.getMonthGan(), branch: eightChar.getMonthZhi() } : null,
        day:   depth >= 3 ? { stem: dGan, branch: dZhi } : null,
        hour:  depth >= 4 ? { stem: eightChar.getTimeGan(),  branch: eightChar.getTimeZhi()  } : null
    };

    // Hide/show chart pillar columns based on depth (Person B only)
    if (isB) {
        ['pb-hour','pb-day','pb-month'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.style.opacity = (depth >= 4-i) ? '1' : '0.15';
        });
    }

    const xkdgData = {};
    const rawXkdgP = {};
    Object.keys(pillarKeys).forEach(k => {
        if (!pillarKeys[k]) return; // skip null pillars
        const { stem, branch } = pillarKeys[k];
        const data = getXkdgData(stem, branch);
        if (data) rawXkdgP[k] = { ...data, branch, stem };
    });
    Object.keys(rawXkdgP).forEach(k => {
        const others = Object.keys(rawXkdgP).filter(j => j !== k).map(j => rawXkdgP[j]);
        xkdgData[k] = resolveDualXkdg(rawXkdgP[k], others);
    });

    const chartId = isB ? 'person-chart-b' : 'person-chart';
    document.getElementById(chartId).style.display = 'grid';
    const wrapId = isB ? 'pillar-toggle-b-wrap' : 'pillar-toggle-a-wrap';
    const wrap = document.getElementById(wrapId);
    if (wrap) wrap.style.display = 'block';

    const prefix = isB ? 'pb' : 'pp';
    updatePillar(`${prefix}-year`,  pillarKeys.year.stem,  pillarKeys.year.branch,  xkdgData.year,  eightChar.getYearNaYin());
    if (pillarKeys.month) updatePillar(`${prefix}-month`, pillarKeys.month.stem, pillarKeys.month.branch, xkdgData.month, eightChar.getMonthNaYin());
    if (pillarKeys.day)   updatePillar(`${prefix}-day`,   pillarKeys.day.stem,   pillarKeys.day.branch,   xkdgData.day,   eightChar.getDayNaYin());
    if (pillarKeys.hour)  updatePillar(`${prefix}-hour`,  pillarKeys.hour.stem,  pillarKeys.hour.branch,  xkdgData.hour,  eightChar.getTimeNaYin());

    // Store year + day hexagram and active relations for compatibility
    if (isB) {
        _personBYear      = xkdgData.year;
        _personBMonth     = xkdgData.month || null;
        _personBDay       = xkdgData.day   || null;
        _personBHour      = xkdgData.hour  || null;
        _personBPillars   = { hour: xkdgData.hour||null, day: xkdgData.day||null, month: xkdgData.month||null, year: xkdgData.year };
        _personBStem      = pillarKeys.year.stem;
        _personBBranch    = pillarKeys.year.branch;
        _personBDayStem   = pillarKeys.day   ? pillarKeys.day.stem   : null;
        _personBDayBranch = pillarKeys.day   ? pillarKeys.day.branch : null;
        _personBMonthBranch   = pillarKeys.month ? pillarKeys.month.branch : null;
        _personBDayBranchXkdg = pillarKeys.day   ? pillarKeys.day.branch  : null;
        checkFavourable(xkdgData.year, pillarKeys.year.stem, pillarKeys.year.branch, 'B');
    } else {
        _personAYear      = xkdgData.year;
        _personAMonth     = xkdgData.month;
        _personADay       = xkdgData.day;
        _personAHour      = xkdgData.hour;
        _personAPillars   = { hour: xkdgData.hour, day: xkdgData.day, month: xkdgData.month, year: xkdgData.year };
        _personAStem      = pillarKeys.year.stem;
        _personABranch    = pillarKeys.year.branch;
        _personADay       = xkdgData.day;
        _personADayStem   = pillarKeys.day.stem;
        _personADayBranch = pillarKeys.day.branch;
        _personAMonthBranch   = pillarKeys.month.branch;
        _personADayBranchXkdg = pillarKeys.day.branch;
        checkFavourable(xkdgData.year, pillarKeys.year.stem, pillarKeys.year.branch, 'A');
    }

    // Store active relations (blue items) for compatibility analysis
    const { strong: pStrong, growing: pGrowing } = getJieqiSeason(solarDate);
    const { items: personAnalysis } = analyzeXkdg(xkdgData, pStrong, pGrowing);
    const activeRelations = personAnalysis.filter(i => i.tag === 'blue' || i.tag === 'family');
    if (isB) _personBRelations = activeRelations;
    else      _personARelations = activeRelations;

    // Add auspicious stars using person's own pillars (day stem vs hour branch)
    const showStars = _showPersonStars[isB ? 'b' : 'a'];
    if (showStars && pillarKeys.day && pillarKeys.hour) {
    const pDayGan  = pillarKeys.day.stem;
    const pDayZhi  = pillarKeys.day.branch;
    const pHourZhi = pillarKeys.hour.branch;
    const pHourGan = pillarKeys.hour.stem;
    const pMthZhi  = pillarKeys.month ? pillarKeys.month.branch : null;

    // Noble: hour branch is Noble for day stem
    const pNobles = NOBLE_BRANCHES[pDayGan] || [];
    if (pNobles.includes(pHourZhi)) personAnalysis.push({ text: 'Noble (Date)', tag: 'noble' });

    // Lu: hour branch is Lu for day stem
    if (LU_BRANCH[pDayGan] === pHourZhi) personAnalysis.push({ text: 'Lu (Date)', tag: 'lu' });

    // Tian Yi: hour branch matches day stem TY
    if (TIAN_YI[pDayGan] === pHourZhi) personAnalysis.push({ text: 'Tian Yi (Date)', tag: 'ty' });

    // Heaven Virtue: hour branch matches month branch HV
    const pHV = HEAVEN_VIRTUE[pMthZhi] || null;
    if (pHV === pHourZhi) personAnalysis.push({ text: 'Heaven Virtue (Date)', tag: 'hv' });

    // Branch Virtue: hour branch matches day branch BV
    const pBV = BRANCH_VIRTUE[pDayZhi] || null;
    if (pBV === pHourZhi) personAnalysis.push({ text: 'Branch Virtue (Date)', tag: 'bv' });

    // Month Virtue: hour stem or day branch matches month branch MV
    const pMV = MONTH_VIRTUE[pMthZhi] || null;
    if (pMV && (pMV.stem === pHourGan || pMV.branch === pDayZhi)) personAnalysis.push({ text: 'Month Virtue', tag: 'mv' });

    // 12 Spirits: hour branch vs day branch
    const pSpirit = getSpiritForHour(pDayZhi, pHourZhi);
    if (pSpirit) personAnalysis.push({ text: `${pSpirit.en} ${pSpirit.zh}`, tag: pSpirit.auspicious ? 'spirit-good' : 'spirit-bad' });

    // Clashes
    const pClash = getClashType(pDayGan, pDayZhi, pillarKeys.year.branch, pillarKeys.month.stem, pMthZhi);
    if (pClash === 'clash-year')              personAnalysis.push({ text: 'Day-Year Branch Clash', tag: 'clash-year' });
    else if (pClash === 'clash-month-stem')   personAnalysis.push({ text: 'Day-Month Stem Clash', tag: 'clash-month-stem' });
    else if (pClash === 'clash-month-branch') personAnalysis.push({ text: 'Day-Month Branch Clash', tag: 'clash-month-branch' });

    } // end if (showStars)
    const analysisContainerId = isB ? 'person-analysis-b' : 'person-analysis-a';
    const analysisItemsId     = isB ? 'person-analysis-items-b' : 'person-analysis-items-a';
    const analysisSection = document.getElementById(analysisContainerId);
    const analysisItems   = document.getElementById(analysisItemsId);
    if (personAnalysis && personAnalysis.length > 0) {
        analysisSection.style.display = 'flex';
        analysisItems.innerHTML = personAnalysis.map(item => {
            const content = item.tag === 'blue'   ? `<span class="tag-blue">${item.text}</span>`
                          : item.tag === 'green'  ? `<span class="tag-green">${item.text}</span>`
                          : item.tag === 'gold'   ? `<span class="tag-gold">${item.text}</span>`
                          : item.tag === 'family' ? `<span class="tag-family">⬡ ${item.text}</span>`
                          : item.tag === 'noble'  ? `<span class="tag-noble">☯ ${item.text}</span>`
                          : item.tag === 'lu'     ? `<span class="tag-lu">禄 ${item.text}</span>`
                          : item.tag === 'hv'     ? `<span class="tag-hv">天德 ${item.text}</span>`
                          : item.tag === 'bv'     ? `<span class="tag-bv">支德 ${item.text}</span>`
                          : item.tag === 'mv'     ? `<span class="tag-mv">月德 ${item.text}</span>`
                          : item.tag === 'ty'     ? `<span class="tag-ty">天医 ${item.text}</span>`
                          : item.tag === 'spirit-good' ? `<span class="tag-spirit-good">★ ${item.text}</span>`
                          : item.tag === 'spirit-bad'  ? `<span class="tag-spirit-bad">✕ ${item.text}</span>`
                          : item.tag === 'clash-year'         ? `<span class="tag-clash-year">⚡ ${item.text}</span>`
                          : item.tag === 'clash-month-stem'   ? `<span class="tag-clash-month-stem">⚡ ${item.text}</span>`
                          : item.tag === 'clash-month-branch' ? `<span class="tag-clash-month-branch">⚡ ${item.text}</span>`
                          : item.text;
            // Make any item tappable — use PROFILE_TIPS for technical definitions, fall back to ANALYSIS_TIPS/BADGE_INFO
            var tipKey = Object.keys(PROFILE_TIPS).find(k => item.text === k || item.text.startsWith(k));
            var tipDict = 'profile';
            if (!tipKey) { tipKey = Object.keys(ANALYSIS_TIPS).find(k => item.text === k || item.text.startsWith(k)); tipDict = 'analysis'; }
            if (!tipKey) { tipKey = Object.keys(BADGE_INFO).find(k => item.text === k || item.text.startsWith(k)); tipDict = 'badge'; }
            var tipAttr = tipKey ? ' onclick="showProfileTip(this,\'' + tipKey.replace(/'/g,"\\'") + '\',\'' + tipDict + '\')" style="cursor:pointer;"' : '';
            return '<div class="analysis-item"' + tipAttr + '>⬡ ' + content + '</div>';
        }).join('');
        // Restore toggle button state
        const btnKey = isB ? 'b' : 'a';
        const btn = document.getElementById(`toggle-stars-${btnKey}`);
        if (btn) {
            btn.textContent = _showPersonStars[btnKey] ? '★ Stars ON' : '☆ Stars OFF';
            btn.style.background = _showPersonStars[btnKey] ? '#fff9c4' : '#f5f5f5';
            btn.style.color = _showPersonStars[btnKey] ? '#b8860b' : '#555';
        }
    } else {
        analysisSection.style.display = 'none';
    }
    updateScoreModeBtn();
}

function checkCompatibility() {
    const div = document.getElementById('compatibility-result');
    if (!div) return;

    if (!_personAYear || !_personADay) { alert('Please calculate Person A first.'); return; }
    if (!_personBYear || !_personBDay) { alert('Please calculate Person B first.'); return; }

    const matches = [];

    // Helper: check if two hexagrams connect via a given relation type
    const connects = (xA, xB, type) => {
        const results = [];
        const sameQi   = xA.qi === xB.qi;
        const addingQi = [5,10,15].includes(xA.qi + xB.qi);
        const hetuQi   = isHetuPair(xA.qi, xB.qi);
        const sameYun  = xA.yun === xB.yun;
        const addingYun= [5,10,15].includes(xA.yun + xB.yun);
        const hetuYun  = isHetuPair(xA.yun, xB.yun);

        if (type.includes('Adding') || type === 'Adding' || type === 'Pure Adding') {
            if (addingQi)  results.push({ rel: 'Adding Elements', condA: type === 'Adding Elements' || type === 'Pure Adding' });
            if (addingYun) results.push({ rel: 'Adding Periods',  condA: type === 'Adding Periods'  || type === 'Pure Adding' });
        }
        if (type.includes('Hetu') || type === 'Hetu' || type === 'Pure Hetu') {
            if (hetuQi)   results.push({ rel: 'Hetu Elements', condA: type === 'Hetu Elements' || type === 'Pure Hetu' });
            if (hetuYun)  results.push({ rel: 'Hetu Periods',  condA: type === 'Hetu Periods'  || type === 'Pure Hetu' });
        }
        if (type.includes('Pure Qi') || type === 'Pure Qi') {
            if (sameQi)  results.push({ rel: 'Pure Qi Elements', condA: true });
            if (sameYun) results.push({ rel: 'Pure Qi Periods',  condA: true });
        }
        return results;
    };

    // Helper: label for hexagram pair
    const pairLabel = (keyA, keyB) => `A.${keyA === 'year' ? 'Year' : 'Day'} ↔ B.${keyB === 'year' ? 'Year' : 'Day'}`;

    const hexA = { year: { xkdg: _personAYear, stem: _personAStem, branch: _personABranch },
                   day:  { xkdg: _personADay,  stem: _personADayStem, branch: _personADayBranch } };
    const hexB = { year: { xkdg: _personBYear, stem: _personBStem, branch: _personBBranch },
                   day:  { xkdg: _personBDay,  stem: _personBDayStem, branch: _personBDayBranch } };

    // Pass 1: active relations from A's chart → check B's year + day
    for (const rel of (_personARelations || [])) {
        for (const keyA of ['year','day']) {
            for (const keyB of ['year','day']) {
                // Family: share same family
                if (rel.tag === 'family') {
                    const famA = getJiaZiFamilies(hexA[keyA].stem, hexA[keyA].branch);
                    const famB = getJiaZiFamilies(hexB[keyB].stem, hexB[keyB].branch);
                    const shared = famA.filter(f => famB.includes(f));
                    if (shared.length) matches.push({ label: pairLabel(keyA, keyB), rel: `Family: ${shared.join(', ')}`, condA: true, source: 'A' });
                } else {
                    const found = connects(hexA[keyA].xkdg, hexB[keyB].xkdg, rel.text);
                    found.forEach(f => matches.push({ label: pairLabel(keyA, keyB), rel: f.rel, condA: f.condA, source: 'A' }));
                }
            }
        }
    }

    // Pass 2: active relations from B's chart → check A's year + day
    for (const rel of (_personBRelations || [])) {
        for (const keyB of ['year','day']) {
            for (const keyA of ['year','day']) {
                if (rel.tag === 'family') {
                    const famB = getJiaZiFamilies(hexB[keyB].stem, hexB[keyB].branch);
                    const famA = getJiaZiFamilies(hexA[keyA].stem, hexA[keyA].branch);
                    const shared = famB.filter(f => famA.includes(f));
                    if (shared.length) {
                        const lbl = `B.${keyB === 'year' ? 'Year' : 'Day'} ↔ A.${keyA === 'year' ? 'Year' : 'Day'}`;
                        matches.push({ label: lbl, rel: `Family: ${shared.join(', ')}`, condA: true, source: 'B' });
                    }
                } else {
                    const found = connects(hexB[keyB].xkdg, hexA[keyA].xkdg, rel.text);
                    found.forEach(f => {
                        const lbl = `B.${keyB === 'year' ? 'Year' : 'Day'} ↔ A.${keyA === 'year' ? 'Year' : 'Day'}`;
                        matches.push({ label: lbl, rel: f.rel, condA: f.condA, source: 'B' });
                    });
                }
            }
        }
    }

    // Deduplicate
    const seen = new Set();
    const unique = matches.filter(m => {
        const key = `${m.label}|${m.rel}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });

    // Integration check
    const integrationNotes = [];
    const checkIntegration = (sourceRels, sourceName, targetName, targetRels) => {
        const activeTypes = [...new Set(sourceRels.map(r => r.text))];
        for (const relType of activeTypes) {
            const relBase = relType.replace(' Elements','').replace(' Periods','').replace('Pure ','').toLowerCase();

            const targetYearConnects = unique.some(m =>
                m.label.includes(`${targetName}.Year`) &&
                m.rel.toLowerCase().includes(relBase) &&
                m.source === sourceName
            );
            const targetDayConnects = unique.some(m =>
                m.label.includes(`${targetName}.Day`) &&
                m.rel.toLowerCase().includes(relBase) &&
                m.source === sourceName
            );
            const targetHasSameSetting = (targetRels || []).some(r =>
                r.text.toLowerCase().includes(relBase)
            );

            if (!targetYearConnects && !targetDayConnects) continue; // no connection at all, skip

            if (targetYearConnects && targetDayConnects && targetHasSameSetting) {
                // Full integration — no note needed
            } else if (targetYearConnects && targetDayConnects && !targetHasSameSetting) {
                integrationNotes.push(`${targetName} failed to integrate into ${sourceName}'s ${relType} setting — both Year and Day connect but ${targetName}'s own chart lacks that setting`);
            } else {
                const which = targetYearConnects ? 'Year connects, Day does not' : 'Day connects, Year does not';
                integrationNotes.push(`${targetName} failed to integrate into ${sourceName}'s ${relType} setting — partial connection only (${which})`);
            }
        }
    };

    if (_personARelations && _personARelations.length > 0)
        checkIntegration(_personARelations, 'A', 'B', _personBRelations);
    if (_personBRelations && _personBRelations.length > 0)
        checkIntegration(_personBRelations, 'B', 'A', _personARelations);

    div.style.display = 'block';
    if (unique.length === 0) {
        div.innerHTML = `<div style="color:#880e4f;font-weight:bold;font-size:13px;">♡ COMPATIBILITY</div>
            <div style="color:#555;font-size:12px;margin-top:6px;">No direct XKDG connection found between A and B.</div>`;
        return;
    }

    const score = unique.reduce((s, m) => s + (m.condA ? 2 : 1), 0);
    const scoreLabel = score >= 6 ? '★★★ Excellent' : score >= 4 ? '★★ Good' : score >= 2 ? '★ Moderate' : '~ Weak';

    div.innerHTML = `<div style="color:#880e4f;font-weight:bold;font-size:13px;margin-bottom:8px;">♡ COMPATIBILITY — ${scoreLabel} (${score}pts)</div>` +
        unique.map(m => {
            const condLabel = m.condA
                ? `<span style="color:#ad1457;font-weight:bold;">●</span>`
                : `<span style="color:#888;">○</span>`;
            const srcLabel = `<span style="font-size:10px;color:#888;">[from ${m.source}]</span>`;
            return `<div style="font-size:12px;padding:2px 0;">${condLabel} <b>${m.label}</b>: ${m.rel} ${srcLabel}</div>`;
        }).join('') +
        (integrationNotes.length ? `<div style="margin-top:8px;border-top:1px solid #e0a0b0;padding-top:6px;">` +
            integrationNotes.map(n => `<div style="font-size:11px;color:#b71c1c;font-style:italic;">⚠ ${n}</div>`).join('') +
            `</div>` : '') +
        `<div style="font-size:10px;color:#888;margin-top:6px;">● Same-type (stronger) &nbsp; ○ Cross-type (valid)</div>`;
}

const BADGE_INFO = {
    // Person star badges
    'N':   { full: 'Noble 天乙贵人', desc: 'The ultimate protector and catalyst for success. Most auspicious spirit, capable of overriding many negative influences. Resolves conflicts and dissolves negativity. Brings Noble help — mentors, experts, or helpful strangers who intervene at the right moment.' },
    'L':   { full: 'Lu 禄神 — Prosperity Star', desc: 'Good for job interviews, business openings, contract signing. Enhances authority and financial outcome.' },
    'HV':  { full: 'Heaven Virtue 天德', desc: 'Rescue star. Even if problems arise, a way out or external help exists to mitigate damage. Neutralizes Penalties (Xing) and Clashes (Chong).' },
    'BV':  { full: 'Branch Virtue 支德', desc: 'Practical support and operational efficiency. Ensures resources needed are available. Excellent for manual labor, renovations, logistics, and moving house.' },
    'MV':  { full: 'Month Virtue 月德', desc: 'Power of Relationships. Attracts external support and social harmony. Magnet for influential mentors. Grants immunity against gossip or social malice. Good for negotiations, interviews, or public speaking.' },
    'TY':  { full: 'Tian Yi 天医 — Heavenly Doctor', desc: 'A cleansing and healing star. Removes obstructions and restores balance. Good for starting new medical treatments, scheduling surgeries (if day is not clashed), beginning a detox, fast, or new health regimen.' },
    'V':   { full: 'Void 空亡 — Kong Wang', desc: 'State of non-existence or unreliability. Energy is neutralized. Actions taken do not produce lasting results. Contracts may become empty. Buying items may lead to hidden defects or loss. Wasted trips.' },
    '墓煞': { full: 'Tomb Sha 墓煞', desc: 'Stagnation, confinement, and locking up of energy. Present but trapped. Causes confusion, stubbornness, or being in the dark. Decisions made are often narrow-minded. Not ideal for moving house, traveling, or launching a product.' },
    // 12 Spirits
    'Bright Hall 明堂':      { full: 'Bright Hall 明堂', desc: 'Most auspicious of the 12 spirits. Clarity, visibility, and recognition. Excellent for signings, public launches, presentations, and receiving awards. What you do is seen and rewarded.' },
    'Cerulean Dragon 青龙':  { full: 'Cerulean Dragon 青龙', desc: 'Auspicious. Abundance, vitality, and noble energy. Good for starting ventures, wealth accumulation, and activities requiring creative or life force. Associated with growth and prosperity.' },
    'Heaven Virtue 天德':    { full: 'Heaven Virtue 天德 (Spirit)', desc: 'Auspicious. Moral authority and divine protection. Supports activities involving ethics, leadership, and matters of the heart. Protects against slander and hidden enemies.' },
    'Jade Hall 玉堂':        { full: 'Jade Hall 玉堂', desc: 'Auspicious. Wealth, comfort, and material accumulation. Good for financial planning, luxury purchases, real estate, and moving into a new home.' },
    'Golden Box 金柜':       { full: 'Golden Box 金柜', desc: 'Auspicious. Wealth storage and asset protection. Good for saving, investing, banking activities, and securing valuables. Supports financial contracts and long-term wealth preservation.' },
    'Heaven Prison 天牢':    { full: 'Heaven Prison 天牢', desc: 'Inauspicious. Obstruction, confinement, and blockage. Things get stuck or imprisoned. Avoid major decisions, new starts, or travel. Energy is locked and unable to move forward.' },
    'Fate Master 司命':      { full: 'Fate Master 司命', desc: 'Auspicious. Authority over destiny and karma. Good for prayers, rituals, ancestral offerings, making important decisions, and applying for official positions or permits.' },
    'Heaven Penalty 天刑':   { full: 'Heaven Penalty 天刑', desc: 'Inauspicious. Legal trouble, disputes, and punishments. Avoid lawsuits, contracts, travel, and major actions. Can indicate conflicts with authority figures or bureaucratic obstacles.' },
    'White Tiger 白虎':      { full: 'White Tiger 白虎', desc: 'Inauspicious. Accidents, injuries, and aggression. Avoid surgery, dangerous activities, or confrontational situations. Can bring sudden loss, bleeding, or violent events.' },
    'Black Tortoise 玄武':   { full: 'Black Tortoise 玄武', desc: 'Inauspicious. Deception, theft, and hidden enemies. Avoid trusting strangers, signing contracts, or leaving valuables unattended. Information may be concealed or distorted.' },
    'Gou Chen 勾陈':         { full: 'Gou Chen 勾陈', desc: 'Inauspicious. Entanglement, delays, and obstruction. Things get stuck or complicated. Legal disputes, emotional entanglements, and bureaucratic delays are likely. Avoid starting new ventures.' },
    'Red Bird 朱雀':         { full: 'Red Bird 朱雀', desc: 'Inauspicious. Arguments, disputes, and bad news. Avoid heated discussions, signing important documents, or making public announcements. Communication breakdowns and quarrels are likely.' },
    // XKDG Relations
    'Pure Qi Elements':      { full: 'Pure Qi Elements', desc: 'All four pillars share the same Qi number.' },
    'Pure Qi':               { full: 'Pure Qi', desc: 'Three pillars share the same Qi number.' },
    'Pure Adding Elements':  { full: 'Pure Adding Elements', desc: 'All pillars form Adding relationships across both Qi and Yun.' },
    'Pure Adding Periods':   { full: 'Pure Adding Periods', desc: 'All pillars form Adding relationships in Yun.' },
    'Adding Elements':       { full: 'Adding Elements', desc: 'Two or more pillars sum to 5, 10 or 15 in Qi .' },
    'Adding Periods':        { full: 'Adding Periods', desc: 'Two or more pillars sum to 5, 10 or 15 in Yun in the period cycle.' },
    'Pure Hetu Elements':    { full: 'Pure Hetu Elements', desc: 'All pillars form He Tu pairings across both Qi and Yun.' },
    'Pure Hetu Periods':     { full: 'Pure Hetu Periods', desc: 'All pillars form He Tu pairings in Yun.' },
    'Hetu Elements':         { full: 'Hetu Elements 河图', desc: 'Two or more pillars form a He Tu pairing in Qi — numbers differing by 5.' },
    'Hetu Periods':          { full: 'Hetu Periods 河图', desc: 'Two or more pillars form a He Tu pairing in Yun — numbers differing by 5.' },
    // Nayin
    'Inverse Hex':           { full: 'Inverse Hexagram', desc: 'Hexagrams communicate well with their inverted counterparts, making the date usable.' },
    'Family':                { full: 'Blood Link Family', desc: 'Hexagrams belong to the same Blood Link family — a powerful and cohesive energy setting.' },
    'Nayin Power':           { full: 'Nayin Power ☯', desc: 'All three pillars (Hour, Month, Year) have positive Nayin relationships with the Day Nayin. Maximum melodic element harmony. Strong amplification of the day\'s energy.' },
    'Nayin':                 { full: 'Nayin 纳音', desc: 'Two pillars have positive Nayin relationships with the Day Nayin. Melodic element harmony — the day\'s energy is supported and amplified.' },
    'Nayin Weak':            { full: 'Nayin Weak ✕', desc: 'All three pillars have negative Nayin relationships with the Day Nayin. The day\'s melodic energy is drained or opposed. Reduces overall effectiveness.' },
    '✦ Nayin Person':        { full: 'Nayin Person ✦', desc: 'The Date Day Nayin has a positive relationship with the person\'s Nayin. Y = via person\'s Year pillar, D = via person\'s Day pillar, DY = both.' },
    '✗ Nayin Person':        { full: 'Nayin Person ✗', desc: 'The Date Day Nayin has a negative relationship with the person\'s Nayin. Y = via person\'s Year pillar, D = via person\'s Day pillar, DY = both.' },
    // Ke Wealth
    'Ke':                    { full: 'Ke Wealth 克财', desc: 'Wealth activation conditions are met. The day or hour stems/elements create a Ke (controlling) relationship that activates wealth energy. More conditions = stronger wealth potential.' },
};

function showBadgeTip(el, code) {
    const info = BADGE_INFO[code];
    const desc = info ? info.desc : ANALYSIS_TIPS[code];
    const full = info ? info.full : code;
    if (!desc) return;
    const tip = document.getElementById('badge-tip');
    tip.innerHTML = `<strong>${full}</strong><br><span style="font-size:11px;opacity:0.85;">${desc}</span>`;
    tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    tip.style.left = Math.min(r.left, window.innerWidth - 230) + 'px';
    tip.style.top  = (r.bottom + 6) + 'px';
}

document.addEventListener('click', e => {
    const tip = document.getElementById('badge-tip');
    if (tip && e.target !== tip && !tip.contains(e.target)) tip.style.display = 'none';
});

function checkFavourable(personYear, pStem, pBranch, person) {
    const colId    = person === 'B' ? 'favourable-col-b' : 'favourable-col';
    const detailId = person === 'B' ? 'favourable-detail-b' : 'favourable-detail';
    const col    = document.getElementById(colId);
    const detail = document.getElementById(detailId);
    col.style.display = 'none';
    if (!personYear || !_currentDayXkdg || !_currentDayAnalysis) return;
    if (_currentDayAnalysis.items.length === 0) return;
    const dayXkdg = _currentDayXkdg;
    const personPillars = person === 'B' ? _personBPillars : _personAPillars;
    const personDayStem   = person === 'B' ? _personBDayStem   : _personADayStem;
    const personDayBranch = person === 'B' ? _personBDayBranch : _personADayBranch;
    const matches = getMatchLabels(personYear, pStem, pBranch, dayXkdg, dayXkdg.stem, dayXkdg.branch, personPillars, personDayStem, personDayBranch);
    if (matches.length === 0) return;
    col.style.display = 'flex';
    detail.textContent = matches.join(' · ');
    updatePurposeIcon(person);
}

function showMatchTip(el, person) {
    event.stopPropagation();
    const isB = person === 'B';
    const detail = document.getElementById(isB ? 'favourable-detail-b' : 'favourable-detail').textContent;
    const tip = document.getElementById('badge-tip');
    tip.innerHTML = `<strong>Perfect match between person and date</strong><br><span style="font-size:15px;font-weight:bold;color:#FFD700;">${detail}</span>`;
    tip.style.display = 'block';
    tip.style.pointerEvents = 'auto';
    const r = el.getBoundingClientRect();
    const left = Math.max(10, Math.min(r.left, window.innerWidth - 240));
    tip.style.left = left + 'px';
    tip.style.top  = (r.bottom + 8) + 'px';
}


function sortResults(mode) {
    if (!mode) mode = personBYear ? 'both' : 'score';
    let filtered = [..._scanResults];
    if (mode === 'both') filtered = filtered.filter(r => r.scoreA > 0 && r.scoreB > 0).sort((a,b) => (b.scoreA+b.scoreB) - (a.scoreA+a.scoreB));
    else if (mode === 'score') filtered.sort((a,b) => b.score - a.score);
    else filtered.sort((a,b) => a.rawDate - b.rawDate);
    renderScanResults(filtered, mode);
}

function localISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
}

function loadDateIntoMain(isoDate, hourIndex) {
    const lon = parseFloat(document.getElementById('longitude').value);
    const utc = parseFloat(document.getElementById('utc-offset').value);
    const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);

    // Convert True Solar hour midpoint back to local clock time
    const hourStart = HOUR_STARTS[hourIndex];
    const solarMinutes = hourStart * 60 + 30;
    const localMinutes = solarMinutes - offsetMin;

    // Handle day crossing
    let dateStr = isoDate;
    let dayOffset = 0;
    if (localMinutes < 0) dayOffset = -1;
    else if (localMinutes >= 1440) dayOffset = 1;

    if (dayOffset !== 0) {
        const d = new Date(isoDate + 'T12:00:00');
        d.setDate(d.getDate() + dayOffset);
        dateStr = d.toISOString().split('T')[0];
    }

    const totalMins = ((localMinutes % 1440) + 1440) % 1440;
    const hh = Math.floor(totalMins / 60);
    const mm = Math.floor(totalMins % 60);
    const timeStr = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');

    document.getElementById('date').value = dateStr;
    document.getElementById('time').value = timeStr;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    calculateBazi();
}

function renderScanResults(results, mode) {
    const container = document.getElementById('scan-results');
    if (!container) return;
    container.style.display = 'block';
    var activePurpose = getPurpose();
    var purposeHeader = activePurpose
        ? '<div style="background:#1565c0;color:white;font-weight:bold;font-size:14px;padding:10px 14px;border-radius:8px;margin-bottom:10px;display:flex;align-items:center;gap:8px;"><span style=\"font-size:20px;\">' + PURPOSE_ICONS[activePurpose] + '</span><span>' + PURPOSE_NAMES[activePurpose] + ' Selection</span></div>'
        : '';

    // Sort toggle button — show whenever any chip is active
    const af = getActiveFilters();
    const hasChipSort = af.size > 0;
    const chipSortLabel = af.has('ke-wealth') ? 'Ke Sort' : af.has('nayin') ? 'NaYin Sort' : 'Chip Sort';
    const sortToggleHTML = hasChipSort
        ? `<div style="text-align:right;margin-bottom:6px;">
            <button onclick="toggleScanSortMode()" id="chip-sort-btn" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #1565c0;background:${window._chipSortMode?'#1565c0':'#fff'};color:${window._chipSortMode?'#fff':'#1565c0'};cursor:pointer;">
              ${window._chipSortMode ? '⇅ '+chipSortLabel : '⇅ Score Sort'}
            </button>
           </div>`
        : '';
    if (results.length === 0) {
        container.innerHTML = purposeHeader + sortToggleHTML + '<div class="scan-empty">No matching dates found.</div>';
        return;
    }
    const maxScore = Math.max(...results.map(r => mode === 'both' ? r.scoreA + r.scoreB : r.score));
    container.innerHTML = purposeHeader + sortToggleHTML + results.map(r => {
        const s = mode === 'both' ? r.scoreA + r.scoreB : r.score;
        const rankClass = s >= maxScore * 0.9 ? 'rank-1'
                        : s >= maxScore * 0.75 ? 'rank-2'
                        : s >= maxScore * 0.55 ? 'rank-3'
                        : s >= maxScore * 0.35 ? 'rank-4'
                        : 'rank-5';
        const hasBothPersons = results.some(r => r.scoreB > 0);
        const bTag = hasBothPersons && r.scoreB > 0 ? ` <span style="color:#7b1fa2;font-weight:bold;font-size:14px;">B</span>` : '';
        const aTag = hasBothPersons && r.scoreA > 0 ? ` <span style="color:#2e7d32;font-weight:bold;font-size:14px;">A</span>` : '';
        const spiritStr = r.spiritLabel ? `<span style="font-size:10px;font-weight:bold;color:${r.spiritAuspicious ? '#0044cc' : '#d40000'};cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'${r.spiritLabel}')">${r.spiritLabel}</span>` : '';
        // Purpose condition label
        const purpose = getPurpose();
        const purposeCondLabel = purpose ? (() => {
            if (purpose === 'health')       return r.hasTY     ? '<span style="color:#2e7d32;font-weight:bold;">Parent+TY</span>' : (r.isDayTY ? '<span style="color:#2e7d32;font-weight:bold;">TY Day</span>' : '');
            if (purpose === 'career')       return r.hasNoble  ? '<span style="color:#2e7d32;font-weight:bold;">Parent+Noble</span>' : '';
            if (purpose === 'wealth')       return `<span style="color:#2e7d32;font-weight:bold;">Child+Parent${r.wealthBonus ? ' <span style="color:#b8860b;">+' + r.wealthBonus + '✦</span>' : ''}</span>`;
            if (purpose === 'relationship') return '<span style="color:#2e7d32;font-weight:bold;">Child+Parent/Adding</span>';
            if (purpose === 'journey')      return '<span style="color:#2e7d32;font-weight:bold;">Journey</span>';
            if (purpose === 'speak')        return '<span style="color:#2e7d32;font-weight:bold;">🎤 Speak</span>';
            return '';
        })() : '';
        const nayinStr = r.nayinLabel === 'Nayin Power' ? `<span style="font-size:10px;font-weight:bold;color:#1b5e20;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'Nayin Power')">☯ Nayin Power</span>`
                       : r.nayinLabel === 'Nayin'       ? `<span style="font-size:10px;font-weight:bold;color:#2e7d32;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'Nayin')">Nayin</span>`
                       : r.nayinLabel === 'Nayin Weak'  ? `<span style="font-size:10px;font-weight:bold;color:#b71c1c;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'Nayin Weak')">✕ Nayin Weak</span>`
                       : '';
        const nayinPersonStr = r.nayinPersonLabel && r.nayinPersonLabel.startsWith('Nayin ✦ Person')
                             ? `<span style="font-size:10px;font-weight:bold;color:#0d47a1;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'✦ Nayin Person')">${r.nayinPersonLabel.replace('Nayin ✦ Person','✦ Nayin Person')}</span>`
                             : r.nayinPersonLabel && r.nayinPersonLabel.startsWith('Nayin ✗ Person')
                             ? `<span style="font-size:10px;font-weight:bold;color:#e65100;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'✗ Nayin Person')">${r.nayinPersonLabel.replace('Nayin ✗ Person','✗ Nayin Person')}</span>`
                             : '';
        const keStr = r.keScore > 0 ? `<span style="font-size:10px;font-weight:bold;color:#b8860b;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'Ke')">Ke+${r.keScore}</span>` : '';
        const blueTagsHtml = [...r.blueLabels, ...r.matchLabels, ...r.qualLabels].filter(Boolean)
            .map(t => `<span style="cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'${t.replace(/'/g,"\\'")}')">${t}</span>`).join(' · ');
        return `<div class="scan-item ${rankClass}" style="cursor:pointer;" onclick="loadDateIntoMain('${r.isoDate}', ${r.hourIndex})" title="Click to load this date">
            <div class="scan-score">${s}${aTag}${bTag}</div>
            <div class="scan-date">📅 ${r.date}<br><small>${r.hour}</small></div>
            <div class="scan-tags">${[purposeCondLabel, blueTagsHtml].filter(Boolean).join(' · ')} ${spiritStr} ${nayinStr} ${nayinPersonStr} ${keStr}</div>
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────
//  DATE SCANNER
// ─────────────────────────────────────────────

// Chinese hour start times (local solar time, hour index 0-11)
const HOUR_STARTS = [23,1,3,5,7,9,11,13,15,17,19,21]; // 子丑寅卯辰巳午未申酉戌亥
const HOUR_NAMES  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const HOUR_ROMAN  = ['Zi(23-01)','Chou(01-03)','Yin(03-05)','Mao(05-07)','Chen(07-09)',
                     'Si(09-11)','Wu(11-13)','Wei(13-15)','Shen(15-17)','You(17-19)',
                     'Xu(19-21)','Hai(21-23)'];

// Store person year xkdg for scanner
let _personYearXkdg = null;
let _personYearStem = null;
let _personYearBranch = null;

function getMatchScore(personYear, pStem, pBranch, dayXkdg, dayStem, dayBranch) {
    if (!personYear || !dayXkdg) return 0;
    const pQi = personYear.qi, pYun = personYear.yun;
    const dQi = dayXkdg.qi,   dYun = dayXkdg.yun;

    // Family (highest = 4)
    const sharedFams = getJiaZiFamilies(pStem, pBranch).filter(f => getJiaZiFamilies(dayStem, dayBranch).includes(f));
    if (sharedFams.length > 0) return 4;

    // Pure Qi (= 3): exact same qi OR same yun
    if (pQi === dQi || pYun === dYun) return 3;

    // Pure Hetu / Pure Adding (= 2): both qi AND yun connect the same way
    const bothHetu   = isHetuPair(pQi, dQi) && isHetuPair(pYun, dYun);
    const bothAdding = [5,10,15].includes(pQi + dQi) && [5,10,15].includes(pYun + dYun);
    if (bothHetu || bothAdding) return 2;

    // Hetu / Adding (= 1): at least one dimension connects
    if (isHetuPair(pQi, dQi) || [5,10,15].includes(pQi + dQi) ||
        isHetuPair(pYun, dYun) || [5,10,15].includes(pYun + dYun)) return 1;

    return 0;
}

function getDateQualityScore(analysisItems) {
    let strength = 0, timely = 0;
    analysisItems.forEach(item => {
        const t = item.text;
        if      (t === 'Powerful')   strength = 4;
        else if (t === 'Energetic')  strength = 3;
        else if (t === 'Very Weak')  strength = 0;
        if      (t === 'Very Timely')     timely = 2;
        else if (t === 'Timely')          timely = 1;
        else if (t === 'Timely at Birth') timely = 1;
    });
    return strength + timely;
}

function getMatchLabels(personYear, pStem, pBranch, dayXkdg, dayStem, dayBranch, personPillars, personDayStem, personDayBranch) {
    const labels = [];
    if (!_currentDayAnalysis) return labels;
    if (!personYear) return labels;
    const items    = _currentDayAnalysis.items;
    const pillars  = _currentDayAnalysis.pillars;
    const pQi = personYear.qi, pYun = personYear.yun;

    // Helper: check if 4 pillars form a full He Tu setting on qi or yun line
    function hasFullHetu(p) {
        const qs = [p.hour?.qi, p.day?.qi, p.month?.qi, p.year?.qi].filter(v => v != null);
        const ys = [p.hour?.yun, p.day?.yun, p.month?.yun, p.year?.yun].filter(v => v != null);
        if (qs.length < 4 || ys.length < 4) return { qi: false, yun: false };
        function twoHPairs(arr) {
            const pairs = [[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]];
            return pairs.some(([a,b]) =>
                ['1-6','2-7','3-8','4-9'].includes([arr[a[0]],arr[a[1]]].sort((x,y)=>x-y).join('-')) &&
                ['1-6','2-7','3-8','4-9'].includes([arr[b[0]],arr[b[1]]].sort((x,y)=>x-y).join('-')));
        }
        return { qi: twoHPairs(qs), yun: twoHPairs(ys) };
    }

    // Helper: check if 4 pillars form Adding setting (pairs summing to 5/10/15)
    function hasAdding(p) {
        const qs = [p.hour?.qi, p.day?.qi, p.month?.qi, p.year?.qi].filter(v => v != null);
        const ys = [p.hour?.yun, p.day?.yun, p.month?.yun, p.year?.yun].filter(v => v != null);
        if (qs.length < 4 || ys.length < 4) return { qi: false, yun: false };
        function twoAPairs(arr) {
            const pairs = [[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]];
            return pairs.some(([a,b]) =>
                [5,10,15].includes(arr[a[0]]+arr[a[1]]) &&
                [5,10,15].includes(arr[b[0]]+arr[b[1]]));
        }
        return { qi: twoAPairs(qs), yun: twoAPairs(ys) };
    }

    // Helper: check if 4 pillars have Pure Qi (all same)
    function hasPureQi(p) {
        const qs = [p.hour?.qi, p.day?.qi, p.month?.qi, p.year?.qi].filter(v => v != null);
        const ys = [p.hour?.yun, p.day?.yun, p.month?.yun, p.year?.yun].filter(v => v != null);
        if (qs.length < 4 || ys.length < 4) return { qi: false, yun: false };
        return { qi: qs.every(v=>v===qs[0]), yun: ys.every(v=>v===ys[0]) };
    }

    const dateHetu   = hasFullHetu(pillars);
    const dateAdding = hasAdding(pillars);
    const datePureQi = hasPureQi(pillars);

    // ── Standard direct connection checks ────────────────────────
    if ((dateHetu.qi   && isHetuPair(pQi,  dayXkdg.qi))  ||
        (dateHetu.yun  && isHetuPair(pYun, dayXkdg.yun))) labels.push('Hetu');

    const hasGroupAdding = items.some(i => i.text.includes('Adding'));
    const sq = pQi + dayXkdg.qi, sy = pYun + dayXkdg.yun;
    if (hasGroupAdding && ([5,10,15].includes(sq) || [5,10,15].includes(sy)))
        labels.push(`Adding(${[5,10,15].includes(sq) ? sq : sy})`);

    const hasGroupPureQi = items.some(i => i.text.includes('Pure Qi'));
    if (hasGroupPureQi && (pQi === dayXkdg.qi || pYun === dayXkdg.yun)) labels.push('Pure Qi');

    const hasGroupFamily = items.some(i => i.tag === 'family');
    const sharedFams = getJiaZiFamilies(pStem, pBranch).filter(f => getJiaZiFamilies(dayStem, dayBranch).includes(f));
    if (hasGroupFamily && sharedFams.length > 0) labels.push('Family: ' + sharedFams.join(','));

    // Inverse Hex: group must have Inverse Hex setting, person's year hex = inverse of day hex
    const hasGroupInverse = items.some(i => i.text.startsWith('Inverse Hex'));
    if (hasGroupInverse && dayXkdg.hex) {
        const invHex = getInverseHex(dayXkdg.hex);
        if (invHex && personYear.hex === invHex) labels.push('Inverse Hex');
    }


    // ── New Rule: Same Setting Resonance ─────────────────────────
    // Both date AND person birth chart have same group setting type,
    // AND person's YEAR or DAY pillar shares family with date pillars
    if (labels.length === 0 && personPillars) {
        const personHetu   = hasFullHetu(personPillars);
        const personAdding = hasAdding(personPillars);
        const personPureQi = hasPureQi(personPillars);

        const sameHetu   = (dateHetu.qi   && personHetu.qi)   || (dateHetu.yun   && personHetu.yun);
        const sameAdding = (dateAdding.qi  && personAdding.qi) || (dateAdding.yun  && personAdding.yun);
        const samePureQi = (datePureQi.qi  && personPureQi.qi) || (datePureQi.yun  && personPureQi.yun);

        if (sameHetu || sameAdding || samePureQi) {
            // Family bridge: person's YEAR or DAY must share family with date
            const yearFams = getJiaZiFamilies(pStem, pBranch);
            const dayFams  = personDayStem ? getJiaZiFamilies(personDayStem, personDayBranch) : [];
            const dateFams = getJiaZiFamilies(dayStem, dayBranch);
            const yearBridge = yearFams.some(f => dateFams.includes(f));
            const dayBridge  = dayFams.some(f => dateFams.includes(f));
            if (yearBridge || dayBridge) {
                const settingType = sameAdding ? 'Adding' : sameHetu ? 'Hetu' : 'Pure Qi';
                labels.push(`Resonance(${settingType})`);
            }
        }
    }


    // ── Partial Blood Link ────────────────────────────────────────
    // 3 pillars share same family, 4th connects via Adding/HeTu/PureQi
    // AND lonely pillar branch doesn't clash with any of the 3 family pillars
    if (labels.length === 0) {
        const pKeys = ['hour','day','month','year'];
        const allFams = ['Qian-Kun','Kan-Li','Zhen-Xun','Gen-Dui','Pi-Tai','JiJi-WeiJi','Heng-Yi','Sun-Xian'];
        const branches = _currentDayAnalysis.branches;

        for (const fam of allFams) {
            const stems   = _currentDayAnalysis.stems;
            const inFam  = pKeys.filter(k => getJiaZiFamilies(stems[k] || '', branches[k] || '').includes(fam));
            const outFam = pKeys.filter(k => !inFam.includes(k));

            if (inFam.length === 3 && outFam.length === 1) {
                const lonely = outFam[0];
                const lp = pillars[lonely];
                const lb = branches[lonely];

                // Lonely connects to at least one family pillar
                const connects = inFam.some(k => {
                    const fp = pillars[k];
                    return isHetuPair(lp.qi, fp.qi) || isHetuPair(lp.yun, fp.yun) ||
                           [5,10,15].includes(lp.qi + fp.qi) || [5,10,15].includes(lp.yun + fp.yun) ||
                           lp.qi === fp.qi || lp.yun === fp.yun;
                });
                if (!connects) continue;

                // No branch clash between lonely and the 3 family pillars
                const noClash = inFam.every(k => BRANCH_CLASHES[lb] !== branches[k] && BRANCH_CLASHES[branches[k]] !== lb);
                if (noClash) {
                    labels.push('Partial BL(' + fam + ')');
                    break;
                }
            }
        }
    }

    return labels;
}
// ── Person Same-Type Bonus ────────────────────────────────────
// Condition A: person's birthday connects with the day in the SAME relation type
// that is active among the 4 pillars → +2 bonus.
// Condition B: connects in a different way → no extra bonus (score unchanged).
function getPersonSameTypeBonus(blueItems, personYear, dayXkdg, pStem, pBranch, dayStem, dayBranch) {
    if (!personYear || !dayXkdg) return 0;

    const pQi  = personYear.qi,  pYun = personYear.yun;
    const dQi  = dayXkdg.qi,     dYun = dayXkdg.yun;

    // Detect relation types active among the 4 pillars
    const hasDateFamily    = blueItems.some(i => i.tag === 'family');
    const hasDatePureQi    = blueItems.some(i => i.text === 'Pure Qi' || i.text === 'Pure Qi Elements' || i.text === 'Pure Qi Periods');
    const hasDatePureAdding= blueItems.some(i => i.text === 'Pure Adding' || i.text === 'Pure Adding Elements' || i.text === 'Pure Adding Periods');
    const hasDatePureHetu  = blueItems.some(i => i.text === 'Pure Hetu'   || i.text === 'Pure Hetu Elements'   || i.text === 'Pure Hetu Periods');
    const hasDateAdding    = blueItems.some(i => i.text === 'Adding Elements' || i.text === 'Adding Periods' || i.text === 'Adding');
    const hasDateHetu      = blueItems.some(i => i.text === 'Hetu Elements'   || i.text === 'Hetu Periods'   || i.text === 'Hetu');

    // Person connection types with the day
    const personIsFamily    = getJiaZiFamilies(pStem, pBranch).some(f => getJiaZiFamilies(dayStem, dayBranch).includes(f));
    const personIsPureQiEl  = pQi  === dQi;
    const personIsPureQiPer = pYun === dYun;
    const personIsAddingEl  = [5,10,15].includes(pQi  + dQi);
    const personIsAddingPer = [5,10,15].includes(pYun + dYun);
    const personIsHetuEl    = isHetuPair(pQi,  dQi);
    const personIsHetuPer   = isHetuPair(pYun, dYun);

    // Condition A: same-type match
    if (hasDateFamily    && personIsFamily)                                  return 4;
    if (hasDatePureAdding && (personIsAddingEl || personIsAddingPer))        return 4;
    if (hasDatePureHetu   && (personIsHetuEl   || personIsHetuPer))          return 4;
    if (hasDatePureQi     && (personIsPureQiEl || personIsPureQiPer))        return 4;
    if (hasDateAdding     && (personIsAddingEl || personIsAddingPer))        return 4;
    if (hasDateHetu       && (personIsHetuEl   || personIsHetuPer))          return 4;

    // Condition B: connects but different type → no extra bonus
    return 0;
}

/**
 * UNIFIED HOUR SCORE — single source of truth used by BEST, LIST, TABLES views.
 * @param {string} dGan      Day stem
 * @param {string} dZhi      Day branch
 * @param {string} hGan      Hour stem
 * @param {string} hZhi      Hour branch (direct, not from eightChar)
 * @param {string} mGan      Month stem
 * @param {string} mZhi      Month branch
 * @param {string} yZhi      Year branch
 * @param {Array}  analysisItems  Output of analyzeXkdg()
 * @param {object} hourSpirit     Output of getSpiritForHour() or null
 * @param {boolean} sStrong       Season strong element
 * @param {boolean} sGrowing      Season growing element
 * @param {object|null} personAYear   Person A year xkdg data (or null)
 * @param {string|null} pYStem        Person A year stem
 * @param {string|null} pYBranch      Person A year branch
 * @param {Array}  pNobleA            Person A noble branches
 * @param {string|null} pLuA          Person A Lu branch
 * @param {string|null} pHVA          Person A Heaven Virtue branch
 * @param {string|null} pBVA          Person A Branch Virtue branch
 * @param {object|null} pMVA          Person A Month Virtue {stem,branch}
 * @param {string|null} pTYA          Person A Tian Yi branch
 * @param {object|null} pillars       Resolved pillars object
 */
function calcHourScore(dGan, dZhi, hGan, hZhi, mGan, mZhi, yGan, yZhi,
                       analysisItems, hourSpirit, sStrong, sGrowing,
                       personAYear, pYStem, pYBranch,
                       pNobleA, pLuA, pHVA, pBVA, pMVA, pTYA,
                       pillars) {
    const blueItems = analysisItems.filter(i => i.tag === 'blue' || i.tag === 'family');
    const hasFullBL  = blueItems.some(i => i.tag === 'family');
    const hasPureQi  = blueItems.some(i => i.text.includes('Pure Qi'));

    // Quality score from season
    const qualityScore = getDateQualityScore(analysisItems);

    // Base score from the date's own XKDG relations (guaranteed floor regardless of person/season)
    let relationBaseScore = 0;
    if (blueItems.some(i => i.tag === 'family'))                                                  relationBaseScore = 6;
    else if (blueItems.some(i => i.text.includes('Pure Qi')))                                     relationBaseScore = 5;
    else if (blueItems.some(i => i.text.includes('Pure Adding') || i.text.includes('Pure Hetu'))) relationBaseScore = 4;
    else if (blueItems.some(i => i.text.includes('Adding') || i.text.includes('Hetu') || i.text.startsWith('Inverse Hex'))) relationBaseScore = 2;

    // Match score from person A (multiplier)
    const dayXkdg = getXkdgData(dGan, dZhi);
    let scoreA = 1;
    let sameTypeBonusA = 0;
    let fullBLBonus = 0;
    let partialBLBonus = 0;
    if (personAYear && dayXkdg) {
        scoreA = getMatchScore(personAYear, pYStem, pYBranch, dayXkdg, dGan, dZhi);
        sameTypeBonusA = getPersonSameTypeBonus(blueItems, personAYear, dayXkdg, pYStem, pYBranch, dGan, dZhi);
        // Full BL bonus
        if (hasFullBL) {
            const personFams = getJiaZiFamilies(pYStem, pYBranch);
            const dateFams = blueItems.filter(i => i.tag === 'family').map(i => i.text.replace(' Family',''));
            if (dateFams.some(f => personFams.includes(f))) fullBLBonus = 4;
        }
        // Partial BL bonus
        if (fullBLBonus === 0) {
            const matchLabels = getMatchLabels(personAYear, pYStem, pYBranch, dayXkdg, dGan, dZhi, _personAPillars, _personADayStem, _personADayBranch);
            if (matchLabels.some(l => l.startsWith('Partial BL'))) partialBLBonus = 1;
        }
    }

    // Spirit bonuses/penalties
    const spiritPenalty = (!hasFullBL && !hasPureQi && hourSpirit && !hourSpirit.auspicious) ? -2 : 0;
    const spiritBonus   = (hourSpirit && hourSpirit.auspicious) ? 1 : 0;

    // Tomb Sha penalty
    const tombShaPenalty = isTombSha(hZhi, dGan, sStrong, sGrowing) ? -2 : 0;

    // Clash penalty
    const clashPenalty = getClashType(dGan, dZhi, yZhi, mGan, mZhi) ? -4 : 0;

    // Personal star bonuses (person A)
    const nobleBonus = (pNobleA && pNobleA.includes(hZhi)) ? 1 : 0;
    const luBonus    = (pLuA && pLuA === hZhi) ? 1 : 0;
    const hvBonus    = (pHVA && pHVA === hZhi) ? 1 : 0;
    const bvBonus    = (pBVA && pBVA === hZhi) ? 1 : 0;
    const mvBonus    = (pMVA && pMVA.stem === hGan) ? 1 : 0;
    const tyBonus    = (pTYA && pTYA === hZhi) ? 1 : 0;

    // Minimum floor: penalties can never push a relation below its floor
    const nayinRes = analyzeNayin(dGan, dZhi, hGan, hZhi, mGan, mZhi, yGan, yZhi, pYStem, pYBranch, null, null);
    const nayinScore = nayinRes.score + nayinRes.personScore;

    // Nayin Power gets its own floor (+5 base means min 6 before other bonuses)
    const nayinFloor = nayinRes.label === 'Nayin Power' ? 6 : nayinRes.label === 'Nayin' ? 2 : null;

    const relationFloor = blueItems.some(i => i.tag === 'family')                                                  ? 8
                        : blueItems.some(i => i.text.includes('Pure Qi'))                                          ? 6
                        : blueItems.some(i => i.text.includes('Pure Adding') || i.text.includes('Pure Hetu'))      ? 5
                        : blueItems.some(i => i.text.includes('Adding') || i.text.includes('Hetu') || i.text.startsWith('Inverse Hex')) ? 3
                        : 1;

    // For Nayin Weak, allow score to go negative (don't apply floor)
    const effectiveFloor = nayinRes.label === 'Nayin Weak' ? -2
                         : nayinFloor !== null ? Math.max(relationFloor, nayinFloor)
                         : relationFloor;

    const rawScore = scoreA * Math.max(qualityScore, 1)
        + relationBaseScore
        + sameTypeBonusA
        + spiritPenalty + spiritBonus
        + tombShaPenalty + clashPenalty
    return Math.max(effectiveFloor, rawScore);
}

// Build a map of isoDate+time → jieqi name for a given year range, adjusted to true solar time
function buildJieqiMap(startYear, endYear, offsetMin) {
    const map = {}; // key: 'YYYY-MM-DD', value: { name, time }
    for (let yr = startYear; yr <= endYear; yr++) {
        const table = Lunar.fromYmd(yr, 1, 1).getJieQiTable();
        for (const [name, s] of Object.entries(table)) {
            // s is a Solar object — get its datetime
            const rawDate = new Date(s.getYear(), s.getMonth()-1, s.getDay(),
                                     s.getHour ? s.getHour() : 0,
                                     s.getMinute ? s.getMinute() : 0);
            // Adjust to true solar time
            const solarMs   = rawDate.getTime() + offsetMin * 60000;
            const solarDate = new Date(solarMs);
            const iso       = solarDate.toISOString().split('T')[0];
            const timeStr   = String(solarDate.getHours()).padStart(2,'0') + ':' + String(solarDate.getMinutes()).padStart(2,'0');
            if (!map[iso]) map[iso] = [];
            map[iso].push({ name, time: timeStr });
        }
    }
    return map;
}

let _currentMode = 'dates';

function setMode(mode) {
    _currentMode = mode;
    if (mode === 'month') window._calBackDate = null; // clear back button when LIST opened manually
    try { localStorage.setItem('xkdg_mode', mode); } catch(e) {}
    const mDates = document.getElementById('mode-dates');
    const mMonth = document.getElementById('mode-month');
    const mCal   = document.getElementById('mode-cal');
    const mTable = document.getElementById('mode-table');
    const mFS    = document.getElementById('mode-fengshui');
    if (mDates) mDates.style.background = mode === 'dates' ? '#1565c0' : '#555';
    if (mMonth) mMonth.style.background = mode === 'month' ? '#1565c0' : '#555';
    if (mCal)   mCal.style.background   = mode === 'cal'   ? '#1565c0' : '#555';
    if (mTable) mTable.style.background = mode === 'table' ? '#1565c0' : '#555';
    if (mFS)    mFS.style.background    = mode === 'fengshui' ? '#c9a84c' : '#8a6a1f';
    const sr = document.getElementById('scan-results');
    const mv = document.getElementById('month-view');
    const cv = document.getElementById('cal-view');
    const tv = document.getElementById('table-view');
    const fv = document.getElementById('fengshui-view');
    if (sr) sr.style.display = (mode === 'dates' && _scanResults.length) ? 'block' : 'none';
    if (mv) mv.style.display = mode === 'month' ? 'block' : 'none';
    if (cv) cv.style.display = mode === 'cal'   ? 'block' : 'none';
    if (tv) tv.style.display = mode === 'table' ? 'block' : 'none';
    if (fv) fv.style.display = mode === 'fengshui' ? 'block' : 'none';
    if (mode === 'fengshui' && typeof openFengShui === 'function') openFengShui();
    ['sort-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (mode === 'dates' && _scanResults.length) ? 'inline-block' : 'none';
    });
}



// ── Journey: Post Horse and Ding Spirit ──────────────────────
const POST_HORSE = {
    '寅':'申','午':'申','戌':'申',  // Fire group → Monkey
    '巳':'亥','酉':'亥','丑':'亥',  // Metal group → Pig
    '申':'寅','子':'寅','辰':'寅',  // Water group → Tiger
    '亥':'巳','卯':'巳','未':'巳'   // Wood group → Snake
};

// Ke Wealth conditions scorer — returns count of conditions that fire (0-6)
function calcKeWealthScore(dGan, dZhi, hGan, mGan, yGan, hQi, mQi, yQi, dQi, personDayStem, personDayQi) {
    var score = 0;
    // Cond 1: Person Day Stem Ke → Date Day Stem
    if (personDayStem && dGan) {
        var pE = STEM_ELEMENT[personDayStem], dE = STEM_ELEMENT[dGan];
        if (pE && dE && STEM_KE[pE] === dE) score++;
    }
    // Cond 2: Date Day Stem Ke → Hour/Month/Year Stems
    if (dGan) {
        var dEW = STEM_ELEMENT[dGan];
        if (dEW) [hGan, mGan, yGan].forEach(function(s) {
            if (s && STEM_KE[dEW] === STEM_ELEMENT[s]) score++;
        });
    }
    // Cond 3: Person Day qi element Ke → Date Day qi element
    if (personDayQi != null && dQi != null) {
        var pQE = QI_ELEMENT[personDayQi], dQE = QI_ELEMENT[dQi];
        if (pQE && dQE && NAYIN_KE[pQE] === dQE) score++;
    }
    // Cond 4: Date Day qi element Ke → Hour/Month/Year qi elements
    if (dQi != null) {
        var dQEW = QI_ELEMENT[dQi];
        if (dQEW) [hQi, mQi, yQi].forEach(function(q) {
            if (q != null) { var qE = QI_ELEMENT[q]; if (qE && NAYIN_KE[dQEW] === qE) score++; }
        });
    }
    return score;
}
const WEN_CHANG = {
    '甲':'巳', '乙':'午', '丙':'申', '丁':'酉',
    '戊':'申', '己':'酉', '庚':'亥', '辛':'子',
    '壬':'寅', '癸':'卯'
};

const DING_SPIRIT_MAP = {
    '甲子':'卯','乙丑':'卯','丙寅':'卯','丁卯':'卯','戊辰':'卯','己巳':'卯','庚午':'卯','辛未':'卯','壬申':'卯','癸酉':'卯',
    '甲戌':'丑','乙亥':'丑','丙子':'丑','丁丑':'丑','戊寅':'丑','己卯':'丑','庚辰':'丑','辛巳':'丑','壬午':'丑','癸未':'丑',
    '甲申':'亥','乙酉':'亥','丙戌':'亥','丁亥':'亥','戊子':'亥','己丑':'亥','庚寅':'亥','辛卯':'亥','壬辰':'亥','癸巳':'亥',
    '甲午':'酉','乙未':'酉','丙申':'酉','丁酉':'酉','戊戌':'酉','己亥':'酉','庚子':'酉','辛丑':'酉','壬寅':'酉','癸卯':'酉',
    '甲辰':'未','乙巳':'未','丙午':'未','丁未':'未','戊申':'未','己酉':'未','庚戌':'未','辛亥':'未','壬子':'未','癸丑':'未',
    '甲寅':'巳','乙卯':'巳','丙辰':'巳','丁巳':'巳','戊午':'巳','己未':'巳','庚申':'巳','辛酉':'巳','壬戌':'巳','癸亥':'巳'
};

// ── Purpose Filter ────────────────────────────────────────────
var PURPOSE_ICONS = { health:'🏥', career:'💼', wealth:'💰', relationship:'❤️', journey:'✈️', speak:'🎤', legal:'⚖️' };
var PURPOSE_NAMES = { health:'Health', career:'Career', wealth:'Wealth', relationship:'Relationship', journey:'Journey', speak:'Speak', legal:'Legal' };
var _scoreModeBalanced = false; // false = A Priority, true = Balanced (min of A and B)
var _listSortByScore   = false; // false = chronological, true = best hour first per day

function toggleScoreMode() {
    _scoreModeBalanced = !_scoreModeBalanced;
    const btn = document.getElementById('score-mode-btn');
    if (btn) {
        btn.textContent = _scoreModeBalanced ? '⚖ Balanced' : '⚖ A Priority';
        btn.style.background = _scoreModeBalanced ? '#4a148c' : '#f3e5f5';
        btn.style.color = _scoreModeBalanced ? '#fff' : '#4a148c';
    }
}

function updateScoreModeBtn() {
    const btn = document.getElementById('score-mode-btn');
    if (!btn) return;
    const bothActive = _personAYear && _personBYear;
    btn.style.display = bothActive ? 'inline-block' : 'none';
    if (!bothActive) _scoreModeBalanced = false; // reset when not both active
}

function onPurposeChange() {
    var sel = document.getElementById('purpose-select');
    var testMode = document.getElementById('purpose-no-person');
    if (sel.value && !_personAYear && !_personBYear && !(testMode && testMode.checked)) {
        setTimeout(function() {
            document.getElementById('purpose-select').value = '';
            // Show toast
            var toast = document.getElementById('purpose-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'purpose-toast';
                toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 20px;border-radius:10px;font-size:13px;z-index:9999;max-width:280px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
                document.body.appendChild(toast);
            }
            toast.textContent = '💡 Please input Person A or B data first, or enable Test Mode.';
            toast.style.display = 'block';
            setTimeout(function(){ toast.style.display = 'none'; }, 3000);
        }, 50);
    }
}

function getPurpose() {
    var el = document.getElementById('purpose-select');
    return el ? el.value : '';
}

function getDayRole(stem, branch) {
    var entries = JIAZI_FAMILY_DATA[(stem||'') + (branch||'')] || [];
    if (!entries.length) return null;
    var role = entries[0].role;
    return (role === 'father' || role === 'mother') ? 'parent' : 'child';
}

function hasParentInScanPillars(pillarsObj, fullBLFamily) {
    // pillarsObj may be from _currentDayAnalysis which stores stems/branches separately
    var stems    = (_currentDayAnalysis && _currentDayAnalysis.stems)    || {};
    var branches = (_currentDayAnalysis && _currentDayAnalysis.branches) || {};
    return ['hour','day','month','year'].some(function(k) {
        var stem   = (pillarsObj[k] && pillarsObj[k].stem)   || stems[k]    || '';
        var branch = (pillarsObj[k] && pillarsObj[k].branch) || branches[k] || '';
        if (!stem) return false;
        var entries = JIAZI_FAMILY_DATA[stem + branch] || [];
        return entries.some(function(e) {
            if (e.role !== 'father' && e.role !== 'mother') return false;
            return fullBLFamily ? e.family === fullBLFamily : true;
        });
    });
}

function checkPurpose(purpose, dGan, dZhi, blueItems, totalScore, pillarsObj, allItems, hourSpirit) {
    if (!purpose) return true;
    // In test mode (no person data), lower the score threshold
    var testMode = document.getElementById('purpose-no-person');
    var minScore = (testMode && testMode.checked) ? 1 : 4;

    // allItems includes TY, Noble etc. — fall back to blueItems if not provided
    var items = allItems || blueItems;

    // Spirit bonus: +2 each for qualifying spirits (all optional except TY for health)
    var spiritBonus = 0;
    if (hourSpirit) {
        if (hourSpirit.en === 'Cerulean Dragon') spiritBonus += 2;
        if (hourSpirit.en === 'Golden Box')      spiritBonus += 2;
        if (hourSpirit.en === 'Tian De' || (hourSpirit.zh && hourSpirit.zh.indexOf('天德') >= 0)) spiritBonus += 2;
        if (hourSpirit.en === 'Fate Master' || (hourSpirit.zh && hourSpirit.zh.indexOf('司命') >= 0)) spiritBonus += 2;
        if (hourSpirit.en === 'Lu' || (hourSpirit.zh && hourSpirit.zh.indexOf('禄') >= 0)) spiritBonus += 2;
    }
    // Also check allItems for spirits (scan loop adds them to analysisItems)
    var hasQingLong = items.some(function(i){ return i.text && i.text.indexOf('Cerulean Dragon') >= 0; });
    var hasJinKui   = items.some(function(i){ return i.text && i.text.indexOf('Golden Box') >= 0; });
    var hasTianDe   = items.some(function(i){ return i.text && i.text.indexOf('Tian De') >= 0 || (i.text && i.text.indexOf('天德') >= 0); });
    var hasSiMing   = items.some(function(i){ return i.text && (i.text.indexOf('Fate Master') >= 0 || i.text.indexOf('司命') >= 0); });
    var hasLu       = items.some(function(i){ return i.tag==='lu'||i.tag==='lu-both'; });
    if (!hourSpirit) {
        if (hasQingLong) spiritBonus += 2;
        if (hasJinKui)   spiritBonus += 2;
        if (hasTianDe)   spiritBonus += 2;
        if (hasSiMing)   spiritBonus += 2;
        if (hasLu)       spiritBonus += 2;
    }
    var adjustedScore = totalScore + spiritBonus;
    if (adjustedScore < minScore) return false;
    var dayRole = getDayRole(dGan, dZhi);
    var hasNoble = items.some(function(i){ return i.tag==='noble'||i.tag==='noble-both'; });
    var hasTY    = items.some(function(i){ return i.tag==='ty'||i.tag==='ty-both'; });
    var hasAddOrHetu = blueItems.some(function(i){
        return i.tag==='blue' && (i.text.indexOf('Adding')>=0 || i.text.indexOf('Hetu')>=0);
    });
    var famItems = blueItems.filter(function(i){ return i.tag==='family'; });
    var fullBLFamily = famItems.length ? famItems[0].text.replace(' Family','') : null;

    // Person data required for all purposes (unless test mode)
    var testMode2 = document.getElementById('purpose-no-person');
    var isTestMode = testMode2 && testMode2.checked;
    if (!isTestMode && !_personAYear && !_personBYear) return false;

    // Base XKDG condition: must have at least one relation (Adding, Hetu, Pure Qi, Family, Inverse Hex)
    var hasXkdgRelation = blueItems.length > 0 ||
        (allItems && allItems.some(function(i){ return i.text && i.text.startsWith('Inverse Hex'); }));
    if (!hasXkdgRelation) return false;

    // Date quality gate: Very Weak dates are fundamentally bad — excluded from all purposes
    var isVeryWeak = items.some(function(i){ return i.text === 'Very Weak'; });
    if (isVeryWeak) return false;

    // Clash gate: year branch clash is too turbulent for any purpose
    // Exception: Blood Link family or Pure Qi are powerful enough to override
    var hasYearClash = items.some(function(i){ return i.tag === 'clash-year'; });
    if (hasYearClash) {
        var hasFamily  = blueItems.some(function(i){ return i.tag === 'family'; });
        var hasPureQi  = blueItems.some(function(i){ return i.text && i.text.indexOf('Pure Qi') >= 0; });
        if (!hasFamily && !hasPureQi) return false;
    }

    // Negative spirits that disqualify per purpose
    var spiritName = items.filter(function(i){ return i.tag==='spirit-bad'; }).map(function(i){ return i.text; });
    function hasBadSpirit(name) {
        return spiritName.some(function(t){ return t.indexOf(name) >= 0; });
    }

    if (purpose === 'health') {
        if (hasBadSpirit('Heaven Penalty') || hasBadSpirit('White Tiger') || hasBadSpirit('Gou Chen')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Cerulean Dragon') spiritBonus += 2; // vitality
        if (hourSpirit && hourSpirit.en === 'Jade Hall')       spiritBonus += 2; // comfort/healing
        var cond1 = dayRole === 'parent' && hasTY;
        var personDayStemA = _personADayStem || null;
        var personDayStemB = _personBDayStem || null;
        var isDayTYforPerson = (personDayStemA && TIAN_YI[personDayStemA] === dZhi) ||
                               (personDayStemB && TIAN_YI[personDayStemB] === dZhi);
        return cond1 || isDayTYforPerson;
    }
    if (purpose === 'career') {
        if (hasBadSpirit('Red Bird') || hasBadSpirit('Heaven Prison') || hasBadSpirit('Gou Chen') || hasBadSpirit('Heaven Penalty')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Bright Hall')  spiritBonus += 2; // visibility/recognition
        if (hourSpirit && hourSpirit.en === 'Fate Master')  spiritBonus += 2; // official positions
        return dayRole === 'parent' && hasNoble;
    }
    if (purpose === 'wealth') {
        if (hasBadSpirit('Black Tortoise') || hasBadSpirit('Heaven Prison')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Golden Box')      spiritBonus += 2;
        if (hourSpirit && hourSpirit.en === 'Cerulean Dragon') spiritBonus += 2;
        if (hourSpirit && hourSpirit.en === 'Jade Hall')       spiritBonus += 2;
        var wealthPass = dayRole === 'child' && pillarsObj && hasParentInScanPillars(pillarsObj, fullBLFamily);
        if (!wealthPass) return false;

        var dayStems    = (_currentDayAnalysis && _currentDayAnalysis.stems)   || {};
        var dayPillarsX = (_currentDayAnalysis && _currentDayAnalysis.pillars) || pillarsObj || {};
        var hGanW  = dayStems.hour  || (dayPillarsX.hour  && dayPillarsX.hour.stem)  || '';
        var mGanW  = dayStems.month || (dayPillarsX.month && dayPillarsX.month.stem)  || '';
        var yGanW  = dayStems.year  || (dayPillarsX.year  && dayPillarsX.year.stem)   || '';
        var hQiW   = dayPillarsX.hour  && dayPillarsX.hour.qi  != null ? dayPillarsX.hour.qi  : null;
        var mQiW   = dayPillarsX.month && dayPillarsX.month.qi != null ? dayPillarsX.month.qi : null;
        var yQiW   = dayPillarsX.year  && dayPillarsX.year.qi  != null ? dayPillarsX.year.qi  : null;
        var dQiW   = dayPillarsX.day   && dayPillarsX.day.qi   != null ? dayPillarsX.day.qi   : null;
        var personDayStemW = _personADayStem || _personBDayStem || null;
        var personDayQiW   = null;
        if (_personAPillars && _personAPillars.day) personDayQiW = _personAPillars.day.qi;
        else if (_personBPillars && _personBPillars.day) personDayQiW = _personBPillars.day.qi;
        var wealthBonus = 0;
        if (personDayStemW && dGan) {
            var pElem = STEM_ELEMENT[personDayStemW];
            var dElem = STEM_ELEMENT[dGan];
            if (pElem && dElem && STEM_KE[pElem] === dElem) wealthBonus += 1;
        }
        if (dGan) {
            var dElemW = STEM_ELEMENT[dGan];
            if (dElemW) {
                [hGanW, mGanW, yGanW].forEach(function(s) {
                    if (s && STEM_KE[dElemW] === STEM_ELEMENT[s]) wealthBonus += 1;
                });
            }
        }
        if (personDayQiW != null && dQiW != null) {
            var pQiElem = QI_ELEMENT[personDayQiW];
            var dQiElem = QI_ELEMENT[dQiW];
            if (pQiElem && dQiElem && NAYIN_KE[pQiElem] === dQiElem) wealthBonus += 1;
        }
        if (dQiW != null) {
            var dQiElemW = QI_ELEMENT[dQiW];
            if (dQiElemW) {
                [hQiW, mQiW, yQiW].forEach(function(q) {
                    if (q != null) {
                        var qElem = QI_ELEMENT[q];
                        if (qElem && NAYIN_KE[dQiElemW] === qElem) wealthBonus += 1;
                    }
                });
            }
        }
        spiritBonus += wealthBonus;
        window._lastWealthBonus = wealthBonus;
        return true;
    }
    if (purpose === 'relationship') {
        if (hasBadSpirit('Heaven Penalty') || hasBadSpirit('Red Bird') || hasBadSpirit('Black Tortoise') || hasBadSpirit('Gou Chen')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Cerulean Dragon') spiritBonus += 2;
        return dayRole === 'child' && (
            (pillarsObj && hasParentInScanPillars(pillarsObj, fullBLFamily)) || hasAddOrHetu);
    }
    if (purpose === 'journey') {
        if (hasBadSpirit('White Tiger') || hasBadSpirit('Heaven Prison') || hasBadSpirit('Gou Chen') || hasBadSpirit('Heaven Penalty')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Cerulean Dragon') spiritBonus += 2;
        if (hourSpirit && hourSpirit.en === 'Jade Hall')       spiritBonus += 2; // moving house

        var hasAnyParent = pillarsObj && ['hour','day','month','year'].some(function(k) {
            var stems2 = (_currentDayAnalysis && _currentDayAnalysis.stems) || {};
            var branches2 = (_currentDayAnalysis && _currentDayAnalysis.branches) || {};
            var s = (pillarsObj[k] && pillarsObj[k].stem) || stems2[k] || '';
            var b = (pillarsObj[k] && pillarsObj[k].branch) || branches2[k] || '';
            if (!s) return false;
            var entries = JIAZI_FAMILY_DATA[s + b] || [];
            return entries.some(function(e){ return e.role === 'father' || e.role === 'mother'; });
        });
        if (!hasAnyParent) return false;

        var personDayBranchA = _personADayBranch || null;
        var personDayBranchB = _personBDayBranch || null;
        var personDayJiaZiA  = (_personADayStem || '') + (personDayBranchA || '');
        var personDayJiaZiB  = (_personBDayStem || '') + (personDayBranchB || '');
        var phA = personDayBranchA ? POST_HORSE[personDayBranchA] : null;
        var phB = personDayBranchB ? POST_HORSE[personDayBranchB] : null;
        var dsA = DING_SPIRIT_MAP[personDayJiaZiA] || null;
        var dsB = DING_SPIRIT_MAP[personDayJiaZiB] || null;
        var hasPersonData = personDayBranchA || personDayBranchB;
        if (hasPersonData) {
            var dateBranches2 = _currentDayAnalysis ? Object.values(_currentDayAnalysis.branches) : [];
            var personPHorDS = dateBranches2.some(function(b) {
                return (phA && b === phA) || (phB && b === phB) ||
                       (dsA && b === dsA) || (dsB && b === dsB);
            });
            if (!personPHorDS) return false;
        }
        var dayBranchCurrent = (_currentDayAnalysis && _currentDayAnalysis.branches) ? _currentDayAnalysis.branches.day : null;
        var dayStemCurrent   = (_currentDayAnalysis && _currentDayAnalysis.stems)    ? _currentDayAnalysis.stems.day    : null;
        var dayPH = dayBranchCurrent ? POST_HORSE[dayBranchCurrent] : null;
        var dayDS = dayStemCurrent && dayBranchCurrent ? (DING_SPIRIT_MAP[dayStemCurrent + dayBranchCurrent] || null) : null;
        var hourIsOptional = dZhi && ((dayPH && dZhi === dayPH) || (dayDS && dZhi === dayDS));
        if (hourIsOptional) spiritBonus += 2;
        return true;
    }
    if (purpose === 'speak') {
        if (hasBadSpirit('Heaven Penalty') || hasBadSpirit('Gou Chen') || hasBadSpirit('Red Bird')) return false;
        var hasGoodNayin = items.some(function(i){ return i.tag === 'nayin-person-good' || i.text === 'Nayin ✦ Person'; });
        if (!hasGoodNayin) {
            var allItemsSpeak = allItems || blueItems;
            hasGoodNayin = allItemsSpeak.some(function(i){ return i.tag === 'nayin-person-good' || i.text === 'Nayin ✦ Person'; });
        }
        if (!hasGoodNayin) return false;
        if (hourSpirit && hourSpirit.en === 'Jade Hall')       spiritBonus += 2;
        if (hourSpirit && hourSpirit.en === 'Cerulean Dragon') spiritBonus += 2;
        var wcDate = WEN_CHANG[dGan] || null;
        if (wcDate && dZhi === wcDate) spiritBonus += 2;
        var personDayStemSp = _personADayStem || _personBDayStem || null;
        var wcPerson = personDayStemSp ? (WEN_CHANG[personDayStemSp] || null) : null;
        var dateDayBranchSp = (_currentDayAnalysis && _currentDayAnalysis.branches) ? _currentDayAnalysis.branches.day : dZhi;
        if (wcPerson && dateDayBranchSp === wcPerson) spiritBonus += 2;
        return true;
    }
    if (purpose === 'legal') {
        if (hasBadSpirit('Heaven Penalty') || hasBadSpirit('Red Bird') || hasBadSpirit('Gou Chen') || hasBadSpirit('Black Tortoise')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Bright Hall')  spiritBonus += 2; // signings
        if (hourSpirit && hourSpirit.en === 'Fate Master')  spiritBonus += 2; // authority
        if (hourSpirit && hourSpirit.en === 'Heaven Virtue') spiritBonus += 2; // protection
        // Base XKDG condition already checked above
        return true;
    }
    return true;
}

function updatePurposeIcon(person) {
    var iconId = person === 'B' ? 'purpose-icon-b' : 'purpose-icon-a';
    var iconEl = document.getElementById(iconId);
    if (!iconEl) return;
    var purpose = getPurpose();
    if (!purpose || !window._currentDayGan || !_currentDayAnalysis) { iconEl.textContent = ''; return; }
    var ok = checkPurpose(purpose, window._currentDayGan, window._currentDayZhi || '',
        _currentDayAnalysis.items.filter(function(i){return i.tag==='blue'||i.tag==='family';}),
        4, _currentDayAnalysis.pillars, _currentDayAnalysis.items, null);
    iconEl.textContent = ok ? (PURPOSE_ICONS[purpose] || '') : '';
}

function runAll() {
    const testModeEl = document.getElementById('purpose-no-person');
    const testModeOn = testModeEl && testModeEl.checked;
    if (getPurpose() && !_personAYear && !_personBYear && !testModeOn) {
        alert('💡 Please input Person A or B birth data first, or enable Test Mode.');
        document.getElementById('purpose-select').value = '';
        return;
    }
    if (_currentMode === 'month') buildMonthView();
    else if (_currentMode === 'cal') buildCalView();
    else if (_currentMode === 'table') buildTableView();
    else runScanner();
}


function buildTableView() {
    const tv = document.getElementById('table-view');
    if (!tv) return;
    tv.style.display = 'block';

    const startDate = document.getElementById('scan-start').value;
    const days      = parseInt(document.getElementById('scan-days').value) || 30;
    const lon       = parseFloat(document.getElementById('longitude').value);
    const utc       = parseFloat(document.getElementById('utc-offset').value);
    const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);

    // Draw a mini hexagram (6 lines, solid or broken)
    function drawHex(hexNum, size) {
        size = size || 28;
        const BIN = {1:0b111111,2:0b000000,3:0b010001,4:0b100010,5:0b010111,6:0b111010,7:0b000010,8:0b010000,9:0b110111,10:0b111011,11:0b000111,12:0b111000,13:0b111101,14:0b101111,15:0b000100,16:0b001000,17:0b011001,18:0b100110,19:0b000011,20:0b110000,21:0b101001,22:0b100101,23:0b100000,24:0b000001,25:0b111001,26:0b100111,27:0b100001,28:0b011110,29:0b010010,30:0b101101,31:0b011100,32:0b001110,33:0b111100,34:0b001111,35:0b101000,36:0b000101,37:0b110101,38:0b101011,39:0b010100,40:0b001010,41:0b100011,42:0b110001,43:0b011111,44:0b111110,45:0b011000,46:0b000110,47:0b011010,48:0b010110,49:0b011101,50:0b101110,51:0b001001,52:0b100100,53:0b110100,54:0b001011,55:0b001101,56:0b101100,57:0b110110,58:0b011011,59:0b110010,60:0b010011,61:0b110011,62:0b001100,63:0b010101,64:0b101010};
        const bin = BIN[hexNum] || 0;
        const W = size, lh = Math.round(size*0.11), gap = Math.round(size*0.07), bw = Math.round(size*0.35);
        const totalH = 6*lh + 5*gap;
        let svg = `<svg width="${W}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">`;
        for (let i = 0; i < 6; i++) {
            const line = 5 - i; // bottom to top
            const solid = (bin >> line) & 1;
            const y = i * (lh + gap);
            const cx = W/2;
            if (solid) {
                svg += `<rect x="${cx-bw}" y="${y}" width="${bw*2}" height="${lh}" fill="#111"/>`;
            } else {
                svg += `<rect x="${cx-bw}" y="${y}" width="${bw*0.9}" height="${lh}" fill="#111"/>`;
                svg += `<rect x="${cx+bw*0.1}" y="${y}" width="${bw*0.9}" height="${lh}" fill="#111"/>`;
            }
        }
        svg += `</svg>`;
        return svg;
    }

    const HOUR_LABELS = ['子 23-01*','丑 01-03','寅 03-05','卯 05-07','辰 07-09','巳 09-11','午 11-13','未 13-15','申 15-17','酉 17-19','戌 19-21','亥 21-23'];
    const base = new Date(startDate + 'T12:00:00');

    let html = `<div style="font-family:sans-serif;">`;

    for (let d = 0; d < days; d++) {
        const dayDate = new Date(base.getTime() + d * 86400000);
        const isoDate = localISODate(dayDate);
        const isToday = isoDate === localISODate(new Date());

        // Get day/month/year JiaZi
        let bd0 = new Date(dayDate); bd0.setHours(12, 0, 0, 0);
        const sd0 = new Date(bd0.getTime() + offsetMin * 60000);
        const ec0 = Solar.fromDate(sd0).getLunar().getEightChar();
        const dGan = ec0.getDayGan(), dZhi = ec0.getDayZhi();
        const mGan = ec0.getMonthGan(), mZhi = ec0.getMonthZhi();
        const yGan = ec0.getYearGan(),  yZhi = ec0.getYearZhi();
        const dd = dayDate.toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });

        // Check if day has a clash
        const tableClash = getClashType(dGan, dZhi, yZhi, mGan, mZhi);
        const clashIcon = tableClash ? ' ⚡' : '';

        // Date band
        html += `<div style="background:${isToday?'#fff176':'#1565c0'};color:${isToday?'#000':'white'};font-weight:bold;font-size:12px;padding:5px 10px;margin-top:6px;border-radius:4px 4px 0 0;">
            ${dd}${clashIcon}
        </div>`;

        // Column headers
        html += `<table style="border-collapse:collapse;width:100%;table-layout:fixed;">
        <thead><tr>
            <th style="background:#0d47a1;color:white;font-size:10px;padding:3px;border:1px solid #1565c0;width:22%;text-align:center;">HOUR</th>
            <th style="background:#0d47a1;color:white;font-size:10px;padding:3px;border:1px solid #1565c0;width:34%;text-align:center;">DAY · MONTH · YEAR</th>
            <th style="background:#0d47a1;color:white;font-size:10px;padding:3px;border:1px solid #1565c0;width:44%;text-align:center;">RELATIONS</th>
        </tr></thead><tbody>`;

        // 12 hours of Western calendar day: 丑(01) first, 子(23) last
        const HOUR_ORDER = [1,2,3,4,5,6,7,8,9,10,11,0];

        // ZI SECOND HALF (00:00-01:00): show at start of each day (except first)
        if (d > 0) {
            const ziBD2 = new Date(dayDate); ziBD2.setHours(0, 30, 0, 0);
            const ziSD2 = new Date(ziBD2.getTime() + offsetMin * 60000);
            // Compute TST-adjusted Zi boundary times for display
            const tvTSTMins = offsetMin;
            function tvTSTTime(h,m) { const t=((h*60+m+tvTSTMins)%1440+1440)%1440; return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.round(t%60)).padStart(2,'0'); }
            const tvZiMid = tvTSTTime(0,0);
            const tvZiEnd = tvTSTTime(1,0);
            const tvTstMark = tvTSTMins !== 0 ? ' ✦' : '';
            const ziEC2 = Solar.fromDate(ziBD2).getLunar().getEightChar(); // standard time for hour
            const ziHGan2 = ziEC2.getTimeGan(), ziHZhi2 = ziEC2.getTimeZhi();
            // Day stem from midday of THIS day
            const ziMidEC2 = Solar.fromDate(new Date(dayDate.getTime() + 12*3600000 + offsetMin*60000)).getLunar().getEightChar();
            const ziDGan2 = ziMidEC2.getDayGan(), ziDZhi2 = ziMidEC2.getDayZhi();
            const ziFullEC2 = Solar.fromDate(ziSD2).getLunar().getEightChar();
            const ziYGan2 = ziFullEC2.getYearGan(), ziYZhi2 = ziFullEC2.getYearZhi();
            const ziMGan2 = ziFullEC2.getMonthGan(), ziMZhi2 = ziFullEC2.getMonthZhi();
            const ziPillars2 = buildResolvedPillars(ziYGan2, ziYZhi2, ziMGan2, ziMZhi2, ziDGan2, ziDZhi2, ziHGan2, ziHZhi2);
            const { strong: ziSS2, growing: ziSG2 } = getJieqiSeason(ziBD2);
            const { items: ziItems2 } = analyzeXkdg(ziPillars2, ziSS2, ziSG2);
            const ziBlueTexts2 = ziItems2.filter(i=>i.tag==='blue'||i.tag==='family').map(i=>i.text);
            const ziQualTexts2 = ziItems2.filter(i=>['Powerful','Energetic','Very Weak','Very Timely','Timely','Timely at Birth'].includes(i.text)).map(i=>i.text);
            const ziSpirit2 = getSpiritForHour(ziDZhi2, ziHZhi2);
            const ziScore2 = calcHourScore(ziDGan2, ziDZhi2, ziHGan2, ziHZhi2, ziMGan2, ziMZhi2, ziYGan2, ziYZhi2, ziItems2, ziSpirit2, ziSS2, ziSG2, null, null, null, [], null, null, null, null, null, ziPillars2);
            const ziScoreColor2 = ziScore2>=12?'#1b5e20':ziScore2>=9?'#2e7d32':ziScore2>=6?'#388e3c':ziScore2>=4?'#558b2f':'#888';
            const ziRowBg2 = ziScore2>=12?'#a5d6a7':ziScore2>=9?'#c8e6c9':ziScore2>=6?'#dcedc8':ziScore2>=4?'#f1f8e9':'#f8f9fa';
            const ziRelHtml2 = ziBlueTexts2.length>0?`<div style="font-size:9px;color:#1a7a1a;font-weight:bold;line-height:1.4;text-align:right;">${ziBlueTexts2.join('<br>')}</div>`:'';
            const ziQualHtml2 = ziQualTexts2.length>0?`<div style="font-size:9px;color:#555;text-align:right;">${ziQualTexts2.join(' · ')}</div>`:'';
            const ziSpHtml2 = ziSpirit2?`<div style="font-size:9px;font-weight:bold;color:${ziSpirit2.auspicious?'#0044cc':'#d40000'};">${ziSpirit2.en} ${ziSpirit2.zh}</div>`:'';
            const ziTimeLabel2 = `${tvZiMid}-${tvZiEnd}${tvTstMark}`;
            html += `<tr style="cursor:pointer;" onclick="loadDateIntoMain('${localISODate(dayDate)}',0);window.scrollTo({top:0,behavior:'smooth'});" onmouseover="this.style.filter='brightness(0.92)'" onmouseout="this.style.filter=''">`;
            html += `<td style="border:1px solid #ddd;background:${ziRowBg2};padding:3px 2px;text-align:center;vertical-align:middle;">
                <div style="font-size:8px;color:#888;">${ziTimeLabel2}</div>
                <div style="font-size:10px;color:#880e4f;font-weight:bold;">${ziHGan2}${ziHZhi2}</div>
                <div style="color:#c62828;font-size:11px;font-weight:bold;line-height:1;">${ziPillars2.hour.qi||''}</div>
                ${drawHex(ziPillars2.hour.hex, 26)}
                <div style="color:#0d47a1;font-size:10px;font-weight:bold;line-height:1;">${ziPillars2.hour.yun||''}</div>
            </td>`;
            html += `<td style="border:1px solid #ddd;background:${ziRowBg2};padding:3px 2px;text-align:center;vertical-align:middle;">
                <div style="display:flex;justify-content:center;gap:6px;">
                    <div style="text-align:center;">
                        <div style="font-size:8px;color:#555;">${ziDGan2}${ziDZhi2}</div>
                        <div style="color:#c62828;font-size:10px;font-weight:bold;">${ziPillars2.day.qi||''}</div>
                        ${drawHex(ziPillars2.day.hex, 20)}
                        <div style="color:#0d47a1;font-size:10px;font-weight:bold;">${ziPillars2.day.yun||''}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:8px;color:#555;">${ziMGan2}${ziMZhi2}</div>
                        <div style="color:#c62828;font-size:10px;font-weight:bold;">${ziPillars2.month.qi||''}</div>
                        ${drawHex(ziPillars2.month.hex, 20)}
                        <div style="color:#0d47a1;font-size:10px;font-weight:bold;">${ziPillars2.month.yun||''}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:8px;color:#555;">${ziYGan2}${ziYZhi2}</div>
                        <div style="color:#c62828;font-size:10px;font-weight:bold;">${ziPillars2.year.qi||''}</div>
                        ${drawHex(ziPillars2.year.hex, 20)}
                        <div style="color:#0d47a1;font-size:10px;font-weight:bold;">${ziPillars2.year.yun||''}</div>
                    </div>
                </div>
            </td>`;
            html += `<td style="border:1px solid #ddd;background:${ziRowBg2};padding:4px 5px;vertical-align:middle;text-align:right;position:relative;">
                <div style="position:absolute;top:2px;right:4px;font-size:13px;font-weight:bold;color:${ziScoreColor2};">${ziScore2}</div>
                ${ziRelHtml2}${ziQualHtml2}${ziSpHtml2}
            </td></tr>`;
        }
        for (const h of HOUR_ORDER) {
            const hs = HOUR_STARTS[h];
            let bd = new Date(dayDate);
            if (hs === 23) bd = new Date(dayDate.getTime() - 86400000);
            bd.setHours(hs, 30, 0, 0);
            const sd = new Date(bd.getTime() + offsetMin * 60000);
            // For hour pillar: always use dayDate at the hour midpoint (no day subtraction)
            // The 60 JiaZi hour cycle is continuous — library handles it correctly
            let bdForHour = new Date(dayDate);
            bdForHour.setHours(hs === 23 ? 23 : hs, 30, 0, 0);
            const ec = Solar.fromDate(bdForHour).getLunar().getEightChar();
            const hGan = ec.getTimeGan();
            const hZhi = ec.getTimeZhi();

            // For Zi hour (23:00): Chinese day changes at 23:00 — use next day's stem
            let rowDGan = dGan, rowDZhi = dZhi;
            if (hs === 23) {
                const nextMid = Solar.fromDate(new Date(dayDate.getTime() + 12*3600000 + offsetMin*60000));
                rowDGan = nextMid.getLunar().getEightChar().getDayGan();
                rowDZhi = nextMid.getLunar().getEightChar().getDayZhi();
            }

            const pillars = buildResolvedPillars(yGan, yZhi, mGan, mZhi, rowDGan, rowDZhi, hGan, hZhi);
            const { strong: tSS, growing: tSG } = getJieqiSeason(sd);
            const { items } = analyzeXkdg(pillars, tSS, tSG);

            // Add badges (Noble, TY, HV, BV, MV, Lu) — same as scan loops
            const tyBranch    = TIAN_YI[rowDGan];
            const nobleBranches = NOBLE_BRANCHES[rowDGan] || [];
            if (tyBranch === hZhi)           items.push({ text: 'Tian Yi', tag: 'ty' });
            if (nobleBranches.includes(hZhi)) items.push({ text: 'Noble',   tag: 'noble' });

            // Heaven Virtue, Branch Virtue, Month Virtue, Lu
            const hvBranch = HEAVEN_VIRTUE ? HEAVEN_VIRTUE[mZhi] : null;
            const bvBranch = BRANCH_VIRTUE ? BRANCH_VIRTUE[mZhi] : null;
            if (hvBranch && hvBranch === hZhi) items.push({ text: 'Heaven Virtue', tag: 'hv' });
            if (bvBranch && bvBranch === hZhi) items.push({ text: 'Branch Virtue', tag: 'bv' });
            const luBranch = LU_BRANCH ? LU_BRANCH[rowDGan] : null;
            if (luBranch && luBranch === hZhi) items.push({ text: 'Lu', tag: 'lu' });

            // 12 Spirits
            const hourSpirit = getSpiritForHour(dZhi, hZhi);
            if (hourSpirit) items.push({ text: hourSpirit.en + (hourSpirit.zh ? ' ' + hourSpirit.zh : ''), tag: hourSpirit.auspicious ? 'spirit-good' : 'spirit-bad', auspicious: hourSpirit.auspicious });

            const hasFamily = items.some(i => i.tag === 'family');
            const hasBlue   = items.some(i => i.tag === 'blue');

            // Person A connection check
            const tvDayXkdg = getXkdgData(dGan, dZhi);
            const tvConnectsA = _personAYear && tvDayXkdg && (() => {
                const pQi = _personAYear.qi, pYun = _personAYear.yun;
                const dQi = tvDayXkdg.qi,   dYun = tvDayXkdg.yun;
                return isHetuPair(pQi,dQi) || [5,10,15].includes(pQi+dQi) ||
                       isHetuPair(pYun,dYun) || [5,10,15].includes(pYun+dYun) ||
                       getJiaZiFamilies(_personAStem,_personABranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
            })();
            const tvConnectsB = _personBYear && tvDayXkdg && (() => {
                const pQi = _personBYear.qi, pYun = _personBYear.yun;
                const dQi = tvDayXkdg.qi,   dYun = tvDayXkdg.yun;
                return isHetuPair(pQi,dQi) || [5,10,15].includes(pQi+dQi) ||
                       isHetuPair(pYun,dYun) || [5,10,15].includes(pYun+dYun) ||
                       getJiaZiFamilies(_personBStem,_personBBranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
            })();

            // Score: use best person (A if connects, B if connects, neither if none)
            const tvPersonYear  = tvConnectsA ? { qi: _personAYear.qi, yun: _personAYear.yun } : (tvConnectsB ? { qi: _personBYear.qi, yun: _personBYear.yun } : null);
            const tvPStem       = tvConnectsA ? _personAStem   : (tvConnectsB ? _personBStem   : null);
            const tvPBranch     = tvConnectsA ? _personABranch : (tvConnectsB ? _personBBranch : null);
            const tvDayStem     = tvConnectsA ? _personADayStem  : (tvConnectsB ? _personBDayStem  : null);
            const tvNobles      = tvDayStem ? (NOBLE_BRANCHES[tvDayStem] || []) : [];
            const tvLu          = tvDayStem ? (LU_BRANCH[tvDayStem] || null) : null;
            const tvMthBranch   = tvConnectsA ? _personAMonthBranch : (tvConnectsB ? _personBMonthBranch : null);
            const tvDayBranchPer= tvConnectsA ? _personADayBranchXkdg : (tvConnectsB ? _personBDayBranchXkdg : null);
            const tvHV          = tvMthBranch ? (HEAVEN_VIRTUE[tvMthBranch] || null) : null;
            const tvBV          = tvDayBranchPer ? (BRANCH_VIRTUE[tvDayBranchPer] || null) : null;
            const tvMV          = tvMthBranch ? (MONTH_VIRTUE[tvMthBranch]  || null) : null;
            const tvTY          = tvDayStem   ? (TIAN_YI[tvDayStem] || null) : null;

            // Score via unified calcHourScore
            const tvScore = calcHourScore(rowDGan, rowDZhi, hGan, hZhi, mGan, mZhi, yGan, yZhi, items, hourSpirit, tSS, tSG, tvPersonYear, tvPStem, tvPBranch, tvNobles, tvLu, tvHV, tvBV, tvMV, tvTY, pillars);
            const tvScoreColor = tvScore >= 12 ? '#1b5e20' : tvScore >= 9 ? '#2e7d32' : tvScore >= 6 ? '#388e3c' : tvScore >= 4 ? '#558b2f' : '#888';

            // A/B markers
            const tvAmarker = tvConnectsA ? `<span style="font-size:10px;font-weight:bold;color:#7b1fa2;">A</span>` : '';
            const tvBmarker = tvConnectsB ? `<span style="font-size:10px;font-weight:bold;color:#6a1b9a;">B</span>` : '';

            const rowBg = hasFamily ? '#fffde7'
                        : tvScore >= 12 ? '#a5d6a7'
                        : tvScore >= 9  ? '#c8e6c9'
                        : tvScore >= 6  ? '#dcedc8'
                        : tvScore >= 4  ? '#f1f8e9'
                        : (h % 2 === 0 ? '#f8f9fa' : '#fff');

            // Relations text
            const blueTexts = items.filter(i => i.tag === 'blue' || i.tag === 'family').map(i => i.text);
            const qualTexts = items.filter(i => ['Powerful','Energetic','Very Weak','Very Timely','Timely','Timely at Birth'].includes(i.text)).map(i => i.text);
            const relHtml = blueTexts.length > 0 ? `<div style="font-size:9px;color:#1a7a1a;font-weight:bold;line-height:1.4;text-align:right;">${blueTexts.join('<br>')}</div>` : '';
            const qualHtml = qualTexts.length > 0 ? `<div style="font-size:9px;color:#555;line-height:1.3;text-align:right;">${qualTexts.join(' · ')}</div>` : '';

            // Hour cell (big)
            const hourBg = rowBg;
            html += `<tr style="cursor:pointer;" onclick="loadDateIntoMain('${isoDate}',${h});window.scrollTo({top:0,behavior:'smooth'});" onmouseover="this.style.filter='brightness(0.92)'" onmouseout="this.style.filter=''">`;
            html += `<td style="border:1px solid #ddd;background:${hourBg};padding:3px 2px;text-align:center;vertical-align:middle;">
                <div style="font-size:8px;color:#888;">${HOUR_LABELS[h].split(' ')[1]||''}</div>
                <div style="font-size:10px;color:#880e4f;font-weight:bold;">${hGan}${hZhi}</div>
                <div style="color:#c62828;font-size:11px;font-weight:bold;line-height:1;">${pillars.hour.qi}</div>
                ${drawHex(pillars.hour.hex, 26)}
                <div style="color:#0d47a1;font-size:10px;font-weight:bold;line-height:1;">${pillars.hour.yun}</div>
            </td>`;

            // Day + Month + Year all in one cell
            const bgDMY = hasFamily ? '#fffde7'
                        : tvScore >= 12 ? '#a5d6a7'
                        : tvScore >= 9  ? '#c8e6c9'
                        : tvScore >= 6  ? '#dcedc8'
                        : tvScore >= 4  ? '#f1f8e9'
                        : (h%2===0?'#f5f5f5':'#fafafa');
            html += `<td style="border:1px solid #ddd;background:${bgDMY};padding:3px 2px;text-align:center;vertical-align:middle;">
                <div style="display:flex;justify-content:center;gap:6px;">
                    <div style="text-align:center;">
                        <div style="font-size:8px;color:#555;">${dGan}${dZhi}</div>
                        <div style="color:#c62828;font-size:10px;font-weight:bold;">${pillars.day.qi}</div>
                        ${drawHex(pillars.day.hex, 20)}
                        <div style="color:#0d47a1;font-size:9px;font-weight:bold;">${pillars.day.yun}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:8px;color:#555;">${mGan}${mZhi}</div>
                        <div style="color:#c62828;font-size:10px;font-weight:bold;">${pillars.month.qi}</div>
                        ${drawHex(pillars.month.hex, 20)}
                        <div style="color:#0d47a1;font-size:9px;font-weight:bold;">${pillars.month.yun}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:8px;color:#555;">${yGan}${yZhi}</div>
                        <div style="color:#c62828;font-size:10px;font-weight:bold;">${pillars.year.qi}</div>
                        ${drawHex(pillars.year.hex, 20)}
                        <div style="color:#0d47a1;font-size:9px;font-weight:bold;">${pillars.year.yun}</div>
                    </div>
                </div>
            </td>`;

            // Relations column - full info including badges and spirits
            const relBg = hasFamily ? '#fffde7'
                        : tvScore >= 12 ? '#a5d6a7'
                        : tvScore >= 9  ? '#c8e6c9'
                        : tvScore >= 6  ? '#dcedc8'
                        : tvScore >= 4  ? '#f1f8e9'
                        : (h%2===0?'#fafafa':'#fff');

            // Badges (Noble, TY, HV, BV, MV, Lu)
            const badgeItems = items.filter(i => ['noble','noble-both','ty','ty-both','hv','bv','mv','lu','lu-both'].includes(i.tag));
            const badgeHtml = badgeItems.map(i => {
                const colors = {
                    noble:'#2e7d32', 'noble-both':'#2e7d32',
                    ty:'#0277bd', 'ty-both':'#0277bd',
                    hv:'#e65100', bv:'#6a1b9a', mv:'#00695c',
                    lu:'#0277bd', 'lu-both':'#0277bd'
                };
                const labels = {
                    noble:'N','noble-both':'N★',
                    ty:'TY','ty-both':'TY★',
                    hv:'HV', bv:'BV', mv:'MV',
                    lu:'L','lu-both':'L★'
                };
                const c = colors[i.tag] || '#555';
                const l = labels[i.tag] || i.tag;
                return `<span style="color:${c};font-weight:bold;font-size:9px;border:1px solid ${c};border-radius:3px;padding:0 3px;margin:1px;">${l}</span>`;
            }).join('');

            // All spirits (good and bad)
            const spiritItems = items.filter(i => i.tag === 'spirit-good' || i.tag === 'spirit-bad');
            const spiritsHtml = spiritItems.map(i =>
                `<div style="font-size:9px;font-weight:bold;color:${i.tag==='spirit-bad'?'#d40000':'#0044cc'};">${i.text}</div>`
            ).join('');

            // Tomb Sha
            const tombHtml = isTombSha(hZhi, dGan, tSS, tSG)
                ? `<div style="font-size:9px;font-weight:bold;color:#d40000;">⚡ Tomb Sha 墓煞</div>` : '';

            // Nayin for TABLE view
            const nayinTV = analyzeNayin(dGan, dZhi, hGan, hZhi, mGan, mZhi, yGan, yZhi, tvConnectsA ? _personAStem : (tvConnectsB ? _personBStem : null), tvConnectsA ? _personABranch : (tvConnectsB ? _personBBranch : null), tvConnectsA ? _personADayStem : (tvConnectsB ? _personBDayStem : null), tvConnectsA ? _personADayBranch : (tvConnectsB ? _personBDayBranch : null));
            const nayinHtmlTV = nayinTV.label === 'Nayin Power' ? `<div style="font-size:9px;font-weight:bold;color:#1b5e20;">☯ Nayin Power</div>`
                              : nayinTV.label === 'Nayin'       ? `<div style="font-size:9px;font-weight:bold;color:#2e7d32;">Nayin</div>`
                              : nayinTV.label === 'Nayin Weak'  ? `<div style="font-size:9px;font-weight:bold;color:#b71c1c;">✕ Nayin Weak</div>`
                              : '';
            const nayinPersonHtmlTV = nayinTV.personLabel && nayinTV.personLabel.startsWith('Nayin ✦ Person')
                                    ? `<div style="font-size:9px;font-weight:bold;color:#0d47a1;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'✦ Nayin Person')">${nayinTV.personLabel.replace('Nayin ✦ Person','✦ Nayin Person')}</div>`
                                    : nayinTV.personLabel && nayinTV.personLabel.startsWith('Nayin ✗ Person')
                                    ? `<div style="font-size:9px;font-weight:bold;color:#e65100;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'✗ Nayin Person')">${nayinTV.personLabel.replace('Nayin ✗ Person','✗ Nayin Person')}</div>`
                                    : '';
            html += `<td style="border:1px solid #ddd;background:${relBg};padding:4px 5px;vertical-align:middle;text-align:right;position:relative;">
                <div style="position:absolute;top:2px;right:4px;display:flex;align-items:center;gap:2px;">
                    <span style="font-size:13px;font-weight:bold;color:${tvScoreColor};">${tvScore}</span>
                    ${tvAmarker}${tvBmarker}
                </div>
                ${relHtml}
                ${badgeHtml ? `<div style="margin:2px 0;text-align:right;">${badgeHtml}</div>` : ''}
                ${qualHtml}
                ${spiritsHtml}
                ${tombHtml}
                ${nayinHtmlTV}${nayinPersonHtmlTV}
            </td>`;


            html += `</tr>`;
        }
        html += `</tbody></table>`;
    }
    html += `</div>`;
    tv.innerHTML = html;
}

function buildCalView() {
    const startDate = document.getElementById('scan-start').value;
    const days      = parseInt(document.getElementById('scan-days').value) || 30;
    const lon       = parseFloat(document.getElementById('longitude').value);
    const utc       = parseFloat(document.getElementById('utc-offset').value);
    if (!startDate) { alert('Please enter a start date.'); return; }

    const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);

    // Person A year for favourable check
    const birthDate = (document.getElementById('person-panel-a') && document.getElementById('person-panel-a').style.display !== 'none') ? document.getElementById('person-date').value : '';
    const birthTime = document.getElementById('person-time').value || '12:00';
    let personAYear = null, pYStem = null, pYBranch = null;
    if (birthDate) {
        const bBase  = new Date(`${birthDate}T${birthTime}`);
        const bSolar = Solar.fromDate(new Date(bBase.getTime() + offsetMin * 60000));
        const bEC    = bSolar.getLunar().getEightChar();
        pYStem = bEC.getYearGan(); pYBranch = bEC.getYearZhi();
        const pYData = getXkdgData(pYStem, pYBranch);
        if (pYData) personAYear = { ...pYData, stem: pYStem, branch: pYBranch };
    }

    const personDayStemCAL = getPersonDayStemFromBirth(
        document.getElementById('person-date').value,
        document.getElementById('person-time').value || '12:00',
        offsetMin
    );
    const personMthBranchCAL = getPersonMonthBranch(
        document.getElementById('person-date').value,
        document.getElementById('person-time').value || '12:00',
        offsetMin
    );
    const personDayZhiCAL = (() => {
        const dv = document.getElementById('person-date').value;
        const tv = document.getElementById('person-time').value || '12:00';
        if (!dv) return null;
        const s = Solar.fromDate(new Date(new Date(`${dv}T${tv}`).getTime() + offsetMin * 60000));
        return s.getLunar().getEightChar().getDayZhi();
    })();
    const start    = new Date(startDate + 'T00:00:00');
    // Always start from day 1 of the start month for full calendar view
    const calMonthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const endDate  = new Date(start.getTime() + days * 86400000);
    // Extend end to last day of the end month
    const calMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    const jieqiMap = buildJieqiMap(calMonthStart.getFullYear() - 1, calMonthEnd.getFullYear() + 1, offsetMin);
    const today    = new Date().toISOString().split('T')[0];
    const DOW      = ['Mo','Tu','We','Th','Fr','Sa','Su'];

    // Build set of Jieqi dates for quick lookup
    const jieqiDates = {}; // isoDate → {name, isMajor}
    // Major Jieqi (节 — month starters): odd indices 0,2,4...
    // Mid-month (中气): even indices 1,3,5...
    if (jieqiMap) {
        Object.entries(jieqiMap).forEach(([isoDate, jq]) => {
            // jq is the jieqi name
            const MAJOR_JIEQI = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];
            const MONTH_START = ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'];
            const isMajor = MONTH_START.includes(jq);
            jieqiDates[isoDate] = { name: jq, isMajor };
        });
    }

    // Group days by month — use full month range
    const months = {};
    const totalDays = Math.round((calMonthEnd - calMonthStart) / 86400000) + 1;
    for (let d = 0; d < totalDays; d++) {
        const dayDate  = new Date(calMonthStart.getTime() + d * 86400000);
        const monthKey = dayDate.getFullYear() + '-' + String(dayDate.getMonth()+1).padStart(2,'0');
        if (!months[monthKey]) months[monthKey] = [];
        months[monthKey].push(dayDate);
    }

    let html = '';

    for (const [monthKey, dayDates] of Object.entries(months)) {
        const [yr, mo] = monthKey.split('-').map(Number);
        const monthName = new Date(yr, mo-1, 1).toLocaleDateString('en-GB', { month:'long', year:'numeric' });

        html += `<div style="font-weight:bold;font-size:14px;color:#795548;margin:10px 0 5px;">${monthName}</div>`;
        html += `<div class="cal-grid">`;
        DOW.forEach(d => html += `<div class="cal-header-cell">${d}</div>`);

        // Fill blanks from Monday to first day of month
        const monthStart = new Date(yr, mo-1, 1);
        const monthEnd   = new Date(yr, mo, 0); // last day of month
        let startDow = monthStart.getDay();
        startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0

        // Add initial blank cells
        for (let b = 0; b < startDow; b++) html += `<div class="cal-cell empty"></div>`;

        // Iterate ALL days of the month
        for (let dd = 1; dd <= monthEnd.getDate(); dd++) {
            const dayDate = new Date(yr, mo-1, dd);
            const isoDate = localISODate(dayDate);
            const isToday = isoDate === today;
            const isInRange = dayDate >= calMonthStart && dayDate <= calMonthEnd;

            // Get day pillar using midday
            const midDay    = new Date(dayDate); midDay.setHours(12, 0, 0, 0);
            const solarDate = new Date(midDay.getTime() + offsetMin * 60000);
            const eightChar = Solar.fromDate(solarDate).getLunar().getEightChar();
            let dGan = eightChar.getDayGan(), dZhi = eightChar.getDayZhi();

            const dData = getXkdgData(dGan, dZhi);
            if (!dData || !isInRange) {
                // Show day number only for out-of-range or no-data days
                const stemColor2 = ELEMENTS_EN[dGan] === 'wood' ? 'var(--wood)' : ELEMENTS_EN[dGan] === 'fire' ? 'var(--fire)' : ELEMENTS_EN[dGan] === 'metal' ? 'var(--metal)' : ELEMENTS_EN[dGan] === 'water' ? 'var(--water)' : 'var(--earth)';
                const jqEntry = jieqiMap[isoDate] || [];
                const jqHtmlSimple = jqEntry.map(j => {
                    const isJie = ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'].includes(j.name);
                    return `<div style="font-size:9px;font-weight:bold;color:#000;margin-top:2px;">${isJie?'节':'气'} ${j.name}</div>`;
                }).join('');
                html += `<div class="cal-cell${isToday?' today':''}" style="opacity:${isInRange?1:0.4};" onclick="showDayInList('${isoDate}')">
                    <div style="display:flex;justify-content:space-between;">
                        <span class="cal-day-num">${dd}</span>
                        <span class="cal-stem" style="color:${stemColor2};font-size:9px;">${dGan}<br>${dZhi}</span>
                    </div>${jqHtmlSimple}</div>`;
                continue;
            }

            const mGan = eightChar.getMonthGan(), mZhi = eightChar.getMonthZhi();
            const yGan = eightChar.getYearGan(), yZhi = eightChar.getYearZhi();

            // Check best hour of the day
            let dayIsPositive = false, dayIsFavourable = false, dayIsFamily = false;
            let dayBestScore = 0;
            for (let h = 0; h < 12; h++) {
                const hs = HOUR_STARTS[h];
                let bd = new Date(dayDate);
                if (hs === 23) bd = new Date(dayDate.getTime() - 86400000);
                bd.setHours(hs, 30, 0, 0);
                const sd = new Date(bd.getTime() + offsetMin * 60000);
                let bdForHourCAL = new Date(dayDate);
                bdForHourCAL.setHours(hs, 30, 0, 0);
                const ec = Solar.fromDate(bdForHourCAL).getLunar().getEightChar();
                const hG = ec.getTimeGan();
                const hZ = ec.getTimeZhi();
                const hD = getXkdgData(hG, hZ);
                if (!hD) continue;
                const { strong: hSS, growing: hSG } = getJieqiSeason(sd);
                const hPillars = buildResolvedPillars(yGan, yZhi, mGan, mZhi, dGan, dZhi, hG, hZ);
                const { items: hItems } = analyzeXkdg(hPillars, hSS, hSG);
                const hBlue = hItems.filter(i => i.tag === 'blue' || i.tag === 'family');
                if (hBlue.length > 0) {
                    dayIsPositive = true;
                    if (hBlue.some(i => i.tag === 'family')) dayIsFamily = true;
                    const hScore = calcHourScore(dGan, dZhi, hG, hZ, mGan, mZhi, yGan, yZhi, hItems, getSpiritForHour(dZhi, hZ), hSS, hSG, personAYear, pYStem, pYBranch, [], null, null, null, null, null, hPillars);
                    if (hScore > dayBestScore) dayBestScore = hScore;
                    if (personAYear) {
                        const dDataCAL = getXkdgData(dGan, dZhi);
                        if (dDataCAL) {
                            const matchLabels = getMatchLabels(personAYear, pYStem, pYBranch, dDataCAL, dGan, dZhi, null, null, null);
                            if (matchLabels.length > 0) dayIsFavourable = true;
                        }
                    }
                }
            }

            const calGreenBg = dayIsFamily ? '#fffde7'
                             : !dayIsPositive ? ''
                             : dayBestScore >= 12 ? '#a5d6a7'
                             : dayBestScore >= 9  ? '#c8e6c9'
                             : dayBestScore >= 6  ? '#dcedc8'
                             : dayBestScore >= 1  ? '#f1f8e9'
                             : '#f1f8e9';
            const calBorder = dayIsFamily ? '#f9a825'
                            : dayBestScore >= 12 ? '#1b5e20'
                            : dayBestScore >= 9  ? '#2e7d32'
                            : dayBestScore >= 6  ? '#388e3c'
                            : '#558b2f';

            const personNobles   = personDayStemCAL ? (NOBLE_BRANCHES[personDayStemCAL] || []) : [];
            const dayBranchIsNoble = personNobles.includes(dZhi);
            const dayBranchIsLu  = personDayStemCAL ? LU_BRANCH[personDayStemCAL] === dZhi : false;
            const dayBranchIsHV  = personMthBranchCAL ? HEAVEN_VIRTUE[personMthBranchCAL] === dZhi : false;
            const personDayZhiCAL2 = (() => { if (!personDayStemCAL) return null; try { const b = new Date(`${document.getElementById('person-date').value}T${document.getElementById('person-time').value||'12:00'}`); return Solar.fromDate(new Date(b.getTime()+(parseFloat(document.getElementById('longitude').value)-parseFloat(document.getElementById('utc-offset').value)*15)*4*60000)).getLunar().getEightChar().getDayZhi(); } catch(e) { return null; } })();
            const dayBranchIsBV  = personDayZhiCAL2 ? BRANCH_VIRTUE[personDayZhiCAL2] === dZhi : false;
            const dayBranchIsTY  = personDayStemCAL ? TIAN_YI[personDayStemCAL] === dZhi : false;
            const mvCAL = personMthBranchCAL ? (MONTH_VIRTUE[personMthBranchCAL] || null) : null;
            const dayBranchIsMV  = mvCAL ? mvCAL.branch === dZhi : false;

            const cellClass = `cal-cell${isToday?' today':''}${dayIsFamily?' family':''}`;
            const cellStyle = calGreenBg ? `background:${calGreenBg};border-color:${calBorder};` : '';
            const stemColor = ELEMENTS_EN[dGan] === 'wood' ? 'var(--wood)' : ELEMENTS_EN[dGan] === 'fire' ? 'var(--fire)' : ELEMENTS_EN[dGan] === 'metal' ? 'var(--metal)' : ELEMENTS_EN[dGan] === 'water' ? 'var(--water)' : 'var(--earth)';

            // Jieqi markers — 节 (month start) in red, 气 (mid-month) in orange
            const MONTH_START_JQ = ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'];
            const jqEntry = jieqiMap[isoDate] || [];
            const jieqiHTML = jqEntry.map(j => {
                const isJie = MONTH_START_JQ.includes(j.name);
                return `<div style="font-size:9px;font-weight:bold;color:#000;margin-top:2px;">${isJie?'节':'气'} ${j.name}</div>`;
            }).join('');

            const nobleIndicator = dayBranchIsNoble ? `<div style="font-size:10px;color:#1a7a1a;font-weight:bold;border:1px solid #1a7a1a;border-radius:3px;padding:0 3px;margin-top:2px;display:inline-block;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'N')">N</div>` : '';
            const luIndicator    = dayBranchIsLu    ? `<div style="font-size:10px;color:#0277bd;font-weight:bold;border:1px solid #0277bd;border-radius:3px;padding:0 3px;margin-top:2px;display:inline-block;background:#e1f5fe;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'L')">L</div>` : '';
            const hvIndicator    = dayBranchIsHV    ? `<div style="font-size:10px;color:#0277bd;font-weight:bold;border:1px solid #0277bd;border-radius:3px;padding:0 3px;margin-top:2px;display:inline-block;background:#e3f2fd;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'HV')">HV</div>` : '';
            const bvIndicator    = dayBranchIsBV    ? `<div style="font-size:10px;color:#0277bd;font-weight:bold;border:1px solid #0277bd;border-radius:3px;padding:0 3px;margin-top:2px;display:inline-block;background:#e8eaf6;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'BV')">BV</div>` : '';
            const mvIndicator    = dayBranchIsMV    ? `<div style="font-size:10px;color:#0277bd;font-weight:bold;border:1px solid #0277bd;border-radius:3px;padding:0 3px;margin-top:2px;display:inline-block;background:#f3e5f5;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'MV')">MV</div>` : '';
            const tyIndicator    = dayBranchIsTY    ? `<div style="font-size:10px;color:#1b5e20;font-weight:bold;border:1px solid #1b5e20;border-radius:3px;padding:0 3px;margin-top:2px;display:inline-block;background:#e8f5e9;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'TY')">TY</div>` : '';

            html += `<div class="${cellClass}" style="${cellStyle}display:flex;flex-direction:column;justify-content:space-between;" onclick="showDayInList('${isoDate}')">
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:top;">
                        <span class="cal-day-num">${dd}</span>
                        <span class="cal-stem" style="color:${stemColor};">${dGan}<br>${dZhi}</span>
                    </div>
                    ${nobleIndicator}${luIndicator}${hvIndicator}${bvIndicator}${mvIndicator}${tyIndicator}
                </div>
                ${jieqiHTML ? `<div style="border-top:1px solid #ddd;margin-top:2px;padding-top:1px;">${jieqiHTML}</div>` : ''}
            </div>`;
        }
        // Fill trailing blanks to complete the grid row
        const totalCells = startDow + monthEnd.getDate();
        const trailingBlanks = (7 - (totalCells % 7)) % 7;
        for (let b = 0; b < trailingBlanks; b++) html += `<div class="cal-cell empty"></div>`;

        html += `</div>`;
    }

    // Month navigation bar
    const calNavHtml = `<div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:8px;">
        <button onclick="shiftCalMonth(-6)" style="padding:3px 8px;border-radius:8px;border:1px solid #795548;background:#fff;color:#795548;font-size:11px;cursor:pointer;">−6m</button>
        <button onclick="shiftCalMonth(-2)" style="padding:3px 8px;border-radius:8px;border:1px solid #795548;background:#fff;color:#795548;font-size:11px;cursor:pointer;">−2m</button>
        <button onclick="shiftCalMonth(-1)" style="padding:3px 8px;border-radius:8px;border:1px solid #795548;background:#fff;color:#795548;font-size:11px;cursor:pointer;">−1m</button>
        <button onclick="shiftCalMonth(1)"  style="padding:3px 8px;border-radius:8px;border:1px solid #795548;background:#fff;color:#795548;font-size:11px;cursor:pointer;">+1m</button>
        <button onclick="shiftCalMonth(2)"  style="padding:3px 8px;border-radius:8px;border:1px solid #795548;background:#fff;color:#795548;font-size:11px;cursor:pointer;">+2m</button>
        <button onclick="shiftCalMonth(6)"  style="padding:3px 8px;border-radius:8px;border:1px solid #795548;background:#fff;color:#795548;font-size:11px;cursor:pointer;">+6m</button>
    </div>`;

    document.getElementById('cal-view').innerHTML = calNavHtml + html;
    const cvEl = document.getElementById('cal-view'); if(cvEl) cvEl.style.display = 'block';
    const srEl1 = document.getElementById('scan-results'); if(srEl1) srEl1.style.display = 'none';
    const mvEl1 = document.getElementById('month-view'); if(mvEl1) mvEl1.style.display = 'none';
}

function buildMonthView() {
    const startDate = document.getElementById('scan-start').value;
    const days      = parseInt(document.getElementById('scan-days').value) || 30;
    const lon       = parseFloat(document.getElementById('longitude').value);
    const utc       = parseFloat(document.getElementById('utc-offset').value);
    if (!startDate) { alert('Please enter a start date.'); return; }

    const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);

    // Person A year - use global if available (cleared when toggled off)
    const birthTime = document.getElementById('person-time').value || '12:00';
    const personAYear = _personAYear || null;
    const pYStem      = _personAStem  || null;
    const pYBranch    = _personABranch || null;

    // Person B year
    const personBYear = _personBYear || null;
    const pBYStem     = _personBStem  || null;
    const pBYBranch   = _personBBranch || null;

    // Use Person A if active, else fall back to Person B for scoring
    const activePersonYear   = personAYear || personBYear || null;
    const activePersonStem   = pYStem   || pBYStem   || null;
    const activePersonBranch = pYBranch || pBYBranch || null;
    const activePersonDayStem   = _personADayStem   || _personBDayStem   || null;
    const activePersonMthBranch = _personAMonthBranch || _personBMonthBranch || null;
    const activePersonDayBranch = _personADayBranchXkdg || _personBDayBranchXkdg || null;

    // Personal star data — use active person
    const birthDate = activePersonYear ? (personAYear ? document.getElementById('person-date').value : document.getElementById('person-date-b').value) : '';
    const birthTime2 = activePersonYear ? (personAYear ? (document.getElementById('person-time').value || '12:00') : (document.getElementById('person-time-b').value || '12:00')) : '12:00';
    const personDayStemMV   = activePersonDayStem;
    const personMthBranchMV = activePersonMthBranch;

    const _dst1 = _dstOn ? 1 : 0;
    const HOUR_SHORT = ['23:00-01:00','01:00-03:00','03:00-05:00','05:00-07:00','07:00-09:00','09:00-11:00','11:00-13:00','13:00-15:00','15:00-17:00','17:00-19:00','19:00-21:00','21:00-23:00'];
    const HOUR_SHORT_BY_BRANCH = {'子':'23:00-01:00','丑':'01:00-03:00','寅':'03:00-05:00','卯':'05:00-07:00','辰':'07:00-09:00','巳':'09:00-11:00','午':'11:00-13:00','未':'13:00-15:00','申':'15:00-17:00','酉':'17:00-19:00','戌':'19:00-21:00','亥':'21:00-23:00'};
    function getHourTimeStr(branch) {
        const base = HOUR_SHORT_BY_BRANCH[branch] || '';
        if (!base) return '';
        // Apply TST offset (offsetMin already includes DST)
        const tstMins = offsetMin + (_dst1 * 60);
        if (tstMins === 0) return base;
        const parts = base.split('-');
        const adjusted = parts.map(t => {
            const [hStr, mStr] = t.split(':');
            const totalMins = parseInt(hStr) * 60 + (parseInt(mStr)||0) + tstMins;
            const h = Math.floor(((totalMins % 1440) + 1440) % 1440 / 60);
            const m = Math.floor(((totalMins % 1440) + 1440) % 1440 % 60);
            return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
        });
        return adjusted.join('-') + ' ✦';
    }
    // Pre-compute TST-adjusted Zi boundary times for display
    function getTSTTimeStr(stdHour, stdMin) {
        const tstMins = offsetMin + (_dst1 * 60);
        const totalMins = stdHour * 60 + (stdMin||0) + tstMins;
        const h = Math.floor(((totalMins % 1440) + 1440) % 1440 / 60);
        const m = Math.floor(((totalMins % 1440) + 1440) % 1440 % 60);
        return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
    }
    const ziStart = getTSTTimeStr(23, 0);  // TST-adjusted 23:00
    const ziMid   = getTSTTimeStr(0, 0);   // TST-adjusted 00:00
    const ziEnd   = getTSTTimeStr(1, 0);   // TST-adjusted 01:00
    const hasTST  = (offsetMin + _dst1 * 60) !== 0;
    const tstMark = hasTST ? ' ✦' : '';
    const start    = new Date(startDate + 'T00:00:00');
    const endMV    = new Date(start.getTime() + days * 86400000);
    const jieqiMap = buildJieqiMap(start.getFullYear() - 1, endMV.getFullYear() + 1, offsetMin);
    const personDayZhiMV = activePersonDayBranch || null;

    // Personal star data for score calculation — use active person
    const pNobleA = personDayStemMV ? (NOBLE_BRANCHES[personDayStemMV] || []) : [];
    const pLuA    = personDayStemMV ? (LU_BRANCH[personDayStemMV] || null) : null;
    const pHVA    = personMthBranchMV ? (HEAVEN_VIRTUE[personMthBranchMV] || null) : null;
    const pBVA    = personDayZhiMV ? (BRANCH_VIRTUE[personDayZhiMV] || null) : null;
    const pMVA    = personMthBranchMV ? (MONTH_VIRTUE[personMthBranchMV] || null) : null;
    const pTYA    = personDayStemMV ? (TIAN_YI[personDayStemMV] || null) : null;
    let html = '';
    let lastDay = '';
    let pendingZiRows = []; // Zi hour rows held to append to PREVIOUS day

    for (let d = 0; d < days; d++) {
        const dayDate = new Date(start.getTime() + d * 86400000);
            const _isoDay = localISODate(dayDate);
            if (!isDateAllowed(_isoDay)) continue;
        const dateLabel = dayDate.toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });

        // Day separator
        // Get Y M D stems for this day (use midday hour)
        const midDay = new Date(dayDate);
        midDay.setHours(12, 0, 0, 0);
        const midSolar  = Solar.fromDate(new Date(midDay.getTime() + offsetMin * 60000));
        const midEC     = midSolar.getLunar().getEightChar();
        let dGanDay = midEC.getDayGan(), dZhiDay = midEC.getDayZhi();
        const yGanDay = midEC.getYearGan(),  yZhiDay = midEC.getYearZhi();
        const mGanDay = midEC.getMonthGan(), mZhiDay = midEC.getMonthZhi();

        const jieqiDay = jieqiMap[localISODate(dayDate)] || [];
        const jieqiDayHTML = jieqiDay.map(j => `<span style="font-size:10px;color:#e65100;font-weight:bold;"> ⟐ ${j.name} ${j.time}</span>`).join('');

        // Clash for this day
        const dayClashType = getClashType(dGanDay, dZhiDay, midEC.getYearZhi(), mGanDay, mZhiDay);
        const dayClashHTML = dayClashType === 'clash-year'
            ? `<span style="color:#d40000;font-weight:bold;font-size:11px;margin-left:4px;">⚡⚡⚡</span>`
            : dayClashType === 'clash-month-stem'
            ? `<span style="color:#d40000;font-weight:bold;font-size:11px;margin-left:4px;">⚡⚡</span>`
            : dayClashType === 'clash-month-branch'
            ? `<span style="color:#d40000;font-weight:bold;font-size:11px;margin-left:4px;">⚡</span>`
            : '';

        // Person Noble/Lu on the day branch
        const personNoblesDay = personDayStemMV ? (NOBLE_BRANCHES[personDayStemMV] || []) : [];
        const dayIsPersonNoble = personNoblesDay.includes(dZhiDay);
        const dayIsPersonLu    = personDayStemMV ? LU_BRANCH[personDayStemMV] === dZhiDay : false;
        const dayIsPersonHV    = personMthBranchMV ? HEAVEN_VIRTUE[personMthBranchMV] === dZhiDay : false;
        const dayIsPersonBV    = personDayZhiMV ? BRANCH_VIRTUE[personDayZhiMV] === dZhiDay : false;
        const mvPersonData     = personMthBranchMV ? (MONTH_VIRTUE[personMthBranchMV] || null) : null;
        const dayIsPersonMV    = mvPersonData ? mvPersonData.branch === dZhiDay : false;
        const dayIsPersonTY    = personDayStemMV ? TIAN_YI[personDayStemMV] === dZhiDay : false;
        const headerNL = (dayIsPersonNoble ? `<span style="color:#1a7a1a;font-weight:bold;font-size:11px;border:1px solid #1a7a1a;border-radius:3px;padding:0 3px;margin-left:3px;cursor:pointer; onclick="event.stopPropagation();showBadgeTip(this,'N')">N</span>` : '')
                       + (dayIsPersonLu    ? `<span style="color:#0277bd;font-weight:bold;font-size:11px;border:1px solid #0277bd;border-radius:3px;padding:0 3px;margin-left:2px;background:#e1f5fe;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'L')">L</span>` : '')
                       + (dayIsPersonHV    ? `<span style="color:#0277bd;font-weight:bold;font-size:11px;border:1px solid #0277bd;border-radius:3px;padding:0 3px;margin-left:2px;background:#e3f2fd;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'HV')">HV</span>` : '')
                       + (dayIsPersonBV    ? `<span style="color:#0277bd;font-weight:bold;font-size:11px;border:1px solid #0277bd;border-radius:3px;padding:0 3px;margin-left:2px;background:#e8eaf6;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'BV')">BV</span>` : '')
                       + (dayIsPersonMV    ? `<span style="color:#0277bd;font-weight:bold;font-size:11px;border:1px solid #0277bd;border-radius:3px;padding:0 3px;margin-left:2px;background:#f3e5f5;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'MV')">MV</span>` : '')
                       + (dayIsPersonTY    ? `<span style="color:#1b5e20;font-weight:bold;font-size:11px;border:1px solid #1b5e20;border-radius:3px;padding:0 3px;margin-left:2px;background:#e8f5e9;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'TY')">TY</span>` : '');

        let dayRowsHtml = '';
        let dayRows = []; // collect {score, html} for optional sort
        const headerHtml = `<div style="background:#fce4ec;padding:4px 8px;font-weight:bold;font-size:11px;color:#880e4f;border-top:3px solid #1565c0;display:flex;align-items:center;">
            <div style="flex-shrink:0;display:flex;gap:2px;align-items:center;">${headerNL}${dayClashHTML}</div>
            <div style="margin-left:auto;font-size:11px;font-weight:normal;text-align:right;">${dateLabel}${jieqiDayHTML}</div>
        </div>`;

        // Zi hour (子, 23:00-01:00) straddles midnight:
        // - 23:00-00:00 = FIRST HALF → belongs to THIS day D (shown last)
        // - 00:00-01:00 = SECOND HALF → belongs to THIS day D (shown first, same stems as D)
        // So each day shows: [00:00-01:00 Zi second half] + [01:00-23:00 hours 1-11] + [23:00-00:00 Zi first half]

        // ZI SECOND HALF (00:00-01:00): uses THIS day's stems
        // Skip on d=0 (no previous day context needed, first day starts at Chou)
        if (d > 0) {
            const ziBase2 = new Date(dayDate); ziBase2.setHours(0, 30, 0, 0);
            const ziSolar2 = Solar.fromDate(new Date(ziBase2.getTime() + offsetMin * 60000));
            const ziEC2    = ziSolar2.getLunar().getEightChar();
            // Day stems: use THIS day's midday (declared first to avoid TDZ error)
            const ziMidSolar2 = Solar.fromDate(new Date(dayDate.getTime() + 12*3600000 + offsetMin*60000));
            const ziDGan2 = ziMidSolar2.getLunar().getEightChar().getDayGan();
            const ziDZhi2 = ziMidSolar2.getLunar().getEightChar().getDayZhi();
            // Hour stem: use dayDate at 00:30 standard (continuous cycle, no TST)
            const ziHourBase2 = new Date(dayDate); ziHourBase2.setHours(0, 30, 0, 0);
            const ziHGan2   = Solar.fromDate(ziHourBase2).getLunar().getEightChar().getTimeGan();
            const ziHZhi2  = '子';
            const ziYGan2 = ziEC2.getYearGan(), ziYZhi2 = ziEC2.getYearZhi();
            const ziMGan2 = ziEC2.getMonthGan(), ziMZhi2 = ziEC2.getMonthZhi();
            const ziYData2 = getXkdgData(ziYGan2, ziYZhi2);
            const ziMData2 = getXkdgData(ziMGan2, ziMZhi2);
            const ziDData2 = getXkdgData(ziDGan2, ziDZhi2);
            const ziHData2 = getXkdgData(ziHGan2, ziHZhi2);
            if (ziYData2 && ziMData2 && ziDData2) {
                const ziP2 = buildResolvedPillars(ziYGan2, ziYZhi2, ziMGan2, ziMZhi2, ziDGan2, ziDZhi2, ziHGan2, ziHZhi2);
                const { strong: ziSS2, growing: ziSG2 } = getJieqiSeason(ziBase2);
                const { items: ziItems2 } = analyzeXkdg(ziP2, ziSS2, ziSG2);
                const ziBlue2 = ziItems2.filter(i => i.tag==='blue'||i.tag==='family');
                const ziIsPos2 = ziBlue2.length > 0;
                const ziSpirit2 = getSpiritForHour(ziDZhi2, '子');
                const ziScore2  = calcHourScore(ziDGan2, ziDZhi2, ziHGan2, '子', ziMGan2, ziMZhi2, ziYGan2, ziYZhi2, ziItems2, ziSpirit2, ziSS2, ziSG2, activePersonYear, activePersonStem, activePersonBranch, pNobleA, pLuA, pHVA, pBVA, pMVA, pTYA, ziP2);
                const ziNayin2  = analyzeNayin(ziDGan2, ziDZhi2, ziHGan2, '子', ziMGan2, ziMZhi2, ziYGan2, ziYZhi2, activePersonStem, activePersonBranch, activePersonDayStem, activePersonDayBranch);
                const ziAF2 = getActiveFilters();
                const ziPassF2 = ziAF2.size === 0 || blueItemsPassFilter(ziBlue2, ziAF2, {}, ziItems2);
                if (ziPassF2) {
                    const ziBg2 = ziScore2>=12?'#a5d6a7':ziScore2>=9?'#c8e6c9':ziScore2>=6?'#dcedc8':ziScore2>=4?'#f1f8e9':'#ffffff';
                    const ziBrd2 = ziScore2>=12?'#1b5e20':ziScore2>=9?'#2e7d32':ziScore2>=6?'#388e3c':ziScore2>=4?'#558b2f':'#aaa';
                    const ziElN2 = ziBlue2.filter(i=>i.text.includes('Element')||i.text==='Pure Qi'||i.tag==='family'||i.text.startsWith('Inverse')).map(i=>i.text);
                    const ziSp2H = ziSpirit2?`<div style="font-size:9px;font-weight:bold;color:${ziSpirit2.auspicious?'#0044cc':'#d40000'};">${ziSpirit2.en} ${ziSpirit2.zh}</div>`:'';
                    const ziNy2H = ziNayin2.label?`<div style="font-size:9px;font-weight:bold;color:${ziNayin2.label==='Nayin Power'?'#1b5e20':ziNayin2.label==='Nayin Weak'?'#b71c1c':'#2e7d32'};">${ziNayin2.label}</div>`:'';
                    const ziYD2 = ziP2.year||{}, ziMD2 = ziP2.month||{}, ziDD2 = ziP2.day||{}, ziHD2 = ziP2.hour||{};
                    const ziPerN2 = ziBlue2.filter(i=>i.text.includes('Period')).map(i=>i.text);
                    dayRows.push({ score: ziScore2, isZiSecond: true, html: `<div onclick="loadDateIntoMain('${localISODate(dayDate)}',0)" style="display:flex;align-items:center;padding:3px 8px;border-bottom:1px solid #eee;${ziBg2?`background:${ziBg2};`:''}border-left:4px solid ${ziBrd2};cursor:pointer;">
                        <div style="width:28px;flex-shrink:0;font-size:13px;font-weight:bold;color:#1b5e20;text-align:left;padding-left:2px;">${ziScore2}</div>
                        <div style="width:80px;flex-shrink:0;font-size:11px;color:#333;">
                            <span style="color:#999;font-size:10px;">${ziMid}-${ziEnd}${tstMark}</span><br>
                            <span style="font-size:13px;font-weight:bold;color:#880e4f;">${ziHGan2}${ziHZhi2}</span>
                        </div>
                        <div style="width:30px;flex-shrink:0;"></div>
                        <div style="flex:1;display:flex;justify-content:flex-end;padding-right:20px;">
                            <div style="display:grid;grid-template-columns:25px 25px 25px 25px;gap:0px;">
                                <div style="text-align:center;"><div style="color:#d40000;font-weight:bold;font-size:13px;">${ziHD2.qi||''}</div><div style="color:#0044cc;font-weight:bold;font-size:13px;">${ziHD2.yun||''}</div></div>
                                <div style="text-align:center;"><div style="color:#d40000;font-weight:bold;font-size:13px;">${ziDD2.qi||''}</div><div style="color:#0044cc;font-weight:bold;font-size:13px;">${ziDD2.yun||''}</div></div>
                                <div style="text-align:center;"><div style="color:#d40000;font-weight:bold;font-size:13px;">${ziMD2.qi||''}</div><div style="color:#0044cc;font-weight:bold;font-size:13px;">${ziMD2.yun||''}</div></div>
                                <div style="text-align:center;"><div style="color:#d40000;font-weight:bold;font-size:13px;">${ziYD2.qi||''}</div><div style="color:#0044cc;font-weight:bold;font-size:13px;">${ziYD2.yun||''}</div></div>
                            </div>
                        </div>
                        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;font-size:10px;gap:1px;text-align:right;">
                            ${ziElN2.length?`<div style="color:#1a7a1a;font-weight:bold;">${ziElN2.join(' · ')}</div>`:''}
                            ${ziPerN2.length?`<div style="color:#1565c0;">${ziPerN2.join(' · ')}</div>`:''}
                            ${ziSp2H}${ziNy2H}
                        </div>
                    </div>` });
                }
            }
        }

        const hourOrder = [1,2,3,4,5,6,7,8,9,10,11,'zi-first'];
        for (const h of hourOrder) {
            const isZiFirst = h === 'zi-first';
            const hIdx = isZiFirst ? 0 : h;
            const hourStart = HOUR_STARTS[hIdx];
            let baseDate = new Date(dayDate);
            if (isZiFirst) {
                baseDate.setHours(23, 30, 0, 0); // Zi first half: 23:00-00:00 of THIS day
            } else {
                baseDate.setHours(hourStart, 30, 0, 0);
            }
            const solarDate = new Date(baseDate.getTime() + offsetMin * 60000);

            const solar     = Solar.fromDate(solarDate);
            const eightChar = solar.getLunar().getEightChar();

            // For hour pillar: always use dayDate at this hour (no day subtraction)
            // The 60 JiaZi cycle is continuous — never go back a day for hour stem
            let baseDateForHour = new Date(dayDate);
            baseDateForHour.setHours(isZiFirst ? 23 : hourStart, 30, 0, 0);
            const hourEC    = Solar.fromDate(baseDateForHour).getLunar().getEightChar();
            const hGanDirect = hourEC.getTimeGan();
            const hZhiDirect = hourEC.getTimeZhi();

            let dGan = eightChar.getDayGan(), dZhi = eightChar.getDayZhi();
            // Zi first half (23:00): eightChar gives NEXT day stem — use THIS day's midday instead
            if (isZiFirst) {
                const todaySolar = Solar.fromDate(new Date(dayDate.getTime() + 12 * 3600000 + offsetMin * 60000));
                dGan = todaySolar.getLunar().getEightChar().getDayGan();
                dZhi = todaySolar.getLunar().getEightChar().getDayZhi();
            } else if (solarDate.getHours() === 23) {
                const yest = Solar.fromDate(new Date(solarDate.getTime() - 3600000));
                dGan = yest.getLunar().getEightChar().getDayGan();
                dZhi = yest.getLunar().getEightChar().getDayZhi();
            }

            const yGan = eightChar.getYearGan(),  yZhi = eightChar.getYearZhi();
            const mGan = eightChar.getMonthGan(), mZhi = eightChar.getMonthZhi();
            const hGan = eightChar.getTimeGan(),  hZhi = eightChar.getTimeZhi();

            const yData = getXkdgData(yGan, yZhi);
            const mData = getXkdgData(mGan, mZhi);
            const dData = getXkdgData(dGan, dZhi);
            const hData = getXkdgData(hGanDirect, hZhiDirect);

            // ── ZI FIRST HALF: build row at 23:30 of THIS day — library gives correct next-day stem ──
            if (isZiFirst) {
                // At 23:30, library returns the new Chinese day stem (correct for Zi hour)
                const ziDGan = eightChar.getDayGan(), ziDZhi = eightChar.getDayZhi();
                const ziYGan = eightChar.getYearGan(), ziYZhi = eightChar.getYearZhi();
                const ziMGan = eightChar.getMonthGan(), ziMZhi = eightChar.getMonthZhi();
                // Use dayDate at 23:30 for hour pillar (continuous 60 JiaZi cycle)
                const ziHourBase = new Date(dayDate); ziHourBase.setHours(23, 30, 0, 0);
                const ziHourEC = Solar.fromDate(ziHourBase).getLunar().getEightChar();
                const ziHGanF  = ziHourEC.getTimeGan();
                const ziHZhiF  = '子';
                const ziPillars = buildResolvedPillars(ziYGan, ziYZhi, ziMGan, ziMZhi, ziDGan, ziDZhi, ziHGanF, ziHZhiF);
                const { strong: ziSS, growing: ziSG } = getJieqiSeason(solarDate);
                const { items: ziItemsF } = analyzeXkdg(ziPillars, ziSS, ziSG);
                const ziBlueF   = ziItemsF.filter(i => i.tag==='blue'||i.tag==='family');
                const ziSpiritF = getSpiritForHour(ziDZhi, ziHZhiF);
                const ziScoreF  = calcHourScore(ziDGan, ziDZhi, ziHGanF, ziHZhiF, ziMGan, ziMZhi, ziYGan, ziYZhi, ziItemsF, ziSpiritF, ziSS, ziSG, activePersonYear, activePersonStem, activePersonBranch, pNobleA, pLuA, pHVA, pBVA, pMVA, pTYA, ziPillars);
                const ziNayinF  = analyzeNayin(ziDGan, ziDZhi, ziHGanF, ziHZhiF, ziMGan, ziMZhi, ziYGan, ziYZhi, activePersonStem, activePersonBranch, activePersonDayStem, activePersonDayBranch);
                const ziBgF  = ziScoreF>=12?'#a5d6a7':ziScoreF>=9?'#c8e6c9':ziScoreF>=6?'#dcedc8':ziScoreF>=4?'#f1f8e9':'#ffffff';
                const ziBrdF = ziScoreF>=12?'#1b5e20':ziScoreF>=9?'#2e7d32':ziScoreF>=6?'#388e3c':ziScoreF>=4?'#558b2f':'#aaa';
                const ziElNF = ziBlueF.filter(i=>i.text.includes('Element')||i.text==='Pure Qi'||i.tag==='family'||i.text.startsWith('Inverse')).map(i=>i.text);
                const ziSpHF = ziSpiritF?`<div style="font-size:9px;font-weight:bold;color:${ziSpiritF.auspicious?'#0044cc':'#d40000'};">${ziSpiritF.en} ${ziSpiritF.zh}</div>`:'';
                const ziNyFH = ziNayinF.label?`<div style="font-size:9px;font-weight:bold;color:${ziNayinF.label==='Nayin Power'?'#1b5e20':ziNayinF.label==='Nayin Weak'?'#b71c1c':'#2e7d32'};">${ziNayinF.label}</div>`:'';
                const ziYD = ziPillars.year||{}, ziMD = ziPillars.month||{}, ziDD = ziPillars.day||{}, ziHD = ziPillars.hour||{};
                dayRows.push({ score: ziScoreF, isZiFirst: true, html: `<div onclick="loadDateIntoMain('${localISODate(dayDate)}',0)" style="display:flex;align-items:center;padding:3px 8px;border-bottom:1px solid #eee;${ziBgF?`background:${ziBgF};`:''}border-left:4px solid ${ziBrdF};cursor:pointer;">
                    <div style="width:28px;flex-shrink:0;font-size:13px;font-weight:bold;color:#1b5e20;text-align:left;padding-left:2px;">${ziScoreF}</div>
                    <div style="width:80px;flex-shrink:0;font-size:11px;color:#333;">
                        <span style="color:#999;font-size:10px;">${ziStart}-${ziMid}${tstMark}</span><br>
                        <span style="font-size:13px;font-weight:bold;color:#880e4f;">${ziHGanF}${ziHZhiF}</span>
                    </div>
                    <div style="width:30px;flex-shrink:0;"></div>
                    <div style="flex:1;display:flex;justify-content:flex-end;padding-right:20px;">
                        <div style="display:grid;grid-template-columns:25px 25px 25px 25px;gap:0px;">
                            <div style="text-align:center;"><div style="color:#d40000;font-weight:bold;font-size:13px;">${ziHD.qi||''}</div><div style="color:#0044cc;font-weight:bold;font-size:13px;">${ziHD.yun||''}</div></div>
                            <div style="text-align:center;"><div style="color:#d40000;font-weight:bold;font-size:13px;">${ziDD.qi||''}</div><div style="color:#0044cc;font-weight:bold;font-size:13px;">${ziDD.yun||''}</div></div>
                            <div style="text-align:center;"><div style="color:#d40000;font-weight:bold;font-size:13px;">${ziMD.qi||''}</div><div style="color:#0044cc;font-weight:bold;font-size:13px;">${ziMD.yun||''}</div></div>
                            <div style="text-align:center;"><div style="color:#d40000;font-weight:bold;font-size:13px;">${ziYD.qi||''}</div><div style="color:#0044cc;font-weight:bold;font-size:13px;">${ziYD.yun||''}</div></div>
                        </div>
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;font-size:10px;gap:1px;text-align:right;">
                        ${ziElNF.length?`<div style="color:#1a7a1a;font-weight:bold;">${ziElNF.join(' · ')}</div>`:''}
                        ${ziSpHF}${ziNyFH}
                    </div>
                </div>` });
                continue;
            }

            if (!yData || !mData || !dData) continue;

            const pillars = buildResolvedPillars(yGan, yZhi, mGan, mZhi, dGan, dZhi, hGanDirect, hZhiDirect);
            const yDisp = pillars.year, mDisp = pillars.month, dDisp = pillars.day, hDisp = pillars.hour;

            const { strong: sS, growing: sG } = getJieqiSeason(solarDate);

            // Check Tomb Sha before skipping non-XKDG hours
            const hourTimeLabel = getHourTimeStr(hZhiDirect);
            const isTombShaLV = isTombSha(hZhi, dGan, sS, sG);
            const activeFiltersPre = getActiveFilters();

            // If no hData and no Tomb Sha — check Nayin before deciding to skip (Zi first half always passes)
            if (!isZiFirst && !hData && !isTombShaLV) {
                if (!activeFiltersPre.has('nayin')) continue;
                const nayinCheck = analyzeNayin(dGan, dZhi, hGan, hZhiDirect, mGan, mZhi, yGan, yZhi, pYStem, pYBranch, null, null);
                if (!nayinCheck.label) continue;
            }

            // If Tomb Sha but no XKDG data for hour, show warning row
            if (!hData && isTombShaLV) {
                dayRows.push({ score: -99, html: `<div style="display:flex;align-items:center;padding:3px 8px;border-bottom:1px solid #eee;background:#fff5f5;">
                    <div style="width:80px;flex-shrink:0;font-size:11px;color:#333;">
                        <span style="color:#999;font-size:10px;">${getHourTimeStr(hZhi)}</span><br>
                        <span style="font-size:13px;font-weight:bold;color:#880e4f;">${hGan}${hZhi}</span>
                    </div>
                    <div style="flex:1;display:flex;align-items:center;gap:6px;">
                        <span style="color:#d40000;font-weight:bold;font-size:14px;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'墓煞')">墓煞</span>
                        <span style="color:#d40000;font-size:10px;">Tomb Sha — ${dGan} stem, ${hZhi} hour</span>
                    </div>
                </div>` });
                continue;
            }
            const { items: analysisItems } = analyzeXkdg(pillars, sS, sG);
            const blueItems  = analysisItems.filter(i => i.tag === 'blue' || i.tag === 'family');

            // Add TY and Noble to analysisItems for Purpose filter
            const tyBranch = TIAN_YI[dGan];
            if (tyBranch === hZhi) analysisItems.push({ text: 'Tian Yi (Date)', tag: 'ty' });
            const nobleBranches = NOBLE_BRANCHES[dGan] || [];
            if (nobleBranches.includes(hZhi)) analysisItems.push({ text: 'Noble (Date)', tag: 'noble' });
            // Add Nayin to analysisItems for filter
            const nayinResLV = analyzeNayin(dGan, dZhi, hGanDirect, hZhiDirect, mGan, mZhi, yGan, yZhi, activePersonStem, activePersonBranch, activePersonDayStem, activePersonDayBranch);
            if (nayinResLV.label) analysisItems.push({ text: nayinResLV.label, tag: nayinResLV.label === 'Nayin Power' ? 'nayin-power' : nayinResLV.label === 'Nayin Weak' ? 'nayin-weak' : 'nayin' });
            if (nayinResLV.personLabel) analysisItems.push({ text: nayinResLV.personLabel, tag: nayinResLV.personScore > 0 ? 'nayin-person-good' : 'nayin-person-bad' });
            // Ke Wealth filter
            const pDayStemLV = _personADayStem || _personBDayStem || null;
            const pDayQiLV   = (_personAPillars && _personAPillars.day) ? _personAPillars.day.qi : ((_personBPillars && _personBPillars.day) ? _personBPillars.day.qi : null);
            const keScoreLV  = calcKeWealthScore(dGan, dZhi, hGanDirect, mGan, yGan, hData ? hData.qi : null, mData ? mData.qi : null, yData ? yData.qi : null, dData ? dData.qi : null, pDayStemLV, pDayQiLV);
            if (keScoreLV > 0) analysisItems.push({ text: 'Ke', tag: 'ke-wealth', keScore: keScoreLV });
            const isPositive = blueItems.length > 0;
            const isNayinPositiveOrWeak = nayinResLV.label !== null;

            // Skip hours with no XKDG relations — unless purpose/nayin filter or Nayin label exists or Zi first half
            const activeFiltersMV = getActiveFilters();
            const hasNayinFilter = activeFiltersMV.has('nayin');
            const hasKeFilterMV  = activeFiltersMV.has('ke-wealth');
            if (!isZiFirst && !isPositive && !isNayinPositiveOrWeak && !getPurpose() && !hasNayinFilter && !hasKeFilterMV) continue;

            // Apply filter chips (Zi first half always passes)
            if (!isZiFirst && activeFiltersMV.size > 0 && !blueItemsPassFilter(blueItems, activeFiltersMV, { qi: pillars.day.qi, yun: pillars.day.yun }, analysisItems)) continue;
            const filtersActiveMV = activeFiltersMV.size > 0;
            const dayXkdgLV = dData || pillars.day;
            // Use active person (A if active, else B)
            const activePersonYearLV = activePersonYear;
            const activePYStemLV     = activePersonStem;
            const activePYBranchLV   = activePersonBranch;
            // Personal connection gate: only applies when person is loaded (not for Zi first half)
            if (!isZiFirst && activePersonYearLV) {
                const connects = (() => {
                    const pQi = activePersonYearLV.qi, pYun = activePersonYearLV.yun;
                    const dQi = dayXkdgLV.qi, dYun = dayXkdgLV.yun;
                    return isHetuPair(pQi, dQi) || [5,10,15].includes(pQi + dQi) ||
                           isHetuPair(pYun, dYun) || [5,10,15].includes(pYun + dYun) ||
                           (blueItems.some(i=>i.text==='Pure Qi'||i.text==='Pure Qi Elements') && pQi === dQi) ||
                           (blueItems.some(i=>i.text==='Pure Qi'||i.text==='Pure Qi Periods') && pYun === dYun) ||
                           getJiaZiFamilies(activePYStemLV, activePYBranchLV).some(f => getJiaZiFamilies(dGan, dZhi).includes(f));
                })();
                // If BOTH persons active, require both connect
                if (personAYear && personBYear) {
                    const connectsA = (() => {
                        const pQi = personAYear.qi, pYun = personAYear.yun;
                        const dQi = dayXkdgLV.qi, dYun = dayXkdgLV.yun;
                        return isHetuPair(pQi,dQi)||[5,10,15].includes(pQi+dQi)||isHetuPair(pYun,dYun)||[5,10,15].includes(pYun+dYun)||getJiaZiFamilies(pYStem,pYBranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
                    })();
                    const connectsB = (() => {
                        const pQi = personBYear.qi, pYun = personBYear.yun;
                        const dQi = dayXkdgLV.qi, dYun = dayXkdgLV.yun;
                        return isHetuPair(pQi,dQi)||[5,10,15].includes(pQi+dQi)||isHetuPair(pYun,dYun)||[5,10,15].includes(pYun+dYun)||getJiaZiFamilies(pBYStem,pBYBranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
                    })();
                    if (!(connectsA && connectsB)) continue;
                } else {
                    if (!connects) continue;
                }
            }

            // Kong Wang check: mark void+untimely with red V (Pure Qi, Family, and Nayin Weak exempt)
            const hasPureQiOrFamilyLV = blueItems.some(i => i.text.includes('Pure Qi') || i.tag === 'family');
            const isNayinWeakLV = nayinResLV.label === 'Nayin Weak';
            const isVoidLV = !hasPureQiOrFamilyLV && !isNayinWeakLV && !isZiFirst && isKongWangVoid(hZhiDirect, dGan, dZhi, sS, sG);
            if (isVoidLV) continue;

            let isFavourable = false;
            if (isPositive && (personAYear || personBYear)) {
                // Temporarily set _currentDayAnalysis to scan hour's data for getMatchLabels
                const _savedAnalysis = _currentDayAnalysis;
                _currentDayAnalysis = {
                    items: analysisItems,
                    pillars: { hour: pillars.hour, day: pillars.day, month: pillars.month, year: pillars.year },
                    stems: { hour: hGan, day: dGan, month: mGan, year: yGan },
                    branches: { hour: hZhiDirect, day: dZhi, month: mZhi, year: yZhi }
                };
                if (personAYear) {
                    const labelsA = getMatchLabels(personAYear, pYStem, pYBranch, pillars.day, dGan, dZhi, _personAPillars, _personADayStem, _personADayBranch);
                    const favA = labelsA.length > 0;
                    if (personBYear) {
                        const labelsB = getMatchLabels(personBYear, pBYStem, pBYBranch, pillars.day, dGan, dZhi, _personBPillars, _personBDayStem, _personBDayBranch);
                        isFavourable = favA && labelsB.length > 0;
                    } else {
                        isFavourable = favA;
                    }
                } else if (personBYear) {
                    const labelsB = getMatchLabels(personBYear, pBYStem, pBYBranch, pillars.day, dGan, dZhi, _personBPillars, _personBDayStem, _personBDayBranch);
                    isFavourable = labelsB.length > 0;
                }
                _currentDayAnalysis = _savedAnalysis;
            }

            const elNotes  = blueItems.filter(i => {
                if (activeFiltersMV.size > 0) return itemMatchesFilter(i.text, i.tag, activeFiltersMV);
                return i.text.includes('Element') || i.text === 'Pure Qi' || i.tag === 'family' || i.text.startsWith('Inverse Hex') || i.text.includes('Period');
            }).map(i => i.text);
            const perNotes = blueItems.filter(i => {
                if (activeFiltersMV.size > 0) return false; // already shown in elNotes when filter active
                return i.text.includes('Period');
            }).map(i => i.text);
            const famNotes = blueItems.filter(i => i.tag === 'family').map(i => i.text);
            const hasFamily = famNotes.length > 0;

            // Check if person shares family with the day
            const personSharesFamily = personAYear && pYStem && pYBranch &&
                getJiaZiFamilies(pYStem, pYBranch).some(f => getJiaZiFamilies(dGan, dZhi).includes(f));
            const hasFamilyLV = hasFamily; // BL only when all 4 pillars share a family

            const bg = isFavourable ? '#fce4ec' : isPositive ? '#e3f2fd' : '#fff';
            // Only restrict to personal matches when person active AND no filters (not for Zi first half)
            if (!isZiFirst && !filtersActiveMV && (personAYear || personBYear) && !isFavourable) continue;
            // Green gradient based on score (same tiers as BEST scanner)
            const isoDate = localISODate(dayDate);

            // 12 Spirits
            const spirit = getSpiritForHour(dZhi, hZhiDirect);
            const spiritHTML = spirit ? `<span style="font-size:10px;font-weight:bold;color:${spirit.auspicious ? '#0044cc' : '#d40000'};cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'${spirit.en} ${spirit.zh}')">${spirit.en} ${spirit.zh}</span>` : '';

            // Score via unified calcHourScore
            let listScore;
            if (personAYear && personBYear && _scoreModeBalanced) {
                const nobleA2 = _personADayStem ? (NOBLE_BRANCHES[_personADayStem] || []) : [];
                const luA2    = _personADayStem ? (LU_BRANCH[_personADayStem] || null) : null;
                const hvA2    = _personAMonthBranch ? (HEAVEN_VIRTUE[_personAMonthBranch] || null) : null;
                const bvA2    = _personADayBranchXkdg ? (BRANCH_VIRTUE[_personADayBranchXkdg] || null) : null;
                const mvA2    = _personAMonthBranch ? (MONTH_VIRTUE[_personAMonthBranch] || null) : null;
                const tyA2    = _personADayStem ? (TIAN_YI[_personADayStem] || null) : null;
                const sA = calcHourScore(dGan, dZhi, hGanDirect, hZhiDirect, mGan, mZhi, yGan, eightChar.getYearZhi(), analysisItems, spirit, sS, sG, personAYear, pYStem, pYBranch, nobleA2, luA2, hvA2, bvA2, mvA2, tyA2, pillars);

                const nobleB2 = _personBDayStem ? (NOBLE_BRANCHES[_personBDayStem] || []) : [];
                const luB2    = _personBDayStem ? (LU_BRANCH[_personBDayStem] || null) : null;
                const hvB2    = _personBMonthBranch ? (HEAVEN_VIRTUE[_personBMonthBranch] || null) : null;
                const bvB2    = _personBDayBranchXkdg ? (BRANCH_VIRTUE[_personBDayBranchXkdg] || null) : null;
                const mvB2    = _personBMonthBranch ? (MONTH_VIRTUE[_personBMonthBranch] || null) : null;
                const tyB2    = _personBDayStem ? (TIAN_YI[_personBDayStem] || null) : null;
                const sB = calcHourScore(dGan, dZhi, hGanDirect, hZhiDirect, mGan, mZhi, yGan, eightChar.getYearZhi(), analysisItems, spirit, sS, sG, personBYear, pBYStem, pBYBranch, nobleB2, luB2, hvB2, bvB2, mvB2, tyB2, pillars);

                listScore = Math.min(sA, sB);
            } else {
                listScore = calcHourScore(dGan, dZhi, hGanDirect, hZhiDirect, mGan, mZhi, yGan, eightChar.getYearZhi(), analysisItems, spirit, sS, sG, activePersonYear, activePersonStem, activePersonBranch, pNobleA, pLuA, pHVA, pBVA, pMVA, pTYA, pillars);
            }

            // Nayin label for LIST view — reuse nayinResLV from filter step
            const nayinPersonHTMLLV = nayinResLV.personLabel && nayinResLV.personLabel.startsWith('Nayin ✦ Person')
                                    ? `<div style="font-size:9px;font-weight:bold;color:#0d47a1;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'✦ Nayin Person')">${nayinResLV.personLabel.replace('Nayin ✦ Person','✦ Nayin Person')}</div>`
                                    : nayinResLV.personLabel && nayinResLV.personLabel.startsWith('Nayin ✗ Person')
                                    ? `<div style="font-size:9px;font-weight:bold;color:#e65100;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'✗ Nayin Person')">${nayinResLV.personLabel.replace('Nayin ✗ Person','✗ Nayin Person')}</div>`
                                    : '';
            // Only show general Nayin if no Nayin Person label (avoid redundancy)
            const nayinHTMLLV = nayinPersonHTMLLV ? ''
                              : nayinResLV.label === 'Nayin Power' ? `<div style="font-size:9px;font-weight:bold;color:#1b5e20;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'Nayin Power')">☯ Nayin Power</div>`
                              : nayinResLV.label === 'Nayin'       ? `<div style="font-size:9px;font-weight:bold;color:#2e7d32;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'Nayin')">Nayin</div>`
                              : nayinResLV.label === 'Nayin Weak'  ? `<div style="font-size:9px;font-weight:bold;color:#b71c1c;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'Nayin Weak')">✕ Nayin Weak</div>`
                              : '';
            const keHTMLLV = keScoreLV > 0 ? `<div style="font-size:9px;font-weight:bold;color:#b8860b;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'Ke')">Ke+${keScoreLV}</div>` : '';
            const lvGreenBg = listScore >= 12 ? '#a5d6a7'   // rank-1 strong green
                            : listScore >= 9  ? '#c8e6c9'   // rank-2 high
                            : listScore >= 6  ? '#dcedc8'   // rank-3 medium
                            : listScore >= 4  ? '#f1f8e9'   // rank-4 low
                            : '#ffffff';                    // rank-5 lowest
            const lvGreenBorder = listScore >= 12 ? '#1b5e20'
                                : listScore >= 9  ? '#2e7d32'
                                : listScore >= 6  ? '#388e3c'
                                : listScore >= 4  ? '#558b2f'
                                : '#aaa';
            const rowStyle = hasFamilyLV
                ? `background:#fffb00;outline:3px solid #f9a825;outline-offset:-3px;border-left:4px solid #f9a825;`
                : `background:${lvGreenBg};border-left:4px solid ${lvGreenBorder};`;
            const dateNoblesLV = NOBLE_BRANCHES[dGan] || [];
            const isDateNobleLV = dateNoblesLV.includes(hZhiDirect);
            const nobleLabelLV = isDateNobleLV ? 'N' : '';
            const nobleHTMLMV = nobleLabelLV ? `<span style="color:#1a7a1a;font-weight:bold;font-size:11px;border:1px solid #1a7a1a;border-radius:3px;padding:0 3px;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'N')">${nobleLabelLV}</span>` : '';

            // Lu: date only (hour branch vs date day stem)
            const isDateLuLV = LU_BRANCH[dGan] === hZhiDirect;
            const luLabelLV = isDateLuLV ? 'L' : '';
            const luHTMLMV = luLabelLV ? `<span style="color:#0277bd;font-weight:bold;font-size:11px;border:1px solid #0277bd;border-radius:3px;padding:0 3px;background:#e1f5fe;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'L')">${luLabelLV}</span>` : '';

            // Branch Virtue: date only (hour branch vs date day branch BV)
            const dateMthZhi = eightChar.getMonthZhi();
            const isDateBVLV = BRANCH_VIRTUE[dZhi] === hZhiDirect;
            const bvHTMLMV   = isDateBVLV ? `<span style="color:#0277bd;font-weight:bold;font-size:11px;border:1px solid #0277bd;border-radius:3px;padding:0 3px;background:#e8eaf6;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'BV')">BV</span>` : '';
            const hvBranchLV = HEAVEN_VIRTUE[dateMthZhi] || null;
            const isDateHVLV = hvBranchLV === hZhiDirect;
            const hvHTMLMV   = isDateHVLV ? `<span style="color:#0277bd;font-weight:bold;font-size:11px;border:1px solid #0277bd;border-radius:3px;padding:0 3px;background:#e3f2fd;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'HV')">HV</span>` : '';

            // Tian Yi: date only (hour branch vs date day stem TY)
            const isDateTYLV = TIAN_YI[dGan] === hZhiDirect;
            const tyHTMLMV   = isDateTYLV ? `<span style="color:#1b5e20;font-weight:bold;font-size:11px;border:1px solid #1b5e20;border-radius:3px;padding:0 3px;background:#e8f5e9;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'TY')">TY</span>` : '';

            // Month Virtue: hour stem matches MV stem OR day branch matches MV branch
            const mvLV = MONTH_VIRTUE[dateMthZhi] || null;
            const isDateMVLV = mvLV ? (mvLV.stem === hGan || mvLV.branch === dZhi) : false;
            const mvHTMLMV   = isDateMVLV ? `<span style="color:#0277bd;font-weight:bold;font-size:11px;border:1px solid #0277bd;border-radius:3px;padding:0 3px;background:#f3e5f5;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'MV')">MV</span>` : '';

            const tombShaHTML = isTombShaLV ? `<span style="color:#d40000;font-weight:bold;font-size:10px;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'墓煞')">墓煞</span>` : '';

            // Purpose filter for LIST view — needs current hour's _currentDayAnalysis
            const purposeLV = getPurpose();
            let purposeIconLV = '';
            if (purposeLV) {
                const _savedForPurpose = _currentDayAnalysis;
                _currentDayAnalysis = {
                    items: analysisItems,
                    pillars: { hour: pillars.hour, day: pillars.day, month: pillars.month, year: pillars.year },
                    stems: { hour: hGan, day: dGan, month: mGan, year: yGan },
                    branches: { hour: hZhiDirect, day: dZhi, month: mZhi, year: yZhi }
                };
                purposeIconLV = checkPurpose(purposeLV, dGan, dZhi, blueItems, listScore, pillars, analysisItems, spirit)
                    ? PURPOSE_ICONS[purposeLV] : '';
                _currentDayAnalysis = _savedForPurpose;
            }
            if (purposeLV && !purposeIconLV && !isZiFirst) continue;

            const rowHtml = `<div onclick="loadDateIntoMain('${isoDate}',${h})"
                style="display:flex;align-items:center;padding:3px 8px;border-bottom:1px solid #eee;${rowStyle}cursor:pointer;">
                <div style="width:28px;flex-shrink:0;font-size:13px;font-weight:bold;color:#1b5e20;text-align:left;padding-left:2px;">${listScore}${purposeIconLV ? `<div style="font-size:14px;line-height:1;">${purposeIconLV}</div>` : ''}</div>
                <div style="width:80px;flex-shrink:0;font-size:11px;color:#333;">
                    <span style="color:#999;font-size:10px;">${hourTimeLabel}</span><br>
                    <span style="font-size:13px;font-weight:bold;color:#880e4f;">${hGanDirect}${hZhiDirect}</span>
                </div>
                <div style="width:30px;flex-shrink:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:2px;">
                    ${nobleHTMLMV}${luHTMLMV}${hvHTMLMV}${bvHTMLMV}${mvHTMLMV}${tyHTMLMV}
                </div>
                <div style="flex:1;display:flex;justify-content:flex-end;padding-right:20px;">
                <div style="display:grid;grid-template-columns:25px 25px 25px 25px;gap:0px;">
                    <div style="text-align:center;">
                        <div style="color:#d40000;font-weight:bold;font-size:13px;">${hDisp.qi}</div>
                        <div style="color:#0044cc;font-weight:bold;font-size:13px;">${hDisp.yun}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="color:#d40000;font-weight:bold;font-size:13px;">${dDisp.qi}</div>
                        <div style="color:#0044cc;font-weight:bold;font-size:13px;">${dDisp.yun}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="color:#d40000;font-weight:bold;font-size:13px;">${mDisp.qi}</div>
                        <div style="color:#0044cc;font-weight:bold;font-size:13px;">${mDisp.yun}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="color:#d40000;font-weight:bold;font-size:13px;">${yDisp.qi}</div>
                        <div style="color:#0044cc;font-weight:bold;font-size:13px;">${yDisp.yun}</div>
                    </div>
                </div>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;font-size:10px;gap:1px;text-align:right;">
                    ${isPositive ? `<div style="color:#1a7a1a;font-weight:bold;">${elNotes.filter(n => !famNotes.includes(n)).map(n=>`<span style="cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'${n}')">${n}</span>`).join(' · ')}</div>
                    ${hasFamily ? `<div style="color:#b8860b;font-weight:bold;">${famNotes.map(n=>`<span style="cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'${n}')">${n}</span>`).join(' · ')}</div>` : ''}` : ''}
                    ${[
                        isDateNobleLV ? 'Noble' : '',
                        isDateLuLV    ? 'Lu' : '',
                        isDateHVLV    ? 'HV' : '',
                        isDateBVLV    ? 'BV' : '',
                        isDateTYLV    ? 'TY' : ''
                    ].filter(Boolean).length ? `<div style="color:#0277bd;font-weight:bold;">${[
                        isDateNobleLV ? 'Noble' : '',
                        isDateLuLV    ? 'Lu' : '',
                        isDateHVLV    ? 'HV' : '',
                        isDateBVLV    ? 'BV' : '',
                        isDateTYLV    ? 'TY' : ''
                    ].filter(Boolean).join(' · ')}</div>` : ''}
                    ${spiritHTML}
                    ${tombShaHTML}
                    ${nayinHTMLLV}${nayinPersonHTMLLV}${keHTMLLV}
                </div>
            </div>`;
            dayRows.push({ score: listScore, html: rowHtml });
        }
        // Sort rows by score if toggle active, else keep chronological
        if (_listSortByScore) dayRows.sort((a,b) => b.score - a.score);
        dayRowsHtml = dayRows.map(r => r.html).join('');
        dayRows = [];
        // Only add header if day has matching rows
        if (dayRowsHtml) html += headerHtml + dayRowsHtml;
        dayRowsHtml = '';
    }

    const backBtn = window._calBackDate
        ? `<div style="margin-bottom:6px;padding:0 4px;">
            <button onclick="
                const s=document.getElementById('start-date');
                const d=document.getElementById('scan-days');
                if(s&&window._calBackFrom) s.value=window._calBackFrom;
                if(d&&window._calBackDays) d.value=window._calBackDays;
                window._calBackDate=null;
                setMode('cal');buildCalView();
            " style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #555;background:#fff;color:#555;cursor:pointer;">← Back to Calendar</button>
           </div>`
        : '';
    const sortToggleLV = `<div style="text-align:right;margin-bottom:4px;padding:0 4px;">
        <button onclick="toggleListSort()" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #1565c0;background:${_listSortByScore?'#1565c0':'#fff'};color:${_listSortByScore?'#fff':'#1565c0'};cursor:pointer;">
            ${_listSortByScore ? '⇅ Best First' : '⇅ Chronological'}
        </button>
    </div>`;
    const mv = document.getElementById('month-view');
    mv.innerHTML = (html ? backBtn + sortToggleLV + html : '') || '<div class="scan-empty">No data.</div>';
    mv.style.display = 'block';
    const srEl2 = document.getElementById('scan-results'); if(srEl2) srEl2.style.display = 'none';
}

// ── Filter ────────────────────────────────────────────────────
function shiftCalMonth(n) {
    const startSel = document.getElementById('scan-start');
    if (!startSel || !startSel.value) return;
    const d = new Date(startSel.value + 'T00:00:00');
    d.setMonth(d.getMonth() + n);
    // Format as YYYY-MM-DD
    const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    startSel.value = iso;
    buildCalView();
}

function showDayInList(isoDate) {
    // Save current FROM/DAYS to restore when going back
    const startSel = document.getElementById('start-date');
    const daysSel  = document.getElementById('scan-days');
    window._calBackDate   = isoDate;
    window._calBackFrom   = startSel ? startSel.value : null;
    window._calBackDays   = daysSel  ? daysSel.value  : null;
    // Switch to LIST mode showing only that single day
    setMode('list');
    if (startSel) startSel.value = isoDate;
    if (daysSel)  daysSel.value  = 1;
    buildMonthView();
    window.scrollTo({ top: document.getElementById('month-view').offsetTop - 60, behavior: 'smooth' });
}

function toggleListSort() {
    _listSortByScore = !_listSortByScore;
    buildMonthView();
}

function toggleFilter() {
    const panel = document.getElementById('filter-panel');
    const btn   = document.getElementById('btn-filter');
    const open  = panel.style.display === 'flex';
    panel.style.display = open ? 'none' : 'flex';
    btn.style.background = open ? '#555' : '#1565c0';
}

function toggleChip(el) {
    el.classList.toggle('active');
    // Re-run scan automatically if results exist
    if (_scanResults.length > 0 || document.getElementById('scan-results').style.display === 'block') {
        runAll();
    }
}

function getActiveFilters() {
    const chips = document.querySelectorAll('.filter-chip');
    const active = new Set();
    chips.forEach(c => { if (c.classList.contains('active')) active.add(c.dataset.filter); });
    return active;
}

function itemMatchesFilter(text, tag, filters) {
    if (tag === 'family')                   return filters.has('family');
    // Pure variants ONLY match their own chip
    if (text === 'Pure Qi')                 return filters.has('pure-qi-el') || filters.has('pure-qi-per');
    if (text === 'Pure Qi Elements')        return filters.has('pure-qi-el');
    if (text === 'Pure Qi Periods')         return filters.has('pure-qi-per');
    if (text === 'Pure Adding')             return filters.has('pure-adding');
    if (text === 'Pure Adding Elements')    return filters.has('pure-adding');
    if (text === 'Pure Adding Periods')     return filters.has('pure-adding');
    if (text === 'Pure Hetu')               return filters.has('pure-hetu');
    if (text === 'Pure Hetu Elements')      return filters.has('pure-hetu');
    if (text === 'Pure Hetu Periods')       return filters.has('pure-hetu');
    // Plain variants ONLY match their own chip
    if (text === 'Hetu')                    return filters.has('hetu-el') || filters.has('hetu-per');
    if (text === 'Hetu Elements')           return filters.has('hetu-el');
    if (text === 'Hetu Periods')            return filters.has('hetu-per');
    if (text === 'Adding')                  return filters.has('adding-el') || filters.has('adding-per');
    if (text === 'Adding Elements')         return filters.has('adding-el');
    if (text === 'Adding Periods')          return filters.has('adding-per');
    if (text.startsWith('Inverse Hex'))     return filters.has('inverse-hex');
    if (text === 'Nayin Power' || text === 'Nayin' || text === 'Nayin Weak') return filters.has('nayin');
    if (text === 'Ke')  return filters.has('ke-wealth');
    return false;
}

function getPersonYearData() {
    const birthDate = (document.getElementById('person-panel-a') && document.getElementById('person-panel-a').style.display !== 'none') ? document.getElementById('person-date').value : '';
    const birthTime = document.getElementById('person-time').value || '12:00';
    if (!birthDate) return null;
    const lon = parseFloat(document.getElementById('longitude').value);
    const utc = parseFloat(document.getElementById('utc-offset').value);
    const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);
    const base  = new Date(`${birthDate}T${birthTime}`);
    const solar = Solar.fromDate(new Date(base.getTime() + offsetMin * 60000));
    const ec    = solar.getLunar().getEightChar();
    const yStem = ec.getYearGan(), yBranch = ec.getYearZhi();
    const data  = getXkdgData(yStem, yBranch);
    if (!data) return null;
    const families = getJiaZiFamilies(yStem, yBranch);
    return { qi: data.qi, yun: data.yun, stem: yStem, branch: yBranch, families };
}

function personConnects(dayData, personYear, filters, blueItems) {
    if (!personYear || !dayData) return true;
    const dQi  = dayData.qi,  dYun = dayData.yun;
    const pQi  = personYear.qi, pYun = personYear.yun;

    const needsEl  = ['adding-el','hetu-el','pure-qi-el','pure-adding','pure-hetu'].some(f => filters.has(f));
    const needsPer = ['adding-per','hetu-per','pure-qi-per','pure-adding','pure-hetu'].some(f => filters.has(f));
    const needsFam = filters.has('family');

    // Element connection: day qi connects with person year qi
    const elConnects = needsEl ? (
        dQi === pQi ||
        isHetuPair(dQi, pQi) ||
        [5,10,15].includes(dQi + pQi)
    ) : false;

    // Period connection: day yun connects with person year yun
    const perConnects = needsPer ? (
        dYun === pYun ||
        isHetuPair(dYun, pYun) ||
        [5,10,15].includes(dYun + pYun)
    ) : false;

    // Family connection: full BL (same family) OR partial BL (person year connects with day qi/yun)
    const famConnects = needsFam ? (() => {
        if (!personYear) return false;
        const dateFamilies = blueItems
            .filter(i => i.tag === 'family')
            .map(i => i.text.replace(' Family', ''));
        // Full BL: person's year belongs to same family
        const fullBL = personYear.families && dateFamilies.some(f => personYear.families.includes(f));
        if (fullBL) return true;
        // Partial BL: person's year qi/yun connects with day qi/yun
        const partialBL = (
            dQi === pQi || isHetuPair(dQi, pQi) || [5,10,15].includes(dQi + pQi) ||
            dYun === pYun || isHetuPair(dYun, pYun) || [5,10,15].includes(dYun + pYun)
        );
        return partialBL;
    })() : false;

    if (needsEl  && !needsPer && !needsFam) return elConnects;
    if (needsPer && !needsEl  && !needsFam) return perConnects;
    if (needsFam && !needsEl  && !needsPer) return famConnects;
    return elConnects || perConnects || famConnects;
}

function blueItemsPassFilter(blueItems, filters, dayData, analysisItems) {
    if (filters.size === 0) return true;

    const nayinOnly = filters.size === 1 && filters.has('nayin');
    const keOnly    = filters.size === 1 && filters.has('ke-wealth');
    const hasNayinFilter = filters.has('nayin');
    const hasKeFilter    = filters.has('ke-wealth');
    const xkdgFilters = new Set([...filters].filter(f => f !== 'nayin' && f !== 'ke-wealth'));

    // Check Nayin filter — matches any Nayin label (Power, plain, Weak)
    if (hasNayinFilter) {
        const allItems = analysisItems || blueItems;
        const nayinPass = allItems.some(i => i.text === 'Nayin Power' || i.text === 'Nayin' || i.text === 'Nayin Weak');
        if (!nayinPass) return false;
        if (nayinOnly) return true;
    }

    // Check Ke filter — matches any hour with at least 1 Ke condition
    if (hasKeFilter) {
        const allItems = analysisItems || blueItems;
        const kePass = allItems.some(i => i.text === 'Ke');
        if (!kePass) return false;
        if (keOnly) return true;
    }

    // Check XKDG filters
    if (xkdgFilters.size > 0) {
        const relationItems = blueItems.filter(i =>
            i.tag === 'family' ||
            i.text.includes('Adding') || i.text.includes('Hetu') ||
            i.text.includes('Pure Qi') || i.text === 'Pure Qi' ||
            i.text.startsWith('Inverse Hex')
        );
        if (relationItems.length === 0) return false;
        const xkdgPass = [...xkdgFilters].every(f =>
            relationItems.some(i => itemMatchesFilter(i.text, i.tag, new Set([f])))
        );
        if (!xkdgPass) return false;
    }

    return true;
}

function setScanNow() {
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    document.getElementById('scan-start').value = localDate;
}

function setScanDays(n) {
    const el = document.getElementById('scan-days');
    el.value = Math.max(1, parseInt(el.value || 30) + n);
}

function setScanOffset(days) {
    const current = document.getElementById('scan-start').value;
    const base = current ? new Date(current + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + days);
    const d = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
    document.getElementById('scan-start').value = d;
}

function runScanner() {
    const birthDate  = (document.getElementById('person-panel-a') && document.getElementById('person-panel-a').style.display !== 'none') ? document.getElementById('person-date').value : '';
    const birthTime  = document.getElementById('person-time').value || '12:00';
    const birthDateB = (document.getElementById('person-panel-b') && document.getElementById('person-panel-b').style.display !== 'none') ? document.getElementById('person-date-b').value : '';
    const birthTimeB = document.getElementById('person-time-b').value || '12:00';
    const startDate = document.getElementById('scan-start').value;
    const days      = parseInt(document.getElementById('scan-days').value) || 30;
    const lon       = parseFloat(document.getElementById('longitude').value);
    const utc       = parseFloat(document.getElementById('utc-offset').value);

    if (!startDate) { alert('Please enter a start date.'); return; }

    // Get season function
    const stdMeridian = utc * 15;
    const offsetMin   = (lon - stdMeridian) * 4 - (_dstOn ? 60 : 0);

    // Person A year xkdg (optional)
    let pYStem = null, pYBranch = null, personAYear = null;
    let pDayStemA = null, pDayBranchA = null, pMthBranchA = null;
    let pNobleA = [], pLuA = null, pHVA = null, pBVA = null, pMVA = null, pTYA = null;
    if (birthDate) {
    const bBase   = new Date(`${birthDate}T${birthTime}`);
    const bSolar  = Solar.fromDate(new Date(bBase.getTime() + offsetMin * 60000));
    const bEC     = bSolar.getLunar().getEightChar();
    pYStem  = bEC.getYearGan(); pYBranch = bEC.getYearZhi();
    const pYData  = getXkdgData(pYStem, pYBranch);
    if (pYData) personAYear = { ...pYData, stem: pYStem, branch: pYBranch };

    // Person A day stem/branch and month branch for personal star calculations
    pDayStemA   = bEC.getDayGan();
    pDayBranchA = bEC.getDayZhi();
    pMthBranchA = bEC.getMonthZhi();
    pNobleA     = NOBLE_BRANCHES[pDayStemA] || [];
    pLuA        = LU_BRANCH[pDayStemA] || null;
    pHVA        = HEAVEN_VIRTUE[pMthBranchA] || null;
    pBVA        = BRANCH_VIRTUE[pDayBranchA] || null;
    pMVA        = MONTH_VIRTUE[pMthBranchA] || null;
    pTYA        = TIAN_YI[pDayStemA] || null;
    }

    // Person B (optional)
    let personBYear = null, pBYStem = null, pBYBranch = null;
    let pDayStemB = null, pDayBranchB = null, pMthBranchB = null;
    const depthB = parseInt(document.getElementById('person-pillars-b')?.value || '4');
    const panelBVisible = document.getElementById('person-panel-b') && document.getElementById('person-panel-b').style.display !== 'none';
    if (depthB === 1 && panelBVisible) {
        // Year-only: read directly from JiaZi dropdown
        const jzB = document.getElementById('person-year-b')?.value?.trim() || '';
        if (jzB.length >= 2) {
            pBYStem = jzB[0]; pBYBranch = jzB[1];
            const pBYData = getXkdgData(pBYStem, pBYBranch);
            if (pBYData) personBYear = { ...pBYData, stem: pBYStem, branch: pBYBranch };
        }
    } else if (birthDateB) {
        const bBaseB  = new Date(`${birthDateB}T${birthTimeB}`);
        const bSolarB = Solar.fromDate(new Date(bBaseB.getTime() + offsetMin * 60000));
        const bECB    = bSolarB.getLunar().getEightChar();
        pBYStem = bECB.getYearGan(); pBYBranch = bECB.getYearZhi();
        const pBYData = getXkdgData(pBYStem, pBYBranch);
        if (pBYData) personBYear = { ...pBYData, stem: pBYStem, branch: pBYBranch };
        pDayStemB   = bECB.getDayGan();
        pDayBranchB = bECB.getDayZhi();
        pMthBranchB = bECB.getMonthZhi();
    }

    // Active person for scoring: A if present, else B
    const activeYear   = personAYear   || personBYear   || null;
    const activeYStem  = pYStem        || pBYStem       || null;
    const activeYBranch= pYBranch      || pBYBranch     || null;
    const activeDayStem  = pDayStemA   || pDayStemB     || null;
    const activeMthBranch= pMthBranchA || pMthBranchB   || null;
    const activeDayBranch= pDayBranchA || pDayBranchB   || null;
    const activeNoble  = activeDayStem ? (NOBLE_BRANCHES[activeDayStem] || []) : [];
    const activeLu     = activeDayStem ? (LU_BRANCH[activeDayStem] || null) : null;
    const activeHV     = activeMthBranch ? (HEAVEN_VIRTUE[activeMthBranch] || null) : null;
    const activeBV     = activeDayBranch ? (BRANCH_VIRTUE[activeDayBranch] || null) : null;
    const activeMV     = activeMthBranch ? (MONTH_VIRTUE[activeMthBranch] || null) : null;
    const activeTY     = activeDayStem ? (TIAN_YI[activeDayStem] || null) : null;

    const results = [];
    const start = new Date(startDate + 'T00:00:00');

    try {
    for (let d = 0; d < days; d++) {
        const dayDate = new Date(start.getTime() + d * 86400000);
            const _isoDay = localISODate(dayDate);
            if (!isDateAllowed(_isoDay)) continue;

        for (let h = 0; h < 12; h++) {
            // Solar time for this hour slot
            const hourLocal = HOUR_STARTS[h];
            let baseDate = new Date(dayDate);
            if (hourLocal === 23) baseDate = new Date(dayDate.getTime() - 86400000);
            baseDate.setHours(hourLocal, 30, 0, 0); // midpoint of hour
            const solarDate = new Date(baseDate.getTime() + offsetMin * 60000);

            const solar     = Solar.fromDate(solarDate);
            const lunar     = solar.getLunar();
            const eightChar = lunar.getEightChar();

            // Get day xkdg (handle 23:00 edge case)
            let dGan = eightChar.getDayGan(), dZhi = eightChar.getDayZhi();
            if (solarDate.getHours() === 23) {
                const yest = Solar.fromDate(new Date(solarDate.getTime() - 3600000));
                dGan = yest.getLunar().getEightChar().getDayGan();
                dZhi = yest.getLunar().getEightChar().getDayZhi();
            }
            const dayData = getXkdgData(dGan, dZhi);
            if (!dayData) continue;
            const dayXkdg = { ...dayData, stem: dGan, branch: dZhi };

            // Hour pillar: always use dayDate at this hour (continuous 60 JiaZi cycle)
            let baseDateForHourBST = new Date(dayDate);
            baseDateForHourBST.setHours(hourLocal === 23 ? 23 : hourLocal, 30, 0, 0);
            const hourEC = Solar.fromDate(baseDateForHourBST).getLunar().getEightChar();
            const hGan = hourEC.getTimeGan();
            const hZhi = hourEC.getTimeZhi();
            const hZhiDirect = hZhi;
            const hourData = getXkdgData(hGan, hZhi);
            if (!hourData) {
                if (!getActiveFilters().has('nayin')) continue;
                // NaYin filter: check if hour has Nayin label before proceeding
                const yGanPre = eightChar.getYearGan(), yZhiPre = eightChar.getYearZhi();
                const mGanPre = eightChar.getMonthGan(), mZhiPre = eightChar.getMonthZhi();
                const nayinPre = analyzeNayin(dGan, dZhi, hGan, hZhi, mGanPre, mZhiPre, yGanPre, yZhiPre, null, null);
                if (!nayinPre.label) continue;
            }

            // Build all 4 pillars for analysis with dual hexagram resolution
            const yGan = eightChar.getYearGan(), yZhi = eightChar.getYearZhi();
            const mGan = eightChar.getMonthGan(), mZhi = eightChar.getMonthZhi();
            const pillars = buildResolvedPillars(yGan, yZhi, mGan, mZhi, dGan, dZhi, hGan, hZhi);
            if (!pillars.year.hex || !pillars.month.hex) {
                // No XKDG data — only show if Nayin Weak filter active and this hour is Nayin Weak
                if (!getActiveFilters().has('nayin')) continue;
                const nayinWkChk = analyzeNayin(dGan, dZhi, hGan, hZhi, mGan, mZhi, yGan, yZhi, pYStem, pYBranch, null, null);
                if (nayinWkChk.label !== 'Nayin Weak') continue;
                // Push a minimal result for this Nayin Weak hour
                const dd2 = dayDate.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
                results.push({
                    score: -2, scoreA: 0, scoreB: 0, sameTypeBonusA: 0, sameTypeBonusB: 0, qualityScore: 0,
                    spiritAuspicious: null, spiritLabel: '',
                    rawDate: dayDate.getTime() + h * 7200000,
                    isoDate: localISODate(dayDate), hourIndex: h,
                    date: dd2, hour: HOUR_ROMAN[h],
                    matchLabels: [], qualLabels: [], blueLabels: [],
                    hasTY: false, isDayTY: false, hasNoble: false,
                    nayinLabel: 'Nayin Weak', nayinPersonLabel: ''
                });
                continue;
            }

            // Get season
            const seasonInfo = getJieqiSeason(solarDate);
            const { strong: sStrong, growing: sGrowing } = seasonInfo;

            // Run analysis
            const { items: analysisItems } = analyzeXkdg(pillars, sStrong, sGrowing);

            // Step 1: Hour must have blue relations among 4 hexagrams
            const blueItems = analysisItems.filter(i => i.tag === 'blue' || i.tag === 'family');

            // Add TY and Noble to analysisItems for Purpose filter
            const tyBranch = TIAN_YI[dGan];
            if (tyBranch === hZhi) analysisItems.push({ text: 'Tian Yi (Date)', tag: 'ty' });
            const nobleBranches = NOBLE_BRANCHES[dGan] || [];
            if (nobleBranches.includes(hZhi)) analysisItems.push({ text: 'Noble (Date)', tag: 'noble' });
            // Add Nayin to analysisItems for filter
            const nayinResBST = analyzeNayin(dGan, dZhi, hGan, hZhi, mGan, mZhi, yGan, pillars.year.branch, activeYStem, activeYBranch, activeDayStem, activeDayBranch);
            if (nayinResBST.label) analysisItems.push({ text: nayinResBST.label, tag: nayinResBST.label === 'Nayin Power' ? 'nayin-power' : nayinResBST.label === 'Nayin Weak' ? 'nayin-weak' : 'nayin' });
            if (nayinResBST.personLabel) analysisItems.push({ text: nayinResBST.personLabel, tag: nayinResBST.personScore > 0 ? 'nayin-person-good' : 'nayin-person-bad' });
            // Ke Wealth filter
            const pDayStemBST = activeDayStem || null;
            const pDayQiBST   = (_personAPillars && _personAPillars.day) ? _personAPillars.day.qi : ((_personBPillars && _personBPillars.day) ? _personBPillars.day.qi : null);
            const keScoreBST  = calcKeWealthScore(dGan, dZhi, hGan, mGan, yGan, hourData ? hourData.qi : null, pillars.month ? pillars.month.qi : null, pillars.year ? pillars.year.qi : null, pillars.day ? pillars.day.qi : null, pDayStemBST, pDayQiBST);
            if (keScoreBST > 0) analysisItems.push({ text: 'Ke', tag: 'ke-wealth', keScore: keScoreBST });

            const activeFilters = getActiveFilters();
            const hasNayinFilterBST = activeFilters.has('nayin');
            const hasKeFilterBST    = activeFilters.has('ke-wealth');
            const isNayinWeakBST = nayinResBST.label === 'Nayin Weak';
            if (blueItems.length === 0 && !isNayinWeakBST && !getPurpose() && !hasNayinFilterBST && !hasKeFilterBST) continue;

            // Apply filter
            if (!blueItemsPassFilter(blueItems, activeFilters, { qi: pillars.day.qi, yun: pillars.day.yun }, analysisItems)) continue;

            // Detect which dimensions are active in the 4-hexagram relations
            const hasElementRelation = blueItems.some(i => i.text.includes('Element') || i.text.includes('Family') ||
                i.text === 'Hetu' || i.text === 'Pure Hetu' || i.text === 'Adding' || i.text === 'Pure Adding' || i.text === 'Pure Qi');
            const hasPeriodRelation  = blueItems.some(i => i.text.includes('Period') ||
                i.text === 'Hetu' || i.text === 'Pure Hetu' || i.text === 'Adding' || i.text === 'Pure Adding' || i.text === 'Pure Qi');

            // Step 2: Person must connect with day hexagram (skip if no person)
            const pQi = activeYear ? activeYear.qi : null;
            const pYun = activeYear ? activeYear.yun : null;
            const dQi = dayXkdg.qi,    dYun = dayXkdg.yun;

            // Personal connection: group setting must exist FIRST, then person connects into it
            const personMatchEl = activeYear && hasElementRelation && (
                isHetuPair(pQi, dQi)          ||
                [5,10,15].includes(pQi + dQi)  ||
                getJiaZiFamilies(activeYStem, activeYBranch).some(f => getJiaZiFamilies(dGan, dZhi).includes(f)) ||
                (blueItems.some(i => i.text === 'Pure Qi' || i.text === 'Pure Qi Elements') && pQi === dQi)
            );

            const personMatchPer = activeYear && hasPeriodRelation && (
                isHetuPair(pYun, dYun)          ||
                [5,10,15].includes(pYun + dYun)  ||
                (blueItems.some(i => i.text === 'Pure Qi' || i.text === 'Pure Qi Periods') && pYun === dYun)
            );

            // Personal connection: required only when person is loaded, uses active person
            const filtersActiveBST = activeFilters.size > 0;
            // If both persons active, require both connect; else require active person
            if (personAYear && personBYear) {
                if (!(personMatchEl || personMatchPer)) continue; // A must connect (A data used)
                // Also check B connects
                const pQiB = personBYear.qi, pYunB = personBYear.yun;
                const connectsB2 = isHetuPair(pQiB,dQi)||[5,10,15].includes(pQiB+dQi)||isHetuPair(pYunB,dYun)||[5,10,15].includes(pYunB+dYun)||getJiaZiFamilies(pBYStem,pBYBranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
                if (!connectsB2) continue;
            } else if (activeYear && !(personMatchEl || personMatchPer)) {
                continue;
            }


            const scoreA = (personMatchEl || personMatchPer) ?
                getMatchScore(personAYear, pYStem, pYBranch, dayXkdg, dGan, dZhi) : 1;

            // Condition A bonus: +2 if person's birthday connects via SAME relation type as the date
            const sameTypeBonusA = (personMatchEl || personMatchPer)
                ? getPersonSameTypeBonus(blueItems, personAYear, dayXkdg, pYStem, pYBranch, dGan, dZhi)
                : 0;

            // Person B
            let scoreB = 0;
            let sameTypeBonusB = 0;
            if (personBYear) {
                const bMatchEl = hasElementRelation && (
                    personBYear.qi === dayXkdg.qi ||
                    isHetuPair(personBYear.qi, dayXkdg.qi) ||
                    [5,10,15].includes(personBYear.qi + dayXkdg.qi) ||
                    getJiaZiFamilies(pBYStem, pBYBranch).some(f => getJiaZiFamilies(dGan, dZhi).includes(f))
                );
                const bMatchPer = hasPeriodRelation && (
                    personBYear.yun === dayXkdg.yun ||
                    isHetuPair(personBYear.yun, dayXkdg.yun) ||
                    [5,10,15].includes(personBYear.yun + dayXkdg.yun)
                );
                scoreB = (bMatchEl || bMatchPer) ?
                    getMatchScore(personBYear, pBYStem, pBYBranch, dayXkdg, dGan, dZhi) : 1;
                sameTypeBonusB = (bMatchEl || bMatchPer)
                    ? getPersonSameTypeBonus(blueItems, personBYear, dayXkdg, pBYStem, pBYBranch, dGan, dZhi)
                    : 0;
            }

            const qualityScore = getDateQualityScore(analysisItems);

            // Spirit penalty: bad spirit reduces score by one step if relation is Adding/Hetu only
            // (exempt: Pure Qi and Family matches)
            const HOUR_BRANCHES_SC = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
            const hZhiSC = HOUR_BRANCHES_SC[h];
            const hourSpirit = getSpiritForHour(dZhi, hZhiSC);
            const hasPureQiOrFamily = blueItems.some(i => i.text.includes('Pure Qi') || i.tag === 'family');

            // Kong Wang check: skip void unless Pure Qi, Family, or Nayin Weak
            if (!hasPureQiOrFamily && !isNayinWeakBST && isKongWangVoid(hZhiSC, dGan, dZhi, sStrong, sGrowing)) continue;

            // Score: when both active use A Priority or Balanced based on toggle
            let totalScore;
            if (personAYear && personBYear && _scoreModeBalanced) {
                const nobleA = pDayStemA ? (NOBLE_BRANCHES[pDayStemA] || []) : [];
                const luA    = pDayStemA ? (LU_BRANCH[pDayStemA] || null) : null;
                const hvA    = pMthBranchA ? (HEAVEN_VIRTUE[pMthBranchA] || null) : null;
                const bvA    = pDayBranchA ? (BRANCH_VIRTUE[pDayBranchA] || null) : null;
                const mvA    = pMthBranchA ? (MONTH_VIRTUE[pMthBranchA] || null) : null;
                const tyA    = pDayStemA ? (TIAN_YI[pDayStemA] || null) : null;
                const scoreForA = calcHourScore(dGan, dZhi, hGan, hZhiSC, mGan, mZhi, yGan, pillars.year.branch, analysisItems, hourSpirit, sStrong, sGrowing, personAYear, pYStem, pYBranch, nobleA, luA, hvA, bvA, mvA, tyA, pillars);

                const nobleB = pDayStemB ? (NOBLE_BRANCHES[pDayStemB] || []) : [];
                const luB    = pDayStemB ? (LU_BRANCH[pDayStemB] || null) : null;
                const hvB    = pMthBranchB ? (HEAVEN_VIRTUE[pMthBranchB] || null) : null;
                const bvB    = pDayBranchB ? (BRANCH_VIRTUE[pDayBranchB] || null) : null;
                const mvB    = pMthBranchB ? (MONTH_VIRTUE[pMthBranchB] || null) : null;
                const tyB    = pDayStemB ? (TIAN_YI[pDayStemB] || null) : null;
                const scoreForB = calcHourScore(dGan, dZhi, hGan, hZhiSC, mGan, mZhi, yGan, pillars.year.branch, analysisItems, hourSpirit, sStrong, sGrowing, personBYear, pBYStem, pBYBranch, nobleB, luB, hvB, bvB, mvB, tyB, pillars);

                totalScore = Math.min(scoreForA, scoreForB);
            } else {
                totalScore = calcHourScore(dGan, dZhi, hGan, hZhiSC, mGan, mZhi, yGan, pillars.year.branch, analysisItems, hourSpirit, sStrong, sGrowing, activeYear, activeYStem, activeYBranch, activeNoble, activeLu, activeHV, activeBV, activeMV, activeTY, pillars);
            }
            const matchLabels = getMatchLabels(activeYear, activeYStem, activeYBranch, dayXkdg, dGan, dZhi, _personAPillars || _personBPillars, activeDayStem, activeDayBranch);
            const qualLabels  = analysisItems.filter(i => ['Powerful','Energetic','Very Weak','Very Timely','Timely','Timely at Birth'].includes(i.text)).map(i => i.text);
            const spiritLabel = hourSpirit ? `${hourSpirit.en}` : '';
            const nayinLabel  = nayinResBST.label || '';
            const nayinPersonLabel = nayinResBST.personLabel || '';
            const dd = dayDate.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

            if (!checkPurpose(getPurpose(), dGan, dZhi, blueItems, totalScore, pillars, analysisItems, hourSpirit)) continue;

            const activeFiltersBS = getActiveFilters();
            const blueLabels = blueItems
                .filter(i => activeFiltersBS.size === 0 || itemMatchesFilter(i.text, i.tag, activeFiltersBS))
                .map(i => i.text)
                .filter(t => t && !t.includes('undefined'));
            results.push({
                score: totalScore,
                scoreA,
                scoreB,
                sameTypeBonusA,
                sameTypeBonusB,
                qualityScore,
                spiritAuspicious: hourSpirit ? hourSpirit.auspicious : null,
                spiritLabel,
                rawDate: dayDate.getTime() + h * 7200000,
                isoDate: localISODate(dayDate),
                hourIndex: h,
                date: dd,
                hour: HOUR_ROMAN[h],
                matchLabels,
                qualLabels,
                blueLabels,
                hasTY:    analysisItems.some(i => i.tag==='ty'||i.tag==='ty-both'),
                isDayTY:  (() => { const pA = _personADayStem, pB = _personBDayStem; return (pA && TIAN_YI[pA]===dZhi)||(pB && TIAN_YI[pB]===dZhi); })(),
                hasNoble: analysisItems.some(i => i.tag==='noble'||i.tag==='noble-both'),
                nayinLabel,
                nayinPersonLabel,
                wealthBonus: window._lastWealthBonus || 0,
                keScore: keScoreBST
            });
        }
    }

    } catch(scanErr) {
        alert('Scanner error: ' + scanErr.message + '\n' + scanErr.stack);
        return;
    }


    if (results.length === 0) {
        alert('No results found. Try removing filter chips or extending the scan range.');
        return;
    }

    // Sort by active chip metric first, then score
    function sortResults_chip(res) {
        const af = getActiveFilters();
        const nayinOrder = { 'Nayin Power': 3, 'Nayin': 2, 'Nayin Weak': 1 };
        if (af.has('ke-wealth')) {
            res.sort((a,b) => (b.keScore||0) - (a.keScore||0) || b.score - a.score);
        } else if (af.has('nayin')) {
            res.sort((a,b) => (nayinOrder[b.nayinLabel]||0) - (nayinOrder[a.nayinLabel]||0) || b.score - a.score);
        } else {
            // For all other chips: sort by score (chip filter already ensures relevance)
            res.sort((a,b) => b.score - a.score);
        }
        return res;
    }

    window._chipSortMode = true; // default: chip sort
    sortResults_chip(results);
    _scanResults = results;

    const container = document.getElementById('scan-results');
    if (container) container.style.display = 'block';
    const sd = document.getElementById('sort-date');
    if (sd) sd.style.display = 'inline-block';

    // Auto-apply BOTH mode when Person B is active
    const mode = personBYear ? 'both' : 'score';
    renderScanResults(results, mode);
}


// ── License System ────────────────────────────────────────────
// Codes: { pin, tier (1/2/4/0=unlimited), expiry (YYYY-MM-DD or null) }
// Obfuscated as base64
// SHA-256 hashed PINs — original PINs are NOT stored in source code
const _HASHED_CODES = [
    { h: '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c', t: 1, e: '2027-01-28' },
    { h: 'edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9', t: 2, e: '2027-01-28' },
    { h: '318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69', t: 4, e: '2028-01-27' },
    { h: '888df25ae35772424a560c7152a1de794440e0ea5cfee62828333a456a506e05', t: 0, e: null },
    { h: 'bf1889006d18a1b40d0791c50436d7eaa119bb3456e3f6300c17127ae10e7715', t: 0, e: null },
    { h: 'b0ff7bdc481ed43adf5168e51d73264887136b603fd0fb372530a689e15a29e7', t: 0, e: null }, // Chee
    { h: '1b8c0f70737fd82ae7f9a852851003ce7a567ed20cf8674d1781c22bb5d8523d', t: 0, e: null },
];

async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Chinese solar year boundaries (Li Chun 立春 ~ Feb 4)
const CHINESE_YEAR_STARTS = [
    { year: '甲辰', start: '2024-02-04', end: '2025-02-03' },
    { year: '乙巳', start: '2025-02-04', end: '2026-02-03' },
    { year: '丙午', start: '2026-02-04', end: '2027-02-03' },
    { year: '丁未', start: '2027-02-04', end: '2028-02-03' },
    { year: '戊申', start: '2028-02-04', end: '2029-02-03' },
    { year: '己酉', start: '2029-02-04', end: '2030-02-03' },
    { year: '庚戌', start: '2030-02-04', end: '2031-02-03' },
];

function getCurrentChineseYearIndex() {
    const today = new Date().toISOString().split('T')[0];
    return CHINESE_YEAR_STARTS.findIndex(y => today >= y.start && today <= y.end);
}

function getAllowedDateRange(tier) {
    const idx = getCurrentChineseYearIndex();
    if (idx === -1) return null;
    if (tier === 0) return null; // unlimited
    const endIdx = Math.min(idx + tier - 1, CHINESE_YEAR_STARTS.length - 1);
    return {
        start: CHINESE_YEAR_STARTS[idx].start,
        end:   CHINESE_YEAR_STARTS[endIdx].end
    };
}

function checkLicense() {
    const stored = localStorage.getItem('xkdg_license');
    if (!stored) { showLicenseOverlay(); return; }
    try {
        const lic = JSON.parse(stored);
        if (lic.expiry) {
            const today = new Date().toISOString().split('T')[0];
            if (today > lic.expiry) {
                showLicenseBar(`⚠ License expired ${lic.expiry} — access limited to licensed year range`, '#fff3e0', '#e65100');
                applyTierRestrictions(lic.tier);
                setNow();
                return;
            }
        }
        const tierLabel = lic.tier === 0 ? 'Unlimited' : `${lic.tier}-Year`;
        const exp = lic.expiry ? ` · Expires ${lic.expiry}` : '';
        showLicenseBar(`✓ Licensed: ${tierLabel}${exp}`, '#e8f5e9', '#2e7d32');
        applyTierRestrictions(lic.tier);
        setNow();
    } catch(e) { showLicenseOverlay(); }
}

function applyTierRestrictions(tier) {
    window._licenseTier = tier;
    const range = getAllowedDateRange(tier);
    window._licenseRange = range;
    if (range) {
        // Set FROM date constraints
        const startInput = document.getElementById('scan-start');
        if (startInput) {
            startInput.min = range.start;
            startInput.max = range.end;
            // Clamp current value
            if (startInput.value < range.start) startInput.value = range.start;
            if (startInput.value > range.end)   startInput.value = range.end;
        }
    }
}

function isDateAllowed(isoDate) {
    const range = window._licenseRange;
    if (!range) return true; // unlimited
    return isoDate >= range.start && isoDate <= range.end;
}

function showLicenseOverlay() {
    document.getElementById('license-overlay').style.display = 'flex';
}

function showLicenseBar(msg, bg, color) {
    const bar = document.getElementById('license-bar');
    if (bar) {
        bar.style.display = 'block';
        bar.style.background = bg;
        bar.style.color = color;
        bar.textContent = msg;
        const mc = document.getElementById('main-container');
        if (mc) mc.style.marginTop = '26px';
    }
}

async function submitPin() {
    const pin = document.getElementById('pin-input').value.trim();
    if (!pin) return;

    const btn = document.querySelector('#license-overlay button');
    const errorEl = document.getElementById('pin-error');
    btn.textContent = 'Checking...';
    btn.disabled = true;
    errorEl.textContent = '';

    let validated = false;
    let tier = 0;
    let expiry = null;

    // Try Netlify server validation first
    try {
        const response = await fetch('/.netlify/functions/validate-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.valid) {
                validated = true;
                tier = data.tier;
                expiry = data.expiry;
            } else {
                errorEl.textContent = data.error || 'Invalid PIN. Please try again.';
                btn.textContent = 'UNLOCK';
                btn.disabled = false;
                return;
            }
        }
    } catch (err) {
        // Netlify not available — fall back to local SHA-256
        console.log('Server unavailable, using local validation');
    }

    // Fallback: SHA-256 local check
    if (!validated) {
        const hashed = await hashPin(pin);
        const match = _HASHED_CODES.find(c => c.h === hashed);
        if (match) {
            validated = true;
            tier = match.t;
            expiry = match.e;
        }
    }

    if (validated) {
        localStorage.setItem('xkdg_license', JSON.stringify({ tier, expiry }));
        document.getElementById('license-overlay').style.display = 'none';
        checkLicense();
        setNow();
    } else {
        errorEl.textContent = 'Invalid PIN. Please try again.';
    }

    btn.textContent = 'UNLOCK';
    btn.disabled = false;
}

// Enter key support
document.addEventListener('DOMContentLoaded', () => {
    const pinInput = document.getElementById('pin-input');
    if (pinInput) pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitPin(); });
});


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
  return {idx, hexNum, startDeg, endDeg: (startDeg + 5.625) % 360, ...fsQiYun(hexNum)};
}

// Build all 64 slots once
const FS_SLOTS = FS_SEQ.map((h, i) => {
  const qy = fsQiYun(h);
  return {idx: i, hexNum: h, qi: qy.qi, yun: qy.yun,
          startDeg: 180 + i*5.625, endDeg: 180 + (i+1)*5.625,
          centerDeg: 180 + i*5.625 + 2.8125};
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
          <input type="number" id="fs-water" min="0" max="360" step="0.1" placeholder="optional"
                 style="width:100%;padding:6px;border:1px solid #4a9ead;border-radius:4px;font-size:14px;"
                 oninput="fsRedraw()">
        </div>
      </div>

      <div id="fs-canvas-wrap" style="position:relative;width:100%;aspect-ratio:1100/1130;max-width:480px;margin:0 auto 10px;">
        <canvas id="fs-canvas" width="1100" height="1130" style="width:100%;height:100%;"></canvas>
      </div>

      <div id="fs-legend" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px;font-size:11px;"></div>

      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button onclick="fsFindDates()" style="flex:1;background:#1565c0;color:#fff;border:none;border-radius:6px;padding:10px;font-weight:bold;font-size:13px;cursor:pointer;">🔎 FIND MATCHING DATES</button>
      </div>

      <div id="fs-detail" style="font-size:12px;color:#333;"></div>
      <div id="fs-pairs-table" style="margin-top:8px;"></div>
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
    FS_LUOPAN_IMG.src = "data:image/jpeg;base64,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";
  }
}

function fsTogglePeriod(){
  FS_POST_2044 = !FS_POST_2044;
  document.getElementById('fs-period-btn').textContent = FS_POST_2044 ? 'POST 2044' : 'NOW → 2044';
  document.getElementById('fs-period-lbl').textContent = FS_POST_2044 ? 'Zheng Shen = 1-4' : 'Zheng Shen = 6-9';
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
    const fc = (p.facing.startDeg + 2.8125);
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
  ctx.fillStyle = '#f5ead8'; ctx.fillRect(0,0,W,H);

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
  function drawArrow(deg, color, label){
    const a = (deg - 270) * Math.PI/180;
    const tipR = outerR + 75;
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
      const labelR = tipR + 30;
      ctx.save();
      ctx.font = 'bold 16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4;
      ctx.strokeText(label, cx+Math.cos(a)*labelR, cy+Math.sin(a)*labelR);
      ctx.fillText(label,   cx+Math.cos(a)*labelR, cy+Math.sin(a)*labelR);
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

  // Render detail panel
  fsRenderDetail(fInput, wInput, facingSlot, waters, facings, dctx);
  fsRenderPairsTable();
}

function fsRenderDetail(fInput, wInput, facingSlot, waters, facings, dctx){
  const box = document.getElementById('fs-detail');
  if (!box) return;
  let html = '';
  if (dctx.dayHex){
    html += `<div style="background:#f0f0f0;padding:8px;border-radius:4px;margin-bottom:6px;">`;
    html += `<strong>Compatible facings for this date:</strong> ${facings.size} of 64 hex slots`;
    html += `</div>`;
  }
  if (fInput){
    const settings = fsGetDateSettings();
    const lbls = dctx.dayHex
      ? hexDateConnectionLabels(fInput.hexNum, fInput.qi, fInput.yun, dctx.dayHex, dctx.dayQi, dctx.dayYun, settings)
      : [];
    const isZS = fsIsZhengShen(fInput.yun);
    html += `<div style="background:#fff8e1;border:1px solid #c9a84c;padding:8px;border-radius:4px;margin-bottom:6px;">`;
    html += `<strong>Facing:</strong> hex ${fInput.hexNum}, qi ${fInput.qi}, yun ${fInput.yun} `;
    html += isZS ? '<span style="color:#c0392b;font-weight:bold;">[正神 ✓]</span>' : '<span style="color:#888;">[NOT Zheng Shen ✗]</span>';
    html += `<br>vs Day: ${lbls.length ? lbls.join(' · ') : '<span style="color:#888;">no connection</span>'}`;
    if (dctx.pAHex){
      const lA = hexConnectionLabels(fInput.hexNum, fInput.qi, fInput.yun, dctx.pAHex, dctx.pAQi, dctx.pAYun);
      html += `<br>vs Person A: ${lA.length ? lA.join(' · ') : '<span style="color:#888;">no direct connection</span>'}`;
    }
    if (dctx.pBHex){
      const lB = hexConnectionLabels(fInput.hexNum, fInput.qi, fInput.yun, dctx.pBHex, dctx.pBQi, dctx.pBYun);
      html += `<br>vs Person B: ${lB.length ? lB.join(' · ') : '<span style="color:#888;">no direct connection</span>'}`;
    }
    html += `</div>`;
    html += `<div style="font-size:11px;color:#666;margin-bottom:6px;">Compatible waters for this facing: ${waters.size} of 64</div>`;
  }
  if (wInput){
    const fSlot = facingSlot;
    const isLS = fsIsLingShen(wInput.yun);
    const lbls = fSlot ? hexConnectionLabels(wInput.hexNum, wInput.qi, wInput.yun, fSlot.hexNum, fSlot.qi, fSlot.yun) : [];
    const dist = fSlot ? fsAngularDist(fSlot.startDeg + 2.8125, wInput.centerDeg) : null;
    const distOk = dist === null || dist <= FS_WATER_MAX_DEG;
    const valid = isLS && distOk && lbls.length > 0;
    html += `<div style="background:${valid?'#e8f5e9':'#ffebee'};border:1px solid ${valid?'#0a8c2c':'#c0392b'};padding:8px;border-radius:4px;margin-bottom:6px;">`;
    html += `<strong>Water:</strong> hex ${wInput.hexNum}, qi ${wInput.qi}, yun ${wInput.yun} `;
    html += isLS ? '<span style="color:#1565c0;font-weight:bold;">[零神 ✓]</span>' : '<span style="color:#c0392b;font-weight:bold;">[NOT Ling Shen ✗]</span>';
    if (dist !== null){
      html += `<br>Distance from facing: ${dist.toFixed(1)}° `;
      html += distOk ? '<span style="color:#0a8c2c;font-weight:bold;">[within ±'+FS_WATER_MAX_DEG+'° ✓]</span>'
                     : '<span style="color:#c0392b;font-weight:bold;">[exceeds ±'+FS_WATER_MAX_DEG+'° ✗]</span>';
    }
    html += `<br>vs Facing: ${lbls.length ? lbls.join(' · ') : '<span style="color:#888;">no connection</span>'}`;
    html += `<br><strong>Verdict: ${valid ? '✓ COMPATIBLE' : '✗ NOT COMPATIBLE'}</strong>`;
    html += `</div>`;
  }
  box.innerHTML = html;
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
  if (!isNaN(wDeg)){
    const wSlot = fsSlotForDeg(wDeg);
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
  // Stash the facing for the date scanner to filter on
  window._fsFilterFacing = { hex: fSlot.hexNum, qi: fSlot.qi, yun: fSlot.yun };
  alert('Facing filter active. Switching to BEST mode — re-run your date scan.\\n\\nFiltering for dates whose day pillar connects to facing hex '+fSlot.hexNum+' (qi '+fSlot.qi+', yun '+fSlot.yun+').');
  setMode('dates');
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
    const utcGuess   = Math.round(lon / 15);
    const utcClamped = Math.max(-12, Math.min(14, utcGuess));
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
    '    max-width: 600px !important;',
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
    const box = document.getElementById('fs-pairs-table');
    if (!box) return;
    const pairs = (typeof fsComputePairs === 'function') ? fsComputePairs() : [];
    if (!pairs.length){
      const c = (typeof fsGetCurrentContext === 'function') ? fsGetCurrentContext() : {};
      box.innerHTML = c.dayHex
        ? '<div style="text-align:center;color:#888;padding:10px;font-size:12px;">No facing/water combinations available for this date.</div>'
        : '';
      return;
    }
    const fIn = parseFloat(document.getElementById('fs-facing').value);
    const wIn = parseFloat(document.getElementById('fs-water').value);
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
    html += '<thead><tr style="background:#fff8e1;">';
    html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#c0392b;width:15%;">Facing 正神</th>';
    html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #c9a84c;color:#1565c0;width:15%;">Water 零神</th>';
    html += '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #c9a84c;color:#8a6a1f;width:33%;">XKDG Relations</th>';
    html += '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #c9a84c;color:#666;width:29%;">Pure YY</th>';
    html += '<th style="text-align:center;padding:6px;border-bottom:1px solid #c9a84c;color:#8a6a1f;width:8%;">Score</th>';
    html += '</tr></thead><tbody>';

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

      // Facing (vertical layout: qi-red, glyph, yun-blue, deg, hexN)
      html += '<td style="padding:6px 4px;text-align:center;vertical-align:middle;">' + yyMarker;
      html += '<div style="font-size:16px;color:#c0392b;font-weight:bold;line-height:1.1;">' + f.qi + '</div>';
      html += '<div style="font-size:38px;line-height:1;margin:1px 0;font-weight:' + (p._famF ? 'bold' : 'normal') + ';">' + fsHexGlyph(f.hexNum) + '</div>';
      html += '<div style="font-size:16px;color:#1565c0;font-weight:bold;line-height:1.1;">' + f.yun + '</div>';
      html += '<div style="font-size:11px;color:#666;margin-top:3px;">' + fc.toFixed(1) + '° <i>' + fPol + '</i></div>';
      html += '<div style="font-size:10px;color:#aaa;">Hex ' + f.hexNum + '</div>';
      html += '</td>';

      // Water (vertical layout: qi-red, glyph, yun-blue, deg, hexN)
      html += '<td style="padding:6px 4px;text-align:center;vertical-align:middle;">';
      html += '<div style="font-size:16px;color:#c0392b;font-weight:bold;line-height:1.1;">' + w.qi + '</div>';
      html += '<div style="font-size:38px;line-height:1;margin:1px 0;font-weight:' + (p._famW ? 'bold' : 'normal') + ';">' + fsHexGlyph(w.hexNum) + '</div>';
      html += '<div style="font-size:16px;color:#1565c0;font-weight:bold;line-height:1.1;">' + w.yun + '</div>';
      html += '<div style="font-size:11px;color:#666;margin-top:3px;">' + wc.toFixed(1) + '° <i>' + wPol + '</i></div>';
      html += '<div style="font-size:10px;color:#aaa;">Hex ' + w.hexNum + '</div>';
      html += '</td>';

      // XKDG Relations: red + blue lines stacked tight, pulled UP to align with glyph center
      html += '<td style="padding:6px 8px;vertical-align:middle;">';
      // Wrapper with negative margin-top to lift the whole block up
      html += '<div style="margin-top:-32px;">';
      html += '<div style="font-size:13px;font-weight:bold;color:#c0392b;line-height:1.3;">';
      html += elemRels.length ? elemRels.join(' · ') : '\u00A0';
      html += '</div>';
      html += '<div style="font-size:13px;font-weight:bold;color:#1565c0;line-height:1.3;">';
      html += yunRels.length ? yunRels.join(' · ') : '\u00A0';
      html += '</div>';
      html += '</div>';
      html += '</td>';

      // Pure YY (empty for now, wider space)
      html += '<td style="padding:8px;font-size:12px;line-height:1.5;vertical-align:middle;"></td>';

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


window.onload = () => {
    try { renderArchive('A'); } catch(e) { console.error('archiveA:', e.message); }
    try { renderArchive('B'); } catch(e) { console.error('archiveB:', e.message); }
    checkLicense();
};

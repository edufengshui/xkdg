// ─────────────────────────────────────────────
//  XKDG DATA (from xkdg_hex.js)
// ─────────────────────────────────────────────
const XKDG_TABLE = {
    '甲子': { hex: 2,  qi: 1, yun: 8, alt: { hex: 24, qi: 1, yun: 1 } }, '乙丑': { hex: 21, qi: 3, yun: 6 },
    '丙寅': { hex: 37, qi: 2, yun: 4 }, '丁卯': { hex: 41, qi: 6, yun: 9 },
    '戊辰': { hex: 10, qi: 9, yun: 6 }, '己巳': { hex: 34, qi: 8, yun: 2 },
    '庚午': { hex: 32, qi: 8, yun: 9 }, '辛未': { hex: 6,  qi: 9, yun: 3 },
    '壬申': { hex: 7,  qi: 1, yun: 7 }, '癸酉': { hex: 53, qi: 2, yun: 7 },
    '甲戌': { hex: 39, qi: 7, yun: 2 }, '乙亥': { hex: 35, qi: 3, yun: 3 },
    '丙子': { hex: 27, qi: 6, yun: 3 }, '丁丑': { hex: 17, qi: 4, yun: 7 },
    '戊寅': { hex: 55, qi: 8, yun: 6 }, '己卯': { hex: 60, qi: 7, yun: 8 },
    '庚辰': { hex: 11, qi: 1, yun: 9 }, '辛巳': { hex: 14, qi: 3, yun: 7 },
    '壬午': { hex: 57, qi: 2, yun: 1 }, '癸未': { hex: 47, qi: 4, yun: 8 },
    '甲申': { hex: 64, qi: 3, yun: 9 }, '乙酉': { hex: 33, qi: 9, yun: 4 },
    '丙戌': { hex: 52, qi: 6, yun: 1 }, '丁亥': { hex: 16, qi: 8, yun: 8 },
    '戊子': { hex: 3,  qi: 7, yun: 4 }, '己丑': { hex: 25, qi: 9, yun: 2 },
    '庚寅': { hex: 30, qi: 3, yun: 1, alt: { hex: 49, qi: 4, yun: 2 } }, '辛卯': { hex: 61, qi: 2, yun: 3 },
    '壬辰': { hex: 26, qi: 6, yun: 4 }, '癸巳': { hex: 43, qi: 4, yun: 6 },
    '甲午': { hex: 1,  qi: 9, yun: 1, alt: { hex: 44, qi: 9, yun: 8 } }, '乙未': { hex: 48, qi: 7, yun: 6 },
    '丙申': { hex: 40, qi: 8, yun: 4 }, '丁酉': { hex: 31, qi: 4, yun: 9 },
    '戊戌': { hex: 15, qi: 1, yun: 6 }, '己亥': { hex: 20, qi: 2, yun: 2 },
    '庚子': { hex: 42, qi: 2, yun: 9 }, '辛丑': { hex: 36, qi: 1, yun: 3 },
    '壬寅': { hex: 13, qi: 9, yun: 7 }, '癸卯': { hex: 54, qi: 8, yun: 7 },
    '甲辰': { hex: 38, qi: 3, yun: 2 }, '乙巳': { hex: 5,  qi: 7, yun: 3 },
    '丙午': { hex: 28, qi: 4, yun: 3 }, '丁未': { hex: 18, qi: 6, yun: 7 },
    '戊申': { hex: 59, qi: 2, yun: 6 }, '己酉': { hex: 56, qi: 3, yun: 8 },
    '庚戌': { hex: 12, qi: 9, yun: 9 }, '辛亥': { hex: 8,  qi: 7, yun: 7 },
    '壬子': { hex: 51, qi: 8, yun: 1 }, '癸丑': { hex: 22, qi: 6, yun: 8 },
    '甲寅': { hex: 63, qi: 7, yun: 9 }, '乙卯': { hex: 19, qi: 1, yun: 4 },
    '丙辰': { hex: 58, qi: 4, yun: 1 }, '丁巳': { hex: 9,  qi: 2, yun: 8 },
    '戊午': { hex: 50, qi: 3, yun: 4 }, '己未': { hex: 46, qi: 1, yun: 2 },
    '庚申': { hex: 29, qi: 7, yun: 1, alt: { hex: 4, qi: 6, yun: 2 } }, '辛酉': { hex: 62, qi: 8, yun: 3 },
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
            const tag = (yearGood && dayGood) ? ' Day+Year' : yearGood ? ' Year' : ' Day';
            personLabel = 'Nayin ✦ Person' + tag;
            personScore = 3;
        } else if (yearBad || dayBad) {
            const tag = (yearBad && dayBad) ? ' Day+Year' : yearBad ? ' Year' : ' Day';
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

// ── Wu Ji Du Tian 戊己都天 ────────────────────────────────────────
// Sha calculated from YEAR STEM. Active when BOTH day branch and hour branch
// are among the WJDT branches for that year stem.
// Each stem pair (甲己, 乙庚, 丙辛, 丁壬, 戊癸) shares the same branches.
const WJDT_BRANCHES = {
  '甲': ['辰', '巳'],
  '己': ['辰', '巳'],
  '乙': ['子', '寅', '丑', '卯'],
  '庚': ['子', '寅', '丑', '卯'],
  '丙': ['戌', '亥'],
  '辛': ['戌', '亥'],
  '丁': ['申', '酉'],
  '壬': ['申', '酉'],
  '戊': ['午', '未'],
  '癸': ['午', '未']
};

function getWJDTBranches(yearStem) {
    return WJDT_BRANCHES[yearStem] || [];
}

function isWJDT(yearStem, dayBranch, hourBranch) {
    const branches = WJDT_BRANCHES[yearStem];
    if (!branches) return false;
    return branches.includes(dayBranch) && branches.includes(hourBranch);
}

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

// ── Unified "negative score" for Negatives filter ──────────────────────
// Higher = worse. Score > 0 means hour is meaningfully negative.
// Used by LIST, BEST, CAL views when Negatives chip is active.
function calcNegativeScore(opts) {
    const { dGan, dZhi, hGan, hZhi, mGan, mZhi, yGan, yZhi,
            analysisItems, dayClashType,
            seasonStrong, seasonGrowing,
            nayinLabel, nayinPersonScore } = opts;
    let score = 0;
    // ── Negative factors (push score UP) ──
    const spirit = getSpiritForHour(dZhi, hZhi);
    if (spirit && !spirit.auspicious) score += 3;
    if (dayClashType === 'clash-year')              score += 3;
    else if (dayClashType === 'clash-month-stem')   score += 2;
    else if (dayClashType === 'clash-month-branch') score += 1;
    if (isTombSha(hZhi, dGan, seasonStrong, seasonGrowing)) score += 3;
    if (isWJDT(yGan, dZhi, hZhi)) score += 3;
    if (nayinLabel === 'Nayin Weak') score += 2;
    if (nayinPersonScore < 0) score += 1;
    const hasBlueItems = analysisItems && analysisItems.some(i => i.tag === 'blue' || i.tag === 'family');
    if (!hasBlueItems) score += 1;
    // ── Positive factors (push score DOWN) ──
    if (spirit && spirit.auspicious) score -= 3;
    if (nayinLabel === 'Nayin Power') score -= 2;
    else if (nayinLabel === 'Nayin')  score -= 1;
    if (nayinPersonScore > 0) score -= 2;
    if (hasBlueItems) score -= 1;
    if (analysisItems) {
        if (analysisItems.some(i => i.tag === 'ke-wealth')) score -= 1;
        if (analysisItems.some(i => i.tag === 'ty'    || i.tag === 'ty-both'))    score -= 1;
        if (analysisItems.some(i => i.tag === 'noble' || i.tag === 'noble-both')) score -= 1;
    }
    if (LU_BRANCH[dGan]      === hZhi) score -= 1;
    if (HEAVEN_VIRTUE[mZhi]  === hZhi) score -= 1;
    if (BRANCH_VIRTUE[dZhi]  === hZhi) score -= 1;
    const mv = MONTH_VIRTUE[mZhi];
    if (mv && (mv.stem === hGan || mv.branch === hZhi)) score -= 1;
    return score;
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

// TST pillars for a person's birth (current GPS longitude + civil offset). Returns {year,month,day,hour} or null.
function _tstPillarsFor(dateStr, timeStr) {
    try {
        if (typeof XKDGSolarTime === 'undefined') return null;
        const lt = XKDGSolarTime.currentLonTz();
        if (!isFinite(lt.lonDeg)) return null;
        const d = String(dateStr).split('-').map(Number);
        const t = String(timeStr || '12:00').split(':').map(Number);
        return XKDGSolarTime.pillarsFromCivil(d[0], d[1], d[2], t[0] || 0, t[1] || 0, 0, lt.lonDeg, lt.tzOffsetMin);
    } catch (e) { return null; }
}

function getPersonMonthBranch(birthDate, birthTime, offsetMin) {
    if (!birthDate) return null;
    const P = _tstPillarsFor(birthDate, birthTime);
    if (P) return P.month.charAt(1);
    // Fallback: legacy offset method
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
    const P = _tstPillarsFor(dVal, tVal);
    if (P) return P.day.charAt(0);
    // Fallback: legacy offset method
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
    const P = _tstPillarsFor(birthDate, birthTime);
    if (P) return P.day.charAt(0);
    // Fallback: legacy offset method
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

// ── Person ↔ date "communication" — ANY mechanism (condition A or B) ──────
// True when the two hexagrams communicate by Hetu, Adding, Pure Qi (same
// number), shared Family, or Inverse hexagram. The KIND does not matter for
// VALIDITY — condition B (communicate in a way the date does not itself carry
// as a setting) is valid too, only lower-scored than the same-type condition A
// (see getPersonSameTypeBonus). Safe-by-default on any error.
function _xkConnectsAny(pYr, pStem, pBranch, dQi, dYun, dHex, dStem, dBranch){
  try {
    if (!pYr) return false;
    if (isHetuPair(pYr.qi,  dQi)  || [5,10,15].includes(pYr.qi  + dQi))  return true;
    if (isHetuPair(pYr.yun, dYun) || [5,10,15].includes(pYr.yun + dYun)) return true;
    if (pYr.qi === dQi || pYr.yun === dYun) return true;              // Pure Qi (communication)
    if (getJiaZiFamilies(pStem, pBranch).some(function(f){ return getJiaZiFamilies(dStem, dBranch).includes(f); })) return true;
    if (pYr.hex && dHex && getInverseHex(dHex) === pYr.hex) return true; // Inverse hexagram
    return false;
  } catch(e){ return false; }
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

    // Blood Link override (additive, safe-by-default): two pillars that belong
    // to the same Blood Link family share a cohesive bond strong enough to
    // override a branch Clash, so an Adding pair between them still counts.
    // Any error falls back to the original behaviour (treated as not-same-family).
    function inSameBloodLink(k1, k2) {
        try {
            const f1 = getJiaZiFamilies(pillars[k1].stem, pillars[k1].branch) || [];
            const f2 = getJiaZiFamilies(pillars[k2].stem, pillars[k2].branch) || [];
            return f1.some(f => f != null && f2.includes(f));
        } catch (e) { return false; }
    }

    // True when a branch Clash was overridden by a shared Blood Link family to
    // let an Adding or Hetu pair count. Used downstream to add a score bonus.
    let _blOverrideUsed = false;

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
            for (let j = i+1; j < keys.length; j++) {
                // Skip clashing pairs — UNLESS the two pillars share a Blood Link
                // family, in which case the bond overrides the clash (same rule as Adding).
                const _clash = isClashing(keys[i], keys[j]);
                if (_clash && !inSameBloodLink(keys[i], keys[j])) continue;
                if (isHetuPair(valFn(keys[i]), valFn(keys[j]))) {
                    validPairs.push([keys[i], keys[j]]);
                    if (_clash) _blOverrideUsed = true;
                }
            }
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
                // Skip clashing pairs — UNLESS the two pillars are in the same
                // Blood Link family, in which case the bond overrides the clash.
                const _clash = isClashing(keys[i], keys[j]);
                if (_clash && !inSameBloodLink(keys[i], keys[j])) continue;
                const s = valFn(keys[i]) + valFn(keys[j]);
                if ([5,10,15].includes(s)) {
                    validPairs.push({ a: keys[i], b: keys[j], sum: s });
                    if (_clash) _blOverrideUsed = true;
                }
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

    // If a Blood Link bond overrode a clash to form an Adding/Hetu relation,
    // flag those relation items so the hour score gets a bonus downstream.
    if (_blOverrideUsed) {
        items.forEach(it => {
            if (it.tag === 'blue' && (it.text.indexOf('Adding') !== -1 || it.text.indexOf('Hetu') !== -1))
                it.blOverride = true;
        });
    }

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
    // Day is always the original; Hour/Month/Year can be its inverse.
    // Exclude pillars that clash with Day (same rule as Hetu/Adding).
    const dayHex = pillars.day.hex;
    if (dayHex) {
        const invHex = getInverseHex(dayHex);
        if (invHex) {
            const PILLAR_LABELS = { hour: 'Hour', month: 'Month', year: 'Year' };
            const inverseMatches = ['hour','month','year'].filter(k =>
                pillars[k].hex === invHex && !isClashing('day', k)
            );
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

// ── Pinyin maps for the 10 Heavenly Stems (天干) and 12 Earthly Branches (地支) ──
//    Used to display pillar names alongside their Chinese characters
//    (e.g., 甲寅 → "Jia Yin"). Tone marks omitted for readability.
const GAN_PINYIN = {
    '甲':'Jia','乙':'Yi','丙':'Bing','丁':'Ding','戊':'Wu',
    '己':'Ji','庚':'Geng','辛':'Xin','壬':'Ren','癸':'Gui'
};
const ZHI_PINYIN = {
    '子':'Zi','丑':'Chou','寅':'Yin','卯':'Mao','辰':'Chen','巳':'Si',
    '午':'Wu','未':'Wei','申':'Shen','酉':'You','戌':'Xu','亥':'Hai'
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

// ── Shift date/time by ±1 hour and recalculate ──────────────────────
function shiftHour(delta) {
    try {
        const dateEl = document.getElementById('date');
        const timeEl = document.getElementById('time');
        if (!dateEl.value || !timeEl.value) return;
        const [y, m, d] = dateEl.value.split('-').map(Number);
        const [hh, mm] = timeEl.value.split(':').map(Number);
        const dt = new Date(y, m - 1, d, hh + delta, mm);
        dateEl.value = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        timeEl.value = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
        calculateBazi();
    } catch(e) {
        console.error('shiftHour error:', e);
    }
}

// ── Smart UTC offset lookup by GPS coordinates ──────────────────────
// Many countries use a UTC offset that does NOT match their geographic longitude.
// This function maps (lat, lon) → real UTC offset for the most common "anomalies".
// For everything else, falls back to lon/15 rounded.
function getRealUtcOffset(lat, lon) {
    // ── Asia ──
    // China (all uses +8 despite spanning 5 geographic timezones)
    if (lat >= 18 && lat <= 54 && lon >= 73  && lon <= 135) return 8;
    // Malaysia + Singapore + Brunei (geographically +7, actually +8)
    if (lat >= 0.5 && lat <= 8 && lon >= 99  && lon <= 120) return 8;
    // Philippines (+8)
    if (lat >= 4.5 && lat <= 21 && lon >= 116 && lon <= 127) return 8;
    // Taiwan + Hong Kong + Macau (+8)
    if (lat >= 18 && lat <= 26 && lon >= 113 && lon <= 123) return 8;
    // Indonesia East (Papua, +9)
    if (lat >= -11 && lat <= 1 && lon >= 130 && lon <= 141) return 9;
    // Indonesia Central (Sulawesi, Bali, +8)
    if (lat >= -11 && lat <= 5 && lon >= 115 && lon <= 130) return 8;
    // Indonesia West (Java, Sumatra, +7)
    if (lat >= -11 && lat <= 6 && lon >= 95 && lon <= 115) return 7;
    // India + Sri Lanka (+5:30)
    if (lat >= 5 && lat <= 36 && lon >= 68 && lon <= 92) return 5.5;
    // Nepal (+5:45)
    if (lat >= 26 && lat <= 31 && lon >= 80 && lon <= 89) return 5.75;
    // Myanmar (+6:30)
    if (lat >= 9 && lat <= 28 && lon >= 92 && lon <= 102) return 6.5;
    // Iran (+3:30)
    if (lat >= 25 && lat <= 40 && lon >= 44 && lon <= 64) return 3.5;
    // Afghanistan (+4:30)
    if (lat >= 29 && lat <= 39 && lon >= 60 && lon <= 75) return 4.5;
    // ── Europe ──
    // Spain + France + Italy + Germany + Benelux + Czechia + Poland (+1)
    if (lat >= 36 && lat <= 56 && lon >= -10 && lon <= 24) return 1;
    // UK + Ireland + Portugal (+0)
    if (lat >= 35 && lat <= 60 && lon >= -10 && lon <= 2) return 0;
    // ── Africa ──
    // Morocco + Western Sahara (+1)
    if (lat >= 21 && lat <= 36 && lon >= -17 && lon <= -1) return 1;
    // ── Oceania ──
    // Australia East (NSW, VIC, QLD, TAS, +10)
    if (lat >= -44 && lat <= -10 && lon >= 141 && lon <= 154) return 10;
    // Australia Central (NT, SA, +9:30)
    if (lat >= -39 && lat <= -10 && lon >= 129 && lon <= 141) return 9.5;
    // Australia West (WA, +8)
    if (lat >= -36 && lat <= -13 && lon >= 113 && lon <= 129) return 8;
    // ── Fallback: pure longitude estimate ──
    return Math.round(lon / 15);
}

function getGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            window._lastGpsLat = lat;
            window._lastGpsLng = lon;
            try { localStorage.setItem('xkdg_gps', JSON.stringify({ lat: lat, lng: lon })); } catch(e){}
            document.getElementById('longitude').value = lon.toFixed(2);
            // Smart UTC offset detection: handles countries with non-geographic timezones
            const utcReal = getRealUtcOffset(lat, lon);
            const utcClamped = Math.max(-12, Math.min(14, utcReal));
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

    // 1. TRUE SOLAR TIME — full TST (longitude + Equation of Time); day rolls at TST midnight.
    const _bzD = dVal.split('-').map(Number);
    const _bzT = (tVal || '00:00').split(':').map(Number);
    const _bzTz = -(utc * 60 + (_dstOn ? 60 : 0));   // (UTC - local) minutes, incl. DST
    let pillarKeys, solarDate, _tstShow, dayGan, dayZhi;
    if (typeof XKDGSolarTime !== 'undefined' && isFinite(lon)) {
        const P = XKDGSolarTime.pillarsFromCivil(_bzD[0], _bzD[1], _bzD[2], _bzT[0] || 0, _bzT[1] || 0, 0, lon, _bzTz);
        pillarKeys = {
            year:  { stem: P.year.charAt(0),  branch: P.year.charAt(1)  },
            month: { stem: P.month.charAt(0), branch: P.month.charAt(1) },
            day:   { stem: P.day.charAt(0),   branch: P.day.charAt(1)   },
            hour:  { stem: P.hour.charAt(0),  branch: P.hour.charAt(1)  }
        };
        const t = P.meta.tst;
        solarDate = new Date(t.y, t.mo - 1, t.d, t.h, t.mi, t.s || 0);
        _tstShow = String(t.h).padStart(2, '0') + ':' + String(t.mi).padStart(2, '0');
    } else {
        // Fallback (TST engine or longitude unavailable): legacy longitude+DST, 23:00 day edge.
        const offsetMinutes = (lon - utc * 15) * 4;
        const dstOffset = _dstOn ? 60 : 0;
        solarDate = new Date(new Date(`${dVal}T${tVal}`).getTime() + offsetMinutes * 60000 - dstOffset * 60000);
        const ec = Solar.fromDate(solarDate).getLunar().getEightChar();
        let dG = ec.getDayGan(), dZ = ec.getDayZhi();
        if (solarDate.getHours() === 23) {
            const oldEC = Solar.fromDate(new Date(solarDate.getTime() - 3600000)).getLunar().getEightChar();
            dG = oldEC.getDayGan(); dZ = oldEC.getDayZhi();
        }
        pillarKeys = {
            year:  { stem: ec.getYearGan(),  branch: ec.getYearZhi()  },
            month: { stem: ec.getMonthGan(), branch: ec.getMonthZhi() },
            day:   { stem: dG,               branch: dZ               },
            hour:  { stem: ec.getTimeGan(),  branch: ec.getTimeZhi()  }
        };
        _tstShow = solarDate.toTimeString().slice(0, 5);
    }
    dayGan = pillarKeys.day.stem;
    dayZhi = pillarKeys.day.branch;
    function nayinOf(p){ try { return (typeof LunarUtil !== 'undefined' ? LunarUtil : Lunar.LunarUtil).NAYIN[p.stem + p.branch] || ''; } catch(e){ return ''; } }

    const _solarDisp = document.getElementById('solar-time-display');
    if (_solarDisp) _solarDisp.textContent = "True Solar: " + _tstShow;

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

    updatePillar('p-year',  pillarKeys.year.stem,  pillarKeys.year.branch,  xkdgData.year,  nayinOf(pillarKeys.year));
    updatePillar('p-month', pillarKeys.month.stem, pillarKeys.month.branch, xkdgData.month, nayinOf(pillarKeys.month));
    updatePillar('p-day',   pillarKeys.day.stem,   pillarKeys.day.branch,   xkdgData.day,   nayinOf(pillarKeys.day));
    updatePillar('p-hour',  pillarKeys.hour.stem,  pillarKeys.hour.branch,  xkdgData.hour,  nayinOf(pillarKeys.hour));

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
// In-memory backup of inputs for the ON/OFF toggle. Distinct from the
// localStorage archive (which is for named/saved profiles): this is JUST
// to keep the currently-typed values across a single OFF→ON cycle.
let _personPanelBackup = { a: null, b: null };
let _showPersonStars = { a: false, b: false };

function togglePersonPanel(person) {
    _personPanelOpen[person] = !_personPanelOpen[person];
    const arrow = document.getElementById(`toggle-panel-${person}`);
    const isOn  = _personPanelOpen[person];

    if (isOn) {
        // ── Restore from the in-memory backup taken on the previous OFF ──
        // Without this, OFF wiped the input fields AND the globals and
        // there was nothing to come back to — so BEST/LIST/CAL ran without
        // the toggled person even after the user flipped it back to ON.
        const suffix = person === 'b' ? '-b' : '';
        const backup = _personPanelBackup[person];
        if (backup) {
            const nameEl = document.getElementById(`person-name${suffix}`);
            const dateEl = document.getElementById(`person-date${suffix}`);
            const timeEl = document.getElementById(`person-time${suffix}`);
            if (nameEl) nameEl.value = backup.name || '';
            if (dateEl) dateEl.value = backup.date || '';
            if (timeEl) timeEl.value = backup.time || '12:00';
            // For Person B with year-only depth, also restore the JiaZi dropdown
            if (person === 'b' && backup.yearJiaZi) {
                const yEl = document.getElementById('person-year-b');
                if (yEl) yEl.value = backup.yearJiaZi;
                const depthEl = document.getElementById('person-pillars-b');
                if (depthEl && backup.depth) depthEl.value = backup.depth;
            }
            // Re-run the calculation: this re-fills globals, shows the chart,
            // analysis section, pillar toggle wrapper, etc.
            if (typeof calculatePerson === 'function' && (backup.date || backup.yearJiaZi)) {
                try { calculatePerson(person); } catch (e) {}
            }
            _personPanelBackup[person] = null; // backup consumed
            // Auto-load house profile for restored person
            if (backup && backup.name && typeof fsAutoLoadHouse === 'function') fsAutoLoadHouse(backup.name);
        }
        if (arrow) arrow.textContent = '▾ Hide';
    } else {
        // ── Snapshot current inputs into the backup BEFORE clearing ──
        // This is what makes the next ON restore work. We capture the raw
        // values (not the globals), so the recalc on ON gets exactly what
        // a user-typed sequence would produce.
        const suffix = person === 'b' ? '-b' : '';
        const nameEl = document.getElementById(`person-name${suffix}`);
        const dateEl = document.getElementById(`person-date${suffix}`);
        const timeEl = document.getElementById(`person-time${suffix}`);
        const yEl    = (person === 'b') ? document.getElementById('person-year-b') : null;
        const depthEl= (person === 'b') ? document.getElementById('person-pillars-b') : null;
        _personPanelBackup[person] = {
            name: nameEl ? nameEl.value : '',
            date: dateEl ? dateEl.value : '',
            time: timeEl ? timeEl.value : '12:00',
            yearJiaZi: yEl ? yEl.value : '',
            depth: depthEl ? depthEl.value : ''
        };
        // Clear active fields but keep archive
        if (nameEl) nameEl.value = '';
        if (dateEl) dateEl.value = '';
        if (timeEl) timeEl.value = '12:00';
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
        // Clear Luopan FS inputs when person is toggled OFF
        if (typeof fsClearHouseInputs === 'function') fsClearHouseInputs();
        if (arrow) arrow.textContent = '▸ Show';
    }

    // Clear results and prompt rescan
    const mv = document.getElementById('month-view');
    const sr = document.getElementById('scan-results');
    const cv = document.getElementById('cal-view');
    if (mv) mv.innerHTML = `<div class="scan-empty">Person ${person.toUpperCase()} is ${isOn ? 'active' : 'hidden'} — tap SCAN to refresh.</div>`;
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

function toggleBestOnlyXKDG() {
    _bestOnlyXKDG = !_bestOnlyXKDG;
    // Re-render only (no re-scan): the filtering happens inside renderScanResults.
    const mode = _personBYear ? 'both' : 'score';
    renderScanResults(_scanResults, mode);
}

function togglePersonStars(person) {
    _showPersonStars[person] = !_showPersonStars[person];
    const btn = document.getElementById(`toggle-stars-${person}`);
    if (btn) {
        btn.textContent = _showPersonStars[person] ? '★ Hide Stars' : '☆ Show Stars';
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
        // Auto-load house profile for this person
        if (typeof fsAutoLoadHouse === 'function') fsAutoLoadHouse(name);
        try { _xkdgSetLastPerson(targetPanel, name); } catch(e){}
        // Saved person → always hide Bazi/XKDG details by default.
        // User can expand via the toggle button.
        setTimeout(function(){
            try {
                var k = (targetPanel === 'B' || targetPanel === 'b') ? 'b' : 'a';
                if (!window._personDetailsVisible) window._personDetailsVisible = { a: true, b: true };
                window._personDetailsVisible[k] = false;
                if (typeof setPersonDetailsVisibility === 'function') setPersonDetailsVisibility(k, false);
            } catch(e) {}
        }, 100);
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
    const isB     = person === 'B';
    const depth = isB ? (parseInt(document.getElementById('person-pillars-b')?.value) || 4) : 4;
    const jiaZiYear = (isB && depth === 1) ? (document.getElementById('person-year-b')?.value || '') : '';
    archive[name] = { date, time, savedAt: Date.now(), depth, jiaZiYear };
    saveArchiveData(key, archive);
    // Un-hide if re-saving a previously hidden person
    const hidden = loadArchive('xkdg_persons_hidden') || {};
    if (hidden[name]) {
        delete hidden[name];
        localStorage.setItem('xkdg_persons_hidden', JSON.stringify(hidden));
    }
    renderArchive(person);
    try { _xkdgSetLastPerson(person, name); } catch(e){}
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
    // Auto-load house profile for this person
    if (typeof fsAutoLoadHouse === 'function') fsAutoLoadHouse(name);
    try { _xkdgSetLastPerson(person, name); } catch(e){}
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
        try { applyPersonDetailsVisibility(person); } catch(e) {}
        return;
    }
    if (!dVal) return;

    const lon = parseFloat(document.getElementById('longitude').value);
    const personDst = isB ? _dstOnB : _dstOnA;
    let pillarKeys, dGan, dZhi;
    // Birth solar date at FUNCTION scope. Previously it was declared only inside
    // the fallback branch, so the primary (_ppP) path reached getJieqiSeason(solarDate)
    // with solarDate undefined → "ReferenceError: solarDate is not defined", which
    // crashed every person calculation. Compute it once here for both paths.
    let solarDate;
    try {
        const _utcS = parseFloat(document.getElementById('utc-offset').value);
        const _offS = ((lon - (isFinite(_utcS) ? _utcS : 0) * 15) * 4) - (personDst ? 60 : 0);
        solarDate = new Date(new Date(`${dVal}T${tVal}`).getTime() + (isFinite(_offS) ? _offS : 0) * 60000);
    } catch (e) {
        try { solarDate = new Date(`${dVal}T${tVal}`); } catch (_e) { solarDate = new Date(); }
    }
    const _ppP = (function(){
        try {
            if (typeof XKDGSolarTime === 'undefined' || !isFinite(lon)) return null;
            const utc = parseFloat(document.getElementById('utc-offset').value) || 0;
            const tz = -(utc * 60 + (personDst ? 60 : 0));
            const d = dVal.split('-').map(Number), t = (tVal || '12:00').split(':').map(Number);
            return XKDGSolarTime.pillarsFromCivil(d[0], d[1], d[2], t[0] || 0, t[1] || 0, 0, lon, tz);
        } catch (e) { return null; }
    })();
    if (_ppP) {
        dGan = _ppP.day.charAt(0); dZhi = _ppP.day.charAt(1);
        pillarKeys = {
            year:  { stem: _ppP.year.charAt(0),  branch: _ppP.year.charAt(1)  },
            month: depth >= 2 ? { stem: _ppP.month.charAt(0), branch: _ppP.month.charAt(1) } : null,
            day:   depth >= 3 ? { stem: dGan, branch: dZhi } : null,
            hour:  depth >= 4 ? { stem: _ppP.hour.charAt(0),  branch: _ppP.hour.charAt(1)  } : null
        };
    } else {
        const utc = parseFloat(document.getElementById('utc-offset').value);
        const offsetMin = ((lon - utc * 15) * 4) - (personDst ? 60 : 0);
        solarDate = new Date(new Date(`${dVal}T${tVal}`).getTime() + offsetMin * 60000);
        const eightChar = Solar.fromDate(solarDate).getLunar().getEightChar();
        dGan = eightChar.getDayGan(); dZhi = eightChar.getDayZhi();
        if (solarDate.getHours() === 23) {
            const yest = Solar.fromDate(new Date(solarDate.getTime() - 3600000)).getLunar().getEightChar();
            dGan = yest.getDayGan(); dZhi = yest.getDayZhi();
        }
        pillarKeys = {
            year:  { stem: eightChar.getYearGan(),  branch: eightChar.getYearZhi()  },
            month: depth >= 2 ? { stem: eightChar.getMonthGan(), branch: eightChar.getMonthZhi() } : null,
            day:   depth >= 3 ? { stem: dGan, branch: dZhi } : null,
            hour:  depth >= 4 ? { stem: eightChar.getTimeGan(),  branch: eightChar.getTimeZhi()  } : null
        };
    }

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
    updatePillar(`${prefix}-year`,  pillarKeys.year.stem,  pillarKeys.year.branch,  xkdgData.year,  NAYIN[pillarKeys.year.stem + pillarKeys.year.branch] || '');
    if (pillarKeys.month) updatePillar(`${prefix}-month`, pillarKeys.month.stem, pillarKeys.month.branch, xkdgData.month, NAYIN[pillarKeys.month.stem + pillarKeys.month.branch] || '');
    if (pillarKeys.day)   updatePillar(`${prefix}-day`,   pillarKeys.day.stem,   pillarKeys.day.branch,   xkdgData.day,   NAYIN[pillarKeys.day.stem + pillarKeys.day.branch] || '');
    if (pillarKeys.hour)  updatePillar(`${prefix}-hour`,  pillarKeys.hour.stem,  pillarKeys.hour.branch,  xkdgData.hour,  NAYIN[pillarKeys.hour.stem + pillarKeys.hour.branch] || '');

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
            btn.textContent = _showPersonStars[btnKey] ? '★ Hide Stars' : '☆ Show Stars';
            btn.style.background = _showPersonStars[btnKey] ? '#fff9c4' : '#f5f5f5';
            btn.style.color = _showPersonStars[btnKey] ? '#b8860b' : '#555';
        }
    } else {
        analysisSection.style.display = 'none';
    }
    updateScoreModeBtn();
    // Remember this as the last person used in this panel (catch-all for all load paths)
    try {
      var _pnEl = document.getElementById(person === 'B' ? 'person-name-b' : 'person-name');
      var _pnm  = _pnEl ? (_pnEl.value || '').trim() : '';
      if (_pnm && typeof _xkdgSetLastPerson === 'function') _xkdgSetLastPerson(person, _pnm);
    } catch(e){}
    // Apply "seen before" collapse behavior for Bazi/XKDG details
    try { applyPersonDetailsVisibility(person); } catch(e) {}
}

// ── Person Bazi/XKDG details collapse behavior ──
// First time loading a specific named person: show full Bazi + XKDG.
// Subsequent loads of the same name: hide by default, show "Show" button.
// State persists across sessions via localStorage.
function applyPersonDetailsVisibility(person){
    var isB = (person === 'B' || person === 'b');
    var key = isB ? 'b' : 'a';
    var nameId = isB ? 'person-name-b' : 'person-name';
    var nameEl = document.getElementById(nameId);
    var personName = nameEl ? (nameEl.value || '').trim() : '';

    // No name → always show (can't track)
    if (!personName) {
        if (!window._personDetailsVisible) window._personDetailsVisible = { a: true, b: true };
        window._personDetailsVisible[key] = true;
        setPersonDetailsVisibility(key, true);
        addPersonDetailsToggleBtn(key);
        return;
    }

    // Load seen list
    var seenList;
    try { seenList = JSON.parse(localStorage.getItem('xkdg_person_bazi_seen') || '[]'); }
    catch(e) { seenList = []; }
    var seenBefore = seenList.indexOf(personName) !== -1;

    // Mark as seen for next time
    if (!seenBefore) {
        seenList.push(personName);
        try { localStorage.setItem('xkdg_person_bazi_seen', JSON.stringify(seenList)); } catch(e) {}
    }

    if (!window._personDetailsVisible) window._personDetailsVisible = { a: true, b: true };
    window._personDetailsVisible[key] = !seenBefore;
    setPersonDetailsVisibility(key, !seenBefore);
    addPersonDetailsToggleBtn(key);
}

function setPersonDetailsVisibility(key, visible){
    var chartId    = key === 'b' ? 'person-chart-b' : 'person-chart';
    var analysisId = key === 'b' ? 'person-analysis-container-b' : 'person-analysis-container-a';
    var pillarWrapId = key === 'b' ? 'pillar-toggle-b-wrap' : 'pillar-toggle-a-wrap';

    var chart = document.getElementById(chartId);
    var analysis = document.getElementById(analysisId);
    if (chart) chart.style.display = visible ? 'grid' : 'none';
    if (analysis) analysis.style.display = visible ? 'flex' : 'none';
    // Hide the existing "Show Pillars" toggle wrapper too — avoid duplicate buttons
    var pw = document.getElementById(pillarWrapId);
    if (pw) pw.style.display = visible ? 'block' : 'none';
    // Update my toggle button text
    var btn = document.getElementById('toggle-bazi-' + key);
    if (btn) btn.textContent = visible ? '▾ Hide 4P + XKDG details' : '▸ Show 4P + XKDG details';
}

function togglePersonDetails(key){
    if (!window._personDetailsVisible) window._personDetailsVisible = { a: true, b: true };
    window._personDetailsVisible[key] = !window._personDetailsVisible[key];
    setPersonDetailsVisibility(key, window._personDetailsVisible[key]);
}

function addPersonDetailsToggleBtn(key){
    if (document.getElementById('toggle-bazi-' + key)) return; // already exists
    var chartId = key === 'b' ? 'person-chart-b' : 'person-chart';
    var chart = document.getElementById(chartId);
    if (!chart || !chart.parentElement) return;
    var visible = window._personDetailsVisible && window._personDetailsVisible[key];
    var btn = document.createElement('button');
    btn.id = 'toggle-bazi-' + key;
    btn.textContent = visible ? '▾ Hide 4P + XKDG details' : '▸ Show 4P + XKDG details';
    btn.style.cssText = 'background:#fff;color:#666;border:1px solid #ccc;border-radius:6px;padding:4px 12px;font-size:11px;font-weight:bold;cursor:pointer;margin:6px 0;display:block;';
    btn.onclick = function(){ togglePersonDetails(key); };
    chart.parentElement.insertBefore(btn, chart);
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
    if (mode === 'both') filtered = filtered.filter(r => r.scoreA > 0 && r.scoreB > 0).sort((a,b) => b.score - a.score);
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

function loadDateIntoMain(isoDate, hourIndex, isZiSecondHalf) {
    const hourStart = (hourIndex === 0 && isZiSecondHalf) ? 0 : HOUR_STARTS[hourIndex];
    const dP = isoDate.split('-').map(Number);
    let dateStr, timeStr;
    const lt = (typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.currentLonTz() : null;
    if (lt && isFinite(lt.lonDeg) && typeof XKDGSolarTime.wallClockFromTST === 'function') {
        // TST 时辰 midpoint → civil wall clock (includes longitude + Equation of Time).
        const w = XKDGSolarTime.wallClockFromTST(dP[0], dP[1], dP[2], hourStart, 30, lt.lonDeg, lt.tzOffsetMin);
        dateStr = w.y + '-' + String(w.mo).padStart(2, '0') + '-' + String(w.d).padStart(2, '0');
        timeStr = String(w.h).padStart(2, '0') + ':' + String(w.mi).padStart(2, '0');
    } else {
        // Fallback: legacy longitude+DST (no EoT).
        const lon = parseFloat(document.getElementById('longitude').value);
        const utc = parseFloat(document.getElementById('utc-offset').value);
        const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);
        const localMinutes = (hourStart * 60 + 30) - offsetMin;
        let dayOffset = 0;
        if (localMinutes < 0) dayOffset = -1; else if (localMinutes >= 1440) dayOffset = 1;
        dateStr = isoDate;
        if (dayOffset !== 0) { const d = new Date(isoDate + 'T12:00:00'); d.setDate(d.getDate() + dayOffset); dateStr = d.toISOString().split('T')[0]; }
        const totalMins = ((localMinutes % 1440) + 1440) % 1440;
        timeStr = String(Math.floor(totalMins / 60)).padStart(2, '0') + ':' + String(Math.floor(totalMins % 60)).padStart(2, '0');
    }

    document.getElementById('date').value = dateStr;
    document.getElementById('time').value = timeStr;
    try { window._preLoadScrollY = window.scrollY || window.pageYOffset || 0; _showBackToResults(); } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
    calculateBazi();
}

// Toggle chronological vs best-first ordering for a DIRECTION (flight) scan.
function toggleDirChrono() { window._dirChrono = !window._dirChrono; runScanner(); }

// Floating "back to results" button: returns to the scan list after a result
// was opened in Main. The list itself is never destroyed, so this just scrolls
// back to where the user clicked from.
function _showBackToResults() {
    var b = document.getElementById('back-to-results');
    if (!b) {
        b = document.createElement('button');
        b.id = 'back-to-results';
        b.textContent = '↩ Back to results';
        b.setAttribute('style', 'position:fixed;left:16px;bottom:16px;z-index:99997;padding:10px 14px;border:0;border-radius:22px;background:#6a1b9a;color:#fff;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.3);');
        b.addEventListener('click', function () {
            var y = window._preLoadScrollY || 0;
            window.scrollTo({ top: y, behavior: 'smooth' });
            b.style.display = 'none';
        });
        document.body.appendChild(b);
    }
    b.style.display = 'block';
}

function renderScanResults(results, mode) {
    const container = document.getElementById('scan-results');
    if (!container) return;
    // --- AI bridge: expose the rendered list as structured data (Phase E2) ---
    try {
        var _lt = (typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.currentLonTz() : null;
        var _useTST = _lt && isFinite(_lt.lonDeg) && typeof XKDGSolarTime.wallClockFromTST === 'function';
        var _blon = parseFloat(document.getElementById('longitude').value);
        var _butc = parseFloat(document.getElementById('utc-offset').value);
        var _boff = (_blon - _butc * 15) * 4 - (_dstOn ? 60 : 0);
        window._lastScanResults = (results || []).map(function (r) {
            var _ts;
            if (_useTST) {
                var _dp = r.isoDate.split('-').map(Number);
                var _w = XKDGSolarTime.wallClockFromTST(_dp[0], _dp[1], _dp[2], HOUR_STARTS[r.hourIndex], 30, _lt.lonDeg, _lt.tzOffsetMin);
                _ts = String(_w.h).padStart(2, '0') + ':' + String(_w.mi).padStart(2, '0');
            } else {
                var _hs = HOUR_STARTS[r.hourIndex]; var _lm = (_hs * 60 + 30) - _boff;
                var _t = ((_lm % 1440) + 1440) % 1440;
                _ts = String(Math.floor(_t / 60)).padStart(2, '0') + ':' + String(Math.floor(_t % 60)).padStart(2, '0');
            }
            return { isoDate: r.isoDate, hourIndex: r.hourIndex, time: _ts, score: r.score, scoreA: r.scoreA, scoreB: r.scoreB };
        });
        window._lastScanMode = mode;
        window._lastScanPurpose = (typeof getPurpose === 'function') ? getPurpose() : '';
    } catch (e) {}
    container.style.display = 'block';
    var activePurpose = getPurpose();
    var purposeHeader = activePurpose
        ? '<div style="background:#1565c0;color:white;font-weight:bold;font-size:14px;padding:10px 14px;border-radius:8px;margin-bottom:10px;display:flex;align-items:center;gap:8px;"><span style=\"font-size:20px;\">' + PURPOSE_ICONS[activePurpose] + '</span><span>' + PURPOSE_NAMES[activePurpose] + ' Selection</span></div>'
        : '';

    // Sort toggle button — show whenever any chip is active
    const af = getActiveFilters();
    const hasChipSort = af.size > 0;
    const chipSortLabel = af.has('ke-wealth') ? 'Ke Sort' : af.has('nayin') ? 'NaYin Sort' : 'Chip Sort';
    const sortToggleHTML = `<div style="text-align:right;margin-bottom:6px;display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;">
            ${(_fsActionPalace && getPurpose()) ? `<button onclick="toggleDirChrono()" id="dir-chrono-btn" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #6a1b9a;background:${window._dirChrono?'#6a1b9a':'#fff'};color:${window._dirChrono?'#fff':'#6a1b9a'};cursor:pointer;">${window._dirChrono ? '📅 Date order' : '🏆 Best first'}</button>` : ''}
            ${hasChipSort ? `<button onclick="toggleScanSortMode()" id="chip-sort-btn" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #1565c0;background:${window._chipSortMode?'#1565c0':'#fff'};color:${window._chipSortMode?'#fff':'#1565c0'};cursor:pointer;">${window._chipSortMode ? '⇅ '+chipSortLabel : '⇅ Score Sort'}</button>` : ''}
            <button onclick="toggleBestOnlyXKDG()" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #6a1b9a;background:${_bestOnlyXKDG?'#6a1b9a':'#fff'};color:${_bestOnlyXKDG?'#fff':'#6a1b9a'};cursor:pointer;">
              ${_bestOnlyXKDG ? '🔒 Only with XKDG' : '🔓 Only with XKDG'}
            </button>
            <button onclick="toggleFsHouse();runScanner();" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #2e7d32;background:${_fsHouseActive?'#2e7d32':'#fff'};color:${_fsHouseActive?'#fff':'#2e7d32'};cursor:pointer;">
              ${_fsHouseActive ? '🏠 Hide Houses' : '🏠 Show Houses'}
            </button>
           </div>`;
    if (results.length === 0) {
        container.innerHTML = purposeHeader + sortToggleHTML + '<div class="scan-empty">No matching dates found.</div>';
        return;
    }
    const hasNegSort = af.has('negatives');
    // BEST view: hide score < 1 by default; with NEGATIVES chip ON, show ONLY score < 1.
    // (TABLES is the only view that shows everything regardless of score.)
    results = results.filter(r => {
        const s = r.score;
        // "Only with XKDG" (BEST): a date kept ONLY via Nayin Power (no hexagram
        // relation / no XKDG connection) is dropped when the toggle is ON, and
        // otherwise kept only if its score reaches the high-score threshold (8).
        if (r.rescuedByNayin && (_bestOnlyXKDG || s < 8)) return false;
        return hasNegSort ? (s < 1) : (s >= 6);
    });
    if (results.length === 0) {
        const emptyMsg = hasNegSort
            ? 'No negative dates (score &lt; +1) in this range.'
            : 'No favourable dates (score &ge; +6) in this range. Toggle the NEGATIVES filter to see negative dates instead.';
        container.innerHTML = purposeHeader + sortToggleHTML + '<div class="scan-empty">' + emptyMsg + '</div>';
        return;
    }
    const maxScore = hasNegSort
        ? Math.max(...results.map(r => r.negativeScore || 0))
        : Math.max(...results.map(r => r.score));
    container.innerHTML = purposeHeader + sortToggleHTML + results.map(r => {
        const s = hasNegSort ? (r.negativeScore || 0) : r.score;
        const rankClass = s >= maxScore * 0.9 ? 'rank-1'
                        : s >= maxScore * 0.75 ? 'rank-2'
                        : s >= maxScore * 0.55 ? 'rank-3'
                        : s >= maxScore * 0.35 ? 'rank-4'
                        : 'rank-5';
        // Negatives mode: soft red gradient (readable) + negative sign
        const negBg = hasNegSort
            ? (s >= maxScore * 0.9  ? '#ffcdd2'
              : s >= maxScore * 0.75 ? '#ffd6da'
              : s >= maxScore * 0.55 ? '#ffe0e3'
              : s >= maxScore * 0.35 ? '#ffebed'
              : '#fff5f6')
            : null;
        const negTextColor = hasNegSort ? '#b71c1c' : null;
        const displayScore = hasNegSort ? `-${s}` : `${s}`;
        // A/B markers — appear whenever a person is loaded.
        // Both loaded: per-row scoreA/scoreB decides which tag(s) to show.
        // Only A loaded: every row shows A. Only B loaded: every row shows B.
        const _bestALoaded = !!_personAYear;
        const _bestBLoaded = !!_personBYear;
        let aTag = '', bTag = '';
        if (_bestALoaded && _bestBLoaded) {
            if (r.scoreA > 0) aTag = ` <span style="color:#2e7d32;font-weight:bold;font-size:14px;">A</span>`;
            if (r.scoreB > 0) bTag = ` <span style="color:#7b1fa2;font-weight:bold;font-size:14px;">B</span>`;
        } else if (_bestALoaded) {
            aTag = ` <span style="color:#2e7d32;font-weight:bold;font-size:14px;">A</span>`;
        } else if (_bestBLoaded) {
            bTag = ` <span style="color:#7b1fa2;font-weight:bold;font-size:14px;">B</span>`;
        }
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
        return `<div class="scan-item ${rankClass}" style="cursor:pointer;${negBg?'background:'+negBg+' !important;border-left:4px solid #c62828 !important;':''}" onclick="loadDateIntoMain('${r.isoDate}', ${r.hourIndex})" title="Click to load this date">
            <div class="scan-score"${negBg?' style="color:'+negTextColor+';font-weight:bold;"':''}>${displayScore}${aTag}${bTag}</div>
            <div class="scan-date">📅 ${r.date}<br><small>${HOUR_ROMAN_NAMES[r.hourIndex]||''} ${getTSTHourLabel(r.hourIndex)}</small></div>
            <div class="scan-tags">${[purposeCondLabel, blueTagsHtml].filter(Boolean).join(' · ')} ${spiritStr} ${nayinStr} ${nayinPersonStr} ${keStr} ${(r.purposeQimen||[]).map(pq=>'<span style="font-size:10px;font-weight:bold;color:#7b1fa2;white-space:nowrap;cursor:pointer;" title="'+pq.label+' — activate stimulator at '+pq.dir+'" onclick="event.stopPropagation();showQimenPopup(\''+pq.label.replace(/'/g,'').replace(/'/g,'')+'\')"'+'>🌀⭐'+pq.dir+' '+pq.label.split(' ')[0]+'</span>').join(' ')} ${(r.purposeQimenR||[]).map(pq=>'<span style="font-size:10px;font-weight:bold;color:#1565c0;white-space:nowrap;cursor:pointer;" title="'+pq.label+' — act towards '+pq.dir+' direction" onclick="event.stopPropagation();showQimenPopup(\''+pq.label.replace(/'/g,'').replace(/'/g,'')+'\')">→'+pq.dir+' '+pq.label.split(' ')[0]+'</span>').join(' ')} ${fsBuildHouseBadgeHtml(r.fsBadge, r.isoDate+'-'+r.hourIndex)}</div>
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
const HOUR_ROMAN_NAMES = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
const HOUR_RANGE_STARTS = ['23:00','01:00','03:00','05:00','07:00','09:00','11:00','13:00','15:00','17:00','19:00','21:00'];
const HOUR_RANGE_ENDS   = ['01:00','03:00','05:00','07:00','09:00','11:00','13:00','15:00','17:00','19:00','21:00','23:00'];

// ── Central TST label formatter (used by BEST / LIST / TABLES). ─────────
// Returns the hour-range label with wall-clock first and TST in parens.
//
// CONVENTIONS:
//   - baseStart / baseEnd are Chinese astronomical hour boundaries in TST
//     (True Solar Time). E.g. '09:00'-'11:00' for Si.
//   - Wall clock = TST − longitude correction + DST offset.
//     Formula: wallShift = −tstMins + wallMins.
//   - TST is always baseStart-baseEnd as-is (Chinese hours ARE solar hours).
//
// Format examples (Paris, lon=2.35, utc=1, DST on → wallShift ≈ +111 min):
//   "10:51-12:51 (TST 09:00-11:00) ✦"
// Rome, lon=12.49, utc=1, DST on → wallShift ≈ +70 min:
//   "10:10-12:10 (TST 09:00-11:00) ✦"
// If wallShift ≈ 0:  "09:00-11:00"
function formatTSTRange(baseStart, baseEnd) {
    const lonEl = document.getElementById('longitude');
    const utcEl = document.getElementById('utc-offset');
    const lon = lonEl ? parseFloat(lonEl.value) : NaN;
    const utc = utcEl ? parseFloat(utcEl.value) : NaN;
    if (!isFinite(lon) || !isFinite(utc)) return baseStart + '-' + baseEnd;
    const lt = (typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.currentLonTz() : null;
    const canTST = lt && isFinite(lt.lonDeg) && typeof XKDGSolarTime.wallClockFromTST === 'function';
    // Reference date for the Equation of Time: the scan start, else today.
    const refIso = (document.getElementById('scan-start') && document.getElementById('scan-start').value) || new Date().toISOString().split('T')[0];
    const rp = refIso.split('-').map(Number);
    function toWall(t) {
        const parts = t.split(':'); const h = parseInt(parts[0]), mi = parseInt(parts[1]) || 0;
        if (canTST) {
            const w = XKDGSolarTime.wallClockFromTST(rp[0], rp[1], rp[2], h, mi, lt.lonDeg, lt.tzOffsetMin);
            return String(w.h).padStart(2, '0') + ':' + String(w.mi).padStart(2, '0');
        }
        const wallShift = Math.round(-((lon - utc * 15) * 4) + (_dstOn ? 60 : 0));
        const total = h * 60 + mi + wallShift; const norm = ((total % 1440) + 1440) % 1440;
        return String(Math.floor(norm / 60)).padStart(2, '0') + ':' + String(Math.floor(norm % 60)).padStart(2, '0');
    }
    const wallStart = toWall(baseStart), wallEnd = toWall(baseEnd);
    if (wallStart === baseStart && wallEnd === baseEnd) return baseStart + '-' + baseEnd;
    return wallStart + '-' + wallEnd + '<br>(TST ' + baseStart + '-' + baseEnd + ') ✦';
}

// Convenience wrapper: returns TST-adjusted label for hour index 0..11 (子=0 .. 亥=11).
function getTSTHourLabel(h) {
    if (h < 0 || h > 11) return '';
    return formatTSTRange(HOUR_RANGE_STARTS[h], HOUR_RANGE_ENDS[h]);
}

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
    // Inverse same-type: date carries an Inverse Hex setting AND the person's
    // year hex is the inverse of the day hex → same-type (condition A) bonus.
    const hasDateInverse = blueItems.some(i => i.text && i.text.startsWith && i.text.startsWith('Inverse Hex'));
    const personIsInverse = (personYear.hex && dayXkdg.hex && getInverseHex(dayXkdg.hex) === personYear.hex);
    if (hasDateInverse && personIsInverse)                                   return 4;

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

    // Bonus when a branch clash was overridden by a shared Blood Link family to
    // form an Adding/Hetu relation (flagged in analyzeXkdg). Tunable.
    const BLOOD_LINK_OVERRIDE_BONUS = 2;
    const hasBLOverride  = blueItems.some(i => i.blOverride);
    const blOverrideBonus = hasBLOverride ? BLOOD_LINK_OVERRIDE_BONUS : 0;

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

    // Clash penalty — graduated by clash type.
    // Day-month STEM clash is a MINOR clash: it does not disturb hexagram
    // communication (XKDG relations stay valid), so it is only -1.
    // Branch clashes (year, month) remain the serious -4.
    const _clashTypeCHS = getClashType(dGan, dZhi, yZhi, mGan, mZhi);
    const clashPenalty = _clashTypeCHS === 'clash-month-stem' ? -1
                       : _clashTypeCHS                        ? -4
                       : 0;

    // Personal star bonuses (person A)
    const nobleBonus = (pNobleA && pNobleA.includes(hZhi)) ? 1 : 0;
    const luBonus    = (pLuA && pLuA === hZhi) ? 1 : 0;
    const hvBonus    = (pHVA && pHVA === hZhi) ? 1 : 0;
    const bvBonus    = (pBVA && pBVA === hZhi) ? 1 : 0;
    const mvBonus    = (pMVA && pMVA.stem === hGan) ? 1 : 0;
    const tyBonus    = (pTYA && pTYA === hZhi) ? 1 : 0;

    // Minimum floor: penalties can never push a relation below its floor
    const nayinRes = analyzeNayin(dGan, dZhi, hGan, hZhi, mGan, mZhi, yGan, yZhi, pYStem, pYBranch, null, null);
    let nayinScore = nayinRes.score + nayinRes.personScore;

    // Nayin Power gets its own floor (+5 base means min 6 before other bonuses)
    const nayinFloor = nayinRes.label === 'Nayin Power' ? 6 : nayinRes.label === 'Nayin' ? 2 : null;

    const relationFloor = blueItems.some(i => i.tag === 'family')                                                  ? 12
                        : blueItems.some(i => i.text.includes('Pure Qi'))                                          ? 10
                        : blueItems.some(i => i.text.includes('Pure Adding') || i.text.includes('Pure Hetu'))      ? 7
                        : blueItems.some(i => i.text.includes('Adding') || i.text.includes('Hetu') || i.text.startsWith('Inverse Hex')) ? 3
                        : 1;

    // Option 1 — a genuine hexagram relation OUTRANKS element-level Nayin Weak.
    // Nayin Weak is an element-level weakness: it must not drag down, nor remove
    // the floor of, an hour that has real hexagram communication (Pure Qi, Pure
    // Hetu, Adding, Family, Inverse Hex). When such a relation is present we
    // neutralise the Nayin Weak penalty AND keep the relation floor.
    const hasHexagramRelation = relationFloor > 1;
    if (nayinRes.label === 'Nayin Weak' && hasHexagramRelation) {
        nayinScore = Math.max(0, nayinScore); // strong relation wins → no Nayin Weak penalty
    }

    // Nayin Weak removes the floor (lets the score go negative) ONLY when there is
    // no hexagram relation to protect. With a relation, the relation floor stands.
    const effectiveFloor = (nayinRes.label === 'Nayin Weak' && !hasHexagramRelation) ? -2
                         : nayinFloor !== null ? Math.max(relationFloor, nayinFloor)
                         : relationFloor;

    const rawScore = scoreA * Math.max(qualityScore, 1)
        + relationBaseScore
        + sameTypeBonusA
        + spiritPenalty + spiritBonus
        + tombShaPenalty + clashPenalty
        + nobleBonus + luBonus + hvBonus + bvBonus + mvBonus + tyBonus
        + fullBLBonus + partialBLBonus
        + blOverrideBonus
        + nayinScore;
    return Math.max(effectiveFloor, rawScore);
}

// Build a map of isoDate → [{name,time}] for a year range, in LOCAL TRUE SOLAR TIME.
// lunar-javascript reports each 节气 in Beijing time (UTC+8); we convert that to the true
// solar time of the current GPS longitude (longitude + Equation of Time) via XKDGSolarTime.
// The legacy offsetMin argument is ignored (kept for call-site compatibility).
function buildJieqiMap(startYear, endYear, offsetMin) {
    const map = {};
    // Current GPS longitude (always the present location, per house rule).
    let lonDeg = NaN;
    try { lonDeg = parseFloat(document.getElementById('longitude').value); } catch(e) {}
    if (!isFinite(lonDeg)) { try { lonDeg = JSON.parse(localStorage.getItem('xkdg_gps')||'{}').lng; } catch(e) {} }
    const haveTST = (typeof XKDGSolarTime !== 'undefined') && isFinite(lonDeg);
    for (let yr = startYear; yr <= endYear; yr++) {
        const table = Lunar.fromYmd(yr, 1, 1).getJieQiTable();
        for (const [name, s] of Object.entries(table)) {
            const bH = s.getHour ? s.getHour() : 0, bMi = s.getMinute ? s.getMinute() : 0;
            let iso, timeStr, wallStr = '';
            if (haveTST) {
                // Beijing-time term → local true solar time (for placement + the (TST …) label).
                const t = XKDGSolarTime.beijingTermToTST(s.getYear(), s.getMonth(), s.getDay(), bH, bMi, 0, lonDeg);
                iso = t.y + '-' + String(t.mo).padStart(2,'0') + '-' + String(t.d).padStart(2,'0');
                timeStr = String(t.h).padStart(2,'0') + ':' + String(t.mi).padStart(2,'0');
                // Home wall-clock time (longitude + EoT + DST), consistent with the hour list.
                try {
                    const lt = XKDGSolarTime.currentLonTz();
                    const w = XKDGSolarTime.wallClockFromTST(t.y, t.mo, t.d, t.h, t.mi, lonDeg, lt.tzOffsetMin);
                    wallStr = String(w.h).padStart(2,'0') + ':' + String(w.mi).padStart(2,'0');
                } catch(e) {}
            } else {
                // Fallback (no longitude / engine): legacy behaviour.
                const rawDate = new Date(s.getYear(), s.getMonth()-1, s.getDay(), bH, bMi);
                const solarDate = new Date(rawDate.getTime() + (offsetMin||0) * 60000);
                iso = solarDate.toISOString().split('T')[0];
                timeStr = String(solarDate.getHours()).padStart(2,'0') + ':' + String(solarDate.getMinutes()).padStart(2,'0');
            }
            if (!map[iso]) map[iso] = [];
            map[iso].push({ name, time: timeStr, wall: wallStr });
        }
    }
    return map;
}

let _currentMode = 'dates';

function setMode(mode) {
    _currentMode = mode;
    window._fsFlightCalMode = false; // reset ✈ flight-hour annotation on any mode change
    if (mode === 'month') window._calBackDate = null; // clear back button when LIST opened manually
    // Reset the FS "matching dates" flag when leaving the FS view, so the
    // next time the user enters FS they see the live auto-rendered analysis
    // (date → facing/water) rather than a stale matching-dates list.
    if (mode !== 'fengshui') window._fsShowingMatching = false;
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

// ── PURPOSE ↔ QIMEN CONFIG MAP ──────────────────────────────────
// Maps each Purpose to the Qimen configurations (Dun/Pretense/Borrow) that amplify it.
// Labels must match exactly what qmdj-water-scanner.js produces in hits[].label.
var PURPOSE_QIMEN_MAP = {
  health:       ['Deity Dun 神遁', 'Human Dun 人遁'],
  career:       ['Heaven Dun 天遁', 'Wind Dun 風遁', 'Dragon Dun 龍遁', 'Cloud Dun 云遁'],
  wealth:       ['Earth Dun 地遁', 'Cloud Dun 云遁', 'Rest Pretenses 休詐', 'Earth Borrows 地假'],
  relationship: ['Human Dun 人遁', 'Multiple Pretenses 重詐', 'Human Borrows 人假'],
  journey:      ['Dragon Dun 龍遁'],
  speak:        ['Wind Dun 風遁', 'Heaven Borrows 天假', 'Tiger Dun 虎遁'],
  legal:        ['Tiger Dun 虎遁', 'Dragon Dun 龍遁', 'Ghost Dun 鬼遁', 'Real Pretenses 真詐',
                 'Deity Borrows 神假', 'Ghost Borrows 鬼假', 'Heaven Borrows 天假']
};
var _PALACE_DIR = {1:'N',2:'SW',3:'E',4:'SE',5:'C',6:'NW',7:'W',8:'NE',9:'S'};

/** Scan all 8 outer palaces for Qimen configs that match a Purpose.
 *  Returns [{label, palace, dir}] or empty array. */
function fsScanPurposeQimen(qmParams, purpose){
  if (!qmParams || !purpose) return [];
  var validLabels = PURPOSE_QIMEN_MAP[purpose];
  if (!validLabels || !validLabels.length) return [];
  if (typeof QMDJWaterScanner === 'undefined') return [];
  var results = [];
  for (var p = 1; p <= 9; p++){
    if (p === 5) continue; // skip center
    var res = QMDJWaterScanner.checkHourAtPalace(qmParams.Y, qmParams.M, qmParams.D,
                                                  qmParams.hGan, qmParams.hZhi, p);
    if (!res || !res.hits) continue;
    res.hits.forEach(function(h){
      if (validLabels.indexOf(h.label) !== -1){
        results.push({ label: h.label, palace: p, dir: _PALACE_DIR[p] || '?', method: 'flying' });
      }
    });
  }
  return results;
}

/** Scan rotating chart for Purpose-relevant Qimen configs (directional only, no FS stimulator).
 *  Returns [{label, palace, dir}] or empty array. */
function fsScanPurposeQimenRotating(qmParams, purpose){
  if (!qmParams || !purpose) return [];
  var validLabels = PURPOSE_QIMEN_MAP[purpose];
  if (!validLabels || !validLabels.length) return [];
  if (typeof QMDJWaterScanner === 'undefined' || typeof QMDJWaterScanner.getRotatingHourChart !== 'function') return [];
  var chart = QMDJWaterScanner.getRotatingHourChart(qmParams.Y, qmParams.M, qmParams.D,
                                                     qmParams.hGan, qmParams.hZhi);
  if (!chart) return [];
  var results = [];
  for (var p = 1; p <= 9; p++){
    if (p === 5) continue;
    var hits = QMDJWaterScanner.checkRotatingPalace(chart, p);
    if (!hits || !hits.length) continue;
    hits.forEach(function(h){
      if (validLabels.indexOf(h.label) !== -1){
        results.push({ label: h.label, palace: p, dir: _PALACE_DIR[p] || '?', method: 'rotating' });
      }
    });
  }
  return results;
}
var _scoreModeBalanced = false; // false = A Priority, true = Balanced (average of A and B)
var _listSortByScore   = false; // false = chronological, true = best hour first per day
var _listShowAll       = false; // false = positive only, true = show all hours (positive + negative)
// "Only with XKDG" toggles — independent for LIST and BEST.
// false (default) = permissive: an hour with NO XKDG relation is still shown
//   if it has Nayin Power AND score >= 8 (LIST_HIGH_SCORE_THRESHOLD).
// true  = strict: only hours with a real hexagram (XKDG) relation are shown.
var _listOnlyXKDG      = false;
var _bestOnlyXKDG      = false;

// ── 🏠 FS House Profile toggle (BEST + LIST) ──────────────────────
// When active, checks ALL houses of the active person simultaneously.
// Each date row shows badges for every house that has a connection.
var _fsHouseActive = false;
var _fsAllHouses   = [];       // cached array of all houses for active person
var _fsHousePersonName = null;
var _fsBadgeCache  = {};       // { "2026-05-25-5": [{...badges...}] } — for popup on click

function _fsGetAllHouses(){
  const person = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
  if (!person) return [];
  try {
    const all = JSON.parse(localStorage.getItem('xkdg_houses') || '{}');
    return all[person.name] || [];
  } catch(e) { return []; }
}

function toggleFsHouse(){
  if (_fsHouseActive) {
    _fsHouseActive = false;
    _fsAllHouses = [];
    return;
  }
  const houses = _fsGetAllHouses();
  if (!houses.length) {
    alert('No house profile saved for the active person.\nGo to the FS view → 🏠 HOUSE PROFILES → Save House.');
    return;
  }
  const person = (typeof fsGetActivePersonForHouse === 'function') ? fsGetActivePersonForHouse() : null;
  if (person) _fsHousePersonName = person.name;
  _fsAllHouses = houses;
  _fsHouseActive = true;
}

/** Check ALL houses against a day hexagram + optional Qimen params.
 *  v2: iterates over doors[] instead of single facing/xkdgWater.
 *  Returns array of { houseName, doorResults, qimenHits, hasFS, hasQimen } */
function fsComputeAllHousesBadges(dayHex, dayQi, dayYun, qmParams){
  if (!_fsHouseActive || !_fsAllHouses.length) return null;
  if (typeof fsSlotForDeg !== 'function') return null;

  var results = [];
  _fsAllHouses.forEach(function(house){
    var doors = house.doors || [];
    // Migrate on-the-fly if old format still in memory
    if (!doors.length && house.facing != null){
      doors = [{ name: 'Main door', facing: house.facing, water: house.xkdgWater || null }];
    }

    var doorResults = [];
    doors.forEach(function(door){
      if (door.facing == null) return;
      var fSlot = fsSlotForDeg(door.facing);
      if (!fSlot || !fSlot.hexNum) return;

      // Facing hex ↔ day hex
      var facingLabels = (typeof hexConnectionLabels === 'function')
        ? hexConnectionLabels(fSlot.hexNum, fSlot.qi, fSlot.yun, dayHex, dayQi, dayYun) : [];

      // Water hex ↔ day hex
      var waterLabels = [];
      var waterQimenHits = [];
      if (door.water != null) {
        var wSlot = fsSlotForDeg(door.water);
        if (wSlot && wSlot.hexNum && typeof hexConnectionLabels === 'function')
          waterLabels = hexConnectionLabels(wSlot.hexNum, wSlot.qi, wSlot.yun, dayHex, dayQi, dayYun);

        // NEW: Qimen palace check for XKDG Water degree
        if (qmParams && typeof QMDJWaterScanner !== 'undefined') {
          var scanner = QMDJWaterScanner;
          var wPalace = scanner.degToPalace(door.water);
          if (wPalace) {
            var res = scanner.checkHourAtPalace(qmParams.Y, qmParams.M, qmParams.D,
                                                 qmParams.hGan, qmParams.hZhi, wPalace);
            if (res && res.matched) {
              var hitLabels = (res.hits || []).map(function(h){ return h.label || h.cat || String(h); });
              waterQimenHits.push({ name: door.name, dir: '', palace: wPalace, hits: hitLabels, score: res.score || 0, isXkdgWater: true });
            }
          }
        }
      }

      if (facingLabels.length || waterLabels.length || waterQimenHits.length) {
        doorResults.push({
          doorName: door.name,
          facingLabels: facingLabels,
          waterLabels: waterLabels,
          waterQimenHits: waterQimenHits
        });
      }
    });

    // Star Waters — Qimen palace check (unchanged)
    var qimenHits = [];
    var waters = house.waters || [];
    if (qmParams && waters.length > 0 && typeof QMDJWaterScanner !== 'undefined') {
      var scanner = QMDJWaterScanner;
      waters.forEach(function(w){
        var palace = w.palace || (w.deg != null ? scanner.degToPalace(w.deg) : null);
        if (!palace) return;
        var res = scanner.checkHourAtPalace(qmParams.Y, qmParams.M, qmParams.D,
                                             qmParams.hGan, qmParams.hZhi, palace);
        if (res && res.matched) {
          var hitLabels = (res.hits || []).map(function(h){ return h.label || h.cat || String(h); });
          qimenHits.push({ name: w.name, dir: w.dir || '', palace: palace, hits: hitLabels, score: res.score || 0 });
        }
      });
    }

    // ── QFS Zones — Qimen Star ↔ Flying Star match + 2-of-3 conditions ──
    var zoneHits = [];
    var zones = house.zones || [];
    if (qmParams && zones.length > 0 &&
        house.houseFacing != null && house.period != null &&
        typeof QMDJWaterScanner !== 'undefined' && typeof FlyingStars !== 'undefined' &&
        typeof fsMountainCharFromDeg === 'function') {
      // Compute FS chart once per house
      var _fsMtn = fsMountainCharFromDeg(house.houseFacing);
      var _fsChart;
      try { _fsChart = FlyingStars.calculate(house.period, _fsMtn); } catch(e){ _fsChart = null; }
      if (_fsChart) {
        // Palace → grid index for FS chart arrays
        var _P2I = {4:0, 9:1, 2:2, 3:3, 5:4, 7:5, 8:6, 1:7, 6:8};
        // Qimen star English name → Luo Shu number
        var _QS2N = {'Grass':1,'Rice':2,'Aggressor':3,'Assistant':4,'Fowl':5,'Heart':6,'Pillar':7,'Official':8,'Hero':9};
        var _palDir = {1:'N',2:'SW',3:'E',4:'SE',5:'C',6:'NW',7:'W',8:'NE',9:'S'};
        // Get Qimen chart for this hour
        var _qmChart = QMDJWaterScanner.getHourChart(qmParams.Y, qmParams.M, qmParams.D,
                                                      qmParams.hGan, qmParams.hZhi);
        if (_qmChart) {
          zones.forEach(function(z){
            var gIdx = _P2I[z.palace];
            if (gIdx === undefined) return;
            // Target FS star in this palace
            var fsStar = (z.target === 'water') ? _fsChart.facingStars[gIdx] : _fsChart.sittingStars[gIdx];
            // Qimen palace data
            var pd = _qmChart.palaces[z.palace];
            if (!pd || !pd.star) return;
            var qmStarNum = _QS2N[pd.star];
            if (!qmStarNum || qmStarNum !== fsStar) return;  // star mismatch
            // Check 2-of-3 conditions
            var conds = [];
            if (pd.deity === 'Commander') conds.push('值符 Zhi Fu');
            if (pd.tiH && ['乙','丙','丁'].indexOf(pd.tiH) !== -1)
              conds.push('三奇 ' + pd.tiH);
            if (pd.door && ['Open','Rest','Birth','View'].indexOf(pd.door) !== -1)
              conds.push('吉門 ' + pd.door);
            if (conds.length < 2) return;  // need at least 2 of 3
            // Match!
            var targetLabel = (z.target === 'water' ? 'Water' : 'Mountain') + ' ★' + fsStar;
            zoneHits.push({
              name: z.name,
              palace: z.palace,
              dir: _palDir[z.palace] || '',
              targetLabel: targetLabel,
              qmStar: pd.star + ' ★' + qmStarNum,
              conditions: conds,
              score: conds.length
            });
          });
        }
      }
    }

    var hasFS    = doorResults.length > 0;
    var hasQimen = qimenHits.length > 0 || doorResults.some(function(dr){ return dr.waterQimenHits.length > 0; });
    var hasQFS   = zoneHits.length > 0;
    if (hasFS || hasQimen || hasQFS) {
      results.push({
        houseName: house.name, doorResults: doorResults,
        qimenHits: qimenHits, zoneHits: zoneHits,
        hasFS: hasFS, hasQimen: hasQimen, hasQFS: hasQFS
      });
    }
  });
  return results.length ? results : null;
}

function fsBuildHouseBadgeHtml(badges, cacheKey){
  if (!badges || !badges.length) return '';
  if (cacheKey) _fsBadgeCache[cacheKey] = badges;
  return badges.map(function(b){
    var icon, color;
    if (b.hasQFS) { icon = '🏠🌀★'; color = '#7b1fa2'; }
    else if (b.hasFS && b.hasQimen) { icon = '🏠✓🌀'; color = '#00695c'; }
    else if (b.hasFS) { icon = '🏠✓'; color = '#2e7d32'; }
    else { icon = '🏠🌀'; color = '#1565c0'; }
    var ck = (cacheKey || '').replace(/'/g, "\\'");
    return '<span style="font-size:13px;font-weight:bold;color:' + color +
           ';cursor:pointer;white-space:nowrap;" onclick="event.stopPropagation();fsShowHousePopup(\'' +
           ck + '\')">' + icon + ' <span style="font-size:10px;">' + b.houseName.replace(/</g,'&lt;') + '</span></span>';
  }).join(' ');
}

/** Show FS detail popup for a cached badge key */
function fsShowHousePopup(cacheKey){
  var badges = _fsBadgeCache[cacheKey];
  if (!badges || !badges.length) return;
  var old = document.getElementById('fs-house-popup');
  if (old) old.remove();
  var html = '<div style="font-weight:bold;font-size:14px;margin-bottom:8px;">🏠 Feng Shui — this hour</div>';
  badges.forEach(function(b){
    var icon = (b.hasFS && b.hasQimen) ? '✓🌀' : b.hasFS ? '✓' : '🌀';
    html += '<div style="background:#f1f8e9;border:1px solid #a5d6a7;border-radius:6px;padding:8px;margin-bottom:6px;">';
    html += '<div style="font-weight:bold;color:#2e7d32;font-size:13px;">🏠 ' + b.houseName + ' ' + icon + '</div>';

    // Door results
    (b.doorResults || []).forEach(function(dr){
      html += '<div style="margin-top:4px;padding-left:6px;border-left:2px solid #c9a84c;">';
      html += '<div style="font-size:11px;font-weight:bold;color:#8a6a1f;">🚪 ' + dr.doorName + '</div>';
      if (dr.facingLabels && dr.facingLabels.length)
        html += '<div style="font-size:12px;margin-top:2px;">Door ↔ Day: <strong>' + dr.facingLabels.join(', ') + '</strong></div>';
      if (dr.waterLabels && dr.waterLabels.length)
        html += '<div style="font-size:12px;margin-top:2px;">🌊 Water ↔ Day: <strong>' + dr.waterLabels.join(', ') + '</strong></div>';
      (dr.waterQimenHits || []).forEach(function(qh){
        html += '<div style="font-size:12px;margin-top:2px;">🌊🌀 Water Qimen (Palace ' + qh.palace + '): <strong>' + (qh.hits||[]).join(', ') + '</strong></div>';
      });
      html += '</div>';
    });

    // Star Water Qimen hits
    (b.qimenHits || []).forEach(function(qh){
      html += '<div style="font-size:12px;margin-top:2px;">🐟 ' + qh.name + ' (' + (qh.dir||'Palace '+qh.palace) + '): <strong>' + (qh.hits||[]).join(', ') + '</strong></div>';
    });

    // QFS Zone hits
    (b.zoneHits || []).forEach(function(zh){
      html += '<div style="margin-top:4px;padding-left:6px;border-left:2px solid #7b1fa2;">';
      html += '<div style="font-size:11px;font-weight:bold;color:#7b1fa2;">🌀 ' + zh.name + ' (Palace ' + zh.palace + ' ' + zh.dir + ')</div>';
      html += '<div style="font-size:12px;">Target: <strong>' + zh.targetLabel + '</strong> = Qimen: <strong>' + zh.qmStar + '</strong> ✓</div>';
      html += '<div style="font-size:11px;color:#4a148c;">Conditions (' + zh.conditions.length + '/3): ' + zh.conditions.join(' · ') + '</div>';
      html += '</div>';
    });

    html += '</div>';
  });
  html += '<div style="text-align:right;margin-top:6px;"><button onclick="document.getElementById(\'fs-house-popup\').remove()" style="background:#888;color:#fff;border:none;border-radius:4px;padding:6px 16px;font-size:12px;cursor:pointer;">Close</button></div>';
  var popup = document.createElement('div');
  popup.id = 'fs-house-popup';
  popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid #2e7d32;border-radius:12px;padding:16px;max-width:360px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:9999;max-height:80vh;overflow-y:auto;';
  popup.innerHTML = html;
  document.body.appendChild(popup);
}


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
    // Sync the FS-view clone Purpose selector
    if(typeof fsUpdatePurposeClone === 'function') fsUpdatePurposeClone();
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
    // IMPORTANT: do NOT fall back to _currentDayAnalysis here. That global is set
    // for the date loaded in MAIN — during a scan loop it refers to the WRONG
    // date and would silently make every scanned date inherit MAIN's stems.
    // The pillarsObj passed in IS the date being checked.
    if (!pillarsObj) return false;
    return ['hour','day','month','year'].some(function(k) {
        var stem   = (pillarsObj[k] && pillarsObj[k].stem)   || '';
        var branch = (pillarsObj[k] && pillarsObj[k].branch) || '';
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

    // Negative spirits that disqualify per purpose.
    // CRITICAL: the scan's analysisItems does NOT contain spirit-bad entries
    // (analyzeXkdg doesn't add the hour spirit) — so checking only `items` would
    // let every bad spirit slip through. We check `hourSpirit` directly first.
    var spiritName = items.filter(function(i){ return i.tag==='spirit-bad'; }).map(function(i){ return i.text; });
    function hasBadSpirit(name) {
        if (hourSpirit && !hourSpirit.auspicious && hourSpirit.en && hourSpirit.en.indexOf(name) >= 0) return true;
        return spiritName.some(function(t){ return t.indexOf(name) >= 0; });
    }

    if (purpose === 'health') {
        if (hasBadSpirit('Heaven Penalty') || hasBadSpirit('White Tiger') || hasBadSpirit('Gou Chen')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Cerulean Dragon') spiritBonus += 2; // vitality
        if (hourSpirit && hourSpirit.en === 'Jade Hall')       spiritBonus += 2; // comfort/healing
        // Parent must be somewhere in the date; +2 bonus if it's specifically the day pillar
        var hasAnyParentH = pillarsObj && hasParentInScanPillars(pillarsObj, fullBLFamily);
        if (!hasAnyParentH) return false;
        if (dayRole === 'parent') spiritBonus += 2;
        var personDayStemA = _personADayStem || null;
        var personDayStemB = _personBDayStem || null;
        var isDayTYforPerson = (personDayStemA && TIAN_YI[personDayStemA] === dZhi) ||
                               (personDayStemB && TIAN_YI[personDayStemB] === dZhi);
        return hasTY || isDayTYforPerson;
    }
    if (purpose === 'career') {
        if (hasBadSpirit('Red Bird') || hasBadSpirit('Heaven Prison') || hasBadSpirit('Gou Chen') || hasBadSpirit('Heaven Penalty')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Bright Hall')  spiritBonus += 2; // visibility/recognition
        if (hourSpirit && hourSpirit.en === 'Fate Master')  spiritBonus += 2; // official positions
        if (hasLu) spiritBonus += 2; // prosperity
        // Parent must be somewhere in the date; +2 bonus if it's specifically the day pillar
        var hasAnyParentC = pillarsObj && hasParentInScanPillars(pillarsObj, fullBLFamily);
        if (!hasAnyParentC) return false;
        if (dayRole === 'parent') spiritBonus += 2;
        return hasNoble;
    }
    if (purpose === 'wealth') {
        if (hasBadSpirit('Black Tortoise') || hasBadSpirit('Heaven Prison')) return false;
        // Positive bonuses
        if (hourSpirit && hourSpirit.en === 'Golden Box')      spiritBonus += 2;
        if (hourSpirit && hourSpirit.en === 'Cerulean Dragon') spiritBonus += 2;
        if (hourSpirit && hourSpirit.en === 'Jade Hall')       spiritBonus += 2;
        var wealthPass = dayRole === 'child' && pillarsObj && hasParentInScanPillars(pillarsObj, fullBLFamily);
        if (!wealthPass) return false;

        // Read pillar data from pillarsObj (the scan date) — NOT _currentDayAnalysis
        // which would point to MAIN's loaded date during a scan loop.
        var dayPillarsX = pillarsObj || {};
        var hGanW  = (dayPillarsX.hour  && dayPillarsX.hour.stem)  || '';
        var mGanW  = (dayPillarsX.month && dayPillarsX.month.stem) || '';
        var yGanW  = (dayPillarsX.year  && dayPillarsX.year.stem)  || '';
        var hQiW   = (dayPillarsX.hour  && dayPillarsX.hour.qi  != null) ? dayPillarsX.hour.qi  : null;
        var mQiW   = (dayPillarsX.month && dayPillarsX.month.qi != null) ? dayPillarsX.month.qi : null;
        var yQiW   = (dayPillarsX.year  && dayPillarsX.year.qi  != null) ? dayPillarsX.year.qi  : null;
        var dQiW   = (dayPillarsX.day   && dayPillarsX.day.qi   != null) ? dayPillarsX.day.qi   : null;
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
            // No _currentDayAnalysis fallback — that would inherit MAIN's date during scan
            var s = (pillarsObj[k] && pillarsObj[k].stem)   || '';
            var b = (pillarsObj[k] && pillarsObj[k].branch) || '';
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
            // Branches of the SCAN date (not the MAIN-loaded date)
            var dateBranches2 = pillarsObj
              ? ['hour','day','month','year']
                  .map(function(k){ return (pillarsObj[k] && pillarsObj[k].branch) || ''; })
                  .filter(function(b){ return !!b; })
              : [];
            var personPHorDS = dateBranches2.some(function(b) {
                return (phA && b === phA) || (phB && b === phB) ||
                       (dsA && b === dsA) || (dsB && b === dsB);
            });
            if (!personPHorDS) return false;
        }
        // The day stem/branch ARE dGan/dZhi (the scan date's day pillar)
        var dayBranchCurrent = dZhi || (pillarsObj && pillarsObj.day && pillarsObj.day.branch) || null;
        var dayStemCurrent   = dGan || (pillarsObj && pillarsObj.day && pillarsObj.day.stem)   || null;
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
        var dateDayBranchSp = dZhi || (pillarsObj && pillarsObj.day && pillarsObj.day.branch) || '';
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
    else if (_currentMode === 'cal') {
        // ✈ Flight calendar mode: the ✈ badges are drawn from _flightBestByDay,
        // which is built ONLY from _scanResults — and _scanResults is refreshed ONLY
        // by runScanner(). buildCalView() alone just redraws the (stale) data, so
        // raising DAYS would widen the calendar grid WITHOUT adding new flight badges.
        // To make DAYS actually extend the flight scan, re-run the scanner across the
        // full DAYS window first, then redraw. setMode('cal') resets _fsFlightCalMode,
        // so we restore it right after (same sequence used by _fsScanMonthForFlights).
        if (window._fsFlightCalMode) {
            runScanner();
            setMode('cal');               // hide the scan-results list, show the calendar
            window._fsFlightCalMode = true;
            buildCalView();
        } else {
            buildCalView();
        }
    }
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

    const startDateObj = new Date(startDate + 'T12:00:00');
    const jieqiMapTV = buildJieqiMap(startDateObj.getFullYear() - 1, startDateObj.getFullYear() + 1, offsetMin);
    const MONTH_START_JQ_TV = ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'];

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

        // Get day/month/year JiaZi (noon, in true solar time)
        let dGan, dZhi, mGan, mZhi, yGan, yZhi;
        const _P0 = (typeof _tstPillarsFor === 'function') ? _tstPillarsFor(isoDate, '12:00') : null;
        if (_P0) {
            dGan = _P0.day.charAt(0);  dZhi = _P0.day.charAt(1);
            mGan = _P0.month.charAt(0); mZhi = _P0.month.charAt(1);
            yGan = _P0.year.charAt(0);  yZhi = _P0.year.charAt(1);
        } else {
            let bd0 = new Date(dayDate); bd0.setHours(12, 0, 0, 0);
            const ec0 = Solar.fromDate(new Date(bd0.getTime() + offsetMin * 60000)).getLunar().getEightChar();
            dGan = ec0.getDayGan(); dZhi = ec0.getDayZhi();
            mGan = ec0.getMonthGan(); mZhi = ec0.getMonthZhi();
            yGan = ec0.getYearGan();  yZhi = ec0.getYearZhi();
        }
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
            // Zi second half range label (wall-clock + TST annotation when they differ).
            const ziTimeLabel2 = formatTSTRange('00:00', '01:00');
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
            html += `<tr style="cursor:pointer;" onclick="loadDateIntoMain('${localISODate(dayDate)}',0,true);window.scrollTo({top:0,behavior:'smooth'});" onmouseover="this.style.filter='brightness(0.92)'" onmouseout="this.style.filter=''">`;
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
                <div style="font-size:8px;color:#888;">${getTSTHourLabel(h)}</div>
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

            // Jieqi banner row in TABLES — inserted AFTER the hour row where it falls
            const jqTV = jieqiMapTV[isoDate] || [];
            const hStartMinTV = HOUR_STARTS[h] * 60;
            const jqMatchTV = jqTV.filter(j => {
                if (!j.time) return false;
                const [jh,jm] = j.time.split(':').map(Number);
                const jMin = jh*60+jm;
                if (h === 0) return jMin >= 23*60 || jMin < 60;
                return jMin >= hStartMinTV && jMin < hStartMinTV + 120;
            });
            if (jqMatchTV.length) {
                html += jqMatchTV.map(j => {
                    const isJ = MONTH_START_JQ_TV.includes(j.name);
                    const bg = isJ ? '#1565c0' : '#e65100';
                    return `<tr><td colspan="3" style="text-align:center;padding:4px;background:${bg};color:#fff;font-weight:bold;font-size:11px;letter-spacing:1px;">── ${isJ?'节':'气'} ${j.name} ${j.wall||j.time}${j.wall?' (TST '+j.time+')':''} ──</td></tr>`;
                }).join('');
            }
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
        const _PA = (typeof _tstPillarsFor === 'function') ? _tstPillarsFor(birthDate, birthTime) : null;
        if (_PA) { pYStem = _PA.year.charAt(0); pYBranch = _PA.year.charAt(1); }
        else {
            const bEC = Solar.fromDate(new Date(new Date(`${birthDate}T${birthTime}`).getTime() + offsetMin * 60000)).getLunar().getEightChar();
            pYStem = bEC.getYearGan(); pYBranch = bEC.getYearZhi();
        }
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

    // Person star data for CAL scoring — matches LIST view
    const pNobleCAL = personDayStemCAL ? (NOBLE_BRANCHES[personDayStemCAL] || []) : [];
    const pLuCAL    = personDayStemCAL ? (LU_BRANCH[personDayStemCAL] || null) : null;
    const pHVCAL    = personMthBranchCAL ? (HEAVEN_VIRTUE[personMthBranchCAL] || null) : null;
    const pBVCAL    = personDayZhiCAL ? (BRANCH_VIRTUE[personDayZhiCAL] || null) : null;
    const pMVCAL    = personMthBranchCAL ? (MONTH_VIRTUE[personMthBranchCAL] || null) : null;
    const pTYCAL    = personDayStemCAL ? (TIAN_YI[personDayStemCAL] || null) : null;

    // Person B year for CAL scoring
    const personBYear_CAL = _personBYear || null;
    const pBYStem_CAL     = _personBStem  || null;
    const pBYBranch_CAL   = _personBBranch || null;
    const personBDayStemCAL   = _personBDayStem || null;
    const personBMthBranchCAL = _personBMonthBranch || null;
    const personBDayZhiCAL    = _personBDayBranchXkdg || null;
    const pNobleBCAL = personBDayStemCAL ? (NOBLE_BRANCHES[personBDayStemCAL] || []) : [];
    const pLuBCAL    = personBDayStemCAL ? (LU_BRANCH[personBDayStemCAL] || null) : null;
    const pHVBCAL    = personBMthBranchCAL ? (HEAVEN_VIRTUE[personBMthBranchCAL] || null) : null;
    const pBVBCAL    = personBDayZhiCAL ? (BRANCH_VIRTUE[personBDayZhiCAL] || null) : null;
    const pMVBCAL    = personBMthBranchCAL ? (MONTH_VIRTUE[personBMthBranchCAL] || null) : null;
    const pTYBCAL    = personBDayStemCAL ? (TIAN_YI[personBDayStemCAL] || null) : null;

    // Active person fallback (A if loaded, else B) — mirrors LIST logic
    const activeYearCAL   = personAYear || personBYear_CAL || null;
    const activeStemCAL   = pYStem   || pBYStem_CAL   || null;
    const activeBranchCAL = pYBranch || pBYBranch_CAL || null;
    const activeNobleCAL  = personAYear ? pNobleCAL : pNobleBCAL;
    const activeLuCAL     = personAYear ? pLuCAL    : pLuBCAL;
    const activeHVCAL     = personAYear ? pHVCAL    : pHVBCAL;
    const activeBVCAL     = personAYear ? pBVCAL    : pBVBCAL;
    const activeMVCAL     = personAYear ? pMVCAL    : pMVBCAL;
    const activeTYCAL     = personAYear ? pTYCAL    : pTYBCAL;

    // A/B person markers for CAL view — always visible when a person is loaded
    // (matches LIST/BEST behaviour; only TABLES has its own per-date connection logic).
    const _aLoadedCAL = !!_personAYear;
    const _bLoadedCAL = !!_personBYear;
    const personTagsCAL = (_aLoadedCAL ? '<span style="font-size:11px;font-weight:bold;color:#2e7d32;margin-left:3px;">A</span>' : '')
                       + (_bLoadedCAL ? '<span style="font-size:11px;font-weight:bold;color:#7b1fa2;margin-left:1px;">B</span>' : '');
    const start    = new Date(startDate + 'T00:00:00');
    // Always start from day 1 of the start month for full calendar view
    const calMonthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const endDate  = new Date(start.getTime() + days * 86400000);
    // Extend end to last day of the end month
    const calMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    const jieqiMap = buildJieqiMap(calMonthStart.getFullYear() - 1, calMonthEnd.getFullYear() + 1, offsetMin);
    const today    = new Date().toISOString().split('T')[0];
    const DOW      = ['Mo','Tu','We','Th','Fr','Sa','Su'];

    // ✈ Flight mode: annotate each favourable day with the best departure HOUR
    // from the last direction-filtered scan (_scanResults). Only active right
    // after "SCAN flight dates" (window._fsFlightCalMode), reset on any mode change.
    const _flightBestByDay = {};
    if (window._fsFlightCalMode && typeof _scanResults !== 'undefined' && _scanResults && _scanResults.length) {
        _scanResults.forEach(function(r){
            if (!r || !r.isoDate || r.score == null) return;
            const c = _flightBestByDay[r.isoDate];
            if (!c || r.score > c.score) _flightBestByDay[r.isoDate] = r;
        });
    }
    window._fsFlightBestByDay = _flightBestByDay;  // for the "search ALL favourable flights" action
    function _flightHourCell(iso){
        const r = _flightBestByDay[iso];
        if (!r) return '';
        const hr = r.hour || ((typeof HOUR_ROMAN !== 'undefined' && HOUR_ROMAN[r.hourIndex]) ? HOUR_ROMAN[r.hourIndex] : '');
        const civ = (typeof fsFlightCivil === 'function') ? fsFlightCivil(iso, r.hourIndex) : null;
        const civTxt = civ ? civ.hhmm : '';
        let out = '<div title="Suggested departure (TST)" style="margin-top:2px;background:#1565c0;color:#fff;border-radius:5px;padding:1px 3px;font-size:9px;font-weight:bold;text-align:center;line-height:1.25;">✈ ' + hr + ' · ' + r.score + '</div>';
        out += '<button onclick="event.stopPropagation();fsFlightSearch(\'' + iso + '\',' + r.hourIndex + ')" title="Search flights' + (civTxt ? ' — civil departure ' + civTxt : '') + '" style="margin-top:2px;width:100%;background:#0b8043;color:#fff;border:none;border-radius:5px;padding:1px 3px;font-size:9px;font-weight:bold;cursor:pointer;line-height:1.25;">🔎 ' + (civTxt || 'flights') + '</button>';
        return out;
    }

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

        // Compute Y and M pillars for this calendar month, using day 15 as the
        // reference (always past the month's 节 / jieqi, which falls in the first
        // ~10 days). This way the header reflects the M pillar that's dominant
        // for the calendar month — without this, brief leftovers from the previous
        // lunar month (the first 4-9 days) would mislead the header.
        const _calHdrRefDay = Math.min(15, new Date(yr, mo, 0).getDate());
        const _calHdrRef = new Date(yr, mo-1, _calHdrRefDay, 12, 0, 0);
        const _calHdrEC = Solar.fromDate(new Date(_calHdrRef.getTime() + offsetMin * 60000)).getLunar().getEightChar();
        const _yGanMo = _calHdrEC.getYearGan(),  _yZhiMo = _calHdrEC.getYearZhi();
        const _mGanMo = _calHdrEC.getMonthGan(), _mZhiMo = _calHdrEC.getMonthZhi();

        html += `<div style="display:flex;align-items:center;gap:14px;margin:10px 0 5px;flex-wrap:wrap;">
            <div style="display:flex;gap:14px;">
                <div style="text-align:center;line-height:1.1;">
                    <div style="font-size:9px;color:#888;font-weight:normal;">M</div>
                    <div style="color:#880e4f;font-weight:bold;font-size:15px;">${_mGanMo}</div>
                    <div style="color:#880e4f;font-weight:bold;font-size:15px;">${_mZhiMo}</div>
                </div>
                <div style="text-align:center;line-height:1.1;">
                    <div style="font-size:9px;color:#888;font-weight:normal;">Y</div>
                    <div style="color:#880e4f;font-weight:bold;font-size:15px;">${_yGanMo}</div>
                    <div style="color:#880e4f;font-weight:bold;font-size:15px;">${_yZhiMo}</div>
                </div>
            </div>
            <div style="font-weight:bold;font-size:14px;color:#795548;">${monthName}</div>
        </div>`;
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
                    const jqBg = isJie ? '#1565c0' : '#ff9800';
                    return `<div style="display:inline-block;background:${jqBg};color:#fff;font-weight:bold;font-size:11px;padding:2px 6px;border-radius:6px;margin-top:2px;margin-right:2px;line-height:1.2;">${isJie?'节':'气'} ${j.name}${j.wall ? ' '+j.wall+' (TST '+j.time+')' : (j.time ? ' '+j.time : '')}</div>`;
                }).join('');
                html += `<div class="cal-cell${isToday?' today':''}" style="opacity:${isInRange?1:0.4};" onclick="showDayInList('${isoDate}')">
                    <div style="display:flex;justify-content:space-between;">
                        <span class="cal-day-num">${dd}${personTagsCAL}</span>
                        <span class="cal-stem" style="color:${stemColor2};font-size:9px;">${dGan}<br>${dZhi}</span>
                    </div>${jqHtmlSimple}${_flightHourCell(isoDate)}</div>`;
                continue;
            }

            const mGan = eightChar.getMonthGan(), mZhi = eightChar.getMonthZhi();
            const yGan = eightChar.getYearGan(), yZhi = eightChar.getYearZhi();

            // Check best hour of the day
            let dayIsPositive = false, dayIsFavourable = false, dayIsFamily = false;
            let dayBestScore = 0;

            // ── Daily average score (positive hours add, negative hours subtract) ──
            // Each hour contributes either +calcHourScore (when not flagged as
            // negative) or −calcNegativeScore (when calcNegativeScore > 0, i.e.
            // the hour would appear under the NEGATIVES chip). Averaged across
            // all 12 hours (+ Zi second half) at the end of the loops to decide
            // the cell's background color.
            let dayScoreSum = 0;
            let dayScoreCount = 0;
            const _dayClashTypeForScore = getClashType(dGan, dZhi, yZhi, mGan, mZhi);

            // ── ZI SECOND HALF (00:00-01:00) ──
            // Il ciclo standard sotto controlla hs=23 (23:30, prima metà dell'ora 子
            // del GIORNO CN SUCCESSIVO) ma NON controlla la seconda metà dell'ora 子
            // di QUESTO giorno (00:00-01:00). LIST mostra invece questa fascia in una
            // riga separata all'inizio di ogni giornata: senza questo controllo, i
            // giorni le cui uniche relazioni positive cadono in 00:00-01:00 restano
            // bianchi in CAL. Vedi righe ~3424-3488 (zi second half in LIST).
            {
                const bdZi2 = new Date(dayDate); bdZi2.setHours(0, 30, 0, 0);
                const sdZi2 = new Date(bdZi2.getTime() + offsetMin * 60000);
                const ecZi2 = Solar.fromDate(bdZi2).getLunar().getEightChar();
                const hGZi2 = ecZi2.getTimeGan(), hZZi2 = ecZi2.getTimeZhi();
                const hDZi2 = getXkdgData(hGZi2, hZZi2);
                if (hDZi2) {
                    const { strong: ziSS, growing: ziSG } = getJieqiSeason(sdZi2);
                    const ziPillarsCAL = buildResolvedPillars(yGan, yZhi, mGan, mZhi, dGan, dZhi, hGZi2, hZZi2);
                    const { items: ziItemsCAL } = analyzeXkdg(ziPillarsCAL, ziSS, ziSG);
                    const ziBlueCAL = ziItemsCAL.filter(i => i.tag === 'blue' || i.tag === 'family');
                    const ziSpiritCAL = getSpiritForHour(dZhi, hZZi2);
                    let ziScoreCAL;
                    if (personAYear && personBYear_CAL && _scoreModeBalanced) {
                        const sA_zi = calcHourScore(dGan, dZhi, hGZi2, hZZi2, mGan, mZhi, yGan, yZhi, ziItemsCAL, ziSpiritCAL, ziSS, ziSG, personAYear, pYStem, pYBranch, pNobleCAL, pLuCAL, pHVCAL, pBVCAL, pMVCAL, pTYCAL, ziPillarsCAL);
                        const sB_zi = calcHourScore(dGan, dZhi, hGZi2, hZZi2, mGan, mZhi, yGan, yZhi, ziItemsCAL, ziSpiritCAL, ziSS, ziSG, personBYear_CAL, pBYStem_CAL, pBYBranch_CAL, pNobleBCAL, pLuBCAL, pHVBCAL, pBVBCAL, pMVBCAL, pTYBCAL, ziPillarsCAL);
                        ziScoreCAL = Math.round((sA_zi + sB_zi) / 2);
                    } else {
                        ziScoreCAL = calcHourScore(dGan, dZhi, hGZi2, hZZi2, mGan, mZhi, yGan, yZhi, ziItemsCAL, ziSpiritCAL, ziSS, ziSG, activeYearCAL, activeStemCAL, activeBranchCAL, activeNobleCAL, activeLuCAL, activeHVCAL, activeBVCAL, activeMVCAL, activeTYCAL, ziPillarsCAL);
                    }
                    const ziNayinCAL = analyzeNayin(dGan, dZhi, hGZi2, hZZi2, mGan, mZhi, yGan, yZhi, pYStem, pYBranch, null, null);
                    const ziNegScoreCAL = calcNegativeScore({
                        dGan, dZhi, hGan: hGZi2, hZhi: hZZi2,
                        mGan, mZhi, yGan, yZhi,
                        analysisItems: ziItemsCAL, dayClashType: _dayClashTypeForScore,
                        seasonStrong: ziSS, seasonGrowing: ziSG,
                        nayinLabel: ziNayinCAL.label,
                        nayinPersonScore: ziNayinCAL.personScore || 0
                    });
                    // Signed contribution to day average
                    dayScoreSum += ziScoreCAL;
                    dayScoreCount++;
                    if (ziBlueCAL.length > 0) {
                        dayIsPositive = true;
                        if (ziBlueCAL.some(i => i.tag === 'family')) dayIsFamily = true;
                        if (ziScoreCAL > dayBestScore) dayBestScore = ziScoreCAL;
                        if (personAYear) {
                            const dDataZi = getXkdgData(dGan, dZhi);
                            if (dDataZi) {
                                const mLabelsZi = getMatchLabels(personAYear, pYStem, pYBranch, dDataZi, dGan, dZhi, null, null, null);
                                if (mLabelsZi.length > 0) dayIsFavourable = true;
                                else if (_xkConnectsAny(personAYear, pYStem, pYBranch, dDataZi.qi, dDataZi.yun, dDataZi.hex, dGan, dZhi)) dayIsFavourable = true;
                            }
                        }
                    }
                }
            }

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
                const hSpirit = getSpiritForHour(dZhi, hZ);

                // Score the hour — balanced mode uses average(A,B), else active person
                let hScore;
                if (personAYear && personBYear_CAL && _scoreModeBalanced) {
                    const sA_h = calcHourScore(dGan, dZhi, hG, hZ, mGan, mZhi, yGan, yZhi, hItems, hSpirit, hSS, hSG, personAYear, pYStem, pYBranch, pNobleCAL, pLuCAL, pHVCAL, pBVCAL, pMVCAL, pTYCAL, hPillars);
                    const sB_h = calcHourScore(dGan, dZhi, hG, hZ, mGan, mZhi, yGan, yZhi, hItems, hSpirit, hSS, hSG, personBYear_CAL, pBYStem_CAL, pBYBranch_CAL, pNobleBCAL, pLuBCAL, pHVBCAL, pBVBCAL, pMVBCAL, pTYBCAL, hPillars);
                    hScore = Math.round((sA_h + sB_h) / 2);
                } else {
                    hScore = calcHourScore(dGan, dZhi, hG, hZ, mGan, mZhi, yGan, yZhi, hItems, hSpirit, hSS, hSG, activeYearCAL, activeStemCAL, activeBranchCAL, activeNobleCAL, activeLuCAL, activeHVCAL, activeBVCAL, activeMVCAL, activeTYCAL, hPillars);
                }
                // Negative score (higher = worse, > 0 means NEGATIVES chip would catch it)
                const hNayin = analyzeNayin(dGan, dZhi, hG, hZ, mGan, mZhi, yGan, yZhi, pYStem, pYBranch, null, null);
                const hNegScore = calcNegativeScore({
                    dGan, dZhi, hGan: hG, hZhi: hZ,
                    mGan, mZhi, yGan, yZhi,
                    analysisItems: hItems, dayClashType: _dayClashTypeForScore,
                    seasonStrong: hSS, seasonGrowing: hSG,
                    nayinLabel: hNayin.label,
                    nayinPersonScore: hNayin.personScore || 0
                });
                // Signed contribution: −negScore if meaningfully negative, +hScore otherwise
                dayScoreSum += hScore;
                dayScoreCount++;

                if (hBlue.length > 0) {
                    dayIsPositive = true;
                    if (hBlue.some(i => i.tag === 'family')) dayIsFamily = true;
                    if (hScore > dayBestScore) dayBestScore = hScore;
                    if (personAYear) {
                        const dDataCAL = getXkdgData(dGan, dZhi);
                        if (dDataCAL) {
                            const matchLabels = getMatchLabels(personAYear, pYStem, pYBranch, dDataCAL, dGan, dZhi, null, null, null);
                            if (matchLabels.length > 0) dayIsFavourable = true;
                            else if (_xkConnectsAny(personAYear, pYStem, pYBranch, dDataCAL.qi, dDataCAL.yun, dDataCAL.hex, dGan, dZhi)) dayIsFavourable = true;
                        }
                    }
                }
            }

            // ── Background color based on DAILY AVERAGE score ──
            // Family pillars always win (yellow). Otherwise:
            //   avg > 6   → progressive green (lighter to darker as score rises)
            //   avg 0..6  → white (neutral)
            //   avg < 0   → progressive red (lighter to darker as score drops)
            const dayAvgScore = dayScoreCount > 0 ? dayScoreSum / dayScoreCount : 0;
            let calGreenBg, calBorder;
            if (dayIsFamily) {
                calGreenBg = '#fffde7';
                calBorder  = '#f9a825';
            } else if (dayAvgScore > 10) {
                calGreenBg = '#a5d6a7'; calBorder = '#1b5e20';
            } else if (dayAvgScore > 8) {
                calGreenBg = '#c8e6c9'; calBorder = '#2e7d32';
            } else if (dayAvgScore > 6) {
                calGreenBg = '#dcedc8'; calBorder = '#558b2f';
            } else if (dayAvgScore >= 0) {
                calGreenBg = '';        calBorder = '';        // white / neutral
            } else if (dayAvgScore > -2) {
                calGreenBg = '#ffebee'; calBorder = '#ef9a9a';
            } else if (dayAvgScore > -4) {
                calGreenBg = '#ffcdd2'; calBorder = '#ef5350';
            } else if (dayAvgScore > -6) {
                calGreenBg = '#ef9a9a'; calBorder = '#d32f2f';
            } else {
                calGreenBg = '#e57373'; calBorder = '#c62828';
            }

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
            // Day-level clash (against year/month pillars) — produces a prominent
            // red marker + red border so clash days never go unnoticed in CAL view.
            const _dayClashType = getClashType(dGan, dZhi, yZhi, mGan, mZhi);
            const _clashIcon = _dayClashType === 'clash-year'
                ? `<div style="color:#d40000;font-weight:bold;font-size:12px;text-align:center;" title="Day-Year Branch Clash ⚡⚡⚡">⚡⚡⚡</div>`
                : _dayClashType === 'clash-month-stem'
                ? `<div style="color:#d40000;font-weight:bold;font-size:11px;text-align:center;" title="Day-Month Stem Clash ⚡⚡">⚡⚡</div>`
                : _dayClashType === 'clash-month-branch'
                ? `<div style="color:#d40000;font-weight:bold;font-size:10px;text-align:center;" title="Day-Month Branch Clash ⚡">⚡</div>`
                : '';
            const _clashBorder = _dayClashType === 'clash-year'         ? 'border:3px solid #c62828 !important;'
                               : _dayClashType === 'clash-month-stem'   ? 'border:2px solid #ef5350 !important;'
                               : _dayClashType === 'clash-month-branch' ? 'border:1px dashed #ef5350 !important;'
                               : '';
            const cellStyle = (calGreenBg ? `background:${calGreenBg};border-color:${calBorder};` : '') + _clashBorder;
            const stemColor = ELEMENTS_EN[dGan] === 'wood' ? 'var(--wood)' : ELEMENTS_EN[dGan] === 'fire' ? 'var(--fire)' : ELEMENTS_EN[dGan] === 'metal' ? 'var(--metal)' : ELEMENTS_EN[dGan] === 'water' ? 'var(--water)' : 'var(--earth)';

            // Jieqi markers — 节 (month start, major) shown as blue badge; 气 (mid-month) as orange badge.
            // Bigger and more saturated than before so both are clearly visible in the cell.
            const MONTH_START_JQ = ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'];
            const jqEntry = jieqiMap[isoDate] || [];
            const jieqiHTML = jqEntry.map(j => {
                const isJie = MONTH_START_JQ.includes(j.name);
                const jqBg = isJie ? '#1565c0' : '#ff9800';
                return `<div style="display:inline-block;background:${jqBg};color:#fff;font-weight:bold;font-size:11px;padding:2px 6px;border-radius:6px;margin-top:2px;margin-right:2px;line-height:1.2;">${isJie?'节':'气'} ${j.name}${j.wall ? ' '+j.wall+' (TST '+j.time+')' : (j.time ? ' '+j.time : '')}</div>`;
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
                        <span class="cal-day-num">${dd}${personTagsCAL}</span>
                        <span class="cal-stem" style="color:${stemColor};">${dGan}<br>${dZhi}</span>
                    </div>
                    ${_clashIcon}
                    ${nobleIndicator}${luIndicator}${hvIndicator}${bvIndicator}${mvIndicator}${tyIndicator}
                    ${_flightHourCell(isoDate)}
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

    // ✈ Big "search ALL favourable flights in this period" button (flight mode only).
    let _flightAllBtn = '';
    if (window._fsFlightCalMode && Object.keys(_flightBestByDay).length) {
        const _favIsos = Object.keys(_flightBestByDay).sort();
        const _nDays = _favIsos.length;
        const _MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        // Label the ACTUAL span of favourable days (DAYS can cover several months),
        // not just the start month — otherwise extending DAYS would still read "June".
        const _moOf = function(iso){ const p = iso.split('-'); return _MN[(+p[1]) - 1] + ' ' + p[0]; };
        const _firstLbl = _moOf(_favIsos[0]);
        const _lastLbl  = _moOf(_favIsos[_nDays - 1]);
        const _spanLbl = (_firstLbl === _lastLbl) ? _firstLbl : (_firstLbl + ' → ' + _lastLbl);
        _flightAllBtn = '<div style="text-align:center;margin:10px 0 4px;">'
            + '<button onclick="fsFlightSearchAll()" style="background:#0b8043;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2);">🔎 Search ALL favourable flights — ' + _spanLbl + ' (' + _nDays + ' days)</button>'
            + '<div style="font-size:11px;color:#777;margin-top:3px;">Searches every favourable day in this period for flights in its positive window</div></div>';
    }

    document.getElementById('cal-view').innerHTML = calNavHtml + _flightAllBtn + html + _flightAllBtn;
    const cvEl = document.getElementById('cal-view'); if(cvEl) cvEl.style.display = 'block';
    const srEl1 = document.getElementById('scan-results'); if(srEl1) srEl1.style.display = 'none';
    const mvEl1 = document.getElementById('month-view'); if(mvEl1) mvEl1.style.display = 'none';
}

function buildMonthView() {
    _fsBadgeCache = {}; // clear FS badge cache for new view
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

    // A/B person markers for LIST view — always visible when a person is loaded.
    // Placed next to the hour pillar (inside the 80px hour column) — that area has
    // enough room to render them at full readable size (13px) without overflow.
    const _aLoadedLV = !!personAYear;
    const _bLoadedLV = !!personBYear;
    const personTagsLV = (_aLoadedLV ? '<span style="color:#2e7d32;font-weight:bold;font-size:13px;margin-left:6px;">A</span>' : '')
                       + (_bLoadedLV ? '<span style="color:#7b1fa2;font-weight:bold;font-size:13px;margin-left:3px;">B</span>' : '');

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
        const [start, end] = base.split('-');
        return formatTSTRange(start, end);
    }
    // Zi-half range labels (wall-clock with DST + TST annotation when they differ).
    const ziFirstHalfLabel  = formatTSTRange('23:00', '00:00');
    const ziSecondHalfLabel = formatTSTRange('00:00', '01:00');
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

    // ── Shared gate check for the two special Zi-half rows (early-Zi / late-Zi). ──
    // Historically the Zi blocks applied only chip/purpose/score filters and
    // skipped three gates that regular hours enforce:
    //   (1) personal connection gate  (2) Kong Wang void  (3) favourable/high-score.
    // That let Zi hours appear in LIST when an equivalent regular hour would be
    // dropped. This helper ports those three gates so Zi rows filter consistently.
    // Returns true = keep the row, false = drop it. On a drop it also logs the
    // reason to the browser console (diagnostic — safe to leave on).
    function ziRowPassesGates(o) {
        const dbg = function(reason){ };
        // GATE 0 — "Only with XKDG" strict: Zi rows need a real XKDG hexagram
        // relation (blue/family item). No Nayin/spirit rescue when toggle is ON.
        if (_listOnlyXKDG && !o.calShowAll && !o.listShowAll && o.blueItems.length === 0) {
            dbg('Only with XKDG: no XKDG relation'); return false;
        }
        // GATE 1 — personal connection gate (mirror of regular-hours logic)
        if (activePersonYear) {
            const dQi  = o.dayXkdg ? o.dayXkdg.qi  : null;
            const dYun = o.dayXkdg ? o.dayXkdg.yun : null;
            const connectsTo = function(pYr, pStem, pBranch){
                if (!pYr) return false;
                if (isHetuPair(pYr.qi, dQi)   || [5,10,15].includes(pYr.qi + dQi))   return true;
                if (isHetuPair(pYr.yun, dYun) || [5,10,15].includes(pYr.yun + dYun)) return true;
                if (o.blueItems.some(i=>i.text==='Pure Qi'||i.text==='Pure Qi Elements') && pYr.qi  === dQi)  return true;
                if (o.blueItems.some(i=>i.text==='Pure Qi'||i.text==='Pure Qi Periods')  && pYr.yun === dYun) return true;
                if (getJiaZiFamilies(pStem, pBranch).some(f => getJiaZiFamilies(o.dGan, o.dZhi).includes(f))) return true;
                if (pYr.hex && o.dayXkdg && o.dayXkdg.hex && getInverseHex(o.dayXkdg.hex) === pYr.hex) return true; // Inverse hexagram
                return false;
            };
            if (personAYear && personBYear) {
                if (!(connectsTo(personAYear, pYStem, pYBranch) &&
                      connectsTo(personBYear, pBYStem, pBYBranch))) { dbg('no personal connection (A&B)'); return false; }
            } else {
                if (!connectsTo(activePersonYear, activePersonStem, activePersonBranch)) { dbg('no personal connection'); return false; }
            }
        }
        // GATE 2 — Kong Wang void (Pure Qi / Family / Nayin Weak exempt)
        const hasPureQiOrFamily = o.blueItems.some(i => i.text.includes('Pure Qi') || i.tag === 'family');
        const isNayinWeak = o.nayinLabel === 'Nayin Weak';
        const isVoid = !hasPureQiOrFamily && !isNayinWeak &&
                       isKongWangVoid(o.hZhi, o.dGan, o.dZhi, o.seasonStrong, o.seasonGrowing);
        if (isVoid && !o.hasNeg && !o.calShowAll && !o.listShowAll) { dbg('Kong Wang void'); return false; }
        // GATE 3 — favourable / high-score gate
        let isFavourable = false;
        const isPositive = o.blueItems.length > 0;
        if (isPositive && (personAYear || personBYear)) {
            const _saved = _currentDayAnalysis;
            _currentDayAnalysis = {
                items: o.analysisItems,
                pillars: { hour: o.pillars.hour, day: o.pillars.day, month: o.pillars.month, year: o.pillars.year },
                stems:  { hour: o.hGan, day: o.dGan, month: o.mGan, year: o.yGan },
                branches:{ hour: o.hZhi, day: o.dZhi, month: o.mZhi, year: o.yZhi }
            };
            if (personAYear) {
                const labelsA = getMatchLabels(personAYear, pYStem, pYBranch, o.pillars.day, o.dGan, o.dZhi, _personAPillars, _personADayStem, _personADayBranch);
                const favA = labelsA.length > 0;
                if (personBYear) {
                    const labelsB = getMatchLabels(personBYear, pBYStem, pBYBranch, o.pillars.day, o.dGan, o.dZhi, _personBPillars, _personBDayStem, _personBDayBranch);
                    isFavourable = favA && labelsB.length > 0;
                } else {
                    isFavourable = favA;
                }
            } else if (personBYear) {
                const labelsB = getMatchLabels(personBYear, pBYStem, pBYBranch, o.pillars.day, o.dGan, o.dZhi, _personBPillars, _personBDayStem, _personBDayBranch);
                isFavourable = labelsB.length > 0;
            }
            _currentDayAnalysis = _saved;
        }
        // Condition B: the person communicates with the date in a way the date
        // does not itself carry as a setting (valid, just lower-scored). Such
        // dates already passed GATE 1; keep them so they are not dropped by the
        // score gate below. The A-vs-B score difference is handled elsewhere.
        if (!isFavourable && (personAYear || personBYear) && o.dayXkdg){
            const _dx = o.dayXkdg;
            if (personAYear && personBYear){
                if (_xkConnectsAny(personAYear, pYStem, pYBranch, _dx.qi, _dx.yun, _dx.hex, o.dGan, o.dZhi) &&
                    _xkConnectsAny(personBYear, pBYStem, pBYBranch, _dx.qi, _dx.yun, _dx.hex, o.dGan, o.dZhi)) isFavourable = true;
            } else if (_xkConnectsAny(activePersonYear, activePersonStem, activePersonBranch, _dx.qi, _dx.yun, _dx.hex, o.dGan, o.dZhi)) {
                isFavourable = true;
            }
        }
        if (!o.calShowAll && !o.listShowAll && !o.filtersActive && !o.hasNeg &&
            (personAYear || personBYear) && !isFavourable && o.score < 8) {
            dbg('not favourable & score < 8'); return false;
        }
        return true;
    }

    let html = '';
    let lastDay = '';
    let pendingZiRows = []; // Zi hour rows held to append to PREVIOUS day

    for (let d = 0; d < days; d++) {
        const dayDate = new Date(start.getTime() + d * 86400000);
            const _isoDay = localISODate(dayDate);
            if (!isDateAllowed(_isoDay)) continue;
        // Show-all bypass: when the user clicks a day in CAL, drill-down should
        // display every hour of that day (positive AND negative), so we skip the
        // skip-gate and the listScore filter for that specific iso date only.
        const _calShowAllForThisDay = !!(window._calShowAllForDate && window._calShowAllForDate === _isoDay);
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
        const jieqiDayHTML = jieqiDay.map(j => `<span style="font-size:10px;color:#e65100;font-weight:bold;"> ⟐ ${j.name} ${j.wall||j.time}${j.wall?' (TST '+j.time+')':''}</span>`).join('');

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

        // Header row: Day / Month / Year pillars in Chinese characters, vertically stacked
        // (gan on top, zhi on bottom), aligned directly above their corresponding number
        // columns in each hour row below. Reading right-to-left gives Year · Month · Day,
        // the standard Bazi convention. The Hour column has no header — the hour pillar
        // is shown per-row alongside its time range.
        //
        // The grid structure (138px left block + flex:1 with right-aligned 25×4 grid
        // + flex:1 label area) mirrors the row HTML exactly so the columns line up.
        const headerHtml = `<div style="background:#fce4ec;padding:3px 8px;font-weight:bold;font-size:11px;color:#880e4f;border-top:3px solid #1565c0;display:flex;align-items:center;">
            <div style="width:138px;flex-shrink:0;display:flex;gap:2px;align-items:center;">${headerNL}${dayClashHTML}</div>
            <div style="flex:1;display:flex;justify-content:flex-end;padding-right:20px;">
                <div style="display:grid;grid-template-columns:25px 25px 25px 25px;gap:0px;">
                    <div></div>
                    <div style="text-align:center;line-height:1.1;color:#880e4f;font-weight:bold;">
                        <div style="font-size:13px;">${dGanDay}</div>
                        <div style="font-size:13px;">${dZhiDay}</div>
                    </div>
                    <div style="text-align:center;line-height:1.1;color:#880e4f;font-weight:bold;">
                        <div style="font-size:13px;">${mGanDay}</div>
                        <div style="font-size:13px;">${mZhiDay}</div>
                    </div>
                    <div style="text-align:center;line-height:1.1;color:#880e4f;font-weight:bold;">
                        <div style="font-size:13px;">${yGanDay}</div>
                        <div style="font-size:13px;">${yZhiDay}</div>
                    </div>
                </div>
            </div>
            <div style="flex:1;font-size:11px;font-weight:normal;text-align:right;">${dateLabel}${jieqiDayHTML}</div>
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
                const ziHasNeg2 = ziAF2.has('negatives');

                // Pre-compute negativity vars (used by both gate and red styling)
                const ziBadSpirit2 = ziSpirit2 && !ziSpirit2.auspicious;
                const ziIsTombSha2 = isTombSha(ziHZhi2, ziDGan2, ziSS2, ziSG2);
                const ziIsWJDT2 = isWJDT(ziYGan2, ziDZhi2, ziHZhi2);
                // Use unified scoring for Negatives filter
                const ziNegScore2 = calcNegativeScore({
                    dGan: ziDGan2, dZhi: ziDZhi2, hGan: ziHGan2, hZhi: ziHZhi2,
                    mGan: ziMGan2, mZhi: ziMZhi2, yGan: ziYGan2, yZhi: ziYZhi2,
                    analysisItems: ziItems2, dayClashType,
                    seasonStrong: ziSS2, seasonGrowing: ziSG2,
                    nayinLabel: ziNayin2.label,
                    nayinPersonScore: ziNayin2.personScore || 0
                });

                // Pass-filter for Zi second half — now uses score-based check consistent
                // with regular hours: default keeps ziScore2 >= 1; NEGATIVES keeps ziScore2 < 1.
                // BYPASS when user drilled in from CAL — show every Zi hour of that day.
                let ziPassF2;
                if (_calShowAllForThisDay || _listShowAll) {
                    ziPassF2 = true;
                } else if (ziHasNeg2) {
                    ziPassF2 = (ziScore2 < 1);
                } else {
                    const ziRealFilters2 = new Set(ziAF2);
                    ziRealFilters2.delete('negatives');
                    ziRealFilters2.delete('strict');
                    ziPassF2 = (ziScore2 >= 1) && (ziRealFilters2.size === 0 || blueItemsPassFilter(ziBlue2, ziRealFilters2, {}, ziItems2));
                }
                // Purpose filter for Zi second half: same gate as regular hours.
                // Without this, Zi-second rows would bypass the chosen purpose
                // and appear even when they don't match.
                let _zi2PurposeIcon = '';
                const _zi2Purpose = getPurpose();
                if (_zi2Purpose && ziPassF2) {
                    const _zi2DGan = (ziP2.day && ziP2.day.stem)   || dGan;
                    const _zi2DZhi = (ziP2.day && ziP2.day.branch) || dZhi;
                    const _zi2Passes = checkPurpose(_zi2Purpose, _zi2DGan, _zi2DZhi, ziBlue2, ziScore2, ziP2, ziItems2, ziSpirit2);
                    if (_zi2Passes) {
                        _zi2PurposeIcon = PURPOSE_ICONS[_zi2Purpose] || '';
                    } else if (!_calShowAllForThisDay) {
                        ziPassF2 = false;
                    }
                }

                // ── Three gates ported from regular hours (connection / Kong Wang / favourable). ──
                if (ziPassF2 && !ziRowPassesGates({
                    tag: 'late-Zi', isoDate: localISODate(dayDate),
                    dGan: ziDGan2, dZhi: ziDZhi2, hGan: ziHGan2, hZhi: ziHZhi2,
                    mGan: ziMGan2, mZhi: ziMZhi2, yGan: ziYGan2, yZhi: ziYZhi2,
                    dayXkdg: ziP2.day, blueItems: ziBlue2, analysisItems: ziItems2,
                    pillars: ziP2, seasonStrong: ziSS2, seasonGrowing: ziSG2,
                    nayinLabel: ziNayin2.label, score: ziScore2,
                    hasNeg: ziHasNeg2, filtersActive: getActiveFilters().size > 0,
                    calShowAll: _calShowAllForThisDay, listShowAll: _listShowAll
                })) ziPassF2 = false;

                if (ziPassF2) {
                    const ziBg2 = ziHasNeg2
                        ? (ziNegScore2>=10?'#ffcdd2':ziNegScore2>=8?'#ffd6da':ziNegScore2>=6?'#ffe0e3':ziNegScore2>=4?'#ffebed':'#fff5f6')
                        : (ziScore2>=10?'#a5d6a7':ziScore2>=8?'#c8e6c9':ziScore2>=5?'#dcedc8':ziScore2>=1?'#f1f8e9':ziScore2>=0?'#ffffff':ziScore2>=-3?'#ffebee':ziScore2>=-6?'#ffcdd2':'#ef9a9a');
                    const ziBrd2 = ziHasNeg2 ? '#c62828' : (ziScore2>=10?'#1b5e20':ziScore2>=8?'#2e7d32':ziScore2>=5?'#388e3c':ziScore2>=1?'#558b2f':ziScore2>=0?'#aaa':ziScore2>=-3?'#e57373':ziScore2>=-6?'#ef5350':'#c62828');
                    const ziElN2 = ziBlue2.filter(i=>i.text.includes('Element')||i.text==='Pure Qi'||i.tag==='family'||i.text.startsWith('Inverse')).map(i=>i.text);
                    const ziSp2H = ziSpirit2?`<div style="font-size:9px;font-weight:bold;color:${ziSpirit2.auspicious?'#0044cc':'#d40000'};">${ziSpirit2.en} ${ziSpirit2.zh}</div>`:'';
                    const ziNy2H = ziNayin2.label?`<div style="font-size:9px;font-weight:bold;color:${ziNayin2.label==='Nayin Power'?'#1b5e20':ziNayin2.label==='Nayin Weak'?'#b71c1c':'#2e7d32'};">${ziNayin2.label}</div>`:'';
                    const ziYD2 = ziP2.year||{}, ziMD2 = ziP2.month||{}, ziDD2 = ziP2.day||{}, ziHD2 = ziP2.hour||{};
                    const ziPerN2 = ziBlue2.filter(i=>i.text.includes('Period')).map(i=>i.text);
                    const ziScoreForSort2 = ziHasNeg2 ? ziNegScore2 : ziScore2;
                    dayRows.push({ score: ziScoreForSort2, isZiSecond: true, html: `<div onclick="loadDateIntoMain('${localISODate(dayDate)}',0,true)" style="display:flex;align-items:center;padding:3px 8px;border-bottom:1px solid #eee;${ziBg2?`background:${ziBg2};`:''}border-left:4px solid ${ziBrd2};cursor:pointer;">
                        <div style="width:28px;flex-shrink:0;font-size:13px;font-weight:bold;color:${ziHasNeg2?'#b71c1c':'#1b5e20'};text-align:left;padding-left:2px;">${ziHasNeg2?'-'+ziNegScore2:ziScore2}${_zi2PurposeIcon ? `<div style="font-size:14px;line-height:1;">${_zi2PurposeIcon}</div>` : ''}</div>
                        <div style="width:80px;flex-shrink:0;font-size:11px;color:#333;">
                            <span style="color:#999;font-size:10px;">${ziSecondHalfLabel}</span><br>
                            <span style="font-size:13px;font-weight:bold;color:#880e4f;">${ziHGan2}${ziHZhi2}</span>${personTagsLV}
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

                // ── Apply chip filters (Adding Elements, Hetu Periods, etc.) for Zi first half ──
                const _ziAF = getActiveFilters();
                const _ziHasNeg = _ziAF.has('negatives');
                // Pre-compute negativity vars (used below for both gate and scoring)
                const _ziIsPos = ziBlueF.length > 0;
                const _ziBadSpirit = ziSpiritF && !ziSpiritF.auspicious;
                const _ziIsTombSha = isTombSha(ziHZhiF, ziDGan, ziSS, ziSG);
                const _ziIsWJDT = isWJDT(ziYGan, ziDZhi, ziHZhiF);
                // Use unified scoring for Negatives filter
                const _ziNegScore = calcNegativeScore({
                    dGan: ziDGan, dZhi: ziDZhi, hGan: ziHGanF, hZhi: ziHZhiF,
                    mGan: ziMGan, mZhi: ziMZhi, yGan: ziYGan, yZhi: ziYZhi,
                    analysisItems: ziItemsF, dayClashType,
                    seasonStrong: ziSS, seasonGrowing: ziSG,
                    nayinLabel: ziNayinF.label,
                    nayinPersonScore: ziNayinF.personScore || 0
                });

                // Chip filters: bypass when Negatives is on (it has its own logic)
                if (!_ziHasNeg) {
                    const _ziRealFilters = new Set(_ziAF);
                    _ziRealFilters.delete('negatives');
                    _ziRealFilters.delete('strict');
                    if (_ziRealFilters.size > 0 && !blueItemsPassFilter(ziBlueF, _ziRealFilters, {qi: ziPillars.day.qi, yun: ziPillars.day.yun}, ziItemsF)) continue;
                }

                // ── Purpose filter for Zi first half ──
                // The regular-hours block has its own purpose gate at the bottom
                // of the inner loop. Zi first half was previously rendered without
                // any purpose filter — so rows that don't match the chosen purpose
                // (e.g. Journey + Heaven Penalty hour) slipped through and made
                // the filtered list inconsistent. Apply checkPurpose here too,
                // and surface the purpose icon when the Zi-first row passes.
                let _ziPurposeIcon = '';
                const _ziPurpose = getPurpose();
                if (_ziPurpose) {
                    // Pass Zi-first's effective day stem/branch (the NEXT calendar
                    // day's day pillar, since Zi first half = 23:00-00:00 belongs
                    // to the next day in the early-Zi convention). ziPillars.day
                    // already carries those values.
                    const _ziDGan = (ziPillars.day && ziPillars.day.stem)   || dGan;
                    const _ziDZhi = (ziPillars.day && ziPillars.day.branch) || dZhi;
                    const _ziPasses = checkPurpose(_ziPurpose, _ziDGan, _ziDZhi, ziBlueF, ziScoreF, ziPillars, ziItemsF, ziSpiritF);
                    if (!_ziPasses && !_calShowAllForThisDay && !_listShowAll) continue;
                    if (_ziPasses) _ziPurposeIcon = PURPOSE_ICONS[_ziPurpose] || '';
                }

                // ── Three gates ported from regular hours (connection / Kong Wang / favourable). ──
                if (!ziRowPassesGates({
                    tag: 'early-Zi', isoDate: localISODate(dayDate),
                    dGan: ziDGan, dZhi: ziDZhi, hGan: ziHGanF, hZhi: ziHZhiF,
                    mGan: ziMGan, mZhi: ziMZhi, yGan: ziYGan, yZhi: ziYZhi,
                    dayXkdg: ziPillars.day, blueItems: ziBlueF, analysisItems: ziItemsF,
                    pillars: ziPillars, seasonStrong: ziSS, seasonGrowing: ziSG,
                    nayinLabel: ziNayinF.label, score: ziScoreF,
                    hasNeg: _ziHasNeg, filtersActive: getActiveFilters().size > 0,
                    calShowAll: _calShowAllForThisDay, listShowAll: _listShowAll
                })) continue;

                // ── Score-based filter for Zi first half ──
                // Default: hide ziScoreF < 1. With NEGATIVES on: show ONLY ziScoreF < 1.
                // BYPASS when the user drilled in from CAL (show every hour of the day).
                // (Consistent with the rule applied to regular hours.)
                if (!_calShowAllForThisDay && !_listShowAll && (_ziHasNeg ? (ziScoreF >= 1) : (ziScoreF < 1))) continue;
                const ziBgF  = ziScoreF>=10?'#a5d6a7':ziScoreF>=8?'#c8e6c9':ziScoreF>=5?'#dcedc8':ziScoreF>=1?'#f1f8e9':ziScoreF>=0?'#ffffff':ziScoreF>=-3?'#ffebee':ziScoreF>=-6?'#ffcdd2':'#ef9a9a';
                const ziBrdF = ziScoreF>=10?'#1b5e20':ziScoreF>=8?'#2e7d32':ziScoreF>=5?'#388e3c':ziScoreF>=1?'#558b2f':ziScoreF>=0?'#aaa':ziScoreF>=-3?'#e57373':ziScoreF>=-6?'#ef5350':'#c62828';
                const ziElNF = ziBlueF.filter(i=>i.text.includes('Element')||i.text==='Pure Qi'||i.tag==='family'||i.text.startsWith('Inverse')).map(i=>i.text);
                const ziSpHF = ziSpiritF?`<div style="font-size:9px;font-weight:bold;color:${ziSpiritF.auspicious?'#0044cc':'#d40000'};">${ziSpiritF.en} ${ziSpiritF.zh}</div>`:'';
                const ziNyFH = ziNayinF.label?`<div style="font-size:9px;font-weight:bold;color:${ziNayinF.label==='Nayin Power'?'#1b5e20':ziNayinF.label==='Nayin Weak'?'#b71c1c':'#2e7d32'};">${ziNayinF.label}</div>`:'';
                const ziWjdtH = _ziIsWJDT?`<div style="font-size:9px;font-weight:bold;color:#6a1b9a;">⚡ 戊己都天 WJDT</div>`:'';
                const ziYD = ziPillars.year||{}, ziMD = ziPillars.month||{}, ziDD = ziPillars.day||{}, ziHD = ziPillars.hour||{};
                const _ziRowBg = _ziHasNeg
                    ? (_ziNegScore>=10?'#ffcdd2':_ziNegScore>=8?'#ffd6da':_ziNegScore>=6?'#ffe0e3':_ziNegScore>=4?'#ffebed':'#fff5f6')
                    : ziBgF;
                const _ziRowBrd = _ziHasNeg ? '#c62828' : ziBrdF;
                const _ziScoreForSort = _ziHasNeg ? _ziNegScore : ziScoreF;
                dayRows.push({ score: _ziScoreForSort, isZiFirst: true, html: `<div onclick="loadDateIntoMain('${localISODate(dayDate)}',0)" style="display:flex;align-items:center;padding:3px 8px;border-bottom:1px solid #eee;${_ziRowBg?`background:${_ziRowBg};`:''}border-left:4px solid ${_ziRowBrd};cursor:pointer;">
                    <div style="width:28px;flex-shrink:0;font-size:13px;font-weight:bold;color:${_ziHasNeg?'#b71c1c':'#1b5e20'};text-align:left;padding-left:2px;">${_ziHasNeg?'-'+_ziNegScore:ziScoreF}${_ziPurposeIcon ? `<div style="font-size:14px;line-height:1;">${_ziPurposeIcon}</div>` : ''}</div>
                    <div style="width:80px;flex-shrink:0;font-size:11px;color:#333;">
                        <span style="color:#999;font-size:10px;">${ziFirstHalfLabel}</span><br>
                        <span style="font-size:13px;font-weight:bold;color:#880e4f;">${ziHGanF}${ziHZhiF}</span>${personTagsLV}
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
                        ${ziSpHF}${ziNyFH}${ziWjdtH}
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
                if (!activeFiltersPre.has('nayin')) { continue; }
                const nayinCheck = analyzeNayin(dGan, dZhi, hGan, hZhiDirect, mGan, mZhi, yGan, yZhi, pYStem, pYBranch, null, null);
                if (!nayinCheck.label) { continue; }
            }

            // If Tomb Sha but no XKDG data for hour, show warning row
            if (!hData && isTombShaLV) { dayRows.push({ score: -99, html: `<div style="display:flex;align-items:center;padding:3px 8px;border-bottom:1px solid #eee;background:#fff5f5;">
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

            // ── Compute spirit + listScore EARLY (moved above the skip-gate) so the
            // skip-gate can let high-score hours through even with no XKDG relation. ──
            const spirit = getSpiritForHour(dZhi, hZhiDirect);
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

                listScore = Math.round((sA + sB) / 2);
            } else {
                listScore = calcHourScore(dGan, dZhi, hGanDirect, hZhiDirect, mGan, mZhi, yGan, eightChar.getYearZhi(), analysisItems, spirit, sS, sG, activePersonYear, activePersonStem, activePersonBranch, pNobleA, pLuA, pHVA, pBVA, pMVA, pTYA, pillars);
            }
            // Hours scoring >= this value bypass the "no XKDG relation" skip-gate and
            // the "must be favourable" gate — strong via Nayin Power, personal stars,
            // auspicious spirit, etc. (e.g. score 13 from Noble + Energetic + Nayin Power).
            const LIST_HIGH_SCORE_THRESHOLD = 8;

            // Skip hours with no XKDG relations — unless purpose/nayin filter or Nayin label exists or Zi first half
            const activeFiltersMV = getActiveFilters();
            const hasNayinFilter = activeFiltersMV.has('nayin');
            const hasKeFilterMV  = activeFiltersMV.has('ke-wealth');
            const hasNegativesFilterMV = activeFiltersMV.has('negatives');

            // Compute unified negativity score (used when Negatives filter is active)
            const negativeScore = calcNegativeScore({
                dGan, dZhi, hGan: hGanDirect, hZhi: hZhiDirect,
                mGan, mZhi, yGan, yZhi,
                analysisItems, dayClashType,
                seasonStrong: sS, seasonGrowing: sG,
                nayinLabel: nayinResLV.label,
                nayinPersonScore: nayinResLV.personScore || 0
            });
            const isNegativeHour = negativeScore > 0;
            // Kept for backward compatibility with row styling below
            const isWJDTLV = isWJDT(yGan, dZhi, hZhiDirect);

            // Skip-gate (modified to allow negatives through when filter active,
            // and fully bypassed when the row belongs to a day the user clicked from CAL)
            // "Only with XKDG" rule. Permissive (toggle OFF): an hour with NO
            // hexagram relation is still shown if it has Nayin Power AND score
            // >= threshold. Strict (toggle ON): no rescue — only real hexagram
            // relations pass.
            const _savedByNayinLV = !_listOnlyXKDG && (nayinResLV.label === 'Nayin Power') && (listScore >= LIST_HIGH_SCORE_THRESHOLD);
            // When "Only with XKDG" is ON, also filter Zi first-half if it has no XKDG relations
            const _ziBypassOK = isZiFirst && (!_listOnlyXKDG || isPositive);
            if (!_calShowAllForThisDay && !_listShowAll && !_ziBypassOK && !isPositive && !getPurpose() && !hasNayinFilter && !hasKeFilterMV && !hasNegativesFilterMV && !_savedByNayinLV) { continue; }

            // (Old isNegativeHour gate removed — superseded by the listScore-based filter
            //  applied further down once listScore has been computed.)

            // Apply filter chips — but skip when Negatives is on (it has its own logic)
            if (!hasNegativesFilterMV && !isZiFirst && activeFiltersMV.size > 0 && !blueItemsPassFilter(blueItems, activeFiltersMV, { qi: pillars.day.qi, yun: pillars.day.yun }, analysisItems)) { continue; }
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
                           (activePersonYearLV.hex && dayXkdgLV.hex && getInverseHex(dayXkdgLV.hex) === activePersonYearLV.hex) ||
                           getJiaZiFamilies(activePYStemLV, activePYBranchLV).some(f => getJiaZiFamilies(dGan, dZhi).includes(f));
                })();
                // If BOTH persons active, require both connect
                if (personAYear && personBYear) {
                    const connectsA = (() => {
                        const pQi = personAYear.qi, pYun = personAYear.yun;
                        const dQi = dayXkdgLV.qi, dYun = dayXkdgLV.yun;
                        return isHetuPair(pQi,dQi)||[5,10,15].includes(pQi+dQi)||isHetuPair(pYun,dYun)||[5,10,15].includes(pYun+dYun)||(personAYear.hex&&dayXkdgLV.hex&&getInverseHex(dayXkdgLV.hex)===personAYear.hex)||getJiaZiFamilies(pYStem,pYBranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
                    })();
                    const connectsB = (() => {
                        const pQi = personBYear.qi, pYun = personBYear.yun;
                        const dQi = dayXkdgLV.qi, dYun = dayXkdgLV.yun;
                        return isHetuPair(pQi,dQi)||[5,10,15].includes(pQi+dQi)||isHetuPair(pYun,dYun)||[5,10,15].includes(pYun+dYun)||(personBYear.hex&&dayXkdgLV.hex&&getInverseHex(dayXkdgLV.hex)===personBYear.hex)||getJiaZiFamilies(pBYStem,pBYBranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
                    })();
                    if (!(connectsA && connectsB)) { continue; }
                } else {
                    if (!connects) { continue; }
                }
            }

            // Kong Wang check: mark void+untimely with red V (Pure Qi, Family, and Nayin Weak exempt)
            const hasPureQiOrFamilyLV = blueItems.some(i => i.text.includes('Pure Qi') || i.tag === 'family');
            const isNayinWeakLV = nayinResLV.label === 'Nayin Weak';
            const isVoidLV = !hasPureQiOrFamilyLV && !isNayinWeakLV && !isZiFirst && isKongWangVoid(hZhiDirect, dGan, dZhi, sS, sG);
            if (isVoidLV && !hasNegativesFilterMV && !_calShowAllForThisDay && !_listShowAll) { continue; }

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
            // Condition B: person communicates with the date in a way the date
            // does not itself carry as a setting — valid, just lower-scored. These
            // already passed the connection gate; keep them visible (the A-vs-B
            // score difference is applied by getPersonSameTypeBonus).
            if (!isFavourable && isPositive && (personAYear || personBYear)){
                if (personAYear && personBYear){
                    if (_xkConnectsAny(personAYear, pYStem, pYBranch, dayXkdgLV.qi, dayXkdgLV.yun, dayXkdgLV.hex, dGan, dZhi) &&
                        _xkConnectsAny(personBYear, pBYStem, pBYBranch, dayXkdgLV.qi, dayXkdgLV.yun, dayXkdgLV.hex, dGan, dZhi)) isFavourable = true;
                } else if (personAYear){
                    if (_xkConnectsAny(personAYear, pYStem, pYBranch, dayXkdgLV.qi, dayXkdgLV.yun, dayXkdgLV.hex, dGan, dZhi)) isFavourable = true;
                } else if (personBYear){
                    if (_xkConnectsAny(personBYear, pBYStem, pBYBranch, dayXkdgLV.qi, dayXkdgLV.yun, dayXkdgLV.hex, dGan, dZhi)) isFavourable = true;
                }
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

            // (spirit + listScore + LIST_HIGH_SCORE_THRESHOLD are computed earlier,
            //  above the skip-gate, so high-score hours bypass the no-XKDG skip too.)

            // Only restrict to personal matches when person active AND no filters (not for Zi first half),
            // BUT allow high-score hours through even when not isFavourable.
            if (!_calShowAllForThisDay && !_listShowAll && !_ziBypassOK && !filtersActiveMV && !hasNegativesFilterMV && (personAYear || personBYear) && !isFavourable && listScore < LIST_HIGH_SCORE_THRESHOLD) { continue; }
            // "Only with XKDG" strict gate: even high-score hours need real XKDG relations
            if (_listOnlyXKDG && !isPositive && !_calShowAllForThisDay && !_listShowAll) { continue; }
            // Green gradient based on score (same tiers as BEST scanner)
            const isoDate = localISODate(dayDate);

            // 12 Spirits
            const spiritHTML = spirit ? `<span style="font-size:10px;font-weight:bold;color:${spirit.auspicious ? '#0044cc' : '#d40000'};cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'${spirit.en} ${spirit.zh}')">${spirit.en} ${spirit.zh}</span>` : '';

            // Score-based filter (matches the user's mental model: "negative = score < +1").
            // Default: hide rows with listScore < 1. With NEGATIVES chip ON: show ONLY listScore < 1.
            // BYPASS when the user drilled in from CAL — every hour of that day must appear.
            // (TABLES is the only view that shows everything regardless of score.)
            if (!_calShowAllForThisDay && !_listShowAll && (hasNegativesFilterMV ? (listScore >= 1) : (listScore < 1))) { continue; }

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
            const fsBadgeLV = fsComputeAllHousesBadges(dayXkdgLV.hex, dayXkdgLV.qi, dayXkdgLV.yun,
                { Y: solarDate.getFullYear(), M: solarDate.getMonth()+1, D: solarDate.getDate(), hGan: hGanDirect, hZhi: hZhiDirect });
            const fsHTMLLV = fsBuildHouseBadgeHtml(fsBadgeLV, localISODate(dayDate)+'-'+hIdx);
            const pqHitsLV = fsScanPurposeQimen(
                { Y: solarDate.getFullYear(), M: solarDate.getMonth()+1, D: solarDate.getDate(), hGan: hGanDirect, hZhi: hZhiDirect },
                getPurpose());
            const pqHTMLLV = pqHitsLV.map(function(pq){ return '<span style="font-size:10px;font-weight:bold;color:#7b1fa2;white-space:nowrap;cursor:pointer;" title="' + pq.label + ' — activate stimulator at ' + pq.dir + '" onclick="event.stopPropagation();showQimenPopup(\'' + pq.label.replace(/'/g,'') + '\')"' + '>🌀⭐' + pq.dir + ' ' + pq.label.split(' ')[0] + '</span>'; }).join(' ');
            const pqRotLV = fsScanPurposeQimenRotating(
                { Y: solarDate.getFullYear(), M: solarDate.getMonth()+1, D: solarDate.getDate(), hGan: hGanDirect, hZhi: hZhiDirect },
                getPurpose());
            const pqRotHTMLLV = pqRotLV.map(function(pq){ return '<span style="font-size:10px;font-weight:bold;color:#1565c0;white-space:nowrap;cursor:pointer;" title="' + pq.label + ' — act towards ' + pq.dir + ' direction" onclick="event.stopPropagation();showQimenPopup(\'' + pq.label.replace(/'/g,'') + '\')"' + '>→' + pq.dir + ' ' + pq.label.split(' ')[0] + '</span>'; }).join(' ');
            // Unified score-based row coloring: green for positive, red for negative
            const lvScoreBg = listScore >= 10 ? '#a5d6a7'   // deep green
                            : listScore >= 8  ? '#c8e6c9'   // medium green
                            : listScore >= 5  ? '#dcedc8'   // light green
                            : listScore >= 1  ? '#f1f8e9'   // pale green
                            : listScore >= 0  ? '#ffffff'   // neutral white
                            : listScore >= -3 ? '#ffebee'   // pale red
                            : listScore >= -6 ? '#ffcdd2'   // medium red
                            : '#ef9a9a';                    // deep red
            const lvScoreBorder = listScore >= 10 ? '#1b5e20'
                                : listScore >= 8  ? '#2e7d32'
                                : listScore >= 5  ? '#388e3c'
                                : listScore >= 1  ? '#558b2f'
                                : listScore >= 0  ? '#aaa'
                                : listScore >= -3 ? '#e57373'
                                : listScore >= -6 ? '#ef5350'
                                : '#c62828';
            // Negatives mode: soft red gradient based on negativeScore (legacy)
            const negBgLV = negativeScore >= 10 ? '#ffcdd2'
                          : negativeScore >= 8  ? '#ffd6da'
                          : negativeScore >= 6  ? '#ffe0e3'
                          : negativeScore >= 4  ? '#ffebed'
                          : '#fff5f6';
            const rowStyle = hasNegativesFilterMV
                ? `background:${negBgLV};border-left:4px solid #c62828;`
                : hasFamilyLV
                ? `background:#fffb00;outline:3px solid #f9a825;outline-offset:-3px;border-left:4px solid #f9a825;`
                : `background:${lvScoreBg};border-left:4px solid ${lvScoreBorder};`;
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

            // Tomb Sha badge: show whenever the hour branch IS the day stem's Tomb Sha
            // branch (structural check, correct hour slot, independent of season).
            const tombShaHTML = (TOMB_SHA[dGan] === hZhiDirect) ? `<span style="color:#d40000;font-weight:bold;font-size:10px;cursor:pointer;" onclick="event.stopPropagation();showBadgeTip(this,'墓煞')">墓煞</span>` : '';
            const wjdtHTML = isWJDTLV ? `<span style="color:#6a1b9a;font-weight:bold;font-size:10px;cursor:pointer;margin-left:3px;" onclick="event.stopPropagation();showBadgeTip(this,'戊己都天')" title="Wu Ji Du Tian Sha">戊己都天</span>` : '';

            // Jieqi banner: full-width row inserted BEFORE this hour if jieqi falls in it
            const MONTH_START_JQ_LV = ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'];
            const jqDayLV = jieqiMap[isoDate] || [];
            const hourStartMin = HOUR_STARTS[hIdx] * 60;
            const hourEndMin   = hourStartMin + 120;
            const jqInHourLV = jqDayLV.filter(j => {
                if (!j.time) return false;
                const [jh, jm] = j.time.split(':').map(Number);
                let jMin = jh * 60 + jm;
                if (hIdx === 0) return jMin >= 23 * 60 || jMin < 60;
                return jMin >= hourStartMin && jMin < hourEndMin;
            });
            const jqBannerLV = jqInHourLV.map(j => {
                const isJie = MONTH_START_JQ_LV.includes(j.name);
                const bg = isJie ? '#1565c0' : '#e65100';
                return `<div style="text-align:center;padding:4px 8px;background:${bg};color:#fff;font-weight:bold;font-size:12px;letter-spacing:1px;border-bottom:1px solid #eee;">
                    ── ${isJie?'节':'气'} ${j.name} ${j.wall||j.time}${j.wall?' (TST '+j.time+')':''} ──</div>`;
            }).join('');

            // Purpose filter for LIST view — needs current hour's _currentDayAnalysis
            const purposeLV = getPurpose();
            let purposeIconLV = '';
            if (purposeLV) {
                if (_fsActionPalace) {
                    // DIRECTION mode (same rule as BEST): XKDG is only a floor —
                    // keep the hour if score >= 8 — then the QMDJ direction gate
                    // (San Qi 乙丙丁 on Heaven + favourable Door, Warrior excluded)
                    // at the flight palace decides. Reuses the Travel Planner gate
                    // so LIST and BEST agree.
                    var _passLV = (listScore >= 8);
                    if (_passLV) {
                        var _dirOKLV = false;
                        try {
                            if (typeof QMDJWaterScanner !== 'undefined'
                                && typeof QMDJWaterScanner.getRotatingHourChart === 'function'
                                && window.TravelPlanner && typeof window.TravelPlanner.evalPalace === 'function') {
                                var _rotLV = QMDJWaterScanner.getRotatingHourChart(
                                    solarDate.getFullYear(), solarDate.getMonth()+1, solarDate.getDate(), hGanDirect, hZhiDirect);
                                var _pdLV = (_rotLV && _rotLV.palaces) ? _rotLV.palaces[_fsActionPalace] : null;
                                if (_pdLV) {
                                    var _cfgLV = (typeof QMDJWaterScanner.checkRotatingPalace === 'function')
                                        ? (QMDJWaterScanner.checkRotatingPalace(_rotLV, _fsActionPalace) || []).length : 0;
                                    var _evLV = window.TravelPlanner.evalPalace(_pdLV, _cfgLV);
                                    // Favourable departure = favourable Door + San Qi
                                    // (乙丙丁) on the HEAVEN plate (ti, rotating) —
                                    // OBLIGATORY — with Warrior/Tiger excluded. Earth-plate
                                    // San Qi does NOT count (it is constant all day, which
                                    // would wrongly mark most hours favourable). Other
                                    // deities (e.g. Red Bird 朱雀) are allowed.
                                    var _SANQI_H = ['Yi','Bing','Ding'];
                                    _dirOKLV = !!(_evLV && _evLV.ok && !_evLV.isWarrior && !_evLV.isTiger
                                                  && _SANQI_H.indexOf(_evLV.ti) !== -1);
                                }
                            } else {
                                _dirOKLV = pqRotLV.some(function(h){ return h.palace === _fsActionPalace; })
                                        || pqHitsLV.some(function(h){ return h.palace === _fsActionPalace; });
                            }
                        } catch (e) { _dirOKLV = false; }
                        _passLV = _dirOKLV;
                    }
                    purposeIconLV = _passLV ? PURPOSE_ICONS[purposeLV] : '';
                } else {
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
            }
            if (purposeLV && !purposeIconLV && !isZiFirst && !_calShowAllForThisDay) continue;

            // ✈ Flight search button — only in flight context (direction filter +
            // destination set by "SCAN flight dates"). Shows the civil departure time.
            let _flightBtnLV = '';
            if ((window._calBackFlight || (window._fsFlightDest && _fsActionPalace)) && typeof fsFlightSearch === 'function') {
                const _civLV = (typeof fsFlightCivil === 'function') ? fsFlightCivil(isoDate, h) : null;
                const _civTxtLV = _civLV ? _civLV.hhmm : '';
                _flightBtnLV = `<button onclick="event.stopPropagation();fsFlightSearch('${isoDate}',${h})" title="Search flights${_civTxtLV ? ' — civil departure ' + _civTxtLV : ''}" style="margin-top:3px;background:#0b8043;color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:bold;cursor:pointer;">🔎 Search flights${_civTxtLV ? ' · ' + _civTxtLV : ''}</button>`;
            }

            const rowHtml = `${jqBannerLV}<div onclick="loadDateIntoMain('${isoDate}',${h})"
                style="display:flex;align-items:center;padding:3px 8px;border-bottom:1px solid #eee;${rowStyle}cursor:pointer;">
                <div style="width:28px;flex-shrink:0;font-size:13px;font-weight:bold;color:${hasNegativesFilterMV?'#b71c1c':'#1b5e20'};text-align:left;padding-left:2px;">${hasNegativesFilterMV?'-'+negativeScore:listScore}${purposeIconLV ? `<div style="font-size:14px;line-height:1;">${purposeIconLV}</div>` : ''}</div>
                <div style="width:80px;flex-shrink:0;font-size:11px;color:#333;">
                    <span style="color:#999;font-size:10px;">${hourTimeLabel}</span><br>
                    <span style="font-size:13px;font-weight:bold;color:#880e4f;">${hGanDirect}${hZhiDirect}</span>${personTagsLV}
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
                    ${spiritHTML}
                    ${tombShaHTML}${wjdtHTML}
                    ${nayinHTMLLV}${nayinPersonHTMLLV}${keHTMLLV}${pqHTMLLV} ${pqRotHTMLLV} ${fsHTMLLV}
                    ${_flightBtnLV}
                </div>
            </div>`;
            dayRows.push({ score: hasNegativesFilterMV ? negativeScore : listScore, html: rowHtml });
        }
        // Sort rows by score if toggle active, else keep chronological
        // When Negatives filter is active, force sort by score descending (worst first)
        const _negSortForce = (typeof getActiveFilters === 'function') && getActiveFilters().has('negatives');
        if (_listSortByScore || _negSortForce) dayRows.sort((a,b) => b.score - a.score);
        dayRowsHtml = dayRows.map(r => r.html).join('');
        dayRows = [];
        // Only add header if day has matching rows
        if (dayRowsHtml) html += headerHtml + dayRowsHtml;
        dayRowsHtml = '';
    }

    const backBtn = window._calBackDate
        ? `<div style="margin-bottom:6px;padding:0 4px;">
            <button onclick="
                const s=document.getElementById('scan-start');
                const d=document.getElementById('scan-days');
                if(s&&window._calBackFrom) s.value=window._calBackFrom;
                if(d&&window._calBackDays) d.value=window._calBackDays;
                window._calBackDate=null;
                setMode('cal');
                window._fsFlightCalMode = window._calBackFlight || false;
                buildCalView();
            " style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #555;background:#fff;color:#555;cursor:pointer;">← Back to Calendar</button>
           </div>`
        : '';
    const sortToggleLV = `<div style="text-align:right;margin-bottom:4px;padding:0 4px;display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;">
        <button onclick="toggleListAll()" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid ${_listShowAll?'#c62828':'#888'};background:${_listShowAll?'#c62828':'#fff'};color:${_listShowAll?'#fff':'#888'};cursor:pointer;">
            ${_listShowAll ? '👁 ALL Hours' : '✓ Positive Only'}
        </button>
        <button onclick="toggleListSort()" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #1565c0;background:${_listSortByScore?'#1565c0':'#fff'};color:${_listSortByScore?'#fff':'#1565c0'};cursor:pointer;">
            ${_listSortByScore ? '⇅ Best First' : '⇅ Chronological'}
        </button>
        <button onclick="toggleListOnlyXKDG()" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #6a1b9a;background:${_listOnlyXKDG?'#6a1b9a':'#fff'};color:${_listOnlyXKDG?'#fff':'#6a1b9a'};cursor:pointer;">
            ${_listOnlyXKDG ? '🔒 Only with XKDG' : '🔓 Only with XKDG'}
        </button>
        <button onclick="toggleFsHouse();buildMonthView();" style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid #2e7d32;background:${_fsHouseActive?'#2e7d32':'#fff'};color:${_fsHouseActive?'#fff':'#2e7d32'};cursor:pointer;">
            ${_fsHouseActive ? '🏠 Hide Houses' : '🏠 Show Houses'}
        </button>
    </div>`;
    const mv = document.getElementById('month-view');
    mv.innerHTML = (html ? backBtn + sortToggleLV + html : '') || '<div class="scan-empty">No data.</div>';
    mv.style.display = 'block';
    const srEl2 = document.getElementById('scan-results'); if(srEl2) srEl2.style.display = 'none';
}

// ── Filter ────────────────────────────────────────────────────
// Scan for favourable flight dates starting in a given month and show the calendar.
// START is bounded to today (no past days). LENGTH = the DAYS field (user-controlled);
// if DAYS is unset it defaults to the rest of that month.
function _fsScanMonthForFlights(year, month){   // month = 1..12
    const ss = document.getElementById('scan-start');
    const sd = document.getElementById('scan-days');
    if (!ss || !sd) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0);            // last day of the month
    let start = (today > monthStart) ? today : monthStart;  // current month → from today
    if (start > monthEnd){
        // Whole month already past: just show it, no flight scan.
        ss.value = year + '-' + String(month).padStart(2,'0') + '-01';
        window._fsFlightCalMode = false;
        if (typeof setMode === 'function') setMode('cal');
        buildCalView();
        return;
    }
    const iso = start.getFullYear() + '-' + String(start.getMonth()+1).padStart(2,'0') + '-' + String(start.getDate()).padStart(2,'0');
    ss.value = iso;
    // Respect the user's DAYS value; default to the rest of the month only if unset.
    let days = parseInt(sd.value);
    if (!days || days < 1){ days = Math.round((monthEnd - start) / 86400000) + 1; sd.value = String(days); }
    if (typeof runScanner === 'function') runScanner();
    if (typeof setMode === 'function') setMode('cal');     // resets _fsFlightCalMode
    window._fsFlightCalMode = true;
    buildCalView();
}

function shiftCalMonth(n) {
    const startSel = document.getElementById('scan-start');
    if (!startSel || !startSel.value) return;
    const d = new Date(startSel.value + 'T00:00:00');
    d.setMonth(d.getMonth() + n);
    // In flight mode, re-scan the WHOLE displayed month (bounded by today).
    if (window._fsFlightCalMode && typeof _fsScanMonthForFlights === 'function'){
        _fsScanMonthForFlights(d.getFullYear(), d.getMonth() + 1);
        return;
    }
    // Format as YYYY-MM-DD
    const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    startSel.value = iso;
    buildCalView();
}

// ───────────────────────── ✈ Flight search (Google Flights) ─────────────────────────
// Convert a favourable TST double-hour into the CIVIL clock time at the departure
// location (origin = Main page location: #longitude / #utc-offset / DST). Returns
// { dateStr:'YYYY-MM-DD', hhmm:'HH:MM' } or null.
function fsFlightCivil(iso, h){
    try {
        if (typeof XKDGSolarTime === 'undefined' || !XKDGSolarTime.wallClockFromTST) return null;
        const p = String(iso).split('-').map(Number);
        if (p.length < 3) return null;
        const tstH = ((h * 2 + 23) % 24);            // TST start hour of the 時辰 (Zi=23, Chou=01, …)
        const lon = parseFloat(document.getElementById('longitude').value);
        const utc = parseFloat(document.getElementById('utc-offset').value) || 0;
        if (!isFinite(lon)) return null;
        const tz = -(utc * 60 + (_dstOn ? 60 : 0));  // (UTC - local) minutes, incl. DST
        const w = XKDGSolarTime.wallClockFromTST(p[0], p[1], p[2], tstH, 0, lon, tz);
        const pad = n => String(n).padStart(2, '0');
        return { dateStr: w.y + '-' + pad(w.mo) + '-' + pad(w.d), hhmm: pad(w.h) + ':' + pad(w.mi) };
    } catch(e){ return null; }
}

// Open Google Flights (natural-language query, no IATA needed) for the scanned
// origin → destination on the CIVIL departure date of the favourable hour.
// Cloudflare Worker that proxies Travelpayouts (holds the API token server-side).
const FS_FLIGHTS_WORKER = 'https://xkdg-flights.decumano16.workers.dev';

function _fsHHMMtoMin(t){ if(!t) return null; const p = t.split(':'); return (+p[0])*60 + (+p[1]); }
function _fsMinToHHMM(m){ m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'); }

// Resolve origin/destination from any available source (captured globals → live
// Direction Calculator fields → localStorage → prompt). Persists what it finds.
function _fsResolveRoute(promptIfMissing){
    const clean = function(v){ return (v || '').trim(); };
    let dest = clean(window._fsFlightDest);
    let orig = clean(window._fsFlightOrigin);
    const dEl = document.getElementById('dir-dest-addr'); if (!dest && dEl) dest = clean(dEl.value);
    const oEl = document.getElementById('dir-orig-addr'); if (!orig && oEl) orig = clean(oEl.value);
    try { if (!dest) dest = clean(localStorage.getItem('xkdg_flight_dest')); } catch(e){}
    try { if (!orig) orig = clean(localStorage.getItem('xkdg_flight_orig')); } catch(e){}
    if (!dest && promptIfMissing) dest = clean(prompt('Destination city for the flight search (e.g. Milano):', ''));
    if (!orig && promptIfMissing) orig = clean(prompt('Origin city (leave empty to let the site decide):', orig || ''));
    if (dest){ window._fsFlightDest = dest; try { localStorage.setItem('xkdg_flight_dest', dest); } catch(e){} }
    if (orig){ window._fsFlightOrigin = orig; try { localStorage.setItem('xkdg_flight_orig', orig); } catch(e){} }
    return dest ? { orig: orig, dest: dest } : null;
}

// Civil departure window for a favourable (date, hourIndex): {dateStr, winStart, winStartMin, winEndMin}
function _fsFlightWindow(iso, h){
    const civ = (typeof fsFlightCivil === 'function') ? fsFlightCivil(iso, h) : null;
    const dateStr = (civ && civ.dateStr) ? civ.dateStr : iso;
    const winStart = civ ? civ.hhmm : null;
    const winStartMin = winStart ? _fsHHMMtoMin(winStart) : null;
    const winEndMin = (winStartMin != null) ? winStartMin + 120 : null;
    return { dateStr: dateStr, winStart: winStart, winStartMin: winStartMin, winEndMin: winEndMin };
}

// Two-tier filter: strict window first; if empty, ±30 min. Returns {flights, note}.
function _fsFilterByWindow(all, winStartMin, winEndMin){
    function inWin(t, tol){
        if (!t || winStartMin == null) return true;
        const mm = _fsHHMMtoMin(t);
        const lo = winStartMin - tol, hi = winEndMin + tol;
        if (mm >= lo && mm <= hi) return true;
        if (hi >= 1440 && mm <= (hi - 1440)) return true;
        if (lo < 0 && mm >= (lo + 1440)) return true;
        return false;
    }
    let matched = (all || []).filter(function(f){ return inWin(f.time, 0); });
    let note = '';
    if (matched.length === 0){
        const relaxed = (all || []).filter(function(f){ return inWin(f.time, 30); });
        if (relaxed.length){ matched = relaxed; note = '±30 min'; }
    }
    return { flights: matched, note: note };
}

async function _fsFetchFlights(orig, dest, dateStr){
    const url = FS_FLIGHTS_WORKER + '/?action=flights'
        + '&origin=' + encodeURIComponent(orig || '')
        + '&dest='   + encodeURIComponent(dest)
        + '&date='   + encodeURIComponent(dateStr);
    const r = await fetch(url);
    return await r.json();
}

// Real flight search for ONE favourable day.
async function fsFlightSearch(iso, h){
    try {
        const route = _fsResolveRoute(true);
        if (!route){ return; }   // user cancelled the destination prompt
        const orig = route.orig, dest = route.dest;
        const w = _fsFlightWindow(iso, h);

        fsFlightShowPanel({ loading:true, date:w.dateStr, orig:orig, dest:dest, winStart:w.winStart, winEndMin:w.winEndMin });

        let data;
        try { data = await _fsFetchFlights(orig, dest, w.dateStr); }
        catch(e){ fsFlightShowPanel({ error:'Network error: ' + e.message, date:w.dateStr, orig:orig, dest:dest }); return; }
        if (!data || !data.ok){
            fsFlightShowPanel({ error:(data && data.error) || 'No data', date:w.dateStr, orig:orig, dest:dest, searchUrl:(data && data.search_url) });
            return;
        }
        const filt = _fsFilterByWindow(data.flights || [], w.winStartMin, w.winEndMin);
        fsFlightShowPanel({
            date:w.dateStr, orig:data.origin || orig, dest:data.dest || dest,
            winStart:w.winStart, winEndMin:w.winEndMin, flights:filt.flights,
            note: filt.note ? ('No flight exactly in the window — showing ' + filt.note + '.') : '',
            searchUrl:data.search_url, currency:data.currency
        });
    } catch(e){ alert('Flight search error: ' + e.message); }
}

// Real flight search across ALL favourable days currently shown on the calendar.
async function fsFlightSearchAll(){
    try {
        const route = _fsResolveRoute(true);
        if (!route){ return; }
        const orig = route.orig, dest = route.dest;
        const map = window._fsFlightBestByDay || {};
        const isos = Object.keys(map).sort();
        if (!isos.length){ alert('No favourable days in view. Run "SCAN flight dates" first.'); return; }

        fsFlightShowPanel({ loading:true, multi:true, orig:orig, dest:dest, loadingMsg:'Searching ' + isos.length + ' favourable days…' });

        const tasks = isos.map(async function(iso){
            const r = map[iso];
            const w = _fsFlightWindow(iso, r.hourIndex);
            let data = null;
            try { data = await _fsFetchFlights(orig, dest, w.dateStr); } catch(e){ data = null; }
            const ok = data && data.ok;
            const filt = ok ? _fsFilterByWindow(data.flights || [], w.winStartMin, w.winEndMin) : { flights: [], note: '' };
            return {
                date: w.dateStr, winStart: w.winStart, winEndMin: w.winEndMin,
                flights: filt.flights, note: filt.note,
                searchUrl: ok ? data.search_url : null
            };
        });
        const groups = await Promise.all(tasks);
        // Sort: days with matches first, then by date
        groups.sort(function(a,b){
            const am = a.flights.length ? 0 : 1, bm = b.flights.length ? 0 : 1;
            if (am !== bm) return am - bm;
            return a.date < b.date ? -1 : 1;
        });
        fsFlightShowPanel({ multi:true, orig:orig, dest:dest, groups:groups });
    } catch(e){ alert('Flight search error: ' + e.message); }
}

// Floating results panel (works identically from CAL cell and LIST row).
function fsFlightShowPanel(o){
    o = o || {};
    let el = document.getElementById('fs-flights-panel');
    if (!el){
        el = document.createElement('div');
        el.id = 'fs-flights-panel';
        el.style.cssText = 'position:fixed;z-index:99999;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92vw);max-height:80vh;overflow:auto;background:#fff;border:1px solid #ccc;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.3);padding:14px 14px 16px;font-family:inherit;color:#222;';
        document.body.appendChild(el);
    }
    const close = '<button onclick="var p=document.getElementById(\'fs-flights-panel\');if(p)p.remove();" style="position:absolute;top:8px;right:10px;background:none;border:none;font-size:20px;cursor:pointer;color:#666;line-height:1;">×</button>';

    // Render a single flight row
    function flightRow(f, fallbackUrl){
        const stops = (f.transfers != null) ? (f.transfers === 0 ? 'direct' : (f.transfers + ' stop')) : '';
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;border:1px solid #eee;border-radius:8px;margin-bottom:6px;">'
            + '<div><div style="font-weight:bold;font-size:16px;color:#111;">' + (f.time || '--:--') + '</div>'
            + '<div style="font-size:11px;color:#666;">' + (f.flight_number || f.airline || '') + (stops ? (' · ' + stops) : '') + '</div></div>'
            + '<div style="text-align:right;"><div style="font-weight:bold;color:#0b8043;">' + (f.price != null ? (f.price + ' ' + (f.currency || '')) : '') + '</div>'
            + '<a href="' + (f.booking_url || fallbackUrl || '#') + '" target="_blank" rel="noopener" style="font-size:12px;color:#1565c0;font-weight:bold;text-decoration:none;">Book →</a></div>'
            + '</div>';
    }

    // ---- MULTI-DATE (search across the whole period) ----
    if (o.multi){
        let head = '<div style="font-weight:bold;font-size:15px;color:#0b3d91;margin:0 24px 8px 0;">✈ Favourable flights ' + (o.orig || '?') + ' → ' + (o.dest || '?') + '</div>';
        let body = '';
        if (o.loading){
            body = '<div style="padding:18px;text-align:center;color:#555;">' + (o.loadingMsg || 'Searching…') + '<br><span style="font-size:11px;">(may take a few seconds)</span></div>';
        } else {
            const groups = o.groups || [];
            const withFlights = groups.filter(function(g){ return g.flights && g.flights.length; });
            body += '<div style="font-size:12px;color:#555;margin-bottom:8px;">' + withFlights.length + ' of ' + groups.length + ' favourable days have a flight in the window.</div>';
            body += groups.map(function(g){
                const winTxt = (g.winStart && g.winEndMin != null) ? (g.winStart + '–' + _fsMinToHHMM(g.winEndMin)) : '';
                let h = '<div style="margin:10px 0 4px;font-weight:bold;font-size:13px;color:#0b3d91;border-top:1px solid #eee;padding-top:8px;">' + g.date + (winTxt ? ' <span style="font-weight:normal;color:#888;font-size:11px;">· ' + winTxt + '</span>' : '') + '</div>';
                if (g.flights && g.flights.length){
                    if (g.note) h += '<div style="font-size:11px;color:#b8860b;margin-bottom:4px;">' + g.note + ' window</div>';
                    h += g.flights.map(function(f){ return flightRow(f, g.searchUrl); }).join('');
                } else {
                    h += '<div style="font-size:12px;color:#999;margin-bottom:4px;">no flight in window' + (g.searchUrl ? ' · <a href="' + g.searchUrl + '" target="_blank" rel="noopener" style="color:#1565c0;">check on Aviasales →</a>' : '') + '</div>';
                }
                return h;
            }).join('');
        }
        el.innerHTML = close + head + body;
        return;
    }

    // ---- SINGLE DAY ----
    const winTxt = (o.winStart && o.winEndMin != null) ? (o.winStart + '–' + _fsMinToHHMM(o.winEndMin)) : '';
    let head = '<div style="font-weight:bold;font-size:15px;color:#0b3d91;margin:0 24px 2px 0;">✈ Flights ' + (o.orig || '?') + ' → ' + (o.dest || '?') + '</div>'
             + '<div style="font-size:12px;color:#555;margin-bottom:10px;">' + (o.date || '') + (winTxt ? (' · favourable window ' + winTxt + ' (civil)') : '') + '</div>';
    let body = '';
    if (o.loading){
        body = '<div style="padding:18px;text-align:center;color:#555;">Searching real flights…</div>';
    } else if (o.error){
        body = '<div style="color:#b71c1c;font-size:13px;margin-bottom:10px;">' + o.error + '</div>';
        if (o.searchUrl) body += '<a href="' + o.searchUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#0b8043;color:#fff;text-decoration:none;border-radius:6px;padding:8px 12px;font-weight:bold;">Open Aviasales search</a>';
    } else {
        if (o.note) body += '<div style="font-size:12px;color:#b8860b;margin-bottom:8px;">' + o.note + '</div>';
        if (!o.flights || !o.flights.length){
            body += '<div style="font-size:13px;color:#555;margin-bottom:10px;">No flight found in the favourable window for this date.</div>';
        } else {
            body += o.flights.map(function(f){ return flightRow(f, o.searchUrl); }).join('');
        }
        if (o.searchUrl) body += '<a href="' + o.searchUrl + '" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:8px;font-size:12px;color:#555;text-decoration:none;">See all on Aviasales →</a>';
    }
    el.innerHTML = close + head + body;
}

function showDayInList(isoDate) {
    // Save current FROM/DAYS to restore when going back
    const startSel = document.getElementById('scan-start');
    const daysSel  = document.getElementById('scan-days');
    const origFrom = startSel ? startSel.value : null;
    const origDays = daysSel  ? daysSel.value  : null;
    // Capture ✈ flight mode BEFORE setMode (setMode resets _fsFlightCalMode).
    const wasFlight = !!window._fsFlightCalMode;
    // Switch to the per-day LIST (month-view) FIRST. setMode('month') clears the
    // back-button state, so we set _calBackDate AFTER it — otherwise the
    // "← Back to Calendar" button never appears. (Previously this called
    // setMode('list'), an unrecognised mode that left month-view hidden, so the
    // day click appeared to do nothing.)
    setMode('month');
    window._calBackDate   = isoDate;
    window._calBackFrom   = origFrom;
    window._calBackDays   = origDays;
    window._calBackFlight = wasFlight;   // remember to re-enable ✈ badges on return to CAL
    // Drill-down hour filtering:
    //   • Flight mode  → show ONLY the recommended departure hours (keep the normal
    //     direction + score gate, so non-favourable hours are skipped).
    //   • Normal CAL   → show ALL hours of that day (positive AND negative).
    window._calShowAllForDate = wasFlight ? null : isoDate;
    if (startSel) startSel.value = isoDate;
    if (daysSel)  daysSel.value  = 1;
    buildMonthView();
    const _mv = document.getElementById('month-view');
    if (_mv) window.scrollTo({ top: _mv.offsetTop - 60, behavior: 'smooth' });
}

// ── TRAVEL PLANNER helper (additive) ─────────────────────────────────────────
// Returns the LIST row HTML for a single hour, so the travel planner can paste
// the exact LIST setting (incl. score) next to its Qimen chart — no navigation.
// Renders that day's LIST off-screen (show-all so every hour appears), extracts
// the row whose onclick targets this hour, neutralises its onclick, and restores
// the previous LIST state and #month-view content. Never throws.
window.tpGetListRowHtml = function (isoDate, hourIndex) {
    var mv = document.getElementById('month-view');
    if (!mv || typeof buildMonthView !== 'function') return '';
    var startSel = document.getElementById('scan-start');
    var daysSel  = document.getElementById('scan-days');
    var prevStart = startSel ? startSel.value : null;
    var prevDays  = daysSel  ? daysSel.value  : null;
    var prevHtml  = mv.innerHTML;
    var prevShowAll = window._calShowAllForDate;
    var out = '';
    try {
        if (startSel) startSel.value = isoDate;
        if (daysSel)  daysSel.value  = 1;
        window._calShowAllForDate = isoDate;
        buildMonthView();
        var want = "loadDateIntoMain('" + isoDate + "'," + hourIndex + ")";
        var nodes = mv.querySelectorAll('[onclick]');
        for (var i = 0; i < nodes.length; i++) {
            var oc = nodes[i].getAttribute('onclick') || '';
            if (oc.indexOf(want) !== -1) {
                var clone = nodes[i].cloneNode(true);
                clone.removeAttribute('onclick');
                clone.style.cursor = 'default';
                out = clone.outerHTML;
                break;
            }
        }
    } catch (e) { out = ''; }
    finally {
        if (startSel && prevStart != null) startSel.value = prevStart;
        if (daysSel && prevDays != null) daysSel.value = prevDays;
        window._calShowAllForDate = prevShowAll;
        mv.innerHTML = prevHtml;
    }
    return out;
};
// ─────────────────────────────────────────────────────────────────────────────

function toggleListSort() {
    _listSortByScore = !_listSortByScore;
    buildMonthView();
}

function toggleListOnlyXKDG() {
    _listOnlyXKDG = !_listOnlyXKDG;
    buildMonthView();
}

function toggleListAll() {
    _listShowAll = !_listShowAll;
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
    // Re-run automatically if any view is visible
    const mvVis = document.getElementById('month-view') && document.getElementById('month-view').style.display !== 'none';
    const calVis = document.getElementById('cal-view') && document.getElementById('cal-view').style.display !== 'none';
    const tblVis = document.getElementById('table-view') && document.getElementById('table-view').style.display !== 'none';
    const srVis  = document.getElementById('scan-results') && document.getElementById('scan-results').style.display === 'block';
    if (_scanResults.length > 0 || srVis || mvVis || calVis || tblVis) {
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
    let yStem, yBranch;
    const _PY = (typeof _tstPillarsFor === 'function') ? _tstPillarsFor(birthDate, birthTime) : null;
    if (_PY) {
        yStem = _PY.year.charAt(0); yBranch = _PY.year.charAt(1);
    } else {
        const lon = parseFloat(document.getElementById('longitude').value);
        const utc = parseFloat(document.getElementById('utc-offset').value);
        const offsetMin = (lon - utc * 15) * 4 - (_dstOn ? 60 : 0);
        const ec = Solar.fromDate(new Date(new Date(`${birthDate}T${birthTime}`).getTime() + offsetMin * 60000)).getLunar().getEightChar();
        yStem = ec.getYearGan(); yBranch = ec.getYearZhi();
    }
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

    // Strip negatives/strict for "only" checks so they don't break the existing logic
    const _baseFilters = new Set([...filters].filter(f => f !== 'negatives' && f !== 'strict'));
    const nayinOnly = _baseFilters.size === 1 && _baseFilters.has('nayin');
    const keOnly    = _baseFilters.size === 1 && _baseFilters.has('ke-wealth');
    // If only negatives/strict remained after stripping nayin/ke, treat as no filter (let other gates handle it)
    if (_baseFilters.size === 0) return true;
    const hasNayinFilter = filters.has('nayin');
    const hasKeFilter    = filters.has('ke-wealth');
    const xkdgFilters = new Set([...filters].filter(f => f !== 'nayin' && f !== 'ke-wealth' && f !== 'negatives' && f !== 'strict'));

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
    _fsBadgeCache = {}; // clear FS badge cache for new scan
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

    // ─── TRAVEL PLANNER hook ─── reset the hour-score cache for this scan.
    // Each scanned hour will be stored below (additive; see hook near totalScore).
    window._tpHourCache = {};

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
            const hasNegativesBST   = activeFilters.has('negatives');
            const isNayinWeakBST = nayinResBST.label === 'Nayin Weak';
            const isNayinPowerBST = nayinResBST.label === 'Nayin Power';
            // Set true when an hour with NO XKDG relation / NO connection is let
            // through because it has Nayin Power. renderScanResults then keeps it
            // only if score >= 8 and the "Only with XKDG" toggle is OFF.
            let bestRescuedByNayin = false;

            // ── Negatives mode: compute score, skip non-negative hours, bypass positive-relation gates ──
            let negativeScoreBST = 0;
            if (hasNegativesBST) {
                const dayClashTypeBST = getClashType(dGan, dZhi, yZhi, mGan, mZhi);
                negativeScoreBST = calcNegativeScore({
                    dGan, dZhi, hGan, hZhi,
                    mGan, mZhi, yGan, yZhi,
                    analysisItems, dayClashType: dayClashTypeBST,
                    seasonStrong: sStrong, seasonGrowing: sGrowing,
                    nayinLabel: nayinResBST.label,
                    nayinPersonScore: nayinResBST.personScore || 0
                });
                if (negativeScoreBST <= 0) continue; // only show meaningfully negative hours
            } else {
                if (blueItems.length === 0 && !isNayinWeakBST && !getPurpose() && !hasNayinFilterBST && !hasKeFilterBST) {
                    if (isNayinPowerBST) { bestRescuedByNayin = true; }
                    else { continue; }
                }
                // Apply filter (only when Negatives is OFF)
                if (!blueItemsPassFilter(blueItems, activeFilters, { qi: pillars.day.qi, yun: pillars.day.yun }, analysisItems)) { continue; }
            }

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

            // Personal connection: required only when person is loaded, uses active person (skip when Negatives is ON)
            const filtersActiveBST = activeFilters.size > 0;
            let _personConnectsBroadly = personMatchEl || personMatchPer; // true if dimension-specific OR broad
            if (!hasNegativesBST) {
                // If both persons active, require both connect using symmetric broad check
                if (personAYear && personBYear) {
                    const connectsA2 = isHetuPair(pQi,dQi)||[5,10,15].includes(pQi+dQi)||isHetuPair(pYun,dYun)||[5,10,15].includes(pYun+dYun)||getJiaZiFamilies(activeYStem,activeYBranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
                    const pQiB = personBYear.qi, pYunB = personBYear.yun;
                    const connectsB2 = isHetuPair(pQiB,dQi)||[5,10,15].includes(pQiB+dQi)||isHetuPair(pYunB,dYun)||[5,10,15].includes(pYunB+dYun)||getJiaZiFamilies(pBYStem,pBYBranch).some(f=>getJiaZiFamilies(dGan,dZhi).includes(f));
                    if (!connectsA2 || !connectsB2) { continue; }
                    _personConnectsBroadly = true;
                } else if (activeYear && !(personMatchEl || personMatchPer)) {
                    // Dimension-specific check failed — use broad check (like LIST view)
                    const broadConnects = isHetuPair(pQi, dQi) || [5,10,15].includes(pQi + dQi) ||
                        isHetuPair(pYun, dYun) || [5,10,15].includes(pYun + dYun) ||
                        getJiaZiFamilies(activeYStem, activeYBranch).some(f => getJiaZiFamilies(dGan, dZhi).includes(f));
                    if (!broadConnects) {
                        if (isNayinPowerBST) { bestRescuedByNayin = true; } else { continue; }
                    } else {
                        _personConnectsBroadly = true;
                    }
                }
            }


            const scoreA = _personConnectsBroadly ?
                getMatchScore(personAYear, pYStem, pYBranch, dayXkdg, dGan, dZhi) : 1;

            // Condition A bonus: +2 if person's birthday connects via SAME relation type as the date
            const sameTypeBonusA = _personConnectsBroadly
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
            const hZhiSC = hZhi; // use library value for consistency with LIST view
            const hourSpirit = getSpiritForHour(dZhi, hZhiSC);
            const hasPureQiOrFamily = blueItems.some(i => i.text.includes('Pure Qi') || i.tag === 'family');

            // Kong Wang check: skip void unless Pure Qi, Family, or Nayin Weak
            if (!hasPureQiOrFamily && !isNayinWeakBST && isKongWangVoid(hZhiSC, dGan, dZhi, sStrong, sGrowing)) { continue; }

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

                totalScore = Math.round((scoreForA + scoreForB) / 2);
            } else {
                totalScore = calcHourScore(dGan, dZhi, hGan, hZhiSC, mGan, mZhi, yGan, pillars.year.branch, analysisItems, hourSpirit, sStrong, sGrowing, activeYear, activeYStem, activeYBranch, activeNoble, activeLu, activeHV, activeBV, activeMV, activeTY, pillars);
            }

            // ─── TRAVEL PLANNER hook (additive) ───────────────────────────────
            // Cache this hour's native positivity score + a compact XKDG extract,
            // UNFILTERED (before the purpose / direction filters below), keyed by
            // ISO date + hour branch. Read by travel-planner.js. Wrapped in try so
            // it can never affect BEST/LIST behaviour.
            if (window._tpHourCache) {
                try {
                    var _tpXkdgTags = analysisItems
                        .filter(function (i) { return i.tag === 'blue' || i.tag === 'family'; })
                        .map(function (i) { return i.text; });
                    window._tpHourCache[_isoDay + '#' + hZhi] = {
                        score: totalScore, iso: _isoDay,
                        hGan: hGan, hZhi: hZhi, dGan: dGan, dZhi: dZhi, hourIndex: h,
                        spiritEn: hourSpirit ? hourSpirit.en : '',
                        spiritAusp: hourSpirit ? hourSpirit.auspicious : null,
                        nayin: (nayinResBST && nayinResBST.label) ? nayinResBST.label : '',
                        ke: (typeof keScoreBST === 'number') ? keScoreBST : 0,
                        xkdgTags: _tpXkdgTags
                    };
                } catch (_tpErr) { /* never break the scan */ }
            }
            // ──────────────────────────────────────────────────────────────────

            const matchLabels = getMatchLabels(activeYear, activeYStem, activeYBranch, dayXkdg, dGan, dZhi, _personAPillars || _personBPillars, activeDayStem, activeDayBranch);
            const qualLabels  = analysisItems.filter(i => ['Powerful','Energetic','Very Weak','Very Timely','Timely','Timely at Birth'].includes(i.text)).map(i => i.text);
            const spiritLabel = hourSpirit ? `${hourSpirit.en}` : '';
            const nayinLabel  = nayinResBST.label || '';
            const nayinPersonLabel = nayinResBST.personLabel || '';
            const dd = dayDate.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

            // Purpose gate. In DIRECTION mode (a flight/journey direction is set)
            // QMDJ is dominant and XKDG is only a floor: keep the hour if its
            // score is >= 8, then let the Qimen direction match (below) decide.
            // Otherwise apply the normal, stricter purpose check.
            if (_fsActionPalace && getPurpose()) {
                if (totalScore < 8) { continue; }
            } else {
                if (!checkPurpose(getPurpose(), dGan, dZhi, blueItems, totalScore, pillars, analysisItems, hourSpirit)) { continue; }
            }
            // Purpose-Qimen scans — computed once, reused for the direction filter AND the badges below.
            var _qmParamsBST = { Y: solarDate.getFullYear(), M: solarDate.getMonth()+1, D: solarDate.getDate(), hGan: hGan, hZhi: hZhi };
            var _pqFsBST  = fsScanPurposeQimen(_qmParamsBST, getPurpose());        // 🌀⭐ Flying Stars (needs activator at palace)
            var _pqRotBST = fsScanPurposeQimenRotating(_qmParamsBST, getPurpose()); // → directional only (no activator)
            // Direction gate (QMDJ-dominant). A flight/journey direction is
            // POSITIVE when its palace on the ROTATING chart passes the same gate
            // used by the Travel Planner: a San Qi (乙丙丁) on the Heaven plate +
            // a favourable Door (Kai/Xiu/Sheng/JingS), Warrior 玄武 excluded.
            // (Previously this required a rare Wind/Dragon Dun config exactly at
            // the palace, which almost never occurs in a short window.)
            if (_fsActionPalace && getPurpose()) {
                var _dirOK = false;
                try {
                    if (typeof QMDJWaterScanner !== 'undefined'
                        && typeof QMDJWaterScanner.getRotatingHourChart === 'function'
                        && window.TravelPlanner && typeof window.TravelPlanner.evalPalace === 'function') {
                        var _rotChartBST = QMDJWaterScanner.getRotatingHourChart(
                            solarDate.getFullYear(), solarDate.getMonth()+1, solarDate.getDate(), hGan, hZhi);
                        var _pdBST = (_rotChartBST && _rotChartBST.palaces) ? _rotChartBST.palaces[_fsActionPalace] : null;
                        if (_pdBST) {
                            var _cfgCountBST = (typeof QMDJWaterScanner.checkRotatingPalace === 'function')
                                ? (QMDJWaterScanner.checkRotatingPalace(_rotChartBST, _fsActionPalace) || []).length : 0;
                            var _evalBST = window.TravelPlanner.evalPalace(_pdBST, _cfgCountBST);
                            // Favourable departure = favourable Door + San Qi (乙丙丁)
                            // on the HEAVEN plate (ti, rotating) — OBLIGATORY — Warrior/
                            // Tiger excluded. Earth-plate San Qi is ignored (constant all
                            // day). Red Bird 朱雀 and other deities are allowed.
                            var _SANQI_HB = ['Yi','Bing','Ding'];
                            _dirOK = !!(_evalBST && _evalBST.ok && !_evalBST.isWarrior && !_evalBST.isTiger
                                        && _SANQI_HB.indexOf(_evalBST.ti) !== -1);
                        }
                    } else {
                        // Fallback if the Travel Planner gate isn't available: keep the
                        // original Purpose-Qimen (rotating/flying) match at the palace.
                        _dirOK = _pqRotBST.some(function(h){ return h.palace === _fsActionPalace; })
                              || _pqFsBST.some(function(h){ return h.palace === _fsActionPalace; });
                    }
                } catch (_dirErr) { _dirOK = false; }
                if (!_dirOK) continue;
            }

            const activeFiltersBS = getActiveFilters();
            const blueLabels = blueItems
                .filter(i => activeFiltersBS.size === 0 || itemMatchesFilter(i.text, i.tag, activeFiltersBS))
                .map(i => i.text)
                .filter(t => t && !t.includes('undefined'));
            results.push({
                score: totalScore,
                negativeScore: negativeScoreBST,
                rescuedByNayin: bestRescuedByNayin,
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
                keScore: keScoreBST,
                fsBadge: fsComputeAllHousesBadges(dayXkdg.hex, dayXkdg.qi, dayXkdg.yun,
                    { Y: solarDate.getFullYear(), M: solarDate.getMonth()+1, D: solarDate.getDate(), hGan: hGan, hZhi: hZhi }),
                purposeQimen: _pqFsBST,
                purposeQimenR: _pqRotBST
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
        if (af.has('negatives')) {
            // Negatives mode: worst first (highest negativeScore first)
            res.sort((a,b) => (b.negativeScore||0) - (a.negativeScore||0));
        } else if (af.has('ke-wealth')) {
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
    // With a DIRECTION filter active: best score first by default, or strict
    // chronological order when the user toggles "📅 Date order".
    if (_fsActionPalace && getPurpose()) {
        if (window._dirChrono) results.sort((a,b) => a.rawDate - b.rawDate);
        else results.sort((a,b) => b.score - a.score || a.rawDate - b.rawDate);
    }
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
    { h: '38a8a3d7680c6ee9b31c99bca343c76cbb47d912b1e683d229fd629f9b28684f', t: 1, e: '2027-02-03' }, // Student 9316 — Wei year
    { h: '29e3ab78dfb38ec35c420a18e3cf5ee8b69de22b308545738c64982c980eccd1', t: 2, e: '2027-02-04', dmax: '2027-02-04' }, // Student 020620 — capped to 4 Feb 2027 (inclusive)
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
                applyTierRestrictions(lic.tier, lic.maxDate);
                setNow();
                return;
            }
        }
        const tierLabel = lic.tier === 0 ? 'Unlimited' : `${lic.tier}-Year`;
        const exp = lic.expiry ? ` · Expires ${lic.expiry}` : '';
        showLicenseBar(`✓ Licensed: ${tierLabel}${exp}`, '#e8f5e9', '#2e7d32');
        applyTierRestrictions(lic.tier, lic.maxDate);
        setNow();
    } catch(e) { showLicenseOverlay(); }
}

function applyTierRestrictions(tier, maxDate) {
    window._licenseTier = tier;
    let range = getAllowedDateRange(tier);

    // Per-student hard cap (e.g. "no dates beyond 4 Feb 2027"): caps the END
    // of whatever the tier allows. Applies ONLY when the student's code carries
    // a `dmax`, so other students keep their normal tier behavior.
    if (maxDate) {
        if (range) {
            if (range.end > maxDate) range.end = maxDate;
        } else {
            const idx = getCurrentChineseYearIndex();
            const start = (idx >= 0) ? CHINESE_YEAR_STARTS[idx].start : '1900-01-01';
            range = { start: start, end: maxDate };
        }
        window._licenseMaxDate = maxDate;
    } else {
        window._licenseMaxDate = null;
    }

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

    // Message-on-attempt + main date picker bounds — ONLY for an explicit cap.
    if (maxDate && range) {
        const dateInput = document.getElementById('date');
        if (dateInput) { dateInput.min = range.start; dateInput.max = range.end; }
        _xkdgAttachCapGuards();
    }
}

// Shows a transient message when a capped student tries to go past the limit.
function _xkdgCapMessage() {
    const cap = window._licenseMaxDate;
    if (!cap) return;
    let label = cap;
    try {
        label = new Date(cap + 'T00:00:00').toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
    } catch(e){}
    let toast = document.getElementById('xkdg-cap-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'xkdg-cap-toast';
        toast.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#c62828;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:bold;box-shadow:0 3px 12px rgba(0,0,0,0.3);z-index:99999;max-width:90%;text-align:center;';
        document.body.appendChild(toast);
    }
    toast.textContent = 'Access is limited to dates up to ' + label + '.';
    toast.style.display = 'block';
    clearTimeout(window._xkdgCapToastT);
    window._xkdgCapToastT = setTimeout(function(){ if (toast) toast.style.display = 'none'; }, 3500);
}

// Attaches once: clamps #date and #scan-start to the allowed range and warns.
function _xkdgAttachCapGuards() {
    if (window._xkdgCapGuardsOn) return;
    window._xkdgCapGuardsOn = true;
    function guard(el) {
        if (!el) return;
        el.addEventListener('change', function(){
            const r = window._licenseRange;
            if (!r || !window._licenseMaxDate || !el.value) return;
            if (el.value > r.end) { el.value = r.end; _xkdgCapMessage(); }
            else if (el.value < r.start) { el.value = r.start; }
        });
    }
    guard(document.getElementById('date'));
    guard(document.getElementById('scan-start'));
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
    let maxDate = null;

    // Validation is LOCAL (SHA-256). The old Netlify server endpoint is no
    // longer used — the site is served directly from GitHub Pages.
    const hashed = await hashPin(pin);
    const match = _HASHED_CODES.find(c => c.h === hashed);
    if (match) {
        validated = true;
        tier = match.t;
        expiry = match.e;
        maxDate = match.dmax || null;
    }

    if (validated) {
        localStorage.setItem('xkdg_license', JSON.stringify({ tier, expiry, maxDate }));
        document.getElementById('license-overlay').style.display = 'none';
        checkLicense();
        setNow();
        try { _xkdgConsultRestore(); } catch(e){}
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



// Remove the obsolete "Test mode" checkbox next to PURPOSES (no longer used).
// Additive + guarded. With the element gone, every `purpose-no-person` lookup
// reads null and test mode is simply treated as OFF.
(function(){
  function _removeTestMode(){
    try {
      var cb = document.getElementById('purpose-no-person');
      if (!cb) return;
      var lbl = (cb.closest ? cb.closest('label') : null) || cb.parentNode || cb;
      if (lbl && lbl.parentNode) lbl.parentNode.removeChild(lbl);
    } catch(e){}
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _removeTestMode);
    else _removeTestMode();
  } catch(e){}
})();


// ════════════════════════════════════════════════════════════════════════
//  Consultation convenience (additive + guarded):
//   1. Auto-restore the last person used in Person A / Person B on reopen.
//   2. (Their birth Bazi/XKDG details stay hidden by default via the existing
//      applyPersonDetailsVisibility "seen" logic — openable with the toggle.)
//   3. Default the SCAN start date (#scan-start) to today.
//  Runs ONCE, after the app is unlocked and the main date is set.
// ════════════════════════════════════════════════════════════════════════
// Full snapshot of a panel's inputs (name + birth date/time, plus Person B
// depth/year), so the person can be restored even if they were typed by hand
// and never saved to the archive — this is what fixes "name loads but date does not".
function _xkdgSnapshotPerson(person){
  try {
    var isB = (person === 'B' || person === 'b');
    var name = (document.getElementById(isB ? 'person-name-b' : 'person-name') || {}).value;
    var date = (document.getElementById(isB ? 'person-date-b' : 'person-date') || {}).value;
    var time = (document.getElementById(isB ? 'person-time-b' : 'person-time') || {}).value;
    name = (name || '').trim(); date = date || ''; time = time || '';
    var snap = { name:name, date:date, time:time };
    if (isB){
      var depthEl = document.getElementById('person-pillars-b');
      var yearEl  = document.getElementById('person-year-b');
      if (depthEl) snap.depth = parseInt(depthEl.value, 10) || 4;
      if (yearEl)  snap.year  = yearEl.value || '';
    }
    if (!name || !(date || (isB && snap.year))) return;        // need name + (date or year)
    localStorage.setItem(isB ? 'xkdg_last_person_b' : 'xkdg_last_person_a', JSON.stringify(snap));
  } catch(e){}
}
// Kept for existing call sites — now stores the full snapshot read from the inputs.
function _xkdgSetLastPerson(person, name){ _xkdgSnapshotPerson(person); }

function _xkdgApplyPersonSnap(person, snap){
  try {
    var isB = (person === 'B' || person === 'b');
    if (isB){                                                  // Person B panel may need opening first
      try {
        if (typeof _personPanelOpen !== 'undefined' && _personPanelOpen && !_personPanelOpen.b && typeof togglePersonPanel === 'function') togglePersonPanel('b');
        var pb = document.getElementById('person-panel-b');
        if (pb && pb.style.display === 'none') pb.style.display = 'block';
      } catch(e){}
    }
    var nameEl = document.getElementById(isB ? 'person-name-b' : 'person-name');
    var dateEl = document.getElementById(isB ? 'person-date-b' : 'person-date');
    var timeEl = document.getElementById(isB ? 'person-time-b' : 'person-time');
    if (nameEl) nameEl.value = snap.name;
    if (dateEl && snap.date) dateEl.value = snap.date;          // restores the birth date explicitly
    if (timeEl && snap.time) timeEl.value = snap.time;
    if (isB){
      var depthEl = document.getElementById('person-pillars-b');
      if (depthEl && snap.depth){ depthEl.value = snap.depth; if (typeof onPersonBPillarsChange === 'function') onPersonBPillarsChange(); }
      var yearEl = document.getElementById('person-year-b');
      if (yearEl && snap.year) yearEl.value = snap.year;
    }
    if (typeof calculateBazi === 'function') calculateBazi();
    if (typeof calculatePerson === 'function') calculatePerson(person);
    if (typeof fsAutoLoadHouse === 'function') fsAutoLoadHouse(snap.name);
    // A restored person was, by definition, already entered before → keep the
    // birth Bazi/XKDG details collapsed by default (the toggle re-opens them).
    try {
      var _k = isB ? 'b' : 'a';
      if (!window._personDetailsVisible) window._personDetailsVisible = { a:true, b:true };
      window._personDetailsVisible[_k] = false;
      if (typeof setPersonDetailsVisibility === 'function') setPersonDetailsVisibility(_k, false);
    } catch(e){}
  } catch(e){ console.warn('_xkdgApplyPersonSnap', e); }
}

function _xkdgReadSnap(person){
  var isB = (person === 'B');
  var raw = localStorage.getItem(isB ? 'xkdg_last_person_b' : 'xkdg_last_person_a');
  if (!raw) return null;
  var snap = null;
  try { snap = JSON.parse(raw); } catch(e){ snap = null; }
  if (typeof snap === 'string') snap = null;
  if (!snap){                                                  // back-compat: old name-only value → archive
    var nm = raw;
    var arch = (typeof loadArchive === 'function') ? loadArchive(isB ? 'xkdg_persons_b' : 'xkdg_persons_a') : null;
    if (arch && arch[nm]) snap = { name:nm, date:arch[nm].date, time:arch[nm].time, depth:arch[nm].depth, year:arch[nm].jiaZiYear };
    else return null;
  }
  if (!snap.name || !(snap.date || snap.year)) return null;
  return snap;
}

function _xkdgRestoreLastPerson(person){
  try {
    var snap = _xkdgReadSnap(person);
    if (!snap) return;
    _xkdgApplyPersonSnap(person, snap);
    // Re-assert against late browser form-restoration that can blank the date
    // input AFTER our restore (common on soft reload with <input type="date">).
    var isB = (person === 'B');
    var dateId = isB ? 'person-date-b' : 'person-date';
    function reassert(){
      try {
        var dEl = document.getElementById(dateId);
        if (snap.date && dEl && dEl.value !== snap.date) _xkdgApplyPersonSnap(person, snap);
      } catch(e){}
    }
    setTimeout(reassert, 700);
    setTimeout(reassert, 1800);
  } catch(e){ console.warn('_xkdgRestoreLastPerson', e); }
}

// Save the snapshot the instant the user edits a person field — independent of
// pressing CALCULATE, so persistence can never be missed.
function _xkdgAttachPersonAutosave(){
  try {
    if (window._xkdgAutosaveAttached) return;
    window._xkdgAutosaveAttached = true;
    ['person-name','person-date','person-time'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function(){ try { _xkdgSnapshotPerson('A'); } catch(e){} });
    });
    ['person-name-b','person-date-b','person-time-b','person-pillars-b','person-year-b'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function(){ try { _xkdgSnapshotPerson('B'); } catch(e){} });
    });
  } catch(e){}
}
function _xkdgConsultRestore(){
  if (window._xkdgRestored) return;
  window._xkdgRestored = true;
  try {
    var ss = document.getElementById('scan-start');
    if (ss && !ss.value && typeof setScanNow === 'function') setScanNow();   // point 3: today by default
  } catch(e){}
  try { _xkdgRestoreLastPerson('A'); } catch(e){}                            // point 1: last Person A
  try { _xkdgRestoreLastPerson('B'); } catch(e){}                            // point 1: last Person B
  try { _xkdgAttachPersonAutosave(); } catch(e){}                            // bulletproof persistence
}
(function(){
  var tries = 0;
  function _isUnlocked(){
    try {
      var ov = document.getElementById('license-overlay');
      if (!ov) return true;
      if (ov.style.display === 'none') return true;
      return (window.getComputedStyle ? getComputedStyle(ov).display === 'none' : false);
    } catch(e){ return false; }
  }
  function _ready(){
    var d = document.getElementById('date');
    return _isUnlocked()
      && document.getElementById('scan-start')
      && document.getElementById('person-name')
      && d && d.value;                                  // wait until setNow() has set the main date
  }
  function _poll(){
    if (window._xkdgRestored) return;
    tries++;
    try { if (_ready()){ _xkdgConsultRestore(); return; } } catch(e){}
    if (tries < 60) setTimeout(_poll, 400);             // retry up to ~24s while the user unlocks
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(_poll, 250); });
    else setTimeout(_poll, 250);
  } catch(e){}
})();

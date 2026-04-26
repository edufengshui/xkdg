// xkdq_hex.js - Esagrammi XKDG da Bazi
const STEM_TO_TRIGRAM = {
    'Jia': 'Zhen', 'Yi': 'Xun', 'Bing': 'Li', 'Ding': 'Li',
    'Wu': 'Kun', 'Ji': 'Kun', 'Geng': 'Dui', 'Xin': 'Dui',
    'Ren': 'Qian', 'Gui': 'Qian'
};
const BRANCH_TO_TRIGRAM = {
    'Zi': 'Kan', 'Chou': 'Gen', 'Yin': 'Zhen', 'Mao': 'Zhen',
    'Chen': 'Xun', 'Si': 'Xun', 'Wu': 'Li', 'Wei': 'Kun',
    'Shen': 'Kun', 'You': 'Dui', 'Xu': 'Qian', 'Hai': 'Qian'
};
const TRIGRAM_TO_BINARY = {
    'Qian': '111', 'Dui': '110', 'Li': '101', 'Zhen': '100',
    'Xun': '011', 'Kan': '010', 'Gen': '001', 'Kun': '000'
};
const BINARY_TO_HEX = {
    '111111': 1, '000000': 2, '100010': 3, '010001': 4, '111010': 5, '010111': 6,
    '010000': 7, '000010': 8, '111011': 9, '110111': 10, '111000': 11, '000111': 12,
    '101111': 13, '111101': 14, '001000': 15, '000100': 16, '100110': 17, '011001': 18,
    '100000': 19, '000001': 20, '100101': 21, '101001': 22, '000011': 23, '110000': 24,
    '100111': 25, '111001': 26, '100001': 27, '011110': 28, '010010': 29, '101101': 30,
    '001110': 31, '011100': 32, '001111': 33, '111100': 34, '000101': 35, '101000': 36,
    '101011': 37, '110101': 38, '001010': 39, '010100': 40, '110001': 41, '100011': 42,
    '111110': 43, '011111': 44, '000110': 45, '011000': 46, '010110': 47, '011010': 48,
    '101110': 49, '011101': 50, '100100': 51, '001001': 52, '001011': 53, '110100': 54,
    '101100': 55, '001101': 56, '011011': 57, '110110': 58, '010011': 59, '110010': 60,
    '110011': 61, '001100': 62, '101010': 63, '010101': 64
};
const HEX_NAMES = {
    1:'Qian', 2:'Kun', 3:'Zhun', 4:'Meng', 5:'Xu', 6:'Song', 7:'Shi', 8:'Bi',
    9:'Xiao Xu', 10:'Lu', 11:'Tai', 12:'Pi', 13:'Tong Ren', 14:'Da You', 15:'Qian', 16:'Yu',
    17:'Sui', 18:'Gu', 19:'Lin', 20:'Guan', 21:'Shi He', 22:'Bi', 23:'Bo', 24:'Fu',
    25:'Wu Wang', 26:'Da Xu', 27:'Yi', 28:'Da Guo', 29:'Kan', 30:'Li', 31:'Xian', 32:'Heng',
    33:'Dun', 34:'Da Zhuang', 35:'Jin', 36:'Ming Yi', 37:'Jia Ren', 38:'Kui', 39:'Jian', 40:'Jie',
    41:'Sun', 42:'Yi', 43:'Guai', 44:'Gou', 45:'Cui', 46:'Sheng', 47:'Kun', 48:'Jing',
    49:'Ge', 50:'Ding', 51:'Zhen', 52:'Gen', 53:'Jian', 54:'Gui Mei', 55:'Feng', 56:'Lu',
    57:'Xun', 58:'Dui', 59:'Huan', 60:'Jie', 61:'Zhong Fu', 62:'Xiao Guo', 63:'Ji Ji', 64:'Wei Ji'
};
function getXKDGHexagram(stem, branch) {
    const upperTri = STEM_TO_TRIGRAM[stem]; // ← mancava [stem]
    const lowerTri = BRANCH_TO_TRIGRAM[branch];
    if (!upperTri ||!lowerTri) return { num: 0, name: 'Error' };

    const upperBin = TRIGRAM_TO_BINARY[upperTri];
    const lowerBin = TRIGRAM_TO_BINARY[lowerTri];
    const fullBin = upperBin + lowerBin;
    const hexNum = BINARY_TO_HEX[fullBin] || 0;

    return {
        num: hexNum,
        name: HEX_NAMES[hexNum] || 'Unknown',
        upper: upperTri,
        lower: lowerTri,
        binary: fullBin
    };
}

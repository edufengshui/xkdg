// xkdg_hex.js - VERSIONE SICURA
if (typeof window.XKDG_HEX_LOADED === 'undefined') {
  window.XKDG_HEX_LOADED = true;

  const STEM_TO_TRIGRAM = {
    'Jia': 1, 'Yi': 8, 'Bing': 3, 'Ding': 3,
    'Wu': 7, 'Ji': 7, 'Geng': 2, 'Xin': 2,
    'Ren': 6, 'Gui': 6
  };

  const BRANCH_TO_TRIGRAM = {
    'Zi': 6, 'Chou': 7, 'Yin': 4, 'Mao': 4,
    'Chen': 4, 'Si': 3, 'Wu': 3, 'Wei': 7,
    'Shen': 2, 'You': 2, 'Xu': 7, 'Hai': 6
  };

  function getHexFromStemBranch(stem, branch) {
    const lower = STEM_TO_TRIGRAM[stem]; // trigramma inferiore
    const upper = BRANCH_TO_TRIGRAM[branch]; // trigramma superiore
    const hexNum = TRIGRAM_TO_HEX[`${upper}-${lower}`];
    return HEXAGRAMS[hexNum];
  }

  window.getHexFromStemBranch = getHexFromStemBranch;
}

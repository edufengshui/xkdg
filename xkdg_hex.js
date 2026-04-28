// xkdg_hex.js - Logica e Dati Xuan Kong Da Gua
if (typeof window.XKDG_HEX_LOADED === 'undefined') {
    window.XKDG_HEX_LOADED = true;

    // Tabella XKDG Completa (60 Jia Zi)
    const XKDG_TABLE = {
        '甲子': { hex: 2,  qi: 1, yun: 1 }, '乙丑': { hex: 21, qi: 3, yun: 6 },
        '丙寅': { hex: 37, qi: 2, yun: 4 }, '丁卯': { hex: 41, qi: 6, yun: 9 },
        '戊辰': { hex: 10, qi: 9, yun: 6 }, '己巳': { hex: 34, qi: 8, yun: 2 },
        '庚午': { hex: 32, qi: 8, yun: 9 }, '辛未': { hex: 6,  qi: 9, yun: 3 },
        '壬申': { hex: 7,  qi: 1, yun: 7 }, '癸酉': { hex: 53, qi: 2, yun: 7 },
        '甲戌': { hex: 39, qi: 7, yun: 2 }, '乙亥': { hex: 35, qi: 3, yun: 3 },
        '丙子': { hex: 27, qi: 6, yun: 3 }, '丁丑': { hex: 17, qi: 4, yun: 7 },
        '戊寅': { hex: 55, qi: 8, yun: 6 }, '己卯': { hex: 60, qi: 7, yun: 7 },
        '庚辰': { hex: 11, qi: 1, yun: 9 }, '辛巳': { hex: 14, qi: 3, yun: 7 },
        '壬午': { hex: 57, qi: 2, yun: 1 }, '癸未': { hex: 48, qi: 4, yun: 6 },
        '甲申': { hex: 64, qi: 3, yun: 9 }, '乙酉': { hex: 33, qi: 9, yun: 4 },
        '丙戌': { hex: 52, qi: 6, yun: 1 }, '丁亥': { hex: 16, qi: 8, yun: 8 },
        '戊子': { hex: 3,  qi: 7, yun: 4 }, '己丑': { hex: 25, qi: 9, yun: 2 },
        '庚寅': { hex: 49, qi: 3, yun: 2 }, '辛卯': { hex: 61, qi: 2, yun: 3 },
        '壬辰': { hex: 26, qi: 6, yun: 4 }, '癸巳': { hex: 43, qi: 4, yun: 6 },
        '甲午': { hex: 1,  qi: 9, yun: 1 }, '乙未': { hex: 38, qi: 7, yun: 6 },
        '丙申': { hex: 40, qi: 8, yun: 4 }, '丁酉': { hex: 31, qi: 4, yun: 9 },
        '戊戌': { hex: 15, qi: 1, yun: 6 }, '己亥': { hex: 20, qi: 2, yun: 2 },
        '庚子': { hex: 42, qi: 2, yun: 9 }, '辛丑': { hex: 36, qi: 1, yun: 3 },
        '壬寅': { hex: 13, qi: 9, yun: 7 }, '癸卯': { hex: 54, qi: 8, yun: 7 },
        '甲辰': { hex: 38, qi: 3, yun: 6 }, // Corretto: Jia Chen -> #38 Kui
        '乙巳': { hex: 5,  qi: 7, yun: 3 }, '丙午': { hex: 28, qi: 4, yun: 3 },
        '丁未': { hex: 18, qi: 6, yun: 7 }, '戊申': { hex: 59, qi: 2, yun: 6 },
        '己酉': { hex: 56, qi: 3, yun: 8 }, '庚戌': { hex: 12, qi: 9, yun: 9 },
        '辛亥': { hex: 8,  qi: 7, yun: 7 }, '壬子': { hex: 51, qi: 8, yun: 1 },
        '癸丑': { hex: 22, qi: 6, yun: 8 }, '甲寅': { hex: 63, qi: 7, yun: 9 },
        '乙卯': { hex: 19, qi: 1, yun: 4 }, '丙辰': { hex: 58, qi: 4, yun: 1 },
        '丁巳': { hex: 9,  qi: 2, yun: 8 }, '戊午': { hex: 50, qi: 3, yun: 4 },
        '己未': { hex: 46, qi: 1, yun: 2 }, '庚申': { hex: 4,  qi: 7, yun: 2 },
        '辛酉': { hex: 62, qi: 8, yun: 3 }, '壬戌': { hex: 45, qi: 4, yun: 4 },
        '癸亥': { hex: 23, qi: 6, yun: 6 }
    };

    // Helper per icone Unicode
    window.getHexIcon = (n) => String.fromCodePoint(0x4DC0 + n - 1);

    // Funzione principale di recupero dati
    window.getXkdgData = (stem, branch) => {
        const key = stem + branch;
        return XKDG_TABLE[key] || null;
    };

    /**
     * Analisi Relazioni (Giorno come riferimento)
     * Controlla: Somme 5-10-15, HeTu (Blood Links), Pure Qi
     */
    window.analyzeXkdg = (pillars) => {
        if (!pillars.day) return [];
        const dayQi = pillars.day.qi;
        const dayYun = pillars.day.yun;
        const analysis = [];

        Object.keys(pillars).forEach(key => {
            if (key === 'day') return;
            const p = pillars[key];
            const pName = { year: 'Anno', month: 'Mese', hour: 'Ora' }[key];
            
            // 1. Blood Links (HeTu Pairs: 1-6, 2-7, 3-8, 4-9)
            const pair = [dayQi, p.qi].sort().join('-');
            if (['1-6', '2-7', '3-8', '4-9'].includes(pair)) {
                analysis.push(`[${pName}] HeTu Blood Link (Elemento ${dayQi === 1 || dayQi === 6 ? 'Acqua' : dayQi === 2 || dayQi === 7 ? 'Fuoco' : dayQi === 3 || dayQi === 8 ? 'Legno' : 'Metallo'})`);
            }

            // 2. Somme Gua Qi
            const sum = dayQi + p.qi;
            if ([5, 10, 15].includes(sum)) analysis.push(`[${pName}] Somma XKDG: ${sum}`);

            // 3. Pure Qi (Gua Yun)
            if (dayYun === p.yun) analysis.push(`[${pName}] Pure Qi (Periodo ${dayYun})`);
        });

        return analysis;
    };
}

// ============================================================
// flying-stars.js — Modulo Stelle Volanti (玄空飛星)
// XKDG Bazi Calculator
// ============================================================
//
// USO:
//   1. Aggiungi in index.html: <script src="flying-stars.js"></script>
//   2. Nel tuo codice:
//      const chart = FlyingStars.calculate(period, facingMountain);
//      FlyingStars.draw(canvas, chart, { language: 'zh' });
//
// ESEMPIO:
//   const chart = FlyingStars.calculate(8, '子');
//   FlyingStars.draw(document.getElementById('myCanvas'), chart);
//
// ============================================================

const FlyingStars = (() => {

    // ----------------------------------------------------------
    // COSTANTI
    // ----------------------------------------------------------

    // Griglia 3×3 con Sud in alto (tradizionale cinese):
    //
    //   idx 0 (SE/巽)  |  idx 1 (S/離)   |  idx 2 (SW/坤)
    //   idx 3 (E/震)   |  idx 4 (Centro)  |  idx 5 (W/兌)
    //   idx 6 (NE/艮)  |  idx 7 (N/坎)   |  idx 8 (NW/乾)
    //
    // Numeri Luo Shu base in ogni palazzo:
    //   4 | 9 | 2
    //   3 | 5 | 7
    //   8 | 1 | 6

    // Ordine di volo attraverso i palazzi (per indice griglia):
    // Centro → NW → W → NE → S → N → SW → E → SE
    const FLYING_ORDER = [4, 8, 5, 6, 1, 7, 2, 3, 0];

    // 24 Montagne raggruppate per direzione
    // Ogni direzione ha 3 montagne: [prima, seconda, terza]
    // Prima  = 地元龍 (Earth Dragon)
    // Seconda = 天元龍 (Heaven Dragon)
    // Terza  = 人元龍 (Human Dragon)
    const MOUNTAINS_24 = {
        'N':  ['壬', '子', '癸'],
        'NE': ['丑', '艮', '寅'],
        'E':  ['甲', '卯', '乙'],
        'SE': ['辰', '巽', '巳'],
        'S':  ['丙', '午', '丁'],
        'SW': ['未', '坤', '申'],
        'W':  ['庚', '酉', '辛'],
        'NW': ['戌', '乾', '亥']
    };

    // Lista piatta di tutte le 24 montagne (per validazione)
    const ALL_MOUNTAINS = Object.values(MOUNTAINS_24).flat();

    // Mappa direzione → indice griglia
    const DIR_TO_INDEX = {
        'SE': 0, 'S': 1, 'SW': 2,
        'E':  3, 'C': 4, 'W':  5,
        'NE': 6, 'N': 7, 'NW': 8
    };

    // Direzioni opposte
    const OPPOSITES = {
        'N': 'S',   'S': 'N',   'E': 'W',   'W': 'E',
        'NE': 'SW', 'SW': 'NE', 'NW': 'SE', 'SE': 'NW'
    };

    // Etichette per ogni cella della griglia
    const DIR_LABELS_ZH  = ['巽SE', '離S', '坤SW', '震E', '', '兌W', '艮NE', '坎N', '乾NW'];
    const DIR_LABELS_EN  = ['SE',   'S',   'SW',   'E',   '', 'W',   'NE',   'N',   'NW'];

    // ── 替卦 (Replacement / substitute-star charts) ────────────────────────────
    // Used when the facing sits in the 兼向 zone (near a mountain boundary). The
    // ONLY change vs the down-gua (下卦) is the number placed at the centre of the
    // facing/sitting flight: the base star at that palace is replaced by the
    // "substitute star" (替星) of the mountain occupying the same 地/天/人 position
    // in that base star's home palace. Flight direction (順/逆) and the period
    // chart (運盤) are unchanged. Derived from and verified against Edu's full set
    // of 216 replacement charts (214/216 exact; the 2 that differ are data-entry
    // slips in the source file: 壬 P5 山/向 swapped, 巳 P7 山 wrong).
    //   替星訣: 子癸甲申→貪狼1 · 壬卯乙未坤→巨門2 · 辰巽巳戌乾亥→武曲6
    //           丑艮丙酉辛→破軍7 · 寅午丁庚→右弼9.  Base star 5 has no 替 (stays 5).
    const REPLACEMENT_STAR = {
        '子':1, '癸':1, '甲':1, '申':1,
        '壬':2, '卯':2, '乙':2, '未':2, '坤':2,
        '辰':6, '巽':6, '巳':6, '戌':6, '乾':6, '亥':6,
        '丑':7, '艮':7, '丙':7, '酉':7, '辛':7,
        '寅':9, '午':9, '丁':9, '庚':9
    };
    // Luo Shu number → home palace direction (5 = centre, no home)
    const LUOSHU_TO_DIR = { 1:'N', 2:'SW', 3:'E', 4:'SE', 6:'NW', 7:'W', 8:'NE', 9:'S' };

    /**
     * Stella-sostituto (替星) da mettere al centro del volo nel 替卦.
     * @param {number} baseStarAtPalace - stella base (運星) nel palazzo di facing/sitting
     * @param {number} mountainPosition  - posizione 1/2/3 (地/天/人) della montagna
     * @returns {number} numero della stella da far volare (1-9)
     */
    function replacementCenterStar(baseStarAtPalace, mountainPosition) {
        if (baseStarAtPalace === 5) return 5;              // 5 非替: resta 5
        const dir = LUOSHU_TO_DIR[baseStarAtPalace];
        const mtn = MOUNTAINS_24[dir][mountainPosition - 1];
        return REPLACEMENT_STAR[mtn];
    }

    // ----------------------------------------------------------
    // FUNZIONI DI CALCOLO
    // ----------------------------------------------------------

    /**
     * Trova la posizione di una montagna (1ª, 2ª o 3ª) e la sua direzione.
     * @param {string} mountain - Carattere cinese (es. '子', '壬', '巽')
     * @returns {{ direction: string, position: number } | null}
     */
    function getMountainPosition(mountain) {
        for (const dir in MOUNTAINS_24) {
            const idx = MOUNTAINS_24[dir].indexOf(mountain);
            if (idx !== -1) {
                return { direction: dir, position: idx + 1 };
            }
        }
        return null;
    }

    /**
     * Restituisce la direzione opposta.
     */
    function getOppositeDirection(dir) {
        return OPPOSITES[dir] || null;
    }

    /**
     * Restituisce la montagna seduta (opposta alla facciata).
     * Stessa posizione (1ª/2ª/3ª) nella direzione opposta.
     */
    function getSittingMountain(facingMountain) {
        const info = getMountainPosition(facingMountain);
        if (!info) return null;
        const oppositeDir = getOppositeDirection(info.direction);
        return MOUNTAINS_24[oppositeDir][info.position - 1];
    }

    /**
     * Determina se la stella vola in avanti (順飛) o indietro (逆飛).
     *
     * REGOLA:
     *   - 1ª montagna: stelle dispari → avanti, pari → indietro
     *   - 2ª o 3ª montagna: esatto contrario (dispari → indietro, pari → avanti)
     *
     * @param {number} starAtCenter - Numero della stella al centro (1-9)
     * @param {number} mountainPosition - Posizione della montagna (1, 2 o 3)
     * @returns {boolean} true = avanti (順飛), false = indietro (逆飛)
     */
    function isForwardFlying(starAtCenter, mountainPosition, period) {
        // Il 5 giallo non ha montagna propria: segue la polarità della STELLA DEL PERIODO
        // (es. Periodo 8 = pari), NON la parità del numero 5.
        const s = (starAtCenter === 5 && period != null) ? period : starAtCenter;
        const isOdd = (s % 2 !== 0);
        if (mountainPosition === 1) {
            return isOdd;       // 1ª montagna: dispari=avanti, pari=indietro
        } else {
            return !isOdd;      // 2ª/3ª montagna: dispari=indietro, pari=avanti
        }
    }

    /**
     * Fa volare le stelle dal centro attraverso il percorso Luo Shu.
     * @param {number} centerStar - Stella al centro (1-9)
     * @param {boolean} forward - true=avanti, false=indietro
     * @returns {number[]} Array di 9 numeri, indicizzati per posizione griglia
     */
    function flyStars(centerStar, forward) {
        const result = new Array(9);
        for (let i = 0; i < 9; i++) {
            let starNum;
            if (forward) {
                starNum = ((centerStar - 1 + i) % 9) + 1;
            } else {
                starNum = ((centerStar - 1 - i + 90) % 9) + 1; // +90 evita negativi
            }
            result[FLYING_ORDER[i]] = starNum;
        }
        return result;
    }

    /**
     * Calcola il quadro completo delle Stelle Volanti.
     *
     * @param {number} period - Numero del periodo/運 (1-9)
     * @param {string} facingMountain - Una delle 24 montagne (carattere cinese)
     * @returns {object} Dati del quadro con stelle base, verso, seduta
     */
    function calculate(period, facingMountain, replacement) {
        // Validazione
        if (period < 1 || period > 9) {
            throw new Error('Il periodo deve essere tra 1 e 9. Ricevuto: ' + period);
        }
        if (!ALL_MOUNTAINS.includes(facingMountain)) {
            throw new Error('Montagna sconosciuta: ' + facingMountain +
                '. Valide: ' + ALL_MOUNTAINS.join(', '));
        }
        const isRepl = !!replacement;   // 替卦 mode when true; default (false) = 下卦

        // 1. Quadro base (運盤): periodo al centro, sempre avanti
        const baseStars = flyStars(period, true);

        // 2. Info sulla facciata
        const facingInfo = getMountainPosition(facingMountain);
        const facingDir = facingInfo.direction;
        const facingPos = facingInfo.position;

        // 3. Info sulla seduta (opposta)
        const sittingDir = getOppositeDirection(facingDir);
        const sittingMountain = getSittingMountain(facingMountain);
        const sittingPos = facingPos; // stessa posizione nella direzione opposta

        // 4. Stelle verso (向星). In 替卦 il numero al centro è sostituito dal 替星;
        //    la DIREZIONE 順/逆 resta quella del 下卦 (dettata dalla stella base).
        const facingPalaceIdx = DIR_TO_INDEX[facingDir];
        const facingBaseStar = baseStars[facingPalaceIdx];
        const facingCenterStar = isRepl ? replacementCenterStar(facingBaseStar, facingPos) : facingBaseStar;
        const facingForward = isForwardFlying(facingBaseStar, facingPos, period);
        const facingStars = flyStars(facingCenterStar, facingForward);

        // 5. Stelle seduta (山星)
        const sittingPalaceIdx = DIR_TO_INDEX[sittingDir];
        const sittingBaseStar = baseStars[sittingPalaceIdx];
        const sittingCenterStar = isRepl ? replacementCenterStar(sittingBaseStar, sittingPos) : sittingBaseStar;
        const sittingForward = isForwardFlying(sittingBaseStar, sittingPos, period);
        const sittingStars = flyStars(sittingCenterStar, sittingForward);

        return {
            period,
            facingMountain,
            sittingMountain,
            facingDirection: facingDir,
            sittingDirection: sittingDir,
            facingMountainPosition: facingPos,
            sittingMountainPosition: sittingPos,
            replacement: isRepl,   // true = 替卦 (Replacement), false = 下卦 (Down-gua)
            baseStars,        // 運星 — 9 valori indicizzati per posizione griglia
            facingStars,      // 向星 — 9 valori
            sittingStars,     // 山星 — 9 valori
            facingForward,    // true = 順飛, false = 逆飛
            sittingForward    // true = 順飛, false = 逆飛
        };
    }

    // ----------------------------------------------------------
    // FUNZIONE DI DISEGNO SU CANVAS
    // ----------------------------------------------------------

    /**
     * Disegna il quadro delle Stelle Volanti su un canvas.
     *
     * @param {HTMLCanvasElement} canvas - L'elemento canvas su cui disegnare
     * @param {object} chartData - Risultato di calculate()
     * @param {object} [options] - Opzioni di visualizzazione
     */
    function draw(canvas, chartData, options) {
        const opt = Object.assign({
            backgroundColor:  '#1a1a2e',
            gridColor:        '#c9a84c',
            baseStarColor:    '#ffffff',
            facingStarColor:  '#ff6b6b',
            sittingStarColor: '#4ecdc4',
            directionColor:   '#999999',
            titleColor:       '#c9a84c',
            centerHighlight:  'rgba(201,168,76,0.12)',
            showTitle:        true,
            showLegend:       true,
            showDirections:   true,
            language:         'zh',    // 'zh' o 'en'
            fontFamily:       'sans-serif'
        }, options || {});

        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const font = opt.fontFamily;

        // Pulizia
        ctx.fillStyle = opt.backgroundColor;
        ctx.fillRect(0, 0, W, H);

        // Layout
        const margin = W * 0.05;
        const titleH = opt.showTitle ? H * 0.1 : 0;
        const legendH = opt.showLegend ? H * 0.06 : 0;
        const gridTop = margin + titleH;
        const availH = H - gridTop - margin - legendH;
        const availW = W - margin * 2;
        const gridSize = Math.min(availW, availH);
        const gridLeft = (W - gridSize) / 2;
        const cell = gridSize / 3;

        // ----- TITOLO -----
        if (opt.showTitle) {
            ctx.fillStyle = opt.titleColor;
            ctx.font = 'bold ' + (W * 0.042) + 'px ' + font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const title = opt.language === 'zh'
                ? '第' + chartData.period + '運  ' +
                  chartData.facingMountain + '山' +
                  chartData.sittingMountain + '向  飛星盤'
                : 'Period ' + chartData.period + '  Facing ' +
                  chartData.facingMountain + '  Flying Stars';
            ctx.fillText(title, W / 2, margin + titleH * 0.4);

            // Sotto-titolo con direzione di volo
            ctx.font = (W * 0.026) + 'px ' + font;
            ctx.fillStyle = '#888';
            const fDir = chartData.facingForward
                ? (opt.language === 'zh' ? '順飛' : 'Forward')
                : (opt.language === 'zh' ? '逆飛' : 'Reverse');
            const sDir = chartData.sittingForward
                ? (opt.language === 'zh' ? '順飛' : 'Forward')
                : (opt.language === 'zh' ? '逆飛' : 'Reverse');
            const sub = opt.language === 'zh'
                ? '向星: ' + fDir + '  |  山星: ' + sDir
                : 'Facing: ' + fDir + '  |  Sitting: ' + sDir;
            ctx.fillText(sub, W / 2, margin + titleH * 0.78);
        }

        // ----- GRIGLIA -----
        ctx.strokeStyle = opt.gridColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(gridLeft, gridTop, gridSize, gridSize);

        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(gridLeft + cell * i, gridTop);
            ctx.lineTo(gridLeft + cell * i, gridTop + gridSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(gridLeft, gridTop + cell * i);
            ctx.lineTo(gridLeft + gridSize, gridTop + cell * i);
            ctx.stroke();
        }

        // ----- CELLE -----
        const dirLabels = opt.language === 'zh' ? DIR_LABELS_ZH : DIR_LABELS_EN;

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const idx = row * 3 + col;
                const cx = gridLeft + col * cell + cell / 2;
                const cy = gridTop + row * cell + cell / 2;

                // Sfondo centro evidenziato
                if (idx === 4) {
                    ctx.fillStyle = opt.centerHighlight;
                    ctx.fillRect(gridLeft + col * cell + 1, gridTop + row * cell + 1,
                                 cell - 2, cell - 2);
                }

                // Etichetta direzione (basso della cella)
                if (opt.showDirections && dirLabels[idx]) {
                    ctx.fillStyle = opt.directionColor;
                    ctx.font = (cell * 0.13) + 'px ' + font;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(dirLabels[idx], cx, cy + cell * 0.46);
                }

                // Stella base / 運星 (centro, grande)
                ctx.fillStyle = opt.baseStarColor;
                ctx.font = 'bold ' + (cell * 0.32) + 'px ' + font;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(chartData.baseStars[idx], cx, cy + cell * 0.05);

                // Stella seduta / 山星 (in alto a sinistra)
                ctx.fillStyle = opt.sittingStarColor;
                ctx.font = 'bold ' + (cell * 0.22) + 'px ' + font;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(chartData.sittingStars[idx],
                             cx - cell * 0.4, cy - cell * 0.4);

                // Stella verso / 向星 (in alto a destra)
                ctx.fillStyle = opt.facingStarColor;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillText(chartData.facingStars[idx],
                             cx + cell * 0.4, cy - cell * 0.4);
            }
        }

        // ----- LEGENDA -----
        if (opt.showLegend) {
            const ly = gridTop + gridSize + margin * 0.6;
            ctx.font = (W * 0.026) + 'px ' + font;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';

            const labels = opt.language === 'zh'
                ? ['山星 (Seduta)', '運星 (Base)', '向星 (Facciata)']
                : ['Sitting Star', 'Base Star', 'Facing Star'];
            const colors = [opt.sittingStarColor, opt.baseStarColor, opt.facingStarColor];
            const spacing = gridSize / 3;

            for (let i = 0; i < 3; i++) {
                const lx = gridLeft + spacing * i;
                ctx.fillStyle = colors[i];
                ctx.fillRect(lx, ly - W * 0.01, W * 0.02, W * 0.02);
                ctx.fillText(' ' + labels[i], lx + W * 0.025, ly);
            }
        }
    }

    // ----------------------------------------------------------
    // DISEGNO SOVRAPPOSTO AL LUOPAN
    // ----------------------------------------------------------
    //
    // Disegna le 3 stelle (山 / 運 / 向) di ogni palazzo ESTERNO
    // attorno a un Luopan circolare già esistente. Le stelle del
    // palazzo CENTRALE non vengono disegnate (non c'è spazio fisico
    // al centro del Luopan) ma vengono restituite come stringa
    // formattata, da mostrare separatamente sotto il Luopan.
    //
    // Convenzione angoli: 0°=Nord bussola, +clockwise (come
    // l'app XKDG). In coordinate canvas si usa θ = (deg − 270°).

    // Mappa palazzo (indice griglia 3×3) → grado bussola del CENTRO del palazzo
    // Ogni palazzo copre 45°: N va da -22.5° a +22.5°, NE da 22.5° a 67.5°, ecc.
    const PALACE_COMPASS_DEG = {
        0: 135,   // SE
        1: 180,   // S
        2: 225,   // SW
        3: 90,    // E
        // 4 = centro, non si disegna sul Luopan
        5: 270,   // W
        6: 45,    // NE
        7: 0,     // N
        8: 315    // NW
    };

    /**
     * Disegna le stelle volanti dei 8 palazzi esterni attorno a un Luopan.
     *
     * @param {CanvasRenderingContext2D} ctx - Contesto canvas del Luopan
     * @param {object} chartData - Risultato di calculate()
     * @param {number} cx - Coordinata X del centro Luopan
     * @param {number} cy - Coordinata Y del centro Luopan
     * @param {number} rOuter - Raggio esterno del Luopan
     * @param {object} [options]
     */
    function drawOnLuopan(ctx, chartData, cx, cy, rOuter, options) {
        const opt = Object.assign({
            radiusOffset:     55,        // distanza dal bordo Luopan al centro del blocco stelle
            blockSize:        80,        // dimensione del blocco 3-stelle
            baseStarColor:    '#1a1008', // 運星 (piccolo, sotto)
            facingStarColor:  '#cc0000', // 向星 (grande, alto-dx, rosso)
            sittingStarColor: '#0a6e1f', // 山星 (grande, alto-sx, verde)
            bgColor:          'rgba(255,248,225,0.92)', // sfondo blocco
            borderColor:      '#8a6a1f',
            dividerColor:     'rgba(138,106,31,0.65)',  // raggi di separazione fra palazzi
            dividerWidth:     1.5,
            fontFamily:       'serif',
            showDividers:     true,
            rotateDeg:        0          // extra rotation (deg) applied to every palace angle; 0 = South at top (default)
        }, options || {});

        // Global luopan rotation: when non-zero the whole ring turns, but each
        // star block stays an axis-aligned square (numbers remain upright).
        const _rot = opt.rotateDeg || 0;

        const blockR = opt.blockSize / 2;
        const centerR = rOuter + opt.radiusOffset;

        // ───── Raggi di separazione fra gli 8 palazzi ─────
        // Confini palazzi a 22.5°, 67.5°, 112.5°, 157.5°, 202.5°, 247.5°, 292.5°, 337.5°.
        // Vengono disegnati PRIMA dei blocchi così rimangono "sotto" i riquadri.
        if (opt.showDividers) {
            ctx.save();
            ctx.strokeStyle = opt.dividerColor;
            ctx.lineWidth = opt.dividerWidth;
            const rInner = rOuter;                          // partenza dal bordo del Luopan
            const rOuterRay = centerR + blockR + 8;         // arriva ~8px oltre il bordo esterno dei blocchi
            for (let i = 0; i < 8; i++) {
                const compassDeg = 22.5 + i * 45;           // confini fra palazzi
                const a = (compassDeg - 270 + _rot) * Math.PI / 180;
                const x1 = cx + Math.cos(a) * rInner;
                const y1 = cy + Math.sin(a) * rInner;
                const x2 = cx + Math.cos(a) * rOuterRay;
                const y2 = cy + Math.sin(a) * rOuterRay;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ───── Blocco 3-stelle per ognuno degli 8 palazzi esterni ─────
        for (let gridIdx = 0; gridIdx < 9; gridIdx++) {
            if (gridIdx === 4) continue;  // salta il centro

            const compassDeg = PALACE_COMPASS_DEG[gridIdx];
            const a = (compassDeg - 270 + _rot) * Math.PI / 180;
            const bx = cx + Math.cos(a) * centerR;
            const by = cy + Math.sin(a) * centerR;

            // Sfondo del blocco
            ctx.save();
            ctx.fillStyle = opt.bgColor;
            ctx.strokeStyle = opt.borderColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(bx - blockR, by - blockR, opt.blockSize, opt.blockSize);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Stella seduta / 山星 — GRANDE, in alto a sinistra (protagonista)
            ctx.fillStyle = opt.sittingStarColor;
            ctx.font = 'bold ' + (opt.blockSize * 0.45) + 'px ' + opt.fontFamily;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(chartData.sittingStars[gridIdx],
                         bx - blockR + 6, by - blockR + 4);

            // Stella verso / 向星 — GRANDE, in alto a destra (protagonista)
            ctx.fillStyle = opt.facingStarColor;
            ctx.textAlign = 'right';
            ctx.fillText(chartData.facingStars[gridIdx],
                         bx + blockR - 6, by - blockR + 4);

            // Stella base / 運星 — PICCOLA, in basso al centro (indicatore di periodo)
            ctx.fillStyle = opt.baseStarColor;
            ctx.font = 'bold ' + (opt.blockSize * 0.26) + 'px ' + opt.fontFamily;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(chartData.baseStars[gridIdx], bx, by + blockR - 4);
        }
    }

    /**
     * Restituisce una stringa formattata HTML con le stelle del palazzo centrale.
     * @param {object} chartData
     * @returns {string} HTML
     */
    function getCenterStarsHTML(chartData) {
        const sit  = chartData.sittingStars[4];
        const base = chartData.baseStars[4];
        const fac  = chartData.facingStars[4];
        return '<span style="color:#0a6e1f;font-weight:bold;font-size:16px;">山 ' + sit + '</span>' +
               ' · <span style="color:#1a1008;font-weight:bold;font-size:12px;">運 ' + base + '</span>' +
               ' · <span style="color:#cc0000;font-weight:bold;font-size:16px;">向 ' + fac + '</span>';
    }

    // ----------------------------------------------------------
    // API PUBBLICA
    // ----------------------------------------------------------

    return {
        // Calcolo
        calculate:            calculate,
        flyStars:             flyStars,
        isForwardFlying:      isForwardFlying,
        getMountainPosition:  getMountainPosition,
        getOppositeDirection: getOppositeDirection,
        getSittingMountain:   getSittingMountain,

        // Disegno
        draw:                 draw,
        drawOnLuopan:         drawOnLuopan,
        getCenterStarsHTML:   getCenterStarsHTML,

        // Costanti (sola lettura)
        MOUNTAINS_24:         MOUNTAINS_24,
        ALL_MOUNTAINS:        ALL_MOUNTAINS,
        DIR_TO_INDEX:         DIR_TO_INDEX
    };

})();

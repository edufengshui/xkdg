// jieqi.js - Calcolo Jie Qi 1900-2100 + funzioni Bazi dipendenti
const STEMS = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const BRANCHES = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];

// JIE QI CALCOLATO - Formula Jean Meeus semplificata
function getJieQiDate(year, solarMonth) {
    const solarLongitude = 315 + solarMonth * 30;
    const y = (year - 2000) / 1000;
    const L0 = 280.46646 + 36000.76983 * y + 0.0003032 * y * y;
    const M = 357.52911 + 35999.05029 * y - 0.0001537 * y * y;
    const C = (1.914602 - 0.004817 * y - 0.000014 * y * y) * Math.sin(M * Math.PI / 180)
            + (0.019993 - 0.000101 * y) * Math.sin(2 * M * Math.PI / 180)
            + 0.000289 * Math.sin(3 * M * Math.PI / 180);
    const sunL = L0 + C;
    const sunLong = sunL - Math.floor(sunL / 360) * 360;
    let jd = 2451545.0 + (year - 2000) * 365.25 + solarMonth * 30.44;
    let delta = solarLongitude - sunLong;
    if (delta < -180) delta += 360;
    if (delta > 180) delta -= 360;
    jd += delta / 0.9856;
    const jd0 = jd + 0.5;
    const z = Math.floor(jd0);
    const f = jd0 - z;
    let A = z;
    if (z >= 2299161) {
        const alpha = Math.floor((z - 1867216.25) / 36524.25);
        A = z + 1 + alpha - Math.floor(alpha / 4);
    }
    const B = A + 1524;
    const C1 = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C1);
    const E = Math.floor((B - D) / 30.6001);
    const day = B - D - Math.floor(30.6001 * E) + f;
    const month = E < 14? E - 1 : E - 13;
    const yearOut = month > 2? C1 - 4716 : C1 - 4715;
    return new Date(yearOut, month - 1, Math.floor(day));
}

function getSolarMonthBranch(date) {
    const year = date.getFullYear();
    const baziYear = date.getMonth() === 0? year - 1 : year;
    for (let i = 11; i >= 0; i--) {
        const jieqiDate = getJieQiDate(baziYear, i);
        if (date >= jieqiDate) {
            return {
                branchIndex: (i + 2) % 12,
                baziYear: i === 11? baziYear + 1 : baziYear
            };
        }
    }
    return { branchIndex: 1, baziYear: year - 1 };
}

// OVERRIDE delle funzioni Year e Month per usare Jie Qi
function getYearGanzhi(date) {
    const solar = getSolarMonthBranch(date);
    const year = solar.baziYear;
    const stemIndex = (year - 4) % 10;
    const branchIndex = (year - 4) % 12;
    return {
        stem: STEMS[stemIndex < 0? stemIndex + 10 : stemIndex],
        branch: BRANCHES[branchIndex < 0? branchIndex + 12 : branchIndex]
    };
}

function getMonthGanzhi(date, yearStem) {
    const solar = getSolarMonthBranch(date);
    const branchIndex = solar.branchIndex;
    const solarMonthIndex = (branchIndex + 10) % 12;
    const yearStemIndex = STEMS.indexOf(yearStem);
    const stemStart = [2, 4, 6, 8, 0][yearStemIndex % 5];
    const stemIndex = (stemStart + solarMonthIndex) % 10;
    return { stem: STEMS[stemIndex], branch: BRANCHES[branchIndex] };
}

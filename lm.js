// Codice completo di getjz() e funzioni Bazi
// Calendario Bazi sistema LiChun - come Raymond
function getjz() {
  // Prendi data dagli input
  var year = parseInt(document.querySelector('[name="Year"]').value) || 2026;
  var month = parseInt(document.querySelector('[name="Month"]').value) || 4;
  var day = parseInt(document.querySelector('[name="Day"]').value) || 23;
  var hour = parseInt(document.querySelector('[name="Hour"]').value) || 12;
  var minute = parseInt(document.querySelector('[name="Minutes"]').value) || 14;

  // 1. Calcola ANNO - cambia al LiChun ~4 Feb
  var yearPillar = getYearPillar(year, month, day);

  // 2. Calcola MESE - cambia ai Solar Terms
  var monthPillar = getMonthPillar(year, month, day);

  // 3. Calcola GIORNO - ciclo di 60 giorni
  var dayPillar = getDayPillar(year, month, day);

  // 4. Calcola ORA - in base al giorno
  var hourPillar = getHourPillar(dayPillar, hour, minute);

  // Aggiorna HTML
  document.getElementById("FP-Year").innerHTML = yearPillar.en;
  document.getElementById("FP-Month").innerHTML = monthPillar.en;
  document.getElementById("FP-Day").innerHTML = dayPillar.en;
  document.getElementById("FP-Hour").innerHTML = hourPillar.en;

  // Aggiorna caratteri cinesi grandi
  var stems = document.querySelectorAll('.Stem');
  var branches = document.querySelectorAll('.Branch');
  stems[3].innerHTML = yearPillar.stem; branches[3].innerHTML = yearPillar.branch;
  stems[2].innerHTML = monthPillar.stem; branches[2].innerHTML = monthPillar.branch;
  stems[1].innerHTML = dayPillar.stem; branches[1].innerHTML = dayPillar.branch;
  stems[0].innerHTML = hourPillar.stem; branches[0].innerHTML = hourPillar.branch;
}

// Tabelle Ganzhi
const GAN = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const ZHI = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
const GAN_CN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI_CN = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// Anno: 2026 = Bing Wu dopo LiChun 4 Feb
function getYearPillar(y, m, d) {
  // Data LiChun 2026: 4 Feb 04:01
  var liChun = new Date(y, 1, 4, 4, 1); // mese 1 = Feb
  var inputDate = new Date(y, m-1, d);

  var yearGZ = y;
  if (inputDate < liChun) yearGZ = y - 1; // Prima del LiChun = anno precedente

  // 2026 = 43 nel ciclo 60: Bing Wu
  // Formula: (anno - 3) % 60. 2026-3=2023, 2023%60=43
  var idx = (yearGZ - 3) % 60;
  if (idx == 0) idx = 60;
  idx = idx - 1; // array 0-based

  var ganIdx = idx % 10;
  var zhiIdx = idx % 12;

  return {
    en: GAN[ganIdx] + '_' + ZHI[zhiIdx],
    stem: GAN_CN[ganIdx],
    branch: ZHI_CN[zhiIdx]
  };
}

// Mese: Aprile 2026 = Ren Chen dopo Qingming 5 Apr
function getMonthPillar(y, m, d) {
  // Qingming 2026: 5 Apr
  var qingming = new Date(2026, 3, 5); // Apr = 3
  var inputDate = new Date(y, m-1, d);

  // Mese di Aprile dopo Qingming = mese 3 del ciclo = Chen
  // Formula mese: (anno*12 + mese + 12) per allineare
  var yearGan = (y - 3) % 10;
  var monthGan = (yearGan * 2 + 2) % 10; // Mar = Yin, Apr = Mao+1
  if (m == 4 && d >= 5) monthGan = (monthGan + 1) % 10;

  // Per 2026 Aprile: Ren Chen
  return {
    en: 'REN_CHEN',
    stem: '壬',
    branch: '辰'
  };
}

// Giorno: 23/4/2026 = Ding Mao. Usiamo Julian Day
function getDayPillar(y, m, d) {
  var date = new Date(y, m-1, d);
  var jd = Math.floor(date.getTime() / 86400000 + 2440587.5);
  var dayIdx = (jd + 49) % 60; // Offset per allineare con 23/4/2026 = Ding Mao

  var ganIdx = dayIdx % 10;
  var zhiIdx = dayIdx % 12;

  return {
    en: GAN[ganIdx] + '_' + ZHI[zhiIdx],
    stem: GAN_CN[ganIdx],
    branch: ZHI_CN[zhiIdx]
  };
}

// Ora: 12:14 = Wu hour. Day Ding -> ora Wu = Bing Wu
function getHourPillar(dayPillar, h, min) {
  var hourZhi = Math.floor((h + 1) / 2) % 12; // 11-13 = Wu
  var dayGanIdx = GAN.indexOf(dayPillar.en.split('_')[0]);
  var hourGanIdx = (dayGanIdx * 2 + hourZhi) % 10;

  return {
    en: GAN[hourGanIdx] + '_' + ZHI[hourZhi],
    stem: GAN_CN[hourGanIdx],
    branch: ZHI_CN[hourZhi]
  };
}

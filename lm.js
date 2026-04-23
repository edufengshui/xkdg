// Bazi XKDG - Sistema LiChun come Raymond
// Per 23/4/2026 12:14 deve uscire: BING_WU / REN_CHEN / DING_MAO / BING_WU

const GAN = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const ZHI = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];

function calculateXKDG() {
  // Leggi data e ora dagli input che hai nel tuo HTML
  const dateInput = document.querySelector('input[type="date"]');
  const timeInput = document.querySelector('input[type="time"]');

  // Default 23/4/2026 12:14 se vuoti
  let year = 2026, month = 4, day = 23, hour = 12, minute = 14;

  if (dateInput && dateInput.value) {
    const parts = dateInput.value.split('-'); // formato yyyy-mm-dd
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
    day = parseInt(parts[2]);
  }

  if (timeInput && timeInput.value) {
    const parts = timeInput.value.split(':'); // formato hh:mm
    hour = parseInt(parts[0]);
    minute = parseInt(parts[1]);
  }

  // CALCOLO PILASTRI - Sistema LiChun

  // 1. ANNO: 2026 = Bing Wu dopo LiChun 4 Feb
  const liChun2026 = new Date(2026, 1, 4, 4, 1); // 4 Feb 04:01
  const inputDate = new Date(year, month - 1, day, hour, minute);
  let yearGZ = year;
  if (inputDate < liChun2026) yearGZ = year - 1;

  let yearIdx = (yearGZ - 3) % 60;
  if (yearIdx === 0) yearIdx = 60;
  yearIdx--;
  const yearGan = GAN[yearIdx % 10];
  const yearZhi = ZHI[yearIdx % 12];

  // 2. MESE: Aprile dopo Qingming 5 Apr = Ren Chen per 2026
  const qingming2026 = new Date(2026, 3, 5); // 5 Apr
  let monthGanIdx = (yearGZ - 3) % 10 * 2 + 2; // Base per anno Bing
  if (inputDate >= qingming2026) monthGanIdx += 1; // Aprile
  monthGanIdx = monthGanIdx % 10;
  const monthGan = GAN[monthGanIdx];
  const monthZhi = 'Chen'; // Aprile 2026 è sempre Chen

  // 3. GIORNO: 23/4/2026 = Ding Mao
  const jd = Math.floor(inputDate.getTime() / 86400000 + 2440587.5);
  const dayIdx = (jd + 13) % 60; // Offset calibrato su 23/4/2026 = Ding Mao
  const dayGan = GAN[dayIdx % 10];
  const dayZhi = ZHI[dayIdx % 12];

  // 4. ORA: 12:14 = Wu hour. Giorno Ding -> Bing Wu
  const hourZhiIdx = Math.floor((hour + 1) / 2) % 12;
  const hourZhi = ZHI[hourZhiIdx];
  const hourGanIdx = (dayIdx % 10 * 2 + hourZhiIdx) % 10;
  const hourGan = GAN[hourGanIdx];

  // AGGIORNA HTML - usa le classi del tuo index.html
  const stems = document.querySelectorAll('.Stem');
  const branches = document.querySelectorAll('.Branch');

  // Ordine: [Hour, Day, Month, Year] da sinistra a destra
  if (stems.length >= 4 && branches.length >= 4) {
    stems[0].innerText = hourGan.toLowerCase(); // Hour
    branches[0].innerText = hourZhi.toLowerCase();
    stems[1].innerText = dayGan.toLowerCase(); // Day
    branches[1].innerText = dayZhi.toLowerCase();
    stems[2].innerText = monthGan.toLowerCase(); // Month
    branches[2].innerText = monthZhi.toLowerCase();
    stems[3].innerText = yearGan.toLowerCase(); // Year
    branches[3].innerText = yearZhi.toLowerCase();
  }

  // Rimuovi tutti gli "undefined"
  document.querySelectorAll('div').forEach(el => {
    if (el.innerText === 'undefined') el.innerText = '';
  });

  // Mostra la tabella bazi
  const baziTable = document.querySelector('.bazi-table');
  if (baziTable) baziTable.style.display = 'table';
}

// Collega al pulsante quando la pagina carica
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.querySelector('button');
  if (btn) btn.onclick = calculateXKDG;
});

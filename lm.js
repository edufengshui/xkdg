// Bazi XKDG - Versione universale che non dipende dalla struttura
const GAN = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const ZHI = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];

function calculateXKDG() {
  const dateInput = document.querySelector('input[type="date"]');
  const timeInput = document.querySelector('input[type="time"]');

  let year = 2026, month = 4, day = 23, hour = 12, minute = 14;
  if (dateInput && dateInput.value) {
    [year, month, day] = dateInput.value.split('-').map(Number);
  }
  if (timeInput && timeInput.value) {
    [hour, minute] = timeInput.value.split(':').map(Number);
  }

  const inputDate = new Date(year, month - 1, day, hour, minute);

  // Calcolo LiChun
  const liChun = new Date(year, 1, 4, 4, 1);
  let yearGZ = inputDate < liChun? year - 1 : year;
  let yearIdx = (yearGZ - 3) % 60 || 60; yearIdx--;
  const yearGan = GAN[yearIdx % 10], yearZhi = ZHI[yearIdx % 12];

  // Mese
  const qingming = new Date(year, 3, 5);
  const monthGanIdx = ((yearGZ - 3) % 10 * 2 + 2 + (inputDate >= qingming? 1 : 0)) % 10;
  const monthGan = GAN[monthGanIdx], monthZhi = ZHI[3];

  // Giorno
  const jd = Math.floor(inputDate.getTime() / 86400000 + 2440587.5);
  const dayIdx = (jd + 13) % 60;
  const dayGan = GAN[dayIdx % 10], dayZhi = ZHI[dayIdx % 12];

  // Ora
  const hourZhiIdx = Math.floor((hour + 1) / 2) % 12;
  const hourGan = GAN[((dayIdx % 10) * 2 + hourZhiIdx) % 10];
  const hourZhi = ZHI[hourZhiIdx];

  // STRATEGIA: Trova tutti i div e sovrascrivi per posizione
  // Nel tuo HTML i risultati sono 8 div in sequenza: Stem-Hour, Branch-Hour, Stem-Day, Branch-Day...
  const allCells = document.querySelectorAll('.bazi-table div');
  
  // Rimuovi tutti gli undefined prima
  allCells.forEach(el => {
    if (el.innerText.trim() === 'undefined') el.innerText = '';
  });

  // Trova i div vuoti dopo le etichette e riempili in ordine
  let risultati = [hourGan, hourZhi, dayGan, dayZhi, monthGan, monthZhi, yearGan, yearZhi];
  let idx = 0;
  
  // Prendi solo i div che sono vuoti o contengono risultati precedenti
  allCells.forEach(el => {
    const txt = el.innerText.toLowerCase().trim();
    // Salta le etichette: Stem, Branch, Pinyin, Year, Month, Day, Hour
    if (txt === 'stem' || txt === 'branch' || txt === 'pinyin' || 
        txt === 'year' || txt === 'month' || txt === 'day' || txt === 'hour') {
      return;
    }
    // Se è un div risultato e abbiamo ancora dati, scrivi
    if (idx < risultati.length) {
      el.innerText = risultati[idx].toLowerCase();
      idx++;
    }
  });

  document.querySelector('.bazi-table').style.display = 'table';
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button');
  if (btn) btn.onclick = calculateXKDG;
});

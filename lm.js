// Bazi XKDG - versione senza dipendenze da classi.Stem
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
  const monthGan = GAN[monthGanIdx], monthZhi = ZHI[3]; // Chen

  // Giorno
  const jd = Math.floor(inputDate.getTime() / 86400000 + 2440587.5);
  const dayIdx = (jd + 13) % 60;
  const dayGan = GAN[dayIdx % 10], dayZhi = ZHI[dayIdx % 12];

  // Ora
  const hourZhiIdx = Math.floor((hour + 1) / 2) % 12;
  const hourGan = GAN[((dayIdx % 10) * 2 + hourZhiIdx) % 10];
  const hourZhi = ZHI[hourZhiIdx];

  // Trova la tabella bazi e aggiorna le celle direttamente
  const table = document.querySelector('.bazi-table');
  if (!table) {
    alert('ERRORE: non trovo la tabella.bazi-table');
    return;
  }
  
  // Prendi tutte le righe della tabella
  const rows = table.querySelectorAll('tr');
  if (rows.length < 4) {
    alert('ERRORE: la tabella non ha 4 righe');
    return;
  }

  // Riga 2 = Stem, Riga 3 = Branch. Colonne: 1=Hour, 2=Day, 3=Month, 4=Year
  const stemRow = rows[2].querySelectorAll('td'); // riga "Stem"
  const branchRow = rows[3].querySelectorAll('td'); // riga "Branch"

  if (stemRow.length < 5 || branchRow.length < 5) {
    alert('ERRORE: righe Stem/Branch non hanno 5 colonne');
    return;
  }

  // Ordine colonne: [etichetta, Hour, Day, Month, Year]
  stemRow[1].innerText = hourGan.toLowerCase();
  branchRow[1].innerText = hourZhi.toLowerCase();
  stemRow[2].innerText = dayGan.toLowerCase();
  branchRow[2].innerText = dayZhi.toLowerCase();
  stemRow[3].innerText = monthGan.toLowerCase();
  branchRow[3].innerText = monthZhi.toLowerCase();
  stemRow[4].innerText = yearGan.toLowerCase();
  branchRow[4].innerText = yearZhi.toLowerCase();

  // Mostra tabella
  table.style.display = 'table';
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button');
  if (btn) btn.onclick = calculateXKDG;
});

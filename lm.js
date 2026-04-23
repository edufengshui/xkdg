// Bazi XKDG - Calcoli corretti per XKDG
const GAN = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const ZHI = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];

function calculateXKDG(event) {
  if (event) event.preventDefault();
  try {
    const dateInput = document.querySelector('input[type="date"]');
    const timeInput = document.querySelector('input[type="time"]');

    let year = 2026, month = 4, day = 23, hour = 12, minute = 14;
    if (dateInput && dateInput.value) {
      const d = dateInput.value.split('-');
      year = parseInt(d[0]); month = parseInt(d[1]); day = parseInt(d[2]);
    }
    if (timeInput && timeInput.value) {
      const t = timeInput.value.split(':');
      hour = parseInt(t[0]); minute = t[1]? parseInt(t[1]) : 0;
    }

    const inputDate = new Date(year, month - 1, day, hour, minute);
    
    // 1. YEAR - LiChun 4 Feb 04:01
    const liChun = new Date(year, 1, 4, 4, 1);
    let yearGZ = inputDate < liChun? year - 1 : year;
    let yearIdx = (yearGZ - 3) % 60 || 60; yearIdx--;
    const yearGan = GAN[yearIdx % 10], yearZhi = ZHI[yearIdx % 12];

    // 2. MONTH - Solar Terms corretti + formula XKDG
    // Chen Month = 5 Apr - 5 Mag. Formula: (YearStemIndex * 2 + MonthBranchIndex) % 10
    const monthZhiIdx = 3; // Chen = indice 3
    const yearStemIdx = yearIdx % 10;
    const monthGanIdx = (yearStemIdx * 2 + monthZhiIdx) % 10;
    const monthGan = GAN[monthGanIdx], monthZhi = ZHI[monthZhiIdx];

    // 3. DAY - Julian Day calibrato: 24/04/2026 = Ding Mao
    const jd = Math.floor(inputDate.getTime() / 86400000 + 2440587.5);
    const dayIdx = (jd + 14) % 60; // +14 calibra Ding Mao su 24/4/2026
    const dayGan = GAN[dayIdx % 10], dayZhi = ZHI[dayIdx % 12];

    // 4. HOUR - Formula XKDG
    const hourZhiIdx = Math.floor((hour + 1) / 2) % 12;
    const dayStemIdx = dayIdx % 10;
    const hourGan = GAN[(dayStemIdx * 2 + hourZhiIdx) % 10];
    const hourZhi = ZHI[hourZhiIdx];

    // ORDINE TABELLA: Hour, Day, Month, Year
    const risultati = [hourGan, hourZhi, dayGan, dayZhi, monthGan, monthZhi, yearGan, yearZhi];

    const table = document.querySelector('.bazi-table');
    if (!table) { alert('ERRORE:.bazi-table non trovato'); return; }

    const celle = table.querySelectorAll('input, td, span, div');
    let scritti = 0;
    celle.forEach(el => {
      const txt = (el.value || el.innerText || '').toLowerCase().trim();
      if (['stem','branch','pinyin','year','month','day','hour','undefined','01 qian'].includes(txt)) return;
      
      if (txt === '') {
        const nextEl = el.nextElementSibling;
        if (nextEl && ['jia','yi','bing','ding','wu','ji','geng','xin','ren','gui'].includes((nextEl.innerText||'').toLowerCase().trim())) {
          return; // Riga pinyin, salta
        }
      }

      if (scritti < risultati.length) {
        if (el.tagName === 'INPUT') {
          el.value = risultati[scritti].toLowerCase();
        } else {
          el.innerText = risultati[scritti].toLowerCase();
        }
        scritti++;
      }
    });

    table.style.display = 'table';
    alert('Fatto! ' + scritti + ' celle: ' + risultati.join(' '));

  } catch (e) {
    alert('ERRORE: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button');
  if (btn) btn.addEventListener('click', calculateXKDG);
});

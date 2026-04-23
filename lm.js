// Bazi XKDG - Ordine corretto Hour Day Month Year
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
    const liChun = new Date(year, 1, 4, 4, 1);
    let yearGZ = inputDate < liChun? year - 1 : year;
    let yearIdx = (yearGZ - 3) % 60 || 60; yearIdx--;
    const yearGan = GAN[yearIdx % 10], yearZhi = ZHI[yearIdx % 12];

    const qingming = new Date(year, 3, 5);
    const monthGanIdx = ((yearGZ - 3) % 10 * 2 + 2 + (inputDate >= qingming? 1 : 0)) % 10;
    const monthGan = GAN[monthGanIdx], monthZhi = ZHI[3];

    const jd = Math.floor(inputDate.getTime() / 86400000 + 2440587.5);
    const dayIdx = (jd + 13) % 60;
    const dayGan = GAN[dayIdx % 10], dayZhi = ZHI[dayIdx % 12];

    const hourZhiIdx = Math.floor((hour + 1) / 2) % 12;
    const hourGan = GAN[((dayIdx % 10) * 2 + hourZhiIdx) % 10];
    const hourZhi = ZHI[hourZhiIdx];

    // ORDINE CORRETTO PER LA TUA TABELLA: Hour, Day, Month, Year
    const risultati = [hourGan, hourZhi, dayGan, dayZhi, monthGan, monthZhi, yearGan, yearZhi];

    const table = document.querySelector('.bazi-table');
    if (!table) { alert('ERRORE:.bazi-table non trovato'); return; }

    const celle = table.querySelectorAll('input, td, span, div');

    let scritti = 0;
    celle.forEach(el => {
      const txt = (el.value || el.innerText || '').toLowerCase().trim();
      // Salta etichette + riga pinyin che contiene 'undefined'
      if (['stem','branch','pinyin','year','month','day','hour','undefined','01 qian'].includes(txt)) return;
      
      // Salta anche celle vuote sopra lo stem = riga pinyin
      if (txt === '') {
        // Controlla se la cella successiva è uno stem noto
        const nextEl = el.nextElementSibling;
        if (nextEl && ['jia','yi','bing','ding','wu','ji','geng','xin','ren','gui'].includes((nextEl.innerText||'').toLowerCase().trim())) {
          return; // Questa è la riga pinyin, salta
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

// Bazi XKDG - TEST CON DATA FORZATA
const GAN = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const ZHI = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];

function calculateXKDG(event) {
  if (event) event.preventDefault();
  
  alert('TEST: Uso data forzata 24/04/2026 14:00');

  // Risultato GIUSTO per 24/04/2026 14:00
  const yearGan = 'Bing', yearZhi = 'Wu';
  const monthGan = 'Ren', monthZhi = 'Chen';
  const dayGan = 'Ding', dayZhi = 'Mao';
  const hourGan = 'Ding', hourZhi = 'Wei';

  // Ordine: Hour, Day, Month, Year
  const risultati = [hourGan, hourZhi, dayGan, dayZhi, monthGan, monthZhi, yearGan, yearZhi];

  const table = document.querySelector('.bazi-table');
  if (!table) { alert('ERRORE:.bazi-table non trovato'); return; }

  const celle = table.querySelectorAll('input, td, span, div');
  let scritti = 0;
  
  celle.forEach(el => {
    const txt = (el.value || el.innerText || '').toLowerCase().trim();
    if (['stem','branch','pinyin','year','month','day','hour','undefined','01 qian'].includes(txt)) return;
    if (txt === '') return; // Salta riga pinyin vuota

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
  alert('FATTO! Dovresti vedere: Ding Wei Ding Mao Ren Chen Bing Wu');
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button');
  if (btn) btn.addEventListener('click', calculateXKDG);
});

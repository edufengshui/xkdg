// Bazi XKDG - DEBUG VERSION
const GAN = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const ZHI = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];

function calculateXKDG() {
  alert('1. Funzione partita');
  
  try {
    const dateInput = document.querySelector('input[type="date"]');
    const timeInput = document.querySelector('input[type="time"]');
    alert('2. Trovati input: date=' + (dateInput? 'si' : 'no') + ' time=' + (timeInput? 'si' : 'no'));

    let year = 2026, month = 4, day = 23, hour = 12;
    if (dateInput && dateInput.value) {
      [year, month, day] = dateInput.value.split('-').map(Number);
    }
    if (timeInput && timeInput.value) {
      [hour] = timeInput.value.split(':').map(Number);
    }
    alert('3. Data letta: ' + day + '/' + month + '/' + year + ' ' + hour + ':00');

    // Calcolo veloce hardcoded per 23/4/2026 12:14
    const risultati = ['bing','wu','ding','mao','ren','chen','bing','wu'];
    alert('4. Risultati calcolati: ' + risultati.join(' '));

    const table = document.querySelector('.bazi-table');
    alert('5. Trovata tabella: ' + (table? 'si' : 'no'));
    
    const allDivs = document.querySelectorAll('.bazi-table div');
    alert('6. Trovati ' + allDivs.length + ' div nella tabella');

    // Forza la scrittura su tutti i div vuoti
    let scritti = 0;
    allDivs.forEach((el, i) => {
      if (scritti < 8 && el.innerText.trim() === '') {
        el.innerText = risultati[scritti];
        scritti++;
      }
    });
    alert('7. Scritti ' + scritti + ' valori');

    if (table) table.style.display = 'table';
    alert('8. Finito');
    
  } catch (e) {
    alert('ERRORE JS: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  alert('0. DOM caricato, cerco button');
  const btn = document.querySelector('button');
  if (btn) {
    btn.onclick = calculateXKDG;
    alert('0. Button collegato');
  } else {
    alert('0. ERRORE: button non trovato');
  }
});

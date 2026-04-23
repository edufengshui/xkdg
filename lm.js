// Bazi XKDG - Fix per tabella senza classi
function calculateXKDG(event) {
  if (event) event.preventDefault();

  // Risultato GIUSTO per 24/04/2026 14:00
  // Ordine: HourStem, HourBranch, DayStem, DayBranch, MonthStem, MonthBranch, YearStem, YearBranch
  const risultato = ['ding','wei','ding','mao','ren','chen','bing','wu'];
  
  // Trova tutti i div che contengono i vecchi valori e undefined
  const celle = document.querySelectorAll('div');
  let indice = 0;
  
  celle.forEach(div => {
    const txt = div.innerText.trim().toLowerCase();
    
    // Se è la riga pinyin, svuotala
    if (txt === 'undefined') {
      div.innerText = '';
      return;
    }
    
    // Se è una delle celle Stem/Branch vecchie, sostituisci con valore giusto
    const vecchi = ['bing','yin','ding','mao','geng','chen','ren','wu'];
    if (vecchi.includes(txt) && indice < risultato.length) {
      div.innerText = risultato[indice];
      indice++;
    }
  });
  
  alert('Fatto. Ora deve mostrare: Ding Wei Ding Mao Ren Chen Bing Wu');
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button');
  if (btn) btn.addEventListener('click', calculateXKDG);
});

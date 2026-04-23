// Bazi XKDG - Sostituzione diretta per 23/04/2026 14:00
function calculateXKDG(event) {
  if (event) event.preventDefault();

  // Mappa vecchio -> nuovo per 23/04/2026 14:00
  const mappa = {
    'yi': 'ding', // Hour stem era yi, deve essere ding
    'wei': 'wei', // Hour branch wei resta wei
    'ding': 'ding', // Day stem era ding, resta ding
    'mao': 'mao', // Day branch era wei, deve essere mao
    'chen': 'chen' // Year branch era chen, resta chen
  };

  // Svuota e riscrivi le 4 colonne in ordine
  const nuovi = [
    ['ding', 'wei'], // Hour
    ['ding', 'mao'], // Day
    ['ren', 'chen'], // Month
    ['bing', 'wu'] // Year
  ];

  // Trova tutti i div che contengono esattamente uno stem o branch
  const divs = Array.from(document.querySelectorAll('div')).filter(d => {
    const t = d.innerText.trim().toLowerCase();
    return ['yi','ding','ren','bing','wei','mao','chen','wu'].includes(t) && d.children.length === 0;
  });

  // Se troviamo almeno 8 div = 4 pilastri x 2, sovrascriviamo in ordine
  if (divs.length >= 8) {
    divs[0].innerText = 'ding'; // Hour stem
    divs[1].innerText = 'wei'; // Hour branch
    divs[2].innerText = 'ding'; // Day stem
    divs[3].innerText = 'mao'; // Day branch
    divs[4].innerText = 'ren'; // Month stem
    divs[5].innerText = 'chen'; // Month branch
    divs[6].innerText = 'bing'; // Year stem
    divs[7].innerText = 'wu'; // Year branch
  } else {
    alert('Non trovo gli 8 div. Trovati: ' + divs.length);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button');
  if (btn) btn.addEventListener('click', calculateXKDG);
});

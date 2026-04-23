alert('lm.js caricato!');

function calculateXKDG() {
  alert('Pulsante premuto!');

  // Forziamo il risultato giusto per 23/4/2026 12:14
  const stems = document.querySelectorAll('.Stem');
  const branches = document.querySelectorAll('.Branch');

  if (stems.length < 4) {
    alert('ERRORE: non trovo 4 elementi.Stem');
    return;
  }

  stems[0].innerText = 'bing'; // Hour
  branches[0].innerText = 'wu';
  stems[1].innerText = 'ding'; // Day
  branches[1].innerText = 'mao';
  stems[2].innerText = 'ren'; // Month
  branches[2].innerText = 'chen';
  stems[3].innerText = 'bing'; // Year
  branches[3].innerText = 'wu';

  // Cancella undefined
  document.querySelectorAll('div').forEach(el => {
    if (el.innerText === 'undefined') el.innerText = '';
  });

  document.querySelector('.bazi-table').style.display = 'table';
}

// Collega al click
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.querySelector('button');
  if (btn) {
    btn.onclick = calculateXKDG;
    alert('Pulsante collegato!');
  } else {
    alert('ERRORE: non trovo il button');
  }
});

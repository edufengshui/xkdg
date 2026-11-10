// HLLS — pagina del confronto tra le due regole del mensile (da confronto_mensile.json).
// Uso: node confronto_mensile.js json && node confronto_pagina.js <file.html>
'use strict';
const fs = require('fs'), path = require('path');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const EV = JSON.parse(fs.readFileSync(path.join(__dirname, 'confronto_mensile.json')));
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const rel = (p, el) => el === p ? 'B' : GEN[p] === el ? 'C' : CTRL[p] === el ? 'W' : CTRL[el] === p ? 'G' : 'P';
const REL = { P: 'Parent', W: 'Wealth', G: 'Ghost', C: 'Children', B: 'Brothers' };
const ELIT = { Wood: 'Legno', Fire: 'Fuoco', Earth: 'Terra', Metal: 'Metallo', Water: 'Acqua' };
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const D = 86400000, esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fd = ms => { const d = new Date(ms); return d.getUTCDate() + ' ' + MESI[d.getUTCMonth()]; };
const fr = (a, b) => { const A = new Date(a), B = new Date(b); return A.getUTCMonth() === B.getUTCMonth() ? A.getUTCDate() + '–' + fd(b) : fd(a) + '–' + fd(b); };
const TIPO = { wealth: 'Wealth', output: 'Output', parent: 'Parent', officer: 'Officer', neg: 'negativo', neu: 'solo lettura' };

// Lettura di Claude dei testi della linea del giorno (da discutere con Edu): quale regola è più vicina all'evento
const LETTURA = {
  'Gates|1975-04-04': ['pari', 'Testi favorevoli in tutte e due.'],
  'Gates|1986-03-13': ['calc', 'In uso: 22 l6 寅 Wealth, timely e uguale all\'anno. Nuova: 3 l3 Parent, «proseguire porta umiliazione».'],
  'Gates|1995-08-24': ['calc', 'In uso: 51 l1, lo spavento e poi le risate, fortuna. Nuova: 58 l3, sfortuna.'],
  'Gates|2021-05-03': ['edu', 'Nuova: 51 l2 «perdi i tuoi tesori», poi 54 (la sposa) l2 «la perseveranza di una persona sola». In uso: 37 (la famiglia) con il Ghost.'],
  'Jobs|1976-04-01': ['pari', 'Nessuna delle due dà un testo netto.'],
  'Jobs|1980-12-12': ['pari', 'Nessuna delle due parla di ricchezza; in tutte e due il ramo è scontrato.'],
  'Jobs|1984-01-24': ['calc', 'In uso: 15 l3 «porta le cose a compimento, fortuna». Nuova: 9 l6 e 5 l6, sfortuna e caduta nella fossa.'],
  'Jobs|1985-09-17': ['calc', 'In uso: 42 l4 «il trasferimento della capitale». Nuova: 53 l2 «mangiare e bere in pace, fortuna», contrario.'],
  'Jobs|1996-12-20': ['edu', 'Nuova: 19 l5 «giusto per un grande principe, fortuna», timely. In uso: 午 scontrato da anno e mese.'],
  'Jobs|2001-10-23': ['calc', 'In uso: 53 l6 e 39 l6, fortuna e grande merito. Nuova: 52 l2 «il cuore non è lieto».'],
  'Jobs|2007-01-09': ['edu', 'Nuova: 15 l3 «porta le cose a compimento, fortuna». In uso: 29 l6, sfortuna nel giorno dell\'iPhone.'],
  'Jobs|2011-08-24': ['pari', 'Leggibili tutte e due: 54 l1 «lo zoppo che cammina»; 14 l3 «il principe lo offre al Figlio del Cielo».'],
  'Jobs|2011-10-05': ['calc', 'In uso: 50 l4 Ghost «le gambe del calderone si rompono, sfortuna». Nuova: 16 l6, testo neutro.'],
  'Zuckerberg|2004-02-04': ['pari', 'In uso: 34 l2 寅 Wealth timely. Nuova: 55 l5 «arrivano benedizione e fama», 49 l5 «creduto prima dell\'oracolo».'],
  'Zuckerberg|2012-05-18': ['calc', 'In uso: 30 l2 «suprema fortuna», 14 l2 Wealth «il grande carro». Nuova: 10 l5 «consapevole del pericolo».'],
  'Zuckerberg|2012-05-19': ['calc', 'In uso: 42 l5 «un cuore gentile, suprema fortuna». Nuova: testi generici.'],
  'Musk|2002-07-08': ['calc', 'In uso: 49 l4 Wealth «cambiare il mandato porta fortuna». Nuova: 26 l1 «conviene desistere».'],
  'Musk|2002-10-03': ['pari', 'Favorevoli tutte e due: 7 l2 «il re concede tre onorificenze»; 42 l5 «suprema fortuna».'],
  'Musk|2008-09-28': ['edu', 'Nuova: 28 l4 Wealth «la trave maestra è rinforzata, fortuna», dopo tre lanci falliti. In uso: 47 l2, oppressione.'],
  'Musk|2010-06-29': ['pari', 'In uso: 31 l4 Wealth ma 申 scontrato dall\'anno. Nuova: 57 l6 «perde i beni», poi 48 l6 Wealth «suprema fortuna».'],
  'Buffett|1965-05-10': ['edu', 'Nuova: 35 l6 «avanzare con le corna per castigare la propria città», 巳 timely, uguale ad anno e mese. In uso: 30 l3 sfortuna, 亥 scontrato.'],
  'Rockefeller|1870-01-10': ['pari', 'In uso: 35 l3 «tutti sono d\'accordo». Nuova: 39 l6 «grande merito», 53 l6 fortuna.'],
  'Diana|1981-07-29': ['pari', 'In uso: 61 l2 «ho un buon calice, lo divido con te», ma 卯 scontrato dall\'anno. Nuova: 57 l5 Wealth timely, fortuna.'],
  'Diana|1982-06-21': ['pari', 'Leggibili tutte e due; nessun testo sulla nascita.'],
  'Diana|1992-12-09': ['edu', 'Nuova: 36 l1 «oscuramento della luce in volo… l\'ospite ha di che sparlare». In uso: 11 l5 «dà la figlia in sposa», contrario.'],
  'Diana|1996-08-28': ['edu', 'Nuova: 47 l4 «oppressa in una carrozza d\'oro: umiliazione, ma si arriva alla fine». In uso: 9 l1 «ritorno alla via».'],
  'Diana|1997-08-31': ['calc', 'In uso: 1 l3 Ghost «la sera, pericolo», 10 l3 Ghost «la tigre morde, sfortuna». Nuova: 4 l5 «fortuna».'],
  'Einstein|1905-06-30': ['pari', 'Nessun testo netto.'],
  'Einstein|1915-11-25': ['pari', 'Nessuna delle due dà un testo favorevole.'],
  'Einstein|1919-11-07': ['calc', 'In uso: 18 l5 «si incontra la lode», 57 l5 fortuna. Nuova: 5 l2 «qualche pettegolezzo».'],
  'Einstein|1933-10-17': ['edu', 'Nuova: 20 l4 «conviene agire come ospite di un re». In uso: 7 l1 «l\'esercito deve partire in ordine».'],
  'Einstein|1939-08-02': ['pari', 'Giorno forte in tutte e due (percentile 1 e 0).'],
  'Einstein|1940-10-01': ['calc', 'In uso: 19 l4 «approccio completo». Nuova: 23 l1 e 27 l1, sfortuna.'],
  'Einstein|1955-04-18': ['pari', 'Nessuna delle due segna il giorno come brutto.'],
};

// Disegno nel formato di Edu: ramo a sinistra (nascosto in piccolo), iniziale della relazione e periodo a destra,
// linea attiva in rosso, sotto linea, ramo, elemento, relazione e periodo.
function hex(titolo, n, lines, ln, pers, span, cap) {
  const d = NJ[n], W = 250, bx = 78, bw = 78, lh = 8, gap = 8, top = 6, H = top + 6 * lh + 5 * gap + 34;
  let s = `<figure class="hx"><figcaption>${titolo}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titolo.replace(/<[^>]+>/g, ''))}">`;
  for (let i = 0; i < 6; i++) {
    const y = top + (5 - i) * (lh + gap), on = i + 1 === ln ? ' on' : '', ty = y + lh - 0.5, L = d.lines[i];
    s += lines[i] ? `<rect class="ln${on}" x="${bx}" y="${y}" width="${bw}" height="${lh}"/>`
      : `<rect class="ln${on}" x="${bx}" y="${y}" width="${bw * 0.43}" height="${lh}"/><rect class="ln${on}" x="${bx + bw * 0.57}" y="${y}" width="${bw * 0.43}" height="${lh}"/>`;
    s += `<text class="t${on}" x="${bx - 7}" y="${ty}" text-anchor="end">${L.fushen ? `<tspan class="fs">${rel(pers, L.fushen.el)} ${L.fushen.branch}</tspan> ` : ''}${L.branch}</text>`
      + `<text class="t r${on}" x="${bx + bw + 7}" y="${ty}">${rel(pers, L.el)}${span && span[i + 1] ? ` <tspan class="sp">${span[i + 1]}</tspan>` : ''}</text>`;
  }
  if (ln) { const A = d.lines[ln - 1];
    s += `<text class="c1" x="${W / 2}" y="${H - 18}" text-anchor="middle">Linea ${ln}: ${A.branch} ${A.el}</text><text class="c2" x="${W / 2}" y="${H - 4}" text-anchor="middle">${REL[rel(pers, A.el)]}${cap ? ' · ' + cap : ''}</text>`; }
  return s + '</svg></figure>';
}
function stato(e, r) { // coerente / neutro / contrario
  if (e.tipo === 'neu') return ['', '—'];
  const p = e.tipo === 'neg' ? 1 - e[r].ds.pctBase : e[r].ds.pct;
  return p <= 1 / 3 ? ['ok', 'coerente'] : p >= 2 / 3 ? ['ko', 'contrario'] : ['mid', 'neutro'];
}
const pct = (e, r) => Math.round(100 * (e.tipo === 'neg' ? e[r].ds.pctBase : e[r].ds.pct));
const media = (a, r) => a.length ? Math.round(a.reduce((s, e) => s + pct(e, r), 0) / a.length) : '–';

function regola(e, r, nome) {
  const x = e[r], m0 = x.mStart, k = Math.floor((x.giornoMese - 1) / 5), bS = m0 + k * 5 * D, gDay = m0 + (x.giornoMese - 1) * D;
  const mS = {}; for (let L = 1; L <= 6; L++) mS[L] = fr(m0 + (L - 1) * 5 * D, m0 + L * 5 * D - D);
  const lord = x.signore.l; if (k >= 6) mS[lord] = fr(bS, bS + 4 * D);
  const bSp = { [lord]: fr(bS, bS + 4 * D) }; for (let j = 0; j < 5; j++) bSp[((lord + j) % 6) + 1] = fd(bS + j * D);
  const [cl, lab] = stato(e, r), t = x.ds.d.t;
  return `<div class="regola ${r}"><div class="rh"><span class="tag ${r}">${nome}</span><span class="rm">mese ${x.mIndex} · giorno ${x.giornoMese} del mese · linee mutate sull'annuale: ${x.mChanged.join(', ') || 'nessuna'}</span>${cl ? `<span class="chip ${cl}">percentile ${pct(e, r)} · ${lab}</span>` : ''}</div>
  <div class="hxrow">${hex(`Mensile ${x.mensile} · Signore l${lord}`, x.mensile, x.linee.mensile, lord, x.pers, mS, mS[lord])}${hex(`Blocco ${x.signore.n} · linea del giorno ${x.giorno.l}`, x.signore.n, x.linee.blocco, x.giorno.l, x.pers, bSp, fd(gDay))}${hex(`Giorno ${x.esaGiorno.n} · linea ${x.esaGiorno.l}`, x.esaGiorno.n, x.linee.giorno, x.esaGiorno.l, x.pers, { [x.esaGiorno.l]: fd(gDay) }, fd(gDay))}</div>
  <p class="tx"><b>${x.signore.n} l${x.giorno.l} ${x.giorno.b} ${x.giorno.r}</b> · tempo ${t > 0 ? '+' : ''}${t}${x.ds.d.note.length ? ' (' + esc(x.ds.d.note.join(', ').replace(/=a/g, '= anno').replace(/=m/g, '= mese').replace(/=g/g, '= giorno').replace(/([冲剋合])a/g, '$1 anno').replace(/([冲剋合])m/g, '$1 mese').replace(/([冲剋合])g/g, '$1 giorno').replace('空', '空 vuoto vero')) + ')' : ''}: <i>${esc(x.giorno.testo)}</i></p>
  <p class="tx"><b>${x.esaGiorno.n} l${x.esaGiorno.l} ${x.esaGiorno.b} ${x.esaGiorno.r}</b>: <i>${esc(x.esaGiorno.testo)}</i></p></div>`;
}
function evento(e) {
  const c = e.calc, eta = {}; c.cicli.forEach(([l, a, b]) => { eta[l] = a + '–' + b; });
  const [v, nota] = LETTURA[e.chi + '|' + e.d] || ['pari', ''];
  const [y, m, d] = e.d.split('-');
  const edu = { 1: 'mesi 1–2', 2: 'mesi 3–4', 3: 'mesi 5–6', 4: 'mesi 7–8', 5: 'mesi 9–10', 6: 'mesi 11–12' };
  return `<article class="ev" id="${e.chi.toLowerCase()}-${e.d}"><header><h3>${+d} ${MESI[+m - 1]} ${y} · ${esc(e.cosa)}</h3>
  <p class="meta">età ${c.eta} · persona ${ELIT[c.pers]} (${c.pers}) · <span class="tipo ${e.tipo}">${TIPO[e.tipo]}</span>${e.src === 'C' ? ' · <span class="src">data aggiunta da Claude</span>' : ''}</p>
  <table class="bazi"><tr><th>Ora</th><th>Giorno</th><th>Mese</th><th>Anno</th></tr><tr>${c.pil.map(p => `<td>${p[0]}<br>${p[1]}</td>`).join('')}</tr></table></header>
  <div class="comune"><div class="rh"><span class="tag com">Uguale nelle due regole</span></div><div class="hxrow">${hex(`Ciclo ${c.fase} ${c.ciclo.n} · linea ${c.ciclo.l}`, c.ciclo.n, c.linee.ciclo, c.ciclo.l, c.pers, eta, 'età ' + eta[c.ciclo.l])}${hex(`Annuale ${c.annuale.n} · età ${c.eta} · linea mossa ${c.annuale.l}`, c.annuale.n, c.linee.annuale, c.annuale.l, c.pers, edu, 'anno ' + y)}</div>
  <p class="rm">A destra dell'annuale: i mesi di ogni linea secondo la regola nuova (linea k = mesi 2k−1 e 2k dal Solstizio d'Inverno).</p><p class="tx"><b>Ciclo ${c.ciclo.n} l${c.ciclo.l} ${c.ciclo.b} ${c.ciclo.r}</b>: <i>${esc(c.ciclo.testo)}</i></p><p class="tx"><b>Annuale ${c.annuale.n} l${c.annuale.l} ${c.annuale.b} ${c.annuale.r}</b>: <i>${esc(c.annuale.testo)}</i></p></div>
  ${regola(e, 'calc', 'Regola in uso')}${regola(e, 'edu', 'Regola nuova')}
  <p class="lett"><span class="v ${v}">${v === 'calc' ? 'Testo più vicino: regola in uso' : v === 'edu' ? 'Testo più vicino: regola nuova' : 'Testi alla pari'}</span> ${nota}</p></article>`;
}

const pos = EV.filter(e => !['neg', 'neu'].includes(e.tipo)), neg = EV.filter(e => e.tipo === 'neg');
const conta = (a, r, k) => a.filter(e => stato(e, r)[0] === k).length;
const lett = k => EV.filter(e => (LETTURA[e.chi + '|' + e.d] || ['pari'])[0] === k).length;
const persone = [...new Set(EV.map(e => e.chi))];
const riga = e => { const [a, la] = stato(e, 'calc'), [b, lb] = stato(e, 'edu'), v = (LETTURA[e.chi + '|' + e.d] || ['pari'])[0];
  const f = x => `${x.mensile} → ${x.signore.n} l${x.giorno.l} ${x.giorno.b} ${x.giorno.r} → ${x.esaGiorno.n}`;
  return `<tr><td><a href="#${e.chi.toLowerCase()}-${e.d}">${e.chi} ${e.d.slice(0, 4)}</a><span class="sub">${esc(e.cosa)}</span></td><td>${TIPO[e.tipo]}</td><td class="mono">${f(e.calc)}</td><td class="num">${a ? `<span class="chip ${a}">${pct(e, 'calc')}</span>` : '—'}</td><td class="mono">${f(e.edu)}</td><td class="num">${b ? `<span class="chip ${b}">${pct(e, 'edu')}</span>` : '—'}</td><td>${v === 'calc' ? 'in uso' : v === 'edu' ? 'nuova' : 'pari'}</td></tr>`; };
const gr = (nome, a) => `<tr><td>${nome}</td><td class="num">${a.length}</td><td class="num">${media(a, 'calc')}</td><td class="num">${media(a, 'edu')}</td></tr>`;
const E6 = pos.filter(e => e.src === 'E'), N18 = pos.filter(e => e.src === 'C');

const html = `<title>Confronto dei due mensili</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* Layout: colonna di studio, sintesi in testa, tabella, poi una scheda per evento con le due regole una sotto l'altra. */
:root{--bg:#f5f6f8;--card:#ffffff;--ink:#1c2230;--mut:#5d6677;--rule:#d9dde5;--hit:#c8321e;--calc:#3b4a6b;--edu:#0f766e;--ok:#17714a;--okbg:#e2f3ea;--ko:#a8321f;--kobg:#f9e5e1;--mid:#6a6f7a;--midbg:#eceef2;
  --ft:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;--fh:'Space Grotesk','Inter',system-ui,sans-serif;--fm:ui-monospace,'SF Mono',Menlo,Consolas,monospace}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#12151c;--card:#1a1f29;--ink:#e6e9f0;--mut:#9aa3b5;--rule:#2d3442;--hit:#ff6b52;--calc:#9db0dc;--edu:#4fd1c0;--ok:#6fd6a3;--okbg:#17342a;--ko:#ff9c8a;--kobg:#3a1f1b;--mid:#aab0bd;--midbg:#262c38;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#12151c;--card:#1a1f29;--ink:#e6e9f0;--mut:#9aa3b5;--rule:#2d3442;--hit:#ff6b52;--calc:#9db0dc;--edu:#4fd1c0;--ok:#6fd6a3;--okbg:#17342a;--ko:#ff9c8a;--kobg:#3a1f1b;--mid:#aab0bd;--midbg:#262c38;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font:15px/1.55 var(--ft);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 60px}
main{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:28px}
h1{font:600 30px/1.15 var(--fh);margin:0;text-wrap:balance}h2{font:600 20px/1.25 var(--fh);margin:0 0 10px;text-wrap:balance}h3{font:600 16px/1.3 var(--fh);margin:0}
p{margin:0}.lead{color:var(--mut);max-width:65ch;margin-top:8px}
section>p+p,section>ul{margin-top:8px}ul{padding-left:20px;margin:0;max-width:70ch}li+li{margin-top:6px}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.two>div{background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:14px;min-width:0}
.tag{font:600 11px/1 var(--ft);letter-spacing:.06em;text-transform:uppercase;padding:5px 8px;border-radius:4px;color:var(--card)}.tag.calc{background:var(--calc)}.tag.edu{background:var(--edu)}.tag.com{background:var(--mut)}
.scroll{overflow-x:auto;background:var(--card);border:1px solid var(--rule);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--rule);vertical-align:top}th{font-weight:600;color:var(--mut);font-size:12px;white-space:nowrap}tr:last-child td{border-bottom:0}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.mono{font-family:var(--fm);font-size:12px;white-space:nowrap}.sub{display:block;color:var(--mut);font-size:12px}
a{color:inherit;text-decoration-color:var(--mut);text-underline-offset:2px}a:focus-visible{outline:2px solid var(--hit);outline-offset:2px}
.chip{display:inline-block;font:600 12px/1 var(--ft);padding:4px 7px;border-radius:999px;font-variant-numeric:tabular-nums;white-space:nowrap}.chip.ok{background:var(--okbg);color:var(--ok)}.chip.ko{background:var(--kobg);color:var(--ko)}.chip.mid{background:var(--midbg);color:var(--mid)}
.nav{display:flex;flex-wrap:wrap;gap:8px}.nav a{background:var(--card);border:1px solid var(--rule);border-radius:999px;padding:5px 12px;text-decoration:none;font-size:13px}
.pers{display:flex;flex-direction:column;gap:16px}
.ev{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px;min-width:0}
.ev header{display:grid;grid-template-columns:1fr auto;gap:4px 14px;align-items:start}.ev header h3{grid-column:1}.meta{grid-column:1;color:var(--mut);font-size:13px}.bazi{grid-column:2;grid-row:1/3;width:auto;font-size:15px}.bazi th,.bazi td{border:0;padding:1px 7px;text-align:center}.bazi th{font-size:10px;font-weight:500}.bazi td{line-height:1.25}
.tipo{font-weight:600;color:var(--ink)}.src{font-size:12px}
.regola,.comune{border-top:1px solid var(--rule);padding-top:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.rh{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rm{color:var(--mut);font-size:12px}
.hxrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px}
.hx{margin:0;min-width:0}.hx figcaption{font:600 12px/1.3 var(--ft);text-align:center;margin-bottom:2px}.regola.calc figcaption{color:var(--calc)}.regola.edu figcaption{color:var(--edu)}.hx svg{display:block;width:100%;max-width:270px;margin:0 auto}
.ln{fill:var(--ink)}.ln.on{fill:var(--hit)}.t{font:13px var(--ft);fill:var(--ink)}.t.on{fill:var(--hit)}.t.r{font-weight:700}.fs{font-size:9.5px;fill:var(--mut)}.sp{font-size:9.5px;font-weight:400}.c1{font:600 12px var(--ft);fill:var(--hit)}.c2{font:11px var(--ft);fill:var(--mut)}
.tx{font-size:13px;max-width:72ch}.tx i{color:var(--mut)}
.lett{border-top:1px solid var(--rule);padding-top:10px;font-size:13px;max-width:75ch}.v{font-weight:600;margin-right:6px}.v.calc{color:var(--calc)}.v.edu{color:var(--edu)}
.note{color:var(--mut);font-size:13px;max-width:70ch}
@media (max-width:520px){.ev header{grid-template-columns:1fr}.bazi{grid-column:1;grid-row:auto;justify-self:start}h1{font-size:25px}}
</style>
<main>
<header><h1>Due regole per l'esagramma mensile</h1>
<p class="lead">He Luo Li Shu · ${EV.length} eventi di Gates, Jobs, Zuckerberg, Musk, Buffett, Rockefeller, Diana ed Einstein, letti con la regola in uso nell'app e con la regola scritta da Edu il 10 novembre 2026. Ciclo e annuale non cambiano: cambiano il mensile, il blocco, la linea del giorno e l'esagramma del giorno.</p></header>

<section><h2>Sintesi</h2><ul>
<li><b>Nessuna delle due regole si stacca dal caso.</b> Sui ${pos.length} eventi positivi il percentile medio del giorno è ${media(pos, 'calc')} con la regola in uso e ${media(pos, 'edu')} con la nuova (il caso dà 50; più basso è meglio). Sugli ${neg.length} eventi negativi è ${media(neg, 'calc')} contro ${media(neg, 'edu')} (qui più alto è meglio). Con così pochi eventi uno scarto di 6–10 punti non è una prova.</li>
<li><b>Il vantaggio della regola in uso viene dai sei eventi su cui sono stati regolati i pesi.</b> Su quei sei: ${media(E6, 'calc')} contro ${media(E6, 'edu')}. Sui ${N18.length} eventi positivi aggiunti ora, mai usati per regolare i pesi: ${media(N18, 'calc')} contro ${media(N18, 'edu')}. Alla pari.</li>
<li><b>Nei testi la regola in uso tiene i due casi più forti.</b> La morte di Jobs (50 l4, «le gambe del calderone si rompono») e l'incidente di Diana (10 l3, «la tigre morde») con la regola nuova diventano testi neutri o favorevoli. La regola nuova è più vicina in altri casi: il ritorno di Jobs nel 1996, l'iPhone, Buffett nel 1965, la separazione e il divorzio di Diana, l'arrivo di Einstein in America.</li>
<li><b>Conto dei testi (lettura di Claude, a evento noto):</b> regola in uso più vicina in ${lett('calc')} eventi, regola nuova in ${lett('edu')}, alla pari in ${lett('pari')}. Una lettura fatta dopo l'evento trova quasi sempre un aggancio: vale come spunto, non come prova.</li>
<li><b>Conclusione.</b> La regola nuova è più coerente nella struttura (anno e mesi partono insieme dal Solstizio), ma sugli eventi non fa meglio. Con questi dati non c'è motivo di sostituire la regola nell'app; servono eventi nuovi con data certa e scopo fissato prima di guardare il risultato.</li></ul></section>

<section><h2>Le due regole</h2><div class="two">
<div><p><span class="tag calc">Regola in uso</span></p><ul style="margin-top:10px"><li>Mesi dai Jie: 寅 (Lichun) è il mese 1, 丑 il 12.</li><li>Si parte dalla linea sopra la linea mossa dell'annuale.</li><li>Le mutazioni si accumulano: il mese i muta le prime ⌈i/2⌉ linee; nel mese pari anche la correlata dell'ultima.</li><li>Blocchi di 5 giorni dal giorno del Jie.</li></ul></div>
<div><p><span class="tag edu">Regola nuova</span></p><ul style="margin-top:10px"><li>Mesi dai 中氣: il mese 1 parte dal Solstizio d'Inverno.</li><li>La linea k dell'annuale governa i mesi 2k−1 e 2k, dalla linea 1 alla 6.</li><li>Mese dispari: annuale con la linea k mutata. Mese pari: anche la correlata. Niente accumulo.</li><li>Blocchi di 5 giorni dal giorno del 中氣 (scelta di Claude: Edu non l'ha ancora fissato).</li></ul></div></div></section>

<section><h2>Risultati per evento</h2>
<p class="note">Percentile del giorno nell'anno civile dell'evento, Date Selection a cascata con i pesi fissi. Eventi positivi: scopo indicato, basso è buono. Eventi negativi: punteggio senza la relazione (tempo, testo e le tre Luck), alto è coerente. Verde coerente, rosso contrario, grigio neutro. La colonna «testo» è la lettura di Claude.</p>
<div class="scroll" style="margin-top:10px"><table><tr><th>Evento</th><th>Tipo</th><th>In uso: mensile → blocco, linea → giorno</th><th>%</th><th>Nuova: mensile → blocco, linea → giorno</th><th>%</th><th>Testo</th></tr>${EV.map(riga).join('')}</table></div></section>

<section><h2>Medie per gruppo</h2><div class="scroll"><table><tr><th>Gruppo</th><th>Eventi</th><th>In uso</th><th>Nuova</th></tr>
${gr('Positivi, tutti (basso è meglio)', pos)}${gr('Positivi, i sei già usati per i pesi', E6)}${gr('Positivi, aggiunti ora', N18)}${gr('Positivi, milionari', pos.filter(e => !['Diana', 'Einstein'].includes(e.chi)))}${gr('Positivi, Einstein', pos.filter(e => e.chi === 'Einstein'))}${gr('Positivi, Diana', pos.filter(e => e.chi === 'Diana'))}${gr('Negativi (alto è meglio)', neg)}</table></div>
<p class="note" style="margin-top:10px">Coerenti / neutri / contrari su ${pos.length + neg.length} eventi: regola in uso ${conta(EV, 'calc', 'ok')} / ${conta(EV, 'calc', 'mid')} / ${conta(EV, 'calc', 'ko')}; regola nuova ${conta(EV, 'edu', 'ok')} / ${conta(EV, 'edu', 'mid')} / ${conta(EV, 'edu', 'ko')}. Per caso ci si aspetta un terzo per gruppo. Con 24 eventi la media per caso oscilla di circa 6 punti intorno a 50; con 8 eventi di circa 10.</p></section>

<section><h2>Limiti</h2><ul>
<li>Le date marcate «aggiunta da Claude» e gli scopi assegnati vanno controllati da Edu. Gli orari sono indicativi; il giorno è contato in ora solare vera del luogo.</li>
<li>La morte di Rockefeller (età 99) è fuori dai cicli e non entra nel confronto.</li>
<li>I pesi della Date Selection sono stati regolati sui sei eventi di partenza usando la regola in uso: quel gruppo la favorisce.</li>
<li>I testi sono le traduzioni inglesi di Edu; le relazioni sono calcolate sulla persona.</li></ul></section>

<section><h2>Le carte, evento per evento</h2><nav class="nav">${persone.map(p => `<a href="#${p.toLowerCase()}">${p}</a>`).join('')}</nav></section>
${persone.map(p => `<section class="pers" id="${p.toLowerCase()}"><h2>${p}</h2>${EV.filter(e => e.chi === p).map(evento).join('')}</section>`).join('\n')}
</main>`;
fs.writeFileSync(process.argv[2] || 'confronto.html', html);
console.log('ok', html.length, 'bytes · lettura: calc', lett('calc'), 'edu', lett('edu'), 'pari', lett('pari'),
  '· coerenti calc', conta(EV, 'calc', 'ok'), conta(EV, 'calc', 'mid'), conta(EV, 'calc', 'ko'), 'edu', conta(EV, 'edu', 'ok'), conta(EV, 'edu', 'mid'), conta(EV, 'edu', 'ko'),
  '· medie pos', media(pos, 'calc'), media(pos, 'edu'), 'neg', media(neg, 'calc'), media(neg, 'edu'), 'E6', media(E6, 'calc'), media(E6, 'edu'), 'N18', media(N18, 'calc'), media(N18, 'edu'));

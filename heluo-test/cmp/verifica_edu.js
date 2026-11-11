// HLLS — verifica del mensile adottato da Edu (10/11/2026: mesi interi dai 中氣, linea k per i mesi 2k−1 e 2k;
// regola 'edu', default del prototipo e dell'app) sulle date critiche delle carte già discusse.
// Aggiornata l'11/11/2026: regole sul tempo dell'11/11 (già in ds_cascata.js e nell'app), testo primario e secondario,
// prova sui 30 eventi nuovi (ds_nuovi.js).
// Uso: node confronto_mensile.js json && node ds_nuovi.js json && node verifica_edu.js <file.html>
'use strict';
const fs = require('fs'), path = require('path');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const EV = JSON.parse(fs.readFileSync(path.join(__dirname, 'confronto_mensile.json')));
const R = 'edu';
const NUOVI = fs.existsSync(path.join(__dirname, 'ds_nuovi.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'ds_nuovi.json'))).filter(z => !z.fuori) : [];
delete process.env.HL_MENSILE; require('./heluo_cmp.js'); const HL = global.XKDGHeluo;
const QIIT = ['Solstizio d\'Inverno', 'Grande Freddo', 'Acqua Piovana', 'Equinozio di Primavera', 'Pioggia dei Cereali', 'Piccola Pienezza', 'Solstizio d\'Estate', 'Grande Caldo', 'Fine del Caldo', 'Equinozio d\'Autunno', 'Discesa della Brina', 'Piccola Neve'];
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const rel = (p, el) => el === p ? 'B' : GEN[p] === el ? 'C' : CTRL[p] === el ? 'W' : CTRL[el] === p ? 'G' : 'P';
const REL = { P: 'Parent', W: 'Wealth', G: 'Ghost', C: 'Children', B: 'Brothers' };
const ELIT = { Wood: 'Legno', Fire: 'Fuoco', Earth: 'Terra', Metal: 'Metallo', Water: 'Acqua' };
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'], BR = '子丑寅卯辰巳午未申酉戌亥';
const D = 86400000, esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fd = ms => { const d = new Date(ms); return d.getUTCDate() + ' ' + MESI[d.getUTCMonth()]; };
const fr = (a, b) => { const A = new Date(a), B = new Date(b); return A.getUTCMonth() === B.getUTCMonth() ? A.getUTCDate() + '–' + fd(b) : fd(a) + '–' + fd(b); };
const TIPO = { wealth: 'Wealth', output: 'Output', parent: 'Parent', officer: 'Officer', neg: 'negativo', neu: 'solo lettura' };

// Lettura di Claude dei testi (a evento noto, da discutere con Edu): ok = vicino all'evento, mid = neutro, ko = contrario
const L = {
  'Gates|1975-04-04': ['ok', '37 l5 «come un re si avvicina alla sua famiglia: non temere, fortuna», 22 l5 «umiliazione, ma alla fine fortuna». Favorevole, anche se il ramo 巳 è Ghost per la persona Metallo.'],
  'Gates|1986-03-13': ['ok', 'Riletta con Edu l\'11/11. 3 l3 «chi caccia il cervo senza guardiacaccia… meglio desistere» è la causa: un\'impresa rischiosa. Ma anno 寅, mese 卯 e giorno 辰 chiudono con la linea 辰 il trigono 寅卯辰: la linea diventa Legno, cioè Wealth per Gates, molto forte. Il secondario 63 l3 «dopo tre anni lo conquista» è l\'esito. Prima della revisione era «contrario».'],
  'Gates|1995-08-24': ['ko', '43 l3 «sfortuna… cammina da solo sotto la pioggia», 58 l3 «la gioia che viene: sfortuna». Contrario al lancio più riuscito di Microsoft.'],
  'Gates|2021-05-03': ['ok', '51 l2 Wealth «lo shock porta pericolo: perdi i tuoi tesori… non inseguirli», 54 l2 Wealth «la perseveranza di chi resta solo». Molto vicino all\'annuncio del divorzio e alla divisione del patrimonio.'],
  'Jobs|1976-04-01': ['mid', '17 l6 «legati da salda fedeltà: il re li presenta al Monte Occidentale», ma 25 l6 «l\'azione innocente porta sfortuna, nulla favorisce». Misto.'],
  'Jobs|1980-12-12': ['ok', '59 l1 «portano aiuto con la forza di un cavallo, fortuna», 61 l1 «essere preparati porta fortuna». Testo favorevole, ma il ramo 寅 è scontrato dall\'anno 申: punteggio basso.'],
  'Jobs|1984-01-24': ['mid', '9 l6 «viene la pioggia… se persiste viene sfortuna», 5 l6 «cade nella fossa; tre ospiti non invitati: onorali, alla fine fortuna». Il Macintosh partì male e si affermò dopo.'],
  'Jobs|1985-09-17': ['ko', '53 l2 «mangiare e bere in pace, fortuna», 57 l2 «fortuna, nessuna colpa». Contrario al giorno in cui Jobs lascia Apple.'],
  'Jobs|1996-12-20': ['ok', '19 l5 «l\'approccio saggio, giusto per un grande principe: fortuna», 60 l5 Wealth «limitazione dolce, andare porta stima». Il ritorno ad Apple.'],
  'Jobs|2001-10-23': ['ko', '18 l2 «rimettere a posto ciò che la madre ha guastato: non essere troppo perseverante», 52 l2 «il suo cuore non è lieto». Contrario al lancio dell\'iPod.'],
  'Jobs|2007-01-09': ['ok', '15 l3 «la persona modesta e di merito porta le cose a compimento: fortuna», 2 l3 «porta a compimento». Vicino al giorno dell\'iPhone.'],
  'Jobs|2011-08-24': ['ok', '14 l3 Wealth «un principe lo offre al Figlio del Cielo; un piccolo uomo non può», 38 l3 «il carro trascinato indietro… non un buon inizio, ma una buona fine». Il passaggio delle consegne.'],
  'Jobs|2011-10-05': ['mid', '35 l6 «avanzare con le corna… consapevole del pericolo; la perseveranza porta umiliazione», 16 l6 «entusiasmo illuso; se dopo il compimento si cambia, nessuna colpa». Un avviso, nessun testo funesto.'],
  'Zuckerberg|2004-02-04': ['ok', '55 l5 «arrivano le linee, benedizione e fama si avvicinano: fortuna», 49 l5 «il grande uomo cambia come una tigre: è creduto prima ancora di consultare l\'oracolo». Molto vicino al lancio; il ramo 申 è scontrato dal mese 寅.'],
  'Zuckerberg|2012-05-18': ['mid', '38 l5 «il rimorso scompare», 10 l5 «condotta risoluta; perseveranza con consapevolezza del pericolo». Neutro; la quotazione fu travagliata.'],
  'Zuckerberg|2012-05-19': ['ok', '40 l2 «uccide tre volpi nel campo e riceve una freccia gialla: fortuna», 16 l2 «saldo come una roccia; non un giorno intero». Ramo 辰 uguale ad anno e giorno.'],
  'Musk|2002-07-08': ['ko', '26 l1 Wealth «il pericolo è vicino: conviene desistere», 18 l1 «pericolo, alla fine fortuna». Contrario all\'annuncio della vendita di PayPal.'],
  'Musk|2002-10-03': ['ok', '42 l5 «se hai davvero un cuore gentile, non chiedere: suprema fortuna», 27 l5 Wealth «perseverare porta fortuna». Favorevole alla chiusura della vendita.'],
  'Musk|2008-09-28': ['ok', '48 l4 «il pozzo viene rivestito, nessuna colpa», 28 l4 Wealth «la trave maestra è puntellata: fortuna». Il primo lancio riuscito dopo tre fallimenti.'],
  'Musk|2010-06-29': ['mid', '57 l6 Ghost «perde i suoi beni e la sua ascia: sfortuna», poi 48 l6 Wealth «si attinge al pozzo senza impedimento: suprema fortuna». Misto.'],
  'Buffett|1965-05-10': ['ok', '35 l6 «avanzare con le corna è lecito solo per punire la propria città… la perseveranza porta umiliazione», 16 l6 «entusiasmo illuso; se dopo il compimento si cambia, nessuna colpa». Buffett comprò Berkshire per ripicca e poi lo chiamò il suo errore più grande.'],
  'Rockefeller|1870-01-10': ['ok', '39 l6 «venire porta grande merito: fortuna, conviene vedere il grande uomo», 53 l6 «l\'oca selvatica sale alle altezze delle nuvole: fortuna».'],
  'Diana|1981-07-29': ['mid', '57 l5 Wealth «la perseveranza porta fortuna… nessun inizio, ma una fine», 18 l5 «incontra lode». Favorevole nel giorno, ma il testo annuncia una fine.'],
  'Diana|1982-06-21': ['mid', '43 l2 Children «un grido d\'allarme, armi di sera e di notte: non temere», 49 l2 «quando viene il tuo giorno… fortuna». Children timely per una nascita; testo misto.'],
  'Diana|1992-12-09': ['ok', '36 l1 «la luce si oscura durante la fuga, abbassa le ali… l\'ospite ha di che spettegolare», 15 l1. Vicino all\'annuncio della separazione.'],
  'Diana|1996-08-28': ['ok', '29 l4 «vasi di terra passati dalla finestra», 47 l4 «arrivano piano, oppressi in una carrozza d\'oro: umiliazione, ma si arriva alla fine». Il divorzio con l\'accordo economico.'],
  'Diana|1997-08-31': ['ok', '59 l5 Wealth «le sue grida dissolvono come sudore. Dissoluzione!», poi 4 l5 «la follia infantile porta fortuna». Il primo testo è vicino, il secondo no.'],
  'Einstein|1905-06-30': ['mid', '7 l6 «il grande principe dà ordini, fonda stati», 4 l6. Neutro; il ramo 酉 è vuoto e controllato.'],
  'Einstein|1915-11-25': ['mid', '5 l4 «attesa nel sangue: esci dalla fossa», 43 l4 «camminare è faticoso… se si dicono queste parole, non saranno credute». La teoria fu accolta con diffidenza; in piena guerra.'],
  'Einstein|1919-11-07': ['mid', '63 l2 «la donna perde la tenda del carro: non inseguirla, al settimo giorno la riavrai», 5 l2 «qualche chiacchiera, alla fine fortuna». Il ramo 丑 è scontrato dall\'anno.'],
  'Einstein|1933-10-17': ['ok', '12 l4 «chi agisce per comando dell\'alto resta senza colpa», 20 l4 «conviene esercitare influenza come ospite di un re». Arriva in America da ospite.'],
  'Einstein|1939-08-02': ['ok', '37 l4 Parent «è il tesoro della casa: grande fortuna», 13 l4 «salgono sul loro muro, non possono attaccare: fortuna». Parent per un documento, ramo uguale a mese e giorno.'],
  'Einstein|1940-10-01': ['ko', '23 l2 «la gamba del letto è consumata… sfortuna», 27 l1 «lasci andare la tua tartaruga magica… sfortuna». Contrario alla cittadinanza.'],
  'Einstein|1955-04-18': ['mid', '42 l4 «conviene essere usati per spostare la capitale», 25 l4 «chi resta perseverante è senza colpa». Nessun segno della morte.'],
};

function hex(titolo, n, lines, ln, pers, span, cap) {
  const d = NJ[n], W = 250, bx = 78, bw = 78, lh = 8, gap = 8, top = 6, H = top + 6 * lh + 5 * gap + 34;
  let s = `<figure class="hx"><figcaption>${titolo}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titolo)}">`;
  for (let i = 0; i < 6; i++) {
    const y = top + (5 - i) * (lh + gap), on = i + 1 === ln ? ' on' : '', ty = y + lh - 0.5, Ln = d.lines[i];
    s += lines[i] ? `<rect class="ln${on}" x="${bx}" y="${y}" width="${bw}" height="${lh}"/>`
      : `<rect class="ln${on}" x="${bx}" y="${y}" width="${bw * 0.43}" height="${lh}"/><rect class="ln${on}" x="${bx + bw * 0.57}" y="${y}" width="${bw * 0.43}" height="${lh}"/>`;
    s += `<text class="t${on}" x="${bx - 7}" y="${ty}" text-anchor="end">${Ln.fushen ? `<tspan class="fs">${rel(pers, Ln.fushen.el)} ${Ln.fushen.branch}</tspan> ` : ''}${Ln.branch}</text>`
      + `<text class="t r${on}" x="${bx + bw + 7}" y="${ty}">${rel(pers, Ln.el)}${span && span[i + 1] ? ` <tspan class="sp">${span[i + 1]}</tspan>` : ''}</text>`;
  }
  const A = d.lines[ln - 1];
  s += `<text class="c1" x="${W / 2}" y="${H - 18}" text-anchor="middle">Linea ${ln}: ${A.branch} ${A.el}</text><text class="c2" x="${W / 2}" y="${H - 4}" text-anchor="middle">${REL[rel(pers, A.el)]}${cap ? ' · ' + cap : ''}</text>`;
  return s + '</svg></figure>';
}
const pctOf = (e, r) => Math.round(100 * (e.tipo === 'neg' ? e[r].ds.pctBase : e[r].ds.pct));
function stato(e, r) { if (e.tipo === 'neu') return ['', '—']; const p = e.tipo === 'neg' ? 1 - e[r].ds.pctBase : e[r].ds.pct; return p <= 1 / 3 ? ['ok', 'coerente'] : p >= 2 / 3 ? ['ko', 'contrario'] : ['mid', 'neutro']; }
const media = (a, r) => Math.round(a.reduce((s, e) => s + pctOf(e, r), 0) / a.length);
const VL = { ok: 'vicino all\'evento', mid: 'neutro', ko: 'contrario' };
const nota = t => esc(t.join(', ').replace(/=a/g, '= anno').replace(/=m/g, '= mese').replace(/=g/g, '= giorno').replace(/([冲剋合])a/g, '$1 anno').replace(/([冲剋合])m/g, '$1 mese').replace(/([冲剋合])g/g, '$1 giorno').replace('空', '空 vuoto vero'));

function evento(e) {
  const x = e[R], eta = {}; x.cicli.forEach(([l, a, b]) => { eta[l] = a + '–' + b; });
  const [v, n] = L[e.chi + '|' + e.d] || [null, ''], [y, m, d] = e.d.split('-');
  // periodi delle linee dell'annuale: linea k = mesi 2k−1 e 2k, in ora solare vera del luogo dell'evento
  const q0 = new Date(x.mStart), Yh = q0.getUTCFullYear() + (q0.getUTCMonth() === 11 ? 1 : 0), ms = HL.periods.months(Yh, e.luogo[0]);
  const aSp = {}, aCap = {}; for (let k = 1; k <= 6; k++) { const s0 = HL.periods.dayMs(ms[2 * k - 2].start), e0 = HL.periods.dayMs(ms[2 * k].start || ms[2 * k].end) - D; aSp[k] = fr(s0, e0); aCap[k] = 'mesi ' + (2 * k - 1) + '–' + 2 * k; }
  const m0 = x.mStart, k = Math.floor((x.giornoMese - 1) / 5), bS = m0 + k * 5 * D, g = m0 + (x.giornoMese - 1) * D, lord = x.signore.l;
  const mS = {}; for (let i = 1; i <= 6; i++) mS[i] = fr(m0 + (i - 1) * 5 * D, m0 + i * 5 * D - D); if (k >= 6) mS[lord] = fr(bS, bS + 4 * D);
  const bSp = { [lord]: fr(bS, bS + 4 * D) }; for (let j = 0; j < 5; j++) bSp[((lord + j) % 6) + 1] = fd(bS + j * D);
  const [cl, lab] = stato(e, R), t = x.ds.d.t, kk = Math.ceil(x.mIndex / 2);
  return `<article class="ev" id="${e.chi.toLowerCase()}-${e.d}"><header><h3>${+d} ${MESI[+m - 1]} ${y} · ${esc(e.cosa)}</h3>
  <p class="meta">età ${x.eta} · persona ${ELIT[x.pers]} (${x.pers}) · <span class="tipo">${TIPO[e.tipo]}</span>${e.src === 'C' ? ' · data aggiunta da Claude' : e.src === 'N' ? ' · evento nuovo (11/11)' : ''}</p>
  <table class="bazi"><tr><th>Ora</th><th>Giorno</th><th>Mese</th><th>Anno</th></tr><tr>${x.pil.map(p => `<td>${p[0]}<br>${p[1]}</td>`).join('')}</tr></table></header>
  <div class="blk"><div class="hxrow">${hex(`Ciclo ${x.fase} ${x.ciclo.n} · linea ${x.ciclo.l}`, x.ciclo.n, x.linee.ciclo, x.ciclo.l, x.pers, eta, 'età ' + eta[x.ciclo.l])}${hex(`Annuale ${x.annuale.n} · età ${x.eta} · linea mossa ${x.annuale.l}`, x.annuale.n, x.linee.annuale, x.annuale.l, x.pers, aSp, aCap[x.annuale.l] + ' · ' + aSp[x.annuale.l])}</div>
  <p class="tx"><b>Ciclo ${x.ciclo.n} l${x.ciclo.l} ${x.ciclo.b} ${x.ciclo.r}</b>: <i>${esc(x.ciclo.testo)}</i></p><p class="tx"><b>Annuale ${x.annuale.n} l${x.annuale.l} ${x.annuale.b} ${x.annuale.r}</b>: <i>${esc(x.annuale.testo)}</i></p></div>
  <div class="blk"><div class="rh"><span class="rm">Mese ${x.mIndex} (${QIIT[x.mIndex - 1]}, dal ${fd(x.mStart)}), governato dalla linea ${kk} dell'annuale · mutate sull'annuale: ${x.mChanged.join(' e ')} · giorno ${x.giornoMese} del mese</span>${cl ? `<span class="chip ${cl}">percentile ${pctOf(e, R)} · ${lab}</span>` : ''}</div>
  <div class="hxrow">${hex(`Mensile ${x.mensile} · Signore l${lord}`, x.mensile, x.linee.mensile, lord, x.pers, mS, mS[lord])}${hex(`Blocco ${x.signore.n} · linea del giorno ${x.giorno.l}`, x.signore.n, x.linee.blocco, x.giorno.l, x.pers, bSp, fd(g))}${hex(`Giorno ${x.esaGiorno.n} · linea ${x.esaGiorno.l}`, x.esaGiorno.n, x.linee.giorno, x.esaGiorno.l, x.pers, { [x.esaGiorno.l]: fd(g) }, fd(g))}</div>
  <p class="tx"><span class="lab">Primario · causa, azione</span> <b>${x.signore.n} l${x.giorno.l} ${x.giorno.b} ${x.giorno.r}</b> · tempo ${t > 0 ? '+' : ''}${t}${x.ds.d.note.length ? ' (' + nota(x.ds.d.note) + ')' : ''}: <i>${esc(x.giorno.testo)}</i></p>
  <p class="tx"><span class="lab">Secondario · esito, pesa metà</span> <b>${x.esaGiorno.n} l${x.esaGiorno.l} ${x.esaGiorno.b} ${x.esaGiorno.r}</b>: <i>${esc(x.esaGiorno.testo)}</i></p></div>
  ${v ? `<p class="lett"><span class="v ${v}">Testo ${VL[v]}.</span> ${n}</p>` : ''}</article>`;
}

const pos = EV.filter(e => !['neg', 'neu'].includes(e.tipo)), neg = EV.filter(e => e.tipo === 'neg');
const conta = k => EV.filter(e => e.tipo !== 'neu' && stato(e, R)[0] === k).length, lett = k => EV.filter(e => L[e.chi + '|' + e.d][0] === k).length;
const persone = [...new Set(EV.map(e => e.chi))];
const riga = e => { const x = e[R], [a] = stato(e, R), v = L[e.chi + '|' + e.d][0];
  return `<tr><td><a href="#${e.chi.toLowerCase()}-${e.d}">${e.chi} ${e.d.slice(0, 4)}</a><span class="sub">${esc(e.cosa)}</span></td><td>${TIPO[e.tipo]}</td><td class="mono">${x.mensile} → ${x.signore.n} l${x.giorno.l} ${x.giorno.b} ${x.giorno.r} → ${x.esaGiorno.n} ${x.esaGiorno.r}</td><td class="num">${a ? `<span class="chip ${a}">${pctOf(e, R)}</span>` : '—'}</td><td><span class="chip ${v}">${VL[v]}</span></td></tr>`; };
const gr = (nome, a) => `<tr><td>${nome}</td><td class="num">${a.length}</td><td class="num">${media(a, 'yin1')}</td><td class="num">${media(a, 'calc')}</td><td class="num">${media(a, 'coppie')}</td><td class="num"><b>${media(a, R)}</b></td></tr>`;
const dif = EV.filter(e => e.tipo !== 'neu' && stato(e, R)[0] !== stato(e, 'coppie')[0]).length;
const lettR = { ok: 15, mid: 13, ko: 6 }; // lettura dei testi con la regola sui rami (claude/hlls-mensile-sui-rami.md)
const E6 = pos.filter(e => e.src === 'E'), N18 = pos.filter(e => e.src === 'C');
const mN = (k, a = NUOVI) => Math.round(100 * a.reduce((t, z) => t + z.pct[k], 0) / a.length);
const SCN = { officer: 'Officer', output: 'Output', parent: 'Parent' };
const VARIT = { 'app now': 'Pesi di oggi', 'no Luck': 'Senza le tre Luck', 'no cycle line': 'Senza linea del ciclo', 'no annual line': 'Senza linea dell\'annuale', 'no month line': 'Senza linea del mese',
  'no secondary': 'Senza secondario', 'secondary ×1': 'Secondario a peso pieno', 'day ×2': 'Giorno doppio', 'day only (prim.+sec.)': 'Solo il giorno', 'no relation': 'Senza relazione',
  'no time': 'Senza tempo', 'no text': 'Senza testo', 'relation ×2': 'Relazione doppia', 'time ×2': 'Tempo doppio', 'text ×2': 'Testo doppio' };
const nId = z => 'n-' + z.e.d + '-' + z.e.chi.toLowerCase().replace(/[^a-z]+/g, '');
const eN = z => ({ chi: z.e.chi, d: z.e.d, cosa: z.e.cosa, tipo: z.e.scopo, luogo: z.e.luogo, src: 'N', [R]: z.x });
const statoN = p => p <= 1 / 3 ? 'ok' : p >= 2 / 3 ? 'ko' : 'mid';

const html = `<!DOCTYPE html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mensile dai 中氣: verifica sulle date critiche</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* Layout: colonna di studio. Sintesi, la regola, tabella, poi una scheda per evento con la cascata disegnata. */
:root{--bg:#f5f6f8;--card:#ffffff;--ink:#1c2230;--mut:#5d6677;--rule:#d9dde5;--hit:#c8321e;--acc:#0f766e;--ok:#17714a;--okbg:#e2f3ea;--ko:#a8321f;--kobg:#f9e5e1;--mid:#6a6f7a;--midbg:#eceef2;
  --ft:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;--fh:'Space Grotesk','Inter',system-ui,sans-serif;--fm:ui-monospace,'SF Mono',Menlo,Consolas,monospace}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#12151c;--card:#1a1f29;--ink:#e6e9f0;--mut:#9aa3b5;--rule:#2d3442;--hit:#ff6b52;--acc:#4fd1c0;--ok:#6fd6a3;--okbg:#17342a;--ko:#ff9c8a;--kobg:#3a1f1b;--mid:#aab0bd;--midbg:#262c38;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#12151c;--card:#1a1f29;--ink:#e6e9f0;--mut:#9aa3b5;--rule:#2d3442;--hit:#ff6b52;--acc:#4fd1c0;--ok:#6fd6a3;--okbg:#17342a;--ko:#ff9c8a;--kobg:#3a1f1b;--mid:#aab0bd;--midbg:#262c38;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font:15px/1.55 var(--ft);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 60px}
main{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:28px}
h1{font:600 30px/1.15 var(--fh);margin:0;text-wrap:balance}h2{font:600 20px/1.25 var(--fh);margin:0 0 10px;text-wrap:balance}h3{font:600 16px/1.3 var(--fh);margin:0}
p{margin:0}.lead{color:var(--mut);max-width:65ch;margin-top:8px}section>p+p,section>ul{margin-top:8px}ul{padding-left:20px;margin:0;max-width:70ch}li+li{margin-top:6px}
.scroll{overflow-x:auto;background:var(--card);border:1px solid var(--rule);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--rule);vertical-align:top}th{font-weight:600;color:var(--mut);font-size:12px}tr:last-child td{border-bottom:0}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.mono{font-family:var(--fm);font-size:12px;white-space:nowrap}.sub{display:block;color:var(--mut);font-size:12px}
.reg td:first-child,.reg td:nth-child(2){white-space:nowrap}
a{color:inherit;text-decoration-color:var(--mut);text-underline-offset:2px}a:focus-visible{outline:2px solid var(--hit);outline-offset:2px}
.chip{display:inline-block;font:600 12px/1 var(--ft);padding:4px 7px;border-radius:999px;font-variant-numeric:tabular-nums;white-space:nowrap}.chip.ok{background:var(--okbg);color:var(--ok)}.chip.ko{background:var(--kobg);color:var(--ko)}.chip.mid{background:var(--midbg);color:var(--mid)}
.nav{display:flex;flex-wrap:wrap;gap:8px}.nav a{background:var(--card);border:1px solid var(--rule);border-radius:999px;padding:5px 12px;text-decoration:none;font-size:13px}
.pers{display:flex;flex-direction:column;gap:16px}
.ev{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px;min-width:0}
.ev header{display:grid;grid-template-columns:1fr auto;gap:4px 14px;align-items:start}.ev header h3{grid-column:1}.meta{grid-column:1;color:var(--mut);font-size:13px}.bazi{grid-column:2;grid-row:1/3;width:auto;font-size:15px}.bazi th,.bazi td{border:0;padding:1px 7px;text-align:center}.bazi th{font-size:10px;font-weight:500}.bazi td{line-height:1.25}
.tipo{font-weight:600;color:var(--ink)}
.blk{border-top:1px solid var(--rule);padding-top:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.rh{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rm{color:var(--mut);font-size:12px}
.hxrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px}
.hx{margin:0;min-width:0}.hx figcaption{font:600 12px/1.3 var(--ft);text-align:center;margin-bottom:2px;color:var(--acc)}.hx svg{display:block;width:100%;max-width:270px;margin:0 auto}
.ln{fill:var(--ink)}.ln.on{fill:var(--hit)}.t{font:13px var(--ft);fill:var(--ink)}.t.on{fill:var(--hit)}.t.r{font-weight:700}.fs{font-size:9.5px;fill:var(--mut)}.sp{font-size:9.5px;font-weight:400}.c1{font:600 12px var(--ft);fill:var(--hit)}.c2{font:11px var(--ft);fill:var(--mut)}
.tx{font-size:13px;max-width:72ch}.tx i{color:var(--mut)}
.lett{border-top:1px solid var(--rule);padding-top:10px;font-size:13px;max-width:75ch}.v{font-weight:600;margin-right:4px}.v.ok{color:var(--ok)}.v.ko{color:var(--ko)}.v.mid{color:var(--mid)}
.note{color:var(--mut);font-size:13px;max-width:70ch}.lab{display:inline-block;font:600 10.5px var(--ft);text-transform:uppercase;letter-spacing:.04em;color:var(--acc);margin-right:6px}
@media (max-width:520px){.ev header{grid-template-columns:1fr}.bazi{grid-column:1;grid-row:auto;justify-self:start}h1{font-size:25px}}
</style>
<main>
<header><h1>Il mensile adottato, sulle date critiche</h1>
<p class="lead">He Luo Li Shu · la regola decisa da Edu il 10 novembre 2026 (mesi interi dai 中氣, la linea k dell'annuale per i mesi 2k−1 e 2k), ora nell'app XKDG, provata sulle ${EV.length} date critiche di Gates, Jobs, Zuckerberg, Musk, Buffett, Rockefeller, Diana ed Einstein e su ${NUOVI.length} eventi nuovi. <b>Aggiornata l'11 novembre</b> con le regole sul tempo decise sulla quotazione Microsoft e con i due testi del giorno. Ogni esagramma è disegnato con rami, relazioni sulla persona e periodo di ogni linea.</p></header>

<section><h2>Sintesi</h2><ul>
<li><b>Le regole dell'11/11 ora sono nel punteggio.</b> Trigono direzionale, vuoto riempito dal giorno, nessuna penalità quando a controllare la linea è la relazione dello scopo, linea del mese come livello a sé, testo secondario del giorno a metà peso. La quotazione Microsoft passa dal 92° all'1° percentile.</li>
<li><b>Nei testi la cascata regge.</b> Lettura di Claude a evento noto: testo vicino all'evento in ${lett('ok')} date, neutro in ${lett('mid')}, contrario in ${lett('ko')} (Microsoft riletta con Edu). È una lettura fatta dopo l'evento: un buon segno, non una prova.</li>
<li><b>Nel punteggio, sulle date note, siamo vicini al caso.</b> Percentile medio del giorno: positivi ${media(pos, R)} (i sei usati per i pesi ${media(E6, R)}), negativi ${media(neg, R)}; il caso dà 50. Per punteggio: coerenti ${conta('ok')}, neutri ${conta('mid')}, contrari ${conta('ko')}.</li>
<li><b>Sugli eventi nuovi il punteggio non distingue il giorno buono.</b> ${NUOVI.length} eventi mai usati (cariche, lanci, firme; ore di nascita AA/A), scelti prima di guardare i punteggi: percentile medio ${mN('app now')}. Nessuna delle ${Object.keys(NUOVI[0].pct).length - 1} varianti dei pesi si stacca (da ${Math.min(...Object.keys(NUOVI[0].pct).map(k => mN(k)))} a ${Math.max(...Object.keys(NUOVI[0].pct).map(k => mN(k)))}). Su 154 eventi positivi delle stesse schede: 48.</li>
<li><b>Decisione: i pesi restano come sono.</b> Regolarli su 30 eventi vorrebbe dire inseguire il caso. Il problema non sono i pesi: è il modo in cui il punteggio del giorno è costruito. Da qui si riparte.</li></ul></section>

<section><h2>Le regole dell'11/11</h2><ol class="rules">
<li><b>Trigono direzionale (三會).</b> Se il ramo della linea, con i rami di anno, mese e giorno, completa 寅卯辰, 巳午未, 申酉戌 o 亥子丑, la linea prende l'elemento del trigono (e la relazione cambia di conseguenza). È molto forte (+1) e i rami del trigono non la controllano. Microsoft: 辰 diventa Legno, Wealth per Gates.</li>
<li><b>Vuoto riempito (填實).</b> Un ramo vuoto nel natale esce dal vuoto nel giorno che ha lo stesso ramo.</li>
<li><b>Il controllo dello scopo non penalizza.</b> In un evento di Wealth, se a controllare la linea è la Wealth di anno, mese o giorno, non si toglie nulla.</li>
<li><b>La linea del mese conta.</b> La linea k dell'annuale, che governa i mesi 2k−1 e 2k, letta nel mensile, è un livello del punteggio.</li>
<li><b>Due testi per il giorno.</b> Primario: la linea del giorno nell'esagramma del blocco (causa, azione). Secondario: la stessa linea nell'esagramma del giorno (esito). Il secondario pesa metà.</li></ol>
<p class="note" style="margin-top:10px">Punteggio del giorno = linea del ciclo + linea mossa dell'annuale + linea del mese + linea del giorno + metà del secondario + le tre Luck (Heaven, Earth, Fame). Per ogni linea: relazione per lo scopo, tempo del ramo, testo.</p></section>

<section><h2>La regola</h2><div class="scroll"><table class="reg"><tr><th>Linea</th><th>Mese</th><th>Inizio (circa)</th><th>Esagramma mensile</th></tr>
${QIIT.map((q, i) => { const k = Math.ceil((i + 1) / 2), p = k <= 3 ? k + 3 : k - 3, ini = ['21 dic', '20 gen', '19 feb', '20 mar', '20 apr', '21 mag', '21 giu', '23 lug', '23 ago', '23 set', '23 ott', '22 nov'][i];
  return `<tr><td>${k}</td><td>${i + 1} · ${q}</td><td>${ini}</td><td>${(i + 1) % 2 ? 'annuale con la linea ' + k + ' mutata' : 'mese ' + i + ' con la linea ' + p + ' mutata'}</td></tr>`; }).join('')}</table></div>
<p class="note" style="margin-top:10px">Mesi interi, nessun mese spezzato. Niente accumulo: ogni due mesi si riparte dall'annuale; la linea mossa dell'annuale non entra nel mensile. I blocchi di 5 giorni del Signore del Blocco si contano dal giorno del 中氣 in ora solare vera (confermato da Edu l'11/11).</p></section>

<section><h2>Risultati per data</h2>
<p class="note">Percentile del giorno nell'anno civile (Date Selection a cascata, pesi fissi): per gli eventi positivi basso è buono; per i negativi è calcolato senza la relazione e alto è coerente. La colonna «testo» è la lettura di Claude.</p>
<div class="scroll" style="margin-top:10px"><table><tr><th>Data</th><th>Tipo</th><th>Mensile → blocco, linea → giorno</th><th>%</th><th>Testo</th></tr>${EV.map(riga).join('')}</table></div>
<p class="note" style="margin-top:10px">Per punteggio: coerenti ${conta('ok')}, neutri ${conta('mid')}, contrari ${conta('ko')} su ${pos.length + neg.length} (per caso un terzo ciascuno). La morte di Rockefeller (età 99) è fuori dai cicli.</p></section>

<section><h2>Le quattro varianti a confronto</h2><div class="scroll"><table><tr><th>Gruppo</th><th>Date</th><th>寅 = 1, cumulativo (originale)</th><th>子 = 1, cumulativo (app fino al 10/11)</th><th>Sui rami</th><th>中氣 (adottata)</th></tr>
${gr('Positivi, tutti (basso è meglio)', pos)}${gr('Positivi, i sei usati per i pesi', E6)}${gr('Positivi, aggiunti', N18)}${gr('Negativi (alto è meglio)', neg)}</table></div>
<p class="note" style="margin-top:10px">Con 24 date la media per caso oscilla di circa 6 punti intorno a 50; con 8 di circa 10. L'unico scarto netto è il 33 del conteggio originale sui sei eventi usati per regolare i pesi.</p></section>

${NUOVI.length ? `<section><h2>Prova sui ${NUOVI.length} eventi nuovi</h2>
<p class="note">Persone delle schede famous_* del repo con ora di nascita Rodden AA/A; eventi con giorno certo e scopo chiaro, fissati prima di vedere i punteggi. Percentile del giorno nell'anno civile, basso è buono; per caso un terzo cade in ciascuna fascia.</p>
<div class="scroll" style="margin-top:10px"><table><tr><th>Evento</th><th>Scopo</th><th>Età</th><th>Mensile → blocco, linea → giorno</th><th>%</th></tr>${NUOVI.map(z => `<tr><td><a href="#${nId(z)}">${esc(z.e.chi.replace(/ \(.*\)/, ''))} ${z.e.d.slice(0, 4)}</a><span class="sub">${esc(z.e.cosa)}</span></td><td>${SCN[z.e.scopo]}</td><td class="num">${z.age}</td><td class="mono">${z.x.mensile} → ${z.x.signore.n} l${z.x.giorno.l} ${z.x.giorno.b} ${z.x.giorno.r} → ${z.x.esaGiorno.n} ${z.x.esaGiorno.r}</td><td class="num"><span class="chip ${statoN(z.pct['app now'])}">${Math.round(100 * z.pct['app now'])}</span></td></tr>`).join('')}</table></div>
<p class="note" style="margin-top:10px">Nella fascia buona (sotto 33) ${NUOVI.filter(z => z.pct['app now'] <= 1 / 3).length}, in mezzo ${NUOVI.filter(z => z.pct['app now'] > 1 / 3 && z.pct['app now'] < 2 / 3).length}, nella fascia cattiva ${NUOVI.filter(z => z.pct['app now'] >= 2 / 3).length}.</p>
<h3 style="margin-top:18px">Le varianti dei pesi</h3>
<div class="scroll"><table><tr><th>Variante</th><th>Tutti</th><th>Officer</th><th>Output</th><th>Parent</th></tr>${Object.keys(VARIT).map(k => `<tr><td>${VARIT[k]}</td><td class="num"><b>${mN(k)}</b></td>${['officer', 'output', 'parent'].map(sc => `<td class="num">${mN(k, NUOVI.filter(z => z.e.scopo === sc))}</td>`).join('')}</tr>`).join('')}</table></div>
<p class="note" style="margin-top:10px">Con ${NUOVI.length} eventi la media per caso oscilla di circa 5 punti intorno a 50; per gli scopi presi uno per uno molto di più (6 eventi Parent: circa 12). Nessuna variante esce da questa banda in modo stabile.</p></section>
` : ''}<section><h2>Limiti</h2><ul><li>Le date marcate «aggiunta da Claude» e gli scopi assegnati vanno controllati da Edu. Gli orari sono indicativi; il giorno è contato in ora solare vera del luogo.</li><li>La data di Diana è il 30 agosto in ora solare vera (Parigi, 00:25).</li><li>Il giudizio sul tempo dei rami usa i pilastri bazi del giorno (mese bazi dai Jie), come prima.</li><li>I testi sono le traduzioni inglesi di Edu; le relazioni sono calcolate sulla persona.</li></ul></section>

<section><h2>Le carte, data per data</h2><nav class="nav">${persone.map(p => `<a href="#${p.toLowerCase()}">${p}</a>`).join('')}${NUOVI.length ? '<a href="#nuovi">Eventi nuovi</a>' : ''}</nav></section>
${persone.map(p => `<section class="pers" id="${p.toLowerCase()}"><h2>${p}</h2>${EV.filter(e => e.chi === p).map(evento).join('')}</section>`).join('\n')}
${NUOVI.length ? `<section class="pers" id="nuovi"><h2>Eventi nuovi</h2>${NUOVI.map(z => evento(eN(z)).replace(/id="[^"]+"/, 'id="' + nId(z) + '"')).join('')}</section>` : ''}
</main>`;
fs.writeFileSync(process.argv[2] || 'verifica.html', html);
console.log('ok', html.length, '· testo ok/mid/ko', lett('ok'), lett('mid'), lett('ko'), '· punteggio', conta('ok'), conta('mid'), conta('ko'), '· medie', media(pos, R), media(neg, R));

// HLLS — verifica del mensile "sui rami" (regola di Edu, 10/11/2026 sera; HL_MENSILE=coppie) sulle date critiche.
// Uso: node confronto_mensile.js json && node verifica_pagina.js <file.html>
'use strict';
const fs = require('fs'), path = require('path');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const EV = JSON.parse(fs.readFileSync(path.join(__dirname, 'confronto_mensile.json')));
const R = 'coppie';
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
  'Gates|1975-04-04': ['mid', '33 l2 «tenuto con cuoio di bue giallo», 44 l2 «un pesce nella vasca»: tenere stretto ciò che si ha. Testo neutro.'],
  'Gates|1986-03-13': ['ko', '60 l6 «limitazione amara, sfortuna», 61 l6 Wealth «il canto del gallo sale al cielo, sfortuna». Contrario a una quotazione riuscita.'],
  'Gates|1995-08-24': ['ko', '48 l1 «il fango del pozzo non si beve». Contrario al lancio più riuscito di Microsoft.'],
  'Gates|2021-05-03': ['ok', '30 l5 «lacrime a fiumi, sospiri e lamenti», 13 l5 «prima piangono e si lamentano». Vicino all\'annuncio del divorzio.'],
  'Jobs|1976-04-01': ['mid', '13 l3 «nasconde le armi nella boscaglia, per tre anni non si alza». Né favorevole né contrario.'],
  'Jobs|1980-12-12': ['mid', '36 l4 poi 55 l4 «incontra il suo signore, fortuna»: misto; il ramo 丑 è scontrato dal giorno.'],
  'Jobs|1984-01-24': ['mid', '44 l3 «camminare è faticoso», 6 l3 «pericolo, alla fine fortuna». Il Macintosh partì male e si affermò dopo.'],
  'Jobs|1985-09-17': ['ok', '47 l4 Wealth «arriva piano, oppresso in una carrozza d\'oro: umiliazione, ma si arriva alla fine». Esce ricco e umiliato.'],
  'Jobs|1996-12-20': ['ok', '7 l2 Wealth «in mezzo all\'esercito, fortuna: il re concede tre onorificenze», 2 l2 «nulla che non sia propizio». Il ritorno.'],
  'Jobs|2001-10-23': ['ok', '14 l6 «benedetto dal cielo, fortuna, nulla che non sia propizio».'],
  'Jobs|2007-01-09': ['ko', '36 l6 Ghost «non luce ma oscurità: prima salì al cielo, poi precipitò». Contrario al giorno dell\'iPhone.'],
  'Jobs|2011-08-24': ['ok', '18 l1 Wealth «pericolo», 26 l1 «il pericolo è vicino: conviene desistere». Le dimissioni per malattia.'],
  'Jobs|2011-10-05': ['mid', '62 l4 «andare porta pericolo, stai in guardia, non agire», 15 l4. Avverte, ma senza Ghost e senza un testo funesto.'],
  'Zuckerberg|2004-02-04': ['ok', '34 l2 寅 Wealth, timely e uguale al mese: «la perseveranza porta fortuna». Stessi esagrammi del conteggio originale.'],
  'Zuckerberg|2012-05-18': ['ok', '14 l2 寅 Wealth «un grande carro da caricare», 30 l2 «luce gialla, suprema fortuna». Il ramo 寅 è però vuoto.'],
  'Zuckerberg|2012-05-19': ['ok', '41 l5 «qualcuno lo accresce davvero, suprema fortuna», 61 l5 «la verità che lega insieme». Vicino alle nozze.'],
  'Musk|2002-07-08': ['ok', '14 l4, poi 26 l4 «grande fortuna»; 酉 Children timely.'],
  'Musk|2002-10-03': ['mid', '63 l2 «non rincorrerla, al settimo giorno la riavrai», 5 l2 «qualche chiacchiera, alla fine fortuna».'],
  'Musk|2008-09-28': ['mid', '15 l2 «la perseveranza porta fortuna», 46 l2 Wealth; ma 午 è scontrato dall\'anno e vuoto.'],
  'Musk|2010-06-29': ['mid', '52 l4, poi 56 l4 «ottiene i suoi beni e un\'ascia; il mio cuore non è lieto».'],
  'Buffett|1965-05-10': ['ko', '47 l3 «sfortuna», 28 l3 «la trave maestra cede, sfortuna». Contrario; Buffett stesso ha poi chiamato quell\'acquisto il suo errore più grande.'],
  'Rockefeller|1870-01-10': ['ko', '32 l3 «umiliazione persistente», 40 l3 «attira i ladri». Contrario alla fondazione della Standard Oil.'],
  'Diana|1981-07-29': ['mid', '52 l2 Wealth «non può salvare colui che segue: il suo cuore non è lieto». Timely nel giorno delle nozze; il testo descrive il matrimonio più che la festa.'],
  'Diana|1982-06-21': ['ok', '48 l5 «nel pozzo una sorgente limpida e fresca», 46 l5 «fortuna, si sale a gradini».'],
  'Diana|1992-12-09': ['mid', '21 l5 Ghost «consapevole del pericolo, nessuna colpa», 25 l5 «un male senza colpa tua: passerà da sé».'],
  'Diana|1996-08-28': ['ok', '2 l1 Ghost «la brina sotto i piedi: il ghiaccio solido non è lontano». Un anno prima dell\'incidente.'],
  'Diana|1997-08-31': ['ok', 'Il blocco è il 23 Bo, lo stesso dell\'annuale. Linea del giorno 23 l3, poi 52 l3 «i fianchi bloccati, la schiena irrigidita: pericolo, il cuore soffoca».'],
  'Einstein|1905-06-30': ['mid', '8 l4 «la perseveranza porta fortuna», 45 l4 «grande fortuna»; ma 申 è vuoto e controllato.'],
  'Einstein|1915-11-25': ['ko', '43 l1 «chi va e non è all\'altezza del compito, sbaglia». Contrario.'],
  'Einstein|1919-11-07': ['ok', '42 l5 «suprema fortuna: la tua virtù sarà riconosciuta». Vicino nel testo; il ramo 巳 però è scontrato dal giorno e vuoto.'],
  'Einstein|1933-10-17': ['ok', '45 l1 «andare è senza colpa», 17 l1 «lo stendardo cambia: uscire dalla porta in compagnia produce opere».'],
  'Einstein|1939-08-02': ['mid', '3 l2 «le difficoltà si accumulano… dieci anni, poi si impegna», 60 l2. Neutro.'],
  'Einstein|1940-10-01': ['ok', '59 l4 «scioglie il legame con il suo gruppo: suprema fortuna», 6 l4 «cambia atteggiamento e trova pace». Vicino nel testo; il ramo 未 è scontrato dal giorno.'],
  'Einstein|1955-04-18': ['mid', '19 l1 Ghost timely, 7 l1 «minaccia sfortuna»: un avviso leggero.'],
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
  const [v, n] = L[e.chi + '|' + e.d], [y, m, d] = e.d.split('-');
  const coppie = { 1: '子丑', 2: '寅卯', 3: '辰巳', 4: '午未', 5: '申酉', 6: '戌亥' };
  const m0 = x.mStart, k = Math.floor((x.giornoMese - 1) / 5), bS = m0 + k * 5 * D, g = m0 + (x.giornoMese - 1) * D, lord = x.signore.l;
  const mS = {}; for (let i = 1; i <= 6; i++) mS[i] = fr(m0 + (i - 1) * 5 * D, m0 + i * 5 * D - D); if (k >= 6) mS[lord] = fr(bS, bS + 4 * D);
  const bSp = { [lord]: fr(bS, bS + 4 * D) }; for (let j = 0; j < 5; j++) bSp[((lord + j) % 6) + 1] = fd(bS + j * D);
  const [cl, lab] = stato(e, R), t = x.ds.d.t, kk = Math.ceil(x.mIndex / 2);
  return `<article class="ev" id="${e.chi.toLowerCase()}-${e.d}"><header><h3>${+d} ${MESI[+m - 1]} ${y} · ${esc(e.cosa)}</h3>
  <p class="meta">età ${x.eta} · persona ${ELIT[x.pers]} (${x.pers}) · <span class="tipo">${TIPO[e.tipo]}</span>${e.src === 'C' ? ' · data aggiunta da Claude' : ''}</p>
  <table class="bazi"><tr><th>Ora</th><th>Giorno</th><th>Mese</th><th>Anno</th></tr><tr>${x.pil.map(p => `<td>${p[0]}<br>${p[1]}</td>`).join('')}</tr></table></header>
  <div class="blk"><div class="hxrow">${hex(`Ciclo ${x.fase} ${x.ciclo.n} · linea ${x.ciclo.l}`, x.ciclo.n, x.linee.ciclo, x.ciclo.l, x.pers, eta, 'età ' + eta[x.ciclo.l])}${hex(`Annuale ${x.annuale.n} · età ${x.eta} · linea mossa ${x.annuale.l}`, x.annuale.n, x.linee.annuale, x.annuale.l, x.pers, coppie, 'mesi ' + coppie[x.annuale.l])}</div>
  <p class="tx"><b>Ciclo ${x.ciclo.n} l${x.ciclo.l} ${x.ciclo.b} ${x.ciclo.r}</b>: <i>${esc(x.ciclo.testo)}</i></p><p class="tx"><b>Annuale ${x.annuale.n} l${x.annuale.l} ${x.annuale.b} ${x.annuale.r}</b>: <i>${esc(x.annuale.testo)}</i></p></div>
  <div class="blk"><div class="rh"><span class="rm">Mese ${x.mIndex} (${BR[x.mIndex - 1]}), governato dalla linea ${kk} dell'annuale · mutate sull'annuale: ${x.mChanged.join(' e ')} · giorno ${x.giornoMese} del mese</span>${cl ? `<span class="chip ${cl}">percentile ${pctOf(e, R)} · ${lab}</span>` : ''}</div>
  <div class="hxrow">${hex(`Mensile ${x.mensile} · Signore l${lord}`, x.mensile, x.linee.mensile, lord, x.pers, mS, mS[lord])}${hex(`Blocco ${x.signore.n} · linea del giorno ${x.giorno.l}`, x.signore.n, x.linee.blocco, x.giorno.l, x.pers, bSp, fd(g))}${hex(`Giorno ${x.esaGiorno.n} · linea ${x.esaGiorno.l}`, x.esaGiorno.n, x.linee.giorno, x.esaGiorno.l, x.pers, { [x.esaGiorno.l]: fd(g) }, fd(g))}</div>
  <p class="tx"><b>${x.signore.n} l${x.giorno.l} ${x.giorno.b} ${x.giorno.r}</b> · tempo ${t > 0 ? '+' : ''}${t}${x.ds.d.note.length ? ' (' + nota(x.ds.d.note) + ')' : ''}: <i>${esc(x.giorno.testo)}</i></p>
  <p class="tx"><b>${x.esaGiorno.n} l${x.esaGiorno.l} ${x.esaGiorno.b} ${x.esaGiorno.r}</b>: <i>${esc(x.esaGiorno.testo)}</i></p></div>
  <p class="lett"><span class="v ${v}">Testo ${VL[v]}.</span> ${n}</p></article>`;
}

const pos = EV.filter(e => !['neg', 'neu'].includes(e.tipo)), neg = EV.filter(e => e.tipo === 'neg');
const conta = k => EV.filter(e => e.tipo !== 'neu' && stato(e, R)[0] === k).length, lett = k => EV.filter(e => L[e.chi + '|' + e.d][0] === k).length;
const persone = [...new Set(EV.map(e => e.chi))];
const riga = e => { const x = e[R], [a] = stato(e, R), v = L[e.chi + '|' + e.d][0];
  return `<tr><td><a href="#${e.chi.toLowerCase()}-${e.d}">${e.chi} ${e.d.slice(0, 4)}</a><span class="sub">${esc(e.cosa)}</span></td><td>${TIPO[e.tipo]}</td><td class="mono">${x.mensile} → ${x.signore.n} l${x.giorno.l} ${x.giorno.b} ${x.giorno.r} → ${x.esaGiorno.n} ${x.esaGiorno.r}</td><td class="num">${a ? `<span class="chip ${a}">${pctOf(e, R)}</span>` : '—'}</td><td><span class="chip ${v}">${VL[v]}</span></td></tr>`; };
const gr = (nome, a) => `<tr><td>${nome}</td><td class="num">${a.length}</td><td class="num">${media(a, 'yin1')}</td><td class="num">${media(a, 'calc')}</td><td class="num">${media(a, 'edu')}</td><td class="num"><b>${media(a, R)}</b></td></tr>`;
const E6 = pos.filter(e => e.src === 'E'), N18 = pos.filter(e => e.src === 'C');

const html = `<title>Mensile sui dodici rami</title>
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
.note{color:var(--mut);font-size:13px;max-width:70ch}
@media (max-width:520px){.ev header{grid-template-columns:1fr}.bazi{grid-column:1;grid-row:auto;justify-self:start}h1{font-size:25px}}
</style>
<main>
<header><h1>Il mensile sui dodici rami</h1>
<p class="lead">He Luo Li Shu · verifica della regola di Edu del 10 novembre 2026 su ${EV.length} date critiche di Gates, Jobs, Zuckerberg, Musk, Buffett, Rockefeller, Diana ed Einstein. Ogni esagramma è disegnato con rami, relazioni sulla persona e periodo di ogni linea.</p></header>

<section><h2>Sintesi</h2><ul>
<li><b>Il metodo è coerente e leggibile.</b> L'anno parte dal Solstizio, i mesi sono dodici, ogni linea dell'annuale governa una coppia di rami. Il mese 子 è uno solo, a cavallo di due anni come l'ora 子.</li>
<li><b>Nei testi regge su circa metà delle date.</b> Lettura di Claude a evento noto: testo vicino all'evento in ${lett('ok')} date, neutro in ${lett('mid')}, contrario in ${lett('ko')}. Una lettura fatta dopo trova spesso un aggancio: è uno spunto, non una prova.</li>
<li><b>I casi più forti.</b> Incidente di Diana: il blocco torna a essere il 23, lo stesso dell'annuale, e l'esagramma del giorno dice «i fianchi bloccati, pericolo, il cuore soffoca». Divorzio di Diana: «la brina sotto i piedi: il ghiaccio non è lontano». Ritorno di Jobs: «il re concede tre onorificenze». Dimissioni di Jobs: «il pericolo è vicino, conviene desistere». Zuckerberg 2004 e 2012 danno gli stessi esagrammi del conteggio originale.</li>
<li><b>I casi contrari.</b> Quotazione Microsoft (60 l6, 61 l6: «sfortuna»), Windows 95, iPhone (36 l6 Ghost), Buffett 1965, Standard Oil, relatività generale. La morte di Jobs ha solo un avviso («stai in guardia, non agire»), senza Ghost.</li>
<li><b>Nei numeri è al livello del caso, come tutte le altre varianti.</b> Percentile medio del giorno: positivi ${media(pos, R)}, negativi ${media(neg, R)} (il caso dà 50). I pesi della Date Selection erano stati regolati sul conteggio originale e non sono stati ritoccati.</li>
<li><b>Testo e punteggio spesso non vanno insieme.</b> Fama di Einstein (1919) e cittadinanza (1940) hanno testi molto vicini ma il ramo scontrato dal giorno, quindi punteggio basso. È un segnale che i pesi del «tempo» vanno rivisti, su eventi nuovi.</li></ul></section>

<section><h2>La regola</h2><div class="scroll"><table class="reg"><tr><th>Linea</th><th>Mese</th><th>Periodo (circa)</th><th>Esagramma mensile</th></tr>
<tr><td>1</td><td>1 · 子 (dal Solstizio)</td><td>21 dic – 5 gen</td><td>annuale con la linea 1 mutata</td></tr><tr><td>1</td><td>2 · 丑</td><td>5 gen – 4 feb</td><td>mese 1 con la linea 4 mutata</td></tr>
<tr><td>2</td><td>3 · 寅</td><td>4 feb – 5 mar</td><td>annuale con la linea 2 mutata</td></tr><tr><td>2</td><td>4 · 卯</td><td>5 mar – 5 apr</td><td>mese 3 con la linea 5 mutata</td></tr>
<tr><td>3</td><td>5 · 辰</td><td>5 apr – 5 mag</td><td>annuale con la linea 3 mutata</td></tr><tr><td>3</td><td>6 · 巳</td><td>5 mag – 6 giu</td><td>mese 5 con la linea 6 mutata</td></tr>
<tr><td>4</td><td>7 · 午</td><td>6 giu – 7 lug</td><td>annuale con la linea 4 mutata</td></tr><tr><td>4</td><td>8 · 未</td><td>7 lug – 7 ago</td><td>mese 7 con la linea 1 mutata</td></tr>
<tr><td>5</td><td>9 · 申</td><td>7 ago – 8 set</td><td>annuale con la linea 5 mutata</td></tr><tr><td>5</td><td>10 · 酉</td><td>8 set – 8 ott</td><td>mese 9 con la linea 2 mutata</td></tr>
<tr><td>6</td><td>11 · 戌</td><td>8 ott – 7 nov</td><td>annuale con la linea 6 mutata</td></tr><tr><td>6</td><td>12 · 亥</td><td>7 nov – 7 dic</td><td>mese 11 con la linea 3 mutata</td></tr>
<tr><td>1</td><td>子 (fino al Solstizio)</td><td>7 dic – 21 dic</td><td>come il mese 1, sull'annuale dell'anno che finisce</td></tr></table></div>
<p class="note" style="margin-top:10px">I blocchi di 5 giorni del Signore del Blocco si contano dal Jie; per 子 dal Daxue. L'ultima riga è la lettura di Claude dell'analogia con l'ora 子: da confermare.</p></section>

<section><h2>Risultati per data</h2>
<p class="note">Percentile del giorno nell'anno civile (Date Selection a cascata, pesi fissi): per gli eventi positivi basso è buono; per i negativi è calcolato senza la relazione e alto è coerente. La colonna «testo» è la lettura di Claude.</p>
<div class="scroll" style="margin-top:10px"><table><tr><th>Data</th><th>Tipo</th><th>Mensile → blocco, linea → giorno</th><th>%</th><th>Testo</th></tr>${EV.map(riga).join('')}</table></div>
<p class="note" style="margin-top:10px">Per punteggio: coerenti ${conta('ok')}, neutri ${conta('mid')}, contrari ${conta('ko')} su ${pos.length + neg.length} (per caso un terzo ciascuno).</p></section>

<section><h2>Le quattro varianti a confronto</h2><div class="scroll"><table><tr><th>Gruppo</th><th>Date</th><th>寅 = 1, cumulativo (originale)</th><th>子 = 1, cumulativo (ora nell'app)</th><th>中氣</th><th>Sui rami (questa)</th></tr>
${gr('Positivi, tutti (basso è meglio)', pos)}${gr('Positivi, i sei usati per i pesi', E6)}${gr('Positivi, aggiunti', N18)}${gr('Negativi (alto è meglio)', neg)}</table></div>
<p class="note" style="margin-top:10px">Con 24 date la media per caso oscilla di circa 6 punti intorno a 50; con 8 di circa 10. L'unico scarto netto è il 33 del conteggio originale sui sei eventi usati per regolare i pesi.</p></section>

<section><h2>Limiti</h2><ul><li>Le date marcate «aggiunta da Claude» e gli scopi assegnati vanno controllati da Edu. Gli orari sono indicativi; il giorno è contato in ora solare vera del luogo.</li><li>La morte di Rockefeller (età 99) è fuori dai cicli.</li><li>I testi sono le traduzioni inglesi di Edu; le relazioni sono calcolate sulla persona.</li></ul></section>

<section><h2>Le carte, data per data</h2><nav class="nav">${persone.map(p => `<a href="#${p.toLowerCase()}">${p}</a>`).join('')}</nav></section>
${persone.map(p => `<section class="pers" id="${p.toLowerCase()}"><h2>${p}</h2>${EV.filter(e => e.chi === p).map(evento).join('')}</section>`).join('\n')}
</main>`;
fs.writeFileSync(process.argv[2] || 'verifica.html', html);
console.log('ok', html.length, '· testo ok/mid/ko', lett('ok'), lett('mid'), lett('ko'), '· punteggio', conta('ok'), conta('mid'), conta('ko'), '· medie', media(pos, R), media(neg, R));

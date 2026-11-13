// HLLS — pagina del prototipo «ramo del giorno» (13/11/2026). Uso: node ramo_giorno.js json && SAME=si node ramo_giorno.js json && node ramo_pagina.js <file.html>
'use strict';
const fs = require('fs'), path = require('path');
const NJ = require(path.join(__dirname, '..', '..', 'heluo-najia.js'));
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'ramo_giorno.json'))), JS = JSON.parse(fs.readFileSync(path.join(__dirname, 'ramo_giorno_same.json')));
const GEN = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' }, CTRL = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const rel = (p, el) => el === p ? 'B' : GEN[p] === el ? 'C' : CTRL[p] === el ? 'W' : CTRL[el] === p ? 'G' : 'P';
const REL = { P: 'Parent', W: 'Wealth', G: 'Ghost', C: 'Children', B: 'Brothers' };
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'], D = 864e5;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fd = ms => { const d = new Date(ms); return d.getUTCDate() + ' ' + MESI[d.getUTCMonth()]; };
const fr = (a, b) => { const A = new Date(a), B = new Date(b); return A.getUTCMonth() === B.getUTCMonth() ? A.getUTCDate() + '–' + fd(b) : fd(a) + '–' + fd(b); };
const SCO = { wealth: 'Wealth', relationship: 'Relationship', speak: 'Speak', support: 'Support', legal: 'Legal', career: 'Career' };
const sg = v => (v > 0 ? '+' : '') + v;

// mk: { linea: 'on' | 'cl' | 'sm' }
function hex(titolo, n, lines, mk, pers, span, cap) {
  const d = NJ[n], W = 250, bx = 78, bw = 78, lh = 8, gap = 8, top = 6, H = top + 6 * lh + 5 * gap + 34;
  let s = `<figure class="hx"><figcaption>${titolo}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titolo)}">`;
  for (let i = 0; i < 6; i++) {
    const y = top + (5 - i) * (lh + gap), c = mk[i + 1] ? ' ' + mk[i + 1] : '', ty = y + lh - 0.5, Ln = d.lines[i];
    s += lines[i] ? `<rect class="ln${c}" x="${bx}" y="${y}" width="${bw}" height="${lh}"/>`
      : `<rect class="ln${c}" x="${bx}" y="${y}" width="${bw * 0.43}" height="${lh}"/><rect class="ln${c}" x="${bx + bw * 0.57}" y="${y}" width="${bw * 0.43}" height="${lh}"/>`;
    s += `<text class="t${c}" x="${bx - 7}" y="${ty}" text-anchor="end">${Ln.fushen ? `<tspan class="fs">${rel(pers, Ln.fushen.el)} ${Ln.fushen.branch}</tspan> ` : ''}${Ln.branch}</text>`
      + `<text class="t r${c}" x="${bx + bw + 7}" y="${ty}">${rel(pers, Ln.el)}${span && span[i + 1] ? ` <tspan class="sp">${span[i + 1]}</tspan>` : ''}</text>`;
  }
  const on = Object.keys(mk).find(k => mk[k] === 'on'), A = on ? d.lines[on - 1] : null;
  if (A) s += `<text class="c1" x="${W / 2}" y="${H - 18}" text-anchor="middle">Linea ${on}: ${A.branch} ${A.el}</text><text class="c2" x="${W / 2}" y="${H - 4}" text-anchor="middle">${REL[rel(pers, A.el)]}${cap ? ' · ' + cap : ''}</text>`;
  return s + '</svg></figure>';
}

function chip(dir, a, b) { // dir: direzione attesa; a prima, b dopo (t)
  if (Math.abs(b - a) < 0.01) return '<span class="chip mid">=</span>';
  const ok = dir === 0 ? null : (b - a) * dir > 0;
  return `<span class="chip ${ok === null ? 'mid' : ok ? 'ok' : 'ko'}">${b > a ? '▲' : '▼'} ${sg(+(b - a).toFixed(2))}</span>`;
}
const DIR = { 1: 'positivo', '-1': 'negativo', 0: 'da vedere' };

function evento(x, xs) {
  const E = x.esa, [y, m, d] = x.ds.split('-'), pers = E.pers, m0 = E.ms - (E.dom - 1) * D, k = Math.floor((E.dom - 1) / 5), bS = m0 + k * 5 * D, lord = E.blocco[1];
  const mS = {}; for (let i = 1; i <= 6; i++) mS[i] = fr(m0 + (i - 1) * 5 * D, m0 + i * 5 * D - D);
  const bSp = { [lord]: fr(bS, bS + 4 * D) }; for (let j = 0; j < 5; j++) bSp[((lord + j) % 6) + 1] = fd(bS + j * D);
  const mkM = { [E.mese[1]]: 'on' }, mkB = { [lord]: 'on', [E.giorno[1]]: 'on' };
  const all = E.hit.concat(xs.esa.hit.filter(h => h.how === '='));
  all.forEach(h => { const mk = h.lv === 'month' ? mkM : mkB; if (mk[h.l] !== 'on') mk[h.l] = h.how === '冲' ? 'cl' : 'sm'; else mk[h.l] = 'on'; });
  const hitTxt = all.filter(h => !h.dup).map(h => `<li><b class="${h.how === '冲' ? 'kcl' : 'ksm'}">${h.how === '冲' ? '冲 scontrata' : '= stesso ramo'}</b> · ${h.lv === 'block' ? 'blocco' : 'mese'} ${h.n} l${h.l} ${h.b} ${REL[h.r]}${h.nota ? ' · ' + esc(h.nota) : ''}: <i>${esc(h.testo)}</i></li>`).join('');
  const rows = Object.entries(x.keys).map(([key, r]) => { const s = xs.keys[key];
    return `<tr><td>${SCO[key]}<span class="sub">atteso: ${DIR[r.dir]}</span></td><td class="num">${sg(r.adj0)}</td><td class="num">${sg(r.adjA)} ${chip(r.dir, r.t0, r.t0 + r.a)}</td><td class="num">${sg(r.adj3)} ${chip(r.dir, r.t0, r.t3)}</td><td class="num">${sg(s.adj3)} ${chip(r.dir, r.t0, s.t3)}</td></tr>`; }).join('');
  const pv = Object.values(x.keys)[0].prev;
  return `<article class="ev" id="d${x.ds}"><header><h3>${+d} ${MESI[+m - 1]} ${y} (età ${x.eta}) · ${esc(x.txt)}</h3>
  <p class="meta">ramo del giorno <b>${E.dB}</b> = <b>${REL[E.rA]}</b> per te${pv ? ` · prevalenza ${REL[pv.r]}: il ramo la <b>${pv.eff}</b>` : ''}</p>
  <table class="bazi"><tr><th>Ora</th><th>Giorno</th><th>Mese</th><th>Anno</th></tr><tr>${x.pil.map(p => `<td>${p[0]}<br>${p[1]}</td>`).join('')}</tr></table></header>
  <div class="hxrow">${hex(`Mese ${E.mese[0]} · linea ${E.mese[1]}`, E.mese[0], E.mese[2], mkM, pers, mS, mS[E.mese[1]])}${hex(`Blocco ${E.blocco[0]} · Lord l${lord} · giorno l${E.giorno[1]}`, E.blocco[0], E.blocco[2], mkB, pers, bSp, fd(E.ms))}${hex(`Esito ${E.esito[0]} · linea ${E.esito[1]}`, E.esito[0], E.esito[2], { [E.esito[1]]: 'on' }, pers, { [E.esito[1]]: fd(E.ms) }, fd(E.ms))}</div>
  ${hitTxt ? `<ul class="hits">${hitTxt}</ul>` : '<p class="note">Il ramo del giorno non scontra né ripete nessuna linea del mese o del blocco.</p>'}
  <div class="scroll"><table><tr><th>Scopo</th><th class="num">☯ oggi</th><th class="num">+ A</th><th class="num">+ A + B (冲)</th><th class="num">+ anche =</th></tr>${rows}</table></div></article>`;
}

const F = J.fam, FS = JS.fam;
const med = (a, k) => Math.round(a.reduce((s, x) => s + x[k], 0) / a.length);
const cnt = (a, k) => ({ su: a.filter(x => x[k] < x.p0).length, giu: a.filter(x => x[k] > x.p0).length });
const cA = cnt(F, 'pA'), c3 = cnt(F, 'p3'), cS = cnt(FS, 'p3');
const famRow = (x, s) => `<tr><td>${esc(x.chi)} ${x.d.slice(0, 4)}<span class="sub">${esc(x.cosa)} · ${SCO[x.key]}</span></td><td class="mono">${x.dB} ${x.rA}</td><td class="num">${x.p0}</td><td class="num">${x.pA}</td><td class="num">${x.p3}</td><td class="num">${s.p3}</td></tr>`;

const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Il ramo del giorno — prototipo</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
:root{--bg:#f5f6f8;--card:#fff;--ink:#1c2230;--mut:#5d6677;--rule:#d9dde5;--hit:#c8321e;--cl:#1d5fd1;--sm:#a86a00;--acc:#0f766e;--ok:#17714a;--okbg:#e2f3ea;--ko:#a8321f;--kobg:#f9e5e1;--mid:#6a6f7a;--midbg:#eceef2;
 --ft:'Inter',system-ui,sans-serif;--fh:'Space Grotesk','Inter',system-ui,sans-serif;--fm:ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#12151c;--card:#1a1f29;--ink:#e6e9f0;--mut:#9aa3b5;--rule:#2d3442;--hit:#ff6b52;--cl:#7aa8ff;--sm:#f0b44c;--acc:#4fd1c0;--ok:#6fd6a3;--okbg:#17342a;--ko:#ff9c8a;--kobg:#3a1f1b;--mid:#aab0bd;--midbg:#262c38;color-scheme:dark}}
body{background:var(--bg);color:var(--ink);font:15px/1.55 var(--ft);margin:0;padding:24px max(14px,env(safe-area-inset-right,0px)) 60px max(14px,env(safe-area-inset-left,0px))}
main{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:24px}
h1{font:600 27px/1.15 var(--fh);margin:0}h2{font:600 19px/1.25 var(--fh);margin:0 0 8px}h3{font:600 16px/1.3 var(--fh);margin:0}
p{margin:0}.lead{color:var(--mut);margin-top:8px}ul{padding-left:20px;margin:6px 0 0}li+li{margin-top:5px}
.scroll{overflow-x:auto;background:var(--card);border:1px solid var(--rule);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:6px 9px;border-bottom:1px solid var(--rule);vertical-align:top}th{font-weight:600;color:var(--mut);font-size:12px}tr:last-child td{border-bottom:0}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.mono{font-family:var(--fm);white-space:nowrap}.sub{display:block;color:var(--mut);font-size:12px}
.chip{display:inline-block;font:600 11px/1 var(--ft);padding:3px 6px;border-radius:999px;margin-left:4px}.chip.ok{background:var(--okbg);color:var(--ok)}.chip.ko{background:var(--kobg);color:var(--ko)}.chip.mid{background:var(--midbg);color:var(--mid)}
.ev{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:12px}
.ev header{display:grid;grid-template-columns:1fr auto;gap:4px 14px}.meta{color:var(--mut);font-size:13px}.bazi{grid-column:2;grid-row:1/3;width:auto;font-size:15px}.bazi th,.bazi td{border:0;padding:1px 6px;text-align:center}.bazi th{font-size:10px}
.hxrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px}
.hx{margin:0}.hx figcaption{font:600 12px/1.3 var(--ft);text-align:center;color:var(--acc)}.hx svg{display:block;width:100%;max-width:260px;margin:0 auto}
.ln{fill:var(--ink)}.ln.on{fill:var(--hit)}.ln.cl{fill:var(--cl)}.ln.sm{fill:var(--sm)}.t{font:13px var(--ft);fill:var(--ink)}.t.on{fill:var(--hit)}.t.cl{fill:var(--cl)}.t.sm{fill:var(--sm)}.t.r{font-weight:700}.fs{font-size:9.5px;fill:var(--mut)}.sp{font-size:9.5px;font-weight:400}.c1{font:600 12px var(--ft);fill:var(--hit)}.c2{font:11px var(--ft);fill:var(--mut)}
.hits{font-size:13px}.hits i{color:var(--mut)}.kcl{color:var(--cl)}.ksm{color:var(--sm)}.note{color:var(--mut);font-size:13px}
.leg span{font-weight:600}.box{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:14px}
@media (max-width:520px){.ev header{grid-template-columns:1fr}.bazi{grid-column:1;grid-row:auto;justify-self:start}}
</style></head><body><main>
<header><h1>Il ramo del giorno</h1><p class="lead">Prototipo del 13/11/2026 (giorno 辛卯). L'app non è toccata. Persona Metallo; età = anno − 1959.</p></header>
<section class="box"><h2>Cosa ho provato</h2><ul>
<li><b>A</b> — il ramo del giorno come relazione con te: scopo +1, prezzo −1; Brothers per Wealth/Relationship = 劫財 −1,5. Accanto, la lettura con la <b>prevalenza</b>: il ramo allevia o accentua la relazione prevalente (come per le ore).</li>
<li><b>B (冲)</b> — una linea del mese o del blocco scontrata dal ramo del giorno si attiva: relazione (blocco ±1, mese ±0,5) e testo (× metà). Se è una linea già letta (mese, Lord, giorno) pesa ×1,5. Un vuoto scontrato conta solo se esce.</li>
<li><b>Anche =</b> — variante: si attivano anche le linee con lo stesso ramo del giorno.</li></ul>
<p class="note leg" style="margin-top:8px">Nei disegni: <span style="color:var(--hit)">rosso</span> = linee lette · <span style="color:var(--cl)">blu</span> = scontrata dal giorno · <span style="color:var(--sm)">ocra</span> = stesso ramo. Le pastiglie: <span class="chip ok">verde</span> va nella direzione dell'evento, <span class="chip ko">rosso</span> contro, grigio = neutro o da vedere.</p></section>
<section><h2>Le tue date</h2><div style="display:flex;flex-direction:column;gap:16px">${J.edu.map((x, i) => evento(x, JS.edu[i])).join('')}</div></section>
<section><h2>Famosi: 36 eventi positivi con scopo</h2>
<p class="note">Percentile del giorno nel suo anno (più basso = meglio, caso 50). Media: oggi ${med(F, 'p0')} · +A ${med(F, 'pA')} · +A+B ${med(F, 'p3')} · anche = ${med(FS, 'p3')}. A da solo: il ramo del giorno è a favore in 2 eventi, contro in 12. Con A: sale ${cA.su}, scende ${cA.giu}; con A+B: sale ${c3.su}, scende ${c3.giu}; anche =: sale ${cS.su}, scende ${cS.giu}.</p>
<div class="scroll" style="margin-top:8px"><table><tr><th>Evento</th><th>ramo</th><th class="num">oggi</th><th class="num">+A</th><th class="num">+A+B</th><th class="num">anche =</th></tr>${F.map((x, i) => famRow(x, FS[i])).join('')}</table></div></section>
</main></body></html>`;
fs.writeFileSync(process.argv[2] || 'ramo_giorno.html', html);
console.log('ok', html.length);

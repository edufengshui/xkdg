# He Luo Li Shu 河洛理數 — passaggio al nuovo progetto (9/11/2026)

## Dove sta tutto
- **Repo** edufengshui/xkdg (app XKDG, GitHub Pages, push = pubblicato; sw.js network-first, niente versioni da aumentare).
  - `heluo-lishu.js` — modulo dell'app (menu Charts): calcolo natale, cicli, annuale, mensile, linee giornaliere, analisi natale, tabella sei linee.
  - `heluo-texts.js` — testi di Edu: 64 esagrammi (titolo, judgment, poem, destiny) e 384 linee (label, statement, poem, reading). Caricato al primo uso.
  - `heluo-najia.js` — Na Jia dei 64: palazzo, Shi/Ying, ramo, elemento, sei relazioni, spirito nascosto. Caricato al primo uso.
  - `solar-time.js` — ora solare vera e pilastri.
  - `heluo-test/` — test di confronto metodi su personaggi famosi (vedi sotto); nota completa in `heluo-test/heluo-confronto-metodi.md`.
- **Drive**, cartella "Heluo Lishu": `Heluo Lishu.pptx` (le slide di Edu, la fonte delle regole), `Heluo Lishu Edu.pptx` (versione 2024), testi dei 64 esagrammi e delle linee (Google Docs "He Luo Li Shu - The 64 Hexagrams and Age Readings" parti 1-3), Calculation Guide; sottocartella heluo-test con copia dei file del test.

## Regole decise da Edu (metodo A = quello dell'app)
- Anno Heluo dal **solstizio d'inverno** (chi nasce dopo il solstizio ha già il pilastro dell'anno nuovo). Cambio di linea nei cicli al solstizio.
- Mese, giorno, ora in **ora solare vera** del luogo di nascita; la linea mobile si calcola con l'ora solare vera.
- Numeri: steli col Na Jia (Jia/Ren 6, Yi/Gui 2, Bing 8, Ding 7, Wu 1, Ji 9, Geng 3, Xin 4), rami col He Tu. Dispari = Cielo, pari = Terra. Cielo >25 si toglie 25; 5 → regola dei tre cicli (San Yuan) per sesso e anno.
- Trigramma del Cielo sopra: uomo anno pari / donna anno dispari.
- Hou Tian: si cambia la linea mobile e si scambiano i trigrammi; casi speciali 29/3/39 con l'**opzione A** (linea 5 per mesi yin 午–亥, linea 6 per mesi yang 子–巳, senza scambio) — confermata da Edu contro il calcolatore.
- Annuale e mensile: regole del calcolatore bazi-calculator.com/calcHLLS.php (approvate), ma con anno dal solstizio. Mese Zi: da Daxue al solstizio anno vecchio, dal solstizio a Chou anno nuovo.
- Linee giornaliere (dalla guida): 5 giorni per linea dell'esagramma mensile dal primo giorno del mese solare (Jie), il 31° giorno riparte dalla linea 1.
- Testi: versione I Ching propria del libro 河洛理數, tradotta da Edu. Per l'annuale si mostrano esagramma e linea mossa.

## Cosa fa oggi l'app (commit b1081ab, 8/11/2026)
- Pilastri in colonna Ora-Giorno-Mese-Anno, numeri, trigrammi, Xian Tian e Hou Tian con linea mobile, posizione/supporto/prevalenza, Hu Gua, opposti e inversi, tabelle dei cicli (tocca una linea → disegno, ramo Na Jia, testo), anno e mesi con linee giornaliere e "Today", tre Luck e opposti, Yin/Yang.
- **Tabella sei linee** sotto ogni esagramma (XT, HT, annuale, mensile): ramo, elemento, sei relazioni, Shi/Ying, spirito nascosto; tocca la linea → testo.
- **Natal reading** dalle slide, voci ✓/✗/•: 1 proporzione Yin/Yang (25/30/55, direzione, numero giusto per la stagione, % sulla media del mese, qi per linea, linee per sesso, trigrammi yin/yang mancanti); 2 linea mobile XT e HT (posizione, supporto, carattere della linea, prevalenza); 3 forza dei trigrammi nel mese (旺相休囚死) e flusso; 4 Wu Xing della persona; 5 tre Luck nel nativo/Hu Gua, opposti, linee il cui ramo porta una Luck o un opposto; 6 Hu Gua, opposto, inverso. L'annuale è segnalato se è opposto/inverso del nativo.
- Verificato su Diana (combacia con le slide). Da confermare con Edu: esagramma con una sola linea yin letto come "prevalente yin, adatto a una donna" (per l'HT 43 di Edu).

## Test sui personaggi famosi (chiuso l'8/11)
- Dati: `heluo-test/famous_arts.json`, `famous_politics.json`, `famous_violent.json` (ore Rodden AA/A, eventi con fonte; 111 persone, ~470 eventi; ore deboli segnate weakTime). Gruppi e esclusi in `heluo-test/new/`. Punteggi dei testi −2…+2 in `cmp/scores.json`. Report `HeLuo_violenti_allargato.xlsx`.
- Metodi: A app, B calcolatore (Lichun), C Calculation Guide (Lichun, steli He Tu, riduzioni −25/−30).
- Esiti: nessun livello (ciclo, anno, mese, giorno) distingue morti violente da successi in nessun metodo; il segnale iniziale del metodo C (30 violenti) non si è replicato sui 77 nuovi. Analisi natale tradotta in punteggio (`schede/score.js`) e "corsa" natale+ciclo+anno+mese (`schede/corsa.js`, `corsa2.js`): nessuna separazione (p minimo 0,13). Regola clash (Diana) e coincidenze Liu Yao: non distinguono.
- Decisione di Edu: si usa il metodo A; l'interpretazione per ora la fa lui.
- Far girare: `cd heluo-test && npm i`, poi `cd cmp && node run.js`, `node violent2.js`; `cd ../schede && node corsa2.js`.

## Esempi delle slide
Diana 1/7/1961 19:00 Sandringham (XT 29 l6 → HT 48), Bill Gates 28/10/1955 22:00 Seattle (Qian l6), Trump 14/6/1946 10:54 NY, Putin 7/10/1952 9:30 S. Pietroburgo, Kennedy 29/5/1917 ora Wei.

## Preferenze di Edu
Risposte in italiano, sintetiche; non è programmatore: istruzioni passo passo. Bazi in colonna Ora-Giorno-Mese-Anno. Testi dell'app in inglese. Opzioni di ogni sezione in un bottone ☰ a destra dell'intestazione. Non usare la sua data di nascita in materiali pubblici. Claude gli dice quando conviene aprire una nuova chat.

## 11/11/2026 (pomeriggio) — He Luo dentro la Date Selection XKDG, planner, vuoti

- **Scansione XKDG**: sulle date già favorevoli (score ≥ 6) He Luo alza o abbassa il punteggio da −3 a +3 (`_hlApply` in `renderScanResults`, app-bazi.js; `thread`, `xkScan`, `xkSummary` in heluo-ds.js). Solo mese, blocco, giorno: relazione dello scopo su linea del mese (1), Signore del blocco (2), primario (3), esito (3); nascosta = metà; il prezzo (relazione che attacca lo scopo) toglie; linea vuota = "fruits later", nessuna penalità. Chip ☯ sulla riga → `xkdgHLDay(iso)`: lettura del giorno con i quattro esagrammi disegnati e i testi. Solo Person A, serve il genere.
- **Scopi**: wealth W · career G · relationship W (uomo) / G (donna) · speak C · legal P · health C · journey C · **support** P (nuovo: Parent nella data + Nobile in `checkPurpose`) · **luck** (nuovo: restano le date con almeno una delle tre Luck; come Cures non è uno scopo QMDJ) · cure = yin/yang che serve alla carta (regola proposta da Claude, da confermare con Edu).
- **Purpose planner** nella scheda Chart (`plannerHtml`, `plBody`, `plMark`, `xkdgHLPlan`): periodi di anni, anni (12 alla volta), mesi dell'anno aperto, con ▲ scopo, ▼ prezzo, ⏳ vuoto, Luck.
- **Carta**: riquadro Yin/Yang in cima (`yyBalance`: equilibrato o cosa serve; media del mese ±25%); derivati raggruppati con la madre (riga Xian Tian, riga Hou Tian); niente ripetizioni di bazi e numeri nella lettura natale.
- **Vuoti** (`natalVoids` in heluo-ds.js): solo dal pilastro del GIORNO; un ramo vuoto accanto, nel bazi, al ramo che lo scontra esce dal vuoto (solo pilastri vicini); vuoto timely = non vero vuoto. Prototipo ds_cascata.js allineato.
- Verifiche: `node ds_app_check.js` (0 differenze), `node mensile_app_check.js`. Prototipo e prova a percentili del filo: heluo-test/cmp/ds_filo.js (Edu non la usa come criterio).
- Aperti: regola dei Cures HLLS; quale misura yin/yang comanda (media del mese o 25/30); ampiezza ±3.

## 11/11/2026 (sera) — decisioni di Edu sui quattro punti aperti

1. **Cures con i trigrammi** (come la lettura natale): Qian, Zhen, Kan, Gen = yang; Kun, Xun, Li, Dui = yin. Due trigrammi yang = esagramma yang, due yin = yin, uno e uno = neutro (`yyTri` in heluo-ds.js; usata da `thread` e da `plMark`). Pesi invariati: giorno ±2, blocco ±1.
2. **Comanda la media del mese di nascita** (±25%), non i numeri fissi 25/30, che restano nel riquadro Yin/Yang solo come riferimento. Esempio di Edu: yang 31 (+29% sulla media di agosto 24) → la carta ha bisogno di yin.
3. **Correzione in proporzione**: il filo dà ☯ punti da −3 a +3; nella scansione ogni punto vale il 5% del punteggio XKDG del giorno (max ±15%) (`_hlApply` in app-bazi.js: `_hlPts` = punti, `_hlAdj` = valore aggiunto, un decimale). Il chip mostra ☯±n%.
4. **Vuoti**: se nel bazi c'è solo il ramo che scontra il vuoto (e non il vuoto), il vuoto **resta**. Dal tempo: esce con lo stesso ramo (填實) oppure con uno **scontro dal tempo (anno, mese o giorno) se il ramo è timely nella stagione** (mese della data) (`li()` in `thread`: `byClash`; planner: mesi con `monthBranch`). Edu (chiarito): la timeliness dipende da A) la carta di nascita (timely nel mese di nascita = non è un vero vuoto) e B) la stagione del momento (timely nel mese della data = esce con lo scontro). È quello che fa il codice.
- Non toccati: `scoreDay`/`tempo` (vecchia DS da sola, allineata al prototipo ds_cascata.js) tolgono ancora il vuoto se timely nel mese della data, senza chiedere lo scontro. Verifiche: `ds_app_check.js` 0 differenze, `mensile_app_check.js` ok.

- **Esagrammi derivati cliccabili** (Edu, 11/11 sera): nella scheda Chart, righe "From the Xian Tian" / "From the Hou Tian", ogni esagramma (madre, Hu Gua, Opposite, Inverse) ha ⓘ e apre un popup (`derivedPopup` / `xkdgHLDerived(which, kind)` in heluo-lishu.js): cosa rappresenta, come nasce, età e anni in cui conta (madre: tutto il periodo; Hu: linee 2–5 del ciclo), per Opposite e Inverse gli anni dei prossimi 30 con quell'esagramma come annuale; Inverse simmetrico = "nessun ostacolo nascosto separato"; in fondo i testi dell'esagramma. Provato in Chrome headless sulla carta di Edu: nessun errore.
- **Lettura natale, età 10–18** (Edu, 11/11 sera, sulla sua carta XT 1 l4 午 Ghost): nuovo stadio `teen` (metà periodo 13–18) in heluo-natal.js con frasi per tutte le relazioni; Ghost nell'infanzia e negli anni di scuola = "a time of difficulties and big changes, but also of personal growth" (`headline`), niente autorità/capi. Avviso 食神制殺 riscritto in parole semplici. Gli anni nella lettura ("years when this shows most", "years of sudden turns") sono link: `xkdgHLYearPop(Y)` (heluo-lishu.js, `yearPopup`) apre annuale disegnato con linea mossa, testo della linea ed esagramma, avviso opposite/inverse. Popup comune `hlPop`.
- **Popup dell'anno, riga "cosa porta"** (Edu 11/11, dopo la conferma del 1972 = 50 l5 Parent, "incontri eccezionali"): sopra il disegno una riga sulla relazione della linea mossa per la persona (Parent/Children/Wealth/Ghost/Brothers year) e, se il ramo dell'anno scontra la linea del periodo, "a year of sudden turns, and the moved line tells which way it goes".

## 12/11/2026 (mattina) — vuoti: nuova regola di Edu (sostituisce il punto 4 dell'11/11 sera)
- **Timely alla nascita = vuoto comunque, ma facile da lasciare** (sulla carta di Edu 酉 resta vuoto: HT 43 l5 Brothers, età 97–105). Esce con: lo stesso ramo nell'anno, mese o giorno (填實); uno scontro dal tempo **se chi scontra è timely** (stagione della data); **una linea mobile con quel ramo** (dottrina: ciò che si muove non può essere vuoto).
- **Untimely alla nascita = difficile**: esce solo con un anno **e** un mese che rendono timely il suo elemento; poi negli stessi tre modi.
- Alla nascita nulla lo libera, salvo lo scontro vicino nel bazi (`natalVoids`, invariato).
- Codice: `voidExit(b, mbNascita, T, moved)` e `movedBranches(p)` (linea mossa dell'annuale, linea del mese, linea del giorno nel blocco) in heluo-ds.js; usati da `tempo` (che ora accetta `{ list, mb, moved, birth }`), `scoreDay`, `thread` (`easy`, `how`), `plMark` (righe anni e mesi = linee mobili; riga periodi = facile/difficile) e dalla lettura natale (`vInfo.easy`, `voidEasy`, frasi). Una linea vuota non uscita toglie ancora 1 nel punteggio della vecchia DS, facile o difficile.
- **Vecchia DS allineata**: `tempo` in heluo-ds.js e ds_cascata.js con la stessa regola; `ds_app_check.js` 0 differenze (percentili: lancio Facebook 57→67, gli altri ±2).

## 12/11/2026 — testi delle linee negli esagrammi del tempo
- Testo 14 l3 riscritto (Edu: il Nobile dedica le proprie risorse a uno scopo più alto; caso della donna che si fa monaca nel 2010).
- `timeReading(testo, 'year'|'month'|'day')` in heluo-lishu.js (esportata in `XKDGHeluo.ui`): i commenti sono scritti per i 6/9 anni del ciclo; negli esagrammi del tempo diventano «This year / this month / this day» (anche «the final N years», «N-year period», accordo dei verbi). `lineBody(n, l, unit)` con unit stringa mostra il commento convertito ("Reading for this year/month/day"); `true` lo nasconde ancora.
- Ora i commenti compaiono convertiti in: carta annuale e popup dell'anno (year), planner anni/mesi, dettaglio della Date Selection (annuale, mese, giorno), finestra del giorno XKDG (mese/giorno), linee del giorno nella scheda annuale (day). Controllo: 384 testi × 3 unità senza resti «6/9 years».

## 12/11/2026 — decisioni di Edu e commenti richiudibili
- **Confermato**: vuoto untimely alla nascita = senza un anno **e** un mese timely non esce, nemmeno con lo stesso ramo (effetto: esce solo nella stagione del suo elemento).
- **Confermato (salvo modifiche future)**: nella vecchia DS un vuoto che non esce toglie 1, facile o difficile.
- **Commenti chiusi sul telefono**: `lineBody(n, l, unit, fold)` in heluo-lishu.js; con `fold` titolo e frase della linea restano visibili, poesia e commento stanno in un `<details>` «📖 Reading for this year/month/day/age» che si apre con un tocco (`stopPropagation`, così non chiude la riga). Usato nel Purpose planner (periodi, anni, mesi) e nella finestra del giorno XKDG (`xkDayHtml` → `lv`). Dettaglio della vecchia DS, popup dell'anno e carta annuale restano aperti. Provato in Chrome headless a 390 px.

## 12/11/2026 — Luck dall'anno o dal giorno? (domanda di Edu)
- Script `heluo-test/cmp/luck_pilastro.js` (metodo A): Heaven (stelo con il Na Jia) ed Earth (ramo, Time 1) presi dal pilastro di anno, mese, giorno o ora; Fame fuori (non dipende dal pilastro). 111 persone (famous_* + new/g1–g6), 393 eventi positivi, 230 negativi, 2752 date a caso.
- Prova 1, Luck nei nativi (XT, HT, Hu) contro Luck prese da un'altra persona a caso: nessun pilastro sopra il caso (anno p 0,63; giorno 0,65; mese 0,54; ora 0,25).
- Prova 2, anno dell'evento (ramo della linea del ciclo, della linea mossa e dell'anno che porta la Luck +1; Luck nei trigrammi dell'annuale +1, opposto −1): **anno** positivi 0,86 · negativi 0,72 · caso 0,75 (pos−neg p 0,11; pos−caso p 0,06); **giorno** 0,89 · 1,00 · 0,84 (i negativi più alti: al contrario). Mese e ora intorno a zero.
- Separate: la piccola tendenza dell'anno viene dalla Earth (ramo dell'anno: pos−caso +0,10, p 0,02); la Heaven dall'anno è piatta. Con 8 confronti è al limite: indizio, non prova.
- Conclusione: il giorno non migliora le Luck; se c'è un pilastro giusto è l'anno, come nelle slide.

## 12/11/2026 — Luck: vuoto, ciclo e flusso del Qi (regole di Edu)
1. **Luck vuota**: non aggiunge niente, ma il suo **opposto toglie lo stesso** (abbassa la Luck naturale che tutti hanno). Prima: Luck vuota ×0 per tutto. Esce dal vuoto come prima (ramo di scontro di anno, mese o giorno). Stagione del vuoto giudicata sul trigramma (confermato).
2. **Il ciclo conta**: trigrammi dell'esagramma del periodo (XT/HT) e del suo Hu (solo linee 2–5 del ciclo), peso 0,25 ciascuno nella vecchia DS (`LW.C.c`, `LW.C.h`; scelta di Claude).
3. **Flusso del Qi**: esagrammi in fila da sinistra a destra, ciclo → annuale → mensile → blocco → giorno; l'Hu del ciclo è un ramo laterale (ciclo → Hu). Inferiore con inferiore, superiore con superiore. Il trigramma di destra è **×1,5** se quello di sinistra lo genera o è dello stesso elemento, **×0,5** negli altri casi (lo controlla, ne è controllato, lo drena). Primo della fila ×1. Ogni posizione conta per sé (Kan/Kan = due volte).
- Codice: `flowMul`, `luckRow`, `luckMuls`, `luckDay` in heluo-ds.js; prototipo luck.js (`flusso`, `fila`; `LK_FLUSSO=no`, `LK_CICLO=no`, `LK_VUOTOOPP=no` per le versioni vecchie). Filo XKDG (`thread`): Luck su mensile, blocco, giorno con il flusso e il vuoto (scopo Luck: ☯ = somma arrotondata). Planner (`plMark`, nuovo argomento `prev`): periodi con esagramma e Hu, anni col flusso dal periodo, mesi dall'annuale; etichette «Luck: Earth (Hu 27) ↓ · opposite of: Fame (29) ×2».
- Diana 31/8/1997: Luck della vecchia DS da −0,03 a **−2,14** (Kan/Kan del periodo 29 = due volte l'opposto della Fame; Zhen nell'Hu 27, rafforzato dal Kan, toglie la Heaven vuota; Kan del giorno 4 rafforzato dal Kan del blocco 59).
- Verifiche: `ds_app_check.js` 0 differenze (percentile medio 45 → 46), `mensile_app_check.js` ok; planner provato in Chrome headless sulla carta di Diana.
- Non toccato: lettura natale (heluo-natal.js, che conta ancora gli opposti portati dai rami delle linee del ciclo).

## 12/11/2026 (pomeriggio) — flusso del Qi generale, peso del ciclo, lettura natale allineata
- **Confermato da Edu**: peso 0,25 per i trigrammi del ciclo e del suo Hu nella vecchia DS (`LW.C.c`, `LW.C.h`).
- **Flusso del Qi, regola generale (Edu)**: se un trigramma dell'esagramma A genera (o è dello stesso elemento di) quello nella stessa posizione di B, B è più forte (×1,5); se lo controlla, B è più debole (×0,5); **negli altri casi niente** (Edu: «per il momento mi fermerei qui»). Vale anche **fra linee nella stessa posizione**: la 3ª linea del ciclo che genera la 3ª dell'annuale la rafforza. Fila: ciclo → annuale → mensile → blocco → giorno; l'Hu del ciclo è ramo laterale.
  - Le Luck tengono la loro regola (`flowMul`: ×0,5 anche quando drena o è controllato): **Edu: per il momento lascia così**.
- Codice: `flowEl(a, b)` e `lineFlow(prevN, n, l)` in heluo-ds.js (esportate in `XKDGHeluoDSCore`).
  - Vecchia DS: `level(..., prevN)` → peso della relazione × `fl` (annuale ← ciclo, mensile ← annuale, linea del giorno nel blocco ← mensile, esagramma del giorno ← blocco). Dettaglio: «×1.5 ↑ strengthened by the same line on the left».
  - Filo XKDG (`thread`): linea del mese ← annuale, Lord ← mensile, linea del giorno ← mensile, esito ← blocco; pesi `XK_W × fl` per scopo e prezzo; frecce ↑↓ e nota nella finestra del giorno.
  - Planner (`plMark`): anni ← periodo, mesi ← annuale; ▲/▼ con ↑↓, punteggio ±2 × fl.
  - Prototipo ds_cascata.js allineato (`HL_FLUSSOLINEE=no` per toglierlo). `ds_app_check.js` 0 differenze (percentile medio 46 → 44); `mensile_app_check.js` ok.
- **Lettura natale allineata** (heluo-natal.js): niente opposti portati dai rami (10/11); Luck vuota = 0 sulla linea e nei trigrammi, il suo opposto toglie; trigrammi del periodo e dell'Hu (linee 2–5) 0,25 ciascuno con il flusso delle Luck; Hu che tiene la linea pesato col flusso generale (Wealth nell'Hu ×1,5/×0,5); sintesi della Luck vuota («adds nothing until … wakes it up, while its opposite still takes away»); sezione «Now» con «Strengthened/Weakened by … the same line of hexagram N». Diana età 34–42 (29 l5 戌 Ghost): −1,75. Prova: `node natal_proto.js diana txt` (aggiunta Diana).
- **Da ricordare a Edu**: regola di lettura di Opposite e Inverse (da decidere).
- **Stile dei commenti delle linee (Edu)**: le correzioni fatte vanno bene; adottare di più quello stile nella parte interpretativa di ogni linea.

## 12/11/2026 (pomeriggio, 2) — lo scopo anche nei trigrammi (dalla domanda di Edu sui suoi anni 2009–13)
- Edu: massimo guadagno 2009–13 (età 50–54) = seconda metà del ciclo XT 1 l2 寅 Wealth; dal 2014 (55) HT 43 l6 未 e annuale 1 Qian/Qian (tutto Brothers). Domanda: si può avere lo stesso con la Date Selection (anno → mese → blocco → giorno, o solo blocco e giorno)? Edu: «costruisci con quello che hai; anche l'onda corta può contare nei periodi di magra».
- Fatto in heluo-ds.js: `triRows(seq)` e `triScore(pers, X, A, rows, wHex)`.
  - La relazione dello scopo (+) e il prezzo `XK_ATT` (−) contano anche nei **trigrammi e negli Hu**, ciascuno col flusso generale (`flowEl`) dal trigramma nella stessa posizione dell'esagramma a sinistra; l'Hu prende il flusso dal suo esagramma.
  - **財生殺**: per lo scopo Wealth (e relationship per un uomo) i trigrammi Ghost tolgono, ma solo nello stesso esagramma che ha Wealth (sulla linea letta o in un trigramma).
  - Pesi (scelta di Claude, da confermare): filo XKDG mensile 0,5, blocco 1, esagramma del giorno 1 per trigramma, Hu a metà; planner trigramma 1, Hu 0,5. Periodi: solo la metà del nativo dove non sta la persona e l'Hu che tiene la linea.
  - Filo XKDG (`thread`, campo `tri`): sommato a `t`; finestra del giorno con «▲ Wealth also in the trigrams», «▼ The price in the trigrams», «▼ Wealth feeds the Ghost»; riga della scansione con il conto dei trigrammi. Planner (`plMark`): «+Wealth in Zhen (Hu) ↑», «−Brothers in …», «−Ghost fed by the Wealth».
- Prova sulla carta di Edu (scopo Wealth, giorni con ☯ positivo, filo XKDG = mese/blocco/giorno): 2005–08 (46–49) 73–110 giorni; **2009–13 (50–54) 139–152**; 2014–16 (55–57) 51–68; 2017 106; 2018 139. L'onda corta segue gli anni buoni.
- Livello anno (planner): 2012 (53) +3,75 (29 l1 寅 W, Zhen nell'Hu); 2014 (55) −4,5 (Qian/Qian, tutto Brothers); **ma 2009–11 negativi** perché il Dui inferiore degli annuali 41, 61, 60 è Brothers (prezzo) rafforzato dal Qian del periodo. Domanda per Edu: i Brothers nei trigrammi devono contare come prezzo quando la Wealth è sulla linea del ciclo?
- 財生殺 ancora frequente a livello giorno (180–340 giorni l'anno): da rivedere con Edu (solo se il Legno genera il Fuoco nel flusso?).
- **Trigrammi vuoti (Edu, 12/11, sul suo Dui = 酉)**: un trigramma con tutti i rami (Time 1) vuoti alla nascita non conta, né aiuto né prezzo, finché un ramo non esce (`voidExit`: stesso ramo, scontro di un ramo timely, linea mobile). `triVoid(t, V)` in heluo-ds.js; `triScore(..., V)` nel filo XKDG e nel planner (periodi: nulla lo libera). Nota «⏳ void, not counted».
- Date reali dei clienti 2011 (età 52, filo Wealth, posto nell'anno): 6/9 invio Yu 29% (prima 39%: Dui vuoto); 7/9 93%; 29/9 conferma 47% (Dui esce, mese 酉); 8/10 Belgrado 85% (Dui esce); 16/10 Dejan 43%; 15/11 report 67% (Dui esce: 卯 dell'anno timely nel mese 亥). **Confermato da Edu**: il 15/11 si è interrotto per un po' il rapporto con Milan — giorno 41 l3 con 申 Brothers nascosto, «tre viaggiano insieme, uno se ne va; chi viaggia da solo trova il compagno» (Dejan).
- **Heaven Luck di Edu: Zhen o Gen? (domanda di Edu, 12/11)** Carta di Edu: Gen = Parent (sostegno) invece di Zhen = Wealth; opposto Dui (nel suo HT 43, ma vuoto per lui). Date 2011: 29/9 e 8/10 hanno Zhen (2 e 4 volte) e, con Gen, l'opposto Dui sveglio (mese 酉) → favoriscono Zhen. `heluo-test/cmp/luck_regola.js` (`LK=heaven`): regole per il 庚 → Gen (R2 numero dello stelo nell'ordine Xian Tian; R3 Na Jia dello stelo che lo controlla) contro il Na Jia in uso e uno stelo a caso, sulle 111 persone: tutte piatte, nessuna regola si stacca dal caso (né nei nativi né negli anni degli eventi). I famosi non decidono; la Heaven Luck resta Zhen.
- **Luck dal pilastro del giorno sulla carta di Edu (12/11, primo pomeriggio)**: giorno 戊寅 → Heaven Kan, Earth Gen (Fame Li). Date dei clienti 2011 favoriscono l'anno; lo studio (1972, età 13: Gen in 7 mesi su 12, mensile 26 大畜) favorisce il giorno; Edu conferma eventi negli anni di Gen 1995, 1999, 2016, 2019. Ipotesi: anno = ciò che si ottiene, giorno = ciò che si è. Dettagli e prossimi passi: progetto HLLS 1, claude/hlls-handoff-luck-giorno.md.

## 12/11/2026 (pomeriggio, 3) — due serie di Luck: dall'anno e dal giorno (decisione di Edu)
- Carta di Edu, Luck dal giorno 戊寅: Heaven Kan, Earth Gen, Fame Li (opposti Li, Dui, Kan). Date di studio e insegnamento (Edu): OLIS settembre 1994 (35), primo contatto con la scuola di Yu 1999 (40), moltissimi seminari 2016 (57) e 2019 (60), più il 1972 (13). Somma dei mesi nel planner, anno / giorno: 1994 −2 / +12; 1999 −4 / +9; 2016 0 / +6; 2019 +3 / +15. Con il giorno 2019 e 1995 sono in cima a tutta la vita.
- Lu del bazi (戊 → 巳 nell'ora → Xun = Wood = Wealth): **respinto da Edu**: «Xun non va affatto bene»; il 2010 (61 Xun/Dui) in calo rispetto al 2009, e il 1997–2000 (Xun in tutti gli annuali) non buono. Conferma le Luck dall'anno (Xun = opposto della Heaven Zhen, toglie).
- **Deciso (Edu)**: Luck dall'ANNO = ciò che si ottiene (soldi, clienti), per tutti gli scopi; Luck dal GIORNO = ciò che si è (studio, scrittura, insegnamento), per **Speak e Support** (XKDG) e, per coerenza, Output e Parent nella vecchia DS (scelta di Claude). Scopo **Luck**: le due serie affiancate; il ☯ resta sulle Luck dall'anno.
- Codice: `R.luckDay` in heluo-lishu.js (stelo del giorno con il Na Jia, ramo del giorno Time 1, Fame uguale) e tabella «Luck trigrams» con le righe del giorno; heluo-ds.js: `profile(R, Pn, male, LS)`, `ctx.profD`, `DAY_LUCK`, `profFor(ctx, key)`; `thread` (funzione `luckTri`, campi `luckD`, `dayLuck`; finestra del giorno con il blocco «Luck from the day pillar»); planner `plMark` (funzione `luckPl`, etichette «year Luck» / «day Luck»); `scoreDay` vecchia DS; `luckProfileHtml` con le due tabelle.
- Verifiche: planner provato in Chrome headless sulla carta di Edu (luck, speak, wealth; 1990–2001). `mensile_app_check.js` ok. `ds_app_check.js`: differenze solo sugli eventi con scopo output (Jobs, Zuckerberg) perché il prototipo ds_cascata.js usa ancora le Luck dall'anno; wealth identico.
- **Da rivedere con Edu**: (1) lo scopo Wealth nei trigrammi (regola del 12/11, `triScore`) conta Xun come «+Wealth» negli anni 1997–2000 che Edu dice non buoni; (2) Dui vuoto come opposto della Earth Luck dal giorno (oggi toglie sempre: periodo HT 43 −1); (3) regola di lettura di Opposite e Inverse.

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

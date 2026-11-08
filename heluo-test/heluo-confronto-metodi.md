# He Luo Li Shu — confronto metodi A/B/C con eventi

## Come far girare (sessione 45, 2026-11-08)
Tutto sta nel repo edufengshui/xkdg, cartella heluo-test/ (copia dei file anche su Drive: He Luo Li Shu/heluo-test).
```
cd heluo-test && npm i            # lunar-javascript
node new/merge.js                 # new/g1..g6.json → famous_violent.json
cd cmp && node run.js             # tutti gli eventi → rows.json, summary.json
node violent.js                   # test vecchio (30 violenti)
node violent2.js                  # test allargato, modo stretto
LOOSE=1 node violent2.js          # prova di sensibilità con le ore deboli
python3 report_xlsx.py            # → ../HeLuo_violenti_allargato.xlsx
```
heluo_cmp.js trova solar-time.js e heluo-lishu.js nella cartella sopra (o in $XKDG_REPO).

## Sessione 44 (primo test)
41 personaggi Rodden AA/A, 335 eventi (184 +, 151 −). Metodi: A = app (solstizio, Na Jia, 29/3/39 opzione a); B = calcolatore (Lichun); C = Calculation Guide (Lichun, steli He Tu, riduzioni −25/−30). Testi 64+384 punteggiati −2…+2 prima di vedere gli eventi.
- Su tutti gli eventi nessun livello significativo; debole segnale dell'esagramma annuale nei tre metodi (D 0,15–0,18, p 0,03–0,06).
- 30 violenti: A e B al contrario; C nel verso giusto (esagramma annuale D +0,36, p 0,02; ciclo +0,29, p 0,14), non significativo dopo correzione.

## Sessione 45 (campione allargato)
- 70 personaggi nuovi (famous_violent.json), ora Rodden AA/A da astrotheme, 87 eventi violenti e 210 trionfi, ognuno con fonte. Gruppi in new/g1–g6.json, esclusi con motivo in new/g*-esclusi.txt.
- Ora debole (rating A da memoria con minuti tondi :00/:15/:30/:45 o 00:01): Aquino, Wallace, Giovanni Paolo II, Milk, Huey Long, Rushdie, Buddy Holly, Kaczyński. Escluse dal test principale (modo stretto): restano 77 violenti nuovi → 107 in tutto.
- Fusi: astrotheme non li scrive; ricavati rifacendo ASC/MC. Da controllare: Rajiv Gandhi (+4:51 ora di Bombay vs +6:30 ora di guerra), Paolo VI (+1 usato; astrotheme sembra +0:48), Mansfield (9:11 AA vs 17:40 altra fonte).
- Eventi tolti: elenco in famous_violent.json → meta.dropped.

### Risultato
- **Replica sui soli 77 violenti nuovi: il segnale del metodo C non regge.** Esagramma annuale D −0,04 (p 0,67), ciclo D +0,08 (p 0,33). Soglia replica 0,025.
- Modo largo (87 violenti): uguale (D +0,03 e +0,01).
- Tutti i 107 violenti: nessun livello di nessun metodo significativo (p minimo 0,18; soglia Bonferroni 0,0033). A e B restano al contrario su mese e giorno (B giorno D −0,38).
- Conclusione: il segnale del primo test era un caso del campione piccolo.

Risultati completi: HeLuo_violenti_allargato.xlsx (Riepilogo, Dettaglio violenti, Personaggi nuovi, Eventi nuovi con fonte, Esclusi).

### Regola clash (Edu, su Diana)
Linea annuale mossa (ramo Na Jia) in clash col ramo del mese → lettura negativa. Test (cmp/clash.js, Diana esclusa): clash nel 5% dei violenti contro il 9% dei successi in A e B, 10% contro 9% in C → la regola non distingue.

### Na Jia dei 64 esagrammi
heluo-najia.js (radice del repo): palazzo, Shi/Ying, ramo, elemento, sei relazioni e spirito nascosto per ogni linea, generato da liuyao.js del repo trading. Non è ancora collegato all'app.

### Lettura di Edu su Diana (cmp/lettura.js)
Tre coincidenze Liu Yao in A/B: ciclo (29 l5 = Ufficiale 戌, punito dall'anno 丑), annuale (23 l6 = 寅, clash col mese 申), mensile (14 l6 = Ufficiale 巳, giorno 巳 — ma in ora solare vera l'incidente è ancora giorno 甲辰). Contate su tutti gli altri eventi: frequenza uguale in tragedie e successi (A: 5/5/10% vs 3/9/9%).

## Prossimo passo (Edu, 8/11): DAL GENERALE AL PARTICOLARE
Il test finora ha guardato solo i cicli. Prima serve l'analisi natale completa (PowerPoint): esagramma di vita e linea mutante, eccesso/difetto Yin-Yang, proporzione, timeliness, Gua nativo, proper position, proper support, Hu Gua, Gua di cielo e di terra, renown Gua, opposto e inverso → grado di fortuna/sfortuna della persona in un dato momento. SOLO DOPO si guarda l'effetto dei cicli. Es. Diana: nativo Kan → periodo di terra complicato e pericoloso.
Piano: schede natali complete per 10–15 personaggi → giudizio di Edu senza vedere gli eventi → regole in codice → test sui 473 eventi.
heluo-lishu.js calcola già: heavenTrigram, earthTrigram, huGua, properPosition, properSupport, houTian, cycles. Da aggiungere come giudizio: Yin-Yang, proporzione, timeliness, renown, opposto/inverso, combinazione finale.

## Sessione 46 (2026-11-08): schede natali, giudizio cieco
- schede/build.js → schede/schede.json (metodo A) + schede/chiave-NON-APRIRE.json (codice → nome); schede/page.py + template.html → schede-natali.html (artifact).
- 12 persone, 6 con morte violenta/tragica e 6 con vita lunga e riuscita, mescolate (S01–S12). Edu dà fortuna di vita −2…+2 con nota, senza vedere nomi ed eventi.
- Prossimo: confronto giudizi ↔ chiave, poi trasformare i criteri di Edu in regole e testarle sui 473 eventi.
- Edu vuole che i giudizi li dia Claude. Regole tradotte dalle slide in schede/score.js (direzione Yin-Yang, totale ~55, numero dominante giusto per la stagione, linee yang/yin per sesso, proper position e support XT/HT, linea 5/2/3/6, prevalenza, trigrammi di fortuna e opposti, forza stagionale e flusso dei trigrammi XT) → schede/punteggi.json.
- Risultato: 62 violenti (ora forte) media 1,21 contro 41 altri 0,86 → nessuna separazione (p 0,75). Nessuna voce singola distingue.
- Edu: il natale è solo la partenza della corsa, poi contano i cicli. schede/corsa.js: momento = punteggio natale + linea del ciclo (posizione, supporto, linea 5/2/3/6, qi per linea vs media del mese, trigramma della linea = fortuna/opposto, ramo dell'anno = fortuna/opposto).
- 77 morti violente contro 365 successi: momento 1,26 contro 1,23 (p 0,54). Stessa persona: ciclo migliore nei successi 26 volte, peggiore 26. Partenza debole + ciclo cattivo: 31% dei violenti, 28% dei successi. Nessun segnale.

## Sessione 47 (2026-11-08): corsa con anno e mese, metodi A/B/C
- schede/corsa2.js → schede/corsa2.json. Momento = natale + linea del ciclo + linea annuale mossa + linea mese/giorno (esagramma mensile, linea dei 5 giorni), stesse regole strutturali di corsa.js; ramo dell'anno per ciclo e anno, ramo del mese per il mese. Più il punteggio dei testi (txt) per confronto.
- 77 violenti contro ~365 successi, soglia Bonferroni 0,0028 (3 metodi × 6 misure). Nessuna misura significativa: p minimo 0,13 (C, testi).
- Ciclo e anno vanno nel verso giusto ma deboli (A anno 0,17 vs 0,37, p 0,21). Il livello mese/giorno in A e B va al contrario (violenti più alti; B p ~0,06 a due code), come già nel test dei testi.
- Stessa persona: nessuna tendenza stabile (C ciclo 32 meglio / 19 peggio, ma A e B pari).
- Conclusione: con queste regole né la partenza natale né la corsa (ciclo, anno, mese) separano le morti violente dai successi, in nessun metodo.

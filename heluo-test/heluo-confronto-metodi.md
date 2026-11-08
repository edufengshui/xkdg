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

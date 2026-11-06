# QMDJ — Regole canoniche unificate (fonte unica)

Questo documento è la **fonte unica di verità** per le regole QMDJ del software.
Tutte le sezioni (attivazione Water/Feng Shui, scan speciale Qimen, direzioni, viaggi)
derivano da qui. Niente più regole replicate o divergenti nei singoli file.

Stato attuale = come gira il codice **oggi**. Canonico = come **deve** essere (tua dichiarazione).

---

## 1. ESCLUSIONI UNIVERSALI (un palazzo squalificato è fuori, sempre)

Valgono per **ogni** valutazione di palazzo QMDJ (sia carta volante 飛盤 sia rotante 轉盤).

| Regola | Canonico | Eccezione |
|---|---|---|
| Warrior 玄武 | **sempre escluso** | nessuna |
| Tiger 白虎 | **escluso** | tenuto SOLO con San Qi/Wu **+** porta favorevole |
| Clash di steli 相冲 (甲庚, 乙辛, 丙壬, 丁癸) | **escluso** | salvo se lo stelo che fa clash **nasconde il Commander 值符**, oppure se **un elemento del palazzo fa da ponte** (stella, porta o palazzo: es. Johanna, Ren-Bing con Delusion). Contano anche i secondi steli, pure nello stesso piatto |
| 丙庚 (Bing+Geng, qualsiasi ordine) | **escluso** | salvo se **Geng nasconde il Commander** (su Tian o Di pan) |
| 戊辛 (Wu+Xin, qualsiasi ordine) | **escluso** | salvo se **uno dei due stemi nasconde il Commander** |
| 壬己 (Ren+Ji, qualsiasi ordine) | **escluso** | salvo se **uno dei due stemi nasconde il Commander** |
| 庚己 (Geng+Ji, qualsiasi ordine) | **escluso** | salvo con la stella **Pillar 天柱 _E_ porta favorevole** |
| Geng sopra/sotto un **Commander che NON è Geng** | **sempre escluso** | nessuna |

---

## 2. REQUISITO OBBLIGATORIO — direzioni / viaggi (carta rotante 轉盤)

Un palazzo è **idoneo alla partenza** solo se ha **entrambi**:

1. **San Qi (乙丙丁) _oppure_ lo stelo Wu (戊)** — Wu vale allo stesso livello del San Qi
2. **Porta favorevole**: Open 開 (Kai), Rest 休 (Xiu), Birth 生 (Sheng), View 景 (JingS)

**Unica eccezione alla porta:** la porta **Injury 傷 (Shang)** è ammessa **solo per i viaggi**
e **solo se è presente San Qi/Wu**.

> Nota domini: il gate (San Qi/Wu + porta) si applica **sia** alla carta rotante (direzioni/viaggi)
> **sia** alla carta volante (attivazione Water/FS) — decisione B confermata. La sola differenza tra i
> due domini è l'eccezione **Injury 傷**, valida **solo per i viaggi**. Le ESCLUSIONI della §1 valgono ovunque.

---

## 3. BONUS (aumentano il punteggio, non sono requisiti)

- **Commander 值符** presente → favorevole/desiderabile
- **Zhi Shi 值使** presente → favorevole/desiderabile
- **Configurazioni positive direzionali** (già nel software — `qmdj-water-scanner.js`, da riusare in toto):
  - **Nine Glimpses 九遁**: Heaven 天遁, Earth 地遁, Human 人遁, Deity 神遁, Ghost 鬼遁, Wind 風遁, Cloud 云遁, Dragon 龍遁, Tiger 虎遁
  - **Three Pretenses 三詐**: Real 真詐, Rest 休詐, Multiple 重詐
  - **Five Borrows 五假**: Heaven 天假, Earth 地假, Human 人假, Deity 神假, Ghost 鬼假
  - combo già presenti: 丙↑戊, SanQi+ZhiFu, SanQi+ZhiShi, 丁Di+ZhiShi, ecc.

---

## 4. DOVE VIVONO OGGI LE REGOLE (e perché vanno unificate)

| Regola | `qmdj-water-scanner.js` `palaceFlags` (water/special) | `qmdj-water-scanner.js` detector rotante (`extractHits`) | `travel-planner.js` `evalPalace` | `app-bazi.js` (glue direzioni) |
|---|---|---|---|---|
| San Qi | — | `[Yi,Bing,Ding]` su **ti** | `[Yi,Bing,Ding]` su **ti o di** | — |
| Wu come San Qi | — | **no** | **no** | — |
| Porte fav. | — | `Kai,Xiu,Sheng,JingS` | `Kai,Xiu,Sheng,JingS` | — |
| Injury+SanQi (viaggi) | — | — | **sì** | — |
| Warrior 玄武 | escluso *(mio patch)* | **non controllato** | **fallback** (non escluso) | escluso a mano |
| Tiger 白虎 | — | **non controllato** | **fallback** (non escluso) | escluso a mano |
| Clash 相冲 | escl. salvo Commander | escl. salvo Cloud/Tiger Dun | logica propria | — |
| 丙庚 / 庚己 | sì / sì salvo Pillar | logica Geng diversa (water-trine, Commander) | — | — |

Tre definizioni di San Qi, tre gestioni di clash/Geng, tre comportamenti per Warrior/Tiger.
**Obiettivo:** un solo predicato canonico in `qmdj-water-scanner.js`, consumato da tutti.

### Architettura proposta
- Costanti uniche in cima a `qmdj-water-scanner.js`: `SAN_QI` (con **Wu**), `FAV_DOORS`, `BAD_DEITY`.
- `QMDJ.formationFlags(cell)` = §1 esclusioni universali → `{disqualified, reasons}`.
  `palaceFlags` diventa un alias.
- Il detector rotante (`extractHits`) e `travel-planner.evalPalace` chiamano lo **stesso** predicato.
- `app-bazi.js` smette di fare `!isWarrior && !isTiger` a mano (resta **additivo**, delega).

---

## 5. DECISIONI CONFERMATE (Edu) + stato implementazione

- **A — Five Borrows / Ghost Dun:** i config passano **in automatico** solo se non violano §1 e §2.
  Quelli che non passano **non** qualificano da soli, ma restano **attivabili manualmente** nella
  sezione corrispondente. → *config = bonus su palazzo già idoneo.*
- **B — Dominio del gate San Qi+porta:** vale **sia** per direzioni/viaggi (rotante) **sia** per
  attivazione Water/FS (volante). Unica differenza: Injury 傷 solo per i viaggi.
- **C — Eccezione Tiger:** vale anche con **Wu** (Wu = livello San Qi). ✓
- **D — Tutti i Dun:** passano in automatico solo quelli che non violano §1/§2 (rimosse le vecchie
  eccezioni Cloud/Tiger-Dun-clash e Geng-water-trine). Quelli che non passano → attivabili a mano.

### Stato implementazione (sessione corrente)
| Sezione | Predicato unico consumato | Stato |
|---|---|---|
| `qmdj-water-scanner.js` — `formationFlags` §1 + `directionGate` §2 | **fonte unica** | ✅ implementato + testato |
| Water/FS quadrant (`checkHourAtPalace`) | §1 + §2 | ✅ |
| Special Qimen scan (`flying-stars-qimen.js`) | §1 + §2 | ✅ |
| Travel/direzioni (`travel-planner.js` `evalPalace`) | §1 + §2 | ✅ (no più fallback; Wu conta) |
| `app-bazi.js` gate LIST + BEST | delega a `evalPalace.ok` | ✅ |
| **Attivazione manuale** dei config che non passano (A/D) | — | ⏳ **UI da costruire** (nuovo) |

> Verificato headless su carta rotante reale 24/6/2026 ora Wu: Geng↔Commander, Warrior, Tiger,
> Injury-viaggi e Wu-come-San-Qi tutti corretti.

---

## 6. FLUSSO DEL QI (Activations — decisioni Edu)

Componenti: steli Tian e Di (anche i secondi steli), stella, porta, elemento del palazzo.
Lo **spirito** viene mostrato ma **non entra** nel flusso.

- Gli elementi presenti si ordinano sul ciclo generativo. Il tratto più lungo di elementi assenti
  è il punto di partenza; l'ultimo elemento della catena è il **punto finale**.
- **Tutti e 5 gli elementi:** il flusso va bene; nessun punto finale, focus **porta e stella**.
- **Elemento mancante dentro la catena:** va aggiunto come **ponte** (Vettel: Metallo → Acqua → Legno).
- **Due interruzioni uguali:** servono correzioni.
- **Porta e stella sullo stesso elemento finale:** focus su **entrambe**.
- **Correttivi nel palazzo di partenza:** il focus migliore è la **stella**, quindi si indicano gli elementi
  assenti per arrivarci; in seconda battuta la **porta**, con i suoi correttivi.
  Non importa che il palazzo di partenza sia sfavorevole: conta dove finisce il qi.
- **Correttivi nel palazzo di arrivo:** se il flusso finisce solo su uno stelo, si indicano gli elementi
  assenti per arrivare a una porta favorevole (Activations slide 27).
- **Stagionalità del palazzo (regola Bazi):** timely se dello stesso elemento della stagione o generato da essa.
- **Stella vibrante:** dello stesso elemento della stagione o che la genera.
- **Palazzo vuoto:** effetto ritardato, ma ancora usabile se c'è azione.
- **Human Activation:** è Feng Shui, si fa dentro casa, quindi usa la carta volante.
- **Clash tra carte (carta volante):** contano anche gli steli del Di Pan. Le regole viaggi sulla carta rotante non cambiano.
- **Life Palace:** dove sta lo stelo del giorno di nascita nella carta dell'ora di nascita.

## 7. PARTENZA E ARRIVO (Directionology, Activations — decisioni Edu)

- Accumulo nel palazzo di partenza, rilascio in quello di arrivo.
- **Perdita di energia:** clash senza ponte o elemento mancante nella catena del palazzo di partenza.
- **Confronto tra i palazzi:** solo il rapporto (genera, controlla, stesso elemento), senza giudizio,
  perché dipende dallo scopo.
- Tutto questo è **informativo**: non cambia punteggi, classifiche né esclusioni.

## 8. CARTE MULTIPLE (Feng Shui, carta volante — cap. 6, decisioni Edu)

Codice: `qmdj-multichart.js` (Charts → 🧩 QMDJ Multiple charts). Mese + Giorno + Ora o Giorno + Ora, stesso palazzo Yong Shen.

- **Master:** Support the longer effect = la carta più lenta. Boost the shorter effect = l'ora (usare con cautela, per sbloccare situazioni ferme).
  Le altre carte nutrono e correggono: un elemento mancante nel flusso del master può venire da loro.
- **Ogni carta** deve superare da sola §1 e §2 nel palazzo. Lo scopo (porta) vale solo sulla carta master.
- **Scartati:** palazzo vuoto nel giorno; giorno di clash col palazzo, salvo se riempie il palazzo vuoto.
- **Porte e stelle tra carte:** generazione o stesso elemento ok; controllo = scarto.
- **Steli tra carte, stesso piatto (Tian con Tian, Di con Di):** clash §1 e coppie 丙庚 戊辛 壬己 庚己 = scarto,
  salvo ponte (per i clash, da qualsiasi carta) o protezione di una terza carta con uno stelo che combina (esempio 3: 丙 con 辛).
- **Combinazioni tra carte:** solo segnalate.

**Riferimento carte (Edu, sessione 39):** porte delle carte volanti e carte mese/giorno dell'app sono giuste (sistemate nella sessione 32).
Le slide 14-20 del cap. 6 seguono un'altra convenzione quando il centro è coinvolto e usano Yin 7 per 2014-2018: non servono per verificare l'app.

## 9. LA PERSONA (carte Feng Shui — cap. 6 slide 5 e 10, decisioni Edu)

- **Stella della persona:** stella del Life Palace = carta **rotante** dell'ora di nascita, stelo del giorno sul **Tian Pan**.
  Giorno 甲: stelo nascosto del decennio del giorno (甲子 → 戊). Stelo arrivato dal palazzo centrale (secondo stelo con Rice): **Fowl**; altrimenti Rice.
- **Carte volanti:** la stella si cerca dove sta davvero, Fowl compreso (non segue Rice, che è la regola della rotante). Stella al centro = palazzo Terra.
- **Controllo su tutte le carte** (mese, giorno, ora): relazione tra palazzo Yong Shen e palazzo dove sta la stella in quella carta.
- Genera, è generato o stesso elemento: va bene.
- **La stella controlla il YS:** solo avviso.
- **Il YS controlla la stella:** scarto, salvo se **un'altra carta** porta nel palazzo YS l'**elemento ponte**.

**Da confermare (Edu):** stelle in controllo tra carte (scarto o avviso); controllo tra porte su tutte le carte; giorno che non supera il §2.

## 10. SCHEDA OPERATIVA (Multiple charts e assistente — cap. 6 slide 6-8, decisioni Edu)

Codice: `card`, `cardHtml`, `palaceObjects` in `qmdj-multichart.js`; assistente: `find_multichart_activation`.

- **Contenuto:** palazzo e carte usate, steli, porta, stella, spirito, dove finisce il qi e focus, elementi da aggiungere, oggetti, passi, persona, avvisi.
- **Oggetti:** non c'è una tabella di Edu, si deducono dai significati dei componenti del palazzo (Yong Shen Representations 01 e 03), adattati alla vita moderna.
  Dalla slide 6: Bird, Ding, Hero, Open, Wu. I numeri del palazzo sono Later + Early Heaven (slide: Zhen 3, 4). Ogni voce ha `source` slide o meaning.
- **Sempre:** il modo più semplice è una ciotola di acqua in movimento.
- **Tiger:** nessun oggetto.
- **Assistente:** usa le persone A e B caricate, altrimenti chiede.

**Da confermare (Edu):** la tabella degli oggetti dedotti; oggetti solo dalla carta master; "schiena verso la direzione del palazzo" generalizzato dall'esempio Zhen/Est.

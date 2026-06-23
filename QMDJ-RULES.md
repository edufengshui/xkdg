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
| Clash di steli 相冲 (甲庚, 乙辛, 丙壬, 丁癸) | **escluso** | salvo se lo stelo che fa clash **nasconde il Commander 值符** |
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

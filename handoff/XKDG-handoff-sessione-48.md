# XKDG — passaggio di consegne, sessioni 46-48 (8-10/11/2026)

Repo edufengshui/xkdg, ramo main, push = pubblicato (GitHub Pages, fsadvisor.org/xkdg). Ultimo commit di questa chat: "Palace test: verifica dei clash tra pilastri che comunicano".

## He Luo Li Shu (spostato in un progetto a parte)
Vedi handoff/heluo-lishu-handoff.md. Nell'app: tabella sei linee (ramo Na Jia, sei relazioni, Shi/Ying, testo di ogni linea) e sezione "Natal reading" dalle slide. Test sui famosi chiuso: si usa il metodo A.
Aperto: HT con una sola linea yin letto come "prevalente yin, adatto a una donna" — Edu non ha ancora confermato.

## Schermata principale
Riga UTC/LONG: tre frecce per lato come nei registratori (◀ ora, ◀◀ giorno, ◀◀◀ mese; a destra le stesse in avanti). shiftDay / shiftMonth in app-bazi.js. ATTENZIONE styles.css: il blocco @media (max-width: 600px) non va spezzato; le regole per schermi < 400px stanno in un blocco a parte in fondo al file.

## Cure tra due carte di nascita (pannello Both, app-bazi.js)
- Cura completa = un pilastro dell'altro che risolve tutto (regole sessione 33). In più "➕ It helps": pilastro che sistema solo il Qi (un solo linguaggio), o lega un pilastro isolato, o ha lo STESSO Periodo del pilastro isolato (stesso numero = comunicazione; vale solo per i Periodi). Funzione xkdgMutualHelps.
- Vuoti (solo tra due carte di nascita): untimely = irrecuperabile, cura/aiuto invalido (⛔); timely (elemento del vuoto = elemento del mese di nascita di chi porta il vuoto, o generato da esso) = valido; se il pilastro giusto c'è già (altra carta: stesso ramo o ramo che clasha, in qualsiasi pilastro; stessa carta: ramo che clasha nel pilastro limitrofo a quello col ramo vuoto) il vuoto è già uscito e NON si menziona; altrimenti avviso ⚠ "esce quando arriva X o Y". Il pilastro colpito non può riempirsi col proprio ramo. xkdgCureVoid(…, months).
- Per date e Feng Shui il vuoto resta un semplice avviso, come prima.
- Caso di prova: Edu (丁巳 戊寅 甲申 庚子) e Thao (ora dedotta 甲戌, 己亥 壬寅 丁卯): Thao riceve 0 cure + 3 aiuti; Edu riceve 1 cura (Ora di Thao) + 1 aiuto.

## Palazzi (terza dimensione, minore)
Numero di palazzo di un pilastro = numero del Cielo Anteriore del trigramma INFERIORE dell'esagramma (Qian 9, Dui 4, Li 3, Zhen 8, Xun 2, Kan 7, Gen 6, Kun 1). Legami come Qi/Yun (5/10/15, Hetu, stesso numero; somma/Hetu annullati dal clash dei rami); un pilastro senza legame numerico comunica se condivide una famiglia con un altro pilastro. Riga "Palaces (minor — Feng Shui)" nell'analisi della persona (xkdgPalaceComm, xkdgPalaceHtml): solo informativa, non entra in rimedi, cure o punteggi. Esempio Yu (癸丑 癸酉 庚午 己未): 3 6 2 2, Giorno legato all'Ora per famiglia Gen-Dui.

## Assistant in-app (ai-chat.js)
- person_xkdg_gaps e mutual_cures sempre disponibili, anche senza area.
- Regola: i fatti (isolati, cure, aiuti, vuoti, rimedi) solo dagli strumenti; deduzioni e immaginazione benvenute ma partendo da una regola/valore restituito, dichiarandolo; fatti e lettura separati; mai spiegare come funziona il "motore" né inventare regole. Niente conteggi di "canali" né stelline.
- Riceve i palazzi con la nota "dimensione minore, peso nel Feng Shui". Nessun riferimento alla bellezza (tolto su richiesta di Edu).
- Non provato dal vivo.

## Indagine palazzi e bellezza (cartella palace-test/, NOTE.md)
- Frequenza di base su 20.000 carte: palazzi buoni (con famiglia) 75%, coi soli numeri 39%.
- 120 famosi per bellezza/fisico (ore Astrotheme AA/A): 72,5% buoni, come controllo e caso. Nessun effetto.
- File di Edu, cartella Drive "Famous" (= "Famous People", .fpd): 228 carte, 79 persone perfette coi soli numeri (35%).
- Life Reading QMDJ/DLR di Edu (pilastri scritti nelle slide): 119 persone, 56 perfette coi soli numeri (47%), 26 in un solo gruppo; verificati i clash (nessun cambiamento). Dieci hanno un legame annullato dal clash ma restano perfette.
- Domande aperte a Edu: "perfette" = solo un gruppo unico? "stesso elemento" = stesso numero (assunto)? lettura severa (un clash tra pilastri che comunicherebbero toglie la carta, ne restano 46)?
- Errori nelle slide segnalati: Spielberg Anno 丁戌 (inesistente); Dostoevskij e Krishnamurti con ore diverse tra presentazioni; file "Yoko_Ono.fpd" contiene Netanyahu.

# XKDG — passaggio di consegne, sessione 49 (10-11/11/2026)

Repo edufengshui/xkdg, ramo main, push = pubblicato. Handoff precedente: XKDG-handoff-sessione-48.md.

## Metodo per l'interfaccia (deciso con Edu dopo due versioni respinte)
- Prima di pubblicare una modifica visibile: screenshot a larghezza telefono (412 px) e approvazione di Edu.
- Niente bottoni nei titoli, niente riquadri dentro colonne già piene, niente toggle nuovi se non richiesti. Testo minimo.
- Test in container: Chrome headless + playwright Python, lunar-javascript servito da npm locale (il CDN non è raggiungibile), `license-overlay` nascosto a mano. Il Luopan nel browser di prova esce più piccolo che sul telefono.

## Palazzi (palaces.js, nuovo file)
- Numero di palazzo sempre visibile: tra parentesi a destra del numero del Periodo, piccolo e marrone, rosso se isolato (classe `.hex-yun` aggiunta alla casella). Nessun toggle (tolto).
- Setting dei palazzi = ultima riga, piccola, di XKDG RELATIONS (data e Person A/B).
- Regole: legami 5/10/15 e Hetu, annullati dal clash dei rami; legame di famiglia. **Lo stesso numero NON è un legame dentro una carta e NON è una cura col Luopan**; vale solo **tra due persone** (riquadro "Same palace between the two persons" = possibile relazione fisica evidente, e come cura reciproca "Palace cure from X's chart"). Mostrati solo se ci sono.
- Palazzo isolato: riga nel blocco "Missing communication" della persona + elenco esagrammi 正 ZS / 零 LS per palazzo nel tab 👤 PERSON e nel pannello Luopan ☰ → 🌿 Cure (tocco = date dell'esagramma). Non entra in cure/punteggi di Elementi e Periodi.
- Le percentuali dell'indagine palazzi (sessione 48) contavano lo stesso numero: da rifare se servono.

## XKDG RELATIONS della data
- Compatto: ★ A ★ / ★ B ★ in alto a destra (float), righe strette; bottone "▲ Hide XKDG Relations" (localStorage `xkdgRelHidden`).

## Luopan
- Etichetta in alto a sinistra "🧭 Facing in use: nome — gradi · Hex n · change"; *change* apre l'elenco dei facing salvati. **Default sempre House Facing** al caricamento della casa (non più la prima porta) — non provato con profili reali.
- Con un facing salvato diverso da House (porta, letto, scrivania): niente verde dei facing del giorno, Zheng/Ling Shen tenui.
- Nota Tai Sui · Sui Po · Five Yellow · San Sha · Wu Ji: sotto la legenda dei colori; **solo dell'anno** (cambiano ogni anno, uguali per tutto l'anno); tocco su una riga = spicchio sul Luopan.

## Wu Ji Sha 戊己煞 (regola di Edu, sostituisce la vecchia 戊己都天 giorno+ora, che ora è spenta: `isWJDT` ritorna false, niente più −3)
- Attivo solo nei suoi giorni e nel suo settore: rami Wu Ji dell'anno, giorno 戊+ramo yang / 己+ramo yin. 丙午: 戊戌 → 戌, 己亥 → 亥 (NW).
- Sha forte: avviso "⚠ 戊己煞 no NW" in CAL, LIST, BEST e prima riga rossa di XKDG RELATIONS; sul Luopan settori separati, rosso pieno nel giorno attivo. Non cambia il punteggio delle ore.
- Tabella per gli altri anni dedotta dall'esempio (乙/庚 ha quattro giorni): Edu deve ancora confermarla.
- Non fatto: email giornaliera.

## Aperto
- Conferma tabella Wu Ji per tutti gli steli.
- Edu segnalava che nella persona la riga dei palazzi non compariva: non riprodotto; aggiunto un observer che la rimette.
- Domande aperte della sessione 48 (He Luo HT una linea yin; criteri "perfette" dell'indagine palazzi).

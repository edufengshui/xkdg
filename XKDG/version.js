// ============================================================
// XKDG Bazi Calculator — version.js
// ============================================================
// Mostra automaticamente nell'etichetta #version-tag la data e
// l'ora dell'ULTIMO commit pushato sul repo GitHub.
//
// COSA FA:
//   • All'apertura dell'app interroga le API pubbliche di GitHub
//     e chiede l'ultimo commit del branch "main".
//   • Scrive nell'etichetta la data/ora di quel commit, es.:
//        v 23/05/2026 14:30
//   • Si aggiorna DA SOLO a ogni push — nessuna manutenzione.
//
//   • Se l'app è offline (o l'API non risponde), l'etichetta
//     resta sul valore di fallback scritto in index.html.
//
//   • Continua a esporre window.APP_VERSION (numero) per
//     compatibilità con eventuale codice che lo usa.
//
// MANUTENZIONE: zero. Non serve più toccare "v476" in index.html.
// ============================================================

(function(){
    'use strict';

    var REPO   = 'edufengshui/eduXKDG';
    var BRANCH = 'main';

    var tag = document.getElementById('version-tag');

    // ── Compatibilità: espone APP_VERSION leggendo il numero di fallback ──
    var fallbackTxt = tag ? (tag.textContent || '') : '';
    var numMatch = fallbackTxt.match(/(\d+)/);
    window.APP_VERSION = numMatch ? parseInt(numMatch[1], 10) : 0;

    if (!tag) return;

    // ── Interroga le API GitHub per l'ultimo commit ──
    var apiUrl = 'https://api.github.com/repos/' + REPO + '/commits/' + BRANCH;

    fetch(apiUrl, { headers: { 'Accept': 'application/vnd.github+json' } })
        .then(function(res){
            if (!res.ok) throw new Error('GitHub API ' + res.status);
            return res.json();
        })
        .then(function(commit){
            var iso = commit && commit.commit && commit.commit.committer
                    ? commit.commit.committer.date : null;
            if (!iso) throw new Error('no commit date');

            var d = new Date(iso);
            var pad = function(n){ return (n < 10 ? '0' : '') + n; };
            var label = 'v ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' +
                        d.getFullYear() + '  ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

            tag.textContent = label;

            // Tooltip con lo SHA breve del commit, utile per diagnosi
            if (commit.sha) tag.title = 'commit ' + commit.sha.substring(0, 7);
        })
        .catch(function(){
            // Offline o API non raggiungibile: si lascia il testo di fallback
            // già presente in index.html. Nessuna azione necessaria.
        });

})();

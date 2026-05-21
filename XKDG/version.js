// Reads the current app version from the #version-tag element placed in
// index.html and exposes it as the global APP_VERSION constant. The number
// is parsed from the textContent (which has the form "v475"), so to bump
// the version only the index.html tag needs editing.
(function(){
    const tag = document.getElementById('version-tag');
    const txt = tag ? (tag.textContent || '') : '';
    const match = txt.match(/(\d+)/);
    window.APP_VERSION = match ? parseInt(match[1], 10) : 0;
})();

// Videos in the guides: full screen when the phone is turned sideways (session 35, Edu).
// Pressing play on a phone in landscape, or turning the phone while a video plays,
// opens it full screen; on Android the screen is locked in landscape while it is full screen.
(function () {
  function fsOf(v) { return v.requestFullscreen || v.webkitRequestFullscreen || v.webkitEnterFullscreen; }
  function isLandscape() { return (screen.orientation && /landscape/.test(screen.orientation.type)) || window.innerWidth > window.innerHeight; }
  function inFs() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function goFs(v) {
    if (inFs()) return;
    var f = fsOf(v); if (!f) return;
    try { var p = f.call(v); if (p && p.then) p.then(lock).catch(function () {}); else lock(); } catch (e) {}
  }
  function lock() { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} }
  function playing() { return [].slice.call(document.querySelectorAll('video')).filter(function (v) { return !v.paused && !v.ended; })[0]; }
  function onTurn() { setTimeout(function () { var v = playing(); if (v && isLandscape()) goFs(v); }, 250); }
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', onTurn);
  window.addEventListener('orientationchange', onTurn);
  document.addEventListener('play', function (e) { if (e.target.tagName === 'VIDEO' && isLandscape() && /Mobi|Android|iPhone/.test(navigator.userAgent)) goFs(e.target); }, true);
  document.addEventListener('fullscreenchange', function () { if (!inFs()) { try { screen.orientation.unlock(); } catch (e) {} } });
})();

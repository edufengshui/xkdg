    const _now = new Date();
    const _pad = n => String(n).padStart(2,'0');
    document.getElementById('version-tag').textContent =
        `✦ Claude Edition — v2.0 PWA102 (${_now.getFullYear()}-${_pad(_now.getMonth()+1)}-${_pad(_now.getDate())} ${_pad(_now.getHours())}:${_pad(_now.getMinutes())}) ✦`;

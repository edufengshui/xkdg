// ═══════════════════════════════════════════════════════════════
//  ☰ Options menus everywhere (session 33, Edu: "ottimizzare tutte le sezioni
//  interne usando lo stile delle tre righe che raccolgono tutte le opzioni").
//
//  A thin façade, like the luopan ☰ (session 26): the original buttons STAY in
//  the DOM, only hidden, so every module that drives / restyles / relabels them
//  keeps working untouched. A ☰ button in the same row opens a list of those
//  buttons (current labels, a dot when active); tapping an entry clicks the
//  original button. The active options show as small badges next to the ☰.
//  Rows rebuilt by innerHTML are picked up again by a MutationObserver.
// ═══════════════════════════════════════════════════════════════
(function () {
  // anchor: a selector for ONE button of the row (the row = its parent element)
  // keep:   selectors of buttons that stay visible (main actions)
  // noBadge: selectors never shown as a badge (always-coloured buttons)
  var TARGETS = [
    { id: 'luopan', anchor: '#fs-mode-fs', title: 'Luopan view', noBadge: ['#fs-mode-floorplan'] },
    { id: 'housedata', anchor: '[onclick="fsExportBackup()"]', title: 'Backup · Houses DB · Daily email' },
    { id: 'stars', anchor: '#fs-stars-toggle', title: 'Flying Stars', keep: ['#fs-save-house-top'] },
    { id: 'period', anchor: '#fs-period-btn', title: 'Period · Pure YY · No Adj' },
    { id: 'list', anchor: '[onclick="toggleListAll()"]', title: 'List options' },
    { id: 'best', anchor: '[onclick="toggleBestOnlyXKDG()"]', title: 'Sort & filter' }
  ];

  var css = document.createElement('style');
  css.textContent = '.xopt-h{display:none!important}' +
    '.xopt-holder{position:relative;display:inline-flex;align-items:center;gap:3px;flex-wrap:wrap;margin-left:auto;}' +
    '.xopt-badge{font-size:10px;font-weight:bold;color:#fff;border-radius:8px;padding:1px 7px;white-space:nowrap;}';
  (document.head || document.documentElement).appendChild(css);

  function isActive(b) {
    try {
      var c = getComputedStyle(b).backgroundColor || '';
      var m = c.match(/\d+(\.\d+)?/g); if (!m) return false;
      var r = +m[0], g = +m[1], bl = +m[2], a = m.length > 3 ? +m[3] : 1;
      if (a < 0.2) return false;                          // transparent
      if (r > 235 && g > 235 && bl > 235) return false;   // white / off-white
      if (Math.abs(r - g) < 12 && Math.abs(g - bl) < 12 && r > 140) return false; // greys (#aaa, #ccc)
      return true;
    } catch (e) { return false; }
  }
  function bg(b) { try { return getComputedStyle(b).backgroundColor; } catch (e) { return '#555'; } }
  function label(b) { return (b.textContent || '').replace(/\s+/g, ' ').trim(); }
  function matches(b, sels) { return (sels || []).some(function (s) { try { return b.matches(s); } catch (e) { return false; } }); }

  function rowButtons(row, t) {
    return Array.prototype.filter.call(row.children, function (c) {
      return c.tagName === 'BUTTON' && !matches(c, t.keep);
    });
  }

  function badges(row, t) {
    var hold = row.querySelector(':scope > .xopt-holder'); if (!hold) return;
    var bs = rowButtons(row, t).filter(function (b) { return b.style.display !== 'none' && !matches(b, t.noBadge) && isActive(b); });
    var box = hold.querySelector('.xopt-badges');
    var html = bs.slice(0, 4).map(function (b) { return '<span class="xopt-badge" style="background:' + bg(b) + ';">' + label(b) + '</span>'; }).join('');
    if (box.innerHTML !== html) box.innerHTML = html;
  }

  function apply() {
    TARGETS.forEach(function (t) {
      var as = document.querySelectorAll(t.anchor);
      Array.prototype.forEach.call(as, function (a) {
        var row = a.parentElement; if (!row) return;
        rowButtons(row, t).forEach(function (b) { if (!b.classList.contains('xopt-h')) b.classList.add('xopt-h'); });
        var hold = row.querySelector(':scope > .xopt-holder');
        if (!hold) {
          hold = document.createElement('span');
          hold.className = 'xopt-holder';
          var mid = 'xopt-m-' + t.id + '-' + Math.random().toString(36).slice(2, 7);
          hold.innerHTML = '<span class="xopt-badges" style="display:inline-flex;gap:3px;flex-wrap:wrap;"></span>' +
            '<button type="button" class="xopt-btn" title="' + t.title + '" style="background:#fff;border:1px solid #2e7d32;color:#2e7d32;border-radius:6px;padding:2px 10px;font-size:18px;line-height:1.2;cursor:pointer;">☰</button>' +
            '<div id="' + mid + '" class="fs-hm" style="display:none;position:absolute;right:0;top:110%;z-index:60;background:#fff;border:1px solid #a5d6a7;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);min-width:220px;max-width:86vw;overflow:hidden;text-align:left;"></div>';
          var keepEl = Array.prototype.find.call(row.children, function (c) { return matches(c, t.keep); });
          if (keepEl) row.insertBefore(hold, keepEl); else row.appendChild(hold);
          hold.querySelector('.xopt-btn').addEventListener('click', function (ev) {
            ev.stopPropagation();
            var menu = document.getElementById(mid); if (!menu) return;
            var open = menu.style.display === 'none';
            if (window.fsHMClose) window.fsHMClose();
            if (!open) return;
            menu.innerHTML = '<div style="padding:6px 10px;font-size:11px;font-weight:bold;color:#2e7d32;background:#f1f8e9;border-bottom:1px solid #e0e0e0;">' + t.title + '</div>';
            rowButtons(row, t).forEach(function (b) {
              if (b.style.display === 'none') return;          // not available right now
              var it = document.createElement('button');
              it.type = 'button';
              it.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid #f0f0f0;padding:9px 10px;font-size:13px;cursor:pointer;color:#222;';
              var on = isActive(b) && !matches(b, t.noBadge);
              it.innerHTML = '<span style="width:10px;height:10px;border-radius:50%;flex:0 0 10px;background:' + (on ? bg(b) : 'transparent') + ';border:1px solid ' + (on ? bg(b) : '#ccc') + ';"></span><span>' + label(b) + '</span>';
              it.title = b.title || '';
              it.addEventListener('click', function (e2) {
                e2.stopPropagation();
                menu.style.display = 'none';
                b.click();
                setTimeout(function () { try { apply(); badges(row, t); } catch (e) {} }, 120);
              });
              menu.appendChild(it);
            });
            menu.style.left = ''; menu.style.right = '0';
            menu.style.display = 'block';
            try {   // keep the list on screen (rows centred or on the left)
              var r = menu.getBoundingClientRect();
              if (r.left < 4) { menu.style.right = 'auto'; menu.style.left = '0'; }
              r = menu.getBoundingClientRect();
              if (r.right > window.innerWidth - 4) { menu.style.left = 'auto'; menu.style.right = '0'; }
            } catch (e) {}
          });
        }
        badges(row, t);
      });
    });
  }

  var timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { try { apply(); } catch (e) {} }, 150); }
  function start() {
    apply();
    try { new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    // restyles without DOM changes (mode buttons) → keep badges fresh on any tap
    document.addEventListener('click', function () { setTimeout(schedule, 200); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.XKDGOptMenus = { apply: apply, TARGETS: TARGETS };
})();

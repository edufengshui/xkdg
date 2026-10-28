// ═══════════════════════════════════════════════════════════════
//  ☰ Section menus (session 33, Edu: "il bottone con le tre righe deve stare
//  sempre a destra e ospitare quante più funzioni possibili, anche con
//  sotto-menu").
//
//  ONE ☰ per section, always at the right end of the section's header. It
//  collects the section's buttons, grouped in sub-menus (tap a group to open it).
//  A thin façade, like the luopan ☰ (session 26): the original buttons STAY in
//  the DOM, only hidden, so every module that drives / restyles / relabels them
//  keeps working. Tapping an entry clicks the original button. A dot marks the
//  options that are ON. Rows left empty are hidden. Sections rebuilt by
//  innerHTML are picked up again by a MutationObserver.
// ═══════════════════════════════════════════════════════════════
(function () {
  // header: selector of the element that receives the ☰ (its right end)
  //         or headerOf: selector of a button whose PARENT is the header
  // groups: [{ label, items: [selectors] }] — one group = no sub-menu
  // badges: show the active options as small badges left of the ☰
  var SECTIONS = [
    { id: 'house', headerOf: '[onclick="fsAddNewHouse()"]', title: '🏠 House Profiles', groups: [
        { label: null, items: ['[onclick="fsAddNewHouse()"]'] },
        { label: '💾 Data', items: ['[onclick="fsExportBackup()"]', '[onclick*="fs-restore-input"]', '[onclick="fsHouseDB()"]'] },
        { label: '📧 Daily email', items: ['[onclick*="XKDGDigestSetup"]'] } ] },
    { id: 'stars', header: '#fs-flying-stars-block > div:first-child', title: '⭐ Flying Stars', groups: [
        { label: null, items: ['#fs-save-house-top'] },
        { label: '⭐ Chart', toggles: true, items: ['#fs-stars-toggle', '#fs-manual-toggle', '#fs-replacement-toggle', '#fs-flying-stars-block [onclick*="FSChartFinder"]'] } ] },
    { id: 'door', headerOf: '#fs-period-btn', title: '🚪 Door facing & water', groups: [
        { label: '🔎 Dates', items: ['[onclick="fsFindDates()"]', '[onclick="fsFindDates()"] ~ .fs-recall-fs-btn'] },
        { label: '📍 Facing & water', items: ['[onclick="fsFacingFromMap(\'fs-facing\')"]', '[onclick="fsSuggestWater()"]'] },
        { label: '⚙ Period & filters', toggles: true, items: ['#fs-period-btn', '#fs-filter-pyy-btn', '#fs-filter-adj-btn'] } ] },
    // session 34: same ☰ style for the Bed and Desk sections (header = the panel title)
    { id: 'bed', header: '#fs-bed-panel > div > div:first-child', title: '🛏 Bed', groups: [
        { label: '🔎 Dates', items: ['[onclick="fsBedScan()"]', '[onclick="fsBedScan()"] ~ .fs-recall-fs-btn'] } ] },
    { id: 'desk', header: '#fs-desk-panel > div > div:first-child', title: '🪑 Desk', groups: [
        { label: '🔎 Dates', items: ['[onclick="fsDeskScan()"]', '[onclick="fsDeskScan()"] ~ .fs-recall-fs-btn'] } ] },
    { id: 'zoneset', headerOf: '[onclick="fsSaveZoneSetting()"]', title: '💾 Settings', groups: [
        { label: null, items: ['[onclick="fsSaveZoneSetting()"]'] } ] },
    { id: 'list', headerOf: '[onclick="toggleListAll()"]', title: 'List options', badges: true, groups: [
        { label: null, toggles: true, items: ['[onclick="toggleListAll()"]', '[onclick="toggleListSort()"]', '[onclick="toggleListOnlyXKDG()"]', '[onclick^="toggleFsHouse();buildMonthView"]'] } ] },
    { id: 'best', headerOf: '[onclick="toggleBestOnlyXKDG()"]', title: 'Sort & filter', badges: true, groups: [
        { label: null, toggles: true, items: ['[onclick="toggleDirChrono()"]', '[onclick="toggleScanSortMode()"]', '[onclick="toggleBestOnlyXKDG()"]', '[onclick*="toggleFsHouse"]'] } ] }
  ];

  var css = document.createElement('style');
  css.textContent = '.xopt-h{display:none!important}' +
    '.xopt-holder{position:relative;display:inline-flex;align-items:center;gap:4px;margin-left:auto;flex:0 0 auto;}' +
    '.xopt-badge{font-size:10px;font-weight:bold;color:#fff;border-radius:8px;padding:1px 7px;white-space:nowrap;}' +
    // the luopan view row lives in the luopan's own ☰ now
    '#fs-mode-fs, #fs-mode-xkdg, #fs-mode-both, #fs-mode-floorplan, #fs-hexfilter-btn{display:none!important}' +
    '#fs-mode-fs ~ span{display:none!important}';
  (document.head || document.documentElement).appendChild(css);

  function isActive(b) {
    try {
      var t = (b.textContent || '');
      if (/^\s*✓/.test(t) || /\bON\b/.test(t)) return true;
      if (/\bOff\b|\bOFF\b/.test(t)) return false;
      var c = getComputedStyle(b).backgroundColor || '';
      var m = c.match(/\d+(\.\d+)?/g); if (!m) return false;
      var r = +m[0], g = +m[1], bl = +m[2], a = m.length > 3 ? +m[3] : 1;
      if (a < 0.2) return false;
      if (r > 235 && g > 235 && bl > 235) return false;
      if (Math.abs(r - g) < 12 && Math.abs(g - bl) < 12 && r > 140) return false;
      return true;
    } catch (e) { return false; }
  }
  function bg(b) { try { return getComputedStyle(b).backgroundColor; } catch (e) { return '#555'; } }
  function label(b) { return (b.textContent || '').replace(/\s+/g, ' ').trim(); }
  function q(scope, sel) { try { return Array.prototype.slice.call(scope.querySelectorAll(sel)); } catch (e) { return []; } }

  // buttons of a section (resolved inside the section root when given)
  function itemsOf(s, root) {
    return s.groups.map(function (g) {
      var bs = [];
      g.items.forEach(function (sel) { q(root || document, sel).forEach(function (b) { if (bs.indexOf(b) < 0) bs.push(b); }); });
      return { label: g.label, toggles: !!g.toggles, buttons: bs };
    });
  }
  function available(b) { return b.style.display !== 'none' && !b.disabled; }

  // hide rows that only held hidden buttons
  function hideEmptyParents(b, header) {
    var p = b.parentElement;
    for (var i = 0; i < 2 && p && p !== header && !p.contains(header); i++) {
      var vis = Array.prototype.some.call(p.children, function (c) {
        if (c.classList.contains('xopt-h') || c.tagName === 'INPUT' && c.type === 'file') return false;
        if (c.tagName === 'SPAN' && !c.textContent.trim()) return false;
        return c.style.display !== 'none';
      });
      if (vis) return;
      p.classList.add('xopt-h');
      p = p.parentElement;
    }
  }

  var openGroup = {};
  function buildMenu(menu, s, root) {
    var groups = itemsOf(s, root).filter(function (g) { return g.buttons.some(available); });
    menu.innerHTML = '<div style="padding:6px 10px;font-size:11px;font-weight:bold;color:#2e7d32;background:#f1f8e9;border-bottom:1px solid #e0e0e0;">' + s.title + '</div>';
    var multi = groups.filter(function (g) { return g.label; }).length > 1;
    groups.forEach(function (g, gi) {
      var holder = menu;
      if (g.label && multi) {
        var key = s.id + ':' + gi;
        var hd = document.createElement('button');
        hd.type = 'button';
        var isOpen = !!openGroup[key];
        hd.style.cssText = 'display:flex;align-items:center;width:100%;text-align:left;background:#fafafa;border:none;border-bottom:1px solid #eee;padding:9px 10px;font-size:13px;font-weight:bold;cursor:pointer;color:#333;';
        hd.innerHTML = '<span style="flex:1;">' + g.label + '</span><span style="color:#888;">' + (isOpen ? '▾' : '▸') + '</span>';
        hd.addEventListener('click', function (e) { e.stopPropagation(); openGroup[key] = !openGroup[key]; buildMenu(menu, s, root); });
        menu.appendChild(hd);
        if (!isOpen) return;
        holder = document.createElement('div');
        holder.style.cssText = 'background:#fff;border-left:3px solid #a5d6a7;';
        menu.appendChild(holder);
      } else if (g.label) {
        var lb = document.createElement('div');
        lb.style.cssText = 'padding:5px 10px 2px;font-size:10px;font-weight:bold;color:#888;';
        lb.textContent = g.label;
        menu.appendChild(lb);
      }
      g.buttons.filter(available).forEach(function (b) {
        var it = document.createElement('button');
        it.type = 'button';
        it.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid #f0f0f0;padding:9px 10px;font-size:13px;cursor:pointer;color:#222;';
        var on = g.toggles && isActive(b);
        it.innerHTML = (g.toggles ? '<span style="width:10px;height:10px;border-radius:50%;flex:0 0 10px;background:' + (on ? bg(b) : 'transparent') + ';border:1px solid ' + (on ? bg(b) : '#ccc') + ';"></span>' : '') + '<span>' + label(b) + '</span>';
        it.title = b.title || '';
        it.addEventListener('click', function (e2) {
          e2.stopPropagation();
          menu.style.display = 'none';
          b.click();
          setTimeout(schedule, 150);
        });
        holder.appendChild(it);
      });
    });
  }

  function apply() {
    SECTIONS.forEach(function (s) {
      var headers = s.header ? q(document, s.header) : q(document, s.headerOf).map(function (b) { return b.parentElement; });
      headers.forEach(function (header) {
        if (!header) return;
        var root = header.parentElement || document;
        // a section's buttons may sit anywhere in the section block
        if (s.id === 'stars') root = document.getElementById('fs-flying-stars-block') || root;
        if (s.id === 'door') root = document.getElementById('fs-generic-tools') || document.getElementById('fengshui-view') || root;
        if (s.id === 'house') root = header.parentElement || root;
        var all = [];
        itemsOf(s, root).forEach(function (g) { all = all.concat(g.buttons); });
        all.forEach(function (b) { if (!b.classList.contains('xopt-h')) b.classList.add('xopt-h'); });
        all.forEach(function (b) { hideEmptyParents(b, header); });
        var hold = header.querySelector(':scope > .xopt-holder');
        if (!hold) {
          if (getComputedStyle(header).display !== 'flex') { header.style.display = 'flex'; header.style.alignItems = 'center'; header.style.gap = header.style.gap || '6px'; }
          header.style.flexWrap = 'nowrap';
          hold = document.createElement('span');
          hold.className = 'xopt-holder';
          var mid = 'xopt-m-' + s.id + '-' + Math.random().toString(36).slice(2, 7);
          hold.innerHTML = '<span class="xopt-badges" style="display:inline-flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;"></span>' +
            '<button type="button" class="xopt-btn" title="' + s.title + '" style="background:#fff;border:1px solid #2e7d32;color:#2e7d32;border-radius:6px;padding:2px 10px;font-size:18px;line-height:1.2;cursor:pointer;">☰</button>' +
            '<div id="' + mid + '" class="fs-hm" style="display:none;position:absolute;right:0;top:110%;z-index:60;background:#fff;border:1px solid #a5d6a7;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);min-width:230px;max-width:86vw;max-height:70vh;overflow:auto;text-align:left;font-weight:normal;font-style:normal;"></div>';
          header.appendChild(hold);
          hold.querySelector('.xopt-btn').addEventListener('click', function (ev) {
            ev.stopPropagation();
            var menu = document.getElementById(mid); if (!menu) return;
            var open = menu.style.display === 'none';
            if (window.fsHMClose) window.fsHMClose();
            if (!open) return;
            buildMenu(menu, s, root);
            menu.style.display = 'block';
          });
        } else if (hold !== header.lastElementChild) {
          header.appendChild(hold);      // keep the ☰ the LAST thing on the right
        }
        if (s.badges) {
          var box = hold.querySelector('.xopt-badges');
          var html = all.filter(function (b) { return available(b) && isActive(b); }).slice(0, 4)
            .map(function (b) { return '<span class="xopt-badge" style="background:' + bg(b) + ';">' + label(b) + '</span>'; }).join('');
          if (box.innerHTML !== html) box.innerHTML = html;
        }
      });
    });
  }

  var timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { try { apply(); } catch (e) {} }, 150); }
  function start() {
    apply();
    try { new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    document.addEventListener('click', function () { setTimeout(schedule, 200); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.XKDGOptMenus = { apply: apply, SECTIONS: SECTIONS };
})();

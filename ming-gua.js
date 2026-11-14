// ═══════════════════════════════════════════════════════════════
//  命卦 MING GUA (session 50, Edu)
//
//  A Feng Shui datum (Eight Mansions), NOT part of XKDG: it never enters the
//  XKDG analysis, scores, cures or date selection.
//  Year = the solar year of the YEAR pillar (立春 → 立春), as the pillars.
//  Male:   (11 - Y mod 9) mod 9, 0 → 9.   Female: (Y mod 9 + 4) mod 9, 0 → 9.
//  5 in the centre: male → 2 Kun, female → 8 Gen.
//  Shown:
//   1. House Profiles → the 👥 people of each house: one folded line.
//   2. Person A / B panels: a folded "命卦 Ming Gua" line under the pillars (open on request;
//      the open / closed state is remembered on the device).
//  Gender: the same one chosen for the Luck pillars (xkdgGenderGet / xkdgGenderSet, by name).
//  Needs a birth DATE: a year-only person has no Ming Gua (the JiaZi repeats every 60 years).
// ═══════════════════════════════════════════════════════════════
(function () {
  var STEMS = '甲乙丙丁戊己庚辛壬癸', BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
  var GUA = { 1: ['Kan', '☵'], 2: ['Kun', '☷'], 3: ['Zhen', '☳'], 4: ['Xun', '☴'], 6: ['Qian', '☰'], 7: ['Dui', '☱'], 8: ['Gen', '☶'], 9: ['Li', '☲'] };
  var EAST = { 1: 1, 3: 1, 4: 1, 9: 1 };
  var NAMES = [['Sheng Qi', '生氣'], ['Tian Yi', '天醫'], ['Yan Nian', '延年'], ['Fu Wei', '伏位'],
               ['Huo Hai', '禍害'], ['Wu Gui', '五鬼'], ['Liu Sha', '六煞'], ['Jue Ming', '絕命']];
  // per gua: Sheng Qi, Tian Yi, Yan Nian, Fu Wei | Huo Hai, Wu Gui, Liu Sha, Jue Ming
  var DIRS = {
    1: ['SE', 'E', 'S', 'N', 'W', 'NE', 'NW', 'SW'],
    2: ['NE', 'W', 'NW', 'SW', 'E', 'SE', 'S', 'N'],
    3: ['S', 'N', 'SE', 'E', 'SW', 'NW', 'NE', 'W'],
    4: ['N', 'S', 'E', 'SE', 'NW', 'SW', 'W', 'NE'],
    6: ['W', 'NE', 'SW', 'NW', 'SE', 'E', 'N', 'S'],
    7: ['NW', 'SW', 'NE', 'W', 'N', 'S', 'SE', 'E'],
    8: ['SW', 'NW', 'W', 'NE', 'S', 'N', 'E', 'SE'],
    9: ['E', 'SE', 'N', 'S', 'NE', 'W', 'SW', 'NW']
  };
  var OPEN_KEY = 'xkdgMingGuaOpen';
  try {
    var css = document.createElement('style');
    css.textContent = '.mg-d>summary::-webkit-details-marker{display:none}.mg-d .mg-s::after{content:"\\25B8 show"}.mg-d[open] .mg-s::after{content:"\\25BE hide"}';
    (document.head || document.documentElement).appendChild(css);
  } catch (e) {}

  function gzIndex(stem, branch) {
    var s = STEMS.indexOf(stem), b = BRANCHES.indexOf(branch);
    if (s < 0 || b < 0) return -1;
    for (var i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i;
    return -1;
  }
  // solar year of the year pillar: the calendar year of the birth, or the one before (birth before 立春)
  function solarYear(calY, yearPillar) {
    var gi = yearPillar ? gzIndex(yearPillar.stem, yearPillar.branch) : -1;
    if (gi < 0) return calY;
    for (var y = calY + 1; y >= calY - 1; y--) if ((((y - 4) % 60) + 60) % 60 === gi) return y;
    return calY;
  }
  function mingGua(Y, gender) {
    var m = ((Y % 9) + 9) % 9, n;
    if (gender === 'M') { n = (11 - m) % 9; if (n === 0) n = 9; if (n === 5) n = 2; }
    else if (gender === 'F') { n = (m + 4) % 9; if (n === 0) n = 9; if (n === 5) n = 8; }
    else return null;
    var d = DIRS[n];
    return { gua: n, name: GUA[n][0], sym: GUA[n][1], group: EAST[n] ? 'East' : 'West', year: Y,
             good: [0, 1, 2, 3].map(function (i) { return { name: NAMES[i][0], zh: NAMES[i][1], dir: d[i] }; }),
             bad: [4, 5, 6, 7].map(function (i) { return { name: NAMES[i][0], zh: NAMES[i][1], dir: d[i] }; }) };
  }
  function gGet(name) { try { return (typeof xkdgGenderGet === 'function') ? xkdgGenderGet(name) : ''; } catch (e) { return ''; } }
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
  function escH(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function genderSel(name) {
    return '<select onchange="xkdgMingGuaGender(\'' + esc(name) + '\',this.value)" style="font-size:11px;">'
         + '<option value="" selected>gender?</option><option value="M">male</option><option value="F">female</option></select>';
  }
  function dirsHtml(g) {
    var row = function (x, good) { return '<span style="white-space:nowrap;margin-right:6px;color:' + (good ? '#1b5e20' : '#b71c1c') + ';">' + x.name + ' ' + x.zh + ' <b>' + x.dir + '</b></span>'; };
    return '<div>' + g.good.map(function (x) { return row(x, true); }).join(' ') + '</div>'
         + '<div>' + g.bad.map(function (x) { return row(x, false); }).join(' ') + '</div>';
  }

  // ── a saved person (House Profiles): { status:'ok', g } | { status:'gender' } | null (no date) ──
  function ofSaved(name) {
    var rec = null;
    try { var a = loadArchive('xkdg_persons_a') || {}, b = loadArchive('xkdg_persons_b') || {}; rec = a[name] || b[name]; } catch (e) {}
    if (!rec || !/^\d{4}-\d{2}-\d{2}/.test(rec.date || '') || rec.depth === 1) return null;
    var yp = null; try { yp = (typeof _fsResolvePersonYear === 'function') ? _fsResolvePersonYear(name) : null; } catch (e) {}
    var gender = gGet(name);
    if (gender !== 'M' && gender !== 'F') return { status: 'gender' };
    return { status: 'ok', g: mingGua(solarYear(parseInt(rec.date.slice(0, 4), 10), yp), gender) };
  }
  // one folded line for the people of a house (names in order, duplicates and unknown skipped)
  function houseHtml(names) {
    var seen = {}, rows = [];
    (names || []).forEach(function (n) {
      if (!n || seen[n]) return; seen[n] = 1;
      var r = ofSaved(n); if (r) rows.push({ name: n, r: r });
    });
    if (!rows.length) return '';
    var sum = rows.map(function (x) { return escH(x.name) + ' ' + (x.r.status === 'ok' ? '<b>' + x.r.g.gua + '</b>' + (x.r.g.group === 'East' ? ' E' : ' W') : '?'); }).join(' · ');
    var body = rows.map(function (x) {
      if (x.r.status !== 'ok') return '<div style="margin-top:3px;">' + escH(x.name) + ': ' + genderSel(x.name) + '</div>';
      var g = x.r.g;
      return '<div style="margin-top:3px;"><b>' + escH(x.name) + ' — ' + g.gua + ' ' + g.name + ' ' + g.sym + '</b> · ' + g.group + ' group' + dirsHtml(g) + '</div>';
    }).join('');
    return '<details style="font-size:11px;color:#4e342e;margin-top:3px;"><summary style="cursor:pointer;">命卦 Ming Gua: ' + sum + '</summary>' + body + '</details>';
  }

  // ── Person A / B panels ──
  function panelHtml(who) {
    var isB = who === 'B';
    var P = null; try { P = isB ? _personBPillars : _personAPillars; } catch (e) {}
    var bd = (document.getElementById(isB ? 'person-date-b' : 'person-date') || {}).value || '';
    var depth = (document.getElementById(isB ? 'person-pillars-b' : 'person-pillars-a') || {}).value;
    if (!P || !P.year || !/^\d{4}-\d{2}-\d{2}/.test(bd) || depth === '1') return '';
    var name = ((document.getElementById(isB ? 'person-name-b' : 'person-name') || {}).value || '').trim() || (isB ? 'Person B' : 'Person A');
    var gender = gGet(name), open = false;
    try { open = localStorage.getItem(OPEN_KEY) === '1'; } catch (e) {}
    var st = 'font-size:12px;color:#4e342e;margin:2px 10px;';
    if (gender !== 'M' && gender !== 'F') return '<div style="' + st + '">命卦 Ming Gua ' + genderSel(name) + '</div>';
    var g = mingGua(solarYear(parseInt(bd.slice(0, 4), 10), P.year), gender);
    // only the number; the eight directions behind a small "▸ show" (Edu)
    return '<details class="mg-d"' + (open ? ' open' : '') + ' ontoggle="try{localStorage.setItem(\'' + OPEN_KEY + '\',this.open?\'1\':\'0\')}catch(e){}" style="' + st + '">'
         + '<summary style="cursor:pointer;list-style:none;">命卦 Ming Gua <b>' + g.gua + ' ' + g.name + ' ' + g.sym + '</b> '
         + '<span class="mg-s" style="font-size:10px;color:#8d6e63;"></span></summary>' + dirsHtml(g) + '</details>';
  }
  function renderPanel(who) {
    var isB = who === 'B', id = isB ? 'mg-panel-b' : 'mg-panel-a';
    var el = document.getElementById(id);
    if (!el) {
      var anchor = document.getElementById(isB ? 'pillar-toggle-b-wrap' : 'pillar-toggle-a-wrap');
      if (!anchor || !anchor.parentNode) return;
      el = document.createElement('div'); el.id = id;
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
    }
    try { el.innerHTML = panelHtml(who); } catch (e) { el.innerHTML = ''; }
  }
  function renderPanels() { renderPanel('A'); renderPanel('B'); }

  // refresh after CALCULATE / a person recalled from the archive
  function hook() {
    if (typeof window.calculatePerson !== 'function' || window.calculatePerson._mg) return;
    var orig = window.calculatePerson;
    var w = function (person) {
      var r = orig.apply(this, arguments);
      try { renderPanel(String(person).toUpperCase() === 'B' ? 'B' : 'A'); } catch (e) {}
      return r;
    };
    w._mg = true;
    window.calculatePerson = w;
  }
  hook();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook);

  window.xkdgMingGuaGender = function (name, v) {
    try { if (typeof xkdgGenderSet === 'function') xkdgGenderSet(name, v); } catch (e) {}
    try { renderPanels(); } catch (e) {}
    try { if (typeof fsRenderHouseProfiles === 'function') fsRenderHouseProfiles(); } catch (e) {}
  };
  window.xkdgMingGua = mingGua;
  window.xkdgMingGuaSolarYear = solarYear;
  window.xkdgMingGuaHouseHtml = houseHtml;
  window.xkdgMingGuaRenderPanels = renderPanels;
})();

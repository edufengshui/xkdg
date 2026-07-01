/* directions-charts.js — Directions > Divinations & Birth charts
 *
 * Two sections that share ONE implementation (only the archive + birth-source
 * differ). Each shows a date+time selector, draws the ROTATING (转盘) QMDJ
 * hourly chart (8 deities, Tai-Yi card style) via
 * window.QMDJWaterScanner.getRotatingHourChart, offers a strategy/notes box,
 * saves chart-params + notes to a per-section archive under a name, and hands
 * the strategy to the existing AI assistant.
 *
 * Depends on: window.QMDJWaterScanner (qmdj-water-scanner.js) and the
 * lunar-javascript Solar/Lunar globals (already loaded by the app).
 * Public API: window.DirectionsCharts.openDivinations() / openBirthCharts()
 */
(function () {
  'use strict';

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  // ── Display maps (mirror the Tai-Yi rotating card) ──
  var DEITY_CN = { Commander: '值符', Snake: '螣蛇', Yin: '太陰', Harmonies: '六合', Tiger: '白虎', Warrior: '玄武', Earth: '九地', Heaven: '九天' };
  var STAR_CN = { Grass: '天蓬', Rice: '天芮', Aggressor: '天沖', Assistant: '天輔', Fowl: '天禽', Heart: '天心', Pillar: '天柱', Official: '天任', Hero: '天英' };
  var DOOR_CN = { Open: '開', Rest: '休', Birth: '生', Injury: '傷', Delusion: '杜', View: '景', Death: '死', Shocking: '驚' };
  var DOOR_EN_FROM_KEY = { Kai: 'Open', Xiu: 'Rest', Sheng: 'Birth', Shang: 'Injury', Du: 'Delusion', JingS: 'View', Si: 'Death', JingF: 'Shocking' };
  var STEM5 = { '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water' };
  var PCJK = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兌', 8: '艮', 9: '離', 5: '中' };
  var PINYIN = { 1: 'Kǎn', 2: 'Kūn', 3: 'Zhèn', 4: 'Xùn', 6: 'Qián', 7: 'Duì', 8: 'Gèn', 9: 'Lí', 5: 'Zhōng' };
  var PDIR = { 4: 'SE', 9: 'S', 2: 'SW', 3: 'E', 5: '·', 7: 'W', 8: 'NE', 1: 'N', 6: 'NW' };
  var PBR = { 4: '辰巳', 9: '午', 2: '未申', 3: '卯', 5: '', 7: '酉', 8: '丑寅', 1: '子', 6: '戌亥' };
  var LUOSHU = [4, 9, 2, 3, 5, 7, 8, 1, 6]; // SE S SW / E C W / NE N NW (South at top)
  var H2P = { '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu', '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui' };
  var BR_H2P = { '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si', '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai' };

  function getEngine() {
    return (typeof window !== 'undefined' && window.QMDJWaterScanner) ? window.QMDJWaterScanner : null;
  }
  function getSolar() {
    try { if (typeof Solar !== 'undefined' && Solar) return Solar; } catch (e) {}
    return (typeof window !== 'undefined' && window.Solar) ? window.Solar : null;
  }

  // Hour pillar (stem+branch, pinyin) + the TST calendar date, in LOCAL TRUE SOLAR TIME.
  // House rule (Edu): EVERYTHING is decided in True Solar Time — day rollover, the 子 boundary,
  // the Jú and the Jie Qi. So we also return the TST calendar date (tstY/tstMo/tstD); the caller
  // MUST pass that TST date (not the civil pick) to the engine, otherwise Jú/元/dun are read from
  // the wrong day near TST midnight.
  // If longitude is unknown (no GPS), TST cannot be computed → we do NOT fall back to civil time;
  // we return { noTST:true } so the caller blocks and warns.
  function hourPillar(y, m, d, H, Min) {
    var S = getSolar(); if (!S) return null;
    try {
      var lt = (typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.currentLonTz() : null;
      if (!lt || !isFinite(lt.lonDeg) || typeof XKDGSolarTime.hourPillarFromCivil !== 'function') {
        return { noTST: true };
      }
      var hp = XKDGSolarTime.hourPillarFromCivil(y, m, d, H, Min, 0, lt.lonDeg, lt.tzOffsetMin);
      if (!hp || !hp.tst) return { noTST: true };
      return {
        stem: H2P[hp.gan] || hp.gan, branch: BR_H2P[hp.zhi] || hp.zhi,
        stemCN: hp.gan, brCN: hp.zhi,
        tstY: hp.tst.y, tstMo: hp.tst.mo, tstD: hp.tst.d, tst: true,
        bj: hp.bj  // Beijing-naive instant, for INSTANT-level Jie Qi in the engine
      };
    } catch (e) { return null; }
  }

  // ── Styles (injected once; dc- prefixed to avoid clashes) ──
  function ensureStyles() {
    if (document.getElementById('dc-styles')) return;
    var css =
      '.dc-board-frame{background:#2f8b5a;border-radius:10px;padding:30px 26px;position:relative;aspect-ratio:1;box-shadow:0 14px 40px -22px rgba(0,0,0,.6)}' +
      '.dc-board{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:6px}' +
      '.dc-dir{position:absolute;color:#cfe6d8;font-size:11px;letter-spacing:.12em;font-weight:600}' +
      '.dc-dir.cjk{font-size:13px;opacity:.9;font-weight:400}' +
      '.dc-pal{background:#fbf8f1;border-radius:6px;padding:7px 8px;position:relative;overflow:hidden;display:grid;grid-template-rows:auto 1fr auto;font-family:Georgia,serif;color:#2b2620}' +
      '.dc-pal.fu{box-shadow:inset 0 0 0 2px #a9863f}' +
      '.dc-r1{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:2px}' +
      '.dc-hstem{font-size:20px;line-height:1;font-weight:600;justify-self:start}' +
      '.dc-deity{text-align:center;padding:0 2px;min-width:0}' +
      '.dc-deity .en{font-size:11px;font-weight:600;color:#2b2620;line-height:1.1}' +
      '.dc-deity .cn{font-size:10px;color:#6a6052}' +
      '.dc-deity.fu .en{font-weight:800;color:#b5432f}.dc-deity.fu .cn{font-weight:700;color:#b5432f}' +
      '.dc-star{font-style:italic;font-size:10.5px;color:#6a6052;text-align:right;line-height:1.1;justify-self:end;min-width:0}' +
      '.dc-star .cn{font-style:normal;display:block;font-size:9px;opacity:.7}' +
      '.dc-door{text-align:center;align-self:center}' +
      '.dc-door .en{font-size:18px;letter-spacing:.03em;color:#2b2620}' +
      '.dc-door .cn{font-size:10.5px;color:#6a6052}' +
      '.dc-door.zs .en{font-weight:700;color:#236b45}.dc-door.zs .cn{font-weight:900;color:#236b45}' +
      '.dc-r3{display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:2px}' +
      '.dc-estem{font-size:20px;line-height:1;font-weight:600;justify-self:start}' +
      '.dc-palabel{text-align:center;align-self:end;font-size:8.5px;letter-spacing:.04em;color:#6a6052;line-height:1.2}' +
      '.dc-palabel .cjk{color:#236b45}.dc-palabel .br{display:block;font-size:8px;opacity:.8}' +
      '.dc-zb{width:22px;height:22px;border-radius:50%;border:1.6px solid #7d6024;display:flex;align-items:center;justify-content:center;font-size:12px}' +
      '.dc-zb1,.dc-zb6,.dc-zb8{border-color:#8a93a0;color:#8a93a0}.dc-zb2{border-color:#3a3a44;color:#3a3a44}.dc-zb3{border-color:#2c8f86;color:#2c8f86}' +
      '.dc-zb4{border-color:#3f8f4a;color:#3f8f4a}.dc-zb5{border-color:#bd8b2a;color:#bd8b2a}.dc-zb7{border-color:#c0392b;color:#c0392b}.dc-zb9{border-color:#7b54a8;color:#7b54a8}' +
      '.dc-center-pal .dc-deity,.dc-center-pal .dc-door{opacity:.5}' +
      '.dc-wood{color:#3f8f4a}.dc-fire{color:#c0392b}.dc-earth{color:#bd8b2a}.dc-metal{color:#7d8893}.dc-water{color:#2f6da8}' +
      '.dc-head{text-align:center;color:#236b45;font-size:13px;margin:0 0 8px;font-family:Georgia,serif}' +
      '.dc-head b{color:#b5432f}' +
      '@media (max-width:600px){' +
      '.dc-board-frame{padding:12px 10px}' +
      '.dc-board{gap:4px}' +
      '.dc-pal{padding:5px 5px}' +
      '.dc-r1{grid-template-columns:minmax(0,0.8fr) minmax(0,1.5fr) minmax(0,1.15fr)}' +
      '.dc-hstem,.dc-estem{font-size:15px}' +
      '.dc-deity{padding:0 1px;overflow:hidden}.dc-deity .en{font-size:8px;line-height:1.05;overflow-wrap:anywhere}.dc-deity .cn{font-size:7.5px}' +
      '.dc-star{font-size:8px;overflow:hidden;overflow-wrap:anywhere}.dc-star .cn{font-size:7px}' +
      '.dc-door .en{font-size:13px}.dc-door .cn{font-size:8.5px}' +
      '.dc-palabel{font-size:6.5px;line-height:1.15}.dc-palabel .br{font-size:6px}' +
      '.dc-zb{width:17px;height:17px;font-size:9px}' +
      '.dc-dir{font-size:9px}.dc-dir.cjk{font-size:11px}' +
      '}';
    var st = document.createElement('style');
    st.id = 'dc-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function cellHTML(info, p) {
    var c = (info.palaces && info.palaces[p]) || {};
    var isC = (p === 5);
    var hs = c.tiH || '', es = c.diH || '';
    var fu = !!c.zhiFu, zs = !!c.zhiShi;
    var deEN = c.deity || '', deCN = DEITY_CN[deEN] || '';
    var stEN = c.star || '', stCN = STAR_CN[stEN] || '';
    var doEN = c.doorName || DOOR_EN_FROM_KEY[c.door] || '', doCN = DOOR_CN[doEN] || '';
    var palabel = '<div class="dc-palabel">' + (PDIR[p] !== '·' ? PDIR[p] + ' &middot; ' : '') +
      '<span class="cjk">' + PCJK[p] + '</span> ' + PINYIN[p] +
      (PBR[p] ? '<span class="br cjk">' + PBR[p] + '</span>' : '') + '</div>';
    return '<div class="dc-pal' + (fu ? ' fu' : '') + (isC ? ' dc-center-pal' : '') + '">' +
      '<div class="dc-r1">' +
      '<div class="dc-hstem cjk dc-' + (STEM5[hs] || '') + '">' + esc(hs) + '</div>' +
      '<div class="dc-deity' + (fu ? ' fu' : '') + '">' + (isC ? '' : ('<div class="en">' + esc(deEN) + '</div><div class="cn cjk">' + esc(deCN) + '</div>')) + '</div>' +
      '<div class="dc-star">' + esc(stEN) + '<span class="cn cjk">' + esc(stCN) + '</span></div>' +
      '</div>' +
      '<div class="dc-door' + (zs ? ' zs' : '') + '">' + (isC ? '' : ('<div class="en">' + esc(doEN.toUpperCase()) + '</div><div class="cn cjk">' + esc(doCN) + '門</div>')) + '</div>' +
      '<div class="dc-r3">' +
      '<div class="dc-estem cjk dc-' + (STEM5[es] || '') + '">' + esc(es) + '</div>' +
      palabel +
      '<div class="dc-zb dc-zb' + p + '">' + p + '</div>' +
      '</div></div>';
  }

  function boardDirsHTML() {
    return '' +
      '<span class="dc-dir" style="top:7px;left:14px">SE</span>' +
      '<span class="dc-dir cjk" style="top:7px;left:34%">巳</span>' +
      '<span class="dc-dir cjk" style="top:7px;left:50%;transform:translateX(-50%)">午</span>' +
      '<span class="dc-dir cjk" style="top:7px;right:34%">未</span>' +
      '<span class="dc-dir" style="top:7px;right:14px">SW</span>' +
      '<span class="dc-dir cjk" style="top:34%;left:7px">辰</span>' +
      '<span class="dc-dir cjk" style="top:50%;left:7px;transform:translateY(-50%)">卯</span>' +
      '<span class="dc-dir cjk" style="bottom:34%;left:7px">寅</span>' +
      '<span class="dc-dir cjk" style="top:34%;right:7px">申</span>' +
      '<span class="dc-dir cjk" style="top:50%;right:7px;transform:translateY(-50%)">酉</span>' +
      '<span class="dc-dir cjk" style="bottom:34%;right:7px">戌</span>' +
      '<span class="dc-dir" style="bottom:7px;left:14px">NE</span>' +
      '<span class="dc-dir cjk" style="bottom:7px;left:50%;transform:translateX(-50%)">子</span>' +
      '<span class="dc-dir" style="bottom:7px;right:14px">NW</span>';
  }

  // Draw the chart for a date string (YYYY-MM-DD) + time string (HH:MM) into `container`.
  // Returns a short summary object (or null) for the AI hand-off / archive label.
  function drawChartInto(container, dateStr, timeStr) {
    ensureStyles();
    var eng = getEngine();
    if (!eng || typeof eng.getRotatingHourChart !== 'function') {
      container.innerHTML = '<div style="color:#b00;font:13px sans-serif;padding:14px;">The QMDJ engine is not available on this page.</div>';
      return null;
    }
    var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
    var tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr || '');
    if (!dm || !tm) { container.innerHTML = '<div style="color:#b00;font:13px sans-serif;padding:14px;">Pick a valid date and time.</div>'; return null; }
    var y = +dm[1], mo = +dm[2], d = +dm[3], H = +tm[1], Min = +tm[2];
    var hp = hourPillar(y, mo, d, H, Min);
    if (!hp) { container.innerHTML = '<div style="color:#b00;font:13px sans-serif;padding:14px;">Could not compute the hour pillar (calendar library missing?).</div>'; return null; }
    if (hp.noTST) {
      container.innerHTML = '<div style="color:#b00;font:13px sans-serif;padding:14px;line-height:1.5;">' +
        '<b>Location (longitude) is missing.</b><br>True Solar Time cannot be computed without it, so the chart is not drawn — ' +
        'civil clock time is never used. Set your GPS / longitude first, then try again.</div>';
      return null;
    }
    // TST rule: the engine reads the day, Jú, 元 and Jie Qi from the date it is given, so we pass
    // the TRUE SOLAR TIME calendar date (tstY/tstMo/tstD), not the civil pick. Near TST midnight the
    // two differ, and passing the civil date would read Jú/元 from the wrong day.
    var info;
    try { info = eng.getRotatingHourChart(hp.tstY, hp.tstMo, hp.tstD, hp.stem, hp.branch, hp.bj); } catch (e) { info = null; }
    if (!info) { container.innerHTML = '<div style="color:#b00;font:13px sans-serif;padding:14px;">No chart for this date/time.</div>'; return null; }

    var dun = info.dun === 'yang' ? 'Yang Dun' : 'Yin Dun';
    var tstNote = (hp.tstMo !== mo || hp.tstD !== d)
      ? ' <span style="color:#a4562a;">(TST day ' + hp.tstD + '/' + hp.tstMo + ')</span>' : '';
    var head = '<div class="dc-head"><b>' + dun + ' &middot; Jú ' + info.ju + '</b> &middot; ' +
      esc(dateStr) + ' ' + esc(timeStr) + tstNote + ' &middot; hour ' + esc(hp.stemCN + hp.brCN) + ' &middot; rotating pan 转盘</div>';
    var cells = ''; for (var i = 0; i < LUOSHU.length; i++) cells += cellHTML(info, LUOSHU[i]);
    container.innerHTML = head + '<div class="dc-board-frame">' + boardDirsHTML() + '<div class="dc-board">' + cells + '</div></div>';
    return { dun: info.dun, ju: info.ju, hour: hp.stemCN + hp.brCN, date: dateStr, time: timeStr };
  }

  // ── Per-section archive (localStorage) ──
  function archLoad(key) { try { return JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (e) { return []; } }
  function archSave(key, arr) { try { localStorage.setItem(key, JSON.stringify(arr)); return true; } catch (e) { return false; } }

  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nowHM() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function getVal(id) { var e = document.getElementById(id); return e ? (e.value || '') : ''; }

  // Build and open a section panel. cfg = { title, key, birth:bool }
  function openSection(cfg) {
    var existing = document.getElementById('dc-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    var ov = el('div', { id: 'dc-overlay',
      style: 'position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:14px;font-family:system-ui,Arial,sans-serif;' });
    var panel = el('div', { style: 'background:#fff;border-radius:12px;max-width:1040px;width:100%;padding:14px 16px;box-shadow:0 10px 40px rgba(0,0,0,.35);max-height:96vh;overflow:auto;' });

    var hd = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;' });
    hd.appendChild(el('div', { style: 'font-size:17px;font-weight:700;color:#236b45;' }, esc(cfg.title)));
    function closeSelf() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (cfg && typeof cfg.onClose === 'function') { try { cfg.onClose(); } catch (e) {} }
    }
    var x = el('button', { style: 'border:0;background:transparent;font-size:22px;cursor:pointer;color:#888;' }, '✕');
    x.addEventListener('click', closeSelf);
    hd.appendChild(x); panel.appendChild(hd);

    // Two columns: chart (left) + controls/strategy (right). Wraps on narrow screens.
    var cols = el('div', { style: 'display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;' });
    var leftCol = el('div', { style: 'flex:1 1 420px;min-width:300px;' });
    var rightCol = el('div', { style: 'flex:1 1 320px;min-width:280px;display:flex;flex-direction:column;gap:10px;' });

    // ---- Controls (date/time + source) ----
    var ctrl = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-bottom:10px;' });
    function fieldBlock(label, inp) {
      var w = el('label', { style: 'display:flex;flex-direction:column;gap:2px;font-size:11px;color:#555;' }, esc(label));
      w.appendChild(inp); return w;
    }
    var dateInp = el('input', { id: 'dc-date', type: 'date', value: todayISO(),
      style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    var timeInp = el('input', { id: 'dc-time', type: 'time', value: nowHM(),
      style: 'padding:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    ctrl.appendChild(fieldBlock('Date', dateInp));
    ctrl.appendChild(fieldBlock('Time', timeInp));
    var nowBtn = el('button', { type: 'button', style: 'padding:7px 12px;border:1px solid #1565c0;border-radius:6px;background:#fff;color:#1565c0;font-size:12px;font-weight:600;cursor:pointer;' }, 'Now');
    nowBtn.addEventListener('click', function () { dateInp.value = todayISO(); timeInp.value = nowHM(); });
    ctrl.appendChild(nowBtn);
    var drawBtn = el('button', { type: 'button', style: 'padding:7px 14px;border:0;border-radius:6px;background:#2f8b5a;color:#fff;font-size:13px;font-weight:700;cursor:pointer;' }, 'Draw chart');
    ctrl.appendChild(drawBtn);
    leftCol.appendChild(ctrl);

    // Birth-source row (Person A/B) — only for Birth charts
    var srcName = '';
    if (cfg.birth) {
      var srcRow = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;font-size:12px;color:#555;' });
      srcRow.appendChild(el('span', null, 'Birth date from:'));
      function personBtn(label, dId, tId, nId) {
        var b = el('button', { type: 'button', style: 'padding:5px 10px;border:1px solid #7b1fa2;border-radius:6px;background:#fff;color:#7b1fa2;font-size:12px;font-weight:600;cursor:pointer;' }, label);
        b.addEventListener('click', function () {
          var d = getVal(dId), t = getVal(tId);
          if (!d) { alert('No birth date set for ' + label + ' in the main page.'); return; }
          dateInp.value = d; if (t) timeInp.value = t;
          srcName = getVal(nId) || label;
          var ni = document.getElementById('dc-name'); if (ni && !ni.value) ni.value = srcName;
          drawBtn.click();
        });
        return b;
      }
      srcRow.appendChild(personBtn('Person A', 'person-date', 'person-time', 'person-name'));
      srcRow.appendChild(personBtn('Person B', 'person-date-b', 'person-time-b', 'person-name-b'));
      srcRow.appendChild(el('span', { style: 'color:#999;' }, '— or set the date manually above.'));
      leftCol.appendChild(srcRow);
    }

    // Chart container — cap by viewport height so the square board always fits
    var chart = el('div', { id: 'dc-chart', style: 'width:100%;max-width:min(540px,58vh);margin:0 auto;' });
    leftCol.appendChild(chart);

    var lastSummary = null;
    function redraw() { lastSummary = drawChartInto(chart, dateInp.value, timeInp.value); }
    drawBtn.addEventListener('click', redraw);

    // ---- Strategy / notes ----
    rightCol.appendChild(el('div', { style: 'font-size:13px;font-weight:700;color:#236b45;' }, 'Strategy / notes'));
    var notes = el('textarea', { id: 'dc-notes', rows: '7', placeholder: 'Write the strategy to adopt for this chart, e.g. "find a trip toward SE with the Birth door and these stems…"',
      style: 'width:100%;box-sizing:border-box;resize:vertical;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;font-family:inherit;min-height:120px;' });
    rightCol.appendChild(notes);

    // Save row (name + save)
    var saveRow = el('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;' });
    var nameInp = el('input', { id: 'dc-name', type: 'text', placeholder: 'Name (nominativo)',
      style: 'flex:1;min-width:120px;padding:7px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
    var saveBtn = el('button', { type: 'button', style: 'padding:7px 12px;border:0;border-radius:6px;background:#558b2f;color:#fff;font-size:13px;font-weight:700;cursor:pointer;' }, '💾 Save');
    saveRow.appendChild(nameInp); saveRow.appendChild(saveBtn);
    rightCol.appendChild(saveRow);

    // AI hand-off
    var aiBtn = el('button', { type: 'button', style: 'padding:9px 12px;border:0;border-radius:8px;background:#6a1b9a;color:#fff;font-size:13px;font-weight:700;cursor:pointer;' }, '💬 Send strategy to assistant');
    aiBtn.addEventListener('click', function () {
      var strat = (notes.value || '').trim();
      if (!strat) { alert('Write a strategy first.'); return; }
      var ctx = lastSummary ? ('[Chart: ' + lastSummary.dun + ' Jú ' + lastSummary.ju + ', ' + lastSummary.date + ' ' + lastSummary.time + ', hour ' + lastSummary.hour + '] ') : '';
      // Use the assistant's public API: it opens the panel, fills the input AND sends.
      if (window.XKDGChat && typeof window.XKDGChat.ask === 'function') {
        try { closeSelf(); } catch (e) {}
        try { window.XKDGChat.ask(ctx + strat); } catch (e) { alert('Could not reach the assistant: ' + (e && e.message ? e.message : e)); }
      } else {
        alert('The assistant is not available on this page.');
      }
    });
    rightCol.appendChild(aiBtn);

    // ---- Archive ----
    rightCol.appendChild(el('div', { style: 'font-size:13px;font-weight:700;color:#236b45;margin-top:4px;' }, 'Archive'));
    var archBox = el('div', { id: 'dc-archive', style: 'border:1px solid #e0e0e0;border-radius:8px;padding:8px;max-height:180px;overflow:auto;font-size:12px;' });
    rightCol.appendChild(archBox);

    function renderArchive() {
      var arr = archLoad(cfg.key);
      if (!arr.length) { archBox.innerHTML = '<div style="color:#999;font-style:italic;">No saved charts yet.</div>'; return; }
      archBox.innerHTML = '';
      arr.forEach(function (it, idx) {
        var row = el('div', { style: 'display:flex;gap:6px;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;' });
        var meta = el('div', { style: 'min-width:0;flex:1;' });
        meta.appendChild(el('div', { style: 'font-weight:600;color:#333;' }, esc(it.name || '(no name)')));
        meta.appendChild(el('div', { style: 'color:#888;font-size:11px;' }, esc((it.date || '') + ' ' + (it.time || ''))));
        row.appendChild(meta);
        var btns = el('div', { style: 'display:flex;gap:4px;flex-shrink:0;' });
        var load = el('button', { type: 'button', style: 'padding:3px 8px;border:1px solid #1565c0;border-radius:5px;background:#fff;color:#1565c0;font-size:11px;cursor:pointer;' }, 'Load');
        load.addEventListener('click', function () {
          if (it.date) dateInp.value = it.date;
          if (it.time) timeInp.value = it.time;
          nameInp.value = it.name || '';
          notes.value = it.notes || '';
          redraw();
        });
        var del = el('button', { type: 'button', style: 'padding:3px 8px;border:0;border-radius:5px;background:#c62828;color:#fff;font-size:11px;cursor:pointer;' }, '🗑');
        del.addEventListener('click', function () {
          if (!confirm('Delete "' + (it.name || '') + '"?')) return;
          var a = archLoad(cfg.key); a.splice(idx, 1); archSave(cfg.key, a); renderArchive();
        });
        btns.appendChild(load); btns.appendChild(del); row.appendChild(btns);
        archBox.appendChild(row);
      });
    }

    saveBtn.addEventListener('click', function () {
      var nm = (nameInp.value || '').trim();
      if (!nm) { alert('Enter a name (nominativo) to save under.'); nameInp.focus(); return; }
      var entry = { name: nm, date: dateInp.value, time: timeInp.value, notes: (notes.value || ''), savedAt: Date.now() };
      var arr = archLoad(cfg.key);
      var i = -1; for (var k = 0; k < arr.length; k++) if ((arr[k].name || '').toLowerCase() === nm.toLowerCase()) { i = k; break; }
      if (i >= 0) { if (!confirm('A chart named "' + nm + '" exists. Overwrite it?')) return; arr[i] = entry; }
      else arr.push(entry);
      if (archSave(cfg.key, arr)) renderArchive();
      else alert('Could not save (storage full?).');
    });

    cols.appendChild(leftCol); cols.appendChild(rightCol);
    panel.appendChild(cols);
    ov.appendChild(panel);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeSelf(); });
    document.body.appendChild(ov);

    renderArchive();
    redraw(); // draw today's chart immediately

    // Optional deep-link: open straight onto a given date/time (used by the
    // assistant's "view chart" buttons on divination search results).
    if (cfg.at && cfg.at.date) {
      try {
        dateInp.value = cfg.at.date;
        if (cfg.at.time) timeInp.value = cfg.at.time;
        redraw();
      } catch (e) {}
    }
  }

  function openDivinationsAt(date, time, onReturn) { openSection({ title: '🔮 Divinations', key: 'xkdg_dirchart_div', birth: false, at: { date: date, time: time }, onClose: (typeof onReturn === 'function' ? onReturn : null) }); }
  function openBirthChartsAt(date, time, onReturn) { openSection({ title: '🎴 Birth charts', key: 'xkdg_dirchart_birth', birth: true, at: { date: date, time: time }, onClose: (typeof onReturn === 'function' ? onReturn : null) }); }

  function openDivinations(onReturn) { openSection({ title: '🔮 Divinations', key: 'xkdg_dirchart_div', birth: false, onClose: (typeof onReturn === 'function' ? onReturn : null) }); }
  function openBirthCharts(onReturn) { openSection({ title: '🎴 Birth charts', key: 'xkdg_dirchart_birth', birth: true, onClose: (typeof onReturn === 'function' ? onReturn : null) }); }

  try {
    window.DirectionsCharts = { openDivinations: openDivinations, openBirthCharts: openBirthCharts, openDivinationsAt: openDivinationsAt, openBirthChartsAt: openBirthChartsAt, drawChartInto: drawChartInto };
  } catch (e) {}
})();

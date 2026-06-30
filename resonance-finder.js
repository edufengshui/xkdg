/* ============================================================================
 * resonance-finder.js  —  XKDG Resonance Finder (Fase 1, strato dati)
 * ----------------------------------------------------------------------------
 * Turns a point into a ranked list of "resonance" places by merging TWO sources
 * and scoring each on CHARACTER (0..1):
 *   - curated.js   (the soul: hand-picked, always high character)
 *   - Foursquare   (the coverage: queried via the xkdg-fsq Cloudflare Worker,
 *                   chains excluded, then scored heuristically)
 *
 * It does NOT decide direction/hours — that's the metaphysical layer in the
 * Travel Planner (Fase 2). This module only answers: "near here, which places
 * have character?" Each result carries .characterScore and .reasons.
 *
 * SETUP: set RF_CFG.workerUrl below to your deployed xkdg-fsq Worker URL,
 * e.g. 'https://xkdg-fsq.decumano16.workers.dev'. If you set an ACCESS_KEY on
 * the Worker, put the same string in RF_CFG.accessKey.
 *
 * Works WITHOUT the worker too: if workerUrl is empty or the fetch fails, it
 * quietly returns curated-only results (so you can test curated.js first).
 *
 * Public API (all async return a sorted array, best first):
 *   ResonanceFinder.findLodging(lat, lon, opts)
 *   ResonanceFinder.findDining (lat, lon, opts)
 *   ResonanceFinder.findPower  (lat, lon, opts)
 *   ResonanceFinder.characterScore(record)   // sync, returns {score, reasons}
 *   opts = { radiusM, limit, queries, minScore, keepChains, priceTarget }
 * ==========================================================================*/

window.ResonanceFinder = (function () {
  'use strict';

  // ----- CONFIG (edit workerUrl after you deploy the worker) ----------------
  const RF_CFG = {
    workerUrl: 'https://xkdg-fsq.decumano16.workers.dev',  // your deployed xkdg-fsq worker
    accessKey: '',        // only if you set ACCESS_KEY on the worker
    testButton: true      // shows a floating "🧭 Resonance" test button (set false to hide)
  };

  // ----- resonance vocabulary ----------------------------------------------
  const QUERIES = {
    lodging: ['agriturismo', 'locanda', 'guesthouse', 'bed and breakfast', 'country house'],
    dining:  ['osteria', 'trattoria', 'agriturismo', 'enoteca', 'locanda'],
    power:   ['megalith', 'sacred site', 'abbey', 'shrine', 'stone circle']
  };

  // Words in the NAME that signal an independent place of character (+)
  const GOOD_NAME = /\b(agriturism\w*|locand\w*|osteri\w*|trattori\w*|enotec\w*|poder\w*|tenut\w*|cascin\w*|mas\w*|rifugi\w*|bait\w*|relais|dimora|antic\w*|borgo|casale|fattori\w*|maison|auberge|gasthof|landhaus|chambre)\b/i;
  // Words that signal a chain / mass-market place (-)
  const BAD_NAME  = /\b(hotel\s*(ibis|mercure|novotel|holiday|hilton|marriott|best\s*western|b&b\s*hotels|nh\b)|motel|resort\s*&?\s*spa|express|inn\s*&?\s*suites|hostel\s*world|booking|expedia)\b/i;
  // Resonance categories (+)
  const GOOD_CAT  = /(agritur|farm|bed\s*&?\s*breakfast|guest\s*house|country|inn|osteria|trattoria|wine\s*bar|enoteca|bistro|farm-to-table|vineyard|winery|monaster|abbey|shrine|temple|megalith|historic)/i;

  // ----- character score ----------------------------------------------------
  // 0..1. Uses only the signals that exist (degrades gracefully). Curated rows
  // are floored high because they're chosen by hand.
  function characterScore(r, opts) {
    opts = opts || {};
    const reasons = [];

    if (r.source === 'curated') {
      let cs = 0.9;
      if (r.note) cs = 0.95;
      reasons.push('curated by hand');
      return { score: cs, reasons: reasons };
    }

    if (r.chain) { reasons.push('chain'); return { score: 0, reasons: reasons }; }

    let s = 0.45;

    if (r.name && GOOD_NAME.test(r.name)) { s += 0.18; reasons.push('characterful name'); }
    if (r.name && BAD_NAME.test(r.name))  { s -= 0.25; reasons.push('chain-like name'); }

    const catBlob = (r.categories || []).join(' ') + ' ' + (r.category || '');
    if (GOOD_CAT.test(catBlob)) { s += 0.15; reasons.push('resonant category'); }

    // rating: Foursquare scale is 0-10
    if (r.rating != null) {
      const c = Math.max(-0.12, Math.min(0.22, (r.rating - 6) / 4 * 0.22));
      s += c;
      if (r.rating >= 8) reasons.push('well rated');
      else if (r.rating < 6) reasons.push('weakly rated');
    }

    // popularity 0-1: the "gem, not the tourist bus" curve. Moderate is best;
    // very high popularity is penalised (mass tourism). Same spirit as avoid_crowds.
    if (r.popularity != null) {
      const pop = r.popularity;
      let c;
      if (pop <= 0.5) c = pop * 0.24;             // ramp up toward a healthy buzz
      else c = 0.12 - (pop - 0.5) * 0.30;          // then fall off for over-touristed
      s += c;
      if (pop > 0.8) reasons.push('over-touristed');
      else if (pop >= 0.2 && pop <= 0.5) reasons.push('quiet gem');
    }

    // price: prefer the target band, mildly penalise the very top end
    if (r.price != null) {
      const band = opts.priceTarget || [1, 3];
      if (r.price >= band[0] && r.price <= band[1]) { s += 0.05; }
      else if (r.price >= 4) { s -= 0.05; reasons.push('top-end price'); }
    }

    // tags from curated-style enrichment (rare on FSQ, but harmless)
    const tagBlob = (r.tags || []).join(' ');
    if (/km0|family|organic|local|view|vineyard/i.test(tagBlob)) s += 0.04;

    s = Math.max(0, Math.min(1, s));
    return { score: s, reasons: reasons };
  }

  // ----- worker call --------------------------------------------------------
  function buildUrl(q, lat, lon, opts) {
    const u = new URL(RF_CFG.workerUrl);
    u.searchParams.set('q', q);
    u.searchParams.set('lat', lat);
    u.searchParams.set('lon', lon);
    u.searchParams.set('radius', String(opts.radiusM || 20000));
    u.searchParams.set('max', String(opts.perQuery || 12));
    u.searchParams.set('sort', opts.sort || 'RELEVANCE');
    u.searchParams.set('chains', opts.keepChains ? '1' : '0');
    if (opts.minprice) u.searchParams.set('minprice', String(opts.minprice));
    if (opts.maxprice) u.searchParams.set('maxprice', String(opts.maxprice));
    if (RF_CFG.accessKey) u.searchParams.set('k', RF_CFG.accessKey);
    return u.toString();
  }

  async function fsqQuery(q, lat, lon, opts) {
    if (!RF_CFG.workerUrl) return [];
    try {
      const res = await fetch(buildUrl(q, lat, lon, opts));
      const data = await res.json();
      if (!data || data.status !== 'ok' || !Array.isArray(data.results)) return [];
      return data.results.map(function (x) {
        x.source = 'fsq';
        x.board = null;
        x.note = '';
        x.tags = x.tags || [];
        return x;
      });
    } catch (e) {
      try { console.warn('[ResonanceFinder] worker query failed:', e && e.message); } catch (_) {}
      return [];
    }
  }

  // ----- dedupe (by id, else by name + ~80m proximity) ----------------------
  function dedupe(list) {
    const out = [], seen = {};
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.id && seen[r.id]) continue;
      let dup = false;
      if (!r.id) {
        for (let j = 0; j < out.length; j++) {
          const o = out[j];
          if (o.name === r.name && window.curatedDistKm &&
              window.curatedDistKm(r.lat, r.lon, o.lat, o.lon) < 0.08) { dup = true; break; }
        }
      }
      if (dup) continue;
      if (r.id) seen[r.id] = true;
      out.push(r);
    }
    return out;
  }

  // ----- generic finder -----------------------------------------------------
  async function find(kind, lat, lon, opts) {
    opts = opts || {};
    const radiusM = opts.radiusM || 20000;
    const radiusKm = radiusM / 1000;
    const limit = opts.limit || 10;
    const minScore = (opts.minScore != null) ? opts.minScore : 0.4;

    // 1) curated near the point (always)
    let curated = [];
    try { curated = (window.curatedNear ? window.curatedNear(kind, lat, lon, radiusKm) : []); }
    catch (e) { curated = []; }

    // 2) Foursquare queries in parallel
    const queries = opts.queries || QUERIES[kind] || [];
    let fsq = [];
    if (RF_CFG.workerUrl && queries.length) {
      const batches = await Promise.all(queries.map(function (q) {
        return fsqQuery(q, lat, lon, opts);
      }));
      fsq = batches.reduce(function (a, b) { return a.concat(b); }, []);
      fsq.forEach(function (r) { r.kind = kind; });
    }

    // 3) merge, dedupe, score, filter, sort
    let all = dedupe(curated.concat(fsq));
    all.forEach(function (r) {
      const sc = characterScore(r, opts);
      r.characterScore = sc.score;
      r.reasons = sc.reasons;
    });
    all = all.filter(function (r) { return r.characterScore >= minScore; });
    all.sort(function (a, b) {
      // curated first when scores tie, then by score, then by proximity
      if (b.characterScore !== a.characterScore) return b.characterScore - a.characterScore;
      const da = a.distance == null ? 1e12 : a.distance;
      const db = b.distance == null ? 1e12 : b.distance;
      return da - db;
    });
    return all.slice(0, limit);
  }

  // ----- in-app TEST PANEL (no F12 console needed) --------------------------
  function el(tag, style, txt) {
    var e = document.createElement(tag);
    if (style) e.setAttribute('style', style);
    if (txt != null) e.textContent = txt;
    return e;
  }

  function parseLatLon(s) {
    var m = String(s).match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    return m ? { lat: parseFloat(m[1]), lon: parseFloat(m[2]) } : null;
  }
  function resolveSpot(text) {
    var ll = parseLatLon(text);
    if (ll) return Promise.resolve(ll);
    if (window.TravelPlanner && typeof window.TravelPlanner.resolvePlace === 'function') {
      return window.TravelPlanner.resolvePlace(text, null, null).then(function (o) {
        return (o && isFinite(o.lat) && isFinite(o.lon)) ? { lat: o.lat, lon: o.lon } : null;
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  function openTestPanel() {
    var existing = document.getElementById('rf-test-overlay');
    if (existing) { existing.style.display = 'flex'; return; }
    var ov = el('div', 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;');
    ov.id = 'rf-test-overlay';
    var card = el('div', 'background:#fff;border-radius:14px;max-width:420px;width:100%;max-height:90vh;overflow:auto;padding:18px;font-family:system-ui,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.35);');

    var head = el('div', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;');
    head.appendChild(el('div', 'font-size:16px;font-weight:700;color:#6a1b9a;', '\uD83E\uDDED Resonance test'));
    var x = el('span', 'cursor:pointer;font-size:22px;color:#888;line-height:1;', '\u2715');
    x.addEventListener('click', function () { ov.style.display = 'none'; });
    head.appendChild(x); card.appendChild(head);

    card.appendChild(el('div', 'font-size:11px;color:#777;margin-bottom:10px;line-height:1.4;',
      RF_CFG.workerUrl ? 'Worker connected \u2014 results merge curated + Foursquare.'
                       : 'No worker URL set yet \u2014 showing CURATED results only. Set RF_CFG.workerUrl to add Foursquare.'));

    card.appendChild(el('div', 'font-size:11px;color:#555;font-weight:600;margin-bottom:3px;', 'Place (name) or "lat, lon"'));
    var placeInp = el('input', 'width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:10px;');
    placeInp.setAttribute('placeholder', 'e.g. Siena   \u00b7   or  43.318, 11.330');
    placeInp.value = 'Siena';
    card.appendChild(placeInp);

    var row = el('div', 'display:flex;gap:8px;margin-bottom:12px;');
    var typeW = el('div', 'flex:1;');
    typeW.appendChild(el('div', 'font-size:11px;color:#555;font-weight:600;margin-bottom:3px;', 'Kind'));
    var typeSel = el('select', 'width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;box-sizing:border-box;background:#fff;');
    [['lodging', 'Lodging'], ['dining', 'Dining'], ['power', 'Power places']].forEach(function (o) {
      var op = el('option', null, o[1]); op.value = o[0]; typeSel.appendChild(op);
    });
    typeW.appendChild(typeSel); row.appendChild(typeW);
    var radW = el('div', 'width:120px;');
    radW.appendChild(el('div', 'font-size:11px;color:#555;font-weight:600;margin-bottom:3px;', 'Radius'));
    var radSel = el('select', 'width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:13px;box-sizing:border-box;background:#fff;');
    [['5000', '5 km'], ['10000', '10 km'], ['25000', '25 km'], ['50000', '50 km']].forEach(function (o) {
      var op = el('option', null, o[1]); op.value = o[0]; radSel.appendChild(op);
    });
    radSel.value = '25000'; radW.appendChild(radSel); row.appendChild(radW);
    card.appendChild(row);

    var goBtn = el('button', 'width:100%;padding:11px;border:0;border-radius:10px;background:#6a1b9a;color:#fff;font-size:14px;font-weight:700;cursor:pointer;', 'Search');
    card.appendChild(goBtn);
    var status = el('div', 'font-size:12px;color:#777;margin:8px 0;', '');
    card.appendChild(status);
    var resultsEl = el('div', '');
    card.appendChild(resultsEl);

    function render(list) {
      resultsEl.innerHTML = '';
      if (!list.length) { resultsEl.appendChild(el('div', 'color:#a00;font-size:13px;', 'No resonant places found here.')); return; }
      list.forEach(function (r) {
        var box = el('div', 'padding:7px 9px;margin:5px 0;border:1px solid #ecdff5;border-radius:9px;background:#faf6fd;');
        var top = el('div', 'display:flex;align-items:center;gap:8px;');
        top.appendChild(el('span', 'display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:22px;border-radius:11px;background:' + (r.source === 'curated' ? '#2e7d32' : '#6a1b9a') + ';color:#fff;font-size:11px;font-weight:700;', String(Math.round(r.characterScore * 100))));
        top.appendChild(el('span', 'flex:1;min-width:0;font-weight:600;font-size:13px;', r.name));
        box.appendChild(top);
        var meta = [r.source];
        if (r.category) meta.push(r.category);
        if (r.distance != null) meta.push((Math.round(r.distance / 100) / 10) + ' km');
        if (r.rating != null) meta.push('\u2605 ' + r.rating);
        box.appendChild(el('div', 'font-size:11px;color:#666;margin:2px 0 0 42px;', meta.join(' \u00b7 ')));
        if (r.reasons && r.reasons.length) box.appendChild(el('div', 'font-size:10.5px;color:#999;margin:1px 0 0 42px;', r.reasons.join(', ')));
        resultsEl.appendChild(box);
      });
    }
    goBtn.addEventListener('click', function () {
      var kind = typeSel.value, radiusM = parseInt(radSel.value, 10);
      status.textContent = 'Resolving location\u2026'; resultsEl.innerHTML = '';
      resolveSpot((placeInp.value || '').trim()).then(function (ll) {
        if (!ll) { status.textContent = 'Could not resolve that place \u2014 try a clearer name or "lat, lon".'; return; }
        status.textContent = 'Searching ' + kind + ' near ' + ll.lat.toFixed(3) + ', ' + ll.lon.toFixed(3) + '\u2026';
        return find(kind, ll.lat, ll.lon, { radiusM: radiusM, limit: 12 }).then(function (list) {
          status.textContent = list.length + ' result(s) \u00b7 score = character (0\u2013100).';
          render(list);
        });
      }).catch(function (e) { status.textContent = 'Error: ' + ((e && e.message) || e); });
    });

    ov.addEventListener('click', function (e) { if (e.target === ov) ov.style.display = 'none'; });
    ov.appendChild(card); document.body.appendChild(ov);
  }

  function mountTestButton() {
    if (!RF_CFG.testButton || document.getElementById('rf-test-btn')) return;
    var b = el('button', 'position:fixed;right:14px;bottom:14px;z-index:100049;background:#6a1b9a;color:#fff;border:0;border-radius:22px;padding:9px 14px;font-size:13px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer;font-family:system-ui,Arial,sans-serif;', '\uD83E\uDDED Resonance');
    b.id = 'rf-test-btn';
    b.addEventListener('click', openTestPanel);
    document.body.appendChild(b);
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountTestButton);
    else mountTestButton();
  } catch (e) {}

  return {
    config: RF_CFG,
    characterScore: characterScore,
    openTestPanel: openTestPanel,
    findLodging: function (lat, lon, opts) { return find('lodging', lat, lon, opts); },
    findDining:  function (lat, lon, opts) { return find('dining',  lat, lon, opts); },
    findPower:   function (lat, lon, opts) { return find('power',   lat, lon, opts); }
  };
})();

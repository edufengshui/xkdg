/* =========================================================================
 * XKDG AI assistant — chat panel (Phase E1)
 * -------------------------------------------------------------------------
 * Self-installing widget: it adds a floating "💬" button and a chat panel.
 * It talks ONLY to your Cloudflare AI worker (which holds the API key); set the
 * worker URL once via the ⚙ button. E1 is plain conversation — the function-
 * calling tools (find dates, when-to-depart, flight direction, Maps export)
 * arrive in E2.
 *
 * Install: add  <script src="ai-chat.js"></script>  near the end of index.html.
 * ========================================================================= */
(function () {
  'use strict';

  var URL_KEY = 'xkdg_ai_url';
  var DEFAULT_URL = 'https://xkdg-ai.decumano16.workers.dev'; // baked-in default; ⚙ can override
  var MODEL = 'claude-haiku-4-5-20251001'; // change here if you prefer another model
  var MAX_TOKENS = 1024;

  // System prompt: app-wide assistant that ANSWERS about and OPERATES the whole app.
  var SYSTEM_PROMPT =
    'You are the assistant built into the "XKDG Bazi Calculator", a PWA for Bazi, Feng Shui and ' +
    'Qimen Dun Jia date/direction selection. You can both ANSWER questions about any part of the app ' +
    'and OPERATE it via the provided tools, then explain results in plain language. Always answer in the ' +
    'language the user writes in.\n\n' +
    'MAP OF THE APP (use it to guide on anything):\n' +
    '- Two wings: (1) Date selection (Bazi) and (2) Feng Shui. They are kept separate in setup and only ' +
    'meet as the ANSWER to a query.\n' +
    '- Date selection scans days/hours for the loaded person(s), optionally filtered by a Purpose ' +
    '(Health, Career, Wealth, Relationship, Journey, Speak, Legal). Tools: find_good_dates, open_scan_result.\n' +
    '- Feng Shui has three sections, each using its own data: WATER (door/house Facing + a moving-water ' +
    'position), BED (bed Sitting, must be Zheng Shen), DESK (desk Facing must be Zheng Shen + a Ling Shen ' +
    'water within +/-70 deg). Tools: find_water_dates, find_bed_dates, find_desk_dates; open_section to navigate.\n' +
    '- Flying stars live in the main Feng Shui sector; inside a section they are not repeated but can be ' +
    'recalled (recall_flying_stars).\n' +
    '- Houses store Facing/Period + doors + aquariums + saved section settings ("placements"). Tools: ' +
    'list_houses, set_active_house, load_house, load_placement. The active house follows the loaded person.\n' +
    '- Other panels: Qimen x Flying-Stars (open_qimen_for_flying_stars to pick a custom target; or ' +
    'find_qimen_hours_for_star to scan with a fixed favourable preset for one flying star), Chart finder ' +
    '(open_chart_finder), Direction calculator (open_direction_calculator), Travel planner (plan_travel + open_travel_planner).\n' +
    '- get_app_state tells you what the user currently has loaded/typed.\n\n' +
    'RULES:\n' +
    '- For anything that finds dates/hours or runs a scan: CALL A TOOL. Never invent dates or scores yourself ' +
    '- only report what a tool returns.\n' +
    '- Scans use whichever person(s) are loaded (A, B, or both); the user loads them by hand. If a tool says ' +
    'no person is loaded, ask the user to load Person A or B first.\n' +
    '- Keep answers concise: summarise the top few results (date, time/ganzhi, score) and offer to open one. ' +
    'If a tool returns an error, relay it briefly and suggest the fix.\n' +
    '- For travel timing/direction use plan_travel (you supply the destination lat/lon from your own ' +
    'knowledge); for the road route + Google Maps export use open_travel_planner.\n' +
    '- For Bed/Desk/Water dates the tool reads the section inputs; if a required degree is missing, ask the ' +
    'user for it (0-360) and call the tool with it.\n' +
    '- Two different "water" questions: find_water_dates picks Feng Shui DATES for a water feature given a ' +
    'Facing/water setup; find_water_hours (QMDJ Water Scanner) picks the HOURS when a favorable Qimen ' +
    'configuration faces a compass DIRECTION (N/NE/E/SE/S/SW/W/NW). Pick the one that matches the question.\n' +
    '- If a capability genuinely has no tool, say so briefly and point to the on-screen panel to use.';

  // ---- Tool catalogue (Phase E2, increment 1) ----------------------------
  var TOOLS = [
    {
      name: 'find_good_dates',
      description: 'Run the app\'s date scan for the currently loaded person(s) and return the best day/hours, ' +
        'best score first. Use for "what is a good date in the next days" or "list positive dates for ' +
        'Legal/Speak/Health/Wealth/Career/Relationship/Journey in the next N days". Honors whichever person(s) ' +
        'are loaded (A, B, or both). Omit purpose for a general scan.',
      input_schema: {
        type: 'object',
        properties: {
          purpose: { type: 'string', enum: ['', 'health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'],
            description: 'Optional purpose; empty string for a general scan.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' }
        },
        required: []
      }
    },
    {
      name: 'open_scan_result',
      description: 'Open one date from the most recent find_good_dates list in the main calculator so the user can ' +
        'see the full chart. Provide the 1-based rank from that list.',
      input_schema: {
        type: 'object',
        properties: { rank: { type: 'integer', description: '1-based position in the last results list.' } },
        required: ['rank']
      }
    },
    {
      name: 'find_bed_dates',
      description: 'Find lucky dates to MOVE THE BED for the loaded person(s), using the Feng Shui Bed section: the ' +
        'bed Sitting direction must be Zheng Shen and the date must close the compatibility loop (period & element) ' +
        'for every loaded person. Uses the bed sitting already entered in the Bed section unless you pass one.',
      input_schema: {
        type: 'object',
        properties: {
          sitting: { type: 'number', description: 'Optional bed Sitting in degrees (0-360). If omitted, uses what is on screen.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' }
        },
        required: []
      }
    },
    {
      name: 'find_desk_dates',
      description: 'Find lucky dates to SET UP THE WORK DESK (orient the desk and place a moving-water element) for the ' +
        'active person, using the Feng Shui Desk section: the desk Facing must be Zheng Shen and compatible with the ' +
        'person, and the date must close the loop. Also returns propitious water positions. Uses the desk facing on ' +
        'screen unless you pass one.',
      input_schema: {
        type: 'object',
        properties: {
          facing: { type: 'number', description: 'Optional desk Facing in degrees (0-360). If omitted, uses what is on screen.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' }
        },
        required: []
      }
    },
    {
      name: 'plan_travel',
      description: 'Plan a journey: give the favorable direction toward a destination and the favorable time windows ' +
        '(true-solar-time) to be travelling toward it. Use for "when should I leave for X", "good time/direction to ' +
        'go to X". You must supply the destination latitude/longitude (use your knowledge of the city, e.g. Milan ≈ ' +
        '45.46, 9.19). Origin defaults to the saved GPS if any.',
      input_schema: {
        type: 'object',
        properties: {
          dest_lat: { type: 'number', description: 'Destination latitude.' },
          dest_lon: { type: 'number', description: 'Destination longitude.' },
          origin_lat: { type: 'number', description: 'Optional origin latitude (defaults to saved GPS).' },
          origin_lon: { type: 'number', description: 'Optional origin longitude.' },
          depart_date: { type: 'string', description: 'Departure date YYYY-MM-DD (default today).' },
          depart_hour: { type: 'integer', description: 'Wall-clock start hour 0-23 (default 8).' },
          duration_h: { type: 'integer', description: 'Trip length in hours (default 12).' }
        },
        required: ['dest_lat', 'dest_lon']
      }
    },
    {
      name: 'open_travel_planner',
      description: 'Open the full Travel Planner UI (real road route, per-leg directions, Google Maps export). Use when ' +
        'the user wants the detailed planner or the Maps export rather than a quick timing answer.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'open_qimen_for_flying_stars',
      description: 'Open the "Qimen hours for Flying Stars" (QFS) panel, where the user selects a target (profiles / ' +
        'entities) and scans for the hours that send a Qimen configuration to a flying-star palace. Use for requests ' +
        'about activating a sector / flying star with Qimen timing.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'get_app_state',
      description: 'Read what the user currently has loaded/typed: people loaded, selected date, scan range, ' +
        'purpose, active Feng Shui section, and the section inputs (house/door facing, period, water, bed sitting, desk facing). ' +
        'Call this when you need context before answering or before another tool.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'find_water_dates',
      description: 'Feng Shui WATER section: find the dates that suit placing a moving-water feature for the given ' +
        'door/house Facing (Zheng Shen) and optional water position (Ling Shen, within +/-70 deg). Returns the best dates.',
      input_schema: {
        type: 'object',
        properties: {
          door_facing: { type: 'number', description: 'Door/house facing in degrees (0-360). Required.' },
          water: { type: 'number', description: 'Optional water position in degrees.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' }
        },
        required: ['door_facing']
      }
    },
    {
      name: 'open_section',
      description: 'Navigate to a Feng Shui section so the user can see/fill it: water, bed or desk.',
      input_schema: {
        type: 'object',
        properties: { section: { type: 'string', enum: ['water', 'bed', 'desk'] } },
        required: ['section']
      }
    },
    {
      name: 'recall_flying_stars',
      description: 'Toggle the house flying-stars chart overlay on the current Feng Shui section luopan.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'open_direction_calculator',
      description: 'Open the Direction calculator panel (compute a bearing/direction to a place).',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'open_chart_finder',
      description: 'Open the "Find charts by star position" panel.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'list_houses',
      description: 'List the saved houses for the loaded person, with index, name, facing/period, counts of doors/' +
        'aquariums/placements, and which one is active. Use before set_active_house / load_house / load_placement.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'set_active_house',
      description: 'Set which saved house is active for the loaded person (the active house follows the person).',
      input_schema: {
        type: 'object',
        properties: { index: { type: 'integer', description: 'House index from list_houses.' } },
        required: ['index']
      }
    },
    {
      name: 'load_house',
      description: 'Load a saved house (its facing/period) into the Feng Shui inputs so the user can review/edit it.',
      input_schema: {
        type: 'object',
        properties: { index: { type: 'integer', description: 'House index from list_houses.' } },
        required: ['index']
      }
    },
    {
      name: 'load_placement',
      description: 'Re-apply a saved Water/Bed/Desk placement from a house into its section (restores the inputs and ' +
        'opens that section).',
      input_schema: {
        type: 'object',
        properties: {
          house_index: { type: 'integer' },
          section: { type: 'string', enum: ['water', 'bed', 'desk'] },
          placement_index: { type: 'integer' }
        },
        required: ['house_index', 'section', 'placement_index']
      }
    },
    {
      name: 'find_water_hours',
      description: 'QMDJ Water Scanner: find the hours when a favorable Qimen Dun Jia configuration faces a given ' +
        'compass direction (for activating / placing moving water in that direction). Returns the matching hours ' +
        'with their Dun/Ju, ganzhi and a score (higher = stronger). This is a Qimen hour scan, separate from the ' +
        'Feng Shui Water date scan (find_water_dates).',
      input_schema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], description: 'Compass direction the water faces.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' },
          start: { type: 'string', description: 'Optional start date YYYY-MM-DD (defaults to the toolbar value or today).' }
        },
        required: ['direction']
      }
    },
    {
      name: 'find_qimen_hours_for_star',
      description: 'Qimen x Flying Stars (fixed preset): given a flying star (type water = facing star, or mountain = ' +
        'sitting star; number 1-9), find the hours that send a FIXED favourable preset to that star\'s palace(s) in ' +
        'the current house chart: the 4 favourable doors (Open/Rest/Birth/View) and the 3 noble Qi (Yi/Bing/Ding). ' +
        'A palace matches if it carries at least one of those. Requires House Facing + Period to be set. Returns the ' +
        'matching hours with palace, Dun/Ju and score. For a custom target selection use open_qimen_for_flying_stars.',
      input_schema: {
        type: 'object',
        properties: {
          star_type: { type: 'string', enum: ['water', 'mountain'], description: 'water = facing star, mountain = sitting star.' },
          star_num: { type: 'integer', description: 'Flying star number 1-9.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default = toolbar range or 7).' },
          exclude_fuyin: { type: 'boolean', description: 'Optionally skip Fu Yin hours (heaven stem = earth stem).' }
        },
        required: ['star_type', 'star_num']
      }
    }
  ];

  function execTool(name, input) {
    try {
      if (name === 'find_good_dates') return toolFindGoodDates(input || {});
      if (name === 'open_scan_result') return toolOpenScanResult(input || {});
      if (name === 'find_bed_dates') return toolFindBedDates(input || {});
      if (name === 'find_desk_dates') return toolFindDeskDates(input || {});
      if (name === 'plan_travel') return toolPlanTravel(input || {});
      if (name === 'open_travel_planner') return toolOpenTravelPlanner(input || {});
      if (name === 'open_qimen_for_flying_stars') return toolOpenQimenFS(input || {});
      if (name === 'get_app_state') return toolGetAppState();
      if (name === 'find_water_dates') return toolFindWaterDates(input || {});
      if (name === 'open_section') return toolOpenSection(input || {});
      if (name === 'recall_flying_stars') return toolRecallFlyingStars();
      if (name === 'open_direction_calculator') return toolOpenDirectionCalc();
      if (name === 'open_chart_finder') return toolOpenChartFinder();
      if (name === 'list_houses') return toolListHouses();
      if (name === 'set_active_house') return toolSetActiveHouse(input || {});
      if (name === 'load_house') return toolLoadHouse(input || {});
      if (name === 'load_placement') return toolLoadPlacement(input || {});
      if (name === 'find_water_hours') return toolFindWaterHours(input || {});
      if (name === 'find_qimen_hours_for_star') return toolFindQimenHoursForStar(input || {});
      return { error: 'Unknown tool: ' + name };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }

  function todayIso() {
    var t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }

  // app-bazi declares _personAYear/_personBYear and app-fengshui _fsActionPalace
  // with `let` at top level. Those are GLOBAL LEXICAL bindings shared across all
  // classic scripts (so a bare reference resolves) but they are NOT properties of
  // `window`. Read them via a bare reference (guarded by typeof), falling back to
  // window for safety.
  function personLoaded() {
    var a, b;
    try { a = (typeof _personAYear !== 'undefined') ? _personAYear : window._personAYear; } catch (e) { a = window._personAYear; }
    try { b = (typeof _personBYear !== 'undefined') ? _personBYear : window._personBYear; } catch (e) { b = window._personBYear; }
    return { a: !!a, b: !!b, any: !!(a || b) };
  }
  function fsPalaceActive() {
    try { return (typeof _fsActionPalace !== 'undefined') ? _fsActionPalace : window._fsActionPalace; } catch (e) { return window._fsActionPalace; }
  }

  function toolFindGoodDates(input) {
    if (typeof window.runScanner !== 'function') return { error: 'The scanner is not available on this page.' };
    var pl = personLoaded();
    if (!pl.any) return { error: 'No person is loaded. Ask the user to load Person A or B first.' };
    var purpose = input.purpose || '';
    var days = parseInt(input.days, 10) || 7;
    var ps = document.getElementById('purpose-select');
    if (ps) { ps.value = purpose; if (typeof window.onPurposeChange === 'function') try { window.onPurposeChange(); } catch (e) {} }
    var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days');
    if (ss) ss.value = todayIso();
    if (sd) sd.value = String(days);
    // This is a date scan, not a flight: make sure no direction filter is active.
    try { if (fsPalaceActive() && typeof window.fsClearDirectionFilter === 'function') window.fsClearDirectionFilter(); } catch (e) {}
    window.runScanner();
    var res = window._lastScanResults || [];
    var both = pl.a && pl.b;
    return {
      purpose: purpose || '(general)',
      days: days,
      persons_loaded: both ? 'A+B' : (pl.a ? 'A' : 'B'),
      count: res.length,
      results: res.slice(0, 15).map(function (r, i) {
        var o = { rank: i + 1, date: r.isoDate, time: r.time, score: r.score };
        if (both) { o.forA = r.scoreA > 0; o.forB = r.scoreB > 0; }
        return o;
      })
    };
  }

  function toolOpenScanResult(input) {
    var res = window._lastScanResults || [];
    var i = (parseInt(input.rank, 10) || 1) - 1;
    if (i < 0 || i >= res.length) return { error: 'No result at that rank (there are ' + res.length + ').' };
    if (typeof window.loadDateIntoMain !== 'function') return { error: 'Cannot open the date on this page.' };
    window.loadDateIntoMain(res[i].isoDate, res[i].hourIndex);
    return { opened: { date: res[i].isoDate, time: res[i].time } };
  }

  // ── Feng Shui Bed / Desk lucky-date tools (wired to app-fengshui.js) ──
  function _fsResultsCommon(matches, mapper) {
    return matches.slice(0, 15).map(mapper);
  }
  function toolFindBedDates(input) {
    if (typeof window._fsScanLuckyDates !== 'function' || typeof window._fsBedPersons !== 'function')
      return { error: 'The Feng Shui Bed scan is not available on this page.' };
    var persons = window._fsBedPersons();
    if (!persons.length) return { error: 'No person is loaded. Ask the user to load Person A or B first.' };
    var sitEl = document.getElementById('fs-bed-sitting');
    if (input.sitting != null && sitEl) sitEl.value = String(input.sitting);
    var sitDeg = parseFloat(sitEl ? sitEl.value : NaN);
    if (isNaN(sitDeg)) return { error: 'No bed Sitting set. Ask the user for the bed Sitting in degrees (0-360), or to fill the Bed section.' };
    var slot = window.fsSlotForDeg(sitDeg);
    if (typeof window.fsIsZhengShen === 'function' && !window.fsIsZhengShen(slot.yun)) {
      var nz = (typeof window._fsBedNearestZS === 'function') ? window._fsBedNearestZS(sitDeg) : null;
      return { error: 'The bed Sitting is not Zheng Shen (required for the bed).', suggested_sitting: nz ? +nz.centerDeg.toFixed(1) : null };
    }
    var days = parseInt(input.days, 10) || 7;
    var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days');
    if (ss) ss.value = todayIso();
    if (sd) sd.value = String(days);
    var matches = window._fsScanLuckyDates(persons, slot, 30);
    return {
      section: 'bed', sitting: sitDeg, persons_loaded: persons.map(function (p) { return p.who; }).join('+'),
      days: days, count: matches.length,
      results: _fsResultsCommon(matches, function (m) {
        return {
          date: m.iso, ganzhi: m.dGan + m.dZhi,
          per: (m.eval.perPerson || []).map(function (pp) {
            return {
              who: pp.who,
              period_via: pp.ps.periodLink ? 'sitting' : (pp.pd.periodLink ? 'date' : '-'),
              element_via: pp.ps.elementLink ? 'sitting' : (pp.pd.elementLink ? 'date' : '-')
            };
          })
        };
      })
    };
  }
  function toolFindDeskDates(input) {
    if (typeof window._fsScanLuckyDates !== 'function' || typeof window._fsDeskPerson !== 'function')
      return { error: 'The Feng Shui Desk scan is not available on this page.' };
    var person = window._fsDeskPerson();
    if (!person) return { error: 'No person is loaded. Ask the user to load the person who sits at the desk.' };
    var fEl = document.getElementById('fs-desk-facing');
    if (input.facing != null && fEl) fEl.value = String(input.facing);
    var fDeg = parseFloat(fEl ? fEl.value : NaN);
    if (isNaN(fDeg)) return { error: 'No desk Facing set. Ask the user for the desk Facing in degrees (0-360).' };
    var slot = window.fsSlotForDeg(fDeg);
    if (typeof window.fsIsZhengShen === 'function' && !window.fsIsZhengShen(slot.yun)) {
      var nz = (typeof window._fsDeskNearestGoodFacing === 'function') ? window._fsDeskNearestGoodFacing(fDeg, person) : null;
      return { error: 'The desk Facing is not Zheng Shen (required).', suggested_facing: nz ? +nz.centerDeg.toFixed(1) : null };
    }
    var days = parseInt(input.days, 10) || 7;
    var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days');
    if (ss) ss.value = todayIso();
    if (sd) sd.value = String(days);
    var matches = window._fsScanLuckyDates([person], slot, 30);
    var waters = (typeof window._fsDeskWaterList === 'function') ? window._fsDeskWaterList(slot, person) : [];
    return {
      section: 'desk', facing: fDeg, person: person.who, days: days, count: matches.length,
      water_positions: waters.slice(0, 8).map(function (w) { return { deg: +w.slot.centerDeg.toFixed(1), hex: w.slot.hexNum, yun: w.slot.yun }; }),
      results: _fsResultsCommon(matches, function (m) {
        var pp = (m.eval.perPerson || [])[0] || {};
        return {
          date: m.iso, ganzhi: m.dGan + m.dZhi,
          period_via: (pp.ps && pp.ps.periodLink) ? 'facing' : ((pp.pd && pp.pd.periodLink) ? 'date' : '-'),
          element_via: (pp.ps && pp.ps.elementLink) ? 'facing' : ((pp.pd && pp.pd.elementLink) ? 'date' : '-')
        };
      })
    };
  }

  // ── Travel + Qimen-for-flying-stars tools ──
  function toolPlanTravel(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.plan !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };
    if (input.dest_lat == null || input.dest_lon == null)
      return { error: 'I need the destination coordinates (dest_lat, dest_lon). Provide them from the city the user named.' };
    var dest = { lat: +input.dest_lat, lon: +input.dest_lon };
    var origin = null;
    if (input.origin_lat != null && input.origin_lon != null) origin = { lat: +input.origin_lat, lon: +input.origin_lon };
    else if (window._lastGpsLat != null && window._lastGpsLng != null) origin = { lat: window._lastGpsLat, lon: window._lastGpsLng };
    var dateStr = input.depart_date || todayIso();
    var hour = (input.depart_hour != null) ? parseInt(input.depart_hour, 10) : 8;
    var dep = new Date(dateStr + 'T' + String(hour).padStart(2, '0') + ':00:00');
    if (isNaN(dep.getTime())) return { error: 'Invalid departure date/time.' };
    var durH = parseInt(input.duration_h, 10) || 12;
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value);
    if (isNaN(utc)) utc = 1;
    var dstOn = false;
    try { dstOn = (typeof _dstOn !== 'undefined') ? _dstOn : !!window._dstOn; } catch (e) { dstOn = !!window._dstOn; }
    var opts = { depDate: dep, durationH: durH, dest: dest, utc: utc, dstOn: dstOn, stepMin: 30 };
    if (origin) opts.origin = origin;
    var plan;
    try { plan = window.TravelPlanner.plan(opts); }
    catch (e) { return { error: 'Travel planning failed: ' + ((e && e.message) || e) }; }
    var windows = [];
    (plan.slots || []).forEach(function (s) {
      var good = (s.dirs || []).filter(function (d) { return d.towardDest && d.eval && d.eval.ok; });
      if (good.length) {
        windows.push({
          from: s.tstStart, to: s.tstEnd, ganzhi: s.gZhiPy || s.gZhiHan, weekday: s.weekday,
          directions: good.map(function (d) { return { dir: d.dir, score: d.eval.score, door: d.eval.door }; })
        });
      }
    });
    return {
      direction_to_destination: { bearing: Math.round(plan.bearing) + '°', snapped: plan.snapDir },
      departure_planned: dateStr + ' ' + String(hour).padStart(2, '0') + ':00',
      duration_hours: durH,
      favorable_windows_count: windows.length,
      favorable_windows: windows.slice(0, 12),
      note: 'Straight-line estimate. For the real road route + per-leg directions + Google Maps export, open the full Travel Planner.'
    };
  }
  function toolOpenTravelPlanner() {
    if (typeof window.tpOpen !== 'function') return { error: 'Travel Planner not available on this page.' };
    window.tpOpen();
    return { opened: 'travel_planner' };
  }
  function toolOpenQimenFS() {
    if (!window.QFS || typeof window.QFS.open !== 'function') return { error: 'Qimen-for-flying-stars (QFS) not available on this page.' };
    window.QFS.open();
    return { opened: 'qimen_flying_stars', note: 'Panel opened — the user selects the target profiles/entities, then runs the scan.' };
  }

  // ── Whole-app tools (state, Water, navigation, houses/placements) ──
  function toolGetAppState() {
    var v = function (id) { var e = document.getElementById(id); return e ? (e.value || null) : null; };
    var pl = personLoaded();
    var sect = 'main';
    try { sect = window._fsActiveZone || 'main'; } catch (e) {}
    return {
      persons_loaded: (pl.a && pl.b) ? 'A+B' : (pl.a ? 'A' : (pl.b ? 'B' : 'none')),
      personA: v('person-name'), personB: v('person-name-b'),
      selectedDate: v('date'), scanStart: v('scan-start'), scanDays: v('scan-days'),
      purpose: v('purpose-select'),
      fengShui: {
        activeSection: sect,
        houseFacing: v('fs-house-facing'), period: v('fs-period'),
        doorFacing: v('fs-facing'), water: v('fs-water'),
        bedPalace: v('fs-bed-palace'), bedSitting: v('fs-bed-sitting'),
        deskFacing: v('fs-desk-facing')
      }
    };
  }

  function toolFindWaterDates(input) {
    if (typeof window.fsFindMatchingDatesForSetup !== 'function' || typeof window.fsSlotForDeg !== 'function')
      return { error: 'The Feng Shui Water date scan is not available on this page.' };
    if (input.door_facing == null) return { error: 'I need the door/house Facing in degrees (door_facing).' };
    var fSlot = window.fsSlotForDeg(+input.door_facing);
    if (typeof window.fsIsZhengShen === 'function' && !window.fsIsZhengShen(fSlot.yun))
      return { error: 'The Facing is not Zheng Shen (required for Water).' };
    var wSlot = null;
    if (input.water != null) {
      wSlot = window.fsSlotForDeg(+input.water);
      if (typeof window.fsIsLingShen === 'function' && !window.fsIsLingShen(wSlot.yun))
        return { error: 'The water position is not Ling Shen (required).' };
    }
    var f = document.getElementById('fs-facing'); if (f) f.value = String(input.door_facing);
    if (input.water != null) { var w = document.getElementById('fs-water'); if (w) w.value = String(input.water); }
    var days = parseInt(input.days, 10) || 7;
    var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days');
    if (ss && !ss.value) ss.value = todayIso();
    if (sd) sd.value = String(days);
    var matches;
    try { matches = window.fsFindMatchingDatesForSetup(fSlot, wSlot); }
    catch (e) { return { error: 'Water scan failed: ' + ((e && e.message) || e) }; }
    if (!matches) return { error: 'Set a FROM date and DAYS first (the Water scan uses the toolbar range).' };
    return {
      section: 'water', facing: +input.door_facing, water: (input.water != null ? +input.water : null),
      days: days, count: matches.length,
      results: matches.slice(0, 15).map(function (m) {
        return { date: m.isoDate, ganzhi: (m.dGan || '') + (m.dZhi || ''), score: m.score };
      })
    };
  }

  function toolOpenSection(input) {
    var z = (input.section || '').toLowerCase();
    if (['water', 'bed', 'desk'].indexOf(z) < 0) return { error: 'section must be water, bed or desk.' };
    if (typeof window.openFengShui === 'function') { try { window.openFengShui(); } catch (e) {} }
    if (typeof window.fsSelectZone !== 'function') return { error: 'Cannot navigate sections on this page.' };
    window.fsSelectZone(z);
    return { opened_section: z };
  }

  function toolRecallFlyingStars() {
    if (typeof window.fsRecallFlyingStars !== 'function') return { error: 'Open a Feng Shui section first.' };
    window.fsRecallFlyingStars();
    return { toggled: 'flying_stars_overlay' };
  }

  function toolOpenDirectionCalc() {
    if (typeof window.fsOpenDirectionCalc !== 'function') return { error: 'Direction calculator not available on this page.' };
    window.fsOpenDirectionCalc();
    return { opened: 'direction_calculator' };
  }

  function toolOpenChartFinder() {
    if (!window.FSChartFinder || typeof window.FSChartFinder.open !== 'function') return { error: 'Chart finder not available on this page.' };
    window.FSChartFinder.open();
    return { opened: 'chart_finder' };
  }

  function _activeHousePerson() {
    if (typeof window.fsGetActivePersonForHouse !== 'function') return null;
    return window.fsGetActivePersonForHouse();
  }

  function toolListHouses() {
    if (typeof window._fsHousesLoad !== 'function') return { error: 'House profiles not available on this page.' };
    var person = _activeHousePerson();
    if (!person) return { error: 'No person loaded. Ask the user to load Person A or B.' };
    var all = window._fsHousesLoad();
    var houses = all[person.name] || [];
    var activeIdx = (typeof window._fsActiveHouseGet === 'function') ? window._fsActiveHouseGet(person.name) : 0;
    return {
      person: person.name, active_index: activeIdx, count: houses.length,
      houses: houses.map(function (h, i) {
        var pl = h.placements || {};
        return {
          index: i, name: h.name, houseFacing: h.houseFacing, period: h.period,
          doors: (h.doors || []).length, aquariums: (h.waters || []).length,
          placements: { water: (pl.water || []).length, bed: (pl.bed || []).length, desk: (pl.desk || []).length },
          active: i === activeIdx
        };
      })
    };
  }

  function toolSetActiveHouse(input) {
    if (typeof window.fsSetActiveHouse !== 'function') return { error: 'House profiles not available.' };
    var person = _activeHousePerson();
    if (!person) return { error: 'No person loaded.' };
    var idx = parseInt(input.index, 10);
    if (isNaN(idx)) return { error: 'Provide the house index (from list_houses).' };
    window.fsSetActiveHouse(person.name, idx);
    return { active_house_index: idx };
  }

  function toolLoadHouse(input) {
    if (typeof window.fsLoadHouse !== 'function') return { error: 'House profiles not available.' };
    var person = _activeHousePerson();
    if (!person) return { error: 'No person loaded.' };
    var idx = parseInt(input.index, 10);
    if (isNaN(idx)) return { error: 'Provide the house index (from list_houses).' };
    window.fsLoadHouse(person.name, idx);
    return { loaded_house_index: idx };
  }

  function toolLoadPlacement(input) {
    if (typeof window.fsLoadPlacement !== 'function') return { error: 'Placements not available.' };
    var person = _activeHousePerson();
    if (!person) return { error: 'No person loaded.' };
    var hi = parseInt(input.house_index, 10);
    var zone = (input.section || '').toLowerCase();
    var pi = parseInt(input.placement_index, 10);
    if (isNaN(hi) || ['water', 'bed', 'desk'].indexOf(zone) < 0 || isNaN(pi))
      return { error: 'Provide house_index, section (water/bed/desk) and placement_index (from list_houses).' };
    window.fsLoadPlacement(person.name, hi, zone, pi);
    return { loaded_placement: { house_index: hi, section: zone, placement_index: pi } };
  }

  function toolFindWaterHours(input) {
    if (!window.QMDJWaterScanner || typeof window.QMDJWaterScanner.scan !== 'function')
      return { error: 'The QMDJ water scanner is not available on this page.' };
    var dir = (input.direction || '').toUpperCase();
    var valid = (typeof window.QMDJWaterScanner.validDirections === 'function')
      ? window.QMDJWaterScanner.validDirections() : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    if (valid.indexOf(dir) < 0) return { error: 'direction must be one of: ' + valid.join(', ') + '.' };
    var days = parseInt(input.days, 10) || 7;
    var start = input.start;
    if (!start) { var s = document.getElementById('scan-start'); start = (s && s.value) || todayIso(); }
    var results;
    try { results = window.QMDJWaterScanner.scan(dir, start, days); }
    catch (e) { return { error: 'QMDJ water scan failed: ' + ((e && e.message) || e) }; }
    return {
      scanner: 'qmdj_water', direction: dir, start: start, days: days, count: results.length,
      results: results.slice(0, 15).map(function (r) {
        return {
          date: r.date, weekday: r.weekday, hour: r.hourTime, ganzhi: r.hourHan,
          dun: r.dun, ju: r.ju, score: r.score,
          hits: (r.hits || []).map(function (h) { return { label: h.label, kind: h.cat }; })
        };
      })
    };
  }

  function toolFindQimenHoursForStar(input) {
    if (!window.QFS || typeof window.QFS.scanStarPreset !== 'function')
      return { error: 'The Qimen-for-flying-stars scan is not available on this page.' };
    var type = (input.star_type || '').toLowerCase();
    if (type !== 'water' && type !== 'mountain')
      return { error: "star_type must be 'water' (facing star) or 'mountain' (sitting star)." };
    var num = parseInt(input.star_num, 10);
    if (isNaN(num) || num < 1 || num > 9) return { error: 'star_num must be 1-9.' };
    var opts = {};
    if (input.days != null) opts.days = parseInt(input.days, 10);
    if (input.exclude_fuyin) opts.excludeFuYin = true;
    var r;
    try { r = window.QFS.scanStarPreset(type, num, opts); }
    catch (e) { return { error: 'Qimen scan failed: ' + ((e && e.message) || e) }; }
    if (r && r.error) return { error: r.error, target_palaces: r.palaces };
    return {
      scanner: 'qimen_for_flying_stars', star: type + ' ' + num,
      target_palaces: r.palaces, preset: r.preset, count: r.count,
      results: (r.results || []).slice(0, 15).map(function (x) {
        return {
          date: x.date, weekday: x.weekday, hour: x.hourTime, ganzhi: x.hourHan,
          palace: x.palaceLbl, dun: x.dun, ju: x.ju, score: x.score,
          hits: (x.hits || []).map(function (h) { return h.label; })
        };
      })
    };
  }

  var history = [];   // [{role:'user'|'assistant', content:'...'}]
  var sending = false;

  function getUrl() { try { return (localStorage.getItem(URL_KEY) || '').trim() || DEFAULT_URL; } catch (e) { return DEFAULT_URL; } }
  function setUrl(u) { try { localStorage.setItem(URL_KEY, (u || '').trim()); } catch (e) {} }

  function elc(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function build() {
    if (document.getElementById('xkdg-ai-btn')) return; // already installed

    // Floating launcher
    var btn = elc('button', { id: 'xkdg-ai-btn', title: 'Assistant',
      style: 'position:fixed;right:16px;bottom:16px;z-index:99998;width:52px;height:52px;border-radius:50%;' +
        'border:0;background:#6a1b9a;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.3);' }, '💬');
    document.body.appendChild(btn);

    // Panel
    var panel = elc('div', { id: 'xkdg-ai-panel',
      style: 'display:none;position:fixed;right:16px;bottom:80px;z-index:99999;width:min(380px,calc(100vw - 32px));' +
        'max-height:min(600px,calc(100vh - 110px));background:#fff;border:1px solid #ccc;border-radius:14px;' +
        'box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;font-family:inherit;' });

    var header = elc('div', { style: 'display:flex;align-items:center;gap:8px;padding:10px 12px;background:#6a1b9a;color:#fff;' });
    header.appendChild(elc('div', { style: 'flex:1;font-weight:700;font-size:15px;' }, '💬 XKDG Assistant'));
    var gear = elc('button', { id: 'xkdg-ai-gear', title: 'Set AI worker URL',
      style: 'border:0;background:transparent;color:#fff;font-size:18px;cursor:pointer;' }, '⚙');
    var clearBtn = elc('button', { id: 'xkdg-ai-clear', title: 'Clear conversation',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '🗑');
    var closeBtn = elc('button', { id: 'xkdg-ai-close', title: 'Close',
      style: 'border:0;background:transparent;color:#fff;font-size:18px;cursor:pointer;' }, '✕');
    header.appendChild(gear); header.appendChild(clearBtn); header.appendChild(closeBtn);
    panel.appendChild(header);

    var msgs = elc('div', { id: 'xkdg-ai-msgs',
      style: 'flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#faf7fc;min-height:120px;' });
    panel.appendChild(msgs);

    var status = elc('div', { id: 'xkdg-ai-status', style: 'font-size:11px;color:#888;padding:0 12px;min-height:14px;' }, '');
    panel.appendChild(status);

    var inputRow = elc('div', { style: 'display:flex;gap:6px;padding:10px 12px;border-top:1px solid #eee;' });
    var input = elc('textarea', { id: 'xkdg-ai-input', rows: '1', placeholder: 'Ask something…',
      style: 'flex:1;resize:none;padding:8px;border:1px solid #ccc;border-radius:8px;font-size:14px;font-family:inherit;max-height:90px;' });
    var send = elc('button', { id: 'xkdg-ai-send',
      style: 'border:0;border-radius:8px;background:#6a1b9a;color:#fff;font-size:14px;font-weight:600;padding:8px 14px;cursor:pointer;' }, 'Send');
    inputRow.appendChild(input); inputRow.appendChild(send);
    panel.appendChild(inputRow);

    document.body.appendChild(panel);

    function openPanel() {
      panel.style.display = 'flex';
      if (!getUrl()) promptUrl();
      input.focus();
    }
    function closePanel() { panel.style.display = 'none'; }

    btn.addEventListener('click', function () { panel.style.display === 'flex' ? closePanel() : openPanel(); });
    closeBtn.addEventListener('click', closePanel);
    gear.addEventListener('click', promptUrl);
    clearBtn.addEventListener('click', function () { history = []; msgs.innerHTML = ''; setStatus(''); });

    function promptUrl() {
      var cur = getUrl();
      var u = window.prompt('Paste your AI worker URL (e.g. https://xkdg-ai.you.workers.dev):', cur || 'https://');
      if (u != null) { setUrl(u); setStatus(getUrl() ? 'AI worker URL saved.' : 'No URL set.'); }
    }
    function setStatus(t, color) { status.textContent = t || ''; status.style.color = color || '#888'; }

    function addBubble(role, text) {
      var mine = role === 'user';
      var b = elc('div', { style:
        'max-width:85%;padding:8px 11px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;' +
        (mine ? 'align-self:flex-end;background:#6a1b9a;color:#fff;border-bottom-right-radius:3px;'
              : 'align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;border-bottom-left-radius:3px;') }, text);
      msgs.appendChild(b);
      msgs.scrollTop = msgs.scrollHeight;
      return b;
    }

    function extractText(data) {
      if (!data) return '';
      if (data.error) return '⚠ ' + (data.error.message || data.error);
      if (!Array.isArray(data.content)) return '';
      return data.content.map(function (c) { return c && c.type === 'text' ? c.text : ''; }).filter(Boolean).join('\n');
    }

    function callAnthropic() {
      return fetch(getUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM_PROMPT, tools: TOOLS, messages: history })
      }).then(function (r) { return r.json().catch(function () { return { error: 'Bad response (HTTP ' + r.status + ')' }; }); });
    }

    // Drives the tool-use loop: text → (optional tool calls → results) → text.
    function runConversation() {
      var guard = 0;
      function step() {
        return callAnthropic().then(function (data) {
          if (data.error) { addBubble('assistant', '⚠ ' + (data.error.message || data.error)); setStatus('Request failed.', '#b00'); return; }
          // Record the assistant turn exactly as returned (needed to match tool_use ids).
          history.push({ role: 'assistant', content: data.content });
          var text = extractText(data);
          if (text) addBubble('assistant', text);

          if (data.stop_reason === 'tool_use') {
            var toolUses = (data.content || []).filter(function (c) { return c.type === 'tool_use'; });
            var toolResults = toolUses.map(function (tu) {
              setStatus('Running: ' + tu.name + '…');
              var out = execTool(tu.name, tu.input);
              return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) };
            });
            history.push({ role: 'user', content: toolResults });
            if (guard++ < 6) return step();   // let Claude read the results and continue
            addBubble('assistant', '(stopped after several tool steps)');
            return;
          }
          setStatus('');
        });
      }
      return step();
    }

    function doSend() {
      if (sending) return;
      var text = (input.value || '').trim();
      if (!text) return;
      var url = getUrl();
      if (!url) { promptUrl(); if (!getUrl()) return; }

      input.value = '';
      history.push({ role: 'user', content: text });
      addBubble('user', text);
      sending = true; setStatus('Thinking…');
      send.disabled = true; send.style.opacity = '0.6';

      runConversation()
        .catch(function (err) {
          addBubble('assistant', '⚠ Could not reach the AI worker. Check the URL (⚙) and your connection.\n(' + err.message + ')');
          setStatus('Request failed.', '#b00');
        })
        .then(function () { sending = false; send.disabled = false; send.style.opacity = '1'; if (status.textContent === 'Thinking…') setStatus(''); });
    }

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    // Public handle (used by tests / other code)
    window.XKDGChat = {
      open: openPanel, close: closePanel, setUrl: setUrl, getUrl: getUrl,
      _send: doSend, _history: function () { return history; }
    };
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();

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
    'and OPERATE it via the provided tools, then explain results in plain language. You support Italian, English ' +
    'and French: detect the language of each user message (typed or spoken) and ALWAYS reply in that same ' +
    'language, switching if the user switches.\n\n' +
    'MAP OF THE APP (use it to guide on anything):\n' +
    '- Two wings: (1) Date selection (Bazi) and (2) Feng Shui. They are kept separate in setup and only ' +
    'meet as the ANSWER to a query.\n' +
    '- Date selection scans days/hours for the loaded person(s), optionally filtered by a Purpose ' +
    '(Health, Career, Wealth, Relationship, Journey, Speak, Legal). Tools: find_good_dates, open_scan_result, ' +
    'explain_purpose (read-only: tells how a purpose is coded - its required conditions, disqualifying spirits, ' +
    'bonuses, and the shared gates - when the user asks how Legal/Career/etc. is defined).\n' +
    '- SOFTENING A PURPOSE SCAN: after a purpose date scan (e.g. Legal/Career for signing a contract), if the ' +
    'soonest good date is far away (roughly >2 weeks), there are very few results, or the user says the dates are ' +
    'not practical, OFFER a softer search - e.g. "The strongest dates fully suited for this are a bit far; want me ' +
    'to also include nearer dates that are still positive but a little less specialised?". Only if the user agrees, ' +
    'call find_good_dates again with strictness="soft": present ONE list with the best strict matches on top ' +
    '(mark them as fully suited) and the nearer still-positive dates below (note they only partly fit the ' +
    'purpose). Never present softer dates as equal to the strict best, and never include non-positive dates.\n' +
    '- Feng Shui has three sections, each using its own data: WATER (door/house Facing + a moving-water ' +
    'position), BED (bed Sitting, must be Zheng Shen), DESK (desk Facing must be Zheng Shen + a Ling Shen ' +
    'water within +/-70 deg). Tools: find_water_dates, find_bed_dates, find_desk_dates; open_section to navigate.\n' +
    '- Flying stars live in the main Feng Shui sector; inside a section they are not repeated but can be ' +
    'recalled (recall_flying_stars).\n' +
    '- Houses store Facing/Period + doors + aquariums + saved section settings ("placements"). Tools: ' +
    'list_houses, set_active_house, load_house, load_placement. The active house follows the loaded person.\n' +
    '- Other panels: Qimen x Flying-Stars (open_qimen_for_flying_stars to pick a custom target; or ' +
    'find_qimen_hours_for_star to scan with a fixed favourable preset for one flying star), Chart finder ' +
    '(open_chart_finder), Direction calculator (open_direction_calculator), Travel planner (plan_travel computes ' +
    'direction + time windows for a journey; open_travel_planner only opens the blank road-route UI).\n' +
    '- get_app_state tells you what the user currently has loaded/typed.\n\n' +
    'RULES:\n' +
    '- Use every detail the user already gave (autonomy, departure time, city, etc.) and NEVER ask again for ' +
    'something already stated in the conversation. Ask a question only for essential information that is genuinely ' +
    'missing or ambiguous, and ask only for the missing piece.\n' +
    '- For anything that finds dates/hours or runs a scan: CALL A TOOL. Never invent dates or scores yourself ' +
    '- only report what a tool returns.\n' +
    '- Scans use whichever person(s) are loaded (A, B, or both); the user loads them by hand. If a tool says ' +
    'no person is loaded, ask the user to load Person A or B first.\n' +
    '- Keep answers concise: summarise the top few results (date, time/ganzhi, score) and offer to open one. ' +
    'If a tool returns an error, relay it briefly and suggest the fix.\n' +
    '- TRAVEL / ITINERARY from A to B: use ONE tool, plan_travel, passing dest_lat/lon (+dest_name), origin_lat/lon ' +
    '(+origin_name) from your knowledge of the places, and depart_hour. It returns the favorable direction + time ' +
    'windows AND, when both origin and destination are given, automatically opens the Travel Planner already filled ' +
    'and runs the real road route - you do NOT need a second call, and do NOT call open_travel_planner as well. ' +
    '(open_travel_planner is only for showing a blank planner.) Report the favorable window in chat and tell the ' +
    'user the planner is open and computing.\n' +
    '- AFTER plan_travel opens the planner: the full computed itinerary (origin→destination, distance, driving ' +
    'time, each leg and the stops/charging) appears in THIS chat automatically a few seconds later, as its own ' +
    'message with a "📍 Open in Google Maps" button the user taps to send it to Maps (charging stop included). So ' +
    'you only give a SHORT one-line intro (which departure time you used and that the itinerary is loading below). ' +
    'Do NOT paste the itinerary yourself, do NOT ask the user to fill anything, and do NOT call ' +
    'open_itinerary_in_maps - the button does that on tap. Hands-free is ON by default: a few seconds after each ' +
    'plan the app opens Google Maps by itself (they only tap "send to car" in Maps). If the user prefers to keep ' +
    'the planner open instead, tell them to untick "🚗 Hands-free" in the planner\'s "Send to Google Maps" section.\n' +
    '- DEPARTURE TIME - read the phrasing to tell FIXED from FLEXIBLE:\n' +
    '   • FIXED ("I leave at 11", "exactly/sharp", "tassativamente"): pass that exact depart_hour.\n' +
    '   • FLEXIBLE ("around 11", "11 or 12", "I have some margin", "whenever is best"): you may first call ' +
    'plan_travel with open_planner:false to read the favorable windows, pick the best depart_hour inside the ' +
    'allowed range, tell the user why, THEN call plan_travel again with that depart_hour (open_planner defaults on) ' +
    'to open the filled planner. If no time given, treat as flexible for the day.\n' +
    '- WHAT "BEST ITINERARY" MEANS: the most favorable configurations WITH the shortest practical travel time. ' +
    'The best itineraries are normally also the shortest - do NOT trade a lot of extra time for a small luck gain ' +
    '(e.g. never turn a ~10h trip into 16h just to catch a better window). Shifting departure inside the allowed ' +
    'window does not change the driving time, so prefer that; avoid choices that add long waits or detours, and ' +
    'when options are close pick the shorter/earlier one. Only lengthen the trip noticeably if the user explicitly ' +
    'says they want maximum luck regardless of time.\n' +
    '- For an electric car, if the user stated the autonomy/range, pass it as range_km - do NOT ask again. ' +
    'reserve_km is optional: if not given, omit it or assume ~20 km (say so briefly), never block to ask for it. ' +
    'When range_km is passed, the planner finds the charging stops automatically (Tesla + Electra) and adds the ' +
    'best to the Maps export - never tell the user to tap "Find charging stops". The only manual thing ever needed ' +
    'is saving their Open Charge Map key once; if it is missing the charging panel says so.\n' +
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
        'are loaded (A, B, or both). Omit purpose for a general scan. With a purpose, strictness="soft" returns ' +
        'the strict purpose matches on top (best/highest score) PLUS nearer dates that are still positive but only ' +
        'partly fit the purpose - use it only after the user accepts a softer search.',
      input_schema: {
        type: 'object',
        properties: {
          purpose: { type: 'string', enum: ['', 'health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'],
            description: 'Optional purpose; empty string for a general scan.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' },
          strictness: { type: 'string', enum: ['strict', 'soft'],
            description: 'strict (default) = only dates that fully meet the purpose. soft = strict matches on top, then nearer still-positive dates that only partly fit. Use soft only after the user agrees to a softer search.' }
        },
        required: []
      }
    },
    {
      name: 'explain_purpose',
      description: 'Explain how a date-selection Purpose is CODED in the app (its required conditions, the bad ' +
        'spirits that disqualify it, the scoring bonuses, and the shared gates common to all purposes). Read-only ' +
        'reference - use when the user asks "what are the conditions for Legal/Career/etc." or wants to recall how ' +
        'a purpose is defined. Omit purpose to get all of them.',
      input_schema: {
        type: 'object',
        properties: {
          purpose: { type: 'string', enum: ['', 'health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'],
            description: 'Which purpose to explain; empty/omitted returns all.' }
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
      description: 'Plan a journey from A to B: returns the favorable direction toward the destination and the ' +
        'favorable time windows (true-solar-time) to be travelling. Use for "plan an itinerary/route from A to B" ' +
        'and "good time/direction to go to X". Supply destination lat/lon and, if the user named a starting city, ' +
        'origin lat/lon (from your knowledge), plus names and depart_hour. When BOTH origin and destination are ' +
        'given it ALSO opens the full Travel Planner already filled and runs the real road route (set ' +
        'open_planner:false to only answer in chat without opening it). For an electric car pass range_km (and ' +
        'reserve_km) and it auto-finds Tesla/Electra charging stops in the planner.',
      input_schema: {
        type: 'object',
        properties: {
          dest_lat: { type: 'number', description: 'Destination latitude.' },
          dest_lon: { type: 'number', description: 'Destination longitude.' },
          dest_name: { type: 'string', description: 'Destination place name (for labels).' },
          origin_lat: { type: 'number', description: 'Origin latitude (defaults to saved GPS if omitted).' },
          origin_lon: { type: 'number', description: 'Origin longitude.' },
          origin_name: { type: 'string', description: 'Origin place name (for labels).' },
          depart_date: { type: 'string', description: 'Departure date YYYY-MM-DD (default today).' },
          depart_hour: { type: 'integer', description: 'Wall-clock start hour 0-23 (default 8).' },
          duration_h: { type: 'integer', description: 'Trip length in hours (default 12).' },
          range_km: { type: 'number', description: 'EV autonomy in km (enables auto charging-stop search in the planner).' },
          reserve_km: { type: 'number', description: 'EV safety reserve in km.' },
          open_planner: { type: 'boolean', description: 'Open + run the filled Travel Planner. Defaults true when both origin and destination are given.' }
        },
        required: ['dest_lat', 'dest_lon']
      }
    },
    {
      name: 'open_travel_planner',
      description: 'Open the full Travel Planner. If you pass the route (origin_lat/lon + dest_lat/lon, ideally with ' +
        'names and depart_date/depart_hour), it opens PRE-FILLED and immediately RUNS the real road plan. For an ' +
        'electric-car trip, also pass range_km (autonomy) and reserve_km (safety margin): the planner then ' +
        'automatically finds the charging stops (Tesla + Electra) and adds the best one to the Maps export - no ' +
        'manual button. This needs the user\'s Open Charge Map key saved once in the planner. Call with NO ' +
        'arguments to just show a blank planner. To get a quick direction/time answer without opening the panel, ' +
        'use plan_travel instead.',
      input_schema: {
        type: 'object',
        properties: {
          origin_lat: { type: 'number', description: 'Origin latitude (e.g. the starting city).' },
          origin_lon: { type: 'number', description: 'Origin longitude.' },
          origin_name: { type: 'string', description: 'Origin place name (for the result labels).' },
          dest_lat: { type: 'number', description: 'Destination latitude.' },
          dest_lon: { type: 'number', description: 'Destination longitude.' },
          dest_name: { type: 'string', description: 'Destination place name.' },
          depart_date: { type: 'string', description: 'Departure date YYYY-MM-DD (default today).' },
          depart_hour: { type: 'integer', description: 'Departure hour 0-23 (default 8).' },
          duration_h: { type: 'integer', description: 'Trip length in hours.' },
          range_km: { type: 'number', description: 'EV autonomy in km (for charging-stop search).' },
          reserve_km: { type: 'number', description: 'EV safety reserve in km kept before recharging.' },
          charges: { type: 'string', description: 'Optional manual charge times, comma-separated HH:MM (e.g. "14:30, 17:00x45").' }
        },
        additionalProperties: false
      }
    },
    {
      name: 'open_itinerary_in_maps',
      description: 'Open the most recently computed itinerary in Google Maps (origin → planned stops/charger → ' +
        'destination). Call this ONLY after the user has confirmed they accept the itinerary. It uses the route ' +
        'currently shown in the Travel Planner, including the auto-added charging stop.',
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
      if (name === 'explain_purpose') return toolExplainPurpose(input || {});
      if (name === 'open_scan_result') return toolOpenScanResult(input || {});
      if (name === 'find_bed_dates') return toolFindBedDates(input || {});
      if (name === 'find_desk_dates') return toolFindDeskDates(input || {});
      if (name === 'plan_travel') return toolPlanTravel(input || {});
      if (name === 'open_travel_planner') return toolOpenTravelPlanner(input || {});
      if (name === 'open_itinerary_in_maps') return toolOpenItineraryInMaps();
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

  // Read-only reference of how each Purpose is coded in checkPurpose() (kept in sync with app-bazi.js).
  var PURPOSE_SHARED_GATES = [
    'Score (after spirit bonuses) must be >= 4 (>= 1 only in test mode with no person loaded).',
    'A person (A or B) must be loaded.',
    'At least one XKDG relation must connect: Adding, Hetu, Pure Qi, Family, or Inverse Hexagram ("the loop closes").',
    '"Very Weak" dates are excluded from every purpose.',
    'A year-branch clash excludes the date, UNLESS Blood Link Family or Pure Qi is present (these override the clash).',
    'Auspicious spirits each add +2 to the score: Cerulean Dragon, Golden Box, Tian De, Fate Master, Lu.'
  ];
  var PURPOSE_RULES = {
    health: { name: 'Health',
      blocked_by: ['Heaven Penalty', 'White Tiger', 'Gou Chen'],
      requires: ['A Parent must be present somewhere in the date pillars.',
        'AND Tian Yi present, OR the date\'s day branch is the loaded person\'s Tian Yi (for their day stem).'],
      bonuses: ['+2 Cerulean Dragon (vitality)', '+2 Jade Hall (healing/comfort)', '+2 if the day pillar role is Parent'] },
    career: { name: 'Career',
      blocked_by: ['Red Bird', 'Heaven Prison', 'Gou Chen', 'Heaven Penalty'],
      requires: ['A Parent must be present in the date pillars.', 'AND Noble (Tian Yi / 天乙) must be present.'],
      bonuses: ['+2 Bright Hall (recognition)', '+2 Fate Master (official positions)', '+2 Lu (prosperity)', '+2 if the day pillar role is Parent'] },
    wealth: { name: 'Wealth',
      blocked_by: ['Black Tortoise', 'Heaven Prison'],
      requires: ['The date\'s day role must be Child.', 'AND a Parent must be present in the date pillars.'],
      bonuses: ['+2 Golden Box', '+2 Cerulean Dragon', '+2 Jade Hall',
        '+1 "wealth bonus" for each controlling (Ke) relationship: person day-stem controlling the date stem; the date stem controlling the hour/month/year stems; and the same on the qi/Nayin layer.'] },
    relationship: { name: 'Relationship',
      blocked_by: ['Heaven Penalty', 'Red Bird', 'Black Tortoise', 'Gou Chen'],
      requires: ['The date\'s day role must be Child.', 'AND (a Parent in the date pillars OR an Adding/Hetu relation).'],
      bonuses: ['+2 Cerulean Dragon'] },
    journey: { name: 'Journey',
      blocked_by: ['White Tiger', 'Heaven Prison', 'Gou Chen', 'Heaven Penalty'],
      requires: ['A Parent (father/mother role) must be present in the date pillars.',
        'AND, if a person is loaded, at least one date branch must be the person\'s Post Horse or Ding Spirit (travel stars).'],
      bonuses: ['+2 Cerulean Dragon', '+2 Jade Hall (moving house)', '+2 if the hour branch is the date\'s own Post Horse or Ding Spirit'] },
    speak: { name: 'Speak (public speaking / persuasion)',
      blocked_by: ['Heaven Penalty', 'Gou Chen', 'Red Bird'],
      requires: ['A good Person-Nayin link must be present (Nayin \u2726 Person).'],
      bonuses: ['+2 Jade Hall', '+2 Cerulean Dragon', '+2 if the date is its own Wen Chang (academic star)', '+2 if the date\'s day branch is the person\'s Wen Chang'] },
    legal: { name: 'Legal (signings, contracts, court)',
      blocked_by: ['Heaven Penalty', 'Red Bird', 'Gou Chen', 'Black Tortoise'],
      requires: ['Only the shared base (the loop closes + the common gates). No extra Parent/Noble requirement - so Legal is broader/softer than Career.'],
      bonuses: ['+2 Bright Hall (signings)', '+2 Fate Master (authority)', '+2 Heaven Virtue (protection)'] }
  };
  function toolExplainPurpose(input) {
    input = input || {};
    var p = (input.purpose || '').toLowerCase();
    if (p && PURPOSE_RULES[p]) {
      return { purpose: p, name: PURPOSE_RULES[p].name, conditions: PURPOSE_RULES[p],
        shared_gates: PURPOSE_SHARED_GATES,
        note: 'These are the coded conditions in checkPurpose. A date qualifies for this purpose only if it passes ALL the shared gates, is not blocked by the listed bad spirits, and meets the "requires" items. Explain them to the user in their language.' };
    }
    return { all_purposes: PURPOSE_RULES, shared_gates: PURPOSE_SHARED_GATES,
      note: 'Full reference of every purpose\'s coded conditions. If the user asked about one purpose, summarise just that one.' };
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
    var soft = (input.strictness === 'soft') && !!purpose;   // soft only makes sense with a purpose
    var ps = document.getElementById('purpose-select');
    var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days');
    if (ss) ss.value = todayIso();
    if (sd) sd.value = String(days);
    // This is a date scan, not a flight: make sure no direction filter is active.
    try { if (fsPalaceActive() && typeof window.fsClearDirectionFilter === 'function') window.fsClearDirectionFilter(); } catch (e) {}
    var both = pl.a && pl.b;
    function runWith(pv) {
      if (ps) { ps.value = pv; if (typeof window.onPurposeChange === 'function') try { window.onPurposeChange(); } catch (e) {} }
      window.runScanner();
      return (window._lastScanResults || []).slice();
    }
    function keyOf(r) { return r.isoDate + '#' + r.hourIndex; }
    function row(r, i, score, meets) {
      var o = { rank: i + 1, date: r.isoDate, time: r.time, score: (score != null ? score : r.score) };
      if (meets != null) o.meets_purpose = meets;
      if (both) { o.forA = r.scoreA > 0; o.forB = r.scoreB > 0; }
      return o;
    }

    if (!soft) {
      var res = runWith(purpose);
      return {
        strictness: purpose ? 'strict' : 'general',
        purpose: purpose || '(general)', days: days,
        persons_loaded: both ? 'A+B' : (pl.a ? 'A' : 'B'),
        count: res.length,
        results: res.slice(0, 15).map(function (r, i) { return row(r, i); })
      };
    }

    // SOFT scan: keep the strict purpose matches on top (their own score), then add the nearer
    // dates that are still positive (>=1, no bad spirit) but only partly fit the purpose.
    var strictRes = runWith(purpose);
    var strictScore = {}; strictRes.forEach(function (r) { strictScore[keyOf(r)] = r.score; });
    var generalRes = runWith('');                         // leaves the on-screen list on the broader positive set
    var seen = {};
    var merged = generalRes.map(function (r) {
      var k = keyOf(r); seen[k] = true;
      var meets = Object.prototype.hasOwnProperty.call(strictScore, k);
      return { isoDate: r.isoDate, time: r.time, scoreA: r.scoreA, scoreB: r.scoreB,
        score: meets ? strictScore[k] : r.score, meets_purpose: meets };
    });
    strictRes.forEach(function (r) { var k = keyOf(r); if (!seen[k]) merged.push({ isoDate: r.isoDate, time: r.time, scoreA: r.scoreA, scoreB: r.scoreB, score: r.score, meets_purpose: true }); });
    merged.sort(function (a, b) {
      if (a.meets_purpose !== b.meets_purpose) return a.meets_purpose ? -1 : 1; // strict/best first
      if (b.score !== a.score) return b.score - a.score;                         // then higher score
      return a.isoDate < b.isoDate ? -1 : (a.isoDate > b.isoDate ? 1 : 0);       // then sooner
    });
    return {
      strictness: 'soft', purpose: purpose, days: days,
      persons_loaded: both ? 'A+B' : (pl.a ? 'A' : 'B'),
      strict_count: strictRes.length, total_count: merged.length,
      note: 'Sorted list: the dates that FULLY meet the ' + purpose + ' purpose come first (meets_purpose=true, ' +
        'their own higher scores), then nearer dates that are still positive (score>=1, no bad spirit) but only ' +
        'partly fit the purpose (meets_purpose=false). All are auspicious - the softer ones are simply less ' +
        'specialised for ' + purpose + '.',
      results: merged.slice(0, 20).map(function (r, i) { return row(r, i, r.score, r.meets_purpose); })
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
    var today = todayIso();
    var dateStr = input.depart_date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr < today) dateStr = today; // ignore a hallucinated past/invalid date
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
    // For a real A→B itinerary, also open the planner already filled and run the road plan
    // (one reliable call instead of depending on a separate open_travel_planner call).
    var openPlanner = (input.open_planner != null) ? !!input.open_planner : (input.origin_lat != null && input.dest_lat != null);
    var baseOut = {
      direction_to_destination: { bearing: Math.round(plan.bearing) + '°', snapped: plan.snapDir },
      departure_planned: dateStr + ' ' + String(hour).padStart(2, '0') + ':00',
      duration_hours: durH,
      favorable_windows_count: windows.length,
      favorable_windows: windows.slice(0, 12)
    };
    if (openPlanner && origin && window.TravelPlanner && typeof window.TravelPlanner.openPrefilled === 'function') {
      try {
        window.TravelPlanner.openPrefilled({
          originLat: origin.lat, originLon: origin.lon, originName: input.origin_name || null,
          destLat: dest.lat, destLon: dest.lon, destName: input.dest_name || null,
          departDate: dateStr, departTime: String(hour).padStart(2, '0') + ':00',
          durationH: durH, utc: utc,
          rangeKm: (input.range_km != null) ? +input.range_km : null,
          reserveKm: (input.reserve_km != null) ? +input.reserve_km : null,
          run: true
        });
      } catch (e) {}
      baseOut.planner_opened = true;
      baseOut.note = 'The planner is open and computing the real road route' +
        ((input.range_km != null) ? ' and the Tesla/Electra charging stops' : '') +
        '. The full itinerary will appear in THIS chat by itself in a few seconds, with an "Open in Google Maps" ' +
        'button the user can tap. So give only a SHORT one-line intro now (e.g. which departure you used and that ' +
        'the itinerary is loading below) - do NOT paste the itinerary yourself, do NOT tell the user to fill ' +
        'anything, and do NOT call open_itinerary_in_maps (the button handles it).';
      return baseOut;
    }
    baseOut.planner_opened = false;
    baseOut.note = 'Straight-line estimate. For the real road route + Google Maps export, open the Travel Planner.';
    return baseOut;
  }
  function toolOpenTravelPlanner(input) {
    input = input || {};
    var hasRoute = input.origin_lat != null && input.origin_lon != null &&
                   input.dest_lat != null && input.dest_lon != null;
    if (hasRoute && window.TravelPlanner && typeof window.TravelPlanner.openPrefilled === 'function') {
      var today = todayIso();
      var dateStr = input.depart_date || today;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr < today) dateStr = today;
      var hour = (input.depart_hour != null) ? parseInt(input.depart_hour, 10) : 8;
      var utc = parseFloat((document.getElementById('utc-offset') || {}).value);
      if (isNaN(utc)) utc = 1;
      window.TravelPlanner.openPrefilled({
        originLat: +input.origin_lat, originLon: +input.origin_lon, originName: input.origin_name || null,
        destLat: +input.dest_lat, destLon: +input.dest_lon, destName: input.dest_name || null,
        departDate: dateStr, departTime: String(hour).padStart(2, '0') + ':00',
        durationH: (input.duration_h != null) ? parseInt(input.duration_h, 10) : null,
        utc: utc,
        rangeKm: (input.range_km != null) ? +input.range_km : null,
        reserveKm: (input.reserve_km != null) ? +input.reserve_km : null,
        charges: input.charges || null,
        run: true
      });
      return {
        opened: 'travel_planner_prefilled',
        filled: {
          origin: input.origin_name || (input.origin_lat + ',' + input.origin_lon),
          dest: input.dest_name || (input.dest_lat + ',' + input.dest_lon),
          depart: dateStr + ' ' + String(hour).padStart(2, '0') + ':00',
          range_km: (input.range_km != null) ? +input.range_km : null,
          reserve_km: (input.reserve_km != null) ? +input.reserve_km : null
        },
        note: 'The planner is open and computing the real road route. If range_km/reserve_km were given, it also ' +
          'runs the charging-stop search automatically (Tesla + Electra) and adds the best stop to the Google Maps ' +
          'export - no button to tap. This needs the user\'s Open Charge Map key to have been saved once in the ' +
          'planner; if it is missing, the charging panel will say so and they just paste the key there one time. ' +
          'Do NOT tell the user to press "Find charging stops" - it is automatic.'
      };
    }
    if (typeof window.tpOpen === 'function') { window.tpOpen(); return { opened: 'travel_planner_blank' }; }
    return { error: 'Travel Planner not available on this page.' };
  }
  function toolOpenItineraryInMaps() {
    if (window.TravelPlanner && typeof window.TravelPlanner.openInMaps === 'function') {
      return window.TravelPlanner.openInMaps();
    }
    return { ok: false, reason: 'planner_unavailable', note: 'Travel Planner not available on this page.' };
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
    var langSel = elc('select', { id: 'xkdg-ai-lang', title: 'Voice language',
      style: 'border:0;border-radius:6px;background:rgba(255,255,255,.18);color:#fff;font-size:12px;padding:2px 4px;cursor:pointer;' });
    [['auto', '🌐'], ['it', 'IT'], ['en', 'EN'], ['fr', 'FR']].forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1]; op.style.color = '#222';
      langSel.appendChild(op);
    });
    var gear = elc('button', { id: 'xkdg-ai-gear', title: 'Settings & backup',
      style: 'border:0;background:transparent;color:#fff;font-size:18px;cursor:pointer;' }, '⚙');
    var clearBtn = elc('button', { id: 'xkdg-ai-clear', title: 'Clear conversation',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '🗑');
    var speakerBtn = elc('button', { id: 'xkdg-ai-speak', title: 'Read replies aloud',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '🔇');
    var hfBtn = elc('button', { id: 'xkdg-ai-hf', title: 'Hands-free driving mode (wake word)',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '🚗');
    var closeBtn = elc('button', { id: 'xkdg-ai-close', title: 'Close',
      style: 'border:0;background:transparent;color:#fff;font-size:18px;cursor:pointer;' }, '✕');
    header.appendChild(langSel); header.appendChild(gear); header.appendChild(speakerBtn); header.appendChild(hfBtn); header.appendChild(clearBtn); header.appendChild(closeBtn);
    panel.appendChild(header);

    var msgs = elc('div', { id: 'xkdg-ai-msgs',
      style: 'flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#faf7fc;min-height:120px;' });
    panel.appendChild(msgs);

    var status = elc('div', { id: 'xkdg-ai-status', style: 'font-size:11px;color:#888;padding:0 12px;min-height:14px;' }, '');
    panel.appendChild(status);

    var inputRow = elc('div', { style: 'display:flex;gap:6px;padding:10px 12px;border-top:1px solid #eee;' });
    var input = elc('textarea', { id: 'xkdg-ai-input', rows: '1', placeholder: 'Ask something…',
      style: 'flex:1;resize:none;padding:8px;border:1px solid #ccc;border-radius:8px;font-size:14px;font-family:inherit;max-height:90px;' });
    var mic = elc('button', { id: 'xkdg-ai-mic', title: 'Speak your message',
      style: 'border:0;border-radius:8px;background:#ede7f3;color:#6a1b9a;font-size:18px;padding:8px 12px;cursor:pointer;' }, '🎤');
    var send = elc('button', { id: 'xkdg-ai-send',
      style: 'border:0;border-radius:8px;background:#6a1b9a;color:#fff;font-size:14px;font-weight:600;padding:8px 14px;cursor:pointer;' }, 'Send');
    inputRow.appendChild(input); inputRow.appendChild(mic); inputRow.appendChild(send);
    panel.appendChild(inputRow);

    document.body.appendChild(panel);

    // ── Voice: dictation (Speech-to-Text) + spoken replies (Text-to-Speech) ──
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var synth = window.speechSynthesis;
    var LANG_BCP = { it: 'it-IT', en: 'en-US', fr: 'fr-FR' };
    var selectedLang = 'auto';
    try { selectedLang = localStorage.getItem('xkdg_ai_lang') || 'auto'; } catch (e) {}
    // Language the mic listens in (recognition can't auto-detect, so the selector decides).
    function recogLang() {
      if (selectedLang !== 'auto' && LANG_BCP[selectedLang]) return LANG_BCP[selectedLang];
      return navigator.language || 'it-IT';
    }
    // Rough it/en/fr detection so spoken replies use the language of the REPLY.
    function detectLang(text) {
      var t = ' ' + String(text || '').toLowerCase().replace(/[^a-zàâäéèêëïîôöùûüç\s]/g, ' ') + ' ';
      var sets = {
        it: [' il ', ' lo ', ' gli ', ' che ', ' è ', ' sei ', ' oggi ', ' viaggio ', ' ore ', ' partenza ', ' buongiorno ', ' grazie ', ' direzione ', ' fortunato ', ' della '],
        en: [' the ', ' is ', ' you ', ' today ', ' travel ', ' hours ', ' leave ', ' hello ', ' thanks ', ' yes ', ' direction ', ' lucky ', ' route ', ' your '],
        fr: [' le ', ' la ', ' les ', ' est ', ' vous ', ' aujourd ', ' voyage ', ' heures ', ' partir ', ' bonjour ', ' merci ', ' oui ', ' direction ', ' chance ', ' votre ']
      };
      var best = null, bestN = 0;
      Object.keys(sets).forEach(function (k) {
        var n = 0; sets[k].forEach(function (w) { if (t.indexOf(w) >= 0) n++; });
        if (n > bestN) { bestN = n; best = k; }
      });
      return bestN >= 2 ? best : null;
    }
    function pickVoice(bcp) {
      try {
        var vs = (synth && synth.getVoices) ? synth.getVoices() : [];
        var two = bcp.slice(0, 2).toLowerCase();
        for (var i = 0; i < vs.length; i++) if ((vs[i].lang || '').toLowerCase().indexOf(two) === 0) return vs[i];
      } catch (e) {}
      return null;
    }
    try { if (synth && synth.getVoices) { synth.getVoices(); synth.onvoiceschanged = function () { try { synth.getVoices(); } catch (e) {} }; } } catch (e) {}
    var listening = false, recog = null, ttsOn = false;
    try { ttsOn = localStorage.getItem('xkdg_ai_tts') === '1'; } catch (e) {}

    // Voice-language selector (filled/handled here; the <select> was created in the header).
    if (typeof langSel !== 'undefined' && langSel) {
      langSel.value = selectedLang;
      langSel.addEventListener('change', function () {
        selectedLang = langSel.value || 'auto';
        try { localStorage.setItem('xkdg_ai_lang', selectedLang); } catch (e) {}
        setStatus('Voice language: ' + (selectedLang === 'auto' ? 'Auto' : selectedLang.toUpperCase()));
      });
    }

    function refreshSpeakerBtn() {
      speakerBtn.textContent = ttsOn ? '🔊' : '🔇';
      speakerBtn.title = ttsOn ? 'Replies read aloud (tap to mute)' : 'Read replies aloud';
    }
    refreshSpeakerBtn();
    if (!synth) speakerBtn.style.display = 'none';

    function speak(text) {
      if (!ttsOn || !synth || !text) return;
      try {
        var clean = String(text).replace(/[\u2600-\u27BF\uE000-\uF8FF\uD83C-\uDBFF\uDC00-\uDFFF✓✗•·→]/g, '').trim();
        if (!clean) return;
        synth.cancel();
        var u = new SpeechSynthesisUtterance(clean);
        // Speak in the language of the reply; fall back to the selected/auto language.
        var lc = detectLang(clean) || (selectedLang !== 'auto' ? selectedLang : ((navigator.language || 'en').slice(0, 2)));
        var bcp = LANG_BCP[lc] || navigator.language || 'en-US';
        u.lang = bcp;
        var v = pickVoice(bcp); if (v) u.voice = v;
        synth.speak(u);
      } catch (e) {}
    }
    function stopSpeaking() { try { if (synth) synth.cancel(); } catch (e) {} }

    speakerBtn.addEventListener('click', function () {
      ttsOn = !ttsOn;
      try { localStorage.setItem('xkdg_ai_tts', ttsOn ? '1' : '0'); } catch (e) {}
      if (!ttsOn) stopSpeaking();
      refreshSpeakerBtn();
      setStatus(ttsOn ? 'Replies will be read aloud.' : 'Voice replies off.');
    });

    if (!SR) {
      mic.style.display = 'none'; // dictation not supported in this browser
    } else {
      mic.addEventListener('click', function () {
        if (handsFree) { setStatus('Hands-free is on — just say your wake word.'); return; }
        if (listening) { try { recog && recog.stop(); } catch (e) {} return; }
        try {
          recog = new SR();
          recog.lang = recogLang();
          recog.interimResults = false;
          recog.maxAlternatives = 1;
          recog.onstart = function () { listening = true; mic.textContent = '🔴'; mic.style.background = '#ffd6d6'; setStatus('Listening…'); };
          recog.onerror = function (ev) { setStatus('Mic: ' + (ev && ev.error ? ev.error : 'error'), '#b00'); };
          recog.onend = function () { listening = false; mic.textContent = '🎤'; mic.style.background = '#ede7f3'; if (status.textContent === 'Listening…') setStatus(''); };
          recog.onresult = function (ev) {
            var t = '';
            for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
            t = (t || '').trim();
            if (t) { input.value = t; doSend(); }
          };
          stopSpeaking();
          recog.start();
        } catch (e) { setStatus('Mic not available: ' + e.message, '#b00'); }
      });
    }

    // ── Hands-free wake-word mode ("Hey Claude") for driving ──
    var handsFree = false, awaitingCmd = false, recogHF = null, hfStopping = false;
    var DEFAULT_WAKE = ['hey claude', 'hey cloud', 'hey clod', 'ehi claude', 'ehi cloud', 'ok claude', 'okay claude', 'ciao claude', 'a claude'];
    var customWake = null;
    try { customWake = (localStorage.getItem('xkdg_ai_wake') || '').trim().toLowerCase() || null; } catch (e) {}
    function wakeList() { return customWake ? [customWake] : DEFAULT_WAKE; }
    function wakeLabel() { return customWake || 'Hey Claude'; }
    function hfParse(transcript) {
      var t = (transcript || '').toLowerCase();
      var list = wakeList();
      for (var i = 0; i < list.length; i++) {
        var idx = t.indexOf(list[i]);
        if (idx >= 0) {
          var after = transcript.slice(idx + list[i].length).replace(/^[\s,.:;!?-]+/, '').trim();
          return { wake: true, command: after || null };
        }
      }
      return { wake: false, command: null };
    }
    function setWakeWord() {
      var cur = customWake || 'Hey Claude';
      var v = window.prompt('Wake word to activate hands-free (e.g. "Hey Claude"):', cur);
      if (v == null) return;
      v = v.trim();
      try {
        if (v) { customWake = v.toLowerCase(); localStorage.setItem('xkdg_ai_wake', v); }
        else { customWake = null; localStorage.removeItem('xkdg_ai_wake'); }
      } catch (e) {}
      setStatus('Wake word: "' + wakeLabel() + '"');
    }
    function refreshHfBtn() {
      hfBtn.textContent = handsFree ? '🟢' : '🚗';
      hfBtn.title = handsFree ? 'Hands-free ON — say your wake word (tap to stop; hold to change it)' : 'Hands-free driving mode (tap to start; hold to set the wake word)';
    }
    function startHF() {
      if (handsFree) return;
      handsFree = true; awaitingCmd = false; hfStopping = false;
      if (!ttsOn) { ttsOn = true; try { localStorage.setItem('xkdg_ai_tts', '1'); } catch (e) {} refreshSpeakerBtn(); }
      if (panel.style.display !== 'flex') panel.style.display = 'flex';
      refreshHfBtn();
      try {
        recogHF = new SR();
        recogHF.lang = recogLang();
        recogHF.continuous = true;
        recogHF.interimResults = false;
        recogHF.onresult = function (ev) {
          if (synth && synth.speaking) return;   // don't react to our own spoken reply
          if (sending) return;
          var last = ev.results[ev.results.length - 1];
          if (!last || !last.isFinal) return;
          var phrase = ((last[0] && last[0].transcript) || '').trim();
          if (!phrase) return;
          if (!awaitingCmd) {
            var p = hfParse(phrase);
            if (p.wake) {
              if (p.command) { input.value = p.command; doSend(); }
              else { awaitingCmd = true; setStatus('Listening for your command…'); speak('Sì?'); }
            }
          } else {
            awaitingCmd = false;
            input.value = phrase; doSend();
          }
        };
        recogHF.onerror = function (ev) {
          var e = ev && ev.error;
          if (e === 'not-allowed' || e === 'service-not-allowed') { setStatus('Microphone blocked.', '#b00'); stopHF(); }
        };
        recogHF.onend = function () {
          if (handsFree && !hfStopping) {
            try { recogHF.start(); }
            catch (e) { setTimeout(function () { try { if (handsFree) recogHF.start(); } catch (_) {} }, 400); }
          }
        };
        recogHF.start();
        setStatus('Hands-free on — say "'+wakeLabel()+'".');
        speak('Hands-free attivo. Di "' + wakeLabel() + '" quando vuoi.');
      } catch (e) { handsFree = false; refreshHfBtn(); setStatus('Hands-free not available: ' + e.message, '#b00'); }
    }
    function stopHF() {
      hfStopping = true; handsFree = false; awaitingCmd = false;
      try { if (recogHF) recogHF.stop(); } catch (e) {}
      recogHF = null; refreshHfBtn(); setStatus('Hands-free off.');
    }
    if (!SR) { hfBtn.style.display = 'none'; }
    else {
      refreshHfBtn();
      var hfHold = null, hfHeld = false;
      hfBtn.addEventListener('click', function () { if (hfHeld) { hfHeld = false; return; } handsFree ? stopHF() : startHF(); });
      hfBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); setWakeWord(); });
      hfBtn.addEventListener('touchstart', function () { hfHeld = false; hfHold = setTimeout(function () { hfHeld = true; setWakeWord(); }, 600); }, { passive: true });
      hfBtn.addEventListener('touchend', function () { if (hfHold) { clearTimeout(hfHold); hfHold = null; } });
      hfBtn.addEventListener('touchmove', function () { if (hfHold) { clearTimeout(hfHold); hfHold = null; } });
    }

    function openPanel() {
      panel.style.display = 'flex';
      if (!getUrl()) promptUrl();
      input.focus();
    }
    function closePanel() { stopSpeaking(); if (handsFree) stopHF(); panel.style.display = 'none'; }

    btn.addEventListener('click', function () { panel.style.display === 'flex' ? closePanel() : openPanel(); });
    closeBtn.addEventListener('click', closePanel);
    gear.addEventListener('click', openSettings);
    clearBtn.addEventListener('click', function () { history = []; msgs.innerHTML = ''; setStatus(''); });

    function promptUrl() {
      var cur = getUrl();
      var u = window.prompt('Paste your AI worker URL (e.g. https://xkdg-ai.you.workers.dev):', cur || 'https://');
      if (u != null) { setUrl(u); setStatus(getUrl() ? 'AI worker URL saved.' : 'No URL set.'); }
    }
    // ---- Backup / Restore: copy every per-device setting (localStorage) to another device ----
    function lsExportText() {
      var o = {};
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); o[k] = localStorage.getItem(k); } } catch (e) {}
      return JSON.stringify({ _xkdg_backup: 1, v: 1, ts: Date.now(), data: o });
    }
    function lsImportText(text) {
      var parsed = JSON.parse(text);
      var data = (parsed && parsed.data) ? parsed.data : parsed;
      if (!data || typeof data !== 'object') throw new Error('not a backup');
      var n = 0;
      Object.keys(data).forEach(function (k) { try { localStorage.setItem(k, data[k]); n++; } catch (e) {} });
      return n;
    }
    function openSettings() {
      if (document.getElementById('xkdg-ai-settings')) return;
      var ov = elc('div', { id: 'xkdg-ai-settings', style: 'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;' });
      var card = elc('div', { style: 'background:#fff;border-radius:12px;max-width:520px;width:100%;padding:16px 18px;font-family:system-ui,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3);' });
      var hd = elc('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;' });
      hd.appendChild(elc('h3', { style: 'margin:0;font-size:16px;color:#4a148c;' }, '\u2699 Settings & backup'));
      var x = elc('button', { style: 'border:0;background:transparent;font-size:20px;cursor:pointer;color:#888;' }, '\u2715');
      x.addEventListener('click', function () { ov.remove(); });
      hd.appendChild(x); card.appendChild(hd);

      // AI worker URL
      card.appendChild(elc('div', { style: 'font-size:12px;font-weight:700;color:#555;margin:6px 0 3px;' }, 'AI worker URL'));
      var urlRow = elc('div', { style: 'display:flex;gap:6px;' });
      var urlInp = elc('input', { type: 'text', value: getUrl(), style: 'flex:1;min-width:0;padding:7px;border:1px solid #ccc;border-radius:6px;font-size:13px;' });
      var urlSave = elc('button', { style: 'padding:7px 12px;border:0;border-radius:6px;background:#6a1b9a;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, 'Save');
      urlSave.addEventListener('click', function () { setUrl(urlInp.value); urlSave.textContent = '\u2713'; setTimeout(function () { urlSave.textContent = 'Save'; }, 1200); });
      urlRow.appendChild(urlInp); urlRow.appendChild(urlSave); card.appendChild(urlRow);

      card.appendChild(elc('hr', { style: 'border:0;border-top:1px solid #eee;margin:14px 0;' }));

      // BACKUP (this device -> text)
      card.appendChild(elc('div', { style: 'font-size:13px;font-weight:700;color:#1565c0;margin:0 0 3px;' }, '\u2b06\ufe0f Copy all settings to another device'));
      card.appendChild(elc('div', { style: 'font-size:11px;color:#777;margin-bottom:6px;line-height:1.5;' },
        'This text holds every setting saved on THIS device (OCM key, worker URL, saved houses, FS settings, preferences, planner unlock, etc.). Copy it and paste it into the Restore box on your other device. Keep it private - it contains your keys.'));
      var exp = elc('textarea', { readonly: 'readonly', style: 'width:100%;height:64px;box-sizing:border-box;padding:7px;border:1px solid #ccc;border-radius:6px;font-size:11px;font-family:monospace;' });
      exp.value = lsExportText();
      card.appendChild(exp);
      var expRow = elc('div', { style: 'display:flex;gap:6px;margin-top:6px;' });
      var copyB = elc('button', { style: 'flex:1;padding:8px;border:0;border-radius:6px;background:#1565c0;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, '\ud83d\udccb Copy');
      var dlB = elc('button', { style: 'flex:1;padding:8px;border:1px solid #1565c0;border-radius:6px;background:#fff;color:#1565c0;font-size:13px;font-weight:600;cursor:pointer;' }, '\u2b07 Download');
      copyB.addEventListener('click', function () {
        try { exp.focus(); exp.select(); } catch (e) {}
        var done = function () { copyB.textContent = '\u2713 Copied'; setTimeout(function () { copyB.textContent = '\ud83d\udccb Copy'; }, 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exp.value).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) {} });
        else { try { document.execCommand('copy'); done(); } catch (e) {} }
      });
      dlB.addEventListener('click', function () {
        try { var blob = new Blob([exp.value], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'xkdg-settings-backup.json'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {}
      });
      expRow.appendChild(copyB); expRow.appendChild(dlB); card.appendChild(expRow);

      card.appendChild(elc('hr', { style: 'border:0;border-top:1px solid #eee;margin:14px 0;' }));

      // RESTORE (paste text -> this device)
      card.appendChild(elc('div', { style: 'font-size:13px;font-weight:700;color:#2e7d32;margin:0 0 3px;' }, '\u267b\ufe0f Restore on this device'));
      card.appendChild(elc('div', { style: 'font-size:11px;color:#777;margin-bottom:6px;line-height:1.5;' },
        'Paste the backup text from your other device, then Restore. The app reloads with all those settings. Current settings on THIS device are overwritten.'));
      var imp = elc('textarea', { placeholder: 'Paste the backup text here\u2026', style: 'width:100%;height:64px;box-sizing:border-box;padding:7px;border:1px solid #ccc;border-radius:6px;font-size:11px;font-family:monospace;' });
      card.appendChild(imp);
      var impStatus = elc('div', { style: 'font-size:11px;margin-top:4px;min-height:14px;' }, '');
      card.appendChild(impStatus);
      var restoreB = elc('button', { style: 'width:100%;margin-top:6px;padding:9px;border:0;border-radius:6px;background:#2e7d32;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, '\u267b\ufe0f Restore & reload');
      restoreB.addEventListener('click', function () {
        var t = (imp.value || '').trim();
        if (!t) { impStatus.style.color = '#b58900'; impStatus.textContent = 'Paste the backup text first.'; return; }
        var n;
        try { n = lsImportText(t); } catch (e) { impStatus.style.color = '#b00'; impStatus.textContent = 'That text is not a valid backup.'; return; }
        if (!window.confirm('Restore ' + n + ' settings and reload the app? Settings on THIS device will be overwritten.')) return;
        try { location.reload(); } catch (e) {}
      });
      card.appendChild(restoreB);

      ov.appendChild(card); document.body.appendChild(ov);
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
      if (!mine) speak(text);
      return b;
    }
    // Injected by the Travel Planner when it finishes computing an AI-opened trip:
    // shows the itinerary in the chat plus a one-tap "Open in Google Maps" button
    // (a real user tap, so the browser will not block the pop-up).
    function addItineraryBubble(payload) {
      payload = payload || {};
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:14px;line-height:1.45;' +
        'white-space:pre-wrap;word-wrap:break-word;' });
      if (payload.text) wrap.appendChild(elc('div', null, payload.text));
      var mapsBtn = elc('button', { style:
        'margin-top:9px;width:100%;padding:9px;border:0;border-radius:8px;background:#1565c0;color:#fff;' +
        'font-size:13px;font-weight:600;cursor:pointer;' }, '📍 Open in Google Maps');
      mapsBtn.addEventListener('click', function () {
        var r = null;
        try { if (window.TravelPlanner && window.TravelPlanner.openInMaps) r = window.TravelPlanner.openInMaps(); } catch (e) {}
        if (r && r.opened === false) mapsBtn.textContent = '⚠ Pop-up blocked — use “Open in Google Maps” in the planner';
        else if (r && r.ok === false) mapsBtn.textContent = '⚠ No itinerary yet';
        else mapsBtn.textContent = '✓ Opened in Google Maps';
      });
      wrap.appendChild(mapsBtn);
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
      if (payload.text) speak(payload.text);
      return wrap;
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
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM_PROMPT + '\n\nToday is ' + todayIso() + '.', tools: TOOLS, messages: history })
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
            var resultPromises = toolUses.map(function (tu) {
              setStatus('Running: ' + tu.name + '…');
              return Promise.resolve().then(function () { return execTool(tu.name, tu.input); })
                .then(function (out) { return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) }; })
                .catch(function (e) { return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ error: String((e && e.message) || e) }) }; });
            });
            return Promise.all(resultPromises).then(function (toolResults) {
              history.push({ role: 'user', content: toolResults });
              if (guard++ < 6) return step();   // let Claude read the results and continue
              addBubble('assistant', '(stopped after several tool steps)');
            });
          }
          setStatus('');
        });
      }
      return step();
    }

    function doSend() {
      if (sending) return;
      stopSpeaking();
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
      addItinerary: function (payload) { try { openPanel(); return addItineraryBubble(payload); } catch (e) { return null; } },
      _send: doSend, _history: function () { return history; }
    };
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();

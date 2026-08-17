// redeploy bump 2026-07-04b — force redeploy (no logic change)
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
  var MODEL = 'claude-sonnet-4-6'; // change here if you prefer another model
  var MAX_TOKENS = 4096;

  // System prompt: app-wide assistant that ANSWERS about and OPERATES the whole app.
  // System prompt, spezzato per area (sessione 26). Il NUCLEO viaggia sempre; ogni altro
  // segmento parte solo con la sua area (o con un'area tirata dentro da load_tools).
  // Il testo e' identico all'originale: systemPromptFor(tutte le aree) === vecchio SYSTEM_PROMPT.
  var SP_SEG = [
    ["core",
    
      'You are the assistant built into the "XKDG Bazi Calculator", a PWA for Bazi, Feng Shui and ' +
      'Qimen Dun Jia date/direction selection. You can both ANSWER questions about any part of the app ' +
      'and OPERATE it via the provided tools, then explain results in plain language. You support Italian, English ' +
      'and French: detect the language of each user message (typed or spoken) and ALWAYS reply in that same ' +
      'language, switching if the user switches.\n\n' +
      'MAP OF THE APP (use it to guide on anything):\n' +
      '- Two wings: (1) Date selection (Bazi) and (2) Feng Shui. They are kept separate in setup and only ' +
      'meet as the ANSWER to a query.\n'
    ],
    ["dates",
      '- Date selection scans days/hours for the loaded person(s), optionally filtered by a Purpose ' +
      '(Health, Career, Wealth, Relationship, Journey, Speak, Legal). Tools: find_good_dates, open_scan_result, ' +
      'explain_purpose (read-only: returns the approved guide for a purpose — the SAME content the 📖 button ' +
      'shows). CALL IT whenever the user asks what makes a good DATE for a purpose ("cosa costituisce una buona ' +
      'data per Health?", "what makes a good date for Career?", "comment choisir une bonne date pour…"), how a ' +
      'purpose is DEFINED/coded, or how to ACTIVATE it in Feng Shui — in any language. Then present BOTH parts of ' +
      'the returned `guide`: (1) the good DATE criteria (good_date_xkdg) and (2) the Feng Shui ACTIVATION ' +
      '(feng_shui_activation_qmdj: door, QMDJ stars/spirits, flying stars), followed by the general_rules. Do not ' +
      'invent criteria — report only what the tool returns).\n'
    ],
    ["travel",
      '- FLIGHT / TRIP DATE QUERIES (e.g. "good dates to fly from Vienna to Sydney in July and August, flights only ' +
      'on Sun/Tue/Thu/Sat, departure 10:25"): answer with ONE find_good_dates call set up like this:\n' +
      '   • purpose = "journey" (it is travel).\n' +
      '   • The named month(s) -> set start_date to the first day of the first month (or today if that month is ' +
      'already running) and days to reach the end of the last month (about 31 per month; e.g. July+August from ' +
      '2026-07-01 -> days 62). start_date cannot be in the past.\n' +
      '   • The allowed flight days -> weekdays (e.g. ["sun","tue","thu","sat"]).\n' +
      '   • Then present the returned dates (best score first), each with its date and weekday. Map the stated ' +
      'departure clock time to its Chinese double-hour and say it, e.g. 10:25 -> Si hour (09:00-11:00); 23:00-01:00 ' +
      'Zi, 01-03 Chou, 03-05 Yin, 05-07 Mao, 07-09 Chen, 09-11 Si, 11-13 Wu, 13-15 Wei, 15-17 Shen, 17-19 You, ' +
      '19-21 Xu, 21-23 Hai. If the user fixed a departure time, note that the date is favourable and offer to open a ' +
      'specific date (open_scan_result) to check that exact hour. You may also mention the favourable DIRECTION ' +
      'toward the destination as a note, but for a FLIGHT do NOT open the driving Travel Planner (plan_travel opens ' +
      'the road planner - use it only for actual road trips).\n' +
      '- FIND A FAVOURABLE FLIGHT (e.g. "find me a lucky flight from Sydney to Gold Coast on 20 Aug"): call ONE ' +
      'scan_flights with origin_name/dest_name + origin_lat/lon + dest_lat/lon (from your knowledge), the airport ' +
      'IATA codes when you know them (Sydney SYD, Gold Coast OOL) and depart_from = the date (add depart_to for a ' +
      'window). It opens the flight panel, fills it and RUNS the scan; the favourable days/takeoffs are shown in-app ' +
      '(do NOT invent flights or times). For the return leg call scan_flights again with leg:"return" and ' +
      'return_from/return_to. Use scan_flights (not find_good_dates) whenever the user wants an actual FLIGHT on a route.\n' +
      '   • If too few dates come back, offer the soft search (strictness:"soft").\n' +
      '- TRIPS ON CERTAIN DAYS: in general, pass weekdays to find_good_dates to keep only those days; a clock time ' +
      'maps to the double-hour above.\n'
    ],
    ["dates",
      '- SOFTENING A PURPOSE SCAN: after a purpose date scan (e.g. Legal/Career for signing a contract), if the ' +
      'soonest good date is far away (roughly >2 weeks), there are very few results, or the user says the dates are ' +
      'not practical, OFFER a softer search - e.g. "The strongest dates fully suited for this are a bit far; want me ' +
      'to also include nearer dates that are still positive but a little less specialised?". Only if the user agrees, ' +
      'call find_good_dates again with strictness="soft": present ONE list with the best strict matches on top ' +
      '(mark them as fully suited) and the nearer still-positive dates below (note they only partly fit the ' +
      'purpose). Never present softer dates as equal to the strict best, and never include non-positive dates.\n'
    ],
    ["fengshui",
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
      'direction + time windows for a journey; open_travel_planner only opens the blank road-route UI).\n'
    ],
    ["core",
      '- get_app_state tells you what the user currently has loaded/typed.\n'
    ],
    ["travel",
      '- ARCHITECTURE YOU MUST KNOW (so you never claim credit or blame for things you did not do):\n' +
      '  (a) When you call plan_travel, you receive ONLY favourable windows + a note. You do NOT receive stop names, ' +
      'charger names, or the itinerary text. You write ONE short sentence and stop.\n' +
      '  (a2) FAVOURABLE COUNT — one rule: an hour is FAVOURABLE when it is a CASH hour (road direction fortunate) OR a ' +
      'DETOUR hour (an adjacent fortunate direction is used). When you mention how favourable a trip is, ALWAYS count ' +
      'cash + detour together (e.g. "5/7 favourable: 2 cash + 3 detour"), exactly like the itinerary card\u2019s fav_summary. ' +
      'NEVER report the pure-cash count alone (saying "2/7" when the card shows 5 coloured hours confuses the user).\n' +
      '  (b) The NUMBERED ITINERARY CARD (1. Drive… 2. Stop… 3. Drive…) that appears in the chat is built by ' +
      'JAVASCRIPT CODE (addItineraryBubble + tpStoreLastResult), NOT by you. You did not write it.\n' +
      '  (c) The CHARGER NAMES in that card (e.g. "Villach Supercharger", "Free To X AdS Adige Est") are filled ' +
      'ASYNCHRONOUSLY by tpFindChargerStop, which queries the OpenChargeMap API for the nearest real fast charger to ' +
      'each planned stop point. These names come from an external EV charger DATABASE, not from you. You never see ' +
      'them and you never wrote them.\n' +
      '  (d) Therefore: if the user says "you wrote Villach Supercharger" or "you put the wrong charger name", the ' +
      'CORRECT answer is: "I did not write the charger names — they are filled by the app\'s code from the ' +
      'OpenChargeMap database, based on the nearest fast charger to each planned stop. If a name seems wrong, it ' +
      'means the database lists that charger under that name, or the nearest charger to the planned point happens ' +
      'to be in a different area." NEVER say "I invented it" or "I was wrong" for content you did not produce.\n' +
      '  (e) The Google Maps link is also built by JavaScript (collectWaypoints), not by you. If Maps shows a ' +
      'different route, call diagnose_maps_export to see what waypoints actually made it into the link.\n'
    ],
    ["core",
      '- SOURCE / "HOW IS THIS BUILT" / CURRENT STATUS: you can read the app\'s OWN code. When the user asks how a ' +
      'feature is really implemented, why the app behaves a certain way, what the current state/version of some part ' +
      'is, or to check the actual logic ("come è fatta la porta legale?", "how does plan_travel pick the hour?", ' +
      '"qual è lo stato di X nel codice?"), FIRST call list_source, then read_source on the relevant file(s) — use ' +
      'the `search` argument (a function name or keyword) for big files instead of dumping the whole thing. The files ' +
      'are fetched LIVE from GitHub (branch main), so they reflect the latest PUSHED code; answer from what you read, ' +
      'cite the file (and line if useful), and never guess about internals you have not read. This reading is ' +
      'on-demand: you see changes once they are pushed (GitHub may lag a few minutes right after a push), not local ' +
      'unpushed edits. For "what can you do?" you may also summarise your available tools. Do NOT read source for ' +
      'ordinary date/Feng-Shui questions — use the dedicated tools and explain_purpose for those.\n' +
      '  \u2022 LIMITS OF READING THE SOURCE (absolute): it shows only the app\u2019s own root files. It can NEVER ' +
      'show the state of a device, a stored schedule, or anything living in a Cloudflare Worker \u2014 and a rule you ' +
      'cannot find there may simply sit in a tool you are not currently carrying. So NEVER conclude from the source ' +
      'that a feature does not exist or never happens. If the question is about a capability of ANOTHER area ' +
      '(aquarium light, trips, water, dates), call load_tools for that area FIRST and answer with its tools; the ' +
      'source is the last resort, not the first.\n'
    ],
    ["travel",
      '- WHY GOOGLE MAPS DIFFERS / what the A,B,C pins are / a planned stop is missing in Maps: the PLANNED ' +
      'ITINERARY is correct — the charger stops it shows are real. The question is what happens when the itinerary ' +
      'is TRANSLATED into a Google Maps link. ALWAYS call diagnose_maps_export FIRST, then explain from the data: ' +
      'which waypoints actually made it into the link (named = tappable pin Maps is forced through; coordinate = ' +
      'anonymous lettered pin), which ones were dropped (off the fast road or capped), whether the real route matches ' +
      'the trip, and that Google re-routes between the points it received with live traffic (so small differences are ' +
      'normal, not a bug). A per-segment time like "3 hr 37 min" is ONE LEG, not the whole trip. ' +
      'NEVER say "I was wrong" or "Google Maps is right and I was wrong" — the itinerary and the Maps link are two ' +
      'different things; diagnose which waypoints were lost in translation. ' +
      'If you want the exact export code, read_source travel-planner.js (search "collectWaypoints").\n' +
      '- When the user asks about a SPECIFIC stop or point of the planned road trip ("dove avviene la sosta 2?", "where is ' +
      'stop 2?", "qual è la seconda tappa?"), call get_trip_itinerary and answer DIRECTLY with that stop\'s real place name and ' +
      'coordinates and time (index 2 = "punto 2"). NEVER deflect with "look at the card" or "scroll down".\n' +
      '- EXPANDED VIEW: get_app_state returns expanded_view (the 🔬 toggle). When it is TRUE and the user chooses a DIRECTION or a ' +
      'route (Directions / Travel Planner / Lucky Trip), call analyze_direction for that direction (use the trip\'s date and ' +
      'departure time) and add a short "🔬 Dettaglio direzionale" section: the starting-palace qi-flow (intention/emotion/remedy) ' +
      'and any alerts (stem clash/combination with the destination; Tai Sui authority at the destination). When expanded_view is ' +
      'FALSE, keep the answer light and do NOT add this section (you may briefly offer it). Also run analyze_direction whenever the ' +
      'user explicitly asks to analyse a direction, regardless of the toggle.\n'
    ],
    ["dates",
      '- DIVINATION chart finding: when the user wants a future chart that satisfies QMDJ conditions (a stem in a palace / in any ' +
      'of several palaces, a door in a palace) — e.g. "find a chart where Bing is in Li, Injury in Gen, and Geng can be in Gen, ' +
      'Xun, Dui or Qian" — call find_divination_chart with those conditions and list the matching date/double-hours. Translate ' +
      'the user\'s plain wording into stems[] and doors[] conditions; a querent who "can stay in X, Y or Z" becomes one stem ' +
      'condition with palaces:[X,Y,Z].\n\n'
    ],
    ["core",
      'RULES:\n' +
      '- INVESTIGATE, NEVER APOLOGIZE BLINDLY. When the user reports something unexpected (a wrong route, a missing ' +
      'stop, a discrepancy, an error), your FIRST move is to CALL A DIAGNOSTIC TOOL (diagnose_maps_export, ' +
      'get_app_state, read_source) and look at the actual data. NEVER say "I was wrong" or "you are right, sorry" ' +
      'without having checked. Saying sorry without investigating is the WORST answer — it gives the user zero ' +
      'information. Instead: investigate → state what you found → explain what is happening and why → suggest a fix ' +
      'if one exists. If after investigating you genuinely find an error, explain what caused it. If there is no ' +
      'error (just a misunderstanding, or expected behaviour), explain that clearly and kindly. Be honest, not ' +
      'obsequious. The user is a domain expert who values precision over politeness.\n' +
      '- CRITICAL: When the user says "YOU wrote X" or "YOU made this mistake", STOP and think: did I actually ' +
      'produce that text, or was it produced by the app\'s JavaScript code? The numbered itinerary card, the charger ' +
      'names, the Google Maps link — all produced by CODE, not by you. If you did not produce it, say so clearly: ' +
      '"That text was produced by the app\'s code, not by me. Let me investigate where it came from." Then use the ' +
      'diagnostic tools. NEVER falsely accept blame for output you did not generate.\n' +
      '- NEVER INVENT FACTS. If you do not know something, say so and use a tool to find out. Never guess at ' +
      'internal mechanics, route details, or app behaviour — read_source and the diagnostic tools exist for this. ' +
      'A wrong confident answer is far worse than "let me check".\n' +
      '- Use every detail the user already gave (autonomy, departure time, city, etc.) and NEVER ask again for ' +
      'something already stated in the conversation. Ask a question only for essential information that is genuinely ' +
      'missing or ambiguous, and ask only for the missing piece.\n' +
      '- For anything that finds dates/hours or runs a scan: CALL A TOOL. Never invent dates or scores yourself ' +
      '- only report what a tool returns.\n' +
      '- Scans use whichever person(s) are loaded (A, B, or both); the user loads them by hand. If a tool says ' +
      'no person is loaded, ask the user to load Person A or B first.\n' +
      '- Keep answers concise: summarise the top few results (date, time/ganzhi, score) and offer to open one. ' +
      'If a tool returns an error, relay it briefly and suggest the fix. Never pad answers with apologies, ' +
      'disclaimers, or filler ("I hope this helps", "Let me know if…"). State the facts, explain clearly, stop.\n' +
      '- FORMATTING for any list of dates or hours: do NOT use Markdown tables (they render cramped and unreadable on ' +
      'the phone). List each option as its own short block, and ALWAYS put a BLANK LINE between options so they are ' +
      'clearly separated. Example:\n' +
      '  🥇 **11:55\u201313:55** \u00b7 Wu \u5348 \u00b7 score 5\n' +
      '  Open Door \u958b \u00b7 San Qi Yi \u4e59 \u00b7 Zhi Shi\n' +
      '\n' +
      '  🥈 **23:55\u201301:55** \u00b7 Zi \u5b50 \u00b7 score 3\n' +
      '  ...\n' +
      'Keep each block to one or two short lines; never put options in a single dense paragraph or a table.\n' +
      '- HOUR TIMES from find_water_hours / find_qimen_hours_for_star: the `hour` field is the REAL LOCAL CLOCK window ' +
      '(true solar time, DST-adjusted \u2014 the same convention as the BEST/LIST date pages, NOT the textbook ' +
      '23:00-01:00 ranges). Report `hour` exactly as returned, and never recompute or "round" a double-hour clock time yourself.\n'
    ],
    ["travel",
      '- "LUCKY TRIP" IS A DEDICATED COMMAND PHRASE. Whenever the user writes or says "lucky trip" in ANY case or ' +
      'language ("lucky trip", "Lucky Trip", "un lucky trip", "il mio lucky trip", "giro fortunato"), it ALWAYS means: ' +
      'call plan_lucky_day_trip and DECIDE EVERYTHING yourself — do NOT ask where to go. The tool itself chooses the ' +
      'direction, destination, departure time, stay length and return. The same applies to equivalent no-destination ' +
      'phrasings ("un giro fortunato di qualche ora", "dove posso andare oggi di fortunato", "find me a lucky trip out ' +
      'of town", "where could I go today"). Pass only what the user gave (origin if you know it, max_radius_km, ' +
      'stay_min_h/stay_max_h, and direction if the user named one e.g. "verso nord" → direction:"N") and let the tool decide ' +
      'everything else. Then present the returned proposals as ' +
      'several DISTINCT options (varying by direction, distance and stay) with their scores; the user picks one and you run it ' +
      'with plan_travel using THAT option\'s dest_lat/dest_lon. A unidirectional (out-and-back) option is ONE round trip, NOT an ' +
      '"A-to-B only" trip: when the user picks one, plan BOTH legs \u2014 the OUTBOUND with plan_travel to the option\'s dest, AND the ' +
      'RETURN with a second plan_travel from that dest back to the origin departing in the option\'s ALREADY-COMPUTED favourable return ' +
      'window (return_depart) \u2014 and present them together as a single andata-e-ritorno (outbound + stay + return). Do NOT apologise, ' +
      'do NOT say the planner "only does A to B" or cannot do the round trip (the Lucky Trip already found BOTH favourable legs), and do ' +
      'NOT offer chains as a substitute for a unidirectional request (chains are the SEPARATE ring category \u2014 only mention them if the ' +
      'user asks). Use plan_travel (which needs a destination) ONLY when the user ' +
      'names a specific place. Never tell the user a lucky trip needs a destination. If the user wants a KIND of place ' +
      '("in natura", "una passeggiata", "culturale", "castelli", "borghi") OR asks to filter the proposals afterwards ' +
      '("ora solo natura"), pass the category parameter and call again with the SAME other parameters — each proposal ' +
      'then becomes a real named place. When a proposal has a "place", show that name as the destination. ' +
      '- COASTAL / LAKESIDE BASES: real named places come from Google Places and are ALWAYS ON LAND; never invent a place name ' +
      '(no made-up benches, beaches or spots). When the base is by the sea or a lake, a favourable direction that points toward ' +
      'OPEN WATER has no reachable land destination \u2014 do NOT present a bare geometric point there and do NOT fabricate a ' +
      'place; skip that direction (or say plainly it points offshore) and keep the options that resolve to a REAL land place. ' +
      'Prefer any_poi:true / category so every option snaps to a real place instead of an empty coordinate over water. ' +
      'A Lucky Trip answer ALWAYS contains a "chains" field too: multi-leg lucky LOOPS, one per stop-count. When NO direction is ' +
      'requested, present the WHOLE answer together: FIRST the simple out-and-back options, THEN a "🔗 Tragitti a catena" section ' +
      'with the loops ordered by increasing stops (1-stop, then 2, 3, 4). When the user DID request a direction (e.g. "verso nord" → ' +
      'direction:"N"), the tool applies a strict priority: it returns out-and-back trips toward that direction AND chain loops heading ' +
      'that way; "direction_satisfied":true means everything shown DOES head that way — present it as the answer (round-trips first, ' +
      'then chains by stops). Only if NOTHING heads that way (no round-trip AND no chain) does it return "direction_satisfied":false ' +
      'with ALTERNATIVE directions — in that case tell the user plainly FIRST that their direction is not available today, then show ' +
      'the alternatives. NEVER make the user ask for chains separately, and NEVER offer alternative directions while a trip toward the ' +
      'requested direction still exists.\n' +
      '- ANY POI / no theme: when the user gives NO specific theme but wants a real place at each option ("qualsiasi POI va ' +
      'bene", "any POI is fine", "any place", "somewhere interesting"), call plan_lucky_day_trip with any_poi:true so every ' +
      'favourable direction gets a real nearby attraction instead of a bare geometric point. For a WALK or BIKE trip also pass a ' +
      'small max_radius_km (e.g. 2-3) and short stay hours; the tool then automatically omits the long-leg chain loops (which are ' +
      'car-only), so do not mention them for a bike/walk. ' +
      '- MULTI-DAY TOUR (offer as an option): the same lucky-travel idea extends to a trip of SEVERAL DAYS visiting a country ' +
      '(e.g. France), like an organised tour — each transfer between stops driven in a favourable hour/direction. You do NOT have ' +
      'a dedicated engine for this; you build it as a SEQUENCE of plan_travel calls, one per transfer between the stops the user ' +
      'gives you, choosing each day\'s most favourable departure window. It therefore REQUIRES the user to provide the itinerary ' +
      'stops and the overnight/stay locations. When a user plans such a multi-day trip, or after a Lucky Trip when it fits, you may ' +
      'PROPOSE this: "posso costruirti anche un tour di più giorni — dimmi le tappe e dove pernotti e scelgo gli orari/direzioni più ' +
      'fortunati per ogni spostamento". Only start once the user supplies the stops and stays; present the result as a day-by-day itinerary.\n' +
      '- WHY A DIRECTION IS / ISN\'T PROPOSED: never invent a QMDJ reason. You do NOT compute Qi Men, so do not claim a ' +
      'palace "has no good configuration" / "lacks the right setup" or judge doors, San Qi or deities yourself. The Lucky ' +
      'Trip keeps only directions whose OUTBOUND and RETURN are BOTH favourable, then shows a few diversified by distance. ' +
      'So a direction can be fully favourable as an outbound (e.g. View 景 + San Qi) yet not appear — because its RETURN is ' +
      'unfavourable at the return hour, or because it was diversified out to vary the distances. If the user questions a ' +
      'specific direction, say exactly this, and offer to verify it by running plan_travel toward that direction (it shows ' +
      'that direction\'s own favourable hours). Crucially, a direction with no favourable round-trip can STILL be reached luckily ' +
      'via a chain loop whose first leg heads that way — the Lucky Trip answer already includes those, so offer them instead of ' +
      'just saying "not favourable". Never assert a direction is unfavourable unless a tool result says so.\n' +
      '- "VIAGGIO A CATENA" / "CHAINED LUCKY TRIP" IS A SEPARATE COMMAND. Whenever the user asks for a "viaggio a catena", ' +
      '"tragitto a catena", "percorso a tappe", "chained lucky trip", "lucky loop", or describes hopping direction by direction ' +
      'across consecutive hours and coming back home (e.g. "NE nell\'ora Si, poi Sud nell\'ora Wu, poi NW per tornare"), call ' +
      'plan_lucky_chain and DECIDE EVERYTHING yourself. It returns one or more LOOPS, each a sequence of legs (one per consecutive ' +
      'double-hour) in a favourable direction, that close EXACTLY back on the origin. Present each loop as a numbered option with ' +
      'its legs in order: leg number, direction, favourable door (doorLabel), double-hour (brPy+br), distance (km), end coordinates ' +
      '(to.lat/to.lon), and departCn/arriveCn shown verbatim. Say it returns to the start within "resid" km. Never compute the ' +
      'directions, doors or times yourself — only show what plan_lucky_chain returns. This is DIFFERENT from a normal "lucky trip" ' +
      '(out-stay-back to ONE place): use plan_lucky_chain only for the multi-leg loop.\n' +
      '- CHAIN-TRIP DOCTRINE (from real practice \u2014 follow strictly): a chain trip is a CONTINUOUS LOOP. In each consecutive ' +
      'double-hour the user DRIVES toward that hour\u2019s favourable direction (a good deity such as Commander/Chief + a good door: ' +
      'Rest/Birth/Open), hopping hour after hour and closing the loop back home at the end. (1) KEEP MOVING: NEVER tell the user to ' +
      '"stop and wait for the next hour". If the current favourable direction is STILL favourable in the next hour, have them ' +
      'CONTINUE FURTHER that way \u2014 do not park and idle while a favourable direction is available. (2) Every stop must have a REAL ' +
      'reason \u2014 a favourable-direction POI \u2014 NEVER a filler service/petrol station (allow a fuel/EV stop ONLY if the user asks or the ' +
      'battery is genuinely low). Charging is ALLOWED but must be JUSTIFIED: the assistant knows the car\u2019s state of charge (SoC ' +
      'via the Polestar/SoC worker, or at least the charge at departure). Insert a charging stop ONLY when the loop\u2019s total ' +
      'distance would exceed the estimated remaining range \u2014 if the battery is enough for the whole loop (e.g. full at start), ' +
      'add NO charging stop. NEVER send the user to a Supercharger "just in case" when the charge already covers the trip. (3) Every POI, especially nature/woods, MUST have a real, reachable PARKING / access point: name it, ' +
      'or pick a POI that has one \u2014 never send the user somewhere with nowhere to stop. (4) Always present the COMPLETE loop (every ' +
      'consecutive-hour leg, in order, ending back at the origin), never a partial out-and-stop.\n' +
      '- MULTI-DAY THEMED trip (several DAYS around a theme): when the user wants a trip of more than one day built around ' +
      'a category/theme (e.g. "3-day castle tour from Vienna", "viaggio di 4 giorni tra le terme", or the Lucky Trip panel ' +
      '"Themed trip"), call plan_lucky_multiday with origin (the base), start_date, days and category. If the user lists ' +
      'SEVERAL themes, pass them ALL in ONE call via the "categories" array (e.g. categories:["sacred nature","hermitages ' +
      'abbeys","thermal baths"]) — NEVER call this tool once per theme (that floods the app and can stall it); the app ' +
      'spreads the themes across the days for you. If the user names a REGION/AREA to stay within (e.g. "tour in ' +
      'Tuscany", "stay in the Dolomites", "Area to stay within: Tuscany"), pass it as "area" — it is DISTINCT from the ' +
      'base (base = Siena, area = Tuscany) and fences every stop inside that region. It returns an ' +
      '"itinerary" array (one entry per day, each with a "proposal" = that day lucky themed place). Present it as ' +
      '"Day 1 ... Day N" exactly as its "instructions" field says; never compute directions or times yourself. HUB model ' +
      '(sleep at the base, one lucky themed excursion per day). Use plan_lucky_day_trip for a SINGLE day, plan_lucky_multiday for SEVERAL.\n' +
      '- MOBILE-BASE tour (sleep in a DIFFERENT place each night): when the user wants to CHANGE ACCOMMODATION every ' +
      'night and move town to town ("cambiando alloggio ogni notte", "dormo in un posto diverso ogni sera", "tour ' +
      'itinerante", "basi mobili", "road trip sleeping somewhere new each night"), call plan_mobile_tour (NOT ' +
      'plan_lucky_multiday, which keeps ONE fixed base). Pass origin_name, start_date, days (nights) and optional area. ' +
      'It returns an OPEN-PATH itinerary: each night a real place of character to sleep, reached by a favourable ' +
      'transfer; a route map card is shown by the app. Present night by night; the path ends at the last favourable base. ' +
      '- PRACTICAL STOPOVER LODGING (IN SCOPE — never refuse it): a plain "where do I sleep along the road" request ' +
      '("trova un hotel economico lungo la strada tra Trento e il confine", "un B&B dove fermarmi vicino a Bolzano", ' +
      '"cheap hotel near X") is a NORMAL travel service, NOT astrology/feng shui/lucky planning. Call find_lodging with ' +
      'the coordinates of a sensible town along the route (from your own geography, matching the user\u2019s "after A / ' +
      'before B"); default style economy (chains included), style="character" only if they ask for boutique/independent. ' +
      'Do NOT tell the user it is beyond the app. ' +
      '- CITY TOUR (famous places INSIDE one city): when the user wants to tour WITHIN a city ("a lucky day in Rome", "cosa vedere ' +
      'a Firenze oggi alle ore giuste", the Lucky Trip panel "City tour"), call plan_city_tour with origin (the city centre or ' +
      'hotel), date and optional category. The XKDG direction model works at ANY scale (no minimum distance — it was a battlefield ' +
      'art of short moves): it returns "stops" (famous places, each tied to the double-hour when its direction from the base is ' +
      'favourable). Present them in time order as a one-day plan, exactly as its "instructions" say. For an in-city SINGLE place you ' +
      'may instead use plan_lucky_day_trip with min_km:0 and a small max_radius_km.\n' +
      '- LUCKY EVENTS (real dated events, fixed date): when the user asks about concerts / theatre / festivals / events they ' +
      'could attend ("eventi fortunati", "what festivals can I reach this month", "concerti a luglio"), call plan_lucky_events ' +
      'with origin, a date window (date_from/date_to) and optional category. Unlike trips, the DATE is fixed by the event, so the ' +
      'tool keeps only events whose direction from the base is favourable ON THEIR OWN DATE and tells you the favourable ' +
      'double-hour to set off. Present its "events" list exactly as its instructions say; it is strong on ticketed events, weak ' +
      'on village fairs/sagre (say so if nothing is found).\\n' +
      '- TRAVEL / ITINERARY from A to B by car: use plan_travel with dest_lat/lon (+dest_name) and origin_lat/lon ' +
      '(+origin_name) from your knowledge of the places. The favorable double-hours come back in favorable_windows as ' +
      'LOCAL CLOCK times (already DST-adjusted): each has from/to (the real clock start/end of that double-hour), ' +
      'ganzhi (e.g. Geng Chen), and the good directions. Do NOT guess the clock time of a double-hour yourself - ' +
      'solar time differs from the clock by up to ~1.5h, so always read from/to from favorable_windows.\n' +
      '- THE PLANNER ALREADY BUILDS A FAVOURABLE-DIRECTION ITINERARY. During each favourable double-hour it travels ' +
      'in the favourable compass quadrant (NE, S, ...), drops a "cashing" stop where the net direction from the start ' +
      'would leave that quadrant, then re-aims toward the destination for the next leg. So you must NEVER hand-build ' +
      'legs, compute directions, or invent intermediate stops yourself, and you must NEVER say the tools cannot follow ' +
      'or "fix" compass directions - following the favourable direction IS exactly what they do. For ANY "go in the ' +
      'lucky/favourable direction", "follow NE then continue", multi-leg, or arrive-by request from A to B, just call ' +
      'plan_travel (or plan_arrive_by) with origin + destination (+ names) and present the card it produces. Do not ' +
      'apologise or claim a limitation.\n' +
      '- LIVE COMPASS (🧭, bottom-left) is a STANDALONE tool, no trip needed: it reads GPS live and shows the ' +
      'direction (45° quadrant) FROM an origin point, your real travel heading, and a PREDICTION of where on the map ' +
      'you will cross out of the current quadrant into the next one (distance, ETA, a Maps button). Use start_compass ' +
      'when the user wants to activate/start the compass: origin:"here" to use the current GPS spot as origin, or ' +
      'place:"<town>" when they say "start the compass from <place>" (a place they already left behind). After it ' +
      'opens, tell the user it is reading GPS and will show the predicted quadrant-exit point as they move.\n' +
      '- COMPASS VOICE CONTROL: once the compass is open, map spoken commands to control_compass(action): ' +
      '"ingrandisci/enlarge/expand the map" -> expand; "rimpicciolisci/shrink/small" -> collapse; "chiudi la bussola/' +
      'close the compass" -> close; "azzera/reset/clear origin" -> clear_origin; "ricalcola/refresh/recalculate" -> ' +
      'refresh; "ricentra/recenter/follow" -> recenter; "lascia libera la mappa/stop following" -> follow_off. Keep ' +
      'the spoken reply very short (e.g. "Fatto.") since the user is likely driving.\n'
    ],
    ["core",
      '- NEVER convert a double-hour NAME (Zi, Chou, Yin, ... Wu, Wei, ...) into a clock time yourself, and NEVER ' +
      'add or subtract an hour for daylight saving - you get DST wrong. The tools already handle DST and true solar ' +
      'time: read the clock times from plan_travel\'s favorable_windows (from/to) and from plan_arrive_by\'s ' +
      'depart_clock/arrive_clock, and present THOSE unchanged.\n'
    ],
    ["travel",
      '- A request like "leave Tuoro at the Wu hour, go NE for ~1:45, stop at a point you find, then go E at the ' +
      'start of Wei to reach Sant\u2019Angelo in Vado by ~14:50, no EV charge" is a fixed-ARRIVAL favourable-direction ' +
      'trip: call plan_arrive_by with the destination, arrive_time "14:50", origin_name/dest_name, and NO range_km ' +
      '(no charging). The intermediate "point you find" is the cashing stop the planner returns; the NE/E legs and ' +
      'their clock times come from the planner too. Do not compute the directions, the stop, or the times yourself - ' +
      'just present the returned solution (shortest first).\n' +
      '- BEST-TIME trip (default, no exact time fixed): make ONE call to plan_travel with origin + destination ' +
      '(coords + names), depart_date, and range_km/reserve_km if given — and DELIBERATELY OMIT depart_time and ' +
      'depart_hour. When the time is omitted the app itself auto-selects the most favourable (highest luck) and, on a ' +
      'tie, the EARLIEST daytime departure, then opens and runs the planner. NEVER default to 08:00 or invent a time. ' +
      'The exact chosen clock time appears in the itinerary card that posts to the chat. Your reply is ONE short line: ' +
      'say you picked the most favourable departure of the day and that the exact time + direction are shown in the ' +
      'card.\n' +
      '- REPLAN FROM HERE: when the user is ALREADY travelling and something went wrong (roadblock, detour, delay) or ' +
      'simply says \u201cricalcola da qui\u201d / \u201creplan from here\u201d, call plan_travel with the SAME destination, ' +
      'from_current_position:true, and NO origin_lat/lon and NO depart_time (the app takes a fresh GPS fix and departs ' +
      'NOW). If the result has gps_fresh:false, warn the user the fix failed and the SAVED position was used, and ask ' +
      'them to confirm or name the nearest town.\n' +
      '- BEST DAY within a RANGE: when the user wants the best day+time across several days ("best day to drive to X ' +
      'in the next week", "qual è il giorno migliore nei prossimi N giorni?"), call search_travel with origin + ' +
      'destination (coords + names), start_date, days, and optimize_arrival if they care about arriving in a favourable ' +
      'hour. It posts a ranked, SELECTABLE card (top results scored by total cashed luck, with a Best / By date toggle to view them chronologically); the user taps "Choose" to ' +
      'open the full plan. Reply with ONE short line — do NOT list the days or invent times yourself.\n' +
      '- FIXED time ("I leave at 11 exactly/sharp", "tassativamente"): one call with depart_time "HH:MM" + ' +
      'fixed_time:true + open_planner:true.\n'
    ],
    ["core",
      '- NEVER CLAIM AN ACTION YOU DID NOT PERFORM (ABSOLUTE): saying "the Travel Planner is open", "the itinerary is ' +
      'computing", "the card will appear" is TRUE ONLY in the same turn in which you actually called plan_travel / ' +
      'search_travel_solutions / open_travel_planner AND its result says planner_opened:true. If the user answers a ' +
      'question of yours with "yes, open it" (in any words, or by tapping a button), that answer is NOT an action: you ' +
      'MUST make the tool call in THAT turn, with the same parameters plus open_planner:true — replying with a ' +
      'description of the opening, without the call, is inventing an action and is the worst possible failure. If the ' +
      'result says planner_opened:false, report its planner_error plainly and say the panel did not open. When you ask ' +
      'whether to open the planner, ALWAYS offer it as buttons: [[BTN]] Apri Travel Planner=apri il travel planner | No grazie=no grazie\n' +
      '- TIME CONVENTION (important): every clock time the user says ("parto alle 12:00") and every time you report ' +
      '(from/to, wall_from, departure_planned) is the LOCAL LEGAL time on their phone — i.e. already daylight-saving ' +
      '(ora legale) when DST is in effect. NEVER convert it, and NEVER add or subtract an hour. The favourable ' +
      'directions belong to the Chinese double-hour (时辰) the planner reports in departure_double_hour: name it ' +
      '(e.g. "the Wu hour 午"), and its start on the user\'s clock is wall_from. So "parto alle 12:00" in summer means ' +
      '12:00 ora legale, which the planner places at the start of the Wu double-hour. The solar_* fields are true ' +
      'solar time for the engine only — do not mention them unless the user explicitly asks about solar time.\n'
    ],
    ["travel",
      '- open_travel_planner is only for showing a blank planner. Do not call open_itinerary_in_maps.\n' +
      '- AFTER plan_travel opens the planner: the full computed itinerary (origin→destination, distance, driving ' +
      'time, each leg and the stops/charging) appears in THIS chat automatically a few seconds later, as its own ' +
      'message with a "📍 Open in Google Maps" button the user taps to send it to Maps (charging stop included). So ' +
      'you only give a SHORT one-line intro (the chosen double-hour + clock start time + direction). ' +
      'Do NOT paste the itinerary yourself and do NOT ask the user to fill anything. Google Maps does NOT open by ' +
      'itself anymore: the user opens it deliberately — by tapping the "📍 Open in Google Maps" button, or by asking ' +
      'you ("open in Maps", "apri in Maps", "send it to Maps"). Call open_itinerary_in_maps ONLY when the user ' +
      'explicitly asks to open/navigate; never on your own right after planning. In your one-line intro you may ' +
      'remind them they can open Maps with the button or by asking.\n' +
      '- WHAT "BEST ITINERARY" MEANS: the most favorable configurations WITH the shortest practical travel time. ' +
      'The best itineraries are normally also the shortest - do NOT trade a lot of extra time for a small luck gain ' +
      '(e.g. never turn a ~10h trip into 16h just to catch a better window). Shifting departure inside the allowed ' +
      'window does not change the driving time, so prefer that; avoid choices that add long waits or detours, and ' +
      'when options are close pick the shorter/earlier one. Only lengthen the trip noticeably if the user explicitly ' +
      'says they want maximum luck regardless of time.\n' +
      '- For an electric car, if the user stated the autonomy/range, pass it as range_km - do NOT ask again. ' +
      'But if the user wants the trip planned for an EV / with charging and has NOT given the autonomy, ASK for it once ' +
      '(a single short question, e.g. "Quanti km di autonomia ha l\'auto adesso?") BEFORE planning charging — never assume ' +
      'a default range. With no range given, plan the trip WITHOUT charging (omit range_km) and offer to add charging once ' +
      'they tell you the autonomy. ' +
      'reserve_km is optional: if not given, omit it or assume ~20 km (say so briefly), never block to ask for it. ' +
      'When range_km is passed, the planner finds the charging stops automatically (Tesla + Electra) and adds the ' +
      'best to the Maps export - never tell the user to tap "Find charging stops". The only manual thing ever needed ' +
      'is saving their Open Charge Map key once; if it is missing the charging panel says so.\n'
    ],
    ["fengshui",
      '- For Bed/Desk/Water dates the tool reads the section inputs; if a required degree is missing, ask the ' +
      'user for it (0-360) and call the tool with it.\n' +
      '- ACTIVATING WATER ("positive hours / good date to turn on the aquarium / fountain / water feature" facing a ' +
      'DIRECTION): use find_water_activation_full(direction, star_type, star_num) - it merges XKDG person hours + Qimen ' +
      'quadrant + Qimen special configurations and grades each hour into a TIER. The tier is a QUALITY GRADE, not a count: ' +
      'an hour that connects to the person\u2019s BIRTH YEAR always outranks one that does not. Tier 4 = connected, XKDG score ' +
      '>= 18 (rare); tier 3 = connected, 12-17; tier 2 = connected, below 12; tier 1 = NOT connected to the person but good ' +
      'on its own \u2014 either an XKDG structure strong enough to stand alone (Nayin Power, score >= 16) or a good Qimen at ' +
      'the palace (quadrant >= 3). Weaker hours are not returned at all. TIER 1 IS NORMALLY THE MOST COMMON \u2014 a real ' +
      'connection to the person is rare, a good Qimen is not \u2014 so most activations happen on a tier 1 hour and that is ' +
      'correct, never apologise for it. For an aquarium facing X: direction=X, star_type=water, star_num = the WATER ' +
      '(facing) star living in palace X (get it via recall_flying_stars or get_app_state). Present tier 4 first, then 3, 2, ' +
      '1, using each row\u2019s why field to say what it is made of. The tool skips gracefully any scan it cannot run (e.g. no ' +
      'person, no star) and reports it in scan_notes.\n' +
      '- WATER IS A MEANS, NOT A PURPOSE. Water/an aquarium is how you ACTIVATE a purpose (Wealth, Career, Health...), so ' +
      'every activation hour also answers "what is this good for". Two consequences you must honour:\n' +
      '  (a) ALWAYS TELL THE USER when a chosen date also serves a purpose. find_water_activation_full and ' +
      'program_aquarium_light annotate each hour with also_good_for (the same Purpose Activation calculator as the ' +
      '\u26a1 ACTIVATION panel in the app, seven purposes: health, career, wealth, relationship, journey, speak, legal). ' +
      'If a scheduled or recommended date carries also_good_for, SAY IT explicitly \u2014 never leave it in the payload.\n' +
      '  (b) IF THE USER ASKS FOR ONE PURPOSE \u2014 e.g. "find me only Wealth dates to turn on the aquarium next week", ' +
      '"program only Career activations" \u2014 pass purpose:\'wealth\' / \'career\' to find_water_activation_full or to ' +
      'program_aquarium_light. It keeps only the hours that open that purpose\u2019s Qimen door. Do NOT filter by hand and do ' +
      'NOT answer that it is impossible. If the filter leaves few or no days, say so plainly rather than widening it silently.\n' +
      '- PURPOSE ACTIVATION on its own (no water involved): find_purpose_activation(direction?, purpose?) \u2014 with a purpose ' +
      'it returns that purpose\u2019s favourable dates/hours at a palace; without one it scans all seven and reports which ' +
      'purposes each hour serves. Never pass purpose:\'water\' \u2014 water is not a purpose.\n'
    ],
    ["travel",
      '- PURPOSE FOR A TRAVEL DIRECTION (not a house palace): find_purpose_direction(direction?, purpose?) \u2014 the SAME ' +
      'seven purposes, but on the ROTATING chart for heading somewhere (\"quando conviene un viaggio di lavoro verso NW nei ' +
      'prossimi giorni\" \u2192 purpose=career, direction=NW; \"le tappe di ricarica erano anche buone per altro?\" \u2192 no purpose, ' +
      'annotate the chosen hours). Use this, not find_purpose_activation, whenever the question is about MOVING in a ' +
      'direction rather than a fixed palace/aquarium. Hand the chosen window to plan_travel or plan_lucky_day_trip to run ' +
      'the actual trip \u2014 this tool only finds the window.\n'
    ],
    ["fengshui",
      '- "... in the [NAME] house" (e.g. "the Vienna house"): call get_house_setup(house_name) FIRST - it returns the ' +
      'whole house in one shot (facing/period, aquariums with their direction + water star, ' +
      'and saved Water/Bed/Desk settings). The aquariums list ALREADY INCLUDES saved Water positions (source = ' +
      'saved_water_setting) - a SAVED WATER POSITION IS A WATER FEATURE; that is enough, do NOT ask the user for the ' +
      'direction when one is already saved. To activate it, take the aquarium and call find_water_activation_full(direction ' +
      '= its direction, star_type = water, star_num = its water_star). Only ask the user for a direction if NO aquarium and ' +
      'NO saved Water position exist. The loaded person provides the XKDG scan. Fall back to list_houses / load_house only ' +
      'if get_house_setup cannot resolve the name.\n' +
      '- find_water_activation (two-scan: Qimen quadrant + XKDG only) and find_water_dates / find_water_hours still exist; ' +
      'prefer find_water_activation_full when the user wants the full picture. find_water_dates is the Feng Shui Water-section ' +
      'date scan for PLACING water; find_water_hours is the Qimen sector alone.\n'
    ],
    ["fengshui,dates",
      '- XKDG HEXAGRAM SYSTEM (CORE, in-scope - NOT external I Ching): the 64 hexagrams / gua, their two trigrams ' +
      '(Qian, Dui, Li, Zhen, Xun, Kan, Gen, Kun), each hexagram\'s qi (1-9) and yun (1-9), its Zheng Shen 正神 / Ling ' +
      'Shen 零神 status for the current period, its luopan degree, and the 8 FAMILIES (Qian-Kun, Kan-Li, Zhen-Xun, ' +
      'Gen-Dui, Pi-Tai, JiJi-WeiJi, Heng-Yi, Sun-Xian) with father/mother/son/daughter roles (via gan-zhi) are ALL part ' +
      'of THIS app\'s XKDG method and live in its data tables. For ANY question about a hexagram, trigram, gua, qi, ' +
      'yun, family/role, or Zheng Shen / Ling Shen (e.g. "which family does Kun over Kan belong to?", "qi and yun of ' +
      'hexagram 7?", "is this hexagram Zheng Shen now?"), CALL get_hexagram_info (by hex number, or by upper + lower ' +
      'trigram) and answer from it. NEVER say hexagrams/families are out of scope and NEVER send the user to an ' +
      'external I Ching book - the answer is in the app.\n'
    ],
    ["fengshui",
      '- FLYING-STAR GROUNDING (CRITICAL - NEVER GUESS): NEVER state which flying star sits in a direction from your own ' +
      'reasoning or memory, and NEVER compute a chart in your head. The ONLY source of truth is get_house_setup → each ' +
      'floor\u2019s flying_stars object (palaces{DIR:{water,mountain}}, center, imprisoned, liberation, imprisonment_note), ' +
      'computed authoritatively from facing+period, OR taken from a hand-composed MANUAL chart when the floor has one (flying_stars.manual === true - the same chart the luopan shows; if so, say it is a manual chart and do NOT recompute or second-guess it). To answer "what water star is at <DIR>" or to pick star_num for an ' +
      'activation, READ flying_stars.palaces[<DIR>].water — do not infer it. If flying_stars is null/absent (facing or ' +
      'period not set for that house), tell the user the chart cannot be computed and ask them to set facing & period - ' +
      'do NOT invent a star. When you call find_water_activation_full, also pass facing_deg and period from that floor so ' +
      'the special-config scan uses the SAME chart.\n'
    ],
    ["travel",
      '- LONG EV TRIP, MAJORITY-FORTUNATE ITINERARY: when the user wants an EV trip that NEEDS charging stops (long ' +
      'distance, range_km known) AND wants most of the itinerary to fall in fortunate windows ("voglio che le tappe di ' +
      'ricarica stiano dentro un itinerario fortunato", "trova un altro giorno se serve"), use find_lucky_charge_day ' +
      'instead of plan_travel directly \u2014 it searches departure days for you and posts the winning (or closest) day as ' +
      'the normal card. Tell the user you are searching (it takes a while) before calling it. A plain "plan a trip" ' +
      'without that emphasis still uses plan_travel as usual \u2014 this tool is for when the majority-fortunate condition ' +
      'matters to the user.\n'
    ],
    ["fengshui",
      '- WATER-STAR VARIANT SEARCH: when the user asks to BUILD or FIND a chart variant whose WATER stars (\u5411\u661f) sit ' +
      'in specific palaces (e.g. "voglio la 9 water star a SW, la 6 a NW o NE, senza la 5 e la 2 a W e SE"), CALL ' +
      'find_water_star_charts with require/exclude constraints - NEVER reason the flight out yourself. ALWAYS pass the ' +
      'base chart (base_period + base_facing_deg or base_facing_mountain, from the house or the user\'s words) - without ' +
      'it the toward-facing \u4ee4\u661f\u5165\u56da liberation variants are skipped. The pool is CLOSED (18 Luoshu flights + ruler-' +
      'liberation variants) and often over-constrained: if the tool reports no_exact_solution, say clearly that the ' +
      'requested combination is impossible (explain via the tool\'s why field), then present the nearest candidates with ' +
      'what each satisfies and misses. When an exact match is a LIBERATED variant, always state its mechanism (swap with ' +
      '5, or toward the facing) and that it applies during the current period only. The user can then enter the chosen ' +
      'variant by hand in the \u2b50 Manual editor \u2014 OR, when the user picks a candidate, call seed_manual_chart with ' +
      'that candidate\'s water_stars and the SAME base chart: it opens the \u2b50 Manual editor pre-filled (\u5c71/\u904b stars ' +
      'unchanged from the base, water stars from the chosen variant) for the user to review and Apply. NEVER apply a ' +
      'chart yourself. GUIDED MODE: when asked to guide the chart construction step by step (the \ud83e\udd16 AI chart button ' +
      'sends such a request), interview in the user\'s language, ONE question at a time: base chart first (propose the ' +
      'panel values if given), then required placements, then exclusions; confirm the constraints back in one line ' +
      'before calling the solver.\n'
    ],
    ["core",
      '- FLYING vs ROTATING chart (CRITICAL - NEVER mix): FS STIMULATORS - activating a flying star / water / aquarium / ' +
      'fountain / mountain star (find_water_activation_full, find_water_hours, find_qimen_hours_for_star, QFS) - ALWAYS ' +
      'use the FLYING chart (\u98db\u76e4). The ROTATING chart (\u8f49\u76e4) is used ONLY for human DIRECTIONAL actions: travel / ' +
      'departures and divination (analyze_direction, travel tools). NEVER describe water / flying-star activation as ' +
      'using the "rotating chart", and never present rotating-chart results for an FS-stimulator question. If a star has ' +
      'no Qimen configuration, explain the REAL reason from the tool result (e.g. the star sits in the CENTRE palace this ' +
      'period, so it has no outer palace to activate; or no favourable Door / San Qi reached its palace this date) - do ' +
      'NOT say "rotating chart".\n'
    ],
    ["fengshui",
      '- IMPRISONED STAR (\u5165\u56da): when the CURRENT-PERIOD water star (now ws9) sits in the CENTRE of the flying-star ' +
      'chart it is "imprisoned" and has no outer palace to activate directly. It is freed with MOVING WATER toward EITHER ' +
      'the palace where the 5 water star sits OR the FACING palace (if they coincide, that single quadrant). The water ' +
      'tools detect this and return imprisoned:true with the liberation palace(s) (the "imprisonment" / imprisonment_note ' +
      'field). When that happens: tell the user the period star is imprisoned, name the liberation quadrant(s), and ASK in ' +
      'which of those quadrants the moving water sits; then present the favourable Qimen hours as "frees ws<period> toward ' +
      '<direction>" (flying chart). Never report the imprisoned star as simply absent.\n' +
      '- MULTIPLE HOUSES ("each house" / "both houses"): handle them ONE AT A TIME. For each saved house of the active ' +
      'person: set_active_house to it, read its setup, then run the requested scan using THAT house\u2019s own saved water ' +
      'position (direction) and water star on its own chart, and report a SEPARATE result per house (label each clearly ' +
      'by house name). Restore the originally active house at the end.\n' +
      '- UNFAVOURABLE PALACE FORMATIONS (CRITICAL): a palace is NOT good for activation if it has any of: a stem CLASH ' +
      '\u76f8\u51b2 (\u7532\u5e9a/\u4e59\u8f9b/\u4e19\u58ec/\u4e01\u7678) \u2014 EXCUSED only if the palace carries the Commander \u503c\u7b26; \u4e19\u5e9a (either order); or \u5e9a\u5df1 (either ' +
      'order) unless the Pillar star \u5929\u67f1 is present. The water tools already exclude these palaces; never present one as ' +
      'a good hour. ALSO: if a result is flagged isVoid (the palace is in Void \u7a7a\u4ea1 that hour), HIGHLIGHT it to the user ' +
      '(a void hour is weak/empty even if otherwise favourable).\n'
    ],
    ["home",
      '- MISSED SWITCH-ONS: the Shelly Worker retries a scheduled switch until it can verify the plug '
    + 'really changed state, and records the ones it never managed. Whenever a result carries `alerts` or '
    + '`missed_switches`, REPORT THEM FIRST, before anything else, reproducing each line as given: they mean '
    + 'the aquarium light did not come on at the auspicious hour. Never bury them under the rest of the '
    + 'answer and never summarise them away. aquarium_plan with action "clear_alerts" empties the list once '
    + 'the user has seen them.\n'
    + '- ALEXA SUMMARY: an Alexa skill reads out loud a 7-day SUMMARY of the lucky XKDG hours of the loaded '
    + 'person plus the lucky travel directions. ALEXA IS A VOICE ASSISTANT, NOT A PERSON: never try to load '
    + '"Alexa" as Person A or B, and never ask the user to. refresh_alexa_digest rebuilds that summary and '
    + 'deposits it. Call it for "aggiorna il riassunto", "rinfresca il riassunto", "aggiorna quello che dice '
    + 'Alexa", "update the summary" and the like: such a request is NEVER a request to summarise the state of '
    + 'the app, so do NOT answer it with get_app_state. program_aquarium_light already refreshes the same '
    + 'summary as a side effect whenever it commits a plan, so use refresh_alexa_digest when the user does NOT '
    + 'want to touch the aquarium light. The summary follows whichever person is loaded BY HAND: never load or '
    + 'switch a person for it, and if none is loaded say plainly that the summary carries the directions only. '
    + 'Purpose names stay in ENGLISH (wealth, health, career...) everywhere, Alexa included.\n'
    ],
    ["core",
      '- VERIFY BUTTON: whenever you recommend a specific DATE + HOUR (water activation, date selection, etc.), also call ' +
      'show_verify_button(date, hour branch, direction if any) so the user gets a one-tap button to open the XKDG date and ' +
      'the QMDJ Hour Flying Chart and check it. For several houses, add one button per recommended date+hour.\n' +
      '- If a capability genuinely has no tool, say so briefly and point to the on-screen panel to use.'
    ]
  ];

  // Monta il prompt per le aree attive, nell'ordine originale, senza duplicati.
  function systemPromptFor(areas) {
    var want = {}; (areas || []).forEach(function (a) { want[a] = 1; });
    var parts = [];
    for (var i = 0; i < SP_SEG.length; i++) {
      var tags = SP_SEG[i][0].split(',');
      var keep = false;
      for (var j = 0; j < tags.length; j++) { if (tags[j] === 'core' || want[tags[j]]) { keep = true; break; } }
      if (keep) parts.push(SP_SEG[i][1]);
    }
    return parts.join('');
  }

  // ---- Tool catalogue (Phase E2, increment 1) ----------------------------

  // ═══ TOOL GROUPS — "specialist" assistants (Edu, session 24) ═════════
  // All 52 tool descriptions used to travel with EVERY question (~16k tokens of
  // the ~29k fixed prefix), even when the whole conversation was about travel.
  // Grouping them lets the app send only the relevant set: fewer tokens, a faster
  // answer and a model that is not distracted by 40 irrelevant options.
  // No routing model is needed — the app already knows which area you are in, and
  // the AI can pull another group itself with the load_tools escape hatch below.
  var TOOL_AREAS = {
    travel: ['plan_travel','search_travel','plan_lucky_day_trip','plan_lucky_chain','plan_lucky_multiday',
             'plan_mobile_tour','plan_city_tour','plan_lucky_events','plan_arrive_by','open_travel_planner',
             'open_itinerary_in_maps','start_compass','control_compass','analyze_direction','get_trip_itinerary',
             'find_lodging','find_lucky_charge_day','scan_flights','open_direction_calculator',
             'find_purpose_direction','plan_directional_detour','find_qimen_hours_for_star','diagnose_maps_export',
             'find_good_dates'],   // session 26: the flight/travel DATE rules live in this area
    fengshui: ['find_bed_dates','find_desk_dates','find_water_dates','find_water_hours','find_water_activation',
               'find_water_activation_full','find_purpose_activation','find_water_star_charts','seed_manual_chart',
               'list_houses','get_house_setup','set_active_house','load_house','load_placement',
               'recall_flying_stars','open_chart_finder','open_qimen_for_flying_stars','open_section'],
    dates: ['find_good_dates','explain_purpose','open_scan_result','show_verify_button',
            'find_divination_chart','get_hexagram_info','export_lucky_calendar'],
    home:  ['configure_shelly','program_aquarium_light','aquarium_light','aquarium_plan','refresh_alexa_digest']
  };
  // Always sent, whatever the area — they are tiny and needed everywhere.
  // show_verify_button is required by a CORE rule ("always offer the verify button"),
  // so from session 26 it travels with EVERY area, not only with 'dates'.
  var TOOL_ALWAYS = ['get_app_state','list_source','read_source','show_verify_button'];

  var AREA_LABELS = { travel: '\uD83E\uDDED Travel & directions',
                      fengshui: '\uD83C\uDFE0 Feng Shui', dates: '\uD83D\uDCC5 Dates & divination',
                      home: '\uD83D\uDD0C Home devices' };
  var AREA_ORDER = ['travel','fengshui','dates','home'];

  // '' = no area picked yet. There is no "all" any more (session 26): carrying all 53
  // tools AND the whole prompt with every single question was the bulk of the running cost.
  function getToolArea(){
    try { var a = localStorage.getItem('xkdg_ai_area') || '';
          return AREA_ORDER.indexOf(a) >= 0 ? a : ''; } catch(e){ return ''; }
  }
  function setToolArea(a){
    try { localStorage.setItem('xkdg_ai_area', AREA_ORDER.indexOf(a) >= 0 ? a : ''); } catch(e){}
    _extraAreas = [];
  }
  var _extraAreas = [];        // groups pulled in by load_tools during this conversation

  // Words that unmistakably belong to one area. When the question names one and that area
  // is NOT loaded, it is pulled in BEFORE the request instead of hoping the model calls
  // load_tools by itself. Session 26: asked in the Feng Shui area whether the aquariums
  // switch off at 23:00, the assistant had no home-area tool (the whole ON/OFF doctrine
  // lives in program_aquarium_light's description), fell back to reading the source, and
  // wrongly answered that the app never switches the light off.
  var AREA_HINTS = {
    home: /acquari|aquarium|shelly|smart\s*plug|\bpresa\b|\bprise\b|\bluce\b|\bluci\b|lumi[e\u00e8]re|\blight\b|spegn|accend|allum|(switch|turn)\s+(it\s+)?(on|off)|alexa|riassunt|r[e\u00e9]sum[e\u00e9]|digest|\bsummary\b/i,
    travel: /\bportami\b|\bportarmi\b|take me to|drive me|come ci arrivo|how do i get|\bandiamo a\b|viagg|\btrip\b|journey|partenz|partire|guidar|\bdrive\b|driving|percors|itinerar|bussol|compass|albergo|\bhotel\b|lodging|\bvolo\b|\bvoli\b|flight|ricaric|\bcharg|autonomia|destinazion|destination/i,
    fengshui: /fontan|fountain|stelle volanti|flying star|water star|mountain star|luopan|\bletto\b|\bbed\b|scrivan|\bdesk\b|facing|sitting|\bacqua\b|\bwater\b/i,
    dates: /divinaz|divination|esagramm|hexagram|calendario|\bcalendar\b|\.ics\b|data buona|good date|selezione data|date selection/i
  };
  function autoPullAreas(text) {
    try {
      if (!text) return [];
      var cur = getToolArea(), added = [];
      AREA_ORDER.forEach(function (a) {
        if (a === cur || _extraAreas.indexOf(a) >= 0) return;
        if (AREA_HINTS[a] && AREA_HINTS[a].test(text)) { _extraAreas.push(a); added.push(a); }
      });
      return added;
    } catch (e) { return []; }
  }

  // Areas whose TOOLS **and** PROMPT SECTIONS travel with the next request.
  function activeAreas(){
    var a = getToolArea();
    var out = a ? [a] : [];
    _extraAreas.forEach(function(x){ if (AREA_ORDER.indexOf(x) >= 0 && out.indexOf(x) < 0) out.push(x); });
    return out;
  }

  // The tool list actually sent with the next request.
  function activeTools(){
    try {
      var wanted = {};
      TOOL_ALWAYS.forEach(function(n){ wanted[n] = 1; });
      activeAreas().forEach(function(a){
        (TOOL_AREAS[a] || []).forEach(function(n){ wanted[n] = 1; });
      });
      var out = TOOLS.filter(function(t){ return wanted[t.name]; });
      // escape hatch: let the model ask for another group instead of failing
      out.push({
        name: 'load_tools',
        description: 'Load the tools of another area when the question falls outside the current one. '
          + 'Areas: travel (trips, directions, compass, lodging), fengshui (houses, water, bed/desk, flying stars), '
          + 'dates (date selection, divination, hexagrams), home (aquarium light, Shelly). '
          + 'Call this, then answer using the newly available tools.',
        input_schema: { type: 'object',
          properties: { area: { type: 'string', enum: ['travel','fengshui','dates','home'] } },
          required: ['area'] }
      });
      return out;
    } catch(e){ return TOOLS; }
  }

  var TOOLS = [
    {
      name: 'export_lucky_calendar',
      description: 'Build a .ics calendar file of the ABSOLUTE best hours over the next months and download it, so the user can ' +
        'add it to Google Calendar on the phone. Three separate sectors, each with its own maximum computed independently: ' +
        'WATER (both aquariums, from the saved house profiles \u2014 only the highest Tier that occurs in the period), ' +
        'XKDG tied to the loaded person (every hour scoring at least xkdg_min_score, default 15, that carries a real XKDG '
        + 'relation \u2014 hours riding on season/Nayin alone are dropped), and DIRECTIONS (every hour scoring at least '
        + 'direction_min_score, default 10, which is where the method\u2019s own gap falls). ' +
        'The three scales are NOT comparable and are never added together. Every event carries its sector in the title and an ' +
        'alarm the evening before at 21:00. Use when the user asks for a calendar, an .ics, or to be warned in advance about the ' +
        'best hours. After it runs, report by_sector honestly, including any sector that produced nothing.',
      input_schema: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'How far ahead to look, in days. Default 90 (three months).' },
          start_date: { type: 'string', description: 'YYYY-MM-DD, defaults to today.' },
          xkdg_min_score: { type: 'integer', description: 'Minimum XKDG score kept in the calendar. Default 15. Only hours that ALSO carry a real XKDG relation are kept, whatever the score. Raise it for a leaner calendar: measured on six months, 15 gives about 125 hours over 61 days, 18 gives 79 over 40, 20 gives 52 over 27, 25 gives 14 over 9.' },
          direction_min_score: { type: 'number', description: 'Minimum direction score kept in the calendar. Default 10. The score has only ten values (0, 0.5, 1, 1.5, 2, 3, 10, 10.5, 11, 12) with nothing between 3 and 10, so 10 is the natural cut: measured on six months it gives about 179 hours over 115 days, of which 141 outside the night hours.' },
          include_night: { type: 'boolean', description: 'Keep night hours 23:00-05:00 (Zi/Chou/Yin). Default false: nobody does an activation at 2am, so night hours are dropped unless the user explicitly asks ("include the night hours", "anche di notte").' }
        }
      }
    },
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
          days: { type: 'integer', description: 'How many days to scan from the start (default 7; use ~31 for a month, ~62 for two).' },
          start_date: { type: 'string', description: 'Optional first day to scan, YYYY-MM-DD (default today; cannot be past). e.g. 2026-07-01 with days 62 covers July+August.' },
          strictness: { type: 'string', enum: ['strict', 'soft'],
            description: 'strict (default) = only dates that fully meet the purpose. soft = strict matches on top, then nearer still-positive dates that only partly fit. Use soft only after the user agrees to a softer search.' },
          weekdays: { type: 'array', items: { type: 'string', enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
            description: 'Optional: keep only these weekdays. Use for trips limited to certain flight/travel days (e.g. ["sun","tue","thu","sat"] for Scoot flights).' }
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
      name: 'show_verify_button',
      description: 'Add a "check" button to the chat that lets the user open BOTH the XKDG date analysis AND the QMDJ ' +
        'Hour Flying Chart for a date+hour you recommend, to verify it visually. Call this whenever you recommend a ' +
        'specific date + hour for activating water / selecting a date (one call per recommended date+hour; for ' +
        'multiple houses, one button per house). The button itself opens the views when the user taps it.',
      input_schema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Recommended date YYYY-MM-DD.' },
          hour: { type: 'string', description: 'Hour branch of the recommended double-hour (e.g. "Wu" or "\u5348").' },
          direction: { type: 'string', description: 'Optional palace direction to highlight (N, NE, E, SE, S, SW, W, NW).' },
          label: { type: 'string', description: 'Optional short label for the button (e.g. house name + date).' }
        },
        required: ['date', 'hour']
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
        'favorable time windows (true-solar-time) to be travelling. The opened planner BUILDS the favourable-' +
        'direction itinerary itself (legs that follow the favourable compass quadrant in each double-hour, with ' +
        'cashing stops at quadrant exits) — you never compute legs/directions yourself, and it CAN follow compass ' +
        'directions. Use for "plan an itinerary/route from A to B", "good time/direction to go to X", and any ' +
        '"travel in the favourable direction" request. Supply destination lat/lon and, if the user named a starting city, ' +
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
          origin_lat: { type: 'number', description: 'Origin latitude (defaults to a FRESH GPS fix if omitted).' },
          origin_lon: { type: 'number', description: 'Origin longitude.' },
          origin_name: { type: 'string', description: 'Origin place name (for labels).' },
          depart_date: { type: 'string', description: 'Departure date YYYY-MM-DD (default today).' },
          depart_hour: { type: 'integer', description: 'Wall-clock start hour 0-23. OMIT it (and depart_time) to let the app auto-pick the most favourable, earliest daytime departure. Ignored if depart_time is given.' },
          depart_time: { type: 'string', description: 'Wall-clock start time HH:MM (overrides depart_hour). Use the favourable window start.' },
          fixed_time: { type: 'boolean', description: 'TRUE only if the user fixed an exact time ("exactly/sharp"). When false (default) the departure is auto-snapped to the START of the soonest favourable double-hour.' },
          duration_h: { type: 'integer', description: 'Trip length in hours (default 12).' },
          range_km: { type: 'number', description: 'EV autonomy in km (enables auto charging-stop search in the planner).' },
          reserve_km: { type: 'number', description: 'EV safety reserve in km.' },
          from_current_position: { type: 'boolean', description: 'TRUE when the user wants to (re)plan FROM WHERE THEY ARE NOW — "da qui", "from here", "ricalcola da qui", roadblock, detour, mid-trip replan. The app acquires a FRESH GPS fix as the origin (do NOT pass origin_lat/lon) and, unless a time is given, departs NOW. Never set it for normal future trips.' },
          open_planner: { type: 'boolean', description: 'Open + run the filled Travel Planner. Defaults true when both origin and destination are given.' }
        },
        required: ['dest_lat', 'dest_lon']
      }
    },
    {
      name: 'search_travel',
      description: 'Find the BEST day+time to drive A→B across a RANGE of days. Use when the user wants the app to ' +
        'choose the most favourable departure within N days ("find me the best day to drive to X in the next week", ' +
        '"qual è il giorno migliore per andare a Y nei prossimi 10 giorni?"). The app fetches the road route ONCE, ' +
        'then for every daytime double-hour departure on each day it plans the trip and SCORES it by TOTAL CASH (the ' +
        'sum of the QMDJ scores of every fortunate/cash hour of the trip). With optimize_arrival it also rewards ' +
        'arriving in a favourable hour/direction. It posts a SELECTABLE ranked list (top N) into the chat; the user ' +
        'taps "Choose" on one to open the full plan. You never compute scores/times yourself. Needs origin + ' +
        'destination coordinates (+names).',
      input_schema: {
        type: 'object',
        properties: {
          dest_lat: { type: 'number', description: 'Destination latitude.' },
          dest_lon: { type: 'number', description: 'Destination longitude.' },
          dest_name: { type: 'string', description: 'Destination place name.' },
          origin_lat: { type: 'number', description: 'Origin latitude (defaults to a FRESH GPS fix if omitted).' },
          origin_lon: { type: 'number', description: 'Origin longitude.' },
          origin_name: { type: 'string', description: 'Origin place name.' },
          start_date: { type: 'string', description: 'First day to consider, YYYY-MM-DD (default today).' },
          days: { type: 'integer', description: 'How many days from start_date to scan (1-31, default 7).' },
          optimize_arrival: { type: 'boolean', description: 'Also reward itineraries that ARRIVE in a favourable hour/direction (default false = score only the cashed driving hours).' },
          top_k: { type: 'integer', description: 'How many ranked itineraries to offer (default 5).' },
          range_km: { type: 'number', description: 'EV autonomy in km (passed to the full plan when the user picks one).' },
          reserve_km: { type: 'number', description: 'EV safety reserve in km.' }
        },
        required: ['dest_lat', 'dest_lon']
      }
    },
    {
      name: 'plan_lucky_day_trip',
      description: 'Propose SEVERAL varied lucky round-trips (out → stay → back) for ONE day, when the user has no ' +
        'fixed destination ("find me a lucky few-hours trip out of town, up to 200 km", "where could I go today ' +
        'that is most fortunate?"). The app probes many directions and distances (near ~30 km, mid ~80, far ~150) ' +
        'within the radius, scores each round-trip (luck = min of outbound and return; both the going direction AND ' +
        'the return direction must be favourable, with stay length chosen to wait for the hour to turn if needed) ' +
        'and returns a few DISTINCT options. Present them as alternatives the user can pick from — they vary by ' +
        'direction, distance and stay (e.g. a short 30 km walk with top luck vs a 150 km drive). To actually run a ' +
        'chosen one, call plan_travel with that option\'s dest_lat/dest_lon. You never compute directions/times yourself.',
      input_schema: {
        type: 'object',
        properties: {
          origin_lat: { type: 'number', description: 'Start latitude (defaults to a FRESH GPS fix, else the app default).' },
          origin_lon: { type: 'number', description: 'Start longitude.' },
          origin_name: { type: 'string', description: 'Start place name (for labels).' },
          date: { type: 'string', description: 'Day YYYY-MM-DD (default today). PAST dates ARE allowed here, to REVIEW/ANALYSE a lucky trip that already happened.' },
          max_radius_km: { type: 'number', description: 'Maximum distance from the origin in km (default 200).' },
          min_km: { type: 'number', description: 'Minimum distance from the origin in km (default 15). Pass 0 for in-city / very short trips so nearby famous places are not filtered out.' },
          avoid_crowds: { type: 'boolean', description: 'OPTIONAL. Set true when the user wants to stay OFF the beaten path — quiet, secluded, non-touristy, away from the crowds ("posti tranquilli", "non turistico", "lontano dalla folla", "hidden gems"). It gently de-emphasises very popular places (many reviews) WITHOUT ever overriding the favourable direction. Leave false/absent otherwise (popular places stay welcome).' },
          stay_min_h: { type: 'number', description: 'Minimum stay at the destination in hours (default 1.5).' },
          stay_max_h: { type: 'number', description: 'Maximum stay at the destination in hours (default 3); widened automatically if no clean return is found.' },
          category: { type: 'string', description: 'OPTIONAL kind of destination, so each proposal becomes a REAL named place (looked up via Google Places) instead of a generic point. IMPORTANT: pass the user\'s OWN specific word — it is matched to that exact kind of place. E.g. "castelli"/"castles" -> castles, "musei"/"museums" -> museums, "terme"/"spa" -> thermal baths, "borghi"/"villages" -> old villages, "eremi"/"abbazie" -> hermitages & abbeys, "natura" -> parks/lakes/viewpoints, "spiagge appartate" -> secluded beaches, "luoghi misteriosi" -> megalithic/mystical sites, "cantine" -> wineries. Do NOT collapse "castles" into a generic "culture" (that returns MUSEUMS, not castles). Leave empty for generic points. The user can also choose the category AFTERWARDS ("now only nature ones"): just call again with the same parameters plus this one.' },
          count: { type: 'integer', description: 'How many distinct proposals to return (2-6, default 4).' },
          any_poi: { type: 'boolean', description: 'Set TRUE when the user gives NO specific theme but still wants a REAL place at each option ("qualsiasi POI va bene", "any POI is fine", "any place", "somewhere interesting"). Each favourable direction then gets the nearest real attraction (via Google Places) instead of a bare geometric point. Leave false only if the user explicitly wants pure directional points.' },
          direction: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], description: 'OPTIONAL compass direction the user wants to head ("verso nord" → N). Out-and-back options still come from the day\'s favourable directions; this biases the chain loops so the ones whose FIRST leg goes this way are offered first (useful when no round-trip is favourable that way).' }
        },
        required: []
      }
    },
    {
      name: 'plan_lucky_chain',
      description: 'Propose CHAINED lucky trips for ONE day: a multi-leg loop where EACH leg is driven during one ' +
        'consecutive Chinese double-hour, in a direction whose DOOR is favourable in THAT hour, and the path RETURNS ' +
        'EXACTLY to the origin (a closed polygon). This is the true XKDG "travelling" method — e.g. NE in hour Si, then ' +
        'South in hour Wu, then NW in hour Wei, back to the start. Use when the user asks for a "viaggio a catena", ' +
        '"tragitto a catena", "percorso a tappe fortunato", "chained lucky trip", "lucky loop", or describes hopping ' +
        'direction-by-direction across the hours to gather favourable qi and come home. The app chooses the favourable ' +
        'directions per double-hour and solves the leg lengths so the loop closes on the origin; it returns a few ' +
        'distinct loops. You never compute directions, doors or times yourself.',
      input_schema: {
        type: 'object',
        properties: {
          origin_lat: { type: 'number', description: 'Start latitude (defaults to a FRESH GPS fix, else the app default).' },
          origin_lon: { type: 'number', description: 'Start longitude.' },
          origin_name: { type: 'string', description: 'Start place name (for labels).' },
          date: { type: 'string', description: 'Day YYYY-MM-DD (default today).' },
          max_legs: { type: 'integer', description: 'Maximum legs before returning home (2-5, default 5).' },
          max_leg_km: { type: 'number', description: 'Maximum length of a single leg in km (default 140).' },
          count: { type: 'integer', description: 'How many distinct loops to return (2-6, default 5).' },
          no_charging: { type: 'boolean', description: 'Set TRUE when the user does not want charging stops ("without the chargers", "senza le colonnine", "the car is full"). The loop is then rebuilt with places worth visiting at every stop. NEVER hand-build or hand-edit a Google Maps link and NEVER tell the user to edit the route in Maps: call this tool again with no_charging:true and a fresh card with a correct link is shown. By default a charger is proposed ONLY when the loop does not fit in the range left in the battery.' },
          categories: { type: 'array', items: { type: 'string' }, description: 'OPTIONAL kinds of place to stop at, in the user\'s own words ("castles", "thermal baths", "lakes and woods", "medieval villages"). Overrides the categories ticked in the Lucky Trip panel FOR THIS RUN. Use it whenever the user asks to redo the loop with different stops — an itinerary that no longer suits them is simply rebuilt, never patched.' }
        },
        required: []
      }
    },
    {
      name: 'plan_lucky_multiday',
      description: 'Compose a MULTI-DAY themed Lucky Trip: an itinerary of N consecutive days around a fixed BASE, ' +
        'where each day has ONE lucky excursion — a real named place that fits a THEME/category, reached in a ' +
        'favourable direction during a favourable hour, then back to the base (hub model: sleep at the base, ' +
        'day-trip out each day). Use when the user wants a trip of several DAYS around a theme ("3-day castle tour ' +
        'from Vienna", "un viaggio di 4 giorni tra le terme", "itinerario di piu giorni sui luoghi misteriosi", or the ' +
        'Lucky Trip panel\'s "Themed trip"). The app re-runs the proven single-day lucky engine once per day (each day ' +
        'has its OWN favourable directions and hours) and picks the best DISTINCT place per day. You never compute ' +
        'directions, doors or times yourself — present exactly what it returns.',
      input_schema: {
        type: 'object',
        properties: {
          origin_lat: { type: 'number', description: 'Base latitude (defaults to a FRESH GPS fix, else the app default).' },
          origin_lon: { type: 'number', description: 'Base longitude.' },
          origin_name: { type: 'string', description: 'Base place name (for labels).' },
          start_date: { type: 'string', description: 'First day YYYY-MM-DD (default today).' },
          days: { type: 'integer', description: 'How many consecutive days (1-10, default 3).' },
          category: { type: 'string', description: 'A SINGLE theme/kind of place for EVERY day. Pass the user\'s specific word ("castles", "thermal baths", "hermitages abbeys", "mysterious energetic places", "secluded beaches"...). Becomes real named places via Google Places. If the user gave SEVERAL themes, use "categories" instead.' },
          categories: { type: 'array', items: { type: 'string' }, description: 'MULTIPLE themes for the trip, passed in ONE call (NEVER call this tool once per theme). The app draws each day\'s excursion from this palette, varying the theme across days and picking the best favourable place per day. Use this whenever the user lists more than one theme (e.g. ["sacred nature","hermitages abbeys","thermal baths","medieval villages","organic wineries"]).' },
          area: { type: 'string', description: 'OPTIONAL region/area to STAY WITHIN, distinct from the base (e.g. base "Siena", area "Tuscany"). The app geocodes it to a bounding box and keeps EVERY stop inside it, so the trip can\'t drift into a neighbouring region. Pass it whenever the user names an area to remain in ("tour in Tuscany", "stay in the Dolomites", "Area to stay within: ...").' },
          max_radius_km: { type: 'number', description: 'Maximum distance of each daily excursion from the base in km (default 200).' },
          avoid_crowds: { type: 'boolean', description: 'OPTIONAL. True for quiet / secluded / non-touristy excursions (away from the crowds); gently de-emphasises very popular places without overriding the favourable direction.' }
        },
        required: []
      }
    },
    {
      name: 'plan_mobile_tour',
      description: 'Plan an OPEN-PATH MOBILE-BASE tour: the traveller SLEEPS IN A DIFFERENT PLACE each night, and each ' +
        'night\'s base is reached by a favourable-direction transfer from the previous night\'s base. The path is OPEN ' +
        '(it ends at the last favourable base, it does NOT loop home). Use when the user asks to CHANGE ACCOMMODATION / ' +
        'HOTEL each night, "cambiando alloggio ogni notte", "dormo in un posto diverso ogni sera", "basi mobili", ' +
        '"tour itinerante", "moving from town to town", "road trip sleeping in a different place each night". Different ' +
        'from plan_lucky_multiday, which keeps ONE fixed base. The app chooses each night\'s town by favourable ' +
        'direction on that day, finds a real place of character to sleep there, and returns the chain plus a route map. ' +
        'You never compute directions, doors or times yourself.',
      input_schema: {
        type: 'object',
        properties: {
          origin_name: { type: 'string', description: 'Where the traveller starts (base town name, e.g. "Siena"). The app geocodes it.' },
          origin_lat: { type: 'number', description: 'Start latitude (optional; the name is preferred and geocoded).' },
          origin_lon: { type: 'number', description: 'Start longitude (optional).' },
          start_date: { type: 'string', description: 'First day YYYY-MM-DD (default today).' },
          days: { type: 'integer', description: 'Number of NIGHTS / bases to chain (1-10, default 3).' },
          area: { type: 'string', description: 'OPTIONAL region to STAY WITHIN (e.g. "Tuscany"); every night\'s base is kept inside it.' },
          categories: { type: 'array', items: { type: 'string' }, description: 'OPTIONAL themes (used to flavour the trip; the daytime theme stop layer will use these).' },
          min_leg_km: { type: 'number', description: 'Minimum distance of each nightly transfer in km (default 40).' },
          max_leg_km: { type: 'number', description: 'Maximum distance of each nightly transfer in km (default 120).' }
        },
        required: []
      }
    },
    {
      name: 'plan_city_tour',
      description: 'Compose a ONE-DAY CITY TOUR of famous places INSIDE a city (Rome, Florence, Vienna...). Same XKDG ' +
        'direction model at city scale (NO minimum distance): the app fetches famous places inside the city and assigns ' +
        'each to the double-hour in which its direction FROM THE BASE is favourable, building a walking / short-drive day. ' +
        'Use when the user wants a tour WITHIN a city ("a lucky day in Rome", "tour dentro Firenze", "cosa vedere a Vienna ' +
        'oggi alle ore fortunate", the Lucky Trip panel "City tour"). Pass the city centre (or the user\'s hotel) as ' +
        'origin_lat/lon. You never compute directions or hours yourself — present exactly what it returns.',
      input_schema: {
        type: 'object',
        properties: {
          origin_lat: { type: 'number', description: 'City centre / hotel latitude (defaults to a FRESH GPS fix).' },
          origin_lon: { type: 'number', description: 'City centre / hotel longitude.' },
          origin_name: { type: 'string', description: 'City / base name (for labels).' },
          date: { type: 'string', description: 'Day YYYY-MM-DD (default today).' },
          category: { type: 'string', description: 'OPTIONAL kind of place ("churches", "museums", "castles", "famous attractions"...). Default: famous attractions.' },
          radius_km: { type: 'number', description: 'City extent in km (default 8).' },
          min_km: { type: 'number', description: 'Minimum distance from the base in km (default 0 = include everything in town).' },
          avoid_crowds: { type: 'boolean', description: 'OPTIONAL. Set true when the user wants quiet / secluded / non-touristy stops ("posti tranquilli", "non turistico", "lontano dalla folla", "hidden gems"). Gently de-emphasises very popular places without overriding the favourable direction. Leave false/absent otherwise.' },
          max_stops: { type: 'integer', description: 'How many stops in the day (default 6).' }
        },
        required: []
      }
    },
    {
      name: 'plan_lucky_events',
      description: 'Find REAL dated EVENTS (concerts, theatre, festivals, family shows, sports...) near a base within a ' +
        'date window, and — because an event\'s DATE is fixed — keep the ones whose date has a favourable double-hour ' +
        'whose favourable directions include the event\'s direction FROM THE BASE. Use for "lucky events near me", "what ' +
        'festivals can I reach auspiciously this month", "concerti fortunati a luglio", the Lucky Trip events search. ' +
        'Returns events AUSPICIOUS to reach (with the favourable hour + door + score) and, separately, events found but ' +
        'NOT auspicious to reach on their day. Source: Ticketmaster — strong on ticketed concerts/theatre/festivals, weak ' +
        'on village fairs (sagre). You never compute directions or hours yourself; present what it returns. To navigate to ' +
        'a chosen event use plan_travel with its dest_lat/dest_lon on the event\'s date.',
      input_schema: {
        type: 'object',
        properties: {
          origin_lat: { type: 'number', description: 'Base latitude (defaults to a FRESH GPS fix).' },
          origin_lon: { type: 'number', description: 'Base longitude.' },
          origin_name: { type: 'string', description: 'Base name (for labels).' },
          date_from: { type: 'string', description: 'Window start YYYY-MM-DD (default today).' },
          date_to: { type: 'string', description: 'Window end YYYY-MM-DD (default +30 days).' },
          radius_km: { type: 'number', description: 'Search radius from the base in km (default 80).' },
          category: { type: 'string', description: 'OPTIONAL kind of event in the user\'s own word ("festival", "concerto"/"concert", "teatro"/"theatre", "opera", "jazz", "sport", "family"...). Most map to a keyword; music/theatre/sports/film map to a Ticketmaster segment. Leave empty for all kinds.' },
          max: { type: 'integer', description: 'Max auspicious events to return (default 12).' }
        },
        required: []
      }
    },
    {
      name: 'plan_arrive_by',
      description: 'Plan a journey where the ARRIVAL time matters and the departure is flexible. Use for "I need to ' +
        'be in X by 18:00", "arrive at B around 3pm", "get there for 17:30". Returns several travel solutions that ' +
        'all arrive at the target time (within a ±15 min tolerance by default), ranked SHORTEST trip first and ' +
        'longer ones (which travel through more favourable directions) as secondary options. Charging is optional: ' +
        'pass range_km only if it is an EV and you want charging considered. Supply destination lat/lon and, when the ' +
        'user named a start, origin lat/lon + names (from your knowledge — the planner geocodes the names). By ' +
        'default it also opens the full Travel Planner on the shortest solution (set open_planner:false to only answer).',
      input_schema: {
        type: 'object',
        properties: {
          dest_lat: { type: 'number', description: 'Destination latitude.' },
          dest_lon: { type: 'number', description: 'Destination longitude.' },
          dest_name: { type: 'string', description: 'Destination place name.' },
          origin_lat: { type: 'number', description: 'Origin latitude (defaults to a FRESH GPS fix if omitted).' },
          origin_lon: { type: 'number', description: 'Origin longitude.' },
          origin_name: { type: 'string', description: 'Origin place name.' },
          arrive_date: { type: 'string', description: 'Target arrival date YYYY-MM-DD (default today).' },
          arrive_time: { type: 'string', description: 'Target arrival clock time HH:MM (required).' },
          tolerance_min: { type: 'integer', description: 'Allowed arrival error in minutes (default 15).' },
          range_km: { type: 'number', description: 'EV autonomy in km. Omit if no charging is wanted.' },
          reserve_km: { type: 'number', description: 'EV safety reserve in km.' },
          charging_optional: { type: 'boolean', description: 'Default true: only suggest charging if the distance actually needs it.' },
          max_extra_hours: { type: 'integer', description: 'How many hours longer than the fastest trip to explore (default 5).' },
          open_planner: { type: 'boolean', description: 'Open + run the planner on the shortest solution. Defaults true when origin is known.' }
        },
        required: ['dest_lat', 'dest_lon', 'arrive_time']
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
          depart_hour: { type: 'integer', description: 'Departure hour 0-23. OMIT (with depart_time) for the app to auto-pick the most favourable, earliest departure.' },
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
      name: 'start_compass',
      description: 'Open and ACTIVATE the live compass (the 🧭 button, bottom-left) as a standalone tool — no trip ' +
        'needed. It reads GPS live and shows the net direction (45° quadrant) FROM an origin point, your real ' +
        'travel heading, and a PREDICTION of where on the map you will cross out of the current quadrant into the ' +
        'next one (with distance, ETA and a Maps button). Use this for requests like "start the compass", ' +
        '"activate the compass from here", or "start the compass from <place>" (a place you already left some km ' +
        'behind). Set origin="here" to use the current GPS position as the origin; or pass place="<town/city>" to ' +
        'use that named place as the origin (it is geocoded). With neither, it just opens the compass.',
      input_schema: {
        type: 'object',
        properties: {
          origin: { type: 'string', enum: ['here'], description: 'Set the origin to the current GPS position.' },
          place: { type: 'string', description: 'Set the origin to this named place (geocoded), e.g. a town you already passed.' }
        },
        additionalProperties: false
      }
    },
    {
      name: 'control_compass',
      description: 'Control the already-open live compass by VOICE/command. Map the user\'s spoken request to one ' +
        'action: "expand" (enlarge the map to fullscreen — e.g. "ingrandisci la mappa", "enlarge/expand the map", ' +
        '"agrandis la carte"), "collapse" (shrink it back — "rimpicciolisci", "shrink", "small map"), "close" (close ' +
        'the compass — "chiudi la bussola", "close the compass"), "clear_origin" (forget the origin — "azzera ' +
        'l\'origine", "reset origin", "clear origin"), "refresh" (recompute now from GPS — "ricalcola", "refresh", ' +
        '"recalculate"), "recenter" (re-frame the map on origin/you/exit and resume auto-follow — "ricentra", ' +
        '"recenter", "follow"), "follow_off" (stop auto-follow so the map can be panned freely), "open" (just open ' +
        'the compass). For "start the compass" / setting the origin, use start_compass instead.',
      input_schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['open', 'close', 'expand', 'collapse', 'clear_origin', 'refresh', 'recenter', 'follow_off'], description: 'The compass action to perform.' }
        },
        required: ['action'],
        additionalProperties: false
      }
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
      name: 'get_trip_itinerary',
      description: 'Read the LAST road trip the Travel Planner computed in this session: origin, destination, ' +
        'direction, distance, driving time, and the full ordered list of legs (drives and stops). Each STOP carries its ' +
        'real place name, exact coordinates, clock time, which compass quadrant it exits, and where it heads next. CALL THIS ' +
        'whenever the user asks anything about a specific stop or point of the planned trip (e.g. "where is stop 2?", "dove ' +
        'avviene la sosta 2?", "what\'s the second stop?"). The "index" of each leg matches the numbered list shown in the ' +
        'itinerary card, so "punto 2" = the leg with index 2. Answer directly with the place + coordinates; NEVER tell the ' +
        'user to scroll or look at the card.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'analyze_direction',
      description: 'EXPANDED-VIEW directional analysis (rotating QMDJ chart) for a travel direction at a date/hour. ' +
        'Returns: the qi-flow of the STARTING palace (opposite the travel direction) with intention/emotion/remedy advice; ' +
        'an alert for a strong stem interaction (clash 冲 / combination 合) between the start and destination heaven stems; ' +
        'and a Tai Sui alert if the destination carries the year stem (authority/government). Call this when the user has ' +
        'chosen a DIRECTION or a route (Directions / Travel Planner) AND wants the deeper "Expanded View" detail, or asks to ' +
        'analyse a direction. Keep it concise.',
      input_schema: { type: 'object', properties: {
        date: { type: 'string', description: 'Travel date YYYY-MM-DD.' },
        time: { type: 'string', description: 'Local departure time HH:MM (24h). Defaults to 12:00 if omitted.' },
        direction: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], description: 'Travel direction.' }
      }, required: ['date', 'direction'], additionalProperties: false }
    },
    {
      name: 'find_divination_chart',
      description: 'DIVINATION chart finder. Scan future ROTATING QMDJ hour charts and return the date/double-hours whose ' +
        'chart satisfies a set of conditions: a STEM sitting (on the Tien Pan) in a palace or in ANY of a set of palaces, ' +
        'and/or a DOOR sitting in a palace. ALL conditions must hold in the same chart. Use this for strategic divination, ' +
        'e.g. "find a chart where Bing is in Li, Injury is in Gen, and Geng can be in Gen, Xun, Dui or Qian". Stems: the ten ' +
        'heavenly stems (Jia,Yi,Bing,Ding,Wu,Ji,Geng,Xin,Ren,Gui) or their Han form. Doors: Open,Rest,Birth,Injury,Delusion,' +
        'View,Death,Shocking. Palaces: by trigram (Kan,Kun,Zhen,Xun,Qian,Dui,Gen,Li) or compass (N,SW,E,SE,NW,W,NE,S).',
      input_schema: { type: 'object', properties: {
        stems: { type: 'array', description: 'Stem-position conditions. Each: a stem that must sit (Tien Pan) in one of the listed palaces.',
          items: { type: 'object', properties: {
            stem: { type: 'string', description: 'Heavenly stem, e.g. "Bing" or "丙".' },
            palaces: { type: 'array', items: { type: 'string' }, description: 'Allowed palaces (one must match), e.g. ["Gen","Xun","Dui","Qian"].' }
          }, required: ['stem', 'palaces'] } },
        doors: { type: 'array', description: 'Door-position conditions. Each: a door that must sit in a given palace.',
          items: { type: 'object', properties: {
            door: { type: 'string', description: 'Door name, e.g. "Injury".' },
            palace: { type: 'string', description: 'Palace, e.g. "Gen".' }
          }, required: ['door', 'palace'] } },
        start_date: { type: 'string', description: 'Scan start YYYY-MM-DD (default: today).' },
        days: { type: 'integer', description: 'How many days forward to scan (default 60, max 400).' },
        max_results: { type: 'integer', description: 'Max charts to return (default 20).' }
      }, additionalProperties: false }
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
      name: 'scan_flights',
      description: 'Find FAVOURABLE FLIGHTS between two cities on a date (or date range). Opens the flight panel, ' +
        'fills origin/destination + airport IATA codes + dates, and RUNS the scan, which highlights the days whose ' +
        'flights take off in a favourable double-hour AND/OR a favourable direction toward the destination. Use for ' +
        '"find me a lucky/favourable FLIGHT from A to B on <date>", "good flight day to fly A->B". Supply origin/dest ' +
        'lat/lon and names from your knowledge, and the airport IATA codes when you know them (e.g. Sydney SYD, Gold ' +
        'Coast OOL) so the right airports are used. depart_from = the date (YYYY-MM-DD); add depart_to for a window. ' +
        'For the RETURN leg set leg:"return" and return_from/return_to (it scans the reverse direction B->A). This is ' +
        'for FLIGHTS only — never use plan_travel (road) for a flight.',
      input_schema: {
        type: 'object',
        properties: {
          origin_name: { type: 'string', description: 'Origin city name (e.g. "Sydney").' },
          origin_lat: { type: 'number', description: 'Origin latitude (from your knowledge).' },
          origin_lon: { type: 'number', description: 'Origin longitude.' },
          dest_name: { type: 'string', description: 'Destination city name (e.g. "Gold Coast").' },
          dest_lat: { type: 'number', description: 'Destination latitude.' },
          dest_lon: { type: 'number', description: 'Destination longitude.' },
          origin_iata: { type: 'string', description: 'Origin airport IATA (e.g. SYD). Strongly recommended.' },
          dest_iata: { type: 'string', description: 'Destination airport IATA (e.g. OOL). Strongly recommended.' },
          depart_from: { type: 'string', description: 'Departure date YYYY-MM-DD (single day = this only).' },
          depart_to: { type: 'string', description: 'Optional end of a departure window YYYY-MM-DD.' },
          return_from: { type: 'string', description: 'Optional return date YYYY-MM-DD (use with leg:"return").' },
          return_to: { type: 'string', description: 'Optional end of a return window YYYY-MM-DD.' },
          leg: { type: 'string', enum: ['outbound', 'return'], description: 'Which leg to scan. Default outbound. "return" scans B->A on the return dates.' }
        },
        required: []
      }
    },
    {
      name: 'open_chart_finder',
      description: 'Open the "Find charts by star position" panel.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'list_houses',
      description: 'List the saved houses for the loaded person, with index, name, facing/period, door count, and ' +
        'water_features (across all floors): each explicit aquarium AND each saved Water position, with its name + ' +
        'direction. A saved Water position IS a water feature - if water_features is non-empty, do NOT ask the user for ' +
        'the direction. Use before set_active_house / load_house / load_placement.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'get_house_setup',
      description: 'Return the FULL setup of one saved house resolved BY NAME (e.g. "Vienna"). The house is organised in ' +
        'FLOORS: the response has a floors[] array, each floor carrying its own doors, aquariums (each with its direction ' +
        'and the water star living there) and saved ' +
        'Water/Bed/Desk settings — plus its own facing/period when same_facing_period is false. active_floor marks the ' +
        'current floor. If the user names a floor use it, otherwise use the active floor. ' +
        'Use this when the user names a house (e.g. "activate the aquarium on the first floor of the Vienna house"), then ' +
        'feed an aquarium (direction + water_star) into find_water_activation_full.',
      input_schema: {
        type: 'object',
        properties: { house_name: { type: 'string', description: 'The house name to look up (case-insensitive, partial allowed).' } },
        required: ['house_name']
      }
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
      name: 'find_water_activation',
      description: 'ACTIVATING / turning on a water feature (aquarium, fountain) facing a compass DIRECTION. This is the ' +
        'GUARANTEED double calculation: it runs BOTH the QMDJ water-hour scan for that direction AND the XKDG day scan ' +
        'for the loaded person, then returns each hour with BOTH scores (qimen_score + xkdg_score) and a combined_score. ' +
        'Always use THIS for "good date/time to turn on the aquarium facing X" when you want both Qimen and XKDG considered.',
      input_schema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], description: 'Compass direction the water faces.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' },
          start_date: { type: 'string', description: 'Optional start date YYYY-MM-DD (defaults to today).' }
        },
        required: ['direction']
      }
    },
    {
      name: 'find_water_activation_full',
      description: 'Scan for "positive hours to turn on the aquarium / water feature" - runs and merges: ' +
        '(1) XKDG positive hours for the loaded person, (2) Qimen of the generic 45deg quadrant (direction), and ' +
        '(3) Qimen SPECIAL configurations at the flying-star palace (via the favourable preset). Every hour returned has ' +
        'already passed the QMDJ water veto. Each row carries a TIER (a quality grade): 4 = connects to the person, XKDG ' +
        'score >= 18; 3 = connects, 12-17; 2 = connects, below 12; 1 = does NOT connect to the person but stands on its ' +
        'own (Nayin Power XKDG >= 16, or Qimen quadrant >= 3). Plus person_connected, xkdg_score, qimen_quadrant_score, ' +
        'qimen_special_score and a ready-made why string. Ranked by tier, then xkdg_score, then qimen_score. For "turn on ' +
        'the aquarium facing X" the direction is X and the special-config star is the WATER (facing) star living in ' +
        'palace X (star_type=water, star_num=that star).',
      input_schema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], description: 'Compass quadrant the water faces (for scan 2).' },
          star_type: { type: 'string', enum: ['water', 'mountain'], description: 'For scan 3: water = facing star, mountain = sitting star. For an aquarium use water.' },
          star_num: { type: 'integer', description: 'For scan 3: the flying star number (1-9) living in that palace. Get it from get_house_setup flying_stars (authoritative); never guess.' },
          facing_deg: { type: 'number', description: 'The house/floor facing in degrees (from get_house_setup floor.facing). Pass it so scan 3 uses THIS house\u2019s chart instead of whatever page is open. Strongly recommended.' },
          period: { type: 'integer', description: 'The house/floor period 1-9 (from get_house_setup floor.period). Pass together with facing_deg.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' },
          start_date: { type: 'string', description: 'Optional start date YYYY-MM-DD (defaults to today).' },
          purpose: { type: 'string', enum: ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'], description: 'Optional. Keep ONLY the hours that ALSO serve this purpose ("only Wealth activations this week"). Water itself is NOT a purpose \u2014 it is the MEANS by which a purpose is activated. Omit it and every hour is instead annotated with the purposes it serves (also_good_for).' }
        },
        required: ['direction']
      }
    },
    {
      name: 'configure_shelly',
      description: 'Save the Shelly aquarium-light Worker URL and token (stored locally in the browser, never in code). ' +
        'Ask the user for these ONCE; afterwards program_aquarium_light and aquarium_light work without them.',
      input_schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The Worker base URL, e.g. https://xkdg-shelly.<subdomain>.workers.dev' },
          token: { type: 'string', description: 'The XKDG_TOKEN secret configured on the Worker.' }
        },
        required: ['url', 'token']
      }
    },
    {
      name: 'program_aquarium_light',
      description: 'Compute the next-N-days plan of favourable ON hours for a house\u2019s aquarium and, with commit:true, ' +
        'deposit it into the Shelly Worker for that house. By DEFAULT (commit:false) it only PREVIEWS \u2014 nothing is ' +
        'deposited until you pass commit:true. Rule: each day the light turns ON at the START of the day\u2019s BEST favourable ' +
        'hour. Window: 2nd half of Zi (solar 00:00) through the end of SHEN (solar 17:00); the light then stays ON until ' +
        '23:00 CIVIL clock. EXTENSION: a Tier 4 day stays on until 23:00 of D+2 unless the next day is Tier 3 or better; ' +
        'a Tier 3 day stays on until 23:00 of D+1 unless the next day is Tier 2 or better; Tier 2 and Tier 1 always switch ' +
        'off at 23:00 of their own day. TIER 4 / TIER 3 STRETCH: a strong block runs to the end of the empty stretch that follows it, ' +
        'up to 5 extra days \\u2014 a structure that strong is switched on and not switched off while the next days have nothing; ' +
        'it is NOT always 5 days, only as far as the holes go. COVER THE HOLE: whatever its tier, a day stays on one extra day when the NEXT day ' +
        'has no favourable hour; if TWO days in a row have none, the second switches on anyway on a tier 0 hour that still ' +
        'passed the QMDJ water veto (flagged reserve_tier0 \\u2014 say so: less lucky, still valid). A LATE hour (Xu/Hai) is used only when its block runs past 23:00 of the same ' +
        'day, otherwise the day falls back to its best in-window hour (lower tier), or stays dark. NOTHING is ever asked ' +
        'day by day \u2014 only the final Procedi/Annulla. Times are in the ' +
        'HOUSE\u2019s True Solar Time. After running, show the scheduled dates (on_local/off_local). Night ON times (the Zi hour) are normal \u2014 do NOT flag them or ask about them.',
      input_schema: {
        type: 'object',
        properties: {
          house: { type: 'string', enum: ['tuoro', 'vienna'], description: 'Which house/plug to program.' },
          days: { type: 'integer', description: 'How many days ahead to plan (default 7).' },
          commit: { type: 'boolean', description: 'false (default) = PREVIEW: compute and return the plan WITHOUT depositing anything. true = deposit the plan into the Worker. Only set true AFTER the user has seen the preview and said OK.' },
          purpose: { type: 'string', enum: ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'], description: 'Optional. Plan ONLY on hours that also serve this purpose \u2014 use it for "program only Wealth activations for next week". Water is not a purpose: it is the MEANS by which a purpose is activated. Omit it and every scheduled day is annotated with the purposes it serves (also_good_for).' }
        },
        required: ['house']
      }
    },
    {
      name: 'refresh_alexa_digest',
      description: 'Refresh the 7-day SUMMARY that the Alexa skill reads out loud (the lucky XKDG hours of the '
        + 'loaded person + the lucky travel directions), and deposit it into the Shelly Worker. This is the same '
        + 'summary that program_aquarium_light refreshes as a side effect when it commits a plan: use THIS tool when '
        + 'the user wants the summary brought up to date WITHOUT touching the aquarium light - e.g. "aggiorna il '
        + 'riassunto", "rinfresca quello che dice Alexa". Sources and thresholds are the calendar export\'s own '
        + '(XKDG score >= 15 with a real XKDG relation, direction score >= 10); night hours Zi/Chou/Yin are excluded. '
        + 'It uses whichever person is loaded BY HAND and never loads or switches one: with nobody loaded the summary '
        + 'carries the directions only, and you must say so. The purpose is generic unless one is passed, and purpose '
        + 'names stay in ENGLISH everywhere, Alexa included.',
      input_schema: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'Window in days (default 7 - the same window as the aquarium plan and the summary\'s own life span).' },
          start_date: { type: 'string', description: 'YYYY-MM-DD, today or later. Defaults to today.' },
          purpose: { type: 'string', enum: ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'], description: 'Optional. Restrict the summary to this purpose. Omit it for a generic summary (the default). Keep the key in English.' }
        }
      }
    },
    {
      name: 'plan_directional_detour',
      description: 'Reach a FIXED destination in two legs when the direct direction has no usable hour - '
        + '"the outlet is 150 km NW but NW is no good today, could I go W first and then turn N?". Use it whenever '
        + 'the user names a place they want to reach and asks about going there indirectly, by a detour, in two '
        + 'stages, or "first X then Y". This is NOT find_lucky_chain: a chain wanders with no destination, this one '
        + 'has a fixed target and requires BOTH legs to be favourable in their own hour. Every leg is judged on the '
        + 'straight-line MAGNETIC bearing from its start to its end - leg 2 from the pivot to the final destination - '
        + 'and the pivot is snapped to a real place to stop when one is near.',
      input_schema: {
        type: 'object',
        properties: {
          destination: { type: 'string', description: 'Where the user actually wants to end up: a place name or address.' },
          dest_lat: { type: 'number', description: 'Optional, instead of the name.' },
          dest_lon: { type: 'number', description: 'Optional, instead of the name.' },
          origin_name: { type: 'string', description: 'Starting point if it is not the current GPS position.' },
          origin_lat: { type: 'number' },
          origin_lon: { type: 'number' },
          date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
          from_time: { type: 'string', description: 'HH:MM - the earliest the user can leave. Defaults to now.' },
          window_hours: { type: 'integer', description: 'How many hours ahead to search (default 14).' },
          max_wait_min: { type: 'integer', description: 'Longest acceptable wait at the pivot, in minutes (default 120).' },
          speed_kmh: { type: 'number', description: 'Road speed estimate for the timing (default 70).' }
        },
        required: ['destination']
      }
    },
    {
      name: 'find_purpose_direction',
      description: 'The PURPOSE ACTIVATION calculator, headless \u2014 for TRAVEL/MOVEMENT directions (the ROTATING chart ' +
        '\u8f49\u76e4, e.g. driving, walking, a trip), NOT for a house palace. Same seven purposes as find_purpose_activation ' +
        'and as the date PURPOSES (health, career, wealth, relationship, journey, speak, legal), same canonical QMDJ gate ' +
        '(\u00a71 exclusions + \u00a72 San Qi/Wu + favourable door \u2014 travel mode also admits the Injury \u50b7 door when redeemed by ' +
        'San Qi/Wu, as every other travel-direction check in the app already does). (1) With purpose set: on which dates/hours ' +
        'is heading in THAT direction favourable for that purpose (e.g. \"quando \u00e8 un buon momento per un viaggio di lavoro ' +
        'verso NW nei prossimi giorni\" \u2192 purpose=career, direction=NW). (2) With purpose omitted: for a direction (or all ' +
        '8), reports every hour whose gate passes canonically AND which purposes it also happens to serve. Purposes and ' +
        'their primary doors: health=Rest \u4f11, career=Open \u958b/View \u666f, wealth=Birth \u751f (+Wu \u620a), relationship=Rest \u4f11, ' +
        'journey=Rest \u4f11, speak=View \u666f, legal=Shocking \u9a5a (redeemed by San Qi). Use this for \"best hours to travel this ' +
        'way in the next few days\", or to annotate a Lucky Trip/Travel Planner answer with which purposes a chosen window ' +
        'also serves. This does NOT replan a route \u2014 pair it with plan_travel or plan_lucky_day_trip for the actual trip.',
      input_schema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], description: 'The travel direction. Omit to scan all 8 and report where each purpose appears.' },
          purpose: { type: 'string', enum: ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'], description: 'Restrict to ONE purpose. Omit to scan all seven and get, for each hour, the list of purposes it serves.' },
          start_date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today; a past date is ignored.' },
          days: { type: 'integer', description: 'How many days to scan (default 7).' },
          full: { type: 'boolean', description: 'true = return every row; default returns the top 20.' }
        }
      }
    },
    {
      name: 'find_purpose_activation',
      description: 'The PURPOSE ACTIVATION calculator, headless \\u2014 the same engine as the \\u26a1 ACTIVATION panel in the app. ' +
        'Water is NOT a purpose: it is the MEANS by which a purpose is activated. So this answers two different questions. ' +
        '(1) With purpose set: on which dates/hours is the palace favourable for THAT purpose (its primary Qimen door)? ' +
        'Use it for \"only Wealth activations this week\", \"good Career hours at my aquarium\". ' +
        '(2) With purpose omitted: it scans ALL purposes and reports, per date+hour, WHICH purposes that hour serves \\u2014 ' +
        'use this to annotate a water/aquarium plan (\"this hour is also good for Wealth and Career\"). ' +
        'Purposes and their primary doors: health=Rest \\u4f11, career=Open \\u958b/View \\u666f, wealth=Birth \\u751f (+Wu \\u620a), ' +
        'relationship=Rest \\u4f11, journey=Rest \\u4f11, speak=View \\u666f, legal=Shocking \\u9a5a (redeemed by San Qi). ' +
        'All canonical QMDJ rules apply (\\u00a71 exclusions + \\u00a72 San Qi/Wu + favourable door), flying chart \\u98db\\u76e4. ' +
        'Give a direction (the palace to look at, e.g. the aquarium\\u2019s) or omit it to search all 8 palaces.',
      input_schema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], description: 'The palace to scan. Omit to scan all 8 outer palaces and report where each purpose appears.' },
          purpose: { type: 'string', enum: ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'], description: 'Restrict to ONE purpose. Omit to scan all seven and get, for each hour, the list of purposes it serves.' },
          start_date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today; a past date is ignored.' },
          days: { type: 'integer', description: 'How many days to scan (default 7).' },
          full: { type: 'boolean', description: 'true = return every row; default returns the top 20.' }
        }
      }
    },
    {
      name: 'aquarium_light',
      description: 'Manually turn a house\u2019s aquarium LIGHT on/off, or read its status, via the Shelly Worker. Takes ' +
        'precedence over the automatic plan.',
      input_schema: {
        type: 'object',
        properties: {
          house: { type: 'string', enum: ['tuoro', 'vienna'], description: 'Which house/plug.' },
          turn: { type: 'string', enum: ['on', 'off', 'status'], description: 'on, off, or status (default status).' }
        },
        required: ['house']
      }
    },
    {
      name: 'aquarium_plan',
      description: 'Read, cancel or pause the aquarium-light plan ACTUALLY stored in the Shelly Worker for a house. '
        + 'action:"get" is the ONLY way to know what is really scheduled \u2014 whether the light comes on tomorrow, or '
        + 'whether it switches off at 23:00 tonight. aquarium_light only reports whether the plug is on RIGHT NOW, and '
        + 'program_aquarium_light only computes a plan without reading the stored one. So NEVER answer a question about '
        + 'what is scheduled from memory, from the rules, or from the source code \u2014 call this. action:"cancel" empties '
        + 'the stored plan (the light then never switches by itself until a new plan is deposited); note that depositing '
        + 'a new plan with program_aquarium_light(commit:true) ALREADY replaces the old one, so cancel is only needed to '
        + 'leave a house with no plan at all. Because cancel is destructive, first show what is stored with action:"get" '
        + 'and ask for confirmation with [[BTN]] Procedi=procedi | Annulla=annulla, then call with action:"cancel". '
        + 'action:"pause" keeps the plan but stops the automation; action:"resume" starts it again. Manual on/off via '
        + 'aquarium_light always works regardless. Times come back as the house\u2019s own wall clock: report them exactly '
        + 'as returned and never recompute them.',
      input_schema: { type: 'object',
        properties: {
          house: { type: 'string', enum: ['tuoro', 'vienna'], description: 'Which house/plug.' },
          action: { type: 'string', enum: ['get', 'cancel', 'pause', 'resume', 'clear_alerts'],
            description: 'get (default) = read the stored plan; cancel = empty it; pause/resume = automation master switch.' }
        },
        required: ['house'] }
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
    },
    {
      name: 'find_lodging',
      description: 'PRACTICAL place-to-sleep lookup along a route or near a point — a plain hotel/lodging search, ' +
        'NOT a lucky/directional plan and NOT out of scope. USE IT for everyday requests like "trova un hotel ' +
        'economico lungo la strada tra Trento e il confine", "un B&B dove fermarmi a dormire vicino a Bolzano", ' +
        '"cheap hotel near X", "dove dormo lungo il percorso". NEVER refuse these as beyond the app. YOU supply the ' +
        'coordinates of a sensible search point along the road (from your own geography — e.g. a town that fits the ' +
        '"stop after A / before B" (e.g. Vipiteno/Bressanone between Trento and the Brenner). Default style ' +
        'is ECONOMY (best-rated affordable hotels via Google, CHAINS INCLUDED); pass style="character" only when the ' +
        'user asks for boutique / independent / charming places. Returns a ranked list (name, address, rating). ' +
        'Present it plainly as travel options — no fortune/direction scoring is applied here.',
      input_schema: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude of the search point along the route (a town between origin and destination matching "after A / before B").' },
          lon: { type: 'number', description: 'Longitude of the search point.' },
          area_name: { type: 'string', description: 'Name of that town/area, for labels (e.g. "Vipiteno").' },
          style: { type: 'string', enum: ['economy', 'character'], description: 'economy (default) = best affordable hotels incl. chains; character = independent/boutique places of character.' },
          radius_km: { type: 'number', description: 'Search radius in km (default 20).' },
          max_results: { type: 'integer', description: 'How many to return (1-12, default 6).' }
        },
        required: ['lat', 'lon']
      }
    },
    {
      name: 'get_hexagram_info',
      description: 'XKDG hexagram lookup (CORE in-app knowledge, NOT external I Ching). Given a hexagram by number ' +
        '(1-64) OR by its two trigrams (upper + lower, e.g. upper "Kun", lower "Kan"), return the app\'s own data: ' +
        'hexagram number, upper/lower trigrams, qi (1-9), yun (1-9), whether it is Zheng Shen 正神 or Ling Shen 零神 ' +
        'for the current period, its luopan centre degree, and the family/families it belongs to WITH the role ' +
        '(father/mother/son/daughter) via its gan-zhi. Use for ANY question about hexagrams, trigrams, gua, qi, yun, ' +
        'families/roles, or Zheng Shen / Ling Shen. Trigram names: Qian, Dui, Li, Zhen, Xun, Kan, Gen, Kun.',
      input_schema: {
        type: 'object',
        properties: {
          hex_number: { type: 'integer', description: 'Hexagram number 1-64 (King Wen).' },
          upper_trigram: { type: 'string', description: 'Upper trigram name (Qian/Dui/Li/Zhen/Xun/Kan/Gen/Kun).' },
          lower_trigram: { type: 'string', description: 'Lower trigram name (Qian/Dui/Li/Zhen/Xun/Kan/Gen/Kun).' }
        }
      }
    },
    {
      name: 'find_lucky_charge_day',
      description: 'For a LONG EV trip that needs charging stops: search across departure DAYS for one where MORE ' +
        'THAN HALF the trip\'s stops (cash stops + charging stops together) land inside a fortunate window. Reuses ' +
        'the real single-day planner (real route, real chargers, real SoC) once per candidate day \u2014 it does NOT ' +
        'invent a shortcut. If a day clears the 50% threshold it stops there and posts that itinerary as the normal ' +
        'chat card. If NO day in the search window clears it, it says so explicitly and still posts the CLOSEST day ' +
        'found as a card, with its exact fraction \u2014 so the user sees a real itinerary either way and can decide ' +
        '(e.g. \"parto un altro giorno\" vs \"va bene comunque\"). Requires the route\'s origin/dest coordinates (usually ' +
        'already known from the conversation) and the car\'s range (range_km, reserve_km) \u2014 without a range this is ' +
        'no different from find fastest itinerary and should not be called. Takes 10-60+ seconds (several real plans ' +
        'computed in sequence); tell the user you are searching before calling it.',
      input_schema: {
        type: 'object',
        properties: {
          origin_lat: { type: 'number' }, origin_lon: { type: 'number' },
          dest_lat: { type: 'number' }, dest_lon: { type: 'number' }, dest_name: { type: 'string' },
          start_date: { type: 'string', description: 'YYYY-MM-DD to start searching from (defaults to today).' },
          max_days: { type: 'integer', description: 'How many consecutive days to try (default 5, max 14).' },
          threshold: { type: 'number', description: 'Fraction of stops that must be fortunate, 0-1 (default 0.5 = more than half).' },
          range_km: { type: 'number', description: 'Current usable range in km (from the car\'s live SoC if known).' },
          reserve_km: { type: 'number', description: 'Reserve to keep in km.' }
        },
        required: ['origin_lat', 'origin_lon', 'dest_lat', 'dest_lon', 'range_km']
      }
    },
    {
      name: 'find_water_star_charts',
      description: 'Flying Stars WATER-STAR (\u5411\u661f) constraint solver. The water stars of ANY chart are fully ' +
        'determined by just two choices: the star at the centre (1-9) and the flight direction (\u9806 forward / \u9006 ' +
        'reverse) \u2014 18 possible flights \u2014 PLUS the \u4ee4\u661f\u5165\u56da liberation variants: when the current-era ruler water ' +
        'star (9 during period 9) sits at the centre it is imprisoned and can be released by SWAPPING with the palace ' +
        'holding water-star 5, or toward the FACING palace (same two classical release palaces the app\'s ruler-release ' +
        'feature already uses). Given constraints like "water star 9 at SW, 6 at NW or NE, no 5 or 2 at W or SE", this ' +
        'enumerates the full pool and returns the EXACT matches (liberation variants clearly labeled with their ' +
        'mechanism); when none exist it says so explicitly and returns the NEAREST candidates ranked by satisfied ' +
        'constraints, with a per-constraint breakdown. Pass the base chart (period + facing degree or mountain) to ' +
        'enable the toward-facing liberation and to report the base chart\'s own water stars. Mountain (\u5c71) and base ' +
        '(\u904b) stars are untouched by design. Palace names: SE,S,SW,E,C,W,NE,N,NW (South-at-top grid).',
      input_schema: {
        type: 'object',
        properties: {
          require: {
            type: 'array',
            description: 'Constraints that MUST hold. Each: { star: 1-9, palaces: ["SW"] } means that star must sit in ONE of the listed palaces.',
            items: { type: 'object', properties: {
              star: { type: 'integer', description: 'Water star number 1-9.' },
              palaces: { type: 'array', items: { type: 'string' }, description: 'Allowed palaces for this star (any one of them satisfies it).' }
            }, required: ['star', 'palaces'] }
          },
          exclude: {
            type: 'array',
            description: 'Constraints that must NOT hold. Each: { star: 5, palaces: ["W","SE"] } means that star must sit in NONE of the listed palaces.',
            items: { type: 'object', properties: {
              star: { type: 'integer', description: 'Water star number 1-9.' },
              palaces: { type: 'array', items: { type: 'string' }, description: 'Forbidden palaces for this star.' }
            }, required: ['star', 'palaces'] }
          },
          base_period: { type: 'integer', description: 'Optional: period (1-9) of the base chart, to report its own water stars for comparison.' },
          base_facing_deg: { type: 'number', description: 'Optional: facing degrees of the base chart (e.g. 237).' },
          base_facing_mountain: { type: 'string', description: 'Optional alternative to base_facing_deg: the facing mountain character (e.g. \u5764).' }
        },
        required: []
      }
    },
    {
      name: 'seed_manual_chart',
      description: 'Fill the \u2b50 Manual flying-stars editor with a chart for the user to REVIEW \u2014 never applies it ' +
        '(the user presses Apply themselves). Use as the FINAL step of a water-star variant search: pass the chosen ' +
        'candidate\'s water_stars (from find_water_star_charts) plus the base chart (period + facing degree or ' +
        'mountain); the mountain \u5c71 and base \u904b stars are taken UNCHANGED from that base chart, exactly as the ' +
        'method requires ("only the water stars change"). Opens the editor and pre-fills all 27 cells.',
      input_schema: {
        type: 'object',
        properties: {
          water_stars: {
            type: 'object',
            description: 'The chosen water stars, one per palace: { "SE":1,"S":5,"SW":9,"E":2,"C":3,"W":7,"NE":6,"N":4,"NW":8 }.',
            properties: { SE:{type:'integer'},S:{type:'integer'},SW:{type:'integer'},E:{type:'integer'},C:{type:'integer'},W:{type:'integer'},NE:{type:'integer'},N:{type:'integer'},NW:{type:'integer'} },
            required: ['SE','S','SW','E','C','W','NE','N','NW']
          },
          base_period: { type: 'integer', description: 'Period (1-9) of the base chart supplying the unchanged \u5c71/\u904b stars.' },
          base_facing_deg: { type: 'number', description: 'Facing degrees of the base chart (e.g. 237).' },
          base_facing_mountain: { type: 'string', description: 'Alternative to base_facing_deg: the facing mountain character (e.g. \u5764).' }
        },
        required: ['water_stars']
      }
    },
    {
      name: 'list_source',
      description: 'List the app\'s own source files (the live published version on GitHub, branch main). Use this ' +
        'when the user asks how something is IMPLEMENTED, how a feature works under the hood, or to look something ' +
        'up in the actual code. It lists SOURCE FILES ONLY: it cannot tell you the state of a device, a stored ' +
        'schedule, a Worker, or whether something is scheduled to happen \u2014 for that use the tools of the area ' +
        'concerned (load_tools first if you are not carrying them). Returns each file name with its size. After ' +
        'listing, pick the relevant file(s) and call read_source to read them.',
      input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'read_source',
      description: 'Read one of the app\'s own source files, fetched LIVE from GitHub (branch main) at call time, so ' +
        'it always reflects the latest PUSHED code (note: not local unpushed edits; GitHub\'s CDN may lag ~5 min ' +
        'right after a push). Use after list_source to inspect how a feature is built and answer from the real code. ' +
        'Large files are truncated; pass a search term to focus on the relevant part. Only the app\'s own root files ' +
        'are allowed.',
      input_schema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Exact file name from list_source, e.g. "qmdj-water-scanner.js", "app-fengshui.js", "ai-chat.js", "index.html".' },
          search: { type: 'string', description: 'Optional: a keyword/function name to focus on. Returns the matching regions (with context) instead of the whole file — cheaper and more precise for big files.' }
        },
        required: ['file']
      }
    },
    {
      name: 'diagnose_maps_export',
      description: 'Inspect why the Google Maps link for the last planned trip may differ from the planned stops/itinerary. ' +
        'Returns the ACTUAL Maps link, its parsed waypoints (named vs anonymous coordinate), the planned itinerary it was ' +
        'built from, the real-road route state (and whether it matches this trip), the drop/cap rules, and a diff. Call this ' +
        'when the user asks why Google Maps shows a different route, what the lettered A/B/C pins are, or why a stop is missing.',
      input_schema: { type: 'object', properties: {}, required: [] }
    }
  ];

  // XKDG hexagram / trigram / family lookup — answers from the app's own tables.
  // Water-star (向星) constraint solver — session 23. The full search space is
  // tiny and CLOSED: centre star (1-9) × flight direction (順/逆) = 18 charts.
  // Requiring one star at one palace already cuts it to exactly 2 candidates
  // (the flight path is a fixed permutation), so over-constrained requests are
  // the NORM, not the exception. The tool therefore never just says "no": it
  // returns the nearest candidates with a per-constraint breakdown, so Edu can
  // see precisely which condition the Luoshu flight makes impossible to combine.
  async function toolFindLuckyChargeDay(input) {
    input = input || {};
    if (!window.TravelPlanner || typeof window.TravelPlanner.findLuckyDeparture !== 'function')
      return { error: 'Travel Planner not available on this page (needs the session-23 travel-planner.js).' };
    if (input.origin_lat == null || input.dest_lat == null) return { error: 'Need origin_lat/lon and dest_lat/lon.' };
    if (!(parseFloat(input.range_km) > 0)) return { error: 'Need range_km (current usable range) \u2014 without it use plan_travel instead.' };
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;
    var startDate = (/^\d{4}-\d{2}-\d{2}$/.test(input.start_date || '')) ? input.start_date : todayIso();
    try {
      var r = await window.TravelPlanner.findLuckyDeparture(
        { originLat: +input.origin_lat, originLon: +input.origin_lon, destLat: +input.dest_lat, destLon: +input.dest_lon, utc: utc, dst: dstActiveOn(new Date()) },
        { startDate: startDate, maxDays: input.max_days, threshold: input.threshold,
          rangeKm: +input.range_km, reserveKm: (input.reserve_km != null) ? +input.reserve_km : null }
      );
      if (r.ok) {
        return {
          found: true, chosen_date: r.chosen_date, lucky_fraction: Math.round(r.lucky_fraction * 100) + '%',
          days_tried: r.days_tried,
          note: 'The itinerary for ' + r.chosen_date + ' is posted as the normal chat card (charging stops included, ' +
            'more than the required fraction fortunate). Reply with ONE short sentence naming the date and the fraction ' +
            '\u2014 do NOT paste the itinerary, it is already in the card below.'
        };
      }
      return {
        found: false, days_tried: r.days_tried,
        closest: r.best ? { date: r.best.date, lucky_fraction: Math.round(r.best.lucky_fraction * 100) + '%' } : null,
        note: r.best
          ? 'NO day in the next ' + r.days_tried + ' cleared the threshold. The CLOSEST day (' + r.best.date + ', ' +
            Math.round(r.best.lucky_fraction * 100) + '% fortunate) is posted as the chat card anyway so the user sees a ' +
            'real itinerary. Tell them plainly no day met the bar, name the closest one and its fraction, and ask if ' +
            'they want to use it, search further days, or relax the threshold.'
          : 'No feasible itinerary was found at all in the search window \u2014 tell the user plainly and suggest widening the range or checking the route.'
      };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }
  function toolFindWaterStarCharts(input) {
    try {
      if (typeof FlyingStars === 'undefined') return { error: 'flying-stars.js not loaded.' };
      var IDX = { SE: 0, S: 1, SW: 2, E: 3, C: 4, W: 5, NE: 6, N: 7, NW: 8 };
      var NAME = ['SE', 'S', 'SW', 'E', 'C', 'W', 'NE', 'N', 'NW'];
      function normPalaces(arr) {
        var out = [];
        (arr || []).forEach(function (p) {
          var k = String(p || '').trim().toUpperCase();
          if (k === 'CENTER' || k === 'CENTRE' || k === 'CENTRO') k = 'C';
          if (IDX[k] != null) out.push(k);
        });
        return out;
      }
      var reqs = [], excs = [], errs = [];
      (input.require || []).forEach(function (r) {
        var s = parseInt(r && r.star, 10), ps = normPalaces(r && r.palaces);
        if (!(s >= 1 && s <= 9) || !ps.length) { errs.push('Bad require entry: ' + JSON.stringify(r)); return; }
        reqs.push({ star: s, palaces: ps });
      });
      (input.exclude || []).forEach(function (r) {
        var s = parseInt(r && r.star, 10), ps = normPalaces(r && r.palaces);
        if (!(s >= 1 && s <= 9) || !ps.length) { errs.push('Bad exclude entry: ' + JSON.stringify(r)); return; }
        excs.push({ star: s, palaces: ps });
      });
      if (errs.length) return { error: errs.join(' · ') };
      if (!reqs.length && !excs.length) return { error: 'Give at least one require or exclude constraint.' };

      // Optional base chart, for comparison
      var baseInfo = null;
      var bp = parseInt(input.base_period, 10);
      var bMtn = null;
      if (input.base_facing_mountain && FlyingStars.ALL_MOUNTAINS.indexOf(String(input.base_facing_mountain).trim()) >= 0) {
        bMtn = String(input.base_facing_mountain).trim();
      } else if (input.base_facing_deg != null && isFinite(parseFloat(input.base_facing_deg)) && typeof fsMountainCharFromDeg === 'function') {
        bMtn = fsMountainCharFromDeg(parseFloat(input.base_facing_deg));
      }
      var baseChart = null;
      if (bp >= 1 && bp <= 9 && bMtn) {
        try { baseChart = FlyingStars.calculate(bp, bMtn); } catch (e) {}
        if (baseChart) {
          var bws = {}; NAME.forEach(function (n, i) { bws[n] = baseChart.facingStars[i]; });
          baseInfo = {
            period: bp, facing_mountain: bMtn, sitting_mountain: baseChart.sittingMountain,
            water_stars: bws,
            water_center: baseChart.facingStars[4],
            water_flight: baseChart.facingForward ? 'forward \u9806' : 'reverse \u9006'
          };
        }
      }

      // Enumerate the closed space: 9 centres × 2 directions = 18 charts
      var candidates = [];
      for (var c = 1; c <= 9; c++) {
        [true, false].forEach(function (fwd) {
          var ws = FlyingStars.flyStars(c, fwd);
          var wsMap = {}; NAME.forEach(function (n, i) { wsMap[n] = ws[i]; });
          candidates.push({
            water_center: c,
            flight: fwd ? 'forward \u9806' : 'reverse \u9006',
            water_stars: wsMap, _ws: ws,
            is_base_chart: !!(baseChart && baseChart.facingStars[4] === c && baseChart.facingForward === fwd)
          });
        });
      }

      // 令星入囚 liberation variants (Edu, session 23). Semantics taken from the
      // app's OWN existing rule (_fsPurpactRulerRelease in app-fengshui.js): when
      // the CURRENT-ERA ruler water star sits at the CENTRE it is imprisoned, and
      // the two classical release palaces are \u2460 the facing palace, \u2461 the palace
      // where water-star 5 lives. Ruler = QFS.currentPeriod() (P9 today, so this
      // fires for star 9 "solo durante il periodo 9" exactly as Edu stated \u2014 and
      // stays correct after 2044 automatically). Modeled as a SWAP ("scambiando",
      // Edu's word): the ruler moves to the release palace, the star that was
      // there moves to the centre. Each variant is labeled with its mechanism.
      var ruler = (window.QFS && typeof window.QFS.currentPeriod === 'function')
        ? window.QFS.currentPeriod()
        : (((Math.floor((new Date().getFullYear() - 1864) / 20)) % 9) + 1);
      var facingIdx = (baseChart && FlyingStars.DIR_TO_INDEX[baseChart.facingDirection] != null)
        ? FlyingStars.DIR_TO_INDEX[baseChart.facingDirection] : null;
      var liberated = [], seenLib = {};
      candidates.slice().forEach(function (cand) {
        if (cand._ws[4] !== ruler) return;   // ruler not imprisoned in this flight
        function addVariant(swapIdx, mechanism) {
          if (swapIdx == null || swapIdx === 4) return;
          var v = cand._ws.slice();
          var tmp = v[swapIdx]; v[swapIdx] = v[4]; v[4] = tmp;
          var key = v.join(',');
          if (seenLib[key]) return; seenLib[key] = 1;
          var wsMap = {}; NAME.forEach(function (n, i) { wsMap[n] = v[i]; });
          liberated.push({
            water_center: cand.water_center,
            flight: cand.flight,
            liberated: true,
            liberation: mechanism,
            note: 'Ruler ' + ruler + ' imprisoned at centre (\u4ee4\u661f\u5165\u56da), released ' +
              (mechanism === 'toward_facing' ? 'toward the facing palace (' + NAME[swapIdx] + ')' : 'by swapping with water-star 5 (at ' + NAME[swapIdx] + ')') +
              ' \u2014 current period ' + ruler + ' only.',
            water_stars: wsMap, _ws: v,
            is_base_chart: false
          });
        }
        // \u2461 swap with the palace holding water-star 5
        for (var i = 0; i < 9; i++) { if (i !== 4 && cand._ws[i] === 5) addVariant(i, 'swap_with_5'); }
        // \u2460 toward the facing palace \u2014 only when the base facing is known
        if (facingIdx != null) addVariant(facingIdx, 'toward_facing');
      });
      var libSkippedNote = null;
      if (facingIdx == null && candidates.some(function (x) { return x._ws[4] === ruler; })) {
        libSkippedNote = 'toward_facing liberation variants were SKIPPED: no base facing given. Pass base_period + base_facing_deg (or base_facing_mountain) to include them.';
      }
      candidates = candidates.concat(liberated);

      // Constraint check on the full pool (18 flights + liberation variants)
      candidates.forEach(function (cand) {
        var ws = cand._ws, passed = [], failed = [];
        reqs.forEach(function (r) {
          var ok = r.palaces.some(function (p) { return ws[IDX[p]] === r.star; });
          (ok ? passed : failed).push('star ' + r.star + ' at ' + r.palaces.join('|'));
        });
        excs.forEach(function (r) {
          var hit = r.palaces.filter(function (p) { return ws[IDX[p]] === r.star; });
          if (hit.length) failed.push('star ' + r.star + ' must NOT be at ' + r.palaces.join('|') + ' (it sits at ' + hit.join(',') + ')');
          else passed.push('star ' + r.star + ' not at ' + r.palaces.join('|'));
        });
        cand.satisfied = passed.length; cand.total = reqs.length + excs.length;
        cand.passed = passed; cand.failed = failed;
        delete cand._ws;
      });
      var exact = candidates.filter(function (x) { return x.failed.length === 0; });
      var out = {
        search_space: '18 Luoshu flights (centre 1-9 \u00d7 forward/reverse) + \u4ee4\u661f\u5165\u56da liberation variants (ruler ' + ruler + ' at centre, released toward the facing or by swapping with water-star 5 \u2014 current period only). Water stars ONLY \u2014 mountain \u5c71 and base \u904b stars are untouched.',
        current_period_ruler: ruler,
        constraints: { require: reqs, exclude: excs },
        exact_matches: exact
      };
      if (libSkippedNote) out.note = libSkippedNote;
      if (baseInfo) out.base_chart = baseInfo;
      if (!exact.length) {
        candidates.sort(function (a, b) { return b.satisfied - a.satisfied; });
        var best = candidates[0] ? candidates[0].satisfied : 0;
        out.no_exact_solution = true;
        out.why = 'The Luoshu flight is a single fixed path: choosing the centre star and the direction fixes ALL nine ' +
          'positions at once. Requiring one star at one specific palace already narrows the space to exactly 2 charts ' +
          '(one per direction), so combined constraints are often mutually impossible \u2014 not a limitation of the app.';
        out.nearest = candidates.filter(function (x) { return x.satisfied === best; });
      }
      return out;
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }
  // Fill the ⭐ Manual editor with a reviewed chart — session 23. The 山/運
  // stars come UNCHANGED from the base chart (period+facing → calculate());
  // only the water stars are the chosen variant. Never applies: the user
  // reviews the pre-filled editor and presses Apply themselves.
  function toolSeedManualChart(input) {
    try {
      if (typeof FlyingStars === 'undefined') return { error: 'flying-stars.js not loaded.' };
      if (typeof fsSeedManualStars !== 'function') return { error: 'Manual editor not available (app-fengshui.js too old — push the session-23 version).' };
      var NAME = ['SE', 'S', 'SW', 'E', 'C', 'W', 'NE', 'N', 'NW'];
      var wsIn = input.water_stars || {};
      var fac = [];
      for (var i = 0; i < 9; i++) {
        var v = parseInt(wsIn[NAME[i]], 10);
        if (!(v >= 1 && v <= 9)) return { error: 'water_stars.' + NAME[i] + ' must be 1-9.' };
        fac[i] = v;
      }
      // Base chart for the unchanged 山/運 stars
      var bp = parseInt(input.base_period, 10);
      var bMtn = null;
      if (input.base_facing_mountain && FlyingStars.ALL_MOUNTAINS.indexOf(String(input.base_facing_mountain).trim()) >= 0) {
        bMtn = String(input.base_facing_mountain).trim();
      } else if (input.base_facing_deg != null && isFinite(parseFloat(input.base_facing_deg)) && typeof fsMountainCharFromDeg === 'function') {
        bMtn = fsMountainCharFromDeg(parseFloat(input.base_facing_deg));
      }
      // Fallbacks: the panel's own fields, then an existing manual chart
      if (!(bp >= 1 && bp <= 9)) { var pEl = document.getElementById('fs-period'); bp = pEl ? parseInt(pEl.value, 10) : NaN; }
      if (!bMtn && typeof fsMountainCharFromDeg === 'function') {
        var hEl = document.getElementById('fs-house-facing');
        var hd = hEl ? parseFloat(hEl.value) : NaN;
        if (isFinite(hd)) bMtn = fsMountainCharFromDeg(hd);
      }
      var sit = null, base = null, srcNote;
      if (bp >= 1 && bp <= 9 && bMtn) {
        try {
          var bc = FlyingStars.calculate(bp, bMtn);
          sit = bc.sittingStars.slice(); base = bc.baseStars.slice();
          srcNote = '\u5c71/\u904b stars from period ' + bp + ' facing ' + bMtn + ' (unchanged, as required).';
        } catch (e) {}
      }
      if (!sit && window._fsManualChart && window._fsManualChart.sittingStars) {
        sit = window._fsManualChart.sittingStars.slice();
        base = window._fsManualChart.baseStars.slice();
        srcNote = '\u5c71/\u904b stars kept from the existing manual chart (no base chart given).';
      }
      if (!sit) return { error: 'Cannot determine the base chart for the \u5c71/\u904b stars: pass base_period + base_facing_deg (or base_facing_mountain), or set House Facing and Period in the panel first.' };
      var ok = fsSeedManualStars(sit, fac, base);
      if (!ok) return { error: 'Could not open/fill the Manual editor.' };
      return { ok: true, note: 'Manual editor opened and pre-filled. ' + srcNote + ' The user must review it and press Apply \u2014 nothing has been applied.' };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }
  function toolHexagramInfo(input) {
    try {
      var TRIG = ['Qian', 'Dui', 'Li', 'Zhen', 'Xun', 'Kan', 'Gen', 'Kun'];
      function normTrig(s) {
        if (!s) return null;
        s = String(s).trim().toLowerCase();
        for (var i = 0; i < TRIG.length; i++) if (TRIG[i].toLowerCase() === s) return TRIG[i];
        return null;
      }
      if (typeof fsQiYun !== 'function') return { error: 'Hexagram tables not loaded.' };
      var num = null;
      if (input.hex_number != null && isFinite(parseInt(input.hex_number, 10))) {
        num = parseInt(input.hex_number, 10);
        if (num < 1 || num > 64) return { error: 'hex_number must be 1-64.' };
      } else {
        var U = normTrig(input.upper_trigram), L = normTrig(input.lower_trigram);
        if (!U || !L) return { error: 'Provide hex_number (1-64), or both upper_trigram and lower_trigram (Qian/Dui/Li/Zhen/Xun/Kan/Gen/Kun).' };
        for (var n = 1; n <= 64; n++) { var q = fsQiYun(n); if (q.upper === U && q.lower === L) { num = n; break; } }
        if (num == null) return { error: 'No hexagram has upper ' + U + ' over lower ' + L + '.' };
      }
      var qy = fsQiYun(num);
      var zs = (typeof fsIsZhengShen === 'function') ? fsIsZhengShen(qy.yun) : null;
      var ls = (typeof fsIsLingShen === 'function') ? fsIsLingShen(qy.yun) : null;
      var post2044 = (typeof FS_POST_2044 !== 'undefined') ? FS_POST_2044 : false;
      var centerDeg = null;
      if (typeof FS_SLOTS !== 'undefined' && FS_SLOTS && FS_SLOTS.length) {
        for (var s = 0; s < FS_SLOTS.length; s++) { if (FS_SLOTS[s].hexNum === num) { centerDeg = FS_SLOTS[s].centerDeg; break; } }
      }
      var families = [];
      if (typeof XKDG_TABLE !== 'undefined' && typeof JIAZI_FAMILY_DATA !== 'undefined') {
        for (var jz in XKDG_TABLE) {
          var r = XKDG_TABLE[jz];
          var via = (r.hex === num) ? 'primary' : (r.alt && r.alt.hex === num ? 'alt' : null);
          if (!via) continue;
          var fl = JIAZI_FAMILY_DATA[jz] || [];
          for (var k = 0; k < fl.length; k++) families.push({ family: fl[k].family, role: fl[k].role, ganzhi: jz, via: via });
        }
      }
      return {
        hexagram: num,
        upper_trigram: qy.upper,
        lower_trigram: qy.lower,
        qi: qy.qi,
        yun: qy.yun,
        period_basis: post2044 ? 'post-2044 (yun<=4 Zheng Shen, yun>=6 Ling Shen)' : 'pre-2044 (yun>=6 Zheng Shen, yun<=4 Ling Shen)',
        zheng_shen: zs,
        ling_shen: ls,
        luopan_center_deg: (centerDeg != null ? Math.round(centerDeg * 100) / 100 : null),
        families: families,
        note: families.length ? undefined : 'This hexagram\'s gan-zhi carry no family role in the table.'
      };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }

  // ── SOURCE ACCESS (list_source / read_source) ───────────────────────────────
  // Lets the assistant read the app's OWN code, fetched live from GitHub (branch
  // main) at call time, so its answers about how things work / current status track
  // the latest PUSHED file. On-demand only (no background watching). Root files only.
  var SRC_OWNER = 'edufengshui', SRC_REPO = 'eduXKDG', SRC_BRANCH = 'main';
  var SRC_MAX_CHARS = 80000;            // ~20K tokens cap per read
  var SRC_ALLOWED_EXT = /\.(js|html|css|webmanifest|json|md)$/i;
  function srcValidName(f) {
    f = String(f || '').trim();
    if (!f || f.indexOf('/') >= 0 || f.indexOf('\\') >= 0 || f.indexOf('..') >= 0) return null;
    if (!SRC_ALLOWED_EXT.test(f)) return null;
    if (!/^[A-Za-z0-9_.\-]+$/.test(f)) return null;
    return f;
  }
  // Static fallback list (used only if the GitHub contents API is unreachable).
  var SRC_FALLBACK = ['index.html', 'styles.css', 'sw.js', 'manifest.webmanifest',
    'app-bazi.js', 'app-fengshui.js', 'flying-stars.js', 'flying-stars-qimen.js',
    'qmdj-water-scanner.js', 'qimen-direction-analysis.js', 'qimen-div-finder.js',
    'travel-planner.js', 'ai-chat.js', 'floorplan-stars.js', 'solar-time.js'];
  function toolListSource() {
    var api = 'https://api.github.com/repos/' + SRC_OWNER + '/' + SRC_REPO + '/contents?ref=' + SRC_BRANCH + '&_=' + Date.now();
    return fetch(api, { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (arr) {
        if (!Array.isArray(arr)) throw new Error('unexpected response');
        var files = arr.filter(function (e) { return e && e.type === 'file' && SRC_ALLOWED_EXT.test(e.name); })
          .map(function (e) { return { file: e.name, bytes: e.size }; })
          .sort(function (a, b) { return a.file < b.file ? -1 : 1; });
        return { repo: SRC_OWNER + '/' + SRC_REPO + '@' + SRC_BRANCH, count: files.length, files: files,
          note: 'Live file list. Call read_source with a file name to read it (use the `search` arg for big files).' };
      })
      .catch(function (e) {
        return { repo: SRC_OWNER + '/' + SRC_REPO + '@' + SRC_BRANCH, files: SRC_FALLBACK.map(function (f) { return { file: f }; }),
          note: 'Live listing failed (' + ((e && e.message) || e) + '); showing the known file set. read_source still works for these names.' };
      });
  }
  function toolReadSource(input) {
    input = input || {};
    var f = srcValidName(input.file);
    if (!f) return Promise.resolve({ error: 'Invalid or disallowed file name. Use a root file name from list_source, e.g. "app-fengshui.js".' });
    var url = 'https://raw.githubusercontent.com/' + SRC_OWNER + '/' + SRC_REPO + '/' + SRC_BRANCH + '/' + f + '?_=' + Date.now();
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 404 ? ' (file not found on branch ' + SRC_BRANCH + ')' : '')); return r.text(); })
      .then(function (text) {
        var total = text.length;
        var search = (input.search != null) ? String(input.search) : '';
        if (search) {
          // Return focused regions around each match (case-insensitive), with context.
          var hay = text, low = hay.toLowerCase(), q = search.toLowerCase(), idx = 0, regions = [], MAXR = 6, CTX = 1400, used = 0;
          while (regions.length < MAXR) {
            var at = low.indexOf(q, idx); if (at < 0) break;
            var s = Math.max(0, at - CTX), e = Math.min(hay.length, at + q.length + CTX);
            var lineNo = hay.slice(0, at).split('\n').length;
            var snip = hay.slice(s, e);
            if (used + snip.length > SRC_MAX_CHARS) { snip = snip.slice(0, Math.max(0, SRC_MAX_CHARS - used)); }
            regions.push({ near_line: lineNo, snippet: (s > 0 ? '…' : '') + snip + (e < hay.length ? '…' : '') });
            used += snip.length; idx = at + q.length;
            if (used >= SRC_MAX_CHARS) break;
          }
          if (!regions.length) return { file: f, bytes: total, search: search, matches: 0, note: 'No occurrence of the search term in this file.' };
          return { file: f, bytes: total, search: search, matches: regions.length, regions: regions,
            note: 'Focused excerpts around the search term (live from ' + SRC_BRANCH + '). Ask to read more or another term if needed.' };
        }
        var truncated = total > SRC_MAX_CHARS;
        return { file: f, bytes: total, truncated: truncated,
          content: truncated ? text.slice(0, SRC_MAX_CHARS) : text,
          note: truncated ? ('File is large; showing the first ~' + SRC_MAX_CHARS + ' chars. Use the `search` arg to jump to a specific function/keyword instead.') : 'Full file, live from branch ' + SRC_BRANCH + '.' };
      })
      .catch(function (e) { return { error: 'Could not read ' + f + ': ' + ((e && e.message) || e) }; });
  }

  function toolDiagnoseMapsExport() {
    try {
      if (window.TravelPlanner && typeof window.TravelPlanner.diagnoseMapsExport === 'function')
        return window.TravelPlanner.diagnoseMapsExport();
      return { error: 'The travel planner is not available on this page.' };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }

  // ── UNSTATED ORIGIN → FRESH GPS (Edu, session 25) ──────────────────────────
  // "se non scrivo niente l'origine deve essere il GPS fresco". Until now a travel
  // tool called without origin coordinates fell back to the SAVED position, and if
  // there was none the planner used TP_DEFAULT.origin — Vienna's Stephansplatz
  // (48.2082/16.3738), i.e. a trip that never started where the user was.
  // Rather than editing the nine tools that each read window._lastGpsLat, the fix
  // takes the fresh fix HERE, before dispatch: freshGps() updates _lastGpsLat/_lastGpsLng
  // on success, so every tool below reads the fresh value through its existing code.
  // An explicit origin always wins, and a tool that already takes its own fix
  // (from_current_position) is left alone so the GPS is never asked twice.
  var GPS_ORIGIN_TOOLS = {
    plan_travel: 1, search_travel: 1, plan_lucky_day_trip: 1, plan_lucky_chain: 1,
    plan_lucky_multiday: 1, plan_mobile_tour: 1, plan_city_tour: 1, plan_lucky_events: 1,
    plan_arrive_by: 1
  };
  function ensureFreshOrigin(name, input) {
    try {
      if (!GPS_ORIGIN_TOOLS[name]) return Promise.resolve(null);
      var i = input || {};
      if (i.origin_lat != null && i.origin_lon != null) return Promise.resolve(null);  // explicit origin wins
      if (i.from_current_position) return Promise.resolve(null);                        // tool takes its own fix
      return freshGps(10000);   // never rejects: falls back to the saved fix, else null
    } catch (e) { return Promise.resolve(null); }
  }

  // Runs the panel's date scanner WITHOUT its modal dialogs. runScanner() was written for
  // someone standing in front of the panel: when a scan came back empty it fired an
  // alert(), which landed on top of the conversation while the assistant was answering
  // (Edu, session 25). The flag makes it silent; the outcome comes back on
  // window._scanEmpty / window._scanError so the caller can put it into words.
  function runScannerQuiet(arg) {
    try { window._scanSilent = true; } catch (e) {}
    try { return arg ? window.runScanner(arg) : window.runScanner(); }
    finally { try { window._scanSilent = false; } catch (e2) {} }
  }
  // What the panel is currently filtering on — the reason an assistant-launched scan
  // most often comes back empty.
  function activeChipNames() {
    try {
      var out = [];
      document.querySelectorAll('.filter-chip.active').forEach(function (c) {
        out.push((c.dataset && c.dataset.filter) || (c.textContent || '').trim());
      });
      return out.filter(Boolean);
    } catch (e) { return []; }
  }
  // Empty-scan report for a tool result, or null when the scan produced something.
  function emptyScanNote() {
    try {
      if (window._scanError) return { scan_failed: window._scanError };
      if (!window._scanEmpty) return null;
      var chips = activeChipNames();
      return {
        no_dates_found: true,
        active_filter_chips: chips.length ? chips : undefined,
        note: 'The date scan returned nothing' + (chips.length ? ' with the filter chips currently active in the panel (' + chips.join(', ') + ')' : ' for this range') +
              '. Tell the user plainly, and offer to widen the range or drop the chips. Do NOT invent dates.'
      };
    } catch (e) { return null; }
  }

  // ── LUCKY CALENDAR (.ics) ───────────────────────────────────────────────────
  // Edu, session 25: a calendar on the phone that flags the ABSOLUTE best hours over
  // three months, in three separate worlds, each event saying which world it belongs to.
  //
  // The three scales are NOT comparable and are never mixed (that was the old
  // combined_score mistake): water has real Tiers 1-4, the person's XKDG scan has its own
  // score, the direction scan has another. So the maximum is computed SEPARATELY inside
  // each world, over the whole period, and only the hours that reach their own maximum
  // become events. That is "solo il massimo assoluto", not "the best of each month".
  //
  // Every time is converted from TRUE SOLAR to CIVIL through the same _solarToEpoch used
  // by the aquarium scheduler — a calendar entry at the wrong clock time is worse than no
  // calendar at all. The alarm fires the evening before at 21:00 civil.
  var _ICS_BRANCHES = ['\u5b50','\u4e11','\u5bc5','\u536f','\u8fb0','\u5df3','\u5348','\u672a','\u7533','\u9149','\u620c','\u4ea5'];
  // Night hours, excluded by default (Edu, session 25: "chi si alza alle 2 di notte per
  // fare un'attivazione?"). 23:00-05:00 solar = Zi 子 (23-01), Chou 丑 (01-03), Yin 寅
  // (03-05). include_night:true keeps them. Every event title carries the pinyin name of
  // the hour so it is unambiguous (Chou, not just 丑).
  var _ICS_NIGHT = { '\u5b50': 1, '\u4e11': 1, '\u5bc5': 1 };
  var _ICS_DIR_PAL = { N: 1, NE: 8, E: 3, SE: 4, S: 9, SW: 2, W: 7, NW: 6 };
  // Session 26 \u2014 the XKDG relation class of a scan row, read from blueLabels.
  // These are the six natural steps of the score (the relationFloor ladder in
  // calcHourScore). null = the hour carries NO XKDG relation at all: it only scores
  // through season, Nayin and personal stars, and Edu keeps those out of the calendar.
  // Order matters: "Two-Family Bond" also contains the word Family.
  // Door label with its Chinese character, same wording as DOOR_TAG_LABELS in
  // qmdj-water-scanner.js. Kept as a lookup so a missing code degrades to the name.
  var _ICS_DOOR = { Kai: 'Open \u958b', Xiu: 'Rest \u4f11', Sheng: 'Birth \u751f', JingS: 'View \u666f',
                    Du: 'Delusion \u675c', Shang: 'Injury \u50b7', Si: 'Death \u6b7b', JingF: 'Shocking \u9a5a' };
  function _icsDoorLabel(cell) {
    if (!cell) return '';
    return _ICS_DOOR[cell.doorCode] || cell.doorName || cell.doorCode || '';
  }

  function _icsXkdgClass(labels) {
    var L = (labels || []).join(' | ');
    if (!L) return null;
    if (/Two-Family Bond/.test(L)) return 'Two-Family Bond';
    if (/Family/.test(L)) return 'Blood Link';
    if (/Pure Qi/.test(L)) return 'Pure Qi';
    if (/Pure Adding|Pure Hetu/.test(L)) return 'Pure Adding';
    if (/Adding|Hetu|Inverse Hex/.test(L)) return 'Adding';
    return 'XKDG';   // a relation we do not recognise is still a relation: keep it
  }
  var _ICS_PIN = { '\u5b50':'Zi', '\u4e11':'Chou', '\u5bc5':'Yin', '\u536f':'Mao', '\u8fb0':'Chen',
                   '\u5df3':'Si', '\u5348':'Wu', '\u672a':'Wei', '\u7533':'Shen', '\u9149':'You',
                   '\u620c':'Xu', '\u4ea5':'Hai' };
  function _icsHourLabel(branch) { return branch + (_ICS_PIN[branch] ? (' ' + _ICS_PIN[branch]) : ''); }

  // Which purposes an hour serves, by scanning every purpose once over the whole period and
  // indexing by date+palace+branch. The direction/water events then look themselves up here
  // instead of re-scanning. Same source of truth as find_purpose_activation: an hour serves
  // a purpose when scanTravelPurpose for that purpose returns it. Built lazily, cached.
  function _icsPurposeIndex(start, days) {
    var idx = {};
    try {
      var KEYS = ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'];
      KEYS.forEach(function (pk) {
        var rows = (window.QMDJWaterScanner && window.QMDJWaterScanner.scanTravelPurpose)
          ? (window.QMDJWaterScanner.scanTravelPurpose('', start, days, pk) || []) : [];
        rows.forEach(function (r) {
          if (!r.date || r.palace == null || (r.score || 0) <= 0) return;   // only hours that actually serve it
          var k = r.date + '|' + r.palace;
          (idx[k] = idx[k] || []).push(pk);
        });
      });
    } catch (e) {}
    return idx;
  }
  function _icsPurposeLabel(k) {
    return ({ health: '\uD83C\uDFE5 Health', career: '\uD83D\uDCBC Career', wealth: '\uD83D\uDCB0 Wealth',
      relationship: '\u2764\uFE0F Relationship', journey: '\u2708\uFE0F Journey', speak: '\uD83C\uDFA4 Speak',
      legal: '\u2696\uFE0F Legal' })[k] || k;
  }

  function _icsEsc(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function _icsUtc(ms) {
    var d = new Date(ms), p = function (n) { return String(n).length < 2 ? '0' + n : String(n); };
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' +
           p(d.getUTCHours()) + p(d.getUTCMinutes()) + '00Z';
  }
  // RFC 5545 wants lines under 75 octets, continued with a leading space.
  function _icsFold(line) {
    if (line.length <= 73) return line;
    var out = line.slice(0, 73), rest = line.slice(73);
    while (rest.length) { out += '\r\n ' + rest.slice(0, 72); rest = rest.slice(72); }
    return out;
  }
  function _icsPrevEvening(iso, utc) {
    try {
      var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 1);
      var prev = d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) +
                 '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
      return _civilToEpoch(prev, 21 * 60, utc);
    } catch (e) { return NaN; }
  }

  async function toolExportLuckyCalendar(input) {
    input = input || {};
    var days = parseInt(input.days, 10) || 90;
    var start = input.start_date || todayIso();
    var lon = 12.49, utc = 1;
    try { var lEl = document.getElementById('longitude'); if (lEl && isFinite(parseFloat(lEl.value))) lon = parseFloat(lEl.value); } catch (e) {}
    try { var uEl = document.getElementById('utc-offset'); if (uEl && isFinite(parseFloat(uEl.value))) utc = parseFloat(uEl.value); } catch (e) {}

    var events = [], report = {}, nightSkipped = 0;
    var keepNight = !!input.include_night;
    var dupSkipped = 0;
    var purposeIdx = _icsPurposeIndex(start, days);   // date|palace -> [purposes served]

    // manualAction = the user has to be there at that hour (walk a direction, sit for an
    // XKDG hour). Water does NOT: it is programmed on the Shelly plug, so a 2am aquarium
    // switch-on is fine and night is NOT excluded for it (Edu, session 25). Night is
    // dropped only for manual-action sectors.
    // Session 26 \u2014 duplicate guard. The scanners walk their day loop with a fixed
    // 86400000 ms step from local midnight, so on the autumn DST day (25 Oct 2026 in
    // Europe, a 25-hour day) the SAME date comes out twice and every row of that day is
    // emitted twice. Rather than let it reach the calendar, drop the repeat here.
    var _pushSeen = {};
    function push(kind, iso, branch, label, detail, evLon, evUtc, manualAction) {
      if (manualAction && !keepNight && _ICS_NIGHT[branch]) { nightSkipped++; return; }
      var _k = kind + '|' + iso + '|' + branch + '|' + label;
      if (_pushSeen[_k]) { dupSkipped++; return; }
      _pushSeen[_k] = 1;
      var sm = _BRANCH_SOLAR_MIN[branch];
      if (sm == null) return;
      var on = _solarToEpoch(iso, sm, evLon, evUtc);
      if (!isFinite(on)) return;
      events.push({ kind: kind, date: iso, branch: branch, title: label, detail: detail,
                    start: on, end: on + 120 * 60000, utc: evUtc });
    }

    // (1) WATER — both aquariums, from the saved house profiles. Only the highest tier
    //     that actually occurs in the period, across both houses.
    try {
      var waterRows = [];
      ['vienna', 'tuoro'].forEach(function (hn) {
        try {
          var rh = _resolveShellyHouse(hn); if (!rh) return;
          // Session 28 (Edu): this line used to call window.XKDGHouse.activate(), a function
          // that does not exist on XKDGHouse - so it silently did nothing on every export.
          // It is NOT replaced by a real house switch: a person loaded by hand always wins,
          // and an export must never move the app's persons under the user. The water tiers
          // therefore follow whoever is loaded, and the report says so plainly below.
          var setup = toolGetHouseSetup({ house_name: rh.name });
          if (!setup || setup.error) return;
          var floor = (setup.floors || []).filter(function (f) { return f.active; })[0] || (setup.floors || [])[0];
          if (!floor) return;
          var aq = (floor.aquariums || [])[0];
          if (!aq || !aq.direction || aq.water_star == null) return;
          var sc = toolFindWaterActivationFull({
            direction: aq.direction, star_type: 'water', star_num: aq.water_star,
            facing_deg: floor.facing, period: floor.period,
            start_date: start, days: days, full: true
          });
          ((sc && sc.results) || []).forEach(function (r) {
            if (!r.date || !r.branch || !r.tier) return;
            waterRows.push({ r: r, house: rh.name, dir: aq.direction,
                             lon: (rh.cfg && rh.cfg.lon != null) ? rh.cfg.lon : lon,
                             utc: (rh.cfg && rh.cfg.utc != null) ? rh.cfg.utc : utc });
          });
        } catch (eH) {}
      });
      if (waterRows.length) {
        var maxTier = Math.max.apply(null, waterRows.map(function (x) { return x.r.tier; }));
        waterRows.filter(function (x) { return x.r.tier === maxTier; }).forEach(function (x) {
          var pal = _ICS_DIR_PAL[x.dir];
          var ps = (pal != null && purposeIdx[x.r.date + '|' + pal]) || [];
          var pTxt = ps.length ? (' \u00b7 for ' + ps.map(_icsPurposeLabel).join(', ')) : '';
          push('water', x.r.date, x.r.branch,
               '\uD83D\uDCA7 Aquarium ' + x.dir + ' \u00b7 ' + _icsHourLabel(x.r.branch) + ' \u00b7 Tier ' + x.r.tier +
               ' \u00b7 ' + (x.house ? (x.house.charAt(0).toUpperCase() + x.house.slice(1)) : ''),
               'Aquarium sector ' + x.dir + ' \u2014 ' + x.house + ' \u00b7 hour ' + _icsHourLabel(x.r.branch) + (x.r.hour ? (' (' + x.r.hour + ')') : '') + pTxt + '. ' + (x.r.why || ''), x.lon, x.utc, false);
        });
        report.water = { rows_scanned: waterRows.length, max_tier: maxTier,
                         events: waterRows.filter(function (x) { return x.r.tier === maxTier; }).length,
                         persons_used: _digestPersonNames().label,
                         note: 'The water TIERS are the connection to the loaded person(s), listed in persons_used. '
                           + 'The export never switches person: a manual load always wins. With nobody loaded only '
                           + 'tier 1 (Qimen alone) can appear - say so if persons_used is null.' };
      } else { report.water = { rows_scanned: 0, note: 'no aquarium hour passed the QMDJ veto in the period' }; }
    } catch (eW) { report.water = { error: String((eW && eW.message) || eW) }; }

    // (2) XKDG tied to the person — the top score reached in the period.
    try {
      var gd = toolFindGoodDates({ days: days, start_date: start });
      var rowsX = (gd && gd.results) || [];
      // The scanner writes its rows to window._lastScanResults (same source toolFindGoodDates
      // and the aquarium scanner read). An earlier draft read window._scanResults here — a
      // different, internal variable that is never exposed — so this sector always came back
      // empty even with a person loaded and no filters. toolFindGoodDates ran just above, so
      // the rows are fresh.
      var raw = (window._lastScanResults || []).filter(function (r) { return r.isoDate && r.hourIndex != null; });
      if (raw.length) {
        // Session 26 \u2014 Edu, measured on 180 real days: the old rule kept ONLY the single
        // highest score, and the maximum occurs exactly once in six months, so this sector
        // produced one event per export. The score is a fine-grained integer (38 distinct
        // values from -2 to 43), not a tier ladder, so "the maximum" is not a useful cut.
        // New rule: every hour scoring at least xkdg_min_score AND carrying a real XKDG
        // relation. Hours with no relation are dropped even when they score high: they ride
        // on season/Nayin/personal stars alone. Night hours are dropped by push() already.
        var minX = parseInt(input.xkdg_min_score, 10);
        if (!isFinite(minX)) minX = 15;
        var maxX = Math.max.apply(null, raw.map(function (r) { return r.score || 0; }));
        var byClass = {}, keptX = 0, noRelation = 0, belowMin = 0;
        raw.forEach(function (r) {
          var sc = r.score || 0;
          if (sc < minX) { belowMin++; return; }
          var cls = _icsXkdgClass(r.blueLabels);
          if (!cls) { noRelation++; return; }
          keptX++; byClass[cls] = (byClass[cls] || 0) + 1;
          var hr = _icsHourLabel(_ICS_BRANCHES[r.hourIndex]);
          push('xkdg', r.isoDate, _ICS_BRANCHES[r.hourIndex],
               '\u2B21 XKDG \u00b7 ' + hr + ' \u00b7 ' + cls + ' \u00b7 ' + sc,
               'Strong personal date \u2014 nothing to activate, no direction to face: use the hour for whatever '
             + 'action you choose. XKDG hour connected to your pillars at hour ' + hr + ' \u2014 ' + cls + ' \u00b7 score ' + sc +
               (r.nayinLabel ? (' \u00b7 Nayin ' + r.nayinLabel) : '') +
               ((r.blueLabels && r.blueLabels.length) ? (' \u00b7 ' + r.blueLabels.join(' + ')) : ''), lon, utc, true);
        });
        report.xkdg = { rows_scanned: raw.length, min_score: minX, max_score: maxX, events: keptX,
                        by_class: byClass, dropped_below_min: belowMin, dropped_no_relation: noRelation,
                        note: 'Kept every hour scoring ' + minX + ' or more that carries a real XKDG relation. '
                          + 'Hours with no relation were dropped even when they scored high. Night hours are '
                          + 'excluded unless include_night was set. Say the threshold when reporting, and say '
                          + 'that it can be moved with xkdg_min_score.' };
      } else { report.xkdg = { rows_scanned: 0, note: 'the date scanner returned nothing \u2014 check the filter chips' }; }
    } catch (eX) { report.xkdg = { error: String((eX && eX.message) || eX) }; }

    // (3) DIRECTIONS — every direction, the top score reached in the period.
    try {
      var dr = (window.QMDJWaterScanner && window.QMDJWaterScanner.scanTravelPurpose)
        ? (window.QMDJWaterScanner.scanTravelPurpose('', start, days, null) || []) : [];
      if (dr.length) {
        // Session 26 \u2014 Edu, measured on 180 real days: 5051 rows but only TEN distinct
        // scores (0, 0.5, 1, 1.5, 2, 3, 10, 10.5, 11, 12) with nothing at all between 3 and
        // 10. That gap is the method's own cut: at 10 and above sit the strong Dun escapes
        // and the \u4e19/\u620a pairings, below it only Pretenses and empty palaces. The old rule kept
        // just the maximum (10 hours in six months). Doors need no filtering here: the
        // scanner already applies the canonical directionGate(travel:true) upstream, so
        // Death/Delusion/Shocking never appear and an Injury \u50b7 that survives is one
        // redeemed by San Qi \u2014 Edu keeps those (they only occur above 10).
        var minD = parseFloat(input.direction_min_score);
        if (!isFinite(minD)) minD = 10;
        var maxD = Math.max.apply(null, dr.map(function (r) { return r.score || 0; }));
        var keptD = 0, byDir = {}, byDoor = {};
        dr.forEach(function (r) {
          var sc = r.score || 0;
          if (sc < minD) return;
          var br = _branchOfHan(r.hourHan); if (!br) return;
          var door = _icsDoorLabel(r.cell);
          var forms = (r.hits || []).map(function (h) { return h.label; });
          var ps = (r.palace != null && purposeIdx[r.date + '|' + r.palace]) || [];
          var pTxt = ps.length ? (' \u00b7 for ' + ps.map(_icsPurposeLabel).join(', ')) : '';
          keptD++; byDir[r.dir] = (byDir[r.dir] || 0) + 1;
          if (door) byDoor[door] = (byDoor[door] || 0) + 1;
          push('direction', r.date, br,
               '\uD83E\uDDED Direction ' + r.dir + ' \u00b7 ' + _icsHourLabel(br) +
               (door ? (' \u00b7 ' + door) : '') + (forms.length ? (' \u00b7 ' + forms[0]) : '') + ' \u00b7 ' + sc,
               'Walk or travel towards ' + r.dir + ' at hour ' + _icsHourLabel(br) + ' (' + (r.hourTime || '') + ')' +
               (door ? (' \u2014 door ' + door) : '') + ' \u00b7 score ' + sc + pTxt +
               (forms.length ? (' \u00b7 ' + forms.join(', ')) : ''), lon, utc, true);
        });
        report.directions = { rows_scanned: dr.length, min_score: minD, max_score: maxD, events: keptD,
                              by_direction: byDir, by_door: byDoor,
                              note: 'Kept every hour scoring ' + minD + ' or more. The direction score has only ten '
                                + 'values with a gap between 3 and 10, so 10 is the method\u2019s own threshold; it can be '
                                + 'moved with direction_min_score. Night hours (Zi/Chou/Yin) are excluded unless '
                                + 'include_night was set.' };
      } else { report.directions = { rows_scanned: 0 }; }
    } catch (eD) { report.directions = { error: String((eD && eD.message) || eD) }; }

    // (4) AQUARIUM PLAN ENDING — one reminder per aquarium, warning TWO DAYS BEFORE the
    //     deposited plan runs out, so the same .ics the user already imports also carries
    //     the "regenerate the plan" note (Edu, session 29). Read from the Worker's real
    //     stored plan (?get_plan), not a fresh computation.
    try {
      var _cfg = (typeof _shellyCfg === 'function') ? _shellyCfg() : null;
      if (_cfg && _cfg.url && _cfg.token) {
        var _devs = [{ id: 'tuoro', name: 'Tuoro', utc: 1 }, { id: 'vienna', name: 'Vienna', utc: 1 }];
        report.plan_ending = {};
        for (var _di = 0; _di < _devs.length; _di++) {
          var _dv = _devs[_di];
          try {
            var _r = await fetch(_cfg.url + '?get_plan&device=' + _dv.id + '&token=' + encodeURIComponent(_cfg.token));
            var _j = _r.ok ? await _r.json() : null;
            var _days = (_j && _j.plan && Array.isArray(_j.plan.days)) ? _j.plan.days : [];
            var _endTs = 0;
            _days.forEach(function (d) { if (d && isFinite(d.offTs) && d.offTs > _endTs) _endTs = d.offTs; });
            if (!_endTs) { report.plan_ending[_dv.id] = 'no plan'; continue; }
            var _off = new Date(_endTs + _dv.utc * 3600000);       // civil datetime of the last OFF
            var _y = _off.getUTCFullYear(), _m = _off.getUTCMonth(), _d = _off.getUTCDate();
            var _endIso = _y + '-' + String(_m + 1).padStart(2, '0') + '-' + String(_d).padStart(2, '0');
            var _evStart = Date.UTC(_y, _m, _d, 20, 0) - _dv.utc * 3600000;   // 20:00 last day, civil
            var _alarm   = Date.UTC(_y, _m, _d - 2, 9, 0) - _dv.utc * 3600000; // 09:00, two days before
            events.push({
              kind: 'planend', date: _endIso, branch: '',
              title: '\uD83D\uDC1F Acquario ' + _dv.name + ' \u2014 la programmazione finisce (rigenera)',
              detail: 'Il piano di accensione dell\u2019acquario ' + _dv.name + ' termina il ' + _endIso + '. Rigeneralo per i giorni successivi.',
              start: _evStart, end: _evStart + 15 * 60000, utc: _dv.utc,
              alarmTs: _alarm, alarmText: 'Fra 2 giorni finisce la programmazione dell\u2019acquario ' + _dv.name + ' \u2014 rigenera il piano'
            });
            report.plan_ending[_dv.id] = { ends: _endIso, reminder: 'two days before' };
          } catch (ePlan) { report.plan_ending[_dv.id] = 'error'; }
        }
      }
    } catch (ePE) { /* plan-ending reminder is best-effort; never blocks the calendar */ }

    if (!events.length) {
      return { error: 'Nothing reached the maximum in any of the three sectors over ' + days + ' days.' +
        (nightSkipped ? (' ' + nightSkipped + ' night hour(s) (23:00-05:00) were excluded \u2014 ask with include_night to keep them.') : ''),
        duplicates_dropped: dupSkipped || undefined,
        night_hours_excluded: nightSkipped || undefined, report: report };
    }
    events.sort(function (a, b) { return a.start - b.start; });

    var now = _icsUtc(Date.now());
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//XKDG//Lucky Calendar//EN',
             'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:XKDG \u2014 Lucky hours'];
    events.forEach(function (e, i) {
      var uid = 'xkdg-' + e.kind + '-' + e.date + '-' + i + '@fsadvisor.org';
      L.push('BEGIN:VEVENT');
      L.push('UID:' + uid);
      L.push('DTSTAMP:' + now);
      L.push('DTSTART:' + _icsUtc(e.start));
      L.push('DTEND:' + _icsUtc(e.end));
      L.push(_icsFold('SUMMARY:' + _icsEsc(e.title)));
      L.push(_icsFold('DESCRIPTION:' + _icsEsc(e.detail)));
      var al = isFinite(e.alarmTs) ? e.alarmTs : _icsPrevEvening(e.date, e.utc);
      if (isFinite(al)) {
        L.push('BEGIN:VALARM');
        L.push('ACTION:DISPLAY');
        L.push(_icsFold('DESCRIPTION:' + _icsEsc(e.alarmText || ('Tomorrow: ' + e.title))));
        L.push('TRIGGER;VALUE=DATE-TIME:' + _icsUtc(al));
        L.push('END:VALARM');
      }
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    var ics = L.join('\r\n') + '\r\n';

    var fname = 'xkdg-lucky-' + start + '.ics';
    var downloaded = false;
    try {
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 4000);
      downloaded = true;
    } catch (eDl) {}

    return {
      ok: true, file: fname, downloaded: downloaded, days: days, from: start,
      events: events.length, by_sector: report, night_hours_excluded: nightSkipped || undefined,
      first_events: events.slice(0, 8).map(function (e) {
        return { when: new Date(e.start).toString().slice(0, 24), what: e.title };
      }),
      instructions: 'The .ics file has been downloaded. Tell the user to open it and let the phone add it to Google Calendar; ' +
        'every event carries the sector AND the hour (branch + pinyin, e.g. "Chou") in its title, and an alarm the evening before ' +
        'at 21:00. Night hours 23:00-05:00 (Zi/Chou/Yin) are EXCLUDED by default; night_hours_excluded says how many were dropped \u2014 ' +
        'mention it, and if the user wants them, call again with include_night:true. Report by_sector: it says how many rows were ' +
        'scanned and what the maximum reached was in EACH world separately \u2014 the three scales are not comparable and are never ' +
        'summed. If a sector produced no event, say which and why.'
    };
  }

  function execTool(name, input) {
    try {
      if (name === 'find_good_dates') return toolFindGoodDates(input || {});
      if (name === 'export_lucky_calendar') return toolExportLuckyCalendar(input || {});
      if (name === 'explain_purpose') return toolExplainPurpose(input || {});
      if (name === 'open_scan_result') return toolOpenScanResult(input || {});
      if (name === 'show_verify_button') return toolShowVerifyButton(input || {});
      if (name === 'find_bed_dates') return toolFindBedDates(input || {});
      if (name === 'find_desk_dates') return toolFindDeskDates(input || {});
      if (name === 'plan_travel') return toolPlanTravel(input || {});
      if (name === 'search_travel') return toolSearchTravel(input || {});
      if (name === 'plan_lucky_day_trip') return toolPlanLuckyDayTrip(input || {});
      if (name === 'plan_lucky_chain') return toolPlanLuckyChain(input || {});
      if (name === 'plan_lucky_multiday') return toolPlanLuckyMultiDay(input || {});
      if (name === 'plan_mobile_tour') return toolPlanMobileTour(input || {});
      if (name === 'plan_city_tour') return toolPlanCityTour(input || {});
      if (name === 'plan_lucky_events') return toolPlanLuckyEvents(input || {});
      if (name === 'plan_arrive_by') return toolPlanArriveBy(input || {});
      if (name === 'open_travel_planner') return toolOpenTravelPlanner(input || {});
      if (name === 'open_itinerary_in_maps') return toolOpenItineraryInMaps();
      if (name === 'start_compass') return toolStartCompass(input || {});
      if (name === 'control_compass') return toolControlCompass(input || {});
      if (name === 'open_qimen_for_flying_stars') return toolOpenQimenFS(input || {});
      if (name === 'load_tools') {
        var _a = (input && input.area) || '';
        if (!TOOL_AREAS[_a]) return { ok: false, error: 'Unknown area: ' + _a };
        if (_extraAreas.indexOf(_a) < 0) _extraAreas.push(_a);
        return { ok: true, area: _a, loaded: TOOL_AREAS[_a].length,
                 note: 'Tools for "' + _a + '" are now available. Continue and use them to answer.' };
      }
      if (name === 'get_app_state') return toolGetAppState();
      if (name === 'get_trip_itinerary') return toolGetTripItinerary();
      if (name === 'analyze_direction') return toolAnalyzeDirection(input || {});
      if (name === 'find_divination_chart') return toolFindDivinationChart(input || {});
      if (name === 'find_water_dates') return toolFindWaterDates(input || {});
      if (name === 'find_water_activation') return toolFindWaterActivation(input || {});
      if (name === 'find_water_activation_full') return toolFindWaterActivationFull(input || {});
      if (name === 'find_purpose_activation') return toolFindPurposeActivation(input || {});
      if (name === 'find_purpose_direction') return toolFindPurposeDirection(input || {});
      if (name === 'open_section') return toolOpenSection(input || {});
      if (name === 'recall_flying_stars') return toolRecallFlyingStars();
      if (name === 'open_direction_calculator') return toolOpenDirectionCalc();
      if (name === 'scan_flights') return toolScanFlights(input || {});
      if (name === 'open_chart_finder') return toolOpenChartFinder();
      if (name === 'list_houses') return toolListHouses();
      if (name === 'get_house_setup') return toolGetHouseSetup(input || {});
      if (name === 'set_active_house') return toolSetActiveHouse(input || {});
      if (name === 'load_house') return toolLoadHouse(input || {});
      if (name === 'load_placement') return toolLoadPlacement(input || {});
      if (name === 'find_water_hours') return toolFindWaterHours(input || {});
      if (name === 'find_qimen_hours_for_star') return toolFindQimenHoursForStar(input || {});
      if (name === 'find_lodging') return toolFindLodging(input || {});
      if (name === 'find_lucky_charge_day') return toolFindLuckyChargeDay(input || {});
      if (name === 'configure_shelly') return toolConfigureShelly(input || {});
      if (name === 'program_aquarium_light') return toolProgramAquariumLight(input || {});
      if (name === 'aquarium_light') return toolAquariumLight(input || {});
      if (name === 'plan_directional_detour') return toolPlanDirectionalDetour(input || {});
      if (name === 'aquarium_plan') return toolAquariumPlan(input || {});
      if (name === 'refresh_alexa_digest') return toolRefreshAlexaDigest(input || {});
      if (name === 'get_hexagram_info') return toolHexagramInfo(input || {});
      if (name === 'find_water_star_charts') return toolFindWaterStarCharts(input || {});
      if (name === 'seed_manual_chart') return toolSeedManualChart(input || {});
      if (name === 'list_source') return toolListSource();
      if (name === 'read_source') return toolReadSource(input || {});
      if (name === 'diagnose_maps_export') return toolDiagnoseMapsExport();
      return { error: 'Unknown tool: ' + name };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }

  function todayIso() {
    var t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }

  // ── MACROS — short triggers the user types that expand into a full instruction ──
  var _macroChipRefresh = null;   // set by buildPanel; lets the manager refresh the chip row
  function loadMacros() {
    var arr = null;
    try { var a = JSON.parse(localStorage.getItem('xkdg_ai_macros') || 'null'); if (Array.isArray(a)) arr = a; } catch (e) {}
    if (!arr) {
      arr = [{
        trigger: 'aq',
        label: 'Aquarium — both houses, tomorrow',
        text: 'For TOMORROW\u2019s date, find the best hours to activate the aquarium in EVERY saved house of the active person. ' +
              'For each house use ITS saved water position (direction) and its water star (facing), on ITS flying chart. ' +
              'Proceed one house at a time: make the house active (set_active_house), read its setup, run find_water_activation_full for that house, ' +
              'and give me ONE best hour FOR EACH house (a separate result for each), with the date and the reason. At the end, restore the house that was active at the start.'
      }];
    }
    // Seed / refresh the built-in macros (aquarium "aq" + Vienna<->Tuoro travel tests VT / TV
    // + GPS-origin variants GT / GV: same destinations, but departing from the CURRENT position).
    // Bumping the version below re-seeds them in English, replacing any older copies (now v6).
    try {
      if (localStorage.getItem('xkdg_ai_macros_vt_tv') !== '10') {
        var seed = [
          {
            trigger: 'aq',
            label: 'Aquarium — both houses, tomorrow',
            text: 'For TOMORROW\u2019s date, find the best hours to activate the aquarium in EVERY saved house of the active person. ' +
                  'For each house use ITS saved water position (direction) and its water star (facing), on ITS flying chart. ' +
                  'Proceed one house at a time: make the house active (set_active_house), read its setup, run find_water_activation_full for that house, ' +
                  'and give me ONE best hour FOR EACH house (a separate result for each), with the date and the reason. At the end, restore the house that was active at the start.'
          },
          {
            trigger: 'luce', icon: '\uD83D\uDCA1',
            label: 'Program aquarium light \u2014 7 days (both houses)',
            text: 'Program the aquarium light for the NEXT 7 DAYS for BOTH houses (Tuoro and Vienna), WITH my confirmation, in TWO phases. ' +
                  'PHASE 1 \u2014 PREVIEW, deposit NOTHING: for Tuoro first, then Vienna, call program_aquarium_light with commit:false. ' +
                  'For each house present the days it will ACTIVATE: date, the double-hour with its clock window (on_local \u2192 off_local) and tier. ' +
                  'Mark any day that stays_on_until_date \u2014 say the light does NOT switch off at 23:00 and until when. Mark any day with fallback_from \u2014 say the best hour was too late to be useful. Say which days stay dark and why. ' +
                  'Do NOT ask me to approve individual dates: the rules decide every day, there is nothing to confirm day by day. Night ON times (the Zi hour) are NORMAL \u2014 do NOT flag them. ' +
                  'Then ask for my final go-ahead with buttons:  [[BTN]] Procedi=procedi | Annulla=annulla . Do NOT deposit anything yet. ' +
                  'PHASE 2 \u2014 only AFTER I say OK: call program_aquarium_light again for each house with commit:true. Then tell me exactly what was deposited for each house.'
          },
          {
            trigger: 'qui', icon: '\uD83D\uDCCD',
            label: 'Start from here (GPS)',
            text: 'Plan a LUCKY TRIP starting FROM MY CURRENT GPS POSITION, right now. Use from_current_position:true so the app takes a FRESH GPS fix as the origin \u2014 do NOT pass origin coordinates and do NOT invent a city or a "centre"/proxy. Depart NOW. Present the proposals; when I pick one, open it in Google Maps with navigate=true so I can follow it from the car (a real GPS origin is what lets the car recognise the route). If the GPS fix fails (gps_fresh:false), tell me and fall back to my saved position \u2014 never a made-up point.'
          },
          {
            trigger: 'VT', icon: '🚗', askDepart: true,
            label: 'Vienna → Tuoro (travel-planner test)',
            text: 'Car trip from Vienna (Austria) to Tuoro sul Trasimeno (Italy). ' +
                  'Use these EXACT coordinates and names: ' +
                  'origin_name "Vienna", origin_lat 48.2082, origin_lon 16.3738; ' +
                  'dest_name "Tuoro sul Trasimeno", dest_lat 43.2074, dest_lon 12.0772.'
          },
          {
            trigger: 'TV', icon: '🚗', askDepart: true,
            label: 'Tuoro → Vienna (travel-planner test)',
            text: 'Car trip from Tuoro sul Trasimeno (Italy) to Vienna (Austria). ' +
                  'Use these EXACT coordinates and names: ' +
                  'origin_name "Tuoro sul Trasimeno", origin_lat 43.2074, origin_lon 12.0772; ' +
                  'dest_name "Vienna", dest_lat 48.2082, dest_lon 16.3738.'
          },
          {
            trigger: 'GT', icon: '🛰', askDepart: true,
            label: 'My position → Tuoro (GPS origin)',
            text: 'Car trip from MY CURRENT POSITION to Tuoro sul Trasimeno (Italy). ' +
                  'In plan_travel set from_current_position: true (acquire a FRESH GPS fix as the origin; do NOT use a saved or generic origin). ' +
                  'Destination EXACT: dest_name "Tuoro sul Trasimeno", dest_lat 43.2074, dest_lon 12.0772.'
          },
          {
            trigger: 'GV', icon: '🛰', askDepart: true,
            label: 'My position → Vienna (GPS origin)',
            text: 'Car trip from MY CURRENT POSITION to Vienna (Austria). ' +
                  'In plan_travel set from_current_position: true (acquire a FRESH GPS fix as the origin; do NOT use a saved or generic origin). ' +
                  'Destination EXACT: dest_name "Vienna", dest_lat 48.2082, dest_lon 16.3738.'
          }
        ];
        // Replace any earlier aq/VT/TV/GT/GV, then append the current English definitions.
        arr = arr.filter(function (x) { var t = (x.trigger || '').toLowerCase(); return t !== 'vt' && t !== 'tv' && t !== 'aq' && t !== 'gt' && t !== 'gv' && t !== 'luce' && t !== 'qui'; });
        seed.forEach(function (m) { arr.push(m); });
        localStorage.setItem('xkdg_ai_macros_vt_tv', '10');
      }
    } catch (e) {}
    try { localStorage.setItem('xkdg_ai_macros', JSON.stringify(arr)); } catch (e) {}
    return arr;
  }
  function saveMacros(arr) { try { localStorage.setItem('xkdg_ai_macros', JSON.stringify(arr)); } catch (e) {} }

  // Small prompt asked before a travel macro runs: when do you want to depart?
  // Calls cb(clause, humanLabel) — clause is appended to the macro instruction.
  function _askDepart(cb) {
    function E(tag, css, html) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }
    var old = document.getElementById('xkdg-depart-ov'); if (old && old.parentNode) old.parentNode.removeChild(old);
    var ov = E('div', 'position:fixed;inset:0;z-index:100003;background:rgba(20,8,30,.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;');
    ov.id = 'xkdg-depart-ov';
    var today = new Date().toISOString().slice(0, 10);
    var inputCss = 'width:100%;padding:8px;border:1px solid #c9b6d6;border-radius:6px;margin-bottom:12px;box-sizing:border-box;font-size:13px;';
    var labCss = 'font-size:12px;color:#555;display:block;margin-bottom:3px;';
    var hourOpts = '<option value="">Auto (find best hours)</option>';
    for (var _h = 0; _h < 24; _h++) { var _hh = (_h < 10 ? '0' + _h : '' + _h) + ':00'; hourOpts += '<option value="' + _hh + '">' + _hh + '</option>'; }
    var card = E('div', 'background:#fff;border-radius:12px;max-width:340px;width:100%;padding:16px;box-shadow:0 12px 44px rgba(0,0,0,.32);');
    card.innerHTML =
        '<div style="font-weight:700;color:#6a1b9a;font-size:15px;margin-bottom:12px;">\ud83d\ude97 How do you want to plan the trip?</div>'
      + '<div style="display:flex;gap:6px;margin-bottom:12px;">'
      +   '<button id="xkdg-mode-single">Single day</button>'
      +   '<button id="xkdg-mode-search">Find best day</button>'
      + '</div>'
      + '<label style="' + labCss + '" id="xkdg-date-lab">Date</label>'
      + '<input type="date" id="xkdg-depart-date" value="' + today + '" style="' + inputCss + '">'
      + '<div id="xkdg-grp-single">'
      +   '<label style="' + labCss + '">Departure time</label>'
      +   '<select id="xkdg-single-hour" style="' + inputCss + '">' + hourOpts + '</select>'
      +   '<label style="' + labCss + '">How many itineraries to show</label>'
      +   '<input type="number" id="xkdg-single-topk" value="5" min="1" max="10" style="' + inputCss + '">'
      +   '<label style="font-size:12px;color:#555;display:flex;align-items:center;gap:7px;margin-bottom:4px;cursor:pointer;"><input type="checkbox" id="xkdg-single-arr" style="width:16px;height:16px;"> Also optimise arrival hour/direction</label>'
      + '</div>'
      + '<div id="xkdg-grp-search" style="display:none;">'
      +   '<label style="' + labCss + '">How many days to search</label>'
      +   '<input type="number" id="xkdg-search-days" value="7" min="1" max="31" style="' + inputCss + '">'
      +   '<label style="' + labCss + '">How many itineraries to show</label>'
      +   '<input type="number" id="xkdg-search-topk" value="5" min="1" max="10" style="' + inputCss + '">'
      +   '<label style="font-size:12px;color:#555;display:flex;align-items:center;gap:7px;margin-bottom:4px;cursor:pointer;"><input type="checkbox" id="xkdg-search-arr" style="width:16px;height:16px;"> Also optimise arrival hour/direction</label>'
      + '</div>'
      + '<label style="font-size:12px;color:#333;display:flex;align-items:center;gap:7px;margin:10px 0 2px;cursor:pointer;"><input type="checkbox" id="xkdg-read-charge" checked style="width:16px;height:16px;"> \uD83D\uDD0B Read live charge from the car first</label>'
      + '<div id="xkdg-rc-note" style="font-size:11px;color:#999;margin-bottom:2px;min-height:13px;"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">'
      +   '<button id="xkdg-depart-cancel" style="background:#eee;border:0;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;">Cancel</button>'
      +   '<button id="xkdg-depart-go" style="background:#6a1b9a;color:#fff;border:0;border-radius:8px;padding:8px 18px;font-weight:700;cursor:pointer;font-size:13px;">Go</button>'
      + '</div>';
    ov.appendChild(card);
    document.body.appendChild(ov);
    var mode = 'single';
    var bSingle = document.getElementById('xkdg-mode-single'), bSearch = document.getElementById('xkdg-mode-search');
    var grpSingle = document.getElementById('xkdg-grp-single'), grpSearch = document.getElementById('xkdg-grp-search');
    var dateLab = document.getElementById('xkdg-date-lab');
    function setMode(m) {
      mode = m;
      var base = 'border:0;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px;font-weight:600;flex:1;';
      bSingle.style.cssText = base + (m === 'single' ? 'background:#6a1b9a;color:#fff;' : 'background:#eee;color:#333;');
      bSearch.style.cssText = base + (m === 'search' ? 'background:#6a1b9a;color:#fff;' : 'background:#eee;color:#333;');
      grpSingle.style.display = (m === 'single') ? 'block' : 'none';
      grpSearch.style.display = (m === 'search') ? 'block' : 'none';
      if (dateLab) dateLab.textContent = (m === 'search') ? 'From day' : 'Date';
    }
    bSingle.onclick = function () { setMode('single'); };
    bSearch.onclick = function () { setMode('search'); };
    setMode('single');
    ov.addEventListener('click', function (e) { if (e.target === ov && ov.parentNode) ov.parentNode.removeChild(ov); });
    document.getElementById('xkdg-depart-cancel').onclick = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); };
    document.getElementById('xkdg-depart-go').onclick = function () {
      var d = document.getElementById('xkdg-depart-date').value || today;
      var clause, human;
      if (mode === 'search') {
        var days = Math.max(1, Math.min(parseInt(document.getElementById('xkdg-search-days').value, 10) || 7, 31));
        var topk = Math.max(1, Math.min(parseInt(document.getElementById('xkdg-search-topk').value, 10) || 5, 10));
        var arr = !!document.getElementById('xkdg-search-arr').checked;
        clause = 'Find the BEST DAY with search_travel (NOT plan_travel): start_date ' + d + ', days ' + days +
                 ', top_k ' + topk + (arr ? ', optimize_arrival true' : '') + '. Post the selectable list.';
        human = 'search ' + days + ' days \u00b7 top ' + topk + (arr ? ' \u00b7 arrival optimised' : '');
      } else {
        var hh = (document.getElementById('xkdg-single-hour') || {}).value || '';
        if (hh) {
          clause = 'Plan this exact trip with plan_travel: depart_date ' + d + ', depart_time ' + hh +
                   '. Run the real route and post the itinerary card.';
          human = d + ' \u00b7 depart ' + hh;
        } else {
          var topk1 = Math.max(1, Math.min(parseInt(document.getElementById('xkdg-single-topk').value, 10) || 5, 10));
          var arr1 = !!document.getElementById('xkdg-single-arr').checked;
          clause = 'Find the favourable departures for ONE day with search_travel (NOT plan_travel): start_date ' + d +
                   ', days 1, top_k ' + topk1 + (arr1 ? ', optimize_arrival true' : '') +
                   '. Post the selectable list of that day\u2019s departures.';
          human = d + ' \u00b7 all departures (top ' + topk1 + ')';
        }
      }
      var goBtn = document.getElementById('xkdg-depart-go');
      var rcChk = document.getElementById('xkdg-read-charge');
      function _proceed() { if (ov.parentNode) ov.parentNode.removeChild(ov); try { cb(clause, human); } catch (e) {} }
      if (rcChk && rcChk.checked && window.TravelPlanner && typeof window.TravelPlanner.readChargeFromCar === 'function') {
        if (goBtn) { goBtn.disabled = true; goBtn.textContent = '\uD83D\uDD0B Reading\u2026'; }
        var rcNote = document.getElementById('xkdg-rc-note');
        if (rcNote) { rcNote.style.color = '#1b6e2f'; rcNote.textContent = 'Reading live charge from the car\u2026'; }
        window.TravelPlanner.readChargeFromCar().then(function (info) {
          if (info && info.rangeKm) human = human + ' \u00b7 \uD83D\uDD0B ' + Math.round(info.rangeKm) + ' km';
          _proceed();
        }).catch(function (e) {
          if (rcNote) { rcNote.style.color = '#b00'; rcNote.textContent = 'Charge read failed: ' + ((e && e.message) || e) + ' \u2014 planning with the saved value.'; }
          if (goBtn) { goBtn.disabled = false; goBtn.textContent = 'Go'; }
          setTimeout(_proceed, 1100);
        });
        return;
      }
      _proceed();
    };
  }
  function findMacro(text) {
    var t = (text || '').trim().toLowerCase(); if (!t) return null;
    var arr = loadMacros();
    for (var i = 0; i < arr.length; i++) { if ((arr[i].trigger || '').trim().toLowerCase() === t) return arr[i]; }
    return null;
  }
  function openMacroManager() {
    var old = document.getElementById('xkdg-macro-root'); if (old && old.parentNode) old.parentNode.removeChild(old);
    function E(tag, css, html) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }
    var root = E('div', 'position:fixed;inset:0;z-index:100001;background:rgba(20,8,30,.96);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit;'); root.id = 'xkdg-macro-root';
    var card = E('div', 'background:#1c1024;border:1px solid #432a52;border-radius:12px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:16px;');
    card.appendChild(E('div', 'font-weight:700;color:#e1bee7;font-size:15px;margin-bottom:4px;', '\u26A1 Macros'));
    card.appendChild(E('div', 'font-size:12px;color:#cbb8d6;margin-bottom:10px;', 'Type a macro\u2019s short trigger in the chat (e.g. <b>aq</b>) and it expands into the full instruction below. Create your own for any task.'));
    var listWrap = E('div', 'margin-bottom:12px;'); card.appendChild(listWrap);
    var tIn = E('input', 'width:100%;padding:7px;margin-bottom:6px;border:1px solid #432a52;border-radius:6px;background:#120a18;color:#fff;font-size:13px;box-sizing:border-box;'); tIn.placeholder = 'Short trigger (e.g. aq)';
    var lIn = E('input', 'width:100%;padding:7px;margin-bottom:6px;border:1px solid #432a52;border-radius:6px;background:#120a18;color:#fff;font-size:13px;box-sizing:border-box;'); lIn.placeholder = 'Label (what it does)';
    var xIn = E('textarea', 'width:100%;min-height:90px;padding:7px;margin-bottom:8px;border:1px solid #432a52;border-radius:6px;background:#120a18;color:#fff;font-size:13px;box-sizing:border-box;'); xIn.placeholder = 'Full instruction the macro sends to the assistant\u2026';
    function renderList() {
      listWrap.innerHTML = '';
      var arr = loadMacros();
      if (!arr.length) { listWrap.appendChild(E('div', 'color:#aaa;font-size:12px;', 'No macros yet.')); return; }
      arr.forEach(function (m, idx) {
        var row = E('div', 'background:#2a1633;border:1px solid #432a52;border-radius:8px;padding:8px;margin-bottom:6px;');
        row.appendChild(E('div', 'color:#fff;font-size:13px;', '<b style="color:#ffd479;">' + (m.trigger || '') + '</b> \u2014 ' + ((m.label || '').replace(/</g, '&lt;'))));
        row.appendChild(E('div', 'color:#bba;font-size:11px;margin:4px 0;white-space:pre-wrap;', (m.text || '').replace(/</g, '&lt;')));
        var edit = E('button', 'background:#23314f;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;margin-right:6px;', 'Edit');
        edit.onclick = function () { tIn.value = m.trigger || ''; lIn.value = m.label || ''; xIn.value = m.text || ''; card.scrollTop = card.scrollHeight; };
        var del = E('button', 'background:#5a2030;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;', 'Delete');
        del.onclick = function () { var a = loadMacros(); a.splice(idx, 1); saveMacros(a); renderList(); if (typeof _macroChipRefresh === 'function') _macroChipRefresh(); };
        row.appendChild(edit); row.appendChild(del);
        listWrap.appendChild(row);
      });
    }
    card.appendChild(E('div', 'font-weight:600;color:#e1bee7;font-size:13px;margin:6px 0 4px;', 'Add / update a macro'));
    card.appendChild(tIn); card.appendChild(lIn); card.appendChild(xIn);
    var saveB = E('button', 'background:#1d7a3a;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;margin-right:8px;', 'Save macro');
    saveB.onclick = function () {
      var t = (tIn.value || '').trim(), x = (xIn.value || '').trim();
      if (!t || !x) { alert('Give a trigger and the instruction text.'); return; }
      var a = loadMacros(), i = -1;
      for (var k = 0; k < a.length; k++) { if ((a[k].trigger || '').trim().toLowerCase() === t.toLowerCase()) { i = k; break; } }
      var obj = { trigger: t, label: (lIn.value || '').trim(), text: x };
      if (i >= 0) a[i] = obj; else a.push(obj);
      saveMacros(a); tIn.value = ''; lIn.value = ''; xIn.value = ''; renderList();
      if (typeof _macroChipRefresh === 'function') _macroChipRefresh();
    };
    var closeB = E('button', 'background:#3a2030;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer;', 'Close');
    closeB.onclick = function () { if (root.parentNode) root.parentNode.removeChild(root); };
    card.appendChild(saveB); card.appendChild(closeB);
    root.appendChild(card); document.body.appendChild(root);
    renderList();
  }

  // ── Verification helper: open the XKDG date + the QMDJ chart for a recommended date/hour ──
  var _VB_BR_ORDER = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  var _VB_BR_HAN = { Zi:'\u5b50', Chou:'\u4e11', Yin:'\u5bc5', Mao:'\u536f', Chen:'\u8fb0', Si:'\u5df3', Wu:'\u5348', Wei:'\u672a', Shen:'\u7533', You:'\u9149', Xu:'\u620c', Hai:'\u4ea5' };
  var _VB_HAN2PIN = { '\u5b50':'Zi','\u4e11':'Chou','\u5bc5':'Yin','\u536f':'Mao','\u8fb0':'Chen','\u5df3':'Si','\u5348':'Wu','\u672a':'Wei','\u7533':'Shen','\u9149':'You','\u620c':'Xu','\u4ea5':'Hai' };
  var _VB_STEMS_HAN = ['\u7532','\u4e59','\u4e19','\u4e01','\u6208','\u5df1','\u5e9a','\u8f9b','\u58ec','\u7678'];
  var _VB_ZI_BY_DAYSTEM = { '\u7532':'\u7532','\u5df1':'\u7532','\u4e59':'\u4e19','\u5e9a':'\u4e19','\u4e19':'\u6208','\u8f9b':'\u6208','\u4e01':'\u5e9a','\u58ec':'\u5e9a','\u6208':'\u58ec','\u7678':'\u58ec' };
  var _VB_DIR2PAL = { SE:4, S:9, SW:2, E:3, C:5, W:7, NE:8, N:1, NW:6 };
  function _vbBranch(s){
    if(s == null) return null; s = String(s).trim();
    for(var k in _VB_HAN2PIN){ if(s.indexOf(k) >= 0) return _VB_HAN2PIN[k]; }
    var cap = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return (_VB_BR_ORDER.indexOf(cap) >= 0) ? cap : null;
  }
  function _vbDayStemHan(Y, M, D){
    try {
      if(typeof XKDGSolarTime !== 'undefined' && XKDGSolarTime.currentLonTz){
        var lt = XKDGSolarTime.currentLonTz();
        if(lt && isFinite(lt.lonDeg)){ var P = XKDGSolarTime.pillarsFromCivil(Y, M, D, 12, 0, 0, lt.lonDeg, lt.tzOffsetMin); return P.day.charAt(0); }
      }
    } catch(e){}
    return null;
  }
  function _vbHourPillar(iso, branchPin){
    var p = String(iso).split('-'); var Y = +p[0], M = +p[1], D = +p[2];
    var dG = _vbDayStemHan(Y, M, D); if(!dG) return null;
    var ziIdx = _VB_STEMS_HAN.indexOf(_VB_ZI_BY_DAYSTEM[dG]);
    var bi = _VB_BR_ORDER.indexOf(branchPin); if(bi < 0 || ziIdx < 0) return null;
    return { hGan: _VB_STEMS_HAN[(ziIdx + bi) % 10], hZhi: _VB_BR_HAN[branchPin], hourIndex: bi };
  }
  // Show the QMDJ chart HTML in a floating overlay (works over ANY active section,
  // since showQimenChart otherwise renders only inside the Feng Shui results area).
  function _vbShowChartOverlay(html){
    var ex = document.getElementById('xkdg-vb-overlay'); if(ex) ex.remove();
    var ov = document.createElement('div');
    ov.id = 'xkdg-vb-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100000;overflow:auto;padding:18px;';
    var box = document.createElement('div');
    box.style.cssText = 'max-width:520px;width:100%;margin:24px auto;';
    box.innerHTML = html;
    var close = document.createElement('button');
    close.textContent = '\u2715';
    close.style.cssText = 'position:fixed;top:12px;right:14px;z-index:100001;background:#6a1b9a;color:#fff;border:0;border-radius:50%;width:38px;height:38px;font-size:17px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    close.onclick = function(){ ov.remove(); };
    ov.appendChild(box);
    ov.appendChild(close);
    ov.addEventListener('click', function(e){ if(e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }
  function toolShowVerifyButton(input){
    input = input || {};
    var iso = String(input.date || '').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { error: 'Provide date as YYYY-MM-DD.' };
    var bp = _vbBranch(input.hour); if(!bp) return { error: 'Provide the hour branch (e.g. Wu / \u5348).' };
    var hp = _vbHourPillar(iso, bp); if(!hp) return { error: 'Could not compute the hour pillar for that date.' };
    var dir = String(input.direction || '').trim().toUpperCase();
    var palace = _VB_DIR2PAL[dir] || null;
    var label = input.label || ('Controllo: ' + iso + ' \u00b7 ' + _VB_BR_HAN[bp] + (dir ? (' \u00b7 ' + dir) : ''));
    try { if(window.XKDGChat && window.XKDGChat.addVerifyButton) window.XKDGChat.addVerifyButton({ date: iso, hourIndex: hp.hourIndex, hGan: hp.hGan, hZhi: hp.hZhi, palace: palace, label: label }); }
    catch(e){ return { error: 'Could not add the button.' }; }
    return { ok: true, button_shown: true, date: iso, hour: _VB_BR_HAN[bp], hour_pillar: hp.hGan + hp.hZhi, palace: palace };
  }

  // Is daylight saving in effect on date d (per the device timezone)? Standard time has the larger UTC offset;
  // a smaller offset on d means DST is active. Works for northern and southern hemispheres.
  function dstActiveOn(d) {
    try {
      var y = d.getFullYear();
      var std = Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset());
      return d.getTimezoneOffset() < std;
    } catch (e) { return false; }
  }
  // True wall-clock start of the Chinese double-hour that contains wall time `d`, at longitude `lon`.
  // Double-hours start at solar 23,1,3,...,21. solar = wall + offsetMin; offsetMin matches the planner.
  function branchStartWall(d, lon, utc, dstOn) {
    try {
      if (lon == null || isNaN(lon)) return null;
      var off = (lon - utc * 15) * 4 - (dstOn ? 60 : 0);            // minutes
      var solar = new Date(d.getTime() + off * 60000);
      var h = solar.getHours();
      var startH = (h < 1) ? 23 : (h - ((h - 1) % 2));              // largest odd hour <= h (Zi wraps at 23)
      var bs = new Date(solar.getFullYear(), solar.getMonth(), solar.getDate(), startH, 0, 0);
      if (startH === 23 && h < 1) bs = new Date(bs.getTime() - 86400000);
      return new Date(bs.getTime() - off * 60000);                  // back to wall clock
    } catch (e) { return null; }
  }
  function startOfTodayMs() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(); }

  // Map a Chinese hour BRANCH (a solar double-hour) to the REAL LOCAL CLOCK
  // window at the app's configured longitude / UTC / DST — the SAME convention
  // as the BEST/LIST date pages (offsetMin = (lon - utc*15)*4 - dst*60).
  // hourHan may be a full ganzhi ("戊子") — the branch is the last CJK char.
  // Returns 'HH:MM–HH:MM' or null if longitude/UTC are not set.
  var _BRANCH_SOLAR_START = { '子':23,'丑':1,'寅':3,'卯':5,'辰':7,'巳':9,'午':11,'未':13,'申':15,'酉':17,'戌':19,'亥':21 };
  function solarBranchToClock(hourHan) {
    try {
      if (!hourHan) return null;
      var chars = String(hourHan).replace(/[^\u4e00-\u9fff]/g, ''), br = null;
      for (var i = chars.length - 1; i >= 0; i--) { if (_BRANCH_SOLAR_START[chars[i]] != null) { br = chars[i]; break; } }
      if (!br) return null;
      var lonEl = document.getElementById('longitude'), utcEl = document.getElementById('utc-offset');
      if (!lonEl || !utcEl) return null;
      var lon = parseFloat(lonEl.value), utc = parseFloat(utcEl.value);
      if (isNaN(lon) || isNaN(utc)) return null;
      var dstOn = false;
      try { dstOn = (typeof _dstOn !== 'undefined') ? _dstOn : !!window._dstOn; } catch (e) {}
      var offsetMin = (lon - utc * 15) * 4 - (dstOn ? 60 : 0);          // solar = clock + offsetMin
      var startMin = (((_BRANCH_SOLAR_START[br] * 60 - offsetMin) % 1440) + 1440) % 1440;
      var endMin = (startMin + 120) % 1440;
      var fmt = function (m) { m = Math.round(((m % 1440) + 1440) % 1440); var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; };
      return fmt(startMin) + '\u2013' + fmt(endMin);
    } catch (e) { return null; }
  }

  // Read-only reference of how each Purpose is coded in checkPurpose() (kept in sync with app-bazi.js).
  var PURPOSE_SHARED_GATES = [
    'Score (after spirit bonuses) must be >= 4 (>= 1 only in test mode with no person loaded).',
    'A person (A or B) must be loaded.',
    'At least one XKDG relation must connect: Adding, Hetu, Pure Qi, Family, or Inverse Hexagram ("the loop closes").',
    '"Very Weak" dates are excluded from every purpose.',
    'A year-branch clash excludes the date, UNLESS Blood Link Family or Pure Qi is present (these override the clash).',
    'Blood Link (Family) is one of the STRONGEST POSITIVE XKDG activations \u2014 same-family hexagrams, a powerful cohesive setting. It OVERRIDES branch clashes and RESCUES hours from Kong Wang void. It is NEVER a "critical/blood day", NEVER auto-excluded, and has nothing to do with \u8840\u5203 (which does not exist in this system). Never describe Blood Link hours as excluded. On the contrary, actively PREFER Blood Link dates whose aquarium palace is positive: in any month that contains Blood Link dates, a Blood Link date with a positive aquarium palace takes ABSOLUTE PRIORITY for water activation over any non-Blood-Link date.',
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
  // Pull the SAME approved guide the 📖 button shows (window.PURPOSE_GUIDE), as plain
  // text, so the chat answer matches the modal and stays current automatically.
  function purposeGuideFor(p) {
    try {
      var G = window.PURPOSE_GUIDE && window.PURPOSE_GUIDE[p];
      if (!G) return null;
      var strip = function (s) { return String(s || '').replace(/<br\s*\/?>(?=)/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); };
      var gen = [];
      try {
        gen = String(window.PURPOSE_GUIDE_GENERAL || '')
          .replace(/<br\s*\/?>(?=)/gi, '\n').replace(/<[^>]+>/g, '')
          .split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      } catch (e) {}
      return {
        name: G.name,
        good_date_xkdg: (G.date || []).map(strip),
        feng_shui_activation_qmdj: (G.fs || []).map(strip),
        general_rules: gen
      };
    } catch (e) { return null; }
  }

  function toolExplainPurpose(input) {
    input = input || {};
    var p = (input.purpose || '').toLowerCase();
    if (p && PURPOSE_RULES[p]) {
      var guide = purposeGuideFor(p);
      return { purpose: p, name: PURPOSE_RULES[p].name, conditions: PURPOSE_RULES[p],
        shared_gates: PURPOSE_SHARED_GATES,
        guide: guide,
        note: (guide
          ? 'Present BOTH parts of `guide` to the user in their language: (1) what makes a good DATE (good_date_xkdg) and (2) how to ACTIVATE it in Feng Shui (feng_shui_activation_qmdj — door, QMDJ stars/spirits, flying stars), then the general_rules. This is the same approved guide the 📖 button shows. `conditions` is the underlying coded detail you may draw on, but lead with `guide`.'
          : 'These are the coded conditions in checkPurpose. A date qualifies only if it passes ALL the shared gates, is not blocked by the listed bad spirits, and meets the "requires" items. Explain them in the user\'s language.') };
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
    var today = todayIso();
    var start = today;
    if (input.start_date && /^\d{4}-\d{2}-\d{2}$/.test(input.start_date) && input.start_date >= today) start = input.start_date;
    var soft = (input.strictness === 'soft') && !!purpose;   // soft only makes sense with a purpose
    // Optional weekday restriction (e.g. flights only on Sun/Tue/Thu/Sat). Accepts names or numbers 0..6 (Sun=0).
    var WK = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    var wkSet = null;
    if (Array.isArray(input.weekdays) && input.weekdays.length) {
      wkSet = {};
      input.weekdays.forEach(function (w) {
        if (typeof w === 'number') { if (w >= 0 && w <= 6) wkSet[w] = 1; }
        else { var key = String(w).trim().slice(0, 3).toLowerCase(); if (WK[key] != null) wkSet[WK[key]] = 1; }
      });
      if (!Object.keys(wkSet).length) wkSet = null;
    }
    function wkOk(iso) {
      if (!wkSet) return true;
      var p = String(iso).split('-'); if (p.length < 3) return true;
      return !!wkSet[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
    }
    var ps = document.getElementById('purpose-select');
    var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days');
    if (ss) ss.value = start;
    if (sd) sd.value = String(days);
    // This is a date scan, not a flight: make sure no direction filter is active.
    try { if (fsPalaceActive() && typeof window.fsClearDirectionFilter === 'function') window.fsClearDirectionFilter(); } catch (e) {}
    var both = pl.a && pl.b;
    function runWith(pv) {
      if (ps) { ps.value = pv; if (typeof window.onPurposeChange === 'function') try { window.onPurposeChange(); } catch (e) {} }
      runScannerQuiet();
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
      var res = runWith(purpose).filter(function (r) { return wkOk(r.isoDate); });
      var _emptyS = res.length ? null : emptyScanNote();
      var _outS = {
        strictness: purpose ? 'strict' : 'general',
        purpose: purpose || '(general)', days: days, from: start,
        weekday_filtered: !!wkSet,
        persons_loaded: both ? 'A+B' : (pl.a ? 'A' : 'B'),
        count: res.length,
        results: res.slice(0, 15).map(function (r, i) { return row(r, i); })
      };
      if (_emptyS) for (var _kS in _emptyS) if (Object.prototype.hasOwnProperty.call(_emptyS, _kS)) _outS[_kS] = _emptyS[_kS];
      return _outS;
    }

    // SOFT scan: keep the strict purpose matches on top (their own score), then add the nearer
    // dates that are still positive (>=1, no bad spirit) but only partly fit the purpose.
    var strictRes = runWith(purpose).filter(function (r) { return wkOk(r.isoDate); });
    var strictScore = {}; strictRes.forEach(function (r) { strictScore[keyOf(r)] = r.score; });
    var generalRes = runWith('').filter(function (r) { return wkOk(r.isoDate); });  // leaves the on-screen list on the broader positive set
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
      strictness: 'soft', purpose: purpose, days: days, from: start,
      weekday_filtered: !!wkSet,
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
  function toolPlanLuckyDayTrip(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.proposeLuckyTrips !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };
    var origin = null;
    if (input.origin_lat != null && input.origin_lon != null) origin = { lat: +input.origin_lat, lon: +input.origin_lon };
    else if (window._lastGpsLat != null && window._lastGpsLng != null) origin = { lat: window._lastGpsLat, lon: window._lastGpsLng };
    var today = todayIso();
    var dateStr = input.date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateStr = today;
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;
    var dstOn = dstActiveOn(new Date(dateStr + 'T12:00:00'));
    var opts = {
      utc: utc, dstOn: dstOn, dateStr: dateStr,
      maxRadiusKm: (input.max_radius_km != null ? +input.max_radius_km : 200),
      stayMinH: (input.stay_min_h != null ? +input.stay_min_h : 1.5),
      stayMaxH: (input.stay_max_h != null ? +input.stay_max_h : 3),
      topN: (input.count != null ? Math.max(2, Math.min(6, parseInt(input.count, 10))) : 4)
    };
    if (input.category) opts.category = String(input.category);
    else if (input.any_poi) opts.category = 'famous attractions';   // "qualsiasi POI" -> real generic place per option
    if (input.min_km != null) opts.minOriginKm = +input.min_km;
    if (input.avoid_crowds != null) opts.avoidCrowds = !!input.avoid_crowds;
    if (origin) opts.origin = origin;
    var wantDir = (input.direction && /^(N|NE|E|SE|S|SW|W|NW)$/.test(input.direction)) ? input.direction : null;
    // Chained loops have long legs (40+ km): they make no sense for a walk/bike or a
    // very local trip, so suppress them when the radius is small (avoids a confusing
    // "only by car" section on a bike request).
    var allowChains = !(opts.maxRadiusKm != null && opts.maxRadiusKm < 15);

    // CHAINED loops (sync, no network): one BEST loop per stop-count (1,2,3,4 direction-changes).
    // firstDir biases/limits loops by their first leg; only=true keeps ONLY loops heading that way.
    function chainBlock(firstDir, only) {
      if (!allowChains) return null;
      if (typeof window.TravelPlanner.proposeChainTrips !== 'function') return null;
      try {
        var cr = window.TravelPlanner.proposeChainTrips({ utc: utc, dstOn: dstOn, dateStr: dateStr,
          maxLegs: 5, onePerN: true, firstDir: firstDir || null, firstDirOnly: !!only, origin: (origin || undefined) });
        return (cr && cr.ok && cr.chains && cr.chains.length) ? cr.chains : null;
      } catch (e) { return null; }
    }
    function tooLate() {
      var tmr = new Date(dateStr + 'T12:00:00'); tmr.setDate(tmr.getDate() + 1);
      var tmrStr = tmr.getFullYear() + '-' + String(tmr.getMonth() + 1).padStart(2, '0') + '-' + String(tmr.getDate()).padStart(2, '0');
      return { ok: false, too_late_or_empty: true, tomorrow: tmrStr,
        note: 'No round-trip AND no chained loop fits ' + dateStr + ' from now on — probably too late in the day (or radius too small). Offer tomorrow (call again with date=' + tmrStr + ') or a larger radius.' };
    }
    function buildResult(r, proposals, chains, meta) {
      meta = meta || {};
      var instr = 'A visual CARD listing every option (direction, real place, times, score) WITH a per-option map button ' +
        'and a share button has ALREADY been shown to the user by the app. Give a SHORT summary (2-4 lines) highlighting the ' +
        'best 1-2 options and what each activates; do NOT repeat every option in full, and do NOT output map links yourself. ' +
        'Present these as DISTINCT options to choose from — they vary by direction, distance and stay. ' +
        'All clock times are local wall-clock. For EACH key moment also show the Chinese double-hour provided: ' +
        'depart_cn (departure), arrive_cn (reaching the destination), return_depart_cn (leaving back), return_arrive_cn (home). ' +
        'These are already computed on the compensated true-solar-time (longitude + DST) exactly like the Main — show them ' +
        'verbatim and NEVER recompute or shift them yourself. Format e.g. "Partenza 15:55 (Wei 未 · TST 14:30)". ' +
        '"score" (0-5) = combined luck (the minimum of the outbound and return legs); higher is luckier. ' +
        '"clean"=true means both legs are fully favourable. If a proposal has a "place", show that real name as the destination, ' +
        'and use "place_kind" to tell the user WHAT kind of stop it is so they know where to pull over and start walking: ' +
        'parking=car park, trailhead=path start, viewpoint=panorama, picnic=picnic area, camp=campsite, park=park, ' +
        'reserve=nature reserve, lake=lakeside, town=village/town (e.g. "Parcheggio Seeparkplatz — inizio sentiero"). ' +
        'For nature stops, "place_access" (parking/trailhead) tells you the stop is a real car park or path-start near the ' +
        'natural feature named in "place" (and "place_feature"): present it as "park at the lot/trailhead by <feature>", never ' +
        'as a point in the road. ' +
        'If "ev_charging" is true the stop has an EV charger within walking distance (ev_power = its power if known) — ' +
        'highlight it (e.g. "🔌 colonnina di ricarica" / "🔌 EV charger ~11 kW"), the car can charge while the user walks. ' +
        'If there is no place it is a generic point along that direction. The user can refine by category later ("solo natura"). ' +
        'If "poi_service_error" is true, the places service was temporarily unreachable — say exactly that ' +
        'and offer to retry; do NOT claim there are no places of that kind. If only "some_without_place" is true, those few ' +
        'points simply had no named place of that category nearby (offer a larger radius or a different category). ' +
        ((chains && chains.length)
          ? 'CHAINED LOOPS ARE INCLUDED in the field "chains": multi-leg lucky LOOPS that leave home, change direction at each ' +
            'stop, and return the same day. Each has "stops" (1, 2, 3 or 4 direction-changes), "n" legs, "score" 0-5 and ' +
            '"sanqiCount". PRESENT THE WHOLE ANSWER IN THIS PRIORITY ORDER, all together: (1) the simple OUT-AND-BACK options ' +
            'first; then a section "🔗 Tragitti a catena" with the loops ordered by increasing stops (1-stop, then 2, 3, 4). For ' +
            'each loop list its legs in order: leg number, direction (dir), favourable door (doorLabel), double-hour (brPy + br), ' +
            'distance (km), end coordinates (to.lat, to.lon), and departCn/arriveCn verbatim; note it returns home within "resid" km. ' +
            'Do NOT make the user ask for chains separately — they are part of the answer. '
          : '') +
        (meta.direction_satisfied === true
          ? 'The user asked to travel toward ' + (wantDir || '?') + '. EVERY option here heads that way (round-trips toward it ' +
            'and/or chain loops whose FIRST leg goes that way). Present them as the answer to that request. '
          : '') +
        (meta.direction_satisfied === false
          ? ('IMPORTANT — ' + meta.direction_note + ' State plainly FIRST that no favourable trip (neither round-trip nor chain) ' +
             'heads ' + (wantDir || 'that way') + ' on this day, THEN offer the options below as ALTERNATIVE directions. ')
          : '') +
        'Once the user picks a SIMPLE option, call plan_travel with its dest_lat/dest_lon to run the real route. Do not invent directions or times yourself.';
      try {
        if (window.XKDGChat && typeof window.XKDGChat.addDayTrip === 'function' && proposals && proposals.length) {
          window.XKDGChat.addDayTrip({ origin: input.origin_name || undefined,
            origin_lat: origin ? origin.lat : null, origin_lon: origin ? origin.lon : null,
            date: (r && r.date) || dateStr, proposals: proposals });
        }
      } catch (e) {}
      return {
        ok: true, date: (r && r.date) || dateStr, any_fully_favourable: !!(r && r.anyClean),
        chains_included: !!(chains && chains.length),
        requested_direction: wantDir || undefined,
        direction_satisfied: (meta.direction_satisfied !== undefined ? meta.direction_satisfied : undefined),
        instructions: instr,
        proposals: proposals,
        chains: (chains && chains.length) ? chains : undefined
      };
    }

    if (wantDir) {
      // 1) round-trips toward the requested direction; 2) chains heading that way.
      opts.direction = wantDir;
      return window.TravelPlanner.proposeLuckyTrips(opts).then(function (r) {
        var proposals = (r && r.proposals) ? r.proposals : [];
        var chains = chainBlock(wantDir, true);                 // STRICT: only loops toward wantDir
        if (proposals.length || (chains && chains.length)) {
          return buildResult(r, proposals, chains, { direction_satisfied: true });
        }
        // 3) ONLY now, when nothing heads that way at all → propose alternative directions.
        delete opts.direction;
        return window.TravelPlanner.proposeLuckyTrips(opts).then(function (r2) {
          var altP = (r2 && r2.proposals) ? r2.proposals : [];
          var altC = chainBlock(null, false);
          if (!altP.length && !(altC && altC.length)) return tooLate();
          return buildResult(r2, altP, altC, { direction_satisfied: false,
            direction_note: 'no favourable round-trip and no chain loop head ' + wantDir + ' on ' + dateStr + '.' });
        });
      }).catch(function (e) { return { error: 'Lucky-trip planning failed: ' + ((e && e.message) || e) }; });
    }

    // No direction requested → round-trips + chains (one per stop-count), all together.
    return window.TravelPlanner.proposeLuckyTrips(opts).then(function (r) {
      var proposals = (r && r.proposals) ? r.proposals : [];
      var chains = chainBlock(null, false);
      if (!proposals.length && !(chains && chains.length)) return tooLate();
      return buildResult(r, proposals, chains, {});
    }).catch(function (e) { return { error: 'Lucky-trip planning failed: ' + ((e && e.message) || e) }; });
  }

  // ── MULTI-DAY themed Lucky Trip (engine B) ───────────────────────────────
  // Reuses the proven single-day engine (proposeLuckyTrips) once per day around a
  // fixed base, picking the best DISTINCT themed place each day. Sequential (each
  // call is async); hub model. Returns a structured Day-1..N itinerary + how to show it.
  // OPEN-PATH MOBILE-BASE tour: sleep in a different place each night, each base
  // reached by a favourable-direction transfer from the previous one. Greedy chain:
  // per day, ask the engine for a favourable destination inside the area & leg range,
  // then find a real place of character to sleep near it. Serial (never parallel).
  // ── DIRECTIONAL DETOUR (session 28, Edu) ───────────────────────────────────
  // "The outlet is 150 km NW but NW has no usable hour today - could I go W first
  // and then N?" The geometry and the hour reading both live in travel-planner.js,
  // because every bearing must pass through tpBearing, which applies the magnetic
  // declination at source. Nothing here recomputes a direction.
  function toolPlanDirectionalDetour(input) {
    input = input || {};
    if (!window.TravelPlanner || typeof window.TravelPlanner.planDirectionalDetour !== 'function')
      return Promise.resolve({ error: 'The Travel Planner is not available on this page.' });
    var destName = input.destination ? String(input.destination).trim() : '';
    if (!destName && (input.dest_lat == null || input.dest_lon == null))
      return Promise.resolve({ error: 'A destination is required: a place name, or dest_lat + dest_lon.' });

    function _gps() {
      if (input.origin_lat != null && input.origin_lon != null)
        return { lat: +input.origin_lat, lon: +input.origin_lon, name: input.origin_name || 'origin' };
      if (window._lastGpsLat != null && window._lastGpsLng != null)
        return { lat: window._lastGpsLat, lon: window._lastGpsLng, name: 'current position' };
      return null;
    }
    var jobs = [], origin = _gps(), dest = null;
    if (input.dest_lat != null && input.dest_lon != null)
      dest = { lat: +input.dest_lat, lon: +input.dest_lon, name: destName || 'destination' };
    if (!dest && typeof window.TravelPlanner.resolvePlace === 'function') {
      jobs.push(window.TravelPlanner.resolvePlace(destName, origin && origin.lat, origin && origin.lon)
        .then(function (d) { if (d && isFinite(d.lat)) dest = { lat: d.lat, lon: d.lon, name: d.name || destName }; })
        .catch(function () {}));
    }
    if (!origin && input.origin_name && typeof window.TravelPlanner.resolvePlace === 'function') {
      jobs.push(window.TravelPlanner.resolvePlace(String(input.origin_name), null, null)
        .then(function (o) { if (o && isFinite(o.lat)) origin = { lat: o.lat, lon: o.lon, name: o.name || input.origin_name }; })
        .catch(function () {}));
    }

    return Promise.all(jobs).then(function () {
      if (!origin) return { error: 'No starting point: turn GPS on, or pass origin_name / origin_lat + origin_lon.' };
      if (!dest) return { error: 'Could not find "' + destName + '". Try a fuller address, or give dest_lat + dest_lon.' };
      var fromMs = Date.now();
      if (input.from_time && /^\d{1,2}:\d{2}$/.test(input.from_time)) {
        var hm = input.from_time.split(':');
        var base = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
          ? new Date(input.date + 'T00:00:00') : new Date();
        base.setHours(+hm[0], +hm[1], 0, 0);
        if (base.getTime() > fromMs || input.date) fromMs = base.getTime();
      } else if (input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
        var d0 = new Date(input.date + 'T06:00:00');
        if (d0.getTime() > fromMs) fromMs = d0.getTime();
      }
      var untilMs = fromMs + (Math.max(2, Math.min(24, parseInt(input.window_hours, 10) || 14)) * 3600000);
      return window.TravelPlanner.planDirectionalDetour({
        origin: origin, dest: dest, fromMs: fromMs, untilMs: untilMs,
        speedKmh: input.speed_kmh || 70,
        maxWaitMin: (input.max_wait_min != null) ? +input.max_wait_min : undefined,
        snapPlaces: input.snap_places !== false
      }).then(function (r) {
        if (r && r.error) return r;
        var clock = function (ms) { var d = new Date(ms); return _2(d.getHours()) + ':' + _2(d.getMinutes()); };
        function _2(n) { return (n < 10 ? '0' : '') + n; }
        // As with the direction scanner: the pairing is written HERE, so the model
        // cannot attach a leg's direction, door or hour to the wrong leg.
        (r.options || []).forEach(function (c) { c.steps = _detourSteps(c, clock); });
        r.options = (r.options || []).slice(0, 3);
        r.direct.line = 'direct: ' + r.direct.dir + ', ' + r.direct.km + ' km'
          + (r.direct.hours.length
              ? ' \u2014 usable hours: ' + r.direct.hours.map(function (h) {
                  return h.zhi + ' ' + clock(h.from) + '-' + clock(h.to) + ' (' + h.door + ')'; }).join('; ')
              : ' \u2014 NO usable hour in this window');
        r.scanner = 'directional_detour';
        r.origin = origin.name; r.destination = dest.name;
        r.pairing_rule = 'If `direct` has usable hours, SAY THAT FIRST in one line and stop - a detour is only worth '
          + 'proposing when the direct octant has none. Otherwise answer with the five numbered `steps` of each '
          + 'option, reproduced EXACTLY (translated, values untouched), after one opening line saying there is no '
          + 'favourable direct direction and that you are using a detour. BE BRIEF: no commentary, no scores, no '
          + 'bearings, no per-leg kilometres, no method explanation, no closing paragraph.';
        return r;
      });
    }).catch(function (e) { return { error: 'Detour planning failed: ' + ((e && e.message) || e) }; });
  }

  function toolPlanMobileTour(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.proposeLuckyTrips !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };

    var originName = input.origin_name || null;
    var _rawLat = input.origin_lat, _rawLon = input.origin_lon;
    function _gpsOrCoords() {
      if (_rawLat != null && _rawLon != null) return { lat: +_rawLat, lon: +_rawLon };
      if (window._lastGpsLat != null && window._lastGpsLng != null) return { lat: window._lastGpsLat, lon: window._lastGpsLng };
      return null;
    }
    var origin = _gpsOrCoords();
    var areaName = input.area ? String(input.area).trim() : null;
    var areaBox = null;

    var start = input.start_date || input.date || todayIso();
    var nights = Math.max(1, Math.min(10, parseInt(input.days != null ? input.days : input.nights, 10) || 3));
    var minLeg = (input.min_leg_km != null) ? +input.min_leg_km : 40;
    var maxLeg = (input.max_leg_km != null) ? +input.max_leg_km : 120;
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;

    function addDays(iso, n) {
      var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function inBox(lat, lon) {
      if (!areaBox) return true;
      return lat >= areaBox.south && lat <= areaBox.north && lon >= areaBox.west && lon <= areaBox.east;
    }

    function _resolve() {
      var jobs = [];
      if (originName && typeof window.TravelPlanner.resolvePlace === 'function') {
        jobs.push(window.TravelPlanner.resolvePlace(originName, _rawLat, _rawLon).then(function (o) {
          if (o && isFinite(o.lat) && isFinite(o.lon)) origin = { lat: o.lat, lon: o.lon };
        }).catch(function () {}));
      }
      if (areaName && typeof window.TravelPlanner.resolveArea === 'function') {
        jobs.push(window.TravelPlanner.resolveArea(areaName).then(function (a) {
          if (a && a.box) areaBox = a.box;
        }).catch(function () {}));
      }
      return Promise.all(jobs);
    }

    var itinerary = [];
    var usedKeys = {};

    var themes = [];
    if (Array.isArray(input.categories)) themes = input.categories.map(function (s) { return String(s || '').trim(); }).filter(Boolean);
    else if (input.category) themes = [String(input.category)];

    // bearing (deg) A->B, and 8-point compass sector match (~1.5 sectors tolerance)
    function bearingDeg(a, b) {
      var la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180, dlo = (b.lon - a.lon) * Math.PI / 180;
      var y = Math.sin(dlo) * Math.cos(la2);
      var x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dlo);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }
    var DIR_CENTRE = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
    function sectorMatch(label, brg) {
      var c = DIR_CENTRE[String(label || '').toUpperCase().trim()];
      if (c == null) return true;   // unknown label -> don't filter
      var d = Math.abs(brg - c) % 360; if (d > 180) d = 360 - d;
      return d <= 34;
    }

    function stopRec(s, th) {
      return { name: s.place || s.name || 'Stop', lat: s.dest_lat, lon: s.dest_lon,
        theme: th || null, direction: s.direction || null, depart_cn: s.depart_cn || null,
        km: (s.km != null ? s.km : null) };
    }

    // A favourable stop from `from` on `dateStr`. With a category it's a real themed
    // place (abbey, winery...). minKm enforces a real move; area keeps it in-region.
    function pickFavourableStop(from, dateStr, category, minKm) {
      var dstOn = dstActiveOn(new Date(dateStr + 'T12:00:00'));
      var opts = { utc: utc, dstOn: dstOn, dateStr: dateStr, maxRadiusKm: maxLeg,
        stayMinH: 1, stayMaxH: 2, topN: 18, origin: from };
      if (category) opts.category = category;
      return window.TravelPlanner.proposeLuckyTrips(opts).then(function (r) {
        var props = (r && r.proposals) ? r.proposals : [];
        for (var i = 0; i < props.length; i++) {
          var p = props[i];
          if (p.dest_lat == null || p.dest_lon == null) continue;
          if (!inBox(p.dest_lat, p.dest_lon)) continue;
          if (minKm != null && p.km != null && p.km < minKm) continue;
          if (p.km != null && p.km > maxLeg) continue;
          var k = (Math.round(p.dest_lat * 100) / 100) + ',' + (Math.round(p.dest_lon * 100) / 100);
          if (usedKeys['S:' + k]) continue;
          usedKeys['S:' + k] = 1;
          return p;
        }
        return null;
      }).catch(function () { return null; });
    }

    // A place of character to sleep near `pt`. launchPt + wantDir enforce that the
    // bearing FROM the last stop TO the hotel falls in the favourable direction
    // ("the last stop -> hotel direction must be positive").
    function findLodgingNear(pt, launchPt, wantDir) {
      if (!(window.ResonanceFinder && typeof window.ResonanceFinder.findLodging === 'function')) return Promise.resolve(null);
      return window.ResonanceFinder.findLodging(pt.lat, pt.lon, { radiusM: 12000, limit: 8 }).then(function (list) {
        var pool = list;
        if (launchPt && wantDir) {
          var kept = list.filter(function (p) { return sectorMatch(wantDir, bearingDeg(launchPt, { lat: p.lat, lon: p.lon })); });
          if (kept.length) pool = kept;
        }
        for (var i = 0; i < pool.length; i++) {
          var k = (pool[i].name || '').toLowerCase();
          if (!usedKeys['L:' + k]) { usedKeys['L:' + k] = 1; return pool[i]; }
        }
        return pool.length ? pool[0] : null;
      }).catch(function () { return null; });
    }

    var state = { cur: null, date: start };
    var chain = _resolve().then(function () { state.cur = origin; });

    for (var i = 0; i < nights; i++) {
      (function (nightIdx) {
        chain = chain.then(function () {
          if (!state.cur) return;                       // chain already broke
          var dateStr = state.date;
          var B = state.cur;
          var theme = themes.length ? themes[nightIdx % themes.length] : null;

          // 1) the day's LAST stop: a favourable themed stop from the morning base.
          //    This is the launch point from which the hotel direction is judged.
          return pickFavourableStop(B, dateStr, theme, minLeg).then(function (stop) {
            var launch = stop ? { lat: stop.dest_lat, lon: stop.dest_lon } : B;

            // 2) the HOTEL: a favourable move FROM the last stop, then a real place
            //    of character to sleep in that favourable direction.
            return pickFavourableStop(launch, dateStr, null, null).then(function (mv) {
              if (!mv) {
                itinerary.push({ night: nightIdx + 1, date: dateStr,
                  theme_stop: stop ? stopRec(stop, theme) : null, base: null,
                  note: 'no favourable place to sleep from the last stop this day' });
                state.cur = null; return;
              }
              return findLodgingNear({ lat: mv.dest_lat, lon: mv.dest_lon }, launch, mv.direction).then(function (lodg) {
                var bLat = lodg ? lodg.lat : mv.dest_lat;
                var bLon = lodg ? lodg.lon : mv.dest_lon;
                itinerary.push({
                  night: nightIdx + 1, date: dateStr,
                  theme_stop: stop ? stopRec(stop, theme) : null,
                  transfer: { from_last_stop: !!stop, direction: mv.direction || null, depart_cn: mv.depart_cn || null, km: (mv.km != null ? mv.km : null) },
                  base: {
                    name: lodg ? lodg.name : ('Area near ' + mv.dest_lat.toFixed(2) + ', ' + mv.dest_lon.toFixed(2)),
                    lat: bLat, lon: bLon, category: lodg ? lodg.category : null, source: lodg ? lodg.source : null,
                    characterScore: lodg ? lodg.characterScore : null, address: lodg ? lodg.address : null,
                    url: lodg ? (lodg.url || lodg.website || '') : ''
                  }
                });
                state.cur = { lat: bLat, lon: bLon };
                state.date = addDays(state.date, 1);
              });
            });
          });
        });
      })(i);
    }

    return chain.then(function () {
      function gmapsRoute(pts) {
        if (pts.length < 2) return null;
        var u = 'https://www.google.com/maps/dir/?api=1&travelmode=driving';
        u += '&origin=' + encodeURIComponent(pts[0].lat + ',' + pts[0].lon);
        u += '&destination=' + encodeURIComponent(pts[pts.length - 1].lat + ',' + pts[pts.length - 1].lon);
        if (pts.length > 2) {
          var w = pts.slice(1, -1).map(function (p) { return p.lat + ',' + p.lon; });
          u += '&waypoints=' + encodeURIComponent(w.join('|'));
        }
        return u;
      }
      var pts = origin ? [{ lat: origin.lat, lon: origin.lon, name: originName || 'Start' }] : [];
      itinerary.forEach(function (d) {
        if (d.theme_stop && d.theme_stop.lat != null) pts.push({ lat: d.theme_stop.lat, lon: d.theme_stop.lon, name: d.theme_stop.name });
        if (d.base && d.base.lat != null) pts.push({ lat: d.base.lat, lon: d.base.lon, name: d.base.name });
      });
      var routeUrl = gmapsRoute(pts);

      if (window.XKDGChat && typeof window.XKDGChat.addMobileTour === 'function') {
        try { window.XKDGChat.addMobileTour({ origin: originName || 'Start', start_date: start,
          origin_lat: origin ? origin.lat : null, origin_lon: origin ? origin.lon : null,
          itinerary: itinerary, route_url: routeUrl }); } catch (e) {}
      }

      var instr = 'This is an OPEN-PATH MOBILE-BASE tour. Each day: a favourable THEME STOP (theme_stop) during the ' +
        'day, then the night\'s hotel (base) reached by a favourable move FROM THAT LAST STOP (not from the morning ' +
        'base). Present it night by night: the theme stop, then the place ' +
        'to sleep (base.name), how they got there (transfer.direction in the transfer.depart_cn hour, transfer.km km), ' +
        'and the character score if present. The path is OPEN \u2014 it ends at the last favourable base and does NOT ' +
        'return home. If a night has base=null, say honestly that the favourable chain ended there. A ROUTE MAP CARD ' +
        'with per-leg buttons has ALREADY been shown by the app \u2014 do NOT call open_itinerary_in_maps.';
      return { ok: true, mode: 'mobile_open_path', origin: originName || undefined, start_date: start,
        nights_requested: nights, nights_planned: itinerary.filter(function (d) { return d.base; }).length,
        area: areaName || undefined, itinerary: itinerary, route_url: routeUrl || undefined, instructions: instr };
    }).catch(function (e) { return { error: 'mobile tour failed: ' + ((e && e.message) || e) }; });
  }

  function toolPlanLuckyMultiDay(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.proposeLuckyTrips !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };
    var originName = input.origin_name || null;
    var _rawLat = input.origin_lat, _rawLon = input.origin_lon;
    function _gpsOrCoords() {
      if (_rawLat != null && _rawLon != null) return { lat: +_rawLat, lon: +_rawLon };
      if (window._lastGpsLat != null && window._lastGpsLng != null) return { lat: window._lastGpsLat, lon: window._lastGpsLng };
      return null;
    }
    var origin = _gpsOrCoords();   // provisional; a base NAME (if given) is geocoded below and overrides this
    var areaName = input.area ? String(input.area).trim() : null;
    var areaBox = null;            // bounding box of the region to stay within (Tuscany, Dolomites...)
    // Resolve the base NAME to real coordinates, and the AREA name to a bounding
    // box, before running. resolvePlace PREFERS geocoding the name over AI-guessed
    // coordinates (wrong for small towns) and over saved GPS — so "Siena" really
    // means Siena. The area box then fences every stop inside the region.
    function _resolveOriginStep() {
      var jobs = [];
      if (originName && typeof window.TravelPlanner.resolvePlace === 'function') {
        jobs.push(window.TravelPlanner.resolvePlace(originName, _rawLat, _rawLon).then(function (o) {
          if (o && isFinite(o.lat) && isFinite(o.lon)) origin = { lat: o.lat, lon: o.lon };
        }).catch(function () {}));
      }
      if (areaName && typeof window.TravelPlanner.resolveArea === 'function') {
        jobs.push(window.TravelPlanner.resolveArea(areaName).then(function (a) {
          if (a && a.box) areaBox = a.box;
        }).catch(function () {}));
      }
      return Promise.all(jobs);
    }
    var today = todayIso();
    var start = input.start_date || input.date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start < today) start = today;
    var days = (input.days != null) ? Math.max(1, Math.min(10, parseInt(input.days, 10))) : 3;
    var category = input.category ? String(input.category) : null;
    var themes = [];
    if (Array.isArray(input.categories)) {
      themes = input.categories.map(function (s) { return String(s || '').trim(); }).filter(Boolean);
    } else if (category) {
      // a single string may hold several themes separated by ; , / |  (NOT spaces:
      // "hermitages abbeys sanctuaries" is ONE theme)
      themes = category.split(/\s*[;,/|]\s*/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
    var multiTheme = themes.length > 1;
    if (!multiTheme) category = themes.length ? themes[0] : category;

    var avoidCrowds = !!input.avoid_crowds;
    var maxKm = (input.max_radius_km != null) ? +input.max_radius_km : 200;
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;

    function addDays(iso, n) {
      var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    var used = {};        // avoid repeating the same place across days
    var usedThemes = {};  // spread different themes across the days
    var out = [];

    function pickFromProposals(props) {
      for (var k = 0; k < props.length; k++) {
        var nameKey = props[k].place ? props[k].place.toLowerCase()
          : ((props[k].dest_lat) + ',' + (props[k].dest_lon));
        if (!used[nameKey]) { used[nameKey] = 1; return props[k]; }
      }
      return null;
    }

    // Keep a proposal only if its place falls inside the requested region box
    // (no box set → everything passes).
    function inArea(p) {
      if (!areaBox || !p || p.dest_lat == null || p.dest_lon == null) return true;
      return p.dest_lat >= areaBox.south && p.dest_lat <= areaBox.north &&
             p.dest_lon >= areaBox.west && p.dest_lon <= areaBox.east;
    }

    function dayOptsFor(dateStr, themeStr) {
      var dstOn = dstActiveOn(new Date(dateStr + 'T12:00:00'));
      var o = { utc: utc, dstOn: dstOn, dateStr: dateStr, maxRadiusKm: maxKm,
        stayMinH: 1.5, stayMaxH: 3, topN: (areaBox ? 16 : 6) };
      if (themeStr) o.category = themeStr;
      if (avoidCrowds) o.avoidCrowds = true;
      if (origin) o.origin = origin;
      return o;
    }

    // Single-theme day (unchanged proven behaviour).
    function runSingle(dayIdx, dateStr, themeStr) {
      return window.TravelPlanner.proposeLuckyTrips(dayOptsFor(dateStr, themeStr)).then(function (r) {
        var props = ((r && r.proposals) ? r.proposals : []).filter(inArea);
        var pick = pickFromProposals(props);
        if (!pick && props.length) pick = props[0];     // all repeated → reuse the best
        out.push({ day: dayIdx + 1, date: dateStr,
          any_fully_favourable: !!(r && r.anyClean),
          poi_service_error: !!(r && r.poi_service_error), proposal: pick || null });
      }).catch(function () { out.push({ day: dayIdx + 1, date: dateStr, proposal: null, error: true }); });
    }

    // Multi-theme day: try themes in order (least-used first, for variety) and
    // STOP at the first theme that yields a new distinct place. Serial — never
    // parallel — so the shared engine state is never stomped.
    function runMulti(dayIdx, dateStr) {
      var order = themes.slice().sort(function (a, b) {
        return (usedThemes[a] ? 1 : 0) - (usedThemes[b] ? 1 : 0);
      });
      var ti = 0, best = null, bestTheme = null, sawError = false;
      function tryNext() {
        if (ti >= order.length) {
          if (best) out.push({ day: dayIdx + 1, date: dateStr, theme: bestTheme, proposal: best });
          else out.push({ day: dayIdx + 1, date: dateStr, proposal: null, error: sawError || undefined });
          return Promise.resolve();
        }
        var theme = order[ti++];
        return window.TravelPlanner.proposeLuckyTrips(dayOptsFor(dateStr, theme)).then(function (r) {
          var props = ((r && r.proposals) ? r.proposals : []).filter(inArea);
          var pick = pickFromProposals(props);
          if (pick) {
            usedThemes[theme] = 1;
            out.push({ day: dayIdx + 1, date: dateStr, theme: theme,
              any_fully_favourable: !!(r && r.anyClean),
              poi_service_error: !!(r && r.poi_service_error), proposal: pick });
            return;   // day filled
          }
          if (!best && props.length) { best = props[0]; bestTheme = theme; }  // last-resort fallback
          return tryNext();
        }).catch(function () { sawError = true; return tryNext(); });
      }
      return tryNext();
    }

    var chain = _resolveOriginStep();
    for (var i = 0; i < days; i++) {
      (function (dayIdx) {
        chain = chain.then(function () {
          var dateStr = addDays(start, dayIdx);
          return multiTheme ? runMulti(dayIdx, dateStr) : runSingle(dayIdx, dateStr, category);
        });
      })(i);
    }

    return chain.then(function () {
      // ---- Maps links (hub model: each day is an out-and-back from the SAME base) ----
      function gmapsDir(orig, dest, wps) {
        var u = 'https://www.google.com/maps/dir/?api=1&travelmode=driving';
        u += '&origin=' + encodeURIComponent(orig) + '&destination=' + encodeURIComponent(dest);
        if (wps && wps.length) u += '&waypoints=' + encodeURIComponent(wps.join('|'));
        return u;
      }
      var baseLL = origin ? (origin.lat + ',' + origin.lon) : null;
      var cardEntries = [], wpAll = [];
      out.forEach(function (d) {
        var p = d.proposal || null;
        var hasLL = !!(p && p.dest_lat != null && p.dest_lon != null);
        var perUrl = (baseLL && hasLL) ? gmapsDir(baseLL, baseLL, [p.dest_lat + ',' + p.dest_lon]) : null;
        cardEntries.push({ day: d.day, date: d.date, theme: d.theme || null,
          place: (p && p.place) || null, direction: (p && p.direction) || null,
          depart_cn: (p && p.depart_cn) || null, km: (p && p.km != null) ? p.km : null,
          dest_lat: hasLL ? p.dest_lat : null, dest_lon: hasLL ? p.dest_lon : null,
          maps_url: perUrl });
        if (baseLL && hasLL) wpAll.push(p.dest_lat + ',' + p.dest_lon);
      });
      var allUrl = (baseLL && wpAll.length) ? gmapsDir(baseLL, baseLL, wpAll) : null;
      if (window.XKDGChat && typeof window.XKDGChat.addMultiDay === 'function') {
        try { window.XKDGChat.addMultiDay({ base: originName || 'Base',
          start_date: start, days: days, entries: cardEntries, all_maps_url: allUrl }); } catch (e) {}
      }

      var instr = 'This is a MULTI-DAY themed Lucky Trip around a fixed BASE (' + (originName || 'the starting point') + '). ' +
        'Each day has ONE chosen lucky excursion: a real named place (in "proposal.place") reached in a favourable direction ' +
        'during a favourable hour, then back to the base (hub model — keep the SAME base every day). ' +
        'Present it as an itinerary "Day 1 … Day N". For EACH day show: the date, the place name (proposal.place) and what kind it ' +
        'is (proposal.place_kind), the direction (proposal.direction), the distance (proposal.km), the depart/arrive clock times ' +
        'AND their Chinese double-hour (proposal.depart_cn / proposal.arrive_cn) VERBATIM — never recompute or shift them — the stay ' +
        'length (proposal.stay_h), the return times (proposal.return_depart / return_arrive with return_depart_cn / return_arrive_cn), ' +
        'and the score (proposal.score 0-5; proposal.clean=true means both legs fully favourable). If "ev_charging" is true, note the ' +
        'EV charger (🔌). If a day\'s "proposal" is null, state plainly that no favourable themed excursion fits that day from this base, ' +
        'and offer a larger radius or a different base. Do NOT invent directions or times. To actually drive one day, call plan_travel ' +
        'with that day\'s proposal.dest_lat / dest_lon. If a day entry has a "theme" field, name which theme that ' +
        'day draws from (the trip mixes the requested themes across the days). A MAP CARD with a per-day "Open in ' +
        'Maps" button (each day out-and-back from the base) AND an "all days" overview button has ALREADY been shown ' +
        'to the user by the app — do NOT call open_itinerary_in_maps yourself.';
      return { ok: true, base: originName || undefined, start_date: start, days: days,
        category: category || undefined, categories: (multiTheme ? themes : undefined),
        itinerary: out, maps_shown: true, all_maps_url: allUrl || undefined, instructions: instr };
    }).catch(function (e) { return { error: 'Multi-day planning failed: ' + ((e && e.message) || e) }; });
  }

  // ── CITY TOUR (intra-city, one day) ──────────────────────────────────────
  function toolPlanCityTour(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.proposeCityTour !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };
    var origin = null;
    if (input.origin_lat != null && input.origin_lon != null) origin = { lat: +input.origin_lat, lon: +input.origin_lon };
    else if (window._lastGpsLat != null && window._lastGpsLng != null) origin = { lat: window._lastGpsLat, lon: window._lastGpsLng };
    var today = todayIso();
    var dateStr = input.date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr < today) dateStr = today;
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;
    var dstOn = dstActiveOn(new Date(dateStr + 'T12:00:00'));
    var opts = { utc: utc, dstOn: dstOn, dateStr: dateStr,
      radiusKm: (input.radius_km != null ? +input.radius_km : 8),
      minOriginKm: (input.min_km != null ? +input.min_km : 0),
      maxStops: (input.max_stops != null ? Math.max(2, Math.min(10, parseInt(input.max_stops, 10))) : 6) };
    if (input.category) opts.category = String(input.category);
    if (input.avoid_crowds != null) opts.avoidCrowds = !!input.avoid_crowds;
    if (origin) opts.origin = origin;
    return window.TravelPlanner.proposeCityTour(opts).then(function (r) {
      if (!r || !r.ok) {
        var why = r && r.reason;
        return { ok: false, reason: why || 'unknown', date: dateStr,
          note: why === 'no_places' ? 'No famous places of that kind were found inside the city radius — try a larger radius_km or a different category.'
            : (why === 'no_places_beyond_min') ? 'All places fell within the minimum distance — lower min_km (0 for a full in-city tour).'
            : (why === 'no_hours') ? 'No favourable double-hours remain today — offer tomorrow.'
            : 'No city tour could be built.' };
      }
      var instr = 'This is a ONE-DAY CITY TOUR inside ' + (input.origin_name || 'the city') + '. Each stop is a famous place ' +
        'visited in the double-hour when its DIRECTION from the base is favourable. Stops are ALREADY ordered to flow as a ' +
        'continuous walk (each is the nearest favourable place to the previous one), so present them IN THE GIVEN ORDER as a ' +
        'day plan: for EACH stop show the place name, the direction (stop.direction) and bearing, the distance from base ' +
        '(stop.dist_km km), the favourable DOOR (stop.doorLabel), the double-hour (stop.brPy + stop.br) with its Chinese hour ' +
        'info (stop.hour_cn) VERBATIM, and the score (stop.score 0-5). You may add the short hop between consecutive stops ' +
        '(stop.hop_km km) so the route reads naturally. Keep the SAME base all day (walk / short drive between stops). If ' +
        '"leftover" places remain, you may mention a couple as alternatives: each has fav_hours (the Chinese double-hours today ' +
        'when its direction is favourable) — quote those. NEVER suggest a leftover whose no_fav_today is true for a directional ' +
        'visit. Do NOT invent directions or hours. To navigate to a stop, use plan_travel with its dest_lat / dest_lon.';
      // Build the multi-stop WALKING Maps link for the whole tour (base + every stop
      // in order) and push a chat bubble with a one-tap "Open in Google Maps" button.
      // The tap is a real user gesture, so the pop-up is not blocked — this is how the
      // student actually SEES and navigates the tour. Fully wrapped so a failure here
      // never breaks the textual answer.
      var mapsUrl = null;
      try {
        if (window.TravelPlanner && typeof window.TravelPlanner.buildTourMapsUrl === 'function')
          mapsUrl = window.TravelPlanner.buildTourMapsUrl(r.origin, r.stops, 'walking');
      } catch (e) {}
      try {
        if (mapsUrl && window.XKDGChat && typeof window.XKDGChat.addCityTour === 'function')
          window.XKDGChat.addCityTour({ base: input.origin_name || (r.origin && r.origin.name) || 'Base',
            date: r.date, origin: r.origin, stops: r.stops, maps_url: mapsUrl });
      } catch (e) {}
      if (mapsUrl) instr += ' A card with the ordered stops and a tappable "Open in Google Maps" button (the whole ' +
        'walking route) HAS ALREADY been shown to the user — tell them to tap it to see/navigate the tour; do NOT paste a raw link.';

      return { ok: true, base: input.origin_name || undefined, date: r.date, category: r.category,
        city_radius_km: r.city_radius_km, stops: r.stops, leftover: r.leftover, maps_url: mapsUrl || undefined, instructions: instr };
    }).catch(function (e) { return { error: 'City tour failed: ' + ((e && e.message) || e) }; });
  }

  function toolPlanLuckyEvents(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.proposeLuckyEvents !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };
    var origin = null;
    if (input.origin_lat != null && input.origin_lon != null) origin = { lat: +input.origin_lat, lon: +input.origin_lon };
    else if (window._lastGpsLat != null && window._lastGpsLng != null) origin = { lat: window._lastGpsLat, lon: window._lastGpsLng };
    var today = todayIso();
    function plusDays(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    var from = input.date_from || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || from < today) from = today;
    var to = input.date_to || plusDays(today, 30);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) to = plusDays(from, 30);
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;
    var dstOn = dstActiveOn(new Date(from + 'T12:00:00'));
    var opts = { utc: utc, dstOn: dstOn, from: from, to: to,
      radiusKm: (input.radius_km != null ? +input.radius_km : 80),
      maxOut: (input.max != null ? Math.max(3, Math.min(25, parseInt(input.max, 10))) : 12) };
    if (input.category) opts.category = String(input.category);
    if (origin) opts.origin = origin;
    return window.TravelPlanner.proposeLuckyEvents(opts).then(function (r) {
      if (!r || !r.ok) {
        var why = r && r.reason;
        return { ok: false, reason: why || 'unknown', from: from, to: to,
          note: why === 'no_events' ? 'No events of that kind were found near the base in this window — widen radius_km or the date window, or try a different category (the source may simply have no listings there; remember it is weak on village fairs/sagre).'
            : why === 'no_solar' ? 'Date engine not ready on this page.'
            : 'No lucky events could be built.' };
      }
      var instr = 'These are REAL dated events near ' + (input.origin_name || 'the base') + '. The "events" list is AUSPICIOUS ' +
        'to reach: each is shown on the double-hour when its DIRECTION from the base is favourable on the EVENT\'S OWN DATE ' +
        '(the date is fixed by the event — you do NOT pick it). For EACH event show: name, date, the event\'s own start time ' +
        '(event_start / local_time) if present, venue/city, the direction (direction) + bearing, distance (dist_km km), the ' +
        'favourable DOOR (doorLabel), the double-hour to travel in (brPy + br) with its Chinese hour info (hour_cn) VERBATIM, ' +
        'and the score (0-5). Tell the user to set off DURING that favourable double-hour even if the event itself starts later. ' +
        'Give the ticket link (url) when present. The "skipped" list is events found whose direction is NOT favourable on their ' +
        'date — you may mention 1-2 as "found, but not auspicious to reach that day". Do NOT invent directions or hours. To ' +
        'navigate to one, call plan_travel with its dest_lat/dest_lon and depart_date = the event\'s date.';
      return { ok: true, base: input.origin_name || undefined, from: r.from, to: r.to, category: r.category,
        events_found: r.events_found, events: r.events, skipped: r.skipped, instructions: instr };
    }).catch(function (e) { return { error: 'Lucky events failed: ' + ((e && e.message) || e) }; });
  }

  function toolPlanLuckyChain(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.proposeChainTrips !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };
    var origin = null;
    if (input.origin_lat != null && input.origin_lon != null) origin = { lat: +input.origin_lat, lon: +input.origin_lon };
    else if (window._lastGpsLat != null && window._lastGpsLng != null) origin = { lat: window._lastGpsLat, lon: window._lastGpsLng };
    var today = todayIso();
    var dateStr = input.date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr < today) dateStr = today;
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;
    var dstOn = dstActiveOn(new Date(dateStr + 'T12:00:00'));
    var opts = {
      utc: utc, dstOn: dstOn, dateStr: dateStr,
      maxLegs: (input.max_legs != null ? Math.max(2, Math.min(5, parseInt(input.max_legs, 10))) : 5),
      maxLegKm: (input.max_leg_km != null ? +input.max_leg_km : 140),
      count: (input.count != null ? Math.max(2, Math.min(6, parseInt(input.count, 10))) : 5)
    };
    if (origin) opts.origin = origin;
    try {
      var r = window.TravelPlanner.proposeChainTrips(opts);
      if (!r || !r.ok || !r.chains || !r.chains.length) {
        var reason = r && r.reason;
        var tmr = new Date(dateStr + 'T12:00:00'); tmr.setDate(tmr.getDate() + 1);
        var tmrStr = tmr.getFullYear() + '-' + String(tmr.getMonth() + 1).padStart(2, '0') + '-' + String(tmr.getDate()).padStart(2, '0');
        return {
          ok: false, reason: reason || 'empty', tomorrow: tmrStr,
          note: 'No fortunate CHAIN closes back on the origin for ' + dateStr + ' from now on (reason: ' + (reason || 'none') + '). ' +
            'This happens when the favourable directions in the remaining double-hours cannot geometrically form a loop back home. ' +
            'Explain this plainly and offer to try tomorrow (call again with date=' + tmrStr + ') or to allow more legs.'
        };
      }
      // Snap each turning point to a REAL place you can pull into — charger if the car
      // needs charging, else a POI in the ticked categories (nature by default), else a
      // plain stopover. Only THEN build the link, so the button never lands in a field.
      var _chains = r.chains || [];
      var _range = 0, _reserve = 15, _ocmKey = '';
      try { var _rEl = document.getElementById('tp-range'); _range = _rEl ? (parseFloat(_rEl.value) || 0) : 0; } catch (eR) {}
      try { var _resEl = document.getElementById('tp-reserve'); var _rv = _resEl ? parseFloat(_resEl.value) : NaN; if (isFinite(_rv)) _reserve = _rv; } catch (eRs) {}
      try {
        var _ek = document.getElementById('tp-ocm-key-edit'), _rk = document.getElementById('tp-ocm-key');
        _ocmKey = (_ek && _ek.style.display !== 'none' && (_ek.value || '').trim()) ? _ek.value.trim() : ((_rk && _rk.value) || '').trim();
      } catch (eK) {}
      // rangeKm is what is LEFT in the battery right now (the SoC worker writes it), so a
      // charger is only ever proposed when the loop does not fit in it. no_charging lets
      // the user say "without the chargers" and get a REBUILT itinerary, instead of being
      // told to edit the link by hand.
      var _snapOpts = { rangeKm: _range, reservePct: _reserve, ocmKey: _ocmKey, noCharging: !!input.no_charging,
        categories: Array.isArray(input.categories) ? input.categories.map(function (s) { return String(s || '').trim(); }).filter(Boolean) : null };

      function _finish() {
        try {
          if (window.TravelPlanner && typeof window.TravelPlanner.buildChainMapsUrl === 'function') {
            _chains.forEach(function (c) {
              try { c.maps_url = window.TravelPlanner.buildChainMapsUrl(c, r.origin) || undefined; } catch (eU) {}
            });
          }
        } catch (eB) {}
        var _shown = false;
        try {
          if (window.XKDGChat && typeof window.XKDGChat.addChainTrips === 'function') {
            window.XKDGChat.addChainTrips({ origin: input.origin_name || (r.origin && r.origin.name) || null,
              date: r.date, chains: _chains });
            _shown = true;
          }
        } catch (eC) {}
        return {
          ok: true, date: r.date, maps_shown: _shown || undefined,
          instructions: 'These are CHAINED lucky trips: each loop is a sequence of legs, ONE per consecutive Chinese double-hour, ' +
            'and the polygon RETURNS EXACTLY to the origin (resid km is ~0). Present EACH chain as a numbered option, then its ordered ' +
            'itinerary leg by leg. For every leg show: the leg number, the DIRECTION (dir), the favourable DOOR (doorLabel, e.g. ' +
            '"Open 开"), the double-hour (brPy + br, e.g. "Si 巳"), the distance (km), and — when the leg has a "stop" — the NAME of the ' +
            'real place you stop at (stop.name) and what it is (stop.kind: charger / poi / stopover). A leg with stopUnsnapped:true has ' +
            'no real place nearby that kept its favourable direction: say so plainly instead of inventing one. ' +
            'A chain carries chargeNeeded/loopKm/usableKm: chargers are proposed ONLY when the loop does not fit in the range ' +
            'left in the battery. If the user does not want charging stops, or says the car is full, call this tool AGAIN with ' +
            'no_charging:true — do NOT tell them to edit the route inside Google Maps and do NOT write a Maps link yourself. ' +
            'Also show departCn/arriveCn (the Chinese double-hour of leaving/arriving each leg) VERBATIM ' +
            '— they are already on compensated true-solar-time, never recompute or shift them. State clearly that the trip closes back ' +
            'on the start within "resid" km. "score" (0-5) is the overall luck of the loop; "sanqiCount" = how many legs carry San Qi. ' +
            'Do NOT invent directions, doors, times or place names — show only what the tool provides. The final leg returns to the origin.' +
            (_shown ? ' A card listing every loop, each with a tappable "Open in Google Maps" button carrying the WHOLE ring ' +
              '(start + every stop + back to the start), HAS ALREADY been shown to the user — tell them to tap the ' +
              'loop they want; do NOT paste a raw link.' : ''),
          origin: r.origin, chains: _chains
        };
      }

      if (window.TravelPlanner && typeof window.TravelPlanner.snapChainStops === 'function') {
        var _seq = Promise.resolve();
        _chains.forEach(function (c) {
          _seq = _seq.then(function () {
            return window.TravelPlanner.snapChainStops(c, r.origin, _snapOpts).catch(function () { return c; });
          });
        });
        return _seq.then(_finish).catch(_finish);
      }
      return _finish();
    } catch (e) { return { error: 'Chain planning failed: ' + ((e && e.message) || e) }; }
  }

  // Acquire a FRESH GPS fix (for "replan from here"). Resolves { lat, lon, fresh } —
  // fresh:false means the fix timed out/failed and we fell back to the SAVED position;
  // resolves null when no position at all is available. Never rejects. A good fix also
  // updates the saved GPS so every later "defaults to a FRESH GPS fix" tool sees the real spot.
  function freshGps(timeoutMs) {
    var TO = timeoutMs || 12000;
    return new Promise(function (resolve) {
      var done = false;
      function fallback() {
        if (done) return; done = true;
        resolve((window._lastGpsLat != null && window._lastGpsLng != null)
          ? { lat: window._lastGpsLat, lon: window._lastGpsLng, fresh: false } : null);
      }
      try {
        if (!navigator.geolocation) return fallback();
        var t = setTimeout(fallback, TO + 500);
        navigator.geolocation.getCurrentPosition(function (pos) {
          if (done) return; done = true; clearTimeout(t);
          var la = pos.coords.latitude, lo = pos.coords.longitude;
          try {
            window._lastGpsLat = la; window._lastGpsLng = lo;
            localStorage.setItem('xkdg_gps', JSON.stringify({ lat: la, lng: lo }));
          } catch (e) {}
          resolve({ lat: la, lon: lo, fresh: true });
        }, function () { fallback(); }, { enableHighAccuracy: true, timeout: TO, maximumAge: 0 });
      } catch (e) { fallback(); }
    });
  }

  // Session 28 (Edu): "poche informazioni ma essenziali e chiare". The detour is
  // returned as a fixed NUMBERED block built here, not as loose fields: the model
  // prints the five steps and adds nothing. This also keeps every direction, door
  // and hour welded to its own leg.
  function _detourSteps(c, ck) {
    function qual(leg) {
      var bits = [leg.door];
      if (leg.sanQi) bits.push('San Qi');
      if (leg.configs && leg.configs.length) bits = bits.concat(leg.configs.slice(0, 2));
      return bits.filter(Boolean).join(', ');
    }
    return [
      '1. Leave at ' + ck(c.leg1.departFrom) + (c.leg1.departBy ? (' (by ' + ck(c.leg1.departBy) + ')') : ''),
      '2. Head ' + c.leg1.dir + ' for ' + c.leg1.km + ' km - ' + qual(c.leg1) + ' (hour ' + c.leg1.zhi + ')',
      '3. Stop at ' + ck(c.leg1.arriveMs) + (c.stop ? (' - ' + c.stop.name) : ' - no place found nearby, use a layby'),
      '4. Set off again at ' + ck(c.leg2.departFrom) + ' heading ' + c.leg2.dir
        + ' - ' + qual(c.leg2) + ' (hour ' + c.leg2.zhi + ')',
      '5. Arrive at ' + ck(c.leg2.arriveMs) + ' - ' + c.totalKm + ' km, about +' + c.extraTotalMin + ' min versus going straight'
    ];
  }
  var _DETOUR_FORMAT =
      'THE DIRECT DIRECTION HAS NO FAVOURABLE WINDOW and two-leg alternatives were computed automatically. '
    + 'ANSWER IN THIS SHAPE AND NOTHING ELSE:\n'
    + 'one opening line saying there is no favourable direct direction and that you are using a detour; '
    + 'then, for each alternative, its five numbered steps REPRODUCED EXACTLY as they appear in `steps` '
    + '(translated into the user\'s language, values untouched).\n'
    + 'BE BRIEF. Do not add commentary, scores, bearings, kilometres per leg, Chinese characters, explanations '
    + 'of the method, or a closing paragraph. Do not rebuild a step from the separate fields and never pair a '
    + 'leg with a direction, hour or door yourself. If there is more than one alternative, number them and keep '
    + 'each to its five lines.';

  function toolPlanTravel(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.plan !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };
    // "From here" (roadblock / detour / mid-trip replan): the ORIGIN is where the user IS,
    // so acquire a FRESH GPS fix — never trust the saved position, which may be hours old.
    // Falls back to the saved GPS (flagged gps_fresh:false) only if the fix fails.
    if (input.from_current_position && !input._gpsResolved) {
      return freshGps(12000).then(function (pos) {
        if (!pos) return { error: 'Could not get a GPS position for "from here". Ask the user to enable location services or to name the nearest town as origin.' };
        var next = {}; for (var k in input) if (input.hasOwnProperty(k)) next[k] = input[k];
        next.origin_lat = pos.lat; next.origin_lon = pos.lon;
        if (!next.origin_name) next.origin_name = 'Current position (GPS)';
        next._gpsResolved = true; next.gps_fresh = !!pos.fresh;
        return toolPlanTravel(next);
      });
    }
    if (input.dest_lat == null || input.dest_lon == null)
      return { error: 'I need the destination coordinates (dest_lat, dest_lon). Provide them from the city the user named.' };
    var dest = { lat: +input.dest_lat, lon: +input.dest_lon };
    var origin = null;
    if (input.origin_lat != null && input.origin_lon != null) origin = { lat: +input.origin_lat, lon: +input.origin_lon };
    else if (window._lastGpsLat != null && window._lastGpsLng != null) origin = { lat: window._lastGpsLat, lon: window._lastGpsLng };
    var today = todayIso();
    var dateStr = input.depart_date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr < today) dateStr = today; // ignore a hallucinated past/invalid date
    // Did the user give an explicit departure time? If not, the app must AUTO-PICK
    // the most favourable (and earliest, to stay shortest) departure — never a fixed 08:00.
    var hasExplicitTime = (input.depart_hour != null) ||
      (typeof input.depart_time === 'string' && /^\d{1,2}:\d{2}$/.test(input.depart_time));
    var autoDepart = !hasExplicitTime;
    var hour = (input.depart_hour != null) ? parseInt(input.depart_hour, 10) : 12;   // 12:00 is only a neutral probe time for the summary; the planner picks the real one
    var timeStr = (typeof input.depart_time === 'string' && /^\d{1,2}:\d{2}$/.test(input.depart_time))
      ? (String(parseInt(input.depart_time.split(':')[0], 10)).padStart(2, '0') + ':' + input.depart_time.split(':')[1])
      : (String(hour).padStart(2, '0') + ':00');
    // "From here" replan (roadblock/detour): no explicit time means leave NOW — the user is
    // already on the road, so never wait for a later favourable window and never snap the
    // departure back to the start of the current double-hour (that would date it in the past).
    if (input.from_current_position && !hasExplicitTime) {
      var _now = new Date();
      dateStr = todayIso();
      timeStr = String(_now.getHours()).padStart(2, '0') + ':' + String(_now.getMinutes()).padStart(2, '0');
      autoDepart = false;
    }
    var dep = new Date(dateStr + 'T' + timeStr + ':00');
    if (isNaN(dep.getTime())) return { error: 'Invalid departure date/time.' };
    // When the time is auto-picked, scan the whole day for the favourable-windows summary.
    var durH = parseInt(input.duration_h, 10) || (autoDepart ? 16 : 12);
    // Session 28 (Edu): at 10:06 the planner proposed leaving at 06:19 - four hours
    // earlier. The auto-departure scan starts at 05:00 of the chosen day, and for
    // TODAY that start was never clamped to the present, so an hour already gone
    // could win. One cannot depart in the past.
    if (autoDepart) {
      dep = new Date(dateStr + 'T05:00:00');
      if (dateStr === todayIso() && dep.getTime() < Date.now()) dep = new Date();
    }
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value);
    if (isNaN(utc)) utc = 1;
    var dstOn = dstActiveOn(dep);   // auto-detect daylight saving for the departure date (device timezone)
    function hm(d) { return (d && d.getHours) ? (String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')) : null; }
    var opts = { depDate: dep, durationH: durH, dest: dest, utc: utc, dstOn: dstOn, stepMin: 30 };
    if (input.from_current_position) opts.snapDepart = false;   // execute the real "now", not the hour start
    if (origin) opts.origin = origin;
    // Warm the XKDG hour-score cache for the trip day(s) so the itinerary's Hours rows
    // can show the XKDG marker. That cache is filled by the Bazi scanner, which a direct
    // plan_travel would otherwise never run. Headless (no rendering), best-effort, never blocks.
    try { if (typeof window.runScanner === 'function') runScannerQuiet({ startDate: dateStr, days: 2 }); } catch (e) {}
    var plan;
    try { plan = window.TravelPlanner.plan(opts); }
    catch (e) { return { error: 'Travel planning failed: ' + ((e && e.message) || e) }; }
    var windows = [];
    (plan.slots || []).forEach(function (s) {
      var good = (s.dirs || []).filter(function (d) { return d.towardDest && d.eval && d.eval.ok; });
      if (good.length) {
        windows.push({
          from: hm(s.wallStart), to: hm(s.wallEnd),          // LOCAL LEGAL (DST) clock — the times the user reads
          double_hour: s.brPy || s.brHan,                    // e.g. "Wu" — the Chinese double-hour (时辰) branch
          double_hour_han: s.brHan,                          // e.g. "午"
          solar_from: s.tstStart, solar_to: s.tstEnd,        // same window in TRUE SOLAR time (for reference only)
          ganzhi: s.gZhiPy || s.gZhiHan, weekday: s.weekday,
          directions: good.map(function (d) {
            var dl = (window.TravelPlanner && window.TravelPlanner.doorLabel) ? window.TravelPlanner.doorLabel(d.eval.door) : d.eval.door;
            return { dir: d.dir, score: d.eval.score, door: dl };
          })
        });
      }
    });
    // For a real A→B itinerary, also open the planner already filled and run the road plan
    // (one reliable call instead of depending on a separate open_travel_planner call).
    // ROOT-CAUSE FIX (session 23): the default used to test input.origin_lat — the value
    // the MODEL passed. For "da qui" trips the model is INSTRUCTED not to pass it (the
    // app resolves the saved GPS), so the planner never auto-opened on GPS-origin trips
    // even though the origin WAS resolved and the data was correct. Test the RESOLVED
    // origin instead, matching this comment's own stated intent.
    var openPlanner = (input.open_planner != null) ? !!input.open_planner : (origin != null && dest != null);

    // When no time was given, recommend the day's BEST (highest luck), EARLIEST-on-tie
    // departure from the scanned slots (daytime only). The visual planner re-picks this
    // with a warm score cache and the exact chosen time appears in the itinerary card.
    var recommendedClock = null;
    var chosenSlot = null;
    if (autoDepart) {
      var bestSlot = null, bestSc = -Infinity, earliestSlot = null;
      (plan.slots || []).forEach(function (s) {
        var h = (s.wallStart && s.wallStart.getHours) ? s.wallStart.getHours() : null;
        if (h == null || h < 5 || h > 21) return;
        if (!earliestSlot) earliestSlot = s;
        var sc = -Infinity;
        (s.dirs || []).forEach(function (d) { if (d.towardDest && d.combined != null && d.combined > sc) sc = d.combined; });
        if (sc > bestSc) { bestSc = sc; bestSlot = s; }
      });
      var pickSlot = (bestSc > -Infinity ? bestSlot : earliestSlot);
      chosenSlot = pickSlot;
      if (pickSlot && pickSlot.wallStart) recommendedClock = hm(pickSlot.wallStart);
    } else {
      // Fixed time: the user typed a LOCAL LEGAL (DST) clock time. Find the double-hour
      // slot that CONTAINS it, so we can tell the AI which 时辰 (e.g. Wu) is active.
      var depMs = dep.getTime();
      (plan.slots || []).forEach(function (s) {
        if (s.wallStart && s.wallEnd && depMs >= s.wallStart.getTime() && depMs < s.wallEnd.getTime()) chosenSlot = s;
      });
      if (!chosenSlot && plan.slots && plan.slots.length) chosenSlot = plan.slots[0];
    }
    // The double-hour (时辰) active at the chosen departure — surfaced explicitly so
    // the AI never has to infer it from the ganzhi string.
    var depDH = chosenSlot ? {
      double_hour: chosenSlot.brPy || chosenSlot.brHan,     // e.g. "Wu"
      double_hour_han: chosenSlot.brHan,                    // e.g. "午"
      wall_from: hm(chosenSlot.wallStart), wall_to: hm(chosenSlot.wallEnd),   // LOCAL LEGAL (DST) clock
      solar_from: chosenSlot.tstStart, solar_to: chosenSlot.tstEnd            // TRUE SOLAR time (reference)
    } : null;
    var snapStart = autoDepart ? (recommendedClock || hm(dep)) : hm(dep);
    // Stash the EXACT computed params (session 23) so the chat's "Apri Travel Planner"
    // button can open the planner DIRECTLY, without asking the model to repeat the tool
    // call — the model sometimes replied "it is open" without calling anything (verified:
    // _tpFromAI stayed undefined). Same lesson as tpOpenInMaps for Google Maps: opening
    // things must never depend on the model's goodwill.
    try {
      if (origin && dest) window._XKDGChatLastPlan = {
        originLat: origin.lat, originLon: origin.lon, originName: input.origin_name || null,
        destLat: dest.lat, destLon: dest.lon, destName: input.dest_name || null,
        departDate: dateStr, departTime: autoDepart ? null : snapStart, autoDepart: autoDepart,
        durationH: (input.duration_h != null ? durH : null), utc: utc, dst: dstOn,
        rangeKm: (input.range_km != null) ? +input.range_km : null,
        reserveKm: (input.reserve_km != null) ? +input.reserve_km : null,
        run: true
      };
    } catch (eStash) {}
    var baseOut = {
      direction_to_destination: { bearing: Math.round(plan.bearing) + '°', snapped: plan.snapDir },
      departure_planned: autoDepart ? (dateStr + ' (auto-selected — see the itinerary card for the exact time)') : (dateStr + ' ' + snapStart),
      recommended_departure: autoDepart && recommendedClock ? (dateStr + ' ' + recommendedClock) : null,
      departure_double_hour: depDH,
      time_convention: 'Any clock time the user gives or that appears in from/to/wall_* is the LOCAL LEGAL (civil/DST) time they read on their phone. NEVER convert it, add or subtract an hour. solar_* fields are TRUE SOLAR time for reference only — do not show them unless asked. The favourable directions belong to the double-hour named in departure_double_hour (e.g. "Wu"), whose start on the user\'s clock is wall_from.',
      departure_note: autoDepart
        ? 'No time was given, so the app auto-selects the most favourable (and earliest, to stay shortest) daytime departure. If the planner is opening, the exact chosen time appears in the itinerary card — do NOT invent 08:00 or any other time. If the planner is NOT opening, announce recommended_departure as the suggested start.'
        : 'departure_planned is the exact LOCAL LEGAL clock time the user chose. Announce THIS time as-is and name the active double-hour from departure_double_hour (e.g. the Wu hour).',
      duration_hours: durH,
      window_times: 'LOCAL CLOCK time, already adjusted for daylight saving (DST ' + (dstOn ? 'on' : 'off') + '). Present these times as-is; do NOT add or subtract an hour.',
      favorable_windows_count: windows.length,
      favorable_windows: windows.slice(0, 12),
      // Session 28 (Edu): "non me li presenta automaticamente, deve farlo". The model
      // used to mention that other windows existed and then ASK whether to show them.
      // The alternatives are written out here so there is nothing left to ask about.
      favorable_windows_lines: windows.slice(0, 6).map(function (w, i) {
        return (i + 1) + '. ' + w.from + '-' + w.to + ' - hour ' + (w.double_hour || w.double_hour_han)
             + ' - ' + w.directions.map(function (d) { return d.dir + ' (' + d.door + ')'; }).join(', ');
      }),
      windows_rule: 'ALWAYS print favorable_windows_lines in full, exactly as given, straight after the departure '
        + 'you recommend. NEVER merely say that other windows exist and NEVER ask whether to show them - listing '
        + 'them IS the answer. Keep it to those lines: no commentary, no scores, no explanation of the method.'
    };
    // Session 28 (Edu): "quando la tratta diretta non e' fortunata le alternative
    // devono arrivare da sole". Leaving that to the model meant it offered a detour
    // sometimes and forgot it other times, because calling a second tool was ITS
    // choice. It is not a choice any more: when NO favourable window exists toward
    // the destination, the two-leg alternatives are computed HERE and travel back
    // with the answer, each with the extra time it costs.
    function _finish(out) {
      if (windows.length) return out;                       // the direct run works: nothing to add
      if (!origin || !window.TravelPlanner || typeof window.TravelPlanner.planDirectionalDetour !== 'function') {
        out.detour_note = 'No favourable window toward the destination, and the detour planner is not available here.';
        return out;
      }
      var _fromMs = dep.getTime();
      if (_fromMs < Date.now() && dateStr === todayIso()) _fromMs = Date.now();
      return window.TravelPlanner.planDirectionalDetour({
        origin: { lat: origin.lat, lon: origin.lon, name: input.origin_name || 'origin' },
        dest: { lat: dest.lat, lon: dest.lon, name: input.dest_name || 'destination' },
        fromMs: _fromMs, untilMs: _fromMs + durH * 3600000,
        // the host tool has already spent part of its budget: keep the stop lookup short
        snapTimeoutMs: 4000
      }).then(function (r) {
        function _2(n) { return (n < 10 ? '0' : '') + n; }
        function ck(ms) { var d = new Date(ms); return _2(d.getHours()) + ':' + _2(d.getMinutes()); }
        if (!r || r.error) { out.detour_note = 'No favourable window toward the destination, and the alternatives could not be computed.'; return out; }
        (r.options || []).forEach(function (c) { c.steps = _detourSteps(c, ck); });
        out.detour_alternatives = (r.options || []).slice(0, 3);
        out.detour_note = (r.options && r.options.length)
          ? _DETOUR_FORMAT
          : ('The direct direction has no favourable window, and no two-leg alternative works either' + (r.reason ? (': ' + r.reason) : '.')
            + ' Say so plainly and do not invent one.');
        return out;
      }).catch(function () {
        out.detour_note = 'No favourable window toward the destination, and the alternatives could not be computed.';
        return out;
      });
    }
    if (openPlanner && origin && window.TravelPlanner && typeof window.TravelPlanner.openPrefilled === 'function') {
      var _openErr = null;
      try {
        if (input.from_current_position) { window._tpNoSnap = true; window._tpAutoDepart = false; }  // keep the exact "now" departure
        window.TravelPlanner.openPrefilled({
          originLat: origin.lat, originLon: origin.lon, originName: input.origin_name || null,
          destLat: dest.lat, destLon: dest.lon, destName: input.dest_name || null,
          departDate: dateStr, departTime: autoDepart ? null : snapStart, autoDepart: autoDepart,
          durationH: (input.duration_h != null ? durH : null), utc: utc, dst: dstOn,
          rangeKm: (input.range_km != null) ? +input.range_km : null,
          reserveKm: (input.reserve_km != null) ? +input.reserve_km : null,
          run: true
        });
      } catch (e) { _openErr = String((e && e.message) || e); }
      // VERIFY, never assume (session 23): the old code swallowed any error and
      // declared planner_opened=true unconditionally — the AI then TOLD the user
      // the planner was open when nothing had happened, and nobody could see why.
      var _reallyOpen = !_openErr && !!document.getElementById('tp-overlay');
      if (!_reallyOpen) {
        baseOut.planner_opened = false;
        baseOut.planner_error = _openErr || 'openPrefilled ran but the tp-overlay panel did not appear.';
        baseOut.note = 'The Travel Planner did NOT open (' + baseOut.planner_error + '). Tell the user plainly that the ' +
          'planner could not be opened and to report this — do NOT claim it is open, do NOT invent an itinerary.';
        return _finish(baseOut);
      }
      baseOut.planner_opened = true;
      baseOut.note = 'The planner is open and computing the real road route' +
        ((input.range_km != null) ? ' and the charging stops' : '') +
        '. The full itinerary will post itself into THIS chat as a separate card (lettered steps A/B/C matching Google Maps + charging + an ' +
        '"Open in Google Maps" button) within a few seconds - you do NOT render it. Reply with ONE short sentence ' +
        'only: ' + (autoDepart
          ? 'say you picked the most favourable departure of the day and that the exact clock time + direction are in the card; do NOT invent a time.'
          : 'the departure clock time from departure_planned (it is the START of the favourable double-hour, already DST-adjusted) and the optimal direction.') +
        ' Do NOT paste the itinerary, do NOT say "below"/"above" or ' +
        '"I am calculating", do NOT tell the user to fill anything, and do NOT call open_itinerary_in_maps on your ' +
        'own. Google Maps does not auto-open; the user opens it by tapping the card button or by asking ("open in ' +
        'Maps") — you may mention this in your one line.';
      return _finish(baseOut);
    }
    baseOut.planner_opened = false;
    baseOut.note = 'Straight-line estimate. For the real road route + Google Maps export, open the Travel Planner.';
    return _finish(baseOut);
  }
  function toolSearchTravel(input) {
    input = input || {};
    if (!window.TravelPlanner || typeof window.TravelPlanner.searchItineraries !== 'function')
      return { error: 'The Travel Planner search is not available on this page.' };
    if (input.dest_lat == null || input.dest_lon == null)
      return { error: 'I need the destination coordinates (dest_lat, dest_lon).' };
    var dest = { lat: +input.dest_lat, lon: +input.dest_lon };
    var origin = null;
    if (input.origin_lat != null && input.origin_lon != null) origin = { lat: +input.origin_lat, lon: +input.origin_lon };
    else if (window._lastGpsLat != null && window._lastGpsLng != null) origin = { lat: window._lastGpsLat, lon: window._lastGpsLng };
    if (!origin) return { error: 'I need the origin coordinates (origin_lat/origin_lon) or a saved GPS position.' };
    var today = todayIso();
    var startDate = input.start_date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || startDate < today) startDate = today;
    var days = Math.max(1, Math.min(parseInt(input.days, 10) || 7, 31));
    var topK = Math.max(1, Math.min(parseInt(input.top_k, 10) || 5, 10));
    var optArr = !!input.optimize_arrival;
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;
    var dstOn = dstActiveOn(new Date(startDate + 'T12:00:00'));
    return window.TravelPlanner.searchItineraries({
      origin: origin, dest: dest, startDate: startDate, days: days,
      utc: utc, dstOn: dstOn, optimizeArrival: optArr, topK: topK
    }).then(function (res) {
      try {
        if (window.XKDGChat && typeof window.XKDGChat.addItinerarySearch === 'function') {
          window.XKDGChat.addItinerarySearch({
            origin: origin, dest: dest,
            originName: input.origin_name || null, destName: input.dest_name || null,
            rangeKm: (input.range_km != null) ? +input.range_km : null,
            reserveKm: (input.reserve_km != null) ? +input.reserve_km : null,
            utc: utc, optimizeArrival: optArr, result: res
          });
        }
      } catch (e) {}
      // Session 28 (Edu): the detour hook was added to plan_travel only, but THIS is the
      // tool that answers "which departure should I take" - and when every itinerary
      // cashes ZERO favourable hours it was reporting "none of them is favourable" and
      // stopping there. The alternatives must arrive on their own here too.
      var _noLuck = !(res.top || []).some(function (c) { return (c.total_cash || 0) > 0; });
      var _base = {
        search_done: true, days: days, optimize_arrival: optArr,
        score_method: 'total_cash' + (optArr ? ' + arrival favourability' : ''),
        km: res.km, driving_h: res.driving_h, driving_min: res.driving_min, total_evaluated: res.total_evaluated,
        driving_time_note: 'All itineraries share the same road, so the driving time is the same for each; what differs is the departure/arrival and the cashed luck.',
        top: (res.top || []).map(function (c) {
          return { date: c.date, weekday: c.weekday, depart: c.depart,
            arrive: c.arrive + (c.arrive_next_day ? ' (+1d)' : ''), driving_min: res.driving_min, score: c.score,
            total_cash: c.total_cash, cash_hours: c.cash_hours, xkdg_hours: c.xkdg_hours, xkdg_bonus: c.xkdg_bonus, of_hours: c.total_hours };
        }),
        note: 'A SELECTABLE ranked list of the top itineraries has ALREADY been posted into THIS chat as a card; ' +
          'the user taps "Choose" on one to open the full plan. The card has a Best / By date toggle so they can ' +
          'view the same itineraries ranked by luck (Best) or in chronological order (By date) - the best one stays ' +
          'starred in both. Reply with ONE short sentence: say you ranked the ' +
          'days by total cashed luck' + (optArr ? ' (and favourable arrival)' : '') + ', they can pick one from ' +
          'the card, and can sort it by date if they prefer. Do NOT paste the list, do NOT invent times.'
      };
      if (!_noLuck || typeof window.TravelPlanner.planDirectionalDetour !== 'function') return _base;
      var _f = Date.now(), _sd = startDate || todayIso();
      if (/^\d{4}-\d{2}-\d{2}$/.test(_sd) && _sd > todayIso()) _f = new Date(_sd + 'T06:00:00').getTime();
      return window.TravelPlanner.planDirectionalDetour({
        origin: { lat: origin.lat, lon: origin.lon, name: input.origin_name || 'origin' },
        dest: { lat: dest.lat, lon: dest.lon, name: input.dest_name || 'destination' },
        fromMs: _f, untilMs: _f + 14 * 3600000, snapTimeoutMs: 4000
      }).then(function (r) {
        function _p2(n) { return (n < 10 ? '0' : '') + n; }
        function _ck(ms) { var d = new Date(ms); return _p2(d.getHours()) + ':' + _p2(d.getMinutes()); }
        if (!r || r.error) return _base;
        (r.options || []).forEach(function (c) { c.steps = _detourSteps(c, _ck); });
        _base.detour_alternatives = (r.options || []).slice(0, 3);
        _base.detour_note = (r.options && r.options.length)
          ? _DETOUR_FORMAT + ' The ranked departure card stays on screen; mention it in one line only.'
          : ('No itinerary catches a favourable hour and no two-leg alternative works either'
             + (r.reason ? (': ' + r.reason) : '.') + ' Say so plainly and do not invent one.');
        return _base;
      }).catch(function () { return _base; });
    }).catch(function (err) { return { error: 'Search failed: ' + ((err && err.message) || err) }; });
  }
  function toolPlanArriveBy(input) {
    input = input || {};
    if (!window.TravelPlanner || typeof window.TravelPlanner.planArriveBy !== 'function')
      return { error: 'The Travel Planner is not available on this page.' };
    if (input.dest_lat == null || input.dest_lon == null)
      return { error: 'I need the destination coordinates (dest_lat, dest_lon).' };
    if (typeof input.arrive_time !== 'string' || !/^\d{1,2}:\d{2}$/.test(input.arrive_time))
      return { error: 'I need the target arrival time (arrive_time, HH:MM).' };
    var dest = { lat: +input.dest_lat, lon: +input.dest_lon };
    var origin = null;
    if (input.origin_lat != null && input.origin_lon != null) origin = { lat: +input.origin_lat, lon: +input.origin_lon };
    else if (window._lastGpsLat != null && window._lastGpsLng != null) origin = { lat: window._lastGpsLat, lon: window._lastGpsLng };
    var today = todayIso();
    var dateStr = input.arrive_date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr < today) dateStr = today;
    var hh = String(parseInt(input.arrive_time.split(':')[0], 10)).padStart(2, '0');
    var timeStr = hh + ':' + input.arrive_time.split(':')[1];
    var target = new Date(dateStr + 'T' + timeStr + ':00');
    if (isNaN(target.getTime())) return { error: 'Invalid arrival date/time.' };
    var tolMin = (input.tolerance_min != null) ? parseInt(input.tolerance_min, 10) : 15;
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value); if (isNaN(utc)) utc = 1;
    var dstOn = dstActiveOn(target);
    var chargingOptional = (input.charging_optional !== false);
    var range = (input.range_km != null) ? +input.range_km : 0;
    var reserve = (input.reserve_km != null) ? +input.reserve_km : 0;
    if (!origin) return { error: 'I need the origin (origin_lat/lon) or a saved GPS position to plan an arrive-by trip.' };

    var TP = window.TravelPlanner;
    var maxExtra = (input.max_extra_hours != null) ? +input.max_extra_hours : 5;
    var openPlanner = (input.open_planner != null) ? !!input.open_planner : true;

    function resolve(name, lat, lon) {
      return (TP.resolvePlace ? TP.resolvePlace(name, lat, lon) : Promise.resolve({ lat: +lat, lon: +lon }));
    }

    // Builds the answer once the (real) route is known.
    function finish(route) {
      var out;
      try {
        out = TP.planArriveBy({
          arriveDate: target, tolMin: tolMin, origin: origin, dest: dest, utc: utc, dstOn: dstOn,
          rangeKm: range, reserveKm: reserve, maxExtraHours: maxExtra, route: route || undefined
        });
      } catch (e) { return { error: 'Arrive-by planning failed: ' + ((e && e.message) || e) }; }

      var sols = (out.solutions || []).slice(0, 4).map(function (s) {
        return { depart_clock: s.depClock, arrive_clock: s.arriveClock, duration_h: s.durH,
          favorable_dirs_cashed: s.dirsCashed, favorable_hours: s.favHours, stops: s.nCashStops,
          charge_needed: s.chargeNeeded };
      });
      // Session 28 (Edu): third and last entry point for an A->B question. When not one
      // solution cashes a favourable direction, the two-leg alternatives are computed
      // here as well, so the answer never stops at "nothing is favourable".
      function _finishAB(o) {
        var any = sols.some(function (x) { return (x.favorable_dirs_cashed || 0) > 0; });
        if (any || typeof TP.planDirectionalDetour !== 'function') return o;
        var _f = Date.now();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr > todayIso()) _f = new Date(dateStr + 'T06:00:00').getTime();
        return TP.planDirectionalDetour({
          origin: { lat: origin.lat, lon: origin.lon, name: input.origin_name || 'origin' },
          dest: { lat: dest.lat, lon: dest.lon, name: input.dest_name || 'destination' },
          fromMs: _f, untilMs: _f + 14 * 3600000, snapTimeoutMs: 4000
        }).then(function (r) {
          function _p2(n) { return (n < 10 ? '0' : '') + n; }
          function _ck(ms) { var d = new Date(ms); return _p2(d.getHours()) + ':' + _p2(d.getMinutes()); }
          if (!r || r.error) return o;
          (r.options || []).forEach(function (c) { c.steps = _detourSteps(c, _ck); });
          o.detour_alternatives = (r.options || []).slice(0, 3);
          o.detour_note = (r.options && r.options.length)
            ? _DETOUR_FORMAT
            : ('No solution cashes a favourable direction and no two-leg alternative works either'
               + (r.reason ? (': ' + r.reason) : '.') + ' Say so plainly and do not invent one.');
          return o;
        }).catch(function () { return o; });
      }
      var baseOut = {
        target_arrival: dateStr + ' ' + timeStr + ' (\u00b1' + tolMin + ' min)',
        distance_km: out.km, drive_time_h: out.driveH, used_real_route: out.usedRealRoute,
        note_times: 'All depart_clock/arrive_clock are LOCAL CLOCK (DST ' + (dstOn ? 'on' : 'off') + '); present as-is. ' +
          'Solutions are SHORTEST first; longer ones travel through more favourable directions. ' +
          (out.usedRealRoute ? '' : 'The road route could not be fetched, so durations are a cautious estimate. '),
        solutions: sols
      };

      var chosen = out.chosen;
      if (openPlanner && chosen && typeof TP.openPrefilled === 'function') {
        var wantCharge = (!chargingOptional) || chosen.chargeNeeded;
        try {
          TP.openPrefilled({
            originLat: origin.lat, originLon: origin.lon, originName: input.origin_name || null,
            destLat: dest.lat, destLon: dest.lon, destName: input.dest_name || null,
            departDate: dateStr, departTime: chosen.depClock,
            durationH: chosen.durH, utc: utc, dst: dstOn, noSnap: true,
            rangeKm: wantCharge && range ? range : null,
            reserveKm: wantCharge && range ? reserve : null,
            autoChargers: !!(wantCharge && range),
            run: true
          });
        } catch (e) {}
        baseOut.planner_opened = !!document.getElementById('tp-overlay');   // VERIFIED, not assumed (session 23)
        if (!baseOut.planner_opened) baseOut.planner_error = 'The planner panel did not appear — tell the user plainly, do NOT claim it is open.';
        baseOut.chosen_solution = { depart_clock: chosen.depClock, duration_h: chosen.durH, arrive_clock: chosen.arriveClock };
        baseOut.note = 'The planner is open on the SHORTEST solution (leaves ' + chosen.depClock + ', arrives ' + chosen.arriveClock +
          '). The full itinerary posts itself into THIS chat as a separate card. Reply with ONE short sentence: the chosen ' +
          'departure clock time and arrival, then briefly mention there are also longer options through more favourable ' +
          'directions if they want. Do NOT paste the itinerary; do NOT call open_itinerary_in_maps on your own ' +
          '(Maps opens only when the user taps the card button or asks for it).';
        return _finishAB(baseOut);
      }
      baseOut.planner_opened = false;
      baseOut.note = 'Present the solutions shortest-first. To open one, the user can pick it and you can open the planner.';
      return _finishAB(baseOut);
    }

    // 1) geocode the place names (reliable coords) → 2) fetch the REAL road
    // route (so driving time is accurate) → 3) compute the arrive-by solutions.
    return resolve(input.origin_name, origin.lat, origin.lon).then(function (o) {
      if (o && isFinite(o.lat) && isFinite(o.lon)) origin = { lat: o.lat, lon: o.lon };
      return resolve(input.dest_name, dest.lat, dest.lon);
    }).then(function (d) {
      if (d && isFinite(d.lat) && isFinite(d.lon)) dest = { lat: d.lat, lon: d.lon };
      if (typeof TP.fetchRoute === 'function') {
        return TP.fetchRoute({ lat: origin.lat, lng: origin.lon }, { lat: dest.lat, lng: dest.lon })
          .catch(function () { return null; });   // degrade to a cautious estimate if the route service fails
      }
      return null;
    }).then(function (route) {
      return finish(route);
    });
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
        utc: utc, dst: dstActiveOn(new Date(dateStr + 'T' + String(hour).padStart(2, '0') + ':00:00')),
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
  function toolStartCompass(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.startCompass !== 'function')
      return { error: 'Compass not available on this page.' };
    var place = (input.place && String(input.place).trim()) ? String(input.place).trim() : null;
    var spec = place ? place : (input.origin === 'here' ? 'here' : null);
    try {
      var r = window.TravelPlanner.startCompass(spec);   // may return a Promise (geocoding)
      if (r && typeof r.then === 'function') {
        return r.then(function (res) {
          if (place && res && res.found === false) return { opened: 'compass', origin_set: false, note: 'Compass opened, but the place "' + place + '" was not found. Ask the user to confirm or pick a nearby town.' };
          return { opened: 'compass', origin_set: true, origin: (res && res.origin) || (place || 'here') };
        });
      }
      return { opened: 'compass', origin_set: !!spec, origin: spec || null };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }
  function toolControlCompass(input) {
    if (!window.TravelPlanner || typeof window.TravelPlanner.compassControl !== 'function')
      return { error: 'Compass not available on this page.' };
    var action = (input.action || '').toString().trim();
    if (!action) return { error: 'No action given.' };
    try { return window.TravelPlanner.compassControl(action); }
    catch (e) { return { error: String((e && e.message) || e) }; }
  }
  function toolOpenQimenFS() {
    if (!window.QFS || typeof window.QFS.open !== 'function') return { error: 'Qimen-for-flying-stars (QFS) not available on this page.' };
    window.QFS.open();
    return { opened: 'qimen_flying_stars', note: 'Panel opened — the user selects the target profiles/entities, then runs the scan.' };
  }

  // ── Whole-app tools (state, Water, navigation, houses/placements) ──
  function toolFindDivinationChart(input) {
    try {
      if (typeof window.QimenDivFinder === 'undefined' || typeof window.QimenDivFinder.scan !== 'function')
        return { error: 'Divination chart finder not loaded.' };
      var conds = { stems: input.stems || [], doors: input.doors || [] };
      if (!conds.stems.length && !conds.doors.length) return { error: 'Provide at least one stem or door condition.' };
      var r = window.QimenDivFinder.scan(conds, { startDate: input.start_date || null, days: input.days || 60, maxResults: input.max_results || 20 });
      if (!r.ok) return { error: r.error || 'Scan failed.' };
      if (!r.count) return { ok: true, count: 0, note: 'No chart in the scanned window satisfies all conditions. Try a longer "days" window, fewer conditions, or more allowed palaces for a stem.' };
      var matchList = r.matches.map(function (m) { return { date: m.date, double_hour: m.label, branch: m.branch, positions: m.where, score: (m.score != null ? m.score : null), score_ok: m.scoreOk, palace: m.scorePalace || null, profile: m.profile || null }; });
      var _condParts = [];
      (conds.doors || []).forEach(function (d) { if (d && d.door) _condParts.push(String(d.door)); });
      (conds.stems || []).forEach(function (s) { if (s && s.stem) _condParts.push(String(s.stem)); });
      var _condStr = _condParts.join(' + ') || undefined;
      try {
        if (window.XKDGChat && typeof window.XKDGChat.addDivinationMatches === 'function') {
          window.XKDGChat.addDivinationMatches({ count: r.count, truncated: r.truncated,
            conditions: _condStr, matches: matchList });
        }
      } catch (e) {}
      return {
        ok: true, count: r.count, truncated: r.truncated,
        matches: matchList,
        instructions: 'A CARD listing every matching chart (date + double-hour + where each condition landed + a rotating-chart ' +
          'SCORE and profile chips + a "View chart" button that opens Directions -> Divinations already drawn on that date/hour) ' +
          'has ALREADY been shown by the app, sorted BEST score first. Give a SHORT summary highlighting the top 1-2 by score ' +
          '(mention the score and why, e.g. San Qi / Commander present); do NOT tell the user to open Divinations manually, and ' +
          'do NOT repeat the full list if long. Each match carries "score" (rotating-chart auspiciousness) and "profile". Keep it concise.'
      };
    } catch (e) { return { error: 'Divination scan failed: ' + ((e && e.message) || e) }; }
  }

  function toolAnalyzeDirection(input) {
    try {
      if (typeof window.QimenDirAnalysis === 'undefined' || typeof window.QimenDirAnalysis.analyzeDirection !== 'function')
        return { error: 'Direction analysis engine not loaded.' };
      var S = window.Solar || (window.Lunar && window.Lunar.Solar);
      if (!S) return { error: 'Lunar library not available.' };
      var dir = String(input.direction || '').toUpperCase();
      if (!/^(N|NE|E|SE|S|SW|W|NW)$/.test(dir)) return { error: 'direction must be one of N,NE,E,SE,S,SW,W,NW' };
      var date = input.date, time = input.time || '12:00';
      var dp = String(date).split('-').map(Number), tp = String(time).split(':').map(Number);
      if (dp.length < 3) return { error: 'date must be YYYY-MM-DD' };
      var H2P = { '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu', '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui' };
      var BR = { '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si', '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai' };
      var hGan, hZhi, yearStem;
      var _lt = (typeof XKDGSolarTime !== 'undefined') ? XKDGSolarTime.currentLonTz() : null;
      if (_lt && isFinite(_lt.lonDeg)) {
        // TRUE SOLAR TIME (current GPS): hour + year pillars.
        var _P = XKDGSolarTime.pillarsFromCivil(dp[0], dp[1], dp[2], tp[0] || 0, tp[1] || 0, 0, _lt.lonDeg, _lt.tzOffsetMin);
        hGan = H2P[_P.hour.charAt(0)] || _P.hour.charAt(0);
        hZhi = BR[_P.hour.charAt(1)] || _P.hour.charAt(1);
        yearStem = H2P[_P.year.charAt(0)] || null;
      } else {
        var lunar = S.fromYmdHms(dp[0], dp[1], dp[2], tp[0] || 0, tp[1] || 0, 0).getLunar();
        var ec = lunar.getEightChar();
        hGan = H2P[ec.getTimeGan()] || ec.getTimeGan();
        hZhi = BR[ec.getTimeZhi()] || ec.getTimeZhi();
        var yStemCN = (typeof lunar.getYearGanByLiChun === 'function') ? lunar.getYearGanByLiChun() : ec.getYearGan();
        yearStem = H2P[yStemCN] || null;
      }
      var r = window.QimenDirAnalysis.analyzeDirection({ Y: dp[0], M: dp[1], D: dp[2], hGan: hGan, hZhi: hZhi, direction: dir, yearStem: yearStem });
      if (!r) return { error: 'Could not compute the rotating chart for that date/hour.' };
      return {
        ok: true, date: date, time: time, direction: dir,
        start_palace: r.startPalace, start_ti: r.startTi, dest_palace: r.destPalace, dest_ti: r.destTi,
        start_palace_flow: r.flowAdvice.map(function (m) { return m.text; }),
        alerts: r.alerts.map(function (a) { return a.text; }),
        instructions: 'Present concisely: (1) the starting palace (' + r.startPalace + ') qi-flow advice — intention/emotion/remedy; ' +
          '(2) any alerts (stem clash/combination between start and destination; Tai Sui authority at destination). These are ' +
          'EXPANDED-VIEW details: include them when the user wants depth, otherwise keep the main answer light.'
      };
    } catch (e) { return { error: 'Direction analysis failed: ' + ((e && e.message) || e) }; }
  }

  function toolGetTripItinerary() {
    try {
      var r = (window.TravelPlanner && window.TravelPlanner.getLastResult)
        ? window.TravelPlanner.getLastResult() : (window._tpLastResult || null);
      if (!r || !r.legs) return { ok: false, note: 'No road trip has been planned yet in this session. Plan one first with plan_travel.' };
      var legs = r.legs.map(function (l, i) {
        if (l.kind === 'drive') {
          return { index: i + 1, kind: 'drive', from: l.from, to: l.to, hours: l.hours, toward: l.toward, arrival: !!l.arrival };
        }
        return { index: i + 1, kind: l.kind, time: l.at, place: l.place || null,
          stop_kind: l.stopKind || null, charger_power: l.stopPower || null,
          lat: l.lat, lon: l.lon, exit_quadrant: l.cashDir || null, limit_deg: l.limitDeg,
          then_toward: l.toward, duration_min: l.duration_min };
      });
      return {
        ok: true, origin: r.origin, dest: r.dest, direction: r.snapped,
        km: r.km, driving_time: r.driving_time,
        legs: legs,
        instructions: 'Answer the user about any specific stop or leg using "index" (it matches the numbered list in the ' +
          'itinerary card, so "punto 2"/"stop 2" = index 2). Each stop is snapped to a REAL stoppable place: "stop_kind" is ' +
          'charger (EV charging, with charger_power), services (motorway service area), rest_area, fuel (fuel station) or parking. ' +
          'Give its "place" name, "stop_kind", "lat","lon" and "time", and that it exits the "exit_quadrant" quadrant then heads ' +
          '"then_toward". If "place" is null the lookup is still running — give the coordinates and the quadrant. NEVER tell the ' +
          'user to scroll or read the card; answer directly.'
      };
    } catch (e) { return { error: 'Could not read the itinerary: ' + ((e && e.message) || e) }; }
  }

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
      expanded_view: (function () { try { return localStorage.getItem('xkdg_expanded_view') === '1'; } catch (e) { return false; } })(),
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
  function toolScanFlights(p) {
    p = p || {};
    if (typeof window.fsOpenDirectionCalc !== 'function') return { error: 'Flight scanner not available on this page.' };
    try { window.fsOpenDirectionCalc(); } catch (e) { return { error: 'Could not open the flight panel.' }; }
    function sv(id, v) { var e = document.getElementById(id); if (e && v != null && v !== '') e.value = String(v); }
    sv('dir-orig-addr', p.origin_name); sv('dir-orig-lat', p.origin_lat); sv('dir-orig-lng', p.origin_lon);
    sv('dir-dest-addr', p.dest_name);   sv('dir-dest-lat', p.dest_lat);   sv('dir-dest-lng', p.dest_lon);
    if (p.origin_iata) sv('dir-orig-iata', String(p.origin_iata).toUpperCase());
    if (p.dest_iata)   sv('dir-dest-iata', String(p.dest_iata).toUpperCase());
    sv('dir-flight-from', p.depart_from); sv('dir-flight-to', p.depart_to);
    sv('dir-return-from', p.return_from); sv('dir-return-to', p.return_to);
    var leg = (p.leg === 'return') ? 'return' : 'outbound';
    try {
      if (leg === 'return' && typeof window.fsDirectionScanReturn === 'function') window.fsDirectionScanReturn();
      else if (typeof window.fsDirectionScanFlights === 'function') window.fsDirectionScanFlights();
      else return { error: 'Flight scan function not available.' };
    } catch (e) { return { error: 'Flight scan failed to start.' }; }
    return { scanning: true, leg: leg,
      origin: p.origin_name || p.origin_iata || null, destination: p.dest_name || p.dest_iata || null,
      depart_from: p.depart_from || null, depart_to: p.depart_to || null,
      return_from: p.return_from || null, return_to: p.return_to || null,
      note: 'The flight scanner is running; favourable days appear on the calendar with takeoff badges. Results are shown in-app, not by you.' };
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
    if (!window.XKDGHouse) return { error: 'House profiles not available on this page.' };
    var r = window.XKDGHouse.list();
    if (!r.person) return { error: 'No person loaded. Ask the user to load Person A or B.' };
    return r;   // { person, active_index, count, houses:[{index,name,houseFacing,period,doors,aquariums,water_features,active}] }
  }

  // Full setup of one house, resolved by name — everything converges here:
  // facing/period, doors, aquariums (+ the water star at each), and the
  // saved Water/Bed/Desk settings.
  function toolGetHouseSetup(input) {
    input = input || {};
    if (!window.XKDGHouse) return { error: 'House profiles not available on this page.' };
    var q = (input.house_name || '').trim();
    var res = q ? window.XKDGHouse.resolveByName(q) : null;
    if (!res) return { error: q ? ('No house matching "' + input.house_name + '".') : 'Provide house_name.', available_houses: window.XKDGHouse.availableHouses() };
    var n = window.XKDGHouse.normalize(res.house);
    var floors = n.floors.map(function (f) {       // strip the heavy chart object; keep the extracted star values
      // AUTHORITATIVE flying-star chart for this floor. Prefer the floor's chart from
      // XKDGHouse.normalize (which already applies a hand-composed MANUAL chart when the
      // floor has one — exactly what the Feng Shui luopan shows); fall back to computing
      // from facing+period. Gives every palace's water/mountain star + the 入囚 flag.
      var fsChart = null;
      try {
        if (window.QFS && typeof QFS.chartToFlyingStars === 'function' && f.chart) {
          fsChart = QFS.chartToFlyingStars(f.chart);
          if (fsChart && fsChart.error) fsChart = null;
          if (fsChart) { fsChart.manual = !!f.manual_chart; fsChart.facing = f.facing; fsChart.period = f.period; }
        } else if (window.QFS && typeof QFS.computeChart === 'function' && f.facing != null && f.period != null) {
          fsChart = QFS.computeChart(f.facing, f.period);
          if (fsChart && fsChart.error) fsChart = null;
        }
      } catch (e) { fsChart = null; }
      var aquariums = (f.water_features || []).map(function (a) {
        var out = {}; for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
        // Fill the water star from the authoritative chart when missing/unknown.
        if ((out.water_star == null) && fsChart && fsChart.palaces && out.direction && fsChart.palaces[out.direction]) {
          out.water_star = fsChart.palaces[out.direction].water;
        }
        return out;
      });
      return {
        index: f.index, label: f.label, active: f.active,
        facing: f.facing, period: f.period,
        flying_stars: fsChart,                     // authoritative: all palaces + imprisoned + liberation
        doors: f.doors.map(function (d) { return { name: d.name, facing: d.facing, water: d.water }; }),
        aquariums: aquariums,                      // a saved Water position IS a water feature (source tags which)
        saved_settings: f.saved_settings
      };
    });
    return {
      house: n.name, person: res.person,
      address: (res.house && res.house.address) || null,
      same_facing_period: n.sameFacing,
      house_facing: res.house.houseFacing, house_period: res.house.period,
      active_floor: n.activeFloor,
      floors: floors,
      note: 'Multi-floor house: each floor has its own doors / aquariums / settings (and its own facing & period when same_facing_period is false). If the user names a floor, use that floor; otherwise use the active floor (active_floor). EACH FLOOR carries flying_stars: an AUTHORITATIVE chart computed from its facing+period (independent of any open page) — palaces{DIR:{water,mountain}}, center, and imprisoned/liberation. ALWAYS read star positions from flying_stars; NEVER guess or compute them yourself. If flying_stars.manual is true, it is a HAND-COMPOSED chart (overrides facing+period) - report it as a manual chart and use its numbers as-is. If flying_stars.imprisoned is true, follow flying_stars.imprisonment_note (free the centre water star at the liberation quadrant). To activate an aquarium: pick the floor, then call find_water_activation_full with direction = its direction, star_type = water, star_num = its water_star, AND pass facing_deg = floor.facing and period = floor.period so the scan uses THIS house\u2019s chart. The loaded person provides the XKDG scan. If flying_stars is null (facing/period not set), say so — do NOT invent stars. TRIP STARTING FROM THIS HOUSE: use the house `address` as the origin \u2014 pass it as origin_name (the planner geocodes it to real coordinates). If `address` is null, fall back to the saved GPS (omit origin_lat/lon so it defaults to the saved position) or from_current_position for a fresh fix. NEVER invent a city-centre proxy for the house.'
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
    try { results = ((typeof window.QMDJWaterScanner.scanWaterPurpose === 'function') ? window.QMDJWaterScanner.scanWaterPurpose(dir, start, days, 'water') : window.QMDJWaterScanner.scan(dir, start, days)); }
    catch (e) { return { error: 'QMDJ water scan failed: ' + ((e && e.message) || e) }; }
    return {
      scanner: 'qmdj_water', direction: dir, start: start, days: days, count: results.length,
      results: results.slice(0, 15).map(function (r) {
        var clk = solarBranchToClock(r.hourHan);
        return {
          date: r.date, weekday: r.weekday,
          hour: clk || r.hourTime, civil_hour: r.hourTime, ganzhi: r.hourHan,
          dun: r.dun, ju: r.ju, score: r.score,
          hits: (r.hits || []).map(function (h) { return { label: h.label, kind: h.cat }; })
        };
      }),
      time_note: 'hour = real local clock window (true solar time, DST-adjusted, same as BEST/LIST). civil_hour = textbook double-hour range, for reference only — do not show it.'
    };
  }

  // GUARANTEED double calculation for "turn on the water facing DIRECTION":
  // runs BOTH the QMDJ water-hour scan (Qimen sector) AND the XKDG person day
  // scan, then merges by date so every hour carries both scores + a combined.
  function toolFindWaterActivation(input) {
    input = input || {};
    if (!window.QMDJWaterScanner || typeof window.QMDJWaterScanner.scan !== 'function')
      return { error: 'The QMDJ water scanner is not available on this page.' };
    var dir = (input.direction || '').toUpperCase();
    var valid = (typeof window.QMDJWaterScanner.validDirections === 'function')
      ? window.QMDJWaterScanner.validDirections() : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    if (valid.indexOf(dir) < 0) return { error: 'direction must be one of: ' + valid.join(', ') + '.' };
    var days = parseInt(input.days, 10) || 7;
    var today = todayIso();
    var start = today;
    if (input.start_date && /^\d{4}-\d{2}-\d{2}$/.test(input.start_date) && input.start_date >= today) start = input.start_date;

    // (1) Qimen sector hours
    var qres;
    try { qres = (((typeof window.QMDJWaterScanner.scanWaterPurpose === 'function') ? window.QMDJWaterScanner.scanWaterPurpose(dir, start, days, 'water') : window.QMDJWaterScanner.scan(dir, start, days))) || []; }
    catch (e) { return { error: 'QMDJ water scan failed: ' + ((e && e.message) || e) }; }

    // (2) XKDG day quality for the loaded person (best score per date)
    var pl = personLoaded();
    var xkdgByDate = {}, xkdgRan = false;
    if (pl.any && typeof window.runScanner === 'function') {
      try {
        var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days'), ps = document.getElementById('purpose-select');
        if (ss) ss.value = start;
        if (sd) sd.value = String(days);
        if (ps) { ps.value = ''; if (typeof window.onPurposeChange === 'function') try { window.onPurposeChange(); } catch (e) {} }
        try { if (fsPalaceActive() && typeof window.fsClearDirectionFilter === 'function') window.fsClearDirectionFilter(); } catch (e) {}
        runScannerQuiet();
        (window._lastScanResults || []).forEach(function (r) {
          if (!r.isoDate) return;
          if (xkdgByDate[r.isoDate] == null || r.score > xkdgByDate[r.isoDate]) xkdgByDate[r.isoDate] = r.score;
        });
        xkdgRan = true;
      } catch (e) { xkdgRan = false; }
    }

    // (3) Merge by date — every hour gets BOTH scores + combined
    var merged = qres.map(function (r) {
      var xs = (xkdgByDate[r.date] != null) ? xkdgByDate[r.date] : null;
      var clk = solarBranchToClock(r.hourHan);
      return {
        date: r.date, weekday: r.weekday,
        hour: clk || r.hourTime, ganzhi: r.hourHan,
        qimen_score: r.score,
        xkdg_score: xs,
        xkdg_favourable: (xs != null && xs >= 1),
        combined_score: (r.score || 0) + (xs != null ? xs : 0),
        qimen_hits: (r.hits || []).map(function (h) { return h.label; })
      };
    });
    merged.sort(function (a, b) {
      if (b.combined_score !== a.combined_score) return b.combined_score - a.combined_score;
      return (b.qimen_score || 0) - (a.qimen_score || 0);
    });

    return {
      scanner: 'water_activation', direction: dir, start: start, days: days,
      person_loaded: pl.any ? (pl.a && pl.b ? 'A+B' : (pl.a ? 'A' : 'B')) : 'none',
      xkdg_considered: xkdgRan,
      count: merged.length,
      results: merged.slice(0, 15),
      note: pl.any
        ? 'Each hour carries BOTH scores: qimen_score (Qimen favourability of the water sector) and xkdg_score (the day\'s XKDG quality for the person; null = that day is not XKDG-favourable). combined_score = qimen_score + xkdg_score. ALWAYS report both scores and the combined; prefer high combined_score with xkdg_favourable=true, and state both sides explicitly.'
        : 'No person loaded, so only qimen_score is present (xkdg_score is null). Tell the user to load Person A or B so their XKDG birth-chart day quality is also factored.',
      time_note: 'hour = real local clock window (true solar time, DST-adjusted).'
    };
  }

  // UNIFIED scan: XKDG person hours + Qimen quadrant + Qimen special configurations
  // + the hour's own 4-pillar bond, merged by date+hour, graded into a Tier (see the
  // TIER block below) and ranked by tier -> XKDG score -> Qimen energy at the palace.
  var _BRANCHES_IDX = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];  // hourIndex 0..11
  function _branchOfHan(hourHan) {
    var chars = String(hourHan || '').replace(/[^\u4e00-\u9fff]/g, '');
    for (var i = chars.length - 1; i >= 0; i--) { if (_BRANCHES_IDX.indexOf(chars[i]) >= 0) return chars[i]; }
    return null;
  }
  function toolFindWaterActivationFull(input) {
    input = input || {};
    var days = parseInt(input.days, 10) || 7;
    var today = todayIso();
    var start = today;
    if (input.start_date && /^\d{4}-\d{2}-\d{2}$/.test(input.start_date) && input.start_date >= today) start = input.start_date;
    var dir = (input.direction || '').toUpperCase();
    var starType = (input.star_type || '').toLowerCase();
    var starNum = parseInt(input.star_num, 10);

    var map = {};   // 'date|branch' -> {date, branch, x, q, s, qhits, shits}
    function slot(date, branch) {
      var k = date + '|' + branch;
      if (!map[k]) map[k] = { date: date, branch: branch, x: null, xNayin: false, xWhy: null, blue: [], q: null, s: null, h: null, hlabel: null, qhits: [], shits: [] };
      return map[k];
    }
    var ran = { xkdg: false, quadrant: false, special: false, bond: false };
    var notes = [];
    var imprisonNote = null;

    // (1) XKDG positive hours for the loaded person
    var pl = personLoaded();
    if (pl.any && typeof window.runScanner === 'function') {
      try {
        var ss = document.getElementById('scan-start'), sd = document.getElementById('scan-days'), ps = document.getElementById('purpose-select');
        if (ss) ss.value = start;
        if (sd) sd.value = String(days);
        if (ps) { ps.value = ''; if (typeof window.onPurposeChange === 'function') try { window.onPurposeChange(); } catch (e) {} }
        try { if (fsPalaceActive() && typeof window.fsClearDirectionFilter === 'function') window.fsClearDirectionFilter(); } catch (e) {}
        runScannerQuiet();
        (window._lastScanResults || []).forEach(function (r) {
          if (!r.isoDate) return;
          var br = _BRANCHES_IDX[r.hourIndex]; if (!br) return;
          var sl = slot(r.isoDate, br);
          // Keep the person-connection flag alongside the score: an hour the person does
          // NOT connect to survives the scan only via a Nayin Power rescue, and that is
          // exactly what Tier 1 is made of. scoreA is 1 both when weakly connected and
          // when not connected at all, so the score alone can never separate the two.
          if (sl.x == null || r.score > sl.x) {
            sl.x = r.score;
            sl.xNayin = !!r.rescuedByNayin;
            sl.xWhy = r.rescuedByNayin ? (r.nayinLabel || 'Nayin Power') : ((r.blueLabels || [])[0] || null);
            sl.blue = r.blueLabels || sl.blue;
          }
        });
        ran.xkdg = true;
      } catch (e) { notes.push('XKDG scan failed.'); }
    } else if (!pl.any) { notes.push('No person loaded — XKDG hours skipped.'); }

    // (2) Qimen generic quadrant (sector)
    if (dir && window.QMDJWaterScanner && typeof window.QMDJWaterScanner.scan === 'function') {
      try {
        ((((typeof window.QMDJWaterScanner.scanWaterPurpose === 'function') ? window.QMDJWaterScanner.scanWaterPurpose(dir, start, days, 'water') : window.QMDJWaterScanner.scan(dir, start, days))) || []).forEach(function (r) {
          var br = _branchOfHan(r.hourHan); if (!br || !r.date) return;
          var sl = slot(r.date, br);
          if (sl.q == null || r.score > sl.q) sl.q = r.score;
          sl.qhits = (r.hits || []).map(function (h) { return h.label; });
        });
        ran.quadrant = true;
      } catch (e) { notes.push('Qimen quadrant scan failed.'); }
    } else if (!dir) { notes.push('No direction — Qimen quadrant skipped.'); }

    // (3) Qimen special configurations (QFS preset at the flying-star palace)
    if (window.QFS && typeof window.QFS.scanStarPreset === 'function' && (starType === 'water' || starType === 'mountain') && !isNaN(starNum)) {
      try {
        var _spOpts = { days: days, liberationDir: dir || null };
        var _fd = parseFloat(input.facing_deg), _pe = parseInt(input.period, 10);
        if (isFinite(_fd) && _pe >= 1 && _pe <= 9) { _spOpts.facingDeg = _fd; _spOpts.period = _pe; }
        var sres = window.QFS.scanStarPreset(starType, starNum, _spOpts);
        if (sres && sres.imprisoned && sres.imprisonment_note) imprisonNote = sres.imprisonment_note;
        if (sres && !sres.error && sres.results) {
          sres.results.forEach(function (r) {
            var br = _branchOfHan(r.hourHan); if (!br || !r.date) return;
            var sl = slot(r.date, br);
            if (sl.s == null || r.score > sl.s) sl.s = r.score;
            sl.shits = (r.hits || []).map(function (h) { return h.label || h; });
          });
          ran.special = true;
        } else if (sres && sres.error) {
          notes.push('Qimen special: ' + sres.error);
          if (sres.imprisonment_note) imprisonNote = sres.imprisonment_note;
        }
      } catch (e) { notes.push('Qimen special scan failed.'); }
    } else if (starType !== 'water' && starType !== 'mountain') { notes.push('No star target — Qimen special configurations skipped.'); }

    // (4) 时辰 4-pillar bond — the hour's OWN four pillars form a connected
    // communication network (Family/Inverse + one same-type/same-line number
    // mode). This is INTRINSIC to the hour, independent of the person: an hour
    // can be good even if it does not communicate with the loaded person (it
    // will rank low, but must be shown). Person-independent, so it always runs.
    if (typeof window.xkdgHourFourPillarBond === 'function') {
      try {
        for (var _di = 0; _di < days; _di++) {
          var _d = new Date(start + 'T12:00:00'); _d.setDate(_d.getDate() + _di);
          var _isoD = _d.getFullYear() + '-' + String(_d.getMonth() + 1).padStart(2, '0') + '-' + String(_d.getDate()).padStart(2, '0');
          for (var _bi = 0; _bi < _BRANCHES_IDX.length; _bi++) {
            var _brc = _BRANCHES_IDX[_bi];
            var _bond = window.xkdgHourFourPillarBond(_isoD, _brc);
            if (_bond && _bond.bond) {
              var _sl = slot(_isoD, _brc);
              _sl.h = 1;
              _sl.hlabel = '4-pillar bond (' + (_bond.mode || 'bond') + ')';
            }
          }
        }
        ran.bond = true;
      } catch (e) { notes.push('Hexagram 4-pillar bond scan failed.'); }
    }

    // ── TIER (canonical, Edu — session 22) ────────────────────────────────
    // Tier is a QUALITY GRADE, not a count of matched criteria. Connection with the
    // person's BIRTH YEAR always outranks: 4/3/2 are CONNECTED hours graded by their
    // XKDG score; Tier 1 is the best of the UNCONNECTED — either an XKDG structure
    // strong enough to stand without the person (it survives runScanner only via the
    // Nayin Power rescue) or a genuinely good Qimen at the palace. Everything below
    // those two floors leaves the pool entirely.
    // Cut-offs measured on real scans (session 22): 607 XKDG hours over 6 windows for
    // 18/12, and the post-veto pool at a single palace over 60 days for 16 / q>=3.
    var TIER4_MIN   = 18;   // connected, top grade      -> ~1 every 6 days at one palace
    var TIER3_MIN   = 12;   // connected, middle grade
    var T1_XKDG_MIN = 16;   // unconnected XKDG (Nayin Power rescue) worth keeping
    var T1_QIMEN_MIN = 3;   // "good Qimen" at the palace: 3 net positive hits, not 1
    function _tierOf(m) {
      if (m.x != null && !m.xNayin) return m.x >= TIER4_MIN ? 4 : (m.x >= TIER3_MIN ? 3 : 2);
      if (m.x != null && m.xNayin && m.x >= T1_XKDG_MIN) return 1;
      if (m.q != null && m.q >= T1_QIMEN_MIN) return 1;
      return 0;                                        // out of the pool
    }
    var rows = Object.keys(map).map(function (k) {
      var m = map[k];
      var tier = _tierOf(m);
      var connected = (m.x != null && !m.xNayin);
      var why = [];
      if (connected) why.push('XKDG ' + m.x + (m.xWhy ? ' (' + m.xWhy + ')' : '') + ' — connects to the person');
      else if (m.x != null && m.xNayin) why.push('XKDG ' + m.x + ' (' + (m.xWhy || 'Nayin Power') + ') — does NOT connect to the person');
      if (m.q != null) why.push('Qimen quadrant ' + m.q);
      if (m.s != null) why.push('Qimen special ' + m.s);
      if (m.hlabel) why.push(m.hlabel);
      var _hits = (m.qhits || []).concat(m.shits || []);
      if (m.hlabel) _hits = _hits.concat([m.hlabel]);
      return {
        date: m.date, branch: m.branch,
        hour: solarBranchToClock(m.branch) || m.branch,
        tier: tier,
        person_connected: connected,
        xkdg_score: m.x, xkdg_relation: m.xWhy,
        qimen_quadrant_score: m.q, qimen_special_score: m.s,
        hex_bond: m.h != null ? (m.hlabel || 'bond') : null,
        qimen_score: (m.q || 0) + (m.s || 0),                 // activation energy AT the palace (what you stimulate)
        why: why.join(' · '),
        hits: _hits,
        _blue: (m.blue || [])
      };
    });
    // How many hours were thrown away, and by WHICH of the two filters. Without this the
    // list just looks sparse and there is no way to tell a genuinely bad stretch from an
    // over-strict threshold (Edu, session 25: "vedo troppi buchi, sta scartando qualcosa").
    var _minTier = (input.min_tier != null) ? input.min_tier : 1;
    var _dropVeto = 0, _dropTier = 0, _kept = 0, _daysKept = {}, _daysVetoOnly = {};
    rows.forEach(function (r) {
      if (r.qimen_quadrant_score == null) { _dropVeto++; return; }          // no favourable door at the water palace
      if (r.tier < _minTier) { _dropTier++; if (r.date) _daysVetoOnly[r.date] = (_daysVetoOnly[r.date] || 0) + 1; return; }
      _kept++; if (r.date) _daysKept[r.date] = 1;
    });
    rows = rows.filter(function (r) { return r.tier >= _minTier; })
      .filter(function (r) { return r.qimen_quadrant_score != null; });   // WATER VETO: the water palace MUST pass the QMDJ gate (a favourable door: Open/Rest/Birth/View). Hours whose water sector has Death/Injury/no-favourable-door get qimen_quadrant_score = null and are dropped here, so a bad-formation hour is NEVER recommended, whatever its XKDG tier.
    var _filterReport = {
      hours_kept: _kept,
      dropped_no_favourable_door: _dropVeto,
      dropped_below_tier_floor: _dropTier,
      tier_floor: _minTier,
      days_with_an_hour: Object.keys(_daysKept).length,
      days_lost_only_to_the_tier_floor: Object.keys(_daysVetoOnly).filter(function (d) { return !_daysKept[d]; }).length
    };
    // ── BLOOD LINK PRIORITY (Edu, session 29) ───────────────────────────────
    // A Blood Link date is the strongest positive XKDG activation. In any MONTH
    // that contains a Blood Link date whose water palace is positive, Blood Link
    // dates take ABSOLUTE priority: door + San Qi (grade 2) first, door only
    // (grade 1) next, then non-Blood-Link dates fill the rest. "Any member"
    // counts — the loaded owner (from the scan's own Family relation) OR any house
    // guest whose birth-year hexagram shares a family with the day.
    var _guestYears = (typeof window.fsActiveHouseGuestYears === 'function') ? (window.fsActiveHouseGuestYears() || []) : [];
    var _dayGZCache = {};
    function _dayGZ(iso) {
      if (_dayGZCache[iso] !== undefined) return _dayGZCache[iso];
      var gz = null;
      try {
        if (typeof Solar !== 'undefined') {
          var pp = iso.split('-').map(Number);
          var ec = Solar.fromYmd(pp[0], pp[1], pp[2]).getLunar().getEightChar();
          gz = { gan: ec.getDayGan(), zhi: ec.getDayZhi() };
        }
      } catch (e) { gz = null; }
      _dayGZCache[iso] = gz; return gz;
    }
    function _shareFam(st, br, dg, dz) {
      try {
        if (typeof window.getJiaZiFamilies !== 'function') return false;
        var A = window.getJiaZiFamilies(st, br) || [], B = window.getJiaZiFamilies(dg, dz) || [];
        return A.some(function (f) { return f != null && B.indexOf(f) >= 0; });
      } catch (e) { return false; }
    }
    function _isSanQiLabel(l) { return /\u4e59|\u4e19|\u4e01|SanQi|San Qi/.test(String(l)); }
    var _blMonths = {};
    rows.forEach(function (r) {
      var ownerBL = (r._blue || []).some(function (l) { return /Family/.test(String(l)) && !/Two-Family/.test(String(l)); });
      var guestBL = false;
      if (!ownerBL && _guestYears.length) {
        var gz = _dayGZ(r.date);
        if (gz) guestBL = _guestYears.some(function (g) { return _shareFam(g.stem, g.branch, gz.gan, gz.zhi); });
      }
      r.blood_link = !!(ownerBL || guestBL);
      var _sanQi = (r.hits || []).some(_isSanQiLabel);
      r.blood_link_grade = r.blood_link ? (_sanQi ? 2 : 1) : 0;   // 2 = door + San Qi, 1 = favourable door only
      if (r.blood_link) { var mo = (r.date || '').slice(0, 7); if (mo) _blMonths[mo] = 1; }
      delete r._blue;
    });
    function _blRank(r) { return (_blMonths[(r.date || '').slice(0, 7)] && r.blood_link) ? r.blood_link_grade : 0; }

    // Ranking: the Tier still comes first — a structure that connects to the person always
    // outranks one that does not — but INSIDE a tier the order is now CHRONOLOGICAL
    // (Edu, session 25: "le date di accensione non sono in ordine cronologico, dovrebbero
    // esserlo"). This replaces the old xkdg_score/qimen_score order inside a tier; the
    // scores are still shown on every row, so nothing is lost, it just reads as a diary
    // instead of a league table. The branch order (Zi first) breaks same-date ties.
    var _BR_ORDER = '\u5b50\u4e11\u5bc5\u536f\u8fb0\u5df3\u5348\u672a\u7533\u9149\u620c\u4ea5';
    function _chrono(r) { return (r.date || '') + '#' + String(_BR_ORDER.indexOf(r.branch || '') + 1).padStart(2, '0'); }
    rows.sort(function (a, b) {
      var ra = _blRank(a), rb = _blRank(b);
      if (rb !== ra) return rb - ra;                 // Blood Link months: BL dates first (San Qi grade 2, then door-only grade 1)
      if (b.tier !== a.tier) return b.tier - a.tier;
      var ka = _chrono(a), kb = _chrono(b);
      return ka < kb ? -1 : (ka > kb ? 1 : 0);
    });

    // Which PURPOSES does each surviving hour also serve? Water is the means, not the
    // purpose, so an activation hour is worth more when it also opens a purpose's door.
    // Optional `purpose` narrows the list to hours that serve that one.
    var _wantPurpose = (input.purpose || '').toLowerCase();
    if (dir) {
      try {
        var _pmap = _purposesBySlot(dir, start, days);
        rows.forEach(function (r) {
          var ps = _pmap[r.date + '|' + r.branch];
          if (ps && ps.length) r.also_good_for = ps.map(function (p) { return { purpose: p, label: _purposeLabel(p) }; });
        });
        if (_wantPurpose) {
          if (_PURPOSE_KEYS.indexOf(_wantPurpose) < 0) notes.push('Unknown purpose "' + _wantPurpose + '" \u2014 ignored. Water is not a purpose, it is the means.');
          else rows = rows.filter(function (r) { return (_pmap[r.date + '|' + r.branch] || []).indexOf(_wantPurpose) >= 0; });
        }
      } catch (e) { notes.push('Purpose annotation failed.'); }
    }

    return {
      scanner: 'water_activation_full',
      chart: 'flying (\u98db\u76e4) \u2014 FS stimulators always use the flying chart, never the rotating chart',
      imprisonment: imprisonNote || undefined,
      direction: dir || null, star: ran.special ? (starType + ' ' + starNum) : null,
      start: start, days: days, scans_run: ran,
      person_loaded: pl.any ? (pl.a && pl.b ? 'A+B' : (pl.a ? 'A' : 'B')) : 'none',
      count: rows.length, results: (input && input.full ? rows : rows.slice(0, 20)), scan_notes: notes,
      filter_report: _filterReport,
      note: 'Quadruple scan merged by date+hour. TIER is a QUALITY GRADE, not a count. An hour that CONNECTS to the person\'s birth year always outranks one that does not: tier 4 = connected, XKDG score >= 18 (rare — roughly one every six days at a single palace); tier 3 = connected, 12-17; tier 2 = connected, below 12; tier 1 = NOT connected to the person but still good on its own — either an XKDG structure strong enough to stand alone (Nayin Power, score >= 16) or a genuinely good Qimen at the palace (quadrant score >= 3). Anything weaker is not in the list at all. Read person_connected and the why field to explain each hour. Tier 1 is normally the MOST COMMON tier, not an exception: a real connection to the person is rare, a good Qimen is not — so most days the water is activated on a tier 1 hour, and that is correct, not a fallback. PRESENT higher tiers first; INSIDE a tier the rows are already in CHRONOLOGICAL order — keep that order, never re-sort them by score. filter_report says how many hours were discarded and by which filter: if days_lost_only_to_the_tier_floor is high, the gaps in the list are the quality threshold at work, NOT bad days — say so plainly when the user asks why there are holes.',
      time_note: 'hour = real local clock window (true solar time, DST-adjusted).'
    };
  }

  // ── PURPOSE ACTIVATION, headless ────────────────────────────────────────
  //  Same engine as the app's ⚡ ACTIVATION panel, reached through the scanner's
  //  PUBLIC api (QMDJWaterScanner.scanWaterPurpose / .fsPurposeDoors) — the panel
  //  itself is DOM-bound and is deliberately not touched.
  //  Water is not a purpose but a MEANS: `water` is therefore never scanned here.
  var _PURPOSE_KEYS = ['health', 'career', 'wealth', 'relationship', 'journey', 'speak', 'legal'];
  function _purposeLabel(k) {
    try {
      var m = window.QMDJWaterScanner.fsPurposeDoors() || {};
      return (m[k] && m[k].label) || k;
    } catch (e) { return k; }
  }
  // date|branch -> [purpose keys] for a direction over a window. Used both by the tool
  // and to annotate the water-activation rows.
  function _purposesBySlot(dir, start, days) {
    var out = {};
    if (!(window.QMDJWaterScanner && typeof window.QMDJWaterScanner.scanWaterPurpose === 'function')) return out;
    _PURPOSE_KEYS.forEach(function (pk) {
      var res;
      try { res = window.QMDJWaterScanner.scanWaterPurpose(dir || '', start, days, pk) || []; } catch (e) { return; }
      res.forEach(function (r) {
        var br = _branchOfHan(r.hourHan); if (!br || !r.date) return;
        var k = r.date + '|' + br;
        if (!out[k]) out[k] = [];
        if (out[k].indexOf(pk) < 0) out[k].push(pk);
      });
    });
    return out;
  }
  function toolFindPurposeDirection(input) {
    input = input || {};
    if (!(window.QMDJWaterScanner && typeof window.QMDJWaterScanner.scanTravelPurpose === 'function'))
      return { error: 'QMDJ scanner not available on this page.' };
    var days = parseInt(input.days, 10) || 7;
    var today = todayIso();
    var start = today;
    if (input.start_date && /^\d{4}-\d{2}-\d{2}$/.test(input.start_date) && input.start_date >= today) start = input.start_date;
    var dir = (input.direction || '').toUpperCase();
    var only = (input.purpose || '').toLowerCase();
    if (only && _PURPOSE_KEYS.indexOf(only) < 0) return { error: 'Unknown purpose. Use one of: ' + _PURPOSE_KEYS.join(', ') + '.' };
    var keys = only ? [only] : _PURPOSE_KEYS;
    var map = {}, notes = [];
    keys.forEach(function (pk) {
      var res;
      try { res = window.QMDJWaterScanner.scanTravelPurpose(dir || '', start, days, pk) || []; }
      catch (e) { notes.push('Scan failed for ' + pk + '.'); return; }
      res.forEach(function (r) {
        var br = _branchOfHan(r.hourHan); if (!br || !r.date) return;
        var k = r.date + '|' + br + '|' + (r.dir || dir || '?');
        if (!map[k]) map[k] = { date: r.date, branch: br, hour: solarBranchToClock(br) || br,
                                dir: r.dir || dir || null, purposes: [], score: 0, hits: [] };
        var m = map[k];
        if (m.purposes.map(function (p) { return p.purpose; }).indexOf(pk) < 0)
          m.purposes.push({ purpose: pk, label: _purposeLabel(pk), door: r.purposeDoor || null, score: r.score || 0 });
        if ((r.score || 0) > m.score) { m.score = r.score || 0; m.hits = (r.hits || []).map(function (h) { return h.label || h; }); }
      });
    });
    var rows = Object.keys(map).map(function (k) { return map[k]; });
    rows.sort(function (a, b) {
      return (b.purposes.length - a.purposes.length) || (b.score - a.score)
          || (a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));
    });

    // Session 28 (Edu) - THE PAIRING IS BUILT HERE, IN CODE, NEVER BY THE MODEL.
    // Measured failure: asked for the Injury door on 1 Aug 2026 the model returned two
    // rows that were each internally plausible but had their DIRECTION and STEM PAIR
    // exchanged (hour Yin was given SE / Bing-Wu, which belong to hour Hai, and hour Hai
    // was given NW / Wu-Bing, which belong to hour Yin). The scanner was right both
    // times: every field existed, they were simply attached to the wrong hour. Sending
    // loose fields invites exactly that. Each row now carries ONE finished sentence with
    // hour, direction, door, stems and score already bound together, and the model is
    // told to reproduce it and nothing else - the same rule that already governs
    // itinerary prose.
    rows.forEach(function (m) {
      var ds = [];
      (m.purposes || []).forEach(function (p) {
        var lbl = (p.door && _ICS_DOOR[p.door]) || p.door || '';
        if (lbl && ds.indexOf(lbl) < 0) ds.push(lbl);
      });
      m.line = m.date
        + ' \u00b7 ' + (m.hour || '?')
        + ' \u00b7 ' + ((_ICS_PIN[m.branch] || '') + ' ' + m.branch).trim()
        + ' \u00b7 direction ' + (m.dir || '?')
        + (ds.length ? ' \u00b7 door ' + ds.join(' / ') : '')
        + ((m.hits && m.hits.length) ? ' \u00b7 ' + m.hits.join(' ') : '')
        + ' \u00b7 score ' + m.score;
    });

    return {
      scanner: 'purpose_direction',
      chart: 'rotating (\u8f49\u76e4)',
      direction: dir || 'all 8 directions', purpose: only || 'all seven',
      start: start, days: days, count: rows.length,
      results: (input && input.full ? rows : rows.slice(0, 20)),
      scan_notes: notes,
      pairing_rule: 'EACH ROW CARRIES A FINISHED SENTENCE IN `line`. Reproduce `line` AS IT IS, one row per line, and do '
        + 'NOT rebuild it from the separate fields. NEVER pair an hour with a direction, a door or a stem pair yourself, '
        + 'and never carry a value from one row over to another: direction, door and stems belong to the hour printed in '
        + 'the SAME `line` and to no other. You may translate the fixed words (direction, door, score) and add commentary '
        + 'around the list, but the values inside a line must stay bound together exactly as given.',
      note: 'Every hour here already passed the canonical QMDJ gate (\u00a71 exclusions + San Qi/Wu + a favourable door, travel ' +
        'mode) for that TRAVEL direction, on the ROTATING chart \u2014 this is about heading that way, not a fixed house palace. ' +
        '`purposes` lists which purposes that hour/direction serves and through which door. When the user asks for a single ' +
        'purpose (\"solo viaggi di lavoro questa settimana verso NW\"), pass purpose and direction together and use these ' +
        'hours directly as candidate departure windows \u2014 then hand the chosen one to plan_travel.'
    };
  }
  function toolFindPurposeActivation(input) {
    input = input || {};
    if (!(window.QMDJWaterScanner && typeof window.QMDJWaterScanner.scanWaterPurpose === 'function'))
      return { error: 'QMDJ scanner not available on this page.' };
    var days = parseInt(input.days, 10) || 7;
    var today = todayIso();
    var start = today;
    if (input.start_date && /^\d{4}-\d{2}-\d{2}$/.test(input.start_date) && input.start_date >= today) start = input.start_date;
    var dir = (input.direction || '').toUpperCase();
    var only = (input.purpose || '').toLowerCase();
    if (only && _PURPOSE_KEYS.indexOf(only) < 0) return { error: 'Unknown purpose. Use one of: ' + _PURPOSE_KEYS.join(', ') + '. Water is not a purpose \u2014 it is the means.' };
    var keys = only ? [only] : _PURPOSE_KEYS;
    var map = {}, notes = [];
    keys.forEach(function (pk) {
      var res;
      try { res = window.QMDJWaterScanner.scanWaterPurpose(dir || '', start, days, pk) || []; }
      catch (e) { notes.push('Scan failed for ' + pk + '.'); return; }
      res.forEach(function (r) {
        var br = _branchOfHan(r.hourHan); if (!br || !r.date) return;
        var k = r.date + '|' + br + '|' + (r.dir || dir || '?');
        if (!map[k]) map[k] = { date: r.date, branch: br, hour: solarBranchToClock(br) || br,
                                dir: r.dir || dir || null, purposes: [], score: 0, hits: [] };
        var m = map[k];
        if (m.purposes.map(function (p) { return p.purpose; }).indexOf(pk) < 0)
          m.purposes.push({ purpose: pk, label: _purposeLabel(pk), door: r.purposeDoor || null, score: r.score || 0 });
        if ((r.score || 0) > m.score) { m.score = r.score || 0; m.hits = (r.hits || []).map(function (h) { return h.label; }); }
      });
    });
    var rows = Object.keys(map).map(function (k) { return map[k]; });
    // A row that serves MORE purposes is more useful; then the stronger Qimen; then date.
    rows.sort(function (a, b) {
      return (b.purposes.length - a.purposes.length) || (b.score - a.score)
          || (a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));
    });
    return {
      scanner: 'purpose_activation',
      chart: 'flying (\u98db\u76e4)',
      direction: dir || 'all 8 palaces', purpose: only || 'all seven',
      start: start, days: days, count: rows.length,
      results: (input && input.full ? rows : rows.slice(0, 20)),
      scan_notes: notes,
      note: 'Every hour here already passed the canonical QMDJ gate (\u00a71 exclusions + San Qi/Wu + a favourable door) at that palace, on the FLYING chart. `purposes` lists which purposes that hour serves and through which door. Water is NOT a purpose: it is the means \u2014 so to say "this aquarium hour is ALSO good for Wealth", run the water plan first and use this to annotate it. When the user asks for a single purpose ("only Wealth this week"), pass purpose and use these hours directly.'
    };
  }

  // ── SHELLY AQUARIUM-LIGHT BRIDGE ────────────────────────────────────────
  //  Builds a plan of favourable ON hours for a house's aquarium and deposits
  //  it into the xkdg-shelly Worker (?set_plan&device=..). Plug = LIGHT only.
  //
  //  RULES (Edu, session 22 — these REPLACE every earlier aquarium rule):
  //   • ON at the START of the day's BEST hour (highest Tier; ties by XKDG then Qimen).
  //   • Window = 2nd-half-of-Zi (solar 00:00) .. end of SHEN (solar 17:00).
  //   • LATE hour (Xu/Hai): taken ONLY if its block runs past 23:00 of the same day
  //     — i.e. only if the extension below actually fires. Otherwise fall back to the
  //     day's best IN-WINDOW hour, accepting a lower Tier. No in-window hour -> the day
  //     stays dark (one hour of light before the 23:00 off is worth nothing).
  //   • EXTENSION: a Tier 4 day stays on until 23:00 of D+2, unless D+1 is Tier 3 or
  //     better (a strong day is never swallowed). A Tier 3 day stays on until 23:00 of
  //     D+1, unless D+1 is Tier 2 or better. Tier 2 and Tier 1 always switch off at
  //     23:00 of their own day.
  //   • NOTHING IS EVER ASKED. Only the final Procedi/Annulla before committing.
  //  Times use the HOUSE's True Solar Time; the OFF is 23:00 on the CIVIL clock.
  var SHELLY_HOUSES = {
    // house name (lower-case) -> { device, lon, utc }.  utc = standard offset (h); DST handled per date.
    'tuoro':  { device: 'tuoro',  lon: 12.1, utc: 1 },
    'vienna': { device: 'vienna', lon: 16.4, utc: 1 }
  };
  // Solar minute (from solar midnight) at which the light turns ON for each branch.
  // Zi uses its SECOND half (solar 00:00); the others use their normal solar start.
  // _WINDOW_BRANCHES marks the ALLOWED window: 2nd-half-Zi .. end of SHEN (solar 17:00).
  // Shen 申 is a normal in-window hour. _LATE_BRANCHES (Xu/Hai) are "late": switching
  // on at e.g. 21:00 only to switch off at 23:00 is a pointless blip, so a late hour is
  // taken ONLY when its block runs past 23:00 of the same day (see the rule below).
  var _BRANCH_SOLAR_MIN = { '\u5b50': 0, '\u4e11': 60, '\u5bc5': 180, '\u536f': 300, '\u8fb0': 420, '\u5df3': 540, '\u5348': 660, '\u672a': 780, '\u7533': 900, '\u9149': 1020, '\u620c': 1140, '\u4ea5': 1260 };
  // Hours whose block is worth switching on for. You 酉 moved in here (Edu, session 25):
  // it starts around 17:54 in true solar time and the light goes off at 23:00, so it gives
  // over five hours — not the two-hour blip the late rule was written to avoid. Xu 戌 and
  // Hai 亥 stay "late": they are taken only when the block outlives 23:00 anyway.
  var _WINDOW_BRANCHES = { '\u5b50': 1, '\u4e11': 1, '\u5bc5': 1, '\u536f': 1, '\u8fb0': 1, '\u5df3': 1, '\u5348': 1, '\u672a': 1, '\u7533': 1, '\u9149': 1 };
  var _LATE_BRANCHES   = { '\u620c': 1, '\u4ea5': 1 };
  // How far a strong block may stretch over consecutive empty days (extra days after its
  // own). Edu, session 25: a really strong structure is switched on and left on while the
  // following days have nothing. These are CEILINGS, not defaults — the block only runs as
  // far as the holes actually go. Weaker tiers still cover a single empty day (see _spanOf).
  var TIER4_MAX_STRETCH = 5;
  var TIER3_MAX_STRETCH = 3;

  function _shellyCfg() {
    try { var c = JSON.parse(localStorage.getItem('xkdg_shelly_cfg') || '{}'); return (c && c.url && c.token) ? c : null; }
    catch (e) { return null; }
  }
  function _dateParts(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null; }
  function _isoPlus(iso, n) {
    var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Absolute epoch ms for a SOLAR time (minutes from solar midnight) on `iso` at (lon,utc).
  function _solarToEpoch(iso, solarMin, lon, utc) {
    var p = _dateParts(iso); if (!p) return NaN;
    var dst = false; try { dst = dstActiveOn(new Date(iso + 'T12:00:00')); } catch (e) {}
    var offsetMin = (lon - utc * 15) * 4 - (dst ? 60 : 0);          // solar = clock + offsetMin
    var civilClockMin = solarMin - offsetMin;                       // wall-clock minutes past civil midnight
    var base = Date.UTC(p.y, p.mo - 1, p.d, 0, 0, 0) - (utc + (dst ? 1 : 0)) * 3600000;
    return base + Math.round(civilClockMin * 60000);
  }
  // Absolute epoch ms for a CIVIL wall-clock time (minutes past midnight) on `iso` at utc.
  function _civilToEpoch(iso, clockMin, utc) {
    var p = _dateParts(iso); if (!p) return NaN;
    var dst = false; try { dst = dstActiveOn(new Date(iso + 'T12:00:00')); } catch (e) {}
    var base = Date.UTC(p.y, p.mo - 1, p.d, 0, 0, 0) - (utc + (dst ? 1 : 0)) * 3600000;
    return base + clockMin * 60000;
  }
  // Inverse of _civilToEpoch: absolute epoch ms -> the house's own wall clock.
  // The Worker stores onTs/offTs in UTC ms; the assistant must NEVER convert them by hand.
  function _epochToLocal(ts, utc) {
    ts = +ts;
    if (!isFinite(ts)) return null;
    var dst = false; try { dst = dstActiveOn(new Date(ts)); } catch (e) {}
    var d = new Date(ts + (utc + (dst ? 1 : 0)) * 3600000);
    function p2(n) { return String(n).padStart(2, '0'); }
    return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) +
           ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes());
  }

  function _resolveShellyHouse(nameOrDevice) {
    var key = String(nameOrDevice || '').trim().toLowerCase();
    if (SHELLY_HOUSES[key]) return { name: key, cfg: SHELLY_HOUSES[key] };
    for (var k in SHELLY_HOUSES) if (SHELLY_HOUSES[k].device === key) return { name: k, cfg: SHELLY_HOUSES[k] };
    return null;
  }

  function toolConfigureShelly(input) {
    input = input || {};
    var url = String(input.url || '').trim().replace(/\/+$/, '');
    var token = String(input.token || '').trim();
    if (!/^https?:\/\//.test(url) || !token) return { error: 'Provide the Worker url (https://...) and the token.' };
    try { localStorage.setItem('xkdg_shelly_cfg', JSON.stringify({ url: url, token: token })); }
    catch (e) { return { error: 'Could not save the Shelly config.' }; }
    return { ok: true, url: url, token: '(saved)' };
  }

  async function toolAquariumLight(input) {
    input = input || {};
    var cfg = _shellyCfg();
    if (!cfg) return { error: 'Shelly not configured. Call configure_shelly with the Worker url + token first.' };
    var rh = _resolveShellyHouse(input.house || input.device);
    if (!rh) return { error: 'Unknown house/device. Use "tuoro" or "vienna".' };
    var turn = String(input.turn || 'status').toLowerCase();
    if (['on', 'off', 'status'].indexOf(turn) < 0) return { error: 'turn must be on, off or status.' };
    try {
      var res = await fetch(cfg.url + '?turn=' + turn + '&device=' + rh.cfg.device + '&token=' + encodeURIComponent(cfg.token), { method: 'POST' });
      var data = await res.json().catch(function () { return null; });
      var out = { device: rh.cfg.device, turn: turn, http: res.status, result: data };
      // The Worker's status now carries the verified relay state and any missed switches.
      if (data && data.relay_on != null) out.light_is_on = !!data.relay_on;
      var _al = _shellyAlerts(data, rh.cfg.utc);
      if (_al) { out.alerts = _al.list; out.alerts_count = _al.count; out.alerts_rule = _ALERTS_RULE; }
      return out;
    } catch (e) { return { error: 'Shelly request failed: ' + ((e && e.message) || e) }; }
  }

  // Read / cancel / pause the plan ACTUALLY stored in the Shelly Worker. Session 26: asked
  // whether the aquariums switch off at 23:00, the assistant had no way to look — aquarium_light
  // only reports the plug right now, program_aquarium_light only computes a plan without
  // reading the deposited one. The Worker's ?get_plan / ?clear_plan / ?auto were unreachable.
  // Session 28 (Edu) — MISSED SWITCH-ONS. The Worker (v5) retries a scheduled switch
  // until the plug is verified in the wanted state, and writes down the ones it never
  // managed. Those must reach the user without being asked for: the light failing to
  // come on was being discovered by chance, days later.
  function _shellyAlerts(data, utc) {
    var raw = (data && Array.isArray(data.alerts)) ? data.alerts : [];
    if (!raw.length) return null;
    return {
      count: (data.alerts_total != null) ? data.alerts_total : raw.length,
      list: raw.map(function (a) {
        return (a.turn === 'on' ? 'switch-ON' : 'switch-OFF') + ' scheduled for '
             + _epochToLocal(a.scheduledTs, utc) + ' NEVER HAPPENED after '
             + (a.attempts || 1) + ' attempts \u2014 ' + (a.reason || 'unknown reason');
      })
    };
  }
  var _ALERTS_RULE = 'THERE ARE MISSED SWITCH-ONS/OFFS in `alerts`. Report them FIRST, before anything '
    + 'else, reproducing each line as given. They mean the aquarium light did not come on (or off) at '
    + 'the auspicious hour despite the Worker retrying. Tell the user they can clear the list once seen.';

  async function toolAquariumPlan(input) {
    input = input || {};
    var cfg = _shellyCfg();
    if (!cfg) return { error: 'Shelly not configured. Call configure_shelly with the Worker url + token first.' };
    var rh = _resolveShellyHouse(input.house || input.device);
    if (!rh) return { error: 'Provide house = "tuoro" or "vienna".' };
    var action = String(input.action || 'get').toLowerCase();
    var q = { get: '?get_plan', cancel: '?clear_plan', pause: '?auto=off', resume: '?auto=on',
              clear_alerts: '?clear_alerts' }[action];
    if (!q) return { error: 'action must be get, cancel, pause, resume or clear_alerts.' };
    try {
      var res = await fetch(cfg.url + q + '&device=' + rh.cfg.device + '&token=' + encodeURIComponent(cfg.token),
        { method: 'POST' });
      var data = await res.json().catch(function () { return null; });
      if (!res.ok) return { error: 'Shelly Worker returned HTTP ' + res.status, result: data };
      var out = { house: rh.name, device: rh.cfg.device, action: action };
      if (data && data.automation) out.automation = data.automation;
      if (action !== 'get') {
        out.ok = true;
        out.note = (action === 'clear_alerts')
          ? 'The list of missed switch-ons has been emptied.'
          : (action === 'cancel')
          ? 'The stored plan is now EMPTY: the light will not switch on or off by itself until a new plan is deposited. Manual on/off still works.'
          : (action === 'pause'
            ? 'Automation PAUSED: the plan is still stored but nothing will fire until it is resumed. Manual on/off still works.'
            : 'Automation RESUMED: the stored plan fires again.');
        return out;
      }
      var days = (data && data.plan && Array.isArray(data.plan.days)) ? data.plan.days : [];
      var now = Date.now(), next = null;
      out.scheduled_days = days.length;
      out.days = days.map(function (d) {
        [{ ts: +d.onTs, turn: 'on' }, { ts: +d.offTs, turn: 'off' }].forEach(function (c) {
          if (isFinite(c.ts) && c.ts > now && (!next || c.ts < next.ts)) next = c;
        });
        return { date: d.date,
                 on_local: _epochToLocal(d.onTs, rh.cfg.utc),
                 off_local: _epochToLocal(d.offTs, rh.cfg.utc),
                 already_past: (+d.offTs < now) };
      });
      out.next_switch = next ? { turn: next.turn, at_local: _epochToLocal(next.ts, rh.cfg.utc) } : null;
      out.deposited_at = (data && data.plan && data.plan.savedAt) ? _epochToLocal(data.plan.savedAt, rh.cfg.utc) : null;
      out.last_switch = (data && data.lastFire)
        ? { turn: data.lastFire.turn, at_local: _epochToLocal(data.lastFire.ts, rh.cfg.utc), ok: !!data.lastFire.ok }
        : null;
      var _al = _shellyAlerts(data, rh.cfg.utc);
      if (_al) { out.alerts = _al.list; out.alerts_count = _al.count; out.alerts_rule = _ALERTS_RULE; }
      out.note = 'This is the plan REALLY stored in the Worker, not a recomputation. All times are the house\u2019s own '
        + 'wall clock \u2014 report them exactly as given, never convert them. If scheduled_days is 0 there is no plan at '
        + 'all. If automation is PAUSED nothing will fire even though days are listed \u2014 say so.';
      return out;
    } catch (e) { return { error: 'Shelly request failed: ' + ((e && e.message) || e) }; }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ALEXA DIGEST (piece 2 of 3) — the app deposits a 7-day summary of the two
  // MANUAL sectors into the Shelly Worker (?set_digest, KV key `digest`, one per
  // account, independent of the device). The skill reads it back with ?get_digest.
  //
  // The two sources are EXACTLY the ones the .ics export uses — toolFindGoodDates
  // for the person's XKDG hours and scanTravelPurpose for the directions — so
  // Alexa and the calendar can never disagree about the same hour. Thresholds are
  // the calendar's own: XKDG score >= 15 with a real XKDG relation, direction
  // score >= 10 (the method's natural cut: nothing exists between 3 and 10).
  // Night hours Zi/Chou/Yin are dropped: both sectors need the user to be there.
  //
  // The clock time is derived the same way the .ics derives an event start — the
  // START of the Chinese hour in the person's true solar time, converted to the
  // wall clock — so a time spoken by Alexa matches the calendar entry minute for
  // minute.
  //
  // Edu, session 28: the summary follows the MANUALLY loaded person. Nothing here
  // loads or switches a person; if none is loaded there are no XKDG hours and the
  // digest carries the directions alone (they do not depend on a person).
  // The purpose is GENERIC unless one is asked for, and its key stays ENGLISH
  // (health/career/wealth/relationship/journey/speak/legal) all the way to Alexa's
  // voice — the skill speaks the English word, it does not translate it.
  // ══════════════════════════════════════════════════════════════════════════════
  var DIGEST_XKDG_MIN = 15;    // same as the .ics default xkdg_min_score
  var DIGEST_DIR_MIN  = 10;    // same as the .ics default direction_min_score
  var DIGEST_DAYS     = 7;     // the aquarium plan's own window
  var DIGEST_MAX_ROWS = 60;    // keep the KV body small: the best N of each sector
  var _DIGEST_PURPOSES = { health: 1, career: 1, wealth: 1, relationship: 1,
                           journey: 1, speak: 1, legal: 1 };

  function _digestLonUtc() {
    var lon = 12.49, utc = 1;
    try { var lEl = document.getElementById('longitude'); if (lEl && isFinite(parseFloat(lEl.value))) lon = parseFloat(lEl.value); } catch (e) {}
    try { var uEl = document.getElementById('utc-offset'); if (uEl && isFinite(parseFloat(uEl.value))) utc = parseFloat(uEl.value); } catch (e) {}
    return { lon: lon, utc: utc };
  }
  // Wall-clock HH:MM of the START of a Chinese hour, identical to the .ics event start.
  function _digestClock(iso, branch, lon, utc) {
    var sm = _BRANCH_SOLAR_MIN[branch];
    if (sm == null) return null;
    var ts = _solarToEpoch(iso, sm, lon, utc);
    if (!isFinite(ts)) return null;
    var s = _epochToLocal(ts, utc);
    return s ? s.slice(11) : null;
  }
  // Chronological order, but when a sector overflows DIGEST_MAX_ROWS keep the
  // strongest rows and put those back in chronological order.
  function _digestTrim(list) {
    var out = list;
    if (out.length > DIGEST_MAX_ROWS) {
      out = out.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); }).slice(0, DIGEST_MAX_ROWS);
    }
    return out.sort(function (a, b) {
      return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (a.hour < b.hour ? -1 : a.hour > b.hour ? 1 : 0);
    });
  }

  // Edu, session 28 (option 3): when two people are loaded the scan MIXES both, so the
  // summary carries BOTH names instead of silently attributing every hour to Person A.
  // The hours themselves are not labelled per person - that was option 2, not chosen.
  function _digestPersonNames() {
    var pl = { a: false, b: false };
    try { pl = personLoaded(); } catch (e) {}
    function nm(id) {
      try { var el = document.getElementById(id); return (el && el.value) ? String(el.value).trim() : ''; }
      catch (e) { return ''; }
    }
    var out = [];
    if (pl.a) out.push(nm('person-name') || 'Person A');
    if (pl.b) out.push(nm('person-name-b') || 'Person B');
    return { list: out, label: out.length ? out.join(' + ') : null };
  }

  // Builds the digest body. Returns { body, report } or { error }.
  function _buildAlexaDigest(input) {
    input = input || {};
    var days = parseInt(input.days, 10) || DIGEST_DAYS;
    var today = todayIso();
    var start = today;
    if (input.start_date && /^\d{4}-\d{2}-\d{2}$/.test(input.start_date) && input.start_date >= today) start = input.start_date;
    var purpose = String(input.purpose || '').toLowerCase();
    if (purpose && !_DIGEST_PURPOSES[purpose])
      return { error: 'Unknown purpose "' + purpose + '". Use one of: health, career, wealth, relationship, journey, speak, legal — or omit it for a generic summary.' };
    var lu = _digestLonUtc();
    var persons = _digestPersonNames();
    var report = {};

    // (1) XKDG hours of the loaded person. toolFindGoodDates runs the scan itself and
    //     writes its rows to window._lastScanResults, so no manual scan is required;
    //     it returns an error only when NO person is loaded, and that is the one case
    //     where this sector is legitimately empty.
    var hours = [];
    try {
      var gd = toolFindGoodDates({ days: days, start_date: start, purpose: purpose || undefined });
      if (gd && gd.error) {
        report.xkdg = { skipped: gd.error, no_person: true };
      } else {
        var raw = (window._lastScanResults || []).filter(function (r) { return r.isoDate && r.hourIndex != null; });
        var belowMin = 0, noRelation = 0, nightDropped = 0;
        raw.forEach(function (r) {
          var sc = r.score || 0;
          if (sc < DIGEST_XKDG_MIN) { belowMin++; return; }
          var cls = _icsXkdgClass(r.blueLabels);
          if (!cls) { noRelation++; return; }
          var br = _ICS_BRANCHES[r.hourIndex];
          if (_ICS_NIGHT[br]) { nightDropped++; return; }
          var hh = _digestClock(r.isoDate, br, lu.lon, lu.utc);
          if (!hh) return;
          hours.push({ date: r.isoDate, hour: hh, hour_name: _ICS_PIN[br] || br, score: sc, kind: cls });
        });
        hours = _digestTrim(hours);
        report.xkdg = { rows_scanned: raw.length, kept: hours.length, min_score: DIGEST_XKDG_MIN,
                        dropped_below_min: belowMin, dropped_no_relation: noRelation, dropped_night: nightDropped };
      }
    } catch (eX) { report.xkdg = { error: String((eX && eX.message) || eX) }; }

    // (2) Directions — no person involved, so this sector stands even with nobody loaded.
    var directions = [];
    try {
      var dr = (window.QMDJWaterScanner && window.QMDJWaterScanner.scanTravelPurpose)
        ? (window.QMDJWaterScanner.scanTravelPurpose('', start, days, purpose || null) || []) : [];
      var dBelow = 0, dNight = 0;
      dr.forEach(function (r) {
        var sc = r.score || 0;
        if (sc < DIGEST_DIR_MIN) { dBelow++; return; }
        var br = _branchOfHan(r.hourHan); if (!br) return;
        if (_ICS_NIGHT[br]) { dNight++; return; }
        var hh = _digestClock(r.date, br, lu.lon, lu.utc);
        if (!hh) return;
        directions.push({ date: r.date, hour: hh, hour_name: _ICS_PIN[br] || br,
                          dir: r.dir, door: _icsDoorLabel(r.cell) || null, score: sc });
      });
      directions = _digestTrim(directions);
      report.directions = { rows_scanned: dr.length, kept: directions.length, min_score: DIGEST_DIR_MIN,
                            dropped_below_min: dBelow, dropped_night: dNight };
    } catch (eD) { report.directions = { error: String((eD && eD.message) || eD) }; }

    return {
      body: {
        from: start, days: days,
        person: persons.label,
        purpose: purpose || null,
        xkdg_min: DIGEST_XKDG_MIN, direction_min: DIGEST_DIR_MIN,
        hours: hours, directions: directions
      },
      report: report
    };
  }

  // Sends a built digest to the Worker. Never throws: the caller reports what came back.
  async function _depositAlexaDigest(built) {
    if (!built || built.error) return { deposited: false, error: (built && built.error) || 'The digest could not be built.' };
    var b = built.body;
    var noPerson = !!(built.report && built.report.xkdg && built.report.xkdg.no_person);
    var out = { from: b.from, days: b.days, person: b.person, purpose: b.purpose || '(generic)',
                hours: b.hours.length, directions: b.directions.length,
                no_person: noPerson || undefined, report: built.report };
    var cfg = _shellyCfg();
    if (!cfg) { out.deposited = false; out.error = 'Shelly Worker not configured — call configure_shelly with url + token first.'; return out; }
    if (!b.hours.length && !b.directions.length) {
      out.deposited = false; out.empty = true;
      out.error = 'Nothing reached the thresholds over ' + b.days + ' days, so nothing was deposited (the old summary is left as it was).';
      return out;
    }
    try {
      var res = await fetch(cfg.url + '?set_digest&token=' + encodeURIComponent(cfg.token),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
      out.worker = await res.json().catch(function () { return null; });
      out.deposited = !!res.ok;
      if (!res.ok) out.error = 'HTTP ' + res.status;
    } catch (e) { out.deposited = false; out.error = 'Digest request failed: ' + ((e && e.message) || e); }
    return out;
  }

  async function toolRefreshAlexaDigest(input) {
    input = input || {};
    var dep = await _depositAlexaDigest(_buildAlexaDigest(input));
    dep.scanner = 'alexa_digest';
    dep.note = 'This is the summary Alexa reads. Tell the user plainly: how many lucky hours and how many '
      + 'directions were deposited, the window (from + days), and WHICH PERSON they belong to - when two people '
      + 'are loaded the field carries BOTH names joined by " + " because the scan mixes both, and the hours are NOT '
      + 'split per person: say the summary covers both, do not attribute an hour to one of them. '
      + (dep.no_person
          ? 'NO PERSON IS LOADED, so the summary carries the DIRECTIONS ONLY and has no XKDG hours — SAY THIS '
          + 'EXPLICITLY and tell the user to load Person A or B and ask again if they want the hours too. '
          : '')
      + (dep.purpose === '(generic)'
          ? 'The summary is GENERIC (no purpose). '
          : 'The summary is restricted to the purpose "' + dep.purpose + '"; keep the purpose name in ENGLISH — Alexa says it in English too. ')
      + 'The summary lives for ' + dep.days + ' days: after that Alexa will say it is stale and to open the app.';
    return dep;
  }

  async function toolProgramAquariumLight(input) {
    input = input || {};
    var cfg = _shellyCfg();
    if (!cfg) return { error: 'Shelly not configured. Call configure_shelly with the Worker url + token first.' };
    var rh = _resolveShellyHouse(input.house);
    if (!rh) return { error: 'Provide house = "tuoro" or "vienna".' };
    var days = parseInt(input.days, 10) || 7;
    var commit = (input.commit === true);
    // Water is the MEANS, not the purpose: an optional purpose narrows the plan to hours
    // that also open that purpose's Qimen door ("program only Wealth activations").
    var wantPurpose = (input.purpose || '').toLowerCase();

    // 1) make the house active (loads its occupants) and read its single aquarium.
    //
    // Session 28 (Edu) - A PERSON LOADED BY HAND ALWAYS WINS. The house loads its own
    // occupants ONLY when nobody is loaded at all. That gap is what this repairs: the
    // old line called fsSetActiveHouse(rb.person.name, ...), but resolveByName returns
    // the person NAME as a plain string, so `.name` was undefined, the call did nothing,
    // and the failure was swallowed by the catch. Nobody ever saw an error - the scan
    // simply ran with whatever was loaded, or with no person at all.
    // Activating a house loads occupant #1 into Person A and occupant #2 into Person B
    // (fsSetActiveHouse -> fsLoadHouse -> _fsLoadHouseOccupants), so one call is enough.
    var personAutoLoaded = false;
    try {
      var _plBefore = personLoaded();
      if (!_plBefore.any && window.XKDGHouse && typeof window.XKDGHouse.resolveByName === 'function') {
        var rb = window.XKDGHouse.resolveByName(rh.name);
        if (rb && rb.person && typeof window.fsSetActiveHouse === 'function') {
          window.fsSetActiveHouse(rb.person, rb.index);
          personAutoLoaded = personLoaded().any;
        }
      }
    } catch (e) {}
    var setup = toolGetHouseSetup({ house_name: rh.name });
    if (!setup || setup.error) return { error: 'Could not read house "' + rh.name + '": ' + ((setup && setup.error) || 'not found') };
    var floor = (setup.floors || []).filter(function (f) { return f.active; })[0] || (setup.floors || [])[0];
    if (!floor) return { error: 'House "' + rh.name + '" has no floor.' };
    var aq = (floor.aquariums || [])[0];
    if (!aq || !aq.direction) return { error: 'House "' + rh.name + '" has no saved aquarium.' };
    if (aq.water_star == null) return { error: 'Aquarium water star unknown for "' + rh.name + '" (set the chart first).' };

    // 2) unified scan for this aquarium over the next `days` days (full = all rows, not just top 20)
    var start = todayIso();
    var scan = toolFindWaterActivationFull({
      direction: aq.direction, star_type: 'water', star_num: aq.water_star,
      facing_deg: floor.facing, period: floor.period, start_date: start, days: days, full: true,
      purpose: wantPurpose || undefined
    });
    var rows = (scan && scan.results) || [];

    // ── VETO (absolute): the aquarium sector's Qimen formation must be favourable ──
    //  qimen_quadrant_score is set ONLY for hours whose formation at the aquarium
    //  direction passed the canonical QMDJ gate (formationFlags + directionGate).
    //  Negative palace formations \u2014 e.g. Commander (\u503c\u7b26) over Geng (\u5e9a) \u2014 are gated out and
    //  therefore have no quadrant score. We drop them here so a high tier from OTHER
    //  criteria (XKDG, hexagram\u2026) can NEVER schedule an hour with a negative water sector.
    rows = rows.filter(function (r) { return r.qimen_quadrant_score != null; });

    // 3) best hour per date. First choice = the MAX-tier hour (ties by XKDG score, then
    // Qimen). We also keep the best IN-WINDOW hour separately: a late first choice falls
    // back to it when its block would not run past 23:00.
    var byDate = {};
    rows.forEach(function (r) { if (!r.date) return; (byDate[r.date] = byDate[r.date] || []).push(r); });
    function _cmpHour(a, b) {
      return (b.blood_link_grade || 0) - (a.blood_link_grade || 0)   // Blood Link (San Qi first) wins the day's hour
          || (b.tier || 0) - (a.tier || 0)
          || (b.xkdg_score || 0) - (a.xkdg_score || 0)
          || (b.qimen_score || 0) - (a.qimen_score || 0);
    }
    var bestByDate = {}, bestInWindowByDate = {}, altByDate = {}, youByDate = {};
    Object.keys(byDate).forEach(function (d) {
      var list = byDate[d].slice().sort(_cmpHour);
      // You 酉 is the LAST RESORT only when it is WEAK (Edu, session 25). A late hour that
      // is Tier 4 or Tier 3 follows the usual rule: it anchors its day like any other and
      // can open a stretch over the empty days that follow — a structure that strong is not
      // demoted for being late. Below that, 酉 steps aside and is picked up at the very end
      // of the ladder, after the tier 0 reserve: that is the case Edu meant, an empty day
      // followed by tier 2, 1 or 0.
      var early = list.filter(function (r) { return r.branch !== '\u9149' || r.tier >= 3; });
      bestByDate[d] = early[0];
      if (!early[0]) delete bestByDate[d];
      youByDate[d] = list.filter(function (r) { return r.branch === '\u9149' && r.tier < 3; })[0] || null;
      bestInWindowByDate[d] = early.filter(function (r) { return !!_WINDOW_BRANCHES[r.branch]; })[0] || youByDate[d] || null;
      var topTier = early.length ? early[0].tier : null;
      altByDate[d] = topTier == null ? [] : early.slice(1).filter(function (r) { return r.tier === topTier; })
        .map(function (r) { return { branch: r.branch, hour: r.hour, tier: r.tier, xkdg_score: r.xkdg_score, qimen_score: r.qimen_score }; });
    });

    // TIER 0 RESERVE (Edu, session 25). A day with no tier>=1 hour is not necessarily a
    // day with nothing: toolFindWaterActivationFull drops tier 0 upstream. A tier 0 hour
    // HAS passed the absolute QMDJ water veto — favourable door at the aquarium sector,
    // no negative formation — it simply misses the quality floor (not connected to the
    // person, XKDG below 16, Qimen quadrant below 3). That is the "less lucky but still
    // valid" switch-on. Fetched once and used ONLY for a second consecutive empty day.
    var reserveByDate = {};
    try {
      var scan0 = toolFindWaterActivationFull({
        direction: aq.direction, star_type: 'water', star_num: aq.water_star,
        facing_deg: floor.facing, period: floor.period, start_date: start, days: days, full: true,
        purpose: wantPurpose || undefined, min_tier: 0
      });
      ((scan0 && scan0.results) || [])
        .filter(function (r) { return r.qimen_quadrant_score != null && !r.tier && r.date && _WINDOW_BRANCHES[r.branch]; })
        .forEach(function (r) {
          var cur = reserveByDate[r.date];
          if (!cur || (r.qimen_score || 0) > (cur.qimen_score || 0) || (r.xkdg_score || 0) > (cur.xkdg_score || 0)) reserveByDate[r.date] = r;
        });
    } catch (eRes) {}
    function _tierOn(iso) { var b = bestByDate[iso]; return b ? (b.tier || 0) : 0; }
    // How far a block starting on `iso` with tier `t` runs, in whole days (0 = same day).
    // Tier 4 -> +2 days unless the next day is Tier 3 or better.
    // Tier 3 -> +1 day  unless the next day is Tier 2 or better.
    // A stronger day is never swallowed by a weaker one's block.
    // COVER THE HOLE (Edu, session 25): whatever its tier, a block is extended by one day
    // when the NEXT day has no favourable hour at all — better to leave the light on than
    // to leave the aquarium dark. An empty day is never "stronger", so this can't swallow
    // a good day. Two empty days in a row: this covers the first, and the second gets a
    // tier 0 switch-on from the reserve below.
    function _spanOf(iso, t) {
      var nextIso = _isoPlus(iso, 1);
      var next = _tierOn(nextIso);
      var span = 0;
      if (t === 4 && next < 3) span = 2;
      else if (t === 3 && next < 2) span = 1;
      // Only a day INSIDE the scanned window can be known to be empty: beyond the last
      // scanned day there is simply no data, and an unknown day is not a hole to cover.
      var lastIso = _isoPlus(start, days - 1);
      if (nextIso <= lastIso && !bestByDate[nextIso] && span < 1) span = 1;
      // STRONG BLOCKS STRETCH OVER THE EMPTY DAYS (Edu, session 25). A Tier 4 runs to the
      // end of the empty stretch that follows it, up to 5 extra days; a Tier 3 up to 3.
      // Not "always" that many — only as far as the holes actually go. A day with a real
      // hour ends the stretch: it gets its own switch-on, as usual. Weaker tiers keep the
      // single-day hole cover above.
      var stretchCap = (t === 4) ? TIER4_MAX_STRETCH : (t === 3 ? TIER3_MAX_STRETCH : 0);
      if (stretchCap > 0) {
        var k = 0;
        while (k < stretchCap) {
          var nIso = _isoPlus(iso, k + 1);
          if (nIso > lastIso || bestByDate[nIso]) break;
          k++;
        }
        if (k > span) span = k;
      }
      return span;
    }

    var scheduled = [], skipped = [];
    var coveredUntil = null;                    // ISO of the last day covered by a running block
    for (var i = 0; i < days; i++) {
      var iso = _isoPlus(start, i);
      if (coveredUntil && iso <= coveredUntil) continue;   // the light is already on from an earlier block
      var best = bestByDate[iso];
      var usedReserve = false, usedYouLastResort = false;
      if (!best) {
        // Not covered by the previous block => this is the SECOND empty day in a row
        // (the first is always absorbed by _spanOf). Switch on anyway, on the best
        // tier 0 hour that passed the QMDJ veto: less lucky, still valid.
        best = reserveByDate[iso] || null;
        if (best) usedReserve = true;
      }
      if (!best) {
        // LAST RESORT: a You 酉 hour. Nothing earlier in the day and no tier 0 reserve —
        // five hours of light beat none.
        best = youByDate[iso] || null;
        if (best) usedYouLastResort = true;
      }
      if (!best) { skipped.push({ date: iso, reason: 'no favourable hour, no tier 0 reserve and no You \u9149 hour either' }); continue; }
      var chosen = best, fallbackFrom = null, span = _spanOf(iso, best.tier);
      // LATE rule: a late hour is only worth taking when the block outlives the 23:00 off.
      if (_LATE_BRANCHES[best.branch] && span === 0) {
        var alt = bestInWindowByDate[iso];
        if (!alt) {
          skipped.push({ date: iso, reason: 'best hour is late (' + best.branch + ' ' + best.hour + ', tier ' + best.tier +
                         ') and its block would end at 23:00 the same day; no in-window alternative that day' });
          continue;
        }
        fallbackFrom = { branch: best.branch, hour: best.hour, tier: best.tier };
        chosen = alt;
        span = _spanOf(iso, chosen.tier);
      }
      if (_BRANCH_SOLAR_MIN[chosen.branch] == null) { skipped.push({ date: iso, reason: 'unknown branch ' + chosen.branch }); continue; }
      var endIso = _isoPlus(iso, span);
      var onTs = _solarToEpoch(iso, _BRANCH_SOLAR_MIN[chosen.branch], rh.cfg.lon, rh.cfg.utc);
      var offTs = _civilToEpoch(endIso, 23 * 60, rh.cfg.utc);     // 23:00 CIVIL clock on the block's LAST day
      scheduled.push({ date: iso, branch: chosen.branch, hour: chosen.hour, tier: chosen.tier,
                       blood_link: chosen.blood_link || undefined,
                       blood_link_grade: chosen.blood_link ? chosen.blood_link_grade : undefined,
                       reserve_tier0: usedReserve || undefined, you_last_resort: usedYouLastResort || undefined,
                       person_connected: chosen.person_connected, xkdg_score: chosen.xkdg_score,
                       qimen_score: chosen.qimen_score, why: chosen.why,
                       also_good_for: chosen.also_good_for || undefined,
                       onTs: onTs, offTs: offTs,
                       on_local: new Date(onTs).toString(), off_local: new Date(offTs).toString(),
                       stays_on_until_date: span > 0 ? endIso : undefined,
                       stay_on_note: span > 0
                         ? ('Tier ' + chosen.tier + ': stays ON until 23:00 of ' + endIso + ' (' + span + ' extra day' + (span > 1 ? 's' : '') + ') \u2014 no stronger day follows'
                            + (span === 2 ? '; two lit nights, accepted for a Tier 4' : ''))
                         : undefined,
                       late_taken: _LATE_BRANCHES[chosen.branch] ? true : undefined,
                       fallback_from: fallbackFrom || undefined,
                       alternatives_same_tier: (altByDate[iso] && altByDate[iso].length) ? altByDate[iso] : undefined });
      if (span > 0) coveredUntil = endIso;
    }

    // 4) deposit the scheduled days ONLY on commit; otherwise this is a PREVIEW (await the user's OK).
    // A block can outlive its own day (Tier 4 -> +2 days, Tier 3 -> +1), so the body carries ONE
    // ROW PER CALENDAR DAY: the block's own row, plus a row starting at 00:00 for each day it
    // swallows, all sharing the block's final offTs. The light therefore stays lit whether the
    // Worker's cron looks up "today's row" or unions every row.
    var _rows = [];
    scheduled.forEach(function (s) {
      _rows.push({ date: s.date, onTs: s.onTs, offTs: s.offTs });
      if (s.stays_on_until_date) {
        var d = s.date;
        while (d < s.stays_on_until_date) {
          d = _isoPlus(d, 1);
          _rows.push({ date: d, onTs: _civilToEpoch(d, 0, rh.cfg.utc), offTs: s.offTs });
        }
      }
    });
    var body = { days: _rows };
    var workerResp = null, workerErr = null, digestOut = null;
    if (commit) {
      try {
        var res2 = await fetch(cfg.url + '?set_plan&device=' + rh.cfg.device + '&token=' + encodeURIComponent(cfg.token),
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        workerResp = await res2.json().catch(function () { return null; });
        if (!res2.ok) workerErr = 'HTTP ' + res2.status;
      } catch (e) { workerErr = 'Shelly request failed: ' + ((e && e.message) || e); }
      // Piece 2 of 3 (Edu, session 28): the Alexa summary has the same 7-day life cycle
      // as the aquarium plan, so it is deposited together with it and stays fresh as a
      // side effect. It follows the MANUALLY loaded person - nothing here switches person -
      // and inherits this call's purpose filter, staying generic when there is none.
      // The summary's window is fixed at 7 days by rule (Edu), so it does NOT follow this
      // call's `days`: a 14-day light plan still deposits a 7-day summary.
      // Session 28, second pass (Edu): building the digest runs a full 7-day XKDG scan
      // and a direction scan, THEN a second network call - all inside the same tool turn
      // as the aquarium plan. On a phone that was enough to run the turn out of time, and
      // the plan itself came back reported as failed even though the Worker had stored it.
      // The plan now always wins: the digest is given a hard ceiling of its own and, if it
      // overruns, the answer goes out with the plan's result and the digest simply skipped.
      try {
        digestOut = await Promise.race([
          _depositAlexaDigest(_buildAlexaDigest({ days: DIGEST_DAYS, start_date: start, purpose: wantPurpose || undefined })),
          new Promise(function (res) { setTimeout(function () {
            res({ deposited: false, timedOut: true,
                  error: 'The summary took too long and was skipped. The aquarium plan was saved. '
                       + 'Say \"aggiorna il riassunto\" to refresh it on its own.' });
          }, 8000); })
        ]);
      }
      catch (eDg) { digestOut = { deposited: false, error: 'Digest failed: ' + ((eDg && eDg.message) || eDg) }; }
    }

    return {
      scanner: 'aquarium_light_plan', house: rh.name, device: rh.cfg.device,
      mode: commit ? 'committed' : 'preview',
      aquarium: { direction: aq.direction, water_star: aq.water_star },
      purpose_filter: wantPurpose || null,
      persons_used: _digestPersonNames().label,
      person_auto_loaded: personAutoLoaded || undefined,
      person_note: personAutoLoaded
        ? 'Nobody was loaded, so the occupants of this house were loaded for the scan. SAY SO in one line.'
        : 'The scan used the person(s) already loaded by hand - a manual load always wins over the house. '
          + 'If persons_used is null, NO person was loaded and only tier 1 hours (Qimen alone) could appear: say that too.',
      window: '2nd half of Zi (solar 00:00) .. end of You (solar 19:00); OFF at 23:00 civil. A late hour (Xu/Hai) is taken only when its block runs past 23:00 of the same day.',
      scheduled_days: scheduled.length, scheduled: scheduled, deposit_rows: _rows.length,
      skipped: skipped,
      deposited: commit ? !workerErr : false,
      // The two are independent: a failed summary must never be read as a failed plan.
      plan_vs_digest_note: commit
        ? 'IMPORTANT: `deposited` refers ONLY to the aquarium plan. The summary has its own '
          + 'field `alexa_digest`. If the plan was saved and the summary was not, say so in '
          + 'those words - never report the whole thing as failed. If `worker_error` is set, '
          + 'quote it VERBATIM instead of guessing at a cause.'
        : undefined,
      worker_error: workerErr || undefined, worker: commit ? workerResp : undefined,
      alexa_digest: digestOut || undefined,
      missed_switches: (commit && workerResp && Array.isArray(workerResp.alerts) && workerResp.alerts.length)
        ? workerResp.alerts.map(function (a) {
            return (a.turn === 'on' ? 'switch-ON' : 'switch-OFF') + ' scheduled for '
                 + _epochToLocal(a.scheduledTs, rh.cfg.utc) + ' never happened \u2014 '
                 + (a.reason || 'unknown reason'); })
        : undefined,
      missed_switches_rule: (commit && workerResp && Array.isArray(workerResp.alerts) && workerResp.alerts.length)
        ? 'PAST SWITCH-ONS WERE MISSED. Say so FIRST, before reporting the new plan, reproducing each line.'
        : undefined,
      alexa_digest_note: digestOut
        ? ('The 7-day summary Alexa reads was refreshed together with the plan. Mention it in ONE short line '
           + '(how many lucky hours and directions, for which person)'
           + (digestOut.no_person ? ', and SAY that it has NO XKDG hours because no person is loaded - only directions' : '')
           + (digestOut.deposited ? '.' : ', and SAY it was NOT saved: ' + (digestOut.error || 'unknown error')))
        : undefined,
      note: commit
        ? 'COMMITTED: the plan above was deposited into the Worker. Tell the user exactly what was activated for this house (dates + on_local/off_local, and for any day with stays_on_until_date say the light does NOT switch off at 23:00 that day).'
        : 'PREVIEW ONLY \u2014 nothing was deposited. NEVER ask the user to approve individual dates: every day is decided by the rules, there is nothing to confirm day by day. Show the scheduled list (date, hour, tier, on_local/off_local). For every day that carries also_good_for, SAY SO explicitly \u2014 e.g. "questa data e anche buona per Wealth e Career" \u2014 it is the same Purpose Activation calculator as the app\u2019s panel and the user wants to know. If purpose_filter is set, say the plan was restricted to that purpose and that days without it were left out. For a day with stays_on_until_date, say plainly that the light stays on until 23:00 of that later date and why (its tier is high and no stronger day follows). For a day with fallback_from, say the best hour was too late to be useful and the in-window hour was taken instead. For a skipped day, say it stays dark and why. Then ask ONLY for the final go-ahead with buttons:\n[[BTN]] Procedi=procedi | Annulla=annulla\nDo NOT deposit until the user confirms; then call again with commit:true.'
    };
  }

  // Practical stopover lodging — a plain hotel/lodging lookup along a route or near
  // a point. NOT a lucky/directional plan: no fortune scoring. economy (default) uses
  // the Google-backed places worker (chains included, ranked by rating); character
  // uses ResonanceFinder (independent places of character). The caller passes the
  // coordinates of a sensible search point along the road.
  async function toolFindLodging(input) {
    input = input || {};
    var lat = Number(input.lat), lon = Number(input.lon);
    if (!isFinite(lat) || !isFinite(lon)) return { error: 'Need lat and lon of a search point along the route (a town that fits "after A / before B").' };
    var style = (input.style === 'character') ? 'character' : 'economy';
    var radiusM = Math.round((Number(input.radius_km) || 20) * 1000);
    var limit = Math.max(1, Math.min(12, parseInt(input.max_results, 10) || 6));
    var area = input.area_name || '';

    if (style === 'character') {
      if (!(window.ResonanceFinder && typeof window.ResonanceFinder.findLodging === 'function'))
        return { error: 'Character-lodging finder not available on this page.' };
      try {
        var list = await window.ResonanceFinder.findLodging(lat, lon, { radiusM: radiusM, limit: limit });
        return {
          style: 'character', area: area, count: (list || []).length,
          results: (list || []).map(function (r) {
            return { name: r.name || null, lat: r.lat, lon: r.lon, address: r.address || null,
                     rating: (r.rating != null ? r.rating : null), why: (r.reasons || []).join(', ') || null };
          }),
          note: 'Independent / characterful places to sleep near the point. Practical lookup, not a lucky-direction plan — present plainly.'
        };
      } catch (e) { return { error: 'Character-lodging search failed.' }; }
    }

    // ECONOMY (default): Google-rated hotels via the places worker (chains included).
    try {
      var base = (typeof window !== 'undefined' && window.TP_PLACES_URL) ? window.TP_PLACES_URL : null;
      try { if (!base) base = localStorage.getItem('xkdg_tp_places_url'); } catch (e) {}
      if (!base) base = 'https://xkdg-places.decumano16.workers.dev';
      var k = ''; try { k = localStorage.getItem('xkdg_tp_places_key') || ''; } catch (e) {}
      // Ask the worker for BUDGET lodging (inexpensive/moderate), and over-fetch so we
      // can rank by price ourselves. "economy" must return cheap places, not top-rated luxury.
      // Over-fetch so we can rank by price ourselves. "economy" must return cheap places.
      var _fetchN = Math.min(20, Math.max(limit * 3, 12));
      // Query favours BIO / natural stays by default (Edu's standing preference), but
      // it is a text-search PREFERENCE, not a hard filter: Google still returns ordinary
      // hotels when few bio ones exist, so he never runs out of options.
      var _q = (input.query && String(input.query).trim()) || 'hotel bio naturale';
      var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
        'q=' + encodeURIComponent(_q) + '&lat=' + lat + '&lon=' + lon +
        '&radius=' + radiusM + '&max=' + _fetchN + '&budget=1' + (k ? '&k=' + encodeURIComponent(k) : '');
      var j = await fetch(url).then(function (r) { return r.json(); });
      if (!j || j.status !== 'ok' || !Array.isArray(j.results) || !j.results.length)
        return { style: 'economy', area: area, count: 0, results: [], note: 'No budget hotels found near this point — widen radius_km or try a nearby town along the road.' };
      // Sort CHEAPEST first (by Google price level), then best rated as tie-breaker.
      var _plMap = { PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
      var _plNum = function (p) { return (p && _plMap[p] != null) ? _plMap[p] : 2; };   // unknown price -> treat as moderate
      var _euro = function (p) { var n = _plMap[p]; return (n == null) ? null : (n <= 0 ? 'gratis' : '\u20ac'.repeat(Math.max(1, n))); };
      var results = j.results.slice().sort(function (a, b) {
        var pa = _plNum(a.priceLevel), pb = _plNum(b.priceLevel);
        if (pa !== pb) return pa - pb;
        return (b.rating || 0) - (a.rating || 0);
      }).slice(0, limit).map(function (b) {
        return { name: b.name || null, lat: b.lat, lon: b.lon,
                 address: b.address || b.vicinity || null,
                 rating: (b.rating != null ? b.rating : null),
                 reviews: (b.reviews != null ? b.reviews : null),
                 price: _euro(b.priceLevel), price_level: (b.priceLevel != null ? b.priceLevel : null) };
      });
      return {
        style: 'economy', area: area, count: results.length, results: results,
        note: 'Budget hotels near the point, ranked CHEAPEST first (Google price level; € = inexpensive, €€ = moderate), chains included. Present them plainly with name, price (€/€€), rating and address — lead with the cheapest, and DO NOT suggest expensive/luxury places for an economy request.'
      };
    } catch (e) { return { error: 'Economy-lodging search failed (places worker unreachable).' }; }
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
        var clk = solarBranchToClock(x.hourHan);
        return {
          date: x.date, weekday: x.weekday,
          hour: clk || x.hourTime, civil_hour: x.hourTime, ganzhi: x.hourHan,
          palace: x.palaceLbl, dun: x.dun, ju: x.ju, score: x.score,
          hits: (x.hits || []).map(function (h) { return h.label; })
        };
      }),
      time_note: 'hour = real local clock window (true solar time, DST-adjusted, same as BEST/LIST). civil_hour is for reference only.'
    };
  }

  var history = [];   // [{role:'user'|'assistant', content:'...'}]
  var currentConvId = null; // id of the archived conversation currently open (null = unsaved/new)
  var sending = false;

  function getUrl() { try { return (localStorage.getItem(URL_KEY) || '').trim() || DEFAULT_URL; } catch (e) { return DEFAULT_URL; } }
  // Per-student usage tracking (Edu, session 23): a header, never part of the
  // JSON body sent to the model — it costs no LLM tokens and cannot be mistaken
  // for conversation content. Reuses the SAME PIN hash the license check already
  // computes (see submitPin() in app-bazi.js) — no new identifier, no new data.
  // Absent for anyone who unlocked before this change until they re-enter their
  // PIN once; the worker should treat a missing header as "unknown".
  function _aiHeaders() {
    var h = { 'Content-Type': 'application/json' };
    try { var sid = localStorage.getItem('xkdg_student_id'); if (sid) h['X-Student-Id'] = sid; } catch (e) {}
    return h;
  }
  function setUrl(u) { try { localStorage.setItem(URL_KEY, (u || '').trim()); } catch (e) {} }
  // BYOK — "bring your own key" (Edu, session 23: "l'abbonamento allo AI dovrebbe
  // essere gestito da ogni studente indipendentemente da me... aprono un account e
  // stabiliscono il limite mensile"). Each student can paste THEIR OWN Anthropic API
  // key here, from THEIR OWN console.anthropic.com account, where THEY set their own
  // spending limit — exactly the screen Edu showed. Stored only on their own device,
  // used only for their own direct-to-Anthropic calls; nothing routes through Edu's
  // worker or his account once this is set. Anthropic's own official pattern for
  // client-side "bring your own key" apps (anthropic-dangerous-direct-browser-access) —
  // not a workaround, a documented, supported header for exactly this case.
  var OWN_KEY_KEY = 'xkdg_own_api_key';
  function getOwnKey() { try { return (localStorage.getItem(OWN_KEY_KEY) || '').trim(); } catch (e) { return ''; } }
  function setOwnKey(k) { try { localStorage.setItem(OWN_KEY_KEY, (k || '').trim()); } catch (e) {} }

  // ── Conversation archive (saved manually, kept in localStorage on THIS device) ──
  var ARCHIVE_KEY = 'xkdg_ai_archive';
  var ARCHIVE_MAX = 50; // cap number of stored conversations to stay within localStorage quota
  function archiveLoad() {
    try { var a = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function archiveStore(arr) {
    try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(arr)); return true; }
    catch (e) { return false; } // quota exceeded or storage blocked
  }
  // Build a short title from the first typed user message in a history array.
  function convTitle(h) {
    try {
      for (var i = 0; i < h.length; i++) {
        if (h[i] && h[i].role === 'user' && typeof h[i].content === 'string') {
          var t = h[i].content.trim().replace(/\s+/g, ' ');
          if (t) return t.length > 48 ? t.slice(0, 48) + '…' : t;
        }
      }
    } catch (e) {}
    return 'Conversation';
  }
  function convDateLabel(ts) {
    try { var d = new Date(ts); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  function elc(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function build() {
    if (document.getElementById('xkdg-ai-btn')) return; // already installed

    // Fullscreen mode CSS (overrides the inline floating-window styles when toggled on)
    if (!document.getElementById('xkdg-ai-fs-style')) {
      var fsStyle = document.createElement('style');
      fsStyle.id = 'xkdg-ai-fs-style';
      fsStyle.textContent =
        '#xkdg-ai-panel.xkdg-ai-fs{top:0 !important;right:0 !important;bottom:0 !important;left:0 !important;' +
        'width:100vw !important;max-width:100vw !important;' +
        'height:100vh !important;height:100dvh !important;max-height:100vh !important;max-height:100dvh !important;' +
        'border-radius:0 !important;border:0 !important;}';
      document.head.appendChild(fsStyle);
    }

    // Floating launcher
    var btn = elc('button', { id: 'xkdg-ai-btn', title: 'Assistant',
      style: 'position:fixed;right:16px;bottom:16px;z-index:99998;width:52px;height:52px;border-radius:50%;' +
        'border:0;background:#6a1b9a;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.3);' }, '💬');
    document.body.appendChild(btn);

    // Panel
    var panel = elc('div', { id: 'xkdg-ai-panel',
      style: 'display:none;position:fixed;right:16px;bottom:80px;z-index:99999;width:min(380px,calc(100vw - 32px));' +
        'max-height:min(600px,calc(100vh - 110px));max-height:min(600px,calc(100dvh - 110px));background:#fff;border:1px solid #ccc;border-radius:14px;' +
        'box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;font-family:inherit;' });

    var header = elc('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;background:#6a1b9a;color:#fff;' });
    header.appendChild(elc('div', { style: 'flex:1 1 auto;min-width:0;font-weight:700;font-size:15px;' }, '💬 XKDG Assistant'));
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
    var saveBtn = elc('button', { id: 'xkdg-ai-save', title: 'Save conversation to archive',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '💾');
    var archBtn = elc('button', { id: 'xkdg-ai-archive', title: 'Conversation archive',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '📚');
    var shareBtn = elc('button', { id: 'xkdg-ai-share', title: 'Share the last itinerary in English',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '📤');
    var speakerBtn = elc('button', { id: 'xkdg-ai-speak', title: 'Read replies aloud',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '🔇');
    var hfBtn = elc('button', { id: 'xkdg-ai-hf', title: 'Hands-free driving mode (wake word)',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '🚗');
    var expBtn = elc('button', { id: 'xkdg-ai-expanded', title: 'Expanded View — directional Qimen detail (starting palace flow, clash/combination, Tai Sui)',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;opacity:' + (localStorage.getItem('xkdg_expanded_view') === '1' ? '1' : '0.45') + ';' }, '🔬');
    expBtn.onclick = function () {
      var on = localStorage.getItem('xkdg_expanded_view') === '1';
      if (on) localStorage.removeItem('xkdg_expanded_view'); else localStorage.setItem('xkdg_expanded_view', '1');
      expBtn.style.opacity = on ? '0.45' : '1';
      try { var st = document.getElementById('xkdg-ai-status'); if (st) { st.textContent = on ? 'Expanded View OFF' : 'Expanded View ON'; setTimeout(function () { if (st.textContent.indexOf('Expanded View') === 0) st.textContent = ''; }, 2500); } } catch (e) {}
    };
    var fsBtn = elc('button', { id: 'xkdg-ai-fs', title: 'Enlarge to full screen',
      style: 'border:0;background:transparent;color:#fff;font-size:17px;cursor:pointer;' }, '\u26F6');
    var macroBtn = elc('button', { id: 'xkdg-ai-macros', title: 'Macros — short commands you define',
      style: 'border:0;background:transparent;color:#fff;font-size:16px;cursor:pointer;' }, '\u26A1');
    macroBtn.onclick = openMacroManager;
    var closeBtn = elc('button', { id: 'xkdg-ai-close', title: 'Close',
      style: 'border:0;background:transparent;color:#fff;font-size:18px;cursor:pointer;' }, '✕');
    var iconWrap = elc('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;justify-content:flex-end;flex:1 1 auto;' });
    iconWrap.appendChild(langSel); iconWrap.appendChild(gear); iconWrap.appendChild(speakerBtn); iconWrap.appendChild(hfBtn); iconWrap.appendChild(expBtn); iconWrap.appendChild(macroBtn); iconWrap.appendChild(saveBtn); iconWrap.appendChild(archBtn); iconWrap.appendChild(shareBtn); iconWrap.appendChild(clearBtn); iconWrap.appendChild(fsBtn); iconWrap.appendChild(closeBtn);
    header.appendChild(iconWrap);
    panel.appendChild(header);

    var msgs = elc('div', { id: 'xkdg-ai-msgs',
      style: 'flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#faf7fc;' });
    panel.appendChild(msgs);

    var status = elc('div', { id: 'xkdg-ai-status', style: 'font-size:11px;color:#888;padding:0 12px;min-height:14px;' }, '');
    panel.appendChild(status);

    var inputRow = elc('div', { style: 'display:flex;gap:6px;padding:10px 12px calc(10px + env(safe-area-inset-bottom, 0px));border-top:1px solid #eee;flex:0 0 auto;' });
    var input = elc('textarea', { id: 'xkdg-ai-input', rows: '1', placeholder: 'Ask something…',
      style: 'flex:1;resize:none;padding:8px;border:1px solid #ccc;border-radius:8px;font-size:14px;font-family:inherit;max-height:90px;' });
    var mic = elc('button', { id: 'xkdg-ai-mic', title: 'Speak your message',
      style: 'border:0;border-radius:8px;background:#ede7f3;color:#6a1b9a;font-size:18px;padding:8px 12px;cursor:pointer;' }, '🎤');
    var send = elc('button', { id: 'xkdg-ai-send',
      style: 'border:0;border-radius:8px;background:#6a1b9a;color:#fff;font-size:14px;font-weight:600;padding:8px 14px;cursor:pointer;' }, 'Send');
    inputRow.appendChild(input); inputRow.appendChild(mic); inputRow.appendChild(send);
    panel.appendChild(inputRow);

    // Quick-launch chips for macros (tap a chip instead of typing its trigger).
    var chipRow = elc('div', { id: 'xkdg-ai-chips', style: 'display:flex;flex-wrap:wrap;gap:6px;padding:6px 12px 0;' });
    panel.insertBefore(chipRow, inputRow);
    // Shared popup bubble that reminds what a chip does (hover on desktop, long-press on touch).
    var macroTip = elc('div', { id: 'xkdg-ai-chiptip',
      style: 'position:fixed;z-index:100002;max-width:240px;background:#2a1633;color:#fff;border:1px solid #6a1b9a;border-radius:8px;padding:7px 10px;font-size:12px;line-height:1.35;box-shadow:0 4px 16px rgba(0,0,0,.4);display:none;pointer-events:none;' }, '');
    document.body.appendChild(macroTip);
    function showTip(chip, m) {
      macroTip.textContent = (m.label && m.label.trim()) ? m.label : ('Sends: ' + (m.text || '').slice(0, 120) + ((m.text || '').length > 120 ? '…' : ''));
      macroTip.style.display = 'block';
      var r = chip.getBoundingClientRect();
      var top = r.top - macroTip.offsetHeight - 8;
      if (top < 6) top = r.bottom + 8;                       // flip below if no room above
      var left = Math.max(6, Math.min(r.left, window.innerWidth - macroTip.offsetWidth - 6));
      macroTip.style.top = top + 'px'; macroTip.style.left = left + 'px';
    }
    function hideTip() { macroTip.style.display = 'none'; }
    function renderMacroChips() {
      chipRow.innerHTML = ''; hideTip();
      var arr = loadMacros();
      if (!arr.length) { chipRow.style.display = 'none'; return; }
      chipRow.style.display = 'flex';
      arr.forEach(function (m) {
        var chip = elc('button', { title: (m.label || m.trigger),
          style: 'border:1px solid #c9b6d6;background:#f3edf8;color:#6a1b9a;border-radius:14px;padding:4px 11px;font-size:12px;font-weight:600;cursor:pointer;' },
          (m.icon || '\u26A1') + ' ' + (m.trigger || ''));
        var lpTimer = null, suppress = false;
        chip.onclick = function () {
          if (suppress) { suppress = false; return; }
          hideTip(); if (sending) return;
          if (m.askDepart) {
            _askDepart(function (clause, human) {
              var toSend = m.text + (clause ? (' ' + clause) : '');
              var bubble = (m.icon || '\u26A1') + ' ' + (m.trigger || '') + (m.label ? ' \u2014 ' + m.label : '') + (human ? ' \u00b7 ' + human : '');
              doSend(toSend, bubble);
            });
            return;
          }
          input.value = m.trigger; doSend();
        };
        // Desktop: hover shows the reminder.
        chip.onmouseenter = function () { showTip(chip, m); };
        chip.onmouseleave = hideTip;
        // Touch: long-press (~450ms) shows the reminder and cancels the launch.
        chip.addEventListener('touchstart', function () { suppress = false; lpTimer = setTimeout(function () { suppress = true; showTip(chip, m); }, 450); }, { passive: true });
        chip.addEventListener('touchend', function () { if (lpTimer) clearTimeout(lpTimer); setTimeout(hideTip, 1600); });
        chip.addEventListener('touchmove', function () { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } });
        chip.addEventListener('touchcancel', function () { if (lpTimer) clearTimeout(lpTimer); hideTip(); });
        chipRow.appendChild(chip);
      });
    }
    _macroChipRefresh = renderMacroChips;
    renderMacroChips();

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
        it: [' il ', ' lo ', ' la ', ' gli ', ' le ', ' che ', ' è ', ' sei ', ' oggi ', ' viaggio ', ' ore ', ' partenza ', ' buongiorno ', ' grazie ', ' direzione ', ' fortunato ', ' della ', ' di ', ' un ', ' una ', ' per ', ' come ', ' quale ', ' sono ', ' più ', ' anche ', ' questo ', ' mi ', ' fare ', ' posso ', ' famiglia ', ' esagramma ', ' non ', ' con ', ' da ', ' cosa ', ' dove ', ' quando ', ' ho ', ' hai ', ' ha ', ' mostrami ', ' dimmi ', ' voglio ', ' vorrei ', ' carta ', ' casa ', ' acquario ', ' luce ', ' nord ', ' sud ', ' ovest ', ' verso ', ' ora ', ' giorno '],
        en: [' the ', ' is ', ' you ', ' today ', ' travel ', ' hours ', ' leave ', ' hello ', ' thanks ', ' yes ', ' direction ', ' lucky ', ' route ', ' your ', ' to ', ' of ', ' what ', ' which ', ' how ', ' does ', ' do ', ' and ', ' for ', ' my ', ' can ', ' are ', ' this ', ' with ', ' family ', ' hexagram ', ' show ', ' me ', ' chart ', ' please ', ' want ', ' need ', ' house ', ' aquarium ', ' light ', ' north ', ' south ', ' west ', ' east ', ' when ', ' where ', ' will ', ' trip ', ' day '],
        fr: [' le ', ' la ', ' les ', ' est ', ' vous ', ' aujourd ', ' voyage ', ' heures ', ' partir ', ' bonjour ', ' merci ', ' oui ', ' direction ', ' chance ', ' votre ', ' de ', ' une ', ' pour ', ' comment ', ' quel ', ' quelle ', ' je ', ' avec ', ' ce ', ' plus ', ' faire ', ' famille ', ' hexagramme ', ' maison ', ' montre ', ' jour ', ' aujourd hui ', ' ouest ', ' nord ', ' sud ']
      };
      var counts = {};
      Object.keys(sets).forEach(function (k) {
        var n = 0; sets[k].forEach(function (w) { if (t.indexOf(w) >= 0) n++; }); counts[k] = n;
      });
      var best = null, bestN = 0, tie = false;
      Object.keys(counts).forEach(function (k) {
        if (counts[k] > bestN) { bestN = counts[k]; best = k; tie = false; }
        else if (counts[k] === bestN && bestN > 0) { tie = true; }
      });
      // Decisive on a single CLEAR leading hit. Short messages ("show me the chart",
      // "bazi for tomorrow") used to score <2, return null, and fall back to the voice
      // selector \u2014 which replied in the wrong language. Only truly ambiguous input (0 hits
      // or a tie between languages) stays null.
      return (bestN >= 1 && !tie) ? best : null;
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

    // --- Screen Wake Lock: keep the display awake while hands-free driving mode is on. ---
    // Fully additive and self-contained; degrades silently where the API is missing.
    var hfWakeLock = null;
    function hfAcquireWakeLock() {
      try {
        if (!('wakeLock' in navigator) || !navigator.wakeLock || !navigator.wakeLock.request) return;
        navigator.wakeLock.request('screen').then(function (wl) {
          hfWakeLock = wl;
          try { wl.addEventListener('release', function () { hfWakeLock = null; }); } catch (e) {}
        }).catch(function () { /* battery saver / no gesture may refuse — ignore */ });
      } catch (e) {}
    }
    function hfReleaseWakeLock() {
      try { if (hfWakeLock) { hfWakeLock.release().catch(function () {}); } } catch (e) {}
      hfWakeLock = null;
    }
    // The OS drops the lock when the tab is hidden; re-acquire when we return and are still hands-free.
    try {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && handsFree && !hfWakeLock) hfAcquireWakeLock();
      });
    } catch (e) {}

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
      hfAcquireWakeLock();
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
      recogHF = null; hfReleaseWakeLock(); refreshHfBtn(); setStatus('Hands-free off.');
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
      try { areaHint(); } catch (e) {}
      input.focus();
    }

    // One discreet line at the top of an EMPTY chat, reminding which area is loaded.
    function areaHint() {
      if (!msgs || msgs.children.length) return;
      var a = getToolArea();
      var t = a ? ('Area: ' + AREA_LABELS[a] + ' \u2014 change it above if this question is about something else.')
                : 'Pick the area of your question above \u2014 the assistant then carries only the tools it needs.';
      msgs.appendChild(elc('div', { id: 'xkdg-ai-area-hint', style:
        'align-self:center;font-size:11px;color:#8a6d00;background:#fff8e1;border:1px solid #ffe082;' +
        'border-radius:10px;padding:4px 9px;margin:2px 0;text-align:center;' }, t));
    }

    // No area picked yet: ask, then send the pending question as soon as one is chosen.
    function askForArea(pending, pendingBubble) {
      var wrap = elc('div', { style: 'align-self:flex-start;max-width:92%;background:#fff8e1;border:1px solid #ffb300;' +
        'border-radius:12px;padding:9px 11px;font-size:13px;line-height:1.45;color:#4a3000;' });
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:5px;' },
        '\uD83C\uDFAF Which area is your question about?'));
      wrap.appendChild(elc('div', { style: 'font-size:12px;color:#6d5200;margin-bottom:7px;' },
        'The assistant carries only the tools and instructions of the area you pick, so the answer is faster and much ' +
        'cheaper. If the question turns out to belong elsewhere, it pulls the other area in by itself.'));
      var row = elc('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;' });
      AREA_ORDER.forEach(function (a) {
        var b = elc('button', { style: 'border:0;border-radius:14px;padding:6px 11px;font-size:12px;font-weight:600;' +
          'cursor:pointer;background:#ffb300;color:#3a2600;' }, AREA_LABELS[a]);
        b.addEventListener('click', function () {
          setToolArea(a);
          try { window._xkdgRefreshAreaBtn && window._xkdgRefreshAreaBtn(); } catch (e) {}
          try { row.parentNode && row.parentNode.removeChild(row); } catch (e) {}
          wrap.appendChild(elc('div', { style: 'font-size:12px;font-weight:700;' }, '\u2713 ' + AREA_LABELS[a]));
          if (pending) doSend(pending, pendingBubble); else doSend();
        });
        row.appendChild(b);
      });
      wrap.appendChild(row);
      msgs.appendChild(wrap);
      try { msgs.scrollTop = msgs.scrollHeight; } catch (e) {}
    }
    function closePanel() { stopSpeaking(); if (handsFree) stopHF(); panel.style.display = 'none'; }

    function toggleFullscreen() {
      var full = panel.classList.toggle('xkdg-ai-fs');
      fsBtn.textContent = full ? '\uD83D\uDDD5' : '\u26F6';
      fsBtn.title = full ? 'Restore small window' : 'Enlarge to full screen';
      try { input.focus(); } catch (e) {}
    }

    btn.addEventListener('click', function () { panel.style.display === 'flex' ? closePanel() : openPanel(); });
    closeBtn.addEventListener('click', closePanel);
    fsBtn.addEventListener('click', toggleFullscreen);
    // Visible area badge (session 24): the assistant is ALWAYS this one chat — the
    // area only decides which tools it carries. Keeping that invisible in Settings
    // made it look as if there were separate assistants somewhere else.
    // Area picker in the title bar (session 26): a real drop-down, not a button that
    // cycles one step per tap. '' means nothing picked yet \u2014 doSend() then asks.
    var areaBtn = elc('select', { id: 'xkdg-ai-area-btn', title: 'Which tools the assistant carries',
      style: 'border:0;border-radius:8px;padding:2px 6px;font-size:11px;font-weight:700;cursor:pointer;' +
             'background:rgba(255,255,255,.22);color:#fff;white-space:nowrap;max-width:150px;' });
    (function(){
      var o0 = elc('option', { value: '' }, '\uD83C\uDFAF Choose area\u2026');
      o0.style.color = '#333'; areaBtn.appendChild(o0);
      AREA_ORDER.forEach(function(a){
        var o = elc('option', { value: a }, AREA_LABELS[a]);
        o.style.color = '#333'; areaBtn.appendChild(o);
      });
    })();
    function _refreshAreaBtn(){
      try {
        var a = getToolArea();
        areaBtn.value = a;
        areaBtn.style.background = a ? '#ffb300' : 'rgba(255,255,255,.22)';
        areaBtn.style.color = a ? '#3a2600' : '#fff';
      } catch(e){}
    }
    _refreshAreaBtn();
    window._xkdgRefreshAreaBtn = _refreshAreaBtn;
    areaBtn.addEventListener('change', function () {
      setToolArea(areaBtn.value);
      _refreshAreaBtn();
      try { var s = document.getElementById('xkdg-ai-area-sel'); if (s) s.value = getToolArea(); } catch(e){}
    });
    try { gear.parentNode && gear.parentNode.insertBefore(areaBtn, gear); } catch(e){}

    gear.addEventListener('click', openSettings);
    clearBtn.addEventListener('click', function () { history = []; currentConvId = null; msgs.innerHTML = ''; setStatus(''); });
    saveBtn.addEventListener('click', function () { saveCurrentConversation(false); });
    archBtn.addEventListener('click', openArchive);
    shareBtn.addEventListener('click', shareItinerary);

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
      card.appendChild(elc('div', { style: 'font-size:10px;color:#999;margin-top:3px;' }, 'The shared worker Edu runs — used unless you set your own key below.'));

      card.appendChild(elc('hr', { style: 'border:0;border-top:1px solid #eee;margin:14px 0;' }));

      // ── Specialist area (session 24): send only the tools of one area ──
      card.appendChild(elc('div', { style: 'font-size:13px;font-weight:700;color:#e65100;margin:0 0 3px;' }, '\uD83C\uDFAF Assistant area'));
      card.appendChild(elc('div', { style: 'font-size:11px;color:#777;margin-bottom:6px;line-height:1.5;' },
        'Pick one area and the assistant only carries the tools \u2014 and the instructions \u2014 that area needs: faster '
        + 'answers and a far cheaper request. It can still pull another area in by itself if your question goes elsewhere.'));
      var areaSel = elc('select', { id: 'xkdg-ai-area-sel', style: 'width:100%;padding:8px;border:1px solid #ffb74d;border-radius:6px;font-size:13px;' });
      areaSel.appendChild(elc('option', { value: '' }, '\uD83C\uDFAF Choose area\u2026'));
      AREA_ORDER.forEach(function(a){
        var o = elc('option', { value: a }, AREA_LABELS[a]);
        if (a === getToolArea()) o.selected = true;
        areaSel.appendChild(o);
      });
      var areaNote = elc('div', { style: 'font-size:10px;color:#999;margin-top:4px;' }, '');
      function _syncAreaNote(){
        var a = areaSel.value;
        if (!a) { areaNote.textContent = 'No area picked \u2014 the assistant will ask before the first question.'; return; }
        var n = TOOL_ALWAYS.length + (TOOL_AREAS[a] || []).length + 1;
        areaNote.textContent = n + ' of ' + TOOLS.length + ' tools sent with every question'
          + ' \u2014 about ' + Math.round((1 - n / TOOLS.length) * 100) + '% fewer.';
      }
      areaSel.addEventListener('change', function(){ setToolArea(areaSel.value); _syncAreaNote(); try { window._xkdgRefreshAreaBtn && window._xkdgRefreshAreaBtn(); } catch(e){} });
      _syncAreaNote();
      card.appendChild(areaSel); card.appendChild(areaNote);

      card.appendChild(elc('hr', { style: 'border:0;border-top:1px solid #eee;margin:14px 0;' }));

      // BYOK — bring your own Anthropic API key (session 23)
      card.appendChild(elc('div', { style: 'font-size:13px;font-weight:700;color:#00695c;margin:0 0 3px;' }, '\ud83d\udd11 My own Anthropic API key'));
      card.appendChild(elc('div', { style: 'font-size:11px;color:#777;margin-bottom:6px;line-height:1.5;' },
        'Optional: use your OWN Anthropic account instead of the shared one. Create an account and an API key at ' +
        'console.anthropic.com, set your own monthly spending limit there, and paste the key below. From then on ' +
        'every AI request in this app goes DIRECTLY from your device to Anthropic \u2014 your key never passes through ' +
        'Edu\u2019s worker or account, and you are billed by Anthropic exactly for what you use. Leave empty to keep ' +
        'using the shared worker above.'));
      var keyRow = elc('div', { style: 'display:flex;gap:6px;' });
      var keyInp = elc('input', { type: 'password', placeholder: 'sk-ant-...', value: getOwnKey(), style: 'flex:1;min-width:0;padding:7px;border:1px solid #ccc;border-radius:6px;font-size:13px;font-family:monospace;' });
      var keySave = elc('button', { style: 'padding:7px 12px;border:0;border-radius:6px;background:#00897b;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, 'Save');
      keySave.addEventListener('click', function () { setOwnKey(keyInp.value); keySave.textContent = '\u2713'; setTimeout(function () { keySave.textContent = 'Save'; }, 1200); });
      keyRow.appendChild(keyInp); keyRow.appendChild(keySave); card.appendChild(keyRow);
      if (getOwnKey()) card.appendChild(elc('div', { style: 'font-size:11px;color:#00695c;font-weight:600;margin-top:4px;' }, '\u2713 Using your own key \u2014 billed directly by Anthropic to your account.'));

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

    // ── Save the current conversation to the archive (manual, via 💾) ──
    function saveCurrentConversation(silent) {
      if (!history.length) { if (!silent) setStatus('Nothing to save yet.'); return false; }
      var arr = archiveLoad();
      var rec = {
        id: currentConvId || ('c' + Date.now() + Math.floor(Math.random() * 1000)),
        title: convTitle(history), ts: Date.now(), lang: chatLang(),
        history: JSON.parse(JSON.stringify(history))
      };
      var idx = -1, i;
      for (i = 0; i < arr.length; i++) { if (arr[i] && arr[i].id === rec.id) { idx = i; break; } }
      if (idx >= 0) arr[idx] = rec; else arr.unshift(rec);
      if (arr.length > ARCHIVE_MAX) arr = arr.slice(0, ARCHIVE_MAX);
      currentConvId = rec.id;
      var ok = archiveStore(arr);
      if (!silent) {
        if (ok) { saveBtn.textContent = '✓'; setTimeout(function () { saveBtn.textContent = '💾'; }, 1200);
          setStatus(idx >= 0 ? 'Conversation updated in archive.' : 'Conversation saved to archive.'); }
        else setStatus('Could not save — storage full. Export the archive (📚) and delete some.', '#b00');
      }
      return ok;
    }

    // Redraw the visible bubbles from `history` (text only; tool blocks are skipped, nothing read aloud).
    function renderHistoryBubbles() {
      msgs.innerHTML = '';
      history.forEach(function (m) {
        if (!m) return;
        if (m.role === 'user') {
          if (typeof m.content === 'string' && m.content.trim()) addBubble('user', m.content, true);
        } else if (m.role === 'assistant') {
          var t = (typeof m.content === 'string') ? m.content : extractText({ content: m.content });
          if (t && t.trim()) addBubble('assistant', t, true);
        }
      });
    }

    // Reopen a saved conversation so it can be reviewed and continued.
    function loadConversation(conv) {
      if (!conv || !Array.isArray(conv.history)) return;
      history = JSON.parse(JSON.stringify(conv.history));
      currentConvId = conv.id;
      renderHistoryBubbles();
      openPanel();
      setStatus('Conversation loaded — you can continue it.');
    }

    // ── Archive browser (📚): list, reopen, delete, clear all, export/import ──
    function openArchive() {
      var ex0 = document.getElementById('xkdg-ai-arch-ov'); if (ex0) ex0.remove();
      var arr = archiveLoad();
      var ov = elc('div', { id: 'xkdg-ai-arch-ov', style: 'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;' });
      var card = elc('div', { style: 'background:#fff;border-radius:12px;max-width:520px;width:100%;padding:16px 18px;font-family:system-ui,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3);' });
      var hd = elc('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;' });
      hd.appendChild(elc('h3', { style: 'margin:0;font-size:16px;color:#4a148c;' }, '\ud83d\udcda Conversation archive'));
      var x = elc('button', { style: 'border:0;background:transparent;font-size:20px;cursor:pointer;color:#888;' }, '\u2715');
      x.addEventListener('click', function () { ov.remove(); });
      hd.appendChild(x); card.appendChild(hd);
      card.appendChild(elc('div', { style: 'font-size:11px;color:#777;margin-bottom:10px;line-height:1.5;' },
        'Saved on THIS device. "Clear site data" (used for app updates) erases it \u2014 use Export below to keep a copy.'));

      var listWrap = elc('div', { style: 'display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto;' });
      if (!arr.length) {
        listWrap.appendChild(elc('div', { style: 'font-size:13px;color:#999;padding:10px;text-align:center;' }, 'No saved conversations yet. Use \ud83d\udcbe in the chat header to save one.'));
      } else {
        arr.forEach(function (conv) {
          var row = elc('div', { style: 'display:flex;align-items:center;gap:8px;border:1px solid #eee;border-radius:8px;padding:8px 10px;' });
          var info = elc('div', { style: 'flex:1;min-width:0;cursor:pointer;' });
          info.appendChild(elc('div', { style: 'font-size:13px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' }, conv.title || 'Conversation'));
          info.appendChild(elc('div', { style: 'font-size:11px;color:#999;' }, convDateLabel(conv.ts)));
          info.addEventListener('click', function () { ov.remove(); loadConversation(conv); });
          var del = elc('button', { title: 'Delete', style: 'border:0;background:transparent;font-size:16px;cursor:pointer;color:#b00;' }, '\ud83d\uddd1');
          del.addEventListener('click', function () {
            if (!window.confirm('Delete this conversation?')) return;
            var a2 = archiveLoad().filter(function (c) { return c.id !== conv.id; });
            archiveStore(a2);
            if (currentConvId === conv.id) currentConvId = null;
            ov.remove(); openArchive();
          });
          row.appendChild(info); row.appendChild(del);
          listWrap.appendChild(row);
        });
      }
      card.appendChild(listWrap);

      if (arr.length) {
        var clearAll = elc('button', { style: 'width:100%;margin-top:10px;padding:8px;border:1px solid #b00;border-radius:6px;background:#fff;color:#b00;font-size:13px;font-weight:600;cursor:pointer;' }, '\ud83d\uddd1 Clear all conversations');
        clearAll.addEventListener('click', function () {
          if (!window.confirm('Delete ALL saved conversations? This cannot be undone.')) return;
          archiveStore([]); currentConvId = null; ov.remove(); openArchive();
        });
        card.appendChild(clearAll);
      }

      card.appendChild(elc('hr', { style: 'border:0;border-top:1px solid #eee;margin:14px 0;' }));

      card.appendChild(elc('div', { style: 'font-size:13px;font-weight:700;color:#1565c0;margin:0 0 3px;' }, '\u2b06\ufe0f Export archive'));
      card.appendChild(elc('div', { style: 'font-size:11px;color:#777;margin-bottom:6px;line-height:1.5;' }, 'Copy or download all saved conversations. Keep this before clearing site data, then Import it back.'));
      var exp = elc('textarea', { readonly: 'readonly', style: 'width:100%;height:60px;box-sizing:border-box;padding:7px;border:1px solid #ccc;border-radius:6px;font-size:11px;font-family:monospace;' });
      exp.value = JSON.stringify({ _xkdg_archive: 1, v: 1, ts: Date.now(), data: arr });
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
        try { var blob = new Blob([exp.value], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'xkdg-conversations.json'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {}
      });
      expRow.appendChild(copyB); expRow.appendChild(dlB); card.appendChild(expRow);

      card.appendChild(elc('hr', { style: 'border:0;border-top:1px solid #eee;margin:14px 0;' }));

      card.appendChild(elc('div', { style: 'font-size:13px;font-weight:700;color:#2e7d32;margin:0 0 3px;' }, '\u267b\ufe0f Import archive'));
      card.appendChild(elc('div', { style: 'font-size:11px;color:#777;margin-bottom:6px;line-height:1.5;' }, 'Paste an exported archive. Conversations are merged with the ones already here (duplicates skipped).'));
      var imp = elc('textarea', { placeholder: 'Paste the exported archive here\u2026', style: 'width:100%;height:60px;box-sizing:border-box;padding:7px;border:1px solid #ccc;border-radius:6px;font-size:11px;font-family:monospace;' });
      card.appendChild(imp);
      var impStatus = elc('div', { style: 'font-size:11px;margin-top:4px;min-height:14px;' }, '');
      card.appendChild(impStatus);
      var impB = elc('button', { style: 'width:100%;margin-top:6px;padding:9px;border:0;border-radius:6px;background:#2e7d32;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, '\u267b\ufe0f Import');
      impB.addEventListener('click', function () {
        var t = (imp.value || '').trim();
        if (!t) { impStatus.style.color = '#b58900'; impStatus.textContent = 'Paste an exported archive first.'; return; }
        var incoming;
        try { var parsed = JSON.parse(t); incoming = (parsed && parsed.data) ? parsed.data : parsed; if (!Array.isArray(incoming)) throw new Error('bad'); }
        catch (e) { impStatus.style.color = '#b00'; impStatus.textContent = 'That text is not a valid archive.'; return; }
        var cur = archiveLoad(), seen = {};
        cur.forEach(function (c) { if (c && c.id) seen[c.id] = 1; });
        var added = 0;
        incoming.forEach(function (c) { if (c && c.id && !seen[c.id] && Array.isArray(c.history)) { cur.unshift(c); seen[c.id] = 1; added++; } });
        if (cur.length > ARCHIVE_MAX) cur = cur.slice(0, ARCHIVE_MAX);
        archiveStore(cur);
        impStatus.style.color = '#2e7d32'; impStatus.textContent = 'Imported ' + added + ' conversation(s).';
        setTimeout(function () { ov.remove(); openArchive(); }, 800);
      });
      card.appendChild(impB);

      ov.appendChild(card); document.body.appendChild(ov);
    }
    function setStatus(t, color) { status.textContent = t || ''; status.style.color = color || '#888'; }

    function addBubble(role, text, noSpeak) {
      var mine = role === 'user';
      // Assistant turns may carry a [[BTN]] line that becomes tap buttons (yes/no or
      // short choices). Parsed only for LIVE assistant messages, not history replay.
      var btnSpecs = [], displayText = text;
      if (!mine && !noSpeak && typeof text === 'string' && text.indexOf('[[BTN]]') >= 0) {
        var keep = [];
        text.split('\n').forEach(function (ln) {
          var mm = /^\s*\[\[BTN\]\]\s*(.+)$/.exec(ln);
          if (!mm) { keep.push(ln); return; }
          mm[1].split('|').forEach(function (part) {
            var t = part.trim(); if (!t) return;
            var eq = t.indexOf('=');
            var label = eq >= 0 ? t.slice(0, eq).trim() : t;
            var payload = eq >= 0 ? t.slice(eq + 1).trim() : t;
            if (label) btnSpecs.push({ label: label, payload: payload || label });
          });
        });
        displayText = keep.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      }
      var b = elc('div', { style:
        'max-width:85%;padding:8px 11px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;' +
        (mine ? 'align-self:flex-end;background:#6a1b9a;color:#fff;border-bottom-right-radius:3px;'
              : 'align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;border-bottom-left-radius:3px;') }, displayText);
      msgs.appendChild(b);
      if (btnSpecs.length) {
        var row = elc('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-self:flex-start;margin:1px 0 5px;' });
        btnSpecs.forEach(function (spec) {
          var bt = elc('button', { style: 'padding:7px 16px;border:1px solid #6a1b9a;background:#6a1b9a;color:#fff;border-radius:16px;font-size:14px;font-weight:600;cursor:pointer;' }, spec.label);
          bt.onclick = function () {
            try { var bs = row.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) { bs[i].disabled = true; bs[i].style.opacity = '0.5'; bs[i].style.cursor = 'default'; } } catch (e) {}
            // DETERMINISTIC local action (session 23): "Apri Travel Planner" opens the
            // planner DIRECTLY with the params the last plan_travel call computed —
            // never routed through the model, which was observed replying "it is
            // open" without making any tool call. Falls back to the normal chat
            // message when no plan has been stashed (e.g. the button came from an
            // older conversation).
            var _pl = String(spec.payload || '').toLowerCase();
            if (_pl.indexOf('travel planner') >= 0 && _pl.indexOf('apri') >= 0 &&
                window._XKDGChatLastPlan && window.TravelPlanner &&
                typeof window.TravelPlanner.openPrefilled === 'function') {
              var _ok = false;
              try { window.TravelPlanner.openPrefilled(window._XKDGChatLastPlan); _ok = !!document.getElementById('tp-overlay'); } catch (e) {}
              addBubble('assistant', _ok
                ? '\ud83d\ude97 Travel Planner aperto (dietro la chat) \u2014 sta calcolando il percorso reale; l\u2019itinerario arriva qui come card tra qualche secondo.'
                : '\u26a0 Il pannello del Travel Planner non si \u00e8 aperto \u2014 segnalamelo.', true);
              return;
            }
            try { doSend(spec.payload, spec.label); } catch (e) {}
          };
          row.appendChild(bt);
        });
        msgs.appendChild(row);
      }
      msgs.scrollTop = msgs.scrollHeight;
      if (!mine && !noSpeak) speak(displayText);
      return b;
    }
    // Injected by the Travel Planner when it finishes computing an AI-opened trip:
    // shows the itinerary in the chat plus a one-tap "Open in Google Maps" button
    // (a real user tap, so the browser will not block the pop-up).
    var ITIN_LBL = {
      it: { drive: 'Guida', stop: 'Sosta', charge: 'Ricarica', min: 'min', toward: 'verso', then: 'poi verso', arrive: 'arrivo a',
        favourable: 'favorevoli', noWindow: 'nessuna finestra', tapDetails: 'tocca per i dettagli della tappa', favDir: 'direzione Qimen favorevole (cash)', bestTrip: 'la migliore del viaggio', xkHour: 'ora XKDG favorevole alla persona',
        realRoad: 'strada reale', driving: 'di guida', estimate: 'stima in linea retta',
        chPending: '\ud83d\udd0c Ricarica: ricerca in corso\u2026', ch: '\ud83d\udd0c Ricarica', addedMaps: 'aggiunta al percorso Maps',
        moreStops: 'altre soste', otherNet: 'altri operatori', lowPow: 'solo \u226580 kW \u2014 nessuna \u2265150 kW',
        noKey: '\ud83d\udd0c Ricarica: manca la chiave Open Charge Map \u2014 aggiungila nel pannello (\ud83d\udd0b Range & charging)',
        none: '\ud83d\udd0c Ricarica: nessuna stazione Tesla/Electra raggiungibile sul percorso',
        noRange: '\ud83d\udd0c Ricarica: inserisci l\u2019autonomia residua (km) nel pannello',
        noRoute: '\ud83d\udd0c Ricarica: rotta reale non disponibile (imposta il Worker e rifai lo SCAN)',
        failed: '\ud83d\udd0c Ricarica: ricerca non riuscita (controlla chiave/connessione)',
        openMaps: '\ud83d\udccd Apri in Google Maps', opened: '\u2713 Aperto in Google Maps', blocked: '\u26a0 Pop-up bloccato \u2014 usa \u201cApri in Google Maps\u201d nel pannello',
        replan: '\ud83d\udd01 Ricalcola da qui', replanGps: '\ud83d\udccd Prendo il GPS\u2026', replanRun: '\u267b\ufe0f Ricalcolo\u2026',
        replanStale: '\u26a0 GPS non fresco \u2014 uso l\u2019ultima posizione salvata', replanNoGps: '\u26a0 Nessuna posizione GPS disponibile', replanNoDest: '\u26a0 Destinazione non trovata \u2014 rifai lo SCAN nel pannello',
        exit: 'Uscita', quad: 'quadrante', limit: 'limite', near: 'vicino a',
        notNeeded: 'Non necessaria', notNeededWhy: 'un caricatore reale altrove copre gi\u00e0 questo tratto',
        noPlaceYet: 'nessun luogo agganciato (posizione lungo il percorso)',
        extraCharges: 'Ricariche in pi\u00f9 necessarie (non sono tappe qui sopra)',
        extraChargesWhy: 'Sono nel percorso Google Maps. Non compaiono come tappe perch\u00e9 sposterebbero gli orari delle soste fuori dalle loro ore favorevoli.' },
      en: { drive: 'Drive', stop: 'Stop', charge: 'Charge', min: 'min', toward: 'toward', then: 'then toward', arrive: 'arrive at',
        favourable: 'favourable', noWindow: 'no window', tapDetails: 'tap for the stop details', favDir: 'favourable Qimen direction (cash)', bestTrip: 'best of the trip', xkHour: 'favourable XKDG person-hour',
        realRoad: 'real road', driving: 'driving', estimate: 'straight-line estimate',
        chPending: '\ud83d\udd0c Charging: searching\u2026', ch: '\ud83d\udd0c Charging', addedMaps: 'added to the Maps route',
        moreStops: 'more stops', otherNet: 'other networks', lowPow: 'only \u226580 kW \u2014 no \u2265150 kW',
        noKey: '\ud83d\udd0c Charging: no Open Charge Map key \u2014 add it in the planner (\ud83d\udd0b Range & charging)',
        none: '\ud83d\udd0c Charging: no reachable Tesla/Electra station on the route',
        noRange: '\ud83d\udd0c Charging: enter your remaining range (km) in the planner',
        noRoute: '\ud83d\udd0c Charging: no real route yet (set the Worker and run SCAN again)',
        failed: '\ud83d\udd0c Charging: lookup failed (check key/connection)',
        openMaps: '\ud83d\udccd Open in Google Maps', opened: '\u2713 Opened in Google Maps', blocked: '\u26a0 Pop-up blocked \u2014 use \u201cOpen in Google Maps\u201d in the planner',
        replan: '\ud83d\udd01 Replan from here', replanGps: '\ud83d\udccd Getting GPS\u2026', replanRun: '\u267b\ufe0f Replanning\u2026',
        replanStale: '\u26a0 GPS fix failed \u2014 using the last saved position', replanNoGps: '\u26a0 No GPS position available', replanNoDest: '\u26a0 Destination not found \u2014 run SCAN in the planner first',
        exit: 'Exit', quad: 'quadrant', limit: 'limit', near: 'near',
        notNeeded: 'Not needed', notNeededWhy: 'a real charger elsewhere already covers this stretch',
        noPlaceYet: 'no place snapped yet (position along the route)',
        extraCharges: 'Extra charges needed (not steps above)',
        extraChargesWhy: 'They are in the Google Maps route. They are not shown as steps because they would push the stops out of their favourable hours.' },
      fr: { drive: 'Route', stop: 'Arr\u00eat', charge: 'Recharge', min: 'min', toward: 'vers', then: 'puis vers', arrive: 'arriv\u00e9e \u00e0',
        favourable: 'favorables', noWindow: 'aucune fen\u00eatre', tapDetails: 'appuyez pour les d\u00e9tails de l\u2019\u00e9tape', favDir: 'direction Qimen favorable (cash)', bestTrip: 'la meilleure du voyage', xkHour: 'heure XKDG favorable \u00e0 la personne',
        realRoad: 'route r\u00e9elle', driving: 'de conduite', estimate: 'estimation \u00e0 vol d\u2019oiseau',
        chPending: '\ud83d\udd0c Recharge : recherche\u2026', ch: '\ud83d\udd0c Recharge', addedMaps: 'ajout\u00e9e \u00e0 l\u2019itin\u00e9raire Maps',
        moreStops: 'autres arr\u00eats', otherNet: 'autres r\u00e9seaux', lowPow: '\u226580 kW seulement \u2014 aucune \u2265150 kW',
        noKey: '\ud83d\udd0c Recharge : pas de cl\u00e9 Open Charge Map \u2014 ajoutez-la dans le panneau (\ud83d\udd0b Range & charging)',
        none: '\ud83d\udd0c Recharge : aucune station Tesla/Electra accessible sur la route',
        noRange: '\ud83d\udd0c Recharge : indiquez votre autonomie restante (km) dans le panneau',
        noRoute: '\ud83d\udd0c Recharge : pas d\u2019itin\u00e9raire r\u00e9el (r\u00e9glez le Worker et relancez SCAN)',
        failed: '\ud83d\udd0c Recharge : \u00e9chec (v\u00e9rifiez la cl\u00e9/connexion)',
        openMaps: '\ud83d\udccd Ouvrir dans Google Maps', opened: '\u2713 Ouvert dans Google Maps', blocked: '\u26a0 Pop-up bloqu\u00e9 \u2014 utilisez \u00ab Ouvrir dans Google Maps \u00bb dans le panneau',
        replan: '\ud83d\udd01 Replanifier d\u2019ici', replanGps: '\ud83d\udccd Acquisition GPS\u2026', replanRun: '\u267b\ufe0f Recalcul\u2026',
        replanStale: '\u26a0 Pas de fix GPS \u2014 derni\u00e8re position enregistr\u00e9e utilis\u00e9e', replanNoGps: '\u26a0 Aucune position GPS disponible', replanNoDest: '\u26a0 Destination introuvable \u2014 relancez SCAN dans le panneau',
        exit: 'Sortie', quad: 'quadrant', limit: 'limite', near: 'pr\u00e8s de',
        notNeeded: 'Non n\u00e9cessaire', notNeededWhy: 'un chargeur r\u00e9el ailleurs couvre d\u00e9j\u00e0 ce tron\u00e7on',
        noPlaceYet: 'aucun lieu associ\u00e9 (position sur l\u2019itin\u00e9raire)',
        extraCharges: 'Recharges suppl\u00e9mentaires n\u00e9cessaires (pas des \u00e9tapes ci-dessus)',
        extraChargesWhy: 'Elles sont dans l\u2019itin\u00e9raire Google Maps. Elles ne sont pas des \u00e9tapes car elles d\u00e9caleraient les arr\u00eats hors de leurs heures favorables.' }
    };
    function chatLang() {
      // Follow the language the user is actually writing in (the same basis the
      // model uses for its reply), so the itinerary card never diverges from the
      // chat. The 🌐 selector (xkdg_ai_lang, mainly for voice) is only a fallback.
      try {
        for (var i = history.length - 1; i >= 0; i--) {
          if (history[i] && history[i].role === 'user' && typeof history[i].content === 'string') {
            var d = detectLang(history[i].content);
            if (d && ITIN_LBL[d]) return d;   // first detectable user message wins
          }
        }
      } catch (e) {}
      var s = null; try { s = localStorage.getItem('xkdg_ai_lang'); } catch (e) {}
      if (s && s !== 'auto' && ITIN_LBL[s]) return s;
      return 'en';
    }
    var _itinChargeEl = null;   // charging line of the latest itinerary bubble (updated in place)
    var _lastItinWrapEl = null; // the itinerary bubble's root element — lets a later
                                 // structural change (stops_changed) REPLACE it in place
                                 // instead of posting a second, duplicate card (session 23)
    var _itinExtraEl = null;    // "extra chargers needed" box of the latest itinerary bubble
    var _itinExitEls = [];      // exit lines of the latest itinerary bubble (place names filled async)
    var _itinStopEls = [];      // numbered STOP lines (place names filled async)
    function stopKindIcon(k) {
      return k === 'charger' ? '\ud83d\udd0c ' : (k === 'fuel' ? '\u26fd ' : ((k === 'services' || k === 'rest_area' || k === 'parking') ? '\ud83c\udd7f\ufe0f ' : ''));
    }
    // SINGLE SOURCE OF TRUTH for "is this stop a charge?".
    // Two independent fields can say so and they do NOT always agree:
    //   it.kind      === 'charge'   -> set when the planner books a stop AS a range charge
    //   it.stopKind  === 'charger'  -> set by findStop() when a stop SNAPS onto a charger
    // A cash/rest stop snapped onto a fast charger has stopKind='charger' but kind='stop',
    // and that is the common case in practice. Testing only it.kind made the row print
    // "Stop 20 min" while paintChargeRow (which tested both) painted it pink: the same row
    // was a charge for the colour and a plain stop for the text. Everything routes here now.
    function isChargeStop(it) {
      return !!it && (it.kind === 'charge' || it.stopKind === 'charger');
    }
    // PINK = a stop where you ACTUALLY plug in (a planned range charge, or a cash stop
    // snapped to a preferred fast charger). Plain cash/rest stops stay unpainted, so
    // the real charging stops jump out at a glance. Re-applied on every async update
    // (the charger name arrives after the itinerary is first drawn).
    function paintChargeRow(rowEl, it) {
      try {
        if (!rowEl || !it) return;
        if (it.redundant) {
          // Proven unnecessary AFTER the fact (session 23): Phase F found the whole
          // trip coverable by real chargers without ever needing this one. Grey it
          // out rather than remove the row — removing would desync the A/B/C… map
          // letters other lines already reference.
          rowEl.style.background = '#f3f3f3';
          rowEl.style.borderLeft = '3px solid #bbb';
          rowEl.style.borderRadius = '7px';
          rowEl.style.padding = '3px 6px 3px 4px';
          rowEl.style.opacity = '0.6';
          return;
        }
        var isCharge = isChargeStop(it);
        rowEl.style.background = isCharge ? '#fdeef4' : '';
        rowEl.style.borderLeft = isCharge ? '3px solid #e91e63' : '';
        rowEl.style.borderRadius = isCharge ? '7px' : '';
        rowEl.style.padding = isCharge ? '3px 6px 3px 4px' : '';
        rowEl.style.opacity = '';
      } catch (e) {}
    }
    function stopLineText(L, it) {
      if (it.redundant) {
        // it.at/it.toward still shown so the row stays legible in context; the
        // duration/charge language is dropped since none of it applies any more.
        return '\u23ed\ufe0f ' + L.notNeeded + ' @ ' + it.at + ' (' + L.notNeededWhy + '), ' + L.then + ' ' + it.toward;
      }
      var what = isChargeStop(it) ? (L.charge + ' ' + (it.duration_min || 20) + ' ' + L.min)
                                  : (L.stop + ' ' + (it.duration_min || 20) + ' ' + L.min);
      var where = it.place ? (' \u2014 ' + stopKindIcon(it.stopKind) + it.place + (it.stopPower ? ' (' + it.stopPower + ')' : '')) : '';
      // Never leave a charge stop with NO location text at all — the real-place snap
      // is async and can still be resolving, or can fail to find anything nearby
      // (session 23: Edu saw a bare "Charge 14 min @ 20:16" with nothing after it).
      if (!where && isChargeStop(it) && !it.redundant) where = ' \u2014 \u26a0\ufe0f ' + L.noPlaceYet;
      var tf = null;
      try { if (it.place && window.TravelPlanner && window.TravelPlanner.cheapestTariff) tf = window.TravelPlanner.cheapestTariff(it.place); } catch (e) {}
      var tariff = tf ? (' \u00b7 \uD83D\uDCB3 ' + tf.card + ' \u20ac' + tf.eur.toFixed(2) + '/kWh') : '';
      var exitInfo = it.cashDir
        ? (' (' + L.exit + ' ' + it.cashDir + (it.limitDeg != null ? ', ' + L.limit + ' ' + it.limitDeg + '\u00b0' : '') + ')')
        : '';
      return what + ' @ ' + it.at + where + tariff + exitInfo + ', ' + L.then + ' ' + it.toward;
    }
    function exitLineText(L, ex) {
      return '\ud83d\udea9 ' + L.exit + ' ' + ex.dir + ' \u00b7 ~' + ex.at +
        (ex.place ? ' \u00b7 ' + L.near + ' ' + ex.place : '') +
        (ex.limitDeg != null ? ' (' + L.limit + ' ' + ex.limitDeg + '\u00b0)' : '');
    }
    function chargingText(L, info) {
      if (!info) return L.chPending;
      if (info.error === 'no_key') return L.noKey;
      if (info.error === 'no_range') return L.noRange;
      if (info.error === 'no_route') return L.noRoute;
      if (info.error === 'not_needed') {
        var nn = { it: '🔌 Ricarica: viaggio entro l\u2019autonomia, nessuna sosta necessaria',
                   fr: '🔌 Recharge : trajet dans l\u2019autonomie, aucun arr\u00eat n\u00e9cessaire',
                   en: '🔌 Charging: trip within range, no stop needed' };
        return nn[chatLang()] || nn.en;
      }
      if (info.error === 'none') return L.none;
      if (info.error) return L.failed;
      var extra = (info.kw ? ' \u00b7 ' + Math.round(info.kw) + ' kW' : '') + (info.km != null ? ' \u00b7 ~' + info.km + ' km' : '');
      var tail = [L.addedMaps];
      if (info.lowPower) tail.push(L.lowPow);
      if (info.fallback) tail.push(L.otherNet);
      if (info.count && info.count > 1) tail.push('+' + (info.count - 1) + ' ' + L.moreStops);
      return L.ch + ': ' + (info.name || 'station') + extra + ' (' + tail.join(' \u00b7 ') + ')';
    }
    // Build the small "favourable directions this hour" summary shown above the
    // rotating chart, so the user sees at a glance which directions are favourable
    // and which the road direction is.
    function buildHourFavSummary(h) {
      var favs = (h.favourable_dirs || []).map(function (d) {
        var road = (d.dir === h.roadDir) ? ' \u25c4 road' : '';
        return '<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 7px;border-radius:10px;background:#e8f5e9;border:1px solid #66bb6a;color:#1b5e20;font-size:12px;">' +
          d.dir + ' \u00b7 P' + d.palace + (d.palaceName ? (' ' + d.palaceName) : '') +
          (d.door ? (' \u00b7 ' + d.door) : '') + (d.sanqi ? ' \u00b7 \u4e09\u5947' : '') +
          (d.score != null ? (' \u00b7 ' + d.score) : '') + road + '</span>';
      }).join('');
      if (!favs) favs = '<span style="color:#888;font-size:12px;">No favourable travel direction this hour (neutral).</span>';
      var roadLine = '<div style="font-size:12px;color:#444;margin-bottom:4px;">Road direction toward destination: <b>' +
        h.roadDir + '</b> (palace ' + h.palace + (h.palaceName ? (' ' + h.palaceName) : '') + ') \u2014 ' +
        (h.fortunate ? '<span style="color:#1b5e20;font-weight:600;">favourable \u2713</span>'
                     : '<span style="color:#b58900;font-weight:600;">neutral</span>') + '</div>';
      return '<div style="background:#fff;border-radius:10px;padding:10px 12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">' +
        '<div style="font-weight:700;margin-bottom:6px;">' + h.from + '\u2013' + h.to + (h.ganzhi ? (' \u00b7 ' + h.ganzhi) : '') + '</div>' +
        roadLine +
        '<div style="font-size:12px;color:#444;margin:6px 0 3px;">Favourable directions this hour (rotating QMDJ):</div>' +
        '<div>' + favs + '</div></div>';
    }
    // Open the ROTATING QMDJ chart for one hour (the correct chart for travel
    // directions), with the favourable-directions summary on top.
    // Lens on an Hours row: open a 2-tab overlay so you can SEE both views for that
    // hour and switch freely (\u2715 = back): the QMDJ rotating chart, and the XKDG
    // LIST row (its XKDG setting + the graded lucky-date score that feeds the bonus).
    var _BR2I = { '\u5b50':0,'\u4e11':1,'\u5bc5':2,'\u536f':3,'\u8fb0':4,'\u5df3':5,'\u5348':6,'\u672a':7,'\u7533':8,'\u9149':9,'\u620c':10,'\u4ea5':11 };
    // Shared overlay used by the in-chat listings: a panel over the chat with a
    // Back button (\u2190) and a \u2715, matching the rest of the app's row\u2192XKDG /
    // button\u2192Qimen pattern. Content is the SAME html as the Main listing.
    function _vbOverlay(html, accent) {
      accent = accent || '#6a1b9a';
      var ex = document.getElementById('xkdg-vb-overlay'); if (ex) ex.remove();
      var ov = document.createElement('div');
      ov.id = 'xkdg-vb-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100000;overflow:auto;padding:18px;';
      var box = document.createElement('div');
      box.style.cssText = 'max-width:520px;width:100%;margin:24px auto;background:#fff;border-radius:12px;padding:10px;';
      var back = document.createElement('button');
      back.textContent = '\u2190 Back';
      back.style.cssText = 'margin-bottom:10px;padding:6px 12px;border:1px solid ' + accent + ';background:#fff;color:' + accent + ';border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;';
      back.onclick = function () { ov.remove(); };
      var inner = document.createElement('div');
      inner.innerHTML = html;
      box.appendChild(back); box.appendChild(inner);
      var close = document.createElement('button');
      close.textContent = '\u2715';
      close.style.cssText = 'position:fixed;top:12px;right:14px;z-index:100001;background:' + accent + ';color:#fff;border:0;border-radius:50%;width:38px;height:38px;font-size:17px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
      close.onclick = function () { ov.remove(); };
      ov.appendChild(box); ov.appendChild(close);
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }
    // Click a listing ROW \u2192 that hour's XKDG (same content as the Main listing).
    function openHourXKDG(h) {
      var xkdgHtml = '';
      try {
        var hi = (h && h.hZhi != null) ? _BR2I[h.hZhi] : null;
        if (typeof window.tpGetListRowHtml === 'function' && h && h.iso && hi != null) xkdgHtml = window.tpGetListRowHtml(h.iso, hi) || '';
      } catch (e) {}
      if (!xkdgHtml) { try { addBubble('assistant', '\u26A0 No XKDG row \u2014 run a trip scan first.'); } catch (e2) {} return; }
      _vbOverlay('<div style="font-weight:700;color:#1565c0;margin-bottom:6px;">\uD83D\uDD35 XKDG \u00b7 ' + (h.from || '') + '\u2013' + (h.to || '') + '</div>' + xkdgHtml, '#1565c0');
    }
    // The \uD83D\uDD0D button \u2192 that hour's Qimen rotating chart only.
    function openHourQimen(h) {
      var qimenHtml = '';
      try {
        if (typeof window.showQimenChart === 'function' && h && h.iso && h.hGan && h.hZhi) {
          var chart = window.showQimenChart(h.iso, h.hGan, h.hZhi, h.palace, { mode: 'rotating', returnHtml: true });
          if (chart) qimenHtml = buildHourFavSummary(h) + chart;
        }
      } catch (e) {}
      if (!qimenHtml) { try { addBubble('assistant', '\u26A0 Could not open the Qimen chart for this hour.'); } catch (e2) {} return; }
      _vbOverlay('<div style="font-weight:700;color:#6a1b9a;margin-bottom:6px;">\uD83E\uDDED Qimen hour \u00b7 ' + (h.from || '') + '\u2013' + (h.to || '') + '</div>' + qimenHtml, '#6a1b9a');
    }
    // Every 时辰 of the trip, classified CASH / DETOUR / DRIVE, with its QMDJ setting,
    // stop length and a 🔍 button for its rotating chart — but INDEXED BY ITINERARY STEP
    // instead of listed in a parallel panel. The card used to show the same journey twice
    // (once per stop, once per hour); now each stop owns its own hours behind an expand.
    // Returns { byRef: {'at A': [el…], '→ B': [el…]}, favByRef, summary }.
    function hourDetailIndex(hours, L, stepList, prose) {
      var out = { byRef: {}, favByRef: {}, summary: '' };
      if (!hours || !hours.length) return out;
      stepList = stepList || [];
      function toMin(s) { var p = String(s || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
      var baseMin = stepList.length ? toMin(stepList[0].from || stepList[0].at) : 0;
      function norm(s) { var m = toMin(s); return m < baseMin ? m + 1440 : m; }
      // Which numbered itinerary step(s) does this hour fall in? (the Drive leg that
      // contains it, plus the Stop at its end for a cash hour).
      function stepRef(h) {
        var hf = norm(h.from), ht = norm(h.to), driveTo = null, stopL = null;
        stepList.forEach(function (s) {
          if (s.kind === 'drive') { if (norm(s.from) <= hf && norm(s.to) >= ht) driveTo = s.toLetter; }
          else if (s.kind === 'stop') {
            if (s.at === h.to) stopL = s.letter;                              // rest stop sitting on this hour's boundary
            else if (stopL == null && norm(s.at) > hf && norm(s.at) <= ht) stopL = s.letter;  // CASH/DETOUR stop falling INSIDE this hour
          }
        });
        if (stopL != null) return 'at ' + stopL;            // cash hour ends AT this map point
        if (driveTo != null) return '\u2192 ' + driveTo;     // driving TOWARD this map point
        return '';
      }
      function _hrFortunate(h){ return h.kind === 'cash' || h.kind === 'detour'; }
      function _hrScore(h){ return (h.kind === 'cash') ? (h.score != null ? h.score : 0)
        : (h.kind === 'detour' && h.detour ? (h.detour.score != null ? h.detour.score : 0) : 0); }
      var _maxHrScore = 0; hours.forEach(function (h) { if (_hrFortunate(h)) _maxHrScore = Math.max(_maxHrScore, _hrScore(h)); });
      function _hrStar(h){ if (!_hrFortunate(h)) return ''; return (_hrScore(h) === _maxHrScore && _maxHrScore > 0) ? '\u2b50\u2b50' : '\u2b50'; }
      var _nCash = hours.filter(function (h) { return h.kind === 'cash'; }).length;
      var _nDet = hours.filter(function (h) { return h.kind === 'detour'; }).length;
      var _nFav = _nCash + _nDet, _nNo = hours.length - _nFav;
      // ONE unified count: favourable = cash + detour (a detour IS a favourable hour —
      // you deviate toward a fortunate direction).
      out.summary = '\u23f1 ' + _nFav + '/' + hours.length + ' ' + L.favourable + ' (' + _nCash + ' cash + ' + _nDet + ' detour)' +
        (_nNo ? ' \u00b7 ' + _nNo + ' ' + L.noWindow : '');
      hours.forEach(function (h) {
        var isCash = (h.kind === 'cash'), isDetour = (h.kind === 'detour');
        var border = isCash ? '#43a047' : (isDetour ? '#f9a825' : '#bbb');
        var bg = isCash ? '#f1f8f2' : (isDetour ? '#fff8e1' : '#f7f7f7');
        var fg = isCash ? '#1b5e20' : (isDetour ? '#8a6d00' : '#666');
        var row = elc('div', { style:
          'display:flex;align-items:flex-start;gap:6px;margin:3px 0;padding:5px 8px;border-radius:7px;border-left:3px solid ' +
          border + ';background:' + bg + ';font-size:12px;cursor:pointer;' });
        row.title = 'Tap for XKDG';
        row.addEventListener('click', function () { openHourXKDG(h); });
        var head1, detail;
        if (isCash) {
          head1 = h.from + '\u2013' + h.to + ' \u00b7 CASH toward ' + h.roadDir + ' \u00b7 P' + h.palace + (h.palaceName ? (' ' + h.palaceName) : '');
          detail = (h.setting ? ('setting: ' + h.setting) : '') +
                   (h.score != null ? (' \u00b7 score ' + h.score) : '') +
                   (h.cash_min ? (' \u00b7 stop ~' + h.cash_min + ' min') : '');
        } else if (isDetour) {
          head1 = h.from + '\u2013' + h.to + ' \u00b7 DETOUR toward ' + h.detour.dir + ' \u00b7 P' + h.detour.palace + (h.detour.palaceName ? (' ' + h.detour.palaceName) : '') +
                  ' (road ' + h.roadDir + ' neutral)';
          detail = (h.detour.setting ? ('setting: ' + h.detour.setting) : '') + (h.detour.score != null ? (' \u00b7 score ' + h.detour.score) : '');
        } else {
          head1 = h.from + '\u2013' + h.to + ' \u00b7 DRIVE toward ' + h.roadDir + ' \u00b7 no fortunate window (no cash)';
          detail = '';
        }
        // XKDG marker: show when this hour communicates with the traveller(s) (its
        // graded lucky-date score is positive) \u2014 including direction-unfavourable
        // hours, where the XKDG is the only positive and earns the small bonus.
        if (h.xkPositive && h.hourScore != null) {
          var _xk = ' \u00b7 \uD83D\uDD35 XKDG ' + h.hourScore + (isCash ? '' : ' (direction n/a)');
          detail = detail ? (detail + _xk) : ('\uD83D\uDD35 XKDG ' + h.hourScore + (isCash ? '' : ' \u2014 communicates with the traveller(s), direction not favourable'));
        }
        var txtWrap = elc('div', { style: 'flex:1;color:' + fg + ';' });
        var ref = stepRef(h);
        // The plain-language sentence for this 时辰, if the story built one.
        var _pr = prose ? prose[(h.from || '') + '|' + (h.to || '')] : null;
        var headRow = elc('div', { style: 'font-weight:600;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;' });
        var _star = _hrStar(h);
        if (_star) headRow.appendChild(elc('span', { style: 'flex:none;font-size:12px;' }, _star));
        headRow.appendChild(elc('span', {}, head1));   // the 'at A' chip is gone: the row now sits INSIDE A
        txtWrap.appendChild(headRow);
        if (detail) txtWrap.appendChild(elc('div', { style: 'color:#555;margin-top:1px;' }, detail));
        if (_pr) {
          var _prEl = elc('div', { style: 'color:#444;margin-top:3px;font-size:12px;line-height:1.5;font-style:italic;' });
          _prEl.innerHTML = _pr;
          txtWrap.appendChild(_prEl);
        }
        var btn = elc('button', { style:
          'flex:none;background:#6a1b9a;color:#fff;border:0;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;' }, '\uD83D\uDD0D');
        btn.title = 'Qimen chart';
        btn.addEventListener('click', function (ev) { ev.stopPropagation(); openHourQimen(h); });
        row.appendChild(txtWrap); row.appendChild(btn);
        var key = ref || '\u2014';
        (out.byRef[key] = out.byRef[key] || []).push(row);
        // Does this step have ANY fortunate hour? Edu: a stop with no favourable direction
        // must be visible WITHOUT opening the expand.
        if (_hrFortunate(h)) out.favByRef[key] = true;
        else if (!(key in out.favByRef)) out.favByRef[key] = false;
      });
      return out;
    }
    // Plain-language, one-line-per-stop journey story built from the FINISHED plan
    // (real stops, times, cash/detour). 🔴 for stops (A,B,C…), 🔵 for recharges,
    // **cash** / **detour** in bold, closing with "Buon Viaggio". Returns a DOM node.
    function addItineraryBubble(payload) {
      payload = payload || {};
      var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
      var _proseByHour = null, _closingProse = '';
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:14px;line-height:1.5;word-wrap:break-word;' });
      var distline = payload.real_route
        ? (L.realRoad + (payload.km != null ? ' ' + payload.km + ' km' : '') + (payload.driving_time ? ' \u00b7 ' + payload.driving_time + ' ' + L.driving : ''))
        : L.estimate;
      var title = (payload.origin || 'Origin') + ' \u2192 ' + (payload.dest || 'Destination') +
        (payload.snapped ? ' \u00b7 ' + payload.snapped + (payload.bearing != null ? ' ' + payload.bearing + '\u00b0' : '') : '') +
        ' \u00b7 ' + distline;
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:4px;' }, title));
      // ---- Plain-language per-hour story (PRESENTATION ONLY — reads the plan's own
      //      fields: ganzhi, kind cash/detour, roadDir, detour.dir, door, arrival_cash).
      //      No logic is computed here; everything is already decided by the planner. ----
      try {
        var _H = payload.hours || [], _slegs = payload.legs || [];
        if (_H.length) {
          var _stops = [], _li = 0;
          _slegs.forEach(function (l) {
            if (l.kind === 'stop' || l.kind === 'charge') {
              _stops.push({ letter: String.fromCharCode(65 + _li), at: l.at || '', place: l.place || '', charge: isChargeStop(l), dur: l.duration_min || 20 });
              _li++;
            }
          });
          // Each stop belongs to exactly ONE hour: the window whose END it reaches
          // (from-exclusive, to-inclusive) — the cash is done just before that hour closes.
          // Each stop belongs to exactly ONE hour: the window whose END it reaches
          // (from-exclusive, to-inclusive). Compare in MINUTES and handle windows that
          // cross midnight (e.g. 22:22–00:22), otherwise a 00:07 stop is wrongly excluded.
          var _toMin = function (t) { var p = String(t || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); };
          var _inWin = function (a, b) {
            if (!a || !b) return [];
            var am = _toMin(a), bm = _toMin(b), wrap = bm < am;
            return _stops.filter(function (s) {
              if (!s.at) return false;
              var sm = _toMin(s.at);
              return wrap ? (sm > am || sm <= bm) : (sm > am && sm <= bm);
            });
          };
          var _rows = [];
          _proseByHour = {};      // 'from|to' -> the sentence for that 时辰 (goes in the step's expand)
          _H.forEach(function (h) {
            var win = (h.from || '') + '\u2013' + (h.to || '');
            var gz = h.ganzhi ? (' ' + h.ganzhi) : '';
            var line = '\u23F1 <b>Ora' + gz + '</b> (' + win + ') \u2014 ';
            var here = _inWin(h.from, h.to);
            if (h.kind === 'detour') {
              var _dd = h.detour ? h.detour.dir : null;
              line += 'la direzione <b>' + (h.roadDir || '?') + '</b> non \u00e8 favorevole, quindi <b>detour</b> verso <b>' + (_dd || '?') + '</b> (a fianco, favorevole)' + (h.detour && h.detour.door ? ' (porta ' + h.detour.door + ')' : '') + ' \u2014 qui si fa <b>cash</b>.';
            } else if (h.kind === 'cash') {
              line += 'direzione <b>' + (h.roadDir || '?') + '</b> favorevole \u2014 ora da <b>cash</b>' + (h.door ? ' (porta ' + h.door + (h.score != null ? ', score ' + h.score : '') + ')' : '') + '.';
            } else {
              line += 'nessuna direzione favorevole in quest\u2019ora \u2014 prosegui verso ' + (h.roadDir || '?') + '.';
            }
            _rows.push(line);
            _proseByHour[(h.from || '') + '|' + (h.to || '')] = line;
            here.forEach(function (s) {
              var t = '\uD83D\uDD34 <b>' + s.letter + '</b> \u00b7 alle <b>' + s.at + '</b>' + (s.place ? ' \u00b7 ' + s.place : '');
              if (h.kind === 'cash' || h.kind === 'detour') t += ' \u00b7 qui <b>fermati \u226520 min per fare cash</b>';
              if (s.charge) t += ' e \uD83D\uDD35 ricarica ~' + s.dur + ' min';
              _rows.push(t);
            });
            // Favourable hour with NO stop of its own → its cash is collected on arrival.
            if ((h.kind === 'cash' || h.kind === 'detour') && !here.length && payload.arrival_cash_note) {
              _rows.push('\u21b3 <i>il cash di quest\u2019ora si incassa arrivando (nessuna sosta intermedia)</i>');
            }
          });
          // The arrival note is the only sentence that belongs to no single hour, so it
          // stays visible; everything else moved into the per-step expands.
          if (payload.arrival_cash_note) {
            _closingProse = '\uD83C\uDFC1 Arrivi a <b>' + (payload.dest || '') + '</b> <b>dentro un\u2019ora favorevole</b>: l\u2019arrivo stesso \u00e8 il <b>cash</b> \u2014 le ore favorevoli senza sosta si chiudono cos\u00ec.';
          }
        }
      } catch (eStory) { _proseByHour = null; }
      // ---- Map-letter alignment ---------------------------------------------------
      // Google Maps labels POINTS: origin = A, each stop = B, C, ... (in route order),
      // destination = the next letter. Drives are the lines BETWEEN letters, not points.
      // So we letter the points here to match the pins on the map, and render drives as
      // connectors that show which letter they head to. (Default Maps export keeps every
      // stop in route order, so these letters line up with the pins.)
      function letterChar(i) { return String.fromCharCode(65 + (i < 0 ? 0 : i)); }
      function ptBadge(letter, color) {
        return elc('span', { style:
          'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;' +
          'background:' + (color || '#1565c0') + ';color:#fff;font-size:11px;font-weight:700;margin-right:7px;margin-top:1px;flex:none;' }, letter);
      }
      function ptLine(letter, color, text) {
        var row = elc('div', { style: 'display:flex;align-items:flex-start;margin:3px 0;' });
        row.appendChild(ptBadge(letter, color));
        var tx = elc('span', { style: 'flex:1;min-width:0;' }, text);
        row.appendChild(tx);
        return { row: row, tx: tx };
      }
      var legs = payload.legs || [];
      var stopLetters = [], _p = 0;
      legs.forEach(function (it) { if (it.kind !== 'drive') { stopLetters.push(letterChar(_p)); _p++; } });
      var destLetter = letterChar(_p);     // Maps letters waypoints+dest only (origin unlettered); dest = after last stop
      var _hrs = payload.hours || [];
      function _fFort(h){ return h.kind === 'cash' || h.kind === 'detour'; }
      function _fScore(h){ return (h.kind === 'cash') ? (h.score != null ? h.score : 0)
        : (h.kind === 'detour' && h.detour ? (h.detour.score != null ? h.detour.score : 0) : 0); }
      var _maxFort = 0; _hrs.forEach(function (h) { if (_fFort(h)) _maxFort = Math.max(_maxFort, _fScore(h)); });
      // Map each fortunate hour to the itinerary letter of the stop that falls INSIDE
      // it (or exactly at its end) — the SAME interval rule the Hours strips use via
      // stepRef. The previous exact-minute match (stop time === hour end) silently
      // dropped stars whenever a stop sat inside the hour (e.g. stop 15:49 in an hour
      // ending 16:04), which is why the route list showed fewer stars than the strips.
      var _letterTimes = []; (function () { var k = 0; legs.forEach(function (it) {
        if (it.kind === 'drive') { if (it.arrival) _letterTimes.push({ letter: destLetter, at: it.to }); }
        else { _letterTimes.push({ letter: stopLetters[k], at: it.at }); k++; } }); })();
      function _lMin(s) { var p = String(s || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
      // Base = the trip's FIRST time (departure), not the first stop: with the first
      // stop as base, the first hour's start (which precedes it) would wrap past
      // midnight and the first stop would lose its star.
      var _lBase = (function () { for (var i = 0; i < legs.length; i++) { var t = (legs[i].kind === 'drive') ? legs[i].from : legs[i].at; if (t) return _lMin(t); } return 0; })();
      function _lNorm(s) { var m = _lMin(s); return m < _lBase ? m + 1440 : m; }
      var _fortByLetter = {};
      var _xkByLetter = {};   // #2: which letters also have a favourable XKDG person-hour
      _hrs.forEach(function (h) {
        // Track XKDG-positive hours separately from Qimen-direction (cash/detour) hours,
        // so the star can show WHICH kind of luck it is (see _starFor below).
        var hf0 = _lNorm(h.from), ht0 = _lNorm(h.to);
        if (h.xkPositive) {
          for (var xi = 0; xi < _letterTimes.length; xi++) {
            var lx = _letterTimes[xi];
            if (lx.at === h.to || (_lNorm(lx.at) > hf0 && _lNorm(lx.at) <= ht0)) {
              var xsc = (h.hourScore != null ? h.hourScore : 1);
              if (_xkByLetter[lx.letter] == null || xsc > _xkByLetter[lx.letter]) _xkByLetter[lx.letter] = xsc;
              if (lx.at === h.to) break;
            }
          }
        }
        if (!_fFort(h)) return;
        var hf = _lNorm(h.from), ht = _lNorm(h.to), Lk = null;
        for (var li = 0; li < _letterTimes.length; li++) {
          var lt = _letterTimes[li];
          if (lt.at === h.to) { Lk = lt.letter; break; }                       // stop exactly at the hour end
          if (Lk == null && _lNorm(lt.at) > hf && _lNorm(lt.at) <= ht) Lk = lt.letter;  // stop INSIDE the hour
        }
        if (!Lk) return;
        var sc = _fScore(h); var cur = _fortByLetter[Lk]; if (cur == null || sc > cur) _fortByLetter[Lk] = sc; });
      // Star legend: GOLD star(s) = favourable Qimen DIRECTION (cash), gold double =
      // best-of-trip; a BLUE circle is appended when that stop's hour is ALSO a
      // favourable XKDG person-hour (a distinct kind of luck from the direction).
      function _starFor(letter){
        var s = '';
        if (letter in _fortByLetter) s = (_fortByLetter[letter] === _maxFort && _maxFort > 0) ? '\u2b50\u2b50' : '\u2b50';
        if (letter in _xkByLetter) s += '\uD83D\uDD35';   // blue circle = XKDG person-hour luck
        return s;
      }

      var listEl = elc('div', { style: 'margin:0;' });
      _itinStopEls = [];
      var stepList = [];   // map itinerary steps to times AND to map letters
      // Two passes: the first only needs the times+letters so the hour index can be built,
      // the second draws the rows and hangs each step's hours inside its own expand.
      (function () {
        var k = 0;
        legs.forEach(function (it) {
          if (it.kind === 'drive') stepList.push({ kind: 'drive', from: it.from, to: it.to, toLetter: it.arrival ? destLetter : (stopLetters[k] || destLetter) });
          else { stepList.push({ kind: 'stop', at: it.at, letter: stopLetters[k] }); k++; }
        });
      })();
      var _hIdx = hourDetailIndex(payload.hours, L, stepList, _proseByHour);
      // Hang a step's 时辰 rows under its own line, CLOSED by default (Edu): collapsed you
      // see the whole trip on one screen; open one step and you get its hours, its QMDJ
      // setting and its 🔍 charts. `noWin` paints the grey badge that must stay visible
      // WITHOUT expanding — a stop with no favourable direction has to be readable at a glance.
      function attachDetail(rowEl, ref) {
        var rows = _hIdx.byRef[ref];
        if (!rows || !rows.length) return null;
        if (_hIdx.favByRef[ref] === false) {
          rowEl.appendChild(elc('span', { style:
            'flex:none;margin-left:5px;background:#eee;color:#666;border:1px solid #ddd;border-radius:9px;' +
            'padding:0 6px;font-size:10px;font-weight:700;white-space:nowrap;' }, L.noWindow));
        }
        var body = elc('div', { style: 'display:none;margin:1px 0 5px 25px;' });
        rows.forEach(function (r) { body.appendChild(r); });
        var tog = elc('button', { style:
          'flex:none;margin-left:5px;background:#f3eef8;color:#4527a0;border:1px solid #e0d4e8;border-radius:6px;' +
          'padding:1px 6px;font-size:11px;font-weight:700;cursor:pointer;line-height:1.5;' }, '\u25b8');
        tog.title = 'Details';
        tog.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var open = (body.style.display !== 'none');
          body.style.display = open ? 'none' : 'block';
          tog.textContent = open ? '\u25b8' : '\u25be';
        });
        rowEl.appendChild(tog);
        return body;
      }
      // Origin (green like the Maps start pin)
      listEl.appendChild(ptLine('', '#2e7d32', (payload.origin || 'Origin')).row);   // start dot, no letter (Maps does not letter the origin)
      var si = 0;
      legs.forEach(function (it) {
        if (it.kind === 'drive') {
          var toL = it.arrival ? destLetter : (stopLetters[si] || destLetter);
          var dtxt = L.drive + ' ' + it.from + ' \u2192 ' + it.to + ' (' + it.hours + 'h) ' + L.toward + ' ' + it.toward + ' \u00b7 \u2192 ' + toL;
          var dRow = elc('div', { style: 'display:flex;align-items:baseline;margin:2px 0 2px 25px;color:#555;font-size:13px;' });
          dRow.appendChild(elc('span', { style: 'flex:1;' }, dtxt));
          listEl.appendChild(dRow);
          var dBody = attachDetail(dRow, '\u2192 ' + toL);
          if (dBody) listEl.appendChild(dBody);
          if (it.arrival) {
            var aPl = ptLine(destLetter, '#c62828', L.arrive + ' ' + (payload.dest || '') + (_starFor(destLetter) ? (' ' + _starFor(destLetter)) : ''));
            listEl.appendChild(aPl.row);
            var aBody = attachDetail(aPl.row, 'at ' + destLetter);
            if (aBody) listEl.appendChild(aBody);
          }
        } else {
          var letter = stopLetters[si]; si++;
          var pl = ptLine(letter, '#1565c0', stopLineText(L, it));
          paintChargeRow(pl.row, it);
          var _st = _starFor(letter);
          if (_st) pl.row.appendChild(elc('span', { style: 'flex:none;margin-left:4px;font-size:13px;' }, _st));
          listEl.appendChild(pl.row);
          var _meta = elc('div', { style: 'margin:1px 0 5px 25px;font-size:12px;line-height:1.35;' });
          fillStopMeta(_meta, it);
          listEl.appendChild(_meta);
          var sBody = attachDetail(pl.row, 'at ' + letter);
          if (sBody) listEl.appendChild(sBody);
          _itinStopEls.push({ el: pl.tx, row: pl.row, it: it, meta: _meta });
        }
      });
      wrap.appendChild(listEl);
      if (_closingProse) {
        var _clo = elc('div', { style: 'margin-top:6px;font-size:13px;line-height:1.5;color:#333;' });
        _clo.innerHTML = _closingProse;
        wrap.appendChild(_clo);
      }
      if (_hIdx.summary) wrap.appendChild(elc('div', { style:
        'margin-top:7px;padding:5px 8px;background:#f3eef8;border:1px solid #e0d4e8;border-radius:7px;' +
        'font-size:12px;font-weight:600;color:#4527a0;' }, _hIdx.summary));
      // Legend: what the markers mean. The strips themselves now live inside each step.
      wrap.appendChild(elc('div', { style: 'font-size:11px;color:#777;margin:3px 0 0;padding:0 2px;line-height:1.4;' },
        '\u25b8 ' + L.tapDetails + ' \u00b7 \u2b50 ' + L.favDir + ' \u00b7 \u2b50\u2b50 ' + L.bestTrip + ' \u00b7 \uD83D\uDD35 ' + L.xkHour));
      _itinExitEls = [];
      // Container for chargers the planner needs but that pair with no cash stop —
      // filled async by updateItineraryStops once Phase F resolves (session 23).
      _itinExtraEl = elc('div', { style: 'display:none;margin-top:7px;padding:6px 8px;border-radius:7px;background:#fff8e1;border:1px solid #ffb74d;font-size:12px;line-height:1.45;color:#7a4f00;' });
      wrap.appendChild(_itinExtraEl);
      if (payload.charging_pending || payload.charging) {
        _itinChargeEl = elc('div', { style: 'margin-top:6px;font-size:13px;color:#444;' }, chargingText(L, payload.charging || null));
        wrap.appendChild(_itinChargeEl);
      } else { _itinChargeEl = null; }
      var mapsBtn = elc('button', { style:
        'margin-top:9px;width:100%;padding:9px;border:0;border-radius:8px;background:#1565c0;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, L.openMaps);
      mapsBtn.addEventListener('click', function () {
        var r = null;
        try { if (window.TravelPlanner && window.TravelPlanner.openInMaps) r = window.TravelPlanner.openInMaps(); } catch (e) {}
        if (r && r.opened === false) mapsBtn.textContent = L.blocked;
        else mapsBtn.textContent = L.opened;
      });
      wrap.appendChild(mapsBtn);
      // "Replan from here" — roadblock/detour rescue. Takes a FRESH GPS fix, keeps the
      // destination + EV parameters already in the planner, departs NOW (exact minute, no
      // double-hour snap: the hour start would lie in the past) and re-runs the plan. The
      // new itinerary posts itself into the chat as usual.
      var replanBtn = elc('button', { style:
        'margin-top:6px;width:100%;padding:9px;border:1px solid #e65100;border-radius:8px;background:#fff;color:#e65100;font-size:13px;font-weight:600;cursor:pointer;' }, L.replan);
      replanBtn.addEventListener('click', function () {
        function num(id) { var e = document.getElementById(id); return e ? parseFloat(e.value) : NaN; }
        var dLat = num('tp-dlat'), dLon = num('tp-dlon');
        if (!isFinite(dLat) || !isFinite(dLon)) { replanBtn.textContent = L.replanNoDest; return; }
        replanBtn.textContent = L.replanGps; replanBtn.disabled = true;
        freshGps(12000).then(function (pos) {
          if (!pos) { replanBtn.textContent = L.replanNoGps; replanBtn.disabled = false; return; }
          if (!pos.fresh) { try { addBubble('assistant', L.replanStale); } catch (e) {} }
          replanBtn.textContent = L.replanRun;
          var now = new Date();
          var range = num('tp-range'), reserve = num('tp-reserve'), utcv = num('tp-utc');
          try { window._tpNoSnap = true; window._tpAutoDepart = false; } catch (e) {}
          try {
            window.TravelPlanner.openPrefilled({
              originLat: pos.lat, originLon: pos.lon, originName: 'Current position (GPS)',
              destLat: dLat, destLon: dLon,
              destName: (window._tpNames && window._tpNames.dest) || payload.dest || null,
              departDate: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'),
              departTime: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
              autoDepart: false,
              utc: isFinite(utcv) ? utcv : undefined,
              dst: (typeof dstActiveOn === 'function') ? dstActiveOn(now) : undefined,
              rangeKm: isFinite(range) ? range : null,
              reserveKm: isFinite(reserve) ? reserve : null,
              run: true
            });
          } catch (e) { replanBtn.textContent = '\u26a0 ' + ((e && e.message) || 'error'); }
        });
      });
      wrap.appendChild(replanBtn);
      // Structural rebuild (session 23): a merged "extra" charger changes the NUMBER
      // of steps, not just a field on an existing one — the incremental patch pattern
      // every other async update uses (mutate a field, refresh the DOM) cannot add a
      // whole new lettered row safely. Rebuilding this same function from the FINAL,
      // settled _tpLastResult and swapping it in for the old bubble is simpler and
      // safer than patching structure into place, and it only happens once (after
      // Phase F settles), not repeatedly.
      if (payload._rebuild && _lastItinWrapEl && _lastItinWrapEl.parentNode === msgs) {
        msgs.replaceChild(wrap, _lastItinWrapEl);
      } else {
        msgs.appendChild(wrap);
      }
      _lastItinWrapEl = wrap;
      msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }
    // Injected after a CITY TOUR is computed: a compact ordered list of the stops
    // plus a one-tap "Open in Google Maps" button that opens the WHOLE walk (base +
    // every stop, in visiting order). A real tap, so the browser won't block it.
    function addCityTourBubble(payload) {
      payload = payload || {};
      var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
      var stops = payload.stops || [];
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:13px;line-height:1.5;word-wrap:break-word;' });
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:4px;' },
        '\uD83D\uDDFA City tour \u00b7 ' + (payload.base || 'Base') + (payload.date ? (' \u00b7 ' + payload.date) : '')));
      function badge(letter) {
        return elc('span', { style:
          'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;' +
          'background:#1565c0;color:#fff;font-size:11px;font-weight:700;margin-right:7px;flex:none;' }, letter);
      }
      // Google letters the origin A, then each stop B, C, ... so they line up with the pins.
      var baseRow = elc('div', { style: 'display:flex;align-items:flex-start;margin:2px 0;' });
      baseRow.appendChild(badge('A'));
      baseRow.appendChild(elc('span', { style: 'flex:1;min-width:0;color:#555;' }, (payload.base || 'Base') + ' \u2014 start'));
      wrap.appendChild(baseRow);
      stops.forEach(function (s, i) {
        var row = elc('div', { style: 'display:flex;align-items:flex-start;margin:2px 0;' });
        row.appendChild(badge(String.fromCharCode(66 + (i % 25))));
        var meta = [];
        if (s.direction) meta.push(s.direction + (s.bearing != null ? (' ' + s.bearing + '\u00b0') : ''));
        if (s.brPy || s.br) meta.push(s.brPy || s.br);
        if (s.doorLabel) meta.push('\uD83D\uDEAA ' + s.doorLabel);
        if (s.hop_km != null && i > 0) meta.push('+' + s.hop_km + ' km');
        var line = (s.place || 'Stop') + (meta.length ? (' \u00b7 ' + meta.join(' \u00b7 ')) : '');
        row.appendChild(elc('span', { style: 'flex:1;min-width:0;' }, line));
        wrap.appendChild(row);
      });
      if (payload.maps_url) {
        var btn = elc('button', { style:
          'margin-top:7px;background:#1565c0;color:#fff;border:0;border-radius:8px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;' },
          L.openMaps);
        btn._url = payload.maps_url;
        btn.addEventListener('click', function () {
          var u = btn._url, w = null;
          try { w = window.open(u, '_blank'); } catch (e) {}
          if (!w) { try { window.location.href = u; } catch (e) {} }
          btn.textContent = L.opened;
        });
        wrap.appendChild(btn);
      }
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }
    // Share arbitrary text via the OS share sheet (WhatsApp, mail...) or clipboard.
    function shareText(title, text) {
      try { if (navigator.share) { navigator.share({ title: title, text: text }).catch(function () {}); return; } } catch (e) {}
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { try { alert('Itinerary copied to clipboard.'); } catch (e) {} }).catch(function () {});
          return;
        }
      } catch (e) {}
      try { window.prompt('Copy the itinerary:', text); } catch (e) {}
    }

    // Plain-text version of a lucky-trip payload, for sharing with a friend.
    function dayTripText(payload) {
      var out = [];
      out.push('Lucky trip' + (payload.origin ? (' - ' + payload.origin) : '') + (payload.date ? (' - ' + payload.date) : ''));
      (payload.proposals || []).forEach(function (p, i) {
        out.push((i + 1) + '. ' + (p.direction || '') + (p.place ? (' - ' + p.place) : (p.km != null ? (' (~' + p.km + ' km)') : '')));
        var t = [];
        if (p.depart && p.arrive) t.push('go ' + p.depart + '-' + p.arrive);
        if (p.return_depart && p.return_arrive) t.push('back ' + p.return_depart + '-' + p.return_arrive);
        if (p.score != null) t.push('score ' + p.score + '/5');
        if (t.length) out.push('   ' + t.join('  '));
        if (p.dest_lat != null) out.push('   https://www.google.com/maps/search/?api=1&query=' + p.dest_lat + ',' + p.dest_lon);
      });
      return out.join('\n');
    }

    // Injected after plan_lucky_chain: one box per closed loop, its legs in order,
    // and ONE "Open in Google Maps" button per loop carrying the WHOLE ring
    // (start + every turning point + back to the start). The tap is a real user
    // gesture, so the pop-up is not blocked.
    function addChainBubble(payload) {
      payload = payload || {};
      var chains = payload.chains || [];
      if (!chains.length) return null;
      var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #cfe6d2;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:13px;line-height:1.5;word-wrap:break-word;' });
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:5px;color:#2e7d32;' },
        '\uD83D\uDD01 Lucky chain' + (payload.origin ? (' \u00b7 ' + payload.origin) : '') +
        (payload.date ? (' \u00b7 ' + payload.date) : '')));

      function openUrl(u, btn) {
        var w = null;
        try { w = window.open(u, '_blank'); } catch (e) {}
        if (!w) { try { window.location.href = u; } catch (e) {} }
        if (btn) btn.textContent = L.opened;
      }
      function letter(i) { return String.fromCharCode(65 + (i % 25)); }

      chains.forEach(function (c, ci) {
        var legs = c.legs || [];
        if (!legs.length) return;
        var box = elc('div', { style: 'margin:6px 0;padding:6px 8px;background:#f5faf5;border:1px solid #e0efe1;border-radius:9px;' });

        var head = elc('div', { style: 'display:flex;align-items:center;gap:7px;' });
        head.appendChild(elc('span', { style: 'flex:1;min-width:0;font-weight:600;' },
          '#' + (ci + 1) + ' \u00b7 ' + legs.length + ' legs \u00b7 ' +
          legs.map(function (lg) { return lg.dir; }).join('\u2192') + '\u2192home'));
        if (c.score != null) head.appendChild(elc('span', { style:
          'background:#e0efe1;color:#2e7d32;font-size:10.5px;font-weight:700;border-radius:9px;padding:1px 7px;flex:none;' },
          'score ' + c.score));
        box.appendChild(head);

        // One line per leg: the map letter it drives TO (the last one returns to A),
        // the direction, the door and the double-hour — the same fields the text answer uses.
        legs.forEach(function (lg, k) {
          var toL = (k === legs.length - 1) ? 'A' : letter(k + 1);
          var bits = [lg.dir];
          if (lg.km != null) bits.push(lg.km + ' km');
          if (lg.doorLabel) bits.push('\uD83D\uDEAA ' + lg.doorLabel);
          if (lg.brPy) bits.push(lg.brPy + (lg.br ? (' ' + lg.br) : ''));
          box.appendChild(elc('div', { style: 'margin:2px 0 0 4px;color:#555;font-size:12px;' },
            letter(k) + '\u2192' + toL + ' \u00b7 ' + bits.join(' \u00b7 ')));
          if (lg.stop && lg.stop.name) {
            var ico = lg.stop.kind === 'charger' ? '\u26A1' : (lg.stop.kind === 'poi' ? '\uD83C\uDF3F' : '\uD83C\uDD7F\uFE0F');
            box.appendChild(elc('div', { style: 'margin:0 0 2px 20px;color:#2e7d32;font-size:11px;font-weight:600;' },
              ico + ' ' + lg.stop.name + (lg.stop.power ? (' \u00b7 ' + lg.stop.power + ' kW') : '')));
          } else if (lg.stopUnsnapped) {
            box.appendChild(elc('div', { style: 'margin:0 0 2px 20px;color:#b26a00;font-size:11px;' },
              '\u26A0 no place nearby kept this direction \u2014 open country'));
          }
          if (lg.departCn) box.appendChild(elc('div', { style: 'margin:0 0 2px 20px;color:#999;font-size:11px;' }, lg.departCn));
        });

        if (c.resid != null) box.appendChild(elc('div', { style: 'margin:3px 0 0 4px;color:#2e7d32;font-size:11px;' },
          '\u21BB closes on the start (' + c.resid + ' km)'));

        if (c.maps_url) {
          var b = elc('button', { style:
            'margin:6px 0 0 4px;background:#2e7d32;color:#fff;border:0;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;' },
            L.openMaps);   // L.openMaps already carries the 📍 — do not prefix another one
          b._u = c.maps_url;
          b.addEventListener('click', function () { openUrl(b._u, b); });
          box.appendChild(b);
        }
        wrap.appendChild(box);
      });

      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }
    // Injected after a single-day LUCKY TRIP: one row per option (direction + real
    // place + times + score) with a per-option map button, plus a share button.
    function addDayTripBubble(payload) {
      payload = payload || {};
      var props = payload.proposals || [];
      if (!props.length) return null;
      var O = (payload.origin_lat != null) ? { lat: payload.origin_lat, lon: payload.origin_lon } : null;
      var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #cfe6d2;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:13px;line-height:1.5;word-wrap:break-word;' });
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:5px;color:#2e7d32;' },
        '\uD83C\uDF40 Lucky trip' + (payload.origin ? (' \u00b7 ' + payload.origin) : '') + (payload.date ? (' \u00b7 ' + payload.date) : '')));

      function medal(i) { return i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : (String(i + 1) + '.'); }
      function openUrl(u, btn) { var w = null; try { w = window.open(u, '_blank'); } catch (e) {} if (!w) { try { window.location.href = u; } catch (e) {} } if (btn) btn.textContent = L.opened; }
      function dirUrl(d) {
        if (O) return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(O.lat + ',' + O.lon) + '&destination=' + encodeURIComponent(d.lat + ',' + d.lon);
        return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d.lat + ',' + d.lon);
      }

      props.forEach(function (p, i) {
        var box = elc('div', { style: 'margin:6px 0;padding:6px 8px;background:#f5faf5;border:1px solid #e0efe1;border-radius:9px;' });
        var head = elc('div', { style: 'display:flex;align-items:center;gap:7px;' });
        head.appendChild(elc('span', { style: 'font-size:14px;flex:none;' }, medal(i)));
        head.appendChild(elc('span', { style: 'flex:1;min-width:0;font-weight:600;' },
          (p.direction || '') + (p.place ? (' \u00b7 ' + p.place) : (p.km != null ? (' \u00b7 ~' + p.km + ' km') : ''))));
        if (p.score != null) head.appendChild(elc('span', { style: 'background:#e0efe1;color:#2e7d32;font-size:10.5px;font-weight:700;border-radius:9px;padding:1px 7px;flex:none;' }, 'score ' + p.score));
        box.appendChild(head);

        var sub = [];
        if (p.km != null && p.place) sub.push('~' + p.km + ' km');
        if (p.depart && p.arrive) sub.push('go ' + p.depart + '\u2192' + p.arrive);
        if (p.return_depart && p.return_arrive) sub.push('back ' + p.return_depart + '\u2192' + p.return_arrive);
        if (sub.length) box.appendChild(elc('div', { style: 'margin:2px 0 3px 21px;color:#666;font-size:12px;' }, sub.join(' \u00b7 ')));
        if (p.clean) box.appendChild(elc('div', { style: 'margin:0 0 3px 21px;color:#2e7d32;font-size:11px;' }, '\u2705 both legs favourable'));

        if (p.dest_lat != null) {
          var b = elc('button', { style: 'margin-left:21px;background:#2e7d32;color:#fff;border:0;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;' }, '\uD83D\uDCCD ' + L.openMaps);
          b._u = dirUrl({ lat: p.dest_lat, lon: p.dest_lon });
          b.addEventListener('click', function () { openUrl(b._u, b); });
          box.appendChild(b);
        }
        wrap.appendChild(box);
      });

      var share = elc('button', { style: 'margin-top:7px;width:100%;padding:9px;border:0;border-radius:8px;background:#1b5e20;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, '\uD83D\uDCE4 Share itinerary');
      share.addEventListener('click', function () { shareText('Lucky trip', dayTripText(payload)); });
      wrap.appendChild(share);

      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }

    // Injected after a DIVINATION CHART search: one row per matching chart (date +
    // double-hour + where each condition landed) with a "view chart" button that
    // opens Directions -> Divinations already drawn on that date/hour.
    function addDivinationMatchesBubble(payload) {
      payload = payload || {};
      var ms = payload.matches || [];
      if (!ms.length) return null;
      var BR_TIME = { Zi: '00:00', Chou: '02:00', Yin: '04:00', Mao: '06:00', Chen: '08:00', Si: '10:00', Wu: '12:00', Wei: '14:00', Shen: '16:00', You: '18:00', Xu: '20:00', Hai: '22:00',
        '\u5B50': '00:00', '\u4E11': '02:00', '\u5BC5': '04:00', '\u536F': '06:00', '\u8FB0': '08:00', '\u5DF3': '10:00', '\u5348': '12:00', '\u672A': '14:00', '\u7533': '16:00', '\u9149': '18:00', '\u620C': '20:00', '\u4EA5': '22:00' };
      function timeFor(m) {
        if (m.branch && BR_TIME[m.branch]) return BR_TIME[m.branch];
        var mm = String(m.double_hour || '').match(/\(([A-Za-z]+)\s*hour\)/);
        if (mm && BR_TIME[mm[1]]) return BR_TIME[mm[1]];
        return '12:00';
      }
      function whereText(w) {
        if (!w) return '';
        if (typeof w === 'string') return w;
        if (Array.isArray(w)) return w.join(', ');
        try { return Object.keys(w).map(function (k) { return k + ' in ' + w[k]; }).join(', '); } catch (e) { return ''; }
      }
      var wrap = elc('div', { style: 'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:13px;line-height:1.5;word-wrap:break-word;' });
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:5px;color:#6a1b9a;' },
        '\uD83D\uDD2E Chart matches' + (payload.count != null ? (' \u00b7 ' + payload.count) : '') + (payload.conditions ? (' \u00b7 ' + payload.conditions) : '')));
      ms.forEach(function (m) {
        var box = elc('div', { style: 'margin:6px 0;padding:6px 8px;background:#faf6fd;border:1px solid #ecdff5;border-radius:9px;' });
        var head = elc('div', { style: 'display:flex;align-items:center;gap:7px;' });
        head.appendChild(elc('span', { style: 'flex:1;min-width:0;font-weight:600;' }, (m.date || '') + (m.double_hour ? (' \u00b7 ' + m.double_hour) : '')));
        if (m.score != null) head.appendChild(elc('span', { style: 'background:' + (m.score_ok ? '#e0efe1' : '#f3e9d8') + ';color:' + (m.score_ok ? '#2e7d32' : '#8a5a00') + ';font-size:10.5px;font-weight:700;border-radius:9px;padding:1px 8px;flex:none;' }, 'score ' + m.score));
        box.appendChild(head);
        if (m.profile) {
          var pf = [];
          if (m.profile.sanQi) pf.push('San Qi');
          if (m.profile.commander) pf.push('\u503C\u7B26 Commander');
          if (m.profile.zhiShi) pf.push('\u503C\u4F7F Zhi Shi');
          if (m.profile.door) pf.push(m.profile.door);
          if (m.profile.deity) pf.push(m.profile.deity);
          if (m.profile.configs && m.profile.configs.length) pf = pf.concat(m.profile.configs);
          if (pf.length) box.appendChild(elc('div', { style: 'margin:2px 0 0;color:#6a1b9a;font-size:11px;' }, (m.palace ? (m.palace + ': ') : '') + pf.join(' \u00b7 ')));
        }
        var w = whereText(m.positions);
        if (w) box.appendChild(elc('div', { style: 'margin:1px 0 4px;color:#888;font-size:11px;' }, w));
        var b = elc('button', { style: 'background:#6a1b9a;color:#fff;border:0;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;' }, '\uD83D\uDCCA View chart');
        var _d = m.date, _t = timeFor(m);
        b.addEventListener('click', function () {
          try {
            if (window.DirectionsCharts && typeof window.DirectionsCharts.openDivinationsAt === 'function') {
              try { closePanel(); } catch (e) {}
              window.DirectionsCharts.openDivinationsAt(_d, _t);
            }
            else alert('The Divinations module is not available on this page.');
          } catch (e) {}
        });
        box.appendChild(b);
        wrap.appendChild(box);
      });
      if (payload.truncated) wrap.appendChild(elc('div', { style: 'margin-top:5px;color:#888;font-size:11px;font-style:italic;' }, '+ more in the window \u2014 narrow the dates or ask for the full list.'));
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }

    // Injected after an OPEN-PATH MOBILE-BASE tour: origin = A (green start), each
    // night's base = B, C, D... reached by a favourable transfer. Per-leg "Open in
    // Maps" buttons (previous base -> this base) plus a full open-route button.
    function addMobileTourBubble(payload) {
      payload = payload || {};
      var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
      var it = payload.itinerary || [];
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:13px;line-height:1.5;word-wrap:break-word;' });
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:5px;' },
        '\uD83E\uDDF3 Mobile tour \u00b7 from ' + (payload.origin || 'Start') +
        (payload.start_date ? (' \u00b7 ' + payload.start_date) : '') + ' \u00b7 open path'));

      function badge(letter, color) {
        return elc('span', { style:
          'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;' +
          'background:' + (color || '#6a1b9a') + ';color:#fff;font-size:11px;font-weight:700;margin-right:7px;flex:none;' }, letter);
      }
      function openUrl(u, btn) {
        var w = null; try { w = window.open(u, '_blank'); } catch (e) {}
        if (!w) { try { window.location.href = u; } catch (e) {} }
        if (btn) btn.textContent = L.opened;
      }

      var prev = (payload.origin_lat != null) ? { lat: payload.origin_lat, lon: payload.origin_lon } : null;
      var baseRow = elc('div', { style: 'display:flex;align-items:center;margin:2px 0 6px;' });
      baseRow.appendChild(badge('A', '#2e7d32'));
      baseRow.appendChild(elc('span', { style: 'flex:1;min-width:0;color:#555;' }, (payload.origin || 'Start') + ' \u2014 start'));
      wrap.appendChild(baseRow);

      var liveIdx = 0;
      it.forEach(function (d) {
        var hasBase = !!(d.base && d.base.lat != null);
        var letter = hasBase ? String.fromCharCode(66 + (liveIdx++ % 25)) : '\u00b7';
        var box = elc('div', { style: 'margin:6px 0;padding:6px 8px;background:#faf6fd;border:1px solid #ecdff5;border-radius:9px;' });
        var head = elc('div', { style: 'display:flex;align-items:center;' });
        head.appendChild(badge(letter, hasBase ? '#6a1b9a' : '#bbb'));
        head.appendChild(elc('span', { style: 'flex:1;min-width:0;font-weight:600;' }, 'Night ' + d.night + (d.date ? (' \u00b7 ' + d.date) : '')));
        if (hasBase && d.base.characterScore != null) {
          head.appendChild(elc('span', { style: 'background:#efe3f7;color:#6a1b9a;font-size:10.5px;font-weight:700;border-radius:9px;padding:1px 7px;' }, String(Math.round(d.base.characterScore * 100))));
        }
        box.appendChild(head);
        if (hasBase) {
          if (d.theme_stop && d.theme_stop.lat != null) {
            box.appendChild(elc('div', { style: 'margin:3px 0 0 25px;' }, '\uD83C\uDFAF ' + d.theme_stop.name));
            var sMeta = [];
            if (d.theme_stop.theme) sMeta.push(d.theme_stop.theme);
            if (d.theme_stop.direction) sMeta.push('via ' + d.theme_stop.direction);
            if (d.theme_stop.depart_cn) sMeta.push(d.theme_stop.depart_cn);
            if (sMeta.length) box.appendChild(elc('div', { style: 'margin:0 0 2px 25px;color:#999;font-size:11px;' }, sMeta.join(' \u00b7 ')));
          }
          box.appendChild(elc('div', { style: 'margin:2px 0 1px 25px;font-weight:600;' }, '\uD83D\uDECF ' + d.base.name));
          var meta = [];
          if (d.base.category) meta.push(d.base.category);
          if (d.transfer && d.transfer.direction) meta.push((d.transfer.from_last_stop ? 'from stop ' : 'via ') + d.transfer.direction);
          if (d.transfer && d.transfer.depart_cn) meta.push(d.transfer.depart_cn);
          if (d.transfer && d.transfer.km != null) meta.push(d.transfer.km + ' km');
          if (meta.length) box.appendChild(elc('div', { style: 'margin:0 0 4px 25px;color:#666;font-size:12px;' }, meta.join(' \u00b7 ')));
          if (prev) {
            var b = elc('button', { style:
              'margin-left:25px;background:#6a1b9a;color:#fff;border:0;border-radius:7px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;' },
              '\uD83D\uDCCD Day ' + d.night);
            var du = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(prev.lat + ',' + prev.lon) +
              '&destination=' + encodeURIComponent(d.base.lat + ',' + d.base.lon);
            if (d.theme_stop && d.theme_stop.lat != null) du += '&waypoints=' + encodeURIComponent(d.theme_stop.lat + ',' + d.theme_stop.lon);
            b._u = du;
            b.addEventListener('click', function () { openUrl(b._u, b); });
            box.appendChild(b);
          }
          prev = { lat: d.base.lat, lon: d.base.lon };
        } else {
          if (d.theme_stop && d.theme_stop.lat != null) box.appendChild(elc('div', { style: 'margin:3px 0 0 25px;' }, '\uD83C\uDFAF ' + d.theme_stop.name));
          box.appendChild(elc('div', { style: 'margin:3px 0 1px 25px;color:#a00;font-size:12px;' }, d.note || 'No favourable base this night \u2014 chain ends here'));
        }
        wrap.appendChild(box);
      });

      if (payload.route_url && liveIdx > 1) {
        var all = elc('button', { style:
          'margin-top:7px;width:100%;padding:9px;border:0;border-radius:8px;background:#4a148c;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' },
          '\uD83D\uDDFA ' + L.openMaps + ' \u2014 full route (A\u2013' + String.fromCharCode(65 + liveIdx) + ')');
        all._u = payload.route_url;
        all.addEventListener('click', function () { openUrl(all._u, all); });
        wrap.appendChild(all);
      }
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }
    // Injected after a MULTI-DAY themed Lucky Trip: one box per day (base = A,
    // each day = B, C, D... matching the combined map pins), with a per-day
    // "Open in Maps" button (out-and-back from the base) and an "all days"
    // overview button. Real taps, so the browser won't block the pop-ups.
    function addMultiDayBubble(payload) {
      payload = payload || {};
      var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
      var entries = payload.entries || [];
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:13px;line-height:1.5;word-wrap:break-word;' });
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:5px;' },
        '\uD83D\uDDFA Themed trip \u00b7 ' + (payload.base || 'Base') +
        (payload.start_date ? (' \u00b7 ' + payload.start_date) : '') +
        (payload.days ? (' \u00b7 ' + payload.days + 'd') : '')));

      function badge(letter, color) {
        return elc('span', { style:
          'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;' +
          'background:' + (color || '#6a1b9a') + ';color:#fff;font-size:11px;font-weight:700;margin-right:7px;flex:none;' }, letter);
      }
      function openUrl(u, btn) {
        var w = null; try { w = window.open(u, '_blank'); } catch (e) {}
        if (!w) { try { window.location.href = u; } catch (e) {} }
        if (btn) btn.textContent = L.opened;
      }

      // base = A (green start pin)
      var baseRow = elc('div', { style: 'display:flex;align-items:center;margin:2px 0 6px;' });
      baseRow.appendChild(badge('A', '#2e7d32'));
      baseRow.appendChild(elc('span', { style: 'flex:1;min-width:0;color:#555;' }, (payload.base || 'Base') + ' \u2014 home base'));
      wrap.appendChild(baseRow);

      var placed = 0;
      entries.forEach(function (e) { if (e.maps_url) placed++; });
      var liveIdx = 0;
      entries.forEach(function (e) {
        var hasMap = !!e.maps_url;
        var letter = hasMap ? String.fromCharCode(66 + (liveIdx++ % 25)) : '\u00b7';
        var box = elc('div', { style: 'margin:6px 0;padding:6px 8px;background:#faf6fd;border:1px solid #ecdff5;border-radius:9px;' });
        var head = elc('div', { style: 'display:flex;align-items:center;' });
        head.appendChild(badge(letter, hasMap ? '#6a1b9a' : '#bbb'));
        head.appendChild(elc('span', { style: 'flex:1;min-width:0;font-weight:600;' },
          'Day ' + e.day + (e.date ? (' \u00b7 ' + e.date) : '')));
        box.appendChild(head);
        if (e.place) {
          box.appendChild(elc('div', { style: 'margin:3px 0 1px 25px;font-weight:600;' }, e.place));
          var meta = [];
          if (e.theme) meta.push(e.theme);
          if (e.direction) meta.push(e.direction);
          if (e.depart_cn) meta.push(e.depart_cn);
          if (e.km != null) meta.push(e.km + ' km');
          if (meta.length) box.appendChild(elc('div', { style: 'margin:0 0 4px 25px;color:#666;font-size:12px;' }, meta.join(' \u00b7 ')));
          if (hasMap) {
            var b = elc('button', { style:
              'margin-left:25px;background:#6a1b9a;color:#fff;border:0;border-radius:7px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;' },
              '\uD83D\uDCCD Day ' + e.day);
            b._u = e.maps_url;
            b.addEventListener('click', function () { openUrl(b._u, b); });
            box.appendChild(b);
          }
        } else {
          box.appendChild(elc('div', { style: 'margin:3px 0 1px 25px;color:#a00;font-size:12px;' }, 'No favourable place this day'));
        }
        wrap.appendChild(box);
      });

      if (payload.all_maps_url && placed > 1) {
        var lastLetter = String.fromCharCode(65 + placed);
        var all = elc('button', { style:
          'margin-top:7px;width:100%;padding:9px;border:0;border-radius:8px;background:#4a148c;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' },
          '\uD83D\uDDFA ' + L.openMaps + ' \u2014 all days (A\u2013' + lastLetter + ')');
        all._u = payload.all_maps_url;
        all.addEventListener('click', function () { openUrl(all._u, all); });
        wrap.appendChild(all);
      }
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }
    // Selectable ranked list of the best departures from a multi-day search. Each row
    // shows the date/time, the TOTAL-CASH score, and a "Choose" button that opens the
    // full plan for that exact day+time (which then posts its own detailed card).
    function addItinerarySearchBubble(payload) {
      payload = payload || {};
      var res = payload.result || {};
      var top = res.top || [];
      var origin = payload.origin || res.origin, dest = payload.dest || res.dest;
      function fmtDur(min) { if (min == null) return ''; var h = Math.floor(min / 60), m = Math.round(min % 60); return (h ? (h + 'h') : '') + (m ? ((h ? ' ' : '') + m + 'm') : (h ? '' : '0m')); }
      var dvg = fmtDur(res.driving_min != null ? res.driving_min : (res.driving_h != null ? res.driving_h * 60 : null));
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:14px;line-height:1.5;' });
      var ttl = (payload.originName || 'Origin') + ' \u2192 ' + (payload.destName || 'Destination');
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:2px;' }, '\uD83C\uDFC1 Best departures \u00b7 ' + ttl));
      wrap.appendChild(elc('div', { style: 'font-size:12px;color:#666;margin-bottom:7px;' },
        'score = total cash' + (payload.optimizeArrival ? ' + arrival' : '') +
        (res.km != null ? (' \u00b7 ' + res.km + ' km') : '') +
        (res.driving_h != null ? (' \u00b7 ' + res.driving_h + ' h driving') : '') +
        (res.total_evaluated != null ? (' \u00b7 ' + res.total_evaluated + ' departures tried') : '')));
      if (!top.length) {
        wrap.appendChild(elc('div', { style: 'color:#888;font-size:13px;' }, 'No favourable departures found in this window.'));
        msgs.appendChild(wrap); msgs.scrollTop = msgs.scrollHeight; return wrap;
      }
      // The single objectively-best departure (the engine returns top[] ranked best-first,
      // so top[0]). It keeps its green highlight and star in BOTH sort modes, so the best
      // option stays identifiable even when the list is shown chronologically.
      var bestRef = top[0];
      // --- Best / By date toggle (same idea as the BEST/LIST toggle on the Main date pages) ---
      var sortMode = 'best';   // 'best' = highest cashed luck first; 'date' = chronological
      var toggleRow = elc('div', { style: 'display:flex;gap:6px;margin-bottom:7px;' });
      var btnBest = elc('button', {}, 'Best');
      var btnDate = elc('button', {}, 'By date');
      function styleToggle() {
        [[btnBest, 'best'], [btnDate, 'date']].forEach(function (p) {
          var on = (sortMode === p[1]);
          p[0].style.cssText = 'flex:none;border:1px solid ' + (on ? '#1565c0' : '#cfc3da') +
            ';background:' + (on ? '#1565c0' : '#fff') + ';color:' + (on ? '#fff' : '#666') +
            ';border-radius:7px;padding:5px 13px;font-size:12px;font-weight:700;cursor:pointer;';
        });
      }
      toggleRow.appendChild(btnBest); toggleRow.appendChild(btnDate);
      wrap.appendChild(toggleRow);
      var listHost = elc('div', {});
      wrap.appendChild(listHost);
      function orderedTop() {
        if (sortMode === 'date') {
          return top.slice().sort(function (a, b) {
            if (a.date !== b.date) return a.date < b.date ? -1 : 1;
            var ta = a.depart || '', tb = b.depart || '';
            if (ta !== tb) return ta < tb ? -1 : 1;
            return (b.score || 0) - (a.score || 0);
          });
        }
        return top.slice();   // already ranked best-first by the engine
      }
      function renderList() {
        listHost.innerHTML = '';
        orderedTop().forEach(function (c, i) {
          var best = (c === bestRef);
          var card = elc('div', { style:
            'display:flex;align-items:center;gap:8px;margin:4px 0;padding:7px 9px;border-radius:8px;border:1px solid ' +
            (best ? '#43a047' : '#e0d4e8') + ';background:' + (best ? '#f1f8f2' : '#faf8fc') + ';' });
          var info = elc('div', { style: 'flex:1;min-width:0;' });
          info.appendChild(elc('div', { style: 'font-weight:700;color:#4527a0;' },
            '#' + (i + 1) + ' \u00b7 score ' + c.score + (best ? ' \u2605' : '')));
          info.appendChild(elc('div', { style: 'font-size:12px;color:#333;' },
            c.date + (c.weekday ? (' (' + c.weekday + ')') : '') + ' \u00b7 ' + c.depart + ' \u2192 ' + c.arrive + (c.arrive_next_day ? ' (+1d)' : '') +
            (dvg ? (' \u00b7 ' + dvg + ' driving') : '')));
          info.appendChild(elc('div', { style: 'font-size:11px;color:#666;' },
            'total cash ' + c.total_cash + ' \u00b7 ' + c.cash_hours + '/' + c.total_hours + ' cash hours' +
            (c.xkdg_bonus ? (' \u00b7 \uD83D\uDD35 XKDG +' + c.xkdg_bonus + ' (' + (c.xkdg_hours||0) + ' hrs)') : '') +
            (payload.optimizeArrival && c.arrival_score ? (' \u00b7 arrival +' + c.arrival_score) : '')));
          var btn = elc('button', { style:
            'flex:none;background:#1565c0;color:#fff;border:0;border-radius:7px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;' }, 'Choose');
          btn.addEventListener('click', function () {
            btn.textContent = 'Opening\u2026'; btn.disabled = true;
            try {
              if (window.TravelPlanner && typeof window.TravelPlanner.openPrefilled === 'function') {
                var dstOn = (typeof dstActiveOn === 'function') ? dstActiveOn(new Date(c.date + 'T12:00:00')) : false;
                // The engine scored THIS exact minute (candidates are planned with snapDepart:false),
                // so the scan must run it as-is: without this flag the planner would snap the departure
                // back to the start of its double-hour (e.g. 14:29 -> 13:59) and execute a DIFFERENT
                // plan than the one scored. Mirrors the in-planner BEST panel rows.
                window._tpNoSnap = true; window._tpAutoDepart = false;
                window.TravelPlanner.openPrefilled({
                  originLat: origin.lat, originLon: origin.lon, originName: payload.originName || null,
                  destLat: dest.lat, destLon: dest.lon, destName: payload.destName || null,
                  departDate: c.date, departTime: c.depart, autoDepart: false,
                  utc: payload.utc, dst: dstOn,
                  rangeKm: (payload.rangeKm != null) ? payload.rangeKm : null,
                  reserveKm: (payload.reserveKm != null) ? payload.reserveKm : null,
                  run: true
                });
              }
            } catch (e) {}
          });
          card.appendChild(info); card.appendChild(btn);
          listHost.appendChild(card);
        });
      }
      btnBest.addEventListener('click', function () { if (sortMode !== 'best') { sortMode = 'best'; styleToggle(); renderList(); } });
      btnDate.addEventListener('click', function () { if (sortMode !== 'date') { sortMode = 'date'; styleToggle(); renderList(); } });
      styleToggle();
      renderList();
      msgs.appendChild(wrap); msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }
    // A "check" button: opens the XKDG date analysis AND the QMDJ Hour Flying Chart
    // for the date/hour the assistant recommends, so the user can verify visually.
    function addVerifyButtonBubble(info) {
      info = info || {};
      var wrap = elc('div', { style:
        'max-width:92%;align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;' +
        'border-radius:12px;border-bottom-left-radius:3px;padding:8px 11px;font-size:14px;line-height:1.5;' });
      wrap.appendChild(elc('div', { style: 'font-weight:700;margin-bottom:6px;' }, '\uD83D\uDD0D ' + (info.label || 'Check')));
      var btn = elc('button', { style:
        'width:100%;padding:9px;border:0;border-radius:8px;background:#6a1b9a;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' },
        'Apri data XKDG + carta QMDJ');
      btn.addEventListener('click', function () {
        var okDate = false, okChart = false;
        try { if (typeof window.loadDateIntoMain === 'function' && info.date) { window.loadDateIntoMain(info.date, info.hourIndex); okDate = true; } } catch (e) {}
        try {
          if (typeof window.showQimenChart === 'function' && info.date && info.hGan && info.hZhi) {
            var _html = window.showQimenChart(info.date, info.hGan, info.hZhi, info.palace, { mode: 'rotating', returnHtml: true });
            if (_html) { _vbShowChartOverlay(_html); okChart = true; }
          }
        } catch (e) {}
        closePanel();   // hide the chat; the QMDJ chart shows in a floating overlay, the XKDG date underneath
        if (!okDate && !okChart) { openPanel(); addBubble('assistant', '\u26A0 Could not open the views on this page.'); }
      });
      wrap.appendChild(btn);
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
      return wrap;
    }
    function updateItineraryCharging(info) {
      try { if (_itinChargeEl) { var L = ITIN_LBL[chatLang()] || ITIN_LBL.en; _itinChargeEl.textContent = chargingText(L, info); msgs.scrollTop = msgs.scrollHeight; } } catch (e) {}
    }
    // Per-stop meta line: operator + address + an independent Google-Maps link for THAT charger,
    // so the user can check what/where a charger is (e.g. an unfamiliar "Hypercharger Audi").
    function fillStopMeta(metaEl, it) {
      if (!metaEl || !it) return;
      metaEl.innerHTML = '';
      // Real battery state at this charge stop, when the planner has it (session 23:
      // curve-based SoC tracking in travel-planner.js). Absent on older itineraries
      // or when no live SoC/full-range was set — nothing shown then, no guessing.
      if (isChargeStop(it) && it.socFrom != null && it.socTo != null) {
        var socTxt = '\uD83D\uDD0B ' + it.socFrom + '% \u2192 ' + it.socTo + '%' +
          (it.kwh != null ? (' \u00b7 ' + it.kwh + ' kWh') : '');
        metaEl.appendChild(elc('div', { style: 'color:#c2185b;font-weight:600;margin-bottom:2px;' }, socTxt));
      }
      var op = (it.operator && it.place && it.place.toLowerCase().indexOf(String(it.operator).toLowerCase()) >= 0) ? '' : (it.operator || '');
      var txt = [op, it.addr].filter(Boolean).join(' \u00b7 ');
      if (txt) metaEl.appendChild(elc('span', { style: 'color:#666;' }, txt + (txt ? '  ' : '')));
      if (it.lat != null && it.lon != null && isFinite(it.lat) && isFinite(it.lon)) {
        // Name AND position — never one without the other.
        // A bare "lat,lon" query drops Maps on a generic road point instead of the real
        // business (e.g. a charger set back behind a shopping centre). But a bare NAME is
        // worse: "?api=1&query=ELECTRA" searches the whole planet, so Maps zooms out far
        // enough to hold every hit (observed: the whole of Austria at 7z) and the user has
        // no idea which pin is their stop.
        // The /maps/search/<name>/@<lat>,<lon>,<zoom>z form searches the name INSIDE that
        // viewport, so Maps returns this charger's own indexed listing (with its parking
        // entrance) already centred. Falls back to lat,lon when no name has been snapped yet.
        var nm = (it.place && String(it.place).trim()) ? String(it.place).trim() : '';
        var href = nm
          ? 'https://www.google.com/maps/search/' + encodeURIComponent(nm) +
            '/@' + it.lat + ',' + it.lon + ',16z'
          : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(it.lat + ',' + it.lon);
        var a = elc('a', { href: href,
          target: '_blank', rel: 'noopener',
          style: 'color:#1565c0;text-decoration:underline;white-space:nowrap;font-weight:600;' }, '\uD83D\uDCCD Open in Maps');
        metaEl.appendChild(a);
      } else if (!txt) {
        metaEl.appendChild(elc('span', { style: 'color:#999;' }, '\u2026'));
      }
    }
    function updateItineraryStops() {
      try {
        // Structural rebuild (session 23): a merged "extra" charger adds a whole new
        // lettered step, not just a field change — rebuild the bubble from the FINAL
        // _tpLastResult (once, when Phase F settles) instead of patching in place.
        if (window._tpLastResult && window._tpLastResult.stops_changed) {
          window._tpLastResult.stops_changed = false;
          var rebuildPayload = {};
          for (var rk in window._tpLastResult) { if (window._tpLastResult.hasOwnProperty(rk)) rebuildPayload[rk] = window._tpLastResult[rk]; }
          rebuildPayload._rebuild = true;
          rebuildPayload.charging_pending = false;   // this render already reflects the settled plan
          addItineraryBubble(rebuildPayload);
          return;   // the rebuild already reflects every field the code below would have patched
        }
        var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
        _itinStopEls.forEach(function (s) { if (s.el && s.it) s.el.textContent = stopLineText(L, s.it); if (s.row && s.it) paintChargeRow(s.row, s.it); if (s.meta && s.it) fillStopMeta(s.meta, s.it); });
        // Chargers the trip needs that pair with no cash stop: they are NOT card steps
        // (inserting them would shift every later time out of its favourable double-hour),
        // but they must not be hidden either — the card would understate the stop count.
        try {
          if (_itinExtraEl) {
            var xs = (window._tpLastResult && window._tpLastResult.extra_chargers) || [];
            if (!xs.length) { _itinExtraEl.style.display = 'none'; _itinExtraEl.textContent = ''; }
            else {
              var html = '<b>\uD83D\uDD0B ' + L.extraCharges + '</b>';
              xs.forEach(function (x) {
                var bits = [];
                if (x.km != null) bits.push('~' + x.km + ' km');
                if (x.eta) bits.push('ETA ' + x.eta);
                if (x.socFrom != null && x.socTo != null) bits.push(x.socFrom + '% \u2192 ' + x.socTo + '%');
                if (x.duration_min) bits.push(x.duration_min + ' min');
                html += '<br>\u2022 ' + String(x.name) + (x.kw ? ' (' + x.kw + ' kW)' : '') +
                        (bits.length ? ' \u00b7 ' + bits.join(' \u00b7 ') : '');
              });
              html += '<br><i>' + L.extraChargesWhy + '</i>';
              _itinExtraEl.innerHTML = html;
              _itinExtraEl.style.display = 'block';
            }
          }
        } catch (eX) {}
        msgs.scrollTop = msgs.scrollHeight;
      } catch (e) {}
    }
    function updateItineraryExits(exits) {
      try {
        var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
        (exits || []).forEach(function (ex, i) {
          if (_itinExitEls[i] && _itinExitEls[i].el) { _itinExitEls[i].ex = ex; _itinExitEls[i].el.textContent = exitLineText(L, ex); }
        });
      } catch (e) {}
    }

    function extractText(data) {
      if (!data) return '';
      if (data.error) return '⚠ ' + (data.error.message || data.error);
      if (!Array.isArray(data.content)) return '';
      return data.content.map(function (c) { return c && c.type === 'text' ? c.text : ''; }).filter(Boolean).join('\n');
    }

    // Heal the history so the API never sees a tool_use without its matching tool_result.
    // A tool_use can be left unanswered when a turn is interrupted or the model emits one
    // under a 'max_tokens' stop; that single orphan then makes EVERY later request fail with
    // "tool_use ids were found without tool_result blocks". We insert a synthetic tool_result
    // ("interrupted") for each missing id so a poisoned conversation recovers on the next send.
    function repairHistory(hist) {
      hist = hist || history;   // default: the live chat history; a test may pass its own array
      try {
        for (var i = 0; i < hist.length; i++) {
          var m = hist[i];
          if (!m || m.role !== 'assistant' || !Array.isArray(m.content)) continue;
          var ids = m.content
            .filter(function (c) { return c && c.type === 'tool_use'; })
            .map(function (c) { return c.id; });
          if (!ids.length) continue;
          var next = hist[i + 1];
          var answered = {};
          if (next && next.role === 'user' && Array.isArray(next.content)) {
            next.content.forEach(function (c) {
              if (c && c.type === 'tool_result' && c.tool_use_id) answered[c.tool_use_id] = true;
            });
          }
          var missing = ids.filter(function (id) { return !answered[id]; });
          if (!missing.length) continue;
          var fillers = missing.map(function (id) {
            return { type: 'tool_result', tool_use_id: id, content: JSON.stringify({ error: 'interrupted' }) };
          });
          if (next && next.role === 'user' && Array.isArray(next.content)) {
            next.content = fillers.concat(next.content);   // tool_results must precede any text
          } else {
            hist.splice(i + 1, 0, { role: 'user', content: fillers });
          }
        }
      } catch (e) {}
      return hist;
    }

    // Offline self-test for the exact invariant that broke the chat ("tool_use without
    // tool_result"). Builds a deliberately poisoned history, runs the REAL repairHistory on it,
    // and checks the invariant now holds. No network, no AI, no cost. Exposed for a test page.
    function selfTest() {
      function orphans(hist) {
        var bad = [];
        for (var i = 0; i < hist.length; i++) {
          var m = hist[i];
          if (!m || m.role !== 'assistant' || !Array.isArray(m.content)) continue;
          var ids = m.content.filter(function (c) { return c && c.type === 'tool_use'; }).map(function (c) { return c.id; });
          if (!ids.length) continue;
          var next = hist[i + 1], answered = {};
          if (next && next.role === 'user' && Array.isArray(next.content))
            next.content.forEach(function (c) { if (c && c.type === 'tool_result' && c.tool_use_id) answered[c.tool_use_id] = true; });
          ids.forEach(function (id) { if (!answered[id]) bad.push(id); });
        }
        return bad;
      }
      // The exact shape that failed: a tool_use, then a NEW typed user message, no tool_result.
      var poisoned = [
        { role: 'user', content: 'Buone ore per accendere gli acquari oggi?' },
        { role: 'assistant', content: [
          { type: 'text', text: 'Controllo le ore favorevoli\u2026' },
          { type: 'tool_use', id: 'toolu_SELFTEST_1', name: 'find_water_hours', input: { direction: 'S' } }
        ] },
        { role: 'user', content: 'e a Vienna?' }
      ];
      var clone = JSON.parse(JSON.stringify(poisoned));
      var before = orphans(clone);
      var repaired = repairHistory(clone);
      var after = orphans(repaired);
      var pass = (before.length > 0 && after.length === 0);
      return {
        pass: pass,
        orphans_before: before,   // expected: ["toolu_SELFTEST_1"]
        orphans_after: after,     // expected: []
        repaired_length: repaired.length,
        note: pass
          ? 'OK: a tool_use left without a tool_result was healed \u2014 the API can no longer reject this history.'
          : 'FAIL: repairHistory did not heal the orphaned tool_use; the "Request failed" bug can return.'
      };
    }

    // Current instant in TRUE SOLAR TIME at the user's GPS longitude, so the assistant knows the
    // real "now" (date, active double-hour 时辰, day & hour pillars) instead of guessing the hour.
    // Uses the SAME engine Main uses (XKDGSolarTime.pillarsFromCivil).
    function currentMomentContext() {
      try {
        if (typeof XKDGSolarTime === 'undefined' || typeof XKDGSolarTime.currentLonTz !== 'function') return '';
        var lt = XKDGSolarTime.currentLonTz();
        if (!lt || !isFinite(lt.lonDeg)) return '';
        var now = new Date();
        var P = XKDGSolarTime.pillarsFromCivil(now.getFullYear(), now.getMonth() + 1, now.getDate(),
                                               now.getHours(), now.getMinutes(), 0, lt.lonDeg, lt.tzOffsetMin);
        if (!P || !P.hour || !P.day) return '';
        var H2P = { '甲':'Jia','乙':'Yi','丙':'Bing','丁':'Ding','戊':'Wu','己':'Ji','庚':'Geng','辛':'Xin','壬':'Ren','癸':'Gui' };
        var BR = { '子':'Zi','丑':'Chou','寅':'Yin','卯':'Mao','辰':'Chen','巳':'Si','午':'Wu','未':'Wei','申':'Shen','酉':'You','戌':'Xu','亥':'Hai' };
        var dayStem = H2P[P.day.charAt(0)] || P.day.charAt(0);
        var dayBr = BR[P.day.charAt(1)] || P.day.charAt(1);
        var hStem = H2P[P.hour.charAt(0)] || P.hour.charAt(0);
        var hBr = P.hour.charAt(1);
        var hBrPy = BR[hBr] || hBr;
        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
        var _ORDER = ['\u5b50','\u4e11','\u5bc5','\u536f','\u8fb0','\u5df3','\u5348','\u672a','\u7533','\u9149','\u620c','\u4ea5'];
        var _civ = '';
        try { _civ = _ORDER.map(function (b) { var w = solarBranchToClock(b); return (BR[b] || b) + ' ' + b + ' ' + (w || '?'); }).join(', '); } catch (e) {}
        return '\n\nCURRENT MOMENT (authoritative \u2014 use for "now"/"today"/"oggi"/"maintenant"; NEVER guess the hour): ' +
          'local date ' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
          ', local clock ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '. In TRUE SOLAR TIME at the user\'s ' +
          'longitude the active double-hour (\u65F6\u8FB0) is ' + hBrPy + ' ' + hBr + '; day pillar ' + dayStem + ' ' + dayBr +
          ' (' + P.day + '), hour pillar ' + hStem + ' ' + hBrPy + ' (' + P.hour + '). These pillars are already True Solar Time.' +
          (_civ ? ('\n\nDOUBLE-HOUR CIVIL CLOCK today at the user\u2019s location: ' + _civ + '. The 12 \u65F6\u8FB0 are TST-defined, but ALWAYS tell the user the CIVIL clock time (the windows above), never the raw solar boundary \u2014 e.g. the Wu \u5348 hour is NOT "11:00\u201313:00" on the clock, it is its civil window above. When the user says "beginning of Wu hour" etc., give them the civil start time.') : '');
      } catch (e) { return ''; }
    }

    // Reinforce reading real app state instead of hallucinating stars / the current hour.
    function stateReadingRule() {
      return '\n\nREADING APP STATE (do NOT guess): for any question about a house\u2019s flying stars / water star / ' +
        'mountain star, FIRST call get_house_setup and read the numbers from its flying_stars object, applying its ' +
        'imprisonment/liberation note (free the centre water star at the liberation quadrant). Never state a star from ' +
        'memory. For the current date or hour, rely on the CURRENT MOMENT block the app appends to the ' +
        'latest user message.';
    }

    // Turn yes/no (or short either/or) questions into tap buttons in the app UI.
    function uiButtonsRule() {
      return '\n\nUI BUTTONS: whenever your reply asks the user a yes/no question or a short either/or choice, add it on ' +
        'its OWN line as a marker the app renders as tap buttons: [[BTN]] Label1 | Label2 . Each item may be ' +
        '"Label=exact text to send" when the words to send differ from the button label; with no "=", the label itself ' +
        'is sent. Example (yes/no): [[BTN]] S\u00ec=s\u00ec | No=no . When the choice refers to a specific item, put the item in the ' +
        'payload so it is unambiguous, e.g. [[BTN]] S\u00ec=includi l\u2019 11 luglio | No=salta l\u2019 11 luglio . Ask one such ' +
        'question at a time. Do NOT add buttons to statements that are not questions.';
    }

    // Hard guardrail: only ever recommend an aquarium/water hour that a tool returned; those
    // tools already exclude any hour whose water sector lacks a favourable QMDJ door.
    function aquariumSafetyRule() {
      return '\n\nAQUARIUM / WATER ACTIVATION \u2014 SAFETY (absolute): to answer "when to turn on the aquarium / good water hour", ' +
        'you MUST get hours from a tool (find_water_hours, find_water_activation, find_water_activation_full, or ' +
        'program_aquarium_light). Those tools already DROP every hour whose water sector lacks a favourable QMDJ door ' +
        '(only Open/Rest/Birth/View qualify; Death/Injury/Delusion/Shocking and no-favourable-door are excluded). ' +
        'NEVER invent an hour, NEVER quote one from memory, and NEVER offer a "best available" hour that a tool did not ' +
        'return. If the tools return nothing favourable for a day, say clearly there is NO good hour that day \u2014 do not ' +
        'downgrade to a bad one. Only present the hours the tool actually returned.';
    }

    function callAnthropic(noTools) {
      // Per-turn language lock: detect the language of the user's latest typed message and
      // append a high-priority directive so the reply never drifts (e.g. to Italian) because
      // of the Italian example phrases in the system prompt or an Italian-heavy history.
      function replyLangDirective() {
        function nameOf(c) { return c === 'it' ? 'Italian' : (c === 'fr' ? 'French' : 'English'); }
        var lang = null;
        try {
          for (var i = history.length - 1; i >= 0; i--) {
            var m = history[i];
            if (m && m.role === 'user' && typeof m.content === 'string') {
              var d = detectLang(m.content);
              if (d) { lang = d; break; }   // most recent DETECTABLE user message wins (don't stop on a null)
            }
          }
        } catch (e) {}
        if (!lang) { var s = null; try { s = localStorage.getItem('xkdg_ai_lang'); } catch (e) {} if (s && s !== 'auto') lang = s; }
        if (lang) {
          return '\n\nREPLY LANGUAGE (HIGHEST PRIORITY, overrides everything above): the user\'s latest message is in ' +
            nameOf(lang) + '. Reply ONLY in ' + nameOf(lang) + '. The example phrases in these instructions (some written ' +
            'in Italian) are ONLY examples and must NOT influence the language you answer in.';
        }
        return '\n\nREPLY LANGUAGE (HIGHEST PRIORITY): reply in the SAME language as the user\'s latest message. ' +
          'Do NOT default to Italian \u2014 the Italian phrases in these instructions are only examples, not a language preference.';
      }
      // ---- Prompt cache (session 26) ------------------------------------------
      // The system block must be byte-identical for every student and at every minute,
      // otherwise the cached prefix is re-WRITTEN (1.25x price) instead of READ (0.10x).
      // So everything volatile \u2014 the date, the current double-hour, the language lock \u2014
      // is appended to the LAST USER MESSAGE instead of to the system prompt.
      function staticSystem() {
        return systemPromptFor(activeAreas()) + stateReadingRule() + uiButtonsRule() + aquariumSafetyRule();
      }
      function messagesWithMoment() {
        var vol = '[CONTEXT FROM THE APP \u2014 not typed by the user]\n\nToday is ' + todayIso() + '.'
                + currentMomentContext() + replyLangDirective();
        var out = history.slice();
        var last = out[out.length - 1];
        if (!last || last.role !== 'user') return out;
        var content = (typeof last.content === 'string') ? [{ type: 'text', text: last.content }]
                    : (Array.isArray(last.content) ? last.content.slice() : null);
        if (!content) return out;
        content.push({ type: 'text', text: vol });
        out[out.length - 1] = { role: 'user', content: content };
        return out;
      }
      repairHistory();   // never send a tool_use without its tool_result (heals a poisoned chat)
      var _ownKey = getOwnKey();
      var _target = _ownKey ? 'https://api.anthropic.com/v1/messages' : getUrl();
      var _headers = _ownKey
        ? { 'Content-Type': 'application/json', 'x-api-key': _ownKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        : _aiHeaders();
      return fetch(_target, {
        method: 'POST',
        headers: _headers,
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: staticSystem(), tools: noTools ? undefined : activeTools(), messages: messagesWithMoment() })
      }).then(function (r) { return r.json().catch(function () { return { error: 'Bad response (HTTP ' + r.status + ')' }; }); });
    }

    // Most recent assistant message as plain text (skips tool_use blocks).
    function lastAssistantText() {
      for (var i = history.length - 1; i >= 0; i--) {
        var m = history[i];
        if (!m || m.role !== 'assistant') continue;
        if (typeof m.content === 'string') return m.content;
        if (Array.isArray(m.content)) {
          var t = m.content.map(function (c) { return c && c.type === 'text' ? c.text : ''; }).filter(Boolean).join('\n');
          if (t) return t;
        }
      }
      return '';
    }

    // One-shot translation via the worker (no tools, isolated from the chat history).
    function translateToEnglish(text) {
      var url = getUrl();
      if (!url && !getOwnKey()) return Promise.reject(new Error('no url'));
      var sys = 'You are a translator. Translate the user message into natural English. It is a travel itinerary. ' +
        'KEEP every clock time exactly, KEEP the Chinese double-hours (pinyin + hanzi, e.g. "Wu 午"), KEEP all place names, ' +
        'directions and numbers, and KEEP the line breaks / emoji structure. Output ONLY the English translation, no preamble.';
      var _ownKeyT = getOwnKey();
      var _targetT = _ownKeyT ? 'https://api.anthropic.com/v1/messages' : url;
      var _headersT = _ownKeyT
        ? { 'Content-Type': 'application/json', 'x-api-key': _ownKeyT, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        : _aiHeaders();
      return fetch(_targetT, {
        method: 'POST', headers: _headersT,
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: sys, tools: [], messages: [{ role: 'user', content: text }] })
      }).then(function (r) { return r.json(); }).then(function (d) { return extractText(d) || text; });
    }

    // 📤 Share the last itinerary, translated to English (Web Share, else clipboard).
    // The itinerary is NOT the assistant's prose: it is built by the planner and lives in
    // window._tpLastResult.text (the same lines the card is drawn from). Sharing
    // lastAssistantText() sends whatever the model happened to say last — after a depart-day
    // comparison that is the comparison, not the trip. So: plan first, chat text only as a
    // fallback when no plan exists in this session.
    function itineraryToShare() {
      try {
        var r = window._tpLastResult;
        if (r && r.text && String(r.text).trim()) {
          var head = [];
          if (r.origin || r.dest) head.push((r.origin || '?') + ' \u2192 ' + (r.dest || '?'));
          var sub = [];
          if (r.km != null) sub.push(r.km + ' km');
          if (r.driving_time) sub.push(r.driving_time);
          if (r.snapped) sub.push('direction ' + r.snapped);
          if (sub.length) head.push(sub.join(' \u00b7 '));
          if (r.fav_summary) head.push(r.fav_summary);
          return (head.length ? head.join('\n') + '\n\n' : '') + r.text;
        }
      } catch (e) {}
      return lastAssistantText();
    }
    function shareItinerary() {
      var t = itineraryToShare();
      if (!t) { setStatus('Nothing to share yet — ask for an itinerary first.', '#b00'); return; }
      shareBtn.textContent = '…'; setStatus('Translating to English…');
      translateToEnglish(t).then(function (en) {
        shareBtn.textContent = '📤'; setStatus('');
        var payload = { title: 'XKDG itinerary', text: en };
        if (navigator.share) {
          navigator.share(payload).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(en).then(function () {
            shareBtn.textContent = '✓'; setStatus('Copied to clipboard (English).', '#1b8a3f');
            setTimeout(function () { shareBtn.textContent = '📤'; }, 1400);
          }).catch(function () { window.prompt('Copy the English itinerary:', en); });
        } else {
          window.prompt('Copy the English itinerary:', en);
        }
      }).catch(function () { shareBtn.textContent = '📤'; setStatus('Translation failed — try again.', '#b00'); });
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

          // Answer tool_use blocks whenever they are PRESENT, regardless of stop_reason.
          // With a small max_tokens the model can emit a tool_use yet report
          // stop_reason:'max_tokens'; keying on stop_reason left that tool_use unanswered,
          // which poisoned the whole history (every later request then failed).
          var toolUses = (data.content || []).filter(function (c) { return c.type === 'tool_use'; });
          if (toolUses.length) {
            // Run tool calls ONE AT A TIME (the heavy planners share engine/DOM
            // state and are NOT safe to run concurrently — parallel runs could
            // leave a promise hung and freeze the whole chat), each guarded by a
            // timeout so a single stuck tool can never block the conversation.
            function execToolSafe(tu) {
              var TIMEOUT_MS = 60000;
              return new Promise(function (resolve) {
                var settled = false;
                var timer = setTimeout(function () {
                  if (settled) return; settled = true;
                  resolve({ type: 'tool_result', tool_use_id: tu.id,
                    content: JSON.stringify({ error: 'Tool "' + tu.name + '" timed out — try a smaller request (fewer themes/days or a smaller radius).' }) });
                }, TIMEOUT_MS);
                Promise.resolve().then(function () { return ensureFreshOrigin(tu.name, tu.input); })
                  .then(function () { return execTool(tu.name, tu.input); })
                  .catch(function (e) { return { error: String((e && e.message) || e) }; })
                  .then(function (out) {
                    if (settled) return; settled = true; clearTimeout(timer);
                    resolve({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) });
                  });
              });
            }
            var toolResultsAcc = [];
            var seq = Promise.resolve();
            toolUses.forEach(function (tu) {
              seq = seq.then(function () {
                setStatus('Running: ' + tu.name + '…');
                return execToolSafe(tu).then(function (tr) { toolResultsAcc.push(tr); });
              });
            });
            return seq.then(function () {
              var toolResults = toolResultsAcc;
              history.push({ role: 'user', content: toolResults });
              if (guard++ < 12) return step();   // let Claude read the results and continue
              // Step cap reached: make ONE final call WITHOUT tools so Claude must
              // answer in prose with what it has, instead of dead-ending.
              setStatus('Finishing…');
              return callAnthropic(true).then(function (fin) {
                if (fin && !fin.error) { history.push({ role: 'assistant', content: fin.content }); var ft = extractText(fin); addBubble('assistant', ft || '(no further response)'); }
                else { addBubble('assistant', '(stopped after several tool steps)'); }
                setStatus('');
              });
            });
          }
          setStatus('');
        });
      }
      return step();
    }

    function doSend(overrideToSend, overrideBubble) {
      if (sending) return;
      stopSpeaking();
      var hasOverride = (typeof overrideToSend === 'string' && overrideToSend.length > 0);
      var text = (input.value || '').trim();
      if (!hasOverride && !text) return;
      var url = getUrl();
      if (!url) { promptUrl(); if (!getUrl()) return; }
      // session 26: nothing leaves the app until an area is chosen (no more "all tools").
      if (!getToolArea()) {
        askForArea(hasOverride ? overrideToSend : null, hasOverride ? overrideBubble : null);
        return;
      }

      var macro = hasOverride ? null : findMacro(text);   // a short trigger expands into its full instruction
      var toSend = hasOverride ? overrideToSend : (macro ? macro.text : text);

      input.value = '';
      // session 26: bring in another area's tools when the question plainly needs them.
      var pulled = autoPullAreas(toSend);
      history.push({ role: 'user', content: toSend });
      var bubble = (typeof overrideBubble === 'string' && overrideBubble.length)
        ? overrideBubble
        : (macro ? ('\u26A1 ' + text + (macro.label ? ' \u2014 ' + macro.label : '')) : text);
      addBubble('user', bubble);
      if (pulled.length) {
        try {
          msgs.appendChild(elc('div', { style:
            'align-self:center;font-size:11px;color:#8a6d00;background:#fff8e1;border:1px solid #ffe082;' +
            'border-radius:10px;padding:3px 9px;margin:2px 0;text-align:center;' },
            '\u2795 ' + pulled.map(function (a) { return AREA_LABELS[a]; }).join(' + ') + ' added for this question'));
        } catch (e) {}
      }
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
      addChainTrips: function (payload) { try { openPanel(); return addChainBubble(payload); } catch (e) { return null; } },
      addCityTour: function (payload) { try { openPanel(); return addCityTourBubble(payload); } catch (e) { return null; } },
      addMultiDay: function (payload) { try { openPanel(); return addMultiDayBubble(payload); } catch (e) { return null; } },
      addMobileTour: function (payload) { try { openPanel(); return addMobileTourBubble(payload); } catch (e) { return null; } },
      addDayTrip: function (payload) { try { openPanel(); return addDayTripBubble(payload); } catch (e) { return null; } },
      addDivinationMatches: function (payload) { try { openPanel(); return addDivinationMatchesBubble(payload); } catch (e) { return null; } },
      addItinerarySearch: function (payload) { try { openPanel(); return addItinerarySearchBubble(payload); } catch (e) { return null; } },
      addVerifyButton: function (info) { try { openPanel(); return addVerifyButtonBubble(info); } catch (e) { return null; } },
      updateItineraryCharging: function (info) { try { updateItineraryCharging(info); } catch (e) {} },
      updateItineraryExits: function (exits) { try { updateItineraryExits(exits); } catch (e) {} },
      updateItineraryStops: function (legs) { try { updateItineraryStops(legs); } catch (e) {} },
      // Programmatic ask: open the panel, drop a message in the box and send it.
      // Used by structured UIs (e.g. the Lucky Trip panel) to drive the AI.
      ask: function (text) { try { openPanel(); if (input) { input.value = text; } doSend(); } catch (e) {} },
      _send: doSend, _history: function () { return history; },
      _repairHistory: repairHistory, _selfTest: selfTest
    };
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();

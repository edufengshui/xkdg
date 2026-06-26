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
    'explain_purpose (read-only: returns the approved guide for a purpose — the SAME content the 📖 button ' +
    'shows). CALL IT whenever the user asks what makes a good DATE for a purpose ("cosa costituisce una buona ' +
    'data per Health?", "what makes a good date for Career?", "comment choisir une bonne date pour…"), how a ' +
    'purpose is DEFINED/coded, or how to ACTIVATE it in Feng Shui — in any language. Then present BOTH parts of ' +
    'the returned `guide`: (1) the good DATE criteria (good_date_xkdg) and (2) the Feng Shui ACTIVATION ' +
    '(feng_shui_activation_qmdj: door, QMDJ stars/spirits, flying stars), followed by the general_rules. Do not ' +
    'invent criteria — report only what the tool returns).\n' +
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
    '   • If too few dates come back, offer the soft search (strictness:"soft").\n' +
    '- TRIPS ON CERTAIN DAYS: in general, pass weekdays to find_good_dates to keep only those days; a clock time ' +
    'maps to the double-hour above.\n' +
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
    '- get_app_state tells you what the user currently has loaded/typed.\n' +
    '- ARCHITECTURE YOU MUST KNOW (so you never claim credit or blame for things you did not do):\n' +
    '  (a) When you call plan_travel, you receive ONLY favourable windows + a note. You do NOT receive stop names, ' +
    'charger names, or the itinerary text. You write ONE short sentence and stop.\n' +
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
    'different route, call diagnose_maps_export to see what waypoints actually made it into the link.\n' +
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
    'user explicitly asks to analyse a direction, regardless of the toggle.\n' +
    '- DIVINATION chart finding: when the user wants a future chart that satisfies QMDJ conditions (a stem in a palace / in any ' +
    'of several palaces, a door in a palace) — e.g. "find a chart where Bing is in Li, Injury in Gen, and Geng can be in Gen, ' +
    'Xun, Dui or Qian" — call find_divination_chart with those conditions and list the matching date/double-hours. Translate ' +
    'the user\'s plain wording into stems[] and doors[] conditions; a querent who "can stay in X, Y or Z" becomes one stem ' +
    'condition with palaces:[X,Y,Z].\n\n' +
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
    '23:00-01:00 ranges). Report `hour` exactly as returned, and never recompute or "round" a double-hour clock time yourself.\n' +
    '- "LUCKY TRIP" IS A DEDICATED COMMAND PHRASE. Whenever the user writes or says "lucky trip" in ANY case or ' +
    'language ("lucky trip", "Lucky Trip", "un lucky trip", "il mio lucky trip", "giro fortunato"), it ALWAYS means: ' +
    'call plan_lucky_day_trip and DECIDE EVERYTHING yourself — do NOT ask where to go. The tool itself chooses the ' +
    'direction, destination, departure time, stay length and return. The same applies to equivalent no-destination ' +
    'phrasings ("un giro fortunato di qualche ora", "dove posso andare oggi di fortunato", "find me a lucky trip out ' +
    'of town", "where could I go today"). Pass only what the user gave (origin if you know it, max_radius_km, ' +
    'stay_min_h/stay_max_h, and direction if the user named one e.g. "verso nord" → direction:"N") and let the tool decide ' +
    'everything else. Then present the returned proposals as ' +
    'several DISTINCT options (varying by direction, distance and stay) with their scores; the user picks one and you run it ' +
    'with plan_travel using THAT option\'s dest_lat/dest_lon. Use plan_travel (which needs a destination) ONLY when the user ' +
    'names a specific place. Never tell the user a lucky trip needs a destination. If the user wants a KIND of place ' +
    '("in natura", "una passeggiata", "culturale", "castelli", "borghi") OR asks to filter the proposals afterwards ' +
    '("ora solo natura"), pass the category parameter and call again with the SAME other parameters — each proposal ' +
    'then becomes a real named place. When a proposal has a "place", show that name as the destination. ' +
    'A Lucky Trip answer ALWAYS contains a "chains" field too: multi-leg lucky LOOPS, one per stop-count. When NO direction is ' +
    'requested, present the WHOLE answer together: FIRST the simple out-and-back options, THEN a "🔗 Tragitti a catena" section ' +
    'with the loops ordered by increasing stops (1-stop, then 2, 3, 4). When the user DID request a direction (e.g. "verso nord" → ' +
    'direction:"N"), the tool applies a strict priority: it returns out-and-back trips toward that direction AND chain loops heading ' +
    'that way; "direction_satisfied":true means everything shown DOES head that way — present it as the answer (round-trips first, ' +
    'then chains by stops). Only if NOTHING heads that way (no round-trip AND no chain) does it return "direction_satisfied":false ' +
    'with ALTERNATIVE directions — in that case tell the user plainly FIRST that their direction is not available today, then show ' +
    'the alternatives. NEVER make the user ask for chains separately, and NEVER offer alternative directions while a trip toward the ' +
    'requested direction still exists.\n' +
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
    'the spoken reply very short (e.g. "Fatto.") since the user is likely driving.\n' +
    '- NEVER convert a double-hour NAME (Zi, Chou, Yin, ... Wu, Wei, ...) into a clock time yourself, and NEVER ' +
    'add or subtract an hour for daylight saving - you get DST wrong. The tools already handle DST and true solar ' +
    'time: read the clock times from plan_travel\'s favorable_windows (from/to) and from plan_arrive_by\'s ' +
    'depart_clock/arrive_clock, and present THOSE unchanged.\n' +
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
    '- FIXED time ("I leave at 11 exactly/sharp", "tassativamente"): one call with depart_time "HH:MM" + ' +
    'fixed_time:true + open_planner:true.\n' +
    '- TIME CONVENTION (important): every clock time the user says ("parto alle 12:00") and every time you report ' +
    '(from/to, wall_from, departure_planned) is the LOCAL LEGAL time on their phone — i.e. already daylight-saving ' +
    '(ora legale) when DST is in effect. NEVER convert it, and NEVER add or subtract an hour. The favourable ' +
    'directions belong to the Chinese double-hour (时辰) the planner reports in departure_double_hour: name it ' +
    '(e.g. "the Wu hour 午"), and its start on the user\'s clock is wall_from. So "parto alle 12:00" in summer means ' +
    '12:00 ora legale, which the planner places at the start of the Wu double-hour. The solar_* fields are true ' +
    'solar time for the engine only — do not mention them unless the user explicitly asks about solar time.\n' +
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
    'is saving their Open Charge Map key once; if it is missing the charging panel says so.\n' +
    '- For Bed/Desk/Water dates the tool reads the section inputs; if a required degree is missing, ask the ' +
    'user for it (0-360) and call the tool with it.\n' +
    '- ACTIVATING WATER ("positive hours / good date to turn on the aquarium / fountain / water feature" facing a ' +
    'DIRECTION): use find_water_activation_full(direction, star_type, star_num) - the UNIFIED triple scan that merges ' +
    'XKDG person hours + Qimen quadrant + Qimen special configurations and ranks by tier (3 = all three, best, down to ' +
    '1). For an aquarium facing X: direction=X, star_type=water, star_num = the WATER (facing) star living in palace X ' +
    '(get it via recall_flying_stars or get_app_state). Present tier 3 first, then 2, then 1, stating for each which ' +
    'scans it passed and the sub-scores. The tool skips gracefully any scan it cannot run (e.g. no person, no star) and ' +
    'reports it in scan_notes.\n' +
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
    'date scan for PLACING water; find_water_hours is the Qimen sector alone.\n' +
    '- XKDG HEXAGRAM SYSTEM (CORE, in-scope - NOT external I Ching): the 64 hexagrams / gua, their two trigrams ' +
    '(Qian, Dui, Li, Zhen, Xun, Kan, Gen, Kun), each hexagram\'s qi (1-9) and yun (1-9), its Zheng Shen 正神 / Ling ' +
    'Shen 零神 status for the current period, its luopan degree, and the 8 FAMILIES (Qian-Kun, Kan-Li, Zhen-Xun, ' +
    'Gen-Dui, Pi-Tai, JiJi-WeiJi, Heng-Yi, Sun-Xian) with father/mother/son/daughter roles (via gan-zhi) are ALL part ' +
    'of THIS app\'s XKDG method and live in its data tables. For ANY question about a hexagram, trigram, gua, qi, ' +
    'yun, family/role, or Zheng Shen / Ling Shen (e.g. "which family does Kun over Kan belong to?", "qi and yun of ' +
    'hexagram 7?", "is this hexagram Zheng Shen now?"), CALL get_hexagram_info (by hex number, or by upper + lower ' +
    'trigram) and answer from it. NEVER say hexagrams/families are out of scope and NEVER send the user to an ' +
    'external I Ching book - the answer is in the app.\n' +
    '- FLYING-STAR GROUNDING (CRITICAL - NEVER GUESS): NEVER state which flying star sits in a direction from your own ' +
    'reasoning or memory, and NEVER compute a chart in your head. The ONLY source of truth is get_house_setup → each ' +
    'floor\u2019s flying_stars object (palaces{DIR:{water,mountain}}, center, imprisoned, liberation, imprisonment_note), ' +
    'computed authoritatively from facing+period. To answer "what water star is at <DIR>" or to pick star_num for an ' +
    'activation, READ flying_stars.palaces[<DIR>].water — do not infer it. If flying_stars is null/absent (facing or ' +
    'period not set for that house), tell the user the chart cannot be computed and ask them to set facing & period - ' +
    'do NOT invent a star. When you call find_water_activation_full, also pass facing_deg and period from that floor so ' +
    'the special-config scan uses the SAME chart.\n' +
    '- FLYING vs ROTATING chart (CRITICAL - NEVER mix): FS STIMULATORS - activating a flying star / water / aquarium / ' +
    'fountain / mountain star (find_water_activation_full, find_water_hours, find_qimen_hours_for_star, QFS) - ALWAYS ' +
    'use the FLYING chart (\u98db\u76e4). The ROTATING chart (\u8f49\u76e4) is used ONLY for human DIRECTIONAL actions: travel / ' +
    'departures and divination (analyze_direction, travel tools). NEVER describe water / flying-star activation as ' +
    'using the "rotating chart", and never present rotating-chart results for an FS-stimulator question. If a star has ' +
    'no Qimen configuration, explain the REAL reason from the tool result (e.g. the star sits in the CENTRE palace this ' +
    'period, so it has no outer palace to activate; or no favourable Door / San Qi reached its palace this date) - do ' +
    'NOT say "rotating chart".\n' +
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
    '(a void hour is weak/empty even if otherwise favourable).\n' +
    '- VERIFY BUTTON: whenever you recommend a specific DATE + HOUR (water activation, date selection, etc.), also call ' +
    'show_verify_button(date, hour branch, direction if any) so the user gets a one-tap button to open the XKDG date and ' +
    'the QMDJ Hour Flying Chart and check it. For several houses, add one button per recommended date+hour.\n' +
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
          origin_lat: { type: 'number', description: 'Origin latitude (defaults to saved GPS if omitted).' },
          origin_lon: { type: 'number', description: 'Origin longitude.' },
          origin_name: { type: 'string', description: 'Origin place name (for labels).' },
          depart_date: { type: 'string', description: 'Departure date YYYY-MM-DD (default today).' },
          depart_hour: { type: 'integer', description: 'Wall-clock start hour 0-23. OMIT it (and depart_time) to let the app auto-pick the most favourable, earliest daytime departure. Ignored if depart_time is given.' },
          depart_time: { type: 'string', description: 'Wall-clock start time HH:MM (overrides depart_hour). Use the favourable window start.' },
          fixed_time: { type: 'boolean', description: 'TRUE only if the user fixed an exact time ("exactly/sharp"). When false (default) the departure is auto-snapped to the START of the soonest favourable double-hour.' },
          duration_h: { type: 'integer', description: 'Trip length in hours (default 12).' },
          range_km: { type: 'number', description: 'EV autonomy in km (enables auto charging-stop search in the planner).' },
          reserve_km: { type: 'number', description: 'EV safety reserve in km.' },
          open_planner: { type: 'boolean', description: 'Open + run the filled Travel Planner. Defaults true when both origin and destination are given.' }
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
          origin_lat: { type: 'number', description: 'Start latitude (defaults to saved GPS, else the app default).' },
          origin_lon: { type: 'number', description: 'Start longitude.' },
          origin_name: { type: 'string', description: 'Start place name (for labels).' },
          date: { type: 'string', description: 'Day YYYY-MM-DD (default today).' },
          max_radius_km: { type: 'number', description: 'Maximum distance from the origin in km (default 200).' },
          stay_min_h: { type: 'number', description: 'Minimum stay at the destination in hours (default 1.5).' },
          stay_max_h: { type: 'number', description: 'Maximum stay at the destination in hours (default 3); widened automatically if no clean return is found.' },
          category: { type: 'string', description: 'OPTIONAL kind of destination, so each proposal becomes a REAL place (from OpenStreetMap) instead of a generic point. Use "nature" (lakes, woods, parks, viewpoints, walks), "culture" (castles, museums, historic sites), "town" (villages/towns), or leave empty for generic points. Pass the user\'s words ("natura", "passeggiata", "culturale", "borghi"...) — they are mapped automatically. The user can also choose the category AFTERWARDS ("now only nature ones"): just call again with the same parameters plus this one.' },
          count: { type: 'integer', description: 'How many distinct proposals to return (2-6, default 4).' },
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
          origin_lat: { type: 'number', description: 'Start latitude (defaults to saved GPS, else the app default).' },
          origin_lon: { type: 'number', description: 'Start longitude.' },
          origin_name: { type: 'string', description: 'Start place name (for labels).' },
          date: { type: 'string', description: 'Day YYYY-MM-DD (default today).' },
          max_legs: { type: 'integer', description: 'Maximum legs before returning home (2-5, default 5).' },
          max_leg_km: { type: 'number', description: 'Maximum length of a single leg in km (default 140).' },
          count: { type: 'integer', description: 'How many distinct loops to return (2-6, default 5).' }
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
          origin_lat: { type: 'number', description: 'Origin latitude (defaults to saved GPS if omitted).' },
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
      description: 'UNIFIED triple scan for "positive hours to turn on the aquarium / water feature" - runs and merges ALL THREE: ' +
        '(1) XKDG positive hours for the loaded person, (2) Qimen of the generic 45deg quadrant (direction), and ' +
        '(3) Qimen SPECIAL configurations at the flying-star palace (via the favourable preset). Returns each hour with ' +
        'its three sub-scores, which scans it passed (matched), a tier (3 = passed all three, best), and a combined_score. ' +
        'Results are ranked from tier 3 down to tier 1. For "turn on the aquarium facing X" the direction is X and the ' +
        'special-config star is the WATER (facing) star living in palace X (star_type=water, star_num=that star).',
      input_schema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], description: 'Compass quadrant the water faces (for scan 2).' },
          star_type: { type: 'string', enum: ['water', 'mountain'], description: 'For scan 3: water = facing star, mountain = sitting star. For an aquarium use water.' },
          star_num: { type: 'integer', description: 'For scan 3: the flying star number (1-9) living in that palace. Get it from get_house_setup flying_stars (authoritative); never guess.' },
          facing_deg: { type: 'number', description: 'The house/floor facing in degrees (from get_house_setup floor.facing). Pass it so scan 3 uses THIS house\u2019s chart instead of whatever page is open. Strongly recommended.' },
          period: { type: 'integer', description: 'The house/floor period 1-9 (from get_house_setup floor.period). Pass together with facing_deg.' },
          days: { type: 'integer', description: 'How many days ahead to scan (default 7).' },
          start_date: { type: 'string', description: 'Optional start date YYYY-MM-DD (defaults to today).' }
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
      name: 'list_source',
      description: 'List the app\'s own source files (the live published version on GitHub, branch main). Use this ' +
        'as the FIRST step when the user asks how something is implemented, how a feature really works under the ' +
        'hood, the current status/version of a part of the app, or to look something up in the actual code. Returns ' +
        'each file name with its size. After listing, pick the relevant file(s) and call read_source to read them.',
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

  function execTool(name, input) {
    try {
      if (name === 'find_good_dates') return toolFindGoodDates(input || {});
      if (name === 'explain_purpose') return toolExplainPurpose(input || {});
      if (name === 'open_scan_result') return toolOpenScanResult(input || {});
      if (name === 'show_verify_button') return toolShowVerifyButton(input || {});
      if (name === 'find_bed_dates') return toolFindBedDates(input || {});
      if (name === 'find_desk_dates') return toolFindDeskDates(input || {});
      if (name === 'plan_travel') return toolPlanTravel(input || {});
      if (name === 'plan_lucky_day_trip') return toolPlanLuckyDayTrip(input || {});
      if (name === 'plan_lucky_chain') return toolPlanLuckyChain(input || {});
      if (name === 'plan_arrive_by') return toolPlanArriveBy(input || {});
      if (name === 'open_travel_planner') return toolOpenTravelPlanner(input || {});
      if (name === 'open_itinerary_in_maps') return toolOpenItineraryInMaps();
      if (name === 'start_compass') return toolStartCompass(input || {});
      if (name === 'control_compass') return toolControlCompass(input || {});
      if (name === 'open_qimen_for_flying_stars') return toolOpenQimenFS(input || {});
      if (name === 'get_app_state') return toolGetAppState();
      if (name === 'get_trip_itinerary') return toolGetTripItinerary();
      if (name === 'analyze_direction') return toolAnalyzeDirection(input || {});
      if (name === 'find_divination_chart') return toolFindDivinationChart(input || {});
      if (name === 'find_water_dates') return toolFindWaterDates(input || {});
      if (name === 'find_water_activation') return toolFindWaterActivation(input || {});
      if (name === 'find_water_activation_full') return toolFindWaterActivationFull(input || {});
      if (name === 'open_section') return toolOpenSection(input || {});
      if (name === 'recall_flying_stars') return toolRecallFlyingStars();
      if (name === 'open_direction_calculator') return toolOpenDirectionCalc();
      if (name === 'open_chart_finder') return toolOpenChartFinder();
      if (name === 'list_houses') return toolListHouses();
      if (name === 'get_house_setup') return toolGetHouseSetup(input || {});
      if (name === 'set_active_house') return toolSetActiveHouse(input || {});
      if (name === 'load_house') return toolLoadHouse(input || {});
      if (name === 'load_placement') return toolLoadPlacement(input || {});
      if (name === 'find_water_hours') return toolFindWaterHours(input || {});
      if (name === 'find_qimen_hours_for_star') return toolFindQimenHoursForStar(input || {});
      if (name === 'get_hexagram_info') return toolHexagramInfo(input || {});
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
        label: 'Acquario — entrambe le case, domani',
        text: 'Per la data di DOMANI, trova le ore migliori per accendere l\u2019acquario in OGNI casa salvata della persona attiva. ' +
              'Per ciascuna casa usa la SUA posizione d\u2019acqua salvata (direzione) e la sua stella d\u2019acqua (facing), sulla SUA carta volante. ' +
              'Procedi una casa alla volta: rendi attiva la casa (set_active_house), leggi il suo setup, esegui find_water_activation_full per quella casa, ' +
              'e dammi UN\u2019ora migliore PER OGNI casa (un risultato separato per ciascuna), con data e motivo. Alla fine ripristina la casa che era attiva all\u2019inizio.'
      }];
    }
    // Seed / refresh the Vienna<->Tuoro travel-planner test macros (VT / TV).
    // They ASK for the departure date/time on tap, then plan with exact coordinates.
    try {
      if (localStorage.getItem('xkdg_ai_macros_vt_tv') !== '2') {
        var seed = [
          {
            trigger: 'VT', icon: '\ud83d\ude97', askDepart: true,   // 🚗
            label: 'Vienna \u2192 Tuoro (travel-planner test)',
            text: 'Pianifica un viaggio in auto da Vienna (Austria) a Tuoro sul Trasimeno (Italia). ' +
                  'Chiama plan_travel con queste coordinate ESATTE e questi nomi: ' +
                  'origin_name "Vienna", origin_lat 48.2082, origin_lon 16.3738; ' +
                  'dest_name "Tuoro sul Trasimeno", dest_lat 43.2074, dest_lon 12.0772. ' +
                  'Apri il planner (open_planner: true).'
          },
          {
            trigger: 'TV', icon: '\ud83d\ude97', askDepart: true,   // 🚗
            label: 'Tuoro \u2192 Vienna (travel-planner test)',
            text: 'Pianifica un viaggio in auto da Tuoro sul Trasimeno (Italia) a Vienna (Austria). ' +
                  'Chiama plan_travel con queste coordinate ESATTE e questi nomi: ' +
                  'origin_name "Tuoro sul Trasimeno", origin_lat 43.2074, origin_lon 12.0772; ' +
                  'dest_name "Vienna", dest_lat 48.2082, dest_lon 16.3738. ' +
                  'Apri il planner (open_planner: true).'
          }
        ];
        // Replace any earlier VT/TV, then append the current definitions.
        arr = arr.filter(function (x) { var t = (x.trigger || '').toLowerCase(); return t !== 'vt' && t !== 'tv'; });
        seed.forEach(function (m) { arr.push(m); });
        localStorage.setItem('xkdg_ai_macros_vt_tv', '2');
      }
    } catch (e) {}
    try { localStorage.setItem('xkdg_ai_macros', JSON.stringify(arr)); } catch (e) {}
    return arr;
  }
  function saveMacros(arr) { try { localStorage.setItem('xkdg_ai_macros', JSON.stringify(arr)); } catch (e) {} }

  // Small prompt asked before a travel macro runs: when do you want to depart?
  // Calls cb(clause, humanLabel) — clause is appended to the macro instruction.
  function _askDepart(cb) {
    var old = document.getElementById('xkdg-depart-ov'); if (old && old.parentNode) old.parentNode.removeChild(old);
    var ov = E('div', 'position:fixed;inset:0;z-index:100003;background:rgba(20,8,30,.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;');
    ov.id = 'xkdg-depart-ov';
    var today = new Date().toISOString().slice(0, 10);
    var card = E('div', 'background:#fff;border-radius:12px;max-width:340px;width:100%;padding:16px;box-shadow:0 12px 44px rgba(0,0,0,.32);');
    card.innerHTML =
        '<div style="font-weight:700;color:#6a1b9a;font-size:15px;margin-bottom:12px;">\ud83d\ude97 Quando vuoi partire?</div>'
      + '<label style="font-size:12px;color:#555;display:block;margin-bottom:3px;">Data</label>'
      + '<input type="date" id="xkdg-depart-date" value="' + today + '" style="width:100%;padding:8px;border:1px solid #c9b6d6;border-radius:6px;margin-bottom:12px;box-sizing:border-box;font-size:13px;">'
      + '<label style="font-size:12px;color:#555;display:block;margin-bottom:3px;">Ora <span style="color:#999;">(vuoto = ora pi\u00f9 favorevole)</span></label>'
      + '<input type="time" id="xkdg-depart-time" style="width:100%;padding:8px;border:1px solid #c9b6d6;border-radius:6px;margin-bottom:16px;box-sizing:border-box;font-size:13px;">'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
      +   '<button id="xkdg-depart-cancel" style="background:#eee;border:0;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;">Annulla</button>'
      +   '<button id="xkdg-depart-go" style="background:#6a1b9a;color:#fff;border:0;border-radius:8px;padding:8px 18px;font-weight:700;cursor:pointer;font-size:13px;">Pianifica</button>'
      + '</div>';
    ov.appendChild(card);
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov && ov.parentNode) ov.parentNode.removeChild(ov); });
    document.getElementById('xkdg-depart-cancel').onclick = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); };
    document.getElementById('xkdg-depart-go').onclick = function () {
      var d = document.getElementById('xkdg-depart-date').value || today;
      var t = document.getElementById('xkdg-depart-time').value || '';
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      var clause, human;
      if (t) {
        clause = 'Parti il ' + d + ' alle ' + t + ': usa depart_date ' + d + ' e depart_time ' + t + '.';
        human = d + ' ' + t;
      } else {
        clause = 'Parti il ' + d + ': usa depart_date ' + d + ' e OMETTI depart_time/depart_hour, lasciando che il planner scelga l\u2019ora diurna pi\u00f9 favorevole di quel giorno.';
        human = d + ' \u00b7 ora pi\u00f9 favorevole';
      }
      try { cb(clause, human); } catch (e) {}
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
      var res = runWith(purpose).filter(function (r) { return wkOk(r.isoDate); });
      return {
        strictness: purpose ? 'strict' : 'general',
        purpose: purpose || '(general)', days: days, from: start,
        weekday_filtered: !!wkSet,
        persons_loaded: both ? 'A+B' : (pl.a ? 'A' : 'B'),
        count: res.length,
        results: res.slice(0, 15).map(function (r, i) { return row(r, i); })
      };
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr < today) dateStr = today;
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
    if (origin) opts.origin = origin;
    var wantDir = (input.direction && /^(N|NE|E|SE|S|SW|W|NW)$/.test(input.direction)) ? input.direction : null;

    // CHAINED loops (sync, no network): one BEST loop per stop-count (1,2,3,4 direction-changes).
    // firstDir biases/limits loops by their first leg; only=true keeps ONLY loops heading that way.
    function chainBlock(firstDir, only) {
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
      var instr = 'Present these as DISTINCT options to choose from — they vary by direction, distance and stay. ' +
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
        'If "poi_service_error" is true, the places service (OpenStreetMap) was temporarily unreachable — say exactly that ' +
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
      return {
        ok: true, date: r.date,
        instructions: 'These are CHAINED lucky trips: each loop is a sequence of legs, ONE per consecutive Chinese double-hour, ' +
          'and the polygon RETURNS EXACTLY to the origin (resid km is ~0). Present EACH chain as a numbered option, then its ordered ' +
          'itinerary leg by leg. For every leg show: the leg number, the DIRECTION (dir), the favourable DOOR (doorLabel, e.g. ' +
          '"Open 开"), the double-hour (brPy + br, e.g. "Si 巳"), the distance (km), and the leg END coordinates (to.lat, to.lon) so ' +
          'the user can open it on a map. Also show departCn/arriveCn (the Chinese double-hour of leaving/arriving each leg) VERBATIM ' +
          '— they are already on compensated true-solar-time, never recompute or shift them. State clearly that the trip closes back ' +
          'on the start within "resid" km. "score" (0-5) is the overall luck of the loop; "sanqiCount" = how many legs carry San Qi. ' +
          'Do NOT invent directions, doors or times — show only what the tool provides. The final leg returns to the origin.',
        origin: r.origin, chains: r.chains
      };
    } catch (e) { return { error: 'Chain planning failed: ' + ((e && e.message) || e) }; }
  }

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
    // Did the user give an explicit departure time? If not, the app must AUTO-PICK
    // the most favourable (and earliest, to stay shortest) departure — never a fixed 08:00.
    var hasExplicitTime = (input.depart_hour != null) ||
      (typeof input.depart_time === 'string' && /^\d{1,2}:\d{2}$/.test(input.depart_time));
    var autoDepart = !hasExplicitTime;
    var hour = (input.depart_hour != null) ? parseInt(input.depart_hour, 10) : 12;   // 12:00 is only a neutral probe time for the summary; the planner picks the real one
    var timeStr = (typeof input.depart_time === 'string' && /^\d{1,2}:\d{2}$/.test(input.depart_time))
      ? (String(parseInt(input.depart_time.split(':')[0], 10)).padStart(2, '0') + ':' + input.depart_time.split(':')[1])
      : (String(hour).padStart(2, '0') + ':00');
    var dep = new Date(dateStr + 'T' + timeStr + ':00');
    if (isNaN(dep.getTime())) return { error: 'Invalid departure date/time.' };
    // When the time is auto-picked, scan the whole day for the favourable-windows summary.
    var durH = parseInt(input.duration_h, 10) || (autoDepart ? 16 : 12);
    if (autoDepart) dep = new Date(dateStr + 'T05:00:00');
    var utc = parseFloat((document.getElementById('utc-offset') || {}).value);
    if (isNaN(utc)) utc = 1;
    var dstOn = dstActiveOn(dep);   // auto-detect daylight saving for the departure date (device timezone)
    function hm(d) { return (d && d.getHours) ? (String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')) : null; }
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
          from: hm(s.wallStart), to: hm(s.wallEnd),          // LOCAL LEGAL (DST) clock — the times the user reads
          double_hour: s.brPy || s.brHan,                    // e.g. "Wu" — the Chinese double-hour (时辰) branch
          double_hour_han: s.brHan,                          // e.g. "午"
          solar_from: s.tstStart, solar_to: s.tstEnd,        // same window in TRUE SOLAR time (for reference only)
          ganzhi: s.gZhiPy || s.gZhiHan, weekday: s.weekday,
          directions: good.map(function (d) { return { dir: d.dir, score: d.eval.score, door: d.eval.door }; })
        });
      }
    });
    // For a real A→B itinerary, also open the planner already filled and run the road plan
    // (one reliable call instead of depending on a separate open_travel_planner call).
    var openPlanner = (input.open_planner != null) ? !!input.open_planner : (input.origin_lat != null && input.dest_lat != null);

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
      favorable_windows: windows.slice(0, 12)
    };
    if (openPlanner && origin && window.TravelPlanner && typeof window.TravelPlanner.openPrefilled === 'function') {
      try {
        window.TravelPlanner.openPrefilled({
          originLat: origin.lat, originLon: origin.lon, originName: input.origin_name || null,
          destLat: dest.lat, destLon: dest.lon, destName: input.dest_name || null,
          departDate: dateStr, departTime: autoDepart ? null : snapStart, autoDepart: autoDepart,
          durationH: (input.duration_h != null ? durH : null), utc: utc, dst: dstOn,
          rangeKm: (input.range_km != null) ? +input.range_km : null,
          reserveKm: (input.reserve_km != null) ? +input.reserve_km : null,
          run: true
        });
      } catch (e) {}
      baseOut.planner_opened = true;
      baseOut.note = 'The planner is open and computing the real road route' +
        ((input.range_km != null) ? ' and the charging stops' : '') +
        '. The full itinerary will post itself into THIS chat as a separate card (numbered steps + charging + an ' +
        '"Open in Google Maps" button) within a few seconds - you do NOT render it. Reply with ONE short sentence ' +
        'only: ' + (autoDepart
          ? 'say you picked the most favourable departure of the day and that the exact clock time + direction are in the card; do NOT invent a time.'
          : 'the departure clock time from departure_planned (it is the START of the favourable double-hour, already DST-adjusted) and the optimal direction.') +
        ' Do NOT paste the itinerary, do NOT say "below"/"above" or ' +
        '"I am calculating", do NOT tell the user to fill anything, and do NOT call open_itinerary_in_maps on your ' +
        'own. Google Maps does not auto-open; the user opens it by tapping the card button or by asking ("open in ' +
        'Maps") — you may mention this in your one line.';
      return baseOut;
    }
    baseOut.planner_opened = false;
    baseOut.note = 'Straight-line estimate. For the real road route + Google Maps export, open the Travel Planner.';
    return baseOut;
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
        baseOut.planner_opened = true;
        baseOut.chosen_solution = { depart_clock: chosen.depClock, duration_h: chosen.durH, arrive_clock: chosen.arriveClock };
        baseOut.note = 'The planner is open on the SHORTEST solution (leaves ' + chosen.depClock + ', arrives ' + chosen.arriveClock +
          '). The full itinerary posts itself into THIS chat as a separate card. Reply with ONE short sentence: the chosen ' +
          'departure clock time and arrival, then briefly mention there are also longer options through more favourable ' +
          'directions if they want. Do NOT paste the itinerary; do NOT call open_itinerary_in_maps on your own ' +
          '(Maps opens only when the user taps the card button or asks for it).';
        return baseOut;
      }
      baseOut.planner_opened = false;
      baseOut.note = 'Present the solutions shortest-first. To open one, the user can pick it and you can open the planner.';
      return baseOut;
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
      return {
        ok: true, count: r.count, truncated: r.truncated,
        matches: r.matches.map(function (m) { return { date: m.date, double_hour: m.label, branch: m.branch, positions: m.where }; }),
        instructions: 'List the matching charts (date + double-hour) in chronological order (soonest first), each showing where ' +
          'every condition landed (e.g. "Geng in Qian"). Then the user can draw that chart in Directions → Divinations for the ' +
          'date/hour. Keep it concise.'
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
      // AUTHORITATIVE flying-star chart computed from this floor's facing+period
      // (stateless — does NOT depend on the FS page being open). Gives every
      // palace's water/mountain star + the imprisoned-star (入囚) flag.
      var fsChart = null;
      try {
        if (window.QFS && typeof QFS.computeChart === 'function' && f.facing != null && f.period != null) {
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
      same_facing_period: n.sameFacing,
      house_facing: res.house.houseFacing, house_period: res.house.period,
      active_floor: n.activeFloor,
      floors: floors,
      note: 'Multi-floor house: each floor has its own doors / aquariums / settings (and its own facing & period when same_facing_period is false). If the user names a floor, use that floor; otherwise use the active floor (active_floor). EACH FLOOR carries flying_stars: an AUTHORITATIVE chart computed from its facing+period (independent of any open page) — palaces{DIR:{water,mountain}}, center, and imprisoned/liberation. ALWAYS read star positions from flying_stars; NEVER guess or compute them yourself. If flying_stars.imprisoned is true, follow flying_stars.imprisonment_note (free the centre water star at the liberation quadrant). To activate an aquarium: pick the floor, then call find_water_activation_full with direction = its direction, star_type = water, star_num = its water_star, AND pass facing_deg = floor.facing and period = floor.period so the scan uses THIS house\u2019s chart. The loaded person provides the XKDG scan. If flying_stars is null (facing/period not set), say so — do NOT invent stars.'
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
    try { qres = window.QMDJWaterScanner.scan(dir, start, days) || []; }
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
        window.runScanner();
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

  // UNIFIED triple scan: XKDG person hours + Qimen quadrant + Qimen special
  // configurations, merged by date+hour and ranked by how many of the 3 match
  // (tier 3 = all three, best) then by combined score.
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
      if (!map[k]) map[k] = { date: date, branch: branch, x: null, q: null, s: null, qhits: [], shits: [] };
      return map[k];
    }
    var ran = { xkdg: false, quadrant: false, special: false };
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
        window.runScanner();
        (window._lastScanResults || []).forEach(function (r) {
          if (!r.isoDate) return;
          var br = _BRANCHES_IDX[r.hourIndex]; if (!br) return;
          var sl = slot(r.isoDate, br);
          if (sl.x == null || r.score > sl.x) sl.x = r.score;
        });
        ran.xkdg = true;
      } catch (e) { notes.push('XKDG scan failed.'); }
    } else if (!pl.any) { notes.push('No person loaded — XKDG hours skipped.'); }

    // (2) Qimen generic quadrant (sector)
    if (dir && window.QMDJWaterScanner && typeof window.QMDJWaterScanner.scan === 'function') {
      try {
        (window.QMDJWaterScanner.scan(dir, start, days) || []).forEach(function (r) {
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

    // Merge & rank: tier (how many of 3) DESC, then combined DESC, then date ASC
    var rows = Object.keys(map).map(function (k) {
      var m = map[k];
      var matched = [];
      if (m.x != null && m.x >= 1) matched.push('XKDG');
      if (m.q != null && m.q >= 1) matched.push('Qimen quadrant');
      if (m.s != null && m.s >= 1) matched.push('Qimen special');
      return {
        date: m.date, branch: m.branch,
        hour: solarBranchToClock(m.branch) || m.branch,
        tier: matched.length, matched: matched,
        xkdg_score: m.x, qimen_quadrant_score: m.q, qimen_special_score: m.s,
        combined_score: (m.x || 0) + (m.q || 0) + (m.s || 0),
        hits: (m.qhits || []).concat(m.shits || [])
      };
    }).filter(function (r) { return r.tier >= 1; });
    rows.sort(function (a, b) { return (b.tier - a.tier) || (b.combined_score - a.combined_score) || (a.date < b.date ? -1 : 1); });

    return {
      scanner: 'water_activation_full',
      chart: 'flying (\u98db\u76e4) \u2014 FS stimulators always use the flying chart, never the rotating chart',
      imprisonment: imprisonNote || undefined,
      direction: dir || null, star: ran.special ? (starType + ' ' + starNum) : null,
      start: start, days: days, scans_run: ran,
      person_loaded: pl.any ? (pl.a && pl.b ? 'A+B' : (pl.a ? 'A' : 'B')) : 'none',
      count: rows.length, results: rows.slice(0, 20), scan_notes: notes,
      note: 'Triple scan merged by date+hour. matched lists which of the 3 the hour passed: XKDG (person), Qimen quadrant (sector), Qimen special (special configurations at the flying-star palace). tier = how many of the 3 (3 = best). PRESENT tier 3 first, then tier 2, then tier 1. combined_score = sum of the 3 sub-scores. State for each which scans it passed.',
      time_note: 'hour = real local clock window (true solar time, DST-adjusted).'
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
  function setUrl(u) { try { localStorage.setItem(URL_KEY, (u || '').trim()); } catch (e) {} }

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
        'width:100vw !important;max-width:100vw !important;height:100vh !important;max-height:100vh !important;' +
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
        'max-height:min(600px,calc(100vh - 110px));background:#fff;border:1px solid #ccc;border-radius:14px;' +
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
        it: [' il ', ' lo ', ' gli ', ' che ', ' è ', ' sei ', ' oggi ', ' viaggio ', ' ore ', ' partenza ', ' buongiorno ', ' grazie ', ' direzione ', ' fortunato ', ' della ', ' di ', ' un ', ' una ', ' per ', ' come ', ' quale ', ' sono ', ' più ', ' anche ', ' questo ', ' mi ', ' fare ', ' posso ', ' famiglia ', ' esagramma '],
        en: [' the ', ' is ', ' you ', ' today ', ' travel ', ' hours ', ' leave ', ' hello ', ' thanks ', ' yes ', ' direction ', ' lucky ', ' route ', ' your ', ' to ', ' of ', ' what ', ' which ', ' how ', ' does ', ' do ', ' and ', ' for ', ' my ', ' can ', ' are ', ' this ', ' with ', ' family ', ' hexagram '],
        fr: [' le ', ' la ', ' les ', ' est ', ' vous ', ' aujourd ', ' voyage ', ' heures ', ' partir ', ' bonjour ', ' merci ', ' oui ', ' direction ', ' chance ', ' votre ', ' de ', ' une ', ' pour ', ' comment ', ' quel ', ' quelle ', ' je ', ' avec ', ' ce ', ' plus ', ' faire ', ' famille ', ' hexagramme ']
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

    function toggleFullscreen() {
      var full = panel.classList.toggle('xkdg-ai-fs');
      fsBtn.textContent = full ? '\uD83D\uDDD5' : '\u26F6';
      fsBtn.title = full ? 'Restore small window' : 'Enlarge to full screen';
      try { input.focus(); } catch (e) {}
    }

    btn.addEventListener('click', function () { panel.style.display === 'flex' ? closePanel() : openPanel(); });
    closeBtn.addEventListener('click', closePanel);
    fsBtn.addEventListener('click', toggleFullscreen);
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
      var b = elc('div', { style:
        'max-width:85%;padding:8px 11px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;' +
        (mine ? 'align-self:flex-end;background:#6a1b9a;color:#fff;border-bottom-right-radius:3px;'
              : 'align-self:flex-start;background:#fff;border:1px solid #e0d4e8;color:#222;border-bottom-left-radius:3px;') }, text);
      msgs.appendChild(b);
      msgs.scrollTop = msgs.scrollHeight;
      if (!mine && !noSpeak) speak(text);
      return b;
    }
    // Injected by the Travel Planner when it finishes computing an AI-opened trip:
    // shows the itinerary in the chat plus a one-tap "Open in Google Maps" button
    // (a real user tap, so the browser will not block the pop-up).
    var ITIN_LBL = {
      it: { drive: 'Guida', stop: 'Sosta', charge: 'Ricarica', min: 'min', toward: 'verso', then: 'poi verso', arrive: 'arrivo a',
        realRoad: 'strada reale', driving: 'di guida', estimate: 'stima in linea retta',
        chPending: '\ud83d\udd0c Ricarica: ricerca in corso\u2026', ch: '\ud83d\udd0c Ricarica', addedMaps: 'aggiunta al percorso Maps',
        moreStops: 'altre soste', otherNet: 'altri operatori', lowPow: 'solo \u226580 kW \u2014 nessuna \u2265150 kW',
        noKey: '\ud83d\udd0c Ricarica: manca la chiave Open Charge Map \u2014 aggiungila nel pannello (\ud83d\udd0b Range & charging)',
        none: '\ud83d\udd0c Ricarica: nessuna stazione Tesla/Electra raggiungibile sul percorso',
        noRange: '\ud83d\udd0c Ricarica: inserisci l\u2019autonomia residua (km) nel pannello',
        noRoute: '\ud83d\udd0c Ricarica: rotta reale non disponibile (imposta il Worker e rifai lo SCAN)',
        failed: '\ud83d\udd0c Ricarica: ricerca non riuscita (controlla chiave/connessione)',
        openMaps: '\ud83d\udccd Apri in Google Maps', opened: '\u2713 Aperto in Google Maps', blocked: '\u26a0 Pop-up bloccato \u2014 usa \u201cApri in Google Maps\u201d nel pannello',
        exit: 'Uscita', quad: 'quadrante', limit: 'limite', near: 'vicino a' },
      en: { drive: 'Drive', stop: 'Stop', charge: 'Charge', min: 'min', toward: 'toward', then: 'then toward', arrive: 'arrive at',
        realRoad: 'real road', driving: 'driving', estimate: 'straight-line estimate',
        chPending: '\ud83d\udd0c Charging: searching\u2026', ch: '\ud83d\udd0c Charging', addedMaps: 'added to the Maps route',
        moreStops: 'more stops', otherNet: 'other networks', lowPow: 'only \u226580 kW \u2014 no \u2265150 kW',
        noKey: '\ud83d\udd0c Charging: no Open Charge Map key \u2014 add it in the planner (\ud83d\udd0b Range & charging)',
        none: '\ud83d\udd0c Charging: no reachable Tesla/Electra station on the route',
        noRange: '\ud83d\udd0c Charging: enter your remaining range (km) in the planner',
        noRoute: '\ud83d\udd0c Charging: no real route yet (set the Worker and run SCAN again)',
        failed: '\ud83d\udd0c Charging: lookup failed (check key/connection)',
        openMaps: '\ud83d\udccd Open in Google Maps', opened: '\u2713 Opened in Google Maps', blocked: '\u26a0 Pop-up blocked \u2014 use \u201cOpen in Google Maps\u201d in the planner',
        exit: 'Exit', quad: 'quadrant', limit: 'limit', near: 'near' },
      fr: { drive: 'Route', stop: 'Arr\u00eat', charge: 'Recharge', min: 'min', toward: 'vers', then: 'puis vers', arrive: 'arriv\u00e9e \u00e0',
        realRoad: 'route r\u00e9elle', driving: 'de conduite', estimate: 'estimation \u00e0 vol d\u2019oiseau',
        chPending: '\ud83d\udd0c Recharge : recherche\u2026', ch: '\ud83d\udd0c Recharge', addedMaps: 'ajout\u00e9e \u00e0 l\u2019itin\u00e9raire Maps',
        moreStops: 'autres arr\u00eats', otherNet: 'autres r\u00e9seaux', lowPow: '\u226580 kW seulement \u2014 aucune \u2265150 kW',
        noKey: '\ud83d\udd0c Recharge : pas de cl\u00e9 Open Charge Map \u2014 ajoutez-la dans le panneau (\ud83d\udd0b Range & charging)',
        none: '\ud83d\udd0c Recharge : aucune station Tesla/Electra accessible sur la route',
        noRange: '\ud83d\udd0c Recharge : indiquez votre autonomie restante (km) dans le panneau',
        noRoute: '\ud83d\udd0c Recharge : pas d\u2019itin\u00e9raire r\u00e9el (r\u00e9glez le Worker et relancez SCAN)',
        failed: '\ud83d\udd0c Recharge : \u00e9chec (v\u00e9rifiez la cl\u00e9/connexion)',
        openMaps: '\ud83d\udccd Ouvrir dans Google Maps', opened: '\u2713 Ouvert dans Google Maps', blocked: '\u26a0 Pop-up bloqu\u00e9 \u2014 utilisez \u00ab Ouvrir dans Google Maps \u00bb dans le panneau',
        exit: 'Sortie', quad: 'quadrant', limit: 'limite', near: 'pr\u00e8s de' }
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
    var _itinExitEls = [];      // exit lines of the latest itinerary bubble (place names filled async)
    var _itinStopEls = [];      // numbered STOP lines (place names filled async)
    function stopKindIcon(k) {
      return k === 'charger' ? '\ud83d\udd0c ' : (k === 'fuel' ? '\u26fd ' : ((k === 'services' || k === 'rest_area' || k === 'parking') ? '\ud83c\udd7f\ufe0f ' : ''));
    }
    function stopLineText(L, it) {
      var what = (it.kind === 'charge') ? (L.charge + ' ' + (it.duration_min || 20) + ' ' + L.min)
                                        : (L.stop + ' ' + (it.duration_min || 20) + ' ' + L.min);
      var where = it.place ? (' \u2014 ' + stopKindIcon(it.stopKind) + it.place + (it.stopPower ? ' (' + it.stopPower + ')' : '')) : '';
      var exitInfo = it.cashDir
        ? (' (' + L.exit + ' ' + it.cashDir + (it.limitDeg != null ? ', ' + L.limit + ' ' + it.limitDeg + '\u00b0' : '') + ')')
        : '';
      return what + ' @ ' + it.at + where + exitInfo + ', ' + L.then + ' ' + it.toward;
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
    function openHourChart(h) {
      var ok = false;
      try {
        if (typeof window.showQimenChart === 'function' && h && h.iso && h.hGan && h.hZhi) {
          var chart = window.showQimenChart(h.iso, h.hGan, h.hZhi, h.palace, { mode: 'rotating', returnHtml: true });
          if (chart) { _vbShowChartOverlay(buildHourFavSummary(h) + chart); ok = true; }
        }
      } catch (e) {}
      if (!ok) { try { addBubble('assistant', '\u26A0 Could not open the rotating chart for this hour.'); } catch (e2) {} }
    }
    // Collapsible per-hour panel: every 时辰 of the trip, marked favourable / neutral,
    // each with a 🔍 button that opens its rotating QMDJ chart.
    function addHoursPanel(wrap, hours, L) {
      if (!hours || !hours.length) return;
      var favCount = hours.filter(function (h) { return h.fortunate; }).length;
      var head = elc('button', { style:
        'width:100%;text-align:left;margin-top:8px;background:#f3eef8;border:1px solid #e0d4e8;border-radius:8px;' +
        'padding:7px 9px;font-size:12px;font-weight:600;color:#4527a0;cursor:pointer;' },
        '\u23f1 Hours \u00b7 ' + favCount + '/' + hours.length + ' favourable \u00b7 tap a chart to inspect \u25be');
      var body = elc('div', { style: 'display:none;margin-top:4px;' });
      head.addEventListener('click', function () { body.style.display = (body.style.display === 'none') ? 'block' : 'none'; });
      hours.forEach(function (h) {
        var fav = h.fortunate;
        var row = elc('div', { style:
          'display:flex;align-items:center;gap:6px;margin:3px 0;padding:4px 7px;border-radius:7px;border-left:3px solid ' +
          (fav ? '#43a047' : '#bbb') + ';background:' + (fav ? '#f1f8f2' : '#f7f7f7') + ';font-size:12px;' });
        var txt = fav
          ? (h.from + '\u2013' + h.to + ' \u00b7 ' + L.toward + ' ' + h.roadDir + ' \u00b7 P' + h.palace +
             (h.palaceName ? (' ' + h.palaceName) : '') + (h.door ? (' \u00b7 ' + h.door) : '') +
             (h.sanqi ? ' \u00b7 \u4e09\u5947' : '') + (h.score != null ? (' \u00b7 ' + h.score) : '') + ' \u2713')
          : (h.from + '\u2013' + h.to + ' \u00b7 drive, no cash');
        var label = elc('span', { style: 'flex:1;color:' + (fav ? '#1b5e20' : '#666') + ';' }, txt);
        var btn = elc('button', { style:
          'flex:none;background:#6a1b9a;color:#fff;border:0;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;' }, '\uD83D\uDD0D');
        btn.addEventListener('click', function () { openHourChart(h); });
        row.appendChild(label); row.appendChild(btn);
        body.appendChild(row);
      });
      wrap.appendChild(head);
      wrap.appendChild(body);
    }
    function addItineraryBubble(payload) {
      payload = payload || {};
      var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
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
      var ol = elc('ol', { style: 'margin:0;padding-left:20px;' });
      _itinStopEls = [];
      (payload.legs || []).forEach(function (it) {
        var li;
        if (it.kind === 'drive') {
          var t = L.drive + ' ' + it.from + ' \u2192 ' + it.to + ' (' + it.hours + 'h) ' + L.toward + ' ' + it.toward + (it.arrival ? ' \u2014 ' + L.arrive + ' ' + (payload.dest || '') : '');
          li = elc('li', { style: 'margin:2px 0;' }, t);
        } else {
          li = elc('li', { style: 'margin:2px 0;' }, stopLineText(L, it));
          _itinStopEls.push({ el: li, it: it });
        }
        ol.appendChild(li);
      });
      wrap.appendChild(ol);
      _itinExitEls = [];
      if (payload.charging_pending || payload.charging) {
        _itinChargeEl = elc('div', { style: 'margin-top:6px;font-size:13px;color:#444;' }, chargingText(L, payload.charging || null));
        wrap.appendChild(_itinChargeEl);
      } else { _itinChargeEl = null; }
      addHoursPanel(wrap, payload.hours, L);
      var mapsBtn = elc('button', { style:
        'margin-top:9px;width:100%;padding:9px;border:0;border-radius:8px;background:#1565c0;color:#fff;font-size:13px;font-weight:600;cursor:pointer;' }, L.openMaps);
      mapsBtn.addEventListener('click', function () {
        var r = null;
        try { if (window.TravelPlanner && window.TravelPlanner.openInMaps) r = window.TravelPlanner.openInMaps(); } catch (e) {}
        if (r && r.opened === false) mapsBtn.textContent = L.blocked;
        else mapsBtn.textContent = L.opened;
      });
      wrap.appendChild(mapsBtn);
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
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
            var _html = window.showQimenChart(info.date, info.hGan, info.hZhi, info.palace, { returnHtml: true });
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
    function updateItineraryStops() {
      try {
        var L = ITIN_LBL[chatLang()] || ITIN_LBL.en;
        _itinStopEls.forEach(function (s) { if (s.el && s.it) s.el.textContent = stopLineText(L, s.it); });
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
            if (m && m.role === 'user' && typeof m.content === 'string') { lang = detectLang(m.content); break; }
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
      return fetch(getUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM_PROMPT + '\n\nToday is ' + todayIso() + '.' + replyLangDirective(), tools: noTools ? undefined : TOOLS, messages: history })
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
      if (!url) return Promise.reject(new Error('no url'));
      var sys = 'You are a translator. Translate the user message into natural English. It is a travel itinerary. ' +
        'KEEP every clock time exactly, KEEP the Chinese double-hours (pinyin + hanzi, e.g. "Wu 午"), KEEP all place names, ' +
        'directions and numbers, and KEEP the line breaks / emoji structure. Output ONLY the English translation, no preamble.';
      return fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: sys, tools: [], messages: [{ role: 'user', content: text }] })
      }).then(function (r) { return r.json(); }).then(function (d) { return extractText(d) || text; });
    }

    // 📤 Share the last itinerary, translated to English (Web Share, else clipboard).
    function shareItinerary() {
      var t = lastAssistantText();
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

      var macro = hasOverride ? null : findMacro(text);   // a short trigger expands into its full instruction
      var toSend = hasOverride ? overrideToSend : (macro ? macro.text : text);

      input.value = '';
      history.push({ role: 'user', content: toSend });
      var bubble = (typeof overrideBubble === 'string' && overrideBubble.length)
        ? overrideBubble
        : (macro ? ('\u26A1 ' + text + (macro.label ? ' \u2014 ' + macro.label : '')) : text);
      addBubble('user', bubble);
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
      addVerifyButton: function (info) { try { openPanel(); return addVerifyButtonBubble(info); } catch (e) { return null; } },
      updateItineraryCharging: function (info) { try { updateItineraryCharging(info); } catch (e) {} },
      updateItineraryExits: function (exits) { try { updateItineraryExits(exits); } catch (e) {} },
      updateItineraryStops: function (legs) { try { updateItineraryStops(legs); } catch (e) {} },
      _send: doSend, _history: function () { return history; }
    };
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();

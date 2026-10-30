# XKDG — Handoff (session 36, 2026-10-29)

Repo: `edufengshui/xkdg` (branch `main`, GitHub Pages, continuous deploy).
Versioning: automatic — `version.js` shows the last commit date; `sw.js` is network-first. No version bump needed.
Next session: read this file first.

## Done in session 34
1. **☰ section menus** (`options-menu.js`, SECTIONS): added `bed` and `desk` (header = panel title; group 🔎 Dates = SCAN + ⭐ Recall Flying Stars).
2. **Door / item row** on the house card (`app-fengshui.js`, doors list): ✏ / ✕ / 🔎 SCAN replaced by a ☰ (`XKDGHouseMenus.menu`, id `fs-hm-door-<hi>-<di>`).
3. **Saved-setting edit panel** ("✏️ Editing the saved …"): Save / Scan dates / Open to edit / Remove moved into a ☰ at the right of the title (id `fs-hm-set-<hi>-<zone>-<idx>`). New 📖 entry `saved_setting` in `house-menus.js` HELP (functional text only).
4. **Luopan ☰ (FS_LUOPAN_MENU)**:
   - The native `<select id="fs-luopan-menu">` is now a `<button>` that opens our own compact drop-down `#fs-luopan-dd` (position:fixed, text only, emoji stripped, ON badge right). Functions: `fsLuopanMenuOpen`, `fsLuopanMenuClose`, `fsLuopanMenuBuild`, `fsLuopanMenuSync` (rebuilds only when open). Entries still act via `fsLuopanMenuAct(v)`.
   - View modes: active one marked ON (no ✓ prefix).
   - New entry **Cure** (`m-cure`): toggles `_fsHexFilter.cure` and opens the filter panel.
   - **FACING** section: `_fsFacingSources()` lists the active floor's doors (external / internal / item), saved beds (facing = sitting + 180, as in the Bed section), saved desks, plus the bed/desk being set up now. Picking one (`fsPickFacingSource`) copies facing → `#fs-facing` and its water/fountain/yang source → `#fs-water` (empty if none); remembers `_fsFacingPick` for the ON badge.
5. **Hexagram filter panel** (`fsToggleHexFilterPanel`): moved right UNDER `#fs-canvas-wrap` (it was above the luopan, off-screen → "non accade nulla") and scrolls into view. Edu approved this inline layout (a bottom-sheet version was tried and reverted).

## Session 35
- Picking a FACING source in the luopan ☰ now draws its arrow in every view mode (also FS, where Door/Water arrows were hidden); label = source name (Bed, Desk, door name). `_fsFacingPickDeg` remembers the picked degree; typing another facing returns to the normal "Door" behaviour. While a pick is active the House arrow is drawn dashed.

- New luopan ☰ entry **Water for facing** (`m-wat`): toggles `_fsHexFilter.wat` and opens the filter panel (same as Cure).

- 🚪🛏🪑💧 setting icons removed from the luopan (main + bed/desk section); `fsDrawSettingIcons` left in place, unused.

- **AI: persons and facings without House Profile** (`ai-chat.js`): new always-on tool `set_person` (slot A/B; saved name, or birth_date + optional birth_time / year_pillar / birth_utc / birth_lon / birth_dst; clear=true empties B). Nothing is saved; `window._xkdgAdhocGeo` gives `_personBirthGeo` (app-bazi.js) the ad-hoc birth place. Prompt rules: load anyone with set_person; pass any facing degree straight to the tools, house tools only for SAVED houses. Tested headless (jsdom).

- **👤 PERSON tab, Both → 🤝 Cure from the other chart** (`renderPersonView`, app-bazi.js): each pillar of the other person that passes `_xkdgRemedyKind` for this person (main or ★ family), as chips; tapping one puts it as the 5th column with the usual explanation (session 35: now a YELLOW box with its own picture — 4 pillars + the other person's pillar — and explanation via `explain()`; chips switch with `xkdgPVMut`, state `window._pvMut`). Guide `guides/person-remedies.html` NOT updated (Edu to write the text).

- **📦 Dropbox Sync** (`dropbox-sync.js`, loaded after gdrive-sync.js): same file format and Save/Load/Auto-sync rules as Drive; OAuth PKCE + refresh token (no secret), App-folder access, conflicts by file `rev`. Launcher next to ☁ Drive Sync. Keys `xkdg_dbx_*` never synced (also skipped by Drive). `DBX_APP_KEY` = is4jeokayukx75x (Edu's app "XKDG", App folder, Development status — max 50 users until "Richiedi produzione"); with the key built in the App key field is hidden. Redirect URI = origin+pathname of the page. Guide: people-and-database.html Part 7 (`#dropbox`), index updated. Smoke-tested in Chromium up to the authorize URL; token exchange not testable without the key.

- **🔍 XKDG analysis — settings** (app-bazi.js, Edu): `xkdgDimSettings(pillars, f)` groups the pillars that talk (Adding / Hetu / equal); two groups with different languages = "two settings"; harmonise values = a value that makes one group speak the other group's language with ALL its pillars (Thao: Elements H7+D2 Hetu, M9+Y6 Adding 15 → Element 3 or 8). `gaps.settings`; remedy hexagrams get `harmonises` (sorted first, ✦ on chips and dates); `explain()` says whether the cure harmonises; analysis box in the PERSON tab. Family explanation now names WHICH pillars share the family (e.g. "Sun-Xian: your isolated Year 丁卯 (hex 41) and Hour 甲戌 (hex 39)"). Session 35b (Edu: "avere due setting diversi non va bene"): `_xkdgSettingLang` = the language that alone connects the values (Ed Elements 2 8 3 2 → Adding); remedy rule and explanations use the SETTING only (no Hetu links listed when the setting is Adding); in a split dimension the cure MUST harmonise (keepOk requires a harmonise value when one exists); texts say two settings are not good.

- **AI: Shelly fountains visible** (ai-chat.js): `_shellyFountainsFor(house)` adds `shelly_fountains` (Fountain A vienna-letto DAY, Fountain B vienna-porta NIGHT) to list_houses and get_house_setup, with a note to use program_aquarium_light / aquarium_plan; prompt rule in the fengshui section; aliases "fontanella a/b/letto/porta"; home area auto-loads on "fontan|fountain". Session 35b: fountains have NO Shelly yet (`shelly:false` in SHELLY_HOUSES): program_aquarium_light gives ON/OFF times in mode "by_hand" without needing the Worker config, commit is ignored; aquarium_light / aquarium_plan refuse with a "switched by hand" message. Set `shelly:true` when the plugs are installed.

- **📧 Daily email: fountains** — digest-setup.js adds `{kind:"fountain", device}` ops from `window.XKDGFountains(house)` (exported by ai-chat.js); digest/scan.js runs `program_aquarium_light` (by-hand mode) and lists ON→OFF rows on the civil day they switch on; digest.js shows them (⛲) in the day list and in the detail. Edu must regenerate his line (📧 Daily email) and paste it into the secret.

- **▶ Video tutorials**: `guides/videos/sun-facing.mp4` (1:48, 16:9, scene 2: 3D card → 2D top view → 3D tube + shadow edge traced + flashing "Take the hour now!", English captions, no audio) embedded at the top of guides/sun-facing.html; built from real app screenshots (Playwright, demo person/house, clock fixed 2026-10-29 10:32 Vienna) + animated SVG scenes; sources in tools/video/sun-facing/. Guide fixed: Sun facing is now in 📍 Address & facing ☰.

- 📖 help popups (house-menus.js HELP): optional 4th item = video URL → "▶ Video tutorial" link (sun_facing has it).

- Photo sectors (photo-sectors.js): the Facing select is grouped House · Doors · Beds · Desks · Items (bed = sitting + 180); guide updated.
- Video rules (Edu): signature "Feng Shui Advisor · Master Eduardo Hess"; every video starts by showing WHERE the tool is in the menus.

- ▶ Video 2 `guides/videos/photo-sectors.mp4` (2:00): water positions on a photo; demo 3D room photo; embedded in photo-sectors guide; 📖 photo_sectors popup links it. Sources tools/video/photo-sectors/.
  - Session 35c: bed scene fixed — arrow + view wedge drawn ON the mattress (y 0.64, `ay` in PTS) so they start visibly from the headboard (before: on the floor, hidden under the bed). Only scene 2 re-rendered and spliced (16–27 s).

- ▶ Video 3 `guides/videos/palaces-centre.mp4` (2:12): 8 palaces / 24 mountains on 4 photos from the CENTRE of the house (Edu: only the house centre, never a room — guide Part 2 warning fixed). Demo open-plan flat (tools/video/palaces-centre/house.js, 8×5.5 m, sleeping area behind an arch); the 4 photos (176/266/356/86) are calibrated by the app itself on real walls and tile into a 360° panorama (final scene). Embedded at guide Part 2 (`#part2`); 📖 photo_sectors popup now lists both videos (HELP 4th item may be [[label, url], …]). Trigram labels follow the app overlay (离, 兑 simplified) — asked Edu whether to switch the app to 離 兌.
- Guide videos: `guides/video-fs.js` (rotate phone → full screen, Android locks landscape); help popups open `guides/video.html?v=<name>` (player page). New videos: add the name to G in video.html and include video-fs.js in the guide.

## Session 36
- Photo sectors, 8 directions overlay: only N/NE/E… (Edu: trigram names not needed); label box shortened. Video palaces-centre re-rendered with direction-only labels (photo-sectors video never showed the 8-direction overlay). Rebuild needs: three@0.149 in tools/video/photo-sectors/node_modules (symlinked from palaces-centre), lunar-javascript in digest/node_modules, NODE_PATH=/opt/npm-tools/node_modules for playwright.
- **📆 Cure years & months** (PERSON tab, app-bazi.js): button under the isolated lines (`xkdgPVYM`); `xkdgCureYearsMonths` = solar years 立春→立春 (now ±30) whose YEAR pillar passes `_xkdgRemedyKind`, and the months 节→节 whose MONTH pillar passes in EVERY year (Edu: also normal years; cure years marked 🌿, `cure` flag) (`_xkdgSolarYearMonths`, cached). Box `xkdgCureYMHtml`: current/next cure year and month with countdown, list now+future / past, ✦ ★ marks, 📅 dates per month (sets FROM/DAYS → remedy dates of that month), 🔔 .ics of the coming ones (`xkdgPVYMics`, all-day, alarm the day before). Guide person-remedies.html not updated (Edu's text).
- `_xkdgRemedyKind`: the same hexagram as an ISOLATED natal pillar is never a cure (Edu, e.g. hour 丁巳 hex 9 isolated → hex 9 excluded, also as ★ family).
- AI chat stuck on "Connection lost, retrying" (Edu, two-person cure question): worker source not in the repo, cause not provable from here. Fixes in ai-chat.js: fetch aborts after 150 s (no more endless wait); person_xkdg_gaps sends only 8 dates × 4 hours (`_compactRemedies`, dates_total); new tool `mutual_cures` (fengshui + dates areas) = cures between A and B both ways, compact (~1 KB) instead of two full gaps results.
- Fountain B (night) now runs to the END of Mao 卯 (solar 07:00, Mao hour also a candidate ON); period/runs texts name the hours explicitly and the note lists the solar times of the Chinese hours (the AI had called 04:38 "end of Mao"). Fountain A (day) now starts at Chen 辰 (solar 07:00-21:00, Edu) — no overlap with B.
- ▶ Video 4 `guides/videos/plan-builder.mp4` (~2:00): floor plan from laser measurements with the assistant (Edu approved the storyboard). Demo flat 5 rooms (tools/video/plan-builder/capture.js: the assistant's replies are SCRIPTED via a mocked worker, every plan_* tool runs the real app). Embedded in guide Part 3 (`#part3`), 📖 plan_builder popup links it, video.html G updated. Next video (Edu): 📐 Import a floorplan, separate — storyboard to show Edu first.
- Bug fixed: 📏 Plan builder dialog opened UNDER the assistant (z 10000 < 99999) → now z 100040, so plan_show is visible while chatting.
- **Fountains, new daily rule (Edu, session 36)** — `_programFountain` (ai-chat.js) no longer uses the water scan / persons: ONE hour EVERY day. Water hex at 222° (46) must communicate with the HOUR (Elements and/or Periods: Hetu, Adding 5/10/15, Pure Qi, shared BL family) AND the hour with the DAY (same), else the hour must be Sheng In / Ke In to the day (XKDG elements 1/6 Water, 2/7 Fire, 3/8 Wood, 4/9 Metal). A: Mao, Chen, Yin, Si (closest to Mao), OFF start of Hai. B: Hai, Zi, Chou, Yin, Mao (never before Hai), OFF end of Mao. Each row has `via`; days_without_hour listed. The daily email shows the rows + XKDG via (digest/scan.js, digest.js). Tested 30 days: an hour every day for A and B.
- PERSON tab (Edu): the isolated pillars are written in RED inside the 🔍 XKDG analysis box; new tab **🧬 Cure hexagrams (N)** (`xkdgPVHX`) = cards of all remedy hexagrams (main + ★ family, drawing + Element/Period); tapping one (`xkdgPVPickTop`) puts it as the 5th column and scrolls up. The explanation of the 5th column now sits right UNDER the picture (placeholder EXPL), before the analysis.

## To check with Edu
- FACING list with the doors of a real saved house (only tested with current bed/desk).
- Door-row ☰ and saved-setting ☰ on the phone.

## Possible next steps
- Same compact custom drop-down style for the other ☰ menus if Edu wants uniformity.
- `_fsFacingOptionsHTML` is now unused (left in place, harmless).

## Rules (unchanged)
- Edu is the sole authority on metaphysics; flag any addition to descriptions with reasoning, no invented interpretations.
- Replies in Italian, concise. Tell Edu when a new chat is advisable.

# XKDG — Handoff (session 34→35, 2026-10-28)

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

- **▶ Video tutorials**: `guides/videos/sun-facing.mp4` (1:44, 16:9, English captions, no audio) embedded at the top of guides/sun-facing.html; built from real app screenshots (Playwright, demo person/house, clock fixed 2026-10-29 10:32 Vienna) + animated SVG scenes; sources in tools/video/sun-facing/. Guide fixed: Sun facing is now in 📍 Address & facing ☰.

## To check with Edu
- FACING list with the doors of a real saved house (only tested with current bed/desk).
- Door-row ☰ and saved-setting ☰ on the phone.

## Possible next steps
- Same compact custom drop-down style for the other ☰ menus if Edu wants uniformity.
- `_fsFacingOptionsHTML` is now unused (left in place, harmless).

## Rules (unchanged)
- Edu is the sole authority on metaphysics; flag any addition to descriptions with reasoning, no invented interpretations.
- Replies in Italian, concise. Tell Edu when a new chat is advisable.

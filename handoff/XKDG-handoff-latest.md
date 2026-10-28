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

## To check with Edu
- FACING list with the doors of a real saved house (only tested with current bed/desk).
- Door-row ☰ and saved-setting ☰ on the phone.

## Possible next steps
- Same compact custom drop-down style for the other ☰ menus if Edu wants uniformity.
- `_fsFacingOptionsHTML` is now unused (left in place, harmless).

## Rules (unchanged)
- Edu is the sole authority on metaphysics; flag any addition to descriptions with reasoning, no invented interpretations.
- Replies in Italian, concise. Tell Edu when a new chat is advisable.

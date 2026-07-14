# HANDOFF — Da Liu Ren Feng Shui (DLR annual chart) — XKDG — session 21

Repo `edufengshui/xkdg`, main, files in root. Deliver whole files to
/mnt/user-data/outputs, `node --check` before every delivery, one file per push.
All dialogue Italian; code comments English.

## STATUS AFTER SESSION 21
The DLR annual chart is now BUILT and WIRED (engine + FS wrapper + on-plan
overlay + UI launcher). Nothing is live yet — the 4 files below are ready to push.

### PUSH ORDER (3 new JS first, index.html LAST so its <script> tags don't 404)
1. `daliuren.js`            md5(12) a34ed24fa3bf   (generic 大六壬 engine, unchanged)
2. `daliuren-fengshui.js`   md5(12) 7ded3728ddd4   (FS wrapper — UPDATED this session)
3. `floorplan-daliuren.js`  md5(12) 9136d2744223   (NEW on-plan overlay + launcher)
4. `index.html`             md5(12) b20d2e5f5612   (adds the 3 scripts after fs-chart-finder.js)

## EDU RULINGS RESOLVED THIS SESSION (were the 4 open colour questions)
1. Heavenly Doctor (天醫): ALWAYS counted; never plain-cancelled. Alone/with greens
   → solid green. With a negative → HOLLOW green circle. New net value
   `green_hollow`. Implemented in daliuren-fengshui.js.
2. "Moon cell 酉" was a bad internal label from session 20 (the 太陰 general) —
   DROPPED. 酉 stays red via Brothers (heaven 戌). No change.
3. Voids: NOT significant in the annual reading. No per-sector mark. Kept as data,
   shown only as a small note ("Void 辰巳") in the caption panel.
4. 六合 Six Harmonies: normal (cancellable) green — already correct, no change.

## VALIDATION (re-run in Node with lunar-javascript)
build({year:2019, facingDeg:175}) still matches the July-2019 slide casting
(己亥 · Tai-Sui day Mon Jul 1 2019 · 月將 未 · hour 庚午 · void 辰巳). The only
colour delta vs the old slide is the 申 sector = `green_hollow` now (Heavenly
Doctor 酉 greens the Warrior 玄武), which is exactly ruling #1.

## WHERE IT LIVES (UI)
Feng Shui page → luopan box. A floating "🀄 DLR" button sits at the BOTTOM-LEFT
inside `#fs-canvas-wrap` (same floating pattern as ☀️🌙 Time top-left and
⤴ Facing-up top-right; that row survives `_fsBuildZoneGate()` relocation).
Tapping it opens a full-screen modal: free YEAR stepper (−/+), editable Facing,
Facing-side buttons, Draw chart, 💾 Save to house. The overlay reuses the active
house's SAVED Flying-Stars floor plan (photo + centre + facingSide) — no
re-upload. If no plan is saved, it draws a bare 12-sector annual wheel so the
chart is still visible.

## floorplan-daliuren.js — DESIGN
- Twin of floorplan-stars.js: SAME orientation math (SIDE_OFFSET / imageUpDeg /
  canvasAngle), SAME fitCanvas display clamps.
- 12 sectors of 30°, one per EARTH branch (子=0=N, +30 CW). Per sector it draws:
  general 中文 (colour-hinted) · heaven branch (big) · earth branch (small) ·
  a status dot: filled green / filled red / hollow-green ring / none.
- Caption panel (top strip): `YEAR 己亥 · Season · 月將 未 · Void 辰巳`.
  (Season is a simple Gregorian-month word for now — cosmetic.)
- Facing arrow (blue) like Flying Stars.
- SELF-MOUNTS via DOMContentLoaded + MutationObserver → injects the button
  whenever `#fs-canvas-wrap` (re)appears. ZERO edits to app-fengshui.js.
- Reads host globals if present: `_fsActiveHouseFloorCtx`, `_fsFloorFacing`,
  `_fsHousesSave`. Persists a TINY record `floor.floorplanDLR = {year, facingDeg,
  facingSide, centerF, savedAt}` — the photo is NOT duplicated (stays owned by FS).
- API `window.FloorPlanDLR.open(opts?)` / `.mount()`.

## STILL OPEN / DEFERRED (confirm with Edu next)
- Caption placement / "center panel" styling: Edu said UI-placement details come
  separately. Current = top caption strip (safe on arbitrary photos). Move to a
  true centre panel if Edu prefers.
- Season label: currently Gregorian-month word. If Edu wants the 節氣/五行 season
  of 月將, swap seasonOf().
- CONTEXTUAL greens (Parent→bedroom, Children→recreation) are computed in the
  engine (sector.context) but OFF in the default view — no per-zone toggle yet.
- No independent DLR center/rects editor (reuses FS geometry by design). If Edu
  wants DLR to have its own centroid distinct from FS, add rect/manual tools
  (twin the floorplan-stars pointer machinery).
- No baked composite snapshot for an in-place "show on luopan" swap (FS has
  starsImg + renderComposite). Add later if Edu wants the DLR overlay to appear
  in the 🏠 Floorplan in-place view too.
- The "5 Interactions" (五行) slide still deferred by Edu.

## ENGINE API REMINDERS (unchanged)
window.XKDGDaLiuRenFS.build({year, facingDeg}) → {
  yearPillar{stem,branch,gz}, facingMountain, sittingMountain, facingBranch,
  sittingBranch, chosenDay{date,mode('sitting'|'liuhe'),monthGeneral}, hourStem,
  dayVoid[], triggers{...}, chart, sectors[12], candidates[] }.
Each sector = { earth, heaven, general{cn,en}, relation, greens[], reds[],
  context[], virtues[], isVoid, net('green'|'red'|'green_hollow'|'cancel'|'neutral') }.

## PARALLEL FS WORK — confirmed LIVE at session start (md5 matched)
app-fengshui.js 1121692cb17f · sun-moon.js 9edfbd96078b (替卦 + Sun/Moon shipped).

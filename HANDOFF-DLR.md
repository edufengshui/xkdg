# HANDOFF — Da Liu Ren Feng Shui (DLR annual chart) — XKDG — session 21

Repo `edufengshui/xkdg`, main, files in root. Deliver whole files, `node --check`
before delivery. Dialogue Italian; code comments English.

## STATUS
DLR annual chart is BUILT on TWO surfaces + slide-format labels. Nothing live yet.

### PUSH SET (5 files; single commit is fine — index.html last only if separate commits)
1. `daliuren.js`            a34ed24fa3bf   generic 大六壬 engine, unchanged
2. `daliuren-fengshui.js`   7ded3728ddd4   FS wrapper (green_hollow rule)
3. `floorplan-daliuren.js`  758606d2ad6b   DLR overlay — REWRITTEN this session
4. `app-fengshui.js`        c3b04186d1b3   +1 additive hook (was 1121692cb17f live)
5. `index.html`             b20d2e5f5612   +3 <script> tags after fs-chart-finder.js

## WHAT CHANGED THIS SESSION (Edu's 3 requests on the screenshot)
1. LABEL FORMAT now matches the slide, per sector, 3 lines:
   L1 = spirit in ENGLISH; L2 = EARTH branch "Pinyin 中文" (e.g. "Wei 未");
   L3 = HEAVEN branch "Pinyin 中文" + spirit number (e.g. "You 酉 2").
   English names (override engine .en): Nobleman Snake Bird Harmony Polaris Dragon
   EmptySky Tiger Norm Warrior Moon Queen. Number is FIXED per spirit, reverse
   canonical: 天后Queen=1 太陰Moon=2 玄武Warrior=3 太常Norm=4 白虎Tiger=5 天空EmptySky=6
   青龍Dragon=7 勾陳Polaris=8 六合Harmony=9 朱雀Bird=10 螣蛇Snake=11 貴人Nobleman=12.
   Validated: reproduces the slide's numbering scheme cell-for-cell.
2. STARS VISIBLE UNDER THE SECTORS (floor-plan modal): the modal background is now
   the FloorPlanStars composite (plan + flying stars). It uses saved.starsImg if
   present, else FloorPlanStars.renderComposite(saved,cb) rendered on the fly, else
   the bare plan. DLR sectors are drawn on top; the star chart stays visible.
3. DLR RING ON THE EXISTING LUOPAN: the "🀄 DLR" floating button (bottom-left of
   #fs-canvas-wrap) is now a TOGGLE. On → the 12 annual spirits are drawn as a ring
   AROUND the main luopan (flying stars remain underneath), via a hook in fsRedraw:
   `window.FloorPlanDLR.drawIfOn(ctx,cx,cy,outerR,ROT)` added right after the
   SunMoon hook (cx=550 cy=564 outerR=447, ROT from _fsLuopanRot). While ON a small
   bottom-centre bar shows ◀ year ▶ and "🏠 On floor plan" (opens the modal).
   MUTUAL EXCLUSION: turning the ring on turns Sun/Moon off (detected via the
   #fs-sunmoon-toggle "…ON" label) so the wheel isn't crowded — as Edu allowed.
   Ring chart is memoized by facing+year so frequent fsRedraw calls don't rebuild
   the engine each time.

## VERIFY ON DEVICE (couldn't browser-test here)
- Ring label placement at radius outerR+108 on the 1100×1130 canvas: E/W sectors
  sit near the canvas edge and are clamped (pad 42). If cramped, lower rLabel or
  shrink font (drawIfOn: rLabel / drawLabelBlock fs).
- Composite-under-sectors alignment: DLR uses saved.centerF (same centre FS uses),
  so stars + sectors should register. Confirm on a real saved plan.
- Mutual exclusion relies on the Sun/Moon button text containing "ON".

## ENGINE (unchanged) — window.XKDGDaLiuRenFS.build({year,facingDeg})
sectors[12] = {earth, heaven, general{cn,en}, greens[], reds[], virtues[], isVoid,
net('green'|'red'|'green_hollow'|'cancel'|'neutral')}. HD rule: 天醫 + a negative
→ green_hollow (hollow ring). 六合 normal cancellable green. Voids not significant
(data only; shown as "Void …" in the modal caption).

## STILL OPEN / DEFERRED
- Ring uses a compact 3-line label; modal uses the full slide format. If Edu wants
  identical density on both, adjust drawLabelBlock fs on the ring.
- Season label = Gregorian-month word (cosmetic); swap seasonOf() for 節氣/五行 if wanted.
- Contextual greens (Parent→bedroom, Children→recreation) computed but OFF by default.
- No independent DLR centroid editor (reuses FS geometry by design).
- floorplanDLR persistence stores only {year,facingDeg,facingSide,centerF} (no image copy).
- "5 Interactions" (五行) slide still deferred by Edu.

## PARALLEL FS WORK confirmed LIVE at session start (md5 matched)
app-fengshui.js was 1121692cb17f · sun-moon.js 9edfbd96078b (替卦 + Sun/Moon shipped).

# Plan — Yang openings optimizer + living-space guide (Edu, session 36, 2026-10-30)

Goal (Edu): place bed, desks, doors and items so that the EXISTING yang openings
(house entrance door, room doors, OPENABLE windows) fall on the good Ling Shen water
hexagrams of each facing. Optimise first without internal fountains; suggest a fountain
only for what cannot be reached.

Decisions by Edu:
- Scope: guide + app tool.
- Conflicts between openings (e.g. door on 62 vs window on 46): NO automatic priority —
  the tool shows the options, the user decides case by case.
- Windows count only if OPENABLE (no fixed glass).
- Editorial rule unchanged: no invented interpretations; texts purely technical.

## Procedure proven in session 36 (Vienna bedroom, facing 266)
1. Facing point = centre of the bed head / door centre / desk; facing ZS.
2. Good water positions = the Photo sectors candidates (LS within ±70°, links with facing + people).
3. Find: wide photo straight ahead (0.5×) from the facing point → where openings fall (approx).
4. Final check: 1× photo from the SAME point turned toward each opening; Photo centre ≈ its
   direction; 🧱 Align to a wall (wall running away; direction = where it RUNS, e.g. 266);
   magnifier for points. Wide-photo edges can be off 2–3°.
5. Laser: horizontal distance from the facing point to the centre of each opening (door closed,
   window closed → aim at the central mullion).
6. With bearing θ and distance D: forward F = D·cos(θ−facing), lateral L = D·sin(θ−facing).
   Moving the piece by s (lateral) / t (forward) gives the new bearing atan2(L−s, F−t).
   Two openings + lateral and forward shifts → 2 equations, exact solution (e.g. 34 cm left +
   43 cm forward). Lateral only → no common solution: show one option per opening
   (e.g. B1 door centred on 62 / B2 window stays on 46) and the "boundary" warning.
7. Angular width of an opening (edge to edge) vs 5.625° of a hexagram: show whether it can fit
   at all; closer = wider.
8. What does not fit → fountain on the chosen LS hexagram (nozzle inside the box, 1× check),
   switched daily with the fountain rule (water hex ↔ hour ↔ day).
9. Save each calibrated picture (📦 Dropbox: House profiles/<house>/<facing> facing).

## App tool (to build)
- Openings on each floor: doors already exist; add kind 'window' (openable) with name.
- For each facing source (house, doors, beds, desks, items): per opening store
  {bearing_centre, bearing_left, bearing_right, distance_m, measured_at, photo} — filled from
  Photo sectors (📍 Measure a point → "Save as opening") + laser distance typed in.
- Panel "🪟 Yang openings" per facing: table opening → hexagram(s), ✓ centred / ⚠ boundary /
  ✗ not on a good LS hexagram, width vs 5.6°.
- Move calculator: choose the target hexagram for each opening, allowed moves (lateral /
  forward, max cm) → solutions with resulting bearings for ALL openings; user picks.
- Then: list of good LS hexagrams still without an opening → "suggest a fountain here" (+ dates
  to place it, daily on/off rule).
- AI tool `yang_openings` (status + move calculation) for the assistant.

## Guide (to write) — guides/yang-openings.html
"Organising the living space with the existing yang openings": the 9 steps above, with the
Vienna example (numbers), when to add a fountain, and the photo/laser how-to. Video later.

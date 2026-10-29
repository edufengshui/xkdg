# Sun facing video — sources

1. Serve the repo: `python3 -m http.server 8765` (repo root).
2. `node capture.js` → app screenshots in shots/ (+ meta.json with tap points).
3. `node render.js stills "[[scene,t],...]"` to preview frames; `node render.js all` → out/s0..s8.mp4.
4. Concat with ffmpeg concat demuxer (-c copy) → guides/videos/sun-facing.mp4.

Needs playwright + ffmpeg; lunar.js is served from digest/node_modules.

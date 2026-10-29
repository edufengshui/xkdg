// Demo open-plan flat for video 3 (8 palaces / 24 mountains from the CENTRE of the house).
// House frame, metres: +z = house facing 176°, −x = 266°, +x = 86°, −z = 356°.
// Outer walls x −4..4, z −2.75..2.75 (8 × 5.5 m), height 2.7. Centre of the house = (0, 0).
// Sleeping area x −4..−1 behind a partition (x = −1) with a 2.4 m wide arch (z −1.2..1.2).
window.HOUSE = { X0: -4, X1: 4, Z0: -2.75, Z1: 2.75, H: 2.7, PX: -1, AZ: 1.2 };
window.bearingDir = function (B) { const y = (B - 176) * Math.PI / 180; return [-Math.sin(y), Math.cos(y)]; };   // [x, z]
window.buildHouse = function (THREE, S, opt) {
  opt = opt || {};
  const R = window.HOUSE, H = R.H;
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, metalness: 0 }, o || {}));
  const add = (geo, mat, x, y, z, ry) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; S.add(m); return m; };
  const box = (sx, sy, sz, mat, x, y, z, ry) => add(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, ry);
  const W = R.X1 - R.X0, D = R.Z1 - R.Z0;
  const wh = opt.lowWalls ? .5 : H;                       // top view: low walls
  // floor (planks along the facing)
  box(W, .02, D, M('#c9a27a', { roughness: .7 }), 0, -.01, 0);
  for (let i = 1; i < 30; i++) box(.004, .021, D, M('#a98260'), R.X0 + i * W / 30, -.009, 0);
  if (!opt.noCeiling) box(W, .02, D, M('#fbfaf7'), 0, H + .01, 0);
  const wA = M('#efe9df'), wB = M('#e6ddd0'), wC = M('#ece4d6');
  const T = .06;
  // west (x = −4) and east (x = 4) walls
  box(T, wh, D, wB, R.X0 - T / 2, wh / 2, 0); box(T, wh, D, wB, R.X1 + T / 2, wh / 2, 0);
  // back wall (z = −2.75)
  box(W, wh, T, wA, 0, wh / 2, R.Z0 - T / 2);
  // front wall (z = 2.75): bedroom window x −3..−1.8, living window x 0..1.6 (sill 0.9, top 2.2), entrance door x 2.6..3.5
  const fz = R.Z1 + T / 2, seg = (x0, x1, y0, y1) => box(x1 - x0, y1 - y0, T, wC, (x0 + x1) / 2, (y0 + y1) / 2, fz);
  const top = Math.min(wh, H);
  seg(-4, -3, 0, top); seg(-1.8, 0, 0, top); seg(1.6, 2.6, 0, top); seg(3.5, 4, 0, top);
  if (!opt.lowWalls) { seg(-3, -1.8, 0, .9); seg(-3, -1.8, 2.2, H); seg(0, 1.6, 0, .9); seg(0, 1.6, 2.2, H); seg(2.6, 3.5, 2.1, H); }
  else { seg(-3, -1.8, 0, .5); seg(0, 1.6, 0, .5); }
  const glassM = new THREE.MeshBasicMaterial({ color: 0xcfe8f7 });
  if (!opt.lowWalls) [[-2.4, 1.2], [.8, 1.6]].forEach(([cx, w]) => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.3), glassM); g.position.set(cx, 1.55, R.Z1 + .05); g.rotation.y = Math.PI; S.add(g);
    box(w + .06, .05, .06, M('#ffffff'), cx, 2.22, R.Z1); box(w + .06, .05, .1, M('#ffffff'), cx, .88, R.Z1 - .02); box(.04, 1.3, .05, M('#ffffff'), cx, 1.55, R.Z1);
  });
  // entrance door (closed leaf)
  if (!opt.lowWalls) { box(.9, 2.08, .05, M('#8d6e63'), 3.05, 1.04, R.Z1 - .01); box(.12, .03, .05, M('#cfcfcf'), 2.75, 1.0, R.Z1 - .05); }
  // partition x = −1 (thickness 0.1) with the arch z −1.2..1.2, lintel above 2.1
  const pt = .1, ph = opt.lowWalls ? .5 : H;
  box(pt, ph, R.Z1 - R.AZ, wA, R.PX, ph / 2, (R.Z1 + R.AZ) / 2); box(pt, ph, -R.AZ - R.Z0, wA, R.PX, ph / 2, (R.Z0 - R.AZ) / 2);
  if (!opt.lowWalls) box(pt, H - 2.1, 2 * R.AZ, wA, R.PX, (H + 2.1) / 2, 0);
  // skirting boards (dark) + cornices: the calibration edges
  const sk = M('#5d4b3c'), cor = M('#d8d0c2');
  const skirt = (sx, sz, x, z) => { box(sx, .08, sz, sk, x, .04, z); if (!opt.lowWalls) box(Math.max(sx, .03), .05, Math.max(sz, .03), cor, x, H - .025, z); };
  skirt(.015, D, R.X0 + .008, 0); skirt(.015, D, R.X1 - .008, 0); skirt(W, .015, 0, R.Z0 + .008);
  [[-4, -3], [-1.8, 0], [1.6, 2.6], [3.5, 4]].forEach(([a, b]) => skirt(b - a, .015, (a + b) / 2, R.Z1 - .008));
  [-1, 1].forEach(s => { const z0 = s > 0 ? R.AZ : R.Z0, z1 = s > 0 ? R.Z1 : -R.AZ; skirt(.015, z1 - z0, R.PX + pt / 2 + .008, (z0 + z1) / 2); skirt(.015, z1 - z0, R.PX - pt / 2 - .008, (z0 + z1) / 2); });
  // ── sleeping area: bed (headboard on the back wall = sitting 356°), wardrobe, bedside table
  box(1.6, .3, 2.05, M('#8d6e63'), -2.5, .2, R.Z0 + 1.05); box(1.56, .2, 1.98, M('#fafafa'), -2.5, .45, R.Z0 + 1.07);
  box(1.6, .9, .06, M('#6d4c41'), -2.5, .65, R.Z0 + .03);
  box(.6, .14, .38, M('#ffffff'), -2.85, .62, R.Z0 + .35); box(.6, .14, .38, M('#ffffff'), -2.15, .62, R.Z0 + .35);
  box(1.6, .06, 1.2, M('#7e57c2'), -2.5, .58, R.Z0 + 1.45);
  box(.45, .5, .4, M('#a1887f'), -1.45, .25, R.Z0 + .25);
  box(.6, 2.2, 1.6, M('#d7ccc8'), R.X0 + .3, 1.1, R.Z0 + 1.0); box(.01, 2.1, .01, M('#8d6e63'), R.X0 + .61, 1.1, R.Z0 + 1.0);
  // ── living: sofa on the back wall, coffee table, rug, armchair
  box(2.2, .42, .9, M('#5c6bc0'), 1.6, .21, R.Z0 + .5); box(2.2, .5, .2, M('#3f51b5'), 1.6, .62, R.Z0 + .1);
  box(.2, .3, .9, M('#3f51b5'), .5, .52, R.Z0 + .5); box(.2, .3, .9, M('#3f51b5'), 2.7, .52, R.Z0 + .5);
  box(1.0, .4, .55, M('#8d6e63'), 1.6, .2, -1.15);
  box(2.4, .01, 1.7, M('#e0c9a6'), 1.6, .006, -1.25);
  // ── kitchen on the east wall: counter + upper cabinets + fridge
  box(.6, .9, 2.6, M('#eceff1'), R.X1 - .3, .45, -.6); box(.62, .04, 2.62, M('#90a4ae'), R.X1 - .3, .92, -.6);
  box(.35, .7, 2.6, M('#eceff1'), R.X1 - .175, 1.85, -.6);
  box(.65, 1.9, .7, M('#cfd8dc'), R.X1 - .33, .95, 1.1);
  // ── dining table + 2 chairs near the living window
  box(1.2, .04, .8, M('#a1887f'), 1.0, .75, 1.6);
  [[.48, 1.28], [.48, 1.92], [1.52, 1.28], [1.52, 1.92]].forEach(([x, z]) => box(.04, .73, .04, M('#5d4037'), x, .365, z));
  [[.3, 1.6], [1.7, 1.6]].forEach(([x, z]) => { box(.42, .04, .42, M('#455a64'), x, .46, z); box(.05, .44, .05, M('#37474f'), x, .22, z); });
  // plant in the front-right corner, picture on the partition (living side)
  add(new THREE.CylinderGeometry(.16, .12, .35, 24), M('#e0e0e0'), 3.75, .175, R.Z1 - .3);
  add(new THREE.SphereGeometry(.32, 20, 16), M('#558b2f'), 3.75, .65, R.Z1 - .3);
  if (!opt.lowWalls) { box(.02, .6, .8, M('#ffb74d'), R.PX + .06, 1.5, 1.95); box(.02, .6, .8, M('#4db6ac'), R.PX + .06, 1.5, -1.95); }
  // lights
  S.add(new THREE.HemisphereLight(0xffffff, 0xd7c6ae, .75));
  const L1 = new THREE.PointLight(0xfff3e0, .5, 14); L1.position.set(1.5, 2.5, 0); L1.castShadow = true; S.add(L1);
  const L2 = new THREE.PointLight(0xfff3e0, .35, 10); L2.position.set(-2.5, 2.5, 0); S.add(L2);
};

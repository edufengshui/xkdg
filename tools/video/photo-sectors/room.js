// Demo bedroom in the house frame: local +z = house facing (176°), +x = facing+90 (266°... no: right of the facing when looking along it)
// Units: metres. Headboard wall at z = -0.1, front wall at z = 4.2, left wall x = -1.4, right wall x = 2.2, height 2.7.
window.ROOM = { X0: -1.4, X1: 2.2, Z0: -0.1, Z1: 4.2, H: 2.7 };
window.buildRoom = function (THREE, S, opt) {
  opt = opt || {};
  const R = window.ROOM;
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, metalness: 0 }, o || {}));
  const add = (geo, mat, x, y, z, ry) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; S.add(m); return m; };
  const box = (sx, sy, sz, mat, x, y, z, ry) => add(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, ry);
  const W = R.X1 - R.X0, D = R.Z1 - R.Z0, cx = (R.X0 + R.X1) / 2, cz = (R.Z0 + R.Z1) / 2;
  // floor (wood planks look) + ceiling
  const floorM = M('#c9a27a', { roughness: .7 });
  box(W, .02, D, floorM, cx, -.01, cz);
  for (let i = 0; i < 12; i++) box(.004, .021, D, M('#a98260'), R.X0 + (i + 1) * W / 13, -.009, cz);
  if (!opt.noCeiling) box(W, .02, D, M('#fbfaf7'), cx, R.H + .01, cz);
  const wallM = M('#efe9df'), wall2 = M('#e6ddd0');
  // walls (thin boxes), front wall with a window opening
  box(.06, R.H, D, wallM, R.X0 - .03, R.H / 2, cz);            // left
  box(.06, R.H, D, wall2, R.X1 + .03, R.H / 2, cz);            // right
  if (!opt.noBack) box(W, R.H, .06, wallM, cx, R.H / 2, R.Z0 - .03);   // headboard wall
  // front wall pieces around window (x 0.0..1.4, y 0.9..2.2)
  const fz = R.Z1 + .03;
  box(1.4, R.H, .06, wall2, R.X0 + .7, R.H / 2, fz); box(R.X1 - 1.4, R.H, .06, wall2, (1.4 + R.X1) / 2, R.H / 2, fz);
  box(1.4, .9, .06, wall2, .7, .45, fz); box(1.4, R.H - 2.2, .06, wall2, .7, (R.H + 2.2) / 2, fz);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.3), new THREE.MeshBasicMaterial({ color: 0xcfe8f7 })); glass.position.set(.7, 1.55, R.Z1 + .05); glass.rotation.y = Math.PI; S.add(glass);
  box(1.46, .05, .06, M('#ffffff'), .7, 2.22, R.Z1); box(1.46, .05, .1, M('#ffffff'), .7, .88, R.Z1 - .02); box(.04, 1.3, .05, M('#ffffff'), .7, 1.55, R.Z1);
  // skirting boards (dark) and ceiling cornice — the calibration edges
  const sk = M('#5d4b3c');
  box(.015, .08, D, sk, R.X1 - .008, .04, cz); box(.015, .08, D, sk, R.X0 + .008, .04, cz);
  box(W, .08, .015, sk, cx, .04, R.Z1 - .008);
  const cor = M('#d8d0c2');
  box(.03, .05, D, cor, R.X1 - .015, R.H - .025, cz); box(.03, .05, D, cor, R.X0 + .015, R.H - .025, cz); box(W, .05, .03, cor, cx, R.H - .025, R.Z1 - .015);
  // door on the left wall (z 3.0..3.9), frame + leaf ajar
  box(.08, 2.1, .06, M('#ffffff'), R.X0 + .01, 1.05, 2.97); box(.08, 2.1, .06, M('#ffffff'), R.X0 + .01, 1.05, 3.93); box(.08, .06, 1.0, M('#ffffff'), R.X0 + .01, 2.12, 3.45);
  box(.02, 2.05, .9, M('#bfa58a'), R.X0 + .015, 1.025, 3.45);
  box(.05, .02, .12, M('#888'), R.X0 + .05, 1.0, 3.12);
  // bed (headboard at z = -0.1, from x -0.4 to 1.2, 2.05 m long)
  box(1.6, .3, 2.05, M('#8d6e63'), .4, .2, .93); box(1.56, .2, 1.98, M('#fafafa'), .4, .45, .95);
  box(1.6, .9, .06, M('#6d4c41'), .4, .65, -.06);
  box(.6, .14, .38, M('#ffffff'), .05, .62, .25); box(.6, .14, .38, M('#ffffff'), .75, .62, .25);
  box(1.6, .06, 1.2, M('#7e57c2'), .4, .58, 1.3);
  // desk in the room, its chair between the desk and the wall: seated, you face INTO the room (desk facing 266°)
  box(.6, .04, 1.2, M('#a1887f'), 1.45, .75, 3.2);
  [[1.18, 2.65], [1.18, 3.75], [1.72, 2.65], [1.72, 3.75]].forEach(([x, z]) => box(.04, .73, .04, M('#5d4037'), x, .365, z));
  box(.42, .04, .42, M('#455a64'), 1.95, .46, 3.2); box(.04, .45, .42, M('#455a64'), 2.15, .7, 3.2);
  box(.05, .44, .05, M('#37474f'), 1.95, .22, 3.2);
  box(.24, .015, .32, M('#90a4ae'), 1.42, .775, 3.2); box(.02, .22, .32, M('#263238'), 1.31, .88, 3.2);   // laptop, screen towards the chair
  // a plant (item) in the front-right corner
  add(new THREE.CylinderGeometry(.16, .12, .35, 24), M('#e0e0e0'), R.X1 - .3, .175, R.Z1 - .35);
  add(new THREE.SphereGeometry(.32, 20, 16), M('#558b2f'), R.X1 - .3, .65, R.Z1 - .35);
  // lights
  S.add(new THREE.HemisphereLight(0xffffff, 0xd7c6ae, .75));
  const L = new THREE.PointLight(0xfff3e0, .55, 12); L.position.set(.4, 2.5, 2.0); L.castShadow = true; S.add(L);
  const sunIn = new THREE.DirectionalLight(0xfff1d6, .5); sunIn.position.set(.7, 3, 9); sunIn.target.position.set(.4, 0, 1.5); S.add(sunIn); S.add(sunIn.target);
};

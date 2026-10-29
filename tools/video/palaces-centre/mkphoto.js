// 4 photos from the centre of the house (0, 1.5, 0), 13 mm (iPhone 0.5×), portrait 1500×2000,
// towards the facing and every 90°; for each, two converging edges of a wall that runs along the photo direction.
const { chromium } = require('playwright'); const fs = require('fs');
const W = 1500, H = 2000, CAM = [0, 1.5, 0], Hc = 2.65;
// edges: [ [x,y,z] a, b ] on the floor line, then the same two points at the ceiling line
const SH = [
  { B: 176, wall: [[-0.94, 0, 1.55], [-0.94, 0, 2.55]] },        // partition, living side (runs along 176)
  { B: 266, wall: [[-2.9, 0, 2.74], [-3.85, 0, 2.74]] },          // sleeping area front wall, through the arch
  { B: 356, wall: [[-0.94, 0, -1.55], [-0.94, 0, -2.55]] },       // partition, living side
  { B: 86,  wall: [[2.95, 0, -2.74], [3.9, 0, -2.74]] } ];        // back wall, near the kitchen
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); await p.goto('file://' + __dirname + '/photo.html');
  const out = { W, H, f35: 13, photos: [] };
  for (let i = 0; i < SH.length; i++) {
    await p.reload();
    const u = await p.evaluate(([W, H, B, c]) => renderPhoto(W, H, 13, B, c), [W, H, SH[i].B, CAM]);
    fs.writeFileSync(__dirname + '/p' + (i + 1) + '-photo.jpg', Buffer.from(u.split(',')[1], 'base64'));
    const w = SH[i].wall, pts = [w[0], w[1], [w[0][0], Hc, w[0][2]], [w[1][0], Hc, w[1][2]]];
    const pr = await p.evaluate(pts => project(pts), pts);
    out.photos.push({ B: SH[i].B, wall: pr.map(q => [q[0], q[1]]) });
    console.log(SH[i].B, JSON.stringify(pr.map(q => q.map(v => Math.round(v)))));
  }
  fs.writeFileSync(__dirname + '/photos.json', JSON.stringify(out));
  await b.close();
})();

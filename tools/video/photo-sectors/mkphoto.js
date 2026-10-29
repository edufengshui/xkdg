const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); await p.goto('file://' + __dirname + '/photo.html');
  const W = 1500, H = 2000;
  const shots = { door: [-90, [-1.33, 1.5, 3.45]], desk: [90, [1.95, 1.2, 3.2]] };
  for (const n in shots) { await p.reload(); const u = await p.evaluate(([W, H, y, c]) => { window._W = W; window._H = H; return renderPhoto(W, H, 13, y, c); }, [W, H, shots[n][0], shots[n][1]]); fs.writeFileSync(__dirname + '/' + n + '-photo.jpg', Buffer.from(u.split(',')[1], 'base64')); }
  await p.reload();
  const url = await p.evaluate(([W, H]) => { window._W = W; window._H = H; return renderPhoto(W, H, 13, 6, [0.4, 1.3, 0.25]); }, [W, H]);
  fs.writeFileSync(__dirname + '/bed-photo.jpg', Buffer.from(url.split(',')[1], 'base64'));
  // calibration edges on the wall at x = 2.2 (runs along the facing): floor line and ceiling line
  const pts = await p.evaluate(() => project([[-1.4, 0.0, 1.95], [-1.4, 0.0, 2.8], [-1.4, 2.68, 1.95], [-1.4, 2.68, 2.8]]));
  fs.writeFileSync(__dirname + '/bed-photo.json', JSON.stringify({ W, H, f35: 13, yaw: 6, wall: pts }));
  console.log(JSON.stringify(pts));
  await b.close();
})();

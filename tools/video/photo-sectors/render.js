const { chromium } = require('playwright');
const fs = require('fs'), { spawn } = require('child_process');
const DIR = __dirname;
const meta = fs.readFileSync(DIR + '/shots/meta2.json', 'utf8');
fs.writeFileSync(DIR + '/scene_built.html', fs.readFileSync(DIR + '/scene.html', 'utf8').replace('__META__', meta));
const mode = process.argv[2] || 'stills';     // stills | scene <i> | all
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + DIR + '/scene_built.html');
  const durs = await p.evaluate(() => durations);
  const prep = async i => { const d = await p.evaluate(i => setup(i), i); await p.evaluate(() => draw(0.01)); await p.evaluate(() => Promise.all([...document.images].map(im => im.complete ? 0 : new Promise(r => im.onload = r)))); await p.waitForTimeout(150); return d; };
  if (mode === 'stills') {
    const picks = JSON.parse(process.argv[3]);   // [[scene, t], ...]
    for (const [i, t] of picks) { await prep(i); await p.evaluate(t => draw(t), t); await p.waitForTimeout(80); await p.screenshot({ path: DIR + `/still_${i}_${t}.jpg`, type: 'jpeg', quality: 85 }); }
  } else {
    const list = mode === 'all' ? durs.map((_, i) => i) : [parseInt(process.argv[3], 10)];
    for (const i of list) {
      const d = await prep(i), N = Math.round(d * 30);
      const tmp = DIR + `/out/s${i}.tmp.mp4`;
      const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', tmp]);
      for (let f = 0; f < N; f++) {
        await p.evaluate(t => draw(t), f / 30);
        const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      const code = await new Promise(r => ff.on('close', r));
      if (code === 0) fs.renameSync(tmp, DIR + `/out/s${i}.mp4`); else console.log('ffmpeg failed', i);
      console.log('scene', i, N, 'frames');
    }
  }
  await b.close();
})();

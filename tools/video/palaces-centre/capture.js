// App screenshots for video 3: Photo sectors, 4 photos from the CENTRE of the house, 8 directions + 24 mountains.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/shots/';
const meta = { full: [] };
const PH = JSON.parse(fs.readFileSync(__dirname + '/photos.json', 'utf8'));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    timezoneId: 'Europe/Vienna', geolocation: { latitude: 48.2155, longitude: 16.3958 }, permissions: ['geolocation'], locale: 'en-GB' });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-10-29T10:31:40+01:00') });
  await p.route(/^https?:\/\/(?!localhost)/, r => /lunar-javascript/.test(r.request().url()) ? r.fulfill({ path: '/home/claude/xkdg/digest/node_modules/lunar-javascript/lunar.js', contentType: 'application/javascript' }) : r.abort());
  await p.addInitScript(() => {
    localStorage.setItem('xkdg_persons_a', JSON.stringify({ Demo: { date: '1975-04-12', time: '08:30', depth: 4 } }));
    localStorage.setItem('xkdg_houses', JSON.stringify({ Demo: [{ name: 'Demo house', address: '', houseFacing: 176, period: 9, sameFacing: true,
      floors: [{ label: 'Floor 1', facing: 176, period: 9,
        doors: [],
        settings: { water: [], bed: [], desk: [] } }] }] }));
    window.confirm = () => true; window.alert = () => {};
    window.prompt = (msg) => { window.__lastPrompt = msg; const m = String(msg).split('\n').filter(l => /^\d = /.test(l)); const hit = m.find(l => new RegExp('= ' + window.__wantDeg + '°').test(l)); return hit ? hit[0] : '1'; };
  });
  await p.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' });
  await p.clock.runFor(4000);
  const hide = () => p.evaluate(() => { const o = document.getElementById('license-overlay'); if (o) o.style.display = 'none'; [...document.body.querySelectorAll('*')].forEach(e => { if (e.closest('#xps-modal')) return; const cs = getComputedStyle(e); if (cs.position === 'fixed' && e.getBoundingClientRect().width < 120) e.style.visibility = 'hidden'; }); });
  await hide();
  await p.evaluate(() => { loadPerson('A', 'Demo'); setMode('fengshui'); });
  await p.clock.runFor(1500); await hide();
  const box = async sel => { const e = await p.$(sel); if (!e) return null; const r = await e.boundingBox(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; };
  const shot = async (name, tapSel) => { await hide(); await p.clock.runFor(300); meta[name] = { tap: tapSel ? await box(tapSel) : null, boxes: await p.evaluate(() => { const o = {}; ['xps-cal', 'xps-canvas', 'xps-centre', 'xps-lens', 'xps-hint', 'xps-m-wall'].forEach(id => { const e = document.getElementById(id); if (e && e.offsetParent) { const r = e.getBoundingClientRect(); o[id] = [r.x, r.y, r.right, r.bottom]; } }); return o; }) }; await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 92 }); };
  const toCanvas = () => p.evaluate(() => { const c = document.getElementById('xps-canvas'), m = document.getElementById('xps-modal'); m.scrollTop += c.getBoundingClientRect().top - 120; });
  meta.mtn = await p.evaluate(() => Array.from({ length: 24 }, (_, k) => fsMountainCharFromDeg(k * 15)));
  // menu
  await p.evaluate(() => { const el = document.getElementById('fs-house-profiles'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); });
  await shot('c0', 'button[onclick*="fs-hm-house-0"]');
  await p.click('button[onclick*="fs-hm-house-0"]'); await p.clock.runFor(400);
  await shot('c1', 'button[onclick*="XKDGPhotoSectors.open"]');
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /XKDGPhotoSectors\.open/.test(b.getAttribute('onclick') || '')).click());
  await p.clock.runFor(800);
  meta.facingSel = await p.evaluate(() => { const s = document.querySelector('#xps-modal select'); return s.options[s.selectedIndex].textContent; });
  await shot('c2', '#xps-modal label input[type=file]');
  meta.c2.tap = await p.evaluate(() => { const r = document.querySelector('#xps-modal input[type=file]').parentElement.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  for (let i = 0; i < 4; i++) {
    const P = PH.photos[i], n = i + 1;
    await p.evaluate(d => { window.__wantDeg = d; }, P.B);
    await p.setInputFiles('#xps-modal input[type=file]', __dirname + '/p' + n + '-photo.jpg');
    await p.clock.runFor(1500); await p.waitForTimeout(400);
    await p.selectOption('#xps-lens', '13'); await p.clock.runFor(300);
    await p.fill('#xps-centre', String(P.B)); await p.dispatchEvent('#xps-centre', 'change'); await p.clock.runFor(300);
    if (i === 0) { await p.evaluate(() => { const m = document.getElementById('xps-modal'); m.scrollTop = 0; }); await shot('c3', '#xps-centre'); }
    await p.click('#xps-m-wall'); await p.clock.runFor(300);
    await toCanvas(); await p.clock.runFor(200);
    if (i === 0) await shot('c4', '#xps-m-wall');
    const cb = await (await p.$('#xps-canvas')).boundingBox();
    const toPage = ([x, y]) => ({ x: cb.x + x / PH.W * cb.width, y: cb.y + y / PH.H * cb.height });
    const taps = P.wall.map(toPage);
    if (i === 0) meta.wallTaps = taps;
    for (let k = 0; k < 4; k++) {
      await p.mouse.click(taps[k].x, taps[k].y); await p.clock.runFor(250);
      if (i === 0 && k < 3) await shot('c5_' + k, null);
    }
    if (i === 0) meta.prompt = await p.evaluate(() => window.__lastPrompt);
    await p.clock.runFor(400);
    if (i === 0) {
      await shot('c6', null);
      meta.calNote = await p.evaluate(() => document.getElementById('xps-cal').textContent);
      // layers: tick 8 directions, then 24 mountains, untick water
      const cbx = async re => p.evaluate(re => { const c = [...document.querySelectorAll('#xps-modal label input[type=checkbox]')].find(c => new RegExp(re).test(c.parentElement.textContent)); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, re);
      await p.evaluate(() => { const c = [...document.querySelectorAll('#xps-modal label input[type=checkbox]')].find(c => /8 directions/.test(c.parentElement.textContent)); const m = document.getElementById('xps-modal'); m.scrollTop += c.getBoundingClientRect().top - 330; });
      await p.clock.runFor(200);
      meta.t8 = await cbx('8 directions'); meta.t24 = await cbx('24 mountains'); meta.tw = await cbx('water hexagrams');
      await shot('c7', null);
      await p.mouse.click(meta.tw.x, meta.tw.y); await p.clock.runFor(300); await shot('c8', null);
      await p.mouse.click(meta.t8.x, meta.t8.y); await p.clock.runFor(300); await shot('c9', null);
      meta.hint = await p.evaluate(() => document.getElementById('xps-hint').textContent);
      await p.mouse.click(meta.t24.x, meta.t24.y); await p.clock.runFor(300); await shot('c10', null);
      meta.save = await box('#xps-modal button[onclick*="_save"]');
      await toCanvas(); await p.clock.runFor(200); await shot('c11', null);
    } else { await toCanvas(); await p.clock.runFor(200); await shot('c1' + (i + 1), null); }
    meta.full.push(await p.evaluate(() => JSON.stringify({ cal: document.getElementById('xps-cal').textContent })));
    const url = await p.evaluate(() => document.getElementById('xps-canvas').toDataURL('image/jpeg', .9));
    fs.writeFileSync(OUT + 'r' + n + '.jpg', Buffer.from(url.split(',')[1], 'base64'));
    await p.evaluate(() => { const m = document.getElementById('xps-modal'); m.scrollTop = 0; });
  }
  fs.writeFileSync(OUT + 'meta.json', JSON.stringify(meta, null, 1));
  await b.close();
})();

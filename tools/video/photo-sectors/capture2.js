const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/shots/';
const meta = {};
const PH = JSON.parse(fs.readFileSync(__dirname + '/bed-photo.json', 'utf8'));
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
        doors: [{ name: 'Bedroom door', facing: 266, kind: 'internal' }, { name: 'Entrance', facing: 176, kind: 'external' }, { name: 'Plant', facing: 86, kind: 'item' }],
        settings: { water: [], bed: [{ name: 'Bed', bedSitting: 356 }], desk: [{ name: 'Desk', deskFacing: 86 }] } }] }] }));
    window.confirm = () => true; window.alert = () => {};
    window.prompt = (msg) => { window.__lastPrompt = msg; const m = String(msg).split('\n').filter(l => /^\d = /.test(l)); const hit = m.find(l => /= 176°/.test(l)); return hit ? hit[0] : '1'; };
  });
  await p.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' });
  await p.clock.runFor(4000);
  const hide = () => p.evaluate(() => { const o = document.getElementById('license-overlay'); if (o) o.style.display = 'none'; [...document.body.querySelectorAll('*')].forEach(e => { if (e.closest('#xps-modal')) return; const cs = getComputedStyle(e); if (cs.position === 'fixed' && e.getBoundingClientRect().width < 120) e.style.visibility = 'hidden'; }); });
  await hide();
  await p.evaluate(() => { loadPerson('A', 'Demo'); setMode('fengshui'); });
  await p.clock.runFor(1500); await hide();
  const box = async sel => { const e = await p.$(sel); if (!e) return null; const r = await e.boundingBox(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; };
  const shot = async (name, tapSel) => { await hide(); await p.clock.runFor(300); meta[name] = { tap: tapSel ? await box(tapSel) : null }; await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 92 }); };
  await p.evaluate(() => { const el = document.getElementById('fs-house-profiles'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); });
  await shot('b0', 'button[onclick*="fs-hm-house-0"]');
  await p.click('button[onclick*="fs-hm-house-0"]'); await p.clock.runFor(400);
  await shot('b1', 'button[onclick*="XKDGPhotoSectors.open"]');
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /XKDGPhotoSectors\.open/.test(b.getAttribute('onclick') || '')).click());
  await p.clock.runFor(800);
  meta.facings = await p.evaluate(() => [...document.querySelectorAll('#xps-modal select optgroup')].map(g => ({ group: g.label, items: [...g.children].map(o => o.textContent) })));
  await p.selectOption('#xps-modal select', { label: 'Bed 176°' }).catch(async () => { const v = await p.evaluate(() => { const o = [...document.querySelectorAll('#xps-modal select option')].find(o => /^Bed/.test(o.textContent)); return o && o.value; }); await p.selectOption('#xps-modal select', v); });
  await p.clock.runFor(500);
  await shot('b2', '#xps-modal select');
  await p.setInputFiles('#xps-modal input[type=file]', __dirname + '/bed-photo.jpg');
  await p.clock.runFor(1500); await p.waitForTimeout(500);
  await shot('b3', '#xps-lens');
  await p.selectOption('#xps-lens', '13'); await p.clock.runFor(300);
  await shot('b4', '#xps-lens');
  // wall mode
  await p.click('#xps-m-wall'); await p.clock.runFor(300);
  await p.evaluate(() => { const c = document.getElementById('xps-canvas'); const m = document.getElementById('xps-modal'); m.scrollTop += c.getBoundingClientRect().top - 120; });
  await p.clock.runFor(200);
  await shot('b5', '#xps-m-wall');
  const cv = await p.$('#xps-canvas'); const cb = await cv.boundingBox();
  meta.canvas = cb;
  const toPage = ([x, y]) => ({ x: cb.x + x / PH.W * cb.width, y: cb.y + y / PH.H * cb.height });
  meta.wallTaps = PH.wall.map(toPage);
  for (let i = 0; i < 4; i++) {
    const t = meta.wallTaps[i];
    await p.mouse.click(t.x, t.y); await p.clock.runFor(250);
    if (i < 3) await shot('b6_' + i, null);
  }
  meta.prompt = await p.evaluate(() => window.__lastPrompt);
  await p.clock.runFor(400);
  await shot('b7', null);
  meta.state1 = await p.evaluate(() => JSON.stringify(XKDGPhotoSectors.state()).slice(0, 3000));
  // water list
  await p.evaluate(() => { const m = document.getElementById('xps-modal'); const l = [...m.querySelectorAll('input[type=checkbox]')]; window.__cbs = l.map(c => (c.parentElement.innerText || '').slice(0, 80)); });
  meta.cbs = await p.evaluate(() => window.__cbs);
  // keep only Hex 26 and Hex 57
  await p.evaluate(() => { const m = document.getElementById('xps-modal'); [...m.querySelectorAll('input[type=checkbox]')].forEach(c => { const t = (c.parentElement.innerText || ''); if (/^\s*Hex \d+/.test(t)) { const want = /^\s*Hex (26|57) /.test(t); if (c.checked !== want) c.click(); } }); });
  await p.clock.runFor(300);
  await p.evaluate(() => { const c = document.getElementById('xps-canvas'); const m = document.getElementById('xps-modal'); m.scrollTop += c.getBoundingClientRect().top - 60; });
  await shot('b8', null);
  // the list (scroll to it)
  await p.evaluate(() => { const m = document.getElementById('xps-modal'); const c = [...m.querySelectorAll('input[type=checkbox]')].find(c => /^\s*Hex 1 /.test(c.parentElement.innerText || '')); m.scrollTop += c.getBoundingClientRect().top - 140; });
  meta.b9_tick = await p.evaluate(() => { const m = document.getElementById('xps-modal'); const c = [...m.querySelectorAll('input[type=checkbox]')].find(c => /^\s*Hex 26 /.test(c.parentElement.innerText || '')); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await shot('b9', null);
  // boxes lower: floor level
  await p.evaluate(() => { const m = document.getElementById('xps-modal'); const r = [...m.querySelectorAll('input[type=range]')]; m.scrollTop += r[0].getBoundingClientRect().top - 520; r[0].value = r[0].min ? (+r[0].min + (+r[0].max - +r[0].min) * 0.55) : 0.55; r[0].dispatchEvent(new Event('input', { bubbles: true })); r[0].dispatchEvent(new Event('change', { bubbles: true })); r[1].value = (+r[1].min + (+r[1].max - +r[1].min) * 0.78); r[1].dispatchEvent(new Event('input', { bubbles: true })); r[1].dispatchEvent(new Event('change', { bubbles: true })); });
  await p.clock.runFor(300);
  meta.sliders = await p.evaluate(() => [...document.querySelectorAll('#xps-modal input[type=range]')].map(r => { const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, v: r.value, min: r.min, max: r.max }; }));
  await shot('b10', null);
  // measure a point inside Hex 26 box
  await p.click('#xps-m-measure').catch(() => {});
  await p.evaluate(() => { const c = document.getElementById('xps-canvas'); const m = document.getElementById('xps-modal'); m.scrollTop += c.getBoundingClientRect().top - 60; });
  await p.clock.runFor(200);
  const cb2 = await (await p.$('#xps-canvas')).boundingBox();
  meta.measureTap = { x: cb2.x + cb2.width * 0.11, y: cb2.y + cb2.height * 0.70 };
  await p.mouse.click(meta.measureTap.x, meta.measureTap.y); await p.clock.runFor(300);
  await shot('b11', null);
  meta.save = await box('#xps-modal button[onclick*="_save"]');
  meta.state2 = await p.evaluate(() => JSON.stringify(XKDGPhotoSectors.state()).slice(0, 2500));
  fs.writeFileSync(OUT + 'meta2.json', JSON.stringify(meta, null, 1));
  await b.close();
})();

const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/shots/';
const meta = {};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    timezoneId: 'Europe/Vienna', geolocation: { latitude: 48.2155, longitude: 16.3958 }, permissions: ['geolocation'], locale: 'en-GB' });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-10-29T10:31:40+01:00') });
  await p.route(/^https?:\/\/(?!localhost)/, r => /lunar-javascript/.test(r.request().url()) ? r.fulfill({ path: '/home/claude/xkdg/digest/node_modules/lunar-javascript/lunar.js', contentType: 'application/javascript' }) : r.abort());
  await p.addInitScript(() => {
    localStorage.setItem('xkdg_persons_a', JSON.stringify({ Demo: { date: '1975-04-12', time: '08:30', depth: 4 } }));
    localStorage.setItem('xkdg_houses', JSON.stringify({ Demo: [{ name: 'Demo house', address: 'Stuwerstrasse 31, 1020 Wien', houseFacing: 172, period: 9 }] }));
    localStorage.setItem('xkdg_gps', JSON.stringify({ lat: 48.2155, lng: 16.3958 }));
    window.confirm = () => true; window.alert = () => {};
  });
  await p.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' });
  await p.clock.runFor(4000);
  const hideLic = () => p.evaluate(() => { const o = document.getElementById('license-overlay'); if (o) o.style.display = 'none'; [...document.body.querySelectorAll('*')].forEach(e => { if (e.id === 'xsf-modal' || e.closest('#xsf-modal')) return; const cs = getComputedStyle(e); if (cs.position === 'fixed' && e.getBoundingClientRect().width < 120) e.style.visibility = 'hidden'; }); });
  await hideLic();
  await p.evaluate(() => { loadPerson('A', 'Demo'); setMode('fengshui'); });
  await p.clock.runFor(1500); await hideLic();
  const box = async sel => { const e = await p.$(sel); if (!e) return null; const r = await e.boundingBox(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; };
  const shot = async (name, tapSel) => { await hideLic(); await p.clock.runFor(300); meta[name] = { tap: tapSel ? await box(tapSel) : null }; await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 92 }); };
  // A1: house list
  await p.evaluate(() => { const el = document.getElementById('fs-house-profiles'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); });
  await shot('a1', 'button[onclick^="fsToggleHouseDetails(\'Demo\',0"]');
  await p.click('button[onclick^="fsToggleHouseDetails(\'Demo\',0"]');
  await p.clock.runFor(600);
  // A2: scroll so the Address & facing ☰ is visible
  await p.evaluate(() => { const b = document.querySelector('button[onclick*="fs-hm-addr-0"]'); window.scrollTo(0, b.getBoundingClientRect().top + scrollY - 260); });
  await shot('a2', 'button[onclick*="fs-hm-addr-0"]');
  await p.click('button[onclick*="fs-hm-addr-0"]');
  await p.clock.runFor(400);
  await shot('a3', 'button[onclick*="XKDGSunFacing.openForHou"]');
  await p.click('button[onclick*="XKDGSunFacing.openForHou"]');
  await p.clock.runFor(1500);
  await shot('a4', '#xsf-rows button');                       // the modal; tap target = Now
  // reading 1
  await p.clock.setFixedTime(new Date('2026-10-29T10:32:00+01:00'));
  await p.evaluate(() => XKDGSunFacing._now(0));
  await p.fill('#xsf-rows input[type=number]', '72'); await p.dispatchEvent('#xsf-rows input[type=number]', 'change');
  await shot('a5', '#xsf-rows input[type=number]');
  await p.selectOption('#xsf-rows select', 'right');
  await shot('a6', '#xsf-rows select');
  // reading 2 and 3
  await p.clock.setFixedTime(new Date('2026-10-29T10:36:00+01:00'));
  await p.evaluate(() => { XKDGSunFacing._add(); XKDGSunFacing._set(1, 'alpha', '73.5'); XKDGSunFacing._set(1, 'side', 'right'); });
  await p.evaluate(() => { const r = document.querySelectorAll('#xsf-rows > div'); });
  await p.clock.setFixedTime(new Date('2026-10-29T10:40:00+01:00'));
  await p.evaluate(() => XKDGSunFacing._add());
  await p.fill('#xsf-rows > div:nth-child(3) input[type=number]', '74'); await p.dispatchEvent('#xsf-rows > div:nth-child(3) input[type=number]', 'change');
  await p.selectOption('#xsf-rows > div:nth-child(3) select', 'right');
  await p.evaluate(() => { const s = document.getElementById('xsf-sum'); s.scrollIntoView({ block: 'end' }); });
  meta.a7_add = await box('button[onclick="XKDGSunFacing._add()"]');
  await shot('a7', '#xsf-sum button');                        // façade button
  meta.texts = await p.evaluate(() => ({ rows: [...document.querySelectorAll('[id^=xsf-res-]')].map(e => e.innerText), sum: document.getElementById('xsf-sum').innerText }));
  await p.evaluate(() => document.querySelector('#xsf-sum button').click());
  await p.clock.runFor(500);
  await p.evaluate(() => XKDGSunFacing.close());
  await p.clock.runFor(500);
  await p.evaluate(() => { const el = document.getElementById('fs-house-profiles'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); });
  await shot('a8', null);
  meta.a8_text = await p.evaluate(() => document.getElementById('fs-house-profiles').innerText.slice(0, 200));
  fs.writeFileSync(OUT + 'meta.json', JSON.stringify(meta, null, 1));
  await b.close();
})();

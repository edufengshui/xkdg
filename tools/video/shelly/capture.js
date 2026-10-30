// App screenshots for video 5: connect a student's own Shelly plug (🔌 Aquarium plug).
// The xkdg-shelly Worker is MOCKED (register / turn); the assistant reply is built from the
// REAL program_aquarium_light result (the tool runs the real app code).
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/shots/'; fs.mkdirSync(OUT, { recursive: true });
const meta = {};
const H = 'Demo flat';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Europe/Rome', locale: 'en-GB' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.clock.install({ time: new Date('2026-10-30T10:31:40+01:00') });
  let relay = false, aiStep = 0, toolRes = null;
  await p.route(/^https?:\/\/(?!localhost)/, async r => { const u = r.request().url();
    const ok = body => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (/lunar-javascript/.test(u)) return r.fulfill({ path: '/home/claude/xkdg/digest/node_modules/lunar-javascript/lunar.js', contentType: 'application/javascript' });
    if (/xkdg-shelly\./.test(u)) {
      if (/\?register/.test(u)) return ok({ ok: true, action: 'register', device: 'u4e63526b5c', token: 'demo', label: 'Aquarium', online: true, relay_on: false });
      const m = /turn=(on|off|status)/.exec(u); if (m && m[1] !== 'status') relay = m[1] === 'on';
      return ok({ action: 'manual', ok: true, relay_on: relay });
    }
    if (/workers\.dev/.test(u)) {
      const j = JSON.parse(r.request().postData() || '{}'), last = (j.messages || [])[j.messages.length - 1] || {};
      const tr = Array.isArray(last.content) && last.content.find(c => c.type === 'tool_result');
      if (!tr) return ok({ content: [{ type: 'tool_use', id: 'tu1', name: 'program_aquarium_light', input: { house: H } }], stop_reason: 'tool_use' });
      let res = {}; try { res = JSON.parse(typeof tr.content === 'string' ? tr.content : tr.content[0].text); } catch (e) {}
      toolRes = res;
      const rows = (res.scheduled || []).slice(0, 4).map(s => {
        const on = new Date(s.onTs), off = new Date(s.offTs);
        const f = d => d.toLocaleString('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return '• ' + f(on) + ' → ' + f(off) + (s.tier ? '  (tier ' + s.tier + ')' : '');
      }).join('\n');
      const txt = res.error ? ('Error: ' + res.error)
        : 'Preview of the plan for the aquarium of ' + H + ' — until the start of the next solar month' + (res.plan_ends ? ' (' + res.plan_ends.solar_term + ')' : '') + '.\n\n' + rows + '\n…\n\nNothing has been sent to the plug yet. Shall I send the plan?\n\n[[BTN]] Procedi=procedi | Annulla=annulla';
      return ok({ content: [{ type: 'text', text: txt }], stop_reason: 'end_turn' });
    }
    return r.abort(); });
  await p.addInitScript(() => {
    localStorage.setItem('xkdg_persons_a', JSON.stringify({ Demo: { date: '1975-04-12', time: '08:30', depth: 4 } }));
    localStorage.setItem('xkdg_houses', JSON.stringify({ Demo: [{ name: 'Demo flat', address: '', houseFacing: 176, period: 9, sameFacing: true,
      floors: [{ label: 'Floor 1', facing: 176, period: 9, doors: [], waters: [{ name: 'Aquarium', dir: 'N', palace: 'N' }], settings: { water: [], bed: [], desk: [] } }] }] }));
    localStorage.setItem('xkdg_license', JSON.stringify({ tier: 0, expiry: null, codeHash: 'a'.repeat(64), checkedAt: new Date().toISOString() }));
    localStorage.setItem('xkdg_gps', JSON.stringify({ lat: 41.9, lng: 12.5 }));
    localStorage.setItem('xkdg_ai_area', 'home');
    window.confirm = () => true; window.alert = () => {};
  });
  await p.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' });
  await p.clock.runFor(4000);
  const hide = () => p.evaluate(() => { const o = document.getElementById('license-overlay'); if (o) o.style.display = 'none'; });
  const box = async sel => { const e = await p.$(sel); if (!e) return null; const r = await e.boundingBox(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; };
  const shot = async (name, tap) => { await hide(); await p.clock.runFor(300); meta[name] = { tap: tap || null }; await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 92 }); };
  const btnBox = re => p.evaluate(re => { const b = [...document.querySelectorAll('button')].find(b => new RegExp(re).test((b.getAttribute('onclick') || '') + ' ' + b.textContent) && b.offsetParent); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, re);
  await hide();
  await p.evaluate(() => { loadPerson('A', 'Demo'); setMode('fengshui'); });
  await p.clock.runFor(1500); await hide();
  // 1) where: house card ☰ → 🔌 Aquarium plug (Shelly)
  await p.evaluate(() => { const el = document.getElementById('fs-house-profiles'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); });
  await shot('c0', await box('button[onclick*="fs-hm-house-0"]'));
  await p.click('button[onclick*="fs-hm-house-0"]'); await p.clock.runFor(400);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Aquarium plug/.test(b.textContent) && b.offsetParent); if (b) b.scrollIntoView({ block: 'center' }); });
  await p.clock.runFor(200);
  await shot('c1', await btnBox('XKDGShellyDevices'));
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /Aquarium plug/.test(b.textContent) && b.offsetParent).click());
  await p.clock.runFor(500);
  await shot('c2', null);
  // 2) filled in
  await p.fill('#xsd-host', 'shelly-123-eu.shelly.cloud');
  await p.fill('#xsd-key', 'MTIzNGFiY2RlZjU2Nzg5MDEyMzQ1Njc4OWFiY2RlZmdo');
  await p.fill('#xsd-id', 'a0b765c3d2e4');
  for (const id of ['#xsd-host', '#xsd-key', '#xsd-id', '#xsd-lon', '#xsd-utc']) meta['f_' + id.slice(5)] = await box(id);
  await shot('c3', await btnBox('_register'));
  await p.evaluate(() => XKDGShellyDevices._register()); await p.clock.runFor(800);
  await shot('c4', await btnBox("_turn\\('on'\\)"));
  await p.evaluate(() => XKDGShellyDevices._turn('on')); await p.clock.runFor(600);
  await shot('c5', await btnBox("_turn\\('off'\\)"));
  await p.evaluate(() => XKDGShellyDevices.close());
  // 3) the assistant
  await p.evaluate(() => window.scrollTo(0, 0));
  meta.chatBtn = await p.evaluate(() => { const b = [...document.querySelectorAll('button,div')].filter(e => e.textContent.trim() === '💬' && getComputedStyle(e).position === 'fixed')[0]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.evaluate(() => XKDGChat.open()); await p.clock.runFor(500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === '⛶'); if (b) b.click(); });
  await p.clock.runFor(500);
  await p.evaluate(t => { const inp = [...document.querySelectorAll('textarea,input')].find(e => /Ask something/.test(e.placeholder || '')); inp.value = t; }, 'Program the aquarium of Demo flat');
  await shot('t0', await btnBox('^\\s*Send'));
  await p.evaluate(() => XKDGChat._send());
  for (let k = 0; k < 120; k++) { await p.clock.runFor(500); const busy = await p.evaluate(() => /Thinking|Running|…$/.test(document.body.innerText.slice(-400))); if (!busy && k > 4) break; }
  await p.clock.runFor(800);
  await shot('t1', await btnBox('^\\s*Procedi'));
  fs.writeFileSync(OUT + 'meta.json', JSON.stringify(meta, null, 1));
  console.log(JSON.stringify(meta));
  console.log('TOOL', JSON.stringify(toolRes).slice(0, 600));
  await b.close();
})();

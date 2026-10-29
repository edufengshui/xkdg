// App screenshots for video 4: floor plan from laser measurements (📏 Plan builder + assistant).
// The assistant's replies are SCRIPTED (mocked worker); every plan_* tool call runs the real app code.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/shots/'; fs.mkdirSync(OUT, { recursive: true });
const meta = {};
const H = 'Demo flat';
// [user text, [tool calls], assistant reply]
const TURNS = [
  ['Help me build the floor plan of my house', [['plan_status', { house_name: H }]],
   'Let\'s build the floor plan of Demo flat (facing 176°). Every wall follows the facing or its perpendicular, so each room needs only two laser measurements.\n\nFirst the internal wall thickness: measure it once on a door frame. How thick is it?'],
  ['12 cm', [['plan_settings', { house_name: H, wall_m: 0.12 }]],
   'Internal walls: 0.12 m ✓\n\nNow the first room, usually the entrance. Two measurements:\n1️⃣ from the wall toward 176° (S) to the opposite wall\n2️⃣ from the wall toward 86° (E) to the wall toward 266° (W)'],
  ['Entrance: 2.40 and 1.80', [['plan_room', { house_name: H, action: 'add', name: 'Entrance', size_along_facing_axis_m: 2.4, size_across_m: 1.8 }]],
   'Entrance added: 2.40 m along the facing × 1.80 m across ✓\n\nNext room: which room does it touch, and on which side (176°, 356°, 86° or 266°)? Where along that wall does it start? Then its two sizes.'],
  ['Kitchen: next to the entrance on the 86° side, from the 356° corner. 2.40 and 3.00', [['plan_room', { house_name: H, action: 'add', name: 'Kitchen', attach_to: 'Entrance', side_deg: 86, offset_m: 0, size_along_facing_axis_m: 2.4, size_across_m: 3.0 }]],
   'Kitchen added on the 86° (E) side of the entrance, 2.40 × 3.00 m ✓ The 12 cm wall is put in between automatically.\n\nNext room?'],
  ['Bathroom: on the 266° side of the entrance, from the 356° corner. 2.40 and 2.20', [['plan_room', { house_name: H, action: 'add', name: 'Bathroom', attach_to: 'Entrance', side_deg: 266, offset_m: 0, size_along_facing_axis_m: 2.4, size_across_m: 2.2 }], ['plan_show', { house_name: H }]],
   'Bathroom added ✓ Here is the drawing so far: check that it matches your house, then go on with the next room.'],
  ['Living room: below the bathroom on its 176° side, from the 266° corner. 4.20 and 7.24', [['plan_room', { house_name: H, action: 'add', name: 'Living room', attach_to: 'Bathroom', side_deg: 176, offset_m: 0, size_along_facing_axis_m: 4.2, size_across_m: 7.24 }]],
   'Living room added, 4.20 × 7.24 m ✓\n\nNext room?'],
  ['Bedroom: on the 86° side of the kitchen, from the 356° corner. 3.60 and 3.20', [['plan_room', { house_name: H, action: 'add', name: 'Bedroom', attach_to: 'Kitchen', side_deg: 86, offset_m: 0, size_along_facing_axis_m: 3.6, size_across_m: 3.2 }], ['plan_show', { house_name: H }]],
   'Bedroom added ✓ All five rooms are in — here is the plan. Shall I open it in the floor-plan tool with the 8 palaces?'],
  ['Yes', [['plan_show', { house_name: H, to_floorplan: true }]],
   'Done: the plan is the floor plan of Floor 1, with the 8 palaces drawn from the centre. Tap 💾 Save to house to keep the picture with the stars.']
];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Europe/Vienna', locale: 'en-GB' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.clock.install({ time: new Date('2026-10-29T10:31:40+01:00') });
  // mocked assistant: per user turn, run its tool calls one by one, then the reply
  let turn = -1, step = 0;
  await p.route(/^https?:\/\/(?!localhost)/, r => { const u = r.request().url();
    if (/lunar-javascript/.test(u)) return r.fulfill({ path: '/home/claude/xkdg/digest/node_modules/lunar-javascript/lunar.js', contentType: 'application/javascript' });
    if (/workers\.dev/.test(u)) {
      const j = JSON.parse(r.request().postData()), last = j.messages[j.messages.length - 1];
      const isUser = typeof last.content === 'string' || (Array.isArray(last.content) && !last.content.some(c => c.type === 'tool_result'));
      if (isUser) { turn++; step = 0; }
      const T = TURNS[turn], calls = T[1];
      let body;
      if (step < calls.length) { const [name, input] = calls[step]; body = { content: [{ type: 'tool_use', id: 'tu' + turn + '_' + step, name, input }], stop_reason: 'tool_use' }; }
      else body = { content: [{ type: 'text', text: T[2] }], stop_reason: 'end_turn' };
      step++;
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    }
    return r.abort(); });
  await p.addInitScript(() => {
    localStorage.setItem('xkdg_persons_a', JSON.stringify({ Demo: { date: '1975-04-12', time: '08:30', depth: 4 } }));
    localStorage.setItem('xkdg_houses', JSON.stringify({ Demo: [{ name: 'Demo flat', address: '', houseFacing: 176, period: 9, sameFacing: true,
      floors: [{ label: 'Floor 1', facing: 176, period: 9, doors: [], settings: { water: [], bed: [], desk: [] } }] }] }));
    localStorage.setItem('xkdg_ai_area', 'fengshui');
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
  // 1) where: house card ☰ → 📏 Plan builder
  await p.evaluate(() => { const el = document.getElementById('fs-house-profiles'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); });
  await shot('c0', await box('button[onclick*="fs-hm-house-0"]'));
  await p.click('button[onclick*="fs-hm-house-0"]'); await p.clock.runFor(400);
  await shot('c1', await btnBox('XKDGPlanBuilder|Plan builder'));
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /Plan builder/.test(b.textContent) && b.offsetParent).click());
  await p.clock.runFor(600);
  await shot('c2', null);
  await p.evaluate(() => XKDGPlanBuilder.close());
  // 2) the assistant: open it full screen
  await p.evaluate(() => window.scrollTo(0, 0));
  meta.chatBtn = await p.evaluate(() => { const b = [...document.querySelectorAll('button,div')].filter(e => e.textContent.trim() === '💬' && getComputedStyle(e).position === 'fixed')[0]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await shot('c3', meta.chatBtn);
  await p.evaluate(() => XKDGChat.open()); await p.clock.runFor(500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === '⛶'); if (b) b.click(); });
  await p.clock.runFor(500);
  for (let i = 0; i < TURNS.length; i++) {
    await p.evaluate(t => { const inp = [...document.querySelectorAll('textarea,input')].find(e => /Ask something/.test(e.placeholder || '')); inp.value = t; }, TURNS[i][0]);
    if (i === 0) await shot('t0_typed', await btnBox('^\\s*Send'));
    await p.evaluate(() => XKDGChat._send());
    for (let k = 0; k < 30; k++) { await p.clock.runFor(400); const busy = await p.evaluate(() => /Thinking/.test(document.body.innerText)); if (!busy) break; }
    await p.clock.runFor(600);
    await shot('t' + (i + 1));
    if (await p.$('#xpb-modal')) {
      await shot('t' + (i + 1) + '_plan');
      await p.evaluate(() => { const m = document.getElementById('xpb-modal'); m.scrollTop = 9999; });
      await shot('t' + (i + 1) + '_plan2', await btnBox('_toFp'));
      await p.evaluate(() => XKDGPlanBuilder.close()); await p.clock.runFor(300);
    }
  }
  // floor-plan tool opened by to_floorplan
  await p.clock.runFor(1500);
  await shot('f0');
  meta.save = await btnBox('Save to house');
  fs.writeFileSync(OUT + 'meta.json', JSON.stringify(meta, null, 1));
  console.log(JSON.stringify(meta));
  await b.close();
})();

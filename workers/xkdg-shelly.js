/**
 * xkdg-shelly (v7) — Cloudflare Worker — Edu's devices (Tuoro + Vienna) + STUDENT plugs
 *
 * v7 (Edu, session 38) — STUDENTS, each with HIS OWN Shelly Cloud account:
 *   POST ?register  JSON { licence, house, label, host, key, id }   (no token needed)
 *     licence = the codeHash stored by the XKDG app (xkdg_license). It is checked
 *     against the xkdg-ai Worker (?licence). The plug is tested, then stored in KV
 *     under state:<device> together with its own Shelly host/key/id, and the answer
 *     carries a PER-DEVICE token: it opens THAT device only. Only its SHA-256 is kept.
 *   ?unregister&device=..&token=..   deletes the device and its plan.
 *   Every other call (turn / set_plan / get_plan / auto / alerts / ics) works for a
 *   student device with its own token. XKDG_TOKEN keeps working for everything.
 *   Limits: MAX_USER_DEVICES in all, MAX_PER_LICENCE per licence. Host must be
 *   shelly-*.shelly.cloud. The digest stays Edu's only (XKDG_TOKEN).
 *   KV: an index `devindex` = [{ id, owner, ev:[ts…], auto }] keeps the switch times
 *   of each student plan, so the cron reads a student's state ONLY around one of his
 *   switch times (free KV tier: 100k reads/day).
 *   BINDING (Settings -> Bindings -> Service binding): name XKDG_AI -> Worker xkdg-ai
 *   (a Worker cannot fetch another workers.dev Worker of the same account by URL).
 * Controls the aquarium-LIGHT plug of each house and can turn it on/off
 * AUTOMATICALLY at the auspicious hour, from a plan deposited by the XKDG app.
 *
 * v4 added the DIGEST endpoints, read by the Alexa skill.
 * v5 (Edu, session 28) makes a scheduled switch-on RETRY AND REPORT.
 * v6 (Edu, session 29) adds a CALENDAR SUBSCRIPTION feed:
 *     ?ics[&device=tuoro|vienna]   ->  text/calendar
 *   A live calendar the user SUBSCRIBES to ONCE in Google Calendar. For each
 *   aquarium that has a deposited plan, it carries one all-day event two days
 *   BEFORE the plan runs out ("regenerate the plan"), so no manual export is ever
 *   needed: when a new plan is deposited, the feed changes and Google re-reads it.
 *   The event UID is stable per device, so a moved end date UPDATES the same event
 *   instead of piling up duplicates.
 *
 *   The light failed to come on more than once, nothing was retried, and nothing
 *   was said. The cause was in `scheduled`: lastFire was written whether the
 *   command had succeeded or failed, and the de-dupe test looked only at ts+turn.
 *   One lost command therefore closed the slot for good, silently.
 *
 *   Now a slot is closed only when the plug has been READ BACK in the wanted
 *   state. Until then the cron keeps trying, up to MAX_ATTEMPTS and for
 *   RETRY_WINDOW_MS past the scheduled time. If it still fails, the miss is
 *   written to an alert list that the app and Alexa can read:
 *     ?get_alerts   ?clear_alerts     (also included in ?get_plan and ?status)
 *
 * ── PICK THE DEVICE ────────────────────────────────────────────────────────
 *   Every request may carry  ?device=tuoro | vienna   (default: tuoro).
 *   Old calls WITHOUT ?device still target Tuoro, so nothing breaks.
 *
 * ── YOU ALWAYS KEEP CONTROL ────────────────────────────────────────────────
 *   • Manual on/off works ANYTIME and takes precedence:  ?turn=on|off&device=..
 *   • Master switch to pause/resume automation (per device): ?auto=off|on&device=..
 *   • The app deposits/overwrites/clears the plan:  ?set_plan | ?clear_plan (&device=..)
 *
 * ── SECRETS (Cloudflare -> Settings -> Variables & Secrets, type "Secret") ─
 *   SHELLY_KEY, SHELLY_HOST            shared (same Shelly cloud account)
 *   SHELLY_ID, SHELLY_ID_DEC          Tuoro plug id (hex, and optional decimal)
 *   SHELLY_ID_VIENNA, SHELLY_ID_VIENNA_DEC   Vienna plug id
 *   XKDG_TOKEN                        required — every request needs ?token=.. matching it
 *
 * ── KV BINDING ─── bind a KV namespace to the variable name:  XKDG_KV
 *     State per device under  state:tuoro / state:vienna. Digest on its own key.
 *
 * ── CRON TRIGGER ── add:  * * * * *   (every minute)
 *
 * ── PLAN FORMAT (POST body to ?set_plan) ──────────────────────────────────
 *   { "days": [ { "date":"2026-07-07", "onTs": 1783405920000, "offTs": 1783443600000 }, ... ] }
 *   onTs / offTs are epoch MILLISECONDS in UTC (the app computes them, incl. DST).
 *
 * ── DIGEST ────────────────────────────────────────────────────────────────
 *   ?set_digest (POST JSON) | ?get_digest | ?clear_digest
 *   Not per device: it follows the PERSON. The Worker never computes it.
 *
 * Each plug is the aquarium LIGHT only. Pump/filter stay on a normal socket, always on.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const FIRE_WINDOW_MS = 90 * 1000; // act if "now" is within 90s of a scheduled time

// ── RETRIES (v5) ───────────────────────────────────────────────────────────
const RETRY_WINDOW_MS = 20 * 60 * 1000;   // keep trying for 20 min past the scheduled time
const MAX_ATTEMPTS    = 10;               // and never more than this many times
const MAX_ALERTS      = 30;               // how many past misses to keep

// What the plug reports back. Gen1 answers with relays[], Gen3 with "switch:0".
// When neither can be parsed we do NOT pretend to know: null means "unverified",
// and the command's own ok is used instead of inventing a state.
function relayIsOn(statusData) {
  try {
    const ds = statusData && statusData.data && statusData.data.device_status;
    if (!ds) return null;
    if (Array.isArray(ds.relays) && ds.relays.length && typeof ds.relays[0].ison === 'boolean') return ds.relays[0].ison;
    const sw = ds['switch:0'];
    if (sw && typeof sw.output === 'boolean') return sw.output;
    return null;
  } catch (e) { return null; }
}

const DIGEST_KEY = 'digest';

// ── STUDENT DEVICES (v7) ───────────────────────────────────────────────────
const INDEX_KEY        = 'devindex';
const MAX_USER_DEVICES = 60;
const MAX_PER_LICENCE  = 5;
const HOST_RE          = /^shelly-[a-z0-9-]+\.shelly\.cloud$/;
const AI_URL_DEFAULT   = 'https://xkdg-ai.decumano16.workers.dev';

function hex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(t) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t)))); }
function randHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); }

async function getIndex(env) {
  try { const raw = env.XKDG_KV ? await env.XKDG_KV.get(INDEX_KEY) : null; const a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
async function putIndex(env, a) { if (env.XKDG_KV) await env.XKDG_KV.put(INDEX_KEY, JSON.stringify(a)); }
// The switch times of a plan, kept in the index (only the ones still to come or just past).
function planEvents(s) {
  const now = Date.now(), out = [];
  for (const d of (s.plan && s.plan.days) || []) for (const t of [d.onTs, d.offTs]) if (Number.isFinite(+t) && +t > now - RETRY_WINDOW_MS) out.push(+t);
  return out.sort((a, b) => a - b);
}
async function indexSync(env, id, s) {
  const idx = await getIndex(env);
  const e = idx.find(x => x.id === id); if (!e) return;
  e.ev = planEvents(s); e.auto = s.auto !== false;
  await putIndex(env, idx);
}
// Ask the xkdg-ai Worker whether a licence hash is valid. Service binding first.
async function licenceOk(env, hash) {
  const req = (base) => new Request(base.replace(/\/+$/, '') + '/?licence', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hash }) });
  try {
    const res = env.XKDG_AI ? await env.XKDG_AI.fetch(req(AI_URL_DEFAULT)) : await fetch(req(env.XKDG_AI_URL || AI_URL_DEFAULT));
    const j = await res.json().catch(() => null);
    if (!j) return { ok: false, reason: 'licence server HTTP ' + res.status };
    return j.ok ? { ok: true } : { ok: false, reason: j.reason || j.error || 'licence not valid' };
  } catch (e) { return { ok: false, reason: 'licence server unreachable' }; }
}
const DIGEST_MAX_CHARS = 64 * 1024;

// Device registry: which secret holds each plug's id, and where its state lives.
const DEVICES = {
  tuoro:  { label: 'Acquario Tuoro',  idKey: 'SHELLY_ID',        decKey: 'SHELLY_ID_DEC',        stateKey: 'state:tuoro',  legacyKey: 'state' },
  vienna: { label: 'Acquario Vienna', idKey: 'SHELLY_ID_VIENNA', decKey: 'SHELLY_ID_VIENNA_DEC', stateKey: 'state:vienna', legacyKey: null },
};
const DEVICE_NAMES = Object.keys(DEVICES);
function resolveDevice(p) {
  const d = String(p.device || 'tuoro').toLowerCase();
  if (DEVICES[d]) return d;
  if (/^u[0-9a-f]{10}$/.test(d)) return d;                    // student device (v7)
  return 'tuoro';
}
function isUser(dev) { return !DEVICES[dev]; }
// Connection of a device: Edu's from the secrets, a student's from his stored state.
function conn(env, dev, s) {
  if (isUser(dev)) { const c = (s && s.conn) || {}; return { host: c.host, key: c.key, id: c.id, dec: null }; }
  return { host: String(env.SHELLY_HOST || '').replace(/^https?:\/\//, '').replace(/\/+$/, ''), key: env.SHELLY_KEY,
           id: env[DEVICES[dev].idKey], dec: env[DEVICES[dev].decKey] };
}
function deviceConfigured(env, dev, s) { const c = conn(env, dev, s); return !!(c.host && c.key && c.id); }
function deviceLabel(dev, s) { return isUser(dev) ? ((s && s.conn && s.conn.label) || 'Acquario') : DEVICES[dev].label; }

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function readParams(request) {
  const url = new URL(request.url);
  const p = Object.fromEntries(url.searchParams.entries());
  if (request.method === 'POST') {
    try {
      const ct = request.headers.get('content-type') || '';
      if (ct.includes('application/json')) Object.assign(p, { _body: await request.json() });
      else { const t = await request.text(); new URLSearchParams(t).forEach((v, k) => { p[k] = v; }); }
    } catch (e) { /* ignore */ }
  }
  return p;
}

function stateKey(dev) { return DEVICES[dev] ? DEVICES[dev].stateKey : ('state:' + dev); }
async function getState(env, dev) {
  const cfg = DEVICES[dev] || { stateKey: stateKey(dev), legacyKey: null };
  try {
    let raw = env.XKDG_KV ? await env.XKDG_KV.get(cfg.stateKey) : null;
    if (raw == null && cfg.legacyKey && env.XKDG_KV) raw = await env.XKDG_KV.get(cfg.legacyKey);
    const s = raw ? JSON.parse(raw) : {};
    if (typeof s.auto !== 'boolean') s.auto = true;
    if (!s.plan || !Array.isArray(s.plan.days)) s.plan = { days: [] };
    if (!Array.isArray(s.alerts)) s.alerts = [];
    return s;
  } catch (e) { return { auto: true, plan: { days: [] }, alerts: [] }; }
}
async function putState(env, dev, s) {
  if (env.XKDG_KV) await env.XKDG_KV.put(stateKey(dev), JSON.stringify(s));
  if (isUser(dev)) await indexSync(env, dev, s);
}

async function getDigest(env) {
  try {
    const raw = env.XKDG_KV ? await env.XKDG_KV.get(DIGEST_KEY) : null;
    if (!raw) return null;
    const d = JSON.parse(raw);
    return (d && typeof d === 'object') ? d : null;
  } catch (e) { return null; }
}
async function putDigest(env, d) {
  if (env.XKDG_KV) await env.XKDG_KV.put(DIGEST_KEY, JSON.stringify(d));
}
function digestAgeDays(d) {
  const t = d && +d.savedAt;
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

// ── CALENDAR FEED (v6) ──────────────────────────────────────────────────────
// Two days before an aquarium plan runs out, warn in a calendar the user
// subscribes to once. All-day event (so it shows even where subscribed-feed
// alarms are ignored) with a best-effort 09:00 VALARM as well.
const ICS_REMIND_DAYS_BEFORE = 2;
function pad2(n) { return String(n).padStart(2, '0'); }
function icsDate(y, m, d) { return String(y) + pad2(m + 1) + pad2(d); }       // YYYYMMDD (all-day)
function icsStamp(ms) {
  const dt = new Date(ms);
  return dt.getUTCFullYear() + pad2(dt.getUTCMonth() + 1) + pad2(dt.getUTCDate())
       + 'T' + pad2(dt.getUTCHours()) + pad2(dt.getUTCMinutes()) + pad2(dt.getUTCSeconds()) + 'Z';
}
function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function icsFold(line) {                                       // RFC 5545: fold at 75 octets
  if (line.length <= 73) return line;
  let out = line.slice(0, 73), rest = line.slice(73);
  while (rest.length > 72) { out += '\r\n ' + rest.slice(0, 72); rest = rest.slice(72); }
  return out + '\r\n ' + rest;
}
// End of a device's plan = the latest offTs. The off is ~23:00 civil (CET/CEST),
// which is 21:00-22:00 UTC of the SAME calendar day, so the UTC date of offTs is
// the plan's end date without needing the local offset.
function planEndInfo(s) {
  const days = (s && s.plan && Array.isArray(s.plan.days)) ? s.plan.days : [];
  let end = 0;
  for (const d of days) { if (d && Number.isFinite(+d.offTs) && +d.offTs > end) end = +d.offTs; }
  if (!end) return null;
  const e = new Date(end);
  return { endTs: end, y: e.getUTCFullYear(), m: e.getUTCMonth(), d: e.getUTCDate() };
}
function icsPlanEndEvent(dev, info, nowStamp, label) {
  const remind = new Date(Date.UTC(info.y, info.m, info.d - ICS_REMIND_DAYS_BEFORE));   // all-day, 2 days before
  const next   = new Date(Date.UTC(info.y, info.m, info.d - ICS_REMIND_DAYS_BEFORE + 1));
  const endStr = icsDate(info.y, info.m, info.d);
  const name   = label || deviceLabel(dev);                          // "Acquario Tuoro" / "Acquario Vienna"
  const L = [];
  L.push('BEGIN:VEVENT');
  L.push('UID:xkdg-planend-' + dev + '@fsadvisor.org');       // stable -> feed UPDATES, never duplicates
  L.push('DTSTAMP:' + nowStamp);
  L.push('DTSTART;VALUE=DATE:' + icsDate(remind.getUTCFullYear(), remind.getUTCMonth(), remind.getUTCDate()));
  L.push('DTEND;VALUE=DATE:'   + icsDate(next.getUTCFullYear(),   next.getUTCMonth(),   next.getUTCDate()));
  L.push(icsFold('SUMMARY:' + icsEsc('\uD83D\uDC1F ' + name + ' \u2014 fra ' + ICS_REMIND_DAYS_BEFORE + ' giorni finisce la programmazione (rigenera)')));
  L.push(icsFold('DESCRIPTION:' + icsEsc('Il piano di accensione dell\u2019' + name.toLowerCase() + ' termina il ' + endStr.slice(0,4) + '-' + endStr.slice(4,6) + '-' + endStr.slice(6,8) + '. Rigeneralo per i giorni successivi.')));
  L.push('TRANSP:TRANSPARENT');
  L.push('BEGIN:VALARM');
  L.push('ACTION:DISPLAY');
  L.push(icsFold('DESCRIPTION:' + icsEsc('Fra ' + ICS_REMIND_DAYS_BEFORE + ' giorni finisce la programmazione dell\u2019' + name.toLowerCase() + ' \u2014 rigenera il piano')));
  L.push('TRIGGER:PT9H');                                     // 09:00 on the reminder day (best-effort on subscribed feeds)
  L.push('END:VALARM');
  L.push('END:VEVENT');
  return L;
}
async function buildIcs(env, onlyDev) {
  const nowStamp = icsStamp(Date.now());
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//XKDG//Aquarium Plan//EN',
             'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:XKDG \u2014 Acquari',
             'X-PUBLISHED-TTL:PT6H', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H'];
  const devs = onlyDev === '-' ? [] : onlyDev ? [onlyDev] : DEVICE_NAMES;
  for (const dev of devs) {
    const s = await getState(env, dev);
    if (!deviceConfigured(env, dev, s)) continue;
    const info = planEndInfo(s);
    if (!info) continue;
    for (const line of icsPlanEndEvent(dev, info, nowStamp, deviceLabel(dev, s))) L.push(line);
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}

async function shellyDo(host, key, id, path, extraBody) {
  const endpoint = `https://${host}${path}?auth_key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`;
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
  if (extraBody) opts.body = new URLSearchParams(extraBody).toString();
  const res = await fetch(endpoint, opts);
  let data = null;
  try { data = await res.json(); } catch (e) { data = { raw: await res.text().catch(() => '') }; }
  return { httpStatus: res.status, ok: res.ok && data && data.isok !== false, data };
}

async function control(env, turn, channel, dev, s) {
  const c = conn(env, dev, s);
  const body = { channel: String(channel || 0), turn };
  let r = await shellyDo(c.host, c.key, c.id, '/device/relay/control', body);
  let used = 'hex';
  if (!r.ok && c.dec) { r = await shellyDo(c.host, c.key, c.dec, '/device/relay/control', body); used = 'decimal'; }
  return { ...r, id_format_used: used };
}
async function status(env, dev, s) {
  const c = conn(env, dev, s);
  let r = await shellyDo(c.host, c.key, c.id, '/device/status', null);
  if (!r.ok && c.dec) r = await shellyDo(c.host, c.key, c.dec, '/device/status', null);
  return r;
}

// ── v7: register / unregister a student plug ────────────────────────────────
async function register(env, b) {
  b = b || {};
  const lic = String(b.licence || '').trim().toLowerCase();
  const host = String(b.host || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[\/:].*$/, '');
  const key = String(b.key || '').trim(), id = String(b.id || '').trim().toLowerCase();
  const house = String(b.house || '').trim().slice(0, 60), label = String(b.label || 'Aquarium').trim().slice(0, 40);
  if (!/^[0-9a-f]{64}$/.test(lic)) return json({ ok: false, error: 'No valid XKDG licence on this phone.' }, 400);
  if (!HOST_RE.test(host)) return json({ ok: false, error: 'The server must look like shelly-123-eu.shelly.cloud (Shelly app → Authorization cloud key).' }, 400);
  if (key.length < 20) return json({ ok: false, error: 'The Authorization cloud key looks too short.' }, 400);
  if (!/^[0-9a-f]{6,16}$/.test(id)) return json({ ok: false, error: 'The Device ID should be 6-16 letters/digits (0-9, a-f), e.g. a0b765c3d2e4.' }, 400);
  if (!house) return json({ ok: false, error: 'House name missing.' }, 400);
  if (!env.XKDG_KV) return json({ ok: false, error: 'Server not ready (KV missing).' }, 500);

  const L = await licenceOk(env, lic);
  if (!L.ok) return json({ ok: false, error: 'XKDG licence not accepted: ' + L.reason }, 403);

  const owner = await sha256('owner:' + lic);
  let idx = await getIndex(env);
  // Same licence + same house = re-connection: the old device is replaced.
  const houseKey = house.toLowerCase();
  const prev = idx.filter(x => x.owner === owner && x.house === houseKey);
  if (idx.length - prev.length >= MAX_USER_DEVICES) return json({ ok: false, error: 'The XKDG server is full (' + MAX_USER_DEVICES + ' plugs). Ask Edu.' }, 429);
  if (idx.filter(x => x.owner === owner).length - prev.length >= MAX_PER_LICENCE) return json({ ok: false, error: 'At most ' + MAX_PER_LICENCE + ' plugs per licence.' }, 429);

  // Test the plug with the student's own account before storing anything.
  const probe = { conn: { host, key, id, label } };
  let st;
  try { st = await shellyDo(host, key, id, '/device/status', null); } catch (e) { st = { ok: false, httpStatus: 0, data: null }; }
  if (!st.ok) {
    const msg = (st.data && st.data.errors) ? JSON.stringify(st.data.errors) : ('HTTP ' + st.httpStatus);
    return json({ ok: false, error: 'Shelly Cloud refused: ' + msg + '. Check server, key and Device ID.' }, 502);
  }

  const dev = 'u' + randHex(5);
  const token = randHex(24);
  const s = { auto: true, plan: { days: [] }, alerts: [], conn: probe.conn,
              tokenHash: await sha256(token), owner, house: houseKey, createdAt: Date.now() };
  for (const p of prev) { try { await env.XKDG_KV.delete(stateKey(p.id)); } catch (e) {} }
  idx = idx.filter(x => !prev.includes(x));
  idx.push({ id: dev, owner, house: houseKey, ev: [], auto: true });
  await env.XKDG_KV.put(stateKey(dev), JSON.stringify(s));
  await putIndex(env, idx);
  return json({ ok: true, action: 'register', device: dev, token, label, replaced: prev.length || undefined,
                online: st.data && st.data.data ? st.data.data.online : undefined, relay_on: relayIsOn(st.data) });
}
async function unregister(env, dev) {
  try { await env.XKDG_KV.delete(stateKey(dev)); } catch (e) {}
  const idx = await getIndex(env);
  await putIndex(env, idx.filter(x => x.id !== dev));
  return json({ ok: true, action: 'unregister', device: dev });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const missing = ['SHELLY_KEY', 'SHELLY_HOST', 'SHELLY_ID', 'XKDG_TOKEN'].filter(k => !env[k]);
    if (missing.length) return json({ error: 'Not configured. Missing secrets: ' + missing.join(', ') }, 500);

    const p = await readParams(request);
    if (p.register !== undefined) return register(env, p._body);

    // Edu's token opens everything; a student token opens only its own device.
    const admin = !!p.token && p.token === env.XKDG_TOKEN;
    let userState = null;
    if (!admin) {
      const d = String(p.device || '').toLowerCase();
      if (!p.token || !isUser(d) || !/^u[0-9a-f]{10}$/.test(d)) return json({ error: 'Unauthorized (bad or missing token).' }, 401);
      userState = await getState(env, d);
      if (!userState.tokenHash || userState.tokenHash !== await sha256(p.token)) return json({ error: 'Unauthorized (bad or missing token).' }, 401);
      if (p.set_digest !== undefined || p.clear_digest !== undefined || p.get_digest !== undefined)
        return json({ error: 'The digest is not available for this device.' }, 403);
    }
    if (p.unregister !== undefined) {
      const d = String(p.device || '').toLowerCase();
      if (!isUser(d)) return json({ error: 'Only a student plug can be unregistered.' }, 400);
      return unregister(env, d);
    }

    // DIGEST — before the device is resolved: it belongs to the person, not a plug.
    if (p.set_digest !== undefined) {
      const body = p._body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return json({ error: 'set_digest expects a JSON object body.' }, 400);
      }
      const hours = Array.isArray(body.hours) ? body.hours : [];
      const dirs  = Array.isArray(body.directions) ? body.directions : [];
      const d = {
        savedAt: Date.now(),
        from: body.from ? String(body.from) : null,
        days: Number.isFinite(+body.days) ? +body.days : null,
        person: body.person ? String(body.person) : null,
        purpose: body.purpose ? String(body.purpose) : null,
        xkdg_min: Number.isFinite(+body.xkdg_min) ? +body.xkdg_min : null,
        direction_min: Number.isFinite(+body.direction_min) ? +body.direction_min : null,
        hours, directions: dirs,
      };
      const txt = JSON.stringify(d);
      if (txt.length > DIGEST_MAX_CHARS) {
        return json({ error: 'Digest too large (' + txt.length + ' chars, max ' + DIGEST_MAX_CHARS + ').' }, 413);
      }
      await putDigest(env, d);
      return json({ action: 'set_digest', ok: true, stored_hours: hours.length,
                    stored_directions: dirs.length, savedAt: d.savedAt, bytes: txt.length });
    }

    if (p.clear_digest !== undefined) {
      await putDigest(env, { savedAt: Date.now(), from: null, days: null, person: null,
                             purpose: null, xkdg_min: null, direction_min: null,
                             hours: [], directions: [] });
      return json({ action: 'clear_digest', ok: true });
    }

    if (p.get_digest !== undefined) {
      const d = await getDigest(env);
      if (!d) return json({ action: 'get_digest', digest: null, note: 'No digest has ever been deposited.' });
      return json({ action: 'get_digest', age_days: digestAgeDays(d), digest: d,
                    note: 'Deposited by the app; never recomputed here. Check age_days and say when it is stale.' });
    }

    // CALENDAR SUBSCRIPTION feed (v6) — spans BOTH aquariums by default, so the user
    // subscribes to it ONCE. Optional ?device= limits it to one. Read-only; served as
    // text/calendar so Google Calendar can subscribe by URL and re-read on its own.
    if (p.ics !== undefined) {
      const only = p.device ? resolveDevice(p) : (admin ? null : '-');
      const ics = await buildIcs(env, only);
      return new Response(ics, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'inline; filename="xkdg-acquari.ics"',
          'Cache-Control': 'no-cache',
          ...CORS,
        },
      });
    }

    const dev = resolveDevice(p);
    if (isUser(dev) && !userState) userState = await getState(env, dev);
    if (!deviceConfigured(env, dev, userState)) {
      return json({ error: isUser(dev) ? `Device "${dev}" is not registered (connect the plug again in the app).`
                                       : `Device "${dev}" is not configured. Add the secret ${DEVICES[dev].idKey} in Cloudflare.`, device: dev }, isUser(dev) ? 404 : 500);
    }
    const channel = (p.channel != null && p.channel !== '') ? (parseInt(p.channel, 10) || 0) : 0;

    if (p.auto === 'on' || p.auto === 'off') {
      const s = await getState(env, dev); s.auto = (p.auto === 'on'); await putState(env, dev, s);
      return json({ action: 'auto', device: dev, automation: s.auto ? 'ENABLED' : 'PAUSED' });
    }

    if (p.set_plan !== undefined) {
      const body = p._body;
      if (!body || !Array.isArray(body.days)) return json({ error: 'set_plan expects JSON body { days:[{date,onTs,offTs}] }.', device: dev }, 400);
      const days = body.days
        .filter(d => d && d.date && Number.isFinite(+d.onTs) && Number.isFinite(+d.offTs))
        .map(d => ({ date: String(d.date), onTs: +d.onTs, offTs: +d.offTs }));
      const s = await getState(env, dev); s.plan = { days: days, savedAt: Date.now() }; await putState(env, dev, s);
      return json({ action: 'set_plan', device: dev, stored_days: days.length, plan: s.plan });
    }

    // The record of what did NOT happen. Read by the app on opening and by Alexa
    // when asked for the status, so a missed hour is never discovered by chance.
    if (p.get_alerts !== undefined) {
      const s = await getState(env, dev);
      return json({ action: 'get_alerts', device: dev, alerts: s.alerts || [],
                    count: (s.alerts || []).length,
                    note: (s.alerts || []).length
                      ? 'These switch-ons or switch-offs never happened despite the retries. Say so plainly, with date and hour.'
                      : 'Nothing has been missed.' });
    }
    if (p.clear_alerts !== undefined) {
      const s = await getState(env, dev); s.alerts = []; await putState(env, dev, s);
      return json({ action: 'clear_alerts', device: dev, ok: true });
    }

    if (p.clear_plan !== undefined) {
      const s = await getState(env, dev); s.plan = { days: [] }; await putState(env, dev, s);
      return json({ action: 'clear_plan', device: dev, ok: true });
    }

    if (p.get_plan !== undefined) {
      const s = await getState(env, dev);
      return json({ action: 'get_plan', device: dev, automation: s.auto ? 'ENABLED' : 'PAUSED',
                    plan: s.plan, lastFire: s.lastFire || null,
                    alerts: (s.alerts || []).slice(0, 5),
                    alerts_total: (s.alerts || []).length,
                    alerts_note: (s.alerts || []).length
                      ? 'These switch-ons or switch-offs never happened. Tell the user plainly, with date and hour.'
                      : undefined });
    }

    const turn = String(p.turn || '').toLowerCase();
    if (turn === 'status' || turn === '') {
      const s = await getState(env, dev);
      const r = await status(env, dev, s);
      return json({ action: 'status', device: dev, automation: s.auto ? 'ENABLED' : 'PAUSED',
                    online: r.data && r.data.data ? r.data.data.online : undefined,
                    relay_on: relayIsOn(r.data),
                    lastFire: s.lastFire || null,
                    alerts: (s.alerts || []).slice(0, 5),
                    alerts_total: (s.alerts || []).length,
                    result: r.data }, r.ok ? 200 : 502);
    }

    if (turn !== 'on' && turn !== 'off') return json({ error: "turn must be on, off, or status.", device: dev }, 400);
    const r = await control(env, turn, channel, dev, userState);
    return json({ action: 'manual', device: dev, turn, channel, ok: r.ok, id_format_used: r.id_format_used, result: r.data }, r.ok ? 200 : 502);
  },

  // ── CRON: fires each device's plan, RETRIES until verified, and records misses ─
  async scheduled(event, env, ctx) {
    if (!env.SHELLY_KEY || !env.SHELLY_HOST) return;
    const now = Date.now();
    // Student plugs are read only when one of their switch times is near (v7).
    let users = [];
    try {
      users = (await getIndex(env)).filter(x => x.auto !== false && Array.isArray(x.ev) &&
        x.ev.some(t => (t - now) <= FIRE_WINDOW_MS && (now - t) <= RETRY_WINDOW_MS)).map(x => x.id);
    } catch (e) {}
    for (const dev of DEVICE_NAMES.concat(users)) {
      try {
        const s = await getState(env, dev);
        if (!deviceConfigured(env, dev, s)) continue;
        if (!s.auto) continue;

        // A slot stays open until it has been achieved, so a scheduled time is
        // reachable for the whole retry window, not only for the 90 s fire window.
        let target = null;
        for (const d of s.plan.days) {
          for (const cand of [{ ts: d.onTs, turn: 'on' }, { ts: d.offTs, turn: 'off' }]) {
            if (!Number.isFinite(cand.ts)) continue;
            const late = now - cand.ts;
            const inWindow = (Math.abs(late) <= FIRE_WINDOW_MS) || (late > 0 && late <= RETRY_WINDOW_MS);
            if (!inWindow) continue;
            if (!target || Math.abs(now - cand.ts) < Math.abs(now - target.ts)) target = cand;
          }
        }
        if (!target) continue;

        const slotId = target.ts + '|' + target.turn;
        const lf = s.lastFire || {};
        if (lf.slotId === slotId && lf.done) continue;            // already achieved
        const att = (lf.slotId === slotId) ? (lf.attempts || 0) : 0;
        if (att >= MAX_ATTEMPTS) continue;                        // given up; the alert is recorded

        const r = await control(env, target.turn, 0, dev, s);

        // Did it actually happen? Read the plug back rather than trusting the call.
        let verified = null;
        try {
          const st = await status(env, dev, s);
          const isOn = relayIsOn(st.data);
          if (isOn !== null) verified = (target.turn === 'on') ? isOn : !isOn;
        } catch (e) { /* verification is a bonus, never a blocker */ }

        const achieved = (verified === true) || (verified === null && r.ok);
        s.lastFire = { slotId, ts: target.ts, turn: target.turn, at: now,
                       attempts: att + 1, ok: r.ok, verified, done: achieved };

        if (!achieved) {
          const outOfTime = (now - target.ts) > RETRY_WINDOW_MS;
          if (outOfTime || (att + 1) >= MAX_ATTEMPTS) {
            s.alerts = Array.isArray(s.alerts) ? s.alerts : [];
            s.alerts.unshift({
              at: now, scheduledTs: target.ts, turn: target.turn, attempts: att + 1,
              reason: (verified === false) ? 'the plug did not change state'
                    : (!r.ok ? ('the command failed (HTTP ' + r.httpStatus + ')') : 'unverified'),
            });
            s.alerts = s.alerts.slice(0, MAX_ALERTS);
            s.lastFire.attempts = MAX_ATTEMPTS;                   // stop retrying this slot
          }
        }
        await putState(env, dev, s);
      } catch (e) { /* never throw from scheduled; keep looping the other device */ }
    }
  },
};
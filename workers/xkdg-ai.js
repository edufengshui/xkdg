// =====================================================================
//  Cloudflare Worker:  xkdg-ai
//  Proxies the XKDG chat to the Anthropic Messages API.
//   • Forces the MODEL: default MODEL for students, per-licence "m" override (session 51).
//   • Adds PROMPT CACHING on the big, static system prompt + tools, so the
//     repeated calls in one conversation are much cheaper.
//   • Keeps the Anthropic key server-side (Worker secret) — never in the app.
//   • NEW (per-student counter): reads the X-Student-Id header the app sends
//     and accumulates token usage per student per month into KV, so Edu can
//     see who consumes what. All additive and wrapped in try/catch — if KV is
//     missing or fails, the chat keeps working exactly as before.
//
//  v-session29 (Edu): prompt caching now ALSO covers the conversation history
//  (a breakpoint on the second-to-last message), so the messages become
//  cache-read (0.10x) instead of fresh (1x). This is the big cost fix — the
//  history was being re-sent at full price on every turn.
//
//  Deploy: Workers dashboard → xkdg-ai → Edit code → replace ALL the code
//  with this → Deploy.  No change needed in the app.
//  To switch the students' model, edit MODEL and redeploy; per person use "m" in LICENCES.
//
//  v-session49: secrets moved to env (STATS_TOKEN, LICENCES) — see SECRETS below —
//  and a DAILY LIMIT per licence (DAILY_CAP_USD).
//
//  REQUIRES (for the counter only): a KV namespace bound as  XKDG_KV
//  (Settings → Bindings → KV Namespace → Variable name XKDG_KV).
//  Without it, the counter silently does nothing and the proxy still works.
// =====================================================================

// ── SECRETS (session 49) ─────────────────────────────────────────────
// This file is kept in the PUBLIC repo edufengshui/xkdg (workers/xkdg-ai.js), so NOTHING
// private lives in the code any more. Two Worker secrets (Settings → Variables and
// Secrets → Add → type Secret):
//   STATS_TOKEN  the password of the usage page   (…/?stats&token=<STATS_TOKEN>)
//   LICENCES     JSON array, one object per licence code:
//                {"h":"<sha256 of the PIN>","t":0,"e":null,"n":"Raymond","d":1,"ai":2}
//                  t    = Chinese years the licence opens (0 = unlimited)
//                  e    = date the licence lapses (null = never)
//                  dmax = optional hard cap on the last usable date
//                  d    = 1 → also opens 🧭 Directions / Travel Planner (session 37)
//                  ai   = daily AI budget in USD for this licence (absent → DAILY_CAP_USD,
//                         0 → no limit)
//                  m    = optional model for this licence: "opus", "sonnet" or a full id
//                         (session 51; absent → MODEL)
//                  old  = 1 → a retired code: kept ONLY so past months show a name; it
//                         does NOT unlock the app
//                To revoke somebody: delete their object from LICENCES and save. Nothing to
//                push, nothing for them to do.
// Why secrets: a 4-digit PIN is only 10.000 candidates, so ANY hash (even a 12-character
// prefix) published on GitHub gives every code back in a fraction of a second.
// Also needed: the Anthropic key secret (ANTHROPIC_API_KEY or one of the names below) and
// the KV binding XKDG_KV (Settings → Bindings).

function licences(env) {
  try {
    const a = JSON.parse((env && env.LICENCES) || '[]');
    return Array.isArray(a) ? a.filter(c => c && typeof c.h === 'string') : [];
  } catch (e) { return []; }
}
function statsToken(env) { return String((env && env.STATS_TOKEN) || ''); }

// ── DAILY AI LIMIT PER LICENCE (session 49) ──────────────────────────
// Each licence (= X-Student-Id) may spend at most this much per day on the chat, counted
// in ESTIMATED USD (same RATE as the usage page). Counting money rather than raw tokens is
// deliberate: with ~98 % of the input read from cache, raw tokens look huge but cost a
// tenth; dollars follow what the Console actually bills.
// Per-licence override: "ai" in LICENCES. Requests without the header ("anon") and
// unknown ids share the default. The day is the Italian civil day (Europe/Rome).
// The check runs BEFORE the call, so the last request of the day can go a little over.
const DAILY_CAP_USD = 1.00;
const DAY_TZ = 'Europe/Rome';

function dayKey(d) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: DAY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date()); }
  catch (e) { return (d || new Date()).toISOString().slice(0, 10); }
}
function capFor(env, sid) {
  const hit = sid ? licences(env).find(c => c.h === sid) : null;
  if (hit && hit.ai != null && isFinite(Number(hit.ai))) return Number(hit.ai);
  return DAILY_CAP_USD;
}
// Minutes until the next midnight in DAY_TZ (for the message).
function minutesToMidnight() {
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: DAY_TZ, hour: '2-digit', minute: '2-digit', hour12: false })
      .format(new Date()).split(':');
    return Math.max(1, 24 * 60 - (Number(p[0]) % 24) * 60 - Number(p[1]));
  } catch (e) { return null; }
}

// Guessing brake: at most TRIES failed attempts per IP within WINDOW_MIN minutes.
// Successful unlocks never count. Stored in KV under rl:<ip>. With no KV bound the
// brake silently does nothing rather than locking everybody out.
const LICENCE_RATE = { TRIES: 5, WINDOW_MIN: 10 };

// Prompt-cache lifetime: '1h' (extended) or '5m' (standard).
const CACHE_TTL = '1h';

// ── MODEL PER LICENCE (session 51) ───────────────────────────────────
// Students get MODEL (the default). A licence can ask for another model with the field
// "m" in LICENCES: "m":"opus" → Opus 5.5 (Edu), "m":"sonnet" → Sonnet 5.5, or a full
// model id such as "m":"claude-sonnet-4-6". Without "m" the licence uses MODEL.
const MODEL = 'claude-sonnet-5-5';          // <-- default model (students)
const MODEL_ALIASES = {
  opus:   'claude-opus-5-5',
  sonnet: 'claude-sonnet-5-5'
};
const MAX_TOKENS_FALLBACK = 1024;           // used only if the app omits it
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Simpler alternative that does NOT require rewriting LICENCES: a plain Worker variable
// OPUS_FOR = names (the "n" of the licence, comma-separated, case ignored), e.g. "Edu".
function modelFor(env, sid) {
  const hit = sid ? licences(env).find(c => c.h === sid && !c.old) : null;
  let m = hit && typeof hit.m === 'string' ? hit.m.trim() : '';
  if (!m && hit && hit.n && env && env.OPUS_FOR) {
    const names = String(env.OPUS_FOR).split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    if (names.indexOf(String(hit.n).trim().toLowerCase()) >= 0) m = 'opus';
  }
  if (!m) return MODEL;
  return MODEL_ALIASES[m.toLowerCase()] || m;
}

// Rough cost estimate, USD per single token (Anthropic bills in USD), ONE TABLE PER MODEL.
// Per 1M tokens: in = uncached input, out = output, cr = cache read,
// cw = cache write with the 1-hour TTL used here (2x input).
// The raw token counts stored in KV are the source of truth; `cost` is only
// a convenience number so Edu can eyeball dollars per student. Check the rates on
// Anthropic's pricing page when a model changes.
const RATES = {
  'claude-opus-5-5':   { in: 4.00, out: 20.00, cr: 0.20, cw: 8.00 },
  'claude-sonnet-5-5': { in: 2.00, out: 10.00, cr: 0.20, cw: 4.00 },
  'claude-sonnet-4-6': { in: 3.00, out: 15.00, cr: 0.30, cw: 6.00 }
};
function rateFor(model) {
  const m = String(model || '');
  const key = Object.keys(RATES).find(k => m === k || m.indexOf(k) === 0) || MODEL;
  const r = RATES[key] || RATES['claude-sonnet-5-5'];
  return { in: r.in / 1e6, out: r.out / 1e6, cr: r.cr / 1e6, cw: r.cw / 1e6 };
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // X-Student-Id ADDED — without it the browser blocks every call that
    // carries the per-student header (that was breaking the live chat).
    'Access-Control-Allow-Headers': 'Content-Type, X-Student-Id',
    'Access-Control-Max-Age': '86400'
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
  });
}

// ---- Per-student usage counter -------------------------------------
// Monthly bucket per student:  key = "u:<student-id>:<YYYY-MM>".
// The monthly key means a quota reset (next step) is just "new month = 0".
// Note: KV is last-write-wins, so two calls landing in the very same instant
// could lose one increment. That is fine for cost visibility (this is not a
// billing ledger). We run this in ctx.waitUntil so it never delays the reply.
async function bumpUsage(env, sid, u, model) {
  const RATE = rateFor(model);
  if (!env || !env.XKDG_KV) return;                 // no KV bound yet → no-op
  if (!sid) sid = 'anon';                            // header absent → bucket it
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);          // "2026-07"
  const key = 'u:' + sid + ':' + ym;

  let rec = null;
  try { rec = await env.XKDG_KV.get(key, 'json'); } catch (e) { rec = null; }
  if (!rec || typeof rec !== 'object') {
    rec = { sid: sid, ym: ym, req: 0, in: 0, out: 0, cw: 0, cr: 0,
            cost: 0, first: now.toISOString(), last: null };
  }

  const inp = u.input_tokens || 0;
  const out = u.output_tokens || 0;
  const cw  = u.cache_creation_input_tokens || 0;
  const cr  = u.cache_read_input_tokens || 0;

  rec.req  += 1;
  rec.in   += inp;
  rec.out  += out;
  rec.cw   += cw;
  rec.cr   += cr;
  rec.cost += inp * RATE.in + out * RATE.out + cw * RATE.cw + cr * RATE.cr;
  rec.cost  = Math.round(rec.cost * 1e6) / 1e6;      // trim float noise
  rec.last  = now.toISOString();

  // Session 49: today's spend, kept INSIDE the monthly record so each call still costs
  // one KV read + one KV write (the free KV plan allows 1000 writes a day).
  const dk = dayKey(now);
  const callCost = inp * RATE.in + out * RATE.out + cw * RATE.cw + cr * RATE.cr;
  if (!rec.day || rec.day.d !== dk) rec.day = { d: dk, req: 0, cost: 0 };
  rec.day.req  += 1;
  rec.day.cost  = Math.round((rec.day.cost + callCost) * 1e6) / 1e6;

  try { await env.XKDG_KV.put(key, JSON.stringify(rec)); } catch (e) { /* ignore */ }
}

// Today's estimated spend for one id (0 when nothing is recorded or KV is missing).
async function spentToday(env, sid) {
  if (!env || !env.XKDG_KV) return 0;
  try {
    const now = new Date();
    const rec = await env.XKDG_KV.get('u:' + (sid || 'anon') + ':' + now.toISOString().slice(0, 7), 'json');
    return (rec && rec.day && rec.day.d === dayKey(now)) ? (rec.day.cost || 0) : 0;
  } catch (e) { return 0; }   // the limit is a brake, never a reason to break the chat
}

// Wipe usage records (session 26). Deliberately two-step: without confirm=yes it only
// LISTS what would go, with a confirm link. Guarded by the same STATS_TOKEN.
//   ?wipe&token=..&month=2026-07     preview one month
//   ?wipe&token=..&all=1             preview everything
//   ...&confirm=yes                  actually delete
// KV list() pages at 1000 keys, so we follow the cursor to the end.
async function wipePage(env, month, all, confirm) {
  if (!env || !env.XKDG_KV) {
    return new Response("<h2>No KV bound</h2>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  let keys = [], cursor = undefined;
  try {
    do {
      const list = await env.XKDG_KV.list({ prefix: "u:", cursor: cursor });
      (list.keys || []).forEach(k => {
        if (all || k.name.endsWith(":" + month)) keys.push(k.name);
      });
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);
  } catch (e) {
    return new Response("<h2>Could not read KV</h2><pre>" + (e && e.message) + "</pre>",
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  const scope = all ? "ALL months" : month;
  const back = '<p><a href="?stats&token=' + encodeURIComponent(statsToken(env)) + '">&larr; back to the table</a></p>';
  const head = '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">'
    + '<title>XKDG · wipe usage</title><style>body{font-family:system-ui,sans-serif;margin:18px;color:#333;background:#faf8f4}'
    + 'code{font-family:monospace;font-size:12px;color:#666;display:block}'
    + 'a{color:#1565c0}.go{display:inline-block;margin-top:14px;padding:9px 16px;background:#c0392b;color:#fff;'
    + 'border-radius:6px;text-decoration:none;font-weight:600}</style>';
  if (!keys.length) return new Response(head + "<h2>Nothing to delete for " + scope + "</h2>" + back,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  if (confirm !== "yes") {
    const link = "?wipe&token=" + encodeURIComponent(statsToken(env))
      + (all ? "&all=1" : "&month=" + encodeURIComponent(month)) + "&confirm=yes";
    return new Response(head + "<h2>Delete " + keys.length + " usage record(s) — " + scope + "?</h2>"
      + "<p>This erases the question counts and the cost history for those records. It cannot be undone.</p>"
      + "<code>" + keys.join("<br>") + "</code>"
      + '<a class=go href="' + link + '">Yes, delete them</a>' + back,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  let done = 0, failed = 0;
  for (const k of keys) {
    try { await env.XKDG_KV.delete(k); done++; } catch (e) { failed++; }
  }
  return new Response(head + "<h2>Deleted " + done + " record(s)" + (failed ? (", " + failed + " failed") : "") + "</h2>" + back,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function sha256Hex(txt) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// true = this IP has burned its attempts. Only FAILURES are counted.
async function licenceThrottled(env, ip) {
  if (!env || !env.XKDG_KV || !ip) return false;
  try {
    const rec = await env.XKDG_KV.get("rl:" + ip, "json");
    if (!rec) return false;
    if (Date.now() - rec.t > LICENCE_RATE.WINDOW_MIN * 60000) return false;
    return (rec.n || 0) >= LICENCE_RATE.TRIES;
  } catch (e) { return false; }
}
async function licenceNoteFailure(env, ip) {
  if (!env || !env.XKDG_KV || !ip) return;
  try {
    let rec = await env.XKDG_KV.get("rl:" + ip, "json");
    if (!rec || (Date.now() - rec.t > LICENCE_RATE.WINDOW_MIN * 60000)) rec = { n: 0, t: Date.now() };
    rec.n = (rec.n || 0) + 1;
    await env.XKDG_KV.put("rl:" + ip, JSON.stringify(rec), { expirationTtl: LICENCE_RATE.WINDOW_MIN * 60 });
  } catch (e) { /* the brake is a nicety, never a blocker */ }
}

// POST ?licence  { pin: "1234" }   → first unlock; the PIN table stays server-side
// POST ?licence  { hash: "abc…" }  → silent re-check of a licence already stored
// Answers { ok:true, tier, expiry, maxDate, codeHash, name } or { ok:false, reason }.
async function licenceCheck(request, env, origin) {
  // Cloudflare always sets CF-Connecting-IP; the fallbacks are there so the brake still
  // works behind a proxy or in a test harness. With no ip at all the brake fails OPEN:
  // better to lose the throttle than to lock every student out.
  const ip = request.headers.get("CF-Connecting-IP")
          || (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim()
          || "";
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const pin = String(body.pin || "").trim();
  const hash = String(body.hash || "").trim().toLowerCase();
  if (!pin && !hash) return json({ ok: false, reason: "no pin" }, 400, origin);
  if (await licenceThrottled(env, ip)) {
    return json({ ok: false, reason: "too many attempts", retry_after_min: LICENCE_RATE.WINDOW_MIN }, 429, origin);
  }
  const h = pin ? await sha256Hex(pin) : hash;
  const hit = licences(env).find(c => c.h === h && !c.old);
  if (!hit) {
    await licenceNoteFailure(env, ip);
    return json({ ok: false, reason: "unknown code" }, 200, origin);
  }
  return json({ ok: true, tier: hit.t, expiry: hit.e || null, maxDate: hit.dmax || null,
                codeHash: hit.h, name: hit.n || null, directions: !!hit.d }, 200, origin);
}

// Builds the HTML table of who used the AI, how much, and when.
async function statsPage(env, month) {
  if (!env || !env.XKDG_KV) {
    return new Response('<h2>No KV bound</h2><p>Bind a KV namespace as XKDG_KV.</p>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const now = new Date();
  const ym = /^\d{4}-\d{2}$/.test(month) ? month : now.toISOString().slice(0, 7);
  let rows = [];
  try {
    let cursor;
    do {
      const list = await env.XKDG_KV.list({ prefix: 'u:', cursor: cursor });
      for (const k of (list.keys || [])) {
        if (!k.name.endsWith(':' + ym)) continue;
        let rec = null;
        try { rec = await env.XKDG_KV.get(k.name, 'json'); } catch (e) {}
        if (rec) rows.push(rec);
      }
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);
  } catch (e) {
    return new Response('<h2>Could not read KV</h2><pre>' + (e && e.message) + '</pre>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  // Session 26 (Edu): most recent activity first, not busiest first.
  rows.sort((a, b) => {
    const ta = Date.parse(a.last || a.first || 0) || 0;
    const tb = Date.parse(b.last || b.first || 0) || 0;
    if (tb !== ta) return tb - ta;
    return (b.req || 0) - (a.req || 0);
  });

  const LIC = licences(env);
  const today = dayKey(new Date());
  const nameOf = (sid) => {
    if (sid === 'anon') return 'Unidentified (unlocked before tracking)';
    const lc = LIC.find(c => c.h === sid) || LIC.find(c => c.old && c.h && sid.indexOf(c.h) === 0);
    if (lc) return (lc.n || sid.slice(0, 12)) + (lc.old ? ' (old code)' : '');
    if (sid.indexOf('dev_') === 0) return 'Unnamed user \u00b7 ' + sid;
    return sid.slice(0, 12) + '\u2026';
  };
  const when = (iso) => { try { return new Date(iso).toLocaleString('it-IT'); } catch (e) { return iso || ''; } };

  // Cache hit-rate: of all the big static prefix that was sent, how much was READ from
  // cache (cheap, 0.10x) vs sent FRESH or WRITTEN (full price / 2x). fresh here means the
  // uncached input tokens; the cached prefix is cr (read) + cw (write). A healthy setup is
  // mostly cr. Low % with high cw = the cache is being written but rarely read (sessions
  // too short, or gaps longer than the TTL) — paying to fill a cache nobody reuses.
  const cacheHit = (r) => {
    const cached = (r.cr || 0) + (r.cw || 0);
    if (!cached) return '\u2014';
    const pct = Math.round(100 * (r.cr || 0) / cached);
    const warn = pct < 55 ? ' style="color:#c0392b;font-weight:600"' : '';
    return '<span' + warn + '>' + pct + '%</span>';
  };

  // Today (session 49): spend so far vs the licence's daily cap. Only meaningful on the
  // current month's page; other months show a dash.
  const todayCell = (r) => {
    const d = (r.day && r.day.d === today) ? r.day : null;
    if (!d) return '\u2014';
    const cap = capFor(env, r.sid === 'anon' ? '' : r.sid);
    const over = cap > 0 && d.cost >= cap;
    return '<span' + (over ? ' style="color:#c0392b;font-weight:600"' : '') + '>$' + d.cost.toFixed(2)
      + '</span><br><span class=id>' + d.req + ' q \u00b7 cap ' + (cap > 0 ? '$' + cap.toFixed(2) : 'none') + '</span>';
  };

  let tot = { req: 0, cost: 0, in: 0, cr: 0, cw: 0, out: 0 };
  let body = '';
  rows.forEach(r => {
    tot.req += (r.req || 0); tot.cost += (r.cost || 0);
    tot.in += (r.in || 0); tot.cr += (r.cr || 0); tot.cw += (r.cw || 0); tot.out += (r.out || 0);
    body += '<tr><td><b>' + nameOf(r.sid || '') + '</b><br><span class=id>' + (r.sid || '') + '</span></td>'
      + '<td class=n>' + (r.req || 0) + '</td>'
      + '<td class=n>' + (r.in || 0).toLocaleString('it-IT') + '</td>'
      + '<td class=n>' + (r.cr || 0).toLocaleString('it-IT') + '</td>'
      + '<td class=n>' + (r.cw || 0).toLocaleString('it-IT') + '</td>'
      + '<td class=n>' + cacheHit(r) + '</td>'
      + '<td class=n>' + (r.out || 0).toLocaleString('it-IT') + '</td>'
      + '<td class=n>$' + (r.cost || 0).toFixed(3) + '</td>'
      + '<td class=n>' + todayCell(r) + '</td>'
      + '<td>' + when(r.first) + '</td><td>' + when(r.last) + '</td></tr>';
  });
  if (!rows.length) body = '<tr><td colspan=11 style="text-align:center;color:#888;padding:24px;">No activity recorded for ' + ym + '.</td></tr>';

  const prev = (() => { const d = new Date(ym + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); })();
  const next = (() => { const d = new Date(ym + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 7); })();
  const link = (m, t) => '<a href="?stats&token=' + encodeURIComponent(statsToken(env)) + '&month=' + m + '">' + t + '</a>';

  const html = '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">'
    + '<title>XKDG AI usage</title><style>'
    + 'body{font-family:system-ui,sans-serif;margin:18px;color:#333;background:#faf8f4}'
    + 'h1{font-size:19px;margin:0 0 4px}.sub{color:#888;font-size:13px;margin-bottom:14px}'
    + 'table{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12)}'
    + 'th,td{padding:9px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:left;vertical-align:top}'
    + 'th{background:#f1e7d4;font-size:11px;text-transform:uppercase;letter-spacing:.4px}'
    + '.n{text-align:right;font-variant-numeric:tabular-nums}.id{color:#aaa;font-size:10px;font-family:monospace}'
    + 'tfoot td{font-weight:bold;background:#f8f5ee}a{color:#1565c0;text-decoration:none;margin-right:12px}'
    + '</style>'
    + '<h1>\uD83E\uDDE0 XKDG \u00b7 AI usage \u2014 ' + ym + '</h1>'
    + '<div class=sub>Day limit: $' + DAILY_CAP_USD.toFixed(2) + ' per licence (Italian day, override with "ai" in LICENCES) \u00b7 ' + link(prev, '\u2190 ' + prev) + link(next, next + ' \u2192') + ' \u00b7 ' + rows.length + ' user(s) \u00b7 '
    + '<a href="?wipe&token=' + encodeURIComponent(statsToken(env)) + '&month=' + ym + '" style="color:#c0392b">wipe ' + ym + '</a></div>'
    + '<table><thead><tr><th>Student</th><th class=n>Questions</th><th class=n>Fresh in</th><th class=n>Cache read</th><th class=n>Cache write</th><th class=n>Cache&nbsp;hit</th><th class=n>Tokens out</th><th class=n>Cost</th><th class=n>Today</th><th>First use</th><th>Last use</th></tr></thead>'
    + '<tbody>' + body + '</tbody>'
    + '<tfoot><tr><td>TOTAL</td><td class=n>' + tot.req + '</td>'
    + '<td class=n>' + tot.in.toLocaleString('it-IT') + '</td>'
    + '<td class=n>' + tot.cr.toLocaleString('it-IT') + '</td>'
    + '<td class=n>' + tot.cw.toLocaleString('it-IT') + '</td>'
    + '<td class=n>' + cacheHit({ cr: tot.cr, cw: tot.cw }) + '</td>'
    + '<td class=n>' + tot.out.toLocaleString('it-IT') + '</td>'
    + '<td class=n>$' + tot.cost.toFixed(2) + '</td><td colspan=3></td></tr></tfoot></table>';
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '*';

    // CORS preflight (the browser sends this before the POST)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    // ---- Usage dashboard (GET ?stats&token=...) ------------------------
    if (request.method === 'GET') {
      const u = new URL(request.url);
      if (u.searchParams.has('stats')) {
        if ((u.searchParams.get('token') || '') !== statsToken(env) || !statsToken(env)) {
          return new Response('Not found', { status: 404 });
        }
        return await statsPage(env, u.searchParams.get('month') || '');
      }
      if (u.searchParams.has('wipe')) {
        if ((u.searchParams.get('token') || '') !== statsToken(env) || !statsToken(env)) {
          return new Response('Not found', { status: 404 });
        }
        const m = u.searchParams.get('month') || new Date().toISOString().slice(0, 7);
        return await wipePage(env, m, u.searchParams.has('all'), u.searchParams.get('confirm') || '');
      }
      return new Response('OK', { status: 200 });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, origin);
    }

    // ---- Licence check (POST ?licence) — answered before the AI proxy ----
    if (new URL(request.url).searchParams.has('licence')) {
      return await licenceCheck(request, env, origin);
    }

    // Who is calling (per-student header the app sends). May be absent for
    // students who unlocked before the tracking change until they re-enter
    // their PIN once — treated as "anon".
    const sid = (request.headers.get('X-Student-Id') || '').trim();

    // The Anthropic key is a Worker secret. Accept the usual names so this
    // works whatever you called it. (If yours has a different name, tell me.)
    const key = env.ANTHROPIC_API_KEY || env.ANTHROPIC_KEY || env.CLAUDE_API_KEY ||
                env.CLAUDE_KEY || env.API_KEY || env.ANTHROPIC;
    if (!key) {
      return json({ error: 'The Anthropic key secret is missing on the Worker.' }, 500, origin);
    }

    // ---- Daily limit per licence (session 49) ---------------------------
    const cap = capFor(env, sid);
    if (cap > 0) {
      const spent = await spentToday(env, sid);
      if (spent >= cap) {
        const m = minutesToMidnight();
        const wait = m == null ? 'at midnight (Italian time)'
          : 'at midnight Italian time, in about ' + (m >= 60 ? Math.floor(m / 60) + ' h ' : '') + (m % 60) + ' min';
        return json({ type: 'error', error: { type: 'daily_limit',
          message: 'You have reached today\'s Assistant limit for your licence. '
            + 'It resets ' + wait + '. Everything else in the app keeps working as usual.' } },
          429, origin);
      }
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Invalid JSON body.' }, 400, origin); }

    // ---- Force the model + ensure max_tokens ---------------------------
    body.model = modelFor(env, sid);
    if (!body.max_tokens) body.max_tokens = MAX_TOKENS_FALLBACK;

    // ---- Prompt caching: cache the static system prompt + tools --------
    // The system prompt and the 19+ tool definitions are identical on every
    // call, so we put a cache "breakpoint" on each. The first call writes the
    // cache; the following calls in the same conversation read it at ~10% of
    // the input price. (Cache lives ~5 min and refreshes on each hit.)
    // CACHE_TTL '1h' keeps the cached prefix alive for an hour instead of the
    // default 5 minutes. Writing costs 2x base input instead of 1.25x, reading is
    // 0.10x either way — so the hour wins as soon as a student asks a 2nd/3rd
    // question more than ~5 minutes after the first, which is the normal way people
    // study. Set it back to '5m' (or delete the ttl) if usage turns out to be
    // single-question-and-gone, where the cheaper write would be better.
    try {
      const cc = { type: 'ephemeral', ttl: CACHE_TTL };
      if (typeof body.system === 'string' && body.system.length) {
        body.system = [{ type: 'text', text: body.system, cache_control: cc }];
      } else if (Array.isArray(body.system) && body.system.length) {
        body.system[body.system.length - 1].cache_control = cc;
      }
      if (Array.isArray(body.tools) && body.tools.length) {
        body.tools[body.tools.length - 1].cache_control = cc;
      }

      // ---- Cache the CONVERSATION too (session 29) ---------------------
      // Until now only system+tools were cached; the whole message history was
      // re-sent FRESH (full price) on every turn — the dominant cost on long,
      // tool-heavy chats. We add ONE breakpoint on the last content block of the
      // SECOND-TO-LAST message. The app appends the volatile date/time to the
      // LAST message ONLY, so the second-to-last message is byte-identical across
      // turns: everything up to the previous turn becomes cache-read (0.10x)
      // instead of fresh. New content is paid fresh exactly once, then cached.
      // (Anthropic allows 4 breakpoints; we now use 3: system, tools, messages.)
      if (Array.isArray(body.messages) && body.messages.length >= 2) {
        const mm = body.messages[body.messages.length - 2];
        if (mm && typeof mm === 'object') {
          if (typeof mm.content === 'string' && mm.content.length) {
            mm.content = [{ type: 'text', text: mm.content, cache_control: cc }];
          } else if (Array.isArray(mm.content) && mm.content.length) {
            mm.content[mm.content.length - 1].cache_control = cc;
          }
        }
      }
    } catch (e) { /* if anything is unexpected, just send the body uncached */ }

    // ---- Forward to Anthropic ------------------------------------------
    let resp;
    try {
      resp = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-beta': 'extended-cache-ttl-2025-04-11'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      return json({ error: 'Upstream request failed: ' + ((e && e.message) || e) }, 502, origin);
    }

    // Pass Anthropic's JSON straight back (with CORS so the browser accepts it).
    const text = await resp.text();

    // Log the model + cache usage AND update the per-student counter.
    try {
      const p = JSON.parse(text), u = p.usage || {};
      console.log('XKDG sid=' + (sid || 'anon') + ' model=' + (p.model || '?') +
        ' in=' + (u.input_tokens || 0) + ' out=' + (u.output_tokens || 0) +
        ' cache_write=' + (u.cache_creation_input_tokens || 0) +
        ' cache_read=' + (u.cache_read_input_tokens || 0));
      // Only count when Anthropic actually returned a usage block (a real,
      // successful completion). Runs in the background — never delays the reply.
      if (p.usage) {
        if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(bumpUsage(env, sid, u, p.model || body.model));
        else await bumpUsage(env, sid, u, p.model || body.model);
      }
    } catch (e) { /* response was not JSON — nothing to count */ }

    return new Response(text, {
      status: resp.status,
      headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
    });
  }
};
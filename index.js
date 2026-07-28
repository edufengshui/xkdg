/* src/index.js — Cloudflare Worker: daily 00:00 GMT forex seed + EMA(8+1) trend direction.
 *
 * One Twelve Data call per cross (interval=1day). From that single daily series:
 *   - seed: OPEN of today's daily bar = the 00:00 GMT open → first 3 significant digits
 *     mod 12 → 地支 (Earthly Branch, remainder counts 子=1 … 亥=12).
 *   - EMA trend: EMA period 8 over completed daily closes, lagged +1 bar; direction = slope
 *     at the tip (rising → 'up'/blue, falling → 'down'/red).
 * Result stored in KV (binding SEEDS) and served to the PWA with CORS.
 *
 * scheduled (cron 00:10 GMT): recompute and store.
 * fetch:  GET /            → latest cached seeds (CORS)
 *         GET /?date=YYYY-MM-DD → a past day
 *         GET /run[?token=] → recompute now and return the result (9 throttled calls)
 *
 * Secret:  TWELVEDATA_API_KEY   Optional: RUN_TOKEN, DELAY_MS (throttle, default 8000)
 * Binding: SEEDS (KV).  Basic (free) plan = 8 credits/min, 800/day; 1 call/cross, throttled.
 */

var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
var BRANCH_PINYIN = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];

var CROSSES = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURJPY', 'EURGBP'];
var ENDPOINT = 'https://api.twelvedata.com/time_series';
var EMA_PERIOD = 8;
// consolidation filter: look back EMA_WINDOW days of EMA direction; more than EMA_MAX_CHANGES
// reversals in that window = choppy line → not a consolidated trend → no trade.
// (Flat days do not break a leg — a short interruption inside a long leg is tolerated.)
var EMA_WINDOW = 10;
var EMA_MAX_CHANGES = 2;

function toPair(code) { return code.length === 6 ? code.slice(0, 3) + '/' + code.slice(3) : code; }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function firstThreeSignificant(price) {
  var digits = String(price).replace(/[^0-9]/g, '').replace(/^0+/, '');
  return digits.slice(0, 3);
}
// remainder counts 子 as 1: index = (seed - 1) mod 12
function seedToBranchIndex(seed) { return (((seed - 1) % 12) + 12) % 12; }

function todayGmtDate(now) {
  now = now || new Date();
  var y = now.getUTCFullYear();
  var m = String(now.getUTCMonth() + 1).padStart(2, '0');
  var d = String(now.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function rowFor(cross, price) {
  var d3 = firstThreeSignificant(price);
  var seed = parseInt(d3, 10);
  var idx = seedToBranchIndex(seed);
  return {
    cross: cross, price: price, digits: d3, seed: seed,
    branchIndex: idx, branch: BRANCHES[idx], branchPinyin: BRANCH_PINYIN[idx]
  };
}

// EMA period P over an ascending array of closes → full series (oldest → newest)
function emaSeries(closes, period) {
  if (!closes || closes.length < period) return [];
  var k = 2 / (period + 1), prev = null, out = [];
  for (var i = 0; i < closes.length; i++) {
    if (i < period - 1) continue;
    if (i === period - 1) { var s = 0; for (var j = 0; j < period; j++) s += closes[j]; prev = s / period; out.push(prev); continue; }
    prev = closes[i] * k + prev * (1 - k); out.push(prev);
  }
  return out;
}
// direction of each EMA step: 'u' rising (blue), 'd' falling (red), 'f' flat
function emaDirs(series) {
  var d = [];
  for (var i = 1; i < series.length; i++) d.push(series[i] > series[i - 1] ? 'u' : (series[i] < series[i - 1] ? 'd' : 'f'));
  return d;
}
// count reversals, ignoring flat steps (a flat day doesn't break a leg)
function countChanges(dirs) {
  var n = 0, prev = null;
  for (var i = 0; i < dirs.length; i++) {
    var x = dirs[i]; if (x === 'f') continue;
    if (prev !== null && x !== prev) n++;
    prev = x;
  }
  return n;
}

// one daily series → today's open (seed) + completed closes (for EMA)
async function fetchDailyAll(cross, dateStr, apiKey) {
  var pair = toPair(cross);
  var url = ENDPOINT + '?symbol=' + encodeURIComponent(pair) +
    '&interval=1day&outputsize=60&timezone=UTC&format=JSON&apikey=' + encodeURIComponent(apiKey);
  var res = await fetch(url); var text = await res.text(); var json;
  try { json = JSON.parse(text); } catch (e) { throw new Error('non-JSON response: ' + text.slice(0, 140)); }
  if (json.status === 'error') { var err = new Error(json.message || 'error'); err.code = json.code; throw err; }
  var vals = (json.values || []).slice();
  vals.sort(function (a, b) { return (a.datetime || '') < (b.datetime || '') ? -1 : 1; }); // ascending
  var todayOpen = null, closes = [];
  for (var i = 0; i < vals.length; i++) {
    var dt = (vals[i].datetime || '').slice(0, 10);
    if (dt === dateStr) { if (vals[i].open != null) todayOpen = Number(vals[i].open); }
    else if (dt < dateStr && vals[i].close != null) { closes.push(Number(vals[i].close)); }
  }
  return { todayOpen: todayOpen, closes: closes };
}

async function withRetry(fn) {
  try { return await fn(); }
  catch (e) {
    if (e && (e.code === 429 || /limit|run out|429/i.test(String(e.message)))) { await sleep(61000); return await fn(); }
    throw e;
  }
}

async function computeDaily(env) {
  var apiKey = env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('Missing TWELVEDATA_API_KEY secret');
  var delayMs = Number(env.DELAY_MS != null ? env.DELAY_MS : 8000);
  var date = todayGmtDate();
  var rows = [];
  for (var i = 0; i < CROSSES.length; i++) {
    var cross = CROSSES[i];
    try {
      var data = await withRetry((function (c) { return function () { return fetchDailyAll(c, date, apiKey); }; })(cross));
      if (data.todayOpen == null) throw new Error('no 00:00 bar for today (market closed?)');
      var row = rowFor(cross, data.todayOpen); row.status = 'ok';
      var series = emaSeries(data.closes, EMA_PERIOD);
      var dirs = emaDirs(series);
      if (dirs.length) {
        var win = dirs.slice(-EMA_WINDOW);
        var last = win[win.length - 1];
        row.ema = Number(series[series.length - 1].toFixed(6));
        row.emaPrev = Number(series[series.length - 2].toFixed(6));
        row.direction = last === 'u' ? 'up' : (last === 'd' ? 'down' : 'flat');
        row.trendColor = row.direction === 'up' ? 'blue' : (row.direction === 'down' ? 'red' : 'flat');
        row.emaDirs = win.join('');                       // oldest → newest, e.g. "uuuudduuu"
        row.emaChanges = countChanges(win);
        row.emaConsolidated = row.emaChanges <= EMA_MAX_CHANGES;
      } else { row.emaNote = 'insufficient daily history (' + data.closes.length + ' closes)'; }
      rows.push(row);
    } catch (e) {
      rows.push({ cross: cross, status: 'error', error: String((e && e.message) || e) });
    }
    if (i < CROSSES.length - 1 && delayMs > 0) await sleep(delayMs);
  }
  var out = {
    date: date, gmtTime: '00:00', generatedAt: new Date().toISOString(),
    source: 'Twelve Data daily bars — seed: today open at 00:00 UTC · trend: EMA(8) lag +1 on daily closes',
    seedRule: 'first 3 significant digits mod 12, remainder counts 子=1 … 亥=12 → 地支',
    emaRule: 'EMA period 8 on daily closes, lagged 1 bar; direction = slope at the tip (up=blue, down=red)',
    filterRule: 'consolidation: <= ' + EMA_MAX_CHANGES + ' EMA reversals over the last ' + EMA_WINDOW + ' days (flat ignored); otherwise no trade',
    rows: rows
  };
  var body = JSON.stringify(out);
  await env.SEEDS.put('daily', body);
  await env.SEEDS.put('daily:' + date, body);
  return out;
}

// raw daily bars for one cross (ascending), for backtesting
async function fetchHistory(cross, size, apiKey) {
  var pair = toPair(cross);
  var url = ENDPOINT + '?symbol=' + encodeURIComponent(pair) +
    '&interval=1day&outputsize=' + size + '&timezone=UTC&format=JSON&apikey=' + encodeURIComponent(apiKey);
  var res = await fetch(url); var text = await res.text(); var json;
  try { json = JSON.parse(text); } catch (e) { throw new Error('non-JSON: ' + text.slice(0, 140)); }
  if (json.status === 'error') { var err = new Error(json.message || 'error'); err.code = json.code; throw err; }
  var vals = (json.values || []).slice();
  vals.sort(function (a, b) { return (a.datetime || '') < (b.datetime || '') ? -1 : 1; });
  return vals.map(function (v) {
    return { d: (v.datetime || '').slice(0, 10), o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close) };
  });
}

// raw hourly bars for one cross (ascending), for intraday-exit backtesting
async function fetchHourly(cross, size, apiKey) {
  var pair = toPair(cross);
  var url = ENDPOINT + '?symbol=' + encodeURIComponent(pair) +
    '&interval=1h&outputsize=' + size + '&timezone=UTC&format=JSON&apikey=' + encodeURIComponent(apiKey);
  var res = await fetch(url); var text = await res.text(); var json;
  try { json = JSON.parse(text); } catch (e) { throw new Error('non-JSON: ' + text.slice(0, 140)); }
  if (json.status === 'error') { var err = new Error(json.message || 'error'); err.code = json.code; throw err; }
  var vals = (json.values || []).slice();
  vals.sort(function (a, b) { return (a.datetime || '') < (b.datetime || '') ? -1 : 1; });
  // keep it compact: datetime + open + close only (that is all the backtest needs)
  return vals.map(function (v) { return { t: v.datetime, o: Number(v.open), c: Number(v.close) }; });
}

async function computeHourly(env, size) {
  var apiKey = env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('Missing TWELVEDATA_API_KEY secret');
  var delayMs = Number(env.DELAY_MS != null ? env.DELAY_MS : 8000);
  var out = { generatedAt: new Date().toISOString(), interval: '1h', outputsize: size, crosses: {} };
  for (var i = 0; i < CROSSES.length; i++) {
    var cross = CROSSES[i];
    try { out.crosses[cross] = await withRetry((function (c) { return function () { return fetchHourly(c, size, apiKey); }; })(cross)); }
    catch (e) { out.crosses[cross] = { error: String((e && e.message) || e) }; }
    if (i < CROSSES.length - 1 && delayMs > 0) await sleep(delayMs);
  }
  return out;
}

async function computeHistory(env, size) {
  var apiKey = env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('Missing TWELVEDATA_API_KEY secret');
  var delayMs = Number(env.DELAY_MS != null ? env.DELAY_MS : 8000);
  var out = { generatedAt: new Date().toISOString(), outputsize: size, crosses: {} };
  for (var i = 0; i < CROSSES.length; i++) {
    var cross = CROSSES[i];
    try { out.crosses[cross] = await withRetry((function (c) { return function () { return fetchHistory(c, size, apiKey); }; })(cross)); }
    catch (e) { out.crosses[cross] = { error: String((e && e.message) || e) }; }
    if (i < CROSSES.length - 1 && delayMs > 0) await sleep(delayMs);
  }
  return out;
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Content-Type': 'application/json; charset=utf-8' };
}

export default {
  async scheduled(controller, env, ctx) { ctx.waitUntil(computeDaily(env)); },

  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    var headers = corsHeaders();
    if (request.method === 'OPTIONS') return new Response(null, { headers: headers });

    if (url.pathname === '/run') {
      if (env.RUN_TOKEN && url.searchParams.get('token') !== env.RUN_TOKEN) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: headers });
      }
      try {
        var out = await computeDaily(env);
        return new Response(JSON.stringify(out, null, 2), { headers: headers });
      } catch (e) {
        return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: headers });
      }
    }

    if (url.pathname === '/history') {
      if (env.RUN_TOKEN && url.searchParams.get('token') !== env.RUN_TOKEN) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: headers });
      }
      var size = Math.min(Math.max(parseInt(url.searchParams.get('size') || '800', 10) || 800, 20), 5000);
      try {
        var hist = await computeHistory(env, size);
        return new Response(JSON.stringify(hist), { headers: headers });
      } catch (e) {
        return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: headers });
      }
    }

    if (url.pathname === '/hourly') {
      if (env.RUN_TOKEN && url.searchParams.get('token') !== env.RUN_TOKEN) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: headers });
      }
      var hsize = Math.min(Math.max(parseInt(url.searchParams.get('size') || '5000', 10) || 5000, 100), 5000);
      try {
        var hr = await computeHourly(env, hsize);
        return new Response(JSON.stringify(hr), { headers: headers });
      } catch (e) {
        return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: headers });
      }
    }

    var key = url.searchParams.get('date') ? 'daily:' + url.searchParams.get('date') : 'daily';
    var cached = await env.SEEDS.get(key);
    if (!cached) {
      return new Response(JSON.stringify({ error: 'no data yet — call /run once to populate, or wait for the 00:10 GMT cron' }), { status: 404, headers: headers });
    }
    return new Response(cached, { headers: headers });
  }
};

export { computeDaily, rowFor, firstThreeSignificant, seedToBranchIndex, todayGmtDate, toPair, emaSeries, emaDirs, countChanges, fetchDailyAll, CROSSES, BRANCHES };

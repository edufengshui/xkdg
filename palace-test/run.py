# Palace test (session 48): do people famous for beauty / physique have "good" palace communication
# (xkdgPalaceComm in app-bazi.js) more often than chance and than a control group?
# PRIMARY measure, fixed before looking at the beauty data: palaces "good" as the app shows it
# (no isolated palace number; a pillar with no number link counts if it shares a family with another pillar).
# Secondary: numbers only (no family rescue); "weak in Elements or Periods but good in Palaces".
# Run:  cd xkdg && python3 -m http.server 8765 &   then   python3 palace-test/run.py
import json, glob, os, re, random, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def tz_of(b):   # hours east of UTC in force at the birth
    t = b.get('tz')
    if isinstance(t, (int, float)): return float(t)
    t = str(t)
    if t == 'LMT': return float(b['lon']) / 15.0
    m = re.match(r'UTC([+-][0-9.]+)$', t)
    if m: return float(m.group(1))
    from zoneinfo import ZoneInfo; from datetime import datetime
    y, mo, d = map(int, b['date'].split('-')); h, mi = map(int, b['time'].split(':')[:2])
    return datetime(y, mo, d, h, mi, tzinfo=ZoneInfo(t)).utcoffset().total_seconds() / 3600.0
def rows(path, group):
    out = []
    for p in json.load(open(path))['people']:
        b = p['birth']
        if p.get('weakTime'): continue
        y, mo, d = map(int, b['date'].split('-')); h, mi = map(int, b['time'].split(':')[:2])
        out.append({'name': p['name'], 'group': group, 'a': [y, mo, d, h, mi, 0, float(b['lon']), -tz_of(b) * 60]})
    return out
people = []
for f in ['famous_arts', 'famous_politics', 'famous_violent']:
    people += rows(os.path.join(ROOT, 'heluo-test', f + '.json'), 'control')
for f, g in [('beauty_women', 'beauty_women'), ('beauty_men', 'beauty_men'), ('physique', 'physique')]:
    pth = os.path.join(ROOT, 'palace-test', f + '.json')
    if os.path.exists(pth): people += rows(pth, g)
seen = set(); uniq = []
for p in people:          # one person once; a beauty group wins over control
    pass
names_beauty = {p['name'] for p in people if p['group'] != 'control'}
for p in people:
    if p['group'] == 'control' and p['name'] in names_beauty: continue
    if p['name'] in seen: continue
    seen.add(p['name']); uniq.append(p)
random.seed(48)
rnd = [{'name': 'r%d' % i, 'group': 'random', 'a': [random.randint(1900, 2005), random.randint(1, 12), random.randint(1, 28), random.randint(0, 23), random.randint(0, 59), 0, 0.0, 0.0]} for i in range(20000)]
JS = """(list)=>{
  const KS=['hour','day','month','year'];
  return list.map(p=>{
    const g4=XKDGSolarTime.pillarsFromCivil.apply(null,p.a); if(!g4) return null;
    const P={}; KS.forEach(k=>{const z=g4[k],x=getXkdgData(z[0],z[1]);P[k]={stem:z[0],branch:z[1],qi:x.qi,yun:x.yun,hex:x.hex}});
    const pc=xkdgPalaceComm(P), g=xkdgPersonGaps(P);
    const bad=f=>g.dims[f].isolated.length>0||!!(g.settings&&g.settings[f]&&g.settings[f].split);
    return {name:p.name,group:p.group,gz:KS.map(k=>g4[k]).join(' '),pal:pc.values.map(v=>v.value).join(''),good:pc.good?1:0,
            numOnly:(pc.isolated.length+pc.by_family.length)===0?1:0,qiBad:bad('qi')?1:0,yunBad:bad('yun')?1:0,blood:g.bloodLink?1:0};
  }).filter(Boolean)}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/lunar.js', lambda r: r.fulfill(path=os.path.join(ROOT, 'heluo-test/node_modules/lunar-javascript/lunar.js'), content_type='application/javascript'))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(4000)
    res = pg.evaluate(JS, uniq + rnd); b.close()
def rate(rs, k): return sum(r[k] for r in rs) / len(rs) if rs else float('nan')
def perm(A, B, k, n=20000):
    d = rate(A, k) - rate(B, k); al = [r[k] for r in A + B]; c = 0
    for _ in range(n):
        random.shuffle(al)
        if sum(al[:len(A)]) / len(A) - sum(al[len(A):]) / len(B) >= d: c += 1
    return c / n
G = {}
for r in res: G.setdefault(r['group'], []).append(r)
for r in res: r['weakButPal'] = 1 if (r['good'] and (r['qiBad'] or r['yunBad'])) else 0
beauty = [r for r in res if r['group'] in ('beauty_women', 'beauty_men', 'physique')]
if beauty: G['ALL_BEAUTY'] = beauty
summary = {}
print('%-13s %4s  %6s %8s %12s %7s %7s' % ('group', 'n', 'good', 'numOnly', 'weakButPal', 'qiBad', 'yunBad'))
for g in ['random', 'control', 'beauty_women', 'beauty_men', 'physique', 'ALL_BEAUTY']:
    if g not in G: continue
    rs = G[g]; summary[g] = {'n': len(rs), **{k: round(rate(rs, k), 3) for k in ['good', 'numOnly', 'weakButPal', 'qiBad', 'yunBad']}}
    print('%-13s %4d  %5.1f%% %7.1f%% %11.1f%% %6.1f%% %6.1f%%' % (g, len(rs), *[100 * rate(rs, k) for k in ['good', 'numOnly', 'weakButPal', 'qiBad', 'yunBad']]))
if beauty:
    for k in ['good', 'numOnly', 'weakButPal']:
        summary['p_' + k + '_vs_control'] = perm(beauty, G['control'], k); summary['p_' + k + '_vs_random'] = perm(beauty, G['random'], k, 2000)
        print('p (beauty higher), %-10s vs control %.3f   vs random %.3f' % (k, summary['p_' + k + '_vs_control'], summary['p_' + k + '_vs_random']))
json.dump({'summary': summary, 'people': [r for r in res if r['group'] != 'random']}, open(os.path.join(ROOT, 'palace-test/result.json'), 'w'), ensure_ascii=False, indent=1)

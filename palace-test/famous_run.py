# Edu's own verified charts (Drive folder "Famous", .fpd files): who has PERFECT palace numbers,
# numbers only (5/10/15, Hetu, same number) — no family rescue. Data used exactly as in the files:
# "name","HH:MM",dst,"day",month0,"year",male,tzIndex(=12+UTC offset),longitude in minutes of time.
import json, csv, io, os, re, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else 'drive_famous.jsonl'
rows, skipped, seen = [], [], set()
for l in open(os.path.join(ROOT, 'palace-test', src)):
    r = json.loads(l); raw = r.get('raw') or ''
    try:
        f = next(csv.reader(io.StringIO(raw.replace('\r\n', ' '))))
        name = f[0].strip() or r['title'].replace('.fpd', '')
        hh, mm = re.split('[:.]', f[1])[:2]; dst = int(f[2] or 0); d = int(f[3]); mo = int(f[4]) + 1; y = int(f[5]); tz = int(f[7]) - 12 + dst; lon = float(f[8]) / 4.0
    except Exception as e:
        skipped.append((r['title'], 'unreadable')); continue
    key = (y, mo, d, hh, mm, f[7], f[8])
    if key in seen: continue
    seen.add(key)
    if re.search(r'earthquake|caso|terremot', r['title'], re.I): skipped.append((r['title'], 'not a person')); continue
    if f[1] in ('12:00',) and f[7] == '12' and f[8] == '0': skipped.append((name, 'hour unknown (12:00 placeholder)')); continue
    if y < 1600: skipped.append((name, 'too old for the calendar library')); continue
    rows.append({'name': name, 'folder': r['folder'], 'date': '%d-%02d-%02d %s:%s' % (y, mo, d, hh, mm), 'a': [y, mo, d, int(hh), int(mm), 0, lon, -tz * 60]})
JS = """(list)=>{
  const KS=['hour','day','month','year'], XT={7:9,3:4,5:3,1:8,6:2,2:7,4:6,0:1};
  return list.map(p=>{ try{
    const g4=XKDGSolarTime.pillarsFromCivil.apply(null,p.a); if(!g4) return {name:p.name,err:1};
    const P={},Q={}; KS.forEach(k=>{const z=g4[k],x=getXkdgData(z[0],z[1]);P[k]={stem:z[0],branch:z[1],qi:x.qi,yun:x.yun,hex:x.hex};Q[k]=Object.assign({},P[k],{pal:XT[_XK_HEXBIN[x.hex]&7]})});
    const pc=xkdgPalaceComm(P), st=xkdgDimSettings(Q,'pal');
    const pairs=[]; for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const r=_xkdgPairRel(Q,KS[i],KS[j],'pal'); if(r&&!r.cancelled) pairs.push(r.lang)}
    return {name:p.name,folder:p.folder,date:p.date,gz:KS.map(k=>g4[k]).join(' '),pal:KS.map(k=>Q[k].pal).join(' '),
      numOnly:(pc.isolated.length+pc.by_family.length)===0, groups:st.groups.length, langs:[...new Set(pairs)].sort().join('+')};
  }catch(e){return {name:p.name,err:String(e)}} })}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/lunar.js', lambda r: r.fulfill(path=os.path.join(ROOT, 'heluo-test/node_modules/lunar-javascript/lunar.js'), content_type='application/javascript'))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(4000)
    res = pg.evaluate(JS, rows); b.close()
ok = [r for r in res if not r.get('err')]; bad = [r for r in res if r.get('err')]
perf = [r for r in ok if r['numOnly']]
one = [r for r in perf if r['groups'] == 1]
print('charts computed', len(ok), '| errors', len(bad), '| skipped', len(skipped))
print('perfect (numbers only):', len(perf), '= %.1f%%' % (100 * len(perf) / len(ok)), '| of which all four in ONE group:', len(one))
LN = {'add': 'somma', 'hetu': 'Hetu', 'eq': 'stesso numero'}
for r in sorted(perf, key=lambda r: (-(r['groups'] == 1), r['name'])):
    print(('1 gruppo ' if r['groups'] == 1 else '2 coppie ') + '| %-28s | %s | %s | %s' % (r['name'][:28], r['pal'], '+'.join(LN[x] for x in r['langs'].split('+')), r['folder']))
json.dump({'computed': ok, 'errors': bad, 'skipped': skipped}, open(os.path.join(ROOT, 'palace-test', src.replace('.jsonl', '_result.json')), 'w'), ensure_ascii=False, indent=1)

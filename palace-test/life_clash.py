# Check (Edu, 10/11/2026): do the communicating pillars clash? In the app a sum/Hetu link between two pillars whose
# branches clash is already cancelled; a SAME-NUMBER link is not. Here every link is cancelled on a clash.
import json, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, 'palace-test/life_result.json')))['computed']
rows = [r for r in d if not r.get('err')]
JS = """(list)=>{
  const KS=['hour','day','month','year'], XT={7:9,3:4,5:3,1:8,6:2,2:7,4:6,0:1};
  return list.map(p=>{
    const Q={}; KS.forEach((k,i)=>{const z=p.gz[i],x=getXkdgData(z[0],z[1]);Q[k]={stem:z[0],branch:z[1],hex:x.hex,pal:XT[_XK_HEXBIN[x.hex]&7]}});
    const par={}; KS.forEach(k=>par[k]=k); const find=k=>par[k]===k?k:(par[k]=find(par[k]));
    const linked={}, clashed=[];
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=KS[i],b=KS[j],r=_xkdgRel(Q[a].pal,Q[b].pal); if(!r) continue;
      if(_xkdgPairClash(Q,a,b)){clashed.push(a+'-'+b+' '+r.txt+' ('+Q[a].branch+Q[b].branch+')'+(r.lang==='eq'?' SAME':''));continue}
      linked[a]=linked[b]=1; par[find(a)]=find(b)}
    return {name:p.name,pal:p.pal,gz:p.gz.join(' '),was:p.numOnly,wasGroups:p.groups,strict:KS.every(k=>linked[k]),groups:new Set(KS.map(find)).size,clashed:clashed};
  })}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/lunar.js', lambda r: r.fulfill(path=os.path.join(ROOT, 'heluo-test/node_modules/lunar-javascript/lunar.js'), content_type='application/javascript'))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(4000)
    res = pg.evaluate(JS, rows); b.close()
was = [r for r in res if r['was']]; st = [r for r in res if r['strict']]
print('perfect before', len(was), '| perfect with every clash cancelled', len(st), '| one group', sum(1 for r in st if r['groups'] == 1))
print('DROPPED:'); [print('  ', r['name'], '|', r['pal'], '|', r['gz'], '|', '; '.join(r['clashed'])) for r in was if not r['strict']]
print('ONE GROUP -> TWO PAIRS:'); [print('  ', r['name'], '|', r['pal'], '|', r['gz'], '|', '; '.join(r['clashed'])) for r in st if r['wasGroups'] == 1 and r['groups'] > 1]
print('STILL PERFECT WITH A CANCELLED LINK:'); [print('  ', r['name'], '|', r['pal'], '|', '; '.join(r['clashed'])) for r in st if r['clashed'] and not (r['wasGroups'] == 1 and r['groups'] > 1)]
print('MISMATCH (strict but not before):', [r['name'] for r in st if not r['was']])
json.dump(res, open(os.path.join(ROOT, 'palace-test/life_clash_result.json'), 'w'), ensure_ascii=False, indent=1)

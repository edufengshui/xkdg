# People whose chart Edu has read (Drive "QMDJ Life Reading" / "DLR life reading" decks): who has PERFECT palace
# numbers, numbers only (5/10/15, Hetu, same number; no family rescue). The four pillars are taken as WRITTEN on
# Edu's slides (life_qmdj.jsonl, life_dlr.jsonl), so no time-zone conversion is involved.
import json, os, re, glob, unicodedata
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST, BR = '甲乙丙丁戊己庚辛壬癸', '子丑寅卯辰巳午未申酉戌亥'
def norm(n):
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().lower()
    n = re.sub(r'\b(princess|prince|marshal|sir|dr|mr|mrs|king|queen|pope|president)\b', '', n)
    n = re.sub(r'[^a-z]', '', n)
    for a, b in [('zukov', 'zhukov'), ('zhukov', 'zhukov'), ('beethoven', 'beethoven'), ('mozart', 'mozart'), ('diana', 'diana')]:
        if a in n: return b
    return n
PY_S = dict(zip(['jia', 'yi', 'bing', 'ding', 'wu', 'ji', 'geng', 'xin', 'ren', 'gui'], ST))
PY_B = dict(zip(['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'], BR))
def rectified(r):   # hour unknown, Edu's own conclusion: 'The Jia Xu hour chart is the most convincing'
    m = re.search(r'concludes "The (\w+) (\w+) (?:hour )?chart', r.get('time_as_written') or '')
    if not m: return None
    a, b = m.group(1).lower(), m.group(2).lower()
    return PY_S[a] + PY_B[b] if a in PY_S and b in PY_B else None
people, nodata, conflicts = {}, {}, []
recs = []
for f in sorted(glob.glob(os.path.join(ROOT, 'palace-test', 'life_*.jsonl'))):
    for l in open(f):
        if l.strip(): r = json.loads(l); r['_src'] = os.path.basename(f); recs.append(r)
recs.sort(key=lambda r: 0 if '100 Charts' in (r.get('file') or '') else 1)   # the "100 Charts" deck wins when two decks disagree
for r in recs:
    if True:
        f = r['_src']; name = (r.get('name') or '').strip()
        if not name or 'unnamed' in name.lower(): continue
        gz = re.findall('[%s][%s]' % (ST, BR), r.get('pillars_as_written') or '')
        rect = False
        if len(gz) == 3 and rectified(r): gz = [rectified(r)] + gz; rect = True
        k = norm(name)
        if len(gz) == 4:
            if k in people:
                if people[k]['gz'] != gz and (name, gz) not in [(c[0], c[2]) for c in conflicts]: conflicts.append((name, people[k]['gz'], gz, r.get('file')))
                continue
            people[k] = {'name': name, 'gz': gz, 'born': ((r.get('date_as_written') or '') + ' ' + (r.get('time_as_written') or '')).strip(), 'file': r.get('file'), 'src': os.path.basename(f), 'rect': rect}
        else:
            nodata.setdefault(k, name + (' (' + ((r.get('date_as_written') or '') + ' ' + (r.get('time_as_written') or '')).strip() + ')' if r.get('date_as_written') else ''))
nodata = {k: v for k, v in nodata.items() if k not in people}
JS = """(list)=>{
  const KS=['hour','day','month','year'], XT={7:9,3:4,5:3,1:8,6:2,2:7,4:6,0:1};
  return list.map(p=>{ try{
    const P={},Q={}; KS.forEach((k,i)=>{const z=p.gz[i],x=getXkdgData(z[0],z[1]);P[k]={stem:z[0],branch:z[1],qi:x.qi,yun:x.yun,hex:x.hex};Q[k]=Object.assign({},P[k],{pal:XT[_XK_HEXBIN[x.hex]&7]})});
    const pc=xkdgPalaceComm(P), st=xkdgDimSettings(Q,'pal');
    const pairs=[]; for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const r=_xkdgPairRel(Q,KS[i],KS[j],'pal'); if(r&&!r.cancelled) pairs.push(r.lang)}
    return Object.assign({},p,{pal:KS.map(k=>Q[k].pal).join(' '),numOnly:(pc.isolated.length+pc.by_family.length)===0,good:pc.good,groups:st.groups.length,langs:[...new Set(pairs)].sort().join('+')});
  }catch(e){return Object.assign({},p,{err:String(e)})} })}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/lunar.js', lambda r: r.fulfill(path=os.path.join(ROOT, 'heluo-test/node_modules/lunar-javascript/lunar.js'), content_type='application/javascript'))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(4000)
    res = pg.evaluate(JS, list(people.values())); b.close()
ok = [r for r in res if not r.get('err')]; perf = [r for r in ok if r['numOnly']]
print('people with four pillars:', len(ok), '| errors', len(res) - len(ok), '| without pillars:', len(nodata), '| conflicting pillars:', len(conflicts))
print('perfect (numbers only):', len(perf), '= %.1f%%' % (100.0 * len(perf) / max(1, len(ok))), '| one group:', sum(1 for r in perf if r['groups'] == 1), '| good with family rescue too: %.1f%%' % (100.0 * sum(1 for r in ok if r['good']) / max(1, len(ok))))
LN = {'add': 'somma', 'hetu': 'Hetu', 'eq': 'stesso numero'}
for r in sorted(perf, key=lambda r: (-(r['groups'] == 1), r['name'])):
    print(('1 gruppo ' if r['groups'] == 1 else '2 coppie ') + '| %-28s | %s | %s%s' % (r['name'][:28], r['pal'], ' '.join(r['gz']), ' | ORA RETTIFICATA' if r.get('rect') else ''))
print('CONFLICTS', conflicts); print('NO PILLARS', list(nodata.values()))
json.dump({'computed': res, 'no_pillars': list(nodata.values()), 'conflicts': conflicts}, open(os.path.join(ROOT, 'palace-test', 'life_result.json'), 'w'), ensure_ascii=False, indent=1)

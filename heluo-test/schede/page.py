import json
S=json.load(open('schede.json'))
html=open('template.html').read().replace('__DATA__',json.dumps(S,ensure_ascii=False))
open('schede-natali.html','w').write(html)

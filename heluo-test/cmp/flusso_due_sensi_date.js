const { giorno } = require('./flusso_due_sensi.js');
const SC = global.XKDG_HELUO_SCORES;
const CASI = [['2015-12-08',12.07,['wealth','relationship']],['2011-09-06',12.07,['wealth']],['2011-09-07',12.07,['wealth']],['2011-09-29',12.07,['wealth']],['2011-10-08',20.46,['wealth']],['2011-10-16',12.07,['wealth']],['2011-11-15',12.07,['wealth']],['2019-06-15',23.73,['speak','wealth']],['2019-06-25',23.73,['speak','wealth']],['2019-07-03',23.73,['speak','wealth']]];
for (const [ds, lon, keys] of CASI) for (const k of keys) { const g = giorno(ds, lon, k), th = g.th, p = th.p;
  console.log(`${ds} ${k} | mese ${p.month.hex.n} l${p.month.line} blocco ${p.id.lord[0]} Lord l${p.id.lord[1]} giorno ${p.id.day[0]} l${p.id.day[1]} → ${p.id.dayHex[0]} | ☯ ${g.v.a0} / ${g.v.a4} / ${g.v.a5} (t ${g.v.t0.toFixed(2)}→${g.v.tV5.toFixed(2)}) 財生殺 oggi/V2/V4/V5 ${['oggi','v2','v4','v5'].map(x=>g.v.csk[x]?'s':'-').join('')} ctl ${g.v.ctl.map(x=>x.lbl).join(';')}\n    ${g.v.nota.join(' | ')}`); }
// anni: speak, giorni ☯>0 e somma ☯
for (const [Y, lon, mesi] of [[1994,11.72,[9]],[2016,12.07,null],[2019,23.73,null],[1995,11.72,null],[2010,12.07,null],[2014,12.07,null]]) for (const k of ['speak']) {
  let a=0,b=0,sa=0,sb=0,n=0,c4=0,s4=0;
  for (let t=Date.UTC(Y,0,1);t<Date.UTC(Y+1,0,1);t+=864e5){const d=new Date(t);if(mesi&&!mesi.includes(d.getUTCMonth()+1))continue;const g=giorno(d.toISOString().slice(0,10),lon,k);if(!g)continue;n++;if(g.v.a0>0)a++;if(g.v.a5>0)b++;if(g.v.a4>0)c4++;sa+=g.v.a0;sb+=g.v.a5;s4+=g.v.a4;}
  console.log(`${Y}${mesi?' mesi '+mesi:''} ${k}: giorni ☯>0 ${a}/${c4}/${b} su ${n}, somma ☯ ${sa}/${s4}/${sb}`); }

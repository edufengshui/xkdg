// Corsa allargata (sessione 47): momento = partenza natale + linea del ciclo + linea dell'anno + linea mese/giorno,
// stesse regole strutturali di corsa.js (posizione, supporto, linea 5/2/3/6, qi, trigramma fortuna/opposto, ramo),
// per i tre metodi A/B/C. Violenti (ora forte) contro successi; anche dentro la stessa persona.
'use strict';
const fs=require('fs'),path=require('path');
const C=require('../cmp/heluo_cmp.js'),H=global.XKDGHeluo,{score}=require('./score.js');
const BR=H.BRANCHES,BR_TRI=['Kan','Gen','Gen','Zhen','Xun','Xun','Li','Kun','Kun','Dui','Qian','Qian'];
const HEX={};for(let i=0;i<64;i++){const l=[0,1,2,3,4,5].map(b=>(i>>b)&1);HEX[H.hexOf(l).n]=l}
function lineScore(R,lines,ln,br){
  const N=R.numbers,avg=N.monthAvg,L=R.luck,s={};
  s.pos=H.properPosition(lines,ln)?1:-1; s.sup=H.properSupport(lines,ln)?1:-1;
  s.linea=ln===5?1:ln===2?.5:ln===6||ln===3?-.5:0;
  const yang=lines[ln-1]===1,r=(yang?N.heaven/avg.yang:N.earth/avg.yin); s.qi=r>=.7&&r<=1.4?1:r<.5||r>2?-1:0;
  const tri=ln<=3?H.hexOf(lines).lower:H.hexOf(lines).upper;
  s.tri=['heaven','earth','fame'].reduce((a,k)=>a+(tri===L[k]?1:0)-(tri===L.opposite[k]?1:0),0);
  const bt=BR_TRI[br]; s.ramo=['heaven','earth','fame'].reduce((a,k)=>a+(bt===L[k]?.5:0)-(bt===L.opposite[k]?.5:0),0);
  return Object.values(s).reduce((a,c)=>a+c,0);
}
const load=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',f))).people;
const people=load('famous_violent.json').filter(p=>!p.weakTime).concat(load('famous_arts.json'),load('famous_politics.json').filter(p=>!/Grace Kelly \(/.test(p.name)));
const ev=[];
for(const p of people){
  const b=p.birth,P=C.pillars(b.date,b.time,b.lon,b.tz),male=p.sex==='M',R=H.fromPillars(P,male),nat=score(p).tot;
  for(const m of ['A','B','C']){
    const N=C.natal(m,P,male);
    for(const e of p.events){
      let Pe;try{Pe=C.pillars(e.date,e.time||'12:00',b.lon,b.tz)}catch(x){continue}
      let pr;try{pr=C.predict(N,Pe,b.lon)}catch(x){continue}
      if(pr.none)continue;
      const yb=BR.indexOf(Pe.year[1]),mb=BR.indexOf(Pe.month[1]),db=BR.indexOf(Pe.day[1]);
      const cyc=lineScore(R,HEX[pr.id.cycle[0]],pr.id.cycle[1],yb);
      const anno=lineScore(R,HEX[pr.id.year[0]],pr.id.year[1],yb);
      const mese=lineScore(R,HEX[pr.id.day[0]],pr.id.day[1],mb);
      ev.push({m,name:p.name,violent:!!e.violent,pol:e.polarity,nat,cyc,anno,mese,
        corsa:cyc+anno+mese,tot:nat+cyc+anno+mese,txt:pr.s.cycle+pr.s.year+pr.s.month+pr.s.day});
    }
  }
}
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
function perm(A,B){const d=mean(B)-mean(A),all=A.concat(B);let c=0;const n=20000;
  for(let i=0;i<n;i++){for(let j=all.length-1;j>0;j--){const r=Math.floor(Math.random()*(j+1));[all[j],all[r]]=[all[r],all[j]]}
    if(mean(all.slice(A.length))-mean(all.slice(0,A.length))>=d)c++}return c/n}
const K=['cyc','anno','mese','corsa','tot','txt'],out={};
console.log('Soglia Bonferroni (3 metodi x 6 misure):',(0.05/18).toFixed(4));
for(const m of ['A','B','C']){
  const E=ev.filter(x=>x.m===m),V=E.filter(x=>x.violent),T=E.filter(x=>x.pol==='+');out[m]={nV:V.length,nT:T.length};
  console.log(`\nMetodo ${m}: violenti ${V.length}, successi ${T.length}`);
  for(const k of K){
    const by={};E.forEach(x=>{(by[x.name]=by[x.name]||[]).push(x)});let w=0,l=0;
    for(const n in by){const v=by[n].filter(x=>x.violent),s=by[n].filter(x=>x.pol==='+');if(!v.length||!s.length)continue;
      const d=mean(s.map(x=>x[k]))-mean(v.map(x=>x[k]));d>0?w++:d<0?l++:0}
    const p=perm(V.map(x=>x[k]),T.map(x=>x[k]));
    out[m][k]={viol:+mean(V.map(x=>x[k])).toFixed(2),succ:+mean(T.map(x=>x[k])).toFixed(2),p,meglioSucc:w,peggio:l};
    console.log(k.padEnd(6),'violenti',mean(V.map(x=>x[k])).toFixed(2).padStart(6),' successi',mean(T.map(x=>x[k])).toFixed(2).padStart(6),' p',p.toFixed(3),'  stessa persona meglio/peggio',w+'/'+l);
  }
}
fs.writeFileSync(path.join(__dirname,'corsa2.json'),JSON.stringify(out,null,1));

// Punteggio del momento = partenza (natale) + linea del ciclo in corso, regole dalle slide di Edu.
'use strict';
const fs=require('fs'),path=require('path');
const C=require('../cmp/heluo_cmp.js'),H=global.XKDGHeluo,{score}=require('./score.js');
const BR=H.BRANCHES,BR_TRI=['Kan','Gen','Gen','Zhen','Xun','Xun','Li','Kun','Kun','Dui','Qian','Qian'];
function lineScore(p,R,hexLines,ln,yearBr){
  const s={},N=R.numbers,avg=N.monthAvg,L=R.luck;
  s.pos=H.properPosition(hexLines,ln)?1:-1; s.sup=H.properSupport(hexLines,ln)?1:-1;
  s.linea=ln===5?1:ln===2?.5:ln===6||ln===3?-.5:0;
  // qi che arriva alla linea: numero diviso per le linee del suo tipo, confrontato con la media del mese
  const yang=hexLines[ln-1]===1,n=hexLines.filter(x=>x===(yang?1:0)).length;
  const r=(yang?N.heaven/avg.yang:N.earth/avg.yin); s.qi=r>=.7&&r<=1.4?1:r<.5||r>2?-1:0;
  const tri=ln<=3?H.hexOf(hexLines).lower:H.hexOf(hexLines).upper;
  s.trigramma=['heaven','earth','fame'].reduce((a,k)=>a+(tri===L[k]?1:0)-(tri===L.opposite[k]?1:0),0);
  const yt=BR_TRI[yearBr]; s.anno=['heaven','earth','fame'].reduce((a,k)=>a+(yt===L[k]?.5:0)-(yt===L.opposite[k]?.5:0),0);
  return s;
}
const load=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',f))).people;
const people=load('famous_violent.json').filter(p=>!p.weakTime).concat(load('famous_arts.json'),load('famous_politics.json').filter(p=>!/Grace Kelly \(/.test(p.name)));
const ev=[];
for(const p of people){
  const b=p.birth,P=C.pillars(b.date,b.time,b.lon,b.tz),male=p.sex==='M',R=H.fromPillars(P,male),N=C.natal('A',P,male),nat=score(p).tot;
  for(const e of p.events){
    let Pe;try{Pe=C.pillars(e.date,e.time||'12:00',b.lon,b.tz)}catch(x){continue}
    const pr=C.predict(N,Pe,b.lon);if(pr.none)continue;
    const hx=pr.phase==='XT'?N.xt:N.ht.hex,ln=pr.id.cycle[1];
    const s=lineScore(p,R,hx.lines,ln,BR.indexOf(Pe.year[1]));const cyc=Object.values(s).reduce((a,c)=>a+c,0);
    ev.push({name:p.name,pol:e.polarity,violent:!!e.violent,nat,cyc,tot:nat+cyc,what:e.what,date:e.date,ln,phase:pr.phase});
  }
}
const m=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
function perm(A,B,k){const d=m(B)-m(A),all=A.concat(B);let c=0;for(let i=0;i<20000;i++){for(let j=all.length-1;j>0;j--){const r=Math.floor(Math.random()*(j+1));[all[j],all[r]]=[all[r],all[j]]}if(m(all.slice(A.length))-m(all.slice(0,A.length))>=d)c++}return [m(A).toFixed(2),m(B).toFixed(2),(c/20000).toFixed(3)]}
const V=ev.filter(x=>x.violent),Tr=ev.filter(x=>x.pol==='+');
for(const k of ['nat','cyc','tot']) console.log(k.padEnd(4),'violenti media/successi media/p',perm(V.map(x=>x[k]),Tr.map(x=>x[k])).join(' '),'n',V.length,Tr.length);
// confronto dentro la stessa persona: momento del successo contro momento della morte violenta
const byP={};ev.forEach(x=>{(byP[x.name]=byP[x.name]||[]).push(x)});
let w=0,l=0,t=0;const diffs=[];
for(const n in byP){const v=byP[n].filter(x=>x.violent),s=byP[n].filter(x=>x.pol==='+');if(!v.length||!s.length)continue;const d=m(s.map(x=>x.cyc))-m(v.map(x=>x.cyc));diffs.push(d);d>0?w++:d<0?l++:t++}
console.log('stessa persona: ciclo migliore nei successi',w,'peggiore',l,'pari',t,'diff media',m(diffs).toFixed(2));
// partenza debole + ciclo cattivo
const q=(a,f)=>a.filter(f).length;
console.log('partenza<1 e ciclo<0: violenti',q(V,x=>x.nat<1&&x.cyc<0)+'/'+V.length,'successi',q(Tr,x=>x.nat<1&&x.cyc<0)+'/'+Tr.length);
fs.writeFileSync(path.join(__dirname,'corsa.json'),JSON.stringify(ev,null,1));

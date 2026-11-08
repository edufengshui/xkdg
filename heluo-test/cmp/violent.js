const {rows}=require('./rows.json');
const V1=[5,29,38,70,91,107,108,111,117,124,134,147,153,155,159,166,167,173,184,185,194,243,270,278,292,311,313,315,316,322];
const V2=[51,60,177,178,181,210,257,114];
const M=['A','B','C'],LV=['cycle','year','yearHex','month','day'];
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
function test(vIdx,label){
  console.log('\n'+label+' ('+vIdx.length+' eventi) vs '+rows.filter(r=>r.pol==='+').length+' eventi positivi');
  console.log('liv.        media viol.  media pos.  D(pos-viol)  p    %sfav viol  %fav viol');
  for(const m of M)for(const l of LV){
    const v=vIdx.map(i=>rows[i][m]).filter(x=>!x.none).map(x=>x.s[l]);
    const p=rows.filter(r=>r.pol==='+'&&!r[m].none).map(r=>r[m].s[l]);
    const D=mean(p)-mean(v),all=p.concat(v);let ge=0;
    for(let k=0;k<5000;k++){const s=all.slice();for(let j=s.length-1;j>0;j--){const q=Math.floor(rnd()*(j+1));[s[j],s[q]]=[s[q],s[j]];}
      if(mean(s.slice(0,p.length))-mean(s.slice(p.length))>=D)ge++;}
    console.log((m+'.'+l).padEnd(12),mean(v).toFixed(2).padStart(8),mean(p).toFixed(2).padStart(10),D.toFixed(2).padStart(10),(ge/5000).toFixed(3).padStart(7),
      (Math.round(100*v.filter(x=>x<0).length/v.length)+'%').padStart(8),(Math.round(100*v.filter(x=>x>0).length/v.length)+'%').padStart(8));
  }
}
test(V1,'VIOLENTI SULLA PERSONA');
test(V1.concat(V2),'VIOLENTI + MORTI VIOLENTE DI FAMILIARI');
console.log('\nDettaglio (punteggi ciclo/anno/anno-esagr./mese/giorno):');
for(const i of V1.concat(V2)){const r=rows[i];console.log(r.name.slice(0,16).padEnd(16),r.date,r.what.slice(0,40).padEnd(40),M.map(m=>m+' '+(r[m].none?'—':LV.map(l=>(r[m].s[l]>0?'+':'')+r[m].s[l]).join(' '))).join(' | '));}

// Punteggio natale dalle slide "Heluo Lishu" di Edu (metodo A). Ogni voce: + favorevole, − sfavorevole.
'use strict';
const fs=require('fs'),path=require('path');
const C=require('../cmp/heluo_cmp.js'),H=global.XKDGHeluo;
const EL={Qian:'M',Dui:'M',Li:'F',Zhen:'W',Xun:'W',Kan:'A',Gen:'E',Kun:'E'};
const BR_EL=['A','E','W','W','E','F','F','E','M','M','E','A'];
const GEN={W:'F',F:'E',E:'M',M:'A',A:'W'},CTL={W:'E',E:'A',A:'F',F:'M',M:'W'};
function timely(t,mb){const s=BR_EL[mb],e=EL[t];if(e===s)return 1;if(GEN[s]===e)return .5;if(CTL[s]===e||CTL[e]===s)return -1;return 0;}
function flow(lo,up){const a=EL[lo],b=EL[up];if(a===b)return .5;if(GEN[a]===b||GEN[b]===a)return 1;return -1;}
function score(p){
  const b=p.birth,P=C.pillars(b.date,b.time,b.lon,b.tz),male=p.sex==='M',R=H.fromPillars(P,male),N=R.numbers,mb=R.input.p.branches[1];
  const s={},xt=R.xianTian,ht=R.houTian.hex;
  const dH=N.devHeaven,dE=N.devEarth;
  s.direzione=Math.abs(dH-dE)<=2?-1:0;                         // deviazioni uguali = confusione
  s.totale=N.total<50||N.total>78?-1:N.total>=55?1:0;          // ~55 o sopra, non troppo alto
  const yangMonth=mb>=2&&mb<=7; s.stagione=(yangMonth?dH>dE:dE>dH)?1:-1; // numero dominante giusto per la stagione
  const ny=xt.lines.reduce((a,c)=>a+c,0); s.sesso=male?(ny>3?1:ny<3?-1:0):(ny<3?1:ny>3?-1:0);
  s.posXT=R.positionXT?1:-1; s.supXT=R.supportXT?1:-1; s.posHT=R.positionHT?.5:-.5; s.supHT=R.supportHT?.5:-.5;
  const mv=R.moving.line; s.linea=mv===5?1:mv===2?.5:mv===6?-.5:mv===3?-.5:0;
  const pv=R.prevailingXT; s.prevalenza=!pv?0:((/yang/.test(pv)&&/pure|single yang/.test(pv)?male:!male)?(R.positionXT?1:.5):-.5);
  const tris=[xt,ht,R.huXT,R.huHT].flatMap(h=>[h.upper,h.lower]),L=R.luck;
  s.fortuna=['heaven','earth','fame'].reduce((a,k)=>a+(tris.includes(L[k])?.5:0),0);
  s.opposti=-['heaven','earth','fame'].reduce((a,k)=>a+([xt.upper,xt.lower,ht.upper,ht.lower].includes(L.opposite[k])?.5:0),0);
  s.forzaXT=(timely(xt.upper,mb)+timely(xt.lower,mb))/2;
  s.flussoXT=flow(xt.lower,xt.upper)/2;
  const tot=Object.values(s).reduce((a,c)=>a+c,0);
  return {tot:Math.round(tot*10)/10,s,xt:xt.n,mv,ht:ht.n,hl:R.houTian.line,N};
}
module.exports={score};
if(require.main===module){
  const load=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',f))).people;
  const vio=load('famous_violent.json').filter(p=>!p.weakTime),oth=load('famous_arts.json').concat(load('famous_politics.json')).filter(p=>!/Grace Kelly \(/.test(p.name));
  const tragic=p=>p.events.some(e=>e.violent&&/ucciso|assassin|morto|muore|morte|uccide|incidente|suicid|schianto|precipit|annega|fucilat|giustiziat/i.test(e.what));
  const rows=[];vio.forEach(p=>rows.push({p,g:'V',r:score(p)}));oth.forEach(p=>rows.push({p,g:'O',r:score(p)}));
  const m=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const V=rows.filter(x=>x.g==='V').map(x=>x.r.tot),O=rows.filter(x=>x.g==='O').map(x=>x.r.tot);
  const d=m(O)-m(V);let c=0,all=V.concat(O);for(let i=0;i<20000;i++){const a=all.slice().sort(()=>Math.random()-.5);if(m(a.slice(V.length))-m(a.slice(0,V.length))>=d)c++;}
  console.log('violenti',V.length,'media',m(V).toFixed(2),'| altri',O.length,'media',m(O).toFixed(2),'| diff',d.toFixed(2),'p',(c/20000).toFixed(3));
  // per voce
  Object.keys(rows[0].r.s).forEach(k=>{const v=m(rows.filter(x=>x.g==='V').map(x=>x.r.s[k])),o=m(rows.filter(x=>x.g==='O').map(x=>x.r.s[k]));console.log(k.padEnd(11),'V',v.toFixed(2),'O',o.toFixed(2))});
  const key=JSON.parse(fs.readFileSync(path.join(__dirname,'chiave-NON-APRIRE.json')));
  console.log('\n12 schede');
  Object.keys(key).forEach(c=>{const x=rows.find(r=>r.p.name===key[c]);console.log(c,key[c].padEnd(20),x.r.tot.toString().padStart(5),JSON.stringify(x.r.s))});
  fs.writeFileSync(path.join(__dirname,'punteggi.json'),JSON.stringify(rows.map(x=>({name:x.p.name,g:x.g,tot:x.r.tot,s:x.r.s})),null,1));
}

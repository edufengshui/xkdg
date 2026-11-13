const {pillars}=require('./heluo_cmp.js');global.HeluoNaJia=require('../../heluo-najia.js');global.XKDG_HELUO_SCORES=require('../../heluo-scores.js');
const DS=require('../../heluo-ds.js');const H=global.XKDGHeluo;
const P={thao:['1987-02-19','20:00',106.66,'Asia/Ho_Chi_Minh',false,16.37],marx:['1818-05-05','02:00',6.64,'LMT',true,-0.13],king:['1929-01-15','12:00',-84.39,'America/New_York',true,-84.39],churchill:['1874-11-30','01:30',-1.36,'LMT',true,-0.13],hitler:['1889-04-20','18:30',13.03,'Europe/Vienna',true,16.37],diana:['1961-07-01','19:45',0.5,'Europe/London',false,-0.13],edu:['1960-08-18','10:00',11.72,'Europe/Rome',true,12.07]};
const ctxs={};for(const k in P){const [d,t,lon,tz,m]=P[k];const Pn=pillars(d,t,lon,tz);ctxs[k]=DS.context(H.fromPillars(Pn,m),Pn,m);}
function day(k,iso){const [y,mo,d]=iso.split('-').map(Number);const lon=P[k][5];const Pe=DS.pillarsTstNoon(y,mo,d,lon);const th=DS.thread(ctxs[k],Pe,lon,'legal');return DS.legacyOfDay(DS.filmOfDay(th),th);}
const ev=[['thao','2026-09-22'],['marx','1864-05-09'],['marx','1863-11-30'],['king','1967-06-07'],['churchill','1921-01-26'],['churchill','1921-06-29'],['hitler','1911-03-15'],['diana','1979-07-01']];
for(const [k,iso] of ev){const r=day(k,iso);console.log(k,iso,r?(r.affine?'AFFINE ':'')+r.text:'—');}
// frequenza su un anno
for(const k of ['thao','edu','king']){let n=0,a=0,N=0;for(let t=Date.UTC(2026,0,1);t<Date.UTC(2027,0,1);t+=864e5){const D=new Date(t);const r=day(k,D.toISOString().slice(0,10));N++;if(r){n++;if(r.affine)a++;}}console.log('freq',k,n,'/',N,'affine',a);}
// finestra intorno al 22/9 per Thao
let s='';for(let t=Date.UTC(2026,8,10);t<=Date.UTC(2026,9,10);t+=864e5){const iso=new Date(t).toISOString().slice(0,10);const r=day('thao',iso);s+=iso.slice(5)+(r?(r.affine?'A':'L'):'.')+' ';}console.log(s);

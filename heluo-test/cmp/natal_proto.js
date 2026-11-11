// Prototype of part A: node natal_proto.js → writes HTML for several charts
const fs=require('fs'),path=require('path'),X=require('path').join(__dirname,'..','..');
const {pillars}=require('./heluo_cmp.js');
global.HeluoNaJia=require(X+'/heluo-najia.js');global.XKDG_HELUO_SCORES=require(X+'/heluo-scores.js');
global.window=global;require(X+'/heluo-texts.js');
const src=fs.readFileSync(X+'/app-bazi.js','utf8');const m=src.match(/const HEX_NAMES = (\{[^}]*\})/);global.HEX_NAMES=eval('('+m[1]+')');
require(X+'/heluo-ds.js');global.XKDG_HELUO_READINGS=require(X+'/heluo-readings.js');const NA=require(X+'/heluo-natal.js');const H=global.XKDGHeluo,DS=global.XKDGHeluoDSCore;
const P={
 gates:['Bill Gates','1955-10-28','22:00',-122.33,'America/Los_Angeles',true],
 jobs:['Steve Jobs','1955-02-24','19:15',-122.42,'America/Los_Angeles',true],
 buffett:['Warren Buffett','1930-08-30','11:00',-95.94,'America/Chicago',true],
 rockefeller:['John D. Rockefeller','1839-07-08','23:50',-76.06,'America/New_York',true],
};
const who=process.argv[2]||'gates',[name,d,t,lon,tz,male]=P[who];
const Pn=pillars(d,t,lon,tz),R=H.fromPillars(Pn,male),A=NA.analyze(R,Pn,male);
const now=new Date(),Pe=DS.pillarsTstNoon(now.getUTCFullYear(),now.getUTCMonth()+1,now.getUTCDate(),lon);
let nb='';try{nb=NA.nowHtml(A,Pe,lon);}catch(e){nb='<p>now: '+e.message+'</p>';}
if(process.argv.includes('txt')){A.cycles.forEach(c=>console.log(c.c.from+'-'+c.c.to,c.y1+'-'+c.y2,c.phase,c.hx.n,'l'+c.line,c.L.branch,c.r,c.score,c.why.join('; '),'|',c.tm.note.join(','),c.flags.join(';')));A.synth.forEach(s=>console.log('#',s[0],':',s[1]));}
fs.writeFileSync(require('path').join(__dirname,who+'.html'),'<h2 style="font-family:system-ui">'+name+'</h2><div style="font-family:system-ui">'+NA.html(A,nb)+'</div>');

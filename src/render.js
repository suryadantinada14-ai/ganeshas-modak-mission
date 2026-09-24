import { WORLD, AI, CHARACTER, obstacles, hidingSpots, interactions, getZone, hasLineOfSight, nearestInteraction } from './engine.js';

import {currentObjective} from './guidance.js';
const C={bg:'#2b1120',floor:'#f4d7a2',wall:'#6f263d',gold:'#f4c45f',deep:'#3a1424',pink:'#d85874',green:'#557f52',cream:'#fff2d8',blue:'#4e7898',shadow:'rgba(45,16,28,.25)'};
const rr=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
function text(c,s,x,y,size=18,align='center'){c.font=`700 ${size}px system-ui`;c.textAlign=align;c.fillText(s,x,y);}
function glowCircle(c,x,y,r,col){c.save();c.shadowBlur=18;c.shadowColor=col;c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore();}

function drawFloor(c){
  c.fillStyle=C.floor;c.fillRect(0,0,WORLD.width,WORLD.height);
  const floors=[['#f4d5a1',26,26,474,444],['#c8a985',524,26,516,444],['#abbcab',1064,26,510,444],['#e9bb8b',26,494,474,480],['#dbbbab',524,494,516,480],['#b9c5bd',1064,494,510,480]];
  for(const [col,x,y,w,h] of floors){c.fillStyle=col;c.fillRect(x,y,w,h);}
  c.globalAlpha=.13;c.strokeStyle=C.wall;c.lineWidth=1;
  for(let x=40;x<WORLD.width;x+=80){c.beginPath();c.moveTo(x,0);c.lineTo(x,WORLD.height);c.stroke();}
  for(let y=40;y<WORLD.height;y+=80){c.beginPath();c.moveTo(0,y);c.lineTo(WORLD.width,y);c.stroke();}c.globalAlpha=1;
  // Woven rugs distinguish the lounge and puja floor from courtyard stone.
  for(const [x,y,w,h] of [[75,220,360,210],[580,730,420,190]]){
    c.fillStyle='#8f3d52';rr(c,x,y,w,h,10);c.strokeStyle=C.gold;c.lineWidth=3;c.strokeRect(x+12,y+12,w-24,h-24);
    c.globalAlpha=.2;for(let xx=x+30;xx<x+w-20;xx+=32){c.beginPath();c.moveTo(xx,y+18);c.lineTo(xx,y+h-18);c.stroke();}c.globalAlpha=1;
  }
  for(let y=90;y<440;y+=70){c.strokeStyle='#56776a';c.lineWidth=3;c.beginPath();c.moveTo(1130,y);c.lineTo(1150,y+15);c.stroke();}
  const zones=[['PUJA ROOM',50,60],['STORAGE',550,60],['SECRET PASSAGE',1090,60],['FESTIVAL COURTYARD',50,530],['LIVING ROOM',550,530],['KITCHEN',1090,530]];
  c.fillStyle='#603044';zones.forEach(([label,x,y])=>text(c,label,x,y,15,'left'));
}
function drawRangoli(c,x,y,done){
  c.save();c.translate(x,y);for(let i=0;i<12;i++){c.rotate(Math.PI/6);c.fillStyle=[C.pink,C.gold,C.green,C.blue][i%4];c.beginPath();c.ellipse(0,36,14,31,0,0,Math.PI*2);c.fill();}
  c.fillStyle=C.cream;c.beginPath();c.arc(0,0,28,0,Math.PI*2);c.fill();if(done){c.shadowBlur=24;c.shadowColor=C.gold;c.strokeStyle=C.gold;c.lineWidth=7;c.beginPath();c.arc(0,0,70,0,Math.PI*2);c.stroke();}c.restore();
}
function diya(c,x,y,t,lit=true){
 c.save();c.translate(x,y);c.fillStyle='#9b503a';c.beginPath();c.ellipse(0,4,12,6,0,0,7);c.fill();c.strokeStyle=C.gold;c.stroke();
 if(lit){c.shadowBlur=18;c.shadowColor='#ffc45c';c.fillStyle='#ffd87b';c.beginPath();c.ellipse(Math.sin(t*4+x)*1.5,-5,4,9+Math.sin(t*5+y),0,0,7);c.fill();c.fillStyle='#fff4bd';c.beginPath();c.ellipse(0,-3,2,5,0,0,7);c.fill();}c.restore();
}
function flower(c,x,y,r=8){c.fillStyle=C.pink;for(let i=0;i<5;i++){const a=i*Math.PI*.4;c.beginPath();c.arc(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65,r*.5,0,7);c.fill();}c.fillStyle=C.gold;c.beginPath();c.arc(x,y,r*.3,0,7);c.fill();}
function drawDecor(c,celebrate,t){
 for(const [x1,x2,y] of [[50,450,90],[550,1010,90],[1090,1540,90],[50,470,560],[550,1000,565],[1100,1530,580]]){
  c.strokeStyle=C.green;c.lineWidth=3;c.beginPath();c.moveTo(x1,y);c.quadraticCurveTo((x1+x2)/2,y+65,x2,y);c.stroke();
  for(let x=x1+15;x<x2;x+=22){const u=(x-x1)/(x2-x1),yy=y+120*u*(1-u);c.fillStyle=Math.floor(x/22)%2?C.gold:'#d87a37';c.beginPath();c.arc(x,yy,6,0,7);c.fill();}
 }
 drawRangoli(c,275,585,celebrate);
 for(const [x,y] of [[80,450],[470,450],[1080,450],[1540,450],[70,930],[1530,930],[110,200],[315,200]])diya(c,x,y,t);
 for(const [x,y] of [[90,70],[450,70],[550,900],[990,580],[1140,910],[1490,550]]){c.fillStyle='#9b513b';rr(c,x-13,y-8,26,22,6);flower(c,x,y-15,14);}
 // Drifted petals are decorative, with no collision or distracting screen shake.
 for(let i=0;i<14;i++){const x=55+(i*137+Math.sin(t*.2+i)*12)%1490,y=60+(i*83+t*7)%865;c.fillStyle='#b940604d';c.beginPath();c.ellipse(x,y,4,2,t+i,0,7);c.fill();}
}
function drawObstacle(c,o,game){
 if(o.kind==='gate'){
  c.fillStyle='#72404b';if(!game.secretPassage){c.fillRect(o.x,o.y,o.w,25);c.fillRect(o.x,o.y+65,o.w,25);c.fillStyle='#493545';c.fillRect(o.x,o.y+25,o.w,40);c.fillStyle=C.cream;text(c,'↔',o.x+12,o.y+51,16);}
  else {c.strokeStyle='#66916c';c.lineWidth=3;c.strokeRect(o.x-3,o.y,30,90);}return;
 }
 if(o.kind==='wall'){c.fillStyle='#6e3446';c.fillRect(o.x,o.y,o.w,o.h);c.fillStyle='#9b5260';c.fillRect(o.x,o.y,o.w,Math.min(6,o.h));return;}
 c.save();c.shadowColor=C.shadow;c.shadowBlur=10;c.shadowOffsetY=7;c.fillStyle=o.kind==='shrine'?C.gold:o.kind==='sofa'?'#8e4059':o.kind==='counter'?'#f0e1c4':'#98704f';rr(c,o.x,o.y,o.w,o.h,9);c.restore();
 c.strokeStyle='#5d304430';c.lineWidth=2;c.strokeRect(o.x+6,o.y+6,o.w-12,o.h-12);
 if(o.kind==='shrine'){c.fillStyle=C.deep;text(c,'ॐ',o.x+o.w/2,o.y+47,34);diya(c,o.x+24,o.y+42,0);diya(c,o.x+o.w-24,o.y+42,1);}
 if(o.kind==='sofa'){for(let x=o.x+18;x<o.x+o.w-30;x+=58){c.fillStyle='#d47c79';rr(c,x,o.y+20,45,40,8);c.fillStyle=C.gold;text(c,'✦',x+22,o.y+45,16);}}
 if(o.kind==='shelf'||o.kind==='box'){for(let x=o.x+16;x<o.x+o.w-20;x+=45){c.fillStyle='#c49662';rr(c,x,o.y+14,30,35,3);c.strokeStyle='#e4b974';c.strokeRect(x+3,o.y+18,24,27);}}
 if(o.kind==='counter'){c.fillStyle='#967b65';c.beginPath();c.ellipse(o.x+40,o.y+35,24,18,0,0,7);c.fill();c.fillStyle=C.cream;for(let i=0;i<3;i++){c.beginPath();c.arc(o.x+30+i*10,o.y+30,5,0,7);c.fill();}flower(c,o.x+o.w-30,o.y+30,14);}
 if(o.kind==='pandal'){c.fillStyle='#a94358';rr(c,o.x+9,o.y+8,o.w-18,30,6);c.fillStyle=C.gold;text(c,'✦ ✦ ✦',o.x+o.w/2,o.y+29,18);}
}
function drawModak(c,item,t){
  const glow=item.type==='golden'||item.type==='secret';c.save();c.translate(item.x,item.y);const s=1+Math.sin(t*4+item.x)*.05;c.scale(s,s);if(glow){c.shadowBlur=22;c.shadowColor=C.gold;}
  c.fillStyle=item.type==='secret'?'#fff0a8':item.type==='special'?'#f4a8a0':C.gold;c.beginPath();c.moveTo(0,-22);c.bezierCurveTo(-5,-12,-22,-8,-19,8);c.quadraticCurveTo(0,29,19,8);c.bezierCurveTo(22,-8,5,-12,0,-22);c.fill();
  c.strokeStyle='#9a5b31';c.lineWidth=2;for(let i=-10;i<=10;i+=10){c.beginPath();c.moveTo(0,-17);c.quadraticCurveTo(i,0,i,12);c.stroke();}c.restore();
}
function drawPickup(c,item,t){if(item.kind==='modak')return drawModak(c,item,t);c.save();c.translate(item.x,item.y);c.shadowBlur=10;c.shadowColor=C.gold;c.fillStyle=item.kind==='flowers'?C.pink:item.kind==='durva'?C.green:item.kind==='diyas'?C.gold:C.blue;c.beginPath();c.arc(0,0,14+Math.sin(t*3)*2,0,Math.PI*2);c.fill();c.fillStyle=C.deep;text(c,item.kind==='flowers'?'✿':item.kind==='durva'?'❧':item.kind==='diyas'?'✦':'◆',0,6,17);c.restore();}
function drawHide(c,h,game){
 c.save();c.fillStyle='#487060';rr(c,h.x-29,h.y-23,58,15,4);for(let x=-24;x<=24;x+=12){c.fillStyle=x%24?C.gold:'#dd7954';for(let y=0;y<40;y+=10){c.beginPath();c.arc(h.x+x,h.y-20+y,4,0,7);c.fill();}}
 const near=Math.hypot(game.player.x-h.x,game.player.y-h.y)<h.r;c.globalAlpha=near?.9:.4;c.strokeStyle='#315d40';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.arc(h.x,h.y,h.r*.62,0,7);c.stroke();c.setLineDash([]);if(near){c.fillStyle='#214d32';text(c,'HIDE',h.x,h.y+45,12);}c.restore();
}
function drawInteract(c,i,game){
 c.save();const near=nearestInteraction(game).interaction?.id===i.id;c.fillStyle=near?'#fff0c4':'#f6ddb7';c.strokeStyle=near?'#7b382a':'#937358';c.lineWidth=near?3:1;
 c.beginPath();c.arc(i.x,i.y,near?25:20,0,7);c.fill();c.stroke();c.fillStyle='#57263a';
 const icons={bell:'♧',pot:'◒','festival-box':'▣','diya-puzzle':'✦',rangoli:'✿','mushak-switch':'↔','secret-lever':'⚑'};
 text(c,icons[i.id],i.x,i.y+7,24);
 if(near){c.fillStyle='#321624';rr(c,i.x-80,i.y-52,160,23,6);c.fillStyle=C.cream;text(c,i.label,i.x,i.y-36,11);}
 if(i.id==='festival-box'){c.fillStyle=C.deep;text(c,game.puzzle.box?'UNLOCKED':'DIYA → FLOWER → DURVA',i.x,i.y+38,11);}
 if(i.id==='diya-puzzle'){c.fillStyle=C.deep;text(c,game.puzzle.diya?'SHORTCUT OPEN':'E → S → W → N',i.x,i.y+38,11);}
 if(i.id==='secret-lever'&&game.puzzle.secretLever){c.fillStyle='#28573e';text(c,'OPEN',i.x,i.y+38,11);}
 c.restore();
}
function drawGanesha(c,p,t,hidden=false){
  c.save();c.translate(p.x,p.y);c.globalAlpha=hidden?.28:1;const bob=Math.sin(p.anim||t*2)*2;c.translate(0,bob);
  c.fillStyle='#32162422';c.beginPath();c.ellipse(0,28,27,10,0,0,7);c.fill();c.fillStyle='#e98f6f';c.beginPath();c.arc(0,-8,18,0,Math.PI*2);c.fill();
  c.fillStyle='#f0a37f';c.beginPath();c.ellipse(0,10,13,24,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(-17,-8,12,17,-.5,0,Math.PI*2);c.ellipse(17,-8,12,17,.5,0,Math.PI*2);c.fill();
  c.strokeStyle='#f0a37f';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(2,2);c.quadraticCurveTo(8,18,-3,26);c.stroke();
  c.fillStyle=C.gold;c.beginPath();c.moveTo(-13,-25);c.lineTo(0,-42);c.lineTo(13,-25);c.closePath();c.fill();
  c.fillStyle='#fff5c9';c.beginPath();c.moveTo(-12,1);c.lineTo(-10,11);c.lineTo(-7,2);c.fill();c.fillStyle='#a92f4c';c.fillRect(-1,-20,3,7);c.fillStyle='#7a263d';c.fillRect(-16,16,32,18);c.fillStyle='#2e1721';c.beginPath();c.arc(-6,-10,2.5,0,7);c.arc(6,-10,2.5,0,7);c.fill();c.restore();
}
function drawMushak(c,m,t,active){c.save();c.translate(m.x,m.y);const bob=Math.sin(t*7)*1.5;c.translate(0,bob);c.fillStyle=active?'#4b5564':'#69707c';c.beginPath();c.ellipse(0,0,14,9,0,0,7);c.ellipse(11,-6,7,7,0,0,7);c.fill();c.strokeStyle='#69707c';c.lineWidth=2;c.beginPath();c.moveTo(-12,1);c.quadraticCurveTo(-28,-8,-30,7);c.stroke();c.fillStyle='#111';c.beginPath();c.arc(13,-7,1.5,0,7);c.fill();c.restore();}
function drawParvati(c,p,t){c.save();c.translate(p.x,p.y);c.rotate(0);const bob=Math.sin(t*3)*1.5;c.translate(0,bob);c.fillStyle='#c94f68';c.beginPath();c.moveTo(-23,28);c.lineTo(-14,-7);c.quadraticCurveTo(0,-27,14,-7);c.lineTo(23,28);c.closePath();c.fill();c.fillStyle='#d99772';c.beginPath();c.arc(0,-21,15,0,7);c.fill();c.fillStyle=C.gold;c.beginPath();c.arc(0,-38,11,0,Math.PI);c.fill();c.fillStyle='#30151c';c.beginPath();c.arc(-5,-23,2,0,7);c.arc(5,-23,2,0,7);c.fill();if(p.smile){c.strokeStyle='#7d3341';c.lineWidth=2;c.beginPath();c.arc(0,-17,5,0,Math.PI);c.stroke();}c.restore();}
function drawVision(c,p,game){
 c.save();c.fillStyle=p.state===AI.ALERT?'rgba(195,40,61,.20)':p.state===AI.CALM?'rgba(81,119,66,.075)':'rgba(224,156,29,.19)';c.beginPath();c.moveTo(p.x,p.y);
 for(let i=0;i<=40;i++){
  const a=p.dir-.78+i*1.56/40;let lo=0,hi=330;
  for(let j=0;j<9;j++){const r=(lo+hi)/2;const q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};if(hasLineOfSight(p,q,game))lo=r;else hi=r;}
  c.lineTo(p.x+Math.cos(a)*lo,p.y+Math.sin(a)*lo);
 }c.closePath();c.fill();c.restore();
}
function parvatiFeedback(c,p){
 const labels={CALM:'● SAFE',SUSPICIOUS:'? SUSPICIOUS',ALERT:'! ALERT',SEARCH:'⌕ SEARCH',RETURN:'↶ RETURN'};
 c.save();c.fillStyle=p.state===AI.ALERT?'#8e2039':p.state===AI.CALM?'#28503b':'#67491b';rr(c,p.x-64,p.y-77,128,22,7);c.fillStyle=C.cream;text(c,labels[p.state],p.x,p.y-61,11);
 if(p.speechTime>0||p.dwell>0){const msg=p.speechTime>0?p.speech:p.task;c.fillStyle='#fff4dceF';rr(c,p.x-99,p.y-110,198,26,7);c.fillStyle=C.deep;text(c,msg,p.x,p.y-92,11);}c.restore();
}
function objectiveMarker(c,game,camX,camY,vw,vh){
 if(game.phase!=='playing')return;const goal=currentObjective(game),e=game.character==='mushak'?game.mushak:game.player;
 if(game.character==='mushak'&&!game.secretFound){Object.assign(goal,{x:1390,y:game.puzzle.secretLever?180:280});}
 const x=Math.max(camX+28,Math.min(camX+vw-28,goal.x)),y=Math.max(camY+150,Math.min(camY+vh-55,goal.y-50));
 if(Math.hypot(e.x-goal.x,e.y-goal.y)<55)return;
 c.save();c.translate(x,y);c.fillStyle='#402236';c.beginPath();c.arc(0,0,17,0,7);c.fill();c.fillStyle=C.gold;text(c,'◆',0,6,16);c.restore();
}

export function render(canvas,ctx,game,time=0){
  if(game.reducedMotion)time=0;
  const dpr=Math.min(devicePixelRatio||1,2);const rect=canvas.getBoundingClientRect();const w=Math.max(320,rect.width),h=Math.max(240,rect.height);
  if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(game.celebration)return renderCelebration(canvas,ctx,game,time,w,h);
  const focus=game.character===CHARACTER.ganesha?game.player:game.mushak;const scale=Math.max(.72,Math.min(w/900,h/590));const vw=w/scale,vh=h/scale;
  const targetX=Math.max(0,Math.min(WORLD.width-vw,focus.x-vw/2)),targetY=Math.max(0,Math.min(WORLD.height-vh,focus.y-vh/2));
  const smooth=game.reducedMotion?1:.15;game.camera??={x:targetX,y:targetY};game.camera.x+=(targetX-game.camera.x)*smooth;game.camera.y+=(targetY-game.camera.y)*smooth;
  const camX=game.camera.x,camY=game.camera.y;
  ctx.save();ctx.scale(scale,scale);ctx.translate(-camX,-camY);drawFloor(ctx);drawDecor(ctx,game.puzzle.rangoli,game.reducedMotion?0:time);
  drawVision(ctx,game.parvati,game);obstacles.forEach(o=>drawObstacle(ctx,o,game));hidingSpots.forEach(h=>drawHide(ctx,h,game));interactions.forEach(i=>drawInteract(ctx,i,game));
  for(const n of game.noise){ctx.save();ctx.globalAlpha=Math.max(0,n.life/1.15)*.45;ctx.strokeStyle=C.gold;ctx.lineWidth=4;ctx.beginPath();ctx.arc(n.x,n.y,n.radius*(1-n.life/1.15),0,7);ctx.stroke();ctx.restore();}
  game.collectibles.filter(i=>i.active).forEach(i=>drawPickup(ctx,i,time));drawMushak(ctx,game.mushak,time,game.character===CHARACTER.mushak);drawParvati(ctx,game.parvati,time);drawGanesha(ctx,game.player,time,game.player.hidden);parvatiFeedback(ctx,game.parvati);objectiveMarker(ctx,game,camX,camY,vw,vh);
  for(const p of game.particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fill();}ctx.globalAlpha=1;
  for(const p of game.popups){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=C.deep;text(ctx,p.text,p.x,p.y,17);}ctx.globalAlpha=1;
  if(game.celebration){ctx.save();ctx.globalAlpha=.18+.08*Math.sin(time*4);ctx.fillStyle=C.gold;ctx.fillRect(camX,camY,vw,vh);ctx.restore();}
  ctx.restore();return {zone:getZone(focus.x,focus.y),camera:{x:camX,y:camY,scale}};
}

export function renderStory(canvas,ctx,scene,t=0){
 const w=canvas.clientWidth||400,h=canvas.clientHeight||160;canvas.width=w*2;canvas.height=h*2;ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#edc18e';ctx.fillRect(0,0,w,h);
 const scale=Math.min(w/440,h/160);ctx.translate(w/2,h/2);ctx.scale(scale,scale);
 ctx.strokeStyle='#72945b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-220,-60);ctx.quadraticCurveTo(0,0,220,-60);ctx.stroke();for(let x=-195;x<220;x+=30)flower(ctx,x,-45,9);
 drawRangoli(ctx,0,58,false);diya(ctx,-175,45,t);diya(ctx,175,45,t);
 drawGanesha(ctx,{x:50,y:0,anim:0},0);if(scene<3)drawParvati(ctx,{x:-85,y:0},0);drawMushak(ctx,{x:105,y:48},0,false);
 ctx.fillStyle='#8b5746';ctx.beginPath();ctx.ellipse(-40,45,35,10,0,0,7);ctx.fill();for(let i=0;i<3;i++){ctx.save();ctx.translate(-60+i*20,39);ctx.scale(.5,.5);drawModak(ctx,{x:0,y:0,type:'normal'},0);ctx.restore();}
}
function renderCelebration(canvas,c,game,time,w,h){
 const t=game.reducedMotion?12:game.celebrationTime;
 c.fillStyle='#351725';c.fillRect(0,0,w,h);const sc=Math.min(w/740,h/510);c.save();c.translate(w/2,h*.49);c.scale(sc,sc);
 c.fillStyle='#efd1a0';rr(c,-340,-200,680,410,18);c.fillStyle='#914053';rr(c,-315,-180,630,50,8);
 for(let i=0;i<17;i++)flower(c,-290+i*36,-140,11);
 drawRangoli(c,0,80,t>3);
 for(let i=0;i<10;i++)diya(c,-270+i*60,175,time,t>1+i*.23);
 // The last diya is placed by Ganesha before the lights travel around the pandal.
 const gx=t<1?-45+t*20:-25;drawGanesha(c,{x:gx,y:25,anim:0},0);diya(c,0,53,time,t>.7);
 if(t>4)drawMushak(c,{x:Math.max(75,260-(t-4)*70),y:65},time,true);
 if(t>5)drawParvati(c,{x:Math.max(-115,-290+(t-5)*65),y:20,smile:t>8},0);
 c.fillStyle='#aa735a';c.beginPath();c.ellipse(-53,82,24,8,0,0,7);c.fill();
 if(t>7){c.fillStyle=C.deep;text(c,t<9?'“The modak plate is empty?”':'Maa Parvati smiles. “Come, let us celebrate.”',0,-90,18);}
 if(t>3&&!game.reducedMotion){for(let i=0;i<35;i++){c.fillStyle=i%2?C.pink:C.gold;c.beginPath();c.ellipse(-300+(i*83)%600,-150+(time*40+i*27)%320,4,2,time,0,7);c.fill();}}
 c.restore();return {zone:'GANPATI BAPPA MORYA!',camera:{x:0,y:0,scale:sc}};
}

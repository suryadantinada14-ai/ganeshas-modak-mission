export const WORLD = { width: 1600, height: 1000 };
export const CHARACTER = { ganesha: 'ganesha', mushak: 'mushak' };
export const TARGETS = {modaks:5,flowers:3,durva:3,diyas:2,rangoli:1,decorations:3};
export const AI = { CALM:'CALM', SUSPICIOUS:'SUSPICIOUS', ALERT:'ALERT', SEARCH:'SEARCH', RETURN:'RETURN' };

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
const rectHit=(x,y,r,o)=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h;
const pointRect=(x,y,o)=>x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h;

export const obstacles = [
  {x:0,y:0,w:1600,h:26,kind:'wall'},{x:0,y:974,w:1600,h:26,kind:'wall'},
  {x:0,y:0,w:26,h:1000,kind:'wall'},{x:1574,y:0,w:26,h:1000,kind:'wall'},
  {x:500,y:0,w:24,h:330,kind:'wall'},{x:500,y:410,w:24,h:240,kind:'wall'},{x:500,y:760,w:24,h:214,kind:'wall'},
  {x:1040,y:0,w:24,h:260,kind:'wall'},{x:1040,y:260,w:24,h:90,kind:'gate'},{x:1040,y:350,w:24,h:300,kind:'wall'},{x:1040,y:760,w:24,h:214,kind:'wall'},
  {x:26,y:470,w:300,h:24,kind:'wall'},{x:405,y:470,w:290,h:24,kind:'wall'},{x:790,y:470,w:240,h:24,kind:'wall'},
  {x:1080,y:470,w:494,h:24,kind:'wall'},
  {x:120,y:120,w:180,h:70,kind:'shrine'},{x:120,y:300,w:90,h:52,kind:'table'},
  {x:610,y:120,w:220,h:72,kind:'shelf'},{x:850,y:300,w:120,h:82,kind:'box'},
  {x:585,y:610,w:220,h:80,kind:'sofa'},{x:840,y:690,w:95,h:150,kind:'pillar'},
  {x:1180,y:610,w:170,h:90,kind:'counter'},{x:1370,y:760,w:130,h:80,kind:'counter'},
  {x:120,y:650,w:120,h:120,kind:'pandal'},{x:310,y:720,w:90,h:150,kind:'display'}
];

export const hidingSpots=[
  {id:'curtain',x:930,y:590,r:58,label:'Curtain'},
  {id:'pillar',x:885,y:640,r:55,label:'Pillar'},
  {id:'display',x:352,y:700,r:60,label:'Festival display'},
  {id:'storage-screen',x:690,y:255,r:58,label:'Flower screen'}
];

export const interactions=[
  {id:'bell',x:1270,y:560,r:52,type:'noise',label:'Ring brass bell'},
  {id:'pot',x:1450,y:690,r:48,type:'noise',label:'Tap metal pot'},
  {id:'festival-box',x:905,y:255,r:68,type:'boxPuzzle',label:'Festival box puzzle'},
  {id:'diya-puzzle',x:385,y:250,r:66,type:'diyaPuzzle',label:'Diya sequence'},
  {id:'rangoli',x:275,y:585,r:75,type:'rangoli',label:'Complete rangoli'},
  {id:'mushak-switch',x:560,y:400,r:70,type:'switchMushak',label:'Switch character'},
  {id:'secret-lever',x:1390,y:280,r:55,type:'secretLever',label:'Tiny passage lever',mushakOnly:true}
];

const baseCollectibles=()=>[
  {id:'m1',kind:'modak',type:'normal',points:10,x:340,y:890,active:true,label:'Normal Modak'},
  {id:'m2',kind:'modak',type:'normal',points:10,x:750,y:885,active:true,label:'Normal Modak'},
  {id:'m6',kind:'modak',type:'normal',points:10,x:330,y:320,active:true,label:'Normal Modak'},
  {id:'m3',kind:'modak',type:'special',points:25,x:1470,y:905,active:true,label:'Special Modak'},
  {id:'m4',kind:'modak',type:'golden',points:50,x:960,y:430,active:false,label:'Golden Modak'},
  {id:'m5',kind:'modak',type:'secret',points:100,x:1450,y:180,active:false,label:'Secret Modak'},
  {id:'f1',kind:'flowers',points:20,x:190,y:410,active:true,label:'Flower basket'},
  {id:'f2',kind:'flowers',points:20,x:670,y:410,active:true,label:'Flower basket'},
  {id:'f3',kind:'flowers',points:20,x:1240,y:410,active:true,label:'Flower basket'},
  {id:'d1',kind:'durva',points:20,x:420,y:120,active:true,label:'Durva'},
  {id:'d2',kind:'durva',points:20,x:770,y:230,active:true,label:'Durva'},
  {id:'d3',kind:'durva',points:20,x:1100,y:380,active:true,label:'Durva'},
  {id:'l1',kind:'diyas',points:25,x:95,y:555,active:true,label:'Diya'},
  {id:'l2',kind:'diyas',points:25,x:1010,y:915,active:true,label:'Diya'},
  {id:'c1',kind:'decorations',points:15,x:465,y:900,active:true,label:'Decoration'},
  {id:'c2',kind:'decorations',points:15,x:970,y:410,active:true,label:'Decoration'},
  {id:'c3',kind:'decorations',points:15,x:1510,y:420,active:true,label:'Decoration'}
];

export function createGame(seed=1){
  return {
    seed, tutorial:{move:false,hide:false,interact:false,switch:false}, events:[], puzzleMistakes:{}, celebrationTime:0, secretFound:false, penaltyTime:0, phase:'menu', paused:false, elapsed:0, remaining:480, countdownExpired:false,
    score:0, caughtCount:0, stealthBroken:false, character:CHARACTER.ganesha,
    player:{x:210,y:850,r:20,hidden:false,run:false,grace:0,anim:0,checkpoint:{x:210,y:850}},
    mushak:{x:250,y:860,r:12,unlocked:true, deployed:false, anim:0},
    parvati:{x:1230,y:850,r:22,dir:-Math.PI/2,state:AI.CALM,stateTime:0,awareness:0,target:null,lastKnown:null,patrolIndex:0,path:[],pathIndex:0,pathTarget:null,pathRefresh:0,dwell:0,task:'Checking modaks',speech:'',speechTime:0},
    patrol:[{x:1260,y:850},{x:1280,y:560},{x:890,y:560},{x:650,y:820},{x:400,y:560},{x:350,y:350},{x:760,y:360},{x:920,y:420}],
    collectibles:baseCollectibles(),
    objectives:{modaks:0,flowers:0,durva:0,diyas:0,rangoli:0,decorations:0},
    puzzle:{box:false,diya:false,rangoli:false,secretLever:false,bell:false},
    secretPassage:false,
    noise:[], particles:[], popups:[], messages:[],
    modal:null, celebration:false, completed:false, final:null
  };
}

export function isBlocked(x,y,r=20, character=CHARACTER.ganesha, game=null){
  if(x-r<26||x+r>1574||y-r<26||y+r>974)return true;
  if(character===CHARACTER.mushak){
    // Mushak can slip through the small secret-passage gate, but not phase
    // through ordinary room walls or furniture.
    return obstacles.some(o=>o.kind!=='gate' && rectHit(x,y,r,o));
  }
  return obstacles.some(o=>{
    if(o.kind==='gate' && game?.secretPassage) return false;
    return rectHit(x,y,r,o);
  });
}

export function moveCharacter(game,dx,dy,dt,run=false){
  if(game.phase!=='playing'||game.paused||game.modal||game.completed)return;
  dt=Math.max(0,Math.min(dt,.05));
  const entity=game.character===CHARACTER.ganesha?game.player:game.mushak;
  if(game.character===CHARACTER.ganesha && game.player.hidden && (dx||dy)) return;
  if(!dx&&!dy){ entity.run=false; return; }
  const n=norm(dx,dy), base=game.character===CHARACTER.ganesha?150:185, speed=base*(run&&game.character===CHARACTER.ganesha?1.65:1);
  const nx=entity.x+n.x*speed*dt, ny=entity.y+n.y*speed*dt;
  if(!isBlocked(nx,entity.y,entity.r,game.character,game)) entity.x=nx;
  if(!isBlocked(entity.x,ny,entity.r,game.character,game)) entity.y=ny;
  entity.run=run; entity.anim=(entity.anim||0)+dt*speed/80;game.tutorial.move=true;
  if(game.character===CHARACTER.ganesha && run){
    game.stealthBroken=true;
    if((Math.floor(game.elapsed*5)%3)===0) emitNoise(game,entity.x,entity.y,190,'running');
  }
}

export function emitNoise(game,x,y,radius=180,source='noise'){
  const exists=game.noise.some(n=>n.source===source && game.elapsed-n.created<0.25);
  if(!exists) game.noise.push({x,y,radius,source,created:game.elapsed,life:1.15});
  const p=game.parvati;
  if(dist(p,{x,y})<=radius && p.state!==AI.ALERT){
    p.target={x,y}; p.lastKnown={x,y}; setAI(game,AI.SUSPICIOUS); p.awareness=Math.max(p.awareness,0.35);
  }
}

function segIntersectsRect(a,b,r){
  // Exact segment/slab intersection: thin walls and corners cannot be skipped.
  let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[a.x,b.x-a.x,r.x,r.x+r.w],[a.y,b.y-a.y,r.y,r.y+r.h]]){
    if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return false;}
    else {let t1=(min-origin)/delta,t2=(max-origin)/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false;}
  }
  return hi>=0&&lo<=1;
}
export function hasLineOfSight(a,b,game){
  return !obstacles.some(o=>{
    if(o.kind==='gate' && game.secretPassage) return false;
    return segIntersectsRect(a,b,o);
  });
}
export function canSeePlayer(game){
  if(game.player.hidden||game.player.grace>0)return false;
  const p=game.parvati,g=game.player,d=dist(p,g);
  if(d>330)return false;
  const ang=Math.atan2(g.y-p.y,g.x-p.x),diff=Math.atan2(Math.sin(ang-p.dir),Math.cos(ang-p.dir));
  if(Math.abs(diff)>0.78)return false;
  return hasLineOfSight(p,g,game);
}

const NAV_CELL=20;
const navKey=(c,r)=>`${c},${r}`;
function navPoint(c,r){return {x:c*NAV_CELL+NAV_CELL/2,y:r*NAV_CELL+NAV_CELL/2,c,r};}
function nearestOpenCell(point,radius,game,character=CHARACTER.ganesha){
  const cols=Math.ceil(WORLD.width/NAV_CELL),rows=Math.ceil(WORLD.height/NAV_CELL);
  const bc=clamp(Math.floor(point.x/NAV_CELL),0,cols-1),br=clamp(Math.floor(point.y/NAV_CELL),0,rows-1);
  for(let ring=0;ring<=3;ring++){
    for(let dr=-ring;dr<=ring;dr++)for(let dc=-ring;dc<=ring;dc++){
      if(ring && Math.max(Math.abs(dc),Math.abs(dr))!==ring)continue;
      const c=bc+dc,r=br+dr;if(c<0||r<0||c>=cols||r>=rows)continue;
      const p=navPoint(c,r);if(!isBlocked(p.x,p.y,radius,character,game))return p;
    }
  }
  return null;
}
export function findPath(start,goal,radius,game,character=CHARACTER.ganesha){
  const s=nearestOpenCell(start,radius,game,character),g=nearestOpenCell(goal,radius,game,character);if(!s||!g)return [];
  const open=[s],came=new Map(),gScore=new Map([[navKey(s.c,s.r),0]]),closed=new Set();
  const dirs=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  const h=(a)=>Math.hypot(a.c-g.c,a.r-g.r);
  while(open.length){
    let best=0,bestF=Infinity;for(let i=0;i<open.length;i++){const k=navKey(open[i].c,open[i].r),f=(gScore.get(k)??Infinity)+h(open[i]);if(f<bestF){bestF=f;best=i;}}
    const cur=open.splice(best,1)[0],ck=navKey(cur.c,cur.r);if(cur.c===g.c&&cur.r===g.r){
      const path=[];let k=ck,node=cur;while(node){path.push({x:node.x,y:node.y});const prev=came.get(k);if(!prev)break;node=prev;k=navKey(node.c,node.r);}return path.reverse();
    }
    closed.add(ck);
    for(const [dc,dr,cost] of dirs){
      const c=cur.c+dc,r=cur.r+dr;if(c<0||r<0)continue;const p=navPoint(c,r);if(p.x>=WORLD.width||p.y>=WORLD.height)continue;
      const pk=navKey(c,r);if(closed.has(pk)||isBlocked(p.x,p.y,radius,character,game))continue;
      if(dc&&dr){const a=navPoint(cur.c+dc,cur.r),b=navPoint(cur.c,cur.r+dr);if(isBlocked(a.x,a.y,radius,character,game)||isBlocked(b.x,b.y,radius,character,game))continue;}
      const tentative=(gScore.get(ck)??Infinity)+cost;if(tentative<(gScore.get(pk)??Infinity)){came.set(pk,cur);gScore.set(pk,tentative);if(!open.some(n=>n.c===c&&n.r===r))open.push(p);}
    }
  }
  return [];
}
function resetPath(entity){entity.path=[];entity.pathIndex=0;entity.pathTarget=null;entity.pathRefresh=0;}
function steer(entity,target,speed,dt,game){
  if(!target)return true;
  const d=dist(entity,target);if(d<18){resetPath(entity);return true;}
  entity.pathRefresh=(entity.pathRefresh||0)-dt;
  const targetMoved=!entity.pathTarget||dist(entity.pathTarget,target)>70;
  if(!entity.path?.length||entity.pathIndex>=entity.path.length||targetMoved||entity.pathRefresh<=0){
    entity.path=findPath(entity,target,entity.r+2,game);entity.pathIndex=Math.min(1,Math.max(0,entity.path.length-1));entity.pathTarget={x:target.x,y:target.y};entity.pathRefresh=.65;
  }
  let waypoint=entity.path?.[entity.pathIndex]||target;
  if(dist(entity,waypoint)<18){
    if(entity.pathIndex<entity.path.length-1){entity.pathIndex++;waypoint=entity.path[entity.pathIndex];}
    else waypoint=target;
  }
  const n=norm(waypoint.x-entity.x,waypoint.y-entity.y);entity.dir=Math.atan2(n.y,n.x);
  const step=Math.min(speed*dt,dist(entity,waypoint)),nx=entity.x+n.x*step,ny=entity.y+n.y*step;
  if(!isBlocked(nx,entity.y,entity.r,CHARACTER.ganesha,game))entity.x=nx;
  if(!isBlocked(entity.x,ny,entity.r,CHARACTER.ganesha,game))entity.y=ny;
  return dist(entity,target)<22;
}

function setAI(game,state){
  const p=game.parvati;if(p.state===state)return;
  p.state=state;p.stateTime=0;resetPath(p);
  const speech={SUSPICIOUS:'Hmm… what was that?',ALERT:'Ganesha!',SEARCH:'Where did he go?',RETURN:'Back to the preparations.'};
  p.speech=speech[state]||'';p.speechTime=2.8;game.events.push({type:'ai',state});
}
function updateAI(game,dt){
  const p=game.parvati;p.stateTime+=dt;p.speechTime=Math.max(0,p.speechTime-dt);
  const visible=canSeePlayer(game);
  if(visible){
    p.awareness=clamp(p.awareness+dt*.85,0,1);p.lastKnown={x:game.player.x,y:game.player.y};
    if(p.awareness>.62)setAI(game,AI.ALERT);
    else if(p.state===AI.CALM||p.state===AI.RETURN){p.target={...p.lastKnown};setAI(game,AI.SUSPICIOUS);}
  }else p.awareness=clamp(p.awareness-dt*.16,0,1);
  if(p.state===AI.CALM){
    if(p.dwell>0){p.dwell-=dt;p.dir+=Math.sin(p.stateTime*2)*dt*.7;return;}
    if(steer(p,game.patrol[p.patrolIndex],72,dt,game)){
      p.task=['Checking modaks','Checking diyas','Arranging flowers','Tidying the cushions','Admiring the rangoli','Preparing the puja','Arranging garlands','Checking the festival box'][p.patrolIndex];
      p.dwell=1.6;p.patrolIndex=(p.patrolIndex+1)%game.patrol.length;
    }
  }else if(p.state===AI.SUSPICIOUS){
    if(p.target&&steer(p,p.target,92,dt,game)){p.lastKnown={...p.target};setAI(game,AI.SEARCH);p.target={...p.lastKnown};}
    else if(p.stateTime>9){setAI(game,AI.SEARCH);p.target=p.lastKnown;}
  }else if(p.state===AI.ALERT){
    if(visible){steer(p,game.player,135,dt,game);if(dist(p,game.player)<38&&hasLineOfSight(p,game.player,game))catchPlayer(game);}
    else{setAI(game,AI.SEARCH);p.target=p.lastKnown;}
  }else if(p.state===AI.SEARCH){
    if(p.target&&dist(p,p.target)>22)steer(p,p.target,90,dt,game);
    else {p.dir+=dt*1.6;if(p.stateTime>5.5){setAI(game,AI.RETURN);p.target=null;}}
    if(p.stateTime>10){setAI(game,AI.RETURN);p.target=null;}
  }else if(p.state===AI.RETURN){
    if(steer(p,game.patrol[p.patrolIndex],75,dt,game)){setAI(game,AI.CALM);p.awareness=0;}
  }
}

function collect(game,item){
  if(!item.active)return;
  item.active=false; game.score+=item.points;
  if(item.kind==='modak'){
    game.objectives.modaks++; game.player.checkpoint={x:game.player.x,y:game.player.y};
  } else game.objectives[item.kind]++;
  game.popups.push({x:item.x,y:item.y,text:`+${item.points} ${item.kind==='modak'?'MODAK':'FESTIVAL'}`,life:1.2});
  game.particles.push(...Array.from({length:12},(_,i)=>({x:item.x,y:item.y,vx:Math.cos(i/12*Math.PI*2)*50,vy:Math.sin(i/12*Math.PI*2)*50,life:.8})));
  if(item.id==='m5')game.secretFound=true;
  const amount=game.objectives[item.kind],target=TARGETS[item.kind];
  game.messages.push(item.kind==='modak'?`${item.label.toUpperCase()} +${item.points}`:`${item.label} collected · ${amount} / ${target}`);
  if(amount===target)game.messages.push(`${item.kind.toUpperCase()} READY!`);
  game.events.push({type:'pickup',kind:item.kind,variant:item.type});
}

function updateCollectibles(game){
  const e=game.character===CHARACTER.ganesha?game.player:game.mushak;
  for(const item of game.collectibles){
    if(item.active && dist(e,item)<(game.character===CHARACTER.mushak?24:34) && hasLineOfSight(e,item,game)){
      if(item.id==='m5' && game.character!==CHARACTER.mushak)continue;
      collect(game,item);
    }
  }
}

export function nearestInteraction(game){
  const e=game.character===CHARACTER.ganesha?game.player:game.mushak;
  let best=null,bd=Infinity;
  for(const i of interactions){
    if(i.mushakOnly&&game.character!==CHARACTER.mushak)continue;
    const d=dist(e,i); if(d<i.r&&d<bd&&hasLineOfSight(e,i,game)){best=i;bd=d;}
  }
  const hide=hidingSpots.find(h=>dist(game.player,h)<h.r&&hasLineOfSight(game.player,h,game));
  return {interaction:best,hide};
}

export function interact(game){
  if(game.phase!=='playing'||game.paused||game.modal||game.completed)return null;
  const {interaction}=nearestInteraction(game); if(!interaction)return null;game.tutorial.interact=true;
  if(interaction.type==='noise'){
    emitNoise(game,interaction.x,interaction.y,interaction.id==='bell'?430:300,interaction.id);
    if(interaction.id==='bell'&&!game.puzzle.bell){game.puzzle.bell=true;game.score+=30;game.messages.push('Bell distraction mastered +30');}
    return {type:'noise',id:interaction.id};
  }
  if(interaction.type==='switchMushak'){ switchCharacter(game); return {type:'switch'}; }
  if(interaction.type==='boxPuzzle'&&!game.puzzle.box){game.modal={type:'boxPuzzle',sequence:[]};return game.modal;}
  if(interaction.type==='diyaPuzzle'&&!game.puzzle.diya){game.modal={type:'diyaPuzzle',sequence:[]};return game.modal;}
  if(interaction.type==='rangoli'&&!game.puzzle.rangoli){game.modal={type:'rangoli',sequence:[]};return game.modal;}
  if(interaction.type==='secretLever'&&!game.puzzle.secretLever){
    game.puzzle.secretLever=true;game.secretPassage=true;game.score+=75;
    const m=game.collectibles.find(x=>x.id==='m5');if(m)m.active=true;
    game.messages.push('SECRET PASSAGE OPENED! +75');game.events.push({type:'secret'});return {type:'lever'};
  }
  return null;
}

export function toggleHide(game){
  if(game.character!==CHARACTER.ganesha||game.phase!=='playing'||game.paused||game.modal)return false;
  if(game.player.hidden){game.player.hidden=false;game.messages.push('You leave hiding');return true;}
  const {hide}=nearestInteraction(game); if(hide && game.parvati.state!==AI.ALERT){game.player.hidden=true;game.player.run=false;game.tutorial.hide=true;game.messages.push('HIDDEN');return true;}
  game.messages.push(game.parvati.state===AI.ALERT?'Break line of sight before hiding':'Move closer to a hiding spot');return false;
}

export function switchCharacter(game){
  if(game.phase!=='playing'||game.paused||game.modal||game.completed)return false;
  if(game.character===CHARACTER.ganesha){
    if(game.parvati.state===AI.ALERT){game.messages.push('Find cover before calling Mushak');return false;}
    if(!game.mushak.deployed||dist(game.player,game.mushak)>240){
      const offsets=[[28,0],[-28,0],[0,28],[0,-28],[0,0]];
      const pos=offsets.map(([x,y])=>({x:game.player.x+x,y:game.player.y+y})).find(p=>!isBlocked(p.x,p.y,12,CHARACTER.mushak,game)&&hasLineOfSight(game.player,p,game));
      if(!pos)return false;Object.assign(game.mushak,pos);game.mushak.deployed=true;
    }
    game.character=CHARACTER.mushak;
  }else game.character=CHARACTER.ganesha;
  game.tutorial.switch=true;game.events.push({type:'switch'});
  game.messages.push(game.character===CHARACTER.mushak?'Mushak can help! Q / SWITCH to return anytime.':'Back to Ganesha');return true;
}

export function solvePuzzleStep(game,choice){
  if(game.paused||!game.modal)return {done:false,ok:false};
  const m=game.modal;m.sequence.push(choice);
  const configs={
    boxPuzzle:{target:['diya','flower','durva'],score:80},
    diyaPuzzle:{target:['east','south','west','north'],score:90},
    rangoli:{target:['saffron','pink','green','blue'],score:150}
  };
  const c=configs[m.type]; if(!c)return {done:false,ok:false};
  const idx=m.sequence.length-1;
  if(m.sequence[idx]!==c.target[idx]){
    emitNoise(game,game.player.x,game.player.y,260,`${m.type}-mistake`);game.puzzleMistakes[m.type]=(game.puzzleMistakes[m.type]||0)+1;m.sequence=[];game.events.push({type:'mistake'});game.messages.push('That sequence made a little noise');return {done:false,ok:false,reset:true};
  }
  if(m.sequence.length===c.target.length){
    if(m.type==='rangoli'&&game.puzzleMistakes.rangoli)c.score=100;
    game.score+=c.score;game.events.push({type:'puzzle',puzzle:m.type});
    const effect=interactions.find(i=>i.type===m.type)||game.player;
    game.particles.push(...Array.from({length:24},(_,i)=>({x:effect.x,y:effect.y,vx:Math.cos(i/24*Math.PI*2)*75,vy:Math.sin(i/24*Math.PI*2)*75,life:1.2})));
    game.popups.push({x:effect.x,y:effect.y-20,text:`+${c.score} COMPLETE`,life:1.5});game.puzzle[m.type==='boxPuzzle'?'box':m.type==='diyaPuzzle'?'diya':'rangoli']=true;
    if(m.type==='boxPuzzle'){const x=game.collectibles.find(v=>v.id==='m4');if(x)x.active=true;}
    if(m.type==='diyaPuzzle')game.secretPassage=true;
    if(m.type==='rangoli')game.objectives.rangoli=1;
    game.modal=null;game.messages.push(`${m.type==='rangoli'?(c.score===150?'PERFECT RANGOLI':'RANGOLI READY'):m.type==='boxPuzzle'?'FESTIVAL BOX UNLOCKED':'DIYA SHORTCUT OPENED'} +${c.score}`);return {done:true,ok:true};
  }
  return {done:false,ok:true};
}

export function closeModal(game){game.modal=null;}

export function catchPlayer(game){
  if(game.completed||game.phase==='gameover'||game.modal?.type==='caught')return;
  game.caughtCount++;
  game.player.hidden=false;
  game.character=CHARACTER.ganesha;
  game.phase='gameover';
  game.modal={type:'caught'};
  game.messages.push('Maa Parvati caught Ganesha — GAME OVER');
}

// Kept for compatibility with older callers; a catch now ends the run.
export function continueAfterCatch(game){return false;}

function allObjectives(game){
  const o=game.objectives;return o.modaks>=5&&o.flowers>=3&&o.durva>=3&&o.diyas>=2&&o.rangoli>=1&&o.decorations>=3;
}
function finish(game){
  if(game.completed)return;game.completed=true;game.celebration=true;game.phase='celebration';
  const stealthBonus=game.caughtCount===0?200:Math.max(0,100-game.caughtCount*25);
  const timeBonus=Math.max(0,Math.round(game.remaining));
  const festivalBonus=500;game.score+=stealthBonus+timeBonus+festivalBonus;
  const rating=game.score>=1200?'MODAK MASTER':game.score>=950?'FESTIVAL HERO':game.score>=700?'PUJA PRO':'MODAK NOVICE';
  game.final={challenges:{master:game.elapsed<300,stealth:game.caughtCount===0,secret:game.secretFound},modaks:game.objectives.modaks,festivalItems:game.objectives.flowers+game.objectives.durva+game.objectives.diyas+game.objectives.decorations,puzzles:Number(game.puzzle.box)+Number(game.puzzle.diya),rangoli:game.objectives.rangoli,score:game.score,time:Math.floor(game.elapsed),remaining:Math.round(game.remaining),stealthBonus,timeBonus,festivalBonus,rating,caught:game.caughtCount};
}

export function update(game,dt){
  if(game.phase==='celebration'){game.celebrationTime+=Math.min(dt,.05);return;}
  if(game.phase!=='playing'||game.paused||game.modal||game.completed)return;
  dt=Math.min(dt,0.05);game.elapsed+=dt;game.remaining=Math.max(0,game.remaining-dt);if(game.remaining===0)game.countdownExpired=true;
  game.player.grace=Math.max(0,game.player.grace-dt);
  updateCollectibles(game);updateAI(game,dt);
  game.noise.forEach(n=>n.life-=dt);game.noise=game.noise.filter(n=>n.life>0);
  game.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});game.particles=game.particles.filter(p=>p.life>0);
  game.popups.forEach(p=>{p.y-=25*dt;p.life-=dt;});game.popups=game.popups.filter(p=>p.life>0);
  if(!game.modal&&allObjectives(game))finish(game);
}

export function startGame(game){game.phase='playing';game.modal=null;}
export function pauseGame(game,v=!game.paused){game.paused=v;}
export function restartGame(){const g=createGame();g.phase='playing';return g;}
export function formatTime(sec){sec=Math.max(0,Math.floor(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
export function getZone(x,y){if(y<470){if(x<520)return'PUJA ROOM';if(x<1060)return'STORAGE AREA';return'SECRET PASSAGE';}if(x<520)return'FESTIVAL COURTYARD';if(x<1060)return'LIVING ROOM';return'KITCHEN';}

import {nearestInteraction,CHARACTER} from './engine.js';
export function currentObjective(g){
 const o=g.objectives;
 if(!o.modaks)return {title:'FIRST OBJECTIVE · Find a Modak',detail:'Follow the golden sweet nearby.',x:340,y:890};
 if(!g.puzzle.box&&o.modaks>=3)return {title:'Unlock the Festival Box',detail:'Storage · Diya → Flower → Durva',x:905,y:255};
 if(o.modaks<5){const c=g.collectibles.find(i=>i.active&&i.kind==='modak'&&i.id!=='m5');if(c)return {title:`Modaks ${o.modaks}/5`,detail:'Find the glowing sweets.',...c};}
 for(const [kind,label,n] of [['flowers','Flowers',3],['durva','Durva',3],['diyas','Diyas',2],['decorations','Decorations',3]]){
  if(o[kind]<n){const c=g.collectibles.find(i=>i.active&&i.kind===kind);return {title:`${label} ${o[kind]}/${n}`,detail:'Gather the festival preparations.',...c};}
 }
 return {title:'Complete the rangoli',detail:'Courtyard · Recreate the four-color pattern.',x:275,y:585};
}
export function tutorialPrompt(g,touch=false){
 if(g.phase!=='playing'||g.paused||g.modal)return '';
 if(!g.tutorial.move)return touch?'FIRST OBJECTIVE · Find a Modak\nUse the direction pad to move.':'FIRST OBJECTIVE · Find a Modak\nWASD / Arrow Keys — Move';
 const n=nearestInteraction(g);
 if(!g.tutorial.switch&&(g.player.x>850&&g.player.y<450||g.character===CHARACTER.mushak))return `MUSHAK CAN HELP!\n${touch?'Tap MUSHAK':'Q — Switch Character'} · Tiny openings lead to secrets. Hide Ganesha first.`;
 if(n.hide&&!g.tutorial.hide)return touch?'Tap HIDE behind this screen.':'Press SPACE to Hide';
 if(n.interaction&&!g.tutorial.interact)return touch?'Tap USE to interact.':'Press E to Interact';
 if(g.elapsed<16&&g.objectives.modaks>0)return 'MISSION · Prepare the Ganesh Chaturthi celebration.\nGather festival items, solve puzzles and help Maa Parvati.';
 return '';
}

// Local-only QA fixtures. Never copied to dist; fixture records use memory only.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('tests/browser',{recursive:true});
let main=await readFile('src/main.js','utf8');main=main.replaceAll("from './","from '../../src/");
main=main.replace('try{return localStorage}catch{return null}','return {getItem:()=>fixtureMemory,setItem:(k,v)=>{fixtureMemory=v}}');
main='let fixtureMemory=null;\n'+main;
main+=`\nconst fixture = new URLSearchParams(location.search).get('fixture');
if(fixture){game=restartGame();game.player.grace=9999;hide();lastMessage=0;
 if(['boxPuzzle','diyaPuzzle','rangoli'].includes(fixture)){game.modal={type:fixture,sequence:[]};syncModal();}
 if(fixture==='caught'){game.modal={type:'caught'};syncModal();}
 if(fixture==='ending'){
  for(const [type,seq] of [['boxPuzzle',['diya','flower','durva']],['diyaPuzzle',['east','south','west','north']],['rangoli',['saffron','pink','green','blue']]]){game.modal={type,sequence:[]};for(const c of seq)solvePuzzleStep(game,c);}
  game.character='mushak';game.mushak.x=1390;game.mushak.y=280;interact(game);
  for(const item of game.collectibles){if(!item.active)continue;const ent=item.id==='m5'?game.mushak:game.player;game.character=item.id==='m5'?'mushak':'ganesha';ent.x=item.x;ent.y=item.y;update(game,.016);}
 }
}\n`;
await writeFile('tests/browser/main.js',main);
let html=await readFile('index.html','utf8');html=html.replace('./src/main.js','./main.js').replace('./src/style.css','../../src/style.css');
await writeFile('tests/browser/game.html',html);
await writeFile('tests/browser/qa.html',`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Local QA only</title><style>body{background:#18101a;color:#fff;font:14px system-ui;margin:12px}iframe{border:1px solid #c99;height:700px}a{color:#ffdd98}section{display:flex;gap:16px;align-items:start}</style></head><body><h1>Local QA — excluded from deployment</h1><p><a href="game.html?fixture=boxPuzzle">Festival Box fixture</a> · <a href="game.html?fixture=diyaPuzzle">Diya fixture</a> · <a href="game.html?fixture=rangoli">Rangoli fixture</a> · <a href="game.html?fixture=caught">Caught fixture</a> · <a href="game.html?fixture=ending">Ending fixture</a></p><section><div>320 × 700<iframe title="320 pixel game" src="../../index.html" width="320"></iframe></div><div>390 × 700<iframe title="390 pixel game" src="../../index.html" width="390"></iframe></div></section></body></html>`);
console.log('Local browser QA fixtures ready in tests/browser/qa.html');

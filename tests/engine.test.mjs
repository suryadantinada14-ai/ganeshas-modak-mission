import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,startGame,moveCharacter,update,emitNoise,AI,solvePuzzleStep,toggleHide,interact,nearestInteraction,switchCharacter,CHARACTER,formatTime,isBlocked} from '../src/engine.js';

test('game starts with complete festival objective targets',()=>{const g=createGame();assert.equal(g.objectives.modaks,0);assert.equal(g.remaining,480);assert.equal(g.phase,'menu')});
test('start and movement work',()=>{const g=createGame();startGame(g);const x=g.player.x;moveCharacter(g,1,0,0.2,false);assert.ok(g.player.x>x);});
test('running creates noise',()=>{const g=createGame();startGame(g);moveCharacter(g,0,-1,.2,true);assert.ok(g.noise.length>=1);assert.equal(g.stealthBroken,true)});
test('noise moves Parvati to suspicious',()=>{const g=createGame();startGame(g);emitNoise(g,g.parvati.x,g.parvati.y,300,'test');assert.equal(g.parvati.state,AI.SUSPICIOUS)});
test('festival box puzzle unlocks golden modak',()=>{const g=createGame();startGame(g);g.modal={type:'boxPuzzle',sequence:[]};['diya','flower','durva'].forEach(c=>solvePuzzleStep(g,c));assert.equal(g.puzzle.box,true);assert.equal(g.collectibles.find(x=>x.id==='m4').active,true)});
test('wrong puzzle sequence resets and creates noise',()=>{const g=createGame();startGame(g);g.modal={type:'boxPuzzle',sequence:[]};const r=solvePuzzleStep(g,'flower');assert.equal(r.reset,true);assert.ok(g.noise.length>0)});
test('rangoli completion updates objective',()=>{const g=createGame();startGame(g);g.modal={type:'rangoli',sequence:[]};['saffron','pink','green','blue'].forEach(c=>solvePuzzleStep(g,c));assert.equal(g.objectives.rangoli,1);assert.equal(g.puzzle.rangoli,true)});
test('Mushak switch toggles active character',()=>{const g=createGame();startGame(g);switchCharacter(g);assert.equal(g.character,CHARACTER.mushak);switchCharacter(g);assert.equal(g.character,CHARACTER.ganesha)});
test('Mushak respects ordinary walls but can use the tiny passage gate',()=>{const g=createGame();startGame(g);assert.equal(isBlocked(510,100,12,CHARACTER.mushak,g),true);assert.equal(isBlocked(1052,300,12,CHARACTER.mushak,g),false)});
test('countdown ticks while playing',()=>{const g=createGame();startGame(g);update(g,1);assert.ok(g.remaining<480);assert.equal(formatTime(480),'08:00')});
test('hide works near a hiding spot',()=>{const g=createGame();startGame(g);g.player.x=930;g.player.y=590;assert.ok(nearestInteraction(g).hide);assert.equal(toggleHide(g),true);assert.equal(g.player.hidden,true)});

test('golden modak spawn is reachable after box puzzle',()=>{const g=createGame();startGame(g);g.modal={type:'boxPuzzle',sequence:[]};['diya','flower','durva'].forEach(c=>solvePuzzleStep(g,c));const m=g.collectibles.find(x=>x.id==='m4');assert.equal(m.active,true);assert.ok(m.y>382)});

test('Parvati pathfinding patrols across room boundaries instead of sticking to walls',()=>{const g=createGame();startGame(g);g.player.grace=9999;let minX=g.parvati.x,maxPatrol=0;for(let i=0;i<900;i++){update(g,.05);minX=Math.min(minX,g.parvati.x);maxPatrol=Math.max(maxPatrol,g.parvati.patrolIndex)}assert.ok(minX<700);assert.ok(maxPatrol>=4)});

test('Mushak can activate the real secret lever interaction',()=>{const g=createGame();startGame(g);switchCharacter(g);g.mushak.x=1390;g.mushak.y=280;const r=interact(g);assert.equal(r.type,'lever');assert.equal(g.secretPassage,true);assert.equal(g.collectibles.find(x=>x.id==='m5').active,true)});

test('full festival objective path can reach celebration',()=>{const g=createGame();startGame(g);g.player.grace=9999;
  // Complete the three modal puzzles.
  g.modal={type:'boxPuzzle',sequence:[]};['diya','flower','durva'].forEach(c=>solvePuzzleStep(g,c));
  g.modal={type:'diyaPuzzle',sequence:[]};['east','south','west','north'].forEach(c=>solvePuzzleStep(g,c));
  g.modal={type:'rangoli',sequence:[]};['saffron','pink','green','blue'].forEach(c=>solvePuzzleStep(g,c));
  // Unlock secret modak through the actual Mushak lever interaction.
  switchCharacter(g);g.mushak.x=1390;g.mushak.y=280;interact(g);
  for(const item of g.collectibles){if(!item.active)continue;if(item.id==='m5'){g.character=CHARACTER.mushak;g.mushak.x=item.x;g.mushak.y=item.y}else{g.character=CHARACTER.ganesha;g.player.x=item.x;g.player.y=item.y}update(g,.016)}
  assert.equal(g.objectives.modaks,6);assert.equal(g.objectives.flowers,3);assert.equal(g.objectives.durva,3);assert.equal(g.objectives.diyas,2);assert.equal(g.objectives.decorations,3);assert.equal(g.objectives.rangoli,1);assert.equal(g.completed,true);assert.ok(g.final.score>0)
});

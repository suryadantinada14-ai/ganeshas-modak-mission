import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,startGame,moveCharacter,update,findPath,isBlocked,interact,solvePuzzleStep,switchCharacter,CHARACTER} from '../src/engine.js';
function walk(g,target){
 const e=g.character==='mushak'?g.mushak:g.player;
 const path=findPath(e,target,e.r+4,g,g.character);assert.ok(path.length,`route exists to ${JSON.stringify(target)}`);
 // Visit the starting cell too: the actor may be off the cell center.
 for(const p of [...path,target]){
  let ticks=0;while(Math.hypot(e.x-p.x,e.y-p.y)>3){
   const distance=Math.hypot(e.x-p.x,e.y-p.y);const dt=Math.min(.016,distance/(g.character==='mushak'?185:150));
   moveCharacter(g,p.x-e.x,p.y-e.y,dt);update(g,dt);if(g.completed)return;assert.ok(!isBlocked(e.x,e.y,e.r,g.character,g));
   assert.ok(++ticks<700,`actor stuck near ${e.x},${e.y} while walking to ${p.x},${p.y}`);
  }
 }
}
test('physical route traverses doorways, all puzzles, mouse-only opening, lever, every pickup and celebration',()=>{
 const g=createGame();startGame(g);g.player.grace=9999; // Isolate route geometry from independently tested detection.
 walk(g,{x:905,y:255});assert.equal(interact(g)?.type,'boxPuzzle');for(const c of ['diya','flower','durva'])solvePuzzleStep(g,c);
 walk(g,{x:1010,y:305});switchCharacter(g);walk(g,{x:1390,y:280});assert.equal(interact(g)?.type,'lever');walk(g,{x:1450,y:180});assert.ok(g.secretFound);switchCharacter(g);
 walk(g,{x:385,y:250});assert.equal(interact(g)?.type,'diyaPuzzle');for(const c of ['east','south','west','north'])solvePuzzleStep(g,c);
 walk(g,{x:275,y:585});assert.equal(interact(g)?.type,'rangoli');for(const c of ['saffron','pink','green','blue'])solvePuzzleStep(g,c);
 for(const item of g.collectibles.filter(i=>i.active))walk(g,item);
 assert.equal(g.completed,true);assert.equal(g.phase,'celebration');assert.ok(g.final.score>0);assert.equal(g.final.festivalItems,11);assert.equal(g.final.puzzles,2);assert.equal(g.final.challenges.secret,true);
 for(let i=0;i<240;i++)update(g,.05);assert.ok(g.celebrationTime>=11);console.log(`Physical route: ${g.final.time}s, ${g.final.score} points, ${g.final.modaks} modaks, 11 festival items.`);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';

const root=new URL('../',import.meta.url);

test('index contains every UI control referenced by the game shell',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const required=['game','overlay','modal','toast','context','count','score','timer','state-label','awareness-fill','location','touch-run','touch-hide','touch-interact','touch-switch','pause','objectives','sound','auth-btn'];
  for(const id of required)assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);
  assert.match(html,/data-dir="up"/);assert.match(html,/data-dir="down"/);assert.match(html,/data-dir="left"/);assert.match(html,/data-dir="right"/);
});

test('browser entry imports local modules and required files exist',async()=>{
  const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/from ['"]\.\/engine\.js['"]/);assert.match(main,/from ['"]\.\/render\.js['"]/);
  assert.doesNotMatch(main,/fetch\s*\(/);assert.doesNotMatch(main,/https?:\/\//);
  await access(new URL('../src/engine.js',import.meta.url));await access(new URL('../src/render.js',import.meta.url));await access(new URL('../src/style.css',import.meta.url));
});

test('mobile CSS exposes touch controls and keeps the challenge timer visible',async()=>{
  const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
  assert.match(css,/@media \(max-width:820px\),\(pointer:coarse\)/);
  assert.match(css,/\.touch-controls\{display:flex\}/);
  assert.match(css,/\.countdown\{display:block\}/);
});

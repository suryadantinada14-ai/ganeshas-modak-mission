import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve('dist');
const html=await readFile(resolve(root,'index.html'),'utf8');
const targets=[...html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)].map(m=>resolve(root,m[1]));
const seen=new Set();
async function check(file){
 if(!file.startsWith(root+sep)&&!file.startsWith(root+'/'))throw Error('Asset escapes distribution: '+file);
 if(seen.has(file))return;seen.add(file);await stat(file);
 if(file.endsWith('.js')){execFileSync(process.execPath,['--check',file]);const text=await readFile(file,'utf8');for(const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){if(!m[1].startsWith('.'))throw Error('Nonlocal import: '+m[1]);await check(resolve(dirname(file),m[1]));}}
}
for(const file of targets)await check(file);
async function files(dir){let list=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);list.push(...e.isDirectory()?await files(p):[p]);}return list;}
const all=await files(root);let bytes=0;for(const f of all)bytes+=(await stat(f)).size;
if(all.some(p=>p.includes(sep+'tests'+sep)||p.includes(sep+'scripts'+sep)||p.includes('/tests/')||p.includes('/scripts/')))throw Error('QA files in production');
console.log(`Verified ${seen.size} local assets/modules; ${all.length} production files; ${bytes} bytes. No missing imports or QA fixtures.`);

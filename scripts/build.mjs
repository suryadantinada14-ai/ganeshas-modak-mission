import {rm,mkdir,cp,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('.'),dist=resolve('dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await copyFile(resolve(root,'index.html'),resolve(dist,'index.html'));
await cp(resolve(root,'src'),resolve(dist,'src'),{recursive:true});
await copyFile(resolve(root,'README.md'),resolve(dist,'README.md'));
await copyFile(resolve(root,'supabase-config.js'),resolve(dist,'supabase-config.js'));
try{await copyFile(resolve(root,'_redirects'),resolve(dist,'_redirects'));}catch{}
console.log('Built static game in dist/');

await import("./verify-build.mjs");

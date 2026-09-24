const KEY='gmm-v3-records';
export function loadRecords(storage){
 try{const d=JSON.parse(storage?.getItem(KEY)||'{}');const runs=Array.isArray(d.runs)?d.runs.filter(r=>Number.isFinite(r.score)&&r.score>=0&&Number.isFinite(r.time)&&r.time>=0&&Number.isInteger(r.caught)&&r.caught>=0).slice(0,10):[];const valid=v=>Number.isFinite(v)&&v>=0;return {runs,bestScore:valid(d.bestScore)?d.bestScore:null,bestTime:valid(d.bestTime)?d.bestTime:null,lowestCatches:valid(d.lowestCatches)?d.lowestCatches:null};}catch{return {runs:[],bestScore:null,bestTime:null,lowestCatches:null};}
}
export function recordResult(storage,result){
 const d=loadRecords(storage),run={score:result.score,time:result.time,caught:result.caught};
 d.runs.push(run);d.runs.sort((a,b)=>b.score-a.score||a.time-b.time);d.runs=d.runs.slice(0,10);
 d.bestScore=Math.max(d.bestScore??0,run.score);d.bestTime=Math.min(d.bestTime??Infinity,run.time);d.lowestCatches=Math.min(d.lowestCatches??Infinity,run.caught);
 try{if(!storage)return false;storage.setItem(KEY,JSON.stringify(d));return true;}catch{return false;}
}

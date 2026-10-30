import {writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL,origin=base;
let cookie='';
async function api(method,path,body){const r=await fetch(base+'/api/v1'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});const data=await r.json();assert(r.ok,`${method} ${path} returned ${r.status}`);if(path==='/auth/login')cookie=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');return data}
await api('POST','/auth/login',{password:process.env.TEST_PASSWORD});
const file='/reports/deployment-state.json';
if(process.argv[2]==='seed'){
 const definition={schemaVersion:1,nodes:[{id:'intro',type:'talking_point',isStart:true,text:'Deployment persistence example.',next:null}]};
 const script=await api('POST','/scripts',{name:'Deployment persistence verification',definition});
 const make=()=>api('POST','/runs',{scriptId:script.id,expectedScriptRevision:script.revision,lead:{name:'Deployment Sample',company:'Test only',phone:'local'},clientRequestId:crypto.randomUUID()});
 const open=await make(),completed=await make();const state={expectedRevision:open.revision,progress:open.progress,phase:'in_progress',callNotes:'Open call retained across replacement.',outcome:null,evaluationNotes:''};
 await api('PUT',`/runs/${open.id}/state`,state);
 const final=await api('POST',`/runs/${completed.id}/complete`,{...state,expectedRevision:completed.revision,phase:'evaluating',outcome:'success',evaluationNotes:'Snapshot retained.',idempotencyKey:crypto.randomUUID()});
 await writeFile(file,JSON.stringify({scriptId:script.id,openId:open.id,completedId:completed.id,completedAt:final.completedAt}));
}else{
 const saved=JSON.parse(await readFile(file,'utf8'));const open=await api('GET',`/runs/${saved.openId}`),completed=await api('GET',`/runs/${saved.completedId}`);
 assert.equal(open.phase,'in_progress');assert.equal(open.callNotes,'Open call retained across replacement.');assert.equal(completed.phase,'completed');assert.equal(completed.completedAt,saved.completedAt);assert.equal(completed.snapshot.nodes[0].text,'Deployment persistence example.');
}
console.log('Deployment persistence checks passed.');

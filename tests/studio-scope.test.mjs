import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const exports={};new Function('exports',ts.transpileModule(readFileSync(new URL('../lib/studioScope.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports);
function fixture({session=true,track=true,members=['member'],failure=false}={}){
 const calls=[];return {calls,admin:{from(table){const filters=[];calls.push({table,filters});const q={select(){return q},eq(...args){filters.push(args);return q},in(...args){filters.push(args);return q},maybeSingle(){return Promise.resolve({data:(table==='studio_sessions'?session:track)?{id:'id'}:null,error:failure?{}:null})},then(resolve){resolve({data:members.map(user_id=>({user_id})),error:failure?{}:null})}};return q;}}};
}
test('studio references are checked against project and active memberships',async()=>{
 const f=fixture();await exports.requireStudioScope(f.admin,'project','session','track',['member','member']);
 assert.ok(f.calls.every(call=>call.filters.some(([key,value])=>key==='project_id'&&value==='project')));assert.ok(f.calls[2].filters.some(([key,value])=>key==='status'&&value==='active'));
});
test('foreign session, track, participant and database failures stop before writes',async()=>{
 for(const options of [{session:false},{track:false},{members:[]},{failure:true}])await assert.rejects(exports.requireStudioScope(fixture(options).admin,'project','foreign-session','foreign-track',['outsider']),/not found|active members/);
});

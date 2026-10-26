import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpileModule(readFileSync(new URL('../app/admin/(control)/projectManagementActions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({actor='actor',authorised=true,existing={user_id:'target',active:true,permissions:['all']},count=1,countError=null}={}){
 const writes=[],exports={};
 const admin={from(table){const q={select(){return q},eq(){return q},contains(){return q},upsert(value){writes.push({table,value});return q},insert(value){writes.push({table,value});return q},maybeSingle:async()=>({data:existing,error:null}),then(resolve){resolve({data:[],error:countError,count})}};return q;}};
 new Function('require','exports',code)(name=>name==='next/cache'?{revalidatePath(){}}:name.includes('controlRoom')?{requireSuperAdmin:async()=>{if(!authorised)throw Error('Only full access');return{id:actor}}}:name.includes('supabase/admin')?{createAdminClient:()=>admin}:{notifyUser:async()=>{},notifyProjectMembers:async()=>{}},exports);
 return {...exports,writes};
}
function form(target='target'){const fd=new FormData();fd.set('user_id',target);return fd;}
test('administrator actions reject self-removal, last-full removal and unavailable count before writing',async()=>{
 for(const [options,target] of [[{},'actor'],[{},'target'],[{countError:{code:'08006'}},'target']]){const f=fixture(options);const result=await f.revokeScopedAdminAccess({},form(target));assert.ok(result.error);assert.equal(f.writes.length,0);}
});
test('scoped callers cannot invoke admin appointment or revocation, even by direct action call',async()=>{
 const f=fixture({authorised:false});await assert.rejects(f.revokeScopedAdminAccess({},form()),/Only full access/);await assert.rejects(f.savePlatformAdministrator({},form()),/Only full access/);assert.equal(f.writes.length,0);
});
test('revocation writes platform grant and audit, without deleting accounts or project membership',async()=>{
 const f=fixture({count:2});const result=await f.revokeScopedAdminAccess({},form());assert.equal(result.error,'');assert.deepEqual(f.writes.map(w=>w.table),['control_room_admins','platform_events']);assert.equal(f.writes[0].value.active,false);assert.equal(f.writes[1].value.event_name,'control_room_access_revoked');
});

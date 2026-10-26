import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const load=(file,deps)=>{const out={};new Function('require','exports',ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>deps[name],out);return out;};
const rules=load('lib/professionalApplications.ts',{});
const fd=fields=>{const data=new FormData();for(const [key,value]of Object.entries(fields))data.set(key,value);return data;};
test('review Server Action rejects self-review and stale decisions without granting permissions',async()=>{
 for(const [owner,status]of [['reviewer','submitted'],['applicant','approved']]){
  const writes=[];const admin={from(table){const q={select(){return q},eq(){return q},update(v){writes.push({table,v});return q},maybeSingle:async()=>({data:{id:'app',user_id:owner,profession:'Artist',status},error:null})};return q;}};
  const {reviewProfessionalApplication}=load('app/admin/(control)/professional-applications/actions.ts',{'next/cache':{revalidatePath(){}},'../../../../lib/supabase/admin':{createAdminClient:()=>admin},'../../../../lib/controlRoom':{requireControlRoomPermission:async permission=>{assert.equal(permission,'people');return{id:'reviewer'}}},'../../../../lib/professionalApplications':rules});
  const result=await reviewProfessionalApplication({},fd({application_id:'app',status:'approved'}));assert.match(result.error,/own application|awaiting/);assert.equal(writes.length,0);
 }
});
test('applicant action binds owner server-side and rejects edits to submitted applications',async()=>{
 const filters=[],writes=[];const query={select(){return this},eq(...args){filters.push(args);return this},maybeSingle:async()=>({data:{id:'app',status:'submitted'},error:null}),insert(value){writes.push(value);return this},update(value){writes.push(value);return this}};
 const {saveProfessionalApplication}=load('app/professional-onboarding/actions.ts',{'next/cache':{revalidatePath(){}},'../../lib/workspace':{getWorkspace:async()=>({user:{id:'authenticated-user'},admin:{from:()=>query}})},'../../lib/professionalApplications':rules});
 const result=await saveProfessionalApplication({},fd({user_id:'forged-owner',profession:'Producer',display_name:'Fixture Producer',bio:'Original productions for independent creators.',intent:'submit'}));assert.match(result.error,/already being reviewed/);assert.ok(filters.some(([key,value])=>key==='user_id'&&value==='authenticated-user'));assert.equal(writes.length,0);
});

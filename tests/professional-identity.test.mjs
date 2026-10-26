import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const load=(file,deps)=>{const out={};new Function('require','exports',ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>deps[name],out);return out;};
const applications=load('lib/professionalApplications.ts',{});
const {professionalIdentityTypes}=load('lib/professionalIdentity.ts',{'./professionalApplications':applications});
const {workspaceOptions,permittedProjectIds}=load('lib/workspaceExperience.ts',{});
test('approved professional identities enable personal workspaces with no project or admin authority',async()=>{
 const filters=[];const query={select(){return this},eq(...args){filters.push(args);return this},then(resolve){resolve({data:[{profession:'Producer'},{profession:'A&R'},{profession:'Super Admin'}],error:null})}};
 const types=await professionalIdentityTypes({from:table=>{assert.equal(table,'professional_applications');return query}},'applicant',['Fan']);
 assert.deepEqual(filters,[['user_id','applicant'],['status','approved']]);assert.deepEqual(types,['Fan','Producer','A&R']);
 const options=workspaceOptions(types,[],false);assert.ok(options.some(o=>o.kind==='producer'));assert.equal(options.some(o=>o.kind==='admin'),false);assert.deepEqual(permittedProjectIds('ar',[]),[]);
});
test('missing optional application schema preserves existing declared identities; other failures are explicit',async()=>{
 const admin=error=>({from:()=>({select(){return this},eq(){return this},then(resolve){resolve({data:null,error})}})});
 assert.deepEqual(await professionalIdentityTypes(admin({code:'42P01'}),'u',['Fan','Artist','Artist']),['Fan','Artist']);
 await assert.rejects(professionalIdentityTypes(admin({code:'08006'}),'u',['Fan']),/temporarily unavailable/);
});

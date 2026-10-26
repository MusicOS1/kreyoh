import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpileModule(readFileSync(new URL('../lib/controlRoom.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function access(grant,error=null){const out={},tables=[];new Function('require','exports',code)(name=>name==='next/navigation'?{redirect:()=>{throw Error('redirect')}}:name.endsWith('/admin')?{createAdminClient:()=>({from(table){tables.push(table);assert.equal(table,'control_room_admins');const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:grant,error})};return q;}})}:{createClient:()=>{}},out);return{...out,tables};}
test('platform permission checks use explicit grants only, fail closed and never inspect project roles',async()=>{
 for(const grant of [null,{active:false,permissions:['all']},{active:true,permissions:[]}]){const a=access(grant);assert.equal(await a.isSuperAdmin('u'),false);assert.deepEqual(await a.getControlRoomPermissions('u'),[]);}
 const full=access({active:true,permissions:['all']});assert.equal(await full.isSuperAdmin('u'),true);assert.deepEqual(await full.getControlRoomPermissions('u'),['all']);
 const scoped=access({active:true,permissions:['people']});assert.equal(await scoped.isSuperAdmin('u'),false);assert.deepEqual(await scoped.getControlRoomPermissions('u'),['people']);
 const outage=access({active:true,permissions:['all']},{code:'08006'});assert.equal(await outage.isSuperAdmin('u'),false);assert.deepEqual(await outage.getControlRoomPermissions('u'),[]);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function action({artist={id},error=null}={}){
 const calls=[],writes=[];
 const admin={from(table){calls.push(table);const q={select(){return q},eq(key,value){calls.push([key,value]);return q},contains(key,value){calls.push([key,value]);return q},maybeSingle:async()=>({data:artist,error}),upsert:async record=>{writes.push(record);return {error:null}}};return q}};
 const source=ts.transpileModule(readFileSync(new URL('../app/fan/actions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};new Function('require','module','exports',source)(()=>({communityAccount:async()=>({user:{id:'viewer'},admin}),uuidPattern:/^[0-9a-f-]{36}$/}),module,module.exports);
 return {run:module.exports.updateFanLibrary,calls,writes};
}
test('public active artists can be followed before publishing any releases',async()=>{
 const {run,calls,writes}=action();assert.deepEqual(await run('following',id,true),{ok:true});
 assert.ok(calls.includes('profiles'));assert.ok(!calls.includes('music_weekly_chart'));
 for(const filter of [['id',id],['profile_visibility','public'],['account_status','active'],['creator_types',['Artist']]])assert.ok(calls.some(call=>JSON.stringify(call)===JSON.stringify(filter)));
 assert.equal(writes[0].user_id,'viewer');assert.equal(writes[0].item_id,id);
});
test('unavailable artist profiles and failed validation cannot be followed',async()=>{
 for(const options of [{artist:null},{artist:null,error:new Error('offline')}]){const {run,writes}=action(options);assert.equal((await run('following',id,true)).ok,false);assert.equal(writes.length,0);}
});

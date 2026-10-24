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

function followRoute(){
 const calls=[];
 const source=ts.transpileModule(readFileSync(new URL('../app/api/fan/follow/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};new Function('require','module','exports',source)(name=>name.endsWith('/actions')?{updateFanLibrary:async(...args)=>{calls.push(args);return {ok:true}}}:{uuidPattern:/^[0-9a-f-]{36}$/},module,module.exports);
 return {post:module.exports.POST,calls};
}
test('background follow endpoint preserves validation and rejects cross-site mutations',async()=>{
 const {post,calls}=followRoute();
 const request=(body,origin='https://music.test')=>new Request('https://music.test/api/fan/follow',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post(request({artistId:id,following:true},'https://foreign.test'))).status,403);
 assert.equal((await post(request({artistId:id,following:'yes'}))).status,400);
 assert.equal((await post(request({artistId:'invalid',following:true}))).status,400);
 assert.equal(calls.length,0);
 const response=await post(request({artistId:id,following:true}));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(calls,[['following',id,true]]);
});

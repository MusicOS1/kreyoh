import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function load(path,require=()=>({})){const code=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','module','exports',code)(require,module,module.exports);return module.exports;}
function route(){const calls=[];const functions=new Proxy({},{get:(_target,name)=>async(...args)=>{calls.push({name,args});return name==='conversationSnapshot'?null:{ok:true}}});const {POST}=load('app/api/interactions/[action]/route.ts',()=>functions);return {post:(action,body,origin='https://music.test')=>POST(new Request('https://music.test/api/interactions/'+action,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({action})}),calls};}
test('background endpoint rejects cross-origin requests and unknown operations before mutation',async()=>{
 const {post,calls}=route();assert.equal((await post('library',{},'https://foreign.test')).status,403);assert.equal((await post('deleteEveryUser',{})).status,404);assert.equal((await post('releaseVote',{id:'song',enabled:'yes'})).status,400);assert.equal(calls.length,0);
});
test('background library, votes and comments delegate to existing scoped operations',async()=>{
 const {post,calls}=route();for(const [action,body,name] of [['library',{kind:'saved',id:'song',enabled:true},'updateFanLibrary'],['releaseVote',{id:'song',enabled:true},'voteForRelease'],['commentPost',{releaseId:'song',body:'hello'},'postReleaseComment'],['commentDelete',{id:'comment'},'deleteReleaseComment']]){
  const response=await post(action,body);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(calls.at(-1).name,name);
 }
});
test('conversation refresh denies a peer outside the existing visibility boundaries',async()=>{const {post,calls}=route();assert.equal((await post('conversation',{other:'peer'})).status,403);assert.equal(calls.at(-1).name,'conversationSnapshot');assert.ok(!calls.some(call=>call.name==='markConversationRead'));});
test('background transport uses JSON fetch, preserves failures and sends no page-action header',async()=>{
 const {backgroundInteraction}=load('lib/backgroundInteraction.ts');const old=global.fetch;let request;
 global.fetch=async(url,options)=>{request={url,options};return Response.json({ok:true,value:{ok:true}})};
 try{assert.deepEqual(await backgroundInteraction('library',{kind:'saved'}),{ok:true});assert.equal(request.url,'/api/interactions/library');assert.equal(request.options.method,'POST');assert.equal(request.options.headers['Next-Action'],undefined);global.fetch=async()=>Response.json({ok:false,error:'Retry safely'},{status:400});await assert.rejects(()=>backgroundInteraction('library'),/Retry safely/);}finally{global.fetch=old;}
});
test('shared high-frequency controls do not refresh the whole route',()=>{
 for(const path of ['components/ReleaseControls.tsx','components/ReleaseComments.tsx','components/MemberConversation.tsx','components/TrackPlaylist.tsx','components/ListenerExperience.tsx','components/AdminMusicCatalogManager.tsx','components/NotificationReadButton.tsx'])assert.doesNotMatch(read(path),/router\.refresh\(|location\.reload\(/,path);
 const snapshot=read('lib/conversationSnapshot.ts');assert.match(snapshot,/sender_id\.eq\.\$\{user.id\}/);assert.match(snapshot,/recipient_id\.eq\.\$\{user.id\}/);assert.match(snapshot,/profile_visibility !== 'public'/);
 assert.match(read('app/api/interactions/[action]/route.ts'),/track_splits/);
});
test('background endpoint caps payloads before touching an operation',async()=>{const {post,calls}=route();assert.equal((await post('library',{body:'x'.repeat(1024*1024+1)})).status,413);assert.equal(calls.length,0);});
test('split background response reloads only the authorised proposal and keeps its version',async()=>{
 const filters=[];const projectId='project-a',trackId='track-a';
 const admin={from(table){const query={select(){return query},eq(key,value){filters.push([table,key,value]);return query},order:async()=>({data:[{id:'share',percentage:100}],error:null}),maybeSingle:async()=>({data:{version:2,status:'draft'},error:null})};return query}};
 const {POST}=load('app/api/interactions/[action]/route.ts',()=>({updateSplitPlan:async()=>({success:'Draft saved.'}),getWorkspace:async()=>({admin,activeProjects:[{id:projectId}]})}));
 const form=new FormData();form.set('project_id',projectId);form.set('track_id',trackId);
 const response=await POST(new Request('https://music.test/api/interactions/split',{method:'POST',headers:{origin:'https://music.test'},body:form}),{params:Promise.resolve({action:'split'})});
 const result=await response.json();assert.equal(result.value.snapshot.version,2);assert.equal(result.value.snapshot.rows.length,1);
 for(const table of ['track_splits','track_split_plans'])for(const [key,value]of [['project_id',projectId],['track_id',trackId]])assert.ok(filters.some(filter=>JSON.stringify(filter)===JSON.stringify([table,key,value])));
});

test("collection cards retain distinct artist IDs even when display names match",()=>{const source=read("components/ListenerExperience.tsx");assert.match(source,/id:`\$\{r.artist_id\}:\$\{r.collection\}`/);assert.match(source,/key=\{collection.id\}/);});

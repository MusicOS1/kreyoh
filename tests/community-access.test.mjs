import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
function moduleAt(path,require){const source=readFileSync(new URL(path,import.meta.url),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};new Function('require','exports',code)(require,exports);return exports;}
test('community writes require a verified active account from the server session',async()=>{
 for(const workspace of [{user:{},profile:{account_status:'active'}},{user:{email_confirmed_at:'now'},profile:{account_status:'suspended'}}]){
 const m=moduleAt('../lib/community.ts',name=>name.includes('workspace')?{getWorkspace:async()=>workspace}:{});await assert.rejects(m.communityAccount());
 }
 const workspace={user:{id:'real-user',email_confirmed_at:'now'},profile:{account_status:'active'}};
 const m=moduleAt('../lib/community.ts',name=>name.includes('workspace')?{getWorkspace:async()=>workspace}:{});assert.equal((await m.communityAccount()).user.id,'real-user');
});
test('release media is public only after approval and release time; previews require owner or music admin',async()=>{
 const id='00000000-0000-0000-0000-000000000001';
 async function request(status='published',future=false,user=null,permission=false,key=`releases/artist/${id}/audio`){
 const calls=[];const query={select(){return this},eq(){return this},async maybeSingle(){return{data:{artist_id:'artist',status,release_at:new Date(Date.now()+(future?86400000:-1000)).toISOString(),audio_key:key},error:null}}};
 const m=moduleAt('../app/api/releases/[releaseId]/media/route.ts',name=>name.includes('supabase/admin')?{createAdminClient:()=>({from:()=>query})}:name.endsWith('/r2')?{createR2PresignedUrl:async(...args)=>{calls.push(args);return'https://storage.example/signed'}}:name.includes('controlRoom')?{hasControlRoomPermission:async()=>permission}:{viewer:async()=>user,uuidPattern:/^[0-9a-f-]{36}$/});
 const response=await m.GET(new Request('https://music.example/media'),{params:Promise.resolve({releaseId:id})});return{response,calls};
 }
 for(const args of [['pending'],['published',true],['withdrawn'],['draft',false,{id:'outsider'}]]){const{response,calls}=await request(...args);assert.equal(response.status,404);assert.equal(calls.length,0);}
 for(const args of [[],['pending',false,{id:'artist'}],['pending',false,{id:'admin'},true]]){const{response}=await request(...args);assert.equal(response.status,307);assert.equal(response.headers.get('cache-control'),'private, no-store');}
 assert.equal((await request('published',false,null,false,'private-project/stems.zip')).response.status,404);
});

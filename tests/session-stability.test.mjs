import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function load(path,overrides={}){
 const code=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',code)(id=>id in overrides?overrides[id]:require(id),module,module.exports);
 return module.exports;
}
const nav=load('lib/navigation.ts'),failure=load('lib/authFailure.ts');
const {restoreListening}=load('lib/listeningState.ts');
const {NextRequest}=require('next/server');
const configured={NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-key'};
async function request(path,{claims=null,error=null,throws=false,refresh=true,verified=true}={}){
 const old=Object.fromEntries(Object.keys(configured).map(k=>[k,process.env[k]]));Object.assign(process.env,configured);
 const {updateSession}=load('lib/supabase/proxy.ts',{'../navigation':nav,'../authFailure':failure,'@supabase/ssr':{createServerClient:(_url,_key,{cookies})=>({auth:{getUser:async()=>({data:{user:claims&&verified?{id:claims.sub}:null},error}),getClaims:async()=>{
  if(refresh)cookies.setAll([{name:'sb-test-auth-token',value:'new-token',options:{path:'/',maxAge:34560000,sameSite:'lax'}}],{'Cache-Control':'private, no-store',Pragma:'no-cache',Expires:'0'});
  if(throws)throw new TypeError('fetch failed');return {data:claims?{claims}:null,error};
 }}})}});
 try{return await updateSession(new NextRequest('https://music.test'+path,{headers:{cookie:'sb-test-auth-token=old-token'}}));}
 finally{for(const [key,value]of Object.entries(old))if(value===undefined)delete process.env[key];else process.env[key]=value;}
}
test('refreshed persistent cookies reach both browser and downstream server components',async()=>{
 const response=await request('/projects',{claims:{sub:'user'}});
 assert.equal(response.cookies.get('sb-test-auth-token').value,'new-token');
 assert.ok(response.cookies.get('sb-test-auth-token').maxAge>86400);
 assert.equal(response.headers.get('x-middleware-request-cookie'),'sb-test-auth-token=new-token');
 assert.equal(response.headers.get('x-middleware-request-x-fackts-path'),'/projects');
 assert.match(response.headers.get('cache-control'),/no-store/);
});
test('authentication redirects retain cookie rotation and exact deep link',async()=>{
 const response=await request('/tracks?project=x&song=y');
 const destination=new URL(response.headers.get('location'));
 assert.equal(destination.pathname,'/login');assert.equal(destination.searchParams.get('next'),'/tracks?project=x&song=y');
 assert.equal(response.cookies.get('sb-test-auth-token').value,'new-token');
 const signedIn=await request('/login?next=%2Ffan%3Ftab%3DArtists',{claims:{sub:'user'}});
 assert.equal(new URL(signedIn.headers.get('location')).pathname,'/fan');assert.match(signedIn.headers.get('cache-control'),/no-store/);
});
test('temporary authentication outages fail closed without claiming the user signed out',async()=>{
 for(const scenario of [{error:{name:'AuthRetryableFetchError',status:0}},{error:{status:503}},{error:{status:429}},{throws:true}]){
  const response=await request('/projects',scenario);assert.equal(response.status,503);assert.equal(response.headers.get('location'),null);assert.match(await response.text(),/does not mean you signed out/);
 }
 const publicPage=await request('/',{throws:true});assert.equal(publicPage.status,200);
});
test('signout and callbacks remain reachable for expired or revoked sessions',async()=>{
 for(const route of ['/auth/callback?code=test','/auth/signout','/api/session/status'])assert.equal((await request(route,{refresh:false})).headers.get('location'),null);
});
test('restore filters revoked media, deduplicates queue, bounds positions and rejects corrupt state',()=>{
 const now=Date.now(),saved={version:1,ids:['a','removed','b','a'],selected:'b',position:42,updatedAt:now};
 assert.deepEqual(restoreListening(saved,['a','b'],now),{...saved,ids:['a','b']});
 assert.equal(restoreListening(saved,['a'],now),null);
 for(const bad of [null,{}, {...saved,position:-1},{...saved,position:Infinity},{...saved,updatedAt:now-31*86400000},{...saved,ids:'a'}])assert.equal(restoreListening(bad,['a','b'],now),null);
 assert.equal(restoreListening({...saved,position:1e9},['a','b'],now).position,86400);
});
test('service worker never caches auth, APIs, private HTML or media and cleans only its own caches',async()=>{
 const handlers={},cacheDeletes=[],stored=[];
 const cache={addAll:async assets=>stored.push(...assets)};
 let networkFails=false;
 const caches={open:async()=>cache,keys:async()=>['fackts-music-shell-v5','unrelated-cache'],delete:async key=>cacheDeletes.push(key),match:async path=>path==='/offline.html'?new Response('Offline recovery'):undefined};
 const self={location:{origin:'https://music.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,handler)=>handlers[name]=handler};
 new Function('self','caches','fetch','Response','URL',read('public/sw.js'))(self,caches,async()=>{if(networkFails)throw new TypeError('Offline');return new Response('Network');},Response,URL);
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(stored,['/offline.html','/branding/fackts-music-logo.png']);
 handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(cacheDeletes,['fackts-music-shell-v5']);
 networkFails=true;
 handlers.fetch({request:{url:'https://music.test/projects',method:'GET',mode:'navigate'},respondWith:p=>pending=p});assert.equal(await (await pending).text(),'Offline recovery');
 for(const path of ['/login','/api/releases/123/media','/private.jpg','/_next/static/app.js']){
  let intercepted=false;handlers.fetch({request:{url:'https://music.test'+path,method:'GET',mode:'cors'},respondWith:()=>intercepted=true});assert.equal(intercepted,false,path);
 }
});
test('logout cannot be triggered by GET, prefetch or a cross-origin POST',async()=>{
 let signouts=0;
 const {GET,POST}=load('app/auth/signout/route.ts',{
  '../../../lib/supabase/admin':{createAdminClient:()=>{throw Error('No audit expected for missing user');}},
  '@supabase/ssr':{createServerClient:(_url,_key,{cookies})=>({auth:{getUser:async()=>({data:{user:null}}),signOut:async()=>{signouts++;cookies.setAll([{name:'sb-test-auth-token',value:'',options:{maxAge:0,path:'/'}}]);return {error:null};}}})},
 });
 const before={...process.env};Object.assign(process.env,configured);
 try {
  const confirm=await GET(new NextRequest('https://music.test/auth/signout'));assert.equal(confirm.status,200);assert.match(await confirm.text(),/method="post"/);assert.equal(signouts,0);
  const forbidden=await POST(new NextRequest('https://music.test/auth/signout',{method:'POST',headers:{Origin:'https://attacker.test'}}));assert.equal(forbidden.status,403);assert.equal(signouts,0);
  const signedOut=await POST(new NextRequest('https://music.test/auth/signout',{method:'POST',headers:{Origin:'https://music.test'}}));assert.equal(signouts,1);assert.equal(signedOut.status,303);assert.equal(signedOut.cookies.get('sb-test-auth-token').value,'');assert.equal(signedOut.cookies.get('fackts_project_id').maxAge,0);
 }finally{for(const key of Object.keys(configured))if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}
});

test('a cryptographically valid but remotely revoked session does not loop away from login',async()=>{
 const response=await request('/login',{claims:{sub:'revoked-user'},verified:false});
 assert.equal(response.status,200);assert.equal(response.headers.get('location'),null);
});

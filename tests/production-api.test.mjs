import{test}from'node:test';import assert from'node:assert/strict';import ts from'typescript';import{readFileSync}from'node:fs';
const load=(path,deps={})=>{const out={};new Function('require','exports',ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>deps[name]||{},out);return out;};
const policy=load('lib/productionPolicy.ts');
function fixture({actor='engineer',member=true,roles=['Engineer'],parts=[{PartNumber:1,Size:16*1024**2,ETag:'part1'},{PartNumber:2,Size:1024,ETag:'part2'}],head=false}={}){
 const ledger=[],writes=[],storage=[];let objectExists=head;
 const admin={from(table){const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},async maybeSingle(){if(table==='tracks')return{data:filters.some(([k,v])=>k==='id'&&v==='foreign')?null:{id:'track'},error:null};return{data:ledger.find(r=>filters.every(([k,v])=>r[k]===v))||null,error:null}},async insert(row){ledger.push({...row,status:'uploading',expires_at:new Date(Date.now()+86400000).toISOString()});return{error:null}},update(row){q.then=resolve=>{const target=ledger.find(r=>filters.every(([k,v])=>r[k]===v));if(target)Object.assign(target,row);resolve({error:null});};return q}};return q;},async rpc(name,args){writes.push({name,args});return{data:{asset_id:'saved'},error:null}}};
 const access=load('lib/productionAccess.ts',{'./workspace':{getWorkspace:async()=>({admin,user:{id:actor},project:{id:'project'},membership:member?{}:null,roles}),hasAnyRole:(roles,allowed)=>roles.some(r=>allowed.includes(r))},'./productionPolicy':policy});
 const r2={async startR2Multipart(){storage.push('start');return 'multipart'},async signR2Part(){storage.push('sign');return 'https://storage.test/part'},async listR2Parts(){return parts},async abortR2Multipart(){storage.push('abort')},async assertR2ObjectAccess(){if(!objectExists)throw Error('not uploaded');return{ContentLength:16*1024**2+1024,ContentType:'audio/wav',ETag:'server-etag'}},async finishR2Multipart(){objectExists=true;storage.push('complete')}};
 const route=load('app/api/production/uploads/route.ts',{'../../../../lib/productionAccess':access,'../../../../lib/productionPolicy':policy,'../../../../lib/r2':r2});
 const request=async(body,origin='https://music.test')=>{const response=await route.POST(new Request('https://music.test/api/production/uploads',{method:'POST',headers:{Origin:origin,Host:'music.test','Content-Type':'application/json'},body:JSON.stringify(body)}));return{status:response.status,data:await response.json()};};
 return{ledger,writes,storage,request};
}
const start={action:'start',trackId:'track',name:'mix.wav',size:16*1024**2+1024,type:'audio/wav',kind:'mix'};
test('upload endpoint denies cross-site, non-member, foreign track and unsupported file requests before storage',async()=>{
 for(const options of[{member:false},{roles:['Fan']},{actor:'outsider',member:false}]){const f=fixture(options);assert.equal((await f.request(start)).status,400);assert.deepEqual(f.storage,[]);}
 const f=fixture();for(const body of[{...start,trackId:'foreign'},{...start,size:21*1024**3},{...start,name:'page.html'}])assert.equal((await f.request(body)).status,400);assert.equal((await f.request(start,'https://attacker.test')).status,400);assert.deepEqual(f.storage,[]);
});
test('multipart endpoint binds upload to account/project and accepts only exact server-observed part lengths',async()=>{
 const f=fixture();const prepared=await f.request(start);assert.equal(prepared.status,200);const id=prepared.data.id;assert.equal(f.ledger[0].user_id,'engineer');
 assert.equal((await f.request({action:'part',id,part:0})).status,400);assert.equal((await f.request({action:'part',id,part:3})).status,400);assert.equal((await f.request({action:'part',id,part:1})).status,200);
 assert.equal((await f.request({action:'complete',id})).status,200);assert.equal(f.writes[0].args.p_actor,'engineer');assert.equal(f.writes[0].args.p_data.etag,'server-etag');assert.equal(f.writes[0].args.p_data.size,start.size);
 const broken=fixture({parts:[{PartNumber:1,Size:12,ETag:'bad'}]});const b=await broken.request(start);const failed=await broken.request({action:'complete',id:b.data.id});assert.equal(failed.status,400);assert.match(failed.data.error,/missing or incomplete/);assert.equal(broken.writes.length,0);
 f.ledger[0].user_id='another-user';assert.equal((await f.request({action:'part',id,part:1})).status,400);
});
test('a lost multipart-completion response recovers from verified HEAD without reupload; abort touches only owned transfer',async()=>{
 const f=fixture({head:true});const p=await f.request(start);assert.equal((await f.request({action:'complete',id:p.data.id})).status,200);assert.equal(f.storage.includes('complete'),false);
 const a=fixture();const prepared=await a.request(start);assert.equal((await a.request({action:'abort',id:prepared.data.id})).status,200);assert.equal(a.ledger[0].status,'aborted');assert.equal((await a.request({action:'part',id:prepared.data.id,part:1})).status,400);
});

import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
function load(path,mocks={}){const module={exports:{}};const source=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',source)(name=>{if(name in mocks)return mocks[name];throw Error('Unexpected dependency '+name);},module,module.exports);return module.exports;}
const {readAllRows}=load('lib/recordReads.ts');
test('paged ledger reads include all 2005 records and fail closed on a later-page error',async()=>{
 const records=Array.from({length:2005},(_,id)=>({id}));let fail=false;
 const query=()=>({range(start,end){return Promise.resolve({data:records.slice(start,end+1),error:fail&&start===1000?{message:'outage'}:null});}});
 assert.equal((await readAllRows(query)).count,2005);fail=true;const result=await readAllRows(query);assert.equal(result.data,null);assert.equal(result.count,null);assert.ok(result.error);
});
const {productionAttribution}=load('lib/productionAttribution.ts',{'./profileIdentity':load('lib/profileIdentity.ts')});
test('recording artist, features and producers come from their credits, never the uploader',()=>{
 const row={uploaded_by:'Joseph',track_contributors:[{contribution_role:'artist',profiles:{stage_name:'Actual Artist'}},{contribution_role:'featured_artist',profiles:{full_name:'Guest'}},{contribution_role:'producer',profiles:{stage_name:'Producer'}}]};
 const result=productionAttribution(row);assert.equal(result.artist,'Actual Artist');assert.equal(result.featured,'Guest');assert.equal(result.producer,'Producer');assert.equal(result.masterEvidence,'Not documented');assert.equal(productionAttribution({uploaded_by:'Joseph'}).artist,'Recording artist not recorded');
});
function finance(roles=['Project Lead'],scope=true){const writes=[];const admin={from(table){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:scope?{id:'track'}:null,error:null}),insert:async row=>{writes.push({table,row});return {error:null};}};return q;}};const api=load('app/finance/actions.ts',{'next/cache':{revalidatePath(){}},'../../lib/workspace':{getWorkspace:async()=>({admin,user:{id:'actor'},project:{id:'project'},roles}),hasAnyRole:(r,allowed)=>r.some(role=>allowed.includes(role))},'../../lib/profileIdentity':load('lib/profileIdentity.ts'),'../../lib/projectNotifications':{notifyUser(){}}});return {api,writes};}
function entry(kind='income',amount='500'){const f=new FormData();for(const [k,v] of Object.entries({kind,amount,date:'2026-10-28',description:'Test receipt',category:'Sync'}))f.set(k,v);return f;}
test('simple finance writes reuse existing ledgers with paid status, exact dates and an audit record',async()=>{
 for(const kind of ['income','expense']){const {api,writes}=finance();assert.equal((await api.recordSimpleTransaction({},entry(kind))).message,'Transaction saved.');assert.equal(writes[0].table,kind==='income'?'revenue_records':'project_expenses');assert.equal(writes[0].row.amount,500);assert.equal(writes[0].row.payment_status,'paid');assert.equal(writes[0].row.project_id,'project');assert.equal(writes[1].table,'platform_events');}
});
test('finance rejects unauthorised roles, nonpositive amounts, invalid dates and foreign track/member references before writes',async()=>{
 for(const [roles,scope,mutate] of [[['Artist'],true,()=>{}],[['Project Lead'],true,f=>f.set('amount','-1')],[['Project Lead'],true,f=>f.set('date','2026-02-30')],[['Project Lead'],false,f=>f.set('track_id','foreign')],[['Project Lead'],false,f=>f.set('member_user_id','foreign')]]){const f=finance(roles,scope),fd=entry();mutate(fd);const r=await f.api.recordSimpleTransaction({},fd);assert.notEqual(r.message,'Transaction saved.');assert.deepEqual(f.writes,[]);}
});

test('isolated multi-user refresh retains each account identity rather than falling back to a shared user',async()=>{
 const {mockSupabase}=await import('./helpers/mock-supabase.mjs');const users=[{id:'one',email:'one@example.test'},{id:'two',email:'two@example.test'}];const {server}=mockSupabase({users});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const origin='http://127.0.0.1:'+server.address().port;for(const user of users){const login=await (await fetch(origin+'/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:user.email})})).json();const refresh=await(await fetch(origin+'/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:login.refresh_token})})).json();assert.equal(refresh.user.id,user.id);}}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('session lists reconcile four historical records without granting unassigned members access',async()=>{
 const data=[{id:'a',created_by:'creator-one'},{id:'b',created_by:'creator-one'},{id:'c',created_by:'creator-one'},{id:'d',created_by:'creator-two'}].map(row=>({...row,session_participants:[]}));
 const admin={from(){const q={select(){return q},eq(){return q},order(){return q},range:async()=>({data,error:null})};return q;}};
 const api=load('lib/sessionAccess.ts',{'./workspace':{hasAnyRole:(roles,allowed)=>roles.some(r=>allowed.includes(r))},'./recordReads':{readAllRows}});
 assert.equal((await api.loadProjectSessions(admin,'project','coordinator',['Project Lead'])).count,4);
 assert.equal((await api.loadProjectSessions(admin,'project','unassigned',['Engineer'])).count,0);
 assert.equal((await api.loadProjectSessions(admin,'project','creator-one',[])).count,3);
 assert.equal((await api.loadProjectSessions(admin,'project','creator-two',[])).count,1);
});
test('ordinary session participants cannot forge a management follow-up assignment',async()=>{
 let scoped=false;
 const api=load('app/studio-sessions/actions.ts',{'next/cache':{revalidatePath(){}},'../../lib/sessionAccess':{requireSessionParticipation(){scoped=true;}},'../../lib/studioScope':{requireStudioScope(){scoped=true;}},'../../lib/workspace':{getWorkspace:async()=>({admin:{},user:{id:'artist'},project:{id:'project'},membership:{id:'member'},roles:['Artist']}),hasAnyRole:(roles,allowed)=>roles.some(r=>allowed.includes(r))}});
 const fd=new FormData();fd.set('session_id','session');fd.set('title','Forged assignment');fd.set('assignee_id','member');
 await assert.rejects(api.assignSessionAction(fd),/cannot assign/);assert.equal(scoped,false);
});

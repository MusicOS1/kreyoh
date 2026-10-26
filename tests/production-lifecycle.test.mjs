// Original beat/session/credit actions + original split RPC + new production RPC.
// Isolated PostgreSQL and local REST only; no commercial records or live services.
import {test}from'node:test';import assert from'node:assert/strict';import ts from'typescript';import{readFileSync}from'node:fs';import{createClient}from'@supabase/supabase-js';
import{productionDatabase,mutate,pid,lead,engineer,artist}from'./helpers/production-database.mjs';import{productionRest}from'./helpers/production-rest.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const load=(file,deps)=>{const out={};new Function('require','exports',ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>deps[name]||{},out);return out;};
test('isolated project lifecycle reuses actual beat, recording, credit and split workflows through current master and private history',async()=>{
 const db=await productionDatabase(),rest=productionRest(db);await new Promise(r=>rest.server.listen(0,'127.0.0.1',r));
 try{
  await db.exec(`alter table tracks alter column id set default gen_random_uuid();alter table tracks add column beat_id uuid,add column created_by uuid;
  alter table projects add column default_beat_capacity int default 3;
  create table beats(id uuid primary key default gen_random_uuid(),project_id uuid,title text,beat_code text,producer_name text,producer_user_id uuid,artist_capacity int default 3,status text default 'available',updated_at timestamptz default now());
  create table beat_claims(id uuid primary key default gen_random_uuid(),beat_id uuid,project_id uuid,artist_id uuid,notes text,status text default 'claimed');
  alter table studio_sessions alter column id set default gen_random_uuid();alter table studio_sessions add column ends_at timestamptz,add column location text,add column notes text,add column outcomes text,add column media_source_url text,add column media_notes text,add column is_backlog boolean,add column updated_at timestamptz default now();
  create table session_contributions(id uuid primary key default gen_random_uuid(),session_id uuid,project_id uuid,track_id uuid,contributor_id uuid,contribution_type text,description text,created_by uuid);
  alter table track_split_plans alter column version set default 0;alter table track_split_plans add column updated_at timestamptz default now();
  alter table track_splits add column project_id uuid,add column contribution_role text,add column created_by uuid,add column confirmed_at timestamptz,add column updated_at timestamptz default now();
  alter table track_rights_checks add column project_id uuid,add column updated_by uuid,add column updated_at timestamptz default now(),add constraint unique_track_check unique(track_id,check_key);
  alter table notifications add column action_url text;
  create function auth.role()returns text language sql stable as $$select 'service_role'::text$$;
  create function public.is_project_member(p_project_id uuid)returns boolean language sql stable as $$select exists(select 1 from public.project_members where project_id=p_project_id and user_id=auth.uid()and status='active')$$;
  create function public.has_project_role(p_project_id uuid,p_roles text[])returns boolean language sql stable as $$select production_has_role(p_project_id,auth.uid(),p_roles)$$;`);
  const beatSource=read('supabase/migrations/20260823_fackts_music_operations.sql');const begin=beatSource.indexOf('create or replace function public.claim_beat(');const end=beatSource.indexOf('\n$$;',begin)+4;await db.exec(beatSource.slice(begin,end));
  const splits=read('supabase/migrations/20260927173036_member_split_workflow.sql');const splitBegin=splits.indexOf('create function public.manage_split_plan(');const splitEnd=splits.indexOf('\n$$;',splitBegin)+4;await db.exec(splits.slice(splitBegin,splitEnd));
  const beat=(await db.query("insert into beats(project_id,title,beat_code,producer_user_id)values($1,'Isolated source beat','LOCAL-BEAT',$2)returning id",[pid,engineer])).rows[0].id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[artist]);await db.query('select claim_beat($1,$2)',[beat,'Synthetic preparation request. No licence or purchase.']);
  await assert.rejects(db.query('select claim_beat($1,$2)',[beat,'Duplicate']),/already hold/);
  const admin=createClient('http://127.0.0.1:'+rest.server.address().port,'local-test-service-key',{auth:{persistSession:false,autoRefreshToken:false}});
  let actor=lead;const workspace={getWorkspace:async()=>{const roles=(await db.query('select r.name from project_members m join member_roles mr on mr.project_member_id=m.id join roles r on r.id=mr.role_id where m.project_id=$1 and m.user_id=$2 and m.status=$3',[pid,actor,'active'])).rows.map(r=>r.name);return{admin,supabase:admin,user:{id:actor},project:{id:pid},membership:roles.length?{}:null,roles};},hasAnyRole:(roles,allowed)=>roles.some(r=>allowed.includes(r))};
  const fd=data=>{const f=new FormData();for(const[k,v]of Object.entries(data))f.set(k,v);return f;};
  const beatActions=load('app/beats/actions.ts',{'../../lib/workspace':workspace,'../../lib/supabase/admin':{createAdminClient:()=>admin},'next/cache':{revalidatePath(){}},'next/navigation':{redirect:url=>{throw Error('REDIRECT '+url)}}});
  await assert.rejects(beatActions.convertToTrack(fd({beat_id:beat,title:'Isolated lifecycle song'})),/REDIRECT.*message=/);
  const song=(await db.query('select * from tracks where beat_id=$1',[beat])).rows[0];assert.ok(song.id);assert.equal((await db.query('select count(*)::int n from track_contributors where track_id=$1',[song.id])).rows[0].n,2);
  const scope=load('lib/studioScope.ts',{}),participation=load('lib/sessionAccess.ts',{'./workspace':workspace});
  const studio=load('app/studio-sessions/actions.ts',{'../../lib/workspace':workspace,'../../lib/studioScope':scope,'../../lib/sessionAccess':participation,'next/cache':{revalidatePath(){}}});
  actor=engineer;await studio.createSession(fd({track_id:song.id,starts_at:'2026-11-01T10:00:00Z',participants:artist,engineer_id:engineer,producer_id:engineer,notes:'Record authorised fixture vocals.'}));
  const session=(await db.query('select * from studio_sessions where track_id=$1',[song.id])).rows[0];assert.ok(session.id);
  actor=artist;await studio.recordContribution(fd({session_id:session.id,track_id:song.id,contribution_type:'lead_vocal',description:'Synthetic recording contribution for acceptance only.'}));
  actor=engineer;await studio.updateSession(fd({session_id:session.id,status:'complete',outcomes:'Authorised test session completed.'}));
  assert.equal((await db.query('select status from studio_sessions where id=$1',[session.id])).rows[0].status,'complete');
  const register=async(kind,title)=>{const id=crypto.randomUUID(),key=`${pid}/tracks/${song.id}/${id}.wav`;await db.query("insert into production_uploads(id,project_id,track_id,user_id,storage_key,final_key,file_name,mime_type,byte_size,asset_kind)values($1,$2,$3,$4,$5,$5,$6,'audio/wav',314572800,$7)",[id,pid,song.id,engineer,key,title,kind]);return(await mutate(db,engineer,'register_upload',id,{size:314572800,key,etag:'isolated-storage-metadata'},0,id)).asset_id;};
  await register('stems','Authorised stems.wav');const mix=await register('mix','Mix V1.wav');await mutate(db,engineer,'submit',mix,{reviewer:artist});await mutate(db,artist,'changes_requested',mix,{note:'Revise the backing vocals.'},1);
  const revised=await register('mix','Mix V2.wav');await mutate(db,engineer,'submit',revised,{reviewer:artist});await mutate(db,artist,'approve',revised,{note:'Revised balance approved.'},1);
  const master=await register('master','Final master.wav');await mutate(db,engineer,'submit',master,{reviewer:artist});await mutate(db,artist,'approve',master,{note:'Specific final master approved.'},1);
  const credits=load('app/track-records/actions.ts',{'../../lib/workspace':workspace,'next/cache':{revalidatePath(){}}});actor=lead;
  for(const credit of(await db.query('select id from track_contributors where track_id=$1',[song.id])).rows)await credits.approveTrackCredit(fd({track_id:song.id,credit_id:credit.id}));
  const split=async(actor,op,version,rows=[],splitId=null)=>(await db.query('select manage_split_plan($1,$2,$3,$4,$5,$6,$7,$8)r',[actor,pid,song.id,op,version,rows,splitId,null])).rows[0].r;
  await split(lead,'save',0,[{contributor_id:artist,contribution_role:'Artist',percentage:80},{contributor_id:engineer,contribution_role:'Producer',percentage:20}]);await split(lead,'send',1);
  for(const share of(await db.query('select * from track_splits where track_id=$1',[song.id])).rows)await split(share.contributor_id,'confirm',2,[],share.id);
  await db.query('update tracks set artwork_url=$1 where id=$2',['https://example.test/authorised-fixture-cover.webp',song.id]);
  await db.query("insert into track_rights_checks(project_id,track_id,check_key,status,evidence_note)select $1,$2,k,'not_applicable','Isolated technical fixture evidence only, no legal clearance.'from unnest(array['producer_agreement','beat_rights','songwriter_credits','samples_cleared','performer_approvals','master_ownership'])k",[pid,song.id]);
  await mutate(db,lead,'signoff',song.id,{note:'Reviewed the fixture evidence and approved master.'});await mutate(db,lead,'track_stage',song.id,{stage:'release_ready'});
  assert.equal((await db.query('select production_readiness($1)r',[song.id])).rows[0].r.state,'Ready');
  assert.equal((await db.query("select count(*)::int n from project_assets where entity_id=$1 and uploaded_by=$2 and review_status='approved'",[song.id,engineer])).rows[0].n,2);
  assert.equal((await db.query('select count(*)::int n from beat_claims where beat_id=$1',[beat])).rows[0].n,1);assert.equal((await db.query('select status from beats where id=$1',[beat])).rows[0].status,'filling');
 }finally{rest.server.closeAllConnections();rest.server.close();await db.close();}
});

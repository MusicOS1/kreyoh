// KRE-14 candidate: in-memory PGlite only, never a configured production database.
// Copy to tests/ in the full repo. Existing helper creates a fresh PGlite per call.
// The telemetry fixture reproduces the deployed columns, constraints, indexes and count functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {productionDatabase,addVersion,readyEvidence,mutate,pid,track,lead,artist,outsider,engineer} from './helpers/production-database.mjs';
import {releaseMutation,releaseData} from './helpers/release-database.mjs';
const migration = name => readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const workflow='20261029041845_release_audience_workflow.sql';
const ids={published:crypto.randomUUID(),draft:crypto.randomUUID(),future:crypto.randomUUID(),playlist:crypto.randomUUID(),fresh:crypto.randomUUID()};
const columnsAdded=['source_project_id','source_track_id','source_master_id','source_cover_id','submitted_by','featured_artist_ids','release_type','isrc','upc','workflow_state','revision','release_permission','artwork_authorised','approved_fingerprint','source_fingerprint'];
const rows=async(db,sql,args=[]) => (await db.query(sql,args)).rows;
const snapshot=async(db,after=false)=>({
 releases:await rows(db,`select ${after?"to_jsonb(r)-$1::text[]":"to_jsonb(r)"} as row from music_releases r order by id`,after?[columnsAdded]:[]),
 profiles:await rows(db,'select to_jsonb(p) as row from profiles p order by id'),
 ownership:await rows(db,'select to_jsonb(a) as row from music_catalogue_attributions a order by id'),
 packages:await rows(db,'select to_jsonb(p) as row from music_release_packages p order by id'),
 playlists:await rows(db,'select to_jsonb(l) as row from fan_music_library l order by user_id,kind,item_id'),
 votes:await rows(db,'select to_jsonb(v) as row from music_votes v order by release_id,user_id,week_start'),
 history:await rows(db,'select to_jsonb(s) as row from music_play_sessions s order by id'),
 publicIds:await rows(db,'select id,artist_id,title,credits,votes from music_weekly_chart order by id')
});
test('KRE-14: out-of-order release workflow migration preserves legacy release, credit, package, playlist and historical records',async()=>{
 const db=await productionDatabase();
 try{
  await db.exec(`alter table profiles add column profile_visibility text default 'public',add column nickname text,add column public_slug text;update profiles set creator_types=array['Artist'] where id='${artist}';create table control_room_admins(user_id uuid primary key,active boolean,permissions text[]);insert into control_room_admins values('${outsider}',true,array['music']);`);
  for(const name of ['20261010191541_public_releases_and_member_messages.sql','20261011163144_fan_music_library.sql','20261011195500_music_release_comments.sql'])await db.exec(migration(name));
  for(const [id,status,future] of [[ids.published,'published',false],[ids.draft,'draft',false],[ids.future,'published',true]])await db.query(`insert into music_releases(id,artist_id,title,artist_name,collection,genre,credits,status,release_at,rights_confirmed_at,audio_key,audio_type) values($1,$2,$3,'Fixture Artist','Legacy EP','Afro fusion','Fixture Artist; off-platform credit',$4,now()+case when $5::boolean then interval '1 year' else interval '-1 day' end,case when $4='published' then now() else null end,$6,'audio/wav')`,[id,artist,'Legacy '+status+(future?' future':''),status,future,`releases/${artist}/${id}/audio`]);
  // These two actual later migrations are already present in the production baseline.
  await db.exec(migration('20261102_music_catalogue_attributions.sql'));
  await db.exec(migration('20261108185000_admin_release_packages.sql'));
  await db.query(`insert into music_catalogue_attributions(release_id,credited_artist_profile_id,credited_artist_name,credit_verified,credit_evidence_reference,ownership_kind,rights_holder_name,rights_evidence_reference,verification_state)values($1,$2,'Fixture Artist',true,'synthetic-credit','artist','Fixture Artist','synthetic-rights','verified')`,[ids.published,artist]);
  await db.query(`insert into fan_music_library(user_id,kind,item_id,label,track_ids)values($1,'playlist',$2,'Existing playlist',array[$3::uuid])`,[engineer,ids.playlist,ids.published]);
  await db.query(`insert into music_votes(release_id,user_id,week_start)values($1,$2,date_trunc('week',now() at time zone 'Africa/Nairobi')::date)`,[ids.published,engineer]);
  await db.exec('create table auth.users(id uuid primary key); insert into auth.users select id from profiles');
  await db.exec(readFileSync(new URL('./fixtures/play-accounting.sql',import.meta.url),'utf8'));
  await db.query(`insert into music_play_sessions(id,release_id,listener_key,duration_seconds,listened_seconds,qualified_at,qualified_bucket)
    values(gen_random_uuid(),$1,'fixture:guest',60,30,now(),1),
          (gen_random_uuid(),$1,'fixture:member',90,30,now(),2),
          (gen_random_uuid(),$1,'fixture:short',60,2,null,null)`,[ids.published]);
  const before=await snapshot(db);assert.deepEqual(before.publicIds.map(x=>x.id),[ids.published]);
  await db.exec(migration(workflow));
  assert.equal(Number((await rows(db,'select plays from public_release_play_counts($1)',[[ids.published]]))[0].plays),2);
  assert.deepEqual(await snapshot(db,true),before,'Migration must not rewrite prior records or change public legacy catalogue');
  const signatures=['release_mutate(uuid,text,uuid,integer,jsonb,uuid)','release_requirements(uuid)','release_public_eligible(uuid)','release_engagement(uuid,uuid)','add_release_to_playlist(uuid,uuid,uuid)'];
  for(const sig of signatures){const [r]=await rows(db,`select to_regprocedure($1) is not null as present,has_function_privilege('anon',$1,'execute') as anon,has_function_privilege('authenticated',$1,'execute') as authenticated,has_function_privilege('service_role',$1,'execute') as service`,['public.'+sig]);assert.deepEqual(r,{present:true,anon:false,authenticated:false,service:true},sig);}
  assert.deepEqual(await rows(db,'select id,release_public_eligible(id) eligible from music_releases order by id'),[...[[ids.published,true],[ids.draft,false],[ids.future,false]].map(([id,eligible])=>({id,eligible}))].sort((a,b)=>a.id.localeCompare(b.id)));
  // Reuse the real workflow fixture to prove a new linked release can coexist with legacy rows.
  const master=await addVersion(db,'master','Approved master.wav');await db.query("update project_assets set review_status='approved' where id=$1",[master.id]);await readyEvidence(db);
  const cover=crypto.randomUUID();await db.query("insert into project_assets(id,project_id,entity_type,entity_id,uploaded_by,bucket_id,storage_path,file_name,mime_type,asset_kind,review_status,created_at)values($1,$2,'track',$3,$4,'r2',$5,'Approved cover.png','image/png','visual','approved',now()-interval '3 hours')",[cover,pid,track,artist,`${pid}/tracks/${track}/cover.png`]);
  await mutate(db,lead,'signoff',track,{note:'Synthetic migration acceptance only.'});
  let r=await releaseMutation(db,lead,'create',ids.fresh,0,{track_id:track});r=await releaseMutation(db,lead,'save',ids.fresh,r.revision,{...releaseData(cover),release_at:new Date(Date.now()-3600000).toISOString()});
  r=await releaseMutation(db,lead,'submit',ids.fresh,r.revision);assert.equal((await rows(db,'select release_public_eligible($1) eligible',[ids.fresh]))[0].eligible,false);
  r=await releaseMutation(db,outsider,'approve',ids.fresh,r.revision);r=await releaseMutation(db,outsider,'publish',ids.fresh,r.revision);assert.equal(r.state,'published');
  assert.deepEqual(new Set((await rows(db,'select id from music_weekly_chart')).map(x=>x.id)),new Set([ids.published,ids.fresh]));
  const [linked]=await rows(db,'select artist_id,source_project_id,source_track_id from music_releases where id=$1',[ids.fresh]);assert.deepEqual(linked,{artist_id:artist,source_project_id:pid,source_track_id:track});
  await db.query('select add_release_to_playlist($1,$2,$3)',[engineer,ids.playlist,ids.fresh]);await db.query('select add_release_to_playlist($1,$2,$3)',[engineer,ids.playlist,ids.fresh]);
  assert.deepEqual((await rows(db,'select track_ids from fan_music_library where item_id=$1',[ids.playlist]))[0].track_ids,[ids.published,ids.fresh]);
  await assert.rejects(db.query('select add_release_to_playlist($1,$2,$3)',[artist,ids.playlist,ids.fresh]),/your existing playlists/);
  await assert.rejects(db.query('select add_release_to_playlist($1,$2,$3)',[engineer,ids.playlist,ids.draft]),/unavailable/);
  assert.deepEqual(await rows(db,'select to_jsonb(s) as row from music_play_sessions s order by id'),before.history);
 }finally{await db.close();}
});

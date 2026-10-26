import {test} from 'node:test';import assert from 'node:assert/strict';
import {productionDatabase,mutate,addVersion,readyEvidence,pid,track,lead,engineer,artist,outsider,session} from './helpers/production-database.mjs';
test('version-specific production reviews enforce membership, authority, revisions, atomic audit and deduplicated tasks',async()=>{
 const db=await productionDatabase();try{
  const version=await addVersion(db);const request=crypto.randomUUID();
  await assert.rejects(mutate(db,outsider,'submit',version.id,{reviewer:artist}),/membership/);
  await assert.rejects(mutate(db,engineer,'submit',version.id,{reviewer:engineer}),/independent/);
  const input={reviewer:artist,note:'Review the vocal balance.'};
  assert.equal((await mutate(db,engineer,'submit',version.id,input,0,request)).status,'submitted');
  await mutate(db,engineer,'submit',version.id,input,0,request);
  assert.equal((await db.query('select count(*)::int n from project_tasks')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from notifications')).rows[0].n,1);
  await assert.rejects(mutate(db,lead,'approve',version.id,{note:'Not assigned'},1),/assigned/);
  await assert.rejects(mutate(db,artist,'approve',version.id,{note:'Stale'},0),/changed/);
  await mutate(db,artist,'changes_requested',version.id,{note:'Reduce the backing vocal.'},1);
  const v2=await addVersion(db,'mix','Fixture mix V2.wav');assert.equal(v2.review_status,'in_progress');
  await mutate(db,engineer,'submit',v2.id,{reviewer:artist},0);
  await mutate(db,artist,'approve',v2.id,{note:'Balance approved.'},1);
  assert.equal((await db.query('select review_status from project_assets where id=$1',[version.id])).rows[0].review_status,'changes_requested');
  await assert.rejects(mutate(db,engineer,'approve',v2.id,{note:'Invalid'},2),/submitted/);
  const v3=await addVersion(db);await mutate(db,engineer,'submit',v3.id,{reviewer:artist},0);
  await db.exec("create function fail_event()returns trigger language plpgsql as $$begin raise exception 'audit unavailable';end$$;create trigger fail_event before insert on platform_events for each row execute function fail_event();");
  await assert.rejects(mutate(db,artist,'approve',v3.id,{note:'Approve'},1),/audit unavailable/);
  assert.equal((await db.query('select review_status from project_assets where id=$1',[v3.id])).rows[0].review_status,'submitted');
  await db.exec('drop trigger fail_event on platform_events');
  await assert.rejects(mutate(db,artist,'approve',v3.id,{note:'Cross project'},1,crypto.randomUUID(),crypto.randomUUID()),/membership/);
  await assert.rejects(mutate(db,engineer,'submit',version.id,{reviewer:lead},2,request),/another operation/);
 }finally{await db.close();}
});
test('release readiness requires current approved master, evidence and snapshot-bound project-lead signoff',async()=>{
 const db=await productionDatabase();try{
  const readiness=async()=>(await db.query('select production_readiness($1) result',[track])).rows[0].result;
  assert.equal((await readiness()).state,'Blocked');
  await assert.rejects(mutate(db,lead,'signoff',track,{note:'Not complete'}),/outstanding/);
  await assert.rejects(mutate(db,engineer,'track_stage',track,{stage:'mixing'}),/coordinator/);
  await readyEvidence(db);const master=await addVersion(db,'master','Master V1.wav');
  await mutate(db,engineer,'submit',master.id,{reviewer:artist});await mutate(db,artist,'approve',master.id,{note:'Master approved'},1);
  assert.equal((await readiness()).state,'Needs attention');
  await assert.rejects(mutate(db,artist,'signoff',track,{note:'I am an artist'}),/Project-lead/);
  await mutate(db,lead,'signoff',track,{note:'Prepared evidence reviewed.'});assert.equal((await readiness()).state,'Ready');
  await mutate(db,lead,'track_stage',track,{stage:'release_ready'});
  await db.query("update track_rights_checks set evidence_note='Revised supporting evidence' where check_key='beat_rights'");
  assert.equal((await readiness()).checks.lead_signoff,false);
  await mutate(db,lead,'signoff',track,{note:'Revised evidence checked'});
  await addVersion(db,'master','Master V2.wav');assert.equal((await readiness()).state,'Blocked');
  await assert.rejects(mutate(db,lead,'track_stage',track,{stage:'complete'}),/not release-ready/);
  await assert.rejects(mutate(db,lead,'project_stage',pid,{stage:'Complete'}),/Every track/);
  await db.query("update track_splits set status='awaiting_confirmation'");assert.equal((await readiness()).checks.splits,false);
 }finally{await db.close();}
});
test('verified upload registration is account-scoped, idempotent and never inherits approval; private ledger denies browser roles',async()=>{
 const db=await productionDatabase();try{
  const id=crypto.randomUUID(),key=`${pid}/tracks/${track}/${id}.wav`;
  await db.query("insert into production_uploads(id,project_id,track_id,user_id,storage_key,final_key,file_name,mime_type,byte_size,asset_kind)values($1,$2,$3,$4,$5,$5,'large.wav','audio/wav',314572800,'master')",[id,pid,track,engineer,key]);
  await assert.rejects(mutate(db,artist,'register_upload',id,{size:314572800,key,etag:'verified'}),/account/);
  await assert.rejects(mutate(db,engineer,'register_upload',id,{size:25,key,etag:'verified'}),/match/);
  const input={size:314572800,key,etag:'verified'};const a=await mutate(db,engineer,'register_upload',id,input,0,id);await mutate(db,engineer,'register_upload',id,input,0,id);
  assert.equal((await db.query('select count(*)::int n from project_assets')).rows[0].n,1);
  const asset=(await db.query('select * from project_assets where id=$1',[a.asset_id])).rows[0];assert.equal(asset.review_status,'in_progress');assert.equal(Number(asset.byte_size),314572800);
  await db.exec('set role authenticated');await assert.rejects(db.query('select * from production_uploads'),/permission denied/);await assert.rejects(db.query('select production_readiness($1)',[track]),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});
test('session attendance remains unrecorded until an assigned coordinator explicitly records it',async()=>{
 const db=await productionDatabase();try{
  assert.equal((await db.query('select attendance from session_participants')).rows[0].attendance,'unrecorded');
  await assert.rejects(mutate(db,artist,'attendance',session,{participant:artist,attendance:'attended'}),/coordinator/);
  await mutate(db,engineer,'attendance',session,{participant:artist,attendance:'attended'});
  assert.equal((await db.query('select attendance,attendance_recorded_by from session_participants')).rows[0].attendance_recorded_by,engineer);
  await assert.rejects(mutate(db,engineer,'attendance',session,{participant:outsider,attendance:'attended'}),/not assigned/);
 }finally{await db.close();}
});
test('actual RLS hides unrelated sessions, cross-project records and uploader-private assets',async()=>{
 const db=await productionDatabase();try{
  const otherSession=crypto.randomUUID();await db.query('insert into studio_sessions(id,project_id,created_by)values($1,$2,$3)',[otherSession,pid,lead]);
  const privateAsset=await addVersion(db);await db.query("update project_assets set visibility='private'where id=$1",[privateAsset.id]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[artist]);await db.exec('set role authenticated');
  assert.equal((await db.query('select count(*)::int n from studio_sessions')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from project_assets')).rows[0].n,0);
  await assert.rejects(db.query("update session_participants set attendance='attended'"),/permission denied/);
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[outsider]);await db.exec('set role authenticated');assert.equal((await db.query('select count(*)::int n from studio_sessions')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from session_participants')).rows[0].n,0);
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[engineer]);await db.exec('set role authenticated');assert.equal((await db.query('select count(*)::int n from project_assets')).rows[0].n,1);
 }finally{await db.close();}
});
test('a required visual deliverable needs approval of its latest specific version, with signoff invalidation',async()=>{
 const db=await productionDatabase();try{
  await readyEvidence(db);const master=await addVersion(db,'master');await mutate(db,engineer,'submit',master.id,{reviewer:artist});await mutate(db,artist,'approve',master.id,{note:'Approved master'},1);
  await db.query("insert into track_rights_checks(track_id,check_key,status,evidence_note)values($1,'visual_assets','clear','Required approved visual treatment')",[track]);
  const readiness=async()=>(await db.query('select production_readiness($1)result',[track])).rows[0].result;
  assert.equal((await readiness()).checks.visual_requirements,false);
  const visual=await addVersion(db,'visual','Treatment V1.mp4');await mutate(db,engineer,'submit',visual.id,{reviewer:artist});await mutate(db,artist,'approve',visual.id,{note:'Approved visual treatment'},1);assert.equal((await readiness()).checks.visual_requirements,true);
  await mutate(db,lead,'signoff',track,{note:'Current visual and master reviewed.'});assert.equal((await readiness()).state,'Ready');
  await addVersion(db,'visual','Treatment V2.mp4');assert.equal((await readiness()).checks.visual_requirements,false);assert.equal((await readiness()).checks.lead_signoff,false);
 }finally{await db.close();}
});
test('private cover storage keys satisfy artwork readiness when public URL is blank',async()=>{
 const db=await productionDatabase();try{
  await db.query("update tracks set artwork_url='',artwork_storage_key='project/private-cover.webp'where id=$1",[track]);
  const ready=(await db.query('select production_readiness($1)result',[track])).rows[0].result;assert.equal(ready.checks.artwork,true);
 }finally{await db.close();}
});
test('legacy mutable uploads cannot receive version approval while an old PUT capability may remain valid',async()=>{
 const db=await productionDatabase();try{
  const row=(await db.query("insert into project_assets(project_id,entity_type,entity_id,uploaded_by,bucket_id,storage_path,file_name,mime_type,asset_kind)values($1,'track',$2,$3,'r2',$4,'Legacy mix.wav','audio/wav','mix')returning id",[pid,track,engineer,`${pid}/tracks/${track}/legacy.wav`])).rows[0];
  await assert.rejects(mutate(db,engineer,'submit',row.id,{reviewer:artist}),/not yet immutable/);
  await db.query("update project_assets set created_at=now()-interval '3 hours'where id=$1",[row.id]);
  assert.equal((await mutate(db,engineer,'submit',row.id,{reviewer:artist})).status,'submitted');
  await db.query("update project_assets set bucket_id='supabase-legacy'where id=$1",[row.id]);await assert.rejects(mutate(db,artist,'approve',row.id,{note:'Invalid mutable bucket'},1),/not yet immutable/);
 }finally{await db.close();}
});

import test from 'node:test';import assert from 'node:assert/strict';
import {releaseDatabase,releaseMutation,releaseData,pid,track,lead,artist,outsider} from './helpers/release-database.mjs';
test('linked release lifecycle enforces source approval, revised review, future privacy and atomic audit',async()=>{
 const {db,master,cover}=await releaseDatabase();
 try{
 const id=crypto.randomUUID();let r=await releaseMutation(db,lead,'create',id,0,{track_id:track});assert.equal(r.state,'draft');
 r=await releaseMutation(db,lead,'save',id,r.revision,releaseData(cover));
 const readiness=(await db.query('select release_requirements($1) value',[id])).rows[0].value;assert.equal(readiness.complete,true);
 r=await releaseMutation(db,lead,'submit',id,r.revision);assert.equal(r.state,'submitted');
 await assert.rejects(releaseMutation(db,artist,'approve',id,r.revision),/administrator permission/);
 r=await releaseMutation(db,outsider,'review',id,r.revision);r=await releaseMutation(db,outsider,'changes_requested',id,r.revision,{note:'Confirm genre and release description.'});assert.equal(r.state,'changes_requested');
 r=await releaseMutation(db,artist,'save',id,r.revision,{...releaseData(cover),description:'Corrected synthetic metadata.'});r=await releaseMutation(db,artist,'submit',id,r.revision);
 await assert.rejects(releaseMutation(db,outsider,'approve',id,0),/changed/);
 r=await releaseMutation(db,outsider,'approve',id,r.revision);assert.equal(r.state,'approved');r=await releaseMutation(db,outsider,'publish',id,r.revision);assert.equal(r.state,'published');
 assert.equal((await db.query('select count(*) n from music_weekly_chart')).rows[0].n,1);
 await assert.rejects(db.query("update music_releases set title='Bypass' where id=$1",[id]),/linked release workflow/);
 await db.query("update track_rights_checks set evidence_note='New isolated evidence' where track_id=$1 and check_key='beat_rights'",[track]);assert.equal((await db.query('select count(*) n from music_weekly_chart')).rows[0].n,0);
 const other=crypto.randomUUID();await assert.rejects(releaseMutation(db,outsider,'create',other,0,{track_id:track}),/project role/);
 }finally{await db.close();}
});

test('release schedules stay private, metadata locks and audit failures roll back',async()=>{
 const {db,cover}=await releaseDatabase();try{
 const id=crypto.randomUUID();let r=await releaseMutation(db,lead,'create',id,0,{track_id:track});r=await releaseMutation(db,lead,'save',id,r.revision,{...releaseData(cover),release_at:'2099-01-01T12:00:00+03:00'});r=await releaseMutation(db,lead,'submit',id,r.revision);
 await db.exec("create function reject_release_audit() returns trigger language plpgsql as $$begin if new.action='approve' then raise exception 'Isolated audit outage';end if;return new;end$$;create trigger reject_release_audit before insert on release_review_events for each row execute function reject_release_audit();");
 await assert.rejects(releaseMutation(db,outsider,'approve',id,r.revision),/audit outage/);assert.equal((await db.query('select workflow_state from music_releases where id=$1',[id])).rows[0].workflow_state,'submitted');await db.exec('drop trigger reject_release_audit on release_review_events;');
 r=await releaseMutation(db,outsider,'approve',id,r.revision);await assert.rejects(releaseMutation(db,lead,'save',id,r.revision,releaseData(cover)),/before editing/);
 r=await releaseMutation(db,outsider,'publish',id,r.revision);assert.equal(r.state,'scheduled');assert.equal((await db.query('select count(*) n from music_weekly_chart')).rows[0].n,0);
 await assert.rejects(db.query('select set_music_vote($1,$2,true)',[lead,id]),/not available/);
 await db.exec('set role authenticated;');await assert.rejects(db.query('select release_requirements($1)',[id]),/permission denied/);await db.exec('reset role;');
 }finally{await db.close();}
});
test('public engagement uses eligible records, scoped analytics, owned playlists and deduplicated notifications',async()=>{
 const {db,cover}=await releaseDatabase();try{
 const id=crypto.randomUUID(),list=crypto.randomUUID();await db.query("insert into fan_music_library(user_id,kind,item_id,label)values($1,'following',$2,''),($1,'playlist',$3,'Test playlist')",[lead,artist,list]);
 let r=await releaseMutation(db,lead,'create',id,0,{track_id:track});r=await releaseMutation(db,lead,'save',id,r.revision,releaseData(cover));r=await releaseMutation(db,lead,'submit',id,r.revision);r=await releaseMutation(db,outsider,'approve',id,r.revision);
 const key=crypto.randomUUID();const result=await releaseMutation(db,outsider,'publish',id,r.revision,{},key);assert.deepEqual(await releaseMutation(db,outsider,'publish',id,r.revision,{},key),result);
 assert.equal((await db.query("select count(*) n from notifications where type='public_release_published'")).rows[0].n,1);
 await db.query('select set_music_vote($1,$2,true)',[lead,id]);await db.query('select set_music_vote($1,$2,true)',[lead,id]);assert.equal((await db.query('select count(*) n from music_votes')).rows[0].n,1);
 await assert.rejects(db.query('select set_music_vote($1,$2,true)',[artist,id]),/own release/);
 await db.query("update fan_music_library set track_ids=$1 where kind='playlist'",[[track,pid]]);
 await db.query('select add_release_to_playlist($1,$2,$3)',[lead,list,id]);await db.query('select add_release_to_playlist($1,$2,$3)',[lead,list,id]);assert.deepEqual((await db.query("select track_ids from fan_music_library where kind='playlist'")).rows[0].track_ids,[track,pid,id]);
 await assert.rejects(db.query('select add_release_to_playlist($1,$2,$3)',[artist,list,id]),/your existing playlists/);
 const metrics=(await db.query('select release_engagement($1,$2) value',[artist,id])).rows[0].value;assert.equal(metrics.eligible_weekly_votes,1);assert.equal(metrics.followers,1);assert.equal(metrics.published_releases,1);assert.ok(!('plays' in metrics));
 const row=(await db.query('select * from music_weekly_chart')).rows[0];assert.equal(row.artist_id,artist);assert.ok(row.explicit_artist_link);assert.ok(!('source_project_id' in row));assert.ok(!('source_track_id' in row));
 await releaseMutation(db,lead,'withdraw',id,result.revision,{note:'Isolated withdrawal'});assert.equal((await db.query('select count(*) n from music_weekly_chart')).rows[0].n,0);
 }finally{await db.close();}
});

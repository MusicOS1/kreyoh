import {readFileSync,readdirSync} from 'node:fs';
import {productionDatabase,addVersion,readyEvidence,mutate,pid,lead,artist,outsider,track} from './production-database.mjs';
export {pid,lead,artist,outsider,track};
export async function releaseDatabase(){
 const db=await productionDatabase();
 await db.exec(`alter table profiles add column profile_visibility text default 'public',add column nickname text,add column public_slug text;update profiles set creator_types=array['Artist'] where id='${artist}';
 create table control_room_admins(user_id uuid primary key,active boolean,permissions text[]);
 insert into control_room_admins values('${outsider}',true,array['music']);`);
 for(const name of ['20261010191541_public_releases_and_member_messages.sql','20261011163144_fan_music_library.sql','20261011195500_music_release_comments.sql',readdirSync('supabase/migrations').find(x=>x.endsWith('_release_audience_workflow.sql'))])await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
 const master=await addVersion(db,'master','Approved master.wav');
 await db.query("update project_assets set review_status='approved' where id=$1",[master.id]);
 await readyEvidence(db);
 const cover=crypto.randomUUID();await db.query("insert into project_assets(id,project_id,entity_type,entity_id,uploaded_by,bucket_id,storage_path,file_name,mime_type,asset_kind,review_status,created_at)values($1,$2,'track',$3,$4,'r2',$5,'Approved cover.png','image/png','visual','approved',now()-interval '3 hours')",[cover,pid,track,artist,`${pid}/tracks/${track}/cover.png`]);
 await mutate(db,lead,'signoff',track,{note:'Isolated release acceptance, never real clearance.'});
 return {db,master,cover};
}
export async function releaseMutation(db,actor,action,id,revision=0,data={},request=crypto.randomUUID()){
 return (await db.query('select release_mutate($1,$2,$3,$4,$5,$6) result',[actor,action,id,revision,data,request])).rows[0].result;
}
export const releaseData=(cover)=>({title:'Acceptance release',artist_id:artist,featured_artist_ids:[],cover_id:cover,release_type:'single',collection:'',genre:'Afro fusion',description:'Synthetic release used only in isolated tests.',release_at:'2026-01-01T12:00:00+03:00',release_permission:'Recorded artist and project lead explicitly authorise this isolated test release.',artwork_authorised:true,isrc:'',upc:''});

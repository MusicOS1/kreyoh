import 'server-only';
import {createAdminClient} from './supabase/admin';

// Engagement applies to EVERY published release shown in public listening,
// never to private tracks, stems, beats, or recording-room play history.
export async function withPublicEngagement<T extends {id:string;artist_id:string;plays?:number|null;likes?:number|null;unique_listeners?:number|null}>(releases:T[]){
 if(!releases.length)return releases.map(r=>({...r,saves:0,comments:0,followers:0,commentMarkers:[],timedCommentsEnabled:false}));
 const admin=createAdminClient(),ids=releases.map(r=>r.id),artistIds=[...new Set(releases.map(r=>r.artist_id))];
 const [saved,followed,timed,liked,qualified]=await Promise.all([
  admin.from('fan_music_library').select('item_id').eq('kind','saved').in('item_id',ids).limit(20000),
  admin.from('fan_music_library').select('item_id').eq('kind','following').in('item_id',artistIds).limit(20000),
  admin.from('music_release_comments').select('release_id,position_seconds').in('release_id',ids).is('deleted_at',null).limit(20000),
  admin.from('music_release_likes').select('release_id').in('release_id',ids).limit(20000),
  admin.rpc('public_release_play_counts',{p_release_ids:ids})
 ]);
 // Existing databases may not yet have timed-comment columns. All historic
 // normal comments remain measurable, and no historic likes are manufactured.
 const commentRows=timed.error?
  await admin.from('music_release_comments').select('release_id').in('release_id',ids).is('deleted_at',null).limit(20000):
  timed;
 const count=(rows:Array<{item_id?:string;release_id?:string}>|null|undefined,key:'item_id'|'release_id')=>{
  const totals=new Map<string,number>();
  for(const row of rows||[]){const id=row[key];if(id)totals.set(id,(totals.get(id)||0)+1);}
  return totals;
 };
 const saves=count(saved.error?[]:saved.data,'item_id');
 const follows=count(followed.error?[]:followed.data,'item_id');
 const comments=count(commentRows.error?[]:commentRows.data,'release_id');
 const likes=count(liked.error?[]:liked.data,'release_id');
 const playsById=new Map<string,number>((qualified.error?[]:qualified.data||[]).map((row:{release_id:string;plays:number|string}):[string,number]=>[row.release_id,Number(row.plays||0)]));
 return releases.map(r=>{
  const markers=new Map<number,number>();
  if(!timed.error)for(const c of timed.data||[]){
   if(c.release_id!==r.id||typeof c.position_seconds!=='number')continue;
   const seconds=Math.floor(c.position_seconds);
   markers.set(seconds,(markers.get(seconds)||0)+1);
  }
  return {...r,
   saves:saved.error?null:(saves.get(r.id)||0),
   followers:followed.error?null:(follows.get(r.artist_id)||0),
   comments:commentRows.error?null:(comments.get(r.id)||0),
   likes:liked.error?null:(likes.get(r.id)||0),
   plays:qualified.error?(typeof r.plays==='number'?r.plays:null):playsById.get(r.id)||0,
   unique_listeners:typeof r.unique_listeners==='number'?r.unique_listeners:null,
   commentMarkers:[...markers].map(([seconds,n])=>({seconds,count:n})),
   timedCommentsEnabled:!timed.error
  };
 });
}

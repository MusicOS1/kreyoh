import "server-only";
import {getWorkspace} from "./workspace";
import {readAllRows} from "./recordReads";

export type RecentDay = {day:string;plays:number};
export type ArtistInsightData = {
  followers:number|null; releases:number|null; plays:number|null;
  listeners:number|null; days:RecentDay[]|null;
  top:{id:string;title:string;plays:number}[]|null;
};
// A completed play is a qualified stream, not a button click or a file upload.
export async function loadArtistInsights():Promise<ArtistInsightData>{
  const {user,admin}=await getWorkspace();
  const now=new Date();
  const start=new Date(now);
  start.setUTCHours(0,0,0,0);
  start.setUTCDate(start.getUTCDate()-29);
  const [owned,following]=await Promise.all([
    readAllRows(()=>admin.from("music_releases")
      .select("id,title,release_at")
      .eq("artist_id",user.id)
      .eq("status","published")
      .lte("release_at",now.toISOString())
      .order("id",{ascending:true})),
    admin.from("fan_music_library")
      .select("item_id",{head:true,count:"exact"})
      .eq("kind","following")
      .eq("item_id",user.id)
  ]);
  const followers=following.error?null:following.count??null;
  if(owned.error)return {followers,releases:null,plays:null,listeners:null,days:null,top:null};
  const releases=(owned.data||[]) as {id:string;title:string}[];
  if(!releases.length)return {followers,releases:0,plays:0,listeners:0,days:[],top:[]};
  // Each page is capped to protect rendering time; incomplete detail is never presented.
  const batches:string[][]=[];
  for(let i=0;i<releases.length;i+=60)batches.push(releases.slice(i,i+60).map(r=>r.id));
  const result=await Promise.all(batches.map(ids=>admin.from("music_play_sessions")
    .select("release_id,listener_key,qualified_at",{count:"exact"})
    .in("release_id",ids)
    .not("qualified_at","is",null)
    .gte("qualified_at",start.toISOString())
    .lte("qualified_at",now.toISOString())
    .order("qualified_at",{ascending:false})
    .limit(2000)));
  if(result.some(r=>r.error||r.count===null))return {
    followers,releases:releases.length,plays:null,listeners:null,days:null,top:null
  };
  const plays=result.reduce((sum,r)=>sum+(r.count||0),0);
  const rows=result.flatMap(r=>r.data||[]) as {release_id:string;listener_key:string;qualified_at:string}[];
  if(rows.length!==plays)return {followers,releases:releases.length,plays,listeners:null,days:null,top:null};
  const byDay=new Map<string,number>(),byRelease=new Map<string,number>(),listeners=new Set<string>();
  rows.forEach(row=>{
    const day=row.qualified_at?.slice(0,10);
    if(day)byDay.set(day,(byDay.get(day)||0)+1);
    byRelease.set(row.release_id,(byRelease.get(row.release_id)||0)+1);
    if(row.listener_key)listeners.add(row.listener_key);
  });
  const days:RecentDay[]=[];
  const day=new Date(start.getTime());
  for(let i=0;i<30;i++){
    const key=day.toISOString().slice(0,10);
    days.push({day:key,plays:byDay.get(key)||0});
    day.setUTCDate(day.getUTCDate()+1);
  }
  const top=releases.map(row=>({...row,plays:byRelease.get(row.id)||0}))
    .sort((a,b)=>b.plays-a.plays||a.title.localeCompare(b.title)).slice(0,3);
  return {followers,releases:releases.length,plays,listeners:listeners.size,days,top};
}

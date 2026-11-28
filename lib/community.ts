import "server-only";
import {readAllRows} from "./recordReads";
import {getWorkspace} from "./workspace";
import {createAdminClient} from "./supabase/admin";
import {createClient} from "./supabase/server";
export const uuidPattern=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function communityAccount(){
 const workspace=await getWorkspace();
 if(!workspace.user.email_confirmed_at)throw new Error("Confirm your email to submit, vote or message.");
 if(workspace.profile?.account_status!=="active")throw new Error("Your account is not active.");
 return workspace;
}
export async function viewer(){const client=await createClient();const{data:{user}}=await client.auth.getUser();return user;}
export async function chart(){
 const admin=createAdminClient();
 const{data,error}=await readAllRows(()=>admin.from("music_weekly_chart").select("*").order("votes",{ascending:false}).order("release_at",{ascending:false}).order("id"));
 if(error)throw new Error("The Billboard could not be loaded. Please try again.");
 const releases=data||[];
 if(!releases.length)return releases;
 // Explicit, independently verified performer links. No ownership data is exposed to fans.
 // Old schemas without this table still show the legacy catalogue safely.
 const linked=new Map<string,string>();
 const playCounts=new Map<string,number>();
 let countsAvailable=true;
 // Keep the UUID list inside a normal request URL and below PostgREST's row limit.
 const batchSize=100;
 for(let offset=0;offset<releases.length;offset+=batchSize){
  const ids=releases.slice(offset,offset+batchSize).map(release=>release.id);
  const [attributions,counts]=await Promise.all([
   admin.from("music_catalogue_attributions")
    .select("release_id,credited_artist_profile_id").in("release_id",ids)
    .eq("credit_verified",true).not("credited_artist_profile_id","is",null),
   admin.rpc("public_release_play_counts",{p_release_ids:ids})
  ]);
  for(const row of attributions.data||[])linked.set(row.release_id,row.credited_artist_profile_id);
  if(counts.error){
   if(countsAvailable)console.error("Public play counts unavailable",counts.error);
   countsAvailable=false;
  }
  for(const row of counts.data||[])playCounts.set(row.release_id,Number(row.plays));
 }
 const enriched=releases.map(release=>({...release,
  plays:countsAvailable?(playCounts.get(release.id)??0):null,
  attributed_artist_profile_id:linked.get(release.id)||undefined}));
 // Listening is the primary FACKTS chart signal; weekly votes break ties.
 return !countsAvailable?enriched:enriched.sort((a,b)=>(b.plays||0)-(a.plays||0)||
  b.votes-a.votes||b.release_at.localeCompare(a.release_at));
}
export function currentChartWeek(){
 const now=new Date(Date.now()+3*3600000);const day=(now.getUTCDay()+6)%7;
 now.setUTCDate(now.getUTCDate()-day);return now.toISOString().slice(0,10);
}

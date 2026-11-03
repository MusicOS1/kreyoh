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
 const {data:links,error:linkError}=await admin.from("music_catalogue_attributions")
  .select("release_id,credited_artist_profile_id").in("release_id",releases.map(r=>r.id))
  .eq("credit_verified",true).not("credited_artist_profile_id","is",null);
 if(linkError||!links?.length)return releases;
 const linked=new Map(links.map(l=>[l.release_id,l.credited_artist_profile_id]));
 return releases.map(release=>({...release,attributed_artist_profile_id:linked.get(release.id)||undefined}));
}
export function currentChartWeek(){
 const now=new Date(Date.now()+3*3600000);const day=(now.getUTCDay()+6)%7;
 now.setUTCDate(now.getUTCDate()-day);return now.toISOString().slice(0,10);
}

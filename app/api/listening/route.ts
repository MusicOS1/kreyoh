import {viewer} from "../../../lib/community";
import {readAllRows} from "../../../lib/recordReads";
import {createAdminClient} from "../../../lib/supabase/admin";
export const dynamic="force-dynamic";
// Only published, currently playable releases. Private project queues never use this endpoint.
export async function GET() {
 try{
  const result=await readAllRows(()=>createAdminClient().from("music_weekly_chart").select("id,title,artist_name,has_cover").order("release_at",{ascending:false}).order("id"));
  if(result.error)throw Error("Queue unavailable");
  const releases=result.data||[];
  let savedIds:string[]=[];
  try{
   const user=await viewer();
   if(user){
    const {data,error}=await createAdminClient().from("fan_music_library")
     .select("item_id").eq("user_id",user.id).eq("kind","saved").limit(1000);
    if(!error)savedIds=(data||[]).map(item=>item.item_id);
   }
  }catch{/* A library read failure must not block public playback. */}
  return Response.json({releases,savedIds},{headers:{"Cache-Control":"private, no-store"}});
 }catch{
  return Response.json({error:"Music is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}

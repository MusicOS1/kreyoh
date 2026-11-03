import {chart,viewer} from "../../../lib/community";
import {createAdminClient} from "../../../lib/supabase/admin";
export const dynamic="force-dynamic";
// Only published, currently playable releases. Private project queues never use this endpoint.
export async function GET() {
 try{
  const releases=await chart();
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

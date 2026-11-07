import {createHmac} from "node:crypto";
import {assertProductionOrigin} from "../../../../lib/productionAccess";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {viewer,uuidPattern} from "../../../../lib/community";

export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store"};
const qualifiedBucket=()=>Math.floor(Date.now()/900000); // one qualifying play / listener / song / 15 minutes
const uuid=(value:unknown):value is string=>typeof value==="string"&&uuidPattern.test(value);
const threshold=(duration:number)=>duration>=30?30:Math.max(5,Math.ceil(duration*.5));
function browserKey(browserId:string,userId?:string){
 if(userId)return "member:"+userId;
 // A client-generated UUID is not a fingerprint; don't store IPs, user agents or email addresses.
 const salt=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.R2_ACCESS_KEY_ID;
 if(!salt)throw Error("Play telemetry unavailable.");
 return "guest:"+createHmac("sha256",salt).update(browserId).digest("hex");
}
function errorResponse(error:unknown){
 const message=error instanceof Error?error.message:"Could not record playback.";
 console.warn("public-music-play-tracking",message);
 return Response.json({ok:false,error:"The listening counter is temporarily unavailable."},
  {status:400,headers});
}
export async function POST(request:Request){
 try{
  assertProductionOrigin(request);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||!uuid(body.releaseId)||!uuid(body.sessionId)||!uuid(body.browserId))
   return Response.json({ok:false,error:"Invalid playback session."},{status:400,headers});
  const duration=Number(body.duration);
  if(!Number.isFinite(duration)||duration<5||duration>7200)
   return Response.json({ok:false,error:"Invalid track duration."},{status:400,headers});
  const admin=createAdminClient(),user=await viewer().catch(()=>null);
  const key=browserKey(body.browserId,user?.id);
  if(body.action==="start"){
   const {data:release,error}=await admin.from("music_releases")
    .select("id").eq("id",body.releaseId).eq("status","published")
    .lte("release_at",new Date().toISOString()).maybeSingle();
   if(error||!release)return Response.json({ok:false,error:"Release not available."},{status:404,headers});
   const {error:insertError}=await admin.from("music_play_sessions").insert({
    id:body.sessionId,release_id:body.releaseId,user_id:user?.id||null,
    listener_key:key,source:"public-player",duration_seconds:Math.ceil(duration),
    listened_seconds:0
   });
   if(insertError&&insertError.code!=="23505")throw Error("Unable to start listening session.");
   return Response.json({ok:true,started:true},{headers});
  }
  if(body.action!=="qualify")return Response.json({ok:false,error:"Invalid playback action."},{status:400,headers});
  const listened=Number(body.listenedSeconds);
  if(!Number.isFinite(listened)||listened<threshold(duration)||listened>duration*4)
   return Response.json({ok:false,error:"Playback has not reached the counting threshold."},{status:400,headers});
  const {data:session,error}=await admin.from("music_play_sessions")
   .select("id,release_id,user_id,listener_key,source,duration_seconds,started_at,qualified_at")
   .eq("id",body.sessionId).eq("release_id",body.releaseId)
   .eq("listener_key",key).maybeSingle();
  if(error||!session)return Response.json({ok:false,error:"Listening session expired."},{status:404,headers});
  if(session.user_id!==(user?.id||null)||session.source!=="public-player")
   return Response.json({ok:false,error:"Listening session is no longer valid."},{status:403,headers});
  if(session.qualified_at)return Response.json({ok:true,qualified:true,alreadyCounted:true},{headers});
  const elapsed=(Date.now()-new Date(session.started_at).getTime())/1000;
  if(elapsed<Math.max(4,threshold(session.duration_seconds)*.7))
   return Response.json({ok:false,error:"Listen a little longer to qualify."},{status:409,headers});
  const current=qualifiedBucket();
  const {data:changed,error:updateError}=await admin.from("music_play_sessions")
   .update({listened_seconds:Math.min(Math.ceil(listened),session.duration_seconds),
    qualified_at:new Date().toISOString(),qualified_bucket:current})
   .eq("id",session.id).is("qualified_at",null).select("id").maybeSingle();
  if(updateError?.code==="23505"){
   // Existing qualified play this quarter hour; remove the orphan start, not historical counts.
   await admin.from("music_play_sessions").delete().eq("id",session.id).is("qualified_at",null);
   return Response.json({ok:true,qualified:true,alreadyCounted:true},{headers});
  }
  if(updateError)throw Error("Unable to qualify play.");
  return Response.json({ok:true,qualified:true,alreadyCounted:!changed},{headers});
 }catch(error){return errorResponse(error);}
}

"use server";

import {revalidatePath} from "next/cache";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createR2PresignedUrl,assertR2ObjectAccess,finalizeReleaseObject} from "../../../../lib/r2";
import {uuidPattern} from "../../../../lib/community";

// Admin replacements preserve the release's public identifier, fan data and rights.
// Only the immutable audio object pointer changes; previous R2 objects are retained.
const audioFormats:Record<string,string>={mp3:"audio/mpeg",wav:"audio/wav",m4a:"audio/mp4",flac:"audio/flac"};
const maxSize=150*1024*1024;
const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
type Result<T>={ok:true;value:T}|{ok:false;error:string};
function userError(error:unknown):string {
 const message=error instanceof Error?error.message:"";
 return /^(Choose |Enter |Confirm |This release |Release |Audio |Your selected |The uploaded |The release |A newer |The song |The old |The replacement )/.test(message)?message:"Could not replace this recording. The existing song has not been intentionally deleted; please retry.";
}
async function fetchRelease(id:string){
 if(!uuidPattern.test(id))throw Error("Choose an existing song.");
 const {data,error}=await createAdminClient().from("music_releases").select("*").eq("id",id).maybeSingle();
 if(error||!data)throw Error("Release not found.");
 if(data.source_track_id)throw Error("This release belongs to an approved project workflow. Replace its master through the project revision process instead.");
 if(!["draft","pending","published","rejected"].includes(data.status))throw Error("This release cannot be edited in its current status.");
 return data;
}
export async function prepareAdminAudioReplacement(fd:FormData):Promise<Result<{attemptId:string;uploadUrl:string;audioType:string}>>{
 try{
  const actor=await requireControlRoomPermission("music");
  const id=read(fd,"release_id"),reason=read(fd,"reason").slice(0,500),fileName=read(fd,"file_name"),size=Number(read(fd,"file_size"));
  const release=await fetchRelease(id);
  if(reason.length<12)throw Error("Enter a specific replacement reason (at least 12 characters).");
  if(fd.get("rights")!=="on")throw Error("Confirm the replacement master is authorised by the rights holders.");
  const extension=fileName.split(".").pop()?.toLowerCase()||"";
  const audioType=audioFormats[extension];
  if(!audioType||!Number.isSafeInteger(size)||size<1||size>maxSize)throw Error("Choose MP3, WAV, M4A or FLAC audio up to 150 MB.");
  const attemptId=crypto.randomUUID();
  const uploadKey=`releases/${release.artist_id}/${id}/admin-revisions/${attemptId}-incoming.${extension}`;
  const uploadUrl=await createR2PresignedUrl("PUT",uploadKey,900,audioType);
  const admin=createAdminClient();
  const {error}=await admin.from("platform_events").insert({
   id:attemptId,user_id:actor.id,event_name:"release_audio_replacement_prepared",
   category:"music",entity_type:"release",entity_id:id,
   metadata:{oldKey:release.audio_key,uploadKey,audioType,size,reason,extension,originalStatus:release.status}
  });
  if(error)throw Error("The replacement could not be recorded. Retry without changing the existing song.");
  return {ok:true,value:{attemptId,uploadUrl,audioType}};
 }catch(error){console.error("release-audio-prepare",error);return {ok:false,error:userError(error)};}
}
export async function finishAdminAudioReplacement(releaseId:string,attemptId:string):Promise<Result<{message:string}>>{
 try{
  const actor=await requireControlRoomPermission("music");
  if(!uuidPattern.test(releaseId)||!uuidPattern.test(attemptId))throw Error("Choose an authorised replacement upload.");
  const admin=createAdminClient();
  const {data:intent,error:intentError}=await admin.from("platform_events").select("id,created_at,metadata").eq("id",attemptId)
    .eq("entity_id",releaseId).eq("entity_type","release").eq("event_name","release_audio_replacement_prepared").eq("user_id",actor.id).maybeSingle();
  if(intentError||!intent)throw Error("The replacement authorisation was not found.");
  if(Date.now()-new Date(intent.created_at).getTime()>60*60*1000)throw Error("The replacement authorisation expired. Select your file again.");
  const {oldKey,uploadKey,audioType,size,reason,extension,originalStatus}=intent.metadata||{};
  const release=await fetchRelease(releaseId);
  const prefix=`releases/${release.artist_id}/${releaseId}/admin-revisions/${attemptId}-`;
  if(typeof oldKey!=="string"||release.audio_key!==oldKey||release.status!==originalStatus)throw Error("A newer recording or review state is already present. Refresh this song before replacing.");
  if(typeof uploadKey!=="string"||!uploadKey.startsWith(prefix)||!Object.values(audioFormats).includes(audioType)||!Number.isSafeInteger(size)||size<1||size>maxSize||typeof reason!=="string")throw Error("The replacement request is invalid.");
  const uploaded=await assertR2ObjectAccess(uploadKey);
  if(!uploaded.ContentLength||uploaded.ContentLength!==size||uploaded.ContentType!==audioType||!uploaded.ETag)throw Error("The uploaded audio does not match the selected recording.");
  const finalKey=`releases/${release.artist_id}/${releaseId}/admin-revisions/${attemptId}-verified.${extension}`;
  // The browser never receives permission to modify this reviewed destination.
  await finalizeReleaseObject(uploadKey,finalKey);
  const verified=await assertR2ObjectAccess(finalKey);
  if(verified.ContentLength!==size||verified.ContentType!==audioType||!verified.ETag)throw Error("The replacement master could not be verified.");
  const {data:updated,error:updateError}=await admin.from("music_releases").update({audio_key:finalKey,audio_type:audioType})
    .eq("id",releaseId).eq("audio_key",oldKey).eq("status",originalStatus).select("id").maybeSingle();
  if(updateError||!updated)throw Error("A newer recording or review state is already present. Refresh this song before replacing.");
  const {error:auditError}=await admin.from("platform_events").insert({
   user_id:actor.id,event_name:"release_audio_replaced",category:"music",entity_type:"release",entity_id:releaseId,
   metadata:{previous_audio_key:oldKey,new_audio_key:finalKey,reason,audio_type:audioType,bytes:size,etag:verified.ETag}
  });
  if(auditError)console.error("Release replaced; audit completion insert failed. Preparation event remains.",{releaseId,attemptId});
  for(const route of ["/admin/releases","/billboard",`/billboard/${releaseId}`,"/listen","/fan","/creators","/admin/analytics"])revalidatePath(route);
  return {ok:true,value:{message:auditError?"Recording replaced, but the completion audit needs administrator review.":"Recording replaced. Existing votes, likes, comments, credits and song links are preserved. Previous audio is retained for recovery."}};
 }catch(error){console.error("release-audio-complete",error);return {ok:false,error:userError(error)};}
}

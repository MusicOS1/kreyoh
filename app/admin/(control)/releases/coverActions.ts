"use server";
import {revalidatePath} from "next/cache";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createR2PresignedUrl,assertR2ObjectAccess,finalizeReleaseObject,ensureReleaseUploadCors} from "../../../../lib/r2";
import {uuidPattern} from "../../../../lib/community";

type Result<T>={ok:true;value:T}|{ok:false;error:string};
const allowed:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};
const maxBytes=10*1024*1024;
const read=(fd:FormData,k:string)=>String(fd.get(k)||"").trim();
async function releaseForEdit(id:string){
 if(!uuidPattern.test(id))throw Error("Choose an existing release.");
 const {data,error}=await createAdminClient().from("music_releases").select("*").eq("id",id).maybeSingle();
 if(error||!data)throw Error("Release not found.");
 if(data.source_track_id)throw Error("Project-linked release covers must be changed through the approved project revision workflow.");
 if(!["draft","pending","published","rejected"].includes(data.status))throw Error("This release is not editable.");
 return data;
}
function safeMessage(error:unknown){
 const message=error instanceof Error?error.message:"";
 return /^(Choose |Release |Project-linked |This release |Enter |Confirm |Artwork |The uploaded |The cover |A newer |Could not record)/.test(message)?message:"Artwork could not be replaced. The original cover is preserved.";
}
export async function prepareAdminCoverReplacement(fd:FormData):Promise<Result<{attemptId:string;uploadUrl:string;contentType:string}>>{
 try{
  const actor=await requireControlRoomPermission("music");
  const id=read(fd,"release_id"),reason=read(fd,"reason"),fileName=read(fd,"file_name"),size=Number(read(fd,"file_size"));
  const release=await releaseForEdit(id);
  const ext=fileName.split(".").pop()?.toLowerCase()||"";
  const contentType=allowed[ext];
  if(reason.length<10||reason.length>500)throw Error("Enter a specific artwork correction reason (10–500 characters).");
  if(fd.get("rights")!=="on")throw Error("Confirm artist or rights-holder permission to use the new cover.");
  if(!contentType||!Number.isSafeInteger(size)||size<1||size>maxBytes)throw Error("Artwork must be JPG, PNG or WebP, no larger than 10 MB.");
  const attemptId=crypto.randomUUID();
  const key=`releases/${release.artist_id}/${id}/admin-artwork/${attemptId}-incoming.${ext}`;
  // Repair known production origins when bucket permissions allow it.
  // Preview URLs are deliberately not added to R2 CORS: the secure relay handles them.
  await ensureReleaseUploadCors().catch(error=>console.warn("admin-cover-browser-cors-unavailable",error));
  const uploadUrl=await createR2PresignedUrl("PUT",key,900,contentType);
  const {error}=await createAdminClient().from("platform_events").insert({
   id:attemptId,user_id:actor.id,event_name:"release_cover_replacement_prepared",category:"music",
   entity_type:"release",entity_id:id,metadata:{oldKey:release.cover_key,uploadKey:key,reason,size,contentType,extension:ext,status:release.status}
  });
  if(error)throw Error("Could not record the replacement request. The original cover was not changed.");
  return{ok:true,value:{attemptId,uploadUrl,contentType}};
 }catch(error){console.error("release-cover-prepare",error);return{ok:false,error:safeMessage(error)};}
}
export async function finishAdminCoverReplacement(id:string,attemptId:string):Promise<Result<{message:string}>>{
 try{
  const actor=await requireControlRoomPermission("music");
  if(!uuidPattern.test(id)||!uuidPattern.test(attemptId))throw Error("Choose a valid artwork replacement.");
  const admin=createAdminClient();
  const {data:intent,error:intentError}=await admin.from("platform_events").select("created_at,metadata")
   .eq("id",attemptId).eq("entity_id",id).eq("entity_type","release")
   .eq("event_name","release_cover_replacement_prepared").eq("user_id",actor.id).maybeSingle();
  if(intentError||!intent)throw Error("Artwork replacement authorisation was not found.");
  if(Date.now()-new Date(intent.created_at).getTime()>3600000)throw Error("Artwork authorisation has expired. Select the image again.");
  const {oldKey,uploadKey,reason,size,contentType,extension,status}=intent.metadata||{};
  const release=await releaseForEdit(id);
  const prefix=`releases/${release.artist_id}/${id}/admin-artwork/${attemptId}-`;
  if(release.cover_key!==oldKey||release.status!==status)throw Error("A newer cover or review state is present. Refresh this release.");
  if(typeof uploadKey!=="string"||!uploadKey.startsWith(prefix)||!Object.keys(allowed).includes(extension)||
    allowed[extension]!==contentType||!Number.isSafeInteger(size)||size<1||size>maxBytes||typeof reason!=="string")
   throw Error("Artwork replacement data is invalid.");
  const uploaded=await assertR2ObjectAccess(uploadKey);
  if(uploaded.ContentLength!==size||uploaded.ContentType!==contentType||!uploaded.ETag)throw Error("The uploaded artwork could not be verified.");
  const finalKey=`releases/${release.artist_id}/${id}/admin-artwork/${attemptId}-verified.${extension}`;
  await finalizeReleaseObject(uploadKey,finalKey);
  const verified=await assertR2ObjectAccess(finalKey);
  if(verified.ContentLength!==size||verified.ContentType!==contentType||!verified.ETag)throw Error("The cover could not be verified after saving.");
  let query=admin.from("music_releases").update({cover_key:finalKey}).eq("id",id).eq("status",status);
  query=oldKey?query.eq("cover_key",oldKey):query.is("cover_key",null);
  const {data:changed,error:updateError}=await query.select("id").maybeSingle();
  if(updateError||!changed)throw Error("A newer cover or review state was detected. Refresh this release.");
  const {error:auditError}=await admin.from("platform_events").insert({
   user_id:actor.id,event_name:"release_cover_replaced",category:"music",entity_type:"release",entity_id:id,
   metadata:{previous_cover_key:oldKey,new_cover_key:finalKey,reason,size,contentType,etag:verified.ETag}
  });
  if(auditError)console.error("Cover replaced; original authorisation remains but completion audit failed",{id,attemptId});
  for(const path of ["/admin/releases","/billboard",`/billboard/${id}`,"/fan","/listen","/creators"])revalidatePath(path);
  return{ok:true,value:{message:auditError?"Cover replaced; the completion audit needs review.":"Cover artwork updated. Song, playback, fans and previous cover are preserved."}};
 }catch(error){console.error("release-cover-complete",error);return{ok:false,error:safeMessage(error)};}
}

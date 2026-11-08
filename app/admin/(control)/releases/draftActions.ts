"use server";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {assertR2ObjectAccess,finalizeReleaseObject} from "../../../../lib/r2";
import {uuidPattern} from "../../../../lib/community";

export type AdminDraftReviewState={ok:boolean;message:string;status?:string};
function safeMessage(error:unknown){
 const message=error instanceof Error?error.message:"";
 return /^(Choose |This |Draft |Verify |The |Original |Could not |Audio |Cover |Enter |Please |Release )/.test(message)
  ?message:"Could not review this draft. No existing release was intentionally changed.";
}
export async function reviewAdminDraft(
 _prior:AdminDraftReviewState,form:FormData
):Promise<AdminDraftReviewState>{
 try{
  const actor=await requireControlRoomPermission("music");
  const id=String(form.get("id")||"").trim();
  const operation=String(form.get("operation")||"").trim();
  const note=String(form.get("note")||"").trim().slice(0,1000);
  if(!uuidPattern.test(id))throw Error("Choose an existing draft.");
  if(!["approve","reject","delete"].includes(operation))throw Error("Choose a review action.");
  if(operation!=="approve"&&note.length<10)
   throw Error("Enter a review reason of at least 10 characters to reject or delete a draft.");
  const admin=createAdminClient();
  const {data:release,error}=await admin.from("music_releases")
   .select("*").eq("id",id).maybeSingle();
  if(error||!release)throw Error("Draft release could not be found.");
  if(["approve","reject"].includes(operation)&&!["draft","pending"].includes(release.status))
   throw Error("This release is no longer awaiting approval. Refresh the page.");
  if(operation==="delete"&&!["draft","pending","rejected"].includes(release.status))
   throw Error("Only unpublished releases may be discarded here.");
  let nextAudio=release.audio_key,nextCover=release.cover_key;
  if(operation==="approve"&&release.status==="draft"){
   if(!release.rights_confirmed_at)
    throw Error("The artist has not confirmed rights. Approval is blocked.");
   if(!release.audio_key?.startsWith(`releases/${release.artist_id}/${id}/`))
    throw Error("Draft audio is not correctly linked. Approval is blocked.");
   let audio;
   try{audio=await assertR2ObjectAccess(release.audio_key);}
   catch{throw Error("Draft audio has not finished uploading. Complete the upload before approval.");}
   if(!audio.ContentLength||audio.ContentLength>150*1024*1024||audio.ContentType!==release.audio_type)
    throw Error("Audio cannot be verified. Complete or repair the draft first.");
   if(release.cover_key){
    if(!release.cover_key.startsWith(`releases/${release.artist_id}/${id}/`))
     throw Error("Cover artwork does not belong to this release.");
    let cover;
    try{cover=await assertR2ObjectAccess(release.cover_key);}
    catch{throw Error("Cover artwork has not finished uploading. Complete the draft first.");}
    if(!cover.ContentLength||cover.ContentLength>10*1024*1024||
       !["image/jpeg","image/png","image/webp"].includes(cover.ContentType||""))
     throw Error("Cover artwork cannot be verified. Replace or repair the artwork first.");
   }
   // Finalize the original staging objects into immutable versioned keys.
   // An interrupted approval leaves originals in place and can be retried.
   const revision=crypto.randomUUID();
   nextAudio=`releases/${release.artist_id}/${id}/${revision}-approved-audio`;
   await finalizeReleaseObject(release.audio_key,nextAudio);
   if(release.cover_key){
    nextCover=`releases/${release.artist_id}/${id}/${revision}-approved-cover`;
    await finalizeReleaseObject(release.cover_key,nextCover);
   }
  }
  const {error:auditError}=await admin.from("platform_events").insert({
   user_id:actor.id,event_name:operation==="approve"?"release_draft_approval_requested":
    operation==="reject"?"release_draft_rejection_requested":"release_draft_discard_requested",
   category:"music",entity_type:"release",entity_id:id,
   metadata:{previous_status:release.status,operation,note,verified:operation==="approve"}
  });
  if(auditError)throw Error("Could not record the review action. No draft status was changed.");
  const now=new Date().toISOString();
  const nextStatus=operation==="approve"?"published":operation==="reject"?"rejected":"withdrawn";
  const changes:Record<string,unknown>={
   status:nextStatus,reviewed_by:actor.id,reviewed_at:now,
   review_note:note||(operation==="approve"?"Verified and approved by FACKTS Music Admin":"Admin review")
  };
  if(operation==="approve"&&release.status==="draft"){
   changes.audio_key=nextAudio;
   changes.cover_key=nextCover;
   changes.submitted_at=release.submitted_at||now;
  }
  const {data:changed,error:saveError}=await admin.from("music_releases")
   .update(changes).eq("id",id).eq("status",release.status)
   .eq("audio_key",release.audio_key).select("id").maybeSingle();
  if(saveError||!changed)
   throw Error("The draft changed while you were reviewing it. Reload and try again.");
  const {error:completionError}=await admin.from("platform_events").insert({
   user_id:actor.id,event_name:operation==="approve"?"release_draft_approved":
    operation==="reject"?"release_draft_rejected":"release_draft_discarded",
   category:"music",entity_type:"release",entity_id:id,
   metadata:{previous_status:release.status,new_status:nextStatus,note,
    previous_audio_key:operation==="approve"?release.audio_key:undefined,
    new_audio_key:operation==="approve"?nextAudio:undefined}
  });
  if(completionError)console.error("draft-review-completion-audit-failed",{releaseId:id});
  for(const path of ["/admin/releases","/billboard",`/billboard/${id}`,"/fan","/listen","/admin/analytics"])
   revalidatePath(path);
  return{ok:true,status:nextStatus,message:operation==="approve"
   ?new Date(release.release_at)>new Date(now)
     ?"Release verified and approved. Its scheduled release date is preserved."
     :"Release verified and approved. It is now public."
   :operation==="reject"
    ?"Draft rejected. The artist can review the reason."
    :"Draft removed from active management. Its media and audit history were retained for recovery."};
 }catch(error){
  console.error("admin-draft-review",error);
  return{ok:false,message:safeMessage(error)};
 }
}

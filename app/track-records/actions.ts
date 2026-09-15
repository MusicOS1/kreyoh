"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";

const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
const manageRoles=["Super Admin","Admin","Project Lead","A&R"];
const releaseRoles=["Super Admin","Admin","Project Lead","A&R","Manager"];

async function requireTrack(trackId:string){
  const workspace=await getWorkspace();
  if(!workspace.project||!workspace.membership)throw new Error("Project access required.");
  const{data:track}=await workspace.admin.from("tracks").select("id,project_id,working_title").eq("id",trackId).eq("project_id",workspace.project.id).maybeSingle();
  if(!track)throw new Error("Track not found in the current project.");
  return{...workspace,track};
}

export async function approveTrackCredit(fd:FormData){
  const trackId=read(fd,"track_id"),creditId=read(fd,"credit_id");
  const{admin,roles,project,user}=await requireTrack(trackId);
  if(!hasAnyRole(roles,manageRoles))throw new Error("Project leadership access required.");
  const{error}=await admin.from("track_contributors").update({approved:true}).eq("id",creditId).eq("track_id",trackId);
  if(error)throw new Error(error.message);
  await admin.from("platform_events").insert({user_id:user.id,project_id:project!.id,event_name:"track_credit_verified",category:"rights",entity_type:"track",entity_id:trackId,metadata:{credit_id:creditId}});
  revalidatePath(`/track-records/${trackId}`);revalidatePath("/professional-record");
}

export async function saveRightsCheck(fd:FormData){
  const trackId=read(fd,"track_id");const{admin,roles,project,user}=await requireTrack(trackId);
  if(!hasAnyRole(roles,manageRoles))throw new Error("Rights control access required.");
  const checkKey=read(fd,"check_key"),status=read(fd,"status")||"pending";
  if(!checkKey||!["pending","clear","not_applicable","blocked"].includes(status))throw new Error("Choose a valid rights check and status.");
  const{error}=await admin.from("track_rights_checks").upsert({project_id:project!.id,track_id:trackId,check_key:checkKey,status,evidence_note:read(fd,"evidence_note")||null,evidence_url:read(fd,"evidence_url")||null,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"track_id,check_key"});
  if(error)throw new Error(error.message);
  revalidatePath(`/track-records/${trackId}`);
}

export async function addTrackRelease(fd:FormData){
  const trackId=read(fd,"track_id");const{admin,roles,project,user}=await requireTrack(trackId);
  if(!hasAnyRole(roles,releaseRoles))throw new Error("Release management access required.");
  const platform=read(fd,"platform_name");if(!platform)throw new Error("Add the release platform.");
  const{error}=await admin.from("track_release_records").insert({project_id:project!.id,track_id:trackId,platform_name:platform,distributor:read(fd,"distributor")||null,release_date:read(fd,"release_date")||null,isrc:read(fd,"isrc")||null,upc:read(fd,"upc")||null,release_url:read(fd,"release_url")||null,release_status:read(fd,"release_status")||"planned",notes:read(fd,"notes")||null,created_by:user.id});
  if(error)throw new Error(error.message);revalidatePath(`/track-records/${trackId}`);
}

export async function addReleaseEvent(fd:FormData){
  const trackId=read(fd,"track_id");const{admin,roles,project,user}=await requireTrack(trackId);
  if(!hasAnyRole(roles,releaseRoles))throw new Error("Post-release management access required.");
  const description=read(fd,"description");if(!description)throw new Error("Describe what happened.");
  const rawValue=read(fd,"value");
  const{error}=await admin.from("track_release_events").insert({project_id:project!.id,track_id:trackId,event_type:read(fd,"event_type")||"other",event_date:read(fd,"event_date")||new Date().toISOString().slice(0,10),organisation:read(fd,"organisation")||null,description,outcome:read(fd,"outcome")||null,evidence_url:read(fd,"evidence_url")||null,value:rawValue?Number(rawValue):null,currency:read(fd,"currency")||"KES",created_by:user.id});
  if(error)throw new Error(error.message);revalidatePath(`/track-records/${trackId}`);
}

export async function addOperationalIssue(fd:FormData){
  const trackId=read(fd,"track_id");const{admin,project,membership,user}=await getWorkspace();
  if(!project||!membership)throw new Error("Project access required.");
  if(trackId){const{data:track}=await admin.from("tracks").select("id").eq("id",trackId).eq("project_id",project.id).maybeSingle();if(!track)throw new Error("Track not found in this project.");}
  const title=read(fd,"title"),description=read(fd,"description");if(!title||!description)throw new Error("Describe the issue clearly.");
  const{error}=await admin.from("track_operational_issues").insert({project_id:project.id,track_id:trackId||null,session_id:read(fd,"session_id")||null,category:read(fd,"category")||"other",title,description,severity:read(fd,"severity")||"medium",owner_id:read(fd,"owner_id")||null,occurred_at:read(fd,"occurred_at")||new Date().toISOString(),due_date:read(fd,"due_date")||null,created_by:user.id});
  if(error)throw new Error(error.message);
  await admin.from("platform_events").insert({user_id:user.id,project_id:project.id,event_name:"operational_issue_logged",category:"operations",entity_type:trackId?"track":"project",entity_id:trackId||project.id,metadata:{category:read(fd,"category"),severity:read(fd,"severity")}});
  revalidatePath(trackId?`/track-records/${trackId}`:"/track-records");
}

export async function updateOperationalIssue(fd:FormData){
  const{admin,project,roles,user}=await getWorkspace();if(!project||!hasAnyRole(roles,manageRoles))throw new Error("Project leadership access required.");
  const issueId=read(fd,"issue_id"),trackId=read(fd,"track_id");
  const{error}=await admin.from("track_operational_issues").update({status:read(fd,"status")||"open",owner_id:read(fd,"owner_id")||null,resolution:read(fd,"resolution")||null,lesson_learned:read(fd,"lesson_learned")||null,updated_at:new Date().toISOString()}).eq("id",issueId).eq("project_id",project.id);
  if(error)throw new Error(error.message);
  await admin.from("platform_events").insert({user_id:user.id,project_id:project.id,event_name:"operational_issue_updated",category:"operations",entity_type:trackId?"track":"project",entity_id:trackId||project.id,metadata:{issue_id:issueId,status:read(fd,"status")}});
  revalidatePath(trackId?`/track-records/${trackId}`:"/track-records");
}

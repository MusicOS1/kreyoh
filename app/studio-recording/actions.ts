"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {getWorkspace,hasAnyRole} from "../../lib/workspace";
import {requireStudioScope} from "../../lib/studioScope";
import {hasStudioRecorderGrant,setStudioRecorderGrant} from "../../lib/studioRecorderAccess";

const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const adminRoles=["Super Admin","Admin","Project Lead","Project Admin"];
function validIso(naive:string){
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(naive))throw new Error("Enter a valid Kenya-local date and time.");
 const date=new Date(naive+":00+03:00");
 if(!Number.isFinite(date.getTime()))throw new Error("Enter a valid Kenya-local date and time.");
 return date.toISOString();
}
function safeHttp(value:string){
 if(!value)return null;
 try{const url=new URL(value);if(!["http:","https:"].includes(url.protocol))throw Error();return url.toString();}
 catch{throw new Error("Enter a valid media folder URL.");}
}
async function grantContext(projectId:string){
 const {admin,user}=await getWorkspace();
 if(!uuid.test(projectId)||!await hasStudioRecorderGrant(admin,projectId,user.id))
   throw new Error("You do not have studio recording access to this project.");
 return {admin,user};
}
export async function createDelegatedStudioSession(fd:FormData){
 const projectId=read(fd,"project_id");
 const {admin,user}=await grantContext(projectId);
 const trackId=read(fd,"track_id")||null;
 const participants=Array.from(new Set(fd.getAll("participants").map(String).filter(Boolean)));
 if(participants.length>100||participants.some(id=>!uuid.test(id)))throw new Error("Choose valid session participants.");
 await requireStudioScope(admin,projectId,null,trackId,participants);
 const start=validIso(read(fd,"starts_at"));
 const end=read(fd,"ends_at")?validIso(read(fd,"ends_at")):null;
 if(end&&Date.parse(end)<=Date.parse(start))throw new Error("End time must be after start time.");
 const backlog=read(fd,"is_backlog")==="true";
 const {data,error}=await admin.from("studio_sessions").insert({
  project_id:projectId,track_id:trackId,starts_at:start,ends_at:end,
  location:read(fd,"location").slice(0,180)||null,
  notes:read(fd,"notes").slice(0,4000)||null,
  outcomes:read(fd,"outcomes").slice(0,4000)||null,
  media_source_url:safeHttp(read(fd,"media_source_url")),media_notes:read(fd,"media_notes").slice(0,2000)||null,
  is_backlog:backlog,status:backlog?"complete":"scheduled",created_by:user.id
 }).select("id").single();
 if(error||!data)throw new Error("Studio session could not be saved. Check your connection and retry once.");
 if(participants.length){
  const {error:participantsError}=await admin.from("session_participants").insert(participants.map(user_id=>({session_id:data.id,user_id})));
  if(participantsError)console.error("Studio session saved, participants need review",participantsError);
 }
 await admin.from("activity_log").insert({project_id:projectId,user_id:user.id,action:"delegated studio recorder created session",entity_type:"session",entity_id:data.id});
 await admin.from("platform_events").insert({user_id:user.id,project_id:projectId,event_name:"delegated_studio_session_created",
  category:"sessions",entity_type:"session",entity_id:data.id,metadata:{backlog,participants:participants.length}});
 revalidatePath("/studio-recording");
 redirect("/studio-recording?project_id="+encodeURIComponent(projectId)+"&saved="+encodeURIComponent(data.id));
}
export async function updateDelegatedStudioSession(fd:FormData){
 const projectId=read(fd,"project_id"),sessionId=read(fd,"session_id");
 const {admin,user}=await grantContext(projectId);
 if(!uuid.test(sessionId))throw new Error("Choose a studio session.");
 await requireStudioScope(admin,projectId,sessionId,null);
 const status=read(fd,"status");
 if(!["scheduled","in_session","follow_up_required","complete","cancelled"].includes(status))throw new Error("Invalid session status.");
 const {data,error}=await admin.from("studio_sessions").update({
  status,
  notes:read(fd,"notes").slice(0,4000)||null,
  outcomes:read(fd,"outcomes").slice(0,4000)||null,
  media_source_url:safeHttp(read(fd,"media_source_url")),
  media_notes:read(fd,"media_notes").slice(0,2000)||null,
  updated_at:new Date().toISOString()
 }).eq("id",sessionId).eq("project_id",projectId).select("id").maybeSingle();
 if(error||!data)throw new Error("Session could not be updated. Check the session ledger before retrying.");
 await admin.from("activity_log").insert({project_id:projectId,user_id:user.id,action:"delegated studio recorder updated session",entity_type:"session",entity_id:sessionId});
 await admin.from("platform_events").insert({user_id:user.id,project_id:projectId,event_name:"delegated_studio_session_updated",
 category:"sessions",entity_type:"session",entity_id:sessionId,metadata:{status}});
 revalidatePath("/studio-recording");
 redirect("/studio-recording?project_id="+encodeURIComponent(projectId)+"&updated="+encodeURIComponent(sessionId));
}
export async function setProjectStudioRecorder(fd:FormData){
 const {admin,user,project,roles}=await getWorkspace();
 if(!project||!hasAnyRole(roles,adminRoles))throw new Error("Only project administrators can delegate recording.");
 const userId=read(fd,"user_id");
 if(!uuid.test(userId))throw new Error("Choose a registered user.");
 await setStudioRecorderGrant(admin,{projectId:project.id,userId,actorId:user.id,active:read(fd,"active")==="true"});
 revalidatePath("/studio-sessions");
 revalidatePath("/studio-recording");
}

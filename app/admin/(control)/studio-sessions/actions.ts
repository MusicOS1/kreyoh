"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireStudioScope} from "../../../../lib/studioScope";

const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const read=(form:FormData,key:string)=>String(form.get(key)||"").trim();
const url="/admin/studio-sessions";
function message(projectId:string,text:string):never{
 redirect(url+"?project_id="+encodeURIComponent(projectId)+"&error="+encodeURIComponent(text));
}
function eatDate(value:string):string|null{
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))return null;
 const parsed=new Date(value+":00+03:00");
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,16)!==new Date(parsed.getTime()).toISOString().slice(0,16))return null;
 return parsed.toISOString();
}
/** Platform-wide administrative session creation. No project membership is added. */
export async function createPlatformStudioSession(form:FormData){
 const actor=await requireControlRoomPermission("sessions");
 const projectId=read(form,"project_id");
 if(!uuid.test(projectId))throw new Error("Choose a project.");
 const admin=createAdminClient();
 const {data:project,error:projectError}=await admin.from("projects")
  .select("id,name,code,status").eq("id",projectId).maybeSingle();
 if(projectError||!project)message(projectId,"The selected project could not be found.");
 const trackId=read(form,"track_id")||null;
 if(trackId&&!uuid.test(trackId))message(projectId,"Choose a valid track.");
 const producerId=read(form,"producer_id")||null;
 const engineerId=read(form,"engineer_id")||null;
 const memberIds=Array.from(new Set(form.getAll("participants").map(String).filter(Boolean)));
 if(memberIds.length>200||[...memberIds,producerId,engineerId].filter(Boolean).some(value=>!uuid.test(value!)))
  message(projectId,"Choose valid project participants (up to 200 at a time).");
 const start=eatDate(read(form,"starts_at")),end=read(form,"ends_at")?eatDate(read(form,"ends_at")):null;
 if(!start||read(form,"ends_at")&&!end)message(projectId,"Enter a valid session date and time.");
 if(end&&Date.parse(end)<=Date.parse(start))message(projectId,"The end time must be after the start.");
 const backlog=read(form,"is_backlog")==="true";
 const location=read(form,"location").slice(0,180);
 const notes=read(form,"notes").slice(0,4000);
 const outcomes=read(form,"outcomes").slice(0,4000);
 const mediaUrl=read(form,"media_source_url").slice(0,600);
 const mediaNotes=read(form,"media_notes").slice(0,2000);
 if(mediaUrl){try{const parsed=new URL(mediaUrl);if(!["https:","http:"].includes(parsed.protocol))throw Error("Invalid URL");}catch{message(projectId,"Use a valid media folder URL.");}}
 // Project track and participants must belong to this project. This is
 // separate from whether the platform admin belongs to the project.
 await requireStudioScope(admin,projectId,null,trackId,[...memberIds,producerId||"",engineerId||""]);
 const {data:created,error:createError}=await admin.from("studio_sessions").insert({
  project_id:projectId,track_id:trackId,starts_at:start,ends_at:end,
  location:location||null,producer_id:producerId,engineer_id:engineerId,
  ar_id:null,notes:notes||null,outcomes:outcomes||null,
  media_source_url:mediaUrl||null,media_notes:mediaNotes||null,
  is_backlog:backlog,status:backlog?"complete":"scheduled",created_by:actor.id
 }).select("id").single();
 if(createError||!created)message(projectId,"The session could not be created. No existing session was changed.");
 const id=created.id;
 // Never remove or rewrite an existing session. A post-create failure is
 // reported as partial completion so a retry cannot silently duplicate it.
 const failures:string[]=[];
 if(memberIds.length){
  const {error}=await admin.from("session_participants").insert(memberIds.map(user_id=>({session_id:id,user_id})));
  if(error)failures.push("Participant assignment needs attention");
 }
 const {error:historyError}=await admin.from("activity_log").insert({
  project_id:projectId,user_id:actor.id,action:backlog?"platform admin recorded a past studio session":"platform admin scheduled a studio session",
  entity_type:"session",entity_id:id
 });
 if(historyError)failures.push("Project activity history needs attention");
 const {error:auditError}=await admin.from("platform_events").insert({
  user_id:actor.id,project_id:projectId,event_name:"platform_admin_studio_session_created",
  category:"sessions",entity_type:"session",entity_id:id,
  metadata:{source:"control_room",by_project_member:false,is_backlog:backlog,track_id:trackId,
   participants:memberIds.length,producer_id:producerId,engineer_id:engineerId}
 });
 if(auditError)failures.push("Platform audit needs attention");
 if(!backlog&&memberIds.length){
  const {error:notificationError}=await admin.from("notifications").insert(memberIds.filter(user_id=>user_id!==actor.id).map(user_id=>({
   user_id,project_id:projectId,type:"session_scheduled",title:"Studio session scheduled",
   entity_type:"session",entity_id:id
  })));
  if(notificationError)failures.push("Participant notifications need attention");
 }
 revalidatePath(url);revalidatePath("/studio-sessions");revalidatePath("/workspace");
 redirect(url+"?project_id="+encodeURIComponent(projectId)+"&created="+encodeURIComponent(id)+(failures.length?"&warning="+encodeURIComponent(failures.join("; ")):""));
}

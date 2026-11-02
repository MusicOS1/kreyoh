import type {SupabaseClient} from "@supabase/supabase-js";

/** Server-side gate. Never infer recording privilege from a profile identity. */
export async function hasStudioRecorderGrant(admin:SupabaseClient,projectId:string,userId:string):Promise<boolean>{
 const {data,error}=await admin.from("studio_session_recorders").select("active")
  .eq("project_id",projectId).eq("user_id",userId).eq("active",true).maybeSingle();
 if(error){console.error("Studio recorder grant lookup unavailable",error);return false;}
 return Boolean(data);
}

export async function listStudioRecorderProjects(admin:SupabaseClient,userId:string){
 const {data,error}=await admin.from("studio_session_recorders")
  .select("project_id,projects(id,code,name),active").eq("user_id",userId).eq("active",true);
 if(error)return [];
 return (data||[]).map(item=>{
  const project=Array.isArray(item.projects)?item.projects[0]:item.projects;
  return project?{id:project.id,code:project.code,name:project.name}:null;
 }).filter((project):project is {id:string;code:string;name:string}=>Boolean(project));
}

export async function setStudioRecorderGrant(admin:SupabaseClient,args:{
 projectId:string;userId:string;actorId:string;active:boolean;
}){
 const {projectId,userId,actorId,active}=args;
 const {data:project,error:projectError}=await admin.from("projects").select("id").eq("id",projectId).maybeSingle();
 if(projectError||!project)throw new Error("Choose an existing project.");
 const {data:person,error:personError}=await admin.from("profiles").select("id").eq("id",userId).maybeSingle();
 if(personError||!person)throw new Error("This user must register an account before you delegate studio recording.");
 const {error}=await admin.from("studio_session_recorders").upsert({
  project_id:projectId,user_id:userId,active,granted_by:actorId,updated_at:new Date().toISOString()
 },{onConflict:"project_id,user_id"});
 if(error)throw new Error("Could not save studio recording access: "+error.message);
 await admin.from("platform_events").insert({user_id:actorId,project_id:projectId,
  event_name:active?"studio_recorder_access_granted":"studio_recorder_access_revoked",
  category:"sessions",entity_type:"profile",entity_id:userId,
  metadata:{access:"studio_session_recording_only",active}});
}

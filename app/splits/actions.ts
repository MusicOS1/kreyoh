"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";

const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
const manageRoles=["Super Admin","Admin","Project Lead"];

function first(value:any){return Array.isArray(value)?value[0]:value;}

async function requireManagement(){
  const workspace=await getWorkspace();
  if(!workspace.project||!workspace.membership||!hasAnyRole(workspace.roles,manageRoles)){
    throw new Error("Project management access required.");
  }
  return workspace;
}

export async function saveTrackSplit(fd:FormData){
  const{admin,user,project}=await requireManagement();
  const trackId=read(fd,"track_id");
  const contributorId=read(fd,"contributor_id");
  const role=read(fd,"contribution_role");
  const percentage=Number(read(fd,"percentage"));

  if(!trackId||!contributorId||!role||!Number.isFinite(percentage)||percentage<0||percentage>100){
    throw new Error("Complete the contributor, role and percentage.");
  }

  const[{data:track},{data:member},{data:allRows=[]}]=await Promise.all([
    admin.from("tracks").select("id,working_title").eq("id",trackId).eq("project_id",project!.id).maybeSingle(),
    admin.from("project_members").select("id").eq("project_id",project!.id).eq("user_id",contributorId).eq("status","active").maybeSingle(),
    admin.from("track_splits").select("contributor_id,contribution_role,percentage").eq("track_id",trackId),
  ]);

  if(!track)throw new Error("That track is not in the current project.");
  if(!member)throw new Error("Choose an active project member.");

  const otherTotal=(allRows||[])
    .filter((row:any)=>!(row.contributor_id===contributorId&&String(row.contribution_role).toLowerCase()===role.toLowerCase()))
    .reduce((sum:number,row:any)=>sum+Number(row.percentage||0),0);

  if(otherTotal+percentage>100.0001){
    throw new Error(`This would make the track ${Number((otherTotal+percentage).toFixed(2))}%. Splits cannot exceed 100%.`);
  }

  const{error}=await admin.from("track_splits").upsert({
    project_id:project!.id,
    track_id:trackId,
    contributor_id:contributorId,
    contribution_role:role,
    percentage,
    status:"draft",
    confirmed_at:null,
    created_by:user.id,
    updated_at:new Date().toISOString(),
  },{onConflict:"track_id,contributor_id,contribution_role"});

  if(error)throw new Error(error.message);

  await admin.from("platform_events").insert({
    user_id:user.id,
    project_id:project!.id,
    event_name:"track_split_draft_updated",
    category:"rights",
    entity_type:"track",
    entity_id:trackId,
    metadata:{contributor_id:contributorId,percentage,role},
  });

  revalidatePath("/splits");
  revalidatePath(`/track-records/${trackId}`);
}

export async function sendTrackSplitsForConfirmation(fd:FormData){
  const{admin,user,project}=await requireManagement();
  const trackId=read(fd,"track_id");

  const[{data:track},{data:rows=[]}]=await Promise.all([
    admin.from("tracks").select("id,working_title").eq("id",trackId).eq("project_id",project!.id).maybeSingle(),
    admin.from("track_splits").select("id,contributor_id,percentage,contribution_role").eq("project_id",project!.id).eq("track_id",trackId),
  ]);

  if(!track)throw new Error("Track not found.");
  if(!rows?.length)throw new Error("Add the split allocations first.");

  const total=(rows||[]).reduce((sum:number,row:any)=>sum+Number(row.percentage||0),0);
  if(Math.abs(total-100)>0.001){
    throw new Error(`The split plan must equal exactly 100% before confirmation. It is currently ${total.toFixed(2)}%.`);
  }

  const{error}=await admin.from("track_splits")
    .update({status:"awaiting_confirmation",confirmed_at:null,updated_at:new Date().toISOString()})
    .eq("project_id",project!.id)
    .eq("track_id",trackId);

  if(error)throw new Error(error.message);

  const uniqueContributorIds=Array.from(new Set((rows||[]).map((row:any)=>row.contributor_id).filter(Boolean)));
  if(uniqueContributorIds.length){
    await admin.from("notifications").insert(uniqueContributorIds.map((contributorId)=>({
      user_id:contributorId,
      project_id:project!.id,
      type:"split_confirmation_required",
      title:"Split confirmation required",
      body:`${track.working_title||"A track"} now has a complete 100% split proposal. Review your percentage and confirm it.`,
      entity_type:"track",
      entity_id:trackId,
    })));
  }

  await admin.from("platform_events").insert({
    user_id:user.id,
    project_id:project!.id,
    event_name:"track_splits_sent_for_confirmation",
    category:"rights",
    entity_type:"track",
    entity_id:trackId,
    metadata:{total:100,contributors:uniqueContributorIds.length},
  });

  revalidatePath("/splits");
  revalidatePath("/notifications");
  revalidatePath(`/track-records/${trackId}`);
}

export async function confirmOwnSplit(fd:FormData){
  const{admin,user,project}=await getWorkspace();
  if(!project)throw new Error("Project access required.");

  const splitId=read(fd,"split_id");

  const{data:split}=await admin.from("track_splits")
    .select("id,track_id,contributor_id,status,tracks(working_title)")
    .eq("id",splitId)
    .eq("project_id",project.id)
    .eq("contributor_id",user.id)
    .maybeSingle();

  if(!split)throw new Error("That split confirmation is not available.");
  if(split.status!=="awaiting_confirmation")throw new Error("This split is not currently awaiting your confirmation.");

  const{error}=await admin.from("track_splits")
    .update({status:"confirmed",confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()})
    .eq("id",splitId)
    .eq("project_id",project.id)
    .eq("contributor_id",user.id);

  if(error)throw new Error(error.message);

  const{data:rows=[]}=await admin.from("track_splits").select("percentage,status").eq("project_id",project.id).eq("track_id",split.track_id);
  const total=(rows||[]).reduce((sum:number,row:any)=>sum+Number(row.percentage||0),0);
  const complete=Math.abs(total-100)<=0.001&&(rows||[]).length>0&&(rows||[]).every((row:any)=>row.status==="confirmed");

  if(complete){
    await admin.from("platform_events").insert({
      user_id:user.id,
      project_id:project.id,
      event_name:"track_splits_fully_confirmed",
      category:"rights",
      entity_type:"track",
      entity_id:split.track_id,
      metadata:{total:100},
    });

    // If the Track Passport module is installed, keep its rights check in sync.
    await admin.from("track_rights_checks").upsert({
      project_id:project.id,
      track_id:split.track_id,
      check_key:"splits_confirmed",
      status:"clear",
      evidence_note:"All contributor split rows total 100% and are individually confirmed.",
      updated_by:user.id,
      updated_at:new Date().toISOString(),
    },{onConflict:"track_id,check_key"});
  }

  revalidatePath("/splits");
  revalidatePath(`/track-records/${split.track_id}`);
}

export async function requestSplitChange(fd:FormData){
  const{admin,user,project}=await getWorkspace();
  if(!project)throw new Error("Project access required.");

  const splitId=read(fd,"split_id");
  const reason=read(fd,"reason");
  if(!reason)throw new Error("Explain what needs to change.");

  const{data:split}=await admin.from("track_splits")
    .select("id,track_id,contributor_id,percentage,contribution_role,tracks(working_title)")
    .eq("id",splitId)
    .eq("project_id",project.id)
    .eq("contributor_id",user.id)
    .maybeSingle();

  if(!split)throw new Error("That split record is not available.");

  const{error}=await admin.from("track_splits")
    .update({status:"draft",confirmed_at:null,updated_at:new Date().toISOString()})
    .eq("id",splitId)
    .eq("project_id",project.id)
    .eq("contributor_id",user.id);

  if(error)throw new Error(error.message);

  const{data:leaders=[]}=await admin.from("project_members")
    .select("user_id,member_roles(roles(name))")
    .eq("project_id",project.id)
    .eq("status","active");

  const leaderIds=(leaders||[])
    .filter((member:any)=>(member.member_roles||[]).some((item:any)=>manageRoles.includes(first(item.roles)?.name)))
    .map((member:any)=>member.user_id)
    .filter((id:string)=>id&&id!==user.id);

  if(leaderIds.length){
    await admin.from("notifications").insert(leaderIds.map((leaderId:string)=>({
      user_id:leaderId,
      project_id:project.id,
      type:"split_change_requested",
      title:"Split change requested",
      body:`A contributor requested a change to ${first(split.tracks)?.working_title||"a track"}: ${reason}`,
      entity_type:"track",
      entity_id:split.track_id,
    })));
  }

  await admin.from("platform_events").insert({
    user_id:user.id,
    project_id:project.id,
    event_name:"track_split_change_requested",
    category:"rights",
    entity_type:"track",
    entity_id:split.track_id,
    metadata:{split_id:split.id,reason},
  });

  revalidatePath("/splits");
  revalidatePath("/notifications");
  revalidatePath(`/track-records/${split.track_id}`);
}

"use server";

import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {getWorkspace} from "../../lib/workspace";

const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
const first=(value:any)=>Array.isArray(value)?value[0]:value;

function portalForRole(role:string|null|undefined){
  if(role==="A&R")return"/portal/ar";
  if(role==="Manager")return"/portal/manager";
  if(role==="Studio Owner")return"/portal/studio";
  return"/workspace";
}

export async function respondToInvitation(formData:FormData){
  const invitationId=read(formData,"invitation_id");
  const response=read(formData,"response");

  if(!["accepted","declined"].includes(response)){
    throw new Error("Choose accept or decline.");
  }

  const{user,admin}=await getWorkspace();

  const{data:invitation}=await admin.from("project_invitations")
    .select("id,project_id,user_id,role_id,status,projects(name),roles(name)")
    .eq("id",invitationId)
    .eq("user_id",user.id)
    .eq("status","pending")
    .maybeSingle();

  if(!invitation)throw new Error("This invitation is no longer available.");

  const roleName=first(invitation.roles)?.name||null;
  const projectName=first(invitation.projects)?.name||"the project";

  if(response==="accepted"){
    const{data:previous}=await admin.from("project_members")
      .select("id")
      .eq("project_id",invitation.project_id)
      .eq("user_id",user.id)
      .maybeSingle();

    let memberId=previous?.id;

    if(memberId){
      await admin.from("project_members").update({status:"active"}).eq("id",memberId);
    }else{
      const{data:created,error}=await admin.from("project_members")
        .insert({project_id:invitation.project_id,user_id:user.id,status:"active"})
        .select("id")
        .single();

      if(error)throw new Error(error.message);
      memberId=created.id;
    }

    if(memberId){
      await admin.from("member_roles").upsert({
        project_member_id:memberId,
        role_id:invitation.role_id,
      },{
        onConflict:"project_member_id,role_id"
      });
    }

    const{data:supportRelationship}=await admin
      .from("project_support_relationships")
      .select("id,artist_id,support_role")
      .eq("project_id",invitation.project_id)
      .eq("support_user_id",user.id)
      .eq("status","pending")
      .maybeSingle();

    if(supportRelationship){
      await admin.from("project_support_relationships")
        .update({status:"active",updated_at:new Date().toISOString()})
        .eq("id",supportRelationship.id);

      await admin.from("notifications").insert([
        {
          user_id:user.id,
          project_id:invitation.project_id,
          type:"support_portal_activated",
          title:`Your ${supportRelationship.support_role} portal is active`,
          body:`You now have role-specific access to ${projectName}, including project workflow, opportunities, read-only finance transparency, reports and project updates.`,
          entity_type:"project",
          entity_id:invitation.project_id,
          action_url:portalForRole(supportRelationship.support_role),
          audience_role:supportRelationship.support_role,
          importance:"important",
        },
        {
          user_id:supportRelationship.artist_id,
          project_id:invitation.project_id,
          type:"support_member_joined",
          title:`Your ${supportRelationship.support_role} joined`,
          body:`Your invited ${supportRelationship.support_role} accepted access to ${projectName}. Their support portal is now active.`,
          entity_type:"profile",
          entity_id:user.id,
          action_url:"/support-team",
          audience_role:"Artist",
          importance:"normal",
        }
      ]);
    }

    await admin.from("activity_log").insert({
      project_id:invitation.project_id,
      user_id:user.id,
      action:`Accepted a project invitation${roleName?` as ${roleName}`:""}`,
      entity_type:"project_invitation",
      entity_id:invitation.id,
    });

    (await cookies()).set("fackts_project_id",invitation.project_id,{
      httpOnly:true,
      sameSite:"lax",
      secure:process.env.NODE_ENV==="production",
      path:"/",
    });
  }else{
    await admin.from("project_support_relationships")
      .update({status:"declined",updated_at:new Date().toISOString()})
      .eq("project_id",invitation.project_id)
      .eq("support_user_id",user.id)
      .eq("status","pending");
  }

  await admin.from("project_invitations")
    .update({
      status:response,
      responded_at:new Date().toISOString(),
      updated_at:new Date().toISOString(),
    })
    .eq("id",invitation.id);

  revalidatePath("/", "layout");
  revalidatePath("/support-team");
  revalidatePath("/inbox");

  redirect(response==="accepted"?portalForRole(roleName):"/invitations");
}

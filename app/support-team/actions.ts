"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";

const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
const SUPPORT_ROLES=["A&R","Manager","Studio Owner"];
const MANAGE_ROLES=["Super Admin","Admin","Project Lead"];

function first(value:any){return Array.isArray(value)?value[0]:value;}

export async function inviteSupportMember(fd:FormData){
  const{admin,user,project,membership,roles}=await getWorkspace();
  if(!project||!membership)throw new Error("Project access required.");

  const canInvite=
    hasAnyRole(roles,MANAGE_ROLES) ||
    roles.includes("Artist");

  if(!canInvite){
    throw new Error("Artists and project leadership can invite support people.");
  }

  const supportRole=read(fd,"support_role");
  if(!SUPPORT_ROLES.includes(supportRole)){
    throw new Error("Choose A&R, Artist Manager or Studio Owner.");
  }

  const email=read(fd,"email").toLowerCase();
  if(!email)throw new Error("Enter the support person's FACKTS Music email.");

  let artistId=read(fd,"artist_id");

  if(!hasAnyRole(roles,MANAGE_ROLES)){
    artistId=user.id;
  }

  if(!artistId)artistId=user.id;

  const{data:artistMember}=await admin
    .from("project_members")
    .select("id,user_id,member_roles(roles(name))")
    .eq("project_id",project.id)
    .eq("user_id",artistId)
    .eq("status","active")
    .maybeSingle();

  const artistRoles=(artistMember?.member_roles||[])
    .map((row:any)=>first(row.roles)?.name)
    .filter(Boolean);

  if(!artistMember||(!artistRoles.includes("Artist")&&!hasAnyRole(roles,MANAGE_ROLES))){
    throw new Error("Support must be attached to an active artist in this project.");
  }

  const{data:target}=await admin
    .from("profiles")
    .select("id,email,full_name,stage_name")
    .ilike("email",email)
    .maybeSingle();

  if(!target){
    throw new Error("That email does not have a FACKTS Music account yet. Ask them to sign up first, then invite them here.");
  }

  if(target.id===artistId){
    throw new Error("You cannot invite yourself as your own support person.");
  }

  const{data:roleRow}=await admin
    .from("roles")
    .select("id,name")
    .eq("name",supportRole)
    .maybeSingle();

  if(!roleRow)throw new Error(`${supportRole} role is not installed yet. Run the support portal migration first.`);

  const{error:relationshipError}=await admin
    .from("project_support_relationships")
    .upsert({
      project_id:project.id,
      artist_id:artistId,
      support_user_id:target.id,
      support_role:supportRole,
      invited_by:user.id,
      status:"pending",
      updated_at:new Date().toISOString(),
    },{
      onConflict:"project_id,artist_id,support_user_id,support_role"
    });

  if(relationshipError)throw new Error(relationshipError.message);

  const{data:existingInvite}=await admin
    .from("project_invitations")
    .select("id")
    .eq("project_id",project.id)
    .eq("user_id",target.id)
    .eq("status","pending")
    .maybeSingle();

  const message=`You have been invited to support an artist in ${project.name} as ${supportRole}. You will receive a role-specific portal, project visibility, opportunities, read-only finance transparency, reports and project updates.`;

  if(existingInvite){
    const{error}=await admin
      .from("project_invitations")
      .update({
        role_id:roleRow.id,
        invited_by:user.id,
        message,
        updated_at:new Date().toISOString(),
      })
      .eq("id",existingInvite.id);
    if(error)throw new Error(error.message);
  }else{
    const{error}=await admin.from("project_invitations").insert({
      project_id:project.id,
      user_id:target.id,
      role_id:roleRow.id,
      invited_by:user.id,
      message,
      status:"pending",
    });
    if(error)throw new Error(error.message);
  }

  await admin.from("notifications").insert({
    user_id:target.id,
    project_id:project.id,
    type:"support_portal_invitation",
    title:`${supportRole} invitation`,
    body:`${project.name} invited you as ${supportRole}. Accept the project invitation to activate your portal and reporting access.`,
    entity_type:"project",
    entity_id:project.id,
    action_url:"/invitations",
    audience_role:supportRole,
    importance:"important",
  });

  await admin.from("platform_events").insert({
    user_id:user.id,
    project_id:project.id,
    event_name:"support_member_invited",
    category:"people",
    entity_type:"profile",
    entity_id:target.id,
    metadata:{artist_id:artistId,support_role:supportRole},
  });

  revalidatePath("/support-team");
  revalidatePath("/invitations");
  revalidatePath("/inbox");
}

export async function revokeSupportMember(fd:FormData){
  const{admin,user,project,roles}=await getWorkspace();
  if(!project||!hasAnyRole(roles,MANAGE_ROLES)){
    throw new Error("Project leadership access required.");
  }

  const relationshipId=read(fd,"relationship_id");

  const{data:relationship}=await admin
    .from("project_support_relationships")
    .select("id,support_user_id,support_role")
    .eq("id",relationshipId)
    .eq("project_id",project.id)
    .maybeSingle();

  if(!relationship)throw new Error("Support relationship not found.");

  await admin
    .from("project_support_relationships")
    .update({status:"revoked",updated_at:new Date().toISOString()})
    .eq("id",relationshipId);

  const{data:member}=await admin
    .from("project_members")
    .select("id")
    .eq("project_id",project.id)
    .eq("user_id",relationship.support_user_id)
    .eq("status","active")
    .maybeSingle();

  const{data:role}=await admin
    .from("roles")
    .select("id")
    .eq("name",relationship.support_role)
    .maybeSingle();

  if(member&&role){
    await admin.from("member_roles")
      .delete()
      .eq("project_member_id",member.id)
      .eq("role_id",role.id);
  }

  await admin.from("notifications").insert({
    user_id:relationship.support_user_id,
    project_id:project.id,
    type:"support_portal_access_changed",
    title:"Support portal access changed",
    body:`Your ${relationship.support_role} support role in ${project.name} has been revoked by project leadership.`,
    entity_type:"project",
    entity_id:project.id,
    action_url:"/projects",
    audience_role:relationship.support_role,
    importance:"important",
  });

  await admin.from("platform_events").insert({
    user_id:user.id,
    project_id:project.id,
    event_name:"support_member_revoked",
    category:"people",
    entity_type:"profile",
    entity_id:relationship.support_user_id,
    metadata:{support_role:relationship.support_role},
  });

  revalidatePath("/support-team");
  revalidatePath("/inbox");
}

export async function publishProjectUpdate(fd:FormData){
  const{admin,user,project,roles}=await getWorkspace();

  if(!project||!hasAnyRole(roles,MANAGE_ROLES)){
    throw new Error("Project leadership access required.");
  }

  const title=read(fd,"title");
  const summary=read(fd,"summary");

  if(!title||!summary){
    throw new Error("Give the update a title and summary.");
  }

  const payload={
    project_id:project.id,
    title,
    version_label:read(fd,"version_label")||null,
    summary,
    general_impact:read(fd,"general_impact")||null,
    impact_ar:read(fd,"impact_ar")||null,
    impact_manager:read(fd,"impact_manager")||null,
    impact_studio_owner:read(fd,"impact_studio_owner")||null,
    created_by:user.id,
  };

  const{data:update,error:updateError}=await admin
    .from("project_updates")
    .insert(payload)
    .select("id")
    .single();

  if(updateError)throw new Error(updateError.message);

  const{data:members=[]}=await admin
    .from("project_members")
    .select("user_id,member_roles(roles(name))")
    .eq("project_id",project.id)
    .eq("status","active");

  const notifications=(members||[]).map((member:any)=>{
    const memberRoles=(member.member_roles||[])
      .map((row:any)=>first(row.roles)?.name)
      .filter(Boolean);

    let audienceRole:string|null=null;
    let impact=payload.general_impact||summary;

    if(memberRoles.includes("A&R")){
      audienceRole="A&R";
      impact=payload.impact_ar||impact;
    }else if(memberRoles.includes("Manager")){
      audienceRole="Manager";
      impact=payload.impact_manager||impact;
    }else if(memberRoles.includes("Studio Owner")){
      audienceRole="Studio Owner";
      impact=payload.impact_studio_owner||impact;
    }

    return{
      user_id:member.user_id,
      project_id:project.id,
      type:"project_update",
      title:payload.version_label?`${title} · ${payload.version_label}`:title,
      body:`${summary}${impact?`\n\nHow this affects you: ${impact}`:""}`,
      entity_type:"project_update",
      entity_id:update.id,
      action_url:"/inbox",
      audience_role:audienceRole,
      importance:"important",
    };
  });

  if(notifications.length){
    const{error}=await admin.from("notifications").insert(notifications);
    if(error)throw new Error(error.message);
  }

  await admin.from("platform_events").insert({
    user_id:user.id,
    project_id:project.id,
    event_name:"project_update_published",
    category:"communication",
    entity_type:"project_update",
    entity_id:update.id,
    metadata:{recipients:notifications.length,title},
  });

  revalidatePath("/support-team");
  revalidatePath("/inbox");
  revalidatePath("/home");
}

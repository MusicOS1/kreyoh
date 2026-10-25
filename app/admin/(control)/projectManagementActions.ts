"use server";

import { revalidatePath } from "next/cache";
import {
  requireControlRoomPermission,
  requireSuperAdmin,
  isProjectSuperAdmin,
  type ControlRoomPermission,
} from "../../../lib/controlRoom";
import { createAdminClient } from "../../../lib/supabase/admin";
import { notifyProjectMembers, notifyUser } from "../../../lib/projectNotifications";

const BUCKET = "project-media";
const read = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const ADMIN_PERMISSIONS = new Set<ControlRoomPermission>([
  "people","projects","music","tasks","sessions","documents","commercial","finance",
  "enquiries","intelligence","reports","system",
]);

async function uploadImage(admin:any, projectId:string, file:File|null, kind:string) {
  if (!file || file.size <= 0) return null;
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Project images must be JPG, PNG or WebP.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Project images must be smaller than 12 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `${projectId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(key, file, { contentType:file.type, upsert:false });
  if (error) throw new Error(error.message);
  return admin.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
}

async function changeScopedAdminAccess(
  fd: FormData,
  actor: { id: string },
  operation: "manage" | "revoke",
) {
  const admin = createAdminClient();
  const userId = read(fd,"user_id");
  const active = operation === "revoke" ? false : read(fd,"active") !== "false";
  if (!userId) throw new Error("Choose an account.");
  if (userId === actor.id) throw new Error("You cannot change your own full administrator access.");
  // Protect distinct project-based Super Admin membership, not every
  // full-access global grant. Another full global admin can revoke one.
  if (await isProjectSuperAdmin(userId)) {
    throw new Error("This account also has a project Super Admin role. Review that role separately.");
  }
  const permissions = [...new Set(fd.getAll("permissions").map(String))].filter(
    (p): p is ControlRoomPermission => ADMIN_PERMISSIONS.has(p as ControlRoomPermission),
  );
  if (active && !permissions.length) throw new Error("Choose at least one Admin permission.");
  const { data: existing, error: readError } = await admin.from("control_room_admins")
    .select("user_id,active,permissions").eq("user_id",userId).maybeSingle();
  if (readError) throw new Error("Could not check the account's existing access.");
  if (!active && !existing?.active) throw new Error("This account's administrator access is already disabled.");
  if (existing?.active && existing.permissions?.includes("all")
      && (!active || !permissions.includes("all" as ControlRoomPermission))) {
    const { count, error: countError } = await admin.from("control_room_admins")
      .select("user_id", { count:"exact", head:true })
      .eq("active",true).contains("permissions",["all"]);
    if (countError || count === null) throw new Error("Unable to verify remaining full administrators.");
    if (count < 2) throw new Error("Cannot disable the last full platform administrator.");
  }
  const nextPermissions = active ? permissions
    : (existing?.permissions?.length ? existing.permissions : ["projects"]);
  const { data: updated, error } = await admin.from("control_room_admins")
    .upsert({
      user_id:userId, granted_by:actor.id, active,
      permissions:nextPermissions,
      updated_at:new Date().toISOString(),
    }, {onConflict:"user_id"})
    .select("user_id").maybeSingle();
  if (error || !updated) throw new Error("Could not save administrator access.");
  const { error:auditError } = await admin.from("platform_events").insert({
    user_id:actor.id,
    event_name:active ? "control_room_access_updated" : "control_room_access_revoked",
    category:"admin",
    entity_type:"profile",
    entity_id:userId,
    metadata:{active,permissions:nextPermissions},
  });
  if (auditError) console.warn("Could not write Control Room access audit",auditError.code);
  try {
    await notifyUser(admin,{
      userId,
      type:"admin_permissions_updated",
      title:active ? "Administrator access updated" : "Administrator access disabled",
      body:active ? "Your Control Room permissions are: " + permissions.join(", ") + "."
        : "Your Control Room administrator access was disabled. Your music account, projects and content remain.",
      entityType:"profile",
      entityId:userId,
    });
  } catch (error) {
    console.warn("Could not send Control Room access notification",error);
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin/administrators");
  revalidatePath("/notifications");
}

// Preserve the existing grant form's FormData server action API.
export async function setScopedAdminAccess(fd:FormData) {
  const actor = await requireSuperAdmin();
  return changeScopedAdminAccess(fd,actor,"manage");
}
export async function savePlatformAdministrator(
 _previous:{error:string;success:string},fd:FormData,
):Promise<{error:string;success:string}>{
 const actor=await requireSuperAdmin();
 try{
   await changeScopedAdminAccess(fd,actor,"manage");
   return {error:"",success:"Platform administrator permissions saved."};
 }catch(e){
   return {error:e instanceof Error?e.message:"Unable to save permissions.",success:""};
 }
}


// Revocation reports expected failures inline rather than a runtime error.
export async function revokeScopedAdminAccess(
  _previous: {error:string;success:string},
  fd:FormData,
):Promise<{error:string;success:string}> {
  const actor = await requireSuperAdmin();
  try {
    await changeScopedAdminAccess(fd,actor,"revoke");
    return {error:"",success:"Administrator access disabled. The music account remains intact."};
  } catch (error) {
    return {error:error instanceof Error?error.message:"Unable to disable administrator access.",success:""};
  }
}

export async function setManagedProjectLead(fd:FormData) {
  const actor = await requireControlRoomPermission("people");
  const admin = createAdminClient();
  const memberId = read(fd,"member_id");
  const mode = read(fd,"mode");
  const fallbackRole = read(fd,"fallback_role") || "Artist";

  const { data:member } = await admin.from("project_members")
    .select("id,project_id,user_id,status").eq("id",memberId).maybeSingle();
  if (!member) throw new Error("Project membership not found.");
  if (member.status !== "active") throw new Error("Restore this member before changing their role.");

  const [{data:leadRole},{data:fallback}] = await Promise.all([
    admin.from("roles").select("id").eq("name","Project Lead").maybeSingle(),
    admin.from("roles").select("id").eq("name",fallbackRole).maybeSingle(),
  ]);
  if (!leadRole) throw new Error("Project Lead role is unavailable.");

  if (mode === "add") {
    const { error } = await admin.from("member_roles").upsert(
      {project_member_id:member.id,role_id:leadRole.id},
      {onConflict:"project_member_id,role_id"}
    );
    if (error) throw new Error(error.message);
    await notifyUser(admin,{userId:member.user_id,projectId:member.project_id,type:"role_updated",title:"Project role updated",body:"You have been appointed Project Lead.",entityType:"profile",entityId:member.user_id});
  } else if (mode === "remove") {
    const { error } = await admin.from("member_roles").delete().eq("project_member_id",member.id).eq("role_id",leadRole.id);
    if (error) throw new Error(error.message);
    const { data:remaining } = await admin.from("member_roles").select("role_id").eq("project_member_id",member.id);
    if (!remaining?.length && fallback) {
      const { error:fallbackError } = await admin.from("member_roles").insert({project_member_id:member.id,role_id:fallback.id});
      if (fallbackError) throw new Error(fallbackError.message);
    }
    await notifyUser(admin,{userId:member.user_id,projectId:member.project_id,type:"role_updated",title:"Project leadership updated",body:`Your Project Lead role was removed. Your membership and project history remain active${fallback ? ` as ${fallbackRole}` : ""}.`,entityType:"profile",entityId:member.user_id});
  } else throw new Error("Choose a valid role action.");

  await admin.from("platform_events").insert({
    user_id:actor.id,project_id:member.project_id,
    event_name:mode==="add" ? "project_lead_appointed" : "project_lead_removed",
    category:"projects",entity_type:"profile",entity_id:member.user_id,
    metadata:{fallback_role:fallbackRole},
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/projects/${member.project_id}`);
  revalidatePath("/notifications");
}

export async function updateManagedProjectIdentity(fd:FormData) {
  const actor = await requireControlRoomPermission("projects");
  const admin = createAdminClient();
  const projectId = read(fd,"project_id");
  const status = read(fd,"status") || "active";
  const capacity = Number(read(fd,"default_beat_capacity") || 3);
  if (!["active","paused","completed","archived"].includes(status)) throw new Error("Invalid project status.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 12) throw new Error("Artist capacity must be between 1 and 12.");

  const cover = fd.get("cover_file") instanceof File ? fd.get("cover_file") as File : null;
  const hero = fd.get("hero_file") instanceof File ? fd.get("hero_file") as File : null;
  const [coverUrl,heroUrl] = await Promise.all([uploadImage(admin,projectId,cover,"cover"),uploadImage(admin,projectId,hero,"hero")]);

  const update:Record<string,unknown> = {
    name:read(fd,"name"), code:read(fd,"code"), project_type:read(fd,"project_type")||null,
    description:read(fd,"description")||null, status, next_action:read(fd,"next_action")||null,
    start_date:read(fd,"start_date")||null, target_release_date:read(fd,"target_release_date")||null,
    default_beat_capacity:capacity, updated_at:new Date().toISOString(),
  };
  if (!update.name || !update.code) throw new Error("Project name and code are required.");
  if (coverUrl) update.artwork_url=coverUrl;
  if (heroUrl) update.hero_image_url=heroUrl;

  const { error } = await admin.from("projects").update(update).eq("id",projectId);
  if (error) throw new Error(error.message);

  await admin.from("platform_events").insert({
    user_id:actor.id,project_id:projectId,
    event_name:(coverUrl||heroUrl)?"project_appearance_updated":"project_settings_updated",
    category:"projects",entity_type:"project",entity_id:projectId,
  });
  await notifyProjectMembers(admin,{projectId,type:"project_updated",title:"Project updated",body:`${String(update.name)} project information was updated.`,entityType:"project",entityId:projectId,excludeUserId:actor.id});

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/home");
  revalidatePath("/my-projects");
  revalidatePath("/workspace");
  revalidatePath("/notifications");
}

export async function createManagedProjectTask(fd:FormData) {
  const actor = await requireControlRoomPermission("tasks");
  const admin = createAdminClient();
  const projectId=read(fd,"project_id"), title=read(fd,"title"), assigneeId=read(fd,"assignee_id")||null;
  if (!projectId || !title) throw new Error("Project and task title are required.");
  if (assigneeId) {
    const { data:membership } = await admin.from("project_members").select("id").eq("project_id",projectId).eq("user_id",assigneeId).eq("status","active").maybeSingle();
    if (!membership) throw new Error("Assignee must be an active project member.");
  }
  const { data:task,error } = await admin.from("project_tasks").insert({
    project_id:projectId,title,description:read(fd,"description")||null,assignee_id:assigneeId,created_by:actor.id,due_date:read(fd,"due_date")||null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  if (assigneeId) await notifyUser(admin,{userId:assigneeId,projectId,type:"task_assigned",title:"New action assigned",body:title,entityType:"task",entityId:task.id});
  await admin.from("platform_events").insert({user_id:actor.id,project_id:projectId,event_name:"project_task_created",category:"operations",entity_type:"task",entity_id:task.id});
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/tasks");
  revalidatePath("/notifications");
}

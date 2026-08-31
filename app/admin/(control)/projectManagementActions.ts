"use server";

import { revalidatePath } from "next/cache";
import {
  requireControlRoomPermission,
  requireSuperAdmin,
  isSuperAdmin,
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

export async function setScopedAdminAccess(fd:FormData) {
  const actor = await requireSuperAdmin();
  const admin = createAdminClient();
  const userId = read(fd,"user_id");
  const active = read(fd,"active") !== "false";
  if (!userId) throw new Error("Choose an account.");
  if (await isSuperAdmin(userId)) throw new Error("Super Admin permissions cannot be reduced from this panel.");

  const permissions = fd.getAll("permissions").map(String).filter(
    (p): p is ControlRoomPermission => ADMIN_PERMISSIONS.has(p as ControlRoomPermission)
  );
  if (active && !permissions.length) throw new Error("Choose at least one Admin permission.");

  const { error } = await admin.from("control_room_admins").upsert({
    user_id:userId, granted_by:actor.id, active,
    permissions:permissions.length ? permissions : ["projects"],
    updated_at:new Date().toISOString(),
  }, { onConflict:"user_id" });
  if (error) throw new Error(error.message);

  await notifyUser(admin, {
    userId,
    type:"admin_permissions_updated",
    title:active ? "Administrator access updated" : "Administrator access disabled",
    body:active ? `Your Control Room permissions are: ${permissions.join(", ")}.` : "Your administrator access was disabled by Super Admin.",
    entityType:"profile",
    entityId:userId,
  });
  revalidatePath("/admin/users");
  revalidatePath("/notifications");
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

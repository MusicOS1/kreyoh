"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import { hasControlRoomPermission } from "../../lib/controlRoom";
import { createAdminClient } from "../../lib/supabase/admin";
import { notifyUser } from "../../lib/projectNotifications";

const read = (fd: FormData, key: string) => String(fd.get(key) || "").trim();

export async function createTask(fd: FormData) {
  const { supabase, user, project, roles } = await getWorkspace();
  if (!project) throw new Error("No active project.");

  const canCreate =
    hasAnyRole(roles, ["Super Admin", "Admin", "Project Lead", "A&R"]) ||
    (await hasControlRoomPermission(user.id, "tasks"));

  if (!canCreate) throw new Error("Your role cannot create project actions.");

  const assignee = read(fd, "assignee_id") || null;
  const { data, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: project.id,
      track_id: read(fd, "track_id") || null,
      title: read(fd, "title"),
      description: read(fd, "description") || null,
      assignee_id: assignee,
      created_by: user.id,
      due_date: read(fd, "due_date") || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (assignee) {
    await supabase.from("notifications").insert({
      user_id: assignee,
      project_id: project.id,
      type: "task_assigned",
      title: "New action assigned",
      body: read(fd, "title"),
      entity_type: "task",
      entity_id: data.id,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/notifications");
}

export async function updateTask(fd: FormData) {
  const { supabase, user, project, roles } = await getWorkspace();
  if (!project) throw new Error("No active project.");

  const id = read(fd, "task_id");
  const status = read(fd, "status");
  if (!["to_do", "in_progress", "blocked", "done"].includes(status)) throw new Error("Invalid action status.");

  const canManage =
    hasAnyRole(roles, ["Super Admin", "Admin", "Project Lead", "A&R"]) ||
    (await hasControlRoomPermission(user.id, "tasks"));

  const query = supabase
    .from("project_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("project_id", project.id);

  if (!canManage) query.eq("assignee_id", user.id);
  const { error } = await query;
  if (error) throw new Error(error.message);

  const admin = createAdminClient();
  const { data: task } = await admin
    .from("project_tasks")
    .select("id,title,assignee_id,created_by")
    .eq("id", id)
    .eq("project_id", project.id)
    .maybeSingle();

  const recipients = Array.from(new Set([task?.assignee_id, task?.created_by].filter(Boolean)))
    .filter((target) => target !== user.id) as string[];

  for (const target of recipients) {
    await notifyUser(admin, {
      userId: target,
      projectId: project.id,
      type: "task_updated",
      title: "Task updated",
      body: `${task?.title || "A project task"} is now ${status.replaceAll("_", " ")}.`,
      entityType: "task",
      entityId: id,
    });
  }

  await admin.from("platform_events").insert({
    user_id: user.id,
    project_id: project.id,
    event_name: "task_status_updated",
    category: "operations",
    entity_type: "task",
    entity_id: id,
    metadata: { status },
  });

  revalidatePath("/tasks");
  revalidatePath("/notifications");
}

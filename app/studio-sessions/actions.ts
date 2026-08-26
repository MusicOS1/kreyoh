"use server";
import { revalidatePath } from "next/cache";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";

const read = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const manageRoles = ["Super Admin", "Admin", "Project Lead", "A&R", "Engineer"];

export async function createSession(fd: FormData) {
  const { admin, user, project, roles } = await getWorkspace();
  if (!project || !hasAnyRole(roles, manageRoles)) throw new Error("Your role cannot create sessions.");
  const isBacklog = read(fd, "is_backlog") === "true";
  const { data, error } = await admin.from("studio_sessions").insert({
    project_id: project.id, track_id: read(fd, "track_id") || null,
    starts_at: read(fd, "starts_at"), ends_at: read(fd, "ends_at") || null,
    location: read(fd, "location") || null, producer_id: read(fd, "producer_id") || null,
    engineer_id: read(fd, "engineer_id") || null, ar_id: read(fd, "ar_id") || (roles.includes("A&R") ? user.id : null),
    notes: read(fd, "notes") || null, outcomes: read(fd, "outcomes") || null,
    media_source_url: read(fd, "media_source_url") || null, media_notes: read(fd, "media_notes") || null,
    is_backlog: isBacklog, status: isBacklog ? "complete" : "scheduled", created_by: user.id,
  }).select("id").single();
  if (error) throw new Error(error.message);
  const participants = Array.from(new Set(fd.getAll("participants").map(String).filter(Boolean)));
  if (participants.length) await admin.from("session_participants").insert(participants.map((id) => ({ session_id: data.id, user_id: id })));
  if (!isBacklog && participants.length) await admin.from("notifications").insert(participants.filter((id) => id !== user.id).map((id) => ({ user_id: id, project_id: project.id, type: "session_scheduled", title: "Studio session scheduled", entity_type: "session", entity_id: data.id })));
  await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: isBacklog ? "recorded a past studio session" : "scheduled a studio session", entity_type: "session", entity_id: data.id });
  revalidatePath("/studio-sessions"); revalidatePath("/workspace");
}

export async function updateSession(fd: FormData) {
  const { admin, project, roles } = await getWorkspace();
  if (!project || !hasAnyRole(roles, manageRoles)) throw new Error("Your role cannot update sessions.");
  const { error } = await admin.from("studio_sessions").update({ status: read(fd, "status"), outcomes: read(fd, "outcomes") || null, media_source_url: read(fd, "media_source_url") || null, media_notes: read(fd, "media_notes") || null, updated_at: new Date().toISOString() }).eq("id", read(fd, "session_id")).eq("project_id", project.id);
  if (error) throw new Error(error.message); revalidatePath("/studio-sessions");
}

export async function recordContribution(fd: FormData) {
  const { admin, user, project, membership } = await getWorkspace();
  if (!project || !membership) throw new Error("Project access required.");
  const description = read(fd, "description");
  if (description.length < 2) throw new Error("Describe what you contributed.");
  const { error } = await admin.from("session_contributions").insert({ session_id: read(fd, "session_id"), project_id: project.id, track_id: read(fd, "track_id") || null, contributor_id: user.id, contribution_type: read(fd, "contribution_type") || "other", description, created_by: user.id });
  if (error) throw new Error(error.message);
  await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: `recorded a ${read(fd, "contribution_type") || "creative"} contribution`, entity_type: "session", entity_id: read(fd, "session_id") });
  revalidatePath("/studio-sessions"); revalidatePath(`/people/${user.id}`);
}

export async function assignSessionAction(fd: FormData) {
  const { admin, user, project, membership } = await getWorkspace();
  if (!project || !membership) throw new Error("Project access required.");
  const title = read(fd, "title"); const assigneeId = read(fd, "assignee_id");
  if (!title || !assigneeId) throw new Error("Choose a person and describe the action.");
  const { data: active } = await admin.from("project_members").select("user_id").eq("project_id", project.id).eq("user_id", assigneeId).eq("status", "active").maybeSingle();
  if (!active) throw new Error("That person is not an active project member.");
  const { data: task, error } = await admin.from("project_tasks").insert({ project_id: project.id, session_id: read(fd, "session_id"), track_id: read(fd, "track_id") || null, title, description: read(fd, "description") || null, assignee_id: assigneeId, created_by: user.id, due_date: read(fd, "due_date") || null }).select("id").single();
  if (error) throw new Error(error.message);
  await admin.from("notifications").insert({ user_id: assigneeId, project_id: project.id, type: "task_assigned", title: "New studio action assigned", body: title, entity_type: "task", entity_id: task.id });
  revalidatePath("/studio-sessions"); revalidatePath("/tasks");
}

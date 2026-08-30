"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspace } from "../../lib/workspace";

const read = (fd: FormData, key: string) => String(fd.get(key) || "").trim();

export async function selectProject(formData: FormData) {
  const projectId = read(formData, "project_id");
  const { user, admin } = await getWorkspace();
  const { data: membership } = await admin.from("project_members").select("id")
    .eq("user_id", user.id).eq("project_id", projectId).eq("status", "active").maybeSingle();
  if (!membership) throw new Error("You do not have access to that project.");
  (await cookies()).set("fackts_project_id", projectId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  redirect("/workspace");
}

export async function requestToJoin(formData: FormData) {
  const projectId = read(formData, "project_id");
  const message = read(formData, "message") || null;
  const { user, admin } = await getWorkspace();
  const { data: project } = await admin.from("projects").select("id,name,visibility,join_requests_open")
    .eq("id", projectId).eq("visibility", "discoverable").eq("join_requests_open", true).maybeSingle();
  if (!project) throw new Error("This project is not accepting requests.");
  const { data: existing } = await admin.from("project_join_requests").select("id,status")
    .eq("project_id", projectId).eq("user_id", user.id).eq("status", "pending").maybeSingle();
  if (existing) throw new Error("Your request is already pending.");
  const { data: request, error } = await admin.from("project_join_requests").insert({ project_id: projectId, user_id: user.id, message }).select("id").single();
  if (error) throw new Error(error.message);
  const { data: managers = [] } = await admin.from("project_members").select("user_id,member_roles!inner(roles!inner(name))")
    .eq("project_id", projectId).eq("status", "active");
  const managerIds = (managers || []).filter((m: any) => (m.member_roles || []).some((mr: any) => ["Super Admin","Admin","Project Lead"].includes(firstRole(mr.roles)))).map((m: any) => m.user_id);
  if (managerIds.length) await admin.from("notifications").insert(managerIds.map((id: string) => ({ user_id: id, project_id: projectId, type: "project_join_request", title: "New request to join", body: `${user.email || "A creator"} requested access to ${project.name}.`, entity_type: "project_join_request", entity_id: request.id })));
  revalidatePath("/projects");
}

function firstRole(value: any) { return Array.isArray(value) ? value[0]?.name : value?.name; }

export async function cancelJoinRequest(formData: FormData) {
  const { user, admin } = await getWorkspace();
  const { error } = await admin.from("project_join_requests").update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", read(formData, "request_id")).eq("user_id", user.id).eq("status", "pending");
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function createProject(formData: FormData) {
  const name = read(formData, "name");
  if (name.length < 3) throw new Error("Give the project a clear name.");
  const { user, admin } = await getWorkspace();
  const code = `FM-${Date.now().toString().slice(-8)}`;
  const { data: project, error } = await admin.from("projects").insert({ code, name, project_type: read(formData,"project_type") || "Music Project", current_stage: "Project Setup", next_action: "Invite the core team and define the project brief", owner_id: user.id, description: read(formData,"description") || null, status: "active", progress: 0, visibility: read(formData,"visibility") === "discoverable" ? "discoverable" : "private", join_requests_open: read(formData,"join_requests_open") === "on", created_by: user.id }).select("id").single();
  if (error) throw new Error(error.message);
  const { data: member, error: memberError } = await admin.from("project_members").insert({ project_id: project.id, user_id: user.id, status: "active" }).select("id").single();
  if (memberError) throw new Error(memberError.message);
  const { data: role } = await admin.from("roles").select("id").eq("name", "Project Lead").single();
  if (role) await admin.from("member_roles").insert({ project_member_id: member.id, role_id: role.id });
  await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: `Created ${name}`, entity_type: "project", entity_id: project.id });
  (await cookies()).set("fackts_project_id", project.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  revalidatePath("/", "layout");
  redirect("/workspace");
}

export async function inviteExistingUser(formData: FormData) {
  const email = read(formData, "email").toLowerCase();
  const roleName = read(formData, "primary_role") || "Artist";
  const { user, project, roles, admin } = await getWorkspace();
  if (!project || !roles.some((role) => ["Super Admin","Admin","Project Lead"].includes(role))) throw new Error("Only an Admin or Project Lead can invite members.");
  let { data: profile } = await admin.from("profiles").select("id,full_name,stage_name,email").eq("email", email).maybeSingle();
  if (!profile) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
      data: { full_name: email.split("@")[0], creator_types: [roleName] },
    });
    if (inviteError || !invited.user) throw new Error(inviteError?.message || "The email invitation could not be sent.");
    const { data: created, error: profileError } = await admin.from("profiles").upsert({ id: invited.user.id, email, full_name: email.split("@")[0], creator_types: [roleName], profile_visibility: "project", updated_at: new Date().toISOString() }, { onConflict: "id" }).select("id,full_name,stage_name,email").single();
    if (profileError || !created) throw new Error(profileError?.message || "The invited profile could not be prepared.");
    profile = created;
  }
  if (profile.id === user.id) throw new Error("You already belong to this project.");
  const { data: active } = await admin.from("project_members").select("id").eq("project_id", project.id).eq("user_id", profile.id).eq("status", "active").maybeSingle();
  if (active) throw new Error("That person is already an active project member.");
  const { data: existing } = await admin.from("project_invitations").select("id").eq("project_id", project.id).eq("user_id", profile.id).eq("status", "pending").maybeSingle();
  if (existing) throw new Error("That invitation is already pending.");
  const { data: role } = await admin.from("roles").select("id").eq("name", roleName).maybeSingle();
  if (!role) throw new Error("Choose a valid project role.");
  const { data: invitation, error } = await admin.from("project_invitations").insert({ project_id: project.id, user_id: profile.id, role_id: role.id, invited_by: user.id, message: read(formData,"notes") || null }).select("id").single();
  if (error) throw new Error(error.message);
  await admin.from("notifications").insert({ user_id: profile.id, project_id: project.id, type: "project_invitation", title: `Invitation to ${project.name}`, body: `You have been invited as ${roleName}.`, entity_type: "project_invitation", entity_id: invitation.id });
  await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: `Invited ${profile.stage_name || profile.full_name || email} as ${roleName}`, entity_type: "project_invitation", entity_id: invitation.id });
  revalidatePath("/people"); revalidatePath("/invitations");
}

export async function addRegisteredUsers(formData: FormData) {
  const userIds = formData.getAll("user_ids").map(String).filter(Boolean);
  const roleName = read(formData, "role_name") || "Artist";
  const { user, project, roles, admin } = await getWorkspace();
  if (!project || !roles.some((role) => ["Super Admin", "Admin", "Project Lead"].includes(role))) throw new Error("Only project management can add existing users.");
  if (!userIds.length) throw new Error("Select at least one registered user.");
  const { data: role } = await admin.from("roles").select("id").eq("name", roleName).maybeSingle();
  if (!role || ["Super Admin", "Admin", "Control Room Admin"].includes(roleName)) throw new Error("Choose an allowed project role.");
  for (const userId of userIds) {
    const { data: profile } = await admin.from("profiles").select("id,full_name,stage_name").eq("id", userId).maybeSingle();
    if (!profile) continue;
    const { data: prior } = await admin.from("project_members").select("id,status").eq("project_id", project.id).eq("user_id", userId).maybeSingle();
    let memberId = prior?.id;
    if (memberId) await admin.from("project_members").update({ status: "active" }).eq("id", memberId);
    else {
      const created = await admin.from("project_members").insert({ project_id: project.id, user_id: userId, status: "active" }).select("id").single();
      if (created.error) throw new Error(created.error.message);
      memberId = created.data.id;
    }
    await admin.from("member_roles").upsert({ project_member_id: memberId, role_id: role.id }, { onConflict: "project_member_id,role_id" });
    await admin.from("notifications").insert({ user_id: userId, project_id: project.id, type: "project_added", title: `Added to ${project.name}`, body: `You now have ${roleName} access.` });
    await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: `Added ${profile.stage_name || profile.full_name} as ${roleName}`, entity_type: "project_member", entity_id: userId });
    await admin.from("platform_events").insert({ project_id: project.id, user_id: user.id, event_name: "member_added", category: "projects", entity_type: "profile", entity_id: userId, metadata: { role: roleName } });
  }
  revalidatePath("/people");
  revalidatePath("/workspace");
}

export async function reviewJoinRequest(formData: FormData) {
  const requestId = read(formData, "request_id");
  const decision = read(formData, "decision");
  const roleName = read(formData, "role_name") || "Artist";
  const { user, project, roles, admin } = await getWorkspace();
  if (!project || !roles.some((role) => ["Super Admin","Admin","Project Lead"].includes(role))) throw new Error("Only project management can review requests.");
  if (!['approved','declined'].includes(decision)) throw new Error("Choose approve or decline.");
  const { data: request } = await admin.from("project_join_requests").select("id,user_id,status").eq("id", requestId).eq("project_id", project.id).eq("status", "pending").maybeSingle();
  if (!request) throw new Error("This request is no longer pending.");
  if (decision === "approved") {
    const { data: prior } = await admin.from("project_members").select("id").eq("project_id", project.id).eq("user_id", request.user_id).maybeSingle();
    let memberId = prior?.id;
    if (memberId) await admin.from("project_members").update({ status: "active" }).eq("id", memberId);
    else { const { data: created, error } = await admin.from("project_members").insert({ project_id: project.id, user_id: request.user_id, status: "active" }).select("id").single(); if (error) throw new Error(error.message); memberId = created.id; }
    const { data: role } = await admin.from("roles").select("id").eq("name", roleName).maybeSingle();
    if (role && memberId) await admin.from("member_roles").upsert({ project_member_id: memberId, role_id: role.id }, { onConflict: "project_member_id,role_id" });
  }
  await admin.from("project_join_requests").update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", request.id);
  await admin.from("notifications").insert({ user_id: request.user_id, project_id: project.id, type: `join_request_${decision}`, title: decision === "approved" ? `Welcome to ${project.name}` : `Join request update`, body: decision === "approved" ? `Your request was approved. You can now enter the project.` : `Your request to join ${project.name} was declined.`, entity_type: "project_join_request", entity_id: request.id });
  await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: `${decision} a project join request`, entity_type: "project_join_request", entity_id: request.id });
  revalidatePath("/people"); revalidatePath("/projects");
}

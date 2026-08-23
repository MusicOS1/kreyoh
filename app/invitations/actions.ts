"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspace } from "../../lib/workspace";

const read = (fd: FormData, key: string) => String(fd.get(key) || "").trim();

export async function respondToInvitation(formData: FormData) {
  const invitationId = read(formData, "invitation_id");
  const response = read(formData, "response");
  if (!['accepted','declined'].includes(response)) throw new Error("Choose accept or decline.");
  const { user, admin } = await getWorkspace();
  const { data: invitation } = await admin.from("project_invitations").select("id,project_id,user_id,role_id,status,projects(name)")
    .eq("id", invitationId).eq("user_id", user.id).eq("status", "pending").maybeSingle();
  if (!invitation) throw new Error("This invitation is no longer available.");
  if (response === "accepted") {
    const { data: previous } = await admin.from("project_members").select("id").eq("project_id", invitation.project_id).eq("user_id", user.id).maybeSingle();
    let memberId = previous?.id;
    if (memberId) await admin.from("project_members").update({ status: "active" }).eq("id", memberId);
    else { const { data: created, error } = await admin.from("project_members").insert({ project_id: invitation.project_id, user_id: user.id, status: "active" }).select("id").single(); if (error) throw new Error(error.message); memberId = created.id; }
    if (memberId) await admin.from("member_roles").upsert({ project_member_id: memberId, role_id: invitation.role_id }, { onConflict: "project_member_id,role_id" });
    await admin.from("activity_log").insert({ project_id: invitation.project_id, user_id: user.id, action: "Accepted a project invitation", entity_type: "project_invitation", entity_id: invitation.id });
    (await cookies()).set("fackts_project_id", invitation.project_id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  }
  await admin.from("project_invitations").update({ status: response, responded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", invitation.id);
  revalidatePath("/", "layout");
  redirect(response === "accepted" ? "/workspace" : "/invitations");
}

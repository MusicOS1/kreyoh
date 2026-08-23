"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspace } from "../../lib/workspace";
import { createAdminClient } from "../../lib/supabase/admin";

export async function acceptProjectInvitation() {
  const { user, project, invitation } = await getWorkspace();
  if (!project || !invitation) throw new Error("No project invitation is waiting for you.");
  const admin = createAdminClient();
  const { error } = await admin.from("project_members").update({ status: "active" })
    .eq("id", invitation.id).eq("user_id", user.id).eq("project_id", project.id);
  if (error) throw new Error(error.message);
  await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: "Accepted invitation to Project 001", entity_type: "project_invitation", entity_id: invitation.id });
  revalidatePath("/workspace");
  redirect("/workspace");
}

export async function declineProjectInvitation() {
  const { user, project, invitation } = await getWorkspace();
  if (!project || !invitation) throw new Error("No project invitation is waiting for you.");
  const admin = createAdminClient();
  const { error } = await admin.from("project_members").update({ status: "declined" })
    .eq("id", invitation.id).eq("user_id", user.id).eq("project_id", project.id);
  if (error) throw new Error(error.message);
  await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: "Declined invitation to Project 001", entity_type: "project_invitation", entity_id: invitation.id });
  revalidatePath("/workspace");
  redirect("/workspace");
}

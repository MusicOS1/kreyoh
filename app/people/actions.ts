"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "../../lib/workspace";

const MANAGER_ROLES = ["Project Lead", "Admin"];

function value(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

export async function addContributor(formData: FormData): Promise<void> {
  const { supabase, user, project, roles } = await getWorkspace();

  if (!project) {
    throw new Error("No active Project 001 workspace.");
  }

  if (!roles.some((r) => MANAGER_ROLES.includes(r))) {
    throw new Error("Only a Project Lead or Admin can add contributors to Project 001.");
  }

  const fullName = value(formData, "full_name");
  const stageName = value(formData, "stage_name") || null;
  const email = value(formData, "email").toLowerCase();
  const phone = value(formData, "phone") || null;
  const primaryRole = value(formData, "primary_role") || "Artist";
  const additionalRolesRaw = value(formData, "additional_roles");
  const notes = value(formData, "notes") || null;
  const status = value(formData, "status") || "active";

  if (!fullName || !email) {
    throw new Error("Full name and email address are required.");
  }

  // Collect all roles to assign
  const rolesToAssign = [primaryRole];
  if (additionalRolesRaw) {
    const extras = additionalRolesRaw.split(",").map((s) => s.trim()).filter(Boolean);
    for (const ext of extras) {
      if (!rolesToAssign.includes(ext)) {
        rolesToAssign.push(ext);
      }
    }
  }

  // 1. Fetch available roles from roles table
  const { data: dbRoles } = await supabase.from("roles").select("id, name");
  const roleMap = new Map<string, string>();
  (dbRoles || []).forEach((r: any) => {
    roleMap.set(r.name.toLowerCase(), r.id);
  });

  // 2. Check if a profile with this email already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, full_name, stage_name, email")
    .eq("email", email)
    .maybeSingle();

  let targetUserId = existingProfile?.id;

  if (!targetUserId) {
    // A browser-side action must never manufacture an auth/profile identity.
    // Keep the request as a visible pending invite until the person authenticates
    // and a real profile can be linked by a manager or invite flow.
    await supabase.from("activity_log").insert({
      project_id: project.id,
      user_id: user.id,
      action: `Recorded pending invite for ${fullName} (${email}) as ${rolesToAssign.join(", ")}`,
      entity_type: "contributor_invite",
    });

    revalidatePath("/people");
    revalidatePath("/");
    return;
  }

  // 3. Check if project_members already contains this user
  const { data: existingMembership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", targetUserId)
    .maybeSingle();

  let memberId = existingMembership?.id;

  if (!memberId) {
    const { data: newMember, error: memberError } = await supabase
      .from("project_members")
      .insert({
        project_id: project.id,
        user_id: targetUserId,
        status: status,
      })
      .select("id")
      .single();

    if (memberError) {
      throw new Error(memberError.message);
    }
    memberId = newMember.id;
  } else {
    // Update status if provided
    await supabase
      .from("project_members")
      .update({ status: status })
      .eq("id", memberId);
  }

  // 4. Assign member roles
  for (const roleName of rolesToAssign) {
    const roleId = roleMap.get(roleName.toLowerCase());
    if (roleId && memberId) {
      const firstInsert = await supabase.from("member_roles").insert({
        member_id: memberId,
        role_id: roleId,
      });
      if (firstInsert.error) {
        await supabase.from("member_roles").insert({
          project_member_id: memberId,
          role_id: roleId,
        });
      }
    }
  }

  // 5. Record in activity log
  await supabase.from("activity_log").insert({
    project_id: project.id,
    user_id: user.id,
    action: `Added ${stageName ? `${stageName} (${fullName})` : fullName} as ${primaryRole} to Project 001`,
    entity_type: "project_member",
    entity_id: memberId,
  });

  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath("/beats");
}

"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "../../lib/workspace";
import { createAdminClient } from "../../lib/supabase/admin";

const MANAGER_ROLES = [
  "Project Lead",
  "Admin",
];

function value(
  formData: FormData,
  name: string
) {
  return String(
    formData.get(name) || ""
  ).trim();
}

export async function addContributor(
  formData: FormData
): Promise<void> {
  /*
   * IMPORTANT:
   * We use the normal logged-in client first
   * only to confirm the person performing this
   * action is actually a KREYOH Admin/Project Lead.
   */
  const {
    supabase,
    user,
    project,
    roles,
  } = await getWorkspace();

  if (!project) {
    throw new Error(
      "No active Project 001 workspace."
    );
  }

  const canManage =
    roles.some((role) =>
      MANAGER_ROLES.includes(role)
    );

  if (!canManage) {
    throw new Error(
      "Only an Admin or Project Lead can onboard contributors."
    );
  }

  const fullName = value(
    formData,
    "full_name"
  );

  const stageName =
    value(
      formData,
      "stage_name"
    ) || null;

  const email = value(
    formData,
    "email"
  ).toLowerCase();

  const phone =
    value(
      formData,
      "phone"
    ) || null;

  const primaryRole =
    value(
      formData,
      "primary_role"
    ) || "Artist";

  const additionalRolesRaw =
    value(
      formData,
      "additional_roles"
    );

  const notes =
    value(
      formData,
      "notes"
    ) || null;

  if (!fullName) {
    throw new Error(
      "Full name is required."
    );
  }

  if (!email) {
    throw new Error(
      "Email address is required."
    );
  }

  /*
   * Build role list.
   */
  const rolesToAssign = [
    primaryRole,
  ];

  if (additionalRolesRaw) {
    const extras =
      additionalRolesRaw
        .split(",")
        .map((role) =>
          role.trim()
        )
        .filter(Boolean);

    for (const role of extras) {
      if (
        !rolesToAssign.includes(
          role
        )
      ) {
        rolesToAssign.push(
          role
        );
      }
    }
  }

  /*
   * Admin client stays SERVER ONLY.
   */
  const admin =
    createAdminClient();

  /*
   * Load valid KREYOH roles.
   */
  const {
    data: dbRoles,
    error: rolesError,
  } = await admin
    .from("roles")
    .select("id, name");

  if (rolesError) {
    throw new Error(
      rolesError.message
    );
  }

  const roleMap =
    new Map<string, string>();

  for (
    const role of dbRoles || []
  ) {
    roleMap.set(
      role.name.toLowerCase(),
      role.id
    );
  }

  /*
   * Reject invalid roles before touching
   * accounts.
   */
  for (
    const roleName
    of rolesToAssign
  ) {
    if (
      !roleMap.has(
        roleName.toLowerCase()
      )
    ) {
      throw new Error(
        `Unknown KREYOH role: ${roleName}`
      );
    }
  }

  /*
   * Look through Auth users.
   *
   * 1000 is comfortably above Project 001's
   * current contributor count.
   */
  const {
    data: usersResult,
    error: listUsersError,
  } =
    await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (listUsersError) {
    throw new Error(
      listUsersError.message
    );
  }

  let authUser =
    usersResult.users.find(
      (candidate) =>
        candidate.email
          ?.toLowerCase() ===
        email
    );

  let wasInvited = false;

  /*
   * If account does not exist:
   * automatically send invitation.
   */
  if (!authUser) {
    const siteUrl =
      process.env
        .NEXT_PUBLIC_SITE_URL ||
      "https://kreyoh.facktsafrica.co.ke";

    const {
      data: inviteResult,
      error: inviteError,
    } =
      await admin.auth.admin
        .inviteUserByEmail(
          email,
          {
            redirectTo:
              `${siteUrl}/set-password`,

            data: {
              full_name:
                fullName,
              stage_name:
                stageName,
            },
          }
        );

    if (inviteError) {
      throw new Error(
        `Could not invite ${email}: ${inviteError.message}`
      );
    }

    authUser =
      inviteResult.user;

    wasInvited = true;
  }

  if (!authUser) {
    throw new Error(
      `Could not create or find account for ${email}.`
    );
  }

  const targetUserId =
    authUser.id;

  /*
   * Create/update their KREYOH profile.
   *
   * This removes the need for you to manually
   * create profiles in Supabase.
   */
  const {
    error: profileError,
  } = await admin
    .from("profiles")
    .upsert(
      {
        id: targetUserId,
        full_name:
          fullName,
        stage_name:
          stageName,
        email,
        phone,
      },
      {
        onConflict: "id",
      }
    );

  if (profileError) {
    throw new Error(
      `Profile error: ${profileError.message}`
    );
  }

  /*
   * Look for an existing Project 001
   * membership.
   */
  const {
    data: existingMembership,
    error:
      membershipLookupError,
  } = await admin
    .from("project_members")
    .select("id, status")
    .eq(
      "project_id",
      project.id
    )
    .eq(
      "user_id",
      targetUserId
    )
    .maybeSingle();

  if (
    membershipLookupError
  ) {
    throw new Error(
      membershipLookupError.message
    );
  }

  /*
   * New invite = invited.
   * Existing Auth user = active.
   *
   * An invited account will still be allowed
   * into the workspace once they authenticate.
   */
  const memberStatus =
    wasInvited
      ? "invited"
      : "active";

  let memberId =
    existingMembership?.id;

  if (!memberId) {
    const {
      data: createdMember,
      error: memberError,
    } = await admin
      .from(
        "project_members"
      )
      .insert({
        project_id:
          project.id,
        user_id:
          targetUserId,
        status:
          memberStatus,
      })
      .select("id")
      .single();

    if (memberError) {
      throw new Error(
        `Membership error: ${memberError.message}`
      );
    }

    memberId =
      createdMember.id;
  } else {
    /*
     * Don't downgrade an already active
     * person back to invited.
     */
    const statusToSave =
  existingMembership?.status === "active"
    ? "active"
    : memberStatus;

    const {
      error: updateError,
    } = await admin
      .from(
        "project_members"
      )
      .update({
        status:
          statusToSave,
      })
      .eq(
        "id",
        memberId
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }
  }

  /*
   * Clear old roles.
   *
   * This makes what the Admin chooses
   * in the form the authoritative role
   * configuration.
   */
  const deleteByMember =
    await admin
      .from("member_roles")
      .delete()
      .eq(
        "member_id",
        memberId
      );

  /*
   * Earlier KREYOH builds used a possible
   * project_member_id column, so retain the
   * compatibility fallback.
   */
  if (
    deleteByMember.error
  ) {
    await admin
      .from("member_roles")
      .delete()
      .eq(
        "project_member_id",
        memberId
      );
  }

  /*
   * Assign all selected roles.
   */
  for (
    const roleName
    of rolesToAssign
  ) {
    const roleId =
      roleMap.get(
        roleName.toLowerCase()
      );

    if (!roleId) {
      continue;
    }

    const firstInsert =
      await admin
        .from(
          "member_roles"
        )
        .insert({
          member_id:
            memberId,
          role_id:
            roleId,
        });

    /*
     * Compatibility fallback.
     */
    if (
      firstInsert.error
    ) {
      const secondInsert =
        await admin
          .from(
            "member_roles"
          )
          .insert({
            project_member_id:
              memberId,
            role_id:
              roleId,
          });

      if (
        secondInsert.error
      ) {
        throw new Error(
          `Role assignment error: ${secondInsert.error.message}`
        );
      }
    }
  }

  /*
   * Record what happened.
   */
  const actionText =
    wasInvited
      ? `Invited ${stageName || fullName} (${email}) to Project 001 as ${rolesToAssign.join(", ")}`
      : `Assigned ${stageName || fullName} (${email}) to Project 001 as ${rolesToAssign.join(", ")}`;

  await admin
    .from("activity_log")
    .insert({
      project_id:
        project.id,
      user_id:
        user.id,
      action:
        actionText,
      entity_type:
        wasInvited
          ? "contributor_invite"
          : "project_member",
      entity_id:
        memberId,
    });

  /*
   * Notes are currently not stored in a
   * dedicated onboarding table, so preserve
   * them in the audit/activity trail.
   */
  if (notes) {
    await admin
      .from("activity_log")
      .insert({
        project_id:
          project.id,
        user_id:
          user.id,
        action:
          `Onboarding note for ${stageName || fullName}: ${notes}`,
        entity_type:
          "contributor_note",
        entity_id:
          memberId,
      });
  }

  revalidatePath(
    "/people"
  );

  revalidatePath(
    "/workspace"
  );

  revalidatePath(
    "/beats"
  );

  /*
   * supabase is deliberately referenced here
   * only to make explicit that authorization
   * was performed against the current session.
   */
  void supabase;
}
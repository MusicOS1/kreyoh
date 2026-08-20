"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";

function value(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

export async function signup(formData: FormData) {
  const fullName = value(formData, "full_name");
  const stageName = value(formData, "stage_name") || null;

  /*
   * Public users may choose their creative role.
   * They cannot choose Admin / Project Lead / Finance.
   */
  const requestedRole =
    value(formData, "creative_role") || "Artist";

  const allowedPublicRoles = [
    "Artist",
    "Producer",
    "Engineer",
    "A&R",
  ];

  const creativeRole = allowedPublicRoles.includes(requestedRole)
    ? requestedRole
    : "Artist";

  const email = value(formData, "email").toLowerCase();

  const password = String(formData.get("password") || "");

  const confirmPassword = String(
    formData.get("confirm_password") || ""
  );

  if (!fullName || !email || !password) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Full name, email and password are required."
      )}`
    );
  }

  if (password.length < 8) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Password must contain at least 8 characters."
      )}`
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Passwords do not match."
      )}`
    );
  }

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,

    options: {
      emailRedirectTo: `${siteUrl}/login`,

      data: {
        full_name: fullName,
        stage_name: stageName,
        creative_role: creativeRole,
      },
    },
  });

  if (error) {
    redirect(
      `/signup?error=${encodeURIComponent(error.message)}`
    );
  }

  /*
   * We only continue if Supabase genuinely
   * returned an Auth user.
   */
  if (!data.user?.id) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "KREYOH could not create this account."
      )}`
    );
  }

  const userId = data.user.id;

  /*
   * Server-only admin client.
   */
  const admin = createAdminClient();

  /*
   * ------------------------------------------------
   * 1. CREATE / UPDATE KREYOH PROFILE
   * ------------------------------------------------
   */
  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: fullName,
        stage_name: stageName,
        email,
      },
      {
        onConflict: "id",
      }
    );

  if (profileError) {
    console.error(
      "KREYOH SIGNUP PROFILE ERROR:",
      profileError.message
    );
  }

  /*
   * ------------------------------------------------
   * 2. FIND PROJECT 001
   * ------------------------------------------------
   */
  const {
  data: projects,
  error: projectError,
} = await admin
  .from("projects")
  .select("id, name, code")
  .limit(1);

const project =
  projects?.[0] ?? null;
  if (projectError) {
    console.error(
      "KREYOH PROJECT LOOKUP ERROR:",
      projectError.message
    );
  }

  if (!project) {
    throw new Error(
      "Project 001 could not be found."
    );
  }

  /*
   * ------------------------------------------------
   * 3. CREATE PROJECT MEMBERSHIP
   * ------------------------------------------------
   */
  const {
    data: existingMembership,
  } = await admin
    .from("project_members")
    .select("id, status")
    .eq("project_id", project.id)
    .eq("user_id", userId)
    .maybeSingle();

  let memberId = existingMembership?.id;

  if (!memberId) {
    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("project_members")
      .insert({
        project_id: project.id,
        user_id: userId,
        status: "active",
      })
      .select("id")
      .single();

    if (membershipError) {
      throw new Error(
        `Could not join Project 001: ${membershipError.message}`
      );
    }

    memberId = membership.id;
  } else {
    await admin
      .from("project_members")
      .update({
        status: "active",
      })
      .eq("id", memberId);
  }

  /*
   * ------------------------------------------------
   * 4. FIND THEIR CREATIVE ROLE
   * ------------------------------------------------
   */
  const {
    data: role,
    error: roleError,
  } = await admin
    .from("roles")
    .select("id, name")
    .eq("name", creativeRole)
    .maybeSingle();

  if (roleError) {
    throw new Error(roleError.message);
  }

  if (!role) {
    throw new Error(
      `KREYOH role "${creativeRole}" does not exist.`
    );
  }

  /*
   * ------------------------------------------------
   * 5. ASSIGN CREATIVE ROLE
   * ------------------------------------------------
   */

  const {
    data: existingRole,
  } = await admin
    .from("member_roles")
    .select("id")
    .eq("member_id", memberId)
    .eq("role_id", role.id)
    .maybeSingle();

  if (!existingRole) {
    const firstInsert = await admin
      .from("member_roles")
      .insert({
        member_id: memberId,
        role_id: role.id,
      });

    /*
     * Compatibility fallback in case your
     * table still uses project_member_id.
     */
    if (firstInsert.error) {
      const fallbackInsert = await admin
        .from("member_roles")
        .insert({
          project_member_id: memberId,
          role_id: role.id,
        });

      if (fallbackInsert.error) {
        throw new Error(
          `Role assignment failed: ${fallbackInsert.error.message}`
        );
      }
    }
  }

  /*
   * ------------------------------------------------
   * 6. LOG THE SIGNUP
   * ------------------------------------------------
   */
  await admin
    .from("activity_log")
    .insert({
      project_id: project.id,
      user_id: userId,
      action: `${stageName || fullName} joined Project 001 as ${creativeRole}`,
      entity_type: "project_member",
      entity_id: memberId,
    });

  /*
   * If email confirmation is disabled,
   * don't silently enter the workspace.
   */
  if (data.session) {
    await supabase.auth.signOut();
  }

  redirect(
    `/signup?success=${encodeURIComponent(
      "Your KREYOH account is ready. Confirm your email, then sign in to Project 001."
    )}`
  );
}
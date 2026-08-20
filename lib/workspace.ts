import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

function first<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export async function getWorkspace() {
  /*
   * Normal user/session client.
   */
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  /*
   * Server-only admin client.
   */
  const admin = createAdminClient();

  /*
   * ------------------------------------------------
   * PROFILE
   * ------------------------------------------------
   */
  let {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select(
      "id, full_name, stage_name, email, phone, avatar_url"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "KREYOH PROFILE LOOKUP ERROR:",
      profileError.message
    );
  }

  /*
   * Repair old accounts without profiles.
   */
  if (!profile) {
    const fullName =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "KREYOH Member";

    const stageName =
      user.user_metadata?.stage_name || null;

    const email =
      user.email?.toLowerCase() || null;

    const {
      data: repairedProfile,
      error: repairProfileError,
    } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          stage_name: stageName,
          email,
        },
        {
          onConflict: "id",
        }
      )
      .select(
        "id, full_name, stage_name, email, phone, avatar_url"
      )
      .single();

    if (repairProfileError) {
      console.error(
        "KREYOH PROFILE REPAIR ERROR:",
        repairProfileError.message
      );
    } else {
      profile = repairedProfile;
    }
  }

  /*
   * ------------------------------------------------
   * PROJECT 001
   * ------------------------------------------------
   *
   * KREYOH V1 currently operates one founding
   * project, so load the first project record.
   */
  const {
    data: projects,
    error: projectLookupError,
  } = await admin
    .from("projects")
    .select(
      "id, code, name, description, status, progress"
    )
    .limit(1);

  if (projectLookupError) {
    console.error(
      "KREYOH PROJECT LOOKUP ERROR:",
      projectLookupError.message
    );
  }

  const project =
    projects?.[0] ?? null;

  if (!project) {
    return {
      supabase,
      user,
      profile,
      membership: null,
      project: null,
      roles: [] as string[],
    };
  }

  /*
   * ------------------------------------------------
   * MEMBERSHIP
   * ------------------------------------------------
   *
   * IMPORTANT:
   * Query ONLY the base membership record here.
   *
   * Do not fetch projects/member_roles as nested
   * relations because that was causing the lookup
   * to fail even though the membership already
   * existed.
   */
  const {
    data: existingMembership,
    error: membershipLookupError,
  } = await admin
    .from("project_members")
    .select(
      "id, project_id, user_id, status, joined_at"
    )
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipLookupError) {
    console.error(
      "KREYOH MEMBERSHIP LOOKUP ERROR:",
      membershipLookupError.message
    );
  }

  let membership =
    existingMembership;

  /*
   * Only create membership when it REALLY
   * does not exist.
   */
  if (!membership && !membershipLookupError) {
    const {
      data: createdMembership,
      error: createMembershipError,
    } = await admin
      .from("project_members")
      .insert({
        project_id: project.id,
        user_id: user.id,
        status: "active",
      })
      .select(
        "id, project_id, user_id, status, joined_at"
      )
      .single();

    if (createMembershipError) {
      console.error(
        "KREYOH MEMBERSHIP CREATE ERROR:",
        createMembershipError.message
      );
    } else {
      membership =
        createdMembership;
    }
  }

  /*
   * Authenticated Project 001 members become active.
   */
  if (
    membership &&
    membership.status !== "active"
  ) {
    const {
      error: statusError,
    } = await admin
      .from("project_members")
      .update({
        status: "active",
      })
      .eq("id", membership.id);

    if (statusError) {
      console.error(
        "KREYOH MEMBERSHIP STATUS ERROR:",
        statusError.message
      );
    } else {
      membership.status = "active";
    }
  }

  /*
   * ------------------------------------------------
   * ROLES
   * ------------------------------------------------
   */
  let roles: string[] = [];

  if (membership?.id) {
    /*
     * Current schema.
     */
    const {
      data: assignedRoles,
      error: assignedRolesError,
    } = await admin
      .from("member_roles")
      .select(`
        roles (
          name
        )
      `)
      .eq(
        "member_id",
        membership.id
      );

    if (!assignedRolesError) {
      roles =
        assignedRoles
          ?.map((row: any) =>
            first(row.roles)?.name
          )
          .filter(Boolean) ?? [];
    } else {
      /*
       * Compatibility fallback for older schema.
       */
      const {
        data: fallbackRoles,
        error: fallbackError,
      } = await admin
        .from("member_roles")
        .select(`
          roles (
            name
          )
        `)
        .eq(
          "project_member_id",
          membership.id
        );

      if (fallbackError) {
        console.error(
          "KREYOH ROLE LOOKUP ERROR:",
          fallbackError.message
        );
      } else {
        roles =
          fallbackRoles
            ?.map((row: any) =>
              first(row.roles)?.name
            )
            .filter(Boolean) ?? [];
      }
    }
  }

  return {
    /*
     * Always return the normal authenticated client
     * to the rest of the app.
     */
    supabase,
    user,
    profile,
    membership,
    project,
    roles: roles as string[],
  };
}
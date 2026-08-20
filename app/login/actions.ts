"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";

const PUBLIC_CREATIVE_ROLES = [
  "Artist",
  "Producer",
  "Engineer",
  "A&R",
];

export async function login(formData: FormData) {
  const email = String(
    formData.get("email") || ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") || ""
  );

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Enter your email and password"
      )}`
    );
  }

  const supabase = await createClient();

  /*
   * 1. SIGN IN
   */
  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(
      `/login?error=${encodeURIComponent(
        error?.message || "Unable to sign in."
      )}`
    );
  }

  const user = data.user;

  /*
   * Server-only Admin client.
   *
   * Used only after the user has successfully
   * authenticated.
   */
  const admin = createAdminClient();

  /*
   * ------------------------------------------------
   * 2. MAKE SURE PROFILE EXISTS
   * ------------------------------------------------
   *
   * This also repairs accounts that were created
   * before automatic KREYOH profiles existed.
   */

  const fullName =
    user.user_metadata?.full_name ||
    email.split("@")[0];

  const stageName =
    user.user_metadata?.stage_name ||
    null;

  const {
    data: existingProfile,
  } = await admin
    .from("profiles")
    .select(
      "id, full_name, stage_name, email"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const {
      error: profileError,
    } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        full_name: fullName,
        stage_name: stageName,
        email,
      });

    if (profileError) {
      console.error(
        "KREYOH LOGIN PROFILE REPAIR ERROR:",
        profileError.message
      );
    }
  }

  /*
   * ------------------------------------------------
   * 3. FIND PROJECT 001
   * ------------------------------------------------
   */

  const {
    data: project,
    error: projectError,
  } = await admin
    .from("projects")
    .select(
      "id, code, name, status"
    )
    .eq("name", "Project 001")
    .maybeSingle();

  if (projectError) {
    console.error(
      "KREYOH PROJECT LOOKUP ERROR:",
      projectError.message
    );
  }

  if (!project) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Project 001 could not be found."
      )}`
    );
  }

  /*
   * ------------------------------------------------
   * 4. CHECK PROJECT MEMBERSHIP
   * ------------------------------------------------
   */

  const {
    data: existingMembership,
    error: membershipLookupError,
  } = await admin
    .from("project_members")
    .select(
      "id, status"
    )
    .eq(
      "project_id",
      project.id
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (membershipLookupError) {
    console.error(
      "KREYOH MEMBERSHIP LOOKUP ERROR:",
      membershipLookupError.message
    );
  }

  let memberId =
    existingMembership?.id;

  /*
   * ------------------------------------------------
   * 5. AUTO-REPAIR OLD ACCOUNTS
   * ------------------------------------------------
   *
   * Project 001 is currently the founding KREYOH
   * project, so an authenticated KREYOH creative
   * account gets Project 001 membership.
   *
   * This DOES NOT grant Admin or Project Lead.
   */

  if (!memberId) {
    const {
      data: newMembership,
      error: membershipError,
    } = await admin
      .from("project_members")
      .insert({
        project_id: project.id,
        user_id: user.id,
        status: "active",
      })
      .select("id")
      .single();

    if (membershipError) {
      console.error(
        "KREYOH MEMBERSHIP REPAIR ERROR:",
        membershipError.message
      );

      redirect(
        `/login?error=${encodeURIComponent(
          "Your account signed in, but KREYOH could not connect it to Project 001."
        )}`
      );
    }

    memberId =
      newMembership.id;
  } else if (
    existingMembership?.status !==
    "active"
  ) {
    /*
     * Once they have successfully authenticated,
     * an invited founding-project account can
     * become active.
     */
    await admin
      .from("project_members")
      .update({
        status: "active",
      })
      .eq(
        "id",
        memberId
      );
  }

  /*
   * ------------------------------------------------
   * 6. CHECK WHETHER THEY ALREADY HAVE A ROLE
   * ------------------------------------------------
   *
   * Existing Admin / Project Lead / Finance etc.
   * roles MUST NOT be overwritten.
   */

  let hasExistingRole = false;

  const {
    data: rolesByMember,
    error: memberRoleLookupError,
  } = await admin
    .from("member_roles")
    .select(
      "id, role_id"
    )
    .eq(
      "member_id",
      memberId
    )
    .limit(1);

  if (
    !memberRoleLookupError &&
    rolesByMember &&
    rolesByMember.length > 0
  ) {
    hasExistingRole = true;
  }

  /*
   * Compatibility with earlier schema naming.
   */
  if (
    memberRoleLookupError
  ) {
    const {
      data: rolesByProjectMember,
    } = await admin
      .from("member_roles")
      .select(
        "id, role_id"
      )
      .eq(
        "project_member_id",
        memberId
      )
      .limit(1);

    if (
      rolesByProjectMember &&
      rolesByProjectMember.length > 0
    ) {
      hasExistingRole = true;
    }
  }

  /*
   * ------------------------------------------------
   * 7. ASSIGN SAFE DEFAULT ROLE IF NEEDED
   * ------------------------------------------------
   *
   * We NEVER automatically grant:
   * Admin
   * Project Lead
   * Finance
   *
   * Those remain management assignments.
   */

  if (!hasExistingRole) {
    const requestedRole =
      user.user_metadata
        ?.creative_role;

    const creativeRole =
      PUBLIC_CREATIVE_ROLES.includes(
        requestedRole
      )
        ? requestedRole
        : "Artist";

    const {
      data: role,
      error: roleError,
    } = await admin
      .from("roles")
      .select("id, name")
      .eq(
        "name",
        creativeRole
      )
      .maybeSingle();

    if (roleError) {
      console.error(
        "KREYOH ROLE LOOKUP ERROR:",
        roleError.message
      );
    }

    if (role) {
      const firstInsert =
        await admin
          .from(
            "member_roles"
          )
          .insert({
            member_id:
              memberId,
            role_id:
              role.id,
          });

      if (
        firstInsert.error
      ) {
        const fallbackInsert =
          await admin
            .from(
              "member_roles"
            )
            .insert({
              project_member_id:
                memberId,
              role_id:
                role.id,
            });

        if (
          fallbackInsert.error
        ) {
          console.error(
            "KREYOH DEFAULT ROLE ERROR:",
            fallbackInsert
              .error
              .message
          );
        }
      }
    }
  }

  /*
   * ------------------------------------------------
   * 8. ENTER KREYOH
   * ------------------------------------------------
   */

  revalidatePath(
    "/workspace",
    "layout"
  );

  revalidatePath(
    "/people"
  );

  redirect(
    "/workspace"
  );
}
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getWorkspace() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, stage_name, email, phone, avatar_url"
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("project_members")
    .select(`
      id,
      project_id,
      status,
      joined_at,
      projects (
        id,
        code,
        name,
        description,
        status,
        progress
      ),
      member_roles (
        roles (
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const project = first(
    membership?.projects as any
  );

  const roles =
    membership?.member_roles
      ?.map((row: any) => first(row.roles)?.name)
      .filter(Boolean) ?? [];

  return {
    supabase,
    user,
    profile,
    membership,
    project,
    roles: roles as string[],
  };
}
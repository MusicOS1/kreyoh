import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

const first = <T,>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;

async function loadWorkspace() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const admin = createAdminClient();
  const [profileResult, membershipResult] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin.from("project_members")
      .select("id, project_id, user_id, status, joined_at, projects(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
  ]);

  let profile = profileResult.data;
  if (!profile) {
    const { data } = await admin.from("profiles").upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "FACKTS Music member",
      email: user.email?.toLowerCase() || null,
      creator_types: user.user_metadata?.creator_types || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" }).select("*").single();
    profile = data;
  }

  const membershipRows = membershipResult.data ?? [];

  const activeMemberships = (membershipRows || []).filter((row: any) => first(row.projects));
  const activeProjects = activeMemberships.map((row: any) => first(row.projects));
  const cookieStore = await cookies();
  const requestedProjectId = cookieStore.get("fackts_project_id")?.value;
  const selected = activeMemberships.find((row: any) => row.project_id === requestedProjectId) || activeMemberships[0] || null;
  const membership = selected ? { id: selected.id, project_id: selected.project_id, user_id: selected.user_id, status: selected.status, joined_at: selected.joined_at } : null;
  const project = selected ? first(selected.projects) : null;

  let roles: string[] = [];
  let legacyInvitation = null;

  if (membership) {
    const { data: roleRows } = await admin
      .from("member_roles")
      .select("roles(name)")
      .eq("project_member_id", membership.id);

    roles = (roleRows ?? []).map((row: any) => first(row.roles)?.name).filter(Boolean);
  } else {
    const { data } = await admin.from("project_members")
      .select("id, project_id, user_id, status, joined_at, projects(id,code,name)")
      .eq("user_id", user.id)
      .in("status", ["pending", "invited"])
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    legacyInvitation = data;
  }

  return { supabase, admin, user, profile, membership, invitation: legacyInvitation, project, activeProjects, roles };
}

export const getWorkspace = cache(loadWorkspace);

export function hasAnyRole(roles: string[], allowed: string[]) {
  const normalized = roles.map(role => role === "Admin" ? "Super Admin" : role);
  return allowed.some(role => normalized.includes(role));
}

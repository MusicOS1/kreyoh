import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

const roleName = (row: any) => {
  const role = Array.isArray(row?.roles) ? row.roles[0] : row?.roles;
  return role?.name || "";
};

async function activeRoleNames(userId: string) {
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("project_members")
    .select("member_roles(roles(name))")
    .eq("user_id", userId)
    .eq("status", "active");

  return (memberships || []).flatMap((membership: any) =>
    (membership.member_roles || [])
      .map((item: any) => roleName(item))
      .filter(Boolean),
  );
}

export async function isSuperAdmin(userId: string) {
  const roles = await activeRoleNames(userId);
  return roles.includes("Super Admin");
}

export async function isControlRoomUser(userId: string) {
  const admin = createAdminClient();
  const [{ data: grant }, roles] = await Promise.all([
    admin
      .from("control_room_admins")
      .select("user_id")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
    activeRoleNames(userId),
  ]);

  return Boolean(grant) || roles.includes("Super Admin") || roles.includes("Admin");
}

export async function getControlRoomAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, authorised: false };
  return { user, authorised: await isControlRoomUser(user.id) };
}

export async function requireControlRoomAdmin() {
  const access = await getControlRoomAccess();
  if (!access.user) redirect("/admin/login");
  if (!access.authorised) redirect("/admin/access-unavailable");
  return access.user;
}

export type ControlRoomPermission =
  | "all"
  | "people"
  | "projects"
  | "music"
  | "tasks"
  | "sessions"
  | "documents"
  | "commercial"
  | "finance"
  | "enquiries"
  | "intelligence"
  | "reports"
  | "system"
  | "admins";

const ADMIN_DEFAULTS: ControlRoomPermission[] = [
  "people",
  "projects",
  "music",
  "tasks",
  "sessions",
  "documents",
  "commercial",
  "enquiries",
  "intelligence",
  "reports",
];

export async function getControlRoomPermissions(
  userId: string,
): Promise<ControlRoomPermission[]> {
  const admin = createAdminClient();
  const [{ data: grant }, roles] = await Promise.all([
    admin
      .from("control_room_admins")
      .select("permissions,active")
      .eq("user_id", userId)
      .maybeSingle(),
    activeRoleNames(userId),
  ]);

  if (roles.includes("Super Admin")) return ["all"];

  if (grant?.active) {
    const permissions = Array.isArray(grant.permissions)
      ? grant.permissions.filter(Boolean)
      : [];
    return (permissions.length ? permissions : ADMIN_DEFAULTS) as ControlRoomPermission[];
  }

  if (roles.includes("Admin")) return ADMIN_DEFAULTS;
  return [];
}

export async function hasControlRoomPermission(
  userId: string,
  permission: ControlRoomPermission,
) {
  const permissions = await getControlRoomPermissions(userId);
  return permissions.includes("all") || permissions.includes(permission);
}

export async function requireControlRoomPermission(
  permission: ControlRoomPermission,
) {
  const user = await requireControlRoomAdmin();
  const permissions = await getControlRoomPermissions(user.id);
  if (!permissions.includes("all") && !permissions.includes(permission)) {
    throw new Error("Your Control Room access does not include this permission.");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireControlRoomAdmin();
  if (!(await isSuperAdmin(user.id))) {
    throw new Error("Only the Super Admin can change administrator permissions.");
  }
  return user;
}

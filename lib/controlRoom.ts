import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

// Platform authority comes exclusively from explicit, active platform grants.
// A music-project role must never appoint a Control Room administrator.
export async function isSuperAdmin(userId: string) {
  const {data:grant,error}=await createAdminClient().from("control_room_admins")
    .select("active,permissions").eq("user_id",userId).maybeSingle();
  return !error && grant?.active === true &&
    Array.isArray(grant.permissions) && grant.permissions.includes("all");
}

export async function isControlRoomUser(userId: string) {
  const {data:grant,error}=await createAdminClient().from("control_room_admins")
    .select("user_id,permissions").eq("user_id",userId).eq("active",true).maybeSingle();
  return !error && grant !== null && Array.isArray(grant.permissions) && grant.permissions.length>0;
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

export async function getControlRoomPermissions(
  userId: string,
): Promise<ControlRoomPermission[]> {
  const {data:grant,error}=await createAdminClient().from("control_room_admins")
    .select("permissions,active").eq("user_id",userId).maybeSingle();
  if(error || !grant?.active || !Array.isArray(grant.permissions))return [];
  return grant.permissions.filter((value:unknown)=>typeof value==="string") as ControlRoomPermission[];
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

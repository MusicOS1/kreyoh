import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

const roleName = (row: any) => {
  const role = Array.isArray(row?.roles) ? row.roles[0] : row?.roles;
  return role?.name || "";
};

export async function isControlRoomUser(userId: string) {
  const admin = createAdminClient();
  const [{ data: grant }, { data: memberships }] = await Promise.all([
    admin.from("control_room_admins").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle(),
    admin.from("project_members").select("member_roles(roles(name))").eq("user_id", userId).eq("status", "active"),
  ]);
  if (grant) return true;
  return (memberships || []).some((membership: any) =>
    (membership.member_roles || []).some((item: any) => {
      const name = roleName(item);
      return name === "Super Admin" || name === "Admin";
    })
  );
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

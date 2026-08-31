import ShellLayout from "./ShellLayout";
import { getWorkspace } from "../lib/workspace";
import { isControlRoomUser } from "../lib/controlRoom";
import AppExperienceEnhancer from "./AppExperienceEnhancer";

const ROLE_PRIORITY = [
  "Super Admin",
  "Admin",
  "Project Lead",
  "Finance",
  "A&R",
  "Producer",
  "Engineer",
  "Artist",
];

function orderRoles(roles: string[]) {
  return [...roles].sort((a, b) => {
    const aIndex = ROLE_PRIORITY.indexOf(a);
    const bIndex = ROLE_PRIORITY.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, user, roles, project, membership, activeProjects, admin } = await getWorkspace();
  const orderedRoles = orderRoles(roles);
  const canAccessControlRoom = await isControlRoomUser(user.id);
  const { count: unreadNotifications = 0 } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  const userName = profile?.stage_name || profile?.full_name || user.email?.split("@")[0] || "FACKTS Music User";
  const primaryRole = orderedRoles[0] || "Creator";

  return (
    <>
      <AppExperienceEnhancer />
      <ShellLayout
        userName={userName}
        primaryRole={primaryRole}
        projectCode={project?.code || ""}
        projectName={project?.name || "Your FACKTS Music home"}
        hasProject={Boolean(membership && project)}
        activeProjects={activeProjects || []}
        selectedProjectId={project?.id || null}
        projectStatus={project?.status || "Production"}
        roles={orderedRoles}
        userEmail={profile?.email || user.email}
        stageName={profile?.stage_name}
        avatarUrl={profile?.avatar_url}
        canAccessControlRoom={canAccessControlRoom}
        unreadNotifications={unreadNotifications || 0}
      >
        {children}
      </ShellLayout>
    </>
  );
}

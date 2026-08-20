import ShellLayout from "./ShellLayout";
import { getWorkspace } from "../lib/workspace";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, user, roles, project } = await getWorkspace();

  const userName =
    profile?.stage_name ||
    profile?.full_name ||
    user.email?.split("@")[0] ||
    "KREYOH User";

  const primaryRole = roles[0] || "Project Member";
  const projectCode = project?.code || "P001";
  const projectName = project?.name || "Project 001";

  return (
    <ShellLayout
      userName={userName}
      primaryRole={primaryRole}
      projectCode={projectCode}
      projectName={projectName}
      projectStatus={project?.status || "Production"}
      roles={roles}
      userEmail={profile?.email || user.email}
      stageName={profile?.stage_name}
      avatarUrl={profile?.avatar_url}
    >
      {children}
    </ShellLayout>
  );
}

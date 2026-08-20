import ShellLayout from "./ShellLayout";
import { getWorkspace } from "../lib/workspace";

const ROLE_PRIORITY = [
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

    const aPriority =
      aIndex === -1 ? 999 : aIndex;

    const bPriority =
      bIndex === -1 ? 999 : bIndex;

    return aPriority - bPriority;
  });
}

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    profile,
    user,
    roles,
    project,
  } = await getWorkspace();

  const orderedRoles =
    orderRoles(roles);

  const userName =
    profile?.stage_name ||
    profile?.full_name ||
    user.email?.split("@")[0] ||
    "KREYOH User";

  const primaryRole =
    orderedRoles[0] ||
    "Project Member";

  const projectCode =
    project?.code || "P001";

  const projectName =
    project?.name || "Project 001";

  return (
    <ShellLayout
      userName={userName}
      primaryRole={primaryRole}
      projectCode={projectCode}
      projectName={projectName}
      projectStatus={
        project?.status ||
        "Production"
      }
      roles={orderedRoles}
      userEmail={
        profile?.email ||
        user.email
      }
      stageName={
        profile?.stage_name
      }
      avatarUrl={
        profile?.avatar_url
      }
    >
      {children}
    </ShellLayout>
  );
}
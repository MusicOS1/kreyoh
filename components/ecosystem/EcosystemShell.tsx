import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { getWorkspace } from '../../lib/workspace';
import { getExperienceIdentity } from '../../lib/experienceIdentity';
import {
  preferredWorkspace,
  type WorkspaceKind,
} from '../../lib/workspaceExperience';
import EcosystemFrame from './EcosystemFrame';
import {canEditProjectFinance} from '../../lib/financeAccess';
export default async function EcosystemShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: WorkspaceKind;
}) {
  const [workspace, identity, cookieStore] = await Promise.all([
    getWorkspace(),
    getExperienceIdentity(),
    cookies(),
  ]);
  const saved = cookieStore.get('fm_workspace')?.value;
  const choice = saved?.startsWith(`${identity.id}:`)
    ? saved.slice(identity.id.length + 1)
    : null;
  const path = (await headers()).get('x-fackts-path') || '/home';
  const requested = new URL(path, 'https://fackts.invalid').searchParams.get(
    'workspace',
  );
  const allowedRequest = identity.workspaces.find(
    (item) => item.kind === requested && item.kind !== 'admin',
  );
  const preferred = preferredWorkspace(identity.workspaces, choice);
  // Project tools must keep a creator workspace shell even when the user
  // last visited the listener view; otherwise its project selector disappears.
  const projectToolPath = /^\/(projects|releases|tracks|track-records|beats|studio-sessions|finance|payments|production|member-dashboard|workspace)(\/|$)/.test(path.split('?')[0]);
  const fallback = projectToolPath && preferred.kind === 'listener'
    ? preferredWorkspace(identity.workspaces, null)
    : preferred;
  const selected =
    active ||
    allowedRequest?.kind ||
    fallback.kind;
  return (
    <EcosystemFrame
      identity={identity}
      active={selected}
      projects={
        workspace.activeProjects.filter(Boolean) as {
          id: string;
          name?: string;
          code?: string;
        }[]
      }
      projectId={(workspace.project as any)?.id}
      canManageFinance={canEditProjectFinance(workspace.roles)}
      canCreateTrack={workspace.roles.some(role => ['Super Admin','Admin','Project Lead','A&R','Artist'].includes(role))}
    >
      {children}
    </EcosystemFrame>
  );
}

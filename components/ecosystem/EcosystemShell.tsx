import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { getWorkspace } from '../../lib/workspace';
import { getExperienceIdentity } from '../../lib/experienceIdentity';
import {
  preferredWorkspace,
  type WorkspaceKind,
} from '../../lib/workspaceExperience';
import EcosystemFrame from './EcosystemFrame';
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
  const selected =
    active ||
    allowedRequest?.kind ||
    preferredWorkspace(identity.workspaces, choice).kind;
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
    >
      {children}
    </EcosystemFrame>
  );
}

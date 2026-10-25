'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getWorkspace } from '../../lib/workspace';
import { permittedProjectIds } from '../../lib/workspaceExperience';
import { getExperienceIdentity } from '../../lib/experienceIdentity';
export async function switchWorkspace(formData: FormData) {
  const identity = await getExperienceIdentity();
  const selected = identity.workspaces.find(
    (item) => item.kind === String(formData.get('workspace') || ''),
  );
  if (!selected)
    throw new Error('This workspace is not available to your account.');
  const workspace = await getWorkspace();
  const projectIds = permittedProjectIds(selected.kind, workspace.memberships);
  const cookieStore = await cookies();
  if (projectIds.length && !projectIds.includes((workspace.project as any)?.id))
    cookieStore.set('fackts_project_id', projectIds[0], {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 31536000,
    });
  cookieStore.set('fm_workspace', `${identity.id}:${selected.kind}`, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 31536000,
  });
  redirect(selected.href);
}

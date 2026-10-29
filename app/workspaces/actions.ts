'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getExperienceIdentity } from '../../lib/experienceIdentity';
export async function switchWorkspace(formData: FormData) {
  const identity = await getExperienceIdentity();
  const selected = identity.workspaces.find(
    (item) => item.kind === String(formData.get('workspace') || ''),
  );
  if (!selected)
    throw new Error('This workspace is not available to your account.');
  // Changing presentation never changes the explicitly selected project.
  const cookieStore = await cookies();
  cookieStore.set('fm_workspace', `${identity.id}:${selected.kind}`, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 31536000,
  });
  redirect(selected.href);
}

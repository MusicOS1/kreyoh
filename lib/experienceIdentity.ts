import { cache } from 'react';
import { getWorkspace } from './workspace';
import { isControlRoomUser } from './controlRoom';
import { workspaceOptions, type HeaderIdentity } from './workspaceExperience';
export const getExperienceIdentity = cache(async () => {
  const workspace = await getWorkspace();
  const adminAccess = await isControlRoomUser(workspace.user.id);
  const assigned = [
    ...new Set([
      ...workspace.roles,
      ...workspace.memberships.flatMap((item) => item.roles),
    ]),
  ];
  const options = workspaceOptions(
    workspace.profile?.creator_types,
    assigned,
    adminAccess,
  );
  const { count, error } = await workspace.admin
    .from('notifications')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', workspace.user.id)
    .is('read_at', null);
  const identity: HeaderIdentity = {
    id: workspace.user.id,
    name:
      workspace.profile?.stage_name ||
      workspace.profile?.nickname ||
      workspace.profile?.full_name ||
      'Member',
    avatar: workspace.profile?.avatar_url || null,
    creator: options.some((item) => !['listener', 'admin'].includes(item.kind)),
    workspaces: options,
    unread: error ? 0 : count || 0,
  };
  return identity;
});

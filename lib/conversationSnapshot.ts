import 'server-only';
import { getWorkspace } from './workspace';
import { uuidPattern } from './community';

export async function conversationSnapshot(other: string, before?: string) {
  if (!uuidPattern.test(other)) return null;
  const { admin, user, profile: viewerProfile, activeProjects } = await getWorkspace();
  if (other === user.id) return null;
  const [{ data: profile }, { data: prior }, { data: release }, { data: blocks }] = await Promise.all([
    admin.from('profiles').select('id,full_name,stage_name,nickname,avatar_url,profile_visibility,account_status').eq('id', other).maybeSingle(),
    admin.from('member_messages').select('id').or(`and(sender_id.eq.${user.id},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${user.id})`).limit(1),
    admin.from('music_releases').select('id').eq('artist_id', other).eq('status', 'published').lte('release_at', new Date().toISOString()).limit(1),
    admin.from('member_blocks').select('blocker_id,blocked_id').or(`and(blocker_id.eq.${user.id},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${user.id})`),
  ]);
  const ids = activeProjects.map((project: any) => project.id);
  const { data: shared } = ids.length ? await admin.from('project_members').select('id').eq('user_id', other).eq('status', 'active').in('project_id', ids).limit(1) : { data: [] };
  if (!profile || (!prior?.length && !shared?.length && !release?.length && profile.profile_visibility !== 'public')) return null;
  let query = admin.from('member_messages').select('id,body,sender_id,created_at,read_at')
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${user.id})`)
    .order('created_at', { ascending: false }).limit(100);
  if (before && Number.isFinite(Date.parse(before))) query = query.lt('created_at', new Date(before).toISOString());
  const { data: messages, error } = await query;
  if (error) throw new Error('Could not load conversation.');
  return { profile, viewerProfile, viewerId: user.id, messages: [...(messages || [])].reverse(), blocked: Boolean(blocks?.some(block => block.blocker_id === user.id)), disabled: Boolean(blocks?.length) || profile.account_status !== 'active' || !user.email_confirmed_at };
}

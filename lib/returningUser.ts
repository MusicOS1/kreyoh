import {cache} from 'react';
import {createClient} from './supabase/server';
import {createAdminClient} from './supabase/admin';
import {workspaceOptions,type HeaderIdentity} from './workspaceExperience';
const first=(value:any)=>Array.isArray(value)?value[0]:value;
export async function loadIdentityForUser(user:{id:string;email?:string}):Promise<HeaderIdentity>{
 const admin=createAdminClient();
 const [profile,memberships,grant,notifications]=await Promise.all([
  admin.from('profiles').select('creator_types,full_name,stage_name,nickname,avatar_url').eq('id',user.id).maybeSingle(),
  admin.from('project_members').select('id,member_roles(roles(name))').eq('user_id',user.id).eq('status','active'),
  admin.from('control_room_admins').select('user_id').eq('user_id',user.id).eq('active',true).maybeSingle(),
  admin.from('notifications').select('id',{head:true,count:'exact'}).eq('user_id',user.id).is('read_at',null),
 ]);
 if(profile.error||memberships.error||grant.error)throw new Error('Account navigation is temporarily unavailable.');
 const roles=(memberships.data||[]).flatMap((row:any)=>(row.member_roles||[]).map((item:any)=>first(item.roles)?.name).filter(Boolean));
 const options=workspaceOptions(profile.data?.creator_types,roles,Boolean(grant.data)||roles.some((role:string)=>['Super Admin','Admin'].includes(role)));
 return {id:user.id,name:profile.data?.stage_name||profile.data?.nickname||profile.data?.full_name||'Member',avatar:profile.data?.avatar_url||null,creator:options.some(item=>!['listener','admin'].includes(item.kind)),workspaces:options,unread:notifications.error?0:notifications.count||0};
}
export const returningUser=cache(async()=>{
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return null;
 const {data:{user},error}=await (await createClient()).auth.getUser();
 if(error||!user)return null;
 try{return await loadIdentityForUser(user);}catch{return null;}
});

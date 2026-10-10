import Link from 'next/link';
import AppShell from '../../components/AppShell';
import {getWorkspace} from '../../lib/workspace';
import {creatorDisplayName} from '../../lib/profileIdentity';
export default async function Messages(){
 const{admin,user,activeProjects}=await getWorkspace();
 const[{data:messages,error},{data:publicPeople},{data:artists},{data:blocked}]=await Promise.all([
 admin.from('member_messages').select('id,sender_id,recipient_id,body,created_at,read_at').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(500),
 admin.from('profiles').select('id,stage_name,nickname,full_name').eq('profile_visibility','public').eq('account_status','active').limit(200),
 admin.from('music_releases').select('artist_id').eq('status','published').lte('release_at',new Date().toISOString()),
 admin.from('member_blocks').select('blocked_id').eq('blocker_id',user.id)
 ]);if(error)throw Error('Messages could not be loaded. Please try again.');
 const projectIds=activeProjects.map((p:any)=>p.id);
 const{data:members}=projectIds.length?await admin.from('project_members').select('user_id').in('project_id',projectIds).eq('status','active'):{data:[]};
 const ids=Array.from(new Set([...(members||[]).map(m=>m.user_id),...(artists||[]).map(a=>a.artist_id),...(messages||[]).flatMap(m=>[m.sender_id,m.recipient_id]),...(blocked||[]).map(b=>b.blocked_id)]));
 const{data:profiles}=ids.length?await admin.from('profiles').select('id,stage_name,nickname,full_name').in('id',ids).eq('account_status','active'):{data:[]};
 const names=new Map([...(publicPeople||[]),...(profiles||[])].map(p=>[p.id,creatorDisplayName(p)]));names.delete(user.id);
 const threads=new Map<string,any>();for(const m of messages||[]){const other=m.sender_id===user.id?m.recipient_id:m.sender_id;if(!threads.has(other))threads.set(other,m);}
 const blockedIds=new Set((blocked||[]).map(b=>b.blocked_id));
 return <AppShell><main className="community-page member-community"><div className="community-actions"><Link href="/inbox">Project notifications</Link><Link href="/billboard">Billboard</Link></div><h1>Messages</h1><p>Talk privately with public creators, releasing artists and people in your projects.</p><div className="community-columns"><section><h2>Recent conversations</h2>{!threads.size&&<p>No conversations yet. Choose a member to say hello.</p>}{Array.from(threads).map(([id,m])=><Link className="community-card message-preview" key={id} href={`/messages/${id}`}><strong>{names.get(id)||'Member'}{m.recipient_id===user.id&&!m.read_at?' · New':''}{blockedIds.has(id)?' · Blocked':''}</strong><p>{m.body.slice(0,100)}</p><small>{new Date(m.created_at).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}</small></Link>)}<small>Conversations from your latest 500 messages.</small></section><section><h2>Start a conversation</h2>{!names.size&&<p>Public creators and project members will appear here.</p>}<div className="community-directory">{Array.from(names).sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=><Link key={id} href={`/messages/${id}`}>{name}{blockedIds.has(id)?' · Blocked':' →'}</Link>)}</div></section></div></main></AppShell>;
}

import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import AppShell from '../../../components/AppShell';
import {getWorkspace} from '../../../lib/workspace';
import {uuidPattern} from '../../../lib/community';
import {creatorDisplayName} from '../../../lib/profileIdentity';
import {MessageComposer,ConversationRefresh,MemberBlock} from '../../../components/MemberConversation';
export default async function Conversation({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<{before?:string}>}){
 const other=(await params).userId;if(!uuidPattern.test(other))notFound();const{admin,user,activeProjects}=await getWorkspace();if(other===user.id)redirect('/messages');
 const[{data:profile},{data:prior},{data:release},{data:blocks}]=await Promise.all([
 admin.from('profiles').select('id,full_name,stage_name,nickname,profile_visibility,account_status').eq('id',other).maybeSingle(),
 admin.from('member_messages').select('id').or(`and(sender_id.eq.${user.id},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${user.id})`).limit(1),
 admin.from('music_releases').select('id').eq('artist_id',other).eq('status','published').lte('release_at',new Date().toISOString()).limit(1),
 admin.from('member_blocks').select('blocker_id,blocked_id').or(`and(blocker_id.eq.${user.id},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${user.id})`)
 ]);
 const ids=activeProjects.map((p:any)=>p.id);const{data:shared}=ids.length?await admin.from('project_members').select('id').eq('user_id',other).eq('status','active').in('project_id',ids).limit(1):{data:[]};
 if(!profile||(!prior?.length&&!shared?.length&&!release?.length&&profile.profile_visibility!=='public'))notFound();
 let query=admin.from('member_messages').select('id,body,sender_id,created_at,read_at').or(`and(sender_id.eq.${user.id},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${user.id})`).order('created_at',{ascending:false}).limit(100);
 const before=(await searchParams).before;if(before&&Number.isFinite(Date.parse(before)))query=query.lt('created_at',new Date(before).toISOString());
 const{data:messages,error}=await query;if(error)throw Error('Could not load conversation.');
 const ownBlock=Boolean(blocks?.some(b=>b.blocker_id===user.id)),disabled=Boolean(blocks?.length)||profile.account_status!=='active'||!user.email_confirmed_at;
 return <AppShell><main className="community-page member-community"><Link href="/messages">← All messages</Link><h1>{creatorDisplayName(profile)}</h1><p>Private conversation · Updates every 10 seconds while this tab is open.</p><MemberBlock other={other} blocked={ownBlock}/>{disabled&&<p>Messaging is unavailable. Check your email confirmation or block settings.</p>}
 {!before&&<ConversationRefresh other={other} latest={messages?.[0]?.id||''}/>}
 {messages?.length===100&&<Link href={`/messages/${other}?before=${encodeURIComponent(messages[99].created_at)}`}>Load older messages</Link>}{before&&<Link href={`/messages/${other}`}>Back to latest messages</Link>}
 <section className="message-thread" aria-label="Conversation">{!messages?.length&&<p>No messages yet. Start the conversation below.</p>}{[...(messages||[])].reverse().map(m=><article className={m.sender_id===user.id?'message-bubble outgoing':'message-bubble'} key={m.id}><strong>{m.sender_id===user.id?'You':creatorDisplayName(profile)}</strong><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}{m.sender_id===user.id?(m.read_at?' · Read':' · Sent'):''}</small></article>)}</section><MessageComposer other={other} disabled={disabled}/></main></AppShell>;
}

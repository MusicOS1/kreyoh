import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import AppShell from "../../../components/AppShell";
import FanShell from "../../../components/FanShell";
import ChatTimeline from "../../../components/ChatTimeline";
import {isFanProfile} from "../../../lib/fanProfile";
import {getWorkspace} from "../../../lib/workspace";
import {uuidPattern} from "../../../lib/community";
import {creatorDisplayName} from "../../../lib/profileIdentity";
import {MessageComposer,ConversationRefresh,MemberBlock} from "../../../components/MemberConversation";

export default async function Conversation({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<{before?:string}>}){
 const other=(await params).userId;
 if(!uuidPattern.test(other))notFound();
 const{admin,user,profile:viewerProfile,activeProjects}=await getWorkspace();
 if(other===user.id)redirect("/messages");
 const[{data:profile},{data:prior},{data:release},{data:blocks}]=await Promise.all([
  admin.from("profiles").select("id,full_name,stage_name,nickname,avatar_url,profile_visibility,account_status").eq("id",other).maybeSingle(),
  admin.from("member_messages").select("id").or(`and(sender_id.eq.${user.id},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${user.id})`).limit(1),
  admin.from("music_releases").select("id").eq("artist_id",other).eq("status","published").lte("release_at",new Date().toISOString()).limit(1),
  admin.from("member_blocks").select("blocker_id,blocked_id").or(`and(blocker_id.eq.${user.id},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${user.id})`)
 ]);
 const ids=activeProjects.map((p:any)=>p.id);
 const{data:shared}=ids.length?await admin.from("project_members").select("id").eq("user_id",other).eq("status","active").in("project_id",ids).limit(1):{data:[]};
 if(!profile||(!prior?.length&&!shared?.length&&!release?.length&&profile.profile_visibility!=="public"))notFound();
 let query=admin.from("member_messages").select("id,body,sender_id,created_at,read_at")
  .or(`and(sender_id.eq.${user.id},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${user.id})`)
  .order("created_at",{ascending:false}).limit(100);
 const before=(await searchParams).before;
 if(before&&Number.isFinite(Date.parse(before)))query=query.lt("created_at",new Date(before).toISOString());
 const{data:messages,error}=await query;if(error)throw Error("Could not load conversation.");
 const ownBlock=Boolean(blocks?.some(b=>b.blocker_id===user.id));
 const disabled=Boolean(blocks?.length)||profile.account_status!=="active"||!user.email_confirmed_at;
 const name=creatorDisplayName(profile);
 const data=[...(messages||[])].reverse();
 const content=<main className="community-page member-community fm-chat-page">
   <div className="fm-chat-stage">
    <div className="fm-chat-header">
     <Link href="/messages" className="fm-chat-back" aria-label="Back to conversations">←</Link>
     <span className="fm-chat-header-avatar" aria-hidden="true">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:name.charAt(0).toUpperCase()}</span>
     <div className="fm-chat-person"><h1>{name}</h1><p>Private messages on FACKTS Music</p></div>
     <details className="fm-chat-more"><summary aria-label="Conversation options">•••</summary><div className="fm-chat-more-panel"><MemberBlock other={other} blocked={ownBlock}/><Link href="/messages">All conversations</Link></div></details>
    </div>
    {disabled&&<div className="fm-chat-disabled" role="status">Messaging is unavailable. Check your email confirmation or block settings.</div>}
    {!before&&<ConversationRefresh other={other} latest={messages?.[0]?.id||""}/>}
    <div className="fm-chat-history">
     {messages?.length===100&&<Link href={`/messages/${other}?before=${encodeURIComponent(messages[99].created_at)}`}>↑ Load older messages</Link>}
     {before&&<Link href={`/messages/${other}`}>Back to latest messages ↓</Link>}
    </div>
    <ChatTimeline messages={data} viewerId={user.id} otherName={name} avatarUrl={profile.avatar_url}/>
    <MessageComposer other={other} disabled={disabled}/>
    <div className="fm-chat-footnote">Private conversation · New messages are checked every 10 seconds.</div>
   </div>
  </main>;
 const fan=isFanProfile(viewerProfile);
 return fan?<FanShell name={viewerProfile?.nickname||viewerProfile?.full_name||"Listener"} avatarUrl={viewerProfile?.avatar_url} activeTab="Messages">{content}</FanShell>:<AppShell>{content}</AppShell>;
}

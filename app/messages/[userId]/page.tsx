import {conversationSnapshot} from "../../../lib/conversationSnapshot";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import AppShell from "../../../components/AppShell";
import FanShell from "../../../components/FanShell";
import ChatTimeline from "../../../components/ChatTimeline";
import {isFanProfile} from "../../../lib/fanProfile";
import {getWorkspace} from "../../../lib/workspace";
import {uuidPattern} from "../../../lib/community";
import {creatorDisplayName} from "../../../lib/profileIdentity";
import {ConversationProvider,ConversationAvailability,MessageComposer,ConversationRefresh,MemberBlock} from "../../../components/MemberConversation";

export default async function Conversation({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<{before?:string}>}){
 const other=(await params).userId;
 if(!uuidPattern.test(other))notFound();
 const before=(await searchParams).before;
 const snapshot=await conversationSnapshot(other,before);if(!snapshot)notFound();
 const {profile,viewerProfile,viewerId,blocked:ownBlock,disabled,messages:data}=snapshot;
 const messages=[...data].reverse();
 const name=creatorDisplayName(profile);
 const content=<main className="community-page member-community fm-chat-page">
   <ConversationProvider key={other+(before||'')} other={other} initial={{messages:data,disabled,blocked:ownBlock}} before={before}><div className="fm-chat-stage">
    <div className="fm-chat-header">
     <Link href="/messages" className="fm-chat-back" aria-label="Back to conversations">←</Link>
     <span className="fm-chat-header-avatar" aria-hidden="true">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:name.charAt(0).toUpperCase()}</span>
     <div className="fm-chat-person"><h1>{name}</h1><p>Private messages on FACKTS Music</p></div>
     <details className="fm-chat-more"><summary aria-label="Conversation options">•••</summary><div className="fm-chat-more-panel"><MemberBlock other={other} blocked={ownBlock}/><Link href="/messages">All conversations</Link></div></details>
    </div>
    <ConversationAvailability/>
    {!before&&<ConversationRefresh other={other} latest={messages?.[0]?.id||""}/>}
    <div className="fm-chat-history">
     {messages?.length===100&&<Link href={`/messages/${other}?before=${encodeURIComponent(messages[99].created_at)}`}>↑ Load older messages</Link>}
     {before&&<Link href={`/messages/${other}`}>Back to latest messages ↓</Link>}
    </div>
    <ChatTimeline messages={data} viewerId={viewerId} otherName={name} avatarUrl={profile.avatar_url}/>
    <MessageComposer other={other} disabled={disabled}/>
    <div className="fm-chat-footnote">Private conversation · New messages are checked every 10 seconds.</div>
   </div></ConversationProvider>
  </main>;
 const fan=isFanProfile(viewerProfile);
 return fan?<FanShell name={viewerProfile?.nickname||viewerProfile?.full_name||"Listener"} avatarUrl={viewerProfile?.avatar_url} activeTab="Messages">{content}</FanShell>:<AppShell>{content}</AppShell>;
}

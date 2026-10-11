import Link from "next/link";
import AppShell from "../../components/AppShell";
import FanShell from "../../components/FanShell";
import {getWorkspace} from "../../lib/workspace";
import {isFanProfile} from "../../lib/fanProfile";
import {creatorDisplayName} from "../../lib/profileIdentity";

export default async function Messages({searchParams}:{searchParams:Promise<{q?:string}>}){
 const term=String((await searchParams).q||"").trim().slice(0,70).toLowerCase();
 const{admin,user,profile,activeProjects}=await getWorkspace();
 const[{data:messages,error},{data:publicPeople},{data:artists},{data:blocked}]=await Promise.all([
  admin.from("member_messages").select("id,sender_id,recipient_id,body,created_at,read_at").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at",{ascending:false}).limit(500),
  admin.from("profiles").select("id,stage_name,nickname,full_name,avatar_url").eq("profile_visibility","public").eq("account_status","active").limit(200),
  admin.from("music_releases").select("artist_id").eq("status","published").lte("release_at",new Date().toISOString()),
  admin.from("member_blocks").select("blocked_id").eq("blocker_id",user.id)
 ]);
 if(error)throw Error("Messages could not be loaded.");
 const projectIds=activeProjects.map((p:any)=>p.id);
 const{data:members}=projectIds.length?await admin.from("project_members").select("user_id").in("project_id",projectIds).eq("status","active"):{data:[]};
 const ids=Array.from(new Set([...(members||[]).map(m=>m.user_id),...(artists||[]).map(a=>a.artist_id),...(messages||[]).flatMap(m=>[m.sender_id,m.recipient_id]),...(blocked||[]).map(b=>b.blocked_id)]));
 const{data:profiles}=ids.length?await admin.from("profiles").select("id,stage_name,nickname,full_name,avatar_url").in("id",ids).eq("account_status","active"):{data:[]};
 const people=new Map([...(publicPeople||[]),...(profiles||[])].map(p=>[p.id,{name:creatorDisplayName(p),avatar:p.avatar_url as string|null}]));
 people.delete(user.id);
 const threads=new Map<string,NonNullable<typeof messages>[number]>();
 for(const message of messages||[]){const other=message.sender_id===user.id?message.recipient_id:message.sender_id;if(!threads.has(other))threads.set(other,message);}
 const blockedIds=new Set((blocked||[]).map(b=>b.blocked_id));
 const filteredPeople=Array.from(people).filter(([,person])=>person.name.toLowerCase().includes(term));
 const filteredThreads=Array.from(threads).filter(([id])=>people.get(id)?.name.toLowerCase().includes(term)||!term);
 const view=<main className="community-page member-community fm-inbox">
  <header className="fm-inbox-hero">
   <img src="/branding/fackts-creative-community.jpg" alt="" aria-hidden="true" />
   <div className="fm-inbox-hero-content"><span className="eyebrow">FACKTS MUSIC / COMMUNITY</span><h1>Real conversations.<br/>Real connections.</h1><p>Talk to the artists and people shaping your sound. Every good story starts with a hello.</p></div>
  </header>
  <div className="fm-inbox-main">
   <section className="fm-inbox-threads">
    <div className="fm-inbox-section-head"><div><span className="eyebrow">YOUR PEOPLE</span><h2>Messages</h2></div><Link href="/fan">Discover music ↗</Link></div>
    <form className="fm-inbox-search"><label htmlFor="fm-find-person" className="sr-only">Find a person</label><span aria-hidden="true">⌕</span><input id="fm-find-person" type="search" name="q" defaultValue={term} placeholder="Search conversations or artists"/><button type="submit">Find</button></form>
    {!filteredThreads.length&&<p className="fm-inbox-empty">{term?"No conversations match your search.":"Your conversations will appear here. Pick an artist below to say hello."}</p>}
    <div className="fm-inbox-thread-list">{filteredThreads.map(([id,message])=>{
      const person=people.get(id),incoming=message.recipient_id===user.id;
      return <Link className="fm-inbox-thread" key={id} href={`/messages/${id}`}>
       <span className="fm-inbox-avatar">{person?.avatar?<img src={person.avatar} alt=""/>:(person?.name||"M").slice(0,1).toUpperCase()}</span>
       <span className="fm-inbox-thread-copy"><strong>{person?.name||"Member"}</strong><span>{message.sender_id===user.id?"You: ":""}{message.body}</span></span>
       <span className="fm-inbox-thread-side"><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleDateString("en-KE",{month:"short",day:"numeric",timeZone:"Africa/Nairobi"})}</time>{incoming&&!message.read_at&&<b className="fm-inbox-unread" aria-label="Unread message"/>}{blockedIds.has(id)&&<small>Blocked</small>}</span>
      </Link>;
    })}</div>
   </section>
   <aside className="fm-inbox-discover"><span className="eyebrow">EXPLORE THE COMMUNITY</span><h2>Start a conversation</h2><p>Connect with creators and artists across FACKTS.</p>
    <div className="fm-inbox-directory">{filteredPeople.slice(0,40).map(([id,person])=><Link href={`/messages/${id}`} key={id}>
      <span className="fm-inbox-avatar">{person.avatar?<img src={person.avatar} alt=""/>:person.name.slice(0,1).toUpperCase()}</span>
      <strong>{person.name}</strong><span aria-hidden="true">↗</span>
    </Link>)}</div>
    <small>Private messages · Only available where members can contact one another.</small>
   </aside>
  </div>
 </main>;
 return isFanProfile(profile)?<FanShell name={profile?.nickname||profile?.full_name||"Listener"} avatarUrl={profile?.avatar_url} activeTab="Messages">{view}</FanShell>:<AppShell>{view}</AppShell>;
}
